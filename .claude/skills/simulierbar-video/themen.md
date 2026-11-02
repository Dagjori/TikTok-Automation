# Themen: Markt, Auswahlregeln, Finanzregeln, Zahlen 2026 (Simulierbar) · Sperrliste und Plan sind Archiv

Gilt für `@simulierbar` (Skill `simulierbar-video`). **Stand 02.11.2026 abends (Entscheidungen des Inhabers):** Themen entstehen täglich neu im Ideen-Studio (10 Ideen, der Inhaber wählt 2; das Skript schreibt Claude Chat). Es gibt **keinen 30-Tage-Plan** mehr (`data/plan/30-tage.csv`, `simulierbar-plan.json`, Plan-PDF sind nur Archiv, nicht gelöscht) und **keine Sperrliste** mehr. Es gibt nur noch das Thema **GELD** (Rubrik ALLTAG entfällt); Länder sind frei. Legende: **(F)** belegter Fakt mit Quelle · **(S)** Schätzung · **(A)** Annahme · **(B)** Beispielwert, wird vor der Produktion gerechnet · **prüfen** vor der Produktion klären.

## Gültigkeit der Abschnitte (seit 02.11.2026 abends)
| Abschnitt | Status | Hinweis |
|---|---|---|
| §0 Markt und Nische | **gültig** (Hintergrund) | Rubriken-Satz „GELD und ALLTAG“ in Bezug auf ALLTAG veraltet: nur GELD |
| §1 Was bei der Konkurrenz zieht | **gültig** (Hintergrund, Stand 02.11.) | Muster zur Orientierung; keine Sperre daraus |
| §2 Auswahlregeln | **gültig, neu gefasst** | GELD 100 %, Länder frei, keine Sperrliste, keine 1:1-Kopie |
| §3 Konkurrenz-Sperrliste | **VERALTET seit 02.11.2026 (Entscheidung Inhaber), nur Archiv** | Themen sind nicht mehr gesperrt |
| §4 Was aus dem alten Plan wurde | **VERALTET, nur Archiv** | Plan entfällt; Modelle in `pipeline/projekte/` bleiben nutzbar |
| §5 TikTok-Regeln für Finanzinhalte | **gültig** | Finanz- und Ausschlussregeln bleiben |
| §6 Zahlen für Deutschland 2026 | **gültig** (für Themen mit Deutschland-Bezug) | andere Länder: eigene amtliche Quelle und Währung nennen |
| §7 Feste Termine | **gültig als Information** | Spalte „Video“ gehört zum alten Plan (Archiv) |
| §8 Sperrliste aus dem Maßstab | **VERALTET, nur Archiv** | |
| §9 Weitere Hinweise | **VERALTET, nur Archiv** | Reserve, Kapazität und Planhinweise gehören zum alten Plan |

