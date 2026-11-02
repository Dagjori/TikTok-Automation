# Licht und Atmosphäre

Die Qualität entsteht aus Licht: ein Führungslicht mit Richtung, Kanten- bzw. Gegenlicht, das Formen vom Grund löst, sichtbare Luft (Dunst, Lichtstrahlen, Staub), Spiegelungen, Tiefenschärfe und ein Grading pro Stil. Alles kommt aus **`pipeline/engine/sim_atmosphaere.js`** (Simulierbar-Baukasten, ändert `kern.js` nicht). Jede Funktion ist deterministisch über `t`; `aktualisiere(t)` in `welt.update` aufrufen (das Demo-Gerüst macht das automatisch).

## 1. Bühne und Nachbearbeitung
```js
import { SimBuehne, GRADING, aktualisiere } from "../../engine/sim_atmosphaere.js";
const buehne = new SimBuehne(leinwand, { msaa: 2, schatten: true, tiefe: true });   // tiefe nur bei Tiefenschärfe
welt.post = { ...GRADING.nacht, belichtung: 1.2, tiltStaerke: 0.6 };             // Look je Stil, einzelne Werte überschreiben
```
`SimBuehne` = `Buehne` aus `kern.js` (Bloom, Tilt-Shift, Tiefenunschärfe, ACES, Sättigung/Kontrast, Vignette, Körnung, FXAA, alle Übergänge) **plus** Lichtstrahlen im Bildraum und Farbgrading. Zusätzliche `post`-Werte (`SIM_POST`):

| Wert | Wirkung | typisch |
|---|---|---|
| `strahlen` | Stärke der Lichtstrahlen (God Rays) aus hellen Stellen zur Quelle | 0,3–0,9 |
| `strahlenPunkt` / `strahlenQuelle` | Quelle als 3D-Punkt (wird je Bild projiziert, darf außerhalb des Bildes liegen) bzw. Bildpunkt in UV | Sonne × 60, Spot-Position |
| `strahlenSchwelle`, `strahlenLaenge`, `strahlenAbfall`, `strahlenMaske`, `strahlenFarbe` | welche Helligkeit strahlt, Länge, Abfall, Radius um die Quelle, Tönung | 0,8–1,4 · 0,55–0,85 · 0,96–0,97 |
| `lift`, `gamma`, `gain` | Schwarzwert anheben (Lift), Mitten, Lichter je Kanal | Lift ≤ 0,03 |
| `schattenTon`, `lichterTon`, `splitStaerke`, `splitBalance` | Split-Toning (Soft-Light) in sRGB: kühle Schatten, warme Lichter | Stärke 0,2–0,4 |

**Grading-Looks** (`GRADING`): `nacht` (17), `studio` (18), `abend` (19), `labor` (20), `karte` (21). Alle mit Bloom, Vignette 0,28–0,4 und feiner Körnung 0,018–0,024 (Filmkorn gegen Banding; nicht stärker, sonst flimmert es im Encoding).

## 2. Licht-Rigs
| Rig | Aufruf | Licht |
|---|---|---|
| Studio | `rigStudio(szene, renderer, { ziel, softbox:{farbe, staerke, breite, hoehe, pos}, oben:{staerke, pos, winkel, rand, schatten}, kanten:[{farbe, staerke, pos}] })` | Softbox als `RectAreaLight` (lange Streiflichter auf Metall/Glas), Spot von oben mit weichem Schatten, Kantenlichter von hinten (je Team eine leichte Tönung), Umgebung `studio` (Streifen-Softboxen in den Spiegelungen) |
| Nacht | `rigNacht(szene, renderer, { richtung, farbe, staerke, bereich, schatten, himmelStaerke, umgebungsStaerke })` | kühles Mondlicht mit Schatten, dunkles Himmelslicht, Umgebung `nacht` (warme und kühle Lichtpunkte → Spiegelung in nassem Asphalt). Praktische Lichter (Fenster, Laternen, Scheinwerfer) als HDR-Leuchtmaterial + Lichtfleck statt echter Punktlichter |
| Abendsonne | `rigAbendsonne(szene, renderer, { richtung, farbe, staerke, bereich, schatten, himmel, boden })` | tiefe warme Sonne (Höhe 0,2–0,35) mit langen Schatten, kühles Himmelslicht; Gegenlicht (Sonne hinter der Szene) wirkt am stärksten, dazu `strahlen` |
| Labor | `rigLabor(szene, renderer, { spots:[{pos, staerke, winkel}], kanten:[…] })` | schwarz, Spots über den Gefäßen, Kantenlichter, Umgebung `labor` (Gegenlicht-Wand für Glaskanten) |
| eigene Umgebung | `umgebung(renderer, { oben, horizont, unten, felder:[{pos, groesse, farbe, staerke}], schluessel })` | Kuppel + leuchtende Felder → PMREM (Spiegelungen) |
| Softbox einzeln | `flaechenLicht({ farbe, staerke, breite, hoehe, pos, ziel })` | Rechteck-Licht, kein Schatten |

Regel: **ein** klares Führungslicht pro Einstellung, Kante bzw. Gegenlicht für Trennung, Fülllicht sparsam (Schwärzen bleiben schwarz). Teamfarben als Licht: farbige Kantenlichter (leicht entsättigt, `lichtFarbe(farbe)`), LED-Kanten (`glimmLinie`), Lichtflecke (`lichtPfuetze`).

