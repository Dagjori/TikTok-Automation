---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §7
tags: [konto/gemeinsam, plattform, posting, buffer]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Plattformregeln und Posting

## Erlaubte Wege (nur offizielle, vollautomatisch über Buffer)
- **F:** TikTok erlaubt Direct Post über auditierte Partner-Tools. Unauditierte Clients posten nur privat. Die Community Guidelines verbieten „automation tools, scripts … designed to bypass our systems“.
- **Verboten:** Skripte/Browser-Bots in TikTok Studio, Cookie-Uploader, eigene unauditierte API-App.
- **Erlaubt:** Buffer Essentials (2 Kanäle, ca. 12 $/Monat, 25 Posts je 24 h und Kanal). Manueller Rückfall: TikTok Studio Web (Markeninhalt AUS, kein KI-Label).
- Entscheidung 01.11.: **vollautomatisch ohne Freigabe** („ich will nicht freigeben müssen“). Der Inhaber kann Posts in Buffer bis zum Zeitpunkt löschen.

## Ablauf
1. Claude prüft jedes Video selbst ([[Prüfung und Abnahme Simulierbar]], [[Prüfung und Abnahme Account 2]]).
2. Einplanen: `python3 pipeline/post_buffer.py --video … --kanal simulierbar|stelldirvor.pov --zeit auto:JJJJ-MM-TT:mittag|abend --text "<Caption>" [--trocken]`. Erwartung: Status `scheduled`, sonst Exit 2. Upload-Kopie automatisch bei über 48 MB.
3. Nach dem Posten: `python3 pipeline/post_buffer.py --nachpruefen` prüft öffentlich (`privateItem=false`), Länge und KI-Label wie gesetzt. **Erst danach** wird die Supabase-Datei gelöscht (Buffer holt sie zur Posting-Zeit). Log `pipeline/out/buffer_log.jsonl` nur im Container.

## Posting-Zeiten (Europe/Berlin, Startwerte, `data/plan/posting_zeiten.json`)
Beide Accounts gleich, je 2 Videos/Tag: **Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30.** Ersetzt die erste Fassung für Account 2 (20:30/13:00, 1 Video/Tag). Nach 14 Tagen mit Zahlen aus TikTok Studio nachjustieren (**F:** Zeit wirkt schwächer als Inhalt und Regelmäßigkeit).

## Caption (eine Zeile, jeder Post)
| Account | Format |
|---|---|
| 1 | `Hook-Frage mit Suchbegriff? Emoji Ich hab's simuliert. (bzw. durchgerechnet.) Kommentarfrage? 👇 #thema1 #thema2 #thema3 #wissen #simulation` |
| 2 | `Frage? Emoji Ich hab's durchgespielt. Kommentarfrage? 👇 #t1 #t2 #t3 #wissen #waswaerewenn` |
- Ca. 150 Zeichen plus 5 Hashtags. Kein #fyp/#viral/#foryou, keine Quellen, Annahmen oder Hinweise („Stimme: KI“, „keine Anlageberatung“).
- Beispiel Account 1: „Früh einordnen oder bis zum Ende fahren? 🚗 Ich hab's simuliert. Team früh oder Team Reißverschluss? 👇 #reißverschlussverfahren #stau #autofahren #wissen #simulation“.

## Kennzeichnung
**Kein KI-Label** (Entscheidung 01.11.): TikTok verlangt es nur bei realistischen KI-Inhalten, nicht bei künstlerischen Stilen und generischer TTS (**F**; das Label steht auf der Videoseite im Feld `aigcLabelType`). Unsere Bilder sind Three.js/Blender. **Ausnahme:** realistisch wirkende KI-Inhalte (Stimme einer echten Person, fotorealistische KI-Bilder) → Label AN (`--ki-label`).

## Inhalt
- **Kein Kaufaufruf im Video** (TikTok drosselt in Shop-Märkten), kein „schnell reich“, keine Produkte, Banken, Versicherer, Broker, Coins. Finanzthemen nur als Modellrechnung.
- **Ausschlussthemen:** Glücksspiel, Tabak/Vape, Gesundheitsversprechen, Tragödien, Krypto, Einzelaktien, Anbieter-Empfehlungen, Parteipolitik, NS-Kennzeichen, riskantes Nachahmen.
- Mind. 61 s, 1080×1920, eigene Rechnung; Quellen nur intern in `skript.json`.

## Technik des Postings
Per API nicht setzbar: Markeninhalt, Sichtbarkeit, Kommentare, Duett/Stitch (daher `--nachpruefen`). Video-Speicher: Supabase Storage, privater Bucket `buffer-uploads` (Frankfurt, Gratis-Plan, ≤ 50 MB je Datei). Zugänge setzt in der Cloud der Proxy (Netzwerk-Secret); die Adresse nur als Umgebungsvariable `SUPABASE_URL` (Format der Umgebungsvariablen: `.env`, eine Zeile `NAME=Wert`). Details: [[Technik und Umgebung]].

## Siehe auch
[[CRP Creator Rewards Program]] · [[Produktion Rhythmus und Modelle]] · [[Index]]
