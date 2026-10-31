# So arbeitet Claude an Simulierbar

**Stand:** 31.10.2026, abends · **Anlass:** Der Inhaber ist mit den Ergebnissen noch nicht zufrieden. Er will sehen, wie Claude arbeitet, unter welchen Regeln und mit welchen Informationen.

> **Teilweise überholt (31.10. spät):** Nach der Neuaufstellung gelten `CLAUDE.md` (Rolle: Content-Creator-Experte statt Mentor), der Maßstab `docs/15-massstab.md` und `docs/08-beispielskripte.md`. Dieses Dokument beschreibt den Stand davor.

**Legende:**
- **(F)** = Fakt mit Beleg (Datei im Repo, Messung oder Sitzungsprotokoll)
- **(S)** = Schätzung
- **(A)** = Annahme

---

## 1. Kurzfazit

- **Regeln:** Ich arbeite nach fünf Ebenen mit fester Rangfolge (Abschnitt 2).
- **Wissen:** Mein Projektwissen steht in rund 2.000 Zeilen in 18 Dateien im Repo (Abschnitt 3).
- **Ablauf:** Ein Video entsteht in 12 Schritten (Abschnitt 4).
- **Meine größte Schwäche: Ich erlebe ein Video nicht wie ein Zuschauer.**
  - Den Ton höre ich nicht, ich messe ihn.
  - Bewegung sehe ich nicht, ich sehe nur Standbilder.
  - Was sich „unruhig“, „billig“ oder „langweilig“ anfühlt, erkenne ich nur indirekt.
  - Deshalb brauchte die Stimme 6 Fassungen, und du warst das Ohr (F, `ENTSCHEIDUNGEN.md`, Zeilen 26–40).
- **Mir fehlt ein echter Maßstab.**
  - Konkurrenz-Videos kann ich nicht herunterladen. Das Sicherheitssystem hat den Download als Umgehung von Bot-Schutz gewertet, und ich umgehe das nicht.
  - Von den Vorbildern kenne ich nur Texte, Untertitel-Zeiten und Abrufzahlen, aber nicht Bild, Schnitt und Musik.
  - „Wie die Konkurrenz“ ist bei mir deshalb eine Rekonstruktion aus Text.
- **Meine Abnahme prüft Technik, nicht Wirkung.**
  - Genau geprüft werden Länge, Lautheit, Synchronität, Untertitel-Ränder und Zahlen.
  - Ob man nach 3 Sekunden weiterwischt, prüft niemand.
- **Wir haben viel parallel gebaut und noch nichts gepostet.**
  - In 3 Tagen entstanden Nische, Name, Render-Engine, 6 Videofassungen, 8 Stile, ein Plan mit 70 Videos, Radar, Telegram und Buffer.
  - Jedes Video war ein neuer Szenentyp, also ein Prototyp.
  - Echte Zuschauerdaten gibt es noch keine.
- **Empfehlung** (Details in Abschnitt 9):
  1. Du bewertest die zwei fertigen Videos mit der Vorlage aus Abschnitt 8 (10 Min.).
  2. Du lädst 2–3 Konkurrenz-Videos, die dir gefallen, als Datei hoch (10 Min.).
  3. Ich baue daraus eine Bewertungskarte und messe jedes Video daran.
  4. Bis zur Auswertung am 15.11. nutzen wir 3 statt 8 Stile, dafür ausgereift.
- **Schon erledigt:** Die Widersprüche in den Regeldateien sind korrigiert (Abschnitt 7).

---

## 2. Nach welchen Regeln ich arbeite

### 2.1 Die fünf Ebenen und ihre Rangfolge

