---
typ: regel
konto: simulierbar
status: aktuell
datum: 2026-11-09
quelle: CLAUDE.md, .claude/skills/themen-skript/simulierbar.md, .claude/skills/stimme-elevenlabs/SKILL.md, .claude/skills/video-produktion/simulierbar.md, Entscheidungen des Inhabers bis 09.11.2026
tags: [konto/simulierbar, regelwerk, regeln]
cssclasses: [konto-simulierbar, typ-regel]
---

# Regelwerk Simulierbar (Account 1 `@simulierbar`)

Kurzfassung aller Regeln **nur für Account 1**. Gemeinsame Regeln: [[Regelwerk]]. Account 2 hat ein eigenes Regelwerk: [[Regelwerk Account 2]] (nie mischen: [[Trennung der Accounts]]). Einstieg: [[Account Simulierbar Überblick]].

**Stand 09.11.2026.** Ein gültiger Stand; wie er entstanden ist, steht im [[Entscheidungen Log]]. Jede Regel hat ihre Heimat-Notiz in der Spalte „Details“.

## 1. Themen (Abteil `1-Skripterstellung`)
| Regel | Details |
|---|---|
| Nische **Geld in Deutschland**; jedes Video endet mit einem Euro-Ergebnis aus eigener Modellrechnung | [[Themenfindung Simulierbar]] |
| **Nachfrage belegt** (Suchformulierung, Quelle, Datum) und **Winkel** sind Pflicht | [[Themenfindung Simulierbar]] §1, §3, §4 |
| Formate: **Duell, Zeitverlauf, Was bleibt, Lernvideo**; das Duell ist keine Pflicht mehr. Ein Duell nur zwischen echten Alternativen derselben Entscheidung | [[Themenfindung Simulierbar]] §5 |
| Liste „abgenutzt“ nie in der Standardfrage; stark gesuchte Themen (Rente, Steuererklärung, Grundsicherung …) mit neuem Winkel erlaubt; **Parteipolitik ausgeschlossen** | [[Themenfindung Simulierbar]] §6 |
| Originalität: Websuche je Idee, kein deutsches Video zur gleichen Frage | [[Originalität und Themenfindung]] |
| Ausschlussthemen und Finanzregeln (nur Modellrechnung, keine Anbieter) | [[Finanzregeln Simulierbar]] |
| Wie wir über Geld sprechen: Modell statt Versprechen, Bedingung und Annahmen sichtbar, keine FOMO | [[Finanz-Formulierungen Simulierbar]] |
| Treffer (ab 3× Median nach 24 h) laufen als nummerierte Serie weiter | [[Serien und Treffer-Folgen]] |

## 2. Skript (Abteil `1-Skripterstellung`)
| Regel | Details |
|---|---|
| **Aufbau (Standard seit 09.11.):** Hook 0–3 s mit Frage zum Tippen · Zähler laufen ab 3 s, Regeln als Chips · Denkfalle bis ca. 11 s · erste Wendung 12–15 s · danach alle 8–10 s ein Befund, dabei wird die **zweite Frage** gesetzt · Kipp-Moment bei ca. 60–65 % · **Ergebnis bei ca. 75–80 %** · „Warum?“ höchstens 6 s · Pointe löst die zweite Frage auf · Schlusskarte. Höchstens 12 s nach dem Ergebnis | [[Skriptaufbau Simulierbar]] |
| Etwa 150–190 Wörter als grober Richtwert; Sätze meist 4–10 Wörter (Hinweis); neutral erzählt, Du höchstens im Hook; kein „Los geht’s“ | [[Skriptaufbau Simulierbar]] §3 |
| Legitim und belegt, nichts erfunden; Diskussionsanreiz nur implizit; keine künstlichen Cliffhanger | [[Skriptaufbau Simulierbar]] §3 |
| Suchbegriff im ersten Satz, in der Titelfrage und vorn in der Caption | [[Plattformregeln und Posting]] |
| Ende: Schlusskarte mit Fazit oder Pointe; kein fester Schlusssatz, keine Frage, kein gesprochener Aufruf; Schleife freiwillig | [[Skriptaufbau Simulierbar]], [[REA Simulierbar Regelwerk]] |

## 3. Stimme (Abteil `2-Stimme`)
| Regel | Details |
|---|---|
| Ben (ElevenLabs), `eleven_v4`, `language_code` de, Stabilität 0,5, Ähnlichkeit 0,75, ganzes Skript in einer Anfrage | [[Stimme ElevenLabs Simulierbar]] §2 |
| **Textformat:** keine Auslassungspunkte, keine Gedankenstriche als Pause, kein Wort in Großbuchstaben, keine Gefühls-Tags, alles ausgeschrieben, höchstens 3 Ausrufezeichen | [[Stimme ElevenLabs Simulierbar]] §3 |
| **Genau eine Aufnahme je Skript**; eine zweite nur bei hörbarem Fehler der Stimme, einmal. Nach der Aufnahme wird nie gekürzt und neu vertont | [[Stimme ElevenLabs Simulierbar]] §5 |
| **Keine Regel zum Sprechtempo** (seit 09.11.): Das Video folgt der fertigen Stimme (`timing.json`); mindestens 61 s | [[Stimme ElevenLabs Simulierbar]] §1 |
| Ruhig, sachlich, freundlich | [[Stimme ElevenLabs Simulierbar]] §3 |

