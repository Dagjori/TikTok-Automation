---
name: themen-skript
description: "Themenfindung und Skripterstellung für beide TikTok-Accounts, @simulierbar (Geld, Steuern, Rente, Preise) und @stelldirvor.pov (Was wäre wenn: Wissenschaft, Naturphänomene, Skurriles), strikt getrennt. IMMER verwenden, sobald Ideen, Themen oder Skripte gebraucht werden: „neue Ideen“, „10 Ideen“, „Themen finden“, „Themenrecherche“, „was sollen wir als Nächstes machen“, „schreib das Skript“, „Skript zu …“, „Skript überarbeiten“, Cockpit-Auftrag „ideen“ bzw. „skript“. Findet Themen mit belegter Suchnachfrage und einem nicht naheliegenden Winkel, schreibt daraus ein sendefertiges Skript mit Auflösung am Ende und liefert es in einem fest definierten Format. Erster Schritt der Kette: themen-skript → stimme-elevenlabs → video-produktion. Nicht für die Vertonung, nicht für den Bau des Videos, nicht für die Analyse fremder Videos (rea-video)."
---

# Skill: Themen und Skript (beide Accounts, strikt getrennt)

Eingeführt am 09.11.2026 (Auftrag des Inhabers: eigenes Abteil für Skripterstellung, Themen mit Suchnachfrage statt naheliegender KI-Themen, klar definierte Ausgabe). Dieser Skill ist **Schritt 1 der Kette**:

```
rea-video (bei Bedarf: Regeln aus Vorbildern)
   ↓
1 themen-skript      Ideen → Wahl des Inhabers → Skript → Freigabe
   ↓
2 stimme-elevenlabs  nur Simulierbar: Text prüfen → genau eine Aufnahme → timing.json
   ↓
3 video-produktion   Rechnung → Szene → Render → Prüfung → Buffer
   ↓
Lernschleife         Zahlen → Lernstand → fließt zurück in Schritt 1
```

## 1. Weiche (immer zuerst)
| Auftrag | Account | Lies und befolge |
|---|---|---|
| `acc1-…`, „Simulierbar“, Geld, Steuern, Rente, Preise | `@simulierbar` | [simulierbar.md](simulierbar.md) |
| `acc2-…`, „stelldirvor“, „Was wäre wenn“ | `@stelldirvor.pov` | [stelldirvor.md](stelldirvor.md) |

Lies danach **nur** den Teil dieses Accounts. Ist der Account unklar: eine Rückfrage per Klick, nicht raten.

## 2. Grundsätze (beide Accounts)
1. **Nachfrage vor Einfall.** Jedes Thema beginnt bei etwas, das Menschen nachweislich suchen oder fragen (§4). Ein Thema ohne Beleg für Nachfrage wird nicht vorgeschlagen.
2. **Nie das Naheliegende.** Andere Creator fragen dieselbe KI. Was dir zuerst einfällt, haben sie auch bekommen. Darum: die 20 naheliegendsten Ideen zuerst aufschreiben und streichen (§5 Schritt 3). Das gesuchte Thema bleibt, **der Winkel muss neu sein**.
3. **Jedes Video stellt in den ersten 3 Sekunden eine Frage, zu der der Zuschauer still einen Tipp abgibt**, und löst sie erst spät auf. Wer getippt hat, bleibt, um zu sehen, ob er recht hatte.
4. **Faktentreue.** Jede Zahl mit Quelle und Jahr (amtliche Statistik, Gesetz, Studie, Behörde, Hersteller). Nicht belegbar = nicht verwenden. Annahmen als Annahme kennzeichnen. Noch nicht beschlossene Gesetze heißen „geplant“. Keine Übertreibung, keine Panik.
5. **Originalität geprüft.** Zu jeder Idee eine Websuche mit 2 bis 3 deutschen Begriffen: Gibt es auf Deutsch schon ein Video zur **gleichen Frage** (TikTok, YouTube, Instagram)? Gefunden: Winkel drehen oder verwerfen. Englische Videos sind erlaubt, wenn unsere Fassung eigenständig ist. Nie Sätze, Bild- oder Szenenideen übernehmen.
6. **Der Inhaber wählt.** Der Skill liefert 10 Ideen und wartet auf die Wahl (im Cockpit per Klick). Ein Skript entsteht nur für gewählte Ideen und geht erst nach Freigabe weiter.
7. **Regeln ändert dieser Skill nie.** Regelquelle ist das Hirn (`hirn/`); bei Widerspruch gilt die jüngste Entscheidung im `hirn/01-Projekt/Entscheidungen Log.md`. Widersprüche melden, nicht still auflösen.

