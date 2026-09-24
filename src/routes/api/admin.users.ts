import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireDuty } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  defaultDutiesForRole,
  validateDutiesForRole,
  type AccessLevel,
  type AppDuty,
} from "@/lib/auth/duties";
import type { AppRole } from "@/lib/auth";

const roleSchema = z.enum(["province_user", "technical_director", "technical_assistant", "read_only"]);
const accessLevelSchema = z.enum(["edit", "view"]);
const dutySchema = z.enum([
  "edit_reports",
  "submit_reports",
  "validate_reports",
  "comment_consolidation",
  "write_national_summary",
  "manage_users",
  "manage_provinces",
]);

const inviteSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  provinceId: z.string().uuid().nullable(),
  role: roleSchema,
  jobTitle: z.string().optional().nullable(),
  accessLevel: accessLevelSchema.default("edit"),
  duties: z.array(dutySchema).optional(),
});

const patchSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(1).optional(),
  provinceId: z.string().uuid().nullable().optional(),
  role: roleSchema.optional(),
  jobTitle: z.string().optional().nullable(),
  accessLevel: accessLevelSchema.optional(),
  duties: z.array(dutySchema).optional(),
});

function resolveAccessLevel(role: AppRole, accessLevel: AccessLevel): AccessLevel {
  if (role === "read_only") return "view";
  return accessLevel;
}

function resolveDuties(role: AppRole, accessLevel: AccessLevel, duties?: AppDuty[]): AppDuty[] {
  if (accessLevel === "view") return [];
  return duties?.length ? duties : defaultDutiesForRole(role);
}

async function countManageUsers(excludeUserId?: string): Promise<number> {
  let q = supabaseAdmin.from("user_duties").select("user_id", { count: "exact", head: true }).eq("duty", "manage_users");
  if (excludeUserId) q = q.neq("user_id", excludeUserId);
  const { count } = await q;
  return count ?? 0;
}

async function upsertMemberDuties(userId: string, duties: AppDuty[]) {
  await supabaseAdmin.from("user_duties").delete().eq("user_id", userId);
  if (duties.length) {
    await supabaseAdmin.from("user_duties").insert(duties.map((duty) => ({ user_id: userId, duty })));
  }
}

async function validateSelfEdit(actorId: string, targetId: string, patch: z.infer<typeof patchSchema>): Promise<string | null> {
  if (actorId !== targetId) return null;
  if (patch.accessLevel === "view") return "Cannot set yourself to view-only";
  if (patch.duties && !patch.duties.includes("manage_users")) return "Cannot remove your own user management duty";
  return null;
}

