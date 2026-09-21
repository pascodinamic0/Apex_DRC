import type { AchievementSummary, ActivityResponseFields, CatalogRow } from "@/lib/activity-catalog";
import { emptyAchievementSummary } from "@/lib/activity-catalog";

export const EPIC_AGREEMENT = "7200AA19CA00002";
export const EPIC_PROJECT = "Meeting Targets and Maintaining Epidemic Control (EpiC)";

/** Standard acronyms from the provincial monthly report template. */
export function officialAcronyms(lang: "fr" | "en"): [string, string][] {
  if (lang === "en") {
    return [
      ["AC", "Community animator"],
      ["AME", "Exclusive breastfeeding"],
      ["ANJE", "Infant and young child feeding"],
      ["AS", "Health area"],
      ["ASC", "Community health worker"],
      ["BCZS", "Health zone central office"],
      ["CPN", "Antenatal consultation"],
      ["CPON", "Postnatal consultation"],
      ["CPS", "Preschool consultation"],
      ["CS", "Health centre"],
      ["DoS", "U.S. Department of State"],
      ["EPIC", "Meeting Targets and Maintaining Epidemic Control"],
      ["ESS", "Health care facilities"],
      ["FHI", "Family Health International"],
      ["GSA", "IYCF support group"],
      ["HCD", "Human-centered design"],
      ["HGR", "General referral hospital"],
      ["HKI", "Helen Keller International"],
      ["MII", "Insecticide-treated net"],
      ["MMS", "Multiple micronutrient supplementation"],
      ["PEV", "Expanded Programme on Immunization"],
      ["PFE", "Essential family practices"],
      ["PNLP", "National Malaria Control Programme"],
      ["PNSR", "National Reproductive Health Programme"],
      ["PRONANUT", "National Nutrition Programme"],
      ["RDC", "Democratic Republic of the Congo"],
      ["SMNE", "Maternal, newborn and child health"],
      ["SNIS", "National Health Information System"],
      ["TDR", "Rapid diagnostic test"],
      ["TPI", "Intermittent preventive treatment"],
      ["ZS", "Health zone"],
    ];
  }
  return [
    ["AC", "Animateur communautaire"],
    ["AME", "Allaitement maternel exclusif"],
    ["ANJE", "Alimentation du nourrisson et du jeune enfant"],
    ["AS", "Aire de sante"],
    ["ASC", "Agent de sante communautaire"],
    ["BCZS", "Bureau central de zone de sante"],
    ["CPN", "Consultation prenatale"],
    ["CPON", "Consultation postnatale"],
    ["CPS", "Consultation prescolaire"],
    ["CS", "Centre de sante"],
    ["DoS", "U.S. Department of State"],
    ["EPIC", "Meeting Targets and Maintaining Epidemic Control"],
    ["ESS", "Etablissements de soins de sante"],
    ["FHI", "Family Health International"],
    ["GSA", "Groupe de soutien a l'ANJE"],
    ["HCD", "Human-centered design"],
    ["HGR", "Hopital general de reference"],
    ["HKI", "Helen Keller International"],
    ["MII", "Moustiquaire impregnee d'insecticide"],
    ["MMS", "Multiple micronutrient supplementation"],
    ["PEV", "Programme elargi de vaccination"],
    ["PFE", "Pratiques familiales essentielles"],
    ["PNLP", "Programme national de lutte contre le paludisme"],
    ["PNSR", "Programme national de sante de la reproduction"],
    ["PRONANUT", "Programme national de nutrition"],
    ["RDC", "Republique democratique du Congo"],
    ["SMNE", "Sante de la mere, du nouveau-ne et de l'enfant"],
    ["SNIS", "Systeme national d'information sanitaire"],
    ["TDR", "Test de diagnostic rapide"],
    ["TPI", "Traitement preventif intermittent"],
    ["ZS", "Zone de sante"],
  ];
}

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
  annexB: string;
  acronyms: string;
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
  aiNationalSummary: string;
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
      annexB: "Annex B: Implementation photos",
      acronyms: "Acronyms",
      sourceNote: "Document generated from official EpiC DRC source reports. Structure follows the provincial monthly activity report template.",
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
      aiNationalSummary: "National AI summary (reviewed by Technical Director)",
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
    annexB: "Annexe B : Photos de mise en oeuvre",
    acronyms: "Sigles et acronymes",
    sourceNote: "Document généré à partir des rapports officiels EpiC RDC. La structure suit le modèle de rapport mensuel provincial.",
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
    aiNationalSummary: "Résumé national IA (revu par le Directeur Technique)",
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
  /** DT-reviewed national AI summary (does not replace source tables). */
  aiNationalSummary?: string;
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

export function activityRowHasContent(row: Pick<ActivityExportRow, "realized" | "progress" | "challenges" | "solutions" | "priorities" | "partners">) {
  return [row.realized, row.progress, row.challenges, row.solutions, row.priorities, row.partners].some(
    (v) => v && v.trim() && v.trim().toUpperCase() !== "NA",
  );
}

function catalogTitle(catalog: CatalogRow[], code: string, lang: "fr" | "en") {
  const c = catalog.find((x) => x.code === code);
  if (!c) return code;
  return lang === "en" ? c.title_en : c.title_fr;
}

