# Ablauf: Videoaufbau, Skript-Anforderungen, Dramaturgie und Effekte

Quelle: `CLAUDE.md` §6 und [massstab.md](massstab.md) §1, §11; Neuregeln des Inhabers 02.11.2026 abends (SKILL.md). Hier als Zeitplan für Ben im Original: **150–190 Wörter bei 65–80 s, Ziel ca. 2,3 Wörter/s (Spanne 2,2–2,5), Satzpausen als Richtwert 0,35–0,6 s hörbar** (Profil `ben` in `qc/massstab.py`). Zeiten sind Zielwerte; was `massstab.py` misst, steht in [pruefung.md](pruefung.md).

## 1. Zeitplan (65–80 s, mindestens 61 s)

| Zeit | Phase | Sprechtext (Muster) | Bild (Welt zuerst, HUD unterstützt) |
|---|---|---|---|
| 0–5 s | **Hook** | **Duell im ersten Satz (Pflicht seit 04.11.):** beide Alternativen bzw. beide Personen konkret genannt und gegeneinander gestellt, max. 2 kurze Sätze: „X oder Y? Was … wirklich …?“ bzw. „Einer verdient ab 16, der andere ab 24. Wer hat mit 40 mehr?“. Du-Szenario nur mit beiden Seiten im Hook. Keine Einzelfrage („Wie viel kostet X wirklich?“), kein vorweggenommenes Ergebnis. Stimme startet < 0,2 s. | Ganze Szene mit beiden Seiten von Bild 1 an, schon in Bewegung (Licht, Verkehr, Staub, Kamera fährt). Tafel oben ab Bild 0 (Werte 0). Optional Titel Wort für Wort. |
| 3–12 s | **Regeln** | 3–6 Mini-Fakten, 2–5 Wörter je Satz | Jede Regel erscheint genau beim Wort: als Objekt in der Welt (Preisschild, Münzstapel, Route, Gefäß) und als Chip. |
| bis 16 s | **Denkfalle** | „Klar, [naheliegende Antwort]. Oder?“ ruhig gesprochen. **Kein „Los geht's“.** | Kamera rückt die naheliegende Seite ins Licht (Schärfe, Lichtkegel). Kein Sticker. |
| ab ca. 13 s | **Rennen** | ruhiger Erzähler-Kommentar, alle 2–3 s ein Zwischenstand | Uhr bzw. Zähler laufen sichtbar (Tafel, Uhr, Füllstand, Münzstapel, Lichtspur), Kamera folgt. |
| ca. 20 s, max. 2 s | **Folgen-Aufruf** | „Folg mir, damit du nichts verpasst.“ | `M.folgen({ ein, dauer: 1.8 })`, Welt läuft weiter. Direkt vor der ersten Wendung. |
| 18–25 s | **Erste Wendung** | „Aber jetzt kommt das Merkwürdige:“ bzw. „Doch …“ | Kamera-Zoom bzw. Schärfenverlagerung auf den entscheidenden Moment, Licht wechselt (z. B. Spot auf die andere Seite). |
| danach alle 8–10 s | **Führungswechsel / weitere Wendung** | Countdown-Zahlen als Satzfetzen, „Jetzt wird's knapp.“ (ruhig) | Tafel färbt die führende Seite, Welt reagiert (Waage kippt, Gefäß überholt, Route leuchtet auf). |
| 40–54 s | **Ergebnis** | „Endstand: …“, exakte Zahl in Euro (bzw. Währung des Landes), „[Sieger] gewinnt.“ | Bilanzkarte (`M.bilanz`) baut sich zeilenweise auf; in der Welt hält das Rennen an, Licht auf den Sieger. **Höhepunkt der Spannungskurve.** |
| 50–64 s | **„Warum?“** | max. 2 Faktoren | `M.balken` mit 2 Faktoren; Blaupause (Stil 13) als Einschub erlaubt ([stile.md](stile.md)). |
| 45–66 s | **Zweite Überraschung** | „Und das Verrückte: …“, eine Variante dreht das Ergebnis | neue Runde in derselben Welt (anderer Parameter), Zähler laufen neu. |
| letzte 5–8 s | **Merksatz** | ein kurzer, zitierfähiger Satz | `M.pointe` ruhig (ohne Comic-Kontur, `design.md`) oder nur Welt + Untertitel. |
| letzte 2–3 s | **Schluss** | genau: „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ | Kamera und Werte gleiten zum Anfangsbild zurück (`M.schleife`, `regie.schleife`): **letztes Bild = erstes Bild**. |

