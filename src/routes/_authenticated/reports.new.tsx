import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT, type Dict } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { seedReportExtensions } from "@/lib/report-data";

export const Route = createFileRoute("/_authenticated/reports/new")({ component: NewReport });

type ExistingReport = { id: string; status: string };

function periodLabel(t: Dict, month: string, year: string) {
  return t.reportAlreadyExists
    .replace("{month}", t.months[Number(month) - 1] ?? month)
    .replace("{year}", year);
}

function NewReport() {
  const { t } = useT();
  const { profile, role } = useAuth();
  const nav = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState<ExistingReport | null>(null);
  const toastedPeriod = useRef<string | null>(null);

  const duplicateMessage = periodLabel(t, month, year);

  const showDuplicate = (period = `${month}-${year}`) => {
    if (toastedPeriod.current === period) return;
    toastedPeriod.current = period;
    toast.error(periodLabel(t, month, year));
  };

  useEffect(() => {
    if (role && role !== "province_user") nav({ to: "/reports" });
  }, [role, nav]);

  useEffect(() => {
    if (!profile?.province_id) return;
    let cancelled = false;
    setExisting(null);
    (async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, status")
        .eq("province_id", profile.province_id)
        .eq("month", Number(month))
        .eq("year", Number(year))
        .maybeSingle();
      if (cancelled) return;
      const found = (data as ExistingReport | null) ?? null;
      setExisting(found);
      if (found) showDuplicate(`${month}-${year}`);
      else toastedPeriod.current = null;
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.province_id, month, year, t]);

  const openReport = (report: ExistingReport) => {
    const editable = report.status !== "validated";
    nav({
      to: editable ? "/reports/$reportId/edit" : "/reports/$reportId",
      params: { reportId: report.id },
    });
  };

  const findExisting = async (): Promise<ExistingReport | null> => {
    if (!profile?.province_id) return null;
    const { data } = await supabase
      .from("reports")
      .select("id, status")
      .eq("province_id", profile.province_id)
      .eq("month", Number(month))
      .eq("year", Number(year))
      .maybeSingle();
    return (data as ExistingReport | null) ?? null;
  };

  const create = async () => {
    if (!profile?.province_id) {
      toast.error("No province assigned");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.from("reports").insert({
      province_id: profile.province_id,
      month: Number(month),
      year: Number(year),
      status: "draft",
      created_by: profile.id,
    }).select("id").single();
    if (error) {
      const duplicate = error.code === "23505" || /duplicate key|unique constraint/i.test(error.message);
      setBusy(false);
      if (duplicate) {
        const found = await findExisting();
        if (found) setExisting(found);
        toastedPeriod.current = null;
        showDuplicate();
        return;
      }
      toast.error(t.error);
      return;
    }
    setBusy(false);
    await seedReportExtensions(data.id);
    nav({ to: "/reports/$reportId/edit", params: { reportId: data.id } });
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader><CardTitle>{t.newReport}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.month}</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {t.months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.year}</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {existing && (
            <Alert variant="destructive">
              <AlertDescription>{duplicateMessage}</AlertDescription>
            </Alert>
          )}
          <Button className="w-full" onClick={existing ? () => openReport(existing) : create} disabled={busy}>
            {existing ? t.openExistingReport : t.create}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
