---
typ: index
konto: gemeinsam
status: aktuell
datum: 2026-11-10
quelle: hirn/
tags: [konto/gemeinsam, index, moc]
cssclasses: [konto-gemeinsam, typ-index]
---

# Index: das Hirn von TikTok Automation

Zwei TikTok-Kanäle, ein gemeinsames Fundament, strikt getrennte Regelwerke. Zuerst [[Wie dieses Hirn funktioniert]] und [[Trennung der Accounts]] lesen, dann den passenden Zweig. Seit 09.11.2026 hat jeder Account **Abteile**: `1-Skripterstellung`, `2-Stimme` (nur Simulierbar), `3-Produktion`, `9-Archiv`.

## Schnellstart für eine neue Sitzung
1. **Was steht an?** → [[Stand und nächste Schritte]]
2. **Welche Regeln gelten?** → [[Regelwerk]] (gemeinsam), [[Regelwerk Simulierbar]], [[Regelwerk Account 2]]
3. **Welcher Account?** → Zweig unten wählen und **nur dessen** Notizen lesen.
4. **Welcher Schritt der Kette?** → [[Pipeline und Skills]]: `themen-skript` → `stimme-elevenlabs` (nur Simulierbar) → `video-produktion`. Das Hirn enthält die Regeln, der Skill unter `.claude/skills/<name>/` den Ablauf und das Ausgabeformat. Zu jedem Skill gehört ein Abteil des Accounts.
5. **Neue Regel oder Entscheidung?** → Heimat-Notiz ändern, dann [[Entscheidungen Log]].

## Start (`00-Start`)
| Notiz | Inhalt |
|---|---|
| [[Wie dieses Hirn funktioniert]] | Aufbau, Konventionen, wo Regeln und wo Abläufe stehen, Abgleich mit dem Desktop |
| [[Trennung der Accounts]] | was nie gemischt wird |
| [[Farbcode]] | Farben je Kategorie |

## Gemeinsam (`01-Projekt`)
| Notiz | Inhalt |
|---|---|
| [[Regelwerk]] | alle gemeinsamen Regeln auf einer Seite |
| [[Pipeline und Skills]] | die Kette der Skills: was jeder nimmt und übergibt, wo der Inhaber klickt |
| [[Claude-Chat-Workflow]] | Tagesablauf im Cockpit: Ideen 07:00, Wahl, Skript, Freigabe, Produktion |
| [[Cockpit]] | lokales Regie-Cockpit, Bereiche, vier Automatiken |
| [[Video-Register]] | jedes Video von der Idee bis zu den Zahlen, je Account eine Tabelle; vom Cockpit erzeugt, nicht von Hand ändern |
| [[Originalität und Themenfindung]] | gemeinsames Prinzip: Nachfrage, neuer Winkel, Websuche je Idee |
| [[Lernschleife und Insights]] | tägliche Auswertung der Zahlen (19:52), Lernstand, Vorschläge mit Freigabe |
| [[Serien und Treffer-Folgen]] | Treffer (ab 3× Median) läuft als nummerierte Serie weiter |
| [[Profil und Follow-Umwandlung]] | 3 Pins, Bio mit Versprechen und Takt, einheitliche Cover |
| [[Kommentare Antwort-Videos und Stitch]] | Antwort-Videos, Kommentare anpinnen, Stitch-Test |
| [[Rolle und Kommunikation]] | Rolle von Claude, Antwortschema, anklickbare Fragen, Rangfolge |
| [[Arbeitsregeln und Sicherheit]] | Nichts ohne Auftrag, öffentliches Repo, Geheimnisse, Recherche |
| [[Kanäle und Ziele]] | beide Kanäle im Überblick, Ziele, Kennzahlen |
| [[CRP Creator Rewards Program]] | Bedingungen, Ausschlüsse, Rechnung |
| [[Plattformregeln und Posting]] | Buffer, Zeiten, Caption, Inhaltsregeln |
| [[Produktion Rhythmus und Modelle]] | 4 Videos pro Tag, Agenten, Modelle |
| [[Render-Dienst Windows-PC]] | Rendern auf dem PC, Messwerte, Einrichtung, Fehler |
| [[Technik und Umgebung]] | Umgebung, Supabase, Netzwerk, Blender, Kosten |
| [[Trend-Radar]] | täglicher Radar, Raster, Telegram; beide Accounts |
| [[Pläne und Kalender]] | Archiv der 30-Tage-Pläne, Trend-Kalender |
| [[Stand und nächste Schritte]] | aktueller Stand, Aufgaben, offene Widersprüche und Punkte |
| [[Entscheidungen Log]] | alle Entscheidungen des Inhabers nach Datum |

