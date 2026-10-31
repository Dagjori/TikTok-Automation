"""Sichert vor jedem /compact den Gesprächsverlauf, damit nach dem Zusammenfassen nichts verloren geht.

Wird automatisch vom PreCompact-Hook in .claude/settings.json aufgerufen (manuell per /compact und automatisch).
Liest das Hook-JSON von stdin (Feld transcript_path) und schreibt:
  .sitzung/verlauf.md            alle Nachrichten des Inhabers und alle Textantworten von Claude, vollständig
  .sitzung/letzte_nachrichten.md die letzten 40 Nachrichten (schneller Wiedereinstieg)
  .sitzung/stand.md              Zeitpunkt, letzte Commits, offene Änderungen im Repo

.sitzung/ steht in .gitignore: Das Repo ist öffentlich, der Verlauf bleibt nur im Container der Sitzung.
Manuell: python3 tools/sitzung_sichern.py --transkript <pfad.jsonl>
"""
import datetime
import json
import os
import re
import subprocess
import sys

WURZEL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIEL = os.path.join(WURZEL, ".sitzung")
SYSTEM_BLOCK = re.compile(r"<system-reminder>.*?</system-reminder>", re.S)


def text_aus(inhalt):
    if isinstance(inhalt, str):
        return inhalt
    teile = []
    for block in inhalt or []:
        if isinstance(block, dict) and block.get("type") == "text":
            teile.append(block.get("text", ""))
    return "\n".join(teile)


def lies_transkript(pfad):
    eintraege = []
    with open(pfad, encoding="utf-8") as datei:
        for zeile in datei:
            try:
                d = json.loads(zeile)
            except json.JSONDecodeError:
                continue
            if d.get("isSidechain") or d.get("isMeta"):
                continue
            nachricht = d.get("message")
            if not isinstance(nachricht, dict):
                continue
            rolle = nachricht.get("role")
            if rolle not in ("user", "assistant"):
                continue
            inhalt = nachricht.get("content")
            # Werkzeug-Ergebnisse sind keine Nachrichten des Inhabers
            if rolle == "user" and isinstance(inhalt, list) and any(
                isinstance(b, dict) and b.get("type") == "tool_result" for b in inhalt
            ):
                continue
            text = SYSTEM_BLOCK.sub("", text_aus(inhalt)).strip()
            if not text:
                continue
            if d.get("isCompactSummary"):
                rolle = "zusammenfassung"
            eintraege.append((d.get("timestamp", "")[:16].replace("T", " "), rolle, text))
    return eintraege


def formatiere(eintraege):
    namen = {"user": "INHABER", "assistant": "CLAUDE", "zusammenfassung": "ZUSAMMENFASSUNG (frühere Komprimierung)"}
    return "\n\n".join(f"### {zeit} · {namen[rolle]}\n\n{text}" for zeit, rolle, text in eintraege)


def main():
    pfad = None
    if "--transkript" in sys.argv:
        pfad = sys.argv[sys.argv.index("--transkript") + 1]
    else:
        try:
            pfad = json.load(sys.stdin).get("transcript_path")
        except (json.JSONDecodeError, ValueError):
            pass
    if not pfad or not os.path.exists(pfad):
        print("Sitzungssicherung: kein Transkript gefunden, nichts gesichert.", file=sys.stderr)
        return
    eintraege = lies_transkript(pfad)
    os.makedirs(ZIEL, exist_ok=True)
    jetzt = datetime.datetime.now().strftime("%d.%m.%Y %H:%M")
    kopf = f"# Gesprächsverlauf (gesichert {jetzt}, {len(eintraege)} Nachrichten)\n\nQuelle: {pfad}\n\n"
    with open(os.path.join(ZIEL, "verlauf.md"), "w", encoding="utf-8") as f:
        f.write(kopf + formatiere(eintraege) + "\n")
    with open(os.path.join(ZIEL, "letzte_nachrichten.md"), "w", encoding="utf-8") as f:
        f.write(f"# Letzte 40 Nachrichten (gesichert {jetzt})\n\nVollständig: .sitzung/verlauf.md\n\n" + formatiere(eintraege[-40:]) + "\n")
    git = lambda *a: subprocess.run(["git", "-C", WURZEL, *a], capture_output=True, text=True).stdout.strip()
    with open(os.path.join(ZIEL, "stand.md"), "w", encoding="utf-8") as f:
        f.write(f"# Stand vor dem Komprimieren ({jetzt})\n\n## Letzte Commits\n```\n{git('log', '--oneline', '-10')}\n```\n\n"
                f"## Offene Änderungen\n```\n{git('status', '--short') or '(keine)'}\n```\n")
    print(f"Sitzungssicherung: {len(eintraege)} Nachrichten in .sitzung/ gesichert.")


if __name__ == "__main__":
    main()
