import { supabase } from "@/integrations/supabase/client";
import { percentFromParts } from "@/lib/epic-source/calc";
import { PERIOD_FY2026_H1 } from "@/lib/epic-source/provenance";

export type ReportingPeriod = {
  code: string;
  fiscal_year: string;
  period_label: string;
  start_date: string;
  end_date: string;
  dataset_label: string;
  methodology: string | null;
};

export type ProgramObjective = {
  code: string;
  number: number;
  title_fr: string;
};

export type ProgramActivity = {
  code: string;
  objective_code: string;
  parent_code: string | null;
  level: string;
  title_fr: string;
  sort_order: number;
};

export type IndicatorResultRow = {
  indicator_code: string;
  name: string;
  technical_area_code: string;
  numerator: number | null;
  denominator: number | null;
  reported_percent: number | null;
  computed_percent: number | null;
  comment: string | null;
  data_level: string;
  source_section: string | null;
  notes: string | null;
};

export type AggregateResultRow = {
  code: string;
  technical_area_code: string;
  name: string;
  value: number;
  unit: string;
  reported_percent: number | null;
  notes: string | null;
};

export type GhsResultRow = {
  ghs_indicator_code: string;
  name: string;
  total_value: number | null;
  total_is_minimum: boolean;
  male_count: number | null;
  female_count: number | null;
  not_specified_count: number | null;
  sex_breakdown_status: string;
  planned_later: boolean;
  notes: string | null;
  details: {
    code: string;
    detail_type: string;
    label: string;
    value: number | null;
    value_is_minimum: boolean;
    male_count: number | null;
    female_count: number | null;
    unknown_sex_count: number | null;
    sex_breakdown_status: string;
    notes: string | null;
  }[];
};

export type FieldRecordRow = {
  code: string;
  title: string;
  body: string;
  timeframe_label: string | null;
  metrics: Record<string, number>;
  data_level: string;
  source_type: string;
  source_section: string | null;
  province_name: string | null;
  health_zone_name: string | null;
  location_name: string | null;
};

export type SourceGap = { code: string; topic: string; reason: string };

export type CoverageRow = {
  coverage_key: string;
  technical_area_code: string | null;
  health_zone_count: number | null;
  health_zone_names_available: boolean;
  notes: string | null;
  province_name: string | null;
};

export type HealthZoneRow = {
  code: string;
  name: string;
  province_name: string | null;
  province_assignment_status: string;
  notes: string | null;
};

async function from<T>(table: string, select: string, eq?: { column: string; value: string }) {
  let q = supabase.from(table as never).select(select);
  if (eq) q = q.eq(eq.column, eq.value);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as T;
}