## Account 1 `@simulierbar` (`02-Simulierbar`)
**Im Ordner selbst**
| Notiz | Inhalt |
|---|---|
| [[Account Simulierbar Überblick]] | Einstieg: Nische, Abteile, Marke, Ziele |
| [[Regelwerk Simulierbar]] | alle Regeln von Account 1 auf einer Seite |

**`1-Skripterstellung`** (Skill `themen-skript`)
| Notiz | Inhalt |
|---|---|
| [[Themenfindung Simulierbar]] | Themenfelder, Nachfrage, Winkel-Werkzeuge, Formate, „abgenutzt“, Bewertung |
| [[Skriptaufbau Simulierbar]] | Phasen mit Zeiten, Sprache, Selbstprüfung, Beispiel-Gerüst |
| [[Finanzregeln Simulierbar]] | Ausschlussthemen, TikTok-Regeln für Finanzinhalte, Zahlen 2026 |
| [[Zahlen 2027 Simulierbar]] | **neu 10.11.:** Stammdaten für Rechnungen im Jahr 2027, je Zeile Status (beschlossen, geplant, offen) und Quelle |
| [[Finanz-Formulierungen Simulierbar]] | wie wir über Geld sprechen (Modell statt Versprechen) |
| [[Befehl Ideen und Skripte Simulierbar]] | Auftragstexte für Ideen und Skripte (erzeugt aus `tools/chat_befehle.py`) |

**`2-Stimme`** (Skill `stimme-elevenlabs`)
| Notiz | Inhalt |
|---|---|
| [[Stimme ElevenLabs Simulierbar]] | Ben, Textformat, Einstellungen, eine Aufnahme, Aussprache, Credits |
| [[Aussprache Simulierbar]] | **neu 10.11.:** Ausspracheliste `aussprache.json`, Schreibweisen-Muster, Auffälligkeiten aus Aufnahmen |

**`3-Produktion`** (Skill `video-produktion`)
| Notiz | Inhalt |
|---|---|
| [[Videoaufbau Simulierbar]] | Zeitplan im Bild, Dynamik, Dramaturgie und Effekte, Layout, Untertitel |
| [[Stile 17 bis 21]] | alle erlaubten Stile, Qualitätslatte, Wahlregel |
| [[Licht und Atmosphäre Simulierbar]] | Licht, Dunst, Kamera-Regie |
| [[Design und Layout Simulierbar]] | Typografie, HUD-Bausteine, Farben, sichere Zonen |
| [[Klangteppich und Ton Simulierbar]] | Klangteppich, Effekte, Lautheit |
| [[Technik und Szenenbau Simulierbar]] | Dateien, Gerüst, Befehle, Render |
| [[Prüfung und Abnahme Simulierbar]] | `massstab.py`, Prüfliste mit 23 Punkten, Sichtprüfung |

**`9-Archiv`** (nicht mehr maßgeblich)
| Notiz | Inhalt |
|---|---|
| [[Maßstab Simulierbar]] | Messgrundlage der ersten 4 Vorbilder, 12 Gesetze |
| [[Sperrliste und Auswahlregeln Simulierbar]] | alte Sperrliste |
| [[Themenplan Simulierbar]] | alter 30-Tage-Plan |

## Account 2 `@stelldirvor.pov` (`03-stelldirvor-pov`)
**Im Ordner selbst**
| Notiz | Inhalt |
|---|---|
| [[Account stelldirvor.pov Überblick]] | Einstieg: Steckbrief, Abteile, wichtigste Regeln; der Account ist stumm |
| [[Regelwerk Account 2]] | alle Regeln von Account 2 auf einer Seite |
| [[Format Account 2 Lunar]] | das Referenzformat in einem Blick |