## 0. Markt und Nische (Belege, Stand 29.10.–02.11.2026)
- **Ausgangsvideos (F, 29.10.):** 6 deutsche Simulationsvideos mit zusammen 6,04 Mio. Views (Ø 1 Mio.), 72–117 s lang: @kurzsimuliert (Regen, 2,1 Mio.), @retrodreamspace (Zigarette gegen Vape, 2,2 Mio.), @mal.angenommen (808k), @kontostand.vs (Mieten oder kaufen, 504k nach 3 Tagen), @wissentogo_de (Leasing, 298k), @unnoetig_tiefgruendig (131k). Rohdaten `data/2026-10-29_ausgangsvideos.csv`, `data/2026-10-29_kanaele.csv`.
- **Muster (F/S):** Neue Accounts gehen sofort viral (Followerzahl ist kein Ranking-Faktor). Engpass ist die Follower-Umwandlung (ca. 0,4–4 Follower je 1.000 Views, S), Treiber sind Shares. Statische Grafiken floppen (@finanzdenker 37.900 Views bei 204k Followern). TikTok sortiert 3D-Optik oft als „Video Games“ ein; Bildschirmtext und gesprochene Schlüsselwörter steuern die Zielgruppe. Wenige Videos reichen für 10k, wenn der Inhalt trifft (@kurzsimuliert 10 Videos, 12,9k Follower).
- **Nischenranking (S, 30.10., Themenvorrat, Nachschub, Beleg, Wettbewerb, Risiko, Aufwand):** 1 Kombi „Alltag durchgerechnet“ (86) · 2 Der Testlauf (83) · 3 Geld-Duell (82) und Alltagsphysik (82) · 5 Weltraum & Erde (74) · 6 Gedankenexperimente (73) · 7 Geschichte (70) · 8 Technik (68) · 9 Tier-Duelle (54) · 10 Körper (49). Je 150 eigenständige Ideen in `data/ideen/` (Auswertung `tools/ideen_auswertung.py`); Kombi: 300 Ideen plus ca. 1.600 Varianten (anderes Ergebnis = kein Doppelpost), ca. 18 Monate Vorrat bei 1 Video/Tag; „unendlich“ nur über Varianten, nachwachsende Themen und Zuschauerfragen.
- **Nicht empfohlen:** Psychologie-Simulationen (Mental-Health-Regeln), Katastrophen-Simulationen (Angst-Inhalte, Fehlinfo-Nähe), Körper/Gesundheit (≥ 4 DE-Kanäle, Gesundheits-Fehlinfo, Tabak/Vape nicht FYF-tauglich). Geschichte nur ohne NS-Kennzeichen (§ 86a StGB), Alltagsphysik nie als Nachahmungs-Anleitung.
- **Spätere Optionen (S):** zweite Nische Alltagsphysik, Weltraum & Erde (sprachunabhängig, leicht auf Englisch), Gedankenexperimente Geld/Gesellschaft als Rubrik; 3D-Erklärvideos als Dienstleistung für Firmen (S: 300–1.500 €/Video). Der TikTok-Account selbst ist schlecht verkaufbar (CRP an die Identität gebunden); verkaufbar wären Marke, YouTube-Kanal, Rechner, Pipeline. Affiliate/Rechner nur über Bio, YouTube, Website, nie als Kaufaufruf im Video.
- **Vergleichskanäle (F, 29.10.):** 26 Kanäle mit Format-Nähe in `data/2026-10-29_kanaele.csv` (u. a. @zackdfilms92 mit 8 Mio. Follower als Genre-Vorbild, @psych.wissen, @simplysimulated, @thewhatifstudio, @weltraumweisheiten, @mitsistudio). Körper-Nische in DE voll; Geld-Duelle, Alltagsphysik, Geschichte in 3D und Tier-Duelle waren kaum besetzt. Ein Zweitstandbein anderer Kanäle ist der Verkauf der Methode bzw. ein Affiliate-Link in der Bio; bei uns nie als Kaufaufruf im Video. Warnsignal: viele Follower bei kaum Likes (gekaufte Follower), kein Vorbild.
- **Follower-Umwandlung (F/S):** Serie mit Wiedererkennung (gleiches Versprechen, eigene Auflösung im selben Video); Kommentar-Wünsche umsetzen („Antwort auf @…“, liefert Themen); Profil-Grid mit einheitlichen Covern. Teile nur, wenn ein Thema über 3 Minuten braucht (dann je Teil mind. 1 Min. und eigene Auflösung). TikTok selbst: über 1 Minute lange Videos machen das Aufteilen überflüssig, und „den besten Moment ans Ende zu legen“ ist ein häufiger Fehler, weil viele es nie erreichen (daher der Aufbau mit Wendung bei 18–25 s). **Nicht machen:** Follower oder fertige Accounts kaufen (CRP verlangt authentische Follower), Like-for-like-Aufrufe (Engagement-Bait), massenhaft fast identische Videos (Spam). Playlists gibt es erst ab 10k Followern. **Alte Shop-Videos:** Produktlinks nicht nachträglich entfernen (geht nur durch Löschen und neu Hochladen) und das Affiliate-Konto nicht deaktivieren (entfernt alle Links, stoppt Provisionen); das 3k-Konto war am 30.10. privat und laut Account check sauber, Einwände gegen die Shop-Videos für das CRP gibt es nicht (Geld bringen ohnehin nur Videos nach der Freischaltung). Wirkung eines Themenwechsels, Löschens oder Privatstellens auf die Reichweite ist von TikTok nicht dokumentiert.
- **Einnahmen-Szenarien CRP (S, 60 Videos/Monat, 60–70 % qualifiziert, RPM 0,20–1,00 €):** Ø 15.000 Views je Video ≈ 120–600 €/Monat · 50.000 ≈ 400–2.000 € · 200.000 (Niveau der Beispielvideos) ≈ 1.600–8.000 €. Überlebens-Verzerrung: Kanal-Durchschnitte liegen oft weit unter den Hits (@unnoetig_tiefgruendig ca. 150 Likes je Video). YouTube Shorts: 0,04–0,15 € je 1.000 Views (S), erst nach Aufnahme ins Partnerprogramm (Erlösanteil 45 % aus dem Shorts-Pool, Shorts bis 3 Min.); „inauthentic content“ (seit 15.07.2025: Massenware, „templated storylines … with minimal … educational value“) ist nicht monetarisierbar, Gegenmittel sind echter Erklärwert, eigene Rechnung, Abwechslung. YouTube-Upload später: dieselbe Master-MP4 ohne TikTok-Wasserzeichen; KI-Angabe „Veränderte oder synthetische Inhalte“ dann neu prüfen.
- **Recht und Steuern (später, keine Rechtsberatung):** Regelmäßige Einnahmen mit Gewinnabsicht gelten als gewerblich (Gewerbe anmelden, Gewerbesteuer-Freibetrag 24.500 €); Kleinunternehmerregel § 19 UStG: Vorjahr ≤ 25.000 €, laufendes Jahr ≤ 100.000 €. Auszahlungen kommen von TikTok Information Technologies UK Ltd. bzw. Google Ireland (Leistungsort Ausland, in DE meist nicht steuerbar; Zusammenfassende Meldung bzw. USt-IdNr. klärt der Steuerberater). Impressum § 5 DDG als Link in der Bio (höchstens 2 Klicks; Bußgeld bis 50.000 €). Nebentätigkeit im Arbeitsvertrag prüfen (im öffentlichen Dienst anzeigepflichtig). Lizenzen: ElevenLabs Free hat keine kommerzielle Lizenz; Musik nur lizenzfrei oder selbst erzeugt; Finanz-Nische nur Modellrechnung, Affiliate-Links als Werbung kennzeichnen.
- **Seit 31.10. neue deutsche Konten im selben Format** (F, Profilseiten 02.11.): @simulierts, @alltagsduell, @geldsimuliert, @alltagsformel, @alltaginzahlen, @gegenprobe, @fabrik.neu, @durchgerechnet.de, @rechnetsichdas, @lohntsichdas. Unser Unterschied sind **neue Themen und die Qualität der animierten Welt**.

