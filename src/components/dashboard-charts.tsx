import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ChartsInner = lazy(() => import("./dashboard-charts-inner"));

export function DashboardCharts(props: {
  trend: { name: string; count: number }[];
  trendLabel: string;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <ChartsInner {...props} />
    </Suspense>
  );
}
