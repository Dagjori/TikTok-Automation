"""Konzept B „Kugelbahn“: zwei Kugeln in den Teamfarben rollen auf einer
gebogenen Bahn um die Wette.

Die Bahn ist eine Zykloide, also die Brachistochrone: die Kurve, auf der eine
Kugel schneller unten ist als auf der geraden Strecke. Ein Simulations-Klassiker
mit genau der Kanal-Pointe: Die naheliegende Antwort stimmt nicht immer.
Orange liegt vorn, Blau ist noch im steilen Teil.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as g  # noqa: E402
from mathutils import Vector  # noqa: E402

ORDNER = os.path.join(g.LOGO_ORDNER, "b-kugelbahn")
NAME = "simulierbar-logo-b-kugelbahn"

START = Vector((-1.25, 1.05))
ZIEL = Vector((1.35, -0.62))
BAHN = 0.40        # Breite der Bahn (Ansicht von vorn)
KUGEL_R = 0.41     # Radius der Kugeln
T_START = 0.42     # Zykloide erst ab hier (die Spitze am Start ist zu eng für die Bahnbreite)


def zykloide(n=260):
    """Zykloide von START nach ZIEL (Brachistochrone)."""
    dx, dy = ZIEL.x - START.x, START.y - ZIEL.y
    lo, hi = 0.01, 2 * math.pi - 0.01
    for _ in range(100):  # T mit (T - sin T) / (1 - cos T) = dx / dy
        m = (lo + hi) / 2
        if (m - math.sin(m)) / (1 - math.cos(m)) < dx / dy:
            lo = m
        else:
            hi = m
    T = (lo + hi) / 2
    r = dy / (1 - math.cos(T))
    ts = [T_START + (T - T_START) * i / n for i in range(n + 1)]
    return [(START.x + r * (t - math.sin(t)), START.y - r * (1 - math.cos(t))) for t in ts]


def laengen(P):
    L = [0.0]
    for i in range(1, len(P)):
        L.append(L[-1] + (P[i] - P[i - 1]).length)
    return L


def punkt_bei(pts, anteil):
    P = [Vector(p) for p in pts]
    L = laengen(P)
    ziel = anteil * L[-1]
    for i in range(1, len(P)):
        if L[i] >= ziel:
            f = (ziel - L[i - 1]) / max(L[i] - L[i - 1], 1e-9)
            return P[i - 1].lerp(P[i], f), (P[i] - P[i - 1]).normalized()
    return P[-1], (P[-1] - P[-2]).normalized()


def kugel_auf(pts, anteil, name, mat, wurzel, radius=KUGEL_R, z=0.0):
    """Kugel liegt oben auf der Bahn (Normale zeigt nach oben)."""
    p, t = punkt_bei(pts, anteil)
    nrm = Vector((-t.y, t.x))
    if nrm.y < 0:
        nrm = -nrm
    ort = p + nrm * (BAHN / 2 + radius - 0.015)
    return g.kugel(name, radius, (ort.x, ort.y, z), mat, eltern=wurzel)


def baue(anteil_blau=0.19, anteil_orange=0.71):
    wurzel = g.logo_wurzel()
    m_bahn = g.keramik("Bahn")
    m_blau = g.kunststoff("Blau", g.FARBEN["blau"], rauheit=0.2)
    m_orange = g.kunststoff("Orange", g.FARBEN["orange"], rauheit=0.2)
    kurve = zykloide()
    g.platte_aus_umriss("Bahn", [g.strich_umriss(kurve, BAHN - 0.16)], tiefe=0.17, fase=0.08,
                        fase_aufloesung=8, mat=m_bahn, eltern=wurzel)
    kugel_auf(kurve, anteil_blau, "KugelBlau", m_blau, wurzel)
    kugel_auf(kurve, anteil_orange, "KugelOrange", m_orange, wurzel)
    return wurzel


def szene(vorschau=False, aufloesung=2048):
    s = g.leere_szene(aufloesung=aufloesung, samples=32 if vorschau else 64)
    g.welt()
    baue()
    groesse = (ZIEL.x - START.x) + BAHN + 0.2
    g.kamera(abstand=g.abstand_fuer(groesse, 100, 0.84), azimut=-12, hoehe=10, brennweite=100,
             ziel=(0.05, 0, 0.28))
    g.studio_licht(skala=1.0, staerke=0.75)
    g.kamera_einpassen(0.86)
    return s


if __name__ == "__main__":
    arg = g.argumente()
    szene(vorschau=arg["vorschau"], aufloesung=1024 if arg["vorschau"] else 2048)
    if arg["vorschau"]:
        g.rendern(os.path.join(g.SCRATCH, "vorschau_b.png"))
    else:
        g.speichern_und_exportieren(ORDNER, NAME)
        g.rendern(os.path.join(ORDNER, "roh-2048.png"))
