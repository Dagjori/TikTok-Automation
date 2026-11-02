---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/ton.md, CLAUDE.md §8, CLAUDE.md §6
tags: [konto/simulierbar, stimme, ton, regie-text, klangteppich, lautheit, elevenlabs]
---

# Stimme und Ton Simulierbar

Stimme Ben, Regie-Text, Tonfall, Klangteppich und Lautheit für `@simulierbar`. **Account 2 hat keine Stimme** und gehört nicht hierher ([[Trennung der Accounts]]). Herkunft der Vorbild-Werte: [[Maßstab Simulierbar]] (Abschnitte 6–7). Mux und Dateien: [[Technik und Szenenbau Simulierbar]].

## 1. Stimme
- **ElevenLabs, Stimme „Ben“ `aTTiK3YzK3dXETpuDE2h`, im Original** (Entscheidung 31.10.: „genau so wie auf ElevenLabs“; männlich, Muttersprachler, Hörprobe; Daniel/zfc8 verworfen): `pipeline/tts.py` schickt **keine** `voice_settings` (gespeicherte Einstellungen der Stimme), keine künstliche Beschleunigung.
- **Modell `eleven_v4` für alle Videos** (Hörprobe 01.11.; Standard in `tts.py`). Regie über Audio-Tags, Satzzeichen, Großschreibung; **keine** `<break>`-Tags (v4 unterstützt sie nicht).
- Alternativen für die Stimme: Marc, Alexander (Otto gehört nicht zu Simulierbar).
- Ben im Original: ca. 2,0 Wörter/s, Satzpausen 0,5–0,7 s (F, bei v4 und v2 gleich, 31.10.) → **130–170 Wörter** für 65–80 s (Profil `ben` in `qc/massstab.py`). Die Vorbilder sprechen 2,5–2,9 W/s mit 170–220 Wörtern; das Tempo wird nicht künstlich erhöht.
- **Key** nur als Netzwerk-Secret (API-Key-Header für `api.elevenlabs.io`, vom Proxy gesetzt) bzw. Umgebungsvariable, nie im Repo und nie in der Sitzung sichtbar. Rechte `voices_read`: Bibliothek per `GET /v1/shared-voices`; Speech-to-Text für Analysen und den Abgleich Sprechtext gegen Spracherkennung. Reichen die Credits nicht: nächstgrößerer Plan (Free hat keine kommerzielle Lizenz); ElevenLabs-Kosten ca. 5–25 $/Monat (S), kleinster bezahlter Plan (Starter) vorerst.
- Aufruf: `cd pipeline && python3 tts.py projekte/<name>` → `audio/stimme.mp3`, `audio/timing.json` (Wortzeiten; alle Animationen hängen daran).

## 2. Tonfall (Inhaber 02.11., Prüfpunkt 19)
- Videos waren „zu energisch“: **ruhig, sachlich, freundlich**, saubere Aussprache, Erzähler wie die Vorbilder. Kein Sportreporter, kein Geschrei.
- **Keine aufgeregten Audio-Tags** wie `[excited]`, `[shouting]`, `[energetic]` (Prüfpunkt 16a). Erlaubt: ruhige Tags wie `[curious]`, `[thoughtful]`, `[calm]`, sparsam.
- **Höchstens 3 Ausrufezeichen** im Sprechtext (16b). **Kein „Los geht's“** (3b).
- Ruhe entsteht über kurze Sätze und Satzzeichen, nicht über lange Stille (Abschnittspausen von 0,6 s sind schon länger als beim Maßstab).

## 3. Regie-Text (`sprechtext` je Segment)
**Grundsatz (Inhaber 31.10.):** Der Sprechtext ist wie ein Regiebuch für einen Synchronsprecher; er legt fest, wo die Stimme betont, pausiert, Spannung aufbaut und die Stimmung wechselt (die Stimme klang vorher unruhig). Eine Zeile pro Satz (`\n`), Leerzeile zwischen Phasen. `text` = Untertitel (Ziffern erlaubt), `sprechtext` = gesprochen (Zahlen ausgeschrieben, englische Wörter in Lautschrift, z. B. „G T A sechs“). Der Untertitel zeigt `text`.

