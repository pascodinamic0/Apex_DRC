#!/usr/bin/env python3
"""Build a professionally typeset EpiC FY2026 H1 source-data annex."""

from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Docs" / "epic-source-FY2026-H1.docx"

# Official FHI 360 brand: charcoal wordmark + orange arc (#FF4719).
CHARCOAL = RGBColor(0x1E, 0x1E, 0x1E)
CHARCOAL_HEX = "1E1E1E"
CHARCOAL_ALT_HEX = "2A2A2A"
ORANGE = RGBColor(0xFF, 0x47, 0x19)
ORANGE_HEX = "FF4719"
INK = RGBColor(0x1E, 0x1E, 0x1E)
MUTED = RGBColor(0x5B, 0x5B, 0x5B)
RULE = "E6E6E6"
ROW_ALT = "F7F7F7"
ROW_NOTE = "F3F3F3"
WHITE = "FFFFFF"
SOFT = "F7F7F7"
FONT = "Arial"

PAGE_IN = 8.5
LEFT_IN = 0.75
RIGHT_IN = 0.75
CONTENT_IN = PAGE_IN - LEFT_IN - RIGHT_IN

INDICATORS = [
    (
        "Maternal, Newborn and Child Health",
        [
            ("MCH_ANC1", "% first ANC visit (early)", 95931, 178798, 53.7,
             "The low performance is due to socioeconomic and educational constraints among women, as well as limited access caused by rural residence and geographic barriers."),
            ("MCH_FACBIR", "% facility-based deliveries", 148965, 178798, 83.3, ""),
            ("MCH_POSTNATAL", "% newborns receiving postnatal care", 135956, 151739, 89.6, ""),
            ("MCH_UTERO", "% women receiving uterotonics", 144804, 148965, 97.2,
             "Performance remained high due to strong facility delivery coverage and availability of uterotonics in supported facilities."),
            ("MCH_DIAR", "% of childhood diarrhea cases treated", 65943, 78184, 84.3,
             "The underperformance is due to stockouts of ORS and Zinc in health facilities."),
            ("MCH_PNEUMO", "% childhood pneumonia cases treated", 79665, 87113, 91.5, ""),
            ("MCH_MENTOR", "Number of individuals receiving MCH mentorship", 508, 1335, 38.1,
             "The low performance is due to the delayed start of activity implementation."),
        ],
    ),
    (
        "Nutrition",
        [
            ("NUT_CH_SBCFEED", "% children reached with SBC for IYCF", 745006, 915737, 81.4, ""),
        ],
    ),
    (
        "Malaria",
        [
            ("MAL_PW_IPTp", "IPTp coverage", 107441, 169830, 63.3,
             "The underperformance is due to the limited availability of SP in health facilities. The numerator comprises the number of pregnant women who received IPTp3 and the denominator comprises the number of pregnant women who attended ANC1."),
            ("MAL_PW_ITNs", "ITN received at ANC 1", 109144, 169830, 64.3,
             "The underperformance is due to stockouts of ITNs in health facilities during the reporting period."),
            ("MAL_TEST", "% suspected cases tested", 972866, 1006236, 96.7, ""),
            ("MAL_TX", "Confirmed cases treated in accordance with national policy", 559420, 645625, 86.6, ""),
        ],
    ),
]

