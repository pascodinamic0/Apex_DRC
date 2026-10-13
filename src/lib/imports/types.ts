import type { AchievementSummary, ActivityResponseFields } from "@/lib/activity-catalog";

/** Shape produced by AI extraction — aligned with seed-monthly-reports JSON. */
export type ExtractedMonthlyReport = {
  province_code: string | null;
  province_name: string | null;
  month: number | null;
  year: number | null;
  submitted_by: string | null;
  domains: string | null;
  achievement: AchievementSummary;
  activities: ActivityResponseFields[];
  narratives: Record<string, string>;
  warnings: string[];
};

export type AchievementFieldKey = keyof AchievementSummary;

export type ActivityFieldKey = keyof Omit<ActivityResponseFields, "catalog_code">;

export type AcceptIdentity = {
  provinceId: string;
  month: number;
  year: number;
};

export type AcceptSelection = {
  fileId: string;
  identity: AcceptIdentity;
  achievement: Partial<Record<AchievementFieldKey, boolean>>;
  narratives: Record<string, boolean>;
  activities: Record<string, Partial<Record<ActivityFieldKey, boolean>>>;
};
