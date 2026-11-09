---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: CLAUDE.md §10; Abschnitt Account 2: Wahl des Inhabers 08.11.2026
tags: [konto/gemeinsam, radar, trends, telegram]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Trend-Radar

Geplante Aufgabe **„Trend-Radar Simulierbar“**: täglich 05:35 Uhr (Berlin), feste Sitzung „Trend-Radar täglich (TikTok Automation)“, Sonnet 5.5, max. ca. 20 Minuten, höchstens ca. 12 Websuchen. Ziel: Trends vor dem Höhepunkt erkennen, Konkurrenz und Regeländerungen im Blick behalten, den Inhaber nur mit geprüften Vorschlägen behelligen. Der Radar arbeitet für Simulierbar (Account 1) und seit 08.11. auch für Account 2 (eigener Abschnitt unten).

**Hinweis:** Der Prompt der geplanten Aufgabe zeigt noch auf `docs/07-trend-monitoring.md`, das nur noch hierher bzw. auf CLAUDE.md §10 verweist. Der Prompt lässt sich nur in der Radar-Sitzung selbst ändern (optional: dort „Ändere den Prompt: lies statt docs/07 den Abschnitt Trend-Radar in CLAUDE.md §10“; erst dann kann der Stub entfallen).

## Arbeitsanweisung des täglichen Laufs
1. `git pull --rebase origin main`.
2. **Monitor:** `python3 tools/monitor_kanaele.py` (öffentliche Profilseiten, 2 s Pause, Verlauf in `data/monitor/verlauf.csv`); auffällige Kanäle (≥ +20 % oder ≥ +1.000 Follower) = Signal `konkurrenz`: Profil bzw. stärkstes neues Video ansehen, welches Thema/Format zieht.
3. **Signale sammeln** in dieser Reihenfolge: Konkurrenz-Signale · Trend-Kalender `data/trends/kalender.csv` (Termine der nächsten 7–45 Tage prüfen, fehlende der nächsten 90 Tage ergänzen: Gesetze/Preise, EZB, Feiertage, Ferien, Zeitumstellung, Sport, Shopping-Tage, Steuerfristen, Wetter) · Nachrichten mit Alltags-/Geldbezug (48 h) · internationale Vorläufer (Benchmark-Kanäle EN in `data/monitor/kanaele.csv`) · große Ereignisse aus Popkultur/Gaming/Sport/TV/Shopping 2–4 Wochen vorher („Was passiert mit der echten Wirtschaft bzw. dem Alltag, wenn alle …?“, Vorlage GTA 6) · neue Kanäle (1–2 Suchen, Treffer in `kanaele.csv`).
4. **Jedes Signal bewerten** (Raster unten); Themen-Signale als Zeile in `data/trends/trend-log.csv`, auch verworfene; Monitor-Läufe ohne auffällige Kanäle nicht loggen; Signale aus dem Log nicht doppelt bewerten.
5. **Vorschlagen nur bei Score ≥ 70 und ohne K.-o.:** oben in `docs/trends/vorschlaege.md`: Titel als Frage, Rubrik, Score mit Kurzbegründung, Quelle, **spätestes Posting-Datum**, Umsetzung (eigenständig, keine Kopie, im Simulierbar-Format: eine klare Modellrechnung mit konkreten Fällen, Ergebnis in Euro, Frage zum Tippen, laufende Zähler, Wendungen ([[Skriptaufbau Simulierbar]]); keine 1:1-Kopie; nichts von der Liste „abgenutzt“ in der Standardfrage ([[Themenfindung Simulierbar]] §6; der Prompt der Radar-Aufgabe kennt diese Liste noch nicht); **kein „1.000 Lebensläufe“-/„1.000 simulierte …“-Merkmal**). Bei passenden Themen zusätzlich als Idee in `data/ideen/geld-duell.csv` bzw. `testlauf.csv` mit `typ` = `news` bzw. `saisonal`.
6. **Regel-Check jeden Montag:** „Released/Effective“-Datum der Community Guidelines (tiktok.com/community-guidelines/en), CRP-Bedingungen EWR, Startseite der Creator Academy; Änderung → Vorschlag Typ `regel` (immer, ohne Score).
7. [[Stand und nächste Schritte]] nur bei neuen Vorschlägen oder Regeländerungen ergänzen (eine Zeile).
8. Committen „Trend-Radar JJJJ-MM-TT“, auf `main` pushen.
9. **Letzte Antwort:** bei Vorschlägen kurze Liste (Titel, Score, warum jetzt, Umsetzung in einem Satz, spätestes Posting-Datum), sonst genau: „Trend-Radar JJJJ-MM-TT: keine neuen Trends mit Potenzial.“ Dieselbe Antwort täglich per Telegram (`python3 tools/telegram_senden.py "<Text>"`); bei Vorschlägen oder Regeländerung zusätzlich Push an den Inhaber.

