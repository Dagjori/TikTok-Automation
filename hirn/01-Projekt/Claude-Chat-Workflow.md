---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: cockpit/README.md, .claude/skills/themen-skript/SKILL.md, .claude/skills/video-produktion/SKILL.md, tools/chat_befehle.py; Entscheidungen des Inhabers 02.11., 07.11. und 09.11.2026
tags: [konto/gemeinsam, workflow, claude-chat, ideen, skript, cockpit]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Claude-Chat-Workflow

Der Tagesablauf von der Idee bis zum geposteten Video. **Stand 09.11.2026:** Er läuft im lokalen Cockpit ([[Cockpit]]) mit drei Skills in fester Reihenfolge ([[Pipeline und Skills]]). Der Name der Notiz stammt aus der Zeit, als Ideen und Skripte in Claude Chat entstanden; der Weg von Hand über Claude Chat ist heute nur noch der Notweg (unten).

## Rollen
| Wer | Was |
|---|---|
| **Inhaber** | wählt je Account die Ideen (Mittag, Abend), prüft die Skripte und gibt frei. Mehr Klicks braucht ein Video-Tag nicht. |
| **Cockpit-Automatik** | stößt Ideen, Recherche und Produktion an und wiederholt einen Fehler einmal ([[Cockpit]]) |
| **Skill `themen-skript`** | liefert 10 Ideen je Account und schreibt für gewählte Ideen das Skript |
| **Skill `stimme-elevenlabs`** | nur Simulierbar: Textprüfung, genau eine Aufnahme |
| **Skill `video-produktion`** | Rechnung, Szene, Render auf dem PC, Prüfung, Buffer, Nachprüfung (Sonnet 5.5; Opus nur für einen Neubau von Grund auf) |
| **Lernschleife** | täglich 19:52, schreibt den Lernstand fort ([[Lernschleife und Insights]]) |

## Ablauf pro Tag
1. **Ideen (Automatik, 07:00):** Das Cockpit erzeugt für beide Accounts je 10 Ideen für den nächsten Video-Tag. Der Auftrag enthält Regeln, bisherige Videos und den Lernstand. Jede Idee hat belegte Nachfrage, einen Winkel und eine Originalitätsprüfung ([[Themenfindung Simulierbar]], [[Themenfindung stelldirvor]]).
2. **Wahl (Inhaber, Klick):** je Account eine Idee für Mittag und eine für Abend.
3. **Recherche und Skript (Automatik nach der Wahl):** Jede Zahl wird an der Quelle geprüft, die Rechnung aufgestellt, das Skript nach dem Aufbau des Accounts geschrieben und selbst geprüft ([[Skriptaufbau Simulierbar]], [[Ablauf Account 2]]).
4. **Prüfen (Inhaber):** Skript lesen, dann **Freigeben**, **Neu schreiben lassen** (mit Kommentar) oder **Verwerfen**.
5. **Produktion (Automatik nach der Freigabe):** Sind alle Skripte eines Tages freigegeben, startet die Produktion nach 60 s. Bei Simulierbar zuerst die Stimme (eine Aufnahme), dann richtet sich das Video nach der Stimme. Reihenfolge: zuerst beide 12:30-Videos bis Buffer, dann die 19:30-Videos.
6. **Nachprüfung** ca. 20 Min. nach der Posting-Zeit (öffentlich, Länge, KI-Label wie gesetzt), dann Status „gepostet“.

Den Fortschritt jedes Videos zeigt das Cockpit als Live-Karte auf „Jetzt“.

## Faktenfehler (Inhaber 02.11.: „korrigieren und weiter“)
Findet Claude vor der Produktion eine falsche oder veraltete Zahl, korrigiert er sie mit Quelle, ändert die Aussage nur so weit wie nötig, vermerkt es unter `korrekturen` und produziert weiter. **Kippt das Ergebnis** (andere Antwort auf die Titelfrage, Pointe stimmt nicht mehr), hält dieses Video an: Status „Rückfrage“, Entscheidung des Inhabers per Klick.

## Anforderungen an jedes Skript
- **Faktentreu:** nichts erfinden; jede Zahl mit Rechenweg, Quelle und Jahr; Unbelegtes wird nicht verwendet; Annahmen gekennzeichnet; Quellen nur intern.
- **Frage und späte Auflösung:** in den ersten 3 Sekunden eine Frage, zu der der Zuschauer still tippt; Auflösung spät.
- **Diskussionsanreiz nur implizit:** keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- **Account 1:** Sprechtext im Textformat der Stimme ([[Stimme ElevenLabs Simulierbar]]); 150–190 Wörter als grober Richtwert. Regeln zum Sprechtempo gibt es seit 09.11.2026 nicht mehr.
- **Account 2:** keine Stimme; Titelfrage, 12–18 kurze Sätze, Faktenzeile, Anzeige-Plan, Welt, Zeitraffer.

## Zugänge
| Weg | Wann |
|---|---|
| **Lokales Cockpit** | Standard |
| **Claude Chat von Hand** (Auftragstext aus [[Befehl Ideen und Skripte Simulierbar]] bzw. [[Befehl Ideen und Skripte Account 2]] kopieren, Skripte in eine Claude-Code-Sitzung einfügen) | Notweg, wenn das Cockpit nicht läuft |

Das frühere Ideen-Studio (Claude-Artifact mit Disponent-Sitzung, 02.11.) ist durch das lokale Cockpit abgelöst; seine Beschreibung steht noch in `docs/automatik/`.

## Grenzen
- Alle Sitzungen nutzen dasselbe Nutzungskontingent.
- Die Websuche findet TikTok-Videos nur, soweit Suchmaschinen sie kennen ([[Recherche-Methode und Grenzen]]).

## Siehe auch
[[Pipeline und Skills]] · [[Cockpit]] · [[Regelwerk]] · [[Produktion Rhythmus und Modelle]] · [[Lernschleife und Insights]] · [[Originalität und Themenfindung]] · [[Index]]
