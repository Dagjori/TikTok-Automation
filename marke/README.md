# Marke Simulierbar: Bildmarke (3D-Logo)

**Stand:** 01.11.2026 · **Status:** Entwurf, der Inhaber wählt aus

> **Nicht im Video verwenden.** Im Video erscheinen weder Name noch Logo (Entscheidung des Inhabers, passt zu Gesetz 1 und 10 in `.claude/skills/simulierbar-video/massstab.md`). Die Bildmarke ist nur für Profilbild (TikTok, YouTube), YouTube-Banner, Impressum und später Merch gedacht.

Übersicht aller drei Konzepte: [`logo/uebersicht.png`](logo/uebersicht.png)

## 1. Kurzfazit

**Entscheidung des Inhabers (01.11.2026): Konzept A „S-Kurve“, als statisches Profilbild ohne Animation** (`logo/a-s-kurve/simulierbar-logo-a-s-kurve-profilbild-1080.png`). Die Animation bleibt nur als Reserve.

**Empfehlung: Konzept A „S-Kurve“.** Es ist das einzige Zeichen, das Name (S), Format (zwei Varianten im Duell) und Tempo (Rennbahn, kursiv) zugleich trägt. Bei 48 px im Kreis bleibt ein klares zweifarbiges S übrig (gesehen in den Prüfbildern). Für A gibt es zusätzlich die Logo-Animation.

## 2. Die drei Konzepte

| | Idee | Stärke | Schwäche |
|---|---|---|---|
| **A „S-Kurve“** | Ein S aus zwei parallelen Rennbahnen in Blau und Orange. In der Mitte tauschen die Bahnen Innen- und Außenseite wie in einer echten Schikane, keiner ist im Vorteil: das faire Duell. Leicht kursiv, weich glänzender Kunststoff mit Klarlack und runden Fasen. | trägt den Namen, eigenständig, im Kleinen am kräftigsten | ein Buchstabe allein erzählt „Simulation“ nur über die Bahnen |
| **B „Kugelbahn“** | Zwei Kugeln in den Teamfarben rollen auf einer gebogenen Porzellan-Bahn um die Wette. Die Bahn ist eine Zykloide, also die Brachistochrone: Auf ihr ist eine Kugel schneller unten als auf der geraden Strecke. Der Simulations-Klassiker mit der Kanal-Pointe „Die naheliegende Antwort stimmt nicht immer“. | beste Geschichte, freundlich, ungewöhnlich | bei 32–48 px nur „Bogen mit zwei Punkten“, die Pointe sieht man erst groß |
| **C „Schleppzeiger“** | Eine Stoppuhr aus glasierter Keramik mit zwei Zeigern in Blau und Orange und gelber Nabe. Vorbild ist die Schleppzeiger-Stoppuhr, mit der man zwei Läufer gleichzeitig stoppt. Die Zeiger stehen auf „10:10“ und bilden ein V wie „versus“. | sofort als Stoppuhr erkennbar, auch bei 32 px | am wenigsten eigen, Stoppuhren sind ein verbreitetes Symbol |

Bewertung der Stärken und Schwächen: eigene Einschätzung aus den Prüfbildern (**Annahme**, nicht mit Zuschauern getestet).

Verworfen auf dem Weg: Zwei Bahnen (gerade gegen gekrümmt) mit gemeinsamem Start und Ziel wirkten wie Pfeil und Bogen; Stroboskop-Spuren hinter den Kugeln und Läuferkugeln auf dem S machten das Zeichen unruhig; ein Glas über dem Zifferblatt (C) erzeugte harte Lichtkanten.

## 3. Farben

| Rolle | Wert | Herkunft |
|---|---|---|
| Team Blau | `#2F6FED` | Markenfarbe, unverändert |
| Team Orange | `#FF7A1A` | Markenfarbe, unverändert |
| Akzent Gelb | `#FFD23F` | Markenfarbe (nur C: Nabe) |
| Porzellanweiß | `#F4F2ED` | **neu fürs Logo:** leicht warmes Weiß statt Reinweiß, damit Glanzlichter auf Keramik sichtbar bleiben und nichts ausbrennt |
| Hintergrund Profilbild | Verlauf `#242A3A` (Mitte) → `#0E1016` (Rand) | **verfeinert aus Tinte `#14171F`:** hellere Mitte wie ein Studio-Spot, dadurch löst sich das Motiv auch im dunklen Modus von TikTok/YouTube vom Grund |

Grün `#19B36B` kommt im Logo bewusst nicht vor: Bei 48 px tragen höchstens zwei bis drei Farben, und Blau gegen Orange ist das Duell.

Gerendert mit der Farbumwandlung „Khronos PBR Neutral“, damit die Teamfarben im 3D-Bild markentreu bleiben. Gemessen (Median aller Flächen in A): Blau `#276BEA` (Ziel `#2F6FED`), Orange `#F47A34` (Ziel `#FF7A1A`, durch den Klarlack-Glanz etwas weicher).

