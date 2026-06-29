/**
 * Create or reset demo login accounts in Supabase Auth.
 * Usage: bun run scripts/seed-demo-users.ts
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { createClient } from "@supabase/supabase-js";

const DEMO_PASSWORD = "Demo1234!";

const DEMO_USERS = [
  { email: "director@epic.cd", fullName: "Directeur Technique", role: "technical_director" as const, jobTitle: "Directeur Technique" },
  { email: "kinshasa@epic.cd", fullName: "CP Kinshasa", role: "province_user" as const, provinceCode: "kin" },
  { email: "lualaba@epic.cd", fullName: "CP Lualaba", role: "province_user" as const, provinceCode: "lualaba" },
  { email: "viewer@epic.cd", fullName: "Lecteur", role: "read_only" as const },
];

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: provinces, error: pErr } = await sb.from("provinces").select("id, code, name");
  if (pErr) {
    console.error("Could not load provinces:", pErr.message);
    process.exit(1);
  }

  for (const demo of DEMO_USERS) {
    let userId: string | undefined;
    const { data: listed } = await sb.auth.admin.listUsers({ perPage: 1000 });
    const existing = listed?.users.find((u) => u.email?.toLowerCase() === demo.email.toLowerCase());

    if (existing) {
      userId = existing.id;
      const { error } = await sb.auth.admin.updateUserById(userId, {
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: demo.fullName },
      });
      if (error) {
        console.error(`Failed to update ${demo.email}:`, error.message);
        continue;
      }
      console.log(`Updated ${demo.email}`);
    } else {
      const { data: created, error } = await sb.auth.admin.createUser({
        email: demo.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: demo.fullName },
      });
      if (error || !created.user) {
        console.error(`Failed to create ${demo.email}:`, error?.message);
        continue;
      }
      userId = created.user.id;
      console.log(`Created ${demo.email}`);
    }

    let provinceId: string | null = null;
    if (demo.role === "province_user" && demo.provinceCode) {
      const pv = provinces?.find(
        (p) =>
          p.code?.toLowerCase() === demo.provinceCode ||
          p.name?.toLowerCase().includes(demo.provinceCode!),
      );
      provinceId = pv?.id ?? null;
    }

    await sb.from("profiles").upsert({
      id: userId,
      email: demo.email,
      full_name: demo.fullName,
      province_id: provinceId,
      job_title: demo.jobTitle ?? null,
    });

    await sb.from("user_roles").delete().eq("user_id", userId);
    await sb.from("user_roles").insert({ user_id: userId, role: demo.role });
  }

  console.log("\nDone. Log in with any demo email and password:", DEMO_PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
