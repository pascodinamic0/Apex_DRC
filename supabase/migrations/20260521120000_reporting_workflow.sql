-- Extended reporting workflow (functional parity with donor template; no UI change)

ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'in_review';
ALTER TYPE public.report_status ADD VALUE IF NOT EXISTS 'returned';

ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_smne';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_vaccination';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_nutrition';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_malaria';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_hmis';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'coordination_medicines';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'success_smne_vaccination';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'success_nutrition';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'success_malaria';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'lessons_learned';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'priorities_objective_1';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'priorities_objective_2';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'priorities_objective_3';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'challenge_1';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'challenge_2';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'challenge_3';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'response_1';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'response_2';
ALTER TYPE public.narrative_section ADD VALUE IF NOT EXISTS 'response_3';

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS submitted_by_name TEXT,
  ADD COLUMN IF NOT EXISTS submitter_function TEXT,
  ADD COLUMN IF NOT EXISTS submission_deadline DATE,
  ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS returned_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.achievement_summary (
  report_id UUID PRIMARY KEY REFERENCES public.reports(id) ON DELETE CASCADE,
  total_planned INT NOT NULL DEFAULT 0,
  finalized_approved INT NOT NULL DEFAULT 0,
  finalized_no_report INT NOT NULL DEFAULT 0,
  in_progress INT NOT NULL DEFAULT 0,
  trigger_approved INT NOT NULL DEFAULT 0,
  not_realized INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_catalog (
  code TEXT PRIMARY KEY,
  objective INT NOT NULL CHECK (objective BETWEEN 1 AND 3),
  parent_code TEXT,
  title_fr TEXT NOT NULL,
  title_en TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.activity_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  catalog_code TEXT NOT NULL REFERENCES public.activity_catalog(code),
  realized TEXT DEFAULT '',
  progress TEXT DEFAULT '',
  challenges TEXT DEFAULT '',
  solutions TEXT DEFAULT '',
  priorities TEXT DEFAULT '',
  partners TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, catalog_code)
);

CREATE TABLE IF NOT EXISTS public.report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.section_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (report_id, section_key)
);

