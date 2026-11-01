"""Stil 14 · Glas-Labor / Füllstand (Blender Cycles).

Zwei Messzylinder aus Glas im Fotostudio (Hohlkehle, Softboxen). Jede Fahrt gießt Geld als farbige Flüssigkeit
in den Auto-Zylinder; das Ticket ist ein fester Füllstand. Bei Fahrt 13 erreicht das Auto den Ticket-Stand.
Gut für alles, was sich ansammelt: Kosten, Wasser, Strom, Sprit, Zeit.

Aufruf (im Repo-Ordner):
    /home/user/.venv-blender/bin/python pipeline/stile/stil_14_glas.py [--vorschau] [--samples N] [--gpu]
Danach:  cd pipeline && node stile/render_neu.js 14
Einheit: 1 = 10 cm. Skala: 0–250 € auf 2,0 Einheiten Höhe (Beispielwerte).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402
import blender_gemeinsam as bg  # noqa: E402

sc = bg.neue_szene(samples=96, hintergrund=(1.0, 0.96, 0.93), staerke=0.6, look="AgX - Punchy", belichtung=0.25, bounces=10)

GLAS = bg.material("Glas", "#FFFFFF", rau=0.02, transmission=1.0, ior=1.47)
FLUESSIG_A = bg.material("Flüssigkeit Ticket", "#3D7BFF", rau=0.04, transmission=0.88, ior=1.34, sss=0.15, sss_radius=(0.2, 0.4, 1.0), sss_skala=0.08)
FLUESSIG_B = bg.material("Flüssigkeit Auto", "#FF7A1A", rau=0.04, transmission=0.88, ior=1.34, sss=0.15, sss_radius=(1.0, 0.5, 0.2), sss_skala=0.08)
SKALA = bg.material("Skala", "#FFFFFF", rau=0.4, emission="#FFFFFF", emission_staerke=0.35)
SKALA_D = bg.material("Skala dunkel", "#2A2F45", rau=0.4)
STUDIO = bg.material("Hohlkehle", "#F3E3EE", rau=0.85)
SOCKEL = bg.material("Sockel", "#FFFFFF", rau=0.35, coat=0.4)
BLAU = bg.material("Blau glänzend", "#2F6FED", rau=0.25, coat=0.8, coat_rau=0.08)
BLAU_D = bg.material("Nachtblau", "#1B2A55", rau=0.2, coat=0.6)
ORANGE = bg.material("Orange glänzend", "#FF7A1A", rau=0.25, coat=0.8, coat_rau=0.08)
SCHWARZ = bg.material("Schwarz glänzend", "#22232A", rau=0.3, coat=0.5)
GELB = bg.material("Gelb", "#FFC93C", rau=0.3, emission="#FFD86A", emission_staerke=0.6)
CHROM = bg.material("Chrom", "#E6E9EF", rau=0.12, metall=1.0)
STRICH_B = bg.material("Markierung Auto", "#FF7A1A", rau=0.4, emission="#FF9A4A", emission_staerke=0.8)

Z0, HOEHE_SKALA, EUR_MAX = 0.22, 2.0, 250.0


def eur_z(eur):
    return Z0 + HOEHE_SKALA * eur / EUR_MAX


# ---------------------------------------------------------------- Studio-Hohlkehle (Boden geht weich in die Wand über)
def hohlkehle():
    me = bpy.data.meshes.new("Hohlkehle")
    bm = bmesh.new()
    r, n = 2.5, 16
    prof = [(y, 0.0) for y in (-8.0, -2.0)]
    prof += [(0.0 + r * math.sin(math.pi / 2 * i / n), r - r * math.cos(math.pi / 2 * i / n)) for i in range(n + 1)]
    prof += [(r, 12.0)]
    reihen = []
    for x in (-12.0, 12.0):
        reihen.append([bm.verts.new((x, y + 2.0, z)) for y, z in prof])
    for i in range(len(prof) - 1):
        bm.faces.new((reihen[0][i], reihen[1][i], reihen[1][i + 1], reihen[0][i + 1]))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new("Hohlkehle", me)
    sc.collection.objects.link(o)
    me.materials.append(STUDIO)


hohlkehle()


# ---------------------------------------------------------------- Messzylinder
def messzylinder(name, x, fuell_eur, mat_fl, ziel_eur=None):
    R, H = 0.42, 2.45
    # Fuß (sechseckig, Glas)
    bg.zylinder(name + "Fuss", 0.62, 0.1, (x, 0, 0.05), GLAS, n=6, rundung=0.02)
    # Rohr: offener Zylinder mit Wandstärke (Solidify)
    me = bpy.data.meshes.new(name + "Rohr")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=False, segments=96, radius1=R, radius2=R, depth=H)
    unten = [v for v in bm.verts if v.co.z < 0]
    bm.faces.new(sorted(unten, key=lambda v: math.atan2(v.co.y, v.co.x)))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    rohr = bpy.data.objects.new(name + "Rohr", me)
    sc.collection.objects.link(rohr)
    rohr.location = (x, 0, 0.1 + H / 2)
    so = rohr.modifiers.new("Wand", "SOLIDIFY")
    so.thickness = 0.03
    so.offset = -1
    me.materials.append(GLAS)
    # Ausguss-Lippe
    bg.zylinder(name + "Lippe", R + 0.03, 0.04, (x, 0, 0.1 + H), GLAS, rundung=0.015)
    # Flüssigkeit (etwas kleiner als der Innenraum, leichte Wölbung durch Rundung)
    hf = eur_z(fuell_eur) - 0.13
    bg.zylinder(name + "Fl", R - 0.035, hf, (x, 0, 0.13 + hf / 2), mat_fl, n=96, rundung=0.012)
    # Skala: Striche alle 10 €, lange Striche und Zahlen alle 50 € (vorne, zur Kamera)
    for eur in range(10, 251, 10):
        lang = eur % 50 == 0
        bg.box(f"{name}S{eur}", (0.18 if lang else 0.09, 0.006, 0.012), (x - R * 0.35 + (0.045 if not lang else 0), -R - 0.004, eur_z(eur)), SKALA)
        if lang:
            bg.text(f"{name}Z{eur}", f"{eur}", (x - R * 0.35 + 0.15, -R - 0.006, eur_z(eur)), 0.085, SKALA, dicke=0.002, ausrichtung="LEFT")
    if ziel_eur:
        ring = bg.zylinder(name + "Ziel", R + 0.006, 0.016, (x, 0, eur_z(ziel_eur)), STRICH_B, n=96)
    return rohr


XA, XB = -0.62, 0.62
messzylinder("Ticket", XA, 66.8, FLUESSIG_A)
messzylinder("Auto", XB, 66.8, FLUESSIG_B, ziel_eur=214)

# Gleichstand-Linie (gestrichelt, gelb leuchtend) quer über beide Zylinder auf 66,80 €
zl = eur_z(66.8)
for i in range(22):
    x = -1.15 + i * 0.11
    bg.box(f"Strich{i}", (0.06, 0.012, 0.012), (x, -0.5, zl), GELB)

# Zulauf über dem Auto-Zylinder: Hahn und Strahl (jede Fahrt kostet)
bg.zylinder("Rohr", 0.05, 1.2, (XB + 0.0, 0, 3.55), CHROM, achse="Y", rot=(0, math.radians(90), 0))
bg.zylinder("Hahn", 0.06, 0.25, (XB + 0.0, 0, 3.4), CHROM, rundung=0.01)
strahl_h = 3.28 - zl
bg.zylinder("Strahl", 0.026, strahl_h, (XB, 0, zl + strahl_h / 2), FLUESSIG_B, n=32)
for i in range(3):
    t = bg.kugel(f"Tropfen{i}", 0.035 - i * 0.006, (XB + 0.12 + i * 0.07, -0.05, zl + 0.08 + i * 0.09), FLUESSIG_B, skala=(1, 1, 1.25))

# ---------------------------------------------------------------- Figuren auf Sockeln (Teamzeichen)
def sockel(x):
    bg.zylinder(f"Sockel{x}", 0.34, 0.12, (x, -1.1, 0.06), SOCKEL, rundung=0.03)


sockel(XA)
sockel(XB)
# Zug-Figur (glänzend, stilisiert)
zg = bg.gruppe("ZugFigur", (XA, -1.1, 0.12), (0, 0, math.radians(-28)))
bg.box("ZugK", (0.5, 0.2, 0.2), (0, 0, 0.14), BLAU, radius=0.06, eltern=zg)
bg.box("ZugF", (0.36, 0.205, 0.06), (0.02, 0, 0.17), BLAU_D, radius=0.02, eltern=zg)
for dx in (-0.15, 0.15):
    for dy in (-0.09, 0.09):
        bg.zylinder(f"ZugR{dx}{dy}", 0.045, 0.03, (dx, dy, 0.045), SCHWARZ, achse="Y", eltern=zg)
# Auto-Figur
ag = bg.gruppe("AutoFigur", (XB, -1.1, 0.12), (0, 0, math.radians(28)))
bg.box("AutoU", (0.42, 0.22, 0.1), (0, 0, 0.09), ORANGE, radius=0.045, eltern=ag)
bg.box("AutoO", (0.22, 0.19, 0.09), (-0.03, 0, 0.18), ORANGE, radius=0.04, eltern=ag)
bg.box("AutoS", (0.17, 0.195, 0.05), (-0.03, 0, 0.185), BLAU_D, radius=0.02, eltern=ag)
for dx in (-0.13, 0.13):
    for dy in (-0.1, 0.1):
        bg.zylinder(f"AutoR{dx}{dy}", 0.05, 0.035, (dx, dy, 0.05), SCHWARZ, achse="Y", eltern=ag)

# ---------------------------------------------------------------- Licht (Studio: zwei Softboxen seitlich, eine oben, Rückseite)
bg.licht("AREA", (-4, -3, 3), 900, farbe=(1.0, 0.96, 0.92), groesse=3, ziel=(0, 0, 1.2))
bg.licht("AREA", (4, -2.5, 2.5), 700, farbe=(0.92, 0.95, 1.0), groesse=3, ziel=(0, 0, 1.2))
bg.licht("AREA", (0, 0, 6), 500, groesse=4, ziel=(0, 0, 0))
bg.licht("AREA", (0, 3.5, 1.5), 450, farbe=(1.0, 0.9, 0.95), groesse=4, ziel=(0, 0, 1.2))
cam = bg.kamera((0.0, -9.6, 2.3), (0.0, 0.0, 1.38), brennweite=60, blende=2.8)
cam.data.dof.focus_distance = (cam.location - Vector((0, -0.4, 1.0))).length

bg.render(sc, 14, "glas")
