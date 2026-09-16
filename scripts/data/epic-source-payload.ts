import {
  DATASET_LABEL,
  DOC_REPORT,
  DOC_STRUCTURE,
  METHODOLOGY,
  PERIOD_FY2026_H1,
  PERIOD_LABEL,
  SOURCE_TYPE_NARRATIVE,
  SOURCE_TYPE_OFFICIAL,
  SOURCE_TYPE_UNAVAILABLE,
} from "../../src/lib/epic-source/provenance";

export const sourceDocuments = [
  {
    code: DOC_STRUCTURE,
    filename: "Untitled document (2).docx",
    title: "EpiC DRC activity structure (objectives, activities, sub-activities)",
    source_type: SOURCE_TYPE_OFFICIAL,
    notes: "Authoritative activity codes and French titles provided by the EpiC DRC team.",
  },
  {
    code: DOC_REPORT,
    filename: "EpiC Semi-Annual Program Report DRC MNCH-N-Malaria.docx",
    title: "EpiC Semi-Annual Program Report DRC MNCH-N-Malaria (FY2026 H1)",
    source_type: SOURCE_TYPE_OFFICIAL,
    notes: "Semi-annual progress report submitted by FHI 360, 20 May 2026. Cooperative agreement 7200AA19CA00002.",
  },
];

export const programs = [
  {
    code: "EPIC_DRC",
    name: "Meeting Targets and Maintaining Epidemic Control (EpiC) — DRC",
    description:
      "EpiC DRC interventions across HIV, GHS, MNCH, nutrition, malaria, and COVID-19 funding streams, as documented in the FY2026 H1 semi-annual report.",
  },
];

export const objectives = [
  {
    code: "1",
    program_code: "EPIC_DRC",
    number: 1,
    title_fr:
      "Accroître l'adoption de comportements et de services en matière de santé maternelle, néonatale et infantile, de lutte contre le paludisme, de vaccination et de nutrition",
    title_en: null,
    source_document_code: DOC_STRUCTURE,
    source_section: "Objectif 1",
    is_verified: true,
  },
  {
    code: "2",
    program_code: "EPIC_DRC",
    number: 2,
    title_fr:
      "Renforcer la qualité des services vitaux de santé maternelle, néonatale et infantile, de nutrition et de lutte contre le paludisme aux points de prestation de services",
    title_en: null,
    source_document_code: DOC_STRUCTURE,
    source_section: "Objectif 2",
    is_verified: true,
  },
  {
    code: "3",
    program_code: "EPIC_DRC",
    number: 3,
    title_fr: "Renforcer les systèmes de santé pour accroître l’autonomie",
    title_en: null,
    source_document_code: DOC_STRUCTURE,
    source_section: "Objectif 3",
    is_verified: true,
  },
];

type Act = {
  code: string;
  objective_code: string;
  parent_code: string | null;
  level: "activity" | "sub_activity";
  title_fr: string;
  sort_order: number;
};

const A = (
  code: string,
  objective: string,
  parent: string | null,
  level: Act["level"],
  title_fr: string,
  sort_order: number,
): Act => ({ code, objective_code: objective, parent_code: parent, level, title_fr, sort_order });

