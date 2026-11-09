# Tages-Sitzung: Anleitung für Claude Code (vom Ideen-Studio gestartet)

Stand 02.11.2026 (Entscheidungen des Inhabers: Claude Code recherchiert und schreibt die Skripte; Faktenfehler korrigieren und weiter, anhalten nur, wenn das Ergebnis kippt; Push bei Problemen, wenn Skripte fertig sind und wenn alles geplant ist).

Das Ideen-Studio (Artifact https://claude.ai/artifact/PMqMpqpmSHYmuhY229ghZC) legt Aufträge in eine Warteschlange und sendet einen Kommentar an Claude; der **Disponent** (eigene Sitzung) startet daraufhin **je Video-Tag genau eine Claude-Code-Sitzung** (Modell Opus 5.5, Modus „Auto“) und schickt ihr die Aufträge. Die erste Nachricht enthält den ersten Auftrag, weitere Aufträge kommen als neue Nachrichten in dieselbe Sitzung. Du bist diese Sitzung. **Niemand liest im Chat mit:** Rückfragen gehen nur über Status `rueckfrage` und eine Push-Nachricht, nie als Frage im Chat.

## 0. Grundregeln (immer)
1. **Kleine Schritte** (CLAUDE.md §1): Zerlege jeden Auftrag zuerst in nummerierte Teilaufgaben (TaskCreate), hake jede mit Beleg ab, gleiche am Ende Auftrag und Ergebnis ab.
2. **Zuerst:** `git pull --rebase origin main`. CLAUDE.md ist geladen; es gilt die Kette der Skills `themen-skript` → `stimme-elevenlabs` → `video-produktion` (seit 09.11.2026): für Skripte `themen-skript`, für die Stimme von Simulierbar `stimme-elevenlabs`, für jedes Video der Skill `video-produktion` (seit 07.11.2026; Weiche, dann nur Teil `simulierbar.md` bzw. `stelldirvor.md`), strikt getrennt. Die Regeln stehen im Hirn (zuerst das REA-Regelwerk des Accounts).
3. **Datenbank des Studios:** Werkzeug `ArtifactData` (per ToolSearch `select:ArtifactData` laden), `url` = Studio oben. Vor jedem Schreiben `get` (Version merken), dann `update` mit `if_version`; bei Versionskonflikt neu lesen und nur deine Felder erneut schreiben. Felder, die das Studio setzt (`status: freigegeben`, `kommentar`, `idee`), nie überschreiben.
4. **Fortschritt sichtbar machen:** Bei jedem Meilenstein im Slot-Dokument `fortschritt` (ein kurzer Satz) setzen und an `verlauf` einen Eintrag `{zeit, text}` anhängen (höchstens 30 Einträge, älteste zuerst löschen). Nicht öfter als einmal je Schritt.
5. **Push-Nachricht** (Werkzeug `PushNotification`, per ToolSearch laden): (a) Skripte fertig, (b) alle übergebenen Videos geplant, (c) Probleme (Rückfrage, Fehler, PC offline mit Verzug). Kurz, deutsch, mit Tag und Titel. Fehlt das Werkzeug: im Slot-Dokument vermerken.
6. **Nichts außerhalb** von Repo, Studio-Datenbank, Buffer und Supabase anlegen. Keine Regel, keinen Skill und keinen Befehl ändern (nur vorschlagen). Keine Geheimnisse und keine Supabase-Adresse ins Repo.
7. **Modelle:** Recherche und Skripte machst du selbst (Opus). **Produktion und Abnahme mit Sonnet 5.5** (feste Regel des Inhabers 08.11.2026; im Cockpit startet die Produktion deshalb mit Sonnet, Opus nur als Agent für einen Neubau von Grund auf, `cockpit/anleitung/produktion.md` §0.6). Produktions-Agenten ausdrücklich mit `model: sonnet`, **höchstens 2 gleichzeitig**, gestaffelt, ihr Auftrag als nummerierte Checkliste; sie melden je Punkt „erledigt/offen“ mit Beleg, du prüfst das gegen die Liste.
8. Am Ende jedes Auftrags: kurze Abschlussnachricht (je Slot: Titel, Status) und für jedes fertige Video committen und pushen (`git pull --rebase` vorher).
9. **Sitzungsstatus fürs Studio:** Zu Beginn jedes Auftrags in `laeufe/<datum>` `status: "arbeitet"`, `letzte_meldung` (ein Satz, was du tust) und `aktualisiert` setzen; am Ende `status: "wartet"` und `letzte_meldung` = Kurzergebnis. Fehlt das Dokument, lege es mit `datum` und deiner `session_id` an (die eigene ID liefert `mcp__claude-code-remote__get_session` ohne Argument).
10. Aufträge kommen meist über den **Disponenten** (eigene Sitzung, `docs/automatik/disponent.md`), der die Warteschlange `auftraege` des Studios abarbeitet. Du selbst schreibst nicht in `auftraege`.

## 1. Datenmodell (Sammlungen der Studio-Datenbank)
| Dokument | Schreibt | Inhalt |
|---|---|---|
| `ideen/<acc1|acc2>-JJJJ-MM-TT` | Studio | `konto`, `datum`, `ideen` (10), `wunsch`, `erzeugt` |
| `skripte/<acc1|acc2>-JJJJ-MM-TT-<mittag|abend>` | beide | **ein Dokument je Video** (Slot): `konto`, `datum`, `slot`, `uhrzeit`, `idee`, `titel`, `status`, `skript`, `quellen`, `zahlen`, `rechenweg`, `annahmen`, `caption`, `dramaturgie`, `selbstpruefung`, `faktencheck`, `korrekturen`, `kommentar`, `fortschritt`, `verlauf`, `fehler`, `fehler_phase`, `post_id`, `geplant_fuer`, `projekt`, `aktualisiert` |
| `laeufe/JJJJ-MM-TT` | Disponent, du | `session_id` dieser Sitzung, `auftraege`, `status` (arbeitet/wartet), `letzte_meldung`, `aktualisiert` |
| `auftraege/<id>` | Studio, Disponent | Warteschlange: `datum`, `auftrag`, `text`, `status` (offen/in_arbeit/gesendet/fehler) |
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
   Die Ausgabe ist dein verbindlicher Auftrag (Rolle, Faktentreue, Spannung, Aufbau, Textformat für die Stimme bzw. Sätze, Caption, Recherche, JSON-Form); er folgt dem Skill `themen-skript`. Dazu gelten aus dem Hirn: Simulierbar `REA Simulierbar Regelwerk`, `Skriptaufbau Simulierbar`, `Finanzregeln Simulierbar` und `Stimme ElevenLabs Simulierbar` (Textformat); Account 2 `REA stelldirvor Regelwerk`, `Ablauf Account 2` „Skript-Anforderungen“ und `Themen und Plan Account 2` §2–§3 (Weltvielfalt).
3. **Recherche:** jede Zahl, jedes Datum, jede Regel per `WebSearch` belegen (bei Nischen- oder ganz aktuellen Fakten `mode: extended`), die Primärquelle mit `WebFetch` öffnen, wenn die Suche nur einen Ausschnitt zeigt. Stand passend zum Video-Tag (Jahr, Rechtsstand, Preise). Rechne jedes Ergebnis mit Python nach.
4. **Trägt die Idee nicht** (Zahlen nicht belegbar, Themen-Logik falsch, Ausschlussthema): nichts erfinden. `status` = `fehler`, `fehler_phase` = `recherche`, `fehler` = Grund in einem Satz plus Vorschlag (z. B. andere Idee aus der Liste), Push (Problem).
5. **Skript schreiben** genau in der JSON-Form des Befehls (ein Objekt), Selbstprüfung ausfüllen: Simulierbar ca. 150–190 Wörter Sprechtext als Richtwert (keine Sperre; seit 09.11.2026 keine Vorgaben für Sprechtempo, Silben, Satzpausen oder Stimmdauer, das Video folgt der Stimme), Sprechtext im Textformat des Skills `stimme-elevenlabs` (keine Auslassungspunkte, keine Gedankenstriche als Pause, kein Wort in Großbuchstaben, keine Gefühls-Tags, kein `<break>`, alles ausgeschrieben, höchstens 3 Ausrufezeichen), kein „Los geht's“, Phasen-IDs bis `schlusskarte`, Zähler ab 3 s und Regeln als Chips, erste Wendung bei 12–15 s, zweite offene Frage mitten im Video (Auflösung in der Pointe), Endstand bei ca. 75–80 %, Du nur im Hook, **kein fester Schlusssatz und kein Folgen-Aufruf** (seit 07.11.2026); Account 2: 12–18 Sätze mit 3–9 Wörtern, Countdown und Ereignis bei ca. 8 s, Anzeige passt zum Zeitraffer, Faktenzeile.
6. **Schreiben** (`update` mit `if_version`): `status` = `skript_fertig`, `skript` = das Objekt, dazu auf oberster Ebene `titel`, `thema`, `quellen`, `zahlen`, `rechenweg`, `annahmen`, `caption`, `dramaturgie`, `selbstpruefung`, `faktencheck` = `recherchiert`, `fortschritt` = „Skript fertig, bitte prüfen“, `aktualisiert`.
7. Nach allen Slots des Auftrags: **Push** „Skripte für <Wochentag, TT.MM.> stehen (<Account>): bitte im Ideen-Studio prüfen und freigeben.“

## 4. Neu schreiben
Wie §3, aber der `kommentar` des Inhabers hat Vorrang (an `--kommentar` übergeben). Was er nicht kritisiert, bleibt möglichst gleich. Am Ende `kommentar` nicht löschen, sondern `kommentar_erledigt` = Zeit setzen.

## 5. Produzieren und in Buffer planen
Reihenfolge nach Posting-Zeit (Mittag vor Abend; beide Accounts im Wechsel), höchstens 2 Produktions-Agenten gleichzeitig. Je Slot mit `status` = `uebergeben` (oder `produktion` nach Neustart):
1. `status` = `produktion`, `fortschritt` = „Produktion gestartet“, `projekt` = Ordnername unter `pipeline/projekte/`.
2. **Faktencheck vor dem Bau** (Inhaber 02.11.: „korrigieren und weiter“): jede Zahl gegen `quellen` und `rechenweg` prüfen, als Rechnung in `pipeline/sim/` mit Test. Ist eine Zahl falsch oder veraltet: mit Quelle korrigieren, die Aussage nur so weit wie nötig ändern, an `korrekturen` anhängen `{feld, alt, neu, quelle, grund, zeit}` und weiterproduzieren. **Kippt das Ergebnis** (anderer Gewinner bzw. andere Antwort auf die Titelfrage, oder die Pointe stimmt nicht mehr): `status` = `rueckfrage`, `fehler` = was sich ändert und dein Vorschlag, Push (Problem), diesen Slot anhalten; die anderen laufen weiter.
3. **Bau nach dem Skill `video-produktion`** (Teil des Accounts) ab „Skript liegt vor“, inhaltlich 1:1 inklusive der Korrekturen: `skript.json` (mit `skript_quelle` = Dokument-ID), Stimme (nur Simulierbar, Skill `stimme-elevenlabs`: Textprüfung `qc/stimme_vorab.py` bis „BEREIT“, dann genau eine Aufnahme; das Video richtet sich nach `audio/timing.json`), Szene, Standbilder, Render auf dem PC (`pipeline/render_dienst/auftrag.py senden … --konto …`, `warten`; Exit 3 = PC offline → Rückfall Cloud-Render nach CLAUDE.md §4, Push, wenn die Posting-Zeit dadurch gefährdet ist), Ton, **komplette Prüfung** (`qc/massstab.py` bzw. `qc/referenz_pov.py`, Kontaktbogen, Skript-Bild-Abgleich, Lautheit), Abnahme durch dich. Meilensteine in `fortschritt`/`verlauf`: „Rechnung geprüft“, „Stimme fertig“, „Szene gebaut“, „Render auf dem PC“, „Prüfung bestanden“.
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
