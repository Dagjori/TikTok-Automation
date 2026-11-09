---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-09
quelle: .claude/skills/themen-skript/simulierbar.md (Teil B), .claude/skills/stimme-elevenlabs/SKILL.md §3, Entscheidung des Inhabers 09.11.2026
tags: [konto/simulierbar, skript, skriptaufbau, phasen, sprache, selbstpruefung]
cssclasses: [konto-simulierbar, typ-regel]
---

# Skriptaufbau Simulierbar

Aufbau, Sprache und Selbstprüfung jedes Skripts für `@simulierbar`. **Standard seit 09.11.2026** ([[Entscheidungen Log]]). Den Ablauf und das Ausgabeformat (JSON-Felder) führt der Skill `themen-skript` (`.claude/skills/themen-skript/simulierbar.md`, Teil B). Wie das Skript im Bild umgesetzt wird, steht in [[Videoaufbau Simulierbar]]. Gilt nicht für Account 2 ([[Trennung der Accounts]]).

## 1. Bevor ein Satz geschrieben wird
1. **Recherche vertiefen:** jede Zahl an der Primärquelle prüfen, Rechenweg aufstellen und nachrechnen (`rechenweg`, `zahlen`, `quellen`, `annahmen`).
2. **Frage und Auflösung festlegen:** Was tippt der Zuschauer (`offene_frage`)? Was ist die Auflösung (`aufloesung`)? Was ist die zweite Überraschung danach (`zweite_frage`)?
3. Kippt bei der Recherche das Ergebnis: nicht schönrechnen, sondern dem Inhaber melden und die Idee neu fassen oder verwerfen.

## 2. Aufbau (Zeiten für ca. 70 s)
Die Zeiten verschieben sich mit der Länge der Stimme. Das Video folgt der fertigen Stimme (`audio/timing.json`), nie umgekehrt. Die Phasen-IDs bleiben fest, damit Prüfung und Szene sie finden.

| Phase (ID) | Zeit | Was passiert | Warum |
|---|---|---|---|
| `hook` | 0–3 s | Die Frage mit beiden Seiten bzw. Start- und Zielwert, höchstens 2 Sätze. Titelfrage und alle Startwerte stehen ab dem ersten Bild. Der Zuschauer kann tippen. | Wer tippt, bleibt. |
| `regeln` | 3–8 s | **Die Zähler laufen schon.** Die Annahmen erscheinen als Chips im Bild; gesprochen werden höchstens 2 kurze Sätze. Kein Erklärblock. | Die frühere Erklärphase bis 16 s lag vor der mittleren Sehdauer. |
| `falle` | 8–11 s | Die naheliegende Antwort wird ausgesprochen („Klar, … Oder?“). | bestätigt den Tipp, bevor er wackelt |
| `wendung1` | 12–15 s | Der erste Befund, der dem Tipp widerspricht. | erster Grund, weiterzuschauen |
| `rennen` und `wendung2 …` | bis ca. 45 s | Alle 8 bis 10 s ein neuer Befund oder Führungswechsel, mindestens eine Zahl je 10 s. In einer dieser Wendungen wird die **zweite Frage** gesetzt: ein Satz, der eine neue Unbekannte ankündigt, ohne sie aufzulösen. | Zwei offene Fragen tragen weiter als eine. |
| `kipp` | ca. 60–65 % | Der Moment, in dem es kippt. Die Spannung ist am höchsten, das Ergebnis noch offen. | Höhepunkt |
| `ergebnis` | ca. 75–80 % | Die exakte Euro-Zahl. | Auflösung der ersten Frage |
| `warum` | höchstens 6 s | Höchstens zwei Faktoren, kurz. | – |
| `pointe` | die letzten 6 s | **Löst die zweite Frage auf** (zweite Zahl oder überraschende Einordnung). | Nach dem Ergebnis gibt es weiter einen Grund zu bleiben. |
| `schlusskarte` | die letzten 2 s | Ein Fazit-Satz, der zugleich als Karte im Bild steht. Keine Frage, kein Aufruf. | – |

