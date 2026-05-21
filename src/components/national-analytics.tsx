import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import {
  activityStatusPercentages,
  aggregateActivityStatus,
  nationalAvgRealization,
  onTimeSubmissions,
  periodLabel,
  provinceRates,
  type AchievementRow,
} from "@/lib/analytics";

const BAR_COLORS = {
  high: "bg-emerald-500",
  mid: "bg-amber-500",
  low: "bg-red-500",
  blue: "bg-primary",
  light: "bg-primary/30",
  red: "bg-red-400",
};

type Props = {
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  years: number[];
  provinces: { id: string; name: string }[];
  reports: { id: string; province_id: string; month: number; year: number; status: string; submitted_at: string | null; submission_deadline: string | null }[];
  achievements: AchievementRow[];
  loading?: boolean;
};

export function NationalAnalytics({
  month,
  year,
  onMonthChange,
  onYearChange,
  years,
  provinces,
  reports,
  achievements,
  loading,
}: Props) {
  const { t } = useT();
  const monthReports = reports.filter((r) => r.month === month && r.year === year);
  const monthAchievements = achievements.filter((a) => monthReports.some((r) => r.id === a.report_id));
  const avgRate = nationalAvgRealization(monthAchievements);
  const bars = provinceRates(provinces, monthReports, monthAchievements);
  const statusTotals = aggregateActivityStatus(monthAchievements);
  const statusBars = activityStatusPercentages(statusTotals);
  const period = periodLabel(t.months, 4, year, 9, year);

  const deadlineMonths = [0, 1, 2].map((i) => {
    const d = new Date(year, month - 1 + i, 1);
    const mm = d.getMonth() + 1;
    const yy = d.getFullYear();
    return { month: mm, year: yy, label: t.months[mm - 1].slice(0, 3) };
  });
  const onTime = onTimeSubmissions(provinces, reports, deadlineMonths);

  const statusLabels: Record<string, string> = {
    finalized_approved: t.statusApproved,
    in_progress: t.statusInProgress,
    trigger_approved: t.statusTriggerOk,
    finalized_no_report: t.statusReportPending,
    not_realized: t.statusNotDone,
  };

  const statusColors: Record<string, string> = {
    finalized_approved: BAR_COLORS.high,
    in_progress: BAR_COLORS.mid,
    trigger_approved: BAR_COLORS.blue,
    finalized_no_report: BAR_COLORS.light,
    not_realized: BAR_COLORS.red,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.nationalAnalytics}</h2>
          <p className="text-sm text-muted-foreground">{t.months[month - 1]} {year}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">{t.month}</Label>
            <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {t.months.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t.year}</Label>
            <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
              <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.provinces}</div>
            <div className="text-2xl font-bold mt-1">{provinces.length}</div>
            <div className="text-xs text-muted-foreground mt-1">RDC</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.avgRealization}</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{avgRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{t.achFinalizedApproved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.reportingPeriod}</div>
            <div className="text-lg font-bold mt-1">{period}</div>
            <div className="text-xs text-muted-foreground mt-1">{year}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.domains}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <Badge variant="secondary">{t.smni}</Badge>
              <Badge variant="secondary">{t.nutrition}</Badge>
              <Badge variant="secondary">{t.malaria}</Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">+ {t.vaccination}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.realizationByProvince} — {t.months[month - 1]} {year}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bars.map((p) => (
            <div key={p.provinceId} className="flex items-center gap-3">
              <span className="text-sm w-32 shrink-0 truncate text-muted-foreground">{p.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${p.rate >= 80 ? BAR_COLORS.high : p.rate >= 60 ? BAR_COLORS.mid : p.rate > 0 ? BAR_COLORS.low : "bg-muted-foreground/20"}`}
                  style={{ width: `${Math.max(p.rate, p.hasReport ? 2 : 0)}%` }}
                />
              </div>
              <span className="text-sm tabular-nums w-10 text-right">{p.hasReport ? `${p.rate}%` : "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t.activitiesByStatus}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusBars.map((s) => (
              <div key={s.key} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-32 shrink-0">
                  {statusLabels[s.key] ?? s.key}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${statusColors[s.key]}`} style={{ width: `${s.pct}%` }} />
                </div>
                <span className="text-xs tabular-nums w-8 text-right">{s.pct}%</span>
              </div>
            ))}
            {statusTotals.total_planned === 0 && (
              <p className="text-sm text-muted-foreground">{t.noTableauIData}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.onTimeSubmissions}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {onTime.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {row.submitted > 0 ? `${row.submitted}/${row.total}` : "—"}
                  </span>
                </div>
                <Progress value={row.pct} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
