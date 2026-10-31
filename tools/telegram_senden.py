"""Schickt eine Textnachricht an den Inhaber über einen Telegram-Bot (z. B. das Ergebnis des Trend-Radars).

Aufruf:
  python3 tools/telegram_senden.py "Text"
  echo "Text" | python3 tools/telegram_senden.py
  python3 tools/telegram_senden.py --chat-id-finden     # einmalig, nachdem der Inhaber dem Bot „/start“ geschrieben hat

Braucht die Umgebungsvariablen TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID (in den Einstellungen der Cloud-Umgebung,
nie im Repo). Der Host api.telegram.org muss in der Netzwerk-Freigabe stehen.
Ist Telegram nicht eingerichtet, gibt das Skript nur einen Hinweis aus und endet mit Exit-Code 0,
damit der Radar-Lauf nicht scheitert.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

MAX_LAENGE = 4000  # Telegram erlaubt 4096 Zeichen pro Nachricht


def api(token, methode, daten=None):
    url = f"https://api.telegram.org/bot{token}/{methode}"
    body = urllib.parse.urlencode(daten).encode() if daten else None
    with urllib.request.urlopen(urllib.request.Request(url, data=body), timeout=30) as antwort:
        return json.loads(antwort.read())


def teile(text):
    """Teilt langen Text an Zeilenumbrüchen in Stücke unter MAX_LAENGE."""
    stuecke, aktuell = [], ""
    for zeile in text.splitlines(keepends=True):
        while len(zeile) > MAX_LAENGE:
            if aktuell:
                stuecke.append(aktuell)
                aktuell = ""
            stuecke.append(zeile[:MAX_LAENGE])
            zeile = zeile[MAX_LAENGE:]
        if len(aktuell) + len(zeile) > MAX_LAENGE:
            stuecke.append(aktuell)
            aktuell = ""
        aktuell += zeile
    return [s for s in stuecke + [aktuell] if s.strip()]


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        print("Telegram nicht eingerichtet (TELEGRAM_BOT_TOKEN fehlt), nichts gesendet.")
        return
    if "--chat-id-finden" in sys.argv:
        for u in api(token, "getUpdates").get("result", []):
            chat = (u.get("message") or {}).get("chat", {})
            if chat:
                print(f"chat_id {chat['id']} · {chat.get('first_name', '')} {chat.get('username', '')}")
        return
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not chat_id:
        print("TELEGRAM_CHAT_ID fehlt, nichts gesendet. Erst --chat-id-finden ausführen.")
        return
    text = " ".join(a for a in sys.argv[1:] if not a.startswith("--")) or sys.stdin.read()
    for stueck in teile(text):
        api(token, "sendMessage", {"chat_id": chat_id, "text": stueck, "disable_web_page_preview": "true"})
    print("Telegram: gesendet.")


if __name__ == "__main__":
    main()
