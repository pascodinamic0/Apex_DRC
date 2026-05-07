import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { listUsers, inviteUser, removeUser } from "@/lib/admin-users.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

function UsersPage() {
  const { t } = useT();
  const { role } = useAuth();
  const nav = useNavigate();
  const list = useServerFn(listUsers);
  const invite = useServerFn(inviteUser);
  const remove = useServerFn(removeUser);
  const [data, setData] = useState<{ users: any[]; provinces: any[] }>({ users: [], provinces: [] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", fullName: "", provinceId: "", role: "province_user" as const });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role && role !== "technical_director") nav({ to: "/dashboard" });
  }, [role, nav]);

  const refresh = () => list().then(setData).catch((e) => toast.error(e.message));
  useEffect(() => { if (role === "technical_director") refresh(); }, [role]);

  const onInvite = async () => {
    setBusy(true);
    try {
      await invite({ data: {
        email: form.email, fullName: form.fullName,
        provinceId: form.role === "province_user" ? (form.provinceId || null) : null,
        role: form.role,
      }});
      toast.success(t.inviteSent);
      setOpen(false);
      setForm({ email: "", fullName: "", provinceId: "", role: "province_user" });
      refresh();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const onRemove = async (userId: string) => {
    if (!confirm(t.confirmRemove)) return;
    try { await remove({ data: { userId } }); refresh(); }
    catch (e: any) { toast.error(e.message); }
  };

  if (role !== "technical_director") return null;

  const provinceName = (id: string | null) => data.provinces.find((p) => p.id === id)?.name || "—";
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
                      {data.provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
            {data.users.map((u) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