Zwischen `ergebnis` und Videoende liegen höchstens 12 s, und jede davon gehört zu `warum` oder `pointe`.

**Je Format:** Beim *Zeitverlauf* ist das „Rennen“ die laufende Jahreszahl, die Wendungen sind Knicke der Kurve. Bei *Was bleibt* ist es die Treppe der Abzüge, die Wendungen sind die Posten, mit denen niemand rechnet. Beim *Lernvideo* läuft die Modellperson Schritt für Schritt durch die Regel. Formate: [[Themenfindung Simulierbar]] §5.

**Ersetzt** (Stand bis 08.11.): Regeln und Denkfalle bis 16 s, erste Wendung bei 18–25 s, Kipp-Moment fest bei ca. 45 s, fester Schlusssatz, Folgen-Aufruf bei ca. 20 s, Wörter-Budget je Phase.

## 3. Sprache
- **Wortzahl:** etwa 150 bis 190 gesprochene Wörter. Das ist ein grober Richtwert für die Länge, keine Sperre. Es gibt **keine Vorgaben für Sprechtempo, Silben oder Pausen** (Entscheidung des Inhabers 09.11.2026). Die Stimme bestimmt die Videolänge; das Video muss mindestens 61 s lang sein ([[CRP Creator Rewards Program]]).
- **Sätze:** kurz und vollständig, meist 4 bis 10 Wörter (Hinweis, keine Sperre). Höchstens 2 Sätze mit nur ein oder zwei Wörtern im ganzen Skript.
- **Haltung:** neutral erzählt, Du höchstens im Hook. Ruhig und sachlich, kein Sportreporter, kein „Los geht’s“.
- **Zahlen:** im Sprechtext gerundet und ausgeschrieben, im Bild exakt.
- **Ende:** kein Schlusssatz mit Aufforderung, kein gesprochener Folgen-Aufruf. Die Kommentarfrage steht nur in der Caption.
- **Suchbegriff:** fällt wörtlich im ersten gesprochenen Satz, steht in der Titelfrage und vorn in der Caption.
- **Inhalt:** jede Aussage belegt oder als Modellannahme gekennzeichnet, nichts erfunden. Quellen stehen nur intern (`quellen`, `annahmen`), nie im Video. Raum für Widerspruch ist erwünscht (sichtbare Annahme, Ergebnis mit Bedingung), aber keine Aufforderung zum Streiten, kein Clickbait, keine künstlichen Cliffhanger. Echte Folgeteile eines Treffers sind erlaubt ([[Serien und Treffer-Folgen]]).
- **Geld-Sprache:** Modell statt Versprechen, Annahmen sichtbar ([[Finanz-Formulierungen Simulierbar]], [[Finanzregeln Simulierbar]]).

## 4. Sprechtext
Je Segment gibt es zwei Fassungen: `text` (Untertitel, Ziffern erlaubt) und `sprechtext` (für die Stimme). Der Sprechtext folgt ausnahmslos dem Textformat in [[Stimme ElevenLabs Simulierbar]]: eine Zeile pro Satz, nur Punkt, Komma, Fragezeichen; keine Ziffern, Zeichen oder Abkürzungen; keine Auslassungspunkte, keine Gedankenstriche als Pause, keine GROSS geschriebenen Wörter, keine Gefühls-Tags.

## 5. Selbstprüfung (jede Zeile mit „ja“ oder dem behobenen Fehler)
1. Frage im ersten Satz, Tipp möglich, Suchbegriff wörtlich enthalten.
2. Zähler laufen spätestens ab 3 s; kein Erklärblock vor der ersten Wendung.
3. Erste Wendung bis 15 s; danach alle 8 bis 10 s ein neuer Befund.
4. Zweite Frage gesetzt (Segment nennen) und erst in der Pointe aufgelöst.
5. Ergebnis nicht vor ca. 75 % der Wörter; danach höchstens `warum`, `pointe`, `schlusskarte`.
6. Jede Zahl mit Quelle und Jahr; Rechenweg nachgerechnet; Annahmen genannt; „geplant“ gekennzeichnet.
7. Finanzregeln eingehalten (Modell, keine Empfehlung, keine Ausschlussthemen).
8. Sprechtext im Textformat des Stimm-Skills.
9. Du nur im Hook; kein Aufruf; letzte Zeile ist ein Fazit.
10. Wortzahl genannt (Richtwert 150 bis 190).

