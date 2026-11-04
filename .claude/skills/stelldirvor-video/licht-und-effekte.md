# Licht, Farbe, Effekte, Kamera, Welt, Bewegung

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

**Tageszeit (U/A, Regel des Inhabers 02.11. abends: die Tageszeit wechselt von Video zu Video).** Die Referenzen zeigen nur Tag und Katastrophenlicht; Sonnenauf-/untergang und Nacht sind unsere Ergänzung (Annahme, noch nicht an Vorbildern gemessen; erste Videos mit Standbild-Vergleich abnehmen):
| Tageszeit | Licht | Baukasten |
|---|---|---|
| Tag | entsättigt, dunstig, Sonne mit Glanz (Tabelle oben) | `PHASE.alltag` |
| Sonnenauf-/untergang | tiefe Sonne mit langen Schatten, warmer Horizont (orange bis rosa) gegen kühlen Zenit, Dunst leuchtet, Bloom höher | `Himmel` mit niedriger `sonnenRichtung` (`setze()` je Bild für den Verlauf), `farbPhasen` mit `werte` (warme `tonung`, `bloomStaerke ≈ 1,2`) |
| Nacht | kühl, dunkelblau, Mond und Sterne, Lichter (Fenster, Laternen, Boote, Feuer) als Lichtinseln, Rest schattig, aber lesbar | `PHASE.nacht`, Mondlicht als schwache gerichtete Quelle |
Der Tageszeit-Verlauf steht im Skript (`tageszeit_verlauf`) und im Zeitraffer sichtbar am Sonnen- bzw. Mondlauf (siehe §6); ein Wechsel innerhalb des Videos ist ein Bildwechsel und läuft weich über mehrere Sekunden.

## 2. Himmel, Sonne, Dunst, Tiefe
- **Himmel (F):** Verlauf von entsättigtem Blau oben zu hellem Dunst am Horizont, Federwolken (A) und weiche Haufenwolken, Sonne als kleine helle Scheibe mit großem weichem Glanz (A bei 20 s oben rechts). U: `new Himmel(szene, { zenit, horizont, dunst, sonnenRichtung, sonnenStaerke ≈ 30, glanz ≈ 0,7, zirren })`, Sonne HDR → Bloom (`bloomSchwelle 1`). Horizontfarbe = Nebelfarbe (`szene.fog.color.copy(himmel.horizont)`).
- **Dunst/Luftperspektive (F):** Hügel in 1–3 km sichtbar aufgehellt, Ferne fast im Himmel aufgelöst, Gipfel ragen heraus. U: `aktiviereHoehenNebel({ abfall, basis })` + `new THREE.FogExp2(farbe, dichte)`; Formel Beer-Lambert: 2 km ≈ 12 %, 14 km ≈ 60 % bei `dichte 6,5e-5`; Gipfel weniger (abfall 0,00045/m).
- **Tiefenunschärfe (F):** im Alltag kaum (Geländer scharf); nach dem Höhepunkt und bei Staub weich. U: `new Buehne(…, { tiefe: true })`, `post.tiefeNah/fokusNah` (nah) bzw. `tiefeFern/fokusFern`, global `post.unschaerfe`.
- **Vignette und Körnung:** siehe `design.md`.

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

