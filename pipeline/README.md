# Render-Pipeline · Simulierbar

Ein Video entsteht aus einer Szene (`projekte/<name>/szene.html` + `szene.js`), die für jede Zeit t deterministisch ein Bild zeichnet (`window.renderAt(t)`). `render.js` fotografiert die Bilder in Headless-Chromium, `mux.sh` macht daraus das MP4 mit Ton.

**Verbindliche Regeln (seit 07.11.2026):** Hirn `REA Simulierbar Regelwerk` bzw. `REA stelldirvor Regelwerk`, Ablauf im Skill `.claude/skills/video-produktion/` (Teil `simulierbar.md` bzw. `stelldirvor.md`); Messgrundlage der ersten 4 Vorbilder: Hirn `Maßstab Simulierbar`. Jede neue Szene baut auf den Maßstab-Bausteinen (`engine/massstab.js`, `engine/regie.js`) auf. Die Prüfliste §11 prüft `qc/massstab.py` automatisch. Beispiel mit allen Bausteinen: `projekte/_demo-massstab/`.

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

**Ausrichtung (Inhaber 01.11.):** Alles mittig auf der Achse x = 540, Schutzzone symmetrisch 150 px links und rechts (`SICHER` in `engine/massstab.js`: links 150, rechts 930, Breite 780). Keine festen x-Werte wie 492 mehr in Szenen, stattdessen `SICHER.mitte`. Große Sticker bzw. Stempel max. 5 je Video, mind. 5 s Abstand (Prüfpunkt 5d).

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

## Simulierbar-Stile 17–21 (seriöser Look mit Licht und Atmosphäre, Inhaber 02.11.)

**Verbindlich für jedes Simulierbar-Video:** seit 07.11. Skill `.claude/skills/video-produktion/`, Teil `simulierbar.md` (Regeln im Hirn: Stile, Licht, Design, Ablauf, Ton, Technik, Prüfung). Muster: `projekte/_demo-simulierbar/` (eine Welt je Stil, `?stil=nachtstadt|studio|architektur|lichtlabor|nachtkarte`, z. B. `node render.js projekte/_demo-simulierbar --zeiten 10.4 --worker 1 --query "stil=studio"`).
- **`engine/sim_atmosphaere.js`:** `SimBuehne` (Unterklasse von `Buehne` aus `kern.js`, zusätzlich Lichtstrahlen im Bildraum und Farbgrading: Lift/Gamma/Gain, Split-Toning; `kern.js` bleibt unverändert), `GRADING` je Stil, Licht-Rigs (`rigStudio`, `rigNacht`, `rigAbendsonne`, `rigLabor`, `flaechenLicht`), Umgebungen für Spiegelungen (`UMGEBUNG.*`), `lichtKegel`, `lichtBahn`, `lichtPfuetze`, `nebelSchicht`, `dunst`, `staub`, `spiegelBoden` (Reflector in kleiner Auflösung, gestreckt, Pfützen), `leuchtMat`, `glimmLinie`, `fokus` (Tiefenschärfe), `rauschTextur`, **`buendeln(szene)`** (statische Meshes je Material zusammenfassen; bewegte Objekte mit `userData.dynamisch = true` markieren).
- **Stil-Module:** `stil_nachtstadt.js` (17), `stil_studio.js` (18), `stil_architektur.js` (19), `stil_lichtlabor.js` (20), `stil_nachtkarte.js` (21). **HUD-Thema:** `engine/sim_hud.css` mit `<div id="hud" class="sim">` (Rauchglas, Haarlinien, Teamfarbe als Licht; Untertitel seit 07.11. in Blöcken `M.untertitel({ max: 4 })`; Sticker ausgeblendet).
- **Prüfung:** `qc/massstab.py` Punkt 18b „Stil erlaubt (17–21)“ (Pflicht bei `"skill": "video-produktion"` bzw. alt `"simulierbar-video"` in `skript.json` oder Szenen mit `sim_atmosphaere.js`, sonst Hinweis); 5d (keine Sticker) bleibt Pflicht.

