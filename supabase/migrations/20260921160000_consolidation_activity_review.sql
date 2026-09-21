-- Per-activity national AI summaries + AT/DT comments on consolidation

CREATE TABLE IF NOT EXISTS public.consolidation_activity_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('fr', 'en')),
  activity_code TEXT NOT NULL,
  ai_content TEXT NOT NULL DEFAULT '',
  selected TEXT NOT NULL DEFAULT 'original' CHECK (selected IN ('original', 'ai')),
  model TEXT,
  generated_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year, lang, activity_code)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_activity_summaries_period
  ON public.consolidation_activity_summaries (year DESC, month DESC, activity_code);

CREATE TRIGGER trg_consolidation_activity_summaries_updated
  BEFORE UPDATE ON public.consolidation_activity_summaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.consolidation_activity_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "director and viewer read consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'read_only'::public.app_role)
  );

CREATE POLICY "director insert consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'technical_director'::public.app_role));

CREATE POLICY "director update consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'technical_director'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'technical_director'::public.app_role));

CREATE TABLE IF NOT EXISTS public.consolidation_activity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  activity_code TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consolidation_activity_comments_lookup
  ON public.consolidation_activity_comments (year DESC, month DESC, activity_code, created_at);

ALTER TABLE public.consolidation_activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "director and viewer read consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'read_only'::public.app_role)
  );

CREATE POLICY "director and viewer insert consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'technical_director'::public.app_role)
      OR public.has_role(auth.uid(), 'read_only'::public.app_role)
    )
  );