## K.-o.-Kriterien (sofort verwerfen)
Nicht als eigene Rechnung/Simulation mit Euro-Ergebnis umsetzbar (Schwerpunkt GELD) · Ausschlussthema ([[Plattformregeln und Posting]]) · nur durch Nachbau eines fremden Videos umsetzbar · Höhepunkt in weniger als 2 Tagen und nicht vorbereitbar.

## Bewertungsraster (Punkte 1–5, 5 = bestes)
| Faktor | Gewicht | 5 = |
|---|---|---|
| Nachfrage-Signal | 30 % | belegte Reichweite (1 = Bauchgefühl) |
| Timing | 20 % | steigt noch/planbar mit ≥ 7 Tagen Vorlauf |
| Wettbewerb DE | 15 % | niemand setzt es um |
| Passung | 15 % | Simulation mit echtem Aha |
| Aufwand | 10 % | Vorlage reicht |
| Risiko | 10 % | kein Plattform-/Rechtsrisiko |
**Score = Σ(Gewicht × Punkte)/5 (20–100)**, immer mit `python3 tools/trend_score.py N T W P A R` berechnen. ≥ 70 vorschlagen · 50–69 `beobachten` (nach 7 Tagen erneut) · < 50 `verworfen`. Optional wöchentlich vom Inhaber: Screenshot der App-„Inspiration“, bewertet nach demselben Raster.

## Account 2 `@stelldirvor.pov` (seit 08.11.2026, Wahl des Inhabers)
Der Radar arbeitet ab jetzt auch für Account 2, strikt getrennt ([[Trennung der Accounts]]): eigene Signale, eigene K.-o.-Kriterien, eigene Vorschläge. Anlass: TikTok nennt **Neugier und Abstecher in Nischen** als Leitmotiv 2026 (**F**, Prognose, [[Wachstum auf 10.000 Follower]]); Account 2 hatte bisher gar keinen Radar.
| | Account 2 |
|---|---|
| **Signale** | Naturereignisse und Himmelsereignisse mit Termin (Sonnenfinsternis, Meteorschauer, Sturmfluten, Kälte- und Hitzewellen), Wissenschafts- und Raumfahrtnachrichten der letzten 48 h, Jahrestage („vor 200 Jahren …“), Neugier-Fragen, die in Nachrichten gerade gestellt werden; internationale „Was wäre, wenn“-Vorläufer nur als Themensignal |
| **K.-o.** | keine **messbare Größe** · nicht als ein Ereignis an einem Ort aus der Ich-Perspektive zeigbar · reale Tragödie mit Opfern oder Parteipolitik · gehört zu den gesperrten Klassikern von Account 2 ([[Themenfindung stelldirvor]] §6) · nur durch Nachbau eines fremden Videos umsetzbar · Höhepunkt in weniger als 2 Tagen und nicht vorbereitbar |
| **Raster** | dasselbe Bewertungsraster; „Passung“ = Gedankenexperiment mit echtem Aha in einer Welt, „Wettbewerb DE“ = niemand zeigt es auf Deutsch |
| **Vorschlag** | im Format von Account 2: Titelfrage, Welt (Natur zuerst), Messgröße der Anzeige, spätestes Posting-Datum; als Idee für das Studio von Account 2 |
**Umsetzung offen:** Der Prompt der geplanten Radar-Aufgabe lässt sich nur in der Radar-Sitzung selbst ändern (siehe Hinweis oben); bis dahin gilt dieser Abschnitt als Vorgabe, und neue Account-2-Signale werden in der Radar-Sitzung nachgezogen ([[Stand und nächste Schritte]]).

## Telegram (noch nicht eingerichtet)
Inhaber ca. 10 Min.: `@BotFather` → `/newbot` („Simulierbar Radar“), Bot starten; in der Cloud-Umgebung Domain `api.telegram.org` freigeben, Variablen `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` setzen (Token nie in Chat/Repo; Chat-ID notfalls `telegram_senden.py --chat-id-finden`), Testnachricht. (**A:** Die Radar-Sitzung übernimmt neue Variablen beim nächsten Containerstart.) WhatsApp verworfen, Anrufe nicht eingerichtet.

## Offene Vorschläge (Stand 02.11., `docs/trends/vorschlaege.md`)
Tankrabatt endet 31.12. (Score 80, posten 15.–23.12.) · Weihnachtsbaum (70, 01.–08.12.) · Heizung nachts (82, spätestens 20.12.; nur mit eigenem Winkel und nach Originalitätsprüfung, [[Themenfindung Simulierbar]]; die alte Sperrliste, die das Thema sperrte, ist Archiv).

## Siehe auch
[[Cockpit]] · [[Recherche-Methode und Grenzen]] · [[Konkurrenz und Themen Simulierbar]] · [[Index]]