## 4. Dateien je Konzept

| Datei | Zweck |
|---|---|
| `…-profilbild-1080.png` | Profilbild 1080×1080 mit Hintergrund; Motiv reicht bis ca. 83 % des Kreisdurchmessers, ist also im runden Zuschnitt sicher |
| `…-freigestellt-2048.png` | transparent, 2048×2048, für Banner, Impressum, Merch-Entwürfe |
| `…-pruefbild-klein.png` | Kontrolle: 110 px, 48 px (auch 4× vergrößert), 40 px und 32 px im Kreis, dunkler und heller Modus |
| `….blend` | Blender-Szene (Blender 5.2, Cycles), nur prozedurale Materialien, keine gepackten Texturen |
| `….glb` | glTF-Binärdatei für Three.js; Logo zeigt nach +Z, oben ist +Y, Materialien mit Klarlack (KHR_materials_clearcoat) |
| nur A: `…-animation.mp4` | Logo-Animation 2,5 s, 1080×1080, 30 fps, H.264: Die Bahnen zeichnen sich als Rennen (Blau startet schneller, Orange gewinnt knapp), dann wandert ein Lichtreflex darüber |
| `roh-2048.png` | unbearbeiteter Render, nur lokal (per `logo/.gitignore` ausgeschlossen) |

Skripte in `logo/skripte/`: `gemeinsam.py` (Studio-Licht, Materialien, Geometrie, Export), je ein `konzept_*.py`, `nachbearbeitung.py` (Pillow), `animation_a_s_kurve.py`.

## 5. Nächste Schritte

1. **Inhaber:** Konzept wählen, gern mit Änderungswunsch (z. B. Farbtausch oben/unten, weniger kursiv). ca. 5 min.
2. **Inhaber:** `…-profilbild-1080.png` in TikTok und YouTube als Profilbild hochladen. ca. 5 min.
3. **Claude:** YouTube-Banner und Impressum-Variante aus dem Freisteller bauen. ca. 20 min.
4. **Optional, Inhaber:** Markenrecherche, falls die Marke geschützt werden soll (siehe 7.).

## 6. Neu erzeugen

```bash
cd marke/logo/skripte
/home/user/.venv-blender/bin/python konzept_a_s_kurve.py        # .blend, .glb, roh-2048.png
/home/user/.venv-blender/bin/python konzept_b_kugelbahn.py
/home/user/.venv-blender/bin/python konzept_c_schleppzeiger.py
python3 nachbearbeitung.py                                       # Profilbilder, Freisteller, Prüfbilder, Übersicht
/home/user/.venv-blender/bin/python animation_a_s_kurve.py       # Einzelbilder der Animation (15–40 min CPU je nach Last)
python3 animation_a_s_kurve.py --montage                         # MP4
```

Mit `-- --vorschau` rendert ein Konzept-Skript schnell in 1024 px in den Scratch-Ordner (Umgebungsvariable `LOGO_SCRATCH`). Unter Windows laufen die Skripte mit Blender 5.x (`blender -b -P konzept_a_s_kurve.py`); die Nachbearbeitung braucht Python mit Pillow und numpy, optional `pngquant` zum Verkleinern der PNG.

## 7. Rechtliches

- **Eigene Geometrie:** Alle Formen und Materialien sind per Python-Skript selbst erzeugt. Keine fremden Modelle, Texturen oder Schriften im Logo.
- **Schrift nur in den Kontrollbildern:** Inter (SIL Open Font License 1.1).
- **Plausibilitätscheck per Websuche (31.10.2026, keine Garantie):** Kein bekanntes Logo gefunden, das einem zweibahnigen S, zwei Kugeln auf einer Zykloiden-Bahn oder einer Stoppuhr mit blauem und orangem Zeiger offensichtlich gleicht. Am nächsten kommt bei C das Logo von [timeanddate.com](https://www.timeanddate.com/information/aboutlogo.html) (zwei Uhrzeiger unter farbigen Bögen), das aber anders aufgebaut ist.
- **Vor einem Markenschutz:** Recherche nach ähnlichen Bildmarken in DPMAregister (Deutschland) und TMview bzw. EUIPO eSearch plus (EU), am besten über die Wiener Bildklassifikation (z. B. Buchstabe S, Uhren) und in den passenden Nizza-Klassen. Welche Klassen passen (vermutlich 41 Unterhaltung/Bildung, 9 digitale Medien, 25 Bekleidung für Merch) ist eine **Annahme** und vor einer Anmeldung mit einer Fachperson zu klären.

## 8. Offene Punkte

- Wahl des Konzepts durch den Inhaber.
- YouTube-Banner (2560×1440, sichere Mitte) ist noch nicht gebaut.
- Merch: Für Druck ist eine flache Vektor-Version (SVG) der gewählten Marke sinnvoll, die gibt es noch nicht.
