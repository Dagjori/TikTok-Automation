# Teil stelldirvor (Account 2 `@stelldirvor.pov`)

**Gilt nur für `@stelldirvor.pov`.** Nichts hieraus gilt für `@simulierbar`, und von dort gilt hier nichts: keine Stimme, keine Untertitel, keine Tafel, keine Chips, kein Folgen-Aufruf (Ausnahme seit 08.11.: Folgen-Hinweis im Abspann, nur im Testblock), kein Schlusssatz, keine Schleife, kein `qc/massstab.py`. Format (Referenz Lunar, durch die REA bestätigt): „Was wäre, wenn …“-3D-POV, 80 s (Testblock c: 62–70 s), 30 fps, 1080 × 1920, drei Textebenen (Titelfrage, Messwert-Anzeige, kurze kursive Sätze), selbst erzeugte Atmo, schwarzer Abspann mit Titelfrage und Faktenzeile.

## Pflichtlektüre (vor dem Bau, in dieser Reihenfolge)
| Notiz (`hirn/…`) | Wofür |
|---|---|
| `04-Recherche/REA stelldirvor Regelwerk.md` | **die Regeln** (R01–R20), Zielkorridore, Aufbau-Schablone, Entscheidungen vom 07.11. |
| `03-stelldirvor-pov/Regelwerk Account 2.md` | alle geltenden Regeln des Accounts auf einen Blick |
| `03-stelldirvor-pov/1-Skripterstellung/Ablauf Account 2.md` | 80-s-Zeitplan (seit 07.11. mit Ereignis bei ca. 8 s), Satztakt, Messwert-Anzeige, Bewegung und Zeitraffer, Skript-Anforderungen |
| `03-stelldirvor-pov/3-Produktion/Design Account 2.md` | Maße, Schrift und Farben der drei Textebenen und des Abspanns |
| `03-stelldirvor-pov/3-Produktion/Licht und Effekte Account 2.md` | Licht und Farbe je Phase, Effekte mit Baukasten-Aufruf, Kamera, Zeitraffer-Technik |
| `03-stelldirvor-pov/3-Produktion/Ton Account 2.md` | Atmo und Sounddesign, Lautheitskurve, `atmo.py` |
| `03-stelldirvor-pov/3-Produktion/Technik und Szenenbau Account 2.md` | Baukasten (`engine/stil_lunar_pov.js`, `engine/lunar_hud.js`), Szenengerüst, Render, Mux, Posting |
| `03-stelldirvor-pov/1-Skripterstellung/Themen und Plan Account 2.md` | §2 Weltenkatalog (Natur zuerst), §3 Weltvielfalt, Tageszeit, Enden |
| `03-stelldirvor-pov/3-Produktion/Prüfung und Abnahme Account 2.md` | Prüfbefehle, Kontaktbogen, Sichtprüfung, Qualitätslatte |
Muster mit allen Bausteinen: `pipeline/projekte/_demo-lunar-pov/` (Demo, nicht posten). Hintergrund: `03-stelldirvor-pov/Format Account 2 Lunar.md`.

## Die Regeln auf einen Blick (Stand 08.11.2026; bei Abweichung gilt das Hirn)
**Testblöcke seit 08.11.** (Wahl des Inhabers, `tools/testblock.py --konto stelldirvor --datum <Video-Tag> --slot <mittag|abend>`, Ergebnis als `testbloecke` in `skript.json`; jeder Block ändert **nur seine eine Sache**, sonst gilt alles unten):
- `einstieg_a2` = **a**: Ereignis bei **2–3 s** auf Countdown-Null (Countdown entsprechend kurz; 14 prüft 1,5–3,5 s) · **b**: **zweite sichtbare Stufe bei 12–15 s** (neues Etikett oder neue Statuszeile, deutlich im Bild; 14c, Pflicht) · **c**: Länge **62–70 s** (`zeiten: lpZeitenFuer(L)` im `LunarHUD`, Zeiten der Szene mit `lpSkala(t, L)` aus dem 80-s-Plan umrechnen; Abspann bleibt die letzten 8 s, Abblende 2 s davor; `referenz_pov.py` rechnet alle Fenster mit der Länge laut Protokoll) · **standard**: kein Einstiegstest mehr.
- `folgen_hinweis` = **mit**: Textzeile im Abspann (`LunarHUD`-Option `hinweis: skript.folgen_hinweis`, erscheint nach der Faktenzeile), an den Inhalt gebunden („Morgen: …“, „Teil 2 im Profil“), kein Tausch, keine Belohnung, kein Druck (16, Pflicht) · **ohne** bzw. kein Testblock: keine (16).
- **Cover** (seit 08.11.): `post_buffer.py` setzt das Bild bei 1,5 s; die Titelfrage (mit Suchbegriff, `skript.json → suchbegriff`) muss dort voll lesbar sein. Folgeteil: „Teil N“ in der Titelfrage.

