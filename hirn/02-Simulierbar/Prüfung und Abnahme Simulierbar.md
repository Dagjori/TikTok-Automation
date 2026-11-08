---
typ: anleitung
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/pruefung.md, .claude/skills/simulierbar-video/massstab.md, pipeline/qc/massstab.py, pipeline/qc/massstab_test.py, CLAUDE.md §4, CLAUDE.md §7, CLAUDE.md §11, SKILL.md (Neuregeln 02.11.2026 abends)
tags: [konto/simulierbar, prüfung, abnahme, qc, kontaktbogen, lautheit]
cssclasses: [konto-simulierbar, typ-anleitung]
---

# Prüfung und Abnahme Simulierbar

Ein Video geht nur in Buffer, wenn **alle** Pflichtpunkte erfüllt sind (Prüfliste mit **23 Punkten**, 21–23 neu seit 02.11. abends: [[Maßstab Simulierbar]] Abschnitt 11). Claude prüft jedes Video selbst und plant es ohne Freigabe des Inhabers ein ([[Plattformregeln und Posting]]). **Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion.** Claude misst Ton und Bewegung nur; der Inhaber hört bei Bedarf einmal rein.

## 1. Automatisch
```bash
cd pipeline
python3 qc/massstab.py projekte/<name>                 # Profil „ben“; Exit 0 = alle Pflichtpunkte ja
node qc/text_ueberlappung.mjs projekte/<name>          # Exit 0 = keine Überlappung von Tafel, Chips, Karten, Untertitel
python3 qc/massstab_test.py                            # Tests der Prüfung selbst (nach Änderungen an qc/massstab.py)
```
`qc/massstab.py` prüft u. a.:
- Stimme < 0,2 s (1), Hook vor 5 s (2), Denkfalle vor 16 s (3), kein „Los geht's“ (3b);
- längste Phase ohne Bild-Ereignis ≤ 2 s (5);
- **keine Sticker/Stempel (5d = 0, Pflicht)**; Chips ≤ 15 (5e, Hinweis);
- Folgen-Aufruf 15–25 s und ≤ 2 s (7); Schlusssatz exakt (10) – **beides seit 07.11.2026 keine Regel mehr** (Aufruf nur in Testvideos, fester Schlusssatz entfällt); `massstab.py` ist angepasst: 7 ist Hinweis, 10 prüft die Schlusskarte;
- **Wörter 150–190 (12a), Tempo 2,2–2,5 W/s (12b)**, Satzlängen (12c), Satzpause auf den Wortzeiten max. 0,8 s (12d, Pflicht), **hörbare Satzpause Median 0,35–0,6 s (12d2, Hinweis, aus `audio/stimme.mp3` mit ffmpeg `silencedetect`)** und Länge 65–80 s (12f);
- Untertitel „kontur“ (14); kein Kanalname/Logo/Rubrik (15); Tonfall (16a aufgeregte Tags, 16b Ausrufezeichen);
- **Stil erlaubt: 1–15 oder 17–21 (18b, Pflicht bei `"skill": "video-produktion"` (bzw. alt `"simulierbar-video"`) oder Szene mit `sim_atmosphaere.js`; Stil 16 und Module von Account 2 (`stil_lunar_pov.js`, `lunar_hud.js`, `welt_grossstadt_dach.js`) sind in einer Simulierbar-Szene nicht erlaubt; die Qualitätslatte prüft Claude von Hand)**;
- Schleife (11), Klangteppich (13a), Akzent (13b), „Warum?“ (8), Erste Wendung (6), Uhr/Zähler ab Rennstart (4).
- **Seit 08.11.2026:** **7 Folgen-Hinweis** (Pflicht): im Testblock `folgen_hinweis` = „mit“ eine nicht gesprochene Textzeile (`M.hinweis`) in den letzten 2–3 s, höchstens 10 Wörter, ohne Druck, Tausch oder Belohnung; bei „ohne“ bzw. ohne Testblock keiner; `M.folgen` ist immer NEIN ([[Regelwerk Simulierbar]]). Cover = Bild bei 1,0 s (`<video>_cover.jpg` nach `post_buffer.py` ansehen).
- **Seit 07.11.2026 (REA-Regelwerk, Skill `video-produktion`):** 7 Folgen-Aufruf nur noch Hinweis (Testvideo, seit 08.11. ersetzt, siehe oben) · **10 Schlusskarte** (`M.pointe` in den letzten 8 s, letzter Satz ohne Frage und Aufruf, Pflicht) · 11 Schleife freiwillig · **12b Tempo 2,3–2,7 W/s ODER 4,6–5,4 Silben/s** · **12c Sätze Median 3–5** · **14 Untertitel-Blöcke ≤ 4 Wörter** (Stil „phrase“) · **R1 Titel ab Bild 1** · **R2 Tafel ab Bild 0** · **R3 Erklärgrafik** (Balken, Formel, Bilanz) · **R4 Du nur im Hook** · **R5 Endstand bei 75–86 % der Länge** (alle Pflicht) · R6 Kipp-Moment 55–72 % und R7 erster Satz ≤ 4 Wörter (Hinweis). Altes Profil zum Nachmessen: `--profil ben_0211`.

