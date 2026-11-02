---
name: simulierbar-video
description: Nur für TikTok-Account 1 @simulierbar (Simulierbar, „Alltag durchgerechnet“, nur Thema GELD): deutsche gesichtslose Simulationsvideos 65–80 s mit Stimme Ben, Duell bzw. Rennen mit Anzeigetafel, Zählern und Uhr, Untertitel Wort für Wort, hochwertiger Look mit Licht, Atmosphäre und steigender Spannung (alle Stile 1–15 und 17–21 mit Qualitätslatte, mehr Effekte, keine großen Sticker). Ablauf beginnt mit „Skript liegt vor“ (aus dem Ideen-Studio, Claude Chat schreibt das Skript). Verbindlicher Ablauf, Stile, Licht, Design, Ton, Technik und Prüfung für jedes Simulierbar-Video. Greift bei Skript-Übernahme, Szenenbau, Render, Ton, Abnahme und Posting für @simulierbar. Nicht für @stelldirvor.pov (Account 2, dafür gilt der Skill stelldirvor-video) und nicht für andere Accounts.
---

# Skill: Video für @simulierbar (hochwertiger Look, Licht, Atmosphäre, steigende Spannung)

**Gilt nur für Account 1 `@simulierbar`.** Für Account 2 `@stelldirvor.pov` gilt ausschließlich `.claude/skills/stelldirvor-video/`; nichts aus diesem Skill (Stimme, Untertitel, Tafel, Folgen-Aufruf, Schlusssatz, Schleife, Stile) gilt dort, und umgekehrt.

Grundlage: `CLAUDE.md` (Videoaufbau §6, Maßstab §5, Plattformregeln §7, Stimme §8, Entscheidungen §12), **[massstab.md](massstab.md) (verbindlich, Prüfliste)**, [themen.md](themen.md) (Auswahl-, Finanz- und Ausschlussregeln; die Sperrliste dort ist Archiv), `pipeline/README.md`. Dieser Skill fasst zusammen und ergänzt; **bei Widerspruch gilt die jüngste Entscheidung des Inhabers** (Stand 02.11.2026 abends, unten „Neuregeln“; `CLAUDE.md` wird nachgezogen).

## Pflichtlektüre vor jeder Arbeit an einem Video
| Datei | Inhalt |
|---|---|
| [massstab.md](massstab.md) | der Maßstab im Volltext: 12 Gesetze, Messwerte der 4 Vorbilder, Zeitachsen, Bausteine, Prüfliste (23 Punkte) |
| [ablauf.md](ablauf.md) | Videoaufbau als Zeitplan (0–80 s), Tempo (150–190 Wörter), **Skript-Anforderungen**, **Übernahme des Skripts**, **Dramaturgie und Effekte**, Themen-Logik, Skript-Bild-Abgleich, Beispiel-Skript |
| [stile.md](stile.md) | alle erlaubten Stile (1–15 und 17–21), **Qualitätslatte**, Baukästen, Renderzeiten, Stilwahl |
| [licht-und-atmosphaere.md](licht-und-atmosphaere.md) | Licht-Rigs, Bloom, Lichtstrahlen, Volumenlicht, Nebel, Tiefenschärfe, Spiegelungen, Grading, Kamera-Regie, **Lichtspiele, Zoom und Fahrten im Takt der Dramaturgie** |
| [design.md](design.md) | HUD: Tafel, Zähler, Uhr, Chips, Karten, Typografie, Farben, Untertitel „kontur“, sichere Zonen, Aufleuchten im HUD |
| [ton.md](ton.md) | Stimme Ben, `eleven_v4`, Tempo und Satzpausen, Regie-Text, Tonfall, Klangteppich, Effekte, Lautheit |
| [technik.md](technik.md) | Dateien, `skript.json` (inkl. `lern_notizen`), Szenengerüst mit `SimBuehne`, Render, Mux, Posting über `post_buffer.py` |
| [pruefung.md](pruefung.md) | Abnahme: `massstab.py`, Text-Überlappung, Kontaktbogen, Skript-Bild-Abgleich, **Qualitätslatte, Spannungskurve, Variation** |
| [themen.md](themen.md) | Markt (Hintergrund), Auswahl-, Finanz- und Ausschlussregeln, Zahlen Deutschland 2026, Termine; **Sperrliste = veraltet, nur Archiv** |

Muster mit allen Bausteinen: `pipeline/projekte/_demo-simulierbar/` (eine Welt je Stil 17–21, gleiches HUD; Demo, nicht posten). Demos der Stile 1–15: `pipeline/stile/`.

