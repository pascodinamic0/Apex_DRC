import { EPIC_AGREEMENT, EPIC_PROJECT } from "./epic-official";
import { downloadBlob } from "./consolidated-report";
import type { loadProgramDataset } from "@/lib/epic-source/queries";

type Dataset = Awaited<ReturnType<typeof loadProgramDataset>>;

function pdfSafe(s: string) {
  return (s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, " ");
}

export async function exportProgramSourcePdf(data: Dataset, lang: "fr" | "en") {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const period = data.period;
  if (!period) return;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const title = lang === "en" ? "Semi-annual performance annex (source data)" : "Annexe de performance semestrielle (donnees sources)";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(pdfSafe(title), 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfSafe(`${period.dataset_label} — ${period.start_date} / ${period.end_date}`), 14, 21);
  doc.text(pdfSafe(`${EPIC_PROJECT} — ${EPIC_AGREEMENT}`), 14, 26);

  autoTable(doc, {
    startY: 32,
    head: [[
      "Code",
      lang === "en" ? "Indicator" : "Indicateur",
      "N",
      "D",
      "%",
      lang === "en" ? "Comment" : "Commentaire",
    ]],
    body: data.indicators.map((r) => [
      pdfSafe(r.indicator_code),
      pdfSafe(r.name),
      r.numerator == null ? "—" : String(r.numerator),
      r.denominator == null ? "—" : String(r.denominator),
      r.reported_percent == null ? "—" : `${r.reported_percent}%`,
      pdfSafe(r.comment || r.notes || ""),
    ]),
    styles: { fontSize: 7, cellPadding: 1.2, valign: "top" },
    headStyles: { fillColor: [15, 76, 129], textColor: 255 },
    margin: { left: 10, right: 10 },
  });

  doc.addPage("a4", "landscape");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("GHS", 14, 14);
  autoTable(doc, {
    startY: 18,
    head: [[
      "Code",
      lang === "en" ? "Indicator" : "Indicateur",
      lang === "en" ? "Total" : "Total",
      lang === "en" ? "Male" : "Hommes",
      lang === "en" ? "Female" : "Femmes",
      lang === "en" ? "Notes" : "Notes",
    ]],
    body: data.ghs.map((g) => [
      pdfSafe(g.ghs_indicator_code),
      pdfSafe(g.name),
      g.total_value == null ? (g.planned_later ? (lang === "en" ? "Later" : "A venir") : "—") : String(g.total_value),
      g.male_count == null ? "—" : String(g.male_count),
      g.female_count == null ? "—" : String(g.female_count),
      pdfSafe(g.notes || ""),
    ]),
    styles: { fontSize: 7, cellPadding: 1.2 },
    headStyles: { fillColor: [15, 76, 129], textColor: 255 },
    margin: { left: 10, right: 10 },
  });

  doc.addPage("a4", "portrait");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pdfSafe(lang === "en" ? "Field records / success stories" : "Recits de terrain / histoires de succes"), 14, 18);
  let y = 26;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const s of data.stories) {
    if (y > 250) {
      doc.addPage("a4", "portrait");
      y = 18;
    }
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(pdfSafe(s.title), 182) as string[];
    doc.text(titleLines, 14, y);
    y += titleLines.length * 5 + 2;
    doc.setFont("helvetica", "normal");
    const body = doc.splitTextToSize(pdfSafe(s.body), 182) as string[];
    for (const line of body) {
      if (y > 280) {
        doc.addPage("a4", "portrait");
        y = 18;
      }
      doc.text(line, 14, y);
      y += 4.4;
    }
    y += 6;
  }

  downloadBlob(doc.output("blob"), `epic-source-${period.code}.pdf`);
}

export async function exportProgramSourceDocx(data: Dataset, lang: "fr" | "en") {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } = await import("docx");
  const period = data.period;
  if (!period) return;
  const cell = (text: string, bold = false) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text: text || "—", bold, size: 16 })] })],
    });
  const indHead = ["Code", lang === "en" ? "Indicator" : "Indicateur", "N", "D", "%", lang === "en" ? "Comment" : "Commentaire"];
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: lang === "en" ? "Semi-annual performance annex (source data)" : "Annexe de performance semestrielle (données sources)", heading: HeadingLevel.HEADING_1 }),
        new Paragraph(period.dataset_label),
        new Paragraph(`${period.start_date} → ${period.end_date}`),
        new Paragraph(`${EPIC_PROJECT} — ${EPIC_AGREEMENT}`),
        new Paragraph(""),
        new Paragraph({ text: lang === "en" ? "Annex B — Indicators" : "Annexe B — Indicateurs", heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: indHead.map((h) => cell(h, true)) }),
            ...data.indicators.map((r) =>
              new TableRow({
                children: [
                  r.indicator_code,
                  r.name,
                  r.numerator == null ? "—" : String(r.numerator),
                  r.denominator == null ? "—" : String(r.denominator),
                  r.reported_percent == null ? "—" : `${r.reported_percent}%`,
                  r.comment || r.notes || "",
                ].map((v) => cell(v)),
              }),
            ),
          ],
        }),
        new Paragraph(""),
        new Paragraph({ text: "GHS", heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["Code", lang === "en" ? "Indicator" : "Indicateur", "Total", lang === "en" ? "Male" : "H", lang === "en" ? "Female" : "F", "Notes"].map((h) => cell(h, true)),
            }),
            ...data.ghs.map((g) =>
              new TableRow({
                children: [
                  g.ghs_indicator_code,
                  g.name,
                  g.total_value == null ? "—" : String(g.total_value),
                  g.male_count == null ? "—" : String(g.male_count),
                  g.female_count == null ? "—" : String(g.female_count),
                  g.notes || "",
                ].map((v) => cell(v)),
              }),
            ),
          ],
        }),
        new Paragraph(""),
        new Paragraph({ text: lang === "en" ? "Field records" : "Récits de terrain", heading: HeadingLevel.HEADING_2 }),
        ...data.stories.flatMap((s) => [
          new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_3 }),
          new Paragraph(s.body),
          new Paragraph(""),
        ]),
      ],
    }],
  });
  downloadBlob(await Packer.toBlob(doc), `epic-source-${period.code}.docx`);
}
