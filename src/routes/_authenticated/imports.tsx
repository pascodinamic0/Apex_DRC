import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { EXTENDED_NARRATIVE_KEYS, type AchievementSummary } from "@/lib/activity-catalog";
import type { ExtractedMonthlyReport } from "@/lib/imports/types";
import { FileStack, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/imports")({ component: ImportsPage });

type Province = { id: string; name: string; code: string | null };

type ImportFileRow = {
  id: string;
  file_name: string;
  status: string;
  error_message: string | null;
  detected_province_id: string | null;
  detected_month: number | null;
  detected_year: number | null;
  extracted: ExtractedMonthlyReport | null;
  reportStatus: string | null;
  reportId: string | null;
  existing: {
    achievement: AchievementSummary;
    narratives: Record<string, string>;
    activityResponses: Record<string, import("@/lib/activity-catalog").ActivityResponseFields>;
  } | null;
};

async function authedFetch(input: string, init: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Authorization", `Bearer ${session?.access_token ?? ""}`);
  return fetch(input, { ...init, headers });
}

const ACH_KEYS: (keyof AchievementSummary)[] = [
  "total_planned",
  "finalized_approved",
  "finalized_no_report",
  "in_progress",
  "trigger_approved",
  "not_realized",
];

function ImportsPage() {
  const { t, lang } = useT();
  const { canBulkImport } = useAuth();
  const nav = useNavigate();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [files, setFiles] = useState<ImportFileRow[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiOk, setAiOk] = useState(true);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [identity, setIdentity] = useState<{ provinceId: string; month: number; year: number } | null>(null);
  const [achSel, setAchSel] = useState<Record<string, boolean>>({});
  const [narrSel, setNarrSel] = useState<Record<string, boolean>>({});
  const [actSel, setActSel] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    if (!canBulkImport) nav({ to: "/dashboard" });
  }, [canBulkImport, nav]);

  const refreshBatch = useCallback(async (id: string) => {
    const res = await authedFetch(`/api/imports/${id}`);
    if (!res.ok) throw new Error(await res.text());
    const json = (await res.json()) as { files: ImportFileRow[]; provinces: Province[] };
    setFiles(json.files || []);
    setProvinces(json.provinces || []);
  }, []);

  const startBatch = async () => {
    setBusy(true);
    try {
      const res = await authedFetch("/api/imports", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { batch: { id: string } };
      setBatchId(json.batch.id);
      await refreshBatch(json.batch.id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    authedFetch("/api/imports")
      .then(async (res) => {
        if (!res.ok) return;
        const json = (await res.json()) as { aiConfigured?: boolean; batches?: { id: string }[] };
        setAiOk(json.aiConfigured !== false);
        if (json.batches?.[0]?.id) {
          setBatchId(json.batches[0].id);
          await refreshBatch(json.batches[0].id);
        }
      })
      .catch(() => {});
  }, [refreshBatch]);

  const onUpload = async (list: FileList | null) => {
    if (!list?.length || !batchId) return;
    setBusy(true);
    try {
      const form = new FormData();
      for (const f of list) form.append("files", f);
      const res = await authedFetch(`/api/imports/${batchId}`, { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());
      await refreshBatch(batchId);
      toast.success(t.bulkImportUpload);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  const onExtract = async () => {
    if (!batchId) return;
    setBusy(true);
    try {
      const res = await authedFetch(`/api/imports/${batchId}?action=extract&lang=${lang}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      await refreshBatch(batchId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.error);
    } finally {
      setBusy(false);
    }
  };

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) || files.find((f) => f.status === "ready") || null,
    [files, activeFileId],
  );

  useEffect(() => {
    if (!activeFile?.extracted) return;
    const ex = activeFile.extracted;
    setIdentity({
      provinceId: activeFile.detected_province_id || provinces[0]?.id || "",
      month: activeFile.detected_month || 1,
      year: activeFile.detected_year || new Date().getFullYear(),
    });

    const existing = activeFile.existing;
    const nextAch: Record<string, boolean> = {};
    for (const k of ACH_KEYS) {
      const extVal = ex.achievement[k];
      const curVal = existing?.achievement[k] ?? 0;
      if (extVal === 0 && extVal === curVal) continue;
      nextAch[k] = !existing || curVal === 0;
    }
    setAchSel(nextAch);

    const nextNarr: Record<string, boolean> = {};
    for (const k of EXTENDED_NARRATIVE_KEYS) {
      const extVal = (ex.narratives[k] || "").trim();
      if (!extVal) continue;
      const curVal = (existing?.narratives[k] || "").trim();
      nextNarr[k] = !curVal;
    }
    setNarrSel(nextNarr);

    const nextAct: Record<string, Record<string, boolean>> = {};
    for (const a of ex.activities) {
      const fields: Record<string, boolean> = {};
      for (const f of ["realized", "progress", "challenges", "solutions", "priorities", "partners"] as const) {
        const extVal = (a[f] || "").trim();
        if (!extVal) continue;
        fields[f] = true;
      }
      if (Object.keys(fields).length) nextAct[a.catalog_code] = fields;
    }
    setActSel(nextAct);
    setActiveFileId(activeFile.id);
  }, [activeFile?.id, activeFile?.extracted, provinces]);

  const applySelection = async () => {
    if (!batchId || !activeFile || !identity?.provinceId) {
      toast.error(t.selectProvince);
      return;
    }
    setBusy(true);
    try {
      const res = await authedFetch(`/api/imports/${batchId}`, {
        method: "PATCH",
        body: JSON.stringify({
          fileId: activeFile.id,
          identity,
          achievement: achSel,
          narratives: narrSel,
          activities: actSel,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { reportId: string; inWorkflow?: boolean };
      toast.success(t.bulkImportApplied);
      if (json.inWorkflow) toast.message(t.bulkImportInWorkflow);
      setConfirmOpen(false);
      await refreshBatch(batchId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.bulkImportFailed);
    } finally {
      setBusy(false);
    }
  };

  if (!canBulkImport) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
        <h1 className="text-3xl font-extrabold tracking-tight">{t.bulkImportTitle}</h1>
        <p className="text-muted-foreground">{t.bulkImportSubtitle}</p>
        {!aiOk && <p className="mt-2 text-sm text-destructive">{t.aiNotConfigured}</p>}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileStack className="h-5 w-5" />
            {t.bulkImportNav}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={startBatch} disabled={busy}>
              {t.bulkImportNewBatch}
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="sr-only"
                disabled={!batchId || busy}
                onChange={(e) => onUpload(e.target.files)}
              />
              <Button asChild variant="secondary" size="sm" disabled={!batchId || busy}>
                <span>
                  <Upload className="mr-1 h-4 w-4" />
                  {t.bulkImportUpload}
                </span>
              </Button>
            </label>
            <Button size="sm" onClick={onExtract} disabled={!batchId || busy || !aiOk}>
              {busy ? t.bulkImportExtracting : t.bulkImportExtract}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!batchId ? (
            <p className="text-sm text-muted-foreground">{t.bulkImportNoFiles}</p>
          ) : (
            <ul className="divide-y rounded-md border text-sm">
              {files.length === 0 ? (
                <li className="p-4 text-muted-foreground">{t.bulkImportNoFiles}</li>
              ) : (
                files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <button
                      type="button"
                      className="text-left font-medium hover:underline"
                      onClick={() => setActiveFileId(f.id)}
                    >
                      {f.file_name}
                    </button>
                    <span className="text-muted-foreground">{f.status}</span>
                    {f.status === "applied" && f.reportId && (
                      <Link to="/reports/$reportId/edit" params={{ reportId: f.reportId }} className="text-primary text-xs">
                        {t.editReportAgain}
                      </Link>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      {activeFile?.status === "ready" && activeFile.extracted && identity && (
        <Card>
          <CardHeader>
            <CardTitle>{t.bulkImportConfirmTitle}</CardTitle>
            {activeFile.reportStatus && activeFile.reportStatus !== "draft" && activeFile.reportStatus !== "returned" && (
              <p className="text-sm text-amber-700 dark:text-amber-200">{t.bulkImportInWorkflow}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t.province}</Label>
                <Select
                  value={identity.provinceId}
                  onValueChange={(v) => setIdentity({ ...identity, provinceId: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t.bulkImportIdentity}</Label>
                <div className="flex gap-2">
                  <Select
                    value={String(identity.month)}
                    onValueChange={(v) => setIdentity({ ...identity, month: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(identity.year)}
                    onValueChange={(v) => setIdentity({ ...identity, year: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[identity.year - 1, identity.year, identity.year + 1].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Tabs defaultValue="achievement">
              <TabsList>
                <TabsTrigger value="achievement">Achievement</TabsTrigger>
                <TabsTrigger value="activities">Activities</TabsTrigger>
                <TabsTrigger value="narratives">Narratives</TabsTrigger>
              </TabsList>
              <TabsContent value="achievement" className="space-y-2 pt-2">
                {ACH_KEYS.map((k) => {
                  const ext = activeFile.extracted!.achievement[k];
                  const cur = activeFile.existing?.achievement[k] ?? 0;
                  if (ext === 0 && !cur) return null;
                  return (
                    <label key={k} className="flex items-start gap-2 rounded border p-2 text-sm">
                      <Checkbox checked={Boolean(achSel[k])} onCheckedChange={(c) => setAchSel({ ...achSel, [k]: c === true })} />
                      <span>
                        <strong>{k}</strong>
                        <br />
                        {t.bulkImportFieldCurrent}: {cur} — {t.bulkImportFieldExtracted}: {ext}
                      </span>
                    </label>
                  );
                })}
              </TabsContent>
              <TabsContent value="activities" className="max-h-96 space-y-2 overflow-y-auto pt-2">
                {activeFile.extracted!.activities.map((a) => (
                  <div key={a.catalog_code} className="rounded border p-2 text-xs">
                    <p className="font-semibold">{a.catalog_code}</p>
                    {(["realized", "progress", "challenges", "solutions", "priorities", "partners"] as const).map((f) => {
                      const val = (a[f] || "").trim();
                      if (!val) return null;
                      return (
                        <label key={f} className="mt-1 flex gap-2">
                          <Checkbox
                            checked={Boolean(actSel[a.catalog_code]?.[f])}
                            onCheckedChange={(c) =>
                              setActSel({
                                ...actSel,
                                [a.catalog_code]: { ...actSel[a.catalog_code], [f]: c === true },
                              })
                            }
                          />
                          <span>
                            {f}: {val.slice(0, 200)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="narratives" className="max-h-96 space-y-2 overflow-y-auto pt-2">
                {EXTENDED_NARRATIVE_KEYS.map((k) => {
                  const ext = (activeFile.extracted!.narratives[k] || "").trim();
                  if (!ext) return null;
                  const cur = (activeFile.existing?.narratives[k] || "").trim();
                  return (
                    <label key={k} className="flex items-start gap-2 rounded border p-2 text-sm">
                      <Checkbox checked={Boolean(narrSel[k])} onCheckedChange={(c) => setNarrSel({ ...narrSel, [k]: c === true })} />
                      <span>
                        <strong>{k}</strong>
                        {cur && (
                          <>
                            <br />
                            {t.bulkImportFieldCurrent}: {cur.slice(0, 120)}…
                          </>
                        )}
                        <br />
                        {t.bulkImportFieldExtracted}: {ext.slice(0, 200)}…
                      </span>
                    </label>
                  );
                })}
              </TabsContent>
            </Tabs>

            <Button onClick={() => setConfirmOpen(true)} disabled={busy || !identity.provinceId}>
              {t.bulkImportAccept}
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.bulkImportConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.bulkImportConfirmBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={applySelection} disabled={busy}>
              {busy ? t.bulkImportAccepting : t.bulkImportAccept}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
