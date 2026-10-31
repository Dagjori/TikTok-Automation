# 30-Tage-Plan · Simulierbar (01.–30.11.2026)

**Stand:** 31.10.2026 · **Status:** Reihenfolge der nächsten Videos (Start täglich durch den Inhaber) · **Daten:** [`data/plan/30-tage.csv`](../data/plan/30-tage.csv) (70 Zeilen, Spalten wie vereinbart)

Legende: **(F)** = belegter Fakt mit Quelle, **(S)** = Schätzung, **(A)** = Annahme, **(B)** = Beispielwert, der vor der Produktion gerechnet wird. Zeitangaben der Posts (12:00, 16:00, 20:00) sind eine **(A)**, bis eigene Analytics vorliegen.

## 0. Arbeitsweise (Entscheidung des Inhabers 31.10.2026)

- **Der Plan ist die Reihenfolge der nächsten Videos, kein Autopilot.** Der Inhaber kommt jeden Tag in die Sitzung und gibt das Startsignal. Erst dann produziert Claude die nächsten Videos aus dieser Liste (oberste offene Zeilen zuerst).
- Termine im Plan sind Ziel-Posting-Tage. Fällt ein Tag aus, rutscht die Liste nach. Zeitkritische Themen (z. B. GTA 6 am 17.11., Weihnachtsgeld, Black Friday) werden dann vorgezogen.
- Szenen-Vorlagen und Stil-Baukästen baut Claude erst, wenn das erste Video ansteht, das sie braucht. Die Bau-Termine unten sind daher Richtwerte.
- **Stil je Video:** Spalte `stil` in der CSV, gewählt nach dem Stil-Katalog in `docs/10-designstile.md` (Abschnitt 0). Nie zweimal derselbe Stil hintereinander.
- ElevenLabs bleibt vorerst bei Starter. Upgrade auf Creator, sobald die Credits nicht mehr reichen (Abschnitt 4.3).

## 1. Kurzfazit

- **Plan:** 60 Hauptslots (2 pro Tag, davon 30 GELD und 30 ALLTAG) plus 10 optionale Bonusvideos. Das sind 2 fertige, 58 neue Hauptvideos und bis zu 10 Bonusvideos. Du postest höchstens 3 pro Tag.
- **Frequenz (klare Empfehlung):** 2 pro Tag bleibt der Plan. Das dritte Video ist die Ausnahme: höchstens 3 pro Woche, nur zeitlose Themen. Kein Beleg zeigt, dass ein drittes Video pro Tag einem kleinen Konto mehr bringt. Dafür steigen Aufwand und Qualitätsrisiko. Details in Abschnitt 5.
- **Der Engpass sind Vorlagen, nicht Ideen.** Von 7 Vorlagen existieren 2. **In Woche 1 musst du die Duell-Tafel (V3) bauen lassen, Ziel Mo 02.11. vormittags.** Sie trägt 20 von 68 neuen Videos und das Netto-Rechenmodul für 4 Videos. Zusätzlich empfehle ich V7 Spiel/Zufall bis Di 03.11. Danach V4 (08.11.), V6 (12.11.), V5 (18.11.).
- **Termine sind eingebaut:** Singles Day 11.11., GTA 6 Deutschland 17.11., Kfz-Kündigungsfrist 30.11. (Video am 21.11.), Streichpreis-Check 24.11., Weihnachtsgeld 26.11., 0-%-Finanzierung am Black Friday 27.11., Weihnachtsmarkt am 1. Advent 29.11. Heizperiode und Winterreifen laufen als Themen mit.
- **Risiko Nummer 1:** Die Anlauftage 02. und 03.11. Es gibt nur V1 und V2, die Tafel wird gerade erst gebaut. Der Mittagsslot am 02.11. hat deshalb Priorität C und darf entfallen.
- **Stil entschieden (31.10.):** Der Stil wechselt je Thema (`docs/10-designstile.md`, Abschnitt 0, Spalte `stil` in der CSV).
- **Risiko Nummer 2:** Das Arbeitsvolumen. Mein konservatives Raster ergibt ca. 190 Stunden Agentenarbeit für 68 neue Videos (S), dazu 35–54 Stunden für die Vorlagen (S). Das geht nur mit parallelen Sitzungen. Nach Woche 1 messen wir den echten Wert. Wenn er doppelt so hoch ist wie geplant, gehen wir auf 1,5 Videos pro Tag.
- **Stimme:** ElevenLabs **Creator, $22 pro Monat** (ca. 20 € ohne Steuern, A). Starter reicht nur für ca. 23 Videos. Vorher 5 Minuten prüfen, welche der zwei Preislisten dein Konto nutzt (Abschnitt 4.3).
- **Deine Zeit:** ca. 5 Stunden pro Woche (S) fürs Abnehmen, Hochladen und Kommentare. Das entspricht deinem angenommenen Budget. Ein drittes Video pro Tag würde es sprengen.

### Die 5 stärksten Videos des Monats (S, keine Messdaten)

| # | Datum | Video | Warum |
|---|---|---|---|
| 1 | Di 17.11. | GTA 6: Was kostet es Deutschland, wenn alle krankfeiern? | Trend-Score 85 (Trend-Radar), fester Termin, US-Zahl läuft viral, deutsche Rechnung fehlt (laut `docs/trends/vorschlaege.md`) |
| 2 | Do 26.11. | Weihnachtsgeld: Was bleibt von 1.000 € brutto übrig? | Score 83, Skript steht, jeder kennt die Enttäuschung, löst Kommentar-Streit aus |
| 3 | Di 24.11. | Black Friday: Wie echt ist der Streichpreis? | Harte Regel (§ 11 PAngV: niedrigster Preis der letzten 30 Tage), starker Aha-Effekt, kein Händler nötig, Konkurrenz auf Rechnungsebene nicht gefunden (A) |
| 4 | Mi 11.11. | Singles Day: Wie viel teurer ist Alleinleben als zu zweit? | Passender Anlass, Debatte-Potenzial, Teile-Faktor (A) |
| 5 | Sa 07.11. | Ziegenproblem: Wechseln oder bleiben? | Klassiker mit Kommentar-Streit („Das stimmt nicht“), exakte Lösung 2/3, kein Konkurrent im Monitor (A) |

## 2. Wochenübersicht

Die Wochen laufen von Sonntag bis Samstag, weil der Plan am Sonntag 01.11. startet.

| Woche | Zeitraum | Termine und Schwerpunkt | Hauptvideos | Bonus (max.) | Vorlagen-Bau | Hauptrisiko |
|---|---|---|---|---|---|---|
| 1 | So 01.–Sa 07.11. | Start mit den zwei fertigen Videos. Heizsaison (Heizung 06.11.). Anlauf mit V1/V2 | 14 (2 fertig, 12 neu): 7 GELD, 7 ALLTAG | 0 | **V3 Duell-Tafel** (Pflicht, bis Mo 02.11.), **V7 Spiel/Zufall** (bis Di 03.11.) | 02./03.11. ohne fertige Tafel |
| 2 | So 08.–Sa 14.11. | **Singles Day, Martinstag, Karnevalsauftakt 11.11.** Erste Zeitachse (Kreditkarte 10.11.) | 14 neu: 7 GELD, 7 ALLTAG | 3 (08., 12., 14.) | V4 Zeitachse (bis So 08.11.), V6 Zuhause (bis Do 12.11.) | Zwei neue Vorlagen gleichzeitig |
| 3 | So 15.–Sa 21.11. | **Auswertung nach 28 Videos am 15.11.** Slots drehen sich. Reifen 16.11. **GTA 6 Deutschland 17.11., Release 19.11.** Pendlerpauschale 18.11. Kfz-Frist-Video 21.11. | 14 neu: 7 GELD, 7 ALLTAG | 3 (15., 18., 21.) | V5 Schlange/Menge (bis Mi 18.11.) | Release wird verschoben |
| 4 | So 22.–Sa 28.11. | **Streichpreis 24.11., Weihnachtsgeld 26.11., Black Friday 27.11.** Weihnachtsmärkte öffnen (Dresden 25./26.11., Nürnberg 27.11.) | 14 neu: 7 GELD, 7 ALLTAG | 3 (22., 25., 28.) | keine, Dezember vorbereiten | Terminvideos dicht hintereinander |
| 5 | So 29.–Mo 30.11. | **1. Advent 29.11.** Weihnachtsmarkt-Video. Kfz-Frist und Cyber Monday 30.11. | 4 neu: 2 GELD, 2 ALLTAG | 1 (29.) | Dezember-Themen starten | Übergang in den Dezember |

