-- =============================================================================
-- ONE-SHOT CATCH-UP (idempotent — safe to re-run in Supabase SQL Editor)
-- Brings an older EPIC DB up to: workflow statuses + duties + AT-only validation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Enum values (must exist before policies reference them)
-- ---------------------------------------------------------------------------
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'returned';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'technical_assistant';

DO $$ BEGIN
  ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_smne';
  ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'priorities_objective_1';
  ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'success_smne_vaccination';
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2) Duties types + table
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.access_level AS ENUM ('edit', 'view');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.app_duty AS ENUM (
    'edit_reports',
    'submit_reports',
    'validate_reports',
    'comment_consolidation',
    'write_national_summary',
    'manage_users',
    'manage_provinces'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- ---------------------------------------------------------------------------
-- 3) Workflow columns + core review tables (skip if already present)
-- ---------------------------------------------------------------------------
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS submitter_function TEXT,
  ADD COLUMN IF NOT EXISTS submission_deadline DATE,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

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

CREATE TABLE IF NOT EXISTS public.report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.section_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_report_comments_report ON public.report_comments (report_id);
ALTER TABLE public.achievement_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_approvals ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4) Functions
-- ---------------------------------------------------------------------------
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
      (_user_id, 'comment_consolidation');
    UPDATE public.profiles SET access_level = 'edit' WHERE id = _user_id;
  ELSIF user_role = 'read_only'::public.app_role THEN
    UPDATE public.profiles SET access_level = 'view' WHERE id = _user_id;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) Backfill duties (AT validates; DT does not)
-- ---------------------------------------------------------------------------
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
          'comment_consolidation',
          'write_national_summary',
          'manage_users',
          'manage_provinces'
        ]::public.app_duty[]
      WHEN 'technical_assistant'::public.app_role THEN
        ARRAY['validate_reports', 'comment_consolidation']::public.app_duty[]
      ELSE
        ARRAY[]::public.app_duty[]
    END
  ) AS duty
) d
ON CONFLICT (user_id, duty) DO NOTHING;

DELETE FROM public.user_duties ud
USING public.user_roles ur
WHERE ud.user_id = ur.user_id
  AND ur.role = 'technical_director'::public.app_role
  AND ud.duty = 'validate_reports'::public.app_duty;

INSERT INTO public.user_duties (user_id, duty)
SELECT ur.user_id, 'validate_reports'::public.app_duty
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.role = 'technical_assistant'::public.app_role
  AND p.access_level = 'edit'::public.access_level
ON CONFLICT (user_id, duty) DO NOTHING;

-- Promote at@epic.cd from read_only if still stuck there
UPDATE public.user_roles ur
SET role = 'technical_assistant'::public.app_role
WHERE ur.role = 'read_only'::public.app_role
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = ur.user_id AND lower(COALESCE(p.email, '')) = 'at@epic.cd'
  );

-- ---------------------------------------------------------------------------
-- 6) user_duties RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "read own duties" ON public.user_duties;
CREATE POLICY "read own duties"
  ON public.user_duties FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
  );

DROP POLICY IF EXISTS "manage_users insert duties" ON public.user_duties;
CREATE POLICY "manage_users insert duties"
  ON public.user_duties FOR INSERT TO authenticated
  WITH CHECK (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "manage_users update duties" ON public.user_duties;
CREATE POLICY "manage_users update duties"
  ON public.user_duties FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

DROP POLICY IF EXISTS "manage_users delete duties" ON public.user_duties;
CREATE POLICY "manage_users delete duties"
  ON public.user_duties FOR DELETE TO authenticated
  USING (public.has_duty(auth.uid(), 'manage_users'::public.app_duty));

-- ---------------------------------------------------------------------------
-- 7) Read access: DT + AT + CP + viewer
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "read reports scoped" ON public.reports;
CREATE POLICY "read reports scoped" ON public.reports FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director'::public.app_role)
  OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
  OR (public.has_role(auth.uid(), 'read_only'::public.app_role) AND status = 'validated'::public.report_status)
  OR (public.has_role(auth.uid(), 'province_user'::public.app_role) AND province_id = public.get_user_province(auth.uid()))
);

-- ---------------------------------------------------------------------------
-- 8) Validation workflow RLS (AT via validate_reports duty)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "director update reports" ON public.reports;
DROP POLICY IF EXISTS "validator update reports" ON public.reports;
CREATE POLICY "validator update reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty));

DROP POLICY IF EXISTS "auth read achievement_summary" ON public.achievement_summary;
CREATE POLICY "auth read achievement_summary" ON public.achievement_summary FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "director write achievement_summary" ON public.achievement_summary;
DROP POLICY IF EXISTS "validator write achievement_summary" ON public.achievement_summary;
CREATE POLICY "validator write achievement_summary"
  ON public.achievement_summary FOR ALL TO authenticated
  USING (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty));

DROP POLICY IF EXISTS "auth read report_comments" ON public.report_comments;
CREATE POLICY "auth read report_comments" ON public.report_comments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "auth insert report_comments" ON public.report_comments;
DROP POLICY IF EXISTS "insert report_comments scoped" ON public.report_comments;
CREATE POLICY "insert report_comments scoped"
  ON public.report_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_duty(auth.uid(), 'validate_reports'::public.app_duty)
      OR (
        public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
        AND EXISTS (
          SELECT 1 FROM public.reports r
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
  ON public.report_comments FOR UPDATE TO authenticated
  USING (
    public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "auth read section_approvals" ON public.section_approvals;
CREATE POLICY "auth read section_approvals" ON public.section_approvals FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "director insert section_approvals" ON public.section_approvals;
DROP POLICY IF EXISTS "validator insert section_approvals" ON public.section_approvals;
CREATE POLICY "validator insert section_approvals"
  ON public.section_approvals FOR INSERT TO authenticated
  WITH CHECK (
    public.has_duty(auth.uid(), 'validate_reports'::public.app_duty)
    AND approved_by = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 9) Province report writes (duty-based)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "province user update own report" ON public.reports;
DROP POLICY IF EXISTS "province user update own draft" ON public.reports;
CREATE POLICY "province user update own report"
  ON public.reports FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'province_user'::public.app_role)
    AND public.has_duty(auth.uid(), 'edit_reports'::public.app_duty)
    AND province_id = public.get_user_province(auth.uid())
    AND status IN ('draft', 'submitted', 'returned', 'in_review')
  );

-- ---------------------------------------------------------------------------
-- Done — verification (should show in_review, returned + AT with validate_reports)
-- ---------------------------------------------------------------------------
SELECT unnest(enum_range(NULL::public.report_status))::text AS report_status;

SELECT ur.role, p.email, array_agg(ud.duty ORDER BY ud.duty) AS duties
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
LEFT JOIN public.user_duties ud ON ud.user_id = ur.user_id
WHERE ur.role IN ('technical_director', 'technical_assistant')
GROUP BY ur.role, p.email;
