---
typ: anleitung
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/technik.md, .claude/skills/simulierbar-video/SKILL.md, CLAUDE.md §4, CLAUDE.md §7, CLAUDE.md §10
tags: [konto/simulierbar, technik, three-js, szenenbau, render, mux, posting, pipeline]
---

# Technik und Szenenbau Simulierbar

Baukasten, Dateien, Szenengerüst, Render, Mux und Posting-Befehle für `@simulierbar`. Look je Stil: [[Stile 17 bis 21]]. Licht-Funktionen: [[Licht und Atmosphäre Simulierbar]]. HUD-Bausteine: [[Design und Layout Simulierbar]]. Rhythmus, Modelle, Agenten: [[Produktion Rhythmus und Modelle]].

## Werkzeug-Regeln
- **Nur Three.js und/oder Blender** (31.10.; auch kombiniert: Blender backen → glTF → Three.js, ca. 0,9 s/Bild). Keine anderen Video-, Vorlagen- oder KI-Generatoren (keine KI-Bild- oder Video-Generatoren). HUD, Untertitel, Karten sind HTML/CSS in der Three.js-Seite; Cycles nur für Standbilder, Logo, Kurzszenen. Referenz: github.com/stochosfrance/lowpoly-reel (MIT).
- Nur Assets und Schriften mit freier Lizenz (Lizenzdatei ablegen). Keine echten Banknoten- oder Münzmotive, keine Marken; Banknoten und Münzen nur in eigener, neutraler Gestaltung.
- **Blender:** `bpy` 5.2.3 in der Cloud (`/home/user/.venv-blender`; nach Container-Neustart neu: `python3 -m venv ~/.venv-blender && ~/.venv-blender/bin/pip install bpy==5.2.3`). Cycles nur CPU (130–300 s je Bild), Eevee unbrauchbar; ganze Videos in Blender-Optik nur über Bake → glTF → Three.js oder auf dem PC mit GPU.
- Alles muss eine **reine Funktion von `t`** sein (jedes Bild einzeln renderbar). Werte für Zähler und Objekte kommen aus der getesteten Rechnung.
- Pipeline-Kette: Thema + Konkurrenz-Check + Themen-Logik → Rechnung als Code mit Tests (`pipeline/sim/`) → Skript + Regie-Text (`skript.json`, Quellen nur intern) → Stimme → Szene in Three.js → Standbilder prüfen, Rendern → Ton/Mix → Prüfung → Buffer, `--nachpruefen`. Werkzeuge: `pipeline/README.md`.

## Ablauf je Video (Zeit: Schätzung)
| # | Schritt | Zeit |
|---|---|---|
| 1 | **Thema** aus `data/plan/30-tage.csv` (Stil und Teamfarben stehen dort), Konkurrenz-Check ([[Sperrliste und Auswahlregeln Simulierbar]]), Themen-Logik prüfen | 15 Min. |
| 2 | **Rechnung** als Code mit Tests in `pipeline/sim/<thema>.mjs` (Netto-Modul `pipeline/sim/netto.mjs` nutzen), Quellen nur intern; liefert Zählerverläufe, Führungswechsel, Ergebnis, „Warum?“-Faktoren, zweite Überraschung | 30–60 Min. |
| 3 | **Skript** `projekte/<name>/skript.json` mit `"skill": "simulierbar-video"`, `"stil": "<Nr> <Name>"`, `stil_begruendung`, Segmenten (`text` + `sprechtext`), `bild_text_abgleich`, Caption (Vorlage [[Videoaufbau Simulierbar]], Regie-Text [[Stimme und Ton Simulierbar]]) | 30 Min. |
| 4 | **Stimme**: `python3 tts.py projekte/<name>` → `audio/stimme.mp3` + `audio/timing.json` | 5 Min. |
| 5 | **Szene** `szene.html` + `szene.js` aus dem Gerüst unten: Welt im Stil-Baukasten, Licht und Atmosphäre, Kamera-Regie, HUD. Fehlende Objekte im Stil-Modul ergänzen (wiederverwendbar) | 2–4 Std. |
| 6 | **Standbilder** an 6–8 Schlüsselstellen (Hook, Regeln, Wendung, Ergebnis, Warum, Schluss) rendern, gegen Design, Stile und Skript-Bild-Abgleich prüfen, nachbessern | 20–40 Min. |
| 7 | **Render** über den Render-Dienst auf dem Windows-PC (unten); bei Exit 3 Rückfall Cloud | PC: Minuten; Cloud ca. 1–3 Std. Rechenzeit |
| 8 | **Prüfung** ([[Prüfung und Abnahme Simulierbar]]): Skripte + Kontaktbogen + Sichtprüfung | 20 Min. |
| 9 | **Posting** über `post_buffer.py --kanal simulierbar --zeit auto:<datum>:<slot>` mit Caption, ohne KI-Label; nach dem Posten `--nachpruefen` | 5 Min. |

