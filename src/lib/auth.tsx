import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

export type AppRole = "province_user" | "technical_director" | "read_only";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  province_id: string | null;
  preferred_lang: string | null;
  job_title: string | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const Ctx = createContext<AuthState>({
  user: null, session: null, profile: null, role: null, loading: true,
  signIn: async () => ({}), signOut: async () => {},
  resetPasswordForEmail: async () => ({}), refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    ]);
    const prof = p as Profile | null;
    setProfile(prof);
    setRole((r?.role as AppRole) ?? null);
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
        setProfile(null); setRole(null);
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

  return (
    <Ctx.Provider value={{
      user, session, profile, role, loading, signIn, signOut,
      resetPasswordForEmail, refreshProfile,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
