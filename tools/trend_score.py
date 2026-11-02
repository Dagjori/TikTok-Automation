"""Berechnet den Trend-Score nach dem Raster in CLAUDE.md §10 (Trend-Radar).

Aufruf: python3 tools/trend_score.py NACHFRAGE TIMING WETTBEWERB PASSUNG AUFWAND RISIKO
Jeder Wert 1–5. Ausgabe: Score (20–100) und Entscheidung.
"""
import sys

GEWICHTE = {"nachfrage": 30, "timing": 20, "wettbewerb": 15, "passung": 15, "aufwand": 10, "risiko": 10}


def score(werte):
    return round(sum(GEWICHTE[k] * werte[k] for k in GEWICHTE) / 5)


def entscheidung(punkte):
    if punkte >= 70:
        return "vorschlagen"
    if punkte >= 50:
        return "beobachten"
    return "verworfen"


def main():
    if len(sys.argv) != 7:
        sys.exit(__doc__)
    werte = dict(zip(GEWICHTE, (int(x) for x in sys.argv[1:])))
    if not all(1 <= v <= 5 for v in werte.values()):
        sys.exit("Alle Werte müssen zwischen 1 und 5 liegen.")
    punkte = score(werte)
    print(punkte, entscheidung(punkte))


if __name__ == "__main__":
    main()
