#!/usr/bin/env python3
"""
Migration des chants de l'ancien corpus VIF.

Entrée  : tmp/old-repo/db-data.raw.json  (produit par extract-old-data.mjs)
Sorties : src/seed/songs.json            (corpus nettoyé prêt à seeder Dexie)
          tmp/migration-report.md        (rapport — cas à revoir manuellement)

Transformations :
  1. Nettoyage encodage : '\\ufffd' (remplacement char) → ' / ô / à selon le contexte
  2. Restructuration du contenu : HTML <br> → sections (verse / chorus)
  3. Détection langue : malgache par défaut, français si marqueurs majoritaires
  4. Extraction auteur : ligne(s) finale(s) en MAJUSCULES ou entre parenthèses
"""

from __future__ import annotations

import json
import re
import sys
import uuid
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tmp" / "old-repo" / "db-data.raw.json"
OUT = ROOT / "src" / "seed" / "songs.json"
CHURCH_OUT = ROOT / "src" / "seed" / "churches.json"
REPORT = ROOT / "tmp" / "migration-report.md"

# UUID déterministe pour l'église VIF (généré une fois, stable entre runs)
VIF_NAMESPACE = uuid.UUID("00000000-0000-0000-0000-000000000001")
VIF_CHURCH_ID = str(uuid.uuid5(VIF_NAMESPACE, "church:vif"))

FRENCH_MARKERS = {
    "le", "la", "les", "des", "tu", "vous", "nous", "je", "ton", "ta", "tes",
    "mon", "ma", "mes", "son", "sa", "ses", "qui", "que", "est", "sont",
    "amour", "vie", "seigneur", "dieu", "jesus", "esprit", "saint", "gloire",
    "louange", "pere", "coeur", "ame", "paix", "joie",
}
MALAGASY_MARKERS = {
    "ny", "izy", "tompo", "andriamanitra", "anao", "anie", "aho", "ianao",
    "jesosy", "fitiavana", "voninahitra", "fanahy", "masina", "ray", "hira",
    "fiainana", "fitiavanao", "fiderana", "mihira", "manana", "tena",
}

CHORUS_MARKERS = re.compile(
    r"^\s*(refrain|r[ée]f(rain)?|ref|chorus|fiverenana)\s*:?\s*$",
    re.IGNORECASE | re.UNICODE,
)

PARENTHETICAL_CREDIT = re.compile(r"^\s*\((.+)\)\s*$")

# Mot tout en MAJUSCULES de 3+ lettres (heuristique nom de famille)
UPPERCASE_WORD = re.compile(r"\b[A-ZÀ-Ý]{3,}\b")


# ---------------------------------------------------------------------------
# Encodage
# ---------------------------------------------------------------------------

def fix_encoding(text: str, stats: Counter) -> str:
    """Remplace les U+FFFD par le caractère le plus probable selon le contexte."""
    out = []
    i = 0
    while i < len(text):
        ch = text[i]
        if ch != "�":
            out.append(ch)
            i += 1
            continue
        before = out[-1] if out else " "
        after = text[i + 1] if i + 1 < len(text) else " "
        if before.isalpha() and after.isalpha():
            out.append("'")
            stats["letter-letter→'"] += 1
        elif before.isalpha() and not after.isalpha():
            # Fin de mot : ambigu. Si suivi de '!' ou ponctuation → ô. Sinon → à.
            if after in "!?":
                out.append("ô")
                stats["end-of-word→ô"] += 1
            else:
                out.append("à")
                stats["end-of-word→à"] += 1
        elif not before.isalpha() and after.isalpha():
            out.append("'")
            stats["start-of-word→'"] += 1
        else:
            # Standalone (entre espaces/ponctuation) : interjection ô
            out.append("ô")
            stats["standalone→ô"] += 1
        i += 1
    return "".join(out)


# ---------------------------------------------------------------------------
# Parsing du contenu HTML <br>
# ---------------------------------------------------------------------------

