---
typ: anleitung
konto: stelldirvor
status: aktuell
datum: 2026-11-08
quelle: tools/chat_befehle.py
tags: [konto/stelldirvor, claude-chat, befehl, skript]
cssclasses: [konto-stelldirvor, typ-anleitung]
---

# Befehl Ideen und Skripte Account 2

> Diese Notiz wird mit `python3 tools/chat_befehle.py` erzeugt (Textquelle: `tools/chat_befehle.py`). Änderungen am Befehl dort vornehmen, nicht hier. Der **Lernstand** im Befehl wird täglich fortgeschrieben ([[Lernschleife und Insights]]).

Ablauf und Hintergrund: [[Claude-Chat-Workflow]]. Regeln: [[Regelwerk Account 2]]. Account **@stelldirvor.pov**.

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
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Stell dir vor“ (@stelldirvor.pov). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Gedankenexperimente, die jeder sofort verstehen will, mit einer messbaren Größe, die man beim Zuschauen wachsen sieht.

UNSER KANAL
- Format: „Was wäre, wenn …“ als 3D-POV-Zeitraffer ohne Stimme, 80 Sekunden. Der Zuschauer sieht das Ereignis aus der Ich-Perspektive. Es gibt nur drei Textebenen: eine Titelfrage am Anfang, links eine laufende Messwert-Anzeige (Zahl mit Etikett, z. B. Temperatur, Pegel, Jahr, die bis zu einem Höhepunkt mit „HIER“ läuft) und kurze kursive Sätze. Am Ende ein dunkler Abspann mit Titelfrage und Faktenzeile. Ton ist nur Atmo und Sounddesign.
- Themen: spannende Gedankenexperimente mit messbarer Größe und einem Ereignis, das man von einem Standpunkt aus wachsen sieht (Wissenschaft, Natur, Geografie, Geschichte, Technik …). Die Orte dürfen überall liegen: Deutschland, weltweit, andere Länder. Wir brauchen Flexibilität und endlos viele spannende Themen; Sprache ist Deutsch. Auch Themen mit „in 5 Sekunden“-Rahmen sind erlaubt, wenn sie sich gut zeigen lassen.
- WELT UND BEWEGUNG (wichtig): Die Welt passt zum Thema. Bevorzuge oft Natur (Meer, Küste, Strand, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe); Städte nur, wenn sie wirklich passen. Variiere Ort, Tageszeit (Tag, Sonnenauf- und -untergang, Nacht) und Standpunkt (nicht immer „von oben aus dem Fenster“: Strandblick aufs Meer, Bootsdeck, Waldlichtung, Gipfel, Straße, Dünen, Eisfläche …). Es darf nie „gewartet“ werden: Im Zeitraffer muss alle paar Sekunden etwas Sichtbares passieren (Licht, Wetter, Wasser, Vegetation, Menschen, Tiere, Fahrzeuge), und die Messwert-Anzeige muss zur sichtbaren Veränderung passen.
- Die Kamera darf sich langsam bewegen (weiche Fahrt, Schwenk, Zoom); sonst lange durchgehende Einstellungen. Erlaubt sind höchstens 1 bis 3 gezielte harte Schnitte, nur am Höhepunkt oder bei einem Maßstabs- bzw. Szenensprung.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus die 3D-Szene.

REGELN FÜR IDEEN
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
- Die Idee muss sich visuell tragen: Beschreibe, was sich in der Welt jede Phase sichtbar verändert.

