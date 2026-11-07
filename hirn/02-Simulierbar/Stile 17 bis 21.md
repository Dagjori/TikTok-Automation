---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/stile.md, .claude/skills/simulierbar-video/SKILL.md, CLAUDE.md §4, pipeline/stile/, pipeline/qc/massstab.py (18b)
tags: [konto/simulierbar, stile, look, renderzeit, baukasten, qualitätslatte]
cssclasses: [konto-simulierbar, typ-regel]
---

# Stile 17 bis 21 (Titel unverändert; Inhalt: alle erlaubten Stile 1–15 und 17–21 mit Qualitätslatte)

> Der Notiztitel bleibt „Stile 17 bis 21“, damit alle Links halten; er enthält seit 02.11.2026 abends **alle erlaubten Stile (1–15 und 17–21)** und die **Qualitätslatte**. Technik der Stile: [[Technik und Szenenbau Simulierbar]], Lichtwerkzeuge: [[Licht und Atmosphäre Simulierbar]], HUD: [[Design und Layout Simulierbar]], Abnahme: [[Prüfung und Abnahme Simulierbar]].

> Entscheidung des Inhabers 02.11.2026 abends: **alle Stile wieder erlaubt, mit Qualitätslatte.** Stile 1–15 sind für Simulierbar wieder nutzbar (Baukästen im Repo), zusätzlich 17–21. Stil 16 Lunar-POV gehört zu Account 2.
>
> Davor, 02.11. nachmittags (**ersetzt, Archiv**): „hier möchte ich mehr weg von dem Cartoon Clay sachen, hier müssen was seriöseres finden bei der mit licht effekten bisschen gespielt werden kann etc. das eine gewisse atmosphäre entstehen kann … keine sticker mehr … richtig hochwertige animations videos“ (Inhaber). Davon bleiben: **hochwertig, Licht, Atmosphäre, keine Sticker.** Die Beschränkung auf 17–21 fällt weg.

## Wahlregeln
- Jedes Video bekommt **genau einen** Hauptstil (1–15 oder 17–21). Kein fester Look als Markenzeichen (Entscheidung 01.11.), das Markenzeichen ist die Qualität.
- **Nie zweimal derselbe Stil hintereinander** (auch über Tagesgrenzen); passen zwei, gewinnt der, der länger nicht dran war. Letzter gepostet: Stil 4 (02.11. abends, Steuererklärung oder Überstunden); den jüngsten Stil sonst aus den `skript.json` der letzten Projekte (Feld `stil`) ableiten. Bei den 2 Videos eines Tages zwei verschiedene Stile.
- Der Stil steht **nicht mehr im Plan** (Plan entfällt). Claude Code wählt ihn beim Eingang des Skripts, **aus dem Skript abgeleitet**: Welcher Look trägt das Thema, was erzählt das Skript räumlich (Stadt, Wohnung, Gefäß, Karte, Daten)? Vorher kurz erfolgreiche Videos zum Thema ansehen (welcher Look trägt das Thema am besten, wie heben wir uns in der Qualität ab); keine Kopie von Look und Szenenideen eines fremden Videos. Die Wahl steht in `skript.json → stil_begruendung`.
- Einschübe: **13 Blaupause / Schnittmodell** als „Warum?“-Szenenwechsel (Querschnitt eines Geräts, Aufschlüsselung) und **7 Kinetische Typografie** als HUD-Baustein (`M.pointe`) sind weiterhin neben einem Hauptstil möglich; beide dürfen jetzt auch Hauptstil sein, wenn die Qualitätslatte hält.
- **Empfehlung (S):** Bis die Lernschleife erste Zahlen liefert, bevorzugt Stile mit fertigem Licht-Baukasten (17–21) und erprobte Stile (1, 4, 12, 14). Stile ohne Video-Baukasten (5, 7, 8, 9, 10, 11, 15) nur nach Erstbau (Opus, ca. 3–8 Std., S) und bestandener Qualitätsprüfung am Standbild.
- Prüfung `massstab.py` 18b: Stil muss 1–15 oder 17–21 sein (Pflicht bei `"skill": "video-produktion"` (bzw. alt `"simulierbar-video"`) oder Szene mit `sim_atmosphaere.js`); Module von Account 2 (`stil_lunar_pov.js`, `lunar_hud.js`, `welt_grossstadt_dach.js`) dürfen in einer Simulierbar-Szene nicht auftauchen.

