import { supabase } from "@/integrations/supabase/client";
import {
  emptyAchievementSummary,
  emptyActivityResponse,
  type AchievementSummary,
  type ActivityResponseFields,
  type CatalogRow,
  EXTENDED_NARRATIVE_KEYS,
} from "@/lib/activity-catalog";
import type { Narratives, ReportData } from "@/components/report-editor";

export type ReportMeta = {
  submitted_by_name: string | null;
  submitter_function: string | null;
  submission_deadline: string | null;
};

export async function loadCatalog(): Promise<CatalogRow[]> {
  const { data } = await supabase
    .from("activity_catalog")
    .select("code, objective, parent_code, title_fr, title_en, sort_order")
    .order("sort_order");
  return (data as CatalogRow[]) || [];
}

export async function loadExtendedReportData(reportId: string) {
  const [
    { data: report },
    { data: acts },
    { data: narrs },
    { data: achievement },
    { data: responses },
    catalog,
  ] = await Promise.all([
    supabase.from("reports").select("*").eq("id", reportId).single(),
    supabase.from("activities").select("*").eq("report_id", reportId).order("position"),
    supabase.from("narratives").select("*").eq("report_id", reportId),
    supabase.from("achievement_summary").select("*").eq("report_id", reportId).maybeSingle(),
    supabase.from("activity_responses").select("*").eq("report_id", reportId),
    loadCatalog(),
  ]);

  const narratives: Narratives = {};
  (narrs || []).forEach((n: { section_type: string; content: string | null }) => {
    narratives[n.section_type] = n.content || "";
  });
  for (const key of EXTENDED_NARRATIVE_KEYS) {
    if (narratives[key] === undefined) narratives[key] = "";
  }

  const responseMap = new Map<string, ActivityResponseFields>();
  for (const row of catalog) {
    responseMap.set(row.code, emptyActivityResponse(row.code));
  }
  (responses || []).forEach((r: ActivityResponseFields & { catalog_code: string }) => {
    responseMap.set(r.catalog_code, {
      catalog_code: r.catalog_code,
      realized: r.realized || "",
      progress: r.progress || "",
      challenges: r.challenges || "",
      solutions: r.solutions || "",
      priorities: r.priorities || "",
      partners: r.partners || "",
    });
  });

  if (!achievement) {
    await seedReportExtensions(reportId);
  }
  const { data: achievementAfter } = await supabase
    .from("achievement_summary")
    .select("*")
    .eq("report_id", reportId)
    .maybeSingle();
  const achRow = achievementAfter || achievement;
  const ach = achRow
    ? {
        total_planned: achRow.total_planned ?? 0,
        finalized_approved: achRow.finalized_approved ?? 0,
        finalized_no_report: achRow.finalized_no_report ?? 0,
        in_progress: achRow.in_progress ?? 0,
        trigger_approved: achRow.trigger_approved ?? 0,
        not_realized: achRow.not_realized ?? 0,
      }
    : emptyAchievementSummary();

  return {
    report: report as ReportData & ReportMeta,
    activities: ((acts || []) as { id?: string; objective: number; activity_code: string; description: string; planned: number; achieved: number }[]).map((a) => ({
      id: a.id,
      objective: a.objective,
      activity_code: a.activity_code || "",
      description: a.description || "",
      planned: Number(a.planned || 0),
      achieved: Number(a.achieved || 0),
    })),
    narratives,
    achievement: ach,
    activityResponses: Array.from(responseMap.values()),
    catalog,
  };
}

export async function seedReportExtensions(reportId: string) {
  const catalog = await loadCatalog();
  if (catalog.length) {
    await supabase.from("activity_responses").upsert(
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
  await supabase.from("achievement_summary").upsert(
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
  await supabase.from("narratives").upsert(
    narrativeKeys.map((section_type) => ({
      report_id: reportId,
      section_type,
      content: "",
    })) as never[],
    { onConflict: "report_id,section_type", ignoreDuplicates: true },
  );
}

export async function persistExtendedReport(
  reportId: string,
  payload: {
    narratives: Narratives;
    achievement: AchievementSummary;
    activityResponses: ActivityResponseFields[];
    meta?: Partial<ReportMeta>;
  },
) {
  await supabase.from("achievement_summary").upsert(
    { report_id: reportId, ...payload.achievement, updated_at: new Date().toISOString() } as never,
    { onConflict: "report_id" },
  );
  if (payload.activityResponses.length) {
    await supabase.from("activity_responses").upsert(
      payload.activityResponses.map((r) => ({
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
  for (const [section_type, content] of Object.entries(payload.narratives)) {
    if (!content && !EXTENDED_NARRATIVE_KEYS.includes(section_type as never)) continue;
    await supabase.from("narratives").upsert(
      { report_id: reportId, section_type, content: content || "" } as never,
      { onConflict: "report_id,section_type" },
    );
  }
  if (payload.meta) {
    await supabase.from("reports").update(payload.meta as never).eq("id", reportId);
  }
}

export async function countOpenComments(reportId: string): Promise<number> {
  const { count } = await supabase
    .from("report_comments")
    .select("id", { count: "exact", head: true })
    .eq("report_id", reportId)
    .is("resolved_at", null);
  return count ?? 0;
}