## 1. Was bei der Konkurrenz zieht (Hintergrund, keine Sperre)

> Seit 02.11.2026 abends sperren diese Zahlen kein Thema mehr. Sie zeigen, was zieht, und helfen beim eigenen Winkel. Für jedes Video gilt: **keine 1:1-Kopie**.

- **Aufrufe der Konkurrenz (F, öffentliche Videoseiten, abgerufen 02.11.2026):**

| Konto | Video (Thema) | Aufrufe | Länge |
|---|---|---|---|
| @kontostand.vs | Mieten oder kaufen, 30 Jahre | 617.100 | 92 s |
| @wissentogo_de | Leasen, finanzieren oder bar | 362.700 | 117 s |
| @kontostand.vs | Studium oder Ausbildung, bis 50 | 359.400 | 67 s |
| @alltaginzahlen | E-Auto oder Benziner, Break-even | 198.000 | 59 s |
| @kurzsimuliert | Fenster auf oder Klimaanlage (Sprit) | 195.900 | 76 s |
| @kurzsimuliert | Spülmaschine oder Handspülen | 124.100 | 80 s |
| @mal.angenommen | Viel Geld ausgeben (Traumgeld, kein Duell) | 879.100 | 72 s |
| @wissentogo_de | Auto oder Flieger nach Spanien | 56.500 | 114 s |
| @wissentogo_de | Wärmepumpe oder Gasheizung | 51.000 | 99 s |
| alle übrigen Geld-Videos dieser Konten seit 26.10. | Neuwagen, Kaffee, Million, Inflation, Kindergeld, Solar, Abos, LED, Trockner … | meist 300–5.000 | 60–150 s |

- **Muster (A, aus den Zahlen gedeutet):**
  1. Große Lebensentscheidungen mit einer großen Endzahl ziehen („Wer ist nach 30 Jahren reicher?“). Kleine Spartipps ziehen kaum.
  2. Die erfolgreichen Konten nutzen dieselbe Dramaturgie wie unser Maßstab (Denkfalle, Wendung, Endstand, Merksatz). Das Format allein unterscheidet uns nicht mehr. Unser Unterschied sind **neue Themen** und die **animierte Welt** (Inhaber 02.11.).
  3. Seit Ende Oktober sind viele kleine Konten im selben Format gestartet (@geldsimuliert, @alltagsformel, @alltaginzahlen, @gegenprobe, @alltagsduell, @fabrik.neu, @simulierts, @durchgerechnet.de). Klassische Duelle sind deshalb schnell vergeben. Termin-Videos sind am besten geschützt, weil das Timing nicht kopierbar ist.