## Dateien
| Datei | Inhalt |
|---|---|
| `pipeline/engine/sim_atmosphaere.js` | `SimBuehne`, `GRADING`, `SIM_POST`, Umgebungen (`UMGEBUNG.studio/nacht/abend/labor`, `umgebung`), Rigs (`rigStudio`, `rigNacht`, `rigAbendsonne`, `rigLabor`, `flaechenLicht`), `lichtKegel`, `lichtBahn`, `lichtPfuetze`, `nebelSchicht`, `dunst`, `staub`, `spiegelBoden`, `leuchtMat`, `glimmLinie`, `fokus`, `lichtFarbe`, `rauschTextur`, `buendeln`, `aktualisiere` |
| `pipeline/engine/stil_nachtstadt.js` | Stil 17: `fassadenAtlas`, `gebaeude`, `strassenBoden`, `laterne`, `autoNacht`, `lichtSpur`, `parkhaus`, `skyline`, `baumNacht`, `himmelNacht` |
| `pipeline/engine/stil_studio.js` | Stil 18: `hohlkehle`, `wandLicht`, `muenzMaterial`, `muenzStapel`, `scheinBuendel`, `sockel`, `waage` |
| `pipeline/engine/stil_architektur.js` | Stil 19: `modellAtlas`, `modellPlatte`, `modellHaus`, `schnittHaus`, `acrylMarker`, `modellBaum`, `modellFigur`, `abendWand`, `MODELL` |
| `pipeline/engine/stil_lichtlabor.js` | Stil 20: `glasGefaess`, `glasMaterial`, `kaustik`, `laborBank`, `gegenlichtWand`, `laborZeit` |
| `pipeline/engine/stil_nachtkarte.js` | Stil 21: `reliefKarte` (mit `.hoehe(x, z)`), `stadtLichter`, `strassenNetz`, `route`, `ortsMarke`, `wolkenSchicht`, `karteZeit` |
| `pipeline/engine/sim_hud.css` | seriöses HUD-Thema ([[Design und Layout Simulierbar]]), wirkt mit `#hud.sim` |
| `pipeline/engine/massstab.js`, `regie.js`, `zeitplan.js`, `zeitleiste.js`, `bewegung.js`, `hud.js` | Maßstab-Bausteine, Kamera-Regie, Wortzeiten, Einstellungen/Übergänge, Easing, Untertitel (unverändert, `pipeline/README.md`) |
| `pipeline/engine/stil_blaupause.js` | nur für den „Warum?“-Einschub |
| `pipeline/projekte/_demo-simulierbar/` | Muster: `szene.js` (gemeinsames Gerüst), `welten/<stil>.js` (je Stil eine Welt), `?stil=…` |

Neue Objekte (Zapfsäule, Brotdose, Waschmaschine …) gehören ins Stil-Modul, mit geteilten Materialien und `userData.dynamisch` für bewegte Teile. Keine fremden Assets ohne freie Lizenz.

