# Designstile für Simulierbar

**Stand:** 31.10.2026 · **Status:** entschieden: Stil wechselt je Thema (Abschnitt 0)

**Legende:**
- **F** = belegter Fakt mit Quelle
- **S** = Schätzung
- **A** = Annahme

Alle Beispielbilder zeigen denselben Inhalt: das GELD-Duell „Deutschlandticket gegen Auto: Ab wann lohnt sich das Ticket?“. Die Zahlen (66,80 € und 214 € pro Monat, Break-even 13 Fahrten) sind **Beispielwerte**, keine Rechnung. Jedes Bild nutzt den neuen Untertitel-Stil.

![Alle Stile im Vergleich](assets/stile/uebersicht.jpg)

---

## 0. Entscheidung des Inhabers (31.10.2026): Stil-Katalog, Stil wechselt je Thema

- **Alle 8 Stile bleiben im Einsatz.** Jedes Video bekommt genau **einen** Stil, und zwar den, der am besten zum Thema passt. Es gibt keinen festen Hauptlook (die Empfehlung in Abschnitt 1 ist damit überholt).
- **Neue Stile kommen sofort in diesen Katalog**, sobald Claude einen weiteren passenden Stil findet: neue Zeile in der Tabelle unten, Beispielbild in `docs/assets/stile/`, Quellcode in `pipeline/stile/`.
- **Der Untertitel-Stil ist in allen Looks gleich** (ohne Kasten, Kontur, aktuelles Wort gelb).
- Im 30-Tage-Plan steht der Stil je Video in der Spalte `stil` (`data/plan/30-tage.csv`).

### Stil-Katalog und Auswahlregel

| Nr. | Stil | Beispiel | Passt zu (Auswahlregel) |
|---|---|---|---|
| 1 | Low-Poly-Miniatur (Tilt-Shift) | `assets/stile/stil_1_lowpoly.png` | Szenen mit vielen kleinen Akteuren in Bewegung: Verkehr, Straße, Menschenmengen, Stadtleben |
| 2 | Isometrisches 3D | `assets/stile/stil_2_isometrisch.png` | Systeme und Abläufe auf einen Blick: Büro, Kreuzung, Supermarkt, Wohnung im Schnitt, Boarding |
| 3 | Clay-Spielzeug-3D | `assets/stile/stil_3_clay.png` | Spiele, Zufall, Sport, Haushalt, Haustiere, Familie, Essen: verspielte Alltagsthemen |
| 4 | 2D-Flat-Infografik | `assets/stile/stil_4_flat.png` | Erklär-Rechnungen mit Schritten: Netto, Steuern, Regeln, Statistik, Ablaufpläne |
| 5 | Neon-Daten-Dashboard | `assets/stile/stil_5_neon.png` | Geld über Zeit: Zinsen, Schulden, Inflation, Sparen, Preisverläufe (braucht immer Bewegung) |
| 6 | Papier-Collage | `assets/stile/stil_6_collage.png` | News, Gesetze, Handel und Werbung, Debatten: Black Friday, Finanzierung, Abos, Singles Day |
| 7 | Kinetische Typografie | `assets/stile/stil_7_typo.png` | Eine starke Zahl oder ein Mythos: Netto-Schock, Wahrscheinlichkeits-Paradoxa, „Was kostet das in Arbeitsstunden“ |
| 8 | Karten-/Satellitenoptik | `assets/stile/stil_8_karte.png` | Orte, Wege, Regionen: Stadt gegen Land, Pendeln, Deutschland-Vergleiche, Wetter |

**Regeln bei der Wahl:**
- Zwei direkt aufeinanderfolgende Videos haben nie denselben Stil.
- Passen zwei Stile, gewinnt der, der länger nicht dran war.
- Typografie (7) darf als Baustein für Hook und Ergebnis in jedem Stil auftauchen.
- Jeder Stil braucht beim ersten Einsatz einen eigenen Szenen-Baukasten auf Basis der Beispielbilder in `pipeline/stile/` (**Schätzung:** 3–6 Std. Agentenarbeit je Stil). Danach ist er wiederverwendbar.