## 4. Bild und Aufbau (Abteil `3-Produktion`)
| Regel | Details |
|---|---|
| Erstes Bild ohne Ton verständlich: Titelfrage im Bild ab Bild 1, Tafel mit Startwerten ab Bild 0; Bild bei 1,0 s ist das Cover | [[Videoaufbau Simulierbar]] §1 |
| Von der ersten Sekunde fangen, Spannung bis zum Kipp-Moment steigern, nie über 2 s Stillstand, alle 1–2 s etwas Neues | [[Videoaufbau Simulierbar]] §2, §3 |
| Skript und Bild passen exakt zusammen (`bild_text_abgleich`) | [[Videoaufbau Simulierbar]] §4 |
| Mindestens eine Erklärgrafik; laufende Zähler; wichtige Zahlen leuchten auf | [[REA Simulierbar Regelwerk]] |
| Stile 1–15 und 17–21, genau einer je Video, nie zweimal derselbe hintereinander, Wahl mit Begründung; **dunkle Welten mit Leuchtakzenten zuerst**, helle Pastell- und Papier-Stile nur, wenn das Thema sie trägt. Stile ohne Video-Baukasten (5, 7–11, 15) brauchen vor dem Einsatz einen Erstbau | [[Stile 17 bis 21]] |
| **Qualitätslatte:** sauberes Licht und Material, lesbare Typografie, konsistente Farben, keine Billig-Optik; **Stil 18 pausiert seit 10.11.** (Studio-Themen in Stil 19 oder 17) | [[Prüfung und Abnahme Simulierbar]] |
| Mehr Effekte, nichts Übertriebenes; **keine großen Sticker oder Stempel** | [[Licht und Atmosphäre Simulierbar]], [[Design und Layout Simulierbar]] |
| Layout: Mittelachse x = 540, Schutzzone 150 px, nichts Wichtiges unter y ≈ 1500; 1080×1920 | [[Design und Layout Simulierbar]] |
| Zwei Teamfarben je Video, nie Gelb; **Untertitel in Blöcken von 1–4 Wörtern**, Schlüsselwort in der Teamfarbe seiner Seite | [[Design und Layout Simulierbar]] |
| Kein Kanalname, Logo oder Rubrik im Video | [[Trennung der Accounts]] |
| Klangteppich 8–13 dB unter der Stimme, Effekt je Bild-Ereignis, −14 LUFS, nur selbst erzeugte Klänge | [[Klangteppich und Ton Simulierbar]] |
| **Folgen-Hinweis nur im Testblock** (seit 08.11., 10 Videos mit, 10 ohne): nicht gesprochene Textzeile in den letzten 2–3 s unter der Schlusskarte, an den Inhalt gebunden, kein Tausch, keine Belohnung, kein Druck (`tools/testblock.py`, `M.hinweis`, Prüfpunkt 7). Einen Folgen-Aufruf bei ca. 20 s gibt es nicht mehr | [[Lernschleife und Insights]] |

## 5. Prüfung und Posten
| Regel | Details |
|---|---|
| Prüfliste mit **23 Punkten**; `qc/massstab.py` prüft das Messbare, dazu Sichtprüfung am Kontaktbogen | [[Prüfung und Abnahme Simulierbar]] |
| Caption: `Titelfrage? Emoji Ich hab's simuliert. Kommentarfrage? 👇 #t1 #t2 #t3 #wissen #simulation` | [[Plattformregeln und Posting]] |
| Posten über Buffer, Zeiten, `--nachpruefen` | [[Plattformregeln und Posting]] |
| Profil: 3 Pins, Bio mit Versprechen und Takt, einheitliches Cover; Antwort-Videos und Stitch-Test | [[Profil und Follow-Umwandlung]], [[Kommentare Antwort-Videos und Stitch]] |

## 6. Lernen
Täglich 19:52 Auswertung der Zahlen dieses Kontos; Vorschläge nur mit Begründung und nach Freigabe ([[Lernschleife und Insights]]). `skript.json` hält Hook, Format, Stil, Zeitpunkte und Auffälligkeiten der Stimme fest (`lern_notizen`).

## Siehe auch
[[Regelwerk]] · [[Pipeline und Skills]] · [[REA Simulierbar Regelwerk]] · Archiv: [[Maßstab Simulierbar]], [[Themenplan Simulierbar]], [[Sperrliste und Auswahlregeln Simulierbar]] · [[Index]]
