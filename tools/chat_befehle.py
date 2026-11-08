#!/usr/bin/env python3
"""Befehle an Claude Chat: 10 Videoideen und danach makellose Skripte, je Account.

Einzige Textquelle für (1) die Hirn-Notizen „Befehl Ideen und Skripte …“ und (2) das Ideen-Studio (Artifact).
Aufruf:  python3 tools/chat_befehle.py            schreibt beide Hirn-Notizen und docs/ideen-studio/befehle.json
Der LERNSTAND wird täglich aus den Buffer-Zahlen fortgeschrieben (Notiz „Lernschleife und Insights“) und im
Ideen-Studio aus der Datenbank gelesen; hier steht nur der Startwert.
"""
import json
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
DATUM = "2026-11-08"

# ---------------------------------------------------------------- gemeinsame Blöcke
FAKTEN = """FAKTENTREUE (gilt für alles, was du lieferst)
- Erfinde nichts. Jede Zahl, jedes Datum, jede Behauptung muss belegbar sein (amtliche Statistik, Gesetz, Studie, Behörden- oder Herstellerangabe). Nenne zu jeder Zahl Quelle und Jahr.
- Kannst du eine Zahl nicht belegen, schreibe „nicht belegt“ und verwende sie nicht. Trägt eine Idee ohne belegbare Zahlen nicht, verwirf sie und sage es offen.
- Alles, was eine Annahme ist (z. B. eine Modellperson), kennzeichne als Annahme und halte sie realistisch und nachvollziehbar.
- Aussagen müssen legitim sein: keine Übertreibung, keine verzerrende Auswahl, keine Panikmache, keine falschen Gegensätze.
- Diskussionsbedarf soll durch die Sache selbst entstehen (zum Beispiel, weil die Antwort der Intuition widerspricht oder von der persönlichen Lage abhängt). Sprich das nie aus: keine Aufforderung zum Streiten oder Meinungsäußern im Text, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- Wenn dir Informationen fehlen, die das Ergebnis verändern, frage mich vorher gebündelt, statt zu raten."""

SPANNUNG = """SPANNUNG UND QUALITÄT
- Das Video muss ab der ersten Sekunde fangen und die Spannung bis zum Ergebnis kontinuierlich steigern. Kein Leerlauf, keine Füllsätze.
- Schreibe so, dass sich daraus mehrere unterschiedliche Bildsequenzen, Wendungen und Situationswechsel ergeben (ich baue danach Design und Animation aus deinem Skript). Markiere in den Dramaturgie-Hinweisen, wo die Spannung steigt und welche Momente visuell besonders sein sollten (Zoom, Licht, Aufleuchten).
- Nichts Übertriebenes: lieber ein klarer, sauberer Spannungsbogen als Effekthascherei."""

ORIGINAL = """ORIGINALITÄT (wichtigste Regel für Ideen; Vorrang vor dem Lernstand und vor allen Beispielen)
Andere Creator fragen dieselbe KI mit ähnlichen Befehlen. Was dir als Erstes einfällt, haben sie auch bekommen, und genau das wollen wir nicht. Wir wollen Themen, die auf Deutsch noch niemand gemacht hat.
1. Schreibe zuerst für dich die 20 naheliegendsten Ideen zu unserer Nische auf und streiche sie alle, dazu alles von der ANTI-LISTE unten (auch umbenannt oder mit anderen Zahlen). Nenne die gestrichenen Ideen in Stichworten (Feld "gestrichen").
2. Baue mindestens 6 der 10 Ideen auf den ZUTATEN DES TAGES auf (Feld "zutat"), jede Zutat höchstens zweimal. Eine Zutat ist ein Ausgangspunkt, kein Zwang; passt eine gar nicht, lass sie weg.
3. Prüfe jede Idee mit der Websuche: Gibt es auf Deutsch schon ein Video zur gleichen Frage (TikTok, YouTube, Instagram)? Suche mit 2 bis 3 deutschen Begriffen. Gefunden: Idee verwerfen und ersetzen. Englische Videos zur gleichen Frage sind erlaubt, wenn unsere Fassung eigenständig ist. Trage im Feld "originalitaet" ein: welche naheliegende Idee du damit vermeidest, die Suchbegriffe und das Ergebnis („kein deutsches Video gefunden“ oder „englisch: …“). Hast du keine Websuche, schreibe „ungeprüft“.
4. Einzigartig UND relevant, beides ist Pflicht: ein ungewöhnlicher Winkel auf etwas, das viele kennen oder betrifft. Die Frage muss ohne Erklärung verständlich sein. Abseitige Nischen fallen genauso raus wie Standardthemen.
5. Zwei Ideen, die sich nur im Zahlenwert oder im Ort unterscheiden, zählen als eine. Der Lernstand sagt, welche Art Thema trägt, nicht welches konkrete Thema du nehmen sollst.
6. WÜRDE MAN DAS JEMANDEM SCHICKEN? Jede Idee muss so sein, dass man das Video einer bestimmten Person weiterschicken würde (Freundin, Kollege, Eltern, Mitbewohner), weil es sie betrifft oder überrascht. Nenne im Feld "weiterschicken", wem und warum. Ideen, die man nur allein anschaut, fallen raus. (Unser einziger Treffer war das einzige Video mit nennenswert vielen Shares.)
7. Ausnahme Folgeteile: Ein nummerierter Folgeteil eines eigenen Treffers (Teil 2, 3 …: gleiches Versprechen, neue Rechnung bzw. neues Szenario) ist von BISHERIGE VIDEOS und der ANTI-LISTE ausgenommen. Solche Folgeteile legt das Cockpit selbst an, wenn ein Video ein Treffer war; schlage du keine eigenen vor."""

SUCHBEGRIFF = """SUCHBEGRIFF
Jede Idee nennt im Feld "suchbegriff" das Wort, das jemand in die TikTok-Suche tippen würde (z. B. „Studium“, „Pfand“, „Mond“, „Golfstrom“). Es steht in der Titelfrage, möglichst vorn, und später vorn in der Caption. Kein Kunstwort, keine Zahl allein."""

ZUTATEN_KOPF = """ZUTATEN DES TAGES (zufällig gezogen, damit unsere Ideen sich von denen anderer unterscheiden)
{{ZUTATEN}}"""

# ---------------------------------------------------------------- Account 1
A1_ROLLE = """ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Simulierbar“ (@simulierbar). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Themen, die viele Menschen betreffen, mit klarem Aha-Moment und einer Zahl, die man sich merkt.

UNSER KANAL
- Nische: „Alltag durchgerechnet“, ab sofort ausschließlich GELD. Jedes Video beantwortet eine Geldfrage mit einer eigenen Modellrechnung und endet mit einem konkreten Ergebnis in Euro.
- Format: gesichtsloses 3D-Simulationsvideo, Deutsch, 65 bis 80 Sekunden, ruhige KI-Stimme („Ben“), meist ein Duell oder Rennen zwischen zwei echten Alternativen derselben Entscheidung mit laufenden Zählern; das Ergebnis kommt spät (bei ca. 80 % der Länge), danach „Warum?“, eine Pointe und eine Schlusskarte mit Fazit.
- Themen dürfen Deutschland, die ganze Welt oder andere Länder betreffen; die Sprache bleibt Deutsch. Wir brauchen Flexibilität und endlos viele spannende Themen.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus Animation, Stimme und Schnitt."""