## Qualitätslatte (verbindlich, Inhaber 02.11. abends)
**Jeder Stil, auch jeder frühere, muss die Abnahme am Kontaktbogen bestehen. Billig-Optik gibt es nicht, auch nicht „im Stil“.** Kriterien, alle müssen erfüllt sein:
1. **Sauberes Licht und stimmige Materialien:** ein klares Führungslicht, Kante bzw. Gegenlicht zur Trennung, Schwärzen bleiben schwarz, keine überstrahlten oder grauen Flächen; Materialien mit Oberfläche (Rauheit, Glanz, Kanten), nicht nur Grundfarbe.
2. **Tiefe statt Flatness ohne Absicht:** Vorder-, Mittel-, Hintergrund; Schatten, Tiefenschärfe oder Parallaxe. Bewusst flache Stile (4, 13) brauchen trotzdem Tiefenstaffelung, Schatten oder Parallax-Ebenen.
3. **Lesbare Typografie:** Zahlen und Etiketten kontrastreich, groß genug für das Handy, keine Überlappung (`text_ueberlappung.mjs` bestanden), Untertitel „kontur“ immer lesbar, auch bei Glow.
4. **Konsistente Farben:** zwei Teamfarben überall gleich, nie Gelb (außer dem aktuellen Untertitel-Wort), eine Palette je Video, keine zufälligen Fremdfarben.
5. **Keine Artefakte:** kein Banding in Verläufen (feine Körnung 0,018–0,024), kein Flimmern, kein Z-Fighting, keine Durchdringungen, keine abgeschnittenen oder schwebenden Objekte, keine gedehnten Texturen, kein hartes Aliasing.
6. **Bewegung:** nie ein Standbild über 2 s; mindestens eine sichtbare Bildänderung alle 1–2 s ([[Videoaufbau Simulierbar]] §6).
7. **Der Eindruck zählt:** „Würde ein Zuschauer denken, das sieht billig aus?“ Bei „ja“ wird die Abnahme verweigert; nachbessern, im Zweifel einen anderen Stil wählen. Kein Cartoon-Gewackel, keine Spielzeug-Anmutung, die vom Thema Geld ablenkt oder es kleinredet.

**Wann geprüft wird:** (a) Schritt 6 des Ablaufs an den Standbildern (Hook, Regeln, Wendung, Ergebnis, Warum, Schluss) und (b) in der Abnahme am Kontaktbogen des fertigen Videos ([[Prüfung und Abnahme Simulierbar]] §2). Der Bericht hält je Kriterium ja/nein fest. Ein Stil, der bei Standbildern durchfällt, wird nicht „ins Video gerettet“.

## Die Stile 17–21 (Licht-Baukasten, `sim_atmosphaere.js`)

Renderzeit: Sekunden je Videobild 1080 × 1920 in der Cloud (4 Kerne, ohne GPU, SwiftShader), Demo-Szene mit HUD, MSAA 0 (FXAA), Schatten 2048, gemessen am 02.11. (Messweise: 12 Bilder je Stil bei t = 6,0–6,4 s, 1 Worker, ohne Fremdlast). Standbilder: `node render.js projekte/_demo-simulierbar --zeiten <t> --worker 1 --query "stil=<name>"`.

