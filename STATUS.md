# STATUS

**Stand:** 31.10.2026

## Wo wir stehen
- **Kanal:** **Simulierbar** (`@simulierbar`, laut öffentlicher Profilseite frei, in der App bestätigen). Nische „Alltag durchgerechnet“ mit den Rubriken 💶 GELD und ⏱️ ALLTAG (`docs/05-startnische.md`).
- **Stil festgelegt (31.10.):**
  - Format wie die Vorbilder, nur eigene Themen, kein „1.000 Lebensläufe“-Merkmal.
  - Ende immer „Schreibt euren Simulationswunsch in die Kommentare.“
  - Skripte: `docs/08-beispielskripte.md`. Vorschaubild: `docs/assets/vorschau-gta6.png`.
- **Start heute (31.10.):** Account ist auf Simulierbar umgestellt. Heute sollen 2 Videos raus: **#1 GTA 6 weltweit** (`pipeline/projekte/gta6-welt/`) und **#2 Reißverschluss** (`pipeline/projekte/reissverschluss/`). In Arbeit: hochwertige Render-Engine (`pipeline/engine/`) und Verkehrssimulation (`pipeline/sim/`).
- **Stimme:** `pipeline/tts.py` (ElevenLabs mit Wort-Zeitstempeln). Wartet darauf, dass der Inhaber `api.elevenlabs.io` im Netzwerk freigibt und `ELEVENLABS_API_KEY` als Umgebungsvariable setzt; danach erzeugt eine neue Sitzung die Stimme.
- **Trend-Radar:** läuft täglich um 05:35 Uhr in der festen Sitzung „Trend-Radar täglich (TikTok Automation)“ (Sonnet 5.5). Push-Benachrichtigung bei Vorschlägen mit Score ≥ 70 funktioniert. Vorschläge in `docs/trends/vorschlaege.md`.
- **Angenommene Trend-Videos:** GTA 6 (17.11.), Weihnachtsgeld (20.–28.11.), Mindestlohn 14,60 € (28.12.–05.01.). **Offen:** Deutschlandticket (79 Punkte, 12.–20.12.).
- **Konkurrenz:** Die Nische zieht Nachahmer an (@gegenprobe, @alltagsduell, @alltagsformel, @alltaginzahlen; alle im Monitor). Tempo zählt.
- **Konto:** privat, Account check sauber. Shop-Videos bleiben öffentlich (Markeninhalte können nicht privat sein); keine neuen Shop-Videos.
- **Ausstattung:** ElevenLabs Starter; Rendern zuerst in der Cloud-Sitzung (für den Start am 17.11.), danach auf dem Windows-PC des Inhabers. Creator Search Insights ist im Account nicht verfügbar.
- **Grundlagen:** Analyse, Ranking und Ideenlisten in `docs/01`–`06` und `data/`.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | In der Umgebung `api.elevenlabs.io` freigeben und `ELEVENLABS_API_KEY` setzen | Inhaber | 5 Min. | offen |
| 2 | Render-Engine plus GTA-Video (ohne Ton) bauen | Claude (Hintergrund) | läuft | läuft |
| 3 | Verkehrssimulation plus Reißverschluss-Skript mit echten Zahlen | Claude (Hintergrund) | läuft | läuft |
| 4 | Stimme erzeugen (neue Sitzung mit Key), final rendern, MP4 an den Inhaber | Claude | nach Schritt 1–3 | offen |
| 5 | Videos abnehmen und posten (TikTok und YouTube Shorts) | Inhaber | 15 Min. pro Video | heute |
| 6 | Impressum-Link in der Bio, Nebentätigkeit klären | Inhaber | 1 Std. | offen |
| 7 | Windows-Setup für das lokale Rendern | Claude plus Inhaber | 30 Min. | später |

## Offene Punkte
- [ ] Deutschlandticket-Vorschlag (79) annehmen oder ablehnen
- [ ] Stimme: männlich oder weiblich? Musik: leiser Hintergrund oder nur Soundeffekte?
- [ ] Zeit- und Geldbudget bestätigen (angenommen: 5 Std./Woche Aufbau, 50 €/Monat)
- [ ] Wie viel vom Max-Abo darf das Projekt nutzen (angenommen: 50 %)? Der Trend-Radar verbraucht pro Lauf etwa so viel wie 0,60 $ zu API-Preisen.
- [ ] Optional: TikTok-CDN-Domains freigeben, damit Claude Bilder und Transkripte der Vorbild-Videos auswerten kann