A1_REGELN_IDEEN = """REGELN FÜR IDEEN
- Nur GELD. Das Ergebnis muss in Euro (bzw. passender Währung) ausgedrückt werden können und aus einer eigenen, nachvollziehbaren Modellrechnung stammen.
- Ein Duell vergleicht nur echte Alternativen derselben Entscheidung (kein „Steuererklärung gegen Überstunden“-Unsinn).
- Jede Idee braucht ein Duell, das schon im Hook beide Seiten konkret nennt. Themen ohne natürliche Gegenseite als Duell rahmen (z. B. ein Ding gegen seinen Ersatz, damals gegen heute, Deutschland gegen ein anderes Land), sonst nicht vorschlagen.
- Eine große, überraschende Euro-Endzahl ist Pflicht (Jahres-, Jahrzehnt- oder Lebenssumme oder ein Betrag, den niemand erwartet).
- THEMENFELDER (Pflicht): Verteile die 10 Ideen auf diese Felder, jedes der Felder 1 bis 4 mindestens einmal (Feld "feld"):
  1. Versteckte Mechaniken: wo Geld unbemerkt fließt (Shrinkflation, Pfand, Rundungen, Grundgebühren, Mindestbestellwerte, Kündigungsfristen, Kleingedrucktes).
  2. Geschichte und Kurioses: was etwas früher in heutigem Geld oder in Arbeitszeit kostete, kuriose Gesetze und Gebühren, Preise berühmter Dinge, Rekorde in Euro.
  3. Geld hinter den Dingen: was ein Feuerwerk, ein Stadionrasen, eine Ampel oder ein Leuchtturm kostet, was ein seltener Beruf verdient; als Duell gerechnet.
  4. Länder-Duelle: dieselbe Entscheidung in Deutschland gegen ein anderes Land (Gesetz, Preis, Steuer, Gewohnheit) mit Euro-Ergebnis.
  5. Ungewöhnliche Lebensentscheidungen: echte Entscheidungen, die selten durchgerechnet werden.
- KLASSIKER (Mieten oder Kaufen, Studium oder Ausbildung, Leasing oder Kauf, Rente bzw. Vorsorge, Kind): bis zu 3 von 10, jeweils mit eigenem Blickwinkel bzw. einer Frage, die auf Deutsch noch niemand gestellt hat (eine neue eigene Rechnung zu einem bekannten Thema ist erlaubt, die bekannte Standardfrage nicht). Feld "feld" dann „Klassiker mit neuer Frage“. Grund: Unser einziger Treffer war ein Klassiker mit eigener Frage. Kleine Alltagstipps nur als Ausnahme (höchstens 1 von 10) und nur, wenn die Jahressumme wirklich überrascht.
- Ausgeschlossen: Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Empfehlungen für Anbieter, Banken, Versicherer oder Broker, Parteipolitik, riskantes Nachahmen, Kaufaufrufe, „schnell reich“.
- Finanzthemen nur als Modellrechnung, nie als Anlageberatung.
- Kein Thema, zu dem es auf Deutsch schon ein Video mit der gleichen Frage gibt (Regel ORIGINALITÄT). Von englischen Videos nie Skript, Sätze, Bild- oder Szenenideen übernehmen.
- Keine Dopplung mit unseren bisherigen Videos."""

A1_ANTI = """ANTI-LISTE (auf Deutsch schon gemacht oder KI-Standard; nie vorschlagen, auch nicht umbenannt)
Ausnahme: Die fünf KLASSIKER (Mieten oder Kaufen, Studium oder Ausbildung, Leasing, Rente bzw. Vorsorge, Kind) sind mit einer neuen eigenen Frage erlaubt (bis 3 von 10, Regel KLASSIKER oben); in ihrer bekannten Standardfrage bleiben sie gesperrt.
Mieten oder Kaufen · Studium oder Ausbildung · Leasen, Finanzieren oder bar · Neuwagen oder Gebrauchter · E-Auto oder Verbrenner · Auto, Fahrrad oder Deutschlandticket · Bahn, Auto oder Flugzeug · Fenster auf oder Klimaanlage · Spülmaschine oder Handspülen · Duschen oder Baden · Trockner oder Wäscheleine · Wasserkocher oder Herd · Standby-Kosten · LED oder Glühbirne · Heizung nachts aus bzw. 1 Grad weniger · Wärmepumpe oder Gasheizung · Solaranlage, Balkonkraftwerk, Speicher · Tanken vor 12 bzw. Umweg zur Tankstelle · Reifendruck, Tempo 130 gegen 160, Ganzjahresreifen · früh sparen, Zinseszins, erste Million, Inflation frisst Erspartes, 1 Cent verdoppeln · Kaffee to go oder Kaffeemaschine, Latte-Faktor · Mittagessen mitnehmen oder kaufen · Kochen oder Lieferdienst · Leitungs- oder Flaschenwasser · Streaming-Abos · Handyvertrag oder Prepaid, Handy auf Raten · Fitnessstudio oder draußen trainieren · Hund oder Katze · Kindergeld, was ein Kind kostet · Bürgergeld, lohnt sich Arbeiten · Steuererklärung machen oder nicht · Überstunden oder Freizeit · Jobwechsel oder Gehaltserhöhung · Teilzeit, 4-Tage-Woche · Pendeln oder umziehen, Homeoffice · Rente mit 63 oder 67 · Black Friday · Regen: rennen oder gehen · Pausen oder Tempo auf der Autobahn"""

A1_ZUTATEN = [
    ("Gesetz, Gebühr oder Statistik", ["Pfandverordnung", "Rundfunkbeitrag", "Hundesteuer", "Kurtaxe", "Bußgeldkatalog", "Briefporto seit 1950", "Grundsteuer", "Kirchensteuer", "Parkgebühren", "Zoll-Freimengen", "Fluggastrechte", "Mindestlohn seit 2015", "Preisangabenverordnung", "Lkw-Maut", "Müllgebühren", "Wasserpreise je Stadt", "Notarkosten", "Bargeldgebühren", "Mehrwertsteuer 7 oder 19 Prozent", "Schaumweinsteuer", "Kaffeesteuer", "Ladenöffnungszeiten", "Biersteuer", "Feuerwerksverkauf nur drei Tage"]),
    ("Ding", ["Feuerwerk", "Weihnachtsbaum", "Stadionrasen", "Ampel", "Straßenlaterne", "Leuchtturm", "Rolltreppe", "Brötchen", "Briefmarke", "Pfandflasche", "Einkaufswagen", "Parkuhr", "Kirchenglocke", "Schulbus", "Fußball", "Zahnbürste", "Regenschirm", "Kaugummi", "Kinokarte", "Glühwein", "Konzertticket", "Schlüsseldienst", "Bahnhofstoilette", "Adventskalender"]),
    ("Beruf", ["Schornsteinfeger", "Lotse", "Fluglotse", "Hufschmied", "Orgelbauer", "Imker", "Schleusenwärter", "Berufstaucher", "Schäfer", "Pilot", "Hebamme", "Winzer", "Bergführer", "Zugbegleiter", "Eisverkäufer", "Glockengießer", "Tätowierer", "Kapitän", "Synchronsprecher", "Schiedsrichter"]),
    ("Land", ["Japan", "Norwegen", "Schweiz", "USA", "Dänemark", "Singapur", "Island", "Polen", "Portugal", "Kanada", "Australien", "Südkorea", "Niederlande", "Österreich", "Italien", "Mexiko", "Finnland", "Frankreich"]),
    ("Zeit", ["1950", "1965", "1980", "1990", "2001, letztes D-Mark-Jahr", "2002, Euro-Einführung", "Mittelalter", "Römerzeit", "Kaiserreich um 1900", "2035, in die Zukunft gerechnet"]),
    ("Mechanik", ["Rundung", "Mindestbestellwert", "Staffelpreis", "Grundgebühr", "Kündigungsfrist", "Packungsgröße", "Pfand", "Bonuspunkte", "Gebühr je Vorgang", "Mengenrabatt", "Mindesthaltbarkeit", "Aufrunden an der Kasse", "Wechselkurs-Aufschlag", "automatische Abo-Verlängerung", "Inflation pro Jahr", "Zinstage"]),
]

