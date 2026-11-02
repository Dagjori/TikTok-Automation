# Simulationsergebnisse · Video #2 „Früh einordnen oder bis zum Ende?“

**Stand:** 31.10.2026 · Modell: `pipeline/sim/reissverschluss.mjs` · Rohdaten: `sim_ergebnisse.json` · Bilder: `plots/`

**Kennzeichnung:** Alle Zahlen sind **Modellergebnisse (Schätzung)**, keine Messungen. **Annahmen** sind die Zuflussraten, die Definition der beiden Strategien und die Modellparameter. **Belegte Fakten mit Quelle** sind nur die zwei Referenzen am Ende.

## 1. Kurzfazit

- **Der Reißverschluss verkürzt den Rückstau, aber nur moderat.** Gemessen als Abstand zwischen Stauende und Baustelle nach 30 Minuten Verkehrsspitze:
  - Feierabend (2.400 Kfz/h): **3,4 km → 2,5 km, −26 %**
  - Rushhour (3.200 Kfz/h): **6,2 km → 5,4 km, −13 %**
  - Wenig Verkehr (1.200 Kfz/h): **kein Stau, kein Unterschied** (Fahrzeit bei beiden 525 s, also ca. 8,7 min)
- **Schneller kommt man dadurch nicht an.** Fahrzeit und Durchsatz sind praktisch gleich. Der Reißverschluss ist im Modell sogar minimal schlechter: +15 s Fahrzeit (+1 %) und −15 Kfz/h Durchsatz (−1 %), beides knapp über der Messunsicherheit. Beide Strategien schaffen ca. 1.790 Kfz/h durch die Engstelle.
- **Das Ergebnis weicht vom Beispielwert in dem damaligen Beispielskript (Git-Historie) ab** (dort: 1,8 km gegen 1,0 km und −44 %). Das Modell liefert kleinere Unterschiede. Das Modell wurde nicht auf einen Wunschwert gezogen.
- **Hauptursache des Unterschieds:** Die Früh-Einordner wechseln ab dem Schild (800 m vor der Engstelle). Sie stehen aber davor in beiden Spuren im Stau und warten auf eine Lücke. Die Stauspitze liegt deshalb im Mittel **ca. 490 m (Feierabend) bzw. 470 m (Rushhour) vor der Baustelle**, dieser Abschnitt bleibt weitgehend staufrei. Der Reißverschluss nutzt ihn als Stauraum. Die Kolonne selbst (Spitze bis Ende) ist nur **12 % (Feierabend) bzw. 6 % (Rushhour)** kürzer.
- **Wie groß der Vorteil ausfällt, hängt stark davon ab, wo die Früh-Einordner wechseln** (siehe Abschnitt 3). Wechseln sie schon bei 1,5 km bzw. 3 km, steigt der Vorteil auf −38 % bzw. −55 % (Feierabend) und −22 % bzw. −36 % (Rushhour).

## 2. Ergebnisse (50 Läufe je Szenario und Strategie, Mittelwert ± Standardabweichung)

| Szenario (Kfz/h) | Strategie | Rückstau am Ende (m) | Rückstau max. (m) | Rückstau Zeitmittel (m) | Kolonne am Ende (m) | Fahrzeit 10,9 km (s) | Durchsatz Engstelle (Kfz/h) |
|---|---|---|---|---|---|---|---|
| Wenig Verkehr (1.200) | A Früh | 0 ± 0 | 68 ± 234 | 0 ± 1 | 0 ± 0 | 525 ± 1 | 1.198 ± 57 |
| Wenig Verkehr (1.200) | B Reißverschluss | 0 ± 0 | 10 ± 29 | 0 ± 0 | 0 ± 0 | 525 ± 1 | 1.197 ± 56 |
| Feierabend (2.400) | A Früh | 3.361 ± 214 | 3.887 ± 240 | 2.006 ± 147 | 2.870 ± 255 | 1.001 ± 45 | 1.799 ± 22 |
| Feierabend (2.400) | B Reißverschluss | 2.492 ± 235 | 3.033 ± 238 | 1.280 ± 134 | 2.523 ± 234 | 1.016 ± 48 | 1.784 ± 15 |
| Rushhour (3.200) | A Früh | 6.248 ± 288 | 6.882 ± 272 | 3.490 ± 150 | 5.780 ± 298 | 1.614 ± 50 | 1.793 ± 20 |
| Rushhour (3.200) | B Reißverschluss | 5.426 ± 300 | 6.178 ± 269 | 2.715 ± 152 | 5.459 ± 305 | 1.630 ± 49 | 1.781 ± 22 |

