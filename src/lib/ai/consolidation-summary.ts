import { generateText } from "ai";
import type { OfficialReportPayload } from "@/lib/export/epic-official";
import { calcAchievementRate } from "@/lib/activity-catalog";
import { aiConfigured, aiSetupMessage } from "@/lib/ai/env";
import { resolveAiModel } from "@/lib/ai/model";

const MAX_FIELD = 1200;
const MAX_ACTIVITIES = 40;

function truncate(text: string, max = MAX_FIELD): string {
  const t = (text || "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export type ConsolidationAiContext = {
  period: string;
  year: number;
  month: number;
  lang: "fr" | "en";
  reportCount: number;
  sourceReportIds: string[];
  nationalAchievementRate: number;
  achievementRows: { label: string; count: number; pct: string }[];
  provinceRates: { name: string; rate: number; total: number; approved: number }[];
  executiveSummaries: { smni: string; nutrition: string; malaria: string };
  coordination: string;
  stories: string;
  challenges: string;
  priorities: string;
  activityHighlights: { code: string; title: string; snippet: string }[];
};

export function buildConsolidationAiContext(
  payload: OfficialReportPayload,
  opts: { month: number; year: number; lang: "fr" | "en"; sourceReportIds: string[] },
): ConsolidationAiContext {
  return {
    period: payload.monthLabel,
    year: opts.year,
    month: opts.month,
    lang: opts.lang,
    reportCount: opts.sourceReportIds.length,
    sourceReportIds: opts.sourceReportIds,
    nationalAchievementRate: calcAchievementRate(payload.achievement),
    achievementRows: payload.achievementRows,
    provinceRates: (payload.provinceRates || []).map((p) => ({
      name: p.name,
      rate: p.rate,
      total: p.total,
      approved: p.approved,
    })),
    executiveSummaries: {
      smni: truncate(payload.execSmni),
      nutrition: truncate(payload.execNutrition),
      malaria: truncate(payload.execMalaria),
    },
    coordination: truncate(payload.coordination),
    stories: truncate(payload.stories),
    challenges: truncate(payload.challenges),
    priorities: truncate(payload.priorities),
    activityHighlights: payload.activities.slice(0, MAX_ACTIVITIES).map((a) => ({
      code: a.code,
      title: a.title,
      snippet: truncate(
        [a.realized, a.progress, a.challenges].filter(Boolean).join(" | "),
        400,
      ),
    })),
  };
}

function systemPrompt(lang: "fr" | "en"): string {
  if (lang === "en") {
    return `You are an expert public-health reporting assistant for the EpiC RDC program (FHI 360).
Write a concise NATIONAL consolidated summary for the Technical Director based ONLY on the JSON data provided.

Rules:
- Do NOT invent statistics, percentages, province names, or activities.
- When copying numbers, use exactly the values from the data. If a field is empty, write "Information unavailable".
- Structure: (1) short opening paragraph, (2) bullet list of major achievements, (3) bullet list of challenges, (4) bullet list of observations/priorities.
- Maximum 500 words.
- Professional institutional tone suitable for donor reporting.`;
  }
  return `Vous êtes un assistant expert en reporting santé publique pour le programme EpiC RDC (FHI 360).
Rédigez un résumé national consolidé concis pour le Directeur Technique en vous basant UNIQUEMENT sur les données JSON fournies.

Règles :
- N'inventez PAS de statistiques, pourcentages, noms de provinces ou activités.
- Lorsque vous citez des chiffres, utilisez exactement les valeurs des données. Si un champ est vide, écrivez « Information non disponible ».
- Structure : (1) court paragraphe d'introduction, (2) liste à puces des principales réalisations, (3) liste à puces des défis, (4) liste à puces des observations/priorités.
- Maximum 500 mots.
- Ton institutionnel professionnel adapté au reporting bailleur.`;
}

export async function generateConsolidationSummary(
  context: ConsolidationAiContext,
): Promise<{ summary: string; model: string }> {
  if (!aiConfigured()) {
    throw new Error(aiSetupMessage());
  }

  const { model, modelId } = resolveAiModel();

  const { text } = await generateText({
    model,
    system: systemPrompt(context.lang),
    prompt: JSON.stringify(context, null, 2),
    maxOutputTokens: 1200,
    temperature: 0.2,
  });

  const summary = (text || "").trim();
  if (!summary) {
    throw new Error(context.lang === "en" ? "The model returned an empty summary." : "Le modèle n'a pas renvoyé de résumé.");
  }

  return { summary, model: modelId };
}

export async function generateActivitySummary(input: {
  lang: "fr" | "en";
  code: string;
  title: string;
  period: string;
  year: number;
  contributions: {
    provinceName: string;
    realized: string;
    progress: string;
    challenges: string;
    solutions: string;
    priorities: string;
    partners: string;
  }[];
}): Promise<{ summary: string; model: string }> {
  if (!aiConfigured()) {
    throw new Error(aiSetupMessage());
  }

  const { model, modelId } = resolveAiModel();
  const system =
    input.lang === "en"
      ? `You are an expert public-health reporting assistant for EpiC DRC (FHI 360).
Write a NATIONAL synthesis for ONE activity only, based ONLY on the JSON provided.
Rules:
- Do not invent provinces, figures, or results.
- If a province did not report a field, omit it rather than guessing.
- Structure: (1) 2-4 sentence synthesis of what was done, (2) bullets of progress, (3) bullets of challenges and adaptations, (4) follow-up priorities.
- Maximum 280 words. Professional donor-reporting tone.`
      : `Vous êtes un assistant expert en reporting santé publique pour EpiC RDC (FHI 360).
Rédigez une synthèse NATIONALE pour UNE seule activité, en vous basant UNIQUEMENT sur le JSON fourni.
Règles :
- N'inventez pas de provinces, de chiffres ou de résultats.
- Si une province n'a pas renseigné un champ, omettez-le.
- Structure : (1) synthèse en 2-4 phrases de ce qui a été fait, (2) puces d'avancement, (3) puces défis et adaptations, (4) priorités de suivi.
- Maximum 280 mots. Ton institutionnel bailleur.`;

  const { text } = await generateText({
    model,
    system,
    prompt: JSON.stringify(
      {
        code: input.code,
        title: input.title,
        period: input.period,
        year: input.year,
        contributions: input.contributions.map((c) => ({
          province: c.provinceName,
          realized: truncate(c.realized, 800),
          progress: truncate(c.progress, 600),
          challenges: truncate(c.challenges, 600),
          solutions: truncate(c.solutions, 600),
          priorities: truncate(c.priorities, 500),
          partners: truncate(c.partners, 400),
        })),
      },
      null,
      2,
    ),
    maxOutputTokens: 800,
    temperature: 0.2,
  });

  const summary = (text || "").trim();
  if (!summary) {
    throw new Error(input.lang === "en" ? "The model returned an empty summary." : "Le modèle n'a pas renvoyé de résumé.");
  }
  return { summary, model: modelId };
}