A1_FORMAT_SKRIPT = """AUFBAU DES SKRIPTS (feste Reihenfolge, genau diese Phasen; Zeiten für ca. 70 Sekunden)
1. hook (0 bis 5 s): Pflicht ist ein Duell im ersten Satz: beide Alternativen bzw. beide Personen konkret nennen und gegeneinanderstellen (z. B. „Einer verdient ab 16, der andere ab 24. Wer hat mit 40 mehr?“). Keine Einzelfrage („Wie viel kostet X wirklich?“), kein vorweggenommenes Ergebnis; ein Du-Szenario nur mit beiden Seiten im Hook. Höchstens 2 kurze Sätze, der erste mit nur 3 bis 4 Wörtern, die Stimme setzt sofort ein. Die Duell-Frage steht ab dem ersten Bild als Titel im Bild (Feld text) und enthält den Suchbegriff (Feld suchbegriff); das erste Bild muss ohne Ton verständlich sein (beide Seiten, ihre Werte, ein Vergleichszeichen). Dieses Bild ist zugleich das Cover im Profil.
2. regeln: die Spielregeln knapp als Mini-Fakten (kurz, mit konkreten Zahlen der Modellperson; im Bild als Chips), nicht lang aufzählen.
3. falle (Denkfalle, bis ca. 16 s): „Klar, …. Oder?“ ruhig, kein „Los geht’s“.
4. rennen: das Duell mit laufender Uhr bzw. Zählern; ruhiger Erzähler, kein Sportreporter; mindestens eine Zahl je 10 Sekunden.
5. wendung1 (bei 18 bis 25 s), danach alle 8 bis 10 s eine weitere Wendung oder ein Führungswechsel (wendung2 …); insgesamt 4 bis 5 Wendepunkte, die Führung kippt mindestens einmal sichtbar.
6. kipp (Höhepunkt, bei ca. 45 s): der Moment, in dem das Duell kippt; die Spannung ist am höchsten, das Ergebnis noch offen.
7. ergebnis (erst bei ca. 80 % der Länge, bei 70 s also ca. 55 bis 58 s): exakte Euro-Zahl, dann
8. warum: höchstens zwei Faktoren, kurz,
9. pointe: eine überraschende Einordnung bzw. zweite Überraschung,
10. schlusskarte (letzte 2 bis 3 s): ein kurzes Fazit oder die Pointe in einem Satz, der zugleich als Karte im Bild steht. Keine Frage, kein Aufruf.
Kein Schlusssatz mit Aufforderung und kein gesprochener Folgen-Aufruf; die Kommentarfrage steht nur in der Caption. Schreibe zusätzlich im Feld folgen_hinweis eine kurze Textzeile (höchstens 8 Wörter), die nicht gesprochen wird und nur in Testvideos unter der Schlusskarte steht: an den Inhalt gebunden („Teil 2 ist im Profil“, „Jeden Tag ein Geld-Duell im Profil“), kein Tausch, keine Belohnung, kein Druck, kein „Folg mir“. Ob sie ins Video kommt, entscheidet der Testblock.
Länge: 150 bis 190 gesprochene Wörter (ca. 65 bis 80 Sekunden bei flüssigem Tempo von 2,3 bis 2,7 Wörtern pro Sekunde). Es muss natürlich und flüssig klingen: lieber kürzen als hetzen. Sätze meist 3 bis 5 Wörter. Erzählhaltung neutral: Du-Ansprache höchstens im Hook, danach neutral formulieren („Wer wechselt, wird doppelt so lange überholt.“ statt „Du wirst …“). Zahlen im Sprechtext gerundet (im Bild exakt)."""

A1_STIMME = """REGIE-TEXT FÜR DIE STIMME (ElevenLabs „Ben“, Modell v4) — so schreiben, dass die Stimme Tonfall und Betonung perfekt umsetzt
- Ruhig, sachlich, freundlich, sauber ausgesprochen; Erzähler wie in einer guten Wissenssendung.
- Eine Zeile pro Satz; Leerzeile zwischen den Phasen.
- Pausen steuern Satzzeichen: Punkt, Zeilenumbruch, Gedankenstrich „ – “. Zögern oder Spannung: Auslassungspunkte „…“. Keine <break>-Tags (v4 kennt sie nicht).
- Betonung: höchstens EIN großgeschriebenes Wort pro Satz, nur auf dem Wort, das die Spannung trägt („Jetzt wird’s KNAPP.“).
- Haltung: ruhige Tags wie [curious], [thoughtful], [calm], sparsam (höchstens ein Gefühls-Tag je Phase). Verboten: [excited], [shouting], [energetic] und alles Aufgeregte.
- Höchstens 3 Ausrufezeichen im ganzen Skript. Kein „Los geht’s“. Kein Geschrei.
- Fragen mit Fragezeichen; eine kurze Frage darf allein auf einer Zeile stehen („Oder?“).
- Im Sprechtext Zahlen ausschreiben („tausendzweihundert Euro“), englische Wörter in Lautschrift („G T A sechs“). Im Untertitel-Text dürfen Ziffern stehen.
- Countdowns als Satzfetzen mit Kommas: „Fünfzehn Kilometer, dreizehn, zwölf, zehn.“
- Tempo nie künstlich erhöhen; es entsteht durch Satzlänge und Textmenge."""

A1_CAPTION = """CAPTION (nicht im Video, nur Beschreibung)
Genau eine Zeile: Hook-Frage mit Suchbegriff? Emoji Ich hab’s simuliert. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation
Der Suchbegriff steht vorn in der Hook-Frage (dasselbe Wort wie in der Titelfrage im Bild). Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral, keine Quellen, keine Hinweise wie „keine Anlageberatung“."""

A1_IDEEN_JSON = """{"gestrichen":["naheliegende Idee in Stichworten"],"ideen":[{"nr":1,"titel":"Duell-Frage als Videotitel","feld":"Versteckte Mechaniken | Geschichte und Kurioses | Geld hinter den Dingen | Länder-Duell | Ungewöhnliche Lebensentscheidung | Klassiker mit neuer Frage","zutat":"welche Zutat des Tages (oder „keine“)","originalitaet":"vermeidet: naheliegende Idee · Suche: Begriffe · Ergebnis: kein deutsches Video gefunden | englisch: … | ungeprüft","alternativen":["Alternative A","Alternative B"],"suchbegriff":"Wort für die TikTok-Suche, steht in der Titelfrage","hook":"erster Satz des Videos: Duell, das beide Alternativen konkret nennt (keine Einzelfrage, kein Ergebnis vorweg)","ergebnis_ansatz":"wie die Rechnung geht und in welcher Größenordnung das Euro-Ergebnis liegt (kein erfundener Wert)","warum_relevant":"wen es betrifft und warum es viele interessiert","weiterschicken":"wem man das Video schicken würde und warum","diskussion":"warum sich Zuschauer darüber austauschen würden (nur intern, nicht im Video)","daten":"welche belegbaren Quellen/Zahlen verfügbar sind","bildidee":"eine Szene, in der man das Duell sieht","laender":"Deutschland | weltweit | Land","risiko":"Recht, Plattform, Ausschlussthemen: kurz"}]}"""

