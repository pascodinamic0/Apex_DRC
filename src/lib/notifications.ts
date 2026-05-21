import { supabase } from "@/integrations/supabase/client";

export type NotificationType =
  | "report_submitted"
  | "report_returned"
  | "comment_added"
  | "section_approved"
  | "report_validated"
  | "reminder_sent";

export async function getDirectorUserIds(): Promise<string[]> {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "technical_director");
  return (data || []).map((r) => r.user_id);
}

export async function getProvinceUserIds(provinceId: string): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("province_id", provinceId);
  return (data || []).map((p) => p.id);
}

export async function notifyUsers(
  userIds: string[],
  payload: {
    type: NotificationType;
    report_id: string;
    title: string;
    body?: string;
    section_key?: string;
  },
) {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (!unique.length) return;
  await supabase.from("notifications").insert(
    unique.map((user_id) => ({
      user_id,
      type: payload.type,
      report_id: payload.report_id,
      title: payload.title,
      body: payload.body ?? null,
      section_key: payload.section_key ?? null,
    })) as never[],
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
