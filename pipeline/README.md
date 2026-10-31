# Render-Pipeline · Simulierbar

Ein Video entsteht aus einer Szene (`projekte/<name>/szene.html` + `szene.js`), die für jede Zeit t deterministisch ein Bild zeichnet (`window.renderAt(t)`). `render.js` fotografiert die Bilder in Headless-Chromium, `mux.sh` macht daraus das MP4 mit Ton.

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

## Ablauf für ein Video (Beispiel `gta6-welt`)

```bash
cd pipeline
# 1. Stimme mit Wortzeiten (ElevenLabs-Key nur als Umgebungsvariable)
python3 tts.py projekte/gta6-welt                      # → audio/stimme.mp3 + audio/timing.json
# 2. Prüfbilder (PNG) an einzelnen Zeitpunkten
node render.js projekte/gta6-welt --zeiten 1.5,30,64
# 3. Alle Bilder rendern (abbrechbar, mit --nur-fehlende fortsetzen)
node render.js projekte/gta6-welt --worker 2
# 4. MP4 mit Ton (−14 LUFS) bzw. stumme Vorschau
./mux.sh projekte/gta6-welt                            # → out/gta6-welt/gta6-welt.mp4
./mux.sh projekte/gta6-welt --ohne-ton                 # → out/gta6-welt/vorschau_ohne_ton.mp4
```

Fehlt `audio/timing.json`, schreibt `render.js` eine Schätzung (`audio/timing_schaetzung.json`, 2,4 Wörter/s) und die Szene nutzt sie. Kommt später die echte Stimme, genügt es, Schritt 3 und 4 neu auszuführen: alle Animationen hängen an Wörtern der Stimme.

Nützliche Optionen von `render.js`: `--von 20 --bis 30` (Ausschnitt in Sekunden), `--worker N`, `--format png`, `--nur-fehlende`, `--query "msaa=4"` (Qualitätsschalter der Szene).

## Renderzeit

Ohne GPU (SwiftShader) braucht ein Bild je nach Szene 0,8–2 s. Zwei Worker sind am schnellsten, mehr Worker bremsen sich gegenseitig, weil SwiftShader schon alle Kerne nutzt. Ein Video mit 80 s dauert damit etwa 45–60 Min. Mit Grafikkarte (Windows-PC) `--gpu` anhängen; dann rendert Chromium über die echte GPU und ist um ein Vielfaches schneller (dann auch `--worker 4` testen).

## Aufbau

```
engine/          wiederverwendbar für alle Videos
  kern.js        Renderer, Nachbearbeitung (Bloom, Tilt-Shift, ACES, Vignette, Körnung, FXAA), Übergänge (blende, iris, wisch, zoom)
  licht.js       Licht-Presets (Tag mit weichen Schatten, Globus), Umgebungslicht, Verlaufshintergründe
  bewegung.js    Easing, Federn mit Überschwingen, deterministischer Zufall, Keyframes
  zeitplan.js    Stimm-Timing laden/schätzen, Wort- und Segmentzeiten
  zeitleiste.js  Einstellungen und Übergänge zwischen Welten
  hud.js/.css    Markenleiste, Schritt-Anzeige, Karten, Chips, Zähler, kinetischer Titel, Karaoke-Untertitel, 3D-Anker, Schlusskarte
  bausteine.js   Spielzeug-Bausteine: Häuser, Hochhaus, Figuren, Autos, Bäume, Münzen, Geldbündel, Straßen, Kontaktschatten
  globus.js      Punkte-Globus mit Lichtern, Ringen, Strahlen (Daten: daten/globus-punkte.json aus Natural Earth)
projekte/<name>/ skript.json, audio/, szene.html, szene.js
render.js        Bilder rendern (parallel)
klang.py         Tonspur: Stimme + synthetische Effekte + leiser Klangteppich (keine fremden Dateien)
mux.sh           MP4 (H.264 CRF 18, yuv420p, 30 fps, AAC, −14 LUFS)
out/             Ausgaben (nicht im Repo)
```

## Gestaltungsregeln (Marke)

- Farben: Tinte #14171F, Blau #2F6FED, Orange #FF7A1A, Grün #19B36B, Gelb #FFD23F.
- Sichere Zonen: oben 150 px, rechts 150 px, unten 400 px frei von wichtigen Texten. Untertitel bei y = 1300 px.
- Markenleiste „SIMULIERBAR“ und Rubrik-Chip immer sichtbar (außer Schlusskarte).
- Keine Spielszenen, keine fremden Logos, keine echten Personen.
