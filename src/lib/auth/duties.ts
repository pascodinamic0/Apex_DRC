import type { AppRole } from "@/lib/auth";

export type AppDuty =
  | "edit_reports"
  | "submit_reports"
  | "validate_reports"
  | "comment_consolidation"
  | "write_national_summary"
  | "manage_users"
  | "manage_provinces";

export type AccessLevel = "edit" | "view";

export const PROVINCE_DUTIES: AppDuty[] = ["edit_reports", "submit_reports"];

export const NATIONAL_DUTIES: AppDuty[] = [
  "validate_reports",
  "comment_consolidation",
  "write_national_summary",
  "manage_users",
  "manage_provinces",
];

export const READ_ONLY_DUTIES: AppDuty[] = ["comment_consolidation"];

/** Duties valid for a given seat (role). manage_users is DT-only. */
export function dutiesForRole(role: AppRole): AppDuty[] {
  if (role === "province_user") return PROVINCE_DUTIES;
  if (role === "technical_director") return NATIONAL_DUTIES;
  return READ_ONLY_DUTIES;
}

/** Default duty preset when inviting with edit access. */
export function defaultDutiesForRole(role: AppRole): AppDuty[] {
  return dutiesForRole(role);
}

export function validateDutiesForRole(role: AppRole, duties: AppDuty[]): string | null {
  const allowed = new Set(dutiesForRole(role));
  for (const d of duties) {
    if (!allowed.has(d)) return `Duty ${d} is not valid for role ${role}`;
    if (d === "manage_users" && role !== "technical_director") {
      return "manage_users is only valid for Technical Director accounts";
    }
  }
  return null;
}

export function canWithDuties(
  duties: AppDuty[],
  accessLevel: AccessLevel,
  duty: AppDuty,
): boolean {
  return accessLevel === "edit" && duties.includes(duty);
}
