import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AchievementTable } from "@/components/achievement-table";
import { ObjectiveActivities } from "@/components/objective-activities";
import { ReportMediaPanel } from "@/components/report-media";
import {
  type AchievementSummary,
  type ActivityResponseFields,
  type CatalogRow,
} from "@/lib/activity-catalog";
import { toast } from "sonner";
import { narrativeQuestion } from "@/lib/narrative-questions";

export function fieldTarget(key: string) {
  return `field:${key}`;
}

export function activityTarget(code: string) {
  return `activity:${code}`;
}

export function commentMatches(sectionKey: string, target: string) {
  if (sectionKey === target) return true;
  const bare = target.startsWith("field:") ? target.slice(6) : target.startsWith("activity:") ? target.slice(9) : target;
  return sectionKey === bare;
}

export interface ReviewField {
  label: string;
  text: string;
  target: string;
}

export interface ReviewSection {
  key: string;
  title: string;
  fields: ReviewField[];
  commentKeys: string[];
  kind: "fields" | "achievement" | "activities" | "media";
  objective?: number;
}

export type ReviewSubmission = {
  narratives: Record<string, string>;
  achievement: AchievementSummary;
  catalog: CatalogRow[];
  activityResponses: ActivityResponseFields[];
};

interface CommentRow {
  id: string;
  section_key: string;
  author_id: string;
  body: string;
  created_at: string;
  resolved_at: string | null;
  profiles?: { full_name: string | null } | null;
}

interface Props {
  reportId: string;
  provinceId: string;
  reportStatus: string;
  submission: ReviewSubmission;
  mode: "dt" | "cp";
  onStatusChange?: () => void;
}