**Pflicht** (Prüfpunkt in `qc/referenz_pov.py` in Klammern):
1. **Erstes Bild ohne Ton verständlich:** volle, belebte Szene mit Bewegung ab Bild 1, Anzeige ab Bild 0, Titelfrage 0,4–4,4 s als Frage mit offener Folge (2, 3).
2. **Countdown ab Bild 0, Ereignis bei ca. 8 s genau auf Countdown-Null** (14: erster Etikettwechsel 6–11 s; Testblock a: 2–3 s): Bis dahin lebt die Welt **ahnungslos** weiter (Wissensvorsprung: Titel und Countdown verraten die Gefahr, das Bild nicht); auf Null kippen Bild, Licht und Ton gleichzeitig. Einstieg dicht: Welteffekt vor 4 s, Kamerabewegung vor 8 s (13, Hinweis).
3. **Eskalation in mindestens 3 Stufen** (alle 8–10 s), Farbe und Licht kippen mit der Lage, Höhepunkt 58–62 s mit „HIER“ in der Anzeige (3d), danach Nachspiel, Abblende 70–72 s, Abspann 72–80 s mit Titelfrage und Faktzeile (6, 6b, 6c).
4. **Anzeige:** Zahl läuft live aus der Rechnung (3b), 2–4 Etikettwechsel (3c), Phase 1 = Countdown bis 0 (14b), **Statuszeile** (Unterzeile) wechselt mehrfach (15, Hinweis), keine unbegründeten Sprünge (12), Zeitraffer im Skript ausgewiesen und Anzeige läuft mit (11).
5. **Sätze:** 12–18, je 3–9 Wörter (Vorbilder 5–7), je mindestens 3 s, keine Überlappung, zwischen 4,4 und 70 s (4–4e); ruhig, Präsens, gern Du-Perspektive, keine Fragen außer der Titelfrage.
6. **Kamera:** lange, durchgehende Einstellungen mit langsamer Fahrt, Schwenk, Zoom; **höchstens 1–3 gezielte harte Schnitte**, nur am Höhepunkt oder bei einem Maßstabs- bzw. Szenensprung (5b, 5c).
7. **Verboten:** Stimme, Untertitel (8), Sticker, Chips, Tafel, Karaoke, Folgen-Aufruf, Logo (5). Erlaubt ist nur der Folgen-Hinweis im Abspann im Testblock „mit“ (16).
8. **Ton:** −14 ± 1 LUFS, True Peak ≤ −1 dBTP, Maximum 52–68 s mindestens 4 dB über dem Start, Abspann leise (7, 7b, 7c); Riser vor dem Höhepunkt, Effekte auf Übergängen und beim Aufprall.
9. **Welt:** passt zum Thema, Natur zuerst, Weltvielfalt (Welttyp, Standpunkt, Tageszeit anders als im vorigen Video), detailreich und belebt; nie „warten“, alle 2–3 s eine sichtbare Veränderung (10, Hinweis; Sichtprüfung entscheidet).
**Richtwerte** (vorläufige REA-Regeln): zweiter Countdown bis zur Ankunft, Wort statt Zahl am Wendepunkt, Texte in Du-Form, ruhige und fahrende Kamera im Wechsel, Bildaufbau mittig, Lichtblitz als Übergang an Wendepunkten (sparsam).

## Eingangsprüfung (Schritt 1)
Ein Ereignis, ein Standpunkt, eine messbare Größe · Themenfeld und Nachfrage genannt (Skill `themen-skript`, Teil stelldirvor) · der Bogen trägt ein **Ereignis bei ca. 8 s** (Countdown bis dahin; bei Zeitraffer-Themen die Zeit bis zum Einsetzen der Veränderung) · Weltvielfalt gegenüber dem vorigen Video · keine Opferdarstellung, kein Gore · keine 1:1-Kopie · **Originalität** laut Feld `originalitaet` (kein Klassiker der Anti-Liste, kein deutsches Video zur gleichen Prämisse; fehlt die Prüfung, kurz nachsuchen, bei Fund Status `rueckfrage`; Hirn „Originalität und Themenfindung“) · Sätze 12–18 mit 3–9 Wörtern · Faktzeile belegbar. Ein altes Skript mit Auslöser bei 18–25 s wird umgestellt: Countdown-Phase und Ereignis nach vorn, die Sätze nur so weit wie nötig verschieben und unter `korrekturen` vermerken.

