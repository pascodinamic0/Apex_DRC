import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportReviewPanel, type ReviewSubmission } from "@/components/report-review-panel";
import { loadExtendedReportData } from "@/lib/report-data";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports/$reportId/revisions")({ component: RevisionsPage });

function RevisionsPage() {
  const { reportId } = Route.useParams();
  const { profile, role, can } = useAuth();
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{ id: string; province_id: string; month: number; year: number; status: string } | null>(null);
  const [provinceName, setProvinceName] = useState("");
  const [submission, setSubmission] = useState<ReviewSubmission | null>(null);
  const [tick, setTick] = useState(0);

  const load = async () => {
    const d = await loadExtendedReportData(reportId);
    setReport(d.report);
    const { data: pv } = await supabase.from("provinces").select("name").eq("id", d.report.province_id).maybeSingle();
    setProvinceName(pv?.name || "");
    setSubmission({
      narratives: d.narratives,
      achievement: d.achievement,
      catalog: d.catalog,
      activityResponses: d.activityResponses,
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, [reportId, tick]);

  if (loading || !report || !submission) {
    return <div className="max-w-4xl mx-auto"><Skeleton className="h-10 w-64 mb-4" /><Skeleton className="h-96" /></div>;
  }

  const isMine = role === "province_user" && report.province_id === profile?.province_id;
  const canValidate = can("validate_reports");
  if (!isMine && !canValidate) {
    return <p className="text-muted-foreground">{t.noAccess}</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link to="/reports/$reportId/edit" params={{ reportId }}>{t.backToReport}</Link>
        </Button>
        <span className="text-sm text-muted-foreground">{provinceName} · {t.months[report.month - 1]} {report.year}</span>
      </div>
      <Card>
        <CardHeader><CardTitle>{t.revisionsTitle}</CardTitle></CardHeader>
        <CardContent>
          <ReportReviewPanel
            reportId={reportId}
            provinceId={report.province_id}
            reportStatus={report.status}
            submission={submission}
            mode={canValidate ? "dt" : "cp"}
            onStatusChange={() => setTick((x) => x + 1)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