| Nr. | Stil | Look | Passt zu (Geld-Themen) | Baukasten · Demo-Welt | Grading |
|---|---|---|---|---|---|
| **17** | **Nachtstadt-Miniatur** | Stadtmodell zur blauen Stunde nach Regen: erleuchtete Fenster, Laternen mit Lichtkegel und Lichtfleck, nasser Asphalt mit Spiegelung, Lichtspuren in Teamfarbe (Langzeitbelichtung = Weg eines Teams), Skyline im Dunst, Tilt-Shift | Auto, Taxi, Parken, Tanken, Pendeln in der Stadt, Lieferdienst, E-Bike, Führerschein, Waschsalon, Black-Friday-Einkaufsstraße, Nachtschicht | `stil_nachtstadt.js` · `welten/nachtstadt.js` (Parkhaus oder Parkplatz suchen) | `GRADING.nacht` |
| **18** | **Dunkles Studio (Produktlicht)** | schwarzes Fotostudio mit Hohlkehle und Spiegelboden; Geld als echtes Objekt: Münzen mit Rändelung und Prägung, Scheinbündel mit Banderole, Balkenwaage aus Stahl, Sockel mit LED-Kante in Teamfarbe; Softbox-Streiflicht, Kantenlichter, Spot mit Kegel und Staub, Lichtstrahlen, Tiefenschärfe | reine Geldfragen: Gehalt, Prämie, Minijob, Freelancer, Schulden, Dispo, Kredit, Steuerklasse, Versicherung, Rabatt, Gutschein oder Bargeld, Produkte (Handy, Konsole, Laptop, Großpackung) | `stil_studio.js` · `welten/studio.js` (1.000 € Prämie oder 50 € mehr im Monat) | `GRADING.studio` |
| **19** | **Architekturmodell (Abendlicht)** | weißes Kartonmodell mit Fensterschnitten auf einer Sperrholzplatte, tiefe goldene Sonne im Gegenlicht, lange Schatten, Lichtstrahlen, Schnitt-Haus mit warmem Innenlicht, Acrylglas-Marker in Teamfarbe für die beiden Alternativen, Modellbäume und -figuren, Tiefenschärfe | Wohnen und Haushalt: WG oder Wohnung, Miete (Staffel/Index), Umzug, Zusammenziehen, Heizen, Putzen, Streichen, Homeoffice, Teilzeit (Bürohaus), Familie, Urlaub (Hotel/Ferienwohnung), Mittagessen (Küche/Büro) | `stil_architektur.js` · `welten/architektur.js` (WG-Zimmer oder eigene Wohnung) | `GRADING.abend` |
| **20** | **Glas & Licht** | dunkles Labor, Messgefäße im Dunkelfeld (Glas nur über leuchtende Kanten), Geld als leuchtende Flüssigkeit in Teamfarbe (Füllstand = Live-Zähler), Zulauf, Bläschen, Kaustik auf der spiegelnden Bank, Spot-Kegel, Gegenlicht | alles, was sich ansammelt oder abfließt: Kaffee je Tasse, Wasser, Strom, Rente, Sparen (52-Wochen, Tagesgeld), Abo/Vertrag, Kontaktlinsen, Fitnessvertrag, Garantie | `stil_lichtlabor.js` · `welten/lichtlabor.js` (Kapselmaschine oder Vollautomat) | `GRADING.labor` |
| **21** | **Nachtkarte** | Geländerelief im Mondlicht mit Höhenlinien, Flüssen und Wäldern, Städte als Lichtteppiche, schwaches Straßennetz, Routen in Teamfarbe mit Lichtkopf, Ortsmarken als Lichtsäulen mit Puls, tiefe Wolken mit Parallaxe | Orte und Wege: Pendeln, Jobangebot in zwei Städten (oder Ländern), Fahrgemeinschaft, Bahn oder Auto, Homeoffice gegen Arbeitsweg, Reisen | `stil_nachtkarte.js` · `welten/nachtkarte.js` (40 km pendeln oder näher ziehen) | `GRADING.karte` |

### Gemessene Renderzeit (Demo-Szenen 17–21)
| Nr. | Stil | Renderzeit Cloud (s/Bild) | Demo-Standbild |
|---|---|---|---|
| 17 | Nachtstadt-Miniatur | **4,0** (über 3 s/Bild, auf dem PC mit GPU unkritisch; Cloud-Rückfall: Spiegelung aus −0,4 s, ohne Spiegelung, Kegel, Tilt-Shift und Schatten 2,5 s) | `?stil=nachtstadt`, t = 8,2 s |
| 18 | Dunkles Studio | **2,3** | `?stil=studio`, t = 10,4 s |
| 19 | Architekturmodell | **2,5** | `?stil=architektur`, t = 10,8 s |
| 20 | Glas & Licht | **1,7** | `?stil=lichtlabor`, t = 10,6 s |
| 21 | Nachtkarte | **1,9** | `?stil=nachtkarte`, t = 12,6 s |

Messung (F): 02.11.2026, 12 Bilder je Stil (t = 6,0–6,4 s), 1 Worker, ohne Fremdlast (Referenz `_demo-massstab` dabei 2,2 s je Standbild wie zu Beginn der Sitzung), MSAA 0 (FXAA), Schatten 2048, Bloom, HUD, JPG; Werte = „s/Bild effektiv“ von `render.js`. Mit MSAA 2 ca. 25 % mehr (S, Messung unter Last). Auf der GPU des Render-PCs sind die Stile 17–21 noch nicht gemessen.

