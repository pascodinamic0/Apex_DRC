import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LangSwitch({
  tone = "default",
  className,
}: {
  tone?: "default" | "utility";
  className?: string;
}) {
  const { lang, setLang } = useT();
  if (tone === "utility") {
    return (
      <div className={cn("inline-flex overflow-hidden rounded-md bg-primary text-primary-foreground", className)}>
        {(["fr", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            className={cn(
              "px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              lang === code ? "bg-black/15" : "hover:bg-black/10",
            )}
          >
            {code}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cn("inline-flex rounded-full border bg-background p-0.5", className)}>
      {(["fr", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={cn(
            "h-7 rounded-full px-3 text-xs font-medium",
            lang === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
