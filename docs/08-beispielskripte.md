# Skripte und Regie-Text · Simulierbar

**Stand:** 31.10.2026, spät · **Status:** verbindlich. Neu gefasst nach dem Maßstab (`docs/15-massstab.md`) und den Vorgaben des Inhabers vom 31.10. abends.

**Kennzeichnung:**
- **(F)** = belegter Fakt bzw. gemessen
- **(S)** = Schätzung
- **(A)** = Annahme
- **(B)** = Beispielwert, der vor der Produktion gerechnet wird

---

## 1. Feste Reihenfolge jedes Videos (Pflicht)

| # | Phase | Zeit | Inhalt | Bild |
|---|---|---|---|---|
| 1 | **Scroll-Stopper-Hook** | 0–5 s | Duell-Frage in max. 2 kurzen Sätzen („X oder Y? Wer/Was … wirklich …?“) oder Du-Szenario („Du stehst im Stau. Plötzlich …“). Stimme startet unter 0,2 s. | Ganze Szene mit beiden Seiten von Bild 1 an. Titel baut sich Wort für Wort auf. Schon etwas in Bewegung. |
| 2 | **Regeln** | 3–12 s | 3–6 Mini-Fakten, 2–5 Wörter je Satz | Jede Regel poppt als Chip in Teamfarbe auf |
| 3 | **Denkfalle und Start** | 9–16 s | „Klar, [naheliegende Antwort]. Oder?“, dann „Los geht's.“ | Sticker „KLAR!“ bzw. „ODER?“, Startsignal, Uhr und Zähler starten |
| 4 | **Rennen** | 12–45 s | Kommentar wie ein Sportreporter, alle 2–3 s ein Zwischenstand, Führungswechsel, Countdown-Zahlen („fünfzehn, dreizehn, zwölf“), „Jetzt wird's knapp.“ | Zähler laufen, Kamera folgt, alle 1–2 s ein neues Bild-Ereignis |
| 5 | **Folgen-Aufruf** | ca. 20 s, max. 2 s | „Folg mir, damit du nichts verpasst.“ (Wunsch des Inhabers), direkt vor der ersten Wendung | kleines Element „+ Folgen“, Rennen läuft weiter |
| 6 | **Erste Wendung** | 18–25 s | „Aber jetzt kommt das Merkwürdige:“ bzw. „Doch …“ | Kamera-Zoom auf den entscheidenden Moment, Vergleichskarte |
| 7 | **Ergebnis** | 40–54 s | „Endstand:“, exakte Zahl, „[Sieger] gewinnt.“ | Bilanzkarte baut sich zeilenweise auf |
| 8 | **Warum** | 50–64 s | „Warum?“ und max. 2 Faktoren | 2 Balken bzw. Karten |
| 9 | **Zweite Überraschung** | 45–66 s | „Und das Verrückte:“, eine Variante dreht das Ergebnis | neue Runde bzw. Vergleich |
| 10 | **Merksatz** | letzte 5–8 s | ein kurzer, zitierfähiger Satz | große Pointe-Typo |
| 11 | **Schluss** | letzte 2–3 s | **genau:** „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“ | Bild kehrt zum Anfangsbild zurück (**Schleife**) |

- **Länge:** 65–80 s, 170–220 Wörter, mindestens 61 s (CRP).
- **Kein** Kanalname, **kein** Logo und **keine** Rubrik („GELD“, „ALLTAG“) im Video, weder im Bild noch im Text (Entscheidung des Inhabers 31.10.).

## 2. Textregeln (Spannung im Text)

- **Kurze Sätze:** meist 2–8 Wörter, höchstens ca. 10. Ein Gedanke pro Satz. Die Vorbilder liegen im Median bei 4–8 Wörtern (F, `docs/15`).
- **Du-Ansprache.** Konkrete Personen bzw. Teams mit Namen oder Buchstaben (Paul gegen Anna, A gegen B).
- **Immer eine offene Frage im Kopf des Zuschauers:** Jede Phase endet mit einer Spannung, die erst die nächste auflöst („Also ist Rennen doch schlechter? Noch nicht.“).
- **Zahlen:** rund und hörbar („zwanzig Sekunden“). Im Bild steht die exakte Zahl.
- **Keine Füllsätze**, keine Quellen, kein „laut einer Studie“. Quellen stehen intern in `skript.json`.
- **Verboten:** künstliche Cliffhanger („Teil 2 folgt“), Kaufaufrufe, Name bzw. Rubrik des Kanals.

