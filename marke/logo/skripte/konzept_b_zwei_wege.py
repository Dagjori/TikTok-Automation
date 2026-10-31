"""Konzept B „Zwei Wege“: zwei Bahnen vom selben Start zum selben Ziel –
eine gerade, eine gekrümmte (Brachistochrone, Zykloide). Zwei Kugeln in den
Teamfarben rollen um die Wette; die Kugel auf dem scheinbar längeren Umweg
liegt vorn. Das ist der Klassiker unter den Simulationen und genau die
Kanal-Pointe: Die naheliegende Antwort ist nicht immer die richtige.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as g  # noqa: E402
from mathutils import Vector  # noqa: E402

ORDNER = os.path.join(g.LOGO_ORDNER, "b-zwei-wege")
NAME = "simulierbar-logo-b-zwei-wege"

START = Vector((-1.75, 1.15))
ZIEL = Vector((1.75, -0.85))
BAHN = 0.22        # Breite der Bahnen
KUGEL_R = 0.30     # Radius der Kugeln


def zykloide(n=400):
    """Zykloide von START nach ZIEL (nach unten durchhängend)."""
    dx, dy = ZIEL.x - START.x, START.y - ZIEL.y
    # T so bestimmen, dass (T - sin T) / (1 - cos T) = dx / dy
    lo, hi = 0.01, 2 * math.pi - 0.01
    for _ in range(100):
        m = (lo + hi) / 2
        f = (m - math.sin(m)) / (1 - math.cos(m))
        if f < dx / dy:
            lo = m
        else:
            hi = m
    T = (lo + hi) / 2
    r = dy / (1 - math.cos(T))
    return [(START.x + r * (t - math.sin(t)), START.y - r * (1 - math.cos(t)))
            for t in [T * i / n for i in range(n + 1)]], T, r


def gerade(n=200):
    return [tuple(START.lerp(ZIEL, i / n)) for i in range(n + 1)]


def punkt_bei(pts, anteil):
    P = [Vector(p) for p in pts]
    laengen = [0.0]
    for i in range(1, len(P)):
        laengen.append(laengen[-1] + (P[i] - P[i - 1]).length)
    ziel = anteil * laengen[-1]
    for i in range(1, len(P)):
        if laengen[i] >= ziel:
            f = (ziel - laengen[i - 1]) / max(laengen[i] - laengen[i - 1], 1e-9)
            return P[i - 1].lerp(P[i], f), (P[i] - P[i - 1]).normalized()
    return P[-1], (P[-1] - P[-2]).normalized()


def kugel_auf(pts, anteil, name, mat, wurzel, z=0.0):
    p, t = punkt_bei(pts, anteil)
    nrm = Vector((-t.y, t.x))
    if nrm.y < 0:
        nrm = -nrm
    ort = p + nrm * (BAHN / 2 + KUGEL_R + 0.02)
    return g.kugel(name, KUGEL_R, (ort.x, ort.y, z), mat, eltern=wurzel)


def baue(anteil_blau=0.52, anteil_orange=0.80):
    wurzel = g.logo_wurzel()
    m_bahn = g.keramik("Bahn")
    m_blau = g.kunststoff("Blau", g.FARBEN["blau"], rauheit=0.22)
    m_orange = g.kunststoff("Orange", g.FARBEN["orange"], rauheit=0.22)
    m_gruen = g.kunststoff("Gruen", g.FARBEN["gruen"])
    m_gelb = g.kunststoff("Gelb", g.FARBEN["gelb"])
    kurve, _, _ = zykloide()
    linie = gerade()
    # Gerade Bahn vorn, Kurve etwas dahinter, damit sich die Bahnen am Start/Ziel sauber treffen
    g.platte_aus_umriss("BahnGerade", [g.strich_umriss(linie, BAHN)], tiefe=0.05, fase=0.05,
                        mat=m_bahn, eltern=wurzel, z=0.0)
    g.platte_aus_umriss("BahnKurve", [g.strich_umriss(kurve, BAHN)], tiefe=0.05, fase=0.05,
                        mat=m_bahn, eltern=wurzel, z=-0.02)
    kugel_auf(linie, anteil_blau, "KugelBlau", m_blau, wurzel)
    kugel_auf(kurve, anteil_orange, "KugelOrange", m_orange, wurzel)
    # Start (grün) und Ziel (gelb) als flache Knöpfe
    g.zylinder("Start", 0.24, 0.22, (START.x, START.y, 0.02), m_gruen, eltern=wurzel, fase=0.06)
    g.zylinder("Ziel", 0.24, 0.22, (ZIEL.x, ZIEL.y, 0.02), m_gelb, eltern=wurzel, fase=0.06)
    return wurzel


def szene(vorschau=False, aufloesung=2048):
    s = g.leere_szene(aufloesung=aufloesung, samples=32 if vorschau else 128)
    g.welt()
    baue()
    groesse = (ZIEL.x - START.x) + 0.8
    g.kamera(abstand=g.abstand_fuer(groesse, 100, 0.80), azimut=-12, hoehe=10, brennweite=100)
    g.studio_licht(skala=1.0, staerke=0.75)
    return s


if __name__ == "__main__":
    arg = g.argumente()
    szene(vorschau=arg["vorschau"], aufloesung=1024 if arg["vorschau"] else 2048)
    if arg["vorschau"]:
        g.rendern(os.path.join(g.SCRATCH, "vorschau_b.png"))
    else:
        g.speichern_und_exportieren(ORDNER, NAME)
        g.rendern(os.path.join(ORDNER, "roh-2048.png"))
