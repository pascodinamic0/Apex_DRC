#!/usr/bin/env python3
"""Extract structured JSON from Docs monthly provincial Word reports."""
from __future__ import annotations

import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
W_T = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t"

FILES = {
    "HL_juin_Rapport mensuel d'activités.docx": {
        "code": "MONTHLY_HL_JUN2026",
        "province_code": "HLM",
        "province_name": "Haut-Lomami",
        "month": 6,
        "year": 2026,
    },
    "KC_RAPPORT MENSUEL D'ACTIVITES _JUIN 2026vf.docx": {
        "code": "MONTHLY_KCT_JUN2026",
        "province_code": "KCT",
        "province_name": "Kasaï Central",
        "month": 6,
        "year": 2026,
    },
    "KO_ rapport mensuel dactivité Juin2026_VF.docx": {
        "code": "MONTHLY_KOR_JUN2026",
        "province_code": "KOR",
        "province_name": "Kasaï-Oriental",
        "month": 6,
        "year": 2026,
    },
    "LOMAMI_Rapport_Juin26_VF Prefinal.docx": {
        "code": "MONTHLY_LOM_JUN2026",
        "province_code": "LOM",
        "province_name": "Lomami",
        "month": 6,
        "year": 2026,
    },
    "LU_ Rapport mensuel d'activité mois de Juin_Lualaba_272026.docx": {
        "code": "MONTHLY_LUA_JUN2026",
        "province_code": "LUA",
        "province_name": "Lualaba",
        "month": 6,
        "year": 2026,
    },
    "Rapport mensuel d'activité de juin 2026 au Sud-Kivu.docx": {
        "code": "MONTHLY_SKV_JUN2026",
        "province_code": "SKV",
        "province_name": "Sud-Kivu",
        "month": 6,
        "year": 2026,
    },
    "Rapport_Mensuel_HK_Juin_2026 V3 1.docx": {
        "code": "MONTHLY_HKA_JUN2026",
        "province_code": "HKA",
        "province_name": "Haut-Katanga",
        "month": 6,
        "year": 2026,
        "notes": "Cover template says 'Mois de Mai 2026'; filename and activity narratives refer to June 2026. Stored as June 2026.",
    },
    "Sank_Draft1 de rapport mensuel dactivité_Juin 2026.docx": {
        "code": "MONTHLY_SAN_JUN2026",
        "province_code": "SAN",
        "province_name": "Sankuru",
        "month": 6,
        "year": 2026,
    },
}


def para_text(p) -> str:
    return "".join((t.text or "") for t in p.iter(W_T))


def iter_paras(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    lines = []
    for p in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p"):
        t = para_text(p).strip()
        if t:
            lines.append(t)
    return lines


def iter_tables(path: Path) -> list[list[list[str]]]:
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    tables = []
    for tbl in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}tbl"):
        rows = []
        for tr in tbl.findall("w:tr", NS):
            cells = []
            for tc in tr.findall("w:tc", NS):
                cell = " | ".join(
                    para_text(p).strip() for p in tc.findall("w:p", NS) if para_text(p).strip()
                )
                cells.append(cell)
            rows.append(cells)
        tables.append(rows)
    return tables


def parse_int(s: str) -> int:
    m = re.search(r"\d+", (s or "").replace("\xa0", " "))
    return int(m.group()) if m else 0


def extract_achievement(tables):
    keys = {
        "total": "total_planned",
        "prévues": "total_planned",
        "prevues": "total_planned",
        "finalisée et rapport approuvé": "finalized_approved",
        "finalisées et rapports approuvés": "finalized_approved",
        "non encore disponible": "finalized_no_report",
        "en cours": "in_progress",
        "déclencheur": "trigger_approved",
        "declencheur": "trigger_approved",
        "non réalisée": "not_realized",
        "non réalisées": "not_realized",
    }
    out = {
        "total_planned": 0,
        "finalized_approved": 0,
        "finalized_no_report": 0,
        "in_progress": 0,
        "trigger_approved": 0,
        "not_realized": 0,
    }
    for t in tables:
        blob = "\n".join("\t".join(r) for r in t).lower()
        if "nombre total" not in blob:
            continue
        if "finalis" not in blob:
            continue
        for row in t[1:]:
            if not row or not row[0].strip():
                continue
            label = row[0].lower()
            n = parse_int(row[1] if len(row) > 1 else "")
            for needle, key in keys.items():
                if needle in label:
                    out[key] = n
                    break
        return out
    return out


CODE_RE = re.compile(r"^(\d+\.\d+\.\d+)\s*$")


