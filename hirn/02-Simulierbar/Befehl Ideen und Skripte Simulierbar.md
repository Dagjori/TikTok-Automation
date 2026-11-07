---
typ: anleitung
konto: simulierbar
status: aktuell
datum: 2026-11-07
quelle: tools/chat_befehle.py
tags: [konto/simulierbar, claude-chat, befehl, skript]
cssclasses: [konto-simulierbar, typ-anleitung]
---

# Befehl Ideen und Skripte Simulierbar

> Diese Notiz wird mit `python3 tools/chat_befehle.py` erzeugt (Textquelle: `tools/chat_befehle.py`). Änderungen am Befehl dort vornehmen, nicht hier. Der **Lernstand** im Befehl wird täglich fortgeschrieben ([[Lernschleife und Insights]]).

Ablauf und Hintergrund: [[Claude-Chat-Workflow]]. Regeln: [[Regelwerk Simulierbar]]. Account **@simulierbar**.

## Standardweg: Ideen-Studio
Im **Ideen-Studio** (Artifact) erzeugst du die Ideen per Klick; Recherche und Skript schreibt die Tages-Sitzung von Claude Code mit demselben Befehl wie Schritt 2 (plus Websuche, `python3 tools/chat_befehle.py --skript-auftrag …`). Ablauf: [[Claude-Chat-Workflow]].

## Notweg von Hand (nur wenn das Studio Claude Code nicht erreicht)
1. Neues Gespräch in Claude Chat öffnen (Websuche an), **Schritt 1** unten einfügen. Du bekommst 10 Ideen.
2. Zwei Ideen wählen (Mittag und Abend des nächsten Tages).
3. **Schritt 2** einfügen, die zwei Ideen einsetzen. Du bekommst zwei Skripte.
4. Beide Skripte in eine Claude-Code-Sitzung einfügen und dazuschreiben, dass sie freigegeben sind. Claude Code prüft jede Zahl, korrigiert Faktenfehler mit Vermerk und baut die Videos.

