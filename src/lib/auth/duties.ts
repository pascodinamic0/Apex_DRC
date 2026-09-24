import type { AppRole } from "@/lib/auth";

export type AppDuty =
  | "edit_reports"
  | "submit_reports"
  | "validate_reports"
  | "comment_consolidation"
  | "write_national_summary"
  | "manage_users"
  | "manage_provincial_users"
  | "manage_provinces";

export type AccessLevel = "edit" | "view";

export const PROVINCE_DUTIES: AppDuty[] = ["edit_reports", "submit_reports"];

export const NATIONAL_DUTIES: AppDuty[] = [
  "comment_consolidation",
  "write_national_summary",
  "manage_users",
  "manage_provinces",
];

export const AT_DUTIES: AppDuty[] = [
  "validate_reports",
  "comment_consolidation",
  "manage_provincial_users",
];

export const VIEWER_DUTIES: AppDuty[] = [];

export function isNationalRole(role: AppRole | null | undefined): boolean {
  return role === "technical_director" || role === "technical_assistant";
}

export function defaultAccessLevelForRole(role: AppRole): AccessLevel {
  return role === "read_only" ? "view" : "edit";
}

/** Duties valid for a given seat (role). manage_users is DT-only. */
export function dutiesForRole(role: AppRole): AppDuty[] {
  if (role === "province_user") return PROVINCE_DUTIES;
  if (role === "technical_director") return NATIONAL_DUTIES;
  if (role === "technical_assistant") return AT_DUTIES;
  return VIEWER_DUTIES;
}

/** Default duty preset when inviting with the role's default access. */
export function defaultDutiesForRole(role: AppRole): AppDuty[] {
  if (defaultAccessLevelForRole(role) === "view") return [];
  return dutiesForRole(role);
}

export function validateDutiesForRole(role: AppRole, duties: AppDuty[]): string | null {
  const allowed = new Set(dutiesForRole(role));
  for (const d of duties) {
    if (!allowed.has(d)) return `Duty ${d} is not valid for role ${role}`;
    if (d === "manage_users" && role !== "technical_director") {
      return "manage_users is only valid for Technical Director accounts";
    }
    if (d === "validate_reports" && role !== "technical_assistant") {
      return "validate_reports is only valid for Technical Assistant accounts";
    }
    if (d === "manage_provincial_users" && role !== "technical_assistant") {
      return "manage_provincial_users is only valid for Technical Assistant accounts";
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
