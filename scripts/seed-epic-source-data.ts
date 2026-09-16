/**
 * Idempotent seed of EpiC DRC source-based reporting data from Docs.
 * Usage: bun run scripts/seed-epic-source-data.ts
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */
import { createClient } from "@supabase/supabase-js";
import * as payload from "./data/epic-source-payload";
import { percentFromParts } from "../src/lib/epic-source/calc";
import {
  DOC_REPORT,
  DOC_STRUCTURE,
  PERIOD_FY2026_H1,
  PERIOD_LABEL,
  SOURCE_TYPE_NARRATIVE,
  SOURCE_TYPE_OFFICIAL,
  SOURCE_TYPE_UNAVAILABLE,
} from "../src/lib/epic-source/provenance";

async function upsert(sb: ReturnType<typeof createClient>, table: string, rows: Record<string, unknown>[], onConflict: string) {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows, { onConflict });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${rows.length} upserted`);
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  console.log("Seeding EpiC DRC source-based data…");

  await upsert(sb, "source_documents", payload.sourceDocuments, "code");
  await upsert(sb, "programs", payload.programs, "code");
  await upsert(sb, "program_objectives", payload.objectives, "code");
  await upsert(
    sb,
    "program_activities",
    payload.activities.map((a) => ({
      ...a,
      title_en: null,
      source_document_code: DOC_STRUCTURE,
      source_section: `Activité ${a.parent_code || a.code}`,
      source_type: SOURCE_TYPE_OFFICIAL,
      is_verified: true,
    })),
    "code",
  );
  await upsert(sb, "technical_areas", payload.technicalAreas, "code");
  await upsert(sb, "reporting_periods", payload.reportingPeriods, "code");

  for (const p of payload.extraProvinces) {
    const { error } = await sb.from("provinces").upsert({ name: p.name, code: p.code }, { onConflict: "code" });
    if (error) {
      const { data: byName } = await sb.from("provinces").select("id").eq("name", p.name).maybeSingle();
      if (!byName) {
        const { error: insErr } = await sb.from("provinces").insert({ name: p.name, code: p.code });
        if (insErr) console.warn(`  province ${p.code}: ${insErr.message}`);
      }
    }
  }

  const { data: provinces, error: pErr } = await sb.from("provinces").select("id, code, name");
  if (pErr) throw new Error(pErr.message);
  const provinceByCode = new Map((provinces || []).map((p) => [p.code, p.id]));

  const hzRows = payload.healthZones.map((z) => ({
    code: z.code,
    name: z.name,
    province_id: z.provinceCode ? provinceByCode.get(z.provinceCode) ?? null : null,
    province_assignment_status: z.province_assignment_status,
    source_document_code: DOC_REPORT,
    source_section: z.source_section,
    source_type: SOURCE_TYPE_OFFICIAL,
    is_verified: true,
    notes: z.notes ?? null,
  }));
  await upsert(sb, "health_zones", hzRows, "code");

  const locRows = payload.namedLocations.map((l) => ({
    code: l.code,
    name: l.name,
    location_type: l.location_type,
    province_id: l.provinceCode ? provinceByCode.get(l.provinceCode) ?? null : null,
    health_zone_code: l.health_zone_code,
    source_document_code: DOC_REPORT,
    source_section: l.source_section,
    source_type: SOURCE_TYPE_OFFICIAL,
    is_verified: true,
    notes: l.notes ?? null,
  }));
  await upsert(sb, "named_locations", locRows, "code");

  const coverage = [
    {
      coverage_key: `${PERIOD_FY2026_H1}-MNCH-76HZ`,
      period_code: PERIOD_FY2026_H1,
      technical_area_code: "MNCH",
      province_id: null,
      health_zone_count: 76,
      health_zone_names_available: false,
      notes: "76 Health Zones named as a count only; names of all 76 are not listed in the source.",
      source_document_code: DOC_REPORT,
      source_section: "Annex B methodology note",
      source_type: SOURCE_TYPE_OFFICIAL,
      is_verified: true,
      data_level: "Aggregate",
    },
    ...payload.mnchProvinceCodes.map((code) => ({
      coverage_key: `${PERIOD_FY2026_H1}-MNCH-${code}`,
      period_code: PERIOD_FY2026_H1,
      technical_area_code: "MNCH",
      province_id: provinceByCode.get(code) ?? null,
      health_zone_count: null,
      health_zone_names_available: false,
      notes: "Named as one of four provinces where EpiC MNCH/Nutrition/Malaria activities had begun. No province-split indicator values are provided.",
      source_document_code: DOC_REPORT,
      source_section: "Annex B methodology note / Key Results",
      source_type: SOURCE_TYPE_OFFICIAL,
      is_verified: true,
      data_level: "Aggregate",
    })),
  ];
  await upsert(sb, "period_coverage", coverage, "coverage_key");

  await upsert(
    sb,
    "indicators",
    payload.matrixIndicators.map((i) => ({
      code: i.code,
      name: i.name,
      technical_area_code: i.technical_area_code,
      result_kind: i.result_kind,
      numerator_label: "Numerator",
      denominator_label: "Denominator",
      source_document_code: DOC_REPORT,
      source_section: "Annex B: MNCH, Nutrition, and Malaria Performance Monitoring and Evaluation Matrix",
      is_verified: true,
    })),
    "code",
  );

  await upsert(
    sb,
    "indicator_results",
    payload.matrixIndicators.map((i) => {
      const computed = percentFromParts(i.numerator, i.denominator);
      return {
        indicator_code: i.code,
        period_code: PERIOD_FY2026_H1,
        geography_key: "AGG_4_PROVINCES_76HZ",
        province_id: null,
        health_zone_code: null,
        numerator: i.numerator,
        denominator: i.denominator,
        reported_percent: i.reported_percent,
        comment: i.comment,
        source_document_code: DOC_REPORT,
        source_section: "Annex B: MNCH, Nutrition, and Malaria Performance Monitoring and Evaluation Matrix",
        source_reporting_period: PERIOD_LABEL,
        source_type: SOURCE_TYPE_OFFICIAL,
        is_verified: true,
        data_level: "Aggregate",
        notes: computed != null && i.reported_percent != null && computed !== i.reported_percent
          ? `Computed percent from numerator/denominator is ${computed}; source reported ${i.reported_percent}. Display uses computed value.`
          : null,
      };
    }),
    "indicator_code,period_code,geography_key",
  );

  await upsert(
    sb,
    "aggregate_results",
    payload.aggregateResults.map((r) => ({
      ...r,
      period_code: PERIOD_FY2026_H1,
      source_document_code: DOC_REPORT,
      source_section: "I. Key Results by Objective Per Technical Area",
      source_reporting_period: PERIOD_LABEL,
      source_type: SOURCE_TYPE_OFFICIAL,
      is_verified: true,
      data_level: "Aggregate",
    })),
    "code",
  );

  await upsert(
    sb,
    "ghs_indicators",
    payload.ghsIndicators.map((g) => ({
      ...g,
      source_document_code: DOC_REPORT,
      source_section: "Annex C: GHS Performance Monitoring and Evaluation Matrix",
      is_verified: true,
    })),
    "code",
  );

  await upsert(
    sb,
    "ghs_results",
    payload.ghsResults.map((r) => ({
      ...r,
      period_code: PERIOD_FY2026_H1,
      source_document_code: DOC_REPORT,
      source_section: "Annex C: GHS Performance Monitoring and Evaluation Matrix",
      source_reporting_period: PERIOD_LABEL,
      source_type: SOURCE_TYPE_OFFICIAL,
      is_verified: true,
      data_level: "Aggregate",
    })),
    "ghs_indicator_code,period_code",
  );

  await upsert(
    sb,
    "ghs_result_details",
    payload.ghsDetails.map((d) => ({
      code: d.code,
      ghs_indicator_code: d.ghs_indicator_code,
      period_code: PERIOD_FY2026_H1,
      detail_type: d.detail_type,
      label: d.label,
      value: d.value ?? null,
      value_is_minimum: d.value_is_minimum ?? false,
      male_count: d.male_count ?? null,
      female_count: d.female_count ?? null,
      unknown_sex_count: d.unknown_sex_count ?? null,
      sex_breakdown_status: d.sex_breakdown_status ?? "not_provided",
      location_code: d.location_code ?? null,
      health_zone_code: d.health_zone_code ?? null,
      province_id: d.provinceCode ? provinceByCode.get(d.provinceCode) ?? null : null,
      source_document_code: DOC_REPORT,
      source_section: "Annex C: GHS Performance Monitoring and Evaluation Matrix",
      source_type: SOURCE_TYPE_OFFICIAL,
      is_verified: true,
      data_level: "Aggregate",
      notes: d.notes ?? null,
    })),
    "code",
  );

  await upsert(
    sb,
    "field_records",
    payload.fieldRecords.map((f) => ({
      code: f.code,
      record_type: f.record_type,
      title: f.title,
      body: f.body,
      period_code: PERIOD_FY2026_H1,
      province_id: f.provinceCode ? provinceByCode.get(f.provinceCode) ?? null : null,
      health_zone_code: f.health_zone_code,
      location_code: f.location_code,
      timeframe_label: f.timeframe_label,
      metrics: f.metrics,
      source_document_code: DOC_REPORT,
      source_section: f.source_section,
      source_reporting_period: PERIOD_LABEL,
      source_type: SOURCE_TYPE_NARRATIVE,
      is_verified: true,
      data_level: "Narrative case",
      notes: f.notes,
    })),
    "code",
  );

  await upsert(
    sb,
    "source_gaps",
    payload.sourceGaps.map((g) => ({
      ...g,
      source_document_code: DOC_REPORT,
      source_type: SOURCE_TYPE_UNAVAILABLE,
      is_verified: true,
      data_level: "Not available",
    })),
    "code",
  );

  const catalogRows = payload.activities
    .filter((a) => a.level === "sub_activity")
    .map((a) => ({
      code: a.code,
      objective: Number(a.objective_code),
      parent_code: a.parent_code,
      title_fr: a.title_fr,
      title_en: a.title_fr,
      sort_order: a.sort_order,
      is_source_verified: true,
      source_document_code: DOC_STRUCTURE,
    }));
  const { error: catErr } = await sb.from("activity_catalog").upsert(catalogRows, { onConflict: "code" });
  if (catErr) console.warn("  activity_catalog (optional):", catErr.message);
  else console.log(`  activity_catalog: ${catalogRows.length} source-verified titles upserted`);

  const { count: objCount } = await sb.from("program_objectives").select("*", { count: "exact", head: true });
  const { count: actCount } = await sb.from("program_activities").select("*", { count: "exact", head: true });
  const { count: indCount } = await sb.from("indicators").select("*", { count: "exact", head: true });
  const { count: resCount } = await sb.from("indicator_results").select("*", { count: "exact", head: true });
  const { count: aggCount } = await sb.from("aggregate_results").select("*", { count: "exact", head: true });
  const { count: ghsCount } = await sb.from("ghs_results").select("*", { count: "exact", head: true });
  const { count: ghsDet } = await sb.from("ghs_result_details").select("*", { count: "exact", head: true });
  const { count: hzCount } = await sb.from("health_zones").select("*", { count: "exact", head: true });
  const { count: locCount } = await sb.from("named_locations").select("*", { count: "exact", head: true });
  const { count: perCount } = await sb.from("reporting_periods").select("*", { count: "exact", head: true });

  console.log("\nRecord counts:");
  console.log({
    objectives: objCount,
    activities: actCount,
    indicators: indCount,
    indicator_results: resCount,
    aggregate_results: aggCount,
    reporting_periods: perCount,
    ghs_results: ghsCount,
    ghs_result_details: ghsDet,
    health_zones: hzCount,
    named_locations: locCount,
  });
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
