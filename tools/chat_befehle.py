#!/usr/bin/env python3
"""Befehle an Claude Chat: 10 Videoideen und danach makellose Skripte, je Account.

Einzige Textquelle für (1) die Hirn-Notizen „Befehl Ideen und Skripte …“ und (2) das Ideen-Studio (Artifact).
Aufruf:  python3 tools/chat_befehle.py            schreibt beide Hirn-Notizen und docs/ideen-studio/befehle.json
Der LERNSTAND wird täglich aus den Buffer-Zahlen fortgeschrieben (Notiz „Lernschleife und Insights“) und im
Ideen-Studio aus der Datenbank gelesen; hier steht nur der Startwert.
"""
import json
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
DATUM = "2026-11-02"

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

# ---------------------------------------------------------------- Account 1
A1_ROLLE = """ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Simulierbar“ (@simulierbar). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Themen, die viele Menschen betreffen, mit klarem Aha-Moment und einer Zahl, die man sich merkt.

UNSER KANAL
- Nische: „Alltag durchgerechnet“, ab sofort ausschließlich GELD. Jedes Video beantwortet eine Geldfrage mit einer eigenen Modellrechnung und endet mit einem konkreten Ergebnis in Euro.
- Format: gesichtsloses 3D-Simulationsvideo, Deutsch, 65 bis 80 Sekunden, ruhige KI-Stimme („Ben“), meist ein Duell oder Rennen zwischen zwei echten Alternativen derselben Entscheidung mit laufenden Zählern; danach Ergebnis, „Warum?“, eine zweite Überraschung und ein Merksatz.
- Themen dürfen Deutschland, die ganze Welt oder andere Länder betreffen; die Sprache bleibt Deutsch. Wir brauchen Flexibilität und endlos viele spannende Themen.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus Animation, Stimme und Schnitt."""

A1_REGELN_IDEEN = """REGELN FÜR IDEEN
- Nur GELD. Das Ergebnis muss in Euro (bzw. passender Währung) ausgedrückt werden können und aus einer eigenen, nachvollziehbaren Modellrechnung stammen.
- Ein Duell vergleicht nur echte Alternativen derselben Entscheidung (kein „Steuererklärung gegen Überstunden“-Unsinn).
- GEWICHTUNG (Pflicht): Mindestens 6 der 10 Ideen sind Duelle zu großen Lebensentscheidungen mit großer Euro-Endzahl (z. B. Studium oder Ausbildung, Mieten oder Kaufen, Auto kaufen oder leasen, Kind, Rente bzw. Vorsorge; auch Wohnen, Arbeit, Familie, Steuern, Energie über Jahre). Die übrigen dürfen andere Geldthemen sein; kleine Alltagstipps nur als Ausnahme (höchstens 1 von 10) und nur, wenn die Jahressumme wirklich überrascht.
- Ausgeschlossen: Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Empfehlungen für Anbieter, Banken, Versicherer oder Broker, Parteipolitik, riskantes Nachahmen, Kaufaufrufe, „schnell reich“.
- Finanzthemen nur als Modellrechnung, nie als Anlageberatung.
- Keine 1:1-Kopie eines fremden Videos: gleiches Thema nur mit eigenem Blickwinkel, eigener Rechnung und eigenen Sätzen.
- Keine Dopplung mit unseren bisherigen Videos."""

