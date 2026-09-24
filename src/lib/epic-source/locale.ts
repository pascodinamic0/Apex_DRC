import type { loadProgramDataset } from "@/lib/epic-source/queries";

type Dataset = Awaited<ReturnType<typeof loadProgramDataset>>;
type Lang = "fr" | "en";

const DATASET_LABEL_FR = "EpiC RDC AF2026 S1 — Données de rapport issues de la source";

const METHODOLOGY_FR = [
  "Les données SMNI, nutrition et paludisme ont été extraites du système national de notification de la RDC.",
  "Elles couvrent quatre provinces (Haut-Katanga, Lualaba, Lomami et Kasaï-Oriental) et 76 zones de santé où les activités EpiC avaient démarré pendant la période.",
  "Les données de février et mars 2026 ont été validées par le ministère de la Santé.",
  "Le plan de travail du projet a été approuvé fin janvier 2026.",
  "Cette période correspond à la phase initiale de démarrage et ne doit pas être lue comme des résultats de mise en œuvre complète.",
].join(" ");

const indicators: Record<string, { name: string; comment?: string }> = {
  MAL_TEST: { name: "% de cas suspects testés" },
  MAL_TX: { name: "% de cas confirmés traités conformément à la politique nationale" },
  MAL_PW_IPTp: {
    name: "Couverture du TPIg",
    comment:
      "La sous-performance s’explique par la faible disponibilité de SP dans les formations sanitaires. Le numérateur est le nombre de femmes enceintes ayant reçu le TPIg3 ; le dénominateur est le nombre de femmes enceintes vues en CPN1.",
  },
  MAL_PW_ITNs: {
    name: "MILD reçue à la CPN 1",
    comment: "La sous-performance s’explique par les ruptures de stock de MILD dans les formations sanitaires pendant la période.",
  },
  MCH_MENTOR: {
    name: "Nombre de personnes ayant reçu un mentorat SMNI",
    comment: "La faible performance s’explique par le démarrage tardif de la mise en œuvre.",
  },
  MCH_FACBIR: { name: "% d’accouchements en établissement" },
  MCH_POSTNATAL: { name: "% de nouveau-nés ayant reçu des soins postnatals" },
  MCH_ANC1: {
    name: "% de premières visites CPN (précoces)",
    comment:
      "La faible performance s’explique par des contraintes socio-économiques et éducatives chez les femmes, ainsi que par un accès limité lié au milieu rural et aux barrières géographiques.",
  },
  MCH_UTERO: {
    name: "% de femmes ayant reçu des utérotoniques",
    comment:
      "La performance est restée élevée grâce à une bonne couverture des accouchements en établissement et à la disponibilité des utérotoniques dans les structures appuyées.",
  },
  NUT_CH_SBCFEED: { name: "% d’enfants atteints par la CCSC pour l’ANJE" },
  MCH_PNEUMO: { name: "% de cas de pneumonie infantile traités" },
  MCH_DIAR: {
    name: "% de cas de diarrhée infantile traités",
    comment: "La sous-performance s’explique par les ruptures de stock de SRO et de zinc dans les formations sanitaires.",
  },
};

