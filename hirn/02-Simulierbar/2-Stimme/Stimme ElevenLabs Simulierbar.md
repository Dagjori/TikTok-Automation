---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-10
quelle: .claude/skills/stimme-elevenlabs/SKILL.md, pipeline/tts.py, pipeline/qc/stimme_vorab.py, Entscheidungen des Inhabers 08.11.2026 (eine Aufnahme) und 09.11.2026 (kein Tempo, neues Textformat)
tags: [konto/simulierbar, stimme, elevenlabs, sprechtext, textformat, credits]
cssclasses: [konto-simulierbar, typ-regel]
---

# Stimme ElevenLabs Simulierbar

Regeln für die Stimme von `@simulierbar`. **Gültig seit 09.11.2026** ([[Entscheidungen Log]]). Den Ablauf mit Befehlen führt der Skill `stimme-elevenlabs` (`.claude/skills/stimme-elevenlabs/SKILL.md`). **Account 2 ist stumm** und gehört nicht hierher ([[Trennung der Accounts]]). Klangteppich, Effekte und Lautheit: [[Klangteppich und Ton Simulierbar]].

## 1. Die drei Grundsätze
1. **Der Text entscheidet, wie gleichmäßig die Stimme spricht.** Unruhe entsteht durch Auslassungspunkte, Gedankenstriche, GROSS geschriebene Wörter, Gefühls-Tags, Ziffern, Abkürzungen und Sprachmischung. Darum gibt es ein festes Textformat (§3) und eine kostenlose Prüfung vor der Aufnahme (§4).
2. **Genau eine Aufnahme je Skript** (feste Regel des Inhabers 08.11.2026). Eine zweite gibt es nur bei einem hörbaren Fehler der Stimme, und nur einmal (§5).
3. **Das Video richtet sich nach der Stimme, nie umgekehrt** (Entscheidung des Inhabers 09.11.2026). Jede Regel zum Sprechtempo ist gestrichen: keine Vorgaben für Wörter oder Silben pro Sekunde, Silben je Wort, Satzpausen, geschätzte Stimmdauer oder Hook-Zeit. Die Stimme wird nie gedehnt, gestaucht oder für eine Wunschlänge neu erzeugt. Alle Bildzeiten kommen aus `audio/timing.json`. Es bleibt nur die Mindestlänge von 61 s für das Rewards-Programm ([[CRP Creator Rewards Program]]).

## 2. Feste Einstellungen (in `pipeline/tts.py`, nicht je Video ändern)
| Punkt | Wert |
|---|---|
| Stimme | „Ben“ `aTTiK3YzK3dXETpuDE2h` (deutscher Muttersprachler, Entscheidung 31.10.) |
| Modell | `eleven_v4` |
| Sprache | `language_code: "de"` |
| Einstellungen | Stabilität 0,5 · Ähnlichkeit 0,75 (fest) |
| Anfrage | das ganze Skript in **einer** Anfrage, mit Wortzeiten |
| Startwert (`seed`) | fest je Projekt |

Kein Tempo-Regler, kein Stil-Regler, keine `<break>`-Marken (v4 kennt sie nicht). Ersetzt den Stand bis 08.11. („keine `voice_settings`“, Regie über Tags und Großschreibung).

## 3. Textformat (gilt für jeden `sprechtext`)
Je Segment gibt es `text` (Untertitel im Bild, Ziffern erlaubt) und `sprechtext` (nur für die Stimme).

| Bereich | Regel |
|---|---|
| Aufbau | eine Zeile pro Satz; Leerzeile zwischen zwei Phasen |
| Sätze | kurz und **vollständig**, meist 4 bis 10 Wörter; höchstens 2 Sätze mit nur ein oder zwei Wörtern im ganzen Skript |
| Satzende | Punkt oder Fragezeichen; höchstens 3 Ausrufezeichen im ganzen Skript |
| Erlaubte Zeichen | Punkt, Komma, Fragezeichen, Doppelpunkt, selten Ausrufezeichen |
| **Verboten** | Auslassungspunkte („…“), Gedankenstriche als Pause, Klammern, Emojis, Regieanweisungen im Text |
| Zahlen und Zeichen | alles ausschreiben: Zahlen, Jahreszahlen, Daten, Einheiten, Euro, Prozent; Zahlen runden (im Bild exakt) |
| Abkürzungen | keine („zum Beispiel“, „circa“, „Millionen“) |
| Betonung | **kein Wort in GROSSBUCHSTABEN**; das wichtige Wort ans Satzende oder in einen eigenen kurzen Satz |
| Sprache | nur Deutsch; englische Wörter und Marken so schreiben, wie man sie spricht („G T A sechs“), Buchstabenfolgen einzeln („E T F“) |
| Tags | **keine Gefühls- und Geräusch-Tags**; höchstens ein ruhiger Tag `[calm]` ganz am Anfang, und nur auf ausdrücklichen Wunsch des Inhabers |

