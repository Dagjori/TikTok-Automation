# Analyse-Raster (je Video, im kleinsten Detail)

## 1. Arbeitsweise je Video
1. `messung.md` lesen (Zahlen, Takt-Tabelle, Offen).
2. Kontaktbögen der Reihe nach ansehen: Aufbau in Phasen gliedern, Schauplätze, Text im Bild, Design.
3. `hook_0-3s.jpg`, `einstieg_3-8s.jpg`, `erstes_bild.jpg`: Hook Bild für Bild.
4. `schnitte_NN.jpg`: jeden Übergang einordnen.
5. `spektrum_NN.png` + Effekt-Kandidaten + Takt-Tabelle: Ton.
6. `transkript.srt` (falls vorhanden): Skript Satz für Satz, mit Zeiten.
7. Fehlt eine Sekunde im Detail, gezielt ein Einzelbild ziehen: `ffmpeg -ss <t> -i videos/V07.mp4 -frames:v 1 analysen/V07/bilder/t_<t>.jpg`.
8. `analyse.md` nach der Vorlage schreiben, dann `merkmale.json` aus dem Katalog (§2) kodieren.

Jede Antwort mit Zeitstempel und **F/S/A/offen**. „Nicht vorhanden“ ist eine Antwort (F), „nicht feststellbar“ ist offen.

## 2. Merkmal-Katalog (`merkmale.json`)
- `merkmale`: Ja/Nein-Merkmale (`true`/`false`), Kategorien (ein Wert als Text) und Mehrfachwerte (Liste). `werte`: Zahlen.
- **Nur Schlüssel aus diesem Katalog**, Werte in der Schreibweise des Katalogs. Was nicht feststellbar ist, wird **weggelassen** (nicht `false`): Die Synthese zählt dann nur Videos, in denen es kodiert ist.
- Neues, wiederkehrendes Merkmal? Mit Präfix `neu.` anlegen, nach 6 Videos in den Katalog übernehmen (diese Datei, mit Datum) und **in allen bisherigen Videos nachkodieren**.
- Zahlen aus der Messung (Schnitte, Lautheit, Wörter …) zieht die Synthese selbst aus `messung.json`; nicht doppelt kodieren.

## 2b. Katalog-Ergänzung vom 07.11.2026 (aus den ersten 16 Vorbildern, beide Accounts)
Diese Merkmale gelten ab sofort wie der übrige Katalog (Ja/Nein, wenn nicht anders angegeben). In Klammern: aus welchen `neu.`-Namen sie zusammengeführt wurden.

