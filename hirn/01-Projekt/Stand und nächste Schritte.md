---
typ: plan
konto: gemeinsam
status: aktuell
datum: 2026-11-08
quelle: CLAUDE.md §11
tags: [konto/gemeinsam, stand, naechste-schritte]
cssclasses: [konto-gemeinsam, typ-plan]
---

# Stand und nächste Schritte

**Stand 08.11.2026:** Wachstums-Recherche ins Hirn übernommen (Punkt 12, [[Wachstum auf 10.000 Follower]]): Zielgröße Follows je Video, Serien nach Treffern, Profil, Antwort-Videos und Stitch, Folgen-Hinweis- und Einstiegs-Tests, Finanz-Formulierungen, Radar für Account 2. **Stand 07.11.2026:** REA-Regelwerke freigegeben (Punkt 8), Produktions-Skill gebaut (Punkt 9), Originalitätsregeln für die Themenwahl (Punkt 10), Cockpit neu als ruhige Regie mit Live-Karten und Automatik (Punkt 11). Die Abschnitte zu den Accounts unten sind auf dem Stand 02.11. **Stand 02.11.2026, spätabends.** Seit heute Abend: Account 1 nur Geld, kein Plan, keine Sperrlisten, Ideen-Studio und tägliche Lernschleife (siehe [[Regelwerk]]). Diese Notiz ist die lebende Statusseite: am Ende jeder Arbeitseinheit aktualisieren (und CLAUDE.md §11 angleichen). **F** = belegt, **S** = Schätzung, **A** = Annahme.

## Account 1 `@simulierbar`
- Gepostet: GTA 6 und Spurwechsel (31.10., alte Version), „Treppe oder Aufzug“ und „200 € oder 100 € steuerfrei“ (01.11.).
- 02.11. gepostet: „Fußgängerampel“ 12:30 und „Steuererklärung oder Überstunden“ 19:30 (Posts `6ae7a3541120555c2a3641b0`, `6ae7a35f1120555c2a364536`, alter Stil, ohne KI-Label). **Nachprüfung 02.11. 19:17 UTC: beide öffentlich (66 s bzw. 67 s), ohne KI-Label.**
- Reißverschluss nicht gepostet (Konkurrenz @simulierts zuerst).
- **Skill fertig** ([[Account Simulierbar Überblick]]): Stile 17–21; für 03.11. fehlen themenspezifische Objekte (Taxi-Schild, Küche/Büro, je 1–3 Std.).

## Account 2 `@stelldirvor.pov`
- Testvideo „Schall in Schritttempo“ (02.11., Automatik-Kette bestanden).
- **„Eiszeit Toronto“** (Referenzformat, 80 s, 22/22 Pflichtpunkte, −14,5 LUFS) am 02.11. 19:30 gepostet (Post `6ae8af082810e4a79d35d1a9`); **Nachprüfung 19:17 UTC: öffentlich, 80 s, ohne KI-Label.** Schwächen der Welt `engine/welt_grossstadt_dach.js`: Gebäude gleichförmig, Winterphase milchig, Eiswand glasig, Weißblende zu früh.
- Abgelehnt: „Schokolade“ (verdeckter Titel, überlappende Zahlen), „Stickstoff“ (gesperrt, 5-Sekunden-Rahmen). Gestoppt, nur auf Auftrag neu: Schere-Stein-Papier, Boden durchsichtig, Leichtes Auto; „Mittagessen“ (halb gebaut) wird in Stil 19 neu gebaut.
- **Skill fertig** ([[Account stelldirvor.pov Überblick]]); **Qualitätslücke:** Schrift, Layout, Abspann, Ton treffen die Referenzen, die 3D-Welt nicht ([[Format Account 2 Lunar]]).

