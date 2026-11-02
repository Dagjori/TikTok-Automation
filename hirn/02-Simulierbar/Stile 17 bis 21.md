---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/stile.md, .claude/skills/simulierbar-video/SKILL.md, CLAUDE.md §4, data/plan/30-tage.csv, tools/plan_pdf.mjs
tags: [konto/simulierbar, stile, look, renderzeit, baukasten]
---

# Stile 17 bis 21

> „hier möchte ich mehr weg von dem Cartoon Clay sachen, hier müssen was seriöseres finden bei der mit licht effekten bisschen gespielt werden kann etc. das eine gewisse atmosphäre entstehen kann … keine sticker mehr … richtig hochwertige animations videos“ (Inhaber, 02.11.)

Seriöser, hochwertiger Look mit Licht und Atmosphäre. Keine Cartoon-, Clay-, Spielzeug-, Filz-, Papier-Stile, keine Sticker. Technik der Stile: [[Technik und Szenenbau Simulierbar]], Lichtwerkzeuge: [[Licht und Atmosphäre Simulierbar]], HUD: [[Design und Layout Simulierbar]].

## Wahlregeln
- Jedes Video bekommt **genau einen** der fünf Stile 17–21 (Skill `stile.md`). Kein fester Look als Markenzeichen (Entscheidung 01.11.), das Markenzeichen ist die Qualität.
- **Nie zweimal derselbe Stil hintereinander** (auch über Tagesgrenzen); passen zwei, gewinnt der, der länger nicht dran war.
- Der Stil steht im Plan (`data/plan/30-tage.csv`, Spalte `stil`, siehe [[Themenplan Simulierbar]]).
- **Begründungspflicht:** Vor der Produktion kurz erfolgreiche Videos zum Thema ansehen (welcher Look trägt das Thema am besten, wie heben wir uns in der Qualität ab) und die Wahl in `skript.json → stil_begruendung` festhalten.
- Prüfung `massstab.py` 18b (Pflicht bei `"skill": "simulierbar-video"` oder Szene mit `sim_atmosphaere.js`): Stil muss 17–21 sein, und es dürfen keine alten Stil-Module importiert werden.
- Stil 16 Lunar-POV gehört zu Account 2 ([[Trennung der Accounts]]).

## Die erlaubten Stile
Renderzeit: Sekunden je Videobild 1080 × 1920 in der Cloud (4 Kerne, ohne GPU, SwiftShader), Demo-Szene mit HUD, MSAA 0 (FXAA), Schatten 2048, gemessen am 02.11. Standbilder der Demo: `node render.js projekte/_demo-simulierbar --zeiten <t> --worker 1 --query "stil=<name>"`.

| Nr. | Stil | Look | Passt zu (Geld-Themen aus dem Plan) | Baukasten · Demo-Welt | Grading |
|---|---|---|---|---|---|
| **17** | **Nachtstadt-Miniatur** | Stadtmodell zur blauen Stunde nach Regen: erleuchtete Fenster, Laternen mit Lichtkegel und Lichtfleck, nasser Asphalt mit Spiegelung, Lichtspuren in Teamfarbe (Langzeitbelichtung = Weg eines Teams), Skyline im Dunst, Tilt-Shift | Auto, Taxi, Parken, Tanken, Pendeln in der Stadt, Lieferdienst, E-Bike, Führerschein, Waschsalon, Black-Friday-Einkaufsstraße, Nachtschicht | `stil_nachtstadt.js` · `welten/nachtstadt.js` (Parkhaus oder Parkplatz suchen) | `GRADING.nacht` |
| **18** | **Dunkles Studio (Produktlicht)** | schwarzes Fotostudio mit Hohlkehle und Spiegelboden; Geld als echtes Objekt: Münzen mit Rändelung und Prägung, Scheinbündel mit Banderole, Balkenwaage aus Stahl, Sockel mit LED-Kante in Teamfarbe; Softbox-Streiflicht, Kantenlichter, Spot mit Kegel und Staub, Lichtstrahlen, Tiefenschärfe | reine Geldfragen: Gehalt, Prämie, Minijob, Freelancer, Schulden, Dispo, Kredit, Steuerklasse, Versicherung, Rabatt, Gutschein oder Bargeld, Produkte (Handy, Konsole, Laptop, Großpackung) | `stil_studio.js` · `welten/studio.js` (1.000 € Prämie oder 50 € mehr im Monat) | `GRADING.studio` |
| **19** | **Architekturmodell (Abendlicht)** | weißes Kartonmodell mit Fensterschnitten auf einer Sperrholzplatte, tiefe goldene Sonne im Gegenlicht, lange Schatten, Lichtstrahlen, Schnitt-Haus mit warmem Innenlicht, Acrylglas-Marker in Teamfarbe für die beiden Alternativen, Modellbäume und -figuren, Tiefenschärfe | Wohnen und Haushalt: WG oder Wohnung, Miete (Staffel/Index), Umzug, Zusammenziehen, Heizen, Putzen, Streichen, Homeoffice, Teilzeit (Bürohaus), Familie, Urlaub (Hotel/Ferienwohnung), Mittagessen (Küche/Büro) | `stil_architektur.js` · `welten/architektur.js` (WG-Zimmer oder eigene Wohnung) | `GRADING.abend` |
| **20** | **Glas & Licht** | dunkles Labor, Messgefäße im Dunkelfeld (Glas nur über leuchtende Kanten), Geld als leuchtende Flüssigkeit in Teamfarbe (Füllstand = Live-Zähler), Zulauf, Bläschen, Kaustik auf der spiegelnden Bank, Spot-Kegel, Gegenlicht | alles, was sich ansammelt oder abfließt: Kaffee je Tasse, Wasser, Strom, Rente, Sparen (52-Wochen, Tagesgeld), Abo/Vertrag, Kontaktlinsen, Fitnessvertrag, Garantie | `stil_lichtlabor.js` · `welten/lichtlabor.js` (Kapselmaschine oder Vollautomat) | `GRADING.labor` |
| **21** | **Nachtkarte** | Geländerelief im Mondlicht mit Höhenlinien, Flüssen und Wäldern, Städte als Lichtteppiche, schwaches Straßennetz, Routen in Teamfarbe mit Lichtkopf, Ortsmarken als Lichtsäulen mit Puls, tiefe Wolken mit Parallaxe | Orte und Wege: Pendeln, Jobangebot in zwei Städten, Fahrgemeinschaft, Bahn oder Auto, Homeoffice gegen Arbeitsweg, Reisen | `stil_nachtkarte.js` · `welten/nachtkarte.js` (40 km pendeln oder näher ziehen) | `GRADING.karte` |

