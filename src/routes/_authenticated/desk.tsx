import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, Layers } from "lucide-react";
import { calcAchievementRate } from "@/lib/activity-catalog";
import { countOpenComments, loadExtendedReportData } from "@/lib/report-data";
import { getProvinceUserIds, notifyUsers } from "@/lib/notifications";
import { downloadCsv } from "@/lib/export/desk-csv";
import { ReportReviewPanel, buildReviewSections } from "@/components/report-review-panel";

export const Route = createFileRoute("/_authenticated/desk")({ component: DeskPage });

interface ProvinceRow { id: string; name: string }
interface ReportRow {
  id: string;
  province_id: string;
  month: number;
  year: number;
  status: string;
  submitted_at: string | null;
}

function DeskPage() {
  const { t, lang } = useT();
  const { role } = useAuth();
  const nav = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [achievements, setAchievements] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [reviewSections, setReviewSections] = useState<ReturnType<typeof buildReviewSections>>([]);
  const [selectedProvinceName, setSelectedProvinceName] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const curMonth = Number(month);
  const curYear = Number(year);

  useEffect(() => {
    if (role === "province_user") nav({ to: "/dashboard" });
  }, [role, nav]);

  const loadDesk = async () => {
    setLoading(true);
    const [{ data: pv }, { data: rp }, { data: ach }] = await Promise.all([
      supabase.from("provinces").select("id,name").order("name"),
      supabase.from("reports").select("id,province_id,month,year,status,submitted_at").eq("month", curMonth).eq("year", curYear),
      supabase.from("achievement_summary").select("report_id,total_planned,finalized_approved"),
    ]);
    setProvinces((pv as ProvinceRow[]) || []);
    const monthReports = (rp as ReportRow[]) || [];
    setReports(monthReports);
    const rateMap: Record<string, number> = {};
    const cmMap: Record<string, number> = {};
    for (const r of monthReports) {
      const a = (ach || []).find((x: { report_id: string }) => x.report_id === r.id);
      if (a) {
        rateMap[r.id] = calcAchievementRate({
          total_planned: a.total_planned ?? 0,
          finalized_approved: a.finalized_approved ?? 0,
          finalized_no_report: 0,
          in_progress: 0,
          trigger_approved: 0,
          not_realized: 0,
        });
      }
      rateMap[r.id] = rateMap[r.id] ?? 0;
      if (["submitted", "returned", "in_review"].includes(r.status)) {
        cmMap[r.id] = await countOpenComments(r.id);
      }
    }
    setAchievements(rateMap);
    setCommentCounts(cmMap);
    setLoading(false);
  };

  useEffect(() => {
    if (role !== "technical_director" && role !== "read_only") return;
    loadDesk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, role]);

  const loadReview = async (reportId: string, provinceName: string) => {
    setReviewLoading(true);
    setSelectedReportId(reportId);
    setSelectedProvinceName(provinceName);
    const r = reports.find((x) => x.id === reportId);
    setSelectedReport(r || null);
    if (r?.status === "submitted") {
      await supabase.from("reports").update({ status: "in_review" } as never).eq("id", reportId);
      setSelectedReport({ ...r, status: "in_review" });
    }
    const d = await loadExtendedReportData(reportId);
    const rate = calcAchievementRate(d.achievement);
    const preview = `${d.achievement.total_planned} · ${rate}%`;
    setReviewSections(buildReviewSections(d.narratives, preview, lang));
    setReviewLoading(false);
  };

  const monthReports = reports;
  const submitted = monthReports.filter((r) => !["draft"].includes(r.status)).length;
  const pending = provinces.filter((p) => {
    const r = monthReports.find((x) => x.province_id === p.id);
    return !r || r.status === "draft";
  }).length;
  const inReview = monthReports.filter((r) => ["submitted", "in_review", "returned"].includes(r.status)).length;
  const validated = monthReports.filter((r) => r.status === "validated").length;

  const statusBadge = (s: string | undefined) => {
    if (!s || s === "missing") return <Badge variant="outline">{t.missing}</Badge>;
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-amber-500/10 text-amber-800",
      in_review: "bg-blue-500/10 text-blue-700",
      returned: "bg-red-500/10 text-red-700",
      validated: "bg-emerald-500/10 text-emerald-700",
    };
    const lbl: Record<string, string> = {
      draft: t.draft,
      submitted: t.submitted,
      in_review: t.inReview,
      returned: t.returned,
      validated: t.validated,
    };
    return <Badge variant="outline" className={map[s]}>{lbl[s] || s}</Badge>;
  };

  const remind = async (provinceId: string, reportId?: string) => {
    const users = await getProvinceUserIds(provinceId);
    if (reportId) {
      await supabase.from("reports").update({ last_reminder_at: new Date().toISOString() } as never).eq("id", reportId);
    }
    await notifyUsers(users, {
      type: "reminder_sent",
      report_id: reportId || "",
      title: t.reminderSent,
      body: `${t.months[curMonth - 1]} ${curYear}`,
    });
    toast.success(t.reminderSent);
  };

  const exportExcel = () => {
    const headers = [t.province, t.status, t.submittedOn, t.commentsCol, t.realizationRate];
    const rows = provinces.map((p) => {
      const r = monthReports.find((x) => x.province_id === p.id);
      const st = r?.status || t.missing;
      const rate = r ? achievements[r.id] : null;
      const cm = r ? commentCounts[r.id] : 0;
      return [
        p.name,
        st,
        r?.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—",
        cm > 0 ? String(cm) : "—",
        rate != null ? `${rate}%` : "—",
      ];
    });
    downloadCsv(`epic-desk-${curYear}-${month}.csv`, headers, rows);
    toast.success(t.exportExcelDone);
  };

  if (role !== "technical_director" && role !== "read_only") return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.desk}</h1>
        <div className="flex gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">{t.month}</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {t.months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.year}</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsSubmitted}</div><div className="text-2xl font-bold">{submitted}/{provinces.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsPending}</div><div className="text-2xl font-bold">{pending}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsInReview}</div><div className="text-2xl font-bold">{inReview}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsValidated}</div><div className="text-2xl font-bold">{validated}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>{t.provinceStatus} — {t.months[curMonth - 1]} {curYear}</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link to="/consolidation"><Layers className="h-4 w-4 mr-1" />{t.consolidatedReport}</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <Download className="h-4 w-4 mr-1" />{t.exportExcel}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="p-2">{t.province}</th>
                    <th className="p-2">{t.status}</th>
                    <th className="p-2">{t.submittedOn}</th>
                    <th className="p-2">{t.commentsCol}</th>
                    <th className="p-2">{t.realizationRate}</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {provinces.map((p) => {
                    const r = monthReports.find((x) => x.province_id === p.id);
                    const st = r?.status;
                    const rate = r ? achievements[r.id] : null;
                    const cm = r ? commentCounts[r.id] : 0;
                    const isSelected = selectedReportId === r?.id;
                    return (
                      <tr key={p.id} className={`border-b last:border-0 ${isSelected ? "bg-accent/50" : ""}`}>
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2">{statusBadge(st || "missing")}</td>
                        <td className="p-2 text-muted-foreground">{r?.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}</td>
                        <td className="p-2">{cm > 0 ? <span className="text-destructive font-medium">{cm}</span> : "—"}</td>
                        <td className="p-2 min-w-[120px]">
                          {rate != null && r ? (
                            <div className="flex items-center gap-2">
                              <Progress value={rate} className="h-2 flex-1" />
                              <span className="text-xs tabular-nums">{rate}%</span>
                            </div>
                          ) : "—"}
                        </td>
                        <td className="p-2 text-right space-x-1">
                          {!r && role === "technical_director" && (
                            <Button size="sm" variant="outline" onClick={() => remind(p.id)}>{t.remindProvince}</Button>
                          )}
                          {r?.status === "validated" && (
                            <Button size="sm" variant="outline" asChild>
                              <Link to="/reports/$reportId" params={{ reportId: r.id }}>{t.consult}</Link>
                            </Button>
                          )}
                          {r && ["submitted", "in_review", "returned"].includes(r.status) && role === "technical_director" && (
                            <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={() => loadReview(r.id, p.name)}>
                              {t.review}
                            </Button>
                          )}
                          {r?.status === "draft" && role === "technical_director" && (
                            <Button size="sm" variant="outline" onClick={() => remind(p.id, r.id)}>{t.remindProvince}</Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedReportId && selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t.reviewReport} — {selectedProvinceName} · {t.months[curMonth - 1]} {curYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviewLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ReportReviewPanel
                reportId={selectedReportId}
                provinceId={selectedReport.province_id}
                reportStatus={selectedReport.status}
                sections={reviewSections}
                mode="dt"
                onStatusChange={() => {
                  loadDesk();
                  if (selectedReportId) loadReview(selectedReportId, selectedProvinceName);
                }}
              />
            )}
          </CardContent>
        </Card>
      )}

      {role === "technical_director" && (
        <Card>
          <CardHeader><CardTitle>{t.generateConsolidated}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/consolidation">{t.previewConsolidated}</Link>
              </Button>
              <Button asChild>
                <Link to="/consolidation"><FileText className="h-4 w-4 mr-1" />{t.exportWord}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/consolidation"><Download className="h-4 w-4 mr-1" />{t.export}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
