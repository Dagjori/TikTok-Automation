# Ablauf: 80-s-Zeitplan, Sätze, Anzeige, Bewegung, Dramaturgie, Skript, Abspann, Themen

Alle 4 Referenzen sind exakt 80,0 s lang und folgen demselben Bogen (F). Die Vorlage unten ist verbindlich; Zeiten dürfen je Thema um ±2 s wandern, die Fixpunkte (Titel bis 4,4 s wie in den Referenzen, Abblende 70–72 s, Abspann 72–80 s) nicht. Seit 02.11.2026 abends gelten dazu die Abschnitte **Bewegung und Zeitraffer**, **Dramaturgie und Qualitätslatte** und **Skript-Anforderungen** (Regeln des Inhabers).

## Zeitplan (Vorlage)
| Zeit | Phase | Bild | Anzeige | Satz | Ton |
|---|---|---|---|---|---|
| 0 s (Bild 1) | Start | ganze Szene, die Welt lebt schon (Wetter, Licht, Wasser, Menschen, Tiere, Fahrzeuge, Vögel, Wolken) | **steht schon** (Phase 1) | – | Atmo ab Bild 0 |
| 0,4–4,4 s | Titel | Weite **mit Bewegung und erstem Hinweis**: kein Standbild, ein Vorbote ist schon sichtbar (Lichtstimmung, Tiere, Wasser, Himmel), das Ereignis selbst noch klein oder unsichtbar | läuft | – (Titelfrage oben) | Atmo |
| ≈ 4,8 s | Satz 1 | Ort und Lage in einem Satz | | „Ort, Tageszeit, Ruhe“ | |
| 5–20 s | Alltag, erste Anzeichen | kleine Vorboten, die man sieht (Dampf, Lichtpunkt, Wasser zieht sich zurück, Wind, Licht kippt, Tiere reagieren); erste langsame Fahrt oder Schwenk möglich | Phase 1 (z. B. Entfernung, Druck, Höhe, Jahr) | 2–3 Sätze | Atmo, evtl. erstes Grollen |
| 18–25 s | Auslöser, erste Wendung | das Ereignis beginnt sichtbar, **Bildwechsel** (Licht, Wetter, Tageszeit oder Zoom) | 1. Etikettwechsel | „Dann …“ | |
| 25–50 s | Eskalation in Stufen | alle 8–10 s eine neue Stufe: Licht kippt, Wind, Staub, Trümmer, Statisten reagieren; dazwischen immer Veränderung (Bewegungsplan) | 2.–3. Etikettwechsel (neue Messgröße je Stufe) | 4–6 Sätze | Pegel steigt, ggf. ein kurzer Stille-Moment (A: 3 s) |
| 50–58 s | Annäherung | Front/Welle/Wolke/Wasserlinie rückt sichtbar heran, Kamera bebt oder fährt zu | Countdown bzw. Entfernung → 0 | 1–2 Sätze, kurz | Grollen, Wind, lauter |
| **58–62 s** | **Höhepunkt** | trifft den Standpunkt: Weißblende bzw. Staubwand bzw. Wasser, Stoß, Kamera kippt, Glas springt, Trümmer | **„HIER“** | höchstens ein kurzer Satz kurz davor, im Moment selbst keiner | lautester Punkt (kurzzeitig −9 … −11 LUFS) |
| 62–70 s | Nachspiel | Staub, Asche, Wasser, Stille, Kamera liegt still, Flecken vor der Linse; die Welt bewegt sich weiter (Partikel, Licht klärt auf) | bleibt „HIER“, blendet 69,2–70,1 s aus | 1–2 Sätze, der letzte oft mit Realitätsbezug | dumpf, Pfeifen/Brummen |
| 70–72 s | Abblende | auf #111111 | – | – | leiser |
| 72–80 s | Abspann | Titelfrage + Faktenzeile auf #111111 | – | – | tiefes Brummen, leise (−18 … −32 LUFS) |

