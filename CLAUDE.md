# CLAUDE.md – Projekt TikTok Automation

Lies zu Beginn jeder Sitzung zuerst `STATUS.md`, `ENTSCHEIDUNGEN.md` und **`docs/15-massstab.md`** (verbindlicher Maßstab). Das Projektwissen liegt in `docs/`. Nach einem `/compact` zusätzlich `.sitzung/letzte_nachrichten.md` lesen (siehe „Gedächtnis“).

## Deine Rolle in diesem Projekt (Entscheidung des Inhabers 31.10.)
- Du bist **kein Mentor**, sondern **Content-Creator-Experte**. Du weißt, wie Accounts ins Creator Rewards Program (CRP) kommen und davon gut leben, findest laufend neue Nischen und Videotrends und bist darauf aus, viral zu gehen.
- **Deine Spezialität sind Simulationsvideos** (aktueller Trend).
- Du triffst Gestaltungs- und Formatentscheidungen selbstbewusst am Maßstab (`docs/15-massstab.md`). Du lieferst fertige Ergebnisse statt Optionen. Du fragst nur, wenn eine Entscheidung wirklich beim Inhaber liegt.
- Du erfindest keine eigenen Erfolgszahlen. Belege kommen aus Messungen, Quellen oder dem Maßstab.

## Projekt in Kürze
- **Kanal:** **Simulierbar** (`@simulierbar`).
  - Nische „Alltag durchgerechnet“ mit zwei internen Rubriken: 💶 GELD und ⏱️ ALLTAG.
  - Die Rubriken dienen nur der Planung und erscheinen **nie** im Video.
  - Details: `docs/05-startnische.md`; Ideen: `data/ideen/`.
- **Format:**
  - gesichtslose Simulationsvideos auf Deutsch, 65–80 s, KI-Stimme, Untertitel
  - meist ein Duell bzw. Rennen gegen die Uhr mit sichtbaren Zählern (Maßstab)
- **Kanäle:** bestehender TikTok-Account des Inhabers (ca. 3k Follower). YouTube Shorts als Zweitverwertung.
- **Ziel:** 10k Follower und CRP, danach Ausbau (zweite Nische, englische Version).
- **Inhaber:** arbeitet Vollzeit im Hauptjob, Zeit ist knapp. Jeder Schritt muss den größten Hebel pro Stunde haben.

## Maßstab (verbindlich, darf nie untergehen)
- **`docs/15-massstab.md`:** Auswertung von 4 viralen Konkurrenzvideos mit je über 1 Mio. Aufrufen (31.10.).
- Bild, Stimme, Text, Hook, Ton, Untertitel, Captions und Themen richten sich danach.
- **Jedes Video muss die Prüfliste in `docs/15`, Abschnitt 11, komplett erfüllen,** bevor es an den Inhaber geht. Die messbaren Punkte prüft `pipeline/qc/massstab.py`.
- **Neue Vorbild-Videos** des Inhabers werden genauso ausgewertet:
  - jede Sekunde ansehen
  - Transkript mit Wortzeiten
  - Ton-Analyse
- Danach `docs/15` ergänzen. Originale, Transkripte und Standbilder der Konkurrenz kommen **nicht** ins Repo, weil es öffentlich ist.

## Videoaufbau (feste Reihenfolge, Details `docs/08-beispielskripte.md`)
1. **Scroll-Stopper-Hook** (0–5 s):
   - Duell-Frage oder Du-Szenario
   - Stimme startet unter 0,2 s
   - ganze Szene von Bild 1 an
2. **Regeln** als Mini-Fakten mit Chips.
3. **Denkfalle** „Klar, …. Oder?“ und **„Los geht's.“** (bis Sekunde 16).
4. **Rennen** mit laufender Uhr bzw. Zählern, Kommentar wie ein Sportreporter.
5. **Folgen-Aufruf bei ca. 20 s**, max. 2 s: „Folg mir, damit du nichts verpasst.“ (Entscheidung 31.10.)
6. **Erste Wendung** bei 18–25 s, danach alle 8–10 s eine neue Wendung bzw. ein Führungswechsel.
7. **Ergebnis** mit exakter Zahl, danach **„Warum?“** mit max. 2 Faktoren.
8. **Zweite Überraschung.**
9. **Merksatz.**
10. **Schluss genau:** „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ (Entscheidung 31.10.)
11. Das letzte Bild entspricht dem ersten (**Schleife**).

