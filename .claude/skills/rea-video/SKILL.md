---
name: rea-video
description: REA für Videos („Reverse Engineer Anything“, nur Video). Zerlegt virale Kurzvideos (TikTok, Shorts, Reels mit Millionen Aufrufen) im kleinsten Detail – Hook, Skript, Spannungsaufbau, Design, Text im Bild, Schnitt und Übergänge, Bewegung, Stimme, Musik, Soundeffekte, Call to Action, Loop – misst sie mit ffmpeg, vergleicht sie mit schwächeren Videos und leitet daraus belegte Regeln für das Hirn ab, die Quelle des späteren Produktions-Skills. Greift, wenn der Inhaber Vorbild- oder Referenzvideos schickt oder sagt „analysiere/zerlege diese Videos“, „REA“, „was macht diese Videos erfolgreich“, „Regeln aus viralen Videos“, „Korpus erweitern“. Baut selbst keine Videos und übernimmt nie Sätze, Bilder oder Szenenideen fremder Videos.
---

# Skill: REA-Video (virale Videos zerlegen, Regeln ableiten)

**Zweck:** Aus vielen erfolgreichen Videos eines Formats herausfinden, *was* sie erfolgreich macht, belegt bis auf die Sekunde, und das als Regelwerk ins Hirn schreiben. Dieses Regelwerk ist die **einzige Quelle der Regeln** für den späteren Produktions-Skill. Gilt für beide Accounts; jedes Format bekommt seinen eigenen Korpus und sein eigenes Regelwerk ([[Trennung der Accounts]]).

**Herkunft:** übertragen von „Reverse Engineer Anything“ (REA, github.com/morluto/rea). REA zerlegt Programme ohne Quellcode; hier ist das „Programm“ ein Video und der „Quellcode“ die Summe aller Entscheidungen, die sein Macher getroffen hat.

## Grundsätze (aus REA übertragen, verbindlich)
1. **Erst Überblick, dann Detail.** Messung → Kontaktbögen → Hook- und Schnittbilder → Spektrum → Transkript → einzelne Sekunden. Nur nachbohren, wenn eine konkrete Rasterfrage offen ist.
2. **Jede Aussage mit Beleg:** Video-ID + Zeitstempel + Messwert oder Bild (z. B. „V07 · 0,0–1,8 s · Zahl im ersten Satz, Kontaktbogen hook_0-3s“).
3. **Gesehenes, Gefolgertes und Offenes trennen:** **F** = gemessen oder im Bild/Transkript belegt, **S** = gefolgert (Schätzung), **A** = Annahme, **offen** = nicht feststellbar. Nie so tun, als wäre eine Folgerung gemessen.
4. **Wiederverwenden statt wiederholen:** Was gemessen ist, wird nicht neu gemessen (`messung.json`); Befunde stehen in der Einzelanalyse und werden in der Synthese nur verdichtet.
5. **Am Ende die Checkliste prüfen:** Jede Rasterfrage ist beantwortet, teilweise beantwortet oder offen. Ein Korpus ist erst fertig, wenn Minimum und Sättigung erreicht sind.
6. **Beobachtung ist nicht Entscheidung:** Dieser Skill beschreibt, was wirkt. Wie wir es umsetzen, entscheidet der Produktions-Skill mit dem Inhaber.
7. **Nichts kopieren:** Regeln werden abstrahiert („Zahl im ersten Satz, Hook unter 2 s“), nie Sätze, Bilder, Figuren oder Szenenideen übernommen (CRP-Ausschluss „Unoriginal“).
8. **Skripte nur nach Aufbau und Art, nie nach Inhalt** (Inhaber 07.11.2026): Die Themen der Vorbilder sind oft nicht unsere Nische. Ausgewertet werden Struktur, Satzfunktionen, Rhythmus, Tempo, Rhetorik, Spannungsführung, Aufruf; das Thema steht höchstens als Ein-Wort-Kategorie zur Einordnung da und wird **nie zur Regel**. Themen dürfen den Inhaber inspirieren, sie werden aber nicht übernommen ([raster.md](raster.md) D).
9. **Für beide Accounts getrennt anwendbar** (Inhaber 07.11.2026): Jede Regel trägt „Gilt für: Account 1 · Account 2 · beide · keiner“ und ist in das Format des Accounts übersetzt (Account 1 `@simulierbar`: Geld-Duell mit Stimme Ben, Untertitel, Tafel; Account 2 `@stelldirvor.pov`: POV ohne Stimme, Titelfrage, Messwert-Anzeige, Atmo). Was im einen Format wirkt, gilt im anderen erst, wenn es dort belegt oder sinnvoll übertragbar ist ([synthese.md](synthese.md) §4). Ein Korpus je Account; eine übergreifende Auswertung nur für formatunabhängiges Handwerk.