**`1-Skripterstellung`** (Skill `themen-skript`)
| Notiz | Inhalt |
|---|---|
| [[Themenfindung stelldirvor]] | Themenfelder, Nachfrage, Winkel-Werkzeuge, gesperrte Klassiker, Bewertung |
| [[Ablauf Account 2]] | Skriptaufbau: 80-s-Zeitplan, Sätze, Anzeige, Abspann |
| [[Themen und Plan Account 2]] | Weltenkatalog, Weltvielfalt, Tagesablauf |
| [[Befehl Ideen und Skripte Account 2]] | Auftragstexte für Ideen und Skripte (erzeugt aus `tools/chat_befehle.py`) |

**`3-Produktion`** (Skill `video-produktion`; ein Abteil `2-Stimme` gibt es nicht)
| Notiz | Inhalt |
|---|---|
| [[Design Account 2]] | Maße, Schrift, Farben (gemessen) |
| [[Licht und Effekte Account 2]] | Licht, Effekte, Kamera, Welt |
| [[Ton Account 2]] | Atmo, Lautheit, `atmo.py` |
| [[Technik und Szenenbau Account 2]] | Baukasten, Gerüst, Render, Posting |
| [[Prüfung und Abnahme Account 2]] | `referenz_pov.py`, Sichtprüfung |

**`9-Archiv`** (nicht mehr maßgeblich)
| Notiz | Inhalt |
|---|---|
| [[Konkurrenz-Check und Sperrliste Account 2]] | alte Sperrliste: Lunar- und US-Themen, deutscher Markt |
| [[Themen und Plan Account 2 (Archiv)]] | alter 30-Tage-Plan, Abstandsregeln, Reserve |

## Recherche (`04-Recherche`)
| Notiz | Inhalt |
|---|---|
| [[Recherche-Methode und Grenzen]] | was erlaubt ist, was TikTok ohne Login zeigt |
| [[REA-Video Methode]] | virale Videos zerlegen (Skill `rea-video`), Mindestzahl, Regelstärken |
| [[REA Simulierbar Regelwerk]] | freigegeben 07.11.: Regeln aus 9 Vorbildern für Account 1 |
| [[REA stelldirvor Regelwerk]] | freigegeben 07.11.: Regeln aus 7 Vorbildern für Account 2 |
| [[REA Übergreifend]] | freigegeben 07.11.: Handwerk, das in beiden Accounts trägt |
| [[Konkurrenz und Themen Simulierbar]] | Nische, Markt, Konkurrenzzahlen von Account 1 |
| [[Simulation-Trendanalyse-2026-11-02]] | Auswertung der „simulation“-Kanäle und Muster |
| [[Themen-Nachfrage]] | **neu 10.11.:** wonach gesucht wird (25 Geld-Cluster, Was-wäre-wenn-Cluster, Wochen-Methode, was TikTok zur Abschlussquote sagt); wird wöchentlich fortgeschrieben |
| [[Ideenlauf 2026-11-10]] | **neu 10.11.:** erster Lauf von `themen-skript`, je 10 Ideen für beide Accounts zur Wahl, was der Lauf am Skill geändert hat |
| [[Wachstum auf 10.000 Follower]] | Tiefenrecherche Follower-Wachstum, Weg zu 10.000 je Account |
| `Insights JJJJ-MM-TT` | tägliche Auswertung der eigenen Zahlen (seit 03.11.) |

## Vorlagen (`05-Vorlagen`)
[[Vorlage Notiz]] · [[Vorlage Entscheidung]] · [[Vorlage Recherche]] · [[Vorlage Video-Projekt]] · [[Vorlage REA-Regelwerk]]

## Farben
[[Farbcode]]: Grün = Account 1, Violett = Account 2, Blau = gemeinsam, Rot = Regelwerk, Türkis = Claude Chat, Pink = Lernschleife.

## Ausbau
Neue Themen als neue Notizen im passenden Ordner und Abteil anlegen, mit Kopf aus [[Vorlage Notiz]], hier verlinken, und den Konto-Tag nie mischen ([[Trennung der Accounts]]).
