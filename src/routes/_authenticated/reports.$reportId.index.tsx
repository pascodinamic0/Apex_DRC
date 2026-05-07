import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ReportEditor, loadReportData, type ActivityRow, type Narratives, type ReportData } from "@/components/report-editor";

export const Route = createFileRoute("/_authenticated/reports/$reportId/")({ component: ViewPage });

function ViewPage() {
  const { reportId } = Route.useParams();
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [narratives, setNarratives] = useState<Narratives>({});

  useEffect(() => {
    loadReportData(reportId).then((d) => {
      setReport(d.report); setActivities(d.activities); setNarratives(d.narratives);
    });
  }, [reportId]);

  if (!report) return <div className="text-muted-foreground">...</div>;

  const isDirector = role === "technical_director";
  const isMine = role === "province_user" && report.province_id === profile?.province_id;

  return (
    <ReportEditor
      report={report}
      initialActivities={activities}
      initialNarratives={narratives}
      readOnly={true}
      isProvinceUser={isMine}
      isDirector={isDirector}
      onAfterAction={() => nav({ to: "/reports" })}
    />
  );
}
