# Teil Simulierbar (Account 1 `@simulierbar`)

**Gilt nur für `@simulierbar`.** Nichts hieraus gilt für `@stelldirvor.pov`. Format: gesichtsloses 3D-Simulationsvideo, Deutsch, 65–80 s, Stimme Ben, **nur Thema GELD** (Euro-Ergebnis aus eigener Modellrechnung), als Duell, Zeitverlauf, „Was bleibt“ oder Lernvideo, immer mit Anzeigetafel und laufenden Zählern. Die Länge folgt der Stimme (mindestens 61 s).

## Pflichtlektüre (vor dem Bau, in dieser Reihenfolge)
| Notiz (`hirn/…`) | Wofür |
|---|---|
| `04-Recherche/REA Simulierbar Regelwerk.md` | **die Regeln** (R01–R23), Zielkorridore, Aufbau-Schablone, Entscheidungen vom 07.11. |
| `02-Simulierbar/Regelwerk Simulierbar.md` | alle geltenden Regeln des Accounts auf einen Blick |
| `02-Simulierbar/3-Produktion/Videoaufbau Simulierbar.md` | Dramaturgie und Effekte, Layout, Untertitel (der Skriptteil steht in `1-Skripterstellung/Skriptaufbau Simulierbar.md`) |
| `02-Simulierbar/3-Produktion/Stile 17 bis 21.md` | Stilwahl (dunkle Welten zuerst), Qualitätslatte, Baukästen |
| `02-Simulierbar/3-Produktion/Design und Layout Simulierbar.md` | HUD-Bausteine, Typografie, sichere Zonen |
| `02-Simulierbar/3-Produktion/Licht und Atmosphäre Simulierbar.md` | Licht-Rigs, Luft, Kamera-Regie, Lichtspiele |
| `02-Simulierbar/2-Stimme/Stimme ElevenLabs Simulierbar.md`, `02-Simulierbar/3-Produktion/Klangteppich und Ton Simulierbar.md` | Ben, Regie-Text, Klangteppich, Lautheit |
| `02-Simulierbar/3-Produktion/Technik und Szenenbau Simulierbar.md` | Dateien, `skript.json`, Szenengerüst, Render, Posting |
| `02-Simulierbar/3-Produktion/Prüfung und Abnahme Simulierbar.md` | Prüfbefehle, Kontaktbogen, Sichtprüfung |
| `02-Simulierbar/1-Skripterstellung/Finanzregeln Simulierbar.md` | Eingangsprüfung: Ausschlussthemen, Finanzregeln |
Muster mit allen Bausteinen: `pipeline/projekte/_demo-simulierbar/` (Demo, nicht posten).

