# Korpus: welche und wie viele Videos

## 1. Mindestzahl und Begründung
| Stufe | virale Videos je Format | Vergleichsvideos | Creator |
|---|---|---|---|
| Minimum | **12** | **4** | ≥ 3, keiner stellt mehr als 1/3 |
| Ziel („perfekte Auswertung“) | **20** | **6** | ≥ 4, keiner stellt mehr als 1/4 |
| Obergrenze | 30 | 8 | – |

Warum genau diese Zahlen:
- **Sättigung ab etwa 12 Fällen (F):** In der qualitativen Forschung tauchen nach rund 12 Fällen etwa 90 % aller wiederkehrenden Muster auf, die Grundmuster schon nach 6 (Guest, Bunce & Johnson 2006, „How Many Interviews Are Enough?“). Weitere Fälle bringen vor allem Varianten.
- **Statistische Untergrenze (F, gerechnet):** Ein Merkmal, das in 10 von 12 viralen Videos vorkommt, hat eine untere 95-%-Grenze von 55 %; es ist also mit großer Sicherheit die Regel und kein Zufall. Bei 8 von 10 liegt die Grenze unter 50 %, darum reichen 10 Videos nicht. Bei 20 Videos (16 von 20) steigt die Grenze auf 58 %, und Zahlen-Korridore (25.–75. Perzentil) werden stabil.
- **Vergleichsgruppe (Pflicht ab dem Minimum):** Ohne schwächere Videos desselben Formats lässt sich nicht trennen, was *Erfolg* macht und was nur *zum Format gehört* (Beispiel: Wenn alle Geld-Duelle Untertitel haben, auch die schwachen, ist „Untertitel“ ein Grundformat, kein Erfolgsfaktor). 4 Vergleichsvideos reichen für grobe Unterschiede (≥ 30 Prozentpunkte), 6 für das Ziel.
- **Vielfalt (≥ 3 bzw. 4 Creator):** Sonst lernen wir den Stil eines einzelnen Creators statt der Erfolgsmuster des Formats, und das Regelwerk wird zur Kopie.
- **Sättigung prüfen statt blind zählen:** Bringen die letzten 3 viralen Videos kein neues Merkmal mit Endanteil ≥ 25 %, ist Schluss. Sonst je 3 nachlegen, höchstens 30 (darüber steigt der Aufwand stark, der Ertrag kaum).

## 2. Auswahl der viralen Videos
| Kriterium | Pflicht | bevorzugt |
|---|---|---|
| Aufrufe | ≥ 1 Mio | ≥ 3 Mio („mehrere Millionen“) |
| Ausreißer | – | Aufrufe ≥ 3 × Follower des Creators oder ≥ 5 × Median seiner letzten Videos (dann wirkt das Video, nicht nur die Reichweite) |
| Alter | ≤ 18 Monate | ≤ 12 Monate (aktuelle Plattformlogik) |
| Format | gleiches Format wie der Korpus (Länge ±50 %, gleiche Art: Stimme/keine Stimme, Simulation/POV …) | gleiche Sprache oder sprachunabhängig |
| Vielfalt | keiner der Creator > 1/3 | verschiedene Themen innerhalb des Formats |
| Ausschluss | Werbung/bezahlte Reichweite erkennbar, Duette/Stitches, reine Trend-Sounds ohne Inhalt, Kinder als Hauptfigur | – |

## 2b. Wenn weniger Videos da sind oder Zahlen fehlen
- **Mit dem arbeiten, was da ist:** Ein Korpus unter dem Minimum wird trotzdem vollständig analysiert. Die Synthese markiert dann je Merkmal „belastbar“ oder „vorläufig“ ([synthese.md](synthese.md) §4b); weitere Videos können jederzeit nachgelegt werden.
- **Ohne Aufrufe:** Likes sind das Erfolgsmaß. Viral und Vergleich werden innerhalb des Korpus nach Likes getrennt: Vergleich = unter 10 % des Like-Medians der starken Videos; eine klare Lücke in der Like-Reihe darf die Grenze begründen (Grenzfall in `notiz` vermerken).
- **Ohne Creator-Angabe:** Konto aus dem Wasserzeichen im Video lesen (Kontaktbögen) und in `korpus.csv` nachtragen.

## 3. Auswahl der Vergleichsvideos
- Gleiches Format, möglichst **dieselben Creator** wie die viralen (dann unterscheidet sich vor allem das Video, nicht der Kanal).
- Aufrufe **unter 10 %** des viralen Medians und unter dem Median des eigenen Kanals.
- Ähnliches Thema wie mindestens ein virales Video (Paare sind ideal: gleiches Thema, einmal viral, einmal nicht).

## 4. Ordner und Dateien (lokal, nie ins Repo)
```
C:\tiktok\rea-video\                 Arbeitsordner (Linux/Cloud: ../rea-video neben dem Repo)
  _modelle\ggml-*.bin                Whisper-Modell (messung.md §2)
  _index.csv                         Prüfsumme je aufgenommenem Video (scripts/aufnehmen.py, verhindert Doppelte)
  _eingang\                          optionaler Ablageordner für neue Videos (neben Downloads)
  _uebergreifend\synthese\           übergreifende Auswertung beider Accounts
  <korpus>\                          z. B. geld-duell-stimme, pov-was-waere-wenn
    korpus.csv                       eine Zeile je Video (Vorlage vorlagen/korpus.csv)
    videos\V01.mp4 …                 Dateiname = ID; viral und Vergleich fortlaufend nummeriert
    analysen\V01\                    messung.json, messung.md, bilder\, transkript.srt, analyse.md, merkmale.json
    synthese\                        matrix.md, regelkandidaten.md, kennzahlen.json (+ .vorher.json), aenderungen.md
```
Korpus-Namen: klein, mit Bindestrich, nach dem Format benannt, nicht nach einem Creator.

## 5. `korpus.csv`
Trennzeichen Semikolon, eine Zeile je Video, Reihenfolge = Analysereihenfolge (wichtig für die Sättigung).

| Spalte | Inhalt |
|---|---|
| `id` | V01, V02 … (gleich dem Dateinamen) |
| `gruppe` | `viral` oder `vergleich` (später auch `eigen`) |
| `link` | öffentlicher Link (nur lokal) |
| `creator` | Konto des Creators (nur lokal; im Hirn nur als Anzahl) |
| `aufrufe`, `likes`, `kommentare`, `shares`, `saves` | öffentliche Zahlen am Abrufdatum; „2,4 Mio“, „850k“ und „1.234.567“ werden gelesen |
| `follower` | Follower des Creators am Abrufdatum |
| `datum` | Veröffentlichung (JJJJ-MM-TT) |
| `abgerufen` | Datum, an dem die Zahlen notiert wurden |
| `notiz` | z. B. „Paar mit V14“, „Serie Teil 2“ |

## 6. Beschaffung
- Der Inhaber lädt die Videos selbst herunter und schickt sie im Chat (Anhang oder hineingezogen) oder legt sie in `Downloads` bzw. `_eingang\`; `scripts/aufnehmen.py` übernimmt sie in den Korpus (SKILL.md, Schnellablauf). Claude lädt keine Videos von TikTok herunter (Nutzungsbedingungen; Downloads nur mit ausdrücklicher Freigabe).
- Die Zahlen notiert der Inhaber oder Claude von der öffentlichen Videoseite ([[Recherche-Methode und Grenzen]]), immer mit `abgerufen`.
- Fehlen Zahlen, bleibt das Feld leer; die Synthese rechnet dann ohne diese Kennzahl.
