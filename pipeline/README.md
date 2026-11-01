# Render-Pipeline · Simulierbar

Ein Video entsteht aus einer Szene (`projekte/<name>/szene.html` + `szene.js`), die für jede Zeit t deterministisch ein Bild zeichnet (`window.renderAt(t)`). `render.js` fotografiert die Bilder in Headless-Chromium, `mux.sh` macht daraus das MP4 mit Ton.

**Verbindlicher Maßstab:** `docs/15-massstab.md`. Jede neue Szene baut auf den Maßstab-Bausteinen (`engine/massstab.js`, `engine/regie.js`) auf. Die Prüfliste §11 prüft `qc/massstab.py` automatisch. Beispiel mit allen Bausteinen: `projekte/_demo-massstab/`.

## Einmal einrichten

| Was | Linux/Cloud | Windows |
|---|---|---|
| Node.js ≥ 20 | vorhanden | nodejs.org (LTS) |
| Playwright + Chromium | `npm i -g playwright && npx playwright install chromium` | gleich, in PowerShell |
| ffmpeg | `apt install ffmpeg` | `winget install Gyan.FFmpeg` |
| Python 3 + numpy | `pip install numpy` | python.org, dann `pip install numpy` |
| Bash für `mux.sh` | vorhanden | Git for Windows (Git Bash) |
| Schrift Inter / Inter Display | `fonts-inter` | rsms.me/inter installieren (sonst greift `@fontsource/inter` aus `npm install`) |

Danach im Ordner `pipeline/`: `npm install`.

## Ablauf für ein Video

```bash
cd pipeline
# 1. Stimme mit Wortzeiten (ElevenLabs-Key nur als Umgebungsvariable bzw. Netzwerk-Secret)
python3 tts.py projekte/<name>                         # → audio/stimme.mp3 + audio/timing.json
# 2. Prüfbilder (PNG) an einzelnen Zeitpunkten
node render.js projekte/<name> --zeiten 1.5,30,64 --worker 1
# 3. Maßstab prüfen (Timing, Ereignisse, Schlusssatz, Folgen-Aufruf …)
python3 qc/massstab.py projekte/<name>
# 4. Alle Bilder rendern (abbrechbar, mit --nur-fehlende fortsetzen)
node render.js projekte/<name> --worker 2
# 5. MP4 mit Ton (−14 LUFS) bzw. stumme Vorschau
./mux.sh projekte/<name>                               # → out/<name>/<name>.mp4
./mux.sh projekte/<name> --teppich regen --teppich-db -11   # Teppich/Pegel überschreiben (gehen an klang.py)
./mux.sh projekte/<name> --ohne-ton                    # → out/<name>/vorschau_ohne_ton.mp4
```

- Fehlt `audio/timing.json`, schreibt `render.js` eine **Schätzung** (`audio/timing_schaetzung.json`) und die Szene nutzt sie. Standard der Schätzung = gemessene Werte der Stimme Ben (Original-Einstellungen): 2,0 Wörter/s, Satzpause 0,6 s, Kommapause 0,35 s. Ein Skript kann eigene Werte setzen: `"schaetzung": {"wps": 2.6, "satzpause": 0.26}`. Kommt später die echte Stimme, genügt es, Schritt 4 und 5 neu auszuführen: alle Animationen hängen an Wörtern.
- `render.js` schreibt bei jedem Lauf das **Ereignis-Protokoll** nach `projekte/<name>/audio/ereignisse.json` (und `out/<name>/ereignisse.json`). Daraus macht `klang.py` die Effekte und `qc/massstab.py` die Prüfung.
- Optionen von `render.js`: `--von 20 --bis 30` (Ausschnitt), `--worker N`, `--format png`, `--nur-fehlende`, `--bilder 12,13`, `--query "msaa=2&schatten=1024"` (Qualitätsschalter der Szene), `--gpu` (echte Grafikkarte, Windows-PC).
- `mux.sh` braucht die Bilder ab Bild 0 (für eine stumme Vorschau eines Ausschnitts genügt `--ohne-ton`).

## Maßstab-Bausteine (`engine/massstab.js`, Stile `engine/massstab.css`)

