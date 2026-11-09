---
typ: regel
konto: simulierbar
status: veraltet
datum: 2026-11-09
quelle: CLAUDE.md §5; bis 06.11. aus dem entfernten Skill simulierbar-video (massstab.md); Messung der ersten 4 Vorbilder vom 31.10.2026
tags: [konto/simulierbar, maßstab, prüfliste, vorbilder, gesetze, archiv]
cssclasses: [konto-simulierbar, typ-regel]
---

# Maßstab Simulierbar

> [!warning] Archiv und Messgrundlage (seit 09.11.2026)
> Diese Notiz ist **nicht mehr maßgeblich**. Sie bleibt als Messgrundlage der ersten 4 Vorbilder erhalten; die Messtabellen der fremden Videos sind Recherche-Daten und unverändert. **Abgelöst sind:**
> - **jede Vorgabe zum Sprechtempo** (Wörter je Sekunde, Silben, Satzpausen, Tempo-Profile, „Tempo 150–190 Wörter, Ziel ca. 2,3 W/s“, „2,3–2,7 W/s“): entfällt seit 09.11.2026, das Video folgt der fertigen Stimme → [[Stimme ElevenLabs Simulierbar]]
> - **Aufbau und Zeiten** (Gesetze zum Ablauf, Ergebnis bei 40–54 s, Kipp-Moment bei ca. 45 s, erste Wendung bei 18–25 s) → [[Skriptaufbau Simulierbar]], [[Videoaufbau Simulierbar]]
> - **Untertitel Wort für Wort, aktuelles Wort gelb** → Blöcke von 1–4 Wörtern, Schlüsselwort in der Teamfarbe ([[Design und Layout Simulierbar]])
> - **fester Schlusssatz, Folgen-Aufruf bei ca. 20 s, Schleife als Pflicht** → Schlusskarte, Schleife freiwillig, Folgen-Hinweis nur im Testblock ([[Regelwerk Simulierbar]])
> - **Sätze mit Auslassungspunkten, Großschreibung zur Betonung, Gefühls-Tags** → Textformat in [[Stimme ElevenLabs Simulierbar]]
> - **„Prüfliste 20 Punkte“** → 23 Punkte, maßgeblich ist [[Prüfung und Abnahme Simulierbar]]
> - **Themenregeln und Sperrliste** → [[Themenfindung Simulierbar]]
>
> Rangfolge: jüngste Entscheidung des Inhabers > [[REA Simulierbar Regelwerk]] > [[Regelwerk Simulierbar]] > Detail-Notizen > diese Notiz.

> [!info] Hinweis zu wörtlichen Auszügen
> Enthält wörtliche Auszüge der 4 Vorbildvideos. Entscheidung des Inhabers 02.11.: bleiben so (Risiko: öffentliches Repo; sicherste Lösung wäre, das Repo privat zu stellen).

**Verbindlich für jedes Simulierbar-Video** (Inhaber 31.10.: „das ist dein Maßstab, an dem wir uns richten müssen“). Bild, Stimme, Text, Hook, Ton, Captions und Themen richten sich danach. Jedes Video muss die **Prüfliste (20 Punkte, Abschnitt 11)** komplett erfüllen, bevor es in Buffer geht; das Messbare prüft `pipeline/qc/massstab.py` ([[Prüfung und Abnahme Simulierbar]]). Für Account 2 gilt dieser Maßstab **nicht** ([[Trennung der Accounts]]).

Einstieg: [[Account Simulierbar Überblick]]. Zeitplan, Satzmuster, Skript-Anforderungen, Dramaturgie: [[Videoaufbau Simulierbar]]. HUD-Umsetzung: [[Design und Layout Simulierbar]]. Themen und Auswahlregeln: [[Themenfindung Simulierbar]] und [[Finanzregeln Simulierbar]] (die Sperrliste ist seit 02.11.2026 veraltet: [[Sperrliste und Auswahlregeln Simulierbar]]).

**Stand 02.11.2026 abends:** Dieser Maßstab bleibt die Messgrundlage der 4 Vorbilder. Die Neuregeln des Inhabers ([[Account Simulierbar Überblick]]) haben Vorrang, wo sie abweichen: nur Thema GELD, keine Sperrliste, Länder frei, alle Stile mit Qualitätslatte, mehr Effekte mit steigender Spannung, **Tempo 150–190 Wörter (Ziel ca. 2,3 W/s)** statt der Spalten „Maßstab“ unten.

**Seit 07.11.2026 gehen die freigegebenen REA-Regeln vor** ([[REA Simulierbar Regelwerk]], 9 weitere Vorbilder): Untertitel in Blöcken von 1–4 Wörtern statt Wort für Wort, kein Pflicht-Folgen-Aufruf, **kein fester Schlusssatz** (Ende auf der Schlusskarte), Tempo 2,3–2,7 W/s, Endstand bei ca. 80 % der Länge (statt 40–54 s, Gesetz 8), neutrale Erzählhaltung (Du höchstens im Hook), dunkle Stile zuerst. `qc/massstab.py` ist seit 07.11. angeglichen (Punkte 7, 10, 11, 12b, 12c, 14, R1–R7); die Prüfliste unten ist markiert.

