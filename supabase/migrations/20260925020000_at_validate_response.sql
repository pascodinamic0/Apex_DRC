DROP POLICY IF EXISTS "staff resolve report_comments" ON public.report_comments;
CREATE POLICY "staff resolve report_comments"
  ON public.report_comments
  FOR UPDATE TO authenticated
  USING (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty))
  WITH CHECK (public.has_duty(auth.uid(), 'validate_reports'::public.app_duty));