**Bogen für Zeitraffer-Themen** (Wachstum, Wandel, Eisschmelze, Pegel, Jahreszeiten): dieselben Fixpunkte, andere Wörter. Auslöser = Veränderung setzt ein, Eskalation = Veränderung beschleunigt sich (der Zeitraffer-Faktor darf wachsen), Annäherung = eine Marke rückt heran (Wasserlinie, Eisrand, Schattenlinie), **Höhepunkt „HIER“ = die Marke erreicht den Standpunkt** oder die Pointe wird sichtbar, Nachspiel = Welt im neuen Zustand, die sich weiter regt.

## Satztakt
- **12–18 Sätze** (Referenzen ≈ 11–15), je **3–9 Wörter**, **mindestens 3 s** sichtbar (Referenz 3,1–5,3 s), Lücke 0,6–1 s, Ein- und Ausblenden 0,2 s.
- Erster Satz bei ≈ 4,8–5,6 s, letzter endet spätestens bei 70 s.
- Ton: ruhig, Präsens, Aussagesätze, gern Du-Perspektive („Die Druckwelle rollt auf dich zu.“), Übergänge mit „Dann …“, keine Ausrufezeichen, keine Fragen außer der Titelfrage. Ein „5 Sekunden“-Rahmen ist erlaubt (seit 02.11. abends), wenn er sich gut simulieren lässt.
- **Jeder Satz beschreibt, was im selben Moment zu sehen ist.** Zahlen im Satz stimmen mit der Anzeige überein. Abgleich in `skript.json`:
  ```json
  "bild_text_abgleich": [[19.6, "Dann reißt der Gipfel auf.", "Lichtblitz und Feuerball am Gipfel bei 19,6 s"], …]
  ```
- Ein Satz darf ein Sinneseindruck sein, den Bild und Ton zugleich tragen (z. B. Stille, solange der Schall unterwegs ist), nie etwas Unsichtbares.
- Die Sätze kommen aus dem Skript (Ideen-Studio) und werden 1:1 übernommen; Claude Code setzt nur die Zeiten nach diesem Takt.

## Messwert-Anzeige
- Steht **ab Bild 0**, Zahl läuft durchgehend (live aus der Rechnung, keine Sprünge ohne Grund), endet 69,2–70,1 s.
- **2–4 Etikettwechsel** (F: 2–4): je Stufe eine neue echte Messgröße. Muster (Struktur, keine Kopie): Phase 1 Lage (Entfernung, Höhe, Druck, Temperatur, Jahr) → Phase 2 Ereignis wächst (Höhe, Tempo, Wellenhöhe, Pegel) → Phase 3 Ankunft (Countdown `m:ss` oder Entfernung) → Höhepunkt **„HIER“**.
- Unterzeile: Kontext in Versalien (Tempo, Entfernung, Vergleich, Zeitraffer-Faktor), kurz, darf sich mitändern.
- Etikettwechsel blenden weich (0,3 s Abtauchen, `LP_ZEITEN.etikettWechsel`).
- **Zeitraffer und Anzeige gehören zusammen** (Regel des Inhabers 02.11. abends; ersetzt „Zeitraffer nur, wenn die Rechnung ihn ausweist“, „lieber Echtzeit-Physik“):
  - Wo die Szene gerafft läuft, steht der **Zeitraffer-Faktor in `skript.json`** (Feld `zeitraffer`, Aufbau unten). Echtzeit-Physik (Schall 343 m/s, Wellen, Fronten) bleibt eine gute Wahl, ist aber kein Muss mehr.
  - Die Anzeige zeigt eine **nachvollziehbare Größe**: die Zeitgröße selbst (Jahr, Tag, Uhrzeit) oder eine daraus folgende Größe (Temperatur, Pegel, Eisrand, Höhe). Sie **läuft passend zur sichtbaren Veränderung**: Wenn der Pegel im Bild steigt, steigt die Zahl im selben Tempo; ändert sich der Faktor, ändert sich auch das Tempo der Zahl, und zwar stetig.
  - **Keine Sprünge ohne Grund.** Erlaubt ist ein Sprung nur mit Etikettwechsel (neue Messgröße, 0,3 s Abtauchen) oder wenn der Faktor springt und die Unterzeile es zeigt (z. B. „1 SEKUNDE = 1 TAG“ → „1 SEKUNDE = 1 JAHR“).
  - Der Faktor steht in der Unterzeile, wo er für das Verständnis nötig ist („ZEITRAFFER: 1 SEKUNDE = 10 JAHRE“, Versalien, kurz).
  - Prüfung: Hinweis 11 (Zeitraffer ausgewiesen, Anzeige läuft mit) und 12 (keine Sprünge) in `qc/referenz_pov.py`, dazu Sichtprüfung ([pruefung.md](pruefung.md)).

