---
name: video-produktion
description: "Produktions-Skill für die TikTok-Videos beider Accounts, @simulierbar (Account 1) und @stelldirvor.pov (Account 2), strikt getrennt. IMMER verwenden, sobald ein Video gebaut, produziert, vertont, gerendert, geprüft, abgenommen oder in Buffer geplant wird: Cockpit- oder Tages-Sitzungs-Auftrag „produzieren“, „baue das Video“, „produziere …“, „rendere …“, Szenenbau, Stimme, Abnahme, Posting, Nachprüfung. Setzt die freigegebenen REA-Regelwerke und Regeln aus dem Hirn um (das Hirn ist die einzige Regelquelle); erst die Account-Weiche, dann nur der Teil des Accounts (simulierbar.md bzw. stelldirvor.md). Nicht für die Analyse fremder Videos (dafür rea-video) und nicht für Ideen und Skripte (Befehle aus tools/chat_befehle.py)."
---

# Skill: Video-Produktion (beide Accounts, strikt getrennt)

Ersetzt die am 06.11.2026 entfernten Skills `simulierbar-video` und `stelldirvor-video` (Inhaber 07.11.: „ein nächster Skill … für die Produktion der Videos unter den Voraussetzungen, die du analysiert hast“). Der Skill steuert den **Ablauf**; die **Regeln** stehen im Hirn (`hirn/`, Master im Repo) und werden dort gelesen, nicht hierher kopiert. Was der Inhaber freigibt (REA-Regelwerke, Lernschleife), gilt damit sofort auch in der Produktion.

**Rangfolge bei Widerspruch:** jüngste Entscheidung des Inhabers (`hirn/01-Projekt/Entscheidungen Log.md`) > REA-Regelwerk des Accounts > Regelwerk des Accounts > Detail-Notizen (Ablauf, Design, Licht, Ton, Technik) > `hirn/02-Simulierbar/Maßstab Simulierbar.md` (Messgrundlage der ersten 4 Vorbilder). Ein Widerspruch wird gemeldet, nie still aufgelöst.

## 1. Weiche (immer zuerst)
| Auftrag bzw. Slot-ID | Account | Lies und befolge |
|---|---|---|
| `acc1-…`, `konto: simulierbar`, „Simulierbar“ | `@simulierbar` | [simulierbar.md](simulierbar.md) |
| `acc2-…`, `konto: stelldirvor`, „Stell dir vor“ | `@stelldirvor.pov` | [stelldirvor.md](stelldirvor.md) |

Lies danach **nur** den Teil dieses Accounts und dessen Pflichtlektüre. Nichts aus dem anderen Teil gilt (Stimme, Untertitel, Tafel, Countdown, Stile, Module, Prüfskript). Ist der Account unklar: Rückfrage, nicht raten. Die Prüfskripte wachen über die Trennung (`qc/massstab.py` 18b verbietet Account-2-Module, `qc/referenz_pov.py` 5/8 verbietet Stimme, Untertitel und Tafel).