export async function loadProgramDataset(periodCode = PERIOD_FY2026_H1) {
  const [
    periods,
    objectives,
    activities,
    indicators,
    results,
    aggregates,
    ghsIndicators,
    ghsResults,
    ghsDetails,
    fieldRecords,
    provinces,
    healthZones,
    locations,
    coverage,
    gaps,
    technicalAreas,
  ] = await Promise.all([
    from<ReportingPeriod[]>("reporting_periods", "code, fiscal_year, period_label, start_date, end_date, dataset_label, methodology"),
    from<ProgramObjective[]>("program_objectives", "code, number, title_fr"),
    from<ProgramActivity[]>("program_activities", "code, objective_code, parent_code, level, title_fr, sort_order"),
    from<{ code: string; name: string; technical_area_code: string }[]>("indicators", "code, name, technical_area_code"),
    from<Record<string, unknown>[]>("indicator_results", "indicator_code,numerator,denominator,reported_percent,comment,data_level,source_section,notes,period_code", { column: "period_code", value: periodCode }),
    from<AggregateResultRow[]>("aggregate_results", "code, technical_area_code, name, value, unit, reported_percent, notes, period_code", { column: "period_code", value: periodCode }),
    from<{ code: string; name: string; sort_order: number }[]>("ghs_indicators", "code, name, sort_order"),
    from<Record<string, unknown>[]>("ghs_results", "*", { column: "period_code", value: periodCode }),
    from<Record<string, unknown>[]>("ghs_result_details", "*", { column: "period_code", value: periodCode }),
    from<Record<string, unknown>[]>("field_records", "*", { column: "period_code", value: periodCode }),
    from<{ id: string; name: string; code: string }[]>("provinces", "id, name, code"),
    from<Record<string, unknown>[]>("health_zones", "code, name, province_id, province_assignment_status, notes"),
    from<{ code: string; name: string }[]>("named_locations", "code, name"),
    from<Record<string, unknown>[]>("period_coverage", "*", { column: "period_code", value: periodCode }),
    from<SourceGap[]>("source_gaps", "code, topic, reason"),
    from<{ code: string; name_en: string; name_fr: string }[]>("technical_areas", "code, name_en, name_fr, sort_order"),
  ]);

  const provinceName = (id: unknown) => provinces.find((p) => p.id === id)?.name ?? null;
  const hzName = (code: unknown) => (healthZones.find((z) => z.code === code) as { name?: string } | undefined)?.name ?? null;
  const locName = (code: unknown) => locations.find((l) => l.code === code)?.name ?? null;
  const indByCode = new Map(indicators.map((i) => [i.code, i]));

  const periodResults = results;
  const indicatorRows: IndicatorResultRow[] = periodResults.map((r) => {
    const ind = indByCode.get(String(r.indicator_code));
    const numerator = r.numerator == null ? null : Number(r.numerator);
    const denominator = r.denominator == null ? null : Number(r.denominator);
    return {
      indicator_code: String(r.indicator_code),
      name: ind?.name ?? String(r.indicator_code),
      technical_area_code: ind?.technical_area_code ?? "",
      numerator,
      denominator,
      reported_percent: r.reported_percent == null ? null : Number(r.reported_percent),
      computed_percent: percentFromParts(numerator, denominator),
      comment: (r.comment as string) || null,
      data_level: String(r.data_level || "Aggregate"),
      source_section: (r.source_section as string) || null,
      notes: (r.notes as string) || null,
    };
  });

  const ghs: GhsResultRow[] = ghsResults
    .map((r) => {
      const meta = ghsIndicators.find((g) => g.code === r.ghs_indicator_code);
      return {
        ghs_indicator_code: String(r.ghs_indicator_code),
        name: meta?.name ?? String(r.ghs_indicator_code),
        total_value: r.total_value == null ? null : Number(r.total_value),
        total_is_minimum: Boolean(r.total_is_minimum),
        male_count: r.male_count == null ? null : Number(r.male_count),
        female_count: r.female_count == null ? null : Number(r.female_count),
        not_specified_count: r.not_specified_count == null ? null : Number(r.not_specified_count),
        sex_breakdown_status: String(r.sex_breakdown_status || "not_provided"),
        planned_later: Boolean(r.planned_later),
        notes: (r.notes as string) || null,
        details: ghsDetails
          .filter((d) => d.ghs_indicator_code === r.ghs_indicator_code)
          .map((d) => ({
            code: String(d.code),
            detail_type: String(d.detail_type),
            label: String(d.label),
            value: d.value == null ? null : Number(d.value),
            value_is_minimum: Boolean(d.value_is_minimum),
            male_count: d.male_count == null ? null : Number(d.male_count),
            female_count: d.female_count == null ? null : Number(d.female_count),
            unknown_sex_count: d.unknown_sex_count == null ? null : Number(d.unknown_sex_count),
            sex_breakdown_status: String(d.sex_breakdown_status || "not_provided"),
            notes: (d.notes as string) || null,
          })),
      };
    })
    .sort((a, b) => {
      const ao = ghsIndicators.find((g) => g.code === a.ghs_indicator_code)?.sort_order ?? 0;
      const bo = ghsIndicators.find((g) => g.code === b.ghs_indicator_code)?.sort_order ?? 0;
      return ao - bo;
    });

  const stories: FieldRecordRow[] = fieldRecords
    .map((f) => ({
      code: String(f.code),
      title: String(f.title),
      body: String(f.body),
      timeframe_label: (f.timeframe_label as string) || null,
      metrics: (f.metrics as Record<string, number>) || {},
      data_level: String(f.data_level),
      source_type: String(f.source_type),
      source_section: (f.source_section as string) || null,
      province_name: provinceName(f.province_id),
      health_zone_name: hzName(f.health_zone_code),
      location_name: locName(f.location_code),
    }));

  const hzRows: HealthZoneRow[] = healthZones.map((z) => ({
    code: String(z.code),
    name: String(z.name),
    province_name: provinceName(z.province_id),
    province_assignment_status: String(z.province_assignment_status),
    notes: (z.notes as string) || null,
  }));

  const coverageRows: CoverageRow[] = coverage
    .map((c) => ({
      coverage_key: String(c.coverage_key),
      technical_area_code: (c.technical_area_code as string) || null,
      health_zone_count: c.health_zone_count == null ? null : Number(c.health_zone_count),
      health_zone_names_available: Boolean(c.health_zone_names_available),
      notes: (c.notes as string) || null,
      province_name: provinceName(c.province_id),
    }));

  return {
    periods,
    period: periods.find((p) => p.code === periodCode) ?? periods[0] ?? null,
    objectives: objectives.sort((a, b) => a.number - b.number),
    activities: activities.sort((a, b) => a.sort_order - b.sort_order),
    technicalAreas,
    indicators: indicatorRows,
    aggregates: aggregates,
    ghs,
    stories,
    healthZones: hzRows,
    coverage: coverageRows,
    gaps,
    provinces,
  };
}
