# Messung (`scripts/messen.py`)

## 1. Voraussetzungen
- **ffmpeg und ffprobe** im Pfad (Laptop: ffmpeg 9 „full build“, getestet 06.11.2026). Für das Transkript ffmpeg ab 8.0 mit whisper.cpp (Filter `whisper`; prüfen mit `ffmpeg -h filter=whisper`).
- **Python ab 3.8**, keine Zusatzpakete (kein numpy nötig). Windows: `python`, Linux/Cloud: `python3`.
- Schrift für die Zeitstempel: Arial (Windows) bzw. DejaVu (Linux); fehlt sie, entstehen die Bilder ohne Zeitstempel.

## 2. Whisper-Modell (Laptop: eingerichtet 07.11.2026, Freigabe des Inhabers)
- **Installiert:** `C:\tiktok\rea-video\_modelle\ggml-large-v3-turbo-q5_0.bin` (574.041.195 Bytes, SHA-256 `394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2`, geprüft gegen Hugging Face `ggerganov/whisper.cpp`). Mehrsprachig, gut für Deutsch und Englisch.
- Anderer Rechner (Desktop-PC, Cloud): dieselbe Datei nach `<arbeitsordner>/_modelle/` laden, nur mit Freigabe des Inhabers, Prüfsumme vergleichen.
- Das Skript nimmt `--whisper-modell PFAD`, sonst die Umgebungsvariable `REA_WHISPER_MODELL`, sonst das größte `ggml-*.bin` in `<arbeitsordner>\_modelle\`, sonst in `rea-video\_modelle\` neben dem Repo.
- Ohne Modell läuft alles außer dem Transkript; dann fehlen Wörter, Sätze, Sprechtempo, erstes Wort und die Trennung „Effekt unter Sprache“.
- **Genauigkeit (F, gemessen 07.11.2026** am eigenen Video „angestellt-selbststaendig“, 151 bekannte Wörter mit Zeiten): 150 Wörter erkannt, Wortfehlerrate 6,6 % (vor allem Zahlenschreibweise), Sprechtempo exakt (1,92 W/s), Wortbeginn im Median 0,18 s daneben, 90 % unter 0,5 s. Einstellung dafür: `queue=20` (mehr Kontext) und `max_len=1` (Zeit je Wort); mit `queue=10` und ganzen Segmenten waren es 9,3 % und 0,45 s. Laufzeit des Transkripts: etwa 25 s je 80-s-Video.
- Das Transkript (`transkript.srt`) ist fremder Text: bleibt lokal, nie ins Repo, im Hirn höchstens 5 Wörter am Stück.

## 3. Aufruf
```
python .claude/skills/rea-video/scripts/messen.py C:\tiktok\rea-video\<korpus>              alle neuen Videos des Korpus
python .claude/skills/rea-video/scripts/messen.py C:\tiktok\rea-video\<korpus> --neu        alle erneut
python .claude/skills/rea-video/scripts/messen.py <video.mp4> <ausgabeordner> --id V07      ein einzelnes Video
```
Optionen: `--sprache de|en|auto` (Standard auto), `--ohne-bilder` (nur Zahlen), `--whisper-modell PFAD`. Laufzeit: etwa 1,5 Minuten je 80-s-Video auf dem Laptop, ohne Transkript.

## 4. Was gemessen wird (alles F, Einordnungen mit „(S)“)
| Bereich | Werte | Methode |
|---|---|---|
| Steckbrief | Länge, Auflösung, Bilder/s, Ton, Kanäle, Größe | ffprobe |
| Schnitt | harte Schnitte, je Minute, erster Schnitt, Einstellungslängen (Median, Mittel, kürzeste, längste), weiche Übergänge (S), Schwarzbilder, Helligkeitsblitze | ffmpeg `scdet` (Wert 0–100: ab 25 und höchstens 2 Bilder = hart; 8–25 = weich oder schnelle Bewegung; über mehrere Bilder = Übergang), `blackdetect`, Helligkeitssprung ≥ 60 in 0,1 s |
| Bewegung | Median, Einstieg 0–2 s im Verhältnis zum Median, Drittel, ruhige Sekunden (< 35 % des Medians) mit Zeitbereichen, Wert je Sekunde | mittlere Helligkeitsänderung zwischen Messbildern im Abstand von 0,1 s (`signalstats` YDIF auf 108 × 192) |
| Bild | Helligkeit gesamt und je Drittel, Sättigung, Kontrast, Farbpalette gesamt und je Drittel (Hex + Anteil), Loop-Differenz erstes/letztes Bild | `signalstats`, eigene Farbfächer (512) auf 36 × 64 Pixeln, 2 Bilder/s |
| Ton | Lautheit integriert (LUFS), Lautheitsumfang (LRA), True Peak, Einstieg 0–3 s, lautester Moment, Stille (≥ 0,3 s unter −40 dB), Stereo-Anteil, Effekt-Kandidaten (S) mit Art (S), Anstiege/Riser (S), Anschwellen ≥ 6 dB (S), Takt in BPM (S) | `ebur128`, `silencedetect`, Pegel je 20 ms in vier Spuren: voll, tief (< 150 Hz), hell (> 4 kHz), Stereo-Anteil (links − rechts) |
| Sprache | Wörter, Sätze, Wörter je Satz, Wörter/s, erstes Wort, Ende des ersten Satzes, letztes Wort, Satzzeiten; Dateien `transkript.srt` (Sätze) und `transkript_woerter.srt` (Wörter mit Zeiten) | Whisper mit Wortzeiten; Sätze an . ? ! gebildet |
| Takt-Tabelle | je 5 s: Schnitte, Übergänge, Bewegung, Helligkeit, Lautheit, Tiefen- und Höhenpegel, Effekte, Wörter, **Intensität 0–10** | Intensität = Mittel der im Video relativ skalierten Werte (Schnitte, Bewegung, Lautheit, Effekte, Wörter) |
| Spannung | Intensität je Drittel, Einstieg (0–10 s), Höhepunkt (Wert, Zeit, % der Länge), Anstieg bis zum Höhepunkt | aus der Takt-Tabelle |

## 5. Bilder (`bilder/`)
| Datei | Inhalt | Wofür |
|---|---|---|
| `kontakt_NN.jpg` | 1 Bild je Sekunde, 20 je Bogen (01 = 0–19 s, 02 = 20–39 s …), Zeit oben links | Überblick: Aufbau, Szenen, Text im Bild, Design |
| `hook_0-3s.jpg` | alle 0,25 s | Hook im Detail: erstes Bild, Text, Bewegung |
| `einstieg_3-8s.jpg` | alle 0,5 s | Halt-Phase: Versprechen, Regeln, erster Wechsel |
| `erstes_bild.jpg`, `letztes_bild.jpg`, `loop_anfang_ende.jpg` | groß bzw. nebeneinander | Wirkung des ersten Bildes, Loop |
| `schnitte_NN.jpg` | je Schnitt oder Übergang ein Paar „vor“/„nach“ (10 Paare je Bogen) | Art des Übergangs (Match-Cut, Zoom, Wischen …) |
| `spektrum.png`, `spektrum_NN.png` | Frequenzen über die ganze Länge bzw. je 10 s fein | Stimme, Musik, Effekte, Anstiege, Stille ablesen |

**Spektrum lesen** (Frequenzachse seit 07.11.2026 logarithmisch, 40 Hz–16 kHz; die Messungen der ersten 16 Vorbilder haben noch die lineare Achse 0–14 kHz): senkrechte helle Linie = Schlag, Pop oder Klick (tief unten unter 200 Hz = Bass-Schlag oder Boom) · waagerechte Linie hoch oben = Ding oder Glocke · breiter Rauschkeil, der ansteigt = Whoosh oder Riser · Stimme = gestapelte Wellenlinien bzw. ein kräftiges Band zwischen etwa 300 Hz und 3,5 kHz, das im Silbentakt an- und ausgeht (KI-Stimmen erscheinen oft als schmales Band um 1,5–2 kHz; das ist echt, kein Darstellungsfehler) · gleichmäßiges senkrechtes Raster = Musik mit Takt · dunkle Lücke über alle Frequenzen = Stille.

## 6. Schwellen und Kalibrierung
- Alle Schwellen stehen oben in `messen.py` (S, Startwerte). Ändern nur mit Begründung und Testvideo, dann hier vermerken.
- **Effekt-Erkennung, kalibriert am 06.11.2026** an zwei eigenen Videos mit bekanntem Ereignisprotokoll:
  - *Stimme + Effekte* („angestellt-selbststaendig“, 83 Effekte): Die Bänder der vollen Mischung sind unbrauchbar, weil Bens Stimme allein über 160 Treffer auslöst. Der Stereo-Anteil (Stimme liegt mittig und fällt weg) liefert 50 Kandidaten, davon 38 echt (76 %), und findet 42 der 83 Effekte (51 %). Das ist die Standardquelle.
  - *Atmo ohne Stimme* („a2-mond-naeher“, 18 Effekte): Effekte schwellen an statt einzusetzen. Dafür gibt es „Anschwellen ≥ 6 dB“ und die Tiefen-/Höhenpegel der Takt-Tabelle, die den Verlauf zeigen (Grollen ab 45 s sichtbar). Einzelne Einsätze werden dort kaum gefunden.
  - Folge: Die Effektliste ist eine **Vorauswahl**. Art und Zahl der Effekte werden in der Einzelanalyse über die Spektren bestätigt (F, wenn im Spektrum eindeutig) oder bleiben S. Für Regeln über Soundeffekte zählt der Inhaber-Höreindruck, wo Spektrum und Messung nicht eindeutig sind (raster.md J, Hörprotokoll).
- Schnitt-Erkennung: Harte Schnitte sind sehr zuverlässig. Schnelle Kamerafahrten können als „weich“ auftauchen; die Schnittbilder entscheiden.
- **Bekannte Grenzen aus dem ersten Lauf (07.11.2026, 16 Vorbilder):** Whisper-Satzzeiten können in langen Videos ab etwa 40 s auf ganze Sekunden einrasten (dann Wortzeiten dort nur grob); bei Videos ohne Stimme erfindet Whisper manchmal Floskeln („Thank you.“) oder schreibt Tonbeschreibungen, die das Skript seit 07.11. als Tonhinweise trennt; Anschwell-Werte aus echter Stille waren Scheinwerte (seit 07.11. Untergrenze −70 dB). Die Intensität kann am Einstieg statt am inhaltlichen Höhepunkt gipfeln, weil viel Text und Bewegung am Anfang stehen: Höhepunkt immer inhaltlich bestimmen.
- Intensität ist **relativ im Video** (0 = ruhigstes, 10 = dichtestes Fenster). Zwischen Videos vergleichbar sind nur Verlauf und Lage des Höhepunkts, nicht der absolute Wert.

## 7. Was die Messung nicht kann
Texterkennung (Claude liest Text aus den Bildern), Hören (Stimmfarbe, Musikgenre, Art der Effekte sind S), **Sprechpausen** (Whisper setzt die Wortzeiten lückenlos, und ein Klangteppich füllt die Pausen auch im Sprachband; getestet 07.11.2026: 0 von 15 echten Pausen über Pegeleinbrüche gefunden; Pausen im Spektrum als Lücken der Stimme ablesen, S), Halte-Kurven und Wiedergabezeit fremder Videos (nicht öffentlich), Absicht des Machers (immer S).
