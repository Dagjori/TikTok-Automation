# STATUS

**Stand:** 01.11.2026, ca. 06:45 Uhr · **Heute fertig und übergeben:** „Treppe oder Aufzug“ (Posting 12:00) und „200 € oder 100 € steuerfrei“ (Posting 20:00). Nächste Produktion erst auf Startsignal des Inhabers.

## Heute (01.11.) fertig

| Video | Stil | Länge | Abnahme | Datei (nicht im Repo) | Caption |
|---|---|---|---|---|---|
| Treppe oder Aufzug | 12 Comic-Toon, „Warum?“ als 13 Blaupause | 74,2 s | 12/12 Pflichtpunkte, −14,0 LUFS, Sync 0 ms, Kontaktbogen gesichtet | `pipeline/out/treppe-aufzug/treppe-aufzug_tiktok.mp4` | Treppe oder Aufzug: Wer ist schneller oben? 🏢 Ich hab's simuliert. Team Treppe oder Team Aufzug? 👇 #treppe #aufzug #büro #wissen #simulation |
| 200 € oder 100 € steuerfrei | 14 Glas-Labor | 66,1 s | 12/12 Pflichtpunkte, 11/11 Hinweise, −14,0 LUFS, längste Ruhe 1,56 s, Schleife ja, Kontaktbogen gesichtet | `pipeline/out/gehalt-steuerfrei/gehalt-steuerfrei_tiktok.mp4` | 200 € mehr Gehalt oder 100 € steuerfrei – was bringt netto mehr? 💶 Ich hab's durchgerechnet. Team Gehalt oder Team steuerfrei? 👇 #gehaltserhöhung #nettogehalt #steuern #wissen #simulation |

- **Treppe:** Bis zum 4. Stock gewinnt die Treppe (46 gegen 49 s), bei zwei Fremdhalten bis zum 6. Stock. Das Ergebnis hängt an 25 s Wartezeit auf den Aufzug (bei 15 s gewinnt der Aufzug) und dürfte Kommentare auslösen.
- **Gehalt:** 3.500 € brutto, Steuerklasse 1: +200 € brutto ergeben 109,75 € netto, das Gehalt gewinnt um 9,75 €. Bei 5.500 € brutto bleiben nur 99,09 €, dann gewinnt steuerfrei. Zweite Überraschung: Extras bringen keine Rentenpunkte (+0,046 Punkte ≈ +1,96 € Rente/Monat je Jahr). „100 € steuerfrei“ = 50 € Gutschein (§ 8 Abs. 2 S. 11 EStG) + 50 € Jobticket (§ 3 Nr. 15 EStG). Quellen intern in `skript.json`. Netto-Modul `pipeline/sim/netto.mjs` (PAP 2026, 11 Tests).
- **Beide Videos:** Hook bzw. „Los geht's“ je um 0,25 s Stille gekürzt, damit die Zeitgrenzen halten; Sprechtempo unverändert.
- **Nicht gehört:** Klangteppich und Effekte sind nur gemessen. Der Inhaber hört vor dem Posten einmal mit Ton rein.
- **Bekannt:** Im Gehalt-Video ist Team „steuerfrei“ gelb, das aktuelle Untertitel-Wort ist ebenfalls gelb. Bei künftigen Videos keine gelbe Teamfarbe mehr wählen (Untertitel-Gelb ist reserviert).

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
| 4 | Startsignal für 02.11.: Fußgängerampel (mittag) und Steuererklärung oder Überstunden (abend), Konkurrenz-Check und Fakten vorher prüfen | Inhaber → Claude | ca. 3–4 Std. Agentenzeit je Video | wartet |
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
- [ ] PDF des Plans zeigt für Treppe und Gehalt noch „geplant“ (bei der nächsten Plan-Änderung neu erzeugen)
