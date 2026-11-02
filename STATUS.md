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
- **Bestätigt 01.11. abends:** Nische „Was wäre, wenn …“-POV (Du-Perspektive), Stimme Otto `FTNCalFNG5bRnkkaP5Ug`, Logo „Fragezeichen-Countdown“ (`marke/account2/`). Namensvorschläge `docs/16` §11.
- Inhaber 01.11.: POV-Stil wie @man_ia_c, nur Blender/Three.js, neue deutsche v4-Stimme; alter Account hat nur 130 Follower (Gesundheit, inaktiv seit 08/2024). Empfehlung von Claude: neuen Account anlegen. @angenommen.pov (0 Videos) hat das Konzept am 07.10. reserviert, also Tempo.
- Neu: Sticker max. 5 je Video (Prüfpunkt 5d) und Inhalte mittig: Engine umgestellt auf Achse 540, Schutzzone symmetrisch 150 px (Testrender der Demo geprüft). Kein Kalibrier-Test (Inhaber). Videos vom 02.11. bleiben, wie sie sind.
- Regelwerk-PDF: `docs/regelwerk/regelwerk-2026-11-01.pdf` (Quelle `docs/regelwerk/regelwerk.html`, `node tools/regelwerk_pdf.mjs`). Bei jeder Regeländerung neu erzeugen und schicken.
- Modelle: Hauptsitzung Opus 5.5 (Effort xhigh). Produktions-Agenten ab jetzt mit Sonnet 5.5 (bisher versehentlich Opus).

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
- **Neuer Trend-Vorschlag (02.11.):** Heizung nachts runter oder durchheizen (Score 82, spätestens 20.12.), Details in `docs/trends/vorschlaege.md`. Regel-Check 02.11.: Community Guidelines Released 25.08.2026 / Effective 24.09.2026, CRP EWR unverändert (Basis).
- **Neue Trend-Vorschläge (01.11.):** Tankrabatt endet 31.12. (Score 80, posten 15.–23.12.), Weihnachtsbaum teurer (Score 70, schwächer, posten 01.–08.12.), Details in `docs/trends/vorschlaege.md`.

## Neue Regeln Automatisierung (01.11. abends)
- Kein KI-Label, Posten ohne Freigabe (Claude prüft und plant selbst über Buffer), jeder Post mit Caption, Posting-Zeiten beide Accounts Mo–Fr 12:30/19:30, Sa–So 09:30/19:30 (je 2 pro Tag). Buffer Essentials gebucht. Testvideo Account 2 („Stell dir vor, Schall hat fünf Sekunden lang nur noch Schritttempo“, S-Bahn-Steig) direkt nach Prüfung posten; ab 02.11. 12:30 Normalbetrieb: 02.11. Simulierbar Ampel 12:30, Steuer 19:30; Account 2: 02.11. 12:30 „Wie hoch bringt dich eine Tafel Schokolade?“ (Küche), 19:30 „Stickstoff 5 Sekunden weg“ (Supermarkt), beide in Produktion (Sonnet, Vorlage Prototyp); 03.11. 12:30 „Boden durchsichtig“ (Schulhof, Start nach den Renders vom 02.11.), 03.11. 19:30 Ersatzthema folgt (Licht-Thema zu nah am Prototyp, ab 12.11.). CPU-Last hoch (4 Kerne, mehrere Renders), Reihenfolge per nice: Prototyp > Schokolade > Stickstoff > Simulierbar 03.11. Regelwerk-PDF `docs/regelwerk/regelwerk-2026-11-01-abends.pdf`.
- In Arbeit: Umbau `post_buffer.py` auf direktes Planen (Agent), 30-Tage-Plan Account 2 (Agent, `docs/17`, `data/plan/account2-30-tage.csv`), erstes Video `@stelldirvor.pov` (Prototyp „schall-schritttempo“), Simulierbar 03.11. (Schere, Stein, Papier; Mittagessen).
- Offen: Posting-Zeiten in `docs/11` §3C eintragen, sobald der Agent mit `docs/11` fertig ist. Inhaber zeigt später Konkurrenzvideos für Account 2.

