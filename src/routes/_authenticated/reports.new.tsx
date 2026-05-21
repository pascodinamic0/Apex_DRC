import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { seedReportExtensions } from "@/lib/report-data";

export const Route = createFileRoute("/_authenticated/reports/new")({ component: NewReport });

function NewReport() {
  const { t } = useT();
  const { profile, role } = useAuth();
  const nav = useNavigate();
  const now = new Date();
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (role && role !== "province_user") nav({ to: "/reports" });
  }, [role, nav]);

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
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Seed narratives & one activity per objective
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
          <Button className="w-full" onClick={create} disabled={busy}>{t.create}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