ORIGINALITÄT (wichtigste Regel für Ideen; Vorrang vor dem Lernstand und vor allen Beispielen)
Andere Creator fragen dieselbe KI mit ähnlichen Befehlen. Was dir als Erstes einfällt, haben sie auch bekommen, und genau das wollen wir nicht. Wir wollen Themen, die auf Deutsch noch niemand gemacht hat.
1. Schreibe zuerst für dich die 20 naheliegendsten Ideen zu unserer Nische auf und streiche sie alle, dazu alles von der ANTI-LISTE unten (auch umbenannt oder mit anderen Zahlen). Nenne die gestrichenen Ideen in Stichworten (Feld "gestrichen").
2. Baue mindestens 6 der 10 Ideen auf den ZUTATEN DES TAGES auf (Feld "zutat"), jede Zutat höchstens zweimal. Eine Zutat ist ein Ausgangspunkt, kein Zwang; passt eine gar nicht, lass sie weg.
3. Prüfe jede Idee mit der Websuche: Gibt es auf Deutsch schon ein Video zur gleichen Frage (TikTok, YouTube, Instagram)? Suche mit 2 bis 3 deutschen Begriffen. Gefunden: Idee verwerfen und ersetzen. Englische Videos zur gleichen Frage sind erlaubt, wenn unsere Fassung eigenständig ist. Trage im Feld "originalitaet" ein: welche naheliegende Idee du damit vermeidest, die Suchbegriffe und das Ergebnis („kein deutsches Video gefunden“ oder „englisch: …“). Hast du keine Websuche, schreibe „ungeprüft“.
4. Einzigartig UND relevant, beides ist Pflicht: ein ungewöhnlicher Winkel auf etwas, das viele kennen oder betrifft. Die Frage muss ohne Erklärung verständlich sein. Abseitige Nischen fallen genauso raus wie Standardthemen.
5. Zwei Ideen, die sich nur im Zahlenwert oder im Ort unterscheiden, zählen als eine. Der Lernstand sagt, welche Art Thema trägt, nicht welches konkrete Thema du nehmen sollst.
6. WÜRDE MAN DAS JEMANDEM SCHICKEN? Jede Idee muss so sein, dass man das Video einer bestimmten Person weiterschicken würde (Freundin, Kollege, Eltern, Mitbewohner), weil es sie betrifft oder überrascht. Nenne im Feld "weiterschicken", wem und warum. Ideen, die man nur allein anschaut, fallen raus. (Unser einziger Treffer war das einzige Video mit nennenswert vielen Shares.)
7. Ausnahme Folgeteile: Ein nummerierter Folgeteil eines eigenen Treffers (Teil 2, 3 …: gleiches Versprechen, neue Rechnung bzw. neues Szenario) ist von BISHERIGE VIDEOS und der ANTI-LISTE ausgenommen. Solche Folgeteile legt das Cockpit selbst an, wenn ein Video ein Treffer war; schlage du keine eigenen vor.

SUCHBEGRIFF
Jede Idee nennt im Feld "suchbegriff" das Wort, das jemand in die TikTok-Suche tippen würde (z. B. „Studium“, „Pfand“, „Mond“, „Golfstrom“). Es steht in der Titelfrage, möglichst vorn, und später vorn in der Caption. Kein Kunstwort, keine Zahl allein.

ANTI-LISTE (die großen Was-wäre-wenn-Klassiker, gesperrt; nie vorschlagen, auch nicht umbenannt oder an anderem Ort)
Sonne explodiert, verschwindet oder ist kurz weg · Erde hört auf sich zu drehen, dreht schneller oder kreist nicht mehr · Mond stürzt ab, verschwindet, kommt näher oder ist aus Käse bzw. Schokolade · Asteroid oder Komet schlägt ein · Sauerstoff, Atmosphäre oder Schwerkraft ist für Sekunden weg · Riesen-Tsunami bzw. Megawelle trifft eine Stadt · Supervulkan, Yellowstone · stärkstes Erdbeben trifft deine Stadt · Schwarzes Loch kommt näher · Rogue-Planet trifft die Erde · alles Eis schmilzt, neue Eiszeit · Zombie-Ausbruch · Riesenmonster · Reise durch den Erdkern bzw. Loch durch die Erde · Fall in den Jupiter · ohne Raumanzug im All · Papier 42-mal falten · du schrumpfst oder wächst · Aufwachen im Jahr 3000 · alle Menschen springen, klatschen oder niesen gleichzeitig · Erde ist flach, ein Donut oder hat Saturnringe · Magnetfeld kippt, großer Sonnensturm · 1.000 Jahre Regen · weltweiter Stromausfall, Internet fällt weltweit aus · Schall oder Licht wird langsam

