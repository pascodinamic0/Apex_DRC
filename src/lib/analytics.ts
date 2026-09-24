import type { AchievementSummary } from "@/lib/activity-catalog";
import { calcAchievementRate } from "@/lib/activity-catalog";

export type PeriodGrain = "month" | "trimester" | "semester" | "year" | "custom";

export interface PeriodBounds {
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
}

export interface PeriodSelection {
  grain: PeriodGrain;
  month: number;
  year: number;
  trimester: number;
  semester: number;
  fromMonth: number;
  fromYear: number;
  toMonth: number;
  toYear: number;
}

export interface AchievementRow extends AchievementSummary {
  report_id: string;
}

export function yearMonth(month: number, year: number): number {
  return year * 12 + (month - 1);
}

export function trimesterOf(month: number): number {
  return Math.ceil(month / 3);
}

export function trimesterMonthRange(trimester: number, year: number): PeriodBounds {
  const fromMonth = (trimester - 1) * 3 + 1;
  const toMonth = trimester * 3;
  return { fromMonth, fromYear: year, toMonth, toYear: year };
}

export function semesterOf(month: number): number {
  return month <= 6 ? 1 : 2;
}

export function semesterMonthRange(semester: number, year: number): PeriodBounds {
  if (semester === 1) return { fromMonth: 1, fromYear: year, toMonth: 6, toYear: year };
  return { fromMonth: 7, fromYear: year, toMonth: 12, toYear: year };
}

export function normalizeCustomBounds(
  fromMonth: number,
  fromYear: number,
  toMonth: number,
  toYear: number,
): PeriodBounds {
  if (yearMonth(fromMonth, fromYear) > yearMonth(toMonth, toYear)) {
    return { fromMonth: toMonth, fromYear: toYear, toMonth: fromMonth, toYear: fromYear };
  }
  return { fromMonth, fromYear, toMonth, toYear };
}

export function periodBounds(selection: PeriodSelection): PeriodBounds {
  switch (selection.grain) {
    case "month":
      return {
        fromMonth: selection.month,
        fromYear: selection.year,
        toMonth: selection.month,
        toYear: selection.year,
      };
    case "trimester":
      return trimesterMonthRange(selection.trimester, selection.year);
    case "semester":
      return semesterMonthRange(selection.semester, selection.year);
    case "year":
      return { fromMonth: 1, fromYear: selection.year, toMonth: 12, toYear: selection.year };
    case "custom":
      return normalizeCustomBounds(
        selection.fromMonth,
        selection.fromYear,
        selection.toMonth,
        selection.toYear,
      );
  }
}

export function reportInRange(month: number, year: number, bounds: PeriodBounds): boolean {
  const ym = yearMonth(month, year);
  const from = yearMonth(bounds.fromMonth, bounds.fromYear);
  const to = yearMonth(bounds.toMonth, bounds.toYear);
  return ym >= from && ym <= to;
}

export function filterReportsInPeriod<T extends { month: number; year: number }>(
  reports: T[],
  bounds: PeriodBounds,
): T[] {
  return reports.filter((r) => reportInRange(r.month, r.year, bounds));
}

export function createDefaultPeriodSelection(month: number, year: number): PeriodSelection {
  return {
    grain: "month",
    month,
    year,
    trimester: trimesterOf(month),
    semester: semesterOf(month),
    fromMonth: month,
    fromYear: year,
    toMonth: month,
    toYear: year,
  };
}

export function mapPeriodToGrain(selection: PeriodSelection, grain: PeriodGrain): PeriodSelection {
  const { month, year } = selection;
  switch (grain) {
    case "month":
      return { ...selection, grain, month, year, trimester: trimesterOf(month) };
    case "trimester":
      return { ...selection, grain, trimester: trimesterOf(month), year };
    case "semester":
      return { ...selection, grain, semester: semesterOf(month), year };
    case "year":
      return { ...selection, grain, year };
    case "custom":
      return {
        ...selection,
        grain,
        fromMonth: month,
        fromYear: year,
        toMonth: month,
        toYear: year,
      };
  }
}

export function formatPeriodLabel(
  selection: PeriodSelection,
  months: string[],
  trimesterLabels?: string[],
  semesterLabels?: string[],
): string {
  const bounds = periodBounds(selection);
  switch (selection.grain) {
    case "month":
      return `${months[selection.month - 1]} ${selection.year}`;
    case "trimester": {
      const tLabel = trimesterLabels?.[selection.trimester - 1] ?? `T${selection.trimester}`;
      return `${tLabel} ${selection.year}`;
    }
    case "semester": {
      const sLabel = semesterLabels?.[selection.semester - 1] ?? `S${selection.semester}`;
      return `${sLabel} ${selection.year}`;
    }
    case "year":
      return String(selection.year);
    case "custom":
      if (bounds.fromMonth === bounds.toMonth && bounds.fromYear === bounds.toYear) {
        return `${months[bounds.fromMonth - 1]} ${bounds.fromYear}`;
      }
      return periodLabel(months, bounds.fromMonth, bounds.fromYear, bounds.toMonth, bounds.toYear);
  }
}

export interface ProvinceRate {
  provinceId: string;
  name: string;
  rate: number;
  hasReport: boolean;
  planned: number;
  approved: number;
}

export interface ActivityStatusTotals {
  finalized_approved: number;
  in_progress: number;
  trigger_approved: number;
  finalized_no_report: number;
  not_realized: number;
  total_planned: number;
}

