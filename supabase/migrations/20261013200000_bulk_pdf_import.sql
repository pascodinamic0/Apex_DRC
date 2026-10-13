-- Privileged bulk PDF import: profile grant + batch tables + private storage

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bulk_import_granted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bulk_import_granted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS bulk_import_granted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.user_can_bulk_import(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND p.access_blocked = false
      AND p.access_level = 'edit'::access_level
      AND (
        public.has_role(_user_id, 'technical_director'::app_role)
        OR p.bulk_import_granted = true
      )
  );
$$;

CREATE TYPE public.import_file_status AS ENUM (
  'pending',
  'extracting',
  'ready',
  'failed',
  'applied'
);

CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.import_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  file_size INT NOT NULL DEFAULT 0,
  status public.import_file_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  detected_province_id UUID REFERENCES public.provinces(id),
  detected_month INT CHECK (detected_month IS NULL OR detected_month BETWEEN 1 AND 12),
  detected_year INT,
  extracted JSONB,
  applied_report_id UUID REFERENCES public.reports(id),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_files_batch_id_idx ON public.import_files (batch_id);
CREATE INDEX IF NOT EXISTS import_batches_created_by_idx ON public.import_batches (created_by, created_at DESC);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bulk import batches own" ON public.import_batches;
CREATE POLICY "bulk import batches own"
ON public.import_batches FOR ALL TO authenticated
USING (public.user_can_bulk_import(auth.uid()) AND created_by = auth.uid())
WITH CHECK (public.user_can_bulk_import(auth.uid()) AND created_by = auth.uid());

DROP POLICY IF EXISTS "bulk import files via batch" ON public.import_files;
CREATE POLICY "bulk import files via batch"
ON public.import_files FOR ALL TO authenticated
USING (
  public.user_can_bulk_import(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.import_batches b
    WHERE b.id = batch_id AND b.created_by = auth.uid()
  )
)
WITH CHECK (
  public.user_can_bulk_import(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.import_batches b
    WHERE b.id = batch_id AND b.created_by = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-imports',
  'report-imports',
  false,
  52428800,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "read report-imports objects" ON storage.objects;
CREATE POLICY "read report-imports objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-imports'
  AND public.user_can_bulk_import(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "insert report-imports objects" ON storage.objects;
CREATE POLICY "insert report-imports objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-imports'
  AND public.user_can_bulk_import(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "delete report-imports objects" ON storage.objects;
CREATE POLICY "delete report-imports objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'report-imports'
  AND public.user_can_bulk_import(auth.uid())
  AND (storage.foldername(name))[1] = auth.uid()::text
);
