---
typ: anleitung
konto: simulierbar
status: aktuell
datum: 2026-11-09
quelle: pipeline/qc/massstab.py, pipeline/qc/massstab_test.py, .claude/skills/video-produktion/simulierbar.md, CLAUDE.md §4, CLAUDE.md §7, Entscheidungen des Inhabers bis 09.11.2026
tags: [konto/simulierbar, prüfung, abnahme, qc, kontaktbogen, lautheit]
cssclasses: [konto-simulierbar, typ-anleitung]
---

# Prüfung und Abnahme Simulierbar

Ein Video geht nur in Buffer, wenn **alle** Pflichtpunkte erfüllt sind (Prüfliste mit **23 Punkten**; ihre Herkunft steht im Archiv [[Maßstab Simulierbar]] Abschnitt 11, maßgeblich sind hier Abschnitt 1 und 2). Die Produktion prüft jedes Video selbst und plant es ohne weitere Freigabe des Inhabers ein ([[Plattformregeln und Posting]]). **Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion.**

## 1. Automatisch
```bash
cd pipeline
python3 qc/stimme_vorab.py projekte/<name>             # vor der Stimme: Textformat des Sprechtexts, kostenlos, bis „BEREIT“
python3 qc/massstab.py projekte/<name>                 # Exit 0 = alle Pflichtpunkte ja
node qc/text_ueberlappung.mjs projekte/<name>          # Exit 0 = keine Überlappung von Tafel, Chips, Karten, Untertitel
python3 qc/massstab_test.py                            # Tests der Prüfung selbst (nach Änderungen an qc/massstab.py)
```

**Seit 09.11.2026 prüft nichts mehr das Sprechtempo.** Die Punkte 12b (Wörter bzw. Silben je Sekunde), 12d und 12d2 (gemessene Satzpausen), 12e (Pause nach Komma) und alle Tempo-Profile sind aus `qc/massstab.py` entfernt. `qc/stimme_vorab.py` schätzt keine Stimmdauer und keine Hook-Zeit mehr, sondern prüft nur das Textformat ([[Stimme ElevenLabs Simulierbar]]). Das Video folgt der fertigen Stimme.

### Pflicht oder Hinweis (Stand 09.11.2026, aus `pipeline/qc/massstab.py`)
| Art | Code-Punkte |
|---|---|
| **Pflicht** (Exit 1 bei „nein“) | 1 Stimme startet unter 0,2 s · 3b kein „Los geht's“ · 5 längste Phase ohne Bild-Ereignis ≤ 2 s · 5d keine Sticker oder Stempel · 7 Folgen-Hinweis nur im Testblock „mit“ · 10 Schlusskarte, keine Frage, kein Aufruf · **12f Videolänge mindestens 61 s** · 12h Auflösung 1080×1920 · 14 Untertitel in Blöcken von 1–4 Wörtern · 15 kein Kanalname, Logo, Rubrik · 16a keine aufgeregten Tags · 18b Stil erlaubt · R1 Titel im Bild ab Bild 1 · R2 Tafel ab Bild 0 · R3 Erklärgrafik · R4 Du nur im Hook |
| **Hinweis** (zählt nicht für den Exit-Code) | 2 Hook-Zeit · 3 Denkfalle · 4 Uhr/Zähler · 5b · 5c · 5e Chips ≤ 15 · 6 erste Wendung · 8 „Warum?“ · 11 Schleife (freiwillig) · 12a Wortzahl 150–190 · 12c Satzlängen · 12f2 Länge im Richtwert 65–80 s · 12g · 13a Klangteppich · 13b Akzent · 16b Ausrufezeichen · R5 Ergebnis bei ca. 75–80 % · R6 Kipp-Moment · R7 erster Satz kurz |

Einzelheiten zu einzelnen Punkten:
- **7 Folgen-Hinweis:** im Testblock `folgen_hinweis` = „mit“ eine nicht gesprochene Textzeile (`M.hinweis`) in den letzten 2–3 s, höchstens 10 Wörter, ohne Druck, Tausch oder Belohnung; bei „ohne“ bzw. ohne Testblock keiner; `M.folgen` ist immer „nein“ ([[Regelwerk Simulierbar]]).
- **18b Stil:** 1–15 oder 17–21; Stil 16 und Module von Account 2 (`stil_lunar_pov.js`, `lunar_hud.js`, `welt_grossstadt_dach.js`) sind in einer Simulierbar-Szene nicht erlaubt. Die Qualitätslatte prüft die Sichtprüfung.
- **Cover:** Bild bei 1,0 s (`<video>_cover.jpg` nach `post_buffer.py` ansehen).
- Hinweis-Punkte müssen trotzdem von Hand angesehen und im Bericht erklärt oder behoben werden.