A1_FORMAT_SKRIPT = """AUFBAU DES SKRIPTS (feste Reihenfolge, genau diese Phasen)
1. hook (0 bis 5 s): Duell-Frage oder Du-Szenario; kurzer erster Satz, die Stimme setzt sofort ein.
2. regeln: die Spielregeln als Mini-Fakten (kurz, mit konkreten Zahlen der Modellperson).
3. falle (Denkfalle, bis ca. 16 s): „Klar, …. Oder?“ ruhig, kein „Los geht’s“.
4. rennen: das Duell mit laufender Uhr bzw. Zählern; ruhiger Erzähler, kein Sportreporter.
5. folgen (bei ca. 20 s, höchstens 2 s): genau dieser Satz: „Folg mir, damit du nichts verpasst.“
6. wendung1 (bei 18 bis 25 s), danach alle 8 bis 10 s eine weitere Wendung oder ein Führungswechsel (wendung2 …).
7. ergebnis: exakte Euro-Zahl, dann
8. warum: höchstens zwei Faktoren,
9. ueberraschung: eine zweite Überraschung,
10. merksatz: ein Satz, den man weitererzählt,
11. schluss: genau dieser Satz: „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“
Der letzte Gedanke soll zum ersten zurückführen (Schleife).
Länge: 150 bis 190 gesprochene Wörter (ca. 65 bis 80 Sekunden bei ruhigem, flüssigem Tempo von rund 2,3 Wörtern pro Sekunde). Es muss natürlich und flüssig klingen: lieber kürzen als hetzen. Sätze meist 2 bis 8 Wörter, Du-Ansprache, Zahlen im Sprechtext gerundet (im Bild exakt)."""

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
Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral, keine Quellen, keine Hinweise wie „keine Anlageberatung“."""

A1_IDEEN_JSON = """{"ideen":[{"nr":1,"titel":"Duell-Frage als Videotitel","alternativen":["Alternative A","Alternative B"],"hook":"erster Satz des Videos","ergebnis_ansatz":"wie die Rechnung geht und in welcher Größenordnung das Euro-Ergebnis liegt (kein erfundener Wert)","warum_relevant":"wen es betrifft und warum es viele interessiert","diskussion":"warum sich Zuschauer darüber austauschen würden (nur intern, nicht im Video)","daten":"welche belegbaren Quellen/Zahlen verfügbar sind","bildidee":"eine Szene, in der man das Duell sieht","laender":"Deutschland | weltweit | Land","risiko":"Recht, Plattform, Ausschlussthemen: kurz"}]}"""

A1_SKRIPT_JSON = """{"skripte":[{"nr":1,"titel":"","thema":"","laender":"","segmente":[{"id":"hook","phase":"hook","text":"Untertitel-Text (Ziffern erlaubt)","sprechtext":"Regie-Text, eine Zeile pro Satz"}],"woerter":0,"rechenweg":"Formel, Eingaben, Rechenschritte, Ergebnis","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","dramaturgie":["Hinweis mit Zeitpunkt"],"selbstpruefung":["Wortzahl ..","Fakten ..","Ton ..","Verbote .."]}]}"""

# ---------------------------------------------------------------- Account 2
A2_ROLLE = """ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Stell dir vor“ (@stelldirvor.pov). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Gedankenexperimente, die jeder sofort verstehen will, mit einer messbaren Größe, die man beim Zuschauen wachsen sieht.

