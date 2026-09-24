import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const bodySchema = z.object({
  password: z.string().min(8),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(6),
  address: z.string().trim().min(3),
});

export const Route = createFileRoute("/api/onboarding/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await getAuthenticatedUser(request);
        if (!user) return new Response("Unauthorized", { status: 401 });

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Invalid onboarding details", { status: 400 });
        const input = parsed.data;

        const { data: fresh, error: readError } = await supabaseAdmin.auth.admin.getUserById(user.id);
        if (readError || !fresh.user) return new Response(readError?.message || "User not found", { status: 400 });

        const appMetadata = {
          ...(fresh.user.app_metadata ?? {}),
          must_set_password: false,
        };
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          password: input.password,
          app_metadata: appMetadata,
        });
        if (passwordError) return new Response(passwordError.message, { status: 400 });

        const { error: profileError } = await supabaseAdmin
          .from("profiles")
          .update({
            full_name: input.fullName,
            phone: input.phone,
            address: input.address,
            onboarding_completed: true,
          })
          .eq("id", user.id);
        if (profileError) return new Response(profileError.message, { status: 400 });

        return Response.json({ ok: true });
      },
    },
  },
});
