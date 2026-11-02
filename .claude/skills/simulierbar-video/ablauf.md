# Ablauf: Videoaufbau als Zeitplan

Quelle: `CLAUDE.md` (Videoaufbau, feste Reihenfolge) und `docs/15-massstab.md` §1, §5, §11. Hier als Zeitplan für Ben im Original (ca. 2,0 Wörter/s, Satzpausen 0,5–0,7 s, 130–170 Wörter, Profil `ben` in `qc/massstab.py`). Zeiten sind Zielwerte; was `massstab.py` misst, steht in `pruefung.md`.

## 1. Zeitplan (65–80 s, mindestens 61 s)

| Zeit | Phase | Sprechtext (Muster) | Bild (Welt zuerst, HUD unterstützt) |
|---|---|---|---|
| 0–5 s | **Hook** | Duell-Frage in max. 2 kurzen Sätzen: „X oder Y? Was … wirklich …?“ oder Du-Szenario. Stimme startet < 0,2 s. | Ganze Szene mit beiden Seiten von Bild 1 an, schon in Bewegung (Licht, Verkehr, Staub, Kamera fährt). Tafel oben ab Bild 0 (Werte 0). Optional Titel Wort für Wort. |
| 3–12 s | **Regeln** | 3–6 Mini-Fakten, 2–5 Wörter je Satz | Jede Regel erscheint genau beim Wort: als Objekt in der Welt (Preisschild, Münzstapel, Route, Gefäß) und als Chip. |
| bis 16 s | **Denkfalle** | „Klar, [naheliegende Antwort]. Oder?“ ruhig gesprochen. **Kein „Los geht's“.** | Kamera rückt die naheliegende Seite ins Licht (Schärfe, Lichtkegel). Kein Sticker. |
| ab ca. 13 s | **Rennen** | ruhiger Erzähler-Kommentar, alle 2–3 s ein Zwischenstand | Uhr bzw. Zähler laufen sichtbar (Tafel, Uhr, Füllstand, Münzstapel, Lichtspur), Kamera folgt. |
| ca. 20 s, max. 2 s | **Folgen-Aufruf** | „Folg mir, damit du nichts verpasst.“ | `M.folgen({ ein, dauer: 1.8 })`, Welt läuft weiter. Direkt vor der ersten Wendung. |
| 18–25 s | **Erste Wendung** | „Aber jetzt kommt das Merkwürdige:“ bzw. „Doch …“ | Kamera-Zoom bzw. Schärfenverlagerung auf den entscheidenden Moment, Licht wechselt (z. B. Spot auf die andere Seite). |
| danach alle 8–10 s | **Führungswechsel / weitere Wendung** | Countdown-Zahlen als Satzfetzen, „Jetzt wird's knapp.“ (ruhig) | Tafel färbt die führende Seite, Welt reagiert (Waage kippt, Gefäß überholt, Route leuchtet auf). |
| 40–54 s | **Ergebnis** | „Endstand: …“, exakte Zahl in Euro, „[Sieger] gewinnt.“ | Bilanzkarte (`M.bilanz`) baut sich zeilenweise auf; in der Welt hält das Rennen an, Licht auf den Sieger. |
| 50–64 s | **„Warum?“** | max. 2 Faktoren | `M.balken` mit 2 Faktoren; Blaupause (Stil 13) als Einschub erlaubt (`stile.md`). |
| 45–66 s | **Zweite Überraschung** | „Und das Verrückte: …“, eine Variante dreht das Ergebnis | neue Runde in derselben Welt (anderer Parameter), Zähler laufen neu. |
| letzte 5–8 s | **Merksatz** | ein kurzer, zitierfähiger Satz | `M.pointe` ruhig (ohne Comic-Kontur, `design.md`) oder nur Welt + Untertitel. |
| letzte 2–3 s | **Schluss** | genau: „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ | Kamera und Werte gleiten zum Anfangsbild zurück (`M.schleife`, `regie.schleife`): **letztes Bild = erstes Bild**. |

**Dynamik:** alle 1–2 s etwas Neues im Bild (Bewegung in der Welt, Kamerafahrt, Lichtwechsel, Zähler, Chip, Szenenwechsel), nie mehr als 2 s Stillstand (`massstab.py` Punkt 5). Die Neuigkeit kommt bevorzugt aus der Welt: Objekt erscheint, Licht geht an, Flüssigkeit steigt, Auto biegt ab, Waage kippt. Szenenwechsel weich (`zoomwisch`, `blende`, `iris`), höchstens alle 5–15 s.

## 2. Satzmuster (docs/15 §5, ruhig gesprochen)
- Hook „X oder Y? Was … wirklich …?“ · Denkfalle „Klar, X. Oder?“ · Wendung „Aber jetzt kommt das Merkwürdige:“, „Doch …“ · Spannung als Countdown-Fetzen · Ergebnis „Endstand:“ · Erklärung „Warum?“ · Zweite Überraschung „Und das Verrückte:“ · Merksatz kurz.
- Sätze meist unter 10 Wörtern, Median 4–8. „du“-Ansprache. Zahlen im Sprechtext ausgeschrieben.

## 3. Themen-Logik (Pflicht vor Produktionsstart)
- Beide Seiten sind **echte Alternativen derselben Entscheidung** (schließen sich aus bzw. werden gegeneinander abgewogen). Gegenbeispiel: „Steuererklärung oder Überstunden“ (keine gemeinsame Entscheidung).
- Ergebnis endet in **Euro** (GELD-Schwerpunkt, mind. 50 von 60 Videos).
- Thema nicht bei der Konkurrenz viral (`docs/15` §9, `docs/12` §3.4).
- Finanzthemen nur als Modellrechnung, keine Produkt- oder Anlageempfehlung, kein Kaufaufruf.

## 4. Skript-Bild-Abgleich (Pflicht, Inhaber 02.11.)
In `skript.json` je Segment ein Eintrag `bild_text_abgleich`: was gesagt wird (Objekt, Handlung, Zahl, Ort) → was im selben Moment zu sehen ist (Objekt in der Welt, Kamera, Zahl auf Tafel/Chip). Beispiel:
```json
"bild_text_abgleich": [
  {"segment": "regeln", "gesagt": "Fünfzig Euro mehr im Monat", "bild": "rechte Schale: erste Münze fällt bei „fünfzig“, Tafel rechts 50 €"},
  {"segment": "wendung", "gesagt": "Nach drei Jahren kippt die Waage", "bild": "Uhr 36 MONATE, Balken kippt nach rechts, Tafel rechts VORN"}
]
```
Was nicht zu sehen ist, wird nicht gesagt; was groß zu sehen ist, wird erwähnt oder weggelassen.