Einbinden: in `szene.html` nach `hud.css` zusätzlich `../../engine/massstab.css` laden. In `szene.js` nach `await document.fonts.ready`:

```js
import { HUD } from "../../engine/hud.js";
import { Massstab } from "../../engine/massstab.js";
const hud = new HUD(document.getElementById("hud"));
const M = new Massstab(hud, zp, { teams: {
  a: { name: "RASER",  farbe: "#FF5A4E", woerter: ["Rasen", "Raser*"] },    // Teamfarbe überall gleich
  b: { name: "ROLLER", farbe: "#13B5A6", woerter: ["rollen", "Roller*"] },  // woerter: Untertitel-Schlüsselwörter
} });
```

**Zeitangaben** (`ein`, `aus`, `t` …) sind überall Sekunden **oder Stichwörter aus dem Timing**:
`"Los"` (erster Treffer im ganzen Skript) · `"falle:Oder?"` (nur im Segment „falle“) · `"Los#2"` (zweiter Treffer) · `"Los+0.2"` / `"Los-0.1"` (Versatz in s) · `"Los>"` (Wortende) · `"Milliard*"` (Wortanfang) · `{i: 17}` (Wort Nr. 17) · `12.5`.
Achtung: Stichwörter werden ohne Satzzeichen und Groß/Klein verglichen („Oder?“ findet auch „oder“ im Hook). Bei Mehrdeutigkeit Segment oder `#n` angeben. Ein unbekanntes Stichwort bricht mit Fehlermeldung ab.

