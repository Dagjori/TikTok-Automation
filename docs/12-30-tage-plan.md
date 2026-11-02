# 30-Tage-Plan · Simulierbar (03.11.–02.12.2026) · Schwerpunkt Geld

**Stand:** 02.11.2026, komplett neu; Stile am 02.11. auf die seriösen Stile 17–21 umgestellt (Inhaber: weg vom Cartoon-Look, Licht und Atmosphäre, keine Sticker) · **Status:** Reihenfolge der nächsten Videos (Produktion am Vortag, 2 Videos pro Tag) · **Daten:** [`data/plan/30-tage.csv`](../data/plan/30-tage.csv) (81 Zeilen: 6 unveränderte vom 31.10.–02.11., 60 neue, 15 Reserve) und [`data/plan/simulierbar-plan.json`](../data/plan/simulierbar-plan.json) (die 75 neuen Einträge mit `caption_vorschlag`) · **PDF:** [`docs/plan/30-tage-plan.pdf`](plan/30-tage-plan.pdf) (neu erzeugen: `node tools/plan_pdf.mjs`)

**Auftrag des Inhabers (02.11.):** klarer Schwerpunkt Geld, Konkurrenz anhand der Skripte ansehen, in deren Themenfeld gehen, aber nur neue Ideen; kompletter Plan neu, die heutigen Videos bleiben.

**Legende:** **(F)** belegter Fakt mit Quelle · **(S)** Schätzung · **(A)** Annahme · **(B)** Beispielwert, wird vor der Produktion gerechnet · **Rechnung** eigene Rechnung (z. B. Netto-Modul `pipeline/sim/netto.mjs`, PAP 2026) · **prüfen** vor der Produktion klären.

## 1. Kurzfazit

- **Jedes der 60 Videos endet mit einem Ergebnis in Euro auf der Anzeigetafel.** 53 sind Rubrik GELD, 7 sind Alltagsentscheidungen „Zeit gegen Geld“, die ebenfalls in Euro ausgehen.
- **Jedes Duell vergleicht zwei echte Alternativen derselben Entscheidung** (z. B. Minijob oder Überstunden für denselben Zusatzverdienst). Die Prüfung steht je Zeile in `konkurrenz_check` („Themen-Logik: …“). Schiefe Vergleiche wie „Steuererklärung oder Überstunden“ gibt es nicht mehr.
- **Nur neue Themen.** Ich habe 14 deutsche Geld- und Simulationskonten über ihre öffentlichen Profil-Embeds und Videoseiten geprüft (Abschnitt 3.4). Alles, was dort schon lief, ist gesperrt, auch der Plan-Vorgänger „Ausbildung oder Studium“ (@kontostand.vs, 359k Aufrufe, F).
- **Was zieht (F, Aufrufzahlen 02.11.):** große Lebensentscheidungen mit großer Endzahl: Mieten oder kaufen 617k, Leasing 363k, Studium oder Ausbildung 359k, E-Auto oder Benziner 198k. Kleine Spartipps derselben Konten bleiben meist unter 5k. **Deshalb liegen Gehalt, Rente, Wohnen und Auto in den ersten 10 Tagen** (Ø Score 86,4 gegenüber 80,3 danach, S).
- **Ø Maßstab-Score 82,3 (S), Spanne 75–92.** Kein Video unter 75.
- **Termine:** Singles Day 11.11., GTA-6-Release 19.11., Steuerklassen-Frist 30.11. (Video 20.11.), Kfz-Stichtag 30.11. (Video 23.11.), Black Friday 27.11. (Videos 24. und 27.11.), Weihnachtsgeld-Zeit (26.11.), Monatsende (28.11.), 1. Advent 29.11., Cyber Monday 30.11., Jahresende-Steuer (01.12.). Kein Kaufaufruf.
- **Größtes Risiko:** Kapazität. 179 Std. Agentenarbeit (S) plus themenspezifische Objekte in den neuen Stilen 17–21 und ca. 80–120 Std. Renderzeit in der Cloud (S, Abschnitt 4). Der Windows-PC mit GPU würde den Engpass lösen.

### Die 5 stärksten Videos (S, Maßstab-Score, keine Messdaten)

