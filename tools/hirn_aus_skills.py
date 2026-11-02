#!/usr/bin/env python3
"""Erzeugt die Obsidian-Notizen für Account 2 (@stelldirvor.pov) aus dem Skill stelldirvor-video.

Der Skill bleibt die Quelle der Wahrheit für die Videoproduktion. Das Hirn (Ordner hirn/) enthält
dieselben Inhalte als verlinkte Notizen. Nach jeder Änderung am Skill:  python3 tools/hirn_aus_skills.py
Ändere die erzeugten Notizen nicht von Hand (sie werden überschrieben); Änderungen gehören in den Skill.
Die Übersichtsnotizen (Überblick, Format) stehen unten in diesem Skript.
Stand der Regeln: 02.11.2026 abends (Natur zuerst, Bewegung und Zeitraffer, Kamera darf fahren, kein Plan, keine Sperrliste, Ideen-Studio).
Veraltete Teile des Skills (Sperrliste, 30-Tage-Plan) erzeugen Notizen mit status: veraltet bzw. einen Archiv-Abschnitt (Status der Notiz bleibt aktuell).
Nicht erzeugt (andere Quelle, von diesem Skript unberührt): Regelwerk Account 2, Befehl Ideen und Skripte Account 2.
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
       "ton.md": "regel", "technik.md": "anleitung", "pruefung.md": "regel", "themen-und-plan.md": "regel"}
TAGS = {"SKILL.md": ["ueberblick"], "ablauf.md": ["ablauf", "skript"], "design.md": ["design", "typografie"],
        "licht-und-effekte.md": ["licht", "effekte", "kamera"], "ton.md": ["ton", "atmo"],
        "technik.md": ["technik", "render", "posting"], "pruefung.md": ["pruefung", "abnahme"],
        "themen-und-plan.md": ["themen", "welten", "archiv"]}

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
    text = text.replace("([[Themen und Plan Account 2]] §5)", f"([[{SPERRLISTE}]], veraltet)")
    text = text.replace("([[Themen und Plan Account 2]] §3)", "([[Themen und Plan Account 2]] §3)")
    return text


def kopf(titel, typ, quelle, tags, status="aktuell"):
    return ("---\n"
            f"typ: {typ}\nkonto: stelldirvor\nstatus: {status}\ndatum: {DATUM}\nquelle: {quelle}\n"
            f"tags: [konto/stelldirvor, {', '.join(tags)}]\n---\n\n")


def archiv_hinweis(was):
    return (f"> **Veraltet seit 02.11.2026, nur Archiv.** {was} Die Notiz bleibt zur Nachvollziehbarkeit erhalten (Entscheidung des Inhabers); "
            "gültig ist [[Themen und Plan Account 2]] mit dem Weltenkatalog und der Kopierregel (keine 1:1-Kopie).\n\n")


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
| Format | „Was wäre, wenn …“ als 3D-POV, **keine Stimme**, 80 s, Referenzformat der 4 Lunar-Videos (Text, Layout, Ton, Abspann; [[Format Account 2 Lunar]]), aber **eigene Welt**: eine durchgehende Einstellung, die Kamera darf **langsam fahren, schwenken und zoomen**, keine harten Schnitte |
| Welt | passt zum Thema, **Natur zuerst**, keine Standard-Skyline; Weltvielfalt (nie zweimal derselbe Welttyp hintereinander, Tageszeit wechselt, Standpunkte vielfältig, nicht immer erhöht); Weltenkatalog in [[Themen und Plan Account 2]] |
| Bewegung | nie warten: alle 2–3 s eine sichtbare, themenbezogene Veränderung, mehrere Phasen, Leben in der Welt; Zeitraffer mit Faktor im Skript, die Anzeige läuft passend dazu ([[Ablauf Account 2]]) |
| Technik | nur Three.js bzw. Blender; keine KI-Video-Generatoren; Unreal Engine 5 nur bei klarem Vorteil und erst nach Einrichtung des PCs |
| Themen | spannende „Was wäre, wenn …“-Gedankenexperimente mit **messbarer Größe**, ein Ereignis von einem Standpunkt aus; Themenbreite flexibel (Wissenschaft, Natur, Geografie, Geschichte, Technik …), Orte weltweit **auch Deutschland**, Texte deutsch; **5-Sekunden-Rahmen erlaubt**; Alltagsthemen ohne messbare Größe ungeeignet; **keine 1:1-Kopie** fremder Videos |
| Rhythmus | 2 Videos pro Tag, für den nächsten Tag; der Inhaber bekommt täglich 10 Videoideen (Ideen-Studio / Claude Chat), wählt 2, das Skript entsteht dort; Posting Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30; ohne KI-Label ([[Plattformregeln und Posting]], [[Claude-Chat-Workflow]], [[Befehl Ideen und Skripte Account 2]]) |
| Plan und Sperrliste | **kein 30-Tage-Plan, keine Abstandsregeln nach Plan, keine Sperrliste mehr** (veraltet seit 02.11.2026, nur Archiv: [[Konkurrenz-Check und Sperrliste Account 2]]); stattdessen Weltvielfalt, nicht zwei gleiche Enden am selben Tag, Tageszeit-Abwechslung |
| Qualität | Dramaturgie und Qualitätslatte: von der ersten Sekunde fangen, Spannung steigern, nichts Übertriebenes, „sieht es billig aus?“ → Abnahme verweigern ([[Ablauf Account 2]], [[Prüfung und Abnahme Account 2]]) |
| Lernschleife | täglich 20:00 Uhr (Berlin) Auswertung der Buffer-Zahlen, Verbesserungsvorschläge zur Freigabe, erst danach ändert sich eine Regel ([[Lernschleife und Insights]]); `lern_notizen` in jeder `skript.json` |
| Kurzfassung | [[Regelwerk Account 2]] (für den Inhaber), gemeinsamer Überblick [[Regelwerk]] |
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

Seit 02.11.2026 baut `@stelldirvor.pov` im **Referenzformat der 4 Videos** von Lunar Animations (Inhaber: „halte es strikt genau danach, keine Stimme mehr“). Das gilt für Text, Layout, Ton und Abspann. **Seit 02.11.2026 abends ist die Welt eigenständig:** Natur zuerst, viel Bewegung, die Kamera darf langsam fahren (Regeln des Inhabers, siehe unten). Die Referenzen selbst, Standbilder, Texte und Ton kommen nie ins Repo (öffentlich); hier stehen nur eigene Messwerte und Regeln. Der Inhaber kann weitere Vorbild-Videos schicken (Auswertung wie bisher, nur abstrahierte Messwerte).

## Das Format in einem Blick
| Merkmal | Regel | Details |
|---|---|---|
| Länge | exakt 80,0 s, 30 fps, 1080 × 1920 | [[Ablauf Account 2]] |
| Stimme | keine, auch keine Untertitel | [[Ton Account 2]] |
| Perspektive | Ich-Perspektive von einem festen Standpunkt (nicht immer erhöht), **eine durchgehende Einstellung**: langsame Fahrt, Schwenk und Zoom erlaubt, **keine harten Schnitte** | [[Design Account 2]], [[Licht und Effekte Account 2]] |
| Welt | passt zum Thema, Natur zuerst, Weltvielfalt | [[Themen und Plan Account 2]] |
| Bewegung | alle 2–3 s eine sichtbare Veränderung, Zeitraffer mit Faktor im Skript | [[Ablauf Account 2]], [[Licht und Effekte Account 2]] |
| Text | genau drei Ebenen: Titelfrage (0,4–4,4 s), Messwert-Anzeige (ab Bild 0 bis ca. 70 s, links), kurze kursive Sätze | [[Design Account 2]] |
| Höhepunkt | 58–62 s, Anzeige zeigt „HIER“ | [[Ablauf Account 2]] |
| Abspann | 72–80 s auf `#111111`: Titelfrage und Faktenzeile „ORT, JAHR · FAKT“ | [[Design Account 2]] |
| Ton | selbst erzeugte Atmo, −14 LUFS, Höhepunkt am lautesten, Abspann leise | [[Ton Account 2]] |
| „5 Sekunden“-Rahmen | erlaubt, wenn sich das Thema gut simulieren lässt (Verbot aufgehoben 02.11.2026 abends) | [[Account stelldirvor.pov Überblick]] |
| Verboten im Bild | Logo, Kanalname, Sticker, Chips, Karaoke, Folgen-Aufruf, Kommentar-Aufruf | [[Prüfung und Abnahme Account 2]] |
| Kopierregel | keine 1:1-Kopie von Sätzen, Etiketten, Faktenzeilen, Bild- und Szenenideen; Themen sind frei, gleiches Thema nur mit eigenem Skript und deutlich anderem Design | [[Themen und Plan Account 2]] |

## Was wir seit 02.11. abends bewusst anders machen als die Referenzen
Anlass: Das erste Video („Eiszeit Toronto“) war formal korrekt, gefiel dem Inhaber aber nicht: zu fixiert auf Stadt und Skyline, zu wenig Bewegung („es wird gewartet und nichts passiert“), immer derselbe erhöhte Standpunkt.
- **Welt und Standpunkt:** Natur zuerst (Meer, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe), Stadt nur, wenn das Thema sie braucht; Standpunkte vielfältig (Strand, Bootsdeck, Lichtung, Gipfel, Dünen, Eisfläche, Straße). Weltenkatalog und Weltvielfalt: [[Themen und Plan Account 2]].
- **Bewegung und Zeitraffer:** nie warten; mehrere Phasen; Leben in der Welt; Zeitraffer sichtbar, Faktor im Skript, Anzeige läuft passend ([[Ablauf Account 2]]).
- **Kamera:** die Referenzen standen fast starr (F); bei uns ist Ruhe der Normalfall im Alltagsteil, Fahrt, Schwenk und Zoom sind erlaubt und gewollt ([[Licht und Effekte Account 2]]).
- **Dramaturgie:** von der ersten Sekunde fangen, Spannung steigern, Qualitätslatte ([[Ablauf Account 2]], [[Prüfung und Abnahme Account 2]]).

## Gemessene Referenz-Eigenschaften (F, 02.11.)
- Alle vier Referenzen sind exakt 80,0 s lang und folgen demselben Bogen: Alltag → Auslöser (18–25 s) → Eskalation in Stufen → Annäherung → Höhepunkt (58–62 s) → Nachspiel → Abblende → Abspann.
- Bildcharakter: Low-Poly-Welt, flach schattiert, aber filmisch beleuchtet (Dunst, Bloom, Partikel); dichter Detailreichtum; leicht entsättigt, nie knallig.
- Kamera in den Referenzen praktisch starr, nur Schwenks, Beben und ein Stoß beim Höhepunkt, danach liegt sie still (bei uns Normalfall nur im Alltagsteil, siehe oben).
- Lautheit −14,3 bis −14,7 LUFS; Höhepunkt kurzzeitig −9 bis −11 LUFS; Nachspiel dumpf mit Pfeifton.

## Markt (F, 01./02.11.)
US-Videos dieses Formats (Okt. 2026): Median 838.700 Views, Maximum 18,2 Mio., alle 61–80 s. In Deutschland ist das Format kaum besetzt (Fenster offen). Archiv der Konkurrenz-Recherche (Sperrliste veraltet seit 02.11.2026): [[{SPERRLISTE}]]; aktuelle Themenregeln: [[Themen und Plan Account 2]].

## Bekannte Qualitätslücke
Schrift, Layout, Abspann, Ton und Prüfung treffen die Referenzen. **Die 3D-Welt noch nicht** (Detaildichte, Wolken, Rauch, leere Höhepunkt-Bilder; beim Eiszeit-Video zusätzlich gleichförmige Gebäude, milchige Winterphase, glasige Eiswand, zu frühe Weißblende, Leerlauf in der Mitte, springende Spiegelung). Jeder Erstbau eines Welttyps hebt die Welt auf Referenzniveau, bevor das erste Video darin entsteht.

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
            b = text.index("## 6. Archiv: 30-Tage-Plan")
            c = text.index("## 7. Quellen des Konkurrenz-Checks")
            sperr = text[a:b].rstrip() + "\n\n" + text[c:].rstrip()
            text = (text[:a] + f"## 5. Konkurrenz-Check und Sperrliste (VERALTET seit 02.11.2026, nur Archiv)\nSteht in der eigenen Notiz [[{SPERRLISTE}]] (Status veraltet: Methode, Lunar-Themen, US-Konten, deutscher Markt, Quellen). Gültig bleibt nur die Kopierregel aus §1 (keine 1:1-Kopie).\n\n" + text[b:c]).rstrip()
            sperr_text = kopf(SPERRLISTE, "regel", ".claude/skills/stelldirvor-video/themen-und-plan.md §5 und §7", ["sperrliste", "konkurrenz", "archiv"], status="veraltet") \
                + archiv_hinweis("Die Sperrliste (Lunar Animations, US-Konten, deutscher Markt) entfällt, auch die der US-Konten und von Lunar; deren Themen sind frei und dürfen auf Deutsch umgesetzt werden.") \
                + hinweis(datei) + f"# {SPERRLISTE}\n\n*Gilt nur für Account 2. Es bleibt die Kopierregel: keine 1:1-Kopie von Sätzen, Etiketten, Faktenzeilen, Bild- und Szenenideen; gleiches Thema nur mit eigenem Skript und deutlich anderem Design.*\n\n" \
                + verlinken(sperr.replace("## 5. Konkurrenz-Check und Sperrliste (VERALTET seit 02.11.2026, nur Archiv)\n", "")) + fuss(SPERRLISTE)
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
