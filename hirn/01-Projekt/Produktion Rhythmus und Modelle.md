---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §4
tags: [konto/gemeinsam, produktion, modelle, tokens]
---

# Produktion: Rhythmus und Modelle

## Rhythmus (verbindlich seit 02.11.)
- Pro Tag **genau 4 Videos, 2 je Account, für den nächsten Tag**. Nach der Abnahme plant Claude sie in Buffer ein.
- **Nie mehr als diese 4 gleichzeitig in Arbeit**, Produktions-Agenten gestaffelt, **höchstens 2 Agenten gleichzeitig** (am 01.11. rissen 8–10 parallele Agenten das 5-Stunden-Limit).
- Reihenfolge laut Plänen ([[Pläne und Kalender]]); **Produktion nur auf Startsignal des Inhabers.**
- Grund der Grenze: Die Tokens begrenzen, nicht mehr die Zeit (seit der PC rendert, siehe [[Render-Dienst Windows-PC]]).

## Skills sind Pflicht, strikt getrennt
Vor der Arbeit `SKILL.md` und die dort genannten Dateien lesen.
| Account | Skill | Hirn-Einstieg |
|---|---|---|
| 1 `@simulierbar` | `.claude/skills/simulierbar-video/` | [[Account Simulierbar Überblick]] |
| 2 `@stelldirvor.pov` | `.claude/skills/stelldirvor-video/` | [[Account stelldirvor.pov Überblick]] |
Muster: `pipeline/projekte/_demo-simulierbar/`, `_demo-lunar-pov/` (nicht posten). Regeln nie mischen: [[Trennung der Accounts]].

## Pipeline (beide Accounts, Unterschiede in den Skills)
1. Thema + Konkurrenz-Check + Themen-Logik
2. Rechnung als Code mit Tests (`pipeline/sim/`)
3. Skript + Regie-Text (`skript.json`, Quellen nur intern)
4. Stimme (nur Account 1)
5. Szene in Three.js
6. Standbilder prüfen, Rendern (auf dem PC, Rückfall Cloud)
7. Ton/Mix
8. Prüfung (`qc/massstab.py` bzw. `qc/referenz_pov.py`, Text-Überlappung, Kontaktbogen, Skript-Bild-Abgleich, Lautheit)
9. Buffer + `--nachpruefen` ([[Plattformregeln und Posting]])
Werkzeuge: `pipeline/README.md`.

## Nur Three.js und/oder Blender (31.10.)
Auch kombiniert (Blender backen → glTF → Three.js, ca. 0,9 s/Bild). Keine anderen Video-, Vorlagen- oder KI-Generatoren. HUD, Untertitel, Karten sind HTML/CSS in der Three.js-Seite. Cycles nur für Standbilder, Logo, Kurzszenen. Referenz-Repo: github.com/stochosfrance/lowpoly-reel (MIT).

## Stil (Account 1)
Genau einer der Stile 17–21, Wahl mit Konkurrenz-Recherche und Begründung in `skript.json → stil_begruendung`, nie zweimal derselbe Stil hintereinander. Stile 1–15 nicht mehr für Simulierbar (Baukästen bleiben im Repo); Stil 16 Lunar-POV nur Account 2. Siehe [[Stile 17 bis 21]].

## Modelle und Tokens
| Aufgabe | Modell |
|---|---|
| tägliche Produktion | **Sonnet 5.5**, Agenten **ausdrücklich mit `model: sonnet`** (sonst erben sie Opus) |
| Architektur, neue Welten/Objekttypen, Abnahme | Opus 5.5 |
| Titel, Beschreibungen, Hashtags | Haiku 5.5 |
| Fable 5.1 | lohnt nicht |
| Warten auf Renders | ohne Modell (Hintergrund-Befehl, kostet keine Tokens) |
- Verbrauch über `/usage`; bei erreichtem Limit Credits zukaufen, Max 20x oder warten.
- Kapazität (**S**): Claude Max 5x trägt 2 Videos/Tag/Account mit ca. 10–20 % des Abos.
- **Tokens sparen:** Rendern auf dem PC statt Warten in der Cloud (Entscheidung 02.11.; das Warten kostet allerdings ohnehin keine Tokens, gespart wird Zeit), Wissen kompakt halten ([[Wie dieses Hirn funktioniert]]), Sonnet für Routine, Opus nur gezielt.

## Siehe auch
[[Render-Dienst Windows-PC]] · [[Arbeitsregeln und Sicherheit]] · [[Index]]
