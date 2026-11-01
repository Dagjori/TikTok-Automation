# STATUS

**Stand:** 01.11.2026, ca. 11:05 UTC · **Fertig und übergeben:** „Treppe oder Aufzug“ (Posting 01.11. 12:00), „200 € oder 100 € steuerfrei“ (Posting 01.11. 20:00), „Fußgängerampel“ (Posting 02.11. 12:00) und „Steuererklärung oder Überstunden“ (Posting 02.11. 20:00). Nächste Produktion (03.11.) erst auf Startsignal des Inhabers.

## Fertig und übergeben (01.11.)

| Video | Stil | Länge | Abnahme | Datei (nicht im Repo) | Caption |
|---|---|---|---|---|---|
| Treppe oder Aufzug | 12 Comic-Toon, „Warum?“ als 13 Blaupause | 74,2 s | 12/12 Pflichtpunkte, −14,0 LUFS, Sync 0 ms, Kontaktbogen gesichtet | `pipeline/out/treppe-aufzug/treppe-aufzug_tiktok.mp4` | Treppe oder Aufzug: Wer ist schneller oben? 🏢 Ich hab's simuliert. Team Treppe oder Team Aufzug? 👇 #treppe #aufzug #büro #wissen #simulation |
| 200 € oder 100 € steuerfrei | 14 Glas-Labor | 66,1 s | 12/12 Pflichtpunkte, 11/11 Hinweise, −14,0 LUFS, längste Ruhe 1,56 s, Schleife ja, Kontaktbogen gesichtet | `pipeline/out/gehalt-steuerfrei/gehalt-steuerfrei_tiktok.mp4` | 200 € mehr Gehalt oder 100 € steuerfrei – was bringt netto mehr? 💶 Ich hab's durchgerechnet. Team Gehalt oder Team steuerfrei? 👇 #gehaltserhöhung #nettogehalt #steuern #wissen #simulation |
| Fußgängerampel (Posting 02.11. 12:00) | 1 Low-Poly-Miniatur mit Tilt-Shift (neu, `stil_lowpoly.js`) | 66,3 s | 12/12 Pflichtpunkte, 11/11 Hinweise, −14,0 LUFS, automatische Text-Überlappungs-Prüfung 56 → 0 Paare, Kontaktbogen nach Korrektur gesichtet | `pipeline/out/fussgaengerampel/fussgaengerampel_tiktok.mp4` | Wird die Ampel schneller grün, wenn du öfter drückst? 🚦 Ich hab's simuliert. Team Einmal oder Team Dauerdrücken? 👇 #ampel #fußgängerampel #verkehr #wissen #simulation |
| Steuererklärung oder Überstunden (Posting 02.11. 20:00) | 4 Flat (neu in Three.js, `stil_flat.js`) | 67,9 s | 12/12 Pflichtpunkte, 11/11 Hinweise, −14,0 LUFS, drei Text-Überlappungen behoben und nachgeprüft | `pipeline/out/steuer-ueberstunden/steuer-ueberstunden_tiktok.mp4` | Steuererklärung oder Überstunden – was bringt mehr Geld pro Stunde? 💶 Ich hab's durchgerechnet. Team Steuererklärung oder Team Überstunden? 👇 #steuererklärung #überstunden #steuern #wissen #simulation |

- **Treppe:** Bis zum 4. Stock gewinnt die Treppe (46 gegen 49 s), bei zwei Fremdhalten bis zum 6. Stock. Das Ergebnis hängt an 25 s Wartezeit auf den Aufzug (bei 15 s gewinnt der Aufzug) und dürfte Kommentare auslösen.
- **Gehalt:** 3.500 € brutto, Steuerklasse 1: +200 € brutto ergeben 109,75 € netto, das Gehalt gewinnt um 9,75 €. Bei 5.500 € brutto bleiben nur 99,09 €, dann gewinnt steuerfrei. Zweite Überraschung: Extras bringen keine Rentenpunkte (+0,046 Punkte ≈ +1,96 € Rente/Monat je Jahr). „100 € steuerfrei“ = 50 € Gutschein (§ 8 Abs. 2 S. 11 EStG) + 50 € Jobticket (§ 3 Nr. 15 EStG). Quellen intern in `skript.json`. Netto-Modul `pipeline/sim/netto.mjs` (PAP 2026, 11 Tests).
- **Steuer:** 3.500 € brutto, 25 km, 4 h Aufwand: Erklärung 222 € = 55,50 €/h gegen 4 Überstunden 44,45 € netto = 11,11 €/h. Wendung: 5 km ohne Extras → 0 € Erstattung; ab 16 km dreht es sich. Regeln 2026: Pauschbetrag 1.230 €, 0,38 €/km ab km 1, Homeoffice 6 €/Tag. Überstundenzuschläge 2026 nicht steuerfrei (nur Referentenentwurf). Rechnung `pipeline/sim/steuer_ueberstunden.mjs` (7 Tests).
- **Fußgängerampel:** Max (Pink, drückt ständig, hetzt) gegen Lea (Türkis, drückt einmal) über drei Ampeln zur Bahn: 63 gegen 3 Drücke, dieselbe Bahn, Zeitgewinn 0 s; Max wartet 112 s, Lea 64 s. Zweite Überraschung: Drückt keiner, bleibt die Bedarfsampel rot. Plan-Wendung „nachts fast sofort“ ersetzt (kein Beleg). Rechnung `pipeline/sim/ampel.mjs` (10 Tests, Monte Carlo n = 20.000). Quellen teils nur aus Suchauszügen (Stadtseiten aus der Cloud gesperrt, RiLSA kostenpflichtig), vermerkt in `skript.json`.
- **Treppe und Gehalt:** Hook bzw. „Los geht's“ je um 0,25 s Stille gekürzt, damit die Zeitgrenzen halten; Sprechtempo unverändert.
- **Nicht gehört (alle Videos):** Klangteppich und Effekte sind nur gemessen. Der Inhaber hört vor dem Posten einmal mit Ton rein.
- **Bekannt:** Im Gehalt-Video ist Team „steuerfrei“ gelb, das aktuelle Untertitel-Wort ist ebenfalls gelb. Bei künftigen Videos keine gelbe Teamfarbe mehr wählen (Untertitel-Gelb ist reserviert).

