import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardCharts } from "@/components/dashboard-charts";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface ProvinceRow { id: string; name: string; code: string }
interface ReportRow { id: string; province_id: string; month: number; year: number; status: string; submitted_at: string | null; validated_at: string | null }

function Dashboard() {
  const { t, lang } = useT();
  const { role, profile } = useAuth();
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  useEffect(() => {
    (async () => {
      const [{ data: pv }, { data: rp }] = await Promise.all([
        supabase.from("provinces").select("*").order("name"),
        supabase.from("reports").select("*"),
      ]);
      setProvinces((pv as ProvinceRow[]) || []);
      setReports((rp as ReportRow[]) || []);
      setDataLoading(false);
    })();
  }, []);

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
      validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      missing: "bg-red-500/10 text-red-700 dark:text-red-300",
    };
    const lbl: Record<string, string> = { draft: t.draft, submitted: t.submitted, validated: t.validated, missing: t.missing };
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

      <div className="grid lg:grid-cols-2 gap-6 items-stretch">
        {dataLoading ? (
          <Skeleton className="min-h-64 h-full w-full" />
        ) : (
          <div className="h-full min-h-0">
            <DashboardCharts trend={trend} provinceBars={[]} trendLabel={t.monthlyTrend} provinceLabel={t.provinceStatus} />
          </div>
        )}

        {!isProvinceUser ? (
          <Card className="flex h-full flex-col">
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
          <Card className="flex h-full flex-col">
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
