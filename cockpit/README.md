# TikTok-Cockpit (lokal, Game-Modus)

Lokales Cockpit auf dem Laptop: Live-Render (echte Bilder, wenn der Laptop rendert; Bild-Raster, wenn der PC rendert), Produktionskette je Video, Claude Code live (jeder Schritt als Karte, Aufgabenliste), Tagesplan aus dem Repo, Level/XP/Erfolge.

**Start:** Desktop-Verknüpfung „TikTok Cockpit“ oder **Strg+Alt+T**. Ohne Verknüpfung: `node cockpit/starten.mjs`. Der Server läuft unsichtbar auf `http://127.0.0.1:4777` (nur lokal) und bleibt aktiv, bis du im Cockpit auf ⏻ klickst.

**Ansichten:** 🎬 Live (Render, Kette, Quests, Render-Dienst), 💡 Studio (Ideen, Skripte, Freigabe), 📈 Zahlen (Follower, Missionen, jedes Video), 🧠 Lernen (Lernschleife, Vorschläge, Testwoche). Rechts immer Claude mit Maskottchen „Simu“, Combo und Sounds je Werkzeug. 🔔 Meldungen (auch als Windows-Benachrichtigung), 🎙️ Sprachbot (Strg+M, freihändig, „Pause“ beendet), 🎵 Arbeitsmusik.

**3D-Welt** (`public/welt.js`, Three.js r170 lokal unter `public/vendor/three/`, MIT): „Neon-Stadt“ hinter der Oberfläche. Jedes Video der letzten 30 Tage ist ein Turm (Höhe = Views, Cyan = Simulierbar, Pink = Stell dir vor), dazu Gitterboden mit Datenpaketen, Synthwave-Sonne, Claude-Kern (Farbe = Modell, Datenströme je Werkzeug) und eine goldene Baustelle für den laufenden Render; Feuerwerk bei Follower-Zuwachs, Missionen, Level-up, Render fertig. Die Kamera fliegt bei jedem Ansichtswechsel mit. 🌐 (oder Sprachbot „zeig die Stadt“) blendet die Oberfläche aus: ziehen = drehen, Mausrad = zoomen, Turm anklicken = Zahlen des Videos, Esc = zurück. ✨ schaltet die Qualität: Auto (Entscheidung 03.11.: sparsam, solange dieser Laptop rendert), Ultra, Sparsam, Aus (flacher 2D-Hintergrund). Ruckelt Ultra, rendert die Welt von selbst gröber. Ohne WebGL bleibt alles 2D.

**Hologramm-Oberfläche** (`public/holo.js`, reines CSS-3D): Seitenpanels stehen zum Bogen gedreht, alles folgt sanft der Maus, Panels fliegen beim Ansichtswechsel aus der Tiefe herein, Karten kippen unter dem Mauszeiger, Toasts, Dialoge und Level-up drehen sich in 3D herein. „Bewegung reduzieren“ in Windows schaltet das ab.

**Zwei Rechner** (`lib/abgleich.mjs`, Entscheidung 03.11.): Laptop und Desktop-PC zeigen dasselbe Cockpit. Ideen, Skripte, Vorschläge, Meldungen, Einstellungen, Missionen und XP gleichen sich alle 30 s über Supabase ab; gemeinsame Ereignisse (Render fertig, Mission, Lernschleife des Tages) zählen nur auf einem Rechner. Einrichtung des zweiten Rechners mit fertigem Prompt: `ZWEITER-RECHNER.md`. Fußzeile: `● verbunden · <Rechner> ⇄ <anderer Rechner>`.

**Render-Dienst:** läuft als Teil des Cockpits (kein eigenes Fenster), nur solange der Cockpit-Server läuft (Entscheidung 03.11.). Die alte Aufgabe „Render-Dienst“ ist deaktiviert. Ein noch offenes altes Fenster übernimmt das Cockpit mit „⤵ Übernehmen“. Am Desktop-PC bleibt der Dienst eigenständig über die Aufgabenplanung (`daten/einstellungen.json`: `"dienst_autostart": false`); das Cockpit zeigt ihn dort nur an.

**Modell-Automatik** (`lib/modelle.mjs`): Opus für Ideen, Skripte, Umsetzungen, Analysen; Sonnet für Status, Zusammenfassung, Produktion und die Lernschleife mit weniger als 5 gereiften Videos je Konto; Haiku nur für reine Textarbeit. Ungültiges Ergebnis → eine Stufe höher. Im Feld „Modell“ lässt sie sich überstimmen.

**Zahlen** (`lib/zahlen.mjs`, `werkzeuge/live_zahlen.py`): Profile alle 30 Min., Videos stündlich (Buffer + 4 neueste TikTok-Seiten); bei Drosselung 6 Std. Pause, nie umgehen. Braucht `BUFFER_API_KEY` in `C:\render\tiktok-automation\pipeline\render_dienst\.env` (selbst eintragen). Eine Sekundenkurve der Zuschauerbindung liefert nur TikTok Studio; das Cockpit zeigt „Ø gesehen“ = Ø Wiedergabezeit ÷ Länge.

**Lernen** (`lib/lernen.mjs`, `anleitung/lernschleife.md`, `anleitung/vorschlag.md`): täglich 19:52 (wenn eingeschaltet), jedes Video einzeln inkl. Design; Vorschläge nur mit Freigabe, eine Testwoche ab dem ersten Vorschlag, danach fragt das Cockpit nach Selbständigkeit oder Verlängerung.

| Datei | Inhalt |
|---|---|
| `server.mjs` | Server ohne npm-Pakete: SSE-Ereignisse, Supabase-Abfrage (Herzschläge, Status), Live-Bilder aus `C:\render\tiktok-automation\pipeline\out\<projekt>\frames`, Tagesplan aus `origin/main`, Claude Code (`claude -p --output-format stream-json`), Spielstand |
| `starten.mjs` | startet den Server, falls nötig, und öffnet Edge im App-Modus |
| `public/` | Oberfläche (HTML, CSS, JS; einzige Bibliothek: Three.js für die 3D-Welt, lokal in `public/vendor/three/`) |
| `daten/` | Spielstand, Claude-Verlauf, Logs, Edge-Profil (nicht im Repo) |

**Voraussetzungen:** Node.js; Render-Klon unter `C:\render\tiktok-automation` mit ausgefüllter `pipeline\render_dienst\.env` (Supabase). Der Schlüssel bleibt im Server und wird weder an den Browser noch an Claude weitergegeben. Claude Code einmal selbst in einem normalen PowerShell-Fenster installieren (nicht im Terminal der Claude-App, das leitet AppData um): `irm https://claude.ai/install.ps1 | iex`, danach `claude` starten und anmelden.

**Sicherheit:** Der Server lauscht nur auf 127.0.0.1, prüft den Host-Kopf und verlangt für jede Steuer-Anfrage ein Sitzungs-Token (fremde Webseiten können ihn nicht fernsteuern). Claude läuft im Arbeits-Klon (`C:\tiktok\tiktok-automation`) mit dem gewählten Modus; der Modus „Auto“ arbeitet selbständig, „Nur planen“ ändert nichts.