CREATE TYPE public.notification_type AS ENUM (
  'report_submitted',
  'report_returned',
  'comment_added',
  'section_approved',
  'report_validated',
  'reminder_sent'
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL,
  report_id UUID REFERENCES public.reports(id) ON DELETE CASCADE,
  section_key TEXT,
  title TEXT NOT NULL,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_report_comments_report ON public.report_comments (report_id);
CREATE INDEX IF NOT EXISTS idx_activity_responses_report ON public.activity_responses (report_id);

-- Activity catalog seed (EpiC logframe)
INSERT INTO public.activity_catalog (code, objective, parent_code, title_fr, title_en, sort_order) VALUES
('1.1.1', 1, '1.1', 'Stratégie de co-conception de messages EMCE fondée sur des données probantes', 'Evidence-based RMNCH messaging co-design strategy', 101),
('1.1.2', 1, '1.1', 'Renforcer les capacités des ASC en matière de conseil et de promotion de la santé', 'Strengthen CHW counselling and health promotion capacity', 102),
('1.1.3', 1, '1.1', 'Mener des actions de sensibilisation et dialogues communautaires pour promouvoir des pratiques saines', 'Community dialogues to promote healthy practices', 103),
('1.1.4', 1, '1.1', 'Revitaliser les plateformes de soutien pour la communication autour des actions nutritionnelles essentielles', 'Revitalize platforms for essential nutrition actions communication', 104),
('1.1.5', 1, '1.1', 'Organiser des démonstrations culinaires pour sensibiliser à la diversité alimentaire', 'Cooking demonstrations for dietary diversity', 105),
('1.1.6', 1, '1.1', 'Renforcer le TPIp à base communautaire (SP)', 'Strengthen community-based IPTp (SP)', 106),
('1.2.1', 1, '1.2', 'Soutenir les stratégies de sensibilisation avancées (cliniques mobiles) pour les villages isolés', 'Mobile clinic outreach for isolated villages', 201),
('1.2.2', 1, '1.2', 'Renforcer les activités communautaires contre le paludisme via la PCIME avec intégration ANJE', 'Community malaria activities via iCCM with ENA integration', 202),
('1.2.3', 1, '1.2', 'Étendre la couverture vaccinale', 'Expand immunization coverage', 203),
('1.2.4', 1, '1.2', 'Soutenir les campagnes bisannuelles de supplémentation en vitamine A et de vermifugation', 'Biannual vitamin A and deworming campaigns', 204),
('1.2.5', 1, '1.2', 'Sensibiliser les prestataires et ASC à la revitalisation des consultations de suivi de la croissance', 'Sensitize providers and CHWs on growth monitoring consultations', 205),
('1.3.1', 1, '1.3', 'Cartographie des établissements de santé pour identifier les filières d''orientation', 'Health facility mapping for referral pathways', 301),
('1.3.2', 1, '1.3', 'Coordination avec CODESA, CAC et réseaux religieux pour le transport en cas d''urgence', 'Coordination with CODESA, CAC and faith networks for emergency transport', 302),
('1.3.3', 1, '1.3', 'Aider les ASC à utiliser les tickets de rappel (stratégie VIVA) pour le suivi des références', 'CHW reminder tickets (VIVA strategy) for referral follow-up', 303),
('1.3.4', 1, '1.3', 'Renforcer les capacités communautaires pour stabiliser les patients en vue du transport d''urgence', 'Community capacity to stabilize patients before emergency transport', 304),
('1.3.5', 1, '1.3', 'Soutenir les sites iCCM pour la prise en charge communautaire du paludisme grave', 'Support iCCM sites for severe malaria community care', 305),
('1.3.6', 1, '1.3', 'Appuyer les ASC pour atteindre les femmes atteintes de paludisme grave via des systèmes de suivi proactifs', 'CHW proactive follow-up for women with severe malaria', 306),
('2.1.1', 2, '2.1', 'Évaluation rapide de la capacité des établissements à fournir des services SONU, MAS et paludisme grave', 'Rapid capacity assessment for EmONC, SAM and severe malaria services', 401),
('2.1.2', 2, '2.1', 'Réunion des parties prenantes pour examiner les résultats de l''évaluation et élaborer des recommandations', 'Stakeholder meeting on assessment results and recommendations', 402),
('2.2.1', 2, '2.2', 'Rétablir les séances mensuelles intégrées de mentorat clinique', 'Restore integrated monthly clinical mentoring sessions', 501),
('2.2.2', 2, '2.2', 'Soutenir les stages cliniques pour combler les lacunes dans les services CEmONC', 'Clinical placements to address CEmONC service gaps', 502),
('2.2.3', 2, '2.2', 'Renforcer la capacité des prestataires conformément aux derniers protocoles SMNE, Nutrition et Paludisme', 'Provider capacity per latest MNCH, nutrition and malaria protocols', 503),
('2.2.4', 2, '2.2', 'Former les prestataires sur le vaccin antipaludique et soutenir la sensibilisation communautaire', 'Malaria vaccine provider training and community sensitization', 504),
('2.2.5', 2, '2.2', 'Déployer le nouveau protocole de traitement de la malnutrition aiguë modérée', 'Deploy new moderate acute malnutrition treatment protocol', 505),
('2.2.6', 2, '2.2', 'Soutenir le dépistage de la tuberculose auprès des groupes à haut risque', 'TB screening among high-risk groups', 506),
('2.2.7', 2, '2.2', 'Sessions de formation pour la présentation des nouveaux médicaments aux prestataires', 'Training sessions on new medicines for providers', 507),
('2.2.8', 2, '2.2', 'Former les prestataires sur les 12 étapes de l''Initiative IINA (soins maternels respectueux)', 'Provider training on 12 steps of respectful maternal care (IINA)', 508),
('2.2.9', 2, '2.2', 'Former les prestataires sur la prise en charge rapide des hémorragies post-partum', 'Provider training on rapid postpartum hemorrhage management', 509),
('2.3.1', 2, '2.3', 'Visites mensuelles de supervision et de soutien intégré par les équipes de la zone de santé', 'Monthly integrated supervision visits by health zone teams', 601),
('2.3.2', 2, '2.3', 'Visites trimestrielles de supervision intégrée par les équipes provinciales', 'Quarterly integrated supervision by provincial teams', 602),
('2.3.3', 2, '2.3', 'Missions de supervision bisannuelles pour accélérer les progrès vers les objectifs nationaux', 'Biannual supervision missions toward national targets', 603),
('3.1.1', 3, '3.1', 'Évaluation ciblée des systèmes de données SMNE, Nutrition et Paludisme (conjointement avec 2.1.1)', 'Targeted MNCH, nutrition and malaria data systems assessment', 701),
('3.1.2', 3, '3.1', 'Consultation des parties prenantes sur les conclusions et recommandations (en lien avec 2.1.2)', 'Stakeholder consultation on assessment findings', 702),
('3.1.3', 3, '3.1', 'Élaborer un plan ciblé de renforcement des données', 'Develop targeted data strengthening plan', 703),
('3.1.4', 3, '3.1', 'Pérenniser et institutionnaliser l''utilisation des systèmes de données pour la prise de décision', 'Institutionalize data use for decision-making', 704),
('3.2.1', 3, '3.2', 'Évaluer et renforcer la fonctionnalité des systèmes de surveillance intégrés (maternelle, périnatale)', 'Assess and strengthen integrated maternal/perinatal surveillance', 801),
('3.2.2', 3, '3.2', 'Renforcer l''identification des cas de PFA et le transport des échantillons au niveau communautaire', 'Strengthen AFP case identification and specimen transport at community level', 802),
('3.2.3', 3, '3.2', 'Soutenir le système de surveillance nutritionnelle et d''alerte précoce', 'Nutrition surveillance and early warning system support', 803),
('3.2.4', 3, '3.2', 'Soutien technique pour renforcer les données paludisme dans le cadre du DHIS2/NMDR', 'Technical support for malaria data in DHIS2/NMDR', 804),
('3.3.1', 3, '3.3', 'Examiner les plans de quantification et identifier/suivre les ruptures de stock', 'Review quantification plans and track stockouts', 901),
('3.3.2', 3, '3.3', 'Prévoir les besoins en matières premières pour les campagnes de soutien d''urgence', 'Forecast raw materials for emergency support campaigns', 902),
('3.3.3', 3, '3.3', 'Mettre en œuvre des mesures ciblées d''approvisionnement et de distribution provisoires', 'Targeted provisional supply and distribution measures', 903),
('3.3.4', 3, '3.3', 'Renforcer la gestion de la chaîne d''approvisionnement infranationale contre les ruptures persistantes', 'Strengthen subnational supply chain against persistent stockouts', 904),
('3.3.5', 3, '3.3', 'Évaluer et contribuer à la chaîne d''approvisionnement pour le vaccin contre le paludisme', 'Assess and support malaria vaccine supply chain', 905),
('3.3.6', 3, '3.3', 'Renforcer l''utilisation rationnelle des médicaments et services pharmaceutiques', 'Strengthen rational medicine use and pharmaceutical services', 906),
('3.3.7', 3, '3.3', 'Améliorer la chaîne d''approvisionnement des produits de première nécessité', 'Improve essential commodities supply chain', 907),
('3.4.1', 3, '3.4', 'Soutien technique aux groupes de travail techniques (GTT) au niveau national', 'Technical support to national technical working groups', 1001),
('3.4.2', 3, '3.4', 'Évaluer et définir les priorités d''intégration des activités VIH', 'Assess and prioritize HIV activity integration', 1002),
('3.4.3', 3, '3.4', 'Examen du programme pour alignement sur le protocole d''entente EpiC', 'Program review for EpiC agreement alignment', 1003),
('3.5.1', 3, '3.5', 'Évaluation de la préparation aux urgences du système de santé dans les provinces', 'Health emergency preparedness assessment in provinces', 1101),
('3.5.2', 3, '3.5', 'Séances de recyclage dans les zones à faible couverture réseau', 'Refresher sessions in low network coverage areas', 1102),
('3.5.3', 3, '3.5', 'Appui au transport des échantillons vers le laboratoire de référence', 'Support specimen transport to reference laboratory', 1103)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.achievement_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.section_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read achievement_summary" ON public.achievement_summary FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read activity_catalog" ON public.activity_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read activity_responses" ON public.activity_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read report_comments" ON public.report_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read section_approvals" ON public.section_approvals FOR SELECT TO authenticated USING (true);

CREATE POLICY "users read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "province write achievement_summary" ON public.achievement_summary FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  );

CREATE POLICY "province write activity_responses" ON public.activity_responses FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  );

