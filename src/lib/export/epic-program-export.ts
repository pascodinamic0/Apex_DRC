import {
  Document,
  Footer,
  Header,
  HeadingLevel,
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
import { EPIC_AGREEMENT, EPIC_PROJECT } from "./epic-official";
import { downloadBlob } from "./consolidated-report";
import type { loadProgramDataset } from "@/lib/epic-source/queries";

type Dataset = Awaited<ReturnType<typeof loadProgramDataset>>;

const NAVY = "0F4C81";

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: NAVY },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      }),
    ],
  });
}

function dataCell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
  });
}

function sectionHeading(title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: title, bold: true, color: NAVY, size: 24 })],
  });
}

export async function exportProgramSourceDocx(data: Dataset, lang: "fr" | "en") {
  const period = data.period;
  if (!period) return;

  const title =
    lang === "en"
      ? "Semi-annual performance annex (source data)"
      : "Annexe de performance semestrielle (donnees sources)";
  const storiesTitle =
    lang === "en" ? "Field records / success stories" : "Recits de terrain / histoires de succes";

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 16838, height: 11906, orientation: "landscape" },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: `${EPIC_PROJECT} — ${EPIC_AGREEMENT}`, size: 16 })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 28 })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `${period.dataset_label} — ${period.start_date} / ${period.end_date}`,
                size: 20,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell("Code"),
                  headerCell(lang === "en" ? "Indicator" : "Indicateur"),
                  headerCell("N"),
                  headerCell("D"),
                  headerCell("%"),
                  headerCell(lang === "en" ? "Comment" : "Commentaire"),
                ],
              }),
              ...data.indicators.map(
                (r) =>
                  new TableRow({
                    children: [
                      dataCell(r.indicator_code),
                      dataCell(r.name),
                      dataCell(r.numerator == null ? "—" : String(r.numerator)),
                      dataCell(r.denominator == null ? "—" : String(r.denominator)),
                      dataCell(r.reported_percent == null ? "—" : `${r.reported_percent}%`),
                      dataCell(r.comment || r.notes || ""),
                    ],
                  }),
              ),
            ],
          }),
          new Paragraph({ children: [new PageBreak()] }),
          sectionHeading("GHS"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  headerCell("Code"),
                  headerCell(lang === "en" ? "Indicator" : "Indicateur"),
                  headerCell(lang === "en" ? "Total" : "Total"),
                  headerCell(lang === "en" ? "Male" : "Hommes"),
                  headerCell(lang === "en" ? "Female" : "Femmes"),
                  headerCell(lang === "en" ? "Notes" : "Notes"),
                ],
              }),
              ...data.ghs.map(
                (g) =>
                  new TableRow({
                    children: [
                      dataCell(g.ghs_indicator_code),
                      dataCell(g.name),
                      dataCell(
                        g.total_value == null
                          ? g.planned_later
                            ? lang === "en"
                              ? "Later"
                              : "A venir"
                            : "—"
                          : String(g.total_value),
                      ),
                      dataCell(g.male_count == null ? "—" : String(g.male_count)),
                      dataCell(g.female_count == null ? "—" : String(g.female_count)),
                      dataCell(g.notes || ""),
                    ],
                  }),
              ),
            ],
          }),
        ],
      },
      {
        properties: {
          page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } },
        },
        children: [
          sectionHeading(storiesTitle),
          ...data.stories.flatMap((s) => [
            new Paragraph({
              spacing: { before: 200, after: 80 },
              children: [new TextRun({ text: s.title, bold: true, size: 22 })],
            }),
            ...s.body.split(/\n+/).map(
              (line) =>
                new Paragraph({
                  spacing: { after: 80 },
                  children: [new TextRun({ text: line, size: 20 })],
                }),
            ),
          ]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, `epic-source-${period.code}.docx`);
}
