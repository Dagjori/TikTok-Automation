---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: CLAUDE.md, Entscheidungen des Inhabers bis 09.11.2026 (Entscheidungen Log)
tags: [konto/gemeinsam, regelwerk, regeln]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Regelwerk (gemeinsam, beide Accounts)

Die Kurzfassung aller Regeln, die für **beide** Accounts gelten. Jede Regel hat genau eine Heimat-Notiz (Spalte „Details“); hier steht nur der Stand. Die Regeln je Account: [[Regelwerk Simulierbar]] (Account 1) und [[Regelwerk Account 2]] (Account 2). Trennung: [[Trennung der Accounts]]. PDF-Kurzfassung: `docs/regelwerk/`.

**Stand 09.11.2026.** Wie sich die Regeln entwickelt haben, steht im [[Entscheidungen Log]].

## Arbeitsweise
| Regel | Details |
|---|---|
| Claude ist Content-Creator-Experte, liefert fertige Ergebnisse, kennzeichnet Fakt/Schätzung/Annahme, korrigiert Fehler offen | [[Rolle und Kommunikation]] |
| Fragen an den Inhaber **anklickbar** (Auswahl + eigenes Kommentarfeld), gebündelt, nie „schreib mir einen Text“ | [[Rolle und Kommunikation]] |
| **Kleine Schritte:** jeden Auftrag in nummerierte Aufgaben zerlegen, einzeln mit Beleg abhaken, am Ende Auftrag und Ergebnis abgleichen; gilt auch für Agenten | [[Rolle und Kommunikation]], [[Produktion Rhythmus und Modelle]] |
| Nichts ohne Auftrag anlegen, keine externen Einträge; gestoppte Agenten nur auf Auftrag neu starten | [[Arbeitsregeln und Sicherheit]] |
| Öffentliches Repo: keine Konkurrenzinhalte/Transkripte, keine Geheimnisse, keine Supabase-Adresse | [[Arbeitsregeln und Sicherheit]] |
| Bei jeder Regeländerung Regelwerk-PDF neu und dem Inhaber schicken; fertige Videos bleiben | [[Arbeitsregeln und Sicherheit]] |
| **Das Hirn ist die Regelquelle**; die Skills führen Ablauf und Ausgabeformat. Bei Widerspruch gilt die jüngste Entscheidung des Inhabers; Widersprüche werden gemeldet, nie still aufgelöst | [[Wie dieses Hirn funktioniert]], [[Pipeline und Skills]] |

## Kette und Produktion
| Regel | Details |
|---|---|
| **Drei Skills in fester Reihenfolge** (seit 09.11.): `themen-skript` → `stimme-elevenlabs` (nur Account 1) → `video-produktion`. `rea-video` liefert Regeln aus Vorbildern, die Lernschleife schließt den Kreis | [[Pipeline und Skills]] |
| Der Inhaber klickt zweimal: **Wahl der Ideen** und **Freigabe des Skripts**; die Cockpit-Automatik erledigt den Rest | [[Cockpit]], [[Claude-Chat-Workflow]] |
| 4 Videos/Tag (2 je Account) für den nächsten Tag; höchstens 2 Agenten gleichzeitig; zuerst beide 12:30-Videos bis Buffer, dann die 19:30-Videos | [[Produktion Rhythmus und Modelle]] |
| **Modelle** (feste Regel seit 08.11.): Videos baut Sonnet 5.5 von der Steuerung bis zur Abnahme; Opus 5.5 nur für einen Neubau von Grund auf | [[Produktion Rhythmus und Modelle]] |
| **Technik** (seit 09.11.): three.js ist der Kern; Blender ohne Oberfläche für 1–2 realistische Schlüsselszenen je Video; Remotion nur als Probelauf. Keine KI-Bild-, Video- oder Stimmen-Generatoren außer der freigegebenen Stimme von Account 1. 1080×1920, mindestens 61 s | [[Technik und Umgebung]], [[Produktion Rhythmus und Modelle]] |
| Rendern auf dem Windows-PC, Rückfall Cloud | [[Render-Dienst Windows-PC]] |
| Jedes Video wird abgenommen; bei „sieht billig aus“ Abnahme verweigern und nachbessern | [[Prüfung und Abnahme Simulierbar]], [[Prüfung und Abnahme Account 2]] |