| # | Termin | Video | Score | Warum |
|---|---|---|---|---|
| 1 | Do 05.11., 19:30 | Minijob oder Überstunden: Womit bleiben dir von 300 € mehr wirklich übrig? | 92 | Von 300 € Überstunden bleiben 164,17 €, vom Minijob ca. 289–300 € (Rechnung, Netto-Modul). Fast doppelt, jeder Angestellte kennt die Frage |
| 2 | Di 03.11., 12:30 | Eigenes Auto oder jede Fahrt mit dem Taxi: Was ist in der Stadt wirklich billiger? | 90 | Starke Denkfalle („Taxi ist Luxus“), die Antwort kippt mit der Fahrleistung |
| 3 | Sa 07.11., 19:30 | 3.000 € in München oder 2.600 € in Leipzig: Bei welchem Jobangebot bleibt dir mehr? | 90 | Vom Gehaltsvorsprung bleiben netto 228 € (Rechnung), die Miete dreht das Ergebnis (B) |
| 4 | Mi 04.11., 19:30 | Rente mit 63 oder mit 67: Wer hat am Ende wirklich mehr Geld bekommen? | 89 | Echtes Rennen gegen die Lebensuhr, Führungswechsel mit ca. 81 (B, Rentenwert 42,52 € F) |
| 5 | Do 05.11., 12:30 | Parkhaus oder Parkplatz suchen: Was kostet dich die Runde um den Block wirklich? | 88 | Uhr und Euro-Zähler, jeder Autofahrer kennt es (ALLTAG mit Euro-Ergebnis) |

Ebenfalls 88: Teilzeit oder Vollzeit (07.11.), Freelancer oder angestellt (08.11.), Pendeln oder näher ziehen (10.11.).

## 2. Wochenübersicht

Uhrzeiten aus [`data/plan/posting_zeiten.json`](../data/plan/posting_zeiten.json): Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30 (Europe/Berlin). Je Zelle: Nummer, Thema, Maßstab-Score, Stil; **A** = Priorität A (Termin oder Top-Thema, bleibt fix). Zeilen 31.10.–02.11. bleiben unverändert (gepostet bzw. in Buffer eingeplant).

**Woche 1 · Di 03.–So 08.11.**

| Tag | Mittag (12:30, Sa/So 09:30) | Abend (19:30) |
|---|---|---|
| Di 03.11. | #1 Eigenes Auto oder jede Fahrt mit dem Taxi · 90 · Stil 17 · **A** | #2 Mittagessen im Job · 83 · Stil 19 · **A** |
| Mi 04.11. | #3 Großpackung oder zwei kleine · 85 · Stil 18 | #4 Rente mit 63 oder mit 67 · 89 · Stil 20 · **A** |
| Do 05.11. | #5 Parkhaus oder Parkplatz suchen · 88 · Stil 17 · ALLTAG | #6 Minijob oder Überstunden · 92 · Stil 18 · **A** |
| Fr 06.11. | #7 Handy mit Vertrag oder selbst kaufen · 87 · Stil 20 · **A** | #8 Kleinste Schulden zuerst oder die teuersten · 86 · Stil 18 |
| Sa 07.11. | #9 Teilzeit oder Vollzeit · 88 · Stil 19 · **A** | #10 3.000 € in München oder 2.600 € in Leipzig · 90 · Stil 21 · **A** |
| So 08.11. | #11 Heißluftfritteuse oder Backofen · 83 · Stil 20 | #12 50 € pro Stunde als Freelancer oder 30 € als Angestellter · 88 · Stil 18 · **A** |

**Woche 2 · Mo 09.–So 15.11.**