**Dynamik:** alle 1–2 s etwas Neues im Bild (Bewegung in der Welt, Kamerafahrt, Lichtwechsel, Zähler, Chip, Szenenwechsel), nie mehr als 2 s Stillstand (`massstab.py` Punkt 5). Die Neuigkeit kommt bevorzugt aus der Welt: Objekt erscheint, Licht geht an, Flüssigkeit steigt, Auto biegt ab, Waage kippt. Szenenwechsel weich (`zoomwisch`, `blende`, `iris`), höchstens alle 5–15 s. Wie die Effekte über das Video verteilt werden (Spannung steigt, Variation, Maß): **§6**.

### Wörter-Budget (Richtwert S, Summe ca. 177 bei 2,3 W/s)
Hook ca. 12 · Regeln ca. 24 · Denkfalle ca. 6 · Rennen ca. 28 · Folgen-Aufruf 6 (fest) · erste Wendung ca. 18 · Ergebnis ca. 24 · „Warum?“ ca. 18 · zweite Überraschung ca. 18 · Merksatz ca. 12 · Schluss 11 (fest). Dazwischen darf verschoben werden, solange die Zeitpunkte der Tabelle halten (Folgen-Aufruf ca. 20 s entspricht bei 2,3 W/s etwa dem 46. Wort).

## 2. Satzmuster und Textregeln (ruhig gesprochen)
- Hook „X oder Y? Was … wirklich …?“ bzw. „A macht X, B macht Y. Wer hat am Ende mehr?“ (beide Seiten konkret im ersten Satz; Themen ohne natürliche Gegenseite als Duell rahmen, z. B. Kind: Ausgaben gegen Kindergeld schon im Hook, sonst Thema nicht nehmen; Freigabe Inhaber 04.11.2026, Messung: Duell-Hooks halten im Median 34 % der Länge, Einzelfrage/Ergebnis vorweg 19 %, n = 9) · Denkfalle „Klar, X. Oder?“ · Wendung „Aber jetzt kommt das Merkwürdige:“, „Doch …“ · Spannung als Countdown-Fetzen · Ergebnis „Endstand:“ · Erklärung „Warum?“ · Zweite Überraschung „Und das Verrückte:“ · Merksatz kurz.
- Sätze meist unter 10 Wörtern, Median 4–8. „du“-Ansprache. Zahlen im Sprechtext ausgeschrieben.
- Immer eine offene Frage im Kopf des Zuschauers: Jede Phase endet mit einer Spannung, die erst die nächste auflöst („Also ist Rennen doch schlechter? Noch nicht.“).
- Konkrete Personen bzw. Teams mit Namen oder Buchstaben (Paul gegen Anna, A gegen B). Zahlen rund und hörbar („zwanzig Sekunden“), im Bild die exakte Zahl.
- Keine Füllsätze, keine Quellen, kein „laut einer Studie“ (Quellen stehen intern in `skript.json`). Verboten: künstliche Cliffhanger („Teil 2 folgt“), Kaufaufrufe, Kanalname bzw. Rubrik.
- **Tempo (Entscheidung des Inhabers 02.11.2026 abends, Mitte aus beiden bisherigen Vorgaben):** 150–190 Wörter bei 65–80 s, Ziel ca. 2,3 W/s, Spanne 2,2–2,5 W/s. Bisher galten 130–170 Wörter (Ben im Original ca. 2,0 W/s) und in der alten Prüfliste 170–220 Wörter (Vorbilder 2,5–2,9 W/s); beides ist ersetzt. **Es muss flüssig und natürlich klingen:** kein künstliches Beschleunigen der Stimme (`tts.py` bleibt im Original), das Tempo entsteht durch Textlänge und Satzbau (mehr Information je Satz, Kommas statt Punkte bei Aufzählungen und Countdowns, keine Füllsätze). Satzpausen so, dass Ben nicht gehetzt klingt (hörbarer Richtwert 0,35–0,6 s). **Qualität vor Tempo: klingt eine Stelle gehetzt, kürzen statt beschleunigen.** Messwert (F, 02.11.): Ben im Original lag bei den letzten Videos bei 2,15–2,38 W/s (Wortzeiten) mit hörbaren Satzpausen um 0,35 s.