def split_sections(content: str) -> list[list[str]]:
    """
    Transforme un contenu '<br>'-séparé en blocs.
    Règle : 2 lignes vides consécutives = séparateur de bloc.
    """
    normalized = re.sub(r"<br\s*/?>", "\n", content, flags=re.IGNORECASE)
    normalized = normalized.replace("\r", "")
    lines = [ln.strip() for ln in normalized.split("\n")]

    sections: list[list[str]] = []
    current: list[str] = []
    blanks = 0
    for ln in lines:
        if not ln:
            blanks += 1
            if blanks >= 2 and current:
                sections.append(current)
                current = []
            continue
        blanks = 0
        current.append(ln)
    if current:
        sections.append(current)
    return sections


def classify_section(lines: list[str]) -> tuple[str, str | None, list[str]]:
    """
    Retourne (kind, label, lines_sans_label).
    kind : 'chorus' si la 1re ligne matche un marqueur de refrain, sinon 'verse'.
    """
    if not lines:
        return "verse", None, []
    first = lines[0]
    if CHORUS_MARKERS.match(first):
        return "chorus", first.rstrip(":").strip() or "Ref", lines[1:]
    # Cas inline "Ref : Sambatra isika..." (marqueur + texte sur même ligne)
    m = re.match(r"^\s*(refrain|r[ée]f(rain)?|ref|chorus)\s*:\s*(.+)$",
                 first, re.IGNORECASE)
    if m:
        return "chorus", m.group(1), [m.group(3)] + lines[1:]
    return "verse", None, lines


# ---------------------------------------------------------------------------
# Extraction auteur + détection langue
# ---------------------------------------------------------------------------

def extract_author(sections: list[tuple[str, str | None, list[str]]]) -> tuple[str | None, list[tuple[str, str | None, list[str]]]]:
    """
    L'auteur est typiquement dans la dernière section.
    Patterns reconnus :
      - "(M.M.K.)", "(Voix de la louange)" → entre parenthèses
      - "Rija RASOLONDRAIBE" → prénom + NOM_EN_MAJUSCULES
    Retourne (auteur_ou_none, sections_sans_section_auteur_si_applicable).
    """
    if not sections:
        return None, sections
    last_kind, last_label, last_lines = sections[-1]
    if not last_lines or last_kind == "chorus":
        return None, sections

    # 1) Toute la dernière section est-elle une crédit ?
    candidates = []
    keep_lines = []
    for ln in last_lines:
        is_credit = False
        if PARENTHETICAL_CREDIT.match(ln):
            candidates.append(PARENTHETICAL_CREDIT.match(ln).group(1).strip())
            is_credit = True
        elif UPPERCASE_WORD.search(ln) and len(ln.split()) <= 5:
            # Ex : "Rija RASOLONDRAIBE", "Mbolatiana RATOVOSON"
            candidates.append(ln.strip())
            is_credit = True
        if not is_credit:
            keep_lines.append(ln)

    if not candidates:
        return None, sections

    author = " · ".join(candidates)
    new_sections = list(sections)
    if keep_lines:
        new_sections[-1] = (last_kind, last_label, keep_lines)
    else:
        new_sections.pop()
    return author, new_sections


def detect_language(text: str) -> str:
    """Heuristique : compte les marqueurs français vs malgaches."""
    words = re.findall(r"\b[\wÀ-ÿ']+\b", text.lower())
    fr = sum(1 for w in words if w in FRENCH_MARKERS)
    mg = sum(1 for w in words if w in MALAGASY_MARKERS)
    return "fr" if fr > mg else "mg"


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def migrate(raw_song: dict, encoding_stats: Counter, now: str) -> dict:
    title = fix_encoding(raw_song["title"], encoding_stats)
    content = fix_encoding(raw_song["content"], encoding_stats)

    raw_sections = split_sections(content)
    typed_sections = [classify_section(s) for s in raw_sections]
    author, typed_sections = extract_author(typed_sections)

    language = detect_language(title + " " + content)
    sequence_raw = raw_song.get("sequence")
    try:
        sequence = int(sequence_raw) if sequence_raw is not None else None
    except (TypeError, ValueError):
        sequence = None

    return {
        "id": str(uuid.uuid5(VIF_NAMESPACE, f"song:vif:{sequence}:{title}")),
        "church_id": VIF_CHURCH_ID,
        "title": title.strip(),
        "sequence": sequence,
        "sections": [
            {"kind": kind, "label": label, "lines": lines}
            for (kind, label, lines) in typed_sections
            if lines
        ],
        "author": author,
        "language": language,
        "visibility": "private",
        "forked_from": None,
        "created_at": now,
        "updated_at": now,
    }


