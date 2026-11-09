---
name: stimme-elevenlabs
description: "Stimm-Skill für die Vertonung über ElevenLabs (Account @simulierbar, Stimme „Ben“). IMMER verwenden, sobald ein Sprechtext geschrieben, geprüft oder vertont wird: „Stimme erzeugen“, „vertonen“, „Sprechtext prüfen“, „tts“, „ElevenLabs“, „Aufnahme“, „die Stimme klingt komisch / zu schnell / abgehackt“, Aussprachefehler, Schritt „Ton zuerst“ der Video-Produktion. Sorgt dafür, dass der Text so an ElevenLabs geht, dass er beim ersten Mal sauber, flüssig und gleichmäßig gesprochen wird: festes Textformat, kostenlose Textprüfung, genau EINE bezahlte Aufnahme je Skript, danach richtet sich das Video nach der Stimme. Zweiter Schritt der Kette: themen-skript → stimme-elevenlabs → video-produktion. Nicht für @stelldirvor.pov (dieser Account hat keine Stimme) und nicht für Klangteppich und Effekte."
---

# Skill: Stimme über ElevenLabs (nur `@simulierbar`)

Eingeführt am 09.11.2026 (Auftrag des Inhabers: keine Probleme mehr mit dem Sprechtempo, keine verschwendeten Credits, eine Stimme, bei der man genau hinhören muss). Dieser Skill ist **Schritt 2 der Kette** `themen-skript → stimme-elevenlabs → video-produktion`. Account 2 `@stelldirvor.pov` ist stumm und nutzt diesen Skill nie.

## 1. Die drei Grundsätze
1. **Der Text entscheidet, wie gleichmäßig die Stimme spricht.** Tempo-Sprünge entstehen durch Auslassungspunkte, Gedankenstriche, GROSS geschriebene Wörter, Gefühls-Tags, Ziffern, Abkürzungen und Sprachmischung. Darum gibt es ein festes Textformat (§3) und eine kostenlose Prüfung davor (§4).
2. **Genau eine Aufnahme je Skript** (feste Regel des Inhabers 08.11.2026). Eine zweite gibt es nur bei einem hörbaren Fehler der Stimme, einmal (§6).
3. **Das Video richtet sich nach der Stimme, nie umgekehrt** (Entscheidung des Inhabers 09.11.2026). Es gibt **keine** Vorgaben für Wörter pro Sekunde, Silben, Satzpausen oder geschätzte Dauer. Die Stimme wird nie gedehnt, gestaucht oder für eine Wunschlänge neu erzeugt. Alle Bildzeiten kommen aus `audio/timing.json`.

## 2. Feste Einstellungen (in `pipeline/tts.py`, nicht je Video ändern)
| Punkt | Wert | Warum |
|---|---|---|
| Stimme | „Ben“ `aTTiK3YzK3dXETpuDE2h` | deutscher Muttersprachler; eine muttersprachliche Stimme ist die wichtigste Voraussetzung für ruhiges deutsches Tempo |
| Modell | `eleven_v4` | laut ElevenLabs das natürlichste Modell für Erzähltext |
| Sprache | `language_code: "de"` | verhindert, dass kurze oder mehrdeutige Stellen in einer anderen Sprache gelesen werden |
| Einstellungen | Stabilität 0,5 · Ähnlichkeit 0,75 | zu niedrige Stabilität lässt die Stimme laut ElevenLabs „zu schnell sprechen“, zu hohe macht sie eintönig; v4 kennt nur diese beiden Regler |
| Anfrage | **das ganze Skript in einer Anfrage**, Endpunkt `with-timestamps` | durchgehende Satzmelodie; Vertonung Satz für Satz erzeugt Brüche in Tempo und Tonfall |
| Startwert (`seed`) | fest je Projekt | eine erlaubte Neuaufnahme klingt so ähnlich wie möglich |
| Textnormalisierung | Standard (`auto`) | der Text ist ohnehin schon ausgeschrieben |

Kein Tempo-Regler (v4 hat keinen), kein Stil-Regler, keine `<break>`-Marken (v4 kennt sie nicht).

## 3. Textformat (gilt für jeden `sprechtext`)
Je Segment gibt es zwei Fassungen: `text` (Untertitel im Bild, Ziffern erlaubt) und `sprechtext` (nur für die Stimme). Für den Sprechtext gilt:

**Aufbau**
- Eine Zeile pro Satz. Eine Leerzeile zwischen zwei Phasen (macht `tts.py` aus den Segmenten selbst).
- Kurze, **vollständige** Sätze, meist 4 bis 10 Wörter. Höchstens 2 Sätze mit nur ein oder zwei Wörtern im ganzen Skript; viele Einzelwörter hintereinander klingen abgehackt.
- Jeder Satz endet mit Punkt oder Fragezeichen. Höchstens 3 Ausrufezeichen im ganzen Skript.

