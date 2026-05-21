/** Reference grouping for objective tabs (matches donor logframe). */
export const OBJECTIVE_PARENTS: Record<number, { code: string; titleFr: string; titleEn: string }[]> = {
  1: [
    { code: "1.1", titleFr: "Activité 1.1 — Sensibilisation et adoption de pratiques vitales", titleEn: "Activity 1.1 — Community sensitization and adoption" },
    { code: "1.2", titleFr: "Activité 1.2 — Plateformes GICC (paludisme, pneumonie, diarrhée)", titleEn: "Activity 1.2 — iCCM platforms" },
    { code: "1.3", titleFr: "Activité 1.3 — Liens communauté — établissements", titleEn: "Activity 1.3 — Community–facility linkages" },
  ],
  2: [
    { code: "2.1", titleFr: "Activité 2.1 — Évaluation capacité SONU, MAS, paludisme", titleEn: "Activity 2.1 — Capacity assessment" },
    { code: "2.2", titleFr: "Activité 2.2 — Renforcement capacités prestataires SMNE", titleEn: "Activity 2.2 — Provider capacity strengthening" },
    { code: "2.3", titleFr: "Activité 2.3 — Supervision intégrée", titleEn: "Activity 2.3 — Integrated supervision" },
  ],
  3: [
    { code: "3.1", titleFr: "Activité 3.1 — Systèmes de données", titleEn: "Activity 3.1 — Data systems" },
    { code: "3.2", titleFr: "Activité 3.2 — Surveillance", titleEn: "Activity 3.2 — Surveillance" },
    { code: "3.3", titleFr: "Activité 3.3 — Chaîne d'approvisionnement", titleEn: "Activity 3.3 — Supply chain" },
    { code: "3.4", titleFr: "Activité 3.4 — Coordination", titleEn: "Activity 3.4 — Coordination" },
    { code: "3.5", titleFr: "Activité 3.5 — Préparation aux urgences", titleEn: "Activity 3.5 — Emergency preparedness" },
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
