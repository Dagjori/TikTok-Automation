# Trend-Vorschläge

Nur Signale mit Score ≥ 70 nach dem Raster in [07-trend-monitoring.md](../07-trend-monitoring.md). Neueste Vorschläge stehen oben. Alle Bewertungen, auch die verworfenen, stehen in `data/trends/trend-log.csv`.

Status: `neu` · `angenommen` · `abgelehnt` · `produziert`

---

## ⏱️ Heizung nachts runter oder durchheizen: Was kostet die Gewohnheit wirklich?
- **Score:** 82 (Nachfrage 4, Timing 4, Wettbewerb 3, Passung 5, Aufwand 4, Risiko 5) · **Status:** neu
- **Warum:**
  - Neukunden zahlen für Erdgas wieder ca. 12 ct/kWh, im Februar waren es ca. 8 ct (F: laut [ms-aktuell](https://ms-aktuell.de/welt/gaspreise-winter-26-10-2026/); [FTD Finanzcheck](https://www.ftd.de/finanzen/finanzcheck/gaspreise-2026-heizkosten-steigen-wegen-nahost-konflikt/) nennt den Nahost-Konflikt als Grund). Prognosen gehen auseinander (Juni-Quelle sah sinkende Kosten), vor Produktion prüfen.
  - Heizspiegel 2026: 70 m² Mehrfamilienhaus Gas 1.120 €, Wärmepumpe 735 €, Heizöl 1.275 € (F: [co2online laut Suchzusammenfassung](https://reduco.ai/blog/heizung/heizkostenvergleich-2026)).
  - Heizsaison läuft, das Thema wird mit jeder Kältewelle stärker (A).
- **Eigene Umsetzung (Strategie-Vergleich, Rennen gegen die Uhr):** Zwei Wohnungen, gleiche Dämmung, gleicher Preis. Wohnung A senkt nachts auf 16 °C, Wohnung B heizt durch. Sichtbarer Euro-Zähler und Raumtemperatur über 24 Stunden. Denkfalle: „Klar, Durchheizen spart Energie, weil nichts auskühlt. Oder?“ Zwei Wendungen: erst Aufheizen frisst einen Teil der Ersparnis, dann hängt der Sieg von der Dämmung ab.
- **Achtung:** fabrik.neu (5 Follower) hat „Heizung nachts runter oder durchheizen“ am 31.10. gepostet, nicht viral. Eigener Ansatz nötig (Zähler, Dämmungs-Wendung), keine Kopie. Konkurrenz-Check vor Produktion.
- **Vor Produktion prüfen:** Physik (Newton-Abkühlung, Heizleistung) im Code mit Tests, Gaspreis als offene Annahme.
- **Posten:** ab sofort, spätestens 20.12.2026 (Weihnachten-Slot frei halten).

## 💶 Tankrabatt endet: Lohnt sich Volltanken am 31.12. oder reicht der 2. Januar?
- **Score:** 80 (Nachfrage 4, Timing 4, Wettbewerb 4, Passung 4, Aufwand 4, Risiko 4) · **Status:** neu
- **Warum:**
  - Die Energiesteuer auf Benzin und Diesel ist vom 01.10. bis 31.12.2026 um 14,04 ct/l gesenkt (ca. 17 ct brutto). Ab 01.01.2027 gelten wieder 654,50 €/1.000 l Benzin und 470,40 €/1.000 l Diesel (F: [Bundestag](https://www.bundestag.de/resource/blob/1225468/tankrabatt.pdf), [Verkehrsrundschau](https://www.verkehrsrundschau.de/nachrichten/transport-logistik/tankrabatt-2026-beschlossen-bis-zu-17-cent-weniger-pro-liter-3909527), [fuel-prices.eu](https://www.fuel-prices.eu/news/germany-fuel-tax-cut-1-october-2026/)).
  - Die Weitergabe an der Zapfsäule ist nicht vorgeschrieben; beim ersten Rabatt kamen 2,9 ct (Diesel) bzw. 3,7 ct (E5) nicht an (F: laut Suchzusammenfassung, vor Produktion gegen Primärquelle prüfen).
- **Eigene Umsetzung (Duell, ALLTAG/GELD):** Eine Modellrechnung mit zwei Fahrern: Fahrer A tankt am 31.12. voll, Fahrer B am 02.01. Wer spart wirklich? Bedingung: Tankgröße, Umweg und Zeit. Zwei Wendungen: Ersparnis pro Tankfüllung (A: ca. 50 l × 0,17 € ≈ 8,35 €, Rechnung vorher prüfen) und ob der Umweg sie auffrisst.
- **Vor Produktion prüfen:** Primärquelle BMF, aktuelle Spritpreise, Hinweis „Modellrechnung“, keine Anlageberatung.
- **Posten:** 15.–23.12.2026 empfohlen, spätestens 29.12.2026.

## 💶 Weihnachtsbaum 2026 wird teurer: Echter Baum oder Kunstbaum, wer gewinnt über 10 Jahre?
- **Score:** 70 (Nachfrage 3, Timing 4, Wettbewerb 2, Passung 4, Aufwand 4, Risiko 5) · **Status:** neu (schwächerer Vorschlag)
- **Warum:** Nordmanntannen kosten 2026 bis zu 33 €/m, das Angebot sinkt (F: Einzelquelle [ms-aktuell](https://ms-aktuell.de/finanzen/weihnachtsbaum-preise-11-10-2026/) laut Erzeugerverband). Der Vergleich Echtbaum gegen Kunstbaum ist ein Evergreen, vermutlich bereits viel umgesetzt (A).
- **Eigene Umsetzung (Duell):** Echter Baum gegen Kunstbaum, Kosten je Weihnachten, Break-even nach X Jahren. Twist: Lagerplatz und Entsorgung.
- **Vor Produktion prüfen:** zweite Preisquelle, Wettbewerber auf TikTok prüfen.
- **Posten:** 01.–08.12.2026, spätestens 12.12.2026.

---

## 💶 GTA 6 weltweit: Kostet das Krankfeiern die Welt eine Milliarde? (Video #1, wird am 31.10. produziert)
- **Änderung 31.10. (Inhaber):** Weltweit gerechnet statt nur Deutschland. Posten **heute**. Skript: `pipeline/projekte/gta6-welt/skript.json`. Ergebnis der Rechnung: ca. 300 Mio. $ weltweit, unter 1 Promille eines Welt-Arbeitstags.
- **Deutschland-Version** (unten) bleibt als **eigene Idee für später**, z. B. rund um den Release am 19.11.

## 💶 Idee für später: GTA 6, was kostet es Deutschland, wenn alle krankfeiern?
- **Score:** 85 (Nachfrage 5, Timing 5, Wettbewerb 3, Passung 4, Aufwand 4, Risiko 3) · **Status:** angenommen (Idee des Inhabers, 31.10.) · **Video #1, posten 17.11.2026**
- **Warum:**
  - Release am 19.11.2026 (F laut Medien, z. B. [arynews](https://arynews.tv/gta-6-release-date-confirmed-for-november-2026-pc-version-delayed); bei Rockstar bestätigen).
  - Die US-Zahl „1 Mrd. $ Schaden“ geht viral, Ökonomen widersprechen ([Fortune](https://fortune.com/2026/10/22/gta-vi-sick-days-billion-economy-costs-productivity/), [GameStar](https://www.gamestar.de/artikel/verursacht-gta-6-echt-eine-milliarde-dollar-wirtschaftsschaden-quatsch,3461847.html)).
  - **Für Deutschland mit deutschen Zahlen hat es noch niemand simuliert.**
- **Eigene Umsetzung:** Käufer am 1. Tag × Berufstätige × Krankmeldequote (Umfragen UK/USA) × Wertschöpfung pro Arbeitstag (Destatis). Dreh am Ende: unter 1 Promille eines Arbeitstags. Dazu der Hinweis zur fristlosen Kündigung bei vorgetäuschter Krankheit (Rechtsprechung des BAG).
- **Risiko:**
  - Thema Krankfeiern: Wir raten ausdrücklich davon ab.
  - Marke GTA: nur redaktionell nennen, keine Spielszenen, kein Logo.
  - Erstes Video mit Gaming-Bezug: Das Publikum könnte anfangs gaming-lastig werden. Deshalb folgen direkt breite Alltags-Themen.
- **Skript:** `docs/08-beispielskripte.md`, Video #1.

---

## 💶 Deutschlandticket wird teurer: Ab wie vielen Fahrten lohnt es sich noch?
- **Score:** 79 (Nachfrage 4, Timing 4, Wettbewerb 3, Passung 4, Aufwand 4, Risiko 5) · **Status:** neu
- **Warum:**
  - Preis steigt am 01.01.2027 von 63 € auf 66,80 € (F: Verkehrsministerkonferenz laut [Tagesspiegel Background](https://background.tagesspiegel.de/verkehr-und-smart-mobility/briefing/deutschlandticket-wird-2027-teurer), [Stuttgarter Zeitung](https://www.stuttgarter-zeitung.de/panorama/preiserhoehung-deutschlandticket-kostet-2027-rund-45-euro-mehr-79612861.html)).
  - Bis Ende 12.2026 gilt noch 63 € (F: laut Suchzusammenfassung, vor Produktion prüfen).
  - Erstmals Index-Automatismus, also künftig jährlich Thema (A).
- **Eigene Umsetzung:** Pendler-Duell Ticket gegen Einzelfahrten gegen Auto für 2–3 typische Strecken. Ab wie vielen Fahrten lohnt sich das Ticket noch? Rubrik GELD, Idee GD019 als Basis.
- **Vor Produktion prüfen:** Einzelticket-Preise je Region, Autokosten (ADAC), Preis 66,80 € gegen Primärquelle VMK.
- **Posten:** 12.–20.12.2026 empfohlen (Abstand zum Mindestlohn-Video), spätestens 03.01.2027.

---

## 💶 Mindestlohn 14,60 €: Was kommt netto wirklich mehr an?
- **Score:** 86 (Nachfrage 4, Timing 5, Wettbewerb 3, Passung 5, Aufwand 5, Risiko 4) · **Status:** angenommen (31.10., unter der Bedingung mindestens 1 Minute; Ablauf mit ca. 75 s in `docs/08-beispielskripte.md`)
- **Warum:**
  - Fester Termin am 01.01.2027 (F: Mindestlohn steigt von 13,90 auf 14,60 €, MiLoV5 vom 05.11.2025, [Bundesregierung](https://www.bundesregierung.de/breg-de/aktuelles/mindestlohn-faq-1688186)).
  - „Was ändert sich 2027“ ist jedes Jahr ein großes Suchthema (F: viele Medienartikel, z. B. [Stuttgarter Zeitung](https://www.stuttgarter-zeitung.de/wirtschaft/rente-kindergeld-mindestlohn-hier-gibt-es-ab-2027-mehr-geld-79572169.html)).
- **Eigene Umsetzung:**
  - Drei typische Fälle: Vollzeit, Teilzeit, Minijob.
  - Wie viel von +5 % brutto landet netto?
  - Twist: Die Minijob-Grenze steigt auf 633 € mit. Minijobber bekommen also mehr Geld, aber nicht mehr Stunden (F: 633 € laut [ad-hoc-news](https://www.ad-hoc-news.de/wirtschaft/mindestlohn-2027-14-60-euro-pro-stunde-und-neue-minijob-grenze/70437005); rechnerisch 14,60 € × 130 / 3 = 632,67 €).
- **Vor Produktion prüfen:** Grundfreibetrag und Sozialabgaben 2027 (Stand 31.10. noch nicht gefunden).
- **Posten:** 28.12.2026 bis spätestens 05.01.2027.

## 💶 Weihnachtsgeld: Was bleibt von 1.000 € brutto wirklich übrig?
- **Score:** 83 (Nachfrage 3, Timing 5, Wettbewerb 4, Passung 5, Aufwand 5, Risiko 4) · **Status:** angenommen (31.10., unter der Bedingung mindestens 1 Minute; Skript mit 72 s in `docs/08-beispielskripte.md`)
- **Warum:**
  - Wird üblicherweise mit dem Novembergehalt gezahlt (A: hängt vom Tarif- bzw. Arbeitsvertrag ab).
  - Die Frage „Warum bleibt so wenig übrig?“ bringt Diskussion in die Kommentare.
- **Eigene Umsetzung:** Durchgerechnet für 3.500 € brutto, Steuerklasse 1. Erklärung von Sonderzahlung und Grenzsteuersatz. Skript in `docs/08-beispielskripte.md`.
- **Vor Produktion prüfen:** Lohnsteuer 2026 laut BMF-Programmablaufplan bzw. Lohnsteuerrechner.
- **Hinweis:** Nicht direkt neben Testlauf #2 („200 € mehr Gehalt“) posten, sondern mindestens 5 Tage Abstand.
- **Posten:** 20.–28.11.2026.
