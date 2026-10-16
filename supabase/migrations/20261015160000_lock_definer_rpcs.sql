-- Keep trigger helpers off the public API. Triggers still run because
-- authenticated keeps EXECUTE, and PostgREST does not expose this schema.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.protect_onboarding_completed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    NEW.onboarding_completed := OLD.onboarding_completed;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'protect_onboarding_completed()',
    'trg_log_consolidation_approval_activity()',
    'trg_log_consolidation_comment_activity()',
    'trg_log_consolidation_summary_activity()',
    'trg_log_profile_activity()',
    'trg_log_province_activity()',
    'trg_log_report_activity()',
    'trg_log_report_comment_activity()',
    'trg_log_report_draft_activity()',
    'trg_log_report_photo_activity()',
    'trg_log_section_approval_activity()',
    'trg_notify_consolidation_comment()',
    'trg_notify_report_comment()',
    'trg_notify_report_status()'
  ]
  LOOP
    IF to_regprocedure('public.' || fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION public.%s SET SCHEMA private', fn);
      EXECUTE format('REVOKE ALL ON FUNCTION private.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION private.%s TO authenticated', fn);
    END IF;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.seed_default_duties_for_user(uuid) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.record_app_activity(text, text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_activity(text, text, text, uuid, jsonb) TO authenticated;

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
  method TEXT;
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
    _entity_type := NULL;
    _entity_id := NULL;
  ELSIF _action = 'auth.signed_in' THEN
    method := COALESCE(_metadata->>'method', '');
    IF method NOT IN ('password', 'google') THEN
      method := 'password';
    END IF;
    _metadata := jsonb_build_object('method', method);
    _summary := 'Signed in';
    _entity_type := NULL;
    _entity_id := NULL;
  ELSE
    _metadata := '{}'::jsonb;
    _summary := 'Signed out';
    _entity_type := NULL;
    _entity_id := NULL;
  END IF;

  RETURN public.write_app_activity(actor, _action, _summary, _entity_type, _entity_id, _metadata);
END;
$$;

REVOKE ALL ON FUNCTION public.record_app_activity(text, text, text, uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_app_activity(text, text, text, uuid, jsonb) TO authenticated;

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'can_read_report_content(uuid)',
    'create_notifications(uuid[], public.notification_type, uuid, text, text, text)',
    'get_province_user_ids(uuid, uuid)',
    'get_staff_notifier_ids()',
    'get_director_user_ids()',
    'user_can_bulk_import(uuid)',
    'has_role(uuid, public.app_role)',
    'has_duty(uuid, public.app_duty)',
    'get_user_province(uuid)',
    'consolidation_period_approved(integer, integer)',
    'review_comment_cp_ids(uuid)'
  ]
  LOOP
    IF to_regprocedure('public.' || fn) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', fn);
    END IF;
  END LOOP;
END $$;