const aggregates: Record<string, { name: string; notes?: string }> = {
  MNCH_ANC4: {
    name: "Femmes enceintes ayant effectué au moins quatre visites CPN",
    notes: "Résumé / résultats clés SMNI. Le dénominateur des 57,5 % n’est pas donné comme chiffre distinct dans la source.",
  },
  MNCH_SKILLED_BIRTH: {
    name: "Accouchements assistés / en établissement",
    notes: "Correspond au numérateur de l’annexe B, indicateur MCH_FACBIR.",
  },
  MNCH_PNC: {
    name: "Nouveau-nés ayant reçu des soins postnatals",
    notes: "Correspond au numérateur de l’annexe B, indicateur MCH_POSTNATAL.",
  },
  MNCH_DIARRHEA_TREATED: {
    name: "Cas de diarrhée infantile traités",
    notes: "Correspond au numérateur de l’annexe B, indicateur MCH_DIAR.",
  },
  MNCH_PENTA3: {
    name: "Enfants de moins de 12 mois ayant reçu trois doses de vaccin pentavalent",
    notes: "Résumé / résultats clés SMNI. Le dénominateur des 95,1 % n’est pas donné comme chiffre distinct dans la source.",
  },
  MNCH_CATCHUP_VACC: {
    name: "Enfants supplémentaires atteints par la vaccination de rattrapage menée par les RECO",
  },
  MNCH_PROVIDERS_MENTORED: {
    name: "Prestataires formés et mentorés sur les soins à l’accouchement et la réanimation néonatale",
    notes: "Correspond au numérateur de l’annexe B, indicateur MCH_MENTOR.",
  },
  NUT_VITAMIN_A: { name: "Enfants de moins de cinq ans ayant reçu la vitamine A et le déparasitage" },
  NUT_LNS_SACHETS: { name: "Sachets d’aliment nutritionnel à base lipidique (LNS) distribués" },
  NUT_LNS_CHILDREN: { name: "Enfants de 6 à 24 mois atteints par le LNS" },
  NUT_MNP_SACHETS: { name: "Sachets de poudre de micronutriments distribués" },
  NUT_MNP_PBW: { name: "Femmes enceintes et allaitantes atteintes par les poudres de micronutriments" },
  MAL_SUSPECTED: { name: "Cas suspects de paludisme", notes: "Correspond au dénominateur de l’annexe B, indicateur MAL_TEST." },
  MAL_TESTED: { name: "Cas suspects de paludisme testés", notes: "Correspond au numérateur de l’annexe B, indicateur MAL_TEST." },
  MAL_CONFIRMED: { name: "Cas de paludisme confirmés", notes: "Correspond au dénominateur de l’annexe B, indicateur MAL_TX." },
  MAL_TREATED_ACT: { name: "Cas confirmés traités par ACT", notes: "Correspond au numérateur de l’annexe B, indicateur MAL_TX." },
  MAL_ICCM_SITES: { name: "Sites de PCIME-C renforcés ou équipés" },
  MAL_LLIN_PW: {
    name: "MILD distribuées aux femmes enceintes",
    notes: "Résultats clés paludisme. Distinct du numérateur de l’annexe B MAL_PW_ITNs (109 144 MILD reçues à la CPN 1).",
  },
  MAL_IPTP3_PW: { name: "Femmes enceintes ayant reçu le TPIg3", notes: "Correspond au numérateur de l’annexe B, indicateur MAL_PW_IPTp." },
};

const ghs: Record<string, { name: string; notes?: string }> = {
  GHS_OUTBREAKS: {
    name: "Nombre de flambées de maladies infectieuses émergentes auxquelles il a été répondu avec l’appui du DOS",
    notes: "Maladies couvertes : choléra, MVE/Ebola, mpox. Lieux : corridors du fleuve Congo, Bulape, Mweka, Masina 1.",
  },
  GHS_TRAINED: {
    name: "Nombre de personnes formées avec l’appui du DOS pour prévenir, détecter et riposter aux menaces de maladies infectieuses émergentes",
    notes: "L’annexe C donne des totaux approximatifs par sexe (~857 hommes / ~249 femmes / ~165 non spécifié). Les ventilations par activité ne totalisent pas 1 271 ; le reliquat n’est pas précisé dans la source.",
  },
  GHS_SURVEILLANCE: { name: "Nombre d’activités de surveillance appuyées par le DOS" },
  GHS_EMCE_MATERIALS: {
    name: "Nombre de supports de communication fondés sur des données probantes élaborés",
    notes: "6 860 outils standardisés (prévention de la MVE + inhumation sécurisée et digne) en français et en tshiluba, plus 16 000 outils de collecte distribués aux points de contrôle (détail associé, non ajouté au total de 6 860).",
  },
  GHS_COMMUNITY_ENGAGEMENT: {
    name: "Nombre d’événements communautaires de grande ampleur dont les effectifs sont estimés",
    notes: "La source indique au moins 15 événements. Les chiffres de portée dans les détails sont des estimations, comme indiqué à l’annexe C.",
  },
  GHS_LABS: {
    name: "Nombre de laboratoires appuyés par le DOS capables de tester les pathogènes prioritaires",
    notes: "Prévu au 2e semestre AF2026 — activités de l’objectif 3 programmées pour la seconde moitié de l’exercice.",
  },
  GHS_BIOSECURITY: {
    name: "Nombre d’interventions de biosécurité et de biosûreté de laboratoire appuyées par le DOS",
    notes: "Prévu au 2e semestre AF2026 — activités de l’objectif 3 programmées pour la seconde moitié de l’exercice.",
  },
  GHS_IPC_FACILITIES: {
    name: "Nombre de formations sanitaires appuyées par le DOS pour atteindre les exigences de PCI",
    notes: "La source indique au moins 6 formations sanitaires.",
  },
  GHS_ZOONOTIC: {
    name: "Nombre d’interventions appuyées par le DOS pour réduire le risque de passage zoonotique",
    notes: "Kinshasa : formation de 50 opérateurs de centre d’appel sur Une seule santé, les zoonoses et la gestion de l’infodémie.",
  },
};

