import {
  AlignmentType,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { OBJECTIVE_PARENTS, OBJECTIVE_TITLES, calcAchievementRate } from "@/lib/activity-catalog";
import { downloadBlob } from "./consolidated-report";
import {
  EPIC_AGREEMENT,
  EPIC_PROJECT,
  officialAcronyms,
  officialLabels,
  type ActivityExportRow,
  type OfficialReportPayload,
} from "./epic-official";

const NAVY = "0F4C81";
const ORANGE = "F15A29";
const LIGHT_BLUE = "246394";

function dash(s: string) {
  return s?.trim() ? s : "—";
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: title, bold: true, color: NAVY, size: 24 })],
    border: {
      bottom: { color: ORANGE, space: 1, style: "single", size: 6 },
    },
  });
}

function subHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text: title, bold: true, color: NAVY, size: 22 })],
  });
}

function bodyParagraphs(text: string): Paragraph[] {
  const content = dash(text);
  return content.split(/\n+/).map(
    (line) =>
      new Paragraph({
        spacing: { after: 120 },
        children: [new TextRun({ text: line, size: 20 })],
      }),
  );
}

function bodyBlock(title: string, body: string): Paragraph[] {
  return [subHeading(title), ...bodyParagraphs(body)];
}

function headerCell(text: string, widthPct?: number): TableCell {
  return new TableCell({
    width: widthPct ? { size: widthPct, type: WidthType.PERCENTAGE } : undefined,
    shading: { fill: NAVY },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      }),
    ],
  });
}

function dataCell(text: string, opts?: { bold?: boolean; colspan?: number; fill?: string }): TableCell {
  return new TableCell({
    columnSpan: opts?.colspan,
    shading: opts?.fill ? { fill: opts.fill } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts?.bold, size: 18 })],
      }),
    ],
  });
}

function bandRow(text: string, fill: string, colspan: number): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: colspan,
        shading: { fill },
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
          }),
        ],
      }),
    ],
  });
}

function parentOf(code: string) {
  const parts = code.split(".");
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return code;
}

function objectiveOf(code: string) {
  const n = Number.parseInt(code, 10);
  return Number.isFinite(n) ? n : 0;
}

function activityTableRows(
  payload: OfficialReportPayload,
  lang: "fr" | "en",
  L: ReturnType<typeof officialLabels>,
): TableRow[] {
  const emptyMsg =
    lang === "en"
      ? "No completed activity rows in source reports for this period."
      : "Aucune ligne d'activite renseignee pour cette periode.";

  if (!payload.activities.length) {
    return [new TableRow({ children: [dataCell(emptyMsg, { colspan: 7 })] })];
  }

  const byObj = new Map<number, ActivityExportRow[]>();
  for (const a of payload.activities) {
    const obj = objectiveOf(a.code);
    const list = byObj.get(obj) || [];
    list.push(a);
    byObj.set(obj, list);
  }

  const rows: TableRow[] = [];
  for (const obj of [...byObj.keys()].sort((a, b) => a - b)) {
    const titles = OBJECTIVE_TITLES[obj];
    const objLabel = titles ? (lang === "en" ? titles.en : titles.fr) : "";
    rows.push(bandRow(`${L.objective} ${obj}. ${objLabel}`, NAVY, 7));

    const parents = OBJECTIVE_PARENTS[obj] || [];
    const items = byObj.get(obj) || [];
    const used = new Set<string>();
    const groups = [
      ...parents.map((p) => ({ code: p.code, title: lang === "en" ? p.titleEn : p.titleFr })),
      ...[...new Set(items.map((a) => parentOf(a.code)))]
        .filter((code) => !parents.some((p) => p.code === code))
        .map((code) => ({ code, title: code })),
    ];

    for (const group of groups) {
      const groupRows = items.filter((a) => parentOf(a.code) === group.code);
      if (!groupRows.length) continue;
      rows.push(bandRow(group.title, LIGHT_BLUE, 7));
      for (const a of groupRows) {
        used.add(a.code);
        rows.push(
          new TableRow({
            children: [
              dataCell(`${a.code}\n${a.title}`),
              dataCell(dash(a.realized)),
              dataCell(dash(a.progress)),
              dataCell(dash(a.challenges)),
              dataCell(dash(a.solutions)),
              dataCell(dash(a.priorities)),
              dataCell(dash(a.partners)),
            ],
          }),
        );
      }
    }

    for (const a of items.filter((row) => !used.has(row.code))) {
      rows.push(
        new TableRow({
          children: [
            dataCell(`${a.code}\n${a.title}`),
            dataCell(dash(a.realized)),
            dataCell(dash(a.progress)),
            dataCell(dash(a.challenges)),
            dataCell(dash(a.solutions)),
            dataCell(dash(a.priorities)),
            dataCell(dash(a.partners)),
          ],
        }),
      );
    }
  }

  return rows;
}