| Schlüssel | Bedeutung |
|---|---|
| `hook.anapher` | Wiederholungsfigur im Hook (z. B. dreimal „gleich“, dann der Unterschied) (`neu.anapher_hook`) |
| `hook.abstimmung` | Zuschauer soll sich im Hook festlegen (Ja/Nein-Chips, Abstimmung, oft mit Countdown) (`neu.abstimmung_mit_countdown`) |
| `skript.koeder_frage` | naheliegende Antwort bzw. Mehrheitsmeinung wird ausgesprochen und sofort angezweifelt („…, oder?“) (`neu.koeder_frage_falsche_erwartung`, `neu.kontra_erwartung_mit_zweifel_nachsatz`) |
| `skript.statistik_saetze` | Sätze mit Häufigkeit oder Anteil („x von y“, „x %“) als Faktenanker (`neu.statistik_saetze`) |
| `skript.beleg_gezeigt` | ein bekannter Versuch, eine Quelle oder ein Experte wird als Beleg genannt oder gezeigt (`neu.externer_beleg`) |
| `struktur.fehlversuch_zuerst` | der naheliegende Versuch scheitert früh sichtbar, dann folgt der Umbau (`neu.fehlversuch_zuerst`) |
| `struktur.fairness_regeln` | gleiche Startbedingungen werden ausdrücklich aufgezählt bzw. abgehakt (`neu.fairness_regeln_mit_haekchen`) |
| `struktur.startsignal` | sichtbares Startsignal für das Rennen oder den Versuch (Ampel, „Los“, Startlinie) (`neu.startsignal`) |
| `struktur.warum_teil` | eigener Erklärteil nach dem Ergebnis („Warum?“) (`neu.warum_erklaerteil`) |
| `struktur.zweiter_lauf` | nach der ersten Auflösung wird eine Bedingung geändert und neu gerechnet bzw. simuliert (`neu.zweiter_lauf_variable`) |
| `struktur.beweiskette` | das Ergebnis wird in mehreren getrennten Belegstufen aufgebaut, jede mit eigener Grafik (`neu.beweiskette_stufen`) |
| `struktur.frage_antwort_kette` | Schluss als Kette kurzer Fragen mit Kurzantworten (`neu.frage_antwort_kette_im_schluss`) |
| `struktur.zeitkapitel` | Zeitsprünge bzw. Kapitel werden ausgewiesen (Karte „N später“, Anzeige „Tag 1, Tag 2 …“) (`neu.zeitsprung_karten`, `neu.zeitkapitel_anzeige`) |
| `struktur.schlusskarte` | das Video endet auf einer Text- oder Tafelkarte (Fazit, Merkkarte, Titelwiederholung, Faktzeile, Abspann) (`neu.schluss_titelkarte`, `neu.merkkarte_am_schluss`) |
| `spannung.wissensvorsprung` | der Zuschauer weiß durch Titel oder Countdown mehr als die Welt im Bild (`neu.wissensvorsprung`) |
| `spannung.ereignis_auf_countdown_null` | das Hauptereignis fällt genau auf das Ablaufen eines Countdowns (Bild, Ton, Anzeige gleichzeitig) (`neu.ereignis_auf_countdown_null`) |
| `spannung.doppel_countdown` | zwei Countdowns nacheinander (bis zum Ereignis, dann bis zur Rückkehr bzw. zum Ende) (`neu.doppel_countdown`) |
| `spannung.kernzahl_isoliert` | die Kernzahl wird allein und groß inszeniert (Hintergrund unscharf, Pause davor) (`neu.kernzahl_isoliert`, `neu.sprechpause_vor_kernzahl`) |
| `design.hud_statuszeile` | unter der Hauptzahl der Anzeige steht eine Statuszeile, deren Text mehrfach wechselt (`neu.hud_statuszeile`) |
| `design.hud_messgroesse_wechselt` | die Hauptzahl der Anzeige wechselt im Verlauf die Messgröße (Zeit → Temperatur → Entfernung …) (`neu.hud_messgroesse_wechselt`) |
| `design.hud_wort_statt_zahl` | die Anzeige zeigt an Wendepunkten oder am Ende ein Wort oder Zeichen statt einer Zahl („HIER“, „?“, durchgestrichen) (`neu.hud_wort_statt_zahl`, `neu.zahl_offen_nach_wendung`) |
| `design.zustandsfarbe_anzeige` | Zahl oder Anzeige wechselt die Farbe mit der Lage (Führung, Gefahr, Zustand) (`neu.zustandsfarbe_zaehler`) |
| `design.vergleichszeichen` | zwischen zwei Anzeigen steht ein Vergleichszeichen (VS, <, >, ?) (`neu.vergleichszeichen_zwischen_tafeln`) |
| `design.hud_abgeblendet_bei_erklaerung` | während der Erklärung treten Tafel und Zähler zurück, eine Erklärgrafik liegt darüber (`neu.hud_abgeblendet_bei_erklaerung`) |
| `design.symbol_im_hook` | animiertes Themensymbol im Hook, das danach weiterverwendet wird (`neu.symbol_im_hook`) |
| `design.hinweis_simulation` | sichtbarer Hinweis, dass es eine Simulation bzw. Modellrechnung ist (`neu.hinweis_simulation`) |
| `design.farbdramaturgie` | Farb-, Licht- oder Renderwelt wechselt sichtbar mit dem Zustand der Geschichte (`neu.farbdramaturgie`, `neu.render_stilwechsel`) |
| `design.ankerbild_wiederkehr` | ein Ankerbild bzw. eine Hauptfigur kehrt zwischen Sprüngen wieder (`neu.ankerbild_wiederkehr`) |
| `design.schnittansicht` | für das Warum wird ein Objekt aufgeschnitten oder durchsichtig gezeigt (`neu.schnittansicht_erklaerung`) |
| `design.kontrollobjekt` | ein halbtransparentes Vergleichsobjekt zeigt den Fall ohne den entscheidenden Faktor (`neu.geist_vergleichsobjekt`) |
| `design.player_steuerung` | Erklärung über Pause, Zurückspulen, Wiederholen als sichtbare Steuerung (`neu.player_steuerung_als_erklaergeruest`) |
| `design.alltagsmass_grafik` | das Ergebnis wird als Vielfaches in Alltagseinheiten gezeigt (Eimer, Packungen …) (`neu.faktor_als_alltagsmass_grafik`) |
| `animation.figur_mimik` | eine Figur reagiert mit Mimik auf Wendungen und spiegelt die gewünschte Reaktion (`neu.mimik_der_figur_als_reaktion`) |
| `animation.zaehler_exponentiell` | ein Zähler wächst sichtbar exponentiell (`neu.zaehler_exponentiell`) |
| `animation.zeitlupe` | Zeit wird sichtbar gedehnt (Zeitlupe, langsamer laufender Countdown); ob der Faktor angezeigt wird, steht in `analyse.md` (`neu.zeitlupe`) |
| `struktur.genrebruch` | die Tonlage kippt sichtbar (z. B. komische Prämisse → echte Gefahr) (`neu.genrebruch`) |
| `skript.callback_pointe` | die Schlusspointe greift ein Element vom Anfang wieder auf (`neu.callback_pointe`) |
| `cta.folgen_animiert` | der Folgen-Aufruf ist ein animiertes Bildelement (`neu.cta_folgen_animation`) |
| `text.schluesselwort_farbig` | ein Schlüsselwort in Titel oder Untertitel ist nach Bedeutung eingefärbt (z. B. Teamfarbe), nicht nur das gerade gesprochene Wort (`neu.schluesselwort_farbig`, `neu.text_schluesselwort_farbig`, `neu.schluesselwort_in_teamfarbe`, `neu.titel_schluesselwort_farbig`) |
| `text.titeltafel_im_hook` | eine große Titelfrage bzw. Titeltafel trägt den Hook (statt nur Untertitel) (`neu.hook_titeltafel_statt_untertitel`, `neu.titelkarte_statt_untertitel_im_hook`) |
| `text.saetze_kursiv` | kurze Erzählsätze satzweise und kursiv im Bild, ohne Stimme (`neu.text_saetze_kursiv`) |
| `text.titel_kehrt_zurueck` | die Titelfrage wird am Schluss erneut gezeigt (Klammer) (`neu.titel_kehrt_zurueck`, `neu.abspann_titel_wiederholt`) |
| `text.faktzeile_am_schluss` | am Schluss eine kleine Faktzeile, die die Prämisse real einordnet (`neu.abspann_faktzeile`, `neu.abspann_realitaetscheck`) |
| `text.pause_am_gipfel` | bewusst keine Textzeile am stärksten Bildmoment (`neu.textpause_am_gipfel`) |
| `ton.nur_atmo_und_effekte` | keine Musik und kein Sprecher: Ton nur aus Atmo und Effekten (`neu.ton_nur_effekte`) |
| `ton.pov_filter` | der Ton folgt der Wahrnehmung des Helden (dumpf unter Wasser, Tinnitus …) (`neu.ton_pov_filter`) |
| `ton.figuren_stimmen` | keine Erzählstimme, aber Stimmen von Figuren in der Szene (`neu.figuren_stimmen`) |
| `schnitt.pov_lidschlag` | Schwarzbilder als Augen zu/auf des POV-Helden, als Kapitelübergang (`neu.pov_lidschlag`) |
| `plattform.kommentar_antwort` | Video ist als Antwort auf einen Zuschauerkommentar markiert (`neu.kommentar_antwort_sticker`) |

