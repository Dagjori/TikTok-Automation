#!/usr/bin/env python3
"""Befehle an Claude Chat: 10 Videoideen und danach makellose Skripte, je Account.

Einzige Textquelle für (1) die Hirn-Notizen „Befehl Ideen und Skripte …“ (je Account im Ordner 1-Skripterstellung) und
(2) das Ideen-Studio (Artifact). Die Texte folgen den Skills .claude/skills/themen-skript (Themen, Aufbau, Ausgabe) und
.claude/skills/stimme-elevenlabs (Textformat des Sprechtexts); wird dort eine Regel geändert, hier nachziehen (Stand 09.11.2026).
Aufruf:  python3 tools/chat_befehle.py            schreibt beide Hirn-Notizen und docs/ideen-studio/befehle.json
Der LERNSTAND wird täglich aus den Buffer-Zahlen fortgeschrieben (Notiz „Lernschleife und Insights“) und im
Ideen-Studio aus der Datenbank gelesen; hier steht nur der Startwert.
"""
import json
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
DATUM = "2026-11-09"

# ---------------------------------------------------------------- gemeinsame Blöcke
FAKTEN = """FAKTENTREUE (gilt für alles, was du lieferst)
- Erfinde nichts. Jede Zahl, jedes Datum, jede Behauptung muss belegbar sein (amtliche Statistik, Gesetz, Studie, Behörden- oder Herstellerangabe). Nenne zu jeder Zahl Quelle und Jahr.
- Kannst du eine Zahl nicht belegen, schreibe „nicht belegt“ und verwende sie nicht. Trägt eine Idee ohne belegbare Zahlen nicht, verwirf sie und sage es offen.
- Alles, was eine Annahme ist (z. B. eine Modellperson), kennzeichne als Annahme und halte sie realistisch und nachvollziehbar. Noch nicht beschlossene Gesetze und Vorhaben heißen immer „geplant“.
- Aussagen müssen legitim sein: keine Übertreibung, keine verzerrende Auswahl, keine Panikmache, keine falschen Gegensätze.
- Diskussionsbedarf soll durch die Sache selbst entstehen (zum Beispiel, weil die Antwort der Intuition widerspricht oder von der persönlichen Lage abhängt). Sprich das nie aus: keine Aufforderung zum Streiten oder Meinungsäußern im Text, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- Wenn dir Informationen fehlen, die das Ergebnis verändern, frage mich vorher gebündelt, statt zu raten."""

SPANNUNG = """SPANNUNG UND QUALITÄT
- Das Video muss ab der ersten Sekunde fangen und die Spannung bis zum Ergebnis kontinuierlich steigern. Kein Leerlauf, keine Füllsätze.
- Schreibe so, dass sich daraus mehrere unterschiedliche Bildsequenzen, Wendungen und Situationswechsel ergeben (ich baue danach Design und Animation aus deinem Skript). Markiere in den Dramaturgie-Hinweisen, wo die Spannung steigt und welche Momente visuell besonders sein sollten (Zoom, Licht, Aufleuchten).
- Nichts Übertriebenes: lieber ein klarer, sauberer Spannungsbogen als Effekthascherei."""

ORIGINAL = """ORIGINALITÄT (wichtigste Regel für Ideen; Vorrang vor dem Lernstand und vor allen Beispielen)
Andere Creator fragen dieselbe KI mit ähnlichen Befehlen. Was dir als Erstes einfällt, haben sie auch bekommen, und genau das wollen wir nicht. Das gesuchte Thema darf bekannt sein, der WINKEL muss neu sein: eine Frage, die auf Deutsch so noch niemand gestellt hat.
1. Schreibe zuerst für dich die 20 naheliegendsten Ideen zu unserer Nische auf und streiche sie alle, dazu alles von der ANTI-LISTE unten in seiner Standardfrage (auch umbenannt oder mit anderen Zahlen). Nenne die gestrichenen Ideen in Stichworten (Feld "gestrichen").
2. Jede Idee beginnt bei einem Beleg für NACHFRAGE (Abschnitt NACHFRAGE, Feld "nachfrage"). Das ist Pflicht. Die ZUTATEN DES TAGES sind nur freiwillige Startpunkte für die Suche nach einem Winkel (Feld "zutat", sonst „keine“); eine Zutat ersetzt nie den Nachfrage-Beleg.
3. Suche zu jedem Fund einen Winkel mit den WINKEL-WERKZEUGEN (Feld "winkel": Werkzeug und was genau neu ist) und nenne die naheliegende Fassung, die wir nicht machen (Feld "vermeidet"). Ein Fund ohne Winkel fällt raus.
4. Prüfe jede Idee mit der Websuche: Gibt es auf Deutsch schon ein Video zur gleichen Frage (TikTok, YouTube, Instagram)? Suche mit 2 bis 3 deutschen Begriffen. Gefunden: Winkel drehen oder Idee verwerfen und ersetzen. Englische Videos zur gleichen Frage sind erlaubt, wenn unsere Fassung eigenständig ist; nie Sätze, Bild- oder Szenenideen übernehmen. Trage im Feld "originalitaet" ein: die Suchbegriffe und das Ergebnis („kein deutsches Video gefunden“ oder „englisch: …“). Hast du keine Websuche, schreibe „ungeprüft“.
5. Einzigartig UND relevant, beides ist Pflicht: ein ungewöhnlicher Winkel auf etwas, das viele suchen, kennen oder betrifft. Die Frage muss ohne Erklärung verständlich sein. Abseitige Nischen fallen genauso raus wie Standardthemen.
6. Zwei Ideen, die sich nur im Zahlenwert oder im Ort unterscheiden, zählen als eine. Der Lernstand sagt, welche Art Thema trägt, nicht welches konkrete Thema du nehmen sollst.
7. WÜRDE MAN DAS JEMANDEM SCHICKEN? Jede Idee muss so sein, dass man das Video einer bestimmten Person weiterschicken würde (Freundin, Kollege, Eltern, Mitbewohner), weil es sie betrifft oder überrascht. Nenne im Feld "weiterschicken", wem und warum. Ideen, die man nur allein anschaut, fallen raus. (Unser einziger Treffer war das einzige Video mit nennenswert vielen Shares.)
8. Ausnahme Folgeteile: Ein nummerierter Folgeteil eines eigenen Treffers (Teil 2, 3 …: gleiches Versprechen, neue Rechnung bzw. neues Szenario) ist von BISHERIGE VIDEOS und der ANTI-LISTE ausgenommen. Solche Folgeteile legt das Cockpit selbst an, wenn ein Video ein Treffer war; schlage du keine eigenen vor.
9. Maßstab für eine fertige Idee: Ein Fremder kann nach dem Lesen sagen, wonach gesucht wird, was der Zuschauer tippt bzw. erwartet, was am Ende herauskommt und warum es dieses Video auf Deutsch noch nicht gibt."""

SUCHBEGRIFF = """SUCHBEGRIFF
Jede Idee nennt im Feld "suchbegriff" das Wort, das jemand in die TikTok-Suche tippen würde (z. B. „Studium“, „Pfand“, „Mond“, „Golfstrom“). Es steht in der Titelfrage, möglichst vorn, und später vorn in der Caption. Kein Kunstwort, keine Zahl allein."""