## Grundlage
- 4 MP4 vom Inhaber, hochgeladen am 31.10.2026, je 576×1024, 30 fps, 68–79 s. Stand der Auswertung 31.10.2026, ergänzt 01./02.11.
- Analysiert: Bild (1 Bild pro Sekunde komplett angesehen, die ersten 3 s mit 6 Bildern pro Sekunde), Bewegung und Schnitte (gemessen), Ton (Lautheit, Pausen, Klangteppich, Effekte), Sprache (Transkript mit Wortzeiten über ElevenLabs Speech-to-Text).
- **Speicherort:** Das Repo ist öffentlich. Originale, Transkripte und Standbilder der Konkurrenz liegen **nicht** im Repo (Urheberrecht, Konkurrenz soll die Auswertung nicht sehen); hier steht nur die eigene Auswertung mit kurzen Zitaten. Für eine erneute Analyse lädt der Inhaber die Dateien wieder hoch. Neue Vorbild-Videos werden genauso ausgewertet (jede Sekunde ansehen, Transkript mit Wortzeiten, Ton-Analyse) und hier ergänzt (Abschnitt 12).
- **Legende:** **(F)** gemessen bzw. im Video gesehen · **(A)** Annahme bzw. Deutung.

**Abweichungen bei uns (Inhaber-Entscheidungen, haben Vorrang vor den Vorbildern):** kein „Los geht's“ (Gesetz 5), ruhiger Erzähler statt Sportreporter (Gesetz 6), keine Sticker/Stempel (Bausteine), Untertitel Wort für Wort statt Phrasen (Abschnitt 8), Folgen-Aufruf und eigener Schlusssatz (Abschnitt 10), **Tempo 150–190 Wörter, Ziel ca. 2,3 W/s** (Mitte, Entscheidung 02.11. abends; Profil `ben` in `qc/massstab.py`), Stilfreiheit mit Qualitätslatte, mehr Effekte mit steigender Spannung. Siehe Abschnitt 10 und Prüfliste 18–23.

## Die vier Vorbilder
| Kürzel | Thema | Länge | Wörter | Optik |
|---|---|---|---|---|
| **K1** | Rennen oder gehen: Womit wirst du im Regen weniger nass? | 72,8 s | 195 | 2D-Flat, dunkles Navy, Strichfiguren auf zwei Bahnen, Regen |
| **K2** | 100 gegen 160 km/h, aber der Schnellere macht Pausen: Wer kommt zuerst an? | 68,5 s | 177 | 2D-Flat, Nacht-Autobahn mit Mond, zwei Autos, Daten-HUD |
| **K3** | Tsunami-Warnzeichen: Das Meer zieht sich zurück. Was jetzt? | 79,0 s | 224 | 3D-Miniaturwelt (Low-Poly, Pastell, Tiefenunschärfe), Querschnitte |
| **K4** | Duschen oder baden: Was verbraucht wirklich mehr Wasser? | 67,9 s | 169 | 2.5D-Illustration, warmes Bad, Messzylinder, Anzeigetafel |

K1, K2 und K4 nutzen dasselbe Gestaltungssystem: Chips, Untertitel mit farbigem Schlüsselwort und Teamfarben. Vermutlich stammen sie vom selben Kanal (A). Alle vier Themen sind **für uns gesperrt**, weil schon viral (> 1 Mio. Aufrufe je Video).

