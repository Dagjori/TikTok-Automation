# Trend-Vorschläge

Nur Signale mit Score ≥ 70 nach dem Raster in [07-trend-monitoring.md](../07-trend-monitoring.md). Neueste Vorschläge stehen oben. Alle Bewertungen, auch die verworfenen, stehen in `data/trends/trend-log.csv`.

Status: `neu` · `angenommen` · `abgelehnt` · `produziert`

---

## 💶 Mindestlohn 14,60 €: Was kommt netto wirklich mehr an?
- **Score:** 86 (Nachfrage 4, Timing 5, Wettbewerb 3, Passung 5, Aufwand 5, Risiko 4) · **Status:** neu
- **Warum:**
  - Fester Termin am 01.01.2027 (F: Mindestlohn steigt von 13,90 auf 14,60 €, MiLoV5 vom 05.11.2025, [Bundesregierung](https://www.bundesregierung.de/breg-de/aktuelles/mindestlohn-faq-1688186)).
  - „Was ändert sich 2027“ ist jedes Jahr ein großes Suchthema (F: viele Medienartikel, z. B. [Stuttgarter Zeitung](https://www.stuttgarter-zeitung.de/wirtschaft/rente-kindergeld-mindestlohn-hier-gibt-es-ab-2027-mehr-geld-79572169.html)).
- **Eigene Umsetzung:**
  - 1.000 simulierte Beschäftigte mit unterschiedlicher Stundenzahl und Steuerklasse.
  - Wie viel von +5 % brutto landet netto?
  - Twist: Die Minijob-Grenze steigt auf 633 € mit. Minijobber bekommen also mehr Geld, aber nicht mehr Stunden (F: 633 € laut [ad-hoc-news](https://www.ad-hoc-news.de/wirtschaft/mindestlohn-2027-14-60-euro-pro-stunde-und-neue-minijob-grenze/70437005); rechnerisch 14,60 € × 130 / 3 = 632,67 €).
- **Vor Produktion prüfen:** Grundfreibetrag und Sozialabgaben 2027 (Stand 31.10. noch nicht gefunden).
- **Posten:** 28.12.2026 bis spätestens 05.01.2027.

## 💶 Weihnachtsgeld: Was bleibt von 1.000 € brutto wirklich übrig?
- **Score:** 83 (Nachfrage 3, Timing 5, Wettbewerb 4, Passung 5, Aufwand 5, Risiko 4) · **Status:** neu
- **Warum:**
  - Wird üblicherweise mit dem Novembergehalt gezahlt (A: hängt vom Tarif- bzw. Arbeitsvertrag ab).
  - Die Frage „Warum bleibt so wenig übrig?“ bringt Diskussion in die Kommentare.
- **Eigene Umsetzung:** 1.000 simulierte Beschäftigte nach Einkommen und Steuerklasse. Verteilung von „Was kommt an?“, Erklärung von Sonderzahlung und Progression.
- **Vor Produktion prüfen:** Lohnsteuer 2026 laut BMF-Programmablaufplan bzw. Lohnsteuerrechner.
- **Hinweis:** Nicht direkt neben Testlauf #2 („200 € mehr Gehalt“) posten, sondern mindestens 5 Tage Abstand.
- **Posten:** 20.–28.11.2026.