def extract_activities(tables):
    best = max(tables, key=lambda t: sum(len(c) for row in t for c in row), default=[])
    items = []
    current = None
    for row in best[1:]:
        if not row:
            continue
        code = (row[0] or "").strip()
        m = CODE_RE.match(code)
        cells = (row + [""] * 7)[:7]
        if m:
            current = {
                "catalog_code": m.group(1),
                "realized": cells[1].strip(),
                "progress": cells[2].strip(),
                "challenges": cells[3].strip(),
                "solutions": cells[4].strip(),
                "priorities": cells[5].strip(),
                "partners": cells[6].strip(),
            }
            items.append(current)
        elif current and any(cells[1:]):
            for i, field in enumerate(
                ["realized", "progress", "challenges", "solutions", "priorities", "partners"]
            ):
                extra = cells[i + 1].strip()
                if extra:
                    current[field] = (current[field] + "\n" + extra).strip() if current[field] else extra
    # Keep rows that have any narrative (including explicit NA)
    return items


def section_between(lines: list[str], start_pat: str, end_pats: list[str]) -> str:
    start = None
    for i, line in enumerate(lines):
        if re.search(start_pat, line, re.I) and start is None:
            start = i + 1
            continue
        if start is not None and any(re.search(p, line, re.I) and len(line) < 80 for p in end_pats):
            return "\n\n".join(lines[start:i]).strip()
    if start is not None:
        return "\n\n".join(lines[start : start + 40]).strip()
    return ""


def extract_meta(lines: list[str]) -> dict:
    submitted_by = None
    domains = None
    for line in lines[:40]:
        if line.lower().startswith("soumis par"):
            submitted_by = re.sub(r"^soumis par\s*(le\s*)?:?\s*", "", line, flags=re.I).strip()
        if line.lower().startswith("domaines"):
            domains = line.split(":", 1)[-1].strip().strip(",")
    # next line after DOMAINES: is often the domain list
    for i, line in enumerate(lines[:40]):
        if re.match(r"domaines\s*:?\s*$", line, re.I) and i + 1 < len(lines):
            domains = lines[i + 1].strip().strip(",")
            break
    return {"submitted_by": submitted_by, "domains": domains}


def extract_narratives(lines: list[str]) -> dict:
    exec_body = section_between(
        lines,
        r"^Résumé exécutif$",
        [r"^Taux de réalisation", r"^I\.\s*Résultats", r"^Tableau"],
    )
    stories = section_between(
        lines,
        r"^III\.\s*Histoires",
        [r"^IV\.\s*Défis", r"^V\.\s*Activités"],
    )
    challenges = section_between(
        lines,
        r"^IV\.\s*Défis",
        [r"^V\.\s*Activités", r"^Annexe"],
    )
    priorities = section_between(
        lines,
        r"^V\.\s*Activités prioritaires",
        [r"^Annexe"],
    )
    narratives = {
        "success_stories": stories,
        "challenges": challenges,
        "priorities_next_month": priorities,
        "exec_summary_smni": "",
        "exec_summary_nutrition": "",
        "exec_summary_malaria": "",
    }
    # Split executive summary by known headings when present
    parts = re.split(
        r"\n(?=(?:Santé maternelle|Nutrition|Paludisme)\b)",
        exec_body,
        flags=re.I,
    )
    if len(parts) == 1:
        if re.search(r"paludisme", exec_body, re.I) and not re.search(
            r"santé maternelle|nutrition", exec_body, re.I
        ):
            narratives["exec_summary_malaria"] = exec_body
        else:
            narratives["exec_summary_smni"] = exec_body
    else:
        for p in parts:
            low = p[:80].lower()
            if low.startswith("nutrition"):
                narratives["exec_summary_nutrition"] = p.strip()
            elif low.startswith("paludisme"):
                narratives["exec_summary_malaria"] = p.strip()
            else:
                narratives["exec_summary_smni"] = p.strip()
    return narratives


def main():
    docs = Path("/Users/Pascal Digny/Github Lab/Apex_DRC/Docs")
    out_reports = []
    # Resolve actual filenames (NFC/NFD)
    actual = {p.name: p for p in docs.glob("*.docx")}
    for logical, meta in FILES.items():
        path = actual.get(logical)
        if path is None:
            # fuzzy by code tokens
            key = logical[:12]
            for name, p in actual.items():
                if name.replace("\u0301", "́") == logical or name.startswith(logical[:8]):
                    path = p
                    break
        if path is None:
            raise SystemExit(f"Missing file for {logical}. Have: {list(actual)}")
        lines = iter_paras(path)
        tables = iter_tables(path)
        header = extract_meta(lines)
        rec = {
            **meta,
            "filename": path.name,
            "submitted_by": header["submitted_by"],
            "domains": header["domains"],
            "achievement": extract_achievement(tables),
            "activities": extract_activities(tables),
            "narratives": extract_narratives(lines),
        }
        filled = sum(
            1
            for a in rec["activities"]
            if any(a[k] and a[k].upper() != "NA" for k in ("realized", "progress", "challenges", "solutions", "priorities", "partners"))
        )
        print(f"{path.name}: activities={len(rec['activities'])} filled={filled} planned={rec['achievement']['total_planned']}")
        out_reports.append(rec)

    dest = Path("/Users/Pascal Digny/Github Lab/Apex_DRC/scripts/data/june-2026-monthly.json")
    dest.write_text(json.dumps(out_reports, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", dest, "bytes", dest.stat().st_size)


if __name__ == "__main__":
    main()
