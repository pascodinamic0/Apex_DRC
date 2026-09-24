import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import {
  filterReportsInPeriod,
  formatPeriodLabel,
  mapPeriodToGrain,
  periodBounds,
  pooledRealization,
  provinceRates,
  type AchievementRow,
  type PeriodGrain,
  type PeriodSelection,
} from "@/lib/analytics";
import { CheckCircle2, ClipboardList, MapPin, Target } from "lucide-react";

function rateTone(rate: number) {
  if (rate >= 80) return { bar: "bg-emerald-500", badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" };
  if (rate >= 60) return { bar: "bg-amber-500", badge: "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-200" };
  if (rate > 0) return { bar: "bg-red-500", badge: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300" };
  return { bar: "bg-muted-foreground/25", badge: "border-transparent bg-muted text-muted-foreground" };
}

type Props = {
  period: PeriodSelection;
  onPeriodChange: (period: PeriodSelection) => void;
  years: number[];
  provinces: { id: string; name: string }[];
  reports: { id: string; province_id: string; month: number; year: number; status: string; submitted_at: string | null; submission_deadline: string | null }[];
  achievements: AchievementRow[];
  loading?: boolean;
};

function MonthYearSelect({
  month,
  year,
  years,
  months,
  monthLabel,
  yearLabel,
  onMonthChange,
  onYearChange,
}: {
  month: number;
  year: number;
  years: number[];
  months: string[];
  monthLabel: string;
  yearLabel: string;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label className="text-xs">{monthLabel}</Label>
        <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">{yearLabel}</Label>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}

export function PeriodFilters({
  period,
  years,
  months,
  trimesters,
  labels,
  onPeriodChange,
}: {
  period: PeriodSelection;
  years: number[];
  months: string[];
  trimesters: string[];
  labels: {
    periodType: string;
    month: string;
    year: string;
    trimester: string;
    from: string;
    to: string;
    grains: { month: string; trimester: string; year: string; custom: string };
  };
  onPeriodChange: (period: PeriodSelection) => void;
}) {
  const grainOptions: { value: PeriodGrain; label: string }[] = [
    { value: "month", label: labels.grains.month },
    { value: "trimester", label: labels.grains.trimester },
    { value: "year", label: labels.grains.year },
    { value: "custom", label: labels.grains.custom },
  ];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">{labels.periodType}</Label>
        <Select
          value={period.grain}
          onValueChange={(v) => onPeriodChange(mapPeriodToGrain(period, v as PeriodGrain))}
        >
          <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {grainOptions.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {period.grain === "month" && (
        <MonthYearSelect
          month={period.month}
          year={period.year}
          years={years}
          months={months}
          monthLabel={labels.month}
          yearLabel={labels.year}
          onMonthChange={(month) => onPeriodChange({ ...period, month })}
          onYearChange={(year) => onPeriodChange({ ...period, year })}
        />
      )}

      {period.grain === "trimester" && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.trimester}</Label>
            <Select
              value={String(period.trimester)}
              onValueChange={(v) => onPeriodChange({ ...period, trimester: Number(v) })}
            >
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {trimesters.map((t, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{labels.year}</Label>
            <Select
              value={String(period.year)}
              onValueChange={(v) => onPeriodChange({ ...period, year: Number(v) })}
            >
              <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {period.grain === "year" && (
        <div className="space-y-1.5">
          <Label className="text-xs">{labels.year}</Label>
          <Select
            value={String(period.year)}
            onValueChange={(v) => onPeriodChange({ ...period, year: Number(v) })}
          >
            <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {period.grain === "custom" && (
        <>
          <MonthYearSelect
            month={period.fromMonth}
            year={period.fromYear}
            years={years}
            months={months}
            monthLabel={labels.from}
            yearLabel={labels.year}
            onMonthChange={(fromMonth) => onPeriodChange({ ...period, fromMonth })}
            onYearChange={(fromYear) => onPeriodChange({ ...period, fromYear })}
          />
          <MonthYearSelect
            month={period.toMonth}
            year={period.toYear}
            years={years}
            months={months}
            monthLabel={labels.to}
            yearLabel={labels.year}
            onMonthChange={(toMonth) => onPeriodChange({ ...period, toMonth })}
            onYearChange={(toYear) => onPeriodChange({ ...period, toYear })}
          />
        </>
      )}
    </div>
  );
}

export function NationalAnalytics({
  period,
  onPeriodChange,
  years,
  provinces,
  reports,
  achievements,
  loading,
}: Props) {
  const { t } = useT();
  const bounds = periodBounds(period);
  const periodReports = filterReportsInPeriod(reports, bounds);
  const periodAchievements = achievements.filter((a) => periodReports.some((r) => r.id === a.report_id));
  const pooled = pooledRealization(periodAchievements);
  const bars = provinceRates(provinces, periodReports, periodAchievements);
  const reportingCount = bars.length;
  const submittedCount = periodReports.filter((r) => r.status !== "draft").length;
  const validatedCount = periodReports.filter((r) => r.status === "validated").length;
  const periodLabel = formatPeriodLabel(period, t.months, t.trimesters);
  const tone = rateTone(pooled.rate);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t.nationalAnalytics}</h2>
          <p className="text-sm text-muted-foreground">{t.reportingPeriod} · {periodLabel}</p>
        </div>
        <PeriodFilters
          period={period}
          years={years}
          months={t.months}
          trimesters={t.trimesters}
          labels={{
            periodType: t.periodType,
            month: t.month,
            year: t.year,
            trimester: t.trimester,
            from: t.from,
            to: t.to,
            grains: {
              month: t.periodGrainMonth,
              trimester: t.periodGrainTrimester,
              year: t.periodGrainYear,
              custom: t.periodGrainCustom,
            },
          }}
          onPeriodChange={onPeriodChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {t.provinces}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{reportingCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.reports}: {submittedCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Target className="h-3.5 w-3.5" />
              {t.avgRealization}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{pooled.rate}%</p>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded bg-muted">
              <div
                className={`h-full ${tone.bar}`}
                style={{ width: `${Math.min(100, Math.max(pooled.rate, 0))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {pooled.approved} / {pooled.planned} {t.activities.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" />
              {t.planned}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{pooled.planned}</p>
            <p className="mt-1 text-xs text-muted-foreground">{periodLabel}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t.achieved}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{pooled.approved}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.reportsValidated}: {validatedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">{t.realizationByProvince}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {bars.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t.noData}</p>
          ) : bars.map((p) => {
            const rowTone = rateTone(p.rate);
            return (
              <div key={p.provinceId} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{p.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {p.approved}/{p.planned} · {p.rate}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-muted">
                    <div
                      className={`h-full ${rowTone.bar}`}
                      style={{ width: `${Math.min(100, Math.max(p.rate, 0))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
