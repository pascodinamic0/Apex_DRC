import { useT } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { ReportMeta } from "@/lib/report-data";

type Props = {
  meta: ReportMeta;
  provinceName: string;
  monthLabel: string;
  onChange: (patch: Partial<ReportMeta>) => void;
  readOnly?: boolean;
};

export function ReportMetaRow({ meta, provinceName, monthLabel, onChange, readOnly }: Props) {
  const { t } = useT();

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardContent className="p-3 space-y-1">
          <Label className="text-xs text-muted-foreground uppercase">{t.province}</Label>
          <p className="text-sm font-medium">{provinceName}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 space-y-1">
          <Label className="text-xs text-muted-foreground uppercase">{t.month}</Label>
          <p className="text-sm font-medium">{monthLabel}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 space-y-1">
          <Label className="text-xs text-muted-foreground uppercase">{t.domains}</Label>
          <div className="flex flex-wrap gap-1 pt-0.5">
            <Badge variant="secondary">{t.smni}</Badge>
            <Badge variant="secondary">{t.nutrition}</Badge>
            <Badge variant="secondary">{t.malaria}</Badge>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 space-y-1">
          <Label className="text-xs text-muted-foreground uppercase">{t.submittedBy}</Label>
          <Input
            disabled={readOnly}
            value={meta.submitted_by_name || ""}
            onChange={(e) => onChange({ submitted_by_name: e.target.value })}
            placeholder={t.submittedByPlaceholder}
            className="h-8"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 space-y-1">
          <Label className="text-xs text-muted-foreground uppercase">{t.jobTitle}</Label>
          <Input
            disabled={readOnly}
            value={meta.submitter_function || ""}
            onChange={(e) => onChange({ submitter_function: e.target.value })}
            placeholder={t.jobTitlePlaceholder}
            className="h-8"
          />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3 space-y-1">
          <Label className="text-xs text-muted-foreground uppercase">{t.deadline}</Label>
          <Input
            type="date"
            disabled={readOnly}
            value={meta.submission_deadline || ""}
            onChange={(e) => onChange({ submission_deadline: e.target.value || null })}
            className="h-8"
          />
        </CardContent>
      </Card>
    </div>
  );
}
