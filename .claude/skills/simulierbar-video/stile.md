# Stile für Simulierbar (Inhaber 02.11.)

> „hier möchte ich mehr weg von dem Cartoon Clay sachen, hier müssen was seriöseres finden bei der mit licht effekten bisschen gespielt werden kann etc. das eine gewisse atmosphäre entstehen kann … keine sticker mehr … richtig hochwertige animations videos“ (Inhaber, 02.11.)

Jedes Video bekommt **genau einen** der fünf Stile 17–21. Kein fester Look als Markenzeichen (Entscheidung 01.11.), das Markenzeichen ist die Qualität. Nie zweimal derselbe Stil hintereinander (auch über Tagesgrenzen); passen zwei, gewinnt der, der länger nicht dran war. Der Stil steht im Plan (`data/plan/30-tage.csv`, Spalte `stil`); vor der Produktion kurz erfolgreiche Videos zum Thema ansehen (`docs/10` §0) und die Wahl in `skript.json → stil_begruendung` festhalten.

## Die erlaubten Stile

Renderzeit: Sekunden je Videobild 1080 × 1920 in der Cloud (4 Kerne, ohne GPU, SwiftShader), Demo-Szene mit HUD, MSAA 0 (FXAA), Schatten 2048, gemessen am 02.11. (Details und Messweise `docs/10` §0.6). Standbilder: `node render.js projekte/_demo-simulierbar --zeiten <t> --worker 1 --query "stil=<name>"`.

| Nr. | Stil | Look | Passt zu (Geld-Themen aus dem Plan) | Baukasten · Demo-Welt | Grading |
|---|---|---|---|---|---|
| **17** | **Nachtstadt-Miniatur** | Stadtmodell zur blauen Stunde nach Regen: erleuchtete Fenster, Laternen mit Lichtkegel und Lichtfleck, nasser Asphalt mit Spiegelung, Lichtspuren in Teamfarbe (Langzeitbelichtung = Weg eines Teams), Skyline im Dunst, Tilt-Shift | Auto, Taxi, Parken, Tanken, Pendeln in der Stadt, Lieferdienst, E-Bike, Führerschein, Waschsalon, Black-Friday-Einkaufsstraße, Nachtschicht | `stil_nachtstadt.js` · `welten/nachtstadt.js` (Parkhaus oder Parkplatz suchen) | `GRADING.nacht` |
| **18** | **Dunkles Studio (Produktlicht)** | schwarzes Fotostudio mit Hohlkehle und Spiegelboden; Geld als echtes Objekt: Münzen mit Rändelung und Prägung, Scheinbündel mit Banderole, Balkenwaage aus Stahl, Sockel mit LED-Kante in Teamfarbe; Softbox-Streiflicht, Kantenlichter, Spot mit Kegel und Staub, Lichtstrahlen, Tiefenschärfe | reine Geldfragen: Gehalt, Prämie, Minijob, Freelancer, Schulden, Dispo, Kredit, Steuerklasse, Versicherung, Rabatt, Gutschein oder Bargeld, Produkte (Handy, Konsole, Laptop, Großpackung) | `stil_studio.js` · `welten/studio.js` (1.000 € Prämie oder 50 € mehr im Monat) | `GRADING.studio` |
| **19** | **Architekturmodell (Abendlicht)** | weißes Kartonmodell mit Fensterschnitten auf einer Sperrholzplatte, tiefe goldene Sonne im Gegenlicht, lange Schatten, Lichtstrahlen, Schnitt-Haus mit warmem Innenlicht, Acrylglas-Marker in Teamfarbe für die beiden Alternativen, Modellbäume und -figuren, Tiefenschärfe | Wohnen und Haushalt: WG oder Wohnung, Miete (Staffel/Index), Umzug, Zusammenziehen, Heizen, Putzen, Streichen, Homeoffice, Teilzeit (Bürohaus), Familie, Urlaub (Hotel/Ferienwohnung), Mittagessen (Küche/Büro) | `stil_architektur.js` · `welten/architektur.js` (WG-Zimmer oder eigene Wohnung) | `GRADING.abend` |
| **20** | **Glas & Licht** | dunkles Labor, Messgefäße im Dunkelfeld (Glas nur über leuchtende Kanten), Geld als leuchtende Flüssigkeit in Teamfarbe (Füllstand = Live-Zähler), Zulauf, Bläschen, Kaustik auf der spiegelnden Bank, Spot-Kegel, Gegenlicht | alles, was sich ansammelt oder abfließt: Kaffee je Tasse, Wasser, Strom, Rente, Sparen (52-Wochen, Tagesgeld), Abo/Vertrag, Kontaktlinsen, Fitnessvertrag, Garantie | `stil_lichtlabor.js` · `welten/lichtlabor.js` (Kapselmaschine oder Vollautomat) | `GRADING.labor` |
| **21** | **Nachtkarte** | Geländerelief im Mondlicht mit Höhenlinien, Flüssen und Wäldern, Städte als Lichtteppiche, schwaches Straßennetz, Routen in Teamfarbe mit Lichtkopf, Ortsmarken als Lichtsäulen mit Puls, tiefe Wolken mit Parallaxe | Orte und Wege: Pendeln, Jobangebot in zwei Städten, Fahrgemeinschaft, Bahn oder Auto, Homeoffice gegen Arbeitsweg, Reisen | `stil_nachtkarte.js` · `welten/nachtkarte.js` (40 km pendeln oder näher ziehen) | `GRADING.karte` |

