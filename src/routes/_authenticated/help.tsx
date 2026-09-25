import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { helpSectionsFr } from "@/content/help.fr";
import { helpSectionsEn, filterHelpSections } from "@/content/help.en";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/help")({ component: HelpPage });

function HelpPage() {
  const { role } = useAuth();
  const { t, lang } = useT();
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const all = lang === "en" ? helpSectionsEn : helpSectionsFr;
    const filtered = filterHelpSections(all, role);
    if (!query.trim()) return filtered;
    const q = query.toLowerCase();
    return filtered.filter(
      (s) => s.title.toLowerCase().includes(q) || s.body.some((b) => b.toLowerCase().includes(q)),
    );
  }, [lang, role, query]);

  const downloadPdfGuide = async () => {
    const { downloadHelpGuidePdf } = await import("@/lib/export/help-guide-pdf");
    await downloadHelpGuidePdf(sections, lang, t.helpTitle);
    toast.success(t.guideGenerated);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.helpTitle}</h1>
        <Button variant="outline" size="sm" onClick={downloadPdfGuide}><Download className="h-4 w-4 mr-1" />{t.downloadGuide}</Button>
      </div>

      <Input placeholder={t.searchHelp} value={query} onChange={(e) => setQuery(e.target.value)} />

      {role === "technical_director" && (
        <p className="text-sm text-muted-foreground">{t.dtAccountsNote}</p>
      )}

      {sections.length === 0 ? (
        <p className="text-muted-foreground">{t.noData}</p>
      ) : sections.map((s) => (
        <Card key={s.id}>
          <CardHeader><CardTitle className="text-lg">{s.title}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {s.body.map((p, i) => (
              /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p) ? (
                <p key={i}><a className="font-medium text-primary underline" href={`mailto:${p}`}>{p}</a></p>
              ) : /^\+\d[\d\s()-]{7,}$/.test(p) ? (
                <p key={i}><a className="font-medium text-primary underline" href={`tel:${p.replace(/\s/g, "")}`}>{p}</a></p>
              ) : (
                <p key={i}>{p}</p>
              )
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
