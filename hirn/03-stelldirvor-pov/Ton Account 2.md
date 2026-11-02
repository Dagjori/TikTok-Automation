---
typ: regel
konto: stelldirvor
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/stelldirvor-video/ton.md
tags: [konto/stelldirvor, ton, atmo]
cssclasses: [konto-stelldirvor, typ-regel]
---

> Quelle: `.claude/skills/stelldirvor-video/ton.md`. Diese Notiz wird mit `python3 tools/hirn_aus_skills.py` erzeugt. Änderungen bitte im Skill vornehmen, nicht hier. Bei Abweichung gilt der Skill.

# Ton Account 2

*Ton: nur Atmo und Sounddesign, selbst erzeugt*

**Keine Stimme, keine Musik, keine fremden Dateien.** Alles synthetisch mit numpy und festem Seed (`pipeline/atmo.py`, Hilfen aus `pipeline/klang.py`).

## Messwerte der Referenzen (F, EBU R128 und Spektren)
| Größe | A | S | T | E |
|---|---|---|---|---|
| Lautheit integriert | −14,3 LUFS | −14,4 | −14,4 | −14,7 |
| Lautheitsumfang (LRA) | 13,8 LU | 8,9 | 13,8 | 17,7 |
| kurzzeitig 4–28 s (Start) | −14 … −16 | −13 … −16 | −16 … −22 | −14 … −23 |
| Maximum (kurzzeitig) | −8,7 bei 64 s | −11,1 bei 33 s | −10,3 bei 60 s | −10,9 bei 63 s |
| Abspann 72–80 s | −18 | −21 … −25 | −25 … −27 | −30 … −32 |
| Stille-Moment | 28–34 s (bis −38 LUFS) | – | – | – |
| Klangschwerpunkt Alltag | 3,9 kHz (Vögel, Wind) | 2,6 kHz (Strand) | 1,9 kHz (Stadt) | 1,6 kHz (Stadt) |
| Nachspiel 65–71 s | Brummen 210–260 Hz | Pfeifton ≈ 645 Hz | Pfeifton ≈ 512 Hz | Pfeifton ≈ 600 Hz |
| Abspann | tiefes Brummen (Schwerpunkt ≈ 200 Hz), Höhen fehlen (−50 … −80 dB über 1 kHz) | 1,2 kHz | ≈ 194 Hz | ≈ 206 Hz |

**Verlauf (F):** Atmo von Bild 0 an (kein stummer Anfang) → Eskalation mit wachsendem Tieftonanteil (20–250 Hz dominieren ab ≈ 40 s) → Höhepunkt bei 58–64 s (lautester Abschnitt, Einschlag) → Nachspiel **dumpf** (Höhen über 4 kHz fallen um 26–60 dB, „Ohren zu“) mit Pfeifton bzw. Brummen → Abspann leise, nur tiefes Brummen.

## Unsere Regeln
- Integriert **−14 LUFS ± 1** (Ziel −14,0), True Peak ≤ −1 dBTP, Lautheitsumfang ≤ 20 LU.
- Höhepunkt (52–68 s) mindestens 4 dB lauter als der Start (4–28 s); Abspann mindestens 6 dB leiser als der Start (Prüfpunkte 7b, 7c).
- Atmo passt zum Ort: Vögel und Wind (Land), Brandung (Küste), Stadt mit Verkehr und Gemurmel (unverständlich, keine Sprache), Wasser, Regen, Feuer.
- **Atmo passt zur Welt** (seit 02.11. abends ist die Welt oft Natur, nicht Stadt): Wald und Lichtung (`voegel` dicht, `wind` weich, Blätter), Wüste und Dünen (`wind` hell, sonst weit und leer), Gebirge (`wind`, ferne `grollen`), Küste und Strand (`meer`, Möwen über `voegel`), See und Fluss (`wasser`), Eisfläche (`wind` kalt, Knacken als Einzelklang), Nacht (leise `wind`, `wasser`, sonst Stille mit Lichtinseln). Wo die Szene gerafft läuft, darf die Atmo mit dem Zeitraffer wandern (Wind und Wasser werden dichter, Vögel seltener); jede sichtbare Veränderung des Bewegungsplans mit Klangfarbe bekommt ihren Klang im Protokoll (`protokoll_effekte: true`).
- Jeder sichtbare Effekt hat seinen Klang an genau der Stelle (Ereignis-Protokoll, `klang`), außer die Physik verbietet es: z. B. kommt der Knall eines 14 km entfernten Ereignisses erst nach 41 s an – vorher bleibt es still (das ist eine Pointe, kein Fehler).
- Stille-Momente höchstens wenige Sekunden tief (Referenz A: 3 s), die Welt bleibt hörbar (Wind).

