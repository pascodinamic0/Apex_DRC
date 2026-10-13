import type { AppRole } from "@/lib/auth";
import type { AccessLevel } from "@/lib/auth/duties";

/** DT always has bulk import; others need an explicit grant from a DT with manage_users. */
export function canBulkImport(
  role: AppRole | null,
  opts: { bulkImportGranted: boolean; accessLevel: AccessLevel; accessBlocked: boolean },
): boolean {
  if (opts.accessBlocked || opts.accessLevel !== "edit") return false;
  if (role === "technical_director") return true;
  return opts.bulkImportGranted;
}