## Referenzformat Account 2 (keine Stimme, 80 s; Skill video-produktion, Teil stelldirvor.md)

**Verbindlich:** seit 07.11. Skill `.claude/skills/video-produktion/`, Teil `stelldirvor.md` (Regeln im Hirn: Design, Licht, Effekte, Ablauf, Ton, Technik, Prüfung; seit 07.11. Ereignis bei ca. 8 s auf Countdown-Null und höchstens 3 gezielte harte Schnitte). Muster mit allen Bausteinen: `projekte/_demo-lunar-pov/` (Demo, nicht posten).
- **Baukasten:** `engine/stil_lunar_pov.js` (Höhennebel, Himmel mit Sonne/Bloom, Glut, Puffs: Wolken, Rauch-/Aschesäule, Druck-/Staubwand, Feuerball, Gischt; Partikel: Staub, Asche, Schnee, Eis, Regen, Funken; Trümmer; Menschen, Autos, Vögel; Geländer/Brüstung/Fensterrahmen; `PovKamera` mit Atmen, Beben, Stoß, Kippen; Farbphasen; Ereignis-Protokoll) und `engine/lunar_hud.js` + `engine/stil_lunar_pov.css` (Titelfrage, Messwert-Anzeige mit Etikettwechsel, kursive Sätze, Abblende, Abspann, Vignette, Glasriss, Linsenflecken, Tropfen). Schriften Crimson Pro und Inter (SIL OFL, lokal über `@fontsource`, Lizenztexte in `engine/schriften/`).
- **`kern.js`** kann zusätzlich Tiefenunschärfe (`new Buehne(…, { tiefe: true })`, `post.tiefeNah/tiefeFern/fokusNah/fokusFern`), Hitzeflimmern (`post.flimmern`, `flimmerY`) und einen Farbschleier (`post.schleier`, `schleierStaerke`). Standard aus, ältere Szenen bleiben unverändert.
- **Ton ohne Stimme:** `python3 atmo.py projekte/<name>` (oder `python3 klang.py projekte/<name> --atmo`) baut aus `projekte/<name>/ton.json` und den Effekt-Ereignissen des Protokolls die Atmo-Spur `out/<name>/ton.wav`; danach `TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>` (mit `TON_FERTIG` ohne Vorbegrenzer, loudnorm linear auf −14 LUFS). `atmo.py` bringt die Spur selbst auf ≈ −14 LUFS und erzwingt den Verlauf (Höhepunkt ≥ 6 dB über dem Start, Abspann leise).
- **`render.js`:** Projekte ohne `segmente` in `skript.json` (keine Stimme) bekommen keine Timing-Schätzung.
- **Prüfung:** `python3 qc/referenz_pov.py projekte/<name>` (Länge, Titel, Anzeige mit „HIER“, Sätze, verbotene Elemente, Abspann, Lautheit und Verlauf, keine Stimme, kein „5 Sekunden“) und `node qc/text_ueberlappung_pov.mjs projekte/<name>` (Überlappung und sichere Zone, auch für den LunarHUD).
- Älteres Beispiel (gestoppt): `projekte/stickstoff-weg/` mit eigenem `ton.py`.

## Prüfung (`qc/massstab.py`)

```bash
python3 qc/massstab.py projekte/<name>                     # Profil „ben“ (Standard)
python3 qc/massstab.py projekte/<name> --profil massstab   # Zielwerte der Vorbilder
python3 qc/massstab.py projekte/<name> --ziel tempo=2.0:2.5 --ziel satzpause_max=0.7 --json
```

