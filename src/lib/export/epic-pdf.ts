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

const NAVY: [number, number, number] = [15, 76, 129];
const ORANGE: [number, number, number] = [241, 90, 41];

function pdfSafe(s: string) {
  return (s || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x00-\xFF]/g, " ");
}

type JsPdf = import("jspdf").jsPDF;
type AutoTable = typeof import("jspdf-autotable").default;

function lastY(doc: JsPdf, fallback: number) {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

function addWrapped(doc: JsPdf, text: string, x: number, y: number, maxW: number, lineH = 5) {
  const lines = doc.splitTextToSize(pdfSafe(text || "—"), maxW) as string[];
  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 18) {
      doc.addPage("a4", "portrait");
      y = 22;
    }
    doc.text(line, x, y);
    y += lineH;
  }
  return y;
}

function sectionTitle(doc: JsPdf, title: string, y: number) {
  if (y > 250) {
    doc.addPage("a4", "portrait");
    y = 22;
  }
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  y = addWrapped(doc, title, 14, y, 182, 6);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.line(14, y, 80, y);
  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  return y + 5;
}

function bodyBlock(doc: JsPdf, title: string, body: string, y: number) {
  y = sectionTitle(doc, title, y);
  y = addWrapped(doc, body.trim() ? body : "—", 14, y, 182, 4.4);
  return y + 6;
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

function activityTableBody(payload: OfficialReportPayload, lang: "fr" | "en", L: ReturnType<typeof officialLabels>) {
  type Cell = string | { content: string; colSpan: number; styles: Record<string, unknown> };
  const band = (text: string, fill: [number, number, number]): Cell[] => [
    {
      content: pdfSafe(text),
      colSpan: 7,
      styles: { fillColor: fill, textColor: 255, fontStyle: "bold", fontSize: 8 },
    },
  ];
  const emptyMsg =
    lang === "en"
      ? "No completed activity rows in source reports for this period."
      : "Aucune ligne d'activite renseignee pour cette periode.";
  if (!payload.activities.length) {
    return [[pdfSafe(emptyMsg), "", "", "", "", "", ""]];
  }

  const byObj = new Map<number, ActivityExportRow[]>();
  for (const a of payload.activities) {
    const obj = objectiveOf(a.code);
    const list = byObj.get(obj) || [];
    list.push(a);
    byObj.set(obj, list);
  }

  const rows: Cell[][] = [];
  for (const obj of [...byObj.keys()].sort((a, b) => a - b)) {
    const titles = OBJECTIVE_TITLES[obj];
    const objLabel = titles ? (lang === "en" ? titles.en : titles.fr) : "";
    rows.push(band(`${L.objective} ${obj}. ${objLabel}`, NAVY));
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
      rows.push(band(group.title, [36, 99, 148]));
      for (const a of groupRows) {
        used.add(a.code);
        rows.push([
          pdfSafe(`${a.code}\n${a.title}`),
          pdfSafe(a.realized || "—"),
          pdfSafe(a.progress || "—"),
          pdfSafe(a.challenges || "—"),
          pdfSafe(a.solutions || "—"),
          pdfSafe(a.priorities || "—"),
          pdfSafe(a.partners || "—"),
        ]);
      }
    }
    for (const a of items.filter((row) => !used.has(row.code))) {
      rows.push([
        pdfSafe(`${a.code}\n${a.title}`),
        pdfSafe(a.realized || "—"),
        pdfSafe(a.progress || "—"),
        pdfSafe(a.challenges || "—"),
        pdfSafe(a.solutions || "—"),
        pdfSafe(a.priorities || "—"),
        pdfSafe(a.partners || "—"),
      ]);
    }
  }
  return rows;
}