**Auslegung (beim Nachkodieren am 07.11.2026 festgelegt):** „im Hook“ heißt 0–3 s · `skript.statistik_saetze` nur echte Häufigkeiten oder Anteile als Faktenanker, nicht Vergleiche zwischen den simulierten Seiten · `struktur.schlusskarte` zählt auch ein großes Text-Urteil über der stehenden Szene; bei Loop-Videos zählt das letzte Inhaltselement vor dem Rücksprung · `design.vergleichszeichen` zählt auch Formeln mit < > ≈ · `struktur.zeitkapitel`: eine laufende Uhr bzw. ein Zähler mit Zeitraffer-Hinweis ist kein Kapitel · `spannung.ereignis_auf_countdown_null` gilt auch für Zähler, die auf 0 fallen (Entfernung, Anzahl) · `skript.frage_an_zuschauer`: die rhetorische Titelfrage allein zählt nicht · `cta.art`: eine Du-Schlussfrage ohne ausdrücklichen Aufruf ist `cta.kommentar_ausloeser_implizit`, kein `kommentar` · `design.kamera` bei 2D: Ein-/Ausfahrt = zoom, seitliches Verschieben = schwenk, Mitlaufen = folgt_objekt · `schnitt.uebergang` = eine_einstellung, wenn mindestens 50 % der Handlung in einer Einstellung laufen · `ton.stimme` = ki nur mit begründeter Folgerung, sonst weglassen; `ton.musik` nur bei eindeutigem Beleg.

