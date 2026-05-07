-- Restrict province users to only their own province's data.
-- Technical directors and read-only viewers retain full visibility.

-- helper inline expression: 
--   has_role(auth.uid(),'technical_director') OR has_role(auth.uid(),'read_only')
--   OR (has_role(auth.uid(),'province_user') AND <province match>)

-- REPORTS
DROP POLICY IF EXISTS "auth read reports" ON public.reports;
CREATE POLICY "read reports scoped"
ON public.reports FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director')
  OR public.has_role(auth.uid(), 'read_only')
  OR (public.has_role(auth.uid(), 'province_user')
      AND province_id = public.get_user_province(auth.uid()))
);

-- ACTIVITIES
DROP POLICY IF EXISTS "auth read activities" ON public.activities;
CREATE POLICY "read activities scoped"
ON public.activities FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director')
  OR public.has_role(auth.uid(), 'read_only')
  OR EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = activities.report_id
      AND public.has_role(auth.uid(), 'province_user')
      AND r.province_id = public.get_user_province(auth.uid())
  )
);

-- NARRATIVES
DROP POLICY IF EXISTS "auth read narratives" ON public.narratives;
CREATE POLICY "read narratives scoped"
ON public.narratives FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director')
  OR public.has_role(auth.uid(), 'read_only')
  OR EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = narratives.report_id
      AND public.has_role(auth.uid(), 'province_user')
      AND r.province_id = public.get_user_province(auth.uid())
  )
);

-- REPORT DRAFTS
DROP POLICY IF EXISTS "auth read drafts" ON public.report_drafts;
CREATE POLICY "read drafts scoped"
ON public.report_drafts FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'technical_director')
  OR EXISTS (
    SELECT 1 FROM public.reports r
    WHERE r.id = report_drafts.report_id
      AND public.has_role(auth.uid(), 'province_user')
      AND r.province_id = public.get_user_province(auth.uid())
  )
);

-- PROFILES: province users only see directors + their own province colleagues + themselves
DROP POLICY IF EXISTS "auth read profiles" ON public.profiles;
CREATE POLICY "read profiles scoped"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'technical_director')
  OR public.has_role(auth.uid(), 'read_only')
  OR (public.has_role(auth.uid(), 'province_user')
      AND province_id = public.get_user_province(auth.uid()))
);