| Wirkung | Mittel bei Eleven v4 (Standard) |
|---|---|
| kurze Pause | Satzende, Zeilenumbruch, Gedankenstrich „ – “ |
| längere Pause (selten, max. 0,4 s) | `[short pause]`; v4 unterstützt **keine** `<break>`-Tags |
| Zögern, Spannung | Auslassungspunkte „…“ |
| Betonung eines Worts | GROSSSCHREIBUNG („Jetzt wird's KNAPP.“) |
| Haltung | ruhige Audio-Tags `[curious]`, `[thoughtful]`, `[calm]`; **keine aufgeregten** (`[excited]`, `[shouting]`, `[energetic]`, Prüfpunkt 16a) |
| Frage-Melodie | Fragezeichen, kurze Frage allein auf einer Zeile („Oder?“) |
| Tempo | nicht künstlich ändern; es entsteht durch kurze Sätze |

**Regeln:**
1. Keine zusätzlichen Pausen-Tags außer bei einem echten Spannungsmoment; Ben setzt nach jedem Satz von sich aus 0,5–0,7 s (F), jede weitere Pause bremst.
2. Je Phase höchstens ein Gefühls-Tag, zu viele klingen gespielt (A).
3. Pro Satz höchstens ein großgeschriebenes Wort, nur auf dem Wort, das die Spannung trägt.
4. Countdowns als Satzfetzen mit Kommas: „Fünfzehn Kilometer, dreizehn, zwölf, zehn.“
5. Nach der Vertonung prüft `qc/massstab.py` Tempo, Satzpausen und Satzlängen; zusätzlich Abgleich Sprechtext gegen Spracherkennung (ElevenLabs Speech-to-Text; v4 spricht die Tags nicht mit, F): jedes Wort richtig ausgesprochen, keine verschluckten Zahlen.

**Feste Sätze:** Schluss genau „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ · Folgen-Aufruf genau „Folg mir, damit du nichts verpasst.“

Zahlen im Sprechtext: rund und ausgeschrieben, im Bild exakt (Ausnahme in Beispielen: Endstand-Zeiten werden auch exakt gesprochen, siehe Beispiel-Skript in [[Videoaufbau Simulierbar]]).
```json
{"id": "falle", "text": "Klar, die Prämie. Oder?", "sprechtext": "Klar … die PRÄMIE.\nOder?"}
```

## 4. Klangteppich und Effekte (`pipeline/klang.py`, nur selbst erzeugt)
Musik nur lizenzfrei oder selbst erzeugt; alle Klänge werden selbst erzeugt. Der Teppich liegt **8–13 dB unter der Stimme**, ab Bild 0, schleifenfest. Er passt zu Stil und Thema:

| Stil | Teppich (`--teppich` bzw. `veroeffentliche({ teppich })`) |
|---|---|
| 17 Nachtstadt | `strasse` (Nachtfahrt) bzw. `regen` bei nassem Asphalt |
| 18 Studio | `raum` oder `musik` (leiser tonaler Pad) |
| 19 Architekturmodell | `raum` oder `musik` |
| 20 Glas & Licht | `wasser` (leises Fließen) oder `raum` |
| 21 Nachtkarte | `musik` bzw. `strasse` bei Verkehrsthemen |

- **Effekt bei jedem Bild-Ereignis** automatisch aus dem Ereignis-Protokoll (Pop, Ding bei Führungswechsel, Zähler-Ticken, Whoosh bei Übergängen); eigene Welt-Ereignisse mit `M.melde({ t, typ: "welt", klang: "pop"|"ding"|"whoosh"|… })` eintragen (Münze fällt, Licht geht an, Waage kippt).
- **Akzent auf der Pointe** (`M.pointe` bzw. `klang: "akzent"`).
- Mux: `./mux.sh projekte/<name>` → **−14 LUFS**, H.264 CRF 18, 30 fps (TikTok gleicht an; die Vorbilder liegen bei −15,4 bis −18,9 LUFS). Pegel über `--teppich-db` (Standard −10 dB). True Peak ≤ −1 dBTP (Prüfung in [[Prüfung und Abnahme Simulierbar]]).
- Offen (Inhaber, 02.11.): Teppich-Pegel (−10 dB), Effekte und Position des Folgen-Elements auf echtem Gerät abnehmen.

## Siehe auch
- [[Videoaufbau Simulierbar]] (Satzmuster, Beispiel mit Regie-Text) · [[Maßstab Simulierbar]] · [[Stile 17 bis 21]] · [[Technik und Szenenbau Simulierbar]]
- [[Prüfung und Abnahme Simulierbar]] · [[Account Simulierbar Überblick]] · [[Entscheidungen Log]] · [[Arbeitsregeln und Sicherheit]] (Keys)