| Baustein | Aufruf (Beispiel) | Wirkung |
|---|---|---|
| Titel im Hook | `M.titel({ y: 372, aus: "Zwei-0.15", woerter: [{text:"RASEN", ein:"Rasen", team:"a"}, {art:"vs", ein:"oder"}, {text:"ROLLEN", ein:"rollen?", team:"b"}, {umbruch:true}, {text:"WER", ein:"Wer", art:"klein"}] })` | Wörter steigen im Takt der Stimme aus einer Maske, passt sich der sicheren Breite an |
| Anzeigetafel oben | `M.tafel({ links:{team:"a", einheit:"km", nk:1, max:2}, rechts:{team:"b", …}, werte: t => ({a, b}), anteil: t => ({a, b}), uhr:{ ein:"Los", zeit: t => sek } })` | zwei Live-Zähler (Rollziffern), Führung färbt die Karte in Teamfarbe + „VORN“, Mitte „VS“, ab `uhr.ein` Renn-Uhr; meldet Führungswechsel |
| Renn-Uhr / Stoppuhr | `M.uhr({ ein:"Los", aus:"Ziel.", x:186, y:352, zeit: t => sek, label:"ZEITRAFFER", team:"b" })` | Zifferblatt mit Zeiger und Sekundenbogen, Digitalanzeige |
| Pausen-/Countdown-Ring | `M.ring({ ein:"Rot!", dauer:0.8, von:40, bis:0, label:"ROT", ende:"GRÜN", team:"#F0443A", punkt: t => ({x, y}) })` | Ring läuft ab, Zahl zählt herunter (Puls je Zahl); `punkt` hängt ihn an einen 3D-Punkt, außerhalb des Bilds blendet er aus |
| Chip | `M.chip({ text:"2 KM", ein:"Zwei", art:"voll"\|"hell"\|"dunkel", team:"akzent", x, y })` | poppt mit Feder genau beim Wort, Puls-Ring |
| Chips in Reihe | `M.chips({ y:404, ausrichtung:"mitte", aus:"Los", liste:[{text:"60 KM/H", ein:"Raser.", team:"a"}, …] })` | setzt mehrere Chips automatisch in Zeilen |
| Sticker / Stempel | `M.stempel({ text:"KLAR!", ein:"Klar,", x:340, y:740, winkel:-8, farbe:"akzent" })`, `art:"stempel"` für den Rahmen-Stempel („ÜBERHOLT!“) | schlägt schräg ein (2,5× → 1 mit Nachfedern), Strahlenkranz dreht sich; Standarddauer 1,1 s |
| Fortschrittsleiste | `M.leiste({ y:1178, ein:"sechs", aus:"Zwölf", label:"2 km · 6 Ampeln", marken:[{anteil:1/7}, …], teams:{ a: t => 0..1, b: t => 0..1 } })` | zwei Bahnen mit Team-Punkten, Marken werden beim Passieren dunkel (Tick-Klang), Zielflagge |
| Live-Zähler schwebend | `M.zaehler({ wert: t => v, einheit:"km/h", team:"a", punkt: t => ({x, y}) })` | Pille mit Rollziffern über einem 3D-Objekt |
| Vergleichs-/Formelkarte | `M.formel({ y:420, titel:"Raser", teile:[{text:"120", einheit:"s", ein:"…", team:"a"}, {text:"+", ein:"…"}, …, {text:"192", einheit:"s", ein:"…", art:"erg"}], unter:{text:"ROLLER: 180 S", ein:"…", team:"b"} })` | Teile poppen einzeln, Operatoren im Kreis, Ergebnis in Akzentfarbe; passt sich der Breite an |
| Bilanzkarte | `M.bilanz({ titel:"Endstand", zeilen:[{label:"ROLLER", wert:183, einheit:"s", team:"b", ein:"Zwölf"}, …], differenz:{label:"VORSPRUNG", wert:12, einheit:"s", ein:"…"}, sieger:{text:"ROLLER GEWINNT", team:"b", ein:"…"} })` | baut sich Zeile für Zeile auf, Werte zählen hoch, Sieger-Banner in Teamfarbe |
| Aufschlüsselung (2 Faktoren) | `M.balken({ titel:"Warum?", faktoren:[{label:"STEHZEIT", ein:"…", a:{wert:72}, b:{wert:0}, tag:"+72 S"}, {label:"FAHRZEIT", …}] })` | je Faktor zwei Balken in Teamfarbe mit Überschwingen, Ergebnis-Etikett |
| Pointe | `M.pointe({ text:"EINE \| *EINZIGE* MINUTE.", ein:"Eine", takt:0.14, y:600, groesse:160 })` | große Typo Wort für Wort, `*…*` = Akzentfarbe, `\|` = Zeilenumbruch, Akzent-Klang |
| Folgen-Aufruf | `M.folgen({ ein: 20.4, dauer: 1.8 })` (Standard y = 950) | Pille „+ Folgen“ mit Pfeil zum Profilbild rechts, Plus wird zum Haken; max. 2 s, gehört zwischen 15 und 25 s |
| Untertitel | `M.untertitel({ unten:1450, groesse:60, schluessel:{"Vorsprung.":"akzent"} })` | **Standard §8:** Phrasen mit 2–5 Wörtern (Satzgrenzen und Kommas respektiert) erscheinen als Block, weiße fette Schrift mit Kontur, kein Kasten, Teamwörter in Teamfarbe; Unterkante bei y = 1450. Alter Stil Wort für Wort: `M.untertitel({ stil: "kontur" })` |
| Eigenes Ereignis | `M.melde({ t:"Aber", typ:"wendung", klang:"whoosh" })` | erscheint im Protokoll (Ton und Prüfung) |
| Schleife | `M.schleife({ ab: t0 })` + `M.wert(fn)` | Werte von Bausteinen, die im ersten Bild stehen (Tafel), gleiten bis zum letzten Bild in den Anfangszustand zurück; eigene Werte (z. B. Positionen in der 3D-Welt) mit `M.wert(fn)` schleifenfest machen |
| Übergabe | `M.veroeffentliche({ zl, regie, teppich: "strasse", schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) })` | setzt `window.dauer`, `window.ereignisse`, `window.klangEreignisse`, `window.klangteppich`, `window.massstab` für `render.js` |

