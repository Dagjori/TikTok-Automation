# TikTok-Cockpit (lokal, Neon-Stadt)

Lokales Cockpit auf Laptop und Desktop-PC als begehbare 3D-Neon-Stadt (Entscheidungen 03.11.): Die Stadt ist die Zentrale, sieben Gebäude sind anklickbar und führen in Räume, in denen die Inhalte auf Wandbildschirmen stehen. Live-Render, Produktionskette, Studio, Zahlen, Ziele bis zum CRP, Lernschleife, Trend-Radar und Claude Code live.

**Start:** Desktop-Verknüpfung „TikTok Cockpit“ oder **Strg+Alt+T**. Ohne Verknüpfung: `node cockpit/starten.mjs`. Der Server läuft unsichtbar auf `http://127.0.0.1:4777` (nur lokal) und bleibt aktiv, bis du im Cockpit auf ⏻ klickst.

**Neon-Stadt** (`public/stadt/`, Three.js r170 lokal unter `public/vendor/three/`, MIT): Ohne Eingabe fliegt die Kamera langsam durch die Stadt; ziehen dreht, Mausrad zoomt, nach 25 s ohne Eingabe fliegt sie weiter. Tag und Nacht laufen in Echtzeit nach dem Berliner Sonnenstand (`stadt/sonne.js`): tagsüber Pastellhimmel mit schwächerem Neon, kräftiger Synthwave-Sonnenuntergang, nachts Neon, leuchtende Fenster, Sterne und Mond. Wolken, Regen, Schnee und Nebel folgen dem echten Berliner Wetter (Open-Meteo, ohne Konto, alle 30 Min. über den Server, `lib/wetter.mjs`). Dazu fliegender Verkehr, eine Anzeigetafel (Follower, nächstes Posting, CRP-Ziel) und Lieferroboter zwischen den Gebäuden; Feuerwerk bei Follower-Zuwachs, erreichtem Ziel, fertigem Render. Die Stadt wird mit fester Saat gebaut, beide Rechner zeigen dieselbe.

**Gebäude und Räume** (Schnellwahl oben, Tasten 1–7, 0 = Stadt; Esc geht einen Schritt zurück, ←/→ wechseln den Raum):

| Gebäude | Räume |
|---|---|
| 🎬 Live-Zentrale | Regie (Live-Render, Ablauf), Tagesplan (heute online, Videos, Render-Aufträge), Technik (Render-Dienst, Rechner) |
| 💡 Studio | Ideenwerkstatt, Schreibstube (Videos des Tages, Skript, Freigabe) |
| 📈 Zahlen-Turm | Konten, Videoarchiv (jedes Video) |
| 🎯 Ziele-Turm | Ziele bis zum CRP; der Turm füllt sich mit dem Fortschritt zu 10.000 Followern |
| 🧠 Lernzentrale | Lernschleife (mit Selbständigkeit/Testwoche), Vorschläge, Lernstand |
| 📡 Trend-Radar | alle offenen Trend-Vorschläge |
| 🤖 Claude-Hauptquartier | Claude groß an der Wand, Aufgaben und Schnellbefehle |

Die Kamera fliegt durch die Tür in einen echten 3D-Raum; die Bildschirme sind die HTML-Bausteine des Cockpits, per CSS-3D an die Wand gesetzt (`stadt/raeume.js`), ein Klick holt einen Bildschirm scharf heran. Roboter im Stil von Simu arbeiten in den Räumen, geschäftig, wenn dort wirklich etwas läuft (Render, Claude, Ideen, Lernschleife). `zentrale.js` verbindet beides: Die Bausteine liegen unsichtbar in der Ablage von `index.html` und wandern beim Betreten eines Raums auf seine Bildschirme. Claude sitzt sonst einklappbar am rechten Rand (Lasche mit Simu-Gesicht, **Alt+C**). 🔔 Meldungen (auch als Windows-Benachrichtigung), 🎙️ Sprachbot (Strg+M, „geh ins Studio“, „zeig die Stadt“, „Pause“ beendet), 🎵 Arbeitsmusik.

**Qualität** (✨): Auto (Entscheidung 03.11.: volle Pracht, sparsam, solange dieser Rechner rendert), Ultra, Sparsam, Aus. Ruckelt Ultra, rendert die Stadt von selbst gröber. Bei „Aus“ oder ohne WebGL zeigt ein flacher Stadtplan die sieben Gebäude, die Räume stehen dann flach nebeneinander. **Ausprobieren ohne Server:** `public/stadt-vorschau.html?zeit=17:10&wetter=regen` (Beispieldaten; `tempo=600` lässt den Tag schnell ablaufen).

