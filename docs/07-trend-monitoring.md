# Trend-Radar

**Stand:** 31.10.2026 · Auftrag des Inhabers:
- „Für die Zukunft behalten wir den TikTok-Markt im Auge, um neue Trends zu erkennen.“
- 31.10.: **täglich** automatisch. Trends selbst vorausahnen, **selbst analysieren und bewerten**. **Nur vorschlagen, was Potenzial hat.**

## Ziel
- Trends **vor dem Höhepunkt** erkennen und rechtzeitig fertige Videos haben.
- Konkurrenz und Regeländerungen täglich im Blick behalten.
- Den Inhaber nur mit geprüften Vorschlägen behelligen.

## Täglicher Lauf (automatisch, 05:35 Uhr Berlin)
Dieser Abschnitt ist die Arbeitsanweisung für die geplante Aufgabe „Trend-Radar Alltag durchgerechnet“. Sie läuft in der festen Sitzung „Trend-Radar täglich (TikTok Automation)“ (Sonnet 5.5; das Repo ist dort als Quelle mit Schreibrecht hinterlegt). Maximal ca. 20 Minuten, sparsam mit Websuchen (höchstens ca. 12 pro Lauf).

1. **Wettbewerbs-Monitor:** `python3 tools/monitor_kanaele.py`
   - Auffällige Kanäle (mindestens +20 % oder mindestens +1.000 Follower) bekommen den Signal-Typ `konkurrenz`.
   - Für jeden auffälligen Kanal die öffentliche Profilseite bzw. die Videoseite des stärksten neuen Videos ansehen: Welches Thema bzw. Format zieht?
2. **Signale sammeln.** Quellen in dieser Reihenfolge:
   1. **Konkurrenz-Signale** aus Schritt 1.
   2. **Vorhersehbare Anlässe (Trend-Kalender):** `data/trends/kalender.csv` lesen. Alles, was in den nächsten 7–45 Tagen liegt, prüfen. Fehlende Termine der nächsten 90 Tage ergänzen: Gesetzes- und Preisänderungen, EZB-Zinsentscheide, Feiertage, Ferienbeginn, Zeitumstellung, Sport-Großereignisse, Shopping-Tage, Steuerfristen, Wetterumschwünge laut Saison.
   3. **Nachrichten mit Alltags- bzw. Geldbezug** der letzten 48 Stunden (Websuche, deutsch), z. B. Preis-, Zins-, Steuer-, Verkehrs- und Bahnthemen.
   4. **Internationale Vorläufer:** neue virale Formate bei den Benchmark-Kanälen (EN) aus `data/monitor/kanaele.csv`. Formate aus den USA kommen oft mit Verzögerung nach Deutschland (Annahme). Ein solches Format ist ein Kandidat, wenn es auf Deutsch noch fehlt.
   5. **Große Ereignisse** aus Popkultur, Gaming, Sport, TV oder Shopping, z. B. Spiele-Release, Finale, Mega-Konzert, Feiertag. Daraus wird die Frage „Was passiert mit der echten Wirtschaft bzw. dem Alltag, wenn alle …?“, gerechnet mit echten Zahlen. Vorlage ist das GTA-6-Video (Idee des Inhabers). Diese Anlässe 2–4 Wochen vorher erkennen, damit genug Vorlauf bleibt.
   6. **Neue Kanäle:** 1–2 Websuchen nach neuen deutschen Simulations- bzw. Rechen-Kanälen. Relevante Treffer kommen in `data/monitor/kanaele.csv`.
3. **Jedes Signal bewerten** (Raster unten). Alle Bewertungen von **Themen-Signalen** kommen als Zeile in `data/trends/trend-log.csv`, auch die verworfenen. Ein Monitor-Lauf ohne auffällige Kanäle ist kein Signal und wird nicht geloggt. Signale, die schon im Log stehen, nicht doppelt bewerten. Nur neu bewerten, wenn sich etwas Wesentliches geändert hat.
4. **Vorschlagen nur bei Score ≥ 70 und ohne K.-o.-Kriterium.** Dann in `docs/trends/vorschlaege.md` oben eintragen:
   - Titel des Videos (als Frage)
   - Rubrik
   - Score mit Kurzbegründung
   - Quelle
   - **spätestes Posting-Datum**
   - Vorschlag zur Umsetzung, eigenständig, keine Kopie. **Immer im Simulierbar-Format:**
     - eine klare Modellrechnung bzw. Simulation pro Video, mit konkreten Fällen statt Massen-Simulation
     - 💶 GELD als Duell (z. B. „Ticket gegen Einzelfahrten gegen Auto“), ⏱️ ALLTAG als Strategie-Vergleich (z. B. „früh einordnen gegen Reißverschluss“)
     - Stil wie `docs/08-beispielskripte.md`
     - **Kein „1.000 Lebensläufe“- bzw. „1.000 simulierte …“-Merkmal** (Entscheidung des Inhabers 31.10., siehe `ENTSCHEIDUNGEN.md`). Formulierungen wie „1.000 simulierte Pendler“ nicht verwenden.
   - Bei passenden Themen zusätzlich als Idee in `data/ideen/geld-duell.csv` bzw. `testlauf.csv` mit `typ` = `news` bzw. `saisonal`.