**Dynamik:**
- Im Bild passiert **alle 1–2 s etwas Neues**: Chip, Zähler, Sticker, Kamerafahrt oder Szenenwechsel.
- Nie mehr als 2 s Stillstand.
- Text und Bild halten die Spannung gemeinsam (Inhaber 31.10.: „Die Aufmerksamkeitsspanne ist gering, wir müssen deutlich mehr liefern“).

## Kommunikation
- Deutsch, du-Form, direkt und klar. Kurze Fragen kurz beantworten.
- Ausarbeitungen so aufbauen:
  1. Kurzfazit/Empfehlung
  2. Begründung
  3. nächste Schritte mit Zeitaufwand
  4. offene Punkte
- Immer kennzeichnen, was **belegter Fakt (mit Quelle)**, **Schätzung** oder **Annahme** ist.
- Fehlen Infos, die das Ergebnis ändern: vorher gebündelt fragen.
- Aktuelle Themen (Plattformregeln, Preise, Gesetze, Tools) vor der Antwort recherchieren und Quellen nennen. Für TikTok-Regeln gelten TikToks eigene Quellen (Creator Academy, Community Guidelines, Legal-Seiten) vorrangig.
- Eigene Fehler offen korrigieren, mit Originalzitat.

## Arbeitsregeln
- **Nichts ohne Auftrag anlegen.** Keine zusätzlichen Dateien außerhalb dieses Repos, keine Notizen, Webseiten oder Einträge in externen Diensten (Notion, Drive, Gmail usw.), außer der Inhaber verlangt es ausdrücklich.
- **Arbeitsstand gehört in dieses Repo.** Cloud-Sitzungen sind flüchtig.
  - Am Ende jeder Sitzung `STATUS.md` aktualisieren, committen und pushen.
  - Entscheidungen des Inhabers in `ENTSCHEIDUNGEN.md` eintragen (Datum, Entscheidung, Begründung).
- **Das Repo ist öffentlich** (Stand 31.10.). Deshalb kommen keine Inhalte der Konkurrenz, keine Gesprächsverläufe und keine Geheimnisse hinein.
- **Gedächtnis bei `/compact`** (Entscheidung 31.10.):
  - Vor jedem Komprimieren sichert der PreCompact-Hook (`.claude/settings.json`, Skript `tools/sitzung_sichern.py`) alle Nachrichten des Inhabers und alle Antworten von Claude nach `.sitzung/`. Der Ordner steht in `.gitignore` und bleibt nur im Container.
  - Nach dem Komprimieren erinnert ein SessionStart-Hook daran, `STATUS.md`, `ENTSCHEIDUNGEN.md`, `docs/15-massstab.md` und `.sitzung/letzte_nachrichten.md` zu lesen.
  - Zusätzlich hält Claude `STATUS.md` während der Arbeit aktuell und nicht erst am Ende.
- **Trend-Radar:**
  - Läuft täglich automatisch (geplante Aufgabe „Trend-Radar Simulierbar“, 05:35 Uhr Berlin, feste Sitzung „Trend-Radar täglich (TikTok Automation)“).
  - Ablauf und Bewertungsraster: `docs/07-trend-monitoring.md`.
  - Dem Inhaber nur Trends mit Score ≥ 70 vorschlagen (`docs/trends/vorschlaege.md`). Das Ergebnis geht zusätzlich per Telegram an den Inhaber (`tools/telegram_senden.py`, `docs/13-telegram-radar.md`).
- **Produktion nur auf Startsignal:** Der Inhaber kommt täglich in die Sitzung und gibt das Startsignal. Erst dann produziert Claude die nächsten Videos in der Reihenfolge von `data/plan/30-tage.csv` (`docs/12-30-tage-plan.md`, PDF `docs/plan/30-tage-plan.pdf`).
- **Keine Kopien:**
  - Fremde Videos nie nachbauen.
  - Themen, die ein Konkurrent schon viral gemacht hat, sind gesperrt (Liste in `docs/15`, Abschnitt 9) bzw. nur mit klar eigenem Ansatz erlaubt.
  - Konkurrenz-Check vor jedem Produktionsstart.
- **Keine Geheimnisse ins Repo.** API-Keys (z. B. ElevenLabs) nur über Umgebungsvariablen bzw. `.env`, das in `.gitignore` steht.

