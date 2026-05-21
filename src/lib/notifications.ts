import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "report_submitted"
  | "report_returned"
  | "comment_added"
  | "section_approved"
  | "report_validated"
  | "reminder_sent";

type NotifStrings = {
  notifSubmittedTitle: string;
  notifReturnedTitle: string;
  notifCommentTitle: string;
  notifApprovedTitle: string;
  notifValidatedTitle: string;
  notifResubmittedTitle: string;
  reminderSent: string;
};

export function notificationTitle(type: string, t: NotifStrings): string {
  const map: Record<string, string> = {
    report_submitted: t.notifSubmittedTitle,
    report_returned: t.notifReturnedTitle,
    comment_added: t.notifCommentTitle,
    section_approved: t.notifApprovedTitle,
    report_validated: t.notifValidatedTitle,
    reminder_sent: t.reminderSent,
  };
  return map[type] ?? type;
}

export async function getDirectorUserIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_director_user_ids");
  if (error) {
    const { data: fallback } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "technical_director");
    return (fallback || []).map((r) => r.user_id);
  }
  return (data as string[]) || [];
}

export async function getStaffNotifierIds(): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_staff_notifier_ids");
  if (error) {
    const { data: fallback } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["technical_director", "read_only"]);
    return (fallback || []).map((r) => r.user_id);
  }
  return (data as string[]) || [];
}

export async function getProvinceUserIds(provinceId: string, reportId?: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_province_user_ids", {
    p_province_id: provinceId,
    p_report_id: reportId ?? null,
  });
  if (error) {
    const { data: profs } = await supabase.from("profiles").select("id").eq("province_id", provinceId);
    const ids = (profs || []).map((p) => p.id);
    if (reportId && ids.length === 0) {
      const { data: r } = await supabase.from("reports").select("created_by").eq("id", reportId).maybeSingle();
      if (r?.created_by) return [r.created_by];
    }
    return ids;
  }
  return (data as string[]) || [];
}

export async function notifyUsers(
  userIds: string[],
  payload: {
    type: NotificationType;
    report_id: string | null;
    title: string;
    body?: string;
    section_key?: string;
  },
): Promise<{ error?: string }> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return {};

  const { error } = await supabase.rpc("create_notifications", {
    p_user_ids: unique,
    p_type: payload.type,
    p_report_id: payload.report_id || null,
    p_title: payload.title,
    p_body: payload.body ?? null,
    p_section_key: payload.section_key ?? null,
  });

  if (error) {
    const { error: insertError } = await supabase.from("notifications").insert(
      unique.map((user_id) => ({
        user_id,
        type: payload.type,
        report_id: payload.report_id,
        title: payload.title,
        body: payload.body ?? null,
        section_key: payload.section_key ?? null,
      })) as never[],
    );
    if (insertError) return { error: insertError.message };
  }
  return {};
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
