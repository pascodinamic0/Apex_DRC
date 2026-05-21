import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";

export interface ReviewSection {
  key: string;
  title: string;
  preview: string;
}

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
  sections: ReviewSection[];
  mode: "dt" | "cp";
  onStatusChange?: () => void;
}

export function ReportReviewPanel({ reportId, provinceId, reportStatus, sections, mode, onStatusChange }: Props) {
  const { t } = useT();
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [approvals, setApprovals] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: cm }, { data: ap }] = await Promise.all([
      supabase.from("report_comments").select("id, section_key, author_id, body, created_at, resolved_at").eq("report_id", reportId).order("created_at"),
      supabase.from("section_approvals").select("section_key").eq("report_id", reportId),
    ]);
    const rows = (cm || []) as CommentRow[];
    const authorIds = [...new Set(rows.map((c) => c.author_id))];
    const { data: profs } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] };
    const nameMap = new Map((profs || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]));
    setComments(rows.map((c) => ({ ...c, profiles: { full_name: nameMap.get(c.author_id) ?? null } })));
    setApprovals(new Set((ap || []).map((a: { section_key: string }) => a.section_key)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [reportId]);

  const openCount = comments.filter((c) => !c.resolved_at).length;

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

  const approveSection = async (sectionKey: string) => {
    if (!user) return;
    const { error } = await supabase.from("section_approvals").upsert({
      report_id: reportId,
      section_key: sectionKey,
      approved_by: user.id,
    } as never, { onConflict: "report_id,section_key" });
    if (error) return toast.error(error.message);
    toast.success(t.sectionApproved);
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
    const open = comments.filter((c) => c.section_key === sectionKey && !c.resolved_at);
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
        <Badge variant="outline">{approvals.size} {t.sectionsApproved}</Badge>
      </div>

      <Accordion type="multiple" className="w-full">
        {sections.map((sec) => {
          const secComments = comments.filter((c) => c.section_key === sec.key);
          const approved = approvals.has(sec.key);
          return (
            <AccordionItem key={sec.key} value={sec.key} className="border rounded-lg px-3 mb-2">
              <AccordionTrigger>
                <div className="flex items-center gap-2 flex-1 text-left">
                  <span className="text-sm font-medium">{sec.title}</span>
                  {approved && <Badge className="bg-emerald-500/10 text-emerald-700">{t.approved}</Badge>}
                  {secComments.some((c) => !c.resolved_at) && (
                    <Badge variant="destructive">{t.needsRevision}</Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {sec.preview && (
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3 border-l-2">{sec.preview}</p>
                )}
                {secComments.map((c) => (
                  <div key={c.id} className={`text-sm rounded-md p-3 border-l-2 ${c.resolved_at ? "opacity-60 border-muted" : "border-primary"}`}>
                    <div className="text-xs text-muted-foreground mb-1">
                      {(c.profiles as { full_name?: string })?.full_name || "—"} · {new Date(c.created_at).toLocaleString()}
                    </div>
                    {c.body}
                  </div>
                ))}
                {mode === "dt" && reportStatus !== "validated" && (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      placeholder={t.addCommentPlaceholder}
                      value={drafts[sec.key] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [sec.key]: e.target.value }))}
                    />
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => addComment(sec.key)}>{t.sendComment}</Button>
                      {!approved && (
                        <Button size="sm" onClick={() => approveSection(sec.key)}>{t.approveSection}</Button>
                      )}
                    </div>
                  </div>
                )}
                {mode === "cp" && secComments.some((c) => !c.resolved_at) && (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      placeholder={t.correctionPlaceholder}
                      value={drafts[`reply-${sec.key}`] || ""}
                      onChange={(e) => setDrafts((d) => ({ ...d, [`reply-${sec.key}`]: e.target.value }))}
                    />
                    <Button size="sm" onClick={() => resolveWithReply(sec.key)}>{t.sendCorrection}</Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <div className="flex gap-2 flex-wrap justify-end pt-2">
        {mode === "cp" && reportStatus === "returned" && (
          <>
            <Button variant="outline" asChild>
              <Link to="/reports/$reportId/edit" params={{ reportId }}>{t.editReportAgain}</Link>
            </Button>
            <Button onClick={resubmit}>{t.resubmitToDt}</Button>
          </>
        )}
        {mode === "dt" && (reportStatus === "submitted" || reportStatus === "in_review") && (
          <>
            <Button variant="destructive" onClick={returnToCp}>{t.returnToCp}</Button>
            <Button onClick={validateReport}>{t.validate}</Button>
          </>
        )}
      </div>
    </div>
  );
}

export function buildReviewSections(
  narratives: Record<string, string>,
  achievementPreview: string,
  lang: "fr" | "en",
): ReviewSection[] {
  const g = (k: string, fr: string, en: string) => ({
    key: k,
    title: lang === "en" ? en : fr,
    preview: (narratives[k] || "").slice(0, 280),
  });
  const execPreview = [
    narratives.exec_summary_smni,
    narratives.exec_summary_nutrition,
    narratives.exec_summary_malaria,
  ].filter(Boolean).join(" ").slice(0, 280);
  return [
    { key: "exec_summary", title: lang === "en" ? "Executive summary" : "Résumé exécutif", preview: execPreview },
    { key: "achievement_table", title: lang === "en" ? "Achievement table" : "Taux de réalisation", preview: achievementPreview },
    g("priorities_objective_1", "Priorités objectif 1", "Objective 1 priorities"),
    g("coordination_smne", "Coordination SMNI", "MNCH coordination"),
    g("success_smne_vaccination", "Histoires SMNI / vaccination", "MNCH / immunization stories"),
  ];
}
