# Startnische: „Der Testlauf“ – Alltag simuliert

**Stand:** 30.10.2026 · **Status:** Empfehlung, Bestätigung durch den Inhaber offen

Legende: **F** = belegter Fakt (mit Quelle), **S** = Schätzung, **A** = Annahme.

> **Verworfen am 30.10.2026 (Entscheidung Inhaber):** „Geld-Duell“. Das wäre praktisch dasselbe wie @kontostand.vs und @wissentogo_de. Ziel ist eine Nische, die nach demselben Prinzip funktioniert, aber ein eigenes Thema hat.

## Kurzfazit
- Der 3k-Account wird zu **„Der Testlauf“**.
- In jedem Video simulieren wir eine Alltagsfrage, über die jeder streitet, mit Hunderten virtuellen Autos bzw. Menschen und zeigen, welche Strategie wirklich gewinnt. Themen: Verkehr, Warteschlangen, Zuhause im Winter, Spiele und Zufall.
- Beispiel: „Reißverschlussverfahren: früh einordnen oder bis zum Ende fahren? 1.000 Autos simuliert.“

## Gleiches Prinzip, eigenes Thema

| Erfolgsprinzip der Vorbild-Videos (F, siehe 01-marktanalyse) | Bei „Der Testlauf“ |
|---|---|
| Alltagsfrage, über die jeder eine Meinung hat | Drängler oder Früh-Einordner? Eine Schlange oder viele? |
| Rechnung bzw. Simulation statt Meinung | Agenten-Simulation nach veröffentlichten Modellen, 1.000 Durchläufe |
| Spannung über Runden bzw. Duell | Team A gegen Team B, Zähler laufen live mit |
| Überraschendes Ergebnis, das geteilt wird | Viele Antworten sind kontraintuitiv, z. B. Rolltreppe: beide Seiten stehen ist schneller |
| Suchwert | „reißverschlussverfahren“, „rettungsgasse“, „stoßlüften“, „boarding flugzeug“ |

