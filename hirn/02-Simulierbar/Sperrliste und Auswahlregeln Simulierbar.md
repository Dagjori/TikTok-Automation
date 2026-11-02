---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/simulierbar-video/themen.md §2 bis §9, CLAUDE.md §2, CLAUDE.md §7, CLAUDE.md §9
tags: [konto/simulierbar, sperrliste, auswahlregeln, finanzregeln, zahlen-2026, konkurrenz-check]
---

# Sperrliste und Auswahlregeln Simulierbar

Pflicht bei Themenwahl und **vor jedem Produktionsstart (Konkurrenz-Check, ca. 5 Min.)**. Der Trend-Radar prüft am Vortag erneut (Monitor `tools/monitor_kanaele.py`, [[Trend-Radar]]); ein Treffer sperrt das Thema, dann kommt die Reserve ([[Themenplan Simulierbar]]). **Fremde Videos nie nachbauen:** was ein Konkurrent viral gemacht hat, ist gesperrt oder nur mit klar eigenem Ansatz erlaubt ([[Arbeitsregeln und Sicherheit]]). Marktbelege und Konkurrenzzahlen: [[Konkurrenz und Themen Simulierbar]].

Legende: **(F)** belegter Fakt mit Quelle · **(S)** Schätzung · **(A)** Annahme · **(B)** Beispielwert, wird vor der Produktion gerechnet · **prüfen** vor der Produktion klären.

## 1. Auswahlregeln für jedes Thema
1. **Ergebnis in Euro** auf der Anzeigetafel, auch bei den 7 Alltagsentscheidungen im Plan (Zeit wird mit Mindestlohn 13,90 € oder dem Netto-Stundenlohn aus dem Netto-Modul in Euro umgerechnet).
2. **Themen-Logik (Inhaber 02.11.):** Beide Seiten sind Alternativen derselben Entscheidung, die sich ausschließen bzw. gegeneinander abgewogen werden. Geprüft und notiert in `konkurrenz_check`. Gegenbeispiel: „Steuererklärung vs. Überstunden“ ergibt keinen Sinn.
3. **Nur neue Ideen:** nicht auf der Sperrliste (Abschnitt 3 und 4). Wo ein Nachbarthema existiert, steht der eigene Winkel in `konkurrenz_check`.
4. **Finanz-Regeln** (Abschnitt 5): nur Modellrechnung, keine Produkte, Anbieter, Banken, Coins oder Aktien, kein Kaufaufruf, kein „schnell reich“.
5. **Maßstab-Score** nach dem Raster D 30, K 25, B 20, L 15, F 10 (D Duell/Rennen mit Zählern · K kontraintuitiv mit Bedingung · B jeder kennt es · L trägt 65–80 s mit 2 Wendungen · F frei von Konkurrenz/Sperre; Legende aus `tools/plan_pdf.mjs`). **Unter 60 fliegt ein Thema raus; im Plan liegt keins unter 75** (außer den 6 alten Videos 31.10.–02.11.). Die Quelle `themen.md` nennt am Zeilenende noch ein „S“ ohne Erklärung (vermutlich „Score“).
6. Mind. 61 s, 1080×1920, eigene Rechnung; Quellen nur intern in `skript.json`.
7. **Reserve bei Ausfall:** Bei Ausfall oder Konkurrenztreffer nimmt Claude die Reserve (15 Themen) und trägt sie im Cockpit ein ([[Cockpit]]).

### Ausschlussthemen (CLAUDE.md §7)
Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik, NS-Kennzeichen, riskantes Nachahmen. **Kein Kaufaufruf im Video** (TikTok drosselt in Shop-Märkten), kein „schnell reich“, keine Produkte, Banken, Versicherer, Broker, Coins. Finanzthemen nur als Modellrechnung; **kein KI-Label** (Ausnahme: realistisch wirkende KI-Inhalte). Details zu Plattformregeln: [[Plattformregeln und Posting]].

### Gesperrte Formate und Merkmale
- Kein „1.000 Lebensläufe“-/„1.000 simulierte …“-Merkmal (Entscheidung 31.10.: gleiches Format, eigene Themen; gilt auch für Trend-Vorschläge). Eine klare Modellrechnung mit konkreten Fällen statt Massen-Simulation.
- Keine neuen Shop-/Werbevideos auf diesem Account. Keine Sticker/Stempel, keine alten Stile ([[Stile 17 bis 21]]).
- Rennen/Duell ohne Euro-Ergebnis (ALLTAG ohne Euro) sind nicht im Plan, siehe Abschnitt 3 (letzte Zeilen) und 4.
- Rubriken GELD und ALLTAG nur intern, nie im Video.

