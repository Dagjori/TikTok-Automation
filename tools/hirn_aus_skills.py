#!/usr/bin/env python3
"""Erzeugt die Obsidian-Notizen für Account 2 (@stelldirvor.pov) aus dem Skill stelldirvor-video.

Der Skill bleibt die Quelle der Wahrheit für die Videoproduktion. Das Hirn (Ordner hirn/) enthält
dieselben Inhalte als verlinkte Notizen. Nach jeder Änderung am Skill:  python3 tools/hirn_aus_skills.py
Ändere die erzeugten Notizen nicht von Hand (sie werden überschrieben); Änderungen gehören in den Skill.
Die Übersichtsnotizen (Überblick, Format) stehen unten in diesem Skript.
"""
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
QUELLE = WURZEL / ".claude" / "skills" / "stelldirvor-video"
ZIEL = WURZEL / "hirn" / "03-stelldirvor-pov"
DATUM = "2026-11-02"

TITEL = {
    "SKILL.md": "Account stelldirvor.pov Überblick",
    "ablauf.md": "Ablauf Account 2",
    "design.md": "Design Account 2",
    "licht-und-effekte.md": "Licht und Effekte Account 2",
    "ton.md": "Ton Account 2",
    "technik.md": "Technik und Szenenbau Account 2",
    "pruefung.md": "Prüfung und Abnahme Account 2",
    "themen-und-plan.md": "Themen und Plan Account 2",
}
SPERRLISTE = "Konkurrenz-Check und Sperrliste Account 2"
FORMAT = "Format Account 2 Lunar"
TYP = {"SKILL.md": "wissen", "ablauf.md": "regel", "design.md": "regel", "licht-und-effekte.md": "regel",
       "ton.md": "regel", "technik.md": "anleitung", "pruefung.md": "regel", "themen-und-plan.md": "plan"}
TAGS = {"SKILL.md": ["ueberblick"], "ablauf.md": ["ablauf", "skript"], "design.md": ["design", "typografie"],
        "licht-und-effekte.md": ["licht", "effekte", "kamera"], "ton.md": ["ton", "atmo"],
        "technik.md": ["technik", "render", "posting"], "pruefung.md": ["pruefung", "abnahme"],
        "themen-und-plan.md": ["themen", "plan"]}

CLAUDE_ABSCHNITT = {
    "3": "Kanäle und Ziele", "4": "Produktion Rhythmus und Modelle", "5": "Maßstab Simulierbar",
    "6": "Videoaufbau Simulierbar", "7": "Plattformregeln und Posting", "8": "Stimme und Ton Simulierbar",
    "9": "Pläne und Kalender", "10": "Technik und Umgebung", "11": "Stand und nächste Schritte",
    "12": "Entscheidungen Log",
}
GESCHWISTER = ["Account stelldirvor.pov Überblick", FORMAT, "Ablauf Account 2", "Design Account 2",
               "Licht und Effekte Account 2", "Ton Account 2", "Technik und Szenenbau Account 2",
               "Prüfung und Abnahme Account 2", "Themen und Plan Account 2", SPERRLISTE]


def verlinken(text):
    # Verweise auf CLAUDE.md-Abschnitte
    text = re.sub(r"`?CLAUDE\.md`?\s*§(\d+)", lambda m: f"[[{CLAUDE_ABSCHNITT.get(m.group(1), 'Index')}]] (CLAUDE.md §{m.group(1)})", text)
    # Markdown-Links auf Geschwisterdateien
    text = re.sub(r"\[themen-und-plan\.md\]\(themen-und-plan\.md\)\s*§5", f"[[{SPERRLISTE}]]", text)
    text = re.sub(r"\[([^\]]+\.md)\]\(([^)]+\.md)\)", lambda m: f"[[{TITEL.get(m.group(2), m.group(2))}]]", text)
    # Dateinamen in Backticks
    def datei(m):
        name = m.group(1) + ".md"
        return f"[[{TITEL[name]}]]" if name in TITEL else m.group(0)
    text = re.sub(r"`(SKILL|ablauf|design|licht-und-effekte|ton|technik|pruefung|themen-und-plan)\.md`", datei, text)
    text = text.replace("`pruefung.md` §2", "[[Prüfung und Abnahme Account 2]] §2")
    # Konkurrenz-Check-Verweise im Themen-Teil
    text = text.replace("([[Themen und Plan Account 2]] §5)", f"([[{SPERRLISTE}]])")
    text = text.replace("([[Themen und Plan Account 2]] §3)", "([[Themen und Plan Account 2]] §3)")
    return text


