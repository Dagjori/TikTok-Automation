---
name: simulierbar-video
description: Nur für TikTok-Account 1 @simulierbar (Simulierbar, „Alltag durchgerechnet“, Schwerpunkt Geld): deutsche gesichtslose Simulationsvideos 65–80 s mit Stimme Ben, Duell bzw. Rennen mit Anzeigetafel, Zählern und Uhr, Untertitel Wort für Wort, im seriösen Look mit Licht und Atmosphäre (Stile 17–21, keine Sticker, kein Cartoon/Clay). Verbindlicher Ablauf, Stile, Licht, Design, Ton, Technik und Prüfung für jedes Simulierbar-Video. Greift bei Themenwahl, Skript, Szenenbau, Render, Ton, Abnahme und Posting für @simulierbar. Nicht für @stelldirvor.pov (Account 2, dafür gilt der Skill stelldirvor-video) und nicht für andere Accounts.
---

# Skill: Video für @simulierbar (seriöser Look mit Licht und Atmosphäre)

**Gilt nur für Account 1 `@simulierbar`.** Für Account 2 `@stelldirvor.pov` gilt ausschließlich `.claude/skills/stelldirvor-video/`; nichts aus diesem Skill (Stimme, Untertitel, Tafel, Folgen-Aufruf, Schlusssatz, Schleife, Stile 17–21) gilt dort, und umgekehrt.

Grundlage: `CLAUDE.md` (Videoaufbau, Dynamik, Stimme, Untertitel, Teamfarben, Caption, Technik), **`docs/15-massstab.md` (verbindlich, §11 Prüfliste)**, `docs/08-beispielskripte.md` (Regie-Text), `docs/10-designstile.md` §0 (Stil-Katalog), `docs/12-30-tage-plan.md` (Reihenfolge), `pipeline/README.md`. Dieser Skill fasst zusammen und ergänzt den neuen Look; bei Widerspruch gilt die jüngste Entscheidung des Inhabers (`ENTSCHEIDUNGEN.md`).

## Pflichtlektüre vor jeder Arbeit an einem Video
| Datei | Inhalt |
|---|---|
| [ablauf.md](ablauf.md) | Videoaufbau als Zeitplan (0–80 s), Satzmuster, Themen-Logik, Skript-Bild-Abgleich |
| [stile.md](stile.md) | die 5 erlaubten Stile 17–21 (wofür, Baukasten, Demo, Renderzeit), die verbotenen Stile, Stilwahl |
| [licht-und-atmosphaere.md](licht-und-atmosphaere.md) | Licht-Rigs, Bloom, Lichtstrahlen, Volumenlicht, Nebel, Tiefenschärfe, Spiegelungen, Grading, Körnung, Kamera-Regie, je mit Baukasten-Aufruf |
| [design.md](design.md) | HUD im seriösen Look: Tafel, Zähler, Uhr, Chips, Karten, Typografie, Farben, Untertitel „kontur“, sichere Zonen |
| [ton.md](ton.md) | Stimme Ben, `eleven_v4`, Regie-Text, Tonfall, Klangteppich, Effekte, Lautheit |
| [technik.md](technik.md) | Dateien, Szenengerüst mit `SimBuehne`, Render, Mux, Posting über `post_buffer.py` |
| [pruefung.md](pruefung.md) | Abnahme: `massstab.py`, Text-Überlappung, Kontaktbogen, Skript-Bild-Abgleich, keine Sticker, nur erlaubte Stile |

Muster mit allen Bausteinen: `pipeline/projekte/_demo-simulierbar/` (eine Welt je Stil, gleiches HUD; Demo, nicht posten).

