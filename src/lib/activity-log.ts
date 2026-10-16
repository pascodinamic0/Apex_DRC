import type { Dict, Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ActivityMetadata = Record<string, unknown>;

export type ActivityEvent = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string;
  metadata: ActivityMetadata;
  created_at: string;
};

export async function recordActivity(input: {
  action: "auth.signed_in" | "auth.signed_out" | "app.page_viewed";
  summary: string;
  metadata?: ActivityMetadata;
}) {
  const { error } = await supabase.rpc("record_app_activity", {
    _action: input.action,
    _summary: input.summary,
    _entity_type: null,
    _entity_id: null,
    _metadata: (input.metadata ?? {}) as Json,
  });
  if (error) console.error("[activity]", error.message);
}

export async function loadActivity(limit = 300): Promise<ActivityEvent[]> {
  const { data, error } = await supabase
    .from("app_activity_log")
    .select("id, actor_id, action, entity_type, entity_id, summary, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => ({
    ...row,
    metadata: (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {}) as ActivityMetadata,
  }));
}

export function latestByActor(events: ActivityEvent[]) {
  const map = new Map<string, ActivityEvent>();
  for (const event of events) {
    if (!event.actor_id || map.has(event.actor_id)) continue;
    map.set(event.actor_id, event);
  }
  return map;
}

function metaText(metadata: ActivityMetadata, key: string) {
  const value = metadata[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function periodLabel(metadata: ActivityMetadata, t: Dict) {
  const month = Number(metadata.month);
  const year = metaText(metadata, "year");
  if (!Number.isInteger(month) || month < 1 || month > 12 || !year) return "";
  return `${t.months[month - 1]} ${year}`;
}

export function activityLabel(event: Pick<ActivityEvent, "action" | "metadata" | "summary">, t: Dict) {
  const period = periodLabel(event.metadata, t);
  const name = metaText(event.metadata, "name") || metaText(event.metadata, "target_name");
  const path = metaText(event.metadata, "path");
  const fill = (template: string) =>
    template.replace("{period}", period).replace("{name}", name).replace("{path}", path).replace(/\s{2,}/g, " ").trim();

  switch (event.action) {
    case "auth.signed_in":
      return t.activitySignedIn;
    case "auth.signed_out":
      return t.activitySignedOut;
    case "app.page_viewed":
      return fill(t.activityOpenedPage);
    case "account.created":
      return t.activityAccountCreated;
    case "account.onboarded":
      return t.activityOnboarded;
    case "report.created":
      return fill(t.activityReportCreated);
    case "report.saved":
      return fill(t.activityReportSaved);
    case "report.submitted":
      return fill(t.activityReportSubmitted);
    case "report.in_review":
      return fill(t.activityReportInReview);
    case "report.validated":
      return fill(t.activityReportValidated);
    case "report.returned":
      return fill(t.activityReportReturned);
    case "report.status_changed":
      return fill(t.activityReportStatus);
    case "comment.added":
      return t.activityCommentAdded;
    case "comment.resolved":
      return t.activityCommentResolved;
    case "section.approved":
      return t.activitySectionApproved;
    case "consolidation.commented":
      return fill(t.activityConsolidationComment);
    case "consolidation.approved":
      return fill(t.activityConsolidationApproved);
    case "consolidation.summary_saved":
      return fill(t.activitySummarySaved);
    case "photo.added":
      return t.activityPhotoAdded;
    case "photo.removed":
      return t.activityPhotoRemoved;
    case "profile.updated":
      return t.activityProfileUpdated;
    case "user.invited":
      return fill(t.activityUserInvited);
    case "user.updated":
      return fill(t.activityUserUpdated);
    case "user.blocked":
      return fill(t.activityUserBlocked);
    case "user.restored":
      return fill(t.activityUserRestored);
    case "user.removed":
      return fill(t.activityUserRemoved);
    case "import.started":
      return t.activityImportStarted;
    case "province.created":
      return fill(t.activityProvinceCreated);
    case "province.removed":
      return fill(t.activityProvinceRemoved);
    default:
      return event.summary;
  }
}

export function formatActivityTime(iso: string, lang: Lang) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(lang === "fr" ? "fr" : "en", { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), "day");
  return new Date(iso).toLocaleString(lang === "fr" ? "fr-FR" : "en-GB");
}
