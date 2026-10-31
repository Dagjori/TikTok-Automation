# STATUS

**Stand:** 31.10.2026

## Wo wir stehen
- Recherche abgeschlossen: Analyse der Videos und Kanäle, Account-Strategie, Nischen, Claude-Kapazität (siehe `docs/`).
- Repo als Projekt-Zentrale eingerichtet.
- **Korrektur 30.10.:** Die Shop-Videos bleiben öffentlich. Markeninhalte lassen sich nicht auf „Nur ich“ stellen, und die CRP-Prüfung betrifft sie nicht (Details in `docs/02-account-strategie.md`).
- **Schritt 1 erledigt (30.10.):** Das Konto ist privat (kein Business-Konto), der Account check ist ohne Befund (alles grün), Shop-Provisionen spielen keine Rolle.
- **Themenvorrat gemessen (30.10.):** 9 Nischen mit je 150 eigenständigen Ideen gelistet (`data/ideen/`), Ranking in `docs/06-nischen-ranking.md`.
- **Nische gewählt (31.10.):** „Der Testlauf – Alltag durchgerechnet“ (GELD plus ALLTAG). Marke, Profil, Bauplan und die ersten 30 Testläufe stehen in `docs/05-startnische.md`.
- **Trend-Radar täglich (31.10.):** geplante Aufgabe „Trend-Radar Der Testlauf“, jeden Tag 05:35 Uhr Berlin, Push-Benachrichtigung bei Funden. Ablauf und Raster in `docs/07-trend-monitoring.md`, Vorschläge (nur Score ≥ 70) in `docs/trends/vorschlaege.md`.
- **Offene Trend-Vorschläge:** Weihnachtsgeld netto (83, posten 20.–28.11.), Mindestlohn 14,60 € (86, posten 28.12.–05.01.).
- **Ausstattung entschieden:** ElevenLabs Starter, Rendern auf dem Windows-PC des Inhabers. Creator Search Insights ist im Account nicht verfügbar (nur „Inspiration“).
- **Zweiter Account:** Empfehlung „jetzt nicht, frühestens ab Woche 4“, stattdessen ein YouTube-Kanal ab Tag 1. Bester späterer Kandidat ist „Der Testlauf“ auf Englisch.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | Kontotyp prüfen, Account check in TikTok Studio, Shop-Provisionen | Inhaber | 15 Min. | erledigt 30.10. |
| 2 | In der App prüfen, ob `@dertestlauf` frei ist (noch nicht umbenennen); Profil erst am Tag des ersten neuen Videos umbauen; keine neuen Shop-Videos mehr | Inhaber | 5 Min. (+30 Min. am Starttag) | offen |
| 3 | Pipeline bauen: Simulations-Engine (Agenten plus Monte Carlo), Three.js-Vorlage (Teams, Zähler, Lebenslinien, Rubrik-Abzeichen), Stimme, Render, Untertitel; 3 Pilotvideos (#1 Reißverschluss, #2 200 € mehr Gehalt, #3 Supermarkt-Schlange) | Claude Code mit Inhaber | 6–8 Std. über 2 Wochen | offen |
| 3b | Trend-Radar läuft täglich automatisch; Inhaber prüft nur die Vorschläge in `docs/trends/vorschlaege.md` bzw. die Push-Nachricht | Claude (automatisch) plus Inhaber | ca. 5 Min./Tag beim Inhaber | läuft |
| 3c | ElevenLabs-Starter-Plan abschließen (Preis vorher auf elevenlabs.io prüfen), API-Key erzeugen, **nicht** ins Repo legen | Inhaber | 10 Min. | offen |
| 4 | Impressum-Seite einrichten, Nebentätigkeit klären | Inhaber | 1 Std. | offen |
| 5 | Testphase: 2 Videos pro Tag, 14 Tage, einmal pro Woche als Stapel einplanen | Claude plus Inhaber | 2–3 Std./Woche | offen |
| 6 | Auswertung nach 20 Videos (Retention, Follower pro 1.000 Views, Gewinner-Themen) | Claude | 30 Min. | offen |
| 7 | Ab 10k Followern plus 100k Views in 30 Tagen: CRP beantragen, Playlists anlegen | Inhaber | 15 Min. | offen |
| 8 | Zweiter Account (Alltagsphysik) bzw. englischer Klon | Claude plus Inhaber | +1 Std./Woche | offen |

## Offene Punkte
- [ ] Zeit- und Geldbudget bestätigen (angenommen: 5 Std./Woche Aufbau, 50 €/Monat)
- [ ] Wie viel vom Max-Abo darf das Projekt nutzen (angenommen: 50 %)? Der tägliche Trend-Radar verbraucht ebenfalls Kontingent.
- [ ] Benutzername `@dertestlauf` (Alternative `@der.testlauf`) in der App prüfen; ob frei, zeigt erst die App
- [ ] YouTube-Kanal „Der Testlauf“ anlegen (am Tag des ersten Videos)
- [ ] Trend-Vorschläge Weihnachtsgeld und Mindestlohn annehmen oder ablehnen (`docs/trends/vorschlaege.md`)
- [ ] Sprache: zuerst Deutsch, dann Englisch?
- [ ] Optional: TikTok-CDN-Domains freigeben, damit Claude Bilder und Transkripte der Vorbild-Videos auswerten kann
