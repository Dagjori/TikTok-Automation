---
typ: regel
konto: stelldirvor
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/stelldirvor-video/design.md
tags: [konto/stelldirvor, design, typografie]
---

> Quelle: `.claude/skills/stelldirvor-video/design.md`. Diese Notiz wird mit `python3 tools/hirn_aus_skills.py` erzeugt. Änderungen bitte im Skill vornehmen, nicht hier. Bei Abweichung gilt der Skill.

# Design Account 2

*Design: Maße, Schrift, Farben (verbindlich für @stelldirvor.pov)*

Gemessen am 02.11. an den 4 Referenzvideos (720 × 1280, 30 fps, je 80,0 s; Pixelmessung der Glyphen, Mittel über A, S, T, E).
Umrechnung auf unser Format 1080 × 1920: Faktor 1,5. **F** = gemessen, **R** = Regel des Inhabers, **U** = unsere Umsetzung.
Umgesetzt in `pipeline/engine/stil_lunar_pov.css` + `pipeline/engine/lunar_hud.js` – dort nichts ohne Messung ändern.

## Schriften (lokal, SIL Open Font License 1.1, Lizenztexte in `pipeline/engine/schriften/`)
| Rolle | Referenz (F) | Unsere Schrift (U) |
|---|---|---|
| Titelfrage, Zahl der Anzeige, Abspann-Titel | Serif, normal, große x-Höhe (x-Höhe/Oberlänge ≈ 0,63), Ziffern versal | **Crimson Pro 400** (`@fontsource/crimson-pro`); Breitenvergleich mit gleicher Schriftgröße: ±1 % |
| Satz | dieselbe Serif kursiv | **Crimson Pro Italic 400** |
| Etikett, Unterzeile, Faktenzeile | **serifenlose Versalien mit Sperrung** (nicht Serif!) | **Inter 600** (Etikett), **Inter 500** (Unterzeile, Faktenzeile), `letter-spacing: 0.2em` |

## Die drei Textebenen
| Ebene | Maß | Referenz 720 × 1280 (F) | 1080 × 1920 (U) | % Bild |
|---|---|---|---|---|
| **1. Titelfrage** | Schriftgröße | x-Höhe 24–25 px → ≈ 58 px | **89 px** | 4,6 % Höhe |
| | Grundlinienabstand | 63 px | 94,5 px (`line-height 1.062`) | 4,9 % |
| | Lage | Blockmitte y = 376, waagrecht mittig | Blockmitte **y = 564**, Mitte x = 540 | 29,4 % |
| | Breite | bis 592 px (64–656) | **max. 886 px** (x 97–983) | 82 % Breite |
| | Zeilen | 2–3 | 2–3 (kurz halten) | |
| | Farbe | hellste Pixel #F4F2EE, Median #ECECE8 | **#F3F1EC** | |
| | Zeit | ein 0,40–0,63 s, aus 4,1–4,4 s (A) | **ein 0,40–0,60 s, aus 4,10–4,40 s** (wie Referenz, Korrektur 02.11.) | |
| **2. Messwert-Anzeige** | linke Kante | x = 43–44 px | **x = 66** | 6,1 % |
| | Etikett | Versalhöhe 11 px, Oberkante y = 609 | **22,5 px Inter 600**, Oberkante **y ≈ 913**, Weiß 95 % | 47,6 % |
| | Zahl | Versalhöhe 31–32 px, Grundlinie y = 652–660 | **85 px Crimson Pro**, Grundlinie **y ≈ 990** | 51,6 % |
| | Abstand Etikett → Zahl | 10 px (Etikett-Unterkante bis Zahl-Oberkante) | 15 px | |
| | Einheit | gleich groß wie die Zahl, Leerzeichen davor | schmales Leerzeichen, gleiche Größe | |
| | Unterzeile | Versalhöhe 9 px, Oberkante y = 674, 14 px unter der Grundlinie, Deckkraft ≈ 70 % | **18,5 px Inter 500**, Oberkante **y ≈ 1011**, Deckkraft 72 % | 52,7 % |
| | Zeit | ab **Bild 0** sichtbar (alle 4), aus 69,2–70,1 s | ab 0 s, aus 69,2–70,1 s | |
| **3. Satz** | Schriftgröße | x-Höhe 15–16 px → ≈ 38 px | **57 px kursiv** | 3,0 % Höhe |
| | Lage | Grundlinie y = 872, mittig | Grundlinie **y ≈ 1308**, mittig | 68,1 % |
| | Breite | 1 Zeile, bis 93 % der Breite | **max. 860 px** (x 110–970, frei von der TikTok-Knopfspalte), höchstens 2 Zeilen, wächst nach oben | |
| | Blende | ein/aus ≈ 0,1–0,25 s | **0,2 s** | |
| | Standzeit | 3,1–5,3 s, Lücke 0,6–1,5 s | 4,0–4,6 s, Lücke 0,6–0,8 s (mind. 3 s, R) | |

