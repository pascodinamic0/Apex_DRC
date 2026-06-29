-- Harden workflow RLS and notification delivery.
-- This keeps report content scoped consistently across the extended donor model.

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

GRANT EXECUTE ON FUNCTION public.can_read_report_content(UUID) TO authenticated;

DROP POLICY IF EXISTS "auth read achievement_summary" ON public.achievement_summary;
CREATE POLICY "read achievement_summary scoped"
ON public.achievement_summary
FOR SELECT TO authenticated
USING (public.can_read_report_content(report_id));

DROP POLICY IF EXISTS "auth read activity_responses" ON public.activity_responses;
CREATE POLICY "read activity_responses scoped"
ON public.activity_responses
FOR SELECT TO authenticated
USING (public.can_read_report_content(report_id));

DROP POLICY IF EXISTS "auth read report_comments" ON public.report_comments;
CREATE POLICY "read report_comments scoped"
ON public.report_comments
FOR SELECT TO authenticated
USING (public.can_read_report_content(report_id));

DROP POLICY IF EXISTS "auth read section_approvals" ON public.section_approvals;
CREATE POLICY "read section_approvals scoped"
ON public.section_approvals
FOR SELECT TO authenticated
USING (public.can_read_report_content(report_id));

DROP POLICY IF EXISTS "auth insert report_comments" ON public.report_comments;
CREATE POLICY "insert report_comments scoped"
ON public.report_comments
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'technical_director'::public.app_role)
    OR EXISTS (
      SELECT 1
      FROM public.reports r
      WHERE r.id = report_comments.report_id
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('submitted', 'in_review', 'returned')
    )
  )
);

DROP POLICY IF EXISTS "director insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "province insert notifications for directors" ON public.notifications;

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

  IF public.has_role(caller, 'technical_director'::public.app_role) THEN
    INSERT INTO public.notifications (user_id, type, report_id, title, body, section_key)
    SELECT uid, p_type, p_report_id, p_title, p_body, p_section_key
    FROM unnest(requested_user_ids) AS uid;
    RETURN;
  END IF;

  IF public.has_role(caller, 'province_user'::public.app_role) THEN
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

GRANT EXECUTE ON FUNCTION public.create_notifications(
  UUID[],
  public.notification_type,
  UUID,
  TEXT,
  TEXT,
  TEXT
) TO authenticated;
