# Technik der Produktion (beide Accounts)

Stand 09.11.2026, nach einer Recherche dazu, womit Videos 2026 tatsächlich per Code und Agent gebaut werden. Ergebnis: Der verbreitete und belegte Weg ist „der Browser zeichnet jedes Bild als reine Funktion der Zeit, ein Chromium ohne Oberfläche nimmt es auf, ffmpeg macht daraus das Video“. Genau so arbeitet unsere Pipeline schon. Dazu kommen zwei Ergänzungen: Blender für realistische Einzelszenen und Remotion als Probelauf für den Zusammenbau.

## 1. Welches Werkzeug wofür
| Aufgabe | Werkzeug | Stand |
|---|---|---|
| Datengetriebene 3D-Szenen, Zähler, Rennen, Welten, Partikel, Kamera | **three.js** (`engine/`, `stile/`, `szene.js`) | Kern beider Accounts |
| Text im Bild, Tafel, Chips, Untertitel, Anzeige | HTML und CSS über der 3D-Szene (`engine/massstab.js`, `engine/lunar_hud.js`) | Kern; Text nie als 3D-Objekt in die Szene |
| Aufnahme Bild für Bild | `render.js` (Playwright-Chromium, `window.renderAt(t)`, mehrere Worker, JPEG Qualität 95) | Kern |
| Ton, Zusammenbau, Lautheit | `klang.py` bzw. `atmo.py`, `mux.sh` (ffmpeg) | Kern |
| Fotorealistische Schlüsselszene, die three.js nicht trägt (Wasser, Wolken, Feuer, Rauch, Haut, Makro, echtes Licht) | **Blender ohne Oberfläche** (§3) | neu, höchstens 1–2 Szenen je Video |
| Aufwendiges Objekt, das in three.js weiterleben soll | Blender backen → glTF → three.js | erlaubt wie bisher |
| Zusammenbau und Untertitel über Remotion | **nur Probelauf** (§4) | nicht für Videos, die gepostet werden |

**Nicht verwenden:** KI-Video-, Bild- und Stimmen-Generatoren (außer der freigegebenen Stimme von Account 1) · den WebGPU-Renderer von three.js für die Aufnahme (kein belegter Gewinn, bei vielen Objekten langsamer) · Physik-Bibliotheken, die Schritt für Schritt rechnen (brechen die Regel „Funktion von `t`“; Bewegung stattdessen als Formel oder vorab gebacken) · Blender-Fernsteuerung über einen MCP-Dienst als alleinigen Weg (reicht laut Praxistests nur für Entwürfe) · Motion Canvas (wird nicht mehr gepflegt) · HyperFrames (three.js-Inhalte fehlten 2026 zeitweise im Render; erst nach eigenem Test).

## 2. Regeln für jede Szene
1. **Reine Funktion von `t`:** kein `Math.random` ohne festen Startwert, kein `Date`, kein `performance.now`, kein Zustand, der von Bild zu Bild weiterläuft. Jedes Bild muss einzeln und in beliebiger Reihenfolge stimmen, weil mehrere Worker gleichzeitig rendern.
2. **Determinismus-Probe vor dem vollen Render:** dieselben 6 bis 8 Zeitpunkte zweimal rendern, einmal in aufsteigender und einmal in gemischter Reihenfolge (`node render.js projekte/<name> --zeiten …` mit getrennten `--ausgabe`-Ordnern), und die Bilder vergleichen. Weichen sie ab, hängt die Szene an einem Zustand; erst beheben, dann rendern. Zweimal dieselbe Reihenfolge zu rendern, findet den Fehler nicht.
3. **Zeiten kommen aus dem Ton:** Account 1 aus `audio/timing.json` (Wort- und Segmentzeiten der Stimme), Account 2 aus dem Zeitplan des Skripts. Keine von Hand geschätzten Sekunden im Szenen-Code.
4. **Schriften und Shader:** Schriften lokal einbinden und vor dem ersten Bild laden lassen (`window.__fertig`); Shader einmal vorwärmen, sonst ruckt das erste Bild.
5. **Grafikkarte prüfen:** `render.js` nutzt die Grafikkarte, wenn vorhanden; fällt es auf Software-Rendern zurück, dauert ein Bild ein Vielfaches. Vor einem langen Render die Zeile „je Bild im Worker“ eines Standbild-Laufs ansehen.
6. **Prüfen am Bild, nicht am Code:** Standbilder auch mitten in Kamerafahrten; Kontaktbogen aus dem fertigen MP4; Text im Bild, Überlauf und Verdeckung zuerst.

