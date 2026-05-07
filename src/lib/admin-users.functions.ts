import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertDirector(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "technical_director")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Response("Forbidden", { status: 403 });
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertDirector(context.userId);
    const [{ data: profiles }, { data: roles }, { data: provinces }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email, full_name, province_id"),
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("provinces").select("id, name"),
    ]);
    return {
      users: (profiles || []).map((p) => ({
        ...p,
        role: roles?.find((r) => r.user_id === p.id)?.role || null,
      })),
      provinces: provinces || [],
    };
  });

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({
      email: z.string().email(),
      fullName: z.string().min(1),
      provinceId: z.string().uuid().nullable(),
      role: z.enum(["province_user", "technical_director", "read_only"]),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertDirector(context.userId);
    const siteUrl = process.env.SUPABASE_URL;
    const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.fullName },
      redirectTo: siteUrl ? undefined : undefined,
    });
    if (error) throw new Error(error.message);
    const uid = created.user!.id;
    await supabaseAdmin.from("profiles").upsert({
      id: uid, email: data.email, full_name: data.fullName, province_id: data.provinceId,
    });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    return { ok: true };
  });

export const removeUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertDirector(context.userId);
    if (data.userId === context.userId) throw new Error("Cannot remove yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
