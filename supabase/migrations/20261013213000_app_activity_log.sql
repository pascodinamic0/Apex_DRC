-- Records what people do in the app, as each action happens.

CREATE TABLE IF NOT EXISTS public.app_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_activity_log_created_at_idx
  ON public.app_activity_log (created_at DESC);

CREATE INDEX IF NOT EXISTS app_activity_log_actor_created_idx
  ON public.app_activity_log (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS app_activity_log_actor_action_created_idx
  ON public.app_activity_log (actor_id, action, created_at DESC);

ALTER TABLE public.app_activity_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.app_activity_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.app_activity_log TO authenticated;

DROP POLICY IF EXISTS "read own or managed activity" ON public.app_activity_log;
CREATE POLICY "read own or managed activity"
  ON public.app_activity_log
  FOR SELECT
  TO authenticated
  USING (
    actor_id = auth.uid()
    OR public.has_duty(auth.uid(), 'manage_users'::public.app_duty)
    OR (
      public.has_duty(auth.uid(), 'manage_provincial_users'::public.app_duty)
      AND EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = app_activity_log.actor_id
          AND ur.role IN ('province_user'::public.app_role, 'read_only'::public.app_role)
      )
    )
  );

CREATE OR REPLACE FUNCTION public.write_app_activity(
  _actor_id UUID,
  _action TEXT,
  _summary TEXT,
  _entity_type TEXT DEFAULT NULL,
  _entity_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb,
  _at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id UUID;
BEGIN
  IF _actor_id IS NULL OR _action IS NULL OR btrim(_action) = '' OR _summary IS NULL OR btrim(_summary) = '' THEN
    RETURN NULL;
  END IF;
  IF char_length(_action) > 80 OR char_length(_summary) > 500 THEN
    RETURN NULL;
  END IF;
  IF _metadata IS NOT NULL AND octet_length(_metadata::text) > 4000 THEN
    _metadata := '{}'::jsonb;
  END IF;

  INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
  VALUES (
    _actor_id,
    _action,
    NULLIF(_entity_type, ''),
    _entity_id,
    left(_summary, 500),
    COALESCE(_metadata, '{}'::jsonb),
    COALESCE(_at, now())
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.write_app_activity(UUID, TEXT, TEXT, TEXT, UUID, JSONB, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.record_app_activity(
  _action TEXT,
  _summary TEXT,
  _entity_type TEXT DEFAULT NULL,
  _entity_id UUID DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  path TEXT;
BEGIN
  IF actor IS NULL THEN
    RETURN NULL;
  END IF;
  IF _action NOT IN ('auth.signed_in', 'auth.signed_out', 'app.page_viewed') THEN
    RETURN NULL;
  END IF;

  IF _action = 'app.page_viewed' THEN
    path := COALESCE(_metadata->>'path', '');
    IF path !~ '^/[A-Za-z0-9_./-]*$' OR char_length(path) > 200 THEN
      RETURN NULL;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM public.app_activity_log
      WHERE actor_id = actor
        AND action = 'app.page_viewed'
        AND metadata->>'path' = path
        AND created_at > now() - interval '10 minutes'
    ) THEN
      RETURN NULL;
    END IF;
    _metadata := jsonb_build_object('path', path);
    _summary := 'Opened ' || path;
  END IF;

  RETURN public.write_app_activity(actor, _action, _summary, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

REVOKE ALL ON FUNCTION public.record_app_activity(TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_activity(TEXT, TEXT, TEXT, UUID, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_log_report_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID;
  act TEXT;
  meta JSONB;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  actor := COALESCE(auth.uid(), CASE WHEN TG_OP = 'UPDATE' AND NEW.status = 'validated' THEN NEW.validated_by ELSE NULL END, CASE WHEN TG_OP = 'UPDATE' AND NEW.status = 'returned' THEN NEW.returned_by ELSE NULL END, NEW.created_by);
  act := CASE
    WHEN TG_OP = 'INSERT' THEN 'report.created'
    WHEN NEW.status = 'submitted' THEN 'report.submitted'
    WHEN NEW.status = 'validated' THEN 'report.validated'
    WHEN NEW.status = 'returned' THEN 'report.returned'
    WHEN NEW.status = 'in_review' THEN 'report.in_review'
    ELSE 'report.status_changed'
  END;
  meta := jsonb_build_object('month', NEW.month, 'year', NEW.year, 'status', NEW.status::text);

  PERFORM public.write_app_activity(actor, act, act, 'report', NEW.id, meta);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for reports: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_report_activity ON public.reports;
CREATE TRIGGER trg_log_report_activity
  AFTER INSERT OR UPDATE OF status ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_report_activity();

CREATE OR REPLACE FUNCTION public.trg_log_report_draft_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
  meta JSONB := '{}'::jsonb;
  report_row RECORD;
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.app_activity_log
    WHERE actor_id = actor
      AND action = 'report.saved'
      AND entity_id = NEW.report_id
      AND created_at > now() - interval '2 minutes'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT month, year INTO report_row FROM public.reports WHERE id = NEW.report_id;
  IF FOUND THEN
    meta := jsonb_build_object('month', report_row.month, 'year', report_row.year);
  END IF;

  PERFORM public.write_app_activity(actor, 'report.saved', 'Saved a report', 'report', NEW.report_id, meta);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for report drafts: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_report_draft_activity ON public.report_drafts;
CREATE TRIGGER trg_log_report_draft_activity
  AFTER INSERT OR UPDATE ON public.report_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_report_draft_activity();

CREATE OR REPLACE FUNCTION public.trg_log_report_comment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID;
  act TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    actor := COALESCE(auth.uid(), NEW.author_id);
    act := 'comment.added';
  ELSIF OLD.resolved_at IS NULL AND NEW.resolved_at IS NOT NULL THEN
    actor := COALESCE(auth.uid(), NEW.author_id);
    act := 'comment.resolved';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.write_app_activity(
    actor,
    act,
    act,
    'report',
    NEW.report_id,
    jsonb_build_object('section_key', NEW.section_key)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for comments: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_report_comment_activity ON public.report_comments;
CREATE TRIGGER trg_log_report_comment_activity
  AFTER INSERT OR UPDATE OF resolved_at ON public.report_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_report_comment_activity();

CREATE OR REPLACE FUNCTION public.trg_log_section_approval_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.write_app_activity(
    COALESCE(auth.uid(), NEW.approved_by),
    'section.approved',
    'Approved a section',
    'report',
    NEW.report_id,
    jsonb_build_object('section_key', NEW.section_key)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for section approvals: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_section_approval_activity ON public.section_approvals;
CREATE TRIGGER trg_log_section_approval_activity
  AFTER INSERT ON public.section_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_section_approval_activity();

CREATE OR REPLACE FUNCTION public.trg_log_report_photo_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.report_photos%ROWTYPE;
  act TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row := OLD;
    act := 'photo.removed';
  ELSE
    row := NEW;
    act := 'photo.added';
  END IF;

  PERFORM public.write_app_activity(
    COALESCE(auth.uid(), row.uploaded_by),
    act,
    act,
    'report',
    row.report_id,
    jsonb_build_object('file_name', row.file_name)
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for photos: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_report_photo_activity ON public.report_photos;
CREATE TRIGGER trg_log_report_photo_activity
  AFTER INSERT OR DELETE ON public.report_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_report_photo_activity();

CREATE OR REPLACE FUNCTION public.trg_log_profile_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.full_name IS NOT DISTINCT FROM NEW.full_name
    AND OLD.job_title IS NOT DISTINCT FROM NEW.job_title
    AND OLD.phone IS NOT DISTINCT FROM NEW.phone
    AND OLD.address IS NOT DISTINCT FROM NEW.address
    AND OLD.province_id IS NOT DISTINCT FROM NEW.province_id
    AND OLD.preferred_lang IS NOT DISTINCT FROM NEW.preferred_lang
    AND OLD.access_level IS NOT DISTINCT FROM NEW.access_level
    AND OLD.access_blocked IS NOT DISTINCT FROM NEW.access_blocked
    AND OLD.onboarding_completed IS NOT DISTINCT FROM NEW.onboarding_completed
  THEN
    RETURN NEW;
  END IF;

  PERFORM public.write_app_activity(
    auth.uid(),
    'profile.updated',
    'Updated a profile',
    'user',
    NEW.id,
    jsonb_build_object('name', NEW.full_name)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for profiles: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_activity ON public.profiles;
CREATE TRIGGER trg_log_profile_activity
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_profile_activity();

CREATE OR REPLACE FUNCTION public.trg_log_consolidation_comment_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.write_app_activity(
    COALESCE(auth.uid(), NEW.author_id),
    'consolidation.commented',
    'Commented on consolidation',
    'consolidation',
    NULL,
    jsonb_build_object('month', NEW.month, 'year', NEW.year, 'activity_code', NEW.activity_code)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for consolidation comments: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_consolidation_comment_activity ON public.consolidation_activity_comments;
CREATE TRIGGER trg_log_consolidation_comment_activity
  AFTER INSERT ON public.consolidation_activity_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_consolidation_comment_activity();

CREATE OR REPLACE FUNCTION public.trg_log_consolidation_approval_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.write_app_activity(
    COALESCE(auth.uid(), NEW.approved_by),
    'consolidation.approved',
    'Approved consolidation',
    'consolidation',
    NEW.id,
    jsonb_build_object('month', NEW.month, 'year', NEW.year)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for consolidation approvals: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_consolidation_approval_activity ON public.consolidation_approvals;
CREATE TRIGGER trg_log_consolidation_approval_activity
  AFTER INSERT ON public.consolidation_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_consolidation_approval_activity();

CREATE OR REPLACE FUNCTION public.recent_activity_exists(
  _actor UUID,
  _action TEXT,
  _entity UUID,
  _within INTERVAL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_activity_log
    WHERE actor_id = _actor
      AND action = _action
      AND entity_id IS NOT DISTINCT FROM _entity
      AND created_at > now() - _within
  );
$$;

REVOKE ALL ON FUNCTION public.recent_activity_exists(UUID, TEXT, UUID, INTERVAL) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_log_consolidation_summary_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := COALESCE(auth.uid(), NEW.updated_by, NEW.generated_by);
BEGIN
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.recent_activity_exists(actor, 'consolidation.summary_saved', NEW.id, interval '2 minutes') THEN
    RETURN NEW;
  END IF;
  PERFORM public.write_app_activity(
    actor,
    'consolidation.summary_saved',
    'Saved the national summary',
    'consolidation',
    NEW.id,
    jsonb_build_object('month', NEW.month, 'year', NEW.year, 'lang', NEW.lang)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for consolidation summaries: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_consolidation_summary_activity ON public.consolidation_summaries;
CREATE TRIGGER trg_log_consolidation_summary_activity
  AFTER INSERT OR UPDATE OF content ON public.consolidation_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_consolidation_summary_activity();

CREATE OR REPLACE FUNCTION public.trg_log_province_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF actor IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM public.write_app_activity(actor, 'province.removed', 'Removed a province', 'province', OLD.id, jsonb_build_object('name', OLD.name));
    RETURN OLD;
  END IF;
  PERFORM public.write_app_activity(actor, 'province.created', 'Added a province', 'province', NEW.id, jsonb_build_object('name', NEW.name));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'app activity log failed for provinces: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_province_activity ON public.provinces;
CREATE TRIGGER trg_log_province_activity
  AFTER INSERT OR DELETE ON public.provinces
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_log_province_activity();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_activity_log;
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- One-time history so the page is not empty on the day the log starts.
INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT p.id, 'account.created', 'user', p.id, 'Account created',
  jsonb_build_object('source', 'backfill', 'name', p.full_name), p.created_at
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT u.id, 'auth.signed_in', 'user', u.id, 'Signed in',
  jsonb_build_object('source', 'backfill'), u.last_sign_in_at
FROM auth.users u
WHERE u.last_sign_in_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'auth.signed_in' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT r.created_by, 'report.created', 'report', r.id, 'Created a report',
  jsonb_build_object('source', 'backfill', 'month', r.month, 'year', r.year, 'status', r.status::text), r.created_at
FROM public.reports r
WHERE r.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'report.created' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT r.created_by, 'report.submitted', 'report', r.id, 'Submitted a report',
  jsonb_build_object('source', 'backfill', 'month', r.month, 'year', r.year), r.submitted_at
FROM public.reports r
WHERE r.created_by IS NOT NULL AND r.submitted_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'report.submitted' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT r.validated_by, 'report.validated', 'report', r.id, 'Validated a report',
  jsonb_build_object('source', 'backfill', 'month', r.month, 'year', r.year), r.validated_at
FROM public.reports r
WHERE r.validated_by IS NOT NULL AND r.validated_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'report.validated' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT r.returned_by, 'report.returned', 'report', r.id, 'Returned a report',
  jsonb_build_object('source', 'backfill', 'month', r.month, 'year', r.year), r.returned_at
FROM public.reports r
WHERE r.returned_by IS NOT NULL AND r.returned_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'report.returned' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT r.created_by, 'report.saved', 'report', d.report_id, 'Saved a report',
  jsonb_build_object('source', 'backfill', 'month', r.month, 'year', r.year), d.updated_at
FROM public.report_drafts d
LEFT JOIN public.reports r ON r.id = d.report_id
WHERE r.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'report.saved' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT c.author_id, 'comment.added', 'report', c.report_id, 'Commented on a report',
  jsonb_build_object('source', 'backfill', 'section_key', c.section_key), c.created_at
FROM public.report_comments c
WHERE NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'comment.added' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT c.author_id, 'consolidation.commented', 'consolidation', NULL, 'Commented on consolidation',
  jsonb_build_object('source', 'backfill', 'month', c.month, 'year', c.year, 'activity_code', c.activity_code), c.created_at
FROM public.consolidation_activity_comments c
WHERE NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'consolidation.commented' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT a.approved_by, 'consolidation.approved', 'consolidation', a.id, 'Approved consolidation',
  jsonb_build_object('source', 'backfill', 'month', a.month, 'year', a.year), a.approved_at
FROM public.consolidation_approvals a
WHERE NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'consolidation.approved' AND metadata->>'source' = 'backfill');

INSERT INTO public.app_activity_log (actor_id, action, entity_type, entity_id, summary, metadata, created_at)
SELECT p.uploaded_by, 'photo.added', 'report', p.report_id, 'Added a photo',
  jsonb_build_object('source', 'backfill', 'file_name', p.file_name), p.created_at
FROM public.report_photos p
WHERE p.uploaded_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.app_activity_log WHERE action = 'photo.added' AND metadata->>'source' = 'backfill');