GHS = [
    ("GHS_OUTBREAKS", "Emerging infectious disease outbreaks responded to with DoS support",
     "2", "—", "—",
     "Diseases covered: Cholera, EVD/Ebola, Mpox. Locations: Congo River corridors, Bulape, Mweka, Masina 1."),
    ("GHS_TRAINED", "Individuals trained with DoS support to prevent, detect, and respond to emerging infectious disease threats",
     "1,271", "857", "249",
     "Annex C reports approximate sex totals (~857 male / ~249 female / ~165 not specified). Documented activity breakdowns do not sum to 1,271; the missing remainder is not specified in the source."),
    ("GHS_SURVEILLANCE", "DoS-supported surveillance activities implemented",
     "7", "—", "—", ""),
    ("GHS_EMCE_MATERIALS", "Evidence-based EMCE communication materials developed",
     "6,860", "—", "—",
     "6,860 standardized tools (EVD prevention + SDB) in French and Tshiluba, plus 16,000 data collection tools distributed at checkpoints (recorded as a related detail, not added into the 6,860 total)."),
    ("GHS_COMMUNITY_ENGAGEMENT", "Large-scale community engagement events where numbers are estimated",
     "15", "—", "—",
     "Source reports at least 15 events. Reach figures in the details are estimates as stated in Annex C."),
    ("GHS_LABS", "Laboratories supported by DoS that can test priority pathogens",
     "0", "—", "—",
     "Planned for H2 FY26. Objective 3 activities are scheduled for the second half of FY2026."),
    ("GHS_BIOSECURITY", "DoS-supported laboratory biosafety and biosecurity interventions implemented",
     "0", "—", "—",
     "Planned for H2 FY26. Objective 3 activities are scheduled for the second half of FY2026."),
    ("GHS_IPC_FACILITIES", "Healthcare facilities supported by DoS to meet IPC requirements",
     "6", "—", "—",
     "Source reports at least 6 healthcare facilities."),
    ("GHS_ZOONOTIC", "DoS-supported interventions to reduce the risk of zoonotic spillover",
     "1", "—", "—",
     "Kinshasa: training of 50 call-center operators on One Health, zoonoses, and infodemic management."),
]

STORIES = [
    (
        "Revitalizing an integrated community care site for malaria services in Haut-Katanga",
        "Haut-Katanga  ·  Kafubu Health Zone  ·  Kamiseshi  ·  February–March 2026",
        [
            "In Kamiseshi village, located more than 12 kilometers from the nearest health facility in Kafubu Health Zone, families faced major challenges accessing timely healthcare services. Children with fever and pregnant women often depended on self-medication or traditional remedies due to the distance and cost of travel, increasing the risk of severe malaria and preventable deaths in the community.",
            "To help close this gap, the EpiC project revitalized an iCCM site that had previously been established under earlier USG-supported programs. EpiC supported the site through the provision of malaria commodities, management tools, essential equipment, and regular supportive supervision for RECOs. Following the revitalization, community-based service delivery quickly resumed.",
            "Between February and March, the iCCM site managed 58 children under 13 years of age according to national malaria treatment guidelines. Among them, 48 children presented with fever, 32 tested positive for malaria, and all confirmed cases received appropriate treatment.",
        ],
    ),
    (
        "Integrated supervision as a driver of quality improvement and community engagement",
        "Kasaï-Oriental  ·  Lukamu, Bibanga, and Katanda I",
        [
            "In Kasaï-Oriental, integrated supervision has evolved from a routine monitoring activity into a high-impact quality improvement approach aligned with national Integrated Health Area (IHA) priorities.",
            "Through joint MoH–EpiC supervision missions in Lukamu, Bibanga, and Katanda I, provincial health teams, in close collaboration with the Ministry of Health, provided structured on-the-job mentorship focused on service quality, data use, and adherence to clinical standards.",
        ],
    ),
    (
        "Community-driven Vitamin A supplementation through awareness and engagement",
        "National  ·  FY2026 H1",
        [
            "EpiC supported the provinces in implementing large-scale awareness and service delivery campaigns to increase Vitamin A supplementation among children under five.",
            "During the reporting period, more than 2.4 million children received Vitamin A supplementation, reflecting both improved commodity availability and increased community uptake.",
        ],
    ),
]


def tw(inches: float) -> int:
    return int(round(inches * 1440))


def set_run_font(run, *, name=FONT, size=11, bold=False, italic=False, color=INK):
    run.font.name = name
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = color
    rPr = run._element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), name)
    rFonts.set(qn("w:hAnsi"), name)
    rFonts.set(qn("w:cs"), name)
    rFonts.set(qn("w:eastAsia"), name)