Liest `skript.json`, `audio/timing.json` (sonst `timing_schaetzung.json`, dann als „geschätzt“ markiert), `audio/ereignisse.json` (schreibt `render.js` aus dem Ereignis-Protokoll der Bausteine) und `szene.js`. Weitere Aufrufe: `--profil massstab` (Zielbereiche der Vorbilder, 2,5–2,9 W/s usw.), `--profil ben_alt` (bisheriges Ben-Profil 130–170 Wörter, 1,9–2,4 W/s; **veraltet seit 02.11. abends**, nur um ältere Videos nachzumessen), `--ziel tempo=2.0:2.5 --ziel woerter=140:180 --ziel satzpause_max=0.7`, `--json`.

### Pflicht oder Hinweis im Code (Stand 02.11., aus `pipeline/qc/massstab.py`)
| Art | Code-Punkte |
|---|---|
| **Pflicht** (Exit 1 bei „nein“; Stand 07.11.2026) | 1 · 2 · 3b · 5 · 5d · 10 · 12a · 12b · 12c · 12d · 12f · 14 · 15 · 16a · 18b (18b nur nach Skill) · R1 · R2 · R3 · R4 · R5 |
| **Hinweis** (zählt nicht für den Exit-Code) | 3 · 4 · 5b · 5c · 5e · 6 · 7 · 8 · 11 · 12d2 · 12e · 12g · 13a · 13b · 16b · R6 · R7 |

Profil `ben` (Standard, **seit 02.11.2026 abends**): Tempo 2,2–2,5 W/s (Ziel ca. 2,3), Satzpause max. 0,8 s (Wortzeiten) und Median hörbar 0,35–0,6 s (Hinweis), 150–190 Wörter, Länge 65–80 s, Satzlänge-Median 4–8. Vorher: 1,9–2,4 W/s und 130–170 Wörter (jetzt Profil `ben_alt`). Beispiel (F, 02.11.): „Steuererklärung oder Überstunden“ hat 144 Wörter bei 2,15 W/s (neues Profil: 12a und 12b „nein“, altes Profil „ja“), „Fußgängerampel“ 156 Wörter bei 2,38 W/s (beide Profile „ja“). **Folge:** Die Prüfliste verlangt alle 20 Punkte; das Skript erzwingt nur die Pflichtpunkte. Hinweis-Punkte (Denkfalle, Uhr/Zähler, erste Wendung, „Warum?“, Schleife, Klangteppich, Akzent) müssen trotzdem von Hand erfüllt und im Bericht bestätigt werden.

### Nummerierung (Hinweis)
Die Code-Punkte (z. B. 16a, 5d, 18b) folgen nicht 1:1 der Prüfliste (z. B. Liste 16 = Teamfarben, Liste 18 = Sticker, Liste 19 = Tonfall). Zuordnung: Liste 18 ↔ Code 5d; Liste 19 ↔ Code 3b, 16a, 16b; Liste 14/15 ↔ Code 14/15; Liste 12 ↔ Code 12a–12d2, 12f. Ohne Code-Punkt (Handprüfung am Kontaktbogen bzw. vor der Produktion): Liste 9 (zweite Überraschung), 16 (Teamfarben), 17 (keine 1:1-Kopie; früher Konkurrenz-Check), 20 (Skript-Bild-Abgleich und Themen-Logik), **21 (Spannungskurve und Variation), 22 (Qualitätslatte), 23 (Skript-Qualität)**, siehe Abschnitt 2. Der Stil-Check 18b ergänzt die Liste.