| Rang | Ebene | Wo es steht | Was drinsteht (Auszug) | Wer es ändert |
|---|---|---|---|---|
| 1 | Grundregeln von Anthropic und der Cloud-Umgebung | Systemvorgaben, nicht im Repo | <ul><li>kein Umgehen von Bot-Schutz oder Logins</li><li>vor Aktionen nach außen bzw. unumkehrbaren Aktionen fragen</li><li>ehrlich berichten, auch über Fehler</li><li>keine Geheimnisse ausgeben</li><li>der Container ist flüchtig, deshalb am Ende committen und pushen</li><li>Netzwerk nur über eine Freigabeliste</li></ul> | nicht änderbar. Netzwerk-Freigaben und Umgebungsvariablen änderst du in den Umgebungs-Einstellungen. |
| 2 | Deine persönlichen Präferenzen | dein Profil in claude.ai | <ul><li>Rolle: Mentor und Serial Founder</li><li>Deutsch, du-Form</li><li>Aufbau: Kurzfazit, Begründung, nächste Schritte, offene Punkte</li><li>Fakt, Schätzung und Annahme kennzeichnen</li><li>aktuelle Themen recherchieren</li><li>widersprechen, immer mit besserer Alternative</li><li>KI und Automatisierung zuerst</li></ul> | du, in den claude.ai-Einstellungen |
| 3 | Projekt-Regeln | `CLAUDE.md` | <ul><li>nichts außerhalb des Repos anlegen</li><li>Produktion nur auf dein Startsignal</li><li>Plattformregeln</li><li>Video-, Stimm- und Untertitel-Regeln</li><li>Caption-Format</li></ul> | du, per Satz im Chat („nimm das in die Regeln auf“) |
| 4 | Deine Entscheidungen und der Arbeitsstand | `ENTSCHEIDUNGEN.md` (34 Einträge), `STATUS.md` | <ul><li>Nische und Name</li><li>Stimme Ben</li><li>Stil wechselt je Thema</li><li>Buffer und Telegram</li><li>Reißverschluss zurückgestellt</li></ul> | jede deiner Entscheidungen landet dort |
| 5 | Fachwissen und Daten | `docs/00–14`, `data/` | <ul><li>Markt- und Nischenanalyse</li><li>Radar-Raster</li><li>Skriptstil</li><li>Designstile</li><li>Posting-Anleitung</li><li>30-Tage-Plan</li><li>Ideen</li></ul> | Claude pflegt es, du gibst die Richtung vor |

**Bei Widersprüchen gilt diese Reihenfolge:**
1. Ebene 1
2. deine aktuelle Anweisung im Chat (ich trage sie danach in die Dateien ein)
3. `CLAUDE.md` und `ENTSCHEIDUNGEN.md`
4. `docs/`
5. meine Annahmen

Ausnahme: Verstößt eine Anweisung gegen Plattformregeln (z. B. Posten per eigenem Bot), widerspreche ich mit Begründung und schlage einen erlaubten Weg vor.

### 2.2 Die Regeln für jedes Video

| Bereich | Regel | Quelle |
|---|---|---|
| Thema | <ul><li>oberste offene Zeile aus `data/plan/30-tage.csv`</li><li>kein Thema, das die Konkurrenz schon gebracht hat</li><li>immer eigene Rechnung bzw. Simulation</li></ul> | CLAUDE.md, ENTSCHEIDUNGEN 31.10. |
| Länge | <ul><li>mindestens 61 s, weil das CRP über 1 Minute verlangt</li><li>Ziel: 65–85 s</li></ul> | CLAUDE.md |
| Hook | <ul><li>steile Behauptung mit konkreter Zahl in den ersten 3 s</li><li>Auflösung im selben Video</li><li>kein künstlicher Cliffhanger</li></ul> | CLAUDE.md, docs/08 |
| Sätze | <ul><li>höchstens ca. 10 Wörter, ein Gedanke pro Satz</li><li>jeder Abschnitt endet mit 0,6 s Pause</li></ul> | docs/08, ENTSCHEIDUNGEN 31.10. |
| Schluss | genau „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ (seit 31.10. spät) | CLAUDE.md |
| Stimme | <ul><li>ElevenLabs „Ben“, ganzes Skript am Stück, natürliches Tempo</li><li>Einstellungen nach ElevenLabs-Empfehlung</li><li>eigener `sprechtext` für die Aussprache</li></ul> | CLAUDE.md, `pipeline/tts.py` |
| Untertitel | <ul><li>Wort für Wort, höchstens 2 Zeilen</li><li>weiß mit dicker schwarzer Kontur, aktuelles Wort gelb, kein Kasten</li></ul> | CLAUDE.md |
| Optik | <ul><li>genau ein Stil aus dem Katalog mit 8 Stilen, passend zum Thema, nie zweimal hintereinander</li><li>Markenfarben</li><li>sichere Zonen: oben 150 px, rechts 150 px, unten 400 px</li><li>keine Spielszenen, keine fremden Logos, keine echten Personen</li></ul> | docs/10, `pipeline/README.md` |
| Ton | <ul><li>Stimme, eigene Effekte und ein leiser Klangteppich</li><li>keine fremde Musik</li><li>Lautheit −14 LUFS</li></ul> | `pipeline/README.md` |
| Zahlen | <ul><li>gerundet</li><li>Bild, Sprechtext und Simulation stimmen überein</li><li>Quellen nur intern in `skript.json`</li></ul> | CLAUDE.md |
| Caption | eine Zeile im festen Format plus 5 Hashtags, keine Quellen oder Hinweise | CLAUDE.md |
| Posten | <ul><li>nur du, mit KI-Schalter AN</li><li>Buffer erst nach bestandenem Test, Claude legt dort höchstens Entwürfe an</li></ul> | CLAUDE.md |

