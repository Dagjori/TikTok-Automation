---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-08
quelle: Entscheidung des Inhabers 07.11.2026 (per Klick), tools/chat_befehle.py; Lockerung Klassiker, Folgeteile, Weiterschick-Wert: Wahl des Inhabers 08.11.2026
tags: [konto/gemeinsam, themen, originalitaet, ideen]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Originalität und Themenfindung

**Gültig seit 07.11.2026 für beide Accounts.** Anlass: Viele Ideen-Vorschläge waren 1:1 dieselben, die auch andere Creator bekommen. Der Inhaber: „Ich will keine 0815-Vorschläge, sondern Themen, die wirklich niemand macht.“

## Warum das passiert
Andere Creator fragen dieselbe KI mit ähnlichen Befehlen. Die KI liefert dann die naheliegendsten Antworten, bei allen dieselben (Mieten oder Kaufen, Duschen oder Baden, Sonne explodiert). Der Ausweg ist ein Befehl, den sonst niemand stellt, und eine Prüfung gegen das, was es schon gibt.

## Die Regeln (Entscheidungen des Inhabers, 07.11.)
| Regel | Inhalt |
|---|---|
| **Strenge** | Kein Thema, zu dem es **auf Deutsch** schon ein Video mit der gleichen Frage bzw. Prämisse gibt (TikTok, YouTube, Instagram). Englische Vorbilder sind erlaubt, aber nur mit eigenem Skript und deutlich anderem Design; nie Sätze, Bild- oder Szenenideen übernehmen. |
| **Einzigartig und relevant** | Beides ist Pflicht: ein ungewöhnlicher Winkel auf etwas, das viele kennen oder betrifft. Ganz abseitige Nischen fallen genauso raus wie Standardthemen. |
| **20 naheliegende streichen** | Die KI schreibt zuerst die 20 naheliegendsten Ideen auf und streicht sie, dazu alles von der Anti-Liste des Accounts. Die gestrichenen Ideen stehen im Ergebnis (Feld `gestrichen`). |
| **Anti-Liste** | je Account eine Liste der Standardthemen, nie vorschlagen, auch nicht umbenannt (Text im Befehl: [[Befehl Ideen und Skripte Simulierbar]], [[Befehl Ideen und Skripte Account 2]]) |
| **Zutaten des Tages** | Das Cockpit zieht für jeden Ideen-Auftrag je Liste 2 zufällige Einträge (Gesetz, Ding, Beruf, Land, Zeit, Mechanik bzw. Ort, Natur, Geschichte, Technik, Messgröße, Tageszeit). Mindestens 6 der 10 Ideen bauen darauf auf. Die gezogenen Zutaten werden mit den Ideen gespeichert. |
| **Websuche je Idee** | Jede Idee wird vor dem Vorschlag gesucht; das Ergebnis steht im Feld `originalitaet` („kein deutsches Video gefunden“, „englisch: …“ oder „ungeprüft“). Die Tages-Sitzung sucht vor dem Skript noch einmal; bei einem deutschen Fund schreibt sie kein Skript, sondern setzt den Status `rueckfrage` mit dem Fund und einem eigenen Dreh. |
| Kein Gedächtnis aller Vorschläge | bewusst **nicht** gewählt: Nicht gewählte Ideen dürfen später wiederkommen. Gesperrt sind nur unsere gebauten Videos (Liste „bisher“). **Ausnahme seit 08.11.:** Folgeteile eigener Treffer (neue Rechnung bzw. neues Szenario zum selben Versprechen) sind von der Sperre „bisher“ und der Anti-Liste ausgenommen ([[Serien und Treffer-Folgen]]). |
| **Weiterschick-Wert** (seit 08.11.) | Jede Idee beantwortet zusätzlich: „Würde man das jemandem schicken?“ Unser einziger Treffer war das einzige Video mit nennenswerten Shares (30 statt 0–1, **F**, n = 1). |