**Satzzeichen**
- Erlaubt: Punkt, Komma, Fragezeichen, Doppelpunkt, selten Ausrufezeichen.
- **Verboten:** Auslassungspunkte („…“ oder „...“), Gedankenstriche als Pause („ – “, „ — “, „ - “), Klammern, Anführungszeichen um Regieanweisungen, Emojis. Eine Pause entsteht durch das Satzende; eine längere Pause durch einen neuen Satz, nicht durch Zeichen.

**Wörter**
- **Alles ausschreiben:** Zahlen („tausendzweihundert Euro“, „zwanzig Prozent“, „neunzehn Euro neunzig“), Jahreszahlen („zweitausendsiebenundzwanzig“), Daten („am ersten Januar“), Einheiten („Kilowattstunden“), Zeichen (Euro, Prozent, Paragraf, und).
- **Keine Abkürzungen:** „zum Beispiel“ statt „z. B.“, „circa“ statt „ca.“, „Millionen“ statt „Mio.“.
- **Zahlen runden:** im Sprechtext rund, im Bild exakt. Lange Zahlen in sprechbare Stücke teilen („rund zweiundvierzigtausend Euro“ statt jeder Stelle).
- **Kein Wort in GROSSBUCHSTABEN.** Betonung entsteht durch die Stellung im Satz: das wichtige Wort ans Satzende oder in einen eigenen kurzen Satz.
- **Nur Deutsch.** Englische Wörter und Marken so schreiben, wie man sie spricht („G T A sechs“), oder über die Ausspracheliste (§5). Buchstabenfolgen einzeln mit Leerzeichen („E T F“).
- **Keine Gefühls- und Geräusch-Tags** (`[excited]`, `[laughs]`, `[whispers]`, `[curious]` je Phase …). Sie verändern das Tempo. Erlaubt ist höchstens **ein** ruhiger Tag ganz am Anfang des ersten Segments (`[calm]`), und nur, wenn der Inhaber ihn für ein Video ausdrücklich will. Standard: kein Tag.
- **Keine Regieanweisungen im Text** („sagt er ruhig“): sie werden mitgesprochen.

**Beispiel**
```json
{"id": "falle", "text": "Klar, die Prämie. Oder?", "sprechtext": "Klar, die Prämie gewinnt.\nOder doch nicht?"}
```
Falsch wäre: `"Klar … die PRÄMIE.\nOder?"` (Auslassungspunkte, GROSS-Wort, Einwortsatz).

## 4. Ablauf (alle Befehle im Ordner `pipeline/`; im Cockpit Python als `py -3`, Schlüssel über `node cockpit/werkzeuge/mit_schluessel.mjs …`)
| # | Schritt | Befehl bzw. Handlung | Ergebnis |
|---|---|---|---|
| 1 | **Sprechtext schreiben oder angleichen** | Jeden `sprechtext` in `projekte/<name>/skript.json` nach §3 fassen. Kommt das Skript schon aus `themen-skript`, nur prüfen. Inhalt und Zahlen nie ändern, nur die Schreibweise. | sauberer Sprechtext |
| 2 | **Laut lesen** | Den ganzen Sprechtext einmal in normalem Erzähltempo durchgehen: Stolpert man an einer Stelle, stolpert auch die Stimme. Zungenbrecher, Zahlenketten und Schachtelsätze umstellen. | flüssiger Text |
| 3 | **Aussprache klären** | Namen, Marken, Fremdwörter, Fachbegriffe: lautnah schreiben oder in `pipeline/aussprache.json` eintragen (§5). | keine Überraschungen |
| 4 | **Kostenlose Textprüfung** | `python3 qc/stimme_vorab.py projekte/<name>` | „BEREIT“ oder Liste der Verstöße mit Segment und Stelle |
| 5 | Verstöße beheben, Schritt 4 wiederholen | kostet nichts, beliebig oft | „BEREIT“ |
| 6 | **Einmal vertonen** | `python3 tts.py projekte/<name>` | `audio/stimme.mp3`, `audio/timing.json`, Eintrag in `audio/aufnahmen.json` |
| 7 | **Anhören und abgleichen** | Aufnahme vollständig anhören. Abgleich Sprechtext gegen Spracherkennung: jedes Wort da, jede Zahl richtig, kein Störgeräusch. | „Stimme fertig“ oder Fall §6 |
| 8 | **Übergabe** | Weiter mit `video-produktion`: Szene, Untertitel und Effekte hängen an den Wortzeiten aus `timing.json`. | – |