const ghsDetails: Record<string, string> = {
  GHS_OUT_DISEASE_CHOLERA: "Choléra",
  GHS_OUT_DISEASE_EVD: "MVE / Ebola",
  GHS_OUT_DISEASE_MPOX: "Mpox",
  GHS_OUT_LOC_CONGO: "Corridors du fleuve Congo",
  GHS_OUT_LOC_BULAPE: "Bulape",
  GHS_OUT_LOC_MWEKA: "Mweka",
  GHS_OUT_LOC_MASINA1: "Masina 1",
  GHS_TRN_74_CONGO: "74 intervenants de première ligne — corridor du Congo",
  GHS_TRN_165_KIN: "165 prestataires / hygiénistes — Kinshasa",
  GHS_TRN_287_LUA: "287 intervenants — Dilala, Manika, Bunkeya, Fungurume",
  GHS_TRN_80_IPC: "80 prestataires formés en PCI (Kakenge 27 H / 9 F ; Mushenge 31 H / 13 F)",
  GHS_TRN_105_SDB: "105 volontaires Croix-Rouge pour l’inhumation sécurisée — Bulape",
  GHS_TRN_168_VHF: "168 participants CREC fièvres hémorragiques virales — Bulape",
  GHS_TRN_60_LUA: "60 intervenants choléra / PCI — Lualaba",
  GHS_TRN_82_MPOX: "82 agents de santé communautaires CCSC mpox — Masina 1",
  GHS_TRN_50_CALL: "50 opérateurs de centre d’appel",
  GHS_TRN_15_JOURN: "15 journalistes — Tshikapa",
  GHS_TRN_82_RCCE: "82 acteurs CREC fluviaux — Kingabwa",
  GHS_SURV_CHECKPOINTS: "20 points de contrôle / 10 ports — plus de 30 600 voyageurs dépistés par semaine",
  GHS_SURV_CHOLERA_ALERTS: "Alertes communautaires choléra (Kingabwa, Masina 1, N’sele, Maluku 1)",
  GHS_SURV_CHOLERA_REFERRED: "Alertes communautaires choléra référées",
  GHS_SURV_CONTACTS: "Contacts actifs",
  GHS_SURV_SUSPECTED: "Cas suspects",
  GHS_SURV_CONFIRMED: "Cas confirmés",
  GHS_SURV_RECOVERED: "Guéris",
  GHS_SURV_DEATHS: "Décès",
  GHS_SURV_MISSIONS: "Missions de supervision provinciale",
  GHS_SURV_PORTS: "Dépistage aux ports fluviaux (corridor du Congo)",
  GHS_SURV_EVD: "Surveillance MVE (Mweka, Bulape)",
  GHS_SURV_MPOX: "Surveillance mpox (Masina 1)",
  GHS_EMCE_6860: "6 860 outils standardisés (prévention MVE + inhumation sécurisée) en français et en tshiluba",
  GHS_EMCE_16000: "16 000 outils de collecte distribués aux points de contrôle",
  GHS_CE_EVENTS: "Événements communautaires de grande ampleur",
  GHS_CE_10000: "Plus de 10 000 membres de la communauté sensibilisés — MVE (Mweka, Bulape)",
  GHS_CE_HH: "Visites porte-à-porte, plus de 5 000 ménages (Mweka, Bulape)",
  GHS_CE_4303: "4 303 influenceurs clés briefés (Mweka, Bulape)",
  GHS_CE_KIN_IND: "Campagne de Kinshasa — 44 500 personnes",
  GHS_CE_KIN_HH: "Campagne de Kinshasa — 98 000 ménages",
  GHS_CE_KIN_PUB: "Campagne de Kinshasa — 27 000 espaces publics",
  GHS_CE_400: "400 leaders communautaires sensibilisés (Kingabwa, Masina 1, N’sele, Maluku 1)",
  GHS_CE_300: "Plus de 300 parties prenantes briefées (Mushenge, Kakenge)",
  GHS_CE_55: "55 acteurs multisectoriels briefés (Gombe)",
  GHS_IPC_KAKENGE_MUSHENGE: "Formations PCI dans les zones de santé de Kakenge et Mushenge",
  GHS_IPC_SCORECARD: "Évaluations par fiche PCI dans les structures de traitement du choléra (Lualaba)",
  GHS_IPC_BRIEF_4HZ: "Briefings PCI (Kingabwa, Masina 1, N’sele, Maluku 1) — 110 prestataires / 4 ZS",
  GHS_IPC_GOMBE: "Briefing PCI à Gombe avec 55 acteurs",
  GHS_ZOO_CALL: "Formation de 50 opérateurs de centre d’appel sur Une seule santé, les zoonoses et la gestion de l’infodémie",
};