### Zusätzliche Messungen
```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 out/<name>/<name>.mp4     # 1080×1920, 30 fps, 65–80 s
ffmpeg -i out/<name>/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12                                   # ≈ −14 LUFS, TP ≤ −1 dBTP
```
Abgleich Sprechtext gegen Spracherkennung (ElevenLabs Speech-to-Text): jedes Wort richtig ausgesprochen, keine verschluckten Zahlen ([[Stimme und Ton Simulierbar]]). Klingt eine Stelle gehetzt, wird der Text gekürzt und neu vertont, nicht die Stimme beschleunigt.

**Text-Überlappung** (`qc/text_ueberlappung.mjs`) bei jedem Video: prüft HUD-Texte (Tafel, Chips, Karten, Untertitel), **keine Texturen in der 3D-Szene** (offener Punkt, Stand 02.11.).

## 2. Kontaktbogen und Sichtprüfung (Claude selbst)
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=1,scale=216:384,tile=10x8" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Skript-Bild-Abgleich Segment für Segment** mit `skript.json → bild_text_abgleich`: Ist jedes gesagte Objekt, jede Handlung, Zahl und jeder Ort im selben Moment zu sehen? Stimmen Tafel, Chips und Welt mit der Rechnung überein (z. B. Waage kippt erst, wenn der Zähler vorn ist)?
- [ ] **Skript übernommen:** inhaltlich 1:1 aus dem Skript des Ideen-Studios; alle Abweichungen (Zahlen, Annahmen, geänderte Aussagen) sind gemeldet und freigegeben ([[Videoaufbau Simulierbar]] Abschnitt 5.2).
- [ ] **Erlaubter Stil und Qualitätslatte** ([[Stile 17 bis 21]]): genau ein Hauptstil aus 1–15 oder 17–21 (Einschub 13 nur als „Warum?“), und je Kriterium **ja**: (1) sauberes Licht und stimmige Materialien, (2) Tiefe statt Flatness ohne Absicht, (3) lesbare Typografie, (4) konsistente Farben, (5) keine Artefakte (Banding, Flimmern, Z-Fighting, Durchdringungen, abgeschnittene Objekte), (6) nie ein Standbild über 2 s, mindestens eine sichtbare Bildänderung alle 1–2 s.
- [ ] **Nur bei Stil 18 (Dunkles Studio), Zusatzlatte** (Inhaber 05.11., [[Stile 17 bis 21]]): (7) Umgebung oder handelnde Modellfiguren (Mini-Raum, Figuren, die Geld einzahlen/abheben); reine Objekte vor schwarzem Grund = **nein**; (8) je Phase mindestens ein Raum- oder Bildwechsel, am Kontaktbogen belegt. Ein Nein → Abnahme verweigern, belebte Szene bauen oder Stil mit Umgebung wählen.
- [ ] **Billig-Test:** „Würde ein Zuschauer denken, das sieht billig aus?“ Bei „ja“ **Abnahme verweigern**, nachbessern (oder Stil wechseln) und neu rendern.
- [ ] **Spannungskurve** (seit 07.11.): Effektdichte und Lichtstimmung steigen bis zum Kipp-Moment (ca. 45 s, optischer Höhepunkt) und halten bis zum Endstand bei ca. 80 % der Länge; danach kurzes „Warum?“, Pointe, Schlusskarte ([[Videoaufbau Simulierbar]] Abschnitt 6).
- [ ] **REA-Standard** (seit 07.11., [[REA Simulierbar Regelwerk]]): erstes Bild ohne Ton verständlich (beide Seiten, Werte, Vergleichszeichen, Duell-Frage als Titel); Schlüsselwort in der Teamfarbe; Tafel mit laufenden Zählern und Statuszeile; wichtige Zahlen leuchten auf; Führungswechsel sichtbar; mindestens eine Erklärgrafik; Ende auf der Schlusskarte (Fazit oder Pointe), keine offene Frage, kein Aufruf; Erzählhaltung neutral (Du höchstens im Hook).
- [ ] **Variation alle 5 s:** in jedem 5-s-Fenster ein andersartiger Effekt oder Bildtyp als im Fenster davor (Kontaktbogen: nicht zehn ähnliche Kacheln hintereinander).
- [ ] **Kein Leerlauf und nichts Übertriebenes:** keine Phase über 2 s ohne sichtbare Änderung; höchstens ein dominanter Effekt zugleich; Zoom nicht dauerhaft (abwechselnd); kein Flackern, keine schnellen Helligkeitswechsel; Glow überstrahlt keinen Text.
- [ ] **Keine Sticker oder Stempel**, keine großen schrägen Plaketten, kein Strahlenkranz; kein `M.stempel`, kein `regie.stoss`.
- [ ] **Licht und Atmosphäre sichtbar** ([[Licht und Atmosphäre Simulierbar]]): klares Führungslicht, Kante/Gegenlicht, sichtbare Luft (Dunst, Kegel, Strahlen oder Staub) und Grading des Stils; keine flachen, grauen oder überstrahlten Bilder; Schwärzen bleiben schwarz.
- [ ] **Die Welt lebt**: alle 1–2 s neue Information aus Welt bzw. Kamera.
- [ ] Bild 0 zeigt die ganze Szene mit beiden Seiten und der Tafel; letztes Bild = erstes Bild.
- [ ] Teamfarben überall gleich (Welt, Licht, Tafel, Chips, Untertitel-Schlüsselwort), kein Gelb außer dem aktuellen Untertitel-Wort.
- [ ] Untertitel Wort für Wort, weiß mit schwarzer Kontur, aktuelles Wort gelb, mittig, kein Kasten, nicht verdeckt.
- [ ] Mittelachse x = 540, sichere Zonen eingehalten, nichts Wichtiges unter y ≈ 1500 ([[Design und Layout Simulierbar]]).
- [ ] Kein Kanalname, kein Logo, keine Rubrik, keine Quellen, keine echten Marken, keine echten Banknoten-/Münzmotive.
- [ ] **Keine 1:1-Kopie** eines fremden Videos (Skript, Sätze, Bild- und Szenenideen eigen).
- [ ] Ton: Teppich 8–13 dB unter der Stimme, Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe, Stimme ruhig, Tempo flüssig und natürlich (nicht gehetzt).