**Demo:** `projekte/_demo-massstab/` (ca. 13 s, „Rasen oder rollen?“, Beispielwerte, geschätztes Timing ohne Stimme) zeigt jeden Baustein, Kamera-Regie, die drei neuen Übergänge und die Schleife. Standbilder: `node render.js projekte/_demo-massstab --zeiten 0,1.5,2.6,4.5,6.45,6.85,8.85,9.95,10.9,11.3,11.94,13.13 --worker 1`, Vorschau: `node render.js projekte/_demo-massstab --worker 1 && ./mux.sh projekte/_demo-massstab` (Ton ohne Stimme: Teppich „strasse“ + Effekte).

Hilfen: `M.kurve([{t:"Los", v:0}, {t:"Rot!", v:34, e: ease.linear}])` (Verlauf mit Wortzeiten), `M.zeit("Los+0.2")`, `Rollzahl` (Zählwerk-Ziffern für eigene Elemente), `SICHER` (sichere Fläche).
Theme: `new Massstab(hud, zp, { teams, akzent, tinte, karte, karteText })` setzt die CSS-Variablen `--team-a`, `--team-b`, `--akzent`, `--tinte`, `--karte`, `--karte-text` auf `#hud`; ein Designstil kann sie überschreiben (z. B. dunkle Karten im Neon-Stil).

## Kamera-Regie (`engine/regie.js`)

```js
const regie = new Regie(kamera, (t) => ({ pos: [x, y, z], ziel: [x, y, z], fov: 38 }), { zp });  // Grundbewegung
regie.folge({ von: "Los", ziel: (t) => [x, 0, 0], glaettung: 0.1 });   // Ziel folgen (Blickwinkel bleibt, weich rein/raus)
regie.zoom({ t: "Rot!", ziel: (t) => [x, y, z], staerke: 0.4, halt: 0.3, rueck: 0.25 });  // auf den Moment zoomen
regie.hinein({ t: "Duschkopf", dauer: 0.9, ziel: [x, y, z] });          // in ein Objekt hineinfahren (danach Übergang)
regie.stoss({ t: "Überholt!+0.1", staerke: 0.9 });                      // Kamerastoß zum Stempel
regie.atmen({ staerke: 0.02 });                                         // leichtes Atmen gegen Standbilder
regie.schleife({ ab: t0, ende: dauer - 1 / 30 });                       // letztes Bild = erstes Bild
regie.anwenden(t);                                                      // in welt.update(t) aufrufen
```

Alle Bausteine sind reine Funktionen von t (auch die Glättung). `schleifenWert(fn, {ab, ende})` (aus `bewegung.js`) macht beliebige Werte schleifenfest.

**Übergänge** (`zl.shot(ab, welt, { typ, dauer, … })`, für `kern.js` und `iso.js`): `blende`, `iris`, `wisch`, `zoom` sowie neu `wolken` (Kamera fliegt durch eine Wolkenwand, `farbe1` hell, `farbe2` Schatten), `blasen` (Blasen steigen auf und geben die neue Szene frei), `zoomwisch` (Zoom-Unschärfe plus Lichtkante mit Bewegungsunschärfe, `richtung`). Jeder Übergang meldet sich im Protokoll mit passendem Klang (Wolke, Blasen, Whoosh). Für `iso.js` zusätzlich `schieben`.

## Ereignis-Protokoll

Jeder Baustein meldet seine Ereignisse: `{t, typ, dauer?, laufend?, klang?, text?, quelle}`. Typen u. a. `titel`, `tafel`, `fuehrung`, `zaehler` (laufend), `uhr` (laufend), `ring`, `chip`, `stempel`, `marke`, `formel`, `bilanz`, `sieger`, `balken`, `pointe`, `folgen`, `uebergang`, `kamera`, `schleife`, `untertitel` (zählt nicht als Bild-Ereignis). Ältere Bausteine aus `hud.js` werden über ihre Klang-Ereignisse eingetragen. `render.js` schreibt alles nach `projekte/<name>/audio/ereignisse.json`.

## Ton (`klang.py`)