---

## 3. Mit welchen Informationen ich arbeite

### 3.1 Was ich habe

| Quelle | Inhalt | Grenzen |
|---|---|---|
| Repo | <ul><li>Regeln und Wissen (18 Dateien)</li><li>Code der Render-Pipeline</li><li>Simulationen mit Tests</li><li>300 Ideen, Plan mit 70 Videos, Konkurrenz-Monitor</li></ul> | Was nicht in einer Datei steht, ist nach einer Zusammenfassung der Sitzung weg (siehe 3.2). |
| Websuche und Firecrawl | Fakten, Gesetze, Preise, Studien | Die Firecrawl-Credits waren am 31.10. zeitweise aufgebraucht. |
| Öffentliche TikTok-Seiten | <ul><li>Profile, Captions, Abrufe und Likes</li><li>automatische Untertitel einzelner Videos</li></ul> | <ul><li>Daraus gemessen: Die Konkurrenz spricht 2,6–2,9 Wörter/s, mit 7–8 Wörtern je Satzstück und ca. 0,3 s Pause (F, Messung 31.10.).</li><li>Bild und Ton der Konkurrenz habe ich nicht.</li></ul> |
| Deine Nachrichten | Anweisungen, Screenshots, Links | Links zu TikTok-Videos kann ich nur als Seite lesen, nicht ansehen. |
| ElevenLabs | Sprechen mit fester Stimme | Der Key hat kein Leserecht. Deshalb sehe ich weder den Credit-Stand noch die Stimmen-Bibliothek. |

**Werkzeuge:**
- Dateien und Shell im Container
- Websuche
- Sub-Agenten (eigene Claude-Instanzen für große Teilaufträge)
- Dateiversand an dich
- geplante Aufgaben (Trend-Radar jeden Morgen)

### 3.2 Was mir fehlt

| Lücke | Folge |
|---|---|
| Ich höre nicht und sehe keine Bewegung | Tonfall, Rhythmus, Bewegungsfluss und „wirkt hochwertig“ erkenne ich nur über Messwerte und Standbilder. |
| Kein Bild und Ton der Vorbilder | Ich kann Schnittfrequenz, Bildwechsel, Musik und Kamerabewegung der Konkurrenz nicht messen. |
| Keine TikTok-Analytics | Wo Zuschauer abspringen, weiß niemand. Alle Qualitätsurteile sind bisher Vermutung. |
| Keine Grafikkarte in der Cloud | Software-Rendern dauert ca. 50 Min. pro Video (der Iso-Stil ist schneller). Jede Bildkorrektur kostet deshalb ca. 1 Std. und begrenzt die Zahl der Feinschliff-Runden. |
| Begrenztes Gesprächsgedächtnis | Diese Sitzung wurde 3-mal zusammengefasst, weil das Gedächtnis voll war (F, Sitzungsprotokoll). Danach arbeite ich mit einer Zusammenfassung plus den Repo-Dateien. Feinheiten aus dem Chat gehen verloren, wenn sie nicht in einer Datei stehen. |

---

## 4. Wie ein Video entsteht