def shade(cell, hex_color):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn("w:shd")):
        tcPr.remove(old)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_margins(cell, top=80, bottom=80, left=90, right=90):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn("w:tcMar")):
        tcPr.remove(old)
    tcMar = OxmlElement("w:tcMar")
    for name, value in (("top", top), ("left", left), ("bottom", bottom), ("right", right)):
        node = OxmlElement(f"w:{name}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        tcMar.append(node)
    tcPr.append(tcMar)


def set_cell_borders(cell, color=RULE, sz="6"):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn("w:tcBorders")):
        tcPr.remove(old)
    tcBorders = OxmlElement("w:tcBorders")
    for edge in ("top", "left", "bottom", "right"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "single")
        el.set(qn("w:sz"), sz)
        el.set(qn("w:space"), "0")
        el.set(qn("w:color"), color)
        tcBorders.append(el)
    tcPr.append(tcBorders)


def set_cell_width(cell, twips):
    tcPr = cell._tc.get_or_add_tcPr()
    tcW = tcPr.find(qn("w:tcW"))
    if tcW is None:
        tcW = OxmlElement("w:tcW")
        tcPr.append(tcW)
    tcW.set(qn("w:w"), str(twips))
    tcW.set(qn("w:type"), "dxa")


def set_no_wrap(cell):
    tcPr = cell._tc.get_or_add_tcPr()
    for old in tcPr.findall(qn("w:noWrap")):
        tcPr.remove(old)
    tcPr.append(OxmlElement("w:noWrap"))


def prevent_row_split(row):
    trPr = row._tr.get_or_add_trPr()
    if trPr.find(qn("w:cantSplit")) is None:
        trPr.append(OxmlElement("w:cantSplit"))


def repeat_header(row):
    trPr = row._tr.get_or_add_trPr()
    if trPr.find(qn("w:tblHeader")) is None:
        trPr.append(OxmlElement("w:tblHeader"))


def keep_with_next(paragraph):
    pPr = paragraph._p.get_or_add_pPr()
    if pPr.find(qn("w:keepNext")) is None:
        pPr.append(OxmlElement("w:keepNext"))


def set_table_fixed(table, widths):
    table.alignment = WD_TABLE_ALIGNMENT.LEFT
    table.autofit = False
    tbl = table._tbl
    tblPr = tbl.tblPr
    layout = tblPr.find(qn("w:tblLayout"))
    if layout is None:
        layout = OxmlElement("w:tblLayout")
        tblPr.append(layout)
    layout.set(qn("w:type"), "fixed")

    total = sum(widths)
    tblW = tblPr.find(qn("w:tblW"))
    if tblW is None:
        tblW = OxmlElement("w:tblW")
        tblPr.append(tblW)
    tblW.set(qn("w:w"), str(total))
    tblW.set(qn("w:type"), "dxa")

    grid = tbl.find(qn("w:tblGrid"))
    if grid is not None:
        tbl.remove(grid)
    grid = OxmlElement("w:tblGrid")
    for width in widths:
        col = OxmlElement("w:gridCol")
        col.set(qn("w:w"), str(width))
        grid.append(col)
    tbl.insert(1, grid)

    for row in table.rows:
        for i, cell in enumerate(row.cells):
            set_cell_width(cell, widths[min(i, len(widths) - 1)])


def set_table_indent(table, inches):
    tblPr = table._tbl.tblPr
    tblInd = tblPr.find(qn("w:tblInd"))
    if tblInd is None:
        tblInd = OxmlElement("w:tblInd")
        tblPr.append(tblInd)
    tblInd.set(qn("w:w"), str(tw(inches)))
    tblInd.set(qn("w:type"), "dxa")


def set_full_bleed_table(table, left_margin_in=LEFT_IN, page_width_in=PAGE_IN):
    """Span a 1-column bar from the left page edge to the right page edge."""
    set_table_fixed(table, [tw(page_width_in)])
    set_table_indent(table, -left_margin_in)


