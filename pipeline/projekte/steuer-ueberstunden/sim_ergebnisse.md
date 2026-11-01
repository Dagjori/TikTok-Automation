# Rechnung: Steuererklärung oder Überstunden (Stand 2026)

**Quelle der Zahlen:** `pipeline/sim/steuer_ueberstunden.mjs` mit dem Netto-Modul `pipeline/sim/netto.mjs` (Lohnsteuer nach BMF-Programmablaufplan 2026, Sozialabgaben 2026). Tests: `node --test pipeline/sim/steuer_ueberstunden.test.mjs` (7 Tests) und `node --test pipeline/sim/netto.test.mjs` (11 Tests), alle grün.

**Kennzeichnung:** **(F)** belegter Fakt bzw. nach Gesetz/PAP gerechnet · **(S)** Schätzung bzw. Modellwert · **(A)** Annahme. Nur Modellrechnung, keine Steuer- oder Rechtsberatung.

## Annahmen

| | Wert |
|---|---|
| Person (A) | 3.500 € brutto im Monat, 40-Stunden-Woche, Steuerklasse 1, kinderlos (über 23), gesetzlich versichert, Zusatzbeitrag 2,9 %, ohne Kirchensteuer |
| Zeit (A) | 4 Stunden nach Feierabend (17–21 Uhr). Gerundet aus 3 h 50 min für eine typische Arbeitnehmer-Erklärung (F, Bundesregierung 2019) |
| Team ÜBERSTUNDEN (A) | 4 bezahlte Überstunden zum normalen Stundenlohn, ohne Zuschlag, im selben Monat |
| Team STEUERERKLÄRUNG, Fall A (A) | 25 km, 138 Bürotage + 92 Homeoffice-Tage (3 + 2 Tage pro Woche, 46 Wochen), Arbeitsmittel 120 €, Kontoführung 16 € |
| Fall B (A) | 5 km, 230 Bürotage, kein Homeoffice, keine Arbeitsmittel, Kontoführung 16 € |
| Erstattungsmodell (A) | Einziger Unterschied zwischen Lohnsteuerabzug und Veranlagung: Werbungskosten über dem Pauschbetrag (Vorsorgeaufwendungen = Vorsorgepauschale, keine Sonderausgaben, keine haushaltsnahen Dienstleistungen) |

**Regeln 2026 (F):** Arbeitnehmer-Pauschbetrag 1.230 € (§ 9a EStG) · Entfernungspauschale 0,38 € je km ab dem ersten Kilometer (Steueränderungsgesetz 2025) · Homeoffice-Pauschale 6 € je Tag, höchstens 1.260 € (§ 4 Abs. 5 Satz 1 Nr. 6c EStG).

## Überstunden

| | Wert |
|---|---|
| Stundenlohn brutto | 3.500 × 12 / 52 / 40 = **20,19 €** |
| 4 Überstunden brutto | 80,77 € |
| Sozialabgaben (21,75 %) | −17,57 € |
| Lohnsteuer (Grenzsteuersatz ca. 29 % auf den steuerpflichtigen Teil) | −18,75 € |
| **Netto** | **44,45 €** (45 % Abzüge, „fast die Hälfte“) |
| **Pro Stunde** | **11,11 €** |

Varianten (S, nicht im Video): mit 25 % Zuschlag (heute voll steuerpflichtig) 55,60 € netto = 13,90 €/h; hypothetisch mit lohnsteuerfreiem Zuschlag nach dem nicht beschlossenen Plan 60,26 € = 15,07 €/h. Der Sieger in Fall A ändert sich dadurch nicht.

**Rechtsstand zum Posting-Tag (02.11.2026):** Überstunden und Überstundenzuschläge sind voll steuer- und beitragspflichtig. Steuerfrei sind nur Zuschläge für Sonntags-, Feiertags- und Nachtarbeit (§ 3b EStG). Die geplante Befreiung der Überstundenzuschläge (bis 25 % des Grundlohns, weiter beitragspflichtig; Referentenentwurf Arbeitsmarktstärkungsgesetz 09/2025, ursprünglich ab 01.01.2026) ist nicht in Kraft (F, lohndirekt.de Stand 12.10.2026, shiftbase.com, barmer.de). Sie beträfe nur den Zuschlag, nicht die Stunde selbst.

## Steuererklärung, Fall A: Pendler

| Eintrag (Reihenfolge im Video) | Betrag | Summe Werbungskosten | Erstattung bis hier |
|---|---|---|---|
| Kontoführung | 16 € | 16 € | 0 € |
| Arbeitsmittel | 120 € | 136 € | 0 € |
| Homeoffice (92 Tage × 6 €) | 552 € | 688 € | 0 € |
| Pendelweg (25 km × 0,38 € × 138 Tage) | 1.311 € | 1.999 € | **222 €** |

- Über dem Pauschbetrag: 1.999 − 1.230 = **769 €**. zvE laut PAP 32.271 €, Grenzsteuersatz **28,9 %** → Erstattung **222 €** (Einkommensteuer 2026 Grundtabelle, Soli 0).
- **Pro Stunde: 55,50 €**, also **fünfmal** so viel wie die Überstunden (4,99-fach).
- Die Reihenfolge der Einträge ist frei gewählt (S); das Ergebnis hängt nicht davon ab. Bis zum letzten Eintrag bleibt die Erstattung bei 0 €, weil der Pauschbetrag schon im Lohnsteuerabzug steckt.
- Ganz ohne Homeoffice (230 Bürotage, 25 km): 2.321 € Werbungskosten → 314 € (S, nicht im Video).

## Fall B: kurzer Weg ohne Extras (zweite Überraschung)

- 5 km × 0,38 € × 230 Tage = 437 € + 16 € Kontoführung = **453 €**, unter dem Pauschbetrag → **0 €** Erstattung (Modell). Die Überstunden gewinnen mit 44,45 € gegen 0 €.
- **Kipppunkte** (230 Bürotage, ohne Extras): erste Erstattung ab **14 km** (3 €), ab **16 km** (54 €) schlägt die Erklärung die 4 Überstunden.

| km | Werbungskosten | Erstattung | pro Stunde |
|---|---|---|---|
| 5 | 453 € | 0 € | 0,00 € |
| 10 | 890 € | 0 € | 0,00 € |
| 14 | 1.239,60 € | 3 € | 0,75 € |
| 15 | 1.327 € | 28 € | 7,00 € |
| 16 | 1.414,40 € | 54 € | 13,50 € |
| 20 | 1.764 € | 154 € | 38,50 € |
| 25 | 2.201 € | 280 € | 70,00 € |

## Einordnung

- Die Destatis-Durchschnittserstattung von **1.240 €** (Veranlagungsjahr 2022, nur Fälle mit Erstattung; F) ist ein Mittel über alle Fälle (auch Ehepaare mit Steuerklasse 3/5, Kinderbetreuung, Handwerker, Spenden …). Unser einfacher Single-Fall liegt mit 222 € deutlich darunter. Das Video nennt die 1.240 € deshalb nicht.
- In der Realität gibt es weitere Erstattungsgründe (z. B. Sonderausgaben, haushaltsnahe Dienstleistungen, unterjähriger Jobwechsel). Fall B zeigt nur: Mit kurzem Weg und ohne Extras bringen die Werbungskosten allein nichts.