## Infrastruktur
- **Render-PC läuft** (RTX 2070, 0,04 s/Bild, ca. 3 Min. je Video, getestet 02.11.); **Autostart und Energieoptionen offen** ([[Render-Dienst Windows-PC]]).
- **`SUPABASE_URL`** in der Cloud-Umgebung eingetragen, in dieser Sitzung noch nicht aktiv ([[Technik und Umgebung]]).
- Cockpit läuft (120 Themen als `idee`, [[Cockpit]]). Radar läuft täglich, Telegram fehlt ([[Trend-Radar]]).
- **Recherche „simulation“ (02.11.):** TikTok-Suche und Hashtag-Seite liefern ohne Login keine Treffer; ausgewertet wurden 50 Videos von 6 Konten über Embed-Widget und öffentliche Videoseiten (Rate-Limit 429 nach ca. 40 Abrufen, respektiert). Ergebnis und 5 offene Fragen: [[Simulation-Trendanalyse-2026-11-02]].
- **Wissensstruktur:** alles Wissen in CLAUDE.md (kompakt, lädt automatisch) und in diesem Hirn (`hirn/`, Details); Regelwerk-PDF aktuell.
- Radar-Vorschläge offen: Tankrabatt (80), Weihnachtsbaum (70), Heizung nachts (82, gesperrt, nur mit eigenem Winkel). Regel-Check 02.11.: Community Guidelines und CRP EWR unverändert.