## Wie viele Videos? (verbindlich)
Gezählt wird **je Format** (ein Korpus = ein Videoformat, z. B. „Geld-Duell mit Stimme“ oder „POV ohne Stimme“; Formate nie mischen).

| Stufe | virale Videos | Vergleichsvideos | Creator | Ergebnis |
|---|---|---|---|---|
| unter Minimum | < 12 | – | – | nur **Beobachtungen** (Status `entwurf`), keine Produktionsregeln |
| **Minimum** | **12** | **4** | ≥ 3, keiner > 1/3 | erste belastbare Regeln |
| **Ziel („perfekte Auswertung“)** | **20** | **6** | ≥ 4, keiner > 1/4 | vollständiges Regelwerk, sobald die Sättigung erreicht ist |
| Obergrenze | 30 | 8 | – | darüber kommen kaum neue Regeln dazu |

**Sättigung:** Bringen die letzten 3 analysierten viralen Videos kein neues Merkmal mit Endanteil ≥ 25 %, ist der Korpus gesättigt. Sonst je 3 Videos nachlegen bis höchstens 30. Begründung und Auswahlregeln: [korpus.md](korpus.md) §1.

## Ablauf (Zeit je Video: Schätzung)
0. **Korpus anlegen** ([korpus.md](korpus.md)): Arbeitsordner `C:\tiktok\rea-video\<korpus>\`, `korpus.csv` aus [vorlagen/korpus.csv](vorlagen/korpus.csv), Videos als MP4 nach `videos/` (V01.mp4 …). Der Inhaber liefert die Dateien; Links allein reichen nur für die Zahlen. (10 Min.)
1. **Messen:** `python .claude/skills/rea-video/scripts/messen.py C:\tiktok\rea-video\<korpus>` misst alle neuen Videos: Schnitte, Übergänge, Bewegung, Helligkeit, Farben, Lautheit, Stille, Effekt-Kandidaten, Anstiege, Takt, Transkript (mit Whisper-Modell), Spannungsindex; dazu Kontaktbögen, Hook-, Einstiegs-, Schnitt- und Loop-Bilder und Spektren ([messung.md](messung.md)). (2–3 Min. Rechenzeit)
2. **Einzelanalyse** je Video nach [raster.md](raster.md) mit [vorlagen/analyse.md](vorlagen/analyse.md): alle 13 Bereiche A–M, Spannungskurve, Erfolgshypothesen; dazu `merkmale.json` nach dem Merkmal-Katalog ([vorlagen/merkmale.json](vorlagen/merkmale.json)). Parallel erlaubt: höchstens 4 Agenten gleichzeitig, je Agent höchstens 5 Videos **desselben Accounts** (Kontextgröße: rund 12 Bilder je Video), Brief mit `raster.md`, den Vorlagen, den Vorgaben 8 und 9 und den Analyseordnern; die Hauptsitzung prüft Stichproben an den Bildern. (40–60 Min. je Video)
3. **Zwischenstand nach 6 Videos:** neue Merkmale in den Katalog aufnehmen und **in allen bisherigen Videos nachkodieren**, sonst verzerrt sich der Anteil ([raster.md](raster.md) §2).
4. **Synthese:** `python .claude/skills/rea-video/scripts/synthese.py C:\tiktok\rea-video\<korpus>` je Account → `synthese/matrix.md`, `regelkandidaten.md`, `kennzahlen.json`; dazu übergreifend `synthese.py <korpus1> <korpus2>` → `C:\tiktok\rea-video\_uebergreifend\synthese\` (nur formatunabhängiges Handwerk). Danach die Regelkarten in eigenen Worten ausformulieren, je Regel „Gilt für“ ([synthese.md](synthese.md)). (1–2 Std. je Korpus)
5. **Vorlage an den Inhaber:** Regelwerk-Entwurf kurz und anklickbar (Gesetze, Erfolgsfaktoren, Zielkorridore, Vermeiden, offene Punkte, falls nötig Hörprotokoll). **Erst nach Freigabe** wird eine Regel `aktuell`.
6. **Hirn:** freigegebene Regeln in `hirn/04-Recherche/REA <Format> Regelwerk.md` (Vorlage [[Vorlage REA-Regelwerk]]), Index und [[Entscheidungen Log]] nachziehen, `python tools/hirn_pruefen.py` ([hirn.md](hirn.md)).
7. **Abschluss-Checkliste** (unten).

## Pflichtlektüre
| Datei | Inhalt |
|---|---|
| [korpus.md](korpus.md) | Mindestzahl mit Begründung, Auswahl viral/Vergleich, Vielfalt, Ordner, `korpus.csv`, Beschaffung |
| [messung.md](messung.md) | Voraussetzungen, Whisper-Modell, Aufruf, jede Ausgabe erklärt, Schwellen, Kalibrierung, Grenzen |
| [raster.md](raster.md) | das Analyse-Raster A–M bis ins Detail und der Merkmal-Katalog für `merkmale.json` |
| [synthese.md](synthese.md) | Matrix lesen, Stärke, Unterscheider, Korridore, Sättigung, Regelkarten, Freigabe |
| [hirn.md](hirn.md) | was ins Hirn darf (öffentliches Repo), Notiz-Aufbau, Verlinkung, Prüfung |
| [vorlagen/](vorlagen/) | `korpus.csv`, `analyse.md`, `merkmale.json` (Hirn-Vorlage: `hirn/05-Vorlagen/Vorlage REA-Regelwerk.md`) |

## Ablage: was wohin gehört
| Was | Wo | Warum |
|---|---|---|
| Videos, Bilder, Transkripte, Spektren, Messungen, Einzelanalysen, Matrix | lokal `C:\tiktok\rea-video\<korpus>\` (außerhalb des Repos) | fremdes Material, das Repo ist öffentlich |
| Skill, Skripte, Vorlagen | `.claude/skills/rea-video/` | Methode, kein fremder Inhalt |
| Regelwerk je Format (abstrahiert, Video-IDs statt Links/Namen) | `hirn/04-Recherche/REA <Format> Regelwerk.md` | Quelle für den Produktions-Skill |
| Methode im Überblick | [[REA-Video Methode]] | Einstieg im Hirn |

## Übergabe an den Produktions-Skill
- Jede freigegebene Regel trägt eine feste ID (`REA-<kürzel>-R01` …), Stärke, Belegzahl und, bei Zahlen, einen Zielkorridor. Der Produktions-Skill verweist auf diese IDs statt Regeln neu zu formulieren.
- Ändert sich eine Regel (neuer REA-Lauf, Lernschleife, Entscheidung des Inhabers), wird sie im Regelwerk geändert und im Entscheidungen Log vermerkt; der Produktions-Skill zieht nach.
- Eigene Videos können später als zusätzliche Gruppe `eigen` in einen Korpus: Dann zeigt die Matrix, wo wir vom Regelwerk abweichen.

## Grenzen (ehrlich benennen, nicht überspielen)
- **Hören kann Claude nicht.** Stimme, Musik und Effekte kommen aus Messwerten, Spektren und Transkript. Die Effekt-Erkennung ist eine Vorauswahl (am eigenen Video: rund 3 von 4 Kandidaten echt, gut die Hälfte gefunden). Für eine endgültige Effektliste das Hörprotokoll des Inhabers nutzen ([raster.md](raster.md) J).
- **Keine Texterkennung:** Text im Bild liest Claude aus den Kontaktbögen und Einzelbildern.
- **Transkript** über Whisper (Laptop: Modell eingerichtet 07.11.2026; Wortfehlerrate rund 7 %, Wortzeiten im Median ±0,2 s; [messung.md](messung.md) §2). Sprechpausen sind nicht messbar, wenn Musik oder Teppich darunterliegt.
- **Fremde Kennzahlen** sind nur die öffentlichen (Aufrufe, Likes, Kommentare, Shares, Saves). Wiedergabezeit und Halte-Kurven fremder Videos sind nicht zugänglich; Halt wird über Struktur und Messwerte erschlossen (S).
- Korrelation ist keine Ursache: Eine Regel heißt „kommt in erfolgreichen Videos fast immer vor“, nicht „macht garantiert erfolgreich“.

## Abschluss-Checkliste je Korpus
- [ ] Minimum erreicht (≥ 12 viral, ≥ 4 Vergleich, ≥ 3 Creator, keiner > 1/3), sonst Status `entwurf`
- [ ] Sättigung geprüft (`matrix.md`), ggf. Videos nachgelegt
- [ ] jedes Video: `messung.json`, `analyse.md`, `merkmale.json`; alle Rasterbereiche A–M beantwortet oder als offen markiert
- [ ] Merkmal-Katalog in allen Videos gleich kodiert (nachkodiert nach Erweiterung)
- [ ] Regelkarten in eigenen Worten, mit Stärke, Belegen, Gegenbeispielen, Korridor; Vermeiden-Liste
- [ ] Freigabe des Inhabers eingeholt; Regelwerk im Hirn, Index, Entscheidungen Log, `hirn_pruefen.py` ohne Fehler
- [ ] nichts Fremdes im Repo (keine Bilder, Transkripte, Zitate über 5 Wörter, keine Links zu fremden Videos; im Hirn Video-IDs V01 … statt Einzelvideo-Beschreibungen)
