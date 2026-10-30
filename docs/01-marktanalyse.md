# KI-Simulationsvideos – Marktanalyse

Teil von [Projektübersicht](00-projektuebersicht.md). Verwandt: [Claude-Kapazität](04-claude-kapazitaet.md), [Account-Strategie](02-account-strategie.md), [Nischen](03-nischen.md).

> Datenstand: 29.10.2026, ca. 21 Uhr (UTC). Alle Zahlen stammen von den öffentlichen TikTok-Video- und Profilseiten (Server-HTML) und sind **belegte Fakten zum Abrufzeitpunkt**. TikTok rundet Views ab 100k (z. B. 2,1 Mio.). Abgeleitete Kennzahlen (Raten, Views pro Tag) sind **eigene Berechnungen**.

## Das Format in einem Satz

Gesichtslose, 70–120 Sekunden lange **3D- bzw. Daten-Animationen** auf Deutsch, die eine Alltagsfrage als **Simulation, Duell oder Gedankenexperiment** durchspielen, mit KI-Stimme, Untertiteln und einer Auflösung am Ende („Mieten oder kaufen – 30 Jahre durchgerechnet“, „Rennen oder gehen im Regen“, „Zigarette gegen Vape – 5 Runden“).

## Die 6 Ausgangsvideos

| Kanal | Video (Thema) | Länge | Views | Likes | Komm. | Shares | Saves | Engagement | Views/Tag | Follower | Videos | Kanal angelegt* |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| @kurzsimuliert | Rennen oder gehen im Regen | 72 s | 2,1 Mio. | 71.700 | 244 | 7.537 | 5.147 | 4,0 % | 146.535 | 12.925 | 10 | 13.12.2025 |
| @retrodreamspace („visou – Wissen, visualisiert“) | Zigarette vs. Vape, 5 Runden | 81 s | 2,2 Mio. | 102.400 | 1.025 | 43.400 | 17.873 | 7,5 % | 443.075 | 40.655 | 117 | 19.04.2024 |
| @mal.angenommen | Wie gibt man so viel Geld aus? | 72 s | 807.900 | 31.300 | 1.995 | 2.507 | 3.044 | 4,8 % | 47.494 | 1.435 | 17 | 08.10.2026 |
| @kontostand.vs | Mieten oder kaufen, 30 Jahre | 92 s | 503.800 | 8.750 | 490 | 1.776 | 2.623 | 2,7 % | 167.391 | 418 | 3 | 26.10.2026 |
| @wissentogo_de | Leasen, finanzieren oder bar | 117 s | 298.400 | 6.452 | 323 | 1.890 | 3.885 | 4,2 % | 154.118 | 640 | 11 | 24.10.2026 |
| @unnoetig_tiefgruendig | Steckdose in Zeitlupe | 87 s | 130.700 | 4.026 | 78 | 239 | 734 | 3,9 % | 96.008 | 483 | 33 | 11.10.2026 |

*„Kanal angelegt“ = Zeitstempel aus dem Profil. @retrodreamspace ist ein älterer Kanal. Der Handle passt nicht zum heutigen Namen „visou“, vermutlich wurde er umbenannt bzw. umgestellt (Annahme). Wissensinhalte gibt es dort mindestens seit Oktober 2025 („So klingt Deutsch für Menschen, die kein Deutsch sprechen“, 60 s, 5,0 Mio. Views).

**Summe:** 6,04 Mio. Views, Ø 1,0 Mio. pro Video, Median-Engagement 4,2 %.