export function nationalAvgRealization(achievements: AchievementRow[]): number {
  const withTotal = achievements.filter((a) => (a.total_planned || 0) > 0);
  if (!withTotal.length) return 0;
  const sum = withTotal.reduce((s, a) => s + calcAchievementRate(a), 0);
  return Math.round(sum / withTotal.length);
}

export function provinceRates(
  provinces: { id: string; name: string }[],
  reports: { id: string; province_id: string }[],
  achievements: AchievementRow[],
): ProvinceRate[] {
  const achievementByReport = new Map(achievements.map((a) => [a.report_id, a]));

  return provinces
    .map((p) => {
      const provinceReports = reports.filter((x) => x.province_id === p.id);
      if (!provinceReports.length) {
        return { provinceId: p.id, name: p.name, rate: 0, hasReport: false, planned: 0, approved: 0 };
      }

      const totals = provinceReports.reduce(
        (acc, r) => {
          const a = achievementByReport.get(r.id);
          if (!a) return acc;
          return {
            total_planned: acc.total_planned + (a.total_planned || 0),
            finalized_approved: acc.finalized_approved + (a.finalized_approved || 0),
            finalized_no_report: acc.finalized_no_report + (a.finalized_no_report || 0),
            in_progress: acc.in_progress + (a.in_progress || 0),
            trigger_approved: acc.trigger_approved + (a.trigger_approved || 0),
            not_realized: acc.not_realized + (a.not_realized || 0),
          };
        },
        {
          total_planned: 0,
          finalized_approved: 0,
          finalized_no_report: 0,
          in_progress: 0,
          trigger_approved: 0,
          not_realized: 0,
        },
      );

      const planned = totals.total_planned;
      const approved = totals.finalized_approved;
      const rate =
        planned > 0
          ? calcAchievementRate({
              total_planned: planned,
              finalized_approved: approved,
              finalized_no_report: totals.finalized_no_report,
              in_progress: totals.in_progress,
              trigger_approved: totals.trigger_approved,
              not_realized: totals.not_realized,
            })
          : 0;

      return { provinceId: p.id, name: p.name, rate, hasReport: true, planned, approved };
    })
    .filter((p) => p.hasReport && p.planned > 0)
    .sort((a, b) => b.rate - a.rate);
}

export function aggregateActivityStatus(achievements: AchievementRow[]): ActivityStatusTotals {
  return achievements.reduce(
    (acc, a) => ({
      total_planned: acc.total_planned + (a.total_planned || 0),
      finalized_approved: acc.finalized_approved + (a.finalized_approved || 0),
      finalized_no_report: acc.finalized_no_report + (a.finalized_no_report || 0),
      in_progress: acc.in_progress + (a.in_progress || 0),
      trigger_approved: acc.trigger_approved + (a.trigger_approved || 0),
      not_realized: acc.not_realized + (a.not_realized || 0),
    }),
    {
      total_planned: 0,
      finalized_approved: 0,
      finalized_no_report: 0,
      in_progress: 0,
      trigger_approved: 0,
      not_realized: 0,
    },
  );
}

export function pooledRealization(achievements: AchievementRow[]) {
  const totals = aggregateActivityStatus(achievements.filter((a) => (a.total_planned || 0) > 0));
  return {
    planned: totals.total_planned,
    approved: totals.finalized_approved,
    rate: totals.total_planned > 0 ? Math.round((totals.finalized_approved / totals.total_planned) * 100) : 0,
  };
}

export function activityStatusPercentages(totals: ActivityStatusTotals) {
  const t = totals.total_planned || 0;
  const pct = (n: number) => (t > 0 ? Math.round((n / t) * 100) : 0);
  return [
    { key: "finalized_approved", value: totals.finalized_approved, pct: pct(totals.finalized_approved) },
    { key: "in_progress", value: totals.in_progress, pct: pct(totals.in_progress) },
    { key: "trigger_approved", value: totals.trigger_approved, pct: pct(totals.trigger_approved) },
    { key: "finalized_no_report", value: totals.finalized_no_report, pct: pct(totals.finalized_no_report) },
    { key: "not_realized", value: totals.not_realized, pct: pct(totals.not_realized) },
  ];
}

export function onTimeSubmissions(
  provinces: { id: string }[],
  reports: {
    province_id: string;
    month: number;
    year: number;
    status: string;
    submitted_at: string | null;
    submission_deadline: string | null;
  }[],
  months: { month: number; year: number; label: string }[],
) {
  return months.map(({ month, year, label }) => {
    const monthReports = reports.filter((r) => r.month === month && r.year === year && r.status !== "draft");
    const onTime = monthReports.filter((r) => {
      if (!r.submitted_at) return false;
      if (!r.submission_deadline) return true;
      return new Date(r.submitted_at) <= new Date(r.submission_deadline + "T23:59:59");
    }).length;
    const submitted = monthReports.length;
    const total = provinces.length;
    return { label, onTime, submitted, total, pct: total > 0 ? Math.round((submitted / total) * 100) : 0 };
  });
}

export function periodLabel(months: string[], fromMonth: number, fromYear: number, toMonth: number, toYear: number) {
  const a = `${months[fromMonth - 1]?.slice(0, 3) ?? ""} ${String(fromYear).slice(2)}`;
  const b = `${months[toMonth - 1]?.slice(0, 3) ?? ""} ${String(toYear).slice(2)}`;
  return `${a}–${b}`;
}
