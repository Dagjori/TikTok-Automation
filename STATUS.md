# STATUS

**Stand:** 31.10.2026, abends

## Wo wir stehen
- **Kanal:** **Simulierbar** (`@simulierbar`, seit 31.10. aktiv). Nische „Alltag durchgerechnet“ mit den Rubriken 💶 GELD und ⏱️ ALLTAG (`docs/05-startnische.md`).
- **Format:**
  - wie die Vorbilder, nur eigene Themen, kein „1.000 Lebensläufe“-Merkmal
  - Ende immer „Schreibt euren Simulationswunsch in die Kommentare.“
  - Skripte: `docs/08-beispielskripte.md`
- **Update 31.10. abends:**
  - **Reißverschluss zurückgestellt.** @simulierts hat das Thema am 31.10. zuerst gepostet.
  - **Zweites Video:** „Spurwechsel im Stau“ im Iso-Stil, wird gerade produziert (`pipeline/projekte/spurwechsel/`).
  - **GTA 6, Version 3:** wird gerade mit der neuen Vertonung gerendert (am Stück, Pausen nach Sätzen und Abschnitten; vom Inhaber freigegeben).
- **Erste 2 Videos: fertig, Version 2 (31.10., ca. 15:30 Uhr), dem Inhaber geschickt** (überholt, siehe Update): Die Dateien sind nicht im Repo, weil sie zu groß sind. Neu bauen lässt sich jedes Video mit den Befehlen in `pipeline/README.md`.
  - **GTA 6 weltweit:** `pipeline/out/gta6-welt/gta6-welt.mp4`, 84,0 s, −14,0 LUFS.
  - **Reißverschluss:** `pipeline/out/reissverschluss/reissverschluss.mp4`, 78,7 s, −14,0 LUFS.
  - **Neu in Version 2:**
    - Stimme „Ben“ (muttersprachlich Deutsch)
    - Untertitel ohne Kasten: Wort für Wort, Kontur, aktuelles Wort gelb
  - **Abnahme:**
    - Stimme liegt auf 4 ms genau.
    - Alle 81 Untertitelblöcke passen in die Breite.
    - Nie zwei Blöcke gleichzeitig.
    - Zahlen im Bild = Sprechtext bzw. Simulation.
  - **Version 1** (alte Stimme, Untertitel mit Kasten) liegt als `*_v1_alte-stimme.mp4` daneben und wird nicht gepostet.
- **Stimme:** ElevenLabs „Ben“ `aTTiK3YzK3dXETpuDE2h` ist Standard in `pipeline/tts.py`. Alternativen dort hinterlegt: Marc, Alexander, Otto. Bibliotheksstimmen funktionieren mit unserem Key ohne Leserecht.
- **Untertitel-Engine:** `Karaoke`-Stil „kontur“ in `pipeline/engine/hud.js`.
  - Überlange Wörter wie „Straßenverkehrsordnung.“ verkleinern nur ihren Block.
  - Der Blockwechsel kommt ohne leeres Bild aus. Das gilt ab dem nächsten Render.
- **Designstile:** Katalog mit 8 Stilen in `docs/10-designstile.md` (Abschnitt 0), Beispielbilder in `docs/assets/stile/`. Je Video gilt der Stil, der zum Thema passt (Entscheidung 31.10.). Für jeden Stil wird beim ersten Einsatz ein Szenen-Baukasten gebaut.
- **30-Tage-Plan:** `data/plan/30-tage.csv` und `docs/12-30-tage-plan.md`.
  - Umfang: 60 Videos (2 pro Tag) plus max. 10 Bonusvideos, mit Spalte `stil`.
  - Der Plan ist die Reihenfolge der nächsten Videos. Die Produktion startet täglich erst auf das Startsignal des Inhabers.
