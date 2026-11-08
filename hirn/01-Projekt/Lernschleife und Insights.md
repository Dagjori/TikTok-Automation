---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-08
quelle: Entscheidung des Inhabers 02.11.2026 (spätabends), Buffer-API (geprüft 02.11.); Zielgröße und Tests: Wahl des Inhabers 08.11.2026
tags: [konto/gemeinsam, lernschleife, insights, buffer]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Lernschleife und Insights

**Entscheidung 02.11. (Inhaber):** Claude liest täglich die Zahlen beider Accounts, wertet sie **still** aus (ohne dem Inhaber jedes Mal Zahlen zu schicken), lernt daraus und schlägt Verbesserungen vor. Der Inhaber segnet jede Änderung ab.

## Takt
- **Täglich 20:00 Uhr (Berlin)** läuft die Auswertung als eigene geplante Aufgabe (Sonnet, ca. 15 Min.).
- Ergebnis: aktualisierter **Lernstand** (Notizen im Hirn und Datenbank des Ideen-Studios) und eine **Vorschlagsliste**.
- Die Vorschläge legt Claude dem Inhaber bei der nächsten Sitzung **anklickbar** vor (Auswahl + Kommentarfeld), jeweils mit Begründung: Was wurde gemessen, woraus folgt der Vorschlag, was soll sich ändern, welches Risiko. **Ohne Freigabe ändert sich keine Regel und kein Befehl.**

## Datenquellen (geprüft 02.11., **F**)
**Buffer** liefert je Post (Schnittstelle `post.metrics`): Aufrufe (`views`), Likes/Reaktionen, Kommentare, `engagementRate`, **durchschnittliche Wiedergabezeit** (`averageTimeWatched`), Gesamt-Wiedergabezeit (`totalTimeWatched`), Follower-Zuwachs (`follows`); `shares`, `saves`, `reach`, `viewers` kommen für TikTok derzeit als 0 (ob echt oder nicht geliefert: ungeklärt, **A**).
**Öffentliche TikTok-Videoseite** (wie in `--nachpruefen`): Aufrufe, Likes, Kommentare, Shares, Saves, Dauer.

| Wunsch des Inhabers | Verfügbar? |
|---|---|
| Aufrufe, Likes, Kommentare, Interaktionen | ja (Buffer + Videoseite) |
| durchschnittliche Wiedergabezeit | ja (Buffer); daraus Anteil der Länge (z. B. 25,7 s von 66 s ≈ 39 %) |
| Shares, Saves | ja über die öffentliche Videoseite |
| **Sekunde, bei der weggescrollt wird (Kurve)** | **nein**, nur in TikTok Studio |
| **Anteil, der bis zum Ende schaut** | nur grob aus Ø-Zeit; genau nur in TikTok Studio |
Damit Claude die Kurve trotzdem nutzen kann: wöchentlich ein Screenshot oder Export aus TikTok Studio (Retention), ~~optional~~ **seit 08.11. Pflicht, siehe Zielgröße**.

**Befund 07.11. (F):** Das Buffer-Feld `follows` ist in 0 von 144 Datenzeilen gefüllt, `saves` ebenso. Profilaufrufe, Herkunft der Aufrufe, Sekunden-Kurve und Zuschauerländer fehlen ganz ([[Wachstum auf 10.000 Follower]]).