## Werkzeug
```bash
cd pipeline
node render.js projekte/<name> --zeiten 0 --worker 1      # schreibt das Ereignis-Protokoll (out/<name>/ereignisse.json)
python3 atmo.py projekte/<name>                           # → out/<name>/ton.wav (≈ −14 LUFS, LRA ≤ 19, Spitzen ≤ 0,78, Verlauf erzwungen)
#   gleichwertig: python3 klang.py projekte/<name> --atmo
TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>         # Bilder + Ton → out/<name>/<name>.mp4 (mit TON_FERTIG ohne Vorbegrenzer)
```

`projekte/<name>/ton.json` (Muster: `projekte/_demo-lunar-pov/ton.json`):
- `schichten`: `wind` (`hell`-Kurve 0–1), `voegel` (`dichte`), `stadt`, `dorf`, `meer`, `wasser`, `regen`, `feuer`, `grollen`, `brummen` (`f` Hz), `tinnitus` (`f` Hz), `raum`; je `pegel: [[t, dB], …]` (≤ −60 = aus).
- `ereignisse`: zusätzliche Einzelklänge `{t, art, pegel, dauer}`; Arten: `druckwelle`, `einschlag`, `blitz`, `donner`, `glas`, `truemmer`, `fluegel`, `gischt`, `zischen`, `windstoss`, `grollen`, `tinnitus`.
- `protokoll_effekte: true`: alle `{typ: "effekt", klang}` aus dem Protokoll der Szene werden vertont (empfohlen – so sitzt der Ton exakt auf dem Bild).
- `dumpf: [[t, 0..1]]`: Tiefpass nach dem Höhepunkt (Brummen und Pfeifen bleiben klar).
- `stille: [[von, bis, dB]]`: alles außer Brummen/Pfeifen leiser.

`atmo.py` erzwingt den Verlauf: Höhepunkt (52–68 s) ≥ 6 dB über dem Start (4–28 s), Abspann ≥ 8 dB darunter; leise Stellen vor 55 s werden nur angehoben, wenn der Lautheitsumfang sonst über 19 LU läge (sonst regelt loudnorm in `mux.sh` dynamisch und verfehlt −14 LUFS). Pegel-Startwerte, die in der Demo funktionieren: Alltag-Schichten −22 … −30 dB, Wind beim Höhepunkt −8 dB, Grollen −12 dB, Ereignis-Standardpegel siehe `EREIGNISSE` in `atmo.py`.
Gemessen an der Demo (Mux mit Platzhalterbild): −14,7 LUFS, True Peak −2,6 dBTP, Start −15,1, Maximum −10,8 bei 62,3 s, Abspann −27,6 LUFS.

Abhören vor der Abgabe: Anfang (0–10 s), Höhepunkt (55–65 s), Abspann; Lautheitsverlauf mit `python3 qc/referenz_pov.py` prüfen.

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Format Account 2 Lunar]] · [[Ablauf Account 2]] · [[Design Account 2]] · [[Licht und Effekte Account 2]] · [[Technik und Szenenbau Account 2]] · [[Prüfung und Abnahme Account 2]] · [[Themen und Plan Account 2]] · [[Konkurrenz-Check und Sperrliste Account 2]]

Account 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: [[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].