**Gemessene Renderzeit (s/Bild) und Demo-Standbild:** siehe Tabelle in `docs/10-designstile.md` §0.6 (wird bei jeder neuen Messung dort nachgetragen).

### Hinweise je Stil
- **17 Nachtstadt:** Gebäude teilen sich den Fassaden-Atlas (ein Material) → nach dem Aufbau `buendeln(szene)`. Teamfarbe als Lack, Lichtspur, LED-Kante. Orange wirkt neben Natriumlicht schwächer: Lichtspur dann etwas heller (`staerke 5`). Kamera von schräg oben über die Straße, Hauptobjekte nicht hinter hohen Vordergrundhäusern; Vordergrund-Blöcke niedrig halten.
- **18 Studio:** Duelle über die Balkenwaage nur, wenn die Neigung die Rechnung zeigt (schwerere Seite tiefer, Kamera auf Schalenhöhe, Waage höchstens 0,6 rad gedreht, sonst täuscht die Perspektive). Münze = fester Betrag (z. B. 50 €), Zähler auf der Tafel exakt. Keine echten Euro-Motive.
- **19 Architekturmodell:** Gegenlicht-Sonne (Richtung von hinten, Höhe 0,2–0,35) + `strahlen` ergibt die Atmosphäre; Frontlicht wirkt flach. Weiß bleibt weiß: Sonne nicht zu gesättigt (`#FFC283`). Teamfarbe nur als Acryl-Marker und Lichtfleck.
- **20 Glas & Licht:** Gefäße schmal (r ≈ 0,45) und eng nebeneinander (± 0,7), Kamera ≥ 10 Einheiten entfernt (Hochformat). Glas-Stärken in `glasMaterial` niedrig halten, sonst wirkt es milchig. Skala zum Betrachter drehen.
- **21 Nachtkarte:** `karte.hoehe(x, z)` für alles, was auf dem Gelände sitzt. Start und Ziel beider Routen müssen im Bild sein. Lichtglocke der Städte schwach (0,16).

## Einschübe (kein Hauptstil)
- **13 Blaupause / Schnittmodell** (`stil_blaupause.js`): nur als „Warum?“-Szenenwechsel (Querschnitt eines Geräts, Aufschlüsselung), mit `GRADING` des Hauptstils und ohne Comic-Elemente.
- **7 Kinetische Typografie:** nur als HUD-Baustein (`M.pointe` für Merksatz bzw. Ergebniszahl) im ruhigen Look von `sim_hud.css`.

## Nicht mehr für Simulierbar (Inhaber 02.11.)
| Stil | Grund | Ersatz |
|---|---|---|
| 3 Clay-Spielzeug-3D, 12 Comic-Toon 3D | Cartoon/Clay (ausdrücklich raus) | 18 Studio bzw. 19 Architekturmodell |
| 9 Holzspielzeug-Tisch, 15 Holz gebacken, 11 Filz & Knöpfe, 6 Papier-Collage, 10 Papier-Diorama | verspielte Material-Looks, nicht seriös | 18, 19 |
| 4 2D-Flat-Infografik, 5 Neon-Daten-Dashboard, 7 Typografie (als Hauptstil) | Text- und Daten-Looks, die Kunst soll in der Welt liegen | 18, 20 (Daten als Objekt bzw. Füllstand) |
| 1 Low-Poly-Miniatur (Tag, Pastell) | Spielzeug-Look am Tag | 17 Nachtstadt-Miniatur (Weiterentwicklung) |
| 2 Isometrisches 3D (Pastell, harte Schatten) | flach, ohne Atmosphäre | 19 Architekturmodell (Weiterentwicklung mit realistischem Licht) |
| 8 Karten-/Satellitenoptik (Tag) | ohne Atmosphäre | 21 Nachtkarte (Weiterentwicklung) |
| 14 Glas-Labor (helles Studio) | hell, ohne Lichtstimmung, teuer (`transmission`) | 20 Glas & Licht (Weiterentwicklung, billiger) |
| 16 Lunar-POV | gehört zu Account 2 | – |

Die alten Baukästen bleiben im Repo (ältere Projekte und Account-2-Themen), werden für neue Simulierbar-Videos aber nicht importiert (`massstab.py` 18b).
