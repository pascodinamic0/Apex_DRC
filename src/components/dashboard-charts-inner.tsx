import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { useT } from "@/lib/i18n";

const CHART_HEIGHT = 300;

export default function DashboardChartsInner({
  trend,
  trendLabel,
}: {
  trend: { name: string; count: number }[];
  trendLabel: string;
}) {
  const { t } = useT();

  const chartConfig = {
    count: {
      label: t.submissions,
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <Card className="w-full">
      <CardHeader className="shrink-0">
        <CardTitle>{trendLabel}</CardTitle>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: CHART_HEIGHT }}
        >
          <LineChart
            data={trend}
            margin={{ left: 4, right: 12, top: 12, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/60" />
            <XAxis
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
              tickMargin={4}
              fontSize={12}
              domain={[0, "auto"]}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--color-count)", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
