# Synthese: vom Einzelvideo zum Regelwerk

## 1. Aufruf
```
python .claude/skills/rea-video/scripts/synthese.py C:\tiktok\rea-video\<korpus>
```
Schreibt nach `synthese/`: `matrix.md` (alles auf einen Blick), `regelkandidaten.md` (vorbefüllte Regelkarten), `kennzahlen.json` (für spätere Vergleiche). Jederzeit wiederholbar; nach jedem neuen Video neu laufen lassen. Sind seit dem letzten Lauf neue Videos analysiert, sichert es den alten Stand als `kennzahlen.vorher.json` und schreibt `aenderungen.md` (Merkmale, deren Stärke, Unterscheider-Urteil oder Belastbarkeit sich geändert hat): Grundlage für den Kurzbericht an den Inhaber.

## 2. Matrix lesen
| Teil | Bedeutung |
|---|---|
| Korpus | analysierte Videos je Gruppe, Creator, größter Creator-Anteil; **Minimum, Ziel, Sättigung** ja/nein mit Grund |
| Erfolg | Median der Aufrufe und Raten je 100 Aufrufe (Likes, Kommentare, Shares, Saves), Aufrufe je Follower; viral gegen Vergleich |
| Merkmale | je Merkmal: Anteil in viral, untere 95-%-Grenze, Anteil im Vergleich, Abstand in Prozentpunkten, Stärke, Unterscheider, Belege, Gegenbeispiele |
| Zahlen | Median, Korridor (25.–75. Perzentil) und Spanne der viralen Videos, Median des Vergleichs; Quelle Messung (F) oder kodiert |
| Sättigung | welche Merkmale (Endanteil ≥ 25 %) mit welchem Video neu dazukamen |

## 3. Stärke und Unterscheider
| Stärke | Anteil viral | Bedeutung für die Produktion |
|---|---|---|
| **Gesetz** | ≥ 80 % | Pflicht. Liegt die untere Grenze unter 50 % (kleiner Korpus), als „Gesetz (vorläufig)“ führen |
| **Muster** | 50–79 % | Standard, Abweichung nur mit Grund |
| **Variante** | 25–49 % | Spielraum: abwechseln, testen |
| **Einzelfall** | < 25 % | nicht übernehmen, höchstens als Idee notieren |

| Unterscheider | Regel | Bedeutung |
|---|---|---|
| ja (Erfolgsfaktor) | viral − Vergleich ≥ 30 Prozentpunkte | **höchste Priorität**: unterscheidet virale von schwachen Videos |
| nein (Grundformat) | Abstand ≤ 10 Pp und Vergleich ≥ 60 % | Eintrittskarte des Formats: Pflicht, aber kein Erfolgsgeheimnis |
| vermeiden | viral − Vergleich ≤ −30 Pp | typisch für schwache Videos: **Verbot** im Regelwerk |
| eher nein / unklar | dazwischen | kein Unterschied belegt; Stärke allein entscheidet |
| offen | weniger als 3 Vergleichsvideos kodiert | Vergleichsvideos nachlegen |

Zahlen: Liegt der Median des Vergleichs **außerhalb** des Korridors der viralen Videos, ist die Zahl ein Unterscheider (in der Regelkarte vermerken).