## 3. Sichtbare Luft
| Effekt | Aufruf | Hinweise |
|---|---|---|
| Luftperspektive | `dunst(szene, farbe, dichte)` | FogExp2; Nacht 0,02–0,03, Abend 0,015–0,025 |
| Volumenlicht unter Lampen/Spots | `lichtKegel({ hoehe, radiusOben, radiusUnten, farbe, staerke, weich, streifen })` → an die Lampenposition, zeigt nach −Y | additiv, weiche Ränder, Staubstreifen; Stärke 0,07–0,16 (zu stark wirkt wie Taschenlampe) |
| Lichtbahn durch eine Lücke | `lichtBahn({ laenge, breite, farbe, staerke })` | flaches Band, entlang der Sonnenrichtung drehen |
| Lichtstrahlen im Bild | `post.strahlen` (s. o.) | wirkt bei Gegenlicht und hellen Quellen im oder knapp am Bild |
| Lichtfleck am Boden | `lichtPfuetze({ radius, farbe, staerke, streckung, exponent })` | ersetzt Punktlichter (Laterne, Scheinwerfer, Ladenfenster, Teamfarbe unter Objekten) |
| Bodennebel | `nebelSchicht({ breite, tiefe, y, lagen, farbe, deckkraft, massstab, tempo })` | 2 Lagen, Deckkraft 0,05–0,1; kostet ca. 0,5 s/Bild bei Vollbild |
| Staub im Licht | `staub({ anzahl, bereich, mitte, groesse, staerke, aussen, kegel:{ spitze, richtung, winkel } })` | 300–700 Teilchen, `groesse` 0,01–0,02; mit `kegel` leuchten sie nur im Lichtkegel |
| HDR-Leuchten | `leuchtMat(farbe, staerke)`, `glimmLinie(a, b, { farbe, staerke, dicke })` | Werte > 1 lösen Bloom aus (Fenster 2–3, Lampe 6–9, LED 3–4) |

## 4. Spiegelungen
`spiegelBoden({ breite, tiefe, aufloesung: 0.28–0.3, staerke, streckung, unschaerfe, pfuetzen, massstab, fresnel, verzerrung })` legt eine echte Spiegelung (Three.js `Reflector`, kleine Auflösung, ohne Schattenkarte) additiv über den beleuchteten Boden:
- **Nasser Asphalt (17):** `staerke 1.1, streckung 3.2, pfuetzen 0.55` → senkrecht gezogene Lichter, Pfützen-Maske.
- **Studioboden (18):** `staerke 0.4, streckung 1.2, unschaerfe 1.4, fresnel 0.5` → weiche Spiegelung.
- **Laborbank (20):** in `laborBank({ spiegel: 0.55 })` enthalten.
Kosten ca. 0,2–1 s/Bild je nach Szene (zweiter Szenendurchgang). Metall und Glas spiegeln zusätzlich die Umgebung (`UMGEBUNG.*`).

## 5. Tiefenschärfe und Tilt-Shift
- **Tiefenschärfe** (Produktfoto-Look, 18–20): `new SimBuehne(…, { tiefe: true })` und je Bild `Object.assign(post, fokus(kamera, punkt, { tiefe: 0.14–0.2, nah: 0.5–0.6, fern: 0.7–0.85 }))`. **Schärfenverlagerung** = `punkt` über die Zeit von Seite A zu Seite B gleiten lassen (Wendung, Führungswechsel).
- **Tilt-Shift** (Miniatur-Look, 17 und 21): `post.tiltMitte 0.48–0.5, tiltBreite 0.3–0.38, tiltStaerke 0.55–0.6`; Fokus mit `fokusHoehe(punkt, kamera)` aus `stil_lowpoly.js` auf das Hauptobjekt legen.

## 6. Kamera-Regie (`pipeline/engine/regie.js`)
```js
const regie = new Regie(kamera, (t) => ({ pos, ziel, fov }), { zp });   // Grundbewegung: langsame Fahrt (Dolly/Kran), nie starr
regie.folge({ von: "Was", ziel: (t) => objekt.position.toArray(), glaettung: 0.1 });
regie.zoom({ t: "Aber", ziel: (t) => punkt, staerke: 0.35, halt: 0.4, rueck: 0.3 });   // Wendung
regie.atmen({ staerke: 0.008–0.015, tempo: 0.25 });                                     // ruhiges Atmen, kein Wackeln
regie.schleife({ ab: tSchluss, ende: dauer - 1 / 30 });                                  // letztes Bild = erstes Bild
regie.anwenden(t);                                                                         // in welt.update
```
Seriöse Kamerasprache: langsame, gleichmäßige Fahrten (Dolly vor, Kranfahrt, Parallaxe an Vordergrund vorbei), Schärfenverlagerung statt Schnitt, Zoom nur auf den entscheidenden Moment. **Kein `regie.stoss`** (Kamerastoß gehörte zu den Stickern). Hochformat: Brennweite eng (fov 28–34), Motive in die Tiefe staffeln.

## 7. Übergänge (`zl.shot(ab, welt, { typ, dauer })`)
Ruhig: `blende` (0,5–0,8 s), `iris` mit Lichtkante, `zoomwisch` (0,5 s) für „hinein“. `wolken`/`blasen` nur, wenn sie zur Welt passen (Nachtkarte: durch die Wolkenschicht). Jeder Übergang meldet sich im Protokoll (Ton).

## 8. Kosten (Cloud, 4 Kerne, ohne GPU)
Teuer: Spiegelung (zweiter Durchgang), MSAA, Schattenkarte, Nebellagen über das ganze Bild, viele Draw-Calls. Deshalb: **statische Teile mit `buendeln(szene)` zusammenfassen** (in der Demo 1.736 → 38 Meshes), bewegte Objekte vorher mit `obj.userData.dynamisch = true` markieren; Materialien teilen (Baukästen machen das); Rauschen über `rauschTextur()` statt im Shader. Schalter für Vorschauen: `--query "msaa=0&schatten=1024"`.
