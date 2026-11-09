---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: CLAUDE.md, Entscheidung des Inhabers 09.11.2026 (Abteile je Account)
tags: [konto/gemeinsam, hirn, anleitung]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Wie dieses Hirn funktioniert

Das Hirn ist der Obsidian-Vault „TikTok Automation“: alles Wissen der zwei TikTok-Kanäle, geordnet in Notizen mit Wikilinks. Einstieg: [[Index]]. Die beiden Accounts sind strikt getrennt: [[Trennung der Accounts]].

## Farben
Jede Kategorie hat eine feste Farbe (Graph, Dateiliste, Überschriften, Tags). Legende: [[Farbcode]]. Neue Notiz im richtigen Ordner anlegen, dann stimmt die Farbe automatisch.

## Ordner
| Ordner | Inhalt | Gilt für |
|---|---|---|
| `00-Start` | Index, Trennregeln, diese Anleitung, Farbcode | beide |
| `01-Projekt` | Rolle, Regeln, Pipeline und Skills, Plattform, Posting, Produktion, Render-PC, Cockpit, Radar, Technik, Stand, Entscheidungen | beide (gemeinsam) |
| `02-Simulierbar` | alles zu Account 1 `@simulierbar`, in Abteilen | nur Account 1 |
| `03-stelldirvor-pov` | alles zu Account 2 `@stelldirvor.pov`, in Abteilen | nur Account 2 |
| `04-Recherche` | Marktbeobachtung, REA-Regelwerke, Trendanalysen, Insights, Methode | je Notiz (`konto` im Kopf) |
| `05-Vorlagen` | Vorlagen für neue Notizen | – |

## Abteile je Account (seit 09.11.2026)
Die Abteile folgen der Kette der Skills ([[Pipeline und Skills]]). Im Ordner des Accounts selbst liegen nur der Überblick und das Regelwerk (bei Account 2 zusätzlich das Format).

| Abteil | Inhalt | Skill |
|---|---|---|
| `1-Skripterstellung` | Themenfindung, Skriptaufbau, bei Simulierbar Finanzregeln und Formulierungen, Auftragstexte | `themen-skript` |
| `2-Stimme` | nur Simulierbar: Textformat, Einstellungen, eine Aufnahme. Account 2 ist stumm und hat dieses Abteil nicht | `stimme-elevenlabs` |
| `3-Produktion` | Videoaufbau, Stile, Licht, Design, Ton, Technik, Prüfung | `video-produktion` |
| `9-Archiv` | abgelöste Stände (alte Pläne, Sperrlisten, Messgrundlage); nie maßgeblich | – |

Wikilinks verweisen auf den Namen der Notiz, nicht auf den Pfad. Eine Notiz kann deshalb das Abteil wechseln, ohne dass Verweise brechen. Wird eine Notiz umbenannt, steht der alte Name als `aliases` im Kopf.

## Wo Regeln stehen und wo Abläufe
| Ort | Enthält | Beispiel |
|---|---|---|
| **Hirn** (`hirn/`) | die **Regeln**: was gilt, warum, seit wann | „Genau eine Aufnahme je Skript“ |
| **Skills** (`.claude/skills/<name>/`) | den **Ablauf** Schritt für Schritt mit Befehlen und das **Ausgabeformat** | Reihenfolge der Prüfschritte, Felder der Ideen-Karte |
| **Entscheidungen Log** | jede Entscheidung des Inhabers mit Datum | „09.11.: Sprechtempo gestrichen“ |

Ein Skill ändert nie eine Regel. Bei Widerspruch gilt die jüngste Entscheidung im [[Entscheidungen Log]]; Widersprüche werden gemeldet, nicht still aufgelöst.

## Konventionen (verbindlich)
- **Sprache:** Deutsch, du-Form, direkt, Tabellen statt langer Fließtext.
- **Eine Notiz pro Thema.** Dateiname = Titel der Notiz, mit Leerzeichen und Umlauten; Verweise als `[[Titel]]`.
- **Kopf (YAML) in jeder Notiz:**
  - `typ`: wissen · regel · entscheidung · recherche · plan · anleitung · index
  - `konto`: gemeinsam · simulierbar · stelldirvor
  - `status`: aktuell · entwurf · veraltet
  - `datum`: JJJJ-MM-TT (Stand der Notiz)
  - `quelle`: Pfad der Originaldatei im Repo, aus der die Notiz stammt
  - `tags`: immer `konto/<konto>` plus Themen-Tags
- **Kennzeichnung:** **F** = belegter Fakt (mit Quelle), **S** = Schätzung, **A** = Annahme.
- **Nichts doppelt pflegen:** Jede Regel hat genau eine Heimat-Notiz; andere Notizen verlinken darauf.
- **Konto-Tag nie mischen:** Eine Notiz gehört zu genau einem Konto oder ist `gemeinsam`.

## Was nie hinein darf (das Repo ist öffentlich)
Keine Schlüssel, Passwörter, Supabase-Adresse oder E-Mail-Adressen. Keine Inhalte der Konkurrenz (Originale, Transkripte, Standbilder), keine Gesprächsverläufe. Nur eigene Auswertungen, abstrahierte Muster und Zahlen.

## Wo das Original liegt und wie es synchron bleibt
- **Master** ist der Ordner `hirn/` im Repo (GitHub Dagjori/TikTok-Automation). Cloud-Sitzungen sehen nur das Repo, nicht den Desktop.
- Der Vault auf dem Desktop ist eine **Kopie** zum Lesen und Ausbauen. **Seit 07.11.2026 direkt abgeglichen, kein ZIP mehr:** Jede Hirn-Änderung von Claude landet sofort an der richtigen Stelle im Desktop-Hirn (`tools/hirn_abgleich.py`, läuft mit jeder `hirn_pruefen.py`-Prüfung). Notizen, die der Inhaber am Desktop ändert, werden nie überschrieben; ins Repo kommen sie nur auf seinen Wunsch (`hirn_abgleich.py --uebernehmen "<pfad>"`), weil das Repo öffentlich ist. Ersetzte Fassungen liegen im Obsidian-Papierkorb `.trash/`.
- **Seit 07.11.2026 ist das Hirn die Regelquelle.** Die Skills in `.claude/skills/` steuern nur Abläufe und lesen die Regeln hier. Seit 09.11.2026 sind es drei Skills in fester Reihenfolge (`themen-skript` → `stimme-elevenlabs` → `video-produktion`), dazu `rea-video`, der virale Videos zerlegt und Regel-Entwürfe nach `04-Recherche` schreibt ([[REA-Video Methode]]). Regeln ändern sich nur nach Freigabe des Inhabers, zuerst in der Heimat-Notiz.

## Pflege
1. Jede Regeländerung oder Entscheidung des Inhabers: zuerst in die Heimat-Notiz, dann in [[Entscheidungen Log]] (eine Zeile) und, wenn sie Videos betrifft, in den Skill.
2. [[Stand und nächste Schritte]] am Ende jeder Arbeitseinheit aktualisieren.
3. Neue Recherche: eigene Notiz in `04-Recherche`, im Index verlinken. Neue Notiz eines Accounts: ins passende Abteil.
4. Veraltetes nicht löschen, sondern `status: veraltet` setzen und auf den Nachfolger verlinken.
