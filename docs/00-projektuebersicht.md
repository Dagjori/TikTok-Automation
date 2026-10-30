# Projekt KI-Simulationsvideos

**Notizen:** [Marktanalyse](01-marktanalyse.md) · [Claude-Kapazität](04-claude-kapazitaet.md) · [Account-Strategie](02-account-strategie.md) · [Nischen](03-nischen.md)

## Kurzfazit
- **Das Format funktioniert nachweislich.**
  - 6 deutsche Beispielvideos: 6,04 Mio. Views, Ø 1 Mio.
  - Brandneue Accounts erreichen 300k–800k Views mit ihren ersten Videos.
- **Der Engpass ist die Follower-Umwandlung**, nicht die Reichweite. Bei Claude liegt er auch nicht.
- **Geld kommt zuerst von TikTok**, nicht von YouTube. YouTube zahlt für Shorts erst ab 10 Mio. Views in 90 Tagen (ab 01.02.2027 sind für neue Kanäle 20 Mio. die Einstiegsschwelle). Shorts trotzdem hochladen: Das kostet nichts extra und bringt Reichweite.
- **„Voll passiv“ ist nur bis zur Qualitätskontrolle machbar.** Hochladen und Planen bleiben ca. 2–3 Stunden pro Woche Handarbeit über TikTok Studio und YouTube Studio. Bot-Uploads verbieten die Regeln.
- **Startnische:** Geld-Duelle. Zweite Nische: Alltagsphysik. Danach eine englische Version.

## Einnahmen-Szenarien TikTok CRP (Schätzung)
Annahmen:
- 2 Videos pro Tag (60 pro Monat)
- 60–70 % der Views sind qualifiziert (nur FYF ≥ 5 s und nur aus CRP-Ländern, ohne Österreich und Schweiz)
- RPM 0,20–1,00 € pro 1.000 qualifizierte Views (Drittquellen, keine offizielle Zahl)

| Szenario | Ø Views pro Video | Views pro Monat | Erlös pro Monat |
|---|---|---|---|
| Konservativ | 15.000 | 0,9 Mio. | ca. 120–600 € |
| Mittel | 50.000 | 3 Mio. | ca. 400–2.000 € |
| Stark (Niveau der Beispielvideos) | 200.000 | 12 Mio. | ca. 1.600–8.000 € |

**Vorsicht, Überlebens-Verzerrung:** Die 6 Beispielvideos sind Hits. Kanal-Durchschnitte liegen oft weit darunter, z. B. bei @unnoetig_tiefgruendig ca. 150 Likes pro Video, also nur wenige tausend Views.

**YouTube Shorts:** 0,04–0,15 € pro 1.000 Views (S), und das erst nach Aufnahme ins Partnerprogramm.