A1_SKRIPT_JSON = """{"skripte":[{"nr":1,"titel":"","thema":"","laender":"","suchbegriff":"","folgen_hinweis":"kurze, nicht gesprochene Textzeile für Testvideos","teil":1,"segmente":[{"id":"hook","phase":"hook","text":"Untertitel-Text (Ziffern erlaubt)","sprechtext":"Regie-Text, eine Zeile pro Satz"}],"woerter":0,"rechenweg":"Formel, Eingaben, Rechenschritte, Ergebnis","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","originalitaet":"Suche (deutsch) und Ergebnis","dramaturgie":["Hinweis mit Zeitpunkt"],"selbstpruefung":["Wortzahl ..","Fakten ..","Ton ..","Verbote .."]}]}"""

# ---------------------------------------------------------------- Account 2
A2_ROLLE = """ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Stell dir vor“ (@stelldirvor.pov). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Gedankenexperimente, die jeder sofort verstehen will, mit einer messbaren Größe, die man beim Zuschauen wachsen sieht.

UNSER KANAL
- Format: „Was wäre, wenn …“ als 3D-POV-Zeitraffer ohne Stimme, 80 Sekunden. Der Zuschauer sieht das Ereignis aus der Ich-Perspektive. Es gibt nur drei Textebenen: eine Titelfrage am Anfang, links eine laufende Messwert-Anzeige (Zahl mit Etikett, z. B. Temperatur, Pegel, Jahr, die bis zu einem Höhepunkt mit „HIER“ läuft) und kurze kursive Sätze. Am Ende ein dunkler Abspann mit Titelfrage und Faktenzeile. Ton ist nur Atmo und Sounddesign.
- Themen: spannende Gedankenexperimente mit messbarer Größe und einem Ereignis, das man von einem Standpunkt aus wachsen sieht (Wissenschaft, Natur, Geografie, Geschichte, Technik …). Die Orte dürfen überall liegen: Deutschland, weltweit, andere Länder. Wir brauchen Flexibilität und endlos viele spannende Themen; Sprache ist Deutsch. Auch Themen mit „in 5 Sekunden“-Rahmen sind erlaubt, wenn sie sich gut zeigen lassen.
- WELT UND BEWEGUNG (wichtig): Die Welt passt zum Thema. Bevorzuge oft Natur (Meer, Küste, Strand, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe); Städte nur, wenn sie wirklich passen. Variiere Ort, Tageszeit (Tag, Sonnenauf- und -untergang, Nacht) und Standpunkt (nicht immer „von oben aus dem Fenster“: Strandblick aufs Meer, Bootsdeck, Waldlichtung, Gipfel, Straße, Dünen, Eisfläche …). Es darf nie „gewartet“ werden: Im Zeitraffer muss alle paar Sekunden etwas Sichtbares passieren (Licht, Wetter, Wasser, Vegetation, Menschen, Tiere, Fahrzeuge), und die Messwert-Anzeige muss zur sichtbaren Veränderung passen.
- Die Kamera darf sich langsam bewegen (weiche Fahrt, Schwenk, Zoom); sonst lange durchgehende Einstellungen. Erlaubt sind höchstens 1 bis 3 gezielte harte Schnitte, nur am Höhepunkt oder bei einem Maßstabs- bzw. Szenensprung.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus die 3D-Szene."""

A2_REGELN_IDEEN = """REGELN FÜR IDEEN
- Ein einziges Ereignis, das man von einem festen Standpunkt aus wachsen sieht, mit einer messbaren Größe für die Anzeige (z. B. Temperatur, Wasserstand, Entfernung, Höhe, Jahr, Anzahl).
- Abwechslung: Verschiedene Welten, Standpunkte, Tageszeiten und Themenfelder; nie zwei gleiche Welttypen hintereinander. Natur ausdrücklich bedenken.
- Ohne Opferdarstellung, ohne Gore, ohne reale Tragödien; Katastrophen enden sachlich.
- THEMENFELDER (Feld "feld"): jedes der Felder 1 bis 3 mindestens einmal unter den 10 Ideen.
  1. Natur und Tiere: Tierwanderungen, Pflanzen, Meeresströmungen, ein Ökosystem kippt oder wächst (ohne Gore).
  2. Geschichte umgedreht: ein echter historischer Ort oder Moment, an dem eine Größe anders ist; keine reale Tragödie, keine Opfer.
  3. Technik und Versorgung: Strom, Wasser, Kühlung, Kabel, Satelliten oder Lieferketten an einem konkreten Ort (nicht der weltweite Blackout).
  4. Physik, Wetter, Geografie, Weltraum mit eigener Prämisse (nichts von der ANTI-LISTE).
- MASSSTAB meist persönlich: Mindestens 6 der 10 Ideen spielen an einem greifbaren Ort (Strand, Garten, Straße, Boot, Hütte …) mit einer Skala, die man sich vorstellen kann; höchstens 4 sind global oder kosmisch, auch dann aus der Ich-Perspektive.
- Kein Thema, zu dem es auf Deutsch schon ein Video mit der gleichen Prämisse gibt (Regel ORIGINALITÄT). Englische Vorbilder sind erlaubt, wenn sie nicht auf der ANTI-LISTE stehen, aber nur mit eigenem Skript und deutlich anderem Design (anderer Ort, andere Dramaturgie).
- Keine Dopplung mit unseren bisherigen Videos.
- Die Idee muss sich visuell tragen: Beschreibe, was sich in der Welt jede Phase sichtbar verändert."""

A2_ANTI = """ANTI-LISTE (die großen Was-wäre-wenn-Klassiker, gesperrt; nie vorschlagen, auch nicht umbenannt oder an anderem Ort)
Sonne explodiert, verschwindet oder ist kurz weg · Erde hört auf sich zu drehen, dreht schneller oder kreist nicht mehr · Mond stürzt ab, verschwindet, kommt näher oder ist aus Käse bzw. Schokolade · Asteroid oder Komet schlägt ein · Sauerstoff, Atmosphäre oder Schwerkraft ist für Sekunden weg · Riesen-Tsunami bzw. Megawelle trifft eine Stadt · Supervulkan, Yellowstone · stärkstes Erdbeben trifft deine Stadt · Schwarzes Loch kommt näher · Rogue-Planet trifft die Erde · alles Eis schmilzt, neue Eiszeit · Zombie-Ausbruch · Riesenmonster · Reise durch den Erdkern bzw. Loch durch die Erde · Fall in den Jupiter · ohne Raumanzug im All · Papier 42-mal falten · du schrumpfst oder wächst · Aufwachen im Jahr 3000 · alle Menschen springen, klatschen oder niesen gleichzeitig · Erde ist flach, ein Donut oder hat Saturnringe · Magnetfeld kippt, großer Sonnensturm · 1.000 Jahre Regen · weltweiter Stromausfall, Internet fällt weltweit aus · Schall oder Licht wird langsam"""

