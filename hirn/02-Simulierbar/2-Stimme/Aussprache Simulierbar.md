---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-10
quelle: pipeline/aussprache.json, pipeline/tts.py (aufbereiten), .claude/skills/stimme-elevenlabs/SKILL.md §5
tags: [konto/simulierbar, stimme, elevenlabs, aussprache, sprechtext]
cssclasses: [konto-simulierbar, typ-regel]
---

# Aussprache Simulierbar

Wie heikle Wörter so geschrieben werden, dass die Stimme „Ben“ sie beim ersten Mal richtig spricht. Gilt nur für `@simulierbar` (Account 2 hat keine Stimme). Textformat und Ablauf: [[Stimme ElevenLabs Simulierbar]], Skill `stimme-elevenlabs`.

## Die Ausspracheliste
Die Datei `pipeline/aussprache.json` ist eine einfache Liste `"Schreibweise": "gesprochene Form"`. `tts.py` ersetzt diese Wörter im **Sprechtext**, bevor er an ElevenLabs geht; die kostenlose Textprüfung `qc/stimme_vorab.py` prüft den Text nach dem Ersetzen. Die Untertitel und alle Texte im Bild bleiben unberührt.

- Ersetzt wird nur das **ganze Wort**, Groß- und Kleinschreibung zählen genau.
- Einträge, deren Schlüssel mit `_` beginnt, sind Anmerkungen und werden nicht ersetzt.

**Aktuelle Einträge (Stand 10.11.2026)**
| Schreibweise | gesprochene Form | Art |
|---|---|---|
| ETF | E T F | Buchstabenfolge |
| DAX | Dax | Kurzwort, als Wort gesprochen |
| kWh | Kilowattstunden | Einheit |

## Wann ein Wort eingetragen wird
1. **Nach jedem Fehler:** Ein Wort wurde in einer Aufnahme falsch gesprochen. Dann zuerst unten in die Tabelle „Auffälligkeiten“, danach in die Liste.
2. **Vorher, wenn es absehbar heikel ist:** Marken, englische Begriffe, Abkürzungen, Fachwörter, Orts- und Personennamen, die im Skript stehen.
3. **Nicht eintragen:** Wörter, die nur in einem einzigen Video vorkommen und sich dort einfach lautnah schreiben lassen. Dann die Schreibweise direkt im Sprechtext ändern.

Eine Neuaufnahme gibt es wegen eines Aussprachefehlers höchstens einmal je Projekt ([[Stimme ElevenLabs Simulierbar]]). Darum wird die Ursache immer zuerst hier behoben.

## Schreibweisen-Muster
| Fall | So schreiben | Beispiel |
|---|---|---|
| Buchstabenfolge, die buchstabiert wird | einzelne Großbuchstaben mit Leerzeichen | „E T F“, „G T A sechs“ |
| Kurzwort, das als Wort gesprochen wird | wie ein normales Wort, nur der erste Buchstabe groß | „Dax“ statt „DAX“ |
| Englisches Wort | lautnah auf Deutsch schreiben oder durch ein deutsches Wort ersetzen | „Geld zurück“ statt „Cashback“; lautnah nur, wenn das englische Wort bleiben muss und falsch klang |
| Einheit und Zeichen | ausschreiben | „Kilowattstunden“, „Euro“, „Prozent“ |
| Zahl | in Worten, im Sprechtext gerundet | „rund zweiundvierzigtausend Euro“ |
| Jahreszahl und Datum | in Worten | „zweitausendsiebenundzwanzig“, „am ersten Januar“ |
| Abkürzung | ausschreiben | „zum Beispiel“, „circa“, „Millionen“ |
| Hartnäckiger Fall | Lautschrift (IPA) zwischen Schrägstrichen, vorher an einem kurzen Satz in der ElevenLabs-Oberfläche ausprobieren | nur als letzter Weg |

Nie ein Wort in GROSSBUCHSTABEN schreiben, um es zu betonen; die Textprüfung sperrt das.

## Auffälligkeiten aus Aufnahmen
Die Produktion ergänzt diese Tabelle nach **jeder** Aufnahme (Schritt „Anhören und abgleichen“ im Skill `stimme-elevenlabs`), auch wenn nichts neu vertont wird. Stellen, die nur etwas schneller oder langsamer wirken, gehören ebenfalls hierher; sie sind kein Grund für eine Neuaufnahme, zeigen aber, wo das Textformat nachgeschärft werden muss.

| Datum | Video (Projekt) | Wort bzw. Stelle | Wie gesprochen | Abhilfe (Schreibweise, Listeneintrag, Satz umgestellt) |
|---|---|---|---|---|
|  |  |  |  |  |

## Siehe auch
[[Stimme ElevenLabs Simulierbar]] · [[Klangteppich und Ton Simulierbar]] · [[Skriptaufbau Simulierbar]] · [[Index]]
