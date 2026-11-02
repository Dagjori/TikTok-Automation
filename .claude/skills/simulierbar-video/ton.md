# Ton: Stimme Ben, Regie-Text, Klangteppich

Quelle: `CLAUDE.md` §8 (Entscheidungen 31.10./01.11./02.11.), [massstab.md](massstab.md) §6–7, `pipeline/README.md` (Ton); Tempo und Skript-Anforderungen seit 02.11.2026 abends.

## 1. Stimme
- **ElevenLabs, Stimme „Ben“ `aTTiK3YzK3dXETpuDE2h`, im Original**: `pipeline/tts.py` schickt **keine** `voice_settings` (gespeicherte Einstellungen der Stimme), keine künstliche Beschleunigung.
- **Modell `eleven_v4`** (Standard in `tts.py`). Regie über Audio-Tags, Satzzeichen, Großschreibung; **keine** `<break>`-Tags.
- **Tempo (Entscheidung des Inhabers 02.11.2026 abends, Mitte aus beiden bisherigen Vorgaben):** **150–190 Wörter bei 65–80 s, Ziel ca. 2,3 Wörter/s, Spanne 2,2–2,5** (Profil `ben` in `qc/massstab.py`). Ersetzt 130–170 Wörter (Ben im Original ca. 2,0 W/s) und 170–220 Wörter (alte Prüfliste, 2,5–2,9 W/s). **Flüssig und natürlich:** kein künstliches Beschleunigen der Stimme (`tts.py` bleibt im Original), das Tempo entsteht durch Textlänge und Satzbau.
- **Satzpausen:** hörbarer Richtwert **0,35–0,6 s** (Ben im Original lag zuletzt bei ca. 0,35 s hörbar, Messung 02.11.; die Wortzeiten in `timing.json` zeigen ca. 0,1 s weniger). Pausen werden nicht verkürzt, um Tempo zu gewinnen. **Qualität vor Tempo: klingt eine Stelle gehetzt, kürzen statt beschleunigen** (Satz streichen, Füllwort raus, Aufzählung zu Kommas).
- Prüfung: `qc/massstab.py` 12a Wörter, 12b Tempo, 12d Satzpause (Pflicht, Wortzeiten), 12d2 hörbare Satzpause (Hinweis); gleich nach `tts.py` ausführen.
- Key nur als Netzwerk-Secret/Umgebungsvariable, nie im Repo.
- Aufruf: `cd pipeline && python3 tts.py projekte/<name>` → `audio/stimme.mp3`, `audio/timing.json` (Wortzeiten; alle Animationen hängen daran).

## 2. Tonfall (Inhaber 02.11., Prüfpunkt 19)
- Ruhig, sachlich, freundlich, saubere Aussprache, Erzähler wie die Vorbilder. Kein Sportreporter, kein Geschrei.
- **Keine aufgeregten Audio-Tags** wie `[excited]`, `[shouting]`, `[energetic]` (16a). Erlaubt: ruhige Tags wie `[curious]`, `[thoughtful]`, `[calm]`, sparsam.
- **Höchstens 3 Ausrufezeichen** im Sprechtext (16b). **Kein „Los geht's“** (3b).

## 3. Regie-Text (`sprechtext` je Segment)
Grundsatz (Inhaber 31.10.): Der Sprechtext ist wie ein Regiebuch für einen Synchronsprecher; er legt fest, wo die Stimme betont, pausiert, Spannung aufbaut und die Stimmung wechselt. Eine Zeile pro Satz (`\n`), Leerzeile zwischen Phasen. `text` = Untertitel (Ziffern erlaubt), `sprechtext` = gesprochen (Zahlen ausgeschrieben, englische Wörter in Lautschrift „G T A sechs“).