**Reduktion durch den Reißverschluss (gepaart nach Seed, positiv = B kürzer):**

| | Rückstau am Ende | Rückstau max. | Rückstau Zeitmittel | Kolonne am Ende | Fahrzeit B−A | Durchsatz B−A |
|---|---|---|---|---|---|---|
| Feierabend | −26 % (±3,3 je Seed) | −22 % | −36 % | −12 % | +14,6 s (±5,6) | −15 Kfz/h (±8) |
| Rushhour | −13 % (±2,4 je Seed) | −10 % | −22 % | −6 % | +16,5 s (±5,6) | −12 Kfz/h (±8) |

Klammerwerte: Streuung der Reduktion über die 50 Läufe bzw. Halbbreite des 95-%-Intervalls des Mittelwerts. Bei „Wenig Verkehr“ gibt es keinen Stau, deshalb keine Reduktion. Einzelne Läufe zeigen dort kurze zufällige Verdichtungen (A bis 0,9 km, B bis 0,1 km), der Median ist 0 m.

**Definitionen:** Stau = zusammenhängende Kolonne von mindestens 10 Fahrzeugen mit v ≤ 27 km/h. *Rückstau* = Abstand Stauende–Baustelle (so berichten MnDOT und Verkehrsmeldungen). *Kolonne* = Länge von der Stauspitze bis zum Stauende. „Am Ende“ = Mittel der letzten 60 s der 30-min-Spitze.

**Typische Läufe für die Animation** (Lauf, der den Medianen von Rückstau, Fahrzeit und Durchsatz am nächsten liegt): Wenig 1047 / 1005, Feierabend 1004 / 1026, Rushhour 1024 / 1016 (jeweils A / B). Animationsfenster: ab Minute 20, 18 s lang.

## 3. Ist das Ergebnis robust?

**Richtung: ja. Größe: nein, sie hängt an der Strategie-Definition.** In 29 von 30 Sensitivitätsfällen (15 Varianten, je Feierabend und Rushhour) ist der Rückstau beim Reißverschluss kürzer. Einzige Ausnahme: 60 % der Fahrzeuge auf der endenden Spur im Feierabend (−2 %); bei sehr ungleicher Spurverteilung verschwindet der Vorteil.

| Variante (je 30 Läufe) | Rückstau-Reduktion Feierabend | Rückstau-Reduktion Rushhour | Fahrzeit B−A (Feierabend / Rushhour) |
|---|---|---|---|
| **Basis** | **26 %** | **13 %** | +1,5 % / +1,0 % |
| Früh-Einordner wechseln ab 1.500 m | 38 % | 22 % | +0,4 % / +0,8 % |
| Früh-Einordner wechseln ab 3.000 m | 55 % | 36 % | −0,4 % / −0,1 % |
| Reißverschluss-Zone 120 m statt 60 m | 21 % | 11 % | +0,5 % / −0,3 % |
| 40 % auf der endenden Spur | 11 % | 11 % | +0,2 % / +1,0 % |
| 60 % auf der endenden Spur | −2 % | 6 % | +3,5 % / +2,3 % |
| Weniger Trödeln (p = 0,1) | 21 % | 13 % | **+12,8 % / +11,8 %** |
| Mehr Trödeln (p = 0,3) | 19 % | 13 % | −0,1 % / −0,1 % |
| Höheres Tempo (vmax 108 km/h) | 22 % | 12 % | **+11,6 % / +9,5 %** |
| Zögerliches Anfahren (p0 = 0,4) | 17 % | 13 % | −0,6 % / +0,2 % |
| Abwechseln lockerer (Nachbarregel 2 Zellen) | 21 % | 13 % | −0,7 % / −0,9 % |
| Abwechseln streng (8 Zellen) | 20 % | 10 % | +9,0 % / +8,1 % |
| Drängler (keine Abwechselregel) | 19 % | 11 % | −0,1 % / −0,9 % |
| Hintermann bremst bereitwilliger | 25 % | 13 % | +1,3 % / +1,1 % |
| Zufluss −15 % | 37 % | 20 % | +0,6 % / +1,2 % |
| Zufluss +15 % | 18 % | 12 % | +1,3 % / +1,0 % |

