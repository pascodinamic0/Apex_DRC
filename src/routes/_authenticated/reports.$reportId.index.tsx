import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { ReportEditor, loadReportData, type ActivityRow, type Narratives, type ReportData } from "@/components/report-editor";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/reports/$reportId/")({ component: ViewPage });

function ViewPage() {
  const { reportId } = Route.useParams();
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const [report, setReport] = useState<ReportData | null>(null);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [narratives, setNarratives] = useState<Narratives>({});
  const [provinceName, setProvinceName] = useState("");
  const [achievement, setAchievement] = useState<import("@/lib/activity-catalog").AchievementSummary | undefined>();
  const [activityResponses, setActivityResponses] = useState<import("@/lib/activity-catalog").ActivityResponseFields[]>([]);
  const [catalog, setCatalog] = useState<import("@/lib/activity-catalog").CatalogRow[]>([]);

  useEffect(() => {
    loadReportData(reportId).then(async (d) => {
      setReport(d.report);
      setActivities(d.activities);
      setNarratives(d.narratives);
      setAchievement(d.achievement);
      setActivityResponses(d.activityResponses);
      setCatalog(d.catalog);
      const { data: pv } = await supabase.from("provinces").select("name").eq("id", d.report.province_id).maybeSingle();
      setProvinceName(pv?.name || "");
    });
  }, [reportId]);

  if (!report) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isDirector = role === "technical_director";
  const isMine = role === "province_user" && report.province_id === profile?.province_id;
  const canExport = isDirector || isMine || role === "read_only";

  return (
    <ReportEditor
      report={report}
      initialActivities={activities}
      initialNarratives={narratives}
      initialAchievement={achievement}
      initialActivityResponses={activityResponses}
      initialCatalog={catalog}
      readOnly={true}
      isProvinceUser={isMine}
      isDirector={isDirector}
      showExport={canExport}
      provinceLabel={provinceName}
      onAfterAction={() => nav({ to: "/reports" })}
    />
  );
}