**Eingeplant in Buffer (01.11. 21:39):** simulierbar 02.11. 12:30 Fußgängerampel (Post `6ae7a3541120555c2a3641b0`), 02.11. 19:30 Steuererklärung oder Überstunden (`6ae7a35f1120555c2a364536`), beide ohne KI-Label, Status scheduled. Buffer zieht das Video erst beim Posten von Supabase (Link gültig bis dueAt + 12 h), daher Supabase-Dateien erst nach `--nachpruefen` löschen. Erinnerungen an mich: 02.11. 10:15 UTC (Schokolade eingeplant?), 11:50 UTC und 18:50 UTC (Nachprüfung). Log `pipeline/out/buffer_log.jsonl` liegt nur im Container.

**02.11. 06:40 UTC:** Testvideo Account 2 „Schall in Schritttempo“ (74,1 s, 13/13 Pflichtpunkte, 0 Text-Überlappungen, −14,1 LUFS, STT passt, Kontaktbogen gesichtet; Abnahme durch Claude, da der Prototyp-Agent am Nutzungslimit abbrach) über Buffer gepostet: Post `6ae82d2564604db314449174`, fällig 06:41 UTC, Upload-Kopie 43,8 MB. **Test bestanden:** gesendet 06:43 UTC, öffentlich (privateItem=false), 74 s, kein KI-Label, Supabase-Datei gelöscht. Die Automatik-Kette funktioniert vollständig. Schokolade (Frist 09:30 UTC) und Stickstoff (Frist 15:00 UTC) laufen weiter. Vom Inhaber gestoppt und nicht fortsetzbar: Schere-Stein-Papier, Mittagessen, Boden durchsichtig, Leichtes Auto, Plan-Agent (CSV fertig, `docs/17` fehlt); Neustart nur auf ausdrücklichen Auftrag.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | Treppe 12:00 und Gehalt 20:00 posten (KI-Schalter AN, Caption oben), vorher einmal mit Ton anhören | Inhaber | 15 Min. | heute |
| 2 | Logo A als TikTok-Profilbild hochladen | Inhaber | 2 Min. | heute |
| 3 | Repo auf privat stellen (GitHub → Settings → General → Change visibility) | Inhaber | 2 Min. | offen |
| 4 | Produktion 02.11.: Fußgängerampel und Steuererklärung oder Überstunden | Claude (Agenten) | – | erledigt, beide übergeben |
| 4b | 02.11. Fußgängerampel 12:00 und Steuererklärung 20:00 posten (KI-Schalter AN), vorher mit Ton anhören | Inhaber | 15 Min. | 02.11. |
| 4d | Account 2: Account anlegen, Name, Profilbild, Bio | Inhaber | 15 Min. | erledigt 01.11. abends (Inhaber: „2. tiktok account steht jetzt auch“), Handle `@stelldirvor.pov` (aus Buffer gelesen) |
| 4e | Prototyp Account 2 (neuer Szenentyp, Opus): deutscher Ort, Du-Perspektive, eigenes Thema mit Rechnung | Claude (Agent) | 1–2 Agententage | bereit, wartet auf Startsignal |
| 4c | Startsignal für 03.11.: „Schere, Stein, Papier“ (Stil 3 Clay) und „Mittagessen im Job“ (Stil 6 Collage) | Inhaber | – | offen |
| 5 | Windows-PC einrichten (Claude Code, Node, ffmpeg, Blender), um mit GPU zu rendern | Inhaber plus Claude | 30–60 Min. | empfohlen |
| 6 | Buffer eingerichtet, beide TikTok-Accounts verbunden (01.11. abends). Buffer-API funktioniert (Netzwerk-Secret, 2 Kanäle: simulierbar, stelldirvor.pov). Test Gehalt-Video (gesendet 19:57): **öffentlich ja, KI-Label fehlt** (`aigcLabelType` leer, Treppe hat 1). Klären, ob über Buffer gepostet. Supabase funktioniert (01.11. 20:25 UTC: Upload, signierter Link, Löschen getestet; Fehler vorher: Hostname stand im Feld Header-Name). `pipeline/post_buffer.py` fertig (Entwurf per API, `isAiGenerated`). Supabase Storage einrichten (Inhaber wählt Weg A; max. 50 MB je Datei im Gratis-Plan). YouTube vorerst nicht. Danach baut Claude `pipeline/post_buffer.py` (Entwürfe mit Caption, Zeit aus dem Plan, KI-Flag AN). Produktion 03.11. und Prototyp Account 2 starten erst, wenn alles steht (Inhaber). Telegram (`docs/13`) weiter offen | Inhaber, dann Claude | 20 Min. plus 1–2 Std. Claude | läuft |
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