Entfallen (durch bestehende Merkmale abgedeckt oder Einzelfall): `neu.parameter_stufen_bis_kipppunkt` → `spannung.eskalation_stufen` + `spannung.fuehrungswechsel`; `neu.abspann_frage_an_zuschauer` → `skript.schluss` = frage; `neu.schlusssatz_farbig` → `text.schluesselwort_farbig`; `neu.rate_gegen_festmenge` (Einzelfall, inhaltsnah).

## 3. Die Bereiche A–M

### A · Steckbrief und Erfolg (aus `korpus.csv`, F)
Aufrufe, Likes, Kommentare, Shares, Saves, Follower, Datum, Länge; daraus je 100 Aufrufe und Aufrufe je Follower. Auffälligkeiten notieren (z. B. ungewöhnlich viele Saves = Nutzwert, viele Kommentare = Streitpunkt).

### B · Struktur und Phasen
| Frage | Quelle | Kodierung |
|---|---|---|
| Welche Phasen mit Zeiten? (Hook, Versprechen/Regeln, Aufbau, Wendungen, Höhepunkt, Auflösung, Schluss, Loop) | Kontaktbögen, Transkript, Takt-Tabelle | Tabelle in `analyse.md`; `werte`: `struktur.phasen`, `struktur.hook_ende_s`, `struktur.hoehepunkt_s`, `struktur.aufloesung_s` |
| Welcher Grundtyp? | Gesamtbild | `struktur.typ`: duell · rennen · countdown · liste · vorher_nachher · gedankenexperiment · geschichte · enthuellung · erklaerung · zeitraffer · experiment |
| Endet es so, dass der Anfang nahtlos folgt? | `loop_anfang_ende.jpg`, Loop-Differenz, letzter Satz | `struktur.loop` |
| Teil einer Serie, Verweis auf Teil 2? | Bild, Text, Caption | `struktur.serie` |
| Wie viele offene Fragen werden aufgemacht und wann geschlossen? | Transkript, Bild | `werte`: `struktur.offene_schleifen`; Zeiten in `analyse.md` |
| Wo liegt die Auflösung relativ zur Länge? | Phasen | `werte`: `struktur.aufloesung_prozent` |

### C · Hook (0–3 s) und Halt (3–8 s)
| Frage | Quelle | Kodierung |
|---|---|---|
| Was sieht man im **ersten Bild**, ohne Ton verständlich? | `erstes_bild.jpg` | `hook.erstes_bild_ohne_ton_verstaendlich` |
| Bewegt sich ab Bild 1 etwas? | Hook-Bogen, Bewegung Einstieg | `hook.bewegung_ab_bild_1` |
| Ton ab 0,0 s (Stimme, Effekt, Musik)? | Spektrum 01, Sprechbeginn | `hook.ton_ab_start` |
| Hook-Art (mehrere möglich) | Bild + Transkript | `hook.typ`: frage · zahl · kontra_erwartung · duell · gefahr · neugier_luecke · spektakel_bild · direkte_ansprache · ergebnis_zuerst · vorher_nachher · pattern_interrupt |
| Zahl im ersten Satz? | Transkript/Text | `hook.zahl_im_ersten_satz` |
| Text im Bild im Hook? Wie viele Wörter, wo? | Hook-Bogen | `hook.text_im_bild`; `werte`: `hook.text_woerter` |
| Wird klar, *was* man erfährt (Versprechen), und ab wann? | Transkript, Bild | `hook.versprechen`; `werte`: `hook.versprechen_klar_s` |
| Du-Ansprache, persönlicher Einsatz („du verlierst …“)? | Transkript | `hook.du_ansprache` |
| Gesicht oder Figur im Hook? | Bild | `hook.figur_oder_gesicht` |
| Erstes Wort, Wörter im ersten Satz | Transkript | `werte`: `hook.erstes_wort_s`, `hook.woerter_erster_satz` |
| Was hält ab 3 s? (Regeln, erste Zahl läuft, Wechsel, Frage offen) | Einstiegs-Bogen | Text in `analyse.md`; `hook.halt_mittel`: regeln · zaehler_laeuft · szenenwechsel · offene_frage · eskalation · keine |

