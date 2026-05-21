import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportReviewPanel, buildReviewSections } from "@/components/report-review-panel";
import { loadExtendedReportData } from "@/lib/report-data";
import { calcAchievementRate } from "@/lib/activity-catalog";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports/$reportId/review")({ component: ReviewPage });

function ReviewPage() {
  const { reportId } = Route.useParams();
  const { role } = useAuth();
  const { t, lang } = useT();
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<{ id: string; province_id: string; month: number; year: number; status: string } | null>(null);
  const [provinceName, setProvinceName] = useState("");
  const [sections, setSections] = useState<ReturnType<typeof buildReviewSections>>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (role && role !== "technical_director") nav({ to: "/reports/$reportId", params: { reportId } });
  }, [role, reportId, nav]);

  const load = async () => {
    const d = await loadExtendedReportData(reportId);
    setReport(d.report);
    if (d.report.status === "submitted") {
      await supabase.from("reports").update({ status: "in_review" } as never).eq("id", reportId);
      setReport({ ...d.report, status: "in_review" });
    }
    const { data: pv } = await supabase.from("provinces").select("name").eq("id", d.report.province_id).maybeSingle();
    setProvinceName(pv?.name || "");
    const rate = calcAchievementRate(d.achievement);
    const preview = `${d.achievement.total_planned} · ${rate}%`;
    setSections(buildReviewSections(d.narratives, preview, lang));
    setLoading(false);
  };

  useEffect(() => { load(); }, [reportId, tick]);

  if (loading || !report) {
    return <div className="max-w-4xl mx-auto"><Skeleton className="h-10 w-64 mb-4" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" asChild>
          <Link to="/desk">{t.desk}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/reports/$reportId" params={{ reportId }}>{t.view}</Link>
        </Button>
        <span className="text-sm text-muted-foreground">{provinceName} · {t.months[report.month - 1]} {report.year}</span>
      </div>
      <Card>
        <CardHeader><CardTitle>{t.reviewReport}</CardTitle></CardHeader>
        <CardContent>
          <ReportReviewPanel
            reportId={reportId}
            provinceId={report.province_id}
            reportStatus={report.status}
            sections={sections}
            mode="dt"
            onStatusChange={() => {
              setTick((x) => x + 1);
              nav({ to: "/desk" });
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