## Account 2 (Recherche 01.11.)
- Auftrag des Inhabers: zweiten Account (ca. 800 Follower) aufbauen, Nische mit Trendsetter-Potenzial finden, CRP-Rechnung. Ergebnis: `docs/16-account-2-nischen.md`.
- Empfehlung: „Mal angenommen …“-Gedankenexperimente in 3D aus Ich-Perspektive, Kern „Was wäre, wenn [Naturbaustein] 5 Sekunden verschwindet?“ (US Okt. 2026: Median 838.700, Max. 18,2 Mio., alle über 60 s; DE kaum besetzt). Score 91.
- CRP: 1.000 €/Monat ≈ 1,4–5 Mio. Views (mittel 2,4 Mio., ca. 40k je Video bei 60 Videos).
- KI-Label: Das sichtbare Label steht im Feld `aigcLabelType`, nicht in `IsAigc`. Pflicht ist es nur bei realistischen Inhalten.
- Inhaber 01.11.: POV-Stil wie @man_ia_c, nur Blender/Three.js, neue deutsche v4-Stimme; alter Account hat nur 130 Follower (Gesundheit, inaktiv seit 08/2024). Empfehlung von Claude: neuen Account anlegen. @angenommen.pov (0 Videos) hat das Konzept am 07.10. reserviert, also Tempo.
- Neu: Sticker max. 5 je Video (Prüfpunkt 5d) und Inhalte mittig (Achse 540, bisher 492). Kalibrier-Video `pipeline/out/kalibrierung/kalibrierung_1080x1920.mp4` für die genaue Schutzzone.

