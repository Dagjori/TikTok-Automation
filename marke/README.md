# Marke Simulierbar: Bildmarke (3D-Logo)

**Stand:** 01.11.2026 · **Status:** Entwurf, der Inhaber wählt aus

> **Nicht im Video verwenden.** Im Video erscheinen weder Name noch Logo (Entscheidung des Inhabers, vgl. Maßstab-Gesetz 1 und 10 in `docs/15-massstab.md`). Die Bildmarke ist nur für Profilbild (TikTok, YouTube), YouTube-Banner, Impressum und später Merch gedacht.

Übersicht aller drei Konzepte: [`logo/uebersicht.png`](logo/uebersicht.png)

## 1. Empfehlung

**Konzept A „S-Kurve“.** Es ist das einzige Zeichen, das gleichzeitig den Namen (S), das Format (zwei Varianten im Duell) und das Tempo (Rennbahn, kursiv) trägt. Bei 48 px im Kreis bleibt ein klares zweifarbiges S übrig, das sich auch in hellem und dunklem Modus sofort vom Feed abhebt (geprüft in den Prüfbildern, siehe unten). Für A gibt es zusätzlich die Logo-Animation.

## 2. Die drei Konzepte

### A „S-Kurve“ (empfohlen)
Ein S aus zwei parallelen Rennbahnen in Blau und Orange. In der Mitte tauschen die Bahnen Innen- und Außenseite wie in einer echten Schikane, keiner hat einen Vorteil: das faire Duell. Leicht kursiv, weich glänzender Kunststoff mit Klarlack und runden Fasen.
Ordner: `logo/a-s-kurve/`

### B „Kugelbahn“
Zwei Kugeln in den Teamfarben rollen auf einer gebogenen Porzellan-Bahn um die Wette. Die Bahn ist eine Zykloide, also die Brachistochrone: die Kurve, auf der eine Kugel schneller unten ist als auf der geraden Strecke. Ein Simulations-Klassiker mit genau der Kanal-Pointe „Die naheliegende Antwort stimmt nicht immer“.
Ordner: `logo/b-kugelbahn/`

### C „Schleppzeiger“
Eine Stoppuhr aus glasierter Keramik mit zwei Zeigern in Blau und Orange und gelber Nabe. Vorbild ist die Schleppzeiger-Stoppuhr, mit der man zwei Läufer gleichzeitig stoppt. Die Zeiger stehen auf „10:10“ und bilden ein V wie „versus“. Am sichersten lesbar, aber am wenigsten eigen (Stoppuhren sind ein verbreitetes Symbol).
Ordner: `logo/c-schleppzeiger/`

## 3. Farben

| Rolle | Wert | Herkunft |
|---|---|---|
| Team Blau | `#2F6FED` | Markenfarbe, unverändert |
| Team Orange | `#FF7A1A` | Markenfarbe, unverändert |
| Akzent Gelb | `#FFD23F` | Markenfarbe (nur C: Nabe) |
| Porzellanweiß | `#F4F2ED` | **neu fürs Logo:** leicht warmes Weiß statt Reinweiß, damit Glanzlichter auf Keramik noch sichtbar sind und nichts ausbrennt |
| Hintergrund Profilbild | Verlauf `#242A3A` (Mitte) → `#0E1016` (Rand) | **verfeinert aus Tinte `#14171F`:** hellere Mitte wie ein Studio-Spot, dadurch hebt sich das Motiv auch im dunklen Modus von TikTok/YouTube ab |

Grün `#19B36B` kommt im Logo bewusst nicht vor: Bei 48 px tragen höchstens zwei bis drei Farben, und Blau gegen Orange ist das Duell.

Gerendert mit „Khronos PBR Neutral“ als Farbumwandlung, damit Blau und Orange im 3D-Bild markentreu bleiben. Gemessen (Median aller Flächen in A): Blau `#276BEA` (Ziel `#2F6FED`), Orange `#F47A34` (Ziel `#FF7A1A`, durch den Klarlack-Glanz etwas weicher).

## 4. Dateien je Konzept

| Datei | Zweck |
|---|---|
| `…-profilbild-1080.png` | Profilbild 1080×1080 mit Hintergrund, Motiv im Kreis sicher (reicht bis ca. 83 % des Durchmessers) |
| `…-freigestellt-2048.png` | transparent, 2048×2048, für Banner, Impressum, Merch-Entwürfe |
| `…-pruefbild-klein.png` | Kontrolle: 110 px, 48 px (auch 4× vergrößert), 40 px und 32 px im Kreis, dunkler und heller Modus |
| `….blend` | Blender-Szene (Blender 5.2, Cycles), ohne gepackte Texturen |
| `….glb` | glTF-Binärdatei für Three.js; Logo zeigt nach +Z, oben ist +Y |
| `roh-2048.png` | unbearbeiteter Render, nur lokal (per `logo/.gitignore` ausgeschlossen, wird neu erzeugt) |
| nur A: `…-animation.mp4` | Logo-Animation 2,5 s, 1080×1080, 30 fps, H.264 |

## 5. Neu erzeugen

```bash
cd marke/logo/skripte
/home/user/.venv-blender/bin/python konzept_a_s_kurve.py        # .blend, .glb, roh-2048.png
/home/user/.venv-blender/bin/python konzept_b_kugelbahn.py
/home/user/.venv-blender/bin/python konzept_c_schleppzeiger.py
python3 nachbearbeitung.py                                       # Profilbilder, Freisteller, Prüfbilder, Übersicht
/home/user/.venv-blender/bin/python animation_a_s_kurve.py       # Einzelbilder der Animation (ca. 15 min CPU)
python3 animation_a_s_kurve.py --montage                         # MP4
```

Mit `-- --vorschau` rendert ein Konzept-Skript schnell in 1024 px in den Scratch-Ordner (`LOGO_SCRATCH`). Alles läuft auch unter Windows mit Blender 5.x (`blender -b -P skript.py`) bzw. dem bpy-Modul; Nachbearbeitung braucht Python mit Pillow und numpy, optional `pngquant`.

## 6. Rechtliches

- **Eigene Geometrie:** Alle Formen und Materialien sind per Python-Skript selbst erzeugt, keine fremden Modelle, Texturen oder Schriften im Logo.
- **Schrift nur in den Kontrollbildern:** Inter (SIL Open Font License 1.1).
- **Plausibilitätscheck (31.10.2026, Websuche, keine Garantie):** Kein bekanntes Logo gefunden, das einem zweibahnigen S, zwei Kugeln auf einer Zykloiden-Bahn oder einer Stoppuhr mit blauem und orangem Zeiger offensichtlich gleicht. Am nächsten kommt bei C das Logo von timeanddate.com (zwei Uhrzeiger unter farbigen Bögen), das aber anders aufgebaut ist.
- **Vor einem Markenschutz:** Recherche in DPMAregister bzw. TMview/EUIPO (eSearch plus) nach Bildmarken, am besten über die Wiener Bildklassifikation (z. B. Buchstabe S, Uhren) und in den passenden Nizza-Klassen (z. B. 41 Unterhaltung/Bildung, 9 digitale Medien, 25 Bekleidung für Merch). Für eine belastbare Aussage eine Fachperson fragen. *(Klassen: Annahme, vor Anmeldung prüfen.)*
