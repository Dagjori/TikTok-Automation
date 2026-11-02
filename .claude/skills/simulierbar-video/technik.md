# Technik: Baukasten, Szenengerüst, Render, Mux, Posting

## Dateien
| Datei | Inhalt |
|---|---|
| `pipeline/engine/sim_atmosphaere.js` | `SimBuehne`, `GRADING`, `SIM_POST`, Umgebungen (`UMGEBUNG.studio/nacht/abend/labor`, `umgebung`), Rigs (`rigStudio`, `rigNacht`, `rigAbendsonne`, `rigLabor`, `flaechenLicht`), `lichtKegel`, `lichtBahn`, `lichtPfuetze`, `nebelSchicht`, `dunst`, `staub`, `spiegelBoden`, `leuchtMat`, `glimmLinie`, `fokus`, `lichtFarbe`, `rauschTextur`, `buendeln`, `aktualisiere` |
| `pipeline/engine/stil_nachtstadt.js` | Stil 17: `fassadenAtlas`, `gebaeude`, `strassenBoden`, `laterne`, `autoNacht`, `lichtSpur`, `parkhaus`, `skyline`, `baumNacht`, `himmelNacht` |
| `pipeline/engine/stil_studio.js` | Stil 18: `hohlkehle`, `wandLicht`, `muenzMaterial`, `muenzStapel`, `scheinBuendel`, `sockel`, `waage` |
| `pipeline/engine/stil_architektur.js` | Stil 19: `modellAtlas`, `modellPlatte`, `modellHaus`, `schnittHaus`, `acrylMarker`, `modellBaum`, `modellFigur`, `abendWand`, `MODELL` |
| `pipeline/engine/stil_lichtlabor.js` | Stil 20: `glasGefaess`, `glasMaterial`, `kaustik`, `laborBank`, `gegenlichtWand`, `laborZeit` |
| `pipeline/engine/stil_nachtkarte.js` | Stil 21: `reliefKarte` (mit `.hoehe(x, z)`), `stadtLichter`, `strassenNetz`, `route`, `ortsMarke`, `wolkenSchicht`, `karteZeit` |
| `pipeline/engine/sim_hud.css` | seriöses HUD-Thema (`design.md`), wirkt mit `#hud.sim` |
| `pipeline/engine/massstab.js`, `regie.js`, `zeitplan.js`, `zeitleiste.js`, `bewegung.js`, `hud.js` | Maßstab-Bausteine, Kamera-Regie, Wortzeiten, Einstellungen/Übergänge, Easing, Untertitel (unverändert, `pipeline/README.md`) |
| `pipeline/engine/stil_blaupause.js` | nur für den „Warum?“-Einschub (`stile.md`) |
| `pipeline/projekte/_demo-simulierbar/` | Muster: `szene.js` (gemeinsames Gerüst), `welten/<stil>.js` (je Stil eine Welt), `?stil=…` |

Neue Objekte (Zapfsäule, Brotdose, Waschmaschine …) gehören ins Stil-Modul, mit geteilten Materialien und `userData.dynamisch` für bewegte Teile. Keine fremden Assets ohne freie Lizenz; Banknoten und Münzen nur in eigener, neutraler Gestaltung, keine Marken.

## Projektordner
`pipeline/projekte/<name>/`: `skript.json`, `audio/` (stimme.mp3, timing.json, ereignisse.json), `szene.html`, `szene.js`; Rechnung mit Test in `pipeline/sim/<name>.mjs`.

`skript.json` (Format `docs/08` §3.3) zusätzlich: `"konto": "simulierbar"`, `"skill": "simulierbar-video"`, `"stil": "18 Dunkles Studio (Produktlicht)"`, `"stil_begruendung"`, `"teamfarben"`, `"klangteppich"`, `"bild_text_abgleich"`, `"caption"`, `"quellen"` (nur intern).

