-- Relay AT/DT correction comments to the provincial CP, and CP replies back to national staff.
-- Targets only province_user accounts so a provincial viewer is not asked to correct the report.

CREATE OR REPLACE FUNCTION public.review_comment_cp_ids(p_province_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT p.id), ARRAY[]::UUID[])
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.province_id = p_province_id
    AND ur.role = 'province_user'::public.app_role;
$$;

REVOKE ALL ON FUNCTION public.review_comment_cp_ids(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_comment_cp_ids(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_report_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prov_id UUID;
  targets UUID[];
  reviewer BOOLEAN;
BEGIN
  SELECT r.province_id INTO prov_id
  FROM public.reports r
  WHERE r.id = NEW.report_id;

  reviewer := public.has_duty(NEW.author_id, 'validate_reports'::public.app_duty)
    OR public.has_role(NEW.author_id, 'technical_director'::public.app_role)
    OR public.has_role(NEW.author_id, 'technical_assistant'::public.app_role);

  IF reviewer THEN
    targets := public.review_comment_cp_ids(prov_id);
    IF targets IS NOT NULL AND array_length(targets, 1) IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
      SELECT uid, 'comment_added'::public.notification_type, NEW.report_id,
        'Nouveau commentaire sur votre rapport', left(NEW.body, 500), NEW.section_key
      FROM unnest(targets) AS uid
      WHERE uid IS NOT NULL AND uid <> NEW.author_id;
    END IF;
  ELSIF public.has_role(NEW.author_id, 'province_user'::public.app_role) THEN
    targets := public.get_staff_notifier_ids();
    IF targets IS NOT NULL AND array_length(targets, 1) IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
      SELECT uid, 'comment_added'::public.notification_type, NEW.report_id,
        'Nouvelle réponse provinciale sur un rapport', left(NEW.body, 500), NEW.section_key
      FROM unnest(targets) AS uid
      WHERE uid IS NOT NULL AND uid <> NEW.author_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_comment ON public.report_comments;
CREATE TRIGGER trg_notify_report_comment
  AFTER INSERT ON public.report_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_report_comment();

CREATE OR REPLACE FUNCTION public.trg_notify_report_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  targets UUID[];
  note TEXT;
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'submitted'::public.report_status THEN
    targets := public.get_staff_notifier_ids();
    IF targets IS NOT NULL AND array_length(targets, 1) IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
      SELECT uid, 'report_submitted'::public.notification_type, NEW.id,
        'Nouveau rapport soumis pour validation', NULL, NULL
      FROM unnest(targets) AS uid
      WHERE uid IS NOT NULL;
    END IF;
  ELSIF NEW.status = 'returned'::public.report_status THEN
    SELECT string_agg('• ' || left(c.body, 240), E'\n' ORDER BY c.created_at)
    INTO note
    FROM public.report_comments c
    WHERE c.report_id = NEW.id
      AND c.resolved_at IS NULL;

    targets := public.review_comment_cp_ids(NEW.province_id);
    IF targets IS NOT NULL AND array_length(targets, 1) IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
      SELECT uid, 'report_returned'::public.notification_type, NEW.id,
        'Rapport retourné pour révision',
        COALESCE(note, 'Veuillez traiter les commentaires.'),
        NULL
      FROM unnest(targets) AS uid
      WHERE uid IS NOT NULL;
    END IF;
  ELSIF NEW.status = 'validated'::public.report_status THEN
    targets := public.review_comment_cp_ids(NEW.province_id);
    IF targets IS NOT NULL AND array_length(targets, 1) IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
      SELECT uid, 'report_validated'::public.notification_type, NEW.id,
        'Rapport validé', NULL, NULL
      FROM unnest(targets) AS uid
      WHERE uid IS NOT NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_status ON public.reports;
CREATE TRIGGER trg_notify_report_status
  AFTER UPDATE OF status ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_report_status();