**Hof (alle drei Ebenen, F):** Hinter Titel, Anzeige und Satz liegt ein weicher dunkler elliptischer Schatten statt einer harten Kontur. Titel: in der Mitte −35 % Helligkeit (−60 von 170 Graustufen auf Himmel), Ausdehnung ≈ Textbreite × (Texthöhe + 2 × 90 px bei 1080). Anzeige: gut sichtbar auf hellem Grund (Staub, Weißblende). Satz: schwächer. U: `.lp-hof::before` mit `radial-gradient(closest-side, …)`, Stärke 0,38 / 0,40 / 0,26, dazu ein Hauch `text-shadow 0 1px 3px rgba(0,0,0,.35)`.

**Zahlenformat (U, deutsch):** Tausenderpunkt, Dezimalkomma (`zahlDE`), Countdown als `m:ss` (`uhrzeit`, Referenzform „2:54“), beim Höhepunkt Zahl **„HIER“** ohne Einheit, Unterzeile leer.

## Abspann (72–80 s)
| Maß | Referenz (F) | 1080 × 1920 (U) |
|---|---|---|
| Grund | exakt **#111111** (17, 17, 17), flach, ohne Körnung und Vignette | `#111111` |
| Abblende | Bild dunkelt ab ≈ 69 s, bei 72 s ganz #111111 | 70,0–72,0 s |
| Titel | gleiche Serif, x-Höhe 23 px, Grundlinienabstand 57 px, hellste Pixel #EBE8E3 | **80 px**, Zeilenabstand 1,07, **#ECE9E4**, max. 886 px breit |
| Lage | Block (Titel + Faktenzeile) mittig um y ≈ 46 % | Blockmitte **y = 889** |
| Faktenzeile | serifenlose Versalien, Versalhöhe 10 px, Sperrung ≈ 0,2 em, **#8B8985**, 50 px unter der letzten Titel-Grundlinie, bis 83 % breit, 1–2 Zeilen | **20,5 px Inter 500**, `letter-spacing 0.2em`, #8B8985, 75 px unter der Grundlinie, max. 900 px |
| Inhalt | „ORT, JAHR · FAKT“ (echtes Ereignis bzw. physikalischer Fakt, Mittelpunkt als Trenner) | eigene Faktenzeile mit Quelle in `skript.json` |
| Zeit | Titel ein 72,5–73,2 s (A) bzw. 73,0–74,1 s (S), Faktenzeile gleich danach | Titel 72,4–73,2 s, Faktenzeile 72,9–73,7 s |

## Bildaufbau und Bildcharakter
- **Feste Ich-Perspektive von erhöhtem Standpunkt** (Balkon, Dachterrasse, Promenade, Kreuzung), Hochformat, Horizont bei 40–55 % der Höhe, das Ereignis im oberen Drittel bis zur Hälfte (F).
- **Vordergrund-Element** im unteren Viertel (F): Holzgeländer (Handlauf bei 78 %, unterer Riegel bei 93 % Höhe), Metallgeländer, Betonbrüstung mit Blumenkasten, Geländer an der Kreuzung. U: `vordergrund()` mit `abstand` ≈ 3 m und Augenhöhe 1,6 m bringt den Handlauf auf ≈ 75 %.
- **Low-Poly-Welt, flach schattiert, filmisch beleuchtet** (F): keine Fotorealistik, aber dichter Detailreichtum (Wald aus Tausenden Bäumchen, Häuser mit Fenstern, Rauch aus Schornsteinen, Wasser mit Wellen, viele kleine Menschen und Autos, Vögel).
- **Alltag (F):** mittlere Helligkeit 80–150 (Mittel ≈ 115 von 255), Kontrast (Standardabweichung) 41–58, mittlere Sättigung 24–36 → leicht entsättigt, dunstig, nie knallig. Himmel oben z. B. #8498B6, #B4B3BD, #A0ADC5.
- **Vignette (F):** Bildrand ≈ 0,80–0,82 × Bildmitte im oberen Drittel. U: `.lp-vignette` (HTML), `post.vignette = 0`.
- **Körnung (F):** nicht messbar (Differenz zweier Standbilder 0,05 Graustufen). U: `koernung ≤ 0,01` nur gegen Banding.
- **Schärfe (F):** Vordergrund scharf, Ferne nur durch Dunst weicher; nach dem Höhepunkt ist das ganze Bild weich (Laplace-Mittel 0,7–3 statt 7–18).
- **Teamfarben, Gelb-Regel, Mittelachse und Schutzzone von Simulierbar gelten hier nicht.** Sichere Zone für Account 2: oben 150 px, unten ab 1500 px frei, rechte Knopfspalte (x > 975, y > 900) frei; links darf die Anzeige bis x = 66 (wie die Referenzen).

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Format Account 2 Lunar]] · [[Ablauf Account 2]] · [[Licht und Effekte Account 2]] · [[Ton Account 2]] · [[Technik und Szenenbau Account 2]] · [[Prüfung und Abnahme Account 2]] · [[Themen und Plan Account 2]] · [[Konkurrenz-Check und Sperrliste Account 2]]

Account 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: [[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].