NACHFRAGE = """NACHFRAGE (Pflicht seit 09.11.2026: Nachfrage vor Einfall)
Jedes Thema beginnt bei etwas, das Menschen nachweislich suchen oder fragen. Ein Thema ohne Beleg für Nachfrage wird nicht vorgeschlagen. Sammle zuerst mindestens 30 Rohfunde über alle Themenfelder und notiere je Fund Suchformulierung, Quelle und Datum. Quellen in dieser Reihenfolge:
1. Suchvorschläge (Autocomplete): Suchstamm plus Buchstabe a bis z. Abruf ohne Anmeldung über https://suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=de&q=<Stamm>+<Buchstabe> (Google) und mit dem Zusatz &ds=yt (YouTube). Antwortet die Adresse nicht, dieselben Stämme über die Websuche abfragen. Die SUCHSTÄMME stehen bei den Regeln für Ideen.
2. Google Trends, „Zunehmend“: je Stamm die steigenden Suchanfragen für Deutschland (3 Monate); alles über +500 % notieren. Nicht abrufbar: überspringen und „Trends nicht geprüft“ vermerken.
3. „Weitere Fragen“ der Websuche zu den stärksten Funden. Die Folgefrage ist oft schon der Winkel.
4. Anlässe mit Datum in den nächsten 8 Wochen (siehe ANLÄSSE bei den Regeln für Ideen).
5. Vom Inhaber, wenn im Auftrag genannt: Begriffe aus TikTok „Creator Search Insights“ (Filter „Inhaltslücke“) und Kommentare unter eigenen Videos. Liegen keine vor, ohne sie arbeiten.
Trage je Idee im Feld "nachfrage" ein: Suchformulierung(en) · Quelle · Datum bzw. Anlass mit Datum. Erfinde keine Suchvorschläge; was du nicht abrufen konntest, steht nicht im Feld. Die ANTI-LISTE zeigt, wo die Nachfrage groß, die Konkurrenz aber übergroß ist: dort hilft nur ein neuer Winkel."""

ZUTATEN_KOPF = """ZUTATEN DES TAGES (zufällig gezogen; freiwillige Startpunkte für einen Winkel, kein Ersatz für den Nachfrage-Beleg)
{{ZUTATEN}}"""

# ---------------------------------------------------------------- Account 1
A1_ROLLE = """ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Simulierbar“ (@simulierbar). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Themen, nach denen Menschen nachweislich suchen, mit einem Winkel, den noch niemand gemacht hat, und einer Zahl, die man sich merkt.

UNSER KANAL
- Nische: GELD IN DEUTSCHLAND (Gehalt und Netto, Steuern, Rente und Vorsorge, Krankenkasse und Pflege, Preise und Lebenshaltung, Wohnen und Energie, Gesetze mit Geldfolge). Jedes Video beantwortet eine Geldfrage mit einer eigenen Modellrechnung und endet mit einem konkreten Ergebnis in Euro.
- Format: gesichtsloses 3D-Simulationsvideo, Deutsch, über 61 Sekunden (Rewards-Programm), in der Regel 65 bis 80, ruhige KI-Stimme („Ben“). Vier Formate: Duell, Zeitverlauf, Was bleibt, Lernvideo. Immer mit laufenden Zählern und einer Euro-Zahl am Ende.
- Jedes Video stellt in den ersten 3 Sekunden eine Frage, zu der der Zuschauer still einen Tipp abgibt, und löst sie erst spät auf (Ergebnis bei ca. 75 bis 80 % der Länge). Wer getippt hat, bleibt, um zu sehen, ob er recht hatte. Mitten im Video wird eine zweite offene Frage gesetzt, die erst die Pointe auflöst.
- Die Videolänge richtet sich nach der Stimme. Es gibt keine Vorgaben für Sprechtempo, Silben oder Pausen.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle, danach schreibst du die Skripte. Ich baue daraus Stimme, Animation und Schnitt."""