function dataUrlToBuffer(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function annexPhotoBlocks(
  photos: { caption: string; jpegDataUrl: string }[],
  lang: "fr" | "en",
): Paragraph[] {
  if (!photos.length) {
    const empty =
      lang === "en"
        ? "No implementation photos were attached to this report."
        : "Aucune photo de mise en oeuvre n'a ete jointe a ce rapport.";
    return bodyParagraphs(empty);
  }

  const blocks: Paragraph[] = [];
  for (const photo of photos) {
    try {
      blocks.push(
        new Paragraph({
          spacing: { before: 200, after: 80 },
          children: [
            new ImageRun({
              type: "jpg",
              data: dataUrlToBuffer(photo.jpegDataUrl),
              transformation: { width: 520, height: 340 },
            }),
          ],
        }),
      );
    } catch {
      blocks.push(
        new Paragraph({
          children: [
            new TextRun({
              text: lang === "en" ? "(Photo could not be embedded.)" : "(Photo non integree.)",
              italics: true,
              size: 18,
            }),
          ],
        }),
      );
    }
    if (photo.caption?.trim()) {
      blocks.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: photo.caption, italics: true, size: 16 })],
        }),
      );
    }
  }
  return blocks;
}

function pageHeaderFooter(dateLine: string) {
  return {
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            shading: { fill: NAVY },
            children: [
              new TextRun({ text: EPIC_PROJECT, color: "FFFFFF", size: 15 }),
              new TextRun({ text: `\t${EPIC_AGREEMENT}`, color: "FFFFFF", size: 15 }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            shading: { fill: NAVY },
            children: [
              new TextRun({ text: dateLine, color: "FFFFFF", size: 15 }),
              new TextRun({
                color: "FFFFFF",
                size: 15,
                children: ["\t", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
              }),
            ],
          }),
        ],
      }),
    },
  };
}

function coverSection(
  payload: OfficialReportPayload,
  L: ReturnType<typeof officialLabels>,
  dateLine: string,
): Paragraph[] {
  const title = payload.kind === "national" ? L.nationalTitle : L.monthlyTitle;
  return [
    new Paragraph({
      shading: { fill: NAVY },
      children: [new TextRun({ text: "FHI 360", bold: true, color: "FFFFFF", size: 22 })],
    }),
    new Paragraph({
      shading: { fill: NAVY },
      children: [new TextRun({ text: "EPIC RDC", color: "FFFFFF", size: 20 })],
    }),
    new Paragraph({
      shading: { fill: NAVY },
      spacing: { after: 200 },
      children: [new TextRun({ text: EPIC_PROJECT, color: "FFFFFF", size: 18 })],
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({
      children: [new TextRun({ text: L.domains, bold: true, color: NAVY, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: payload.domains, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: L.submittedBy, bold: true, color: NAVY, size: 18 })],
    }),
    new Paragraph({
      spacing: { after: 320 },
      children: [new TextRun({ text: dash(payload.submittedBy || ""), size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
      children: [
        new TextRun({ text: `[${payload.provinceName}]`, bold: true, color: NAVY, size: 44 }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: title, bold: true, color: NAVY, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 320 },
      children: [
        new TextRun({
          text: `${L.monthOf} ${payload.monthLabel} ${payload.year}`,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: EPIC_PROJECT, size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `${L.agreement} ${EPIC_AGREEMENT}`, size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: dateLine, size: 20 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: L.sourceNote, size: 18, italics: true })],
    }),
  ];
}

function buildFrontMatter(
  payload: OfficialReportPayload,
  lang: "fr" | "en",
  L: ReturnType<typeof officialLabels>,
  rate: number,
): (Paragraph | Table)[] {
  const tocItems = [
    L.acronyms,
    L.execSummary,
    `   • ${L.smni}`,
    `   • ${L.nutrition}`,
    `   • ${L.malaria}`,
    `   • ${L.realizationRate}`,
    L.keyResults,
    L.coordination,
    L.stories,
    L.challengesSection,
    L.nextMonth,
    L.annexA,
    L.annexB,
  ];

  const blocks: (Paragraph | Table)[] = [
    sectionHeading(L.toc),
    ...tocItems.map(
      (item) =>
        new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: item, size: 20 })] }),
    ),
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading(L.acronyms),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            headerCell(lang === "en" ? "Acronym" : "Sigle", 25),
            headerCell(lang === "en" ? "Definition" : "Definition", 75),
          ],
        }),
        ...officialAcronyms(lang).map(
          ([a, b]) =>
            new TableRow({
              children: [dataCell(a, { bold: true }), dataCell(b)],
            }),
        ),
      ],
    }),
    new Paragraph({ children: [new PageBreak()] }),
    sectionHeading(L.execSummary),
    ...bodyBlock(L.smni, payload.execSmni),
    ...bodyBlock(L.nutrition, payload.execNutrition),
    ...bodyBlock(L.malaria, payload.execMalaria),
    sectionHeading(`${L.realizationRate} : ${rate}%`),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: L.tableI, bold: true, size: 20 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [headerCell(L.rubrique, 55), headerCell(L.count, 22), headerCell(L.percent, 23)],
        }),
        ...payload.achievementRows.map(
          (r) =>
            new TableRow({
              children: [dataCell(r.label), dataCell(String(r.count)), dataCell(r.pct)],
            }),
        ),
      ],
    }),
  ];

  if (payload.provinceRates?.length) {
    blocks.push(
      new Paragraph({ spacing: { before: 240 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell(L.province, 40),
              headerCell(L.count, 20),
              headerCell(L.achApproved, 20),
              headerCell("%", 20),
            ],
          }),
          ...payload.provinceRates.map(
            (r) =>
              new TableRow({
                children: [
                  dataCell(r.name),
                  dataCell(String(r.total)),
                  dataCell(String(r.approved)),
                  dataCell(`${r.rate}%`),
                ],
              }),
          ),
        ],
      }),
    );
  }

  return blocks;
}