def set_row_height(row, twips, rule="exact"):
    trPr = row._tr.get_or_add_trPr()
    for old in trPr.findall(qn("w:trHeight")):
        trPr.remove(old)
    trHeight = OxmlElement("w:trHeight")
    trHeight.set(qn("w:val"), str(twips))
    trHeight.set(qn("w:hRule"), rule)
    trPr.append(trHeight)


def add_one_col_table(container):
    try:
        return container.add_table(rows=1, cols=1, width=Inches(PAGE_IN))
    except TypeError:
        return container.add_table(rows=1, cols=1)


def add_full_bleed_rule(container, hex_color=ORANGE_HEX, height_twips=90):
    table = add_one_col_table(container)
    set_full_bleed_table(table)
    clear_table_borders(table)
    cell = table.cell(0, 0)
    shade(cell, hex_color)
    set_cell_margins(cell, 0, 0, 0, 0)
    set_row_height(table.rows[0], height_twips, "exact")
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1
    return table


def clear_table_borders(table):
    tbl = table._tbl
    tblPr = tbl.tblPr
    borders = tblPr.find(qn("w:tblBorders"))
    if borders is not None:
        tblPr.remove(borders)
    borders = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        el = OxmlElement(f"w:{edge}")
        el.set(qn("w:val"), "nil")
        borders.append(el)
    tblPr.append(borders)


def add_para(container, text="", *, size=11, bold=False, italic=False, color=INK,
             align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=8):
    p = container.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.MULTIPLE
    if text:
        run = p.add_run(text)
        set_run_font(run, size=size, bold=bold, italic=italic, color=color)
    return p


def cell_para(cell, text, *, size=9.5, bold=False, italic=False, color=INK,
              align=WD_ALIGN_PARAGRAPH.LEFT, space_after=0, keep=False):
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER
    p = cell.paragraphs[0]
    p.alignment = align
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    run = p.add_run(text)
    set_run_font(run, size=size, bold=bold, italic=italic, color=color)
    if keep:
        keep_with_next(p)
    return p


def shade_paragraph(p, hex_color):
    pPr = p._p.get_or_add_pPr()
    for old in pPr.findall(qn("w:shd")):
        pPr.remove(old)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    pPr.append(shd)


def add_bottom_border(p, color=ORANGE_HEX, sz="16"):
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), sz)
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    pBdr.append(bottom)
    pPr.append(pBdr)


def add_page_field(paragraph, kind="PAGE"):
    run = paragraph.add_run()
    set_run_font(run, size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))
    r = run._r
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = kind
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    r.append(begin)
    r.append(instr)
    r.append(separate)
    r.append(end)


def fmt_num(n):
    return f"{n:,}"


def set_section_page(section, *, left=LEFT_IN, right=RIGHT_IN, top=0.8, bottom=0.7, header=0.4, footer=0.35):
    section.orientation = WD_ORIENT.PORTRAIT
    section.page_width = Inches(PAGE_IN)
    section.page_height = Inches(11)
    section.left_margin = Inches(left)
    section.right_margin = Inches(right)
    section.top_margin = Inches(top)
    section.bottom_margin = Inches(bottom)
    section.header_distance = Inches(header)
    section.footer_distance = Inches(footer)


def hide_empty_header_footer(section):
    header = section.header
    header.is_linked_to_previous = False
    for p in header.paragraphs:
        p.text = ""
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
    footer = section.footer
    footer.is_linked_to_previous = False
    for p in footer.paragraphs:
        p.text = ""
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)