def kopf(titel, typ, quelle, tags):
    return ("---\n"
            f"typ: {typ}\nkonto: stelldirvor\nstatus: aktuell\ndatum: {DATUM}\nquelle: {quelle}\n"
            f"tags: [konto/stelldirvor, {', '.join(tags)}]\n---\n\n")


def fuss(titel):
    andere = [f"[[{t}]]" for t in GESCHWISTER if t != titel]
    return ("\n\n## Siehe auch\n" + " · ".join(andere) +
            "\n\nAccount 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: "
            "[[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].\n")


def hinweis(datei):
    return (f"> Quelle: `.claude/skills/stelldirvor-video/{datei}`. Diese Notiz wird mit `python3 tools/hirn_aus_skills.py` "
            "erzeugt. Änderungen bitte im Skill vornehmen, nicht hier. Bei Abweichung gilt der Skill.\n\n")


def inhalt_ohne_kopf(text):
    if text.startswith("---"):
        text = text.split("---", 2)[2]
    return text.strip("\n")


def h1_ersetzen(text, titel):
    zeilen = text.split("\n")
    for i, z in enumerate(zeilen):
        if z.startswith("# "):
            original = z[2:].strip()
            zeilen[i] = f"# {titel}\n\n*{original}*" if original.lower() != titel.lower() else f"# {titel}"
            break
    return "\n".join(zeilen)


UEBERBLICK_KOPF = """## Steckbrief
| | |
|---|---|
| Handle | `@stelldirvor.pov` (angelegt 01.11.2026, in Buffer verbunden, Logo „Fragezeichen-Countdown“ in `marke/account2/`) |
| Format | „Was wäre, wenn …“ als 3D-POV, **keine Stimme**, 80 s, strikt im Format der 4 Referenzvideos von Lunar Animations ([[Format Account 2 Lunar]]) |
| Technik | nur Three.js bzw. Blender; keine KI-Video-Generatoren; Unreal Engine 5 nur bei klarem Vorteil und erst nach Einrichtung des PCs |
| Themen | große globale Wissenschafts-Gedankenexperimente, kein „5 Sekunden“-Rahmen, kein Deutschland-Bezug, keine Alltagsthemen |
| Rhythmus | 2 Videos pro Tag, für den nächsten Tag; Posting Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30; ohne KI-Label ([[Plattformregeln und Posting]]) |
| Pläne | 60 Videos 02.11.–02.12.2026 plus 15 Reserve ([[Themen und Plan Account 2]]) |
| Konto-Kandidat 3 | „Wer war's?“ (animiertes Krimirätsel, Score 70) |

**Getrennt von Account 1:** Folgen-Aufruf, Schlusssatz, Schleife, Untertitel, Stimme, `massstab.py` und die Stile 17–21 gelten hier nicht ([[Trennung der Accounts]]).

"""

