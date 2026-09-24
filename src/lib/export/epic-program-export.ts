import {
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Document,
  Footer,
  Header,
  HeadingLevel,
  HeightRule,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  ShadingType,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { EPIC_AGREEMENT, EPIC_PROJECT } from "./epic-official";
import { downloadBlob } from "./consolidated-report";
import type { loadProgramDataset } from "@/lib/epic-source/queries";
import { localizeEpicSource } from "@/lib/epic-source/locale";

type Dataset = Awaited<ReturnType<typeof loadProgramDataset>>;

const CHARCOAL = "1E1E1E";
const CHARCOAL_ALT = "2A2A2A";
const NAVY = CHARCOAL;
const STEEL = CHARCOAL_ALT;
const ORANGE = "FF4719";
const RULE = "E6E6E6";
const ROW_ALT = "F7F7F7";
const ROW_NOTE = "F3F3F3";
const INK = "1E1E1E";
const MUTED = "5B5B5B";
const FONT = "Arial";
const PAGE = convertInchesToTwip(8.5);
const LEFT = convertInchesToTwip(0.75);
const USABLE = convertInchesToTwip(7);

const thin = (color = RULE) => ({
  style: BorderStyle.SINGLE,
  size: 4,
  color,
});

const cellBorders = {
  top: thin(),
  bottom: thin(),
  left: thin(),
  right: thin(),
};

function run(text: string, opts?: { bold?: boolean; italics?: boolean; size?: number; color?: string }) {
  return new TextRun({
    text,
    font: FONT,
    bold: opts?.bold,
    italics: opts?.italics,
    size: opts?.size ?? 20,
    color: opts?.color ?? INK,
  });
}

function para(
  text: string,
  opts?: {
    bold?: boolean;
    italics?: boolean;
    size?: number;
    color?: string;
    before?: number;
    after?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    border?: boolean;
  },
) {
  return new Paragraph({
    heading: opts?.heading,
    alignment: opts?.align,
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 120, line: 276, lineRule: "auto" },
    border: opts?.border
      ? { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE, space: 4 } }
      : undefined,
    children: [run(text, opts)],
  });
}

function cell(
  text: string,
  width: number,
  opts?: {
    fill?: string;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    span?: number;
  },
) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: opts?.span,
    shading: opts?.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 80, right: 80 },
    borders: cellBorders,
    children: [
      new Paragraph({
        alignment: opts?.align ?? AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 276, lineRule: "auto" },
        children: [
          run(text, {
            bold: opts?.bold,
            italics: opts?.italics,
            size: opts?.size ?? 19,
            color: opts?.color ?? INK,
          }),
        ],
      }),
    ],
  });
}

function headerRow(labels: string[], widths: number[], centerFrom = 2) {
  return new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: labels.map((label, i) =>
      cell(label, widths[i], {
        fill: NAVY,
        bold: true,
        color: "FFFFFF",
        size: 17,
        align: i >= centerFrom ? AlignmentType.CENTER : AlignmentType.LEFT,
      }),
    ),
  });
}

function bandRow(text: string, widths: number[]) {
  return new TableRow({
    cantSplit: true,
    children: [
      cell(text, widths[0], {
        fill: STEEL,
        bold: true,
        color: "FFFFFF",
        size: 19,
        span: widths.length,
      }),
    ],
  });
}

function noteRow(text: string, widths: number[]) {
  return new TableRow({
    cantSplit: true,
    children: [
      cell(text, widths[0], {
        fill: ROW_NOTE,
        italics: true,
        color: MUTED,
        size: 18,
        span: widths.length,
      }),
    ],
  });
}

function pctColor(_value: number | null | undefined) {
  return INK;
}

function formatCount(value: number | null | undefined, lang: "fr" | "en") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US").format(Number(value));
}

function formatPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}%`;
}

function dash(s: string | null | undefined) {
  return s?.trim() ? s : "—";
}

function areaLabel(code: string, lang: "fr" | "en") {
  if (code === "MCH") return lang === "en" ? "Maternal, Newborn and Child Health" : "Santé maternelle, néonatale et infantile";
  if (code === "NUT") return lang === "en" ? "Nutrition" : "Nutrition";
  if (code === "MAL") return lang === "en" ? "Malaria" : "Paludisme";
  return code;
}

function areaOrder(code: string) {
  if (code === "MCH") return 1;
  if (code === "NUT") return 2;
  if (code === "MAL") return 3;
  return 9;
}

function bleedBar(left: string, right?: (string | TextRun)[]) {
  const none = {
    style: BorderStyle.NONE as const,
    size: 0,
    color: "FFFFFF",
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [PAGE],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: PAGE, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: CHARCOAL },
            margins: { top: 80, bottom: 80, left: 140, right: 140 },
            borders: { top: none, bottom: none, left: none, right: none },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 0 },
                tabStops: [{ type: TabStopType.RIGHT, position: PAGE - LEFT }],
                children: [
                  run(left, { size: 17, color: "FFFFFF" }),
                  ...(right ?? []),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function bleedRule() {
  const none = {
    style: BorderStyle.NONE as const,
    size: 0,
    color: "FFFFFF",
  };
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [PAGE],
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        height: { value: 80, rule: HeightRule.EXACT },
        children: [
          new TableCell({
            width: { size: PAGE, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: ORANGE },
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            borders: { top: none, bottom: none, left: none, right: none },
            children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
          }),
        ],
      }),
    ],
  });
}

function chrome(left: string, right: string) {
  return {
    headers: {
      default: new Header({
        children: [
          bleedBar(left, [run(`\t${right}`, { size: 17, color: "FFFFFF" })]),
          bleedRule(),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          bleedBar("Internal working annex  ·  Official source data", [
            new TextRun({
              font: FONT,
              size: 16,
              color: "FFFFFF",
              children: ["\t", PageNumber.CURRENT, "  /  ", PageNumber.TOTAL_PAGES],
            }),
          ]),
        ],
      }),
    },
  };
}

function cover(data: Dataset, lang: "fr" | "en") {
  const period = data.period!;
  const title =
    lang === "en" ? "Source-Based Reporting Data" : "Données sources de performance";
  const kicker =
    lang === "en" ? "SEMI-ANNUAL PERFORMANCE ANNEX" : "ANNEXE DE PERFORMANCE SEMESTRIELLE";
  const contents = lang === "en"
    ? [
        "01    Performance indicators — MNCH, nutrition, and malaria results from Annex B",
        "02    Global Health Security — DoS-supported outbreak, surveillance, and IPC results",
        "03    Field records — selected implementation stories from the reporting period",
      ]
    : [
        "01    Indicateurs de performance — résultats SMNI, nutrition et paludisme (Annexe B)",
        "02    Sécurité sanitaire mondiale — flambées, surveillance et PCI appuyées par le DoS",
        "03    Récits de terrain — histoires de mise en œuvre sélectionnées",
      ];

  const statW = [convertInchesToTwip(2.33), convertInchesToTwip(2.34), convertInchesToTwip(2.33)];
  const metaW = [convertInchesToTwip(2.15), convertInchesToTwip(4.85)];

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [PAGE],
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: PAGE, type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: CHARCOAL },
              margins: { top: 240, bottom: 240, left: 240, right: 240 },
              borders: {
                top: thin(CHARCOAL),
                bottom: thin(CHARCOAL),
                left: thin(CHARCOAL),
                right: thin(CHARCOAL),
              },
              children: [
                para("FHI 360", { bold: true, size: 24, color: "FFFFFF", after: 60 }),
                para("MEETING TARGETS AND MAINTAINING EPIDEMIC CONTROL", { size: 18, color: "FFFFFF", after: 80 }),
                para("Democratic Republic of the Congo", { bold: true, size: 26, color: "FFFFFF", after: 0 }),
              ],
            }),
          ],
        }),
      ],
    }),
    bleedRule(),
    para(kicker, { bold: true, size: 22, color: ORANGE, before: 200, after: 60 }),
    para(title, { bold: true, size: 52, color: NAVY, after: 80 }),
    para(`${period.fiscal_year}  ·  ${period.period_label}`, { size: 28, after: 40 }),
    para(`${period.start_date}  –  ${period.end_date}`, { size: 24, color: MUTED, after: 200 }),
    new Table({
      width: { size: USABLE, type: WidthType.DXA },
      columnWidths: statW,
      layout: TableLayoutType.FIXED,
      rows: [
        new TableRow({
          children: [
            [String(data.indicators.length), lang === "en" ? "Performance indicators" : "Indicateurs"],
            [String(data.ghs.length), lang === "en" ? "GHS results" : "Resultats GHS"],
            [String(data.stories.length), lang === "en" ? "Field records" : "Récits de terrain"],
          ].map(([n, label], i) =>
            new TableCell({
              width: { size: statW[i], type: WidthType.DXA },
              shading: { type: ShadingType.CLEAR, fill: ROW_ALT },
              margins: { top: 140, bottom: 140, left: 80, right: 80 },
              borders: cellBorders,
              children: [
                para(n, { bold: true, size: 40, color: NAVY, align: AlignmentType.CENTER, after: 20 }),
                para(label, { size: 18, color: MUTED, align: AlignmentType.CENTER, after: 0 }),
              ],
            }),
          ),
        }),
      ],
    }),
    para("", { after: 160 }),
    new Table({
      width: { size: USABLE, type: WidthType.DXA },
      columnWidths: metaW,
      layout: TableLayoutType.FIXED,
      rows: [
        [lang === "en" ? "Project" : "Projet", EPIC_PROJECT],
        [lang === "en" ? "Agreement" : "Accord", EPIC_AGREEMENT],
        [lang === "en" ? "Dataset" : "Jeu de donnees", period.dataset_label],
        [lang === "en" ? "Period" : "Periode", `${period.start_date} – ${period.end_date}`],
        [lang === "en" ? "Document type" : "Type", lang === "en" ? "Working annex for indicator, GHS, and field-record extraction" : "Annexe de travail — indicateurs, GHS et recits"],
      ].map(([k, v], i) =>
        new TableRow({
          cantSplit: true,
          children: [
            cell(k, metaW[0], { fill: i % 2 === 0 ? NAVY : STEEL, bold: true, color: "FFFFFF", size: 18 }),
            cell(v, metaW[1], { fill: "F7F9FB", size: 19 }),
          ],
        }),
      ),
    }),
    para(lang === "en" ? "Contents" : "Sommaire", { bold: true, size: 26, color: NAVY, before: 240, after: 80, border: true }),
    ...contents.map((line) => para(line, { size: 22, after: 80 })),
    para(
      lang === "en"
        ? "Figures are transcribed from the official source report. Percentages are reported values. A blank comment means the source did not include a narrative note."
        : "Les chiffres sont transcrits du rapport source officiel. Les pourcentages sont les valeurs rapportees. Un commentaire vide signifie que la source n'incluait pas de note.",
      { italics: true, size: 19, color: MUTED, before: 120, after: 0 },
    ),
  ];
}

function indicatorTable(data: Dataset, lang: "fr" | "en") {
  const widths = [1.45, 2.45, 1.05, 1.15, 0.9].map(convertInchesToTwip);
  const grouped = new Map<string, Dataset["indicators"]>();
  for (const row of data.indicators) {
    const key = row.technical_area_code || "OTHER";
    const list = grouped.get(key) || [];
    list.push(row);
    grouped.set(key, list);
  }

  const rows: TableRow[] = [
    headerRow(
      lang === "en"
        ? ["Code", "Indicator", "Numerator", "Denominator", "%"]
        : ["Code", "Indicateur", "Numerateur", "Denominateur", "%"],
      widths,
    ),
  ];

  let alt = false;
  for (const area of [...grouped.keys()].sort((a, b) => areaOrder(a) - areaOrder(b))) {
    rows.push(bandRow(areaLabel(area, lang), widths));
    for (const r of grouped.get(area) || []) {
      const pct = r.reported_percent ?? r.computed_percent;
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            cell(r.indicator_code, widths[0], { bold: true, size: 17, fill: alt ? ROW_ALT : "FFFFFF" }),
            cell(r.name, widths[1], { fill: alt ? ROW_ALT : "FFFFFF" }),
            cell(formatCount(r.numerator, lang), widths[2], {
              align: AlignmentType.RIGHT,
              fill: alt ? ROW_ALT : "FFFFFF",
            }),
            cell(formatCount(r.denominator, lang), widths[3], {
              align: AlignmentType.RIGHT,
              fill: alt ? ROW_ALT : "FFFFFF",
            }),
            cell(formatPct(pct), widths[4], {
              bold: true,
              align: AlignmentType.CENTER,
              color: pctColor(pct),
              fill: alt ? ROW_ALT : "FFFFFF",
            }),
          ],
        }),
      );
      const note = r.comment || r.notes;
      if (note?.trim()) rows.push(noteRow(note, widths));
      alt = !alt;
    }
  }

  return new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows,
  });
}

function ghsTable(data: Dataset, lang: "fr" | "en") {
  const widths = [2.2, 2.2, 0.85, 0.85, 0.9].map(convertInchesToTwip);
  const rows: TableRow[] = [
    headerRow(
      lang === "en"
        ? ["Code", "Indicator", "Total", "Male", "Female"]
        : ["Code", "Indicateur", "Total", "Hommes", "Femmes"],
      widths,
    ),
  ];

  data.ghs.forEach((g, i) => {
    const fill = i % 2 ? ROW_ALT : "FFFFFF";
    const total =
      g.total_value == null
        ? g.planned_later
          ? lang === "en"
            ? "Later"
            : "À venir"
          : "—"
        : formatCount(g.total_value, lang);
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          cell(g.ghs_indicator_code, widths[0], { bold: true, size: 17, fill }),
          cell(g.name, widths[1], { fill }),
          cell(total, widths[2], { align: AlignmentType.CENTER, fill }),
          cell(formatCount(g.male_count, lang), widths[3], { align: AlignmentType.CENTER, fill }),
          cell(formatCount(g.female_count, lang), widths[4], { align: AlignmentType.CENTER, fill }),
        ],
      }),
    );
    if (g.notes?.trim()) rows.push(noteRow(g.notes, widths));
  });

  return new Table({
    width: { size: USABLE, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows,
  });
}

function storyCards(data: Dataset) {
  const bar = convertInchesToTwip(0.11);
  const body = USABLE - bar;
  return data.stories.flatMap((s, i) => {
    const location = [s.province_name, s.health_zone_name, s.location_name, s.timeframe_label]
      .filter(Boolean)
      .join("  ·  ");
    return [
      i ? para("", { after: 80 }) : para("", { after: 0 }),
      new Table({
        width: { size: USABLE, type: WidthType.DXA },
        columnWidths: [bar, body],
        layout: TableLayoutType.FIXED,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: bar, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: ORANGE },
                borders: {
                  top: thin(ORANGE),
                  bottom: thin(ORANGE),
                  left: thin(ORANGE),
                  right: thin(ORANGE),
                },
                children: [new Paragraph({})],
              }),
              new TableCell({
                width: { size: body, type: WidthType.DXA },
                shading: { type: ShadingType.CLEAR, fill: "F7F9FB" },
                margins: { top: 120, bottom: 120, left: 140, right: 140 },
                borders: cellBorders,
                children: [
                  para(s.title, { bold: true, size: 25, color: NAVY, after: 40 }),
                  ...(location ? [para(location, { italics: true, size: 18, color: MUTED, after: 80 })] : []),
                  ...s.body.split(/\n+/).filter(Boolean).map((line) => para(line, { size: 21, after: 80 })),
                ],
              }),
            ],
          }),
        ],
      }),
    ];
  });
}

const page = {
  size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
  margin: {
    top: convertInchesToTwip(0.95),
    bottom: convertInchesToTwip(0.75),
    left: convertInchesToTwip(0.75),
    right: convertInchesToTwip(0.75),
    header: convertInchesToTwip(0.38),
    footer: convertInchesToTwip(0.32),
  },
};

export async function exportProgramSourceDocx(data: Dataset, lang: "fr" | "en") {
  data = localizeEpicSource(data, lang);
  const period = data.period;
  if (!period) return;

  const titleEn = "Performance indicators";
  const titleFr = "Indicateurs de performance";
  const ghsTitle = lang === "en" ? "Global Health Security" : "Securite sanitaire mondiale";
  const storiesTitle = lang === "en" ? "Field records / success stories" : "Récits de terrain / histoires de succès";

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: INK },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.5), height: convertInchesToTwip(11) },
            margin: {
              top: convertInchesToTwip(0),
              bottom: convertInchesToTwip(0.65),
              left: convertInchesToTwip(0.75),
              right: convertInchesToTwip(0.75),
            },
          },
        },
        children: cover(data, lang),
      },
      {
        properties: { page },
        ...chrome(`EpiC DRC  ·  ${period.code} source annex`, EPIC_AGREEMENT),
        children: [
          para(lang === "en" ? "SECTION 01" : "SECTION 01", { bold: true, size: 18, color: ORANGE, after: 40 }),
          para(lang === "en" ? titleEn : titleFr, {
            heading: HeadingLevel.HEADING_2,
            bold: true,
            size: 32,
            color: NAVY,
            after: 80,
            border: true,
          }),
          para(
            lang === "en"
              ? "Annex B results for the reporting period. Values are national aggregates as reported in the official source."
              : "Résultats de l’annexe B pour la période. Valeurs nationales telles que rapportées dans la source officielle.",
            { size: 20, color: MUTED, after: 160 },
          ),
          indicatorTable(data, lang),
          new Paragraph({ children: [new PageBreak()] }),
          para(lang === "en" ? "SECTION 02" : "SECTION 02", { bold: true, size: 18, color: ORANGE, after: 40 }),
          para(ghsTitle, {
            heading: HeadingLevel.HEADING_2,
            bold: true,
            size: 32,
            color: NAVY,
            after: 80,
            border: true,
          }),
          para(
            lang === "en"
              ? "DoS-supported GHS results. A planned-later note means the activity is scheduled for the next half-year, not that implementation failed."
              : "Résultats GHS appuyés par le DoS. Une note de planification signifie que l’activité est prévue pour le semestre suivant.",
            { size: 20, color: MUTED, after: 160 },
          ),
          ghsTable(data, lang),
          new Paragraph({ children: [new PageBreak()] }),
          para(lang === "en" ? "SECTION 03" : "SECTION 03", { bold: true, size: 18, color: ORANGE, after: 40 }),
          para(storiesTitle, {
            heading: HeadingLevel.HEADING_2,
            bold: true,
            size: 32,
            color: NAVY,
            after: 80,
            border: true,
          }),
          para(
            lang === "en"
              ? "Selected implementation stories transcribed from the official source report. These are narrative case records, not independently verified outcome evaluations."
              : "Récits de mise en œuvre transcrits du rapport source. Il s’agit de cas narratifs, et non d’évaluations indépendantes.",
            { size: 20, color: MUTED, after: 160 },
          ),
          ...storyCards(data),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `epic-source-${period.code}.docx`);
}
