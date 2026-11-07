---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: Entscheidungen des Inhabers 02.11.2026 (spätabends), docs/automatik/tages-sitzung.md, tools/chat_befehle.py
tags: [konto/gemeinsam, workflow, claude-chat, ideen, skript, ideen-studio]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Tagesablauf: Ideen-Studio und Claude Code

**Entscheidungen 02.11. (Inhaber):** Kein 30-Tage-Plan. Jeden Tag entstehen die Themen neu im **Ideen-Studio** (Artifact https://claude.ai/artifact/PMqMpqpmSHYmuhY229ghZC). **Claude Code recherchiert mit Websuche und schreibt die Skripte** (Wahl per Klick: „Claude Code recherchiert“), die Ideen entstehen auf Klick im Studio. Nach der Freigabe startet ein Knopf die Produktion bis zur Buffer-Planung. **Das Studio speichert alles**: Beim erneuten Öffnen sind Ideen, Auswahl, Skripte und der Stand jedes Videos noch da. Ist ein Tag komplett geplant, verschwindet er ins Archiv und der nächste Tag erscheint.

## Rollen
| Wer | Was |
|---|---|
| **Inhaber** | erzeugt je Account 10 Ideen (1 Klick), wählt 2 (Mittag, Abend), prüft die Skripte und gibt frei, klickt „An Claude Code übergeben“ |
| **Claude im Studio** | schreibt die 10 Ideen (ohne Internet, ca. 1 Min., dein claude.ai-Kontingent). **Im lokalen Cockpit seit 07.11. mit Websuche** für die Originalitäts-Prüfung, ca. 3–6 Min.; im alten Studio steht dort „ungeprüft“ ([[Originalität und Themenfindung]]) |
| **Disponent** | eigene Claude-Code-Sitzung („TikTok Disponent (Ideen-Studio)“, Sonnet), beobachtet das Studio; startet bzw. benachrichtigt die Tages-Sitzung, sonst nichts (`docs/automatik/disponent.md`) |
| **Tages-Sitzung von Claude Code** | eine Sitzung je Video-Tag (Opus 5.5, Modus „Auto“): recherchiert jede Zahl, schreibt die Skripte, nach der Übergabe Rechnung, Stimme, Szene, Render auf dem PC, Prüfung, Buffer, Nachprüfung; meldet per Push |
| **Lernschleife** | täglich 20:00, schreibt den Lernstand fort ([[Lernschleife und Insights]]) |

## Ablauf pro Tag
1. **Ideen** (Inhaber, 1 Klick je Account): 10 Ideen. Der Befehl enthält Nische, Rolle, Regeln, bisherige Videos und den **Lernstand**.
2. **Auswahl** (Inhaber, anklicken): Mittag und Abend des Video-Tags. Wird sofort gespeichert.
3. **„Skripte recherchieren lassen“** (Inhaber, 1 Klick): Das Studio legt den Auftrag in die Warteschlange und sendet einen Kommentar an Claude; der Disponent startet die Tages-Sitzung (bzw. schickt ihr den Auftrag, wenn sie schon läuft). Sie recherchiert, rechnet nach und schreibt je ein Skript nach demselben Befehl wie Claude Chat (`python3 tools/chat_befehle.py --skript-auftrag …`). Dauer meist 10–20 Min., **Push**, wenn die Skripte stehen.
4. **Prüfen** (Inhaber): Skript lesen (Quellen als Links, Prüf-Plaketten), dann **Freigeben**, **Neu schreiben lassen** (mit Kommentar) oder **Verwerfen**.
5. **„An Claude Code übergeben“** (Inhaber, 1 Klick, das ist das Startsignal): Dieselbe Sitzung produziert alle freigegebenen Videos des Tags, höchstens 2 Agenten gleichzeitig, rendert auf dem PC, prüft, plant in Buffer. **Push**, wenn alles geplant ist, und bei Problemen.
6. **Nachprüfung** nach der Posting-Zeit (öffentlich, Länge, KI-Label), dann Status „gepostet“.

Den Fortschritt jedes Videos zeigt das Studio live: Status, letzter Schritt, Verlauf, Korrekturen, Sitzungsstatus mit Link zur Sitzung.

## Faktenfehler (Inhaber 02.11.: „korrigieren und weiter“)
Findet Claude Code vor der Produktion eine falsche oder veraltete Zahl, korrigiert er sie mit Quelle, ändert die Aussage nur so weit wie nötig, vermerkt es im Studio (Korrekturen) und produziert weiter. **Kippt das Ergebnis** (anderer Gewinner, andere Antwort auf die Titelfrage, Pointe stimmt nicht mehr), hält dieses Video an: Status „Rückfrage“, Push, Entscheidung im Studio per Klick.

## Anforderungen an jedes Skript
- **Faktentreu:** nichts erfinden; jede Zahl mit Rechenweg, Quelle und Stand; Unbelegtes wird nicht verwendet; Annahmen gekennzeichnet; Quellen nur intern.
- **Diskussionsanreiz nur implizit:** die Sache selbst regt zum Austausch an; nie ausgesprochen, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- **Spannung:** von der ersten Sekunde fangen, kontinuierlich steigern, Dramaturgie-Hinweise für Design und Animation.
- **Account 1:** Regie-Text für Ben ([[Stimme und Ton Simulierbar]]); 150–190 Wörter, flüssig.
- **Account 2:** keine Stimme; Titelfrage, 12–18 kurze Sätze, Faktenzeile, Anzeige-Plan, Welt, Zeitraffer.

## Datenbank des Studios (Kurzform)
`ideen/<acc1|acc2>-JJJJ-MM-TT` (10 Ideen) · `skripte/<acc1|acc2>-JJJJ-MM-TT-<mittag|abend>` (ein Dokument je Video mit Status-Kette gewählt → Recherche → Skript fertig → freigegeben → übergeben → Produktion → geplant → gepostet, dazu Rückfrage und Fehler) · `laeufe/JJJJ-MM-TT` (Sitzung und Status des Tages) · `auftraege/<id>` (Warteschlange für den Disponenten) · `stand/lernstand-…`. Vollständig: `docs/automatik/tages-sitzung.md`.

## Zugänge
| Weg | Wann |
|---|---|
| **Ideen-Studio** (Artifact; Übergabe per Kommentar an Claude → Disponent) | Standard |
| **Claude Chat von Hand** (Befehl aus [[Befehl Ideen und Skripte Simulierbar]] bzw. [[Befehl Ideen und Skripte Account 2]] kopieren, Skripte in eine Claude-Code-Sitzung einfügen) | Notweg, wenn das Studio Claude Code nicht erreicht |

## Grenzen (ehrlich)
- Claude im Studio kann nicht ins Internet; deshalb schreibt Claude Code die Skripte (Websuche im Abo enthalten).
- Der Connector „Claude Code Remote“ ließ sich im Studio nicht erlauben (Dialog zeigte nur „Wiederholen“, 02.11. abends). Deshalb läuft die Übergabe über „Kommentar an Claude senden“: beim ersten Klick fragt claude.ai, ob das Studio Kommentare in deinem Namen senden darf. Einmal erlauben.
- Läuft der Disponent nicht, meldet das Studio „Disponent läuft nicht“ und bietet „Auftrag kopieren“ an.
- Getestet am 02.11.: neue Sitzungen im Modus „Auto“ schreiben ohne Rückfrage ins Studio, Push-Werkzeug vorhanden.
- Alle Sitzungen nutzen dasselbe Nutzungskontingent (am 02.11. stand das Wochenlimit auf „Warnung“).

## Siehe auch
[[Regelwerk]] · [[Produktion Rhythmus und Modelle]] · [[Lernschleife und Insights]] · [[Pläne und Kalender]] (Archiv) · [[Index]]
