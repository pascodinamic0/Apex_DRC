import { calcAchievementRate } from "@/lib/activity-catalog";
import { downloadBlob } from "./consolidated-report";
import {
  EPIC_AGREEMENT,
  EPIC_PROJECT,
  officialLabels,
  type OfficialReportPayload,
} from "./epic-official";

function cell(text: string, Paragraph: any, TextRun: any, TableCell: any, WidthType: any, bold = false) {
  return new TableCell({
    width: { size: 14, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "—", bold, size: 16 })],
      }),
    ],
  });
}

export async function exportOfficialDocx(payload: OfficialReportPayload, lang: "fr" | "en", filename: string) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    AlignmentType,
    Header,
    Footer,
  } = await import("docx");
  const L = officialLabels(lang);
  const title = payload.kind === "national" ? L.nationalTitle : L.monthlyTitle;
  const rate = calcAchievementRate(payload.achievement);

  const heading = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_1 });
  const h2 = (text: string) => new Paragraph({ text, heading: HeadingLevel.HEADING_2 });
  const p = (text: string, bold = false) =>
    new Paragraph({ children: [new TextRun({ text: text || "—", bold })] });
  const spacer = () => new Paragraph("");

  const achievementTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [L.rubrique, L.count, L.percent].map((h) => cell(h, Paragraph, TextRun, TableCell, WidthType, true)),
      }),
      ...payload.achievementRows.map(
        (r) =>
          new TableRow({
            children: [r.label, String(r.count), r.pct].map((v) => cell(v, Paragraph, TextRun, TableCell, WidthType)),
          }),
      ),
    ],
  });

  const activityHead = [L.activityCode, L.realized, L.progress, L.challenges, L.solutions, L.priorities, L.partners];
  const activityTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: activityHead.map((h) => cell(h, Paragraph, TextRun, TableCell, WidthType, true)),
      }),
      ...(payload.activities.length
        ? payload.activities
        : [
            {
              code: "—",
              title: "",
              realized: lang === "en" ? "No completed activity rows for this period." : "Aucune ligne d'activité renseignée pour cette période.",
              progress: "",
              challenges: "",
              solutions: "",
              priorities: "",
              partners: "",
            },
          ]
      ).map(
        (a) =>
          new TableRow({
            children: [
              `${a.code}\n${a.title || ""}`,
              a.realized,
              a.progress,
              a.challenges,
              a.solutions,
              a.priorities,
              a.partners,
            ].map((v) => cell(v, Paragraph, TextRun, TableCell, WidthType)),
          }),
      ),
    ],
  });

  const provinceTable = payload.provinceRates?.length
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [L.province, L.count, L.achApproved, "%"].map((h) =>
              cell(h, Paragraph, TextRun, TableCell, WidthType, true),
            ),
          }),
          ...payload.provinceRates.map(
            (r) =>
              new TableRow({
                children: [r.name, String(r.total), String(r.approved), `${r.rate}%`].map((v) =>
                  cell(v, Paragraph, TextRun, TableCell, WidthType),
                ),
              }),
          ),
        ],
      })
    : null;

  const annexTable = payload.annexRows?.length
    ? new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ["Code", lang === "en" ? "Indicator" : "Indicateur", "N", "D", "%", lang === "en" ? "Comment" : "Commentaire"].map(
              (h) => cell(h, Paragraph, TextRun, TableCell, WidthType, true),
            ),
          }),
          ...payload.annexRows.map(
            (r) =>
              new TableRow({
                children: [r.code, r.name, r.numerator, r.denominator, r.value, r.comment].map((v) =>
                  cell(v, Paragraph, TextRun, TableCell, WidthType),
                ),
              }),
          ),
        ],
      })
    : null;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: { orientation: "portrait" } },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({ children: [new TextRun({ text: `${EPIC_PROJECT} — ${EPIC_AGREEMENT}`, size: 16, italics: true })] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [new TextRun(`${L.generatedOn} ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`)],
              }),
            ],
          }),
        },
        children: [
          p(L.domains, true),
          p(payload.domains),
          spacer(),
          p(L.submittedBy, true),
          p(payload.submittedBy || "—"),
          spacer(),
          heading(payload.provinceName),
          heading(title),
          p(`${L.monthOf} ${payload.monthLabel} ${payload.year}`),
          spacer(),
          p(EPIC_PROJECT, true),
          p(`${L.agreement} ${EPIC_AGREEMENT}`),
          spacer(),
          p(L.sourceNote),
          spacer(),
          h2(L.execSummary),
          p(L.smni, true),
          p(payload.execSmni),
          spacer(),
          p(L.nutrition, true),
          p(payload.execNutrition),
          spacer(),
          p(L.malaria, true),
          p(payload.execMalaria),
          spacer(),
          h2(`${L.realizationRate} : ${rate}%`),
          p(L.tableI, true),
          achievementTable,
          spacer(),
          ...(provinceTable ? [p(L.province, true), provinceTable, spacer()] : []),
          h2(L.keyResults),
          activityTable,
          spacer(),
          h2(L.coordination),
          p(payload.coordination),
          spacer(),
          h2(L.stories),
          p(payload.stories),
          spacer(),
          h2(L.challengesSection),
          p(payload.challenges),
          spacer(),
          h2(L.nextMonth),
          p(payload.priorities),
          spacer(),
          ...(annexTable ? [h2(L.annexA), annexTable] : []),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

/** @deprecated Use exportOfficialDocx */
export async function exportConsolidatedDocx(opts: {
  title: string;
  periodLine: string;
  generatedLine: string;
  tableHead: string[];
  aggregated: { code: string; planned: number; achieved: number }[];
  sections: { label: string; blocks: { provinceName: string; content: string }[] }[];
  filename: string;
}) {
  const payload: OfficialReportPayload = {
    kind: "national",
    provinceName: opts.title,
    monthLabel: opts.periodLine,
    year: new Date().getFullYear(),
    submittedBy: null,
    domains: "",
    achievement: {
      total_planned: opts.aggregated.reduce((s, a) => s + a.planned, 0),
      finalized_approved: opts.aggregated.reduce((s, a) => s + a.achieved, 0),
      finalized_no_report: 0,
      in_progress: 0,
      trigger_approved: 0,
      not_realized: 0,
    },
    achievementRows: [],
    activities: opts.aggregated.map((a) => ({
      code: a.code,
      title: "",
      realized: String(a.planned),
      progress: String(a.achieved),
      challenges: "",
      solutions: "",
      priorities: "",
      partners: "",
    })),
    execSmni: opts.sections.find((s) => s.label)?.blocks.map((b) => `[${b.provinceName}] ${b.content}`).join("\n\n") || "",
    execNutrition: "",
    execMalaria: "",
    coordination: "",
    stories: "",
    challenges: "",
    priorities: "",
  };
  await exportOfficialDocx(payload, "fr", opts.filename);
}

/** @deprecated Use exportOfficialDocx */
export async function exportSingleReportDocx(opts: {
  title: string;
  periodLine: string;
  tableHead: string[];
  rows: { code: string; planned: number; achieved: number }[];
  sections: { label: string; content: string }[];
  filename: string;
}) {
  const payload: OfficialReportPayload = {
    kind: "monthly",
    provinceName: opts.title,
    monthLabel: opts.periodLine,
    year: new Date().getFullYear(),
    submittedBy: null,
    domains: "",
    achievement: {
      total_planned: opts.rows.reduce((s, a) => s + a.planned, 0),
      finalized_approved: opts.rows.reduce((s, a) => s + a.achieved, 0),
      finalized_no_report: 0,
      in_progress: 0,
      trigger_approved: 0,
      not_realized: 0,
    },
    achievementRows: [],
    activities: opts.rows.map((a) => ({
      code: a.code,
      title: "",
      realized: String(a.planned),
      progress: String(a.achieved),
      challenges: "",
      solutions: "",
      priorities: "",
      partners: "",
    })),
    execSmni: opts.sections.map((s) => `${s.label}\n${s.content}`).join("\n\n"),
    execNutrition: "",
    execMalaria: "",
    coordination: "",
    stories: "",
    challenges: "",
    priorities: "",
  };
  await exportOfficialDocx(payload, "fr", opts.filename);
}
