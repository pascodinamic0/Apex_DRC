-- Per-user duties and edit/view access level (orthogonal to app_role seat)

CREATE TYPE public.access_level AS ENUM ('edit', 'view');

CREATE TYPE public.app_duty AS ENUM (
  'edit_reports',
  'submit_reports',
  'validate_reports',
  'comment_consolidation',
  'write_national_summary',
  'manage_users',
  'manage_provinces'
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_level public.access_level NOT NULL DEFAULT 'edit';

CREATE TABLE IF NOT EXISTS public.user_duties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duty public.app_duty NOT NULL,
  UNIQUE (user_id, duty)
);

CREATE INDEX IF NOT EXISTS idx_user_duties_user ON public.user_duties (user_id);

ALTER TABLE public.user_duties ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_duty(_user_id UUID, _duty public.app_duty)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_duties ud
    JOIN public.profiles p ON p.id = ud.user_id
    WHERE ud.user_id = _user_id
      AND ud.duty = _duty
      AND p.access_level = 'edit'::public.access_level
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_duty(UUID, public.app_duty) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_duty(UUID, public.app_duty) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_default_duties_for_user(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.app_role;
BEGIN
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
  ELSIF user_role = 'technical_director'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'validate_reports'),
      (_user_id, 'comment_consolidation'),
      (_user_id, 'write_national_summary'),
      (_user_id, 'manage_users'),
      (_user_id, 'manage_provinces');
  ELSIF user_role = 'read_only'::public.app_role THEN
    INSERT INTO public.user_duties (user_id, duty) VALUES
      (_user_id, 'comment_consolidation');
  END IF;
END;
$$;

-- Backfill duties for existing users from their current role
INSERT INTO public.user_duties (user_id, duty)
SELECT ur.user_id, d.duty
FROM public.user_roles ur
CROSS JOIN LATERAL (
  SELECT unnest(
    CASE ur.role
      WHEN 'province_user'::public.app_role THEN
        ARRAY['edit_reports', 'submit_reports']::public.app_duty[]
      WHEN 'technical_director'::public.app_role THEN
        ARRAY[
          'validate_reports',
          'comment_consolidation',
          'write_national_summary',
          'manage_users',
          'manage_provinces'
        ]::public.app_duty[]
      WHEN 'read_only'::public.app_role THEN
        ARRAY['comment_consolidation']::public.app_duty[]
    END
  ) AS duty
) d
ON CONFLICT (user_id, duty) DO NOTHING;

-- user_duties policies
CREATE POLICY "read own duties"
  ON public.user_duties
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
  );

CREATE POLICY "manage_users insert duties"
  ON public.user_duties
  FOR INSERT TO authenticated
  WITH CHECK (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

CREATE POLICY "manage_users update duties"
  ON public.user_duties
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

CREATE POLICY "manage_users delete duties"
  ON public.user_duties
  FOR DELETE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

-- Replace role-only admin gates with manage_users duty
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles"
  ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
  );

DROP POLICY IF EXISTS "director update profiles" ON public.profiles;
CREATE POLICY "manage_users update profiles"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "director delete profiles" ON public.profiles;
CREATE POLICY "manage_users delete profiles"
  ON public.profiles
  FOR DELETE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "director insert roles" ON public.user_roles;
CREATE POLICY "manage_users insert roles"
  ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "director update roles" ON public.user_roles;
CREATE POLICY "manage_users update roles"
  ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "director delete roles" ON public.user_roles;
CREATE POLICY "manage_users delete roles"
  ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "director insert provinces" ON public.provinces;
DROP POLICY IF EXISTS "director update provinces" ON public.provinces;
DROP POLICY IF EXISTS "director delete provinces" ON public.provinces;

CREATE POLICY "manage_provinces insert provinces"
  ON public.provinces
  FOR INSERT TO authenticated
  WITH CHECK (public.has_duty(auth.uid(), 'manage_provinces'::public.app_duty));

CREATE POLICY "manage_provinces update provinces"
  ON public.provinces
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_provinces'::public.app_duty));

CREATE POLICY "manage_provinces delete provinces"
  ON public.provinces
  FOR DELETE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_provinces'::public.app_duty));

-- Province report writes require edit_reports duty
DROP POLICY IF EXISTS "province user create own report" ON public.reports;
CREATE POLICY "province user create own report"
  ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'province_user'::public.app_role)
    AND public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND province_id = public.get_user_province(auth.uid())
    AND status = 'draft'::public.report_status
  );

DROP POLICY IF EXISTS "province user update own report" ON public.reports;
CREATE POLICY "province user update own report"
  ON public.reports
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'province_user'::public.app_role)
    AND public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND province_id = public.get_user_province(auth.uid())
    AND status IN ('draft', 'submitted', 'returned', 'in_review')
  );

DROP POLICY IF EXISTS "director update reports" ON public.reports;
CREATE POLICY "director update reports"
  ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty));

DROP POLICY IF EXISTS "province user write activities" ON public.activities;
CREATE POLICY "province user write activities"
  ON public.activities
  FOR ALL TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "province user write narratives" ON public.narratives;
CREATE POLICY "province user write narratives"
  ON public.narratives
  FOR ALL TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "province user write drafts" ON public.report_drafts;
CREATE POLICY "province user write drafts"
  ON public.report_drafts
  FOR ALL TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "province write achievement_summary" ON public.achievement_summary;
