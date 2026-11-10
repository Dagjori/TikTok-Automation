---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-08
quelle: CLAUDE.md §7; Zeiten-Kennzeichnung, Suchbegriff, Cover: Wahl des Inhabers 08.11.2026
tags: [konto/gemeinsam, plattform, posting, buffer]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Plattformregeln und Posting

## Erlaubte Wege (nur offizielle, vollautomatisch über Buffer)
- **F:** TikTok erlaubt Direct Post über auditierte Partner-Tools. Unauditierte Clients posten nur privat. Die Community Guidelines verbieten „automation tools, scripts … designed to bypass our systems“.
- **Verboten:** Skripte/Browser-Bots in TikTok Studio, Cookie-Uploader, eigene unauditierte API-App.
- **Erlaubt:** Buffer Essentials (2 Kanäle, ca. 12 $/Monat, 25 Posts je 24 h und Kanal). Manueller Rückfall: TikTok Studio Web (Markeninhalt AUS).
- Entscheidung 01.11.: **vollautomatisch ohne Freigabe** („ich will nicht freigeben müssen“). Der Inhaber kann Posts in Buffer bis zum Zeitpunkt löschen.

## Ablauf
1. Claude prüft jedes Video selbst ([[Prüfung und Abnahme Simulierbar]], [[Prüfung und Abnahme Account 2]]).
2. Einplanen: `python3 pipeline/post_buffer.py --video … --kanal simulierbar|stelldirvor.pov --zeit auto:JJJJ-MM-TT:mittag|abend --text "<Caption>" [--trocken]`. Erwartung: Status `scheduled`, sonst Exit 2. Upload-Kopie automatisch bei über 48 MB.
3. Nach dem Posten: `python3 pipeline/post_buffer.py --nachpruefen` prüft öffentlich (`privateItem=false`), und Länge. **Erst danach** wird die Supabase-Datei gelöscht (Buffer holt sie zur Posting-Zeit). Log `pipeline/out/buffer_log.jsonl` nur im Container.

## Posting-Zeiten (Europe/Berlin, Startwerte, `data/plan/posting_zeiten.json`)
Beide Accounts gleich, je 2 Videos/Tag: **Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30.** Ersetzt die erste Fassung für Account 2 (20:30/13:00, 1 Video/Tag). Nach 14 Tagen mit Zahlen aus TikTok Studio nachjustieren (**S**, seit 08.11. herabgestuft von F: dass Zeit schwächer wirkt als Inhalt und Regelmäßigkeit, ist plausibel, aber nicht gemessen). Die großen Studien widersprechen sich (Buffer 2026: Sonntag 9 Uhr, Montag 13 Uhr, abends 18–23 Uhr stark; Metricool 2026: 18–21 Uhr, Spitze 20 Uhr), Daten für Deutschland gibt es nicht ([[Wachstum auf 10.000 Follower]]). Unsere Zeiten liegen in diesen Fenstern. **Seit 08.11.:** die Zeiten je Account getrennt anpassen, sobald TikTok Studio die Follower-Aktivität des Accounts zeigt; bis dahin gelten die Startwerte.

## Caption (eine Zeile, jeder Post)
| Account | Format |
|---|---|
| 1 | `Hook-Frage mit Suchbegriff? Emoji Ich hab's simuliert. (bzw. durchgerechnet.) Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation` |
| 2 | `Frage mit Suchbegriff? Emoji Ich hab's durchgespielt. Kommentarfrage? 👇 #t1 #t2 #t3 #wissen #waswaerewenn` |
- **Suchbegriff (seit 08.11., beide Accounts):** das Wort, das jemand in die TikTok-Suche tippen würde („Studium“, „Mond“), steht in der Titelfrage im ersten Bild **und** vorne in der Caption. Kleiner Hebel: die Suche bringt im Median ca. 1 % der Aufrufe (**S**, Anbieter); TikTok nennt sich 2026 selbst eine Suchmaschine (**F**, Prognose). Passende Hashtags bringen ca. 5 % mehr Aufrufe (**F**, Metricool), 3–5 bleiben richtig.
- Ca. 150 Zeichen plus 5 Hashtags. Kein #fyp/#viral/#foryou, keine Quellen, Annahmen oder Hinweise („Stimme: KI“, „keine Anlageberatung“).
- Beispiel Account 1: „Früh einordnen oder bis zum Ende fahren? 🚗 Ich hab's simuliert. Team früh oder Team Reißverschluss? 👇 #reißverschlussverfahren #stau #autofahren #wissen #simulation“.

## Kennzeichnung
**Kein KI-Label beim Posten.** Das Thema ist abgeschlossen (Entscheidung des Inhabers 10.11.2026: KI-Kennzeichnung wird in unseren Nischen nicht benötigt); es gibt dazu keine offenen Punkte und keinen Prüfschritt.

## Inhalt
- **Kein Kaufaufruf im Video** (TikTok drosselt in Shop-Märkten), kein „schnell reich“, keine Produkte, Banken, Versicherer, Broker, Coins. Finanzthemen nur als Modellrechnung.
- **Ausschlussthemen:** Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik, NS-Kennzeichen, riskantes Nachahmen.
- Mind. 61 s, 1080×1920, eigene Rechnung; Quellen nur intern in `skript.json`.

## Cover (seit 08.11.)
Jedes Video bekommt ein einheitliches Cover, damit das Profil-Raster zeigt, was regelmäßig kommt: Account 1 die Titeltafel mit Duell-Frage und „VS“, Account 2 die Titelfrage aus dem ersten Bild ([[Profil und Follow-Umwandlung]]).
- **Wie (F, [Buffer-API, VideoAssetInput](https://developers.buffer.com/types/VideoAssetInput.md)):** Buffer nimmt kein eigenes Bild an (`thumbnailUrl` wird abgelehnt), sondern einen **Zeitpunkt im Video** (`metadata.thumbnailOffset` in Millisekunden; nur Instagram, TikTok, Pinterest). Laut Buffer-Hilfe lässt sich auch im Buffer-Fenster kein eigenes Bild hochladen. Unser Cover ist deshalb immer ein Bild aus dem Video; Titel und Tafel stehen dafür ab dem ersten Bild.
- **Umgesetzt 08.11.** in `pipeline/post_buffer.py`: Account 1 Bild bei **1,0 s** (Titel mit „VS“ und Tafel stehen), Account 2 bei **1,5 s** (Titelfrage steht 0,4–4,4 s). Das Bild liegt zur Sichtprüfung als `<video>_cover.jpg` neben dem Video; ist es fast schwarz, kommt eine Warnung. Abweichend `--cover-ms`, ohne Cover `--ohne-cover`. Kennt Buffer das Feld nicht (mehr), geht der Post ohne Cover raus statt abzubrechen. Ob TikTok das Cover übernimmt, zeigt der erste echte Post (im Profil ansehen).

## Technik des Postings
Per API nicht setzbar: Markeninhalt, Sichtbarkeit, Kommentare, Duett/Stitch (daher `--nachpruefen`). Video-Speicher: Supabase Storage, privater Bucket `buffer-uploads` (Frankfurt, Gratis-Plan, ≤ 50 MB je Datei). Zugänge setzt in der Cloud der Proxy (Netzwerk-Secret); die Adresse nur als Umgebungsvariable `SUPABASE_URL` (Format der Umgebungsvariablen: `.env`, eine Zeile `NAME=Wert`). Details: [[Technik und Umgebung]].

## Siehe auch
[[CRP Creator Rewards Program]] · [[Produktion Rhythmus und Modelle]] · [[Index]]