## Die Regeln auf einen Blick (Stand 08.11.2026; bei Abweichung gilt das Hirn)
**Pflicht** (Prüfpunkt in `qc/massstab.py` in Klammern):
1. **Hook 0–3 s:** die Frage im ersten Satz, beim Duell beide Seiten konkret, bei den anderen Formaten Start- und Zielwert; höchstens 2 kurze Sätze, Stimme ab < 0,2 s (1, 2); der Zuschauer kann sofort tippen.
2. **Erstes Bild ohne Ton verständlich:** Duell-Frage als **Titel im Bild ab Bild 1** (R1) mit dem **Suchbegriff** (`skript.json → suchbegriff`, seit 08.11.), **Anzeigetafel mit beiden Seiten, Werten und „VS“ ab Bild 0** (R2), ganze Szene mit beiden Seiten von Bild 1 an. **Das Bild bei 1,0 s ist das Cover im Profil** (`post_buffer.py`, seit 08.11.): Titel und Tafel müssen dort voll stehen. Folgeteil: „Teil N“ groß im Titel.
3. **Ablauf (Standard seit 09.11.2026, Skill `themen-skript`, Teil Simulierbar B1):** **Zähler laufen spätestens ab 3 s** · Annahmen als Chips im Bild, während die Zähler laufen (kein Erklärblock) · Denkfalle bis ca. 11 s · **erste Wendung bei 12–15 s**, dann alle 8–10 s (4–5 Wendepunkte) · in einer Wendung wird die **zweite Frage** gesetzt (`skript.json → zweite_frage`) und im Bild sichtbar angedeutet · **Kipp-Moment bei ca. 60–65 %** = Höhepunkt (R6) · **Endstand bei ca. 75–80 % der Länge** (R5: 75–86 %) · kurzes „Warum?“ (höchstens 6 s) · **Pointe löst die zweite Frage auf** · **Schlusskarte** (10). Zwischen Endstand und Ende höchstens 12 s. Die Zeiten folgen der Stimme (`timing.json`), nicht umgekehrt. Formate neben dem Duell: Zeitverlauf, Was bleibt, Lernvideo (Feld `format`); bei ihnen ersetzt die laufende Jahreszahl, die Abzugstreppe bzw. die Modellperson das Rennen, Tafel und Zähler bleiben Pflicht.
4. **Ende:** Schlusskarte mit Fazit oder Pointe in den letzten 2–3 s, **kein fester Schlusssatz, keine Frage, kein Aufruf** (10). **Folgen-Hinweis seit 08.11. nur im Testblock** `folgen_hinweis` = „mit“ (`tools/testblock.py`, 10 Videos mit, 10 ohne): eine **nicht gesprochene Textzeile** unter der Schlusskarte in den letzten 2–3 s (`M.hinweis`), Text aus `skript.json → folgen_hinweis`, an den Inhalt gebunden („Teil 2 ist im Profil“, „Jeden Tag ein Geld-Duell im Profil“), kein Tausch, keine Belohnung, kein Druck (7, Pflicht). Bei „ohne“ und ohne Testblock gar keiner; der alte Aufruf `M.folgen` bei ca. 20 s ist ersetzt. Schleife freiwillig (11).
5. **Sprache:** etwa 150–190 Wörter als Richtwert (12a, nur Hinweis); **keine Tempo-, Silben- oder Pausenvorgaben** (Inhaber 09.11.2026; 12b und 12d entfallen); Video mindestens 61 s (Rewards-Programm), sonst so lang wie die Stimme; **neutrale Erzählhaltung, Du höchstens im Hook** (R4); ruhig, kein „Los geht's“ (3b); Sprechtext im Textformat des Skills `stimme-elevenlabs`.
6. **Untertitel in Blöcken von 1–4 Wörtern**, Schlüsselwort in der Teamfarbe seiner Seite (14).
7. **Mindestens eine Erklärgrafik** (Balken, Formel- oder Bilanzkarte) (R3); laufende Zähler auf der Tafel; wichtige Zahlen leuchten auf (Sichtprüfung).
8. **Bild:** nie über 2 s ohne neues Bild-Ereignis (5), keine Sticker/Stempel (5d), kein Logo/Kanalname (15), genau ein erlaubter Stil 1–15 oder 17–21 (18b), **dunkle Welten mit Leuchtakzenten zuerst**, helle Pastell-/Papier-Stile (1, 2, 6, 10, 14) nur, wenn das Thema sie trägt; Qualitätslatte am Kontaktbogen.
**Richtwerte** (vorläufige REA-Regeln, Hinweis): Führungswechsel, Zustandsfarbe der Zahlen, Statuszeile an der Tafel, mindestens eine Zahl je 10 s, neuer Reiz alle ca. 2,6 s, Licht- und Glow-Effekte, Titeltafel 0–3 s, keine Figuren-Mimik als Reaktionsträger (die Zahlen reagieren).

## Eingangsprüfung (Schritt 1)
GELD und Euro-Ergebnis · Format genannt (Duell: echte Alternativen derselben Entscheidung; sonst Zeitverlauf, Was bleibt oder Lernvideo) · Frage im ersten Satz, zu der man tippen kann · `zweite_frage` gesetzt und in der Pointe aufgelöst · Ausschlussthemen und Finanzregeln (nur Modellrechnung) · keine 1:1-Kopie · **Originalität** laut Feld `originalitaet` (kein deutsches Video zur gleichen Frage; fehlt die Prüfung, kurz nachsuchen, bei Fund Status `rueckfrage`; Hirn „Originalität und Themenfindung“) · Wörter 150–190 · Phasen vorhanden (`hook`, `regeln`, `falle`, `rennen`, `wendung1…`, `kipp`, `ergebnis`, `warum`, `pointe`, `schlusskarte`) · Du nur im Hook · kein Schlusssatz mit Frage oder Aufruf. Fehlt etwas Formales (Phasen-ID, Schlusskarte aus Fazit bzw. Pointe), ergänze es und vermerke es unter `korrekturen`; inhaltliche Änderungen nur nach §2.1 des Skills.