| Tag | Mittag (12:30, Sa/So 09:30) | Abend (19:30) |
|---|---|---|
| Mo 09.11. | #13 Super E10 oder E5 · 84 · Stil 17 | #14 WG-Zimmer oder eigene Wohnung · 84 · Stil 19 |
| Di 10.11. | #15 40 km pendeln oder näher ziehen · 88 · Stil 21 · **A** | #16 Dienstwagen oder 500 € mehr Gehalt · 86 · Stil 18 |
| Mi 11.11. | #17 Zusammenziehen oder getrennt wohnen · 83 · Stil 19 · **A** | #18 Alle drei Jahre den Job wechseln oder bleiben · 86 · Stil 20 |
| Do 12.11. | #19 Selbst umziehen oder Umzugsfirma · 83 · Stil 19 · ALLTAG | #20 Homeoffice oder Büro · 85 · Stil 21 |
| Fr 13.11. | #21 Winterreifen selbst wechseln oder Werkstatt · 79 · Stil 17 · ALLTAG | #22 Kapselmaschine oder Vollautomat · 82 · Stil 20 |
| Sa 14.11. | #23 Gemeinsame Kasse 50/50 oder nach Einkommen · 81 · Stil 18 | #24 Werkstudent oder Minijob im Studium · 80 · Stil 20 |
| So 15.11. | #25 Ein Zimmer heizen oder alle gleichmäßig · 81 · Stil 19 | #26 Altes Handy in der Schublade · 80 · Stil 18 |

**Woche 3 · Mo 16.–So 22.11.**

| Tag | Mittag (12:30, Sa/So 09:30) | Abend (19:30) |
|---|---|---|
| Mo 16.11. | #27 Saisonkennzeichen oder ganzjährig · 75 · Stil 17 | #28 3 % mehr Gehalt oder 5 Tage mehr Urlaub · 83 · Stil 20 |
| Di 17.11. | #29 Billige oder teure Winterjacke · 80 · Stil 18 | #30 Notgroschen auf dem Girokonto oder auf dem Tagesgeld · 77 · Stil 20 |
| Mi 18.11. | #31 Hund oder Katze · 79 · Stil 19 | #32 E-Bike oder Zweitwagen · 81 · Stil 17 |
| Do 19.11. | #33 Konsole oder Gaming-PC · 81 · Stil 18 · **A** | #34 Staffelmiete oder Indexmiete · 78 · Stil 19 |
| Fr 20.11. | #35 Lebensmittel liefern lassen oder selbst einkaufen · 80 · Stil 17 · ALLTAG | #36 Steuerklasse 3/5 oder 4/4 · 80 · Stil 18 · **A** |
| Sa 21.11. | #37 Waschmaschine kaputt · 82 · Stil 19 | #38 Fahrgemeinschaft oder allein zur Arbeit · 82 · Stil 21 |
| So 22.11. | #39 Haare selbst schneiden oder Friseur · 79 · Stil 18 · ALLTAG | #40 E-Bike über den Arbeitgeber leasen oder selbst kaufen · 82 · Stil 17 |

**Woche 4 · Mo 23.–So 29.11.**

| Tag | Mittag (12:30, Sa/So 09:30) | Abend (19:30) |
|---|---|---|
| Mo 23.11. | #41 Brille oder Kontaktlinsen · 79 · Stil 20 | #42 Kfz-Versicherung jährlich oder monatlich zahlen · 83 · Stil 18 · **A** |
| Di 24.11. | #43 Black Friday oder Januar · 83 · Stil 17 · **A** | #44 All-inclusive oder Ferienwohnung · 81 · Stil 19 |
| Mi 25.11. | #45 Stoßlüften oder Kippfenster · 80 · Stil 20 | #46 Führerschein jetzt oder in drei Jahren · 79 · Stil 17 |
| Do 26.11. | #47 Leitungswasser oder Wasser aus dem Kasten · 80 · Stil 20 | #48 Einmal 1.000 € Prämie oder 50 € mehr im Monat · 86 · Stil 18 · **A** |
| Fr 27.11. | #49 45 % Rabatt oder erst 25 % und dann 20 % extra · 84 · Stil 17 · **A** | #50 Fitnessstudio für 24 Monate oder monatlich kündbar · 82 · Stil 20 |
| Sa 28.11. | #51 Waschsalon oder eigene Waschmaschine · 75 · Stil 17 | #52 Dispo oder Ratenkredit · 77 · Stil 18 |
| So 29.11. | #53 Echter Weihnachtsbaum oder künstlicher · 83 · Stil 19 · **A** | #54 Selbst streichen oder Maler · 77 · Stil 18 · ALLTAG |

