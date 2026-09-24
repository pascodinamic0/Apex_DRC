import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PeriodFilters, periodFilterLabels } from "@/components/national-analytics";
import { toast } from "sonner";
import { MessageSquare, SendHorizonal } from "lucide-react";
import { loadExtendedReportData } from "@/lib/report-data";
import { getProvinceUserIds, notifyUsers } from "@/lib/notifications";
import { reportingYears, SOURCE_MONTH, SOURCE_YEAR } from "@/lib/export/epic-official";
import {
  createDefaultPeriodSelection,
  filterReportsInPeriod,
  formatPeriodLabel,
  periodBounds,
  type PeriodSelection,
} from "@/lib/analytics";
import { ReportReviewPanel, type ReviewSubmission } from "@/components/report-review-panel";

interface ProvinceRow { id: string; name: string }
interface ReportRow {
  id: string;
  province_id: string;
  month: number;
  year: number;
  status: string;
  submitted_at: string | null;
}

type QueueItem = {
  key: string;
  province: ProvinceRow;
  report?: ReportRow;
  status: string;
  openComments: number;
  when: string;
};

export function AtValidationDashboard() {
  const { t } = useT();
  const { can } = useAuth();
  const [period, setPeriod] = useState<PeriodSelection>(() =>
    createDefaultPeriodSelection(SOURCE_MONTH, SOURCE_YEAR),
  );
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
  const [selectedProvinceName, setSelectedProvinceName] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const reviewRef = useRef<HTMLDivElement>(null);

  const years = reportingYears();
  const periodLabel = formatPeriodLabel(period, t.months, t.trimesters);

  const loadQueue = async () => {
    setLoading(true);
    const [{ data: pv }, { data: rp }] = await Promise.all([
      supabase.from("provinces").select("id,name").order("name"),
      supabase.from("reports").select("id,province_id,month,year,status,submitted_at"),
    ]);
    const allReports = (rp as ReportRow[]) || [];
    setProvinces((pv as ProvinceRow[]) || []);
    setReports(allReports);
    const ids = allReports.map((r) => r.id);
    const { data: comments } = ids.length
      ? await supabase.from("report_comments").select("report_id").in("report_id", ids).is("resolved_at", null)
      : { data: [] as { report_id: string }[] };
    const cmMap: Record<string, number> = {};
    for (const c of comments || []) cmMap[c.report_id] = (cmMap[c.report_id] || 0) + 1;
    setCommentCounts(cmMap);
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setSelectedReportId(null);
    setSelectedReport(null);
    setSubmission(null);
  }, [period.grain, period.month, period.year, period.trimester, period.fromMonth, period.fromYear, period.toMonth, period.toYear]);

  const loadReview = async (reportId: string, provinceName: string) => {
    setReviewLoading(true);
    setSelectedReportId(reportId);
    setSelectedProvinceName(provinceName);
    const r = reports.find((x) => x.id === reportId);
    setSelectedReport(r || null);
    if (r?.status === "submitted" && can("validate_reports")) {
      await supabase.from("reports").update({ status: "in_review" } as never).eq("id", reportId);
      setSelectedReport({ ...r, status: "in_review" });
    }
    const d = await loadExtendedReportData(reportId);
    setSubmission({
      narratives: d.narratives,
      achievement: d.achievement,
      catalog: d.catalog,
      activityResponses: d.activityResponses,
    });
    setReviewLoading(false);
    requestAnimationFrame(() => reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const remind = async (provinceId: string, reportId?: string) => {
    const users = await getProvinceUserIds(provinceId, reportId);
    if (!users.length) return toast.error(t.noData);
    if (reportId) {
      await supabase.from("reports").update({ last_reminder_at: new Date().toISOString() } as never).eq("id", reportId);
    }
    const { error } = await notifyUsers(users, {
      type: "reminder_sent",
      report_id: reportId ?? null,
      title: t.reminderSent,
      body: periodLabel,
    });
    if (error) return toast.error(error);
    toast.success(t.reminderSent);
  };

  const inPeriod = filterReportsInPeriod(reports, periodBounds(period));
  const provinceById = new Map(provinces.map((p) => [p.id, p]));
  const reportItems: QueueItem[] = inPeriod.flatMap((report) => {
    const province = provinceById.get(report.province_id);
    if (!province) return [];
    return [{
      key: report.id,
      province,
      report,
      status: report.status,
      openComments: commentCounts[report.id] || 0,
      when: `${t.months[report.month - 1]} ${report.year}`,
    }];
  });
  const missing: QueueItem[] = period.grain === "month"
    ? provinces
        .filter((p) => !inPeriod.some((r) => r.province_id === p.id))
        .map((province) => ({
          key: `missing-${province.id}`,
          province,
          status: "missing",
          openComments: 0,
          when: periodLabel,
        }))
    : [];

  const toReview = reportItems.filter((i) => ["submitted", "in_review", "returned"].includes(i.status));
  const validated = reportItems.filter((i) => i.status === "validated");
  const drafts = [
    ...reportItems.filter((i) => i.status === "draft"),
    ...missing,
  ];
  const reviewing = Boolean(selectedReportId && selectedReport);

  const statusLabel = (s: string) => {
    const lbl: Record<string, string> = {
      draft: t.draft,
      submitted: t.submitted,
      in_review: t.inReview,
      returned: t.returned,
      validated: t.validated,
      missing: t.missing,
    };
    return lbl[s] || s;
  };

  const ReportLine = ({ item }: { item: QueueItem }) => {
    const selected = item.report && selectedReportId === item.report.id;
    const canReview = item.report && ["submitted", "in_review", "returned", "validated"].includes(item.status);
    return (
      <div className={`flex flex-col gap-3 border-b px-4 py-3 last:border-0 sm:flex-row sm:items-center ${selected ? "bg-muted/60" : ""}`}>
        <div className="min-w-0 flex-1">
          <div className="font-medium">{item.province.name}</div>
          <div className="text-sm text-muted-foreground">{item.when}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {item.openComments > 0 && (
            <span className="inline-flex items-center gap-1 text-sm text-destructive">
              <MessageSquare className="h-3.5 w-3.5" />
              {item.openComments}
            </span>
          )}
          <Badge variant="outline">{statusLabel(item.status)}</Badge>
          {canReview && item.report && (
            <Button
              size="sm"
              variant={item.status === "validated" ? "outline" : "default"}
              onClick={() => loadReview(item.report!.id, item.province.name)}
            >
              {item.status === "validated" ? t.consult : t.atOpenReview}
            </Button>
          )}
          {!canReview && (
            <Button size="sm" variant="outline" onClick={() => remind(item.province.id, item.report?.id)}>
              <SendHorizonal className="h-3.5 w-3.5 mr-1" />
              {t.remindProvince}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const List = ({ items, empty }: { items: QueueItem[]; empty: string }) => (
    items.length === 0 ? (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">{empty}</p>
    ) : (
      <div>{items.map((item) => <ReportLine key={item.key} item={item} />)}</div>
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.atDashboardTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{periodLabel}</p>
        </div>
        <PeriodFilters
          period={period}
          years={years}
          months={t.months}
          trimesters={t.trimesters}
          semesters={t.semesters}
          labels={periodFilterLabels(t)}
          onPeriodChange={setPeriod}
        />
      </div>

      {loading ? (
        <Skeleton className="h-80 w-full rounded-2xl" />
      ) : (
        <>
          <Card className={reviewing ? "hidden lg:block" : ""}>
            <Tabs defaultValue="review">
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">{t.atQueueReview}</CardTitle>
                <TabsList className="h-auto w-full flex-wrap justify-start sm:w-auto">
                  <TabsTrigger value="waiting">{t.atQueueDrafts} ({drafts.length})</TabsTrigger>
                  <TabsTrigger value="review">{t.atQueueReview} ({toReview.length})</TabsTrigger>
                  <TabsTrigger value="done">{t.atVerifiedSection} ({validated.length})</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="p-0">
                <TabsContent value="review" className="mt-0">
                  <List items={toReview} empty={t.atNoIncoming} />
                </TabsContent>
                <TabsContent value="done" className="mt-0">
                  <List items={validated} empty={t.noData} />
                </TabsContent>
                <TabsContent value="waiting" className="mt-0">
                  <p className="border-b px-4 py-3 text-sm text-muted-foreground">{t.atRemindMeans}</p>
                  <List items={drafts} empty={t.noData} />
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {reviewing && selectedReport && (
            <Card ref={reviewRef}>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">
                  {selectedProvinceName} · {t.months[selectedReport.month - 1]} {selectedReport.year}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => { setSelectedReportId(null); setSelectedReport(null); setSubmission(null); }}>
                  {t.atBackToQueue}
                </Button>
              </CardHeader>
              <CardContent>
                {reviewLoading || !submission ? (
                  <Skeleton className="h-64 w-full" />
                ) : (
                  <ReportReviewPanel
                    reportId={selectedReportId!}
                    provinceId={selectedReport.province_id}
                    reportStatus={selectedReport.status}
                    submission={submission}
                    mode="dt"
                    onStatusChange={() => {
                      loadQueue();
                      if (selectedReportId) loadReview(selectedReportId, selectedProvinceName);
                    }}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
