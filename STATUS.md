# STATUS

**Stand:** 01.11.2026, ca. 01:30 Uhr (Nacht nach der Neuaufstellung)

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
  - Hörproben v4 und v2: `pipeline/out/stimmprobe/` (nicht im Repo), an den Inhaber geschickt.
  - **Modellwahl offen.**
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
  - Empfehlung Alleinstellungsmerkmal: Familie „Handgemachte Miniatur“ (Holz/Papier/Filz, später Knete) über den Weg „Blender backen → glTF → Three.js“ (`docs/10`, Abschnitt 0.4).
  - **Bestätigung durch den Inhaber offen.**
  - Die alten Stile 4/5/6 werden beim ersten Einsatz in Three.js nachgebaut.
- **Logo:** 3 Konzepte aus Blender in `marke/` (Übersicht `marke/logo/uebersicht.png`). Empfehlung: A „S-Kurve“. **Wahl offen.** Nicht im Video verwenden.
- **30-Tage-Plan nach Maßstab:**
  - 17 Themen ersetzt (u. a. Duschen, weil es Vorbild-Video K4 ist), 7 als Duell umgebaut
  - je Video Hook, Denkfalle, 2 Wendungen, Teamfarben, Maßstab-Score (Schnitt 76,5)
  - PDF: `docs/plan/30-tage-plan.pdf` (neu erzeugen: `node tools/plan_pdf.mjs`)
- **Erste Videos:**
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
| 1 | Entscheiden: Stimme v4 oder v2; Logo A/B/C; Stil-Familie „Handgemachte Miniatur“ ja/nein; Untertitel als Phrasen ok | Inhaber | 10 Min. | offen |
| 2 | Repo auf privat stellen (GitHub → Settings → General → Change visibility) | Inhaber | 2 Min. | offen |
| 3 | Startsignal: Spurwechsel als erstes Video nach Maßstab neu bauen (Skript steht in `docs/08` §4) mit dem neuen Baukasten, danach GTA 6 | Inhaber, dann Claude | ca. 3–4 Std. Claude | wartet |
| 4 | Windows-PC einrichten (Claude Code, Node, ffmpeg, Blender), um mit GPU zu rendern | Inhaber plus Claude | 30–60 Min. | empfohlen |
| 5 | TikTok-Konto öffentlich, Buffer-Test, Telegram (`docs/13`) | Inhaber | 30 Min. | offen |
| 6 | Bausteine `pipeline/stile/massstab.js` und `pipeline/engine/massstab.js` zusammenführen; Bake-Weg (Stil 15) als Engine-Baukasten | Claude | 2–4 Std. | beim ersten Einsatz |
| 7 | ElevenLabs Creator, sobald die Credits knapp werden; Impressum-Link; Nebentätigkeit klären | Inhaber | – | später |

## Offene Punkte
- [ ] Stimme: Eleven v4 oder Multilingual v2 (Hörproben verschickt)
- [ ] Logo: A „S-Kurve“ (Empfehlung), B oder C
- [ ] Stil-Familie „Handgemachte Miniatur“ als Alleinstellungsmerkmal bestätigen
- [ ] Position des Folgen-Elements (y ≈ 950) auf echtem Gerät prüfen
- [ ] Teppich-Pegel (−10 dB) mit echter Stimme gegenhören
- [ ] Plan: „120 oder 130 km/h“ ist optisch nah an K2. Bleibt mit eigenem Winkel (Tagesoptik, Euro pro Stunde).
- [ ] Vor der Produktion prüfen: Tank-12-Uhr-Regel, Pendlerpauschale 2026, Steuerklassen 3/5 (Liste in `docs/12`)
- [ ] Firecrawl-Credits fast leer (Recherche läuft über die Websuche)
- [ ] Musik bzw. Klang: Teppich-Varianten mit echter Stimme abnehmen
