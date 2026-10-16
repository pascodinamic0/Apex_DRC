import { createFileRoute } from "@tanstack/react-router";
import { requireBulkImport } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { aiConfigured } from "@/lib/ai/env";
import { logAppActivity } from "@/lib/activity-log.server";

export const Route = createFileRoute("/api/imports")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const uid = await requireBulkImport(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const { data, error } = await supabaseAdmin
          .from("import_batches")
          .select("id, created_at")
          .eq("created_by", uid)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) return new Response(error.message, { status: 500 });
        return Response.json({ batches: data || [], aiConfigured: aiConfigured() });
      },
      POST: async ({ request }) => {
        const uid = await requireBulkImport(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const { data, error } = await supabaseAdmin
          .from("import_batches")
          .insert({ created_by: uid } as never)
          .select("id, created_at")
          .single();
        if (error || !data) return new Response(error?.message || "Failed", { status: 500 });
        await logAppActivity({
          actorId: uid,
          action: "import.started",
          summary: "Started a PDF import",
          entityType: "import_batch",
          entityId: data.id,
        });
        return Response.json({ batch: data });
      },
    },
  },
});
