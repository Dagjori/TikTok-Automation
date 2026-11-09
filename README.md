# TikTok Automation · Kanäle „Simulierbar“ und „Stell dir vor“

Zentrale für den Aufbau und Betrieb gesichtsloser Simulations- und Gedankenexperiment-Videos (3D, Three.js/Blender) für TikTok. Die Produktion läuft weitgehend automatisiert mit Claude Code; gepostet wird vollautomatisch über Buffer.

- **`@simulierbar`** (Account 1): „Alltag durchgerechnet“, Schwerpunkt Geld, Deutsch, 65–80 s, Stimme Ben, 2 Videos pro Tag.
- **`@stelldirvor.pov`** (Account 2): „Was wäre, wenn …“-3D-POV im Format der Lunar-Referenzen, 80 s, keine Stimme, 2 Videos pro Tag.
- **Ziel:** je Account 10.000 Follower und Aufnahme ins Creator Rewards Program (CRP).

## Aufbau des Repos

| Pfad | Inhalt |
|---|---|
| [CLAUDE.md](CLAUDE.md) | **Das gesamte Projektwissen in einer Datei:** Rolle, Arbeitsregeln, Kanäle und Ziele, Produktion, Maßstab, Videoaufbau, Plattformregeln und Posten, Stimme, Pläne, Cockpit, Trend-Radar, Technik, aktueller Stand, Entscheidungen. Lädt in jeder Sitzung automatisch. |
| [.claude/skills/](.claude/skills/) | Skills in fester Reihenfolge, je Account strikt getrennt: `themen-skript` (Themen mit belegter Suchnachfrage, Ideen, Skript) → `stimme-elevenlabs` (nur Account 1: Textformat, Textprüfung, genau eine Aufnahme; das Video richtet sich nach der Stimme) → `video-produktion` (Bau, Render, Prüfung, Buffer). Dazu `rea-video` (Analyse viraler Vorbilder). Die Regeln stehen im Hirn (`hirn/`). |
| [pipeline/](pipeline/) | Render-Pipeline (Three.js, Headless-Chrome, ffmpeg), Qualitätsprüfung, Posting über Buffer, Render-Dienst für den Windows-PC; Bedienung in [pipeline/README.md](pipeline/README.md) |
| [data/](data/) | Pläne (`data/plan/`), Ideenlisten (`data/ideen/`), Konkurrenz-Monitor (`data/monitor/`), Trend-Kalender und -Log (`data/trends/`) |
| [tools/](tools/) | Hilfsskripte: Plan-PDFs, Regelwerk-PDF, Trend-Score, Konkurrenz-Monitor, Telegram, Sitzungssicherung |
| [marke/](marke/) | Logos und Profilbilder beider Accounts |
| [docs/](docs/) | nur noch: [Anleitung Render-PC](docs/18-render-pc.md) · `regelwerk/` (Regelwerk als 1-Seiten-PDF) · `cockpit/` (Quelle des Kanal-Cockpits) · `plan/` (Plan-PDFs, Stil-Vergleich) · `trends/` (Trend-Vorschläge) · `assets/` (Vorschaubilder) |

## So arbeiten wir
1. Neue Claude-Code-Sitzung mit diesem Repo starten. `CLAUDE.md` lädt automatisch, es muss nichts weiter gelesen werden.
2. Für ein Video lädt Claude zusätzlich den passenden Skill (`themen-skript`, `stimme-elevenlabs`, `video-produktion`) mit dem Teil des Accounts.
3. Während der Arbeit und am Ende jeder Sitzung hält Claude `CLAUDE.md` §11 (Stand) und §12 (Entscheidungen) aktuell, committet und pusht.
