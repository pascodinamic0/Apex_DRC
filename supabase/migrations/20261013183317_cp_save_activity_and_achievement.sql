-- CP saves were only persisting narratives. achievement_summary and
-- activity_responses had no provincial write policy, so those upserts were
-- rejected while the editor still reported success. Draft writes also stopped
-- once a report left draft/submitted.

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

-- Copy values that only survived in the draft payload.
INSERT INTO public.achievement_summary (
  report_id,
  total_planned,
  finalized_approved,
  finalized_no_report,
  in_progress,
  trigger_approved,
  not_realized,
  updated_at
)
SELECT
  d.report_id,
  COALESCE((d.payload #>> '{achievement,total_planned}')::int, 0),
  COALESCE((d.payload #>> '{achievement,finalized_approved}')::int, 0),
  COALESCE((d.payload #>> '{achievement,finalized_no_report}')::int, 0),
  COALESCE((d.payload #>> '{achievement,in_progress}')::int, 0),
  COALESCE((d.payload #>> '{achievement,trigger_approved}')::int, 0),
  COALESCE((d.payload #>> '{achievement,not_realized}')::int, 0),
  now()
FROM public.report_drafts d
WHERE jsonb_typeof(d.payload->'achievement') = 'object'
  AND NOT EXISTS (
    SELECT 1 FROM public.achievement_summary a WHERE a.report_id = d.report_id
  );

INSERT INTO public.activity_responses (
  report_id,
  catalog_code,
  realized,
  progress,
  challenges,
  solutions,
  priorities,
  partners,
  updated_at
)
SELECT
  d.report_id,
  el->>'catalog_code',
  COALESCE(el->>'realized', ''),
  COALESCE(el->>'progress', ''),
  COALESCE(el->>'challenges', ''),
  COALESCE(el->>'solutions', ''),
  COALESCE(el->>'priorities', ''),
  COALESCE(el->>'partners', ''),
  now()
FROM public.report_drafts d
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(d.payload->'activityResponses', '[]'::jsonb)) el
WHERE COALESCE(el->>'catalog_code', '') <> ''
  AND EXISTS (
    SELECT 1 FROM public.activity_catalog c WHERE c.code = el->>'catalog_code'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.activity_responses ar
    WHERE ar.report_id = d.report_id
      AND ar.catalog_code = el->>'catalog_code'
  );