function buildBackMatter(
  payload: OfficialReportPayload,
  lang: "fr" | "en",
  L: ReturnType<typeof officialLabels>,
): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [
    ...bodyBlock(L.coordination, payload.coordination),
    ...bodyBlock(L.stories, payload.stories),
    ...bodyBlock(L.challengesSection, payload.challenges),
    ...bodyBlock(L.nextMonth, payload.priorities),
  ];

  if (payload.aiNationalSummary?.trim()) {
    blocks.push(...bodyBlock(L.aiNationalSummary, payload.aiNationalSummary));
  }

  if (payload.annexRows?.length) {
    blocks.push(
      sectionHeading(L.annexA),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              headerCell("Code", 12),
              headerCell(lang === "en" ? "Indicator" : "Indicateur", 30),
              headerCell("N", 10),
              headerCell("D", 10),
              headerCell("%", 10),
              headerCell(lang === "en" ? "Comment" : "Commentaire", 28),
            ],
          }),
          ...payload.annexRows.map(
            (r) =>
              new TableRow({
                children: [
                  dataCell(r.code),
                  dataCell(r.name),
                  dataCell(r.numerator),
                  dataCell(r.denominator),
                  dataCell(r.value),
                  dataCell(r.comment),
                ],
              }),
          ),
        ],
      }),
    );
  } else {
    blocks.push(
      ...bodyBlock(
        L.annexA,
        lang === "en" ? "No annex indicators for this period." : "Aucun indicateur d'annexe pour cette periode.",
      ),
    );
  }

  blocks.push(sectionHeading(L.annexB), ...annexPhotoBlocks(payload.photos || [], lang));
  return blocks;
}

export async function exportOfficialDocx(
  payload: OfficialReportPayload,
  lang: "fr" | "en",
  filename: string,
) {
  const L = officialLabels(lang);
  const dateLine = `${L.generatedOn} ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`;
  const rate = calcAchievementRate(payload.achievement);
  const chrome = pageHeaderFooter(dateLine);
  const pageMargins = { top: 1080, right: 720, bottom: 900, left: 720 };

  const keyResultsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          headerCell(L.activityCode, 14),
          headerCell(L.realized, 14),
          headerCell(L.progress, 14),
          headerCell(L.challenges, 14),
          headerCell(L.solutions, 14),
          headerCell(L.priorities, 14),
          headerCell(L.partners, 16),
        ],
      }),
      ...activityTableRows(payload, lang, L),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children: coverSection(payload, L, dateLine),
      },
      {
        properties: { page: { margin: pageMargins } },
        ...chrome,
        children: buildFrontMatter(payload, lang, L, rate),
      },
      {
        properties: {
          page: {
            size: { width: 16838, height: 11906, orientation: "landscape" },
            margin: pageMargins,
          },
        },
        ...chrome,
        children: [sectionHeading(L.keyResults), keyResultsTable],
      },
      {
        properties: { page: { margin: pageMargins } },
        ...chrome,
        children: buildBackMatter(payload, lang, L),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, filename);
}

export type { OfficialLabels } from "./epic-official";
