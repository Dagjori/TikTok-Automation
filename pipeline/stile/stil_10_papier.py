"""Stil 10 · Papier-Diorama (Blender Cycles).

Ausgeschnittene Kartonschichten hintereinander wie in einem Schaukasten: Himmel, Stadt, Hügel, Gleis, Straße, Vordergrund.
Echte Schatten zwischen den Schichten, feine Papierfaser, leicht unscharfer Hinter- und Vordergrund.
Seitenansicht: beide Teams fahren nach rechts, der Zug ist schon über die Ziellinie „13“.

Aufruf (im Repo-Ordner):
    /home/user/.venv-blender/bin/python pipeline/stile/stil_10_papier.py [--vorschau] [--samples N] [--gpu]
Danach:  cd pipeline && node stile/render_neu.js 10
Achsen: x = rechts, z = oben, y = Tiefe (größer = weiter hinten). Einheit: 1 = 10 cm.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import blender_gemeinsam as bg  # noqa: E402

sc = bg.neue_szene(samples=48, hintergrund=(0.86, 0.93, 1.0), staerke=0.5, look="None", belichtung=0.0, ansicht="Standard")
D = 0.012  # Kartondicke


def papier(name, farbe, rau=0.88):
    m = bg.material(name, farbe, rau=rau, sheen=0.35, sheen_rau=0.6)
    bg.rausch_bump(m, skala=260.0, staerke=0.22, detail=8.0, abstand=0.002)
    return m


# ---------------------------------------------------------------- Formen
def kreis(r, n=56, cx=0.0, cy=0.0):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def rundrechteck(x0, y0, x1, y1, r, n=8):
    pts = []
    for (cx, cy, a0) in [(x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)]:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def band(x0, x1, unten, oben_fn, n=120):
    """Fläche von x0 bis x1, unten gerade, oben nach Funktion (Hügel, Kanten)."""
    pts = [(x0 + (x1 - x0) * i / n, oben_fn(x0 + (x1 - x0) * i / n)) for i in range(n + 1)]
    return pts + [(x1, unten), (x0, unten)]


def schicht(name, punkte, tiefe, farbe_mat, dx=0.0, dz=0.0):
    """Aufrechte Kartonform in der Ebene y = tiefe (Punkte in x/z)."""
    return bg.flaeche(name, [(x + dx, z + dz) for x, z in punkte], D, (0, tiefe, 0), farbe_mat, rot=(math.pi / 2, 0, 0))


# ---------------------------------------------------------------- Materialien
HIMMEL = papier("Himmel", "#9ED8F5")
SONNE = papier("Sonne", "#FFD23F")
SONNE2 = papier("Sonnenring", "#FFA94D")
WOLKE = papier("Wolke", "#FFFFFF")
STADT1 = papier("Stadt hell", "#C9D7F0")
STADT2 = papier("Stadt mittel", "#AFC2E6")
FENSTER = papier("Fenster", "#F4F7FF")
HUEGEL1 = papier("Hügel hinten", "#BFE3A1")
HUEGEL2 = papier("Hügel mitte", "#8FD27E")
WIESE = papier("Wiese", "#6CC070")
VORNE = papier("Vordergrund", "#4FB06A")
DAMM = papier("Bahndamm", "#E7C9A0")
SCHIENE = papier("Schiene", "#6E6A7A")
SCHWELLE = papier("Schwelle", "#9B6B47")
STRASSE = papier("Straße", "#5B6275")
WEISS = papier("Weiß", "#FBFAF6")
SCHWARZ = papier("Schwarz", "#26262E")
BLAU = papier("Team Ticket", "#2F6FED")
BLAU_D = papier("Nachtblau", "#1B2A55")
ORANGE = papier("Team Auto", "#FF7A1A")
GLAS = papier("Glas", "#BFE6FF")
GELB = papier("Gelb", "#FFC93C")
BRAUN = papier("Stamm", "#A0714E")
GRAU = papier("Grau", "#C9CCD6")
ROSA = papier("Blüte", "#FF9EC4")

# ---------------------------------------------------------------- Himmel, Sonne, Wolken
schicht("Himmel", rundrechteck(-9, -4, 9, 12, 0.1), 7.0, HIMMEL)
schicht("Sonnenring", kreis(0.95, cx=1.5, cy=6.3), 6.75, SONNE2)
schicht("Sonne", kreis(0.72, cx=1.5, cy=6.3), 6.6, SONNE)
for (cx, cy, s, t) in [(-1.6, 6.9, 1.0, 6.4), (2.9, 5.3, 0.8, 6.3), (-2.8, 5.0, 0.7, 6.2)]:
    for k, (ox, oy, r) in enumerate([(0, 0, 0.42), (0.5, 0.18, 0.5), (1.0, 0, 0.4), (0.5, -0.12, 0.42)]):
        schicht(f"Wolke{cx}{ox}", kreis(r * s, cx=cx + ox * s, cy=cy + oy * s), t - 0.025 * k, WOLKE)

# ---------------------------------------------------------------- Stadt (hinten)
haeuser = [(-4.2, 0.9, 4.6), (-3.2, 0.7, 5.4), (-2.4, 0.8, 4.2), (-1.5, 0.6, 5.0), (-0.8, 0.9, 4.4), (0.3, 0.7, 5.7), (1.1, 0.8, 4.5), (2.0, 0.7, 5.1), (2.9, 0.9, 4.3), (3.9, 0.8, 4.9)]
for i, (x, b, h) in enumerate(haeuser):
    m = STADT1 if i % 2 else STADT2
    schicht(f"Haus{i}", [(x, 2.0), (x + b, 2.0), (x + b, h), (x, h)], 5.6 + (i % 2) * 0.12, m)
    for r in range(int((h - 3.0) / 0.36)):
        for c in range(2):
            fx, fz = x + 0.14 + c * (b - 0.36) / 1, 3.1 + r * 0.36
            schicht(f"F{i}{r}{c}", rundrechteck(fx, fz, fx + 0.16, fz + 0.2, 0.03, 2), 5.6 + (i % 2) * 0.12 - 0.014, FENSTER)

# ---------------------------------------------------------------- Hügel mit Bäumen
schicht("Hügel hinten", band(-9, 9, -3, lambda x: 3.35 + 0.35 * math.sin(x * 0.9 + 1.2) + 0.15 * math.sin(x * 2.3)), 4.8, HUEGEL1)
schicht("Hügel mitte", band(-9, 9, -3, lambda x: 2.95 + 0.28 * math.sin(x * 1.3 - 0.4) + 0.1 * math.sin(x * 3.1)), 4.2, HUEGEL2)
for i, x in enumerate([-3.6, -2.7, -0.9, 0.6, 2.4, 3.3]):
    zb = 2.95 + 0.28 * math.sin(x * 1.3 - 0.4) + 0.1 * math.sin(x * 3.1)
    schicht(f"Stamm{i}", [(x - 0.05, zb - 0.2), (x + 0.05, zb - 0.2), (x + 0.05, zb + 0.35), (x - 0.05, zb + 0.35)], 4.12, BRAUN)
    schicht(f"Krone{i}", kreis(0.3 + 0.06 * (i % 2), cx=x, cy=zb + 0.55), 4.08, WIESE if i % 2 else VORNE)

# ---------------------------------------------------------------- Bahndamm mit Gleis und Zug (Team Ticket)
ZR = 2.12  # Schienenoberkante
schicht("Bahndamm", band(-9, 9, -3, lambda x: 2.4 + 0.03 * math.sin(x * 4)), 3.4, DAMM)
schicht("Schiene", [(-9, ZR - 0.06), (9, ZR - 0.06), (9, ZR), (-9, ZR)], 3.37, SCHIENE)
for i in range(46):
    x = -9 + i * 0.4
    schicht(f"Schwelle{i}", [(x, ZR - 0.16), (x + 0.2, ZR - 0.16), (x + 0.2, ZR - 0.06), (x, ZR - 0.06)], 3.38, SCHWELLE)

XL = 0.95  # Ziellinie
XZ = XL + 0.75  # Zugspitze


def wagen(name, x1, laenge, lok, tiefe=3.2):
    x0 = x1 - laenge
    zb = ZR + 0.12
    hoehe = 0.78
    if lok:
        pts = [(x0 + 0.1, zb), (x1 - 0.12, zb), (x1, zb + 0.12), (x1, zb + 0.32), (x1 - 0.42, zb + hoehe), (x0 + 0.1, zb + hoehe), (x0, zb + hoehe - 0.1), (x0, zb + 0.1)]
    else:
        pts = rundrechteck(x0, zb, x1, zb + hoehe, 0.12)
    schicht(name, pts, tiefe, BLAU)
    schicht(name + "Streifen", [(x0 + 0.06, zb + 0.14), (x1 - (0.06 if not lok else 0.04), zb + 0.14), (x1 - (0.06 if not lok else 0.02), zb + 0.22), (x0 + 0.06, zb + 0.22)], tiefe - 0.014, BLAU_D)
    n = int((laenge - 0.6) / 0.42)
    for k in range(n):
        fx = x0 + 0.22 + k * 0.42
        schicht(f"{name}F{k}", rundrechteck(fx, zb + 0.36, fx + 0.3, zb + 0.62, 0.05, 3), tiefe - 0.014, GLAS)
    if lok:
        schicht(name + "Front", [(x1 - 0.36, zb + 0.4), (x1 - 0.08, zb + 0.4), (x1 - 0.32, zb + 0.66), (x1 - 0.36, zb + 0.66)], tiefe - 0.014, BLAU_D)
        schicht(name + "Licht", kreis(0.05, cx=x1 - 0.07, cy=zb + 0.24), tiefe - 0.016, GELB)
    for dx in (0.3, 0.62, laenge - 0.62, laenge - 0.3):
        schicht(f"{name}R{dx}", kreis(0.11, cx=x0 + dx, cy=ZR + 0.1), tiefe - 0.02, SCHWARZ)
        schicht(f"{name}N{dx}", kreis(0.04, cx=x0 + dx, cy=ZR + 0.1), tiefe - 0.034, GRAU)


wagen("Lok", XZ, 2.2, True)
wagen("Wagen", XZ - 2.3, 2.2, False)

# ---------------------------------------------------------------- Wiese, Straße mit Auto (Team Auto)
schicht("Wiese", band(-9, 9, -3, lambda x: 1.72 + 0.05 * math.sin(x * 3.0)), 2.7, WIESE)
for i, x in enumerate([-3.3, -2.2, -1.1, 2.6, 3.5]):
    schicht(f"Blume{i}", kreis(0.07, cx=x, cy=1.6 + 0.05 * (i % 2)), 2.68, ROSA if i % 2 else GELB)
ZS = 0.62  # Straßenoberkante unten (Räder stehen hier)
schicht("Straße", [(-9, 0.1), (9, 0.1), (9, 1.42), (-9, 1.42)], 2.1, STRASSE)
schicht("Bordstein", [(-9, 1.38), (9, 1.38), (9, 1.48), (-9, 1.48)], 2.08, GRAU)
for i in range(14):
    x = -8 + i * 1.2
    schicht(f"Strich{i}", [(x, 1.0), (x + 0.6, 1.0), (x + 0.6, 1.06), (x, 1.06)], 2.08, WEISS)

XA = XL - 0.25  # Autofront knapp vor der Linie
auto_pts = [(XA - 1.35, ZS + 0.12), (XA - 0.05, ZS + 0.12), (XA, ZS + 0.2), (XA, ZS + 0.42), (XA - 0.25, ZS + 0.5), (XA - 0.45, ZS + 0.8), (XA - 1.0, ZS + 0.82), (XA - 1.25, ZS + 0.55), (XA - 1.38, ZS + 0.5), (XA - 1.4, ZS + 0.2)]
schicht("Auto", auto_pts, 1.95, ORANGE)
schicht("AutoFenster1", [(XA - 0.52, ZS + 0.52), (XA - 0.33, ZS + 0.52), (XA - 0.5, ZS + 0.74), (XA - 0.68, ZS + 0.74)], 1.936, GLAS)
schicht("AutoFenster2", [(XA - 0.98, ZS + 0.52), (XA - 0.6, ZS + 0.52), (XA - 0.75, ZS + 0.74), (XA - 0.95, ZS + 0.74), (XA - 1.12, ZS + 0.55)], 1.936, GLAS)
schicht("AutoLicht", kreis(0.045, cx=XA - 0.04, cy=ZS + 0.34), 1.934, GELB)
for dx in (0.3, 1.05):
    schicht(f"AutoRad{dx}", kreis(0.17, cx=XA - dx, cy=ZS + 0.15), 1.93, SCHWARZ)
    schicht(f"AutoNabe{dx}", kreis(0.07, cx=XA - dx, cy=ZS + 0.15), 1.916, GRAU)

# ---------------------------------------------------------------- Ziellinie „13“: Zielflaggen auf beiden Ebenen und Schild
for (z0, z1, t) in [(ZR, ZR + 1.25, 3.05), (ZS - 0.05, ZS + 1.15, 1.75)]:
    schicht(f"Mast{t}", [(XL - 0.025, z0), (XL + 0.025, z0), (XL + 0.025, z1), (XL - 0.025, z1)], t, WEISS)
    for r in range(2):
        for c in range(3):
            fx, fz = XL + 0.025 + c * 0.12, z1 - 0.12 - r * 0.12
            schicht(f"Flagge{t}{r}{c}", [(fx, fz), (fx + 0.12, fz), (fx + 0.12, fz + 0.12), (fx, fz + 0.12)], t - 0.002 * (r + c), SCHWARZ if (r + c) % 2 else WEISS)
schild_x = XL + 0.95
schicht("SchildStab", [(schild_x - 0.03, -0.5), (schild_x + 0.03, -0.5), (schild_x + 0.03, 1.5), (schild_x - 0.03, 1.5)], 1.32, BRAUN)
schicht("Schild", rundrechteck(schild_x - 0.36, 1.3, schild_x + 0.36, 1.84, 0.08), 1.3, GELB)
bg.text("Dreizehn", "13", (schild_x, 1.288, 1.57), 0.42, BLAU_D, dicke=D, rot=(math.pi / 2, 0, 0))

# ---------------------------------------------------------------- Vordergrund (unscharf)
schicht("Vordergrund", band(-9, 9, -3, lambda x: 0.05 + 0.18 * math.sin(x * 2.2 + 0.5) + 0.08 * math.sin(x * 5.3)), 1.1, VORNE)
for i, x in enumerate([-2.4, -0.6, 1.9, 3.0]):
    schicht(f"Busch{i}", kreis(0.32, cx=x, cy=0.1), 1.05, VORNE)

# ---------------------------------------------------------------- Licht und Kamera
bg.licht("SUN", (-5, -8, 9), 4.2, farbe=(1.0, 0.95, 0.88), winkel=5, ziel=(0, 3, 1.5))
bg.licht("AREA", (4, -6, 3), 200, farbe=(0.9, 0.95, 1.0), groesse=6, ziel=(0, 3, 2))
from mathutils import Vector  # noqa: E402
cam = bg.kamera((0.75, -10.5, 1.95), (0.75, 3.0, 1.45), brennweite=70, blende=2.0)
cam.data.dof.focus_distance = (cam.location - Vector((XL, 2.6, 1.6))).length

bg.render(sc, 10, "papier")
