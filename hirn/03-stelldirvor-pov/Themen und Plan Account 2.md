---
typ: regel
konto: stelldirvor
status: aktuell
datum: 2026-11-02
quelle: .claude/skills/stelldirvor-video/themen-und-plan.md
tags: [konto/stelldirvor, themen, welten, archiv]
cssclasses: [konto-stelldirvor, typ-regel]
---

> Quelle: `.claude/skills/stelldirvor-video/themen-und-plan.md`. Diese Notiz wird mit `python3 tools/hirn_aus_skills.py` erzeugt. Änderungen bitte im Skill vornehmen, nicht hier. Bei Abweichung gilt der Skill.

# Themen und Plan Account 2

*Themen, Weltenkatalog und Tagesablauf · @stelldirvor.pov*

Gilt nur für Account 2 (Skill `stelldirvor-video`). **Stand der Regeln: 02.11.2026 abends (Entscheidungen des Inhabers).** Kennzeichnung: **(F)** belegter Fakt · **(S)** Schätzung · **(A)** Annahme.

**Was seit 02.11.2026 abends gilt und was veraltet ist**
| Gültig | Veraltet (nur Archiv, nicht gelöscht) |
|---|---|
| §0 Markt und Belege · §1 Themen (Breite, Auswahl, Kopierregel) · §2 **Weltenkatalog** (Natur zuerst) · §3 Weltvielfalt · §4 Tagesablauf | §5 Konkurrenz-Check und **Sperrliste** (Lunar, US, DE) · §6 **30-Tage-Plan** (`data/plan/account2-30-tage.csv`, `account2-plan.json`, Plan-PDF), Abstandsregeln, Reserve, Ausfall-Regel · §7 Quellen des Konkurrenz-Checks |

## 0. Markt und Belege (F, 01./02.11.2026)
- US-Videos des Formats „Was wäre, wenn …“ in 3D (Okt. 2026): Median 838.700 Views, Maximum 18,2 Mio., alle 61–80 s (CRP-fähig); junge Accounts wachsen schnell (@thewhatifstudio 59.300 Follower im ersten Monat, @man_ia_c 281.000 Follower mit 22 Videos). In Deutschland ist das Format kaum besetzt (Fenster offen, Tempo zählt; @angenommen.pov und @waswaerewenn.pov haben das Konzept reserviert, 0–2 Videos).
- Gesättigt oder schwach (nicht empfohlen): KI-Obst-/Tier-Seifenopern (in DE fallend, brauchen KI-Video), Körper 3D, KI-Geschichts-POV (Trend vorbei), Psychologie/Finanzen ohne Gesicht (Median ca. 1.000 Views).
- Das KI-Label steht auf der öffentlichen Videoseite im Feld `aigcLabelType` (nicht `IsAigc`); Pflicht nur bei realistischen Inhalten (siehe [[Plattformregeln und Posting]] (CLAUDE.md §7)).
- **Werkzeuge (Bewertung 01.11.):** Unreal Engine 5 (kostenlos; Chaos-Zerstörung, Niagara-Partikel, große freie Asset-Bibliothek) wäre der stärkste Kandidat für den POV-Look, läuft aber nur auf dem Windows-PC mit GPU und ist in der Cloud nicht lauffähig; erst nach Einrichtung des PCs testen (Inhaber erlaubt UE5 bei klarem Vorteil, sparsam mit Tokens). Godot, Babylon.js, Remotion, Motion Canvas, Manim bringen keinen Vorteil gegenüber Three.js.
- **Account 3 (Kandidat):** „Wer war's?“ (animiertes Krimirätsel, Score 70 gegen 86 für die Account-2-Nische; immergrün, ohne Zeitdruck, Fälle ohne Blut); vor dem Start frisch messen. Alternative Handles für Account 2, frei am 01.11.: `@ploetzlich.pov`, `@waswaere.pov`, `@undwasdann.pov`, `@malangenommen.pov` (Verwechslungsgefahr mit `@mal.angenommen`).
- Format-Quelle der Optik: Die Vorbilder (@man_ia_c u. a.) entstehen vermutlich mit KI-Video (Label gesetzt, A); wir bauen den POV-Look stilisiert-filmisch in 3D nach, nicht fotorealistisch.
- CRP-Rechnung und Regeln: [[Kanäle und Ziele]] (CLAUDE.md §3) (1.000 €/Monat ≈ 1,4–5 Mio. Views, mittel 2,4 Mio. ≈ 40k je Video bei 60 Videos).

