-- National activity comments: DT (superior) and AT only. Viewers cannot write.
DROP POLICY IF EXISTS "director and viewer insert consolidation_activity_comments" ON public.consolidation_activity_comments;
DROP POLICY IF EXISTS "comment_consolidation insert consolidation_activity_comments" ON public.consolidation_activity_comments;
CREATE POLICY "comment_consolidation insert consolidation_activity_comments"
  ON public.consolidation_activity_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'technical_director'::public.app_role)
      OR public.has_role(auth.uid(), 'technical_assistant'::public.app_role)
    )
  );
