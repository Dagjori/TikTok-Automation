# Prüfung vor dem Posten (Abnahme)

Ein Video geht nur in Buffer, wenn **alle** Pflichtpunkte erfüllt sind. Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion.

## 1. Automatisch
```bash
cd pipeline
python3 qc/referenz_pov.py projekte/<name>              # Exit 0 = alle Pflichtpunkte ja
node qc/text_ueberlappung_pov.mjs projekte/<name>       # Exit 0 = keine Überlappung, alles in der sicheren Zone
```
`qc/referenz_pov.py` liest `out/<name>/ereignisse.json` und `out/<name>/<name>.mp4`:
| Nr. | Pflichtpunkt | Ziel |
|---|---|---|
| 1, 1b | Länge, Format, Tonspur | 80 ± 0,5 s, 1080 × 1920, Ton vorhanden |
| 2 | Titelfrage | genau einmal, nur in 0–4,4 s (wie Referenz) |
| 3, 3b, 3c, 3d | Messwert-Anzeige | ab ≤ 4,5 s bis ≥ 68 s, Zahl ändert sich in ≥ 60 % der 0,5-s-Schritte, Etikett wechselt 2–4×, „HIER“ bzw. 0 zwischen 52 und 68 s |
| 4–4e | Sätze | 12–18 Sätze, je 3–9 Wörter, je ≥ 3 s, keine Überlappung, zwischen 4,4 und 70 s |
| 5, 5b | Verbotene Elemente | keine Sticker, Chips, Karaoke/Untertitel, Folgen-Aufruf, Ringe, Tafeln, Logos; keine Schnitte |
| 6, 6b, 6c | Abspann | ab ≤ 72,05 s, ≥ 7 s, Titelfrage + Faktenzeile; Abblende 70–72 s |
| 7, 7b, 7c | Lautheit | −14 ± 1 LUFS, True Peak ≤ −1 dBTP; Maximum in 52–68 s und ≥ 4 dB über dem Start; Abspann ≥ 6 dB unter dem Start |
| 8 | Keine Stimme | keine `audio/stimme.mp3`, keine Untertitel |
| 9 | Kein „5 Sekunden“-Rahmen | weder in Texten des Videos noch in `skript.json`/`szene.js` |

## 2. Kontaktbogen und Sichtprüfung (Claude selbst)
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=0.5,scale=216:384,tile=8x5" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Satz für Satz** mit `skript.json → bild_text_abgleich`: Ist das Genannte im Moment des Satzes zu sehen? Stimmen Zahlen mit der Anzeige?
- [ ] Bild 0 zeigt die volle, belebte Szene mit Anzeige; Titel blendet bis 4,4 s aus.
- [ ] **Detaildichte wie die Referenzen** (größte Lücke laut Demo 02.11.): Gebäude mit Dach, Fenstern und Details statt Quadern; dichte, abwechslungsreiche Vegetation; Wasser mit Bewegung, wo die Welt Wasser hat; Menschen und Fahrzeuge im Mittelgrund klar erkennbar; der Höhepunkt zeigt das Ereignis selbst (Wand, Trümmer, Licht), nicht nur eine leere Fläche. Vergleich: 6 Phasen-Standbilder neben Referenzbildern derselben Phase (nur im Scratchpad, nie im Repo).
- [ ] Welt: Statisten bewegen sich, Vögel, Wolken, Dunst; nie länger als 2 s völliger Stillstand vor dem Höhepunkt (Kamera atmet, Welt lebt).
- [ ] Licht und Farbe folgen den Phasen (`licht-und-effekte.md`), Sonne mit Glanz, Luftperspektive sichtbar.
- [ ] Effekte sitzen auf dem Zeitplan: Auslöser, Eskalation, Front, Höhepunkt „HIER“ mit Stoß/Kippen, Nachspiel mit Staub/Glas/Flecken, Abblende.
- [ ] Typografie wie `design.md`: Hof sichtbar auf hellem Grund, keine Kollision mit dem Geschehen in wichtigen Momenten, Umlaute korrekt.
- [ ] Nichts Verbotenes: kein Logo, kein Kanalname, keine Sticker, kein Gelb-Wort, kein Karaoke, keine Opferdarstellung.
- [ ] Abspann: #111111, Titelfrage identisch, Faktenzeile mit Quelle in `skript.json`.

## 3. Ton
- [ ] Anhören: Anfang, Höhepunkt, Abspann; keine Sprache, keine Knackser, Effekt auf jedem Bild-Ereignis (außer physikalisch begründeter Stille).
- [ ] Optional: Spracherkennung (ElevenLabs Speech-to-Text) findet keine Sprache.

## 4. Inhalt und Plattform
- [ ] Thema nicht gesperrt, Konkurrenz-Check dokumentiert, Rechnung mit Quellen, Annahmen in `skript.json`.
- [ ] Caption im Account-2-Format, 3–5 Hashtags, kein #fyp/#viral; kein KI-Label.

Bei einem „nein“: Ursache beheben, betroffene Bilder mit `--von/--bis` neu rendern, erneut prüfen. Erst danach `post_buffer.py` ohne `--trocken`.
