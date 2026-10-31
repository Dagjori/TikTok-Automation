# Trend-Radar per Telegram

**Stand:** 31.10.2026 · **Entscheidung des Inhabers:** Der tägliche Radar kommt als Telegram-Nachricht (zusätzlich zur Push-Nachricht der Claude-App). Begründung und Vergleich mit WhatsApp: `docs/11-automatisierung.md`, Teil 2.

## 1. Kurzfazit
- Ein eigener Telegram-Bot schickt dir jeden Morgen nach dem Radar-Lauf (05:35 Uhr) das Ergebnis.
- Kosten 0 €. Einrichtung ca. 10 Minuten, nur einmal.
- Claude ist fertig: Das Skript `tools/telegram_senden.py` liegt bereit, und der Radar ruft es in Schritt 9 von `docs/07-trend-monitoring.md` auf. Es fehlen nur dein Bot, der Schlüssel und die Netzwerk-Freigabe.

## 2. Begründung
- Telegram bietet eine offizielle, kostenlose Bot-Schnittstelle. Nachrichten an dich selbst brauchen weder ein Business-Konto noch Vorlagen, anders als die offizielle WhatsApp-API (**Fakt**, siehe `docs/11-automatisierung.md`).
- Der Bot-Schlüssel steht im Pfad der Telegram-Adresse, nicht in einem Header. Deshalb funktioniert hier kein Netzwerk-Secret wie bei ElevenLabs. Der Schlüssel kommt stattdessen als Umgebungsvariable in die Einstellungen der Cloud-Umgebung, **nie** in den Chat und nie ins Repo.

## 3. Einrichtung (ca. 10 Minuten)
1. **Bot anlegen (3 Min.):**
   - Telegram öffnen → Suche → `@BotFather` (offizieller Bot von Telegram, blauer Haken).
   - `/newbot` senden.
   - Name: `Simulierbar Radar`.
   - Benutzername: z. B. `simulierbar_radar_bot` (muss auf `bot` enden; ist er vergeben, eine Zahl anhängen).
   - BotFather antwortet mit einem **Token** (Form `123456789:AA…`). Das ist der Schlüssel. Nicht in den Chat mit Claude kopieren.
2. **Bot starten (1 Min.):** Den Link zu deinem Bot aus der BotFather-Nachricht öffnen → **Starten** bzw. `/start`. Erst dann darf der Bot dir schreiben.
3. **Deine Chat-ID holen (1 Min.):** In Telegram `@userinfobot` öffnen → **Starten**. Er antwortet mit deiner `Id` (eine Zahl). Das ist ein Drittanbieter-Bot. Willst du den nicht nutzen, lass diesen Schritt weg. Claude liest die ID dann mit `python3 tools/telegram_senden.py --chat-id-finden` selbst aus, sobald der Token gesetzt ist.
4. **Cloud-Umgebung einstellen (5 Min.):** In der Sitzung oben in der Titelleiste das Umgebungsmenü öffnen → **Bearbeiten**.
   - **Netzwerkzugriff:** unter „Allowed domains“ `api.telegram.org` hinzufügen. Das Häkchen „Allow package managers“ bleibt gesetzt.
   - **Umgebungsvariablen:**
     - `TELEGRAM_BOT_TOKEN` = der Token aus Schritt 1
     - `TELEGRAM_CHAT_ID` = die Zahl aus Schritt 3
   - Speichern.
5. **Claude Bescheid geben:** „Telegram ist eingerichtet.“ In der nächsten neuen Sitzung schickt Claude eine Testnachricht mit `python3 tools/telegram_senden.py "Test"`.

## 4. Nächste Schritte
| # | Schritt | Wer | Zeit |
|---|---|---|---|
| 1 | Einrichtung wie oben | Inhaber | 10 Min. |
| 2 | Testnachricht aus einer neuen Sitzung | Claude | 2 Min. |
| 3 | Erster echter Radar-Lauf per Telegram am nächsten Morgen prüfen | Inhaber | 1 Min. |

## 5. Offene Punkte
- **Annahme:** Die feste Radar-Sitzung übernimmt neue Umgebungsvariablen beim nächsten Start ihres Containers. Kommt am ersten Morgen keine Nachricht, prüft Claude das im Radar-Protokoll.
- Ein Anruf bei wichtigen Ereignissen ist nicht eingerichtet. Laut Recherche gibt es dafür nur Drittanbieter-Plugins mit eigenem Telefonie-Konto (`docs/11-automatisierung.md`, Abschnitt 2.7).
