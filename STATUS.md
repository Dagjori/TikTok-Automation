# STATUS

**Stand:** 31.10.2026

## Wo wir stehen
- **Kanal:** **Simulierbar** (`@simulierbar`, seit 31.10. aktiv). Nische „Alltag durchgerechnet“ mit den Rubriken 💶 GELD und ⏱️ ALLTAG (`docs/05-startnische.md`).
- **Stil festgelegt (31.10.):**
  - Format wie die Vorbilder, nur eigene Themen, kein „1.000 Lebensläufe“-Merkmal.
  - Ende immer „Schreibt euren Simulationswunsch in die Kommentare.“
  - Skripte: `docs/08-beispielskripte.md`. Vorschaubild: `docs/assets/vorschau-gta6.png`.
- **Start heute (31.10.):** Account ist auf Simulierbar umgestellt. Heute sollen 2 Videos raus: **#1 GTA 6 weltweit** (`pipeline/projekte/gta6-welt/`) und **#2 Reißverschluss** (`pipeline/projekte/reissverschluss/`). In Arbeit: hochwertige Render-Engine (`pipeline/engine/`) und Verkehrssimulation (`pipeline/sim/`).
- **Stimme:** `pipeline/tts.py` (ElevenLabs mit Wort-Zeitstempeln, Key als Netzwerk-Secret, segmentweise mit Kontext, Antwort-Cache).
- **Nachtschicht 31.10. → 01.11. (Inhaber schläft, Ziel: morgen früh fertige Videos):**
  - GTA 6 weltweit: Skript im Stil der Top-Videos (191 Wörter), Stimme `zfc8CJQpe8Kqyl0vvCzo` im natürlichen Tempo (81,2 s, 2,35 Wörter/s = im Bereich der Vorbilder 2,11–2,80). Render-Engine fertig, finales Video wird gerendert.
  - Reißverschluss: Verkehrssimulation fertig (50 Läufe je Szenario). Rückstau Feierabend 3,4 km → 2,5 km (−26 %), Rushhour 6,2 km → 5,4 km (−13 %), wenig Verkehr 0 m. Durchsatz gleich, Fahrzeit +1 % (Reißverschluss spart Platz, keine Zeit). Skript mit diesen Zahlen steht (`pipeline/projekte/reissverschluss/skript.json`, 168 Wörter; Grenzen und Sensitivität in `sim_ergebnisse.md`, Trajektorien und Plots im selben Ordner). Danach Stimme, 3D-Szene und Rendern.
  - Stimmen-Analyse der Vorbilder: Tempo und Satzbau gemessen (TikTok-Untertitel). Welche ElevenLabs-Stimme genau genutzt wird, ist noch offen: TikTok gibt den Ton nur mit Login heraus, und dem ElevenLabs-Key fehlt weiterhin das Leserecht `voices_read` (Prüfung 31.10. nachts). Danach Vergleich mit den meistgenutzten deutschen Bibliotheksstimmen.
- **Trend-Radar:** läuft täglich um 05:35 Uhr in der festen Sitzung „Trend-Radar täglich (TikTok Automation)“ (Sonnet 5.5). Push-Benachrichtigung bei Vorschlägen mit Score ≥ 70 funktioniert. Vorschläge in `docs/trends/vorschlaege.md`.
- **Angenommene Trend-Videos:** GTA 6 weltweit (heute), Weihnachtsgeld (20.–28.11.), Mindestlohn 14,60 € (28.12.–05.01.). **Offen:** Deutschlandticket (79 Punkte, 12.–20.12.).
- **Konkurrenz:** Die Nische zieht Nachahmer an (@gegenprobe, @alltagsduell, @alltagsformel, @alltaginzahlen; alle im Monitor). Tempo zählt.
- **Konto:** privat, Account check sauber. Shop-Videos bleiben öffentlich (Markeninhalte können nicht privat sein); keine neuen Shop-Videos.
- **Ausstattung:** ElevenLabs Starter; Rendern zuerst in der Cloud-Sitzung (für den Start heute), danach auf dem Windows-PC des Inhabers. Creator Search Insights ist im Account nicht verfügbar.
- **Grundlagen:** Analyse, Ranking und Ideenlisten in `docs/01`–`06` und `data/`.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | ElevenLabs-Key: Leserecht „Voices → Read“ beim Key aktivieren, **der im Secret steht** (bzw. neuen Key ohne Einschränkung ins Secret) | Inhaber | 5 Min. | offen |
| 2 | Render-Engine plus GTA-Video (ohne Ton) bauen | Claude (Hintergrund) | läuft | läuft |
| 3 | Verkehrssimulation plus Reißverschluss-Skript mit echten Zahlen | Claude (Hintergrund) | – | erledigt 31.10. |
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
