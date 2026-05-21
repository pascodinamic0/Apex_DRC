import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useT } from "@/lib/i18n";
import { calcAchievementRate, type AchievementSummary } from "@/lib/activity-catalog";

type Props = {
  value: AchievementSummary;
  onChange: (v: AchievementSummary) => void;
  readOnly?: boolean;
};

function pct(n: number, total: number) {
  if (total <= 0) return "—";
  return `${Math.round((n / total) * 100)}%`;
}

export function AchievementTable({ value, onChange, readOnly }: Props) {
  const { t } = useT();
  const total = value.total_planned || 0;
  const rate = calcAchievementRate(value);

  const set = (key: keyof AchievementSummary, n: number) =>
    onChange({ ...value, [key]: Math.max(0, n) });

  const rows: { key: keyof AchievementSummary; label: string }[] = [
    { key: "total_planned", label: t.achTotalPlanned },
    { key: "finalized_approved", label: t.achFinalizedApproved },
    { key: "finalized_no_report", label: t.achFinalizedNoReport },
    { key: "in_progress", label: t.achInProgress },
    { key: "trigger_approved", label: t.achTriggerApproved },
    { key: "not_realized", label: t.achNotRealized },
  ];

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium">{t.achRubrique}</th>
              <th className="text-right p-2 font-medium w-28">{t.achCount}</th>
              <th className="text-right p-2 font-medium w-24">{t.percentage}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => (
              <tr key={key} className="border-t">
                <td className="p-2">{key === "total_planned" ? <strong>{label}</strong> : label}</td>
                <td className="p-2 text-right">
                  {readOnly ? (
                    <span className="tabular-nums">{value[key]}</span>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-right ml-auto max-w-[88px]"
                      value={value[key] || ""}
                      onChange={(e) => set(key, Number(e.target.value) || 0)}
                    />
                  )}
                </td>
                <td className="p-2 text-right text-muted-foreground tabular-nums">
                  {key === "total_planned" ? (total > 0 ? "100%" : "—") : pct(value[key], total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div>
        <Progress value={rate} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          {t.achRateLabel}: <strong>{rate}%</strong>
        </p>
      </div>
    </div>
  );
}
