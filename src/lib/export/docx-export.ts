import type { AggregatedActivity, ConsolidatedSection } from "./consolidated-report";
import { downloadBlob } from "./consolidated-report";

export async function exportConsolidatedDocx(opts: {
  title: string;
  periodLine: string;
  generatedLine: string;
  tableHead: string[];
  aggregated: AggregatedActivity[];
  sections: ConsolidatedSection[];
  filename: string;
}) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } = await import("docx");

  const tableRows = [
    new TableRow({
      children: opts.tableHead.map((h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })),
    }),
    ...opts.aggregated.map((a) =>
      new TableRow({
        children: [
          a.code,
          String(a.planned),
          String(a.achieved),
          a.planned ? `${Math.round((a.achieved / a.planned) * 100)}%` : "—",
        ].map((v) => new TableCell({ children: [new Paragraph(v)] })),
      }),
    ),
  ];

  const sectionParas = opts.sections.flatMap((s) => [
    new Paragraph({ text: s.label, heading: HeadingLevel.HEADING_2 }),
    ...s.blocks.flatMap((b) => [
      new Paragraph({
        children: [new TextRun({ text: `[${b.provinceName}] `, bold: true }), new TextRun(b.content)],
      }),
    ]),
    new Paragraph(""),
  ]);

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: opts.title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph(opts.periodLine),
        new Paragraph(opts.generatedLine),
        new Paragraph(""),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
        new Paragraph(""),
        ...sectionParas,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, opts.filename);
}

export async function exportSingleReportDocx(opts: {
  title: string;
  periodLine: string;
  tableHead: string[];
  rows: { code: string; planned: number; achieved: number }[];
  sections: { label: string; content: string }[];
  filename: string;
}) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } = await import("docx");

  const tableRows = [
    new TableRow({
      children: opts.tableHead.map((h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })),
    }),
    ...opts.rows.map((a) =>
      new TableRow({
        children: [
          a.code,
          String(a.planned),
          String(a.achieved),
          a.planned ? `${Math.round((a.achieved / a.planned) * 100)}%` : "—",
        ].map((v) => new TableCell({ children: [new Paragraph(v)] })),
      }),
    ),
  ];

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: opts.title, heading: HeadingLevel.HEADING_1 }),
        new Paragraph(opts.periodLine),
        new Paragraph(""),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
        new Paragraph(""),
        ...opts.sections.flatMap((s) => [
          new Paragraph({ text: s.label, heading: HeadingLevel.HEADING_2 }),
          new Paragraph(s.content || "—"),
          new Paragraph(""),
        ]),
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  downloadBlob(blob, opts.filename);
}