## Bauen
- **Stil und Teamfarben** aus dem Skript ableiten (Stilwahl in „Stile 17 bis 21“), Begründung in `stil_begruendung`; zwei feste Teamfarben, nie Gelb. Dann das **Beat-Blatt** (`bild_text_abgleich`): je Segment Effekt, Kamera, Licht; Spannung steigt bis zum Kipp-Moment und hält bis zum Endstand.
- **`skript.json`:** `"skill": "video-produktion"`, `"konto": "simulierbar"`, `"stil": "<Nr> <Name>"`, `stil_begruendung`, `teamfarben`, `klangteppich`, `segmente` mit den **Phasen-IDs oben** (R5/R6 finden `ergebnis` und `kipp` darüber), `text` (Untertitel) und `sprechtext` (Regie-Text), `bild_text_abgleich`, `caption`, `quellen`/`annahmen` nur intern, `skript_quelle`, `korrekturen`.
- **Stimme:** Skill `stimme-elevenlabs` (Textformat, kostenlose Textprüfung `qc/stimme_vorab.py` bis „BEREIT“, genau **eine** Aufnahme mit `tts.py` → `audio/stimme.mp3` + `audio/timing.json`). Danach `python3 qc/massstab.py projekte/<name>`. **Die Szene wird auf die fertige Stimme gebaut:** jede Einblendung, jeder Zähler und jede Wendung hängt an Wort- bzw. Segmentzeiten aus `timing.json`, die Videolänge ist Stimmdauer plus Ausklang. Nie die Stimme beschleunigen, dehnen oder wegen Länge oder Tempo neu vertonen.
- **HUD-Bausteine** (`engine/massstab.js`, Look `engine/sim_hud.css`):
  - Titel ab Bild 1: `M.titel({ woerter: [{ text: "MIETEN", ein: 0, team: "a" }, { text: "vs", art: "vs", ein: 0 }, { text: "KAUFEN", ein: 0, team: "b" }] })`, ausblenden mit `aus`, sobald die Tafel trägt.
  - Tafel ab Bild 0: `M.tafel({ … })` **ohne** `ein` (meldet sich dann still bei t = 0), mit „VS“-Kreis, Uhr bzw. Jahr und `vorn` für die führende Seite.
  - Untertitel: `M.untertitel({ max: 4, unten: 1450, groesse: 64 })` (Blöcke; Schlüsselwörter über `teams.*.woerter` bzw. `schluessel`). Nicht mehr `stil: "kontur"`.
  - Erklärgrafik: `M.balken({ titel: "Warum?", faktoren: [… max. 2] })`, `M.formel` oder `M.bilanz`.
  - Schlusskarte: `M.pointe({ text: "ZEIT *SCHLÄGT* ZINS.", ein: "<erstes Wort der Schlusskarte>" })` in den letzten 2–3 s, bleibt bis zum Ende; `*Wort*` = Schlüsselwort in Akzentfarbe.
  - Folgen-Hinweis nur im Testblock „mit“: `M.hinweis({ text: skript.folgen_hinweis })` (Standard: letzte 2,5 s, y ≈ 1190, unter der Schlusskarte, nicht gesprochen). Kein `M.folgen` (seit 08.11. ersetzt, Prüfpunkt 7 = NEIN), kein `M.stempel`, `M.schleife` nur, wenn gewollt.
  - Statuszeile (Richtwert): ein eigener Baustein fehlt noch; bis dahin kurz als Chip unter der Tafel (`M.chips`, y ≈ 300) oder über das Etikett der Leiste (`M.leiste({ label })`).
- **Szene:** Gerüst aus der Technik-Notiz, Welt im Stil-Baukasten, Licht und Atmosphäre, Kamera-Regie (`engine/regie.js`), Effekte nach dem Beat-Blatt (Variation alle 5 s, höchstens ein dominanter Effekt zugleich, keine schnellen Helligkeitswechsel).
- **Standbilder** an Hook (Bild 0 und 2 s), Regeln, Wendung 1, Kipp-Moment, Endstand, „Warum?“, Schlusskarte.

## Prüfung (Schritt 9)
```bash
python3 qc/massstab.py projekte/<name>            # alle Pflichtpunkte „ja“, jeder Hinweis erklärt (Exit 0)
node qc/text_ueberlappung.mjs projekte/<name>     # Exit 0 = keine Überlappung von Tafel, Chips, Karten, Untertitel
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=1,scale=216:384,tile=10x8" -frames:v 1 out/<name>/kontaktbogen.png
ffmpeg -i out/<name>/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | tail -12   # ≈ −14 LUFS, True Peak ≤ −1 dBTP
```
Dazu die Sichtprüfung aus „Prüfung und Abnahme Simulierbar“ §2 (Skript-Bild-Abgleich Segment für Segment, Qualitätslatte, Billig-Test, Spannungskurve bis zum Kipp-Moment, Variation alle 5 s, **REA-Standard**) und der Abgleich Sprechtext gegen Spracherkennung (jedes Wort richtig, keine verschluckten Zahlen).

## `lern_notizen` (Schritt 10)
Thema und Frage, Länge, Hook-Formulierung und -typ, Stil und Helligkeit (`"hell"` oder `"dunkel"`, für den Test der Lernschleife), Animationen, Licht und Effekte mit Zeitpunkt, Zoom ja/nein, Zeitpunkte (`wendung_1`, `kipp`, `ergebnis`, `warum`, `pointe`, `schlusskarte`, ggf. `folgen_hinweis` mit Text), `testbloecke`, `teil` (Folgeteil), Suchbegriff, `format`, `zweite_frage` (gesetzt bei … s, aufgelöst bei … s), Wörter, Stimmdauer, Auffälligkeiten der Stimme (Segment und Wortlaut), Caption. Zeiten aus `audio/timing.json` und `audio/ereignisse.json`, nie geschätzt.
