# Cockpit auf einem zweiten Rechner (Desktop-PC)

Entscheidungen des Inhabers vom 03.11.2026:
- Laptop und Desktop-PC zeigen **dasselbe Cockpit mit denselben Daten**.
- Am PC **bleibt der Render-Dienst dauerhaft an** (Aufgabe „Render-Dienst“ in der Aufgabenplanung). Das Cockpit dort zeigt ihn nur an und übernimmt ihn nicht (`daten/einstellungen.json`: `"dienst_autostart": false`).
- Der Code kommt über GitHub, ein Update ist ein `git pull`.

## So bleiben beide gleich (`lib/abgleich.mjs`)

Alles läuft über den Supabase-Speicher, den Cockpit und Render-Dienst ohnehin nutzen. Jeder Rechner holt alle 30 Sekunden die Änderungen der anderen. Unten in der Fußzeile steht `● verbunden · <dieser Rechner> ⇄ <anderer Rechner>`.

| Was | Wo in Supabase | Regel |
|---|---|---|
| Ideen, Skripte, Lernstände, Vorschläge, Meldungen | `cockpit/db/<sammlung>/<id>.json` | Die höhere Version gewinnt, bei gleicher Version die neuere Änderung. Übernommenes löst nichts erneut aus. Eine neue Meldung kommt auf beiden Rechnern als Push. |
| Einstellungen (Studio-Start, Lernschleife an/aus, Testwoche) | `cockpit/geteilt/einstellungen.json` | Je Einstellung gewinnt die neuere Änderung. `dienst_autostart` gilt nur je Rechner. |
| Missionen (Startwerte der Follower, erreichte Missionen) | `cockpit/geteilt/zahlen.json` | Wird zusammengeführt. |
| XP, Level, Erfolge, Streak, Statistik | `cockpit/geteilt/spielstand/<rechner>.json` | Jeder Rechner schreibt nur seinen eigenen Beitrag, angezeigt wird die Summe. |
| „Wer zuerst kommt“ | `cockpit/ansprueche/<schluessel>.json` | Render-XP je Auftrag, Missionen, Erfolge, die Lernschleife des Tages und die Frage nach der Testwoche zählen nur auf dem Rechner, der die Datei zuerst anlegt. Supabase legt eine vorhandene Datei nie zweimal an. |

Nur je Rechner bleiben: der Claude-Chatverlauf, die Logs, das Edge-Profil und die Live-Zahlen-Abrufe. Beide Rechner fragen Buffer und TikTok schonend ab.

Die Lernschleife läuft täglich um 19:52 auf genau einem Rechner: auf dem, der den Tag zuerst beansprucht. Ist einer aus, übernimmt der andere.

## Prompt für Claude Code am PC

In Claude Code am PC einfügen, zum Beispiel im Code-Tab der Claude-App:

```text
Richte auf diesem Windows-PC das TikTok-Cockpit ein, genauso wie auf meinem Laptop (LAPTOP-87LA6UTG). Beide Rechner sollen dasselbe Cockpit mit denselben Daten zeigen; der Abgleich läuft automatisch über Supabase. Die Anleitung ist cockpit/ZWEITER-RECHNER.md im Repo https://github.com/Dagjori/TikTok-Automation (Branch main). Dieser PC ist mein Render-PC: Der Render-Dienst läuft hier dauerhaft über die Windows-Aufgabe „Render-Dienst“ und bleibt genau so.

1. Prüfe mit winget list, ob Git.Git, OpenJS.NodeJS.LTS und Python 3 (py -3 --version) da sind. Fehlt Node.js, installiere OpenJS.NodeJS.LTS mit winget.
2. Arbeitsklon: Gibt es C:\tiktok\tiktok-automation noch nicht, dann: git clone -c core.autocrlf=false https://github.com/Dagjori/TikTok-Automation.git C:\tiktok\tiktok-automation. Gibt es ihn, dort git pull. Den Render-Klon C:\render\tiktok-automation fasst du nicht an (er gehört nur dem Render-Dienst), du liest dort höchstens die .env wie unten beschrieben.
3. Lies cockpit/ZWEITER-RECHNER.md und cockpit/README.md im Arbeitsklon.
4. Lege VOR dem ersten Start C:\tiktok\tiktok-automation\cockpit\daten\einstellungen.json mit genau diesem Inhalt an: {"dienst_autostart": false}. Sonst versucht das Cockpit, den Render-Dienst zu übernehmen.
5. Claude Code CLI: Prüfe, ob C:\Users\<mein Benutzer>\.local\bin\claude.exe existiert. Fehlt sie, sag mir, dass ich in einem normalen PowerShell-Fenster (Startmenü, NICHT im Terminal der Claude-App) irm https://claude.ai/install.ps1 | iex eingebe, danach claude starte und mich mit meinem Abo anmelde. Warte, bis ich „angemeldet“ schreibe.
6. Buffer-Schlüssel: Prüfe nur, OB in C:\render\tiktok-automation\pipeline\render_dienst\.env eine Zeile BUFFER_API_KEY= mit einem Wert steht, ohne den Wert zu lesen oder anzuzeigen (z. B. nur Ja/Nein ausgeben). Fehlt sie, öffne die Datei in Notepad und sag mir, dass ich in eine neue Zeile BUFFER_API_KEY= und direkt dahinter meinen Schlüssel von publish.buffer.com/settings/api eintrage und speichere.
7. Lege auf dem Desktop die Verknüpfung „TikTok Cockpit“ an: Ziel node.exe (voller Pfad), Argument "C:\tiktok\tiktok-automation\cockpit\starten.mjs", Ausführen in C:\tiktok\tiktok-automation, Fenster minimiert, Tastenkürzel Strg+Alt+T, Symbol C:\tiktok\tiktok-automation\cockpit\cockpit.ico.
8. Starte den Cockpit-Server NICHT selbst aus dem Terminal der Claude-App (die App leitet AppData um, dann fehlen ihm Dinge). Sag mir, dass ich die Verknüpfung doppelklicke. Prüfe danach über http://127.0.0.1:4777/api/zustand (nur lesen): rechner = Name dieses PCs, supabase true, abgleich.fehler null, abgleich.rechner enthält LAPTOP-87LA6UTG, db enthält die Skripte und Ideen vom Laptop, spiel.xp ist so hoch wie am Laptop, einstellungen.dienst_autostart false, dienst.status "aus", in render.rechner ist dieser PC online. Weicht etwas ab, such die Ursache in cockpit\daten\server.log.
9. Zeig mir zum Schluss, was ich sehen soll: Fußzeile „● verbunden · <dieser PC> ⇄ LAPTOP-87LA6UTG“, Dienst-Karte links „läuft eigenständig“, unter 🌐 dieselbe Neon-Stadt wie am Laptop.

Regeln: Den Inhalt der .env (Supabase- und Buffer-Schlüssel) liest du nie aus, zeigst ihn nie an und fragst mich nie danach; ich trage Schlüssel selbst ein. Nichts committen oder pushen. Nichts im Render-Klon ändern. Die Aufgabe „Render-Dienst“ nicht ändern oder abschalten. Keine Administrator-Tricks, keine Sicherheitseinstellungen umgehen. Ist etwas unklar, frag mich gebündelt.
```

## Wenn etwas hakt

| Zeichen | Ursache und Lösung |
|---|---|
| Fußzeile ohne `⇄`, Tooltip „Abgleich gestört“ | Supabase nicht erreichbar oder die `.env` im Render-Klon fehlt bzw. ist falsch. Das Cockpit arbeitet dann allein weiter und gleicht alles nach, sobald die Verbindung steht. |
| Dienst-Karte am PC zeigt „aus“ mit ▶-Knopf | `daten/einstellungen.json` ohne `"dienst_autostart": false`. Eintragen und das Cockpit neu starten (♻). |
| Dienst-Karte „kein Herzschlag“ | Die Aufgabe „Render-Dienst“ läuft nicht. Prüfen nach `docs/18-render-pc.md`, Schritt 8. |
| Claude-Bereich zeigt „Claude Code fehlt“ | CLI in einem normalen PowerShell-Fenster installieren und anmelden (Schritt 5 des Prompts). |
| Update auf einem Rechner | Im Arbeitsklon `git pull`, dann im Cockpit ♻. |