## 4. Kamera (Referenzmessung F, Regel des Inhabers 02.11. abends)
**Eine durchgehende Einstellung, keine harten Schnitte, keine mehreren Einstellungen. Langsame Fahrt, Schwenk und Zoom sind erlaubt und gewollt** (weich, dem Geschehen folgend). Die Referenzen standen fast starr (F, unten); das ist für uns **nicht** mehr die Norm. **Seit 04.11.2026 ruht die Kamera am Anfang höchstens 5 s; der erste Schwenk, langsame Zoom oder die erste Fahrt beginnt vor 8 s** (`ablauf.md` „Einstieg dicht“, Hinweis 13). Danach darf und soll sich die Kamera bewegen, wo es der Spannung dient; reine Ruhe mit `atmen()` bleibt für kurze Atempausen und das Nachspiel.
| Größe | Messwert (F) bzw. Regel (U) | Baukasten |
|---|---|---|
| Ruhe (nur kurze Atempausen, am Anfang ≤ 5 s) | F: praktisch starr: 0,01–0,03 px/Bild, Drift ≤ 3 px in 4 s | `PovKamera.atmen()` (≈ 0,04°, 0,1–0,3 Hz) |
| Schwenk | F: T 8–20 s, E 4–36 s: 25–100 px/s (≈ 1–4°/s), weich, um dem Ereignis zu folgen; U: bis ≈ 4°/s, Ease `inOutSine`, Start und Stopp weich | `blick([{ t, ziel }])` |
| Langsame Fahrt (Dolly, Kran, Boot, Drift) | U (S): Standpunkt wandert langsam und stetig (Schritttempo oder langsamer, bei Weltraum/Gelände entsprechend skaliert), Bildinhalt bewegt sich nicht schneller als ≈ 150 px/s (bei 1080), kein Ruck | `bewegung([{ t, pos }])` |
| Zoom (Annäherung, Auszoomen) | U (S): Bildausschnitt ändert sich stetig, höchstens ≈ 6 % Blickwinkel pro Sekunde, Ease `inOutSine`; bis der Baukasten die Brennweite animiert, gilt die Fahrt nach vorn bzw. zurück als Zoom (Lücke in `technik.md`) | `bewegung(...)`, Brennweite: noch nicht animierbar |
| Beben/Grollen | F: 4,0–4,5 Hz senkrecht, 3–6 Hz waagrecht; Standardabweichung 0,5–4 px (≈ 0,05–0,3°) | `beben({ von, bis, staerke })` |
| Stoß beim Höhepunkt | F: stärkster Ausschlag, klingt in ≈ 1–2 s ab | `stoss({ t, staerke ≈ 1,5 })` |
| Kippen | F: Kamera wird umgeworfen: Rollen 10–20°, Nicken, Absinken; danach **liegt sie still** (60–68 s: 0,01 px/Bild) | `kippen({ t, roll, nick, fall })` |
| Schnitte | **keine harten Schnitte**, keine `zl.shot`-Übergänge, kein Wechsel der Einstellung | – (Prüfpunkt 5b meldet harte Bildsprünge) |
- **Wann bewegen:** Eine Kamerabewegung hat einen Grund im Skript (folgt der Flutlinie, fährt auf die Front zu, zoomt auf den Vorboten, hebt sich mit der Säule). Sie ist Teil des Bewegungsplans und trägt zur Spannungskurve bei ([ablauf.md](ablauf.md)). Im Höhepunkt gelten weiter Stoß und Kippen, im Nachspiel liegt die Kamera still.
- **Weich:** keine Sprünge der Geschwindigkeit; jede Fahrt, jeder Schwenk und jeder Zoom beginnt und endet mit Ease. Bewegungen, die sich überlagern (Fahrt plus Schwenk), sind erlaubt, solange das Bild ruhig bleibt.
- **Text bleibt lesbar:** Die drei Textebenen sind HTML über der Leinwand und bewegen sich nicht mit der Kamera; Fahrt und Zoom dürfen den Text nicht mit hellen oder unruhigen Flächen übertönen (Hof, `design.md`).
- Die Kamera-Plan-Einträge (`art`: fahrt, schwenk, zoom) stehen in `skript.json → lern_notizen → kamera` und, sobald der Baukasten sie meldet, im Ereignis-Protokoll (`typ: "kamera"`).

## 5. Welt (F aus den Referenzen; Welttyp nach Weltenkatalog)
Die Referenzwelten waren Stadt, Strand, Dachterrasse und Kreuzung. **Unsere Welt richtet sich nach dem Thema** (Natur zuerst, `themen-und-plan.md` §2): Küste, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe, Stadt nur, wenn das Thema sie braucht. Die Dichte-Latte der Referenzen gilt für jede Welt: Natur braucht ebenso Detail (Gräser, Felsen, Wellen, Wolken, Tiere) wie eine Stadt Fenster und Autos. Baukasten-Stand (A): Himmel, Wolken, Partikel, Menschen, Autos, Vögel, Trümmer, Rauch, Staubwand, Feuerball und `engine/welt_grossstadt_dach.js` (Stadt) sind vorhanden; **Wasser mit Pegel und Wellen, Vegetation im Wind, Tiere, Sonnen- und Mondlauf mit wanderndem Schatten, Lichtstrahlen und Eis** gehören in den Erstbau des jeweiligen Welttyps.
- Detaildichte: Wald aus Tausenden kleiner Nadelbäume, Wiesen, Häuser mit Fenstern und Schornsteinrauch, See mit Wellen (A); hunderte kleine Menschen, Sonnenschirme, Riesenrad, Drachen am Himmel (S); Hochhäuser mit Fensterrastern, Straßen, Brücken (T); Kreuzung mit Ampeln, Palmen, Autos, Passanten (E).
- Bewegung der Statisten: gehen, stehen, fliehen, fallen; Autos fahren und bleiben stehen; Vögel kreisen und fliegen vor dem Ereignis weg (A).
- Charakter: **Low-Poly, flach schattiert**, aber filmisch: weiche Schatten, Dunst, Bloom, Partikel. U: `Menschen`, `Autos`, `Voegel` (Instanzen, `reaktion`, `bremsen`, `flucht`), Bäume und Häuser als `InstancedMesh` (Muster in der Demo), Gelände als Höhenfunktion mit Farbe nach Höhe und Neigung.

