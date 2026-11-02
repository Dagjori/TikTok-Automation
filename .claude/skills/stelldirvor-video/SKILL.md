---
name: stelldirvor-video
description: Nur für TikTok-Account 2 @stelldirvor.pov („Stell dir vor …“, Was-wäre-wenn-3D-POV ohne Stimme). Verbindlicher Ablauf, Design, Licht, Effekte, Animation, Ton und Prüfung für jedes Video dieses Accounts im Stil der 4 Referenzvideos des Inhabers (Lunar Animations): 80 s, feste Ich-Perspektive, Titelfrage, Messwert-Anzeige, kursive Sätze, Atmo, schwarzer Abspann mit Faktenzeile. Greift bei Themenwahl, Skript, Szenenbau, Render, Ton, Abnahme und Posting für stelldirvor.pov. Nicht für Simulierbar (@simulierbar) und nicht für andere Accounts.
---

# Skill: Video für @stelldirvor.pov (Referenzformat „Lunar-POV“)

**Gilt nur für Account 2 `@stelldirvor.pov`.** Für Simulierbar gelten weiter `docs/15-massstab.md`, `pipeline/qc/massstab.py`, Stimme Ben und der Videoaufbau aus `CLAUDE.md`. Umgekehrt gilt für Account 2 nichts davon (kein Folgen-Aufruf, kein Schlusssatz, keine Schleife, keine Untertitel, keine Stimme).

Grundlage: eigene Messungen an den 4 Referenzvideos des Inhabers (02.11.; Bildvergleich je Bild, Phasenkorrelation, Pixelmessung der Schrift, EBU-R128-Lautheit, Spektren). Die Referenzen selbst, Standbilder, Texte und Ton kommen **nie** ins Repo (öffentlich). Hier stehen nur Messwerte und Regeln in eigenen Worten.

## Pflichtlektüre vor jeder Arbeit an einem Video
| Datei | Inhalt |
|---|---|
| [design.md](design.md) | Maße, Schrift, Farben der drei Textebenen und des Abspanns (gemessen, in px für 1080 × 1920 und % des Bildes) |
| [licht-und-effekte.md](licht-und-effekte.md) | Licht und Farbe je Phase, Dunst, Bloom, Tiefenunschärfe, jeder Effekt mit Aussehen, Zeitpunkt, Dauer und Baukasten-Aufruf; Kamera; Welt |
| [ablauf.md](ablauf.md) | 80-s-Zeitplan als Vorlage, Satztakt, Phasen, Etikettwechsel, Höhepunkt „HIER“, Nachspiel, Abspann; Themenregeln |
| [ton.md](ton.md) | nur Atmo und Sounddesign (selbst erzeugt), Lautheitskurve, −14 LUFS, `atmo.py` |
| [technik.md](technik.md) | Baukasten (`engine/stil_lunar_pov.js`, `engine/lunar_hud.js`), Szenengerüst, Render, stummer Mux, Posting über Buffer |
| [pruefung.md](pruefung.md) | Abnahme vor dem Posten (automatisch und Sichtprüfung) |

Muster mit allen Bausteinen: `pipeline/projekte/_demo-lunar-pov/` (Demo, nicht zum Posten).