### D · Skript und Sprache (mit Transkript; ohne Stimme: Texte im Bild)
**Nur Aufbau und Art, nie Inhalt (Inhaber 07.11.2026).** Ausgewertet wird, *wie* das Skript gebaut ist: Satzfunktionen und ihre Reihenfolge, Länge, Tempo, Rhythmus, Perspektive, Rhetorik, Spannungsführung, Aufruf. *Worum* es geht, wird nicht ausgewertet und nie zur Regel; das Thema steht in `analyse.md` höchstens als Ein-Wort-Kategorie (z. B. „Naturgewalt“, „Finanzvergleich“) unter „Kontext“. Satzfunktionen beschreiben ohne Inhalt: „Satz 3: Regel mit Zahl, 7 Wörter“, nicht „Satz 3: Jonas zahlt 9.000 Steuern“.
| Frage | Quelle | Kodierung |
|---|---|---|
| Sätze, Wörter je Satz, Tempo | Transkript, Messung | `werte`: `skript.saetze`, `skript.woerter_je_satz_median` |
| Erzählperspektive | Transkript | `skript.perspektive`: du · ich · wir · neutral · figur |
| Zahlen-Dichte (mind. eine Zahl je 10 s?) | Transkript | `skript.zahlen_dicht`; `werte`: `skript.zahlen` |
| Wendungen („aber“, „doch“, „jetzt kommt’s“) mit Zeiten | Transkript | `skript.wendung`; `werte`: `skript.wendungen` |
| Fragen an den Zuschauer (außer der Titelfrage; eine rhetorische Titelfrage allein zählt nicht) | Transkript, Texte im Bild | `skript.frage_an_zuschauer` |
| Alltagsvergleich, Bildsprache („so viel wie …“) | Transkript | `skript.alltagsvergleich` |
| Fachbegriffe erklärt oder vermieden? | Transkript | `skript.fachbegriffe`: erklaert · vermieden · unerklaert |
| Kernzahl/Kernaussage wiederholt? | Transkript | `skript.wiederholung_kern` |
| Pointe am Ende, Art des Schlusssatzes | Transkript | `skript.pointe`; `skript.schluss`: frage · fazit · cliffhanger · aufforderung · loop_satz · zahl |
| Diskussionsstoff (implizit, ohne Aufruf) | Inhalt | `skript.streitpunkt_implizit` |
| Rhythmus: kurze und lange Sätze im Wechsel? Pausen vor Zahlen? | Transkript, Stille | Text in `analyse.md` |
**Nie das Transkript abschreiben.** In `analyse.md` Sätze nur als Funktion beschreiben („Satz 3: Regel 1 mit Zahl, 7 Wörter“).

### E · Spannung und Dramaturgie
| Frage | Quelle | Kodierung |
|---|---|---|
| Spannungskurve je 5 s (0–10, eigene Einschätzung) neben der gemessenen Intensität | Takt-Tabelle + Inhalt | Tabelle in `analyse.md` (S) |
| Eskalation in ≥ 3 Stufen? | Phasen | `spannung.eskalation_stufen` |
| Neuer Reiz spätestens alle 10 s (Re-Hook)? Mittlerer Abstand | Kontaktbögen, Transkript | `spannung.re_hook`; `werte`: `spannung.re_hook_abstand_s` |
| Führungswechsel, Gleichstand, Aufholjagd | Bild/Zahlen | `spannung.fuehrungswechsel` |
| Zweite Überraschung nach der ersten Auflösung | Transkript/Bild | `spannung.zweite_ueberraschung` |
| Uhr, Countdown, Fortschrittsbalken | Bild | `spannung.zeitdruck_anzeige` |
| Höhepunkt im letzten Drittel? Wann genau? | Phasen, Messung | `spannung.hoehepunkt_letztes_drittel`; `werte`: `spannung.hoehepunkt_s` |
| Persönlicher Einsatz für den Zuschauer (sein Geld, seine Zukunft) | Skript | `spannung.einsatz_persoenlich` |
| Wendepunkte (Anzahl, Zeiten) | Phasen | `werte`: `spannung.wendepunkte` |