### Hinweise je Stil (17–21)
- **17 Nachtstadt:** Gebäude teilen sich den Fassaden-Atlas (ein Material) → nach dem Aufbau `buendeln(szene)`. Teamfarbe als Lack, Lichtspur, LED-Kante. Orange wirkt neben Natriumlicht schwächer: Lichtspur dann etwas heller (`staerke 5`). Kamera von schräg oben über die Straße, Hauptobjekte nicht hinter hohen Vordergrundhäusern; Vordergrund-Blöcke niedrig halten.
- **18 Studio – nur mit belebter Szene** (Inhaber 05.11., Lernschleife: Stil 18 hielt 20 % und 22 % der Länge, Stil 19 34 %/36 %, Stil 17 31 %; n = 5, Annahme): Stil 18 nur, wenn die Szene eine **Umgebung oder handelnde Modellfiguren** hat (z. B. Mini-Raum im Studio, Figuren, die Geld einzahlen oder abheben) **und je Phase mindestens ein Raum- oder Bildwechsel** kommt. Reine Objekte (Münztürme, Drehteller, Waage) vor schwarzem Grund reichen **nicht**; dann einen Stil mit Umgebung wählen (17, 19 oder andere). Pausiert ganz, falls auch das belebte Studio unter 30 % bleibt, bis ein Studio-Video mindestens 30 % hält. Prüfpunkt: [[Prüfung und Abnahme Simulierbar]].
- **18 Studio (Waage):** Duelle über die Balkenwaage nur, wenn die Neigung die Rechnung zeigt (schwerere Seite tiefer, Kamera auf Schalenhöhe, Waage höchstens 0,6 rad gedreht, sonst täuscht die Perspektive). Münze = fester Betrag (z. B. 50 €), Zähler auf der Tafel exakt. Keine echten Euro-Motive.
- **19 Architekturmodell:** Gegenlicht-Sonne (Richtung von hinten, Höhe 0,2–0,35) + `strahlen` ergibt die Atmosphäre; Frontlicht wirkt flach. Weiß bleibt weiß: Sonne nicht zu gesättigt (`#FFC283`). Teamfarbe nur als Acryl-Marker und Lichtfleck.
- **20 Glas & Licht:** Gefäße schmal (r ≈ 0,45) und eng nebeneinander (± 0,7), Kamera ≥ 10 Einheiten entfernt (Hochformat). Glas-Stärken in `glasMaterial` niedrig halten, sonst wirkt es milchig. Skala zum Betrachter drehen.
- **21 Nachtkarte:** `karte.hoehe(x, z)` für alles, was auf dem Gelände sitzt. Start und Ziel beider Routen müssen im Bild sein. Lichtglocke der Städte schwach (0,16).

## Die Stile 1–15 (wieder erlaubt, Baukästen im Repo; Demos in `pipeline/stile/`)
Gemeinsam: Die Demos in `pipeline/stile/stil_<Nr>_*.html|js|py` zeigen den Look (Standbild); für ein ganzes Video braucht der Stil einen **Video-Baukasten** in `pipeline/engine/` (Three.js, Szene als reine Funktion von `t`). Spalte „Video-Baukasten“: vorhanden bzw. Erstbau nötig. Die Stile 1–15 laufen mit `kern.js` (`Buehne`) und dem Standard-HUD aus `massstab.css`; das ruhige Rauchglas-HUD `sim_hud.css` ([[Design und Layout Simulierbar]]) ist für sie optional, **Sticker/Stempel bleiben verboten**. Wer `SimBuehne` und die Licht-Rigs aus `sim_atmosphaere.js` in einem älteren Stil einsetzt, bekommt Gegenlicht, Strahlen und Grading ([[Licht und Atmosphäre Simulierbar]]) und erfüllt die Qualitätslatte leichter.

