# Entscheidungen

Hier stehen nur Entscheidungen, die der Inhaber getroffen hat. Empfehlungen, die noch nicht bestätigt sind, stehen als offene Punkte in `STATUS.md`.

| Datum | Entscheidung | Begründung |
|---|---|---|
| 2026-10-30 | Projekt-Zentrale ist dieses GitHub-Repo „tiktok-automation“ | Bleibt dauerhaft erhalten, verbindet Code und Projektwissen, jede neue Sitzung hat sofort den Kontext |
| 2026-10-30 | Bisherige Recherche wird als Projektwissen übernommen (`docs/`, `data/`) | Grundlage für alle weiteren Schritte |
| 2026-10-30 | Hauptaccount (ca. 3k Follower) wird umgestellt; Shop-Provisionen spielen keine Rolle | Konto ist privat und laut Account check sauber |
| 2026-10-30 | Keine 1:1-Kopie bestehender Formate; Nische „Geld-Duell“ verworfen | Zu nah an @kontostand.vs und @wissentogo_de; gesucht ist eine Nische mit gleichem Prinzip, aber eigenem Thema |
| 2026-10-31 | Nische: Kombi „Alltag durchgerechnet“ (Geld-Duell + Testlauf), Platz 1 im Ranking | Größter Themenvorrat (300 Ideen, ca. 1.600 Varianten), Nachfrage für beide Rubriken belegt |
| 2026-10-31 | Der TikTok-Markt wird laufend beobachtet, um neue Trends zu erkennen | Themen-Nachschub, Konkurrenz und Regeländerungen früh sehen |
| 2026-10-31 | Trend-Radar läuft täglich automatisch; Claude bewertet Trends selbst und schlägt nur Trends mit Potenzial vor | Das Tempo ist hoch, eine Woche ist zu lang |
| 2026-10-31 | Stimme: ElevenLabs, kleinster bezahlter Plan; bei Bedarf der nächstgrößere | Kommerzielle Lizenz nötig, Kosten zuerst klein halten |
| 2026-10-31 | Gerendert wird auf dem Windows-PC des Inhabers | Vorhandene Hardware |
| 2026-10-31 | Trend-Vorschläge Weihnachtsgeld und Mindestlohn angenommen, unter der Bedingung, dass jedes Video mindestens 1 Minute trägt | CRP verlangt Videos über 1 Minute |
| 2026-10-31 | Kanalname „Der Testlauf“ abgelehnt; neuer Name wird aus Vorschlägen gewählt | Wunsch des Inhabers |
| 2026-10-31 | Vor dem Pipeline-Bau gibt der Inhaber den Stil anhand von Beispiel-Skripten frei | Kontrolle von Ton und Stil |
| 2026-10-31 | Kanalname: **Simulierbar** | Auswahl des Inhabers aus den Namensvorschlägen |
| 2026-10-31 | Kein „1.000 Lebensläufe“-Merkmal: gleiches Format wie die Vorbilder, nur eigene Themen | Verkompliziert das Vorhaben, bringt keinen Vorteil |
| 2026-10-31 | Jedes Video endet mit „Schreibt euren Simulationswunsch in die Kommentare.“ statt „Morgen: …“ | Zuschauer liefern die nächsten Themen |
| 2026-10-31 | Erstes Video: GTA 6 und Krankfeiern, Wirtschaftsrechnung für Deutschland, Start vor dem Release am 19.11. | Idee des Inhabers, Durchbruchpotenzial (Trend-Score 85) |
| 2026-10-31 | Account heißt ab sofort Simulierbar (`@simulierbar` aktiv); ElevenLabs-API-Key ist erstellt | Umsetzung durch den Inhaber |
| 2026-10-31 | Optik deutlich hochwertiger als die Konkurrenz (Motion Design) wird zum Markenzeichen | Abheben über Qualität |
| 2026-10-31 | Start **heute** mit 2 Videos: GTA 6 **weltweit** gerechnet plus Reißverschluss. Die Deutschland-Version von GTA 6 wird eine eigene, spätere Idee | Tempo; weltweite Rechnung hat größere Reichweite |
| 2026-10-31 | Sprecherstimme: ElevenLabs „Daniel“ (`onwK4e9ZLuTAKqWW03F9`, Standard in `pipeline/tts.py`); zuerst getestet `zfc8CJQpe8Kqyl0vvCzo`, Aussprache teils komisch | Auswahl des Inhabers |
| 2026-10-31 | Stimme für den Start: zurück zu `zfc8CJQpe8Kqyl0vvCzo` (erste Wahl), natürliches Tempo, Aussprache über Sprechfassung. Daniel verworfen (zu langsam bzw. nach Beschleunigung zu schnell, klingt nach KI). Endgültige Stimmensuche in der ElevenLabs-Bibliothek, sobald der Key Leserechte hat | Inhaber: Tempo nicht künstlich ändern, Stimme soll natürlich klingen wie bei den Vorbildern |
| 2026-10-31 | Untertitel ohne Hintergrundkasten: Wort für Wort aufbauend (max. 2 Zeilen), weiße fette Schrift mit dicker schwarzer Kontur, aktuelles Wort gelb | Inhaber: Kasten gefällt nicht, Lesbarkeit über Kontur |
| 2026-10-31 | Stimme: männlich, muttersprachlich Deutsch (Auswahl per Hörprobe) | Inhaber: Aussprachefehler vermeiden |
| 2026-10-31 | Die ersten beiden Videos (GTA 6 weltweit, Reißverschluss) werden vor dem Posten mit neuer Stimme und neuen Untertiteln neu gebaut | Die ersten Videos prägen den Kanal-Stil |
| 2026-10-31 | Ablage in Google Drive kommt später über den Windows-PC (Drive für Desktop), kein Cloud-Upload | Wahl des Inhabers |
| 2026-10-31 | Trend-Radar schlägt nur noch im aktuellen Format vor (klare Modellrechnung, Duell bzw. Strategie-Vergleich), kein „1.000 simulierte …“ mehr | Inhaber: alte Regel war noch im Radar |
| 2026-10-31 | Stimme „Ben“ (`aTTiK3YzK3dXETpuDE2h`, ElevenLabs-Bibliothek, muttersprachlich Deutsch, 2,6 Wörter/s) ist Standard; Alternativen Marc, Alexander, Otto in `pipeline/tts.py` | Auswahl des Inhabers per Hörprobe |
| 2026-10-31 | Designstil wechselt je Thema: alle 8 Stile aus `docs/10-designstile.md` bleiben im Katalog, je Video der passendste, nie zweimal hintereinander gleich; neue Stile werden aufgenommen | Inhaber: Abwechslung, Stil passend zum Thema |
| 2026-10-31 | Auto-Posting: Buffer testen (ca. 9 €/Monat). Regel gelockert: offizielle Partner-Tools erlaubt, Claude legt nur Entwürfe an, der Inhaber gibt frei | Recherche `docs/11-automatisierung.md`: auditierte Partner-Tools dürfen öffentlich posten |
| 2026-10-31 | Trend-Radar täglich per Telegram-Bot (statt WhatsApp) | Kostenlos, offiziell, 10 Min. Einrichtung |
| 2026-10-31 | 30-Tage-Plan ist die Reihenfolge der nächsten Videos; Produktion startet täglich auf Zuruf des Inhabers, kein Autopilot. ElevenLabs bleibt vorerst Starter | Inhaber |
| 2026-10-31 | Caption-Format für TikTok und YouTube: eine Zeile „Hook-Frage? Emoji Ich hab's simuliert. Kommentarfrage? 👇“ + 5 Hashtags (3 Thema, #wissen, #simulation). Keine Quellen, Annahmen oder Hinweise („Stimme: KI“, „keine Anlageberatung“), weder in der Caption noch im Video oder als Kommentar; Pflicht bleibt nur der KI-Schalter beim Posten | Inhaber: nicht verpflichtend, kostet nur Arbeit; kurze Captions wie bei den erfolgreichsten Konkurrenz-Videos |
