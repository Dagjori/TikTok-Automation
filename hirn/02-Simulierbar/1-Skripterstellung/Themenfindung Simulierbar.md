---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-10
quelle: .claude/skills/themen-skript/SKILL.md, .claude/skills/themen-skript/simulierbar.md (Teil A), Entscheidung des Inhabers 09.11.2026
tags: [konto/simulierbar, themen, themenfindung, nachfrage, winkel, originalitaet]
cssclasses: [konto-simulierbar, typ-regel]
---

# Themenfindung Simulierbar

Regeln, nach denen Themen für `@simulierbar` gefunden und ausgewählt werden. **Gültig seit 09.11.2026** ([[Entscheidungen Log]]). Hier stehen die Regeln; den Ablauf Schritt für Schritt und das genaue Ausgabeformat der Ideen-Karten führt der Skill `themen-skript` (`.claude/skills/themen-skript/SKILL.md` und `simulierbar.md`, Teil A). Gilt nicht für Account 2 ([[Trennung der Accounts]]).

## 1. Grundsätze
| Grundsatz | Inhalt |
|---|---|
| **Nur Geld** | Nische „Geld in Deutschland“. Jedes Video beantwortet eine Geldfrage mit einer **eigenen Modellrechnung** und endet mit einem konkreten Ergebnis in Euro. Zeit wird über Mindestlohn oder Netto-Stundenlohn (`pipeline/sim/netto.mjs`) in Euro umgerechnet. |
| **Nachfrage ist Pflicht** | Jedes Thema beginnt bei etwas, das Menschen nachweislich suchen oder fragen. Ohne Beleg (Suchformulierung, Quelle, Datum bzw. Anlass mit Datum) wird ein Thema nicht vorgeschlagen. |
| **Winkel ist Pflicht** | Das gesuchte Thema bleibt, die Frage muss neu sein (Werkzeuge in §4). Ein Fund ohne Winkel fällt raus. |
| **Nie das Naheliegende** | Die 20 naheliegendsten Ideen werden zuerst aufgeschrieben und gestrichen, dazu alles von der Liste „abgenutzt“ (§6) in seiner Standardfrage. |
| **Originalität geprüft** | Je Idee eine Websuche mit 2 bis 3 deutschen Begriffen: Gibt es auf Deutsch schon ein Video zur gleichen Frage? Bei einem Fund Winkel drehen oder verwerfen. Gemeinsames Prinzip: [[Originalität und Themenfindung]]. |
| **Tipp und späte Auflösung** | Jedes Video stellt in den ersten 3 Sekunden eine Frage, zu der der Zuschauer still einen Tipp abgibt, und löst sie erst spät auf ([[Skriptaufbau Simulierbar]]). |
| **Der Inhaber wählt** | Der Skill liefert 10 Ideen und wartet auf die Wahl. Ein Skript entsteht nur für gewählte Ideen. |

Das Duell ist seit 09.11.2026 **keine Pflicht** mehr; erlaubt sind vier Formate (§5). Die frühere Themen-Logik gilt weiter für das Format Duell: Beide Seiten sind echte Alternativen derselben Entscheidung.

## 2. Themenfelder
Die 10 Ideen verteilen sich auf mindestens 5 Felder. Die Beispiele sind Ausgangspunkte, keine Themenliste; die Nachfrage wird in jedem Lauf neu erhoben.

| Feld | Beispiele für Nachfrage (Stand 09.11.2026) |
|---|---|
| 1 Rente und Vorsorge | Rente mit 63, Abschläge, Rentenbesteuerung, Frühstart-Rente, Altersvorsorgedepot, Riester-Altvertrag |
| 2 Netto, Steuern, Abgaben | Netto 2027, Beitragsbemessungsgrenze, Steuerklassen, Fristen und Verspätungszuschlag |
| 3 Krankenkasse und Pflege | Zusatzbeitrag, Familienversicherung, Zuzahlungen, Pflegegrad und Eigenanteil |
| 4 Arbeit und Gehalt | Mindestlohn, Minijob-Grenze, Berufsgehälter, Beamter gegen Angestellter, Krankheitstag |
| 5 Preise und Lebenshaltung | Sprit- und Energiesteuern, CO2-Preis, Abos, Lebensmittel, „was kostet …“ |
| 6 Wohnen und Energie | „Lohnt sich …“ (Wärmepumpe, Balkonkraftwerk, E-Auto), Nebenkosten, Grundsteuer |
| 7 Geld früher und heute | Preise in Arbeitszeit, ein Monatslohn in Gold, D-Mark-Zeit gegen heute |
| 8 Versteckte Mechaniken und Kurioses | Rundung, Grundgebühr, Pfand, Staffelpreis, kuriose Steuern |