## Neuregeln des Inhabers (02.11.2026 abends, ersetzen alte Regeln wörtlich)
1. **Nur noch Thema GELD.** Jedes Video ist GELD (Euro-Ergebnis); die Rubrik ALLTAG entfällt komplett (statt „mind. 50 von 60“ jetzt 100 %). Auswahl-, Finanz- und Ausschlussregeln bleiben ([themen.md](themen.md) §2, §5).
2. **Kein 30-Tage-Plan mehr.** `data/plan/30-tage.csv`, `simulierbar-plan.json` und Plan-PDF sind nur noch Archiv (nicht löschen). Themen entstehen täglich neu: Der Inhaber bekommt 10 Videoideen (Ideen-Studio/Claude Chat), wählt 2 für den nächsten Tag; das Skript entsteht dort. Der Ablauf beginnt mit **„Skript liegt vor“** (unten).
3. **Sperrliste entfällt (erstmal).** Gesperrte Themen von Konkurrenzkanälen gelten nicht mehr; der Konkurrenz-Check ist keine Pflichtsperre mehr. **Bleibt: keine 1:1-Kopie** von Skript, Sätzen, Bild- oder Szenenideen eines fremden Videos (CRP-Ausschluss „Unoriginal“); gleiches Thema nur mit eigenem Skript und anderem Design.
4. **Länder frei:** Deutschland, weltweit oder andere Länder; Sprache bleibt Deutsch; Euro nur wenn passend, sonst Währung und Quelle sauber nennen (Modellrechnung).
5. **Stile: alle erlaubt, mit Qualitätslatte** (1–15 und 17–21; Stil 16 Lunar-POV bleibt Account 2). Genau ein Stil je Video, nie zweimal derselbe hintereinander, Wahl mit Begründung in `skript.json → stil_begruendung`. **Qualitätslatte** ([stile.md](stile.md), [pruefung.md](pruefung.md)): Jeder Stil muss die Abnahme am Kontaktbogen bestehen, keine Billig-Optik.
6. **Mehr Effekte, aber nichts Übertriebenes; die Spannung steigt** bis zum Ergebnis. Skript zuerst, Design und Animation werden aus dem Skript abgeleitet. Erlaubt und erwünscht: mehrere Animationssequenzen, Situations-/Bildwechsel, Aufleuchten, Lichtspiele, Glow, Zoom (mal ja, mal nein), Fahrten. **Große Sticker/Stempel bleiben verboten** (bestätigt 02.11.). Regelabschnitt: [ablauf.md](ablauf.md) §6 „Dramaturgie und Effekte“.
7. **Sprechtempo:** 150–190 Wörter bei 65–80 s (Ziel ca. 2,3 W/s, Spanne 2,2–2,5 W/s), flüssig und natürlich, **kein künstliches Beschleunigen**; Tempo entsteht durch Textlänge und Satzbau; Satzpausen so, dass Ben nicht gehetzt klingt (Richtwert 0,35–0,6 s). Klingt eine Stelle gehetzt, kürzen statt beschleunigen ([ton.md](ton.md) §1).
8. **Skript-Qualität** (Claude Chat schreibt, Claude Code setzt um): belegbar, nichts erfunden, Diskussionsbedarf ohne ihn auszusprechen, kein Clickbait, Regie-Text für Ben ([ablauf.md](ablauf.md) §5 „Skript-Anforderungen“).
9. **Lernschleife:** täglich 20:00 Berlin Auswertung der Buffer-Zahlen, Vorschläge nur nach Freigabe (Abschnitt „Lernstand“ unten).
10. **Referenzvideos:** Der Inhaber kann weitere Vorbilder schicken; Auswertung wie beim Maßstab, nur abstrahierte Muster, keine Originale im Repo ([massstab.md](massstab.md) §12). Die wörtlichen Auszüge der 4 Vorbilder in `massstab.md` bleiben (Entscheidung des Inhabers).

