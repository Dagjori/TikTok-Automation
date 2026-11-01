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

sc = bg.neue_szene(samples=56, hintergrund=(1.0, 0.96, 0.93), staerke=0.6, look="AgX - Punchy", belichtung=0.25, bounces=10)

sc.cycles.glossy_bounces = 10  # Totalreflexion in der Glaswand braucht viele Glanz-Sprünge, sonst wird das Glas schwarz
GLAS = bg.material("Glas", "#FFFFFF", rau=0.02, transmission=1.0, ior=1.47)
GLAS.node_tree.nodes["Principled BSDF"].inputs["Thin Wall"].default_value = True  # dünnes Laborglas: Spiegelung ohne Linsenverzerrung
FLUESSIG_A = bg.material("Flüssigkeit Ticket", "#2F6FED", rau=0.04, transmission=0.7, ior=1.34, sss=0.3, sss_radius=(0.2, 0.4, 1.0), sss_skala=0.08)
FLUESSIG_B = bg.material("Flüssigkeit Auto", "#FF6A00", rau=0.04, transmission=0.7, ior=1.34, sss=0.3, sss_radius=(1.0, 0.5, 0.2), sss_skala=0.08)
SKALA = bg.material("Skala", "#1B2140", rau=0.5)
SKALA_D = bg.material("Skala dunkel", "#2A2F45", rau=0.4)
STUDIO = bg.material("Hohlkehle", "#E6DCFF", rau=0.85)
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
    bg.zylinder(name + "Fuss", 0.6, 0.1, (x, 0, 0.05), SOCKEL, n=6, rundung=0.02)
    # Rohr: Zylinder mit Boden, Deckel entfernt; dünnwandiges Glas (Thin Wall) statt echter Wandstärke
    me = bpy.data.meshes.new(name + "Rohr")
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=96, radius1=R, radius2=R, depth=H)
    oben = [f for f in bm.faces if all(v.co.z > H / 2 - 1e-4 for v in f.verts)]
    bmesh.ops.delete(bm, geom=oben, context="FACES_ONLY")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    seite = next(f for f in bm.faces if len(f.verts) == 4)
    mitte = seite.calc_center_median()
    if seite.normal.x * mitte.x + seite.normal.y * mitte.y < 0:  # Normalen müssen nach außen zeigen, sonst ist das Glas „innen außen“
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    for f in bm.faces:
        f.smooth = len(f.verts) == 4
    bm.to_mesh(me)
    bm.free()
    rohr = bpy.data.objects.new(name + "Rohr", me)
    sc.collection.objects.link(rohr)
    rohr.location = (x, 0, 0.1 + H / 2)
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
        bg.box(name + "Ziel", (0.5, 0.008, 0.02), (x + 0.02, -R - 0.006, eur_z(ziel_eur)), STRICH_B)
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
bg.zylinder("Rohr", 0.05, 2.0, (XB + 1.0, 0, 3.55), CHROM, rot=(0, math.radians(90), 0))
bg.zylinder("Hahn", 0.06, 0.25, (XB, 0, 3.45), CHROM, rundung=0.01)
bg.kugel("Knie", 0.06, (XB, 0, 3.55), CHROM)
strahl_h = 3.28 - zl
bg.zylinder("Strahl", 0.026, strahl_h, (XB, 0, zl + strahl_h / 2), FLUESSIG_B, n=32)
for i in range(3):
    t = bg.kugel(f"Tropfen{i}", 0.035 - i * 0.006, (XB + 0.12 + i * 0.07, -0.05, zl + 0.08 + i * 0.09), FLUESSIG_B, skala=(1, 1, 1.25))

# Teamzeichen kommen als Chips aus dem HUD (stil_14_glas.html), damit nichts unter dem Untertitel verschwindet.

# ---------------------------------------------------------------- Licht (Studio: zwei Softboxen seitlich, eine oben, Rückseite)
bg.licht("AREA", (-4, -3, 3), 900, farbe=(1.0, 0.96, 0.92), groesse=3, ziel=(0, 0, 1.2))
bg.licht("AREA", (4, -2.5, 2.5), 700, farbe=(0.92, 0.95, 1.0), groesse=3, ziel=(0, 0, 1.2))
bg.licht("AREA", (0, 0, 6), 500, groesse=4, ziel=(0, 0, 0))
bg.licht("AREA", (0, 3.5, 1.5), 450, farbe=(1.0, 0.9, 0.95), groesse=4, ziel=(0, 0, 1.2))
cam = bg.kamera((0.0, -9.6, 1.65), (0.0, 0.0, 1.085), brennweite=60, blende=2.8)
cam.data.dof.focus_distance = (cam.location - Vector((0, -0.4, 1.0))).length

bg.render(sc, 14, "glas")
