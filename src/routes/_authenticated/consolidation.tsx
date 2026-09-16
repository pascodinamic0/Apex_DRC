import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { type AchievementSummary, type ActivityResponseFields, type CatalogRow } from "@/lib/activity-catalog";
import { loadCatalog } from "@/lib/report-data";
import { buildOfficialNationalPayload, reportingYears, SOURCE_MONTH, SOURCE_YEAR } from "@/lib/export/epic-official";
import { exportOfficialDocx } from "@/lib/export/docx-export";
import { exportOfficialPdf } from "@/lib/export/epic-pdf";

export const Route = createFileRoute("/_authenticated/consolidation")({ component: Consolidation });

function Consolidation() {
  const { t, lang } = useT();
  const { role } = useAuth();
  const [month, setMonth] = useState(String(SOURCE_MONTH));
  const [year, setYear] = useState(String(SOURCE_YEAR));
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [reports, setReports] = useState<{ id: string; province_id: string; submitted_by_name: string | null }[]>([]);
  const [achievements, setAchievements] = useState<(AchievementSummary & { report_id: string })[]>([]);
  const [responses, setResponses] = useState<(ActivityResponseFields & { report_id: string })[]>([]);
  const [narratives, setNarratives] = useState<{ report_id: string; section_type: string; content: string | null }[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

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

  const exportPdf = async () => {
    await exportOfficialPdf(payload, lang, `epic-rdc-national-${year}-${String(month).padStart(2, "0")}.pdf`);
    toast.success(t.pdfGenerated);
  };

  const exportDocx = async () => {
    try {
      await exportOfficialDocx(payload, lang, `epic-rdc-national-${year}-${String(month).padStart(2, "0")}.docx`);
      toast.success(t.docxGenerated);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    }
  };

  if (role === "province_user") return <div className="text-muted-foreground">{t.noAccess}</div>;

  const years = reportingYears();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.consolidation}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDocx}><FileText className="h-4 w-4 mr-1" />{t.exportWord}</Button>
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
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">{t.activityCode}</th>
                    <th className="text-left p-2">{t.activities}</th>
                  </tr>
                </thead>
                <tbody>
                  {payload.activities.length === 0 ? (
                    <tr><td colSpan={2} className="p-6 text-center text-muted-foreground">{t.noData}</td></tr>
                  ) : payload.activities.map((a) => (
                    <tr key={a.code} className="border-t align-top">
                      <td className="p-2 font-medium whitespace-nowrap">{a.code}</td>
                      <td className="p-2 text-muted-foreground line-clamp-3">{a.realized || a.progress || a.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