## 6. Beispiel-Gerüst (Format „Was bleibt“)
**Nur ein Gerüst für Phasen und Satzbau, kein sendefertiges Skript.** Thema, Person und Posten sind Platzhalter. Keine Zahl ist belegt; jede Stelle in runden Klammern wird durch den Wert aus Rechnung bzw. Recherche ersetzt. Im echten Sprechtext stehen dort ausgeschriebene Zahlen.

| ID | Untertitel (`text`) | Sprechtext (`sprechtext`, eine Zeile pro Satz) |
|---|---|---|
| `hook` | (Betrag) € mehr Gehalt. Was bleibt davon? | `(Betrag aus Annahme) Euro mehr Gehalt.` / `Wie viel davon kommt wirklich an?` |
| `regeln` | Lena, (Brutto) € brutto, Steuerklasse 1. | `Lena verdient (Brutto aus Annahme) Euro brutto.` / `Steuerklasse eins, keine Kinder.` |
| `falle` | Klar, das meiste bleibt ihr. Oder? | `Klar, das meiste bleibt ihr.` / `Oder doch nicht?` |
| `wendung1` | Allein die Lohnsteuer: (Zahl) €. | `Schon die Lohnsteuer nimmt (Zahl aus Rechnung) Euro.` |
| `rennen` | Dann die Sozialabgaben. | `Dann kommen die Sozialabgaben.` / `Jeder Posten nimmt sich seinen Teil.` |
| `wendung2` | Noch (Zahl) €. Und ein Posten fehlt. | `Jetzt sind es noch (Zahl aus Rechnung) Euro.` / `Und ein Posten fehlt noch.` (hier wird die zweite Frage gesetzt) |
| `wendung3` | (Posten aus Rechnung): minus (Zahl) €. | `(Posten aus Rechnung) kostet weitere (Zahl aus Rechnung) Euro.` |
| `kipp` | Unter der Hälfte? | `Jetzt wird es knapp.` / `Bleibt überhaupt noch die Hälfte?` |
| `ergebnis` | Es bleiben (Zahl) €. | `Am Ende bleiben (Zahl aus Rechnung) Euro.` |
| `warum` | Zwei Gründe. | `Der Grund sind zwei Dinge.` / `(Faktor eins aus Rechnung) und (Faktor zwei aus Rechnung).` |
| `pointe` | Der fehlende Posten: (Zahl) €. | `Und der fehlende Posten?` / `(Auflösung der zweiten Frage aus Recherche).` |
| `schlusskarte` | (Fazit-Satz) | `(Fazit-Satz aus dem Ergebnis, keine Frage, kein Aufruf).` |

Das frühere Beispiel „Spurwechsel im Stau“ (Aufbau bis 07.11., mit Auslassungspunkten, GROSS-Wörtern, Folgen-Aufruf und festem Schlusssatz) ist damit ersetzt.

## 7. Übergabe
Freigegebenes Skript → `pipeline/projekte/<name>/skript.json` → Skill `stimme-elevenlabs` (Textprüfung, genau eine Aufnahme) → Skill `video-produktion`. Die Produktion übernimmt das Skript inhaltlich 1:1. Faktenfehler werden mit Quelle korrigiert und unter `korrekturen` vermerkt; kippt das Ergebnis, hält der Slot mit Status `rueckfrage` an. Kette im Überblick: [[Pipeline und Skills]].

## Siehe auch
[[Themenfindung Simulierbar]] · [[Stimme ElevenLabs Simulierbar]] · [[Videoaufbau Simulierbar]] · [[Finanzregeln Simulierbar]] · [[Finanz-Formulierungen Simulierbar]] · [[Befehl Ideen und Skripte Simulierbar]] · [[REA Simulierbar Regelwerk]] · [[Regelwerk Simulierbar]]
