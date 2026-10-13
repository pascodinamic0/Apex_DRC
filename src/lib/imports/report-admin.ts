import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  emptyAchievementSummary,
  EXTENDED_NARRATIVE_KEYS,
  type AchievementSummary,
  type ActivityResponseFields,
} from "@/lib/activity-catalog";
import { loadCatalogServer } from "@/lib/imports/catalog-server";

export async function seedReportExtensionsAdmin(reportId: string) {
  const catalog = await loadCatalogServer();
  if (catalog.length) {
    await supabaseAdmin.from("activity_responses").upsert(
      catalog.map((c) => ({
        report_id: reportId,
        catalog_code: c.code,
        realized: "",
        progress: "",
        challenges: "",
        solutions: "",
        priorities: "",
        partners: "",
      })) as never[],
      { onConflict: "report_id,catalog_code", ignoreDuplicates: true },
    );
  }
  await supabaseAdmin.from("achievement_summary").upsert(
    { report_id: reportId, ...emptyAchievementSummary() } as never,
    { onConflict: "report_id" },
  );
  const narrativeKeys = [
    ...EXTENDED_NARRATIVE_KEYS,
    "stakeholder_coordination",
    "success_stories",
    "challenges",
    "priorities_next_month",
  ];
  await supabaseAdmin.from("narratives").upsert(
    narrativeKeys.map((section_type) => ({
      report_id: reportId,
      section_type,
      content: "",
    })) as never[],
    { onConflict: "report_id,section_type", ignoreDuplicates: true },
  );
}

export async function ensureDraftReport(
  provinceId: string,
  month: number,
  year: number,
  createdBy: string,
): Promise<{ reportId: string; created: boolean; status: string }> {
  const { data: existing } = await supabaseAdmin
    .from("reports")
    .select("id, status")
    .eq("province_id", provinceId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (existing) {
    const { data: ach } = await supabaseAdmin
      .from("achievement_summary")
      .select("report_id")
      .eq("report_id", existing.id)
      .maybeSingle();
    if (!ach) await seedReportExtensionsAdmin(existing.id);
    return { reportId: existing.id, created: false, status: existing.status };
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("reports")
    .insert({
      province_id: provinceId,
      month,
      year,
      status: "draft",
      created_by: createdBy,
    } as never)
    .select("id, status")
    .single();
  if (error || !inserted) throw new Error(error?.message || "Failed to create report");
  await seedReportExtensionsAdmin(inserted.id);
  return { reportId: inserted.id, created: true, status: inserted.status };
}

export async function loadReportSnapshot(reportId: string) {
  const [{ data: achievement }, { data: responses }, { data: narrs }] = await Promise.all([
    supabaseAdmin.from("achievement_summary").select("*").eq("report_id", reportId).maybeSingle(),
    supabaseAdmin.from("activity_responses").select("*").eq("report_id", reportId),
    supabaseAdmin.from("narratives").select("section_type, content").eq("report_id", reportId),
  ]);

  const narratives: Record<string, string> = {};
  (narrs || []).forEach((n: { section_type: string; content: string | null }) => {
    narratives[n.section_type] = n.content || "";
  });

  const activityMap = new Map<string, ActivityResponseFields>();
  (responses || []).forEach((r: ActivityResponseFields & { catalog_code: string }) => {
    activityMap.set(r.catalog_code, {
      catalog_code: r.catalog_code,
      realized: r.realized || "",
      progress: r.progress || "",
      challenges: r.challenges || "",
      solutions: r.solutions || "",
      priorities: r.priorities || "",
      partners: r.partners || "",
    });
  });

  const ach: AchievementSummary = achievement
    ? {
        total_planned: achievement.total_planned ?? 0,
        finalized_approved: achievement.finalized_approved ?? 0,
        finalized_no_report: achievement.finalized_no_report ?? 0,
        in_progress: achievement.in_progress ?? 0,
        trigger_approved: achievement.trigger_approved ?? 0,
        not_realized: achievement.not_realized ?? 0,
      }
    : emptyAchievementSummary();

  return { achievement: ach, narratives, activityResponses: activityMap };
}

export async function applyAcceptedFields(
  reportId: string,
  payload: {
    achievement?: Partial<AchievementSummary>;
    narratives?: Record<string, string>;
    activityPatches?: ActivityResponseFields[];
    meta?: { submitted_by_name?: string | null; submitter_function?: string | null };
  },
) {
  if (payload.achievement && Object.keys(payload.achievement).length) {
    const { data: current } = await supabaseAdmin
      .from("achievement_summary")
      .select("*")
      .eq("report_id", reportId)
      .maybeSingle();
    const merged = { ...(current || emptyAchievementSummary()), ...payload.achievement };
    await supabaseAdmin.from("achievement_summary").upsert(
      { report_id: reportId, ...merged, updated_at: new Date().toISOString() } as never,
      { onConflict: "report_id" },
    );
  }

  if (payload.activityPatches?.length) {
    await supabaseAdmin.from("activity_responses").upsert(
      payload.activityPatches.map((r) => ({
        report_id: reportId,
        catalog_code: r.catalog_code,
        realized: r.realized,
        progress: r.progress,
        challenges: r.challenges,
        solutions: r.solutions,
        priorities: r.priorities,
        partners: r.partners,
        updated_at: new Date().toISOString(),
      })) as never[],
      { onConflict: "report_id,catalog_code" },
    );
  }

  for (const [section_type, content] of Object.entries(payload.narratives || {})) {
    await supabaseAdmin.from("narratives").upsert(
      { report_id: reportId, section_type, content: content || "" } as never,
      { onConflict: "report_id,section_type" },
    );
  }

  if (payload.meta) {
    await supabaseAdmin.from("reports").update(payload.meta as never).eq("id", reportId);
  }
}