A1_REGELN_IDEEN = """REGELN FÜR IDEEN
- Nur GELD. Das Ergebnis ist immer die persönliche Euro-Folge für eine Modellperson aus einer eigenen, nachvollziehbaren Modellrechnung, nie eine politische Bewertung.
- THEMENFELDER (Feld "feld"): Die 10 Ideen verteilen sich auf mindestens 5 dieser Felder. Die Beispiele sind Ausgangspunkte, keine Themenliste; die Nachfrage wird in jedem Lauf neu erhoben.
  1. Rente und Vorsorge (Rente mit 63, Abschläge, Rentenbesteuerung, Frühstart-Rente, Altersvorsorgedepot, Riester-Altvertrag).
  2. Netto, Steuern, Abgaben (Netto im nächsten Jahr, Beitragsbemessungsgrenze, Steuerklassen, Fristen und Verspätungszuschlag).
  3. Krankenkasse und Pflege (Zusatzbeitrag, Familienversicherung, Zuzahlungen, Pflegegrad und Eigenanteil).
  4. Arbeit und Gehalt (Mindestlohn, Minijob-Grenze, Berufsgehälter, Beamter gegen Angestellter, Krankheitstag).
  5. Preise und Lebenshaltung (Sprit- und Energiesteuern, CO2-Preis, Abos, Lebensmittel, „was kostet …“).
  6. Wohnen und Energie („lohnt sich …“: Wärmepumpe, Balkonkraftwerk, E-Auto; Nebenkosten, Grundsteuer).
  7. Geld früher und heute (Preise in Arbeitszeit, ein Monatslohn in Gold, D-Mark-Zeit gegen heute).
  8. Versteckte Mechaniken und Kurioses (Rundung, Grundgebühr, Pfand, Staffelpreis, kuriose Steuern).
- SUCHSTÄMME für die Nachfrage: ab wann · wie viel steuern · wie viel geld · wie viel rente · wie viel netto · was kostet · was bleibt von · lohnt sich · wie hoch ist · wann bekomme ich · was ändert sich <nächstes Jahr> · gehalt · rente · krankenkasse · steuererklärung · mindestlohn · pflegegrad · grundsicherung
- ANLÄSSE: Gesetzes- und Beitragsänderungen zum Jahreswechsel und zur Jahresmitte, Rentenanpassung im Juli, Steuerfristen, Heizperiode, Urlaubszeit, Nebenkostenabrechnung. Noch nicht beschlossene Vorhaben immer als „geplant“ führen.
- WINKEL-WERKZEUGE (so wird aus einem gesuchten Thema eine neue Frage; Feld "winkel"):
  1. Zwei Menschen, ein Unterschied: gleiche Lage, eine einzige Größe anders (Jahrgang, Startjahr, 50 Euro mehr Lohn, Bundesland).
  2. Der Kipppunkt: Ab welchem Betrag, Jahr oder Kilometer dreht sich das Ergebnis?
  3. Was wirklich bleibt: Erhöhung minus alles, was gleichzeitig steigt.
  4. Die Schwelle: der eine Euro, der mehr kostet, als er bringt.
  5. Wer bekommt was: ein Betrag als Stapel zerlegt (eine Tankfüllung, ein Bruttolohn, eine Miete).
  6. Zeitreise: dieselbe Sache in Arbeitszeit, in Gold oder in Brötchen, damals und heute.
  7. Einholen: Zwei starten verschieden. Wann hat der Spätere den Früheren eingeholt, und holt er ihn überhaupt ein?
  8. Die übersehene Zeile: der Posten auf Abrechnung oder Bescheid, den kaum jemand liest.
  Ein Fund ohne passenden Winkel fällt raus.
- FORMATE (Feld "format"; ein Duell ist seit 09.11.2026 keine Pflicht mehr):
  · Duell: zwei echte Alternativen derselben Entscheidung (kein „Steuererklärung gegen Überstunden“-Unsinn). Der Zuschauer tippt, wer vorn liegt.
  · Zeitverlauf: etwas entwickelt sich über Jahre. Er tippt, wann es kippt oder wie hoch es endet.
  · Was bleibt: ein Betrag wird Schritt für Schritt kleiner oder verteilt. Er tippt, wie viel am Ende übrig ist.
  · Lernvideo: eine Regel oder Mechanik, an einer Modellperson durchgerechnet. Er tippt, was bei ihr herauskommt.
  Je 10 Ideen höchstens 5 Duelle, jedes andere Format mindestens einmal. Jedes Format braucht Zähler, die laufen, und eine Euro-Zahl am Ende.
- TIPP UND AUFLÖSUNG: Jede Idee nennt, was der Zuschauer in den ersten 3 Sekunden rät und warum viele falsch liegen (Feld "tipp"), den Rechenansatz mit der Größenordnung des Euro-Ergebnisses (Feld "ergebnis_ansatz", nichts Erfundenes) und die zweite Überraschung, die nach dem Ergebnis kommt (Feld "zweite_frage").
- GEÖFFNET seit 09.11.2026 (Entscheidung des Inhabers): Stark gesuchte Themen wie Rente, Steuererklärung, Kindergeld, Grundsicherung, Teilzeit, Jobwechsel sind erlaubt, WENN die Frage einen Winkel aus den Winkel-Werkzeugen hat und auf Deutsch so noch nicht gemacht wurde.
- Ausgeschlossen (unverändert): Parteipolitik und Wertungen über Gruppen · Anlageberatung, Einzelaktien, Krypto, Empfehlungen für Anbieter, Banken, Versicherer oder Broker · Glücksspiel, Tabak und Vape als Kaufanreiz · Gesundheitsversprechen · Tragödien · „schnell reich“, Kaufaufrufe, FOMO. Finanzthemen nur als Modellrechnung mit sichtbaren Annahmen, nie als Anlageberatung.
- BEWERTUNG (Feld "punkte", 0 bis 3 Punkte je Kriterium, höchstens 21): Nachfrage (3 = in Suchvorschlägen UND steigend bei Trends oder aktueller Anlass) · Betroffenheit (3 = betrifft Millionen: Arbeitnehmer, Rentner, Mieter, Autofahrer) · Winkel (3 = Frage so auf Deutsch nicht gefunden) · Tipp-Sog (3 = jeder hat sofort eine Meinung, und viele liegen falsch) · Endzahl (3 = große oder unerwartete Euro-Zahl, die man weitererzählt) · Belegbarkeit (3 = amtliche Quellen, Rechnung nachvollziehbar) · Bildkraft (3 = als laufende Zähler, Stapel oder Rennen zeigbar). Unter 14 Punkten nicht vorschlagen. Bei Nachfrage oder Belegbarkeit 0 Punkte: raus.
- Kein Thema, zu dem es auf Deutsch schon ein Video mit der gleichen Frage gibt (Regel ORIGINALITÄT). Von englischen Videos nie Skript, Sätze, Bild- oder Szenenideen übernehmen.
- Keine Dopplung mit unseren bisherigen Videos."""

A1_ANTI = """ANTI-LISTE (abgenutzt; in der Standardfrage nie vorschlagen, auch nicht umbenannt oder mit anderen Zahlen)
Zinseszins und „früh sparen“ · 100 Euro monatlich in einen ETF · erste Million · Brutto-Netto bei einem runden Gehalt ohne Winkel · Inflation frisst Erspartes · Mieten oder Kaufen als Grundsatzfrage · Kaffee to go, Latte-Faktor · Streaming-Abos zusammenzählen · Standby-Kosten · LED gegen Glühbirne · Duschen oder Baden · Leitungs- gegen Flaschenwasser · E-Auto gegen Verbrenner als Grundsatzfrage · Handyvertrag gegen Prepaid · Black Friday · Tanken zu bestimmten Uhrzeiten
ÖFFNUNG (seit 09.11.2026): Gesperrt ist nur die bekannte Standardfrage. Dasselbe Thema ist erlaubt, wenn ein Winkel-Werkzeug daraus eine andere Frage macht, die auf Deutsch noch niemand gestellt hat. Stark gesuchte Themen (Rente, Steuererklärung, Kindergeld, Grundsicherung, Teilzeit, Jobwechsel) stehen nicht mehr auf dieser Liste; auch für sie gilt: nur mit neuem Winkel, Ergebnis als Euro-Folge für eine Modellperson. Parteipolitik bleibt ausgeschlossen."""

A1_ZUTATEN = [
    ("Gesetz, Gebühr oder Statistik", ["Pfandverordnung", "Rundfunkbeitrag", "Hundesteuer", "Kurtaxe", "Bußgeldkatalog", "Briefporto seit 1950", "Grundsteuer", "Kirchensteuer", "Parkgebühren", "Zoll-Freimengen", "Fluggastrechte", "Mindestlohn seit 2015", "Preisangabenverordnung", "Lkw-Maut", "Müllgebühren", "Wasserpreise je Stadt", "Notarkosten", "Bargeldgebühren", "Mehrwertsteuer 7 oder 19 Prozent", "Schaumweinsteuer", "Kaffeesteuer", "Ladenöffnungszeiten", "Biersteuer", "Feuerwerksverkauf nur drei Tage"]),
    ("Ding", ["Feuerwerk", "Weihnachtsbaum", "Stadionrasen", "Ampel", "Straßenlaterne", "Leuchtturm", "Rolltreppe", "Brötchen", "Briefmarke", "Pfandflasche", "Einkaufswagen", "Parkuhr", "Kirchenglocke", "Schulbus", "Fußball", "Zahnbürste", "Regenschirm", "Kaugummi", "Kinokarte", "Glühwein", "Konzertticket", "Schlüsseldienst", "Bahnhofstoilette", "Adventskalender"]),
    ("Beruf", ["Schornsteinfeger", "Lotse", "Fluglotse", "Hufschmied", "Orgelbauer", "Imker", "Schleusenwärter", "Berufstaucher", "Schäfer", "Pilot", "Hebamme", "Winzer", "Bergführer", "Zugbegleiter", "Eisverkäufer", "Glockengießer", "Tätowierer", "Kapitän", "Synchronsprecher", "Schiedsrichter"]),
    ("Land", ["Japan", "Norwegen", "Schweiz", "USA", "Dänemark", "Singapur", "Island", "Polen", "Portugal", "Kanada", "Australien", "Südkorea", "Niederlande", "Österreich", "Italien", "Mexiko", "Finnland", "Frankreich"]),
    ("Zeit", ["1950", "1965", "1980", "1990", "2001, letztes D-Mark-Jahr", "2002, Euro-Einführung", "Mittelalter", "Römerzeit", "Kaiserreich um 1900", "2035, in die Zukunft gerechnet"]),
    ("Mechanik", ["Rundung", "Mindestbestellwert", "Staffelpreis", "Grundgebühr", "Kündigungsfrist", "Packungsgröße", "Pfand", "Bonuspunkte", "Gebühr je Vorgang", "Mengenrabatt", "Mindesthaltbarkeit", "Aufrunden an der Kasse", "Wechselkurs-Aufschlag", "automatische Abo-Verlängerung", "Inflation pro Jahr", "Zinstage"]),
]

