# CLAUDE.md – Projekt TikTok Automation

Lies zu Beginn jeder Sitzung zuerst `STATUS.md` und `ENTSCHEIDUNGEN.md`. Das Projektwissen liegt in `docs/`.

## Projekt in Kürze
- **Nische (gewählt 31.10.2026):** „Der Testlauf – Alltag durchgerechnet“ mit zwei Rubriken: **💶 GELD** (Geldentscheidungen als Simulation von 1.000 Lebensläufen) und **⏱️ ALLTAG** (Strategien in Verkehr, Warteschlangen, Zuhause, Spielen, Sport, simuliert). Details: `docs/05-startnische.md`, Ideen: `data/ideen/geld-duell.csv` und `data/ideen/testlauf.csv`.
- **Format:** gesichtslose 3D- bzw. Daten-Simulationen auf Deutsch, 70–90 s, KI-Stimme, Untertitel.
- **Kanäle:** bestehender TikTok-Account des Inhabers (ca. 3k Follower, früher TikTok-Shop-Affiliate). YouTube Shorts als Zweitverwertung.
- **Ziel:** 10k Follower, Creator Rewards Program (CRP), danach Ausbau (zweite Nische, englische Version).
- **Inhaber:** arbeitet Vollzeit im Hauptjob, Zeit ist knapp. Jeder Schritt muss den größten Hebel pro Stunde haben.

## Kommunikation
- Deutsch, du-Form, direkt und klar. Kurze Fragen kurz beantworten.
- Ausarbeitungen so aufbauen: 1) Kurzfazit/Empfehlung, 2) Begründung, 3) nächste Schritte mit Zeitaufwand, 4) offene Punkte.
- Immer kennzeichnen, was **belegter Fakt (mit Quelle)**, **Schätzung** oder **Annahme** ist.
- Fehlen Infos, die das Ergebnis ändern: vorher gebündelt fragen.
- Aktuelle Themen (Plattformregeln, Preise, Gesetze, Tools) vor der Antwort recherchieren und Quellen nennen. Für TikTok-Regeln gelten TikToks eigene Quellen (Creator Academy, Community Guidelines, Legal-Seiten) vorrangig.
- Eigene Fehler offen korrigieren, mit Originalzitat.

## Arbeitsregeln
- **Nichts ohne Auftrag anlegen.** Keine zusätzlichen Dateien außerhalb dieses Repos, keine Notizen, Webseiten oder Einträge in externen Diensten (Notion, Drive, Gmail usw.), außer der Inhaber verlangt es ausdrücklich.
- **Arbeitsstand gehört in dieses Repo.** Cloud-Sitzungen sind flüchtig: Am Ende jeder Sitzung `STATUS.md` aktualisieren, committen und pushen. Entscheidungen des Inhabers in `ENTSCHEIDUNGEN.md` eintragen (Datum, Entscheidung, Begründung).
- **Trend-Radar:** läuft täglich automatisch (geplante Aufgabe „Trend-Radar Der Testlauf“, 05:35 Uhr Berlin). Ablauf und Bewertungsraster: `docs/07-trend-monitoring.md`. Dem Inhaber nur Trends mit Score ≥ 70 vorschlagen (`docs/trends/vorschlaege.md`).
- **Keine Kopien:** Fremde Videos nie nachbauen. Themen, die ein Konkurrent schon viral gemacht hat, nur mit eigenem Ansatz umsetzen.
- **Keine Geheimnisse ins Repo.** API-Keys (z. B. ElevenLabs) nur über Umgebungsvariablen bzw. `.env`, das in `.gitignore` steht.

## Plattformregeln (verbindlich)
- **Kein Bot-Posting.** Uploads laufen über die Planungsfunktion von TikTok Studio (Web, bis 30 Tage im Voraus) und YouTube Studio. Die TikTok Content Posting API postet ohne Audit nur privat. Die Community Guidelines verbieten „automation tools, scripts … designed to bypass our systems“.
- **Kein Umgehen von Bot-Schutz.** Für Recherche nur öffentliche Seiten abrufen, keine internen TikTok-APIs.
- **Videos:**
  - mindestens 61 s, 1080×1920, eigene Rechnung bzw. Simulation, Quellen nennen
  - Hook in den ersten 3 Sekunden, Auflösung im selben Video
  - keine künstlichen Cliffhanger-Teile (TikTok: Clickbait ist ein CRP-Ausschlussgrund)
- **Kein Kaufaufruf im Video.** TikTok drosselt in TikTok-Shop-Märkten Inhalte, die zum Kauf außerhalb von TikTok führen.
- **Profil:** keine E-Mail und keine Telefonnummer in der Bio (CRP-Kriterium „Advertising“). Das Impressum nur als Link.
- **Kennzeichnung:** KI-Stimme in der Beschreibung nennen. TikTok-KI-Label bei realistisch wirkenden Szenen. Finanzthemen nur als Modellrechnung mit offenen Annahmen und dem Hinweis „keine Anlageberatung“.
- **Keine neuen TikTok-Shop-Videos** auf dem Hauptaccount (Werbevideos sind nicht CRP-fähig).

## Technik
- **Pipeline (geplant):**
  1. Themen-Backlog
  2. Skript und Rechnung als Code mit Tests
  3. Szenen-Spezifikation (JSON)
  4. Three.js-Vorlage
  5. Rendern in Headless-Chrome
  6. Stimme über ElevenLabs (bezahlter Plan)
  7. Mix und Untertitel mit ffmpeg
  8. Qualitätskontrolle
  9. Planung in TikTok Studio und YouTube Studio
- **Referenz:** https://github.com/stochosfrance/lowpoly-reel (MIT).
- **Render-Rechner:** Windows-PC des Inhabers. Die Pipeline muss unter Windows laufen (Node.js, Chrome bzw. Chromium, ffmpeg, Python).
- **Stimme:** ElevenLabs, kleinster bezahlter Plan (Starter). Reichen die Credits nicht, auf den nächstgrößeren Plan wechseln.
- **Modellwahl:**
  - Opus 5.5 für Architektur und neue Szenentypen
  - Sonnet 5.5 für die tägliche Produktion
  - Haiku 5.5 für Titel, Beschreibungen und Hashtags
  - Verbrauch über `/usage` beobachten
- **Netzwerk der Cloud-Umgebung:** `tiktok.com`-Domains sind freigegeben. TikTok-CDN-Domains (Videos, Transkripte) sind gesperrt.