const stories: Record<string, { title: string; body: string; timeframe?: string }> = {
  KAMISESHI_ICCM_FY2026_H1: {
    title: "Relance d’un site de soins communautaires intégrés pour le paludisme au Haut-Katanga",
    timeframe: "Février–mars 2026",
    body: "Dans le village de Kamiseshi, à plus de 12 kilomètres de la formation sanitaire la plus proche de la zone de santé de Kafubu, les familles avaient beaucoup de mal à accéder aux soins à temps. Les enfants fébriles et les femmes enceintes recouraient souvent à l’automédication ou aux remèdes traditionnels, à cause de la distance et du coût du déplacement, ce qui augmentait le risque de paludisme grave et de décès évitables. Pour réduire cet écart, le projet EpiC a relancé un site de PCIME-C créé auparavant dans le cadre de programmes appuyés par le gouvernement américain. EpiC a appuyé le site en intrants antipaludiques, outils de gestion, équipement essentiel et supervision formative régulière des RECO. Après la relance, l’offre de soins communautaires a repris rapidement. Entre février et mars, le site a pris en charge 58 enfants de moins de 13 ans selon les directives nationales de traitement du paludisme. Parmi eux, 48 présentaient de la fièvre, 32 ont été testés positifs au paludisme, et tous les cas confirmés ont reçu le traitement approprié.",
  },
  KASAI_ORIENTAL_SUPERVISION_FY2026_H1: {
    title: "La supervision intégrée comme levier d’amélioration de la qualité et d’engagement communautaire",
    timeframe: "AF2026 S1 — 1er octobre 2025 au 31 mars 2026",
    body: "Au Kasaï-Oriental, la supervision intégrée est passée d’une activité de suivi de routine à une démarche d’amélioration de la qualité à fort impact, alignée sur les priorités nationales de l’aire de santé intégrée. Lors de missions conjointes ministère de la Santé–EpiC à Lukamu, Bibanga et Katanda I, les équipes provinciales, en collaboration étroite avec le ministère, ont assuré un mentorat structuré sur le tas, centré sur la qualité des services, l’utilisation des données et le respect des normes cliniques.",
  },
  VITAMIN_A_CAMPAIGN_FY2026_H1: {
    title: "Supplémentation en vitamine A portée par la communauté, grâce à la sensibilisation et à l’engagement",
    timeframe: "AF2026 S1 — 1er octobre 2025 au 31 mars 2026",
    body: "EpiC a appuyé les provinces pour mener des campagnes de sensibilisation et d’offre de services à grande échelle afin d’augmenter la supplémentation en vitamine A chez les enfants de moins de cinq ans. Pendant la période, plus de 2,4 millions d’enfants ont reçu la vitamine A, ce qui reflète à la fois une meilleure disponibilité des intrants et une plus forte utilisation par la communauté.",
  },
};