A1_FORMAT_SKRIPT = """AUFBAU DES SKRIPTS (Standard seit 09.11.2026; feste Reihenfolge, genau diese Phasen-IDs; Zeiten für ca. 70 Sekunden, sie verschieben sich mit der Länge der Stimme)
Lege zuerst fest, bevor du einen Satz schreibst: Was tippt der Zuschauer (Feld offene_frage)? Was ist die Auflösung (Feld aufloesung)? Was ist die zweite Überraschung danach (Feld zweite_frage)?
1. hook (0 bis 3 s): Die Frage mit beiden Seiten bzw. dem Start- und Zielwert, höchstens 2 Sätze, kein vorweggenommenes Ergebnis. Der Zuschauer kann sofort tippen. Titelfrage (Feld text, mit Suchbegriff) und alle Startwerte stehen ab dem ersten Bild; das erste Bild muss ohne Ton verständlich sein und ist zugleich das Cover im Profil.
2. regeln (3 bis 8 s): Die Zähler laufen schon. Die Annahmen erscheinen als Chips im Bild; gesprochen werden höchstens 2 kurze Sätze dazu. Kein Erklärblock.
3. falle (8 bis 11 s): Die naheliegende Antwort wird ausgesprochen („Klar, … Oder?“), ruhig, kein „Los geht’s“.
4. wendung1 (12 bis 15 s): der erste Befund, der dem Tipp widerspricht.
5. rennen, wendung2 … (bis ca. 45 s): alle 8 bis 10 s ein neuer Befund oder Führungswechsel, mindestens eine Zahl je 10 Sekunden. In einer dieser Wendungen wird die ZWEITE FRAGE gesetzt: ein Satz, der eine neue Unbekannte ankündigt, ohne sie aufzulösen.
6. kipp (bei ca. 60 bis 65 % der Länge): der Moment, in dem es kippt; die Spannung ist am höchsten, das Ergebnis noch offen.
7. ergebnis (bei ca. 75 bis 80 % der Länge): die exakte Euro-Zahl. Auflösung der ersten Frage.
8. warum (höchstens 6 s): höchstens zwei Faktoren, kurz.
9. pointe (die letzten 6 s): löst die zweite Frage auf (zweite Zahl oder überraschende Einordnung).
10. schlusskarte (die letzten 2 s): ein Fazit-Satz, der zugleich als Karte im Bild steht. Keine Frage, kein Aufruf.
Zwischen ergebnis und Videoende liegen höchstens 12 Sekunden, und jede davon gehört zu warum oder pointe.
Format-Hinweise: Beim Zeitverlauf ist das „Rennen“ die laufende Jahreszahl, die Wendungen sind Knicke der Kurve. Bei Was bleibt ist es die Treppe der Abzüge, die Wendungen sind die Posten, mit denen niemand rechnet. Beim Lernvideo ist es die Modellperson, die Schritt für Schritt durch die Regel läuft. Beim Duell nennt der Hook beide Seiten konkret.
Kein Schlusssatz mit Aufforderung und kein gesprochener Folgen-Aufruf; die Kommentarfrage steht nur in der Caption. Schreibe zusätzlich im Feld folgen_hinweis eine kurze Textzeile (höchstens 8 Wörter), die nicht gesprochen wird und nur in Testvideos unter der Schlusskarte steht: an den Inhalt gebunden („Teil 2 ist im Profil“, „Jeden Tag eine Geldfrage im Profil“), kein Tausch, keine Belohnung, kein Druck, kein „Folg mir“. Ob sie ins Video kommt, entscheidet der Testblock.
SPRACHE: Etwa 150 bis 190 gesprochene Wörter. Das ist ein Richtwert für die Länge, keine Sperre; die Stimme bestimmt die Videolänge. Es gibt keine Tempo-, Silben- oder Pausenvorgaben. Kurze, vollständige Sätze, meist 4 bis 10 Wörter; höchstens 2 Sätze mit nur ein oder zwei Wörtern im ganzen Skript. Neutral erzählt, ruhig und sachlich, kein Sportreporter: Du-Ansprache höchstens im Hook, danach neutral formulieren („Wer wechselt, wird doppelt so lange überholt.“ statt „Du wirst …“). Zahlen im Sprechtext gerundet und ausgeschrieben, im Bild exakt. Der Suchbegriff fällt wörtlich im ersten gesprochenen Satz.
SELBSTPRÜFUNG (Feld selbstpruefung: jede Zeile mit „ja“ oder dem behobenen Fehler)
1. Frage im ersten Satz, Tipp möglich, Suchbegriff wörtlich enthalten.
2. Zähler laufen spätestens ab 3 s; kein Erklärblock vor der ersten Wendung.
3. Erste Wendung bis 15 s; danach alle 8 bis 10 s ein neuer Befund.
4. Zweite Frage gesetzt (Segment nennen) und erst in der Pointe aufgelöst.
5. Ergebnis nicht vor ca. 75 % der Wörter; danach höchstens warum, pointe, schlusskarte.
6. Jede Zahl mit Quelle und Jahr; Rechenweg nachgerechnet; Annahmen genannt; „geplant“ gekennzeichnet.
7. Finanzregeln eingehalten (Modell, keine Empfehlung, keine Ausschlussthemen).
8. Sprechtext im Textformat (keine Ziffern, Zeichen, Abkürzungen, Auslassungspunkte, Gedankenstriche, GROSS-Wörter, Tags).
9. Du nur im Hook; kein Aufruf; letzte Zeile ist ein Fazit.
10. Wortzahl genannt (Richtwert 150 bis 190)."""

