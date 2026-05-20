import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const ChartsInner = lazy(() => import("./dashboard-charts-inner"));

export function DashboardCharts(props: {
  trend: { name: string; count: number }[];
  provinceBars: { name: string; status: number }[];
  trendLabel: string;
  provinceLabel: string;
}) {
  return (
    <Suspense fallback={
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <ChartsInner {...props} />
    </Suspense>
  );
}
