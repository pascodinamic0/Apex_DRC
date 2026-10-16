import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  activityLabel,
  formatActivityTime,
  loadActivity,
  type ActivityEvent,
} from "@/lib/activity-log";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: (search: Record<string, unknown>) => ({
    user: typeof search.user === "string" ? search.user : "",
  }),
  component: ActivityPage,
});

interface Person {
  id: string;
  email: string | null;
  full_name: string | null;
}

function initials(name: string | null, email: string | null) {
  const source = name && name !== email ? name : email || "?";
  const parts = source.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
}

function ActivityPage() {
  const { t, lang } = useT();
  const { can } = useAuth();
  const nav = useNavigate();
  const { user: selectedUser } = Route.useSearch();
  const canManage = can("manage_users") || can("manage_provincial_users");
  const [people, setPeople] = useState<Person[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canManage) nav({ to: "/dashboard" });
  }, [canManage, nav]);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    (async () => {
      try {
        const [profileRows, activity] = await Promise.all([
          supabase.from("profiles").select("id, full_name, email").then(({ data, error }) => {
            if (error) throw new Error(error.message);
            return (data || []) as Person[];
          }),
          loadActivity(300),
        ]);
        if (cancelled) return;
        setPeople(profileRows);
        setEvents(activity);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const channel = supabase
      .channel("app-activity-log")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "app_activity_log" },
        (payload) => {
          const row = payload.new as ActivityEvent;
          if (!row?.id) return;
          setEvents((current) => [row, ...current.filter((event) => event.id !== row.id)].slice(0, 300));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [canManage]);

  const names = useMemo(() => {
    const map = new Map<string, Person>();
    for (const person of people) map.set(person.id, person);
    return map;
  }, [people]);

  const visible = useMemo(
    () => (selectedUser ? events.filter((event) => event.actor_id === selectedUser) : events),
    [events, selectedUser],
  );

  const personName = (id: string | null) => {
    if (!id) return "—";
    const person = names.get(id);
    if (!person) return "—";
    return person.full_name && person.full_name !== person.email ? person.full_name : person.email || "—";
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.activityLogTitle}</h1>
          <p className="text-muted-foreground">{t.activityLogSubtitle}</p>
        </div>
        <Badge variant="secondary" className="h-8 px-3 text-sm font-medium">
          {visible.length}
        </Badge>
      </div>

      <div className="max-w-xs">
        <Select
          value={selectedUser || "all"}
          onValueChange={(value) => nav({ to: "/activity", search: { user: value === "all" ? "" : value }, replace: true })}
        >
          <SelectTrigger aria-label={t.activityAllUsers}>
            <SelectValue placeholder={t.activityAllUsers} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.activityAllUsers}</SelectItem>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.full_name || person.email || person.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">{t.activityEmpty}</p>
          ) : (
            <ul className="divide-y">
              {visible.map((event) => {
                const person = event.actor_id ? names.get(event.actor_id) : undefined;
                return (
                  <li key={event.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                    <Avatar className="h-10 w-10 border border-border/60">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(person?.full_name ?? null, person?.email ?? null)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{personName(event.actor_id)}</div>
                      <div className="text-sm text-muted-foreground">{activityLabel(event, t)}</div>
                      <time className="mt-1 block text-xs text-muted-foreground sm:hidden" dateTime={event.created_at}>
                        {formatActivityTime(event.created_at, lang)}
                      </time>
                    </div>
                    <time className="hidden shrink-0 text-xs text-muted-foreground sm:block" dateTime={event.created_at}>
                      {formatActivityTime(event.created_at, lang)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