A1_STIMME = """TEXTFORMAT FÜR DIE STIMME (ElevenLabs „Ben“, Modell v4; gilt ausnahmslos für jeden sprechtext, Skill stimme-elevenlabs)
Je Segment zwei Fassungen: text (Untertitel im Bild, Ziffern erlaubt) und sprechtext (nur für die Stimme). Der Text entscheidet, wie gleichmäßig die Stimme spricht; Tempo-Sprünge entstehen durch Sonderzeichen, großgeschriebene Wörter, Tags, Ziffern, Abkürzungen und Sprachmischung. Das Video richtet sich später nach der Stimme, nie umgekehrt.
- Eine Zeile pro Satz; Leerzeile zwischen den Phasen.
- Kurze, vollständige Sätze, meist 4 bis 10 Wörter. Höchstens 2 Sätze mit nur ein oder zwei Wörtern im ganzen Skript; viele Einzelwörter hintereinander klingen abgehackt.
- Jeder Satz endet mit Punkt oder Fragezeichen. Höchstens 3 Ausrufezeichen im ganzen Skript. Kein „Los geht’s“.
- Erlaubte Satzzeichen: Punkt, Komma, Fragezeichen, Doppelpunkt, selten Ausrufezeichen.
- Verboten: Auslassungspunkte, Gedankenstriche als Pause, Klammern, Anführungszeichen um Regieanweisungen, Emojis, break-Marken. Eine Pause entsteht durch das Satzende; eine längere Pause durch einen neuen Satz, nicht durch Zeichen.
- Alles ausschreiben: Zahlen („tausendzweihundert Euro“, „zwanzig Prozent“, „neunzehn Euro neunzig“), Jahreszahlen („zweitausendsiebenundzwanzig“), Daten („am ersten Januar“), Einheiten („Kilowattstunden“), Zeichen (Euro, Prozent, Paragraf, und).
- Keine Abkürzungen: „zum Beispiel“, „circa“, „Millionen“ immer ausgeschrieben.
- Zahlen runden: im Sprechtext rund, im Bild exakt. Lange Zahlen in sprechbare Stücke teilen („rund zweiundvierzigtausend Euro“).
- Kein Wort in Großbuchstaben. Betonung entsteht durch die Stellung im Satz: das wichtige Wort ans Satzende oder in einen eigenen kurzen Satz.
- Nur Deutsch. Englische Wörter und Marken so schreiben, wie man sie spricht („G T A sechs“); Buchstabenfolgen einzeln mit Leerzeichen („E T F“).
- Keine Gefühls- und Geräusch-Tags in eckigen Klammern, keine Regieanweisungen im Text (sie werden mitgesprochen oder verändern das Tempo).
Beispiel: text „Klar, die Prämie. Oder?“ wird zu sprechtext „Klar, die Prämie gewinnt.“ und in der nächsten Zeile „Oder doch nicht?“."""

A1_CAPTION = """CAPTION (nicht im Video, nur Beschreibung)
Genau eine Zeile: Hook-Frage mit Suchbegriff? Emoji Ich hab’s simuliert. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation
Der Suchbegriff steht vorn in der Hook-Frage (dasselbe Wort wie in der Titelfrage im Bild). Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral, keine Quellen, keine Hinweise wie „keine Anlageberatung“."""

A1_IDEEN_JSON = """{"gestrichen":["naheliegende Idee in Stichworten"],"nachfrage_geprueft":"Suchvorschläge ja/nein · Trends ja/nein · Stand <Datum>","ideen":[{"nr":1,"punkte":"<Summe>/21","titel":"Titelfrage im Bild, Suchbegriff vorn, höchstens 9 Wörter","feld":"Rente und Vorsorge | Netto, Steuern, Abgaben | Krankenkasse und Pflege | Arbeit und Gehalt | Preise und Lebenshaltung | Wohnen und Energie | Geld früher und heute | Versteckte Mechaniken und Kurioses","format":"Duell | Zeitverlauf | Was bleibt | Lernvideo","suchbegriff":"ein Wort oder Wortpaar für die TikTok-Suche, steht in der Titelfrage","nachfrage":"Suchformulierung(en) · Quelle · Datum bzw. Anlass mit Datum","winkel":"Winkel-Werkzeug und was genau neu ist","vermeidet":"die naheliegende Fassung, die wir nicht machen","originalitaet":"Suche: Begriffe · Ergebnis: kein deutsches Video gefunden | englisch: … | ungeprüft","zutat":"welche Zutat des Tages (oder „keine“)","alternativen":["nur bei Duell: Seite A","Seite B (bei anderen Formaten leere Liste)"],"tipp":"was der Zuschauer in den ersten 3 s rät und warum viele falsch liegen","ergebnis_ansatz":"Auflösung: Rechenansatz und Größenordnung des Euro-Ergebnisses (kein erfundener Wert)","zweite_frage":"die zweite Überraschung, die nach dem Ergebnis kommt","hook":"erster gesprochener Satz: die Frage, zu der man tippen kann, mit Suchbegriff (kein Ergebnis vorweg)","warum_relevant":"wen es betrifft und warum es viele interessiert","weiterschicken":"wem man das Video schicken würde und warum","diskussion":"warum sich Zuschauer darüber austauschen würden (nur intern, nicht im Video)","daten":"Quellen mit Jahr, die die Rechnung tragen","bildidee":"eine Szene, in der man die Rechnung laufen sieht","laender":"Deutschland | Land","risiko":"Recht, Plattform, „geplant“-Hinweis; oder „keins“"}]}"""

A1_SKRIPT_JSON = """{"skripte":[{"nr":1,"titel":"","thema":"","feld":"","format":"Duell | Zeitverlauf | Was bleibt | Lernvideo","laender":"","suchbegriff":"","nachfrage":"Suchformulierung · Quelle · Datum","offene_frage":"was der Zuschauer tippt","aufloesung":"Ergebnis in einem Satz","zweite_frage":{"text":"","gesetzt_in":"wendung2","aufgeloest_in":"pointe"},"folgen_hinweis":"kurze, nicht gesprochene Textzeile (höchstens 8 Wörter), nur für Testvideos","teil":1,"segmente":[{"id":"hook","phase":"hook","text":"Untertitel-Text (Ziffern erlaubt)","sprechtext":"Sprechtext im Textformat, eine Zeile pro Satz"}],"woerter":0,"rechenweg":"Formel, Eingaben, Rechenschritte, Ergebnis","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","originalitaet":"Suche (deutsch) und Ergebnis","dramaturgie":["Hinweis mit Phase: wo die Spannung steigt, welcher Moment visuell besonders ist"],"selbstpruefung":["1 ja","2 ja","..."]}]}"""

# ---------------------------------------------------------------- Account 2
A2_ROLLE = """ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Stell dir vor“ (@stelldirvor.pov). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Gedankenexperimente, nach denen Menschen nachweislich suchen, mit einem Winkel, den noch niemand gemacht hat, und einer messbaren Größe, die man beim Zuschauen wachsen sieht.

UNSER KANAL
- Nische: „Was wäre, wenn …“ und „Was passiert, wenn …“ aus Wissenschaft, Naturphänomenen, Körper und Skurrilem.
- Format: 3D-POV-Zeitraffer ohne Stimme, 80 Sekunden. Der Zuschauer erlebt ein Ereignis von einem Standpunkt aus der Ich-Perspektive und sieht eine messbare Größe wachsen. Es gibt nur drei Textebenen: eine Titelfrage am Anfang, links eine laufende Messwert-Anzeige (Zahl mit Etikett, z. B. Temperatur, Pegel, Jahr, die bis zu einem Höhepunkt mit „HIER“ läuft) und kurze kursive Sätze. Am Ende ein dunkler Abspann mit Titelfrage und Faktenzeile. Ton ist nur Atmo und Sounddesign; der Account bleibt stumm.
- Die Orte dürfen überall liegen, bevorzugt greifbar und oft in Deutschland; Sprache ist Deutsch. Auch Themen mit „in 5 Sekunden“-Rahmen sind erlaubt, wenn sie sich gut zeigen lassen. Körper-Themen werden als Reise in den Körper gezeigt (Standpunkt im Inneren, Messgröße ist ein echter Körperwert).
- WELT UND BEWEGUNG (wichtig): Die Welt passt zum Thema. Bevorzuge oft Natur (Meer, Küste, Strand, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe); Städte nur, wenn sie wirklich passen. Variiere Ort, Tageszeit (Tag, Sonnenauf- und -untergang, Nacht) und Standpunkt (nicht immer „von oben aus dem Fenster“: Strandblick aufs Meer, Bootsdeck, Waldlichtung, Gipfel, Straße, Dünen, Eisfläche …). Es darf nie „gewartet“ werden: Im Zeitraffer muss alle paar Sekunden etwas Sichtbares passieren (Licht, Wetter, Wasser, Vegetation, Menschen, Tiere, Fahrzeuge), und die Messwert-Anzeige muss zur sichtbaren Veränderung passen.
- Die Kamera darf sich langsam bewegen (weiche Fahrt, Schwenk, Zoom); sonst lange durchgehende Einstellungen. Erlaubt sind höchstens 1 bis 3 gezielte harte Schnitte, nur am Höhepunkt oder bei einem Maßstabs- bzw. Szenensprung.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle, danach schreibst du die Skripte. Ich baue daraus die 3D-Szene."""