## 3. Themen-Logik (Pflicht beim Eingang des Skripts)
- Beide Seiten sind **echte Alternativen derselben Entscheidung** (schließen sich aus bzw. werden gegeneinander abgewogen). Gegenbeispiel: „Steuererklärung oder Überstunden“ (keine gemeinsame Entscheidung).
- **Nur Thema GELD (seit 02.11. abends, 100 %):** Ergebnis endet in Euro (bei anderen Ländern in der passenden Währung mit sauberer Quelle, Modellrechnung). Die Rubrik ALLTAG entfällt; Alltagsfragen nur, wenn sie ein Geld-Ergebnis haben.
- **Länder frei:** Deutschland, weltweit oder andere Länder; die Sprache bleibt Deutsch.
- **Keine Sperrliste mehr** ([themen.md](themen.md), Archiv). **Bleibt:** keine 1:1-Kopie von Skript, Sätzen, Bild- oder Szenenideen eines fremden Videos („Unoriginal“, CRP-Ausschluss); gleiches Thema nur mit eigenem Skript und anderem Design.
- Finanzthemen nur als Modellrechnung, keine Produkt- oder Anlageempfehlung, kein Kaufaufruf; Ausschlussthemen aus `CLAUDE.md` §7 bleiben.
- Auffälligkeiten (Themen-Logik, Ausschlussthema, Kopienähe) meldet Claude Code dem Inhaber, bevor produziert wird; die Auswahl hat der Inhaber getroffen.

## 4. Skript-Bild-Abgleich (Pflicht, Inhaber 02.11.)
In `skript.json` je Segment ein Eintrag `bild_text_abgleich`: was gesagt wird (Objekt, Handlung, Zahl, Ort) → was im selben Moment zu sehen ist (Objekt in der Welt, Kamera, Zahl auf Tafel/Chip). Beispiel:
```json
"bild_text_abgleich": [
  {"segment": "regeln", "gesagt": "Fünfzig Euro mehr im Monat", "bild": "rechte Schale: erste Münze fällt bei „fünfzig“, Tafel rechts 50 €"},
  {"segment": "wendung", "gesagt": "Nach drei Jahren kippt die Waage", "bild": "Uhr 36 MONATE, Balken kippt nach rechts, Tafel rechts VORN"}
]
```
Was nicht zu sehen ist, wird nicht gesagt; was groß zu sehen ist, wird erwähnt oder weggelassen. Der Abgleich ist zugleich das Beat-Blatt: Aus ihm leitet Claude Code Animation, Kamera und Licht ab (§6.2).

## 5. Skript-Anforderungen und Übernahme
Das Skript schreibt die Tages-Sitzung von Claude Code mit Websuche (vom Ideen-Studio gestartet, `docs/automatik/tages-sitzung.md`, Befehl aus `tools/chat_befehle.py`); nach der Freigabe durch den Inhaber setzt dieselbe Sitzung es um. Der Inhaber wählt aus 10 Ideen täglich 2 für den nächsten Tag.

