import type { AchievementSummary } from "@/lib/activity-catalog";
import { calcAchievementRate } from "@/lib/activity-catalog";

export interface AchievementRow extends AchievementSummary {
  report_id: string;
}

export interface ProvinceRate {
  provinceId: string;
  name: string;
  rate: number;
  hasReport: boolean;
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
  return provinces
    .map((p) => {
      const r = reports.find((x) => x.province_id === p.id);
      const a = r ? achievements.find((x) => x.report_id === r.id) : undefined;
      const rate = a
        ? calcAchievementRate({
            total_planned: a.total_planned ?? 0,
            finalized_approved: a.finalized_approved ?? 0,
            finalized_no_report: a.finalized_no_report ?? 0,
            in_progress: a.in_progress ?? 0,
            trigger_approved: a.trigger_approved ?? 0,
            not_realized: a.not_realized ?? 0,
          })
        : 0;
      return { provinceId: p.id, name: p.name, rate, hasReport: !!r };
    })
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