## Themen und Inhalt
| Regel | Details |
|---|---|
| Kein 30-Tage-Plan; Themen entstehen täglich neu: 10 Ideen, der Inhaber wählt | [[Claude-Chat-Workflow]] |
| **Nachfrage und Winkel sind Pflicht** (seit 09.11.): jedes Thema nachweislich gesucht, die Frage neu | [[Originalität und Themenfindung]] |
| **Originalität:** je Idee eine Websuche; kein Thema, zu dem es auf Deutsch schon ein Video mit der gleichen Frage gibt. Je Account eine Liste „abgenutzt“ statt der alten Sperrlisten | [[Themenfindung Simulierbar]], [[Themenfindung stelldirvor]] |
| Keine 1:1-Kopie fremder Videos (CRP „Unoriginal“); gleiches Thema nur mit eigenem Skript und anderem Design | [[Arbeitsregeln und Sicherheit]] |
| Aussagen legitim und belegbar, nichts erfinden; Quellen nur intern | [[Claude-Chat-Workflow]] |
| Keine künstlichen Cliffhanger, kein Kaufaufruf, Finanzen nur als Modellrechnung | [[Plattformregeln und Posting]] |
| Ausschlussthemen: Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik, NS-Kennzeichen, riskantes Nachahmen | [[Plattformregeln und Posting]] |
| Nie Logo, Kanalname oder Rubrik im Video | [[Trennung der Accounts]] |
| **Serien:** Ein Treffer (ab 3× Median) läuft als nummerierte Serie weiter, jeder Teil mit eigener Frage und Auflösung | [[Serien und Treffer-Folgen]] |

## Stimme (nur Account 1; Account 2 ist stumm)
| Regel | Details |
|---|---|
| **Genau eine Aufnahme je Skript** (seit 08.11.); eine zweite nur bei hörbarem Fehler der Stimme, einmal | [[Stimme ElevenLabs Simulierbar]] |
| **Keine Regeln zum Sprechtempo** (seit 09.11.): Das Video folgt der fertigen Stimme; Wortzahl 150–190 ist nur ein grober Richtwert; Mindestlänge 61 s bleibt | [[Stimme ElevenLabs Simulierbar]] |

## Lernen und Regeln aus Vorbildern
| Regel | Details |
|---|---|
| **REA:** Virale Vorbilder werden mit dem Skill `rea-video` zerlegt; daraus abgeleitete Regeln gelten erst nach Freigabe des Inhabers (Regelwerke freigegeben am 07.11.) | [[REA-Video Methode]], [[REA Übergreifend]] |
| **Lernschleife** täglich 19:52: Auswertung der eigenen Zahlen; Vorschläge nur mit Begründung und Freigabe; Zielgröße Follows je Video | [[Lernschleife und Insights]] |
| Profil, Pins, Cover, Antwort-Videos und Stitch | [[Profil und Follow-Umwandlung]], [[Kommentare Antwort-Videos und Stitch]] |

## Posten
| Regel | Details |
|---|---|
| Nur über Buffer, vollautomatisch ohne weitere Freigabe; danach `--nachpruefen` | [[Plattformregeln und Posting]] |
| Zeiten: Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30 | [[Plattformregeln und Posting]] |
| Caption eine Zeile, Suchbegriff vorn, ca. 150 Zeichen + 5 Hashtags, kein #fyp | [[Plattformregeln und Posting]] |
| Profil ohne E-Mail und Telefonnummer (CRP „Advertising“) | [[CRP Creator Rewards Program]] |

## Recherche
Nur öffentliche Seiten, keine internen TikTok-APIs, kein Umgehen von Bot-Schutz, keine Downloads fremder Videos. Referenzvideos des Inhabers werden ausgewertet (Bild, Ton, Zeitachse), im Hirn landen nur abstrahierte Muster ([[Recherche-Methode und Grenzen]]).

## Siehe auch
[[Regelwerk Simulierbar]] · [[Regelwerk Account 2]] · [[Pipeline und Skills]] · [[Entscheidungen Log]] · [[Index]]