## 2. Methode der Sperrliste (02.11.2026)
- Öffentliche Profil-Embeds `tiktok.com/embed/@konto` (das offizielle Einbett-Widget zeigt die neuesten Videos eines Kontos) und öffentliche Videoseiten mit Aufrufzahlen. Bei den Top-Videos dazu die automatischen Untertitel, **nur zum Lesen der Themen, nicht im Repo**.
- Geprüft: @kontostand.vs, @wissentogo_de, @geldsimuliert, @alltaginzahlen, @alltagsformel, @rechnetsichdas, @lohntsichdas, @kurzsimuliert, @mal.angenommen, @retrodreamspace, @durchgerechnet.de, @simulierts, @gegenprobe, @fabrik.neu, @alltagsduell (deutsch) sowie @humphreytalks und @simplysimulated (US).
- Keine Video- oder Tondateien, keine internen APIs. Websuche und andere Seiten kennen TikTok kaum (Websuche lieferte keine TikTok-Treffer).
- **Grenze (A):** Das Embed zeigt nur die neuesten 5–13 Videos je Konto. Ältere Hits können fehlen. Ein neues Lunar- oder Konkurrenz-Video kann ein Planthema nachträglich sperren (dann Reserve).

## 3. Gesperrt, weil schon gelaufen (Aufrufe F, Videoseiten 02.11.)
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
| Heizung nachts aus | @rechnetsichdas 22.200 · @alltagsduell · @fabrik.neu | gesperrt (Radar-Vorschlag „Heizung nachts“ nur mit eigenem Winkel) |
| Reifendruck · Tempo 160 statt 130 · Ganzjahresreifen | @kurzsimuliert 14.500 · @alltaginzahlen 4.903 / 3.996 · @gegenprobe | gesperrt, alte Zeilen „10 km/h langsamer“ und „Reifen“ raus |
| Neuwagen oder Gebrauchter · Leasing oder Auto-Abo | @geldsimuliert 3.357 · @wissentogo_de 1.085 / 967 | gesperrt |
| Früh anfangen zu sparen · Million · Inflation · 1 Cent verdoppeln · Kaffee gegen Neuwagen | @geldsimuliert 300–2.200 | gesperrt, alte Zeile „25 gegen 35“ raus |
| Kindergeld · Kind kostet · kinderfrei | @wissentogo_de 803 · @alltagsformel 337 · @kontostand.vs 830 | gesperrt |
| Lohnt sich Arbeiten (Bürgergeld) | @kontostand.vs 823 | gesperrt, zudem politisch |
| Steuererklärung machen oder nicht | @geldsimuliert 312 | gesperrt |
| Umweg zur Tankstelle und 12-Uhr-Regel · Trockner gegen Leine · LED · Streaming-Abos | @alltaginzahlen 966–1.533 · @alltagsformel 296 | gesperrt, alte Zeilen „Tanken vor 12“ und „Trockner“ raus |
| Auto gegen Deutschlandticket · Ladegerät · Lehrjahr netto | @alltagsformel 259–282 | gesperrt |
| Rolltreppe · Boarding · Phantomstau · Spurwechsel · Reißverschluss · Kassenschlange | @simulierts · @alltagsduell · @gegenprobe · @kurzsimuliert | Alltag ohne Euro, nicht im Plan |
| Maßstab K1–K4 (Regen, Pausen, Tsunami, Duschen) | Maßstab (Abschnitt 4) · @kurzsimuliert 2,1 Mio. / 467.800 / 403.000 | weiter gesperrt |

Hinweis zu eigenen Videos: Der Reißverschluss wurde nicht gepostet (@simulierts zuerst, Entscheidung 31.10.), ersetzt durch Spurwechsel.

## 4. Sperrliste aus dem Maßstab
Gesperrt, weil schon viral: **Rennen oder gehen im Regen · Pausen gegen Tempo auf der Autobahn · Tsunami-Warnzeichen · Duschen gegen Baden inklusive Duschkosten-Varianten** (@kurzsimuliert 2,1 Mio. / 467.800 / 403.000). Herkunft: [[Maßstab Simulierbar]] Abschnitt 9.