A2_ZUTATEN = [
    ("Ort", ["Ostseestrand", "Almhütte", "Kleingarten", "Campingplatz am See", "Deck eines Fischkutters", "Galerie eines Leuchtturms", "Weinberg", "Hallig", "Dorfbahnsteig", "Waldlichtung", "Dünen", "Gletscherhütte", "Hausboot", "Reisterrassen", "Lodge in der Savanne", "Fjordufer", "Vulkaninsel", "Mangrovenufer", "Hochmoor", "Wattenmeer", "Steg über einem Korallenriff", "Wüstenoase", "Bergsee", "Schrebergarten am Bahndamm"]),
    ("Natur", ["Zugvögel", "Bienenvolk", "Lachswanderung", "Korallen", "Golfstrom", "Monsun", "Mangroven", "Ameisenstaat", "Glühwürmchen", "Wale", "Meeresleuchten", "Moor", "Buchenwald", "Pilzgeflecht", "Seegras", "Gezeiten", "Polarlicht", "Wanderdüne", "Bambusblüte", "Plankton"]),
    ("Geschichte", ["Pyramidenbau", "Limes", "Hansekogge", "Bau des Gotthardtunnels", "Mondlandung 1969", "erste deutsche Eisenbahn 1835", "Kölner Dom (632 Jahre Bauzeit)", "Buchdruck", "Leuchtturm von Alexandria", "Panamakanal", "Abschlussdeich 1932", "Atlantikkabel 1858", "Chinesische Mauer", "Stonehenge", "Brooklyn Bridge", "erster Heißluftballon 1783", "Speicherstadt Hamburg", "römisches Aquädukt"]),
    ("Technik und Versorgung", ["Netzfrequenz 50 Hz", "Trinkwasserdruck", "Unterseekabel", "GPS-Satelliten", "Containerschiff", "Fernwärme", "Kläranlage", "Schleuse", "Stausee", "Windpark", "Kühlkette", "Ampelschaltung", "Funkmast", "Bahnstrom", "Pumpspeicherwerk", "Deich", "Pipeline", "Wasserturm", "Stromleitung", "Leuchtfeuer"]),
    ("Messgröße", ["Pegel in cm", "Temperatur", "Lautstärke in dB", "Helligkeit in Lux", "Anzahl", "Salzgehalt", "pH-Wert", "Windstärke", "Frequenz in Hz", "Luftdruck", "Höhe in m", "Geschwindigkeit", "Jahr", "Gewicht in t", "Entfernung"]),
    ("Tageszeit", ["Morgengrauen", "Mittag", "Sonnenuntergang", "Nacht", "Polarnacht", "Mitternachtssonne"]),
]

A2_FORMAT_SKRIPT = """AUFBAU DES SKRIPTS (feste Reihenfolge, 80 Sekunden; nennt der Auftrag einen TESTBLOCK, gelten dessen Zeiten)
- Titelfrage (steht 0,4 bis 4,4 s oben im Bild, 2 bis 3 Zeilen, deutsch, eine Frage mit offener Folge, die neugierig macht; sie verrät die Gefahr, die die Welt im Bild noch nicht kennt). Sie enthält den Suchbegriff (Feld suchbegriff) und ist zugleich das Cover im Profil. Im Abspann kehrt sie zurück.
- 12 bis 18 kursive Sätze: je 3 bis 9 Wörter, ruhig, Präsens, Aussagesätze, gern Du-Perspektive, Übergänge mit „Dann …“, keine Ausrufezeichen, keine Fragen. Erster Satz bei ca. 4,8 s, der letzte endet spätestens bei 70 s. Jeder Satz beschreibt genau das, was im selben Moment zu sehen ist; Zahlen im Satz stimmen mit der Anzeige überein.
- Bogen: Start mit Countdown (0 bis ca. 8 s: der Countdown läuft ab Bild 1, die Welt lebt noch ahnungslos weiter, der Zuschauer weiß mehr) · Ereignis genau auf Countdown-Null (ca. 8 s; Bild, Licht und Ton kippen gleichzeitig) · Eskalation in mindestens 3 Stufen alle 8 bis 10 s (ca. 10 bis 50 s; Farbe und Licht wechseln mit der Lage) · Annäherung (50 bis 58 s; ein zweiter Countdown ist erlaubt) · Höhepunkt (58 bis 62 s; Anzeige zeigt „HIER“, im Moment selbst kein Satz) · Nachspiel (62 bis 70 s) · Abblende (70 bis 72 s) · Abspann (72 bis 80 s).
- Messwert-Anzeige: läuft von Bild 1 an. Phase 1 ist ein Countdown bis zum Ereignis (bei Zeitraffer-Themen die Zeit bis zum Einsetzen der Veränderung), danach 2 bis 4 Etikettwechsel (je Stufe eine neue echte Messgröße), endet bei „HIER“. Darunter eine Statuszeile in Versalien (1 bis 3 Wörter zur Lage), deren Text mehrfach wechselt. Raffst du die Zeit, nenne den Zeitraffer-Faktor und eine nachvollziehbare Anzeige-Größe.
- Faktenzeile für den Abspann: „ORT, JAHR · FAKT“ oder „FAKT · FAKT“, eine bis zwei Zeilen, belegbar; sie ordnet die Prämisse real ein.
- Keine Stimme, keine Untertitel, kein Logo, keine Sticker, kein Folgen-Aufruf im Bild. Die Kommentarfrage steht nur in der Caption. Schreibe zusätzlich im Feld folgen_hinweis eine kurze Zeile für den Abspann (höchstens 8 Wörter), die nur in Testvideos erscheint: an den Inhalt gebunden („Morgen: …“, „Teil 2 im Profil“), kein Tausch, keine Belohnung, kein Druck."""

A2_CAPTION = """CAPTION (nicht im Video, nur Beschreibung)
Genau eine Zeile: Hook-Frage mit Suchbegriff? Emoji Ich hab’s durchgespielt. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #waswaerewenn
Der Suchbegriff steht vorn in der Hook-Frage (dasselbe Wort wie in der Titelfrage). Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral."""

A2_IDEEN_JSON = """{"gestrichen":["naheliegende Idee in Stichworten"],"ideen":[{"nr":1,"titel":"Titelfrage „Was wäre, wenn …?“","feld":"Natur und Tiere | Geschichte umgedreht | Technik und Versorgung | Physik, Wetter, Geografie, Weltraum","massstab":"persönlich | global","zutat":"welche Zutat des Tages (oder „keine“)","originalitaet":"vermeidet: naheliegende Idee · Suche: Begriffe · Ergebnis: kein deutsches Video gefunden | englisch: … | ungeprüft","suchbegriff":"Wort für die TikTok-Suche, steht in der Titelfrage","weiterschicken":"wem man das Video schicken würde und warum","ereignis":"was passiert, in einem Satz","messgroesse":"was die Anzeige zeigt (Größe, Einheit, Start und Ende)","welt":"Natur/Ort-Typ","standpunkt":"wo steht der Zuschauer","tageszeit_verlauf":"z. B. Morgen, Mittag, Abend","bewegung":"was sich in der Welt sichtbar verändert, Phase für Phase","kamera":"z. B. langsamer Zoom","zeitraffer":"Faktor oder Echtzeit","hoehepunkt":"was bei HIER passiert","pointe":"was man mitnimmt","diskussion":"warum sich Zuschauer austauschen würden (nur intern)","daten":"belegbare Quellen/Zahlen verfügbar","laender":"Ort/Land","risiko":"kurz"}]}"""

