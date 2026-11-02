---
typ: anleitung
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/technik.md, .claude/skills/simulierbar-video/SKILL.md (Neuregeln 02.11.2026 abends), CLAUDE.md §4, CLAUDE.md §7, CLAUDE.md §10
tags: [konto/simulierbar, technik, three-js, szenenbau, render, mux, posting, pipeline]
cssclasses: [konto-simulierbar, typ-anleitung]
---

# Technik und Szenenbau Simulierbar

Baukasten, Dateien, Szenengerüst, Render, Mux und Posting-Befehle für `@simulierbar`. Look je Stil: [[Stile 17 bis 21]]. Licht-Funktionen: [[Licht und Atmosphäre Simulierbar]]. HUD-Bausteine: [[Design und Layout Simulierbar]]. Rhythmus, Modelle, Agenten: [[Produktion Rhythmus und Modelle]].

## Werkzeug-Regeln
- **Nur Three.js und/oder Blender** (31.10.; auch kombiniert: Blender backen → glTF → Three.js, ca. 0,9 s/Bild). Keine anderen Video-, Vorlagen- oder KI-Generatoren (keine KI-Bild- oder Video-Generatoren). HUD, Untertitel, Karten sind HTML/CSS in der Three.js-Seite; Cycles nur für Standbilder, Logo, Kurzszenen. Referenz: github.com/stochosfrance/lowpoly-reel (MIT).
- Nur Assets und Schriften mit freier Lizenz (Lizenzdatei ablegen). Keine echten Banknoten- oder Münzmotive, keine Marken; Banknoten und Münzen nur in eigener, neutraler Gestaltung.
- **Blender:** `bpy` 5.2.3 in der Cloud (`/home/user/.venv-blender`; nach Container-Neustart neu: `python3 -m venv ~/.venv-blender && ~/.venv-blender/bin/pip install bpy==5.2.3`). Cycles nur CPU (130–300 s je Bild), Eevee unbrauchbar; ganze Videos in Blender-Optik nur über Bake → glTF → Three.js oder auf dem PC mit GPU.
- Alles muss eine **reine Funktion von `t`** sein (jedes Bild einzeln renderbar). Werte für Zähler und Objekte kommen aus der getesteten Rechnung.
- Pipeline-Kette (seit 02.11. abends): **Skript liegt vor** (Ideen-Studio) + Eingangsprüfung (GELD, Themen-Logik, keine 1:1-Kopie) → Rechnung als Code mit Tests (`pipeline/sim/`), Abweichungen melden → `skript.json` + Regie-Text (Quellen nur intern) → Stimme, Tempo prüfen → Szene in Three.js → Standbilder gegen die Qualitätslatte prüfen, Rendern → Ton/Mix → Prüfung → Buffer, `--nachpruefen`. Werkzeuge: `pipeline/README.md`.

## Ablauf je Video (Zeit: Schätzung)
| # | Schritt | Zeit |
|---|---|---|
| 0 | **Skript liegt vor** (ArtifactData-Sammlung `skripte` des Ideen-Studios, Dokument-ID `acc1-JJJJ-MM-TT-mittag\|abend`, oder vom Inhaber eingefügt); Eingangsprüfung: GELD, Themen-Logik, Ausschlussthemen, Wörter 150–190, keine 1:1-Kopie; Übernahme inhaltlich 1:1 ([[Videoaufbau Simulierbar]] Abschnitt 5.2) | 20–30 Min. |
| 1 | **Rechnung** als Code mit Tests in `pipeline/sim/<thema>.mjs` (Netto-Modul `pipeline/sim/netto.mjs` für deutsche Gehaltsrechnungen), aus `rechenweg`, `zahlen`, `annahmen`; Quellen nur intern; liefert Zählerverläufe, Führungswechsel, Ergebnis, „Warum?“-Faktoren, zweite Überraschung; Abweichung zum Skript = Meldung | 30–60 Min. |
| 2 | **Stil und Teamfarben** aus dem Skript ableiten ([[Stile 17 bis 21]] Wahlregeln), Begründung in `stil_begruendung`; **Beat-Blatt** (Effekt, Kamera, Licht je Segment, [[Videoaufbau Simulierbar]] Abschnitt 6) | 20 Min. |
| 3 | **`skript.json`** `projekte/<name>/skript.json` mit `"skill": "simulierbar-video"`, `"stil": "<Nr> <Name>"`, `stil_begruendung`, `teamfarben`, Segmenten (`text` + `sprechtext`), `bild_text_abgleich`, Caption, `lern_notizen` (Regie-Text [[Stimme und Ton Simulierbar]]) | 30 Min. |
| 4 | **Stimme**: `python3 tts.py projekte/<name>` → `audio/stimme.mp3` + `audio/timing.json`; sofort `qc/massstab.py` für Wörter/Tempo/Satzpausen (zu viele Wörter oder zu langsam = Text kürzen, nicht Stimme beschleunigen) | 5–10 Min. |
| 5 | **Szene** `szene.html` + `szene.js` aus dem Gerüst unten: Welt im Stil-Baukasten, Licht und Atmosphäre, Kamera-Regie, HUD, Effekte nach dem Beat-Blatt. Fehlende Objekte im Stil-Modul ergänzen (wiederverwendbar) | 2–4 Std. |
| 6 | **Standbilder** an 6–8 Schlüsselstellen (Hook, Regeln, Wendung, Ergebnis, Warum, Schluss) rendern, gegen Design, **Qualitätslatte** und Skript-Bild-Abgleich prüfen, nachbessern | 20–40 Min. |
| 7 | **Render** über den Render-Dienst auf dem Windows-PC (unten); bei Exit 3 Rückfall Cloud | PC: Minuten; Cloud ca. 1–3 Std. Rechenzeit |
| 8 | **Prüfung** ([[Prüfung und Abnahme Simulierbar]]): Skripte + Kontaktbogen + Sichtprüfung inkl. Qualitätslatte, Spannungskurve, Variation; wirkt etwas billig, wird die Abnahme verweigert | 20 Min. |
| 9 | **Posting** über `post_buffer.py --kanal simulierbar --zeit auto:<datum>:<slot>` mit Caption (aus dem Skript-Dokument, gegen das Format geprüft), ohne KI-Label; nach dem Posten `--nachpruefen` | 5 Min. |

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
| `pipeline/engine/stil_blaupause.js` | Stil 13: „Warum?“-Einschub oder Hauptstil |
| `pipeline/engine/stil_lowpoly.js`, `iso.js`, `stil_clay.js`/`stil_clay_welt.js`, `stil_flat.js`, `stil_collage.js`, `stil_comic.js`, `stil_glas.js` (mit `kern.js`, `bausteine.js`, `licht.js`) | Video-Baukästen der Stile 1, 2, 3, 4, 6, 12, 14 (wieder erlaubt, Qualitätslatte in [[Stile 17 bis 21]]); Demos aller Stile 1–15 in `pipeline/stile/` |
| `pipeline/projekte/_demo-simulierbar/` | Muster: `szene.js` (gemeinsames Gerüst), `welten/<stil>.js` (je Stil eine Welt), `?stil=…` |