FAKTENTREUE (gilt für alles, was du lieferst)
- Erfinde nichts. Jede Zahl, jedes Datum, jede Behauptung muss belegbar sein (amtliche Statistik, Gesetz, Studie, Behörden- oder Herstellerangabe). Nenne zu jeder Zahl Quelle und Jahr.
- Kannst du eine Zahl nicht belegen, schreibe „nicht belegt“ und verwende sie nicht. Trägt eine Idee ohne belegbare Zahlen nicht, verwirf sie und sage es offen.
- Alles, was eine Annahme ist (z. B. eine Modellperson), kennzeichne als Annahme und halte sie realistisch und nachvollziehbar.
- Aussagen müssen legitim sein: keine Übertreibung, keine verzerrende Auswahl, keine Panikmache, keine falschen Gegensätze.
- Diskussionsbedarf soll durch die Sache selbst entstehen (zum Beispiel, weil die Antwort der Intuition widerspricht oder von der persönlichen Lage abhängt). Sprich das nie aus: keine Aufforderung zum Streiten oder Meinungsäußern im Text, keine Provokation, kein Clickbait, keine künstlichen Cliffhanger.
- Wenn dir Informationen fehlen, die das Ergebnis verändern, frage mich vorher gebündelt, statt zu raten.

LERNSTAND (aus unseren Zahlen, bitte berücksichtigen)
Startwerte (Recherche 02.11.2026 und eigene Eindrücke):
- Ausführung entscheidet mehr als das Thema: dasselbe Thema erreicht bei einem aufwendig gebauten Kanal Millionen, bei einfach gebauten Kanälen nur Tausende.
- Persönliche, greifbare Skalen (Papier falten, Graben) tragen eher als ein Weltuntergang ohne Vorstellbarkeit.
- Erstes eigenes Video (Eiszeit, Großstadt-Skyline) gefiel dem Inhaber nicht: zu viel Stadt, zu wenig Veränderung im Bild, immer derselbe erhöhte Standpunkt. Künftig: Natur und wechselnde Standpunkte, sichtbare Bewegung und ein Zeitraffer, der etwas zeigt.
- Der Lernstand wird täglich aus unseren Zahlen fortgeschrieben.

BISHERIGE VIDEOS (nicht wiederholen; ausgenommen sind nur Folgeteile eigener Treffer, Regel ORIGINALITÄT 7):
- Schall in Schritttempo (Test)
- Eiszeit in Toronto (Was wäre, wenn wir wieder in eine Eiszeit steuern?)

ZUTATEN DES TAGES (zufällig gezogen, damit unsere Ideen sich von denen anderer unterscheiden)
[Hier die Zutaten einsetzen: je Liste zwei Einträge aus dem Abschnitt „Zutaten-Listen“ unten, gewürfelt; das Cockpit macht das automatisch]

AUFGABE
Wir brauchen zehn Videoideen in unserer Nische für den morgigen Tag, die auf Deutsch noch niemand gemacht hat. Sie sollen unterschiedlich sein (verschiedene Themenfelder, Länder bzw. Welten) und zum Lernstand passen. Prüfe jede Idee vor der Ausgabe gegen die Regeln, die ANTI-LISTE, die Websuche und die Faktenlage; schreibe nur Ideen auf, die du belegen kannst.
Beginne mit einer Zeile „Gestrichen (naheliegend): …“. Antworte danach als nummerierte Liste von 1 bis 10. Jede Idee mit den Feldern, die im Beispiel unten stehen, jeweils eine kurze Zeile je Feld. Danach frage mich: „Welche zwei wählst du?“
Felder (Beispiel als JSON, nur zur Orientierung, antworte als lesbaren Text):
{"gestrichen":["naheliegende Idee in Stichworten"],"ideen":[{"nr":1,"titel":"Titelfrage „Was wäre, wenn …?“","feld":"Natur und Tiere | Geschichte umgedreht | Technik und Versorgung | Physik, Wetter, Geografie, Weltraum","massstab":"persönlich | global","zutat":"welche Zutat des Tages (oder „keine“)","originalitaet":"vermeidet: naheliegende Idee · Suche: Begriffe · Ergebnis: kein deutsches Video gefunden | englisch: … | ungeprüft","suchbegriff":"Wort für die TikTok-Suche, steht in der Titelfrage","weiterschicken":"wem man das Video schicken würde und warum","ereignis":"was passiert, in einem Satz","messgroesse":"was die Anzeige zeigt (Größe, Einheit, Start und Ende)","welt":"Natur/Ort-Typ","standpunkt":"wo steht der Zuschauer","tageszeit_verlauf":"z. B. Morgen, Mittag, Abend","bewegung":"was sich in der Welt sichtbar verändert, Phase für Phase","kamera":"z. B. langsamer Zoom","zeitraffer":"Faktor oder Echtzeit","hoehepunkt":"was bei HIER passiert","pointe":"was man mitnimmt","diskussion":"warum sich Zuschauer austauschen würden (nur intern)","daten":"belegbare Quellen/Zahlen verfügbar","laender":"Ort/Land","risiko":"kurz"}]}
```

## Schritt 2: Skripte für die zwei gewählten Ideen
```text
ROLLE
Du bist mein Content-Stratege und Skript-Autor für den TikTok-Kanal „Stell dir vor“ (@stelldirvor.pov). Du denkst wie ein erfahrener Creator, der Kanäle ins TikTok Creator Rewards Program bringt: Gedankenexperimente, die jeder sofort verstehen will, mit einer messbaren Größe, die man beim Zuschauen wachsen sieht.