---

## 1. Kurzfazit und Empfehlung (Recherche-Stand vor der Entscheidung)

- **Empfehlung: Isometrisches 3D (Stil 2) als neuer Hauptlook für beide Rubriken.** Dazu kinetische Typografie (Stil 7) als festes Element für Hook und Ergebnis.
- **Warum Isometrie:**
  - Sie zeigt das ganze System auf einen Blick: alle Autos, Schlangen, Wege. Das passt zu Simulationen (A).
  - Sie hebt sich von der Low-Poly-Tilt-Shift-Welle ab. Diese stammt aus einer öffentlichen Vorlage, die auch die Konkurrenz nutzt (F, siehe [01-marktanalyse.md](01-marktanalyse.md)).
  - Sie rendert unter gleichen Bedingungen rund 7-mal schneller als unser aktueller Stil (gemessen: 0,74 s statt 5,5 s pro Bild, F, Messung unten).
- **Typografie für Hook und Ergebnis:** Riesige Zahlen sind auf dem Handy sofort lesbar. Der Baustein kostet fast keine Renderzeit (F, 0,23 s pro Bild).
- **Den aktuellen Low-Poly-Stil nicht sofort aufgeben.** Die ersten Videos sind fertig. Teste beide Looks in den nächsten Videos gegeneinander (siehe Schritt 4).
- **Ehrlicher Vorbehalt:** Es gibt keine Studie, die einen Stil als „bester für Views“ belegt. Belegt ist: Bewegung, erkennbare Objekte und Untertitel halten Zuschauer. Die Stilwahl ist deshalb ein Test, keine sichere Wette.
- **Zweitbester Kandidat für GELD:** Neon-Dashboard (Stil 5). Er signalisiert „Finanzen“ und rendert am schnellsten. Er braucht aber zwingend Bewegung, denn statische Finanzgrafiken floppen (F).

---

## 2. Begründung

### 2.1 Bewertung aller Stile

Punkte von 1 (schlecht) bis 5 (gut). Die Punkte sind **Schätzungen (S)** auf Basis der Belege in 2.2 bis 2.4. Alle Kriterien zählen gleich. „Aufwand“: 5 heißt wenig Arbeit mit unserer Three.js/HTML-Pipeline. „Render“: 5 heißt schnell.

| # | Stil | Bild | Anziehung | GELD | ALLTAG | Abgrenzung | Aufwand | Render | Summe |
|---|---|---|---|---|---|---|---|---|---|
| 1 | **Low-Poly-Miniatur mit Tilt-Shift** (aktuell) | <img src="assets/stile/stil_1_lowpoly.png" width="150"> | 4 | 3 | 5 | 1 | 5 | 2 | 20 |
| 2 | **Isometrisches 3D** | <img src="assets/stile/stil_2_isometrisch.png" width="150"> | 3 | 4 | 5 | 4 | 4 | 4 | **24** |
| 3 | **Clay-Spielzeug-3D** | <img src="assets/stile/stil_3_clay.png" width="150"> | 4 | 4 | 3 | 4 | 3 | 2 | 20 |
| 4 | **2D-Flat-Infografik** | <img src="assets/stile/stil_4_flat.png" width="150"> | 5 | 4 | 3 | 3 | 3 | 5 | 23 |
| 5 | **Neon-Daten-Dashboard** | <img src="assets/stile/stil_5_neon.png" width="150"> | 3 | 5 | 2 | 4 | 4 | 5 | 23 |
| 6 | **Papier-Collage** | <img src="assets/stile/stil_6_collage.png" width="150"> | 4 | 4 | 2 | 5 | 2 | 5 | 22 |
| 7 | **Kinetische Typografie** | <img src="assets/stile/stil_7_typo.png" width="150"> | 3 | 4 | 2 | 3 | 5 | 5 | 22 |
| 8 | **Karten-/Satellitenoptik** | <img src="assets/stile/stil_8_karte.png" width="150"> | 4 | 2 | 4 | 4 | 3 | 3 | 20 |

