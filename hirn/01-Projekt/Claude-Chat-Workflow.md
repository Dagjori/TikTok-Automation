---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: Entscheidung des Inhabers 02.11.2026 (spätabends), tools/chat_befehle.py
tags: [konto/gemeinsam, workflow, claude-chat, ideen, skript]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Claude-Chat-Workflow: tägliche Ideen und Skripte

**Entscheidung 02.11. (Inhaber):** Es gibt keinen 30-Tage-Plan mehr. Jeden Tag entstehen die Themen neu: Claude Chat liefert 10 Videoideen je Account, der Inhaber wählt je 2 für den nächsten Tag, danach schreibt Claude Chat die Skripte. Claude Code baut daraus die Videos.

## Rollen
| Wer | Was |
|---|---|
| **Claude Chat** (Ideen-Studio oder claude.ai) | kennt Nische, Rolle und Regeln; liefert 10 Ideen, danach makellose Skripte |
| **Inhaber** | wählt je Account 2 Ideen aus (anklicken), gibt das Startsignal |
| **Claude Code** (diese Sitzung) | prüft die Skripte, rechnet Zahlen nach, baut Szene/Stimme/Ton, rendert, nimmt ab, plant in Buffer ein, wertet täglich 20:00 aus |

## Ablauf pro Tag
1. **Ideen** (Inhaber, 1 Klick je Account): 10 Ideen je Account. Befehle: [[Befehl Ideen und Skripte Simulierbar]], [[Befehl Ideen und Skripte Account 2]]. Der Befehl enthält Nische, Rolle, Regeln, die bisherigen Videos und den **aktuellen Lernstand** ([[Lernschleife und Insights]]).
2. **Auswahl** (Inhaber, anklicken): 2 Ideen je Account (Mittag 12:30 und Abend 19:30 des nächsten Tages).
3. **Skripte** (automatisch nach der Auswahl): je ein makelloses Skript, Selbstprüfung am Ende.
4. **Übergabe:** Die Skripte liegen im Ideen-Studio in der Datenbank (Sammlung `skripte`, Dokument `acc1-JJJJ-MM-TT-mittag|abend` bzw. `acc2-…`) oder werden vom Inhaber in die Sitzung eingefügt.
5. **Startsignal** (Inhaber): Claude Code übernimmt das Skript 1:1 nach `skript.json`, rechnet die Zahlen als Code nach (`pipeline/sim/` mit Test), meldet Abweichungen und ändert Aussagen nur nach Rücksprache.
6. **Produktion, Abnahme, Buffer** wie gewohnt ([[Produktion Rhythmus und Modelle]]).

## Anforderungen an jedes Skript
- **Faktentreu:** nichts erfinden; jede Zahl mit Rechenweg, Quelle und Jahr; Unbelegtes wird nicht verwendet; Annahmen sind als Annahmen gekennzeichnet; Quellen nur intern.
- **Diskussionsanreiz nur implizit:** die Sache selbst regt zum Austausch an (überraschende oder lageabhängige Antwort); nie ausgesprochen, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- **Spannung:** von der ersten Sekunde fangen, kontinuierlich steigern, Dramaturgie-Hinweise für Design und Animation.
- **Account 1:** Regie-Text für Ben, damit Tonfall und Betonung perfekt umgesetzt werden (Details [[Stimme und Ton Simulierbar]]); 150–190 Wörter, Sprache flüssig.
- **Account 2:** keine Stimme; Titelfrage, 12–18 kurze Sätze, Faktenzeile, Anzeige-Plan, Weltvorschlag, Zeitraffer-Faktor.

## Zugänge
| Weg | Wann |
|---|---|
| **Ideen-Studio** (Artifact, Befehle laufen per Klick, Ergebnisse landen in der Datenbank) | Standard |
| **Claude Chat von Hand** (Befehl aus der Notiz kopieren) | Rückfall, z. B. wenn das Studio nicht erreichbar ist |

## Grenzen (ehrlich)
- Claude Code kann keine Nachrichten in deinen Claude-Chat senden. Das Ideen-Studio löst das ohne Kopieren, weil die Seite Claude selbst fragt (dein claude.ai-Kontingent, nicht Claude Code).
- Claude Chat kann sich bei Zahlen irren. Deshalb rechnet Claude Code jede Zahl noch einmal nach, bevor ein Video entsteht.

## Siehe auch
[[Regelwerk]] · [[Pläne und Kalender]] (Pläne sind Archiv) · [[Produktion Rhythmus und Modelle]] · [[Index]]