---

## 3. Regie-Text für ElevenLabs (der `sprechtext`)

**Grundsatz** (Inhaber 31.10.): Der Sprechtext ist wie ein Regiebuch für einen Synchronsprecher. Er legt fest, wo die Stimme betont, pausiert, Spannung aufbaut und die Stimmung wechselt.

**Stimme:**
- Ben (`aTTiK3YzK3dXETpuDE2h`) mit den **gespeicherten Original-Einstellungen**, also genau so, wie er auf ElevenLabs klingt. Die Anfrage schickt deshalb keine `voice_settings`.
- Das Modell wählt der Inhaber per Hörprobe:
  - **Eleven v4:** neuestes Modell, versteht Audio-Tags
  - **Multilingual v2:** bewährt, versteht `<break>`

### 3.1 Werkzeuge im Regie-Text

| Wirkung | Eleven v4 | Multilingual v2 | Quelle |
|---|---|---|---|
| kurze Pause | Satzende, Zeilenumbruch, Gedankenstrich „ – “ | Satzende, Zeilenumbruch, `<break time="0.3s" />` | ElevenLabs Best Practices (F) |
| längere Pause (selten, max. 0,4 s) | `[short pause]` | `<break time="0.4s" />` | ElevenLabs Best Practices (F); v4/v3 unterstützen **keine** `<break>`-Tags (F) |
| Zögern, Spannung | Auslassungspunkte „…“ | „…“ | (F) |
| Betonung eines Worts | GROSSSCHREIBUNG („Jetzt wird's KNAPP.“) | sparsam Großschreibung bzw. Satzzeichen | „Capitalization increases emphasis“ (F) |
| Gefühl bzw. Haltung | Audio-Tags in eckigen Klammern: `[curious]`, `[excited]`, `[thoughtful]`, `[surprised]`, `[whispers]` | **nicht verwenden** (würde vorgelesen) | ElevenLabs Best Practices (F) |
| Frage-Melodie | Fragezeichen, kurze Frage allein auf einer Zeile („Oder?“) | gleich | (A) |
| Tempo | **nicht** künstlich ändern (Inhaber). Tempo entsteht durch kurze Sätze. Der Maßstab liegt bei 2,5–2,9 Wörtern/s. | gleich | `docs/15` |

### 3.2 Regeln für den Regie-Text

1. **Eine Zeile pro Satz**, Leerzeile zwischen Phasen. Lange Pausen gibt es nicht: Der Maßstab liegt bei ca. 0,26 s nach jedem Satz und nie über 0,4 s (F).
2. **Je Phase höchstens ein Gefühls-Tag** (v4): Hook `[curious]`, Start `[excited]`, Wendung `[surprised]`, Warum `[thoughtful]`. Zu viele Tags klingen gespielt (A).
3. **Pro Satz höchstens ein großgeschriebenes Wort**, nur auf dem Wort, das die Spannung trägt.
4. **Zahlen ausgeschrieben**, englische Wörter in Lautschrift („G T A sechs“).
5. **Countdowns als Satzfetzen mit Kommas:** „Fünfzehn Kilometer, dreizehn, zwölf, zehn.“
6. **Prüfen:** Nach der Vertonung prüft `pipeline/qc/massstab.py` Tempo, Satzpausen und Satzlängen. Eine Hörprobe der ersten 15 s geht an den Inhaber, solange das Modell neu ist.

### 3.3 Format in `skript.json`

```json
{
  "titel": "…",
  "rubrik": "ALLTAG",                       // nur intern, nie im Video
  "stil": "2 Isometrisches 3D",
  "teamfarben": {"Paul": "#FF7A1A", "Anna": "#2F6FED"},
  "segmente": [
    {"id": "hook", "phase": "hook",
     "text": "Spur wechseln oder bleiben? Wer ist im Stau wirklich schneller?",          // Untertitel (Anzeige)
     "sprechtext": "Spur wechseln – oder bleiben?\n[curious] Wer ist im Stau WIRKLICH schneller?"}  // Regie-Text
  ],
  "quellen": ["…"]                          // nur intern
}
```

---

## 4. Beispiel: „Spurwechsel im Stau“ im neuen Aufbau (Vorlage für den Neubau)

Die Zahlen stammen aus der eigenen Simulation `pipeline/projekte/spurwechsel/sim_ergebnisse.md` (Modellwerte, **S**). Im Duell-Beispiel liegen sie bei 9:36 gegen 9:56. Im Mittel bringt der Wechsel 19,9 s, das sind ca. 2 s je Wechsel. Bei 60 % Wechslern bleiben 10,5 s, bei 10 % sind es 57 s. Man wird 20 % der Zeit überholt und überholt selbst 11 % der Zeit.

| Phase | Untertitel (`text`) | Regie-Text (`sprechtext`, Eleven v4) |
|---|---|---|
| Hook | Spur wechseln oder bleiben? Wer ist im Stau wirklich schneller? | `Spur wechseln – oder bleiben?` / `[curious] Wer ist im Stau WIRKLICH schneller?` |
| Regeln | Fünf Kilometer Stau. Zwei Spuren. Paul wechselt, sobald es nebenan schneller läuft. Anna bleibt einfach drin. | `Fünf Kilometer Stau.` / `Zwei Spuren.` / `Paul wechselt, sobald es nebenan schneller läuft.` / `Anna bleibt einfach drin.` |
| Denkfalle und Start | Klar, Paul gewinnt. Oder? Los geht's. | `Klar, Paul gewinnt.` / `Oder?` / `[excited] Los geht's!` |
| Rennen | Paul wechselt sofort. Und steht direkt hinter Anna. Nach anderthalb Minuten: Anna liegt 160 Meter vorn. | `Paul wechselt sofort.` / `Und steht… direkt hinter Anna.` / `Nach anderthalb Minuten:` / `Anna liegt hundertsechzig Meter VORN.` |
| Folgen-Aufruf | Folg mir, damit du nichts verpasst. | `Folg mir, damit du nichts verpasst.` |
| Wendung 1 | Denn jetzt kommt das Merkwürdige: Fünf Wechsel später steht Paul wieder hinter ihr. | `[surprised] Denn jetzt kommt das Merkwürdige:` / `Fünf Wechsel später…` / `steht Paul WIEDER hinter ihr.` |
| Rennen | Erst nach sieben Minuten zieht er vorbei. Jetzt wird's knapp. | `Erst nach sieben Minuten zieht er vorbei.` / `Jetzt wird's knapp.` |
| Ergebnis | Endstand: Paul 9:36. Anna 9:56. Neun Wechsel für 20 Sekunden. | `Endstand:` / `Paul – neun Minuten sechsunddreißig.` / `Anna – neun Minuten sechsundfünfzig.` / `Neun Wechsel… für ZWANZIG Sekunden.` |
| Warum | Warum so wenig? Jeder Wechsel bringt im Schnitt nur zwei Sekunden. | `[thoughtful] Warum so wenig?` / `Jeder Wechsel bringt im Schnitt nur zwei Sekunden.` |
| Zweite Überraschung | Und das Verrückte: Je mehr Leute wechseln, desto weniger bringt es. Wechseln alle, bleiben drei Sekunden. | `Und das Verrückte:` / `Je mehr Leute wechseln, desto WENIGER bringt es.` / `Wechseln alle… bleiben drei Sekunden.` |
| Merksatz | Die andere Spur wirkt nur schneller. Du wirst fast doppelt so lange überholt, wie du selbst überholst. | `Die andere Spur WIRKT nur schneller.` / `Du wirst fast doppelt so lange überholt, wie du selbst überholst.` |
| Schluss | Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare. | `Was sollen wir als Nächstes zeigen?` / `Schreib es in die Kommentare.` |

Umfang ca. 150 Wörter. Für 65–80 s fehlen noch ca. 20–40 Wörter. Sie kommen in der Produktion aus einem zweiten Zwischenstand im Rennen und einem Satz zum Drängler-Fall dazu (50 s mit 23 Wechseln, S). Vor der Produktion prüfen:
- „Wechseln alle, bleiben drei Sekunden“ beruht auf der Variante „95 % Spurwechsler“ mit 3,4 s (S).
- „Fast doppelt so lange“ beruht auf 20,3 % gegen 10,8 % im Referenzlauf (S). Beide stehen in `sim_ergebnisse.md`.

---

## 5. Ältere Skripte

Die Skripte vom 31.10. vormittags (GTA 6, Reißverschluss, Weihnachtsgeld, Mindestlohn) folgen dem alten Aufbau mit Marke, „Schreibt euren Simulationswunsch …“ und ohne Denkfalle bzw. Folgen-Aufruf. Sie gelten nicht mehr als Vorlage. Neue Skripte entstehen nach Abschnitt 1–3. Die Rechnungen und Quellen in den Projektordnern bleiben gültig.
