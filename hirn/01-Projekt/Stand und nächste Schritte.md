---
typ: plan
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §11
tags: [konto/gemeinsam, stand, naechste-schritte]
---

# Stand und nächste Schritte

**Stand 02.11.2026, spätabends.** Diese Notiz ist die lebende Statusseite: am Ende jeder Arbeitseinheit aktualisieren (und CLAUDE.md §11 angleichen). **F** = belegt, **S** = Schätzung, **A** = Annahme.

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
| 2 | **Startsignal 03.11.** geben: Simulierbar Taxi (Stil 17, 12:30) und Mittagessen (Stil 19, 19:30); Account 2 „Seil um den Äquator“ (12:30) und „Sonne 1 m näher“ (19:30); Sonnet-Agenten, max. 2 gleichzeitig; Rendern auf dem PC | Inhaber, dann Claude | 1 Satz, dann ca. 2–4 Std. Agentenarbeit je Video |
| 3 | ~~Nachprüfung der Posts vom 02.11.~~ **erledigt** (19:17 UTC, alle drei öffentlich, Supabase-Dateien gelöscht, Cockpit auf „gepostet“) | Claude | – |
| 4 | Stile 17–21 erstmals auf der GPU messen (Taxi) | Claude | nebenbei |
| 5 | Repo auf privat stellen (**erst nach Lesezugang für den PC**), ElevenLabs-Guthaben prüfen, Telegram einrichten | Inhaber/Claude | 5–15 Min. je |
| 6 | 16.11.: Posting-Zeiten und Reihenfolge Wochen 3–5 mit Zahlen nachjustieren | Claude | 30 Min. |
| 7 | Hirn auf dem Desktop einrichten (ZIP entpacken), danach CLAUDE.md schlanker machen (Verweis auf das Hirn) | Inhaber, Claude | 5 Min. |

## Offene Punkte
- [ ] Teppich-Pegel (−10 dB), Effekte und Position des Folgen-Elements auf echtem Gerät abnehmen (Inhaber). Engine-Standard „keine gelbe Teamfarbe“ (im Gehalt-Video ist Team „steuerfrei“ gelb, bleibt).
- [ ] Werte mit „prüfen“ je Video klären (Spalte `quellen_pruefen` der Pläne; Liste in [[Sperrliste und Auswahlregeln Simulierbar]]); Account 2: Eisdicke Toronto, Genf 1816, Leoniden-Maximum, COP31-Termin.
- [ ] „Rente mit 63“ (04.11.) ist politiknah (nur Rechnung; Tausch mit Reserve R7 oder R14 möglich).
- [ ] Lunar Animations kann nachlegen: ein neues Lunar-Thema, das ein Planthema trifft, sperrt es (dann Reserve). Embed-Listen zeigen nur die neuesten 5–13 Videos je Konto (**A**).
- [ ] Text-Überlappungs-Prüfung (`qc/text_ueberlappung.mjs`, Account 2 `…_pov.mjs`) bei jedem Video; sie prüft HUD-Texte, keine Texturen in der 3D-Szene.
- [ ] Ob ein Impressum-Link in der Bio das CRP stört, ist von TikTok nicht dokumentiert.
- [ ] **Wörtliche Sätze der 4 Vorbildvideos stehen im Skill `massstab.md` (und im Hirn)** (46 Auszüge, z. B. Hook- und Endstand-Zeilen). Das widerspricht „keine Transkripte im öffentlichen Repo“. Entscheidung des Inhabers: durch Paraphrasen ersetzen (Empfehlung) oder belassen, bis das Repo privat ist.
- [ ] **Widersprüche in den Skill-Quellen klären** (vom Hirn-Aufbau gefunden, Details in [[Prüfung und Abnahme Simulierbar]] und [[Sperrliste und Auswahlregeln Simulierbar]]): Prüfliste 20 Punkte gegen `qc/massstab.py` (13 Punkte nur Hinweis, IDs weichen ab) · Tempo Prüfliste #12 (170–220 Wörter) gegen Profil Ben (130–170 Wörter, 2,0 W/s) · Konkurrenzzahlen 2,1 Mio./467.800/403.000 keinem Vorbild zuordenbar · Score-Raster „… S“ unerklärt · alte Planzeilen nennen Posting-Zeiten 12:00/20:00.
- [ ] Radar-Prompt dauerhaft auf CLAUDE.md umstellen (nur in der Radar-Sitzung selbst möglich, optional).

## Siehe auch
[[Pläne und Kalender]] · [[Entscheidungen Log]] · [[Index]]