### Was die Zahlen zeigen
- **Neue Accounts gehen sofort viral.** @kontostand.vs war beim Abruf 3 Tage alt und hatte mit dem 1. bzw. 2. Video 504k Views. @wissentogo_de: 5 Tage alt, 298k Views. Das deckt sich mit TikToks eigener Aussage, dass Followerzahl kein direkter Ranking-Faktor ist (Quelle in [Account-Strategie](02-account-strategie.md)).
- **Engpass ist die Follower-Umwandlung, nicht die Reichweite.** @mal.angenommen: 808k Views, aber nur 1.435 Follower. @kontostand.vs: 504k Views, 418 Follower. Eigene Schätzung: Diese Kanäle machen **ca. 0,4–4 Follower pro 1.000 Views**. Für 10.000 Follower braucht man damit grob 2,5–25 Mio. Views.
- **Shares sind der Treiber.** @retrodreamspace hat eine Share-Rate von 2,0 % (43.400 Shares). Das ist das Video mit den meisten Views pro Tag. „Duell/Runden“-Format plus Gesundheitsthema, über das man streitet.
- **Länge:** Alle Videos liegen bei 72–117 s, also bewusst über der 60-Sekunden-Grenze des Creator Rewards Program.
- **KI-Kennzeichnung:** 2 von 6 Videos tragen das TikTok-KI-Label (@retrodreamspace, @wissentogo_de), 1 nennt „Stimme: KI-generiert“ in der Beschreibung. Die anderen kennzeichnen nicht.
- **TikTok sortiert 3D-Optik als „Video Games“ ein.** 4 von 6 Videos haben das TikTok-interne Label „Video Games / Games / Entertainment“. Nur die Videos mit klarem Finanz- bzw. Physik-Text bekamen „Business & Finance“ bzw. „Science / Education“. Folgerung: Bildschirmtext, Bildunterschrift und gesprochene Schlüsselwörter entscheiden, welchem Publikum TikTok das Video zuerst zeigt.
- **Statische Grafiken funktionieren nicht.** Gegenprobe: @finanzdenker (204k Follower) bekommt mit einem statischen Länder-Ranking 37.900 Views, @mistermoneyphantom mit einem Daten-Chart 2.889 Views. Die Bewegung, die Simulation und die offene Auflösung machen den Unterschied.

## Wie die Videos gemacht werden (Belege und Schlussfolgerung)

