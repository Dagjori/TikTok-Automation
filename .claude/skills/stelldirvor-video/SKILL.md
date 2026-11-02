---
name: stelldirvor-video
description: Nur für TikTok-Account 2 @stelldirvor.pov („Was wäre, wenn …“-3D-POV ohne Stimme). Verbindlicher Ablauf, Welt, Design, Licht, Bewegung und Zeitraffer, Dramaturgie, Skript-Anforderungen, Ton und Prüfung für jedes Video dieses Accounts im Referenzformat des Inhabers (Lunar Animations): 80 s, eine durchgehende Einstellung (Kamera darf langsam fahren, schwenken, zoomen, keine harten Schnitte), Titelfrage, Messwert-Anzeige, kursive Sätze, Atmo, schwarzer Abspann mit Faktenzeile. Die Welt passt zum Thema (Natur zuerst, keine Standard-Skyline). Greift bei Skript-Übernahme, Szenenbau, Render, Ton, Abnahme und Posting für stelldirvor.pov. Nicht für Simulierbar (@simulierbar) und nicht für andere Accounts.
---

# Skill: Video für @stelldirvor.pov (Referenzformat „Lunar-POV“)

**Gilt nur für Account 2 `@stelldirvor.pov`.** Für Simulierbar gelten weiter der Maßstab (`CLAUDE.md` §5, Skill `simulierbar-video`), `pipeline/qc/massstab.py`, Stimme Ben und der Videoaufbau aus `CLAUDE.md` §6. Umgekehrt gilt für Account 2 nichts davon (kein Folgen-Aufruf, kein Schlusssatz, keine Schleife, keine Untertitel, keine Stimme).

Grundlage: eigene Messungen an den 4 Referenzvideos des Inhabers (02.11.; Bildvergleich je Bild, Phasenkorrelation, Pixelmessung der Schrift, EBU-R128-Lautheit, Spektren). Die Referenzen selbst, Standbilder, Texte und Ton kommen **nie** ins Repo (öffentlich). Hier stehen nur Messwerte und Regeln in eigenen Worten. Der Inhaber kann weitere Vorbild-Videos schicken; sie werden wie die ersten vier ausgewertet (nur abstrahierte Messwerte, nie die Dateien).

**Stand der Regeln:** Die Regeln des Inhabers vom **02.11.2026 abends** (Welt, Bewegung, Kamera, Themen, kein Plan, keine Sperrliste, Dramaturgie, Skript) ersetzen ältere Aussagen in allen Dateien dieses Skills. Wo eine alte Regel entfallen ist, steht sie als „veraltet seit 02.11.2026“ markiert oder ersetzt da.

## Pflichtlektüre vor jeder Arbeit an einem Video
| Datei | Inhalt |
|---|---|
| [ablauf.md](ablauf.md) | 80-s-Zeitplan als Vorlage, Satztakt, Messwert-Anzeige mit Zeitraffer, **Bewegung und Zeitraffer**, **Dramaturgie und Qualitätslatte**, **Skript-Anforderungen**, Abspann, Themenregeln |
| [design.md](design.md) | Maße, Schrift, Farben der drei Textebenen und des Abspanns (gemessen, in px für 1080 × 1920 und % des Bildes), Bildaufbau und Standpunkt |
| [licht-und-effekte.md](licht-und-effekte.md) | Licht und Farbe je Phase und Tageszeit, Dunst, Bloom, Tiefenunschärfe, jeder Effekt mit Aussehen, Zeitpunkt, Dauer und Baukasten-Aufruf; **Kamera (Fahrt, Schwenk, Zoom)**; Welt; **Bewegung und Zeitraffer (Technik)** |
| [ton.md](ton.md) | nur Atmo und Sounddesign (selbst erzeugt), Lautheitskurve, −14 LUFS, `atmo.py` |
| [themen-und-plan.md](themen-und-plan.md) | **Weltenkatalog** (Natur zuerst), Weltvielfalt, Themenbreite, Tagesablauf Ideen-Studio; Archiv: alter 30-Tage-Plan, Konkurrenz-Sperrliste (veraltet seit 02.11.2026) |
| [technik.md](technik.md) | Baukasten (`engine/stil_lunar_pov.js`, `engine/lunar_hud.js`), Szenengerüst, Render, stummer Mux, Posting über Buffer |
| [pruefung.md](pruefung.md) | Abnahme vor dem Posten (automatisch und Sichtprüfung, Qualitätslatte) |