**Woche 5 · Mo 30.11.–Mi 02.12.**

| Tag | Mittag (12:30, Sa/So 09:30) | Abend (19:30) |
|---|---|---|
| Mo 30.11. | #55 Garantieverlängerung oder Risiko selbst tragen · 82 · Stil 20 | #56 Wichteln oder jeder beschenkt jeden · 85 · Stil 19 · **A** |
| Di 01.12. | #57 Laptop für den Job im Dezember oder im Januar kaufen · 76 · Stil 18 | #58 Putzhilfe oder selbst putzen · 79 · Stil 19 · ALLTAG |
| Mi 02.12. | #59 52-Wochen-Challenge oder fester Dauerauftrag · 79 · Stil 20 | #60 Gutschein oder Bargeld schenken · 79 · Stil 18 |

## 3. Begründung

### 3.1 Warum Geld und was bei der Konkurrenz zieht

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

### 3.2 Auswahlregeln für jedes Thema

1. **Ergebnis in Euro** auf der Anzeigetafel, auch bei den 7 Alltagsentscheidungen (Zeit wird mit Mindestlohn 13,90 € oder dem Netto-Stundenlohn aus dem Netto-Modul in Euro umgerechnet).
2. **Themen-Logik (Inhaber 02.11.):** Beide Seiten sind Alternativen derselben Entscheidung, die sich ausschließen bzw. gegeneinander abgewogen werden. Geprüft und notiert in `konkurrenz_check`.
3. **Nur neue Ideen:** nicht auf der Sperrliste (3.4), nicht in §9 des Maßstabs. Wo ein Nachbarthema existiert, steht der eigene Winkel in `konkurrenz_check`.
4. **Finanz-Regeln** (3.6): nur Modellrechnung, keine Produkte, Anbieter, Banken, Coins oder Aktien, kein Kaufaufruf, kein „schnell reich“.
5. **Maßstab-Score** nach dem bisherigen Raster (D 30, K 25, B 20, L 15, F 10, S). Unter 60 fliegt ein Thema raus; im Plan liegt keins unter 75.

### 3.3 Mix, Reihenfolge, Stile, Teamfarben

- **Mix:** 53 GELD, 7 ALLTAG mit Euro-Ergebnis (Parkhaus, Umzug, Reifenwechsel, Lieferdienst, Friseur, Streichen, Putzhilfe). Die Rubrik ist nur intern.
- **Themenfelder:** Konsum und Haushalt (14), Arbeit und Gehalt (13), Auto und Wege (10), Wohnen und Energie (10), Alltag und Familie (9), Schulden und Sparen (4). Zwei direkt aufeinanderfolgende Videos haben nie dasselbe Feld (per Skript geprüft).
- **Reihenfolge:** Die stärksten Lebensentscheidungen kommen in den ersten 10 Tagen (Ø 86,4, S). Termin-Videos liegen auf festen Tagen und haben Priorität A (18 Videos).
- **Netto-Modul** (`pipeline/sim/netto.mjs`, PAP 2026, mit Tests) rechnet 12 Videos direkt (Minijob, Teilzeit, Jobangebot, Freelancer, Dienstwagen, Homeoffice, Werkstudent, Gehalt gegen Urlaub, Steuerklasse, Dienstrad, Prämie, Laptop) und liefert in 7 weiteren den Netto-Stundenlohn für die Zeitbewertung (Mittagessen, Umzug, Reifen, Lieferdienst, Friseur, Streichen, Putzhilfe).
- **Stile** (`docs/10` §0, Skill `.claude/skills/simulierbar-video/stile.md`; nie zweimal hintereinander, auch nicht über die Grenze 02./03.11., per Skript geprüft). **Neu 02.11.:** Der Inhaber will weg vom Cartoon- und Clay-Look, hin zu seriösen, hochwertigen Animationen mit Licht und Atmosphäre und ohne Sticker. Deshalb laufen alle Videos ab 03.11. in den neuen Stilen 17–21 (Baukästen `pipeline/engine/stil_*.js` mit `sim_atmosphaere.js`, Demo `pipeline/projekte/_demo-simulierbar/`). Die alten Stile 1–4, 6 und 8–15 sind für Simulierbar nicht mehr erlaubt; Blaupause (13) bleibt nur als „Warum?“-Einschub, Typografie (7) nur als HUD-Baustein.

