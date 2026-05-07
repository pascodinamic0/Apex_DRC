import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FileText, Layers, Archive, LogOut, Menu, Users } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

function Layout() {
  const { user, loading, signOut, profile, role } = useAuth();
  const { t } = useT();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/login" });
  }, [user, loading, nav]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">...</div>;
  }

  const items = [
    { to: "/dashboard", icon: LayoutDashboard, label: t.dashboard },
    { to: "/reports", icon: FileText, label: t.reports },
    ...(role !== "province_user" ? [{ to: "/consolidation", icon: Layers, label: t.consolidation }] : []),
    { to: "/history", icon: Archive, label: t.history },
    ...(role === "technical_director" ? [{ to: "/users", icon: Users, label: t.users }] : []),
  ];

  const roleLabel = role === "technical_director" ? t.director : role === "province_user" ? t.provinceUser : t.readOnly;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-muted/30">
      {/* Sidebar */}
      <aside className={`${open ? "block" : "hidden"} md:block md:w-64 md:flex-shrink-0 bg-card border-r`}>
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">E</div>
            <div>
              <div className="font-semibold leading-tight">{t.appName}</div>
              <div className="text-xs text-muted-foreground">{t.tagline}</div>
            </div>
          </div>
        </div>
        <nav className="p-2 space-y-1">
          {items.map((it) => (
            <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent ${loc.pathname.startsWith(it.to) ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"}`}>
              <it.icon className="h-4 w-4" />{it.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t">
          <div className="text-xs text-muted-foreground mb-1">{roleLabel}</div>
          <div className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</div>
          <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => signOut().then(() => nav({ to: "/login" }))}>
            <LogOut className="h-3.5 w-3.5 mr-2" />{t.logout}
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}><Menu className="h-5 w-5" /></Button>
          <div className="font-semibold">{t.appName}</div>
          <LangSwitch />
        </header>
        <header className="hidden md:flex items-center justify-end gap-3 p-3 border-b bg-card">
          <LangSwitch />
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-x-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
