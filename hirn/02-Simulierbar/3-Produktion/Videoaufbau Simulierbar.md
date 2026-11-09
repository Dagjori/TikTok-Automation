---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-09
quelle: .claude/skills/video-produktion/simulierbar.md, .claude/skills/themen-skript/simulierbar.md B1, CLAUDE.md §6, Entscheidungen des Inhabers 02.11., 07.11., 08.11. und 09.11.2026
tags: [konto/simulierbar, videoaufbau, zeitplan, dynamik, dramaturgie, effekte, layout, untertitel]
cssclasses: [konto-simulierbar, typ-regel]
---

# Videoaufbau Simulierbar

Wie ein Skript von `@simulierbar` **im Bild** umgesetzt wird: Zeitplan je Phase, Dynamik, Dramaturgie und Effekte, Skript-Bild-Abgleich, Layout und Untertitel. Stand 09.11.2026. Der Aufbau des **Skripts** selbst (Phasen, Sprache, Selbstprüfung, Beispiel) steht seit 09.11.2026 in [[Skriptaufbau Simulierbar]], die Stimme in [[Stimme ElevenLabs Simulierbar]]. Gilt nicht für Account 2 ([[Trennung der Accounts]]).

**Grundsatz seit 09.11.2026:** Die Szene wird auf die fertige Stimme gebaut. Jede Einblendung, jeder Zähler und jede Wendung hängt an Wort- bzw. Segmentzeiten aus `audio/timing.json`. Die Videolänge ist Stimmdauer plus Ausklang, mindestens 61 s ([[CRP Creator Rewards Program]]), in der Regel 65–80 s. Vorgaben zum Sprechtempo gibt es nicht mehr ([[Entscheidungen Log]], 09.11.2026).

## 1. Zeitplan im Bild (Zeiten für ca. 70 s, sie folgen der Stimme)
| Zeit | Phase (ID) | Bild (Welt zuerst, HUD unterstützt) |
|---|---|---|
| 0–3 s | **Hook** `hook` | Ganze Szene von Bild 1 an, schon in Bewegung (Licht, Verkehr, Staub, Kamera fährt). **Titelfrage im Bild ab Bild 1** mit dem Suchbegriff, **Tafel ab Bild 0** mit allen Startwerten (beim Duell beide Seiten und „VS“). Das erste Bild ist ohne Ton verständlich. Das Bild bei 1,0 s ist das Cover. |
| 3–8 s | **Regeln** `regeln` | **Die Zähler laufen schon.** Jede Annahme erscheint beim Wort als Objekt in der Welt (Preisschild, Münzstapel, Route, Gefäß) und als Chip. Kein Erklärblock. |
| 8–11 s | **Denkfalle** `falle` | Kamera rückt die naheliegende Antwort ins Licht (Schärfe, Lichtkegel). Kein Sticker. |
| 12–15 s | **Erste Wendung** `wendung1` | Zoom bzw. Schärfenverlagerung auf den entscheidenden Moment, Licht wechselt. |
| bis ca. 45 s | **Rennen und weitere Wendungen** `rennen`, `wendung2 …` | Alle 8–10 s ein neuer Befund oder Führungswechsel (insgesamt 4–5 Wendepunkte), mindestens eine Zahl je 10 s. Tafel färbt die führende Seite, die Welt reagiert (Waage kippt, Gefäß überholt, Route leuchtet auf). In einer Wendung wird die **zweite Frage** gesetzt und im Bild sichtbar angedeutet. |
| ca. 60–65 % | **Kipp-Moment** `kipp` | Wichtige Zahl leuchtet auf, Licht und Kamera auf den Kipp. **Höhepunkt der Spannungskurve**, das Ergebnis ist noch offen. |
| ca. 75–80 % | **Ergebnis** `ergebnis` | Bilanzkarte (`M.bilanz`) baut sich zeilenweise auf; in der Welt hält das Rennen an, Licht auf das Ergebnis. |
| höchstens 6 s | **„Warum?“** `warum` | `M.balken` mit höchstens 2 Faktoren (Erklärgrafik, Pflicht seit 07.11.); Blaupause (Stil 13) als Einschub erlaubt ([[Stile 17 bis 21]]). |
| die letzten 6 s | **Pointe** `pointe` | Löst die zweite Frage auf: neue Runde in derselben Welt (anderer Parameter) oder Einordnung im Bild. |
| die letzten 2–3 s | **Schlusskarte** `schlusskarte` | Karte mit Fazit oder Pointe, Schlüsselwort in der Teamfarbe; keine Frage, kein Aufruf. Rückkehr zum Anfangsbild (`M.schleife`) ist freiwillig. |

