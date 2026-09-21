import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDirectorUserId } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildConsolidationAiContext,
  generateConsolidationSummary,
} from "@/lib/ai/consolidation-summary";
import type { OfficialReportPayload } from "@/lib/export/epic-official";

const payloadSchema = z.object({
  kind: z.enum(["monthly", "national"]),
  provinceName: z.string(),
  monthLabel: z.string(),
  year: z.number(),
  submittedBy: z.string().nullable(),
  domains: z.string(),
  achievement: z.object({
    total_planned: z.number(),
    finalized_approved: z.number(),
    finalized_no_report: z.number(),
    in_progress: z.number(),
    trigger_approved: z.number(),
    not_realized: z.number(),
  }),
  achievementRows: z.array(z.object({ label: z.string(), count: z.number(), pct: z.string() })),
  activities: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      realized: z.string(),
      progress: z.string(),
      challenges: z.string(),
      solutions: z.string(),
      priorities: z.string(),
      partners: z.string(),
    }),
  ),
  execSmni: z.string(),
  execNutrition: z.string(),
  execMalaria: z.string(),
  coordination: z.string(),
  stories: z.string(),
  challenges: z.string(),
  priorities: z.string(),
  provinceRates: z
    .array(z.object({ name: z.string(), rate: z.number(), total: z.number(), approved: z.number() }))
    .optional(),
  annexRows: z
    .array(
      z.object({
        code: z.string(),
        name: z.string(),
        numerator: z.string(),
        denominator: z.string(),
        value: z.string(),
        comment: z.string(),
      }),
    )
    .optional(),
});

export const Route = createFileRoute("/api/consolidation/summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await getDirectorUserId(request);
        if (!uid) return new Response("Forbidden", { status: 403 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const input = z
          .object({
            month: z.number().int().min(1).max(12),
            year: z.number().int().min(2000).max(2100),
            lang: z.enum(["fr", "en"]),
            sourceReportIds: z.array(z.string().uuid()),
            payload: payloadSchema,
          })
          .parse(body);

        const officialPayload = input.payload as OfficialReportPayload;
        const context = buildConsolidationAiContext(officialPayload, {
          month: input.month,
          year: input.year,
          lang: input.lang,
          sourceReportIds: input.sourceReportIds,
        });

        try {
          const { summary, model } = await generateConsolidationSummary(context);
          const now = new Date().toISOString();

          const { data: row, error } = await supabaseAdmin
            .from("consolidation_summaries")
            .upsert(
              {
                month: input.month,
                year: input.year,
                lang: input.lang,
                content: summary,
                model,
                source_report_ids: input.sourceReportIds,
                generated_by: uid,
                updated_by: uid,
                generated_at: now,
                updated_at: now,
              },
              { onConflict: "month,year,lang" },
            )
            .select("id, content, model, generated_at, updated_at")
            .single();

          if (error) {
            console.error("[consolidation.summary] save failed", error.message);
            return Response.json({ summary, model, generatedAt: now, saved: false, saveError: error.message });
          }

          return Response.json({
            summary: row.content,
            model: row.model,
            generatedAt: row.generated_at,
            updatedAt: row.updated_at,
            saved: true,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Summary generation failed";
          const status = message.includes("not configured") ? 503 : 500;
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