## Regeln des Inhabers (erzwungen, keine Ausnahme)
1. **Keine Stimme.** Keine KI-Stimme, kein Sprecher, keine Untertitel. Ton = selbst erzeugte Atmo und Sounddesign (`ton.md`). Prüfpunkt 8.
2. **Kein „5 Sekunden“-Rahmen** (02.11.): nicht im Titel, nicht in Sätzen, nicht in der Anzeige, nicht im Szenario. Das Ereignis dauert so lange, wie es physikalisch dauert; die Anzeige zeigt die echte Größe. Prüfpunkt 9.
3. **Große globale Wissenschaftsthemen** (Physik, Mathematik, Biologie, Chemie, Astronomie, Geologie, Klima), Standpunkte weltweit, keine Alltags- und Deutschland-Themen. Ein einziges Ereignis, das man von einem festen Standpunkt aus wachsen sieht, mit einer messbaren Größe für die Anzeige.
4. **Jeder Satz passt exakt zum Bild:** Was ein Satz nennt (Objekt, Handlung, Zahl, Ort), ist im selben Moment so zu sehen. Abgleich Satz für Satz in `skript.json` → `bild_text_abgleich` und am Kontaktbogen.
5. **Die Welt ist die Kunst:** Zeit und Sorgfalt gehen in Gelände, Dunst, Licht, belebte Statisten (Menschen, Autos, Vögel), Effekte und eine Welt, die reagiert. Text bleibt sparsam (drei Ebenen).
6. **Nur Three.js bzw. Blender** (Blender backen → glTF → Three.js erlaubt). Keine KI-Video-Generatoren, keine Vorlagen, keine fremden Assets ohne freie Lizenz.
7. **Keine Kopien:** Themen und Texte der Referenzen sind gesperrt (Asteroid explodiert über der Stadt, Sonne explodiert, Mega-Tsunami trifft Großstadt, Erde hört auf sich zu drehen). Keine Sätze, Etiketten, Faktenzeilen oder Bildideen 1:1 übernehmen, auch nicht übersetzt. Konkurrenz-Check vor jedem Thema (`docs/16` §12a).
8. **Deutsche Texte**, deutsche Zahlen (1.013,2), Einheiten metrisch.
9. **Rhythmus:** 2 Videos pro Tag für diesen Account (4 insgesamt), für den nächsten Tag; **höchstens 2 Produktions-Agenten gleichzeitig**, gestaffelt, Produktions-Agenten mit `model: sonnet`.
10. **Kein Logo, kein Kanalname, keine Sticker, Chips, Karaoke, Folgen-Aufruf, Kommentar-Aufruf im Bild.** Die Kommentarfrage steht nur in der Caption.
11. **Kein KI-Label** beim Posten (Bilder sind in Three.js gebaut, keine Stimme).

## Ablauf je Video (Zeit: Schätzung)
1. **Thema** aus `data/plan/account2-30-tage.csv`, Konkurrenz-Check (Referenz-Katalog, TikTok-Suche), Themen-Logik prüfen (ein Ereignis, fester Standpunkt, messbare Größe). (15 Min.)
2. **Rechnung** als Code mit Quellen (`pipeline/sim/<thema>.mjs` + Test) – liefert Anzeige-Werte und Zeitpunkte (z. B. Ankunft einer Front). (30–60 Min.)
3. **Skript** `projekte/<name>/skript.json`: Titelfrage, Anzeige-Phasen (Etiketten), 12–18 Sätze mit Zeiten, Faktenzeile mit Quelle, `bild_text_abgleich`, Caption. Vorlage `ablauf.md`. (20 Min.)
4. **Szene** `szene.html` + `szene.js` aus dem Gerüst in `technik.md` (Welt, Effekte, Kamera, Farbphasen, LunarHUD). (2–4 Std.)
5. **Standbilder** der 6 Phasen rendern und gegen `design.md`/`licht-und-effekte.md` prüfen; nachbessern. (20 Min.)
6. **Ton:** `ton.json` → `python3 atmo.py projekte/<name>`. (10 Min.)
7. **Render** aller Bilder, `TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>`. (Cloud ca. 2 Std. Rechenzeit, Windows-PC mit `--gpu` deutlich schneller)
8. **Prüfung** nach `pruefung.md` (Skripte + Kontaktbogen + Sichtprüfung). (15 Min.)
9. **Posting** über `pipeline/post_buffer.py --kanal stelldirvor.pov` zur festen Zeit, ohne KI-Label; danach `--nachpruefen`. (5 Min.)

## Qualitätsstand des Baukastens (02.11.)
Schrift, Layout, Abspann, Ton-Verlauf und Prüfung treffen die Referenzen (Demo besteht alle Pflichtpunkte). **Die Welt bleibt noch hinter den Referenzen zurück**, vor allem bei der Detaildichte (kahle Häuser, grobe Bäume, kein Wasser, kaum sichtbare Menschen), bei Wolken und Rauch (wattig, ohne Randlicht) und bei leeren Höhepunkt-Bildern. Deshalb gilt: Jeder Erstbau einer Grundwelt (`docs/17` §3) hebt die Welt auf Referenzniveau, bevor das erste Video darin gerendert wird; Abnahme am Phasen-Vergleich (`pruefung.md` §2).