Prüft und zeigt als Tabelle (Ist · Ziel · Maßstab · ja/nein): Stimme startet < 0,2 s, Hook fertig vor 5 s (max. 2 Sätze), längste Phase ohne Bild-Ereignis ≤ 2 s (mit und ohne laufende Zähler), Schlusskarte (`M.pointe`) in den letzten 8 s ohne Frage und Aufruf, Wörter, Sprechtempo (2,3–2,7 W/s oder 4,6–5,4 Silben/s), Satzlängen (Median 3–5), Satzpausen, Videolänge 65–80 s, Untertitel-Blöcke ≤ 4 Wörter, Titel ab Bild 1 (R1), Tafel ab Bild 0 (R2), Erklärgrafik (R3), Du nur im Hook (R4), Endstand bei 75–86 % (R5), kein Kanalname/Logo/Rubrik in `szene.js`; als Hinweise zusätzlich Folgen-Aufruf (nur Testvideo, 15–25 s), Kipp-Moment (R6), erster Satz (R7), Denkfalle und „Los geht's“ vor 16 s, laufende Uhr/Zähler, erste Wendung, „Warum?“, Schleife (freiwillig; wenn genutzt, letztes = erstes Bild), Klangteppich, Akzent auf der Pointe.

Tests für Stichwort-Zeiten und Phrasen: `node --test qc/zeitplan.test.mjs`.

Text-Überlappung aller Bilder (HUD: Tafel, Chips, Zähler, Ringe, Sticker-Plaketten, Schlagzeilen, Karten, Leiste, Untertitel-Wörter; Deckkraft > 0,3): `node qc/text_ueberlappung.mjs projekte/<name> [--abstand 12] [--deckkraft 0.15] [--von s --bis s]`. Nutzt `window.hudAt(t)` der Szene (nur HUD, ca. 30 s für ein Video), sonst `renderAt`. Exit-Code 1 bei Treffern.

**Zielbereiche:** Profil `ben` = Stimme Ben mit Original-Einstellungen (1,9–2,4 W/s, Satzpausen ≤ 0,8 s, 130–170 Wörter, 65–80 s); Profil `massstab` = Vorbilder (2,5–2,9 W/s, ≤ 0,4 s, 170–220 Wörter). Exit-Code 1, wenn ein Pflichtpunkt „nein“ ist.

## Post über Buffer einplanen (`post_buffer.py`)

Plant ein **geprüftes** Video direkt für die Posting-Zeit in Buffer ein (TikTok, Status `scheduled`; Buffer veröffentlicht zur Zeit selbst) und prüft es nach dem Posten auf der öffentlichen TikTok-Seite. Regeln des Inhabers vom 01.11.: **kein KI-Label als Standard**, **keine Freigabe in Buffer**, feste Posting-Zeiten. Technik und Feldnamen: Abschnitt „Buffer-API und Supabase im Detail“ unten.

```bash
export SUPABASE_URL=https://<projekt>.supabase.co     # nicht im Repo (öffentlich); Cloud: Umgebungsvariable der Umgebung
python3 post_buffer.py --pruefen [--schreibtest]      # Zugang testen: Buffer lesen, Posting-Zeiten lesen, Supabase lesen, optional Mini-Upload-Roundtrip
python3 post_buffer.py --video out/<name>/<name>.mp4 --kanal simulierbar --zeit auto:2026-11-03:mittag \
       --text "Hook? 🚗 Ich hab's simuliert. Frage? 👇 #a #b #c #wissen #simulation" --trocken     # alles prüfen, Mutation nur ausgeben
python3 post_buffer.py ... (gleiche Argumente ohne --trocken)                                        # echter Post, wird eingeplant
python3 post_buffer.py --nachpruefen [--trocken]      # nach dem Posten: öffentlich? Dauer, KI-Label; danach Supabase-Datei löschen
python3 post_buffer.py --aufraeumen [--trocken]       # nur Supabase-Dateien löschen, deren Buffer-Post „sent“ ist
```