- **Klangteppich zum Thema** (schleifenfest, ab Bild 0 da): `regen`, `wasser`, `meer`, `strasse` (= `nacht`, Nachtfahrt), `raum`, `musik` (leiser tonaler Pad), `keiner`. Wahl: `--teppich` > Szene (`teppich` in `veroeffentliche`) > `skript.json` (`"klangteppich"`) > `musik`.
- **Pegel:** Teppich in Sprechpausen 10 dB unter der Stimme (`--teppich-db`, Maßstab 8–13 dB), unter der Stimme ca. 4 dB weiter abgesenkt. Effekte 12 dB unter der Stimme. Ende: −14 LUFS über `mux.sh`.
- **Effekte automatisch je Ereignis:** Pop (Chip, Tafel, Formel), Stempel-Aufprall, Ding (Führungswechsel, Ring-Ende, Differenz), Zähler-Ticken, Uhr-Ticken, Tick (Marke), Wachsen (Balken), Sieg-Arpeggio, Folgen-Pling, Whoosh/Wolke/Blasen (Übergänge), Rückspul-Wisch (Schleife), **Akzent auf der Pointe**. Ein Ereignis kann `klang: "name"` oder `klang: false` mitbringen. Ohne Protokoll (ältere Szenen) gilt wie bisher `window.klangEreignisse`.
- Nur selbst synthetisierte Klänge (numpy, fester Seed), keine fremden Dateien.

## Prüfung (`qc/massstab.py`)

```bash
python3 qc/massstab.py projekte/<name>                     # Profil „ben“ (Standard)
python3 qc/massstab.py projekte/<name> --profil massstab   # Zielwerte der Vorbilder
python3 qc/massstab.py projekte/<name> --ziel tempo=2.0:2.5 --ziel satzpause_max=0.7 --json
```

Prüft und zeigt als Tabelle (Ist · Ziel · Maßstab · ja/nein): Stimme startet < 0,2 s, Hook fertig vor 5 s (max. 2 Sätze), längste Phase ohne Bild-Ereignis ≤ 2 s (mit und ohne laufende Zähler), Folgen-Aufruf zwischen 15 und 25 s (max. 2 s), Schlusssatz exakt „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“, Wörter, Sprechtempo, Satzlängen, Satzpausen, Videolänge 65–80 s, Untertitel-Phrasen ≤ 5 Wörter, kein Kanalname/Logo/Rubrik in `szene.js`; als Hinweise zusätzlich Denkfalle und „Los geht's“ vor 16 s, laufende Uhr/Zähler, erste Wendung, „Warum?“, Schleife (letztes = erstes Bild), Klangteppich, Akzent auf der Pointe.

Tests für Stichwort-Zeiten und Phrasen: `node --test qc/zeitplan.test.mjs`.

**Zielbereiche:** Profil `ben` = Stimme Ben mit Original-Einstellungen (1,9–2,4 W/s, Satzpausen ≤ 0,8 s, 130–170 Wörter, 65–80 s); Profil `massstab` = Vorbilder (2,5–2,9 W/s, ≤ 0,4 s, 170–220 Wörter). Exit-Code 1, wenn ein Pflichtpunkt „nein“ ist.

## Renderzeit

Ohne GPU (SwiftShader) braucht ein Bild je nach Szene 0,8–6 s. 1–2 Worker sind optimal; mehr Worker bremsen sich gegenseitig, weil SwiftShader schon alle Kerne nutzt. Mit Grafikkarte (Windows-PC) `--gpu` anhängen.

Gemessen an der Demo (`_demo-massstab`, 1 Worker, Cloud mit 4 Kernen, **während andere Prozesse liefen, Last 8–10**; ohne Last etwa halb so lang):

| Variante | s/Bild | davon Szene + HUD | Screenshot |
|---|---|---|---|
| Standard (MSAA 4, Schatten 2048, Bloom, HUD, JPG) | 5,2 | 4,8 | 0,45 |
| ohne MSAA (`msaa=0`) | 3,4 | 3,0 | 0,4 |
| ohne Schatten (`schatten=0`) | 3,8 | 3,5 | 0,35 |
| ohne Bloom (`bloom=0`) | 3,9 | 3,5 | 0,4 |
| ohne HUD (`hud=0`) | 3,9 | 3,7 | 0,1 |
| ohne MSAA, Schatten, Bloom | 2,8 | 2,3 | 0,4 |
| während eines Wolken-Übergangs (2 Welten) | 7,3 | 7,0 | 0,25 |
| PNG statt JPG | 4,2 | 3,2 | 1,0 |

