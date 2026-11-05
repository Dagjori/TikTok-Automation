# Prüfung vor dem Posten (Abnahme)

Ein Video geht nur in Buffer, wenn **alle** Pflichtpunkte erfüllt sind (Prüfliste [massstab.md](massstab.md) §11, 23 Punkte). Fertige Videos bleiben, wie sie sind; neue Regeln gelten ab der nächsten Produktion. Stand der Regeln: Neuregeln des Inhabers 02.11.2026 abends (SKILL.md).

## 1. Automatisch
```bash
cd pipeline
python3 qc/massstab.py projekte/<name>                 # Profil „ben“; Exit 0 = alle Pflichtpunkte ja
node qc/text_ueberlappung.mjs projekte/<name>          # Exit 0 = keine Überlappung von Tafel, Chips, Karten, Untertitel
python3 qc/massstab_test.py                            # Tests der Prüfung selbst (nach Änderungen an qc/massstab.py)
```
`qc/massstab.py` prüft u. a.: Stimme < 0,2 s, Hook vor 5 s, Denkfalle vor 16 s, kein „Los geht's“, längste Phase ohne Bild-Ereignis ≤ 2 s (5), **keine Sticker/Stempel (5d = 0, Pflicht)**, Chips ≤ 15 (5e, Hinweis), Folgen-Aufruf 15–25 s ≤ 2 s, Schlusssatz exakt, **Wörter 150–190 (12a), Tempo 2,2–2,5 W/s (12b), Satzpause auf den Wortzeiten höchstens 0,8 s (12d, Pflicht), hörbare Satzpause Median 0,35–0,6 s (12d2, Hinweis, aus `audio/stimme.mp3` mit ffmpeg `silencedetect`)**, 65–80 s, Untertitel „kontur“ (14), kein Kanalname/Logo/Rubrik (15), Tonfall (16a/16b), **Stil erlaubt: 1–15 oder 17–21 (18b, Pflicht bei `"skill": "simulierbar-video"` oder Szene mit `sim_atmosphaere.js`; Stil 16 und Module von Account 2 sind in einer Simulierbar-Szene nicht erlaubt)**, Schleife, Klangteppich, Akzent.

**Nicht automatisch prüfbar** (Handprüfung, Abschnitt 2): Qualitätslatte, Spannungskurve, Variation, „sieht das billig aus?“, Skript-Bild-Abgleich, Teamfarben, Skript-Qualität (Belege, Clickbait). Das Profil `ben_alt` (130–170 Wörter, 1,9–2,4 W/s) gibt es nur, um ältere Videos nachzumessen (veraltet seit 02.11.2026 abends).

Zusätzlich:
```bash
ffprobe -v error -show_entries stream=width,height,r_frame_rate:format=duration -of csv=p=0 out/<name>/<name>.mp4     # 1080×1920, 30 fps, 65–80 s
ffmpeg -i out/<name>/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12                                   # ≈ −14 LUFS, TP ≤ −1 dBTP
```
Abgleich Sprechtext gegen Spracherkennung (ElevenLabs Speech-to-Text): jedes Wort richtig ausgesprochen, keine verschluckten Zahlen. Klingt eine Stelle gehetzt, wird der Text gekürzt und neu vertont, nicht die Stimme beschleunigt.