## YouTube: Was gilt (offiziell)
- **Partnerprogramm heute:** 1.000 Abos plus 10 Mio. Shorts-Views in 90 Tagen (oder 4.000 Stunden Wiedergabezeit).
- **Ab 01.02.2027:** Neue Kanäle brauchen 20 Mio. Shorts-Views in 90 Tagen (oder 8.000 Stunden). Am Shorts-Werbepool verdient man nur mit mindestens 10 Mio. Shorts-Views in 90 Tagen ([YouTube Blog](https://blog.youtube/news-and-events/youtube-partner-program-updates-2027-new-opportunities-earn/)).
- **Erlösanteil:** 45 % aus dem Shorts-Pool ([Hilfe](https://support.google.com/youtube/answer/12504220)). Shorts dürfen bis 3 Minuten lang sein.
- **„Inauthentic content“ (seit 15.07.2025):** Massenhaft produzierte bzw. sich wiederholende Inhalte und „templated storylines … with minimal or no … educational value“ sind nicht monetarisierbar ([Hilfe](https://support.google.com/youtube/answer/1311392)). Gegenmittel: jedes Video mit echtem Erklärwert, eigener Rechnung und Abwechslung.
- **KI-Kennzeichnung:** Pflicht bei realistisch wirkenden Szenen bzw. Personen. Stilisierte Animation ist ausgenommen. Bei KI-Stimme sicherheitshalber „veränderte oder synthetische Inhalte“ anhaken; laut YouTube wirkt sich das nicht auf die Monetarisierung aus.
- **Upload:** Eigene Videos auf beiden Plattformen sind erlaubt. Dieselbe Master-MP4 **ohne TikTok-Wasserzeichen** hochladen.

## Technischer Aufbau (Empfehlung)

**Ablauf**
1. Themen-Backlog (Notion oder Tabelle)
2. Claude Code erstellt Recherche plus Quellen, das Skript (Hook – Hold – Act) und die Rechnung bzw. Simulation als Code mit Tests
3. Szenen-Spezifikation (JSON) für die Three.js-Vorlage mit Bausteinen: Duell-Balken, Zeitachse, 3D-Objekte, Kamerafahrten, Untertitel
4. Rendern in Headless-Chrome mit 1080×1920 (CRP-Zusatzvergütung verlangt ≥ 1080p)
5. Stimme über ElevenLabs (bezahlter Plan) und Mix mit ffmpeg
6. Qualitätskontrolle: Kontaktbogen (Übersicht der Einzelbilder), Lautheit, Faktencheck (5 Minuten durch dich)
7. Einmal pro Woche als Stapel einplanen: TikTok Studio Web (bis 30 Tage im Voraus) und YouTube Studio

**Werkzeuge**
- **Vorlage als Startpunkt:** [lowpoly-reel](https://github.com/stochosfrance/lowpoly-reel) (MIT-Lizenz) als Referenz, Neubau auf das Duell-Format zugeschnitten.
- **Render-Ort:** eigener PC oder kleiner Server. Die Cloud-Sessions von Claude Code sind flüchtig und nur für die Entwicklung gedacht.

## Recht & Steuern DE (Orientierung, keine Beratung)
- **Gewerbe:** Regelmäßige Einnahmen mit Gewinnabsicht gelten als gewerblich, also Gewerbe anmelden (Leitfaden Influencer, FinMin Hessen 07/2026). Gewerbesteuer-Freibetrag 24.500 €.
- **Kleinunternehmerregelung (§ 19 UStG, seit 2025):** Umsatz im Vorjahr höchstens 25.000 € und im laufenden Jahr höchstens 100.000 €.
- **Umsatzsteuer:** Auszahlungen kommen von Google Ireland bzw. TikTok Information Technologies UK Ltd. Der Leistungsort liegt im Ausland, in DE also in der Regel nicht steuerbar. Ob eine Zusammenfassende Meldung bzw. eine USt-IdNr. nötig ist: **Steuerberater**.
- **Impressum (§ 5 DDG):** Pflicht für geschäftsmäßige Profile. Ein Link in der Bio (höchstens 2 Klicks) reicht. Bußgeld bis 50.000 €, Abmahnrisiko.
- **Nebentätigkeit:** Arbeitsvertrag prüfen. Anzeigen, wenn Interessen des Arbeitgebers berührt sein könnten (z. B. Konkurrenz, Arbeitszeit). Im öffentlichen Dienst Pflicht.
- **KI-Kennzeichnung:** Laut TikTok Pflicht bei realistisch wirkenden Szenen bzw. Personen. Stilisierte 3D-Animation und „generic text-to-speech“ sind ausgenommen. Empfehlung: in der Beschreibung „Stimme: KI“ angeben. Transparenzpflichten des EU AI Act betreffen vor allem Deepfakes, hier in der Regel nicht einschlägig.
- **Lizenzen:** ElevenLabs Free hat keine kommerzielle Lizenz, also bezahlter Plan. Remotion ist bis 3 Personen kostenlos. Musik nur lizenzfrei bzw. selbst erzeugt.
- **Finanz-Nische:** nur Modellrechnungen mit offenen Annahmen, keine Produktempfehlungen, Hinweis „keine Anlageberatung“, Affiliate-Links als Werbung kennzeichnen.
- **Kaufaufrufe:** TikTok drosselt in TikTok-Shop-Märkten (DE) Inhalte, die zum Kauf außerhalb von TikTok führen (Community Guidelines). Deshalb keine Kaufaufrufe im Video.
- **Wann Profis nötig sind:** Steuerberater bei Gewerbeanmeldung und erster Auszahlung (USt-Fragen). Anwalt nur, falls Finanzprodukte konkret beworben werden sollen.

## Nächste Schritte und offene Punkte
Siehe [STATUS.md](../STATUS.md).
