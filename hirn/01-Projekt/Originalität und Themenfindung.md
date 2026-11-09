---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: Entscheidungen des Inhabers 07.11., 08.11. und 09.11.2026, .claude/skills/themen-skript/SKILL.md
tags: [konto/gemeinsam, themen, originalitaet, ideen]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Originalität und Themenfindung

Das gemeinsame Prinzip für beide Accounts. Die Regeln je Account stehen seit 09.11.2026 in [[Themenfindung Simulierbar]] und [[Themenfindung stelldirvor]]; den Ablauf führt der Skill `themen-skript` ([[Pipeline und Skills]]).

## Warum
Andere Creator fragen dieselbe KI mit ähnlichen Befehlen und bekommen dieselben naheliegenden Antworten (Mieten oder Kaufen, Duschen oder Baden, Sonne explodiert). Der Inhaber am 07.11.: „Ich will keine 0815-Vorschläge, sondern Themen, die wirklich niemand macht.“ Am 09.11. kam dazu: Themen müssen nachweislich gesucht werden.

## Das Prinzip (gilt für beide Accounts)
| Regel | Inhalt |
|---|---|
| **Nachfrage vor Einfall** (09.11.) | Jedes Thema beginnt bei etwas, das Menschen nachweislich suchen oder fragen. Ohne Beleg wird es nicht vorgeschlagen. |
| **Das Thema ist gesucht, der Winkel ist neu** (09.11.) | Stark gesuchte Themen sind erlaubt, wenn die Frage bzw. Prämisse neu ist. Ganz abseitige Nischen fallen genauso raus wie Standardfragen. |
| **20 naheliegende streichen** | Zuerst die 20 naheliegendsten Ideen aufschreiben und streichen, dazu alles von der Liste „abgenutzt“ des Accounts. Die gestrichenen Ideen stehen im Ergebnis. |
| **Liste „abgenutzt“ je Account** | Standardthemen, die in ihrer Standardfrage nie vorgeschlagen werden. Sie steht in der Themenfindung-Notiz des Accounts. Zusammen mit der Websuche je Idee ersetzt sie die alten Sperrlisten und den „Konkurrenz-Check vor jeder Produktion“. |
| **Websuche je Idee** | Gibt es auf Deutsch schon ein Video zur gleichen Frage bzw. Prämisse (TikTok, YouTube, Instagram)? Ergebnis im Feld `originalitaet`. Bei einem Fund: Winkel drehen oder verwerfen. Vor dem Skript wird noch einmal gesucht. |
| **Englische Vorbilder** | erlaubt, aber nur mit eigenem Skript und deutlich anderem Design. Nie Sätze, Bild- oder Szenenideen übernehmen (CRP-Ausschluss „Unoriginal“). |
| **Kein Gedächtnis aller Vorschläge** | Nicht gewählte Ideen dürfen wiederkommen. Gesperrt sind nur die eigenen gebauten Videos. Ausnahme: Folgeteile eigener Treffer ([[Serien und Treffer-Folgen]]). |
| **Weiterschick-Wert** (08.11.) | Jede Idee beantwortet: „Würde man das jemandem schicken?“ Unser einziger Treffer war das einzige Video mit nennenswerten Shares (**F**, n = 1). |
| **Der Inhaber wählt** | 10 Ideen, dann seine Wahl. Ein Skript entsteht nur für gewählte Ideen. |

## Was sich am 09.11.2026 geändert hat
- Die Klassiker-Quoten für Account 1 („höchstens 1 von 10“ vom 07.11., „bis 3 von 10“ vom 08.11.) sind ersetzt: Stark gesuchte Themen sind mit neuem Winkel offen, das Duell ist keine Pflicht mehr ([[Themenfindung Simulierbar]]).
- Account 2: Themenfelder zu Wissenschaft, Naturphänomenen, Körper und Skurrilem verschoben; die Klassiker bleiben gesperrt ([[Themenfindung stelldirvor]]).
- Die „Zutaten des Tages“ (zufällige Einträge je Ideen-Auftrag, 07.11.) nennt der Skill `themen-skript` nicht mehr als Pflicht; ob das Cockpit sie weiter zieht, hängt am Stand von `tools/chat_befehle.py` und `cockpit/lib/studio.mjs`.

## Grenzen
- TikTok zeigt Such- und Hashtag-Seiten ohne Login nicht; die Websuche findet TikTok-Videos nur, soweit Suchmaschinen sie kennen ([[Recherche-Methode und Grenzen]]). „Kein deutsches Video gefunden“ heißt: nicht gefunden, nicht: sicher keins (**A**).
- Der Trend-Radar schlägt weiter eigene Themen vor; die Listen „abgenutzt“ gelten dort noch nicht ([[Trend-Radar]]).
- Ob Themen mit neuem Winkel so gut laufen wie die Klassiker, misst die Lernschleife ([[Lernschleife und Insights]]).

## Siehe auch
[[Themenfindung Simulierbar]] · [[Themenfindung stelldirvor]] · [[Pipeline und Skills]] · [[Entscheidungen Log]] · [[Claude-Chat-Workflow]] · [[Regelwerk Simulierbar]] · [[Regelwerk Account 2]] · [[Index]]
