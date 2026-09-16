/** Reference grouping for objective tabs (matches donor logframe). */
/** Parent activity titles from the EpiC DRC source structure document. */
export const OBJECTIVE_PARENTS: Record<number, { code: string; titleFr: string; titleEn: string }[]> = {
  1: [
    { code: "1.1", titleFr: "Activité 1.1 — Accroître la sensibilisation et l'adoption, par les soignants et la communauté, des pratiques essentielles en matière de santé maternelle, néonatale et infantile, de paludisme, de vaccination et de nutrition", titleEn: "Activity 1.1 — Accroître la sensibilisation et l'adoption, par les soignants et la communauté, des pratiques essentielles en matière de santé maternelle, néonatale et infantile, de paludisme, de vaccination et de nutrition" },
    { code: "1.2", titleFr: "Activité 1.2 — Développer les plateformes de gestion intégrée des cas communautaires (GICC) pour le paludisme, la pneumonie et la diarrhée dans les 9 provinces", titleEn: "Activity 1.2 — Développer les plateformes de gestion intégrée des cas communautaires (GICC) pour le paludisme, la pneumonie et la diarrhée dans les 9 provinces" },
    { code: "1.3", titleFr: "Activité 1.3 — Renforcer les liens entre la communauté et les installations", titleEn: "Activity 1.3 — Renforcer les liens entre la communauté et les installations" },
  ],
  2: [
    { code: "2.1", titleFr: "Activité 2.1 — Evaluer la capacité des établissements à fournir des services de soins obstétricaux et néonatals d'urgence (SONU) en établissement, à traiter la malnutrition aiguë sévère (MAS) et le paludisme.", titleEn: "Activity 2.1 — Evaluer la capacité des établissements à fournir des services de soins obstétricaux et néonatals d'urgence (SONU) en établissement, à traiter la malnutrition aiguë sévère (MAS) et le paludisme." },
    { code: "2.2", titleFr: "Activité 2.2 — Renforcer les capacités du personnel de santé en matière de services vitaux de santé maternelle, néonatale et infantile", titleEn: "Activity 2.2 — Renforcer les capacités du personnel de santé en matière de services vitaux de santé maternelle, néonatale et infantile" },
    { code: "2.3", titleFr: "Activité 2.3 — Soutien à la supervision intégrée", titleEn: "Activity 2.3 — Soutien à la supervision intégrée" },
  ],
  3: [
    { code: "3.1", titleFr: "Activité 3.1 — Renforcer les systèmes de données sur la santé maternelle, néonatale et infantile, la nutrition et le paludisme afin d’améliorer la prise de décision programmatique", titleEn: "Activity 3.1 — Renforcer les systèmes de données sur la santé maternelle, néonatale et infantile, la nutrition et le paludisme afin d’améliorer la prise de décision programmatique" },
    { code: "3.2", titleFr: "Activité 3.2 — Évaluer et renforcer les systèmes de surveillance de la santé maternelle, néonatale et infantile, de la nutrition et du paludisme", titleEn: "Activity 3.2 — Évaluer et renforcer les systèmes de surveillance de la santé maternelle, néonatale et infantile, de la nutrition et du paludisme" },
    { code: "3.3", titleFr: "Activité 3.3 — Améliorer la chaîne d'approvisionnement des produits essentiels de santé maternelle, néonatale et infantile, de lutte contre le paludisme et de nutrition", titleEn: "Activity 3.3 — Améliorer la chaîne d'approvisionnement des produits essentiels de santé maternelle, néonatale et infantile, de lutte contre le paludisme et de nutrition" },
    { code: "3.4", titleFr: "Activité 3.4 — Coordination", titleEn: "Activity 3.4 — Coordination" },
    { code: "3.5", titleFr: "Activité 3.5 — Renforcer les capacités et les systèmes de préparation aux situations d'urgence", titleEn: "Activity 3.5 — Renforcer les capacités et les systèmes de préparation aux situations d'urgence" },
  ],
};

export type ActivityResponseFields = {
  catalog_code: string;
  realized: string;
  progress: string;
  challenges: string;
  solutions: string;
  priorities: string;
  partners: string;
};

export const emptyActivityResponse = (code: string): ActivityResponseFields => ({
  catalog_code: code,
  realized: "",
  progress: "",
  challenges: "",
  solutions: "",
  priorities: "",
  partners: "",
});

export type AchievementSummary = {
  total_planned: number;
  finalized_approved: number;
  finalized_no_report: number;
  in_progress: number;
  trigger_approved: number;
  not_realized: number;
};

export const emptyAchievementSummary = (): AchievementSummary => ({
  total_planned: 0,
  finalized_approved: 0,
  finalized_no_report: 0,
  in_progress: 0,
  trigger_approved: 0,
  not_realized: 0,
});

export function calcAchievementRate(s: AchievementSummary): number {
  const t = s.total_planned || 0;
  if (t <= 0) return 0;
  return Math.round((s.finalized_approved / t) * 100);
}

/** All narrative section keys used by the extended report form. */
export const EXTENDED_NARRATIVE_KEYS = [
  "exec_summary_smni",
  "exec_summary_nutrition",
  "exec_summary_malaria",
  "coordination_smne",
  "coordination_vaccination",
  "coordination_nutrition",
  "coordination_malaria",
  "coordination_hmis",
  "coordination_medicines",
  "success_smne_vaccination",
  "success_nutrition",
  "success_malaria",
  "lessons_learned",
  "challenge_1",
  "challenge_2",
  "challenge_3",
  "response_1",
  "response_2",
  "response_3",
  "priorities_objective_1",
  "priorities_objective_2",
  "priorities_objective_3",
] as const;

export type ExtendedNarrativeKey = (typeof EXTENDED_NARRATIVE_KEYS)[number];

export interface CatalogRow {
  code: string;
  objective: number;
  parent_code: string | null;
  title_fr: string;
  title_en: string;
  sort_order: number;
}