FORMAT_NOTIZ = f"""---
typ: wissen
konto: stelldirvor
status: aktuell
datum: {DATUM}
quelle: CLAUDE.md §3, .claude/skills/stelldirvor-video/SKILL.md
tags: [konto/stelldirvor, format, referenz]
---

# Format Account 2 Lunar

Seit 02.11.2026 baut `@stelldirvor.pov` **strikt im Format der 4 Referenzvideos** (Lunar Animations; Inhaber: „halte es strikt genau danach, keine Stimme mehr“). Die Referenzen selbst, Standbilder, Texte und Ton kommen nie ins Repo (öffentlich); hier stehen nur eigene Messwerte und Regeln.

## Das Format in einem Blick
| Merkmal | Regel | Details |
|---|---|---|
| Länge | exakt 80,0 s, 30 fps, 1080 × 1920 | [[Ablauf Account 2]] |
| Stimme | keine, auch keine Untertitel | [[Ton Account 2]] |
| Perspektive | feste Ich-Perspektive von erhöhtem Standpunkt, keine Schnitte | [[Design Account 2]], [[Licht und Effekte Account 2]] |
| Text | genau drei Ebenen: Titelfrage (0,4–4,4 s), Messwert-Anzeige (ab Bild 0 bis ca. 70 s, links), kurze kursive Sätze | [[Design Account 2]] |
| Höhepunkt | 58–62 s, Anzeige zeigt „HIER“ | [[Ablauf Account 2]] |
| Abspann | 72–80 s auf `#111111`: Titelfrage und Faktenzeile „ORT, JAHR · FAKT“ | [[Design Account 2]] |
| Ton | selbst erzeugte Atmo, −14 LUFS, Höhepunkt am lautesten, Abspann leise | [[Ton Account 2]] |
| Kein „5 Sekunden“ | Das Ereignis dauert so lang, wie es physikalisch dauert | [[Account stelldirvor.pov Überblick]] |
| Verboten im Bild | Logo, Kanalname, Sticker, Chips, Karaoke, Folgen-Aufruf, Kommentar-Aufruf | [[Prüfung und Abnahme Account 2]] |

## Gemessene Referenz-Eigenschaften (F, 02.11.)
- Alle vier Referenzen sind exakt 80,0 s lang und folgen demselben Bogen: Alltag → Auslöser (18–25 s) → Eskalation in Stufen → Annäherung → Höhepunkt (58–62 s) → Nachspiel → Abblende → Abspann.
- Bildcharakter: Low-Poly-Welt, flach schattiert, aber filmisch beleuchtet (Dunst, Bloom, Partikel); dichter Detailreichtum; leicht entsättigt, nie knallig.
- Kamera praktisch starr, nur Schwenks, Beben und ein Stoß beim Höhepunkt, danach liegt sie still.
- Lautheit −14,3 bis −14,7 LUFS; Höhepunkt kurzzeitig −9 bis −11 LUFS; Nachspiel dumpf mit Pfeifton.

## Markt (F, 01./02.11.)
US-Videos dieses Formats (Okt. 2026): Median 838.700 Views, Maximum 18,2 Mio., alle 61–80 s. In Deutschland ist das Format kaum besetzt (Fenster offen). Details und gesperrte Themen: [[{SPERRLISTE}]], [[Themen und Plan Account 2]].

## Bekannte Qualitätslücke
Schrift, Layout, Abspann, Ton und Prüfung treffen die Referenzen. **Die 3D-Welt noch nicht** (Detaildichte, Wolken, Rauch, leere Höhepunkt-Bilder). Jeder Erstbau einer Grundwelt hebt sie auf Referenzniveau, bevor das erste Video darin entsteht.

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Trennung der Accounts]] · [[Index]]
"""


def schreiben(titel, text):
    (ZIEL / f"{titel}.md").write_text(text.rstrip("\n") + "\n", encoding="utf-8")


def main():
    ZIEL.mkdir(parents=True, exist_ok=True)
    for datei, titel in TITEL.items():
        roh = (QUELLE / datei).read_text(encoding="utf-8")
        text = inhalt_ohne_kopf(roh)
        extra = ""
        if datei == "themen-und-plan.md":
            a = text.index("## 5. Konkurrenz-Check und Sperrliste")
            b = text.index("## 6. Bewusst nicht im Plan")
            c = text.index("## 10. Quellen des Konkurrenz-Checks")
            sperr = text[a:b].rstrip() + "\n\n" + text[c:].rstrip()
            text = (text[:a] + f"## 5. Konkurrenz-Check und Sperrliste\nSteht in der eigenen Notiz [[{SPERRLISTE}]] (Methode, Lunar-Themen, US-Konten, deutscher Markt, Quellen).\n\n" + text[b:c]).rstrip()
            sperr_text = kopf(SPERRLISTE, "regel", ".claude/skills/stelldirvor-video/themen-und-plan.md §5 und §10", ["sperrliste", "konkurrenz"]) \
                + hinweis(datei) + f"# {SPERRLISTE}\n\n*Gilt nur für Account 2. Vor jeder Produktion 5 Minuten Konkurrenz-Check; gleiches Thema nur mit klar eigenem Ansatz, sonst nicht.*\n\n" \
                + verlinken(sperr.replace("## 5. Konkurrenz-Check und Sperrliste\n", "")) + fuss(SPERRLISTE)
            schreiben(SPERRLISTE, sperr_text)
        if datei == "SKILL.md":
            text = re.sub(r"^# .*\n", "", text, count=1).lstrip("\n")
            text = h1_ersetzen("# Skill: Video für @stelldirvor.pov (Referenzformat „Lunar-POV“)\n\n" + UEBERBLICK_KOPF + text, titel)
        else:
            text = h1_ersetzen(text, titel)
        voll = kopf(titel, TYP[datei], f".claude/skills/stelldirvor-video/{datei}", TAGS[datei]) + hinweis(datei) + verlinken(text) + fuss(titel)
        schreiben(titel, voll)
    schreiben(FORMAT, FORMAT_NOTIZ)
    print("Notizen erzeugt:", len(TITEL) + 2, "in", ZIEL.relative_to(WURZEL))


if __name__ == "__main__":
    main()