def _bleed_bar(container, fill, left_text, right_text="", *, size=8.5, pad=70):
    table = add_one_col_table(container)
    set_full_bleed_table(table)
    clear_table_borders(table)
    cell = table.cell(0, 0)
    shade(cell, fill)
    set_cell_margins(cell, pad, pad, 160, 160)
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.line_spacing = 1.0
    p.paragraph_format.tab_stops.add_tab_stop(Inches(PAGE_IN - 0.45), WD_TAB_ALIGNMENT.RIGHT)
    if left_text:
        run = p.add_run(left_text)
        set_run_font(run, size=size, color=RGBColor(0xFF, 0xFF, 0xFF))
    return p


def chrome(section, left_text, right_text=""):
    header = section.header
    header.is_linked_to_previous = False
    footer = section.footer
    footer.is_linked_to_previous = False
    for p in header.paragraphs:
        p.text = ""
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
    for p in footer.paragraphs:
        p.text = ""
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)

    p = _bleed_bar(header, CHARCOAL_HEX, left_text, size=8.5, pad=80)
    if right_text:
        run = p.add_run(f"\t{right_text}")
        set_run_font(run, size=8.5, color=RGBColor(0xFF, 0xFF, 0xFF))
    add_full_bleed_rule(header, ORANGE_HEX, 70)

    fp = _bleed_bar(footer, CHARCOAL_HEX, "Internal working annex  ·  Official FY2026 H1 source data", size=8, pad=60)
    run = fp.add_run("\t")
    set_run_font(run, size=8, color=RGBColor(0xFF, 0xFF, 0xFF))
    add_page_field(fp, "PAGE")
    run = fp.add_run("  /  ")
    set_run_font(run, size=8, color=RGBColor(0xFF, 0xFF, 0xFF))
    add_page_field(fp, "NUMPAGES")


def section_heading(doc, title, kicker=""):
    if kicker:
        p = add_para(doc, kicker.upper(), size=9, bold=True, color=ORANGE, space_before=4, space_after=2)
        keep_with_next(p)
    p = add_para(doc, title, size=16, bold=True, color=CHARCOAL, space_before=0, space_after=8)
    add_bottom_border(p, ORANGE_HEX, "12")
    keep_with_next(p)
    return p


def make_header_row(table, labels, widths, center_from=2):
    row = table.rows[0]
    repeat_header(row)
    prevent_row_split(row)
    for i, label in enumerate(labels):
        cell = row.cells[i]
        shade(cell, CHARCOAL_HEX)
        set_cell_borders(cell, CHARCOAL_HEX, "4")
        set_cell_margins(cell, 85, 85, 80, 80)
        set_cell_width(cell, widths[i])
        align = WD_ALIGN_PARAGRAPH.CENTER if i >= center_from else WD_ALIGN_PARAGRAPH.LEFT
        cell_para(cell, label, size=8.5, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF), align=align)


def add_band_row(table, text, widths, fill=CHARCOAL_ALT_HEX):
    row = table.add_row()
    prevent_row_split(row)
    row.cells[0].merge(row.cells[-1])
    cell = row.cells[0]
    shade(cell, fill)
    set_cell_borders(cell, fill, "4")
    set_cell_margins(cell, 80, 80, 100, 90)
    p = cell_para(cell, text, size=9.5, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF), keep=True)
    return row


def add_data_row(table, values, widths, *, alt=False, aligns=None, pct_idx=None,
                 pct_value=None, nowrap_idx=(), keep=False):
    row = table.add_row()
    prevent_row_split(row)
    fill = ROW_ALT if alt else WHITE
    aligns = aligns or [WD_ALIGN_PARAGRAPH.LEFT] * len(values)
    for i, value in enumerate(values):
        cell = row.cells[i]
        shade(cell, fill)
        set_cell_borders(cell, RULE, "6")
        set_cell_margins(cell, 80, 80, 80, 80)
        set_cell_width(cell, widths[i])
        if i in nowrap_idx:
            set_no_wrap(cell)
        color = INK
        bold = i == 0 or (pct_idx is not None and i == pct_idx)
        cell_para(cell, value, size=8.5 if i == 0 else 9.5, bold=bold, color=color, align=aligns[i], keep=keep)
    return row


