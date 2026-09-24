-- Part 2: pyramid access (RLS, approvals, duties) — requires manage_provincial_users from 20260924180000.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_blocked BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.consolidation_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, year)
);

CREATE INDEX IF NOT EXISTS idx_consolidation_approvals_period
  ON public.consolidation_approvals (year DESC, month DESC);

ALTER TABLE public.consolidation_approvals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consolidation_period_approved(p_month INT, p_year INT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.consolidation_approvals
    WHERE month = p_month AND year = p_year
  );
$$;

REVOKE EXECUTE ON FUNCTION public.consolidation_period_approved(INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consolidation_period_approved(INT, INT) TO authenticated;

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
          AND r.province_id = public.get_user_province(auth.uid())
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
  OR (
    public.has_role(auth.uid(), 'read_only'::public.app_role)
    AND status = 'validated'::public.report_status
    AND province_id = public.get_user_province(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'province_user'::public.app_role)
    AND province_id = public.get_user_province(auth.uid())
  )
);

DROP POLICY IF EXISTS "read activities scoped" ON public.activities;
CREATE POLICY "read activities scoped" ON public.activities FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.reports r WHERE r.id = activities.report_id AND (
      (
        public.has_role(auth.uid(), 'read_only'::public.app_role)
        AND r.status = 'validated'::public.report_status
        AND r.province_id = public.get_user_province(auth.uid())
      )
      OR (
        public.has_role(auth.uid(), 'province_user'::public.app_role)
        AND r.province_id = public.get_user_province(auth.uid())
      )
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
      (
        public.has_role(auth.uid(), 'read_only'::public.app_role)
        AND r.status = 'validated'::public.report_status
        AND r.province_id = public.get_user_province(auth.uid())
      )
      OR (
        public.has_role(auth.uid(), 'province_user'::public.app_role)
        AND r.province_id = public.get_user_province(auth.uid())
      )
    )
  )
);

DROP POLICY IF EXISTS "read report_photos scoped" ON public.report_photos;
CREATE POLICY "read report_photos scoped"
ON public.report_photos FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_id AND (
      public.has_role(auth.uid(), 'technical_director'::public.app_role)
      OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
      OR (
        public.has_role(auth.uid(), 'read_only'::public.app_role)
        AND r.status = 'validated'::public.report_status
        AND r.province_id = public.get_user_province(auth.uid())
      )
      OR (
        public.has_role(auth.uid(), 'province_user'::public.app_role)
        AND r.province_id = public.get_user_province(auth.uid())
      )
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
        public.has_role(auth.uid(), 'technical_director'::public.app_role)
        OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
        OR (
          public.has_role(auth.uid(), 'read_only'::public.app_role)
          AND r.status = 'validated'::public.report_status
          AND r.province_id = public.get_user_province(auth.uid())
        )
        OR (
          public.has_role(auth.uid(), 'province_user'::public.app_role)
          AND r.province_id = public.get_user_province(auth.uid())
        )
      )
  )
);

DROP POLICY IF EXISTS "read profiles scoped" ON public.profiles;
CREATE POLICY "read profiles scoped"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR (
    public.has_role(auth.uid(), 'province_user'::public.app_role)
    AND province_id = public.get_user_province(auth.uid())
  )
);

