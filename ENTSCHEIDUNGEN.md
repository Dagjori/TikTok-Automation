# Entscheidungen

Hier stehen nur Entscheidungen, die der Inhaber getroffen hat. Empfehlungen, die noch nicht bestätigt sind, stehen als offene Punkte in `STATUS.md`.

| Datum | Entscheidung | Begründung |
|---|---|---|
| 2026-10-30 | Projekt-Zentrale ist dieses GitHub-Repo „tiktok-automation“ | Bleibt dauerhaft erhalten, verbindet Code und Projektwissen, jede neue Sitzung hat sofort den Kontext |
| 2026-10-30 | Bisherige Recherche wird als Projektwissen übernommen (`docs/`, `data/`) | Grundlage für alle weiteren Schritte |
| 2026-10-30 | Hauptaccount (ca. 3k Follower) wird umgestellt; Shop-Provisionen spielen keine Rolle | Konto ist privat und laut Account check sauber |
| 2026-10-30 | Keine 1:1-Kopie bestehender Formate; Nische „Geld-Duell“ verworfen | Zu nah an @kontostand.vs und @wissentogo_de; gesucht ist eine Nische mit gleichem Prinzip, aber eigenem Thema |
| 2026-10-31 | Nische: Kombi „Alltag durchgerechnet“ (Geld-Duell + Testlauf), Platz 1 im Ranking | Größter Themenvorrat (300 Ideen, ca. 1.600 Varianten), Nachfrage für beide Rubriken belegt |
| 2026-10-31 | Der TikTok-Markt wird laufend beobachtet, um neue Trends zu erkennen | Themen-Nachschub, Konkurrenz und Regeländerungen früh sehen |
| 2026-10-31 | Trend-Radar läuft täglich automatisch; Claude bewertet Trends selbst und schlägt nur Trends mit Potenzial vor | Das Tempo ist hoch, eine Woche ist zu lang |
| 2026-10-31 | Stimme: ElevenLabs, kleinster bezahlter Plan; bei Bedarf der nächstgrößere | Kommerzielle Lizenz nötig, Kosten zuerst klein halten |
| 2026-10-31 | Gerendert wird auf dem Windows-PC des Inhabers | Vorhandene Hardware |
| 2026-10-31 | Trend-Vorschläge Weihnachtsgeld und Mindestlohn angenommen, unter der Bedingung, dass jedes Video mindestens 1 Minute trägt | CRP verlangt Videos über 1 Minute |
| 2026-10-31 | Kanalname „Der Testlauf“ abgelehnt; neuer Name wird aus Vorschlägen gewählt | Wunsch des Inhabers |
| 2026-10-31 | Vor dem Pipeline-Bau gibt der Inhaber den Stil anhand von Beispiel-Skripten frei | Kontrolle von Ton und Stil |
| 2026-10-31 | Kanalname: **Simulierbar** | Auswahl des Inhabers aus den Namensvorschlägen |
| 2026-10-31 | Kein „1.000 Lebensläufe“-Merkmal: gleiches Format wie die Vorbilder, nur eigene Themen | Verkompliziert das Vorhaben, bringt keinen Vorteil |
| 2026-10-31 | Jedes Video endet mit „Schreibt euren Simulationswunsch in die Kommentare.“ statt „Morgen: …“ | Zuschauer liefern die nächsten Themen |
| 2026-10-31 | Erstes Video: GTA 6 und Krankfeiern, Wirtschaftsrechnung für Deutschland, Start vor dem Release am 19.11. | Idee des Inhabers, Durchbruchpotenzial (Trend-Score 85) |
| 2026-10-31 | Account heißt ab sofort Simulierbar (`@simulierbar` aktiv); ElevenLabs-API-Key ist erstellt | Umsetzung durch den Inhaber |
| 2026-10-31 | Optik deutlich hochwertiger als die Konkurrenz (Motion Design) wird zum Markenzeichen | Abheben über Qualität |
| 2026-10-31 | Start **heute** mit 2 Videos: GTA 6 **weltweit** gerechnet plus Reißverschluss. Die Deutschland-Version von GTA 6 wird eine eigene, spätere Idee | Tempo; weltweite Rechnung hat größere Reichweite |
| 2026-10-31 | **(überholt, heute gilt Ben)** Sprecherstimme: ElevenLabs „Daniel“ (`onwK4e9ZLuTAKqWW03F9`, Standard in `pipeline/tts.py`); zuerst getestet `zfc8CJQpe8Kqyl0vvCzo`, Aussprache teils komisch | Auswahl des Inhabers |
| 2026-10-31 | **(überholt, heute gilt Ben)** Stimme für den Start: zurück zu `zfc8CJQpe8Kqyl0vvCzo` (erste Wahl), natürliches Tempo, Aussprache über Sprechfassung. Daniel verworfen (zu langsam bzw. nach Beschleunigung zu schnell, klingt nach KI). Endgültige Stimmensuche in der ElevenLabs-Bibliothek, sobald der Key Leserechte hat | Inhaber: Tempo nicht künstlich ändern, Stimme soll natürlich klingen wie bei den Vorbildern |
| 2026-10-31 | Untertitel ohne Hintergrundkasten: Wort für Wort aufbauend (max. 2 Zeilen), weiße fette Schrift mit dicker schwarzer Kontur, aktuelles Wort gelb | Inhaber: Kasten gefällt nicht, Lesbarkeit über Kontur |
| 2026-10-31 | Stimme: männlich, muttersprachlich Deutsch (Auswahl per Hörprobe) | Inhaber: Aussprachefehler vermeiden |
| 2026-10-31 | Die ersten beiden Videos (GTA 6 weltweit, Reißverschluss) werden vor dem Posten mit neuer Stimme und neuen Untertiteln neu gebaut | Die ersten Videos prägen den Kanal-Stil |
| 2026-10-31 | Ablage in Google Drive kommt später über den Windows-PC (Drive für Desktop), kein Cloud-Upload | Wahl des Inhabers |
| 2026-10-31 | Trend-Radar schlägt nur noch im aktuellen Format vor (klare Modellrechnung, Duell bzw. Strategie-Vergleich), kein „1.000 simulierte …“ mehr | Inhaber: alte Regel war noch im Radar |
| 2026-10-31 | Stimme „Ben“ (`aTTiK3YzK3dXETpuDE2h`, ElevenLabs-Bibliothek, muttersprachlich Deutsch, 2,6 Wörter/s) ist Standard; Alternativen Marc, Alexander, Otto in `pipeline/tts.py` | Auswahl des Inhabers per Hörprobe |
| 2026-10-31 | Designstil wechselt je Thema: alle 8 Stile aus `docs/10-designstile.md` bleiben im Katalog, je Video der passendste, nie zweimal hintereinander gleich; neue Stile werden aufgenommen | Inhaber: Abwechslung, Stil passend zum Thema |
| 2026-10-31 | Auto-Posting: Buffer testen (ca. 9 €/Monat). Regel gelockert: offizielle Partner-Tools erlaubt, Claude legt nur Entwürfe an, der Inhaber gibt frei | Recherche `docs/11-automatisierung.md`: auditierte Partner-Tools dürfen öffentlich posten |
| 2026-10-31 | Trend-Radar täglich per Telegram-Bot (statt WhatsApp) | Kostenlos, offiziell, 10 Min. Einrichtung |
| 2026-10-31 | 30-Tage-Plan ist die Reihenfolge der nächsten Videos; Produktion startet täglich auf Zuruf des Inhabers, kein Autopilot. ElevenLabs bleibt vorerst Starter | Inhaber |
| 2026-10-31 | Caption-Format für TikTok und YouTube: eine Zeile „Hook-Frage? Emoji Ich hab's simuliert. Kommentarfrage? 👇“ + 5 Hashtags (3 Thema, #wissen, #simulation). Keine Quellen, Annahmen oder Hinweise („Stimme: KI“, „keine Anlageberatung“), weder in der Caption noch im Video oder als Kommentar; Pflicht bleibt nur der KI-Schalter beim Posten | Inhaber: nicht verpflichtend, kostet nur Arbeit; kurze Captions wie bei den erfolgreichsten Konkurrenz-Videos |
| 2026-10-31 | Reißverschluss-Video wird nicht gepostet (zurückgestellt): @simulierts hat das Thema am 31.10. zuerst gebracht. Im Plan ersetzt durch „Spurwechsel im Stau“; Kaffee- und Heizung-nachts-Themen ebenfalls ersetzt | Inhaber: keine Themen, die die Konkurrenz schon gebracht hat |
| 2026-10-31 | Sprechtext mit Zeilenumbrüchen: Stimme spricht das ganze Skript am Stück, Pause nach jedem Satz und 0,6 s zwischen Abschnitten; Skripte in kurzen Sätzen | Inhaber: Stimme klang unruhig und zu gehetzt |
| 2026-10-31 | **Neuaufstellung („komplett neu aufrollen“).** Maßstab sind 4 virale Konkurrenzvideos (je > 1 Mio. Aufrufe), vom Inhaber hochgeladen. Alle Regeln (Bild, Stimme, Text, Hooks, Captions, Themen) richten sich danach. Auswertung: `docs/15-massstab.md`, verbindlich, darf nie untergehen | Inhaber: Ergebnisse wirkten chaotisch; „das ist dein Maßstab, an dem wir uns richten müssen“ |
| 2026-10-31 | Videos ausschließlich mit Three.js und/oder Blender (auch kombiniert) | Inhaber: feste Regel für die Erstellung |
| 2026-10-31 | Deutlich mehr Dynamik: wechselnde bzw. bewegte Animationen, nichts steht still (Maßstab: alle 1–2 s neues Bild-Ereignis) | Inhaber: geringe Aufmerksamkeitsspanne |
| 2026-10-31 | Feste Reihenfolge jedes Videos: Scroll-Stopper-Hook, dann Aufmerksamkeit halten durch dynamische Animationen und spannenden Text (Ablauf `docs/08`, Abschnitt 1) | Inhaber |
| 2026-10-31 | Stimme bleibt Ben, aber im Original wie auf ElevenLabs (gespeicherte Einstellungen, keine eigenen Werte). Modell (Eleven v4 oder Multilingual v2) wählt der Inhaber per Hörprobe | Inhaber: „genau so, wie sie sich auf ElevenLabs anhört“ |
| 2026-10-31 | Sprechtext wird als Regie-Text geschrieben (Pausen, Betonungen, Tonfall wie für einen Synchronsprecher), Regeln `docs/08`, Abschnitt 3 | Inhaber |
| 2026-10-31 | Rolle von Claude in diesem Projekt: kein Mentor, sondern Content-Creator-Experte mit CRP-Erfahrung, Spezialität Simulationsvideos | Inhaber |
| 2026-10-31 | Stil-Katalog bleibt; Claude prüft weitere Stile, die mit Blender und Three.js möglich sind, für Qualität und Alleinstellungsmerkmal | Inhaber |
| 2026-10-31 | Nie wieder Kanalname („Simulierbar“) oder Rubrik („GELD“, „ALLTAG“) im Video | Inhaber: unnötig, verwirrt |
| 2026-10-31 | Neues 3D-Logo aus Blender (altes Logo gefällt nicht) | Inhaber |
| 2026-10-31 | Folgen-Aufruf nach ca. 20 s („Folg mir, damit du nichts verpasst.“); neuer Schlusssatz „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ (ersetzt „Schreibt euren Simulationswunsch …“; Großschreibung „als Nächstes“ und Fragezeichen nach Duden ergänzt) | Inhaber: kürzerer Schluss |
| 2026-10-31 | 30-Tage-Plan zusätzlich als PDF zum Herunterladen (`docs/plan/30-tage-plan.pdf`) | Inhaber |
| 2026-10-31 | Vor jedem `/compact` wird der Stand gesichert (automatisch per Hook, `.sitzung/`, nicht im Repo) | Inhaber: keine Informationen verlieren |
| 2026-10-31 | Abgeleitet aus dem Maßstab (Inhaber kann widersprechen): Untertitel als kurze Phrasen (2–5 Wörter) mit Schlüsselwort in Teamfarbe statt Wort für Wort, weiterhin ohne Kasten und mit Kontur; Satzpausen kurz (ca. 0,26 s, Abschnitte 0,35 s statt 0,6 s); Schleife (letztes Bild = erstes) | Maßstab `docs/15` §6–8 |
| 2026-11-01 | Logo: Konzept A „S-Kurve“, als statisches Bild (keine Animation), Profilbild TikTok: `marke/logo/a-s-kurve/simulierbar-logo-a-s-kurve-profilbild-1080.png` | Inhaber: nutzt es als TikTok-Logo |
| 2026-11-01 | Kein fester Look als Markenzeichen, unser Markenzeichen ist die Qualität. Stil wechselt weiter je Thema aus dem ganzen Katalog (15 Stile); Stilwahl gestützt auf laufende Konkurrenz-Recherche. Empfehlung „Handgemachte Miniatur“ abgelehnt | Inhaber |
| 2026-11-01 | Stimme: Eleven v4 für alle Videos (Ben, gespeicherte Original-Einstellungen) | Wahl des Inhabers per Hörprobe |
| 2026-11-01 | Untertitel bleiben Wort für Wort (Stil „kontur“), keine Phrasen. Ersetzt die Ableitung vom 31.10. | Inhaber |
| 2026-11-01 | GTA 6 und Spurwechsel sind bereits gepostet, kein Neubau. Plan ab 01.11. verschoben: heute „Treppe oder Aufzug“ (12:00) und „200 € oder 100 € steuerfrei“ (20:00); Termin-Videos behalten ihr Datum | Inhaber |
| 2026-11-01 | Sticker in gesundem Maß. Claude-Regel dazu: große Sticker bzw. Stempel nur an Dramaturgie-Punkten, **max. 5 je Video, mind. 5 s Abstand** (Pflichtpunkt 5d in `qc/massstab.py`); Chips nur mit neuer Zahl bzw. Info (Hinweis ≤ 15). Dynamik alle 1–2 s vor allem über Kamera, Zähler, Figuren und Szenenwechsel | Inhaber: „wir übertreiben mit den Stickern … sonst ist es zu viel“ (bisher 9–14 Sticker je Video) |
| 2026-11-01 | Inhalte mittig ausrichten, ein Format für TikTok und YouTube Shorts (1080×1920, 9:16). Die Engine-Mittelachse lag bei x 492 statt 540; neue symmetrische Schutzzone nach Kalibrier-Test auf dem Handy des Inhabers | Inhaber: „nicht ganz in der Mitte ausgerichtet“ |
| 2026-11-01 | Account 2: keine KI-Video-Generatoren, alles mit Blender und Three.js (wie Account 1); weitere Werkzeuge nur nach Vorschlag und Freigabe | Inhaber |
| 2026-11-01 | Account 2: POV-Stil wie @man_ia_c („Was wäre, wenn …“), der Sprecher spricht aus der Perspektive der Kamera; eigene Themen, keine Kopien | Inhaber: „dieser POV-Style ist sehr gut und die Zahlen ebenfalls“ |
| 2026-11-01 | Account 2: eigene Stimme, deutscher Muttersprachler, mit Eleven v4 | Inhaber |
| 2026-11-01 | Steuern, Gewerbe und Nebentätigkeit für CRP-Erlöse: später | Inhaber: „heben wir uns für später auf“ |
| 2026-11-01 | Fertige Videos (02.11.: Fußgängerampel, Steuererklärung) werden nicht nachgebessert; neue Regeln gelten ab der nächsten Produktion | Inhaber: „Fehler passieren, wichtig ist nur, dass wir uns bessern“ |
| 2026-11-01 | Kein Kalibrier-Test auf dem Handy; Claude setzt die Schutzzone selbst: symmetrisch 150 px links und rechts, Achse x = 540, Breite 780 (in der Engine umgesetzt) | Inhaber: „sofern du verstanden hast, was ich will, passt das“ |
| 2026-11-01 | Account 2: Erzählung in der **Du-Perspektive** („Du stehst am Brandenburger Tor …“), nicht Ich | Inhaber: nimmt die Leute eher mit |
| 2026-11-01 | Unreal Engine 5 darf als zusätzliches Werkzeug genutzt werden, wenn es einen klaren Vorteil bringt; dabei sparsam mit Tokens | Inhaber |
| 2026-11-01 | Bei jeder Änderung an Regeln oder Wissen bekommt der Inhaber ein 1-Seiten-PDF: was geändert, was hinzugefügt, aktueller Stand (`docs/regelwerk/`, `node tools/regelwerk_pdf.mjs`) | Inhaber: übersichtlicher Überblick |
| 2026-11-01 | API-Key hat jetzt Leserechte für Stimmen (voices_read); Stimmen-Bibliothek per API durchsuchbar | Inhaber hat den Key angepasst |
| 2026-11-01 | Account 2: Nische „Was wäre, wenn …“-3D-POV bestätigt (Du-Perspektive). „Wer war's?“ bleibt Kandidat für Account 3 | Inhaber; Vergleich in `docs/16` §10 (Score 86 gegen 70) |
| 2026-11-01 | Account 2: Stimme **Otto** (ElevenLabs-Bibliothek, `FTNCalFNG5bRnkkaP5Ug`), Eleven v4, gespeicherte Original-Einstellungen | Wahl des Inhabers per Hörprobe (6 Kandidaten) |
| 2026-11-01 | Buffer eingerichtet, beide TikTok-Accounts verbunden. **YouTube vorerst nicht** (weder in Buffer noch als Zweitverwertung), kommt später | Inhaber: erst TikTok sauber automatisieren |
| 2026-11-01 | Video-Speicher für die Buffer-API: **Supabase Storage** (Gratis-Plan, Region Frankfurt, privater Bucket, ablaufende Links, Datei nach dem Posten löschen). Gratis-Plan erlaubt max. 50 MB je Datei, größere Videos bekommen automatisch eine Upload-Kopie unter 50 MB in gleicher Auflösung | Inhaber wählt Weg A; 50-MB-Grenze laut Supabase-Doku nachträglich gefunden |
| 2026-11-01 | Produktion und Prototyp Account 2 erst, wenn Buffer, API-Key und Speicher eingerichtet sind | Inhaber |
| 2026-11-01 | Account 2 heißt **`@stelldirvor.pov`** (Name „Stell dir vor …“), angelegt mit Logo und Bio, in Buffer verbunden | Wahl des Inhabers aus `docs/16` §11 |
| 2026-11-01 | **Kein KI-Label** mehr beim Posten (Ausnahme: realistisch wirkende KI-Inhalte) | Inhaber: „nicht notwendig“; deckt sich mit TikTok: kein Label nötig bei künstlerischen Stilen und generischer TTS (`docs/16` §2) |
| 2026-11-01 | **Vollautomatisch posten ohne Freigabe:** Claude prüft jedes Video selbst und plant es über Buffer (`pipeline/post_buffer.py`); der Inhaber kann geplante Posts bis zum Zeitpunkt löschen | Inhaber: „ich will nicht freigeben müssen … das ist der Sinn von Automatisierung“ |
| 2026-11-01 | Jeder Buffer-Post enthält die Caption mit Hashtags im festen Format | Inhaber |
| 2026-11-01 | **Posting-Zeiten** (Startwerte): Simulierbar Mo–Fr 12:30/19:30, Sa–So 09:30/19:30; `@stelldirvor.pov` Mo–Fr 20:30, Sa–So 13:00; nach 14 Tagen mit eigenen Daten nachjustieren | Recherche 01.11.: Metricool 2026 (2,3 Mio. Posts) Abend 18–21 Uhr am stärksten; Buffer 2026 (7,1 Mio. Posts) Wochenende stark, So 9 Uhr und 13 Uhr; keine offizielle TikTok-Aussage, Zeit wirkt schwächer als Inhalt und Regelmäßigkeit |
| 2026-11-01 | ~~Account 2 postet 1 Video pro Tag~~ → ersetzt (siehe nächste Zeile) | – |
| 2026-11-01 | **Account 2 postet 2 Videos pro Tag zu denselben Zeiten wie Simulierbar** (Mo–Fr 12:30/19:30, Sa–So 09:30/19:30); 30-Tage-Plan mit 60 Videos plus 15 Reserve. Testvideo heute direkt nach der Prüfung, danach Normalbetrieb ab 02.11. 12:30 auf beiden Accounts | Inhaber: „das schaffen wir alles“ |
| 2026-11-01 | Buffer **Essentials** für 2 Kanäle (ca. 12 $/Monat): kein Limit für geplante Posts | Inhaber hat gebucht |
| 2026-11-02 | **Produktionsrhythmus:** pro Tag genau 4 Videos (2 je Account) für den nächsten Tag, nach Abnahme in Buffer einplanen; nie mehr als diese 4 gleichzeitig in Arbeit, höchstens 2 Produktions-Agenten parallel | Inhaber: „ich will nicht nochmal sehen, dass du 8–10 Videos gleichzeitig machst“; am 01.11. riss das 5-Stunden-Limit |
| 2026-11-02 | **Ruhiger Ton:** saubere Aussprache, passender Tonfall, kein Geschrei, kein „Los geht's“, keine aufgeregten Audio-Tags | Inhaber: Videos „zu energisch“; Vorbilder in `docs/15` sprechen ruhig und sachlich |
| 2026-11-02 | **Keine großen Sticker/Stempel** mehr (vorher max. 5); Zahlen und Timer bleiben; Fokus auf die animierte Welt | Inhaber: „die Kunst ist es, das Umliegende aufregender und qualitativer zu gestalten“ |
| 2026-11-02 | **Skript-Bild-Abgleich** (jedes Detail im Skript ist im Bild) und **Themen-Logik** (nur echte Alternativen vergleichen) | Inhaber: „Steuererklärung vs. Überstunden ergibt keinen Sinn“ |
| 2026-11-02 | **@stelldirvor.pov strikt im Format der 4 Referenzvideos:** keine Stimme, 80 s, feste Ich-Perspektive, Titelfrage, Messwert-Anzeige, kurze kursive Sätze, Atmo, schwarzer Abspann (`docs/16` §12) | Inhaber: „genau in diesem Stil … halte es strikt genau danach, keine Stimme mehr“ |
| 2026-11-02 | **@stelldirvor.pov ohne „5 Sekunden“:** kein 5-Sekunden-Rahmen mehr in Titeln, Texten oder Szenarien | Inhaber: „wir beziehen uns nicht auf 5 Sekunden“ |
| 2026-11-02 | **@stelldirvor.pov Themenrichtung:** große, globale Gedankenexperimente aus Physik, Mathe, Biologie, Chemie (z. B. alles automatisiert, Sonne kommt jedes Jahr 1 m näher, neue Eiszeit), nicht auf Deutschland bezogen, keine Alltagsthemen wie Schokolade; Vorbild Lunar Animations (die 4 Referenzvideos) | Inhaber |
| 2026-11-02 | **Neuer 30-Tage-Plan für @stelldirvor.pov**, komplett neu und im Detail; der alte Plan (01.11.) ist ersetzt | Inhaber: „alles muss ins Detail überarbeitet und auf den Kopf gestellt werden“ |
| 2026-11-02 | **Fester Skill nur für @stelldirvor.pov** (`.claude/skills/stelldirvor-video/`): Videos strikt nach Design, Licht, Effekten und Animationen der Referenzvideos | Inhaber |
| 2026-11-02 | **Simulierbar: Schwerpunkt GELD**, jedes Video mit Euro-Ergebnis, Plan ab 03.11. komplett neu (Videos vom 02.11. bleiben) | Inhaber: „das zieht am meisten … entwickeln nur neue Ideen“ |
| 2026-11-02 | **Cockpit reagiert sofort:** Freigabe, Ablehnung und Kommentar gehen direkt als Nachricht an Claude, Claude antwortet im Cockpit | Inhaber: „sonst bringt mir das cockpit nichts“ |
| 2026-11-02 | **Fester Skill nur für Simulierbar** (`.claude/skills/simulierbar-video/`), klar getrennt vom Account-2-Skill | Inhaber: „nenne den skill auch entsprechend damit wir das auch absolut voneinander trennen können“ |
| 2026-11-02 | **Simulierbar seriöser Look:** weg von Cartoon/Clay, Lichteffekte und Atmosphäre, keine Sticker, hochwertige Animation | Inhaber: „was seriöseres … mit licht effekten … das eine gewisse atmosphäre entstehen kann“ |
| 2026-11-02 | **Account 2 heute noch posten:** Video 1 aus dem neuen Plan (Eiszeit Toronto) für 02.11. 19:30, Plan rückt danach einen Platz vor | Inhaber: „mit dem Video anfängst für den 2. Account das wir heute noch posten müssen“ |
