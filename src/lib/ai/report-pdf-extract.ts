import { generateObject } from "ai";
import { z } from "zod";
import { AiNotConfiguredError, aiConfigured } from "@/lib/ai/env";
import { resolveAiModel } from "@/lib/ai/model";
import { EXTENDED_NARRATIVE_KEYS, emptyAchievementSummary } from "@/lib/activity-catalog";
import type { ExtractedMonthlyReport } from "@/lib/imports/types";

const MAX_TEXT = 120_000;

const activitySchema = z.object({
  catalog_code: z.string(),
  realized: z.string().optional().default(""),
  progress: z.string().optional().default(""),
  challenges: z.string().optional().default(""),
  solutions: z.string().optional().default(""),
  priorities: z.string().optional().default(""),
  partners: z.string().optional().default(""),
});

const extractionSchema = z.object({
  province_code: z.string().nullable(),
  province_name: z.string().nullable(),
  month: z.number().int().min(1).max(12).nullable(),
  year: z.number().int().min(2000).max(2100).nullable(),
  submitted_by: z.string().nullable(),
  domains: z.string().nullable(),
  achievement: z.object({
    total_planned: z.number().int().nonnegative(),
    finalized_approved: z.number().int().nonnegative(),
    finalized_no_report: z.number().int().nonnegative(),
    in_progress: z.number().int().nonnegative(),
    trigger_approved: z.number().int().nonnegative(),
    not_realized: z.number().int().nonnegative(),
  }),
  activities: z.array(activitySchema),
  narratives: z.record(z.string(), z.string()),
  warnings: z.array(z.string()).optional().default([]),
});

export type ExtractContext = {
  lang: "fr" | "en";
  provinces: { id: string; name: string; code: string | null }[];
  catalogCodes: { code: string; title_fr: string; title_en: string }[];
};

function systemPrompt(lang: "fr" | "en"): string {
  const narrativeKeys = EXTENDED_NARRATIVE_KEYS.join(", ");
  if (lang === "en") {
    return `You extract structured data from EpiC RDC provincial MONTHLY health reports (PDF text).
The document order and page layout may vary — match fields by meaning, not position.
Use ONLY text present in the document. Leave strings empty and numbers at 0 when uncertain.
Do NOT invent provinces, dates, or statistics.

Narrative keys (use exactly these keys when content exists): ${narrativeKeys}
Activity rows must use catalog_code from the provided catalog when the activity is clearly identified.
If an activity cannot be matched to a catalog code, omit it.
Return warnings for ambiguous province, month, year, or missing sections.`;
  }
  return `Vous extrayez des données structurées de rapports mensuels provinciaux EpiC RDC (texte PDF).
L'ordre des pages peut varier — repérez les champs par le sens, pas la position.
Utilisez UNIQUEMENT le texte du document. Laissez vide ou 0 si incertain.
N'inventez pas de province, date ou statistique.

Clés narratives (exactement): ${narrativeKeys}
Les activités doivent utiliser catalog_code du catalogue fourni quand l'activité est identifiable.
Sinon, omettez l'activité.
Signalez dans warnings toute ambiguïté sur province, mois ou année.`;
}

export async function extractMonthlyReportFromPdfText(
  pdfText: string,
  ctx: ExtractContext,
): Promise<ExtractedMonthlyReport> {
  if (!aiConfigured()) throw new AiNotConfiguredError(ctx.lang);
  const text = pdfText.length > MAX_TEXT ? `${pdfText.slice(0, MAX_TEXT)}\n[…truncated]` : pdfText;
  const { model } = resolveAiModel();

  const { object } = await generateObject({
    model,
    schema: extractionSchema,
    system: systemPrompt(ctx.lang),
    prompt: JSON.stringify({
      provinces: ctx.provinces.map((p) => ({ code: p.code, name: p.name })),
      catalog: ctx.catalogCodes.slice(0, 200),
      documentText: text,
    }),
  });

  const narratives: Record<string, string> = {};
  for (const key of EXTENDED_NARRATIVE_KEYS) {
    narratives[key] = (object.narratives[key] || "").trim();
  }
  for (const [k, v] of Object.entries(object.narratives)) {
    if (!(k in narratives) && v.trim()) narratives[k] = v.trim();
  }

  return {
    province_code: object.province_code,
    province_name: object.province_name,
    month: object.month,
    year: object.year,
    submitted_by: object.submitted_by,
    domains: object.domains,
    achievement: object.achievement ?? emptyAchievementSummary(),
    activities: object.activities.map((a) => ({
      catalog_code: a.catalog_code,
      realized: a.realized || "",
      progress: a.progress || "",
      challenges: a.challenges || "",
      solutions: a.solutions || "",
      priorities: a.priorities || "",
      partners: a.partners || "",
    })),
    narratives,
    warnings: object.warnings || [],
  };
}

export async function pdfBufferToText(buffer: Buffer): Promise<string> {
  const mod = await import("pdf-parse");
  const pdfParse = mod.default ?? mod;
  const result = await pdfParse(buffer);
  return (result.text || "").trim();
}