**Steckbriefe:**

1. **Low-Poly-Miniatur** (`stil_1_lowpoly.png`, echte Videobilder: `assets/reissverschluss_frame_*.png`)
   - Stärke: Spielzeugwelt mit Tiefe. Die Unschärfe oben und unten lässt Szenen wie ein Modell wirken (F, Held u. a. 2010, siehe 2.3).
   - Schwäche: Konkurrenz nutzt denselben Look (F). TikTok ordnete 4 von 6 solcher 3D-Videos als „Video Games“ ein (F, [01-marktanalyse.md](01-marktanalyse.md)). Für GELD ist das das falsche Publikum (A).
   - Render: teuerster Stil, weil Bloom, Tilt-Shift und weiche Schatten jedes Bild mehrfach durchrechnen (F, Messung).
2. **Isometrisch** (`stil_2_isometrisch.png`)
   - Schwebende Kachel, feste 35°/45°-Kamera, harte Schatten, keine Unschärfe.
   - Stärke: Überblick, klare Formen, Preisschilder mit Führungslinien direkt am Objekt. Gut für Warteschlangen, Verkehr, Wohnung, Spielfelder (A).
   - Aufwand: Bausteine der Engine lassen sich kantig nachbauen. Neue Kamera und Kachel: ca. 3–4 Std. Claude (S).
3. **Clay** (`stil_3_clay.png`)
   - Knetfiguren, Pastell, weiche Schatten, Münzstapel als Kostenvergleich.
   - Stärke: wirkt freundlich und „anfassbar“ (A). Münzstapel machen Geldbeträge greifbar (A).
   - Schwäche: Viele Objekte (Massen-Simulation) wirken schnell unruhig (A). Rendert so teuer wie Stil 1 (F, Messung).
4. **2D-Flat-Infografik** (`stil_4_flat.png`)
   - Flache Vektorformen, Bullauge mit Viadukt (Zug oben, Auto unten), Info-Plaketten.
   - Stärke: stärkster Reichweitenbeleg im Genre (F, Kurzgesagt, siehe 2.2). Rendert in 0,1 s pro Bild (F).
   - Schwäche: Jede Szene muss neu gezeichnet werden. Simulationen mit Hunderten Objekten wirken in 2D weniger „echt“ (A). Nah an einem sehr bekannten Vorbild, deshalb nur mit eigener Farbwelt (A).
5. **Neon-Dashboard** (`stil_5_neon.png`)
   - Dunkles Raster, leuchtende Linien, Monospace-Zahlen, Break-even-Diagramm. Zug und Auto fahren als Neon-Symbole auf ihren Kostenlinien.
   - Stärke: Diagramme entstehen direkt aus der Rechnung (Code mit Tests). Schnellster Stil (F, 0,06 s pro Bild).
   - Schwäche: Reine Diagramme sind weniger einprägsam als Bilder mit erkennbaren Objekten (F, Borkin 2013). Statische Finanzgrafiken floppen (F). Für ALLTAG-Simulationen kaum geeignet (A).
6. **Papier-Collage** (`stil_6_collage.png`)
   - Packpapier, gerissene Kanten, Rasterpunkte, Stempel, Schreibmaschinen-Etiketten.
   - Stärke: im Simulations-Genre auf Deutsch nicht verbreitet, deshalb stärkste Abgrenzung (A). Bekannt von großen Erklärkanälen (F, Vox, Johnny Harris).
   - Schwäche: Bewegung wirkt wie Stop-Motion. Simulationen mit vielen Objekten passen nicht zum Material (A). Gestaltung pro Video am aufwendigsten (S).