| # | Schritt | Womit | Ergebnis | Zeit (S) |
|---|---|---|---|---|
| 1 | Startsignal | du | – | – |
| 2 | Thema und Stil wählen, Konkurrenz-Check | `data/plan/30-tage.csv`, Stil-Katalog `docs/10`, öffentliche TikTok-Suche | Thema, Stil | 10 Min. |
| 3 | Recherche | Websuche, Quellen landen in `skript.json` | Faktenbasis | 15–30 Min. |
| 4 | Rechnung bzw. Simulation | Code mit Tests in `pipeline/sim/`, z. B. 100 Läufe | `sim_ergebnisse.md` | 30–90 Min. |
| 5 | Skript | `skript.json`: Abschnitte, `text` für die Untertitel, `sprechtext` für die Aussprache | Skript | 20 Min. |
| 6 | Stimme | `pipeline/tts.py`, ganzes Skript am Stück, Wortzeiten | `stimme.mp3`, `timing.json` | 5 Min., ca. 1.250–1.400 Credits |
| 7 | Szene | `szene.js` im gewählten Stil. Alle Animationen hängen an den Wortzeiten. Beim ersten Einsatz eines Stils entsteht ein neuer Baukasten. | Szene | 1–2 Std., bei neuem Stil zusätzlich 3–6 Std. |
| 8 | Probebilder | Standbilder an Schlüsselstellen ansehen und korrigieren | – | 20–40 Min. |
| 9 | Rendern und Ton | `render.js`, `mux.sh` (−14 LUFS) | MP4 | ca. 50 Min. in der Cloud |
| 10 | Abnahme | Checkliste in Abschnitt 5 | – | 15–30 Min. |
| 11 | Übergabe | MP4 und Caption an dich | – | – |
| 12 | Sichern | STATUS, Commit, Push | – | 5 Min. |

**Wer die Arbeit macht:**
- Große Bauaufträge gebe ich mit schriftlichem Auftrag an Sub-Agenten und nehme das Ergebnis danach ab.
- Bisher waren es 14 Agenten (F, Sitzungsprotokoll):
  - Render-Engine und Szenen mit Opus
  - Recherche, Ideen, Reißverschluss-Simulation und 30-Tage-Plan mit Sonnet
  - Das Spurwechsel-Video hat ein Agent komplett gebaut, vom Auftrag (19:12 Uhr) bis zum fertigen Video (20:34 Uhr).
- Der Trend-Radar läuft getrennt davon jeden Morgen um 05:35 Uhr in einer eigenen Sitzung.

**Risiko dabei:** Ein Agent kennt nur meinen Auftrag und das Repo, nicht unser Gespräch. Was dort fehlt, fehlt ihm auch.

---

## 5. Was meine Abnahme prüft und was nicht

| Prüfe ich (messbar) | Wie |
|---|---|
| Länge ≥ 61 s | ffprobe |
| Lautheit −14 LUFS | ffmpeg ebur128 |
| Stimme synchron zum Bild | Kreuzkorrelation, zuletzt 4 ms Versatz |
| Untertitel innerhalb der Breite und der sicheren Zonen | Messskript für jeden Untertitelblock, höchstens 876 px |
| Nie zwei Untertitelblöcke gleichzeitig | Zeitprüfung |
| Zahlen im Bild = Sprechtext = Simulation | Abgleich mit `sim_ergebnisse.md` |
| Hook-Zahl in den ersten 3 s, fester Schlusssatz | Wortzeiten in `timing.json` |
| Fehlerbilder (Überlappungen, leere Bilder, abgeschnittene Texte) | Kontaktbogen: ein Bild alle paar Sekunden, dazu Einzelbilder |

**Prüfe ich nicht bzw. nur indirekt:**
- Klang, Tonfall und Rhythmus der Stimme
- Bewegungsfluss und Tempo der Bildwechsel
- Spannung, Humor, Aha-Moment
- „Würde ich nach 3 Sekunden weiterwischen?“
- Vergleich mit einem konkreten Vorbild-Video
- Glaubwürdigkeit des Bildes. Beispiel: Der Stau im Spurwechsel-Video wirkt locker. Das habe ich erst bei der Abnahme bemerkt, nicht beim Bau.

---

## 6. Was bisher schiefging und warum

