import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireBulkImport } from "@/lib/auth/director-server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  extractMonthlyReportFromPdfText,
  pdfBufferToText,
} from "@/lib/ai/report-pdf-extract";
import { loadCatalogServer } from "@/lib/imports/catalog-server";
import { applyImportSelection } from "@/lib/imports/accept";
import type { ExtractedMonthlyReport } from "@/lib/imports/types";
import { loadReportSnapshot } from "@/lib/imports/report-admin";

const acceptSchema = z.object({
  fileId: z.string().uuid(),
  identity: z.object({
    provinceId: z.string().uuid(),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000).max(2100),
  }),
  achievement: z.record(z.string(), z.boolean()).optional().default({}),
  narratives: z.record(z.string(), z.boolean()).optional().default({}),
  activities: z
    .record(z.string(), z.record(z.string(), z.boolean()))
    .optional()
    .default({}),
});

async function assertBatchOwner(batchId: string, uid: string) {
  const { data } = await supabaseAdmin
    .from("import_batches")
    .select("id, created_by")
    .eq("id", batchId)
    .maybeSingle();
  if (!data || data.created_by !== uid) return null;
  return data;
}

function storagePath(uid: string, batchId: string, fileId: string, fileName: string) {
  const safe = fileName.replace(/[^\w.-]+/g, "_").slice(0, 120);
  return `${uid}/${batchId}/${fileId}-${safe}`;
}