## Wo wir stehen
- **Neuaufstellung (31.10. spät):** Maßstab sind 4 virale Konkurrenzvideos (je über 1 Mio. Aufrufe), Auswertung in `docs/15-massstab.md`. Verbindlich, Pflichtlektüre zu Beginn jeder Sitzung.
- **Regeln:** `CLAUDE.md` (Rolle, nur Three.js/Blender, 11 Phasen, kein Name/Logo/Rubrik, Folgen-Aufruf ca. 20 s, neuer Schluss), `docs/08-beispielskripte.md` (Aufbau, Textregeln, Regie-Text), `ENTSCHEIDUNGEN.md`.
- **Stimme:** Ben im Original (keine `voice_settings`), **Eleven v4 für alle Videos** (Inhaber 01.11.), Standard in `pipeline/tts.py`. Ben spricht ca. 2,0–2,3 W/s → Skripte mit 130–165 Wörtern.
- **Untertitel:** Wort für Wort, Stil „kontur“ (Inhaber 01.11.).
- **Engine nach Maßstab** (`pipeline/engine/massstab.js`, `regie.js`, `uebergaenge.js`, Nutzung `pipeline/README.md`), Prüfskript `pipeline/qc/massstab.py`. Neue Stil-Baukästen: `stil_comic.js` (12), `stil_blaupause.js` (13), `stil_glas.js` (14), Übersicht in `docs/10`, Abschnitt „Fertige Produktions-Baukästen“.
- **Renderzeit Cloud:** Comic 1,2 s/Bild (ca. 45 Min./Video), Glas-Labor 3,35 s/Bild (ca. 110 Min./Video). Windows-PC mit GPU würde das deutlich verkürzen.
- **Stile:** 15 im Katalog, kein fester Look, das Markenzeichen ist die Qualität (Inhaber 01.11.). Nie zweimal hintereinander derselbe Stil.
- **Logo:** A „S-Kurve“, statisches Profilbild `marke/logo/a-s-kurve/simulierbar-logo-a-s-kurve-profilbild-1080.png`. Nie im Video.
- **30-Tage-Plan:** `data/plan/30-tage.csv`, PDF `docs/plan/30-tage-plan.pdf` (neu erzeugen: `node tools/plan_pdf.mjs`). GTA 6 und Spurwechsel gepostet (alte Version, kein Neubau). Treppe und Gehalt im Plan als „fertig, übergeben“ markiert. Nächste Videos laut Plan: 02.11. mittag Fußgängerampel, 02.11. abend Steuererklärung oder Überstunden.
- **Gedächtnis:** PreCompact-Hook sichert nach `.sitzung/` (nicht im Repo), SessionStart-Hook erinnert nach `/compact` ans Lesen. Funktioniert (heute nach dem Komprimieren genutzt).
- **Repo ist öffentlich.** Empfehlung: auf privat stellen. Keine Konkurrenzinhalte, keine Gesprächsverläufe im Repo.
- **Trend-Radar:** täglich 05:35 Uhr. Telegram noch nicht eingerichtet.
- **Neue Trend-Vorschläge (01.11.):** Tankrabatt endet 31.12. (Score 80, posten 15.–23.12.), Weihnachtsbaum teurer (Score 70, schwächer, posten 01.–08.12.), Details in `docs/trends/vorschlaege.md`.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | Treppe 12:00 und Gehalt 20:00 posten (KI-Schalter AN, Caption oben), vorher einmal mit Ton anhören | Inhaber | 15 Min. | heute |
| 2 | Logo A als TikTok-Profilbild hochladen | Inhaber | 2 Min. | heute |
| 3 | Repo auf privat stellen (GitHub → Settings → General → Change visibility) | Inhaber | 2 Min. | offen |
| 4 | Produktion 02.11.: Fußgängerampel und Steuererklärung oder Überstunden | Claude (Agenten) | – | erledigt, beide übergeben |
| 4b | 02.11. Fußgängerampel 12:00 und Steuererklärung 20:00 posten (KI-Schalter AN), vorher mit Ton anhören | Inhaber | 15 Min. | 02.11. |
| 4d | Account 2: Fragen aus der Antwort vom 01.11. beantworten (Kalibrier-Video hochladen, Stimme, Ich- oder Du-Perspektive, neuer Account, Videos vom 02.11. nachbessern ja/nein) | Inhaber | 20 Min. | offen |
| 4c | Startsignal für 03.11.: „Schere, Stein, Papier“ (Stil 3 Clay) und „Mittagessen im Job“ (Stil 6 Collage) | Inhaber | – | offen |
| 5 | Windows-PC einrichten (Claude Code, Node, ffmpeg, Blender), um mit GPU zu rendern | Inhaber plus Claude | 30–60 Min. | empfohlen |
| 6 | TikTok-Konto öffentlich, Buffer-Test, Telegram (`docs/13`) | Inhaber | 30 Min. | offen |
| 7 | Nach 48 Std.: Aufrufe, Wiedergabedauer und Abbruchstelle von Treppe und Gehalt aus TikTok Studio an Claude geben, damit wir messen statt raten | Inhaber | 5 Min. | 03.11. |
| 8 | ElevenLabs-Plan beobachten (Credits), Impressum-Link, Nebentätigkeit klären | Inhaber | – | später |

## Offene Punkte
- [ ] Teppich-Pegel (−10 dB) und Effekte mit Ton abnehmen (Rückmeldung des Inhabers nach dem Anhören)
- [ ] Position des Folgen-Elements auf echtem Gerät prüfen
- [ ] Keine gelbe Teamfarbe mehr (Konflikt mit Untertitel-Gelb), in `docs/15` bzw. Engine-Standard aufnehmen, sobald bestätigt
- [ ] Plan: „120 oder 130 km/h“ ist optisch nah an K2, bleibt mit eigenem Winkel (Tagesoptik, Euro pro Stunde)
- [ ] Vor der Produktion prüfen: Tank-12-Uhr-Regel, Pendlerpauschale 2026, Steuerklassen 3/5 (Liste in `docs/12`)
- [ ] Firecrawl-Credits fast leer (Recherche läuft über die Websuche)
- [ ] Text-Überlappungs-Prüfung `pipeline/qc/text_ueberlappung.mjs` (neu, Aufruf im `pipeline/README.md`) ab jetzt bei jedem Video vor der Übergabe laufen lassen; prüft bisher HUD-Texte, keine Texturen in der 3D-Szene. Hat beim Steuer-Video 3 und bei der Ampel 56 Paare gefunden, die der Maßstab-Prüfung entgangen sind. Für andere Szenen ggf. anpassen
- [x] PDF des Plans neu erzeugt (01.11., Status der vier fertigen Videos aktuell)
