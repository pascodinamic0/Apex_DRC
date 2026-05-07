
-- Enums
CREATE TYPE public.app_role AS ENUM ('province_user', 'technical_director', 'read_only');
CREATE TYPE public.report_status AS ENUM ('draft', 'submitted', 'validated');
CREATE TYPE public.narrative_section AS ENUM (
  'stakeholder_coordination','success_stories','challenges','priorities_next_month',
  'exec_summary_smni','exec_summary_nutrition','exec_summary_malaria'
);

-- Provinces
CREATE TABLE public.provinces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.provinces (name, code) VALUES
  ('Kinshasa','KIN'),
  ('Kongo Central','KCE'),
  ('Kwango','KWA'),
  ('Kwilu','KWI'),
  ('Mai-Ndombe','MAI'),
  ('Kasaï','KAS'),
  ('Kasaï Central','KCT'),
  ('Lualaba','LUA'),
  ('Haut-Katanga','HKA');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  province_id UUID REFERENCES public.provinces(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Roles (separate)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.get_user_province(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT province_id FROM public.profiles WHERE id = _user_id;
$$;

-- Reports
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id UUID NOT NULL REFERENCES public.provinces(id),
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL,
  status public.report_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (province_id, month, year)
);

-- Activities
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  objective INT NOT NULL CHECK (objective BETWEEN 1 AND 3),
  activity_code TEXT,
  description TEXT,
  planned NUMERIC DEFAULT 0,
  achieved NUMERIC DEFAULT 0,
  percentage NUMERIC GENERATED ALWAYS AS (
    CASE WHEN planned > 0 THEN ROUND((achieved / planned) * 100, 2) ELSE 0 END
  ) STORED,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Narratives
CREATE TABLE public.narratives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  section_type public.narrative_section NOT NULL,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, section_type)
);

-- Draft snapshots
CREATE TABLE public.report_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_reports_updated BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_drafts_updated BEFORE UPDATE ON public.report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_narratives_updated BEFORE UPDATE ON public.narratives
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE public.provinces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;

-- Provinces: anyone authenticated can read
CREATE POLICY "auth read provinces" ON public.provinces FOR SELECT TO authenticated USING (true);

-- Profiles: read all (for showing names), update own
CREATE POLICY "auth read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "user insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- user_roles: user can read own roles; director can read all
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'technical_director'));

-- Reports: all authenticated can read
CREATE POLICY "auth read reports" ON public.reports FOR SELECT TO authenticated USING (true);

CREATE POLICY "province user create own report" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'province_user')
    AND province_id = public.get_user_province(auth.uid())
    AND status = 'draft'
  );

CREATE POLICY "province user update own draft" ON public.reports FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'province_user')
    AND province_id = public.get_user_province(auth.uid())
    AND status IN ('draft','submitted')
  );

CREATE POLICY "director update reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'technical_director'));

-- Activities & Narratives: read all; province user CRUD on own draft
CREATE POLICY "auth read activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "province user write activities" ON public.activities FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted')
      AND public.has_role(auth.uid(),'province_user'))
  );

CREATE POLICY "auth read narratives" ON public.narratives FOR SELECT TO authenticated USING (true);
CREATE POLICY "province user write narratives" ON public.narratives FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted')
      AND public.has_role(auth.uid(),'province_user'))
  );

CREATE POLICY "auth read drafts" ON public.report_drafts FOR SELECT TO authenticated USING (true);
CREATE POLICY "province user write drafts" ON public.report_drafts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted')
      AND public.has_role(auth.uid(),'province_user'))
  );
