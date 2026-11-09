---
typ: plan
konto: simulierbar
status: veraltet
datum: 2026-11-02
quelle: data/plan/30-tage.csv, data/plan/simulierbar-plan.json, data/plan/posting_zeiten.json, tools/plan_pdf.mjs, CLAUDE.md §9, .claude/skills/simulierbar-video/themen.md §4 §7 §9
tags: [konto/simulierbar, plan, 30-tage, reserve, termine, priorität, archiv, veraltet]
cssclasses: [konto-simulierbar, typ-plan]
---

# Themenplan Simulierbar

> [!warning] Veraltet seit 02.11.2026 (Entscheidung des Inhabers), nur Archiv
> Es gibt **keinen 30-Tage-Plan mehr**. Die Dateien `data/plan/30-tage.csv`, `data/plan/simulierbar-plan.json` und das Plan-PDF `docs/plan/30-tage-plan.pdf` bleiben als Archiv im Repo (nicht gelöscht), steuern aber nichts mehr. Themen entstehen täglich neu: Der Inhaber bekommt 10 Videoideen (Ideen-Studio/Claude Chat), wählt 2 für den nächsten Tag, das Skript entsteht dort; Claude Code beginnt mit „Skript liegt vor“ ([[Claude-Chat-Workflow]], [[Befehl Ideen und Skripte Simulierbar]], [[Videoaufbau Simulierbar]]). Auch die Rubrik ALLTAG, die Sperrliste, die Stil-Zuordnung je Zeile (nur 17–21) und die Regel „mind. 50 von 60 GELD“ gelten nicht mehr. Gültige Auswahl- und Finanzregeln, Zahlen und Termine: [[Auswahl- und Finanzregeln Simulierbar]]. Alles unten ist der Stand vom 02.11. vor den Neuregeln.

Der 30-Tage-Plan war die **Reihenfolge**, Produktion auf Zuruf des Inhabers (kein Autopilot, Entscheidung 31.10.); der Rhythmus ist genau 2 Videos/Tag für den nächsten Tag ([[Produktion Rhythmus und Modelle]]). Die Daten selbst liegen im Repo und werden hier **nicht kopiert**, nur beschrieben. Allgemeine Planlogik beider Accounts: [[Pläne und Kalender]]. Auswahlregeln und Sperren: [[Sperrliste und Auswahlregeln Simulierbar]].

## Dateien
| Datei | Inhalt |
|---|---|
| `data/plan/30-tage.csv` | 81 Zeilen: 6 vom 31.10.–02.11. (alt, gepostet bzw. eingeplant) + **60 neue 03.11.–02.12.** (2 je Tag, 30 Tage) + **15 Reserve** (`datum` = reserve) |
| `data/plan/simulierbar-plan.json` | 75 Einträge (die 60 neuen + 15 Reserve) mit denselben Feldern plus `caption_vorschlag` |
| `data/plan/posting_zeiten.json` | Slots `mittag`/`abend` je Wochentag (Europe/Berlin) |
| `docs/plan/30-tage-plan.pdf` | PDF des Plans (`node tools/plan_pdf.mjs`) |
| `data/ideen/` | Ideenlisten, 9 Nischen × 150 (Simulierbar-Kombi: `geld-duell.csv`, `testlauf.csv`) |
| Cockpit | Sammlung `videos` (ein Dokument je Video, 120 Themen als `idee`, Stand 02.11.), Status täglich gepflegt ([[Cockpit]]) |