### 5.1 Anforderungen an das Skript
1. **Legitim und belegbar:** Jede Aussage und Zahl ist belegt (Quelle) oder als Modellannahme gekennzeichnet; **nichts erfinden**. Belege und Annahmen stehen im Dokument (`quellen`, `annahmen`, `rechenweg`, `zahlen`) und intern in `skript.json`, nie im Video. Ausschlussthemen und Finanzregeln aus `CLAUDE.md` §7 und [themen.md](themen.md) §2, §5 gelten.
2. **Diskussionsbedarf, ohne ihn auszusprechen:** Das Skript regt Widerspruch und Kommentare an, indem es eine Annahme sichtbar macht, die man anders setzen könnte, ein Ergebnis mit Bedingung liefert oder einen überraschenden Faktor zeigt. **Keine** Aufforderung zum Streiten, **keine** Provokation, **kein** Clickbait („Das glaubst du nicht“), **keine** künstlichen Cliffhanger, keine Gruppen gegeneinander ausspielen. Prüfstein: Dient ein Satz nur dazu, Kommentare zu provozieren, fliegt er raus (CRP-Ausschluss „Clickbait“).
3. **Als Regie-Text geschrieben**, damit Ben Tonfall und Betonung problemlos umsetzt ([ton.md](ton.md) §3): eine Zeile pro Satz, Leerzeile zwischen Phasen, GROSSSCHREIBUNG nur auf dem Betonungswort (höchstens eines je Satz), ruhige v4-Tags (`[curious]`, `[thoughtful]`, `[calm]`, je Phase höchstens einer), Auslassungspunkte für Zögern, **keine `<break>`-Tags**, Zahlen im Sprechtext ausgeschrieben (im Untertitel `text` Ziffern), englische Wörter in Lautschrift, höchstens 3 Ausrufezeichen, keine aufgeregten Tags.
4. **Satzbau für Ben:** Sätze meist 2–8 Wörter (Median 4–8, meist unter 10), die Pointe nicht im Nebensatz verstecken, Countdowns und Aufzählungen als Satzfetzen mit Kommas, Fragen kurz und allein auf einer Zeile („Oder?“).
5. **Tempo:** 150–190 Wörter, Ziel ca. 2,3 W/s (§2, Wörter-Budget in §1). Das Skript ist so lang, dass keine Beschleunigung nötig ist.
6. **Struktur:** feste Reihenfolge des Zeitplans (§1) mit den festen Sätzen (Folgen-Aufruf, Schluss), echte Alternativen derselben Entscheidung, Ergebnis mit exakter Zahl, „Warum?“ mit höchstens 2 Faktoren, zweite Überraschung, Merksatz.
7. **Eigenständig:** eigene Formulierungen und eigene Szenenidee; keine 1:1-Übernahme fremder Skripte, Sätze oder Bildideen.
8. **Dokument-Felder** (`skripte`, ID `acc1-JJJJ-MM-TT-mittag|abend`): `konto`, `datum`, `slot`, `titel`, `thema`, `skript`, `rechenweg`, `zahlen`, `annahmen`, `quellen`, `caption`, `status`.
9. **Dramaturgie-Hinweise im Skript** (das Skript markiert, wo die Spannung steigt und welche Momente visuell besonders sein sollen: Zoom, Licht, Aufleuchten) sind Vorschläge für das Beat-Blatt (§6). Claude Code setzt sie um oder passt sie an, wenn Qualitätslatte oder Maß (§6.3) es verlangen, und hält die Abweichung im Beat-Blatt fest. Weitere Felder des Skripts (Länder, Wortzahl, Selbstprüfung) dienen der Eingangsprüfung.

### 5.2 Übernahme durch Claude Code
1. **Inhaltlich 1:1** nach `skript.json`: `skript` → Segmente (`id`, `phase`, `text` = Untertitel, `sprechtext` = Regie-Text), `quellen`/`annahmen` → intern, `caption` → Caption. Rein technische Anpassungen ohne Inhaltsänderung sind ohne Rücksprache erlaubt (Zeilenumbrüche, Ziffern ausschreiben, Lautschrift, Segment-IDs).
2. **Faktenfehler** (Inhaber 02.11. spätabends: „korrigieren und weiter“): mit Quelle korrigieren, die Aussage nur so weit wie nötig ändern, im Slot-Dokument unter `korrekturen` vermerken und weiterproduzieren; **kippt das Ergebnis** (anderer Gewinner bzw. andere Antwort auf die Titelfrage, Pointe stimmt nicht mehr): Status `rueckfrage`, Push an den Inhaber, dieser Slot hält an. Fehlen die festen Sätze (Folgen-Aufruf „Folg mir, damit du nichts verpasst.“, Schluss „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“), ergänzt Claude Code sie und meldet das.
3. **Zahlen prüfen:** `rechenweg`, `zahlen` und `annahmen` als Rechnung in `pipeline/sim/<thema>.mjs` mit Test nachrechnen. **Abweichungen nie stillschweigend:** jede Korrektur steht mit Feld, altem und neuem Wert, Quelle und Grund in `korrekturen` (Punkt 2). Die Zähler im Video kommen aus der geprüften Rechnung.
4. **Eingangsprüfung** (vor der Produktion): GELD und Euro-Ergebnis · Themen-Logik · Ausschlussthema · Finanzregeln (Modellrechnung, keine Anbieter) · Wörter 150–190 (Zählung des Sprechtexts ohne Tags) · Tonregeln (16a/16b) · Caption im Format von `CLAUDE.md` §7 · keine erkennbare 1:1-Kopie.
5. **Rückmeldung:** Status, Fortschritt und Verlauf im Slot-Dokument nach `docs/automatik/tages-sitzung.md` (das Studio zeigt sie live), Push bei Problemen.

## 6. Dramaturgie und Effekte (Regelabschnitt, Inhaber 02.11.2026 abends)
„Mehr Effekte, aber nichts Übertriebenes, und die Spannung steigt.“

