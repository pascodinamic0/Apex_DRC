import type { HelpSection } from "@/content/help.fr";
import { EPIC_AGREEMENT, EPIC_PROJECT } from "./epic-official";

const NAVY: [number, number, number] = [15, 76, 129];
const ORANGE: [number, number, number] = [241, 90, 41];
const INK: [number, number, number] = [36, 36, 36];

type JsPdf = import("jspdf").jsPDF;

function pdfSafe(s: string) {
  return (s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, " ");
}

function addWrapped(doc: JsPdf, text: string, x: number, y: number, maxW: number, lineH: number) {
  const pageH = doc.internal.pageSize.getHeight();
  const lines = doc.splitTextToSize(pdfSafe(text), maxW) as string[];
  for (const line of lines) {
    if (y > pageH - 18) {
      doc.addPage("a4", "portrait");
      y = 22;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

function drawCover(doc: JsPdf, title: string, dateLine: string, contentsLabel: string, sections: HelpSection[]) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 38, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 38, w, 2.2, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("FHI 360", 16, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("EPIC RDC", 16, 23);
  doc.setFontSize(8);
  doc.text(pdfSafe(EPIC_PROJECT), 16, 31);

  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  let y = addWrapped(doc, title, 16, 62, 178, 10);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(16, y + 1, 70, y + 1);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y = addWrapped(doc, pdfSafe(EPIC_PROJECT), 16, y + 10, 178, 6);
  doc.setFontSize(10);
  y = addWrapped(doc, `Cooperative agreement no. ${EPIC_AGREEMENT}`, 16, y + 2, 178, 5);
  y = addWrapped(doc, dateLine, 16, y + 6, 178, 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...NAVY);
  y = addWrapped(doc, contentsLabel, 16, y + 14, 178, 6);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(16, y, 48, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  sections.forEach((section, index) => {
    doc.setTextColor(...NAVY);
    y = addWrapped(doc, `${index + 1}.  ${section.title}`, 16, y, 178, 7);
  });

  doc.setFillColor(...NAVY);
  doc.rect(0, h - 14, w, 14, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, h - 16, w, 2, "F");
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.text("FHI 360  ·  EPIC RDC", 16, h - 6);
  doc.setTextColor(0);
}

function applyChrome(doc: JsPdf, dateLine: string) {
  const n = doc.getNumberOfPages();
  for (let i = 2; i <= n; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, w, 10, "F");
    doc.setFillColor(...ORANGE);
    doc.rect(0, 10, w, 1.4, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(pdfSafe(EPIC_PROJECT), 10, 6.4);
    doc.text(EPIC_AGREEMENT, w - 10, 6.4, { align: "right" });
    doc.setFillColor(...NAVY);
    doc.rect(0, h - 10, w, 10, "F");
    doc.setTextColor(255);
    doc.text(pdfSafe(dateLine), 10, h - 4);
    doc.text(`${i} / ${n}`, w - 10, h - 4, { align: "right" });
    doc.setTextColor(0);
  }
}

function sectionTitle(doc: JsPdf, title: string, y: number) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 40) {
    doc.addPage("a4", "portrait");
    y = 22;
  }
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  y = addWrapped(doc, title, 16, y, 178, 6);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(16, y, 72, y);
  return y + 6;
}

export async function downloadHelpGuidePdf(sections: HelpSection[], lang: "fr" | "en", title: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const generated = lang === "fr" ? "Généré le" : "Generated on";
  const contentsLabel = lang === "fr" ? "Table des matières" : "Contents";
  const dateLine = `${generated} ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`;

  drawCover(doc, title, dateLine, contentsLabel, sections);
  doc.addPage("a4", "portrait");
  let y = 22;

  sections.forEach((section, index) => {
    y = sectionTitle(doc, `${index + 1}.  ${section.title}`, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...INK);
    for (const paragraph of section.body) {
      const contact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paragraph) || /^\+\d[\d\s()-]{7,}$/.test(paragraph);
      if (contact) {
        doc.setTextColor(...NAVY);
        doc.setFont("helvetica", "bold");
      }
      y = addWrapped(doc, paragraph, 16, y, 178, 5.2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...INK);
      y += 2.4;
    }
    y += 4;
  });

  applyChrome(doc, dateLine);
  doc.save(`epic-rdc-guide-${lang}.pdf`);
}
