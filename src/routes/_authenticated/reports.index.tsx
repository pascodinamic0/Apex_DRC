import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/reports/")({ component: ReportsList });

interface ReportRow { id: string; province_id: string; month: number; year: number; status: string }
interface ProvinceRow { id: string; name: string }

function ReportsList() {
  const { t } = useT();
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: rp }, { data: pv }] = await Promise.all([
        supabase.from("reports").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("provinces").select("id,name"),
      ]);
      setReports((rp as ReportRow[]) || []);
      setProvinces((pv as ProvinceRow[]) || []);
      setLoading(false);
    })();
  }, []);

  const provinceName = (id: string) => provinces.find((p) => p.id === id)?.name || "—";
  const statusBadge = (s: string, mine?: boolean) => {
    const cls: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-amber-500/10 text-amber-800 dark:text-amber-200",
      in_review: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      returned: "bg-red-500/10 text-red-700 dark:text-red-300",
      validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
    const lbl: Record<string, string> = {
      draft: t.draft,
      submitted: mine && role === "province_user" ? t.awaitingValidation : t.submitted,
      in_review: t.inReview,
      returned: t.returned,
      validated: t.validated,
    };
    return <Badge variant="outline" className={cls[s]}>{lbl[s]}</Badge>;
  };

  const canEdit = (r: ReportRow) =>
    role === "province_user" && r.province_id === profile?.province_id && r.status !== "validated";
  const canRevisions = (r: ReportRow) =>
    role === "province_user" && r.province_id === profile?.province_id && r.status === "returned";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t.reports}</h1>
        {role === "province_user" && (
          <Button onClick={() => nav({ to: "/reports/new" })}>
            <Plus className="h-4 w-4 mr-1" />{t.newReport}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">{t.noReports}</div>
          ) : (
            <div className="divide-y">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-accent/40">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{provinceName(r.province_id)}</div>
                    <div className="text-sm text-muted-foreground">{t.months[r.month - 1]} {r.year}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap justify-end">
                    {statusBadge(r.status, r.province_id === profile?.province_id)}
                    {canRevisions(r) && (
                      <Link to="/reports/$reportId/revisions" params={{ reportId: r.id }}>
                        <Button size="sm" variant="destructive">{t.revisions}</Button>
                      </Link>
                    )}
                    {canEdit(r) ? (
                      <Link to="/reports/$reportId/edit" params={{ reportId: r.id }}>
                        <Button size="sm" variant="outline"><Pencil className="h-3.5 w-3.5 mr-1" />{t.edit}</Button>
                      </Link>
                    ) : (
                      <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                        <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" />{t.view}</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