Neue Objekte (Zapfsäule, Brotdose, Waschmaschine …) gehören ins Stil-Modul, mit geteilten Materialien und `userData.dynamisch` für bewegte Teile. Keine fremden Assets ohne freie Lizenz.

## Projektordner und `skript.json`
`pipeline/projekte/<name>/`: `skript.json`, `audio/` (stimme.mp3, timing.json, ereignisse.json), `szene.html`, `szene.js`; Rechnung mit Test in `pipeline/sim/<name>.mjs`.

`skript.json`: `titel`, `skill`, `konto`, `stil` (`"<Nr> <Name>"`, Nr 1–15 oder 17–21), `stil_begruendung`, `teamfarben`, `klangteppich`, `segmente` (`id`, `phase`, `text` = Untertitel, `sprechtext` = Regie-Text), `bild_text_abgleich` (zugleich Beat-Blatt), `caption`, `quellen` und `annahmen` (nur intern), `skript_quelle` (Dokument-ID im Ideen-Studio bzw. „vom Inhaber eingefügt“), **`lern_notizen`** (für die Lernschleife, unten). Das Skript selbst liefert das Ideen-Studio (ArtifactData-Sammlung `skripte`, Felder `konto`, `datum`, `slot`, `titel`, `thema`, `skript`, `rechenweg`, `zahlen`, `annahmen`, `quellen`, `caption`, `status`).
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
  "caption": "…", "quellen": ["…"], "skript_quelle": "acc1-2026-11-03-mittag",
  "lern_notizen": {
    "thema": "Spurwechsel im Stau", "frage": "Wer ist im Stau wirklich schneller?", "laenge_s": 71.2,
    "hook": "Spur wechseln – oder bleiben? Wer ist im Stau WIRKLICH schneller?", "hook_typ": "Duell-Frage",
    "stil": "18 Dunkles Studio (Produktlicht)", "zoom": "ja bei Wendung 1 und Ergebnis, sonst Fahrt/Schärfenverlagerung",
    "animationen": [{"t": 2.0, "art": "kamerafahrt", "was": "Dolly vor auf beide Schalen"}, {"t": 22.5, "art": "zoom+lichtwechsel", "was": "Wendung 1"}],
    "licht": "Spot-Wechsel auf Anna bei Wendung 1, Strahlen steigen bis zum Ergebnis", "effekte": ["glow-puls Sieger bei 42,3 s", "zoomwisch bei 30,0 s"],
    "zeitpunkte": {"folgen": 20.3, "wendung_1": 22.5, "ergebnis": 42.3, "warum": 45.0, "pointe": 60.1},
    "tempo": {"woerter": 172, "wps": 2.31}, "caption": "…", "besonderheiten": "…"
  }
}
```
**`lern_notizen`** hält fest, was die Lernschleife (täglich 20:00 Berlin, [[Lernschleife und Insights]]) später mit den Buffer-Zahlen verknüpft: Thema und Frage, Länge, Hook-Formulierung und -typ, Stil, Animationen (Art und Zeitpunkt in Sekunden), Zoom ja/nein, Licht und Effekte mit Zeitpunkt, Zeitpunkte (Folgen-Aufruf, Wendungen, Ergebnis, „Warum?“, Pointe), Wörter und Tempo (aus `qc/massstab.py`), Caption. Zeiten kommen aus `audio/timing.json` und `audio/ereignisse.json`, nicht geschätzt. Ausfüllen nach der Abnahme, vor dem Posten.

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
- [[Lernschleife und Insights]] · [[Claude-Chat-Workflow]] · [[Befehl Ideen und Skripte Simulierbar]] · [[Regelwerk Simulierbar]]
