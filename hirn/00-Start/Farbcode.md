---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: tools/hirn_farben.py
tags: [konto/gemeinsam, farbcode, obsidian]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Farbcode

Jede Kategorie hat eine feste Farbe. Du siehst sie im **Graph** (Knoten), in der **Dateiliste** (Ordner und Notizen), bei den **Überschriften** (farbiger Balken und Titel) und bei den **Tags** (farbige Chips). So erkennst du auf einen Blick, was zu welchem Account gehört.

| Farbe | Wert | Kategorie |
|---|---|---|
| Rot | `#E5534B` | Regelwerk-Notizen |
| Türkis | `#1FC7C7` | Claude Chat: Workflow und Befehle |
| Pink | `#E85D9A` | Lernschleife und Insights |
| Gold | `#E3B341` | 00-Start: Index, Anleitung, Farbcode |
| Blau | `#4C8DF6` | 01-Projekt: gemeinsam für beide Accounts |
| Grün | `#2FBF71` | 02-Simulierbar: Account 1 @simulierbar (Geld) |
| Violett | `#A066F0` | 03-stelldirvor-pov: Account 2 @stelldirvor.pov |
| Orange | `#F2883A` | 04-Recherche: Marktbeobachtung, Auswertungen |
| Grau | `#8B949E` | 05-Vorlagen |

## Wichtigste Merkregel
- **Grün = Account 1 (Simulierbar, Geld).**
- **Violett = Account 2 (stelldirvor.pov).**
- **Blau = gemeinsam für beide.**
- **Rot = Regelwerk**, Türkis = Claude-Chat-Befehle, Pink = Lernschleife.

## Technik
- Der Graph nutzt Farbgruppen (`.obsidian/graph.json`): die erste passende Gruppe gewinnt, deshalb stehen Regelwerk, Chat und Lernen vor den Ordnerfarben. Im Graph-Fenster unter „Gruppen“ kannst du Farben von Hand ändern.
- Dateiliste und Überschriften färbt das CSS-Snippet `tiktok-farben` (Einstellungen → Design → CSS-Snippets, muss an sein). Die Überschriftenfarbe kommt aus `cssclasses` im Notizkopf (`konto-simulierbar`, `konto-stelldirvor`, `konto-gemeinsam`).
- Neue Notiz im richtigen Ordner anlegen und im Kopf `konto:` setzen. Danach `python3 tools/hirn_farben.py` (Claude erledigt das), dann stimmt die Farbe.
- Farbwerte ändern: in `tools/hirn_farben.py` (Tabelle `FARBEN`), danach das Skript laufen lassen.

## Siehe auch
[[Wie dieses Hirn funktioniert]] · [[Index]]