def add_note_row(table, text, widths):
    row = table.add_row()
    prevent_row_split(row)
    row.cells[0].merge(row.cells[-1])
    cell = row.cells[0]
    shade(cell, ROW_NOTE)
    set_cell_borders(cell, RULE, "6")
    set_cell_margins(cell, 60, 80, 100, 100)
    cell_para(cell, text, size=9, italic=True, color=MUTED)
    return row


def build_cover(doc):
    banner = add_one_col_table(doc)
    set_full_bleed_table(banner)
    clear_table_borders(banner)
    cell = banner.cell(0, 0)
    shade(cell, CHARCOAL_HEX)
    set_cell_margins(cell, 260, 260, 280, 280)
    add_para(cell, "FHI 360", size=13, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF), space_after=4)
    add_para(cell, "MEETING TARGETS AND MAINTAINING EPIDEMIC CONTROL", size=9,
             color=RGBColor(0xFF, 0xFF, 0xFF), space_after=8)
    add_para(cell, "Democratic Republic of the Congo", size=14, bold=True,
             color=RGBColor(0xFF, 0xFF, 0xFF), space_after=0)
    add_full_bleed_rule(doc, ORANGE_HEX, 110)

    add_para(doc, "SEMI-ANNUAL PERFORMANCE ANNEX", size=11, bold=True, color=ORANGE,
             space_before=16, space_after=4)
    add_para(doc, "Source-Based Reporting Data", size=26, bold=True, color=CHARCOAL,
             space_before=0, space_after=6)
    add_para(doc, "Fiscal Year 2026  ·  First Half", size=14, color=INK,
             space_before=2, space_after=2)
    add_para(doc, "1 October 2025  –  31 March 2026", size=12, color=MUTED,
             space_before=0, space_after=14)

    stats = doc.add_table(rows=1, cols=3)
    set_table_fixed(stats, [tw(2.33), tw(2.34), tw(2.33)])
    clear_table_borders(stats)
    stat_items = [
        ("12", "Performance indicators"),
        ("9", "GHS results"),
        ("3", "Field records"),
    ]
    for i, (n, label) in enumerate(stat_items):
        cell = stats.cell(0, i)
        shade(cell, SOFT)
        set_cell_borders(cell, RULE, "8")
        set_cell_margins(cell, 140, 140, 120, 120)
        add_para(cell, n, size=20, bold=True, color=CHARCOAL, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
        add_para(cell, label, size=9, color=MUTED, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    add_para(doc, "", space_after=8)
    meta = doc.add_table(rows=5, cols=2)
    set_table_fixed(meta, [tw(2.15), tw(4.85)])
    rows = [
        ("Project", "Meeting Targets and Maintaining Epidemic Control (EpiC)"),
        ("Agreement", "7200AA19CA00002"),
        ("Dataset", "EpiC DRC FY2026 H1 — Source-Based Reporting Data"),
        ("Official source", "EpiC Semi-Annual Program Report, DRC MNCH-N-Malaria (20 May 2026)"),
        ("Document type", "Working annex for indicator, GHS, and field-record extraction"),
    ]
    for i, (k, v) in enumerate(rows):
        prevent_row_split(meta.rows[i])
        left, right = meta.rows[i].cells
        shade(left, CHARCOAL_HEX if i % 2 == 0 else CHARCOAL_ALT_HEX)
        shade(right, SOFT)
        set_cell_borders(left, CHARCOAL_HEX, "4")
        set_cell_borders(right, RULE, "4")
        set_cell_margins(left, 90, 90, 110, 80)
        set_cell_margins(right, 90, 90, 120, 90)
        cell_para(left, k, size=9, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF))
        cell_para(right, v, size=9.5, color=INK)

    add_para(doc, "", space_after=8)
    p = add_para(doc, "Contents", size=13, bold=True, color=CHARCOAL, space_before=4, space_after=6)
    add_bottom_border(p, ORANGE_HEX, "12")
    for line in (
        "01    Performance indicators — MNCH, nutrition, and malaria results from Annex B",
        "02    Global Health Security — DoS-supported outbreak, surveillance, and IPC results",
        "03    Field records — selected implementation stories from the reporting period",
    ):
        add_para(doc, line, size=11, color=INK, space_after=5)

    add_para(
        doc,
        "Figures are transcribed from the official source report. Percentages are reported values. A blank comment means the source did not include a narrative note.",
        size=9.5,
        italic=True,
        color=MUTED,
        space_before=8,
        space_after=10,
    )
    p = add_para(
        doc,
        "FHI 360  ·  Cooperative Agreement 7200AA19CA00002  ·  For internal program use",
        size=9,
        color=MUTED,
        space_before=6,
        space_after=0,
    )
    add_bottom_border(p, ORANGE_HEX, "12")


def build_indicator_table(doc):
    widths = [tw(w) for w in (1.45, 2.45, 1.05, 1.15, 0.90)]
    table = doc.add_table(rows=1, cols=5)
    set_table_fixed(table, widths)
    make_header_row(table, ["Code", "Indicator", "Numerator", "Denominator", "%"], widths, center_from=2)
    alt = False
    aligns = [
        WD_ALIGN_PARAGRAPH.LEFT,
        WD_ALIGN_PARAGRAPH.LEFT,
        WD_ALIGN_PARAGRAPH.RIGHT,
        WD_ALIGN_PARAGRAPH.RIGHT,
        WD_ALIGN_PARAGRAPH.CENTER,
    ]
    for domain, rows in INDICATORS:
        add_band_row(table, domain, widths)
        for code, name, num, den, pct, comment in rows:
            add_data_row(
                table,
                [code, name, fmt_num(num), fmt_num(den), f"{pct:.1f}%"],
                widths,
                alt=alt,
                aligns=aligns,
                pct_idx=4,
                pct_value=pct,
                nowrap_idx=(0, 2, 3, 4),
                keep=bool(comment),
            )
            if comment:
                add_note_row(table, comment, widths)
            alt = not alt
    return table


def build_ghs_table(doc):
    widths = [tw(w) for w in (2.20, 2.20, 0.85, 0.85, 0.90)]
    table = doc.add_table(rows=1, cols=5)
    set_table_fixed(table, widths)
    make_header_row(table, ["Code", "Indicator", "Total", "Male", "Female"], widths, center_from=2)
    aligns = [
        WD_ALIGN_PARAGRAPH.LEFT,
        WD_ALIGN_PARAGRAPH.LEFT,
        WD_ALIGN_PARAGRAPH.CENTER,
        WD_ALIGN_PARAGRAPH.CENTER,
        WD_ALIGN_PARAGRAPH.CENTER,
    ]
    for i, (code, name, total, male, female, notes) in enumerate(GHS):
        add_data_row(
            table,
            [code, name, total, male, female],
            widths,
            alt=i % 2 == 1,
            aligns=aligns,
            nowrap_idx=(0, 2, 3, 4),
            keep=bool(notes),
        )
        if notes:
            add_note_row(table, notes, widths)
    return table


def build_stories(doc):
    bar = tw(0.11)
    body = tw(CONTENT_IN) - bar
    for i, (title, meta, paras) in enumerate(STORIES):
        if i:
            add_para(doc, "", space_after=6)
        card = doc.add_table(rows=1, cols=2)
        set_table_fixed(card, [bar, body])
        clear_table_borders(card)
        accent = card.cell(0, 0)
        content = card.cell(0, 1)
        shade(accent, ORANGE_HEX)
        shade(content, SOFT)
        set_cell_margins(accent, 50, 50, 0, 0)
        set_cell_margins(content, 110, 120, 140, 140)
        set_cell_borders(accent, ORANGE_HEX, "0")
        set_cell_borders(content, RULE, "8")
        add_para(content, title, size=12.5, bold=True, color=CHARCOAL, space_after=2)
        add_para(content, meta, size=9, italic=True, color=MUTED, space_after=6)
        for para in paras:
            add_para(content, para, size=10.5, color=INK, space_after=5)


def set_document_defaults(doc):
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = FONT
    normal.font.size = Pt(11)
    normal.font.color.rgb = INK
    rPr = normal.element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn("w:ascii"), FONT)
    rFonts.set(qn("w:hAnsi"), FONT)
    rFonts.set(qn("w:cs"), FONT)
    rFonts.set(qn("w:eastAsia"), FONT)

    rPrDefault = styles.element.find(qn("w:docDefaults"))
    if rPrDefault is None:
        rPrDefault = OxmlElement("w:docDefaults")
        styles.element.insert(0, rPrDefault)
    rdef = rPrDefault.find(qn("w:rPrDefault"))
    if rdef is None:
        rdef = OxmlElement("w:rPrDefault")
        rPrDefault.append(rdef)
    rr = rdef.find(qn("w:rPr"))
    if rr is None:
        rr = OxmlElement("w:rPr")
        rdef.append(rr)
    rFonts = rr.find(qn("w:rFonts"))
    if rFonts is None:
        rFonts = OxmlElement("w:rFonts")
        rr.append(rFonts)
    rFonts.set(qn("w:ascii"), FONT)
    rFonts.set(qn("w:hAnsi"), FONT)
    rFonts.set(qn("w:cs"), FONT)
    rFonts.set(qn("w:eastAsia"), FONT)
    sz = rr.find(qn("w:sz"))
    if sz is None:
        sz = OxmlElement("w:sz")
        rr.append(sz)
    sz.set(qn("w:val"), "22")
    szCs = rr.find(qn("w:szCs"))
    if szCs is None:
        szCs = OxmlElement("w:szCs")
        rr.append(szCs)
    szCs.set(qn("w:val"), "22")

    core = doc.core_properties
    core.title = "EpiC DRC FY2026 H1 — Source-Based Reporting Data"
    core.author = "FHI 360 / EpiC DRC"
    core.subject = "Semi-annual performance annex"
    core.category = "Program report annex"