## 1. Die 12 Gesetze (gilt für jedes Video)
1. **Die Stimme startet sofort**, nach 0,08–0,16 s (F). Kein Intro, kein Logo, keine Einblendung vorab. Das erste Bild zeigt schon die ganze Szene mit beiden Kontrahenten.
2. **Der Hook ist eine Duell-Frage in 2 kurzen Sätzen:** „X oder Y? Was/Wer … wirklich …?“ (K1, K2, K4). Alternativ ein Du-Szenario: „Du liegst am Strand. Plötzlich …“ (K3). Der Titel baut sich Wort für Wort im Takt der Stimme auf.
3. **Die Regeln stehen in 3–6 Mini-Fakten** (2–5 Wörter je Satz), jede als Chip im Bild: „Hundert Meter, gleicher Regen, kein Wind.“
4. **Die Denkfalle:** „Klar, [naheliegende Antwort]. Oder?“ steht in 3 von 4 Videos (F), zwischen Sekunde 3 und 15.
5. **Das Startsignal:** „Los geht's.“ (3 von 4, F) zwischen Sekunde 11,6 und 15,5. Ab dann läuft ein Rennen mit sichtbarer Uhr bzw. Zählern. *(Bei uns entfällt „Los geht's“, siehe Abweichungen.)*
6. **Kommentar wie ein Sportreporter:** alle 2–3 s ein neuer Satz mit Zwischenstand · Führungswechsel und Countdown-Zahlen („Fünfzehn Kilometer, dreizehn, zwölf, zehn.“) · Spannungssätze („Jetzt wird's knapp.“, „Der Vorsprung schmilzt.“). *(Bei uns ruhiger Erzähler.)*
7. **Die erste Wendung kommt bei ca. 18–21 s:** „Aber jetzt kommt das Merkwürdige:“, „Doch jetzt hält B …“, „Doch das Wasser läuft weiter.“ Danach folgt etwa alle 8–10 s eine weitere Wendung bzw. ein Führungswechsel.
8. **Das Ergebnis mit exakter Zahl** kommt bei ca. 40–54 s: „Endstand:“, „A gewinnt.“ Sofort danach „Warum?“ mit einer einfachen Aufschlüsselung (2 Faktoren als Balken bzw. Karten).
9. **Die zweite Überraschung:** „Und das Verrückte:“ bzw. „Aber jetzt wechseln wir nur …“. Eine Variante dreht das Ergebnis.
10. **Ein Merksatz und eine Schlussfrage an den Zuschauer:** „Die Uhr entscheidet. Und du? Wie lange duschst du wirklich?“, „Hättest du gewusst, was dieses Zeichen bedeutet?“ Kein Logo, kein Abspann. K3 und K4 enden mit demselben Bild wie Sekunde 0 (**Endlos-Schleife**, F).
11. **Im Bild passiert alle 1–2 s etwas Neues:** ein Chip, ein Zähler, ein Sticker, ein Kameraschwenk oder ein Szenenwechsel. Zähler und Uhren laufen sichtbar mit. Ruhe gibt es höchstens 1–2 s am Stück. *(Sticker entfallen bei uns, auch nach der Lockerung der Effekte.)*
12. **Unter der Stimme liegt immer ein Klangteppich passend zum Thema** (Regen, Wasser, Meer, Nachtfahrt bzw. leise Musik), ca. 8–13 dB leiser als die Stimme. Dazu kommen kurze Effekte bei jedem Bild-Ereignis und ein Akzent-Klang auf der Pointe.

**Dazu (CLAUDE.md §5):** Dynamik entsteht nicht durch Pixelbewegung, sondern durch **neue Information im Sekundentakt**; Klangteppich 8–13 dB unter der Stimme, Effekt je Ereignis, Akzent auf der Pointe.

## 2. Messwerte
| Messgröße | K1 | K2 | K3 | K4 | **Maßstab** |
|---|---|---|---|---|---|
| Länge | 72,8 s | 68,5 s | 79,0 s | 67,9 s | **65–80 s** (wegen CRP mindestens 61 s) |
| Wörter | 195 | 177 | 224 | 169 | **170–220** |
| Sprechtempo | 2,72 W/s | 2,61 W/s | 2,86 W/s | 2,52 W/s | **2,5–2,9 Wörter/s** |
| Wörter je Satz (Median / Max.) | 6 / 17 | 5 / 16 | 8 / 33 | 4 / 13 | **Median 4–8, meist unter 10** |
| Pause nach Satzende (Median / Max.) | 0,26 / 0,34 s | 0,26 / 0,34 s | 0,24 / 0,34 s | 0,26 / 0,38 s | **ca. 0,25 s, nie über 0,4 s** |
| Pause nach Komma (Median) | 0,28 s | 0,28 s | 0,25 s | 0,29 s | ca. 0,25–0,3 s |
| Stimme startet bei | 0,16 s | 0,10 s | 0,10 s | 0,08 s | **unter 0,2 s** |
| Nach dem letzten Wort | 1,0 s (Jingle) | 0,7 s (Klang-Akzent) | 0,5 s | 0,8 s | **0,5–1,0 s**, dann Schleife |
| Lautheit | −18,5 LUFS | −18,6 LUFS | −15,4 LUFS | −18,9 LUFS | wir bleiben bei −14 LUFS (TikTok gleicht an) |
| Klangteppich in Sprechpausen, relativ zur Stimme | −13 dB | −8 dB (tonal, Musik) | −11 dB (Meer) | −10 dB (Wasser) | **−8 bis −13 dB, immer vorhanden** |
| Harte Schnitte | 0 | 4 | 0 (weiche Übergänge) | 1 | **kaum harte Schnitte, Wechsel über Kamera und Übergänge** |
| Längste Phase ohne Bildänderung | 5,6 s (Endstand-Karte) | 4,3 s | 1,7 s | 2,9 s | **höchstens 2 s** (K3 ist das beste Video) |

**Unsere bisherigen Videos, mit gleicher Methode gemessen (F):** GTA 6: Anteil Stillstand 29 %, längste Ruhephase 2,5 s. Spurwechsel: Anteil Stillstand 30 %, längste Ruhephase 3,4 s.

**Wichtige Erkenntnis:** Gemessen bewegt sich in unseren Videos sogar mehr Pixel als bei der Konkurrenz (auch wegen Filmkorn und Tiefenunschärfe). Trotzdem wirken sie statischer. **Dynamik entsteht nicht durch Pixelbewegung, sondern durch neue Information im Sekundentakt** (Zahlen, die laufen, Chips, die aufpoppen, Führungswechsel, Kamera, die dem Geschehen folgt). Genau das fehlte uns (A, aus dem Bildvergleich).

**Was bei uns gilt (Tempo, Entscheidung des Inhabers 02.11.2026 abends):** Die Spalten „Maßstab“ oben sind die gemessenen Werte der Vorbilder. Für Simulierbar mit Ben gilt die **Mitte** aus Ben-Profil (130–170 Wörter, ca. 2,0 W/s, 31.10.) und Vorbildern (170–220 Wörter, 2,5–2,9 W/s): **150–190 Wörter bei 65–80 s, Ziel ca. 2,3 W/s (Spanne 2,2–2,5), hörbare Satzpausen 0,35–0,6 s (Richtwert)**, flüssig und natürlich, ohne künstliches Beschleunigen ([[Stimme und Ton Simulierbar]]). Der frühere Widerspruch zwischen Ben-Profil und Prüfliste Punkt 12 (170–220 Wörter) ist damit aufgelöst: gültig ist nur diese Zahl.

## 3. Zeitachsen der vier Videos (eigene Auswertung, kurze Zitate)

### K1 · Rennen oder gehen im Regen (72,8 s)
| Zeit (s) | Stimme (Kurzfassung) | Bild |
|---|---|---|
| 0,2–3,4 | „Rennen oder gehen? Womit wirst du im Regen weniger nass?“ | Zwei Bahnen mit Läufer (koralle) und Geher (türkis), Regen läuft. Titel „RENNEN vs GEHEN / WER WIRD WENIGER NASS?“ baut sich Wort für Wort auf. |
| 3,5–9,4 | 100 m, gleicher Regen, kein Wind; 5 gegen 15 km/h | Chips poppen synchron: „100 M“, „GLEICHER REGEN“, „KEIN WIND“, „GEHEN 5 KM/H“, „RENNEN 15 KM/H“ |
| 9,5–11,6 | „Klar, Rennen ist besser, oder?“ | Chips „BESSER?“ und „ODER?“ |
| 11,6 | „Los geht's.“ | Rennen startet. Uhr oben, Wasser-Zähler (mL) je Figur laufen hoch, Regen wird dichter. |
| 12–18 | Läufer zieht davon, nach 24 s im Ziel | Uhr springt im Zeitraffer, Badge „IM ZIEL“, Fortschrittsmarke „33 m · 1/3“ |
| 18,4–28 | **Wendung:** „Aber jetzt kommt das Merkwürdige: … 31 gegen 14 ml“, „Noch nicht.“ | Kamera zoomt auf den Geher. Vergleichskarte „31 mL > 14 mL RENNEN SCHLECHTER?“, großes gelbes „NOCH NICHT.“, Badge „TROCKEN“ |
| 29–42 | Geher sammelt weiter Wasser, Countdown-Zahlen, Gleichstand nach 52 s | Zähler läuft hoch, „GLEICHSTAND 31 = 31“ gelb hervorgehoben, „NOCH NICHT IM ZIEL“ |
| 43–51 | „Endstand: … Zwölf Milliliter weniger. Mehr als ein Viertel. Rennen gewinnt.“ | Bilanzkarte baut sich zeilenweise auf: Gehen 43, Rennen 31, Differenz 12 mL (≈ 28 % weniger), „RENNEN GEWINNT“ |
| 51,6–66 | „Aber warum?“, getrennt nach „von vorne“ und „von oben“ | Balkenvergleich „VON VORNE 25 = 25 · GLEICH“, „VON OBEN 18 vs 6“, Chips „3× MEHR TROPFEN PRO SEK.“, „NUR 1/3 DER ZEIT“ |
| 67–72 | Merksatz „… nicht vor den Tropfen … wegrennen, aber vor der Zeit im Regen schon.“ | Karte „UNTERM STRICH“ und Jingle |

### K2 · Pausen gegen Tempo (68,5 s)
| Zeit (s) | Stimme | Bild |
|---|---|---|
| 0,1–4,9 | „Hundert gegen hundertsechzig, aber der Schnellere muss Pausen machen. Wer kommt zuerst an?“ | Zwei Autos fahren nachts, Tempo-Labels „100 km/h“ und „160 km/h“, Zusatz-Chip „MIT PAUSEN“, Karte „WER KOMMT ZUERST AN?“ |
| 5–13 | 220 km, A ohne Pause, B alle 40 km 10 min, B ist 60 % schneller | Streckenkarte mit Zielflagge und Pausen-Markern, Balkenvergleich „+60 %“ |
| 13,5–15,5 | „Klar, B gewinnt. Oder? Los geht's.“ | Ampel „LOS!“ |
| 16–33 | Rennen mit Führungswechseln: „Doch jetzt hält B …“, „A kommt näher und zieht vorbei.“ | „VORSPRUNG“-Zähler mit Team-Badge, Renn-Uhr, Pausen-Ring mit Countdown, Liste „B WIEDER VORNE NACH 1:40 / 3:20 / 5:00 / 6:40“, Kamera folgt den Autos |
| 33–48 | „Der Vorsprung schmilzt. Fünfzehn Kilometer, dreizehn, zwölf, zehn. Jetzt wird es eng.“ | Großer Balken „15 → 13 → 12 → 10 km“, „NOCH 20 KM“, „RÜCKSTAND B 8 → 5 → 2 km“ |
| 48,7–54 | „A ist im Ziel. … B kommt nur dreißig Sekunden später. A gewinnt.“ | Zielzeiten 2:12:00 gegen 2:12:30, „30 SEKUNDEN“, „A GEWINNT.“ in Teamfarbe |
| 54,8–62 | „Warum?“ Durchschnitt 96 gegen 100 km/h | Zeitleiste „15 MIN FAHREN · 10 MIN STEHEN“, „96 < 100“ |
| 62,6–68,5 | „Und das Verrückte: Mit neun Minuten Pause … hätte B gewonnen. Eine einzige Minute.“ | Vergleich 10 MIN gegen 9 MIN, „B GEWINNT“, Schluss mit großem „EINE EINZIGE MINUTE.“ und tonalem Akzent-Klang |

### K3 · Tsunami-Warnzeichen (79,0 s), das dynamischste Video
| Zeit (s) | Stimme | Bild |
|---|---|---|
| 0,1–7 | „Du liegst am Strand. Plötzlich zieht sich das Meer Hunderte Meter zurück. … Was passiert jetzt?“ | 3D-Luftaufnahme Küstenort, Kamera fliegt ständig. Das Meer zieht sich sichtbar zurück, Fische auf dem Sand. Titel-Sticker „WARUM VERSCHWINDET DAS MEER?“ |
| 7–17 | „Manche … würden neugierig näher gehen. Aber genau das könnte ein tödlicher Fehler sein.“ | Karte „HÖHER GELEGEN“ (grün) gegen „TIEF GELEGEN“ (rot), Sticker „TSUNAMI-WARNZEICHEN“ |
| 18–30 | Seebeben, Wassermasse, auf offenem Meer kaum zu sehen | Wechsel in den Unterwasser-Querschnitt, Plattenverschiebung, Wellenringe, Sticker „SEEBEBEN“, „KAUM ZU SEHEN“, „HOHE GESCHWINDIGKEIT“ |
| 30–38 | „Das Wasser wird flacher, die Welle wird langsamer, türmt sich auf …“ | Querschnitt Küste, Welle wächst. Sticker „FLACHER“, „LANGSAMER“, „HÖHER“ erscheinen einzeln. |
| 38–48 | „Plötzlich hörst du ein lautes Rauschen. …“ | Übergang durch Blasen bzw. Wolken, wieder Luftaufnahme, Wasser strömt über den Strand ins Land |
| 48–55 | „Was solltest du jetzt tun? Nicht filmen, nicht zum Wasser laufen …“ | Verbots-Icons (Handy, Laufen), Weg auf den Hügel, „SOFORT AUF HÖHERES GELÄNDE“ |
| 55–65 | **zweite Überraschung:** mehrere Wellen, die erste ist nicht die größte | Diagramm „WASSERSTAND“ mit drei Wellen, Warnband „DIE ERSTE IST NICHT IMMER DIE GRÖSSTE“ |
| 65–69 | „Wichtig: Nicht jeder Tsunami beginnt damit …“ | Zwei Vergleichskarten „MEER ZIEHT SICH ZURÜCK“ gegen „WASSER STEIGT SOFORT“ |
| 69–79 | „Also merk dir: … Hättest du gewusst, was dieses Zeichen bedeutet?“ | Wolken-Übergang **zurück zum Anfangsbild** (Schleife), Merk-Chips „MEER ZIEHT SICH ZURÜCK?“ und „SOFORT WEG VON DER KÜSTE!“ |

### K4 · Duschen oder baden (67,9 s)
| Zeit (s) | Stimme | Bild |
|---|---|---|
| 0,1–5,2 | „Duschen oder baden? Was verbraucht wirklich mehr Wasser? Klar, die Badewanne. Oder?“ | Bad mit Duschkabine und Wanne, Anzeigetafel „DUSCHE 0 L vs BADEWANNE 0 L“, Sticker „KLAR!“ mit Strahlenkranz, „ODER?“ |
| 5,3–12 | Vollbad 140 L, Dusche 14 L/min | Wanne läuft voll (Zähler 0 → 133 → 140 L), Etikett „VOLLBAD 140 L“, Kamera fährt zur Dusche, Karte „DURCHFLUSS 14 L PRO MINUTE“ |
| 12,1–13 | „Wer gewinnt? Los geht's.“ | Messzylinder erscheinen, Stoppuhr, Sticker „LOS GEHT'S!“ |
| 13,7–20 | „Eine Minute, drei, fünf, siebzig Liter. … Die Dusche gewinnt. Locker.“ | Zylinder füllt sich, Uhr läuft, „HALBE WANNE!“, Haken |
| 20,8–35 | „Doch das Wasser läuft weiter. … Jetzt wird's knapp. … Genau ein Vollbad.“ | Pfeil zur Linie, „NUR NOCH 14 L“, Gleichstand mit Strahlenkranz und „=“, Karte „10 MIN = 140 L = 1 VOLLBAD“ |
| 36–45 | „Aber die Dusche läuft weiter. … zweihundertzehn Liter, anderthalb Badewannen.“ | Stempel „ÜBERHOLT!“, Formel-Karte „14 L × 15 MIN = 210 L“, „≈ 1,5 BADEWANNEN“ |
| 45–58 | **zweite Wendung:** „Aber jetzt wechseln wir nur den Duschkopf. … erst nach zwanzig Minuten eingeholt.“ | Kamera in die Dusche, Duschkopf wechselt, „7 L/MIN“, Rennen läuft neu, „20 MIN = 1 VOLLBAD“ |
| 58–64 | Fazit: Dauer und Durchfluss zählen | Zwei Karten (normal ≈ 10 min, Spar ≈ 20 min), Chips „ZEIT + DURCHFLUSS“ |
| 64–67,9 | „Die Uhr entscheidet. Und du? Wie lange duschst du wirklich?“ | Große Uhr, „DIE UHR ENTSCHEIDET“, **letztes Bild = erstes Bild** (Schleife) |

## 4. Bild: Bausteine der Vorbilder (alle nachbauen, eigene Gestaltung)
| Baustein | Wie es aussieht | Wofür |
|---|---|---|
| **Anzeigetafel oben** | zwei Werte mit Teamfarbe und Label, „vs“-Kreis bzw. Uhr in der Mitte, oben im Bild (5–15 % der Höhe) | Stand des Duells immer sichtbar |
| **Live-Zähler** | Zahlen laufen sichtbar hoch (mL, L, km, Vorsprung) | Spannung ohne Worte |
| **Uhr bzw. Stoppuhr** | Renn-Uhr im Zeitraffer, Pausen-Ring mit Countdown | Zeitgefühl, Tempo |
| **Chips** | kleine abgerundete Etiketten in Teamfarbe, poppen exakt beim gesprochenen Wort auf | jede Regel bzw. Zahl sichtbar machen |
| **Sticker bzw. Stempel** | schräg, groß, mit Strahlenkranz bzw. Leuchten: „KLAR!“, „ODER?“, „LOS GEHT'S!“, „ÜBERHOLT!“, „NOCH NICHT.“ | Höhepunkte und Denkfalle. **Bei uns verboten (02.11.).** |
| **Fortschrittsleiste** | Strecke mit Marken (Pausen, Ziel), Positionspunkte der Teams | Überblick im Rennen |
| **Vergleichskarten** | „31 mL > 14 mL“, „96 < 100“, „10 MIN = 140 L = 1 VOLLBAD“, Formel „14 L × 15 MIN = 210 L“ | Rechnung verständlich machen |
| **Bilanzkarte** | baut sich Zeile für Zeile auf: Endstand, Differenz, Prozent, Sieger in Teamfarbe | Ergebnis |
| **Aufschlüsselung** | 2 Balken bzw. Karten je Faktor („VON VORNE“, „VON OBEN“) | „Warum?“ |
| **Kamera** | folgt dem Geschehen, zoomt auf den entscheidenden Moment, fährt in Objekte hinein (Duschkopf) | Dynamik |
| **Szenenwechsel** | K3: alle 5–15 s neue Ansicht (Luftbild, Nahaufnahme, Querschnitt, Diagramm), weiche Übergänge (Wolken, Blasen, Zoom) | Aufmerksamkeit halten |
| **Schleife** | letztes Bild = erstes Bild | mehrfaches Ansehen, längere Wiedergabezeit (A) |
| **Teamfarben** | zwei feste Farben je Video (z. B. Koralle gegen Türkis), überall gleich: Figuren, Tafel, Chips, Untertitel-Schlüsselwort | sofort klar, wer wer ist |

**Nicht vorhanden bei den Vorbildern (F):** kein Kanalname und kein Logo im Video · keine Rubrik-Einblendung („GELD“) · keine Quellenangaben im Bild · keine Gesichter bzw. echten Personen · keine Spielszenen · kein Kaufaufruf · kein Abspann.

## 5. Zuschauer-Ansprache
Direktes „du“ („Womit wirst du …“, „Und du?“). Im Text kommt kein „ich“ vor, außer bei uns „Ich hab's simuliert“ (K1–K4 sagen es nicht). Satzmuster und Spannungsbogen: [[Videoaufbau Simulierbar]].

## 6. Stimme der Vorbilder
- **Männlich, ruhig, sachlich, freundlich.** Erzähler-Ton, nicht reißerisch (A, aus Tempo und Pausen gedeutet; Klang nicht selbst gehört).
- 2,5–2,9 Wörter/s. Die Pausen sind **kurz** (Satzende ca. 0,26 s, nie über 0,4 s). Die Ruhe kommt aus den **sehr kurzen Sätzen**, nicht aus langen Pausen.
- **Folge für uns (neu gefasst 02.11. abends):** Die Vorbilder pausieren ca. 0,25 s; Ben im Original hörbar ca. 0,35 s (Messung F, 02.11.2026: `ffmpeg silencedetect` an den Stimmen von „Steuererklärung oder Überstunden“ und „Fußgängerampel“, Median je 0,35 s; die Alignment-Zeiten in `timing.json` liegen mit Median 0,22–0,24 s etwa 0,1 s darunter). Die frühere Angabe „0,5–0,7 s“ (31.10.) weicht davon ab (andere Erzeugungsart oder Messmethode, A). Für uns gilt als Richtwert **0,35–0,6 s hörbar**, damit Ben nicht gehetzt klingt; Tempo entsteht über Textlänge und Satzbau, nicht über kürzere Pausen. Ruhe entsteht über kurze Sätze und Satzzeichen, nicht über lange Stille.

## 7. Ton der Vorbilder
- Durchgehender Klangteppich passend zur Szene: Regen (K1), Musik bzw. tonaler Teppich (K2), Meer (K3), fließendes Wasser (K4). Er liegt in Sprechpausen 8–13 dB unter der Stimme (F).
- Kurze Effekte bei Bild-Ereignissen: Pop, Wisch, Klick (K4: deutliche Transienten bei Sekunde 1,6, 3,2 und 5,5, wenn Sticker und Wasser einsetzen).
- Akzent-Klang auf der Schlusspointe (K2: tonaler Nachhall, K1: kurzer Jingle).

## 8. Untertitel der Vorbilder
> **Bei uns gilt (Inhaber 01.11.):** Wort für Wort im Stil „kontur“, nicht in Phrasen. Die Beobachtung bleibt als Wissen über die Vorbilder stehen.
- Kurze Phrasen mit 2–5 Wörtern, die als Block erscheinen, im unteren Drittel (ca. 78–83 % der Bildhöhe).
- Eher klein (ca. 3 % der Bildhöhe), weiße fette Schrift. K1/K2 ohne Hintergrund, K3 mit dunkler Pille, K4 mit heller Karte.
- **Das Schlüsselwort ist in Teamfarbe eingefärbt** („Der **Läufer** zieht“, „Klar, die **Badewanne**.“).
- Der große Titel erscheint nur im Hook. Danach tragen Chips und Tafel die Zahlen.

## 9. Themen der Vorbilder (Muster)
- Alltagsfragen, die jeder kennt, mit kontraintuitiver Antwort: Regen, Autofahrt, Strand, Bad.
- **Messbares Duell bzw. Rennen gegen die Uhr** (3 von 4) oder ein lebenswichtiges Wissens-Szenario (K3).
- Die Antwort ist überraschend **und** hat eine Bedingung („Die Dusche gewinnt nicht automatisch.“), das sorgt für Diskussion.
- ~~Gesperrt für uns, weil schon viral:~~ Rennen gegen Gehen im Regen · Pausen gegen Tempo auf der Autobahn · Tsunami-Warnzeichen · Duschen gegen Baden. **Veraltet seit 02.11.2026 (Entscheidung des Inhabers): Die Sperrliste entfällt.** Diese vier Themen sind nicht mehr gesperrt, aber weiterhin gilt: keine 1:1-Kopie von Skript, Sätzen, Bild- oder Szenenideen („Unoriginal“); gleiches Thema nur mit eigenem Skript und anderem Design. Archiv: [[Sperrliste und Auswahlregeln Simulierbar]].

## 10. Was wir bewusst anders machen
| Punkt | Vorbilder | Wir | Grund |
|---|---|---|---|
| Folgen-Aufruf | keiner | kurz bei ca. 20 s: „Folg mir, damit du nichts verpasst.“ | Wunsch des Inhabers 31.10. |
| Schluss | Frage an den Zuschauer | „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ | Wunsch des Inhabers 31.10., ebenfalls eine Frage und damit maßstabsgerecht |
| Optik | 2D-Flat (K1, K2, K4), 3D-Miniatur (K3) | Three.js und Blender, gleiche Bausteine wie oben, hochwertiger in 3D; alle Stile 1–15 und 17–21 erlaubt, Qualitätslatte ([[Stile 17 bis 21]]) | Alleinstellung über Qualität (31.10.), Stilfreiheit (02.11. abends) |
| Tempo | 170–220 Wörter, 2,5–2,9 W/s | 150–190 Wörter, ca. 2,3 W/s, Ben im Original, flüssig und natürlich | Entscheidung des Inhabers 02.11. abends (Mitte) |
| Effekte | Sticker, Stempel, Strahlenkränze | Aufleuchten, Licht, Glow, Zoom (abwechselnd), Fahrten, Bildwechsel; Spannung steigt bis zum Ergebnis; keine großen Sticker | [[Videoaufbau Simulierbar]] Abschnitt 6, Inhaber 02.11. abends |
| Themen | Alltagsfragen mit Messung | nur GELD (Euro-Ergebnis), Länder frei, keine Sperrliste, keine 1:1-Kopie | Inhaber 02.11. abends |

Weitere Abweichungen (02.11.): kein „Los geht's“, keine Sticker, ruhiger Erzähler, Untertitel Wort für Wort, Schleife mit gleichem Anfangs- und Schlussbild, hochwertige 3D-Welt statt 2D-Flat ([[Stile 17 bis 21]]).

## 11. Prüfliste vor jeder Übergabe (alle 23 Punkte müssen „ja“ sein; 21–23 neu seit 02.11. abends)
| # | Prüfpunkt |
|---|---|
| 1 | Stimme startet unter 0,2 s, erstes Bild zeigt die komplette Szene mit beiden Seiten |
| 2 | Hook = Duell-Frage bzw. Du-Szenario in max. 2 Sätzen, fertig gesprochen vor Sekunde 5 |
| 3 | Denkfalle („Klar …, oder?“) und Startsignal vor Sekunde 16 *(Startsignal „Los geht's“ entfällt bei uns, siehe Punkt 19)* |
| 4 | Ab Rennstart laufen Uhr bzw. Zähler sichtbar mit |
| 5 | Keine Phase über 2 s ohne neues Bild-Ereignis (Chip, Zahl, Kamera, Licht, Welt-Bewegung, Szenenwechsel; Sticker zählen nicht, sie sind verboten) |
| 6 | Erste Wendung zwischen 18 und 25 s, danach alle 8–10 s eine neue Wendung bzw. ein Führungswechsel |
| 7 | ~~Folgen-Aufruf bei ca. 20 s, max. 2 s lang, vor einer Wendung~~ **seit 07.11. keine Pflicht** (nur in Testvideos) |
| 8 | Ergebnis mit exakter Zahl **bei ca. 80 % der Länge** (seit 07.11.; davor Kipp-Moment bei ca. 45 s), danach „Warum?“ mit max. 2 Faktoren |
| 9 | Zweite Überraschung bzw. Pointe |
| 10 | ~~Merksatz und genau der Schluss „Was sollen wir als Nächstes zeigen? …“~~ **seit 07.11.: Schlusskarte mit Fazit oder Pointe** (Pflicht), kein fester Schlusssatz, keine Frage am Ende |
| 11 | ~~Letztes Bild = erstes Bild (Schleife)~~ **seit 07.11. freiwillig** |
| 12 | Sätze meist unter 10 Wörtern (seit 07.11. meist 3–5); **150–190 Wörter, Tempo 2,2–2,5 W/s (seit 07.11.: 2,3–2,7), neutrale Erzählhaltung (Du höchstens im Hook), hörbare Satzpausen 0,35–0,6 s (Richtwert), 65–80 s**, flüssig und natürlich ohne künstliches Beschleunigen (Entscheidung 02.11. abends; ersetzt „ca. 0,25 s, 2,5–2,9 W/s, 170–220 Wörter“ und die Ben-Zahl 130–170) |
| 13 | Klangteppich zum Thema (8–13 dB unter der Stimme), Effekt bei jedem Bild-Ereignis, Akzent auf der Pointe |
| 14 | ~~Untertitel **Wort für Wort** (aktuelles Wort gelb)~~ **seit 07.11.: Untertitel in Blöcken von 1–4 Wörtern** mit schwarzer Kontur, Schlüsselwort in der Teamfarbe seiner Seite ([[REA Simulierbar Regelwerk]]) |
| 15 | Kein Kanalname, kein Logo, keine Rubrik im Video |
| 16 | Teamfarben überall gleich (Figuren, Tafel, Chips, Untertitel) |
| 17 | **Keine 1:1-Kopie** eines fremden Videos (Skript, Sätze, Bild- und Szenenideen eigen; „Unoriginal“). Die frühere Sperrliste ist seit 02.11. abends veraltet, der Konkurrenz-Check ist keine Pflichtsperre mehr |
| 18 | **Keine** großen Sticker bzw. Stempel (Inhaber 02.11., bestätigt 02.11. abends; vorher max. 5); Inhalte mittig (Achse x = 540) |
| 19 | Kein „Los geht's“, ruhiger Erzählton ohne aufgeregte Audio-Tags (Inhaber 02.11.; die Vorbilder sprechen „ruhig, sachlich, freundlich“) |
| 20 | Skript-Bild-Abgleich: jedes gesprochene Detail ist im selben Moment zu sehen; Duell nur zwischen echten Alternativen derselben Entscheidung (Inhaber 02.11.) |
| 21 | **Spannungskurve und Variation** ([[Videoaufbau Simulierbar]] Abschnitt 6): Spannung steigt von Sekunde 0 bis zum Kipp-Moment (ca. 45 s, optischer Höhepunkt, seit 07.11.) und hält bis zum Endstand; in jedem 5-s-Fenster ein andersartiger Effekt oder Bildtyp; kein Leerlauf; nichts Übertriebenes (höchstens ein dominanter Effekt zugleich, Zoom nicht dauerhaft, kein Flackern, Text immer lesbar) |
| 22 | **Qualitätslatte** ([[Stile 17 bis 21]]): Licht und Materialien sauber, Tiefe, lesbare Typografie, konsistente Farben, keine Artefakte, nie ein Standbild über 2 s. „Würde ein Zuschauer denken, das sieht billig aus?“ Bei „ja“ wird die Abnahme verweigert |
| 23 | **Skript-Qualität** ([[Videoaufbau Simulierbar]] Abschnitt 5): inhaltlich 1:1 aus dem Skript des Ideen-Studios, Abweichungen gemeldet; Aussagen belegbar bzw. als Modellannahme markiert; kein Clickbait, keine Aufforderung zum Streiten, keine künstlichen Cliffhanger; Regie-Text sauber (eine Zeile pro Satz, ruhige Tags, keine `<break>`) |

**Tempo-Profil für Ben (Punkt 12), seit 02.11.2026 abends:** 150–190 Wörter, 2,2–2,5 W/s (Ziel ca. 2,3), hörbare Satzpausen Median 0,35–0,6 s als Richtwert, 65–80 s (Profil `ben` in `qc/massstab.py`). Das frühere Ben-Profil (130–170 Wörter, 1,9–2,4 W/s) gibt es nur noch als `ben_alt` zum Nachmessen älterer Videos; die Spalten 170–220 Wörter, 2,5–2,9 W/s, 0,25 s stehen als Maßstab der Vorbilder daneben. Wie jeder Punkt geprüft wird, welche Code-Punkte Pflicht oder Hinweis sind und was von Hand zu prüfen ist: [[Prüfung und Abnahme Simulierbar]].

## 12. Weitere Referenzvideos (Entscheidung des Inhabers 02.11.2026 abends)
Der Inhaber kann weitere Vorbilder schicken (Upload, wie bei den 4 ersten). Auswertung wie beim Maßstab: jede Sekunde ansehen (die ersten 3 s mit 6 Bildern pro Sekunde), Schnitte und Bewegung messen, Ton (Lautheit, Pausen, Klangteppich, Effekte), Transkript mit Wortzeiten über Speech-to-Text. **Im Repo landen nur abstrahierte Muster** (Aufbau, Zeitachse, Mittel, Messwerte, eigene Deutung mit F/A-Kennung): keine Originale, keine Transkripte, keine Standbilder, keine wörtlichen Auszüge. (Die wörtlichen Auszüge der 4 ersten Vorbilder bleiben, siehe Hinweis oben.) Ergebnisse werden als neuer Abschnitt hier ergänzt; Punkte, die den Maßstab ändern, trägt Claude erst nach Freigabe des Inhabers in die Prüfliste ein. Eigene Videos orientieren sich an den Mustern, kopieren aber nie Skript, Sätze, Bild- oder Szenenideen (Prüfpunkt 17).

## Siehe auch
- [[Account Simulierbar Überblick]] · [[Videoaufbau Simulierbar]] · [[Design und Layout Simulierbar]] · [[Stimme ElevenLabs Simulierbar]] · [[Klangteppich und Ton Simulierbar]] · [[Prüfung und Abnahme Simulierbar]]
- [[Konkurrenz und Themen Simulierbar]] · [[Finanzregeln Simulierbar]] · [[Sperrliste und Auswahlregeln Simulierbar]] (Archiv) · [[Entscheidungen Log]] · [[Recherche-Methode und Grenzen]] · [[Lernschleife und Insights]]
