---
typ: anleitung
konto: stelldirvor
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/stelldirvor-video/technik.md
tags: [konto/stelldirvor, technik, render, posting]
cssclasses: [konto-stelldirvor, typ-anleitung]
---

> Quelle bis 06.11.: `.claude/skills/stelldirvor-video/technik.md` (Skill am 06.11. entfernt). Seitdem wird diese Notiz direkt gepflegt; `tools/hirn_aus_skills.py` ist stillgelegt. Produktion: Skill `video-produktion`, Teil `stelldirvor.md`; neuere Regeln: [[REA stelldirvor Regelwerk]].

# Technik und Szenenbau Account 2

*Technik: Baukasten, Szenengerüst, Render, Mux, Posting*

## Dateien
| Datei | Inhalt |
|---|---|
| `pipeline/engine/stil_lunar_pov.js` | Welt und Effekte: `aktiviereHoehenNebel`, `Himmel`, `Glut`, `Puffs` + `wolkenFeld`, `rauchSaeule`, `staubWand`, `feuerBall`, `puffStrahl`; `Partikel` (staub, asche, schnee, eis, regen, funken); `Truemmer`; `Menschen`, `Autos`, `Voegel`; `vordergrund` (holz, metall, glas, beton, fenster); `PovKamera`; `PHASE`, `farbPhasen`; `huelle`, `blitzKurve`; `Protokoll` |
| `pipeline/engine/lunar_hud.js` | `LunarHUD` (Titel, Anzeige mit Etikettwechsel, Sätze, Abblende, Abspann, Vignette, `glas`, `flecken`, `tropfen`, `ereignisse()`, seit 08.11. Option `hinweis` = Folgen-Hinweis im Abspann nur im Testblock „mit“), `LP_ZEITEN`, `zahlDE`, `uhrzeit`, seit 08.11. `lpZeitenFuer(L)` (Zeiten für 62–70 s, Testblock c) und `lpSkala(t, L)` (Zeitpunkt aus dem 80-s-Plan umrechnen) |
| `pipeline/engine/stil_lunar_pov.css` | gemessene Maße und Farben, Schriften (Crimson Pro, Inter; OFL-Texte in `engine/schriften/`) |
| `pipeline/engine/kern.js` | Nachbearbeitung: Bloom, ACES, Farbe; neu: `tiefe` (Tiefenunschärfe), `flimmern` (Hitze), `schleier` (Staub/Weißblende) |
| `pipeline/atmo.py` | Atmo-Spur ohne Stimme aus `ton.json` + Protokoll |
| `pipeline/qc/referenz_pov.py`, `pipeline/qc/text_ueberlappung_pov.mjs` | Prüfung (siehe [[Prüfung und Abnahme Account 2]]) |
| `pipeline/engine/welt_grossstadt_dach.js` | einzige fertige Welt (Großstadt-Dach, Erstbau „Eiszeit Toronto“); weitere Welttypen des Weltenkatalogs entstehen beim Erstbau, Schwächen der Dach-Welt siehe [[Account stelldirvor.pov Überblick]] (Lehre 02.11.) |
| `pipeline/projekte/_demo-lunar-pov/` | vollständiges Muster (Demo, nicht posten) |

## Projektordner
`projekte/<name>/`: `szene.html` (lädt `hud.css` + `stil_lunar_pov.css`, Importmap für three), `szene.js`, `skript.json` (Titelfrage, Rechnung, Anzeige-Phasen, Sätze, `bild_text_abgleich`, Faktenzeile, Quellen, Caption; **kein** `segmente`-Feld → `render.js` schreibt keine Stimm-Schätzung; seit 02.11. abends zusätzlich `skript_id`, `welt`, `standpunkt`, `tageszeit_verlauf`, **`zeitraffer`**, **`bewegungsplan`**, **`lern_notizen`**, Aufbau in [[Ablauf Account 2]] „Skript-Anforderungen“), `ton.json`. Rechnung mit Test in `pipeline/sim/<name>.mjs`. Das Skript kommt aus dem Ideen-Studio (ArtifactData-Sammlung `skripte`, Dokument-ID `acc2-JJJJ-MM-TT-mittag|abend`) oder vom Inhaber; Titelfrage, Sätze, Faktenzeile werden 1:1 übernommen.