## Bewegung und Zeitraffer
Regel des Inhabers (02.11.2026 abends): **Es wird nie „gewartet“.** Die Eiszeit-Szene zeigte lange nur zunehmenden Schnee; das war zu wenig.
- **Takt:** mindestens alle **2–3 s eine sichtbare, themenbezogene Veränderung** zwischen Bild 0 und 70 s (auch im Alltagsteil und im Nachspiel). „Sichtbar“ heißt: Ein Zuschauer, der den Ton aus hat, sieht die Veränderung ohne Hinsehen (Licht, Wetter, Wasserstand, Schattenlauf, Vegetation, Eis, Wolkenzug, Fahrzeuge in Gruppen, Tiere, Partikelwolken, Kamerafahrt). Kleine Statisten allein (ein Auto, ein Vogel) zählen als Leben, nicht als Veränderung.
- **Mehrere Phasen und Sequenzen:** mindestens 4 erkennbar verschiedene Phasen (Licht, Wetter, Tageszeit, Wasserstand, Vegetation, Kamerasicht), jede mit eigenem Look; Wechsel weich über 2–6 s (`farbPhasen`), nur Blitz und Staubwand schlagen hart ein.
- **Leben in der Welt** (von Bild 0 an, mindestens drei Ebenen gleichzeitig aktiv): Wetter (Wolkenzug, Wind in Gras und Bäumen, Regen, Schnee, Nebel), Licht (Sonne und Mond wandern, Schatten laufen, Lichtstrahlen, Reflexe auf Wasser), Wasser (Wellen, Gischt, Pegel), Vegetation (Wiegen, Wachsen, Verfärben), Menschen, Tiere, Fahrzeuge und Boote, Vögel- und Insektenschwärme, Partikel (Staub, Asche, Pollen, Schnee, Funken).
- **Zeitraffer sichtbar machen:** Er ist an Sonnenstand, Schattenlänge, Lichtfarbe, Wolkenzug, Pegel, Vegetation oder Eisfläche abzulesen, nicht nur an der Zahl. Die Beschleunigung ist weich (Ease), die Kamera bleibt dabei ruhig oder fährt langsam, damit die Welt das Bild trägt.
- **Faktor ausweisen:** Jeder gerafft laufende Abschnitt steht in `skript.json → zeitraffer` mit von, bis und Faktor; Faktor-Wechsel sind Bildwechsel und stehen mit Zeitpunkt im Skript.
- **Bewegungsplan:** Vor dem Szenenbau trägt Claude Code in `skript.json → bewegungsplan` je Veränderung eine Zeile ein (Zeitpunkt, Was ändert sich, Spannungsstufe 1–5). Lücken über 3 s zwischen 4,4 und 70 s sind vor dem Bau zu füllen. Technik und Baukasten: [licht-und-effekte.md](licht-und-effekte.md) §6.
- **Prüfung:** Hinweis 10 und 10b in `qc/referenz_pov.py` (Leerlauf-Fenster, Einzelbild-Flackern) und Sichtprüfung am Kontaktbogen ([pruefung.md](pruefung.md)). Ergibt die Sichtprüfung Leerlauf, wird die Abnahme verweigert.

