import type { AchievementSummary, ActivityResponseFields } from "@/lib/activity-catalog";
import { EXTENDED_NARRATIVE_KEYS } from "@/lib/activity-catalog";
import type { AcceptSelection, ExtractedMonthlyReport } from "@/lib/imports/types";
import {
  applyAcceptedFields,
  ensureDraftReport,
  loadReportSnapshot,
} from "@/lib/imports/report-admin";

const WORKFLOW_STATUSES = new Set(["submitted", "in_review", "validated"]);

export function buildPatchesFromSelection(
  extracted: ExtractedMonthlyReport,
  current: {
    achievement: AchievementSummary;
    narratives: Record<string, string>;
    activityResponses: Map<string, ActivityResponseFields>;
  },
  selection: AcceptSelection,
) {
  const achievementPatch: Partial<AchievementSummary> = {};
  for (const key of Object.keys(selection.achievement) as (keyof AchievementSummary)[]) {
    if (!selection.achievement[key]) continue;
    achievementPatch[key] = extracted.achievement[key];
  }

  const narrativePatch: Record<string, string> = {};
  for (const key of EXTENDED_NARRATIVE_KEYS) {
    if (!selection.narratives[key]) continue;
    const val = extracted.narratives[key];
    if (val) narrativePatch[key] = val;
  }

  const activityPatches: ActivityResponseFields[] = [];
  for (const [code, fields] of Object.entries(selection.activities)) {
    const ext = extracted.activities.find((a) => a.catalog_code === code);
    if (!ext) continue;
    const cur = current.activityResponses.get(code);
    const merged: ActivityResponseFields = {
      catalog_code: code,
      realized: cur?.realized || "",
      progress: cur?.progress || "",
      challenges: cur?.challenges || "",
      solutions: cur?.solutions || "",
      priorities: cur?.priorities || "",
      partners: cur?.partners || "",
    };
    let touched = false;
    for (const f of ["realized", "progress", "challenges", "solutions", "priorities", "partners"] as const) {
      if (fields[f]) {
        merged[f] = ext[f] || "";
        touched = true;
      }
    }
    if (touched) activityPatches.push(merged);
  }

  return { achievementPatch, narrativePatch, activityPatches };
}

export async function applyImportSelection(
  userId: string,
  extracted: ExtractedMonthlyReport,
  selection: AcceptSelection,
): Promise<{ reportId: string; status: string; inWorkflow: boolean }> {
  const { provinceId, month, year } = selection.identity;
  const { reportId, status } = await ensureDraftReport(provinceId, month, year, userId);
  const current = await loadReportSnapshot(reportId);
  const { achievementPatch, narrativePatch, activityPatches } = buildPatchesFromSelection(
    extracted,
    current,
    selection,
  );

  await applyAcceptedFields(reportId, {
    achievement: achievementPatch,
    narratives: narrativePatch,
    activityPatches,
    meta: extracted.submitted_by
      ? { submitted_by_name: extracted.submitted_by, submitter_function: extracted.domains }
      : undefined,
  });

  return { reportId, status, inWorkflow: WORKFLOW_STATUSES.has(status) };
}