Am teuersten: MSAA (≈ 1,7 s), Schattenkarte und Bloom (je ≈ 1,3 s), das HUD-Compositing mit vielen Ebenen (≈ 1 s) und Übergänge, weil dabei zwei Welten gerendert werden (≈ +2 s je Übergangsbild). Für schnelle Vorschauen: `--query "msaa=0&schatten=1024"`.

## Aufbau

```
engine/          wiederverwendbar für alle Videos
  kern.js        Renderer, Nachbearbeitung (Bloom, Tilt-Shift, ACES, Vignette, Körnung, FXAA), Übergänge
  uebergaenge.js GLSL der weichen Übergänge (wolken, blasen, zoomwisch) für kern.js und iso.js
  licht.js       Licht-Presets (Tag mit weichen Schatten, Globus), Umgebungslicht, Verlaufshintergründe
  bewegung.js    Easing, Federn mit Überschwingen, deterministischer Zufall, Keyframes, Schleifen-Werte
  zeitplan.js    Stimm-Timing laden/schätzen, Wort- und Segmentzeiten, Stichwort-Zeiten, Untertitel-Phrasen
  zeitleiste.js  Einstellungen und Übergänge zwischen Welten (meldet Szenenwechsel ins Protokoll)
  regie.js       Kamera-Regie: folgen, zoomen, hineinfahren, Stoß, Atmen, Schleife
  massstab.js/.css  Maßstab-Bausteine (Tafel, Uhr, Ring, Chips, Stempel, Leiste, Karten, Pointe, Folgen, Untertitel)
  hud.js/.css    Basis-HUD und ältere Bausteine (Schritt-Anzeige, Karten, Chips, Zähler, kinetischer Titel, Karaoke, 3D-Anker)
  duell.js/.css  ältere Duell-Bausteine (Rundenanzeige, Anzeigetafel, Ergebnis-Pille)
  iso.js/.css    Baukasten Designstil 2 „Isometrisches 3D“
  bausteine.js   Spielzeug-Bausteine: Häuser, Hochhaus, Figuren, Autos, Bäume, Münzen, Geldbündel, Straßen, Kontaktschatten
  strasse.js     Autobahn-Baukasten und Trajektorien-Abspieler
  globus.js      Punkte-Globus mit Lichtern, Ringen, Strahlen (Daten: daten/globus-punkte.json aus Natural Earth)
projekte/<name>/ skript.json, audio/ (stimme.mp3, timing.json, ereignisse.json), szene.html, szene.js
qc/massstab.py   Prüfliste docs/15 §11
render.js        Bilder rendern (parallel), Ereignis-Protokoll schreiben
klang.py         Tonspur: Stimme + synthetische Effekte + Klangteppich (keine fremden Dateien)
mux.sh           MP4 (H.264 CRF 18, yuv420p, 30 fps, AAC, −14 LUFS)
out/             Ausgaben (nicht im Repo)
```

## Gestaltungsregeln

- **Kein Kanalname, kein Logo, keine Rubrik im Video** (Entscheidung des Inhabers 31.10.). `Markenleiste` in `hud.js` ist wirkungslos und bleibt nur für ältere Szenen; Schlusskarten zeigen keinen Namen.
- **Sichere Zonen:** oben 150 px, rechts 150 px (x ≤ 930); nichts Wichtiges unter y ≈ 1500. Untertitel-Unterkante y = 1450 (eine Zeile ca. 1380–1450). Bausteine mit 3D-Anker werden in die sichere Fläche geklemmt bzw. blenden aus, wenn ihr Punkt das Bild verlässt.
- **Teamfarben** je Video in `new Massstab(…, { teams })`, überall gleich (Figuren, Tafel, Chips, Leiste, Untertitel).
- Farben der Basis: Tinte #12151D, Akzent-Gelb #FFD23F; ältere Szenen: Blau #2F6FED, Orange #FF7A1A, Grün #19B36B.
- Keine Spielszenen, keine fremden Logos, keine echten Personen.
