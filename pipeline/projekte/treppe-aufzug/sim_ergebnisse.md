# Simulation „Treppe oder Aufzug“ · Ergebnisse

**Stand:** 01.11.2026 · Code: `pipeline/sim/treppe_aufzug.mjs` · Tests: `pipeline/sim/treppe_aufzug.test.mjs` (`node --test sim/treppe_aufzug.test.mjs`, 7 von 7 bestanden)

**Kennzeichnung:** **F** = Fakt mit Quelle (Liste in `skript.json`, Feld `quellen`) · **S** = Ergebnis dieser Simulation · **A** = Annahme

Das Modell ist deterministisch (kein Zufall). Beide Personen starten im Erdgeschoss zur selben Zeit (Knopfdruck = Start). „Oben“ heißt: Treppe = auf dem Podest der Zieletage, Aufzug = ausgestiegen.

## 1. Annahmen und Eingangswerte

| Größe | Wert | Art |
|---|---|---|
| Geschosshöhe | 3,5 m | A (Bürobau üblich 3,3–3,8 m) |
| Stufen | 17,5 cm hoch, 28 cm tief, 20 Steigungen je Etage, zweiläufig (10 + 10) | A (DIN 18065, Schrittmaßregel) |
| Gehtempo auf der Treppe | 0,61 m/s horizontal | F (Weidmann 1993) |
| Podest (Wende) | 1,6 m bei 1,0 m/s | A |
| Ermüdung | jede weitere Etage +2 % Zeit | A (Richtung F: Aufstiegsversuche zeigen sinkendes Tempo) |
| Aufzug | 1,6 m/s, 0,8 m/s², Anfahren 0,5 s, Einfahren 0,5 s | A |
| Türen | 2,5 s auf, 3,0 s zu | F (EMSD-Mindestwerte, 0,8 m seitlich) |
| Offenhalten | 3 s am Start, 1 s je Person (Ein- bzw. Aussteigen) | F (Property Council of Australia) |
| Wartezeit | 25 s | F/S (Bürowerte 22,5–25,5 s bei 30-s-Intervall, Mittag 25 s) |

Daraus: **Treppe 11,46 s je Etage** (2 × 4,13 s Lauf + 2 × 1,60 s Podest), vertikal **0,305 m/s** (S). Das passt zu gemessenen 0,20–0,35 m/s in einem Bürohochhaus (F). Der Aufzug ist mit 1,6 m/s **5,2-mal so schnell** (S, im Video „fünfmal“).

## 2. Hauptrennen im Video: 4. Stock (14 m), 25 s Warten

| Zeit (Rennen) | Treppe | Aufzug |
|---|---|---|
| 0,0 s | läuft los | Knopf gedrückt, Kabine kommt von oben |
| 9,9 s | 1. Stock | wartet |
| 21,5 s | 2. Stock | wartet |
| 25,0–27,5 s | – | Tür geht auf |
| 27,5–30,5 s | – | einsteigen (Tür offen) |
| 30,5–33,5 s | – | Tür geht zu |
| 33,4 s | 3. Stock | – |
| 34,0 s | – | fährt los |
| 37,2 / 39,4 / 41,6 s | – | passiert 1. / 2. / 3. Stock |
| **43,2 s** | bei 13,1 m (3,74. Stock) | **zieht in der Höhe vorbei** |
| 44,75 s | – | im 4. Stock, Tür noch zu |
| 45,25–47,75 s | – | Tür geht auf |
| **45,5 s** | **oben** | – |
| **48,75 s** | – | **ausgestiegen** |

- **Treppe gewinnt mit 3,2 s Vorsprung** (45,55 s gegen 48,75 s) (S).
- Im Bild (Bilanzkarte) gerundet: 45,5 s, 48,8 s, Vorsprung 3,3 s (Differenz der gerundeten Werte, damit die Karte in sich stimmt). Gesprochen: „sechsundvierzig … neunundvierzig … drei Sekunden“ (S).
- **Warum:** Der Aufzug fährt nur **10,75 s** und steht **38,0 s**: Warten 25 s, Türen 11 s (2,5 s auf + 3 s offen beim Einsteigen + 3 s zu + 2,5 s auf im 4. Stock), Rest 2 s (Anfahren und Einfahren 1 s, Aussteigen 1 s) (S). Die Treppe ist 45,5 s ohne Pause in Bewegung.

## 3. Sieger je Zieletage (25 s Warten, ohne Zwischenhalt)

| Ziel | Treppe (s) | Aufzug (s) | Sieger | Vorsprung (s) |
|---|---|---|---|---|
| 1. Stock | 9,9 | 42,2 | Treppe | 32,3 |
| 2. Stock | 21,5 | 44,4 | Treppe | 22,9 |
| 3. Stock | 33,4 | 46,6 | Treppe | 13,1 |
| 4. Stock | 45,5 | 48,8 | Treppe | 3,2 |
| 5. Stock | 57,9 | 50,9 | Aufzug | 7,0 |
| 6. Stock | 70,5 | 53,1 | Aufzug | 17,4 |
| 7. Stock | 83,4 | 55,3 | Aufzug | 28,1 |
| 8. Stock | 96,5 | 57,5 | Aufzug | 39,0 |

## 4. Break-even: höchste Etage, in der die Treppe noch gewinnt

| Wartezeit | ohne Halt | 1 Zwischenhalt | 2 Zwischenhalte |
|---|---|---|---|
| 0 s | 1 | 2 | 3 |
| 10 s | 2 | 3 | 4 |
| 15 s | 3 | 4 | 5 |
| 20 s | 3 | 4 | 5 |
| **25 s (Video)** | **4** | 5 | **6** |
| 30 s | 4 | 5 | 6 |
| 40 s | 5 | 6 | 7 |
| 60 s | 7 | 8 | 9 |

Ein Zwischenhalt kostet ca. 9,5 s (Tür auf 2,5 s, 1 s Fahrgastwechsel, Tür zu 3 s, Anfahren/Einfahren 1 s, längere Fahrt durch Bremsen und Beschleunigen) (S). Die Lage der Halte spielt keine Rolle (Test).

**Zweite Überraschung im Video:** Mit zwei Halten gewinnt die Treppe bis zum **6. Stock** (6. Stock: 70,5 s gegen 72,1 s; 7. Stock: Aufzug 74,3 s gegen 83,4 s) (S).

**Merksatz-Grundlage:** Kommt der Aufzug sofort (0 s Warten, kein Halt), gewinnt er schon ab dem 2. Stock (S). Die Wartezeit entscheidet, nicht die Geschwindigkeit.

## 5. Grenzen des Modells

- Wartezeit 25 s ist ein Mittelwert für Büros zur Mittagszeit; morgens im Aufzug-Stoßverkehr kann sie deutlich länger sein, nachts fast null (A).
- Gehtempo ist ein Durchschnitt; wer sportlich die Treppe nimmt, ist schneller, mit Gepäck langsamer (A).
- Gedränge in der Kabine, Zielwahlsteuerung und Treppenhaus-Türen sind nicht berücksichtigt (A).
- Im Video läuft die Kabine während der 25 s Wartezeit sichtbar vom 5. Stock mit einem Halt im 3. Stock herunter. Das ist nur die Darstellung der Wartezeit; gerechnet wird mit 25 s (A).
