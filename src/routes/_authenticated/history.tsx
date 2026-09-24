import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PeriodFilters, periodFilterLabels } from "@/components/national-analytics";
import { createDefaultPeriodSelection, filterReportsInPeriod, periodBounds, type PeriodSelection } from "@/lib/analytics";
import { reportingYears, SOURCE_MONTH, SOURCE_YEAR } from "@/lib/export/epic-official";

export const Route = createFileRoute("/_authenticated/history")({ component: History });

function History() {
  const { t } = useT();
  const { role, profile } = useAuth();
  const isAt = role === "technical_assistant";
  const showProvinceFilter = role === "technical_director" || role === "technical_assistant";
  const [period, setPeriod] = useState<PeriodSelection>(() =>
    createDefaultPeriodSelection(SOURCE_MONTH, SOURCE_YEAR),
  );
  const [provinceId, setProvinceId] = useState<string>("all");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: pv }, { data: rp }] = await Promise.all([
        supabase.from("provinces").select("*").order("name"),
        supabase.from("reports").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
      ]);
      setProvinces(pv || []); setReports(rp || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      filterReportsInPeriod(reports, periodBounds(period)).filter((r) => {
        if (showProvinceFilter) {
          if (provinceId !== "all" && r.province_id !== provinceId) return false;
        } else if (profile?.province_id && r.province_id !== profile.province_id) {
          return false;
        }
        return !isAt || r.status === "validated";
      }),
    [reports, period, provinceId, showProvinceFilter, profile?.province_id, isAt],
  );

  const provinceName = (id: string) => provinces.find((p) => p.id === id)?.name || "—";
  const cls: Record<string, string> = {
    draft: "bg-muted", submitted: "bg-blue-500/10 text-blue-700",
    validated: "bg-emerald-500/10 text-emerald-700",
  };
  const lbl: Record<string, string> = { draft: t.draft, submitted: t.submitted, validated: t.validated };
  const years = reportingYears();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        {isAt && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400 mb-1">
            {t.technicalAssistant}
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight">{isAt ? t.atValidatedArchive : t.history}</h1>
        {isAt && <p className="text-muted-foreground mt-1">{t.atValidatedArchiveHint}</p>}
      </div>
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <PeriodFilters
            period={period}
            years={years}
            months={t.months}
            trimesters={t.trimesters}
            semesters={t.semesters}
            labels={periodFilterLabels(t)}
            onPeriodChange={setPeriod}
          />
          {showProvinceFilter && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t.province}</Label>
              <Select value={provinceId} onValueChange={setProvinceId}>
                <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allProvinces}</SelectItem>
                  {provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">{t.noData}</div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">{provinceName(r.province_id)}</div>
                    <div className="text-sm text-muted-foreground">{t.months[r.month - 1]} {r.year}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cls[r.status]}>{lbl[r.status]}</Badge>
                    <Link to="/reports/$reportId" params={{ reportId: r.id }}>
                      <Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5 mr-1" />{t.view}</Button>
                    </Link>
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