## Schritt 1: zehn Ideen
```text
ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Simulierbar“ (@simulierbar). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Themen, die viele Menschen betreffen, mit klarem Aha-Moment und einer Zahl, die man sich merkt.

UNSER KANAL
- Nische: „Alltag durchgerechnet“, ab sofort ausschließlich GELD. Jedes Video beantwortet eine Geldfrage mit einer eigenen Modellrechnung und endet mit einem konkreten Ergebnis in Euro.
- Format: gesichtsloses 3D-Simulationsvideo, Deutsch, 65 bis 80 Sekunden, ruhige KI-Stimme („Ben“), meist ein Duell oder Rennen zwischen zwei echten Alternativen derselben Entscheidung mit laufenden Zählern; das Ergebnis kommt spät (bei ca. 80 % der Länge), danach „Warum?“, eine Pointe und eine Schlusskarte mit Fazit.
- Themen dürfen Deutschland, die ganze Welt oder andere Länder betreffen; die Sprache bleibt Deutsch. Wir brauchen Flexibilität und endlos viele spannende Themen.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus Animation, Stimme und Schnitt.

REGELN FÜR IDEEN
- Nur GELD. Das Ergebnis muss in Euro (bzw. passender Währung) ausgedrückt werden können und aus einer eigenen, nachvollziehbaren Modellrechnung stammen.
- Ein Duell vergleicht nur echte Alternativen derselben Entscheidung (kein „Steuererklärung gegen Überstunden“-Unsinn).
- Jede Idee braucht ein Duell, das schon im Hook beide Seiten konkret nennt. Themen ohne natürliche Gegenseite als Duell rahmen (z. B. Kind: Ausgaben gegen Kindergeld schon im Hook), sonst nicht vorschlagen.
- GEWICHTUNG (Pflicht): Mindestens 6 der 10 Ideen sind Duelle zu großen Lebensentscheidungen mit großer Euro-Endzahl (z. B. Studium oder Ausbildung, Mieten oder Kaufen, Auto kaufen oder leasen, Kind, Rente bzw. Vorsorge; auch Wohnen, Arbeit, Familie, Steuern, Energie über Jahre). Die übrigen dürfen andere Geldthemen sein; kleine Alltagstipps nur als Ausnahme (höchstens 1 von 10) und nur, wenn die Jahressumme wirklich überrascht.
- Ausgeschlossen: Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Empfehlungen für Anbieter, Banken, Versicherer oder Broker, Parteipolitik, riskantes Nachahmen, Kaufaufrufe, „schnell reich“.
- Finanzthemen nur als Modellrechnung, nie als Anlageberatung.
- Keine 1:1-Kopie eines fremden Videos: gleiches Thema nur mit eigenem Blickwinkel, eigener Rechnung und eigenen Sätzen.
- Keine Dopplung mit unseren bisherigen Videos.

FAKTENTREUE (gilt für alles, was du lieferst)
- Erfinde nichts. Jede Zahl, jedes Datum, jede Behauptung muss belegbar sein (amtliche Statistik, Gesetz, Studie, Behörden- oder Herstellerangabe). Nenne zu jeder Zahl Quelle und Jahr.
- Kannst du eine Zahl nicht belegen, schreibe „nicht belegt“ und verwende sie nicht. Trägt eine Idee ohne belegbare Zahlen nicht, verwirf sie und sage es offen.
- Alles, was eine Annahme ist (z. B. eine Modellperson), kennzeichne als Annahme und halte sie realistisch und nachvollziehbar.
- Aussagen müssen legitim sein: keine Übertreibung, keine verzerrende Auswahl, keine Panikmache, keine falschen Gegensätze.
- Diskussionsbedarf soll durch die Sache selbst entstehen (zum Beispiel, weil die Antwort der Intuition widerspricht oder von der persönlichen Lage abhängt). Sprich das nie aus: keine Aufforderung zum Streiten oder Meinungsäußern im Text, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- Wenn dir Informationen fehlen, die das Ergebnis verändern, frage mich vorher gebündelt, statt zu raten.

LERNSTAND (aus unseren Zahlen, bitte berücksichtigen)
Startwerte (Recherche 02.11.2026, 50 Videos von 6 Konten, öffentliche Zahlen) und eigene erste Zahlen:
- Treffer (über 100.000 Aufrufe) sind meist Duell-Fragen zu großen Lebensentscheidungen mit großer Euro-Endzahl (Mieten oder Kaufen, Leasing, Studium oder Ausbildung), Länge 67 bis 72 Sekunden.
- Kleine Einzeltipps (Reifendruck, Einkaufskasse, Händewaschen) und sozial- oder politiknahe Geldthemen (Kindergeld, Bürgergeld) erreichen kaum Aufrufe.
- Caption, Hashtag-Zahl und Uhrzeit trennen Treffer nicht vom Rest; das Thema entscheidet. Wer dasselbe Thema später nachmacht, bekommt nur 0,2 bis 5 Prozent des Originals.
- Erste eigene Zahlen (02.11.): durchschnittliche Wiedergabezeit ca. 26 Sekunden bei 66 Sekunden Länge (rund 39 Prozent). Der Lernstand wird täglich aus unseren Zahlen fortgeschrieben.

BISHERIGE VIDEOS (nicht wiederholen):
- GTA 6 weltweit
- Spurwechsel / Reißverschluss
- Treppe oder Aufzug
- 200 € oder 100 € steuerfrei
- Fußgängerampel (Rennen oder Gehen)
- Steuererklärung oder Überstunden

AUFGABE
Wir brauchen zehn Videoideen in unserer Nische für den morgigen Tag. Sie sollen unterschiedlich sein (verschiedene Themenfelder, Länder bzw. Welten) und gleichzeitig zum Lernstand passen. Prüfe jede Idee vor der Ausgabe gegen die Regeln und die Faktenlage; schreibe nur Ideen auf, die du belegen kannst.
Antworte als nummerierte Liste von 1 bis 10. Jede Idee mit den Feldern, die im Beispiel unten stehen, jeweils eine kurze Zeile je Feld. Danach frage mich: „Welche zwei wählst du?“
Felder (Beispiel als JSON, nur zur Orientierung, antworte als lesbaren Text):
{"ideen":[{"nr":1,"titel":"Duell-Frage als Videotitel","alternativen":["Alternative A","Alternative B"],"hook":"erster Satz des Videos: Duell, das beide Alternativen konkret nennt (keine Einzelfrage, kein Ergebnis vorweg)","ergebnis_ansatz":"wie die Rechnung geht und in welcher Größenordnung das Euro-Ergebnis liegt (kein erfundener Wert)","warum_relevant":"wen es betrifft und warum es viele interessiert","diskussion":"warum sich Zuschauer darüber austauschen würden (nur intern, nicht im Video)","daten":"welche belegbaren Quellen/Zahlen verfügbar sind","bildidee":"eine Szene, in der man das Duell sieht","laender":"Deutschland | weltweit | Land","risiko":"Recht, Plattform, Ausschlussthemen: kurz"}]}
```

