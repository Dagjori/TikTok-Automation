# Produktions-Sitzung im Cockpit: Anleitung für Claude Code

Stand 03.11.2026 (Ausbau 3, Wunsch des Inhabers: „alles von hier aus steuern“). Das lokale Cockpit ist auch der **Disponent**: „🚀 An Claude übergeben“ startet dich je Video-Tag als eigene Produktions-Spur neben dem Chat, im Arbeits-Klon `C:\tiktok\tiktok-automation`, Modus auto. Inhaltlich gilt `docs/automatik/tages-sitzung.md` §0, §5 und §6; geändert sind nur die Werkzeuge (Cockpit-Datenbank statt Studio, Windows statt Cloud, Schlüssel-Werkzeug statt Proxy). **Niemand liest im Chat mit:** Rückfragen nur über den Status `rueckfrage` im Slot-Dokument. Der Inhaber sieht jeden Schritt live (🏭 im Feed).

## 0. Grundregeln
1. **Kleine Schritte** (CLAUDE.md §1): Auftrag zuerst mit dem Aufgaben-Werkzeug in nummerierte Teilaufgaben zerlegen, jede mit Beleg abhaken, am Ende Auftrag und Ergebnis abgleichen.
2. **Zuerst** `git pull --rebase origin main`. Für jedes Video gilt der Skill des Accounts (`simulierbar-video` bzw. `stelldirvor-video`), strikt getrennt: `SKILL.md` und die dort genannten Dateien lesen, bevor du baust.
3. **Windows:** Python immer als `py -3`. Hilfsdateien nur unter `cockpit/daten/tmp/`. Bash-Skripte (`./mux.sh` …) laufen über Git Bash.
4. **Datenbank** über `node cockpit/db.mjs` wie in `cockpit/anleitung/skripte.md` §0.4 (get → `version` merken → `update --version`; Exit 3 = neu lesen, nur deine Felder erneut schreiben; Meilenstein mit `meilenstein`). Felder des Cockpits (`status: freigegeben`, `kommentar`, `idee`, `uhrzeit`) nie überschreiben.
5. **Schlüssel:** Du hast keine und liest nie `.env`-Dateien. Jedes Skript, das einen Schlüssel braucht, startest du über das Schlüssel-Werkzeug (gleiche Argumente wie im Skill, nur der Aufruf davor ändert sich):
   - Stimme: `node cockpit/werkzeuge/mit_schluessel.mjs stimme …` statt `python3 pipeline/tts.py …`
   - Render: `node cockpit/werkzeuge/mit_schluessel.mjs render senden <projekt> --konto simulierbar|stelldirvor.pov` bzw. `… render warten …` statt `python3 pipeline/render_dienst/auftrag.py …` (`warten` im Vordergrund, siehe Punkt 7)
   - Buffer: `node cockpit/werkzeuge/mit_schluessel.mjs buffer --video … --kanal … --zeit auto:<datum>:<slot> --text "…"` bzw. `… buffer --nachpruefen` statt `python3 pipeline/post_buffer.py …`
   Meldet das Werkzeug „… fehlt in …\.env“: `status` = `fehler`, `fehler_phase` = `produktion`, `fehler` = genau diese Meldung (der Inhaber trägt den Schlüssel ein), weiter mit dem nächsten Slot.
6. **Modelle:** Du steuerst und nimmst ab (Opus). Produktions-Agenten ausdrücklich `model: sonnet`, **höchstens 2 gleichzeitig**, ihr Auftrag als nummerierte Checkliste; sie melden je Punkt „erledigt/offen“ mit Beleg, du prüfst das gegen die Liste. Agenten nutzen dieselben Werkzeuge (Punkt 5) und schreiben nicht in die Datenbank.
7. **Nie im Hintergrund** (Lehre 03.11.: die erste Produktion brach ab, weil die Sitzung zwei Hintergrund-Agenten startete und ihren Zug beendete): Du läufst als einmaliger Prozess (`claude -p`). Endet dein Zug, enden auch alle Agenten und Befehle. Deshalb Agenten **ohne** `run_in_background` starten (höchstens 2 parallel im selben Aufruf) und auf ihr Ergebnis warten; lange Befehle (`render warten`) im Vordergrund mit Bash-Zeitlimit 600000 ms und bei Zeitablauf erneut aufrufen. Beende deinen Zug erst, wenn jeder Slot `geplant`, `rueckfrage` oder `fehler` ist. Python-Ausgaben sind UTF-8 (setzt das Cockpit).
8. **Nichts außerhalb** von Repo, Cockpit-Datenbank, Buffer und Supabase anlegen. Keine Regel, keinen Skill, keinen Befehl ändern (nur vorschlagen). Nichts Geheimes ins Repo.

## 1. Auftrag
`{"art":"produzieren","datum":"JJJJ-MM-TT","ids":["acc1-…-mittag", …],"hinweis":"…"}` (Slot-ID `<acc1|acc2>-<datum>-<mittag|abend>`, acc1 = Simulierbar/`simulierbar`, acc2 = Stell dir vor/`stelldirvor.pov`). Ein `hinweis` kommt von einer angenommenen Rückfrage oder einem Neustart.