## 1. Themen: Breite und Auswahl (gültig seit 02.11.2026 abends)
- **Kernidee bleibt:** „Was wäre, wenn …“-Gedankenexperimente mit einer **messbaren Größe** (die Anzeige läuft bis „HIER“), **ein Ereignis, das man von einem Standpunkt aus** sieht.
- **Breite flexibel, damit es endlos viele Themen gibt:** Wissenschaft, Natur, Geografie, Geschichte, Technik und mehr; **spannend** (ersetzt „große globale Wissenschaftsthemen“). Orte weltweit, auch Deutschland und andere Länder, wie es zum Thema passt; Texte deutsch (ersetzt „kein Deutschland-Bezug“). **Ungeeignet** bleiben Alltagsthemen ohne messbare Größe.
- **5-Sekunden-Rahmen erlaubt**, wenn sich das Thema gut simulieren lässt (das alte Verbot ist entfallen).
- **Keine Sperrliste mehr** (auch nicht die der US-Konten und von Lunar Animations): Themen dieser Kanäle sind frei, der Inhaber kennt sie selbst; US-Themen dürfen übernommen und in deutscher Sprache umgesetzt werden.
- **Die Kopierregel bleibt (verbindlich):** keine 1:1-Kopie von Sätzen, Etiketten, Faktenzeilen, Bild- und Szenenideen eines fremden Videos (CRP-Ausschluss „Unoriginal“; bei Nachahmern liegt die Reichweite laut unserer Recherche nur bei 0,2–5 % des Originals, F). **Gleiches Thema nur mit eigenem Skript und deutlich anderem Design** (anderer Ort bzw. andere Welt, andere Dramaturgie).
- **Woher die Themen kommen:** Jeden Tag bekommt der Inhaber **10 Videoideen** (Ideen-Studio / Claude Chat), wählt **2 für den nächsten Tag**, danach entsteht das Skript dort ([[Ablauf Account 2]] „Skript-Anforderungen“). Es gibt keinen Themenplan, keine Reihenfolge und keine Reserveliste mehr. Termingebundene Ideen (Jahrestage, Himmelsereignisse) darf das Ideen-Studio vorschlagen.
- **Empfehlungen aus dem alten Plan (nicht verbindlich, F aus der Planung 02.11.):** Katastrophen mit staunenden und ruhigen Themen abwechseln; Pointen im Wechsel („es passiert fast nichts“, „es ist wirklich passiert“, „das Gegenteil stimmt“, „die Zahl ist kleiner bzw. größer als gedacht“); keine Opfer zeigen, jedes Ende sachlich (Pointe, Faktenzeile); Ausschlussthemen aus [[Plattformregeln und Posting]] (CLAUDE.md §7) (Tragödien, Politik, Krypto …) bleiben ausgeschlossen.

## 2. Weltenkatalog (Natur zuerst; gültig seit 02.11.2026 abends, ersetzt die Tabelle „Grundwelten“)
**Grundsatz (Regel des Inhabers):** Die Welt passt zum Thema. **Zuerst fragen: Funktioniert das Thema in der Natur besser?** Viele Simulationen tun es (Meer, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe). **Stadt nur, wenn sie wirklich zum Thema passt**, und dann als lebendiger Ort, nicht als Standard-Skyline im Hintergrund. Der Katalog ist ein Vorrat an Beispielen, **kein starres Kontingent je Welt**: Welttypen dürfen kombiniert (Küste und Stadt, Gebirge und See) und erweitert werden.