export const activities: Act[] = [
  A("1.1", "1", null, "activity", "Accroître la sensibilisation et l'adoption, par les soignants et la communauté, des pratiques essentielles en matière de santé maternelle, néonatale et infantile, de paludisme, de vaccination et de nutrition", 110),
  A("1.1.2", "1", "1.1", "sub_activity", "Renforcer les capacités des agents de santé communautaires (ASC) en matière de conseil et de promotion de la santé.", 112),
  A("1.1.3", "1", "1.1", "sub_activity", "Mener des actions de sensibilisation et des dialogues communautaires afin de promouvoir l'adoption de comportements et de pratiques sains.", 113),
  A("1.1.4", "1", "1.1", "sub_activity", "Revitaliser et développer les plateformes de soutien pour favoriser la communication autour des actions nutritionnelles essentielles.", 114),
  A("1.1.5", "1", "1.1", "sub_activity", "Organiser des démonstrations culinaires pour sensibiliser le public à la diversité alimentaire et à l'alimentation complémentaire.", 115),
  A("1.1.6", "1", "1.1", "sub_activity", "Renforcer et mettre en œuvre le traitement préventif intermittent du paludisme pendant la grossesse (TPIp) à base communautaire avec la sulfadoxine-pyriméthamine (SP) par l'intermédiaire d'agents de santé communautaires formés.", 116),
  A("1.2", "1", null, "activity", "Développer les plateformes de gestion intégrée des cas communautaires (GICC) pour le paludisme, la pneumonie et la diarrhée dans les 9 provinces", 120),
  A("1.2.1", "1", "1.2", "sub_activity", "Soutenir les stratégies de sensibilisation avancées, notamment les cliniques mobiles, afin d'offrir des services complets de santé maternelle, néonatale et infantile aux villages isolés et mal desservis.", 121),
  A("1.2.2", "1", "1.2", "sub_activity", "Renforcer les activités communautaires de lutte contre le paludisme grâce à l’intensification de la prise en charge intégrée des maladies de l’enfant (PCIME), notamment par l’intégration d’interventions en matière d’alimentation du nourrisson et du jeune enfant (ANJE), la prise en charge spécifique des cas de paludisme chez les enfants jusqu’à 13 ans, le dépistage de la malnutrition aiguë et la fourniture de conseils nutritionnels.", 122),
  A("1.2.3", "1", "1.2", "sub_activity", "Étendre la couverture vaccinale.", 123),
  A("1.2.4", "1", "1.2", "sub_activity", "Soutenir les campagnes bisannuelles de supplémentation en vitamine A et de vermifugation.", 124),
  A("1.2.5", "1", "1.2", "sub_activity", "Sensibiliser les prestataires de services et les agents de santé communautaires à la revitalisation des consultations de suivi de la croissance, en mettant l'accent sur les soins préventifs et promotionnels pour les enfants de moins de cinq ans.", 125),
  A("1.3", "1", null, "activity", "Renforcer les liens entre la communauté et les installations", 130),
  A("1.3.1", "1", "1.3", "sub_activity", "Réaliser une cartographie des établissements de santé afin d'identifier les filières d'orientation des patients.", 131),
  A("1.3.2", "1", "1.3", "sub_activity", "Se coordonner avec CODESA, CAC et les réseaux religieux pour faciliter le transport en cas d'orientation d'urgence, lorsque cela est possible.", 132),
  A("1.3.3", "1", "1.3", "sub_activity", "Aider les ASC à utiliser les tickets de rappel (par exemple, la stratégie VIVA) pour suivre les références de la communauté aux établissements de santé.", 133),
  A("1.3.4", "1", "1.3", "sub_activity", "Renforcer les capacités au niveau communautaire pour stabiliser les patients en état critique en vue de leur transport d'urgence.", 134),
  A("1.3.5", "1", "1.3", "sub_activity", "Soutenir les sites iCCM pour améliorer la prise en charge communautaire des cas de paludisme grave", 135),
  A("1.3.6", "1", "1.3", "sub_activity", "Appuyer les agents de santé communautaires pour atteindre les femmes atteintes de paludisme grave et confrontées à des obstacles d'accès aux soins grâce à des systèmes de suivi et d'orientation proactifs afin de garantir la continuité des soins dans deux provinces à forte prévalence et à fort impact.", 136),
  A("2.1", "2", null, "activity", "Evaluer la capacité des établissements à fournir des services de soins obstétricaux et néonatals d'urgence (SONU) en établissement, à traiter la malnutrition aiguë sévère (MAS) et le paludisme.", 210),
  A("2.1.2", "2", "2.1", "sub_activity", "Tenir une réunion des parties prenantes pour examiner les données de l'évaluation (Activité 2.1.1) et élaborer des recommandations pour combler les lacunes dans la prestation de services vitaux (en conjonction avec l'Activité 3.1.2).", 212),
  A("2.2", "2", null, "activity", "Renforcer les capacités du personnel de santé en matière de services vitaux de santé maternelle, néonatale et infantile", 220),
  A("2.2.1", "2", "2.2", "sub_activity", "Rétablir les séances mensuelles intégrées de mentorat clinique.", 221),
  A("2.2.2", "2", "2.2", "sub_activity", "Soutenir les stages cliniques pour combler les lacunes dans les services de soins obstétricaux et néonatals d'urgence complets (CEmONC) dans les établissements prioritaires.", 222),
  A("2.2.3", "2", "2.2", "sub_activity", "Renforcer la capacité des prestataires de services au niveau des établissements à fournir des services de santé maternelle, néonatale et infantile, de nutrition et de lutte contre le paludisme conformément aux directives et protocoles les plus récents.", 223),
  A("2.2.4", "2", "2.2", "sub_activity", "Fournir une formation aux prestataires de soins de santé au niveau des établissements sur l'introduction du vaccin antipaludique et soutenir la distribution de dépliants d'information et les activités de sensibilisation communautaire.", 224),
  A("2.2.5", "2", "2.2", "sub_activity", "Soutenir le déploiement et renforcer la capacité des prestataires à mettre en œuvre le nouveau protocole de traitement de la malnutrition aiguë modérée.", 225),
  A("2.2.6", "2", "2.2", "sub_activity", "Soutenir le déploiement du dépistage de la tuberculose auprès des groupes à haut risque.", 226),
  A("2.2.8", "2", "2.2", "sub_activity", "Offrir aux prestataires de soins maternels une formation sur les douze étapes de l'Initiative internationale pour un accouchement normal et respectueux (IINA), afin de promouvoir des soins maternels respectueux et humanisés.", 228),
  A("2.2.9", "2", "2.2", "sub_activity", "Fournir aux prestataires de soins maternels une formation sur la prise en charge rapide des hémorragies post-partum.", 229),
  A("2.3", "2", null, "activity", "Soutien à la supervision intégrée", 230),
  A("2.3.1", "2", "2.3", "sub_activity", "Soutenir les visites mensuelles de supervision et de soutien intégrées effectuées par les équipes de la zone de santé dans toutes les installations soutenues par le projet.", 231),
  A("2.3.2", "2", "2.3", "sub_activity", "Soutenir les visites trimestrielles de supervision intégrée et de soutien effectuées par les équipes provinciales dans toutes les zones de santé soutenues par le projet", 232),
  A("3.1", "3", null, "activity", "Renforcer les systèmes de données sur la santé maternelle, néonatale et infantile, la nutrition et le paludisme afin d’améliorer la prise de décision programmatique", 310),
  A("3.1.2", "3", "3.1", "sub_activity", "Consultation des parties prenantes pour examiner les conclusions et élaborer des recommandations visant à renforcer le système de données (en lien avec l'activité 2.1.2)", 312),
  A("3.1.3", "3", "3.1", "sub_activity", "Élaborer un plan ciblé de renforcement des données", 313),
  A("3.1.4", "3", "3.1", "sub_activity", "Pérenniser et institutionnaliser le renforcement et l'utilisation des systèmes de données pour la prise de décision", 314),
  A("3.2", "3", null, "activity", "Évaluer et renforcer les systèmes de surveillance de la santé maternelle, néonatale et infantile, de la nutrition et du paludisme", 320),
  A("3.2.1", "3", "3.2", "sub_activity", "Évaluer et renforcer la fonctionnalité des systèmes de surveillance intégrés (maternelle, périnatale).", 321),
  A("3.2.2", "3", "3.2", "sub_activity", "Renforcer les capacités d’identification des cas de paralysie flasque aiguë (PFA) et de transport des échantillons au niveau communautaire.", 322),
  A("3.2.3", "3", "3.2", "sub_activity", "Soutenir le système de surveillance nutritionnelle et d'alerte précoce.", 323),
  A("3.3", "3", null, "activity", "Améliorer la chaîne d'approvisionnement des produits essentiels de santé maternelle, néonatale et infantile, de lutte contre le paludisme et de nutrition", 330),
  A("3.3.1", "3", "3.3", "sub_activity", "Examiner les plans de quantification, de prévision et d'approvisionnement couvrant les provinces et les établissements de santé ciblés, et identifier et suivre les ruptures de stock.", 331),
  A("3.3.2", "3", "3.3", "sub_activity", "Prévoir et identifier les besoins supplémentaires en matières premières pour les campagnes de soutien d'urgence.", 332),
  A("3.3.3", "3", "3.3", "sub_activity", "Mettre en œuvre des mesures ciblées d'approvisionnement et de distribution/transport provisoires.", 333),
  A("3.3.4", "3", "3.3", "sub_activity", "Renforcer la gestion de la chaîne d'approvisionnement infranationale pour remédier aux causes des ruptures de stock persistantes.", 334),
  A("3.3.5", "3", "3.3", "sub_activity", "Évaluer et contribuer à la mise en place de la chaîne d'approvisionnement pour le vaccin contre le paludisme.", 335),
  A("3.3.6", "3", "3.3", "sub_activity", "Renforcer l’utilisation rationnelle des médicaments et des services pharmaceutiques dans les établissements de santé.", 336),
  A("3.3.7", "3", "3.3", "sub_activity", "Améliorer la chaîne d'approvisionnement des produits de première nécessité.", 337),
  A("3.4", "3", null, "activity", "Coordination", 340),
  A("3.4.2", "3", "3.4", "sub_activity", "Évaluer et définir les priorités en matière d'intégration des activités liées au VIH.", 342),
  A("3.5", "3", null, "activity", "Renforcer les capacités et les systèmes de préparation aux situations d'urgence", 350),
  A("3.5.1", "3", "3.5", "sub_activity", "Évaluation de la préparation aux situations d'urgence du système de santé provincial dans 9 provinces prioritaires.", 351),
  A("3.5.2", "3", "3.5", "sub_activity", "Organiser des séances de recyclage dans les zones à faible couverture réseau.", 352),
  A("3.5.3", "3", "3.5", "sub_activity", "Appuyer le transport des échantillons vers le laboratoire de référence (9 provinces)", 353),
];

