# STATUS

**Stand:** 31.10.2026, abends

## Wo wir stehen
- **Kanal:** **Simulierbar** (`@simulierbar`, seit 31.10. aktiv). Nische „Alltag durchgerechnet“ mit den Rubriken 💶 GELD und ⏱️ ALLTAG (`docs/05-startnische.md`).
- **Format:**
  - wie die Vorbilder, nur eigene Themen, kein „1.000 Lebensläufe“-Merkmal
  - Ende immer „Schreibt euren Simulationswunsch in die Kommentare.“
  - Skripte: `docs/08-beispielskripte.md`
- **Arbeitsweise:** `docs/14-arbeitsweise.md` zeigt Regeln, Informationsquellen, Ablauf, Abnahme, Schwächen und Empfehlungen (Anlass: Inhaber mit den Ergebnissen nicht ganz zufrieden). Widersprüche in den Regeldateien sind dort aufgelistet und korrigiert.
- **Update 31.10. abends:**
  - **Reißverschluss zurückgestellt.** @simulierts hat das Thema am 31.10. zuerst gepostet.
  - **Zweites Video: „Spurwechsel im Stau“ fertig und geprüft.** `pipeline/out/spurwechsel/spurwechsel.mp4`, 81,9 s, −14,0 LUFS, Iso-Stil, dem Inhaber geschickt.
    - Ergebnis der Simulation: Wechseln bringt im Modell ca. 20 s auf 5 km, also ca. 2 s pro Wechsel. Die Nachbarspur wirkt schneller, weil man 20 % der Zeit überholt wird und selbst nur 11 % der Zeit überholt (Redelmeier & Tibshirani, Nature 1999).
    - Iso-Baukasten: `pipeline/engine/iso.js` und `iso.css`.
    - Bekannte Schwäche: Im Rennen-Teil wirkt der Stau stellenweise locker. Das liegt an der Modelldichte (40 Fz/km je Spur). Verbessern auf Wunsch des Inhabers.
  - **GTA 6, Version 3: fertig und geprüft** (82,6 s, −14,0 LUFS, neue Vertonung am Stück mit Pausen), dem Inhaber geschickt.
  - **Untertitel-Engine:** Die Zeile bleibt jetzt auch beim Erscheinen des letzten Worts innerhalb der sicheren Zone. Gilt ab dem nächsten Render.
- **Ältere Fassungen** (GTA 6 Version 1 und 2, Reißverschluss Version 1 und 2) liegen in `pipeline/out/` und werden nicht gepostet. Die Dateien sind nicht im Repo, weil sie zu groß sind. Neu bauen lässt sich jedes Video mit den Befehlen in `pipeline/README.md`.
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
| 0 | Arbeitsweise prüfen und Feedback geben: beide Videos mit der Vorlage bewerten, 2–3 Vorbild-Videos als Datei hochladen, 3 Fragen entscheiden (`docs/14-arbeitsweise.md`, Abschnitte 8–10) | Inhaber | 25 Min. | offen |
| 1 | TikTok-Konto öffentlich stellen, GTA 6 (Version 3) und Spurwechsel posten, sobald das Feedback eingearbeitet ist: Video 1 als Buffer-Test (`docs/11`, 3 A), Video 2 per TikTok Studio oder Buffer; Captions im Format laut `CLAUDE.md`. Reißverschluss wird nicht gepostet. | Inhaber | 30–45 Min. | offen |
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
- [ ] Vorbild-Videos als Datei hochladen (Maßstab für Bild und Ton). Eine CDN-Freigabe hilft nicht, weil der Download als Umgehung von Bot-Schutz verweigert wird.
- [ ] Entscheiden (Empfehlungen in `docs/14-arbeitsweise.md`, Abschnitt 9): bis 15.11. nur 3 statt 8 Stile? Darf das Bild zuspitzen, solange die Zahlen exakt bleiben? Probebilder und Hörprobe vor dem Vollrender?
- [ ] Prompt der geplanten Radar-Aufgabe nennt Telegram noch nicht. Nicht nötig, weil der Radar `docs/07` jeden Tag neu liest. Ändern ginge nur aus der Radar-Sitzung heraus.
