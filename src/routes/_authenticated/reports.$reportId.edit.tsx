import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { ReportEditor, loadReportData, type ActivityRow, type Narratives, type ReportData } from "@/components/report-editor";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports/$reportId/edit")({ component: EditPage });

function EditPage() {
  const { reportId } = Route.useParams();
  const { profile, role } = useAuth();
  const nav = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [narratives, setNarratives] = useState<Narratives>({});
  const [provinceName, setProvinceName] = useState("");

  const load = async () => {
    const d = await loadReportData(reportId);
    setReport(d.report); setActivities(d.activities); setNarratives(d.narratives);
    const { data: pv } = await supabase.from("provinces").select("name").eq("id", d.report.province_id).maybeSingle();
    setProvinceName(pv?.name || "");
  };

  useEffect(() => { load(); }, [reportId]);

  if (!report || !role) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

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
      showExport={isMine}
      provinceLabel={provinceName}
      onAfterAction={() => nav({ to: "/reports/$reportId", params: { reportId } })}
    />
  );
}
