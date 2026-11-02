#!/usr/bin/env python3
"""Prüft das Obsidian-Hirn (Ordner hirn/): Wikilinks, Notizkopf, Konto-Trennung, Geheimnisse, Verwaiste.

Aufruf: python3 tools/hirn_pruefen.py        (Exit 0 = alles in Ordnung)
"""
import re
import sys
from pathlib import Path

HIRN = Path(__file__).resolve().parent.parent / "hirn"
PFLICHT = ["typ", "konto", "status", "datum", "quelle", "tags"]
TYPEN = {"wissen", "regel", "entscheidung", "recherche", "plan", "anleitung", "index"}
KONTEN = {"gemeinsam", "simulierbar", "stelldirvor"}
ORDNER_KONTO = {"02-Simulierbar": "simulierbar", "03-stelldirvor-pov": "stelldirvor"}
# Geheimnisse und Dinge, die nie ins öffentliche Repo dürfen
VERBOTEN = [r"https?://[a-z0-9]{12,}\.supabase\.co", r"sb_secret_[A-Za-z0-9_-]{12,}", r"sb_publishable_[A-Za-z0-9_-]{12,}",
            r"xi-api-key\s*[:=]\s*[A-Za-z0-9_-]{16,}", r"[\w.+-]+@[\w-]+\.[a-z]{2,}",
            r"\beyJ[A-Za-z0-9_-]{20,}", r"ghp_[A-Za-z0-9]{20,}", r"BOT_TOKEN\s*=\s*\d+", r"\bsk-[A-Za-z0-9_-]{20,}"]
# Wörter, die in Account-1-Notizen nichts mit Account 2 zu tun haben dürfen und umgekehrt (Warnung, kein Fehler)
KREUZ = {"simulierbar": [r"referenz_pov", r"Lunar-POV", r"@stelldirvor\.pov"], "stelldirvor": [r"massstab\.py", r"Teamfarben", r"Folgen-Aufruf"]}


def kopf_lesen(text):
    if not text.startswith("---"):
        return None
    teile = text.split("---", 2)
    if len(teile) < 3:
        return None
    felder = {}
    for zeile in teile[1].strip().splitlines():
        if ":" in zeile:
            k, v = zeile.split(":", 1)
            felder[k.strip()] = v.strip()
    return felder


def main():
    notizen = {p.stem: p for p in HIRN.rglob("*.md")}
    fehler, warnungen = [], []
    verlinkt = set()
    for name, pfad in sorted(notizen.items()):
        rel = pfad.relative_to(HIRN)
        text = pfad.read_text(encoding="utf-8")
        kopf = kopf_lesen(text)
        if kopf is None:
            fehler.append(f"{rel}: kein Kopf (YAML)")
            continue
        for f in PFLICHT:
            if f not in kopf:
                fehler.append(f"{rel}: Kopf ohne '{f}'")
        if kopf.get("typ") and kopf["typ"] not in TYPEN:
            fehler.append(f"{rel}: typ '{kopf['typ']}' unbekannt")
        konto = kopf.get("konto")
        if konto and konto not in KONTEN:
            fehler.append(f"{rel}: konto '{konto}' unbekannt")
        if rel.parts[0] in ORDNER_KONTO and konto != ORDNER_KONTO[rel.parts[0]]:
            fehler.append(f"{rel}: konto '{konto}' passt nicht zum Ordner ({ORDNER_KONTO[rel.parts[0]]})")
        if konto and f"konto/{konto}" not in kopf.get("tags", "") and rel.parts[0] != "05-Vorlagen":
            fehler.append(f"{rel}: Tag konto/{konto} fehlt")
        if re.search(r"^datum:\s*(\d{4}-\d{2}-\d{2})\s*$", text, re.M) is None and rel.parts[0] != "05-Vorlagen":
            fehler.append(f"{rel}: datum nicht im Format JJJJ-MM-TT")
        for muster in VERBOTEN:
            for m in re.finditer(muster, text):
                fehler.append(f"{rel}: verbotener Inhalt ({muster}): {m.group(0)[:40]}")
        ohne_code = re.sub(r"`[^`\n]*`", "", re.sub(r"```.*?```", "", text, flags=re.S))   # Wikilinks in Code zählen nicht
        for ziel in re.findall(r"\[\[([^\]\|#]+)(?:[#\|][^\]]*)?\]\]", ohne_code):
            ziel = ziel.strip()
            verlinkt.add(ziel)
            if ziel not in notizen:
                fehler.append(f"{rel}: Wikilink ohne Ziel [[{ziel}]]")
        if konto in KREUZ and rel.parts[0] != "00-Start":
            for muster in KREUZ[konto]:
                if re.search(muster, text):
                    warnungen.append(f"{rel}: erwähnt Fremdbegriff '{muster}' (Konto {konto}); prüfen, ob als Abgrenzung gemeint")
    for name, pfad in notizen.items():
        if name not in verlinkt and name != "Index" and pfad.relative_to(HIRN).parts[0] != "05-Vorlagen":
            warnungen.append(f"{pfad.relative_to(HIRN)}: von keiner Notiz verlinkt (nicht im Index?)")
    print(f"{len(notizen)} Notizen, {sum(len(p.read_text(encoding='utf-8')) for p in notizen.values()) // 1024} KB")
    for w in warnungen:
        print("WARNUNG:", w)
    for f in fehler:
        print("FEHLER: ", f)
    print("Ergebnis:", "OK" if not fehler else f"{len(fehler)} Fehler")
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