UNSER KANAL
- Format: „Was wäre, wenn …“ als 3D-POV-Zeitraffer ohne Stimme, 80 Sekunden. Der Zuschauer sieht das Ereignis aus der Ich-Perspektive. Es gibt nur drei Textebenen: eine Titelfrage am Anfang, links eine laufende Messwert-Anzeige (Zahl mit Etikett, z. B. Temperatur, Pegel, Jahr, die bis zu einem Höhepunkt mit „HIER“ läuft) und kurze kursive Sätze. Am Ende ein dunkler Abspann mit Titelfrage und Faktenzeile. Ton ist nur Atmo und Sounddesign.
- Themen: spannende Gedankenexperimente mit messbarer Größe und einem Ereignis, das man von einem Standpunkt aus wachsen sieht (Wissenschaft, Natur, Geografie, Geschichte, Technik …). Die Orte dürfen überall liegen: Deutschland, weltweit, andere Länder. Wir brauchen Flexibilität und endlos viele spannende Themen; Sprache ist Deutsch. Auch Themen mit „in 5 Sekunden“-Rahmen sind erlaubt, wenn sie sich gut zeigen lassen.
- WELT UND BEWEGUNG (wichtig): Die Welt passt zum Thema. Bevorzuge oft Natur (Meer, Küste, Strand, Wald, Wüste, Gebirge, Gletscher, See, Weltraumnähe); Städte nur, wenn sie wirklich passen. Variiere Ort, Tageszeit (Tag, Sonnenauf- und -untergang, Nacht) und Standpunkt (nicht immer „von oben aus dem Fenster“: Strandblick aufs Meer, Bootsdeck, Waldlichtung, Gipfel, Straße, Dünen, Eisfläche …). Es darf nie „gewartet“ werden: Im Zeitraffer muss alle paar Sekunden etwas Sichtbares passieren (Licht, Wetter, Wasser, Vegetation, Menschen, Tiere, Fahrzeuge), und die Messwert-Anzeige muss zur sichtbaren Veränderung passen.
- Die Kamera darf sich langsam bewegen (weiche Fahrt, Schwenk, Zoom); sonst lange durchgehende Einstellungen. Erlaubt sind höchstens 1 bis 3 gezielte harte Schnitte, nur am Höhepunkt oder bei einem Maßstabs- bzw. Szenensprung.
- Unser Alltag: Jeden Tag entstehen zwei Videos für den nächsten Tag. Du lieferst zuerst zehn Ideen, ich wähle zwei, danach schreibst du die Skripte. Ich baue daraus die 3D-Szene.

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