| Welttyp | Standpunkte (nicht nur erhöht) | Themen-Beispiele (Ideen, keine Vorgaben) | Leben und Bewegung |
|---|---|---|---|
| **Meer und Küste** | Strandblick aufs Meer, Bootsdeck, Hafenmole, Klippe, Felsküste, Wattkante | Meeresspiegel, Gezeiten, Algenblüte, Meeresleuchten, Strömungen | Wellen, Gischt, Möwen, Boote, Sonnenlauf, Wolkenzug |
| **Wald und Lichtung** | Waldlichtung, Waldrand, Baumkronenpfad, Flussaue | Wachstum eines Waldes, Jahreszeiten im Zeitraffer, Insektenschwarm, Regen im Wald | Blätter im Wind, Lichtstrahlen, Wild, Vögel, Nebel, Insekten |
| **Wüste und Dünen** | Dünenkamm, Oase, Salzpfanne, Felsplateau | Wanderdüne, Regen in der Wüste, Hitze, Sternenhimmel, Sandsturm | Sand, Hitzeflimmern, Karawane, Schattenlauf |
| **Gebirge und Gipfel** | Gipfel, Grat, Almwiese, Pass, Kraterrand | Höhe und Luftdruck, Erosion, Gletscherrückgang, Wolkenmeer | Wolken, Schnee, Gämsen und Vögel, Lichtstimmung |
| **Gletscher, Eis, Polarregion** | Eisfläche, Eisrand, Forschungscamp, Eisbrecher-Deck, Fjord | Eisschmelze, Eiszeit, Polarnacht, Polarlicht | Schollen, Schnee, Robben und Vögel, Himmelslicht |
| **See, Fluss, Delta** | Seeufer, Flussufer, Brücke, Wasserfall, Stausee | Pegel, Überflutung, Austrocknung, Fließgeschwindigkeit | Wasser, Schilf, Boote, Vögel, Nebel |
| **Inseln und Vulkane** | Kraterrand, Lavafeld, Geysirfeld, Vulkaninsel | Inselgeburt, Geysir, langsamer Lavastrom | Dampf, Glut, Meer, Vögel |
| **Land, Feld, Dorf** | Acker, Weide, Reisterrasse, Dorfrand, Obstgarten | Wachstum, Dürre, Bestäubung, Wetterwechsel | Getreide im Wind, Tiere, Traktoren, Wolken |
| **Himmel, Atmosphäre, Weltraumnähe** | Ballongondel, ISS-Kuppel, Mond- oder Marsoberfläche, Hochebene bei Nacht | Atmosphäre, Sternbewegung, Meteorschauer, Finsternis | Sterne, Wolken, die Erde unter dir, Lichter |
| **Unterwasser und Untergrund** | Taucherblick am Riff, Höhle, Tiefsee-Kapsel | Druck, Licht in der Tiefe, Riffleben | Fische, Plankton, Lichtstrahlen, Strömung |
| **Stadt und Infrastruktur** (nur wenn das Thema sie braucht) | Straße, Kreuzung, Brücke, Hafen, Dachterrasse, Marktplatz, Bahnsteig | Überflutung einer Hafenstadt, Stromausfall, Verkehr, Hitze in Betonflächen | Verkehr, Menschenströme, Lichter, Wetter |

