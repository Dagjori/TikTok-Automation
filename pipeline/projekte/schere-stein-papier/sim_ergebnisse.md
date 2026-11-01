# Simulation „Schere, Stein, Papier: Gibt es eine Gewinnstrategie?“

**Stand:** 01.11.2026 · Modell: `pipeline/sim/schere_stein_papier.mjs` · Tests: `node --test sim/schere_stein_papier.test.mjs` (13 Tests, alle grün) · Auswertung: `node sim/auswertung_schere_stein_papier.mjs` · Quellen: `skript.json` → `quellen`

**Kennzeichnung:** (F) belegt mit Quelle · (S) Ergebnis der eigenen Simulation · (A) Annahme

## Modell in Kürze

- **Regeln (F):** Papier schlägt Stein, Schere schlägt Papier, Stein schlägt Schere. 100 Runden, jede Runde zählt einzeln.
- **Rot = Taktik.** Rot nimmt an, dass der Gegner das Mensch-Muster spielt, und wählt jede Runde den Zug mit dem höchsten Erwartungswert (A). Gegen den Zufallsspieler setzt Rot dieselbe Taktik ein.
- **Cyan, Fall 1 = Zufall (F):** jeder Zug mit 1/3. Nash-Gleichgewicht, im Code getestet: Jeder Zug und jede Mischung hat gegen Zufall den Erwartungswert 0.
- **Cyan, Fall 2 = Mensch-Modell (bedingte Reaktion):** Der nächste Zug hängt vom Ergebnis der vorigen Runde ab.

| Vorige Runde des Menschen | gleicher Zug | Zug, den der letzte Zug „schlägt“ (links) | Zug, der den letzten Zug schlägt (rechts) |
|---|---|---|---|
| Sieg | 55 % | 22,5 % | 22,5 % |
| Unentschieden | 45 % | 27,5 % | 27,5 % |
| Niederlage | 32 % | **38 %** (= Zug, der den letzten Zug des Gegners geschlagen hätte) | 30 % |

- **Belegt (F):** Gesamt-Wiederholungsrate 44,0 % bei Standard-Auszahlung (Wang & Xu 2014, ESA-Preprint, arXiv:1407.1170, Tab. 2; Zufall wäre 33,3 %). Richtung der Befunde (Wang, Xu, Zhou 2014, Sci. Rep. 4:5830): nach Sieg bleibt man deutlich häufiger bei seinem Zug als man wechselt; nach Niederlage wechselt man bevorzugt auf den Zug, der den letzten Zug des Gegners geschlagen hätte.
- **Angenommen (A):** die einzelnen Prozentwerte in der Tabelle. Sie halten die Richtung ein und ergeben (0,55 + 0,45 + 0,32) / 3 = 0,44. Die Einzelwerte aus Fig. 2 der Studie waren aus der Cloud nicht abrufbar.
- **Studie nicht vollständig belegbar?** Die Studie existiert und trägt die Aussage „Gewinner bleiben, Verlierer wechseln“ qualitativ (arXiv-Volltext gelesen). Die Stärke ist nur über die 44 % belegt. Deshalb sagt das Video „44 statt 33 Prozent“ und „Ich hab's simuliert“ und behauptet keine konkreten Einzelwerte. Die Empfindlichkeitsrechnung unten zeigt, wie stark das Ergebnis vom Muster abhängt.

## Ergebnisse (S), je 100.000 Wiederholungen mit 100 Runden

| Fall | Rot vorn | Cyan vorn | Gleichstand | Vorsprung Rot Ø (σ) | Siege Rot / Cyan / unentschieden Ø |
|---|---|---|---|---|---|
| Cyan = Zufall | 47,6 % | 47,6 % | 4,8 % | −0,01 (8,19) | 33,3 / 33,3 / 33,4 |
| Cyan = Mensch-Modell | 98,8 % | 0,8 % | 0,3 % | **+17,2** (7,34) | 44,5 / 27,3 / 28,2 |
| Mensch würfelt ab Runde 51 | 84,9 % | 12,2 % | 2,8 % | +8,5 (7,76) | 38,9 / 30,4 / 30,8 |