5. **Regel-Check, jeden Montag:**
   - „Released/Effective“-Datum der Community Guidelines prüfen (`https://www.tiktok.com/community-guidelines/en`).
   - Die CRP-Bedingungen EWR und die Startseite der Creator Academy prüfen.
   - Bei Änderungen einen Vorschlag mit Typ `regel` eintragen (immer vorschlagen, ohne Score).
6. **STATUS.md** nur ergänzen, wenn es neue Vorschläge oder Regeländerungen gibt (eine Zeile unter „Wo wir stehen“).
7. **Committen und pushen** auf `main`.
8. **Letzte Antwort der Sitzung:**
   - Bei neuen Vorschlägen: kurze Liste (Titel, Score, warum jetzt, spätestes Posting-Datum).
   - Sonst genau ein Satz: „Trend-Radar JJJJ-MM-TT: keine neuen Trends mit Potenzial.“

## Bewertungsraster
**K.-o.-Kriterien (sofort verwerfen, nicht vorschlagen):**
- Nicht als eigene Rechnung bzw. Simulation umsetzbar, oder passt in keine Rubrik (GELD bzw. ALLTAG).
- Risiko-Thema laut Ausschlussliste (`docs/06-nischen-ranking.md`): Glücksspiel, Tabak, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik.
- Nur durch Nachbau eines fremden Videos umsetzbar (CLAUDE.md: keine Kopien).
- Höhepunkt liegt in weniger als 2 Tagen und ist nicht vorbereitbar.

**Punkte 1–5 je Kriterium:**

| Kriterium | Gewicht | 5 = | 1 = |
|---|---|---|---|
| Nachfrage-Signal | 30 % | belegte Reichweite (Views, Suchspitze, Leitmedien) | nur Bauchgefühl |
| Timing | 20 % | Trend steigt noch bzw. Termin ist planbar mit mindestens 7 Tagen Vorlauf | Trend ist durch |
| Wettbewerb DE | 15 % | niemand setzt es als Simulation bzw. Rechnung um | mehrere virale Videos im gleichen Format |
| Passung zum Format | 15 % | Simulation mit echtem Aha-Effekt | nur mit Mühe rechenbar |
| Aufwand | 10 % | bestehende Vorlage reicht | neuer Szenentyp nötig |
| Risiko | 10 % | kein Plattform- bzw. Rechtsrisiko | heikel (Steuern, Recht, Politiknähe) |

**Score** = Summe (Gewicht × Punkte) / 5, Bereich 20–100. **Immer mit `python3 tools/trend_score.py N T W P A R` berechnen, nicht im Kopf.**

| Score | Entscheidung |
|---|---|
| ≥ 70 | **vorschlagen** |
| 50–69 | `beobachten` (im Log, nach 7 Tagen erneut prüfen) |
| < 50 | `verworfen` |

## Teil des Inhabers (optional, wöchentlich ca. 5 Minuten)
- In der App ist nur **Inspiration** sichtbar. „Creator Search Insights“ fehlt (Stand 31.10.).
- Wenn Zeit ist: Inspiration öffnen, Screenshot der angezeigten Trends in eine Sitzung mit diesem Repo geben.
- Claude bewertet die Trends nach demselben Raster.

## Regeln
- Nur öffentliche Seiten, keine internen TikTok-APIs, kein Umgehen von Bot-Schutz (CLAUDE.md).
- Nichts außerhalb dieses Repos anlegen.
- Fakten mit Quelle. Schätzungen und Annahmen kennzeichnen.

## Erster Lauf des Wettbewerbs-Monitors (31.10.2026, Vergleich zu 29.10.)
- @kontostand.vs: 418 → 553 Follower (+32 %), ein Video weniger.
- @unnoetig_tiefgruendig: 483 → 580 (+20 %).
- @wissentogo_de: 640 → 740 (+16 %), +2 Videos.
- Große Kanäle stabil (weniger als 1 % Wachstum).
