# Teil Simulierbar (Account 1 `@simulierbar`)

**Gilt nur für `@simulierbar`.** Nichts hieraus gilt für `@stelldirvor.pov`. Format: gesichtsloses 3D-Simulationsvideo, Deutsch, 65–80 s, Stimme Ben, **nur Thema GELD** (Euro-Ergebnis aus eigener Modellrechnung), meist ein Duell zweier echter Alternativen derselben Entscheidung mit Anzeigetafel und laufenden Zählern.

## Pflichtlektüre (vor dem Bau, in dieser Reihenfolge)
| Notiz (`hirn/…`) | Wofür |
|---|---|
| `04-Recherche/REA Simulierbar Regelwerk.md` | **die Regeln** (R01–R23), Zielkorridore, Aufbau-Schablone, Entscheidungen vom 07.11. |
| `02-Simulierbar/Regelwerk Simulierbar.md` | alle geltenden Regeln des Accounts auf einen Blick |
| `02-Simulierbar/Videoaufbau Simulierbar.md` | Zeitplan der Phasen, Wörter-Budget, Satzmuster, Dramaturgie und Effekte (§6) |
| `02-Simulierbar/Stile 17 bis 21.md` | Stilwahl (dunkle Welten zuerst), Qualitätslatte, Baukästen |
| `02-Simulierbar/Design und Layout Simulierbar.md` | HUD-Bausteine, Typografie, sichere Zonen |
| `02-Simulierbar/Licht und Atmosphäre Simulierbar.md` | Licht-Rigs, Luft, Kamera-Regie, Lichtspiele |
| `02-Simulierbar/Stimme und Ton Simulierbar.md` | Ben, Regie-Text, Klangteppich, Lautheit |
| `02-Simulierbar/Technik und Szenenbau Simulierbar.md` | Dateien, `skript.json`, Szenengerüst, Render, Posting |
| `02-Simulierbar/Prüfung und Abnahme Simulierbar.md` | Prüfbefehle, Kontaktbogen, Sichtprüfung |
| `02-Simulierbar/Auswahl- und Finanzregeln Simulierbar.md` | Eingangsprüfung: Ausschlussthemen, Finanzregeln |
Muster mit allen Bausteinen: `pipeline/projekte/_demo-simulierbar/` (Demo, nicht posten).

## Die Regeln auf einen Blick (Stand 07.11.2026; bei Abweichung gilt das Hirn)
**Pflicht** (Prüfpunkt in `qc/massstab.py` in Klammern):
1. **Hook 0–5 s:** Duell im ersten Satz, beide Seiten konkret, höchstens 2 kurze Sätze, Stimme ab < 0,2 s (1, 2); erster Satz 3–4 Wörter (R7, Richtwert).
2. **Erstes Bild ohne Ton verständlich:** Duell-Frage als **Titel im Bild ab Bild 1** (R1), **Anzeigetafel mit beiden Seiten, Werten und „VS“ ab Bild 0** (R2), ganze Szene mit beiden Seiten von Bild 1 an.
3. **Ablauf:** Regeln knapp als Chips · Denkfalle „Klar, … Oder?“ bis 16 s · Rennen mit laufenden Zählern · erste Wendung 18–25 s, dann alle 8–10 s (4–5 Wendepunkte, die Führung kippt sichtbar) · **Kipp-Moment bei ca. 45 s** = Höhepunkt (R6) · **Endstand erst bei ca. 80 % der Länge** (R5: 75–86 %) · kurzes „Warum?“ · Pointe · **Schlusskarte** (10).
4. **Ende:** Schlusskarte mit Fazit oder Pointe in den letzten 2–3 s, **kein fester Schlusssatz, keine Frage, kein Aufruf** (10). Folgen-Aufruf nur, wenn der Auftrag es ausdrücklich verlangt (Testvideo der Lernschleife, 7). Schleife freiwillig (11).
5. **Sprache:** 150–190 Wörter (12a), **2,3–2,7 W/s oder 4,6–5,4 Silben/s** (12b), Sätze Median 3–5 Wörter (12c), Satzpause max. 0,8 s (12d), Länge 65–80 s (12f); **neutrale Erzählhaltung, Du höchstens im Hook** (R4); ruhig, keine aufgeregten Tags, kein „Los geht's“ (3b, 16a).
6. **Untertitel in Blöcken von 1–4 Wörtern**, Schlüsselwort in der Teamfarbe seiner Seite (14).
7. **Mindestens eine Erklärgrafik** (Balken, Formel- oder Bilanzkarte) (R3); laufende Zähler auf der Tafel; wichtige Zahlen leuchten auf (Sichtprüfung).
8. **Bild:** nie über 2 s ohne neues Bild-Ereignis (5), keine Sticker/Stempel (5d), kein Logo/Kanalname (15), genau ein erlaubter Stil 1–15 oder 17–21 (18b), **dunkle Welten mit Leuchtakzenten zuerst**, helle Pastell-/Papier-Stile (1, 2, 6, 10, 14) nur, wenn das Thema sie trägt; Qualitätslatte am Kontaktbogen.
**Richtwerte** (vorläufige REA-Regeln, Hinweis): Führungswechsel, Zustandsfarbe der Zahlen, Statuszeile an der Tafel, mindestens eine Zahl je 10 s, neuer Reiz alle ca. 2,6 s, Licht- und Glow-Effekte, Titeltafel 0–3 s, keine Figuren-Mimik als Reaktionsträger (die Zahlen reagieren).