A2_SKRIPT_JSON = """{"skripte":[{"nr":1,"titel":"Titelfrage","thema":"","suchbegriff":"","folgen_hinweis":"kurze Abspann-Zeile für Testvideos","teil":1,"laenge_s":80,"welt":"","standpunkt":"","tageszeit_verlauf":"","zeitraffer":"","kamera":"","anzeige_plan":[{"von_s":0,"bis_s":8,"etikett":"ETIKETT (Phase 1: Countdown bis zum Ereignis)","start":"","ende":"","einheit":"","unter":"Statuszeile in Versalien"}],"saetze":[{"t_ca":4.8,"text":"Satz mit 3 bis 9 Wörtern."}],"faktenzeile":"","rechenweg":"Formel, Eingaben, Rechenschritte","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","originalitaet":"Suche (deutsch) und Ergebnis","dramaturgie":["Hinweis mit Zeitpunkt: was in der Welt passiert, Licht, Zoom"],"selbstpruefung":["Satzzahl ..","Fakten ..","Anzeige passt zum Zeitraffer ..","Verbote .."]}]}"""

KONFIG = {
    "simulierbar": {
        "name": "Simulierbar", "handle": "@simulierbar", "praefix": "acc1",
        "rolle": A1_ROLLE, "regeln_ideen": A1_REGELN_IDEEN, "format": A1_FORMAT_SKRIPT, "stimme": A1_STIMME,
        "caption": A1_CAPTION, "ideen_json": A1_IDEEN_JSON, "skript_json": A1_SKRIPT_JSON,
        "anti": A1_ANTI, "zutaten": A1_ZUTATEN,
        "bisher": ["GTA 6 weltweit", "Spurwechsel / Reißverschluss", "Treppe oder Aufzug", "200 € oder 100 € steuerfrei",
                   "Fußgängerampel (Rennen oder Gehen)", "Steuererklärung oder Überstunden"],
        "lernstand": ("Startwerte (Recherche 02.11.2026, 50 Videos von 6 Konten, öffentliche Zahlen) und eigene erste Zahlen:\n"
                      "- Treffer (über 100.000 Aufrufe) sind meist Duell-Fragen zu großen Lebensentscheidungen mit großer Euro-Endzahl (Mieten oder Kaufen, Leasing, Studium oder Ausbildung), Länge 67 bis 72 Sekunden.\n"
                      "- Kleine Einzeltipps (Reifendruck, Einkaufskasse, Händewaschen) und sozial- oder politiknahe Geldthemen (Kindergeld, Bürgergeld) erreichen kaum Aufrufe.\n"
                      "- Caption, Hashtag-Zahl und Uhrzeit trennen Treffer nicht vom Rest; das Thema entscheidet. Wer dasselbe Thema später nachmacht, bekommt nur 0,2 bis 5 Prozent des Originals.\n"
                      "- Erste eigene Zahlen (02.11.): durchschnittliche Wiedergabezeit ca. 26 Sekunden bei 66 Sekunden Länge (rund 39 Prozent). Der Lernstand wird täglich aus unseren Zahlen fortgeschrieben."),
    },
    "stelldirvor": {
        "name": "Stell dir vor", "handle": "@stelldirvor.pov", "praefix": "acc2",
        "rolle": A2_ROLLE, "regeln_ideen": A2_REGELN_IDEEN, "format": A2_FORMAT_SKRIPT, "stimme": "",
        "caption": A2_CAPTION, "ideen_json": A2_IDEEN_JSON, "skript_json": A2_SKRIPT_JSON,
        "anti": A2_ANTI, "zutaten": A2_ZUTATEN,
        "bisher": ["Schall in Schritttempo (Test)", "Eiszeit in Toronto (Was wäre, wenn wir wieder in eine Eiszeit steuern?)"],
        "lernstand": ("Startwerte (Recherche 02.11.2026 und eigene Eindrücke):\n"
                      "- Ausführung entscheidet mehr als das Thema: dasselbe Thema erreicht bei einem aufwendig gebauten Kanal Millionen, bei einfach gebauten Kanälen nur Tausende.\n"
                      "- Persönliche, greifbare Skalen (Papier falten, Graben) tragen eher als ein Weltuntergang ohne Vorstellbarkeit.\n"
                      "- Erstes eigenes Video (Eiszeit, Großstadt-Skyline) gefiel dem Inhaber nicht: zu viel Stadt, zu wenig Veränderung im Bild, immer derselbe erhöhte Standpunkt. Künftig: Natur und wechselnde Standpunkte, sichtbare Bewegung und ein Zeitraffer, der etwas zeigt.\n"
                      "- Der Lernstand wird täglich aus unseren Zahlen fortgeschrieben."),
    },
}


def lernstand_block(k, lernstand):
    return f"LERNSTAND (aus unseren Zahlen, bitte berücksichtigen)\n{lernstand}"


def bisher_block(bisher):
    return "BISHERIGE VIDEOS (nicht wiederholen; ausgenommen sind nur Folgeteile eigener Treffer, Regel ORIGINALITÄT 7):\n" + "\n".join(f"- {t}" for t in bisher)


def folgeteil_block(idee):
    """Zusatz für den Skript-Befehl, wenn die gewählte Idee ein Folgeteil eines eigenen Treffers ist (Cockpit, typ „folgeteil“)."""
    if not isinstance(idee, dict) or idee.get("typ") != "folgeteil":
        return ""
    n = idee.get("teil") or 2
    wurzel = (idee.get("serie") or {}).get("wurzel_titel") or idee.get("titel", "")
    return f"""FOLGETEIL (diese Idee ist Teil {n} einer Serie nach einem eigenen Treffer; Hirn „Serien und Treffer-Folgen“)
- Gleiches Versprechen wie „{wurzel}“, aber eine neue Rechnung bzw. ein neues Szenario mit eigener Frage und eigener Auflösung; nie dieselbe Aussage oder dieselben Zahlen noch einmal (sonst unoriginal).
- „Teil {n}“ steht groß im ersten Bild (das Feld titel beginnt mit „Teil {n}: “) und vorn in der Caption; "teil": {n} im Skript.
- Ohne Teil 1 verständlich; die Frage wird im selben Video beantwortet (kein Cliffhanger, kein „Folg für Teil {n + 1}“).
- Originalität: Unser eigenes Teil 1 zählt nicht als vorhandenes deutsches Video (Ausnahme von „bisher“ und ANTI-LISTE); prüfe nur, ob die neue Frage schon ein fremdes deutsches Video stellt.
- folgen_hinweis darf auf die Serie zeigen („Teil 1 ist im Profil“)."""


def testblock_block(konto, testbloecke):
    """Zusatz für den Skript-Befehl: Testblock des Videos (tools/testblock.py) mit den Vorgaben der Variante."""
    if not testbloecke:
        return ""
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    import testblock
    return "TESTBLOCK DIESES VIDEOS (data/tests/testbloecke.json, Wahl des Inhabers 08.11.; trage \"testbloecke\": " + json.dumps(testblock.fuer_skript(testbloecke), ensure_ascii=False) + " ins Skript ein)\n" + "\n".join(f"- {z}" for z in testblock.anweisungen(konto, testbloecke))


