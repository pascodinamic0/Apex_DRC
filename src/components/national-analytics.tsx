import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import {
  pooledRealization,
  provinceRates,
  type AchievementRow,
} from "@/lib/analytics";

const BAR_COLORS = {
  high: "bg-emerald-500",
  mid: "bg-amber-500",
  low: "bg-red-500",
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
  const pooled = pooledRealization(monthAchievements);
  const bars = provinceRates(provinces, monthReports, monthAchievements);
  const reportingCount = bars.length;
  const submittedCount = monthReports.filter((r) => r.status !== "draft").length;
  const validatedCount = monthReports.filter((r) => r.status === "validated").length;

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
            <div className="text-2xl font-bold mt-1">{reportingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.reports}: {submittedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.avgRealization}</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{pooled.rate}%</div>
            <div className="text-xs text-muted-foreground mt-1">{pooled.approved} / {pooled.planned} {t.activities.toLowerCase()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.planned}</div>
            <div className="text-2xl font-bold mt-1">{pooled.planned}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.months[month - 1]} {year}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{t.achieved}</div>
            <div className="text-2xl font-bold mt-1">{pooled.approved}</div>
            <div className="text-xs text-muted-foreground mt-1">{t.reportsValidated}: {validatedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.realizationByProvince} — {t.months[month - 1]} {year}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {bars.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noData}</p>
          ) : bars.map((p) => (
            <div key={p.provinceId} className="flex items-center gap-3">
              <span className="text-sm w-32 shrink-0 truncate text-muted-foreground">{p.name}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${p.rate >= 80 ? BAR_COLORS.high : p.rate >= 60 ? BAR_COLORS.mid : p.rate > 0 ? BAR_COLORS.low : "bg-muted-foreground/20"}`}
                  style={{ width: `${Math.max(p.rate, 2)}%` }}
                />
              </div>
              <span className="text-sm tabular-nums w-16 text-right">{p.approved}/{p.planned}</span>
              <span className="text-sm tabular-nums w-10 text-right">{p.rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
