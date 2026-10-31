# Simulationsergebnisse · „Spurwechsel im Stau: Bist du auf der anderen Spur wirklich schneller?“

**Stand:** 31.10.2026 · Modell: `pipeline/sim/spurwechsel.mjs` (Tests: `spurwechsel.test.mjs`) · Auswertung: `pipeline/sim/auswertung_spurwechsel.mjs` · Rohdaten: `sim_ergebnisse.json`

**Kennzeichnung:** Alle Zahlen sind **Modellergebnisse (Schätzung)**, keine Messungen. **Annahmen** sind Dichte, Anteil der Spurwechsler, Wechselregel und Modellparameter. **Belegte Fakten mit Quelle** sind nur die Angaben zur Studie in Abschnitt 4.

## 1. Kurzfazit

- **Spurwechseln bringt im Stau etwas, aber wenig: im Mittel 20 Sekunden auf 5 km Stop-and-go** (19,9 s ± 1,1 s, 95-%-Intervall; 578,5 s gegen 598,3 s, also 9:39 gegen 9:58 min). Das sind **3,3 %** der Fahrzeit.
- Dafür wechselt der Spurwechsler im Mittel **9,2-mal** die Spur. **Pro Wechsel rund 2 Sekunden** (2,15 s). Dieser Wert ist über fast alle Varianten stabil (1,2 bis 2,4 s).
- **Im direkten Duell** (beide starten nebeneinander) kommt der Spurwechsler in **79 %** der Fälle zuerst an. Die Streuung ist aber groß: Der Vorteil je Duell schwankt zwischen −102 s und +197 s. Die Fahrzeit eines einzelnen Autos streut um ±40 s (Standardabweichung), also doppelt so stark wie der mittlere Vorteil. Ob die eigene Spur gerade Glück hat, macht mehr aus als jeder Wechsel.
- **Selbst Drängler**, die sich in jede Lücke quetschen (kein Sicherheitsabstand), holen nur **50 s** heraus, mit 23 Wechseln.
- **Je mehr Leute wechseln, desto weniger bringt es:** bei 10 % Spurwechslern 57 s, bei 30 % (Basis) 20 s, bei 60 % 11 s, bei 95 % nur noch 3 s.
- **Wahrnehmung:** Wenn niemand wechselt, sind beide Spuren im Mittel exakt gleich schnell. Trotzdem wird man **20 % der Zeit überholt**, überholt aber selbst **nur 11 % der Zeit**, und das bei **gleich vielen Autos (125 gegen 125)**. Das bestätigt im Modell den Effekt aus der Studie von Redelmeier und Tibshirani (Abschnitt 4).
- Das Ergebnis wurde nicht auf eine Wunschaussage hin gezogen. Vor der Rechnung war offen, ob Spurwechsel etwas bringen.

## 2. Modell