## 2. Ablauf je Slot
**Reihenfolge nach Posting-Zeit, verbindlich (Inhaber 06.11.): zuerst beide 12:30-Videos (Mittag) fertig bis Buffer, erst danach der Bau der 19:30-Videos (Abend); nie ein Abend-Video anfangen, solange ein Mittag-Video nicht in Buffer geplant ist, außer es wartet nur auf einen Render.** Innerhalb eines Slots beide Accounts im Wechsel. Für jeden Slot mit `status` = `uebergeben` oder `produktion` (nach Abbruch: vorhandenen Projektordner weiterverwenden, nichts doppelt posten, vorher `post_id` im Dokument und `pipeline/out/buffer_log.jsonl` prüfen):
1. `status` = `produktion`, `projekt` = Ordnername unter `pipeline/projekte/` (kurz, ASCII, z. B. `solar-speicher`), Meilenstein „Produktion gestartet“.
2. **Faktencheck vor dem Bau** (tages-sitzung.md §5.2): jede Zahl gegen `quellen` und `rechenweg`, Rechnung als Code mit Test in `pipeline/sim/`. Falsch oder veraltet: mit Quelle korrigieren, an `korrekturen` anhängen `{feld, alt, neu, quelle, grund, zeit}`, weiter. **Kippt das Ergebnis:** `status` = `rueckfrage`, `fehler` = was sich ändert und dein Vorschlag; diesen Slot anhalten, die anderen laufen weiter. Meilenstein „Rechnung geprüft“.
3. **Bau nach dem Skill** ab „Skript liegt vor“, inhaltlich 1:1 inklusive Korrekturen: `skript.json` (mit `skript_quelle` = Slot-ID), Stimme (nur Simulierbar, Punkt 0.5), Szene, Standbilder prüfen. Meilensteine „Stimme fertig“, „Szene gebaut“.
4. **Render auf dem PC:** committen, `git pull --rebase`, pushen (der Render-Dienst holt den Stand von `origin/main`), dann `render senden` und `render warten` (Punkt 0.5). Exit 3 = PC offline → Rückfall Cloud-Weg aus CLAUDE.md §4 nur, wenn die Posting-Zeit sonst nicht zu halten ist; sonst Meilenstein „Warte auf den Render-PC“ und den nächsten Slot vorziehen. Meilenstein „Render auf dem PC“.
5. **Komplette Prüfung** (`qc/massstab.py` bzw. `qc/referenz_pov.py`, Text-Überlappung, Kontaktbogen, Skript-Bild-Abgleich, Lautheit) und Abnahme durch dich. **Nie posten, was nicht besteht.** Nach zwei gescheiterten Nachbesserungen: `status` = `fehler`, `fehler_phase` = `produktion`, `fehler` = was fehlt. Meilenstein „Prüfung bestanden“.
6. **Buffer:** `buffer --video <mp4> --kanal simulierbar|stelldirvor.pov --zeit auto:<datum>:<slot> --text "<caption aus dem Dokument>"` (Caption-Format CLAUDE.md §7). Erwartung Status `scheduled`. Dann `status` = `geplant`, `post_id`, `geplant_fuer` (ISO mit Zone), `fortschritt` = „In Buffer geplant für <Wochentag> <Uhrzeit>“. Zeile an `data/produktion/protokoll.csv` (`datum,slot,konto,titel,projekt,post_id,status`), committen, pushen.

## 3. Abschluss
1. Alle Slot-Dokumente des Tages erneut lesen (`node cockpit/db.mjs liste skripte datum=<datum>`): Sind inzwischen weitere auf `uebergeben` gesprungen, sie nach §2 mitnehmen.
2. Abschlussnachricht: je Slot Titel und Status, dazu offene Punkte. Das Cockpit meldet das Ende selbst und setzt Slots, die noch auf `uebergeben`/`produktion` stehen, auf `fehler`.

## 4. Nachprüfung (eigener kleiner Auftrag)
Das Cockpit startet ca. 20 Min. nach der Posting-Zeit `{"art":"nachpruefen","datum":"…","id":"…"}`: `buffer --nachpruefen` (öffentlich, Länge, KI-Label wie gesetzt; löscht danach die Supabase-Datei). Bestanden → `status` = `gepostet`, `nachgeprueft` = Zeit, Protokollzeile auf `gepostet`, committen, pushen. Sonst `status` = `fehler`, `fehler_phase` = `nachpruefen`, `fehler` = Befund. Nichts sonst tun.

## 5. Grenzen
- Nutzungslimit oder Abbruch: Das Cockpit setzt nicht fertige Slots auf `fehler`; „Erneut versuchen“ setzt fort (§2 Abbruch-Regel).
- Keine TikTok-Schutzmaßnahmen umgehen, keine fremden Videos laden (CLAUDE.md §2).
