import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({ component: History });

function History() {
  const { t } = useT();
  const now = new Date();
  const [year, setYear] = useState<string>(String(now.getFullYear()));
  const [provinceId, setProvinceId] = useState<string>("all");
  const [provinces, setProvinces] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: pv }, { data: rp }] = await Promise.all([
        supabase.from("provinces").select("*").order("name"),
        supabase.from("reports").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
      ]);
      setProvinces(pv || []); setReports(rp || []);
    })();
  }, []);

  const filtered = useMemo(() => reports.filter((r) =>
    String(r.year) === year && (provinceId === "all" || r.province_id === provinceId)
  ), [reports, year, provinceId]);

  const provinceName = (id: string) => provinces.find((p) => p.id === id)?.name || "—";
  const cls: Record<string, string> = {
    draft: "bg-muted", submitted: "bg-blue-500/10 text-blue-700",
    validated: "bg-emerald-500/10 text-emerald-700",
  };
  const lbl: Record<string, string> = { draft: t.draft, submitted: t.submitted, validated: t.validated };
  const years = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight">{t.history}</h1>
      <Card>
        <CardContent className="flex flex-wrap gap-4 p-4">
          <div className="space-y-1">
            <Label>{t.year}</Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t.province}</Label>
            <Select value={provinceId} onValueChange={setProvinceId}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.allProvinces}</SelectItem>
                {provinces.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">{t.noReports}</div>
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