## Szenengerüst (`szene.js`)
```js
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { smoothstep, ease } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, rauchSaeule, staubWand, Partikel, Truemmer, Menschen, Autos, Voegel,
  vordergrund, PovKamera, farbPhasen, blitzKurve, Protokoll } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE, uhrzeit } from "../../engine/lunar_hud.js";

aktiviereHoehenNebel({ abfall: 0.00045 });                       // vor dem ersten Material!
const buehne = new Buehne(leinwand, { msaa: 0, schatten: true, tiefe: true });
await document.fonts.load("400 80px 'Lunar Serif'"); await document.fonts.load("600 22px 'Lunar Sans'"); await document.fonts.ready;
const szene = new THREE.Scene(); szene.fog = new THREE.FogExp2("#AAB8CB", 3.6e-5);
const kam = new THREE.PerspectiveCamera(52, 1080 / 1920, 0.1, 40000);
const pov = new PovKamera(kam, { pos: AUGE, ziel: BLICK, fov: 52 }).atmen()
  .bewegung([{ t: 30, pos: AUGE_2 }])                  // langsame Fahrt (weich, Ease inOutSine) – erlaubt und gewollt, keine harten Schnitte
  .blick([{ t: 24, ziel: BLICK_2 }])                   // Schwenk, folgt dem Geschehen
  .beben({ von, bis, staerke: 0.2 }).stoss({ t: T_HIER, staerke: 1.6 }).kippen({ t: T_HIER + 0.1, roll: 13 });
const himmel = new Himmel(szene, { zenit, horizont, sonnenRichtung, zirren: 0.5 });
// … Gelände, Licht (Hemisphere + Directional mit Schatten), Häuser/Bäume als InstancedMesh, vordergrund(szene, { art, pos: AUGE, ziel: BLICK, abstand: 3 })
const puffs = new Puffs(szene, { max: 900 });                    // eine Instanz für alle normalen Puffs (gemeinsam sortiert)
const farben = farbPhasen([{ t: 0, phase: "alltag" }, { t: 47, phase: "staub" }, { t: T_HIER, phase: "staubwand" }, { t: T_HIER + 2.5, phase: "staub" }]);
const prot = new Protokoll(); prot.effekt(T_HIER, "druckwelle").effekt(T_HIER + 1.4, "tinnitus", { dauer: 8 });
const welt = { szene, kamera: kam, post: {}, update(t) {
  pov.anwenden(t); himmel.folge(kam); szene.fog.color.copy(himmel.horizont);
  puffs.setze([...saeule(t), ...wand.puffs(t)], kam);            // nach pov.anwenden (Sortierung braucht die Kamera)
  Object.assign(welt.post, farben(t), { schleierStaerke: …, vignette: 0, koernung: 0.008 });
} };
const hud = new LunarHUD(document.getElementById("hud"), { titel, fakt, saetze: [[4.8, "…"], …], anzeige: (t) => ({ etikett, zahl, einheit, unter, wert }) });
hud.glas({ t: T_HIER + 0.2 }); hud.flecken({ von: T_HIER + 0.4, bis: 71 });
window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * 30), t }); hud.at(t); };
window.hudAt = (t) => hud.at(t);
window.dauer = 80; window.ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
window.massstab = { version: 2, format: "referenz_pov", untertitel: null }; window.klangteppich = "keiner";
window.__fertig = true;
```
Kamera (02.11. abends): **Fahrt** = `bewegung()`, **Schwenk** = `blick()`; ein **Zoom** über die Brennweite ist im Baukasten noch nicht animierbar (`fov` ist fest), bis dahin Fahrt nach vorn bzw. zurück. `PovKamera.ereignisse()` meldet bisher nur beben, stoss, kippen; Fahrt, Schwenk und Zoom stehen in `skript.json → lern_notizen → kamera` (Ausbau des Baukastens: Protokoll-Einträge `typ: "kamera", art: "fahrt|schwenk|zoom"` und `zoom({ t, von, bis, fov })`, Opus-Aufgabe). Der Zeitraffer wird über `simZeit(t)` gebaut ([[Licht und Effekte Account 2]] §6).

Regeln: alles ist eine Funktion von `t` (feste Seeds, `hash()`), keine `Math.random()`, kein Zustand zwischen Bildern. Dieselbe Funktion treibt Bild, Anzeige und Ton (z. B. `hoeheBei` der Säule = Anzeige-Wert, `ankunft(x, z)` = Zeit, zu der die Front einen Ort erreicht → Bäume, Menschen, Trümmer, Klang).

## Render und Mux
```bash
cd pipeline
node render.js projekte/<name> --zeiten 1.5,8,15,22,30,38,46,54,60.7,65.5,76 --worker 2   # Standbilder der Phasen (mindestens 8 über 0–70 s, dazu je Sequenzwechsel) → out/<name>/standbilder/
node render.js projekte/<name> --worker 2                                      # alle 2.400 Bilder (abbrechbar, --nur-fehlende)
python3 atmo.py projekte/<name>                                                # Ton
TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>                              # → out/<name>/<name>.mp4 (H.264 CRF 18, AAC, −14 LUFS)
```
- Gemessen an der Demo (Cloud, 4 Kerne, SwiftShader, MSAA 0, Schatten 2048, Tiefenpuffer an): **2,5–3,1 s/Bild effektiv mit 2 Workern** → ca. 100–125 Min. für 80 s. Auf dem Windows-PC `--gpu` anhängen.
- Schnelle Probe: `--query "schatten=0"`.
- Ohne Ton (Sichtprüfung): `./mux.sh projekte/<name> --ohne-ton`.

## Posting (Buffer, ohne KI-Label, ohne Freigabe)
```bash
python3 post_buffer.py --video out/<name>/<name>.mp4 --kanal stelldirvor.pov --zeit auto:2026-11-04:mittag \
  --text "Was passiert, wenn …? 🌋 Ich hab's durchgespielt. Würdest du stehen bleiben? 👇 #a #b #c #wissen #waswaerewenn" --trocken
python3 post_buffer.py … (ohne --trocken)        # erst nach bestandener Prüfung (pruefung.md)
python3 post_buffer.py --nachpruefen             # nach dem Posten: öffentlich, Länge 80 s, KI-Label aus; Supabase-Datei löschen
```
- Kanal **`stelldirvor.pov`**, Slots `mittag`/`abend` aus `data/plan/posting_zeiten.json` (Mo–Fr 12:30/19:30, Sa–So 09:30/19:30).
- **Kein `--ki-label`** (Three.js-Bilder, keine Stimme). Nur wenn ein Video doch realistisch wirkende KI-Inhalte enthielte, wäre es Pflicht.
- Caption-Format siehe [[Ablauf Account 2]]; der Text kommt aus dem Skript (Feld `caption`).

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Format Account 2 Lunar]] · [[Ablauf Account 2]] · [[Design Account 2]] · [[Licht und Effekte Account 2]] · [[Ton Account 2]] · [[Prüfung und Abnahme Account 2]] · [[Themen und Plan Account 2]] · [[Konkurrenz-Check und Sperrliste Account 2]]

Account 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: [[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].