### 6.1 Grundsätze
1. **Von der ersten Sekunde fangen, bis zum Ergebnis steigern.** Der Hook (Frage plus Welt in Bewegung) fängt in Sekunde 0; danach darf die Spannung nie fallen, bevor das Ergebnis da ist. Nach dem Ergebnis ein kurzes Ausatmen („Warum?“), dann der letzte Dreh (zweite Überraschung), Merksatz, Schleife.
2. **Skript zuerst, Design und Animation aus dem Skript ableiten.** Die Reihenfolge: Skript → Beat-Blatt (`bild_text_abgleich` plus Effekt/Kamera/Licht je Segment, in `skript.json`) → Welt und Animation. Keine Welt bauen, deren Bewegungen das Skript nicht trägt.
3. **Erlaubt und erwünscht:** mehrere verschiedene Animationssequenzen · Situations-/Bildwechsel (weiche Übergänge, Szenenwechsel in der Welt) · **Aufleuchten** von Elementen (Zahl bei Änderung, führende Seite, LED-Kante, Chip) · **Lichtspiele und Glow** (Spot-Wechsel, Lichtstrahlen, Lichtfleck, Pulsieren des Sieger-Lichts) · **Zoom, mal ja, mal nein, abwechselnd, nicht dauerhaft** · **Fahrten** (Dolly, Kran, Parallaxe, langsamer Orbit). Technische Rezepte: [licht-und-atmosphaere.md](licht-und-atmosphaere.md) §9, HUD: [design.md](design.md) §6.
4. **Verboten bleibt:** große Sticker/Stempel (bestätigt 02.11.), `regie.stoss`, Geschrei im Ton, Kaufaufrufe.

### 6.2 Spannungskurve (Stufe 1 = ruhig, 5 = Höhepunkt)
| Phase | Stufe | Typische Mittel (Beispiele, nicht alle zugleich) |
|---|---|---|
| Hook | 2 | Welt in Bewegung, langsame Fahrt, Licht auf der Frage, Tafel ab Bild 0 |
| Regeln | 2 | Objekte erscheinen beim Wort, Chips, Schärfe wandert von Seite zu Seite |
| Denkfalle | 2–3 | Licht rückt die naheliegende Seite ins Rampenlicht (die Erwartung wird aufgebaut) |
| Rennen | 3 | Zähler laufen, Kamera folgt, Abstand wird sichtbar |
| Folgen-Aufruf | 3 | ruhig, kein Effekt-Wettbewerb mit dem Element |
| erste Wendung | 4 | Zoom oder Schärfenverlagerung, Lichtwechsel, die Erwartung kippt sichtbar |
| Führungswechsel | 4 | Aufleuchten der führenden Seite, Kamerawechsel, engere Einstellung |
| Ergebnis | 5 | Licht auf den Sieger, Glow, Bilanzkarte baut sich auf; optischer Höhepunkt |
| „Warum?“ | 3 | ruhiger, erklärend (Einschub Stil 13 möglich), Fahrt statt Zoom |
| zweite Überraschung | 4 | neue Runde, neuer Winkel, letzter Dreh |
| Merksatz, Schluss | 2 | Kamera gleitet zurück zum Anfangsbild |

### 6.3 Maß (nichts Übertriebenes, sonst gehen Zuschauer verloren)
- **Variation alle 5 s:** In jedem 5-s-Fenster mindestens ein andersartiger Effekt oder Bildtyp als im Fenster davor (nicht dreimal hintereinander dasselbe, etwa drei Zooms).
- **Höchstens ein dominanter Effekt zugleich.** Zoom plus Szenenwechsel plus Lichtblitz gleichzeitig ist zu viel; Untertitel und Zahlen bleiben immer lesbar (Glow überstrahlt keinen Text).
- **Zoom nicht dauerhaft:** gezielt auf Wendung und Ergebnis, dazwischen Fahrten oder Schärfenverlagerung; Richtwert 2–4 Zooms je Video (S).
- **Kein Leerlauf:** nie mehr als 2 s ohne sichtbare Änderung (Prüfpunkt 5); trotzdem kein Dauer-Wackeln, kein Dauer-Zoom, keine Schnittgewitter.
- **Schutzregel:** keine schnellen Helligkeitswechsel (über 3 pro Sekunde, WCAG 2.3.1), kein Stroboskop; Blendenwechsel und Lichtpulse langsam und weich.
- Die Effekte folgen dem Inhalt: Was passiert nicht im Skript, wird nicht „aufgeblasen“.

