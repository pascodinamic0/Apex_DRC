import { useEffect, useMemo, useState } from "react";
import { Sparkles, Undo2, Check, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { OBJECTIVE_PARENTS } from "@/lib/activity-catalog";
import type { NationalActivityView } from "@/lib/export/epic-official";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

export type ActivitySummaryRow = {
  activity_code: string;
  ai_content: string;
  selected: string;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  authorName: string;
};

const FIELD_KEYS = ["realized", "progress", "challenges", "solutions", "priorities", "partners"] as const;

type Props = {
  views: NationalActivityView[];
  loading: boolean;
  month: number;
  year: number;
  periodLabel: string;
  isDirector: boolean;
  onSummariesChange: (rows: ActivitySummaryRow[]) => void;
};

export function ConsolidationActivities({
  views,
  loading,
  month,
  year,
  periodLabel,
  isDirector,
  onSummariesChange,
}: Props) {
  const { t, lang } = useT();
  const { user, can, profile } = useAuth();
  const canComment = can("comment_consolidation");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, ActivitySummaryRow>>({});
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  useEffect(() => {
    if (!month || !year) return;
    supabase
      .from("consolidation_activity_summaries")
      .select("activity_code, ai_content, selected")
      .eq("month", month)
      .eq("year", year)
      .eq("lang", lang)
      .then(({ data, error }) => {
        if (error) {
          console.warn("[consolidation] activity summaries", error.message);
          return;
        }
        const map: Record<string, ActivitySummaryRow> = {};
        for (const row of (data || []) as ActivitySummaryRow[]) map[row.activity_code] = row;
        setSummaries(map);
        onSummariesChange(Object.values(map));
      });
  }, [month, year, lang, onSummariesChange]);

  const openView = views.find((v) => v.code === openCode) || null;
  const openSummary = openCode ? summaries[openCode] : undefined;

  useEffect(() => {
    if (!openCode) {
      setComments([]);
      setDraft("");
      return;
    }
    setCommentsLoading(true);
    supabase
      .from("consolidation_activity_comments")
      .select("id, body, created_at, author_id")
      .eq("month", month)
      .eq("year", year)
      .eq("activity_code", openCode)
      .order("created_at")
      .then(async ({ data, error }) => {
        if (error) {
          toast.error(error.message);
          setCommentsLoading(false);
          return;
        }
        const rows = (data || []) as Omit<CommentRow, "authorName">[];
        const ids = [...new Set(rows.map((r) => r.author_id))];
        const { data: profs } = ids.length
          ? await supabase.from("profiles").select("id, full_name").in("id", ids)
          : { data: [] };
        const names = new Map((profs || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name || ""]));
        setComments(rows.map((r) => ({ ...r, authorName: names.get(r.author_id) || t.director })));
        setCommentsLoading(false);
      });
  }, [openCode, month, year, t.director]);

  const grouped = useMemo(() => {
    const byParent = new Map<string, NationalActivityView[]>();
    for (const view of views) {
      const key = view.parentCode || view.objective?.toString() || "other";
      const list = byParent.get(key) || [];
      list.push(view);
      byParent.set(key, list);
    }
    return byParent;
  }, [views]);

  const fieldLabel = (k: (typeof FIELD_KEYS)[number]) => {
    const map: Record<string, string> = {
      realized: t.actRealized,
      progress: t.actProgress,
      challenges: t.actChallenges,
      solutions: t.actSolutions,
      priorities: t.actPriorities,
      partners: t.actPartners,
    };
    return map[k];
  };

  const parentTitle = (code: string) => {
    for (const items of Object.values(OBJECTIVE_PARENTS)) {
      const hit = items.find((p) => p.code === code);
      if (hit) return lang === "en" ? hit.titleEn : hit.titleFr;
    }
    return `${t.objective} ${code}`;
  };

  const pushSummaries = (next: Record<string, ActivitySummaryRow>) => {
    setSummaries(next);
    onSummariesChange(Object.values(next));
  };

  const generate = async () => {
    if (!isDirector || !openView || !user) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      toast.error(t.error);
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/consolidation/activity-summary", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          year,
          lang,
          activityCode: openView.code,
          title: openView.title,
          period: periodLabel,
          contributions: openView.contributions,
        }),
      });
      const data = (await res.json()) as { summary?: string; error?: string; selected?: string };
      if (!res.ok) {
        toast.error(data.error || t.error);
        return;
      }
      pushSummaries({
        ...summaries,
        [openView.code]: {
          activity_code: openView.code,
          ai_content: data.summary || "",
          selected: data.selected || "original",
        },
      });
      toast.success(t.aiActivityGenerated);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setGenerating(false);
    }
  };

  const setSelected = async (selected: "original" | "ai") => {
    if (!isDirector || !openView || !user) return;
    const current = summaries[openView.code];
    if (!current?.ai_content.trim() && selected === "ai") return;
    setSelecting(true);
    const { error } = await supabase.from("consolidation_activity_summaries").upsert(
      {
        month,
        year,
        lang,
        activity_code: openView.code,
        ai_content: current?.ai_content || "",
        selected,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "month,year,lang,activity_code" },
    );
    setSelecting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    pushSummaries({
      ...summaries,
      [openView.code]: {
        activity_code: openView.code,
        ai_content: current?.ai_content || "",
        selected,
      },
    });
    toast.success(selected === "ai" ? t.aiActivityAccepted : t.aiActivityReverted);
  };

  const sendComment = async () => {
    const body = draft.trim();
    if (!body || !openCode || !user || !canComment) return;
    const { error } = await supabase.from("consolidation_activity_comments").insert({
      month,
      year,
      activity_code: openCode,
      author_id: user.id,
      body,
    } as never);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
    toast.success(t.commentSent);
    setComments((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        body,
        created_at: new Date().toISOString(),
        author_id: user.id,
        authorName: profile?.full_name || user.email || t.director,
      },
    ]);
  };

  if (loading) return <Skeleton className="h-48 w-full" />;
  if (!views.length) return <p className="text-sm text-muted-foreground p-6 text-center">{t.noData}</p>;

  return (
    <>
      <div className="space-y-6">
        {[...grouped.entries()].map(([parent, items]) => (
          <div key={parent} className="space-y-2">
            <p className="text-sm font-semibold text-primary bg-primary/5 rounded-md px-3 py-2 border-l-2 border-primary">
              {parentTitle(parent)}
            </p>
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 w-28">{t.activityCode}</th>
                    <th className="text-left p-3">{t.activities}</th>
                    <th className="text-left p-3 w-40">{t.provinces}</th>
                    <th className="p-3 w-28" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const summary = summaries[item.code];
                    const usingAi = summary?.selected === "ai" && Boolean(summary.ai_content.trim());
                    return (
                      <tr key={item.code} className="border-t align-top">
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono text-xs">{item.code}</Badge>
                        </td>
                        <td className="p-3">
                          <p className="font-medium leading-snug">{item.title}</p>
                          {usingAi ? (
                            <p className="mt-2 text-xs text-primary">{t.aiActivityInUse}</p>
                          ) : (
                            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                              {item.contributions
                                .map((c) => `${c.provinceName}: ${(c.realized || c.progress || "").trim().slice(0, 160)}${(c.realized || c.progress || "").trim().length > 160 ? "…" : ""}`)
                                .join("\n")}
                            </p>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {item.contributions.map((c) => c.provinceName).join(", ")}
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => setOpenCode(item.code)}>
                            {t.openActivity}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <Sheet open={Boolean(openView)} onOpenChange={(open) => { if (!open) setOpenCode(null); }}>
        <SheetContent side="right" className="w-full sm:!max-w-xl overflow-y-auto">
          {openView && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-start gap-2 text-left">
                  <Badge variant="outline" className="font-mono shrink-0 mt-0.5">{openView.code}</Badge>
                  <span>{openView.title}</span>
                </SheetTitle>
                <SheetDescription>
                  {openView.contributions.length} {t.provinces.toLowerCase()} · {periodLabel} {year}
                </SheetDescription>
              </SheetHeader>

              {isDirector && (
                <div className="mt-4 rounded-xl border bg-muted/30 p-3 space-y-3">
                  <Button
                    onClick={generate}
                    disabled={generating || openView.contributions.length === 0}
                    className="w-full"
                  >
                    <Sparkles className="h-4 w-4 mr-1" />
                    {generating ? t.aiSummaryGenerating : openSummary?.ai_content ? t.regenerateAiSummary : t.summarizeActivityAi}
                  </Button>
                  {openSummary?.ai_content ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border bg-background p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                            {t.originalVersion}
                          </p>
                          <p className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {openView.merged.realized || openView.merged.progress || "—"}
                          </p>
                        </div>
                        <div className="rounded-lg border border-primary/30 bg-background p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">
                            {t.aiVersion}
                          </p>
                          <p className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">{openSummary.ai_content}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => setSelected("ai")} disabled={selecting || openSummary.selected === "ai"}>
                          <Check className="h-4 w-4 mr-1" />
                          {t.acceptAiSummary}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setSelected("original")} disabled={selecting || openSummary.selected === "original"}>
                          <Undo2 className="h-4 w-4 mr-1" />
                          {t.revertOriginal}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {openSummary.selected === "ai" ? t.aiActivityInUse : t.originalInUse}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t.aiActivityHint}</p>
                  )}
                </div>
              )}

              {!isDirector && openSummary?.selected === "ai" && openSummary.ai_content && (
                <div className="mt-4 rounded-xl border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">{t.aiVersion}</p>
                  <p className="text-sm whitespace-pre-wrap">{openSummary.ai_content}</p>
                </div>
              )}

              <div className="mt-6 space-y-4">
                {openView.contributions.map((c) => (
                  <div key={c.reportId} className="rounded-xl border p-3 space-y-3">
                    <p className="text-sm font-semibold">{c.provinceName}</p>
                    {FIELD_KEYS.map((fk) =>
                      c[fk] ? (
                        <div key={fk}>
                          <Label className="text-xs text-muted-foreground uppercase tracking-wide">{fieldLabel(fk)}</Label>
                          <p className="mt-1 text-sm whitespace-pre-wrap leading-relaxed">{c[fk]}</p>
                        </div>
                      ) : null,
                    )}
                  </div>
                ))}
              </div>

              {canComment && (
                <div className="mt-6 space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t.activityComments}
                  </p>
                  {commentsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.noActivityComments}</p>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c) => (
                        <div key={c.id} className="rounded-lg border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground">
                            {c.authorName} · {new Date(c.created_at).toLocaleString()}
                          </p>
                          <p className="mt-1 text-sm whitespace-pre-wrap">{c.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <Textarea
                    rows={3}
                    value={draft}
                    placeholder={t.addActivityComment}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button size="sm" onClick={sendComment} disabled={!draft.trim()}>
                    {t.sendComment}
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