Die Textprüfung in Schritt 4 sperrt nur bei Verstößen gegen §3 (Ziffern, Zeichen, Abkürzungen, Auslassungspunkte, Gedankenstriche, GROSS-Wörter, Marken wie `<break>`, unerlaubte Tags, mehr als 3 Ausrufezeichen). Wortzahl (Richtwert 150 bis 190), sehr lange Sätze und viele Einwortsätze sind **Hinweise** und sperren nicht. `tts.py` führt dieselbe Prüfung vor der Anfrage noch einmal aus und stellt ohne „BEREIT“ keine Anfrage.

## 5. Aussprache
- `pipeline/aussprache.json` ist eine einfache Liste `{"Schreibweise": "gesprochene Form"}`. `tts.py` ersetzt die Wörter im Sprechtext, bevor er an ElevenLabs geht; die Untertitel bleiben unberührt.
- Eintragen, sobald ein Wort einmal falsch gesprochen wurde oder absehbar heikel ist (Marken, englische Begriffe, Abkürzungen, Ortsnamen).
- Erst wenn die lautnahe Schreibweise nicht reicht: Lautschrift (IPA) zwischen Schrägstrichen im Text, z. B. `/ˈʃtʊtɡaʁt/`. Das schwankt laut ElevenLabs je Stimme und wird vorher an einem kurzen Satz in der ElevenLabs-Oberfläche ausprobiert, nicht über die Pipeline.

## 6. Nach der Aufnahme: was erlaubt ist
| Lage | Was tun |
|---|---|
| Stimme ist länger oder kürzer als gedacht | **Nichts an der Stimme.** Das Video wird so lang wie die Stimme plus Ausklang. Liegt es unter 61 s (Rewards-Programm braucht über 60 s): Rückfrage an den Inhaber, nicht neu vertonen. |
| Eine Stelle wirkt etwas schneller oder langsamer | Bleibt. Kein Grund für eine Neuaufnahme. Als Beobachtung in `lern_notizen` notieren (Segment, Wortlaut), damit das Textformat lernen kann. |
| **Hörbarer Fehler:** falsche Aussprache, verschlucktes oder falsches Wort, Störgeräusch, fremde Sprache | Ursache im Text beheben (Schreibweise, Ausspracheliste), dann **einmal** `python3 tts.py projekte/<name> --neuaufnahme "<was genau falsch klingt>"`. |
| Zweiter Fehler nach der Neuaufnahme | Status `rueckfrage`. Keine dritte Aufnahme. |

`tts.py` lehnt Neuaufnahmen mit Gründen wie „zu lang“, „zu schnell“, „Tempo“, „Pause“ ab.

## 7. Credits
- Eine Aufnahme kostet rund 0,4 Credits je Zeichen (ca. 500 Credits für ein Skript). Jede Aufnahme steht mit Zeit, Zeichen, Credits und Grund in `audio/aufnahmen.json`.
- **Keine Hörproben über die Pipeline.** Wer eine Schreibweise oder Aussprache ausprobieren will, nimmt einen einzelnen kurzen Satz in der ElevenLabs-Oberfläche; dort sind bei unverändertem Text und unveränderten Einstellungen zwei Wiederholungen frei.
- Text oder Einstellungen zwischen zwei Versuchen zu ändern, kostet immer neu. Darum erst §4 Schritte 1 bis 5 vollständig, dann vertonen.

## 8. Wenn die Stimme trotzdem unruhig klingt (Reihenfolge der Ursachen)
1. Verstoß gegen §3, den die Prüfung nicht kennt (ungewöhnliches Zeichen, Wort in fremder Sprache, sehr langer Schachtelsatz) → Text ändern, Prüfregel in `qc/stimme_vorab.py` ergänzen lassen.
2. Viele sehr kurze Sätze hintereinander → zu vollständigen Sätzen verbinden.
3. Zahlenketten → runden, auf zwei Sätze verteilen.
4. Erst wenn 1 bis 3 über mehrere Videos ausgeschlossen sind: dem Inhaber einen **einmaligen** Vergleich mit dem Modell `eleven_multilingual_v2` an einem kurzen Auszug vorschlagen (laut ElevenLabs das stabilste Modell, dafür weniger lebendig). Nie selbstständig Modell, Stimme oder Regler wechseln.

## 9. Was dieser Skill nie tut
- Die Stimme beschleunigen, verlangsamen, dehnen oder schneiden, um eine Länge zu treffen.
- Ein Skript in mehreren Anfragen vertonen.
- Inhalt, Zahlen oder Reihenfolge des Skripts ändern (nur Schreibweise für die Stimme).
- Eine zweite Aufnahme ohne hörbaren Fehler.
- Schlüssel anzeigen, speichern oder ins Repo schreiben.

Regelquelle im Hirn: `hirn/02-Simulierbar/2-Stimme/Stimme ElevenLabs Simulierbar.md`. Klangteppich, Effekte und Lautheit gehören zur Produktion (`hirn/02-Simulierbar/3-Produktion/`).