async function validateLastManager(targetId: string, nextDuties: AppDuty[], nextAccess: AccessLevel): Promise<string | null> {
  const { data: current } = await supabaseAdmin
    .from("user_duties")
    .select("duty")
    .eq("user_id", targetId)
    .eq("duty", "manage_users")
    .maybeSingle();
  const hadManage = Boolean(current);
  const willHaveManage = nextAccess === "edit" && nextDuties.includes("manage_users");
  if (hadManage && !willHaveManage) {
    const others = await countManageUsers(targetId);
    if (others === 0) return "Cannot remove the last user manager";
  }
  return null;
}

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const uid = await requireDuty(request, "manage_users");
        if (!uid) return new Response("Forbidden", { status: 403 });
        const [{ data: profiles }, { data: roles }, { data: dutyRows }, { data: provinces }] = await Promise.all([
          supabaseAdmin.from("profiles").select("id, email, full_name, province_id, job_title, access_level"),
          supabaseAdmin.from("user_roles").select("user_id, role"),
          supabaseAdmin.from("user_duties").select("user_id, duty"),
          supabaseAdmin.from("provinces").select("id, name, code").order("name"),
        ]);
        const dutiesByUser = new Map<string, AppDuty[]>();
        for (const row of dutyRows || []) {
          const list = dutiesByUser.get(row.user_id) || [];
          list.push(row.duty as AppDuty);
          dutiesByUser.set(row.user_id, list);
        }
        return Response.json({
          users: (profiles || []).map((p) => ({
            ...p,
            role: roles?.find((r) => r.user_id === p.id)?.role || null,
            duties: dutiesByUser.get(p.id) || [],
          })),
          provinces: provinces || [],
        });
      },
      POST: async ({ request }) => {
        const uid = await requireDuty(request, "manage_users");
        if (!uid) return new Response("Forbidden", { status: 403 });
        const body = await request.json();
        const input = inviteSchema.parse(body);
        const accessLevel = resolveAccessLevel(input.role, input.accessLevel);
        const duties = resolveDuties(input.role, accessLevel, input.duties as AppDuty[] | undefined);
        const dutyErr = validateDutiesForRole(input.role, duties);
        if (dutyErr) return new Response(dutyErr, { status: 400 });
        if (input.role === "province_user" && !input.provinceId) {
          return new Response("Province required for province users", { status: 400 });
        }

        const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
          data: { full_name: input.fullName },
        });
        if (error) return new Response(error.message, { status: 400 });
        const newId = created.user!.id;

        await supabaseAdmin.from("profiles").upsert({
          id: newId,
          email: input.email,
          full_name: input.fullName,
          province_id: input.role === "province_user" ? input.provinceId : null,
          job_title: input.jobTitle || null,
          access_level: accessLevel,
        });
        await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
        await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: input.role });
        await upsertMemberDuties(newId, duties);
        return Response.json({ ok: true });
      },
      PATCH: async ({ request }) => {
        const actorId = await requireDuty(request, "manage_users");
        if (!actorId) return new Response("Forbidden", { status: 403 });
        const body = await request.json();
        const input = patchSchema.parse(body);

        const selfErr = await validateSelfEdit(actorId, input.userId, input);
        if (selfErr) return new Response(selfErr, { status: 400 });

        const { data: existingRoleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", input.userId)
          .maybeSingle();
        const nextRole = (input.role ?? existingRoleRow?.role) as AppRole | undefined;
        if (!nextRole) return new Response("User role not found", { status: 404 });

        const { data: existingProfile } = await supabaseAdmin
          .from("profiles")
          .select("access_level, province_id")
          .eq("id", input.userId)
          .maybeSingle();
        const nextAccess = resolveAccessLevel(
          nextRole,
          (input.accessLevel ?? existingProfile?.access_level ?? "edit") as AccessLevel,
        );
        const nextProvinceId =
          input.provinceId !== undefined
            ? input.provinceId
            : nextRole === "province_user"
              ? existingProfile?.province_id ?? null
              : null;

        let nextDuties: AppDuty[];
        if (nextAccess === "view") {
          nextDuties = [];
        } else if (input.duties) {
          nextDuties = input.duties as AppDuty[];
        } else {
          const { data: currentDuties } = await supabaseAdmin
            .from("user_duties")
            .select("duty")
            .eq("user_id", input.userId);
          nextDuties =
            input.role && input.role !== existingRoleRow?.role
              ? defaultDutiesForRole(nextRole)
              : (currentDuties || []).map((d) => d.duty as AppDuty);
        }

        const dutyErr = validateDutiesForRole(nextRole, nextDuties);
        if (dutyErr) return new Response(dutyErr, { status: 400 });
        if (nextRole === "province_user" && !nextProvinceId) {
          return new Response("Province required for province users", { status: 400 });
        }

        const lastMgrErr = await validateLastManager(input.userId, nextDuties, nextAccess);
        if (lastMgrErr) return new Response(lastMgrErr, { status: 400 });

        const profilePatch: Record<string, unknown> = {};
        if (input.fullName !== undefined) profilePatch.full_name = input.fullName;
        if (input.jobTitle !== undefined) profilePatch.job_title = input.jobTitle;
        if (input.accessLevel !== undefined || nextRole === "read_only") profilePatch.access_level = nextAccess;
        if (input.provinceId !== undefined || input.role !== undefined) {
          profilePatch.province_id = nextRole === "province_user" ? nextProvinceId : null;
        }
        if (Object.keys(profilePatch).length) {
          await supabaseAdmin.from("profiles").update(profilePatch).eq("id", input.userId);
        }

        if (input.role !== undefined) {
          await supabaseAdmin.from("user_roles").delete().eq("user_id", input.userId);
          await supabaseAdmin.from("user_roles").insert({ user_id: input.userId, role: input.role });
        }

        if (input.duties !== undefined || input.accessLevel !== undefined || input.role !== undefined) {
          await upsertMemberDuties(input.userId, nextDuties);
        }

        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const uid = await requireDuty(request, "manage_users");
        if (!uid) return new Response("Forbidden", { status: 403 });
        const body = await request.json();
        const { userId } = z.object({ userId: z.string().uuid() }).parse(body);
        if (userId === uid) return new Response("Cannot remove yourself", { status: 400 });

        const { data: hadManage } = await supabaseAdmin
          .from("user_duties")
          .select("duty")
          .eq("user_id", userId)
          .eq("duty", "manage_users")
          .maybeSingle();
        if (hadManage) {
          const others = await countManageUsers(userId);
          if (others === 0) return new Response("Cannot remove the last user manager", { status: 400 });
        }

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) return new Response(error.message, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});
