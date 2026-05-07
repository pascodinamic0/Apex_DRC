import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Pencil } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/")({ component: ReportsList });

interface ReportRow { id: string; province_id: string; month: number; year: number; status: string }
interface ProvinceRow { id: string; name: string }

function ReportsList() {
  const { t } = useT();
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [provinces, setProvinces] = useState<ProvinceRow[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: rp }, { data: pv }] = await Promise.all([
        supabase.from("reports").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
        supabase.from("provinces").select("id,name"),
      ]);
      setReports((rp as ReportRow[]) || []);
      setProvinces((pv as ProvinceRow[]) || []);
    })();
  }, []);

  const provinceName = (id: string) => provinces.find((p) => p.id === id)?.name || "—";
  const statusBadge = (s: string) => {
    const cls: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      submitted: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
      validated: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
    const lbl: Record<string, string> = { draft: t.draft, submitted: t.submitted, validated: t.validated };
    return <Badge variant="outline" className={cls[s]}>{lbl[s]}</Badge>;
  };

  const canEdit = (r: ReportRow) =>
    role === "province_user" && r.province_id === profile?.province_id && r.status !== "validated";

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
          {reports.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">{t.noReports}</div>
          ) : (
            <div className="divide-y">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-accent/40">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{provinceName(r.province_id)}</div>
                    <div className="text-sm text-muted-foreground">{t.months[r.month - 1]} {r.year}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(r.status)}
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
