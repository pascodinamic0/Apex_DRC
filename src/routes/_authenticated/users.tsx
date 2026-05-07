import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

interface UserRow { id: string; email: string | null; full_name: string | null; province_id: string | null; role: string | null }
interface ProvinceRow { id: string; name: string }

async function authedFetch(input: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      ...(init.headers || {}),
    },
  });
}

function UsersPage() {
  const { t } = useT();
  const { role } = useAuth();
  const nav = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", provinceId: "", role: "province_user" as "province_user" | "technical_director" | "read_only" });
  const [busy, setBusy] = useState(false);

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
      supabase.from("profiles").select("id, email, full_name, province_id"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) return toast.error(pErr.message);
    if (rErr) return toast.error(rErr.message);
    const merged: UserRow[] = (profiles || []).map((p: any) => ({
      ...p,
      role: roles?.find((r: any) => r.user_id === p.id)?.role || null,
    }));
    setUsers(merged);
  };

  const refresh = async () => {
    await Promise.all([refreshProvinces(), refreshUsers()]);
  };

  useEffect(() => { if (role === "technical_director") refresh(); }, [role]);

  const onInvite = async () => {
    setBusy(true);
    try {
      const res = await authedFetch("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email, fullName: form.fullName,
          provinceId: form.role === "province_user" ? (form.provinceId || null) : null,
          role: form.role,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t.inviteSent);
      setOpen(false);
      setForm({ email: "", fullName: "", provinceId: "", role: "province_user" });
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const onRemove = async (userId: string) => {
    if (!confirm(t.confirmRemove)) return;
    try {
      const res = await authedFetch("/api/admin/users", { method: "DELETE", body: JSON.stringify({ userId }) });
      if (!res.ok) throw new Error(await res.text());
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  if (role !== "technical_director") return null;

  const provinceName = (id: string | null) => provinces.find((p) => p.id === id)?.name || "—";
  const roleLabel = (r: string | null) =>
    r === "technical_director" ? t.director : r === "read_only" ? t.readOnly : r === "province_user" ? t.provinceUser : "—";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.users}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />{t.addUser}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.addUser}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t.fullName}</Label><Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
              <div><Label>{t.email}</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div>
                <Label>{t.role}</Label>
                <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="province_user">{t.provinceUser}</SelectItem>
                    <SelectItem value="technical_director">{t.director}</SelectItem>
                    <SelectItem value="read_only">{t.readOnly}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "province_user" && (
                <div>
                  <Label>{t.province}</Label>
                  <Select value={form.provinceId} onValueChange={(v) => setForm({ ...form, provinceId: v })}>
                    <SelectTrigger><SelectValue placeholder={t.selectProvince} /></SelectTrigger>
                    <SelectContent>
                      {provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button onClick={onInvite} disabled={busy || !form.email || !form.fullName}>{t.invite}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{u.full_name || u.email}</div>
                  <div className="text-sm text-muted-foreground truncate">{u.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{roleLabel(u.role)}</Badge>
                  {u.role === "province_user" && <span className="text-sm text-muted-foreground hidden sm:inline">{provinceName(u.province_id)}</span>}
                  <Button size="icon" variant="ghost" onClick={() => onRemove(u.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {users.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">—</div>}
          </div>
        </CardContent>
      </Card>

      <ProvincesManager provinces={provinces} onChange={refresh} />
    </div>
  );
}

function ProvincesManager({ provinces, onChange }: { provinces: ProvinceRow[]; onChange: () => void }) {
  const { t } = useT();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!code || !name) return;
    setBusy(true);
    const { error } = await supabase.from("provinces").insert({ code, name });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCode(""); setName(""); onChange();
  };

  const remove = async (id: string) => {
    if (!confirm(t.confirmDeleteProvince)) return;
    const { error } = await supabase.from("provinces").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChange();
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <h2 className="text-xl font-semibold">{t.provinces}</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input placeholder={t.provinceCode} value={code} onChange={(e) => setCode(e.target.value)} className="sm:w-32" />
          <Input placeholder={t.provinceName} value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={add} disabled={busy || !code || !name}><Plus className="h-4 w-4 mr-1" />{t.addProvince}</Button>
        </div>
        <div className="divide-y border rounded-md">
          {provinces.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3">
              <div className="text-sm"><span className="font-mono text-muted-foreground mr-2">{(p as any).code || ""}</span>{p.name}</div>
              <Button size="icon" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {provinces.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">—</div>}
        </div>
      </CardContent>
    </Card>
  );
}