| Problem | Ursache | Was sich geändert hat |
|---|---|---|
| Stimme in 6 Fassungen (zfc8, Daniel, wieder zfc8, Ben als Montage, Ben am Stück, Ben am Stück mit Pausen) | <ul><li>Ich habe auf Synchronität optimiert statt auf Hörwirkung.</li><li>Die Segment-Montage hatte harte Schnitte.</li><li>Ich höre nicht selbst.</li></ul> | Die Stimme spricht jetzt am Stück, mit Pausen nach Sätzen und Abschnitten. |
| Untertitel-Kasten gefiel dir nicht | Ich habe ohne Auswahl für dich entschieden. | Neuer Stil nach deiner Vorgabe. **Lehre:** Neue Gestaltung zeige ich vorher als 2–3 Probebilder. |
| Reißverschluss umsonst produziert | Ein Konkurrent hat am selben Tag gepostet. Ein Check direkt vor dem Produktionsstart fehlte im Ablauf. | Der Konkurrenz-Check ist jetzt Schritt 2. |
| Captions zu lang, mit Quellen und Hinweisen | Ich habe Vorsicht über Reichweite gestellt, obwohl nichts davon Pflicht ist. | Festes Kurzformat in CLAUDE.md |
| Stau wirkt locker | Die Simulation ist realistisch gerechnet, die Bildwirkung wurde nicht eigens geprüft. | offen: Entscheidung in Abschnitt 9, Punkt 3 |
| Untertitel ragten kurz in den rechten Rand | Das Prüfskript hat nur fertige Zeilen gemessen, nicht das Aufbauen. | Engine korrigiert, gilt ab dem nächsten Video |
| Alte „1.000 Lebensläufe“-Regel im Radar | Die Regel wurde in einer Datei geändert, in einer anderen nicht. | Radar-Anleitung korrigiert. Die Regeldateien sind aufgeräumt (Abschnitt 7). |
| Datum „01.11.“ statt 31.10. | eigener Fehler | korrigiert |

---

## 7. Widersprüche in den Regeldateien (gefunden und korrigiert am 31.10.)

Jeder Widerspruch ist ein Risiko: Ich oder ein Agent könnten der alten Regel folgen.

| Datei | Alte Aussage | Korrigiert zu |
|---|---|---|
| `CLAUDE.md`, Technik | „TikTok-CDN-Domains (Videos, Transkripte) sind gesperrt“ | Automatische Untertitel waren am 31.10. abrufbar. Video- und Tondateien lädt Claude nicht herunter. Für eine Bild- und Tonanalyse braucht Claude die Datei von dir. |
| `docs/12`, Kurzfazit | „Stil offen … die Entscheidung fehlt noch“ | entschieden: Der Stil wechselt je Thema. |
| `docs/08` | Sprechtempo 2,4 Wörter/s (A); „Offen: Stimme“ | Ben spricht ca. 2,6 Wörter/s, die Stimme ist entschieden. |
| `ENTSCHEIDUNGEN.md`, Zeilen 26–27 | Daniel bzw. zfc8 als Standardstimme | als überholt markiert (heute gilt Ben, Zeile 33) |
| `STATUS.md` | Schritt 1 „beide Videos (Version 2) posten“, alter Absatz zu Version 2 | GTA 6 Version 3 und Spurwechsel posten. Reißverschluss wird nicht gepostet. |

---

## 8. Wie du mich am besten steuerst

1. **Feedback konkret, mit Sekunde.** Vorlage zum Kopieren:
   ```
   Video: Spurwechsel
   Gesamt (1–10):
   Nach 3 Sekunden weitergewischt? ja / nein
   Stimme (1–10):    Bild (1–10):    Tempo (1–10):    Untertitel (1–10):    Thema/Story (1–10):
   Was stört (Sekunde + was):
   - 0:15 Stau wirkt leer
   - 
   So soll es sein (gern mit Vorbild-Video):
   ```
2. **Einen Maßstab hochladen.**
   - Lade 2–3 Konkurrenz-Videos, die du richtig gut findest, als MP4 direkt hier im Chat hoch (TikTok: Teilen → „Video speichern“; geht das nicht, eine Bildschirmaufnahme).
   - Dann messe ich Schnittfrequenz, Bildwechsel pro 10 s, Textmenge, Stimme, Musik und Lautheit.
   - Nur zur internen Analyse. Nichts davon kommt in unsere Videos.
