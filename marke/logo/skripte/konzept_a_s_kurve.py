"""Konzept A „S-Kurve“: ein S aus zwei parallelen Rennbahnen (Blau und Orange).

Die Bahnen tauschen in der Mitte Innen- und Außenseite (wie bei einer echten
Schikane): oben fährt Blau innen, unten Orange. Am Ende jeder Bahn liegt eine
Kugel als „Läufer“ – Orange hat knapp die Nase vorn.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as g  # noqa: E402

ORDNER = os.path.join(g.LOGO_ORDNER, "a-s-kurve")
NAME = "simulierbar-logo-a-s-kurve"

RX, RY = 1.18, 1.0       # Halbachsen der beiden Bögen der Mittellinie
SPUR = 0.44              # Breite einer Bahn
LUECKE = 0.10            # Spalt zwischen den Bahnen
VERSATZ = (SPUR + LUECKE) / 2
W_START, W_ENDE = 18.0, 270.0  # Winkel des oberen Bogens (Grad); der untere ist punktsymmetrisch


def mittellinie(n=360):
    """S-Mittellinie: oberer Bogen gegen den Uhrzeigersinn, unterer im Uhrzeigersinn."""
    pts = []
    for i in range(n + 1):
        w = math.radians(W_START + (W_ENDE - W_START) * i / n)
        pts.append((RX * math.cos(w), RY + RY * math.sin(w)))
    for i in range(1, n + 1):
        w = math.radians(90 - (W_ENDE - W_START) * i / n)
        pts.append((RX * math.cos(w), -RY + RY * math.sin(w)))
    return pts


def versetzt(pts, d):
    """Linie um d nach links (bezogen auf die Laufrichtung) verschieben."""
    from mathutils import Vector
    P = [Vector(p) for p in pts]
    out = []
    for i in range(len(P)):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        nrm = Vector((-t.y, t.x))
        q = P[i] + nrm * d
        out.append((q.x, q.y))
    return out


def teil(pts, von, bis):
    """Ausschnitt einer Polylinie nach Bogenlänge (0..1)."""
    from mathutils import Vector
    P = [Vector(p) for p in pts]
    laengen = [0.0]
    for i in range(1, len(P)):
        laengen.append(laengen[-1] + (P[i] - P[i - 1]).length)
    L = laengen[-1]
    a, b = von * L, bis * L
    out = []
    for i, s in enumerate(laengen):
        if a <= s <= b:
            out.append((P[i].x, P[i].y))
    return out, L


def punkt_bei(pts, anteil):
    from mathutils import Vector
    P = [Vector(p) for p in pts]
    laengen = [0.0]
    for i in range(1, len(P)):
        laengen.append(laengen[-1] + (P[i] - P[i - 1]).length)
    ziel = anteil * laengen[-1]
    for i in range(1, len(P)):
        if laengen[i] >= ziel:
            f = (ziel - laengen[i - 1]) / max(laengen[i] - laengen[i - 1], 1e-9)
            p = P[i - 1].lerp(P[i], f)
            t = (P[i] - P[i - 1]).normalized()
            return p, t
    return P[-1], (P[-1] - P[-2]).normalized()


def baue(fortschritt=(1.0, 1.0), kugeln=True):
    """Baut das Logo. fortschritt = (blau, orange) als Anteil der Bahnlänge (für die Animation)."""
    wurzel = g.logo_wurzel()
    m_blau = g.kunststoff("Blau", g.FARBEN["blau"])
    m_orange = g.kunststoff("Orange", g.FARBEN["orange"])
    m_kugel = g.keramik("Kugel")
    mitte = mittellinie()
    bahnen = {"Blau": (versetzt(mitte, VERSATZ), m_blau, fortschritt[0]),
              "Orange": (versetzt(mitte, -VERSATZ), m_orange, fortschritt[1])}
    objekte = []
    for name, (linie, mat, f) in bahnen.items():
        if f <= 0.002:
            continue
        stueck, _ = teil(linie, 0.0, f)
        if len(stueck) < 3:
            continue
        umriss = g.strich_umriss(stueck, SPUR - 0.12)
        o = g.platte_aus_umriss(f"Bahn{name}", [umriss], tiefe=0.13, fase=0.06, fase_aufloesung=8,
                                mat=mat, eltern=wurzel)
        objekte.append(o)
    return wurzel, objekte


def szene(vorschau=False, aufloesung=2048):
    s = g.leere_szene(aufloesung=aufloesung, samples=32 if vorschau else 128)
    g.welt()
    wurzel, _ = baue()
    hoehe = 4 * RY + 2 * VERSATZ + SPUR
    breite = 2 * RX + 2 * VERSATZ + SPUR
    groesse = max(hoehe, breite)
    g.kamera(abstand=g.abstand_fuer(groesse, 100, 0.80), azimut=-14, hoehe=10, brennweite=100)
    g.studio_licht(skala=1.0)
    return s


if __name__ == "__main__":
    arg = g.argumente()
    szene(vorschau=arg["vorschau"], aufloesung=1024 if arg["vorschau"] else 2048)
    os.makedirs(ORDNER, exist_ok=True)
    if arg["vorschau"]:
        g.rendern(os.path.join(g.SCRATCH, "vorschau.png"))
    else:
        g.speichern_und_exportieren(ORDNER, NAME)
        g.rendern(os.path.join(ORDNER, "roh-2048.png"))