## Projektordner und `skript.json`
`pipeline/projekte/<name>/`: `skript.json`, `audio/` (stimme.mp3, timing.json, ereignisse.json), `szene.html`, `szene.js`; Rechnung mit Test in `pipeline/sim/<name>.mjs`.

`skript.json`: `titel`, `skill`, `konto`, `stil`, `stil_begruendung`, `teamfarben`, `klangteppich`, `segmente` (`id`, `phase`, `text` = Untertitel, `sprechtext` = Regie-Text), `bild_text_abgleich`, `caption`, `quellen` (nur intern).
```json
{
  "titel": "…", "skill": "simulierbar-video", "konto": "simulierbar",
  "stil": "18 Dunkles Studio (Produktlicht)", "stil_begruendung": "…",
  "teamfarben": {"Paul": "#FF8A3D", "Anna": "#3D8BFF"}, "klangteppich": "raum",
  "segmente": [
    {"id": "hook", "phase": "hook",
     "text": "Spur wechseln oder bleiben? Wer ist im Stau wirklich schneller?",
     "sprechtext": "Spur wechseln – oder bleiben?\n[curious] Wer ist im Stau WIRKLICH schneller?",
     "bild_text_abgleich": [{"gesagt": "…", "bild": "…"}]}
  ],
  "caption": "…", "quellen": ["…"]
}
```

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

const Q = new URLSearchParams(location.search), MSAA = Q.has("msaa") ? +Q.get("msaa") : 0, SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
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
rigStudio(szene, buehne.renderer, { … });            // Licht (siehe Licht-Notiz)
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

## Render und Mux
**Standard: Render-Dienst auf dem Windows-PC des Inhabers** (GPU; `pipeline/render_dienst/`, `docs/18-render-pc.md`; Arbeit bleibt in der Cloud, nur das Rendern läuft auf dem PC, Details [[Render-Dienst Windows-PC]]):
```bash
cd pipeline
node render.js projekte/<name> --zeiten 0.5,8,20,30,45,55,70 --worker 1           # Standbilder (PNG) zur Abnahme, in der Cloud
# Projekt inkl. audio/stimme.mp3 + audio/timing.json committen und pushen (der PC sieht nur GitHub), dann:
python3 render_dienst/auftrag.py senden <name> --konto simulierbar                 # Exit 3 = PC offline → Cloud-Render (unten)
python3 render_dienst/auftrag.py warten                                            # im Hintergrund starten (run_in_background): kostet beim Warten nichts, holt out/<name>/<name>.mp4
```
Exit-Codes von `senden`/`warten`: 0 ok · 1 Fehler · 2 Voraussetzung fehlt (nicht gepusht/committet, Stimme fehlt) · 3 PC offline oder ausgefallen · 4 Zeitlimit · 5 keine GPU.

**Rückfall Cloud-Render** (nur bei Exit 3, vorher offenen Auftrag mit `python3 render_dienst/auftrag.py aufraeumen --alles` entfernen, sonst rendert der PC beim Wiederkommen doppelt):
```bash
node render.js projekte/<name> --worker 2                                           # alle Bilder (JPG), fortsetzbar mit --nur-fehlende
./mux.sh projekte/<name>                                                            # → out/<name>/<name>.mp4, −14 LUFS
```
Andere Prozesse mit Vorrang: `nice -n 15` voranstellen und `--worker 1`. Nie mehr als 2 Render-Prozesse gleichzeitig. Gemessene Renderzeiten der Demo-Szenen (Cloud, ohne GPU): [[Stile 17 bis 21]]. Ziel ≤ 3 s/Bild beim Cloud-Rückfall; wird es mehr: Spiegelung aus bzw. `aufloesung 0.18`, Schatten 1024, Nebellagen weglassen, mehr `buendeln`. Auf dem PC mit GPU unkritisch: **gemessen 02.11. (RTX 2070): 0,04 s/Bild statt ca. 3,4 s in der Cloud, ganzes Video samt Ton und Übertragung ca. 3 Min.** (Fußgängerampel, 1.988 Bilder: Dauer und −14,0 LUFS identisch zum Original, Bild gleich; Simulierbar-Weg mit Git Bash getestet). **Die Stile 17–21 sind noch nicht auf der GPU gemessen.** `render.js` heilt Hänger selbst (Screenshot-Timeout 30 s → Browser neu, 3 Versuche; auf der GPU alle 600 Bilder neuer Browser); ein Hänger tritt in `render_pc/log.txt` als „Browser neu öffnen“ auf. Offen (Stand 02.11.): Autostart und Energieoptionen des PCs nach `docs/18-render-pc.md` Schritt 8/9.

