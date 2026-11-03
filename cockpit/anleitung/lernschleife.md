# Lernschleife im Cockpit: Anleitung für Claude Code

Stand 03.11.2026. Übernimmt die bisherige Cloud-Aufgabe „Lernschleife Insights täglich“ (19:52) und erweitert sie auf Wunsch des Inhabers: **jedes Video einzeln** auswerten, auch **Design und Umsetzung** prüfen und konkrete Verbesserungen vorschlagen. Das Cockpit hat die Zahlen gerade mit `tools/insights_abrufen.py` geholt (Ergebnis in der ersten Nachricht); du rufst es nicht selbst auf (der Buffer-Schlüssel liegt nur beim Cockpit). Verbindlich zusätzlich: `hirn/01-Projekt/Lernschleife und Insights.md`.

## Harte Regeln
- Du änderst **keine** Regel, keinen Skill, keinen Befehl und kein Design. Du **schlägst nur vor**; das Cockpit meldet jeden Vorschlag dem Inhaber per Push, er gibt frei (Testwoche) oder das Cockpit setzt nach seiner Entscheidung selbständig um. Den Lernstand pflegst du selbst.
- Kein Zahlenbericht im Chat. Je Konto getrennt, nie Konto gegen Konto vergleichen.
- Unter 5 Videos je Konto oder unter 1.000 Aufrufen sind Aussagen nur Annahmen (A), nie Fakten (F). Kausalität nie behaupten, nur „spricht dafür“.
- Keine TikTok-Schutzmaßnahmen umgehen, nichts von TikTok selbst abrufen. Windows: `py -3` statt `python3`; Hilfsdateien nur unter `cockpit/daten/tmp/`. Nie `.env` lesen.
- **Grenze der Daten (ehrlich benennen):** Buffer und öffentliche Seiten liefern keine Sekunden-Kurve der Zuschauerbindung und keine Zeitpunkte von Kommentaren. Bindung nur über „Ø Wiedergabezeit ÷ Videolänge“ und den Vergleich der Videos untereinander.

## Schritte
1. `git pull --rebase origin main`. Aufgabenliste mit nummerierten Schritten anlegen (CLAUDE.md §1).
2. **Daten lesen:** `data/insights/letzter_abruf.json` und `data/insights/metriken.csv` (Verlauf), dazu die aktuelleren Live-Zahlen des Cockpits in `cockpit/daten/zahlen/stand.json` (`posts[].tiktok` = öffentliche Seite, `posts[].buffer` = Buffer). Gereift sind das Mittagsvideo von heute und alles Ältere; das Abendvideo von heute kommt morgen dran.
3. **Jedes Video einzeln** (Tabelle je Konto): Aufrufe, Likes je Aufruf, Kommentare, Shares, Saves, Ø-Wiedergabezeit als Anteil der Länge, Follower-Zuwachs, Entwicklung über die Abrufe, Posting-Zeit. Verknüpfe jedes Video mit seiner Umsetzung: `pipeline/projekte/<projekt>/skript.json` (Hook-Formulierung, Art der Frage, Aufbau, Länge, Tempo, Stil bzw. Welt, Caption, `lern_notizen`) und `ereignisse.json`/Szene (Animationen, Zoom, Licht, Effekte, Bildwechsel mit Zeitpunkt).
4. **Design und Qualität prüfen**, je Video: Wo verliert es vermutlich Zuschauer (schwacher Einstieg in den ersten 2 s, Leerlauf, zu lange Erklärphase, unlesbarer Text, zu wenig Bewegung, Ton zu leise)? Was hebt die guten ab? Suche **Muster** über mehrere Videos, keine Einzelthemen. Nutze den Maßstab im Skill des Kontos (`massstab.md` bzw. `pruefung.md`) als Messlatte.
5. **Insights-Notiz** `hirn/04-Recherche/Insights JJJJ-MM-TT.md` (Kopf: typ recherche, konto gemeinsam, status aktuell, datum, quelle `data/insights/metriken.csv`, tags [konto/gemeinsam, insights]; Vorlage `hirn/05-Vorlagen/Vorlage Recherche.md`): Tabelle je Konto, Beobachtungen mit F/S/A, Hypothesen, Vorschläge. Kein Konkurrenzinhalt, keine Geheimnisse, keine Supabase-Adresse.
6. **Lernstand** (kurz, höchstens 1.200 Zeichen je Konto, nur belegte Muster mit Datum, keine Regeln) in der Cockpit-Datenbank: `node cockpit/db.mjs get stand lernstand-acc1` (Simulierbar) bzw. `lernstand-acc2` (Stell dir vor), dann `update --version <N>` mit `text`, `quelle` = „Lernschleife JJJJ-MM-TT“, `aktualisiert`. Startwerte, die noch gelten, behalten; Überholtes ersetzen.
7. **Vorschläge** (höchstens 3 neue je Lauf, nur mit echtem Hebel; vorher `node cockpit/db.mjs liste vorschlaege status=offen` lesen und nichts doppelt vorschlagen): je Vorschlag ein Dokument
   `node cockpit/db.mjs set vorschlaege v-<JJJJ-MM-TT>-<acc1|acc2>-<n> --datei cockpit/daten/tmp/<datei>.json` mit
   `{konto, bereich (hook|skript|tempo|design|animation|licht|ton|caption|thema|postingzeit|technik), titel, vorschlag (konkret, was sich ab dem nächsten Video ändert), begruendung: {messung, schluss, aenderung}, betrifft (Datei/Skill-Abschnitt), risiko, prioritaet (hoch|mittel|niedrig), belege [Video-Titel], datum, status: "offen", quelle: "lernschleife"}`.
   Dazu eine Zeile unter „Offene Punkte“ in `hirn/01-Projekt/Stand und nächste Schritte.md`. Nie selbst umsetzen.
8. Committe gezielt nur `data/insights`, die neue Insights-Notiz und `hirn/01-Projekt/Stand und nächste Schritte.md` mit „Insights JJJJ-MM-TT“; vorher nach Secrets greppen (`sb_secret`, `supabase.co`); auf main pushen (`git pull --rebase` vorher).
9. Letzte Antwort genau eine Zeile: „Insights JJJJ-MM-TT: n Videos ausgewertet, m neue Vorschläge.“