## 3. Begründung

### 3.1 Mix und Slot-Logik

- **Rubriken 50 zu 50** (so steht es in `docs/05-startnische.md`): 30 GELD, 30 ALLTAG im Hauptplan, 5 zu 5 im Bonus.
- **Slots wechseln die Rubrik.** Bis 14.11. liegt GELD mittags und ALLTAG abends, ab 15.11. umgekehrt. Drei Gründe:
  1. Zwei direkt aufeinanderfolgende Hauptvideos haben nie dieselbe Rubrik (einzige Ausnahme: Abend 14.11. auf Mittag 15.11.).
  2. Nach 14 Tagen kannst du Uhrzeit und Rubrik getrennt vergleichen (A: TikTok misst pro Video).
  3. GTA 6 Deutschland am 17.11. fällt auf den Abendslot (20:00 statt 19:00 im alten Skript, A).
- **Themenvielfalt:** 19 Themenfelder. Das größte, „Auto und Verkehr“, hat 9 von 70 Videos (13 %). Es folgen Konsum (8) und Spiele (7).
- **Nähe zum Format:** Jede Idee ist eine klare Modellrechnung mit konkreten Fällen. GELD ist ein Duell (zwei Wege nebeneinander), ALLTAG ein Strategie-Vergleich. In keinem Titel steht „1.000“ oder „simulierte …“. Bei Spielen läuft die Rechnung im Hintergrund, im Video siehst du Fälle.
- **Länge:** Jedes Video muss mindestens 61 Sekunden tragen (CRP verlangt „at least one minute long“, F, [TikTok Support](https://support.tiktok.com/en/business-and-creator/creator-rewards-program)). Dünne Themen wie Münzwurf, Socke oder Fangen tragen das schwer. Deshalb sind sie Bonus.

### 3.2 Reihenfolge: zuerst die vorhandenen Vorlagen

| Phase | Tage | Was läuft | Vorlagen |
|---|---|---|---|
| Anlauf | 02.–03.11. | Stadt oder Land, Desk-Sharing, Fußgängerampel, dazu die erste Tafel (200 €) | V1/V2, V3 ab 03.11. |
| Aufbau | 04.–14.11. | GELD fast nur auf V3, ALLTAG auf V7, V1, V2. Ab 10.11. V4, ab 13.11. V6 | V3, V7, dann V4, V6 |
| Termine | 15.–21.11. | GTA 6 Deutschland, Release, Kfz-Frist, Kassenschlange | V5 ab 19.11. |
| Dichte | 22.–30.11. | Streichpreis, Weihnachtsgeld, Black Friday, Advent | alle |

Warum „200 € mehr Gehalt“ so früh (03.11.)? Es baut das Netto-Modul (Lohnsteuer 2026, Sozialabgaben) als Code mit Tests. Das Weihnachtsgeld, die 4-Tage-Woche und die Pendlerpauschale nutzen es später. Der Abstand zum Weihnachtsgeld beträgt 23 Tage.

### 3.3 Feste Termine

| Termin | Datum 2026 | Beleg | Umsetzung im Plan |
|---|---|---|---|
| Heizperiode | seit 01.10., läuft bis 30.04. | (F) Üblich, kein Gesetz; Ursprung LG Berlin 1998 ([ista](https://www.ista.com/de/blog/heizen-abrechnen/heizperiode-in-deutschland/), [Haufe](https://www.haufe.de/id/beitrag/zentralheizung-HI923579.html)). 6 % je Grad ist Faustregel, exakt 5,55 % ([Öko-Test](https://www.oekotest.de/freizeit-technik/1-grad-weniger-heizen-wie-viel-euro-lassen-sich-damit-sparen_13132_1.html)) | Heizung 1 Grad (06.11.), Wäsche (13.11.), Zimmer heizen (18.11.), Stoßlüften (25.11.), Bonus nachts (15.11.) |
| Winterreifen | situativ, kein Stichtag | (F) § 2 Abs. 3a StVO, „O bis O“ nur Merkregel, Bußgeld ab 60 € ([RuV](https://www.ruv.de/kfz-versicherung/magazin/rund-ums-auto/winterreifen-drohende-bussgelder-und-probleme-mit-der-versicherung), [Bußgeldkatalog](https://www.bussgeldkatalog.de/winterreifen/)) (Suchzusammenfassung) | Reifen-Duell 16.11. |
| **Martinstag** | Mi 11.11. | (F) 11.11. ([Stuttgarter Zeitung](https://www.stuttgarter-zeitung.de/panorama/martinsumzug-am-11-november-sankt-martin-der-gute-mann-von-tours-78879539.html)) | **Kein eigenes Video** (siehe 3.6) |
| **Singles Day** | Mi 11.11. | (F) 11.11., seit 2009 von Alibaba groß gemacht ([Wikipedia](https://en.wikipedia.org/wiki/Singles%27_Day)) | Singles-Day-Duell, 11.11. 12:00 |
| Karnevalsauftakt | Mi 11.11., 11:11 Uhr | (F) ([koeln.de](https://www.koeln.de/aktuelles/so-wird-der-11-11-in-koeln-gefeiert-18833)) | kein Video (Feier, kein Rechenkern, A) |
| Weihnachtsmärkte | Köln ab 16.11., Dresden 25./26.11., Nürnberg 27.11. | (F, Suchzusammenfassung) [Nürnberg](https://www.nuernberg.de/imperia/md/kommunikation_stadtmarketing/dokumente/internet/ckm/ckm_26_ausblick.pdf), [Köln](https://www.koeln.de/weihnachten/weihnachtsmaerkte-koeln), [Dresden](https://www.urlaubsguru.de/freizeitaktivitaeten/weihnachtsmaerkte-dresden/) (Reiseportal 25.11., Hotelanbieter 26.11.) | Weihnachtsmarkt-Video 29.11. |
| **GTA-6-Release** | Do 19.11. | (F) [Rockstar Newswire](https://www.rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026); Rockstar-Seite nennt weiter 19.11., keine Änderung ([Nacionale](https://www.nacionale.com/en/articles/has-gta-6-been-delayed-again-release-date-november-19)). **Zweimal verschoben** ([GamesBeat](https://gamesbeat.com/grand-theft-auto-vis-pc-release-is-slated-for-q1-2027/)) | **GTA 6 Deutschland am Di 17.11., 20:00** (zwei Tage vor Release). Plan B bei Verschiebung: Auto-Kosten pro km (Reserve) |
| Pendlerpauschale / Jahresende | laufend | (A) Steuererklärung 2026 kommt; Entfernungspauschale 2026 vor Produktion prüfen | Pendlerpauschale 18.11. |
| **Kfz-Kündigungsfrist** | Mo 30.11. | (F, Ratgeber, teils verkaufsnah) Kündigung muss meist bis 30.11. beim Versicherer eingehen ([web.de](https://web.de/magazine/auto/sonderkuendigungsrecht-versicherungswechsel-3011-moeglich-32659288), [gevestor](https://www.gevestor.de/finanzwissen/finanzplanung/versicherungen/kfz-versicherung-diese-kuendigungsfristen-gelten-fuer-verbraucher-759014.html)). 30.11.2026 ist ein Montag (Rechnung) | Schaden melden oder selbst zahlen, **Sa 21.11.**, ohne Anbieter und ohne Wechselaufruf |
| **Weihnachtsgeld** | 20.–28.11. (A) | (F) Etwa die Hälfte der Beschäftigten bekommt es, 2023 laut WSI 53 % ([Böckler](https://www.boeckler.de/de/pressemitteilungen-2675-53-prozent-aller-beschaeftigten-bekommen-weihnachtsgeld-53695.htm)). Auszahlung meist Ende November (Sekundärquellen) | **Do 26.11., 20:00** |
| **Black Friday** | Fr 27.11. | (F) ([Universal Time Date](https://www.universaltimedate.com/articles/black-friday-2026), [Klaviyo](https://www.klaviyo.com/uk/bfcm/calendar)); Thanksgiving ist der 26.11. (Rechnung) | Streichpreis-Check **Di 24.11.**, 0-%-Finanzierung **Fr 27.11.** |
| Rechtsgrundlage Streichpreis | seit 2022 | (F) § 11 PAngV: bei Preisermäßigung gilt der niedrigste Preis der letzten 30 Tage als Referenz ([lxgesetze](https://lxgesetze.de/pangv/11), [Händlerbund](https://www.haendlerbund.de/de/ratgeber/recht/streichpreise)) | Kern des Streichpreis-Videos |
| **1. Advent** | So 29.11. | Rechnung: Heiligabend ist ein Donnerstag, der 4. Advent der 20.12.; im Kalender `data/trends/kalender.csv` als geprüft geführt | Weihnachtsmarkt **So 29.11.**, Weihnachtsbudget Mo 30.11. |
| Cyber Monday | Mo 30.11. | (F) ([Klaviyo](https://www.klaviyo.com/uk/bfcm/calendar)) | kein eigenes Video (Abos 29.11. und Weihnachtsbudget 30.11. laufen daneben) |

### 3.4 Abstandsregeln und Prüfung

Ich habe alle 70 Zeilen mit einem Skript geprüft (Reihenfolge, Vorlagen-Verfügbarkeit, Abstände, Rubrik-Wechsel; das Skript liegt nicht im Repo).

| Regel | Umsetzung | Ergebnis |
|---|---|---|
| Weihnachtsgeld mindestens 5 Tage Abstand zu „200 € mehr Gehalt“ | 03.11. und 26.11. | 23 Tage, erfüllt |
| Keine zwei sehr ähnlichen Themen direkt hintereinander | Direkt aufeinanderfolgende Videos haben nie dasselbe Themenfeld und nie dieselbe Vorlage. Dasselbe Feld frühestens nach zwei Videos Abstand | **Eine Ausnahme:** 02.11. mittags und abends sind beide V2 (Stadt oder Land, Desk-Sharing). Die Themen sind verschieden. Es liegt daran, dass in den Anlauftagen nur V1/V2 existieren |
| Stau-Themen nach dem Reißverschluss | Kreisverkehr 09.11., Spurwechsel 12.11., Baustelle 30.11. Phantomstau liegt in der Reserve | mindestens 8 Tage Abstand |
| Bonus ohne Zeitdruck | alle 10 Bonusvideos sind zeitlos | erfüllt (Balkonkraftwerk wegen Winter in der Reserve) |
| Bonus höchstens 3 pro Woche | Wochen: 3 / 3 / 3 / 1 | erfüllt |

### 3.5 Abgleich mit der Konkurrenz (`data/monitor/kanaele.csv`, `data/2026-10-29_ausgangsvideos.csv`)

Der Abgleich läuft nur auf **Kanalebene**. Einzelne Videos der neuen Nachahmer konnte ich nicht ansehen (tiktok.com war in dieser Sitzung nicht erreichbar).

| Konkurrent und Video | Umgang im Plan |
|---|---|
| @kontostand.vs: Mieten oder kaufen (504k Views) | **nicht im Plan.** Erst im Dezember mit eigenem Winkel (Instandhaltung, Zinsbindungsende) |
| @wissentogo_de: Leasing, Finanzierung oder bar (298k) | **nicht im Plan.** Die 0-%-Finanzierung im Laden ist ein anderes Thema (Ratenkauf, kein Auto) |
| @kurzsimuliert: Regen, rennen oder gehen (2,1 Mio.) | bleibt gestrichen. „Was heißen 30 Prozent Regen?“ ist eine andere Frage (Wahrscheinlichkeit, kein Nässe-Vergleich) |
| @retrodreamspace: Zigarette gegen Vape | Tabak ist ausgeschlossen |
| @unnoetig_tiefgruendig: Strom in der Steckdose | Stromfresser (GD103) bewusst nicht im Plan |
| Reißverschluss (EN, 3,2–3,4 Mio. Views) | ist unser Video #2. Ähnliche Themen frühestens nach 8 Tagen und mit anderem Kern |
| @gegenprobe, @alltagsduell, @alltagsformel, @alltaginzahlen | Themen unbekannt. **Check am Vortag jeder Produktion** durch den Trend-Radar. Termin-Videos sind am besten geschützt, weil das Timing nicht kopierbar ist |

### 3.6 Bewusst nicht im Plan, Ausblick Dezember

| Thema | Wann | Status |
|---|---|---|
| Martinstag 11.11. | – | Kein eigenes Video (A): Martinsgans und Laternenumzug tragen keine Rechnung mit Aha-Effekt und sind regional. Wenn du willst: Tausch „Martinsgans: Restaurant, selbst braten oder Fertiggans?“ gegen die 4-Tage-Woche am 09.11. (Aufwand 2) |
| Deutschlandticket 66,80 € ab 01.01.2027 | posten 12.–20.12. | Vorschlag offen (Score 79); (F) laut [Tagesspiegel Background](https://background.tagesspiegel.de/verkehr-und-smart-mobility/briefing/deutschlandticket-wird-2027-teurer) |
| Mindestlohn 14,60 € und Minijob-Grenze 633 € | posten 28.12.–05.01. | angenommen (Score 86); (F) laut [Bundesregierung](https://www.bundesregierung.de/breg-de/aktuelles/mindestlohn-faq-1688186). Nutzt das Netto-Modul |
| Brückentage 2027, Wichteln, Plätzchen | Dezember | Ideen TL-149, TL-101, TL-142 |
| Steuer zum Jahresende (Freistellungsauftrag, Handwerkerleistungen) | Dezember | Ideen GD058, GD059 |

### 3.7 So liest du die CSV und was passiert bei Ausfällen

| Spalte | Bedeutung |
|---|---|
| `slot` | `mittag` (12:00), `bonus` (16:00), `abend` (20:00), alles (A) |
| `kernzahl_bzw_twist` | Beginnt mit der Ideen-ID aus `data/ideen/`. Zahlen mit (B) sind Beispielwerte, „Hypothese“ heißt: erst die Rechnung entscheidet. Nichts davon ist ein Ergebnis |
| `vorlage` | V1–V7. „(Erstbau)“ markiert das erste Video, das eine neue Vorlage nutzt |
| `quellen_pruefen` | Was vor der Produktion geprüft wird (Rechtsstand, Preise, Studien) |
| `aufwand` | 1 = ca. 0,5 Std. aktive Arbeit, 2 = 1,5, 3 = 3, 4 = 5 (S). Stufe 5 (neue Vorlage) kommt nicht vor, der Vorlagenbau steht in Abschnitt 4.1 |
| `prioritaet` | **A** Terminvideo, fertig oder Fundament: bleibt fix. **B** Standard: darf 1–3 Tage rutschen. **C** Bonus oder Anlauf-Slot: darf ersatzlos entfallen |
| `status` | `geplant`, die zwei Startvideos stehen auf `fertig` |

**Schiebe-Regel:** Besteht ein Video die Abnahme nicht rechtzeitig, rutscht das nächste B-Video derselben Rubrik nach. Terminvideos (A) bleiben auf ihrem Tag. Gefüllt wird nie mit einem ungeprüften Video. Als Notnagel dient die Reserve in Anhang B.

## 4. Vorlagen, Kapazität und Kosten

### 4.1 Die 7 Vorlagen

Ich habe alle 58 neuen Hauptthemen auf 7 Vorlagen verteilt. **Eine Vorlage ist nur die Bildwelt.** Jedes Video braucht trotzdem sein eigenes Rechenmodell mit Tests.

| Vorlage | Status | Fertig bis (Ziel) | Videos (Haupt + Bonus) | Erstes Video | Bau (S) | Inhalt |
|---|---|---|---|---|---|---|
| V1 Straße | vorhanden | – | 5 (davon 1 fertig) | 01.11. | – (Kreisverkehr braucht neue Geometrie, steckt im Videoaufwand) | Autobahn und Landstraße, Baustelle, Trajektorien aus `pipeline/sim` |
| V2 Stadt/Globus | vorhanden | – | 6 (davon 1 fertig) | 01.11. | – (Stadt/Land, Büro, Ampel brauchen neue Szenenteile, stecken im Videoaufwand) | Low-Poly-Stadt, Hochhaus, Figuren, Globus |
| **V3 Duell-Tafel** | **neu, Woche 1, Pflicht** | **Mo 02.11. vormittags** | 18 + 2 | 03.11. (200 €) | 8–12 h | Zwei Team-Spalten (Blau, Orange), Geldfluss in Töpfe, wachsende Balken, Faustregel-Karte. Baut auf `engine/duell.js` und `bausteine.js` auf. Dazu das Netto-Modul als Code |
| **V7 Spiel/Zufall** | **neu, Woche 1, empfohlen** | Di 03.11. | 10 + 5 | 04.11. (Schere, Stein, Papier) | 6–10 h | Türen, Würfel, Karten, Spielfeld, Tor. Siegquoten als Balken |
| V4 Zeitachse | neu, Woche 2 | So 08.11. (baut auf V3) | 11 + 2 | 10.11. (Kreditkarte) | 5–8 h | Kurve über Jahre, Break-even-Linie, Preisverlauf, Tagesverlauf |
| V6 Zuhause | neu, Woche 2 | Do 12.11. | 6 + 1 | 13.11. (Bad) | 8–12 h | Wohnungsquerschnitt, Wärmefluss, Zähler, Küche |
| V5 Schlange/Menge | neu, Woche 3 | Mi 18.11. | 4 + 0 | 19.11. (Kassenschlange) | 8–12 h | Draufsicht, Figuren als Agenten, Kassen, Wege |

Summe der neuen Vorlagen: 35–54 Stunden (S).

**Abhängigkeit vom Stil:** [`docs/10-designstile.md`](10-designstile.md) empfiehlt Isometrie (Stil 2) statt Low-Poly und will beide Looks gegeneinander testen. Die Entscheidung ist offen. **Entscheide vor Mo 02.11.** Sonst baut Claude V3 und V7 im vorhandenen Low-Poly-Stil, das ist der sicherste Weg für den Zeitplan (A). Die Videos auf V1/V2 bleiben in jedem Fall Low-Poly. Den Vergleich beider Looks werten wir am 15.11. mit aus. Für Isometrie nennt `docs/10` ca. 3–4 Stunden für Kamera und Kachel (S).

### 4.2 Agentenarbeit und Rendern

Mein Raster für die aktive Arbeit pro Video bei vorhandener Vorlage (S): Aufwand 1 = 0,5 Std., 2 = 1,5 Std., 3 = 3 Std., 4 = 5 Std. Das Raster steht in der CSV-Spalte `aufwand`. Es enthält Quellenprüfung, Skript, Rechenmodell mit Tests, Szenen-JSON, Stimme, Abnahme und Texte für die Beschreibung.

| Woche | Neue Videos | Agentenstunden (S) |
|---|---|---|
| 1 | 12 | 37,5 |
| 2 | 17 | 41,0 |
| 3 | 17 | 54,0 |
| 4 | 17 | 44,5 |
| 5 | 5 | 12,5 |
| **Summe** | **68** (58 Haupt + 10 Bonus) | **189,5** (Haupt 173, Bonus 16,5) |

- **Einordnung:** `docs/04-claude-kapazitaet.md` rechnet nur mit 20–30 Minuten aktiver Zeit pro Video bei fertiger Vorlage. Das wären für 68 Videos ca. 34 Stunden (S). Mein Raster ist bewusst vorsichtig, weil jede Szene bisher Maßarbeit war. Die Wahrheit liegt dazwischen. **Messpunkt:** Nach Woche 1 erfassen wir die echten Stunden pro Video (`/usage`) und passen den Plan an.
- **Parallel arbeiten:** 190 Stunden in 30 Tagen sind ca. 6 Stunden pro Tag. Das geht nur mit mehreren Sitzungen gleichzeitig und Nachtschichten (A). Es belastet das Max-Kontingent (offen: Wie viel darf das Projekt nutzen? Annahme bisher 50 %).
- **Modellwahl:** Opus 5.5 für die 5 neuen Vorlagen, Sonnet 5.5 für die Videos (laut `CLAUDE.md`).
- **Rendern:** 50 Minuten pro Video in der Cloud (F, gemessen laut `STATUS.md`). Für 68 Videos sind das 56,7 Stunden Rechenzeit (Rechnung). Auf dem Windows-PC mit GPU rechne ich mit 5–15 Minuten pro Video (S, nicht gemessen), das wären 6–17 Stunden. Der isometrische Stil rendert laut `docs/10` rund 7-mal schneller (0,74 s statt 5,5 s je Bild, F, ohne GPU gemessen). Übertragen auf 50 Minuten wären das ca. 7 Minuten pro Video, für 68 Videos ca. 8 Stunden (S). **Deshalb ziehe ich das Windows-Setup von „später“ auf diese Woche vor** (45–60 Minuten, danach Zeitmessung).
- **Vorlauf:** Ab Woche 2 sollen immer mindestens 2 Tage Videos fertig im Voraus liegen. So fängt eine Verzögerung nichts Zeitkritisches ab.

### 4.3 Stimme: ElevenLabs

**Zwei Preislisten:** Die Preisseite trennt jetzt „Creative“ (Credits) und „API“ (Dollar pro 1.000 Zeichen). Unsere Pipeline ruft die API auf. Welche Liste dein Konto nutzt, weiß ich nicht. Das siehst du unter Subscription: Steht dort „Credits“ oder „Zeichen“? Preise stammen von [elevenlabs.io/pricing](https://elevenlabs.io/pricing) und [elevenlabs.io/pricing/api](https://elevenlabs.io/pricing/api), abgerufen am 31.10.2026, ohne Steuern (F).

Bei `eleven_multilingual_v2` gilt **1 Zeichen = 1 Credit** (F). Ein Video braucht ca. **1.300 Zeichen** (F: GTA-Video 1.357, Reißverschluss 1.237 laut `skript.json`). Mit 25 % Nachaufnahmen rechne ich 1.625 (A).

| Plan | Preis pro Monat | Enthalten | Videos ohne / mit 25 % Nachaufnahmen |
|---|---|---|---|
| **Creative** Starter | $6 (1. Monat $1) | 30.000 Credits | 23 / 18 |
| **Creative** Creator | **$22** (1. Monat $11) | **121.000 Credits** | **93 / 74** |
| **Creative** Pro | $99 | 600.000 Credits | 461 / 369 |
| **API** Starter | $6 | 75.000 Zeichen | 57 / 46 |
| **API** Creator | $22 | 275.000 Zeichen | 211 / 169 |
| **API** Pro | $99 | 1.238.000 Zeichen | 952 / 761 |

Zusatzpunkte (F, gleiche Seiten): Ungenutzte Credits wandern bis zu zwei Monate mit, bei aktivem bezahltem Plan. Zusätzliche Credits kann man erst ab Creator kaufen. Jahreszahlung spart zwei Monate. Die Flash-/Turbo-Modelle kosten 0,5 bis 1 Credit je Zeichen (nur API), ihre Qualität ist ungeprüft, ich rate ab (A).

**Bedarf des Plans:** 68 neue Videos × 1.300 = 88.400 Zeichen. Mit 25 % Nachaufnahmen 110.500 (Rechnung). Dazu kommt der Neubau der zwei Startvideos mit der Stimme Ben (ca. 2.600 Zeichen).

**Empfehlung: Creator, $22 pro Monat (ca. 20 €, A: 0,9 €/$ wie in `docs/11-automatisierung.md`, plus Steuern).**
- Creative-Liste: Starter wäre um den 10.–12.11. leer (S, die Produktion läuft zwei Tage voraus). Creator trägt den ganzen Plan (121.000 Credits gegen ca. 113.000 Bedarf) und erlaubt Zusatz-Credits.
- API-Liste: Creator hat 2,5-fachen Puffer.
- **Sparvariante,** falls dein Konto zur API-Liste gehört: Starter $6 plus $0,08 je weitere 1.000 Zeichen, zusammen ca. $9 im Monat (Rechnung). Ob das Überschreiten bei Starter erlaubt ist, steht nicht auf der Seite (A, bitte prüfen).
- **Pro ($99) brauchst du nicht.** Erst ab ca. 370 Videos im Monat (Creative-Liste).
- **Wann wechseln:** Spätestens Mo 02.11., sonst stoppt die Produktion mitten in Woche 2. Beim Upgrade bleiben unbenutzte Credits erhalten (F).
- Der erste Monat kostet $11 statt $22, falls die Aktion bei einem Upgrade greift (A).

### 4.4 Deine Zeit (S)

| Posten | Rechnung | Zeit pro Woche |
|---|---|---|
| Hochladen TikTok und YouTube | 14 Videos × 12 Minuten (6 pro Plattform mit vorbereiteten Texten) | 2,8 Std. |
| Abnehmen | 14 Videos × 3 Minuten | 0,7 Std. |
| Kommentare beantworten | 7 Tage × 10 Minuten | 1,2 Std. |
| **Summe ohne Bonus** | | **4,7 Std.** |
| Bonus (3 pro Woche) | 3 × 15 Minuten | + 0,75 Std. |

`docs/09-posting-anleitung.md` nennt ca. 10 Minuten pro Video und Plattform. Mit diesem Wert wären es 6,6 Stunden ohne Bonus. Zwei Hebel: (1) fertige Texte zum Kopieren pro Video, (2) Wochenstapel in TikTok Studio planen (bis zu 30 Tage im Voraus). Ein auditiertes Planungs-Tool (Vorschlag in `docs/11-automatisierung.md`, ca. $10 im Monat) würde den Upload weiter senken. Die Entscheidung dazu ist offen.

### 4.5 Gesamtkosten im November (A/S)

| Posten | Kosten |
|---|---|
| ElevenLabs Creator | $22 (ca. 20 €) plus Steuern |
| Claude Max, Cloud, Windows-PC | vorhanden |
| Optional Planungs-Tool (Buffer, 2 Kanäle) | ca. $10 (laut `docs/11-automatisierung.md`, ungeprüft) |
| **Summe** | **ca. 24 €** (nur Stimme) bis **ca. 34 €** (mit Planungs-Tool), jeweils mit 19 % Steuer (A). Beides liegt unter dem angenommenen Budget von 50 € pro Monat |

## 5. Posting-Frequenz: 2, 3 oder weniger?

### 5.1 Was die Quellen sagen

| Aussage | Quelle | Art |
|---|---|---|
| „While there’s no one-size-fits-all answer, success cases show that publishers who post multiple times a day experience higher video views and exposure on the For You feed. We suggest setting a daily post target you can consistently hit and planning your content around that goal.“ Die Seite richtet sich an **Publisher** (Medien, Marken), nicht an kleine Konten | [TikTok Creator Academy: Posting cadence for publishers](https://www.tiktok.com/creator-academy/en/article/posting-cadence-best-practices-publishers) | (F), TikTok, Suchauszug |
| Dieselbe Seite: „striking the perfect balance between quality and quantity isn’t as challenging as it appears“ | wie oben | (F), TikTok, Suchauszug |
| „While consistency is key to building a loyal viewership, your exact posting cadence is totally up to you!“ | [Creator Academy: 8 tips](https://www.tiktok.com/creator-academy/en/article/8-tips-for-becoming-a-successful-TikTok-creator?lang=en) | (F), TikTok, Suchauszug |
| Regelmäßig posten hilft dem Publikum, einen Rhythmus zu lernen. Täglich posten ist kein Muss | [Creator-Academy-Video „Do I need to post every day?“](https://www.tiktok.com/@creatoracademy/video/7088116200919584001) | (F), TikTok, Suchauszug |
| Du musst nicht täglich posten, aber ein festes Schema hilft | [TikTok for Business, Small-Business-Guide](https://ads.tiktok.com/business/en-US/blog/tiktok-creative-strategy-small-business) | (F), Zweitquelle (Suchzusammenfassung) |
| „TikTok empfiehlt 1–4 Posts am Tag“ steht in Drittquellen. Eine TikTok-Primärquelle dafür habe ich **nicht** gefunden | z. B. [Adobe](https://www.adobe.com/express/learn/blog/how-often-to-post-to-twitter-facebook-instagram-and-pinterest), [JoinBrands](https://joinbrands.com/blog/how-often-to-post-on-tiktok/) | nicht belegt |
| Das CRP bewertet **Originalität, Spieldauer, Suchwert und Interaktion**. Videos müssen original und hochwertig sein, „filmed, designed, and produced entirely by yourself“, mindestens eine Minute | [TikTok Newsroom](https://newsroom.tiktok.com/en-us/introducing-the-new-creator-rewards-program), [TikTok Support](https://support.tiktok.com/en/business-and-creator/creator-rewards-program) | (F), TikTok |
| CRP-Voraussetzung: mindestens 10.000 Follower **und** 100.000 Views in den letzten 30 Tagen. Deutschland ist dabei | wie oben, [Creator Academy](https://www.tiktok.com/creator-academy/article/creator-rewards-program) | (F), TikTok |
| Videos können im CRP als „unoriginal“ aus der Vergütung fallen | [TikTok Discover](https://www.tiktok.com/discover/why-do-my-videos-keep-getting-disqualified-for-unoriginal) | (F), TikTok, Suchauszug |
| **Buffer** (11,4 Mio. Posts, über 150.000 Konten) gegenüber 1 Post pro Woche: 2–5 Posts +17 % Views je Post, 6–10 Posts +29 %, 11+ Posts +34 %. **Der Median bleibt flach** (489 / 506 / 487 Views). Gewinn kommt aus der höheren Ausreißer-Chance (oberste 10 %: 3.722 → 6.983 → 10.092 Views). Größter Sprung: von 1 auf 2–5 pro Woche, danach sinkende Erträge. Die Gewinne gelten für alle Kontogrößen | [Buffer-Studie](https://buffer.com/resources/how-often-should-you-post-on-tiktok/) | (F), Drittstudie, keine TikTok-Aussage |

Hinweis: tiktok.com war in dieser Sitzung nicht abrufbar. Alle TikTok-Zitate stammen aus Suchauszügen der Originalseiten.

### 5.2 Bewertung

1. **Nichts davon zeigt, dass viele Posts pro Tag schaden.** Ich habe keinen TikTok-Beleg für eine Strafe wegen Menge gefunden. Das heißt nicht, dass es keine gibt (A).
2. **Auch nichts zeigt einen Vorteil von 3 pro Tag für dein Konto.** TikTok sagt „multiple times a day“ nur für Publisher und nennt das ausdrücklich keine Pauschalregel. Buffer misst in der obersten Gruppe nur „11+ pro Woche“. Ob 21 pro Woche mehr bringen als 14, ist nicht belegt.
3. **Mehr Posts heißen mehr Lose, nicht bessere Videos.** Der Median pro Video bleibt gleich (Buffer). Für 10.000 Follower brauchst du Ausreißer. Zur Einordnung (Rechnung): +7.000 Follower bei 1 Follower pro 1.000 Views (Zielwert aus `docs/05`) sind 7 Mio. Views, bei 5 pro 1.000 sind es 1,4 Mio. Für das CRP kommen 100.000 Views in 30 Tagen dazu. Mit Buffer-Medianen (ca. 500 Views je Video, fremdes Konten-Sample) liefern 70 Videos nur ca. 35.000 Views. Ohne Ausreißer reicht es nicht.
4. **Dein Engpass ist nicht TikTok, sondern Qualität und Kapazität:** 7 Vorlagen, 190 Agentenstunden, 5 Stunden deiner Zeit, 61 Sekunden Mindestlänge, CRP-Kriterium Originalität. Schablonen-Videos mit gleicher Optik erhöhen das Risiko, als „unoriginal“ eingestuft zu werden. Belegt ist das nicht (A), aber ein Dauerbetrieb mit 3 Videos pro Tag aus 7 Vorlagen verstärkt es.

### 5.3 Empfehlung

- **2 pro Tag fest (Mittag und Abend).** Das liegt schon in der oberen Gruppe der Buffer-Daten und passt zu deiner Kapazität.
- **Das dritte Video ist Bonus, nicht Ziel:** höchstens 3 pro Woche, nur aus dem fertigen und geprüften Vorrat, nur zeitlose Themen, nie auf Kosten eines Terminvideos. Im Plan sind das 10 Videos, nicht 30.
- **Das ist die bessere Variante zu „immer 3 pro Tag“,** weil dieselbe Chance auf Ausreißer mit weniger Risiko für Qualität und Zeit entsteht. Der 2+1-Rahmen bleibt vollständig im Plan (CSV, Slot `bonus`).
- **Test statt Glaube:** Nach 14 Tagen haben wir 28 Videos (die Marke aus `docs/05`). **Auswertung am So 15.11.** mit diesen Regeln (alle A):
  - Bonus streichen, wenn sein Median unter 60 % des Haupt-Medians liegt.
  - Wenn ein Slot im Median mehr als 1,5-mal so viel bringt wie der andere, rücken Terminvideos dorthin.
  - Wenn eine Rubrik pro 1.000 Views weniger als die Hälfte der Follower bringt, sinkt ihr Anteil (Regel aus `docs/05`).
  - Wenn in Woche 2 der Median unter 70 % von Woche 1 liegt, gehen wir auf 1,5 Videos pro Tag.
- **Uhrzeiten (A):** Mittag 12:00, Bonus 16:00, Abend 20:00. So liegen immer mindestens 4 Stunden zwischen zwei Posts (Annahme aus `docs/09`). Ersetzen durch „Aktivste Zeiten“ in den Analytics, sobald Daten da sind.

## 6. Nächste Schritte

| # | Schritt | Wer | Zeit (S) | Wann |
|---|---|---|---|---|
| 1 | Plan prüfen, Fragen unter „Offene Punkte“ beantworten | Du | 15 Min. | So 01.11. |
| 2 | ElevenLabs: Preisliste prüfen, auf Creator wechseln | Du | 10 Min. | bis Mo 02.11. |
| 3 | Startvideos abnehmen und posten (Neubau mit Stimme Ben) | Du | 30–60 Min. | 31.10./01.11. |
| 4 | **V3 Duell-Tafel plus Netto-Modul bauen** | Claude (Opus) | 8–12 Std. | **bis Mo 02.11. vormittags** |
| 5 | V7 Spiel/Zufall bauen (parallele Sitzung) | Claude (Opus) | 6–10 Std. | bis Di 03.11. |
| 6 | Sechs Videos für 02.–04.11. produzieren (Stadt/Land, Desk-Sharing, 200 €, Ampel, 50/30/20, Schere-Stein-Papier) | Claude (Sonnet) | ca. 19 Std. (S) | 31.10.–03.11. |
| 7 | Windows-Setup und Zeitmessung mit GPU | Claude plus Du | 45–60 Min. | bis Sa 07.11. |
| 8 | V4 und V6 bauen | Claude (Opus) | 5–8 plus 8–12 Std. | bis 08.11. bzw. 12.11. |
| 9 | Wöchentlicher Upload-Stapel in TikTok Studio und YouTube Studio | Du | ca. 3,5 Std. | jeden Sonntag |
| 10 | Konkurrenz-Check vor jeder Produktion | Trend-Radar (läuft täglich) | im Lauf enthalten | täglich |
| 11 | Auswertung nach 28 Videos, Plan anpassen | Claude plus Du (Screenshots der Analytics) | 1 Std. plus 10 Min. | So 15.11. |
| 12 | V5 bauen | Claude (Opus) | 8–12 Std. | bis Mi 18.11. |
| 13 | Entscheidung: Release von GTA 6 noch am 19.11.? Sonst Plan B | Claude | 15 Min. | Sa 14.11. und Mo 16.11. |
| 14 | Dezember-Plan (Deutschlandticket, Mindestlohn, Brückentage) | Claude | 2 Std. | ab 22.11. |

## 7. Offene Punkte

- [ ] **ElevenLabs:** Welche Preisliste nutzt dein Konto (Creative mit Credits oder API mit Zeichen)? Wie viele Credits sind noch übrig? Upgrade auf Creator ja oder nein?
- [ ] **Stilwahl (vor Mo 02.11.):** `docs/10-designstile.md` empfiehlt Isometrie als Hauptlook und einen Test gegen Low-Poly. Die Vorlagen V3–V7 entstehen im gewählten Stil. Ohne Entscheidung bauen wir V3/V7 in Low-Poly. V1/V2 gibt es nur in Low-Poly.
- [ ] **Startvideos:** Posten am 31.10. oder 01.11.? Der Plan legt sie auf den 01.11. (Mittag GTA 6 weltweit, Abend Reißverschluss). Postest du sie schon am 31.10., bleiben die Slots am 01.11. leer oder gehen an den Reservevorrat.
- [ ] **Neubau der Startvideos** mit Stimme Ben und neuen Untertiteln (Entscheidung 31.10.): Ist er fertig und abgenommen? Der Plan setzt das voraus (A).
- [ ] **Release-Risiko:** GTA 6 wurde schon zweimal verschoben (F). Verschiebt Rockstar erneut, ersetzen wir das Video am 17.11. durch „Was kostet dein Auto pro Kilometer wirklich?“ (Reserve).
- [ ] **Mix-Wechsel** der Slots ab 15.11. (Mittag ALLTAG, Abend GELD): einverstanden?
- [ ] **Martinstag** ohne eigenes Video: einverstanden?
- [ ] **Bonus-Regel:** höchstens 3 pro Woche, insgesamt 10 im Plan: einverstanden?
- [ ] **Budget und Zeit** bestätigen (angenommen 5 Std. pro Woche, 50 € pro Monat) und den **Anteil am Max-Abo** (angenommen 50 %).
- [ ] **Auto-Posting:** Soll das Planungs-Tool aus `docs/11-automatisierung.md` den Upload übernehmen? Das würde deine Zeit senken. `CLAUDE.md` verbietet bisher jedes Bot-Posting.
- [ ] **Deutschlandticket** (Dezember): annehmen oder ablehnen?
- [ ] **Quellenprüfung ausstehend:** Die TikTok-Zitate habe ich nur aus Suchauszügen. tiktok.com ist in dieser Sitzung nicht erreichbar (laut `CLAUDE.md` sollte es freigegeben sein). Auch Firecrawl hat keine Credits mehr. Die Rechtsangaben (Pendlerpauschale 2026, Kfz-Frist, Ratenkauf-Recht ab 20.11.) werden vor der jeweiligen Produktion geprüft; die Spalte `quellen_pruefen` listet sie.
- [ ] **Renderzeit auf dem Windows-PC** ist unbekannt (nur Schätzung 5–15 Min.). Die Messung kommt in Schritt 7.

## Anhang A: Plan im Überblick

Fett = Priorität A (Terminvideo, fertig oder Fundament für spätere Videos). G = GELD, A = ALLTAG. In Klammern die Vorlage. Mittag 12:00, Bonus 16:00, Abend 20:00 (A).

| Datum | Mittag | Abend | Bonus |
|---|---|---|---|
| So 01.11. | **G · GTA 6: Kostet das Krankfeiern die Welt eine Milliarde? (V2)** | **A · Früh einordnen oder bis zum Ende fahren? (V1)** |  |
| Mo 02.11. | G · Stadt oder Land: Wo bleibt am Monatsende mehr übrig? (V2) | A · Desk-Sharing: Wie viele Schreibtische braucht ein Büro mit 100 Leuten wirklich? (V2) |  |
| Di 03.11. | **G · Warum bleibt von 200 € mehr Gehalt so wenig übrig? (V3)** | A · Fußgängerampel: Bringt mehrmaliges Drücken des Knopfs etwas? (V2) |  |
| Mi 04.11. | G · 50/30/20-Regel: Geht das mit deutschen Mieten überhaupt auf? (V3) | A · Schere, Stein, Papier: Gibt es eine Gewinnstrategie? (V7) |  |
| Do 05.11. | G · Mittagessen im Job: Kantine, selbst kochen oder bestellen? (V3) | A · Regenwahrscheinlichkeit: Was heißen 30 Prozent Regen wirklich? (V2) |  |
| Fr 06.11. | G · Heizung um 1 Grad senken: Wie viel Geld bringt das wirklich? (V3) | A · Heiße Hand: Gibt es Trefferserien im Sport wirklich? (V7) |  |
| Sa 07.11. | G · Hund oder Katze: Was kostet ein Haustier im ganzen Leben? (V3) | A · Ziegenproblem: Wechseln oder bleiben? (V7) |  |
| So 08.11. | G · 10 km/h langsamer auf 300 km: Wie viel Sprit sparst du, wie viel Zeit kostet es? (V1) | A · Mensch ärgere dich nicht: Rausschmeißen oder schnell laufen? (V7) | G · Hobbys im Kostenvergleich: Was kostet eine Stunde Spaß? (V3) |
| Mo 09.11. | G · 4-Tage-Woche: Wie viel Gehalt gibst du wirklich auf? (V3) | A · Kreisverkehr oder Ampelkreuzung: Was schafft mehr Autos? (V1) |  |
| Di 10.11. | G · 2.000 € Kreditkartenschulden: Wie lange dauert es mit der Mindestrate? (V4) | A · Geburtstagsparadoxon: Wie wahrscheinlich haben zwei in der Klasse am selben Tag Geburtstag? (V7) |  |
| Mi 11.11. | **G · Singles Day: Wie viel teurer ist Alleinleben als zu zweit? (V3)** | A · Haltestelle: Warum wartest du im Schnitt länger als gedacht? (V4) |  |
| Do 12.11. | G · Marke oder Eigenmarke: Wie viel sparst du im Jahr wirklich? (V3) | A · Spurwechsel im Stau: Bist du auf der anderen Spur wirklich schneller? (V1) | A · Fangen: Wie viele Fänger braucht ein Spielfeld? (V7) |
| Fr 13.11. | G · Wäschetrockner oder Wäscheleine: Was kostet ein Jahr Wäsche? (V3) | A · Morgens im Bad: Wer geht zuerst, damit alle pünktlich sind? (V6) |  |
| Sa 14.11. | G · Inflation: Was sind 10.000 € in 20 Jahren noch wert? (V4) | A · Zu viele Köche: Ab wie vielen Helfern wird es langsamer? (V6) | G · Lebensmittel im Müll: Wie viel Geld wirfst du pro Jahr weg? (V3) |
| So 15.11. | A · Schiffe versenken: Welche Schusstaktik gewinnt? (V7) | G · Was kostet ein Kind bis zum 18. Geburtstag? (V4) | G · Heizung nachts runter oder durchheizen: Was stimmt? (V6) |
| Mo 16.11. | A · Elfmeter: Ecke, Mitte oder hoch, und soll der Torwart springen? (V7) | G · Sommer- plus Winterreifen oder Ganzjahresreifen: Was ist über 8 Jahre günstiger? (V3) |  |
| Di 17.11. | A · 37-Prozent-Regel: Wann hörst du auf zu suchen und schlägst zu? (V4) | **G · GTA 6: Was kostet es Deutschland, wenn alle krankfeiern? (V2)** |  |
| Mi 18.11. | A · Ein Zimmer heizen oder alle gleichmäßig? (V6) | G · Pendlerpauschale: Wie viel Geld bekommst du für deinen Arbeitsweg zurück? (V3) | A · Warum bleibt immer eine einzelne Socke übrig? (V7) |
| Do 19.11. | A · Kassenschlange: Wenige Leute mit vollen Wagen oder viele mit wenigen Artikeln? (V5) | G · Mit 25 anfangen oder mit 35 mehr sparen: Wer liegt vorn? (V4) |  |
| Fr 20.11. | A · Spülmaschine einräumen: Welche Methode bekommt am meisten rein? (V6) | G · Haushaltshilfe: Lohnt es sich, Zeit gegen Geld zu tauschen? (V3) |  |
| Sa 21.11. | A · Kniffel: Wie viele Punkte schafft man mit perfekter Strategie? (V7) | **G · Kleinen Kfz-Schaden melden oder selbst zahlen? Die Rechnung vor dem 30.11. (V3)** | G · Täglicher Coffee-to-go: Was kostet die Gewohnheit in 10 Jahren? (V4) |
| So 22.11. | A · Kaffeekasse: Warum zahlen irgendwann nur noch wenige? (V4) | G · Dispo oder Ratenkredit: Was kosten 3.000 € Minus über ein Jahr? (V4) | A · Karten mischen: Wie oft musst du mischen, bis es zufällig ist? (V7) |
| Mo 23.11. | A · Rolltreppe: Links gehen, rechts stehen oder beide Seiten stehen? (V5) | G · Wie viele Arbeitsstunden kostet das? Preise in Lebenszeit (V3) |  |
| Di 24.11. | A · Best-of-3, 5 oder 7: Wie lang muss eine Serie sein, damit der Bessere gewinnt? (V7) | **G · Black Friday: Wie echt ist der Streichpreis? Der 30-Tage-Check (V4)** |  |
| Mi 25.11. | A · Stoßlüften oder Kippfenster: Was kostet mehr Wärme? (V6) | G · Tanken: Zu welcher Uhrzeit ist Sprit am günstigsten? (V4) | A · Reise nach Jerusalem: Hat der Schnellste wirklich Vorteil? (V7) |
| Do 26.11. | A · Frühstück: Kaffee, Toast, Eier, welche Reihenfolge wird zusammen fertig? (V6) | **G · Weihnachtsgeld: Was bleibt von 1.000 € brutto wirklich übrig? (V3)** |  |
| Fr 27.11. | A · Boarding: Hinten nach vorne, zufällig oder Steffen-Methode? (V5) | **G · 0-%-Finanzierung im Laden: Wo steckt der Preis? (V3)** |  |
| Sa 28.11. | A · Kuchen teilen: Einer schneidet, der andere wählt, ist das fair? (V7) | G · Gemeinsame Haushaltskasse: 50/50 oder nach Einkommen aufteilen? (V3) | G · Kaufen oder leihen: Ab wie vielen Einsätzen lohnt sich die eigene Bohrmaschine? (V4) |
| So 29.11. | **A · Weihnachtsmarkt: Einbahnweg oder freier Lauf zwischen den Buden? (V5)** | G · Abos im Check: Was kosten 10 Abos in 10 Jahren? (V4) | A · Münzwurf: Ist er wirklich 50:50? (V7) |
| Mo 30.11. | A · Baustelle: 60 oder 80 km/h, was lässt mehr Autos durch? (V1) | G · Weihnachten: Wie viel geben Familien aus und wie plant man das Budget? (V3) |  |

## Anhang B: Reserve für Ausfälle und Dezember

Sofort einsetzbare Videos, falls ein Slot ausfällt (Bonus dürfen auch als Ersatz dienen):

| ID | Titel | Vorlage | Aufwand |
|---|---|---|---|
| GD017 | Was kostet dein Auto pro Kilometer wirklich? (Plan B für GTA 6) | V3 | 3 |
| TL-002 | Phantomstau: Wie löst ein einziger Bremser kilometerlangen Stau aus? | V1 | 3 |
| GD102 | Balkonkraftwerk: Wann rechnet es sich? | V4 | 3 |
| TL-013 | Landstraße: Wie lang wird die Schlange hinter einem Traktor? | V1 | 3 |
| GD065 | Neuer Job, längerer Weg: Wie viel mehr Gehalt brauchst du? | V3 | 2 |
| GD122 | Teure oder billige Jacke: Was kostet ein Tragen? | V4 | 2 |
| GD020 | E-Bike statt Zweitwagen: Was spart eine Familie in 5 Jahren? | V4 | 3 |
| TL-089 | Memory: Wie viele Züge brauchst du, merken oder raten? | V7 | 2 |
| TL-057 | Drehtür oder Schwingtür: Was lässt mehr Leute durch? | V5 | 3 |
| TL-103 | Gefangenendilemma: Welche Strategie gewinnt das Turnier? | V7 | 3 |

## Quellen

Alle Links stehen an der jeweiligen Stelle im Text. Preise: [ElevenLabs Creative](https://elevenlabs.io/pricing) und [ElevenLabs API](https://elevenlabs.io/pricing/api), abgerufen am 31.10.2026. Interne Grundlagen: `STATUS.md`, `ENTSCHEIDUNGEN.md`, `docs/04`, `docs/05`, `docs/07`, `docs/08`, `docs/09`, `docs/11`, `docs/trends/vorschlaege.md`, `data/ideen/*.csv`, `data/monitor/*.csv`, `data/trends/kalender.csv`.

## Anhang C: Konkurrenz-Abgleich 31.10. (vom Inhaber geschickte Videos)

**Geändert im Plan (keine Kopien, CLAUDE.md):**
- **Reißverschluss** (01.11. abends) ist zurückgestellt. @simulierts hat das Thema am 31.10. um 10:52 Uhr gepostet („Früh einordnen oder bis zum Ende fahren: Was macht den Stau wirklich kürzer?“, 14.100 Views, F: öffentliche Videoseite). **Ersatz:** „Spurwechsel im Stau“, vorgezogen vom 12.11. Es nutzt die vorhandene Straßen-Vorlage.
- **12.11. abends:** neu „Parkplatzsuche: Den ersten freien Platz nehmen oder näher ran kreisen?“.
- **15.11. Bonus:** „Heizung nachts“ (@fabrik.neu hat es) → „Duschen: 5 oder 10 Minuten“.
- **21.11. Bonus:** „Coffee-to-go“ (@geldsimuliert: Kaffee gegen Geldanlage) → „Leitungswasser oder Flaschenwasser“.

**Was wir von den Videos lernen** (F: TikTok-Spracherkennung der öffentlichen Videos, 4 Videos):
- Sie sprechen **nicht langsamer, sondern in kürzeren Sätzen**:
  - 2,6–2,9 Wörter/s insgesamt (wir zuvor: 2,3).
  - Im Schnitt 7–8 Wörter je Satzstück.
  - Nach fast jedem Satz eine Pause von ca. 0,3 s.
- **Hook** ist eine steile Behauptung mit Zahl: „Dieser Kaffee kostet dich nicht 3 Euro, sondern über 100.000.“ bzw. „Dieses Auto verbrennt jeden Tag 27 Euro.“
- **Zwei Personen** mit Namen statt „Variante A/B“ machen das Duell greifbar (@geldsimuliert: Tom gegen Lisa).
- **Kleine Beträge pro Tag** werden auf Jahre hochgerechnet („27 Euro jeden einzelnen Tag“).
- **Reichweite einordnen:** Die @geldsimuliert-Videos lagen am 31.10. bei nur ca. 1.000–3.300 Views, trotz 97.700 Followern. Die Stimme allein macht keine Reichweite.

**Neue eigene Ideen** (Reserve, Format: klare Rechnung, zwei Seiten):

| Rubrik | Titel |
|---|---|
| GELD | Standby: Was kosten Geräte, die nie ganz ausgehen, im Jahr? |
| GELD | Pfandflaschen sammeln: Welcher Stundenlohn kommt dabei raus? |
| GELD | Fitnessstudio-Abo oder draußen laufen: Was kostet ein Training wirklich? |
| GELD | Mit dem Auto zum Bäcker: Was kostet die Kurzstrecke im Jahr? |
| GELD | Bäcker oder selbst gebacken: Wer spart mehr, wenn man die Zeit mitrechnet? |
| ALLTAG | Aufzug oder Treppe: Was ist im Bürohaus schneller? |
| ALLTAG | Tankstelle: Gleich tanken oder zur 5 Cent billigeren 3 km weiter? |
| ALLTAG | Schlange am Flughafen: Eine lange Schlange für alle oder eine pro Schalter? |