3. **Regeln festnageln.** Sag „nimm das in die Regeln auf“. Dann trage ich es in `CLAUDE.md` bzw. `ENTSCHEIDUNGEN.md` ein, und es gilt auch für Agenten und künftige Sitzungen.
4. **Neue Gestaltung vorher sehen.** Bei neuen Stilen oder Elementen schicke ich dir zuerst 2–3 Probebilder, bevor ich rendere.

---

## 9. Meine Empfehlung als Mentor

1. **Maßstab statt Gefühl.**
   - Aus deinen 2–3 Vorbild-Videos baue ich eine Bewertungskarte mit 8 Kriterien: Hook, Bildwechsel pro 10 s, Textmenge, Stimme, Tempo, Aha-Moment, Schluss, Optik.
   - Jedes Video muss vor der Übergabe in jedem Kriterium mindestens gleichauf sein.
   - Die Bewertung bekommst du mit dem Video.
2. **Weniger Stile, dafür ausgereift.** Hier widerspreche ich deiner Entscheidung vom 31.10.:
   - 8 wechselnde Stile bedeuten in den ersten Wochen 8 Erstversuche. Ein Erstversuch ist nie so gut wie die dritte Fassung.
   - Ob die erfolgreichen Vorbilder einen festen Look nutzen, kann ich ohne ihr Bildmaterial nicht belegen (A). Mit deinen Vorbild-Videos aus Abschnitt 8 messe ich das nach.
   - **Vorschlag:** Bis zur Auswertung am 15.11. nutzen wir nur 3 Stile, jeden nach deinem Feedback geschliffen:
     - Low-Poly für Verkehr und Menschenmengen
     - Isometrie für Abläufe
     - Flat-Infografik bzw. Duell-Tafel für GELD
   - Danach kommt jede Woche ein neuer Stil dazu.
   - Die Abwechslung bleibt, die Qualität steigt (S).
3. **Das Bild darf zuspitzen, die Zahlen nicht.**
   - Vorschlag für eine neue Regel: Die Rechnung bleibt exakt. Die Darstellung darf verdichten (z. B. einen dichteren Stau zeigen), solange sie nichts Falsches behauptet.
   - Das hätte das Spurwechsel-Problem verhindert.
4. **Probebilder und Hörprobe vor dem Vollrender** (nur in den ersten 2 Wochen):
   - Du bekommst 4 Standbilder und die ersten 15 s Ton. Das kostet dich ca. 2 Min. pro Video und spart Renderrunden.
5. **Posten und lernen.**
   - Nach 10 geposteten Videos zeigen echte Daten (Wiedergabedauer, Absprung bei Sekunde X) mehr als jede Abnahme.
   - GTA 6 und Spurwechsel posten wir, sobald dein Feedback eingearbeitet ist.

---

## 10. Nächste Schritte

| # | Schritt | Wer | Zeit (S) |
|---|---|---|---|
| 1 | Beide Videos mit der Vorlage aus Abschnitt 8 bewerten | du | 10 Min. |
| 2 | 2–3 Vorbild-Videos als Datei hochladen | du | 10 Min. |
| 3 | Entscheiden: 3 statt 8 Stile? Darf das Bild zuspitzen? Probebilder vor dem Rendern? | du | 5 Min. |
| 4 | Bewertungskarte aus den Vorbildern bauen, unsere 2 Videos daran messen | Claude | ca. 2 Std. |
| 5 | GTA 6 und Spurwechsel nach Feedback und Bewertungskarte nachbessern | Claude | 1–3 Std. |
| 6 | Neue Regeln in `CLAUDE.md` und `ENTSCHEIDUNGEN.md` eintragen | Claude | 15 Min. |

## 11. Offene Punkte

- **Was genau stört dich?** Thema bzw. Story, Bild bzw. Optik, Stimme, Tempo, Untertitel oder der Ablauf (zu viele Runden, zu langsam)? Das entscheidet, wo ich zuerst ansetze.
- **ElevenLabs-Credits:** Am 31.10. gingen viele Credits für Proben und Neuvertonungen drauf. Ich kann den Stand nicht sehen. Bitte kurz in deinem Konto prüfen.
- **Rendern auf dem Windows-PC mit Grafikkarte** würde jede Korrekturrunde von ca. 1 Std. auf wenige Minuten verkürzen (S). Einrichtung ca. 30 Min. (`pipeline/README.md`).
