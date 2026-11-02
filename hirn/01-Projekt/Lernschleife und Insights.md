---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: Entscheidung des Inhabers 02.11.2026 (spätabends), Buffer-API (geprüft 02.11.)
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
Damit Claude die Kurve trotzdem nutzen kann: wöchentlich ein Screenshot oder Export aus TikTok Studio (Retention), optional.

**Verzögerung:** Buffer aktualisiert Kennzahlen nur alle paar Stunden (Stand 02.11.: Mittagsvideo 18:15 UTC aktualisiert, die Abendvideos noch nicht). Deshalb wertet der 20:00-Lauf **das Mittagsvideo von heute und beide Videos von gestern** aus; das Abendvideo von heute kommt am Folgetag dazu.

## Was ausgewertet wird
1. **Je Video:** Aufrufe, Likes, Kommentare, Shares, Saves, Ø-Wiedergabezeit und Anteil der Länge, Follower-Zuwachs.
2. **Warum?** Verknüpfung mit dem Skript und der Umsetzung (`skript.json`, Feld `lern_notizen`): Hook-Formulierung, Thema und Frage, Länge, Tempo, Stil bzw. Welt, Animationen, Zoom, Licht, Effekte mit Zeitpunkt, Zeitraffer, Caption.
3. **Vergleich** innerhalb des Kontos (nicht zwischen den Konten): was funktioniert besser als der eigene Median, was fällt ab.
4. **Muster statt Einzelfall:** nicht „dieses Thema“, sondern „diese Art der Frage“, „dieser Skript-Aufbau“, „dieses Design/diese Animation“.
5. **Vorsicht bei kleinen Zahlen:** unter ca. 5 Videos oder 1.000 Aufrufen sind Aussagen nur **A** (Annahme), nicht **F**.

## Wohin das Wissen fließt
| Was | Wo |
|---|---|
| Lernstand je Account (kurzer Text) | Datenbank des Ideen-Studios (`stand/lernstand-acc1`, `stand/lernstand-acc2`), wird in jeden Befehl an Claude Chat eingebaut |
| Auswertungen mit Zahlen | Notizen `04-Recherche/Insights JJJJ-MM-TT` (je Tag oder Woche) |
| Offene Vorschläge | Datenbank (`stand/vorschlaege`) und Eintrag in [[Stand und nächste Schritte]] |
| freigegebene Änderungen | zuerst Heimat-Notiz, dann [[Entscheidungen Log]], dann Skill/Befehl |

## Regeln
- Claude schreibt dem Inhaber **keine** täglichen Zahlenberichte, sondern nur Vorschläge mit Begründung.
- Jeder Vorschlag nennt den Gedankengang (Messung → Schluss → Änderung) und ist **anklickbar** zu beantworten (Annehmen / Ablehnen / eigener Kommentar).
- Zahlen sind **F** nur mit Quelle und Stand; Kausalität nie behaupten, nur „spricht dafür“.

## Siehe auch
[[Claude-Chat-Workflow]] · [[Regelwerk]] · [[Technik und Umgebung]] · [[Index]]