## 4. Regelkarten ausformulieren (`synthese/regelwerk-entwurf.md`)
Für jedes Gesetz, jeden Erfolgsfaktor, jedes Muster und jedes Vermeiden eine Karte:
```
### REA-<kürzel>-R07 · Zahl im ersten Satz
- Regel: Der erste gesprochene Satz enthält eine konkrete Zahl, das Ergebnis wird noch nicht verraten.
- Stärke: Gesetz · 18/20 viral (90 %, untere Grenze 70 %) · Vergleich 2/6 · Erfolgsfaktor
- Gilt für: Account 1 (gesprochen von Ben) · Account 2 übertragen: Zahl in der Titelfrage oder in der Messwert-Anzeige ab 0 s
- Korridor: erstes Wort bei 0,0–0,4 s; erster Satz 6–11 Wörter
- Warum (S): Die Zahl macht den Einsatz sofort greifbar und erzeugt eine Wissenslücke.
- Prüfbar durch: Transkript Satz 1, `hook.zahl_im_ersten_satz`
- Gegenbeispiele: V04, V15 (beide mit Spektakel-Bild statt Zahl)
```
Regeln für die Formulierung:
- **Eigene Worte, abstrakt, prüfbar:** Zahl, Zeit, Ja/Nein oder Korridor, dazu woran man es prüft. Keine Sätze, Figuren, Orte oder Szenen aus einem fremden Video.
- **Belege als Video-IDs**, nie Links oder Beschreibungen eines einzelnen fremden Videos.
- **Kombinationen** (z. B. „Duell + Zähler + Uhr“) nur, wenn sie gemeinsam in ≥ 50 % vorkommen; als S kennzeichnen.
- **Widersprüche** zwischen Regeln auflösen (z. B. Tempo-Korridor vs. Wortzahl) und die Auflösung begründen.
- **Aufbau-Schablone:** Aus den Phasenzeiten (Median je Phase in Sekunden und in % der Länge) eine Zeitachse des typischen erfolgreichen Videos bauen.
- **Was einzigartig war** (Nachrichtenereignis, Promi, Zufall) wird nicht zur Regel.
- **Kein Inhalt als Regel:** Themen, Fakten und Aussagen der Vorbilder werden nie zur Regel (Vorgabe 8 im Skill); geregelt wird nur Bauweise.
- **„Gilt für“ je Karte** (Vorgabe 9): Account 1, Account 2, beide oder keiner, mit Übersetzung in das Format des Accounts. Eine Regel aus dem Korpus des einen Accounts gilt für den anderen nur als „übertragen (S)“, bis sie dort belegt ist. Was dem Regelwerk eines Accounts widerspricht (z. B. Stimme bei Account 2), wird für diesen Account „keiner“ mit Grund.

## 4b. Kleine Korpora und übergreifende Auswertung
- **Unter dem Minimum** (z. B. 6 virale Videos) gilt die Matrix als Beobachtung. Als **vorläufige Regel** vorschlagen darf man nur, was „belastbar = ja“ ist (untere 95-%-Grenze ≥ 50 %: bei 6 Videos also 6 von 6, bei 9 Videos 8 von 9). Alles andere bleibt Muster zur Beobachtung, bis weitere Videos es bestätigen.
- **Übergreifend** (`synthese.py <korpus1> <korpus2>`): beide Accounts zusammen für **formatunabhängiges Handwerk** (Hook-Mechanik, erstes Bild, Text-Lesbarkeit, Schnitt- und Bewegungsdichte, Spannungsbogen, Bildqualität, Loop). Zusammen erreichen kleine Korpora oft das Minimum (z. B. 6 + 6 = 12 viral). Die Spalte „je Korpus“ zeigt, ob ein Muster in beiden Accounts trägt; nur dann „Gilt für: beide“.
- **Erfolgsmaß ohne Aufrufe:** Likes; Kommentare und Saves je 100 Likes zeigen Diskussion und Nutzwert.

## 5. Freigabe durch den Inhaber
1. Kurzfassung vorlegen: Gesetze und Erfolgsfaktoren (je ein Satz), Vermeiden, die 5 wichtigsten Korridore, offene Punkte, Hörprotokoll falls nötig.
2. Jede Regel anklickbar: übernehmen · ändern · verwerfen (Fragen mit Auswahl).
3. Freigegebene Regeln → Hirn ([hirn.md](hirn.md)), Status `aktuell`; nicht freigegebene bleiben im Entwurf mit Grund.

## 6. Nachlauf (Korpus wächst oder neuer Lauf)
Neue Videos messen und analysieren, Synthese neu, dann **Regel-Unterschied** vorlegen: neu · stärker · schwächer · entfallen. Nur freigegebene Änderungen ins Hirn, jede mit Zeile im [[Entscheidungen Log]].
