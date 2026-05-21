import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/notifications")({ component: NotificationsPage });

interface NotifRow {
  id: string;
  type: string;
  report_id: string | null;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

function NotificationsPage() {
  const { user, role } = useAuth();
  const { t } = useT();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data as NotifRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() } as never)
      .eq("user_id", user.id)
      .is("read_at", null);
    window.dispatchEvent(new Event("epic-notifications-changed"));
    load();
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() } as never).eq("id", id);
    window.dispatchEvent(new Event("epic-notifications-changed"));
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.notifications}</h1>
        <Button variant="outline" size="sm" onClick={markAllRead}>{t.markAllRead}</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>{t.notifications}</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t.noData}</p>
          ) : (
            items.map((n) => {
              const content = (
                <div className={`py-3 ${!n.read_at ? "font-medium" : "text-muted-foreground"}`}>
                  <div className="text-sm">{n.title}</div>
                  {n.body && <div className="text-xs mt-1">{n.body}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              );
              if (!n.report_id) return <div key={n.id}>{content}</div>;
              const to =
                n.type === "report_returned"
                  ? "/reports/$reportId/revisions"
                  : role === "province_user"
                    ? "/reports/$reportId/revisions"
                    : "/reports/$reportId/review";
              return (
                <Link
                  key={n.id}
                  to={to}
                  params={{ reportId: n.report_id }}
                  onClick={() => markRead(n.id)}
                  className="block hover:bg-accent/50 -mx-2 px-2 rounded-md"
                >
                  {content}
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