## Weiterhin gültige Regeln des Inhabers (erzwungen, keine Ausnahme)
1. **Hochwertig statt billig** (02.11.): „richtig hochwertige Animationsvideos“, Licht und Atmosphäre. Die Stilfreigabe (Neuregel 5) ersetzt die frühere Beschränkung auf 17–21; die Qualitätslatte ist die Gegenleistung.
2. **Keine großen Sticker oder Stempel**, Prüfpunkt 5d = 0. Zahlen, Zähler, Uhr und Chips bleiben, sind aber nicht die Kunst.
3. **Die Kunst ist die animierte Welt**: Umgebung, Detailreichtum, Licht, Figuren und Objekte, die reagieren, eine Kamera, die dem Geschehen folgt. Dynamik aus Welt und Kamera, nicht aus Einblendungen.
4. **Skript und Bild passen exakt**: Jedes gesprochene Detail (Objekt, Handlung, Zahl, Ort) ist im selben Moment genau so im Bild. Abgleich Segment für Segment (`skript.json → bild_text_abgleich`) und am Kontaktbogen.
5. **Themen-Logik**: Ein Duell vergleicht nur echte Alternativen derselben Entscheidung (prüft Claude Code beim Eingang des Skripts; Auffälligkeiten melden).
6. **Ruhiger Ton**: ruhig, sachlich, freundlich; kein Geschrei, keine aufgeregten Audio-Tags, kein „Los geht's“, höchstens 3 Ausrufezeichen.
7. **Videoaufbau, Folgen-Aufruf bei ca. 20 s, Schlusssatz genau, Schleife** wie `CLAUDE.md` und [ablauf.md](ablauf.md).
8. **Untertitel Wort für Wort, Stil „kontur“**: weiß, fett, schwarze Kontur, aktuelles Wort gelb, mittig, kein Kasten (01.11.).
9. **Teamfarben**: zwei feste Farben je Video, überall gleich (Objekte, Licht, Tafel, Chips, Untertitel-Schlüsselwort), **nie Gelb**; Claude Code legt sie in `skript.json → teamfarben` fest.
10. **Kein Kanalname, kein Logo, keine Rubrik im Video. Mittig auf x = 540**, gleiches Format für TikTok und YouTube Shorts (1080 × 1920).
11. **Nur Three.js bzw. Blender** (Blender backen → glTF → Three.js erlaubt), keine KI-Bild- oder Video-Generatoren, nur Assets und Schriften mit freier Lizenz (Lizenzdatei ablegen). Keine echten Banknoten- oder Münzmotive, keine Marken.
12. **Rhythmus**: täglich genau 2 Simulierbar-Videos für den nächsten Tag (4 insgesamt mit Account 2), höchstens 2 Produktions-Agenten gleichzeitig, gestaffelt, mit `model: sonnet`; neue Objekttypen bzw. Szenentypen (und Erstbau eines Stils) mit Opus. Posting vollautomatisch über Buffer nach eigener Prüfung, ohne KI-Label.

## Ablauf je Video (Zeit: Schätzung)
0. **Skript liegt vor.** Quelle: ArtifactData-Sammlung `skripte` des Ideen-Studios, Dokument-ID `acc1-JJJJ-MM-TT-mittag|abend` (Felder `konto`, `datum`, `slot`, `titel`, `thema`, `skript`, `rechenweg`, `zahlen`, `annahmen`, `quellen`, `caption`, `status`), oder der Inhaber fügt das Skript ein. Claude Code übernimmt es **inhaltlich 1:1** nach `skript.json` (Regie-Text, Segmente), **ändert Aussagen nur nach Rücksprache**, prüft die Zahlen per Rechnung als Code mit Test und **meldet Abweichungen** ([ablauf.md](ablauf.md) §5.2). Gleichzeitig: Themen-Logik, GELD (Ergebnis in Euro bzw. passender Währung), Ausschlussthemen, Finanzregeln, keine 1:1-Kopie, Wörter 150–190. (20–30 Min.)
1. **Rechnung** als Code mit Tests in `pipeline/sim/<thema>.mjs` (Netto-Modul `pipeline/sim/netto.mjs` für deutsche Gehaltsrechnungen), aus `rechenweg`, `zahlen`, `annahmen` des Skripts; Quellen nur intern. Liefert Zählerverläufe, Führungswechsel, Ergebnis, „Warum?“-Faktoren, zweite Überraschung. Abweichung zum Skript = Meldung, nicht stillschweigend ändern. (30–60 Min.)
2. **Stil und Teamfarben festlegen**, aus dem Skript abgeleitet: Welche Welt trägt das Thema, wie heben wir uns in der Qualität ab ([stile.md](stile.md) Wahlregeln); Begründung in `stil_begruendung`. Dann das **Beat-Blatt** (Dramaturgie): welcher Effekt, welche Kamera, welches Licht in welchem Segment ([ablauf.md](ablauf.md) §6). (20 Min.)
3. **`skript.json`** `projekte/<name>/skript.json` mit `"skill": "simulierbar-video"`, `"stil": "<Nr> <Name>"`, `stil_begruendung`, `teamfarben`, Segmenten (`text` + `sprechtext`), `bild_text_abgleich`, Caption, `lern_notizen` ([technik.md](technik.md)). (30 Min.)
4. **Stimme**: `python3 tts.py projekte/<name>` → `audio/stimme.mp3` + `audio/timing.json`. Sofort `qc/massstab.py` für Wörter/Tempo/Satzpausen (12a–12d2): zu langsam oder zu viele Wörter = Text kürzen, nicht Stimme beschleunigen. (5–10 Min.)
5. **Szene** `szene.html` + `szene.js` aus dem Gerüst in `technik.md`: Welt im Stil-Baukasten, Licht und Atmosphäre (`licht-und-atmosphaere.md`), Kamera-Regie, HUD (`design.md`), Effekte nach dem Beat-Blatt. Fehlende Objekte im Stil-Modul ergänzen (wiederverwendbar). (2–4 Std.)
6. **Standbilder** an 6–8 Schlüsselstellen (Hook, Regeln, Wendung, Ergebnis, Warum, Schluss) rendern, gegen `design.md`, **Qualitätslatte** (`stile.md`) und den Skript-Bild-Abgleich prüfen, nachbessern. (20–40 Min.)
7. **Render** über den Render-Dienst auf dem Windows-PC: committen und pushen, `python3 pipeline/render_dienst/auftrag.py senden <name> --konto simulierbar`, dann `auftrag.py warten` im Hintergrund (holt das MP4). Bei Exit 3 (PC offline) Rückfall Cloud: `node render.js projekte/<name> --worker 2` und `./mux.sh projekte/<name>` (`technik.md`). (PC: Minuten; Cloud ca. 1–3 Std. Rechenzeit)
8. **Prüfung** nach `pruefung.md` (Skripte + Kontaktbogen + Sichtprüfung inkl. Qualitätslatte, Spannungskurve, Variation). Wirkt etwas billig, wird die Abnahme verweigert und nachgebessert. (20 Min.)
9. **Posting** über `python3 post_buffer.py --kanal simulierbar --zeit auto:<datum>:<slot>` mit Caption (aus dem Skript-Dokument, gegen das Format in `CLAUDE.md` §7 geprüft), ohne KI-Label; nach dem Posten `--nachpruefen`. (5 Min.)