### Gemessene Renderzeit (Demo-Szenen, Cloud ohne GPU)
| Nr. | Stil | Renderzeit Cloud (s/Bild) | Demo-Standbild |
|---|---|---|---|
| 17 | Nachtstadt-Miniatur | **4,0** (über 3 s/Bild, auf dem PC mit GPU unkritisch; Cloud-Rückfall: Spiegelung aus −0,4 s, ohne Spiegelung, Kegel, Tilt-Shift und Schatten 2,5 s) | `?stil=nachtstadt`, t = 8,2 s |
| 18 | Dunkles Studio | **2,3** | `?stil=studio`, t = 10,4 s |
| 19 | Architekturmodell | **2,5** | `?stil=architektur`, t = 10,8 s |
| 20 | Glas & Licht | **1,7** | `?stil=lichtlabor`, t = 10,6 s |
| 21 | Nachtkarte | **1,9** | `?stil=nachtkarte`, t = 12,6 s |

Messung (F): 02.11.2026, 12 Bilder je Stil (t = 6,0–6,4 s), 1 Worker, ohne Fremdlast (Referenz `_demo-massstab` dabei 2,2 s je Standbild wie zu Beginn der Sitzung), MSAA 0 (FXAA), Schatten 2048, Bloom, HUD, JPG; Werte = „s/Bild effektiv“ von `render.js`. Mit MSAA 2 ca. 25 % mehr (S, Messung unter Last). Ziel beim Cloud-Rückfall ≤ 3 s/Bild; Standard ist der Render-Dienst auf dem PC ([[Render-Dienst Windows-PC]]). Mit Fremdlast Renderzeit erneut prüfen; Qualitätsschalter `msaa`, `schatten`, Spiegelung und Nebel sind in der Demo per Query abschaltbar.

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

Die alten Baukästen bleiben im Repo (ältere Projekte und Account-2-Themen), werden für neue Simulierbar-Videos aber nicht importiert (`massstab.py` 18b). Fertige Videos in alten Stilen bleiben, wie sie sind (z. B. GTA 6 in Stil 1, Spurwechsel in Stil 2).

## Qualitätsstand des Baukastens (02.11.)
- Grund-Baukästen und Demo-Szenen für alle fünf Stile stehen (Standbilder im Demo-Projekt `pipeline/projekte/_demo-simulierbar/` reproduzierbar; Demo, nicht posten).
- Beim ersten Einsatz je Stil kommen die themenspezifischen Objekte dazu (z. B. Zapfsäule, Brotdose, Lieferbeutel, Waschmaschine). Für 03.11. fehlen Taxi-Schild (Stil 17) und Küche/Büro (Stil 19), je 1–3 Std. Neue Objekte immer im Stil-Modul anlegen, nicht in der Szene, damit sie wiederverwendbar sind.
- Neue Objekttypen und Szenentypen baut Opus ([[Produktion Rhythmus und Modelle]]); Erstbau eines Stils kostet zusätzlich 3–8 Std. (S).

## Siehe auch
- [[Licht und Atmosphäre Simulierbar]] · [[Technik und Szenenbau Simulierbar]] · [[Design und Layout Simulierbar]] · [[Stimme und Ton Simulierbar]] (Klangteppich je Stil)
- [[Themenplan Simulierbar]] · [[Prüfung und Abnahme Simulierbar]] · [[Account Simulierbar Überblick]]
