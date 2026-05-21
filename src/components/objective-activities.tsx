import { useT } from "@/lib/i18n";
import { OBJECTIVE_PARENTS, type ActivityResponseFields, type CatalogRow } from "@/lib/activity-catalog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  objective: number;
  catalog: CatalogRow[];
  responses: ActivityResponseFields[];
  onChange: (code: string, field: keyof Omit<ActivityResponseFields, "catalog_code">, value: string) => void;
  readOnly?: boolean;
};

const FIELD_KEYS = ["realized", "progress", "challenges", "solutions", "priorities", "partners"] as const;

export function ObjectiveActivities({ objective, catalog, responses, onChange, readOnly }: Props) {
  const { t, lang } = useT();
  const parents = OBJECTIVE_PARENTS[objective] || [];
  const byCode = new Map(responses.map((r) => [r.catalog_code, r]));

  const fieldLabel = (k: (typeof FIELD_KEYS)[number]) => {
    const map: Record<string, string> = {
      realized: t.actRealized,
      progress: t.actProgress,
      challenges: t.actChallenges,
      solutions: t.actSolutions,
      priorities: t.actPriorities,
      partners: t.actPartners,
    };
    return map[k];
  };

  return (
    <div className="space-y-6">
      {parents.map((parent) => {
        const items = catalog.filter((c) => c.parent_code === parent.code);
        if (!items.length) return null;
        return (
          <div key={parent.code} className="space-y-3">
            <p className="text-sm font-semibold text-primary bg-primary/5 rounded-md px-3 py-2 border-l-2 border-primary">
              {lang === "en" ? parent.titleEn : parent.titleFr}
            </p>
            <Accordion type="multiple" className="w-full">
              {items.map((item) => {
                const row = byCode.get(item.code) || {
                  catalog_code: item.code,
                  realized: "",
                  progress: "",
                  challenges: "",
                  solutions: "",
                  priorities: "",
                  partners: "",
                };
                const title = lang === "en" ? item.title_en : item.title_fr;
                return (
                  <AccordionItem key={item.code} value={item.code} className="border rounded-md px-3 mb-2">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-start gap-2 text-left flex-1 min-w-0">
                        <Badge variant="outline" className="shrink-0 font-mono text-xs">
                          {item.code}
                        </Badge>
                        <span className="text-sm leading-snug">{title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-3 pb-3 md:grid-cols-2">
                        {FIELD_KEYS.map((fk) => (
                          <div key={fk} className={fk === "realized" || fk === "partners" ? "md:col-span-2" : ""}>
                            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                              {fieldLabel(fk)}
                            </Label>
                            <Textarea
                              rows={3}
                              disabled={readOnly}
                              value={row[fk]}
                              onChange={(e) => onChange(item.code, fk, e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        );
      })}
    </div>
  );
}