export const technicalAreas = [
  { code: "MNCH", name_en: "Maternal, Newborn, and Child Health", name_fr: "SMNI", sort_order: 1 },
  { code: "NUTRITION", name_en: "Nutrition", name_fr: "Nutrition", sort_order: 2 },
  { code: "MALARIA", name_en: "Malaria", name_fr: "Paludisme", sort_order: 3 },
  { code: "GHS", name_en: "Global Health Security", name_fr: "Sécurité sanitaire mondiale", sort_order: 4 },
];

export const reportingPeriods = [
  {
    code: PERIOD_FY2026_H1,
    fiscal_year: "FY2026",
    period_label: "H1",
    start_date: "2025-10-01",
    end_date: "2026-03-31",
    dataset_label: DATASET_LABEL,
    methodology: METHODOLOGY,
    source_document_code: DOC_REPORT,
    source_section: "Cover / Annex B methodology note",
    source_type: SOURCE_TYPE_OFFICIAL,
    is_verified: true,
  },
];

/** Provinces named in Docs and/or required by the existing reporting app. */
export const extraProvinces = [
  { name: "Kinshasa", code: "KIN" },
  { name: "Kongo Central", code: "KCE" },
  { name: "Kwango", code: "KWA" },
  { name: "Kwilu", code: "KWI" },
  { name: "Mai-Ndombe", code: "MAI" },
  { name: "Kasaï", code: "KAS" },
  { name: "Kasaï Central", code: "KCT" },
  { name: "Lualaba", code: "LUA" },
  { name: "Haut-Katanga", code: "HKA" },
  { name: "Lomami", code: "LOM" },
  { name: "Kasaï-Oriental", code: "KOR" },
  { name: "Équateur", code: "EQU" },
];

export const mnchProvinceCodes = ["HKA", "LUA", "LOM", "KOR"] as const;