## Spalten der CSV
`datum` · `slot` (mittag/abend) · `titel` (Frage-Form „A oder B: Was … wirklich?“) · `rubrik` (GELD/ALLTAG, nur intern) · `kernzahl_bzw_twist` (Rechenidee mit (F)/(S)/(B)-Kennung) · `vorlage` (V1 Straße · V2 Stadt/Globus · V3 Duell-Tafel · V4 Zeitachse · V5 Schlange/Menge · V6 Zuhause · V7 Spiel/Zufall, plus Baukasten des Stils; „Erstbau“ = neue Welt nötig) · `stil` (17–21, [[Stile 17 bis 21]]) · `quellen_pruefen` (Werte, die vor Produktion zu klären sind) · `aufwand` (2/3/4) · `prioritaet` (A/B/C) · `status` · `massstab_score` (0–100, S) · `massstab_begruendung` (D/K/B/L/F-Punkte plus Satz) · `hook` · `denkfalle` · `wendung_1` · `wendung_2` · `teamfarben` (zwei Farben ohne Gelb) · `konkurrenz_check` (Ergebnis des Checks, Abgrenzung, Themen-Logik).
- **Aufwand:** 2 = 1,5 Std., 3 = 3 Std., 4 = 5 Std. aktive Agentenarbeit (S); Erstbau eines Stils zusätzlich 3–8 Std. Im Plan: 10 Videos mit Aufwand 2, 43 mit 3, 7 mit 4 (neue 60); dazu 1–3 Std. je Video für themenspezifische Objekte in den Stilen 17–21.
- **Kapazität (S):** ca. 179 Std. Agentenarbeit in 30 Tagen; Cloud-Rückfall ca. 100 Std. Renderzeit, Standard ist der Render-Dienst auf dem PC ([[Render-Dienst Windows-PC]]).
- **Score-Raster:** D 30 (Duell/Rennen mit Zählern) · K 25 (kontraintuitiv mit Bedingung) · B 20 (jeder kennt es) · L 15 (trägt 65–80 s, 2 Wendungen) · F 10 (frei von Konkurrenz/Sperre). Unter 60 fliegt ein Thema raus. Farbstufen im PDF: 85+ top, 75+ gut, 65+ mittel, darunter knapp.

## Kennzahlen des Plans (Stand 02.11.)
| Merkmal | neue 60 (03.11.–02.12.) | Reserve (15) | gesamt (81) |
|---|---|---|---|
| Rubrik | 53 GELD, 7 ALLTAG | – | 69 GELD, 12 ALLTAG |
| Stile | 18: 17 · 20: 14 · 19: 13 · 17: 12 · 21: 4 | je 3 (19, 17, 20, 18, 21) | die 6 alten in Stil 1 (2×), 2, 12/13, 14/5, 4 |
| Priorität | A 18 · B 29 · C 13 | alle C | A 21 · B 32 · C 28 |
| Ø Maßstab-Score (S) | **82,3** (min. 75, max. 92) | 77,5 | 81,3 |
- Der Plan erfüllt die Regeln: mind. 50 von 60 sind GELD (53), **nie zweimal derselbe Stil hintereinander** (geprüft), keiner unter Score 75.
- **Priorität A** = Termin oder Top-Thema (Termin-Videos sind durch das nicht kopierbare Timing am besten geschützt).
- Die 7 ALLTAG-Videos (mit Euro-Ergebnis): Parkhaus oder Parkplatz suchen (05.11.), Selbst umziehen oder Umzugsfirma (12.11.), Winterreifen selbst wechseln oder Werkstatt (13.11.), Lebensmittel liefern lassen oder selbst einkaufen (20.11.), Haare selbst schneiden oder Friseur (22.11.), Selbst streichen oder Maler (29.11.), Putzhilfe oder selbst putzen (01.12.).
- **Nummerierung #n** (in `themen.md`, Termin-Tabelle): laufend ab 03.11. mittag = #1 (Taxi), 03.11. abend = #2; #n = 2 × (Tag ab 03.11.) + 1 (mittag) bzw. + 2 (abend).

## Posting-Zeiten (Startwerte, Entscheidung 01.11.; weiterhin gültig)
Beide Accounts gleich, je 2 Videos/Tag: **Mo–Fr 12:30 (mittag) und 19:30 (abend), Sa–So 09:30 und 19:30** (`data/plan/posting_zeiten.json`, Aufruf `--zeit auto:JJJJ-MM-TT:mittag|abend`). Nach 14 Tagen (16.11.) mit Zahlen aus TikTok Studio nachjustieren; Reihenfolge Wochen 3–5 dann ebenfalls. Hinweis: Die Status-Spalte der 6 alten Zeilen nennt noch die früheren Zeiten (12:00 / 20:00).

