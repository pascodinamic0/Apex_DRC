import type { LucideIcon } from "lucide-react";
import {
  Archive,
  Bell,
  CircleHelp,
  ClipboardCheck,
  Database,
  FileText,
  Layers,
  LayoutDashboard,
  Users,
} from "lucide-react";
import type { AppRole } from "@/lib/auth";
import type { AppDuty } from "@/lib/auth/duties";
import type { Dict } from "@/lib/i18n";

export type NavItem = { to: string; icon: LucideIcon; label: string; exact?: boolean };

export type NavGroup = { label: string; items: NavItem[] };

export function navGroupsForRole(
  role: AppRole | null,
  can: (duty: AppDuty) => boolean,
  t: Dict,
): NavGroup[] {
  if (role === "technical_assistant") {
    return [
      {
        label: t.atNavValidation,
        items: [
          { to: "/dashboard", icon: ClipboardCheck, label: t.atDashboardTitle, exact: true },
        ],
      },
      {
        label: t.atNavFollowUp,
        items: [
          { to: "/notifications", icon: Bell, label: t.notifications },
          { to: "/history", icon: Archive, label: t.atValidatedArchive },
        ],
      },
      {
        label: t.navSupport,
        items: [{ to: "/help", icon: CircleHelp, label: t.help }],
      },
    ];
  }

  if (role === "technical_director") {
    return [
      {
        label: t.dtNavOversight,
        items: [
          { to: "/dashboard", icon: LayoutDashboard, label: t.dtDashboardTitle, exact: true },
          { to: "/consolidation", icon: Layers, label: t.consolidation },
          { to: "/program", icon: Database, label: t.programDataTitle },
        ],
      },
      {
        label: t.dtNavAdmin,
        items: [
          ...(can("manage_users") ? [{ to: "/users", icon: Users, label: t.users }] : []),
          { to: "/history", icon: Archive, label: t.history },
        ],
      },
      {
        label: t.navSupport,
        items: [{ to: "/help", icon: CircleHelp, label: t.help }],
      },
    ];
  }

  if (role === "read_only") {
    return [
      {
        label: t.navConsultation,
        items: [
          { to: "/dashboard", icon: LayoutDashboard, label: t.dashboard, exact: true },
          { to: "/consolidation", icon: Layers, label: t.consolidation },
          { to: "/program", icon: Database, label: t.programDataTitle },
          { to: "/history", icon: Archive, label: t.history },
        ],
      },
      {
        label: t.navSupport,
        items: [{ to: "/help", icon: CircleHelp, label: t.help }],
      },
    ];
  }

  return [
    {
      label: t.navProvince,
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: t.dashboard, exact: true },
        { to: "/reports", icon: FileText, label: t.reports },
        { to: "/history", icon: Archive, label: t.history },
      ],
    },
    {
      label: t.navSupport,
      items: [{ to: "/help", icon: CircleHelp, label: t.help }],
    },
  ];
}
