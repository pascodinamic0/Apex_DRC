import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { buildConsolidatedSections } from "@/lib/export/consolidated-report";
import { exportConsolidatedDocx } from "@/lib/export/docx-export";

export const Route = createFileRoute("/_authenticated/consolidation")({ component: Consolidation });

function Consolidation() {
  const { t } = useT();
  const { role } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [provinces, setProvinces] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [narratives, setNarratives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === "province_user") return;
    (async () => {
      const { data: pv } = await supabase.from("provinces").select("*").order("name");
      setProvinces(pv || []);
    })();
  }, [role]);

  useEffect(() => {
    if (role === "province_user") return;
    setLoading(true);
    (async () => {
      const { data: rp } = await supabase.from("reports").select("*")
        .eq("month", Number(month)).eq("year", Number(year));
      setReports(rp || []);
      const ids = (rp || []).map((r) => r.id);
      if (ids.length === 0) { setActivities([]); setNarratives([]); setLoading(false); return; }
      const [{ data: acts }, { data: narrs }] = await Promise.all([
        supabase.from("activities").select("*").in("report_id", ids),
        supabase.from("narratives").select("*").in("report_id", ids),
      ]);
      setActivities(acts || []); setNarratives(narrs || []);
      setLoading(false);
    })();
  }, [month, year, role]);

  const aggregated = useMemo(() => {
    const map = new Map<string, { code: string; planned: number; achieved: number }>();
    activities.forEach((a) => {
      const key = a.activity_code || "—";
      const cur = map.get(key) || { code: key, planned: 0, achieved: 0 };
      cur.planned += Number(a.planned || 0); cur.achieved += Number(a.achieved || 0);
      map.set(key, cur);
    });
    return Array.from(map.values());
  }, [activities]);

  const provinceName = (id: string) => provinces.find((p) => p.id === id)?.name || "—";

  const sectionLabels: Record<string, string> = {
    exec_summary_smni: t.smni,
    exec_summary_nutrition: t.nutrition,
    exec_summary_malaria: t.malaria,
    stakeholder_coordination: t.sectionC,
    success_stories: t.sectionD,
    challenges: t.sectionE,
    priorities_next_month: t.sectionF,
  };

  const buildSections = () =>
    buildConsolidatedSections(narratives, reports, provinceName, sectionLabels);

  const exportPdf = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(t.nationalReport, 14, 18);
    doc.setFontSize(11);
    doc.text(`${t.period}: ${t.months[Number(month) - 1]} ${year}`, 14, 26);
    doc.text(`${t.generatedOn} ${new Date().toLocaleDateString()}`, 14, 32);

    autoTable(doc, {
      startY: 40,
      head: [[t.activityCode, t.planned, t.achieved, "%"]],
      body: aggregated.map((a) => [a.code, a.planned, a.achieved, a.planned ? Math.round(a.achieved / a.planned * 100) + "%" : "—"]),
    });

    let y = (doc as any).lastAutoTable.finalY + 10;
    buildSections().forEach((s) => {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFontSize(13); doc.text(s.label, 14, y); y += 6;
      doc.setFontSize(9);
      s.blocks.forEach((b) => {
        const lines = doc.splitTextToSize(`[${b.provinceName}] ${b.content}`, 180);
        if (y + lines.length * 4 > 280) { doc.addPage(); y = 20; }
        doc.text(lines, 14, y); y += lines.length * 4 + 3;
      });
      y += 4;
    });

    doc.save(`epic-rdc-${year}-${month}.pdf`);
    toast.success(t.pdfGenerated);
  };

  const exportDocx = async () => {
    try {
      await exportConsolidatedDocx({
        title: t.nationalReport,
        periodLine: `${t.period}: ${t.months[Number(month) - 1]} ${year}`,
        generatedLine: `${t.generatedOn} ${new Date().toLocaleDateString()}`,
        tableHead: [t.activityCode, t.planned, t.achieved, "%"],
        aggregated,
        sections: buildSections(),
        filename: `epic-rdc-${year}-${month}.docx`,
      });
      toast.success(t.docxGenerated);
    } catch (e: any) {
      toast.error(e.message || t.error);
    }
  };

  if (role === "province_user") return <div className="text-muted-foreground">{t.noAccess}</div>;

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.consolidation}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportDocx}><FileText className="h-4 w-4 mr-1" />{t.exportWord}</Button>
          <Button onClick={exportPdf}><Download className="h-4 w-4 mr-1" />{t.export}</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>{t.filters}</CardTitle></CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div className="space-y-1">
            <Label>{t.month}</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>{t.months.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t.year}</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="ml-auto text-sm text-muted-foreground self-end">
            {reports.length} {t.reports}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t.activities}</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">{t.activityCode}</th>
                    <th className="text-right p-2">{t.planned}</th>
                    <th className="text-right p-2">{t.achieved}</th>
                    <th className="text-right p-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregated.length === 0 ? (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">{t.noData}</td></tr>
                  ) : aggregated.map((a) => (
                    <tr key={a.code} className="border-t">
                      <td className="p-2">{a.code}</td>
                      <td className="p-2 text-right tabular-nums">{a.planned}</td>
                      <td className="p-2 text-right tabular-nums">{a.achieved}</td>
                      <td className="p-2 text-right tabular-nums">{a.planned ? Math.round(a.achieved/a.planned*100) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