Muster mit allen Bausteinen: `pipeline/projekte/_demo-lunar-pov/` (Demo, nicht zum Posten).

## Regeln des Inhabers (erzwungen, keine Ausnahme)
1. **Keine Stimme.** Keine KI-Stimme, kein Sprecher, keine Untertitel. Ton = selbst erzeugte Atmo und Sounddesign (`ton.md`). Prüfpunkt 8.
2. **Die Welt passt zum Thema, Natur zuerst bedenken** (02.11. abends; ersetzt „Großstadt-Dach als Standard“): keine Standard-Großstadt, keine Skyline als Dauerkulisse. Viele Simulationen funktionieren in der Natur besser (Meer/Küste, Strand, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe); Stadt nur, wenn sie wirklich zum Thema passt. **Weltvielfalt ist Pflicht:** nie zweimal derselbe Welttyp hintereinander, die Tageszeit wechselt (Tag, Sonnenauf-/untergang, Nacht), die Standpunkte sind vielfältig (nicht immer erhöht aus dem Fenster oder vom Balkon: auch Strandblick, Bootsdeck, Waldlichtung, Gipfel, Straße, Dünen, Eisfläche …). Weltenkatalog: [themen-und-plan.md](themen-und-plan.md) §2.
3. **Viel Bewegung; der Zeitraffer muss etwas zeigen** (02.11. abends): Es wird nie „gewartet“. Mindestens alle 2–3 s eine sichtbare, themenbezogene Veränderung, mehrere Phasen und Sequenzen, Leben in der Welt (Wetter, Licht, Sonne/Mond, Schatten, Wasser, Vegetation, Menschen, Tiere, Fahrzeuge, Vögel, Partikel). Wo die Szene gerafft läuft, steht der **Zeitraffer-Faktor in `skript.json`**, und die Messwert-Anzeige zeigt eine nachvollziehbare Größe (Jahr, Temperatur, Pegel …), die passend zur sichtbaren Veränderung läuft. Regeln: [ablauf.md](ablauf.md) „Bewegung und Zeitraffer“ und „Messwert-Anzeige“, Technik in [licht-und-effekte.md](licht-und-effekte.md) §6. Prüfpunkte 10, 10b, 11, 12.
4. **Kamera** (02.11. abends; ersetzt „Kamera praktisch starr“): Langsame Fahrt, Schwenk und Zoom sind erlaubt und gewollt, weich und dem Geschehen folgend. **Weiter keine harten Schnitte und keine mehreren Einstellungen** (eine durchgehende Einstellung). Ruhe bleibt der Normalfall im Alltagsteil. Prüfpunkt 5b.
5. **Themen** (02.11. abends; ersetzt „große globale Wissenschaftsthemen, kein Deutschland-Bezug, kein 5-Sekunden-Rahmen“): spannende „Was wäre, wenn …“-Gedankenexperimente mit **messbarer Größe**, **ein Ereignis von einem Standpunkt aus**. Themenbreite flexibel (Wissenschaft, Natur, Geografie, Geschichte, Technik …), Orte weltweit einschließlich Deutschland und anderer Länder, Texte deutsch. **Ein „5 Sekunden“-Rahmen ist erlaubt**, wenn sich das Thema gut simulieren lässt (Prüfpunkt 9 entfallen). Ungeeignet bleiben Alltagsthemen ohne messbare Größe.
6. **Jeder Satz passt exakt zum Bild:** Was ein Satz nennt (Objekt, Handlung, Zahl, Ort), ist im selben Moment so zu sehen. Abgleich Satz für Satz in `skript.json` → `bild_text_abgleich` und am Kontaktbogen.
7. **Die Welt ist die Kunst und die Dramaturgie trägt sie:** Zeit und Sorgfalt gehen in Gelände, Dunst, Licht, belebte Statisten (Menschen, Tiere, Fahrzeuge, Vögel), Effekte und eine Welt, die reagiert. Von der ersten Sekunde fangen, Spannung steigern, nie langweilig, nichts Übertriebenes ([ablauf.md](ablauf.md) „Dramaturgie und Qualitätslatte“). Text bleibt sparsam (drei Ebenen). **Skript zuerst, Design und Animation daraus ableiten.**
8. **Nur Three.js bzw. Blender** (Blender backen → glTF → Three.js erlaubt). Keine KI-Video-Generatoren, keine Vorlagen, keine fremden Assets ohne freie Lizenz.
9. **Keine 1:1-Kopie** (bleibt; die Sperrliste entfällt): Themen von Lunar Animations, US-Konten und anderen Kanälen sind frei, der Inhaber kennt sie selbst, und US-Themen dürfen auf Deutsch umgesetzt werden. **Verboten bleibt**, Sätze, Etiketten, Faktenzeilen, Bild- und Szenenideen eines fremden Videos zu übernehmen (CRP-Ausschluss „Unoriginal“; Nachahmer erreichen laut unserer Recherche nur 0,2–5 % des Originals). Gleiches Thema nur mit **eigenem Skript und deutlich anderem Design** (anderer Ort bzw. andere Welt, andere Dramaturgie).
10. **Deutsche Texte**, deutsche Zahlen (1.013,2), Einheiten metrisch.
11. **Rhythmus und Skriptquelle:** 2 Videos pro Tag für diesen Account (4 insgesamt), für den nächsten Tag; **höchstens 2 Produktions-Agenten gleichzeitig**, gestaffelt, Produktions-Agenten mit `model: sonnet`. Ein 30-Tage-Plan und Abstandsregeln nach Plan gibt es nicht mehr: Der Inhaber bekommt täglich 10 Videoideen, wählt 2 für den nächsten Tag, Recherche und Skript übernimmt die Tages-Sitzung von Claude Code (Ideen-Studio, `docs/automatik/tages-sitzung.md`), der Inhaber gibt frei ([ablauf.md](ablauf.md) „Skript-Anforderungen“). Der Ablauf beginnt mit „Skript liegt vor“.
12. **Kein Logo, kein Kanalname, keine Sticker, Chips, Karaoke, Folgen-Aufruf, Kommentar-Aufruf im Bild.** Die Kommentarfrage steht nur in der Caption. Der Diskussionsanreiz steckt höchstens implizit im Thema, nie ausgesprochen.
13. **Kein KI-Label** beim Posten (Bilder sind in Three.js gebaut, keine Stimme).