- **Standpunkte vielfältig:** erhöht (Balkon, Dach, Gipfel) ist einer von vielen; ebenerdig (Strand, Straße, Lichtung, Düne, Eis), auf dem Wasser (Bootsdeck, Floß), in der Luft (Gondel) und unter Wasser sind gleichwertig. Das Vordergrund-Element passt zum Standpunkt (Reling, Felskante, Zaun, Eisrand, Handlauf; [[Design Account 2]]).
- **Tageszeit gehört zur Welt:** Tag, Sonnenauf-/untergang, Nacht; Nachthimmel-Ereignisse (Polarlicht, Meteorschauer, Finsternis) passen in Welten mit freiem Himmel (Wüste, Gebirge, Küste, Eis, Hochebene).
- **Baukasten-Stand (A, 02.11.):** vorhanden sind Himmel, Wolken, Partikel, Menschen, Autos, Vögel, Trümmer, Rauch, Staubwand, Feuerball und die Welt **Großstadt-Dach** (`engine/welt_grossstadt_dach.js`, Erstbau „Eiszeit Toronto“; Schwächen: Gebäude gleichförmig, Winterphase milchig, Eiswand glasig, Weißblende zu früh). **Alle anderen Welttypen entstehen beim Erstbau**, jeweils **auf Referenzniveau** (Detaildichte, Bewegung, Licht; Abnahme am Phasen-Vergleich, [[Prüfung und Abnahme Account 2]]) und mit den fehlenden Bausteinen: Wasser mit Pegel und Wellen, Vegetation im Wind, Tiere, Sonnen- und Mondlauf mit wanderndem Schatten, Eis. Ein Erstbau ist Architektur-Arbeit (Opus, [[Produktion Rhythmus und Modelle]] (CLAUDE.md §4)); danach ist die Welt ein austauschbarer Baukasten (Gelände, Wasser, Himmel mit Tageszeit und Zeitraffer, Vordergrund-Element, Partikel, Lebewesen), den die Sonnet-Produktion wiederverwendet.
- **Wiederkehrende Spezialeffekte (S):** Wasserpegel, Eis und Schnee, Vegetationswachstum, Nachthimmel mit Ereignis, Schwarm bzw. Herde, Würfel bzw. Haufen (Mengen-Bilder). Wer einen Effekt einmal sauber baut, nutzt ihn mehrfach.

## 3. Weltvielfalt, Tageszeit, Enden (ersetzt die Abstandsregeln; gültig seit 02.11.2026 abends)
| Regel | Maßstab |
|---|---|
| **Welttyp** | nie zweimal derselbe Welttyp hintereinander (auch nicht von Abend auf den nächsten Mittag), nie zweimal am Tag |
| **Tageszeit** | wechselt von Video zu Video (Tag, Sonnenauf-/untergang, Nacht); das Mittags- und das Abend-Video eines Tages haben unterschiedliche Tageszeit-Verläufe |
| **Standpunkt** | nicht derselbe Standpunkt-Typ hintereinander (erhöht, ebenerdig, auf dem Wasser, in der Luft) |
| **Enden** | nicht zwei gleiche Enden am selben Tag (Ende = Charakter des Höhepunkts: Nachthimmel, Eis, Flut, Staub, Glanz, Knall, Grün, Masse …) |
Claude Code prüft das bei der Skript-Übernahme gegen die letzten Videos (`lern_notizen` in den `skript.json`, Buffer-Log) und meldet einen Konflikt mit einem Alternativvorschlag; ändern muss der Inhaber bzw. das Ideen-Studio das Skript. Die früheren Abstandsregeln nach Plan (Exponential-Themen 4 Tage, Mars 8 Tage …) sind veraltet (Archiv §6.4).

## 4. Tagesablauf und Aufwand
- **Ablauf:** 10 Ideen am Vortag → Inhaber wählt 2 → Skript im Ideen-Studio → Claude Code übernimmt (Schritt 1 des Ablaufs in [[Account stelldirvor.pov Überblick]]) → Rechnung, Szene, Render, Prüfung, Buffer. Rhythmus und Agenten-Grenze: [[Produktion Rhythmus und Modelle]] (CLAUDE.md §4) (4 Videos pro Tag, 2 je Account, höchstens 2 Agenten).
- **Aufwand (S):** Video in einer vorhandenen Welt 1,5–2 Std. Agentenarbeit; Erstbau eines neuen Welttyps auf Referenzniveau 4–6 Std. (Engpass; der Inhaber sollte beim Wählen wissen, ob eine Welt neu ist).
- **Rendern:** 80 s × 30 = 2.400 Bilder; Standard ist der Render-Dienst auf dem Windows-PC ([[Produktion Rhythmus und Modelle]] (CLAUDE.md §4), ca. 3–5 Min. je Video), Rückfall Cloud ca. 2,5–3,1 s/Bild (ca. 100–125 Min.). Szenen mit viel Wasser, Partikeln oder Vegetation früh am Vortag starten.

