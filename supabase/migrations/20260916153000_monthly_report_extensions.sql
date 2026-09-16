-- Monthly provincial report extensions used by dashboard/desk (idempotent)

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submitted_by_name TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submitter_function TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS submission_deadline DATE;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS source_document_code TEXT REFERENCES public.source_documents(code);

CREATE TABLE IF NOT EXISTS public.achievement_summary (
  report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  total_planned INT NOT NULL DEFAULT 0,
  finalized_approved INT NOT NULL DEFAULT 0,
  finalized_no_report INT NOT NULL DEFAULT 0,
  in_progress INT NOT NULL DEFAULT 0,
  trigger_approved INT NOT NULL DEFAULT 0,
  not_realized INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  catalog_code TEXT NOT NULL REFERENCES public.activity_catalog(code),
  realized TEXT DEFAULT '',
  progress TEXT DEFAULT '',
  challenges TEXT DEFAULT '',
  solutions TEXT DEFAULT '',
  priorities TEXT DEFAULT '',
  partners TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, catalog_code)
);

ALTER TABLE public.achievement_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_responses ENABLE ROW LEVEL SECURITY;
