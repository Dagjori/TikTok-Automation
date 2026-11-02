---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md, Entscheidungen des Inhabers bis 02.11.2026 spätabends
tags: [konto/gemeinsam, regelwerk, regeln]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Regelwerk (gemeinsam, beide Accounts)

Die Kurzfassung aller Regeln, die für **beide** Accounts gelten. Jede Regel hat genau eine Heimat-Notiz (Spalte „Details“); hier steht nur der Stand. Die Regeln je Account: [[Regelwerk Simulierbar]] (Account 1) und [[Regelwerk Account 2]] (Account 2). Trennung: [[Trennung der Accounts]]. PDF-Kurzfassung: `docs/regelwerk/`.

**Stand 02.11.2026, spätabends.**

## Neu seit 02.11. abends (Entscheidungen des Inhabers)
| Änderung | Wirkung |
|---|---|
| **Account 1 nur noch GELD** | Rubrik ALLTAG entfällt. |
| **Kein 30-Tage-Plan mehr** | Themen entstehen täglich neu: 10 Ideen, der Inhaber wählt 2 ([[Claude-Chat-Workflow]]). Pläne sind nur Archiv. |
| **Keine Sperrlisten mehr** (erstmal) | Themen anderer Kanäle (auch US-Kanäle) sind frei. **Bleibt:** keine 1:1-Kopie, gleiches Thema nur mit eigenem Skript und anderem Design. |
| **Länder frei** | Deutschland, weltweit, andere Länder, wie es zum Thema passt; Sprache Deutsch. |
| **Skripte aus Claude Chat / Ideen-Studio** | faktentreu, nichts erfinden, Diskussionsanreiz nur implizit, als Regie-Text für die Stimme geschrieben. |
| **Qualitätslatte und Dramaturgie** | Von Anfang an fangen, Spannung steigern, mehr Sequenzen/Licht/Zoom, nichts Übertriebenes. |
| **Lernschleife** | Täglich 20:00 Auswertung der Buffer-Zahlen; Vorschläge nur mit Begründung und Freigabe ([[Lernschleife und Insights]]). |
| **Fragen nur anklickbar** | Claude stellt Fragen als Auswahl mit Kommentarfeld, nie als Aufgabe, Text zu schreiben ([[Rolle und Kommunikation]]). |
| **Kleine Schritte** | Jeder Auftrag wird in nummerierte Teilaufgaben zerlegt, einzeln mit Beleg abgehakt und am Ende gegen den Auftrag abgeglichen; nichts wird übersprungen ([[Rolle und Kommunikation]]). |

## Arbeitsweise
| Regel | Details |
|---|---|
| Claude ist Content-Creator-Experte, liefert fertige Ergebnisse, kennzeichnet Fakt/Schätzung/Annahme, korrigiert Fehler offen | [[Rolle und Kommunikation]] |
| Fragen an den Inhaber **anklickbar** (Auswahl + eigenes Kommentarfeld), gebündelt, nie „schreib mir einen Text“ | [[Rolle und Kommunikation]] |
| **Kleine Schritte:** jeden Auftrag in nummerierte Aufgaben zerlegen, einzeln mit Beleg abhaken, am Ende Auftrag und Ergebnis abgleichen, nichts überspringen; gilt auch für Agenten (nummerierte Aufgaben, Rückmeldung je Punkt) | [[Rolle und Kommunikation]], [[Produktion Rhythmus und Modelle]] |
| Nichts ohne Auftrag anlegen, keine externen Einträge; gestoppte Agenten nur auf Auftrag neu starten | [[Arbeitsregeln und Sicherheit]] |
| Öffentliches Repo: keine Konkurrenzinhalte/Transkripte, keine Geheimnisse, keine Supabase-Adresse | [[Arbeitsregeln und Sicherheit]] |
| Bei jeder Regeländerung Regelwerk-PDF neu und dem Inhaber schicken; fertige Videos bleiben | [[Arbeitsregeln und Sicherheit]] |
| Verbesserungen aus der Lernschleife nur nach Freigabe des Inhabers, mit Begründung des Gedankengangs | [[Lernschleife und Insights]] |

## Produktion
| Regel | Details |
|---|---|
| 4 Videos/Tag (2 je Account) für den nächsten Tag, nur auf Startsignal; höchstens 2 Agenten gleichzeitig | [[Produktion Rhythmus und Modelle]] |
| Ablauf: 10 Ideen → Inhaber wählt 2 → makelloses Skript → Claude Code baut | [[Claude-Chat-Workflow]] |
| Modelle: Sonnet (`model: sonnet`) für Routine, Opus für neue Welten und Abnahme, Haiku für Texte | [[Produktion Rhythmus und Modelle]] |
| Nur Three.js und/oder Blender, keine KI-Video-Generatoren; 1080×1920, mind. 61 s | [[Produktion Rhythmus und Modelle]] |
| Rendern auf dem Windows-PC, Rückfall Cloud | [[Render-Dienst Windows-PC]] |
| Claude nimmt jedes Video selbst ab; bei „sieht billig aus“ Abnahme verweigern, Fehler zurück an den Agenten | [[Prüfung und Abnahme Simulierbar]], [[Prüfung und Abnahme Account 2]] |

## Inhalt
| Regel | Details |
|---|---|
| Aussagen legitim und belegbar, nichts erfinden; Quellen nur intern | [[Claude-Chat-Workflow]] |
| Keine künstlichen Cliffhanger, kein Kaufaufruf, Finanzen nur als Modellrechnung | [[Plattformregeln und Posting]] |
| Ausschlussthemen: Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik, NS-Kennzeichen, riskantes Nachahmen | [[Plattformregeln und Posting]] |
| Nie Logo, Kanalname oder Rubrik im Video | [[Trennung der Accounts]] |
| Keine 1:1-Kopie fremder Videos (CRP „Unoriginal“) | [[Arbeitsregeln und Sicherheit]] |

## Posten
| Regel | Details |
|---|---|
| Nur über Buffer, vollautomatisch ohne Freigabe; danach `--nachpruefen` | [[Plattformregeln und Posting]] |
| Zeiten: Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30 | [[Plattformregeln und Posting]] |
| Caption eine Zeile, ca. 150 Zeichen + 5 Hashtags, kein #fyp | [[Plattformregeln und Posting]] |
| Kein KI-Label (Ausnahme: realistisch wirkende KI-Inhalte) | [[Plattformregeln und Posting]] |
| Profil ohne E-Mail und Telefonnummer (CRP „Advertising“) | [[CRP Creator Rewards Program]] |

## Recherche
Nur öffentliche Seiten, keine internen TikTok-APIs, kein Umgehen von Bot-Schutz, keine Downloads fremder Videos. Referenzvideos des Inhabers werden ausgewertet (Bild, Ton, Zeitachse), im Hirn landen nur abstrahierte Muster ([[Recherche-Methode und Grenzen]]).

## Siehe auch
[[Regelwerk Simulierbar]] · [[Regelwerk Account 2]] · [[Entscheidungen Log]] · [[Index]]
