---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/design.md, CLAUDE.md §6
tags: [konto/simulierbar, design, hud, layout, untertitel, teamfarben]
---

# Design und Layout Simulierbar

Die Welt trägt das Bild; das HUD ist ruhig, edel und lesbar. Alle Bausteine kommen aus `pipeline/engine/massstab.js` (Aufrufe wie in `pipeline/README.md`), das Aussehen aus **`pipeline/engine/sim_hud.css`** (lädt nach `hud.css` und `massstab.css`, wirkt nur mit `<div id="hud" class="sim">`). Muster: `pipeline/projekte/_demo-simulierbar/`. Welten und Stile: [[Stile 17 bis 21]], Licht: [[Licht und Atmosphäre Simulierbar]].

## 1. Theme (Pflicht in jeder Szene)
```js
const M = new Massstab(hud, zp, {
  teams: { a: { name: "PRÄMIE", farbe: "#FF8A3D", woerter: ["Prämie*"] }, b: { name: "MONATLICH", farbe: "#3D8BFF", woerter: ["Monat*"] } },
  akzent: "#ECE6DA", tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
});
```
| Token | Wert | Wofür |
|---|---|---|
| Rauchglas | `rgba(12,15,21,0.62)` (Karten dichter 0,78), Weichzeichner 14–16 px | Tafel, Chips, Leiste, Karten |
| Haarlinie | `rgba(255,255,255,0.16)`, 1,5 px innen | Kante jeder Fläche |
| Text | `#F3F5F8`, Etiketten `#9AA3B2` | Zahlen, Beschriftung |
| Akzent | `#ECE6DA` (Elfenbein) | Ergebnis-Feld der Formel, Differenz-Zeile, Uhrbogen. **Nie Gelb** (Gelb = aktuelles Untertitel-Wort) |
| Teamfarben | zwei feste Farben aus dem Plan (`data/plan/30-tage.csv`, Spalte `teamfarben`) | als **Licht**: Punkt mit Schein, Linie, Rand, Verlauf; nicht als knallige Vollfläche |
| Schatten | `0 24px 48px -18px rgba(0,0,0,0.7)` | Abheben von der Welt |
| Radius | 22 px (Tafel), 16 px (Chips, Zeilen), 26 px (Karten) | |

**Teamfarben-Palette ohne Gelb:** Blau `#3D8BFF`, Orange `#FF8A3D`, Türkis `#2EC4B6`, Koralle `#FF5A5F`, Violett `#8E6CFF`, Grün `#2ECC71`, Pink `#FF4FA3`, Petrol `#1A8C8C`, Rot `#E63946`, Magenta `#E040FB`.

**Teamfarben-Regel:** zwei feste Farben je Video, überall gleich: Objekt in der Welt (Lack, LED-Kante, Flüssigkeit, Route, Acryl-Marker), Lichtfleck, Tafelseite, Chips, Untertitel-Schlüsselwort (`woerter`). Nie Gelb. (Engine-Standard „keine gelbe Teamfarbe“; im Gehalt-Video vom 01.11. ist Team „steuerfrei“ gelb und bleibt, fertige Videos bleiben unverändert.)

## 2. Typografie
- Schrift Inter / Inter Display (SIL OFL, lokal über `@fontsource/inter`, Lizenz `pipeline/engine/schriften/OFL-Inter.txt`). Keine weiteren Schriften ohne Lizenzdatei.
- **Zahlen:** Inter Display 800, Tabellenziffern (`tnum`), Laufweite −0,035 em; deutsche Schreibweise (1.000 €, 3,50 €).
- **Etiketten:** Inter 700, Versalien, Laufweite +0,16 em, 16–22 px, Grau `#9AA3B2` bzw. Teamton.
- **Titel im Hook (optional):** Inter Display 800, ohne Comic-Kontur, weicher Schatten.