- **Nagel-Schreckenberg-Zellularautomat** mit 2 Spuren auf einem **Ring von 10 km** (periodischer Rand): Die Dichte bleibt konstant, es herrscht dauerhaft dichter Stop-and-go-Verkehr, ohne Engpass, der den Vergleich verzerrt. Zelle 7,5 m, Zeitschritt 1 s.
- **Bewegung:** v = min(v + 1, vmax, Lücke); mit Wahrscheinlichkeit p = 0,2 (aus dem Stand p0 = 0,5, „slow-to-start“) v − 1. vmax = 3 Zellen/s = 81 km/h.
- **Dichte:** 40 Fahrzeuge je km und Spur (A), also 800 Fahrzeuge. Davon **30 % Spurwechsler** (A), der Rest Spurhalter.
- **Spurhalter:** wechselt nie.
- **Spurwechsler:** wechselt, sobald die Nachbarspur schneller wirkt: Das in der nächsten Sekunde möglich scheinende Tempo min(vmax, v + 1, Lücke + Tempo des Vordermanns) ist nebenan höher. Bedingung: Die Zelle nebenan ist frei, und hinter ihm bleibt Platz für den neuen Hintermann (freie Zellen ≥ dessen Tempo + 1 Zelle) (A). Nach jedem Wechsel mindestens 3 s Pause (A).
- **Rennen:** Nach 20 min Einschwingen fährt jedes Fahrzeug ab seiner aktuellen Position 5 km. Gemessen werden Fahrzeit, Spurwechsel und Überholvorgänge bis zum Ziel.
- **Überholt werden / überholen:** In einer Sekunde zieht mindestens ein Auto der Nachbarspur an mir vorbei bzw. ich an ihm. Gleichauf zählt die linke Spur als vorn (fester Gleichstand-Bruch, nichts wird doppelt gezählt). Gezählt nur, wenn beide die ganze Sekunde in ihrer Spur bleiben.
- **Statistik:** 100 Läufe (Seeds 1001–1100) Basis, dieselben 100 Seeds als Referenz (niemand wechselt), 16 Varianten mit je 40 Läufen. Mittelwert je Lauf und Typ, dann Mittel ± 95-%-Intervall über die Läufe. Der Vorteil ist je Lauf gepaart.
- **Tests:** 7 Tests (Reproduzierbarkeit, keine Kollisionen, Weg = Summe der Tempi, Spurhalter wechseln nie, Sicherheitsabstand beim Wechsel, Überholzählung an einem Hand-Beispiel, Symmetrie der Überholzählung).

## 3. Ergebnisse

### 3.1 Basis (100 Läufe, Mittel ± 95-%-Intervall)

| Kennzahl | Spurhalter | Spurwechsler |
|---|---|---|
| Fahrzeit 5 km | 598,3 s ± 1,3 (9:58) | 578,5 s ± 1,5 (9:39) |
| Vorteil Spurwechsler | | **19,9 s ± 1,1 (3,3 %)** |
| Spurwechsel | 0 | **9,2** (Einzelfahrzeuge: Median 9, 0 bis 24) |
| Sekunden je Spurwechsel | | 2,15 ± 0,12 |
| Zeit, in der man überholt wird | 9,1 % | 7,9 % |
| Zeit, in der man selbst überholt | 7,5 % | 8,3 % |
| Autos, die einen überholen | 54,4 | 45,6 |
| Autos, die man selbst überholt | 50,3 | 54,4 |
| Anteil Stillstand | 51 % | |

- **Referenz, niemand wechselt:** Fahrzeit 614,4 s ± 1,1. Überholt werden **20,3 %** der Zeit, selbst überholen **10,8 %**, Autos **125,1 gegen 124,6**.
- **Basis gegen Referenz (gepaart):** Mit 30 % Spurwechslern sind alle Fahrzeuge im Mittel 22,0 s schneller als ohne Wechsler, die Spurhalter allein 16,1 s. Im Modell gleichen die Wechsler die Spuren aus und nützen damit auch den anderen. **Vorsicht:** Das liegt an der Modellregel, dass der neue Hintermann nicht bremsen muss. In echt erzeugen Wechsel oft Bremsmanöver (Abschnitt 6). Diese Aussage kommt deshalb nicht ins Video.
- **Duelle** (26.644 Paare, die nebeneinander starten): Spurwechsler gewinnt **79 %**, Vorteil im Mittel 21,8 s (Median 18,3 s, −102 bis +197 s). In 9 % der Duelle ist der Wechsler mehr als 1 min schneller, in 0,2 % der Halter.

### 3.2 Robustheit (je 40 Läufe)