Ersetzt die fünf Themenfelder vom 07.11. und die Klassiker-Quote („höchstens 1 von 10“ bzw. „bis 3 von 10“).

## 3. Woher die Nachfrage kommt
1. **Suchvorschläge** von Google und YouTube zu festen Suchstämmen: `ab wann` · `wie viel steuern` · `wie viel geld` · `wie viel rente` · `wie viel netto` · `was kostet` · `was bleibt von` · `lohnt sich` · `wie hoch ist` · `wann bekomme ich` · `was ändert sich 2027` · `gehalt` · `rente` · `krankenkasse` · `steuererklärung` · `mindestlohn` · `pflegegrad` · `grundsicherung`.
2. **Google Trends** („Zunehmend“, Deutschland, 3 Monate). Nicht abrufbar: im Ergebnis als „Trends nicht geprüft“ vermerken.
3. **„Weitere Fragen“** der Websuche zu den stärksten Funden. Die Folgefrage ist oft schon der Winkel.
4. **Anlässe mit Datum:** Gesetzes- und Beitragsänderungen zum Jahreswechsel und zur Jahresmitte, Rentenanpassung im Juli, Steuerfristen, Heizperiode, Urlaubszeit, Nebenkostenabrechnung. Noch nicht beschlossene Vorhaben heißen immer „geplant“.
5. **Vom Inhaber, wenn vorhanden:** Begriffe aus TikTok „Creator Search Insights“ und Kommentare unter eigenen Videos.

Je Lauf mindestens 30 Rohfunde über alle Felder. Abruf und Reihenfolge: Skill `themen-skript` §4.

## 4. Winkel-Werkzeuge
| # | Werkzeug | Was es tut |
|---|---|---|
| 1 | Zwei Menschen, ein Unterschied | gleiche Lage, eine einzige Größe anders (Jahrgang, Startjahr, 50 Euro mehr Lohn, Bundesland) |
| 2 | Der Kipppunkt | Ab welchem Betrag, Jahr oder Kilometer dreht sich das Ergebnis? |
| 3 | Was wirklich bleibt | Erhöhung minus alles, was gleichzeitig steigt |
| 4 | Die Schwelle | der eine Euro, der mehr kostet, als er bringt |
| 5 | Wer bekommt was | ein Betrag als Stapel zerlegt (Tankfüllung, Bruttolohn, Miete) |
| 6 | Zeitreise | dieselbe Sache in Arbeitszeit, Gold oder Brötchen, damals und heute |
| 7 | Einholen | Zwei starten verschieden. Wann holt der Spätere auf, und holt er überhaupt auf? |
| 8 | Die übersehene Zeile | der Posten auf Abrechnung oder Bescheid, den kaum jemand liest |

## 5. Formate
| Format | Wann | Was der Zuschauer tippt |
|---|---|---|
| **Duell** | zwei echte Alternativen derselben Entscheidung | wer vorn liegt |
| **Zeitverlauf** | etwas entwickelt sich über Jahre | wann es kippt oder wie hoch es endet |
| **Was bleibt** | ein Betrag wird Schritt für Schritt kleiner oder verteilt | wie viel am Ende übrig ist |
| **Lernvideo** | eine Regel oder Mechanik, an einer Modellperson durchgerechnet | was bei ihr herauskommt |

Je 10 Ideen höchstens 5 Duelle, jedes andere Format mindestens einmal. Jedes Format braucht laufende Zähler und eine Euro-Zahl am Ende.