**Kein Spielsystem** (Entscheidung 03.11.: „Alles Spielerische weg, nur die Ziele bleiben“): keine XP, Level, Erfolge, Streak, Quests oder Combo. Die Ziele bis zum CRP bleiben (Ziele-Turm, Meldung und Feuerwerk beim Erreichen).

**Zwei Rechner** (`lib/abgleich.mjs`, Entscheidung 03.11.): Laptop und Desktop-PC zeigen dasselbe Cockpit. Ideen, Skripte, Vorschläge, Meldungen, Einstellungen und Ziele gleichen sich alle 30 s über Supabase ab; gemeinsame Ereignisse (erreichtes Ziel, Lernschleife des Tages) zählen nur auf einem Rechner. Jeder Rechner meldet sich unter `cockpit/geteilt/rechner/` an. Einrichtung des zweiten Rechners mit fertigem Prompt: `ZWEITER-RECHNER.md`. Fußzeile: `● verbunden · <Rechner> ⇄ <anderer Rechner>`.

**Render-Dienst:** läuft als Teil des Cockpits (kein eigenes Fenster), nur solange der Cockpit-Server läuft (Entscheidung 03.11.). Die alte Aufgabe „Render-Dienst“ ist deaktiviert. Ein noch offenes altes Fenster übernimmt das Cockpit mit „⤵ Übernehmen“. Am Desktop-PC bleibt der Dienst eigenständig über die Aufgabenplanung (`daten/einstellungen.json`: `"dienst_autostart": false`); das Cockpit zeigt ihn dort nur an.

**Modell-Automatik** (`lib/modelle.mjs`): Opus für Ideen, Skripte, Umsetzungen, Analysen; Sonnet für Status, Zusammenfassung, Produktion und die Lernschleife mit weniger als 5 gereiften Videos je Konto; Haiku nur für reine Textarbeit. Ungültiges Ergebnis → eine Stufe höher. Im Feld „Modell“ lässt sie sich überstimmen.

**Zahlen** (`lib/zahlen.mjs`, `werkzeuge/live_zahlen.py`): Profile alle 30 Min., Videos stündlich (Buffer + 4 neueste TikTok-Seiten); bei Drosselung 6 Std. Pause, nie umgehen. Braucht `BUFFER_API_KEY` in `C:\render\tiktok-automation\pipeline\render_dienst\.env` (selbst eintragen). Eine Sekundenkurve der Zuschauerbindung liefert nur TikTok Studio; das Cockpit zeigt „Ø gesehen“ = Ø Wiedergabezeit ÷ Länge.

**Lernen** (`lib/lernen.mjs`, `anleitung/lernschleife.md`, `anleitung/vorschlag.md`): täglich 19:52 (wenn eingeschaltet), jedes Video einzeln inkl. Design; Vorschläge nur mit Freigabe, eine Testwoche ab dem ersten Vorschlag, danach fragt das Cockpit nach Selbständigkeit oder Verlängerung.

| Datei | Inhalt |
|---|---|
| `server.mjs` | Server ohne npm-Pakete: SSE-Ereignisse, Supabase-Abfrage (Herzschläge, Status), Live-Bilder aus `C:\render\tiktok-automation\pipeline\out\<projekt>\frames`, Tagesplan aus `origin/main`, Claude Code (`claude -p --output-format stream-json`), Wetter |
| `starten.mjs` | startet den Server, falls nötig, und öffnet Edge im App-Modus |
| `public/` | Oberfläche (HTML, CSS, JS; einzige Bibliothek: Three.js, lokal in `public/vendor/three/`); `stadt/` = Neon-Stadt, `zentrale.js` = Verbindung zu den Inhalten |
| `daten/` | Ablage, Zahlen, Claude-Verlauf, Logs, Edge-Profil (nicht im Repo) |

**Voraussetzungen:** Node.js; Render-Klon unter `C:\render\tiktok-automation` mit ausgefüllter `pipeline\render_dienst\.env` (Supabase). Der Schlüssel bleibt im Server und wird weder an den Browser noch an Claude weitergegeben. Claude Code einmal selbst in einem normalen PowerShell-Fenster installieren (nicht im Terminal der Claude-App, das leitet AppData um): `irm https://claude.ai/install.ps1 | iex`, danach `claude` starten und anmelden.

**Sicherheit:** Der Server lauscht nur auf 127.0.0.1, prüft den Host-Kopf und verlangt für jede Steuer-Anfrage ein Sitzungs-Token (fremde Webseiten können ihn nicht fernsteuern). Claude läuft im Arbeits-Klon (`C:\tiktok\tiktok-automation`) mit dem gewählten Modus; der Modus „Auto“ arbeitet selbständig, „Nur planen“ ändert nichts.