## Schritt 2: Skripte für die zwei gewählten Ideen
```text
ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Simulierbar“ (@simulierbar). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Themen, die viele Menschen betreffen, mit klarem Aha-Moment und einer Zahl, die man sich merkt.

UNSER KANAL
- Nische: „Alltag durchgerechnet“, ab sofort ausschließlich GELD. Jedes Video beantwortet eine Geldfrage mit einer eigenen Modellrechnung und endet mit einem konkreten Ergebnis in Euro.
- Format: gesichtsloses 3D-Simulationsvideo, Deutsch, 65 bis 80 Sekunden, ruhige KI-Stimme („Ben“), meist ein Duell oder Rennen zwischen zwei echten Alternativen derselben Entscheidung mit laufenden Zählern; das Ergebnis kommt spät (bei ca. 80 % der Länge), danach „Warum?“, eine Pointe und eine Schlusskarte mit Fazit.
- Themen dürfen Deutschland, die ganze Welt oder andere Länder betreffen; die Sprache bleibt Deutsch. Wir brauchen Flexibilität und endlos viele spannende Themen.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus Animation, Stimme und Schnitt.

FAKTENTREUE (gilt für alles, was du lieferst)
- Erfinde nichts. Jede Zahl, jedes Datum, jede Behauptung muss belegbar sein (amtliche Statistik, Gesetz, Studie, Behörden- oder Herstellerangabe). Nenne zu jeder Zahl Quelle und Jahr.
- Kannst du eine Zahl nicht belegen, schreibe „nicht belegt“ und verwende sie nicht. Trägt eine Idee ohne belegbare Zahlen nicht, verwirf sie und sage es offen.
- Alles, was eine Annahme ist (z. B. eine Modellperson), kennzeichne als Annahme und halte sie realistisch und nachvollziehbar.
- Aussagen müssen legitim sein: keine Übertreibung, keine verzerrende Auswahl, keine Panikmache, keine falschen Gegensätze.
- Diskussionsbedarf soll durch die Sache selbst entstehen (zum Beispiel, weil die Antwort der Intuition widerspricht oder von der persönlichen Lage abhängt). Sprich das nie aus: keine Aufforderung zum Streiten oder Meinungsäußern im Text, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- Wenn dir Informationen fehlen, die das Ergebnis verändern, frage mich vorher gebündelt, statt zu raten.

SPANNUNG UND QUALITÄT
- Das Video muss ab der ersten Sekunde fangen und die Spannung bis zum Ergebnis kontinuierlich steigern. Kein Leerlauf, keine Füllsätze.
- Schreibe so, dass sich daraus mehrere unterschiedliche Bildsequenzen, Wendungen und Situationswechsel ergeben (ich baue danach Design und Animation aus deinem Skript). Markiere in den Dramaturgie-Hinweisen, wo die Spannung steigt und welche Momente visuell besonders sein sollten (Zoom, Licht, Aufleuchten).
- Nichts Übertriebenes: lieber ein klarer, sauberer Spannungsbogen als Effekthascherei.

AUFBAU DES SKRIPTS (feste Reihenfolge, genau diese Phasen; Zeiten für ca. 70 Sekunden)
1. hook (0 bis 5 s): Pflicht ist ein Duell im ersten Satz: beide Alternativen bzw. beide Personen konkret nennen und gegeneinanderstellen (z. B. „Einer verdient ab 16, der andere ab 24. Wer hat mit 40 mehr?“). Keine Einzelfrage („Wie viel kostet X wirklich?“), kein vorweggenommenes Ergebnis; ein Du-Szenario nur mit beiden Seiten im Hook. Höchstens 2 kurze Sätze, der erste mit nur 3 bis 4 Wörtern, die Stimme setzt sofort ein. Die Duell-Frage steht ab dem ersten Bild als Titel im Bild (Feld text); das erste Bild muss ohne Ton verständlich sein (beide Seiten, ihre Werte, ein Vergleichszeichen).
2. regeln: die Spielregeln knapp als Mini-Fakten (kurz, mit konkreten Zahlen der Modellperson; im Bild als Chips), nicht lang aufzählen.
3. falle (Denkfalle, bis ca. 16 s): „Klar, …. Oder?“ ruhig, kein „Los geht’s“.
4. rennen: das Duell mit laufender Uhr bzw. Zählern; ruhiger Erzähler, kein Sportreporter; mindestens eine Zahl je 10 Sekunden.
5. wendung1 (bei 18 bis 25 s), danach alle 8 bis 10 s eine weitere Wendung oder ein Führungswechsel (wendung2 …); insgesamt 4 bis 5 Wendepunkte, die Führung kippt mindestens einmal sichtbar.
6. kipp (Höhepunkt, bei ca. 45 s): der Moment, in dem das Duell kippt; die Spannung ist am höchsten, das Ergebnis noch offen.
7. ergebnis (erst bei ca. 80 % der Länge, bei 70 s also ca. 55 bis 58 s): exakte Euro-Zahl, dann
8. warum: höchstens zwei Faktoren, kurz,
9. pointe: eine überraschende Einordnung bzw. zweite Überraschung,
10. schlusskarte (letzte 2 bis 3 s): ein kurzes Fazit oder die Pointe in einem Satz, der zugleich als Karte im Bild steht. Keine Frage, kein Aufruf.
Kein Schlusssatz mit Aufforderung und kein Folgen-Aufruf; die Kommentarfrage steht nur in der Caption. Nur wenn mein Auftrag es ausdrücklich verlangt: folgen bei ca. 20 s, höchstens 2 s, genau „Folg mir, damit du nichts verpasst.“
Länge: 150 bis 190 gesprochene Wörter (ca. 65 bis 80 Sekunden bei flüssigem Tempo von 2,3 bis 2,7 Wörtern pro Sekunde). Es muss natürlich und flüssig klingen: lieber kürzen als hetzen. Sätze meist 3 bis 5 Wörter. Erzählhaltung neutral: Du-Ansprache höchstens im Hook, danach neutral formulieren („Wer wechselt, wird doppelt so lange überholt.“ statt „Du wirst …“). Zahlen im Sprechtext gerundet (im Bild exakt).

REGIE-TEXT FÜR DIE STIMME (ElevenLabs „Ben“, Modell v4) — so schreiben, dass die Stimme Tonfall und Betonung perfekt umsetzt
- Ruhig, sachlich, freundlich, sauber ausgesprochen; Erzähler wie in einer guten Wissenssendung.
- Eine Zeile pro Satz; Leerzeile zwischen den Phasen.
- Pausen steuern Satzzeichen: Punkt, Zeilenumbruch, Gedankenstrich „ – “. Zögern oder Spannung: Auslassungspunkte „…“. Keine <break>-Tags (v4 kennt sie nicht).
- Betonung: höchstens EIN großgeschriebenes Wort pro Satz, nur auf dem Wort, das die Spannung trägt („Jetzt wird’s KNAPP.“).
- Haltung: ruhige Tags wie [curious], [thoughtful], [calm], sparsam (höchstens ein Gefühls-Tag je Phase). Verboten: [excited], [shouting], [energetic] und alles Aufgeregte.
- Höchstens 3 Ausrufezeichen im ganzen Skript. Kein „Los geht’s“. Kein Geschrei.
- Fragen mit Fragezeichen; eine kurze Frage darf allein auf einer Zeile stehen („Oder?“).
- Im Sprechtext Zahlen ausschreiben („tausendzweihundert Euro“), englische Wörter in Lautschrift („G T A sechs“). Im Untertitel-Text dürfen Ziffern stehen.
- Countdowns als Satzfetzen mit Kommas: „Fünfzehn Kilometer, dreizehn, zwölf, zehn.“
- Tempo nie künstlich erhöhen; es entsteht durch Satzlänge und Textmenge.

CAPTION (nicht im Video, nur Beschreibung)
Genau eine Zeile: Hook-Frage mit Suchbegriff? Emoji Ich hab’s simuliert. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation
Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral, keine Quellen, keine Hinweise wie „keine Anlageberatung“.

LERNSTAND (aus unseren Zahlen, bitte berücksichtigen)
Startwerte (Recherche 02.11.2026, 50 Videos von 6 Konten, öffentliche Zahlen) und eigene erste Zahlen:
- Treffer (über 100.000 Aufrufe) sind meist Duell-Fragen zu großen Lebensentscheidungen mit großer Euro-Endzahl (Mieten oder Kaufen, Leasing, Studium oder Ausbildung), Länge 67 bis 72 Sekunden.
- Kleine Einzeltipps (Reifendruck, Einkaufskasse, Händewaschen) und sozial- oder politiknahe Geldthemen (Kindergeld, Bürgergeld) erreichen kaum Aufrufe.
- Caption, Hashtag-Zahl und Uhrzeit trennen Treffer nicht vom Rest; das Thema entscheidet. Wer dasselbe Thema später nachmacht, bekommt nur 0,2 bis 5 Prozent des Originals.
- Erste eigene Zahlen (02.11.): durchschnittliche Wiedergabezeit ca. 26 Sekunden bei 66 Sekunden Länge (rund 39 Prozent). Der Lernstand wird täglich aus unseren Zahlen fortgeschrieben.

GEWÄHLTE IDEEN (für diese schreibst du jetzt je ein makelloses Skript)
[Hier die zwei gewählten Ideen einfügen (Titel und Felder aus Schritt 1)]

AUFGABE
Schreibe für jede gewählte Idee ein makelloses, sendefertiges Skript nach allen Regeln oben. Erfinde nichts; jede Zahl mit Rechenweg und Quelle. Prüfe dein Skript am Ende selbst (Wortzahl bzw. Satzzahl, Fakten, Ton, Verbote) und trage das Ergebnis in selbstpruefung ein. Findest du beim Prüfen einen Fehler, korrigiere ihn vor der Ausgabe.
Gib je Idee das Skript lesbar aus: Titel, Segmente mit Text und Sprechtext (bzw. Sätze und Anzeige-Plan), Rechenweg, Annahmen, Quellen, Caption, Dramaturgie-Hinweise, Selbstprüfung. Feldstruktur zur Orientierung:
{"skripte":[{"nr":1,"titel":"","thema":"","laender":"","segmente":[{"id":"hook","phase":"hook","text":"Untertitel-Text (Ziffern erlaubt)","sprechtext":"Regie-Text, eine Zeile pro Satz"}],"woerter":0,"rechenweg":"Formel, Eingaben, Rechenschritte, Ergebnis","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","dramaturgie":["Hinweis mit Zeitpunkt"],"selbstpruefung":["Wortzahl ..","Fakten ..","Ton ..","Verbote .."]}]}
```

## Siehe auch
[[Claude-Chat-Workflow]] · [[Lernschleife und Insights]] · [[Regelwerk]] · [[Index]]
