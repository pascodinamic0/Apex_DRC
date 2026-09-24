-- Rank: DT (superior) → AT → CP → Viewer.
-- AT writes national activity comments. Viewers have no write duties.

CREATE OR REPLACE FUNCTION public.can_read_report_content(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reports r
    WHERE r.id = p_report_id
      AND (
        public.has_role(auth.uid(), 'technical_director'::public.app_role)
        OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
        OR (
          public.has_role(auth.uid(), 'read_only'::public.app_role)
          AND r.status = 'validated'::public.report_status
        )
        OR (
          public.has_role(auth.uid(), 'province_user'::public.app_role)
          AND r.province_id = public.get_user_province(auth.uid())
        )
      )
  );
$$;

DROP POLICY IF EXISTS "read reports scoped" ON public.reports;
CREATE POLICY "read reports scoped" ON public.reports FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR (public.has_role(auth.uid(), 'read_only'::public.app_role) AND status = 'validated'::public.report_status)
  OR (public.has_role(auth.uid(), 'province_user'::public.app_role) AND province_id = public.get_user_province(auth.uid()))
);

DROP POLICY IF EXISTS "read activities scoped" ON public.activities;
CREATE POLICY "read activities scoped" ON public.activities FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.reports r WHERE r.id = activities.report_id AND (
      (public.has_role(auth.uid(), 'read_only'::public.app_role) AND r.status = 'validated'::public.report_status)
      OR (public.has_role(auth.uid(), 'province_user'::public.app_role) AND r.province_id = public.get_user_province(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "read narratives scoped" ON public.narratives;
CREATE POLICY "read narratives scoped" ON public.narratives FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.reports r WHERE r.id = narratives.report_id AND (
      (public.has_role(auth.uid(), 'read_only'::public.app_role) AND r.status = 'validated'::public.report_status)
      OR (public.has_role(auth.uid(), 'province_user'::public.app_role) AND r.province_id = public.get_user_province(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "read drafts scoped" ON public.report_drafts;
CREATE POLICY "read drafts scoped"
ON public.report_drafts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_drafts.report_id
      AND public.has_role(auth.uid(), 'province_user'::public.app_role)
      AND r.province_id = public.get_user_province(auth.uid())
  )
);

DROP POLICY IF EXISTS "read profiles scoped" ON public.profiles;
CREATE POLICY "read profiles scoped"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR public.has_role(auth.uid(), 'read_only'::public.app_role)
  OR (public.has_role(auth.uid(), 'province_user'::public.app_role)
      AND province_id = public.get_user_province(auth.uid()))
);

DROP POLICY IF EXISTS "read report_photos scoped" ON public.report_photos;
CREATE POLICY "read report_photos scoped"
ON public.report_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_id AND (
      public.has_role(auth.uid(), 'technical_director'::app_role)
      OR public.has_role(auth.uid(), 'technical_assistant'::app_role)
      OR (public.has_role(auth.uid(), 'read_only'::app_role) AND r.status = 'validated'::report_status)
      OR (public.has_role(auth.uid(), 'province_user'::app_role) AND r.province_id = public.get_user_province(auth.uid()))
    )
  )
);

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
        OR public.has_role(auth.uid(), 'technical_assistant'::app_role)
        OR (public.has_role(auth.uid(), 'read_only'::app_role) AND r.status = 'validated'::report_status)
        OR (public.has_role(auth.uid(), 'province_user'::app_role) AND r.province_id = public.get_user_province(auth.uid()))
      )
  )
);

DO $$
BEGIN
  IF to_regclass('public.consolidation_summaries') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE 'DROP POLICY IF EXISTS "director and viewer read consolidation_summaries" ON public.consolidation_summaries';
  EXECUTE $p$
    CREATE POLICY "national staff read consolidation_summaries"
      ON public.consolidation_summaries
      FOR SELECT TO authenticated
      USING (
        public.has_role(auth.uid(), 'technical_director'::public.app_role)
        OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
        OR public.has_role(auth.uid(), 'read_only'::public.app_role)
      )
  $p$;
END $$;