export function ReportReviewPanel({ reportId, reportStatus, submission, mode, onStatusChange }: Props) {
  const { t, lang } = useT();
  const { user, can } = useAuth();
  const sections = useMemo(
    () => buildReviewSections(submission, t),
    [submission, t],
  );
  const canValidate = can("validate_reports");
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data: cm }, { data: narrs }] = await Promise.all([
      supabase.from("report_comments").select("id, section_key, author_id, body, created_at, resolved_at").eq("report_id", reportId).order("created_at"),
      supabase.from("narratives").select("section_type, content").eq("report_id", reportId),
    ]);
    const rows = (cm || []) as CommentRow[];
    const authorIds = [...new Set(rows.map((c) => c.author_id))];
    const { data: profs } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] };
    const nameMap = new Map((profs || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
    setComments(rows.map((c) => ({ ...c, profiles: { full_name: nameMap.get(c.author_id) ?? null } })));
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(submission.narratives)) next[key] = value || "";
    for (const row of (narrs || []) as { section_type: string; content: string | null }[]) {
      next[row.section_type] = row.content || "";
    }
    setAnswers(next);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const refresh = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [reportId]);

  const openCount = comments.filter((c) => !c.resolved_at).length;
  const canMark = mode === "dt" && canValidate && reportStatus !== "validated";
  const canReply = mode === "cp" && reportStatus === "returned";
  const canAnswer = mode === "cp" && reportStatus !== "validated";

  const saveNarrative = async (key: string, content: string) => {
    const { error } = await supabase.from("narratives").upsert(
      { report_id: reportId, section_type: key, content } as never,
      { onConflict: "report_id,section_type" },
    );
    if (error) toast.error(error.message);
    else toast.success(t.saved);
  };

  const notesFor = (target: string) => comments.filter((c) => commentMatches(c.section_key, target));

  const renderSpot = (target: string, also: string[] = []) => {
    const notes = [...notesFor(target), ...also.flatMap((item) => notesFor(item))].filter((note, index, list) => list.findIndex((row) => row.id === note.id) === index);
    const open = notes.some((c) => !c.resolved_at);
    if (!notes.length && !canMark && !canReply) return null;
    return (
      <div className={`space-y-2 rounded-md p-3 ${open ? "border border-red-500 bg-red-50 dark:bg-red-950/30" : "border border-dashed"}`}>
        {open && <p className="text-xs font-medium text-red-700">{t.fixThisSpot}</p>}
        {notes.map((c) => (
          <div key={c.id} className={`text-sm ${c.resolved_at ? "text-muted-foreground" : "text-red-900 dark:text-red-100"}`}>
            <div className="text-xs text-muted-foreground mb-1">
              {c.profiles?.full_name || "—"} · {new Date(c.created_at).toLocaleString()}
            </div>
            {c.body}
          </div>
        ))}
        {canMark && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              placeholder={t.addCommentPlaceholder}
              value={drafts[target] || ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [target]: e.target.value }))}
            />
            <Button size="sm" variant="destructive" onClick={() => addComment(target)} disabled={!(drafts[target] || "").trim()}>
              {t.markThisSpot}
            </Button>
          </div>
        )}
        {canMark && open && (
          <Button size="sm" onClick={() => validateResponse(target)}>{t.validateResponse}</Button>
        )}
        {canReply && open && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              placeholder={t.correctionPlaceholder}
              value={drafts[`reply-${target}`] || ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [`reply-${target}`]: e.target.value }))}
            />
            <Button size="sm" onClick={() => resolveWithReply(target)}>{t.sendCorrection}</Button>
          </div>
        )}
      </div>
    );
  };

  const addComment = async (sectionKey: string) => {
    const body = (drafts[sectionKey] || "").trim();
    if (!body || !user) return;
    const { error } = await supabase.from("report_comments").insert({
      report_id: reportId,
      section_key: sectionKey,
      author_id: user.id,
      body,
    } as never);
    if (error) return toast.error(error.message);
    setDrafts((d) => ({ ...d, [sectionKey]: "" }));
    toast.success(t.commentSent);
    load();
    onStatusChange?.();
  };

  const validateResponse = async (target: string) => {
    const open = comments.filter((c) => commentMatches(c.section_key, target) && !c.resolved_at);
    const now = new Date().toISOString();
    for (const note of open) {
      const { error } = await supabase.from("report_comments").update({ resolved_at: now }).eq("id", note.id);
      if (error) return toast.error(error.message);
    }
    toast.success(t.responseValidated);
    load();
  };

  const resolveWithReply = async (sectionKey: string) => {
    const body = (drafts[`reply-${sectionKey}`] || "").trim();
    if (!body || !user) return;
    await supabase.from("report_comments").insert({
      report_id: reportId,
      section_key: sectionKey,
      author_id: user.id,
      body,
    } as never);
    const open = comments.filter((c) => commentMatches(c.section_key, sectionKey) && !c.resolved_at);
    for (const c of open) {
      await supabase.from("report_comments").update({ resolved_at: new Date().toISOString() }).eq("id", c.id);
    }
    setDrafts((d) => ({ ...d, [`reply-${sectionKey}`]: "" }));
    toast.success(t.correctionSent);
    load();
  };

  const returnToCp = async () => {
    const { error } = await supabase.from("reports").update({
      status: "returned",
      returned_at: new Date().toISOString(),
      returned_by: user?.id,
    } as never).eq("id", reportId);
    if (error) return toast.error(error.message);
    toast.success(t.reportReturned);
    onStatusChange?.();
  };

  const validateReport = async () => {
    if (openCount > 0 && !confirm(t.validateWithOpenComments)) return;
    const { error } = await supabase.from("reports").update({
      status: "validated",
      validated_at: new Date().toISOString(),
      validated_by: user?.id,
    } as never).eq("id", reportId);
    if (error) return toast.error(error.message);
    toast.success(t.validatedToast);
    onStatusChange?.();
  };

  const resubmit = async () => {
    const { error } = await supabase.from("reports").update({
      status: "submitted",
      returned_at: null,
      returned_by: null,
    } as never).eq("id", reportId);
    if (error) return toast.error(error.message);
    toast.success(t.resubmittedToast);
    onStatusChange?.();
  };

  if (loading) return <p className="text-sm text-muted-foreground">{t.loading}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {openCount > 0 && <Badge variant="destructive">{openCount} {t.openComments}</Badge>}
      </div>

      <Accordion type="multiple" defaultValue={sections.filter((s) => comments.some((c) => !c.resolved_at && s.commentKeys.some((key) => commentMatches(c.section_key, key)))).map((s) => s.key)} className="w-full">
        {sections.map((sec) => {
          const secComments = comments.filter((c) => sec.commentKeys.some((key) => commentMatches(c.section_key, key)));
          const flagged = secComments.some((c) => !c.resolved_at);
          return (
            <AccordionItem key={sec.key} value={sec.key} className={`border rounded-lg px-3 mb-2 ${flagged ? "border-red-400" : ""}`}>
              <AccordionTrigger>
                <div className="flex items-center gap-2 flex-1 text-left">
                  <span className="text-sm font-medium">{sec.title}</span>
                  {flagged && <Badge variant="destructive">{t.needsRevision}</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {sec.kind === "achievement" && (
                  <>
                    <AchievementTable value={submission.achievement} onChange={() => {}} readOnly />
                    {renderSpot("achievement")}
                  </>
                )}
                {sec.kind === "media" && (
                  <>
                    <ReportMediaPanel reportId={reportId} readOnly zipBaseName={`epic-photos-${reportId}`} />
                    {renderSpot("media")}
                  </>
                )}
                {sec.kind === "activities" && sec.objective && (
                  <ObjectiveActivities
                    objective={sec.objective}
                    catalog={submission.catalog}
                    responses={submission.activityResponses}
                    onChange={() => {}}
                    readOnly
                    flaggedCodes={new Set(submission.catalog.filter((row) => notesFor(activityTarget(row.code)).some((c) => !c.resolved_at)).map((row) => row.code))}
                    renderTaskExtra={(code) => renderSpot(activityTarget(code))}
                  />
                )}
                {groupReviewFields(sec.fields).map((group) => {
                  const groupOpen = group.some((field) => notesFor(field.target).some((c) => !c.resolved_at));
                  return (
                    <div key={group[0].target} className={group.length > 1 ? `space-y-3 rounded-md p-3 ${groupOpen ? "border border-red-500 bg-red-50 dark:bg-red-950/30" : "border border-primary/30"}` : "contents"}>
                      {group.map((field) => {
                        const key = field.target.startsWith("field:") ? field.target.slice(6) : field.target;
                        const paired = key.startsWith("challenge_") ? `response_${key.slice("challenge_".length)}` : "";
                        const targets = paired ? [field.target, fieldTarget(paired)] : [field.target];
                        const open = targets.some((target) => notesFor(target).some((c) => !c.resolved_at));
                        const question = narrativeQuestion(field.target, lang);
                        const answer = (answers[key] || (paired ? answers[paired] : "") || field.text).trim();
                        return (
                          <div key={field.target} className="space-y-2">
                            <p className={`text-xs font-semibold uppercase tracking-wide ${open ? "text-red-700" : "text-primary"}`}>{field.label}</p>
                            <div className={`rounded-md border p-3 text-sm ${open ? "border-red-500 bg-red-50 dark:bg-red-950/30" : "border-primary/30 bg-primary/5"}`}>
                              {question && <p className="font-medium text-foreground">{question}</p>}
                              {canAnswer ? (
                                <Textarea
                                  rows={4}
                                  className="mt-2 bg-background text-foreground"
                                  placeholder={t.answerHere}
                                  value={answers[key] ?? field.text}
                                  onChange={(e) => setAnswers((prev) => ({ ...prev, [key]: e.target.value }))}
                                  onBlur={(e) => saveNarrative(key, e.target.value)}
                                />
                              ) : (
                                <div className={`rounded-md border border-primary/40 border-l-4 border-l-primary bg-card px-3 py-2 ${question ? "mt-3" : ""}`}>
                                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{t.answerLabel}</p>
                                  <p className={`mt-1 whitespace-pre-wrap text-base ${answer ? "font-medium text-foreground" : "text-muted-foreground"}`}>{answer || t.noAnswerYet}</p>
                                </div>
                              )}
                            </div>
                            {renderSpot(field.target, paired ? [fieldTarget(paired)] : [])}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t bg-card/95 px-1 py-3 backdrop-blur sm:flex-row sm:flex-wrap sm:justify-end">
        {mode === "cp" && reportStatus === "returned" && (
          <>
            <Button variant="outline" asChild>
              <Link to="/reports/$reportId/edit" params={{ reportId }}>{t.editReportAgain}</Link>
            </Button>
            <Button onClick={resubmit}>{t.resubmitToDt}</Button>
          </>
        )}
        {mode === "dt" && canValidate && (reportStatus === "submitted" || reportStatus === "in_review") && (
          <>
            <Button variant="destructive" onClick={returnToCp}>{t.returnToCp}</Button>
            <Button onClick={validateReport}>{t.validate}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function groupReviewFields(items: ReviewField[]) {
  const groups: ReviewField[][] = [];
  for (let i = 0; i < items.length; i++) {
    const key = items[i].target.replace(/^field:/, "");
    const match = key.match(/^challenge_(\d+)$/);
    const nextKey = items[i + 1]?.target.replace(/^field:/, "") ?? "";
    if (match && nextKey === `response_${match[1]}`) {
      groups.push([items[i], items[i + 1]]);
      i += 1;
    } else {
      groups.push([items[i]]);
    }
  }
  return groups;
}

function fields(
  narratives: Record<string, string>,
  rows: { key: string; label: string }[],
): ReviewField[] {
  return rows.map((row) => ({ label: row.label, text: narratives[row.key] || "", target: fieldTarget(row.key) }));
}

export function buildReviewSections(
  submission: ReviewSubmission,
  t: {
    tabSummary: string;
    tabAchievement: string;
    tabCoordination: string;
    tabStories: string;
    tabChallenges: string;
    tabPriorities: string;
    tabMedia: string;
    objective: string;
    smni: string;
    nutrition: string;
    malaria: string;
    vaccination: string;
    medicines: string;
    lessonsLearned: string;
    challenge: string;
    response: string;
  },
): ReviewSection[] {
  const n = submission.narratives;
  const group = (
    key: string,
    title: string,
    rows: { key: string; label: string }[],
    kind: ReviewSection["kind"] = "fields",
    objective?: number,
  ): ReviewSection => ({
    key,
    title,
    fields: fields(n, rows),
    commentKeys: [
      key,
      ...(kind === "achievement" ? ["achievement"] : []),
      ...(kind === "media" ? ["media"] : []),
      ...rows.flatMap((row) => [row.key, fieldTarget(row.key)]),
    ],
    kind,
    objective,
  });

  return [
    group("exec_summary", t.tabSummary, [
      { key: "exec_summary_smni", label: t.smni },
      { key: "exec_summary_nutrition", label: t.nutrition },
      { key: "exec_summary_malaria", label: t.malaria },
    ]),
    group("achievement_table", t.tabAchievement, [], "achievement"),
    ...([1, 2, 3] as const).map((objective) => ({
      ...group(`objective_${objective}`, `${t.objective} ${objective}`, [], "activities", objective),
      commentKeys: [
        `objective_${objective}`,
        ...submission.catalog.filter((row) => row.objective === objective).flatMap((row) => [row.code, activityTarget(row.code)]),
      ],
    })),
    group("coordination", t.tabCoordination, [
      { key: "coordination_smne", label: t.smni },
      { key: "coordination_vaccination", label: t.vaccination },
      { key: "coordination_nutrition", label: t.nutrition },
      { key: "coordination_malaria", label: t.malaria },
      { key: "coordination_hmis", label: "HMIS" },
      { key: "coordination_medicines", label: t.medicines },
    ]),
    group("stories", t.tabStories, [
      { key: "success_smne_vaccination", label: `${t.smni} / ${t.vaccination}` },
      { key: "success_nutrition", label: t.nutrition },
      { key: "success_malaria", label: t.malaria },
      { key: "lessons_learned", label: t.lessonsLearned },
    ]),
    (() => {
      const section = group("challenges", t.tabChallenges, [1, 2, 3].map((i) => (
        { key: `challenge_${i}`, label: `${t.challenge} ${i}` }
      )));
      section.commentKeys.push(...[1, 2, 3].flatMap((i) => [`response_${i}`, fieldTarget(`response_${i}`)]));
      return section;
    })(),
    group("priorities", t.tabPriorities, [
      { key: "priorities_objective_1", label: `${t.objective} 1` },
      { key: "priorities_objective_2", label: `${t.objective} 2` },
      { key: "priorities_objective_3", label: `${t.objective} 3` },
    ]),
    group("media", t.tabMedia, [], "media"),
  ];
}
