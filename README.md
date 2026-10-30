# TikTok Automation

Zentrale für den Aufbau und Betrieb gesichtsloser KI-Simulationsvideos (3D bzw. Daten-Animation, Deutsch) für TikTok und YouTube Shorts. Die Produktion läuft weitgehend automatisiert mit Claude Code.

## Ziel
- TikTok-Account (aktuell ca. 3k Follower) auf **10.000 Follower** bringen und über das **Creator Rewards Program** monetarisieren.
- Dieselben Videos als **YouTube Shorts** nutzen.
- Produktion so automatisieren, dass der laufende Aufwand bei ca. 2–3 Stunden pro Woche liegt.

## Aufbau des Repos

| Pfad | Inhalt |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Arbeitsregeln für Claude: Kommunikation, Plattformregeln, Modellwahl |
| [STATUS.md](STATUS.md) | Aktueller Stand, nächste Schritte, offene Punkte |
| [tools/](tools/) | Hilfsskripte, z. B. Auswertung der Ideenlisten |
| [ENTSCHEIDUNGEN.md](ENTSCHEIDUNGEN.md) | Getroffene Entscheidungen mit Datum und Begründung |
| [docs/00-projektuebersicht.md](docs/00-projektuebersicht.md) | Kurzfazit, Einnahmen-Szenarien, YouTube, Technik, Recht & Steuern |
| [docs/01-marktanalyse.md](docs/01-marktanalyse.md) | Analyse der 6 Ausgangsvideos und von 26 Vergleichskanälen |
| [docs/02-account-strategie.md](docs/02-account-strategie.md) | Weg zu 10k, Regeln des Creator Rewards Program, Umgang mit den Shop-Videos |
| [docs/03-nischen.md](docs/03-nischen.md) | 8 bewertete Nischen plus Ranking |
| [docs/04-claude-kapazitaet.md](docs/04-claude-kapazitaet.md) | Videos pro Tag im Claude-Max-Abo, Modellwahl, Kosten |
| [docs/05-startnische.md](docs/05-startnische.md) | Startnische „Der Testlauf – Alltag simuliert“: Belege, Profil, Video-Bauplan, 30 Themen, Empfehlung zum zweiten Account |
| [docs/06-nischen-ranking.md](docs/06-nischen-ranking.md) | Ranking von 10 Nischen nach Themenvorrat, Nachschub, Beleg, Wettbewerb, Risiko, Aufwand |
| [data/](data/) | Datenstände der Kanal- und Videoanalyse; `data/ideen/`: je 150 Video-Ideen pro Nische (CSV) |

## So arbeiten wir
1. Neue Claude-Code-Sitzung mit diesem Repo starten.
2. Claude liest `CLAUDE.md` und `STATUS.md` und weiß damit, wo wir stehen.
3. Am Ende jeder Sitzung werden `STATUS.md` und, falls nötig, `ENTSCHEIDUNGEN.md` aktualisiert, committet und gepusht.
