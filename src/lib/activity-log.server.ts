import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";

export async function logAppActivity(input: {
  actorId: string;
  action: string;
  summary: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("app_activity_log").insert({
    actor_id: input.actorId,
    action: input.action,
    summary: input.summary.slice(0, 500),
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: (input.metadata ?? {}) as Json,
  });
  if (error) console.error("[activity]", error.message);
}
