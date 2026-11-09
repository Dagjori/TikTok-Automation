---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-09
aliases: [Stimme und Ton Simulierbar]
quelle: pipeline/klang.py, pipeline/mux.sh, .claude/skills/video-produktion/simulierbar.md; bis 09.11.2026 Teil der Notiz „Stimme und Ton Simulierbar“
tags: [konto/simulierbar, ton, klangteppich, effekte, lautheit]
cssclasses: [konto-simulierbar, typ-regel]
---

# Klangteppich und Ton Simulierbar

Klangteppich, Effekte und Lautheit für `@simulierbar`. Diese Notiz hieß bis 09.11.2026 „Stimme und Ton Simulierbar“. **Alles zur Stimme** (Ben, Textformat, eine Aufnahme, Aussprache, Credits) steht seitdem in [[Stimme ElevenLabs Simulierbar]]. Gilt nicht für Account 2 ([[Trennung der Accounts]]). Mux und Dateien: [[Technik und Szenenbau Simulierbar]].

## 1. Klangteppich (`pipeline/klang.py`, nur selbst erzeugt)
Musik nur lizenzfrei oder selbst erzeugt; alle Klänge werden selbst erzeugt. Der Teppich liegt **8–13 dB unter der Stimme**, ab Bild 0, schleifenfest. Er passt zu Stil und Thema:

| Stil | Teppich (`--teppich` bzw. `veroeffentliche({ teppich })`) |
|---|---|
| 17 Nachtstadt | `strasse` (Nachtfahrt) bzw. `regen` bei nassem Asphalt |
| 18 Studio | `raum` oder `musik` (leiser tonaler Pad) |
| 19 Architekturmodell | `raum` oder `musik` |
| 20 Glas & Licht | `wasser` (leises Fließen) oder `raum` |
| 21 Nachtkarte | `musik` bzw. `strasse` bei Verkehrsthemen |
| 1–15 (übrige Stile) | nach Thema: `strasse` (Verkehr), `raum` (Wohnen, Büro), `wasser` (Füllstände), `regen`, `musik` (neutral, tonaler Pad) |

## 2. Effekte
- **Effekt bei jedem Bild-Ereignis** automatisch aus dem Ereignis-Protokoll (Pop, Ding bei Führungswechsel, Zähler-Ticken, Whoosh bei Übergängen). Eigene Welt-Ereignisse mit `M.melde({ t, typ: "welt", klang: "pop"|"ding"|"whoosh"|… })` eintragen (Münze fällt, Licht geht an, Waage kippt).
- **Akzent auf der Pointe** (`M.pointe` bzw. `klang: "akzent"`).
- Alle Zeitpunkte hängen an den Wortzeiten der fertigen Stimme (`audio/timing.json`).

## 3. Lautheit und Mux
- `./mux.sh projekte/<name>` → **−14 LUFS**, H.264 CRF 18, 30 fps (TikTok gleicht an; die Vorbilder liegen bei −15,4 bis −18,9 LUFS, **F**).
- Pegel des Teppichs über `--teppich-db` (Standard −10 dB). True Peak ≤ −1 dBTP (Prüfung in [[Prüfung und Abnahme Simulierbar]]).
- Offen (Inhaber, 02.11.): Teppich-Pegel und Effekte auf echtem Gerät abnehmen.

## Siehe auch
[[Stimme ElevenLabs Simulierbar]] · [[Videoaufbau Simulierbar]] · [[Stile 17 bis 21]] · [[Technik und Szenenbau Simulierbar]] · [[Prüfung und Abnahme Simulierbar]] · [[Account Simulierbar Überblick]]