7. **Kinetische Typografie** (`stil_7_typo.png`)
   - Zahlen und Wörter sind das Bild. Schräglage, Nachzieh-Spur und Tempostriche deuten Bewegung an.
   - Stärke: Hook und Ergebnis sind auch ohne Ton sofort klar (A, gestützt durch die Untertitel-Studien in 2.3). Kaum Aufwand.
   - Schwäche: Trägt allein kein 70-Sekunden-Video. Deshalb als Baustein empfohlen, nicht als Hauptlook (A).
8. **Karten-/Satellitenoptik** (`stil_8_karte.png`)
   - Frei erfundene Landschaft von oben, geneigte Kamera, leuchtende Routen für Bahn und Auto.
   - Stärke: ideal für Pendeln, Verkehr, Wege (A). Karten sind ein bewährter Look großer Kanäle (F, RealLifeLore, Johnny Harris).
   - Schwäche: Für reine Geldthemen ohne Ort passt er nicht (A). Echte Kartendaten wären nötig, sobald ein realer Ort gezeigt wird; dann Lizenz prüfen (A).

**Nicht gewählt:**
- **Whiteboard/handgezeichnet:** Lerneffekt ist belegt (F, Türkay & Mouton 2016). Der Look erinnert aber an Werbe-Erklärfilme, und Simulationen mit vielen Objekten passen nicht (A).
- **Retro-Pixel:** verstärkt die Spiele-Anmutung. Das verschärft das „Video Games“-Problem (A). Kleine Euro-Beträge sind in grober Pixelschrift schlecht lesbar (A).
- **Realistisches 3D wie Zack D. Films:** größter Reichweitenbeleg (F, 8 Mio. TikTok-Follower). Braucht aber Blender oder eine Render-Farm. Im Browser mit Three.js ist das nicht in vertretbarer Zeit machbar (A).

### 2.2 Belege: Kanäle und Zahlen

