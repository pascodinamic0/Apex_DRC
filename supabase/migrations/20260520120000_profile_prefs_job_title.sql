-- Profile preferences and DT display title (TDR compliance)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_lang TEXT CHECK (preferred_lang IN ('fr', 'en')),
  ADD COLUMN IF NOT EXISTS job_title TEXT;
