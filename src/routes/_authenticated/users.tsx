import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { ChevronDown, MapPin, Plus, Search, Trash2, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

interface UserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  province_id: string | null;
  job_title: string | null;
  role: string | null;
}
interface ProvinceRow {
  id: string;
  name: string;
  code?: string | null;
}

type UserRole = "province_user" | "technical_director" | "read_only";

const emptyForm = {
  email: "",
  fullName: "",
  provinceId: "",
  jobTitle: "",
  role: "province_user" as UserRole,
};

async function authedFetch(input: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      ...(init.headers || {}),
    },
  });
}

function initials(name: string | null, email: string | null) {
  const source = name && name !== email ? name : email || "?";
  const parts = source
    .replace(/@.*$/, "")
    .split(/[\s._-]+/)
    .filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
}

function UsersPage() {
  const { t } = useT();
  const { role } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (role && role !== "technical_director") nav({ to: "/dashboard" });
  }, [role, nav]);

  const refreshProvinces = async () => {
    const { data, error } = await supabase.from("provinces").select("id, name, code").order("name");
    if (error) return toast.error(error.message);
    setProvinces((data || []) as ProvinceRow[]);
  };

  const refreshUsers = async () => {
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name, province_id, job_title"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) return toast.error(pErr.message);
    if (rErr) return toast.error(rErr.message);
    const merged: UserRow[] = (profiles || []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.id)?.role || null,
    }));
    setUsers(merged);
  };

  const refresh = async () => {
    await Promise.all([refreshProvinces(), refreshUsers()]);
    setLoading(false);
  };

  useEffect(() => {
    if (role === "technical_director") refresh();
  }, [role]);

  const onInvite = async () => {
    if (form.role === "province_user" && !form.provinceId) {
      toast.error(t.selectProvince);
      return;
    }
    setBusy(true);
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          fullName: form.fullName,
          provinceId: form.role === "province_user" ? form.provinceId || null : null,
          role: form.role,
          jobTitle: form.role === "technical_director" ? form.jobTitle || null : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t.inviteSent);
      setForm(emptyForm);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (userId: string) => {
    try {
      const res = await authedFetch("/api/admin/users", { method: "DELETE", body: JSON.stringify({ userId }) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t.userRemoved);
      refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    }
  };

  if (role !== "technical_director") return null;

  const provinceName = (id: string | null) => provinces.find((p) => p.id === id)?.name || "—";
  const roleLabel = (r: string | null) =>
    r === "technical_director" ? t.director : r === "read_only" ? t.readOnly : r === "province_user" ? t.provinceUser : "—";
  const roleClass = (r: string | null) => {
    if (r === "technical_director") return "border-primary/20 bg-primary/10 text-primary";
    if (r === "province_user") return "border-transparent bg-secondary text-secondary-foreground";
    return "border-transparent bg-muted text-muted-foreground";
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...users].sort((a, b) => (a.full_name || a.email || "").localeCompare(b.full_name || b.email || ""));
    if (!q) return list;
    return list.filter((u) =>
      [u.full_name, u.email, u.job_title, roleLabel(u.role), provinceName(u.province_id)]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users, query, provinces, t]);

  const canInvite = Boolean(form.email && form.fullName) && !busy;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.users}</h1>
          <p className="text-muted-foreground">{t.usersSubtitle}</p>
        </div>
        <Badge variant="secondary" className="h-8 px-3 text-sm font-medium">
          {users.length} {t.members}
        </Badge>
      </div>

      <Card className="border-primary/15 bg-gradient-to-br from-card to-accent/40 shadow-sm">
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">{t.addUser}</h2>
              <p className="text-sm text-muted-foreground">{t.inviteHint}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="member-name">{t.fullName}</Label>
              <Input
                id="member-name"
                autoComplete="name"
                placeholder="Marie Kabila"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">{t.email}</Label>
              <Input
                id="member-email"
                type="email"
                autoComplete="email"
                placeholder="marie@epic.cd"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t.role}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="province_user">{t.provinceUser}</SelectItem>
                  <SelectItem value="technical_director">{t.director}</SelectItem>
                  <SelectItem value="read_only">{t.readOnly}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "technical_director" ? (
              <div className="space-y-1.5">
                <Label htmlFor="member-title">{t.jobTitle}</Label>
                <Input
                  id="member-title"
                  placeholder={t.jobTitlePlaceholder}
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                />
              </div>
            ) : form.role === "province_user" ? (
              <div className="space-y-1.5">
                <Label>{t.province}</Label>
                <Select value={form.provinceId} onValueChange={(v) => setForm({ ...form, provinceId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectProvince} />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="hidden sm:block" />
            )}
            <div className="flex items-end justify-end sm:col-span-2">
              <Button onClick={onInvite} disabled={!canInvite} className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                {busy ? t.sendingInvite : t.invite}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{t.team}</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchUsers}
              className="pl-9"
              aria-label={t.searchUsers}
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                {users.length === 0 ? t.emptyTeam : t.noUsersFound}
              </p>
            ) : (
              <ul className="divide-y">
                {filtered.map((u) => {
                  const displayName = u.full_name && u.full_name !== u.email ? u.full_name : u.email || "—";
                  const showEmail = Boolean(u.email && u.email !== displayName);
                  const extra = u.job_title && u.job_title !== roleLabel(u.role) ? u.job_title : null;
                  return (
                    <li key={u.id} className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                      <Avatar className="h-10 w-10 border border-border/60">
                        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                          {initials(u.full_name, u.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{displayName}</div>
                        <div className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                          {showEmail && <span className="truncate">{u.email}</span>}
                          {extra && (
                            <>
                              {showEmail && <span aria-hidden="true">·</span>}
                              <span className="truncate">{extra}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="outline" className={roleClass(u.role)}>
                          {roleLabel(u.role)}
                        </Badge>
                        {u.role === "province_user" && (
                          <span className="hidden items-center gap-1 text-sm text-muted-foreground md:inline-flex">
                            <MapPin className="h-3.5 w-3.5" />
                            {provinceName(u.province_id)}
                          </span>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={t.remove}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.remove}</AlertDialogTitle>
                              <AlertDialogDescription>{t.confirmRemove}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => onRemove(u.id)}
                              >
                                {t.remove}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ProvincesManager provinces={provinces} onChange={refresh} />
    </div>
  );
}

function ProvincesManager({ provinces, onChange }: { provinces: ProvinceRow[]; onChange: () => void }) {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const add = async () => {
    if (!code || !name) return;
    setBusy(true);
    const { error } = await supabase.from("provinces").insert({ code, name });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCode("");
    setName("");
    onChange();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("provinces").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div>
                <h2 className="text-base font-semibold">{t.provinces}</h2>
                <p className="text-sm text-muted-foreground">{t.provincesHint}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{provinces.length}</Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder={t.provinceCode}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="sm:w-28"
              />
              <Input placeholder={t.provinceName} value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={add} disabled={busy || !code || !name}>
                <Plus className="h-4 w-4" />
                {t.addProvince}
              </Button>
            </div>
            <ul className="divide-y rounded-xl border">
              {provinces.map((p) => (
                <li key={p.id} className="flex items-center justify-between px-3 py-2.5">
                  <div className="text-sm">
                    {p.code && <span className="mr-2 font-mono text-muted-foreground">{p.code}</span>}
                    {p.name}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label={t.remove}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.remove}</AlertDialogTitle>
                        <AlertDialogDescription>{t.confirmDeleteProvince}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => remove(p.id)}
                        >
                          {t.remove}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
              {provinces.length === 0 && (
                <li className="p-6 text-center text-sm text-muted-foreground">{t.noData}</li>
              )}
            </ul>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