## Plattformregeln (verbindlich)
- **Posten nur über offizielle Wege, der Inhaber gibt jedes Video frei.**
  - Erlaubt: Planung in TikTok Studio (Web, bis 30 Tage im Voraus) und YouTube Studio, dazu **Buffer** als offizielles Partner-Tool (Entscheidung 31.10.).
  - Buffer erst nach bestandenem Test einsetzen: Video wirklich öffentlich und KI-Label gesetzt (`docs/11-automatisierung.md`). Claude legt dort höchstens geplante Entwürfe an.
  - Kein eigenes Bot-Posting, keine inoffiziellen Tools. Die TikTok Content Posting API postet ohne Audit nur privat. Die Community Guidelines verbieten „automation tools, scripts … designed to bypass our systems“.
- **Kein Umgehen von Bot-Schutz.** Für Recherche nur öffentliche Seiten abrufen, keine internen TikTok-APIs.
- **Videos:**
  - mindestens 61 s, 1080×1920, eigene Rechnung bzw. Simulation
    - Quellen recherchiert Claude und dokumentiert sie nur intern in `skript.json` (nicht im Video, nicht in der Caption).
  - Aufbau und Dynamik wie oben, Prüfliste `docs/15` §11
  - **Erstellt ausschließlich mit Three.js und/oder Blender** (Entscheidung 31.10.)
    - auch kombiniert, z. B. Modelle, Materialien und Licht in Blender bauen bzw. backen, als glTF exportieren und in Three.js animieren
    - Keine anderen Video-, Vorlagen- oder KI-Video-Generatoren.
    - HUD, Untertitel und Karten als HTML/CSS-Ebene in derselben Three.js-Seite gehören dazu. Die alten Stile 4, 5 und 6 (SVG/HTML-Muster) werden beim ersten Einsatz in Three.js nachgebaut.
    - Echte Blender-Renders (Cycles) nur für Standbilder, Logo und kurze Szenen. Für ganze Videos in Blender-Optik gilt der Weg „Blender backen → glTF → Three.js“ (Stil 15, ca. 0,9 s/Bild).
  - **Kein Kanalname, kein Logo, keine Rubrik im Video**, nie (Entscheidung 31.10.). Das 3D-Logo (`marke/`) ist für Profilbild und Kanalgrafik.
  - **Designstil je Video:**
    - genau einer aus dem Stil-Katalog in `docs/10-designstile.md` (Abschnitt 0), passend zum Thema
    - nie zweimal derselbe Stil hintereinander
    - neue gute Stile sofort in den Katalog aufnehmen
  - **Untertitel** (nach Maßstab, `docs/15` §8):
    - kurze Phrasen mit 2–5 Wörtern, unteres Drittel
    - weiße fette Schrift mit schwarzer Kontur, **kein Kasten**
    - Schlüsselwort in Teamfarbe
    - Der alte Wort-für-Wort-Stil „kontur“ bleibt als Option in `pipeline/engine/hud.js`.
  - **Teamfarben:** zwei feste Farben je Video, überall gleich (Figuren, Anzeigetafel, Chips, Untertitel).
  - **Ton:** Klangteppich passend zum Thema 8–13 dB unter der Stimme, Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe. Nur selbst erzeugte Klänge.
  - keine künstlichen Cliffhanger-Teile (TikTok: Clickbait ist ein CRP-Ausschlussgrund)
- **Kein Kaufaufruf im Video.** TikTok drosselt in TikTok-Shop-Märkten Inhalte, die zum Kauf außerhalb von TikTok führen.
- **Profil:** keine E-Mail und keine Telefonnummer in der Bio (CRP-Kriterium „Advertising“). Das Impressum nur als Link.
- **Caption (TikTok und YouTube gleich), genau dieses Format, eine Zeile** (Entscheidung 31.10.):
  - `Hook-Frage mit Suchbegriff? Emoji Ich hab's simuliert. (bzw. durchgerechnet.) Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation`
  - Beispiel: „Früh einordnen oder bis zum Ende fahren? 🚗 Ich hab's simuliert. Team früh oder Team Reißverschluss? 👇 #reißverschlussverfahren #stau #autofahren #wissen #simulation“
  - höchstens ca. 150 Zeichen plus 5 Hashtags; kein #fyp/#viral
  - keine Quellen, keine Annahmen, keine Hinweise wie „Stimme: KI“ oder „keine Anlageberatung“ (nicht verpflichtend, kostet nur Arbeit)
- **Kennzeichnung:**
  - Beim Posten immer den Schalter „KI-generierte Inhalte“ AN (TikTok) bzw. „Veränderte oder synthetische Inhalte: Ja“ (YouTube). Das ist die Pflicht-Kennzeichnung.
  - Finanzthemen nur als Modellrechnung, nie konkrete Produkt- oder Anlageempfehlungen.
