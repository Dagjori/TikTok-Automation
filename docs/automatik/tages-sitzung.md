# Tages-Sitzung: Anleitung für Claude Code (vom Ideen-Studio gestartet)

Stand 02.11.2026 (Entscheidungen des Inhabers: Claude Code recherchiert und schreibt die Skripte; Faktenfehler korrigieren und weiter, anhalten nur, wenn das Ergebnis kippt; Push bei Problemen, wenn Skripte fertig sind und wenn alles geplant ist).

Das Ideen-Studio (Artifact https://claude.ai/artifact/PMqMpqpmSHYmuhY229ghZC) startet **je Video-Tag genau eine Claude-Code-Sitzung** (Modell Opus 5.5, Modus „Auto“) und schickt ihr Aufträge. Die erste Nachricht enthält den ersten Auftrag, weitere Aufträge kommen als neue Nachrichten in dieselbe Sitzung. Du bist diese Sitzung. **Niemand liest im Chat mit:** Rückfragen gehen nur über Status `rueckfrage` und eine Push-Nachricht, nie als Frage im Chat.

## 0. Grundregeln (immer)
1. **Kleine Schritte** (CLAUDE.md §1): Zerlege jeden Auftrag zuerst in nummerierte Teilaufgaben (TaskCreate), hake jede mit Beleg ab, gleiche am Ende Auftrag und Ergebnis ab.
2. **Zuerst:** `git pull --rebase origin main`. CLAUDE.md ist geladen; für jedes Video gilt der Skill des Accounts (`simulierbar-video` bzw. `stelldirvor-video`), strikt getrennt.
3. **Datenbank des Studios:** Werkzeug `ArtifactData` (per ToolSearch `select:ArtifactData` laden), `url` = Studio oben. Vor jedem Schreiben `get` (Version merken), dann `update` mit `if_version`; bei Versionskonflikt neu lesen und nur deine Felder erneut schreiben. Felder, die das Studio setzt (`status: freigegeben`, `kommentar`, `idee`), nie überschreiben.
4. **Fortschritt sichtbar machen:** Bei jedem Meilenstein im Slot-Dokument `fortschritt` (ein kurzer Satz) setzen und an `verlauf` einen Eintrag `{zeit, text}` anhängen (höchstens 30 Einträge, älteste zuerst löschen). Nicht öfter als einmal je Schritt.
5. **Push-Nachricht** (Werkzeug `PushNotification`, per ToolSearch laden): (a) Skripte fertig, (b) alle übergebenen Videos geplant, (c) Probleme (Rückfrage, Fehler, PC offline mit Verzug). Kurz, deutsch, mit Tag und Titel. Fehlt das Werkzeug: im Slot-Dokument vermerken.
6. **Nichts außerhalb** von Repo, Studio-Datenbank, Buffer und Supabase anlegen. Keine Regel, keinen Skill und keinen Befehl ändern (nur vorschlagen). Keine Geheimnisse und keine Supabase-Adresse ins Repo.
7. **Modelle:** Recherche, Skripte und Abnahme machst du selbst (Opus). Produktions-Agenten ausdrücklich mit `model: sonnet`, **höchstens 2 gleichzeitig**, gestaffelt, ihr Auftrag als nummerierte Checkliste; sie melden je Punkt „erledigt/offen“ mit Beleg, du prüfst das gegen die Liste.
8. Am Ende jedes Auftrags: kurze Abschlussnachricht (je Slot: Titel, Status) und für jedes fertige Video committen und pushen (`git pull --rebase` vorher).

## 1. Datenmodell (Sammlungen der Studio-Datenbank)
| Dokument | Schreibt | Inhalt |
|---|---|---|
| `ideen/<acc1|acc2>-JJJJ-MM-TT` | Studio | `konto`, `datum`, `ideen` (10), `wunsch`, `erzeugt` |
| `skripte/<acc1|acc2>-JJJJ-MM-TT-<mittag|abend>` | beide | **ein Dokument je Video** (Slot): `konto`, `datum`, `slot`, `uhrzeit`, `idee`, `titel`, `status`, `skript`, `quellen`, `zahlen`, `rechenweg`, `annahmen`, `caption`, `dramaturgie`, `selbstpruefung`, `faktencheck`, `korrekturen`, `kommentar`, `fortschritt`, `verlauf`, `fehler`, `fehler_phase`, `post_id`, `geplant_fuer`, `projekt`, `aktualisiert` |
| `laeufe/JJJJ-MM-TT` | Studio | `session_id` dieser Sitzung, `auftraege` |
| `stand/lernstand-acc1|acc2` | Lernschleife | Lernstand je Account (fließt in jedes Skript) |

**Status-Kette eines Slots:** `gewaehlt` (Studio) → `recherche` (Studio fordert an, du arbeitest) → `skript_fertig` (du) → `freigegeben` (Inhaber) → `uebergeben` (Studio) → `produktion` (du) → `geplant` (du, in Buffer eingeplant) → `gepostet` (du, nach der Nachprüfung). Nebenzweige: `rueckfrage` (du; der Inhaber entscheidet im Studio), `fehler` (du; mit `fehler` und `fehler_phase` = `recherche` oder `produktion`). Ein Tag ist fertig, wenn alle 4 Slots `geplant` oder `gepostet` sind; dann zeigt das Studio den nächsten Tag.

## 2. Aufträge (JSON in der Nachricht)
- `{"art":"skripte","datum":"…","konto":"simulierbar|stelldirvor","slots":["mittag","abend"]}` → §3
- `{"art":"neu_schreiben","datum":"…","konto":"…","slot":"…","kommentar":"…"}` → §4
- `{"art":"produzieren","datum":"…","ids":["acc1-…-mittag", …],"hinweis":"…"}` → §5
- `{"art":"fortsetzen","datum":"…"}` → §6 (nach einem Neustart oder Fehler)

## 3. Skripte recherchieren und schreiben
Für jeden genannten Slot (nacheinander, Mittag zuerst):
1. Slot-Dokument lesen. Weiter nur bei `status` = `recherche` (sonst überspringen und in der Abschlussnachricht nennen). `fortschritt` = „Recherche läuft“.
2. **Befehl holen** (gleiche Regeln wie Claude Chat, eine Textquelle): Idee aus dem Dokument (`idee`) und Lernstand (`stand/lernstand-<acc>` → `text`) in Dateien im Scratchpad schreiben, dann
   `python3 tools/chat_befehle.py --skript-auftrag <simulierbar|stelldirvor> --ideen <idee.json> --lernstand <lernstand.txt> [--kommentar "<Kommentar des Inhabers>"]`
   Die Ausgabe ist dein verbindlicher Auftrag (Rolle, Faktentreue, Spannung, Aufbau, Stimme bzw. Sätze, Caption, Recherche, JSON-Form). Dazu gelten aus dem Skill: Simulierbar `ablauf.md` §1–§5 und `ton.md` §3; Account 2 `ablauf.md` „Skript-Anforderungen“ und `themen-und-plan.md` (Weltvielfalt).
3. **Recherche:** jede Zahl, jedes Datum, jede Regel per `WebSearch` belegen (bei Nischen- oder ganz aktuellen Fakten `mode: extended`), die Primärquelle mit `WebFetch` öffnen, wenn die Suche nur einen Ausschnitt zeigt. Stand passend zum Video-Tag (Jahr, Rechtsstand, Preise). Rechne jedes Ergebnis mit Python nach.
4. **Trägt die Idee nicht** (Zahlen nicht belegbar, Themen-Logik falsch, Ausschlussthema): nichts erfinden. `status` = `fehler`, `fehler_phase` = `recherche`, `fehler` = Grund in einem Satz plus Vorschlag (z. B. andere Idee aus der Liste), Push (Problem).
5. **Skript schreiben** genau in der JSON-Form des Befehls (ein Objekt), Selbstprüfung ausfüllen: Simulierbar 150–190 Wörter Sprechtext (ohne Audio-Tags gezählt), höchstens 3 Ausrufezeichen, keine Tags `[excited]`/`[shouting]`/`[energetic]`, kein `<break>`, kein „Los geht's“, feste Sätze (Folgen-Aufruf, Schluss); Account 2: 12–18 Sätze mit 3–9 Wörtern, Anzeige passt zum Zeitraffer, Faktenzeile.
6. **Schreiben** (`update` mit `if_version`): `status` = `skript_fertig`, `skript` = das Objekt, dazu auf oberster Ebene `titel`, `thema`, `quellen`, `zahlen`, `rechenweg`, `annahmen`, `caption`, `dramaturgie`, `selbstpruefung`, `faktencheck` = `recherchiert`, `fortschritt` = „Skript fertig, bitte prüfen“, `aktualisiert`.
7. Nach allen Slots des Auftrags: **Push** „Skripte für <Wochentag, TT.MM.> stehen (<Account>): bitte im Ideen-Studio prüfen und freigeben.“

## 4. Neu schreiben
Wie §3, aber der `kommentar` des Inhabers hat Vorrang (an `--kommentar` übergeben). Was er nicht kritisiert, bleibt möglichst gleich. Am Ende `kommentar` nicht löschen, sondern `kommentar_erledigt` = Zeit setzen.

## 5. Produzieren und in Buffer planen
Reihenfolge nach Posting-Zeit (Mittag vor Abend; beide Accounts im Wechsel), höchstens 2 Produktions-Agenten gleichzeitig. Je Slot mit `status` = `uebergeben` (oder `produktion` nach Neustart):
1. `status` = `produktion`, `fortschritt` = „Produktion gestartet“, `projekt` = Ordnername unter `pipeline/projekte/`.
2. **Faktencheck vor dem Bau** (Inhaber 02.11.: „korrigieren und weiter“): jede Zahl gegen `quellen` und `rechenweg` prüfen, als Rechnung in `pipeline/sim/` mit Test. Ist eine Zahl falsch oder veraltet: mit Quelle korrigieren, die Aussage nur so weit wie nötig ändern, an `korrekturen` anhängen `{feld, alt, neu, quelle, grund, zeit}` und weiterproduzieren. **Kippt das Ergebnis** (anderer Gewinner bzw. andere Antwort auf die Titelfrage, oder die Pointe stimmt nicht mehr): `status` = `rueckfrage`, `fehler` = was sich ändert und dein Vorschlag, Push (Problem), diesen Slot anhalten; die anderen laufen weiter.
3. **Bau nach dem Skill des Accounts** ab „Skript liegt vor“ (SKILL.md), inhaltlich 1:1 inklusive der Korrekturen: `skript.json` (mit `skript_quelle` = Dokument-ID), Stimme (nur Simulierbar), Szene, Standbilder, Render auf dem PC (`pipeline/render_dienst/auftrag.py senden … --konto …`, `warten`; Exit 3 = PC offline → Rückfall Cloud-Render nach CLAUDE.md §4, Push, wenn die Posting-Zeit dadurch gefährdet ist), Ton, **komplette Prüfung** (`qc/massstab.py` bzw. `qc/referenz_pov.py`, Kontaktbogen, Skript-Bild-Abgleich, Lautheit), Abnahme durch dich. Meilensteine in `fortschritt`/`verlauf`: „Rechnung geprüft“, „Stimme fertig“, „Szene gebaut“, „Render auf dem PC“, „Prüfung bestanden“.
4. **Nie posten, was die Prüfung nicht besteht.** Nach zwei gescheiterten Nachbesserungen: `status` = `fehler`, `fehler_phase` = `produktion`, `fehler` = was fehlt, Push.
5. **Buffer:** `python3 pipeline/post_buffer.py --video <mp4> --kanal simulierbar|stelldirvor.pov --zeit auto:<datum>:<slot> --text "<Caption>"` (Caption aus dem Dokument, Format CLAUDE.md §7). Erwartung Status `scheduled`. Danach `status` = `geplant`, `post_id`, `geplant_fuer` (ISO mit Zone), `fortschritt` = „In Buffer geplant für <Wochentag> <Uhrzeit>“. Zeile an `data/produktion/protokoll.csv` anhängen (`datum,slot,konto,titel,projekt,post_id,status`), committen, pushen.
6. **Nachprüfung:** je geplantem Post `send_later` (Werkzeug `mcp__claude-code-remote__send_later`, per ToolSearch) auf Posting-Zeit + 20 Min. mit der Nachricht `{"art":"nachpruefen","datum":"…","id":"…"}`. Beim Eintreffen: `python3 pipeline/post_buffer.py --nachpruefen` (öffentlich, Länge, KI-Label wie gesetzt; löscht danach die Supabase-Datei). Bestanden → `status` = `gepostet`; sonst `fehler` mit Befund und Push.
7. Sind alle übergebenen Slots `geplant`: **Push** „<n> Videos für <Wochentag, TT.MM.> sind in Buffer geplant.“

## 6. Fortsetzen
Alle vier Slot-Dokumente des Tages lesen und nach Status handeln: `recherche` → §3, `uebergeben`/`produktion` → §5 (vorhandene Projektordner weiterverwenden, nichts doppelt posten: vorher `pipeline/out/buffer_log.jsonl` und `post_id` prüfen), sonst nichts. `fehler` bleibt, bis das Studio ihn neu anfordert.

## 7. Grenzen und Störungen
- Nutzungslimit erreicht: Die Sitzung stoppt von selbst; das Studio zeigt den Sitzungsstatus. Beim nächsten Auftrag mit §6 weitermachen.
- Wartet die Sitzung auf eine Freigabe (Rechte-Rückfrage), sieht der Inhaber das im Studio als „wartet auf dich“ mit Link zur Sitzung.
- Keine TikTok-Schutzmaßnahmen umgehen, keine fremden Videos laden (CLAUDE.md §2).
