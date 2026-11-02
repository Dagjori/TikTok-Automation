---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md
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
| `00-Start` | Index, Trennregeln, diese Anleitung | beide |
| `01-Projekt` | Rolle, Regeln, Plattform, Posting, Produktion, Render-PC, Cockpit, Radar, Technik, Stand, Entscheidungen | beide (gemeinsam) |
| `02-Simulierbar` | alles zu Account 1 `@simulierbar` | nur Account 1 |
| `03-stelldirvor-pov` | alles zu Account 2 `@stelldirvor.pov` | nur Account 2 |
| `04-Recherche` | Marktbeobachtung, Trendanalysen, Methode | je Notiz (`konto` im Kopf) |
| `05-Vorlagen` | Vorlagen für neue Notizen | – |

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
- Der Vault auf dem Desktop ist eine **Kopie** zum Lesen und Ausbauen. Geänderte Notizen am Desktop kommen per Hand oder über eine lokale Claude-Sitzung zurück ins Repo.
- Die operativen Anweisungen für die Videoproduktion bleiben in `.claude/skills/` (`simulierbar-video`, `stelldirvor-video`); das Hirn erklärt und verbindet sie. Bei Abweichung gilt die Skill-Datei; dann Notiz und Skill angleichen.

## Pflege
1. Jede Regeländerung oder Entscheidung des Inhabers: zuerst in die Heimat-Notiz, dann in [[Entscheidungen Log]] (eine Zeile) und, wenn sie Videos betrifft, in den Skill.
2. [[Stand und nächste Schritte]] am Ende jeder Arbeitseinheit aktualisieren.
3. Neue Recherche: eigene Notiz in `04-Recherche`, im Index verlinken.
4. Veraltetes nicht löschen, sondern `status: veraltet` setzen und auf den Nachfolger verlinken.
