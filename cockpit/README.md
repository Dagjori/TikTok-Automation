# TikTok-Cockpit (lokal, Regie)

Lokales Cockpit auf Laptop und Desktop-PC (Neubau 07.11., Entscheidungen per Klick): ruhiges Regie-Design ohne 3D-Engine, damit der Rechner beim Rendern nicht überlastet. Dieselben Funktionen wie vorher, dazu Live-Karten für jede laufende Aufgabe und vier Automatiken.

**Start:** Desktop-Verknüpfung „TikTok Cockpit“ oder **Strg+Alt+T**. Ohne Verknüpfung: `node cockpit/starten.mjs`. Der Server läuft unsichtbar auf `http://127.0.0.1:4777` (nur lokal) und bleibt aktiv, bis du im Cockpit auf ⏻ klickst.

**Aufbau:** links die Seitenleiste mit den Bereichen (Tasten **1–6**), rechts Claude einklappbar (**Alt+C**), unten links Meldungen, Automatik, ⟳ Daten neu laden, ♻ Neustart, ⏻ Beenden und der Verbindungsstand (`<Rechner> ⇄ <anderer Rechner>`).

| Bereich | Inhalt |
|---|---|
| **Jetzt** (Startseite) | **Läuft gerade:** jede laufende Aufgabe als Live-Karte (Render und Ton mit Live-Bild bzw. Bild-Raster, Produktion je Video mit Bau · Render · Ton · Prüfung · Buffer, Ideen und Recherche mit Suchen, Quellen und den letzten Arbeitsschritten), dazu die Countdowns der Automatik. Fertig: Haken, die Karte klappt weg und landet unter „Erledigt heute“. **Für dich:** was auf dich wartet (Skript prüfen, Rückfrage, Fehler, Ideen wählen, Vorschläge), je mit Knopf. **Tagesplan** heute und morgen (Idee · Skript · Freigabe · Produktion · Online), **Aktivität**, **Konten** |
| **Studio** | Ideen erzeugen und wählen, Skripte lesen, freigeben, neu schreiben; Knöpfe für Recherche und Übergabe bleiben als Weg von Hand |
| **Produktion** | Handy-Bühne mit Live-Render, Produktionskette, Videos von heute und morgen, Render-Aufträge, Render-Dienst mit Konsole, Rechner |
| **Zahlen** | Konten, Ziele bis zum CRP, jedes Video |
| **Lernen** | Selbständigkeit (Testwoche), Lernschleife, Vorschläge, Lernstand |
| **Radar** | offene Trend-Vorschläge (Klick: Claude bewertet) |

**Automatik** (Entscheidung 07.11., Schalter unten links, gilt für beide Rechner; die Freigabe der Skripte bleibt immer beim Inhaber):
- **Recherche sofort nach Wahl:** beide Slots eines Kontos gewählt → Start nach 15 s, sonst nach 3 Min. (Countdown-Karte mit „Jetzt starten“ und „Warten“).
- **Produktion sofort nach Freigabe:** sind alle Skripte eines Tages freigegeben, startet die Produktion nach 60 s (Zeit zum Zurücknehmen).
- **Ideen jeden Morgen bereit:** täglich ab der eingestellten Uhrzeit (Standard 07:00) Ideen für morgen in beiden Accounts; holt nach, wenn das Cockpit später startet.
- **Fehler einmal selbst wiederholen:** Recherche, Nachprüfung oder Produktion nach 5 Min. einmal erneut; scheitert es wieder, kommt eine Meldung. Was du selbst stoppst, bleibt gestoppt.

**Leistung:** keine WebGL-Welt, kein Vollbild-Canvas, kein backdrop-filter. Animiert wird nur, was gerade arbeitet, über transform und opacity; ist das Fenster verborgen, stehen alle Animationen. Karten werden einmal gebaut und danach nur aktualisiert. Die alte Neon-Stadt (Three.js) und Sprachbot, Arbeitsmusik, Sounds und Maskottchen sind seit 07.11. entfernt (Git-Historie, Commit vor dem Neubau).

**Testen ohne Risiko** (nie gegen das laufende Cockpit): zweite Instanz mit eigener Datenkopie, ohne Abgleich, Render-Dienst und Zahlen, Claude simuliert (`lib/attrappe.mjs`, kein claude-Prozess, nichts geht an Buffer): `COCKPIT_PORT=4779 COCKPIT_DATEN=<Kopie von daten> COCKPIT_KEIN_SPIEGEL=1 COCKPIT_OHNE_DIENST=1 COCKPIT_OHNE_ZAHLEN=1 COCKPIT_RECHNER=TEST COCKPIT_ATTRAPPE=1 node server.mjs`; dazu `COCKPIT_ATTRAPPE_FEHLER=1` (jeder Auftrag scheitert), `COCKPIT_WIEDERHOLEN_S=20` (kürzere Wartezeit), `COCKPIT_OEFFENTLICH=<ordner>` (andere Oberfläche).

**Zwei Rechner** (`lib/abgleich.mjs`, Entscheidung 03.11.): Laptop und Desktop-PC zeigen dasselbe Cockpit. Ideen, Skripte, Vorschläge, Meldungen, Einstellungen und Ziele gleichen sich alle 30 s über Supabase ab; gemeinsame Ereignisse (erreichtes Ziel, Lernschleife des Tages) zählen nur auf einem Rechner. Jeder Rechner meldet sich unter `cockpit/geteilt/rechner/` an. Einrichtung des zweiten Rechners mit fertigem Prompt: `ZWEITER-RECHNER.md`. Unten links in der Seitenleiste: `<Rechner> ⇄ <anderer Rechner>` mit Leuchte.