## Nächste Schritte
| # | Was | Wer | Zeit |
|---|---|---|---|
| 1 | **PC: Autostart (Aufgabenplanung) und Energieoptionen** nach [[Render-Dienst Windows-PC]] Schritt 8 und 9; Dienst-Fenster offen lassen | Inhaber | 10 Min. |
| 2 | **03.11. im Ideen-Studio:** Simulierbar „Studium oder Ausbildung“ (12:30) und „Kind bis 18“ (19:30) sind freigegeben → Knopf „An Claude Code übergeben“; Account 2: 2 der 10 Ideen wählen → „Skripte recherchieren lassen“ → freigeben → übergeben. Die Tages-Sitzung produziert (Sonnet-Agenten, max. 2), rendert auf dem PC und plant in Buffer | Inhaber (Klicks), dann Claude Code automatisch | 5 Min., dann ca. 2–4 Std. Arbeit je Video ohne dich |
| 3 | ~~Nachprüfung der Posts vom 02.11.~~ **erledigt** (19:17 UTC, alle drei öffentlich, Supabase-Dateien gelöscht, Cockpit auf „gepostet“) | Claude | – |
| 4 | Stile 17–21 erstmals auf der GPU messen (Taxi) | Claude | nebenbei |
| 5 | Repo auf privat stellen (**erst nach Lesezugang für den PC**), ElevenLabs-Guthaben prüfen, Telegram einrichten | Inhaber/Claude | 5–15 Min. je |
| 6 | 16.11.: Posting-Zeiten und Reihenfolge Wochen 3–5 mit Zahlen nachjustieren | Claude | 30 Min. |
| 7 | ~~Hirn auf dem Desktop einrichten (ZIP entpacken)~~ **erledigt 07.11.: direkter Abgleich statt ZIP** ([[Technik und Umgebung]]); offen: CLAUDE.md schlanker machen (Verweis auf das Hirn) | Claude | – |
| 8 | ~~REA-Regelwerke freigeben~~ **erledigt 07.11.:** [[REA Simulierbar Regelwerk]], [[REA stelldirvor Regelwerk]], [[REA Übergreifend]] freigegeben (Endstand bei ca. 80 %, dunkle Stile zuerst, neutrale Erzählhaltung, fester Schlusssatz entfällt; Account 2 Ereignis bei ca. 8 s auf Countdown-Null; übrige Regeln Standard), Befehle im Cockpit angepasst ([[Entscheidungen Log]]). **Offen:** weitere Videos für belastbare Erfolgsfaktoren (Simulierbar 6 starke + 1 schwaches, stelldirvor 6 starke + 3 schwache bis zum Minimum 12 + 4) | Inhaber (Videos hochladen) | nebenbei |
| 10 | **Originalitätsregeln im ersten echten Lauf prüfen** ([[Originalität und Themenfindung]]): Läuft die Websuche im Ideen-Auftrag des Cockpits (Feld „Originalität“ nicht „ungeprüft“), stehen Zutat und Themenfeld bei jeder Idee, ist keine Idee von der Anti-Liste? Der Trend-Radar kennt die Anti-Liste noch nicht | Claude (beim nächsten Ideen-Auftrag) | – |
| 9 | ~~Neuer Produktions-Skill~~ **erledigt 07.11.:** Skill `video-produktion` (eine Weiche, Teile `simulierbar.md` und `stelldirvor.md`, Regeln aus dem Hirn), Prüfskripte auf die REA-Regeln umgestellt (Tempo auch nach Silben/s), Verweise umgestellt ([[Entscheidungen Log]]). **Offen:** Erstlauf am nächsten echten Video je Account (Opus nimmt Punkt für Punkt ab), danach im Skill §4 als „erprobt“ markieren; Baustein „Statuszeile“ für Account 1 fehlt noch in der Engine | Claude (beim nächsten Video) | – |
| 12 | **Wachstums-Regeln vom 08.11. umsetzen** ([[Entscheidungen Log]] 08.11.). **Inhaber in der App (einmalig, ca. 20 Min.):** je Account 3 Videos anpinnen, Bio mit Versprechen und Takt (Simulierbar: „Alltag“ → Geld), bei Account 2 Stitch und Duett als Konto-Standard freischalten ([[Profil und Follow-Umwandlung]], [[Kommentare Antwort-Videos und Stitch]]); **wöchentlich ca. 15 Min.** neue Follower, Profilaufrufe, Herkunft und Kurve je Video aus TikTok Studio ([[Lernschleife und Insights]]). **Claude (Code, nur nach Auftrag):** Cockpit misst den Follower-Zuwachs 24 h nach jedem Post und meldet Treffer (≥ 3× Median) als Idee „Teil 2“; `pipeline/post_buffer.py` setzt ein Cover-Bild; `tools/chat_befehle.py` und die Befehl-Notizen: Klassiker bis 3 von 10, Ausnahme für Folgeteile, Weiterschick-Wert, Suchbegriff in der Titelfrage; Skill `video-produktion`, `qc/massstab.py` und `qc/referenz_pov.py`: Folgen-Hinweis als Textzeile am Ende (nur Testblöcke), Account-2-Testblöcke inkl. 62–70 s; Engine-Baustein für die Textzeile am Ende. **Radar-Sitzung:** Prompt um Account 2 erweitern ([[Trend-Radar]]). **Offen, nicht gewählt:** KI-Label für Simulierbar (Befund in der Recherche) | Inhaber (App), Claude (Code nach Auftrag) | App 20 Min., Code mehrere Std. |
| 11 | **Neues Cockpit aktivieren:** nach Ende der laufenden Produktion im Cockpit ♻ (Laptop vorher `git pull` im Arbeitsklon, am PC ebenso); dann laufen die vier Automatiken (Recherche nach Wahl, Produktion nach Freigabe, Ideen morgens 07:00, Fehler einmal wiederholen) – erster echter Tag: prüfen, dass jede Automatik genau einmal auslöst (Laptop und PC) | Inhaber (♻), Claude (Prüfung) | 2 Min. |

