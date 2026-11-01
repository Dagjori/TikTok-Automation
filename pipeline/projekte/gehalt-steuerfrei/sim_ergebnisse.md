# Rechnung: 200 € mehr Gehalt oder 100 € steuerfrei (Stand 2026)

**Quelle der Zahlen:** `pipeline/sim/gehalt_steuerfrei.mjs` mit dem Netto-Modul `pipeline/sim/netto.mjs` (Lohnsteuer nach BMF-Programmablaufplan 2026, Sozialabgaben 2026). Tests: `node --test pipeline/sim/netto.test.mjs` (11 Tests, alle grün).

**Kennzeichnung:** **(F)** belegter Fakt bzw. nach Gesetz/PAP gerechnet · **(S)** Schätzung · **(A)** Annahme. Nur Modellrechnung, keine Steuer- oder Rechtsberatung.

## Annahmen

| | Wert |
|---|---|
| Person (A) | 3.500 € brutto im Monat, Steuerklasse 1, kinderlos (über 23), gesetzlich versichert, durchschnittlicher Zusatzbeitrag 2,9 %, ohne Kirchensteuer, nicht Sachsen |
| Team GEHALT (A) | +200 € brutto laufender Arbeitslohn |
| Team STEUERFREI (A) | 50 € Sachbezug (Gutschein bzw. Geldkarte, Freigrenze § 8 Abs. 2 Satz 11 EStG) + 50 € Zuschuss zum Jobticket (§ 3 Nr. 15 EStG, Deutschlandticket 2026: 63 €); beides zusätzlich zum ohnehin geschuldeten Lohn (§ 8 Abs. 4 EStG), daher steuer- und beitragsfrei (§ 1 Abs. 1 SvEV). Der Jobticket-Zuschuss zählt nicht auf die 50-€-Freigrenze. |

**Warum nicht „100 € steuerfrei“ in bar?** Geld kann der Arbeitgeber nicht steuerfrei zahlen. Der Sachbezug ist auf 50 € im Monat begrenzt (Freigrenze, 2026 unverändert). Darum besteht das „steuerfreie Hundert“ im Video aus 50 € Gutschein plus 50 € Jobticket. So ist die Aussage rechtlich korrekt, und der Kern bleibt: Die Hälfte steuerfrei bringt fast so viel wie das Doppelte brutto.

## Ergebnis bei 3.500 € brutto

| Schritt | Abzug | Rest von +200 € |
|---|---|---|
| Rente (9,3 %) | 18,60 € | 181,40 € |
| Kranken (7,3 % + 1,45 %) | 17,50 € | 163,90 € |
| Pflege (1,8 % + 0,6 %) | 4,80 € | 159,10 € |
| Arbeitslosen (1,3 %) | 2,60 € | 156,50 € |
| **Sozialabgaben gesamt** | **43,50 €** (21,75 %) | |
| Lohnsteuer (Grenzsteuersatz ca. 29 % auf den steuerpflichtigen Teil) | 46,75 € (23,4 % der 200 €) | **109,75 €** |
| Soli | 0 € (Freigrenze 20.350 € nicht erreicht) | |

- **Endstand (F, Rechnung):** GEHALT 109,75 € gegen STEUERFREI 100,00 €. Das Gehalt gewinnt mit 9,75 €.
- Von den 200 € gehen 90,25 € ab, das sind 45 % („fast die Hälfte“).
- Netto gesamt: 2.333,25 € (3.500 €) gegen 2.443,00 € (3.700 €).
- Mit Kirchensteuer (9 %) blieben nur 105,54 € (S, nicht im Video).

## Zweite Überraschung: 5.500 € brutto

- +200 € brutto bringen **99,09 €** netto (Sozialabgaben 43,50 €, Lohnsteuer 57,41 €). Steuerfrei gewinnt mit 0,91 €.
- Kipppunkt: ab ca. **5.340 €** brutto bringen 200 € brutto weniger als 100 € netto.
- **Wichtig für die Formulierung:** Über der Beitragsbemessungsgrenze der Kranken- und Pflegeversicherung (5.812,50 € im Monat) fallen auf das Plus keine KV/PV-Beiträge mehr an. Dann gewinnt wieder das Gehalt (6.000 €: 110,30 €). Darum nennt das Video nur das konkrete Beispiel 5.500 € und keine Pauschalaussage „je mehr, desto weniger“.

| Brutto | 200 € brutto ergeben netto | Sieger |
|---|---|---|
| 2.500 € | 115,00 € | Gehalt |
| 3.000 € | 112,33 € | Gehalt |
| 3.500 € | 109,75 € | Gehalt |
| 4.000 € | 107,09 € | Gehalt |
| 5.000 € | 101,75 € | Gehalt |
| 5.400 € | 99,58 € | steuerfrei |
| 5.500 € | 99,09 € | steuerfrei |
| 5.800 € | 110,83 € | Gehalt (über KV-BBG) |
| 8.000 € | 93,57 € | steuerfrei (Soli-Milderungszone) |

## Bedingung: Rente

- 200 € mehr Brutto im Monat = 2.400 € im Jahr = 0,0462 Entgeltpunkte (Durchschnittsentgelt 2026: 51.944 €) = **ca. 1,96 € Monatsrente je Beitragsjahr** (Rentenwert ab 01.07.2026: 42,52 €; ohne Rentendynamik, S).
- 30 Jahre: ca. 59 € Monatsrente zu heutigen Werten (S).
- Steuerfreie Extras erzeugen keine Entgeltpunkte und zählen auch nicht für Krankengeld, Elterngeld und Arbeitslosengeld (F).

## Prüfwerte des Netto-Moduls (Tests)

| Prüfung | Erwartet | Quelle |
|---|---|---|
| ESt-Grundtabelle 2026: zvE 15.000 / 40.000 / 50.000 / 60.000 € | 435 / 7.209 / 10.548 / 14.233 € | steuerschroeder.de, rechner-hub.de, vermoegenszentrum.de (§ 32a EStG 2026) |
| Lohnsteuer 3.000 € StKl I | 293,08 € | Ordio-Lohnsteuerrechner, Beispieltabelle 2026 |
| Lohnsteuer 3.500 € StKl III / VI | 110,16 € / 822,33 € | Ordio-Lohnsteuerrechner, Beispieltabelle 2026 |
| Netto 3.000 € StKl I, kinderlos, ZB 2,9 %, ohne KiSt | 2.054,42 € | rechner-portal.de |
| Sozialabgaben, BBG, Soli-Freigrenze, Rentenpunkte | Rechnung von Hand | Rechengrößen 2026, PAP 2026 |