A2_REGELN_IDEEN = """REGELN FÜR IDEEN
- Jede Idee erfüllt: ein Ereignis, ein fester Standpunkt, eine messbare Größe für die Anzeige (Start- und Endwert belegbar). Das Ereignis lässt sich auf Countdown-Null bei ca. 8 Sekunden legen. In jeder Phase verändert sich die Welt sichtbar; nie „warten“.
- THEMENFELDER (Feld "feld"): Die 10 Ideen verteilen sich auf mindestens 5 Felder; die Felder 1 bis 4 je mindestens einmal.
  1. Naturphänomene: Wetter, Meer, Erde, Licht (Polarlicht, Gezeiten, Kugelblitz, Meeresleuchten, Föhn, Sandsturm, Moor, Geysir). Ein Phänomen wird stärker, bleibt aus oder trifft einen ungewohnten Ort.
  2. Körper und Leben: „was passiert, wenn man …“ ist der stärkste deutsche Suchstamm (nicht schlafen, nichts essen, Salzwasser trinken, Kaugummi verschlucken). Als Reise in den Körper: Standpunkt im Inneren, Messgröße ist ein echter Körperwert.
  3. Tiere und Ökosysteme: eine Art fehlt, kehrt zurück oder wird viel mehr (Mücken, Bienen, Wölfe, Plankton). Kettenreaktion an einem Ort, Stufe für Stufe.
  4. Physik und Chemie im Alltag: eine Naturkonstante oder ein Stoff verhält sich für kurze Zeit anders, an einem greifbaren Ort (Wasser gefriert bei anderer Temperatur, Reibung fehlt auf einer Straße, Luft ist dichter).
  5. Weltraum mit eigener Prämisse: kleiner Maßstab statt Weltuntergang (ein münzgroßes Objekt, fünf Sekunden, ein einzelner Ort); die Klassiker der ANTI-LISTE sind gesperrt.
  6. Skurriles: bizarre Gedankenexperimente mit echter Rechnung (ein Alltagsding in absurder Menge oder Größe an einem echten Ort).
  7. Technik und Versorgung: Strom, Wasser, Kühlung, Netze an einem konkreten Ort (nicht weltweit); Stunde für Stunde, was wann ausfällt.
  8. Geschichte umgedreht (höchstens 1 von 10): ein echter Ort, eine Größe anders; keine reale Tragödie.
- SUCHSTÄMME für die Nachfrage, deutsch: was passiert wenn man · was passiert wenn · was wäre wenn · wie lange kann man · wie lange würde · kann man überleben · was passiert mit dem körper wenn · warum gibt es (Naturphänomene). Englisch (zeigt, was als Nächstes nach Deutschland kommt): what would happen if · what if · how long would · could you survive
- ANLÄSSE: Naturereignisse mit Datum in den nächsten 8 Wochen (Sonnen- und Mondfinsternis, Sternschnuppenströme, Polarlicht-Phasen, Sturm- und Frostsaison, Zugvogelzeit, Jahreszeitenwechsel), wissenschaftliche Meldungen der Woche.
- WINKEL-WERKZEUGE (Feld "winkel"):
  1. Klein statt groß: das gesuchte Riesenthema im kleinsten Maßstab (eine Münze, ein Garten, ein Glas Wasser).
  2. Kurz statt ewig: fünf Sekunden, eine Minute, eine Nacht.
  3. Die Sekunde danach: nicht das Ereignis, sondern was unmittelbar folgt.
  4. Die Leiter: Stunde 1, 24, 48, 72 bzw. Stufe für Stufe mit einer echten Messgröße.
  5. Wer zuerst: Welches Tier, Gerät oder Organ merkt es als Erstes, welches gar nicht?
  6. Der Ort macht es neu: das Phänomen an einem deutschen, greifbaren Ort statt „auf der Erde“.
  7. Umkehren: die bekannte Frage rückwärts (nicht „alle springen“, sondern „alle stehen an einem Ort: wie groß ist er?“).
  8. Die Zahl, die niemand kennt: eine echte Messgröße, die überrascht (Druck, Lautstärke, Salzgehalt, Zeit).
- MASSSTAB meist persönlich: Mindestens 6 der 10 Ideen spielen an einem greifbaren Ort (Strand, Garten, Straße, Boot, Hütte …) mit einer Skala, die man sich vorstellen kann; höchstens 4 sind global oder kosmisch, auch dann aus der Ich-Perspektive.
- WELTVIELFALT: Welttyp, Standpunkt und Tageszeit anders als im vorigen Video; nie zwei gleiche Welttypen hintereinander. Natur zuerst.
- Die Titelfrage („Was wäre, wenn …?“ bzw. „Was passiert, wenn …?“) macht eine Folge neugierig, die man nicht errät, und enthält den Suchbegriff.
- AUSGESCHLOSSEN: Opferdarstellung, Gore, reale Tragödien · Gesundheitsversprechen und alles, was zum Nachmachen einlädt (Dosierungen von Medikamenten oder Nahrungsergänzung, Mutproben, Fasten- oder Schlafentzug als Anleitung) · Parteipolitik. Körper-Themen nur erklärend, sachlich, mit belegten Werten und ohne Empfehlung. Katastrophen enden sachlich.
- BEWERTUNG (Feld "punkte", 0 bis 3 Punkte je Kriterium, höchstens 21): Nachfrage (3 = in Suchvorschlägen deutsch ODER stark englisch, dazu steigend oder mit Anlass) · Neugier (3 = die Folge errät man nicht; man will es sehen) · Winkel (3 = Prämisse so auf Deutsch nicht gefunden) · Sichtbarkeit (3 = alle 2 bis 3 Sekunden ändert sich etwas im Bild) · Messgröße (3 = echte Zahl mit belegtem Verlauf bis zum Höhepunkt) · Belegbarkeit (3 = Faktenzeile und Rechnung aus seriösen Quellen) · Greifbarkeit (3 = persönlicher Maßstab, Ort, den man kennt). Unter 14 Punkten nicht vorschlagen. Bei Sichtbarkeit oder Belegbarkeit 0 Punkte: raus.
- Kein Thema, zu dem es auf Deutsch schon ein Video mit der gleichen Prämisse gibt (Regel ORIGINALITÄT). Englische Vorbilder sind erlaubt, wenn sie nicht auf der ANTI-LISTE stehen, aber nur mit eigenem Skript und deutlich anderem Design (anderer Ort, andere Dramaturgie).
- Keine Dopplung mit unseren bisherigen Videos.
- Die Idee muss sich visuell tragen: Beschreibe, was sich in der Welt jede Phase sichtbar verändert."""