Eine Pause entsteht durch das Satzende, eine längere durch einen neuen Satz, nie durch Zeichen.

```json
{"id": "falle", "text": "Klar, die Prämie. Oder?", "sprechtext": "Klar, die Prämie gewinnt.\nOder doch nicht?"}
```

**Tonfall:** ruhig, sachlich, freundlich; kein Sportreporter, kein „Los geht’s“.

## 4. Vor der Aufnahme
1. Sprechtext nach §3 fassen. Inhalt und Zahlen nie ändern, nur die Schreibweise.
2. Einmal laut lesen. Wo man stolpert, stolpert auch die Stimme.
3. Aussprache klären (§6).
4. **Kostenlose Textprüfung** `qc/stimme_vorab.py` bis „BEREIT“. Sie sperrt nur bei Verstößen gegen §3. Wortzahl (Richtwert 150 bis 190), sehr lange Sätze und viele Einwortsätze sind Hinweise und sperren nicht.
5. Erst dann einmal vertonen (`tts.py`). `tts.py` prüft selbst noch einmal und stellt ohne „BEREIT“ keine Anfrage.

## 5. Nach der Aufnahme: was erlaubt ist
| Lage | Was tun |
|---|---|
| Stimme ist länger oder kürzer als gedacht | **Nichts an der Stimme.** Das Video wird so lang wie die Stimme plus Ausklang. Liegt es unter 61 s: Rückfrage an den Inhaber, nicht neu vertonen. |
| Eine Stelle wirkt etwas schneller oder langsamer | Bleibt. Als Beobachtung in `lern_notizen` notieren (Segment, Wortlaut). |
| **Hörbarer Fehler:** falsche Aussprache, verschlucktes oder falsches Wort, Störgeräusch, fremde Sprache | Ursache im Text beheben, dann **einmal** `tts.py --neuaufnahme "<was falsch klingt>"`. |
| Zweiter Fehler nach der Neuaufnahme | Status `rueckfrage`. Keine dritte Aufnahme. |

Nach der Aufnahme wird der Text nie gekürzt und neu vertont. `tts.py` lehnt Neuaufnahmen mit Gründen wie „zu lang“, „zu schnell“, „Tempo“ oder „Pause“ ab. Nach der Aufnahme: vollständig anhören und den Sprechtext gegen die Spracherkennung abgleichen (jedes Wort da, jede Zahl richtig).

## 6. Aussprache
- `pipeline/aussprache.json` ist die Liste `{"Schreibweise": "gesprochene Form"}`. `tts.py` ersetzt die Wörter im Sprechtext vor der Anfrage; die Untertitel bleiben unberührt.
- Eintragen, sobald ein Wort einmal falsch gesprochen wurde oder absehbar heikel ist (Marken, englische Begriffe, Abkürzungen, Ortsnamen).
- Lautschrift nur, wenn die lautnahe Schreibweise nicht reicht, und vorher an einem kurzen Satz in der ElevenLabs-Oberfläche ausprobieren.

## 7. Credits
- Eine Aufnahme kostet rund 0,4 Credits je Zeichen, also ca. 500 Credits je Skript. Jede Aufnahme steht mit Zeit, Zeichen, Credits und Grund in `audio/aufnahmen.json`.
- Hintergrund der Ein-Aufnahme-Regel: Bis 07.11. wurde jede Stimme 3 bis 5 Mal erzeugt; so waren 40.000 Credits nach einer Woche verbraucht (**F**, ElevenLabs-Verlauf 31.10.–07.11.).
- **Keine Hörproben über die Pipeline.** Eine Schreibweise probiert man an einem einzelnen kurzen Satz in der ElevenLabs-Oberfläche aus.
- Der Schlüssel liegt nur als Netzwerk-Secret bzw. Umgebungsvariable vor, nie im Repo und nie sichtbar in der Sitzung ([[Arbeitsregeln und Sicherheit]]).

## 8. Wenn die Stimme trotzdem unruhig klingt
Reihenfolge der Ursachen: Verstoß gegen §3, den die Prüfung nicht kennt → viele sehr kurze Sätze hintereinander → Zahlenketten. Erst wenn das über mehrere Videos ausgeschlossen ist, schlägt Claude dem Inhaber einen einmaligen Vergleich mit einem anderen Modell vor. Modell, Stimme oder Regler werden nie selbstständig gewechselt.

## Siehe auch
[[Aussprache Simulierbar]] (Ausspracheliste, Schreibweisen-Muster, Auffälligkeiten aus Aufnahmen) · [[Skriptaufbau Simulierbar]] · [[Klangteppich und Ton Simulierbar]] · [[Technik und Szenenbau Simulierbar]] · [[Prüfung und Abnahme Simulierbar]] · [[Pipeline und Skills]] · [[Regelwerk Simulierbar]] · [[Account Simulierbar Überblick]]
