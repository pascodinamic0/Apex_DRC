import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { LangSwitch } from "@/components/lang-switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { LayoutDashboard, FileText, Layers, Archive, LogOut, Menu, Users } from "lucide-react";

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

  const NavContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold">E</div>
          <div className="min-w-0">
            <div className="font-semibold leading-tight truncate">{t.appName}</div>
            <div className="text-xs text-muted-foreground truncate">{t.tagline}</div>
          </div>
        </div>
      </div>
      <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
        {items.map((it) => (
          <Link key={it.to} to={it.to} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent ${loc.pathname.startsWith(it.to) ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground"}`}>
            <it.icon className="h-4 w-4 shrink-0" />{it.label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground mb-1">{roleLabel}</div>
        <div className="text-sm font-medium truncate">{profile?.full_name || profile?.email}</div>
        <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => signOut().then(() => nav({ to: "/login" }))}>
          <LogOut className="h-3.5 w-3.5 mr-2" />{t.logout}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 bg-card border-r flex-col">
        {NavContent}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b bg-card sticky top-0 z-30">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetHeader className="sr-only">
                <SheetTitle>{t.appName}</SheetTitle>
              </SheetHeader>
              {NavContent}
            </SheetContent>
          </Sheet>
          <div className="font-semibold truncate px-2">{t.appName}</div>
          <LangSwitch />
        </header>
        <header className="hidden md:flex items-center justify-end gap-3 p-3 border-b bg-card">
          <LangSwitch />
        </header>
        <main className="flex-1 p-4 md:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