## Zielgröße: neue Follower je Video (seit 08.11.2026, Wahl des Inhabers)
Follower = Aufrufe × Follows je 1.000 Aufrufe. Ohne diese Zahl optimiert die Schleife nur auf die Wiedergabezeit (eine Ersatzgröße), und Tests wie der Folgen-Hinweis bleiben blind.
| Quelle | Was | Wer, wann |
|---|---|---|
| **Cockpit, automatisch** | Follower-Zuwachs in den **24 Stunden nach jedem Post** aus dem Follower-Verlauf (`cockpit/daten/zahlen/`), je Account. Grob und netto (Entfolgungen eingerechnet, zwei Posts am Tag überlappen), aber sofort da. Dazu **Aufrufe nach 24 h** (stündliche Momentaufnahmen, für ältere Videos geschätzt aus der täglichen `data/insights/metriken.csv`) und **Follows je 1.000**. | **Umgesetzt 08.11.** (`cockpit/lib/treffer.mjs`): Zahlen-Seite mit den Spalten „+👥 24 h“, „je 1.000“, „× Median“ (~ = geschätzt), Datei `cockpit/daten/zahlen/folgen24.json` für die Lernschleife. Wirkt nach dem nächsten Cockpit-Neustart (♻). Das Ziel „1 Follower je 1.000 Views“ rechnet mit dem echten Follower-Zuwachs seit dem Start, weil die Summe der 24-h-Werte doppelt zählt. |
| **TikTok Studio, von Hand** | je Video: **neue Follower, Profilaufrufe, Herkunft der Aufrufe** (Für dich, Suche, Profil, Folge ich), **Sekunden-Kurve**, Zuschauerländer (für das CRP zählen AT und CH nicht) | Inhaber **einmal pro Woche, ca. 15 Min.**, als Screenshot oder Export; Claude überträgt. Keine Bots in TikTok Studio ([[Plattformregeln und Posting]]) |
| **Treffer-Meldung** | Video mit ≥ 3× Median der letzten 10 Videos nach 24 h → Idee „Teil 2“ ([[Serien und Treffer-Folgen]]) | **Cockpit, automatisch** (seit 08.11., bei jedem Zahlen-Abruf): Meldung im Cockpit und Idee „Teil N“ bei den Ideen des nächsten freien Video-Tags |
- **Bewertung:** ein Video erst nach **7 Tagen** endgültig (96 % der Aufrufe fallen in 10 Tagen an, **F**). **Regeländerungen nur aus Blöcken von mindestens 10 Videos** (die Streuung ist riesig: das 90. Perzentil liegt beim 7- bis 31-Fachen des Medians, **F**). Einzelvideos sind Beobachtungen (**A**).
- Ziele, an denen gemessen wird: [[Kanäle und Ziele]] › Ziele.

**Verzögerung:** Buffer aktualisiert Kennzahlen nur alle paar Stunden (Stand 02.11.: Mittagsvideo 18:15 UTC aktualisiert, die Abendvideos noch nicht). Deshalb wertet der 20:00-Lauf **das Mittagsvideo von heute und beide Videos von gestern** aus; das Abendvideo von heute kommt am Folgetag dazu.

## Was ausgewertet wird
1. **Je Video:** Aufrufe, Likes, Kommentare, Shares, Saves, Ø-Wiedergabezeit und Anteil der Länge, **neue Follower und Follows je 1.000 Aufrufe** (Zielgröße, siehe oben), Profilaufrufe, Herkunft der Aufrufe.
2. **Warum?** Verknüpfung mit dem Skript und der Umsetzung (`skript.json`, Feld `lern_notizen`): Hook-Formulierung, Thema und Frage, Länge, Tempo, Stil bzw. Welt, Animationen, Zoom, Licht, Effekte mit Zeitpunkt, Zeitraffer, Caption.
3. **Vergleich** innerhalb des Kontos (nicht zwischen den Konten): was funktioniert besser als der eigene Median, was fällt ab.
4. **Muster statt Einzelfall:** nicht „dieses Thema“, sondern „diese Art der Frage“, „dieser Skript-Aufbau“, „dieses Design/diese Animation“.
5. **Vorsicht bei kleinen Zahlen:** unter ca. 5 Videos oder 1.000 Aufrufen sind Aussagen nur **A** (Annahme), nicht **F**. Eine **Regeländerung** braucht seit 08.11. einen Block von mindestens 10 Videos.

## Wohin das Wissen fließt
| Was | Wo |
|---|---|
| Lernstand je Account (kurzer Text) | Datenbank des Ideen-Studios (`stand/lernstand-acc1`, `stand/lernstand-acc2`), wird in jeden Befehl an Claude Chat eingebaut |
| Auswertungen mit Zahlen | Notizen `04-Recherche/Insights JJJJ-MM-TT` (je Tag oder Woche) |
| Offene Vorschläge | Datenbank (`stand/vorschlaege`) und Eintrag in [[Stand und nächste Schritte]] |
| freigegebene Änderungen | zuerst Heimat-Notiz, dann [[Entscheidungen Log]], dann Skill/Befehl |