export const healthZones: {
  code: string;
  name: string;
  provinceCode: string | null;
  province_assignment_status: "verified" | "not_available_in_source";
  source_section: string;
  notes?: string;
}[] = [
  { code: "KAFUBU", name: "Kafubu", provinceCode: "HKA", province_assignment_status: "verified", source_section: "III. Success Stories — iCCM Kamiseshi" },
  { code: "LUKAMU", name: "Lukamu", provinceCode: "KOR", province_assignment_status: "verified", source_section: "III. Success Stories — integrated supervision" },
  { code: "BIBANGA", name: "Bibanga", provinceCode: "KOR", province_assignment_status: "verified", source_section: "III. Success Stories — integrated supervision" },
  { code: "KATANDA_I", name: "Katanda I", provinceCode: "KOR", province_assignment_status: "verified", source_section: "III. Success Stories — integrated supervision" },
  { code: "DILALA", name: "Dilala", provinceCode: "LUA", province_assignment_status: "verified", source_section: "Annex C — individuals trained" },
  { code: "MANIKA", name: "Manika", provinceCode: "LUA", province_assignment_status: "verified", source_section: "Annex C — individuals trained" },
  { code: "BUNKEYA", name: "Bunkeya", provinceCode: "LUA", province_assignment_status: "verified", source_section: "Annex C — individuals trained" },
  { code: "FUNGURUME", name: "Fungurume", provinceCode: "LUA", province_assignment_status: "verified", source_section: "Annex C — individuals trained" },
  { code: "MASINA_1", name: "Masina 1", provinceCode: "KIN", province_assignment_status: "verified", source_section: "Annex C — outbreaks / Mpox / IPC" },
  { code: "KINGABWA", name: "Kingabwa", provinceCode: "KIN", province_assignment_status: "verified", source_section: "Annex C — surveillance / community engagement / IPC" },
  { code: "NSELE", name: "N'sele", provinceCode: "KIN", province_assignment_status: "verified", source_section: "Annex C — community cholera surveillance" },
  { code: "MALUKU_1", name: "Maluku 1", provinceCode: "KIN", province_assignment_status: "verified", source_section: "Annex C — community cholera surveillance" },
  { code: "GOMBE", name: "Gombe", provinceCode: "KIN", province_assignment_status: "verified", source_section: "Annex C — community engagement / IPC briefing" },
  { code: "KAKENGE", name: "Kakenge", provinceCode: null, province_assignment_status: "not_available_in_source", source_section: "Annex C — IPC trainings", notes: "Named as a health zone; province not stated in the source table." },
  { code: "MUSHENGE", name: "Mushenge", provinceCode: null, province_assignment_status: "not_available_in_source", source_section: "Annex C — IPC trainings", notes: "Named as a health zone; province not stated in the source table." },
  { code: "BULAPE", name: "Bulape", provinceCode: null, province_assignment_status: "not_available_in_source", source_section: "Annex C — EVD locations", notes: "Named as a location/HZ in Annex C; province not explicitly assigned in that matrix." },
  { code: "MWEKA", name: "Mweka", provinceCode: null, province_assignment_status: "not_available_in_source", source_section: "Annex C — EVD locations", notes: "Named as a location/HZ in Annex C; province not explicitly assigned in that matrix." },
];

export const namedLocations = [
  { code: "KAMISESHI_VILLAGE", name: "Kamiseshi village", location_type: "village", provinceCode: "HKA", health_zone_code: "KAFUBU", source_section: "III. Success Stories — iCCM Kamiseshi", notes: "Located more than 12 kilometers from the nearest health facility in Kafubu HZ." },
  { code: "CONGO_RIVER_CORRIDORS", name: "Congo River corridors", location_type: "corridor", provinceCode: null, health_zone_code: null, source_section: "Annex C — outbreaks / surveillance", notes: "Province not specified beyond corridor screening." },
  { code: "TSHIKAPA", name: "Tshikapa", location_type: "city", provinceCode: null, health_zone_code: null, source_section: "Annex C — individuals trained (journalists)", notes: "Named as journalist training location; province not stated in the matrix." },
];

export const matrixIndicators = [
  { code: "MAL_TEST", name: "% suspected cases tested", technical_area_code: "MALARIA", result_kind: "percentage" as const, numerator: 972866, denominator: 1006236, reported_percent: 96.7, comment: null },
  { code: "MAL_TX", name: '% confirmed cases treated "in accordance with the national policy"', technical_area_code: "MALARIA", result_kind: "percentage" as const, numerator: 559420, denominator: 645625, reported_percent: 86.6, comment: null },
  { code: "MAL_PW_IPTp", name: "IPTp coverage", technical_area_code: "MALARIA", result_kind: "percentage" as const, numerator: 107441, denominator: 169830, reported_percent: 63.3, comment: "The underperformance is due to the limited availability of SP in health facilities. The numerator comprises the number of pregnant women who received IPTp3 and the denominator comprises the number of pregnant women who attended the ANC1." },
  { code: "MAL_PW_ITNs", name: "ITN received at ANC 1", technical_area_code: "MALARIA", result_kind: "percentage" as const, numerator: 109144, denominator: 169830, reported_percent: 64.3, comment: "The underperformance is due to the stockouts of ITN in health facilities during the reporting period" },
  { code: "MCH_MENTOR", name: "Number of individuals receiving MCH mentorship", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 508, denominator: 1335, reported_percent: 38.1, comment: "The low performance is due to the delayed start of activity implementation." },
  { code: "MCH_FACBIR", name: "% facility-based deliveries", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 148965, denominator: 178798, reported_percent: 83.3, comment: null },
  { code: "MCH_POSTNATAL", name: "% newborns receiving postnatal care", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 135956, denominator: 151739, reported_percent: 89.6, comment: null },
  { code: "MCH_ANC1", name: "% first ANC visit (early)", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 95931, denominator: 178798, reported_percent: 53.7, comment: "The low performance is due to socioeconomic and educational constraints among women, as well as limited access caused by rural residence and geographic barriers." },
  { code: "MCH_UTERO", name: "% women receiving uterotonics", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 144804, denominator: 148965, reported_percent: 97.2, comment: "Performance remained high due to strong facility delivery coverage and availability of uterotonics in supported facilities." },
  { code: "NUT_CH_SBCFEED", name: "% children reached with SBC for IYCF", technical_area_code: "NUTRITION", result_kind: "percentage" as const, numerator: 745006, denominator: 915737, reported_percent: 81.4, comment: null },
  { code: "MCH_PNEUMO", name: "% childhood pneumonia cases treated", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 79665, denominator: 87113, reported_percent: 91.5, comment: null },
  { code: "MCH_DIAR", name: "% of childhood diarrhea cases treated", technical_area_code: "MNCH", result_kind: "percentage" as const, numerator: 65943, denominator: 78184, reported_percent: 84.3, comment: "The underperformance is due to stockouts of ORS and Zinc in health facilities" },
];