Was daraus folgt:
- **Je länger der Stau im Verhältnis zur Strecke vor dem Schild, desto kleiner der relative Vorteil.** Ein Rückstau von 6 km gewinnt durch die ca. 500 m nur etwa 10 % (Rushhour: −13 % inkl. besserer Spurverteilung). Der Vorteil sinkt mit Zufluss und Dauer der Spitze (Zufluss +15 %: nur −18 % bzw. −12 %; −15 %: −37 % bzw. −20 %). Alle Zahlen gelten für **30 Minuten Spitze**.
- **Bei schnellem, flüssigem Verkehr kostet der Reißverschluss Zeit** (+9 bis +13 % Fahrzeit bei weniger Trödeln, höherem Tempo oder strenger Abwechselregel). Der Grund im Modell: Wer erst am Spurende einfädelt, muss dort stark abbremsen und bremst den Verkehr dahinter. Das ist ein Modellbefund, kein Beleg für die Realität.
- **Die Aussage „Reißverschluss spart Zeit“ lässt sich mit diesem Modell nicht stützen**, nur „Reißverschluss verkürzt den Rückstau“.

## 4. Passt das zur Größenordnung von MnDOT?

- **Fakt (laut Auftrag und dem damaligen Beispielskript (Git-Historie)):** MnDOT nennt einen **bis zu 40 % kürzeren Rückstau** beim Reißverschlussverfahren und rät bei wenig Verkehr zum frühen Einordnen. Die Seite war im Cloud-Netz nicht abrufbar (`dot.state.mn.us` ist gesperrt), die Angabe wurde hier **nicht erneut geprüft**.
- **Einordnung:** „Bis zu 40 %“ ist eine Obergrenze. Das Modell liegt mit −13 % bis −26 % darunter (Größenordnung passt, kein Widerspruch). Mit früherem Einordnen (Schild bei 1,5 bis 3 km) erreicht das Modell −22 % bis −55 % und deckt damit die 40 % ab. Heißt: MnDOT-Größenordnung ist nur plausibel, wenn die Früh-Einordner deutlich vor der Baustelle wechseln. **Bei „ab 800 m“ ist das Modell vorsichtiger als MnDOT.**
- **Wenig Verkehr:** Das Modell zeigt keinen Unterschied, passend zur MnDOT-Empfehlung, bei wenig Verkehr früh einzuordnen.

## 5. Grenzen des Modells

- **Grobes Modell:** Nagel-Schreckenberg mit 7,5-m-Zellen, 1-s-Schritten und sofortigem Bremsen. Nur Pkw mit gleichem Wunschtempo (81 km/h), kein Lkw-Anteil, kein Überholen, keine Spurwechsel nach rechts.
- **Strategie-Definition entscheidet:** A = Wechselwunsch ab Schild (800 m). Wer nicht gleich eine Lücke findet, passt sich an und bremst. Wer im Stau schon vor dem Schild einschert, ist nicht modelliert (ein Versuch, das über „wer steht, schert ein“ abzubilden, erzeugte Staus über Kilometer und wurde als Artefakt verworfen).
- **Abwechseln ist eine Regel, kein gemessenes Verhalten:** „Nicht dicht neben einem Fahrzeug einscheren, das selbst eingefädelt ist.“ Damit kommen im Modell 54 % (B) bzw. 58 % (A) der Fahrzeuge an der Engstelle von der endenden Spur (fair wären 50 %). Reale Fahrer sind weniger kooperativ. Die Variante „Drängler“ ändert das Ergebnis aber nur wenig.
- **Absolute Längen unsicher:** Im Stau stehen ca. 0,5 Fahrzeuge je Zelle und Spur (ca. 65 Kfz/km/Spur, Annahme des Modells, nicht gemessen). Belastbarer als die Kilometerwerte sind die Verhältnisse A zu B.
- **Kapazität:** Die Engstelle schafft im Modell ca. 1.790 Kfz/h. Vergleich: HCM-Richtwert 1.600 pc/h je Spur, Praxisspanne laut einer Umfrage unter US-Behörden 1.100 bis 1.900 (Suchauszug, Primärquelle nicht geöffnet). Das Modell liegt am oberen Rand.
- **Zuflussraten sind Annahmen:** Die Zuflüsse (1.200 / 2.400 / 3.200 Kfz/h) sind geschätzte typische Spitzenstundenwerte einer zweistreifigen Autobahnrichtung, keine Zählstellendaten. Begründung je Szenario in `sim_ergebnisse.json`.
- **Eine Konfiguration:** 30 min Spitze, 10 km Zulauf, Start mit freiem Verkehr. Andere Dauer oder Länge ändern die Prozentwerte (siehe Zufluss-Varianten).