## Dramaturgie und Qualitätslatte
Regel des Inhabers (02.11.2026 abends): Von der ersten Sekunde fangen, Spannung steigern, nie langweilig, nichts Übertriebenes. **Skript zuerst, Design und Animation daraus ableiten** (nie umgekehrt).
- **Von der ersten Sekunde:** Bild 0 ist die volle, belebte Szene mit einem Vorboten oder einem ungewöhnlichen Blick; Titelfrage und Anzeige stehen sofort. Kein „ruhiges Einblenden“.
- **Spannungskurve:** mindestens 4 Stufen zwischen 5 und 58 s, jede mit neuer Information in Bild, Anzeige und (wenn vorhanden) Satz; die Kurve steigt, flacht nur kurz ab (Atempause höchstens 3 s, selten) und erreicht im Höhepunkt (58–62 s) ihr Maximum. Das Nachspiel löst auf, ohne zu langweilen.
- **Mehrere Sequenzen, Bildwechsel innerhalb der durchgehenden Einstellung:** Licht-, Wetter- und Tageszeit-Wechsel, langsame Fahrt, Schwenk und Zoom wirken wie Schnitte, ohne zu schneiden (die Einstellung bleibt eine).
- **Aufleuchten und Lichtspiele:** Sonnenstrahlen durch Wolken, Glanz und Reflexe auf Wasser und Eis, Sternschnuppen, Polarlicht, Blitze, Fensterlichter, Schimmern. **Maß halten:** höchstens eine Weißblende (Höhepunkt), Bloom und Farbstich ruhig, jeder Effekt trägt Information (Zeitpunkt im Protokoll, Klang dazu). Übertriebene Effekte (Dauerblitzen, schreiende Farben, Dauerbeben) sind ein Fehler.
- **Qualitätslatte „sieht es billig aus?“:** Vor der Abnahme betrachtet Claude die Standbilder und den Kontaktbogen wie ein Zuschauer. Wirken Gelände, Bäume, Wasser, Himmel, Gebäude flach, gleichförmig, milchig, glasig oder leer, ist das Video nicht abnahmefähig, auch wenn alle Pflichtpunkte stimmen. Checkliste in [pruefung.md](pruefung.md) §2.

## Skript-Anforderungen
**Quelle der Skripte:** Ideen-Studio; Recherche und Skript schreibt die Tages-Sitzung von Claude Code mit Websuche (`docs/automatik/tages-sitzung.md`, Befehl aus `tools/chat_befehle.py`; Notweg Claude Chat: [[Claude-Chat-Workflow]], [[Befehl Ideen und Skripte Account 2]]). Der Inhaber bekommt täglich 10 Videoideen, wählt 2 für den nächsten Tag und gibt das Skript frei. ArtifactData-Sammlung **`skripte`**, Dokument-ID `acc2-JJJJ-MM-TT-mittag|abend`; Felder: `konto`, `datum`, `slot`, `titel`, `thema`, `welt`, `standpunkt`, `tageszeit_verlauf`, `zeitraffer`, `anzeige_plan`, `saetze`, `faktenzeile`, `rechenweg`, `zahlen`, `annahmen`, `quellen`, `caption`, `status`. Das Skript kann auch vom Inhaber eingefügt werden.

**Anforderungen an das Skript (gelten für das Ideen-Studio):**
- **Aussagen legitim und belegbar, nichts erfinden.** Jede Zahl hat Rechenweg und Quelle, Annahmen sind als Annahme gekennzeichnet; offene Werte stehen als „prüfen“ drin.
- **Diskussionsanreiz nur implizit.** Das Thema regt zum Nachdenken und Kommentieren an; ausgesprochen wird das nie (keine Provokation, kein Clickbait, kein künstlicher Cliffhanger). Die Kommentarfrage steht nur in der Caption.
- **Ohne Stimme:** Titelfrage, **12–18 kurze Sätze (3–9 Wörter)**, Faktenzeile („ORT, JAHR · FAKT“), **Anzeige-Plan** (Etiketten, Werte, Zeitraffer-Faktor), **Weltvorschlag** (Welttyp aus dem Weltenkatalog, Standpunkt, Tageszeit-Verlauf).
- Sätze nach `ablauf.md` „Satztakt“ (ruhig, Präsens, was im Bild zu sehen ist); der Plan für die Anzeige nach „Messwert-Anzeige“.

