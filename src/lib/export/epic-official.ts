import type { AchievementSummary, ActivityResponseFields, CatalogRow } from "@/lib/activity-catalog";
import { emptyAchievementSummary } from "@/lib/activity-catalog";

export const EPIC_AGREEMENT = "7200AA19CA00002";
export const EPIC_PROJECT = "Meeting Targets and Maintaining Epidemic Control (EpiC)";

export const SOURCE_MONTH = 6;
export const SOURCE_YEAR = 2026;

export function reportingYears(now = new Date()) {
  const y = now.getFullYear();
  return Array.from(new Set([2025, 2026, 2027, y - 1, y, y + 1])).sort();
}

export type OfficialLabels = {
  monthlyTitle: string;
  nationalTitle: string;
  domains: string;
  submittedBy: string;
  monthOf: string;
  agreement: string;
  toc: string;
  execSummary: string;
  realizationRate: string;
  tableI: string;
  rubrique: string;
  count: string;
  percent: string;
  keyResults: string;
  activityCode: string;
  realized: string;
  progress: string;
  challenges: string;
  solutions: string;
  priorities: string;
  partners: string;
  coordination: string;
  stories: string;
  challengesSection: string;
  nextMonth: string;
  annexA: string;
  sourceNote: string;
  generatedOn: string;
  province: string;
  smni: string;
  nutrition: string;
  malaria: string;
  objective: string;
  achTotal: string;
  achApproved: string;
  achNoReport: string;
  achInProgress: string;
  achTrigger: string;
  achNotDone: string;
};

export function officialLabels(lang: "fr" | "en"): OfficialLabels {
  if (lang === "en") {
    return {
      monthlyTitle: "MONTHLY ACTIVITY REPORT",
      nationalTitle: "NATIONAL CONSOLIDATED MONTHLY REPORT",
      domains: "TECHNICAL AREAS",
      submittedBy: "Submitted by",
      monthOf: "Month of",
      agreement: "Cooperative agreement no.",
      toc: "Contents",
      execSummary: "Executive summary",
      realizationRate: "Activity completion rate",
      tableI: "Table I: Activity completion, count and percentage",
      rubrique: "Category",
      count: "Count",
      percent: "Percentage",
      keyResults: "I. Key results by objective and technical area",
      activityCode: "Activity code",
      realized: "Activities implemented",
      progress: "Results / progress",
      challenges: "Challenges",
      solutions: "Solutions and adaptations",
      priorities: "Follow-up priorities / next month",
      partners: "Partner contributions / enabling factors",
      coordination: "II. Programme coordination and stakeholder engagement",
      stories: "III. Success stories and lessons learned",
      challengesSection: "IV. Challenges",
      nextMonth: "V. Priority activities for next month",
      annexA: "Annex A: Performance monitoring and evaluation matrix",
      sourceNote: "Document generated from official EpiC DRC source reports imported into the platform. Layout follows the provincial monthly report template used in Docs.",
      generatedOn: "Generated on",
      province: "Province",
      smni: "MNCH",
      nutrition: "Nutrition",
      malaria: "Malaria",
      objective: "Objective",
      achTotal: "Total planned activities during the month",
      achApproved: "Completed, report approved",
      achNoReport: "Completed, report not yet available",
      achInProgress: "In progress",
      achTrigger: "Trigger already approved",
      achNotDone: "Not completed",
    };
  }
  return {
    monthlyTitle: "RAPPORT MENSUEL D'ACTIVITES",
    nationalTitle: "RAPPORT MENSUEL CONSOLIDE NATIONAL",
    domains: "DOMAINES",
    submittedBy: "Soumis par",
    monthOf: "Mois de",
    agreement: "Cooperative agreement no.",
    toc: "Table des matières",
    execSummary: "Résumé exécutif",
    realizationRate: "Taux de réalisation des activités",
    tableI: "Tableau I : Réalisation des activités, nombre et pourcentage",
    rubrique: "Rubriques",
    count: "Nombre",
    percent: "Pourcentage",
    keyResults: "I. Résultats clés par objectif et par domaine technique",
    activityCode: "Code de l'activité",
    realized: "Activités réalisées",
    progress: "Réalisations",
    challenges: "Défis rencontrés",
    solutions: "Solutions et adaptations apportées",
    priorities: "Priorités de suivi / Actions pour le mois prochain",
    partners: "Contributions des partenaires / Facteurs facilitateurs",
    coordination: "II. Coordination du programme et engagement des parties prenantes",
    stories: "III. Histoires de succès et leçons apprises",
    challengesSection: "IV. Défis",
    nextMonth: "V. Activités prioritaires pour le prochain mois",
    annexA: "Annexe A : Matrice de suivi et d'évaluation des performances",
    sourceNote: "Document généré à partir des rapports officiels EpiC RDC importés dans la plateforme. La structure suit le modèle de rapport mensuel provincial fourni dans Docs.",
    generatedOn: "Généré le",
    province: "Province",
    smni: "SMNE",
    nutrition: "Nutrition",
    malaria: "Paludisme",
    objective: "Objectif",
    achTotal: "Nombre total d'activités prévues durant le mois",
    achApproved: "Activité finalisée et rapport approuvé",
    achNoReport: "Activité déjà finalisée mais rapport non encore disponible",
    achInProgress: "Activité en cours",
    achTrigger: "Activité dont le déclencheur déjà approuvé",
    achNotDone: "Activité non réalisée",
  };
}