| Variante | Fahrzeit Halter (s) | Fahrzeit Wechsler (s) | Vorteil (s) | Vorteil (%) | Wechsel | s je Wechsel | Halter: überholt werden / überholen (%) |
|---|---|---|---|---|---|---|---|
| **Basis (100 Läufe)** | **598,3** | **578,5** | **19,9 ± 1,1** | **3,3** | **9,2** | **2,15** | **9,1 / 7,5** |
| Drängler: quetscht sich in jede Lücke (Sicherheitsabstand 0) | 613,9 | 563,7 | 50,1 ± 2,3 | 8,2 | 22,6 | 2,22 | 9,3 / 6,7 |
| Vorsichtig: 2 Zellen (15 m) Sicherheitsabstand | 599,0 | 586,6 | 12,3 ± 1,2 | 2,1 | 6,0 | 2,08 | 9,3 / 7,8 |
| Wechsel kostet Tempo (kein Beschleunigen beim Wechsel) | 603,1 | 584,5 | 18,5 ± 1,7 | 3,1 | 9,3 | 1,99 | 9,1 / 7,5 |
| Nur 10 % Spurwechsler | 604,6 | 547,2 | 57,4 ± 4,4 | 9,5 | 12,2 | 4,72 | 11,5 / 8,5 |
| 60 % Spurwechsler | 594,7 | 584,3 | 10,5 ± 1,2 | 1,8 | 7,7 | 1,36 | 8,2 / 7,0 |
| 95 % Spurwechsler | 589,7 | 586,3 | 3,4 ± 2,2 | 0,6 | 6,9 | 0,49 | 7,5 / 6,9 |
| Weniger dicht (30 Fz/km/Spur) | 408,8 | 398,5 | 10,3 ± 1,2 | 2,5 | 5,1 | 2,01 | 7,8 / 6,5 |
| Dichter (50 Fz/km/Spur) | 834,6 | 804,2 | 30,4 ± 1,8 | 3,6 | 14,0 | 2,18 | 9,7 / 8,1 |
| Sperre 1 s statt 3 s | 598,1 | 578,9 | 19,2 ± 1,5 | 3,2 | 9,8 | 1,96 | 9,1 / 7,6 |
| Sperre 8 s statt 3 s | 600,5 | 579,9 | 20,6 ± 1,9 | 3,4 | 8,7 | 2,37 | 9,2 / 7,6 |
| Trödeln p = 0,1 | 564,8 | 553,2 | 11,6 ± 1,2 | 2,1 | 5,1 | 2,29 | 6,1 / 5,1 |
| Trödeln p = 0,3 | 641,3 | 611,1 | 30,3 ± 1,8 | 4,7 | 14,2 | 2,13 | 11,3 / 9,3 |
| Anfahren p0 = 0,3 (weniger Stop-and-go) | 459,1 | 447,5 | 11,6 ± 0,9 | 2,5 | 9,4 | 1,24 | 14,2 / 12,0 |
| Anfahren p0 = 0,7 (mehr Stop-and-go) | 955,6 | 911,2 | 44,4 ± 2,9 | 4,6 | 9,9 | 4,49 | 5,3 / 4,2 |
| Höheres Tempo (vmax 135 km/h) | 595,3 | 575,0 | 20,2 ± 1,6 | 3,4 | 8,8 | 2,30 | 8,9 / 7,3 |
| Längere Strecke (10 km) | 1.194,9 | 1.155,0 | 39,9 ± 1,7 | 3,3 | 18,4 | 2,18 | 9,0 / 7,5 |

**Was daraus folgt:**
- **Richtung robust:** In allen 16 Varianten ist der Spurwechsler im Mittel schneller, aber nie um mehr als 10 %.
- **Größe hängt an zwei Annahmen:** wie eng eingeschert wird (0 bis 2 Zellen Abstand: 50 s bis 12 s) und wie viele andere auch wechseln (10 % bis 95 %: 57 s bis 3 s). Die Aussage „ca. 2 s pro Wechsel“ ist stabiler als die absolute Sekundenzahl.
- **Wahrnehmung robust:** In der Referenz (niemand wechselt) ist die Zeit des Überholtwerdens immer deutlich länger als die Zeit des Überholens, bei gleich vielen Autos: 16,3 % gegen 9,0 % (30 Fz/km/Spur), 21,0 % gegen 11,3 % (50 Fz/km/Spur), 20,4 % gegen 14,1 % (p0 = 0,3).

### 3.3 Duell im Video (Lauf 1031)

