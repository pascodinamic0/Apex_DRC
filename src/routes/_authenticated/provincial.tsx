import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  createDefaultPeriodSelection,
  filterReportsInPeriod,
  formatPeriodLabel,
  periodBounds,
  type PeriodSelection,
} from "@/lib/analytics";
import { PeriodFilters, periodFilterLabels } from "@/components/national-analytics";
import { loadCatalog } from "@/lib/report-data";
import {
  buildOfficialMonthlyPayload,
  buildOfficialNationalPayload,
  reportingYears,
  SOURCE_MONTH,
  SOURCE_YEAR,
} from "@/lib/export/epic-official";
import { exportOfficialDocx } from "@/lib/export/epic-docx";
import type { AchievementSummary, ActivityResponseFields } from "@/lib/activity-catalog";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/provincial")({ component: ProvincialRollup });

interface ReportRow {
  id: string;
  month: number;
  year: number;
  status: string;
  submitted_by_name: string | null;
}

function ProvincialRollup() {
  const { t, lang } = useT();
  const { role, profile } = useAuth();
  const nav = useNavigate();
  const [period, setPeriod] = useState<PeriodSelection>(() =>
    createDefaultPeriodSelection(SOURCE_MONTH, SOURCE_YEAR),
  );
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [provinceName, setProvinceName] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const isCp = role === "province_user";
  const years = reportingYears();

  useEffect(() => {
    if (role === "technical_director" || role === "technical_assistant") {
      nav({ to: "/dashboard", replace: true });
    }
  }, [role, nav]);

  useEffect(() => {
    if (!profile?.province_id) {
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: pv }, { data: rp }] = await Promise.all([
        supabase.from("provinces").select("name").eq("id", profile.province_id!).maybeSingle(),
        supabase
          .from("reports")
          .select("id, month, year, status, submitted_by_name")
          .eq("province_id", profile.province_id!)
          .order("year", { ascending: false })
          .order("month", { ascending: false }),
      ]);
      setProvinceName((pv as { name: string } | null)?.name || "");
      setReports((rp as ReportRow[]) || []);
      setLoading(false);
    })();
  }, [profile?.province_id]);

  const bounds = periodBounds(period);
  const periodReports = useMemo(() => {
    const inPeriod = filterReportsInPeriod(reports, bounds);
    if (role === "read_only") return inPeriod.filter((r) => r.status === "validated");
    return inPeriod.filter((r) => r.status !== "draft");
  }, [reports, bounds, role]);

  const periodLabel = formatPeriodLabel(period, t.months, t.trimesters, t.semesters);

  const exportPeriod = async () => {
    if (!isCp || !profile?.province_id || periodReports.length === 0) return;
    setExporting(true);
    try {
      const catalog = await loadCatalog();
      const ids = periodReports.map((r) => r.id);
      const [{ data: ach }, { data: resp }, { data: narr }] = await Promise.all([
        supabase.from("achievement_summary").select("*").in("report_id", ids),
        supabase.from("activity_responses").select("*").in("report_id", ids),
        supabase.from("narratives").select("report_id, section_type, content").in("report_id", ids),
      ]);

      const achievements = (ach || []) as (AchievementSummary & { report_id: string })[];
      const responses = (resp || []) as (ActivityResponseFields & { report_id: string })[];
      const narratives = (narr || []) as { report_id: string; section_type: string; content: string | null }[];

      let payload;
      if (period.grain === "month" && periodReports.length === 1) {
        const r = periodReports[0];
        const achievement = achievements.find((a) => a.report_id === r.id) || {
          total_planned: 0,
          finalized_approved: 0,
          finalized_no_report: 0,
          in_progress: 0,
          trigger_approved: 0,
          not_realized: 0,
        };
        const nmap: Record<string, string> = {};
        for (const row of narratives.filter((n) => n.report_id === r.id && n.content)) {
          nmap[row.section_type] = row.content!;
        }
        payload = buildOfficialMonthlyPayload({
          lang,
          provinceName,
          monthLabel: t.months[r.month - 1],
          year: r.year,
          submittedBy: r.submitted_by_name,
          achievement,
          catalog,
          responses: responses.filter((x) => x.report_id === r.id),
          narratives: nmap,
        });
      } else {
        payload = buildOfficialNationalPayload({
          lang,
          monthLabel: periodLabel,
          year: bounds.toYear,
          catalog,
          provinces: [{ id: profile.province_id, name: provinceName }],
          reports: periodReports.map((r) => ({
            id: r.id,
            province_id: profile.province_id!,
            submitted_by_name: r.submitted_by_name,
          })),
          achievements,
          responses,
          narratives,
        });
        payload = { ...payload, kind: "monthly" as const, provinceName };
      }

      const slug = provinceName.replace(/\s+/g, "-").toLowerCase();
      await exportOfficialDocx(payload, lang, `epic-${slug}-${periodLabel.replace(/\s+/g, "-")}.docx`);
      toast.success(t.export);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  };

  if (role !== "province_user" && role !== "read_only") return null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">FHI 360</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{t.provincialRollupTitle}</h1>
          <p className="text-muted-foreground">{provinceName || "—"} · {periodLabel}</p>
        </div>
        {isCp && (
          <Button onClick={exportPeriod} disabled={exporting || periodReports.length === 0}>
            <Download className="h-4 w-4 mr-1" />
            {t.extractProvinceReport}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.reportingPeriod}</CardTitle>
        </CardHeader>
        <CardContent>
          <PeriodFilters
            period={period}
            years={years}
            months={t.months}
            trimesters={t.trimesters}
            semesters={t.semesters}
            labels={periodFilterLabels(t)}
            onPeriodChange={setPeriod}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.reports}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.loading}</p>
          ) : periodReports.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.noReports}</p>
          ) : (
            <div className="space-y-2">
              {periodReports.map((r) => (
                <Link
                  key={r.id}
                  to="/reports/$reportId"
                  params={{ reportId: r.id }}
                  className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                >
                  <span className="font-medium">
                    {t.months[r.month - 1]} {r.year}
                  </span>
                  <Badge variant="outline">{r.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
