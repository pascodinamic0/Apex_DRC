/** Resolve Supabase URL/key in both Vite dev and Cloudflare Workers (VITE_* bindings). */
export function getSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL
  );
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function missingSupabasePublicEnv(): string[] {
  return [
    ...(!getSupabaseUrl() ? ["SUPABASE_URL"] : []),
    ...(!getSupabasePublishableKey() ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
  ];
}

export const missingSupabasePublicEnvMessage =
  "Copy .env.example to .env and set your Supabase project URL and publishable key.";