## 5. Konkurrenz-Check und Sperrliste (VERALTET seit 02.11.2026, nur Archiv)
Steht in der eigenen Notiz [[Konkurrenz-Check und Sperrliste Account 2]] (Status veraltet: Methode, Lunar-Themen, US-Konten, deutscher Markt, Quellen). Gültig bleibt nur die Kopierregel aus §1 (keine 1:1-Kopie).

## 6. Archiv: 30-Tage-Plan, Abstandsregeln, Reserve (VERALTET seit 02.11.2026, nur Archiv)
> **Veraltet seit 02.11.2026 abends:** Es gibt keinen 30-Tage-Plan und keine Abstandsregeln nach Plan mehr. `data/plan/account2-30-tage.csv`, `data/plan/account2-plan.json` und `docs/plan/account2-30-tage-plan.pdf` bleiben **nur als Archiv** erhalten (nicht löschen). Themen entstehen täglich neu (§1, §4). Gültig an Stelle der Abstandsregeln ist §3. Der alte Text folgt unverändert zur Nachvollziehbarkeit; sein Kopf lautete: „Plan: `data/plan/account2-30-tage.csv` (60 Videos 02.11.–02.12.2026 plus 15 Reserve, Score 73–92, Ø 83,3) … Entscheidung 02.11.: Der Plan ersetzt den alten vom 01.11. vollständig.“

### 6.1 Mix (alt §1)
- **Themenfelder wechseln:** Nie zweimal dasselbe Feld hintereinander (auch nicht von Abend auf den nächsten Mittag) und nie zweimal an einem Tag.
- **Enden:** An keinem Tag zwei gleiche Enden. Die Enden sind in 30 Typen eingeteilt (z. B. Nachthimmel, Eis, Flut, Grün, Staub, Masse, Glanz, Knall). Nachthimmel-Enden (Polarlicht, Supernova, Leoniden, Andromeda, Spiegel im All, Blitze, Meeresleuchten, Komet, Mond) liegen immer abends und mindestens 2 Tage auseinander; Flut-Enden mindestens 5 Tage.
- **Tonlage:** Katastrophen wechseln mit staunenden, ruhigen Themen (Schaltjahr, Meeresleuchten, Grüne Sahara, Andromeda). Jede Katastrophe zeigt keine Opfer und endet sachlich (Pointe, Faktenzeile).
- **Pointen-Typen** im Wechsel: „es passiert fast nichts“ (Sonne 1 m), „es ist wirklich passiert“ (Kaninchen, Aralsee, Surtsey), „das Gegenteil stimmt“ (Grönland, Mammuts, Amazonas), „die Zahl ist kleiner bzw. größer als gedacht“ (Wolken, Gold, Plastik, Reis).

### 6.2 Reihenfolge (alt §2)
- **Tag 1–3:** die Beispiele des Inhabers, weil er sie ausdrücklich will und sie die höchste Nachfrage haben (Nachfrage- bzw. Timing-Punkt im Trend-Raster).
- **Tag 1–10:** die stärksten Themen (Score 84–89) plus die Erstbauten aller Grundwelten. So steht der Baukasten nach 4 Tagen.
- **Feste Termine** (Timing-Punkt im Trend-Raster):
  - **Sa 14.11.** Surtsey: 63. Jahrestag der Inselgeburt vom 14.11.1963 (F, UNESCO).
  - **Di 17.11., 19:30** Leoniden: Maximum der Leoniden um den 17.11. (S, IMO-Kalender prüfen), abends, damit man danach selbst hinausschauen kann.
  - **Mi 11.11.** Baum-Rechnung: während der Klimakonferenz COP31 (9.–20.11.2026, S, prüfen).
  - **So 29.11.** Schaltjahr: 1. Advent; die Pointe „Weihnachten im Sommer“ passt in die Vorweihnachtszeit.