## Lernstand (Lernschleife, nur Verweis)
Täglich 20:00 Berlin wertet ein Lauf die Buffer-Zahlen aus (Aufrufe, Likes, Kommentare, Shares, Saves, Ø-Wiedergabezeit, Follower) und legt Verbesserungsvorschläge dem Inhaber anklickbar zur Freigabe vor. **Erst nach Freigabe ändert sich eine Regel.** Konzept und Stand: [[Lernschleife und Insights]] (Hirn).
- **Pflicht für Claude Code:** `skript.json` hält in `lern_notizen` fest, was die Auswertung später mit den Zahlen verknüpfen soll: Hook-Formulierung, Stil, Animationen (Art und Zeitpunkt), Licht und Effekte, Zeitpunkte (Folgen-Aufruf, Wendungen, Ergebnis, Pointe), Wörter und Tempo, Zoom ja/nein. Feldaufbau in [technik.md](technik.md).
- Der aktuelle Lernstand steht im Befehl an Claude Chat und in der Datenbank des Ideen-Studios (`stand/lernstand-acc1`); er fließt über die Skripte in unsere Videos ein, ohne dass sich dadurch eine Regel dieses Skills ändert.
- Freigegebene Regeländerungen aus der Lernschleife: bisher keine (Stand 02.11.2026). Sie werden hier und in den betroffenen Dateien nachgetragen, mit Datum der Freigabe.

## Qualitätsstand des Baukastens (02.11.)
Grund-Baukästen und Demo-Szenen für die Stile 17–21 stehen (`stile.md`, Standbilder im Demo-Projekt reproduzierbar). Für die Stile 1–15 gibt es Demos in `pipeline/stile/` und für 1, 2, 3, 4, 6, 12, 13, 14 Video-Baukästen in `pipeline/engine/`; die übrigen (5, 7, 8, 9, 10, 11, 15) brauchen vor dem Einsatz einen Erstbau (Opus, `stile.md`). Beim ersten Einsatz je Stil kommen die themenspezifischen Objekte dazu (z. B. Zapfsäule, Brotdose, Lieferbeutel, Waschmaschine). Neue Objekte immer im Stil-Modul anlegen, nicht in der Szene, damit sie wiederverwendbar sind. Renderzeit unter Fremdlast prüfen (`stile.md`); Qualitätsschalter `msaa`, `schatten`, Spiegelung und Nebel sind in der Demo per Query abschaltbar.