## 3. Was vor jedem Lauf gelesen wird
| Quelle | Wofür |
|---|---|
| jüngste `hirn/04-Recherche/Insights JJJJ-MM-TT.md` | Lernstand: welche Themenart, welcher Einstieg, welche Länge trägt |
| `hirn/01-Projekt/Video-Register.md` (Rückfall: `data/produktion/protokoll.csv`) | bisherige Videos (keine Dopplung; Folgeteile legt das Cockpit an) |
| stelldirvor: `pipeline/projekte/<letztes Projekt>/skript.json` (`welt`, `standpunkt`, `tageszeit_verlauf`) | Weltvielfalt gegenüber dem vorigen Video; das Protokoll enthält diese Felder nicht |
| Teil-Datei des Accounts | Themenfelder, Formate, Aufbau, Ausgabe |
| `hirn/01-Projekt/Originalität und Themenfindung.md` | Hintergrund zur Anti-Liste |

## 4. Nachfrage finden (kostenlos, je Lauf)
Arbeite die Quellen in dieser Reihenfolge ab und notiere je Fund **Suchformulierung, Quelle, Datum**:
1. **Suchvorschläge (Autocomplete):** zuerst der nackte Stamm, dann Stamm + Leerzeichen + Buchstabe für die **12 Buchstaben a, b, d, e, f, g, k, m, p, s, w, z** (nicht a bis z: das wären zu viele Abrufe für zu wenig Neues). Abruf ohne Anmeldung über
   `https://suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=de&q=<Stamm>+<Buchstabe>` (Google).
   - **Umlaute und Leerzeichen prozentkodieren** (UTF-8: `ä` = `%C3%A4`, `ö` = `%C3%B6`, `ü` = `%C3%BC`, `ß` = `%C3%9F`, Leerzeichen = `+`), sonst kommt eine leere Antwort.
   - Die Antwort ist nicht immer sauber UTF-8: erst als UTF-8 lesen, bei Fehlern als Latin-1.
   - **YouTube** (`&ds=yt`) nur ergänzend mit 4 Buchstaben je Stamm; zu Geldthemen liefert es überwiegend Musik und Spiele.
   - Themenfremde Vorschläge (Medikamente, Recht, Geräte, Prominente, Spiele) sofort verwerfen, nicht notieren.
   - Antwortet die Adresse nicht, dieselben Stämme über die Websuche abfragen. Die Stämme stehen in der Teil-Datei.
2. **Folge-Suchvorschläge statt „Weitere Fragen“:** Zu den 5 stärksten Funden den ganzen Fund als neuen Stamm abfragen (nackt plus 4 Buchstaben). Die Folgefrage ist oft schon der Winkel. „Weitere Fragen“ (People also ask) gibt es ohne Browser nicht; nur nutzen, wenn ein Browser bereitsteht.
3. **Google Trends, „Zunehmend“:** einmal versuchen. Antwortet Trends mit Fehler 429 oder gar nicht, **nicht wiederholen**, sondern in der Zeile „Nachfrage geprüft“ „Trends nicht abrufbar“ vermerken. Die Nachfrage gilt dann über Suchvorschläge und Anlässe als belegt.
4. **Anlässe mit Datum:** Gesetzesänderungen, Stichtage, Jahreszeiten, Naturereignisse der nächsten 8 Wochen (Teil-Datei).
5. **Vom Inhaber (wenn vorhanden):** Begriffe aus TikTok „Creator Search Insights“ (Filter „Inhaltslücke“) und Kommentare unter eigenen Videos. Das kann nur der Inhaber in der App abrufen; liegen keine vor, ohne sie arbeiten.

Die Liste abgenutzter Themen der Teil-Datei zeigt, wo die Nachfrage zwar groß, die Konkurrenz aber übergroß ist. Dort hilft nur ein neuer Winkel.

## 5. Ablauf „Ideen“ (liefert 10 Ideen)
| # | Schritt | Ergebnis |
|---|---|---|
| 1 | Lernstand, bisherige Videos, Teil-Datei lesen | – |
| 2 | Nachfrage sammeln (§4), mindestens **30 Rohfunde** über alle Themenfelder | Rohliste mit Quelle |
| 3 | Die **20 naheliegendsten Ideen** aufschreiben und streichen, dazu alles von der Liste „abgenutzt“ in seiner Standardfrage | Zeile „Gestrichen (naheliegend): …“ |
| 4 | Je Rohfund einen **Winkel** suchen (Winkel-Werkzeuge der Teil-Datei); ohne Winkel fällt der Fund raus. Etwa **15 Kandidaten** bilden, weil rund ein Drittel an der Originalität scheitert | Kandidaten |
| 5 | **Originalität zuerst** je Kandidat per Websuche prüfen (§2.5, Regel „gleiche Frage“ unten), **bevor** Quellen gesucht werden: das ist billig, die Quellensuche teuer | Feld `originalitaet` |
| 6 | Für die verbliebenen Kandidaten **eine Leitzahl** mit Quelle suchen (die Zahl, an der die Idee hängt). Höchstens 3 Quellen je Kandidat öffnen, keine PDFs über 20 Seiten; die volle Rechnung kommt erst im Ablauf „Skript“ | Feld `daten` |
| 7 | Bewerten (Punkte der Teil-Datei), die 10 besten wählen, Verteilung über Themenfelder und Formate einhalten | 10 Ideen |
| 8 | Ausgabe im Ideen-Format der Teil-Datei, danach die Frage „Welche wählst du?“ | Ausgabe |