AUFBAU DES SKRIPTS (feste Reihenfolge, 80 Sekunden; nennt der Auftrag einen TESTBLOCK, gelten dessen Zeiten)
- Titelfrage (steht 0,4 bis 4,4 s oben im Bild, 2 bis 3 Zeilen, deutsch, eine Frage mit offener Folge, die neugierig macht; sie verrät die Gefahr, die die Welt im Bild noch nicht kennt). Sie enthält den Suchbegriff (Feld suchbegriff) und ist zugleich das Cover im Profil. Im Abspann kehrt sie zurück.
- 12 bis 18 kursive Sätze: je 3 bis 9 Wörter, ruhig, Präsens, Aussagesätze, gern Du-Perspektive, Übergänge mit „Dann …“, keine Ausrufezeichen, keine Fragen. Erster Satz bei ca. 4,8 s, der letzte endet spätestens bei 70 s. Jeder Satz beschreibt genau das, was im selben Moment zu sehen ist; Zahlen im Satz stimmen mit der Anzeige überein.
- Bogen: Start mit Countdown (0 bis ca. 8 s: der Countdown läuft ab Bild 1, die Welt lebt noch ahnungslos weiter, der Zuschauer weiß mehr) · Ereignis genau auf Countdown-Null (ca. 8 s; Bild, Licht und Ton kippen gleichzeitig) · Eskalation in mindestens 3 Stufen alle 8 bis 10 s (ca. 10 bis 50 s; Farbe und Licht wechseln mit der Lage) · Annäherung (50 bis 58 s; ein zweiter Countdown ist erlaubt) · Höhepunkt (58 bis 62 s; Anzeige zeigt „HIER“, im Moment selbst kein Satz) · Nachspiel (62 bis 70 s) · Abblende (70 bis 72 s) · Abspann (72 bis 80 s).
- Messwert-Anzeige: läuft von Bild 1 an. Phase 1 ist ein Countdown bis zum Ereignis (bei Zeitraffer-Themen die Zeit bis zum Einsetzen der Veränderung), danach 2 bis 4 Etikettwechsel (je Stufe eine neue echte Messgröße), endet bei „HIER“. Darunter eine Statuszeile in Versalien (1 bis 3 Wörter zur Lage), deren Text mehrfach wechselt. Raffst du die Zeit, nenne den Zeitraffer-Faktor und eine nachvollziehbare Anzeige-Größe.
- Faktenzeile für den Abspann: „ORT, JAHR · FAKT“ oder „FAKT · FAKT“, eine bis zwei Zeilen, belegbar; sie ordnet die Prämisse real ein.
- Keine Stimme, keine Untertitel, kein Logo, keine Sticker, kein Folgen-Aufruf im Bild. Die Kommentarfrage steht nur in der Caption. Schreibe zusätzlich im Feld folgen_hinweis eine kurze Zeile für den Abspann (höchstens 8 Wörter), die nur in Testvideos erscheint: an den Inhalt gebunden („Morgen: …“, „Teil 2 im Profil“), kein Tausch, keine Belohnung, kein Druck.

CAPTION (nicht im Video, nur Beschreibung)
Genau eine Zeile: Hook-Frage mit Suchbegriff? Emoji Ich hab’s durchgespielt. Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #waswaerewenn
Der Suchbegriff steht vorn in der Hook-Frage (dasselbe Wort wie in der Titelfrage). Etwa 150 Zeichen plus 5 Hashtags, kein #fyp oder #viral.

LERNSTAND (aus unseren Zahlen, bitte berücksichtigen)
Startwerte (Recherche 02.11.2026 und eigene Eindrücke):
- Ausführung entscheidet mehr als das Thema: dasselbe Thema erreicht bei einem aufwendig gebauten Kanal Millionen, bei einfach gebauten Kanälen nur Tausende.
- Persönliche, greifbare Skalen (Papier falten, Graben) tragen eher als ein Weltuntergang ohne Vorstellbarkeit.
- Erstes eigenes Video (Eiszeit, Großstadt-Skyline) gefiel dem Inhaber nicht: zu viel Stadt, zu wenig Veränderung im Bild, immer derselbe erhöhte Standpunkt. Künftig: Natur und wechselnde Standpunkte, sichtbare Bewegung und ein Zeitraffer, der etwas zeigt.
- Der Lernstand wird täglich aus unseren Zahlen fortgeschrieben.

GEWÄHLTE IDEEN (für diese schreibst du jetzt je ein makelloses Skript)
[Hier die zwei gewählten Ideen einfügen (Titel und Felder aus Schritt 1)]