## Bauen
- **Rechnung** liefert Anzeige-Werte, Countdown, Zeitraffer-Faktoren und Zeitpunkte (`t_ereignis` ≈ 8 s, Stufen, Höhepunkt).
- **Bewegungsplan und Dramaturgie** in `skript.json` (`bewegungsplan`, `zeitraffer`, `kamera`): Veränderung alle 2–3 s, Spannungsstufen, Licht- und Tageszeitverlauf, Farbdramaturgie.
- **`skript.json`:** `"skill": "video-produktion"`, `"konto": "stelldirvor"`, Titelfrage, Sätze und Faktenzeile 1:1, `anzeige_plan`, `zeitraffer` (Liste `{von, bis, faktor}` oder `"keiner"`), `kamera`, `bild_text_abgleich`, `caption`, `skript_quelle`, `korrekturen`, seit 08.11. `testbloecke`, `suchbegriff`, `folgen_hinweis`, `laenge_s`, bei Folgeteilen `teil`.
- **Anzeige** (`LunarHUD`, `anzeige: (t) => ({ etikett, zahl, einheit, unter, wert })`): Phase 1 als Countdown, z. B. `t < T_NULL ? { etikett: "EINSCHLAG IN", zahl: uhrzeit(T_NULL - t), unter: "NOCH RUHIG", wert: T_NULL - t } : …`; ab Null die nächste Messgröße; `unter` ist die **Statuszeile** (1–3 Wörter zur Lage, mehrfach wechselnd); am Höhepunkt `zahl: "HIER"`, `wert: 0`. Zahlenformat deutsch (`zahlDE`, Countdown `m:ss`).
- **Harte Schnitte** (höchstens 3): im Ereignis-Protokoll der Szene mit Grund melden, z. B. `{ t: 31.0, typ: "schnitt", grund: "Maßstabssprung Stadt → Kontinent" }`; ein Schnitt am Höhepunkt (55–65 s) braucht keinen weiteren Grund.
- **Szene:** Gerüst aus der Technik-Notiz, Welt aus dem Weltenkatalog (Erstbau eines Welttyps hebt die Welt erst auf Referenzniveau, Opus), Effekte nach dem Zeitplan, Kamera weich und dem Geschehen folgend. Lebt das Ereignis oder der Höhepunkt davon, echt auszusehen (Wasser, Wolken, Feuer, Rauch, Makro im Körper), und trägt three.js das nicht: **Blender-Schlüsselszene** nach [technik.md](technik.md) §3 (höchstens 2 je Video).
- **Standbilder:** mindestens 8 über 0–70 s (Bild 0, 4 s, Ereignis bei ca. 8 s, jede Stufe, Höhepunkt, Nachspiel, Abspann) gegen Design und Referenzniveau prüfen.
- **Ton:** `ton.json` → `python3 atmo.py projekte/<name>`; Mux `TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>` (der Render-Dienst erledigt das auf dem PC).

## Prüfung (Schritt 9)
```bash
python3 qc/referenz_pov.py projekte/<name>             # alle Pflichtpunkte „ja“, Hinweise erklärt (Exit 0)
node qc/text_ueberlappung_pov.mjs projekte/<name>      # Exit 0 = keine Überlappung, alles in der sicheren Zone
ffmpeg -v error -i out/<name>/<name>.mp4 -vf "fps=0.5,scale=216:384,tile=8x5" -frames:v 1 out/<name>/kontaktbogen.png
```
Dazu die Sichtprüfung aus „Prüfung und Abnahme Account 2“ §2 (Satz für Satz, Einstieg, Welt passt, Bewegung statt Warten, Zeitraffer und Anzeige, Kamera und Schnitte, Dramaturgie, Detaildichte, „sieht es billig aus?“, **REA-Standard**). Die Bildanalyse (5b, 10, 10b) braucht numpy; fehlt es, prüfst du Schnitte und Leerlauf am Kontaktbogen und an den Standbildern.

## `lern_notizen` (Schritt 10)
`welt`, `standpunkt`, `tageszeit`, `kamera` (mit Zeitpunkten), `zeitraffer`, `effekte` (aus `out/<name>/ereignisse.json`), `sequenzen`, dazu seit 07.11. `t_ereignis` (Countdown-Null), `countdown` (ja/nein, zweiter ja/nein), `schnitte` (Zeitpunkte und Grund), `statuszeile` (Texte), seit 08.11. `testbloecke`, `laenge_s`, `t_stufe2` (zweite sichtbare Stufe), `folgen_hinweis` (Text oder leer). Die Lernschleife vergleicht damit Anteil der Länge und Ø-Wiedergabezeit je Testblock.