ZUTATEN_JE_LISTE = 2


def zutaten_ziehen(konto, rng=None):
    """Zieht je Liste ZUTATEN_JE_LISTE Einträge (gleiche Logik wie im Cockpit, cockpit/lib/studio.mjs)."""
    import random
    r = rng or random.SystemRandom()
    return "\n".join(f"- {name}: " + " · ".join(r.sample(liste, ZUTATEN_JE_LISTE)) for name, liste in KONFIG[konto]["zutaten"])


ZUTATEN_HAND = "[Hier die Zutaten einsetzen: je Liste zwei Einträge aus dem Abschnitt „Zutaten-Listen“ unten, gewürfelt; das Cockpit macht das automatisch]"


def ideen_befehl(konto, lernstand=None, bisher=None, wunsch="", format="text", zutaten="{{ZUTATEN}}"):
    c = KONFIG[konto]
    ls = lernstand or c["lernstand"]
    b = bisher if bisher is not None else c["bisher"]
    antwort = ("Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, kein Text davor oder danach) in genau dieser Form, mit genau 10 Einträgen unter \"ideen\":\n" + c["ideen_json"]
               if format == "json" else
               "Beginne mit einer Zeile „Gestrichen (naheliegend): …“. Antworte danach als nummerierte Liste von 1 bis 10. Jede Idee mit den Feldern, die im Beispiel unten stehen, jeweils eine kurze Zeile je Feld. Danach frage mich: „Welche zwei wählst du?“\nFelder (Beispiel als JSON, nur zur Orientierung, antworte als lesbaren Text):\n" + c["ideen_json"])
    teile = [c["rolle"], c["regeln_ideen"], ORIGINAL, SUCHBEGRIFF, c["anti"], FAKTEN, lernstand_block(konto, ls), bisher_block(b),
             ZUTATEN_KOPF.replace("{{ZUTATEN}}", zutaten)]
    if wunsch:
        teile.append("MEIN WUNSCH FÜR HEUTE: " + wunsch)
    teile.append("AUFGABE\nWir brauchen zehn Videoideen in unserer Nische für den morgigen Tag, die auf Deutsch noch niemand gemacht hat. Sie sollen unterschiedlich sein (verschiedene Themenfelder, Länder bzw. Welten) und zum Lernstand passen. Prüfe jede Idee vor der Ausgabe gegen die Regeln, die ANTI-LISTE, die Websuche und die Faktenlage; schreibe nur Ideen auf, die du belegen kannst.\n" + antwort)
    return "\n\n".join(teile)


def skript_befehl(konto, ideen, lernstand=None, format="text", testbloecke=None):
    """ideen: Liste von Dicts (die gewählten Ideen) oder Text. testbloecke: Ergebnis von tools/testblock.py (nur Claude Code)."""
    c = KONFIG[konto]
    ls = lernstand or c["lernstand"]
    gew = ideen if isinstance(ideen, str) else json.dumps(ideen, ensure_ascii=False, indent=1)
    antwort = ("Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, kein Text davor oder danach) in genau dieser Form, mit einem Eintrag je gewählter Idee:\n" + c["skript_json"]
               if format == "json" else
               "Gib je Idee das Skript lesbar aus: Titel, Segmente mit Text und Sprechtext (bzw. Sätze und Anzeige-Plan), Rechenweg, Annahmen, Quellen, Caption, Dramaturgie-Hinweise, Selbstprüfung. Feldstruktur zur Orientierung:\n" + c["skript_json"])
    teile = [c["rolle"], FAKTEN, SPANNUNG, c["format"]]
    if c["stimme"]:
        teile.append(c["stimme"])
    teile += [c["caption"], lernstand_block(konto, ls)]
    teile += [b for b in [folgeteil_block(i) for i in (ideen if isinstance(ideen, list) else [])] + [testblock_block(konto, testbloecke)] if b]
    teile += ["GEWÄHLTE IDEEN (für diese schreibst du jetzt je ein makelloses Skript)\n" + gew,
              "AUFGABE\nSchreibe für jede gewählte Idee ein makelloses, sendefertiges Skript nach allen Regeln oben. Erfinde nichts; jede Zahl mit Rechenweg und Quelle. Prüfe dein Skript am Ende selbst (Wortzahl bzw. Satzzahl, Fakten, Ton, Verbote) und trage das Ergebnis in selbstpruefung ein. Findest du beim Prüfen einen Fehler, korrigiere ihn vor der Ausgabe.\n" + antwort]
    return "\n\n".join(teile)


RECHERCHE_CODE = """RECHERCHE (du bist Claude Code mit Websuche; dieser Abschnitt hat Vorrang vor „frage mich vorher“ oben)
- Du arbeitest unbeaufsichtigt: frage nicht zurück, recherchiere selbst. Was du nicht belegen kannst, lässt du weg. Trägt die Idee dann nicht, meldest du das (Status fehler mit Grund und Vorschlag), statt etwas zu erfinden.
- Originalität zuerst: Suche vor dem Schreiben, ob es auf Deutsch schon ein Video zur gleichen Frage bzw. Prämisse gibt (TikTok, YouTube, Instagram; 2 bis 3 Suchen). Gibt es eines, schreibe kein Skript, sondern setze den Status rueckfrage mit dem Fund (Titel, Konto, Aufrufe, Link nur im Slot-Dokument) und einem Vorschlag für einen eigenen Dreh. Ergebnis der Suche in "originalitaet" des Skripts. Unsere eigenen Videos (@simulierbar, @stelldirvor.pov) zählen bei einem Folgeteil nicht als Fund (Abschnitt FOLGETEIL).
- Belege jede Zahl, jedes Datum und jede Regel mit einer Websuche, möglichst bei der Primärquelle (Gesetz, Behörde, amtliche Statistik, Studie, Hersteller). Öffne die Quelle, wenn die Suche nur einen Ausschnitt zeigt. Stand und Gültigkeit müssen zum Video-Tag passen (Jahr, Rechtsstand, Preise).
- Rechne jede Zahl im Rechenweg mit Python nach, nie im Kopf. Im Sprechtext runde Zahlen, im Bild exakte.
- Schreibe jede Quelle als „(F) Titel, Herausgeber, Stand – URL“, Schätzungen als „(S) …“, Annahmen als „(A) …“.
- Antworte nicht im Chat, sondern schreibe das fertige Skript-Objekt (der erste Eintrag von "skripte" in der JSON-Form oben) in das Slot-Dokument (docs/automatik/tages-sitzung.md §3)."""


def code_skript_befehl(konto, idee, lernstand=None, kommentar="", testbloecke=None):
    """Befehl für die Tages-Sitzung von Claude Code: derselbe Skript-Befehl wie im Studio (JSON-Form) plus Recherche-Regeln
    (plus Folgeteil- und Testblock-Abschnitt, wenn zutreffend)."""
    teile = [skript_befehl(konto, [idee], lernstand=lernstand, format="json", testbloecke=testbloecke), RECHERCHE_CODE]
    if kommentar:
        teile.append("WUNSCH DES INHABERS ZUR NEUFASSUNG (hat Vorrang; was er nicht kritisiert, bleibt möglichst gleich):\n" + kommentar)
    return "\n\n".join(teile)