## Ablauf je Video (Zeit: Schätzung)
1. **Skript liegt vor** (ArtifactData-Sammlung `skripte` des Ideen-Studios, Dokument-ID `acc2-JJJJ-MM-TT-mittag|abend`, oder vom Inhaber eingefügt): Titelfrage, Sätze und Faktenzeile **1:1** nach `skript.json` übernehmen; Faktenfehler mit Quelle korrigieren, unter `korrekturen` vermerken und weiter, bei gekipptem Ergebnis Status `rueckfrage` und Push (Inhaber 02.11. spätabends). Themen-Logik prüfen (ein Ereignis, ein Standpunkt, messbare Größe), Weltvielfalt prüfen (Welttyp und Tageszeit gegenüber dem vorigen Video, nicht zwei gleiche Enden am selben Tag), Kopier-Check (Regel 9). (15 Min.)
2. **Rechnung** als Code mit Test (`pipeline/sim/<thema>.mjs`) prüft die Zahlen des Skripts (`rechenweg`, `zahlen`, `annahmen`, `quellen`) und liefert Anzeige-Werte, Zeitraffer-Faktoren und Zeitpunkte. (30–60 Min.)
3. **Dramaturgie und Bewegungsplan** aus dem Skript ableiten (`bewegungsplan`, `zeitraffer`, `lern_notizen` in `skript.json`; [ablauf.md](ablauf.md)): Spannungsstufen, Sequenzen, Veränderung alle 2–3 s, Kamera, Licht- und Tageszeitverlauf. (30 Min.)
4. **Szene** `szene.html` + `szene.js` aus dem Gerüst in `technik.md` (Welt aus dem Weltenkatalog, Effekte, Kamera, Farbphasen, LunarHUD). (2–4 Std.)
5. **Standbilder** der Phasen (mindestens 8, gleichmäßig über 0–70 s verteilt, dazu je Sequenzwechsel eines) rendern und gegen `design.md`/`licht-und-effekte.md` prüfen; nachbessern. (20 Min.)
6. **Ton:** `ton.json` → `python3 atmo.py projekte/<name>`. (10 Min.)
7. **Render** aller Bilder, `TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>`. (Standard: Render-Dienst auf dem Windows-PC, ca. 3–5 Min.; Cloud nur Rückfall, ca. 2 Std.)
8. **Prüfung** nach `pruefung.md` (Skripte + Kontaktbogen + Sichtprüfung + Qualitätslatte). (15 Min.)
9. **Posting** über `pipeline/post_buffer.py --kanal stelldirvor.pov` zur festen Zeit, ohne KI-Label; danach `--nachpruefen`. (5 Min.)