UNSER KANAL
- Format: „Was wäre, wenn …“ als 3D-POV-Zeitraffer ohne Stimme, 80 Sekunden. Der Zuschauer sieht das Ereignis aus der Ich-Perspektive. Es gibt nur drei Textebenen: eine Titelfrage am Anfang, links eine laufende Messwert-Anzeige (Zahl mit Etikett, z. B. Temperatur, Pegel, Jahr, die bis zu einem Höhepunkt mit „HIER“ läuft) und kurze kursive Sätze. Am Ende ein dunkler Abspann mit Titelfrage und Faktenzeile. Ton ist nur Atmo und Sounddesign.
- Themen: spannende Gedankenexperimente mit messbarer Größe und einem Ereignis, das man von einem Standpunkt aus wachsen sieht (Wissenschaft, Natur, Geografie, Geschichte, Technik …). Die Orte dürfen überall liegen: Deutschland, weltweit, andere Länder. Wir brauchen Flexibilität und endlos viele spannende Themen; Sprache ist Deutsch. Auch Themen mit „in 5 Sekunden“-Rahmen sind erlaubt, wenn sie sich gut zeigen lassen.
- WELT UND BEWEGUNG (wichtig): Die Welt passt zum Thema. Bevorzuge oft Natur (Meer, Küste, Strand, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe); Städte nur, wenn sie wirklich passen. Variiere Ort, Tageszeit (Tag, Sonnenauf- und -untergang, Nacht) und Standpunkt (nicht immer „von oben aus dem Fenster“: Strandblick aufs Meer, Bootsdeck, Waldlichtung, Gipfel, Straße, Dünen, Eisfläche …). Es darf nie „gewartet“ werden: Im Zeitraffer muss alle paar Sekunden etwas Sichtbares passieren (Licht, Wetter, Wasser, Vegetation, Menschen, Tiere, Fahrzeuge), und die Messwert-Anzeige muss zur sichtbaren Veränderung passen.
- Die Kamera darf sich langsam bewegen (weiche Fahrt, Schwenk, Zoom), es gibt keine harten Schnitte.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus die 3D-Szene."""

A2_REGELN_IDEEN = """REGELN FÜR IDEEN
- Ein einziges Ereignis, das man von einem festen Standpunkt aus wachsen sieht, mit einer messbaren Größe für die Anzeige (z. B. Temperatur, Wasserstand, Entfernung, Höhe, Jahr, Anzahl).
- Abwechslung: Verschiedene Welten, Standpunkte, Tageszeiten und Themenfelder; nie zwei gleiche Welttypen hintereinander. Natur ausdrücklich bedenken.
- Ohne Opferdarstellung, ohne Gore, ohne reale Tragödien; Katastrophen enden sachlich.
- Keine 1:1-Kopie eines fremden Videos: Themen anderer Kanäle (auch US-Kanäle) sind frei, aber nur mit eigenem Skript und deutlich anderem Design (anderer Ort, andere Dramaturgie).
- Keine Dopplung mit unseren bisherigen Videos.
- Die Idee muss sich visuell tragen: Beschreibe, was sich in der Welt jede Phase sichtbar verändert."""

A2_FORMAT_SKRIPT = """AUFBAU DES SKRIPTS (feste Reihenfolge, 80 Sekunden)
- Titelfrage (steht 0,4 bis 4,4 s oben im Bild, 2 bis 3 Zeilen, deutsch, eine Frage).
- 12 bis 18 kursive Sätze: je 3 bis 9 Wörter, ruhig, Präsens, Aussagesätze, gern Du-Perspektive, Übergänge mit „Dann …“, keine Ausrufezeichen, keine Fragen. Erster Satz bei ca. 4,8 s, der letzte endet spätestens bei 70 s. Jeder Satz beschreibt genau das, was im selben Moment zu sehen ist; Zahlen im Satz stimmen mit der Anzeige überein.
- Bogen: Alltag und erste Anzeichen (5 bis 20 s) · Auslöser, erste Wendung (18 bis 25 s) · Eskalation in Stufen alle 8 bis 10 s (25 bis 50 s) · Annäherung (50 bis 58 s) · Höhepunkt (58 bis 62 s; Anzeige zeigt „HIER“, im Moment selbst kein Satz) · Nachspiel (62 bis 70 s) · Abblende (70 bis 72 s) · Abspann (72 bis 80 s).
- Messwert-Anzeige: läuft von Bild 1 an, 2 bis 4 Etikettwechsel (je Stufe eine neue echte Messgröße), endet bei „HIER“. Raffst du die Zeit, nenne den Zeitraffer-Faktor und eine nachvollziehbare Anzeige-Größe.
- Faktenzeile für den Abspann: „ORT, JAHR · FAKT“ oder „FAKT · FAKT“, eine bis zwei Zeilen, belegbar.
- Keine Stimme, keine Untertitel, kein Logo, keine Sticker, kein Folgen-Aufruf im Bild. Die Kommentarfrage steht nur in der Caption."""

A2_CAPTION = """CAPTION (nicht im Video, nur Beschreibung)
Genau eine Zeile: Hook-Frage mit Suchbegriff? Emoji Ich hab’s durchgespielt. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #waswaerewenn
Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral."""

A2_IDEEN_JSON = """{"ideen":[{"nr":1,"titel":"Titelfrage „Was wäre, wenn …?“","ereignis":"was passiert, in einem Satz","messgroesse":"was die Anzeige zeigt (Größe, Einheit, Start und Ende)","welt":"Natur/Ort-Typ","standpunkt":"wo steht der Zuschauer","tageszeit_verlauf":"z. B. Morgen, Mittag, Abend","bewegung":"was sich in der Welt sichtbar verändert, Phase für Phase","kamera":"z. B. langsamer Zoom","zeitraffer":"Faktor oder Echtzeit","hoehepunkt":"was bei HIER passiert","pointe":"was man mitnimmt","diskussion":"warum sich Zuschauer austauschen würden (nur intern)","daten":"belegbare Quellen/Zahlen verfügbar","laender":"Ort/Land","risiko":"kurz"}]}"""

A2_SKRIPT_JSON = """{"skripte":[{"nr":1,"titel":"Titelfrage","thema":"","welt":"","standpunkt":"","tageszeit_verlauf":"","zeitraffer":"","kamera":"","anzeige_plan":[{"von_s":0,"bis_s":18,"etikett":"ETIKETT","start":"","ende":"","einheit":"","unter":"Unterzeile in Versalien"}],"saetze":[{"t_ca":4.8,"text":"Satz mit 3 bis 9 Wörtern."}],"faktenzeile":"","rechenweg":"Formel, Eingaben, Rechenschritte","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","dramaturgie":["Hinweis mit Zeitpunkt: was in der Welt passiert, Licht, Zoom"],"selbstpruefung":["Satzzahl ..","Fakten ..","Anzeige passt zum Zeitraffer ..","Verbote .."]}]}"""

KONFIG = {
    "simulierbar": {
        "name": "Simulierbar", "handle": "@simulierbar", "praefix": "acc1",
        "rolle": A1_ROLLE, "regeln_ideen": A1_REGELN_IDEEN, "format": A1_FORMAT_SKRIPT, "stimme": A1_STIMME,
        "caption": A1_CAPTION, "ideen_json": A1_IDEEN_JSON, "skript_json": A1_SKRIPT_JSON,
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
    return "BISHERIGE VIDEOS (nicht wiederholen):\n" + "\n".join(f"- {t}" for t in bisher)


def ideen_befehl(konto, lernstand=None, bisher=None, wunsch="", format="text"):
    c = KONFIG[konto]
    ls = lernstand or c["lernstand"]
    b = bisher if bisher is not None else c["bisher"]
    antwort = ("Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, kein Text davor oder danach) in genau dieser Form, mit genau 10 Einträgen:\n" + c["ideen_json"]
               if format == "json" else
               "Antworte als nummerierte Liste von 1 bis 10. Jede Idee mit den Feldern, die im Beispiel unten stehen, jeweils eine kurze Zeile je Feld. Danach frage mich: „Welche zwei wählst du?“\nFelder (Beispiel als JSON, nur zur Orientierung, antworte als lesbaren Text):\n" + c["ideen_json"])
    teile = [c["rolle"], c["regeln_ideen"], FAKTEN, lernstand_block(konto, ls), bisher_block(b)]
    if wunsch:
        teile.append("MEIN WUNSCH FÜR HEUTE: " + wunsch)
    teile.append("AUFGABE\nWir brauchen zehn Videoideen in unserer Nische für den morgigen Tag. Sie sollen unterschiedlich sein (verschiedene Themenfelder, Länder bzw. Welten) und gleichzeitig zum Lernstand passen. Prüfe jede Idee vor der Ausgabe gegen die Regeln und die Faktenlage; schreibe nur Ideen auf, die du belegen kannst.\n" + antwort)
    return "\n\n".join(teile)


def skript_befehl(konto, ideen, lernstand=None, format="text"):
    """ideen: Liste von Dicts (die gewählten Ideen) oder Text."""
    c = KONFIG[konto]
    ls = lernstand or c["lernstand"]
    gew = ideen if isinstance(ideen, str) else json.dumps(ideen, ensure_ascii=False, indent=1)
    antwort = ("Antworte AUSSCHLIESSLICH mit gültigem JSON (kein Markdown, kein Text davor oder danach) in genau dieser Form, mit einem Eintrag je gewählter Idee:\n" + c["skript_json"]
               if format == "json" else
               "Gib je Idee das Skript lesbar aus: Titel, Segmente mit Text und Sprechtext (bzw. Sätze und Anzeige-Plan), Rechenweg, Annahmen, Quellen, Caption, Dramaturgie-Hinweise, Selbstprüfung. Feldstruktur zur Orientierung:\n" + c["skript_json"])
    teile = [c["rolle"], FAKTEN, SPANNUNG, c["format"]]
    if c["stimme"]:
        teile.append(c["stimme"])
    teile += [c["caption"], lernstand_block(konto, ls),
              "GEWÄHLTE IDEEN (für diese schreibst du jetzt je ein makelloses Skript)\n" + gew,
              "AUFGABE\nSchreibe für jede gewählte Idee ein makelloses, sendefertiges Skript nach allen Regeln oben. Erfinde nichts; jede Zahl mit Rechenweg und Quelle. Prüfe dein Skript am Ende selbst (Wortzahl bzw. Satzzahl, Fakten, Ton, Verbote) und trage das Ergebnis in selbstpruefung ein. Findest du beim Prüfen einen Fehler, korrigiere ihn vor der Ausgabe.\n" + antwort]
    return "\n\n".join(teile)


RECHERCHE_CODE = """RECHERCHE (du bist Claude Code mit Websuche; dieser Abschnitt hat Vorrang vor „frage mich vorher“ oben)
- Du arbeitest unbeaufsichtigt: frage nicht zurück, recherchiere selbst. Was du nicht belegen kannst, lässt du weg. Trägt die Idee dann nicht, meldest du das (Status fehler mit Grund und Vorschlag), statt etwas zu erfinden.
- Belege jede Zahl, jedes Datum und jede Regel mit einer Websuche, möglichst bei der Primärquelle (Gesetz, Behörde, amtliche Statistik, Studie, Hersteller). Öffne die Quelle, wenn die Suche nur einen Ausschnitt zeigt. Stand und Gültigkeit müssen zum Video-Tag passen (Jahr, Rechtsstand, Preise).
- Rechne jede Zahl im Rechenweg mit Python nach, nie im Kopf. Im Sprechtext runde Zahlen, im Bild exakte.
- Schreibe jede Quelle als „(F) Titel, Herausgeber, Stand – URL“, Schätzungen als „(S) …“, Annahmen als „(A) …“.
- Antworte nicht im Chat, sondern schreibe das fertige Skript-Objekt (der erste Eintrag von "skripte" in der JSON-Form oben) in das Slot-Dokument (docs/automatik/tages-sitzung.md §3)."""


def code_skript_befehl(konto, idee, lernstand=None, kommentar=""):
    """Befehl für die Tages-Sitzung von Claude Code: derselbe Skript-Befehl wie im Studio (JSON-Form) plus Recherche-Regeln."""
    teile = [skript_befehl(konto, [idee], lernstand=lernstand, format="json"), RECHERCHE_CODE]
    if kommentar:
        teile.append("WUNSCH DES INHABERS ZUR NEUFASSUNG (hat Vorrang; was er nicht kritisiert, bleibt möglichst gleich):\n" + kommentar)
    return "\n\n".join(teile)


# ---------------------------------------------------------------- Hirn-Notizen
def notiz(konto, titel, ordner, zielordner_konto):
    c = KONFIG[konto]
    k = konto
    ideen = ideen_befehl(k, format="text")
    skript = skript_befehl(k, "[Hier die zwei gewählten Ideen einfügen (Titel und Felder aus Schritt 1)]", format="text")
    return f"""---