export const aggregateResults = [
  { code: "MNCH_ANC4", technical_area_code: "MNCH", name: "Pregnant women who completed at least four ANC visits", value: 102846, unit: "count", related_indicator_code: null, reported_percent: 57.5, notes: "Executive Summary / Key Results MNCH. Denominator for 57.5% is not stated as a distinct figure in the source." },
  { code: "MNCH_SKILLED_BIRTH", technical_area_code: "MNCH", name: "Skilled/facility-based birth deliveries", value: 148965, unit: "count", related_indicator_code: "MCH_FACBIR", reported_percent: 83.3, notes: "Matches Annex B MCH_FACBIR numerator." },
  { code: "MNCH_PNC", technical_area_code: "MNCH", name: "Newborns who received postnatal care", value: 135956, unit: "count", related_indicator_code: "MCH_POSTNATAL", reported_percent: 89.6, notes: "Matches Annex B MCH_POSTNATAL numerator." },
  { code: "MNCH_DIARRHEA_TREATED", technical_area_code: "MNCH", name: "Childhood diarrhea cases treated", value: 65943, unit: "count", related_indicator_code: "MCH_DIAR", reported_percent: null, notes: "Matches Annex B MCH_DIAR numerator." },
  { code: "MNCH_PENTA3", technical_area_code: "MNCH", name: "Children under 12 months who received three doses of pentavalent vaccine", value: 148345, unit: "count", related_indicator_code: null, reported_percent: 95.1, notes: "Executive Summary / Key Results MNCH. Denominator for 95.1% is not stated as a distinct figure in the source." },
  { code: "MNCH_CATCHUP_VACC", technical_area_code: "MNCH", name: "Additional children reached through catch-up vaccination led by RECOs", value: 1567, unit: "count", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "MNCH_PROVIDERS_MENTORED", technical_area_code: "MNCH", name: "Health providers capacitated through training and mentorship in childbirth care and neonatal resuscitation", value: 508, unit: "count", related_indicator_code: "MCH_MENTOR", reported_percent: null, notes: "Matches Annex B MCH_MENTOR numerator." },
  { code: "NUT_VITAMIN_A", technical_area_code: "NUTRITION", name: "Children under five who received Vitamin A supplementation and deworming", value: 2496124, unit: "count", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "NUT_LNS_SACHETS", technical_area_code: "NUTRITION", name: "Lipid-based Nutrient Supplement (LNS) sachets distributed", value: 187200, unit: "sachets", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "NUT_LNS_CHILDREN", technical_area_code: "NUTRITION", name: "Children aged 6–24 months reached with LNS", value: 11118, unit: "count", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "NUT_MNP_SACHETS", technical_area_code: "NUTRITION", name: "Micronutrient powder sachets distributed", value: 486800, unit: "sachets", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "NUT_MNP_PBW", technical_area_code: "NUTRITION", name: "Pregnant and breastfeeding women reached with MNP", value: 2000, unit: "count", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "MAL_SUSPECTED", technical_area_code: "MALARIA", name: "Suspected malaria cases", value: 1006236, unit: "count", related_indicator_code: "MAL_TEST", reported_percent: null, notes: "Matches Annex B MAL_TEST denominator." },
  { code: "MAL_TESTED", technical_area_code: "MALARIA", name: "Suspected malaria cases tested", value: 972866, unit: "count", related_indicator_code: "MAL_TEST", reported_percent: null, notes: "Matches Annex B MAL_TEST numerator." },
  { code: "MAL_CONFIRMED", technical_area_code: "MALARIA", name: "Confirmed malaria cases", value: 645625, unit: "count", related_indicator_code: "MAL_TX", reported_percent: null, notes: "Matches Annex B MAL_TX denominator." },
  { code: "MAL_TREATED_ACT", technical_area_code: "MALARIA", name: "Confirmed malaria cases treated with ACT", value: 559420, unit: "count", related_indicator_code: "MAL_TX", reported_percent: null, notes: "Matches Annex B MAL_TX numerator." },
  { code: "MAL_ICCM_SITES", technical_area_code: "MALARIA", name: "iCCM sites strengthened/equipped", value: 1372, unit: "sites", related_indicator_code: null, reported_percent: null, notes: null },
  { code: "MAL_LLIN_PW", technical_area_code: "MALARIA", name: "LLINs distributed to pregnant women", value: 120414, unit: "count", related_indicator_code: null, reported_percent: null, notes: "Narrative Key Results Malaria; distinct from Annex B MAL_PW_ITNs numerator (109,144 ITNs received at ANC 1)." },
  { code: "MAL_IPTP3_PW", technical_area_code: "MALARIA", name: "Pregnant women who received IPTp3", value: 107441, unit: "count", related_indicator_code: "MAL_PW_IPTp", reported_percent: null, notes: "Matches Annex B MAL_PW_IPTp numerator." },
];

