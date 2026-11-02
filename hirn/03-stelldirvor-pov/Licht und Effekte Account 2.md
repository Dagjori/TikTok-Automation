---
typ: regel
konto: stelldirvor
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/stelldirvor-video/licht-und-effekte.md
tags: [konto/stelldirvor, licht, effekte, kamera]
---

> Quelle: `.claude/skills/stelldirvor-video/licht-und-effekte.md`. Diese Notiz wird mit `python3 tools/hirn_aus_skills.py` erzeugt. Änderungen bitte im Skill vornehmen, nicht hier. Bei Abweichung gilt der Skill.

# Licht und Effekte Account 2

*Licht, Farbe, Effekte, Kamera, Welt*

Messung 02.11.: Mittelwerte und 6-Farben-Palette je Sekunde (k-means), Bildschärfe (Laplace), Kamera per Phasenkorrelation (30 fps, Pixel bezogen auf 720 × 1280). Referenzen: **A** Asteroid/Balkon, **S** Sonne/Strand, **T** Tsunami/Dachterrasse, **E** Erddrehung/Kreuzung. Baukasten: `pipeline/engine/stil_lunar_pov.js` (Welt, Effekte, Kamera, Farbe), `pipeline/engine/lunar_hud.js` (Bild-Ebenen über der Leinwand), `pipeline/engine/kern.js` (Nachbearbeitung).

## 1. Licht und Farbe je Phase (F)
| Phase | Zeit | Messwerte (Mittelwert oben / Mitte / unten, Helligkeit L, Sättigung S) | Farbstimmung | Baukasten |
|---|---|---|---|---|
| Alltag | 0–25 s | A #8498B6 / #82909C / #373922, L 114; S #B4B3BD / #B1A898 / #6B5F4D, L 148; T #A0ADC5 / #655F5C / #4F433B; E #70635A / #4C4842 / #40464C | entsättigt, dunstig, Gegen- oder Seitenlicht, Sonne mit Glanz | `PHASE.alltag`, `Himmel`, `aktiviereHoehenNebel` |
| Aufhellen | A 24–32 s, S 28–44 s | L steigt 124 → 176 (A) bzw. 159 → 196 (S), Sättigung fällt auf 19–23 | weißlich, Kontrast sinkt | `PHASE.grell` |
| Lichtblitz | A ≈ 33 s | ganzes Bild weiß, dann Abklingen über ≈ 2 s | Weißblende | `blitzKurve()` + `belichtung`, `bloomStaerke`, `Glut` |
| Hitze | A 36–40 s, S 48–68 s | Himmel #D1A98D (A), Sättigung 60–126 (S), unten #603A16 / #975327 | orange, gesättigt, Bloom | `PHASE.hitze` |
| Staub | E 20–60 s, A 64–69 s | #3C2E25 (dunkel, L 59), #977C6B, #7A695D | braun bis beige, Kontrast klein | `PHASE.staub`, Nebel dichter |
| Staubwand | A ≈ 60 s (≈ 1 s) | #D7C8B7 flächig, **Kontrast 9**, Schärfe 0,7 | beige Weißblende | `PHASE.staubwand`, `staubWand().vorKamera` → `schleierStaerke` |
| Wasser/Glas | T 62–70 s, E 64–70 s | T #0C1F20 / #183332, E #3A4542 / #475856 | dunkles Blaugrün („grünlich“) | `PHASE.wasser` |
| Abblende | 69–72 s | → #111111 | | `LunarHUD` (Abblende 70–72 s) |

Übergänge zwischen Phasen: weich über 2–6 s (`farbPhasen([{t, phase, werte, e}])`), nur Blitz und Staubwand schlagen hart ein.

## 2. Himmel, Sonne, Dunst, Tiefe
- **Himmel (F):** Verlauf von entsättigtem Blau oben zu hellem Dunst am Horizont, Federwolken (A) und weiche Haufenwolken, Sonne als kleine helle Scheibe mit großem weichem Glanz (A bei 20 s oben rechts). U: `new Himmel(szene, { zenit, horizont, dunst, sonnenRichtung, sonnenStaerke ≈ 30, glanz ≈ 0,7, zirren })`, Sonne HDR → Bloom (`bloomSchwelle 1`). Horizontfarbe = Nebelfarbe (`szene.fog.color.copy(himmel.horizont)`).
- **Dunst/Luftperspektive (F):** Hügel in 1–3 km sichtbar aufgehellt, Ferne fast im Himmel aufgelöst, Gipfel ragen heraus. U: `aktiviereHoehenNebel({ abfall, basis })` + `new THREE.FogExp2(farbe, dichte)`; Formel Beer-Lambert: 2 km ≈ 12 %, 14 km ≈ 60 % bei `dichte 6,5e-5`; Gipfel weniger (abfall 0,00045/m).
- **Tiefenunschärfe (F):** im Alltag kaum (Geländer scharf); nach dem Höhepunkt und bei Staub weich. U: `new Buehne(…, { tiefe: true })`, `post.tiefeNah/fokusNah` (nah) bzw. `tiefeFern/fokusFern`, global `post.unschaerfe`.
- **Vignette und Körnung:** siehe [[Design Account 2]].