## Offene Punkte
- [x] **Lernschleife 05.11.:** Stil 18 nur mit belebter Szene, im Cockpit freigegeben (05.11. abends, steht in [[Regelwerk Simulierbar]]).
- [x] **Lernschleife 04.11.:** Hook als Duell im ersten Satz, im Cockpit freigegeben (04.11. abends, steht in [[Videoaufbau Simulierbar]]).
- [x] **Lernschleife 03.11.:** Account 2 Einstieg dichter (freigegeben 04.11., Hinweis 13 in `referenz_pov.py`; seit 07.11. zusätzlich Ereignis bei ca. 8 s) und Themenwahl große Lebensentscheidungen (freigegeben 03.11. abends, in den Befehlen).
- [ ] **Laufende Tests seit 07.11.** (Folgen-Aufruf, hell gegen dunkel, später Endstand, frühes Ereignis): [[Lernschleife und Insights]]. **Seit 08.11.:** Folgen-Hinweis am Ende (Blöcke 10/10, beide Accounts), Einstieg Account 2 (Blöcke a–c), Stitch-Test Simulierbar; auswertbar erst mit Follows je Video.
- [ ] Teppich-Pegel (−10 dB), Effekte und Position des Folgen-Elements auf echtem Gerät abnehmen (Inhaber). Engine-Standard „keine gelbe Teamfarbe“ (im Gehalt-Video ist Team „steuerfrei“ gelb, bleibt).
- [ ] Werte mit „prüfen“ je Video klären (Spalte `quellen_pruefen` der Pläne; Liste in [[Auswahl- und Finanzregeln Simulierbar]]); Account 2: Eisdicke Toronto, Genf 1816, Leoniden-Maximum, COP31-Termin.
- [ ] „Rente mit 63“ (04.11.) ist politiknah (nur Rechnung; Tausch mit Reserve R7 oder R14 möglich).
- [ ] Lunar Animations kann nachlegen: ein neues Lunar-Thema, das ein Planthema trifft, sperrt es (dann Reserve). Embed-Listen zeigen nur die neuesten 5–13 Videos je Konto (**A**).
- [ ] Text-Überlappungs-Prüfung (`qc/text_ueberlappung.mjs`, Account 2 `…_pov.mjs`) bei jedem Video; sie prüft HUD-Texte, keine Texturen in der 3D-Szene.
- [ ] Ob ein Impressum-Link in der Bio das CRP stört, ist von TikTok nicht dokumentiert.
- [ ] **Engine-Aufgaben (Opus, vor dem ersten „Natur“-Video von Account 2 bzw. Einsatz alter Stile bei Account 1):** Natur-Welten im Baukasten (Küste/Meer, Wald, Wüste, Gebirge, Eis; Wasser, Vegetation, Tiere, Sonnenlauf mit Schatten), echter Kamera-Zoom und Fahrt in `PovKamera` (mit Eintrag im Ereignis-Protokoll); Video-Baukästen für die Stile 5, 7–11 und 15 (Account 1, bisher nur Demos).
- [ ] **Neue Prüfwerte sind Startwerte (S):** Hinweise 10–12 in `referenz_pov.py` und das Tempoprofil in `massstab.py` sind nur an wenigen Videos kalibriert. Das letzte Video „Steuererklärung oder Überstunden“ (144 Wörter, 2,15 W/s) fiele im neuen Profil durch; es bleibt unverändert.
- [ ] **Stil 16 (Lunar-POV) bleibt Account 2.** „Alle Stile“ bei Account 1 heißt 1–15 und 17–21.
- [x] Wörtliche Sätze der 4 Vorbildvideos in `massstab.md`: **Entscheidung des Inhabers 02.11.: bleiben so** (Risiko öffentliches Repo; sicherste Lösung wäre, das Repo privat zu stellen).
- [ ] **Widersprüche in den Skill-Quellen klären** (vom Hirn-Aufbau gefunden, Details in [[Prüfung und Abnahme Simulierbar]] und [[Sperrliste und Auswahlregeln Simulierbar]]): Prüfliste 20 Punkte gegen `qc/massstab.py` (13 Punkte nur Hinweis, IDs weichen ab) (Tempo-Widerspruch ist gelöst: 150–190 Wörter, Entscheidung 02.11.) · Konkurrenzzahlen 2,1 Mio./467.800/403.000 keinem Vorbild zuordenbar · Score-Raster „… S“ unerklärt · alte Planzeilen nennen Posting-Zeiten 12:00/20:00.
- [ ] Radar-Prompt dauerhaft auf CLAUDE.md umstellen (nur in der Radar-Sitzung selbst möglich, optional).

## Siehe auch
[[Pläne und Kalender]] · [[Entscheidungen Log]] · [[Index]]