## Beispiele (gekürzt aus dem Plan)
| Feld | 03.11. mittag (#1) | 05.11. abend (#6) | 24.11. mittag (#43) |
|---|---|---|---|
| Titel | Eigenes Auto oder jede Fahrt mit dem Taxi: Was ist in der Stadt wirklich billiger? | Minijob oder Überstunden: Womit bleiben dir von 300 € mehr wirklich übrig? | Black Friday oder Januar: Wann ist der Fernseher wirklich billiger? |
| Rubrik · Stil · Prio · Score | GELD · 17 Nachtstadt-Miniatur · A · 90 | GELD · 18 Dunkles Studio · A · 92 | GELD · 17 Nachtstadt-Miniatur · A · 83 |
| Kernzahl/Twist | Kleinwagen in der Stadt ca. 450–500 € im Monat inkl. Wertverlust (S) gegen Taxi ca. 4,50 € Grundpreis + ca. 2,50 € je km (S); Break-even ca. 2.500 km im Jahr bzw. ca. 5 Fahrten pro Woche (B); das Auto steht 23 Stunden am Tag | Netto-Modul: 3.500 € brutto, Klasse 1; 300 € Überstunden = 164,17 € netto; Minijob bis 603 € (F, DRV) neben dem Hauptjob; Unterschied ca. 1.500 € im Jahr (Rechnung) | Black Friday 27.11.2026; Rabatt muss sich auf den niedrigsten Preis der letzten 30 Tage beziehen (F, § 11 PAngV); ein Teil der Produkte kostet im Januar gleich viel oder weniger (S) |
| Hook | Eigenes Auto oder jede Fahrt mit dem Taxi? Was ist in der Stadt wirklich billiger? | Minijob oder Überstunden? Womit bleibt dir von dreihundert Euro mehr wirklich etwas übrig? | Am Black Friday kaufen oder bis Januar warten? Wann ist der Fernseher wirklich billiger? |
| Denkfalle | Klar, Taxi fahren ist Luxus. Oder? | Klar, egal. Dreihundert Euro sind dreihundert Euro. Oder? | Klar, am Black Friday. Da gibt es die größten Rabatte. Oder? |
| Wendung 1 | Nach dem ersten Monat liegt das Taxi vorn: Das Auto hat Versicherung, Steuer und Wertverlust bezahlt, bevor es einen Meter fährt (B) | Bei den Überstunden greifen Lohnsteuer und Sozialabgaben zu. Es bleiben nur 164 Euro (Rechnung) | Der Rabatt-Zähler zeigt dreißig Prozent. Aber der Preis wurde schon im Oktober angehoben (B, prüfen) |
| Wendung 2 | Unter ca. fünf Fahrten pro Woche bleibt das Taxi billiger, darüber kippt es schnell (B) | Der zweite Minijob wird wie normaler Lohn behandelt, dann gewinnen die Überstunden knapp (Rechnung prüfen) | Im Januar fällt der Preis bei vielen Geräten noch einmal (S, prüfen) |
| Teamfarben | Koralle #FF5A5F (eigenes Auto) / Türkis #2EC4B6 (Taxi) | Violett #8E6CFF (Minijob) / Orange #FF8A3D (Überstunden) | Koralle #FF5A5F (Black Friday) / Türkis #2EC4B6 (Januar) |
| Caption | Eigenes Auto oder immer Taxi? 🚕 Ich hab's durchgerechnet. Ab wie vielen Fahrten lohnt sich dein Auto? 👇 #auto #autokosten #taxi #wissen #simulation | (Format wie im Plan-JSON) | (Format wie im Plan-JSON) |

## Die 6 alten Videos (31.10.–02.11., bleiben unverändert)
| Datum | Titel | Rubrik · Stil · Score | Status |
|---|---|---|---|
| 31.10. mittag | GTA 6: Kostet das Krankfeiern die Welt eine Milliarde? | GELD · 1 Low-Poly · 66 | gepostet (alte Version vor dem Maßstab; kein Neubau, Inhaber 01.11.) |
| 31.10. abend | Spurwechsel im Stau: Bist du auf der anderen Spur wirklich schneller? | ALLTAG · 2 Isometrisch · 87 | gepostet (alte Version) |
| 01.11. mittag | Treppe oder Aufzug: Wer ist im Bürohaus wirklich schneller oben? | ALLTAG · 12 Comic-Toon · 91 | gepostet, 74 s |
| 01.11. abend | 200 € mehr Gehalt oder 100 € steuerfrei: Was bringt dir netto mehr? | GELD · 14 Glas-Labor · 78 | gepostet, 66 s (Team „steuerfrei“ gelb, bleibt) |
| 02.11. mittag | Fußgängerampel: Bringt mehrmaliges Drücken des Knopfs etwas? | ALLTAG · 1 Low-Poly · 76 | für 02.11. 12:30 eingeplant (alter Stil, ohne KI-Label) |
| 02.11. abend | Steuererklärung oder Überstunden: Was bringt dir mehr Geld pro Stunde? | GELD · 4 Flat · 84 | für 02.11. 19:30 eingeplant (alter Stil, ohne KI-Label) |
Nachprüfung der Posts vom 02.11. (`post_buffer.py --nachpruefen`) ist noch zu vermerken.

## Reserve (15 Themen, Priorität C)
Bei Ausfall oder Konkurrenztreffer nimmt Claude die Reserve und trägt sie im Cockpit ein. Nummern R1–R15 in CSV-Reihenfolge.

| R | Thema (gekürzt) | Stil · Score | Hinweis |
|---|---|---|---|
| R1 | Monopoly: Schlossallee oder orange Straßen | 19 · 86 | Spielgeld statt echter Euro, Markenname; nur wenn ein Alltag-Slot frei wird |
| R2 | Kfz-Schaden selbst zahlen oder melden | 17 · 78 | Thema bei @clauseinars; nur mit eigenem Winkel über 10 Jahre |
| R3 | Stromtarif: Grundversorgung oder Neukundentarif | 20 · 78 | Nähe zu Anbieterwerbung; nur ohne Aufruf und ohne Anbieter |
| R4 | Krankenkasse wechseln oder bleiben | 18 · 77 | Zusatzbeiträge 2027 erst im Dezember; Anbieter-Nähe |
| R5 | Alter Kühlschrank oder neuer | 19 · 75 | aus altem Plan; Energie-Themen im Plan dicht |
| R6 | Bohrmaschine kaufen oder leihen | 18 · 73 | aus altem Plan; trägt kaum 65 s |
| R7 | Kreditkarte: Mindestrate oder feste 100 € | 20 · 81 | aus altem Plan; Schulden-Themen im Plan schon zweimal |
| R8 | Große Hochzeit oder kleine Feier plus Eigenkapital | 19 · 77 | Themen-Logik grenzwertig; vor Einsatz mit dem Inhaber klären |
| R9 | Möbel selbst aufbauen oder Aufbauservice | 18 · 76 | Alltag-Quote im Plan schon bei 7 |
| R10 | Wohnmobil mieten oder Hotel | 21 · 79 | Sommer-Thema, für März/April |
| R11 | Second Hand oder neu: Kleidung im Jahr | 17 · 77 | nah an der Winterjacke (17.11.) |
| R12 | Bonus auszahlen oder in die Betriebsrente | 20 · 74 | Nähe zu Vorsorgeprodukten; nur reine Modellrechnung |
| R13 | Weihnachtsfahrt mit der Bahn: früh buchen oder kurz vorher | 21 · 74 | Preisdaten nicht öffentlich belegbar |
| R14 | Nachtschicht mit Zuschlag oder Tagschicht | 17 · 78 | kleinere Zielgruppe |
| R15 | 600 km nach Hause: Auto oder Bahn | 21 · 80 | nah an @wissentogo_de (56,5k); nur mit eigenem Winkel |
Offener Punkt: „Rente mit 63“ (04.11. abend, #4) ist politiknah (nur Rechnung, keine Partei, keine Wertung); Tausch mit R7 oder R14 möglich.

## Feste Termine (ohne Kaufaufruf)
| Termin | Datum 2026 | Beleg | Video |
|---|---|---|---|
| Singles Day | Mi 11.11. | (F) laut Plan 31.10. | #17 Zusammenziehen oder getrennt wohnen |
| GTA-6-Release | Do 19.11. | (F) Rockstar Newswire, Stand 31.10.; zweimal verschoben, am 18.11. **prüfen** | #33 Konsole oder Gaming-PC (funktioniert auch ohne Release) |
| Steuerklassen-Wechsel fürs laufende Jahr | bis 30.11. | § 39 Abs. 6 EStG · **prüfen** | #36 am 20.11. |
| Kfz-Wechselstichtag | 30.11. | (F laut Ratgebern, Plan 31.10.) | #42 am 23.11., ohne Wechselaufruf |
| Black Friday / Cyber Monday | Fr 27.11. / Mo 30.11. | Rechnung (Thanksgiving 26.11.) | #43 am 24.11., #49 am 27.11., #55 am 30.11. |
| Weihnachtsgeld | Ende November | (F) etwa die Hälfte der Beschäftigten bekommt es (WSI/Böckler, Plan 31.10.) | #48 Prämie oder 50 € mehr am 26.11. |
| Monatsende | 28.–30.11. | – | #52 Dispo oder Ratenkredit am 28.11. |
| 1. Advent | So 29.11. | Rechnung | #53 Weihnachtsbaum, #56 Wichteln am 30.11. |
| Jahresende Steuer und Vorsätze | Dezember | – | #57 Laptop am 01.12., #59 52-Wochen-Challenge am 02.12. |

Offene Radar-Vorschläge mit Terminbezug (Stand 02.11., Quelle `docs/trends/vorschlaege.md`): Tankrabatt endet 31.12. (Score 80, posten 15.–23.12.), Weihnachtsbaum (70, 01.–08.12.), Heizung nachts (82, spätestens 20.12.; laut Sperrliste gesperrt, nur mit eigenem Winkel) ([[Trend-Radar]]).

## Status und nächste Schritte zum Plan (Stand 02.11. abends)
- **03.11. nach Startsignal des Inhabers:** #1 Taxi (Stil 17, 12:30) und #2 Mittagessen (Stil 19, 19:30, halb gebaut, Szene im Stil 19 neu). Pro Tag genau die 2 Videos für den nächsten Tag, max. 2 Agenten (Sonnet), Render ca. 3–5 Min. je Video auf dem PC. Für den 03.11. fehlen themenspezifische Objekte: Taxi-Schild (Stil 17), Küche/Büro (Stil 19), je 1–3 Std.
- **16.11.:** Auswertung nach 14 Tagen; Posting-Zeiten und Reihenfolge Wochen 3–5 mit Zahlen nachjustieren (Claude, 30 Min.). Auswertung auch nach 28 Videos (Themenfeld-Vergleich).
- **Cockpit:** Freigabe/Ablehnung/Kommentar des Inhabers wird sofort umgesetzt; Ablehnung → Ersatz aus der Reserve.
- Wichtig: Der Plan ist Reihenfolge, kein Autopilot; fertige Videos bleiben unverändert.

## Siehe auch
- [[Auswahl- und Finanzregeln Simulierbar]] (gültig) · [[Sperrliste und Auswahlregeln Simulierbar]] (Archiv) · [[Konkurrenz und Themen Simulierbar]] · [[Stile 17 bis 21]] · [[Videoaufbau Simulierbar]] · [[Account Simulierbar Überblick]]
- [[Pläne und Kalender]] · [[Cockpit]] · [[Trend-Radar]] · [[Produktion Rhythmus und Modelle]] · [[Plattformregeln und Posting]]
