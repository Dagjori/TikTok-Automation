---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: CLAUDE.md §3, .claude/skills/*/SKILL.md; abgeglichen mit den Regelwerken am 09.11.2026
tags: [konto/gemeinsam, trennung, regeln]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Trennung der Accounts

Zwei Kanäle, zwei Regelwerke, in jedem Skill zwei getrennte Teile. **Nie mischen.** Beim Arbeiten an einem Video zuerst festlegen, zu welchem Account es gehört, und nur dessen Ordner im Hirn und dessen Teil-Datei im Skill lesen.

## Gegenüberstellung
| Merkmal | Account 1 `@simulierbar` | Account 2 `@stelldirvor.pov` |
|---|---|---|
| Hirn-Ordner | `02-Simulierbar` (Abteile 1, 2, 3, 9) | `03-stelldirvor-pov` (Abteile 1, 3, 9; kein Abteil „Stimme“) |
| Skills | `themen-skript` (Teil `simulierbar.md`) → `stimme-elevenlabs` → `video-produktion` (Teil `simulierbar.md`) | `themen-skript` (Teil `stelldirvor.md`) → `video-produktion` (Teil `stelldirvor.md`) |
| Konto-Tag | `konto/simulierbar` | `konto/stelldirvor` |
| Thema | Geld in Deutschland, Euro-Ergebnis aus eigener Modellrechnung | „Was wäre, wenn …“: Wissenschaft, Naturphänomene, Körper, Skurriles |
| Stimme | Ben (ElevenLabs, v4), genau eine Aufnahme je Skript | **keine** (stumm, bestätigt 09.11.) |
| Untertitel | in Blöcken von 1–4 Wörtern, Kontur, Schlüsselwort in der Teamfarbe | **keine** |
| Länge | folgt der Stimme, mindestens 61 s, in der Regel 65–80 s | 80 s (Testblock 62–70 s) |
| Aufbau | Hook → Zähler ab 3 s, Regeln als Chips → Denkfalle → erste Wendung 12–15 s → weitere Wendungen mit zweiter Frage → Kipp-Moment ca. 60–65 % → Ergebnis ca. 75–80 % → Warum → Pointe → Schlusskarte (seit 09.11.) | Titelfrage → Countdown → Ereignis bei ca. 8 s → Eskalation → Höhepunkt „HIER“ → Nachspiel → Abspann (seit 07.11.) |
| Folgen-Hinweis | nur als Blocktest: Textzeile am Ende (seit 08.11.) | nur als Blocktest: Textzeile am Ende (seit 08.11.) |
| Schlusssatz/Schleife | Schlusssatz entfällt (Schlusskarte), Schleife freiwillig | **nein** |
| Bildstil | alle Stile 1–15 und 17–21 mit Qualitätslatte, dunkle zuerst ([[Regelwerk Simulierbar]]), Teamfarben (nie Gelb), Mittelachse, Schutzzone 150 px | Lunar-POV, feste Ich-Perspektive, kein Teamfarben-Konzept |
| Prüfung | `qc/massstab.py` (23 Punkte) | `qc/referenz_pov.py` (21 Pflichtpunkte) |
| Ton | Klangteppich + Effekte, −14 LUFS | Atmo/Sounddesign, −14 LUFS, Höhepunkt laut |
| Caption | „… Ich hab's simuliert. … #wissen #simulation“ | „… Ich hab's durchgespielt. … #wissen #waswaerewenn“ |
| Themenfindung | [[Themenfindung Simulierbar]]: Nachfrage, Winkel, Liste „abgenutzt“, Originalität je Idee (die alte Sperrliste ist Archiv: [[Sperrliste und Auswahlregeln Simulierbar]]) | [[Themenfindung stelldirvor]]: Nachfrage, Winkel, gesperrte Klassiker, Originalität je Idee (die alte Sperrliste ist Archiv: [[Konkurrenz-Check und Sperrliste Account 2]]) |
| Plan | entfällt (Archiv: [[Themenplan Simulierbar]]); 10 Ideen täglich im Cockpit | entfällt (Weltenkatalog statt Plan: [[Themen und Plan Account 2]]); 10 Ideen täglich im Cockpit |
| Radar | ja ([[Trend-Radar]]) | seit 08.11. eigener Abschnitt in [[Trend-Radar]] (Prompt der Radar-Aufgabe noch nicht umgestellt) |

## Gemeinsam gilt für beide
[[Plattformregeln und Posting]] (Buffer, Posting-Zeiten) · [[Produktion Rhythmus und Modelle]] (4 Videos/Tag, max. 2 Agenten, Sonnet) · [[Render-Dienst Windows-PC]] · [[Arbeitsregeln und Sicherheit]] · [[CRP Creator Rewards Program]] · Kein Logo, kein Kanalname, keine Sticker im Bild.

## Typische Verwechslungen (vermeiden)
- Maßstab und `massstab.py` auf Account 2 anwenden: falsch, dort gilt `referenz_pov.py`.
- Stimme/Untertitel in Account 2: verboten. Folgen-Hinweis nur als Blocktest am Ende (seit 08.11., [[Regelwerk Account 2]]).
- Alltagsthema ohne messbare Größe in Account 2: ungeeignet. (Orte auch in Deutschland sind erlaubt, [[Themenfindung stelldirvor]].)
- Den Skill `stimme-elevenlabs` oder Regeln zum Sprechtext auf Account 2 anwenden: falsch, der Account ist stumm.
- Große Sticker in Account 1: verboten. Stile: alle 1–15 und 17–21 mit Qualitätslatte, Stil 16 (Lunar-POV) bleibt Account 2.
- Recherche-Ergebnisse immer dem richtigen Account zuordnen (`konto` im Notizkopf).

## Siehe auch
[[Account Simulierbar Überblick]] · [[Account stelldirvor.pov Überblick]] · [[Pipeline und Skills]] · [[Index]]
