---
typ: regel
konto: stelldirvor
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/stelldirvor-video/pruefung.md
tags: [konto/stelldirvor, pruefung, abnahme]
cssclasses: [konto-stelldirvor, typ-regel]
---

> Quelle: `.claude/skills/stelldirvor-video/pruefung.md`. Diese Notiz wird mit `python3 tools/hirn_aus_skills.py` erzeugt. Änderungen bitte im Skill vornehmen, nicht hier. Bei Abweichung gilt der Skill.

# Prüfung und Abnahme Account 2

*Prüfung vor dem Posten (Abnahme)*

Ein Video geht nur in Buffer, wenn **alle 21 Pflichtpunkte** erfüllt sind **und** die Sichtprüfung samt Qualitätslatte (Abschnitt 2) bestanden ist. Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion. Stand: Regeln des Inhabers vom 02.11.2026 abends (bis dahin 22 Pflichtpunkte; der Punkt „Kein 5-Sekunden-Rahmen“ ist entfallen).

## 1. Automatisch
```bash
cd pipeline
python3 qc/referenz_pov.py projekte/<name>              # Exit 0 = alle Pflichtpunkte ja (Hinweise ändern den Exit-Code nicht)
node qc/text_ueberlappung_pov.mjs projekte/<name>       # Exit 0 = keine Überlappung, alles in der sicheren Zone
```
`qc/referenz_pov.py` liest `out/<name>/ereignisse.json`, `projekte/<name>/skript.json` und `out/<name>/<name>.mp4` (Bildanalyse braucht numpy und ffmpeg):

**Pflichtpunkte (21)**
| Nr. | Pflichtpunkt | Ziel |
|---|---|---|
| 1, 1b | Länge, Format, Tonspur | 80 ± 0,5 s, 1080 × 1920, Ton vorhanden |
| 2 | Titelfrage | genau einmal, nur in 0–4,4 s (wie Referenz) |
| 3, 3b, 3c, 3d | Messwert-Anzeige | ab ≤ 4,5 s bis ≥ 68 s, Zahl ändert sich in ≥ 60 % der 0,5-s-Schritte, Etikett wechselt 2–4×, „HIER“ bzw. 0 zwischen 52 und 68 s |
| 4–4e | Sätze | 12–18 Sätze, je 3–9 Wörter, je ≥ 3 s, keine Überlappung, zwischen 4,4 und 70 s |
| 5, 5b | Verbotene Elemente, harte Schnitte | keine Sticker, Chips, Karaoke/Untertitel, Folgen-Aufruf, Ringe, Tafeln, Logos; **keine harten Schnitte**: weder Übergänge im Protokoll noch ein Bildsprung Bild für Bild (Sprung ≥ 6 Grauwerte und ≥ 8× das Umfeld, der bleibt; Blitz, Weißblende, Stoß, Kippen im Protokoll sind ausgenommen). **Langsame Fahrt, Schwenk und Zoom sind erlaubt** und scheitern nicht (geprüft an einem 1,0→1,5-fachen Zoom in 12 s und einem Schwenk mit ≈ 160 px/s, beide ohne Treffer; ein künstlich eingefügter Hartschnitt bei 12,0 s wurde bei 12,0 s gemeldet, und das Eiszeit-Video mit seinem Weißblende-Stoß besteht ohne Treffer) |
| 6, 6b, 6c | Abspann | ab ≤ 72,05 s, ≥ 7 s, Titelfrage + Faktenzeile; Abblende 70–72 s |
| 7, 7b, 7c | Lautheit | −14 ± 1 LUFS, True Peak ≤ −1 dBTP; Maximum in 52–68 s und ≥ 4 dB über dem Start; Abspann ≥ 6 dB unter dem Start |
| 8 | Keine Stimme | keine `audio/stimme.mp3`, keine Untertitel |
| 9 | **entfallen seit 02.11.2026 abends** (früher „Kein 5-Sekunden-Rahmen“) | 5-Sekunden-Themen sind erlaubt, wenn sie sich gut simulieren lassen; die Nummer bleibt frei, damit alle anderen Nummern stabil bleiben |