- **Zeit:** `--zeit auto:YYYY-MM-DD:slot` rechnet aus dem Wochentag die Uhrzeit (Slots in `data/plan/posting_zeiten.json`, Europe/Berlin: beide Kanäle, `simulierbar` und `stelldirvor.pov`: Mo–Fr `mittag` 12:30 / `abend` 19:30, Sa–So `mittag` 09:30 / `abend` 19:30) und den UTC-Wert inklusive Sommer-/Winterzeit. Außerdem ISO mit Zone (`2026-11-03T12:30:00+01:00`) und `sofort` (= jetzt + 15 Min., nur für Ausnahmen). Weniger als 10 Min. Vorlauf: Abbruch. Windows: einmal `pip install tzdata`.
- **Caption ist Pflicht** (`--text` oder `--text-datei`, UTF-8, praktisch unter Windows wegen Emojis): 3 bis 5 Hashtags, kein #fyp/#viral/#foryou, höchstens 2.200 Zeichen, sonst Abbruch.
- **KI-Label:** Standard AUS (`isAiGenerated: false`). `--ki-label` setzt es AN, nur für realistischen KI-Inhalt. **Entwurf:** `--entwurf` legt statt eines geplanten Posts einen Entwurf an (alter Weg, Freigabe in Buffer).
- **Prüfungen vor dem Schreiben:** 1080×1920, mind. 61 s, Kanal verbunden und Warteschlange nicht pausiert, kein anderer Post auf dem Kanal innerhalb von ± 20 Min., Buffer-Tageslimit (25 Posts je 24 h und Kanal) nicht erreicht, Schema-Abgleich der Mutation gegen die Live-Introspection, Bucket erreichbar. Ein zweiter Post für dasselbe Video und denselben Kanal oder ein belegter Slot braucht `--nochmal`.
- **Nach dem Anlegen:** erwarteter Status `scheduled` (mit `--entwurf` `draft`), `isAiGenerated` wie gesetzt, `dueAt` wie gewünscht, sonst **Exit-Code 2** (Post existiert, in Buffer prüfen). Ausgegeben wird auch, ob `assets[].source` noch auf Supabase zeigt.
- **Größe:** Über 48 MB entsteht eine Upload-Kopie in `out/_buffer/<name>_upload.mp4` (2-pass H.264, gleiche Auflösung, Ziel 45 MB, AAC unverändert, faststart; ca. 1,5 Min. in der Cloud mit 4 Kernen und `--preset medium`; SSIM 0,977 gegenüber dem 14,7-Mbit/s-Original). Das Original wird nie angefasst. Eine vorhandene aktuelle Kopie wird wiederverwendet, auch vom Trockenlauf.
- **Supabase-Link:** gültig bis `dueAt` + 12 h, mindestens 24 h. Die Datei bleibt bis nach dem Posten liegen.
- **`--nachpruefen`:** ruft für Log-Einträge mit Buffer-Status `sent` die öffentliche TikTok-Seite (`externalLink`) mit Browser-User-Agent ab und meldet `privateItem` (muss `false` sein), Dauer und `aigcLabelType`; ohne Daten (z. B. Bot-Schutz) steht „nicht prüfbar“, es wird nichts umgangen. Danach löscht es die Supabase-Datei, das Ergebnis steht im Log.
- **Log:** `out/buffer_log.jsonl` (nicht im Repo): je Post Post-ID, Kanal, Supabase-Pfad, Hash, Modus; später Zeilen „nachgeprueft“ und „geloescht“. Der signierte Link steht nie im Log.
- **Zugänge:** Cloud: der Proxy setzt die Header (Buffer `Authorization`, Supabase `apikey`). Lokal: `BUFFER_API_KEY` und `SUPABASE_KEY`; `SUPABASE_AUTH`/`SUPABASE_AUTHORIZATION` nur, falls Storage einen Authorization-Header verlangt (siehe Kopf von `post_buffer.py`).

## Buffer-API und Supabase im Detail (Stand 01.11.2026)

