import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDirectorUserId } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const uid = await getDirectorUserId(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const [{ data: profiles }, { data: roles }, { data: provinces }] = await Promise.all([
          supabaseAdmin.from("profiles").select("id, email, full_name, province_id, job_title"),
          supabaseAdmin.from("user_roles").select("user_id, role"),
          supabaseAdmin.from("provinces").select("id, name, code").order("name"),
        ]);
        return Response.json({
          users: (profiles || []).map((p) => ({ ...p, role: roles?.find((r) => r.user_id === p.id)?.role || null })),
          provinces: provinces || [],
        });
      },
      POST: async ({ request }) => {
        const uid = await getDirectorUserId(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const body = await request.json();
        const input = z.object({
          email: z.string().email(),
          fullName: z.string().min(1),
          provinceId: z.string().uuid().nullable(),
          role: z.enum(["province_user", "technical_director", "read_only"]),
          jobTitle: z.string().optional().nullable(),
        }).parse(body);
        const { data: created, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(input.email, {
          data: { full_name: input.fullName },
        });
        if (error) return new Response(error.message, { status: 400 });
        const newId = created.user!.id;
        await supabaseAdmin.from("profiles").upsert({
          id: newId, email: input.email, full_name: input.fullName,
          province_id: input.role === "province_user" ? input.provinceId : null,
          job_title: input.jobTitle || null,
        });
        await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
        await supabaseAdmin.from("user_roles").insert({ user_id: newId, role: input.role });
        return Response.json({ ok: true });
      },
      DELETE: async ({ request }) => {
        const uid = await getDirectorUserId(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const body = await request.json();
        const { userId } = z.object({ userId: z.string().uuid() }).parse(body);
        if (userId === uid) return new Response("Cannot remove yourself", { status: 400 });
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) return new Response(error.message, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});