## Szenengerüst
`szene.html`:
```html
<link rel="stylesheet" href="../../engine/hud.css">
<link rel="stylesheet" href="../../engine/massstab.css">
<link rel="stylesheet" href="../../engine/sim_hud.css">
<script type="importmap">{ "imports": { "three": "/node_modules/three/build/three.module.js", "three/addons/": "/node_modules/three/examples/jsm/" } }</script>
<canvas id="leinwand" width="1080" height="1920"></canvas>
<div id="hud" class="sim"></div>
<script type="module" src="./szene.js"></script>
```
`szene.js` (gekürzt; vollständig in `_demo-simulierbar/szene.js` + `welten/studio.js`):
```js
import * as THREE from "three";
import { SimBuehne, GRADING, rigStudio, spiegelBoden, lichtKegel, staub, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { hohlkehle, muenzStapel, scheinBuendel, waage } from "../../engine/stil_studio.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";

const Q = new URLSearchParams(location.search), MSAA = Q.has("msaa") ? +Q.get("msaa") : 2, SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const skript = await (await fetch("skript.json")).json();
const timing = await (await fetch("audio/timing.json")).json();          // echte Stimme (tts.py)
const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
const DAUER = Math.round(zp.dauer * 30) / 30;
const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
await document.fonts.ready;
const hud = new HUD(document.getElementById("hud"));
const M = new Massstab(hud, zp, { teams: { a: {…}, b: {…} }, akzent: "#ECE6DA", tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8" });
const T = (x) => M.zeit(x);

const szene = new THREE.Scene();
rigStudio(szene, buehne.renderer, { … });            // Licht (licht-und-atmosphaere.md)
// … Welt aus dem Stil-Modul, bewegte Objekte: obj.userData.dynamisch = true
buendeln(szene);                                      // statische Teile zusammenfassen (Pflicht für die Renderzeit)
const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 200);
const regie = new Regie(kamera, (t) => ({ pos, ziel, fov: 30 }), { zp });
regie.schleife({ ab: T("Was#2") - 0.3, ende: DAUER - 1 / 30 });
const post = { ...GRADING.studio, strahlen: 0.5, strahlenPunkt: [0, 9, 0] };
const welt = { szene, kamera, post, update(t) {
  aktualisiere(t);                                    // Kegel, Nebel, Staub
  /* Zustand der Welt aus t setzen (Zähler = Rechnung aus pipeline/sim) */
  regie.anwenden(t);
  Object.assign(post, fokus(kamera, [0, 1.5, 0]));
} };

M.tafel({ y: 166, links: { team: "a", einheit: "€" }, rechts: { team: "b", einheit: "€" }, werte: (t) => ({ a, b }), uhr: { ein: "Was", zeit: (t) => … } });
M.folgen({ ein: "Folg", dauer: 1.8 });
M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });
M.schleife({ ab: T("Was#2") - 0.3 });

const zl = new Zeitleiste(buehne); zl.shot(0, welt);
const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
window.renderAt = (t) => { zl.zeichne(t, Math.round(t * 30)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) });
window.renderAt(0); window.__fertig = true;
```
Alles muss eine reine Funktion von `t` sein (jedes Bild einzeln renderbar). Werte für Zähler und Objekte kommen aus der getesteten Rechnung.

## Render und Mux
```bash
cd pipeline
node render.js projekte/<name> --zeiten 0.5,8,20,30,45,55,70 --worker 1            # Standbilder (PNG) zur Abnahme
node render.js projekte/<name> --worker 2                                           # alle Bilder (JPG), fortsetzbar mit --nur-fehlende
./mux.sh projekte/<name>                                                            # → out/<name>/<name>.mp4, −14 LUFS
```
Andere Prozesse mit Vorrang: `nice -n 15` voranstellen und `--worker 1`. Windows-PC: `--gpu`.

**Gemessene Renderzeiten der Demo-Szenen:** `stile.md`. Ziel ≤ 3 s/Bild im echten Video; wird es mehr: `msaa=0` (FXAA reicht meist), Schatten 1024, Spiegelung `aufloesung 0.22`, Nebellagen weglassen, mehr `buendeln`.

## Posting (vollautomatisch, nach bestandener Prüfung)
```bash
python3 post_buffer.py --video out/<name>/<name>.mp4 --kanal simulierbar --zeit auto:2026-11-05:mittag \
  --text "Parkhaus oder Parkplatz suchen? 🅿️ Ich hab's simuliert. Team Parkhaus oder Team Suchen? 👇 #parken #autofahren #geld #wissen #simulation" --trocken
python3 post_buffer.py … (ohne --trocken)          # plant in Buffer ein, kein KI-Label (Standard)
python3 post_buffer.py --nachpruefen                # nach dem Posten: öffentlich, Länge, danach Supabase-Datei löschen
```
Caption-Format genau nach `CLAUDE.md` (eine Zeile, ca. 150 Zeichen + 5 Hashtags, kein #fyp/#viral, keine Quellen). Posting-Zeiten aus `data/plan/posting_zeiten.json` (Mo–Fr 12:30/19:30, Sa–So 09:30/19:30).
