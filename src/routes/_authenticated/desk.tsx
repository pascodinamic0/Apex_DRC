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
import { toast } from "sonner";
import { calcAchievementRate } from "@/lib/activity-catalog";
import { countOpenComments } from "@/lib/report-data";
import { getProvinceUserIds, notifyUsers } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/desk")({
  component: DeskPage,
  beforeLoad: ({ context }) => {
    void context;
  },
});

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
  const { t } = useT();
  const { role } = useAuth();
  const nav = useNavigate();
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [achievements, setAchievements] = useState<Record<string, number>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "province_user") nav({ to: "/dashboard" });
  }, [role, nav]);

  useEffect(() => {
    (async () => {
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
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curMonth, curYear]);

  const monthReports = reports;
  const submitted = monthReports.filter((r) => !["draft", "missing"].includes(r.status) && r.status !== undefined).length;
  const pending = provinces.length - monthReports.filter((r) => r.status !== "draft").length;
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

  if (role !== "technical_director" && role !== "read_only") return null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t.desk}</h1>
      <p className="text-muted-foreground">{t.months[curMonth - 1]} {curYear}</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsSubmitted}</div><div className="text-2xl font-bold">{submitted}/{provinces.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsPending}</div><div className="text-2xl font-bold">{pending}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsInReview}</div><div className="text-2xl font-bold">{inReview}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground uppercase">{t.reportsValidated}</div><div className="text-2xl font-bold">{validated}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.provinceStatus}</CardTitle></CardHeader>
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
                    return (
                      <tr key={p.id} className="border-b last:border-0">
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
                        <td className="p-2 text-right">
                          {!r && role === "technical_director" && (
                            <Button size="sm" variant="outline" onClick={() => remind(p.id)}>{t.remindProvince}</Button>
                          )}
                          {r?.status === "validated" && (
                            <Button size="sm" variant="outline" asChild><Link to="/reports/$reportId" params={{ reportId: r.id }}>{t.consult}</Link></Button>
                          )}
                          {r && ["submitted", "in_review", "returned"].includes(r.status) && role === "technical_director" && (
                            <Button size="sm" asChild><Link to="/reports/$reportId/review" params={{ reportId: r.id }}>{t.review}</Link></Button>
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
    </div>
  );
}
