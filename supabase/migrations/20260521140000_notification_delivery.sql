-- Reliable notification delivery for every role (bypasses client RLS insert failures)

CREATE OR REPLACE FUNCTION public.get_staff_notifier_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
  FROM public.user_roles
  WHERE role IN ('technical_director'::app_role, 'read_only'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_director_user_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
  FROM public.user_roles
  WHERE role = 'technical_director'::app_role;
$$;

CREATE OR REPLACE FUNCTION public.get_province_user_ids(p_province_id UUID, p_report_id UUID DEFAULT NULL)
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(DISTINCT x.id), ARRAY[]::UUID[])
  FROM (
    SELECT p.id FROM public.profiles p WHERE p.province_id = p_province_id
    UNION
    SELECT r.created_by FROM public.reports r
    WHERE p_report_id IS NOT NULL AND r.id = p_report_id AND r.created_by IS NOT NULL
  ) x(id);
$$;

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
BEGIN
  IF p_user_ids IS NULL OR array_length(p_user_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
  SELECT DISTINCT uid, p_type, p_report_id, p_title, p_body, p_section_key
  FROM unnest(p_user_ids) AS uid
  WHERE uid IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_notifier_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_director_user_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_province_user_ids(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notifications(UUID[], public.notification_type, UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_report_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  targets UUID[];
BEGIN
  IF TG_OP <> 'UPDATE' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'submitted'::public.report_status THEN
    targets := public.get_staff_notifier_ids();
    PERFORM public.create_notifications(
      targets, 'report_submitted', NEW.id,
      'Nouveau rapport soumis pour validation', NULL, NULL);
  ELSIF NEW.status = 'returned'::public.report_status THEN
    targets := public.get_province_user_ids(NEW.province_id, NEW.id);
    PERFORM public.create_notifications(
      targets, 'report_returned', NEW.id,
      'Rapport retourné pour révision',
      'Veuillez traiter les commentaires du DT.', NULL);
  ELSIF NEW.status = 'validated'::public.report_status THEN
    targets := public.get_province_user_ids(NEW.province_id, NEW.id);
    PERFORM public.create_notifications(
      targets, 'report_validated', NEW.id,
      'Rapport validé', NULL, NULL);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_status ON public.reports;
CREATE TRIGGER trg_notify_report_status
  AFTER UPDATE OF status ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_report_status();

CREATE OR REPLACE FUNCTION public.trg_notify_report_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prov_id UUID;
  targets UUID[];
BEGIN
  SELECT province_id INTO prov_id FROM public.reports WHERE id = NEW.report_id;

  IF public.has_role(NEW.author_id, 'technical_director'::app_role) THEN
    targets := public.get_province_user_ids(prov_id, NEW.report_id);
    PERFORM public.create_notifications(
      targets, 'comment_added', NEW.report_id,
      'Nouveau commentaire sur votre rapport', left(NEW.body, 500), NEW.section_key);
  ELSIF public.has_role(NEW.author_id, 'province_user'::app_role) THEN
    targets := public.get_staff_notifier_ids();
    PERFORM public.create_notifications(
      targets, 'comment_added', NEW.report_id,
      'Nouvelle réponse provinciale sur un rapport', left(NEW.body, 500), NEW.section_key);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_report_comment ON public.report_comments;
CREATE TRIGGER trg_notify_report_comment
  AFTER INSERT ON public.report_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_report_comment();

CREATE OR REPLACE FUNCTION public.trg_notify_section_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prov_id UUID;
  targets UUID[];
BEGIN
  SELECT province_id INTO prov_id FROM public.reports WHERE id = NEW.report_id;
  targets := public.get_province_user_ids(prov_id, NEW.report_id);
  PERFORM public.create_notifications(
    targets, 'section_approved', NEW.report_id,
    'Section approuvée par le DT', NULL, NEW.section_key);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_section_approval ON public.section_approvals;
CREATE TRIGGER trg_notify_section_approval
  AFTER INSERT ON public.section_approvals
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_section_approval();
