# Skript-Sitzung im Cockpit (Laptop): Anleitung für Claude Code

Stand 03.11.2026. Das lokale Cockpit ersetzt das Ideen-Studio (Entscheidung des Inhabers 03.11.). Es startet dich mit einem Auftrag (JSON unten in der ersten Nachricht) im Arbeits-Klon `C:\tiktok\tiktok-automation`, seit 07.11. auch von selbst kurz nach der Wahl einer Idee (Automatik), nicht nur über den Knopf „Skripte recherchieren lassen“. Inhaltlich gelten dieselben Regeln wie in `docs/automatik/tages-sitzung.md` §0, §3 und §4; geändert sind nur die Werkzeuge (Cockpit-Datenbank statt Studio, Windows statt Cloud). **Niemand liest im Chat mit:** Rückfragen nur über den Status `rueckfrage` im Slot-Dokument. Der Inhaber sieht jeden deiner Schritte live im Cockpit.

## 0. Grundregeln
1. **Kleine Schritte** (CLAUDE.md §1): Zerlege den Auftrag zuerst mit deinem Aufgaben-Werkzeug in nummerierte Teilaufgaben, hake jede mit Beleg ab, gleiche am Ende Auftrag und Ergebnis ab.
2. **Zuerst** `git pull --rebase origin main`. CLAUDE.md ist geladen; für jedes Skript gelten die Befehle aus `tools/chat_befehle.py` und die Regeln des Accounts im Hirn (zuerst das REA-Regelwerk des Accounts), strikt getrennt.
3. **Windows:** Python immer als `py -3` (nicht `python3`, das öffnet den Microsoft Store). Hilfsdateien nur unter `cockpit/daten/tmp/` (wird nicht committet).
4. **Datenbank des Cockpits** über `node cockpit/db.mjs` (Ausgabe JSON):
   - lesen: `node cockpit/db.mjs get skripte <id>` (Feld `version` merken), `node cockpit/db.mjs get stand lernstand-acc1`
   - schreiben: Felder als JSON-Datei unter `cockpit/daten/tmp/` ablegen, dann `node cockpit/db.mjs update skripte <id> --version <N> --datei cockpit/daten/tmp/<datei>.json`. Exit 3 = Versionskonflikt: neu lesen und **nur deine Felder** erneut schreiben.
   - Fortschritt (ohne Version, ein kurzer Satz je Meilenstein): `node cockpit/db.mjs meilenstein skripte <id> "Recherche läuft"`
   - Felder, die das Cockpit setzt (`status: freigegeben`, `kommentar`, `idee`, `idee_nr`, `uhrzeit`), nie überschreiben.
5. **Nichts außerhalb** von Repo und Cockpit-Datenbank anlegen. Im Skript-Schritt **nichts committen** (die Skripte liegen in der Datenbank). Keine Regel, keinen Skill und keinen Befehl ändern (nur vorschlagen). **Nie `.env`-Dateien lesen**, keine Schlüssel ausgeben.
6. **Modelle:** Recherche und Skript machst du selbst (Opus). Höchstens 2 Agenten gleichzeitig, ausdrücklich `model: sonnet`, ihr Auftrag als nummerierte Checkliste.
7. Am Ende: kurze Abschlussnachricht je Slot (Titel, Status).

## 1. Aufträge
- `{"art":"skripte","datum":"…","konto":"simulierbar|stelldirvor","slots":["acc1-…-mittag", …]}` → §2
- `{"art":"neu_schreiben","datum":"…","konto":"…","slot":"mittag|abend","kommentar":"…"}` → §3 (Slot-ID: `<acc1|acc2>-<datum>-<slot>`, acc1 = simulierbar, acc2 = stelldirvor)

