# STATUS

**Stand:** 31.10.2026, 05:10 Uhr (Nachtschicht)

## Wo wir stehen
- **Kanal:** **Simulierbar** (`@simulierbar`, seit 31.10. aktiv). Nische „Alltag durchgerechnet“ mit den Rubriken 💶 GELD und ⏱️ ALLTAG (`docs/05-startnische.md`).
- **Stil festgelegt (31.10.):**
  - Format wie die Vorbilder, nur eigene Themen, kein „1.000 Lebensläufe“-Merkmal.
  - Ende immer „Schreibt euren Simulationswunsch in die Kommentare.“
  - Skripte: `docs/08-beispielskripte.md`. Vorschaubild: `docs/assets/vorschau-gta6.png`.
- **Start heute (31.10.):** Account ist auf Simulierbar umgestellt. Heute sollen 2 Videos raus: **#1 GTA 6 weltweit** (`pipeline/projekte/gta6-welt/`) und **#2 Reißverschluss** (`pipeline/projekte/reissverschluss/`). In Arbeit: hochwertige Render-Engine (`pipeline/engine/`) und Verkehrssimulation (`pipeline/sim/`).
- **Stimme:** `pipeline/tts.py` (ElevenLabs mit Wort-Zeitstempeln, Key als Netzwerk-Secret, segmentweise mit Kontext, Antwort-Cache).
- **Nachtschicht 30.10. → 31.10. (Inhaber schläft, Ziel: morgen früh fertige Videos):**
  - **GTA 6 weltweit: fertig und geprüft (31.10., 05:05 Uhr).** `pipeline/out/gta6-welt/gta6-welt.mp4` (nicht im Repo, zu groß; dem Inhaber geschickt): 82,7 s, 1080×1920, 30 fps, −14,0 LUFS, Stimme `zfc8CJQpe8Kqyl0vvCzo` im natürlichen Tempo. Abnahme: Karaoke-Untertitel an 18 Wortgrenzen exakt, Stimme 4 ms Versatz, alle Zahlen im Bild = Sprechtext, sichere Zonen eingehalten. Neu rendern: `cd pipeline && node render.js projekte/gta6-welt --worker 2 && ./mux.sh projekte/gta6-welt` (ca. 50 Min. in der Cloud).
  - Reißverschluss: Verkehrssimulation fertig (50 Läufe je Szenario). Rückstau Feierabend 3,4 km → 2,5 km (−26 %), Rushhour 6,2 km → 5,4 km (−13 %), wenig Verkehr 0 m. Durchsatz gleich, Fahrzeit +1 % (Reißverschluss spart Platz, keine Zeit). Skript final, Stimme fertig (78,2 s; `pipeline/projekte/reissverschluss/audio/`). Grenzen und Sensitivität in `sim_ergebnisse.md`. 3D-Szene steht, Vollrender läuft.
  - Stimmen-Analyse der Vorbilder: Tempo und Satzbau gemessen (TikTok-Untertitel). Welche ElevenLabs-Stimme genau genutzt wird, ist noch offen: TikTok gibt den Ton nur mit Login heraus, und dem ElevenLabs-Key fehlt weiterhin das Leserecht `voices_read` (zuletzt geprüft 31.10., 05:10 Uhr, nach der Änderung des Inhabers: `voices_read` und `user_read` fehlen weiter). Danach Vergleich mit den meistgenutzten deutschen Bibliotheksstimmen.
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
| 2 | Render-Engine plus GTA-Video bauen | Claude (Hintergrund) | – | erledigt 31.10. |
| 3 | Verkehrssimulation plus Reißverschluss-Skript mit echten Zahlen | Claude (Hintergrund) | – | erledigt 31.10. |
| 4 | Stimme erzeugen, final rendern, prüfen, MP4 an den Inhaber | Claude | – | GTA erledigt, Reißverschluss rendert |
| 5 | Videos abnehmen und posten (TikTok und YouTube Shorts), Anleitung und Texte: `docs/09-posting-anleitung.md` | Inhaber | 15 Min. pro Video | heute |
| 6 | Impressum-Link in der Bio, Nebentätigkeit klären | Inhaber | 1 Std. | offen |
| 7 | Windows-Setup für das lokale Rendern | Claude plus Inhaber | 30 Min. | später |

## Offene Punkte
- [ ] Deutschlandticket-Vorschlag (79) annehmen oder ablehnen
- [ ] Stimme: männlich oder weiblich? Musik: leiser Hintergrund oder nur Soundeffekte?
- [ ] Zeit- und Geldbudget bestätigen (angenommen: 5 Std./Woche Aufbau, 50 €/Monat)
- [ ] Wie viel vom Max-Abo darf das Projekt nutzen (angenommen: 50 %)? Der Trend-Radar verbraucht pro Lauf etwa so viel wie 0,60 $ zu API-Preisen.
- [ ] Optional: TikTok-CDN-Domains freigeben, damit Claude Bilder und Transkripte der Vorbild-Videos auswerten kann