CREATE POLICY "director write achievement_summary" ON public.achievement_summary FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'technical_director'))
  WITH CHECK (public.has_role(auth.uid(),'technical_director'));

CREATE POLICY "director write activity_responses" ON public.activity_responses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'technical_director'))
  WITH CHECK (public.has_role(auth.uid(),'technical_director'));

CREATE POLICY "auth insert report_comments" ON public.report_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "province resolve own report_comments" ON public.report_comments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND public.has_role(auth.uid(),'province_user'))
  );

CREATE POLICY "director insert section_approvals" ON public.section_approvals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'technical_director') AND approved_by = auth.uid());

CREATE POLICY "director insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'technical_director') OR user_id = auth.uid());

-- Province users may notify directors on submit (insert to other users) via service role only; client uses director insert + self insert
CREATE POLICY "province insert notifications for directors" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'province_user'));

DROP POLICY IF EXISTS "province user update own draft" ON public.reports;
CREATE POLICY "province user update own report" ON public.reports FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'province_user')
    AND province_id = public.get_user_province(auth.uid())
    AND status IN ('draft','submitted','returned')
  );

DROP POLICY IF EXISTS "province user write activities" ON public.activities;
CREATE POLICY "province user write activities" ON public.activities FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  );

DROP POLICY IF EXISTS "province user write narratives" ON public.narratives;
CREATE POLICY "province user write narratives" ON public.narratives FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  );

DROP POLICY IF EXISTS "province user write drafts" ON public.report_drafts;
CREATE POLICY "province user write drafts" ON public.report_drafts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_id
      AND r.province_id = public.get_user_province(auth.uid())
      AND r.status IN ('draft','submitted','returned')
      AND public.has_role(auth.uid(),'province_user'))
  );

DROP POLICY IF EXISTS "read reports scoped" ON public.reports;
CREATE POLICY "read reports scoped" ON public.reports FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'technical_director'::app_role)
  OR (has_role(auth.uid(), 'read_only'::app_role) AND status = 'validated'::report_status)
  OR (has_role(auth.uid(), 'province_user'::app_role) AND province_id = get_user_province(auth.uid()))
);
