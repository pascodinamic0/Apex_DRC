import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";
import { canWithDuties, type AccessLevel, type AppDuty } from "@/lib/auth/duties";

export type AppRole = "province_user" | "technical_director" | "technical_assistant" | "read_only";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  province_id: string | null;
  preferred_lang: string | null;
  job_title: string | null;
  access_level: AccessLevel;
  access_blocked: boolean;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  duties: AppDuty[];
  accessLevel: AccessLevel;
  loading: boolean;
  isViewOnly: boolean;
  can: (duty: AppDuty) => boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  role: null,
  duties: [],
  accessLevel: "edit",
  loading: true,
  isViewOnly: false,
  can: () => false,
  signIn: async () => ({}),
  signInWithGoogle: async () => ({}),
  signOut: async () => {},
  resetPasswordForEmail: async () => ({}),
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [duties, setDuties] = useState<AppDuty[]>([]);
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("edit");
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const [{ data: p }, { data: r }, { data: dutyRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("user_duties").select("duty").eq("user_id", uid),
    ]);
    const prof = p as Profile | null;
    const level = (prof?.access_level as AccessLevel) ?? "edit";
    setProfile(
      prof
        ? { ...prof, access_blocked: Boolean((prof as Profile).access_blocked) }
        : null,
    );
    setRole((r?.role as AppRole) ?? null);
    setDuties((dutyRows || []).map((row) => row.duty as AppDuty));
    setAccessLevel(level);
    if (prof?.preferred_lang === "fr" || prof?.preferred_lang === "en") {
      localStorage.setItem("lang", prof.preferred_lang);
      window.dispatchEvent(new CustomEvent("epic-lang", { detail: prof.preferred_lang as Lang }));
    }
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
        setDuties([]);
        setAccessLevel("edit");
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPasswordForEmail = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const isViewOnly = accessLevel === "view";
  const can = (duty: AppDuty) => canWithDuties(duties, accessLevel, duty);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        role,
        duties,
        accessLevel,
        loading,
        isViewOnly,
        can,
        signIn,
        signInWithGoogle,
        signOut,
        resetPasswordForEmail,
        refreshProfile,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
