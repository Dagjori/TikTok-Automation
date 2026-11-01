# Simulation „Fußgängerampel: Bringt mehrmaliges Drücken etwas?“

**Stand:** 01.11.2026 · Modell: `pipeline/sim/ampel.mjs` · Tests: `node --test sim/ampel.test.mjs` (10 Tests, alle grün) · Quellen: `skript.json` → `quellen`

**Kennzeichnung:** (F) belegt mit Quelle · (S) Ergebnis der eigenen Simulation · (A) Annahme bzw. Szenario-Wert

## Modell in Kürze

- **Gespeicherte Anforderung (F):** Ein Druck setzt die Anforderung, jeder weitere Druck ändert nichts. Die Anforderung gilt für alle an der Furt.
- **Drei Steuerungsarten:**
  1. **Bedarfsampel ohne Koordinierung:** Grün nur nach Anforderung (F). Grün kommt, sobald die Kfz-Mindestfreigabe abgelaufen ist, plus Gelb 3 s (F) und 2 s Zwischenzeit (A). Ohne Druck: nie Grün (F).
  2. **Festzeit:** 90-s-Umlauf (F, üblich), 16 s Fußgängergrün (A). Der Taster hat keine Wirkung auf das Grün (F).
  3. **Koordinierte Bedarfsampel („grüne Welle“):** Grün nur im Zeitfenster des Umlaufs (90 s, 10 s Grün). Die Anforderung muss vor dem Entscheidungszeitpunkt (6 s vor Grün, A) da sein, sonst erst im nächsten Umlauf (F).
- **Personen (A):** Max hetzt (1,8 m/s), drückt beim Ankommen 5-mal und dann alle 2 s. Lea geht normal (1,3 m/s; Mittel aus Studien 1,34 m/s, F) und drückt einmal.
- **Weg (A):** 234,5 m bis zur Haltestelleninsel. Ampel 1 bei 50 m (8 m Fahrbahn), Ampel 2 bei 140 m (15 m), Ampel 3 bei 225 m (7 m bis zur Insel). Die Umlauf-Versätze von Ampel 2 und 3 sind Szenario-Werte.
- **Bahn (A):** kommt nach Fahrplan bei 252 s an, fährt bei 265 s ab.

## Hauptrennen (S)

| | Max (Pink, Dauerdrücker) | Lea (Türkis, einmal) |
|---|---|---|
| Ampel 1 (Bedarf): Ankunft → Grün | 27,8 s → 45,0 s (17,2 s warten, 12 Drücke) | 38,5 s → 45,0 s (6,5 s warten, 1 Druck) |
| Ampel 2 (Festzeit): Ankunft → Grün | 95,0 s, 1 s vor Grünende → geht sofort | 114,2 s → 170,0 s (55,8 s warten, 1 Druck ohne Wirkung) |
| Ampel 3 (grüne Welle): Ankunft → Grün | 142,2 s, erster Druck 0,97 s nach dem Entscheidungszeitpunkt → 237,4 s (95,2 s warten, 51 Drücke) | 235,4 s → 237,4 s (2,0 s warten, 1 Druck) |
| an der Insel | 242,7 s | 244,7 s |
| **Bahn** | **ab 265 s** | **ab 265 s (dieselbe Bahn)** |
| **Drücke gesamt** | **63** | **3** |
| Wartezeit gesamt | 112,4 s | 64,3 s (Max wartet 48,1 s länger) |
| Gehzeit gesamt | 130,3 s | 180,4 s (Max ist 50,1 s schneller gelaufen) |

- **Ampel 1:** Gleichstand. Beide bekommen in derselben Sekunde Grün (45,0 s), obwohl Max 10,7 s früher da war und 12-mal gedrückt hat.
- **Ampel 2:** Max erwischt das letzte Grün und liegt einen Umlauf vorn. Lea bekommt Rot.
- **Ampel 3:** Max ist knapp 1 s zu spät für das Zeitfenster und wartet einen ganzen Umlauf. Lea kommt 2,0 s vor dem nächsten Grün an. Grün für beide in derselben Sekunde (237,4 s).
- **Zeitgewinn durch Hetzen und 63 Drücke: 0 s** bis zur Abfahrt der Bahn.

## Gegenprobe: mehrfaches Drücken (S)

- Max mit nur **einem** Druck je Ampel: exakt dieselben Grünzeiten und dieselbe Ankunft (Test „Max mit nur einem Druck …“).
- **Monte Carlo** (Ankunft zufällig, allein an der Furt, n = 20.000, Seed 7, erster Druck jeweils zur selben Zeit):

| Ampel | 1 Druck | viele Drücke | gar kein Druck |
|---|---|---|---|
| 1 Bedarf | Ø 10,14 s (max. 35,0 s) | Ø 10,14 s | **nie Grün** |
| 2 Festzeit | Ø 30,02 s (max. 74,0 s) | Ø 30,02 s | Ø 30,02 s (Taster ohne Wirkung) |
| 3 grüne Welle | Ø 51,15 s (max. 96,1 s) | Ø 51,15 s | **nie Grün** |

- Festzeit-Theorie: (U − g)² / (2U) = 74² / 180 = 30,4 s (Monte Carlo 30,0 s, Test mit Toleranz 0,4 s).
- Die Bedarfs-Werte hängen von der angenommenen Kfz-Mindestfreigabe (30 s) und der zufälligen Lage der letzten Freigabe ab (A). Sie dienen nur dem Vergleich der Drückzahl, nicht als Aussage über echte Ampeln.

## Zweite Überraschung (Was wäre, wenn …)

- **Keiner drückt an Ampel 1:** Es wird nie Grün (F: Heidelberg, Bremen; S: Test „Drückt an Ampel 1 keiner …“). Im Video läuft die Wartezeit auf über 10 min.
- **Lea drückt einmal:** Ist die Kfz-Mindestfreigabe schon abgelaufen, kommt Grün nach Gelb plus Zwischenzeit, im Modell nach 5 s (F: München „schaltet sofort“; A: 2 s Zwischenzeit).

## Was im Video steht

- Gesprochen: „Max hat dreiundsechzigmal gedrückt. Lea dreimal.“, „eine Sekunde zu spät“, „Grün erst im nächsten Umlauf“ (alles S).
- Bild: Tafel mit Drücken je Person (live), Renn-Uhr (Rennzeit im Zeitraffer), Wartezähler über den Figuren, Ring bis zum Entscheidungszeitpunkt bzw. bis zum nächsten Grün, Leiste „Weg zur Bahn · 235 m“, Bilanz „63× / 3× / Zeitgewinn 0 s“, „Warum?“ mit Drücken (63× gegen 3×) und Wartezeit (112 s gegen 64 s, +48 s für Max).
