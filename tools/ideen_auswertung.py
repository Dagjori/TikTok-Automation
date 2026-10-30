"""Wertet die Ideenlisten in data/ideen/*.csv aus.

Aufruf: python3 tools/ideen_auswertung.py [data/ideen]
Gibt pro Nische Ideenzahl, Kategorien, Typen, Risiko und Reichweite in Monaten aus.
"""
import csv
import sys
from collections import Counter
from pathlib import Path


def lade(datei):
    with open(datei, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def auswerten(zeilen):
    titel = [z["titel"].strip().lower() for z in zeilen]
    varianten = 0
    for z in zeilen:
        try:
            varianten += int(float(z.get("varianten") or 0))
        except ValueError:
            pass
    n = len(zeilen)
    risiko = Counter(z.get("risiko", "").strip().lower() for z in zeilen)
    typ = Counter(z.get("typ", "").strip().lower() for z in zeilen)
    sicher = n - risiko.get("hoch", 0)
    return {
        "ideen": n,
        "dubletten": n - len(set(titel)),
        "kategorien": len({z["kategorie"].strip() for z in zeilen}),
        "varianten": varianten,
        "risiko_hoch": risiko.get("hoch", 0),
        "evergreen": typ.get("evergreen", 0),
        "saisonal": typ.get("saisonal", 0),
        "news": typ.get("news", 0),
        # Monate Vorrat ohne riskante Ideen, ohne Varianten
        "monate_1_pro_tag": round(sicher / 30, 1),
        "monate_2_pro_tag": round(sicher / 60, 1),
    }


def main():
    ordner = Path(sys.argv[1] if len(sys.argv) > 1 else "data/ideen")
    spalten = ["nische", "ideen", "dubletten", "kategorien", "varianten", "risiko_hoch",
               "evergreen", "saisonal", "news", "monate_1_pro_tag", "monate_2_pro_tag"]
    print(" | ".join(spalten))
    for datei in sorted(ordner.glob("*.csv")):
        werte = auswerten(lade(datei))
        print(" | ".join([datei.stem] + [str(werte[s]) for s in spalten[1:]]))


if __name__ == "__main__":
    main()
