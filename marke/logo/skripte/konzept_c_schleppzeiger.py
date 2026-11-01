"""Konzept C „Schleppzeiger“: eine Stoppuhr mit zwei Zeigern in den Teamfarben.

Vorbild ist die Schleppzeiger-Stoppuhr (Rattrapante), mit der man zwei Läufer
gleichzeitig stoppt – genau das, was jedes Duell-Video macht. Die Zeiger stehen
in der „10:10“-Stellung und bilden zugleich ein V wie „versus“.
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as g  # noqa: E402

ORDNER = os.path.join(g.LOGO_ORDNER, "c-schleppzeiger")
NAME = "simulierbar-logo-c-schleppzeiger"

R_AUSSEN = 1.0
R_ZIFFERBLATT = 0.80
W_BLAU = 152.0     # Zeigerwinkel in Grad (mathematisch, 90 = 12 Uhr)
W_ORANGE = 36.0


def kreis(r, n=256, mx=0.0, my=0.0):
    return [(mx + r * math.cos(2 * math.pi * i / n), my + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def zeiger(name, winkel, laenge, breite, mat, wurzel, z):
    w = math.radians(winkel)
    a = (-0.04 * math.cos(w), -0.04 * math.sin(w))
    b = (laenge * math.cos(w), laenge * math.sin(w))
    pts = [(a[0] + (b[0] - a[0]) * i / 40, a[1] + (b[1] - a[1]) * i / 40) for i in range(41)]
    return g.platte_aus_umriss(name, [g.strich_umriss(pts, breite)], tiefe=0.025, fase=0.03,
                               mat=mat, eltern=wurzel, z=z)


def baue(w_blau=W_BLAU, w_orange=W_ORANGE, mit_glas=False):
    wurzel = g.logo_wurzel()
    m_gehaeuse = g.keramik("Gehaeuse")
    m_blatt = g.material("Zifferblatt", g.FARBEN["tinte"], rauheit=0.45, lack=0.4, lack_rauheit=0.1)
    m_strich = g.keramik("Striche")
    m_blau = g.kunststoff("Blau", g.FARBEN["blau"], rauheit=0.25)
    m_orange = g.kunststoff("Orange", g.FARBEN["orange"], rauheit=0.25)
    m_gelb = g.kunststoff("Gelb", g.FARBEN["gelb"], rauheit=0.25)

    # Gehäusering (weiß) und Rückseite
    g.platte_aus_umriss("Ring", [kreis(R_AUSSEN - 0.09), kreis(R_ZIFFERBLATT + 0.07)], tiefe=0.12, fase=0.09,
                        fase_aufloesung=8, mat=m_gehaeuse, eltern=wurzel, z=0.0)
    g.zylinder("Rueckseite", R_AUSSEN - 0.12, 0.30, (0, 0, -0.10), m_gehaeuse, eltern=wurzel, fase=0.08)
    g.zylinder("Zifferblatt", R_ZIFFERBLATT + 0.09, 0.04, (0, 0, 0.04), m_blatt, eltern=wurzel, fase=0.0)

    # Krone oben mit Hals, dazu zwei Drücker schräg
    g.zylinder("KroneHals", 0.085, 0.24, (0, R_AUSSEN + 0.06, 0), m_gehaeuse, eltern=wurzel, fase=0.015,
               drehung=(math.radians(90), 0, 0))
    g.zylinder("Krone", 0.24, 0.17, (0, R_AUSSEN + 0.22, 0), m_gehaeuse, eltern=wurzel, fase=0.05,
               drehung=(math.radians(90), 0, 0))
    for seite in (-1, 1):
        w = math.radians(90 - seite * 45)
        r = R_AUSSEN + 0.07
        g.zylinder(f"Druecker{seite}", 0.11, 0.16, (r * math.cos(w), r * math.sin(w), 0), m_gehaeuse,
                   eltern=wurzel, fase=0.035, drehung=(math.radians(90), 0, w - math.radians(90)))

    # Minutenstriche
    for i in range(12):
        w = math.radians(90 - i * 30)
        gross = i % 3 == 0
        r1, r2 = (0.56, 0.70) if gross else (0.62, 0.70)
        pts = [((r1 + (r2 - r1) * k / 10) * math.cos(w), (r1 + (r2 - r1) * k / 10) * math.sin(w)) for k in range(11)]
        g.platte_aus_umriss(f"Strich{i}", [g.strich_umriss(pts, 0.055 if gross else 0.04)], tiefe=0.01,
                            fase=0.012, fase_aufloesung=3, mat=m_strich, eltern=wurzel, z=0.075)

    zeiger("ZeigerOrange", w_orange, 0.66, 0.11, m_orange, wurzel, z=0.10)
    zeiger("ZeigerBlau", w_blau, 0.66, 0.11, m_blau, wurzel, z=0.15)
    g.zylinder("Nabe", 0.105, 0.10, (0, 0, 0.19), m_gelb, eltern=wurzel, fase=0.03)

    if mit_glas:
        import bmesh
        import bpy
        me = bpy.data.meshes.new("Glas")
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=128, v_segments=64, radius=R_ZIFFERBLATT + 0.075)
        # nur die vordere Kappe behalten
        weg = [v for v in bm.verts if v.co.z < 0.0]
        bmesh.ops.delete(bm, geom=weg, context="VERTS")
        bmesh.ops.scale(bm, vec=(1, 1, 0.22), verts=bm.verts)
        bm.to_mesh(me)
        bm.free()
        for p in me.polygons:
            p.use_smooth = True
        o = bpy.data.objects.new("Glas", me)
        bpy.context.scene.collection.objects.link(o)
        me.materials.append(g.glas())
        o.location = (0, 0, 0.12)
        o.parent = wurzel
        # Glas wirft keinen Schatten (sonst wird das Zifferblatt ohne Kaustiken schwarz)
        o.visible_shadow = False
    return wurzel


def szene(vorschau=False, aufloesung=2048):
    s = g.leere_szene(aufloesung=aufloesung, samples=32 if vorschau else 64)
    g.welt()
    baue()
    groesse = 2 * R_AUSSEN + 0.5
    g.kamera(abstand=g.abstand_fuer(groesse, 100, 0.80), azimut=-12, hoehe=10, brennweite=100,
             ziel=(0, 0, 0.18))
    g.studio_licht(skala=0.6, staerke=0.75)
    g.kamera_einpassen(0.86)
    return s


if __name__ == "__main__":
    arg = g.argumente()
    szene(vorschau=arg["vorschau"], aufloesung=1024 if arg["vorschau"] else 2048)
    if arg["vorschau"]:
        g.rendern(os.path.join(g.SCRATCH, "vorschau_c.png"))
    else:
        g.speichern_und_exportieren(ORDNER, NAME)
        g.rendern(os.path.join(ORDNER, "roh-2048.png"))