## 2. Gemeinsame Grundregeln (beide Accounts)
1. **Skript liegt vor** (Cockpit-Datenbank bzw. Ideen-Studio, Dokument-ID `acc1|acc2-JJJJ-MM-TT-mittag|abend`, oder vom Inhaber eingefügt) und wird **inhaltlich 1:1** übernommen. Faktenfehler: mit Quelle korrigieren, nur so weit wie nötig, unter `korrekturen` vermerken (`{feld, alt, neu, quelle, grund, zeit}`) und weiter. **Kippt das Ergebnis** (andere Antwort auf die Titelfrage, Pointe stimmt nicht mehr): Status `rueckfrage`, dieser Slot hält an.
2. **Rechnung als Code mit Test** in `pipeline/sim/<thema>.mjs` aus `rechenweg`, `zahlen`, `annahmen`; sie liefert alle Zahlen im Bild. Abweichung zum Skript = Meldung, nie still ändern.
3. **Nur Three.js bzw. Blender** (Blender backen → glTF → Three.js erlaubt). Keine KI-Bild-, Video- oder Stimmen-Generatoren außer der freigegebenen Stimme von Account 1, keine Vorlagen, nur Assets und Schriften mit freier Lizenz (Lizenzdatei ablegen). Alles ist eine reine Funktion von `t`.
4. **Skript und Bild passen exakt:** Was gesagt bzw. geschrieben wird, ist im selben Moment so zu sehen (`bild_text_abgleich` in `skript.json`, Abnahme am Kontaktbogen).
5. **Kein Logo, kein Kanalname, keine Rubrik, keine Sticker/Stempel im Video**; kein KI-Label beim Posten; die Kommentarfrage steht nur in der Caption.
6. **Keine 1:1-Kopie** fremder Videos (Sätze, Bild- und Szenenideen); gleiches Thema nur mit eigenem Skript und anderem Design. **Das Repo ist öffentlich:** keine fremden Videos, Standbilder, Transkripte oder Links ins Repo, keine Schlüssel, keine E-Mail-Adressen.
7. **Qualität vor Tempo:** Wirkt etwas billig, flach, leer oder gehetzt, wird die Abnahme verweigert und nachgebessert. Gepostet wird nur, was jede Pflichtprüfung besteht.
8. **Modelle (feste Regel des Inhabers 08.11.2026, Tokens sparen):** Videos baut **Sonnet 5.5** von der Steuerung bis zur Abnahme; Produktions-Agenten ausdrücklich `model: sonnet`, höchstens 2 gleichzeitig, Auftrag als nummerierte Checkliste mit Beleg je Punkt. **Opus 5.5 nur für einen Neubau von Grund auf** (Erstbau eines Stils, Welttyps, Objekttyps oder Design-Elements): genau ein Agent mit `model: opus` nur für diesen Baustein, vorher Meilenstein „Neubau mit Opus: …“. Abwandlungen von Vorhandenem sind kein Neubau.
9. **Reihenfolge (Inhaber 06.11.):** zuerst beide 12:30-Videos bis Buffer, dann die 19:30-Videos; ein Abend-Video wird nicht angefangen, solange ein Mittag-Video nicht geplant ist (außer es wartet nur auf den Render).
10. **Regeln ändert dieser Ablauf nie.** Ideen für Verbesserungen gehen als Vorschlag an den Inhaber (Lernschleife bzw. Abschlussnachricht).

**Umgebung:** Im Cockpit (Windows, `cockpit/anleitung/produktion.md`) Python als `py -3`, Bash-Skripte über Git Bash, Schlüssel nur über `node cockpit/werkzeuge/mit_schluessel.mjs …`, Agenten und lange Befehle nie im Hintergrund. In der Cloud `python3` und `pipeline/render_dienst/auftrag.py`. Alle Befehle unten laufen im Ordner `pipeline/`.