| Stil | Videos | Erster Einsatz |
|---|---|---|
| 17 Nachtstadt-Miniatur | 12 | Di 03.11. |
| 18 Dunkles Studio (Produktlicht) | 17 | Mi 04.11. |
| 19 Architekturmodell (Abendlicht) | 13 | Di 03.11. |
| 20 Glas & Licht | 14 | Mi 04.11. |
| 21 Nachtkarte | 4 | Sa 07.11. |

- **Baukästen:** Alle fünf Stile haben seit 02.11. einen Grund-Baukasten mit Demo-Szene (`docs/10` §0). Beim ersten Einsatz je Stil kommen die themenspezifischen Objekte dazu (z. B. Zapfsäule für E10/E5, Brotdose und Lieferbeutel für das Mittagessen), Schätzung 1–3 Std. je Video zusätzlich.
- **Nicht eingeplant:** alle alten Stile 1–15 als Hauptstil (Inhaber 02.11., `docs/10` §0). Neon (5) und Typografie (7) sind Daten- bzw. Text-Looks; der Inhaber will die Kunst in der animierten Welt sehen, nicht in Einblendungen. Stil 16 gehört zu Account 2. Nachtkarte (21) kommt nur 4-mal vor, weil nur wenige Themen echte Orte und Wege haben; die Reserve hat drei weitere Karten-Themen.
- **Teamfarben:** zwei feste Farben je Video aus einer Palette ohne Gelb (Blau, Orange, Türkis, Koralle, Violett, Grün, Pink, Petrol, Rot, beim Mittagessen Magenta wie im Projekt). Gelb bleibt dem aktuellen Untertitel-Wort vorbehalten.

### 3.4 Konkurrenz-Sperrliste

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
| Maßstab K1–K4 (Regen, Pausen, Tsunami, Duschen) | docs/15 §9 · @kurzsimuliert 2,1 Mio. / 467.800 / 403.000 | weiter gesperrt |

### 3.5 Was aus dem alten Plan wird (64 offene Zeilen)

| Ergebnis | Anzahl | Themen |
|---|---|---|
| übernommen | 10 | Mittagessen (halb gebaut, 03.11.), Gemeinsame Kasse, Steuerklasse (wegen Frist auf 20.11.), Ein Zimmer heizen, Winterjacke, Hund oder Katze, Stoßlüften, Leitungswasser, Dispo oder Ratenkredit, Wichteln |
| zu einer neuen Geld-Frage umgebaut | 5 | Singles Day → Zusammenziehen; 5 % mehr Gehalt → Jobwechsel oder bleiben; Fitnessstudio oder joggen → Vertragslaufzeit; Streichpreis-Check → Black Friday oder Januar; Parkplatzsuche → Parkhaus oder suchen (mit Euro) |
| Reserve | 6 | Monopoly, Kfz-Schaden, Kühlschrank, Bohrmaschine, Kreditkarte, 600 km Auto oder Bahn |
| raus: kein Euro-Ergebnis | 28 | Schere-Stein-Papier, Rad oder Auto, Ziegenproblem, Mensch ärgere dich nicht, Kreisverkehr, Geburtstagsparadoxon, Haltestelle, Morgens im Bad, Zu viele Köche, Schiffe versenken, Elfmeter, 37-%-Regel, Kassenschlange, Memory, Saugroboter, Kniffel, Kaffeekasse, Best-of, Führerscheinprüfung raten, Rolltreppe, Boarding, Reise nach Jerusalem, Klobrille, Baustelle 60/80, Kuchen teilen, Weihnachtsmarkt, Karten mischen, Strohhalm |
| raus: Konkurrenz | 7 | Ausbildung oder Studium, Wäschetrockner, Ganzjahresreifen, Tanken vor 12, 10 km/h langsamer, 25 gegen 35 sparen, 0-%-Finanzierung (siehe 3.4) |
| raus: aufgegangen oder schwach | 8 | 4-Tage-Woche (in Teilzeit), Pendlerpauschale (in Pendeln, Homeoffice, Fahrgemeinschaft), Stadt oder Land (in Jobangebot und Pendeln), Weihnachtsgeld netto (ersetzt durch Prämie gegen 50 €), Heizung 1 Grad (Umfeld Nachtabsenkung, erwartbar), Marke oder Eigenmarke (ersetzt durch Großpackung), Arbeitsstunden-Preise (kein Duell), GTA 6 Deutschland krankfeiern (schiefer Vergleich und Nähe zu Täuschung; der Release-Termin trägt jetzt „Konsole oder Gaming-PC“) |

