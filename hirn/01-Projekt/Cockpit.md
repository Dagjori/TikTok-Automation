---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-09
quelle: cockpit/README.md
tags: [konto/gemeinsam, cockpit, freigabe, automatik]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Cockpit

Das Cockpit ist seit 07.11.2026 ein **lokales Programm im Regie-Design** auf Laptop und Desktop-PC. Von dort wählt der Inhaber Ideen, gibt Skripte frei und sieht jede laufende Aufgabe. Vollständige Beschreibung: `cockpit/README.md`.

**Design seit 10.11.2026 (Fassung 2, „Sendezentrale“):** Türkis steht für Simulierbar, Violett für Stell dir vor ([[Farbcode]]), Rot nur noch für Fehler, Blau für Claude und Automatik. „Jetzt“ zeigt oben groß, was läuft, bzw. die Zeit bis zum nächsten Posting, daneben „Für dich“, darunter den Sendeplan mit einer Karte je Video. Weiter ohne 3D-Engine, damit der Rechner beim Rendern nicht überlastet.

> **Abgelöst:** Die frühere Beschreibung dieser Notiz (Claude-Artifact mit 120 Planthemen, Sammlung `videos` in ArtifactData, Freigabe per Kommentar an Claude; Stand 02.11.) gilt nicht mehr. Die 120 Planthemen sind Archiv ([[Pläne und Kalender]]).

## Start und Aufbau
- **Start:** Desktop-Verknüpfung „TikTok Cockpit“ oder Strg+Alt+T; ohne Verknüpfung `node cockpit/starten.mjs`. Der Server läuft nur lokal und bleibt aktiv, bis im Cockpit auf ⏻ geklickt wird.
- **Aufbau:** links die Seitenleiste mit sechs Bereichen, rechts Claude einklappbar, unten links Meldungen, Automatik, Neustart und Beenden.

| Bereich | Inhalt |
|---|---|
| **Jetzt** | jede laufende Aufgabe als Live-Karte, dazu „Für dich“ (was auf den Inhaber wartet), Tagesplan heute und morgen, Aktivität, Konten |
| **Studio** | Ideen erzeugen und wählen, Skripte lesen, freigeben, neu schreiben lassen |
| **Produktion** | Live-Render, Produktionskette, Videos von heute und morgen, Render-Aufträge, Render-Dienst |
| **Zahlen** | Konten, Ziele bis zum CRP, jedes Video |
| **Lernen** | Lernschleife, Vorschläge, Lernstand |
| **Radar** | offene Trend-Vorschläge |

## Die vier Automatiken (Entscheidung 07.11.)
Die Freigabe der Skripte bleibt immer beim Inhaber.

| Automatik | Was sie tut |
|---|---|
| **Ideen jeden Morgen** | täglich ab der eingestellten Uhrzeit (Standard 07:00) Ideen für morgen in beiden Accounts; holt nach, wenn das Cockpit später startet |
| **Recherche nach Wahl** | sind die Ideen eines Kontos gewählt, startet Recherche und Skript nach kurzer Wartezeit |
| **Produktion nach Freigabe** | sind alle Skripte eines Tages freigegeben, startet die Produktion nach 60 s |
| **Fehler einmal wiederholen** | Recherche, Nachprüfung oder Produktion nach 5 Min. einmal erneut; scheitert es wieder, kommt eine Meldung |

Welche Skills dabei laufen: [[Pipeline und Skills]]. Tagesablauf: [[Claude-Chat-Workflow]].

## Weitere feste Punkte
- **Zwei Rechner:** Laptop und Desktop-PC zeigen dasselbe Cockpit; Ideen, Skripte, Vorschläge, Meldungen und Einstellungen gleichen sich ab.
- **Produktion:** je Video-Tag eine Produktions-Sitzung mit **Sonnet 5.5** (feste Regel seit 08.11.); Opus nur als Agent für einen Neubau ([[Produktion Rhythmus und Modelle]]). Ca. 20 Min. nach der Posting-Zeit startet die Nachprüfung von selbst.
- **Schlüssel** bekommt Claude nie: Stimme, Render und Buffer laufen über `cockpit/werkzeuge/mit_schluessel.mjs` ([[Arbeitsregeln und Sicherheit]]).
- **Zahlen und Treffer:** Follower-Zuwachs 24 h je Video; ab 3× Median legt das Cockpit die Idee „Teil N“ an ([[Serien und Treffer-Folgen]]).
- **Lernen:** täglich 19:52, Vorschläge nur mit Freigabe ([[Lernschleife und Insights]]).
- **Testen:** nie gegen das laufende Cockpit, nur mit einer zweiten Instanz und eigener Datenkopie (`cockpit/README.md`, „Testen ohne Risiko“).

## Siehe auch
[[Pipeline und Skills]] · [[Claude-Chat-Workflow]] · [[Render-Dienst Windows-PC]] · [[Stand und nächste Schritte]] · [[Index]]