typ: anleitung
konto: {k}
status: aktuell
datum: {DATUM}
quelle: tools/chat_befehle.py
tags: [konto/{k}, claude-chat, befehl, skript]
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

## Siehe auch
[[Claude-Chat-Workflow]] · [[Lernschleife und Insights]] · [[Regelwerk]] · [[Index]]
"""


def studio_bauen():
    """Baut docs/ideen-studio/ideen-studio.html aus vorlage.html und befehle.json."""
    ziel = WURZEL / "docs" / "ideen-studio"
    daten = (ziel / "befehle.json").read_text(encoding="utf-8")
    kompakt = json.dumps(json.loads(daten), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = (ziel / "vorlage.html").read_text(encoding="utf-8").replace("__BEFEHLE_JSON__", kompakt)
    (ziel / "ideen-studio.html").write_text(html, encoding="utf-8")
    print("gebaut: docs/ideen-studio/ideen-studio.html", round(len(html) / 1024), "KB")


def main():
    a1 = WURZEL / "hirn" / "02-Simulierbar" / "Befehl Ideen und Skripte Simulierbar.md"
    a2 = WURZEL / "hirn" / "03-stelldirvor-pov" / "Befehl Ideen und Skripte Account 2.md"
    a1.write_text(notiz("simulierbar", "Befehl Ideen und Skripte Simulierbar", "02-Simulierbar", "simulierbar"), encoding="utf-8")
    a2.write_text(notiz("stelldirvor", "Befehl Ideen und Skripte Account 2", "03-stelldirvor-pov", "stelldirvor"), encoding="utf-8")
    ziel = WURZEL / "docs" / "ideen-studio"
    ziel.mkdir(parents=True, exist_ok=True)
    daten = {}
    for k, c in KONFIG.items():
        daten[k] = {"name": c["name"], "handle": c["handle"], "praefix": c["praefix"], "lernstand": c["lernstand"], "bisher": c["bisher"],
                    "ideen_vorlage": ideen_befehl(k, lernstand="{{LERNSTAND}}", bisher=["{{BISHER}}"], wunsch="", format="json"),
                    "skript_vorlage": skript_befehl(k, "{{IDEEN}}", lernstand="{{LERNSTAND}}", format="json"),
                    "ideen_text": ideen_befehl(k, format="text"), "skript_text": skript_befehl(k, "{{IDEEN}}", format="text")}
    (ziel / "befehle.json").write_text(json.dumps(daten, ensure_ascii=False, indent=1), encoding="utf-8")
    print("geschrieben:", a1.name, "|", a2.name, "| docs/ideen-studio/befehle.json")
    studio_bauen()


def cli():
    import argparse
    ap = argparse.ArgumentParser(description="Ohne Optionen: Hirn-Notizen, befehle.json und Studio bauen.")
    ap.add_argument("--skript-auftrag", choices=list(KONFIG), help="Skript-Befehl für die Tages-Sitzung ausgeben")
    ap.add_argument("--ideen", help="JSON-Datei mit der gewählten Idee (Objekt oder Liste mit einem Objekt)")
    ap.add_argument("--lernstand", help="Textdatei mit dem aktuellen Lernstand (sonst Startwert)")
    ap.add_argument("--kommentar", default="", help="Wunsch des Inhabers zur Neufassung")
    a = ap.parse_args()
    if not a.skript_auftrag:
        return main()
    if not a.ideen:
        ap.error("--ideen fehlt")
    idee = json.loads(Path(a.ideen).read_text(encoding="utf-8"))
    if isinstance(idee, list):
        idee = idee[0]
    ls = Path(a.lernstand).read_text(encoding="utf-8").strip() if a.lernstand else None
    print(code_skript_befehl(a.skript_auftrag, idee, lernstand=ls or None, kommentar=a.kommentar))


if __name__ == "__main__":
    cli()