### F · Bild und Design
| Frage | Quelle | Kodierung |
|---|---|---|
| Machart | Kontaktbögen | `design.machart`: 3d_render · 2d_animation · realfilm · screen · stock_montage · ki_bild · whiteboard · karte_daten · gemischt |
| Perspektive | Bilder | `design.perspektive`: pov · frontal · draufsicht · seitlich · wechselnd |
| Kamera | Bilder, Bewegung | `design.kamera` (Liste): statisch · fahrt · zoom · schwenk · handkamera · folgt_objekt |
| Farbschema (Palette aus der Messung + Eindruck) | Messung, Bilder | `design.farbschema`: dunkel_neon · hell_sauber · warm · kalt · natuerlich · zwei_farben_kontrast |
| Zwei feste Gegenspieler-Farben? | Bilder | `design.zwei_teamfarben` |
| Anzeigetafel/HUD, Zähler, Uhr, Karte, Diagramm | Bilder | `design.hud`, `design.zaehler`, `design.uhr`, `design.karte`, `design.diagramm` |
| Figuren, Menschen, Tiere, Fahrzeuge | Bilder | `design.figuren`, `design.reale_menschen` |
| Detaildichte der Welt (belebt, Hintergrund arbeitet mit) | Bilder | `design.detailreich` |
| Licht: Glow, Bloom, Lichtstrahlen, Tageszeitwechsel | Bilder | `design.lichteffekte`, `design.tageszeit_wechsel` |
| Partikel, Wetter, Rauch | Bilder | `design.partikel` |
| Wiederkehrendes Markenelement, Logo, Kanalname im Bild | Bilder | `design.signatur`, `design.logo_kanalname` |
| Schauplätze (Anzahl), Bildaufbau (Mitte, Drittel, symmetrisch), sichere Zonen eingehalten | Bilder | `werte`: `design.schauplaetze`; `design.bildaufbau`: mitte · drittel · symmetrisch · frei |

### G · Text im Bild
| Frage | Quelle | Kodierung |
|---|---|---|
| Untertitel? Stil? | Kontaktbögen | `text.untertitel`; `text.untertitel_stil`: wort_fuer_wort · satzweise · stichwort |
| Aktuelles Wort hervorgehoben (Farbe)? | Hook-Bogen | `text.wort_hervorgehoben` |
| Schrift, Rand | Bilder | `text.schrift`: fett_serifenlos · serifen · hand · mono; `text.rand`: kontur · kasten · schatten · keiner |
| Position | Bilder | `text.position`: oben · mitte · unten · wechselnd |
| Titel/Frage dauerhaft oben? | Bilder | `text.titel_dauerhaft` |
| Große Zahlen als Bildelement | Bilder | `text.zahlen_gross` |
| Emojis, Pfeile, Markierungen | Bilder | `text.emoji`, `text.pfeile_markierung` |
| Wörter je Einblendung, Textwechsel je Minute, kürzeste Lesezeit | Kontaktbögen, Hook-Bogen | `werte`: `text.woerter_je_einblendung`, `text.wechsel_je_min`, `text.lesezeit_min_s` |

### H · Schnitt und Übergänge
| Frage | Quelle | Kodierung |
|---|---|---|
| Übergangsarten (jede in `schnitte_NN.jpg` einordnen) | Schnittbilder | `schnitt.uebergang` (Liste): hart · match_cut · zoom · whip_pan · wischen · blende · morph · licht_blitz · eine_einstellung |
| Schnitte auf den Takt der Musik oder auf Satzgrenzen? | Schnittzeiten vs. Takt/Transkript | `schnitt.auf_takt`, `schnitt.auf_satzgrenze` |
| Wird das Tempo zum Höhepunkt schneller? | Takt-Tabelle | `schnitt.tempo_steigt` |
| Zeitsprünge/Zeitraffer im Schnitt | Bilder | `schnitt.zeitsprung` |

