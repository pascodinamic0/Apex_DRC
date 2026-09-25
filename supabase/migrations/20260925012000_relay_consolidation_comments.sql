-- Relay consolidation activity comments to the other national role:
-- AT comments go to the DT, DT comments go to the AT.

CREATE OR REPLACE FUNCTION public.trg_notify_consolidation_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  targets UUID[];
BEGIN
  IF public.has_role(NEW.author_id, 'technical_assistant'::public.app_role) THEN
    SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
    INTO targets
    FROM public.user_roles
    WHERE role = 'technical_director'::public.app_role;
  ELSIF public.has_role(NEW.author_id, 'technical_director'::public.app_role) THEN
    SELECT COALESCE(array_agg(DISTINCT user_id), ARRAY[]::UUID[])
    INTO targets
    FROM public.user_roles
    WHERE role = 'technical_assistant'::public.app_role;
  ELSE
    RETURN NEW;
  END IF;

  IF targets IS NULL OR array_length(targets, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
  SELECT uid, 'comment_added'::public.notification_type, NULL,
    'Nouveau commentaire sur la consolidation',
    left(NEW.activity_code || ' — ' || NEW.body, 500),
    NEW.activity_code
  FROM unnest(targets) AS uid
  WHERE uid IS NOT NULL AND uid <> NEW.author_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_consolidation_comment ON public.consolidation_activity_comments;
CREATE TRIGGER trg_notify_consolidation_comment
  AFTER INSERT ON public.consolidation_activity_comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_consolidation_comment();