## Posting (vollautomatisch, nach bestandener Prüfung)
```bash
python3 post_buffer.py --video out/<name>/<name>.mp4 --kanal simulierbar --zeit auto:2026-11-05:mittag \
  --text "Parkhaus oder Parkplatz suchen? 🅿️ Ich hab's simuliert. Team Parkhaus oder Team Suchen? 👇 #parken #autofahren #geld #wissen #simulation" --trocken
python3 post_buffer.py … (ohne --trocken)          # plant in Buffer ein, kein KI-Label (Standard)
python3 post_buffer.py --nachpruefen                # nach dem Posten: öffentlich, Länge, danach Upload-Datei im Zwischenspeicher löschen
```
- **Caption-Format genau (eine Zeile, TikTok und YouTube gleich, 31.10.):** `Hook-Frage mit Suchbegriff? Emoji Ich hab's simuliert. (bzw. durchgerechnet.) Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation`. Ca. 150 Zeichen + 5 Hashtags, kein #fyp/#viral/#foryou, keine Quellen, Annahmen, Hinweise („Stimme: KI“, „keine Anlageberatung“). Beispiel: „Früh einordnen oder bis zum Ende fahren? 🚗 Ich hab's simuliert. Team früh oder Team Reißverschluss? 👇 #reißverschlussverfahren #stau #autofahren #wissen #simulation“.
- **Posting-Zeiten** (Europe/Berlin, `data/plan/posting_zeiten.json`): Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30; Slots `mittag`/`abend`. Nach 14 Tagen mit Zahlen aus TikTok Studio nachjustieren.
- Erwartung beim Planen: Status `scheduled`, sonst Exit 2. Der Inhaber kann Posts in Buffer bis zum Zeitpunkt löschen.
- **Dateigröße:** ≤ 50 MB je Datei im privaten Zwischenspeicher (Frankfurt, Gratis-Plan), ab 48 MB automatische Upload-Kopie; Buffer holt die Datei zur Posting-Zeit, gelöscht wird sie erst nach `--nachpruefen`. Log `pipeline/out/buffer_log.jsonl` nur im Container. Per API nicht setzbar: Markeninhalt, Sichtbarkeit, Kommentare, Duett/Stitch (daher `--nachpruefen`).
- **Kennzeichnung:** kein KI-Label (Standard); nur bei realistisch wirkenden KI-Inhalten (Stimme einer echten Person, fotorealistische KI-Bilder) Label AN mit `--ki-label`. Manueller Rückfall: TikTok Studio Web (Markeninhalt AUS, kein KI-Label). Verboten: Skripte/Browser-Bots in TikTok Studio, Cookie-Uploader, eigene unauditierte API-App.
- Mehr zu Buffer, Nachprüfung und Kennzeichnung: [[Plattformregeln und Posting]].

## Siehe auch
- [[Stile 17 bis 21]] · [[Licht und Atmosphäre Simulierbar]] · [[Design und Layout Simulierbar]] · [[Stimme und Ton Simulierbar]] · [[Prüfung und Abnahme Simulierbar]]
- [[Render-Dienst Windows-PC]] · [[Produktion Rhythmus und Modelle]] · [[Plattformregeln und Posting]] · [[Account Simulierbar Überblick]]