export const Route = createFileRoute("/api/imports/$batchId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const uid = await requireBulkImport(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const batch = await assertBatchOwner(params.batchId, uid);
        if (!batch) return new Response("Not found", { status: 404 });

        const [{ data: files }, { data: provinces }] = await Promise.all([
          supabaseAdmin
            .from("import_files")
            .select("*")
            .eq("batch_id", params.batchId)
            .order("created_at"),
          supabaseAdmin.from("provinces").select("id, name, code").order("name"),
        ]);

        const enriched = await Promise.all(
          (files || []).map(async (f) => {
            let existing: {
              achievement: import("@/lib/activity-catalog").AchievementSummary;
              narratives: Record<string, string>;
              activityResponses: Record<string, import("@/lib/activity-catalog").ActivityResponseFields>;
            } | null = null;
            let reportStatus: string | null = null;
            let reportId: string | null = null;
            const provinceId = f.detected_province_id;
            if (provinceId && f.detected_month && f.detected_year) {
              const { data: rep } = await supabaseAdmin
                .from("reports")
                .select("id, status")
                .eq("province_id", provinceId)
                .eq("month", f.detected_month)
                .eq("year", f.detected_year)
                .maybeSingle();
              if (rep) {
                reportId = rep.id;
                reportStatus = rep.status;
                const snap = await loadReportSnapshot(rep.id);
                existing = {
                  achievement: snap.achievement,
                  narratives: snap.narratives,
                  activityResponses: Object.fromEntries(snap.activityResponses),
                };
              }
            }
            return {
              ...f,
              existing,
              reportStatus,
              reportId,
            };
          }),
        );

        return Response.json({ batch, files: enriched, provinces: provinces || [] });
      },

      POST: async ({ request, params }) => {
        const uid = await requireBulkImport(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const batch = await assertBatchOwner(params.batchId, uid);
        if (!batch) return new Response("Not found", { status: 404 });

        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("multipart/form-data")) {
          const form = await request.formData();
          const uploaded: { id: string; file_name: string }[] = [];
          for (const entry of form.values()) {
            if (!(entry instanceof File)) continue;
            if (entry.type !== "application/pdf") {
              return new Response("Only PDF files are allowed", { status: 400 });
            }
            const fileId = crypto.randomUUID();
            const path = storagePath(uid, params.batchId, fileId, entry.name);
            const buf = Buffer.from(await entry.arrayBuffer());
            const { error: upErr } = await supabaseAdmin.storage.from("report-imports").upload(path, buf, {
              contentType: "application/pdf",
              upsert: false,
            });
            if (upErr) return new Response(upErr.message, { status: 400 });
            const { data: row, error: insErr } = await supabaseAdmin
              .from("import_files")
              .insert({
                id: fileId,
                batch_id: params.batchId,
                file_name: entry.name,
                storage_path: path,
                file_size: buf.length,
                status: "pending",
              } as never)
              .select("id, file_name")
              .single();
            if (insErr) return new Response(insErr.message, { status: 500 });
            uploaded.push(row!);
          }
          return Response.json({ uploaded });
        }

        const url = new URL(request.url);
        if (url.searchParams.get("action") === "extract") {
          const lang = (url.searchParams.get("lang") === "en" ? "en" : "fr") as "fr" | "en";
          const [{ data: pending }, { data: provinces }] = await Promise.all([
            supabaseAdmin
              .from("import_files")
              .select("*")
              .eq("batch_id", params.batchId)
              .in("status", ["pending", "failed"]),
            supabaseAdmin.from("provinces").select("id, name, code"),
          ]);
          const catalog = await loadCatalogServer();
          const catalogCodes = catalog.map((c) => ({
            code: c.code,
            title_fr: c.title_fr,
            title_en: c.title_en,
          }));

          for (const file of pending || []) {
            await supabaseAdmin
              .from("import_files")
              .update({ status: "extracting", error_message: null, updated_at: new Date().toISOString() })
              .eq("id", file.id);

            try {
              const { data: blob, error: dlErr } = await supabaseAdmin.storage
                .from("report-imports")
                .download(file.storage_path);
              if (dlErr || !blob) throw new Error(dlErr?.message || "Download failed");
              const buffer = Buffer.from(await blob.arrayBuffer());
              const text = await pdfBufferToText(buffer);
              if (!text.trim()) throw new Error("No text extracted from PDF");

              const extracted = await extractMonthlyReportFromPdfText(text, {
                lang,
                provinces: (provinces || []).map((p) => ({
                  id: p.id,
                  name: p.name,
                  code: p.code,
                })),
                catalogCodes,
              });

              let provinceId: string | null = null;
              if (extracted.province_code) {
                provinceId =
                  (provinces || []).find((p) => p.code === extracted.province_code)?.id ?? null;
              }
              if (!provinceId && extracted.province_name) {
                const lower = extracted.province_name.toLowerCase();
                provinceId =
                  (provinces || []).find((p) => p.name.toLowerCase() === lower)?.id ?? null;
              }

              await supabaseAdmin
                .from("import_files")
                .update({
                  status: "ready",
                  extracted: extracted as never,
                  detected_province_id: provinceId,
                  detected_month: extracted.month,
                  detected_year: extracted.year,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", file.id);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Extraction failed";
              await supabaseAdmin
                .from("import_files")
                .update({
                  status: "failed",
                  error_message: msg,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", file.id);
            }
          }
          return Response.json({ ok: true });
        }

        return new Response("Unsupported request", { status: 400 });
      },

      PATCH: async ({ request, params }) => {
        const uid = await requireBulkImport(request);
        if (!uid) return new Response("Forbidden", { status: 403 });
        const batch = await assertBatchOwner(params.batchId, uid);
        if (!batch) return new Response("Not found", { status: 404 });

        const body = await request.json();
        const input = acceptSchema.parse(body);

        const { data: fileRow } = await supabaseAdmin
          .from("import_files")
          .select("*")
          .eq("id", input.fileId)
          .eq("batch_id", params.batchId)
          .maybeSingle();
        if (!fileRow || fileRow.status !== "ready") {
          return new Response("File not ready", { status: 400 });
        }
        const extracted = fileRow.extracted as ExtractedMonthlyReport | null;
        if (!extracted) return new Response("No extraction", { status: 400 });

        const result = await applyImportSelection(uid, extracted, {
          fileId: input.fileId,
          identity: input.identity,
          achievement: input.achievement as never,
          narratives: input.narratives,
          activities: input.activities as never,
        });

        await supabaseAdmin
          .from("import_files")
          .update({
            status: "applied",
            applied_report_id: result.reportId,
            applied_at: new Date().toISOString(),
            detected_province_id: input.identity.provinceId,
            detected_month: input.identity.month,
            detected_year: input.identity.year,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.fileId);

        return Response.json(result);
      },
    },
  },
});
