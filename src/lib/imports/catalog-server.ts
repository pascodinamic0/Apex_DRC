import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CatalogRow } from "@/lib/activity-catalog";

export async function loadCatalogServer(): Promise<CatalogRow[]> {
  const [{ data }, { data: sourceActs }] = await Promise.all([
    supabaseAdmin
      .from("activity_catalog")
      .select("code, objective, parent_code, title_fr, title_en, sort_order")
      .order("sort_order"),
    supabaseAdmin.from("program_activities" as never).select("code, level"),
  ]);
  const rows = (data as CatalogRow[]) || [];
  const sourceCodes = new Set(
    ((sourceActs || []) as { code: string; level: string }[])
      .filter((a) => a.level === "sub_activity")
      .map((a) => a.code),
  );
  if (!sourceCodes.size) return rows;
  return rows.filter((r) => sourceCodes.has(r.code));
}