- Es gibt einen öffentlichen „Claude Code Skill“ ([lowpoly-reel auf GitHub](https://github.com/stochosfrance/lowpoly-reel), MIT-Lizenz): Ein Skript wird von Claude Code in eine **Three.js-3D-Szene** übersetzt, in Headless-Chrome Bild für Bild in **1080×1920** gerendert, mit ElevenLabs-Stimmen, Soundeffekten und Untertiteln versehen und als TikTok/Reels-Datei exportiert. Laut README: „keine KI-generierten Bilder oder Videos“. Die Bilder sind programmierter 3D-Code.
- Alternative Wege mit Claude: Remotion (React-Videos aus Code) oder Blender-Python-Skripte.
- Schlussfolgerung (Annahme, nicht belegt): Die Kanäle nutzen eine solche Pipeline. Darauf deuten die „3D-Video“-Bios und die Einordnung als „Video Games“ hin.
- @absolut.nullplan (14.286 Follower, „Ich mache Sachen mit KI“) zeigt solche Claude-Experimente. Vermutlich ist das der KI-Influencer, über den der Trend lief (Annahme).

## Weitere Kanäle mit gleichem oder verwandtem Format

Sortiert nach Likes pro Video (Reichweiten-Proxy, weil Profile keine Gesamt-Views zeigen):

| Kanal | Sprache | Thema | Follower | Likes gesamt | Videos | Likes/Video |
|---|---|---|---|---|---|---|
| @psych.wissen | DE | Psychologie-Simulationen („Schizophrenie-Simulation“) | 62.985 | 811.005 | 4 | 202.751 |
| @simplysimulated | EN | 3D-„What if“-Simulationen | 62.986 | 4,20 Mio. | 34 | 123.553 |
| @zackdfilms92 (Zack D. Films) | EN | 3D-Erklärvideos Körper/Alltag (Genre-Vorbild) | 8,04 Mio. | 336,8 Mio. | 3.212 | 104.852 |
| @wissensbert | DE | Allgemeinwissen (kein 3D) | 2,42 Mio. | 123,5 Mio. | 1.373 | 89.923 |
| @thewhatifstudio | EN | 3D-„What if“-Simulationen, verkauft Anleitung | 58.836 | 1,24 Mio. | 35 | 35.390 |
| @simplicissimus | DE | Animierte Erklärvideos (2D, Studio) | 189.489 | 4,37 Mio. | 139 | 31.413 |
| @weltraumweisheiten | DE | Weltraum-Simulationen, verkauft „TikTok-Geld“-Kurs | 65.678 | 1,42 Mio. | 46 | 30.819 |
| @retrodreamspace (visou) | DE | Wissen visualisiert, Duelle | 40.655 | 3,32 Mio. | 117 | 28.345 |
| @mitsistudio | EN | Geschichte in 3D | 134.496 | 2,84 Mio. | 173 | 16.422 |
| @weltraumranger | DE | Weltraum/Erde | 706.588 | 21,4 Mio. | 1.381 | 15.529 |
| @kurzsimuliert | DE | Alltagsphysik-Simulationen | 12.925 | 110.852 | 10 | 11.085 |
| @misshistory | DE | Geschichte (kein 3D) | 559.888 | 12,7 Mio. | 1.157 | 10.967 |
| @kontostand.vs | DE | Geld-Duelle | 418 | 15.983 | 3 | 5.328 |
| @innenblick | DE | Körper in 3D | 56.027 | 687.327 | 132 | 5.207 |
| @ghostedwissen | DE | Körper in 3D, „Was wäre wenn“, Affiliate-Link zum Tool | 47.849 | 1,48 Mio. | 330 | 4.494 |
| @absolut.nullplan | DE | KI-Experimente (Claude) | 14.286 | 42.308 | 12 | 3.526 |
| @mal.angenommen | DE | Gedankenexperimente | 1.435 | 47.354 | 17 | 2.786 |
| @mr.finanzfakten | DE | Finanzwissen (Berater-Funnel) | 93.892 | 1,14 Mio. | 802 | 1.427 |
| @buzze0815 | DE | Katastrophen-Simulationen | 2.436 | 33.361 | 29 | 1.150 |
| @dailyhealth68 | EN/DE | Körper/Gesundheit 3D | 33.408 | 231.908 | 216 | 1.074 |
| @wissentogo_de | DE | 3D-Wissen, Geld | 640 | 8.146 | 11 | 741 |
| @bodydecoding | DE | Körper in 3D | 28.588 | 131.171 | 208 | 631 |
| @finanzdenker | DE | Finanz-News, statische Grafiken | 204.487 | 976.849 | 6.449 | 151 |
| @unnoetig_tiefgruendig | DE | „Was wäre, wenn“, Physik | 483 | 4.888 | 33 | 148 |

Auffällig:
- **Wenige Videos, große Kanäle:** @psych.wissen (4 Videos, 63k), @simplysimulated (34 Videos, 63k), @weltraumweisheiten (46 Videos, 66k), @kurzsimuliert (10 Videos, 12,9k). Wenn der Inhalt trifft, reicht eine kleine Zahl an Videos für 10k. (Vorbehalt: Profile zählen nur öffentliche Videos, gelöschte fehlen.)
- **Zweites Standbein Methode verkaufen:** @thewhatifstudio („Learn how we make them“), @weltraumweisheiten („Wie Du mit TikTok Geld verdienst“), @ghostedwissen (Affiliate-Link „Hier erstelle ich meine Videos“).
- **Warnsignal:** @mikadenkraum (VYRO, KI-Talk) hat 14.759 Follower, aber nur 778 Likes. Das passt zu gekauften Followern, also kein Vorbild.
- **Körper-Nische ist schon voll** (≥ 4 deutsche Kanäle mit 28–56k). **Geld-Duelle, Alltagsphysik, Geschichte in 3D und Tier-Duelle in 3D** haben auf Deutsch kaum Anbieter (Stand der Suche).

## Grenzen dieser Analyse
- TikTok-interne Such- und Listen-APIs habe ich bewusst nicht genutzt (Bot-Schutz). Kanäle wurden über die Websuche gefunden und über ihre öffentlichen Profilseiten geprüft. Es gibt sicher weitere Kanäle.
- Video-Dateien und Transkripte liegen auf TikTok-CDN-Domains, die in der Cloud-Umgebung gesperrt sind. Die Inhaltsanalyse beruht auf Bildunterschriften und Metadaten.

## Quellen
- TikTok-Videoseiten der 6 Ausgangsvideos und Profilseiten aller genannten Kanäle (Abruf 29.10.2026)
- [lowpoly-reel – Claude Code Skill (GitHub)](https://github.com/stochosfrance/lowpoly-reel)
- [Revid.ai – AI vs. real footage, 292.784 TikToks (Anbieterstudie, mit Vorsicht)](https://www.revid.ai/case-studies/ai-videos-vs-real)
- [DataReportal-Zahl via blckalpaca: 23,7 Mio. erwachsene TikTok-Nutzer in DE (Drittquelle)](https://blckalpaca.at/de/wissen/social-media/social-media-plattformen-vergleich/tiktok-marketing-dach)