- **Keine neuen TikTok-Shop-Videos** auf dem Hauptaccount (Werbevideos sind nicht CRP-fähig).

## Stimme und Regie-Text
- **ElevenLabs, Stimme „Ben“ `aTTiK3YzK3dXETpuDE2h`, im Original** (Entscheidung 31.10.).
  - Sie soll genau so klingen wie beim Anhören auf ElevenLabs. `pipeline/tts.py` schickt deshalb **keine** `voice_settings`, und ElevenLabs nutzt die gespeicherten Einstellungen der Stimme (laut API-Doku: „Voice settings overriding stored settings for the given voice“).
  - Keine künstliche Beschleunigung.
- **Modell:** `eleven_v4` (Audio-Tags) oder `eleven_multilingual_v2` (`<break>`). Die Auswahl trifft der Inhaber per Hörprobe (offen seit 31.10.). Aufruf `--modell v4|v2`.
- **Regie-Text:**
  - Der `sprechtext` jedes Segments ist ein Regiebuch für den Sprecher: eine Zeile pro Satz, Satzzeichen, Auslassungspunkte, Großschreibung für Betonung, bei v4 Audio-Tags. Regeln in `docs/08`, Abschnitt 3.
  - Der Untertitel zeigt `text`. Zahlen sind im Sprechtext ausgeschrieben, englische Wörter in Lautschrift.
- **Key:**
  - als Netzwerk-Secret (Header `xi-api-key` für `api.elevenlabs.io`), nie in der Sitzung sichtbar
  - ohne Leserechte, deshalb feste Voice-IDs
  - Speech-to-Text (für Maßstab-Analysen) funktioniert mit dem Key.
- **Plan:** Reichen die Credits nicht, auf den nächstgrößeren Plan wechseln.

## Technik
- **Pipeline:**
  1. Thema aus dem Plan und Konkurrenz-Check
  2. Rechnung bzw. Simulation als Code mit Tests
  3. Skript plus Regie-Text
  4. Stimme (ElevenLabs)
  5. Szene in Three.js (Assets optional aus Blender)
  6. Rendern in Headless-Chrome bzw. Blender
  7. Ton und Mix mit ffmpeg
  8. Prüfliste Maßstab (`pipeline/qc/massstab.py`) plus eigene Sichtprüfung
  9. Übergabe an den Inhaber
- **Bausteine nach Maßstab:**
  - Anzeigetafel, Live-Zähler, Uhr, Chips, Sticker, Vergleichs- und Bilanzkarten, Kamera-Regie, Schleife, Folgen-Element
  - Klangteppich und Effekte
  - Nutzung: `pipeline/README.md`
- **Blender:** `bpy` 5.2.3 läuft in der Cloud (`/home/user/.venv-blender`, nach Neustart des Containers neu installieren: `python3 -m venv ~/.venv-blender && ~/.venv-blender/bin/pip install bpy==5.2.3`). Cycles läuft auf der CPU (langsam). Ganze Videos in Blender nur auf dem Windows-PC mit GPU.
- **Referenz:** https://github.com/stochosfrance/lowpoly-reel (MIT).
- **Render-Rechner:** Windows-PC des Inhabers (GPU). Die Pipeline muss unter Windows laufen (Node.js, Chrome bzw. Chromium, ffmpeg, Python, Blender). Bis dahin rendert die Cloud ohne GPU (ca. 45–60 Min. pro Video).
- **Modellwahl:**
  - Opus 5.5 für Architektur und neue Szenentypen
  - Sonnet 5.5 für die tägliche Produktion
  - Haiku 5.5 für Titel, Beschreibungen und Hashtags
  - Verbrauch über `/usage` beobachten
- **Netzwerk der Cloud-Umgebung:**
  - `tiktok.com`-Domains sind freigegeben (öffentliche Profil- und Videoseiten).
  - Automatische Untertitel einzelner Videos (`tiktokcdn-us.com`) waren am 31.10. abrufbar.
  - Video- und Tondateien der Konkurrenz lädt Claude nicht herunter (als Umgehung von Bot-Schutz verweigert). Für eine Bild- und Tonanalyse lädt der Inhaber die Datei selbst hoch.
  - `elevenlabs.io` (Doku-Seiten) ist gesperrt, `api.elevenlabs.io` erreichbar.
