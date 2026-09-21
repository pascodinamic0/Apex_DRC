-- DT-reviewed AI summaries for national consolidation (additive)

CREATE TABLE IF NOT EXISTS public.consolidation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('fr', 'en')),
  content TEXT NOT NULL DEFAULT '',
  model TEXT,
  source_report_ids UUID[] NOT NULL DEFAULT '{}'::UUID[],
  generated_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year, lang)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_summaries_period
  ON public.consolidation_summaries (year DESC, month DESC);

CREATE TRIGGER trg_consolidation_summaries_updated
  BEFORE UPDATE ON public.consolidation_summaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.consolidation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "director and viewer read consolidation_summaries"
  ON public.consolidation_summaries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'read_only'::public.app_role)
  );

CREATE POLICY "director insert consolidation_summaries"
  ON public.consolidation_summaries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'technical_director'::public.app_role));

CREATE POLICY "director update consolidation_summaries"
  ON public.consolidation_summaries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'technical_director'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'technical_director'::public.app_role));

CREATE POLICY "director delete consolidation_summaries"
  ON public.consolidation_summaries
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'technical_director'::public.app_role));