Ergänzend beim Eingang des Skripts (nicht erst bei der Abnahme): Themen-Logik (echte Alternativen derselben Entscheidung), GELD-Ergebnis, Ausschlussthemen ([[Auswahl- und Finanzregeln Simulierbar]]); die frühere Sperrliste ist Archiv ([[Sperrliste und Auswahlregeln Simulierbar]]).

## 3. Ablauf bis zum Posten
1. Prüfung 1 und 2 bestanden, Bericht (welche Punkte, welche Messwerte).
2. Planen in Buffer: `python3 post_buffer.py --video … --kanal simulierbar --zeit auto:JJJJ-MM-TT:mittag|abend --text "<Caption>"` (vorher `--trocken`), Erwartung Status `scheduled`, sonst Exit 2; kein KI-Label ([[Technik und Szenenbau Simulierbar]]).
3. Der Inhaber kann Posts in Buffer bis zum Zeitpunkt löschen.

## 4. Nach dem Posten
`python3 post_buffer.py --nachpruefen`: Video öffentlich (`privateItem=false`), Länge stimmt, KI-Label wie gesetzt; **erst danach** wird die Upload-Datei im Zwischenspeicher gelöscht (Buffer holt sie zur Posting-Zeit). Ergebnis im Stand vermerken (Stand-Notiz im Ordner 01-Projekt; Original: `CLAUDE.md` §11). Die Zahlen des Videos (Aufrufe, Likes, Kommentare, Shares, Saves, Ø-Wiedergabezeit, Follower) wertet die Lernschleife aus ([[Lernschleife und Insights]]); dafür muss `skript.json → lern_notizen` ausgefüllt sein ([[Technik und Szenenbau Simulierbar]]).

## Siehe auch
- [[Maßstab Simulierbar]] (Prüfliste, Messwerte) · [[Videoaufbau Simulierbar]] · [[Stile 17 bis 21]] · [[Design und Layout Simulierbar]] · [[Stimme und Ton Simulierbar]]
- [[Technik und Szenenbau Simulierbar]] · [[Plattformregeln und Posting]] · [[Auswahl- und Finanzregeln Simulierbar]] · [[Sperrliste und Auswahlregeln Simulierbar]] (Archiv) · [[Account Simulierbar Überblick]] · [[Lernschleife und Insights]]