- **Saisonal:** Winterthemen (Eisregen, Eis sinkt, Eisberg, Atlantikströmung) bewusst im November, aber mit mindestens 3 Tagen Abstand untereinander.

### 6.3 Grundwelten und Baukasten (alt §3; ersetzt durch den Weltenkatalog in §2)
| Grundwelt | Videos | Erstbau | Standpunkte (Auswahl) |
|---|---|---|---|
| Großstadt-Dach | 12 | Di 03.11. (Eiszeit, Toronto) | Toronto, Shenzhen, Buffalo, Dubai, Montréal, Stockholm, London, São Paulo, Paris, Los Angeles, Tokio, Johannesburg |
| Berg-/Seeblick | 12 | Di 03.11. (Sonne 1 m, Cabo da Roca) | Cabo da Roca, Genfer See, Gibraltar, Lizard Island, Lake Louise, Borneo, Java, Maracaibo-See, Kolumbien, Banaue, Hallstatt, Victoriasee |
| Wüste | 11 | Mi 04.11. (Afar) | Afar, Gilf Kebir, Namib, Sahel, Shark Bay, Atacama, Ouarzazate, Rub al-Chali, Outback, Moynaq, Nordkenia |
| Polarregion | 7 | Mi 04.11. (Mammuts, Sibirien) | Pleistozän-Park, Ilulissat, Grytviken, Tromsø, Batagaika, Pine-Island-Bucht, Dome C |
| Küstenstadt | 12 | Do 05.11. (Magnetfeld, Singapur) | Singapur, Manaus, Mumbai, Heimaey, Manila, Hongkong, Bergen, Lissabon, Rodrigues, Sydney, Rio, Jakarta |
| Weltraumnähe | 6 | Fr 06.11. (Mars) | Mars (2), ISS (2), Stratosphärenballon, Mond |

- **Was der Baukasten je Grundwelt enthält (A):** Gelände bzw. Stadtsilhouette als austauschbare Kulisse, Wasserfläche mit Pegel-Steuerung, Himmel mit Tageszeit und Zeitraffer, Vordergrund-Geländer (Glas, Holz, Stein, Metall), Partikel (Schnee, Staub, Regen, Asche, Insekten), Menschen- und Tier-Instancing, Messwert-Anzeige und Satzebene aus dem Skill `stelldirvor-video`.
- **Wiederkehrende Spezialeffekte:** Wasserpegel (ca. 11 Videos), Eis und Schnee (ca. 9), Vegetationswachstum (ca. 7), Nachthimmel mit Ereignis (9), Schwarm bzw. Herde (ca. 5), Würfel bzw. Haufen (6). Wer einen Effekt einmal sauber baut, nutzt ihn mehrfach.
- **Weltraumnähe** hat Varianten: Mars (06.11. Erstbau, 22.11.), ISS-Kuppel (12.11. Erstbau, 29.11.), Ballongondel (20.11.), Mond (02.12.). Deshalb nur 6 Videos.
- **Regionen gestreut:** Nordamerika-Standpunkte (Toronto, Buffalo, Montréal, Lake Louise, Los Angeles, New Mexico) mindestens 3 Tage auseinander.

### 6.4 Abstandsregeln (alt §4; ersetzt durch §3)
| Regel | Mindestabstand |
|---|---|
| gleiche Grundwelt | nicht an zwei aufeinanderfolgenden Tagen, nie zweimal am Tag |
| gleiches Themenfeld | nicht in zwei aufeinanderfolgenden Slots |
| gleiches Ende | nie am selben Tag; Nachthimmel 2 Tage, Flut 5 Tage |
| Kälte und Eis (Eiszeit, Vulkanwinter, Eisberg, Eisregen, Atlantikströmung, Eis sinkt, Erde fliegt weg) | 3 Tage |
| Exponential-Themen (Bakterien, Domino, Reis, Kaninchen, Wasserpflanzen) | 4 Tage |
| Würfel- bzw. Haufen-Bilder (Gold, Plastik, Diamant, CO₂) | 5 Tage |
| Meeresspiegel (Eis schmilzt, Grönland, Jakarta) und Plattentektonik (Afar, Gibraltar, Pangaea) | 5 Tage |
| Schwärme (Kaninchen, Heuschrecken) | 6 Tage |
| Sibirien (Mammuts, Permafrost) | 7 Tage |
| Mars (Staubsturm, Terraforming) und Meer trocknet aus (Gibraltar, Aralsee) | 8 Tage |
| ISS (Weltraumschrott, Absturz) | 10 Tage |
| Sonne und Erdbahn (Sonne 1 m, Erde fliegt weg, Achse 90°) | 5 Tage |

