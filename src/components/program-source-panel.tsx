import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { formatCount, formatPercent } from "@/lib/epic-source/calc";
import { PERIOD_FY2026_H1 } from "@/lib/epic-source/provenance";
import {
  loadProgramDataset,
  type AggregateResultRow,
  type IndicatorResultRow,
} from "@/lib/epic-source/queries";
import { exportProgramSourcePdf } from "@/lib/export/epic-program-export";

function ProvenanceBadge({ level }: { level: string }) {
  const { t } = useT();
  const label =
    level === "Aggregate" ? t.sourceVerified :
    level === "Narrative case" ? t.sourceNarrative :
    t.sourceUnavailable;
  return <Badge variant="outline" className="text-[10px]">{label}</Badge>;
}

export function ProgramSourcePanel() {
  const { t, lang } = useT();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodCode, setPeriodCode] = useState(PERIOD_FY2026_H1);
  const [area, setArea] = useState("all");
  const [objective, setObjective] = useState("all");
  const [activity, setActivity] = useState("all");
  const [indicator, setIndicator] = useState("all");
  const [province, setProvince] = useState("all");
  const [hz, setHz] = useState("all");
  const [data, setData] = useState<Awaited<ReturnType<typeof loadProgramDataset>> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const d = await loadProgramDataset(periodCode);
        if (!cancelled) setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [periodCode]);

  const filteredIndicators = useMemo(() => {
    if (!data) return [] as IndicatorResultRow[];
    return data.indicators.filter((row) => {
      if (area !== "all" && row.technical_area_code !== area) return false;
      if (indicator !== "all" && row.indicator_code !== indicator) return false;
      return true;
    });
  }, [data, area, indicator]);

  const filteredAggregates = useMemo(() => {
    if (!data) return [] as AggregateResultRow[];
    return data.aggregates.filter((row) => area === "all" || row.technical_area_code === area);
  }, [data, area]);

  const filteredActivities = useMemo(() => {
    if (!data) return [];
    return data.activities.filter((a) => {
      if (objective !== "all" && a.objective_code !== objective) return false;
      if (activity !== "all" && a.code !== activity && a.parent_code !== activity) return false;
      return true;
    });
  }, [data, objective, activity]);

  const filteredHz = useMemo(() => {
    if (!data) return [];
    return data.healthZones.filter((z) => {
      if (province !== "all" && z.province_name !== province) return false;
      if (hz !== "all" && z.code !== hz) return false;
      return true;
    });
  }, [data, province, hz]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !data?.period) {
    return (
      <Alert>
        <AlertTitle>{t.programDataTitle}</AlertTitle>
        <AlertDescription>{error || t.programDataEmpty}</AlertDescription>
      </Alert>
    );
  }

  const period = data.period;
  const hzCount = data.coverage.find((c) => c.health_zone_count)?.health_zone_count;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{t.programDataTitle}</h2>
          <p className="text-sm text-muted-foreground">{period.dataset_label}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t.reportingPeriod}</Label>
            <Select value={periodCode} onValueChange={setPeriodCode}>
              <SelectTrigger className="w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {data.periods.map((p) => (
                  <SelectItem key={p.code} value={p.code}>{p.fiscal_year} {p.period_label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={async () => { await exportProgramSourcePdf(data, lang); toast.success(t.pdfGenerated); }}>
            <Download className="h-4 w-4 mr-1" />{t.export}
          </Button>
        </div>
      </div>

      <Alert>
        <AlertTitle>{t.methodology}</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed">{period.methodology}</AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t.reportingPeriod}</div><div className="text-lg font-bold mt-1">{period.fiscal_year} {period.period_label}</div><div className="text-xs text-muted-foreground">{period.start_date} → {period.end_date}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t.provinces}</div><div className="text-2xl font-bold mt-1">{data.coverage.filter((c) => c.province_name).length}</div><div className="text-xs text-muted-foreground">{t.mnchFourProvinces}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t.healthZones}</div><div className="text-2xl font-bold mt-1">{hzCount ?? "—"}</div><div className="text-xs text-muted-foreground">{t.hzNamesUnavailable}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">{t.indicators}</div><div className="text-2xl font-bold mt-1">{data.indicators.length}</div><div className="text-xs text-muted-foreground">Annex B</div></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Filter label={t.domains} value={area} onChange={setArea} options={[{ value: "all", label: t.allAreas }, ...data.technicalAreas.map((a) => ({ value: a.code, label: a.name_fr }))]} />
        <Filter label={t.objective} value={objective} onChange={setObjective} options={[{ value: "all", label: t.allObjectives }, ...data.objectives.map((o) => ({ value: o.code, label: `${t.objective} ${o.number}` }))]} />
        <Filter label={t.activities} value={activity} onChange={setActivity} options={[{ value: "all", label: t.allActivities }, ...data.activities.filter((a) => a.level === "activity").map((a) => ({ value: a.code, label: a.code }))]} />
        <Filter label={t.indicators} value={indicator} onChange={setIndicator} options={[{ value: "all", label: t.allIndicators }, ...data.indicators.map((i) => ({ value: i.indicator_code, label: i.indicator_code }))]} />
        <Filter label={t.province} value={province} onChange={setProvince} options={[{ value: "all", label: t.allProvinces }, ...Array.from(new Map(data.coverage.filter((c) => c.province_name).map((c) => [c.province_name!, c.province_name!])).entries()).map(([value, label]) => ({ value, label }))]} />
        <Filter label={t.healthZone} value={hz} onChange={setHz} options={[{ value: "all", label: t.allHealthZones }, ...data.healthZones.map((z) => ({ value: z.code, label: z.name }))]} />
      </div>

      <Tabs defaultValue="indicators">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="indicators">{t.indicators}</TabsTrigger>
          <TabsTrigger value="results">{t.keyResults}</TabsTrigger>
          <TabsTrigger value="activities">{t.activities}</TabsTrigger>
          <TabsTrigger value="ghs">GHS</TabsTrigger>
          <TabsTrigger value="stories">{t.successStories}</TabsTrigger>
          <TabsTrigger value="geo">{t.geography}</TabsTrigger>
        </TabsList>

        <TabsContent value="indicators" className="space-y-3">
          <p className="text-xs text-muted-foreground">{t.percentFromParts}</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">{t.activityCode}</th>
                  <th className="text-left p-2">{t.description}</th>
                  <th className="text-right p-2">{t.numerator}</th>
                  <th className="text-right p-2">{t.denominator}</th>
                  <th className="text-right p-2">{t.percentage}</th>
                  <th className="text-left p-2">{t.comment}</th>
                </tr>
              </thead>
              <tbody>
                {filteredIndicators.map((row) => (
                  <tr key={row.indicator_code} className="border-t align-top">
                    <td className="p-2 font-mono text-xs">{row.indicator_code}</td>
                    <td className="p-2">{row.name}<div className="mt-1"><ProvenanceBadge level={row.data_level} /></div></td>
                    <td className="p-2 text-right tabular-nums">{formatCount(row.numerator)}</td>
                    <td className="p-2 text-right tabular-nums">{formatCount(row.denominator)}</td>
                    <td className="p-2 text-right tabular-nums font-medium">{formatPercent(row.computed_percent)}</td>
                    <td className="p-2 text-muted-foreground text-xs max-w-xs">{row.comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="results" className="grid md:grid-cols-2 gap-3">
          {filteredAggregates.map((row) => (
            <Card key={row.code}>
              <CardContent className="p-4 space-y-1">
                <div className="flex justify-between gap-2">
                  <Badge variant="secondary">{row.technical_area_code}</Badge>
                  <ProvenanceBadge level="Aggregate" />
                </div>
                <div className="text-2xl font-bold tabular-nums">{formatCount(row.value)}</div>
                <p className="text-sm">{row.name}</p>
                {row.reported_percent != null && <p className="text-xs text-muted-foreground">{t.reportedInSource}: {row.reported_percent}%</p>}
                {row.notes && <p className="text-xs text-muted-foreground">{row.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          {data.objectives.filter((o) => objective === "all" || o.code === objective).map((o) => (
            <Card key={o.code}>
              <CardHeader>
                <CardTitle className="text-base">{t.objective} {o.number}. {o.title_fr}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredActivities.filter((a) => a.objective_code === o.code && a.level === "activity").map((parent) => (
                  <div key={parent.code}>
                    <p className="text-sm font-semibold border-l-2 border-primary pl-3 py-1 bg-primary/5 rounded-r">{parent.code} — {parent.title_fr}</p>
                    <ul className="mt-2 space-y-1">
                      {filteredActivities.filter((a) => a.parent_code === parent.code).map((child) => (
                        <li key={child.code} className="text-sm flex gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] h-5">{child.code}</Badge>
                          <span>{child.title_fr}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ghs" className="space-y-4">
          {data.ghs.map((g) => (
            <Card key={g.ghs_indicator_code}>
              <CardHeader>
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  {g.name}
                  <span className="text-2xl font-bold tabular-nums">
                    {g.total_is_minimum ? "≥" : ""}{formatCount(g.total_value)}
                  </span>
                  {g.planned_later && <Badge>{t.plannedH2}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {g.sex_breakdown_status !== "not_provided" && (
                  <p className="text-xs text-muted-foreground">
                    {t.male}: {formatCount(g.male_count)} · {t.female}: {formatCount(g.female_count)} · {t.notSpecified}: {formatCount(g.not_specified_count)}
                    {g.sex_breakdown_status === "approximate" ? ` (${t.approximate})` : ""}
                  </p>
                )}
                {g.notes && <p className="text-sm text-muted-foreground">{g.notes}</p>}
                <ul className="text-sm space-y-1">
                  {g.details.map((d) => (
                    <li key={d.code} className="flex justify-between gap-3">
                      <span>{d.label}</span>
                      <span className="tabular-nums shrink-0">
                        {d.value == null ? "" : `${d.value_is_minimum ? "≥" : ""}${formatCount(d.value)}`}
                        {d.sex_breakdown_status === "verified" ? ` (${d.male_count ?? "—"} M / ${d.female_count ?? "—"} F)` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="stories" className="space-y-4">
          {data.stories.map((s) => (
            <Card key={s.code}>
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <ProvenanceBadge level={s.data_level} />
                  {s.timeframe_label && <span>{s.timeframe_label}</span>}
                  {s.location_name && <span>{s.location_name}</span>}
                  {s.health_zone_name && <span>HZ {s.health_zone_name}</span>}
                  {s.province_name && <span>{s.province_name}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{s.body}</p>
                {Object.keys(s.metrics).length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {Object.entries(s.metrics).map(([k, v]) => (
                      <div key={k} className="rounded-md border p-2">
                        <div className="text-xs text-muted-foreground">{k.replaceAll("_", " ")}</div>
                        <div className="text-lg font-semibold tabular-nums">{formatCount(v)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="geo" className="space-y-4">
          <Alert>
            <AlertDescription>{t.geoLimitation}</AlertDescription>
          </Alert>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2">{t.healthZone}</th>
                  <th className="text-left p-2">{t.province}</th>
                  <th className="text-left p-2">{t.status}</th>
                </tr>
              </thead>
              <tbody>
                {filteredHz.map((z) => (
                  <tr key={z.code} className="border-t">
                    <td className="p-2">{z.name}</td>
                    <td className="p-2">{z.province_name || t.notAvailableInSource}</td>
                    <td className="p-2 text-xs text-muted-foreground">{z.province_assignment_status === "verified" ? t.sourceVerified : t.notAvailableInSource}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">{t.notAvailableInSource}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.gaps.map((g) => (
                <div key={g.code}>
                  <p className="text-sm font-medium">{g.topic}</p>
                  <p className="text-xs text-muted-foreground">{g.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Filter({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