A2_ANTI = """ANTI-LISTE (die großen Was-wäre-wenn-Klassiker, abgenutzt und gesperrt; nie vorschlagen, auch nicht umbenannt oder an anderem Ort)
Sonne explodiert, verschwindet oder ist kurz weg · Erde hört auf sich zu drehen oder dreht schneller · Mond stürzt ab, verschwindet, kommt näher · Asteroid oder Komet schlägt ein · Sauerstoff, Atmosphäre oder Schwerkraft ist für Sekunden weg · Riesen-Tsunami trifft eine Stadt · Supervulkan, Yellowstone · stärkstes Erdbeben · Schwarzes Loch kommt näher · alles Eis schmilzt, neue Eiszeit · Zombie-Ausbruch · Riesenmonster · Loch durch die Erde · Fall in den Jupiter · ohne Raumanzug im All · Papier 42-mal falten · du schrumpfst oder wächst · Aufwachen im Jahr 3000 · alle Menschen springen gleichzeitig · Erde ist flach oder hat Ringe · Magnetfeld kippt · 1.000 Jahre Regen · weltweiter Stromausfall · Schall oder Licht wird langsam
Zu einem gesperrten Klassiker ist nur eine Fassung erlaubt, die mit einem Winkel-Werkzeug eine ANDERE FRAGE stellt (anderer Maßstab, andere Messgröße, anderes Ereignis im Bild). Im Zweifel verwerfen."""

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

A2_IDEEN_JSON = """{"gestrichen":["naheliegende Idee in Stichworten"],"nachfrage_geprueft":"Suchvorschläge ja/nein · Trends ja/nein · Stand <Datum>","ideen":[{"nr":1,"punkte":"<Summe>/21","titel":"Titelfrage „Was wäre, wenn …?“ bzw. „Was passiert, wenn …?“ mit Suchbegriff","feld":"Naturphänomene | Körper und Leben | Tiere und Ökosysteme | Physik und Chemie im Alltag | Weltraum mit eigener Prämisse | Skurriles | Technik und Versorgung | Geschichte umgedreht","massstab":"persönlich | global","suchbegriff":"ein Wort oder Wortpaar für die TikTok-Suche, steht in der Titelfrage","nachfrage":"Suchformulierung(en) · Quelle · Datum bzw. Anlass mit Datum","winkel":"Winkel-Werkzeug und was genau neu ist","vermeidet":"der Klassiker bzw. die naheliegende Fassung, die wir nicht machen","originalitaet":"Suche: Begriffe · Ergebnis: kein deutsches Video gefunden | englisch: … | ungeprüft","zutat":"welche Zutat des Tages (oder „keine“)","ereignis":"was passiert, in einem Satz","messgroesse":"was die Anzeige zeigt (Größe, Einheit, Start- und Endwert, Quelle)","welt":"Welttyp bzw. Ort","standpunkt":"wo steht der Zuschauer","tageszeit_verlauf":"z. B. Morgen, Mittag, Abend","bewegung":"was sich in der Welt sichtbar verändert, Phase für Phase","kamera":"z. B. langsamer Zoom","zeitraffer":"Faktor oder Echtzeit","hoehepunkt":"was bei HIER passiert","pointe":"Mitnehmen: die eine Erkenntnis bzw. Faktenzeile","weiterschicken":"wem man das Video schicken würde und warum","diskussion":"warum sich Zuschauer austauschen würden (nur intern)","daten":"belegbare Quellen/Zahlen verfügbar","laender":"Ort/Land","risiko":"kurz; oder „keins“"}]}"""

A2_SKRIPT_JSON = """{"skripte":[{"nr":1,"titel":"Titelfrage","thema":"","feld":"","suchbegriff":"","nachfrage":"Suchformulierung · Quelle · Datum","folgen_hinweis":"kurze Abspann-Zeile, nur für Testvideos","teil":1,"laenge_s":80,"welt":"","standpunkt":"","tageszeit_verlauf":"","zeitraffer":"","kamera":"","anzeige_plan":[{"von_s":0,"bis_s":8,"etikett":"ETIKETT (Phase 1: Countdown bis zum Ereignis)","start":"","ende":"","einheit":"","unter":"Statuszeile in Versalien"}],"saetze":[{"t_ca":4.8,"text":"Satz mit 3 bis 9 Wörtern."}],"faktenzeile":"","rechenweg":"Formel, Eingaben, Rechenschritte","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","originalitaet":"Suche (deutsch) und Ergebnis","dramaturgie":["Hinweis mit Zeitpunkt: was in der Welt passiert, Licht, Kamera"],"selbstpruefung":["Satzzahl ..","Fakten ..","Anzeige passt zum Zeitraffer ..","Verbote .."]}]}"""