**Halb gebaute Projekte in `pipeline/projekte/`:**
- `mittagessen-job`: Geld, Modell mit 13 Tests fertig, **eingeplant am 03.11. abends**. Die Collage-Szene (Stil 6) gilt nicht mehr; die Szene wird im Stil 19 Architekturmodell neu gebaut (Wohnungs- und Büro-Schnitt mit Küche, Lieferung und warmem Innenlicht). Modell und Skript bleiben.
- `schere-stein-papier`: kein Euro-Ergebnis, deshalb nicht im Plan. Clay (Stil 3) ist für Simulierbar nicht mehr erlaubt (Inhaber 02.11.); das Modell bleibt für einen späteren Alltag-Slot liegen und bekommt dann einen der Stile 17–21.
- `leichtes-auto` und `boden-durchsichtig`: „Stell dir vor …“-Themen im Format von Account 2, kein Geld, nicht im Simulierbar-Plan.

### 3.6 TikTok-Regeln für Finanzinhalte (F, TikToks eigene Seiten, abgerufen 02.11.2026)

| Regel | Quelle | Folge für uns |
|---|---|---|
| Nicht erlaubt: Finanzbetrug wie falsche Anlageangebote und „get-rich-quick“-Maschen, Multi-Level-Marketing | [Community Guidelines, Regulated Goods and Commercial Activities, Frauds and Scams](https://www.tiktok.com/community-guidelines/en/regulated-commercial-activities) (veröffentlicht 25.08.2026, gültig ab 24.09.2026) | kein „schnell reich“, kein passives Einkommen, keine Nebenverdienst-Maschen |
| Eigene Produkte und bezahlte Inhalte kennzeichnen | ebenda, Commercial Disclosure | wir zeigen keine Produkte und haben keine Kooperationen |
| Branded Content: Pyramidensysteme, MLM, „zu gut, um wahr zu sein“, Payday-Kredite, „get-rich-quick“ verboten; Finanzdienstleistungen (Kredite, Kreditkarten, Versicherungen, Anlagen) in Deutschland nur 18+ und auf den Markt beschränkt | [Branded Content Policy](https://www.tiktok.com/legal/page/global/bc-policy/en) (gültig ab 30.10.2026) | keine Banken, Versicherer, Broker, Coins; Begriffe wie „Dienstrad“ statt Markennamen |
| Keine Falschinformation mit erheblichem Schaden; bei mäßigem Schaden nicht im Für-dich-Feed | [Community Guidelines, Integrity and Authenticity](https://www.tiktok.com/community-guidelines/en/integrity-authenticity) · [FYF-Standards](https://www.tiktok.com/community-guidelines/en/fyf-standards) | jede Zahl belegt oder als Modell gekennzeichnet, Werte „prüfen“ vor der Produktion klären |
| CRP: mindestens 1 Minute, mindestens 1.000 qualifizierte Aufrufe, keine Werbung oder Sponsoring, original, hohe Qualität | [Creator Rewards Program Terms EEA](https://www.tiktok.com/legal/page/global/tiktok-creator-rewards-program-eea/en) | 65–80 s, eigene Rechnung, kein Kaufaufruf |

**Deshalb verworfen (neue Ideen):** Lotto oder Sparen, Sportwetten, Lootboxen (Glücksspiel, auch K.-o. in `docs/07`), Krypto und Einzelaktien, ETF-Sparplan-Vergleiche (Anlageberatungs-Nähe, außerdem bei @geldsimuliert und @kontostand.vs besetzt), Bürgergeld gegen Arbeit (politisch, bei @kontostand.vs), „Nebenverdienst-Ideen“ und passives Einkommen (get-rich-quick), Augenlasern gegen Brille (Gesundheitsnähe), Kredit- oder Kartenvergleiche mit Anbietern.

### 3.7 Zahlen für Deutschland 2026

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

### 3.8 Feste Termine (ohne Kaufaufruf)

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

## 4. Kapazität (S)

- **Agentenarbeit:** 10 Videos mit Aufwand 2 (1,5 Std.), 43 mit 3 (3 Std.), 7 mit 4 (5 Std.) = **ca. 179 Std.** in 30 Tagen, also ca. 6 Std. pro Tag für 2 Videos (S, Raster wie bisher).
- **Stil-Baukästen:** Die fünf neuen Stile 17–21 haben seit 02.11. einen Grund-Baukasten (`sim_atmosphaere.js` und je Stil ein Modul). Themenspezifische Objekte kommen beim ersten Einsatz dazu, ca. 1–3 Std. je Video (S).
- **Render in der Cloud ohne GPU:** gemessene Sekunden je Bild der neuen Stile siehe `docs/10` §0 (Demo-Messung 02.11.); gemessen 1,7–4,0 s je Bild (Ø ca. 2,5 s), damit ergeben die 60 Videos beim Cloud-Rückfall **ca. 100 Std.**, also ca. 3,3 Std. pro Tag (S). Standard ist der Render-Dienst auf dem Windows-PC mit GPU (`docs/18-render-pc.md`), dort unkritisch.
- **Regel des Inhabers (02.11.):** höchstens 4 Videos gleichzeitig in Arbeit, höchstens 2 Produktions-Agenten (Sonnet), gestaffelt. Erstbauten mit Opus.
- **Stimme:** ca. 170–220 Wörter je Video wie bisher; bei Bedarf nächstgrößerer ElevenLabs-Plan (CLAUDE.md).
- **Inhaber:** nichts zu tun außer dem Startsignal; Claude prüft und plant selbst in Buffer ein.

## 5. Reserve (15 Themen)

| # | Thema | Rubrik | Score | Warum Reserve |
|---|---|---|---|---|
| R1 | Monopoly: Schlossallee oder die orangen Straßen, was bringt wirklich mehr Spielgeld? | ALLTAG | 86 | Spielgeld statt echter Euro, Markenname; nur wenn ein Alltag-Slot frei wird |
| R2 | Kfz-Schaden selbst zahlen oder der Versicherung melden: Was kostet die Rückstufung wirklich? | GELD | 78 | Thema bei @clauseinars; nur mit eigenem Winkel über 10 Jahre |
| R3 | Stromtarif: Grundversorgung oder Neukundentarif, was kostet dich das Nichtstun im Jahr? | GELD | 78 | Nähe zu Anbieterwerbung; nur ohne Aufruf und ohne Anbieter |
| R4 | Krankenkasse wechseln oder bleiben: Was bringt ein niedrigerer Zusatzbeitrag wirklich? | GELD | 77 | Zusatzbeiträge 2027 stehen erst im Dezember fest; Anbieter-Nähe |
| R5 | Alter Kühlschrank oder neuer: Ab wann zahlt sich der Tausch wirklich aus? | GELD | 75 | aus altem Plan; Energie-Themen im Plan dicht |
| R6 | Bohrmaschine kaufen oder leihen: Ab wie vielen Löchern lohnt sich die eigene? | GELD | 73 | aus altem Plan; trägt kaum 65 s |
| R7 | Kreditkarte: Mindestrate oder feste 100 €, wer ist zuerst schuldenfrei? | GELD | 81 | aus altem Plan; Schulden-Themen im Plan schon zweimal |
| R8 | Große Hochzeit oder kleine Feier plus Eigenkapital: Was kostet das Fest nach 10 Jahren? | GELD | 77 | Themen-Logik grenzwertig; vor Einsatz mit dem Inhaber klären |
| R9 | Möbel selbst aufbauen oder Aufbauservice: Was kostet dich der Schrank wirklich? | ALLTAG | 76 | Alltag-Quote im Plan schon bei 7 |
| R10 | Wohnmobil mieten oder Hotel: Was kostet die Urlaubswoche wirklich? | GELD | 79 | Sommer-Thema, für März/April |
| R11 | Second Hand oder neu: Was kostet dich Kleidung im Jahr wirklich? | GELD | 77 | nah an der Winterjacke (17.11.) |
| R12 | Bonus auszahlen oder in die Betriebsrente: Was bleibt dir am Ende wirklich? | GELD | 74 | Nähe zu Vorsorgeprodukten; nur reine Modellrechnung |
| R13 | Weihnachtsfahrt mit der Bahn: Früh buchen oder kurz vorher? | GELD | 74 | Preisdaten nicht öffentlich belegbar |
| R14 | Nachtschicht mit Zuschlag oder Tagschicht: Was bleibt netto wirklich mehr? | GELD | 78 | kleinere Zielgruppe |
| R15 | 600 km nach Hause: Auto oder Bahn, was ist schneller und günstiger? | GELD | 80 | nah an @wissentogo_de (56,5k); nur mit eigenem Winkel |

## 6. Nächste Schritte

| # | Schritt | Wer | Zeit (S) |
|---|---|---|---|
| 1 | Plan abnehmen; bei Einwänden einzelne Zeilen gegen die Reserve tauschen | Inhaber | 10 Min. |
| 2 | Nach Startsignal: 03.11. produzieren (#1 Taxi, Stil 17; #2 Mittagessen Neustart, Stil 19) nach Skill `simulierbar-video` | Claude (Sonnet) | ca. 5 Std. plus Render |
| 3 | Themenspezifische Objekte je Stil beim ersten Einsatz ergänzen (z. B. Zapfsäule, Lieferbeutel), Baukästen bleiben wiederverwendbar | Claude (Opus bei neuen Objekttypen) | 1–3 Std. je Video |
| 4 | Werte mit „prüfen“ je Video am Vortag klären (Quellen in `skript.json`) | Claude | in der Produktion enthalten |
| 5 | Nach 14 Tagen (16.11.): Aufrufe nach 2 und 24 Std. je Video auswerten, Reihenfolge der Wochen 3–5 anpassen | Claude | 30 Min. |

## 7. Offene Punkte

1. **Werte mit „prüfen“** (je Zeile in `quellen_pruefen`), vor allem: Homeoffice-Pauschale und Pauschbetrag 2026, Dienstrad- und E-Dienstwagen-Regel 2026, Steuerklassen-Frist, Kfz-Stichtag, Reparaturbonus der Länder, Stand der Führerscheinreform, Tagesgeld-Schnitt und EZB-Beschluss auf der EZB-Seite, Mieten München/Leipzig, ADAC-Autokosten, Oktober-Mittel der Spritpreise, GTA-6-Termin am 18.11.
2. **Neue Stile 17–21 (02.11.):** Grund-Baukästen und Demo-Standbilder stehen; das erste echte Video je Stil zeigt, ob die Renderzeit pro Bild unter Volllast reicht. Fällt ein Stil aus, ist der Ersatz ein anderer der fünf Stile, der nicht am Nachbar-Slot liegt.
3. **Rente mit 63 (04.11.)** ist politiknah. Im Video gibt es nur die Rechnung, keine Partei und keine Wertung. Wenn du das Thema lieber meiden willst: Tausch mit Reserve R7 (Kreditkarte) oder R14 (Nachtschicht).
4. **Video vom 02.11. abends** („Steuererklärung oder Überstunden“) bleibt laut Auftrag unverändert. Die saubere Variante desselben Gedankens kommt am 05.11. (Minijob oder Überstunden).
5. **Konkurrenz-Check:** Das Embed zeigt nur die neuesten Videos je Konto (A). Ein älterer Hit eines Kontos kann fehlen. Der Trend-Radar prüft am Vortag jeder Produktion erneut; ein Treffer sperrt das Thema, dann kommt die Reserve.
6. **Monitor-Liste:** @humphreytalks und @simplysimulated sind als US-Ideenquelle geprüft, aber nicht in `data/monitor/kanaele.csv` eingetragen (nicht im Auftrag).
7. **Cockpit und Regelwerk** sind nicht angepasst (macht der Inhaber bzw. eine eigene Sitzung).
