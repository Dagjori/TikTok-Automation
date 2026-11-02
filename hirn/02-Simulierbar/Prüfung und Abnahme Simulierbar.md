---
typ: anleitung
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/pruefung.md, .claude/skills/simulierbar-video/massstab.md, pipeline/qc/massstab.py, CLAUDE.md §4, CLAUDE.md §7, CLAUDE.md §11
tags: [konto/simulierbar, prüfung, abnahme, qc, kontaktbogen, lautheit]
---

# Prüfung und Abnahme Simulierbar

Ein Video geht nur in Buffer, wenn **alle** Pflichtpunkte erfüllt sind (Prüfliste mit 20 Punkten: [[Maßstab Simulierbar]] Abschnitt 11). Claude prüft jedes Video selbst und plant es ohne Freigabe des Inhabers ein ([[Plattformregeln und Posting]]). **Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion.** Claude misst Ton und Bewegung nur; der Inhaber hört bei Bedarf einmal rein.

## 1. Automatisch
```bash
cd pipeline
python3 qc/massstab.py projekte/<name>                 # Profil „ben“; Exit 0 = alle Pflichtpunkte ja
node qc/text_ueberlappung.mjs projekte/<name>          # Exit 0 = keine Überlappung von Tafel, Chips, Karten, Untertitel
```
`qc/massstab.py` prüft u. a.:
- Stimme < 0,2 s (1), Hook vor 5 s (2), Denkfalle vor 16 s (3), kein „Los geht's“ (3b);
- längste Phase ohne Bild-Ereignis ≤ 2 s (5);
- **keine Sticker/Stempel (5d = 0, Pflicht)**; Chips ≤ 15 (5e, Hinweis);
- Folgen-Aufruf 15–25 s und ≤ 2 s (7); Schlusssatz exakt (10);
- Wörter, Tempo, Satzpausen, Satzlängen (Profil Ben, 12a–12g) und Länge 65–80 s (12f);
- Untertitel „kontur“ (14); kein Kanalname/Logo/Rubrik (15); Tonfall (16a aufgeregte Tags, 16b Ausrufezeichen);
- **Stil erlaubt 17–21 (18b, Pflicht bei `"skill": "simulierbar-video"` oder Szene mit `sim_atmosphaere.js`; prüft auch, dass keine alten Stil-Module importiert werden)**;
- Schleife (11), Klangteppich (13a), Akzent (13b), „Warum?“ (8), Erste Wendung (6), Uhr/Zähler ab Rennstart (4).

Liest `skript.json`, `audio/timing.json` (sonst `timing_schaetzung.json`, dann als „geschätzt“ markiert), `audio/ereignisse.json` (schreibt `render.js` aus dem Ereignis-Protokoll der Bausteine) und `szene.js`. Weitere Aufrufe: `--profil massstab` (Zielbereiche der Vorbilder, 2,5–2,9 W/s usw.), `--ziel tempo=2.0:2.5 --ziel woerter=140:180 --ziel satzpause_max=0.7`, `--json`.

### Pflicht oder Hinweis im Code (Stand 02.11., aus `pipeline/qc/massstab.py`)
| Art | Code-Punkte |
|---|---|
| **Pflicht** (Exit 1 bei „nein“) | 1 · 2 · 3b · 5 · 5d · 7 · 10 · 12a · 12b · 12c · 12d · 12f · 14 · 15 · 16a · 18b (18b nur nach Skill) |
| **Hinweis** (zählt nicht für den Exit-Code) | 3 · 4 · 5b · 5c · 5e · 6 · 8 · 11 · 12e · 12g · 13a · 13b · 16b |

Profil `ben` (Standard): Tempo 1,9–2,4 W/s, Satzpause max. 0,8 s, 130–170 Wörter, Länge 65–80 s, Satzlänge-Median 4–8. **Folge:** Die Prüfliste verlangt alle 20 Punkte; das Skript erzwingt nur die Pflichtpunkte. Hinweis-Punkte (Denkfalle, Uhr/Zähler, erste Wendung, „Warum?“, Schleife, Klangteppich, Akzent) müssen trotzdem von Hand erfüllt und im Bericht bestätigt werden.

### Nummerierung (Hinweis)
Die Code-Punkte (z. B. 16a, 5d, 18b) folgen nicht 1:1 der Prüfliste (z. B. Liste 16 = Teamfarben, Liste 18 = Sticker, Liste 19 = Tonfall). Zuordnung: Liste 18 ↔ Code 5d; Liste 19 ↔ Code 3b, 16a, 16b; Liste 14/15 ↔ Code 14/15. Ohne Code-Punkt (Handprüfung am Kontaktbogen bzw. vor der Produktion): Liste 9 (zweite Überraschung), 16 (Teamfarben), 17 (Konkurrenz-Check), 20 (Skript-Bild-Abgleich und Themen-Logik, Abschnitt 2). Der Stil-Check 18b ergänzt die Liste.