## 3. Blender-Schlüsselszene
**Wann:** nur, wenn eine Stelle sichtbar davon lebt, echt auszusehen, und three.js das nach einem ehrlichen Versuch nicht erreicht. Vor allem Account 2 (Ereignis, Höhepunkt). Höchstens 2 Szenen je Video, zusammen höchstens ca. 8 Sekunden. Der Erstbau einer neuen Blender-Szene ist ein „Neubau von Grund auf“ im Sinne der Modell-Regel (ein Opus-Agent nur dafür).

**Wie:**
1. Blender-Szene als **Python-Skript** bauen (`projekte/<name>/blender/<szene>.py`), nicht von Hand: so bleibt sie wiederholbar und prüfbar. Fester Startwert für jeden Zufall.
2. Format 1080 × 1920, 30 Bilder je Sekunde, Bildfolge als PNG oder JPEG nach `projekte/<name>/blender/<szene>/0001.png …`.
3. Start ohne Oberfläche: `"C:\Program Files\Blender Foundation\Blender 5.2\blender.exe" -b -P projekte/<name>/blender/<szene>.py -- --von 1 --bis 120`. Lange Läufe als eigener Prozess, nie im Vordergrund der Sitzung.
4. **Erst 3 Probebilder** (Anfang, Mitte, Ende) rendern, ansehen, Zeit je Bild notieren. Erst wenn Bild und Zeit passen, die ganze Folge.
5. In der three.js-Szene liegt die Bildfolge als Ebene, das Bild wird über `t` gewählt (`Bildnummer = floor((t − start) × 30) + 1`). So bleibt alles eine Funktion von `t`, und Tafel, Anzeige und Text liegen wie gewohnt darüber.
6. Übergang hinein und heraus über eine Kamerabewegung oder einen der erlaubten Schnitte; Licht und Farbe der three.js-Welt davor und danach an die Blender-Szene angleichen.

**Offen (vor dem ersten echten Einsatz mit dem Inhaber klären):** Die Bildfolgen sind groß und gehören nicht ins öffentliche Repo. Der Render-Dienst holt den Stand aber aus `origin/main`. Bis geklärt ist, wie die Bilder zum rendernden Rechner kommen, gilt: Blender-Szenen nur in Videos, die auf demselben Rechner gebaut und gerendert werden, und der Ordner `projekte/<name>/blender/<szene>/` bleibt außerhalb von Git.

## 4. Probelauf Remotion (Entscheidung des Inhabers 09.11.2026: testen)
Ziel: herausfinden, ob Zusammenbau und Untertitel über Remotion besser oder schneller sind als `render.js` plus `mux.sh`. **Nur an einem schon fertigen, geposteten Projekt**, nie an einem Video in Arbeit.
1. Ein fertiges Simulierbar-Projekt wählen. In `pipeline/vorschau/remotion-probe/` ein Remotion-Projekt anlegen (Skill-Familie `remotion:*`), das die vorhandene Bildfolge bzw. die three.js-Szene, `audio/stimme.mp3`, den Klangteppich und die Untertitel aus `timing.json` zusammensetzt.
2. Messen: Zeit für den gesamten Export, Bildgleichheit zur bisherigen Fassung an 8 Standbildern, Lesbarkeit und Takt der Untertitel, Lautheit.
3. Ergebnis als Vorschlag an den Inhaber: Zahlen nebeneinander, Empfehlung, Aufwand für einen Umstieg. Ohne seine Entscheidung ändert sich an der Pipeline nichts.
Hinweis zur Lizenz: Remotion ist für Einzelpersonen und Firmen bis 3 Personen frei.

## 5. Geschwindigkeit
- Der Engpass ist meist das Abspeichern des Bildes, nicht das Rendern. JPEG Qualität 95 ist deshalb Standard, PNG nur für Standbilder.
- Mehr Worker bringen nur etwas, solange Prozessor und Grafikspeicher mitkommen; der Laptop rendert während der Arbeit im Cockpit, also nicht über die eingestellte Zahl gehen.
- `--nur-fehlende` setzt einen abgebrochenen Render fort.