## Laufende Tests (seit 07.11.2026, aus der Freigabe der REA-Regelwerke)
| Test | Konto | Vergleich | Grund |
|---|---|---|---|
| Folgen-Hinweis am Ende (seit 08.11., ersetzt den Aufruf bei ca. 20 s) | beide, je Account getrennt | abwechselnd **Blöcke von 10 Videos mit Hinweis gegen 10 ohne**: Follows je 1.000 Aufrufe und Anteil der Länge; Hinweis als Text in den letzten Sekunden, an Inhalt gebunden ([[Regelwerk Simulierbar]], [[Regelwerk Account 2]]). **Start Video-Tag 10.11.2026 mit 10 „mit“** (Wahl des Inhabers 08.11.); Zuordnung je Video mit `tools/testblock.py`, Plan `data/tests/testbloecke.json`, steht in `skript.json → testbloecke` | Wirkung in keiner Studie gemessen; Follows je Video misst das Cockpit seit 08.11. (nach Neustart) |
| Einstieg Account 2 (seit 08.11.) | stelldirvor | Blöcke zu je 5 Videos: (a) Ereignis bei 2–3 s, (b) zweite sichtbare Stufe bei 12–15 s, (c) 62–70 s gegen 80 s; gemessen am Anteil der Länge und an der Ø-Zeit ([[Regelwerk Account 2]]). **Jeder Block ändert nur seine eine Sache gegenüber dem Standard** (Wahl des Inhabers 08.11.), Start Video-Tag 10.11.2026, danach wieder Standard; Zuordnung wie beim Folgen-Hinweis | Zuschauer gehen nach 10–17 s, Anteil 13–18 % trotz dichterer Einstiege ([[Wachstum auf 10.000 Follower]]) |
| Hell gegen dunkel | Simulierbar | helle Stile (1, 2, 6, 10, 14) gegen dunkle Welten mit Leuchtakzenten: Ø-Zeit, Anteil der Länge | dunkle Stile haben Vorrang, die eigenen Zahlen vom 05.11. (Stil 18) sprechen teils dagegen |
| Später Endstand | Simulierbar | Anteil der Länge vor und nach der Umstellung auf den Endstand bei ca. 80 % | REA: Auflösung bei 80 % gegen 57 % bei den schwachen |
| Frühes Ereignis | stelldirvor | Ø-Wiedergabezeit vor (9–15 s) und nach der Umstellung auf das Ereignis bei ca. 8 s | REA und Lernschleife 03.11. |
| Ungewöhnliche Themen | beide | Aufrufe, Ø-Zeit und Follows je 1.000 der Ideen nach den Originalitätsregeln gegen die Klassiker, je Themenfeld getrennt; seit 08.11. bei Simulierbar Klassiker mit eigenem Blickwinkel bis 3 von 10 | Entscheidung 07.11. ([[Originalität und Themenfindung]]): Klassiker liefen bisher am besten, sind aber auf Deutsch schon gemacht; der einzige Treffer war ein Klassiker |
| Stitch „Ich hab's durchgerechnet“ (seit 08.11.) | Simulierbar | 4–6 Stitches gegen normale Videos: Follows je 1.000 Aufrufe | [[Kommentare Antwort-Videos und Stitch]] |
Aussagen erst ab ca. 5 Videos je Gruppe, vorher nur als Beobachtung (A); Regeländerungen erst aus Blöcken von 10.

## Regeln
- Claude schreibt dem Inhaber **keine** täglichen Zahlenberichte, sondern nur Vorschläge mit Begründung.
- Jeder Vorschlag nennt den Gedankengang (Messung → Schluss → Änderung) und ist **anklickbar** zu beantworten (Annehmen / Ablehnen / eigener Kommentar).
- Zahlen sind **F** nur mit Quelle und Stand; Kausalität nie behaupten, nur „spricht dafür“.

## Siehe auch
[[Claude-Chat-Workflow]] · [[Regelwerk]] · [[Technik und Umgebung]] · [[Wachstum auf 10.000 Follower]] · [[Index]]