# ---------------------------------------------------------------- Hirn-Notizen
def notiz(konto, titel, ordner, zielordner_konto):
    c = KONFIG[konto]
    k = konto
    ideen = ideen_befehl(k, format="text", zutaten=ZUTATEN_HAND)
    skript = skript_befehl(k, "[Hier die zwei gewählten Ideen einfügen (Titel und Felder aus Schritt 1)]", format="text")
    listen = "\n".join(f"- **{name}:** " + " · ".join(liste) for name, liste in c["zutaten"])
    return f"""---
typ: anleitung
konto: {k}
status: aktuell
datum: {DATUM}
quelle: tools/chat_befehle.py
tags: [konto/{k}, claude-chat, befehl, skript]
cssclasses: [konto-{k}, typ-anleitung]
---

# {titel}

> Diese Notiz wird mit `python3 tools/chat_befehle.py` erzeugt (Textquelle: `tools/chat_befehle.py`). Änderungen am Befehl dort vornehmen, nicht hier. Der **Lernstand** im Befehl wird täglich fortgeschrieben ([[Lernschleife und Insights]]).

Ablauf und Hintergrund: [[Claude-Chat-Workflow]]. Regeln: [[Regelwerk {'Simulierbar' if k == 'simulierbar' else 'Account 2'}]]. Account **{c['handle']}**.

## Standardweg: Ideen-Studio
Im **Ideen-Studio** (Artifact) erzeugst du die Ideen per Klick; Recherche und Skript schreibt die Tages-Sitzung von Claude Code mit demselben Befehl wie Schritt 2 (plus Websuche, `python3 tools/chat_befehle.py --skript-auftrag …`). Ablauf: [[Claude-Chat-Workflow]].

## Notweg von Hand (nur wenn das Studio Claude Code nicht erreicht)
1. Neues Gespräch in Claude Chat öffnen (Websuche an), **Schritt 1** unten einfügen. Du bekommst 10 Ideen.
2. Zwei Ideen wählen (Mittag und Abend des nächsten Tages).
3. **Schritt 2** einfügen, die zwei Ideen einsetzen. Du bekommst zwei Skripte.
4. Beide Skripte in eine Claude-Code-Sitzung einfügen und dazuschreiben, dass sie freigegeben sind. Claude Code prüft jede Zahl, korrigiert Faktenfehler mit Vermerk und baut die Videos.

## Schritt 1: zehn Ideen
```text
{ideen}
```

## Schritt 2: Skripte für die zwei gewählten Ideen
```text
{skript}
```

## Zutaten-Listen
Das Cockpit zieht für jeden Ideen-Auftrag je Liste {ZUTATEN_JE_LISTE} Einträge zufällig und setzt sie unter „ZUTATEN DES TAGES“ ein. So bekommt die KI jedes Mal einen anderen Auftrag als andere Creator. Hintergrund: [[Originalität und Themenfindung]].

{listen}

## Siehe auch
[[Originalität und Themenfindung]] · [[Claude-Chat-Workflow]] · [[Lernschleife und Insights]] · [[Regelwerk]] · [[Index]]
"""


def studio_bauen():
    """Baut docs/ideen-studio/ideen-studio.html aus vorlage.html und befehle.json."""
    ziel = WURZEL / "docs" / "ideen-studio"
    daten = (ziel / "befehle.json").read_text(encoding="utf-8")
    kompakt = json.dumps(json.loads(daten), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (ziel / "vorlage.html").read_text(encoding="utf-8").replace("__BEFEHLE_JSON__", kompakt)
    (ziel / "ideen-studio.html").write_bytes((html).encode("utf-8"))
    print("gebaut: docs/ideen-studio/ideen-studio.html", round(len(html) / 1024), "KB")


def main():
    a1 = WURZEL / "hirn" / "02-Simulierbar" / "Befehl Ideen und Skripte Simulierbar.md"
    a2 = WURZEL / "hirn" / "03-stelldirvor-pov" / "Befehl Ideen und Skripte Account 2.md"
    a1.write_bytes((notiz("simulierbar", "Befehl Ideen und Skripte Simulierbar", "02-Simulierbar", "simulierbar")).encode("utf-8"))
    a2.write_bytes((notiz("stelldirvor", "Befehl Ideen und Skripte Account 2", "03-stelldirvor-pov", "stelldirvor")).encode("utf-8"))
    ziel = WURZEL / "docs" / "ideen-studio"
    ziel.mkdir(parents=True, exist_ok=True)
    daten = {}
    for k, c in KONFIG.items():
        daten[k] = {"name": c["name"], "handle": c["handle"], "praefix": c["praefix"], "lernstand": c["lernstand"], "bisher": c["bisher"],
                    "zutaten": [{"name": n, "eintraege": l} for n, l in c["zutaten"]], "zutaten_je_liste": ZUTATEN_JE_LISTE,
                    "ideen_vorlage": ideen_befehl(k, lernstand="{{LERNSTAND}}", bisher=["{{BISHER}}"], wunsch="", format="json"),
                    "skript_vorlage": skript_befehl(k, "{{IDEEN}}", lernstand="{{LERNSTAND}}", format="json"),
                    "ideen_text": ideen_befehl(k, format="text"), "skript_text": skript_befehl(k, "{{IDEEN}}", format="text")}
    (ziel / "befehle.json").write_bytes((json.dumps(daten, ensure_ascii=False, indent=1)).encode("utf-8"))
    print("geschrieben:", a1.name, "|", a2.name, "| docs/ideen-studio/befehle.json")
    studio_bauen()


def cli():
    import argparse
    ap = argparse.ArgumentParser(description="Ohne Optionen: Hirn-Notizen, befehle.json und Studio bauen.")
    ap.add_argument("--skript-auftrag", choices=list(KONFIG), help="Skript-Befehl für die Tages-Sitzung ausgeben")
    ap.add_argument("--ideen", help="JSON-Datei mit der gewählten Idee (Objekt oder Liste mit einem Objekt)")
    ap.add_argument("--lernstand", help="Textdatei mit dem aktuellen Lernstand (sonst Startwert)")
    ap.add_argument("--kommentar", default="", help="Wunsch des Inhabers zur Neufassung")
    ap.add_argument("--datum", help="Video-Tag JJJJ-MM-TT: mit --slot kommt der Testblock des Videos in den Befehl (tools/testblock.py)")
    ap.add_argument("--slot", choices=("mittag", "abend"), help="Slot des Videos (mit --datum)")
    a = ap.parse_args()
    if not a.skript_auftrag:
        return main()
    if not a.ideen:
        ap.error("--ideen fehlt")
    idee = json.loads(Path(a.ideen).read_text(encoding="utf-8"))
    if isinstance(idee, list):
        idee = idee[0]
    ls = Path(a.lernstand).read_text(encoding="utf-8").strip() if a.lernstand else None
    bloecke = None
    if a.datum and a.slot:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import testblock  # noqa: E402
        bloecke = testblock.testbloecke(a.skript_auftrag, a.datum, a.slot)
    print(code_skript_befehl(a.skript_auftrag, idee, lernstand=ls or None, kommentar=a.kommentar, testbloecke=bloecke))


if __name__ == "__main__":
    cli()