def find_remaining_issues(songs: list[dict]) -> list[str]:
    """Liste les chants qui méritent une révision manuelle après migration."""
    issues = []
    for s in songs:
        title = s["title"]
        seq = s["sequence"]
        # Heuristique : sections vides ou trop d'une seule ligne
        if not s["sections"]:
            issues.append(f"- [{seq}] {title!r} : **aucune section parsée**")
            continue
        # Mots avec multiples apostrophes consécutives → résidu d'encodage suspect
        joined = " ".join(
            " ".join(sec["lines"]) for sec in s["sections"]
        )
        if re.search(r"\w'\w'\w", joined):
            issues.append(
                f"- [{seq}] {title!r} : apostrophes multiples — accents français possiblement perdus"
            )
        # Aucun auteur extrait sur un chant > 5 sections
        if s["author"] is None and len(s["sections"]) >= 4:
            issues.append(f"- [{seq}] {title!r} : auteur non extrait")
    return issues


def main():
    if not SRC.exists():
        print(f"ERREUR : {SRC} introuvable. Lancer d'abord : node scripts/extract-old-data.mjs", file=sys.stderr)
        return 1

    raw = json.loads(SRC.read_text(encoding="utf-8"))
    now = "2026-06-09T00:00:00Z"
    encoding_stats: Counter = Counter()

    songs = [migrate(r, encoding_stats, now) for r in raw]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(songs, ensure_ascii=False, indent=2), encoding="utf-8")

    # Église VIF (graine du tenant)
    churches = [{
        "id": VIF_CHURCH_ID,
        "name": "VIF",
        "slug": "vif",
        "branding": {},
        "locale_default": "mg",
        "plan": "free",
        "created_at": now,
        "updated_at": now,
    }]
    CHURCH_OUT.write_text(json.dumps(churches, ensure_ascii=False, indent=2), encoding="utf-8")

    # Rapport
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    lang_count = Counter(s["language"] for s in songs)
    no_section = [s for s in songs if not s["sections"]]
    no_author = [s for s in songs if not s["author"]]
    avg_sections = sum(len(s["sections"]) for s in songs) / max(len(songs), 1)
    issues = find_remaining_issues(songs)

    report_lines = [
        "# Rapport de migration des chants VIF",
        "",
        f"- Chants en entrée : **{len(raw)}**",
        f"- Chants en sortie : **{len(songs)}**",
        f"- Sections moyennes par chant : **{avg_sections:.1f}**",
        f"- Chants sans aucune section : **{len(no_section)}**",
        f"- Chants sans auteur extrait : **{len(no_author)}**",
        "",
        "## Distribution des langues",
        "",
    ]
    for lang, n in lang_count.most_common():
        report_lines.append(f"- `{lang}` : {n}")
    report_lines += [
        "",
        "## Corrections d'encodage appliquées",
        "",
    ]
    for k, v in encoding_stats.most_common():
        report_lines.append(f"- `{k}` : {v}")
    report_lines += [
        "",
        f"## À revoir manuellement ({len(issues)} cas)",
        "",
    ]
    report_lines.extend(issues if issues else ["_(aucun cas signalé)_"])

    REPORT.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    print(f"OK {len(songs)} chants → {OUT}")
    print(f"OK 1 église → {CHURCH_OUT}")
    print(f"OK rapport → {REPORT}")
    print(f"   langues : {dict(lang_count)}")
    print(f"   sections moy. : {avg_sections:.1f}")
    print(f"   à revoir : {len(issues)} cas")
    return 0


if __name__ == "__main__":
    sys.exit(main())
