---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-08
quelle: Wahl des Inhabers 08.11.2026 (per Klick), Recherche [[Wachstum auf 10.000 Follower]], marke/account2/README.md (Bio Account 2)
tags: [konto/gemeinsam, profil, follower, pins, cover]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Profil und Follow-Umwandlung

**Gültig seit 08.11.2026.** Wer ein Video mag, landet oft im Profil und entscheidet dort in Sekunden, ob er folgt. Das Profil ist der zweitgrößte Weg zu unseren Videos (ca. 2 % der Aufrufe, **S**, Anbieter) und bis ca. 10.000 Follower (Playlists) das einzige Schaufenster. Für Bio, Pins und Cover gibt es keine A/B-Tests (**A**); gemessen wird mit der Zielgröße Follows je 1.000 Aufrufe ([[Lernschleife und Insights]]). Der Treffer „Studium oder Ausbildung“ brachte bei 7.721 Aufrufen netto fast keinen Follower (**F**).

## Drei Pins je Account
| Pin | Welches Video | Warum |
|---|---|---|
| 1 | das Video mit der **besten Follow-Rate** (nicht das mit den meisten Aufrufen) | zeigt, was Leute zum Folgen bringt |
| 2 | ein **typisches** Video, das das Versprechen des Accounts klar zeigt | Besucher sehen sofort, was regelmäßig kommt |
| 3 | **Teil 1 der aktuellen Serie** ([[Serien und Treffer-Folgen]]) | führt zu Teil 2 und weiteren Folgen |
- Anpinnen geht nur von Hand in der App (Inhaber, je ca. 1 Minute). Bis eine Follow-Rate gemessen ist, gilt für Pin 1 das Video mit den meisten Shares.
- Duette und Stitches lassen sich nicht anpinnen (**S**, Ratgeber).

## Bio (≤ 80 Zeichen, ohne Kontaktdaten, CRP-Regel „Advertising“)
| Account | Regel | Heute |
|---|---|---|
| `@simulierbar` | konkretes Versprechen + Takt, nur GELD, z. B. „Geld-Duelle durchgerechnet, jeden Tag zwei neue“; Kommentar-Einladung darf bleiben | „Ich simuliere deinen Alltag mit echten Zahlen …“ verspricht noch „Alltag“, obwohl das Format seit 02.11. nur Geld ist → neu formulieren (Inhaber wählt) |
| `@stelldirvor.pov` | Versprechen + Takt, Neugier, kein Kanalname anderer Accounts | „Was wäre, wenn …? Du erlebst es live 🌍⏱️ Dein Szenario? 👇“ (57 Zeichen, gesetzt 01.11., `marke/account2/README.md`) → Takt ergänzen |
Profilbild bleibt das Logo (Account 1 „S-Kurve“, Account 2 „Fragezeichen-Countdown“), nie im Video ([[Trennung der Accounts]]).

## Cover (einheitliches Raster im Profil)
| Account | Cover |
|---|---|
| `@simulierbar` | Titeltafel mit der Duell-Frage und „VS“, groß lesbar |
| `@stelldirvor.pov` | die Titelfrage aus dem ersten Bild |
- Umgesetzt 08.11.: `pipeline/post_buffer.py` setzt das Cover über Buffer als Zeitpunkt im Video (Account 1 bei 1,0 s, Account 2 bei 1,5 s); Details und Grenzen in [[Plattformregeln und Posting]] › Cover. Ältere Videos behalten ihr Standardbild (nur in der App änderbar).

## Alte Shop-Videos (Account 1)
Bleiben öffentlich, weil Markeninhalte sich nicht privat stellen lassen ([[Account Simulierbar Überblick]]). Die drei Pins stehen davor, damit Besucher zuerst das Geld-Format sehen.

## Profil-Check alle zwei Wochen
Bei jeder Zwei-Wochen-Auswertung: Stimmen die drei Pins noch (beste Follow-Rate, typisch, aktuelle Serie)? Passt die Bio zum Format? Sind die Cover einheitlich? Ergebnis als Vorschlag an den Inhaber ([[Lernschleife und Insights]]).

## Siehe auch
[[Serien und Treffer-Folgen]] · [[Kommentare Antwort-Videos und Stitch]] · [[Kanäle und Ziele]] · [[Index]]
