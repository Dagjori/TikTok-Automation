---
typ: plan
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §9, data/plan/
tags: [konto/gemeinsam, plan, kalender]
cssclasses: [konto-gemeinsam, typ-plan]
---

# Pläne und Kalender

> **Seit 02.11.2026 (Entscheidung des Inhabers) gibt es keinen 30-Tage-Plan mehr.** Die Pläne unten sind **Archiv** (Dateien bleiben im Repo). Themen entstehen täglich neu: 10 Ideen je Account, der Inhaber wählt 2 ([[Claude-Chat-Workflow]]). Gültig bleiben Posting-Zeiten, Trend-Kalender und Radar.

| | Simulierbar (Account 1) | stelldirvor.pov (Account 2) |
|---|---|---|
| Plan-Datei | `data/plan/30-tage.csv` (81 Zeilen: 6 vom 31.10.–02.11., 60 neue 03.11.–02.12., 15 Reserve) | `data/plan/account2-30-tage.csv` (60 + 15 Reserve) |
| Cockpit/Captions | `data/plan/simulierbar-plan.json` | `data/plan/account2-plan.json` |
| PDF | `docs/plan/30-tage-plan.pdf` (`node tools/plan_pdf.mjs`) | `docs/plan/account2-30-tage-plan.pdf` (`node tools/plan_pdf.mjs --plan account2`) |
| Übersicht | – | `tools/account2_uebersicht.py` (HTML/PDF) |
| Score | Ø 82,3 (**S**), Termin-Videos Priorität A | 73–92, Ø 83,3 |
| Regeln | [[Themenplan Simulierbar]] (Archiv), [[Auswahl- und Finanzregeln Simulierbar]] | [[Themen und Plan Account 2]], [[Konkurrenz-Check und Sperrliste Account 2]] |

## Gemeinsam
- **Posting-Zeiten:** `data/plan/posting_zeiten.json` ([[Plattformregeln und Posting]]).
- **Ideenlisten:** `data/ideen/` (9 Nischen × 150 Ideen: geld-duell, testlauf, geschichte, koerper, tiere, technik, gedankenexperimente, alltagsphysik, weltraum).
- **Trend-Kalender:** `data/trends/kalender.csv`, Trend-Log `data/trends/trend-log.csv`, Vorschläge `docs/trends/vorschlaege.md` ([[Trend-Radar]]).
- **Konkurrenz-Check** vor jeder Produktion (5 Min.); der Radar prüft am Vortag erneut; Treffer sperrt das Thema, dann Reserve. Monitor: `tools/monitor_kanaele.py`, Kanalliste `data/monitor/kanaele.csv`.
- **Rhythmus:** 4 Videos pro Tag (2 je Account) für den nächsten Tag ([[Produktion Rhythmus und Modelle]]).

## Heute (02.11.) und morgen (03.11.)
| Datum | Account 1 | Account 2 |
|---|---|---|
| 02.11. 12:30 / 19:30 | „Fußgängerampel“, „Steuererklärung oder Überstunden“ (alter Stil) | „Eiszeit Toronto“ 19:30 (Referenzformat) |
| 03.11. 12:30 / 19:30 | Taxi (Stil 17), Mittagessen (Stil 19) | „Seil um den Äquator“ (Reserve R11, Berg-/Seeblick), „Sonne 1 m näher“ (Berg-/Seeblick; bewusste Ausnahme von „gleiche Grundwelt nie zweimal am Tag“, 02.11.: keine Reserve erfüllte alle Abstandsregeln; Orte verschieden: Anden/Quito und Atlantikküste) |

## Siehe auch
[[Kanäle und Ziele]] · [[Stand und nächste Schritte]] · [[Cockpit]] · [[Index]]