**Hinweise (nicht Pflicht, Ausgabe „nein (Hinweis)“; jeder Hinweis ist im Bericht zu erklären oder zu beheben, die Sichtprüfung entscheidet)**
| Nr. | Hinweis | Ziel (Startwerte S, nach dem nächsten Video kalibrieren) |
|---|---|---|
| 10 | **Bewegung: kein Leerlauf** | In jedem 2,5-s-Fenster zwischen 0 und 70 s (Schritt 0,5 s) ändert sich das Bild um ≥ 2,5 Grauwerte im Mittel (Graubild 108 × 192; Anzeige, Satz und Titelfrage ausgenommen). Beim Video „Eiszeit Toronto“: 1,2–1,3 in 32–37 s und 40–49,5 s (Inhaber: „es wird gewartet“), sonst ≥ 3 |
| 10b | **Kein Einzelbild-Flackern** | Kein Bild, das aus der Reihe springt und gleich zurückkehrt (Sprung ≥ 4 und Rückkehr ≤ 35 %); Render-Aussetzer. Beim Eiszeit-Video 5×, ein Teil des Vordergrunds (Wasserspiegelung) springt kurz |
| 11 | **Zeitraffer ausgewiesen, Anzeige läuft mit** | `skript.json → zeitraffer` ist vorhanden (Liste `{von, bis, faktor}` oder `"keiner"`); in jedem Abschnitt ändert sich die Anzeige in ≥ 80 % der Schritte |
| 12 | **Anzeige ohne unbegründete Sprünge** | Innerhalb eines Etiketts kein Schritt, der ≥ 3× größer ist als seine Nachbarschritte und ≥ 2 % der Spanne beträgt (Etikettwechsel ausgenommen) |