### 6.4 Checkliste für die Abnahme (steht auch in [pruefung.md](pruefung.md) §2)
- [ ] **Spannungskurve:** Effektdichte und Lichtstimmung steigen bis zum Ergebnis, das Ergebnis ist der optische Höhepunkt.
- [ ] **Variation alle 5 s:** kein Fenster ohne neuen Effekt- oder Bildtyp.
- [ ] **Kein Leerlauf:** keine Phase über 2 s ohne sichtbare Änderung.
- [ ] **Nichts Übertriebenes:** höchstens ein dominanter Effekt zugleich, kein Dauer-Zoom, kein Flackern, Text immer lesbar, keine Sticker.
- [ ] **„Würde ein Zuschauer denken, das sieht billig aus?“** Bei „ja“ wird die Abnahme verweigert und nachgebessert.

## 7. Beispiel-Skript (Muster für Aufbau und Regie-Text)
„Spurwechsel im Stau“ im Aufbau von §1. **Nur Muster für Phasen und Regie-Text, nicht für das Thema:** Das Beispiel ist ein ALLTAG-Thema ohne Euro-Ergebnis; neue Videos sind GELD. Zahlen: Modellwerte aus der eigenen Simulation, S; Paul wechselt, Anna bleibt; neun Wechsel für 20 s. Umfang ca. 150 Wörter (untere Grenze des heutigen Bereichs 150–190).

| Phase | Untertitel (`text`) | Regie-Text (`sprechtext`, Eleven v4) |
|---|---|---|
| Hook | Spur wechseln oder bleiben? Wer ist im Stau wirklich schneller? | `Spur wechseln – oder bleiben?` / `[curious] Wer ist im Stau WIRKLICH schneller?` |
| Regeln | Fünf Kilometer Stau. Zwei Spuren. Paul wechselt, sobald es nebenan schneller läuft. Anna bleibt einfach drin. | je Satz eine Zeile |
| Denkfalle | Klar, Paul gewinnt. Oder? | `Klar, Paul gewinnt.` / `Oder?` (ruhig, ohne „Los geht's“ und ohne `[excited]`) |
| Rennen | Paul wechselt sofort. Und steht direkt hinter Anna. Nach anderthalb Minuten: Anna liegt 160 Meter vorn. | `Paul wechselt sofort.` / `Und steht… direkt hinter Anna.` / `Nach anderthalb Minuten:` / `Anna liegt hundertsechzig Meter VORN.` |
| Folgen-Aufruf | Folg mir, damit du nichts verpasst. | `Folg mir, damit du nichts verpasst.` |
| Wendung 1 | Denn jetzt kommt das Merkwürdige: Fünf Wechsel später steht Paul wieder hinter ihr. | `Denn jetzt kommt das Merkwürdige:` / `Fünf Wechsel später…` / `steht Paul WIEDER hinter ihr.` |
| Rennen | Erst nach sieben Minuten zieht er vorbei. Jetzt wird's knapp. | `Erst nach sieben Minuten zieht er vorbei.` / `Jetzt wird's knapp.` |
| Ergebnis | Endstand: Paul 9:36. Anna 9:56. Neun Wechsel für 20 Sekunden. | `Endstand:` / `Paul – neun Minuten sechsunddreißig.` / `Anna – neun Minuten sechsundfünfzig.` / `Neun Wechsel… für ZWANZIG Sekunden.` |
| Warum | Warum so wenig? Jeder Wechsel bringt im Schnitt nur zwei Sekunden. | `[thoughtful] Warum so wenig?` / `Jeder Wechsel bringt im Schnitt nur zwei Sekunden.` |
| Zweite Überraschung | Und das Verrückte: Je mehr Leute wechseln, desto weniger bringt es. Wechseln alle, bleiben drei Sekunden. | `Und das Verrückte:` / `Je mehr Leute wechseln, desto WENIGER bringt es.` / `Wechseln alle… bleiben drei Sekunden.` |
| Merksatz | Die andere Spur wirkt nur schneller. Du wirst fast doppelt so lange überholt, wie du selbst überholst. | `Die andere Spur WIRKT nur schneller.` / `Du wirst fast doppelt so lange überholt, wie du selbst überholst.` |
| Schluss | Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare. | `Was sollen wir als Nächstes zeigen?` / `Schreib es in die Kommentare.` |

(Das Spurwechsel-Video selbst ist gepostet; die Rechnung liegt in `pipeline/projekte/spurwechsel/`.)