- **US als Ideenquelle (F, Videoseiten 02.11.):** @humphreytalks (3,4 Mio. Follower) erreicht mit „Notgroschen zu groß?“ 298.200 Aufrufe und mit der Reis-Visualisierung einer Milliarde 2,5 Mio. (2020). @simplysimulated (63.700 Follower) macht Was-wäre-wenn-Simulationen, Geld-Themen dort nur ca. 30.000 Aufrufe. Übernommen als eigener Winkel: Notgroschen (#30), Freelancer gegen Angestellt (#12), Schneeball gegen Lawine (#8, bekanntes US-Thema, A), Hochzeit gegen Eigenkapital (Reserve).

## 2. Auswahlregeln für jedes Thema (gültig, neu gefasst 02.11.2026 abends)

Die Ideen kommen aus dem Ideen-Studio (10 pro Tag, der Inhaber wählt 2); Claude Code prüft beim Eingang des Skripts, ob die Regeln hier eingehalten sind, und meldet Auffälligkeiten.

1. **Nur Thema GELD, 100 %:** Ergebnis in **Euro** auf der Anzeigetafel (bei anderen Ländern in der passenden Währung, Quelle und Modellrechnung sauber nennen). Die Rubrik ALLTAG entfällt; Alltagsfragen nur, wenn sie ein Geld-Ergebnis haben (Zeit wird mit Mindestlohn 13,90 € oder dem Netto-Stundenlohn aus dem Netto-Modul in Euro umgerechnet). Ersetzt „mindestens 50 von 60 Videos GELD“.
2. **Themen-Logik (Inhaber 02.11.):** Beide Seiten sind Alternativen derselben Entscheidung, die sich ausschließen bzw. gegeneinander abgewogen werden.
3. **Länder frei:** Deutschland, weltweit oder andere Länder; Sprache bleibt Deutsch. Zahlen aus §6 gelten nur für Deutschland.
4. **Keine Sperrliste, aber keine 1:1-Kopie:** Themen von Konkurrenzkanälen sind nicht gesperrt (der Inhaber kennt die Kanäle selbst). Kopiert wird nie Skript, Wortlaut, Bild- oder Szenenidee eines fremden Videos (CRP-Ausschluss „Unoriginal“); gleiches Thema nur mit eigenem Skript und anderem Design. Der Konkurrenz-Check ist keine Pflichtsperre mehr; eine kurze Sichtung (ca. 5 Min.) hilft dem eigenen Winkel und der `stil_begruendung`.
5. **Finanz-Regeln und Ausschlussthemen** (§5, `CLAUDE.md` §7): nur Modellrechnung, keine Produkte, Anbieter, Banken, Coins oder Aktien, kein Kaufaufruf, kein „schnell reich“; Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik, NS-Kennzeichen, riskantes Nachahmen bleiben ausgeschlossen.
6. ~~**Maßstab-Score** (D 30, K 25, B 20, L 15, F 10, S)~~ war das Raster des alten Plans (Archiv). Die Auswahl trifft jetzt der Inhaber; als Orientierung bleiben die Muster aus §1.

## 3. Konkurrenz-Sperrliste · VERALTET seit 02.11.2026 (Entscheidung des Inhabers), nur Archiv

> **Nicht mehr gültig.** Die Sperrliste entfällt (erstmal). Gesperrte Themen von Konkurrenzkanälen gelten nicht mehr. **Bleibt:** keine 1:1-Kopie (siehe §2). Der Abschnitt bleibt als Archiv und Marktbeleg stehen; nichts daraus sperrt ein Thema.

**Methode (02.11.2026):**
- Öffentliche Profil-Embeds `tiktok.com/embed/@konto` (das offizielle Einbett-Widget zeigt die neuesten Videos eines Kontos) und öffentliche Videoseiten mit Aufrufzahlen. Bei den Top-Videos dazu die automatischen Untertitel, nur zum Lesen der Themen, nicht im Repo.
- Geprüft: @kontostand.vs, @wissentogo_de, @geldsimuliert, @alltaginzahlen, @alltagsformel, @rechnetsichdas, @lohntsichdas, @kurzsimuliert, @mal.angenommen, @retrodreamspace, @durchgerechnet.de, @simulierts, @gegenprobe, @fabrik.neu, @alltagsduell (deutsch) sowie @humphreytalks und @simplysimulated (US).
- Keine Video- oder Tondateien, keine internen APIs. Websuche und andere Seiten kennen TikTok kaum (Websuche lieferte keine TikTok-Treffer).
- **Grenze (A):** Das Embed zeigt nur die neuesten 5–13 Videos je Konto. Ältere Hits können fehlen. Der Trend-Radar prüft am Vortag jeder Produktion erneut.

**Gesperrt, weil schon gelaufen** (Aufrufe F, Videoseiten 02.11.):

| Thema | Konto und Aufrufe | Folge für den Plan |
|---|---|---|
| Mieten oder kaufen | @kontostand.vs 617.100 · @wissentogo_de 33.600 | gesperrt |
| Leasen, finanzieren oder bar (inkl. 0-%-Falle) | @wissentogo_de 362.700 | gesperrt; auch die alte Zeile „0-%-Finanzierung im Laden“ ist raus |
| Studium oder Ausbildung | @kontostand.vs 359.400 · @wissentogo_de 868 | gesperrt, alte Zeile 12.11. raus |
| E-Auto oder Benziner | @alltaginzahlen 198.000 | gesperrt |
| Fenster auf oder Klimaanlage | @kurzsimuliert 195.900 · @alltaginzahlen 928 | gesperrt |
| Spülmaschine oder Handspülen | @kurzsimuliert 124.100 | gesperrt |
| Viel Geld ausgeben (Traumgeld) | @mal.angenommen 879.100 | gesperrt |
| Auto oder Flieger (mit Personen-Wendung) | @wissentogo_de 56.500 | „600 km Auto oder Bahn“ nur Reserve |
| Wärmepumpe oder Gasheizung · Solardach · Speicher | @wissentogo_de 51.000 / 2.611 · @rechnetsichdas | gesperrt |
| Heizung nachts aus | @rechnetsichdas 22.200 · @alltagsduell · @fabrik.neu | gesperrt |
| Reifendruck · Tempo 160 statt 130 · Ganzjahresreifen | @kurzsimuliert 14.500 · @alltaginzahlen 4.903 / 3.996 · @gegenprobe | gesperrt, alte Zeilen „10 km/h langsamer“ und „Reifen“ raus |
| Neuwagen oder Gebrauchter · Leasing oder Auto-Abo | @geldsimuliert 3.357 · @wissentogo_de 1.085 / 967 | gesperrt |
| Früh anfangen zu sparen · Million · Inflation · 1 Cent verdoppeln · Kaffee gegen Neuwagen | @geldsimuliert 300–2.200 | gesperrt, alte Zeile „25 gegen 35“ raus |
| Kindergeld · Kind kostet · kinderfrei | @wissentogo_de 803 · @alltagsformel 337 · @kontostand.vs 830 | gesperrt |
| Lohnt sich Arbeiten (Bürgergeld) | @kontostand.vs 823 | gesperrt, zudem politisch |
| Steuererklärung machen oder nicht | @geldsimuliert 312 | gesperrt |
| Umweg zur Tankstelle und 12-Uhr-Regel · Trockner gegen Leine · LED · Streaming-Abos | @alltaginzahlen 966–1.533 · @alltagsformel 296 | gesperrt, alte Zeilen „Tanken vor 12“ und „Trockner“ raus |
| Auto gegen Deutschlandticket · Ladegerät · Lehrjahr netto | @alltagsformel 259–282 | gesperrt |
| Rolltreppe · Boarding · Phantomstau · Spurwechsel · Reißverschluss · Kassenschlange | @simulierts · @alltagsduell · @gegenprobe · @kurzsimuliert | Alltag ohne Euro, nicht im Plan |
| Maßstab K1–K4 (Regen, Pausen, Tsunami, Duschen) | Maßstab (§8) · @kurzsimuliert 2,1 Mio. / 467.800 / 403.000 | weiter gesperrt |

## 4. Was aus dem alten Plan wurde · VERALTET (Plan entfällt seit 02.11.2026), nur Archiv

> Der 30-Tage-Plan ist Archiv. Die halb gebauten Modelle und Projekte unten bleiben im Repo und können wiederverwendet werden, wenn das Ideen-Studio ein passendes Thema liefert. Die Aussagen „Clay ist nicht mehr erlaubt“ und „nur Stile 17–21“ sind durch die Stilfreigabe vom 02.11. abends ersetzt ([stile.md](stile.md)); Schere-Stein-Papier hat weiterhin kein Euro-Ergebnis und passt nicht zu GELD.

| Ergebnis | Anzahl | Themen |
|---|---|---|
| übernommen | 10 | Mittagessen (halb gebaut, 03.11.), Gemeinsame Kasse, Steuerklasse (wegen Frist auf 20.11.), Ein Zimmer heizen, Winterjacke, Hund oder Katze, Stoßlüften, Leitungswasser, Dispo oder Ratenkredit, Wichteln |
| zu einer neuen Geld-Frage umgebaut | 5 | Singles Day → Zusammenziehen; 5 % mehr Gehalt → Jobwechsel oder bleiben; Fitnessstudio oder joggen → Vertragslaufzeit; Streichpreis-Check → Black Friday oder Januar; Parkplatzsuche → Parkhaus oder suchen (mit Euro) |
| Reserve | 6 | Monopoly, Kfz-Schaden, Kühlschrank, Bohrmaschine, Kreditkarte, 600 km Auto oder Bahn |
| raus: kein Euro-Ergebnis | 28 | Schere-Stein-Papier, Rad oder Auto, Ziegenproblem, Mensch ärgere dich nicht, Kreisverkehr, Geburtstagsparadoxon, Haltestelle, Morgens im Bad, Zu viele Köche, Schiffe versenken, Elfmeter, 37-%-Regel, Kassenschlange, Memory, Saugroboter, Kniffel, Kaffeekasse, Best-of, Führerscheinprüfung raten, Rolltreppe, Boarding, Reise nach Jerusalem, Klobrille, Baustelle 60/80, Kuchen teilen, Weihnachtsmarkt, Karten mischen, Strohhalm |
| raus: Konkurrenz | 7 | Ausbildung oder Studium, Wäschetrockner, Ganzjahresreifen, Tanken vor 12, 10 km/h langsamer, 25 gegen 35 sparen, 0-%-Finanzierung (siehe §3) |
| raus: aufgegangen oder schwach | 8 | 4-Tage-Woche (in Teilzeit), Pendlerpauschale (in Pendeln, Homeoffice, Fahrgemeinschaft), Stadt oder Land (in Jobangebot und Pendeln), Weihnachtsgeld netto (ersetzt durch Prämie gegen 50 €), Heizung 1 Grad (Umfeld Nachtabsenkung, erwartbar), Marke oder Eigenmarke (ersetzt durch Großpackung), Arbeitsstunden-Preise (kein Duell), GTA 6 Deutschland krankfeiern (schiefer Vergleich und Nähe zu Täuschung; der Release-Termin trägt jetzt „Konsole oder Gaming-PC“) |

**Halb gebaute Projekte in `pipeline/projekte/`:**
- `mittagessen-job`: Geld, Modell mit 13 Tests fertig, **eingeplant am 03.11. abends**. Die Collage-Szene (Stil 6) gilt nicht mehr; die Szene wird im Stil 19 Architekturmodell neu gebaut (Wohnungs- und Büro-Schnitt mit Küche, Lieferung und warmem Innenlicht). Modell und Skript bleiben.
- `schere-stein-papier`: kein Euro-Ergebnis, deshalb nicht im Plan. Clay (Stil 3) ist für Simulierbar nicht mehr erlaubt (Inhaber 02.11.); das Modell bleibt für einen späteren Alltag-Slot liegen und bekommt dann einen der Stile 17–21.
- `leichtes-auto` und `boden-durchsichtig`: „Stell dir vor …“-Themen im Format von Account 2, kein Geld, nicht im Simulierbar-Plan.

## 5. TikTok-Regeln für Finanzinhalte

| Regel | Quelle | Folge für uns |
|---|---|---|
| Nicht erlaubt: Finanzbetrug wie falsche Anlageangebote und „get-rich-quick“-Maschen, Multi-Level-Marketing | [Community Guidelines, Regulated Goods and Commercial Activities, Frauds and Scams](https://www.tiktok.com/community-guidelines/en/regulated-commercial-activities) (veröffentlicht 25.08.2026, gültig ab 24.09.2026) | kein „schnell reich“, kein passives Einkommen, keine Nebenverdienst-Maschen |
| Eigene Produkte und bezahlte Inhalte kennzeichnen | ebenda, Commercial Disclosure | wir zeigen keine Produkte und haben keine Kooperationen |
| Branded Content: Pyramidensysteme, MLM, „zu gut, um wahr zu sein“, Payday-Kredite, „get-rich-quick“ verboten; Finanzdienstleistungen (Kredite, Kreditkarten, Versicherungen, Anlagen) in Deutschland nur 18+ und auf den Markt beschränkt | [Branded Content Policy](https://www.tiktok.com/legal/page/global/bc-policy/en) (gültig ab 30.10.2026) | keine Banken, Versicherer, Broker, Coins; Begriffe wie „Dienstrad“ statt Markennamen |
| Keine Falschinformation mit erheblichem Schaden; bei mäßigem Schaden nicht im Für-dich-Feed | [Community Guidelines, Integrity and Authenticity](https://www.tiktok.com/community-guidelines/en/integrity-authenticity) · [FYF-Standards](https://www.tiktok.com/community-guidelines/en/fyf-standards) | jede Zahl belegt oder als Modell gekennzeichnet, Werte „prüfen“ vor der Produktion klären |
| CRP: mindestens 1 Minute, mindestens 1.000 qualifizierte Aufrufe, keine Werbung oder Sponsoring, original, hohe Qualität | [Creator Rewards Program Terms EEA](https://www.tiktok.com/legal/page/global/tiktok-creator-rewards-program-eea/en) | 65–80 s, eigene Rechnung, kein Kaufaufruf |

**Deshalb verworfen (Ausschlussthemen, gültig; die Zusätze „bei @…“ sind als Konkurrenzhinweis veraltet, die Risikogründe gelten):** Lotto oder Sparen, Sportwetten, Lootboxen (Glücksspiel, auch K.-o. im Trend-Radar, `CLAUDE.md` §10), Krypto und Einzelaktien, ETF-Sparplan-Vergleiche (Anlageberatungs-Nähe, außerdem bei @geldsimuliert und @kontostand.vs besetzt), Bürgergeld gegen Arbeit (politisch, bei @kontostand.vs), „Nebenverdienst-Ideen“ und passives Einkommen (get-rich-quick), Augenlasern gegen Brille (Gesundheitsnähe), Kredit- oder Kartenvergleiche mit Anbietern.

## 6. Zahlen für Deutschland 2026 (gültig für Themen mit Deutschland-Bezug)

Bei anderen Ländern: eigene amtliche Quelle und Währung nennen, als Modellrechnung kennzeichnen, Wert im Skript-Dokument unter `quellen`/`annahmen` belegen.

| Größe | Wert | Kennung und Quelle |
|---|---|---|
| Mindestlohn | 13,90 € je Stunde seit 01.01.2026, 14,60 € ab 2027 | (F) [Bundesregierung](https://www.bundesregierung.de/breg-de/bundesregierung/bundeskanzleramt/mindestlohn-steigt-2391010) |
| Minijob-Grenze | 603 € im Monat seit 01.01.2026 | (F) [Deutsche Rentenversicherung](https://www.deutsche-rentenversicherung.de/Rheinland/DE/Presse/Pressemitteilungen/2025/25-11-21-mindestlohn.html) |
| Entfernungspauschale | 0,38 € je Entfernungskilometer ab dem ersten km seit 2026 | (F) [Bund der Steuerzahler 03/2026](https://steuerzahler.de/fileadmin/user_upload/LV_Baden-W%C3%BCrttemberg/BdSt_AN_News_fuer_Arbeitnehmer_Maerz_2026_Pendlerpauschale.pdf); am Gesetz prüfen |
| Homeoffice-Pauschale, Arbeitnehmer-Pauschbetrag, Grundfreibetrag | 6 € je Tag, max. 1.260 €; 1.230 €; 12.348 € | (F laut Rechner- und Ratgeberseiten, z. B. [deutschland-rechner.de](https://www.deutschland-rechner.de/pendlerpauschale-rechner)) · **prüfen** |
| Deutschlandticket | 63 € im Monat seit 01.01.2026; 2027 evtl. höher | (F) [DB Regional](https://regional.bahn.de/tickets/Deutschlandticket) · 2027 **prüfen** |
| Rundfunkbeitrag | 18,36 € im Monat; KEF empfiehlt 18,64 € ab 2027, nicht beschlossen | (F) [ZDFheute](https://www.zdfheute.de/politik/deutschland/rundfunkbeitrag-zdf-ard-oeffentlich-rechtlich-100.html), [Berliner Zeitung](https://www.berliner-zeitung.de/news/kommission-empfiehlt-rundfunkgebuehr-von-1864-euro-ab-2027-li.10020212) |
| Aktueller Rentenwert | 42,52 € ab 01.07.2026 (+4,24 %) | (F) [Deutsche Rentenversicherung](https://www.deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2026/260305-rentenanpassung-2026.html) |
| Rentenabschlag | 0,3 % je Monat vor der Regelaltersgrenze | (F) [§ 77 SGB VI](https://www.gesetze-im-internet.de/sgb_6/__77.html) |
| EZB-Einlagensatz | 2,50 %, am 29.10.2026 unverändert (2026 zweimal erhöht) | (F laut [biallo](https://www.biallo.de/geldanlage/news/ezb-haelt-leitzins-konstant/)) · auf ecb.europa.eu **prüfen** |
| Dispozins / Ratenkredit | ca. 11,3 % / 8,99 % effektiv (neue Kredite 08/2026) | (F, Sekundärquellen: [bankdaten.de](https://www.bankdaten.de/ratgeber/dispozinsen.html), [capitalo](https://www.capitalo.de/kredit/ratgeber/kreditzinsen)) · **prüfen** |
| Haushaltsstrom | 37,3 ct je kWh im Schnitt 2026 | (F) [BDEW-Strompreisanalyse 10/2026](https://www.bdew.de/media/documents/BDEW_Strompreisanalyse_102026_1.pdf) |
| Sprit | Super E10 2,110 €, Diesel 2,255 € (ADAC-Woche 21.10.2026); September-Mittel E10 2,266 € | (F laut Suchauszug, [ADAC](https://www.adac.de/verkehr/tanken-kraftstoff-antrieb/kraftstoffpreisentwicklung/)) · Oktober-Mittel **prüfen** |
| Dienstwagen | 1 % Listenpreis plus 0,03 % je km Arbeitsweg; E-Auto 0,25 % | (F laut Ratgebern, [steuerschroeder.de](https://www.steuerschroeder.de/PKW-Nutzung.html)) · **prüfen** |
| Aktivrente | 2.000 € Freibetrag im Monat für Arbeit nach der Regelaltersgrenze seit 2026 | (F laut [firmenauto](https://www.firmenauto.de/recht-steuer/dienstwagensteuer/dienstwagen-aktivrentner-steuerfrei-freibetrag-geldwerter-vorteil-2026/)) · **prüfen**; nur Wissen, kein eigenes Video |
| Streichpreis | Bezug ist der niedrigste Preis der letzten 30 Tage | (F) [§ 11 PAngV](https://lxgesetze.de/pangv/11) |
| Netto-Beispiele | 3.500 € brutto = 2.333,25 € netto; +300 € = +164,17 €; 4.000 € = 2.605,50 €; 3.000 € = 2.054,42 € (Steuerklasse 1, kinderlos) | Rechnung, Netto-Modul PAP 2026 |
| Mieten, Autokosten, Gerätepreise, Studienwerte | je Zeile in `kernzahl_bzw_twist` | (S) bzw. (B) · **prüfen** |

## 7. Feste Termine (ohne Kaufaufruf, gültig als Information)

Die Spalte „Video“ nennt Zeilen des alten Plans (Archiv). Die Termine selbst bleiben Anlass für Ideen und Posting-Zeitpunkte (Trend-Radar, `docs/trends/vorschlaege.md`).

| Termin | Datum 2026 | Beleg | Video |
|---|---|---|---|
| Singles Day | Mi 11.11. | (F) laut Plan 31.10. | #17 Zusammenziehen oder getrennt wohnen |
| GTA-6-Release | Do 19.11. | (F) [Rockstar Newswire](https://www.rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026), Stand 31.10.; zweimal verschoben, am 18.11. **prüfen** | #33 Konsole oder Gaming-PC (funktioniert auch ohne Release) |
| Steuerklassen-Wechsel fürs laufende Jahr | bis 30.11. | § 39 Abs. 6 EStG · **prüfen** | #36 am 20.11. |
| Kfz-Wechselstichtag | 30.11. | (F laut Ratgebern, Plan 31.10.) | #42 am 23.11., ohne Wechselaufruf |
| Black Friday / Cyber Monday | Fr 27.11. / Mo 30.11. | Rechnung (Thanksgiving 26.11.) | #43 am 24.11., #49 am 27.11., #55 am 30.11. |
| Weihnachtsgeld | Ende November | (F) etwa die Hälfte der Beschäftigten bekommt es (WSI/Böckler, Plan 31.10.) | #48 Prämie oder 50 € mehr am 26.11. |
| Monatsende | 28.–30.11. | – | #52 Dispo oder Ratenkredit am 28.11. |
| 1. Advent | So 29.11. | Rechnung | #53 Weihnachtsbaum, #56 Wichteln am 30.11. |
| Jahresende Steuer und Vorsätze | Dezember | – | #57 Laptop am 01.12., #59 52-Wochen-Challenge am 02.12. |

## 8. Sperrliste aus dem Maßstab · VERALTET seit 02.11.2026, nur Archiv

> Nicht mehr gültig (Sperrliste entfällt). Die vier Themen sind nicht mehr gesperrt; es gilt nur: keine 1:1-Kopie.
Gesperrt, weil schon viral: Rennen oder gehen im Regen · Pausen gegen Tempo auf der Autobahn · Tsunami-Warnzeichen · Duschen gegen Baden inklusive Duschkosten-Varianten (@kurzsimuliert 2,1 Mio. / 467.800 / 403.000).

## 9. Weitere Hinweise · VERALTET (gehört zum alten Plan), nur Archiv
- **Reserve (15 Themen)** steht in `data/plan/30-tage.csv` (`datum` = reserve). Bei Ausfall oder Konkurrenztreffer nimmt Claude die Reserve und trägt sie im Cockpit ein.
- **Kapazität (S):** ca. 179 Std. Agentenarbeit in 30 Tagen (10 Videos Aufwand 2 = 1,5 Std., 43 mit 3 = 3 Std., 7 mit 4 = 5 Std.), dazu 1–3 Std. je Video für themenspezifische Objekte in den Stilen 17–21; Cloud-Rückfall ca. 100 Std. Renderzeit, Standard ist der Render-Dienst auf dem PC.
- **Halb gebaute Projekte:** `mittagessen-job` (Modell mit 13 Tests, Skript fertig, Szene wird in Stil 19 neu gebaut), `schere-stein-papier` (kein Euro-Ergebnis, Modell bleibt für einen späteren Alltag-Slot), `leichtes-auto` und `boden-durchsichtig` (Account-2-Themen, nicht Simulierbar).
- **Rente mit 63** (04.11.) ist politiknah: nur Rechnung, keine Partei, keine Wertung.