- **Auswahl nach festen Kriterien** (nicht nach Wirkung): Paul (Spurwechsler, Fahrzeug 573) und Anna (Spurhalterin, Fahrzeug 303) starten nebeneinander. Pauls Spurwechsel = gerundetes Mittel (9), beide Fahrzeiten höchstens 4 s vom Mittel ihres Typs, Vorteil höchstens 1 s vom mittleren Vorteil. Unter diesen das Duell, in dem Anna zwischendurch am weitesten vorn liegt (zeigt das Hin und Her).
- **Verlauf:** Paul wechselt nach 5 s und steht dann direkt hinter Anna (eine Zelle Lücke). Nach 81 bis 89 s liegt Anna **165 m** vorn (Sprechtext gerundet: 160 m). Nach dem 5. Wechsel (272 s) steht Paul wieder direkt hinter Anna, bis 425 s. Mit dem 6. Wechsel (427 s, Minute 7) zieht er vorbei und bleibt vorn.
- **Ziel:** Paul nach **576,2 s (9:36)**, Anna nach **595,8 s (9:56)**. Vorteil **19,6 s**, **9 Wechsel**.
- **Wahrnehmungsbeispiel** (Referenzlauf 1006, Fahrzeug 110, ab 79 s): In 9 s ziehen 6 Autos an Anna vorbei (in 6 verschiedenen Sekunden), danach überholt sie selbst 6 Autos in 2 Sekunden. Im Video laufen beide Phasen mit demselben Zeitraffer (1,5-fach), damit der Eindruck fair bleibt. Danach (106 bis 125 s) steht Anna, und die Nachbarspur rollt mit Abstand an ihr vorbei („Wer rollt, hat Abstand“).

## 4. Studie zur Wahrnehmung (geprüft)

- **Fakt:** Redelmeier, D. A. & Tibshirani, R. J.: „Why cars in the next lane seem to go faster“. *Nature* 401, 35 (2. September 1999), doi:10.1038/43360 (PubMed 10485702, laut Suchauszug). Kernaussage laut Abstract (ADS-Auszug): Mehr Zeit wird damit verbracht, überholt zu werden, als selbst zu überholen.
- **Fakt:** Pressemitteilung der University of Toronto vom 30.08.1999 (ScienceDaily, 02.09.1999, abgerufen 31.10.2026): Computermodell eines gestauten Highways; die Nachbarspur wirkte schneller, obwohl alle Spuren im Mittel gleich schnell waren. Videoaufnahmen von Torontoer Verkehr wurden Fahrschülern gezeigt; sie hielten die Nachbarspur für schneller, auch wenn sie langsamer war. Zitat Redelmeier: „Vehicles spread out when going fast and pack together when moving slowly.“ Empfehlung: kleinen Versuchungen zum Spurwechsel widerstehen, „the gains may be an illusion but the risks are always real“.
- **Gegenposition (Fakt):** Nick Bostrom (Plus Magazine, Nov. 2001) nennt einen Auswahleffekt: Langsame Spuren sind dichter, deshalb steht ein zufälliger Fahrer öfter in der langsameren Spur, und die Nachbarspur ist dann tatsächlich schneller. Wer zur lokal schnelleren Spur wechselt, kann davon profitieren.
- **Einordnung unseres Modells:** Beide Effekte zeigen sich. Die Wahrnehmungstäuschung (20 % gegen 11 % bei gleich vielen Autos) entspricht der Studie. Gleichzeitig gewinnt der Spurwechsler tatsächlich etwas (Bostroms Punkt), aber nur ca. 2 s pro Wechsel.
- **Nicht genutzt:** Eine in Suchergebnissen genannte Zahl „70 % der Fahrschüler“ konnte ich nicht in einer Primärquelle prüfen. Sie steht nicht im Video.
- **Im Video:** „Forscher aus Toronto beschrieben das schon 1999.“ Keine Quellenangabe im Bild (Regel CLAUDE.md).

## 5. Was im Video steht und woher es kommt

