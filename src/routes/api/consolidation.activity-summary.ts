import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireDuty } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateActivitySummary } from "@/lib/ai/consolidation-summary";
import { aiHttpError, approvedPeriodResponse } from "@/lib/ai/period";

const contributionSchema = z.object({
  provinceName: z.string(),
  realized: z.string().optional().default(""),
  progress: z.string().optional().default(""),
  challenges: z.string().optional().default(""),
  solutions: z.string().optional().default(""),
  priorities: z.string().optional().default(""),
  partners: z.string().optional().default(""),
});

export const Route = createFileRoute("/api/consolidation/activity-summary")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const uid = await requireDuty(request, "write_national_summary");
        if (!uid) return new Response("Forbidden", { status: 403 });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const parsed = z
          .object({
            month: z.number().int().min(1).max(12),
            year: z.number().int().min(2000).max(2100),
            lang: z.enum(["fr", "en"]),
            activityCode: z.string().min(1).max(32),
            title: z.string(),
            period: z.string(),
            contributions: z.array(contributionSchema).min(1),
          })
          .safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "Invalid request" }, { status: 400 });
        }
        const input = parsed.data;
        const locked = await approvedPeriodResponse(input.month, input.year, input.lang);
        if (locked) return locked;

        try {
          const { summary, model } = await generateActivitySummary({
            lang: input.lang,
            code: input.activityCode,
            title: input.title,
            period: input.period,
            year: input.year,
            contributions: input.contributions,
          });
          const now = new Date().toISOString();

          const { data: row, error } = await supabaseAdmin
            .from("consolidation_activity_summaries")
            .upsert(
              {
                month: input.month,
                year: input.year,
                lang: input.lang,
                activity_code: input.activityCode,
                ai_content: summary,
                selected: "original",
                model,
                generated_by: uid,
                updated_by: uid,
                generated_at: now,
                updated_at: now,
              },
              { onConflict: "month,year,lang,activity_code" },
            )
            .select("activity_code, ai_content, selected, model, generated_at")
            .single();

          if (error) {
            console.error("[consolidation.activity-summary] save failed", error.message);
            return Response.json({
              summary,
              model,
              selected: "original",
              saved: false,
              saveError: error.message,
            });
          }

          return Response.json({
            summary: row.ai_content,
            selected: row.selected,
            model: row.model,
            generatedAt: row.generated_at,
            saved: true,
          });
        } catch (e: unknown) {
          const { message, status } = aiHttpError(input.lang, e);
          return Response.json({ error: message }, { status });
        }
      },
    },
  },
});