- **API:** GraphQL `https://api.buffer.com` (öffentliche Beta, Namen können sich ändern). `post_buffer.py` gleicht seine Eingabe vor jedem Lauf per Introspection mit dem Live-Schema ab (mit installiertem `graphql-core` auch das ganze Mutations-Dokument). Zugang laut Buffer nur in Bezahlplänen (3 Keys, 3.000 Anfragen je Kanal/Monat, Zweitquelle).
- **Planen:** `createPost` mit `mode: customScheduled`, `schedulingType: automatic` und `dueAt` (UTC) plant; Buffer veröffentlicht zur Zeit selbst, erwarteter Status `scheduled`. Mit `saveToDraft: true` entsteht ein Entwurf (`draft`, ohne Limit-Prüfung). `PostStatus`: `draft`, `scheduled`, `sending`, `sent`, `error`, `needs_approval`. Lesen: `post(input:{id})`, `posts(input:{organizationId, filter:{channelIds, status, dueAt}})`; ändern/löschen: `editPost`, `deletePost`. Antwort `PostActionPayload` = `PostActionSuccess { post }` oder `NotFoundError`, `UnauthorizedError`, `UnexpectedError`, `RestProxyError`, `LimitReachedError`, `InvalidInputError`.
- **Variablen** (so sendet das Skript sie; mit `--entwurf` kommt `saveToDraft: true` dazu, mit `--ki-label` steht `isAiGenerated` auf `true`):
```json
{"input": {"channelId": "<Kanal-ID>", "text": "<Caption>", "mode": "customScheduled", "dueAt": "2026-11-03T11:30:00.000Z",
  "schedulingType": "automatic", "assets": [{"video": {"url": "<signierter Link>"}}], "metadata": {"tiktok": {"isAiGenerated": false}}}}
```
`channelId` löst das Skript über `channels(input:{organizationId})` per Namen auf (`simulierbar`, `stelldirvor.pov`). `VideoAssetInput.thumbnailUrl` darf nicht gesetzt werden (API lehnt ab). **Cover seit 08.11.2026:** `assets[].video.metadata.thumbnailOffset` (ms) wählt das Bild an dieser Stelle (laut Buffer-Doku nur Instagram, TikTok, Pinterest); das Skript setzt simulierbar 1000 ms, stelldirvor.pov 1500 ms (`--cover-ms`, `--ohne-cover`), speichert das Bild als `<video>_cover.jpg` und lässt das Feld weg, wenn das Live-Schema es nicht kennt. `aiAssisted` heißt „mit KI-Hilfe von Buffer erstellt“ und ist **nicht** die Kennzeichnung; `needsApproval` (Team-Freigabe) bleibt ungenutzt. Das Skript prüft die Antwort auf `status == "scheduled"`, `isAiGenerated` wie gesetzt und `dueAt` wie gewünscht, sonst Exit-Code 2 (der Post existiert dann, in Buffer prüfen).
- **Nicht per API setzbar:** `TikTokPostMetadataInput` kennt nur `isAiGenerated` und `title`. Markeninhalt, Sichtbarkeit (öffentlich/privat), Kommentare, Duett und Stitch gelten also mit Buffers Standard (A); ob das Video öffentlich ist, sagt erst `--nachpruefen` (`privateItem`).
- **Limits (Buffer Essentials):** keine Grenze für geplante Posts, aber 25 Posts je 24 h und Kanal (das Skript fragt `dailyPostingLimits` lesend ab), Video 3 s bis 10 min und höchstens 1 GB. Das Skript bricht auch ab, wenn auf dem Kanal innerhalb von ± 20 Min. schon ein Post oder Entwurf liegt (`--nochmal` hebt das auf).
- **Supabase (Zwischenspeicher, privater Bucket `buffer-uploads`, Host nur in `SUPABASE_URL`):** Upload `POST {SUPABASE_URL}/storage/v1/object/buffer-uploads/<datum>/<uuid>.mp4` (Body = Datei, `Content-Type: video/mp4`) · Link `POST …/storage/v1/object/sign/buffer-uploads/<pfad>` mit `{"expiresIn": <Sekunden>}` → `signedURL` (relativ, das Skript ergänzt `/storage/v1`; gültig bis `dueAt` + 12 h, mindestens 24 h) · Löschen `DELETE …/storage/v1/object/buffer-uploads` mit `{"prefixes": ["<pfad>"]}` · Zugangstest `GET …/storage/v1/bucket/buffer-uploads` und `POST …/storage/v1/object/list/buffer-uploads`. Das Gratis-Plan-Limit von 50 MB je Datei gilt projektweit (Upload-Kopie ab 48 MB).
- **Anmeldung:** In der Cloud setzt der Proxy den Header `apikey`; das Skript schickt keine Anmelde-Header (`--pruefen --schreibtest` war am 01.11. in allen Punkten OK). Meldet Storage „headers must have required property 'authorization'“: zweiter Proxy-Header `Authorization: Bearer <alter service_role-JWT>` für den Supabase-Host, oder lokal `SUPABASE_KEY` plus `SUPABASE_AUTH=bearer` bzw. `SUPABASE_AUTHORIZATION`. Ein `sb_secret_`-Schlüssel darf laut Doku nicht als Bearer geschickt werden.
- **Nachprüfung:** Die öffentliche Videoseite enthält `<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">` → `__DEFAULT_SCOPE__` → `webapp.video-detail` → `itemInfo.itemStruct`. Gemeldet werden `privateItem` (muss `false` sein), `video.duration`, `aigcLabelType` (Text `"1"`, fehlt ohne Label; war `--ki-label` gesetzt, ist ein fehlendes Label ein Fehler) und `IsAigc` (immer `false`, sagt nichts aus). Liefert die Seite keine Daten, steht „nicht prüfbar“; Schutzmaßnahmen werden nicht umgangen. Test am 01.11. an drei gepostete Videos: Gehalt öffentlich ohne Label, Treppe und GTA öffentlich mit `aigcLabelType` = 1.
- **Warum Buffer (F, Zweitquellen):** TikTok erlaubt Direct Post über auditierte Clients; unauditierte posten nur privat (`unaudited_client_can_only_post_to_private_accounts`). Welche Tools auditiert sind, ist nicht öffentlich, daher der Test (Video öffentlich?). Alternativen: Metricool (EU-Anbieter, offizieller MCP-Server, Starter ab 16 €); nicht empfohlen Hootsuite, Ayrshare, Postiz (Audit nicht belegt), eigene TikTok-App (eigener Audit). Eigenes YouTube-API-Projekt lohnt nicht (OAuth, Audit, `videos.insert` 1.600 Einheiten je Aufruf bei 10.000/Tag, unauditiert nur privat, A).