### 6.5 Bewusst nicht im Plan (alt §6)
| Verworfen | Grund |
|---|---|
| Yellowstone/Supervulkan, Asteroid- und Kometeneinschlag, Tsunami und Riesenwelle, Erdbeben, Mond näher/weg/Absturz, Erde dreht schneller/langsamer/rückwärts, Sonne explodiert/verschwindet | Lunar- bzw. US-Themen (§3.5) |
| Sauerstoff/Wasser/Atmosphäre/Element verschwindet, Schwerkraft-Varianten, „alle Menschen gleichzeitig …“ | gesperrte US-Muster |
| Zombie, Virus, Pandemie | Lunar/US, dazu Risiko |
| Welt ohne Menschen | gesättigt (Langform-Klassiker), dazu „alle Männer sterben“ (US) |
| Gammablitz, Antimaterie, Seen-Ausgasung (Nyos), Smog London 1952 | Massensterben bzw. echte Tragödien (Ausschlussliste Tragödien, [[Plattformregeln und Posting]] (CLAUDE.md §7)) |
| Ozeanversauerung | Score 69 (unter 70): schwer sichtbar, Nähe zur Korallenbleiche |
| Kunstdünger verschwindet | Score 70, Hunger-Thema, schwaches Bild |
| Papier falten, Schrumpfen | bereits bei @mal.angenommen |
| Laacher See, Phantomstau, Schokolade, Stickstoff und alle übrigen Themen des alten Plans | Vorgabe 02.11.: nicht auf Deutschland bezogen, keine Alltagsthemen, kein 5-Sekunden-Rahmen; alter Plan vollständig ersetzt |

### 6.6 So liest du die CSV und was bei Ausfällen passiert (alt §7)
- Spalten: `datum`, `slot`, `uhrzeit`, `titel` (Titelfrage im Video), `themenfeld`, `standpunkt`, `welt`, `ereignis`, `zeitraffer`, `messwert_etiketten`, `hoehepunkt`, `pointe`, `beats` (Kernmomente mit Zeiten, getrennt durch „ · “), `faktenzeile` (Abspann, Versalien), `kernrechnung`, `quellen_pruefen`, `score`, `score_begruendung` (N T W P A R plus je Faktor ein Satz), `konkurrenz_check`, `caption_vorschlag`, `aufwand`, `status`. Reservethemen haben `datum` = `reserve`.
- Die kursiven Sätze (16 je Video) stehen für die ersten 8 Videos in `data/plan/account2-plan.json` (`saetze`). Für alle weiteren schreibt der Produktions-Agent sie aus `beats`, `pointe` und `hoehepunkt` nach [[Ablauf Account 2]] (3–9 Wörter, Präsens, ruhig).
- **Ausfall:** Fällt ein Video aus, rückt kein Thema nach vorn (Abstandsregeln). Stattdessen das passende Reservethema derselben Grundwelt nehmen, aber nur, wenn es die Regeln in §4 am Tag erfüllt. Gute Lückenfüller: R3 Schnee schwarz (Polarregion), R6 Regentropfen (Großstadt-Dach), R11 Seil um den Äquator (Berg-/Seeblick).
- Zahlen mit „prüfen“ vor dem Bau klären; ändert sich eine Zahl, ändern sich Anzeige, Sätze und Faktenzeile mit.