## 3. Effekte mit Zeitpunkt, Dauer und Umsetzung
| Effekt | Aussehen (F) | Zeit/Dauer (F) | Umsetzung (U) |
|---|---|---|---|
| Neuer Lichtpunkt am Himmel | heller Punkt mit Glanz, wächst | A 8–30 s | `new Glut(szene, { farbe, staerke, groesse })`, `setze({ p, staerke })` |
| Lichtblitz | Weißblende, Bloom maximal | A ≈ 33 s, Abklingen ≈ 2 s | `blitzKurve(t, t0)` → `post.belichtung`, `bloomStaerke`; `Glut` an der Quelle; Protokoll `effekt(t, "blitz")` |
| Rauch-/Aschesäule, Pilz | weiche graue Ballen, oben heller, Säule mit Kopf, Schirm breitet sich aus | A 36–56 s (Pilz), Rauchfahne des Körpers | `rauchSaeule({ basis, t0, hoehe, hoeheBei, breite, kopf })` – **gleiche Höhenfunktion wie die Anzeige** übergeben |
| Feuerball | orange Kern (HDR), Rauchring | A 36–40 s, S 48–64 s | `feuerBall({ p, t0, radius })` → `.glut(t)` in additive `Puffs`, `.rauch(t)` in normale |
| Druck-/Staubwand | rollende Front aus Staubballen, unten dunkel, oben hell, füllt dann das Bild | A 52–60 s (Front sichtbar ≈ 6–8 s vor der Ankunft) | `staubWand({ ziel, richtung, start, t0, ankunft, breite, hoehe })` → `.puffs(t)`, `.vorKamera(t)` für den Schleier |
| Weißblende Staub | flächig beige, keine Konturen | ≈ 1 s, dann braun | `PHASE.staubwand` + `schleierStaerke` aus `vorKamera`, danach `PHASE.staub` |
| Trümmer | Bretter, Ziegel, Kisten, Äste fliegen quer mit Drehung | E 16–56 s, A 64 s, T 58 s | `new Truemmer(szene, { form })`, `.wurf({ t0, ursprung, richtung, wind, luft })` |
| Wasserwand, Gischt | weiße Schaumstreifen, Gischtballen | T 40–58 s | `puffStrahl({ … farbe: "#F2F4F5" })`, Wasserwand als eigenes Mesh in der Szene |
| Tropfen auf der Linse | runde Tropfen mit Lichtkante | T 58–61 s | `hud.tropfen({ von, bis })` |
| Hitze | Flimmern über Boden, Glut, Funken | S 48–64 s | `post.flimmern`, `flimmerY`; `new Partikel(szene, { art: "funken" })` |
| Staub, Asche, Schnee, Eis, Regen | Teilchen um die Kamera | Nachspiel (A, S), Wetter | `new Partikel(szene, { art })`, `.setze(t, kamera, { deckkraft, wind })` |
| Unscharfe Flecken | dunkle (Asche) bzw. helle (Wasser) Bokeh-Punkte vor der Linse, treiben langsam | A, S 60–70 s, T 64–70 s | `hud.flecken({ von, bis, art: "dunkel" \| "hell" })` |
| Gesprungenes Glas | dünne weiße Risse (≈ 2 px bei 1080), 2–3 Einschläge mit Strahlen und Ringsegmenten, steht in 1–3 Bildern | T 61–62 s, E 61–62 s, bleibt bis zur Abblende | `hud.glas({ t, punkte: [[x, y, größe], …], seed })` |
| Abblende | auf #111111 | 69–72 s | `LunarHUD` |

Jeder Effekt meldet sich im Protokoll (`Protokoll.effekt(t, name, { klang })`), damit der Ton an genau dieser Stelle sitzt.

## 4. Kamera (F, Phasenkorrelation)
| Größe | Messwert | Baukasten |
|---|---|---|
| Ruhe | praktisch starr: 0,01–0,03 px/Bild, Drift ≤ 3 px in 4 s | `PovKamera.atmen()` (≈ 0,04°, 0,1–0,3 Hz) |
| Schwenk | T 8–20 s, E 4–36 s: 25–100 px/s (≈ 1–4°/s), weich, um dem Ereignis zu folgen | `blick([{ t, ziel }])` |
| Beben/Grollen | 4,0–4,5 Hz senkrecht, 3–6 Hz waagrecht; Standardabweichung 0,5–4 px (≈ 0,05–0,3°) | `beben({ von, bis, staerke })` |
| Stoß beim Höhepunkt | stärkster Ausschlag, klingt in ≈ 1–2 s ab | `stoss({ t, staerke ≈ 1,5 })` |
| Kippen | Kamera wird umgeworfen: Rollen 10–20°, Nicken, Absinken; danach **liegt sie still** (60–68 s: 0,01 px/Bild) | `kippen({ t, roll, nick, fall })` |
| Schnitte | keine (eine durchgehende Einstellung) | keine `zl.shot`-Übergänge |

## 5. Welt (F)
- Detaildichte: Wald aus Tausenden kleiner Nadelbäume, Wiesen, Häuser mit Fenstern und Schornsteinrauch, See mit Wellen (A); hunderte kleine Menschen, Sonnenschirme, Riesenrad, Drachen am Himmel (S); Hochhäuser mit Fensterrastern, Straßen, Brücken (T); Kreuzung mit Ampeln, Palmen, Autos, Passanten (E).
- Bewegung der Statisten: gehen, stehen, fliehen, fallen; Autos fahren und bleiben stehen; Vögel kreisen und fliegen vor dem Ereignis weg (A).
- Charakter: **Low-Poly, flach schattiert**, aber filmisch: weiche Schatten, Dunst, Bloom, Partikel. U: `Menschen`, `Autos`, `Voegel` (Instanzen, `reaktion`, `bremsen`, `flucht`), Bäume und Häuser als `InstancedMesh` (Muster in der Demo), Gelände als Höhenfunktion mit Farbe nach Höhe und Neigung.

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Format Account 2 Lunar]] · [[Ablauf Account 2]] · [[Design Account 2]] · [[Ton Account 2]] · [[Technik und Szenenbau Account 2]] · [[Prüfung und Abnahme Account 2]] · [[Themen und Plan Account 2]] · [[Konkurrenz-Check und Sperrliste Account 2]]

Account 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: [[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].
