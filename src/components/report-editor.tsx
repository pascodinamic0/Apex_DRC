import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Plus, Save, Send, HelpCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { queueDraft } from "@/lib/offline/draft-queue";
import { helpSectionsFr } from "@/content/help.fr";
import { helpSectionsEn } from "@/content/help.en";
import { exportSingleReportDocx } from "@/lib/export/docx-export";

export interface ActivityRow {
  id?: string;
  objective: number;
  activity_code: string;
  description: string;
  planned: number;
  achieved: number;
}

export type Narratives = Record<string, string>;

export interface ReportData {
  id: string;
  province_id: string;
  month: number;
  year: number;
  status: string;
}

export function ReportEditor({
  report,
  initialActivities,
  initialNarratives,
  readOnly,
  isProvinceUser,
  isDirector,
  onAfterAction,
  showExport = false,
  provinceLabel = "",
}: {
  report: ReportData;
  initialActivities: ActivityRow[];
  initialNarratives: Narratives;
  readOnly: boolean;
  isProvinceUser: boolean;
  isDirector: boolean;
  onAfterAction?: () => void;
  showExport?: boolean;
  provinceLabel?: string;
}) {
  const { t, lang } = useT();
  const [activities, setActivities] = useState<ActivityRow[]>(initialActivities);
  const [narratives, setNarratives] = useState<Narratives>(initialNarratives);
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const dirtyRef = useRef(false);

  useEffect(() => { dirtyRef.current = true; }, [activities, narratives]);

  // Autosave every 30s
  useEffect(() => {
    if (readOnly) return;
    const id = setInterval(() => {
      if (dirtyRef.current) saveDraft(true);
    }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, narratives]);

  const persistDraft = async () => {
    if (!navigator.onLine) {
      await queueDraft({
        reportId: report.id,
        payload: { activities, narratives },
        queuedAt: new Date().toISOString(),
      });
      return { offline: true };
    }
    await supabase.from("report_drafts").upsert(
      { report_id: report.id, payload: { activities, narratives } as any, updated_at: new Date().toISOString() },
      { onConflict: "report_id" },
    );
    await supabase.from("activities").delete().eq("report_id", report.id);
    if (activities.length) {
      await supabase.from("activities").insert(activities.map((a, idx) => ({
        report_id: report.id,
        objective: a.objective,
        activity_code: a.activity_code,
        description: a.description,
        planned: a.planned || 0,
        achieved: a.achieved || 0,
        position: idx,
      })));
    }
    // Sync narratives
    for (const [section_type, content] of Object.entries(narratives)) {
      await supabase.from("narratives").upsert(
        { report_id: report.id, section_type: section_type as any, content },
        { onConflict: "report_id,section_type" },
      );
    }
    return {};
  };

  const saveDraft = async (silent = false) => {
    setSavingState("saving");
    try {
      const result = await persistDraft();
      dirtyRef.current = false;
      setSavingState("saved");
      if (!silent) {
        if (result?.offline) toast.success(t.offline + " — " + t.pendingSync);
        else if (report.status === "submitted" && isProvinceUser) toast.success(t.changesSavedAwaiting);
        else toast.success(t.saved);
      }
      setTimeout(() => setSavingState("idle"), 2000);
    } catch (e: any) {
      setSavingState("idle");
      toast.error(e.message || t.error);
    }
  };

  const submit = async () => {
    await saveDraft(true);
    const { error } = await supabase.from("reports").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
    }).eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success(t.submittedToast);
    onAfterAction?.();
  };

  const validate = async () => {
    const { error } = await supabase.from("reports").update({
      status: "validated",
      validated_at: new Date().toISOString(),
    }).eq("id", report.id);
    if (error) return toast.error(error.message);
    toast.success(t.validatedToast);
    onAfterAction?.();
  };

  const updateActivity = (idx: number, patch: Partial<ActivityRow>) => {
    setActivities((arr) => arr.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };
  const addActivity = (objective: number) => setActivities((arr) => [...arr, { objective, activity_code: "", description: "", planned: 0, achieved: 0 }]);
  const removeActivity = (idx: number) => setActivities((arr) => arr.filter((_, i) => i !== idx));

  const sectionASummary = activities.filter((a) => a.objective === 1);

  const renderActivityTable = (objective: number) => {
    const rows = activities.map((a, i) => ({ a, i })).filter((x) => x.a.objective === objective);
    return (
      <div className="space-y-2">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium">{t.activityCode}</th>
                <th className="text-left p-2 font-medium">{t.description}</th>
                <th className="text-right p-2 font-medium w-24">{t.planned}</th>
                <th className="text-right p-2 font-medium w-24">{t.achieved}</th>
                <th className="text-right p-2 font-medium w-16">%</th>
                {!readOnly && <th className="w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={readOnly ? 5 : 6} className="p-4 text-center text-muted-foreground">—</td></tr>
              )}
              {rows.map(({ a, i }) => {
                const pct = a.planned > 0 ? Math.round((a.achieved / a.planned) * 100) : 0;
                return (
                  <tr key={i} className="border-t">
                    <td className="p-1.5">
                      <Input className="h-8" value={a.activity_code} disabled={readOnly}
                        onChange={(e) => updateActivity(i, { activity_code: e.target.value })} />
                    </td>
                    <td className="p-1.5">
                      <Input className="h-8" value={a.description} disabled={readOnly}
                        onChange={(e) => updateActivity(i, { description: e.target.value })} />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" className="h-8 text-right" value={a.planned} disabled={readOnly}
                        onChange={(e) => updateActivity(i, { planned: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="p-1.5">
                      <Input type="number" className="h-8 text-right" value={a.achieved} disabled={readOnly}
                        onChange={(e) => updateActivity(i, { achieved: Number(e.target.value) || 0 })} />
                    </td>
                    <td className="p-2 text-right tabular-nums">{pct}%</td>
                    {!readOnly && (
                      <td className="p-1">
                        <Button size="icon" variant="ghost" onClick={() => removeActivity(i)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={() => addActivity(objective)}>
            <Plus className="h-3.5 w-3.5 mr-1" />{t.addActivity}
          </Button>
        )}
      </div>
    );
  };

  const renderNarrative = (key: string, label: string, tipId?: string) => (
    <div className="space-y-2">
      <SectionLabel label={label} tipId={tipId} />
      <Textarea
        rows={6}
        value={narratives[key] || ""}
        disabled={readOnly}
        onChange={(e) => setNarratives({ ...narratives, [key]: e.target.value })}
      />
    </div>
  );

  const statusCls: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
    validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
  const statusLbl: Record<string, string> = {
    draft: t.draft,
    submitted: isProvinceUser ? t.awaitingValidation : t.submitted,
    validated: t.validated,
  };

  const helpTip = (id: string) => {
    const sections = lang === "en" ? helpSectionsEn : helpSectionsFr;
    const s = sections.find((x) => x.id === id);
    return s?.body[0] || "";
  };

  const SectionLabel = ({ label, tipId }: { label: string; tipId?: string }) => (
    <div className="flex items-center gap-1">
      <span className="text-sm font-medium">{label}</span>
      {tipId && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground"><HelpCircle className="h-3.5 w-3.5" /></button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-xs">{helpTip(tipId)}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );

  const exportReportDocx = async () => {
    const rows = activities.map((a) => ({
      code: a.activity_code || "—",
      planned: a.planned,
      achieved: a.achieved,
    }));
    const sections = [
      { label: t.sectionC, content: narratives.stakeholder_coordination || "" },
      { label: t.sectionD, content: narratives.success_stories || "" },
      { label: t.sectionE, content: narratives.challenges || "" },
      { label: t.sectionF, content: narratives.priorities_next_month || "" },
      { label: t.sectionG, content: [narratives.exec_summary_smni, narratives.exec_summary_nutrition, narratives.exec_summary_malaria].filter(Boolean).join("\n\n") },
    ];
    await exportSingleReportDocx({
      title: `${t.reportFor} ${provinceLabel || ""} — ${t.months[report.month - 1]} ${report.year}`,
      periodLine: `${t.months[report.month - 1]} ${report.year}`,
      tableHead: [t.activityCode, t.planned, t.achieved, "%"],
      rows,
      sections,
      filename: `epic-report-${report.year}-${report.month}.docx`,
    });
    toast.success(t.docxGenerated);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {isProvinceUser && report.status === "submitted" && (
        <Alert>
          <AlertTitle>{t.awaitingValidation}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{t.awaitingValidationDesc}</p>
            {readOnly && (
              <Link to="/reports/$reportId/edit" params={{ reportId: report.id }}>
                <Button size="sm" variant="outline">{t.editReportAgain}</Button>
              </Link>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 sticky top-0 bg-background/80 backdrop-blur-sm py-3 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {t.reportFor} {t.months[report.month - 1]} {report.year}
          </h1>
          <Badge variant="outline" className={statusCls[report.status]}>{statusLbl[report.status]}</Badge>
          {savingState !== "idle" && (
            <span className="text-xs text-muted-foreground">{savingState === "saving" ? t.saving : t.autoSaved}</span>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {showExport && (
            <Button variant="outline" size="sm" onClick={exportReportDocx}>
              <FileText className="h-4 w-4 mr-1" />{t.exportReport}
            </Button>
          )}
          {!readOnly && isProvinceUser && (
            <>
              <Button variant="outline" onClick={() => saveDraft()}>
                <Save className="h-4 w-4 mr-1" />{t.saveDraft}
              </Button>
              {report.status === "draft" && (
                <Button onClick={() => { if (confirm(t.confirmSubmit)) submit(); }}>
                  <Send className="h-4 w-4 mr-1" />{t.submit}
                </Button>
              )}
            </>
          )}
          {isDirector && report.status === "submitted" && (
            <Button onClick={validate}>{t.validate}</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="A">
        <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full">
          <TabsTrigger value="A">A</TabsTrigger>
          <TabsTrigger value="B">B</TabsTrigger>
          <TabsTrigger value="C">C</TabsTrigger>
          <TabsTrigger value="D">D</TabsTrigger>
          <TabsTrigger value="E">E</TabsTrigger>
          <TabsTrigger value="F">F</TabsTrigger>
          <TabsTrigger value="G">G</TabsTrigger>
        </TabsList>

        <TabsContent value="A">
          <Card>
            <CardHeader><CardTitle>{t.sectionA}</CardTitle></CardHeader>
            <CardContent>{renderActivityTable(1)}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="B" className="space-y-4">
          {[1, 2, 3].map((o) => (
            <Card key={o}>
              <CardHeader><CardTitle>{t.objective} {o}</CardTitle></CardHeader>
              <CardContent>{renderActivityTable(o)}</CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="C">
          <Card><CardContent className="p-6">{renderNarrative("stakeholder_coordination", t.sectionC, "province-report")}</CardContent></Card>
        </TabsContent>
        <TabsContent value="D">
          <Card><CardContent className="p-6">{renderNarrative("success_stories", t.sectionD)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="E">
          <Card><CardContent className="p-6">{renderNarrative("challenges", t.sectionE)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="F">
          <Card><CardContent className="p-6">{renderNarrative("priorities_next_month", t.sectionF)}</CardContent></Card>
        </TabsContent>
        <TabsContent value="G">
          <Card><CardHeader><CardTitle>{t.sectionG}</CardTitle></CardHeader><CardContent className="space-y-4">
            {renderNarrative("exec_summary_smni", t.smni)}
            {renderNarrative("exec_summary_nutrition", t.nutrition)}
            {renderNarrative("exec_summary_malaria", t.malaria)}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export async function loadReportData(reportId: string) {
  const [{ data: report }, { data: acts }, { data: narrs }] = await Promise.all([
    supabase.from("reports").select("*").eq("id", reportId).single(),
    supabase.from("activities").select("*").eq("report_id", reportId).order("position"),
    supabase.from("narratives").select("*").eq("report_id", reportId),
  ]);
  const narratives: Narratives = {};
  (narrs || []).forEach((n: any) => { narratives[n.section_type] = n.content; });
  return {
    report: report as ReportData,
    activities: ((acts || []) as any[]).map((a) => ({
      id: a.id, objective: a.objective, activity_code: a.activity_code || "",
      description: a.description || "", planned: Number(a.planned || 0), achieved: Number(a.achieved || 0),
    })) as ActivityRow[],
    narratives,
  };
}
