# Prüfung vor dem Posten (Abnahme)

Ein Video geht nur in Buffer, wenn **alle** Pflichtpunkte erfüllt sind (Prüfliste [massstab.md](massstab.md) §11). Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion.

## 1. Automatisch
```bash
cd pipeline
python3 qc/massstab.py projekte/<name>                 # Profil „ben“; Exit 0 = alle Pflichtpunkte ja
node qc/text_ueberlappung.mjs projekte/<name>          # Exit 0 = keine Überlappung von Tafel, Chips, Karten, Untertitel
```
`qc/massstab.py` prüft u. a.: Stimme < 0,2 s, Hook vor 5 s, Denkfalle vor 16 s, kein „Los geht's“, längste Phase ohne Bild-Ereignis ≤ 2 s (5), **keine Sticker/Stempel (5d = 0, Pflicht)**, Chips ≤ 15 (5e, Hinweis), Folgen-Aufruf 15–25 s ≤ 2 s, Schlusssatz exakt, Wörter/Tempo/Satzpausen (Profil Ben), 65–80 s, Untertitel „kontur“ (14), kein Kanalname/Logo/Rubrik (15), Tonfall (16a/16b), **Stil erlaubt 17–21 (18b, Pflicht bei `"skill": "simulierbar-video"` oder Szene mit `sim_atmosphaere.js`; prüft auch, dass keine alten Stil-Module importiert werden)**, Schleife, Klangteppich, Akzent.

Zusätzlich:
```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 out/<name>/<name>.mp4     # 1080×1920, 30 fps, 65–80 s
ffmpeg -i out/<name>/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12                                   # ≈ −14 LUFS, TP ≤ −1 dBTP
```
Abgleich Sprechtext gegen Spracherkennung (ElevenLabs Speech-to-Text): jedes Wort richtig ausgesprochen, keine verschluckten Zahlen.

## 2. Kontaktbogen und Sichtprüfung (Claude selbst)
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=1,scale=216:384,tile=10x8" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Skript-Bild-Abgleich Segment für Segment** mit `skript.json → bild_text_abgleich`: Ist jedes gesagte Objekt, jede Handlung, Zahl und jeder Ort im selben Moment zu sehen? Stimmen Tafel, Chips und Welt mit der Rechnung überein (z. B. Waage kippt erst, wenn der Zähler vorn ist)?
- [ ] **Nur erlaubter Stil** (17–21, `stile.md`), kein Cartoon-, Clay-, Comic-, Holz-, Filz-, Papier- oder Flat-Look; Blaupause nur als „Warum?“-Einschub.
- [ ] **Keine Sticker oder Stempel**, keine großen schrägen Plaketten, kein Strahlenkranz; kein `M.stempel`, kein `regie.stoss`.
- [ ] **Licht und Atmosphäre sichtbar**: klares Führungslicht, Kante/Gegenlicht, sichtbare Luft (Dunst, Kegel, Strahlen oder Staub) und Grading des Stils; keine flachen, grauen oder überstrahlten Bilder; Schwärzen bleiben schwarz.
- [ ] **Die Welt lebt**: alle 1–2 s neue Information aus Welt bzw. Kamera; keine Standbild-Phase > 2 s.
- [ ] Bild 0 zeigt die ganze Szene mit beiden Seiten und der Tafel; letztes Bild = erstes Bild.
- [ ] Teamfarben überall gleich (Welt, Licht, Tafel, Chips, Untertitel-Schlüsselwort), kein Gelb außer dem aktuellen Untertitel-Wort.
- [ ] Untertitel Wort für Wort, weiß mit schwarzer Kontur, aktuelles Wort gelb, mittig, kein Kasten, nicht verdeckt.
- [ ] Mittelachse x = 540, sichere Zonen eingehalten, nichts Wichtiges unter y ≈ 1500.
- [ ] Kein Kanalname, kein Logo, keine Rubrik, keine Quellen, keine echten Marken, keine echten Banknoten-/Münzmotive.
- [ ] Ton: Teppich 8–13 dB unter der Stimme, Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe, Stimme ruhig.

## 3. Nach dem Posten
`python3 post_buffer.py --nachpruefen`: Video öffentlich, Länge stimmt, danach Supabase-Datei gelöscht. Ergebnis in `CLAUDE.md` §11 vermerken.