function drawCover(doc: JsPdf, payload: OfficialReportPayload, L: ReturnType<typeof officialLabels>, dateLine: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const title = payload.kind === "national" ? L.nationalTitle : L.monthlyTitle;

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
  doc.setFontSize(9);
  doc.text(pdfSafe(L.domains), 16, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(pdfSafe(payload.domains), 16, 59);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(pdfSafe(L.submittedBy), 16, 72);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(pdfSafe(payload.submittedBy || "—"), 16, 79);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  let y = addWrapped(doc, `[${payload.provinceName}]`, 16, 118, 178, 10);
  doc.setFontSize(16);
  y = addWrapped(doc, title, 16, y + 6, 178, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  y = addWrapped(doc, `${L.monthOf} ${payload.monthLabel} ${payload.year}`, 16, y + 6, 178, 7);

  doc.setFontSize(10);
  y = addWrapped(doc, EPIC_PROJECT, 16, y + 16, 178, 5);
  y = addWrapped(doc, `${L.agreement} ${EPIC_AGREEMENT}`, 16, y + 3, 178, 5);
  y = addWrapped(doc, dateLine, 16, y + 8, 178, 5);
  addWrapped(doc, L.sourceNote, 16, y + 8, 178, 4.2);

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
    doc.text(dateLine, 10, h - 4);
    doc.text(`${i} / ${n}`, w - 10, h - 4, { align: "right" });
    doc.setTextColor(0);
  }
}

export async function exportOfficialPdf(payload: OfficialReportPayload, lang: "fr" | "en", filename: string) {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default as AutoTable;
  const L = officialLabels(lang);
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const dateLine = `${L.generatedOn} ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`;
  const rate = calcAchievementRate(payload.achievement);
  const tableMargin = { left: 14, right: 14, top: 16, bottom: 14 };

  drawCover(doc, payload, L, dateLine);

  doc.addPage("a4", "portrait");
  let y = 22;
  y = sectionTitle(doc, L.toc, y);
  const toc = [
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
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const item of toc) {
    y = addWrapped(doc, item, 18, y, 174, 6);
  }

  doc.addPage("a4", "portrait");
  y = 22;
  y = sectionTitle(doc, L.acronyms, y);
  autoTable(doc, {
    startY: y,
    head: [[lang === "en" ? "Acronym" : "Sigle", lang === "en" ? "Definition" : "Definition"]],
    body: officialAcronyms(lang).map(([a, b]) => [pdfSafe(a), pdfSafe(b)]),
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    columnStyles: { 0: { cellWidth: 28, fontStyle: "bold" } },
    margin: tableMargin,
  });

  y = lastY(doc, y) + 10;
  y = sectionTitle(doc, L.execSummary, y);
  y = bodyBlock(doc, L.smni, payload.execSmni, y);
  y = bodyBlock(doc, L.nutrition, payload.execNutrition, y);
  y = bodyBlock(doc, L.malaria, payload.execMalaria, y);

  y = sectionTitle(doc, `${L.realizationRate} : ${rate}%`, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  y = addWrapped(doc, L.tableI, 14, y, 182, 5);
  autoTable(doc, {
    startY: y + 2,
    head: [[pdfSafe(L.rubrique), pdfSafe(L.count), pdfSafe(L.percent)]],
    body: payload.achievementRows.map((r) => [pdfSafe(r.label), String(r.count), r.pct]),
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
    margin: tableMargin,
  });

  if (payload.provinceRates?.length) {
    autoTable(doc, {
      startY: lastY(doc, y) + 8,
      head: [[pdfSafe(L.province), pdfSafe(L.count), pdfSafe(L.achApproved), "%"]],
      body: payload.provinceRates.map((r) => [pdfSafe(r.name), String(r.total), String(r.approved), `${r.rate}%`]),
      styles: { fontSize: 8, cellPadding: 1.6 },
      headStyles: { fillColor: NAVY, textColor: 255, fontStyle: "bold" },
      margin: tableMargin,
    });
  }

  doc.addPage("a4", "landscape");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.text(pdfSafe(L.keyResults), 14, 20);
  doc.setTextColor(0);
  autoTable(doc, {
    startY: 24,
    head: [[
      pdfSafe(L.activityCode),
      pdfSafe(L.realized),
      pdfSafe(L.progress),
      pdfSafe(L.challenges),
      pdfSafe(L.solutions),
      pdfSafe(L.priorities),
      pdfSafe(L.partners),
    ]],
    body: activityTableBody(payload, lang, L),
    styles: { fontSize: 6.5, cellPadding: 1.2, valign: "top", overflow: "linebreak" },
    headStyles: { fillColor: NAVY, textColor: 255, fontSize: 7, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 32 },
      1: { cellWidth: 38 },
      2: { cellWidth: 38 },
      3: { cellWidth: 36 },
      4: { cellWidth: 36 },
      5: { cellWidth: 36 },
      6: { cellWidth: 36 },
    },
    margin: { left: 10, right: 10, top: 16, bottom: 14 },
  });

  doc.addPage("a4", "portrait");
  y = 22;
  y = bodyBlock(doc, L.coordination, payload.coordination, y);
  y = bodyBlock(doc, L.stories, payload.stories, y);
  y = bodyBlock(doc, L.challengesSection, payload.challenges, y);
  y = bodyBlock(doc, L.nextMonth, payload.priorities, y);

  if (payload.aiNationalSummary?.trim()) {
    y = bodyBlock(doc, L.aiNationalSummary, payload.aiNationalSummary, y);
  }

  if (payload.annexRows?.length) {
    y = sectionTitle(doc, L.annexA, y);
    autoTable(doc, {
      startY: y,
      head: [["Code", lang === "en" ? "Indicator" : "Indicateur", "N", "D", "%", lang === "en" ? "Comment" : "Commentaire"]],
      body: payload.annexRows.map((r) => [pdfSafe(r.code), pdfSafe(r.name), r.numerator, r.denominator, r.value, pdfSafe(r.comment)]),
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: NAVY, textColor: 255 },
      margin: tableMargin,
    });
    y = lastY(doc, y) + 10;
  } else {
    y = bodyBlock(doc, L.annexA, lang === "en" ? "No annex indicators for this period." : "Aucun indicateur d'annexe pour cette periode.", y);
  }

  y = bodyBlock(
    doc,
    L.annexB,
    lang === "en"
      ? "Implementation photos are kept with provincial source files and are not generated automatically."
      : "Les photos de mise en oeuvre restent dans les dossiers provinciaux sources et ne sont pas generees automatiquement.",
    y,
  );

  applyChrome(doc, dateLine);
  downloadBlob(doc.output("blob"), filename);
}

export type { OfficialLabels } from "./epic-official";
