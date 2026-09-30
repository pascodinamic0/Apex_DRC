import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useT, type Dict } from "@/lib/i18n";
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
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardList, MapPin, Target } from "lucide-react";

type FilterVariant = "default" | "toolbar";

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

function FilterField({
  label,
  variant,
  className,
  children,
}: {
  label: string;
  variant: FilterVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0", variant === "default" && "space-y-1.5", className)}>
      <Label className={variant === "toolbar" ? "sr-only" : "text-xs"}>{label}</Label>
      {children}
    </div>
  );
}

function MonthYearSelect({
  month,
  year,
  years,
  months,
  monthLabel,
  yearLabel,
  variant,
  onMonthChange,
  onYearChange,
}: {
  month: number;
  year: number;
  years: number[];
  months: string[];
  monthLabel: string;
  yearLabel: string;
  variant: FilterVariant;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}) {
  const trigger = variant === "toolbar"
    ? "h-9 w-[8.5rem] bg-background"
    : "h-9 w-full sm:w-40";
  const yearTrigger = variant === "toolbar"
    ? "h-9 w-[5.5rem] bg-background"
    : "h-9 w-full sm:w-28";

  return (
    <>
      <FilterField label={monthLabel} variant={variant}>
        <Select value={String(month)} onValueChange={(v) => onMonthChange(Number(v))}>
          <SelectTrigger className={trigger}><SelectValue /></SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={yearLabel} variant={variant}>
        <Select value={String(year)} onValueChange={(v) => onYearChange(Number(v))}>
          <SelectTrigger className={yearTrigger}><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
    </>
  );
}

export function periodFilterLabels(t: Dict) {
  return {
    periodType: t.periodType,
    month: t.month,
    year: t.year,
    trimester: t.trimester,
    semester: t.semester,
    from: t.from,
    to: t.to,
    grains: {
      month: t.periodGrainMonth,
      trimester: t.periodGrainTrimester,
      semester: t.periodGrainSemester,
      year: t.periodGrainYear,
      custom: t.periodGrainCustom,
    },
  };
}

export function PeriodFilters({
  period,
  years,
  months,
  trimesters,
  semesters = ["S1", "S2"],
  allowedGrains,
  labels,
  variant = "default",
  onPeriodChange,
}: {
  period: PeriodSelection;
  years: number[];
  months: string[];
  trimesters: string[];
  semesters?: string[];
  allowedGrains?: PeriodGrain[];
  variant?: FilterVariant;
  labels: {
    periodType: string;
    month: string;
    year: string;
    trimester: string;
    semester?: string;
    from: string;
    to: string;
    grains: { month: string; trimester: string; semester?: string; year: string; custom: string };
  };
  onPeriodChange: (period: PeriodSelection) => void;
}) {
  const allGrains: { value: PeriodGrain; label: string }[] = [
    { value: "month", label: labels.grains.month },
    { value: "trimester", label: labels.grains.trimester },
    { value: "semester", label: labels.grains.semester ?? "Semester" },
    { value: "year", label: labels.grains.year },
    { value: "custom", label: labels.grains.custom },
  ];
  const grainOptions = allowedGrains
    ? allGrains.filter((g) => allowedGrains.includes(g.value))
    : allGrains;

  const grainTrigger = variant === "toolbar"
    ? "h-9 w-[8.5rem] bg-background"
    : "h-9 w-full sm:w-40";
  const midTrigger = variant === "toolbar"
    ? "h-9 w-[8.5rem] bg-background"
    : "h-9 w-full sm:w-40";
  const yearTrigger = variant === "toolbar"
    ? "h-9 w-[5.5rem] bg-background"
    : "h-9 w-full sm:w-28";

  return (
    <div
      className={cn(
        variant === "toolbar"
          ? "flex flex-wrap items-center gap-2"
          : "grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap",
      )}
    >
      <FilterField label={labels.periodType} variant={variant}>
        <Select
          value={period.grain}
          onValueChange={(v) => onPeriodChange(mapPeriodToGrain(period, v as PeriodGrain))}
        >
          <SelectTrigger className={grainTrigger}><SelectValue /></SelectTrigger>
          <SelectContent>
            {grainOptions.map((g) => (
              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>

      {period.grain === "month" && (
        <MonthYearSelect
          month={period.month}
          year={period.year}
          years={years}
          months={months}
          monthLabel={labels.month}
          yearLabel={labels.year}
          variant={variant}
          onMonthChange={(month) => onPeriodChange({ ...period, month })}
          onYearChange={(year) => onPeriodChange({ ...period, year })}
        />
      )}

      {period.grain === "semester" && (
        <>
          <FilterField label={labels.semester ?? "Semester"} variant={variant}>
            <Select
              value={String(period.semester)}
              onValueChange={(v) => onPeriodChange({ ...period, semester: Number(v) })}
            >
              <SelectTrigger className={midTrigger}><SelectValue /></SelectTrigger>
              <SelectContent>
                {semesters.map((s, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={labels.year} variant={variant}>
            <Select
              value={String(period.year)}
              onValueChange={(v) => onPeriodChange({ ...period, year: Number(v) })}
            >
              <SelectTrigger className={yearTrigger}><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </>
      )}

      {period.grain === "trimester" && (
        <>
          <FilterField label={labels.trimester} variant={variant}>
            <Select
              value={String(period.trimester)}
              onValueChange={(v) => onPeriodChange({ ...period, trimester: Number(v) })}
            >
              <SelectTrigger className={midTrigger}><SelectValue /></SelectTrigger>
              <SelectContent>
                {trimesters.map((t, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={labels.year} variant={variant}>
            <Select
              value={String(period.year)}
              onValueChange={(v) => onPeriodChange({ ...period, year: Number(v) })}
            >
              <SelectTrigger className={yearTrigger}><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </>
      )}

      {period.grain === "year" && (
        <FilterField label={labels.year} variant={variant}>
          <Select
            value={String(period.year)}
            onValueChange={(v) => onPeriodChange({ ...period, year: Number(v) })}
          >
            <SelectTrigger className={yearTrigger}><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
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
            variant={variant}
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
            variant={variant}
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
      <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t.nationalAnalytics}</h2>
        <PeriodFilters
          period={period}
          years={years}
          months={t.months}
          trimesters={t.trimesters}
          semesters={t.semesters}
          labels={periodFilterLabels(t)}
          variant="toolbar"
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