`massstab.py` liest `skript.json`, `audio/timing.json`, `audio/ereignisse.json` (schreibt `render.js` aus dem Ereignis-Protokoll der Bausteine) und `szene.js`. Weitere Aufrufe: `--ziel woerter=140:180`, `--ziel laenge_min=61`, `--json`. Die alten Profile und Tempo-Ziele werden mit einem Hinweis übergangen.

### Nummerierung (Hinweis)
Die Code-Punkte (z. B. 16a, 5d, 18b) folgen nicht 1:1 der Prüfliste mit 23 Punkten. Ohne Code-Punkt, also Handprüfung am Kontaktbogen bzw. vor der Produktion: zweite Überraschung bzw. zweite Frage, Teamfarben, keine 1:1-Kopie, Skript-Bild-Abgleich, Spannungskurve und Variation, Qualitätslatte, Skript-Qualität (Abschnitt 2).

### Zusätzliche Messungen
```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 out/<name>/<name>.mp4     # 1080×1920, 30 fps, mindestens 61 s
ffmpeg -i out/<name>/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12                                   # ≈ −14 LUFS, TP ≤ −1 dBTP
```
Abgleich Sprechtext gegen Spracherkennung: jedes Wort richtig ausgesprochen, keine verschluckten Zahlen. Bei einem hörbaren Fehler gilt [[Stimme ElevenLabs Simulierbar]] §5 (Ursache im Text beheben, einmal `--neuaufnahme`). Wegen Länge oder Tempo wird nie neu vertont und der Text nach der Aufnahme nie gekürzt.

**Text-Überlappung** (`qc/text_ueberlappung.mjs`) bei jedem Video: prüft HUD-Texte (Tafel, Chips, Karten, Untertitel), **keine Texturen in der 3D-Szene**.

## 2. Kontaktbogen und Sichtprüfung
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=1,scale=216:384,tile=10x8" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Skript-Bild-Abgleich Segment für Segment** mit `skript.json → bild_text_abgleich`: Ist jedes gesagte Objekt, jede Handlung, Zahl und jeder Ort im selben Moment zu sehen? Stimmen Tafel, Chips und Welt mit der Rechnung überein (z. B. Waage kippt erst, wenn der Zähler vorn ist)?
- [ ] **Skript übernommen:** inhaltlich 1:1 aus dem freigegebenen Skript; alle Abweichungen stehen unter `korrekturen` ([[Skriptaufbau Simulierbar]] §7).
- [ ] **Erlaubter Stil und Qualitätslatte** ([[Stile 17 bis 21]]): genau ein Hauptstil aus 1–15 oder 17–21 (Einschub 13 nur als „Warum?“), und je Kriterium **ja**: (1) sauberes Licht und stimmige Materialien, (2) Tiefe statt Flatness ohne Absicht, (3) lesbare Typografie, (4) konsistente Farben, (5) keine Artefakte (Banding, Flimmern, Z-Fighting, Durchdringungen, abgeschnittene Objekte), (6) nie ein Standbild über 2 s, mindestens eine sichtbare Bildänderung alle 1–2 s.
- [ ] **Stil 18 (Dunkles Studio) pausiert seit 10.11.2026** (Lernschleife, freigegeben): ein Video in Stil 18 = **nein**, Abnahme verweigern und in Stil 19 oder 17 bauen ([[Stile 17 bis 21]]). Die Zusatzlatte darunter gilt erst wieder nach Aufhebung der Pause.
- [ ] **Nur bei Stil 18 (Dunkles Studio), Zusatzlatte** (Inhaber 05.11.): (7) Umgebung oder handelnde Modellfiguren; reine Objekte vor schwarzem Grund = **nein**; (8) je Phase mindestens ein Raum- oder Bildwechsel, am Kontaktbogen belegt. Ein Nein → Abnahme verweigern, belebte Szene bauen oder Stil mit Umgebung wählen.
- [ ] **Billig-Test:** „Würde ein Zuschauer denken, das sieht billig aus?“ Bei „ja“ **Abnahme verweigern**, nachbessern (oder Stil wechseln) und neu rendern.
- [ ] **Spannungskurve:** Effektdichte und Lichtstimmung steigen bis zum Kipp-Moment (ca. 60–65 % der Länge, optischer Höhepunkt) und halten bis zum Ergebnis bei ca. 75–80 %; danach kurzes „Warum?“, Pointe, Schlusskarte, zusammen höchstens 12 s ([[Videoaufbau Simulierbar]] §3).
- [ ] **Aufbau seit 09.11.:** Zähler laufen spätestens ab 3 s, kein Erklärblock; erste Wendung bei 12–15 s; die zweite Frage ist im Bild angedeutet und wird erst in der Pointe aufgelöst.
- [ ] **REA-Standard** ([[REA Simulierbar Regelwerk]]): erstes Bild ohne Ton verständlich (Titelfrage, Startwerte, beim Duell beide Seiten und Vergleichszeichen); Schlüsselwort in der Teamfarbe; Tafel mit laufenden Zählern und Statuszeile; wichtige Zahlen leuchten auf; Führungswechsel sichtbar; mindestens eine Erklärgrafik; Ende auf der Schlusskarte (Fazit oder Pointe), keine offene Frage, kein Aufruf; Erzählhaltung neutral (Du höchstens im Hook).
- [ ] **Variation alle 5 s:** in jedem 5-s-Fenster ein andersartiger Effekt oder Bildtyp als im Fenster davor (Kontaktbogen: nicht zehn ähnliche Kacheln hintereinander).
- [ ] **Kein Leerlauf und nichts Übertriebenes:** keine Phase über 2 s ohne sichtbare Änderung; höchstens ein dominanter Effekt zugleich; Zoom nicht dauerhaft; kein Flackern, keine schnellen Helligkeitswechsel; Glow überstrahlt keinen Text.
- [ ] **Keine Sticker oder Stempel**, keine großen schrägen Plaketten, kein Strahlenkranz; kein `M.stempel`, kein `regie.stoss`.
- [ ] **Licht und Atmosphäre sichtbar** ([[Licht und Atmosphäre Simulierbar]]): klares Führungslicht, Kante/Gegenlicht, sichtbare Luft (Dunst, Kegel, Strahlen oder Staub) und Grading des Stils; keine flachen, grauen oder überstrahlten Bilder; Schwärzen bleiben schwarz.
- [ ] **Die Welt lebt**: alle 1–2 s neue Information aus Welt bzw. Kamera.
- [ ] Bild 0 zeigt die ganze Szene mit der Tafel und allen Startwerten. Die Rückkehr zum ersten Bild am Ende ist freiwillig.
- [ ] Teamfarben überall gleich (Welt, Licht, Tafel, Chips, Untertitel-Schlüsselwort), nirgends Gelb.
- [ ] **Untertitel in Blöcken von 1–4 Wörtern**, weiß mit schwarzer Kontur, Schlüsselwort in der Teamfarbe seiner Seite, mittig, kein Kasten, nicht verdeckt.
- [ ] Mittelachse x = 540, sichere Zonen eingehalten, nichts Wichtiges unter y ≈ 1500 ([[Design und Layout Simulierbar]]).
- [ ] Kein Kanalname, kein Logo, keine Rubrik, keine Quellen, keine echten Marken, keine echten Banknoten- oder Münzmotive.
- [ ] **Keine 1:1-Kopie** eines fremden Videos (Skript, Sätze, Bild- und Szenenideen eigen).
- [ ] Ton: Teppich 8–13 dB unter der Stimme, Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe, Stimme ruhig und ohne hörbaren Fehler ([[Klangteppich und Ton Simulierbar]]).

