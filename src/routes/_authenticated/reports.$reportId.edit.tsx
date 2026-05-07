import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ReportEditor, loadReportData, type ActivityRow, type Narratives, type ReportData } from "@/components/report-editor";

export const Route = createFileRoute("/_authenticated/reports/$reportId/edit")({ component: EditPage });

function EditPage() {
  const { reportId } = Route.useParams();
  const { profile, role } = useAuth();
  const nav = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [narratives, setNarratives] = useState<Narratives>({});

  const load = async () => {
    const d = await loadReportData(reportId);
    setReport(d.report); setActivities(d.activities); setNarratives(d.narratives);
  };

  useEffect(() => { load(); }, [reportId]);

  if (!report || !role) return <div className="text-muted-foreground">...</div>;

  const isMine = role === "province_user" && report.province_id === profile?.province_id;
  const editable = isMine && report.status !== "validated";

  if (!editable) {
    nav({ to: "/reports/$reportId", params: { reportId } });
    return null;
  }

  return (
    <ReportEditor
      report={report}
      initialActivities={activities}
      initialNarratives={narratives}
      readOnly={false}
      isProvinceUser={isMine}
      isDirector={false}
      onAfterAction={() => nav({ to: "/reports/$reportId", params: { reportId } })}
    />
  );
}