Zwischen Ergebnis und Ende liegen höchstens 12 s. **Formate neben dem Duell** (Zeitverlauf, Was bleibt, Lernvideo): Die laufende Jahreszahl, die Treppe der Abzüge bzw. die Modellperson ersetzt das Rennen; Tafel und Zähler bleiben Pflicht.

**Ende:** Schlusskarte, kein fester Schlusssatz. Schleife freiwillig. **Folgen-Hinweis nur im Testblock** „mit“ (`tools/testblock.py`): eine nicht gesprochene Textzeile unter der Schlusskarte in den letzten 2–3 s (`M.hinweis`), an den Inhalt gebunden, kein Tausch, keine Belohnung, kein Druck. Einen Folgen-Aufruf bei ca. 20 s gibt es nicht mehr ([[Regelwerk Simulierbar]], [[Lernschleife und Insights]]).

## 2. Dynamik (Inhaber 31.10./02.11.)
- **Alle 1–2 s etwas Neues im Bild** (Bewegung in der Welt, Kamerafahrt, Lichtwechsel, Zähler, Chip, Szenenwechsel), **nie mehr als 2 s Stillstand** (`massstab.py` Punkt 5).
- Die Neuigkeit kommt bevorzugt aus der Welt: Objekt erscheint, Licht geht an, Flüssigkeit steigt, Auto biegt ab, Waage kippt. **Die Kunst ist die animierte Welt:** Umgebung, Detail, Licht, reagierende Objekte, Kamera, die dem Geschehen folgt.
- Szenenwechsel weich (`zoomwisch`, `blende`, `iris`), höchstens alle 5–15 s.
- **Keine großen Sticker oder Stempel** (Prüfpunkt 5d = 0). Zahlen, Zähler, Timer und Chips bleiben, sind aber nicht die Kunst. Chips nur mit neuer Zahl bzw. Information (höchstens 15 je Video).
- Dynamik entsteht nicht durch Pixelbewegung, sondern durch **neue Information im Sekundentakt** (Messung in [[Maßstab Simulierbar]]).

## 3. Dramaturgie und Effekte (Inhaber 02.11.2026 abends)
„Mehr Effekte, aber nichts Übertriebenes, und die Spannung steigt.“

**Grundsätze:** (1) Von der ersten Sekunde fangen, die Spannung bis zum Kipp-Moment steigern und bis zum Ergebnis halten; danach kurz ausatmen („Warum?“), Pointe, Schlusskarte. (2) **Skript zuerst**, Design und Animation aus dem Skript ableiten (Skript → Beat-Blatt in `skript.json` → Welt). (3) Erlaubt und erwünscht: mehrere verschiedene Animationssequenzen, Bildwechsel, Aufleuchten von Elementen, Lichtspiele, Glow, Zoom (abwechselnd, nicht dauerhaft), Fahrten. (4) Große Sticker und Stempel bleiben verboten, ebenso `regie.stoss`.

**Spannungskurve (Stufe 1 = ruhig, 5 = Höhepunkt):**
| Phase | Stufe | Typische Mittel (Beispiele, nicht alle zugleich) |
|---|---|---|
| Hook | 2 | Welt in Bewegung, langsame Fahrt, Licht auf der Frage, Tafel ab Bild 0 |
| Regeln | 2–3 | Zähler laufen, Objekte erscheinen beim Wort, Chips |
| Denkfalle | 2–3 | Licht rückt die naheliegende Antwort ins Rampenlicht |
| erste Wendung | 4 | Zoom oder Schärfenverlagerung, Lichtwechsel, die Erwartung kippt sichtbar |
| Rennen | 3 | Zähler laufen, Kamera folgt, Abstand wird sichtbar |
| weitere Wendung, Führungswechsel | 4 | Aufleuchten der führenden Seite, Kamerawechsel, engere Einstellung |
| Kipp-Moment | 5 | wichtige Zahl leuchtet auf, Licht und Kamera auf den Kipp; optischer Höhepunkt |
| Ergebnis | 5 | Licht auf das Ergebnis, Glow, Bilanzkarte baut sich auf; die Spannung löst sich |
| „Warum?“ | 3 | ruhiger, erklärend, Fahrt statt Zoom |
| Pointe | 4 | neuer Winkel, letzter Dreh |
| Schlusskarte | 2 | Fazit- bzw. Pointenkarte; im Testblock „mit“ darunter die leise Hinweiszeile |