Ergänzend beim Eingang des Skripts (nicht erst bei der Abnahme): Geld-Ergebnis, Format genannt, Frage zum Tippen, zweite Frage gesetzt, Ausschlussthemen und Finanzregeln ([[Finanzregeln Simulierbar]]), Originalität laut Feld `originalitaet` ([[Themenfindung Simulierbar]]).

## 3. Ablauf bis zum Posten
1. Prüfung 1 und 2 bestanden, Bericht (welche Punkte, welche Messwerte).
2. Planen in Buffer: `python3 post_buffer.py --video … --kanal simulierbar --zeit auto:JJJJ-MM-TT:mittag|abend --text "<Caption>"` (vorher `--trocken`), Erwartung Status `scheduled`, sonst Exit 2 ([[Technik und Szenenbau Simulierbar]]).
3. Der Inhaber kann Posts in Buffer bis zum Zeitpunkt löschen.

## 4. Nach dem Posten
`python3 post_buffer.py --nachpruefen`: Video öffentlich (`privateItem=false`), Länge stimmt; **erst danach** wird die Upload-Datei im Zwischenspeicher gelöscht (Buffer holt sie zur Posting-Zeit). Ergebnis in [[Stand und nächste Schritte]] vermerken. Die Zahlen des Videos (Aufrufe, Likes, Kommentare, Shares, Saves, Ø-Wiedergabezeit, Follower) wertet die Lernschleife aus ([[Lernschleife und Insights]]); dafür muss `skript.json → lern_notizen` ausgefüllt sein ([[Technik und Szenenbau Simulierbar]]).

## Siehe auch
- [[Videoaufbau Simulierbar]] · [[Stile 17 bis 21]] · [[Design und Layout Simulierbar]] · [[Stimme ElevenLabs Simulierbar]] · [[Klangteppich und Ton Simulierbar]]
- [[Technik und Szenenbau Simulierbar]] · [[Plattformregeln und Posting]] · [[Finanzregeln Simulierbar]] · [[Account Simulierbar Überblick]] · [[Lernschleife und Insights]] · Archiv: [[Maßstab Simulierbar]], [[Sperrliste und Auswahlregeln Simulierbar]]