def build():
    doc = Document()
    set_document_defaults(doc)

    cover = doc.sections[0]
    set_section_page(cover, left=LEFT_IN, right=RIGHT_IN, top=0.0, bottom=0.65, header=0.0, footer=0.35)
    hide_empty_header_footer(cover)
    build_cover(doc)

    body = doc.add_section()
    set_section_page(body, left=LEFT_IN, right=RIGHT_IN, top=1.05, bottom=0.8, header=0.0, footer=0.28)
    chrome(body, "EpiC DRC  ·  FY2026 H1 source annex", "7200AA19CA00002")

    section_heading(doc, "Performance indicators", "Section 01")
    add_para(
        doc,
        "Annex B results for the first half of FY2026. Values are national aggregates as reported in the official semi-annual report.",
        size=10,
        color=MUTED,
        space_after=10,
    )
    build_indicator_table(doc)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run()
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    run._r.append(br)
    section_heading(doc, "Global Health Security", "Section 02")
    add_para(
        doc,
        "DoS-supported GHS results transcribed from Annex C. A zero value with a planning note means the activity is scheduled for the second half of FY2026, not that implementation failed.",
        size=10,
        color=MUTED,
        space_after=10,
    )
    build_ghs_table(doc)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    run = p.add_run()
    br = OxmlElement("w:br")
    br.set(qn("w:type"), "page")
    run._r.append(br)
    section_heading(doc, "Field records / success stories", "Section 03")
    add_para(
        doc,
        "Selected implementation stories transcribed from the official source report. These are narrative case records, not independently verified outcome evaluations.",
        size=10,
        color=MUTED,
        space_after=12,
    )
    build_stories(doc)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc.save(OUT)
    print(f"Wrote {OUT}")
    print(f"Size {OUT.stat().st_size} bytes")


if __name__ == "__main__":
    build()