## Account 1 Simulierbar
- **Klassiker** (Mieten oder Kaufen, Studium oder Ausbildung, Leasing, Rente bzw. Vorsorge, Kind): ~~höchstens 1 von 10~~ **seit 08.11. bis 3 von 10**, jeweils mit eigenem Blickwinkel bzw. einer Frage, die auf Deutsch noch niemand gestellt hat. Grund: Der einzige Treffer („Studium oder Ausbildung“, 7.721 Aufrufe, 27-facher Median) war ein Klassiker; TikTok schließt nur fremdes oder wiederverwendetes Material ohne Neues aus, eine neue eigene Rechnung zu einem bekannten Thema ist erlaubt (**F**, [[Wachstum auf 10.000 Follower]]). Ersetzt die Gewichtung vom 03.11. („mindestens 6 von 10 große Lebensentscheidungen“). Die große, überraschende Euro-Endzahl bleibt Pflicht.
- **Themenfelder** (jedes der Felder 1–4 mindestens einmal je 10 Ideen): 1 Versteckte Mechaniken · 2 Geschichte und Kurioses · 3 Geld hinter den Dingen · 4 Länder-Duelle · 5 ungewöhnliche Lebensentscheidungen. Jede Idee bleibt ein Duell mit Euro-Ergebnis.
- Details: [[Auswahl- und Finanzregeln Simulierbar]] §1.

## Account 2 stelldirvor
- **Klassiker gesperrt** (die Lockerung vom 08.11. gilt nur für Account 1; offen, ob Account 2 nachzieht, [[Wachstum auf 10.000 Follower]] › Offene Fragen): Sonne explodiert, Erde hört auf sich zu drehen, Mond stürzt ab, Asteroid, Sauerstoff weg, Megawelle, Supervulkan, Schwarzes Loch, Zombie und die übrigen Punkte der Anti-Liste.
- **Neue Themenfelder** (jedes mindestens einmal je 10 Ideen): Natur und Tiere · Geschichte umgedreht (keine reale Tragödie, keine Opfer) · Technik und Versorgung (an einem konkreten Ort, nicht der weltweite Blackout); dazu weiter Physik, Wetter, Geografie, Weltraum mit eigener Prämisse.
- **Maßstab meist persönlich:** mindestens 6 von 10 an einem greifbaren Ort mit vorstellbarer Skala.
- Details: [[Themen und Plan Account 2]] §1.

## Wo es umgesetzt ist
- Befehlstext: `tools/chat_befehle.py` (Blöcke `ORIGINAL`, `A1_ANTI`, `A2_ANTI`, Zutaten-Listen) → Befehl-Notizen, `docs/ideen-studio/befehle.json`. **Noch nicht nachgezogen (Stand 08.11.):** Klassiker bis 3 von 10, Ausnahme für Folgeteile, Weiterschick-Wert ([[Stand und nächste Schritte]]).
- Cockpit: `cockpit/lib/studio.mjs` zieht die Zutaten, erlaubt dem Ideen-Auftrag die Websuche und speichert `zutaten` und `gestrichen` mit den Ideen; die Karten zeigen „Originalität“, „Themenfeld“ und „Zutat“.
- Tages-Sitzung: Originalitäts-Suche vor dem Skript (`RECHERCHE_CODE`), Produktion: Eingangsprüfung im Skill `video-produktion`.

## Grenzen
- TikTok zeigt Such- und Hashtag-Seiten ohne Login nicht; die Websuche findet TikTok-Videos nur, soweit Suchmaschinen sie kennen ([[Recherche-Methode und Grenzen]]). „Kein deutsches Video gefunden“ heißt deshalb: nicht gefunden, nicht: sicher keins (A).
- Der Trend-Radar schlägt weiter eigene Themen vor; die Anti-Liste gilt dort noch nicht (Radar-Prompt nur in der Radar-Sitzung änderbar, [[Trend-Radar]]).
- Ob ungewöhnliche Themen so gut laufen wie die Klassiker, misst die Lernschleife ([[Lernschleife und Insights]], Abschnitt „Laufende Tests“).

## Siehe auch
[[Entscheidungen Log]] · [[Claude-Chat-Workflow]] · [[Regelwerk Simulierbar]] · [[Regelwerk Account 2]] · [[Index]]