## 6. Bewegung und Zeitraffer (Technik; Regel des Inhabers 02.11. abends, Planung in `ablauf.md`)
Zweck: Die Welt zeigt in jedem 2–3-s-Fenster eine sichtbare, themenbezogene Veränderung, und der Zeitraffer ist am Bild abzulesen.
- **Veränderungs-Ebenen** (mindestens drei von Bild 0 an aktiv, zwischen den großen Wendungen wechselt mindestens eine):

| Ebene | Beispiele | Baukasten |
|---|---|---|
| Wetter | Wolkenzug, Nebel, Regen, Schnee, Wind in Gras und Bäumen | `wolkenFeld`, `Partikel` (regen, schnee), `Himmel` |
| Licht | Sonne und Mond wandern, Schatten laufen, Lichtstrahlen, Reflexe, Dämmerung, Fensterlichter | `himmel.setze({ sonnenRichtung, zenit, horizont })` je Bild, Richtungslicht mit Schatten folgt der Sonne, `farbPhasen` |
| Wasser | Wellen, Gischt, Pegel, Strömung, Gefrieren | Erstbau (Wasserfläche mit Pegel-Steuerung), `puffStrahl` |
| Vegetation | Wiegen, Wachsen, Verfärben, Verdorren | Instanzen mit Wind-Shader, Wachstum als Funktion von `simZeit` |
| Eis, Boden, Gelände | Eisrand wandert, Schnee deckt zu, Düne zieht, Lava erkaltet | Erstbau |
| Lebewesen | Menschen, Tiere, Fahrzeuge, Boote, Vögel- und Insektenschwärme (in Gruppen, reagieren aufs Ereignis) | `Menschen`, `Autos`, `Voegel` (`reaktion`, `bremsen`, `flucht`) |
| Partikel | Staub, Asche, Pollen, Funken, Gischt | `Partikel`, `puffStrahl`, `Truemmer` |

- **Zeitraffer als Funktion von t:** Weil jedes Bild eine reine Funktion von `t` ist (`technik.md`), wird der Zeitraffer als Abbildung der Videozeit auf die Simulationszeit gebaut und **einmal** tabelliert (kein Zustand zwischen Bildern):
  ```js
  const faktor = (t) => keyframes([{ t: 0, v: 60 }, { t: 30, v: 60 }, { t: 40, v: 600, e: ease.inOutSine }], t);   // simulierte s je Videosekunde, stückweise weich
  const TAB = new Float64Array(2401); for (let i = 1; i <= 2400; i++) TAB[i] = TAB[i - 1] + faktor((i - 0.5) / 30) / 30;
  const simZeit = (t) => { const x = Math.min(Math.max(t, 0), 80) * 30, i = Math.floor(x); return TAB[i] + (TAB[Math.min(i + 1, 2400)] - TAB[i]) * (x - i); };
  ```
  (`keyframes` und `ease` kommen aus `engine/bewegung.js`.) Sonnenstand, Schatten, Pegel, Vegetation, Eisfläche **und die Messwert-Anzeige** lesen alle `simZeit(t)` (bzw. dieselbe Rechnung `pipeline/sim/<name>.mjs`). So laufen Bild und Zahl synchron und ändern ihr Tempo gemeinsam, wenn der Faktor sich ändert. Der Faktor steht in `skript.json → zeitraffer`.
- **Zeitraffer erkennbar machen:** schnell wandernde Schatten und Sonne, ziehende Wolken, wachsende Vegetation oder Eisfläche, sichtbar steigender Pegel; nicht nur laufende Zahlen. Gerafft läuft das Wetter am deutlichsten, Menschen und Fahrzeuge werden im Zeitraffer zu Strömen (Spuren) oder verschwinden, sie sollen sich nicht in Echtzeit bewegen.
- **Vorbote vor dem Ereignis:** Der Auslöser (18–25 s) wird 5–10 s vorher durch eine sichtbare Anomalie angekündigt (Tiere reagieren, Licht kippt, Wasser verändert sich). Das sorgt für Veränderung im Alltagsteil, ohne zu verraten.
- **Maß:** Bewegung ist kein Selbstzweck. Jede Veränderung gehört zum Thema, die Kamera bleibt weich, Partikel verdecken den Text nicht. Zu viele gleichzeitige Veränderungen lassen das Bild unruhig wirken; 3–4 Ebenen reichen.
- **Prüfung:** `qc/referenz_pov.py` Hinweis 10 (Leerlauf: mittlere Bildveränderung unter 2,5 Grauwerten in 2,5-s-Fenstern, Text ausgenommen), 10b (Einzelbild-Flackern), 11/12 (Zeitraffer, Anzeige-Sprünge), 13 (Einstieg: Effekt < 4 s, Kamera < 8 s, Anzeige < 8 s); Sichtprüfung am Kontaktbogen (`pruefung.md`).
