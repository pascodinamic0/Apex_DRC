import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function DashboardChartsInner({
  trend,
  trendLabel,
}: {
  trend: { name: string; count: number }[];
  provinceBars: { name: string; status: number }[];
  trendLabel: string;
  provinceLabel: string;
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="shrink-0"><CardTitle>{trendLabel}</CardTitle></CardHeader>
      <CardContent className="flex flex-1 flex-col min-h-0 p-6 pt-0">
        <div className="min-h-[240px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <XAxis dataKey="name" fontSize={11} tickMargin={8} />
            <YAxis allowDecimals={false} fontSize={11} width={36} tickMargin={4} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