AUFGABE
Schreibe für jede gewählte Idee ein makelloses, sendefertiges Skript nach allen Regeln oben. Erfinde nichts; jede Zahl mit Rechenweg und Quelle. Prüfe dein Skript am Ende selbst (Wortzahl bzw. Satzzahl, Fakten, Ton, Verbote) und trage das Ergebnis in selbstpruefung ein. Findest du beim Prüfen einen Fehler, korrigiere ihn vor der Ausgabe.
Gib je Idee das Skript lesbar aus: Titel, Segmente mit Text und Sprechtext (bzw. Sätze und Anzeige-Plan), Rechenweg, Annahmen, Quellen, Caption, Dramaturgie-Hinweise, Selbstprüfung. Feldstruktur zur Orientierung:
{"skripte":[{"nr":1,"titel":"Titelfrage","thema":"","suchbegriff":"","folgen_hinweis":"kurze Abspann-Zeile für Testvideos","teil":1,"laenge_s":80,"welt":"","standpunkt":"","tageszeit_verlauf":"","zeitraffer":"","kamera":"","anzeige_plan":[{"von_s":0,"bis_s":8,"etikett":"ETIKETT (Phase 1: Countdown bis zum Ereignis)","start":"","ende":"","einheit":"","unter":"Statuszeile in Versalien"}],"saetze":[{"t_ca":4.8,"text":"Satz mit 3 bis 9 Wörtern."}],"faktenzeile":"","rechenweg":"Formel, Eingaben, Rechenschritte","zahlen":{"name":"wert"},"annahmen":["(A) ..."],"quellen":["(F) Quelle, Jahr"],"caption":"","originalitaet":"Suche (deutsch) und Ergebnis","dramaturgie":["Hinweis mit Zeitpunkt: was in der Welt passiert, Licht, Zoom"],"selbstpruefung":["Satzzahl ..","Fakten ..","Anzeige passt zum Zeitraffer ..","Verbote .."]}]}
```

## Zutaten-Listen
Das Cockpit zieht für jeden Ideen-Auftrag je Liste 2 Einträge zufällig und setzt sie unter „ZUTATEN DES TAGES“ ein. So bekommt die KI jedes Mal einen anderen Auftrag als andere Creator. Hintergrund: [[Originalität und Themenfindung]].

- **Ort:** Ostseestrand · Almhütte · Kleingarten · Campingplatz am See · Deck eines Fischkutters · Galerie eines Leuchtturms · Weinberg · Hallig · Dorfbahnsteig · Waldlichtung · Dünen · Gletscherhütte · Hausboot · Reisterrassen · Lodge in der Savanne · Fjordufer · Vulkaninsel · Mangrovenufer · Hochmoor · Wattenmeer · Steg über einem Korallenriff · Wüstenoase · Bergsee · Schrebergarten am Bahndamm
- **Natur:** Zugvögel · Bienenvolk · Lachswanderung · Korallen · Golfstrom · Monsun · Mangroven · Ameisenstaat · Glühwürmchen · Wale · Meeresleuchten · Moor · Buchenwald · Pilzgeflecht · Seegras · Gezeiten · Polarlicht · Wanderdüne · Bambusblüte · Plankton
- **Geschichte:** Pyramidenbau · Limes · Hansekogge · Bau des Gotthardtunnels · Mondlandung 1969 · erste deutsche Eisenbahn 1835 · Kölner Dom (632 Jahre Bauzeit) · Buchdruck · Leuchtturm von Alexandria · Panamakanal · Abschlussdeich 1932 · Atlantikkabel 1858 · Chinesische Mauer · Stonehenge · Brooklyn Bridge · erster Heißluftballon 1783 · Speicherstadt Hamburg · römisches Aquädukt
- **Technik und Versorgung:** Netzfrequenz 50 Hz · Trinkwasserdruck · Unterseekabel · GPS-Satelliten · Containerschiff · Fernwärme · Kläranlage · Schleuse · Stausee · Windpark · Kühlkette · Ampelschaltung · Funkmast · Bahnstrom · Pumpspeicherwerk · Deich · Pipeline · Wasserturm · Stromleitung · Leuchtfeuer
- **Messgröße:** Pegel in cm · Temperatur · Lautstärke in dB · Helligkeit in Lux · Anzahl · Salzgehalt · pH-Wert · Windstärke · Frequenz in Hz · Luftdruck · Höhe in m · Geschwindigkeit · Jahr · Gewicht in t · Entfernung
- **Tageszeit:** Morgengrauen · Mittag · Sonnenuntergang · Nacht · Polarnacht · Mitternachtssonne

## Siehe auch
[[Originalität und Themenfindung]] · [[Claude-Chat-Workflow]] · [[Lernschleife und Insights]] · [[Regelwerk]] · [[Index]]