DO $$
BEGIN
  IF to_regclass('public.consolidation_summaries') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "national staff read consolidation_summaries" ON public.consolidation_summaries';
    EXECUTE 'DROP POLICY IF EXISTS "director and viewer read consolidation_summaries" ON public.consolidation_summaries';
    EXECUTE $p$
      CREATE POLICY "national staff read consolidation_summaries"
        ON public.consolidation_summaries
        FOR SELECT TO authenticated
        USING (
          public.has_role(auth.uid(), 'technical_director'::public.app_role)
          OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
        )
    $p$;
    EXECUTE 'DROP POLICY IF EXISTS "director insert consolidation_summaries" ON public.consolidation_summaries';
    EXECUTE $p$
      CREATE POLICY "director insert consolidation_summaries"
        ON public.consolidation_summaries
        FOR INSERT TO authenticated
        WITH CHECK (
          public.has_role(auth.uid(), 'technical_director'::public.app_role)
          AND NOT public.consolidation_period_approved(month, year)
        )
    $p$;
    EXECUTE 'DROP POLICY IF EXISTS "director update consolidation_summaries" ON public.consolidation_summaries';
    EXECUTE $p$
      CREATE POLICY "director update consolidation_summaries"
        ON public.consolidation_summaries
        FOR UPDATE TO authenticated
        USING (
          public.has_role(auth.uid(), 'technical_director'::public.app_role)
          AND NOT public.consolidation_period_approved(month, year)
        )
        WITH CHECK (
          public.has_role(auth.uid(), 'technical_director'::public.app_role)
          AND NOT public.consolidation_period_approved(month, year)
        )
    $p$;
    EXECUTE 'DROP POLICY IF EXISTS "director delete consolidation_summaries" ON public.consolidation_summaries';
    EXECUTE $p$
      CREATE POLICY "director delete consolidation_summaries"
        ON public.consolidation_summaries
        FOR DELETE TO authenticated
        USING (
          public.has_role(auth.uid(), 'technical_director'::public.app_role)
          AND NOT public.consolidation_period_approved(month, year)
        )
    $p$;
  END IF;
END $$;

DROP POLICY IF EXISTS "national staff read consolidation_activity_summaries" ON public.consolidation_activity_summaries;
CREATE POLICY "national staff read consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  );

DROP POLICY IF EXISTS "national staff read consolidation_activity_comments" ON public.consolidation_activity_comments;
CREATE POLICY "national staff read consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  );

DROP POLICY IF EXISTS "director read consolidation_approvals" ON public.consolidation_approvals;
CREATE POLICY "director read consolidation_approvals"
  ON public.consolidation_approvals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  );

DROP POLICY IF EXISTS "director insert consolidation_approvals" ON public.consolidation_approvals;
CREATE POLICY "director insert consolidation_approvals"
  ON public.consolidation_approvals
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'technical_director'::public.app_role));

DROP POLICY IF EXISTS "manage_users insert roles" ON public.user_roles;
CREATE POLICY "manage_users insert roles"
  ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
    OR public.has_duty(auth.uid(), 'manage_provincial_users'::public.app_duty)
  );

DROP POLICY IF EXISTS "manage_users update roles" ON public.user_roles;
CREATE POLICY "manage_users update roles"
  ON public.user_roles
  FOR UPDATE TO authenticated
  USING (
    public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
    OR public.has_duty(auth.uid(), 'manage_provincial_users'::public.app_duty)
  )
  WITH CHECK (
    public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
    OR public.has_duty(auth.uid(), 'manage_provincial_users'::public.app_duty)
  );

DROP POLICY IF EXISTS "manage_users delete roles" ON public.user_roles;
CREATE POLICY "manage_users delete roles"
  ON public.user_roles
  FOR DELETE TO authenticated
  USING (
    public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
    OR public.has_duty(auth.uid(), 'manage_provincial_users'::public.app_duty)
  );

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
      (_user_id, 'comment_consolidation'),
      (_user_id, 'write_national_summary'),
      (_user_id, 'manage_users'),
      (_user_id, 'manage_provinces');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'technical_assistant'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'validate_reports'),
      (_user_id, 'comment_consolidation'),
      (_user_id, 'manage_provincial_users');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'read_only'::public.app_role THEN
    UPDATE public.profiles SET access_level = 'view' WHERE id = _user_id;
  END IF;
END;
$$;

INSERT INTO public.user_duties (user_id, duty)
SELECT ur.user_id, 'manage_provincial_users'::public.app_duty
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'technical_assistant'::public.app_role
  AND p.access_level = 'edit'::public.access_level
ON CONFLICT (user_id, duty) DO NOTHING;

DO $$
DECLARE
  rid UUID;
BEGIN
  FOR rid IN SELECT user_id FROM public.user_roles WHERE role = 'technical_assistant'::public.app_role LOOP
    PERFORM public.seed_default_duties_for_user(rid);
  END LOOP;
END $$;
