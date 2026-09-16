-- EpiC DRC source-based program data layer (Docs / FY2026 H1)
-- Idempotent schema only. Seed via: bun run seed:epic-source

CREATE TABLE IF NOT EXISTS public.activity_catalog (
  code TEXT PRIMARY KEY,
  objective INT NOT NULL CHECK (objective BETWEEN 1 AND 3),
  parent_code TEXT,
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE public.activity_catalog
  ADD COLUMN IF NOT EXISTS is_source_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_document_code TEXT;

CREATE TABLE IF NOT EXISTS public.source_documents (
  code TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.programs (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS public.program_objectives (
  code TEXT PRIMARY KEY,
  program_code TEXT NOT NULL REFERENCES public.programs(code) ON DELETE CASCADE,
  number INT NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 3),
  title_fr TEXT NOT NULL,
  title_en TEXT,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.program_activities (
  code TEXT PRIMARY KEY,
  objective_code TEXT NOT NULL REFERENCES public.program_objectives(code) ON DELETE CASCADE,
  parent_code TEXT REFERENCES public.program_activities(code) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('activity', 'sub_activity')),
  title_fr TEXT NOT NULL,
  title_en TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.technical_areas (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.reporting_periods (
  code TEXT PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  period_label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  dataset_label TEXT NOT NULL,
  methodology TEXT,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (fiscal_year, period_label)
);

CREATE TABLE IF NOT EXISTS public.period_coverage (
  coverage_key TEXT PRIMARY KEY,
  period_code TEXT NOT NULL REFERENCES public.reporting_periods(code) ON DELETE CASCADE,
  technical_area_code TEXT REFERENCES public.technical_areas(code),
  province_id UUID REFERENCES public.provinces(id),
  health_zone_count INT,
  health_zone_names_available BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Aggregate'
);

CREATE TABLE IF NOT EXISTS public.health_zones (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  province_id UUID REFERENCES public.provinces(id),
  province_assignment_status TEXT NOT NULL DEFAULT 'verified',
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.named_locations (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location_type TEXT NOT NULL,
  province_id UUID REFERENCES public.provinces(id),
  health_zone_code TEXT REFERENCES public.health_zones(code),
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.indicators (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  technical_area_code TEXT NOT NULL REFERENCES public.technical_areas(code),
  result_kind TEXT NOT NULL CHECK (result_kind IN ('percentage', 'count')),
  numerator_label TEXT,
  denominator_label TEXT,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.indicator_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code TEXT NOT NULL REFERENCES public.indicators(code) ON DELETE CASCADE,
  period_code TEXT NOT NULL REFERENCES public.reporting_periods(code) ON DELETE CASCADE,
  geography_key TEXT NOT NULL DEFAULT 'AGGREGATE',
  province_id UUID REFERENCES public.provinces(id),
  health_zone_code TEXT REFERENCES public.health_zones(code),
  numerator NUMERIC,
  denominator NUMERIC,
  reported_percent NUMERIC,
  comment TEXT,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_reporting_period TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Aggregate',
  notes TEXT,
  UNIQUE (indicator_code, period_code, geography_key)
);

CREATE TABLE IF NOT EXISTS public.aggregate_results (
  code TEXT PRIMARY KEY,
  period_code TEXT NOT NULL REFERENCES public.reporting_periods(code) ON DELETE CASCADE,
  technical_area_code TEXT NOT NULL REFERENCES public.technical_areas(code),
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  related_indicator_code TEXT REFERENCES public.indicators(code),
  reported_percent NUMERIC,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_reporting_period TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Aggregate',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.ghs_indicators (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.ghs_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghs_indicator_code TEXT NOT NULL REFERENCES public.ghs_indicators(code) ON DELETE CASCADE,
  period_code TEXT NOT NULL REFERENCES public.reporting_periods(code) ON DELETE CASCADE,
  total_value NUMERIC,
  total_is_minimum BOOLEAN NOT NULL DEFAULT false,
  male_count NUMERIC,
  female_count NUMERIC,
  not_specified_count NUMERIC,
  sex_breakdown_status TEXT NOT NULL DEFAULT 'not_provided',
  planned_later BOOLEAN NOT NULL DEFAULT false,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_reporting_period TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Aggregate',
  notes TEXT,
  UNIQUE (ghs_indicator_code, period_code)
);

CREATE TABLE IF NOT EXISTS public.ghs_result_details (
  code TEXT PRIMARY KEY,
  ghs_indicator_code TEXT NOT NULL REFERENCES public.ghs_indicators(code) ON DELETE CASCADE,
  period_code TEXT NOT NULL REFERENCES public.reporting_periods(code) ON DELETE CASCADE,
  detail_type TEXT NOT NULL,
  label TEXT NOT NULL,
  value NUMERIC,
  value_is_minimum BOOLEAN NOT NULL DEFAULT false,
  male_count NUMERIC,
  female_count NUMERIC,
  unknown_sex_count NUMERIC,
  sex_breakdown_status TEXT NOT NULL DEFAULT 'not_provided',
  location_code TEXT REFERENCES public.named_locations(code),
  health_zone_code TEXT REFERENCES public.health_zones(code),
  province_id UUID REFERENCES public.provinces(id),
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_type TEXT NOT NULL DEFAULT 'Official source document',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Aggregate',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.field_records (
  code TEXT PRIMARY KEY,
  record_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  period_code TEXT REFERENCES public.reporting_periods(code),
  province_id UUID REFERENCES public.provinces(id),
  health_zone_code TEXT REFERENCES public.health_zones(code),
  location_code TEXT REFERENCES public.named_locations(code),
  timeframe_label TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_section TEXT,
  source_reporting_period TEXT,
  source_type TEXT NOT NULL DEFAULT 'Source-derived/narrative',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Narrative case',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS public.source_gaps (
  code TEXT PRIMARY KEY,
  topic TEXT NOT NULL,
  reason TEXT NOT NULL,
  source_document_code TEXT REFERENCES public.source_documents(code),
  source_type TEXT NOT NULL DEFAULT 'Not available in source data',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  data_level TEXT NOT NULL DEFAULT 'Not available'
);

CREATE OR REPLACE VIEW public.indicator_results_computed
WITH (security_invoker = true) AS
SELECT
  r.*,
  CASE
    WHEN r.numerator IS NOT NULL AND r.denominator IS NOT NULL AND r.denominator <> 0
      THEN ROUND((r.numerator / r.denominator) * 100, 1)
    ELSE NULL
  END AS computed_percent
FROM public.indicator_results r;

ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technical_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.period_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.named_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicator_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregate_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghs_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghs_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghs_result_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_gaps ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.source_documents, public.programs, public.program_objectives, public.program_activities,
  public.technical_areas, public.reporting_periods, public.period_coverage, public.health_zones,
  public.named_locations, public.indicators, public.indicator_results, public.aggregate_results,
  public.ghs_indicators, public.ghs_results, public.ghs_result_details, public.field_records,
  public.source_gaps TO authenticated;
GRANT SELECT ON public.indicator_results_computed TO authenticated;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'source_documents','programs','program_objectives','program_activities','technical_areas',
    'reporting_periods','period_coverage','health_zones','named_locations','indicators',
    'indicator_results','aggregate_results','ghs_indicators','ghs_results','ghs_result_details',
    'field_records','source_gaps'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth read ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',
      'auth read ' || t,
      t
    );
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'director write ' || t, t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), %L)) WITH CHECK (public.has_role(auth.uid(), %L))',
      'director write ' || t,
      t,
      'technical_director',
      'technical_director'
    );
  END LOOP;
END $$;