- **Auto-Posting:** Buffer wird getestet (`docs/11-automatisierung.md`, Abschnitt 3 A). Die Regel in CLAUDE.md ist angepasst: offizielle Partner-Tools sind erlaubt, Claude legt nur Entwürfe an, der Inhaber gibt frei.
- **Trend-Radar:** läuft täglich um 05:35 Uhr, Vorschläge stehen in `docs/trends/vorschlaege.md`.
  - Das alte „1.000 simulierte …“-Format ist entfernt (`docs/07-trend-monitoring.md`, Schritt 4). Die Radar-Sitzung hat das bestätigt.
  - Neuer Schritt 9: Das Ergebnis geht täglich per Telegram an den Inhaber, sobald Telegram eingerichtet ist (`docs/13-telegram-radar.md`, Skript `tools/telegram_senden.py`). Die Telegram-API ist im Netz der Umgebung noch gesperrt.
- **Angenommene Trend-Videos:**
  - GTA 6 Deutschland am 17.11.
  - Weihnachtsgeld vom 20. bis 28.11.
  - Mindestlohn 14,60 € vom 28.12. bis 05.01.
  - Offen: Deutschlandticket (79 Punkte, 12.–20.12.).
- **Konkurrenz:** @gegenprobe, @alltagsduell, @alltagsformel, @alltaginzahlen (alle im Monitor). Tempo zählt.
- **Konto:**
  - Laut letztem Stand noch **privat**. Vor dem ersten Post auf öffentlich stellen (`docs/09-posting-anleitung.md`).
  - Shop-Videos bleiben öffentlich, keine neuen Shop-Videos.
- **Ausstattung:**
  - ElevenLabs Starter. Für 2 Videos am Tag später Creator für 22 $/Monat (`docs/12-30-tage-plan.md`, 4.3).
  - Rendern vorerst in der Cloud (ca. 50 Min. pro Video), später auf dem Windows-PC.
  - Google-Drive-Ablage kommt später über Drive für Desktop auf dem PC.
  - Firecrawl-Credits waren am 31.10. aufgebraucht.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | TikTok-Konto öffentlich stellen, beide Videos (Version 2) posten: Video 1 als Buffer-Test (`docs/11`, 3 A), Video 2 per TikTok Studio oder Buffer; Texte in `docs/09-posting-anleitung.md` | Inhaber | 30–45 Min. | offen |
| 2 | Telegram-Bot einrichten (`docs/13-telegram-radar.md`) | Inhaber | 10 Min. | offen |
| 3 | Nach erfolgreichem Buffer-Test: Essentials buchen; danach optional das Skript `pipeline/post_buffer.py` für Entwürfe in Auftrag geben (`docs/11`, 3 B/C) | Inhaber, danach Claude | 10 Min. bzw. 2–3 Std. | offen |
| 4 | Tägliches Startsignal: nächste Videos laut `data/plan/30-tage.csv` produzieren; erst die Duell-Tafel (V3) und die Stil-Baukästen, wenn das erste Video sie braucht | Inhaber, dann Claude | täglich | ab 01.11. |
| 5 | ElevenLabs auf Creator, sobald die Credits nicht mehr reichen (ca. 1.250–1.400 Credits pro Video) | Inhaber | 5 Min. | später |
| 6 | Impressum-Link in der Bio, Nebentätigkeit klären | Inhaber | 1 Std. | offen |
| 7 | Windows-Setup für das lokale Rendern (inklusive Drive für Desktop) | Claude plus Inhaber | 30 Min. | später |

## Offene Punkte
- [ ] Deutschlandticket-Vorschlag (79) annehmen oder ablehnen
- [ ] Musik: leiser Hintergrund oder nur Soundeffekte (bisher: eigene Effekte plus leiser Klangteppich)
- [ ] Zeit- und Geldbudget bestätigen (angenommen: 5 Std./Woche Aufbau, 50 €/Monat; neu dazu: Buffer ca. 9 €, ElevenLabs Creator ca. 20 €)
- [ ] Wie viel vom Max-Abo darf das Projekt nutzen (angenommen: 50 %)? Für 2 Videos pro Tag mit 8 Stilen ist das der Engpass (`docs/12-30-tage-plan.md`, 4.2).
- [ ] Optional: TikTok-CDN-Domains freigeben, damit Claude Bilder und Transkripte der Vorbild-Videos auswerten kann
- [ ] Prompt der geplanten Radar-Aufgabe nennt Telegram noch nicht. Nicht nötig, weil der Radar `docs/07` jeden Tag neu liest. Ändern ginge nur aus der Radar-Sitzung heraus.