## Manueller Rückfall: Posten über TikTok Studio Web

Nur falls Buffer ausfällt (offizieller Weg, Planung bis 30 Tage im Voraus): Konto öffentlich (Privates Konto AUS) und Kontotyp persönlich. `tiktok.com/tiktokstudio/upload` → Video wählen → Caption (eine Zeile mit Hashtags, Format `CLAUDE.md` §7) → Titelbild aus den ersten Sekunden (der Titel steht dort groß im Bild; kein zusätzlicher Text) → Wer kann das sehen: Alle, Kommentare an → unter „Mehr anzeigen“: Offenlegung Markeninhalt AUS, kein KI-Label (außer bei realistischen KI-Inhalten), keine Produkt- oder Shop-Links, kein Ort → Veröffentlichen oder Planen (geplante Posts lassen sich nicht bearbeiten, nur löschen und neu hochladen). Dieselbe Master-MP4 für YouTube später ohne TikTok-Wasserzeichen.

## Blender-Bake-Weg (für Material-Looks in Three.js)

Cycles je Bild kostet in der Cloud 130–300 s (80 s Video = 90–200 Std.) und taugt nur für Standbilder. Der Bake-Weg holt den Großteil der Blender-Qualität zu Three.js-Kosten: Szene in Blender bauen → Licht in Texturen backen (Cycles, diffus: direkt + indirekt + Farbe; ca. 5,5 Min. einmalig) → eine `.glb` → Three.js zeigt sie mit unbeleuchteten Materialien, AgX-Tonemapping und günstiger Tiefenunschärfe (Abstand je Pixel, Weichzeichner in halber und viertel Auflösung; der fertige `BokehPass` kostete 2,6–3 s je Bild); ca. 0,9 s je Bild (0,5 s ohne Unschärfe). Regeln: Kulisse **ohne** Fahrzeuge backen, Fahrzeuge einzeln backen und mit mitfahrendem Kontaktschatten bewegen; Glanz, Spiegelungen, Glas-Brechung und bewegte Schatten gehen verloren (Ersatz: Kontaktschatten, Three.js-Glanzlicht); dünnwandiges Glas (`Thin Wall`) ist sauberer und schneller als dicke Wände. Fallstrick: `gltf.scene` ist nur eine Gruppe, `overrideMaterial` und `background` wirken erst in einer echten `THREE.Scene`. Beispielskripte: `stile/` (`stil_9_holz.py`, `stil_15_holz_gltf.py`).

