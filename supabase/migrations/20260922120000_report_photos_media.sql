-- Implementation photos (Annex B) attached to provincial monthly reports

CREATE TABLE IF NOT EXISTS public.report_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INT NOT NULL,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_photos_report_id_idx
  ON public.report_photos (report_id, sort_order, created_at);

ALTER TABLE public.report_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read report_photos scoped" ON public.report_photos;
CREATE POLICY "read report_photos scoped"
ON public.report_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_id AND (
      public.has_role(auth.uid(), 'technical_director'::app_role)
      OR (public.has_role(auth.uid(), 'read_only'::app_role) AND r.status = 'validated'::report_status)
      OR (public.has_role(auth.uid(), 'province_user'::app_role) AND r.province_id = public.get_user_province(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "province write report_photos" ON public.report_photos;
CREATE POLICY "province write report_photos"
ON public.report_photos FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status <> 'validated'::report_status
      AND public.has_role(auth.uid(), 'province_user')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status <> 'validated'::report_status
      AND public.has_role(auth.uid(), 'province_user')
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-photos',
  'report-photos',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "read report-photos objects" ON storage.objects;
CREATE POLICY "read report-photos objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-photos'
  AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND (
        public.has_role(auth.uid(), 'technical_director'::app_role)
        OR (public.has_role(auth.uid(), 'read_only'::app_role) AND r.status = 'validated'::report_status)
        OR (public.has_role(auth.uid(), 'province_user'::app_role) AND r.province_id = public.get_user_province(auth.uid()))
      )
  )
);

DROP POLICY IF EXISTS "insert report-photos objects" ON storage.objects;
CREATE POLICY "insert report-photos objects"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'report-photos'
  AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status <> 'validated'::report_status
      AND public.has_role(auth.uid(), 'province_user')
  )
);

DROP POLICY IF EXISTS "update report-photos objects" ON storage.objects;
CREATE POLICY "update report-photos objects"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'report-photos'
  AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status <> 'validated'::report_status
      AND public.has_role(auth.uid(), 'province_user')
  )
)
WITH CHECK (
  bucket_id = 'report-photos'
  AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status <> 'validated'::report_status
      AND public.has_role(auth.uid(), 'province_user')
  )
);

DROP POLICY IF EXISTS "delete report-photos objects" ON storage.objects;
CREATE POLICY "delete report-photos objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'report-photos'
  AND EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id::text = (storage.foldername(name))[1]
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status <> 'validated'::report_status
      AND public.has_role(auth.uid(), 'province_user')
  )
);
