# Ablauf: 80-s-Zeitplan, Sätze, Anzeige, Abspann, Themen

Alle 4 Referenzen sind exakt 80,0 s lang und folgen demselben Bogen (F). Die Vorlage unten ist verbindlich; Zeiten dürfen je Thema um ±2 s wandern, die Fixpunkte (Titel bis 4,4 s wie in den Referenzen, Abblende 70–72 s, Abspann 72–80 s) nicht.

## Zeitplan (Vorlage)
| Zeit | Phase | Bild | Anzeige | Satz | Ton |
|---|---|---|---|---|---|
| 0 s (Bild 1) | Start | ganze Szene, die Welt lebt schon (Menschen, Autos, Vögel, Wolken) | **steht schon** (Phase 1) | – | Atmo ab Bild 0 |
| 0,4–4,4 s | Titel | ruhige Weite, Ereignis noch klein oder unsichtbar | läuft | – (Titelfrage oben) | Atmo |
| ≈ 4,8 s | Satz 1 | Ort und Lage in einem Satz | | „Ort, Tageszeit, Ruhe“ | |
| 5–20 s | Alltag, erste Anzeichen | kleine Vorboten, die man sieht (Dampf, Lichtpunkt, Wasser zieht sich zurück, Wind) | Phase 1 (z. B. Entfernung, Druck, Höhe) | 2–3 Sätze | Atmo, evtl. erstes Grollen |
| 18–25 s | Auslöser, erste Wendung | das Ereignis beginnt sichtbar | 1. Etikettwechsel | „Dann …“ | |
| 25–50 s | Eskalation in Stufen | alle 8–10 s eine neue Stufe: Licht kippt, Wind, Staub, Trümmer, Statisten reagieren | 2.–3. Etikettwechsel (neue Messgröße je Stufe) | 4–6 Sätze | Pegel steigt, ggf. ein kurzer Stille-Moment (A: 3 s) |
| 50–58 s | Annäherung | Front/Welle/Wolke rückt sichtbar heran, Kamera bebt | Countdown bzw. Entfernung → 0 | 1–2 Sätze, kurz | Grollen, Wind, lauter |
| **58–62 s** | **Höhepunkt** | trifft den Standpunkt: Weißblende bzw. Staubwand bzw. Wasser, Stoß, Kamera kippt, Glas springt, Trümmer | **„HIER“** | höchstens ein kurzer Satz kurz davor, im Moment selbst keiner | lautester Punkt (kurzzeitig −9 … −11 LUFS) |
| 62–70 s | Nachspiel | Staub, Asche, Wasser, Stille, Kamera liegt still, Flecken vor der Linse | bleibt „HIER“, blendet 69,2–70,1 s aus | 1–2 Sätze, der letzte oft mit Realitätsbezug | dumpf, Pfeifen/Brummen |
| 70–72 s | Abblende | auf #111111 | – | – | leiser |
| 72–80 s | Abspann | Titelfrage + Faktenzeile auf #111111 | – | – | tiefes Brummen, leise (−18 … −32 LUFS) |

## Satztakt
- **12–18 Sätze** (Referenzen ≈ 11–15), je **3–9 Wörter**, **mindestens 3 s** sichtbar (Referenz 3,1–5,3 s), Lücke 0,6–1 s, Ein- und Ausblenden 0,2 s.
- Erster Satz bei ≈ 4,8–5,6 s, letzter endet spätestens bei 70 s.
- Ton: ruhig, Präsens, Aussagesätze, gern Du-Perspektive („Die Druckwelle rollt auf dich zu.“), Übergänge mit „Dann …“, keine Ausrufezeichen, keine Fragen außer der Titelfrage, kein „5 Sekunden“.
- **Jeder Satz beschreibt, was im selben Moment zu sehen ist.** Zahlen im Satz stimmen mit der Anzeige überein. Abgleich in `skript.json`:
  ```json
  "bild_text_abgleich": [[19.6, "Dann reißt der Gipfel auf.", "Lichtblitz und Feuerball am Gipfel bei 19,6 s"], …]
  ```
- Ein Satz darf ein Sinneseindruck sein, den Bild und Ton zugleich tragen (z. B. Stille, solange der Schall unterwegs ist), nie etwas Unsichtbares.

## Messwert-Anzeige
- Steht **ab Bild 0**, Zahl läuft durchgehend (live aus der Rechnung, keine Sprünge ohne Grund), endet 69,2–70,1 s.
- **2–4 Etikettwechsel** (F: 2–4): je Stufe eine neue echte Messgröße. Muster (Struktur, keine Kopie): Phase 1 Lage (Entfernung, Höhe, Druck, Temperatur) → Phase 2 Ereignis wächst (Höhe, Tempo, Wellenhöhe) → Phase 3 Ankunft (Countdown `m:ss` oder Entfernung) → Höhepunkt **„HIER“**.
- Unterzeile: Kontext in Versalien (Tempo, Entfernung, Vergleich), kurz, darf sich mitändern.
- Zeitraffer nur, wenn die Rechnung ihn ausweist (z. B. „×60“ im Skript dokumentiert) und die Anzeige die echte Größe zeigt; lieber Echtzeit-Physik wählen (Schall 343 m/s, Wellen, Fronten).
- Etikettwechsel blenden weich (0,3 s Abtauchen, `LP_ZEITEN.etikettWechsel`).

## Abspann
- Exakt dieselbe Titelfrage wie am Anfang.
- **Faktenzeile:** echter Bezug, Form „ORT, JAHR · FAKT“ oder „FAKT · FAKT“ (Versalien kommen aus dem CSS), 1–2 Zeilen, mit Quelle in `skript.json → quellen`. Keine Quellen, URLs oder Annahmen im Bild.

## Themen (Regel des Inhabers 02.11.)
- Große, globale Gedankenexperimente aus Physik, Mathematik, Biologie, Chemie, Astronomie, Geologie, Klima. Standpunkt irgendwo auf der Welt, gern mit Wiedererkennung (Küste, Großstadt, Gebirge, Wüste, Eis).
- Ein Ereignis, das man von **einem festen Standpunkt** wachsen sieht, mit einer messbaren Größe, die bis „HIER“ läuft.
- **Gesperrt:** Asteroid explodiert über der Stadt, Sonne explodiert, Mega-Tsunami trifft Großstadt, Erde hört auf sich zu drehen. Jedes neue Thema gegen den Katalog von Lunar Animations prüfen (TikTok-Suche); nichts übernehmen, was dort schon viral lief, außer mit klar eigenem Ansatz.
- Kein „5 Sekunden“-Szenario. Keine Opfer zeigen (Menschen fallen um, aber keine Verletzungen), kein Gore (CRP „Disturbing“).

## Caption (nur Text beim Posten)
`Hook-Frage mit Suchbegriff? Emoji Ich hab's durchgespielt. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #waswaerewenn` (Muster in `data/plan/account2-30-tage.csv`), höchstens ca. 150 Zeichen plus 5 Hashtags, kein #fyp/#viral.