## Rendern auf dem PC (Render-Dienst, ohne KI)

Skript, Szene, Prüfung und Posting bleiben in der Cloud-Sitzung. **Nur das Rendern** läuft auf dem Windows-PC mit Grafikkarte (`render.js --gpu`). Dort läuft kein Claude, sondern `render_dienst/dienst.py` (Python, Standardbibliothek). Einrichtung für den Inhaber: `docs/18-render-pc.md`.

```bash
python3 pipeline/render_dienst/auftrag.py pc                                        # Herzschlag des PCs (Exit 3 = offline)
python3 pipeline/render_dienst/auftrag.py senden <projekt> --konto simulierbar|stelldirvor.pov   # prüft: Commit gepusht, nichts Uncommittetes, Stimme im Commit
python3 pipeline/render_dienst/auftrag.py warten      # blockiert bis fertig (im Hintergrund starten); holt pipeline/out/<projekt>/<projekt>.mp4, löscht in Supabase
python3 pipeline/render_dienst/auftrag.py status [--alle] | aufraeumen [--alles]
```

- **Ablauf:** Commit pushen → `senden` → `warten` → MP4 liegt da, `ereignisse.json` ist nach `projekte/<p>/audio/` kopiert → Prüfung (Kontaktbogen/Standbilder aus dem MP4 ziehen, die Bilder bleiben auf dem PC) → `post_buffer.py`.
- **Rückfall:** Ist der Herzschlag älter als 5 Min., meldet `senden` „PC offline“ (Exit 3): dann in der Cloud rendern wie bisher (`node render.js projekte/<name> --worker 2`, ohne `--gpu`). Meldet der PC „keine GPU“, endet `warten` mit Exit 5.
- **Optionen** gehen an `render.js` (`--von/--bis/--worker/--qualitaet/--fps/--format/--query/--bilder`) und `mux.sh` (`--mux "--teppich regen --teppich-db -11"`, `--ohne-ton`). Account 2 (`--konto stelldirvor.pov`): Der Dienst ruft `atmo.py` und `TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh` wie im Skill.
- **Kanal:** Supabase-Bucket von `post_buffer.py` (`buffer-uploads`), Präfix `render/` (auftraege, status, fertig, herzschlag). Adresse nur über `SUPABASE_URL` (Cloud) bzw. `render_dienst/.env` (PC, steht in `.gitignore`), nie im Repo oder in Ausgaben.
- **Test ohne GPU** (nur Entwicklung, eigener Klon, nie im Arbeits-Repo): `python3 render_dienst/dienst.py --cpu-erlaubt --repo <Klon>`.
- **Auf dem PC prüfen:** `py -3 render_dienst\pc_test.py` (Programme, Git Bash, Supabase, GPU).

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
  stil_flat.js   Baukasten Designstil 4 „2D-Flat-Infografik“ in Three.js: Formen in Bild-Pixeln, orthografische Kamera (Zoom über kamera.zoom), Parallax-Ebenen, Figuren, Möbel, Münzen, Belege, Haus/Büro/Auto
  stil_collage.js Baukasten Designstil 6 „Papier-Collage“ in Three.js: Papierstücke mit Rissrand, weißem Saum und Papierschatten (`papier(eltern, rechteck(w, h), farbe, {x, y, z, dreh, amp, schatten, raster, druck})`), Kraftpapier-Grund, Zeitungsfetzen, Klebeband, Schreibmaschinen-Etikett, Wellpappe-Boden, Münzsäule aus Papierscheiben (`muenzSaeule(...).setze(geld, zeit)`), Abreißkalender mit Flugblättern, Papieruhr, Papierfigur, Topf, Lieferbeutel, Tablett, Einkaufstüte, Schwamm, `stopp(t, 12)` für Stop-Motion-Takt; Muster `projekte/mittagessen-job/`
  stil_lowpoly.js Baukasten Designstil 1 „Low-Poly-Miniatur“ (Stadt/Verkehr, mit kern.js): Fußgänger mit Gelenken (Gehen, Drücken, Warten), Fußgänger-/Kfz-Signale, Anforderungstaster mit „Signal kommt“, Querstraße mit Furt, Straßenbahn, Autoströme mit Rückstau, Tilt-Shift-Fokus
  stil_clay.js   Baukasten Designstil 3 „Clay-Spielzeug“ (mit kern.js): Knete-Material, Hände (Stein/Papier/Schere mischbar), Sockel, Bauer, Würfel, Kopf-Figur, Brett mit 10×10 Kacheln und Sortier-Animation, Wand und Tisch
  sim_atmosphaere.js Simulierbar-Stile 17–21: SimBuehne (Lichtstrahlen, Grading), Licht-Rigs, Volumenlicht, Nebel, Staub, Spiegelboden, Tiefenschärfe, buendeln
  stil_nachtstadt.js / stil_studio.js / stil_architektur.js / stil_lichtlabor.js / stil_nachtkarte.js  Baukästen der Stile 17–21; sim_hud.css = seriöses HUD-Thema
  stil_clay_welt.js Belebte Welt zu Stil 3 (02.11.): `figur` (sitzend, Gesicht mit Lidern/Pupillen/Brauen/Mund, Arme per Zwei-Knochen-IK, Hände aus stil_clay.js), `gesicht`, `fan` (Zuschauer mit Fahne), `katze`, `spieltisch`, `raumWelt` (Tapete, Dielen, Teppich), `loge`, `wimpelkette`, `becher`, `notizblock`, `tasse`, `pflanze`; alle Zustände aus Parametern (deterministisch). Muster: projekte/schere-stein-papier/szene.js (Gesamtzustand je Bild als Objekt, Schleife per mixD zum Zustand bei t = 0)