| Wirkung | Mittel bei Eleven v4 (Standard) |
|---|---|
| kurze Pause | Satzende, Zeilenumbruch, Gedankenstrich „ – “ |
| längere Pause (selten, max. 0,4 s) | `[short pause]`; v4 unterstützt **keine** `<break>`-Tags |
| Zögern, Spannung | Auslassungspunkte „…“ |
| Betonung eines Worts | GROSSSCHREIBUNG („Jetzt wird's KNAPP.“) |
| Haltung | ruhige Audio-Tags `[curious]`, `[thoughtful]`, `[calm]`; **keine aufgeregten** (`[excited]`, `[shouting]`, `[energetic]`, Prüfpunkt 16a) |
| Frage-Melodie | Fragezeichen, kurze Frage allein auf einer Zeile („Oder?“) |
| Tempo | nicht künstlich ändern; es entsteht durch Textlänge und Satzbau (150–190 Wörter, ca. 2,3 W/s) |

Regeln: 1. Keine zusätzlichen Pausen-Tags außer bei einem echten Spannungsmoment; Ben setzt nach jedem Satz von sich aus eine hörbare Pause (ca. 0,35 s, F 02.11.), jede weitere Pause bremst. 2. Je Phase höchstens ein Gefühls-Tag, zu viele klingen gespielt (A). 3. Pro Satz höchstens ein großgeschriebenes Wort, nur auf dem Wort, das die Spannung trägt. 4. Countdowns als Satzfetzen mit Kommas: „Fünfzehn Kilometer, dreizehn, zwölf, zehn.“ 5. Nach der Vertonung prüft `qc/massstab.py` Tempo, Satzpausen und Satzlängen; zusätzlich Abgleich Sprechtext gegen Spracherkennung (v4 spricht die Tags nicht mit, F).

Schluss genau: „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ Folgen-Aufruf genau: „Folg mir, damit du nichts verpasst.“

```json
{"id": "falle", "text": "Klar, die Prämie. Oder?", "sprechtext": "Klar … die PRÄMIE.\nOder?"}
```

### Skript-Anforderungen (Verweis)
Das Skript kommt von Claude Chat (Ideen-Studio) und wird als Regie-Text geschrieben, damit Ben Tonfall und Betonung problemlos umsetzt: belegbar, nichts erfunden, Diskussionsbedarf ohne Aufforderung zum Streiten, kein Clickbait, keine künstlichen Cliffhanger. Die vollständigen Anforderungen und die Übernahme durch Claude Code stehen in [ablauf.md](ablauf.md) §5. Die Regeln dieser Datei (eine Zeile pro Satz, GROSSSCHREIBUNG auf dem Betonungswort, ruhige v4-Tags, keine `<break>`, Zahlen ausgeschrieben) bleiben unverändert.

## 4. Klangteppich und Effekte (`pipeline/klang.py`, nur selbst erzeugt)
- Teppich passend zum Stil und Thema, 8–13 dB unter der Stimme, ab Bild 0 (schleifenfest):

| Stil | Teppich (`--teppich` bzw. `veroeffentliche({ teppich })`) |
|---|---|
| 17 Nachtstadt | `strasse` (Nachtfahrt) bzw. `regen` bei nassem Asphalt |
| 18 Studio | `raum` oder `musik` (leiser tonaler Pad) |
| 19 Architekturmodell | `raum` oder `musik` |
| 20 Glas & Licht | `wasser` (leises Fließen) oder `raum` |
| 21 Nachtkarte | `musik` bzw. `strasse` bei Verkehrsthemen |
| 1–15 (übrige Stile) | nach Thema: `strasse` (Verkehr), `raum` (Wohnen, Büro), `wasser` (Füllstände), `regen`, `musik` (neutral, tonaler Pad) |

- **Effekt bei jedem Bild-Ereignis** automatisch aus dem Ereignis-Protokoll (Pop, Ding bei Führungswechsel, Zähler-Ticken, Whoosh bei Übergängen); eigene Welt-Ereignisse mit `M.melde({ t, typ: "welt", klang: "pop"|"ding"|"whoosh"|… })` eintragen (Münze fällt, Licht geht an, Waage kippt). **Akzent auf der Pointe** (`M.pointe` bzw. `klang: "akzent"`).
- Mux: `./mux.sh projekte/<name>` → −14 LUFS, H.264 CRF 18, 30 fps. Pegel über `--teppich-db` (Standard −10 dB).