const metricLabels: Record<string, string> = {
  children_under_13_managed: "Enfants de moins de 13 ans pris en charge",
  presented_with_fever: "Présentant de la fièvre",
  tested_positive_malaria: "Testés positifs au paludisme",
  confirmed_cases_treated: "Cas confirmés traités",
  children_vitamin_a: "Enfants ayant reçu la vitamine A",
};

const gaps: Record<string, { topic: string; reason: string }> = {
  GAP_76_HZ_NAMES: {
    topic: "Noms des 76 zones de santé",
    reason: "Le rapport indique une couverture de 76 zones de santé, sans en donner la liste.",
  },
  GAP_FACILITY_LIST: {
    topic: "Noms des formations sanitaires",
    reason: "Les documents source ne contiennent pas de liste complète des formations sanitaires.",
  },
  GAP_MONTHLY_VALUES: {
    topic: "Valeurs mensuelles des indicateurs",
    reason: "L’annexe B donne des agrégats du semestre, pas des résultats mois par mois.",
  },
  GAP_PROVINCE_SPLIT: {
    topic: "Numérateurs et dénominateurs par province",
    reason: "Les valeurs SMNI, nutrition et paludisme sont des agrégats des quatre provinces seulement.",
  },
  GAP_GPS: { topic: "Coordonnées GPS", reason: "Non fournies dans les documents source." },
  GAP_PATIENTS: {
    topic: "Dossiers individuels de bénéficiaires ou de patients",
    reason: "Seuls des agrégats et un cas narratif de site PCIME-C (58 enfants) sont documentés.",
  },
  GAP_TARGETS: {
    topic: "Cibles des indicateurs",
    reason: "L’annexe B ne donne pas de cibles distinctes des numérateurs et dénominateurs.",
  },
};

const ghsDetailNotes: Record<string, string> = {
  GHS_SURV_CHECKPOINTS: "Le volume de voyageurs dépistés est indiqué comme supérieur à 30 600 par semaine ; le chiffre exact n’est pas fourni.",
  GHS_IPC_BRIEF_4HZ: "110 prestataires dans 4 zones de santé.",
};

export function metricLabel(key: string, lang: Lang) {
  if (lang === "fr" && metricLabels[key]) return metricLabels[key];
  return key.replaceAll("_", " ");
}

export function localizeEpicSource<T extends Dataset>(data: T, lang: Lang): T {
  if (lang !== "fr") return data;

  const localizePeriod = <P extends { code: string; fiscal_year: string; period_label: string; dataset_label: string; methodology: string | null }>(period: P): P => {
    if (period.code !== "FY2026-H1") return period;
    return {
      ...period,
      fiscal_year: "AF2026",
      period_label: "S1",
      dataset_label: DATASET_LABEL_FR,
      methodology: METHODOLOGY_FR,
    };
  };

  return {
    ...data,
    periods: data.periods.map(localizePeriod),
    period: data.period ? localizePeriod(data.period) : data.period,
    indicators: data.indicators.map((row) => {
      const fr = indicators[row.indicator_code];
      if (!fr) return row;
      return { ...row, name: fr.name, comment: fr.comment ?? row.comment };
    }),
    aggregates: data.aggregates.map((row) => {
      const fr = aggregates[row.code];
      if (!fr) return row;
      return { ...row, name: fr.name, notes: fr.notes ?? row.notes };
    }),
    ghs: data.ghs.map((row) => {
      const fr = ghs[row.ghs_indicator_code];
      return {
        ...row,
        name: fr?.name ?? row.name,
        notes: fr?.notes ?? row.notes,
        details: row.details.map((d) => ({
          ...d,
          label: ghsDetails[d.code] ?? d.label,
          notes: ghsDetailNotes[d.code] ?? d.notes,
        })),
      };
    }),
    stories: data.stories.map((row) => {
      const fr = stories[row.code];
      if (!fr) return row;
      return { ...row, title: fr.title, body: fr.body, timeframe_label: fr.timeframe ?? row.timeframe_label };
    }),
    gaps: data.gaps.map((row) => {
      const fr = gaps[row.code];
      if (!fr) return row;
      return { ...row, topic: fr.topic, reason: fr.reason };
    }),
  };
}