**Übernahme durch Claude Code (Schritt 1 des Ablaufs):**
- Titelfrage, Sätze und Faktenzeile **1:1** nach `skript.json`; Aussagen ändert Claude nur nach Rücksprache mit dem Inhaber. Passt ein Satz nicht zum Takt (Länge, Wörter), wird das gemeldet, nicht stillschweigend umgeschrieben.
- Zahlen prüft Claude per **Rechnung als Code mit Test** (`pipeline/sim/<thema>.mjs`); weicht ein Ergebnis ab, Rücksprache mit Vorschlag.
- Weltvorschlag prüfen (Weltvielfalt, Tageszeit, Enden, [themen-und-plan.md](themen-und-plan.md) §3); bei Konflikt Alternative vorschlagen.
- Felder, die Claude Code in `skript.json` ergänzt: `skript_id` (Dokument-ID), `zeitraffer` (Liste `{von, bis, faktor, anzeige}` in Sekunden oder `"keiner"` für Echtzeit), `bewegungsplan` (Liste `[t, "Veränderung", Stufe 1–5]`), `bild_text_abgleich`, **`lern_notizen`**.
- **`lern_notizen`** (Verweis auf die Lernschleife, Hirn-Notiz [[Lernschleife und Insights]]): damit Buffer-Zahlen mit Animationen verknüpft werden können, steht hier, was das Video tut: `{"welt": "Küste/Strand", "standpunkt": "Strandblick", "tageszeit": ["Tag", "Sonnenuntergang"], "kamera": [{"t": 12, "art": "fahrt|schwenk|zoom", "was": "…"}], "zeitraffer": [{"von": 0, "bis": 36, "faktor": "…"}], "effekte": [{"t": 40.2, "name": "…"}], "sequenzen": ["Alltag", "Auslöser", "Eskalation", "Höhepunkt", "Nachspiel"]}`. Die Effekte sind aus `out/<name>/ereignisse.json` übernommen; Kamera und Zeitraffer aus `szene.js`.

## Abspann
- Exakt dieselbe Titelfrage wie am Anfang.
- **Faktenzeile:** echter Bezug, Form „ORT, JAHR · FAKT“ oder „FAKT · FAKT“ (Versalien kommen aus dem CSS), 1–2 Zeilen, mit Quelle in `skript.json → quellen`. Keine Quellen, URLs oder Annahmen im Bild.

## Themen (Regel des Inhabers 02.11.2026 abends; ersetzt die Regel vom 02.11. mittags)
- **Kernidee:** „Was wäre, wenn …“-Gedankenexperiment mit einer **messbaren Größe**, die bis „HIER“ läuft, **ein Ereignis, das man von einem Standpunkt aus** (Welt, Standpunkt aus dem Weltenkatalog) wachsen oder sich verändern sieht.
- **Breite:** spannend und flexibel: Wissenschaft, Natur, Geografie, Geschichte, Technik und mehr, damit es endlos viele Themen gibt. Orte weltweit, auch Deutschland und andere Länder, wie es zum Thema passt; Texte deutsch. Ungeeignet: Alltagsthemen ohne messbare Größe.
- **5-Sekunden-Rahmen erlaubt**, wenn sich das Thema gut simulieren lässt (das frühere Verbot und Prüfpunkt 9 sind entfallen).
- **Keine Sperrliste mehr** (auch nicht die der US-Konten und von Lunar Animations): Themen dieser Kanäle sind frei, der Inhaber kennt sie. **Es bleibt die Kopierregel:** keine 1:1-Kopie von Sätzen, Etiketten, Faktenzeilen, Bild- und Szenenideen; gleiches Thema nur mit eigenem Skript und deutlich anderem Design (anderer Ort bzw. andere Welt, andere Dramaturgie).
- Keine Opfer zeigen (Menschen fallen um, aber keine Verletzungen), kein Gore (CRP „Disturbing“); Ausschlussthemen aus `CLAUDE.md` §7 gelten weiter (Tragödien, Politik, Krypto …).
- Veraltet seit 02.11.2026: „große globale Wissenschaftsthemen“, „kein Deutschland-Bezug“, „keine Alltagsthemen“ als Einengung, Sperrliste Lunar/US/DE, Plan aus `data/plan/account2-30-tage.csv` (Archiv in `themen-und-plan.md` §5 Sperrliste und §6 Plan).

## Caption (nur Text beim Posten)
`Hook-Frage mit Suchbegriff? Emoji Ich hab's durchgespielt. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #waswaerewenn`, höchstens ca. 150 Zeichen plus 5 Hashtags, kein #fyp/#viral. Die Caption steht im Skript (Feld `caption`) und wird übernommen.