## 5. TikTok-Regeln für Finanzinhalte
| Regel | Quelle | Folge für uns |
|---|---|---|
| Nicht erlaubt: Finanzbetrug wie falsche Anlageangebote und „get-rich-quick“-Maschen, Multi-Level-Marketing | Community Guidelines, Regulated Goods and Commercial Activities, Frauds and Scams (tiktok.com/community-guidelines/en/regulated-commercial-activities; veröffentlicht 25.08.2026, gültig ab 24.09.2026) | kein „schnell reich“, kein passives Einkommen, keine Nebenverdienst-Maschen |
| Eigene Produkte und bezahlte Inhalte kennzeichnen | ebenda, Commercial Disclosure | wir zeigen keine Produkte und haben keine Kooperationen |
| Branded Content: Pyramidensysteme, MLM, „zu gut, um wahr zu sein“, Payday-Kredite, „get-rich-quick“ verboten; Finanzdienstleistungen (Kredite, Kreditkarten, Versicherungen, Anlagen) in Deutschland nur 18+ und auf den Markt beschränkt | Branded Content Policy (tiktok.com/legal/page/global/bc-policy/en; gültig ab 30.10.2026) | keine Banken, Versicherer, Broker, Coins; Begriffe wie „Dienstrad“ statt Markennamen |
| Keine Falschinformation mit erheblichem Schaden; bei mäßigem Schaden nicht im Für-dich-Feed | Community Guidelines, Integrity and Authenticity; FYF-Standards (tiktok.com/community-guidelines/en/fyf-standards) | jede Zahl belegt oder als Modell gekennzeichnet, Werte „prüfen“ vor der Produktion klären |
| CRP: mindestens 1 Minute, mindestens 1.000 qualifizierte Aufrufe, keine Werbung oder Sponsoring, original, hohe Qualität | Creator Rewards Program Terms EEA (tiktok.com/legal/page/global/tiktok-creator-rewards-program-eea/en) | 65–80 s, eigene Rechnung, kein Kaufaufruf ([[CRP Creator Rewards Program]]) |

**Deshalb verworfen (neue Ideen):** Lotto oder Sparen, Sportwetten, Lootboxen (Glücksspiel, auch K.-o. im Trend-Radar), Krypto und Einzelaktien, ETF-Sparplan-Vergleiche (Anlageberatungs-Nähe, außerdem bei @geldsimuliert und @kontostand.vs besetzt), Bürgergeld gegen Arbeit (politisch, bei @kontostand.vs), „Nebenverdienst-Ideen“ und passives Einkommen (get-rich-quick), Augenlasern gegen Brille (Gesundheitsnähe), Kredit- oder Kartenvergleiche mit Anbietern.

## 6. Zahlen für Deutschland 2026
| Größe | Wert | Kennung und Quelle |
|---|---|---|
| Mindestlohn | 13,90 € je Stunde seit 01.01.2026, 14,60 € ab 2027 | (F) Bundesregierung (bundesregierung.de, „Mindestlohn steigt“) |
| Minijob-Grenze | 603 € im Monat seit 01.01.2026 | (F) Deutsche Rentenversicherung (Pressemitteilung 21.11.2025 zum Mindestlohn) |
| Entfernungspauschale | 0,38 € je Entfernungskilometer ab dem ersten km seit 2026 | (F) Bund der Steuerzahler 03/2026; am Gesetz **prüfen** |
| Homeoffice-Pauschale, Arbeitnehmer-Pauschbetrag, Grundfreibetrag | 6 € je Tag, max. 1.260 €; 1.230 €; 12.348 € | (F laut Rechner- und Ratgeberseiten, z. B. deutschland-rechner.de) · **prüfen** |
| Deutschlandticket | 63 € im Monat seit 01.01.2026; 2027 evtl. höher | (F) DB Regional · 2027 **prüfen** |
| Rundfunkbeitrag | 18,36 € im Monat; KEF empfiehlt 18,64 € ab 2027, nicht beschlossen | (F) ZDFheute, Berliner Zeitung |
| Aktueller Rentenwert | 42,52 € ab 01.07.2026 (+4,24 %) | (F) Deutsche Rentenversicherung (Meldung 05.03.2026) |
| Rentenabschlag | 0,3 % je Monat vor der Regelaltersgrenze | (F) § 77 SGB VI |
| EZB-Einlagensatz | 2,50 %, am 29.10.2026 unverändert (2026 zweimal erhöht) | (F laut biallo.de) · auf ecb.europa.eu **prüfen** |
| Dispozins / Ratenkredit | ca. 11,3 % / 8,99 % effektiv (neue Kredite 08/2026) | (F, Sekundärquellen: bankdaten.de, capitalo.de) · **prüfen** |
| Haushaltsstrom | 37,3 ct je kWh im Schnitt 2026 | (F) BDEW-Strompreisanalyse 10/2026 |
| Sprit | Super E10 2,110 €, Diesel 2,255 € (ADAC-Woche 21.10.2026); September-Mittel E10 2,266 € | (F laut Suchauszug, ADAC) · Oktober-Mittel **prüfen** |
| Dienstwagen | 1 % Listenpreis plus 0,03 % je km Arbeitsweg; E-Auto 0,25 % | (F laut Ratgebern, steuerschroeder.de) · **prüfen** |
| Aktivrente | 2.000 € Freibetrag im Monat für Arbeit nach der Regelaltersgrenze seit 2026 | (F laut firmenauto.de) · **prüfen**; nur Wissen, kein eigenes Video |
| Streichpreis | Bezug ist der niedrigste Preis der letzten 30 Tage | (F) § 11 PAngV |
| Netto-Beispiele | 3.500 € brutto = 2.333,25 € netto; +300 € = +164,17 €; 4.000 € = 2.605,50 €; 3.000 € = 2.054,42 € (Steuerklasse 1, kinderlos) | Rechnung, Netto-Modul PAP 2026 (`pipeline/sim/netto.mjs`) |
| Mieten, Autokosten, Gerätepreise, Studienwerte | je Zeile in `kernzahl_bzw_twist` | (S) bzw. (B) · **prüfen** |