## 6. Nächste Schritte

| # | Schritt | Wer | Zeit |
|---|---|---|---|
| 1 | Entscheiden, mit welchen Zahlen Video #2 arbeitet (Basis „ab 800 m“ oder früheres Einordnen, siehe Abschnitt 3) | Inhaber | 10 Min. |
| 2 | MnDOT-Aussage und § 7 Abs. 4 StVO vor Veröffentlichung prüfen (Hosts `dot.state.mn.us`, `www.ace.de` im Cloud-Netz freigeben oder lokal nachlesen) | Inhaber oder Claude nach Freigabe | 10 Min. |
| 3 | Szene bauen: `trajektorien_<szenario>_<strategie>.json` in die Three.js-Szene laden, Zähler an `staulaenge.rueckstau_m` koppeln | Claude | in der Pipeline-Arbeit für Video #2 |
| 4 | Sprechtext in `skript.json` abnehmen (Zahlen oben) | Inhaber | 5 Min. |

## 7. Offene Punkte

- Soll das Video die **Basiszahlen (−26 % / −13 %)** nennen oder das frühe Einordnen so definieren, dass es MnDOT näherkommt? Die ehrliche Aussage im Modell ist: Reißverschluss = kürzerer Rückstau, nicht schnellere Fahrt.
- **Szenen-Aufbau:** Das Animationsfenster zeigt ca. 4 bis 7 Spurwechsel in 18 s. Soll das Video mit Zeitraffer arbeiten, damit die 30 Minuten sichtbar werden (Zähler über `staulaenge.ganzer_lauf`)?
- Zuflussraten durch echte Zählstellendaten (z. B. BASt) belegen, falls das Video die Szenarien mit konkreten Strecken verknüpft.

## Quellen

- MnDOT, Zipper Merge: https://dot.state.mn.us/zippermerge/ (bis zu 40 % kürzerer Rückstau; bei wenig Verkehr früh einordnen). Aus dem damaligen Beispielskript (Git-Historie) übernommen, **nicht erneut abgerufen**.
- § 7 Abs. 4 StVO (Reißverschlussverfahren), ACE: https://www.ace.de/verkehrssicherheit/tipps-sicheres-fahren/reissverschlussverfahren/ . Aus dem damaligen Beispielskript (Git-Historie) übernommen, **nicht erneut abgerufen**.
- Kapazität von Arbeitsstellen (HCM-Richtwert 1.600 pc/h je Spur, Praxisspanne 1.100 bis 1.900): https://workzonesafety.org/publication/survey-of-work-zone-practices-and-validation-of-highway-capacity-manual-work-zone-capacity-model/ (Suchauszug).

## Wiederholen

```
node --test pipeline/sim/reissverschluss.test.mjs        # 9 Tests
node pipeline/sim/auswertung_reissverschluss.mjs         # ca. 4 min: Ergebnisse, Trajektorien, Rohdaten
python3 -I pipeline/sim/plot_raumzeit.py                 # Raum-Zeit-Diagramme in plots/
```
