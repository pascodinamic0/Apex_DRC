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
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text(t.helpTitle, 14, y);
    y += 12;
    doc.setFontSize(10);
    sections.forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(12);
      doc.text(s.title, 14, y);
      y += 8;
      doc.setFontSize(9);
      s.body.forEach((p) => {
        const lines = doc.splitTextToSize(p, 180);
        if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
        doc.text(lines, 14, y);
        y += lines.length * 5 + 2;
      });
      y += 6;
    });
    doc.save(`epic-rdc-guide-${lang}.pdf`);
    toast.success(t.guideGenerated);
  };

  const downloadDocxGuide = async () => {
    const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
    const children = sections.flatMap((s) => [
      new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_2 }),
      ...s.body.map((p) => new Paragraph(p)),
      new Paragraph(""),
    ]);
    const doc = new Document({
      sections: [{ children: [new Paragraph({ text: t.helpTitle, heading: HeadingLevel.HEADING_1 }), ...children] }],
    });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `epic-rdc-guide-${lang}.docx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.guideGenerated);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.helpTitle}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={downloadPdfGuide}><Download className="h-4 w-4 mr-1" />{t.downloadGuide}</Button>
          <Button variant="outline" size="sm" onClick={downloadDocxGuide}><Download className="h-4 w-4 mr-1" />{t.downloadGuideDocx}</Button>
        </div>
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
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
