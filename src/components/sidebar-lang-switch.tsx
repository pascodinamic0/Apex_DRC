import { Languages } from "lucide-react";
import { useT } from "@/lib/i18n";
import { SidebarMenuButton } from "@/components/ui/sidebar";

/** Compact FR/EN toggle for the sidebar footer (replaces header language control). */
export function SidebarLangSwitch() {
  const { lang, setLang, t } = useT();
  return (
    <SidebarMenuButton
      tooltip={t.languagePreference}
      className="cursor-default gap-1.5 hover:bg-sidebar-accent"
      onClick={(e) => e.preventDefault()}
    >
      <Languages className="shrink-0" />
      <span className="inline-flex shrink-0 rounded-md border bg-background p-0.5 group-data-[collapsible=icon]:hidden">
        <button
          type="button"
          className={`rounded px-2.5 py-0.5 text-xs font-medium ${lang === "fr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setLang("fr")}
        >
          FR
        </button>
        <button
          type="button"
          className={`rounded px-2.5 py-0.5 text-xs font-medium ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
      </span>
    </SidebarMenuButton>
  );
}
