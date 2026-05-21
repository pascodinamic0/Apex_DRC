import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { getUnreadNotificationCount, notificationTitle } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth";

interface NotifRow {
  id: string;
  type: string;
  report_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  role: AppRole | null;
}

export function NotificationBell({ role }: Props) {
  const { user } = useAuth();
  const { t } = useT();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotifRow[]>([]);
  const [open, setOpen] = useState(false);

  const refreshCount = useCallback(async () => {
    if (!user?.id) return;
    setUnread(await getUnreadNotificationCount(user.id));
  }, [user?.id]);

  const loadRecent = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, type, report_id, title, body, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8);
    setItems((data as NotifRow[]) || []);
  }, [user?.id]);

  useEffect(() => {
    refreshCount();
    const onChanged = () => {
      refreshCount();
      if (open) loadRecent();
    };
    window.addEventListener("epic-notifications-changed", onChanged);
    return () => window.removeEventListener("epic-notifications-changed", onChanged);
  }, [refreshCount, loadRecent, open]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as NotifRow;
          setUnread((n) => n + 1);
          setItems((prev) => [row, ...prev].slice(0, 8));
          window.dispatchEvent(new Event("epic-notifications-changed"));
          toast.info(notificationTitle(row.type, t), {
            description: row.body ?? undefined,
            duration: 6000,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => refreshCount(),
      )
      .subscribe();

    const poll = setInterval(refreshCount, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshCount();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshCount, t]);

  useEffect(() => {
    if (open) loadRecent();
  }, [open, loadRecent]);

  const reportLink = (n: NotifRow) => {
    if (!n.report_id) return null;
    const to =
      n.type === "report_returned" || role === "province_user"
        ? "/reports/$reportId/revisions"
        : "/reports/$reportId/review";
    return { to, params: { reportId: n.report_id } };
  };

  const displayTitle = (n: NotifRow) => notificationTitle(n.type, t);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() } as never).eq("id", id);
    window.dispatchEvent(new Event("epic-notifications-changed"));
    refreshCount();
    loadRecent();
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t.notifications}>
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">{t.notifications}</span>
          {unread > 0 && (
            <Badge variant="destructive" className="h-5 text-[10px]">
              {unread}
            </Badge>
          )}
        </div>
        <div className="max-h-72 overflow-y-auto divide-y">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">{t.noData}</p>
          ) : (
            items.map((n) => {
              const link = reportLink(n);
              const inner = (
                <div className={`px-3 py-2.5 text-left ${!n.read_at ? "bg-accent/30" : ""}`}>
                  <div className="text-sm leading-snug">{displayTitle(n)}</div>
                  {n.body && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</div>}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              );
              if (!link) {
                return (
                  <button
                    key={n.id}
                    type="button"
                    className="block w-full hover:bg-accent/50"
                    onClick={() => !n.read_at && markRead(n.id)}
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <Link
                  key={n.id}
                  to={link.to}
                  params={link.params}
                  className="block hover:bg-accent/50"
                  onClick={() => {
                    if (!n.read_at) markRead(n.id);
                    setOpen(false);
                  }}
                >
                  {inner}
                </Link>
              );
            })
          )}
        </div>
        <div className="border-t p-2">
          <Button variant="outline" size="sm" className="w-full" asChild onClick={() => setOpen(false)}>
            <Link to="/notifications">{t.viewAllNotifications}</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