### 6.7 Kapazität (alt §8; aktuelle Werte in §4)
- Rhythmus: [[Produktion Rhythmus und Modelle]] (CLAUDE.md §4) (4 Videos/Tag, max. 2 Agenten). Aufwand je Video (S): Aufwand 2 = 1,5 Std., 3 = 3 Std., 4 = 5 Std.; insgesamt ca. 212 Std. Agentenarbeit (Ø 3,5 Std./Video), Woche 1 am teuersten (alle sechs Grundwelten entstehen), Ziel ab Woche 3: 1,5–2 Std. je Video.
- Rendern: 80 s × 30 = 2.400 Bilder; Cloud ca. 2,5–3,1 s/Bild → ca. 100–125 Min. je Video; Standard ist der Render-Dienst auf dem Windows-PC ([[Produktion Rhythmus und Modelle]] (CLAUDE.md §4)). Szenen mit viel Wasser, Partikeln oder Vegetation (Gibraltar, Afar, Eis schmilzt, Erdgeschichte, Heuschrecken) früh am Vortag starten. Engpässe: Erdgeschichte (15.11., Aufwand 4 plus Vorbau) und Plattentektonik-Zeitraffer (Pangaea, 24.11.).

### 6.8 Reserve und Hinweise (alt §9)
- Reserve R1–R15 mit Score und Grund steht in der CSV (`datum` = reserve): u. a. Erde kreist nicht mehr (R1, zu nah an „Sonne 1 m näher“ und am Lunar-Hit), ganze Erde zufriert (R2), Schnee schwarz (R3), Saturnring (R4), Schwitzen kühlt nicht (R5), Regentropfen wie Wasserbomben (R6), Nordpol eisfrei (R7), Meere verdunsten (R8), Luft wie auf der Venus (R9), fremder Stern (R10), Seil um den Äquator (R11, 03.11. eingesetzt), Los Angeles neben San Francisco (R12), Erdplatten stehen still (R13), Hawaii bis Japan (R14), Licht nur 100 km/h (R15).
- Captions: Format „Frage? Emoji Ich hab's durchgespielt. Kommentarfrage? 👇 #t1 #t2 #t3 #wissen #waswaerewenn“, Textteil unter 150 Zeichen.
- Der Plan-Wert „Höhepunkt 55–62 s, Faktenzeilen als Satz“ wird beim Skript auf die Form des Skills gebracht (Höhepunkt 58–62 s, im Moment „HIER“ kein Satz, Faktenzeile „ORT, JAHR · FAKT“), ohne den Inhalt zu ändern.
- Werte mit „prüfen“ in `kernrechnung` und `quellen_pruefen` vor dem Bau klären: Eisdicke über Toronto, Fallhöhe des Meeres nahe Grönland, Batagaika-Wachstum, Tambora–Genf, Rio-Negro-Pegel 2023, Leoniden-Maximum 2026, COP31-Termin. Ändert sich eine Zahl, ändern sich Anzeige, Sätze und Faktenzeile mit.
- Lunar postete die geprüften Videos zwischen 01. und 08.10.2026 und kann nachlegen: ein neues Lunar-Thema, das mit einem Planthema übereinstimmt, sperrt dieses Thema (dann Reserve).
- `tools/account2_uebersicht.py` erzeugt die HTML-/PDF-Übersicht für den Inhaber (`docs/plan/`).

## Siehe auch
[[Account stelldirvor.pov Überblick]] · [[Format Account 2 Lunar]] · [[Ablauf Account 2]] · [[Design Account 2]] · [[Licht und Effekte Account 2]] · [[Ton Account 2]] · [[Technik und Szenenbau Account 2]] · [[Prüfung und Abnahme Account 2]] · [[Konkurrenz-Check und Sperrliste Account 2]]

Account 1 gehört nicht hierher: [[Trennung der Accounts]] · Einstieg [[Index]] · Gemeinsame Regeln: [[Plattformregeln und Posting]], [[Produktion Rhythmus und Modelle]], [[Render-Dienst Windows-PC]].