## Lernstand (Verweis)
Täglich um 20:00 Uhr (Berlin) wertet ein Lauf die Buffer-Zahlen aus und legt dem Inhaber **Verbesserungsvorschläge anklickbar zur Freigabe** vor; **erst nach Freigabe ändert sich eine Regel** (Hirn-Notiz [[Lernschleife und Insights]]). Damit Zahlen mit Animationen verknüpft werden können, trägt jede `skript.json` das Feld **`lern_notizen`** (Welt, Standpunkt, Tageszeit-Verlauf, Kamera, Zeitraffer, Effekte mit Zeitpunkten; Aufbau in [ablauf.md](ablauf.md) „Skript-Anforderungen“). Bis zur ersten Auswertung gelten die Regeln dieses Skills unverändert.

## Qualitätsstand des Baukastens und Lehre 02.11.
Schrift, Layout, Abspann, Ton-Verlauf und Prüfung treffen die Referenzen (Demo besteht alle Pflichtpunkte). **Die Welt bleibt hinter den Referenzen zurück**, vor allem bei der Detaildichte (kahle Häuser, grobe Bäume, kein Wasser, kaum sichtbare Menschen), bei Wolken und Rauch (wattig, ohne Randlicht) und bei leeren Höhepunkt-Bildern. Deshalb gilt: Jeder Erstbau eines Welttyps ([themen-und-plan.md](themen-und-plan.md) §2) hebt die Welt auf Referenzniveau, bevor das erste Video darin gerendert wird; Abnahme am Phasen-Vergleich (`pruefung.md` §2).

**Lehre 02.11. („Eiszeit Toronto“, erstes Video; es bestand die damals 22 Pflichtpunkte, heute sind es 21, und der Inhaber war trotzdem unzufrieden: die Pflichtpunkte messen Format, nicht Wirkung):**
- Bekannte Schwächen der Welt: Gebäude gleichförmig, Winterphase milchig, Eiswand glasig, Weißblende zu früh; dazu springt ein Teil des Vordergrunds (Wasserspiegelung) an 5 Stellen für je ein Bild (Prüfpunkt 10b, am 02.11. nachgemessen).
- Kritik des Inhabers: zu fixiert auf Stadt und Skyline im Hintergrund, **zu wenig Bewegung** („es wird gewartet und nichts passiert“, nur der Schnee nimmt zu), **immer derselbe erhöhte Standpunkt** aus dem Fenster. Nachgemessen: In 32–37 s und 40–49,5 s verändert sich das Bild kaum (Prüfpunkt 10).
- Daraus folgen die Regeln 2–4 und 7 oben; sie gelten als **Grundgedanke für jedes Video**, nicht nur für dieses Thema.
