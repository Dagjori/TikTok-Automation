"""Stil 11 · Filz & Knöpfe (Blender Cycles).

Weiche, gepolsterte Filzformen mit Faserglanz (Sheen) und feiner Faserstruktur, sichtbare Ziernähte,
Knöpfe als Räder, Bommel-Bäume. Wirkt handgemacht und gemütlich (Zuhause, Winter, Familie, Weihnachten).

Aufruf (im Repo-Ordner):
    /home/user/.venv-blender/bin/python pipeline/stile/stil_11_filz.py [--vorschau] [--samples N] [--gpu]
Danach:  cd pipeline && node stile/render_neu.js 11
Einheit: 1 = 10 cm. Kamera blickt den Bahnen entgegen (Fahrzeuge kommen auf den Zuschauer zu).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
import blender_gemeinsam as bg  # noqa: E402

sc = bg.neue_szene(samples=48, hintergrund=(0.98, 0.92, 0.86), staerke=0.5, look="AgX - Punchy", belichtung=0.2)


def _heller(h, f):
    h = h.lstrip("#")
    return "#" + "".join(f"{max(0, min(255, int(int(h[i:i + 2], 16) * f))):02X}" for i in (0, 2, 4))


def filz(name, farbe, farbe2=None, fusel=1.0):
    """Filz: matt, starker Faserglanz an den Kanten, Faser-Sprenkel in der Farbe (bleibt nach dem Entrauschen sichtbar),
    feine plus grobe Struktur als Relief."""
    m = bg.material(name, farbe, rau=1.0, sheen=1.0, sheen_rau=0.3, sss=0.08, sss_radius=(0.5, 0.3, 0.2), sss_skala=0.02)
    n, l, p = bg.knoten(m)
    tc = n.new("ShaderNodeTexCoord")
    fein = n.new("ShaderNodeTexNoise")
    fein.inputs["Scale"].default_value = 160.0
    fein.inputs["Detail"].default_value = 14.0
    fein.inputs["Roughness"].default_value = 0.8
    fein.inputs["Distortion"].default_value = 1.5
    grob = n.new("ShaderNodeTexNoise")
    grob.inputs["Scale"].default_value = 14.0
    grob.inputs["Detail"].default_value = 4.0
    l.new(tc.outputs["Object"], fein.inputs["Vector"])
    l.new(tc.outputs["Object"], grob.inputs["Vector"])
    summe = n.new("ShaderNodeMath")
    summe.operation = "MULTIPLY_ADD"
    summe.inputs[1].default_value = 0.3
    l.new(grob.outputs["Fac"], summe.inputs[0])
    l.new(fein.outputs["Fac"], summe.inputs[2])
    bu = n.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = min(1.0, 0.8 * fusel)
    bu.inputs["Distance"].default_value = 0.004
    l.new(summe.outputs[0], bu.inputs["Height"])
    l.new(bu.outputs["Normal"], p.inputs["Normal"])
    # Farbe: dunkle und helle Fasern (feines Rauschen) über leichten Farbwolken (grobes Rauschen)
    cr = n.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = bg.hex2lin(_heller(farbe, 0.86))
    cr.color_ramp.elements[1].color = bg.hex2lin(_heller(farbe2 or farbe, 1.12))
    cr.color_ramp.elements[0].position = 0.38
    cr.color_ramp.elements[1].position = 0.66
    l.new(summe.outputs[0], cr.inputs["Fac"])
    l.new(cr.outputs["Color"], p.inputs["Base Color"])
    l.new(cr.outputs["Color"], p.inputs["Sheen Tint"])
    return m


GRUND = filz("Filz Wiese", "#7CC47F", "#6DB873")
GRUND_RAND = filz("Filz Wiese dunkel", "#4E9F5E", "#45925A")
STRASSE = filz("Filz Straße", "#6B7086", "#62677C")
SCHIENE_F = filz("Filz Bahndamm", "#C79A6E", "#BB8E62")
WEISS = filz("Filz Weiß", "#FAF7F0", "#F1ECE2")
SCHWARZ = filz("Filz Schwarz", "#2A2B33")
BLAU = filz("Filz Blau", "#2F6FED", "#2A66DE")
BLAU_D = filz("Filz Nachtblau", "#1E2C5E")
ORANGE = filz("Filz Orange", "#FF7A1A", "#F57014")
GLAS = filz("Filz Hellblau", "#BFE3FF")
GELB = filz("Filz Gelb", "#FFC93C", "#F7BE2E")
ROT = filz("Filz Rot", "#E8443A")
BRAUN = filz("Filz Braun", "#9C6B4A")
POMPOM1 = filz("Bommel grün", "#3DB86B", "#36A960", fusel=2.0)
POMPOM2 = filz("Bommel hellgrün", "#8BD26F", "#7EC662", fusel=2.0)
WATTE = filz("Watte", "#FFFFFF", "#F4F4F4", fusel=2.4)
HINTEN = filz("Filz Hintergrund", "#F5D9C9", "#EFD0BF")
FADEN_W = bg.material("Faden weiß", "#FFFDF6", rau=0.6, sheen=0.6)
FADEN_D = bg.material("Faden dunkel", "#2A2B33", rau=0.6, sheen=0.4)
FADEN_G = bg.material("Faden gelb", "#FFE27A", rau=0.6, sheen=0.5)
KNOPF_S = bg.material("Knopf schwarz", "#25262E", rau=0.22, coat=0.6, coat_rau=0.1)
KNOPF_R = bg.material("Knopf rot", "#E8443A", rau=0.22, coat=0.6, coat_rau=0.1)
KNOPF_G = bg.material("Knopf gelb", "#FFC93C", rau=0.22, coat=0.6, coat_rau=0.1)
HOLZ = bg.material("Stab", "#D9B07A", rau=0.5)


def polster(name, groesse, pos, mat, rund=0.45, rot=(0, 0, 0)):
    """Gepolsterte Filzform: stark abgerundeter Quader."""
    return bg.box(name, groesse, pos, mat, radius=min(groesse) * rund, segmente=6, rot=rot)


# Naht-Stich: eine gemeinsame Mesh-Vorlage, viele verknüpfte Kopien (spart Speicher)
_stich = {}


def stich(pos, richtung_rad, mat, laenge=0.05, dicke=0.011):
    key = (mat.name, laenge)
    if key not in _stich:
        _stich[key] = bg.box("StichVorlage", (laenge, dicke, dicke), (0, 0, -50), mat, radius=dicke * 0.49, segmente=2)
    o = _stich[key].copy()
    bpy.context.scene.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (0, 0, richtung_rad)
    return o


def naht_linie(p0, p1, z, mat, abstand=0.09, laenge=0.05):
    a, b = Vector(p0), Vector(p1)
    d = b - a
    n = max(1, int(d.length / abstand))
    w = math.atan2(d.y, d.x)
    for i in range(n + 1):
        q = a + d * (i / n)
        stich((q.x, q.y, z), w, mat, laenge=laenge)


def naht_rechteck(x0, y0, x1, y1, z, mat, abstand=0.09):
    naht_linie((x0, y0), (x1, y0), z, mat, abstand)
    naht_linie((x1, y0), (x1, y1), z, mat, abstand)
    naht_linie((x1, y1), (x0, y1), z, mat, abstand)
    naht_linie((x0, y1), (x0, y0), z, mat, abstand)


def knopf(name, pos, r, mat, achse="Y", faden=FADEN_W):
    """Knopf mit Rand, vier Löchern und Kreuzstich."""
    bg.zylinder(name, r, r * 0.32, pos, mat, achse=achse, rundung=r * 0.12)
    s = 1 if pos[1] > 0 else -1
    if achse != "Y":
        return
    for dx, dz in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
        bg.zylinder(name + f"L{dx}{dz}", r * 0.12, r * 0.36, (pos[0] + dx * r * 0.28, pos[1] + s * 0.002, pos[2] + dz * r * 0.28), SCHWARZ if mat is not KNOPF_S else FADEN_D, achse="Y")
    for w in (45, -45):
        f = bg.box(name + f"F{w}", (r * 0.95, r * 0.12, r * 0.12), (pos[0], pos[1] + s * r * 0.17, pos[2]), faden, radius=r * 0.05, segmente=2, rot=(0, math.radians(w), 0))


# ---------------------------------------------------------------- Untergrund (Filzdecke mit Naht)
polster("Decke", (30, 12, 0.08), (-5, 0, 0.04), GRUND, rund=0.4)
polster("Hintergrund", (0.4, 30, 14), (-16, 0, 7), HINTEN, rund=0.4)
YS, YR = -0.3, 0.36
XL = 1.05
# Bahndamm-Streifen mit Schwellen-Stichen und Garn-Schienen
polster("Bahndamm", (30, 0.46, 0.06), (-5, YS, 0.11), SCHIENE_F, rund=0.4)
for i in range(70):
    x = -14 + i * 0.22
    if x > 3.2:
        break
    bg.box(f"Schwelle{i}", (0.06, 0.34, 0.018), (x, YS, 0.145), BRAUN, radius=0.008, segmente=2)
for dy in (-0.1, 0.1):
    bg.zylinder(f"Garn{dy}", 0.018, 30, (-5, YS + dy, 0.165), FADEN_D, achse="X")
# Straße: grauer Filz mit Mittelstreifen aus weißem Filz und Randnaht
polster("Strasse", (30, 0.56, 0.05), (-5, YR, 0.105), STRASSE, rund=0.4)
for i in range(30):
    x = -14 + i * 0.6
    if x > 3.2:
        break
    bg.box(f"Mitte{i}", (0.3, 0.05, 0.012), (x, YR, 0.134), WEISS, radius=0.005, segmente=2)
naht_linie((-6, YR - 0.24), (3.2, YR - 0.24), 0.132, FADEN_W, abstand=0.08)
naht_linie((-6, YR + 0.24), (3.2, YR + 0.24), 0.132, FADEN_W, abstand=0.08)

# Ziellinie: Karo-Filzflicken
for k in range(10):
    y = -0.53 + k * 0.13
    z = 0.17 if y < -0.08 else 0.14
    for r in (0, 1):
        bg.box(f"Ziel{k}{r}", (0.12, 0.125, 0.014), (XL - 0.06 + r * 0.122, y, z), WEISS if (k + r) % 2 else SCHWARZ, radius=0.006, segmente=2)

# ---------------------------------------------------------------- Zug (Team Ticket)
XZ = XL + 0.62
RZ = 0.27


def wagen(name, xm, lok):
    L = 1.5
    polster(name + "Kasten", (L, 0.36, 0.36), (xm, YS, 0.43), BLAU, rund=0.3)
    polster(name + "Dach", (L - 0.12, 0.3, 0.08), (xm, YS, 0.63), BLAU_D, rund=0.45)
    # Fensterflicken mit weißer Naht auf beiden Seiten
    for s in (-1, 1):
        for k in range(3):
            fx = xm - L / 2 + 0.28 + k * 0.42
            bg.box(f"{name}F{s}{k}", (0.3, 0.012, 0.14), (fx, YS + s * 0.18, 0.47), GLAS, radius=0.006, segmente=2)
            for dx in (-0.15, 0.15):
                stich((fx + dx * 0.8, YS + s * 0.188, 0.47 + 0.08), 0, FADEN_W, laenge=0.04)
                stich((fx + dx * 0.8, YS + s * 0.188, 0.47 - 0.08), 0, FADEN_W, laenge=0.04)
        naht_linie((xm - L / 2 + 0.1, YS + s * 0.185), (xm + L / 2 - 0.1, YS + s * 0.185), 0.33, FADEN_G, abstand=0.07, laenge=0.035)
    for dx in (-L / 2 + 0.28, L / 2 - 0.28):
        for s in (-1, 1):
            knopf(f"{name}K{dx}{s}", (xm + dx, YS + s * 0.2, RZ), 0.085, KNOPF_R)
    if lok:
        bg.box(name + "Front", (0.012, 0.24, 0.13), (xm + L / 2 + 0.002, YS, 0.48), GLAS, radius=0.005, segmente=2)
        for s in (-0.1, 0.1):
            bg.kugel(f"{name}Licht{s}", 0.032, (xm + L / 2 - 0.004, YS + s, 0.32), GELB)


wagen("Lok", XZ - 0.75, True)
wagen("Wagen2", XZ - 0.75 - 1.6, False)

# ---------------------------------------------------------------- Auto (Team Auto)
XA = XL - 0.32 - 0.42
polster("AutoUnten", (0.88, 0.42, 0.2), (XA, YR, 0.27), ORANGE, rund=0.4)
polster("AutoKabine", (0.5, 0.36, 0.2), (XA - 0.06, YR, 0.44), ORANGE, rund=0.4)
for s in (-1, 1):
    bg.box(f"AutoFenster{s}", (0.36, 0.012, 0.1), (XA - 0.06, YR + s * 0.178, 0.45), GLAS, radius=0.005, segmente=2)
    naht_linie((XA - 0.42, YR + s * 0.205), (XA + 0.42, YR + s * 0.205), 0.24, FADEN_W, abstand=0.065, laenge=0.035)
bg.box("AutoFront", (0.012, 0.28, 0.1), (XA + 0.19, YR, 0.45), GLAS, radius=0.005, segmente=2)
for dx in (-0.27, 0.27):
    for s in (-1, 1):
        knopf(f"AutoK{dx}{s}", (XA + dx, YR + s * 0.225, 0.13), 0.11, KNOPF_S)
for s in (-0.13, 0.13):
    bg.kugel(f"AutoLicht{s}", 0.035, (XA + 0.43, YR + s, 0.29), GELB)

# ---------------------------------------------------------------- Fähnchen „13“ auf Holzstab
fx, fy = XL - 0.05, 1.02
bg.zylinder("Stab", 0.018, 1.0, (fx, fy, 0.55), HOLZ)
bg.kugel("StabKopf", 0.035, (fx, fy, 1.06), KNOPF_R)
polster("Fahne", (0.04, 0.44, 0.32), (fx, fy - 0.24, 0.86), GELB, rund=0.25)
bg.text("Dreizehn", "13", (fx + 0.022, fy - 0.24, 0.86), 0.24, BLAU_D, dicke=0.01, rot=(math.pi / 2, 0, math.pi / 2), rundung=0.003)

# ---------------------------------------------------------------- Bommel-Bäume, Watte-Wolken, Garnrolle
def bommelbaum(x, y, s, mat):
    bg.zylinder(f"BStamm{x}{y}", 0.04 * s, 0.4 * s, (x, y, 0.2 * s + 0.08), BRAUN)
    bg.kugel(f"Bommel{x}{y}", 0.26 * s, (x, y, 0.62 * s + 0.08), mat, unterteilung=5)


for (x, y, s, m) in [(-1.4, -1.0, 1.0, POMPOM1), (-2.8, -1.15, 1.3, POMPOM2), (-4.2, -0.9, 1.1, POMPOM1), (-2.0, 1.12, 1.1, POMPOM2), (-3.6, 1.25, 1.25, POMPOM1), (-5.4, 1.0, 1.4, POMPOM2), (-6.2, -1.35, 1.3, POMPOM1)]:
    bommelbaum(x, y, s, m)
for (x, y, z, s) in [(-9, -2.2, 3.0, 1.0), (-10, 2.4, 3.8, 1.2)]:
    for (ox, oy, r) in [(0, 0, 0.5), (0, 0.55, 0.42), (0, -0.5, 0.4), (0.1, 0.2, 0.45)]:
        bg.kugel(f"Watte{x}{oy}", r * s, (x + ox, y + oy * s, z + (0.15 if oy == 0.2 else 0)), WATTE, unterteilung=5)
# Garnrolle als Requisite
bg.zylinder("Rolle", 0.13, 0.3, (XL - 0.9, 0.95, 0.23), ROT, rundung=0.01)
bg.zylinder("RolleO", 0.17, 0.04, (XL - 0.9, 0.95, 0.4), HOLZ, rundung=0.01)
bg.zylinder("RolleU", 0.17, 0.04, (XL - 0.9, 0.95, 0.08), HOLZ, rundung=0.01)

# ---------------------------------------------------------------- Licht und Kamera
bg.licht("SUN", (6, -4, 8), 3.0, farbe=(1.0, 0.93, 0.84), winkel=8, ziel=(0, 0, 0))
bg.licht("AREA", (4, 4, 3), 240, farbe=(0.88, 0.92, 1.0), groesse=4, ziel=(0, 0, 0.3))
bg.licht("AREA", (-2, 0, 4), 90, farbe=(1.0, 0.85, 0.8), groesse=3, ziel=(0, 0, 0))
cam = bg.kamera((4.5, 0.2, 1.62), (0.25, 0.14, 0.2), brennweite=44, blende=1.1)
cam.data.dof.focus_distance = (cam.location - Vector((XL + 0.1, 0.0, 0.35))).length

bg.render(sc, 11, "filz")