## Regeln des Inhabers (erzwungen, keine Ausnahme)
1. **Seriös und hochwertig statt Cartoon** (02.11.): „weg von dem Cartoon Clay sachen … was seriöseres … mit Licht effekten … dass eine gewisse Atmosphäre entstehen kann … richtig hochwertige Animationsvideos“. Nur die Stile **17–21** (`stile.md`). Clay, Comic, Holz, Filz, Collage, Papier, Flat, Neon, Typo als Hauptstil sind raus.
2. **Keine Sticker oder Stempel** (02.11.), Prüfpunkt 5d = 0. Zahlen, Zähler, Uhr und Chips bleiben, sind aber nicht die Kunst.
3. **Die Kunst ist die animierte Welt** (02.11.): Umgebung, Detailreichtum, Licht, Figuren und Objekte, die reagieren, eine Kamera, die dem Geschehen folgt. Dynamik aus Welt und Kamera, nicht aus Einblendungen.
4. **Skript und Bild passen exakt** (02.11.): Jedes gesprochene Detail (Objekt, Handlung, Zahl, Ort) ist im selben Moment genau so im Bild. Abgleich Segment für Segment (`skript.json → bild_text_abgleich`) und am Kontaktbogen.
5. **Themen-Logik** (02.11.): Ein Duell vergleicht nur echte Alternativen derselben Entscheidung. Prüfung vor jedem Produktionsstart.
6. **Ruhiger Ton** (02.11.): ruhig, sachlich, freundlich; kein Geschrei, keine aufgeregten Audio-Tags, kein „Los geht's“, höchstens 3 Ausrufezeichen.
7. **Videoaufbau, Folgen-Aufruf bei ca. 20 s, Schlusssatz genau, Schleife** wie `CLAUDE.md` und `ablauf.md`.
8. **Untertitel Wort für Wort, Stil „kontur“**: weiß, fett, schwarze Kontur, aktuelles Wort gelb, mittig, kein Kasten (01.11.).
9. **Teamfarben**: zwei feste Farben je Video, überall gleich (Objekte, Licht, Tafel, Chips, Untertitel-Schlüsselwort), **nie Gelb**.
10. **Kein Kanalname, kein Logo, keine Rubrik im Video. Mittig auf x = 540**, gleiches Format für TikTok und YouTube Shorts (1080 × 1920).
11. **Nur Three.js bzw. Blender** (Blender backen → glTF → Three.js erlaubt), keine KI-Bild- oder Video-Generatoren, nur Assets und Schriften mit freier Lizenz (Lizenzdatei ablegen). Keine echten Banknoten- oder Münzmotive, keine Marken.
12. **Rhythmus**: täglich genau 2 Simulierbar-Videos für den nächsten Tag (4 insgesamt mit Account 2), höchstens 2 Produktions-Agenten gleichzeitig, gestaffelt, mit `model: sonnet`; neue Objekttypen bzw. Szenentypen mit Opus. Posting vollautomatisch über Buffer nach eigener Prüfung, ohne KI-Label.

## Ablauf je Video (Zeit: Schätzung)
1. **Thema** aus `data/plan/30-tage.csv` (Stil und Teamfarben stehen dort), Konkurrenz-Check (`docs/12` §3.4, `docs/15` §9), Themen-Logik prüfen. (15 Min.)
2. **Rechnung** als Code mit Tests in `pipeline/sim/<thema>.mjs` (Netto-Modul `pipeline/sim/netto.mjs` nutzen), Quellen nur intern. Liefert Zählerverläufe, Führungswechsel, Ergebnis, „Warum?“-Faktoren, zweite Überraschung. (30–60 Min.)
3. **Skript** `projekte/<name>/skript.json` mit `"skill": "simulierbar-video"`, `"stil": "<Nr> <Name>"`, `stil_begruendung`, Segmenten (`text` + `sprechtext`), `bild_text_abgleich`, Caption. Vorlage `ablauf.md`, Regie-Text `ton.md`. (30 Min.)
4. **Stimme**: `python3 tts.py projekte/<name>` → `audio/stimme.mp3` + `audio/timing.json`. (5 Min.)
5. **Szene** `szene.html` + `szene.js` aus dem Gerüst in `technik.md`: Welt im Stil-Baukasten, Licht und Atmosphäre (`licht-und-atmosphaere.md`), Kamera-Regie, HUD (`design.md`). Fehlende Objekte im Stil-Modul ergänzen (wiederverwendbar). (2–4 Std.)
6. **Standbilder** an 6–8 Schlüsselstellen (Hook, Regeln, Wendung, Ergebnis, Warum, Schluss) rendern, gegen `design.md`, `stile.md` und den Skript-Bild-Abgleich prüfen, nachbessern. (20–40 Min.)
7. **Render** über den Render-Dienst auf dem Windows-PC: committen und pushen, `python3 pipeline/render_dienst/auftrag.py senden <name> --konto simulierbar`, dann `auftrag.py warten` im Hintergrund (holt das MP4). Bei Exit 3 (PC offline) Rückfall Cloud: `node render.js projekte/<name> --worker 2` und `./mux.sh projekte/<name>` (`technik.md`). (PC: Minuten; Cloud ca. 1–3 Std. Rechenzeit)
8. **Prüfung** nach `pruefung.md` (Skripte + Kontaktbogen + Sichtprüfung). (20 Min.)
9. **Posting** über `python3 post_buffer.py --kanal simulierbar --zeit auto:<datum>:<slot>` mit Caption, ohne KI-Label; nach dem Posten `--nachpruefen`. (5 Min.)

## Qualitätsstand des Baukastens (02.11.)
Grund-Baukästen und Demo-Szenen für alle fünf Stile stehen (`stile.md`, Standbilder im Demo-Projekt reproduzierbar). Beim ersten Einsatz je Stil kommen die themenspezifischen Objekte dazu (z. B. Zapfsäule, Brotdose, Lieferbeutel, Waschmaschine). Neue Objekte immer im Stil-Modul anlegen, nicht in der Szene, damit sie wiederverwendbar sind. Renderzeit unter Fremdlast prüfen (`stile.md`); Qualitätsschalter `msaa`, `schatten`, Spiegelung und Nebel sind in der Demo per Query abschaltbar.