export function buildActivityExportRows(
  catalog: CatalogRow[],
  responses: ActivityResponseFields[],
  lang: "fr" | "en",
): ActivityExportRow[] {
  const byCode = new Map<string, ActivityResponseFields>();
  for (const r of responses) {
    if (r.catalog_code) byCode.set(r.catalog_code, r);
  }
  const codes = [
    ...catalog.map((c) => c.code),
    ...[...byCode.keys()].filter((code) => !catalog.some((c) => c.code === code)),
  ];
  return codes
    .map((code) => {
      const r = byCode.get(code);
      return {
        code,
        title: catalogTitle(catalog, code, lang),
        realized: r?.realized || "",
        progress: r?.progress || "",
        challenges: r?.challenges || "",
        solutions: r?.solutions || "",
        priorities: r?.priorities || "",
        partners: r?.partners || "",
      };
    })
    .filter(activityRowHasContent);
}

export type ProvinceActivityContribution = ActivityExportRow & {
  provinceName: string;
  reportId: string;
};

export type NationalActivityView = {
  code: string;
  title: string;
  objective: number | null;
  parentCode: string | null;
  sortOrder: number;
  contributions: ProvinceActivityContribution[];
  merged: ActivityExportRow;
};

export function applyAcceptedActivitySummaries(
  activities: ActivityExportRow[],
  accepted: { activity_code: string; ai_content: string; selected: string }[],
): ActivityExportRow[] {
  const map = new Map(accepted.filter((s) => s.selected === "ai" && s.ai_content.trim()).map((s) => [s.activity_code, s.ai_content]));
  if (!map.size) return activities;
  return activities.map((a) => (map.has(a.code) ? { ...a, realized: map.get(a.code)! } : a));
}

export function buildNationalActivityViews(opts: {
  lang: "fr" | "en";
  catalog: CatalogRow[];
  provinces: { id: string; name: string }[];
  reports: { id: string; province_id: string }[];
  responses: (ActivityResponseFields & { report_id: string })[];
}): NationalActivityView[] {
  const nameOf = (id: string) => opts.provinces.find((p) => p.id === id)?.name || "—";
  const catalogByCode = new Map(opts.catalog.map((c) => [c.code, c]));
  const extraCodes = [...new Set(opts.responses.map((r) => r.catalog_code).filter(Boolean))].filter(
    (code) => !catalogByCode.has(code),
  );
  const codes = [
    ...opts.catalog.map((c) => c.code),
    ...extraCodes.sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
  ];

  const views: NationalActivityView[] = [];
  for (const code of codes) {
    const cat = catalogByCode.get(code);
    const contributions: ProvinceActivityContribution[] = [];
    for (const report of opts.reports) {
      const r = opts.responses.find((x) => x.report_id === report.id && x.catalog_code === code);
      if (!r) continue;
      const row: ProvinceActivityContribution = {
        code,
        title: catalogTitle(opts.catalog, code, opts.lang),
        provinceName: nameOf(report.province_id),
        reportId: report.id,
        realized: r.realized || "",
        progress: r.progress || "",
        challenges: r.challenges || "",
        solutions: r.solutions || "",
        priorities: r.priorities || "",
        partners: r.partners || "",
      };
      if (activityRowHasContent(row)) contributions.push(row);
    }
    if (!contributions.length) continue;
    const add = (field: keyof ActivityExportRow) =>
      contributions
        .map((c) => {
          const text = String(c[field] || "").trim();
          return text ? `[${c.provinceName}]\n${text}` : "";
        })
        .filter(Boolean)
        .join("\n\n");
    views.push({
      code,
      title: catalogTitle(opts.catalog, code, opts.lang),
      objective: cat?.objective ?? (Number.parseInt(code, 10) || null),
      parentCode: cat?.parent_code ?? (code.includes(".") ? code.split(".").slice(0, 2).join(".") : null),
      sortOrder: cat?.sort_order ?? 9999,
      contributions,
      merged: {
        code,
        title: catalogTitle(opts.catalog, code, opts.lang),
        realized: add("realized"),
        progress: add("progress"),
        challenges: add("challenges"),
        solutions: add("solutions"),
        priorities: add("priorities"),
        partners: add("partners"),
      },
    });
  }
  return views;
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
    if (monthly.execSmni) exec.smni.push(prefixed(pname, monthly.execSmni));
    if (monthly.execNutrition) exec.nutrition.push(prefixed(pname, monthly.execNutrition));
    if (monthly.execMalaria) exec.malaria.push(prefixed(pname, monthly.execMalaria));
    if (monthly.coordination) coordination.push(prefixed(pname, monthly.coordination));
    if (monthly.stories) stories.push(prefixed(pname, monthly.stories));
    if (monthly.challenges) challenges.push(prefixed(pname, monthly.challenges));
    if (monthly.priorities) priorities.push(prefixed(pname, monthly.priorities));
  }

  const achievement = sumAchievements(opts.achievements);
  const activityViews = buildNationalActivityViews({
    lang: opts.lang,
    catalog: opts.catalog,
    provinces: opts.provinces,
    reports: opts.reports,
    responses: opts.responses,
  });
  return {
    kind: "national",
    provinceName: opts.lang === "en" ? "National (all provinces with a report)" : "National (toutes les provinces avec rapport)",
    monthLabel: opts.monthLabel,
    year: opts.year,
    submittedBy: null,
    domains: `${L.smni}, ${L.nutrition}, ${L.malaria}`,
    achievement,
    achievementRows: achievementExportRows(achievement, L),
    activities: activityViews.map((v) => v.merged),
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