| Kanal | Stil | Zahlen | Kennz. |
|---|---|---|---|
| Kurzgesagt | 2D-Flat | YouTube ca. 25,7 Mio. Abos, 3,9 Mrd. Views ([vidIQ](https://vidiq.com/youtube-stats/channel/UCsXVk37bltHxD1rDPwtNM8Q), Stand 15.10.2026); TikTok ca. 1,9 Mio. Follower ([CreatorDB](https://creatordb.app/creatorstats/kurzgesagt/), Juli 2026) | F (Drittanbieter) |
| Zack D. Films (@zackdfilms92) | realistisches 3D | TikTok 8,04 Mio. Follower, 336,8 Mio. Likes, 3.212 Videos (öffentliche Profilseite, 29.10.2026, [01-marktanalyse.md](01-marktanalyse.md)); YouTube ca. 29,3 Mio. Abos ([vidIQ](https://vidiq.com/pt/youtube-stats/channel/UCvz84_Q0BbvZThy75mbd-Dg/), 21.10.2026) | F |
| Primer | Low-Poly-Figuren, Simulationen | 1,84 Mio. Abos, 88,7 Mio. Views ([vidIQ](https://vidiq.com/youtube-stats/channel/UCKzJFdi57J53Vr_BkTfN3uQ), Stand Feb. 2025) | F (älterer Stand) |
| Animagraffs | 3D-Schnittmodelle vor neutralem Hintergrund | 1,91 Mio. Abos, 174,8 Mio. Views mit nur 47 Videos ([SocialCounts](https://socialcounts.org/youtube-live-subscriber-count/UCnZeeKO8qVdtkrA4-uKhtTw), 19.07.2026). Das sind ca. 3,7 Mio. Views pro Video (S, gerechnet). Ähnlichkeit zu Stil 2 ist eine Annahme. | F / S / A |
| Vox | Collage, Editorial | ca. 12,7 Mio. Abos ([Socialpruf](https://socialpruf.com/youtube/vox), Juni 2026) | F (Drittanbieter) |
| Johnny Harris | Karten plus Collage | ca. 7,8 Mio. Abos ([SpeakRJ](https://www.speakrj.com/audit/report/UCmGSJVG3mCRXVOP4yZrU1Dw/youtube), 17.07.2026) | F (Drittanbieter) |
| RealLifeLore | Karten | ca. 7,93 Mio. Abos, 1,96 Mrd. Views ([vidIQ](https://vidiq.com/youtube-stats/channel/@reallifelore/)) | F (Drittanbieter) |
| @kurzsimuliert | 3D-Simulation (vermutlich Low-Poly-Vorlage) | 2,1 Mio. Views mit einem Video, 12.925 Follower mit 10 Videos ([01-marktanalyse.md](01-marktanalyse.md)) | F (Zahlen), A (Vorlage) |
| @finanzdenker | statische Finanzgrafik | 37.900 Views bei 204.487 Followern ([01-marktanalyse.md](01-marktanalyse.md)) | F |
| Bar-Chart-Races (Daten-Animation) | Daten | So verbreitet, dass das Forum „Data Is Beautiful“ sie zeitweise sperrte ([Built In](https://builtin.com/articles/bar-chart-races)) | F |

**Was die Zahlen zeigen:**
- Alle Stile haben große Kanäle. Der Stil allein erklärt den Erfolg nicht (S).
- In unserer Nische auf Deutsch funktionieren animierte 3D-Simulationen (F, 0,3–2,2 Mio. Views, [01-marktanalyse.md](01-marktanalyse.md)). Statische Grafiken funktionieren nicht (F).
- Für Isometrie und Clay habe ich keine Kurzvideo-Kanäle mit belastbaren Zahlen gefunden. Ihre Anziehung ist deshalb eine Annahme.

### 2.3 Belege: Aufmerksamkeit und Wiedergabedauer

| Befund | Quelle | Kennz. | Folge für uns |
|---|---|---|---|
| 69 % schauen Videos in der Öffentlichkeit ohne Ton. 80 % schauen eher bis zum Ende, wenn Untertitel da sind (5.616 Befragte, USA, 2019). | Verizon Media und Publicis, zitiert bei [3Play Media](https://www.3playmedia.com/blog/verizon-media-and-publicis-media-find-viewers-want-captions/) | F (Sekundärquelle) | Untertitel und große Zahlen sind Pflicht, in jedem Stil. |
| Untertitel erhöhten die Wiedergabezeit von Videoanzeigen im Schnitt um 12 % (interne Tests, 2016). | Facebook, zitiert bei [3Play Media](https://3playmedia.com/blog/captions-increase-viewership-for-facebook-video-ads) | F (Herstellerangabe) | wie oben |
| Text mit 5–10 Wörtern pro Sekunde brachte 2,1-mal mehr Bekanntheit (Werbeanzeigen). Untertitel: laut Auszügen +58 % Erinnerung. | TikTok Creative Center, [Power of Creative Elements](https://ads.tiktok.com/business/creativecenter/quicktok/online/Power_Creative_Elements/pc/en) | F laut Suchauszug; die Seite war aus der Sitzung nicht abrufbar | Gilt für Werbung. Für organische Videos ist das eine Annahme. |
| Visualisierungen mit erkennbaren Objekten (Piktogrammen) und vielen Farben bleiben besser im Gedächtnis. Standard-Diagramme werden leichter vergessen. | Borkin u. a. 2013, [Harvard](https://vcg.seas.harvard.edu/publications/20130101-what-makes-a-visualization-memorable) | F | Szene mit Zug und Auto schlägt reines Diagramm. Deshalb trägt Stil 5 Symbole auf den Linien. |
| Gezielte Unschärfe (Tilt-Shift) lässt echte Szenen wie Miniaturen wirken. | Held u. a. 2010, [PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3088122) | F | erklärt den Spielzeug-Effekt von Stil 1 |
| Fotos mit Filtern wurden 21 % häufiger angesehen und 45 % häufiger kommentiert. Wärme, Helligkeit und Kontrast wirkten positiv, Sättigung leicht negativ (7,6 Mio. Flickr-Fotos). | Bakhshi u. a. 2015, [ICWSM](https://ojs.aaai.org/index.php/ICWSM/article/view/14622) | F (Fotos, nicht Videos) | warme, helle, kontrastreiche Farben; nicht übersättigen |
| Whiteboard-Animationen verbesserten Lernen und Freude (568 Teilnehmende). | Türkay & Mouton 2016, [Harvard VPAL](https://www.vpal.harvard.edu/publications/educational-impact-whiteboard-animations-experiment-using-popular-social-science) | F | Lernwirkung ist kein Reichweitenbeleg, deshalb nicht gewählt |

### 2.4 Renderzeit

Gemessen im Cloud-Container: 4 Kerne, ohne Grafikkarte (SwiftShader). **Parallel lief ein Video-Render mit 2 Workern.** Die absoluten Werte sind deshalb zu hoch. Der Vergleich der Stile untereinander bleibt gültig (F, `pipeline/stile/messung.json`).

| # | Stil | Technik | Sekunden pro Bild (F) | 80-s-Video, 2.400 Bilder, Cloud (S) | Windows-PC mit Grafikkarte (S) |
|---|---|---|---|---|---|
| 1 | Low-Poly | Three.js + Bloom, Tilt-Shift, Schatten | 5,49 | ca. 3,7 Std. unter Last; ohne Last 45–60 Min. (F, [pipeline/README.md](../pipeline/README.md)) | 10–20 Min. |
| 2 | Isometrisch | Three.js ohne Nachbearbeitung | 0,74 | ca. 30 Min. | 5–10 Min. |
| 3 | Clay | Three.js + weiche Schatten, Physik-Material | 5,53 | ca. 3,7 Std. | 10–20 Min. |
| 4 | Flat | SVG | 0,10 | ca. 4 Min. | 3–5 Min. |
| 5 | Neon | SVG + Leuchtfilter | 0,06 | ca. 3 Min. | 2–4 Min. |
| 6 | Collage | SVG + Papierfilter | 0,10 | ca. 4 Min. | 3–5 Min. |
| 7 | Typografie | HTML/CSS | 0,23 | ca. 9 Min. | 3–5 Min. |
| 8 | Karte | Three.js + Bloom | 2,54 | ca. 1,7 Std. | 5–15 Min. |

- Die Werte gelten für ein Standbild. Animierte Szenen mit mehr Objekten brauchen mehr (S).
- SVG-Filter (Collage, Neon) werden in jedem Bild neu berechnet. Bei viel Bewegung kann das teurer werden (S).
- Windows-Werte sind Schätzungen. Messen mit: `cd pipeline && node stile/render_stile.js --gpu`.

### 2.5 Neuer Untertitel-Stil (in allen Bildern)

- Umgesetzt nach der Entscheidung vom 31.10.: kein Kasten, weiße fette Schrift, dicke schwarze Kontur, weicher Schatten, aktuelles Wort gelb, Aufbau Wort für Wort, höchstens 2 Zeilen (F, [ENTSCHEIDUNGEN.md](../ENTSCHEIDUNGEN.md)).
- Baustein: `pipeline/stile/gemeinsam.css` (Klasse `.ut`) und `untertitel()` in `pipeline/stile/gemeinsam.js`.
  - Die Kontur liegt auf einer Kopie hinter dem Wort. Sie wächst nur nach außen und frisst die Buchstaben nicht an.
  - Noch nicht gesprochene Wörter sind unsichtbar, behalten aber ihren Platz. So springt die Zeile nicht.
  - Der Umbruch wählt automatisch die ausgewogenste Teilung in 2 Zeilen, höchstens 876 px breit.
- Position: y = 1290 px. Sichere Zonen eingehalten (oben 150 px, rechts 150 px, unten 400 px), geprüft mit `--zonen` (F).
- Im Standbild ist wie gewünscht die ganze Zeile „Ab wie vielen Fahrten lohnt sich“ zu sehen. Im Video erscheint „sich“ erst, wenn es gesprochen wird.

---

## 3. Nächste Schritte

| # | Schritt | Wer | Zeit | Status |
|---|---|---|---|---|
| 1 | Übersicht ansehen und Hauptstil wählen (Empfehlung: Stil 2 plus Typo-Bausteine aus Stil 7) | Inhaber | 10 Min. | offen |
| 2 | Untertitel-Baustein in die Engine übernehmen (`engine/hud.js` und `hud.css`), falls nicht schon in Arbeit | Claude | 1–2 Std. | offen |
| 3 | Gewählten Stil als Engine-Modul bauen (bei Stil 2: Iso-Kamera, Kachel, kantige Bausteine, Preisschilder mit Führungslinien) und eine 10-Sekunden-Testanimation rendern | Claude | 3–4 Std. | nach 1 |
| 4 | Test: Die nächsten 6–10 Videos abwechselnd im alten und im neuen Look. Vergleich von Views, durchschnittlicher Wiedergabedauer und Followern pro 1.000 Views in der Auswertung nach 28 Videos ([05-startnische.md](05-startnische.md)) | Claude plant, Inhaber postet | kein Mehraufwand | nach 3 |
| 5 | Renderzeit aller Stile auf dem Windows-PC messen: `cd pipeline && node stile/render_stile.js --gpu` | Inhaber | 5 Min. | mit dem Windows-Setup |
| 6 | Optional: ein GELD-Video im Neon-Dashboard-Stil als Gegenprobe | Claude | 2–3 Std. | später |

---

## 4. Offene Punkte

- [ ] **Stilwahl** durch den Inhaber (siehe Schritt 1).
- [ ] **Untertitel:** Passt Größe (84 px) und Kontur (ca. 9 px sichtbar) so? Soll das aktuelle Wort zusätzlich leicht wachsen (im Bild: 6 %)?
- [ ] **Schriften unter Windows:** JetBrains Mono (Stil 5), Bitstream Charter und Courier 10 Pitch (Stil 6) fehlen dort meist. Ersatz ist hinterlegt (Consolas, Georgia, Courier New). Für identische Optik die Schriften als Dateien ins Repo holen (freie Lizenzen, z. B. über `@fontsource`).
- [ ] **Zahlen in den Bildern sind Beispielwerte.** Den Preis des Deutschlandtickets 2026 und die Autokosten vor einer echten Produktion mit Quelle rechnen.
- [ ] **Belege für Isometrie und Clay auf TikTok fehlen.** Keine Kanäle mit belastbaren Zahlen gefunden. Der Test in Schritt 4 klärt das.
- [ ] **Recherche-Grenzen:** `ads.tiktok.com` und `omr.com` sind im Netz der Cloud-Sitzung gesperrt. Der Abruf von TikTok-Profilseiten per Skript wurde blockiert. Die Firecrawl-Credits waren aufgebraucht. Kanalzahlen stammen deshalb teils von Drittanbietern (vidIQ, CreatorDB, SocialCounts, Socialpruf, SpeakRJ).

---

**Dateien:**
- Bilder: `docs/assets/stile/stil_<nr>_<name>.png`, Übersicht `docs/assets/stile/uebersicht.jpg`
- Quellcode: `pipeline/stile/` (je Stil eine HTML- und JS-Datei, gemeinsame Bausteine `gemeinsam.css`/`gemeinsam.js`, Renderer `render_stile.js`, Übersicht `uebersicht.html`, Messwerte `messung.json`)
- Neu rendern: `cd pipeline && node stile/render_stile.js` (einzelne Stile: Nummern anhängen, z. B. `node stile/render_stile.js 2 5`; Prüfansicht der sicheren Zonen: `--zonen`, Ausgabe nach `pipeline/out/stile/`)