projekte/<name>/ skript.json, audio/ (stimme.mp3, timing.json, ereignisse.json), szene.html, szene.js
qc/massstab.py   Prüfung Simulierbar (Regeln: Hirn „REA Simulierbar Regelwerk“, Tests qc/massstab_test.py)
render.js        Bilder rendern (parallel), Ereignis-Protokoll schreiben
klang.py         Tonspur: Stimme + synthetische Effekte + Klangteppich (keine fremden Dateien)
mux.sh           MP4 (H.264 CRF 18, yuv420p, 30 fps, AAC, −14 LUFS)
post_buffer.py   fertiges MP4 über Buffer einplanen (Supabase-Zwischenspeicher), nachprüfen, aufräumen, siehe oben
out/             Ausgaben (nicht im Repo)
```

## Gestaltungsregeln

- **Kein Kanalname, kein Logo, keine Rubrik im Video** (Entscheidung des Inhabers 31.10.). `Markenleiste` in `hud.js` ist wirkungslos und bleibt nur für ältere Szenen; Schlusskarten zeigen keinen Namen.
- **Sichere Zonen:** oben 150 px, rechts 150 px (x ≤ 930); nichts Wichtiges unter y ≈ 1500. Untertitel-Unterkante y = 1450 (eine Zeile ca. 1380–1450). Bausteine mit 3D-Anker werden in die sichere Fläche geklemmt bzw. blenden aus, wenn ihr Punkt das Bild verlässt.
- **Teamfarben** je Video in `new Massstab(…, { teams })`, überall gleich (Figuren, Tafel, Chips, Leiste, Untertitel).
- Farben der Basis: Tinte #12151D, Akzent-Gelb #FFD23F; ältere Szenen: Blau #2F6FED, Orange #FF7A1A, Grün #19B36B.
- Keine Spielszenen, keine fremden Logos, keine echten Personen.
