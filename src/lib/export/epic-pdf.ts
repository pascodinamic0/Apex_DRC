import type { OfficialLabels, OfficialReportPayload } from "./epic-official";
import { calcAchievementRate } from "@/lib/activity-catalog";
import { EPIC_AGREEMENT, EPIC_PROJECT, officialLabels } from "./epic-official";
import { downloadBlob } from "./consolidated-report";

function pdfSafe(s: string) {
  return (s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, " ");
}

function addWrapped(doc: import("jspdf").jsPDF, text: string, x: number, y: number, maxW: number, lineH = 5) {
  const lines = doc.splitTextToSize(pdfSafe(text || "—"), maxW) as string[];
  for (const line of lines) {
    if (y > 280) {
      doc.addPage("a4", "portrait");
      y = 18;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

function sectionTitle(doc: import("jspdf").jsPDF, title: string, y: number) {
  if (y > 250) {
    doc.addPage("a4", "portrait");
    y = 18;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  y = addWrapped(doc, title, 14, y, 182, 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  return y + 2;
}

function bodyBlock(doc: import("jspdf").jsPDF, title: string, body: string, y: number) {
  y = sectionTitle(doc, title, y);
  y = addWrapped(doc, body.trim() ? body : "—", 14, y, 182, 4.4);
  return y + 6;
}

export async function exportOfficialPdf(payload: OfficialReportPayload, lang: "fr" | "en", filename: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const L = officialLabels(lang);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const title = payload.kind === "national" ? L.nationalTitle : L.monthlyTitle;
  const rate = calcAchievementRate(payload.achievement);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(pdfSafe(L.domains), 14, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(pdfSafe(payload.domains), 14, 24);

  doc.setFont("helvetica", "bold");
  doc.text(pdfSafe(L.submittedBy), 14, 34);
  doc.setFont("helvetica", "normal");
  doc.text(pdfSafe(payload.submittedBy || "—"), 14, 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  let y = addWrapped(doc, payload.provinceName, 14, 54, 182, 8);
  doc.setFontSize(14);
  y = addWrapped(doc, title, 14, y + 4, 182, 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  y = addWrapped(doc, `${L.monthOf} ${payload.monthLabel} ${payload.year}`, 14, y + 4, 182, 6);

  doc.setFontSize(10);
  y = addWrapped(doc, EPIC_PROJECT, 14, y + 10, 182, 5);
  y = addWrapped(doc, `${L.agreement} ${EPIC_AGREEMENT}`, 14, y + 2, 182, 5);
  y = addWrapped(doc, `${L.generatedOn} ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`, 14, y + 4, 182, 5);
  y = addWrapped(doc, L.sourceNote, 14, y + 6, 182, 4.2);

  doc.addPage("a4", "portrait");
  y = 18;
  y = sectionTitle(doc, L.execSummary, y);
  y = bodyBlock(doc, L.smni, payload.execSmni, y);
  y = bodyBlock(doc, L.nutrition, payload.execNutrition, y);
  y = bodyBlock(doc, L.malaria, payload.execMalaria, y);

  y = sectionTitle(doc, `${L.realizationRate} : ${rate}%`, y);
  autoTable(doc, {
    startY: y,
    head: [[pdfSafe(L.tableI)]],
    body: [],
    theme: "plain",
    styles: { fontSize: 10, fontStyle: "bold" },
    margin: { left: 14, right: 14 },
  });
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2,
    head: [[pdfSafe(L.rubrique), pdfSafe(L.count), pdfSafe(L.percent)]],
    body: payload.achievementRows.map((r) => [pdfSafe(r.label), String(r.count), r.pct]),
    styles: { fontSize: 8, cellPadding: 1.6 },
    headStyles: { fillColor: [15, 76, 129], textColor: 255 },
    margin: { left: 14, right: 14 },
  });

  if (payload.provinceRates?.length) {
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8,
      head: [[pdfSafe(L.province), pdfSafe(L.count), pdfSafe(L.achApproved), "%"]],
      body: payload.provinceRates.map((r) => [pdfSafe(r.name), String(r.total), String(r.approved), `${r.rate}%`]),
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: [15, 76, 129], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.addPage("a4", "landscape");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(pdfSafe(L.keyResults), 14, 14);
  autoTable(doc, {
    startY: 18,
    head: [[
      pdfSafe(L.activityCode),
      pdfSafe(L.realized),
      pdfSafe(L.progress),
      pdfSafe(L.challenges),
      pdfSafe(L.solutions),
      pdfSafe(L.priorities),
      pdfSafe(L.partners),
    ]],
    body: payload.activities.length
      ? payload.activities.map((a) => [
          pdfSafe(`${a.code}\n${a.title}`),
          pdfSafe(a.realized || "—"),
          pdfSafe(a.progress || "—"),
          pdfSafe(a.challenges || "—"),
          pdfSafe(a.solutions || "—"),
          pdfSafe(a.priorities || "—"),
          pdfSafe(a.partners || "—"),
        ])
      : [[pdfSafe(lang === "en" ? "No completed activity rows in source reports for this period." : "Aucune ligne d'activite renseignee pour cette periode."), "", "", "", "", "", ""]],
    styles: { fontSize: 6.5, cellPadding: 1.2, valign: "top", overflow: "linebreak" },
    headStyles: { fillColor: [15, 76, 129], textColor: 255, fontSize: 7, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 38 },
      2: { cellWidth: 38 },
      3: { cellWidth: 36 },
      4: { cellWidth: 36 },
      5: { cellWidth: 36 },
      6: { cellWidth: 36 },
    },
    margin: { left: 10, right: 10 },
  });

  doc.addPage("a4", "portrait");
  y = 18;
  y = bodyBlock(doc, L.coordination, payload.coordination, y);
  y = bodyBlock(doc, L.stories, payload.stories, y);
  y = bodyBlock(doc, L.challengesSection, payload.challenges, y);
  y = bodyBlock(doc, L.nextMonth, payload.priorities, y);

  if (payload.annexRows?.length) {
    y = sectionTitle(doc, L.annexA, y);
    autoTable(doc, {
      startY: y,
      head: [["Code", lang === "en" ? "Indicator" : "Indicateur", "N", "D", "%", lang === "en" ? "Comment" : "Commentaire"]],
      body: payload.annexRows.map((r) => [pdfSafe(r.code), pdfSafe(r.name), r.numerator, r.denominator, r.value, pdfSafe(r.comment)]),
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: [15, 76, 129], textColor: 255 },
      margin: { left: 14, right: 14 },
    });
  }

  const blob = doc.output("blob");
  downloadBlob(blob, filename);
}

export type { OfficialLabels };