### Zusätzliche Messungen
```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 out/<name>/<name>.mp4     # 1080×1920, 30 fps, 65–80 s
ffmpeg -i out/<name>/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12                                   # ≈ −14 LUFS, TP ≤ −1 dBTP
```
Abgleich Sprechtext gegen Spracherkennung (ElevenLabs Speech-to-Text): jedes Wort richtig ausgesprochen, keine verschluckten Zahlen ([[Stimme und Ton Simulierbar]]).

**Text-Überlappung** (`qc/text_ueberlappung.mjs`) bei jedem Video: prüft HUD-Texte (Tafel, Chips, Karten, Untertitel), **keine Texturen in der 3D-Szene** (offener Punkt, Stand 02.11.).

## 2. Kontaktbogen und Sichtprüfung (Claude selbst)
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=1,scale=216:384,tile=10x8" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Skript-Bild-Abgleich Segment für Segment** mit `skript.json → bild_text_abgleich`: Ist jedes gesagte Objekt, jede Handlung, Zahl und jeder Ort im selben Moment zu sehen? Stimmen Tafel, Chips und Welt mit der Rechnung überein (z. B. Waage kippt erst, wenn der Zähler vorn ist)?
- [ ] **Nur erlaubter Stil** (17–21, [[Stile 17 bis 21]]), kein Cartoon-, Clay-, Comic-, Holz-, Filz-, Papier- oder Flat-Look; Blaupause nur als „Warum?“-Einschub.
- [ ] **Keine Sticker oder Stempel**, keine großen schrägen Plaketten, kein Strahlenkranz; kein `M.stempel`, kein `regie.stoss`.
- [ ] **Licht und Atmosphäre sichtbar** ([[Licht und Atmosphäre Simulierbar]]): klares Führungslicht, Kante/Gegenlicht, sichtbare Luft (Dunst, Kegel, Strahlen oder Staub) und Grading des Stils; keine flachen, grauen oder überstrahlten Bilder; Schwärzen bleiben schwarz.
- [ ] **Die Welt lebt**: alle 1–2 s neue Information aus Welt bzw. Kamera; keine Standbild-Phase > 2 s.
- [ ] Bild 0 zeigt die ganze Szene mit beiden Seiten und der Tafel; letztes Bild = erstes Bild.
- [ ] Teamfarben überall gleich (Welt, Licht, Tafel, Chips, Untertitel-Schlüsselwort), kein Gelb außer dem aktuellen Untertitel-Wort.
- [ ] Untertitel Wort für Wort, weiß mit schwarzer Kontur, aktuelles Wort gelb, mittig, kein Kasten, nicht verdeckt.
- [ ] Mittelachse x = 540, sichere Zonen eingehalten, nichts Wichtiges unter y ≈ 1500 ([[Design und Layout Simulierbar]]).
- [ ] Kein Kanalname, kein Logo, keine Rubrik, keine Quellen, keine echten Marken, keine echten Banknoten-/Münzmotive.
- [ ] Ton: Teppich 8–13 dB unter der Stimme, Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe, Stimme ruhig.

Ergänzend vor der Produktion (nicht erst bei der Abnahme): Themen-Logik (echte Alternativen derselben Entscheidung) und Konkurrenz-Check ([[Sperrliste und Auswahlregeln Simulierbar]]).

## 3. Ablauf bis zum Posten
1. Prüfung 1 und 2 bestanden, Bericht (welche Punkte, welche Messwerte).
2. Planen in Buffer: `python3 post_buffer.py --video … --kanal simulierbar --zeit auto:JJJJ-MM-TT:mittag|abend --text "<Caption>"` (vorher `--trocken`), Erwartung Status `scheduled`, sonst Exit 2; kein KI-Label ([[Technik und Szenenbau Simulierbar]]).
3. Der Inhaber kann Posts in Buffer bis zum Zeitpunkt löschen.

## 4. Nach dem Posten
`python3 post_buffer.py --nachpruefen`: Video öffentlich (`privateItem=false`), Länge stimmt, KI-Label wie gesetzt; **erst danach** wird die Upload-Datei im Zwischenspeicher gelöscht (Buffer holt sie zur Posting-Zeit). Ergebnis im Stand vermerken (Stand-Notiz im Ordner 01-Projekt; Original: `CLAUDE.md` §11). Offen am 02.11.: Nachprüfung der Posts vom 02.11. (Ampel, Steuer) für Simulierbar.

## Siehe auch
- [[Maßstab Simulierbar]] (Prüfliste, Messwerte) · [[Videoaufbau Simulierbar]] · [[Stile 17 bis 21]] · [[Design und Layout Simulierbar]] · [[Stimme und Ton Simulierbar]]
- [[Technik und Szenenbau Simulierbar]] · [[Plattformregeln und Posting]] · [[Sperrliste und Auswahlregeln Simulierbar]] · [[Account Simulierbar Überblick]]