| Nr. | Stil | Look | Passt zu (A) | Video-Baukasten · bisheriger Einsatz | Hinweis zur Qualitätslatte |
|---|---|---|---|---|---|
| 1 | Low-Poly-Miniatur (Tag, Pastell, Tilt-Shift) | Stadtminiatur, weiche Pastellfarben, Tilt-Shift | Stadt, Verkehr, Wege | `stil_lowpoly.js` (+ `bausteine.js`, `kern.js`) · Fußgängerampel, GTA 6 | Tilt-Shift und Licht tragen; Cloud ca. 3,4 s/Bild, GPU 0,04 s/Bild (F, 02.11.) |
| 2 | Isometrisches 3D (Pastell, harte Schatten) | schwebende Diorama-Kachel, orthografische Kamera | Prozesse, Straße gegen Schiene, Abläufe | `iso.js/.css` · Spurwechsel | wirkt schnell flach: Schatten, Tiefenstaffel, Licht ergänzen |
| 3 | Clay-Spielzeug-3D | Knete-Material, Figuren mit Gesicht, Sockel | Spiele, Familie, Zuhause (leichte Themen) | `stil_clay.js`, `stil_clay_welt.js` · Schere-Stein-Papier (halb gebaut) | Spielzeug-Anmutung darf Geldthemen nicht kleinreden; Material und Licht besonders prüfen |
| 4 | 2D-Flat-Infografik (in Three.js) | flache Formen, orthografische Kamera, Parallax-Ebenen | Zahlen- und Vergleichsthemen | `stil_flat.js` · Steuererklärung oder Überstunden | Tiefenstaffel und Schatten nötig, Bewegung in jeder Ebene |
| 5 | Neon-Daten-Dashboard | Daten als leuchtende Linien und Flächen | Kurven, Zeitverläufe | nur Demo (`stil_5_neon.js`) · **Erstbau** | Lesbarkeit und Glow-Maß beachten |
| 6 | Papier-Collage (in Three.js) | Packpapier, gerissene Kanten, Klebeband, Etiketten | Haushalt, Alltagsgeld | `stil_collage.js` · Mittagessen (halb gebaut) | Papierschatten und Körnung prüfen, Stop-Motion-Takt nur wo es trägt |
| 7 | Kinetische Typografie | Schrift als Hauptdarsteller | Merksätze, Zahlenbilder | nur Demo (`stil_7_typo.js`) · **Erstbau**; als HUD-Baustein `M.pointe` vorhanden | als Hauptstil heikel (Text statt Welt); Typografie-Kriterium streng |
| 8 | Karten-/Satellitenoptik (Tag) | Kartenfläche mit Routen, Tagesoptik | Orte und Wege | nur Demo (`stil_8_karte.js`) · **Erstbau** | ohne Atmosphäre schwach; Weiterentwicklung ist Stil 21 |
| 9 | Holzspielzeug-Tisch | Holzobjekte auf Tisch, Blender-Licht | Familie, Zuhause | nur Blender-Demo (`stil_9_holz.py`) · für Video über Stil 15 | Cycles nur Standbild; Video nur gebacken |
| 10 | Papier-Diorama | Kartonschichten wie im Schaukasten | Geschichten mit Staffelung | nur Blender-Demo (`stil_10_papier.py`) · **Erstbau** in Three.js | Schichtentiefe gut; Faserstruktur prüfen |
| 11 | Filz & Knöpfe | gepolsterte Filzformen, Ziernähte | Familie, Winter, Weihnachten | nur Blender-Demo (`stil_11_filz.py`) · **Erstbau** | Gemütlich, aber verspielt: Qualitätslatte Punkt 7 streng |
| 12 | Comic-Toon 3D | Cel-Shading, Konturen, Halbton-Raster | Gebäude, Abläufe | `stil_comic.js` · Treppe oder Aufzug | Konturen sauber, keine Strahlenkranz-Sticker |
| 13 | Blaupause / Schnittmodell | technische Zeichnung, Röntgen-Schnitt, Beschriftungen | „Warum?“-Einschub, Geräte, Kostenteile | `stil_blaupause.js` · Einschub in Ampel, Treppe | als Hauptstil flach; Tiefe durch Linienstärke und Staffel |
| 14 | Glas-Labor (helles Studio) | Messzylinder aus Glas im Fotostudio, Füllstand | alles, was sich ansammelt | `stil_glas.js` (`transmission`, teuer) · Gehalt steuerfrei | hell, wenig Stimmung; Weiterentwicklung ist Stil 20 |
| 15 | Holzspielzeug gebacken (Blender → glTF → Three.js) | Licht in Texturen gebacken, Zug und Auto frei beweglich | wie 9, aber als Video machbar | Machbarkeitsbeweis (`stil_15_holz_gltf.py/.js`) · **Erstbau** der Szene in Blender | Bake-Qualität und Kontaktschatten bewegter Teile prüfen |

Die Werte „Passt zu“ der Stile 1–15 sind Annahmen (A) aus den Demos und bisherigen Videos, nicht gemessen. Renderzeiten der Stile 1–15 im Video: nur Stil 1 gemessen (oben); für die anderen vor dem Einsatz am Standbild messen (`render.js … --zeiten`).