### Quellenlinks der Zahlen (Stand 02.11.2026)
- Mindestlohn: bundesregierung.de/breg-de/bundesregierung/bundeskanzleramt/mindestlohn-steigt-2391010
- Minijob-Grenze: deutsche-rentenversicherung.de/Rheinland/DE/Presse/Pressemitteilungen/2025/25-11-21-mindestlohn.html
- Entfernungspauschale: steuerzahler.de (BdSt-Info für Arbeitnehmer März 2026, Pendlerpauschale, PDF)
- Homeoffice, Pauschbetrag, Grundfreibetrag: deutschland-rechner.de/pendlerpauschale-rechner
- Deutschlandticket: regional.bahn.de/tickets/Deutschlandticket
- Rundfunkbeitrag: zdfheute.de (Rundfunkbeitrag ARD ZDF), berliner-zeitung.de (Kommission empfiehlt Rundfunkgebühr von 18,64 Euro ab 2027)
- Rentenwert: deutsche-rentenversicherung.de/DRV/DE/Ueber-uns-und-Presse/Presse/Meldungen/2026/260305-rentenanpassung-2026.html
- Rentenabschlag: gesetze-im-internet.de/sgb_6/__77.html
- EZB: biallo.de/geldanlage/news/ezb-haelt-leitzins-konstant/
- Dispo/Ratenkredit: bankdaten.de/ratgeber/dispozinsen.html, capitalo.de/kredit/ratgeber/kreditzinsen
- Haushaltsstrom: bdew.de/media/documents/BDEW_Strompreisanalyse_102026_1.pdf
- Sprit: adac.de/verkehr/tanken-kraftstoff-antrieb/kraftstoffpreisentwicklung/
- Dienstwagen: steuerschroeder.de/PKW-Nutzung.html
- Aktivrente: firmenauto.de (Dienstwagen Aktivrentner, Freibetrag, geldwerter Vorteil 2026)
- Streichpreis: lxgesetze.de/pangv/11
- GTA-6-Release: rockstargames.com/newswire/article/ak3ak31a49a221/grand-theft-auto-vi-is-now-set-to-launch-november-19-2026 (Stand 31.10.)

### Werte mit „prüfen“ (vor der Produktion klären)
- Entfernungspauschale (am Gesetz) · Homeoffice-Pauschale, Arbeitnehmer-Pauschbetrag, Grundfreibetrag · Deutschlandticket 2027 · EZB-Einlagensatz (auf ecb.europa.eu) · Dispozins/Ratenkredit · Sprit Oktober-Mittel · Dienstwagen-Sätze · Aktivrente.
- Termine: GTA-6-Release 19.11. (zweimal verschoben, am 18.11. prüfen) · Steuerklassen-Wechsel bis 30.11. (§ 39 Abs. 6 EStG prüfen).
- Je Video: Spalte `quellen_pruefen` des Plans ([[Themenplan Simulierbar]]); Mieten, Autokosten, Gerätepreise, Studienwerte sind (S) bzw. (B). Offener Punkt im Stand 02.11.: diese Werte je Video klären.