**Stopp nach Schritt 8.** Kein Skript ohne Wahl.

**Regel „gleiche Frage“ (für Schritt 5):** Eine Idee ist schon gemacht, wenn ein deutsches Video (TikTok, YouTube, Reel) **dieselbe Frage als Hauptinhalt** stellt und beantwortet. Kein Hindernis sind: ein Erklärvideo zum Thema allgemein, eine Erwähnung in einem Satz, ein Video mit anderer Frage zum selben Thema. Dann im Feld `originalitaet` „ähnlich: …“ mit kurzer Begründung, warum unsere Frage und Auflösung anders sind. Instagram-Reels zählen mit; dort liegen die meisten deutschen Treffer.

**Endzahl bei der Idee:** Eine Leitzahl mit Quelle genügt. Eine Endzahl, die aus einer Rechnung mit Annahme entsteht, ist erlaubt, wenn sie als „(Rechnung mit Annahme: …)“ markiert ist. Fehlt die Endzahl noch, steht in `auflösung` „Endzahl offen, Rechnung im Skript“, und das Kriterium „Endzahl“ bzw. „Messgröße“ bekommt höchstens 1 Punkt.

**Stand von Gesetzen und Werten** (überall, wo ein Wert für die Zukunft genannt wird): **beschlossen** (im Gesetzblatt bzw. verkündet) · **Kabinett, Bundesrat offen** · **geplant** (Entwurf, Ziel) · **offen** (Prognose). Im Video heißt alles, was nicht beschlossen ist, „geplant“.

## 6. Ablauf „Skript“ (je gewählter Idee)
| # | Schritt | Ergebnis |
|---|---|---|
| 1 | Recherche vertiefen: jede Zahl an der Primärquelle prüfen, Rechenweg aufstellen und nachrechnen | `rechenweg`, `zahlen`, `quellen`, `annahmen` |
| 2 | **Frage und Auflösung festlegen**, bevor ein Satz geschrieben wird: Was tippt der Zuschauer? Was ist die Auflösung? Was ist die zweite Überraschung danach? | `offene_frage`, `aufloesung`, `zweite_frage` |
| 3 | Skript nach dem Aufbau der Teil-Datei schreiben | Segmente |
| 4 | Simulierbar: Sprechtext nach den Textregeln von `stimme-elevenlabs` schreiben (Abschnitt „Textformat“) | `sprechtext` |
| 5 | **Selbstprüfung** mit der Liste der Teil-Datei; jeden Fehler vor der Ausgabe beheben | `selbstpruefung` |
| 6 | Ausgabe im Skript-Format der Teil-Datei; Status „wartet auf Freigabe“ | Ausgabe |

Kippt bei der Recherche das Ergebnis (andere Antwort auf die Titelfrage): nicht schönrechnen, sondern dem Inhaber melden und die Idee neu fassen oder verwerfen.

## 7. Übergabe an den nächsten Schritt
- **Simulierbar:** freigegebenes Skript → `pipeline/projekte/<name>/skript.json` → Skill `stimme-elevenlabs` (Textprüfung, eine Aufnahme) → Skill `video-produktion`.
- **stelldirvor:** freigegebenes Skript → `skript.json` → direkt Skill `video-produktion` (keine Stimme).
- Im Cockpit erzeugt `tools/chat_befehle.py` die Aufträge für Ideen und Skripte; die Texte dort folgen diesem Skill. Wird hier eine Regel geändert, muss `tools/chat_befehle.py` nachgezogen und mit `python3 tools/chat_befehle.py` die Hirn-Notiz „Befehl Ideen und Skripte …“ neu erzeugt werden.

## 8. Qualitätsmaßstab für die Ausgabe
Eine Idee ist erst fertig, wenn ein Fremder nach dem Lesen der Karte sagen kann: **wonach gesucht wird, was der Zuschauer tippt, was am Ende herauskommt, und warum es dieses Video auf Deutsch noch nicht gibt.** Ein Skript ist erst fertig, wenn jede Zahl eine Quelle hat, die Auflösung nicht vor ca. 75 % der Länge fällt und nach der Auflösung noch eine zweite Überraschung kommt.