| Aussage im Video | Wert im Modell | Quelle |
|---|---|---|
| „bringt dir 20 Sekunden“, „Neun Wechsel für 20 Sekunden“ | 19,9 s Mittel; Duell 19,6 s; 9,2 bzw. 9 Wechsel | Basis, Duell 1031 |
| „Anna 160 Meter vorn“ | 157,5 bis 165 m (81–90 s) | Duell 1031 |
| „Fünf Wechsel später … wieder hinter ihr“, „nach sieben Minuten … vorbei“ | 5. Wechsel 272 s, 6. Wechsel 427 s | Duell 1031 |
| „9:36“, „9:56“ | 576,2 s, 595,8 s | Duell 1031 |
| „Jeder Wechsel … gut zwei Sekunden“ | 2,15 s | Basis |
| „Drängler … nur 50 Sekunden“ | 50,1 s (22,6 Wechsel) | Variante Drängler |
| „Sechs Autos … sechs Sekunden lang“, „sechs Autos … in nur zwei Sekunden“ | 6 Autos in 6 s bzw. 6 Autos in 2 s | Referenzlauf 1006 |
| „20 Prozent“, „11 Prozent“, „gleich viele Autos“ | 20,3 %, 10,8 %, 125,1 gegen 124,6 | Referenz |
| „bekannt seit 1999“, „Forscher aus Toronto“ | Nature 401, 35 (1999) | Abschnitt 4 |

## 6. Grenzen des Modells

- **Grobes Modell:** 7,5-m-Zellen, 1-s-Schritte, sofortiges Bremsen, nur Pkw mit gleichem Wunschtempo, kein Lkw, kein Rechtsfahrgebot.
- **Spurwechsel kostet im Modell fast nichts:** Der Wechsel ist ein seitlicher Sprung in einem Zeitschritt. Die Variante „Wechsel kostet Tempo“ ändert wenig (18,5 s). Reale Wechsel dauern länger und lösen oft Bremsungen beim Hintermann aus. Das Modell überschätzt den Vorteil des Wechslers deshalb eher.
- **Kein Unfallrisiko modelliert.** „Riskante Manöver“ im Fazit ist eine Wertung, gestützt auf die Empfehlung der Studienautoren, keine Modellzahl.
- **Wechselregel ist eine Annahme:** „wirkt schneller“ = höheres mögliches Tempo in der nächsten Sekunde. Menschen schätzen ungenauer und reagieren später.
- **Dichte und Anteil der Wechsler sind Annahmen** ohne Zählstellendaten. Die absolute Sekundenzahl hängt stark daran (Tabelle 3.2).
- **Ring statt echter Engstelle:** Der Ring bildet einen stationären Stau ab, nicht das Entstehen und Auflösen eines Staus an einer Baustelle.
- **Wahrnehmung nur als Zählgröße:** Das Modell zählt Überholvorgänge, es misst keine menschliche Wahrnehmung.

## 7. Wiederholen

```
node --test pipeline/sim/spurwechsel.test.mjs          # 7 Tests
node pipeline/sim/auswertung_spurwechsel.mjs           # ca. 4 min: sim_ergebnisse.json, trajektorien_*.json
```

## Quellen

- Redelmeier & Tibshirani (1999), Nature 401, 35, doi:10.1038/43360. Nachweis über PubMed-Eintrag 10485702 und ADS-Abstract (Suchauszüge, Seiten im Cloud-Netz nicht direkt abrufbar).
- University of Toronto, Pressemitteilung, ScienceDaily 02.09.1999: https://www.sciencedaily.com/releases/1999/08/990830184718.htm (abgerufen 31.10.2026).
- N. Bostrom, „Cars in the next lane really do go faster“, Plus Magazine, Nov. 2001: https://plus.maths.org/cars-next-lane-really-do-go-faster (abgerufen 31.10.2026).
- Modellgrundlagen (nicht erneut abgerufen): Nagel & Schreckenberg, J. Phys. I France 2, 2221 (1992); Rickert, Nagel, Schreckenberg & Latour, Physica A 231, 534 (1996); Barlovic, Santen, Schadschneider & Schreckenberg, Eur. Phys. J. B 5, 793 (1998).