export type ActivityExportRow = {
  code: string;
  title: string;
  realized: string;
  progress: string;
  challenges: string;
  solutions: string;
  priorities: string;
  partners: string;
};

export type OfficialReportPayload = {
  kind: "monthly" | "national";
  provinceName: string;
  monthLabel: string;
  year: number;
  submittedBy: string | null;
  domains: string;
  achievement: AchievementSummary;
  achievementRows: { label: string; count: number; pct: string }[];
  activities: ActivityExportRow[];
  execSmni: string;
  execNutrition: string;
  execMalaria: string;
  coordination: string;
  stories: string;
  challenges: string;
  priorities: string;
  annexRows?: { code: string; name: string; numerator: string; denominator: string; value: string; comment: string }[];
  provinceRates?: { name: string; rate: number; total: number; approved: number }[];
};

function pct(n: number, total: number) {
  if (!total) return "—";
  return `${Math.round((n / total) * 1000) / 10}%`;
}

export function achievementExportRows(a: AchievementSummary, L: OfficialLabels) {
  const t = a.total_planned || 0;
  return [
    { label: L.achTotal, count: t, pct: t ? "100%" : "—" },
    { label: L.achApproved, count: a.finalized_approved, pct: pct(a.finalized_approved, t) },
    { label: L.achNoReport, count: a.finalized_no_report, pct: pct(a.finalized_no_report, t) },
    { label: L.achInProgress, count: a.in_progress, pct: pct(a.in_progress, t) },
    { label: L.achTrigger, count: a.trigger_approved, pct: pct(a.trigger_approved, t) },
    { label: L.achNotDone, count: a.not_realized, pct: pct(a.not_realized, t) },
  ];
}

export function buildActivityExportRows(
  catalog: CatalogRow[],
  responses: ActivityResponseFields[],
  lang: "fr" | "en",
): ActivityExportRow[] {
  const byCode = new Map(responses.map((r) => [r.catalog_code, r]));
  return catalog
    .map((c) => {
      const r = byCode.get(c.code);
      return {
        code: c.code,
        title: lang === "en" ? c.title_en : c.title_fr,
        realized: r?.realized || "",
        progress: r?.progress || "",
        challenges: r?.challenges || "",
        solutions: r?.solutions || "",
        priorities: r?.priorities || "",
        partners: r?.partners || "",
      };
    })
    .filter((row) => [row.realized, row.progress, row.challenges, row.solutions, row.priorities, row.partners].some((v) => v && v.trim() && v.trim().toUpperCase() !== "NA"));
}

export function joinNarratives(values: (string | undefined | null)[]) {
  return values.filter((v) => v && v.trim()).join("\n\n");
}

export function buildOfficialMonthlyPayload(opts: {
  lang: "fr" | "en";
  provinceName: string;
  monthLabel: string;
  year: number;
  submittedBy: string | null;
  domains?: string;
  achievement: AchievementSummary;
  catalog: CatalogRow[];
  responses: ActivityResponseFields[];
  narratives: Record<string, string>;
}): OfficialReportPayload {
  const L = officialLabels(opts.lang);
  const n = opts.narratives;
  return {
    kind: "monthly",
    provinceName: opts.provinceName,
    monthLabel: opts.monthLabel,
    year: opts.year,
    submittedBy: opts.submittedBy,
    domains: opts.domains || `${L.smni}, ${L.nutrition}, ${L.malaria}`,
    achievement: opts.achievement,
    achievementRows: achievementExportRows(opts.achievement, L),
    activities: buildActivityExportRows(opts.catalog, opts.responses, opts.lang),
    execSmni: n.exec_summary_smni || "",
    execNutrition: n.exec_summary_nutrition || "",
    execMalaria: n.exec_summary_malaria || "",
    coordination: joinNarratives([
      n.stakeholder_coordination,
      n.coordination_smne,
      n.coordination_vaccination,
      n.coordination_nutrition,
      n.coordination_malaria,
      n.coordination_hmis,
      n.coordination_medicines,
    ]),
    stories: joinNarratives([
      n.success_stories,
      n.success_smne_vaccination,
      n.success_nutrition,
      n.success_malaria,
      n.lessons_learned,
    ]),
    challenges: joinNarratives([
      n.challenges,
      n.challenge_1,
      n.response_1,
      n.challenge_2,
      n.response_2,
      n.challenge_3,
      n.response_3,
    ]),
    priorities: joinNarratives([
      n.priorities_next_month,
      n.priorities_objective_1,
      n.priorities_objective_2,
      n.priorities_objective_3,
    ]),
  };
}

function prefixed(province: string, text: string) {
  if (!text.trim()) return "";
  return `[${province}]\n${text.trim()}`;
}