DROP POLICY IF EXISTS "director and viewer read consolidation_activity_summaries" ON public.consolidation_activity_summaries;
CREATE POLICY "national staff read consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
    OR public.has_role(auth.uid(), 'read_only'::public.app_role)
  );

DROP POLICY IF EXISTS "director and viewer insert consolidation_activity_comments" ON public.consolidation_activity_comments;
DROP POLICY IF EXISTS "comment_consolidation insert consolidation_activity_comments" ON public.consolidation_activity_comments;
CREATE POLICY "comment_consolidation insert consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'technical_director'::public.app_role)
      OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
    )
  );
DROP POLICY IF EXISTS "director and viewer read consolidation_activity_comments" ON public.consolidation_activity_comments;
CREATE POLICY "national staff read consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
    OR public.has_role(auth.uid(), 'read_only'::public.app_role)
  );

CREATE OR REPLACE FUNCTION public.get_staff_notifier_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
  FROM public.user_roles
  WHERE role IN (
    'technical_director'::public.app_role,
    'technical_assistant'::public.app_role
  );
$$;

CREATE OR REPLACE FUNCTION public.seed_default_duties_for_user(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
  IF to_regclass('public.user_duties') IS NULL THEN
    RETURN;
  END IF;

  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;

  IF user_role IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.user_duties WHERE user_id = _user_id;

  IF user_role = 'province_user'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'edit_reports'),
      (_user_id, 'submit_reports');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'technical_director'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'validate_reports'),
      (_user_id, 'comment_consolidation'),
      (_user_id, 'write_national_summary'),
      (_user_id, 'manage_users'),
      (_user_id, 'manage_provinces');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'technical_assistant'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'comment_consolidation');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'read_only'::public.app_role THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'access_level'
    ) THEN
      UPDATE public.profiles SET access_level = 'view' WHERE id = _user_id;
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  local_part TEXT;
  pv_id UUID;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  local_part := lower(split_part(NEW.email, '@', 1));

  IF local_part = 'director' THEN
    assigned_role := 'technical_director';
  ELSIF local_part IN ('at', 'assistant') THEN
    assigned_role := 'technical_assistant';
  ELSIF local_part = 'viewer' THEN
    assigned_role := 'read_only';
  ELSE
    assigned_role := 'province_user';
    SELECT id INTO pv_id FROM public.provinces
    WHERE lower(code) = local_part
       OR lower(replace(replace(name,' ','-'),'ï','i')) = local_part
       OR lower(split_part(name,' ',1)) = local_part
    LIMIT 1;
    IF pv_id IS NOT NULL THEN
      UPDATE public.profiles SET province_id = pv_id WHERE id = NEW.id;
    END IF;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM public.seed_default_duties_for_user(NEW.id);

  RETURN NEW;
END $$;

-- Promote existing AT accounts off read_only.
UPDATE public.user_roles ur
SET role = 'technical_assistant'::public.app_role
WHERE ur.role = 'read_only'::public.app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ur.user_id AND lower(COALESCE(p.email, '')) = 'at@epic.cd'
  );

DO $$
DECLARE
  rid UUID;
BEGIN
  IF to_regclass('public.user_duties') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'access_level'
     )
  THEN
    UPDATE public.user_roles ur
    SET role = 'technical_assistant'::public.app_role
    WHERE ur.role = 'read_only'::public.app_role
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = ur.user_id AND p.access_level = 'edit'::public.access_level
      )
      AND EXISTS (
        SELECT 1 FROM public.user_duties ud
        WHERE ud.user_id = ur.user_id AND ud.duty = 'comment_consolidation'::public.app_duty
      );
  END IF;

  FOR rid IN SELECT user_id FROM public.user_roles WHERE role = 'technical_assistant'::public.app_role LOOP
    PERFORM public.seed_default_duties_for_user(rid);
  END LOOP;
  FOR rid IN SELECT user_id FROM public.user_roles WHERE role = 'read_only'::public.app_role LOOP
    PERFORM public.seed_default_duties_for_user(rid);
  END LOOP;
END $$;
