import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, Layers, Archive, LogOut, Users, HelpCircle, User, WifiOff, Wifi, Bell, ClipboardList } from "lucide-react";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getPendingCount, replayDraftQueue, type QueuedDraft } from "@/lib/offline/draft-queue";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading, signOut, profile, role } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingSync, setPendingSync] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

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

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  useEffect(() => {
    const refreshPending = () => getPendingCount().then(setPendingSync);
    const refreshNotif = () => {
      if (user?.id) getUnreadNotificationCount(user.id).then(setUnreadNotif);
    };
    refreshPending();
    refreshNotif();
    const onNotif = () => refreshNotif();
    window.addEventListener("epic-notifications-changed", onNotif);
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
      window.removeEventListener("epic-notifications-changed", onNotif);
    };
  }, [syncQueuedDrafts, user?.id]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="space-y-3 w-full max-w-xs">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t.dashboard },
    { to: "/reports", icon: FileText, label: t.reports },
    ...(role === "technical_director" || role === "read_only"
      ? [{ to: "/desk", icon: ClipboardList, label: t.desk }]
      : []),
    ...(role !== "province_user" ? [{ to: "/consolidation", icon: Layers, label: t.consolidation }] : []),
    { to: "/notifications", icon: Bell, label: t.notifications, badge: unreadNotif },
    { to: "/history", icon: Archive, label: t.history },
    { to: "/help", icon: HelpCircle, label: t.help },
    ...(role === "technical_director" ? [{ to: "/users", icon: Users, label: t.users }] : []),
  ];

  const roleLabel =
    role === "technical_director"
      ? (profile?.job_title || t.director)
      : role === "province_user"
        ? t.provinceUser
        : t.readOnly;

  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent active:bg-transparent" tooltip={t.appName}>
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                  E
                </div>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{t.appName}</span>
                  <span className="truncate text-xs text-muted-foreground">{t.tagline}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((it) => (
                  <SidebarMenuItem key={it.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={loc.pathname.startsWith(it.to)}
                      tooltip={it.label}
                    >
                      <Link to={it.to}>
                        <it.icon />
                        <span>{it.label}</span>
                        {"badge" in it && it.badge > 0 && (
                          <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1 text-[10px]">{it.badge}</Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <div className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            {roleLabel}
          </div>
          <Link
            to="/profile"
            className="block truncate px-2 text-sm font-medium hover:underline group-data-[collapsible=icon]:hidden"
          >
            {profile?.full_name || profile?.email}
          </Link>
          <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={t.profile}>
                <Link to="/profile">
                  <User />
                  <span>{t.profile}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip={t.logout}
                onClick={() => signOut().then(() => nav({ to: "/login" }))}
              >
                <LogOut />
                <span>{t.logout}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-muted/30">
        {(!online || pendingSync > 0) && (
          <div
            className={`flex items-center justify-center gap-2 px-3 py-1.5 text-xs ${online ? "bg-amber-500/10 text-amber-900 dark:text-amber-100" : "bg-destructive/10 text-destructive"}`}
          >
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? `${pendingSync} ${t.pendingSync}` : t.offline}
          </div>
        )}

        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4">
          <SidebarTrigger />
          <div className="flex-1 truncate font-semibold md:hidden">{t.appName}</div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/help">
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                <HelpCircle className="h-4 w-4 mr-1" />
                {t.help}
              </Button>
              <Button variant="ghost" size="icon" className="md:hidden">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </Link>
            <LangSwitch />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