CREATE POLICY "province write achievement_summary"
  ON public.achievement_summary
  FOR ALL TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "province write activity_responses" ON public.activity_responses;
CREATE POLICY "province write activity_responses"
  ON public.activity_responses
  FOR ALL TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  )
  WITH CHECK (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft', 'submitted', 'returned', 'in_review')
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "director write achievement_summary" ON public.achievement_summary;
CREATE POLICY "director write achievement_summary"
  ON public.achievement_summary
  FOR ALL TO authenticated
  USING (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty));

DROP POLICY IF EXISTS "director write activity_responses" ON public.activity_responses;
CREATE POLICY "director write activity_responses"
  ON public.activity_responses
  FOR ALL TO authenticated
  USING (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty));

DROP POLICY IF EXISTS "director insert section_approvals" ON public.section_approvals;
CREATE POLICY "director insert section_approvals"
  ON public.section_approvals
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_duty(auth.uid(), 'validate_reports'::public.app_duty)
    AND approved_by = auth.uid()
  );

DROP POLICY IF EXISTS "insert report_comments scoped" ON public.report_comments;
CREATE POLICY "insert report_comments scoped"
  ON public.report_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_duty(auth.uid(), 'validate_reports'::public.app_duty)
      OR (
        public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
        AND EXISTS (
          SELECT 1
          FROM public.reports r
          WHERE r.id = report_comments.report_id
            AND public.has_role(auth.uid(), 'province_user'::public.app_role)
            AND r.province_id = public.get_user_province(auth.uid())
            AND r.status IN ('submitted', 'in_review', 'returned')
        )
      )
    )
  );

DROP POLICY IF EXISTS "province resolve own report_comments" ON public.report_comments;
CREATE POLICY "province resolve own report_comments"
  ON public.report_comments
  FOR UPDATE TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

-- Consolidation writes
DROP POLICY IF EXISTS "director insert consolidation_summaries" ON public.consolidation_summaries;
DROP POLICY IF EXISTS "director update consolidation_summaries" ON public.consolidation_summaries;
DROP POLICY IF EXISTS "director delete consolidation_summaries" ON public.consolidation_summaries;

CREATE POLICY "write_national_summary insert consolidation_summaries"
  ON public.consolidation_summaries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty));

CREATE POLICY "write_national_summary update consolidation_summaries"
  ON public.consolidation_summaries
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty));

CREATE POLICY "write_national_summary delete consolidation_summaries"
  ON public.consolidation_summaries
  FOR DELETE TO authenticated
  USING (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty));

DROP POLICY IF EXISTS "director insert consolidation_activity_summaries" ON public.consolidation_activity_summaries;
DROP POLICY IF EXISTS "director update consolidation_activity_summaries" ON public.consolidation_activity_summaries;

CREATE POLICY "write_national_summary insert consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty));

CREATE POLICY "write_national_summary update consolidation_activity_summaries"
  ON public.consolidation_activity_summaries
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'write_national_summary'::public.app_duty));

DROP POLICY IF EXISTS "director and viewer insert consolidation_activity_comments" ON public.consolidation_activity_comments;
CREATE POLICY "comment_consolidation insert consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.has_duty(auth.uid(), 'comment_consolidation'::public.app_duty)
  );

-- Notification RPC: DT actions require validate_reports
CREATE OR REPLACE FUNCTION public.create_notifications(
  p_user_ids UUID[],
  p_type public.notification_type,
  p_report_id UUID,
  p_title TEXT,
  p_body TEXT DEFAULT NULL,
  p_section_key TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  report_row public.reports%ROWTYPE;
  requested_user_ids UUID[];
  staff_ids UUID[];
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  IF caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT array_agg(DISTINCT uid)
  INTO requested_user_ids
  FROM unnest(p_user_ids) AS uid
  WHERE uid IS NOT NULL;

  IF requested_user_ids IS NULL OR array_length(requested_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  IF p_report_id IS NOT NULL THEN
    SELECT *
    INTO report_row
    FROM public.reports
    WHERE id = p_report_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Report not found';
    END IF;
  END IF;

  IF public.has_duty(caller, 'validate_reports'::public.app_duty) THEN
    INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
    SELECT uid, p_type, p_report_id, p_title, p_body, p_section_key
    FROM unnest(requested_user_ids) AS uid;
    RETURN;
  END IF;

  IF public.has_role(caller, 'province_user'::public.app_role)
     AND public.has_duty(caller, 'submit_reports'::public.app_duty) THEN
    IF p_report_id IS NULL
      OR report_row.province_id <> public.get_user_province(caller)
      OR p_type NOT IN ('report_submitted'::public.notification_type, 'comment_added'::public.notification_type)
    THEN
      RAISE EXCEPTION 'Not allowed to create these notifications';
    END IF;

    staff_ids := public.get_staff_notifier_ids();

    IF EXISTS (
      SELECT 1
      FROM unnest(requested_user_ids) AS requested(uid)
      WHERE NOT (requested.uid = ANY(staff_ids))
    ) THEN
      RAISE EXCEPTION 'Invalid notification recipients';
    END IF;

    INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
    SELECT uid, p_type, p_report_id, p_title, p_body, p_section_key
    FROM unnest(requested_user_ids) AS uid;
    RETURN;
  END IF;

  RAISE EXCEPTION 'Not allowed to create notifications';
END;
$$;
