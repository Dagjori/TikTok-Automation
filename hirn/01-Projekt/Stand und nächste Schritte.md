---
typ: plan
konto: gemeinsam
status: aktuell
datum: 2026-11-10
quelle: CLAUDE.md §11, Entscheidungen Log, .claude/skills/
tags: [konto/gemeinsam, stand, naechste-schritte]
cssclasses: [konto-gemeinsam, typ-plan]
---

# Stand und nächste Schritte

Die lebende Statusseite: am Ende jeder Arbeitseinheit aktualisieren. **F** = belegt, **S** = Schätzung, **A** = Annahme.

## Stand 09.11.2026
- **Drei Skills in fester Reihenfolge:** `themen-skript` → `stimme-elevenlabs` → `video-produktion`; `rea-video` liefert Regeln, die Lernschleife schließt den Kreis ([[Pipeline und Skills]]).
- **Sprechtempo:** Jede Tempo-, Silben- und Pausenregel ist gestrichen. Das Video folgt der fertigen Stimme; Mindestlänge 61 s und die Ein-Aufnahme-Regel bleiben ([[Stimme ElevenLabs Simulierbar]]).
- **Themen:** Nachfrage und Winkel sind Pflicht; Simulierbar mit vier Formaten (Duell, Zeitverlauf, Was bleibt, Lernvideo) und neuem Skriptaufbau; stelldirvor mit neuen Themenfeldern, Klassiker bleiben gesperrt ([[Themenfindung Simulierbar]], [[Skriptaufbau Simulierbar]], [[Themenfindung stelldirvor]]).
- **Technik:** three.js als Kern, Blender ohne Oberfläche für 1–2 Schlüsselszenen, Remotion nur als Probelauf ([[Technik und Umgebung]]).
- **Hirn:** je Account Abteile `1-Skripterstellung`, `2-Stimme` (nur Simulierbar), `3-Produktion`, `9-Archiv` ([[Index]]).
- Die Änderungen vom 09.11. sind lokal gesichert (Commits `1087c09` und `6db42ef` auf `main`), aber noch nicht zu GitHub hochgeladen; die Ergänzungen vom 10.11. (neue Hirn-Notizen, KI-Kennzeichnung gestrichen) sind noch nicht gesichert.

## Was davor gebaut wurde (Kurzfassung)
| Datum | Was |
|---|---|
| 08.11. | Wachstums-Regeln ([[Wachstum auf 10.000 Follower]]): Zielgröße Follows je Video, Serien nach Treffern, Profil, Antwort-Videos und Stitch, Testblöcke (Folgen-Hinweis, Einstieg Account 2), Cover über Buffer; Modell-Regel (Sonnet baut, Opus nur Neubau); eine Aufnahme je Skript |
| 07.11. | REA-Regelwerke freigegeben; Skill `video-produktion`; Originalitätsregeln; lokales Cockpit im Regie-Design mit vier Automatiken; Desktop-Hirn direkt abgeglichen |
| 02.11. | Account 1 nur Geld, kein 30-Tage-Plan, Lernschleife; erste Videos beider Accounts gepostet |

## Accounts
- **Account 1 `@simulierbar`:** Gepostet seit 31.10. Bisher ein Treffer („Studium oder Ausbildung“). Für einige Stile fehlen noch themenspezifische Objekte und Video-Baukästen (Stile 5, 7–11, 15 bisher nur Demos).
- **Account 2 `@stelldirvor.pov`:** Erstes Video im Referenzformat „Eiszeit Toronto“ am 02.11. **Qualitätslücke:** Schrift, Layout, Abspann und Ton treffen die Referenzen, die 3D-Welt noch nicht ([[Format Account 2 Lunar]]). Natur-Welten entstehen beim Erstbau.

## Infrastruktur
- **Render:** Render-Dienst auf dem PC bzw. als Teil des Cockpits ([[Render-Dienst Windows-PC]]).
- **Cockpit:** lokal, Regie-Design, vier Automatiken ([[Cockpit]]). Radar läuft täglich ([[Trend-Radar]]).
- **Wissensstruktur:** `CLAUDE.md` (kompakt, lädt automatisch), dieses Hirn (Regeln) und die Skills (Ablauf).