## 7. Was aus dem alten Plan wurde (02.11.)
| Ergebnis | Anzahl | Themen |
|---|---|---|
| übernommen | 10 | Mittagessen (halb gebaut, 03.11.), Gemeinsame Kasse, Steuerklasse (wegen Frist auf 20.11.), Ein Zimmer heizen, Winterjacke, Hund oder Katze, Stoßlüften, Leitungswasser, Dispo oder Ratenkredit, Wichteln |
| zu einer neuen Geld-Frage umgebaut | 5 | Singles Day → Zusammenziehen; 5 % mehr Gehalt → Jobwechsel oder bleiben; Fitnessstudio oder joggen → Vertragslaufzeit; Streichpreis-Check → Black Friday oder Januar; Parkplatzsuche → Parkhaus oder suchen (mit Euro) |
| Reserve | 6 | Monopoly, Kfz-Schaden, Kühlschrank, Bohrmaschine, Kreditkarte, 600 km Auto oder Bahn |
| raus: kein Euro-Ergebnis | 28 | Schere-Stein-Papier, Rad oder Auto, Ziegenproblem, Mensch ärgere dich nicht, Kreisverkehr, Geburtstagsparadoxon, Haltestelle, Morgens im Bad, Zu viele Köche, Schiffe versenken, Elfmeter, 37-%-Regel, Kassenschlange, Memory, Saugroboter, Kniffel, Kaffeekasse, Best-of, Führerscheinprüfung raten, Rolltreppe, Boarding, Reise nach Jerusalem, Klobrille, Baustelle 60/80, Kuchen teilen, Weihnachtsmarkt, Karten mischen, Strohhalm |
| raus: Konkurrenz | 7 | Ausbildung oder Studium, Wäschetrockner, Ganzjahresreifen, Tanken vor 12, 10 km/h langsamer, 25 gegen 35 sparen, 0-%-Finanzierung (siehe Abschnitt 3) |
| raus: aufgegangen oder schwach | 8 | 4-Tage-Woche (in Teilzeit), Pendlerpauschale (in Pendeln, Homeoffice, Fahrgemeinschaft), Stadt oder Land (in Jobangebot und Pendeln), Weihnachtsgeld netto (ersetzt durch Prämie gegen 50 €), Heizung 1 Grad (Umfeld Nachtabsenkung, erwartbar), Marke oder Eigenmarke (ersetzt durch Großpackung), Arbeitsstunden-Preise (kein Duell), GTA 6 Deutschland krankfeiern (schiefer Vergleich und Nähe zu Täuschung; der Release-Termin trägt jetzt „Konsole oder Gaming-PC“) |

Von 64 offenen Themen des alten Plans sind 10 übernommen, 5 umgebaut, 6 in der Reserve, 43 raus (7 + 28 + 8).

### Halb gebaute Projekte in `pipeline/projekte/`
- `mittagessen-job`: Geld, Modell mit 13 Tests fertig, **eingeplant am 03.11. abends**. Die Collage-Szene (Stil 6) gilt nicht mehr; die Szene wird im Stil 19 Architekturmodell neu gebaut (Wohnungs- und Büro-Schnitt mit Küche, Lieferung und warmem Innenlicht). Modell und Skript bleiben.
- `schere-stein-papier`: kein Euro-Ergebnis, deshalb nicht im Plan. Clay (Stil 3) ist für Simulierbar nicht mehr erlaubt (Inhaber 02.11.); das Modell bleibt für einen späteren Alltag-Slot liegen und bekommt dann einen der Stile 17–21.
- `leichtes-auto` und `boden-durchsichtig`: „Stell dir vor …“-Themen im Format von Account 2, kein Geld, nicht im Simulierbar-Plan ([[Trennung der Accounts]]).
- Hinweis: „Rente mit 63“ (04.11.) ist politiknah: nur Rechnung, keine Partei, keine Wertung (Tausch mit Reserve R7 oder R14 möglich).

## Siehe auch
- [[Themenplan Simulierbar]] · [[Konkurrenz und Themen Simulierbar]] · [[Maßstab Simulierbar]] · [[Videoaufbau Simulierbar]] (Themen-Logik)
- [[Trend-Radar]] · [[Plattformregeln und Posting]] · [[CRP Creator Rewards Program]] · [[Arbeitsregeln und Sicherheit]] · [[Account Simulierbar Überblick]]
