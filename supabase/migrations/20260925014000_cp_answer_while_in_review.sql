-- The CP must be able to answer narrative fields while a report is in review or returned.
-- The live write policy only allowed draft and submitted, so saving from revisions failed.

DROP POLICY IF EXISTS "province user write narratives" ON public.narratives;
CREATE POLICY "province user write narratives"
  ON public.narratives
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft'::public.report_status, 'submitted'::public.report_status, 'returned'::public.report_status, 'in_review'::public.report_status)
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports r
      WHERE r.id = report_id
        AND r.province_id = public.get_user_province(auth.uid())
        AND r.status IN ('draft'::public.report_status, 'submitted'::public.report_status, 'returned'::public.report_status, 'in_review'::public.report_status)
        AND public.has_role(auth.uid(), 'province_user'::public.app_role)
    )
  );
