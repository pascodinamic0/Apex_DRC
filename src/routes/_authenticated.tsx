import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { accountNeedsOnboarding, useAuth } from "@/lib/auth";
import { navGroupsForRole } from "@/lib/auth/navigation";
import { useT } from "@/lib/i18n";
import { NotificationBell } from "@/components/notification-bell";
import { SidebarUserMenu } from "@/components/sidebar-user-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { BrandLogo, BrandMark } from "@/components/brand-logo";
import { WifiOff, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPendingCount, replayDraftQueue, type QueuedDraft } from "@/lib/offline/draft-queue";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading, profile, role, can } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingSync, setPendingSync] = useState(0);
  const syncQueuedDrafts = useCallback(async () => {
    const count = await replayDraftQueue(async (item: QueuedDraft) => {
      const payload = item.payload as {
        activities?: unknown[];
        narratives?: Record<string, string>;
        achievement?: import("@/lib/activity-catalog").AchievementSummary;
        activityResponses?: import("@/lib/activity-catalog").ActivityResponseFields[];
        meta?: import("@/lib/report-data").ReportMeta;
      };
      const { activities = [], narratives = {}, achievement, activityResponses, meta } = payload;
      await supabase.from("report_drafts").upsert(
        { report_id: item.reportId, payload, updated_at: new Date().toISOString() },
        { onConflict: "report_id" },
      );
      if (achievement && activityResponses) {
        const { persistExtendedReport } = await import("@/lib/report-data");
        await persistExtendedReport(item.reportId, { narratives, achievement, activityResponses, meta });
      }
      await supabase.from("activities").delete().eq("report_id", item.reportId);
      const acts = activities as { objective: number; activity_code: string; description: string; planned: number; achieved: number }[];
      if (acts.length) {
        await supabase.from("activities").insert(acts.map((a, idx) => ({
          report_id: item.reportId,
          objective: a.objective,
          activity_code: a.activity_code,
          description: a.description,
          planned: a.planned || 0,
          achieved: a.achieved || 0,
          position: idx,
        })));
      }
      for (const [section_type, content] of Object.entries(narratives)) {
        await supabase.from("narratives").upsert(
          { report_id: item.reportId, section_type: section_type as "stakeholder_coordination", content },
          { onConflict: "report_id,section_type" },
        );
      }
    });
    if (count > 0) toast.success(`${t.syncComplete} (${count})`);
    setPendingSync(await getPendingCount());
  }, [t.syncComplete]);

  const needsOnboarding = accountNeedsOnboarding(user, profile);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    if (!loading && user && needsOnboarding) nav({ to: "/onboarding", replace: true });
  }, [loading, user, needsOnboarding, nav]);

  useEffect(() => {
    if (!loading && profile?.access_blocked) {
      toast.error(t.accessBlockedMessage);
      supabase.auth.signOut();
      nav({ to: "/login", replace: true });
    }
  }, [loading, profile?.access_blocked, nav, t.accessBlockedMessage]);

  useEffect(() => {
    const refreshPending = () => getPendingCount().then(setPendingSync);
    refreshPending();
    const onOnline = () => {
      setOnline(true);
      syncQueuedDrafts();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [syncQueuedDrafts]);

  if (loading || !user || needsOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="space-y-3 w-full max-w-xs">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  const isAt = role === "technical_assistant";
  const navGroups = navGroupsForRole(role, can, t);

  const roleLabel =
    role === "technical_director"
      ? (profile?.job_title || t.director)
      : role === "technical_assistant"
        ? (profile?.job_title || t.technicalAssistant)
        : role === "province_user"
          ? t.provinceUser
          : t.readOnly;

  return (
    <SidebarProvider defaultOpen>
      <Sidebar
        collapsible="icon"
        className={isAt ? "border-r border-blue-500/20 [&_[data-sidebar=sidebar]]:bg-gradient-to-b from-blue-500/[0.03] to-transparent" : undefined}
      >
        <SidebarHeader className={`border-b ${isAt ? "border-blue-500/20" : "border-sidebar-border"}`}>
          <div className="flex items-center gap-2 px-2 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
            <BrandMark className="hidden h-7 w-5 group-data-[collapsible=icon]:block" />
            <BrandLogo className="h-8 w-auto shrink-0 group-data-[collapsible=icon]:hidden" />
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate font-semibold">{t.appName}</span>
              <span className={`truncate text-xs ${isAt ? "text-blue-700 dark:text-blue-300" : "text-muted-foreground"}`}>
                {isAt ? t.atSidebarHint : role === "technical_director" ? t.dtSidebarHint : t.tagline}
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {navGroups.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className={isAt ? "text-blue-600/80 dark:text-blue-400/80" : undefined}>
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((it) => (
                    <SidebarMenuItem key={it.to}>
                      <SidebarMenuButton
                        asChild
                        isActive={it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to)}
                        tooltip={it.label}
                        className={
                          isAt
                            ? "data-[active=true]:bg-blue-500/15 data-[active=true]:text-blue-700 dark:data-[active=true]:text-blue-300"
                            : "data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                        }
                      >
                        <Link to={it.to}>
                          <it.icon />
                          <span>{it.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarUserMenu roleLabel={roleLabel} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-muted/40">
        {(!online || pendingSync > 0) && (
          <div
            className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs ${online ? "bg-amber-500/10 text-amber-900 dark:text-amber-100" : "bg-destructive/10 text-destructive"}`}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? `${pendingSync} ${t.pendingSync}` : t.offline}
          </div>
        )}

        <header
          className={`flex h-14 shrink-0 items-center gap-2 border-b border-t-4 bg-card px-4 ${
            isAt ? "border-t-blue-500" : "border-t-primary"
          }`}
        >
          <SidebarTrigger />
          <BrandLogo className="h-7 md:hidden" />
          <div className="flex-1 truncate font-semibold md:hidden">{t.appName}</div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell role={role} />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