## 6. Abgenutzt, geöffnet, ausgeschlossen
- **Abgenutzt (in der Standardfrage nie vorschlagen):** Zinseszins und „früh sparen“ · 100 Euro monatlich in einen ETF · erste Million · Brutto-Netto bei einem runden Gehalt ohne Winkel · Inflation frisst Erspartes · Mieten oder Kaufen als Grundsatzfrage · Kaffee to go · Streaming-Abos zusammenzählen · Standby-Kosten · LED gegen Glühbirne · Duschen oder Baden · Leitungs- gegen Flaschenwasser · E-Auto gegen Verbrenner als Grundsatzfrage · Handyvertrag gegen Prepaid · Black Friday · Tanken zu bestimmten Uhrzeiten.
- **Geöffnet seit 09.11.2026:** Stark gesuchte Themen wie Rente, Steuererklärung, Kindergeld, Grundsicherung, Teilzeit oder Jobwechsel sind erlaubt, **wenn** die Frage einen Winkel aus §4 hat und auf Deutsch so noch nicht gemacht wurde. Das Ergebnis ist immer die persönliche Euro-Folge für eine Modellperson, nie eine politische Bewertung.
- **Ausgeschlossen:** Parteipolitik und Wertungen über Gruppen · Anlageberatung, Einzelaktien, Krypto, Empfehlungen für Anbieter · Glücksspiel, Tabak und Vape als Kaufanreiz · Gesundheitsversprechen · Tragödien · „schnell reich“, Kaufaufrufe, FOMO. Einzelheiten: [[Finanzregeln Simulierbar]], Wortwahl: [[Finanz-Formulierungen Simulierbar]].
- **Eigene Videos:** Was schon gebaut ist (`data/produktion/protokoll.csv`), wird nicht wiederholt. Ausnahme sind Folgeteile eigener Treffer ([[Serien und Treffer-Folgen]]).

Die Liste „abgenutzt“ und die Originalitätsprüfung je Idee ersetzen die alte Sperrliste (Archiv: [[Sperrliste und Auswahlregeln Simulierbar]]) und den „Konkurrenz-Check vor jeder Produktion“.

## 7. Bewertung je Kandidat
0 bis 3 Punkte je Zeile, höchstens 21. Unter 14 Punkten wird nicht vorgeschlagen. Bei „Nachfrage“ oder „Belegbarkeit“ 0 Punkte: raus.

| Kriterium | 3 Punkte heißt |
|---|---|
| Nachfrage | in Suchvorschlägen **und** steigend bei Trends oder aktueller Anlass |
| Betroffenheit | betrifft Millionen (Arbeitnehmer, Rentner, Mieter, Autofahrer) |
| Winkel | Frage so auf Deutsch nicht gefunden |
| Tipp-Sog | jeder hat sofort eine Meinung, und viele liegen falsch |
| Endzahl | große oder unerwartete Euro-Zahl, die man weitererzählt |
| Belegbarkeit | amtliche Quellen, Rechnung nachvollziehbar |
| Bildkraft | als laufende Zähler, Stapel oder Rennen zeigbar |

Das alte Score-Raster (D 30, K 25, B 20, L 15, F 10) ist Archiv ([[Themenplan Simulierbar]]).

## 8. Was eine Idee enthält
Jede Idee kommt als Karte mit Titelfrage, Suchbegriff, Nachfrage, Winkel, „Vermeidet“, Originalität, Tipp, Auflösung, zweiter Frage, Hook, Daten, Bildidee, Weiterschick-Wert und Risiko. Das genaue Format steht im Skill (`simulierbar.md` A8). Der Auftragstext für das Cockpit steht in [[Befehl Ideen und Skripte Simulierbar]].

Eine Idee ist erst fertig, wenn ein Fremder nach dem Lesen sagen kann: wonach gesucht wird, was der Zuschauer tippt, was am Ende herauskommt und warum es dieses Video auf Deutsch noch nicht gibt.

## Siehe auch
[[Themen-Nachfrage]] (Vorrat an Nachfrage-Belegen, 25 Cluster mit Winkel) · [[Zahlen 2027 Simulierbar]] (Stammdaten 2027 mit Status) · [[Skriptaufbau Simulierbar]] · [[Finanzregeln Simulierbar]] · [[Finanz-Formulierungen Simulierbar]] · [[Konkurrenz und Themen Simulierbar]] (Marktbelege) · [[Pipeline und Skills]] · [[Regelwerk Simulierbar]] · [[Account Simulierbar Überblick]] · [[Trend-Radar]]
