---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: CLAUDE.md §4, cockpit/README.md, .claude/skills/video-produktion/SKILL.md
tags: [konto/gemeinsam, produktion, modelle, tokens]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Produktion: Rhythmus und Modelle

## Rhythmus (verbindlich seit 02.11.)
- Pro Tag **genau 4 Videos, 2 je Account, für den nächsten Tag**. Nach der Abnahme plant Claude sie in Buffer ein.
- **Nie mehr als diese 4 gleichzeitig in Arbeit**, Produktions-Agenten gestaffelt, **höchstens 2 Agenten gleichzeitig** (am 01.11. rissen 8–10 parallele Agenten das 5-Stunden-Limit).
- **Themen:** kein 30-Tage-Plan mehr. Täglich 10 Ideen je Account, der Inhaber wählt, Recherche und Skript entstehen im Cockpit, der Inhaber gibt frei ([[Claude-Chat-Workflow]]); **die Produktion startet von selbst, sobald alle Skripte eines Tages freigegeben sind** (Automatik des Cockpits, [[Cockpit]]).
- **Reihenfolge (Inhaber 06.11.):** zuerst beide 12:30-Videos bis Buffer, dann die 19:30-Videos.
- Grund der Grenze: Die Tokens begrenzen, nicht mehr die Zeit (seit der PC rendert, siehe [[Render-Dienst Windows-PC]]).

## Agenten-Aufträge als Checkliste (seit 02.11. spätabends)
- Jeder Auftrag an einen Agenten besteht aus **nummerierten Aufgaben** (eine Aufgabe = ein prüfbares Ergebnis, z. B. „Datei X ändern“, „Test Y ausführen“).
- Der Agent meldet je Nummer **„erledigt“ oder „offen“ mit Beleg** (Datei, Testausgabe, Befehl).
- Claude prüft die Rückmeldung **gegen die Aufgabenliste**, bevor etwas als fertig gilt; fehlende Punkte gehen zurück an den Agenten oder werden dem Inhaber als offen gemeldet.
- Regel im Wortlaut: [[Rolle und Kommunikation]].

## Skills sind Pflicht, strikt getrennt
Seit 09.11.2026 drei Skills in fester Reihenfolge: `themen-skript` → `stimme-elevenlabs` (nur Account 1) → `video-produktion`. Vor der Arbeit `SKILL.md` und die Teil-Datei des Accounts lesen. Übersicht mit Übergaben: [[Pipeline und Skills]].
| Account | Teil-Dateien | Hirn-Einstieg |
|---|---|---|
| 1 `@simulierbar` | `themen-skript/simulierbar.md`, `stimme-elevenlabs/SKILL.md`, `video-produktion/simulierbar.md` | [[Account Simulierbar Überblick]] |
| 2 `@stelldirvor.pov` | `themen-skript/stelldirvor.md`, `video-produktion/stelldirvor.md` (keine Stimme) | [[Account stelldirvor.pov Überblick]] |
Muster: `pipeline/projekte/_demo-simulierbar/`, `_demo-lunar-pov/` (nicht posten). Regeln nie mischen: [[Trennung der Accounts]].

## Pipeline der Produktion (beide Accounts, Unterschiede in den Skills)
1. Freigegebenes Skript liegt vor; Eingangsprüfung (Regeln des Accounts, Originalität laut Feld `originalitaet`, keine 1:1-Kopie)
2. Rechnung als Code mit Tests (`pipeline/sim/`)
3. `skript.json` mit Sprechtext (Quellen nur intern)
4. Stimme (nur Account 1): kostenlose Textprüfung, dann **genau eine Aufnahme**; das Video folgt der Stimme
5. Szene in Three.js (bei Bedarf 1–2 Blender-Schlüsselszenen)
6. Standbilder prüfen, Rendern (auf dem PC, Rückfall Cloud)
7. Ton/Mix
8. Prüfung (`qc/massstab.py` bzw. `qc/referenz_pov.py`, Text-Überlappung, Kontaktbogen, Skript-Bild-Abgleich, Lautheit)
9. Buffer + `--nachpruefen` ([[Plattformregeln und Posting]])
Werkzeuge: `pipeline/README.md`.

## Technik (Entscheidung 09.11.2026)
**three.js ist der Kern.** Blender ohne Oberfläche für 1–2 realistische Schlüsselszenen je Video oder zum Backen von Objekten (Blender → glTF → Three.js). Remotion nur als Probelauf. Keine anderen Video-, Vorlagen- oder KI-Generatoren. HUD, Untertitel und Karten sind HTML/CSS in der Three.js-Seite. Einzelheiten: [[Technik und Umgebung]], `.claude/skills/video-produktion/technik.md`.

## Stil (Account 1)
Genau einer der Stile **1–15 und 17–21** (Stil 16 gehört Account 2) (Entscheidung 02.11. abends: alle wieder erlaubt, mit Qualitätslatte), Wahl mit Begründung in `skript.json → stil_begruendung`, nie zweimal derselbe Stil hintereinander. Stil 16 Lunar-POV nur Account 2. Qualitätslatte: [[Prüfung und Abnahme Simulierbar]]. Siehe [[Stile 17 bis 21]].

## Modelle und Tokens
| Aufgabe | Modell |
|---|---|
| tägliche Produktion **von der Steuerung bis zur Abnahme** (feste Regel im Cockpit seit 08.11.) | **Sonnet 5.5**, Agenten **ausdrücklich mit `model: sonnet`** |
| Neubau von Grund auf (Stil ohne Baukasten, neuer Welttyp, Objekttyp, Design-Element) | Opus 5.5, **nur als einzelner Agent** für diesen Baustein |
| Architektur, Ideen, Skripte mit Recherche | Opus 5.5 (Modell-Automatik des Cockpits) |
| Titel, Beschreibungen, Hashtags | Haiku 5.5 |
| Fable 5.1 | lohnt nicht |
| Warten auf Renders | ohne Modell (Hintergrund-Befehl, kostet keine Tokens) |
- **Feste Regel (Inhaber 08.11.2026):** „es kann nicht sein dass das ganze limit genutzt wird nur für 1 video“. Was wir schon gebaut haben, baut Sonnet; Abwandlungen (Farben, Zahlen, Kamerafahrt, Variante einer vorhandenen Welt) sind kein Neubau. Das Cockpit startet die Produktion mit Sonnet (`cockpit/lib/modelle.mjs`) und zeigt jeden Opus-Agenten im Feed.
- **Qualität:** jedes Video 1080×1920 (Bedingung für den CRP-Zusatzbonus, [[CRP Creator Rewards Program]]); Render, Prüfskripte, Render-Dienst und Buffer prüfen das.
- Verbrauch über `/usage`; bei erreichtem Limit Credits zukaufen, Max 20x oder warten.
- Kapazität (**S**): Claude Max 5x trägt 2 Videos/Tag/Account mit ca. 10–20 % des Abos.
- **Tokens sparen:** Rendern auf dem PC statt Warten in der Cloud (Entscheidung 02.11.; das Warten kostet allerdings ohnehin keine Tokens, gespart wird Zeit), Wissen kompakt halten ([[Wie dieses Hirn funktioniert]]), Sonnet für Routine, Opus nur gezielt.

## Siehe auch
[[Render-Dienst Windows-PC]] · [[Arbeitsregeln und Sicherheit]] · [[Index]]
