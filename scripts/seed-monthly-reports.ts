/**
 * Idempotent seed of June 2026 provincial monthly reports extracted from Docs.
 * Usage: bun run scripts/seed-monthly-reports.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCE_TYPE_OFFICIAL } from "../src/lib/epic-source/provenance";

type Activity = {
  catalog_code: string;
  realized: string;
  progress: string;
  challenges: string;
  solutions: string;
  priorities: string;
  partners: string;
};

type Monthly = {
  code: string;
  filename: string;
  province_code: string;
  province_name: string;
  month: number;
  year: number;
  notes?: string;
  submitted_by: string | null;
  domains: string | null;
  achievement: {
    total_planned: number;
    finalized_approved: number;
    finalized_no_report: number;
    in_progress: number;
    trigger_approved: number;
    not_realized: number;
  };
  activities: Activity[];
  narratives: Record<string, string>;
};

const extraCatalog: Record<string, { objective: number; parent: string; title: string; sort: number }> = {
  "1.1.1": { objective: 1, parent: "1.1", title: "Activité 1.1.1 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 101 },
  "2.1.1": { objective: 2, parent: "2.1", title: "Activité 2.1.1 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 401 },
  "2.1.3": { objective: 2, parent: "2.1", title: "Activité 2.1.3 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 403 },
  "2.2.7": { objective: 2, parent: "2.2", title: "Activité 2.2.7 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 507 },
  "2.3.3": { objective: 2, parent: "2.3", title: "Activité 2.3.3 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 603 },
  "3.1.1": { objective: 3, parent: "3.1", title: "Activité 3.1.1 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 701 },
  "3.2.4": { objective: 3, parent: "3.2", title: "Activité 3.2.4 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 804 },
  "3.4.1": { objective: 3, parent: "3.4", title: "Activité 3.4.1 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 1001 },
  "3.4.3": { objective: 3, parent: "3.4", title: "Activité 3.4.3 (présentée dans un rapport mensuel; absente de la structure source officielle)", sort: 1003 },
};

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const here = dirname(fileURLToPath(import.meta.url));
  const rows = JSON.parse(readFileSync(join(here, "data/june-2026-monthly.json"), "utf8")) as Monthly[];

  console.log(`Seeding ${rows.length} monthly provincial reports…`);

  const docs = rows.map((r) => ({
    code: r.code,
    filename: r.filename,
    title: `Rapport mensuel ${r.province_name} — ${String(r.month).padStart(2, "0")}/${r.year}`,
    source_type: SOURCE_TYPE_OFFICIAL,
    notes: r.notes || `Submitted by ${r.submitted_by || "not specified"}. Domains: ${r.domains || "not specified"}.`,
  }));
  const { error: dErr } = await sb.from("source_documents").upsert(docs, { onConflict: "code" });
  if (dErr) throw new Error(dErr.message);

  for (const r of rows) {
    const { error: pErr } = await sb.from("provinces").upsert(
      { name: r.province_name, code: r.province_code },
      { onConflict: "code" },
    );
    if (pErr) {
      const { data: existing } = await sb.from("provinces").select("id").eq("name", r.province_name).maybeSingle();
      if (!existing) {
        const { error: ins } = await sb.from("provinces").insert({ name: r.province_name, code: r.province_code });
        if (ins) console.warn(`province ${r.province_code}: ${ins.message}`);
      }
    }
  }

  const { data: provinces, error: plErr } = await sb.from("provinces").select("id, code, name");
  if (plErr) throw new Error(plErr.message);
  const byCode = new Map((provinces || []).map((p) => [p.code, p.id]));
  const byName = new Map((provinces || []).map((p) => [p.name.toLowerCase(), p.id]));

  const neededCodes = new Set<string>();
  for (const r of rows) for (const a of r.activities) neededCodes.add(a.catalog_code);
  const extraRows = [...neededCodes]
    .filter((c) => extraCatalog[c])
    .map((c) => ({
      code: c,
      objective: extraCatalog[c].objective,
      parent_code: extraCatalog[c].parent,
      title_fr: extraCatalog[c].title,
      title_en: extraCatalog[c].title,
      sort_order: extraCatalog[c].sort,
      is_source_verified: false,
      source_document_code: null,
    }));
  if (extraRows.length) {
    const { error } = await sb.from("activity_catalog").upsert(extraRows, { onConflict: "code" });
    if (error) console.warn("catalog extras:", error.message);
  }

  const { data: catalog } = await sb.from("activity_catalog").select("code");
  const catalogSet = new Set((catalog || []).map((c) => c.code));

  for (const r of rows) {
    const provinceId = byCode.get(r.province_code) || byName.get(r.province_name.toLowerCase());
    if (!provinceId) {
      console.warn(`Skip ${r.filename}: province ${r.province_code} not found`);
      continue;
    }

    const reportPayload = {
      province_id: provinceId,
      month: r.month,
      year: r.year,
      status: "validated",
      submitted_by_name: r.submitted_by,
      submitted_at: new Date(`${r.year}-${String(r.month).padStart(2, "0")}-28T12:00:00Z`).toISOString(),
      source_document_code: r.code,
    };

    const { data: existing } = await sb
      .from("reports")
      .select("id")
      .eq("province_id", provinceId)
      .eq("month", r.month)
      .eq("year", r.year)
      .maybeSingle();

    let reportId = existing?.id as string | undefined;
    if (reportId) {
      const { error } = await sb.from("reports").update(reportPayload).eq("id", reportId);
      if (error) throw new Error(`${r.code} update report: ${error.message}`);
    } else {
      const { data: created, error } = await sb.from("reports").insert(reportPayload).select("id").single();
      if (error) throw new Error(`${r.code} insert report: ${error.message}`);
      reportId = created.id;
    }

    const { error: aErr } = await sb.from("achievement_summary").upsert(
      { report_id: reportId, ...r.achievement },
      { onConflict: "report_id" },
    );
    if (aErr) throw new Error(`${r.code} achievement: ${aErr.message}`);

    const responses = r.activities
      .filter((a) => catalogSet.has(a.catalog_code) || extraCatalog[a.catalog_code])
      .map((a) => ({
        report_id: reportId,
        catalog_code: a.catalog_code,
        realized: a.realized || "",
        progress: a.progress || "",
        challenges: a.challenges || "",
        solutions: a.solutions || "",
        priorities: a.priorities || "",
        partners: a.partners || "",
      }));
    const missing = r.activities.filter((a) => !catalogSet.has(a.catalog_code) && !extraCatalog[a.catalog_code]);
    if (missing.length) {
      const more = missing.map((a) => ({
        code: a.catalog_code,
        objective: Number(a.catalog_code.split(".")[0]) || 1,
        parent_code: a.catalog_code.split(".").slice(0, 2).join("."),
        title_fr: `Activité ${a.catalog_code} (rapport mensuel)`,
        title_en: `Activity ${a.catalog_code} (monthly report)`,
        sort_order: 0,
        is_source_verified: false,
      }));
      const { error } = await sb.from("activity_catalog").upsert(more, { onConflict: "code" });
      if (error) console.warn("late catalog:", error.message);
      else missing.forEach((a) => catalogSet.add(a.catalog_code));
      responses.push(
        ...missing.map((a) => ({
          report_id: reportId,
          catalog_code: a.catalog_code,
          realized: a.realized || "",
          progress: a.progress || "",
          challenges: a.challenges || "",
          solutions: a.solutions || "",
          priorities: a.priorities || "",
          partners: a.partners || "",
        })),
      );
    }
    const merged = new Map<string, (typeof responses)[number]>();
    for (const row of responses) {
      const prev = merged.get(row.catalog_code);
      if (!prev) {
        merged.set(row.catalog_code, row);
        continue;
      }
      const join = (a: string, b: string) => [a, b].filter(Boolean).join("\n\n");
      merged.set(row.catalog_code, {
        ...prev,
        realized: join(prev.realized, row.realized),
        progress: join(prev.progress, row.progress),
        challenges: join(prev.challenges, row.challenges),
        solutions: join(prev.solutions, row.solutions),
        priorities: join(prev.priorities, row.priorities),
        partners: join(prev.partners, row.partners),
      });
    }
    const uniqueResponses = [...merged.values()];
    if (uniqueResponses.length) {
      const { error } = await sb.from("activity_responses").upsert(uniqueResponses, { onConflict: "report_id,catalog_code" });
      if (error) throw new Error(`${r.code} responses: ${error.message}`);
    }

    const narrs = Object.entries(r.narratives)
      .filter(([, content]) => content && content.trim())
      .map(([section_type, content]) => ({
        report_id: reportId,
        section_type,
        content,
      }));
    for (const n of narrs) {
      const { error } = await sb.from("narratives").upsert(n, { onConflict: "report_id,section_type" });
      if (error) console.warn(`${r.code} narrative ${n.section_type}:`, error.message);
    }

    console.log(`  ${r.province_name}: report ${reportId} activities=${uniqueResponses.length}`);
  }

  const { count } = await sb.from("reports").select("*", { count: "exact", head: true }).eq("month", 6).eq("year", 2026);
  console.log(`June 2026 reports in database: ${count}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