export function sumAchievements(items: AchievementSummary[]): AchievementSummary {
  return items.reduce(
    (acc, a) => ({
      total_planned: acc.total_planned + (a.total_planned || 0),
      finalized_approved: acc.finalized_approved + (a.finalized_approved || 0),
      finalized_no_report: acc.finalized_no_report + (a.finalized_no_report || 0),
      in_progress: acc.in_progress + (a.in_progress || 0),
      trigger_approved: acc.trigger_approved + (a.trigger_approved || 0),
      not_realized: acc.not_realized + (a.not_realized || 0),
    }),
    emptyAchievementSummary(),
  );
}

export function buildOfficialNationalPayload(opts: {
  lang: "fr" | "en";
  monthLabel: string;
  year: number;
  catalog: CatalogRow[];
  provinces: { id: string; name: string }[];
  reports: { id: string; province_id: string; submitted_by_name?: string | null }[];
  achievements: (AchievementSummary & { report_id: string })[];
  responses: (ActivityResponseFields & { report_id: string })[];
  narratives: { report_id: string; section_type: string; content: string | null }[];
}): OfficialReportPayload {
  const L = officialLabels(opts.lang);
  const nameOf = (id: string) => opts.provinces.find((p) => p.id === id)?.name || "—";
  const merged = new Map<string, ActivityExportRow>();
  const exec: Record<"smni" | "nutrition" | "malaria", string[]> = { smni: [], nutrition: [], malaria: [] };
  const coordination: string[] = [];
  const stories: string[] = [];
  const challenges: string[] = [];
  const priorities: string[] = [];

  for (const report of opts.reports) {
    const pname = nameOf(report.province_id);
    const ach = opts.achievements.find((a) => a.report_id === report.id) || emptyAchievementSummary();
    const n: Record<string, string> = {};
    for (const row of opts.narratives.filter((x) => x.report_id === report.id && x.content)) {
      n[row.section_type] = row.content || "";
    }
    const monthly = buildOfficialMonthlyPayload({
      lang: opts.lang,
      provinceName: pname,
      monthLabel: opts.monthLabel,
      year: opts.year,
      submittedBy: report.submitted_by_name || null,
      achievement: ach,
      catalog: opts.catalog,
      responses: opts.responses.filter((r) => r.report_id === report.id),
      narratives: n,
    });
    for (const row of monthly.activities) {
      const cur = merged.get(row.code) || {
        code: row.code,
        title: row.title,
        realized: "",
        progress: "",
        challenges: "",
        solutions: "",
        priorities: "",
        partners: "",
      };
      const add = (prev: string, next: string) => (next ? (prev ? `${prev}\n\n${prefixed(pname, next)}` : prefixed(pname, next)) : prev);
      merged.set(row.code, {
        ...cur,
        realized: add(cur.realized, row.realized),
        progress: add(cur.progress, row.progress),
        challenges: add(cur.challenges, row.challenges),
        solutions: add(cur.solutions, row.solutions),
        priorities: add(cur.priorities, row.priorities),
        partners: add(cur.partners, row.partners),
      });
    }
    if (monthly.execSmni) exec.smni.push(prefixed(pname, monthly.execSmni));
    if (monthly.execNutrition) exec.nutrition.push(prefixed(pname, monthly.execNutrition));
    if (monthly.execMalaria) exec.malaria.push(prefixed(pname, monthly.execMalaria));
    if (monthly.coordination) coordination.push(prefixed(pname, monthly.coordination));
    if (monthly.stories) stories.push(prefixed(pname, monthly.stories));
    if (monthly.challenges) challenges.push(prefixed(pname, monthly.challenges));
    if (monthly.priorities) priorities.push(prefixed(pname, monthly.priorities));
  }

  const achievement = sumAchievements(opts.achievements);
  return {
    kind: "national",
    provinceName: opts.lang === "en" ? "National (all provinces with a report)" : "National (toutes les provinces avec rapport)",
    monthLabel: opts.monthLabel,
    year: opts.year,
    submittedBy: null,
    domains: `${L.smni}, ${L.nutrition}, ${L.malaria}`,
    achievement,
    achievementRows: achievementExportRows(achievement, L),
    activities: Array.from(merged.values()),
    execSmni: exec.smni.join("\n\n"),
    execNutrition: exec.nutrition.join("\n\n"),
    execMalaria: exec.malaria.join("\n\n"),
    coordination: coordination.join("\n\n"),
    stories: stories.join("\n\n"),
    challenges: challenges.join("\n\n"),
    priorities: priorities.join("\n\n"),
    provinceRates: opts.reports.map((r) => {
      const a = opts.achievements.find((x) => x.report_id === r.id) || emptyAchievementSummary();
      const t = a.total_planned || 0;
      return {
        name: nameOf(r.province_id),
        total: t,
        approved: a.finalized_approved,
        rate: t ? Math.round((a.finalized_approved / t) * 100) : 0,
      };
    }).filter((r) => r.total > 0),
  };
}