## 3. Ablauf je Video
| # | Schritt | Was genau | Meilenstein |
|---|---|---|---|
| 0 | **Start** | `git pull --rebase origin main`; Weiche (§1); Pflichtlektüre des Accounts lesen; Projektordner `pipeline/projekte/<name>/` (kurz, ASCII) | „Produktion gestartet“ |
| 1 | **Eingangsprüfung** | Skript gegen die Regeln des Accounts (Teil-Datei, Abschnitt „Eingangsprüfung“); Auffälligkeiten melden, bevor gebaut wird. **Testblock** (seit 08.11.): `python3 tools/testblock.py --konto simulierbar|stelldirvor --datum <Video-Tag> --slot <mittag|abend>` → Ergebnis als `testbloecke` in `skript.json` (steht es schon im Skript, muss es gleich sein); die Variante bestimmt Folgen-Hinweis bzw. Einstieg (Teil-Datei). **Folgeteil** (`idee.typ` = `folgeteil`): „Teil N“ groß im ersten Bild und vorn in der Caption, eigene Rechnung bzw. eigenes Szenario | – |
| 2 | **Rechnung** | `sim/<thema>.mjs` mit Test `sim/<thema>.test.mjs` (`node --test sim/<thema>.test.mjs`); Faktencheck nach §2.1 | „Rechnung geprüft“ |
| 3 | **Dramaturgie** | Beat-Blatt bzw. Bewegungsplan aus dem Skript ableiten (Teil-Datei) | – |
| 4 | **`skript.json`** | mit `"skill": "video-produktion"`, `"konto"`, `skript_quelle` = Dokument-ID, Feldern nach Teil-Datei | – |
| 5 | **Ton zuerst (nur A1)** | Stimme vertonen, sofort `qc/massstab.py` für Wörter, Tempo, Satzlänge; zu lang oder zu langsam = Text kürzen bzw. straffen, nie beschleunigen | „Stimme fertig“ |
| 6 | **Szene** | `szene.html` + `szene.js` aus dem Gerüst der Technik-Notiz; fehlende Objekte ins Stil- bzw. Welt-Modul (wiederverwendbar) | „Szene gebaut“ |
| 7 | **Standbilder** | 6–8 Schlüsselstellen rendern und gegen Design, Qualitätslatte und Skript-Bild-Abgleich prüfen, nachbessern | – |
| 8 | **Render** | committen, `git pull --rebase`, pushen (der PC holt `origin/main`), dann Render-Dienst auf dem PC: `python3 render_dienst/auftrag.py senden <name> --konto simulierbar|stelldirvor.pov` und `… warten` (im Cockpit über `mit_schluessel.mjs render …`). Exit 3 = PC offline: Cloud-Rückfall nur, wenn die Posting-Zeit sonst fällt | „Render auf dem PC“ |
| 9 | **Prüfung** | Prüfskript des Accounts + Text-Überlappung + Kontaktbogen + Sichtprüfung (Teil-Datei, Abschnitt „Prüfung“); jeder Hinweis wird im Bericht erklärt oder behoben; nach zwei gescheiterten Nachbesserungen `fehler` | „Prüfung bestanden“ |
| 10 | **`lern_notizen`** | nach der Abnahme aus `audio/timing.json` bzw. `ereignisse.json` ausfüllen (Teil-Datei); die Lernschleife verknüpft sie mit den Zahlen | – |
| 11 | **Buffer** | `post_buffer.py --video … --kanal simulierbar|stelldirvor.pov --zeit auto:<datum>:<slot> --text "<Caption>"` (Caption-Format CLAUDE.md §7, Suchbegriff vorn), Status `scheduled`. **Cover** (seit 08.11.) setzt das Skript selbst: Bild bei 1,0 s (A1) bzw. 1,5 s (A2), gespeichert als `<video>_cover.jpg`; ansehen, Titel bzw. Titelfrage müssen lesbar sein, sonst `--cover-ms`. Protokollzeile `data/produktion/protokoll.csv`; committen, pushen | „In Buffer geplant …“ |
| 12 | **Nachprüfung** | ca. 20 Min. nach der Posting-Zeit `post_buffer.py --nachpruefen` (öffentlich, Länge, KI-Label wie gesetzt) | „gepostet“ |

## 4. Erstlauf (Entscheidung des Inhabers 07.11.2026: „am nächsten echten Video testen“)
Bis dieser Abschnitt für einen Account „erprobt“ zeigt, gilt beim ersten Video dieses Accounts nach diesem Skill:
1. Abnahme durch die steuernde Sitzung selbst (Sonnet 5.5, Punkt 8), kein Agent. Das MP4 ist 1080×1920 (CRP), sonst nicht abnehmen. Jeden Pflicht- und Hinweispunkt des Prüfskripts **und** jeden Punkt der Sichtprüfung mit Beleg im Bericht (Slot-Feld `fortschritt` bzw. Abschlussnachricht).
2. Kontaktbogen und mindestens 8 Standbilder wirklich ansehen, die REA-Regeln des Accounts Punkt für Punkt gegen das Video halten.
3. Bei jedem Zweifel `rueckfrage` statt posten. Was am Skill fehlt oder hakt, steht als Vorschlag in der Abschlussnachricht.
| Account | Stand |
|---|---|
| Simulierbar | noch nicht erprobt (Skill vom 07.11.2026) |
| stelldirvor | noch nicht erprobt (Skill vom 07.11.2026) |

## 5. Woher die Regeln kommen
- **REA-Regelwerke** (`hirn/04-Recherche/REA … Regelwerk.md`, freigegeben 07.11.2026): belastbare Regeln sind Pflicht, vorläufige Richtwert. Neue Vorbild-Videos laufen über den Skill `rea-video`; geänderte Regeln gelten erst nach Freigabe des Inhabers.
- **Lernschleife** (täglich 19:52 Berlin, `hirn/01-Projekt/Lernschleife und Insights.md`): laufende Tests (Folgen-Aufruf, hell gegen dunkel, später Endstand, frühes Ereignis) brauchen saubere `lern_notizen`.
- **Prüfskripte:** `pipeline/qc/massstab.py` (A1) und `pipeline/qc/referenz_pov.py` (A2) sind seit 07.11.2026 auf die REA-Regeln eingestellt; Tests `qc/massstab_test.py`, `qc/referenz_pov_test.py`.