## Belege für Nachfrage (F)
- **Reißverschlussverfahren** (englisch „zipper merge“):
  - [@itsthatcrazydoglady](https://www.tiktok.com/@itsthatcrazydoglady/video/6879056406927002881): **3,4 Mio. Views**, 759.900 Likes, 9.135 Kommentare
  - [@carsandkeys](https://www.tiktok.com/@carsandkeys/video/7413804081640115486): **3,2 Mio. Views**, 4.937 Kommentare
  - Gegenbeispiel: eine reine Erklär-Animation ohne Spannung ([@i5.commuters](https://www.tiktok.com/@i5.commuters/video/7509717598016228639)) kam auf **33.200 Views**. → Die Umsetzung entscheidet, also brauchen wir Drama und Duell, nicht nur eine Animation.
- **Boarding-Methoden:** Die Steffen-Methode ist laut Studie doppelt so schnell wie „hinten nach vorne“. Eine Simulation dazu verbreitete sich viral über LinkedIn und Instagram (Drittquelle: [PopSci](https://www.popsci.com/technology/best-way-to-board-an-airplane-according-to-science/)).
- **Lüften:** Ein Video von [@quarks](https://www.tiktok.com/@quarks/video/7458229273610997025) (WDR) hat 133.200 Views bei 42 s Länge. Dazu kommen die Tags #stoßlüften und „German Lüften“ als Meme.
- **Simulation als Genre:** @simplysimulated (EN) hat 4,2 Mio. Likes mit 34 Videos, @kurzsimuliert 2,1 Mio. Views mit einem einzigen Video (siehe 01-marktanalyse).

## Wettbewerb (F: Websuche und Profilprüfung am 30.10.2026)
- **Keinen deutschen Account gefunden**, der Verkehr, Warteschlangen oder andere Alltagssysteme simuliert. Die Suche nach Reißverschluss-, Boarding-, Kassenschlangen-, Phantomstau- und Elfmeter-Simulationen auf Deutsch ergab nur Fahrschul-Clips, Spiele und Memes.
- **Abgrenzung zu den Vorbildern:**

| Account | Thema | Unterschied zu uns |
|---|---|---|
| @kontostand.vs, @wissentogo_de | Geld | Wir rechnen keine Finanzen. |
| @kurzsimuliert, @unnoetig_tiefgruendig | Physik einer Person bzw. Sache | Wir simulieren **Systeme mit vielen Akteuren** und **Strategien**. |
| @mal.angenommen | Geld-Gedankenexperimente | – |
| @retrodreamspace | Gesundheits-Duelle | – |

- **Namen:** @alltagslabor ist vergeben (326 Follower, anderes Format). Bei @dertestlauf, @der.testlauf und @nachsimuliert zeigt die öffentliche Seite keinen Account. Ob sie wirklich frei sind, zeigt erst die App.

## Warum das genauso gut funktionieren kann (A/S)
- Jeder steht täglich im Stau oder in einer Schlange. Das Thema ist für jeden nachvollziehbar, auch für die bestehenden Follower.
- Eingebaute Streitfrage („Drängler!“) → Kommentare.
- Überraschende Ergebnisse → Shares (Shares waren der stärkste Treiber im besten Vorbild-Video, 2,0 % Share-Rate).
- Schwärme aus kleinen 3D-Autos bzw. Menschen sind „satisfying“ → hohe Watch Time.
- Läuft das ganze Jahr, mit saisonalen Spitzen: Winter (Lüften, Glatteis), Dezember (Weihnachtsmarkt, Wichteln), Sommer (Urlaubsstau, Boarding).
- **Kaum sprachabhängig:** Das Bild trägt die Aussage. Eine englische Version wird später billig, und die USA bzw. UK sind CRP-Länder.

## Umsetzung (Technik)
- **Agenten-Simulation:** Jedes Auto bzw. jeder Mensch ist ein Agent mit einfachen Regeln. Modelle mit Quelle:
  - Verkehr: Nagel-Schreckenberg-Modell
  - Phantomstau: Ring-Experiment von Sugiyama et al. 2008
  - Boarding: Steffen 2008
  - Warteschlangen: Warteschlangentheorie
  - Menschenmengen: Helbing et al. 2000 („faster-is-slower“)
- **Ablauf:** Claude schreibt Modell und Tests. Die Simulation läuft 1.000-mal, das Video zeigt einen typischen Durchlauf plus das Gesamtergebnis.
- **Darstellung:** Three.js mit vielen gleichen Low-Poly-Objekten (Instancing), Zähler, Team-Farben.
- **Offenlegung in jeder Beschreibung:** „Vereinfachtes Modell, Quelle: …“.

## Marke und Profil
- **Name:** Der Testlauf
- **Benutzername:** Wunsch `@dertestlauf`, Alternativen `@der.testlauf`, Plan B „Nachsimuliert“ (`@nachsimuliert`)
- **Bio (maximal 80 Zeichen):**

```
Ich simuliere deinen Alltag ⏱️ Was ist wirklich schneller? Deine Frage 👇
```

- **Link:** nur Impressum (§ 5 DDG). Keine E-Mail und keine Telefonnummer in der Bio.
- **Farben:** Team A Blau, Team B Orange, Sieger Grün, heller Hintergrund (Alltagsgefühl, hebt sich von den dunklen Vorbildern ab).
- **Cover:** „TESTLAUF #n“ plus die Frage plus „1.000 Autos simuliert“.
- **Umbenennen erst am Tag des ersten Videos.**

## Video-Bauplan (Hook – Hold – Act, 70–90 s)

| Zeit | Teil | Inhalt |
|---|---|---|
| 0–3 s | **Hook** | „1.000 Autos. Zwei Strategien. Eine ist 40 % schneller.“ (Zahl aus der echten Simulation) |
| 3–10 s | Setup | Team Früh-Einordner gegen Team Reißverschluss, Regeln kurz zeigen |
| 10–60 s | **Hold**: 3 Durchläufe | Zähler (Durchsatz, Wartezeit) laufen live; ein Störfaktor pro Runde (Drängler, Bremser, Lkw); alle 2–4 s ändert sich etwas im Bild |
| 60–75 s | Ergebnis | Sieger, Unterschied in Minuten bzw. %, **Regel für den Alltag** (z. B. „Bis zum Ende fahren und abwechselnd einfädeln. Steht so in § 7 Abs. 4 StVO.“) |
| 75–85 s | **Act** | Eine konkrete Frage („Bist du Team früh oder Team spät?“) plus „Morgen: …“ |

**Regeln**
- Jedes Video ist in sich abgeschlossen, keine Teil-1/Teil-2-Cliffhanger.
- Mindestens 61 s, 1080×1920.
- Nie Fahren mit dem Handy oder riskante Manöver als Tipp darstellen (TikTok: „dangerous activity“).

## Die ersten 30 Testläufe

**Startreihenfolge:** #1, #9, #17, #11, #2, #13. Das sind die stärksten Streitfragen plus der passende Winterzeitpunkt.

| # | Testlauf | Suchbegriff | Modell bzw. Quelle (vor Produktion prüfen) |
|---|---|---|---|
| | **Verkehr** | | |
| 1 | Reißverschluss: früh einordnen oder bis zum Ende fahren? | reißverschlussverfahren | Nagel-Schreckenberg; § 7 Abs. 4 StVO |
| 2 | Phantomstau: wie ein einziger Bremser 5 km Stau macht | stau aus dem nichts | Sugiyama et al. 2008 |
| 3 | Spurwechsel im Stau: Bist du wirklich schneller? | spurwechsel stau | Nagel-Schreckenberg |
| 4 | 130 oder 160 km/h auf 300 km mit Verkehr: Wie viel Zeit sparst du wirklich? | schneller fahren zeit sparen | eigene Rechnung, BASt-Daten |
| 5 | Rettungsgasse: Wie viele Minuten verliert der Rettungswagen? | rettungsgasse | StVO, Feuerwehr-Angaben |
| 6 | Grüne Welle: Warum du immer bei Rot stehst | grüne welle | Ampel-Taktmodell |
| 7 | Kreisverkehr oder Ampelkreuzung: Wer schafft mehr Autos? | kreisverkehr vorteile | Leistungsfähigkeitsmodelle |
| 8 | Parkplatz: den ersten freien nehmen oder nah am Eingang suchen? | parkplatz suchen | eigenes Agentenmodell |
| | **Warteschlangen & Menschenmengen** | | |
| 9 | Supermarkt: eine Schlange für alle Kassen oder eine pro Kasse? | schlange supermarkt | Warteschlangentheorie |
| 10 | Self-Checkout oder Kasse: Was ist wirklich schneller? | self checkout | Warteschlangentheorie, eigene Annahmen |
| 11 | Boarding: hinten nach vorne, zufällig oder Steffen-Methode? | boarding flugzeug | Steffen 2008 |
| 12 | Aussteigen: Bringt es was, sofort aufzustehen? | flugzeug aussteigen | eigenes Agentenmodell |
| 13 | Rolltreppe: links gehen, rechts stehen, oder beide Seiten stehen? | rolltreppe | London-Underground-Test Holborn 2015/16 |
| 14 | Aufzug: Warum er immer in die falsche Richtung fährt | aufzug | Aufzug-Steuerlogik |
| 15 | Glühweinstand: wie die Schlange plötzlich explodiert (Dezember) | weihnachtsmarkt | Warteschlangentheorie |
| 16 | Stadion verlassen: Warum Drängeln alle langsamer macht | stadion ausgang | Helbing et al. 2000 |
| | **Zuhause im Winter** | | |
| 17 | Stoßlüften oder Kippfenster: Wärmeverlust und CO₂ simuliert | stoßlüften | UBA, Verbraucherzentrale |
| 18 | Heizung nachts aus oder runterdrehen? | heizung nachts aus | Wärmebilanz, Verbraucherzentrale |
| 19 | Wäsche drinnen trocknen: Wie viel Wasser landet in der Luft? | wäsche trocknen winter | Bauphysik, Verbraucherzentrale |
| 20 | Kühlschranktür offen: Wie schnell ist die Kälte weg? | kühlschrank tür offen | Wärmebilanz |
| 21 | Auto warmlaufen lassen: verboten und sinnlos? | auto warmlaufen lassen | § 30 StVO, ADAC |
| 22 | Glatteis: Bremsweg mit Sommer- und Winterreifen | winterreifen bremsweg | ADAC-Tests |
| | **Spiele & Zufall** | | |
| 23 | Mensch ärgere dich nicht: rausschmeißen oder schnell laufen? 100.000 Partien | mensch ärgere dich nicht | eigene Simulation |
| 24 | Schere, Stein, Papier: Gibt es eine Gewinnstrategie? | schere stein papier | Studie Zhejiang-Universität 2014 |
| 25 | Wichteln: Wie wahrscheinlich ziehst du dich selbst? (Dezember) | wichteln | Kombinatorik |
| 26 | Geburtstagsparadoxon: zwei mit gleichem Geburtstag in der Klasse? | geburtstagsparadoxon | Wahrscheinlichkeitsrechnung |
| 27 | Monopoly: Welche Straßen gewinnen wirklich? 1 Mio. Partien | monopoly strategie | eigene Simulation |
| | **Sport** | | |
| 28 | Elfmeter: Ecke, Mitte oder hoch? | elfmeter | Bar-Eli et al. 2007 (Torwartverhalten) |
| 29 | Wie viel Zufall steckt in der Bundesliga-Tabelle? | bundesliga | eigene Simulation mit Saisondaten |
| 30 | Testlauf auf Zuschauerfrage (Antwort auf Kommentar) | – | – |

**Bewusst ausgelassen:**
- **Lotto und Casino:** Glücksspiel ist bei TikTok reguliert.
- **Echte Unglücke und Massenpaniken:** pietätlos, „disturbing“.
- **Gesundheitsthemen:** Fehlinfo-Risiko.
- **Vereinslogos und Spielerbilder:** Marken- bzw. Persönlichkeitsrechte.

## Rhythmus und Auswertung
- **Rhythmus:** 2 Videos pro Tag, Start 12:30 und 19:00 Uhr (A). Nach 7 Tagen anhand der Follower-Aktivität anpassen. Einmal pro Woche als Stapel in TikTok Studio und YouTube Studio einplanen.
- **Ziele nach 14 Tagen bzw. 28 Videos (S):**
  - mindestens 1 Video über 50k Views
  - Median über 5k Views
  - mindestens 1 Follower pro 1.000 Views
  - mindestens +1.000 Follower
- **Wird das verfehlt:** Hooks und Themen umbauen. Nach weiteren 28 Videos ohne Treffer die Nische wechseln.

## Zweiter Account: Empfehlung (unverändert)
**Jetzt nicht, frühestens ab Woche 4.** Ab Tag 1 kommt stattdessen ein YouTube-Kanal „Der Testlauf“ mit denselben Videos dazu.

**Gründe**
1. **Engpass ist die Pipeline**, nicht die Zahl der Accounts. Ein zweiter Account verdoppelt Kontrolle, Planung und Kommentarpflege.
2. **Er hilft Account 1 nicht.** Followerzahl ist kein Ranking-Faktor (F: [TikTok Newsroom](https://newsroom.tiktok.com/how-tiktok-recommends-videos-for-you?lang=en)), Follower lassen sich nicht übertragen.
3. **Regeln:** Mehrere Accounts sind erlaubt, „but not to deceive others“. „Using automation to run many accounts“ gilt als Spam (F: [CG Integrity](https://www.tiktok.com/community-guidelines/en/integrity-authenticity)). Ob mehrere CRP-Accounts pro Person erlaubt sind, ist **von TikTok nicht dokumentiert**.

**Bester Kandidat für Account 2:** „Der Testlauf“ auf **Englisch**. Die Simulationen sind kaum sprachabhängig, die Nachfrage in den USA ist belegt (Reißverschluss-Videos mit 3,2–3,4 Mio. Views), und die USA bzw. UK sind CRP-Länder.

**Startbedingungen:**
- Die Pipeline liefert 2 Videos pro Tag mit höchstens 30 Minuten Aufwand pro Tag.
- Account 1 hat mindestens 20 Videos.
- Nie dasselbe Video auf zwei TikTok-Accounts. Eine übersetzte Version mit eigener Stimme ist ein eigenes Video, die Regel klären wir vor dem Start nochmal.
