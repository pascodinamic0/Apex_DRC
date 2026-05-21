import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Save, Send, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { queueDraft } from "@/lib/offline/draft-queue";
import { exportSingleReportDocx } from "@/lib/export/docx-export";
import { AchievementTable } from "@/components/achievement-table";
import { ObjectiveActivities } from "@/components/objective-activities";
import { ReportMetaRow } from "@/components/report-meta-row";
import {
  type AchievementSummary,
  type ActivityResponseFields,
  type CatalogRow,
  calcAchievementRate,
  emptyAchievementSummary,
} from "@/lib/activity-catalog";
import { persistExtendedReport, type ReportMeta } from "@/lib/report-data";
import { getDirectorUserIds, notifyUsers } from "@/lib/notifications";
import { loadExtendedReportData } from "@/lib/report-data";

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
  submitted_by_name?: string | null;
  submitter_function?: string | null;
  submission_deadline?: string | null;
}

export function ReportEditor({
  report,
  initialActivities,
  initialNarratives,
  initialAchievement,
  initialActivityResponses,
  initialCatalog,
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
  initialAchievement?: AchievementSummary;
  initialActivityResponses?: ActivityResponseFields[];
  initialCatalog?: CatalogRow[];
  readOnly: boolean;
  isProvinceUser: boolean;
  isDirector: boolean;
  onAfterAction?: () => void;
  showExport?: boolean;
  provinceLabel?: string;
}) {
  const { t, lang } = useT();
  const [narratives, setNarratives] = useState<Narratives>(initialNarratives);
  const [achievement, setAchievement] = useState<AchievementSummary>(initialAchievement || emptyAchievementSummary());
  const [activityResponses, setActivityResponses] = useState<ActivityResponseFields[]>(initialActivityResponses || []);
  const [catalog, setCatalog] = useState<CatalogRow[]>(initialCatalog || []);
  const [meta, setMeta] = useState<ReportMeta>({
    submitted_by_name: report.submitted_by_name ?? null,
    submitter_function: report.submitter_function ?? null,
    submission_deadline: report.submission_deadline ?? null,
  });
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">("idle");
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!initialCatalog?.length) {
      import("@/lib/report-data").then((m) => m.loadCatalog().then(setCatalog));
    }
  }, [initialCatalog]);

  useEffect(() => { dirtyRef.current = true; }, [narratives, achievement, activityResponses, meta]);

  useEffect(() => {
    if (readOnly) return;
    const id = setInterval(() => { if (dirtyRef.current) saveDraft(true); }, 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narratives, achievement, activityResponses, meta]);

  const persistDraft = async () => {
    const payload = { narratives, achievement, activityResponses, meta };
    if (!navigator.onLine) {
      await queueDraft({
        reportId: report.id,
        payload: { activities: initialActivities, narratives, achievement, activityResponses, meta },
        queuedAt: new Date().toISOString(),
      });
      return { offline: true };
    }
    await supabase.from("report_drafts").upsert(
      { report_id: report.id, payload: payload as never, updated_at: new Date().toISOString() },
      { onConflict: "report_id" },
    );
    await persistExtendedReport(report.id, { narratives, achievement, activityResponses, meta });
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
        else if (["submitted", "returned"].includes(report.status) && isProvinceUser) toast.success(t.changesSavedAwaiting);
        else toast.success(t.saved);
      }
      setTimeout(() => setSavingState("idle"), 2000);
    } catch (e: unknown) {
      setSavingState("idle");
      toast.error(e instanceof Error ? e.message : t.error);
    }
  };

  const submit = async () => {
    await saveDraft(true);
    const { error } = await supabase.from("reports").update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      submitted_by_name: meta.submitted_by_name,
      submitter_function: meta.submitter_function,
      submission_deadline: meta.submission_deadline,
    } as never).eq("id", report.id);
    if (error) return toast.error(error.message);
    const directors = await getDirectorUserIds();
    await notifyUsers(directors, {
      type: "report_submitted",
      report_id: report.id,
      title: `${t.submittedToast} — ${provinceLabel}`,
    });
    toast.success(t.submittedToast);
    onAfterAction?.();
  };

  const updateResponse = (code: string, field: keyof Omit<ActivityResponseFields, "catalog_code">, value: string) => {
    setActivityResponses((arr) =>
      arr.map((r) => (r.catalog_code === code ? { ...r, [field]: value } : r)),
    );
  };

  const renderNarrative = (key: string, label: string) => (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <Textarea
        rows={5}
        value={narratives[key] || ""}
        disabled={readOnly}
        onChange={(e) => setNarratives({ ...narratives, [key]: e.target.value })}
      />
    </div>
  );

  const statusCls: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
    in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    returned: "bg-red-500/10 text-red-700 dark:text-red-300",
    validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  };
  const statusLbl: Record<string, string> = {
    draft: t.draft,
    submitted: isProvinceUser ? t.awaitingValidation : t.submitted,
    in_review: t.inReview,
    returned: t.returned,
    validated: t.validated,
  };

  const exportReportDocx = async () => {
    const rate = calcAchievementRate(achievement);
    const sections = [
      { label: t.tabAchievement, content: `${t.achRateLabel}: ${rate}%` },
      { label: t.sectionG, content: [narratives.exec_summary_smni, narratives.exec_summary_nutrition, narratives.exec_summary_malaria].filter(Boolean).join("\n\n") },
      { label: t.tabCoordination, content: [narratives.coordination_smne, narratives.coordination_nutrition, narratives.coordination_malaria].filter(Boolean).join("\n\n") },
    ];
    await exportSingleReportDocx({
      title: `${t.reportFor} ${provinceLabel} — ${t.months[report.month - 1]} ${report.year}`,
      periodLine: `${t.months[report.month - 1]} ${report.year}`,
      tableHead: [t.activityCode, t.achCount, "%"],
      rows: [{ code: t.achFinalizedApproved, planned: achievement.total_planned, achieved: achievement.finalized_approved }],
      sections,
      filename: `epic-report-${report.year}-${report.month}.docx`,
    });
    toast.success(t.docxGenerated);
  };

  const canSubmit = isProvinceUser && !readOnly && report.status === "draft";
  const monthLabel = `${t.months[report.month - 1]} ${report.year}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {isProvinceUser && report.status === "returned" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t.reportReturnedTitle}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{t.reportReturnedDesc}</span>
            <Button size="sm" variant="outline" asChild>
              <Link to="/reports/$reportId/revisions" params={{ reportId: report.id }}>{t.viewComments}</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isProvinceUser && report.status === "submitted" && (
        <Alert>
          <AlertTitle>{t.awaitingValidation}</AlertTitle>
          <AlertDescription>{t.awaitingValidationDesc}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 sticky top-0 bg-background/80 backdrop-blur-sm py-3 z-10 border-b">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{t.reportFor} {monthLabel}</h1>
          <Badge variant="outline" className={statusCls[report.status] || ""}>{statusLbl[report.status] || report.status}</Badge>
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
          {isDirector && (report.status === "submitted" || report.status === "in_review") && (
            <Button size="sm" asChild>
              <Link to="/reports/$reportId/review" params={{ reportId: report.id }}>{t.reviewReport}</Link>
            </Button>
          )}
          {!readOnly && isProvinceUser && (
            <>
              <Button variant="outline" onClick={() => saveDraft()}>
                <Save className="h-4 w-4 mr-1" />{t.saveDraft}
              </Button>
              {canSubmit && (
                <Button onClick={() => { if (confirm(t.confirmSubmit)) submit(); }}>
                  <Send className="h-4 w-4 mr-1" />{t.submitToDt}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <ReportMetaRow
        meta={meta}
        provinceName={provinceLabel}
        monthLabel={monthLabel}
        onChange={(p) => setMeta((m) => ({ ...m, ...p }))}
        readOnly={readOnly}
      />

      <Tabs defaultValue="summary">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="summary">{t.tabSummary}</TabsTrigger>
          <TabsTrigger value="achievement">{t.tabAchievement}</TabsTrigger>
          <TabsTrigger value="obj1">{t.objective} 1</TabsTrigger>
          <TabsTrigger value="obj2">{t.objective} 2</TabsTrigger>
          <TabsTrigger value="obj3">{t.objective} 3</TabsTrigger>
          <TabsTrigger value="coord">{t.tabCoordination}</TabsTrigger>
          <TabsTrigger value="stories">{t.tabStories}</TabsTrigger>
          <TabsTrigger value="challenges">{t.tabChallenges}</TabsTrigger>
          <TabsTrigger value="priorities">{t.tabPriorities}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader><CardTitle>{t.tabSummary}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.summaryHint}</p>
              {renderNarrative("exec_summary_smni", t.smni)}
              {renderNarrative("exec_summary_nutrition", t.nutrition)}
              {renderNarrative("exec_summary_malaria", t.malaria)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievement">
          <Card>
            <CardHeader><CardTitle>{t.tabAchievement}</CardTitle></CardHeader>
            <CardContent>
              <AchievementTable value={achievement} onChange={setAchievement} readOnly={readOnly} />
            </CardContent>
          </Card>
        </TabsContent>

        {[1, 2, 3].map((o) => (
          <TabsContent key={o} value={`obj${o}`}>
            <Card>
              <CardHeader><CardTitle>{t.objective} {o}</CardTitle></CardHeader>
              <CardContent>
                <ObjectiveActivities
                  objective={o}
                  catalog={catalog}
                  responses={activityResponses}
                  onChange={updateResponse}
                  readOnly={readOnly}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="coord">
          <Card>
            <CardHeader><CardTitle>{t.tabCoordination}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.coordHint}</p>
              {renderNarrative("coordination_smne", t.smni)}
              {renderNarrative("coordination_vaccination", t.vaccination)}
              {renderNarrative("coordination_nutrition", t.nutrition)}
              {renderNarrative("coordination_malaria", t.malaria)}
              {renderNarrative("coordination_hmis", "HMIS")}
              {renderNarrative("coordination_medicines", t.medicines)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stories">
          <Card>
            <CardHeader><CardTitle>{t.tabStories}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.storiesHint}</p>
              {renderNarrative("success_smne_vaccination", `${t.smni} / ${t.vaccination}`)}
              {renderNarrative("success_nutrition", t.nutrition)}
              {renderNarrative("success_malaria", t.malaria)}
              {renderNarrative("lessons_learned", t.lessonsLearned)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challenges">
          <Card>
            <CardHeader><CardTitle>{t.tabChallenges}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t.challengesHint}</p>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3 pt-2 border-t first:border-0 first:pt-0">
                  {renderNarrative(`challenge_${i}`, `${t.challenge} ${i}`)}
                  {renderNarrative(`response_${i}`, `${t.response} ${i}`)}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priorities">
          <Card>
            <CardHeader><CardTitle>{t.tabPriorities}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {renderNarrative("priorities_objective_1", `${t.objective} 1`)}
              {renderNarrative("priorities_objective_2", `${t.objective} 2`)}
              {renderNarrative("priorities_objective_3", `${t.objective} 3`)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export async function loadReportData(reportId: string) {
  return loadExtendedReportData(reportId);
}
