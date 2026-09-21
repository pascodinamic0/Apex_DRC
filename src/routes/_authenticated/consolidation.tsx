import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { type AchievementSummary, type ActivityResponseFields, type CatalogRow } from "@/lib/activity-catalog";
import { loadCatalog } from "@/lib/report-data";
import { applyAcceptedActivitySummaries, buildNationalActivityViews, buildOfficialNationalPayload, reportingYears, SOURCE_MONTH, SOURCE_YEAR } from "@/lib/export/epic-official";
import { exportOfficialPdf } from "@/lib/export/epic-pdf";
import { ConsolidationActivities, type ActivitySummaryRow } from "@/components/consolidation-activities";

export const Route = createFileRoute("/_authenticated/consolidation")({ component: Consolidation });

function Consolidation() {
  const { t, lang } = useT();
  const { role, user } = useAuth();
  const isDirector = role === "technical_director";
  const [month, setMonth] = useState(String(SOURCE_MONTH));
  const [year, setYear] = useState(String(SOURCE_YEAR));
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; province_id: string; submitted_by_name: string | null }[]>([]);
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
    if (role === "province_user") return;
    Promise.all([
      supabase.from("provinces").select("id,name").order("name"),
      loadCatalog(),
    ]).then(([{ data: pv }, cat]) => {
      setProvinces((pv as { id: string; name: string }[]) || []);
      setCatalog(cat);
    });
  }, [role]);

  useEffect(() => {
    if (role === "province_user") return;
    setLoading(true);
    (async () => {
      const { data: rp } = await supabase
        .from("reports")
        .select("id,province_id,submitted_by_name")
        .eq("month", Number(month))
        .eq("year", Number(year));
      const monthReports = (rp as { id: string; province_id: string; submitted_by_name: string | null }[]) || [];
      setReports(monthReports);
      const ids = monthReports.map((r) => r.id);
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
  }, [month, year, role]);

  const loadSavedSummary = useCallback(async () => {
    if (role === "province_user") return;
    setSummaryLoading(true);
    const { data, error } = await supabase
      .from("consolidation_summaries")
      .select("content")
      .eq("month", Number(month))
      .eq("year", Number(year))
      .eq("lang", lang)
      .maybeSingle();
    if (error && error.code !== "PGRST116") {
      console.warn("[consolidation] summary load", error.message);
    }
    setAiSummary((data as { content?: string } | null)?.content || "");
    setAiSummaryDirty(false);
    setSummaryLoading(false);
  }, [month, year, lang, role]);

  useEffect(() => {
    loadSavedSummary();
  }, [loadSavedSummary]);

  const payload = useMemo(
    () =>
      buildOfficialNationalPayload({
        lang,
        monthLabel: t.months[Number(month) - 1],
        year: Number(year),
        catalog,
        provinces,
        reports,
        achievements,
        responses,
        narratives,
      }),
    [lang, t.months, month, year, catalog, provinces, reports, achievements, responses, narratives],
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
      activities: applyAcceptedActivitySummaries(payload.activities, activitySummaries),
      aiNationalSummary: aiSummary.trim() || undefined,
    }),
    [payload, aiSummary, activitySummaries],
  );

  const exportPdf = async () => {
    await exportOfficialPdf(exportPayload, lang, `epic-rdc-national-${year}-${String(month).padStart(2, "0")}.pdf`);
    toast.success(t.pdfGenerated);
  };

  const generateSummary = async () => {
    if (!isDirector) return;
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
          month: Number(month),
          year: Number(year),
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
    if (!isDirector || !user) return;
    setSavingSummary(true);
    const { error } = await supabase.from("consolidation_summaries").upsert(
      {
        month: Number(month),
        year: Number(year),
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

  if (role === "province_user") return <div className="text-muted-foreground">{t.noAccess}</div>;

  const years = reportingYears();
  const hasSummary = Boolean(aiSummary.trim());

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.consolidation}</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isDirector && (
            <Button
              variant="secondary"
              onClick={generateSummary}
              disabled={generating || loading || reports.length === 0}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              {hasSummary ? t.regenerateAiSummary : t.generateAiSummary}
            </Button>
          )}
          <Button onClick={exportPdf}><Download className="h-4 w-4 mr-1" />{t.export}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.filters}</CardTitle></CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <Label>{t.month}</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{t.months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t.year}</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground self-end">
            {reports.length} {t.reports}
          </div>
        </CardContent>
      </Card>

      {(isDirector || hasSummary) && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle>{t.aiSummaryTitle}</CardTitle>
            {isDirector && aiSummaryDirty && (
              <Button size="sm" variant="outline" onClick={saveSummary} disabled={savingSummary}>
                {t.saveAiSummary}
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.aiSummaryHint}</p>
            {summaryLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : isDirector ? (
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
                  {!payload.provinceRates?.length ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t.noData}</td></tr>
                  ) : payload.provinceRates.map((a) => (
                    <tr key={a.name} className="border-t">
                      <td className="p-2">{a.name}</td>
                      <td className="p-2 text-right tabular-nums">{a.total}</td>
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
            month={Number(month)}
            year={Number(year)}
            periodLabel={t.months[Number(month) - 1]}
            isDirector={isDirector}
            onSummariesChange={onActivitySummariesChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}
