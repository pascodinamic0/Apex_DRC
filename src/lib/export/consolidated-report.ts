export interface AggregatedActivity {
  code: string;
  planned: number;
  achieved: number;
}

export interface NarrativeBlock {
  provinceName: string;
  content: string;
}

export interface ConsolidatedSection {
  key: string;
  label: string;
  blocks: NarrativeBlock[];
}

export const CONSOLIDATED_NARRATIVE_KEYS = [
  "exec_summary_smni",
  "exec_summary_nutrition",
  "exec_summary_malaria",
  "stakeholder_coordination",
  "success_stories",
  "challenges",
  "priorities_next_month",
] as const;

export function buildConsolidatedSections(
  narratives: { section_type: string; content: string | null; report_id: string }[],
  reports: { id: string; province_id: string }[],
  provinceName: (id: string) => string,
  labels: Record<string, string>,
): ConsolidatedSection[] {
  return CONSOLIDATED_NARRATIVE_KEYS.map((key) => ({
    key,
    label: labels[key] || key,
    blocks: narratives
      .filter((n) => n.section_type === key && n.content)
      .map((n) => {
        const r = reports.find((rr) => rr.id === n.report_id);
        return {
          provinceName: r ? provinceName(r.province_id) : "—",
          content: n.content || "",
        };
      }),
  }));
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
