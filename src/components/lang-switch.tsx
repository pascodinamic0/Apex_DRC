import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function LangSwitch() {
  const { lang, setLang } = useT();
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      <Button
        type="button" size="sm" variant={lang === "fr" ? "default" : "ghost"}
        className="h-7 px-3 text-xs" onClick={() => setLang("fr")}
      >FR</Button>
      <Button
        type="button" size="sm" variant={lang === "en" ? "default" : "ghost"}
        className="h-7 px-3 text-xs" onClick={() => setLang("en")}
      >EN</Button>
    </div>
  );
}