## Stilwahl nach Helligkeit (Inhaber 07.11.2026)
Dunkle Welten mit Leuchtakzenten haben bei der Stilwahl **Vorrang** (REA: dunkles Farbschema mit Leuchtfarben bei 4 von 6 starken, 1 von 3 schwachen Vorbildern, Helligkeit Median 40 gegen 171; [[REA Simulierbar Regelwerk]] R13, R23). Helle Pastell- und Papier-Stile (**1, 2, 6, 10, 14**) nur, wenn das Thema sie klar trägt; die Begründung steht in `stil_begruendung`. **Kein Verbot:** Die Vorbilder sind 2D und teils von anderen Creators, und die eigenen Zahlen (Lernschleife 05.11.) sahen das dunkle Studio (Stil 18) schwächer als 17 und 19. Deshalb misst die Lernschleife hell gegen dunkel ([[Lernschleife und Insights]]).

## Frühere Einschätzung der Stile 1–15 (Archiv, ersetzt 02.11. abends)
Am 02.11. nachmittags waren diese Stile ausgeschlossen. Die Gründe bleiben als **Risikohinweise für die Qualitätslatte** stehen, sind aber kein Verbot mehr:
| Stil | Früherer Grund | Hinweis heute |
|---|---|---|
| 3 Clay-Spielzeug-3D, 12 Comic-Toon 3D | Cartoon/Clay | Material und Licht streng prüfen; Ersatzstil bei Zweifel: 18 oder 19 |
| 9, 15 Holzspielzeug, 11 Filz & Knöpfe, 6 Papier-Collage, 10 Papier-Diorama | verspielte Material-Looks | nur, wenn das Thema es trägt; Punkt 7 der Latte |
| 4 2D-Flat, 5 Neon-Dashboard, 7 Typografie | Text- und Daten-Looks | Kunst in der Welt halten (Tiefe, Bewegung) |
| 1 Low-Poly-Miniatur (Tag) | Spielzeug-Look am Tag | Weiterentwicklung: 17 Nachtstadt-Miniatur |
| 2 Isometrisches 3D | flach, ohne Atmosphäre | Weiterentwicklung: 19 Architekturmodell |
| 8 Karten-/Satellitenoptik (Tag) | ohne Atmosphäre | Weiterentwicklung: 21 Nachtkarte |
| 14 Glas-Labor | hell, teuer (`transmission`) | Weiterentwicklung: 20 Glas & Licht |
| 16 Lunar-POV | gehört zu Account 2 | bleibt Account 2 |

Fertige Videos in älteren Stilen bleiben, wie sie sind (z. B. GTA 6 in Stil 1, Spurwechsel in Stil 2).

## Qualitätsstand des Baukastens (02.11.)
- Grund-Baukästen und Demo-Szenen für die Stile 17–21 stehen (Standbilder im Demo-Projekt `pipeline/projekte/_demo-simulierbar/` reproduzierbar; Demo, nicht posten). Für die Stile 1–15 liegen Demos in `pipeline/stile/`.
- Beim ersten Einsatz je Stil kommen die themenspezifischen Objekte dazu (z. B. Zapfsäule, Brotdose, Lieferbeutel, Waschmaschine, Taxi-Schild, Küche/Büro; je 1–3 Std.). Neue Objekte immer im Stil-Modul anlegen, nicht in der Szene, damit sie wiederverwendbar sind.
- Neue Objekttypen, Szenentypen und der Erstbau eines Stils (Stile 5, 7, 8, 9, 10, 11, 15) baut Opus ([[Produktion Rhythmus und Modelle]]); Erstbau eines Stils kostet zusätzlich 3–8 Std. (S).
- Renderzeit: mit Fremdlast erneut prüfen; Standard ist der Render-Dienst auf dem PC ([[Render-Dienst Windows-PC]]). Die Stile 1–15 (außer Stil 1) und alle Stile auf der GPU sind noch nicht im Video gemessen.

## Siehe auch
- [[Licht und Atmosphäre Simulierbar]] · [[Technik und Szenenbau Simulierbar]] · [[Design und Layout Simulierbar]] · [[Stimme und Ton Simulierbar]] (Klangteppich je Stil)
- [[Videoaufbau Simulierbar]] (dort: Dramaturgie und Effekte) · [[Auswahl- und Finanzregeln Simulierbar]] · [[Themenplan Simulierbar]] (Archiv) · [[Prüfung und Abnahme Simulierbar]] · [[Account Simulierbar Überblick]]
