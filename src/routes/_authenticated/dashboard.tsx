import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { isNationalRole } from "@/lib/auth/duties";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "@/components/dashboard-charts";
import { NationalAnalytics, PeriodFilters, periodFilterLabels } from "@/components/national-analytics";
import { AtValidationDashboard } from "@/components/at-validation-dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers, Users } from "lucide-react";
import {
  createDefaultPeriodSelection,
  filterReportsInPeriod,
  formatPeriodLabel,
  periodBounds,
  type AchievementRow,
  type PeriodSelection,
} from "@/lib/analytics";
import { reportingYears, SOURCE_MONTH, SOURCE_YEAR } from "@/lib/export/epic-official";

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
  const { role, profile, can } = useAuth();
  const [period, setPeriod] = useState<PeriodSelection>(() =>
    createDefaultPeriodSelection(SOURCE_MONTH, SOURCE_YEAR),
  );
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const years = reportingYears();
  const isProvinceUser = role === "province_user";
  const isAt = role === "technical_assistant";
  const isDt = role === "technical_director";
  const showNational = isNationalRole(role) && !isAt;

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

  const bounds = periodBounds(period);
  const periodReports = filterReportsInPeriod(reports, bounds);
  const trend = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(bounds.toYear, bounds.toMonth - 1 - (11 - i), 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = `${t.months[m - 1].slice(0, 3)} ${String(y).slice(2)}`;
    const count = reports.filter((r) => r.month === m && r.year === y && r.status !== "draft").length;
    return { name: label, count };
  });

  const statusFor = (provinceId: string) => {
    const r = periodReports.find((x) => x.province_id === provinceId);
    return r?.status || "missing";
  };

  const periodLabel = formatPeriodLabel(period, t.months, t.trimesters, t.semesters);
  const myReports = isProvinceUser
    ? filterReportsInPeriod(
        reports.filter((r) => r.province_id === profile?.province_id),
        bounds,
      ).sort((a, b) => b.year - a.year || b.month - a.month)
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

  if (isAt) {
    return (
      <div className="max-w-7xl mx-auto">
        <AtValidationDashboard />
      </div>
    );
  }

  if (showNational) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {isDt ? t.director : "FHI 360"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {isDt ? t.dtDashboardTitle : t.dashboard}
          </h1>
          <p className="text-muted-foreground">
            {isDt ? t.dtDashboardSubtitle : t.monthlyWorkflow}
          </p>
        </div>

        {isDt && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t.dtQuickActions}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/consolidation">
                  <Layers className="h-4 w-4 mr-1" />
                  {t.goToConsolidation}
                </Link>
              </Button>
              {can("manage_users") && (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/users">
                    <Users className="h-4 w-4 mr-1" />
                    {t.manageTeam}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <NationalAnalytics
          period={period}
          onPeriodChange={setPeriod}
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
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{t.dashboard}</h1>
        <p className="text-muted-foreground">{periodLabel}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.reportingPeriod}</CardTitle></CardHeader>
        <CardContent>
          <PeriodFilters
            period={period}
            years={years}
            months={t.months}
            trimesters={t.trimesters}
            semesters={t.semesters}
            labels={periodFilterLabels(t)}
            onPeriodChange={setPeriod}
          />
        </CardContent>
      </Card>

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