- Zweite Hälfte (Runde 51–100) bei „Mensch würfelt“: Vorsprung Ø **−0,01**; erste Hälfte Ø +8,5. Der Vorsprung wächst nach dem Wechsel nicht mehr (Nash).
- Quantile Vorsprung Mensch-Modell: 5 % +5, 25 % +12, Median +17, 75 % +22, 95 % +29.

## „Warum?“ (S): Rot gewinnt die Runde …

| … nach | Rot gewinnt | Cyan gewinnt | unentschieden | Anteil am Vorsprung (Siege je Lauf) |
|---|---|---|---|---|
| Sieg des Menschen („Gewinner bleibt“) | **55,0 %** | 22,5 % | 22,5 % | +8,8 |
| Unentschieden | 44,9 % | 27,5 % | 27,6 % | +4,9 |
| Niederlage des Menschen („Verlierer wechselt“) | 38,0 % | 30,0 % | 32,0 % | +3,5 |

Im Video stehen die zwei Faktoren Sieg und Niederlage; das Unentschieden (+4,9) fehlt aus Platzgründen.

## Empfindlichkeit (S): Was, wenn das Muster schwächer ist?

Die Abweichungen des Menschen von 1/3 werden mit k skaliert, Rot rechnet weiter mit dem vollen Modell (k = 1).

| k | Wiederholungsrate | Vorsprung Rot Ø | Rot vorn |
|---|---|---|---|
| 0 | 33,3 % (Zufall) | +0,05 | 47,9 % |
| 0,25 | 36,0 % | +4,7 | 70,0 % |
| 0,5 | 38,7 % | +9,1 | 86,2 % |
| 0,75 | 41,3 % | +13,2 | 95,3 % |
| 1 | 44,0 % (belegt) | +17,2 | 98,8 % |

**Fazit:** Mit jedem Prozentpunkt Wiederholung über 33,3 % wächst der Vorsprung. Schon bei halbem Muster liegt Rot in 86 % der Läufe vorn. Gegen Zufall (k = 0) bleibt es bei 0.

## Läufe im Video (feste Auswahlkriterien, keine Ausreißer)

| Lauf | Seed | Rot | Cyan | unentschieden | Vorsprung | Führungswechsel |
|---|---|---|---|---|---|---|
| Zufall | 308 | 34 | 31 | 35 | +3 | Runde 14, 17, 19 (Cyan), 57 (Rot) |
| Mensch | 16 | 50 | 31 | 19 | +19 (Median 17) | Runde 3 (Rot) |
| Mensch würfelt ab Runde 51 | 16 | 38 | 31 | 31 | +7 | Runde 3 (Rot); Runde 51–100: 14 : 15 |

- Runde 1–3 (Zufall): unentschieden, Rot, Cyan. Runde 10: 4 : 2. Runde 30: 11 : 11. Runde 60: 22 : 19.
- Mensch: Runde 30: 17 : 8; nach Runde 50: 24 : 16.
- Kriterien: Zufall |Vorsprung| ≤ 3 (typisch: Median von |Vorsprung| ist 6), Rot führt zuerst, ≥ 3 Führungswechsel; Mensch Endvorsprung innerhalb ±3 um den Median; „würfelt“: gleicher Seed, zweite Hälfte höchstens ±3.

## Grenzen

- Das Mensch-Modell beruht auf Laborspielen (Studierende, 300 Runden, Zufallspaarung in 6er-Gruppen, kleiner Geldanreiz). Wie ein bestimmter Mensch gegen eine Taktik spielt, ist offen; wer das Muster kennt und gegensteuert, verliert den Vorteil.
- Aussagen im Video sind Modellergebnisse („Ich hab's simuliert“), keine Garantie für das Spiel mit einer Person.