## Eingangsprüfung (Schritt 1)
GELD und Euro-Ergebnis · echte Alternativen derselben Entscheidung · Ausschlussthemen und Finanzregeln (nur Modellrechnung) · keine 1:1-Kopie · **Originalität** laut Feld `originalitaet` (kein deutsches Video zur gleichen Frage; fehlt die Prüfung, kurz nachsuchen, bei Fund Status `rueckfrage`; Hirn „Originalität und Themenfindung“) · Wörter 150–190 · Phasen vorhanden (`hook`, `regeln`, `falle`, `rennen`, `wendung1…`, `kipp`, `ergebnis`, `warum`, `pointe`, `schlusskarte`) · Du nur im Hook · kein Schlusssatz mit Frage oder Aufruf. Fehlt etwas Formales (Phasen-ID, Schlusskarte aus Fazit bzw. Pointe), ergänze es und vermerke es unter `korrekturen`; inhaltliche Änderungen nur nach §2.1 des Skills.

## Bauen
- **Stil und Teamfarben** aus dem Skript ableiten (Stilwahl in „Stile 17 bis 21“), Begründung in `stil_begruendung`; zwei feste Teamfarben, nie Gelb. Dann das **Beat-Blatt** (`bild_text_abgleich`): je Segment Effekt, Kamera, Licht; Spannung steigt bis zum Kipp-Moment und hält bis zum Endstand.
- **`skript.json`:** `"skill": "video-produktion"`, `"konto": "simulierbar"`, `"stil": "<Nr> <Name>"`, `stil_begruendung`, `teamfarben`, `klangteppich`, `segmente` mit den **Phasen-IDs oben** (R5/R6 finden `ergebnis` und `kipp` darüber), `text` (Untertitel) und `sprechtext` (Regie-Text), `bild_text_abgleich`, `caption`, `quellen`/`annahmen` nur intern, `skript_quelle`, `korrekturen`.
- **Stimme:** `python3 tts.py projekte/<name>` → `audio/stimme.mp3` + `audio/timing.json`; sofort `python3 qc/massstab.py projekte/<name>` und 12a–12d sowie R4 klären. Zu langsam: Text straffen (kürzere Sätze, weniger Füllwörter), nie die Stimme beschleunigen.
- **HUD-Bausteine** (`engine/massstab.js`, Look `engine/sim_hud.css`):
  - Titel ab Bild 1: `M.titel({ woerter: [{ text: "MIETEN", ein: 0, team: "a" }, { text: "vs", art: "vs", ein: 0 }, { text: "KAUFEN", ein: 0, team: "b" }] })`, ausblenden mit `aus`, sobald die Tafel trägt.
  - Tafel ab Bild 0: `M.tafel({ … })` **ohne** `ein` (meldet sich dann still bei t = 0), mit „VS“-Kreis, Uhr bzw. Jahr und `vorn` für die führende Seite.
  - Untertitel: `M.untertitel({ max: 4, unten: 1450, groesse: 64 })` (Blöcke; Schlüsselwörter über `teams.*.woerter` bzw. `schluessel`). Nicht mehr `stil: "kontur"`.
  - Erklärgrafik: `M.balken({ titel: "Warum?", faktoren: [… max. 2] })`, `M.formel` oder `M.bilanz`.
  - Schlusskarte: `M.pointe({ text: "ZEIT *SCHLÄGT* ZINS.", ein: "<erstes Wort der Schlusskarte>" })` in den letzten 2–3 s, bleibt bis zum Ende; `*Wort*` = Schlüsselwort in Akzentfarbe.
  - Kein `M.folgen` (außer im Testvideo), kein `M.stempel`, `M.schleife` nur, wenn gewollt.
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
Thema und Frage, Länge, Hook-Formulierung und -typ, Stil und Helligkeit (`"hell"` oder `"dunkel"`, für den Test der Lernschleife), Animationen, Licht und Effekte mit Zeitpunkt, Zoom ja/nein, Zeitpunkte (`wendung_1`, `kipp`, `ergebnis`, `warum`, `pointe`, `schlusskarte`, ggf. `folgen`), Wörter, W/s und Silben/s (aus `qc/massstab.py`), Caption. Zeiten aus `audio/timing.json` und `audio/ereignisse.json`, nie geschätzt.