**Maß:** Variation alle 5 s (in jedem 5-s-Fenster ein andersartiger Effekt oder Bildtyp) · höchstens ein dominanter Effekt zugleich, Text immer lesbar · Zoom nicht dauerhaft, Richtwert 2–4 je Video (**S**) · kein Leerlauf, aber auch kein Dauer-Wackeln oder Schnittgewitter · keine schnellen Helligkeitswechsel (über 3 pro Sekunde, WCAG 2.3.1) · Effekte folgen dem Inhalt des Skripts. Technische Rezepte: [[Licht und Atmosphäre Simulierbar]] (Abschnitt 9) und [[Design und Layout Simulierbar]] (Abschnitt 6).

**Checkliste für die Abnahme** (steht auch in [[Prüfung und Abnahme Simulierbar]]): Spannungskurve · Variation alle 5 s · kein Leerlauf · nichts Übertriebenes · **„Würde ein Zuschauer denken, das sieht billig aus?“ Bei „ja“ wird die Abnahme verweigert.**

## 4. Skript-Bild-Abgleich (Pflicht, Inhaber 02.11.)
Jedes gesprochene Detail ist im selben Moment so zu sehen. In `skript.json` je Segment ein Eintrag `bild_text_abgleich`: was gesagt wird (Objekt, Handlung, Zahl, Ort) → was im selben Moment zu sehen ist (Objekt in der Welt, Kamera, Zahl auf Tafel oder Chip). Abnahme Segment für Segment am Kontaktbogen. Der Abgleich ist zugleich das Beat-Blatt für Animation, Kamera und Licht.
```json
"bild_text_abgleich": [
  {"segment": "regeln", "gesagt": "Fünfzig Euro mehr im Monat", "bild": "rechte Schale: erste Münze fällt bei „fünfzig“, Tafel rechts 50 €"},
  {"segment": "wendung1", "gesagt": "Nach drei Jahren kippt die Waage", "bild": "Uhr 36 MONATE, Balken kippt nach rechts, Tafel rechts VORN"}
]
```
Was nicht zu sehen ist, wird nicht gesagt; was groß zu sehen ist, wird erwähnt oder weggelassen. Dramaturgie-Hinweise aus dem Skript (Feld `dramaturgie`) sind Vorschläge für das Beat-Blatt; Abweichungen werden dort festgehalten.

## 5. Layout, Untertitel, Teamfarben (Kernregeln)
- **Layout:** Mittelachse x = 540, Schutzzone 150 px links, rechts und oben, nichts Wichtiges unter y ≈ 1500, 1080×1920. Details und HUD-Bausteine: [[Design und Layout Simulierbar]].
- **Untertitel in Blöcken von 1–4 Wörtern**, Schlüsselwort in der Teamfarbe seiner Seite (`M.untertitel({ max: 4, unten: 1450, groesse: 64 })`, Prüfpunkt 14). Sie zeigen `text`, nicht den Sprechtext.
- **Teamfarben:** zwei feste Farben je Video, überall gleich, **nie Gelb**.
- **Kein Kanalname, Logo oder Rubrik im Video, nie;** keine Spielszenen, echten Personen, Marken.
- **Ton:** [[Klangteppich und Ton Simulierbar]].

## Siehe auch
[[Skriptaufbau Simulierbar]] · [[Stimme ElevenLabs Simulierbar]] · [[Klangteppich und Ton Simulierbar]] · [[Design und Layout Simulierbar]] · [[Licht und Atmosphäre Simulierbar]] · [[Stile 17 bis 21]] · [[Technik und Szenenbau Simulierbar]] · [[Prüfung und Abnahme Simulierbar]] · [[REA Simulierbar Regelwerk]] · [[Regelwerk Simulierbar]] · [[Account Simulierbar Überblick]]