KONFIG = {
    "simulierbar": {
        "name": "Simulierbar", "handle": "@simulierbar", "praefix": "acc1",
        "rolle": A1_ROLLE, "regeln_ideen": A1_REGELN_IDEEN, "format": A1_FORMAT_SKRIPT, "stimme": A1_STIMME,
        "caption": A1_CAPTION, "ideen_json": A1_IDEEN_JSON, "skript_json": A1_SKRIPT_JSON,
        "anti": A1_ANTI, "zutaten": A1_ZUTATEN,
        "bisher": ["GTA 6 weltweit", "Spurwechsel / Reißverschluss", "Treppe oder Aufzug", "200 € oder 100 € steuerfrei",
                   "Fußgängerampel (Rennen oder Gehen)", "Steuererklärung oder Überstunden"],
        "lernstand": ("Startwerte (Recherche 02.11.2026, 50 Videos von 6 Konten, öffentliche Zahlen) und eigene erste Zahlen:\n"
                      "- Treffer (über 100.000 Aufrufe) waren bisher meist Duell-Fragen zu großen Lebensentscheidungen mit großer Euro-Endzahl (Mieten oder Kaufen, Leasing, Studium oder Ausbildung), Länge 67 bis 72 Sekunden.\n"
                      "- Kleine Einzeltipps (Reifendruck, Einkaufskasse, Händewaschen) erreichen kaum Aufrufe. Stark gesuchte Themen (Rente, Steuererklärung, Kindergeld, Grundsicherung) liefen in der Standardfrage schwach; seit 09.11.2026 sind sie mit neuem Winkel und Euro-Folge für eine Modellperson erlaubt.\n"
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
    return "BISHERIGE VIDEOS (nicht wiederholen; ausgenommen sind nur Folgeteile eigener Treffer, Regel ORIGINALITÄT 8):\n" + "\n".join(f"- {t}" for t in bisher)


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
               "Beginne mit einer Zeile „Gestrichen (naheliegend): …“, dann eine Zeile „Nachfrage geprüft: Suchvorschläge ja/nein · Trends ja/nein · Stand <Datum>“. Antworte danach als nummerierte Liste von 1 bis 10, je Idee eine Karte mit der Kopfzeile „IDEE <Nr> · <Punkte>/21 · Feld · Format bzw. Maßstab“. Jede Idee mit den Feldern, die im Beispiel unten stehen, jeweils eine kurze Zeile je Feld. Danach frage mich: „Welche wählst du?“\nFelder (Beispiel als JSON, nur zur Orientierung, antworte als lesbaren Text):\n" + c["ideen_json"])
    teile = [c["rolle"], c["regeln_ideen"], NACHFRAGE, ORIGINAL, SUCHBEGRIFF, c["anti"], FAKTEN, lernstand_block(konto, ls), bisher_block(b),
             ZUTATEN_KOPF.replace("{{ZUTATEN}}", zutaten)]
    if wunsch:
        teile.append("MEIN WUNSCH FÜR HEUTE: " + wunsch)
    teile.append("AUFGABE\nWir brauchen zehn Videoideen in unserer Nische für den morgigen Tag: Themen mit belegter Suchnachfrage und einem Winkel, den auf Deutsch noch niemand gemacht hat. Gehe so vor: Nachfrage sammeln (mindestens 30 Rohfunde), die 20 naheliegendsten Ideen streichen, je Fund einen Winkel suchen, Originalität per Websuche prüfen, bewerten, die 10 besten wählen. Sie sollen unterschiedlich sein (Verteilung über Themenfelder und Formate bzw. Welten) und zum Lernstand passen. Prüfe jede Idee vor der Ausgabe gegen die Regeln, die ANTI-LISTE, die Websuche und die Faktenlage; schreibe nur Ideen auf, die du belegen kannst.\n" + antwort)
    return "\n\n".join(teile)


def skript_befehl(konto, ideen, lernstand=None, format="text", testbloecke=None):
    """ideen: Liste von Dicts (die gewählten Ideen) oder Text. testbloecke: Ergebnis von tools/testblock.py (nur Claude Code)."""
    c = KONFIG[konto]
    ls = lernstand or c["lernstand"]
    gew = ideen if isinstance(ideen, str) else json.dumps(ideen, ensure_ascii=False, indent=1)
    antwort = ("Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, kein Text davor oder danach) in genau dieser Form, mit einem Eintrag je gewählter Idee:\n" + c["skript_json"]
               if format == "json" else
               "Gib je Idee das Skript lesbar aus: Titel, Nachfrage, offene Frage, Auflösung und zweite Frage (soweit in der Feldstruktur vorhanden), Segmente mit Text und Sprechtext (bzw. Sätze und Anzeige-Plan), Rechenweg, Annahmen, Quellen, Caption, Dramaturgie-Hinweise, Selbstprüfung. Feldstruktur zur Orientierung:\n" + c["skript_json"])
    teile = [c["rolle"], FAKTEN, SPANNUNG, c["format"]]
    if c["stimme"]:
        teile.append(c["stimme"])
    teile += [c["caption"], lernstand_block(konto, ls)]
    teile += [b for b in [folgeteil_block(i) for i in (ideen if isinstance(ideen, list) else [])] + [testblock_block(konto, testbloecke)] if b]
    teile += ["GEWÄHLTE IDEEN (für diese schreibst du jetzt je ein makelloses Skript)\n" + gew,
              "AUFGABE\nSchreibe für jede gewählte Idee ein makelloses, sendefertiges Skript nach allen Regeln oben. Erfinde nichts; jede Zahl mit Rechenweg und Quelle. Kippt bei der Recherche das Ergebnis (andere Antwort auf die Titelfrage), rechne nichts schön, sondern melde es. Prüfe dein Skript am Ende selbst (Liste SELBSTPRÜFUNG, falls oben vorhanden; sonst Satzzahl, Fakten, Ton, Verbote) und trage das Ergebnis in selbstpruefung ein. Findest du beim Prüfen einen Fehler, korrigiere ihn vor der Ausgabe.\n" + antwort]
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
    skript = skript_befehl(k, "[Hier die gewählten Ideen einfügen (Titel und Felder aus Schritt 1)]", format="text")
    stimm_hinweis = " und beim Sprechtext dem Skill `stimme-elevenlabs`" if c["stimme"] else ""
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

> Diese Notiz wird mit `python3 tools/chat_befehle.py` erzeugt (Textquelle: `tools/chat_befehle.py`; die Texte dort folgen dem Skill `themen-skript`{stimm_hinweis}). Änderungen am Befehl dort vornehmen, nicht hier. Der **Lernstand** im Befehl wird täglich fortgeschrieben ([[Lernschleife und Insights]]).

Ablauf und Hintergrund: [[Claude-Chat-Workflow]]. Regeln: [[Regelwerk {'Simulierbar' if k == 'simulierbar' else 'Account 2'}]]. Account **{c['handle']}**.

## Standardweg: Ideen-Studio
Im **Ideen-Studio** (Artifact) erzeugst du die Ideen per Klick; Recherche und Skript schreibt die Tages-Sitzung von Claude Code mit demselben Befehl wie Schritt 2 (plus Websuche, `python3 tools/chat_befehle.py --skript-auftrag …`). Ablauf: [[Claude-Chat-Workflow]].

## Notweg von Hand (nur wenn das Studio Claude Code nicht erreicht)
1. Neues Gespräch in Claude Chat öffnen (Websuche an), **Schritt 1** unten einfügen. Du bekommst 10 Ideen.
2. Ideen wählen (in der Regel zwei: Mittag und Abend des nächsten Tages).
3. **Schritt 2** einfügen, die gewählten Ideen einsetzen. Du bekommst je Idee ein Skript.
4. Beide Skripte in eine Claude-Code-Sitzung einfügen und dazuschreiben, dass sie freigegeben sind. Claude Code prüft jede Zahl, korrigiert Faktenfehler mit Vermerk und baut die Videos.

## Schritt 1: zehn Ideen
```text
{ideen}
```

## Schritt 2: Skripte für die gewählten Ideen
```text
{skript}
```

## Zutaten-Listen
Das Cockpit zieht für jeden Ideen-Auftrag je Liste {ZUTATEN_JE_LISTE} Einträge zufällig und setzt sie unter „ZUTATEN DES TAGES“ ein. Seit 09.11.2026 sind die Zutaten nur noch freiwillige Startpunkte für einen Winkel; Pflicht ist der Beleg für Nachfrage (Skill `themen-skript`). Hintergrund: [[Originalität und Themenfindung]].

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
    a1 = WURZEL / "hirn" / "02-Simulierbar" / "1-Skripterstellung" / "Befehl Ideen und Skripte Simulierbar.md"
    a2 = WURZEL / "hirn" / "03-stelldirvor-pov" / "1-Skripterstellung" / "Befehl Ideen und Skripte Account 2.md"
    for ziel_notiz in (a1, a2):
        ziel_notiz.parent.mkdir(parents=True, exist_ok=True)
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
