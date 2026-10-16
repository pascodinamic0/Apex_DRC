import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Languages, LogOut, Menu, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";
import type { NavItem } from "@/lib/auth/navigation";
import { useT, type Lang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function isActive(item: NavItem, pathname: string) {
  return item.exact ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
}

export function MobileTabBar({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const { t, lang, setLang } = useT();
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [more, setMore] = useState(false);
  const tabs = items.slice(0, 3);
  const extra = items.slice(3);
  const moreActive =
    extra.some((item) => isActive(item, pathname)) || pathname === "/profile" || pathname.startsWith("/profile/");

  const changeLang = (next: Lang) => {
    setLang(next);
    if (user) void supabase.from("profiles").update({ preferred_lang: next }).eq("id", user.id);
  };

  const closeAndGo = () => setMore(false);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-xl md:hidden"
        aria-label={t.navMore}
      >
        <div
          className="mx-auto grid h-[calc(4rem+env(safe-area-inset-bottom))] max-w-lg items-start px-1 pb-[env(safe-area-inset-bottom)]"
          style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
        >
          {tabs.map((item) => {
            const active = isActive(item, pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMore(true)}
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold",
              moreActive ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Menu className="h-[22px] w-[22px]" strokeWidth={moreActive ? 2.4 : 2} />
            {t.navMore}
          </button>
        </div>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left">
            <SheetTitle>{t.navMore}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {extra.map((item) => {
              const active = isActive(item, pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={closeAndGo}
                  className={cn(
                    "flex min-h-24 flex-col justify-between rounded-3xl border p-4 text-left",
                    active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
                  )}
                >
                  <item.icon className="h-6 w-6" />
                  <span className="text-[15px] font-bold">{item.label}</span>
                </Link>
              );
            })}
            <Link
              to="/profile"
              onClick={closeAndGo}
              className={cn(
                "flex min-h-24 flex-col justify-between rounded-3xl border p-4 text-left",
                pathname === "/profile" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card",
              )}
            >
              <Settings className="h-6 w-6" />
              <span className="text-[15px] font-bold">{t.settings}</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setMore(false);
                void signOut().then(() => nav({ to: "/login" }));
              }}
              className="flex min-h-24 flex-col justify-between rounded-3xl border border-border bg-card p-4 text-left text-destructive"
            >
              <LogOut className="h-6 w-6" />
              <span className="text-[15px] font-bold">{t.logout}</span>
            </button>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Languages className="h-4 w-4" />
              {t.languagePreference}
            </span>
            <div className="flex rounded-full bg-background p-1">
              {(["fr", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => changeLang(code)}
                  className={cn(
                    "h-9 min-w-11 rounded-full px-3 text-sm font-semibold",
                    lang === code ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {code === "fr" ? "FR" : "EN"}
                </button>
              ))}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