## 2. Skripte recherchieren und schreiben
Für jeden Slot (nacheinander, Mittag zuerst):
1. Slot-Dokument lesen. Weiter nur bei `status` = `recherche` (sonst überspringen und in der Abschlussnachricht nennen). Meilenstein „Recherche läuft“.
2. **Befehl holen:** das Feld `idee` des Dokuments nach `cockpit/daten/tmp/idee-<id>.json` schreiben und den Lernstand (`stand/lernstand-<acc1|acc2>` → `text`) nach `cockpit/daten/tmp/lernstand-<acc>.txt`, dann
   `py -3 tools/chat_befehle.py --skript-auftrag <simulierbar|stelldirvor> --ideen cockpit/daten/tmp/idee-<id>.json --lernstand cockpit/daten/tmp/lernstand-<acc>.txt [--kommentar "<Kommentar des Inhabers>"]`
   **Nur mit `--skript-auftrag` aufrufen** (ohne den Schalter schreibt das Skript Studio-Dateien und Hirn-Notizen neu). Die Ausgabe ist dein verbindlicher Auftrag (Rolle, Faktentreue, Spannung, Aufbau, Stimme bzw. Sätze, Caption, Recherche, JSON-Form). Dazu gelten aus dem Hirn: Simulierbar `REA Simulierbar Regelwerk`, `Videoaufbau Simulierbar` §1–§5 und `Stimme und Ton Simulierbar`; Account 2 `REA stelldirvor Regelwerk`, `Ablauf Account 2` „Skript-Anforderungen“ und `Themen und Plan Account 2` §2–§3 (Weltvielfalt).
3. **Recherche:** jede Zahl, jedes Datum, jede Regel per Websuche belegen, die Primärquelle öffnen, wenn die Suche nur einen Ausschnitt zeigt. Stand passend zum Video-Tag (Jahr, Rechtsstand, Preise). Rechne jedes Ergebnis mit `py -3` nach (Skript unter `cockpit/daten/tmp/`). Meilenstein „Zahlen belegt“.
4. **Trägt die Idee nicht** (Zahlen nicht belegbar, Themen-Logik falsch, Ausschlussthema): nichts erfinden. `status` = `fehler`, `fehler_phase` = `recherche`, `auto_wiederholt_phase` = `recherche` (eine automatische Wiederholung hilft hier nicht; das Cockpit fragt dann gleich den Inhaber), `fehler` = Grund in einem Satz plus Vorschlag (z. B. andere Idee aus der Liste).
5. **Skript schreiben** genau in der JSON-Form des Befehls (ein Objekt), Selbstprüfung ausfüllen: Simulierbar 150–190 Wörter Sprechtext (ohne Audio-Tags gezählt), höchstens 3 Ausrufezeichen, keine Tags `[excited]`/`[shouting]`/`[energetic]`, kein `<break>`, kein „Los geht's“, feste Sätze (Folgen-Aufruf, Schluss); Account 2: 12–18 Sätze mit 3–9 Wörtern, Anzeige passt zum Zeitraffer, Faktenzeile.
6. **Schreiben** (`update` mit `--version`): `status` = `skript_fertig`, `skript` = das Objekt, dazu auf oberster Ebene `titel`, `thema`, `quellen`, `zahlen`, `rechenweg`, `annahmen`, `caption`, `dramaturgie`, `selbstpruefung`, `faktencheck` = `recherchiert`, `fortschritt` = „Skript fertig, bitte prüfen“, `aktualisiert` (ISO-Zeit). Danach Meilenstein „Skript fertig, bitte prüfen“.

## 3. Neu schreiben
Wie §2, aber der `kommentar` des Inhabers hat Vorrang (an `--kommentar` übergeben). Was er nicht kritisiert, bleibt möglichst gleich. Am Ende `kommentar` nicht löschen, sondern `kommentar_erledigt` = Zeit setzen.

## 4. Grenzen
- Nutzungslimit erreicht oder Abbruch: Das Cockpit setzt nicht fertig gewordene Slots auf `fehler` mit Hinweis; es startet die Recherche nach 5 Min. einmal selbst neu (Automatik seit 07.11.), scheitert sie erneut, fragt es den Inhaber.
- Keine TikTok-Schutzmaßnahmen umgehen, keine fremden Videos laden (CLAUDE.md §2).
