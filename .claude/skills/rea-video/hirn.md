# Ins Hirn schreiben

## 1. Wohin
| Notiz | Ordner | `konto` | Inhalt |
|---|---|---|---|
| `REA <Format> Regelwerk` je Account (z. B. „REA Simulierbar Regelwerk“, „REA stelldirvor Regelwerk“) | `hirn/04-Recherche/` | `simulierbar` bzw. `stelldirvor` | freigegebene Regeln dieses Accounts, Korridore, Aufbau-Schablone, Vermeiden, offene Punkte |
| `REA Übergreifend` | `hirn/04-Recherche/` | `gemeinsam` | formatunabhängiges Handwerk aus beiden Korpora, jede Regel mit „Gilt für“ und Übersetzung je Account |
| [[REA-Video Methode]] | `hirn/04-Recherche/` | `gemeinsam` | Methode, Mindestzahlen, Stand aller Korpora (Tabelle) |
| Vorlage | `hirn/05-Vorlagen/Vorlage REA-Regelwerk.md` | – | Gerüst für neue Regelwerke |

Neue Regelwerk-Notiz: aus der Vorlage anlegen, im [[Index]] unter „Recherche“ und in [[REA-Video Methode]] (Tabelle „Korpora“) verlinken. Kürzel je Korpus festlegen (z. B. `GD` für Geld-Duell, `POV`), Regel-IDs `REA-<kürzel>-R01` … nie neu vergeben, entfallene Regeln bleiben mit Status „entfallen“ stehen.

## 2. Was hinein darf (das Repo ist öffentlich)
| erlaubt | verboten |
|---|---|
| abstrahierte Regeln in eigenen Worten, Zahlen, Korridore, Anteile, Video-IDs (V01 …) | Videos, Standbilder, Spektren, Transkripte |
| Anzahl der Creator, Aufrufe-Mediane | Links zu fremden Videos, Beschreibungen einzelner fremder Videos Szene für Szene |
| Zitate bis 5 Wörter, wenn für eine Regel nötig | längere Zitate, Skriptsätze, Sätze aus Untertiteln |
| Kennzeichnung **F/S/A** je Aussage | Schlüssel, Adressen, E-Mails ([[Arbeitsregeln und Sicherheit]]) |

## 3. Notizkopf (Pflicht, wie jede Hirn-Notiz)
```
---
typ: regel            (Regelwerk) bzw. anleitung (Methode)
konto: simulierbar | stelldirvor | gemeinsam
status: entwurf       (bis zur Freigabe; danach aktuell)
datum: JJJJ-MM-TT
quelle: .claude/skills/rea-video/ · Korpus <name> (lokal), Synthese vom JJJJ-MM-TT
tags: [konto/<konto>, rea, regelwerk]
cssclasses: [konto-<konto>, typ-regel]
---
```
`konto` nie mischen: Ein Regelwerk gehört zu genau einem Format und damit zu höchstens einem Account ([[Trennung der Accounts]]).

## 4. Nach jedem Eintrag
1. [[Entscheidungen Log]]: eine Zeile unter dem Datum („REA <Format>: N Regeln freigegeben, Korpus 20/6“).
2. [[Stand und nächste Schritte]] aktualisieren.
3. `python tools/hirn_pruefen.py` (Wikilinks, Kopf, Konto-Trennung, Geheimnisse) muss ohne Fehler laufen.
4. Master ist `hirn/` im Repo; der Obsidian-Vault auf dem Desktop ist eine Kopie ([[Wie dieses Hirn funktioniert]]).
5. Commit und Push nur nach Freigabe des Inhabers.
