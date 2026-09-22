import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AppDuty } from "@/lib/auth/duties";

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return null;

  const { getSupabasePublishableKey, getSupabaseUrl } = await import("@/integrations/supabase/env");
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) return null;

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

async function userHasDuty(userId: string, duty: AppDuty): Promise<boolean> {
  const [{ data: profile }, { data: dutyRow }] = await Promise.all([
    supabaseAdmin.from("profiles").select("access_level").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("user_duties").select("duty").eq("user_id", userId).eq("duty", duty).maybeSingle(),
  ]);
  if (!profile || profile.access_level !== "edit" || !dutyRow) return false;
  return true;
}

/** Returns the authenticated user's id when they hold a specific duty with edit access. */
export async function requireDuty(request: Request, duty: AppDuty): Promise<string | null> {
  const uid = await getAuthenticatedUserId(request);
  if (!uid) return null;
  const ok = await userHasDuty(uid, duty);
  return ok ? uid : null;
}

/** @deprecated Use requireDuty(request, 'manage_users') for admin routes. */
export async function getDirectorUserId(request: Request): Promise<string | null> {
  return requireDuty(request, "manage_users");
}