## 2. Kontaktbogen und Sichtprüfung (Claude selbst)
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=0.5,scale=216:384,tile=8x5" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Satz für Satz** mit `skript.json → bild_text_abgleich`: Ist das Genannte im Moment des Satzes zu sehen? Stimmen Zahlen mit der Anzeige? Wurden Titelfrage, Sätze und Faktenzeile **1:1** aus dem Skript übernommen (jede Abweichung steht mit Quelle unter `korrekturen`; bei gekipptem Ergebnis liegt die Zustimmung des Inhabers vor)?
- [ ] Bild 0 zeigt die volle, belebte Szene mit Anzeige und schon Bewegung; Titel blendet bis 4,4 s aus.
- [ ] **Welt passt zum Thema** (Natur zuerst, Stadt nur, wenn das Thema sie braucht), keine Standard-Skyline als Dauerkulisse; **Weltvielfalt:** Welttyp und Standpunkt anders als im vorigen Video, Tageszeit wechselt, nicht zwei gleiche Enden am selben Tag.
- [ ] **Bewegung statt Warten:** In jedem 2–3-s-Abschnitt des Kontaktbogens (und in den Standbildern dazwischen) ist eine themenbezogene Veränderung zu sehen (Licht, Wetter, Wasser, Vegetation, Eis, Wolkenzug, Tiere, Fahrzeuge, Kamerafahrt); Hinweis 10 ist erklärt. Mindestens 4 erkennbare Phasen, mindestens 3 Ebenen Leben gleichzeitig. Gibt es Leerlauf, wird die Abnahme verweigert.
- [ ] **Zeitraffer und Anzeige passen zusammen:** Im Faktor-Abschnitt (siehe `skript.json → zeitraffer`) läuft die Zahl im Tempo der sichtbaren Veränderung (Pegel, Schatten, Eisrand), der Faktor steht in der Unterzeile, wo nötig, keine Sprünge ohne Grund (Hinweise 11, 12).
- [ ] **Kamera:** weich und ohne Ruck; Fahrt, Schwenk und Zoom folgen dem Geschehen; **keine harten Schnitte, keine mehreren Einstellungen**; im Nachspiel liegt sie still; die Textebenen bleiben lesbar.
- [ ] **Dramaturgie:** fängt in der ersten Sekunde; mindestens 4 steigende Spannungsstufen zwischen 5 und 58 s mit neuer Information; Höhepunkt 58–62 s ist der stärkste Moment; kein Dauerblitzen, keine übertriebenen Effekte, nichts, das nur Effekt ist.
- [ ] **Detaildichte wie die Referenzen** (größte Lücke laut Demo und Eiszeit-Video 02.11.): Gelände und Gebäude mit Form, Dach, Fenstern, Details statt Quadern und glatter Fläche; dichte, abwechslungsreiche Vegetation; Wasser mit Bewegung, wo die Welt Wasser hat; Menschen, Tiere und Fahrzeuge im Mittelgrund erkennbar; der Höhepunkt zeigt das Ereignis selbst (Wand, Trümmer, Licht), nicht nur eine leere Fläche; keine milchige Phase, keine glasige Fläche, Weißblende nicht zu früh. Vergleich: 8 Phasen-Standbilder neben Referenzbildern derselben Phase bzw. neben dem Vorgänger-Video (nur im Scratchpad, nie im Repo).
- [ ] **Qualitätslatte „sieht es billig aus?“:** Kontaktbogen und Standbilder wie ein Zuschauer betrachten. Wirkt die Welt flach, gleichförmig, leer, milchig oder glasig, oder ist die Veränderung dürftig, lautet die Antwort **Abnahme verweigert**, auch bei 21/21 Pflichtpunkten (das erste Video bestand 22/22 und gefiel dem Inhaber trotzdem nicht). Ursache beheben, nicht posten.
- [ ] Licht und Farbe folgen den Phasen und der Tageszeit ([[Licht und Effekte Account 2]]), Sonne bzw. Mond mit Glanz, Luftperspektive sichtbar.
- [ ] Effekte sitzen auf dem Zeitplan: Auslöser (mit Vorboten), Eskalation, Front, Höhepunkt „HIER“ mit Stoß/Kippen, Nachspiel mit Staub/Glas/Flecken, Abblende.
- [ ] Typografie wie [[Design Account 2]]: Hof sichtbar auf hellem Grund, keine Kollision mit dem Geschehen in wichtigen Momenten, Umlaute korrekt.
- [ ] Nichts Verbotenes: kein Logo, kein Kanalname, keine Sticker, kein Gelb-Wort, kein Karaoke, keine Opferdarstellung.
- [ ] Abspann: #111111, Titelfrage identisch, Faktenzeile mit Quelle in `skript.json`.

## 3. Ton
- [ ] Anhören: Anfang, Höhepunkt, Abspann; keine Sprache, keine Knackser, Effekt auf jedem Bild-Ereignis (außer physikalisch begründeter Stille); die Atmo passt zur Welt.
- [ ] Optional: Spracherkennung (ElevenLabs Speech-to-Text) findet keine Sprache.

## 4. Inhalt und Plattform
- [ ] **Keine 1:1-Kopie** eines fremden Videos (Sätze, Etiketten, Faktenzeile, Bild- und Szenenideen); ein gleiches Thema nur mit eigenem Skript und deutlich anderem Design (Welt, Dramaturgie). Eine Sperrliste gibt es nicht mehr (veraltet seit 02.11.2026), die Kopierregel bleibt.
- [ ] Skript liegt vor und ist übernommen (`skript_id`), Rechnung als Code mit Test (`pipeline/sim/`), Quellen und Annahmen in `skript.json`, `lern_notizen` ausgefüllt.
- [ ] Caption aus dem Skript im Account-2-Format, 3–5 Hashtags, kein #fyp/#viral; kein KI-Label.

Bei einem „nein“: Ursache beheben, betroffene Bilder mit `--von/--bis` neu rendern, erneut prüfen. Erst danach `post_buffer.py` ohne `--trocken`.

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Format Account 2 Lunar]] · [[Ablauf Account 2]] · [[Design Account 2]] · [[Licht und Effekte Account 2]] · [[Ton Account 2]] · [[Technik und Szenenbau Account 2]] · [[Themen und Plan Account 2]] · [[Konkurrenz-Check und Sperrliste Account 2]]

Account 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: [[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].
