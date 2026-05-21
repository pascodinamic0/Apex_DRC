import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardCharts } from "@/components/dashboard-charts";
import { NationalAnalytics } from "@/components/national-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import type { AchievementRow } from "@/lib/analytics";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

interface ProvinceRow { id: string; name: string; code: string }
interface ReportRow {
  id: string;
  province_id: string;
  month: number;
  year: number;
  status: string;
  submitted_at: string | null;
  validated_at: string | null;
  submission_deadline: string | null;
}

function Dashboard() {
  const { t } = useT();
  const { role, profile } = useAuth();
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const isProvinceUser = role === "province_user";
  const showNational = role === "technical_director" || role === "read_only";

  useEffect(() => {
    (async () => {
      const [{ data: pv }, { data: rp }, { data: ach }] = await Promise.all([
        supabase.from("provinces").select("*").order("name"),
        supabase.from("reports").select("id, province_id, month, year, status, submitted_at, validated_at, submission_deadline"),
        supabase.from("achievement_summary").select("*"),
      ]);
      setProvinces((pv as ProvinceRow[]) || []);
      setReports((rp as ReportRow[]) || []);
      setAchievements(
        ((ach || []) as { report_id: string; total_planned: number; finalized_approved: number; finalized_no_report: number; in_progress: number; trigger_approved: number; not_realized: number }[]).map(
          (a) => ({ ...a }),
        ),
      );
      setDataLoading(false);
    })();
  }, []);

  const monthReports = reports.filter((r) => r.month === filterMonth && r.year === filterYear);
  const trend = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(filterYear, filterMonth - 1 - (11 - i), 1);
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

  if (showNational) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.dashboard}</h1>
          <p className="text-muted-foreground">{t.nationalAnalyticsDesc}</p>
        </div>
        <NationalAnalytics
          month={filterMonth}
          year={filterYear}
          onMonthChange={setFilterMonth}
          onYearChange={setFilterYear}
          years={years}
          provinces={provinces}
          reports={reports}
          achievements={achievements}
          loading={dataLoading}
        />
        <div className="w-full">
          {dataLoading ? <Skeleton className="h-[280px]" /> : <DashboardCharts trend={trend} trendLabel={t.monthlyTrend} />}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboard}</h1>
        <p className="text-muted-foreground">{t.months[filterMonth - 1]} {filterYear}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.yourProvinceStatus}</CardTitle></CardHeader>
        <CardContent>
          {profile?.province_id ? (
            <div className="flex items-center justify-between text-sm py-1.5">
              <span>{provinces.find((p) => p.id === profile.province_id)?.name || "—"}</span>
              {statusBadge(statusFor(profile.province_id))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">—</p>
          )}
        </CardContent>
      </Card>

      {isProvinceUser && (
        <Card>
          <CardHeader><CardTitle>{t.yourReports}</CardTitle></CardHeader>
          <CardContent>
            {myReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.noReports}</p>
            ) : (
              <div className="space-y-2">
                {myReports.map((r) => (
                  <Link
                    key={r.id}
                    to="/reports/$reportId"
                    params={{ reportId: r.id }}
                    className="flex items-center justify-between p-3 rounded-md border hover:bg-accent"
                  >
                    <div className="font-medium">{t.months[r.month - 1]} {r.year}</div>
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
