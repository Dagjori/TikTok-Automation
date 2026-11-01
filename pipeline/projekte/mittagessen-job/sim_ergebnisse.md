# Mittagessen im Job: Selbst kochen oder bestellen, was kostet ein Jahr wirklich?

Modellrechnung 2026, Code `pipeline/sim/mittagessen.mjs`, 13 Tests (`node --test pipeline/sim/mittagessen.test.mjs`). Netto-Modul `pipeline/sim/netto.mjs` (PAP 2026). Quellen und Einordnung der Annahmen: `skript.json` („quellen“, „annahmen“). Nur Modellrechnung, keine Beratung, keine Anbieter.

## Annahmen (A)

| Größe | Wert |
|---|---|
| Person | 3.500 € brutto, 40-Stunden-Woche, Steuerklasse 1, kinderlos, ohne Kirchensteuer → netto 2.333,25 € im Monat |
| Netto-Stundenlohn | 2.333,25 × 12 / 52 / 40 = **13,46 €** |
| Arbeitstage | 220, an jedem ein Mittagessen |
| Kochen (Meal-Prep) | 3,50 € je Portion (Zutaten, Strom, Verpackung), 15 Minuten (Einkaufen 3, Kochen 9, Spülen 3) |
| Bestellen | 12,50 € Gericht + 2,50 € Lieferung und Service = 15 €, 6 Minuten (Bestellen 2, Entgegennehmen 4) |
| Kantine mit Zuschuss | 4,57 € Eigenanteil (Sachbezugswert 2026 für ein Mittagessen), 10 Minuten (Weg, Anstehen) |
| Zeit | wird mit dem Netto-Stundenlohn bewertet (Modellannahme: eine Stunde Freizeit ist so viel wert wie eine Stunde Arbeit netto) |

## Ergebnis

| | Geld | Zeit | Zeit in € | Gesamt |
|---|---|---|---|---|
| Kochen | 770 € | 55 h | 740,36 € | **1.510,36 €** |
| Bestellen | 3.300 € | 22 h | 296,14 € | **3.596,14 €** |
| Kantine | 1.005,40 € | 36,7 h | 493,57 € | **1.498,97 €** |

- Kochen gewinnt gegen Bestellen: Geld +2.530 €, Zeit −444,21 €, Gesamt **+2.085,79 €** (Faktor 2,38).
- Kantine liegt nur **11,39 €** (0,8 %) vor dem Kochen: innerhalb der Annahmen ein Gleichstand.
- Kipppunkt: Ab **14,77 Minuten** Kochzeit je Portion ist die Kantine günstiger als Kochen. Bestellen schlägt Kochen erst ab 57,3 Minuten.

## Empfindlichkeit (Gesamtkosten im Jahr, gerundet)

| Variante | Rangfolge (günstig → teuer) | Kochen | Bestellen | Kantine |
|---|---|---|---|---|
| Zutaten 2,50 €, Kochzeit 10 min | Kochen < Kantine < Bestellen | 1.044 | 3.596 | 1.499 |
| Zutaten 2,50 €, Kochzeit 15 min | Kochen < Kantine < Bestellen | 1.290 | 3.596 | 1.499 |
| Zutaten 2,50 €, Kochzeit 25 min | Kantine < Kochen < Bestellen | 1.784 | 3.596 | 1.499 |
| Zutaten 3,50 €, Kochzeit 10 min | Kochen < Kantine < Bestellen | 1.264 | 3.596 | 1.499 |
| **Zutaten 3,50 €, Kochzeit 15 min (Video)** | Kantine < Kochen < Bestellen | 1.510 | 3.596 | 1.499 |
| Zutaten 3,50 €, Kochzeit 25 min | Kantine < Kochen < Bestellen | 2.004 | 3.596 | 1.499 |
| Zutaten 5 €, Kochzeit 10 min | Kantine < Kochen < Bestellen | 1.594 | 3.596 | 1.499 |
| Zutaten 5 €, Kochzeit 15 min | Kantine < Kochen < Bestellen | 1.840 | 3.596 | 1.499 |
| Zutaten 5 €, Kochzeit 25 min | Kantine < Kochen < Bestellen | 2.334 | 3.596 | 1.499 |
| Weg zur Kantine 5 min | Kantine < Kochen < Bestellen | 1.510 | 3.596 | 1.252 |
| Weg zur Kantine 15 min | Kochen < Kantine < Bestellen | 1.510 | 3.596 | 1.746 |
| Gericht 10 € (Bestellen 12,50 €) | Kantine < Kochen < Bestellen | 1.510 | 3.046 | 1.499 |
| Gericht 15 € (Bestellen 17,50 €) | Kantine < Kochen < Bestellen | 1.510 | 4.146 | 1.499 |
| 200 Arbeitstage | Kantine < Kochen < Bestellen | 1.373 | 3.269 | 1.363 |
| 230 Arbeitstage | Kantine < Kochen < Bestellen | 1.579 | 3.760 | 1.567 |

**Robust:** Bestellen ist in allen 18 Varianten am teuersten. **Nicht robust:** Kochen gegen Kantine kippt je nach Kochzeit und Weg. Das Video sagt deshalb „Die Kantine holt das Kochen ein“ (Gleichstand) und zeigt den Kipppunkt (14,8 Minuten Kochzeit).

## Plan-Hypothese („Mit Zeit gerechnet holt die Kantine mit Zuschuss beide ein“)

Nur zur Hälfte bestätigt. Die Kantine holt das **Kochen** ein (11 € vorn), den **Lieferdienst** überholt sie klar, „einholen“ muss sie ihn aber nicht, weil er weit zurückliegt. Das Video ist ehrlich umgebaut: Wendung 1 = Zeit mit einrechnen, Ergebnis = Kochen gewinnt gegen Bestellen (1.510 gegen 3.596 €), zweite Überraschung = Kantine holt das Kochen ein (1.499 €), Bedingung = Kipppunkt Kochzeit.

## Zahlen im Video (gesprochen bzw. im Bild)

- Gesprochen exakt: 220 Arbeitstage, 3,50 €, 15 €, 770 €, 3.300 €, 15 Minuten, 13,46 € Netto-Stundenlohn, 55 Stunden, 740 €, 6 Minuten, 1.510 €, 4,57 €, 10 Minuten.
- Gesprochen gerundet (exakt im Bild): „knapp 300 €“ (296 €), „fast 3.600 €“ (3.596 €), „fast 1.500 €“ (1.499 €).
- Nur im Bild: −2.530 € Geld, +444 € Zeit, 27.999 € netto im Jahr ÷ 2.080 Stunden, Kipppunkt 14,8 Minuten.
