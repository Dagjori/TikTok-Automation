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

## Neue Regeln 02.11. (Inhaber)
- Pro Tag genau 4 Videos (2 je Account) für den nächsten Tag, nie mehr gleichzeitig, max. 2 Produktions-Agenten. Ruhiger Ton, kein „Los geht's“, keine Sticker, Fokus animierte Welt, Skript-Bild-Abgleich, Themen-Logik. `massstab.py` prüft 3b, 5d (0 Sticker), 16a/16b.
- @stelldirvor.pov strikt im Format der 4 Referenzvideos (`docs/16` §12): keine Stimme, 80 s, feste Ich-Perspektive, Titel, Messwert-Anzeige, kursive Sätze, Atmo, schwarzer Abspann. Stickstoff (heute 19:30) wird umgebaut; eigene Prüfung `qc/referenz_pov.py` entsteht dabei.
- Schokolade: fertig (74,5 s, −14,1 LUFS), aber **von Claude abgelehnt, wird nicht gepostet**: Sichtprüfung zeigt verdeckten Titel im ersten Bild (Fensterrahmen) und überlappende 3D-Zahlen bei ca. 63 s; dazu 3 neue Pflichtpunkte nein (Los geht's, 5 Sticker, [excited]). Slot 02.11. 12:30 auf Account 2 bleibt leer. Thema später im Format §12 neu.
- Dienstag in Arbeit: Schere-Stein-Papier (neuer Agent, neue Regeln). Danach gestaffelt: Boden durchsichtig, Mittagessen, Leichtes Auto (als Autobahnbrücke, Format §12). 30-Tage-Plan Account 2 muss auf Format §12 geprüft werden (Themen mit festem Standpunkt).
- Regelwerk-PDF `docs/regelwerk/regelwerk-2026-11-02.pdf`.

## Cockpit und Übersicht (02.11.)
- **Kanal-Cockpit** (private Webseite, Datenbank): https://claude.ai/artifact/FxZc6Cpodsg12hapn6Bpxz · Quelle `docs/cockpit/cockpit.html`. Sammlung `videos` (ein Dokument je Video, z. B. `a2-2026-11-03-mittag`, Felder status, score, inhaber{entscheidung,kommentar,zeit}) und `stand/aktuell` (produktion, hinweis, offen). Claude pflegt Status täglich per ArtifactData und liest Freigaben bzw. Kommentare des Inhabers aus (`inhaber`).
- **PDF Account 2:** `docs/plan/account2-uebersicht-2026-11-02.pdf` (erzeugt mit `tools/account2_uebersicht.py` und `tools/html_pdf.mjs`).
- Account-2-Themen 03./04.11. an Format §12 angepasst (`data/plan/account2-naechste-tage.json`): Laacher See (75), Phantomstau von der Brücke (76), Sonnensturm (77), Stromausfall/Lichter aus (78). Restplan (05.11. ff.) noch nicht §12-geprüft.

## Account 2 Neuausrichtung (02.11., Inhaber) – erledigt
- Kein „5 Sekunden“ mehr. Themen: große globale Wissenschafts-Gedankenexperimente, Vorbild Lunar Animations.
- **Skill** `.claude/skills/stelldirvor-video/` (nur Account 2): SKILL.md, design.md, licht-und-effekte.md, ablauf.md, ton.md, technik.md, pruefung.md. Baukasten `engine/stil_lunar_pov.js`, `engine/lunar_hud.js`, `stil_lunar_pov.css`, Schriften Crimson Pro und Inter (OFL), `pipeline/atmo.py`, Prüfung `qc/referenz_pov.py` (22 Pflichtpunkte) und `qc/text_ueberlappung_pov.mjs`. Demo `projekte/_demo-lunar-pov/` (nicht zum Posten) besteht alle Punkte.
- **Qualitätslücke:** Schrift, Layout, Abspann und Ton treffen die Referenzen; die 3D-Welt nicht (Detaildichte, Wolken/Rauch, leere Höhepunkt-Bilder). Regel: Jede Grundwelt wird beim Erstbau auf Referenzniveau gebracht (Skill SKILL.md, pruefung.md §2).
- **Korrektur:** Titel 0,4–4,4 s wie gemessen (vorher eigene Regel 0–3,5 s). Etikett, Unterzeile und Faktenzeile serifenlos (docs/16 §12b).
- **Neuer Plan:** `data/plan/account2-30-tage.csv`, `account2-plan.json` (75 Einträge, Sätze für die ersten 8), `docs/17`, PDF `docs/plan/account2-30-tage-plan.pdf`. Alte `account2-naechste-tage.json` gelöscht (Laacher See usw. ersetzt).
- **Cockpit:** alle 60 Account-2-Themen als Status „idee“ eingetragen (03.11.–02.12.), alte Einträge 03./04.11. ersetzt. Übersicht-PDF `docs/plan/account2-uebersicht-2026-11-02.pdf` neu, Regelwerk `regelwerk-2026-11-02-nachmittag.pdf`.

## Simulierbar Schwerpunkt Geld (02.11. abends, Inhaber)
- Neuer Plan 03.11.–02.12.: 60 Videos (53 GELD, 7 ALLTAG mit Euro-Ergebnis) plus 15 Reserve, Ø Maßstab-Score 82,3. Zeilen 31.10.–02.11. unverändert. `data/plan/30-tage.csv`, `data/plan/simulierbar-plan.json` (mit Captions), `docs/12` neu, `docs/05` angepasst, PDF `docs/plan/30-tage-plan.pdf` (40 Seiten).
- Konkurrenz-Sperrliste in `docs/12` §3.4 (u. a. @kontostand.vs, @wissentogo_de, @alltaginzahlen, @kurzsimuliert). Rohdaten nur im Scratchpad.
- Offen: Werte mit „prüfen“ (Homeoffice-Pauschale, Grundfreibetrag 2026 u. a., Liste `docs/12`), Rente mit 63 am 04.11. ist politiknah (Tausch mit Reserve möglich).

## Cockpit-Verbindung (02.11. abends, Inhaber)
- Cockpit Version 2 mit Fähigkeit `comments`: Freigeben/Ablehnen/Kommentar senden zusätzlich „an Claude“ (weckt die beobachtende Sitzung). Antwort von Claude steht im Feld `claude.antwort`.
- Alle 60 Simulierbar- und 60 Account-2-Themen sind im Cockpit (Status „idee“).
- **Verpasste Entscheidungen von 10:55 UTC** (vor der Verbindung) nachgeholt: Mittagessen (frei, bleibt 03.11. abends), Schere-Stein-Papier (frei, aber durch Geld-Plan ersetzt, Reserve), Stickstoff Account 2 (frei mit Kommentar „sofort posten“, aber durch die spätere Regel „kein 5 Sekunden“ überholt und gesperrt). Antworten stehen im Cockpit.

## Heute 02.11. (Nachmittag)
- **Account 2 Eiszeit Toronto:** fertig (80 s, 22/22 Pflichtpunkte, 0 Text-Überlappungen, −14,5 LUFS, Kontaktbogen gesichtet, Faktenzeile zweizeilig nachgebessert). In Buffer eingeplant 02.11. 19:30 (Post `6ae8af082810e4a79d35d1a9`, ohne KI-Label). Nachprüfung als geplante Erinnerung 18:50 UTC. Welt `engine/welt_grossstadt_dach.js` wiederverwendbar; Schwächen für den nächsten Einsatz: Gebäude gleichförmig, Winterphase milchig, Eiswand glasig, Weißblende zu früh.
- **Plan Account 2:** Eiszeit auf 02.11. vorgezogen, Lücke 03.11. 12:30 mit Reserve „Seil um den Äquator“ gefüllt (kein Vorrücken, Abstandsregeln `docs/17` §3.4). CSV, JSON, PDF, Cockpit aktualisiert.
- **Render-Dienst für den Windows-PC** (Inhaber: Arbeit bleibt in der Cloud, nur Rendern auf den PC): `pipeline/render_dienst/`, Anleitung `docs/18-render-pc.md`, in der Cloud end-to-end getestet (ohne GPU). Aufruf: `auftrag.py senden <projekt> --konto …`, dann `warten`; Exit 3 = PC offline → Cloud-Render. GPU unter Windows noch ungetestet. Für künftige Sitzungen muss `SUPABASE_URL` als Umgebungsvariable der Cloud-Umgebung gesetzt sein (Inhaber).
- **Skill `simulierbar-video` fertig und abgenommen:** `.claude/skills/simulierbar-video/`, Stile 17 Nachtstadt-Miniatur (4,0 s/Bild Cloud), 18 Dunkles Studio (2,3), 19 Architekturmodell (2,5), 20 Glas & Licht (1,7), 21 Nachtkarte (1,9); Baukasten `engine/sim_atmosphaere.js`, `sim_hud.css`, je Stil `engine/stil_*.js`, Demo `projekte/_demo-simulierbar`; Prüfpunkt 18b „Stil erlaubt“ in `massstab.py`. Plan (60 + 15 Reserve) und Cockpit-Stilfelder umgestellt, Vergleichsbild `docs/plan/stile-17-21-vergleich.jpg`, Regelwerk `docs/regelwerk/regelwerk-2026-11-02-spaet.pdf`. Für 03.11. fehlen themenspezifische Objekte (Taxi-Schild, Küche/Büro), ca. 1–3 Std. je Video.
- **Modelle:** tägliche Produktion Sonnet, Opus nur für neue Welten und Abnahme; Warten auf Renders ohne Modell.

## Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | Plan, Demo-Bilder und Regelwerk ansehen, Startsignal für die Produktion geben | Inhaber | 15 Min. | offen |
| 2 | Nach Startsignal: 03.11. produzieren (Account 2: Seil um den Äquator und Sonne 1 m, beide Grundwelt Berg-/Seeblick; Simulierbar laut `data/plan/30-tage.csv`), je Grundwelt Erstbau auf Referenzniveau, max. 2 Agenten (Sonnet) | Claude | ca. 2 Std. Render je Video (Cloud) | wartet |
| 3 | Ampel (12:30) und Steuer (19:30) auf Simulierbar sind für heute in Buffer eingeplant (alter Stil) | Inhaber | – | keine Rückmeldung, bleiben |
| 4 | Windows-PC nach `docs/18-render-pc.md` einrichten (Render-Dienst), danach erster GPU-Testauftrag | Inhaber, dann Claude | ca. 1 Std. | offen |
| 5 | Repo auf privat stellen, ElevenLabs-Guthaben prüfen | Inhaber | 5 Min. | offen |
| 6 | Nach 14 Tagen Posting-Zeiten mit Zahlen aus TikTok Studio nachjustieren | Claude | 30 Min. | 16.11. |

## Offene Punkte
- [ ] Teppich-Pegel (−10 dB) und Effekte mit Ton abnehmen (Rückmeldung des Inhabers nach dem Anhören)
- [ ] Position des Folgen-Elements auf echtem Gerät prüfen
- [ ] Keine gelbe Teamfarbe mehr (Konflikt mit Untertitel-Gelb), in `docs/15` bzw. Engine-Standard aufnehmen, sobald bestätigt
- [ ] Plan: „120 oder 130 km/h“ ist optisch nah an K2, bleibt mit eigenem Winkel (Tagesoptik, Euro pro Stunde)
- [ ] Vor der Produktion prüfen: Tank-12-Uhr-Regel, Pendlerpauschale 2026, Steuerklassen 3/5 (Liste in `docs/12`)
- [ ] Firecrawl-Credits fast leer (Recherche läuft über die Websuche)
- [ ] Text-Überlappungs-Prüfung `pipeline/qc/text_ueberlappung.mjs` (neu, Aufruf im `pipeline/README.md`) ab jetzt bei jedem Video vor der Übergabe laufen lassen; prüft bisher HUD-Texte, keine Texturen in der 3D-Szene. Hat beim Steuer-Video 3 und bei der Ampel 56 Paare gefunden, die der Maßstab-Prüfung entgangen sind. Für andere Szenen ggf. anpassen
- [x] PDF des Plans neu erzeugt (01.11., Status der vier fertigen Videos aktuell)
