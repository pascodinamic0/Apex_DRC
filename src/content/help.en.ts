import type { AppRole } from "@/lib/auth";
import type { HelpSection } from "./help.fr";

export const helpSectionsEn: HelpSection[] = [
  {
    id: "intro",
    title: "Introduction",
    roles: "all",
    body: [
      "EPIC DRC is the monthly reporting platform for all nine provinces.",
      "Use the menu to access the dashboard, reports, consolidation (DT), and history.",
    ],
  },
  {
    id: "province-report",
    title: "Write a provincial report",
    roles: ["province_user"],
    body: [
      "Create a report via Reports → New report (month and year).",
      "Complete tabs A through G: activities, narratives, and executive summary.",
      "Save draft (auto-saves every 30s) then Submit.",
      "After submission, status becomes Awaiting validation. You can still edit until the DT validates.",
    ],
  },
  {
    id: "dt-validate",
    title: "Validate reports (DT)",
    roles: ["technical_director"],
    body: [
      "Check the dashboard for all nine provinces' status.",
      "Open a submitted report and click Validate.",
      "National consolidation aggregates all reports for the selected month.",
    ],
  },
  {
    id: "dt-accounts",
    title: "Technical Director accounts",
    roles: ["technical_director"],
    body: [
      "The TDR specifies three DT-level people (Project Director and senior advisors).",
      "Create three users with Technical Director role under Users.",
      "Set distinct job titles (e.g. Project Director, Senior Advisor) to identify them in the UI.",
    ],
  },
  {
    id: "export",
    title: "PDF export",
    roles: ["technical_director", "read_only"],
    body: [
      "On Consolidation, select month and year then export the official PDF.",
      "The national report follows the provincial monthly activity report structure: cover, contents, acronyms, executive summary, results table, and annexes.",
    ],
  },
  {
    id: "readonly",
    title: "Read-only access",
    roles: ["read_only"],
    body: [
      "You can view all reports and the dashboard without editing or validating.",
    ],
  },
  {
    id: "profile",
    title: "Settings and password",
    roles: "all",
    body: [
      "Settings (user menu at the bottom of the sidebar): name, job title, language, role, province, and password.",
      "Language is also available from the user menu. Forgotten passwords are reset from the login page.",
    ],
  },
];

export function filterHelpSections(sections: HelpSection[], role: AppRole | null) {
  if (!role) return sections;
  return sections.filter((s) => s.roles === "all" || (Array.isArray(s.roles) && s.roles.includes(role)));
}