export const ghsIndicators = [
  { code: "GHS_OUTBREAKS", name: "# of emerging infectious disease outbreaks responded to with DOS support", sort_order: 1 },
  { code: "GHS_TRAINED", name: "# of individuals trained with DoS support to prevent, detect, and respond to emerging infectious disease threats", sort_order: 2 },
  { code: "GHS_SURVEILLANCE", name: "# of DOS-supported surveillance activities implemented", sort_order: 3 },
  { code: "GHS_EMCE_MATERIALS", name: "# of evidence-based EMCE communication materials developed", sort_order: 4 },
  { code: "GHS_COMMUNITY_ENGAGEMENT", name: "# of large-scale community engagement events where numbers are estimated", sort_order: 5 },
  { code: "GHS_LABS", name: "# of laboratories supported by DOS that can test priority pathogens", sort_order: 6 },
  { code: "GHS_BIOSECURITY", name: "# of DOS-supported laboratory biosafety and biosecurity interventions implemented", sort_order: 7 },
  { code: "GHS_IPC_FACILITIES", name: "# of healthcare facilities supported by DOS to meet IPC requirements", sort_order: 8 },
  { code: "GHS_ZOONOTIC", name: "# of DOS-supported interventions to reduce the risk of zoonotic spillover", sort_order: 9 },
];

export const ghsResults = [
  {
    ghs_indicator_code: "GHS_OUTBREAKS",
    total_value: 2,
    total_is_minimum: false,
    male_count: null as number | null,
    female_count: null as number | null,
    not_specified_count: 2,
    sex_breakdown_status: "not_provided",
    planned_later: false,
    notes: "Diseases covered: Cholera, EVD/Ebola, Mpox. Locations: Congo River corridors, Bulape, Mweka, Masina 1.",
  },
  {
    ghs_indicator_code: "GHS_TRAINED",
    total_value: 1271,
    total_is_minimum: false,
    male_count: 857,
    female_count: 249,
    not_specified_count: 165,
    sex_breakdown_status: "approximate",
    planned_later: false,
    notes: "Annex C reports approximate sex totals (~857 male / ~249 female / ~165 not specified). Documented activity breakdowns do not sum to 1,271; the missing remainder is not specified in the source.",
  },
  {
    ghs_indicator_code: "GHS_SURVEILLANCE",
    total_value: 7,
    total_is_minimum: false,
    male_count: null,
    female_count: null,
    not_specified_count: 7,
    sex_breakdown_status: "not_provided",
    planned_later: false,
    notes: null,
  },
  {
    ghs_indicator_code: "GHS_EMCE_MATERIALS",
    total_value: 6860,
    total_is_minimum: false,
    male_count: null,
    female_count: null,
    not_specified_count: 6860,
    sex_breakdown_status: "not_provided",
    planned_later: false,
    notes: "6,860 standardized tools (EVD prevention + SDB) in French and Tshiluba, plus 16,000 data collection tools distributed at checkpoints (recorded as a related detail, not added into the 6,860 total).",
  },
  {
    ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT",
    total_value: 15,
    total_is_minimum: true,
    male_count: null,
    female_count: null,
    not_specified_count: 15,
    sex_breakdown_status: "not_provided",
    planned_later: false,
    notes: "Source reports ≥15 events. Reach figures in details are estimates as stated in Annex C.",
  },
  {
    ghs_indicator_code: "GHS_LABS",
    total_value: 0,
    total_is_minimum: false,
    male_count: null,
    female_count: null,
    not_specified_count: null,
    sex_breakdown_status: "not_provided",
    planned_later: true,
    notes: "Planned for H2 FY26 – Objective 3 activities scheduled for the second half of FY2026.",
  },
  {
    ghs_indicator_code: "GHS_BIOSECURITY",
    total_value: 0,
    total_is_minimum: false,
    male_count: null,
    female_count: null,
    not_specified_count: null,
    sex_breakdown_status: "not_provided",
    planned_later: true,
    notes: "Planned for H2 FY26 – Objective 3 activities scheduled for the second half of FY2026.",
  },
  {
    ghs_indicator_code: "GHS_IPC_FACILITIES",
    total_value: 6,
    total_is_minimum: true,
    male_count: null,
    female_count: null,
    not_specified_count: 6,
    sex_breakdown_status: "not_provided",
    planned_later: false,
    notes: "Source reports at least 6 healthcare facilities.",
  },
  {
    ghs_indicator_code: "GHS_ZOONOTIC",
    total_value: 1,
    total_is_minimum: false,
    male_count: null,
    female_count: null,
    not_specified_count: 1,
    sex_breakdown_status: "not_provided",
    planned_later: false,
    notes: "Kinshasa: training of 50 call center operators on One Health, zoonoses, and infodemic management.",
  },
];

