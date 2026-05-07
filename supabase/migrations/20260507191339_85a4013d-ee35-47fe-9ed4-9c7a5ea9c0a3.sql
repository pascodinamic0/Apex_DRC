-- Restrict read_only viewer to validated reports only (consolidated/aggregate use case)
DROP POLICY IF EXISTS "read reports scoped" ON public.reports;
CREATE POLICY "read reports scoped" ON public.reports FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'technical_director'::app_role)
  OR (has_role(auth.uid(), 'read_only'::app_role) AND status = 'validated'::report_status)
  OR (has_role(auth.uid(), 'province_user'::app_role) AND province_id = get_user_province(auth.uid()))
);

DROP POLICY IF EXISTS "read activities scoped" ON public.activities;
CREATE POLICY "read activities scoped" ON public.activities FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'technical_director'::app_role)
  OR EXISTS (
    SELECT 1 FROM reports r WHERE r.id = activities.report_id AND (
      (has_role(auth.uid(), 'read_only'::app_role) AND r.status = 'validated'::report_status)
      OR (has_role(auth.uid(), 'province_user'::app_role) AND r.province_id = get_user_province(auth.uid()))
    )
  )
);

DROP POLICY IF EXISTS "read narratives scoped" ON public.narratives;
CREATE POLICY "read narratives scoped" ON public.narratives FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'technical_director'::app_role)
  OR EXISTS (
    SELECT 1 FROM reports r WHERE r.id = narratives.report_id AND (
      (has_role(auth.uid(), 'read_only'::app_role) AND r.status = 'validated'::report_status)
      OR (has_role(auth.uid(), 'province_user'::app_role) AND r.province_id = get_user_province(auth.uid()))
    )
  )
);

-- Director can manage profiles (assign province, etc.)
CREATE POLICY "director update profiles" ON public.profiles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'technical_director'::app_role));

CREATE POLICY "director delete profiles" ON public.profiles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'technical_director'::app_role));

-- Director can manage user roles
CREATE POLICY "director insert roles" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'technical_director'::app_role));

CREATE POLICY "director update roles" ON public.user_roles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'technical_director'::app_role));

CREATE POLICY "director delete roles" ON public.user_roles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'technical_director'::app_role));