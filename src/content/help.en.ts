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
      "Complete the tabs, including Media for implementation photos (Annex B).",
      "Save draft (auto-saves every 30s) then Submit.",
      "After submission, status becomes Awaiting validation. You can still edit until the TA validates.",
    ],
  },
  {
    id: "at-validate",
    title: "Validate reports (TA)",
    roles: ["technical_assistant"],
    body: [
      "Check the AT desk for all nine provinces' status.",
      "Open a submitted report, comment by section, return to the province coordinator, or click Validate.",
      "National consolidation aggregates all validated reports for the selected month.",
    ],
  },
  {
    id: "dt-accounts",
    title: "Technical Director accounts",
    roles: ["technical_director"],
    body: [
      "The TDR specifies three DT-level people (Project Director and senior advisors).",
      "Under Users, invite each person with a role. The rank (DT, AT, CP, Viewer) attaches its duties automatically.",
      "You can still raise or lower individual duties afterward. Viewers have no write duties.",
      "Use Edit member on the team list to raise or lower access later without re-inviting.",
    ],
  },
  {
    id: "export",
    title: "Word export",
    roles: ["technical_director", "technical_assistant", "read_only"],
    body: [
      "On Consolidation, select month and year then export the official Word document.",
      "The national report follows the provincial monthly activity report structure: cover, contents, acronyms, executive summary, results table, and annexes.",
    ],
  },
  {
    id: "readonly",
    title: "Viewer access",
    roles: ["read_only"],
    body: [
      "You can view validated reports and the dashboard without editing, commenting, or validating.",
    ],
  },
  {
    id: "at-comments",
    title: "Technical Assistant (AT)",
    roles: ["technical_assistant"],
    body: [
      "You validate provincial reports from the AT desk: section comments, return to province, or validate.",
      "You can also comment on national consolidation activities.",
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