export const ghsDetails = [
  { code: "GHS_OUT_DISEASE_CHOLERA", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "disease", label: "Cholera", value: null as number | null },
  { code: "GHS_OUT_DISEASE_EVD", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "disease", label: "EVD/Ebola", value: null },
  { code: "GHS_OUT_DISEASE_MPOX", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "disease", label: "Mpox", value: null },
  { code: "GHS_OUT_LOC_CONGO", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "location", label: "Congo River corridors", value: null, location_code: "CONGO_RIVER_CORRIDORS" },
  { code: "GHS_OUT_LOC_BULAPE", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "location", label: "Bulape", value: null, health_zone_code: "BULAPE" },
  { code: "GHS_OUT_LOC_MWEKA", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "location", label: "Mweka", value: null, health_zone_code: "MWEKA" },
  { code: "GHS_OUT_LOC_MASINA1", ghs_indicator_code: "GHS_OUTBREAKS", detail_type: "location", label: "Masina 1", value: null, health_zone_code: "MASINA_1" },

  { code: "GHS_TRN_74_CONGO", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "74 frontline responders — Congo corridor", value: 74, location_code: "CONGO_RIVER_CORRIDORS", sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_165_KIN", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "165 providers/hygienists — Kinshasa", value: 165, provinceCode: "KIN", sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_287_LUA", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "287 responders — Dilala, Manika, Bunkeya, Fungurume", value: 287, provinceCode: "LUA", sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_80_IPC", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "80 IPC healthcare providers (Kakenge 27M/9F; Mushenge 31M/13F)", value: 80, male_count: 58, female_count: 22, sex_breakdown_status: "verified" },
  { code: "GHS_TRN_105_SDB", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "105 Red Cross SDB volunteers — Bulape", value: 105, male_count: 85, female_count: 18, unknown_sex_count: 2, health_zone_code: "BULAPE", sex_breakdown_status: "verified" },
  { code: "GHS_TRN_168_VHF", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "168 VHF RCCE participants — Bulape", value: 168, health_zone_code: "BULAPE", sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_60_LUA", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "60 cholera/IPC responders — Lualaba", value: 60, male_count: 50, female_count: 10, provinceCode: "LUA", sex_breakdown_status: "verified" },
  { code: "GHS_TRN_82_MPOX", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "82 Mpox SBC community health workers — Masina 1", value: 82, health_zone_code: "MASINA_1", sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_50_CALL", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "50 call center operators", value: 50, sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_15_JOURN", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "15 journalists — Tshikapa", value: 15, location_code: "TSHIKAPA", sex_breakdown_status: "not_provided" },
  { code: "GHS_TRN_82_RCCE", ghs_indicator_code: "GHS_TRAINED", detail_type: "training_breakdown", label: "82 fluvial RCCE actors — Kingabwa", value: 82, health_zone_code: "KINGABWA", sex_breakdown_status: "not_provided" },

  { code: "GHS_SURV_CHECKPOINTS", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "20 checkpoints / 10 ports — >30,600 travelers screened per week", value: 20, notes: "Traveler screening volume is reported as greater than 30,600 per week; exact weekly count not provided." },
  { code: "GHS_SURV_CHOLERA_ALERTS", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Community cholera alerts (Kingabwa, Masina 1, N'sele, Maluku 1)", value: 158 },
  { code: "GHS_SURV_CHOLERA_REFERRED", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Community cholera alerts referred", value: 120 },
  { code: "GHS_SURV_CONTACTS", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Active contacts", value: 50 },
  { code: "GHS_SURV_SUSPECTED", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Suspected", value: 40 },
  { code: "GHS_SURV_CONFIRMED", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Confirmed", value: 63 },
  { code: "GHS_SURV_RECOVERED", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Recovered", value: 105 },
  { code: "GHS_SURV_DEATHS", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Deaths", value: 14 },
  { code: "GHS_SURV_MISSIONS", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Provincial supervision missions", value: 8 },
  { code: "GHS_SURV_PORTS", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Screening at river ports (Congo corridor)", value: null, location_code: "CONGO_RIVER_CORRIDORS" },
  { code: "GHS_SURV_EVD", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "EVD surveillance (Mweka, Bulape)", value: null },
  { code: "GHS_SURV_MPOX", ghs_indicator_code: "GHS_SURVEILLANCE", detail_type: "surveillance", label: "Mpox surveillance (Masina 1)", value: null, health_zone_code: "MASINA_1" },

  { code: "GHS_EMCE_6860", ghs_indicator_code: "GHS_EMCE_MATERIALS", detail_type: "materials", label: "6,860 standardized tools (EVD prevention + SDB) in French and Tshiluba", value: 6860 },
  { code: "GHS_EMCE_16000", ghs_indicator_code: "GHS_EMCE_MATERIALS", detail_type: "materials", label: "16,000 data collection tools distributed at checkpoints", value: 16000 },

  { code: "GHS_CE_EVENTS", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "Large-scale community engagement events", value: 15, value_is_minimum: true },
  { code: "GHS_CE_10000", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: ">10,000 community members sensitized — EVD (Mweka, Bulape)", value: 10000, value_is_minimum: true },
  { code: "GHS_CE_HH", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "House-to-house visits >5,000 households (Mweka, Bulape)", value: 5000, value_is_minimum: true },
  { code: "GHS_CE_4303", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "4,303 key influencers briefed (Mweka, Bulape)", value: 4303 },
  { code: "GHS_CE_KIN_IND", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "Kinshasa campaign — 44,500 individuals", value: 44500, provinceCode: "KIN" },
  { code: "GHS_CE_KIN_HH", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "Kinshasa campaign — 98,000 households", value: 98000, provinceCode: "KIN" },
  { code: "GHS_CE_KIN_PUB", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "Kinshasa campaign — 27,000 public spaces", value: 27000, provinceCode: "KIN" },
  { code: "GHS_CE_400", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "400 community leaders sensitized (Kingabwa, Masina 1, N'sele, Maluku 1)", value: 400 },
  { code: "GHS_CE_300", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: ">300 stakeholders briefed (Mushenge, Kakenge)", value: 300, value_is_minimum: true },
  { code: "GHS_CE_55", ghs_indicator_code: "GHS_COMMUNITY_ENGAGEMENT", detail_type: "engagement", label: "55 multi-sectoral actors briefed (Gombe)", value: 55, health_zone_code: "GOMBE" },

  { code: "GHS_IPC_KAKENGE_MUSHENGE", ghs_indicator_code: "GHS_IPC_FACILITIES", detail_type: "ipc", label: "IPC trainings in Kakenge and Mushenge health zones", value: null },
  { code: "GHS_IPC_SCORECARD", ghs_indicator_code: "GHS_IPC_FACILITIES", detail_type: "ipc", label: "IPC Scorecard assessments in cholera treatment facilities (Lualaba)", value: null, provinceCode: "LUA" },
  { code: "GHS_IPC_BRIEF_4HZ", ghs_indicator_code: "GHS_IPC_FACILITIES", detail_type: "ipc", label: "IPC briefings (Kingabwa, Masina 1, N'sele, Maluku 1) — 110 providers / 4 HZ", value: 110, notes: "110 providers across 4 health zones." },
  { code: "GHS_IPC_GOMBE", ghs_indicator_code: "GHS_IPC_FACILITIES", detail_type: "ipc", label: "IPC briefing in Gombe involving 55 actors", value: 55, health_zone_code: "GOMBE" },

  { code: "GHS_ZOO_CALL", ghs_indicator_code: "GHS_ZOONOTIC", detail_type: "zoonotic", label: "Training of 50 call center operators on One Health, zoonoses, and infodemic management", value: 50, provinceCode: "KIN" },
];

export const fieldRecords = [
  {
    code: "KAMISESHI_ICCM_FY2026_H1",
    record_type: "success_story",
    title: "Revitalizing an integrated community care site for malaria services in Haut-Katanga",
    body: "In Kamiseshi village, located more than 12 kilometers from the nearest health facility in Kafubu HZ, families faced major challenges accessing timely healthcare services. Children with fever and pregnant women often depended on self-medication or traditional remedies due to the distance and cost of travel, increasing the risk of severe malaria and preventable deaths in the community. To help close this gap, the EpiC project revitalized an iCCM site that had previously been established under earlier USG-supported programs. EpiC supported the site through the provision of malaria commodities, management tools, essential equipment, and regular supportive supervision for RECOs. Following the revitalization, community-based service delivery quickly resumed. Between February-March, the iCCM site managed 58 children under 13 years of age according to national malaria treatment guidelines. Among them, 48 children presented with fever, 32 tested positive for malaria, and all confirmed cases received appropriate treatment.",
    timeframe_label: "February–March 2026",
    metrics: {
      children_under_13_managed: 58,
      presented_with_fever: 48,
      tested_positive_malaria: 32,
      confirmed_cases_treated: 32,
    },
    provinceCode: "HKA",
    health_zone_code: "KAFUBU",
    location_code: "KAMISESHI_VILLAGE",
    source_section: "III. Success Stories — Revitalizing Integrated Community care site for Malaria Services provision in Haut-Katanga",
    notes: "Narrative case from the official report. No additional patient-level records are provided in the source.",
  },
  {
    code: "KASAI_ORIENTAL_SUPERVISION_FY2026_H1",
    record_type: "success_story",
    title: "Integrated supervision as a driver of quality improvement and community engagement",
    body: "In Kasaï-Oriental, integrated supervision has evolved from a routine monitoring activity into a high-impact quality improvement approach aligned with national Integrated Health Area (IHA) priorities. Through joint MoH-EpiC supervision missions in Lukamu, Bibanga, and Katanda I, provincial health teams, in close collaboration with the MoH, provided structured on-the-job mentorship focused on service quality, data use, and adherence to clinical standards.",
    timeframe_label: PERIOD_LABEL,
    metrics: {},
    provinceCode: "KOR",
    health_zone_code: null,
    location_code: null,
    source_section: "III. Success Stories — Integrated supervision",
    notes: "Named health zones Lukamu, Bibanga, and Katanda I are stored as health_zones; no facility-level results are provided.",
  },
  {
    code: "VITAMIN_A_CAMPAIGN_FY2026_H1",
    record_type: "success_story",
    title: "Community-driven Vitamin A supplementation through awareness and engagement",
    body: "EpiC supported the provinces in implementing large-scale awareness and service delivery campaigns to increase Vitamin A supplementation among children under five. During the reporting period, more than 2.4 million children received Vitamin A supplementation, reflecting both improved commodity availability and increased community uptake.",
    timeframe_label: PERIOD_LABEL,
    metrics: { children_vitamin_a: 2496124 },
    provinceCode: null,
    health_zone_code: null,
    location_code: null,
    source_section: "III. Success Stories — Community-driven Vitamin A supplementation",
    notes: "Count aligns with the Key Results Nutrition figure of 2,496,124 children under five.",
  },
];

export const sourceGaps = [
  { code: "GAP_76_HZ_NAMES", topic: "Names of all 76 Health Zones", reason: "The report states coverage of 76 Health Zones but does not list the 76 names." },
  { code: "GAP_FACILITY_LIST", topic: "Facility names", reason: "No complete facility list is provided in the source documents." },
  { code: "GAP_MONTHLY_VALUES", topic: "Monthly indicator values", reason: "Annex B provides H1 aggregates, not month-by-month results." },
  { code: "GAP_PROVINCE_SPLIT", topic: "Province-disaggregated indicator numerators/denominators", reason: "MNCH/Nutrition/Malaria matrix values are four-province aggregates only." },
  { code: "GAP_GPS", topic: "GPS coordinates", reason: "Not provided in the source documents." },
  { code: "GAP_PATIENTS", topic: "Individual beneficiary or patient records", reason: "Only aggregate and one iCCM site narrative case (58 children) is documented." },
  { code: "GAP_TARGETS", topic: "Indicator targets", reason: "Annex B does not provide target values distinct from numerators/denominators." },
];

export { DATASET_LABEL, DOC_REPORT, DOC_STRUCTURE, PERIOD_FY2026_H1, PERIOD_LABEL, SOURCE_TYPE_NARRATIVE, SOURCE_TYPE_OFFICIAL, SOURCE_TYPE_UNAVAILABLE, METHODOLOGY };
