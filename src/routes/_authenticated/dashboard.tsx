import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { calcAchievementRate } from "@/lib/activity-catalog";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface ProvinceRow { id: string; name: string; code: string }
interface ReportRow { id: string; province_id: string; month: number; year: number; status: string; submitted_at: string | null; validated_at: string | null }

function Dashboard() {
  const { t } = useT();
  const { role, profile } = useAuth();
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const [provinceBars, setProvinceBars] = useState<{ name: string; rate: number }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: pv }, { data: rp }, { data: ach }] = await Promise.all([
        supabase.from("provinces").select("*").order("name"),
        supabase.from("reports").select("*"),
        supabase.from("achievement_summary").select("report_id, total_planned, finalized_approved"),
      ]);
      const provs = (pv as ProvinceRow[]) || [];
      const reps = (rp as ReportRow[]) || [];
      setProvinces(provs);
      setReports(reps);
      const bars = provs.map((p) => {
        const r = reps.find((x) => x.province_id === p.id && x.month === curMonth && x.year === curYear);
        if (!r) return { name: p.name, rate: 0 };
        const a = (ach || []).find((x: { report_id: string }) => x.report_id === r.id);
        const rate = a
          ? calcAchievementRate({
              total_planned: a.total_planned ?? 0,
              finalized_approved: a.finalized_approved ?? 0,
              finalized_no_report: 0,
              in_progress: 0,
              trigger_approved: 0,
              not_realized: 0,
            })
          : 0;
        return { name: p.name, rate };
      }).filter((b) => b.rate > 0).sort((a, b) => b.rate - a.rate);
      setProvinceBars(bars);
      setDataLoading(false);
    })();
  }, [curMonth, curYear]);

  const monthReports = reports.filter((r) => r.month === curMonth && r.year === curYear);
  const submittedThisMonth = monthReports.filter((r) => r.status !== "draft").length;
  const validatedCount = monthReports.filter((r) => r.status === "validated").length;
  const validationRate = monthReports.length ? Math.round((validatedCount / monthReports.length) * 100) : 0;

  // Last 12 months trend
  const trend = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(curYear, curMonth - 1 - (11 - i), 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = `${t.months[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
    const count = reports.filter((r) => r.month === m && r.year === y && r.status !== "draft").length;
    return { name: label, count };
  });

  const statusFor = (provinceId: string) => {
    const r = monthReports.find((x) => x.province_id === provinceId);
    return r?.status || "missing";
  };

  const isProvinceUser = role === "province_user";
  const myReports = isProvinceUser
    ? reports.filter((r) => r.province_id === profile?.province_id).sort((a, b) => b.year - a.year || b.month - a.month).slice(0, 6)
    : [];

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      returned: "bg-red-500/10 text-red-700 dark:text-red-300",
      validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      missing: "bg-red-500/10 text-red-700 dark:text-red-300",
    };
    const lbl: Record<string, string> = {
      draft: t.draft,
      submitted: t.submitted,
      in_review: t.inReview,
      returned: t.returned,
      validated: t.validated,
      missing: t.missing,
    };
    return <Badge variant="outline" className={map[s]}>{lbl[s]}</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.months[curMonth - 1]} {curYear}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {!isProvinceUser && <KpiCard icon={FileText} label={t.totalProvinces} value={provinces.length} />}
        {!isProvinceUser && <KpiCard icon={Clock} label={t.submissionsThisMonth} value={`${submittedThisMonth}/${provinces.length}`} />}
        {!isProvinceUser && <KpiCard icon={CheckCircle2} label={t.validationRate} value={`${validationRate}%`} />}
        <KpiCard icon={TrendingUp} label={t.monthlyTrend} value={trend[trend.length - 1].count} />
      </div>

      <div className="w-full">
        {dataLoading ? (
          <Skeleton className="min-h-[280px] w-full" />
        ) : (
          <DashboardCharts trend={trend} trendLabel={t.monthlyTrend} />
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {!isProvinceUser && provinceBars.length > 0 ? (
          <Card className="flex h-full flex-col">
            <CardHeader className="shrink-0">
              <CardTitle>{t.avgRealization}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
              {provinceBars.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate pr-2">{p.name}</span>
                    <span className="tabular-nums text-muted-foreground">{p.rate}%</span>
                  </div>
                  <Progress value={p.rate} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        {!isProvinceUser ? (
          <Card className={`flex h-full flex-col ${provinceBars.length === 0 ? "lg:col-span-2" : ""}`}>
            <CardHeader className="shrink-0"><CardTitle>{t.provinceStatus}</CardTitle></CardHeader>
            <CardContent className="flex-1">
              <div className="space-y-2">
                {provinces.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span>{p.name}</span>
                    {statusBadge(statusFor(p.id))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex h-full flex-col lg:col-span-2">
            <CardHeader className="shrink-0"><CardTitle>{t.yourProvinceStatus}</CardTitle></CardHeader>
            <CardContent className="flex-1">
              {profile?.province_id ? (
                <div className="flex items-center justify-between text-sm py-1.5">
                  <span>{provinces.find(p => p.id === profile.province_id)?.name || "—"}</span>
                  {statusBadge(statusFor(profile.province_id))}
                </div>
              ) : <p className="text-sm text-muted-foreground">—</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {isProvinceUser && (
        <Card>
          <CardHeader><CardTitle>{t.yourReports}</CardTitle></CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noReports}</p>
            ) : (
              <div className="space-y-2">
                {myReports.map((r) => (
                  <Link key={r.id} to="/reports/$reportId" params={{ reportId: r.id }}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent">
                    <div>
                      <div className="font-medium">{t.months[r.month - 1]} {r.year}</div>
                    </div>
                    {statusBadge(r.status)}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold mt-1">{value}</div>
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}