## Nächste Schritte
| # | Was | Wer |
|---|---|---|
| 1 | **Erster Video-Tag mit der neuen Kette:** je Account ein Video durch `themen-skript` → (`stimme-elevenlabs`) → `video-produktion`; dabei prüfen, dass Ideen-Karten Nachfrage und Winkel tragen, die Textprüfung „BEREIT“ meldet und genau eine Aufnahme entsteht | Claude, Inhaber wählt und gibt frei |
| 2 | **„Erprobt“-Vermerk in den Skills:** Erstlauf je Account nach `video-produktion` §4 mit Beleg je Prüfpunkt; danach im Skill als „erprobt“ markieren (beide Accounts stehen noch auf „nicht erprobt“) | Claude (beim nächsten Video) |
| 3 | **Blender-Testlauf auswerten** (beauftragt 10.11., Probe-Projekt `pipeline/projekte/_test-blender/`): Aussehen und Rechenzeit je Bild ansehen, dann entscheiden, ob Blender-Schlüsselszenen bleiben. Bleiben sie: klären, wie die Bildfolgen zum rendernden Rechner kommen (sie gehören nicht ins öffentliche Repo, der Render-Dienst holt aber `origin/main`) | Inhaber entscheidet, Claude legt die Messwerte vor |
| 4 | **Remotion-Probelauf** an einem fertigen, geposteten Simulierbar-Projekt: Exportzeit, Bildgleichheit, Untertitel, Lautheit messen; Ergebnis als Vorschlag | Claude |
| 5 | **Aufbau Account 2 prüfen:** drei Beobachtungen aus `themen-skript/stelldirvor.md` §C (letzte 18 s fast ohne Ereignis; Sätze stehen mindestens 3 s, Vorbilder lesen in 1,6–2,5 s; Höhepunkt bei ca. 60 s, mittlere Sehdauer bisher 10–17 s). Nicht umgesetzt; braucht eine Entscheidung bzw. einen Testblock | Inhaber |
| 6 | **Inhaber in der App (einmalig, ca. 20 Min.):** je Account 3 Videos anpinnen, Bio mit Versprechen und Takt, bei Account 2 Stitch und Duett freischalten ([[Profil und Follow-Umwandlung]], [[Kommentare Antwort-Videos und Stitch]]); wöchentlich ca. 15 Min. Zahlen aus TikTok Studio ([[Lernschleife und Insights]]) | Inhaber |
| 7 | **Weitere Vorbild-Videos für die REA** bis zum Minimum 12 starke + 4 schwache je Account ([[REA-Video Methode]]) | Inhaber (hochladen) |
| 8 | **Radar-Sitzung:** Prompt um Account 2 und die Listen „abgenutzt“ erweitern ([[Trend-Radar]]) | Claude (in der Radar-Sitzung) |
| 9 | PC: Autostart und Energieoptionen nach [[Render-Dienst Windows-PC]]; Repo auf privat stellen (erst nach Lesezugang für den PC); Telegram einrichten | Inhaber |
| 10 | `CLAUDE.md` schlanker machen (Verweis auf das Hirn) und an den Stand vom 09.11. angleichen | Claude (nach Auftrag) |
| 11 | **Wahl aus dem ersten Ideenlauf** (Skill `themen-skript`, beauftragt 10.11.): je Account Ideen wählen; danach entstehen die Skripte und daraus die ausgefüllten Beispiele für Ideen-Karte und Skript im Hirn | Inhaber wählt, Claude schreibt |
| 12 | **Video-Register:** entsteht mit dem Cockpit-Ausbau automatisch aus allem, was im Cockpit erstellt wird; Notiz „Video-Register“ im Hirn anlegen und im [[Index]] verlinken, sobald das Cockpit sie schreibt | Claude (Cockpit-Ausbau) |
| 13 | **[[Zahlen 2027 Simulierbar]] nachziehen:** Zeilen mit „geplant“, „offen“ und „nicht belegt“ (Steuertarif, Kindergeld, Beitragsbemessungsgrenzen nach dem Bundesrat, Kinderlosenzuschlag, Sparerpauschbetrag, Aktivrente, Regelbedarf) bei jedem Video mit 2027-Bezug und spätestens im Dezember prüfen | Claude (bei der Skript-Recherche) |
| 14 | **[[Themen-Nachfrage]] wöchentlich fortschreiben** (neuer Datumsblock oben) | Claude (im Ideenlauf) |

## Offene Widersprüche
Keine bekannten. Zuletzt bereinigt am 10.11.2026: **Einstieg Account 2** („ahnungslos“ gegen „dicht“) gilt jetzt als „lebendig, aber ahnungslos“ ([[Regelwerk Account 2]], [[Entscheidungen Log]]).

## Offene Punkte
- [ ] **Laufende Tests** (Folgen-Hinweis am Ende in Blöcken, hell gegen dunkel, später Endstand, frühes Ereignis, Einstieg Account 2 a–c, Stitch-Test): [[Lernschleife und Insights]]; auswertbar erst mit Follows je Video.
- [ ] Teppich-Pegel (−10 dB) und Effekte auf echtem Gerät abnehmen (Inhaber).
- [ ] Werte mit „prüfen“ je Video klären (Liste in [[Finanzregeln Simulierbar]]).
- [ ] Text-Überlappungs-Prüfung (`qc/text_ueberlappung.mjs`, Account 2 `…_pov.mjs`) bei jedem Video; sie prüft HUD-Texte, keine Texturen in der 3D-Szene.
- [ ] Ob ein Impressum-Link in der Bio das CRP stört, ist von TikTok nicht dokumentiert.
- [ ] **Engine-Aufgaben (Opus, Neubau):** Natur-Welten im Baukasten für Account 2 (Küste/Meer, Wald, Wüste, Gebirge, Eis; Wasser, Vegetation, Tiere, Sonnenlauf mit Schatten), echter Kamera-Zoom und Fahrt in `PovKamera`; Video-Baukästen für die Stile 5, 7–11 und 15 (Account 1); Baustein „Statuszeile“ für Account 1.
- [ ] Hinweise 10–12 in `referenz_pov.py` sind nur an wenigen Videos kalibriert (**S**).
- [ ] **Stil 16 (Lunar-POV) bleibt Account 2.** „Alle Stile“ bei Account 1 heißt 1–15 und 17–21.
- [ ] Die „Zutaten des Tages“ nennt der Skill `themen-skript` nicht mehr; klären, ob das Cockpit sie weiter ziehen soll ([[Originalität und Themenfindung]]).
- [ ] Radar-Prompt dauerhaft auf `CLAUDE.md` umstellen (nur in der Radar-Sitzung möglich, optional).

## Siehe auch
[[Pipeline und Skills]] · [[Pläne und Kalender]] · [[Entscheidungen Log]] · [[Index]]