## 3. Bausteine
| Baustein | Aufruf | Look in `sim_hud.css` |
|---|---|---|
| **Anzeigetafel** (ab Bild 0) | `M.tafel({ y: 166, links: {team:"a", einheit:"€", nk:0}, rechts: {…}, werte: t => ({a, b}), vorn: "hoch"\|"tief", uhr: { ein:"Was", zeit: t => s, format: s => …, label: "MONATE" } })` | zwei Rauchglas-Karten, Kopf in Kapitälchen mit leuchtendem Teampunkt, Zahl weiß; die führende Seite bekommt Teamrand, Teamverlauf und Schein, Etikett „VORN“ als Umriss. Mitte: Glas-Kreis mit „VS“, ab `uhr.ein` Uhr mit Etikett. |
| **Live-Zähler** | Rollziffern in Tafel, `M.zaehler({ wert, einheit, team, punkt })` über 3D-Objekten | gleiche Ziffern, Glas-Pille |
| **Uhr** | `M.uhr({ ein, zeit, label, team })` oder Tafel-Mitte | Glas-Pille, Zeiger, Etikett grau |
| **Chips** | `M.chip`/`M.chips({ y, ausrichtung:"mitte", liste:[{ text, ein, team, art:"hell"\|"voll"\|"dunkel" }] })` | Rauchglas, Teampunkt mit Schein; `voll` = Teamverlauf mit Teamrand und Schein (statt Vollfläche) |
| **Fortschrittsleiste** | `M.leiste({…})` | dünne Bahn mit leuchtender Teamlinie, Punkte mit Schein |
| **Formel-/Vergleichskarte** | `M.formel({…})` | Rauchglas, Operatoren als Umriss-Kreise, Ergebnis im Elfenbein-Feld |
| **Bilanzkarte** | `M.bilanz({…})` | Zeilen mit Haarlinie, Differenz mit Elfenbein-Rand, Sieger-Banner als Teamverlauf mit Schein |
| **„Warum?“-Balken** | `M.balken({ titel:"Warum?", faktoren:[…max. 2] })` | leuchtende Teambalken |
| **Pointe/Merksatz** | `M.pointe({ text, ein })` | große Zahl/Wörter in Inter Display 800, ohne Kontur, weicher Schatten |
| **Folgen-Aufruf** | `M.folgen({ ein, dauer: 1.8 })` | Glas-Pille |
| **Sticker/Stempel** | **verboten** (`M.stempel` nicht aufrufen; `sim_hud.css` blendet `.ms-stempel` aus, `massstab.py` 5d zählt jeden Aufruf als Fehler) | – |

**Weniger ist mehr:** Chips nur mit neuer Zahl bzw. Information (≤ 15 je Video, Hinweis 5e). Jede Regel lieber als Objekt in der Welt zeigen und den Chip klein halten.

## 4. Untertitel (Pflicht, unverändert)
`M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 })` – **Wort für Wort**, jedes gesprochene Wort erscheint einzeln, max. 2 Zeilen, mittig, **weiße fette Schrift mit schwarzer Kontur, aktuelles Wort gelb, kein Kasten** (Inhaber 01.11.; Phrasen mit 0,26 s Satzpausen wurden ersetzt). Schlüsselwörter der Teams färbt `teams.*.woerter`. Der Phrasen-Stil (`M.untertitel()` ohne `stil`) wird nicht verwendet. `sim_hud.css` ändert die Untertitel nicht.

## 5. Layout und sichere Zonen
- Inhalte **mittig**, Mittelachse **x = 540**, Schutzzone links 150 px und rechts 150 px (`SICHER` in `massstab.js`), oben 150 px; Achse 540, nutzbare Breite 780 (Entscheidung 01.11.: symmetrisch, kein Kalibrier-Test). 1080×1920 für TikTok und YouTube Shorts.
- Tafel bei y = 166, Chips ab y ≈ 360, Karten 400–1100, Untertitel-Unterkante y = 1450, **nichts Wichtiges unter y ≈ 1500**.
- Die Welt komponieren: Hauptobjekte zwischen y ≈ 450 und 1300, nicht hinter Tafel oder Untertitel. Hochformat bedeutet: Objekte eher übereinander bzw. in die Tiefe staffeln als nebeneinander (Breite sichtbar ≈ 0,56 × Höhe).
- **Kein Kanalname, kein Logo, keine Rubrik, keine Quellen im Bild.** Kein Kaufaufruf. Die Position des Folgen-Elements und der Pegel auf einem echten Gerät sind noch vom Inhaber abzunehmen (offener Punkt, Stand 02.11.).

## Siehe auch
- [[Videoaufbau Simulierbar]] · [[Stile 17 bis 21]] · [[Licht und Atmosphäre Simulierbar]] · [[Technik und Szenenbau Simulierbar]]
- [[Prüfung und Abnahme Simulierbar]] (Text-Überlappung, Teamfarben, Untertitel) · [[Maßstab Simulierbar]] · [[Account Simulierbar Überblick]]
