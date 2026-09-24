import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { type AchievementSummary, type ActivityResponseFields, type CatalogRow } from "@/lib/activity-catalog";
import { loadCatalog } from "@/lib/report-data";
import { applyAcceptedActivitySummaries, buildNationalActivityViews, buildOfficialNationalPayload, reportingYears, SOURCE_MONTH, SOURCE_YEAR } from "@/lib/export/epic-official";
import { exportOfficialDocx } from "@/lib/export/epic-docx";
import { ConsolidationActivities, type ActivitySummaryRow } from "@/components/consolidation-activities";
import { PeriodFilters } from "@/components/national-analytics";
import {
  createDefaultPeriodSelection,
  filterReportsInPeriod,
  formatPeriodLabel,
  periodBounds,
  provinceRates,
  type PeriodSelection,
} from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/consolidation")({ component: Consolidation });

function Consolidation() {
  const { t, lang } = useT();
  const { role, user, can } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (role === "province_user" || role === "read_only") {
      nav({ to: "/dashboard", replace: true });
    }
  }, [role, nav]);
  const isDt = role === "technical_director";
  const isAt = role === "technical_assistant";
  const canWriteSummary = can("write_national_summary");
  const canExportNational = isDt;
  const [periodApproved, setPeriodApproved] = useState(false);
  const [period, setPeriod] = useState<PeriodSelection>(() => createDefaultPeriodSelection(SOURCE_MONTH, SOURCE_YEAR));
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; province_id: string; month: number; year: number; submitted_by_name: string | null }[]>([]);
  const [achievements, setAchievements] = useState<(AchievementSummary & { report_id: string })[]>([]);
  const [responses, setResponses] = useState<(ActivityResponseFields & { report_id: string })[]>([]);
  const [narratives, setNarratives] = useState<{ report_id: string; section_type: string; content: string | null }[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryDirty, setAiSummaryDirty] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummaryRow[]>([]);
  const onActivitySummariesChange = useCallback((rows: ActivitySummaryRow[]) => {
    setActivitySummaries(rows);
  }, []);

  useEffect(() => {
    if (role === "province_user" || role === "read_only") return;
    Promise.all([
      supabase.from("provinces").select("id,name").order("name"),
      loadCatalog(),
    ]).then(([{ data: pv }, cat]) => {
      setProvinces((pv as { id: string; name: string }[]) || []);
      setCatalog(cat);
    });
  }, [role]);

  const bounds = periodBounds(period);
  const singleMonth = period.grain === "month";
  const storageMonth = period.month;
  const storageYear = period.year;
  const periodLabel = formatPeriodLabel(period, t.months, t.trimesters, t.semesters);
  const exportMonthLabel =
    period.grain === "month"
      ? t.months[period.month - 1]
      : period.grain === "trimester"
        ? (t.trimesters[period.trimester - 1] ?? `T${period.trimester}`)
        : period.grain === "semester"
          ? (t.semesters[period.semester - 1] ?? `S${period.semester}`)
          : period.grain === "year"
            ? t.periodGrainYear
            : periodLabel;
  const exportYear = period.grain === "custom" ? bounds.toYear : period.year;

  useEffect(() => {
    if (role === "province_user" || role === "read_only") return;
    if (!singleMonth) {
      setPeriodApproved(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("consolidation_approvals")
        .select("id")
        .eq("month", storageMonth)
        .eq("year", storageYear)
        .maybeSingle();
      setPeriodApproved(Boolean(data));
    })();
  }, [singleMonth, storageMonth, storageYear, role]);

  useEffect(() => {
    if (role === "province_user" || role === "read_only") return;
    setLoading(true);
    (async () => {
      const { data: rp } = await supabase
        .from("reports")
        .select("id,province_id,submitted_by_name,month,year")
        .gte("year", bounds.fromYear)
        .lte("year", bounds.toYear);
      const inRange = filterReportsInPeriod(
        (rp as { id: string; province_id: string; month: number; year: number; submitted_by_name: string | null }[]) || [],
        bounds,
      );
      setReports(inRange);
      const ids = inRange.map((r) => r.id);
      if (ids.length === 0) {
        setAchievements([]);
        setResponses([]);
        setNarratives([]);
        setLoading(false);
        return;
      }
      const [{ data: ach }, { data: acts }, { data: narrs }] = await Promise.all([
        supabase.from("achievement_summary").select("*").in("report_id", ids),
        supabase.from("activity_responses").select("report_id,catalog_code,realized,progress,challenges,solutions,priorities,partners").in("report_id", ids),
        supabase.from("narratives").select("report_id,section_type,content").in("report_id", ids),
      ]);
      setAchievements((ach as (AchievementSummary & { report_id: string })[]) || []);
      setResponses((acts as (ActivityResponseFields & { report_id: string })[]) || []);
      setNarratives((narrs as { report_id: string; section_type: string; content: string | null }[]) || []);
      setLoading(false);
    })();
  }, [bounds.fromMonth, bounds.fromYear, bounds.toMonth, bounds.toYear, role]);

  const loadSavedSummary = useCallback(async () => {
    if (role === "province_user" || role === "read_only") return;
    if (!singleMonth) {
      setAiSummary("");
      setAiSummaryDirty(false);
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    const { data, error } = await supabase
      .from("consolidation_summaries")
      .select("content")
      .eq("month", storageMonth)
      .eq("year", storageYear)
      .eq("lang", lang)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      console.warn("[consolidation] summary load", error.message);
    }
    setAiSummary((data as { content?: string } | null)?.content || "");
    setAiSummaryDirty(false);
    setSummaryLoading(false);
  }, [singleMonth, storageMonth, storageYear, lang, role]);

  useEffect(() => {
    loadSavedSummary();
  }, [loadSavedSummary]);

  const payload = useMemo(
    () =>
      buildOfficialNationalPayload({
        lang,
        monthLabel: exportMonthLabel,
        year: exportYear,
        catalog,
        provinces,
        reports,
        achievements,
        responses,
        narratives,
      }),
    [lang, exportMonthLabel, exportYear, catalog, provinces, reports, achievements, responses, narratives],
  );

  const rates = useMemo(
    () => provinceRates(provinces, reports, achievements),
    [provinces, reports, achievements],
  );

  const activityViews = useMemo(
    () =>
      buildNationalActivityViews({
        lang,
        catalog,
        provinces,
        reports,
        responses,
      }),
    [lang, catalog, provinces, reports, responses],
  );

  const exportPayload = useMemo(
    () => ({
      ...payload,
      provinceRates: rates.map((p) => ({
        name: p.name,
        total: p.planned,
        approved: p.approved,
        rate: p.rate,
      })),
      activities: applyAcceptedActivitySummaries(payload.activities, activitySummaries),
      aiNationalSummary: aiSummary.trim() || undefined,
    }),
    [payload, rates, aiSummary, activitySummaries],
  );

  const exportDocx = async () => {
    const slug = periodLabel.replace(/\s+/g, "-").toLowerCase();
    await exportOfficialDocx(exportPayload, lang, `epic-rdc-national-${slug}.docx`);
    toast.success(t.pdfGenerated);
  };

  const generateSummary = async () => {
    if (!canWriteSummary || !singleMonth || periodApproved) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error(t.error);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/consolidation/summary", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month: storageMonth,
          year: storageYear,
          lang,
          sourceReportIds: reports.map((r) => r.id),
          payload,
        }),
      });
      const data = (await res.json()) as { summary?: string; error?: string; saved?: boolean; saveError?: string };
      if (!res.ok) {
        toast.error(data.error || t.error);
        return;
      }
      setAiSummary(data.summary || "");
      setAiSummaryDirty(false);
      toast.success(t.aiSummaryGenerated);
      if (data.saved === false && data.saveError) {
        toast.error(data.saveError);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setGenerating(false);
    }
  };

  const saveSummary = async () => {
    if (!canWriteSummary || !singleMonth || !user) return;
    setSavingSummary(true);
    const { error } = await supabase.from("consolidation_summaries").upsert(
      {
        month: storageMonth,
        year: storageYear,
        lang,
        content: aiSummary,
        source_report_ids: reports.map((r) => r.id),
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "month,year,lang" },
    );
    setSavingSummary(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAiSummaryDirty(false);
    toast.success(t.aiSummarySaved);
  };

  if (role === "province_user" || role === "read_only") {
    return <div className="text-muted-foreground">{t.noAccess}</div>;
  }

  const years = reportingYears();
  const hasSummary = Boolean(aiSummary.trim());
  const summaryEditable = canWriteSummary && singleMonth && !periodApproved;

  const approveConsolidation = async () => {
    if (!isDt || !singleMonth || !user || periodApproved) return;
    if (!confirm(t.approveConsolidationConfirm)) return;
    const { error } = await supabase.from("consolidation_approvals").insert({
      month: storageMonth,
      year: storageYear,
      approved_by: user.id,
    } as never);
    if (error) return toast.error(error.message);
    setPeriodApproved(true);
    toast.success(t.consolidationApprovedToast);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.consolidation}</h1>
          <p className="text-sm text-muted-foreground">{periodLabel} · {reports.length} {t.reports}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {periodApproved && (
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{t.consolidationApprovedBadge}</span>
          )}
          {summaryEditable && (
            <Button
              variant="secondary"
              onClick={generateSummary}
              disabled={generating || loading || reports.length === 0}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {hasSummary ? t.regenerateAiSummary : t.generateAiSummary}
            </Button>
          )}
          {isDt && singleMonth && !periodApproved && (
            <Button variant="outline" onClick={approveConsolidation}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t.approveConsolidation}
            </Button>
          )}
          {canExportNational && (
            <Button onClick={exportDocx}>
              <Download className="h-4 w-4 mr-1" />
              {t.export}
            </Button>
          )}
        </div>
      </div>

      <PeriodFilters
        period={period}
        years={years}
        months={t.months}
        trimesters={t.trimesters}
        semesters={t.semesters}
        labels={{
          periodType: t.periodType,
          month: t.month,
          year: t.year,
          trimester: t.trimester,
          semester: t.semester,
          from: t.from,
          to: t.to,
          grains: {
            month: t.periodGrainMonth,
            trimester: t.periodGrainTrimester,
            semester: t.periodGrainSemester,
            year: t.periodGrainYear,
            custom: t.periodGrainCustom,
          },
        }}
        onPeriodChange={setPeriod}
      />

      {singleMonth && (summaryEditable || hasSummary || isAt) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>{t.aiSummaryTitle}</CardTitle>
            {summaryEditable && aiSummaryDirty && (
              <Button size="sm" variant="outline" onClick={saveSummary} disabled={savingSummary}>
                {t.saveAiSummary}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.aiSummaryHint}</p>
            {summaryLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : summaryEditable ? (
              <Textarea
                rows={12}
                value={aiSummary}
                placeholder={t.aiSummaryEmpty}
                onChange={(e) => {
                  setAiSummary(e.target.value);
                  setAiSummaryDirty(true);
                }}
              />
            ) : hasSummary ? (
              <div className="text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-4">{aiSummary}</div>
            ) : (
              <p className="text-sm text-muted-foreground">{t.aiSummaryEmpty}</p>
            )}
            {generating && (
              <p className="text-xs text-muted-foreground">{t.aiSummaryGenerating}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t.tabAchievement}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">{t.province}</th>
                    <th className="text-right p-2">{t.planned}</th>
                    <th className="text-right p-2">{t.achieved}</th>
                    <th className="text-right p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {!rates.length ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t.noData}</td></tr>
                  ) : rates.map((a) => (
                    <tr key={a.provinceId} className="border-t">
                      <td className="p-2">{a.name}</td>
                      <td className="p-2 text-right tabular-nums">{a.planned}</td>
                      <td className="p-2 text-right tabular-nums">{a.approved}</td>
                      <td className="p-2 text-right tabular-nums">{a.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t.activities}</CardTitle></CardHeader>
        <CardContent>
          <ConsolidationActivities
            views={activityViews}
            loading={loading}
            month={singleMonth ? storageMonth : 0}
            year={singleMonth ? storageYear : 0}
            periodLabel={singleMonth ? t.months[storageMonth - 1] : periodLabel}
            isDirector={canWriteSummary && singleMonth}
            onSummariesChange={onActivitySummariesChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