### I · Bewegung und Animation
| Frage | Quelle | Kodierung |
|---|---|---|
| Nie Stillstand über 2 s? (ruhige Sekunden der Messung prüfen) | Messung, Bögen | `animation.dauerbewegung` |
| Elemente fliegen ein, wachsen, ploppen auf | Bögen | `animation.einflug` |
| Zähler laufen sichtbar hoch | Bögen | `animation.zaehler_laeuft` |
| Aufleuchten, Pulsieren bei wichtigen Zahlen | Bögen | `animation.aufleuchten` |
| Kamera folgt dem Geschehen | Bögen, Bewegung | `animation.kamera_folgt` |
| Welt reagiert (Objekte bewegen sich als Folge) | Bögen | `animation.welt_reagiert` |
| Zeitraffer sichtbar mit laufender Größe | Bögen | `animation.zeitraffer` |

### J · Ton (Stimme, Musik, Effekte)
| Frage | Quelle | Kodierung |
|---|---|---|
| Stimme: Art, Geschlecht, Tempo, Tonfall | Spektrum, Transkript-Tempo, Pausen (S, ohne Hören) | `ton.stimme`: ki · mensch · keine; `ton.stimme_tempo`: ruhig · normal · schnell; `ton.stimme_tonfall`: sachlich · erzaehlend · aufgeregt · fluesternd |
| Musik: ja/nein, Art, Verlauf, Takt | Spektrum (Raster), Takt (S) | `ton.musik`; `ton.musik_art`: cinematic · elektronisch · lofi · orchester · trend_song · keine |
| Drop oder Musikwechsel am Höhepunkt | Spektrum, Lautheit | `ton.musik_wechsel_hoehepunkt` |
| Effekte auf Zahlen, auf Übergängen, bei Treffern | Effekt-Kandidaten vs. Zahlen/Schnittzeiten, Spektrum | `ton.sfx_auf_zahlen`, `ton.sfx_auf_uebergang`, `ton.sfx_impact`, `ton.sfx_pop_ding` |
| Riser vor dem Höhepunkt, Anschwellen | Anstiege (S), Spektrum | `ton.riser_vor_hoehepunkt` |
| Stille als Mittel (bewusste Pause vor Ergebnis) | Stille-Messung | `ton.stille_als_mittel` |
| Atmo/Klangteppich (Natur, Stadt, Raum) | Spektrum | `ton.atmo` |
| Effektdichte | Messung (S) | aus `messung.json`; bestätigt: `werte`: `ton.sfx_je_min_bestaetigt` |
**Hörprotokoll (optional, Inhaber):** Wo Spektrum und Messung nicht eindeutig sind, eine kurze Liste mit Zeitstempeln an den Inhaber („bei 12,4 s: Ding oder Kasse?“); seine Antworten gelten als F und stehen in `analyse.md`.

### K · Call to Action und Bindung
| Frage | Quelle | Kodierung |
|---|---|---|
| Aufruf: welche, wie, wann | Transkript, Bild | `cta.art` (Liste): folgen · kommentar · teilen · speichern · teil2 · keiner; `cta.form`: gesprochen · text · beides · keine; `werte`: `cta.zeit_s` |
| Kommentar-Auslöser ohne Aufruf (offene Frage, Streitpunkt, bewusst offene Rechnung) | Inhalt | `cta.kommentar_ausloeser_implizit` |
| Speicher-Grund (Nutzwert, Liste, Rechnung zum Nachlesen) | Inhalt | `cta.nutzwert` |
| Caption: Frage, Länge, Hashtags | Videoseite (falls notiert) | `plattform.caption_frage`; `werte`: `plattform.hashtags` |

### L · Plattform und Umfeld
Originalton oder Trend-Sound (`plattform.originalton`), Posting-Zeit falls bekannt, Serie/Kanal-Kontext, Format-Anteil am Kanal (Notiz).

### M · Erfolgshypothesen (je Video, S)
3–5 Hypothesen „Dieses Video funktioniert, weil …“, jede mit Beleg (Zeitstempel + Messwert/Bild) und Gegenprobe („wäre es ohne X schwächer? Hinweis aus dem Vergleich: …“). Dazu: **Was ist einzigartig** (nicht übertragbar, z. B. ein Ereignis aus den Nachrichten) und **was ist übertragbar**.

## 4. Gegenprobe beim Vergleichsvideo
Vergleichsvideos werden mit demselben Raster analysiert. Zusätzlich: „Was fehlt im Vergleich zum viralen Video desselben Creators oder Themas?“ (Zeitpunkte, Messwerte).
