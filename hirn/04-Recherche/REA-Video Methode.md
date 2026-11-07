---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-07
quelle: .claude/skills/rea-video/
tags: [konto/gemeinsam, rea, methode, videoanalyse]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# REA-Video: Methode

**REA-Video** zerlegt virale Kurzvideos (mehrere Millionen Aufrufe) im kleinsten Detail und leitet daraus belegte Regeln ab. Das Ergebnis je Format ist eine Notiz „REA <Format> Regelwerk“ hier in `04-Recherche`. **Sie ist die Quelle der Regeln für den späteren Produktions-Skill.** Die Arbeitsanweisung steht im Skill `.claude/skills/rea-video/` (bei Abweichung gilt der Skill).

Vorbild: „Reverse Engineer Anything“ (REA), übertragen von Programmen auf Videos: erst Überblick, dann Detail; jede Aussage mit Beleg; **F** gemessen, **S** gefolgert, **A** Annahme, offen; am Ende die Checkliste prüfen.

**Vorgaben des Inhabers (07.11.2026):**
- **Skripte nur nach Aufbau und Art, nie nach Inhalt:** Die Themen der Vorbilder sind oft nicht unsere Nische. Sie dürfen inspirieren, werden aber nie zur Regel; ausgewertet wird, wie ein Skript gebaut ist.
- **Beide Accounts getrennt anwendbar:** je Account ein Korpus und ein Regelwerk; jede Regel mit „Gilt für“ und übersetzt in das Format des Accounts ([[Trennung der Accounts]]). Übergreifend nur formatunabhängiges Handwerk.
- **Design und alles Sichtbare im Detail prüfen.**

## Wie viele Videos (je Format)
| Stufe | viral | Vergleich | Creator | gilt als |
|---|---|---|---|---|
| unter Minimum | < 12 | – | – | Beobachtung (`entwurf`) |
| **Minimum** | **12** | **4** | ≥ 3, keiner > 1/3 | erste belastbare Regeln |
| **Ziel** | **20** | **6** | ≥ 4, keiner > 1/4 | vollständiges Regelwerk, wenn gesättigt |
| Obergrenze | 30 | 8 | – | – |

- **Sättigung:** Die letzten 3 viralen Videos bringen kein neues Merkmal (Endanteil ≥ 25 %) → fertig, sonst je 3 nachlegen.
- **Warum 12:** Nach rund 12 Fällen sind etwa 90 % der wiederkehrenden Muster sichtbar (F, Guest u. a. 2006); 10 von 12 ergibt eine untere 95-%-Grenze von 55 %, 8 von 10 nur 49 % (F, gerechnet).
- **Warum Vergleichsvideos:** Nur so lässt sich trennen, was Erfolg macht (Erfolgsfaktor) und was bloß zum Format gehört (Grundformat).
- **Viral** heißt: ≥ 1 Mio Aufrufe, bevorzugt ≥ 3 Mio und Ausreißer (≥ 3 × Follower), ≤ 18 Monate alt, gleiches Format. **Vergleich:** gleiches Format, möglichst gleicher Creator, unter 10 % der viralen Aufrufe.

## Was analysiert wird (13 Bereiche)
A Steckbrief und Erfolg · B Struktur und Phasen · C Hook (0–3 s) und Halt (3–8 s) · D Skript und Sprache · E Spannung und Dramaturgie · F Bild und Design · G Text im Bild · H Schnitt und Übergänge · I Bewegung und Animation · J Ton (Stimme, Musik, Soundeffekte) · K Call to Action und Bindung · L Plattform · M Erfolgshypothesen. Gemessen wird mit ffmpeg (Schnitte, Bewegung, Farben, Lautheit, Effekt-Kandidaten, Spannungsindex, Transkript mit Whisper); Bild, Text und Wirkung beurteilt Claude an Kontaktbögen und Spektren.

## Ablauf
1. Korpus anlegen (lokal `C:\tiktok\rea-video\<korpus>\`, Videos vom Inhaber).
2. Messen (`messen.py`) → 3. Einzelanalyse je Video nach Raster → 4. Synthese (`synthese.py`): Anteile, Stärke, Unterscheider, Korridore, Sättigung.
5. Regelwerk-Entwurf dem Inhaber anklickbar vorlegen → 6. **nur freigegebene Regeln** ins Hirn, [[Entscheidungen Log]] nachziehen.

## Regelstärken
| Stärke | Anteil viral | Produktion |
|---|---|---|
| Gesetz | ≥ 80 % | Pflicht |
| Muster | 50–79 % | Standard |
| Variante | 25–49 % | Spielraum, abwechseln |
| Einzelfall | < 25 % | nicht übernehmen |
| **Erfolgsfaktor** | viral − Vergleich ≥ 30 Pp | höchste Priorität |
| **Vermeiden** | viral − Vergleich ≤ −30 Pp | Verbot |
Zahlen bekommen einen **Zielkorridor** (25.–75. Perzentil der viralen Videos).

## Ablage und Schutz
Videos, Bilder, Transkripte, Einzelanalysen bleiben **lokal** (fremdes Material, das Repo ist öffentlich). Ins Hirn kommen nur abstrahierte Regeln, Zahlen und Video-IDs (V01 …), keine Links, keine Zitate über 5 Wörter, keine Szenenbeschreibungen einzelner fremder Videos ([[Recherche-Methode und Grenzen]], [[Arbeitsregeln und Sicherheit]]). Kein Kopieren: Regeln beschreiben Muster, nie Sätze oder Szenen (CRP „Unoriginal“, [[CRP Creator Rewards Program]]).

## Grenzen
Claude kann nicht hören: Stimme, Musik und Effekte kommen aus Messung und Spektrum (Effekt-Vorauswahl am eigenen Video: rund 3 von 4 Kandidaten echt, gut die Hälfte gefunden); für Endgültiges gibt es ein kurzes Hörprotokoll für den Inhaber. Das Transkript kommt von Whisper (Modell auf dem Laptop seit 07.11.2026; am eigenen Video 150 von 151 Wörtern, Wortfehlerrate 6,6 %, Wortzeiten im Median ±0,2 s, **F**). Sprechpausen unter einem Klangteppich sind nicht messbar. Halte-Kurven fremder Videos sind nicht öffentlich. Eine Regel heißt „kommt in erfolgreichen Videos fast immer vor“, nicht „garantiert Erfolg“.

## Korpora
| Korpus | Format | Konto | viral/Vergleich | Stand | Regelwerk |
|---|---|---|---|---|---|
| simulierbar | Vorbilder für Account 1 | simulierbar | 6/3 (V12 Grenzfall) | 07.11.: analysiert, Synthese fertig; unter dem Minimum → vorläufig | [[REA Simulierbar Regelwerk]] (Entwurf) |
| stelldirvor | Vorbilder für Account 2 | stelldirvor | 6/1 | 07.11.: analysiert, Synthese fertig; unter dem Minimum → vorläufig | [[REA stelldirvor Regelwerk]] (Entwurf) |
| übergreifend | beide, nur formatunabhängiges Handwerk | gemeinsam | 12/4 | Minimum und Sättigung erreicht | [[REA Übergreifend]] (Entwurf) |
Erfolgsmaß beider Korpora: Likes (Aufrufe nicht notiert), Vergleich = unter 10 % des Like-Medians der starken Videos.

## Siehe auch
[[Vorlage REA-Regelwerk]] · [[Lernschleife und Insights]] · [[Trennung der Accounts]] · [[Index]]