## 2. Kontaktbogen und Sichtprüfung (Claude selbst)
```bash
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=1,scale=216:384,tile=10x8" -frames:v 1 out/<name>/kontaktbogen.png
```
Prüfen und im Bericht festhalten:
- [ ] **Skript-Bild-Abgleich Segment für Segment** mit `skript.json → bild_text_abgleich`: Ist jedes gesagte Objekt, jede Handlung, Zahl und jeder Ort im selben Moment zu sehen? Stimmen Tafel, Chips und Welt mit der Rechnung überein (z. B. Waage kippt erst, wenn der Zähler vorn ist)?
- [ ] **Skript übernommen:** inhaltlich 1:1 aus dem Skript des Ideen-Studios; alle Korrekturen (Zahlen, Annahmen, geänderte Aussagen) stehen mit Quelle in `korrekturen`; bei gekipptem Ergebnis liegt die Zustimmung des Inhabers vor ([ablauf.md](ablauf.md) §5.2).
- [ ] **Erlaubter Stil und Qualitätslatte** ([stile.md](stile.md)): genau ein Hauptstil aus 1–15 oder 17–21 (Einschub 13 nur als „Warum?“), und je Kriterium **ja**: (1) sauberes Licht und stimmige Materialien, (2) Tiefe statt Flatness ohne Absicht, (3) lesbare Typografie, (4) konsistente Farben, (5) keine Artefakte (Banding, Flimmern, Z-Fighting, Durchdringungen, abgeschnittene Objekte), (6) nie ein Standbild über 2 s, mindestens eine sichtbare Bildänderung alle 1–2 s.
- [ ] **Nur bei Stil 18 (Dunkles Studio), Zusatzlatte** (Inhaber 05.11., [stile.md](stile.md) Hinweise 18): (7) die Szene hat eine Umgebung oder handelnde Modellfiguren (Mini-Raum, Figuren, die Geld einzahlen/abheben); reine Objekte (Münztürme, Drehteller, Waage) vor schwarzem Grund = **nein**; (8) je Phase (Hook, Regeln, Rennen, Wendungen, Ergebnis, Warum) mindestens ein Raum- oder Bildwechsel, am Kontaktbogen belegt. Ein Nein → Abnahme verweigern, belebte Szene bauen oder Stil mit Umgebung wählen (17, 19 oder andere).
- [ ] **Billig-Test:** „Würde ein Zuschauer denken, das sieht billig aus?“ Bei „ja“ **Abnahme verweigern**, nachbessern (oder Stil wechseln) und neu rendern.
- [ ] **Spannungskurve:** Effektdichte und Lichtstimmung steigen bis zum Ergebnis; das Ergebnis ist der optische Höhepunkt; danach ruhigeres „Warum?“, letzter Dreh, Schleife ([ablauf.md](ablauf.md) §6.2).
- [ ] **Variation alle 5 s:** in jedem 5-s-Fenster ein andersartiger Effekt oder Bildtyp als im Fenster davor (Kontaktbogen: nicht zehn ähnliche Kacheln hintereinander).
- [ ] **Kein Leerlauf und nichts Übertriebenes:** keine Phase über 2 s ohne sichtbare Änderung; höchstens ein dominanter Effekt zugleich; Zoom nicht dauerhaft (abwechselnd); kein Flackern, keine schnellen Helligkeitswechsel; Glow überstrahlt keinen Text.
- [ ] **Keine Sticker oder Stempel**, keine großen schrägen Plaketten, kein Strahlenkranz; kein `M.stempel`, kein `regie.stoss`.
- [ ] **Licht und Atmosphäre sichtbar**: klares Führungslicht, Kante/Gegenlicht, sichtbare Luft (Dunst, Kegel, Strahlen oder Staub) und Grading; keine flachen, grauen oder überstrahlten Bilder; Schwärzen bleiben schwarz.
- [ ] **Die Welt lebt**: alle 1–2 s neue Information aus Welt bzw. Kamera.
- [ ] Bild 0 zeigt die ganze Szene mit beiden Seiten und der Tafel; letztes Bild = erstes Bild.
- [ ] Teamfarben überall gleich (Welt, Licht, Tafel, Chips, Untertitel-Schlüsselwort), kein Gelb außer dem aktuellen Untertitel-Wort.
- [ ] Untertitel Wort für Wort, weiß mit schwarzer Kontur, aktuelles Wort gelb, mittig, kein Kasten, nicht verdeckt.
- [ ] Mittelachse x = 540, sichere Zonen eingehalten, nichts Wichtiges unter y ≈ 1500.
- [ ] Kein Kanalname, kein Logo, keine Rubrik, keine Quellen, keine echten Marken, keine echten Banknoten-/Münzmotive.
- [ ] **Keine 1:1-Kopie** eines fremden Videos (Skript, Sätze, Bild- und Szenenideen eigen).
- [ ] Ton: Teppich 8–13 dB unter der Stimme, Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe, Stimme ruhig, Tempo flüssig und natürlich (nicht gehetzt).

## 3. Nach dem Posten
`python3 post_buffer.py --nachpruefen`: Video öffentlich, Länge stimmt, danach Supabase-Datei gelöscht. Ergebnis in `CLAUDE.md` §11 vermerken. Die Zahlen des Videos (Aufrufe, Likes, Kommentare, Shares, Saves, Ø-Wiedergabezeit, Follower) wertet die Lernschleife aus ([[Lernschleife und Insights]]); dafür muss `skript.json → lern_notizen` ausgefüllt sein ([technik.md](technik.md)).
