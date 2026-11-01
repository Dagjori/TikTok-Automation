# STATUS

**Stand:** 01.11.2026, ca. 03:00 Uhr · **Heute in Produktion:** „Treppe oder Aufzug“ (Posting 12:00) und „200 € oder 100 € steuerfrei“ (Posting 20:00), zwei Agenten arbeiten parallel

## Wo wir stehen
- **Neuaufstellung (31.10. spät):** Maßstab sind 4 virale Konkurrenzvideos (je über 1 Mio. Aufrufe), Auswertung in `docs/15-massstab.md`. Verbindlich, Pflichtlektüre zu Beginn jeder Sitzung.
- **Regeln neu:**
  - `CLAUDE.md`
    - Rolle Content-Creator-Experte
    - nur Three.js/Blender
    - Videoaufbau in 11 Phasen
    - kein Name und keine Rubrik im Video
    - Folgen-Aufruf bei ca. 20 s
    - Schluss: „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“
  - `docs/08-beispielskripte.md`: Aufbau, Textregeln, Regie-Text für ElevenLabs, Spurwechsel-Neubau als Beispiel
  - `ENTSCHEIDUNGEN.md`: 14 neue Einträge vom 31.10.
- **Stimme:**
  - Ben im Original: Die Anfrage schickt keine `voice_settings`, ElevenLabs nutzt die gespeicherten Einstellungen (`pipeline/tts.py`, `--modell v4|v2`).
  - Gemessen spricht Ben im Original ca. 2,0 Wörter/s mit Satzpausen von 0,5–0,7 s (Maßstab 2,5–2,9). Deshalb Skripte mit ca. 130–165 Wörtern.
  - **Modell: Eleven v4 für alle Videos** (Inhaber 01.11.), Standard in `tts.py`.
- **Engine nach Maßstab** (`pipeline/engine/massstab.js`, `regie.js`, `uebergaenge.js`, Nutzung in `pipeline/README.md`):
  - Bausteine: Anzeigetafel mit Live-Zählern, Renn-Uhr, Chips, Stempel, Fortschrittsleiste, Formel-, Bilanz- und Warum-Karten, Pointe, Folgen-Aufruf, Phrasen-Untertitel mit Teamfarbe
  - Kamera-Regie, neue Übergänge, Schleife
  - Ton: Klangteppiche plus automatische Effekte aus `ereignisse.json`
  - Prüfskript `pipeline/qc/massstab.py`
  - Demo `pipeline/projekte/_demo-massstab`: 5,9 Ereignisse/s, längste Ruhe 0,95 s
  - Marke und Rubrik sind aus der Engine entfernt.
  - **Renderzeit gestiegen:** 4,6–5,2 s/Bild unter Last (S: ohne Last ca. 2,5 s/Bild, also ca. 1,5 Std. pro Video). Schnelle Vorschau mit `--query "msaa=0&schatten=1024"`.
- **Stile:**
  - Katalog um 9–15 erweitert (Holz, Papier, Filz, Comic-Toon, Blaupause, Glas-Labor, Holz gebacken). Übersicht `docs/assets/stile/uebersicht_neu.jpg`.
  - **Entscheidung 01.11.:** kein fester Look als Markenzeichen, das Markenzeichen ist die Qualität. Alle 15 Stile sind gleichberechtigt, die Wahl je Thema stützt sich auf Konkurrenz-Recherche. Die Empfehlung „Handgemachte Miniatur“ ist abgelehnt.
  - Die alten Stile 4/5/6 werden beim ersten Einsatz in Three.js nachgebaut.
- **Logo:** **A „S-Kurve“ gewählt (01.11.)**, als statisches Profilbild für TikTok (`marke/logo/a-s-kurve/simulierbar-logo-a-s-kurve-profilbild-1080.png`). Nicht im Video verwenden.
- **30-Tage-Plan nach Maßstab:**
  - 17 Themen ersetzt (u. a. Duschen, weil es Vorbild-Video K4 ist), 7 als Duell umgebaut
  - je Video Hook, Denkfalle, 2 Wendungen, Teamfarben, Maßstab-Score (Schnitt 76,5)
  - PDF: `docs/plan/30-tage-plan.pdf` (neu erzeugen: `node tools/plan_pdf.mjs`)
- **Erste Videos (Update 01.11.): GTA 6 und Spurwechsel sind gepostet (alte Version), kein Neubau.** Untertitel bleiben Wort für Wort (Inhaber 01.11.). Plan ab 01.11. verschoben, PDF neu.
- **Erste Videos (Stand davor):**
  - GTA 6 (Version 3) und Spurwechsel sind nach alten Regeln gebaut (mit Marke, alter Schluss, ohne Maßstab-Bausteine). Status im Plan: **„Neubau nach Maßstab nötig“**.
  - Reißverschluss bleibt zurückgestellt.
- **Gedächtnis:**
  - PreCompact-Hook sichert alle Nachrichten nach `.sitzung/` (nicht im Repo).
  - SessionStart-Hook (nach `/compact`) erinnert ans Lesen.
  - Aktiv ab der nächsten Sitzung bzw. nach einmal `/hooks` öffnen.
- **Repo ist öffentlich.** Empfehlung an den Inhaber: auf privat stellen. Konkurrenzmaterial und Gesprächsverläufe kommen nicht ins Repo.
- **Trend-Radar:** läuft täglich 05:35 Uhr. `docs/07` verlangt jetzt Vorschläge im Maßstab-Format. Telegram ist noch nicht eingerichtet.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | Logo A als TikTok-Profilbild hochladen; heute 12:00 und 20:00 posten (KI-Schalter AN) | Inhaber | 15 Min. | heute |
| 2 | Repo auf privat stellen (GitHub → Settings → General → Change visibility) | Inhaber | 2 Min. | offen |
| 3 | Produktion heute: Treppe oder Aufzug (fertig bis 10:30), 200 € oder 100 € steuerfrei (fertig bis 18:30) | Claude (Agenten) | läuft | läuft |
| 4 | Windows-PC einrichten (Claude Code, Node, ffmpeg, Blender), um mit GPU zu rendern | Inhaber plus Claude | 30–60 Min. | empfohlen |
| 5 | TikTok-Konto öffentlich, Buffer-Test, Telegram (`docs/13`) | Inhaber | 30 Min. | offen |
| 6 | Bausteine `pipeline/stile/massstab.js` und `pipeline/engine/massstab.js` zusammenführen; Bake-Weg (Stil 15) als Engine-Baukasten | Claude | 2–4 Std. | beim ersten Einsatz |
| 7 | ElevenLabs Creator, sobald die Credits knapp werden; Impressum-Link; Nebentätigkeit klären | Inhaber | – | später |

## Offene Punkte
- [ ] Position des Folgen-Elements (y ≈ 950) auf echtem Gerät prüfen
- [ ] Teppich-Pegel (−10 dB) mit echter Stimme gegenhören
- [ ] Plan: „120 oder 130 km/h“ ist optisch nah an K2. Bleibt mit eigenem Winkel (Tagesoptik, Euro pro Stunde).
- [ ] Vor der Produktion prüfen: Tank-12-Uhr-Regel, Pendlerpauschale 2026, Steuerklassen 3/5 (Liste in `docs/12`)
- [ ] Firecrawl-Credits fast leer (Recherche läuft über die Websuche)
- [ ] Musik bzw. Klang: Teppich-Varianten mit echter Stimme abnehmen