**Render-Dienst:** läuft als Teil des Cockpits (kein eigenes Fenster), nur solange der Cockpit-Server läuft (Entscheidung 03.11.). Die alte Aufgabe „Render-Dienst“ ist deaktiviert. Ein noch offenes altes Fenster übernimmt das Cockpit mit „⤵ Übernehmen“. Am Desktop-PC bleibt der Dienst eigenständig über die Aufgabenplanung (`daten/einstellungen.json`: `"dienst_autostart": false`); das Cockpit zeigt ihn dort nur an.

**Produktion = Disponent im Cockpit** (Ausbau 3, 03.11.: „alles von hier aus steuern“): Die Automatik (sonst „An Claude übergeben“) startet je Video-Tag eine Produktions-Sitzung (Opus, Modus auto, Bau-Agenten mit Sonnet) nach `anleitung/produktion.md` auf einer **eigenen Spur neben dem Chat** (Filter „Produktion“ in der Claude-Leiste, Live-Karte auf „Jetzt“); sie baut, rendert über den Render-Dienst, prüft und plant in Buffer. „🏭 Produktion starten“ stößt übergebene Videos neu an (z. B. nach ♻), „⏹ Produktion stoppen“ hält nur diese Spur an. Ca. 20 Min. nach der Posting-Zeit startet das Cockpit die Nachprüfung von selbst. Schlüssel bekommt Claude nie: Stimme, Render und Buffer laufen über `werkzeuge/mit_schluessel.mjs` (der Server setzt die Werte aus der `.env` ein und maskiert die Ausgabe); `aktion.mjs stand` zeigt unter `schluessel`, welche vorhanden sind. Der Cloud-Disponent (`docs/automatik/disponent.md`) gilt nur noch für das alte Ideen-Studio.

**Modell-Automatik** (`lib/modelle.mjs`): Opus für Ideen, Skripte, Umsetzungen, Analysen; Sonnet für Status, Zusammenfassung, Produktion und die Lernschleife mit weniger als 5 gereiften Videos je Konto; Haiku nur für reine Textarbeit. Ungültiges Ergebnis → eine Stufe höher. Im Feld „Modell“ lässt sie sich überstimmen.

**Zahlen** (`lib/zahlen.mjs`, `werkzeuge/live_zahlen.py`): Profile alle 30 Min., Videos stündlich (Buffer + 4 neueste TikTok-Seiten); bei Drosselung 6 Std. Pause, nie umgehen. Braucht `BUFFER_API_KEY` in `C:\render\tiktok-automation\pipeline\render_dienst\.env` (selbst eintragen). Eine Sekundenkurve der Zuschauerbindung liefert nur TikTok Studio; das Cockpit zeigt „Ø gesehen“ = Ø Wiedergabezeit ÷ Länge.

**Lernen** (`lib/lernen.mjs`, `anleitung/lernschleife.md`, `anleitung/vorschlag.md`): täglich 19:52 (wenn eingeschaltet), jedes Video einzeln inkl. Design; Vorschläge nur mit Freigabe, eine Testwoche ab dem ersten Vorschlag, danach fragt das Cockpit nach Selbständigkeit oder Verlängerung.

| Datei | Inhalt |
|---|---|
| `server.mjs` | Server ohne npm-Pakete: SSE-Ereignisse, Supabase-Abfrage (Herzschläge, Status), Live-Bilder aus `C:\render\tiktok-automation\pipeline\out\<projekt>\frames`, Tagesplan aus `origin/main`, Claude Code (`claude -p --output-format stream-json`) |
| `starten.mjs` | startet den Server, falls nötig, und öffnet Edge im App-Modus |
| `public/` | Oberfläche ohne Bibliotheken: `kern.js` (Zustand, Verbindung, Seiten), `jetzt.js` (Live-Karten), `studio.js`, `produktion.js`, `zahlen.js` (Zahlen, Lernen, Radar, Meldungen, Automatik), `claude.js`, `app.css` |
| `lib/automatik.mjs` | die vier Automatiken (Takt alle 5 s, je Auslösung ein Anspruch über den Abgleich, damit nur ein Rechner handelt) |
| `daten/` | Ablage, Zahlen, Claude-Verlauf, Logs, Edge-Profil (nicht im Repo) |

**Voraussetzungen:** Node.js; Render-Klon unter `C:\render\tiktok-automation` mit ausgefüllter `pipeline\render_dienst\.env` (Supabase). Der Schlüssel bleibt im Server und wird weder an den Browser noch an Claude weitergegeben. Claude Code einmal selbst in einem normalen PowerShell-Fenster installieren (nicht im Terminal der Claude-App, das leitet AppData um): `irm https://claude.ai/install.ps1 | iex`, danach `claude` starten und anmelden.

**Sicherheit:** Der Server lauscht nur auf 127.0.0.1, prüft den Host-Kopf und verlangt für jede Steuer-Anfrage ein Sitzungs-Token (fremde Webseiten können ihn nicht fernsteuern). Claude läuft im Arbeits-Klon (`C:\tiktok\tiktok-automation`) mit dem gewählten Modus; der Modus „Auto“ arbeitet selbständig, „Nur planen“ ändert nichts.
