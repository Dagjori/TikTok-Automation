"""Stil 9 · Holzspielzeug-Tisch (Blender Cycles).

Lackiertes und naturbelassenes Holz mit sichtbarer Maserung, Holzschienen mit Rillen, Spielgeld-Münzen,
warmes Fensterlicht und geringe Schärfentiefe (Miniatur-Effekt). Alles prozedural, keine fremden Assets.

Aufruf (im Repo-Ordner):
    /home/user/.venv-blender/bin/python pipeline/stile/stil_9_holz.py [--vorschau] [--samples N] [--gpu]
Danach das HUD darüberlegen:  cd pipeline && node stile/render_neu.js 9
Einheit: 1 = 10 cm (Spielzeugmaßstab).
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import blender_gemeinsam as bg  # noqa: E402

sc = bg.neue_szene(samples=48, hintergrund=(0.95, 0.88, 0.80), staerke=0.55, look="AgX - Punchy", belichtung=0.15)


# ---------------------------------------------------------------- Holz-Materialien
def holz(name, hell="#E9CFA4", dunkel="#C99A63", ringe=7.0, lack=None, lack_rau=0.32, maserung=0.6):
    """Prozedurale Holzmaserung entlang der lokalen X-Achse. lack = Farbe → lackiertes Holz (Maserung nur als Relief)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    n, l = m.node_tree.nodes, m.node_tree.links
    p = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (0.08, 1.0, 1.0)
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = 2.5
    nz.inputs["Detail"].default_value = 4.0
    wv = n.new("ShaderNodeTexWave")
    wv.wave_type = "RINGS"
    wv.inputs["Scale"].default_value = ringe
    wv.inputs["Distortion"].default_value = 9.0
    wv.inputs["Detail"].default_value = 3.0
    wv.inputs["Detail Scale"].default_value = 1.5
    l.new(tc.outputs["Object"], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], wv.inputs["Vector"])
    # feine Fasern
    mp2 = n.new("ShaderNodeMapping")
    mp2.inputs["Scale"].default_value = (1.5, 60.0, 60.0)
    fz = n.new("ShaderNodeTexNoise")
    fz.inputs["Scale"].default_value = 3.0
    fz.inputs["Detail"].default_value = 8.0
    l.new(tc.outputs["Object"], mp2.inputs["Vector"])
    l.new(mp2.outputs["Vector"], fz.inputs["Vector"])
    mix = n.new("ShaderNodeMath")
    mix.operation = "MULTIPLY_ADD"
    mix.inputs[1].default_value = 0.35
    l.new(fz.outputs["Fac"], mix.inputs[0])
    l.new(wv.outputs["Fac"], mix.inputs[2])
    cr = n.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].position = 0.35
    cr.color_ramp.elements[1].position = 1.0
    cr.color_ramp.elements[0].color = bg.hex2lin(hell)
    cr.color_ramp.elements[1].color = bg.hex2lin(dunkel)
    l.new(mix.outputs[0], cr.inputs["Fac"])
    bu = n.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = 0.12 if lack else 0.25 * maserung
    bu.inputs["Distance"].default_value = 0.004
    l.new(mix.outputs[0], bu.inputs["Height"])
    l.new(bu.outputs["Normal"], p.inputs["Normal"])
    if lack:
        p.inputs["Base Color"].default_value = bg.hex2lin(lack)
        p.inputs["Roughness"].default_value = lack_rau
        p.inputs["Coat Weight"].default_value = 0.25
        p.inputs["Coat Roughness"].default_value = 0.25
    else:
        l.new(cr.outputs["Color"], p.inputs["Base Color"])
        p.inputs["Roughness"].default_value = 0.58
    return m


NATUR = holz("Buche", "#F0DAB5", "#DDB98A", ringe=9)
NATUR_DUNKEL = holz("Nuss", "#C69665", "#9A6A3E", ringe=8)
TISCH = holz("Tisch", lack="#CFE5DA", lack_rau=0.55)
BLAU = holz("Lack Blau", lack="#2F6FED")
BLAU_DUNKEL = holz("Lack Nachtblau", lack="#1B2A55", lack_rau=0.25)
ORANGE = holz("Lack Orange", lack="#FF7A1A")
ROT = holz("Lack Rot", lack="#E8443A")
GRUEN = holz("Lack Grün", lack="#3DB86B")
GRUEN2 = holz("Lack Hellgrün", lack="#7DCF6A")
GELB = holz("Lack Gelb", lack="#FFC93C", lack_rau=0.28)
WEISS = holz("Lack Weiß", lack="#F7F3EA")
GRAU = holz("Lack Grau", lack="#5C6373", lack_rau=0.45)
SCHWARZ = holz("Lack Schwarz", lack="#22232A", lack_rau=0.35)
METALL = bg.material("Achse", "#C9CDD3", rau=0.3, metall=1.0)
WAND = bg.material("Wand", "#F6EBDD", rau=0.9)

# ---------------------------------------------------------------- Tisch und Wand
bg.box("Tisch", (40, 24, 0.6), (0, 0, -0.3), TISCH)
bg.box("Wand", (0.2, 40, 20), (-14, 0, 8), WAND)

# ---------------------------------------------------------------- Holzschiene (Team Ticket) und Straße (Team Auto)
YS, YR = -0.3, 0.36  # Mitte Schiene, Mitte Straße
for i in range(9):
    x0 = -9.0 + i * 2.02
    s = bg.box(f"Schiene{i}", (2.0, 0.42, 0.12), (x0, YS, 0.06), NATUR, radius=0.02)
    for dy in (-0.1, 0.1):
        rille = bg.box(f"Rille{i}{dy}", (2.2, 0.055, 0.06), (x0, YS + dy, 0.12), None)
        rille.display_type = "WIRE"
        rille.hide_render = True
        bo = s.modifiers.new("Rille", "BOOLEAN")
        bo.object = rille
        bo.operation = "DIFFERENCE"
        bo.solver = "EXACT"
for i in range(7):
    x0 = -8.0 + i * 2.52
    bg.box(f"Strasse{i}", (2.5, 0.56, 0.06), (x0, YR, 0.03), GRAU, radius=0.015)
    for k in range(3):
        bg.box(f"Strich{i}{k}", (0.32, 0.035, 0.004), (x0 - 0.8 + k * 0.8, YR, 0.0615), WEISS, radius=0.0)

# Ziellinie „13“: schwarz-weiß bemalte Leiste quer über beide Bahnen (zwei Reihen)
XL = 1.05
for k in range(10):
    y = -0.53 + k * 0.13
    z = 0.128 if y < -0.08 else 0.068
    for r in (0, 1):
        bg.box(f"Ziel{k}{r}", (0.12, 0.13, 0.014), (XL - 0.06 + r * 0.12, y, z), WEISS if (k + r) % 2 else SCHWARZ)

# ---------------------------------------------------------------- Zug
RAD_Z = 0.12 + 0.07


def rad(name, x, y, r=0.085, farbe=None, eltern=None):
    w = bg.zylinder(name, r, 0.05, (x, y, RAD_Z), farbe or NATUR_DUNKEL, achse="Y", rundung=0.012, eltern=eltern)
    bg.zylinder(name + "N", 0.025, 0.06, (x, y + (0.008 if y > 0 else -0.008), RAD_Z), ROT, achse="Y", rundung=0.006, eltern=eltern)
    return w


def wagen(name, x, lok):
    L = 1.5
    bg.box(name + "Boden", (L - 0.06, 0.3, 0.08), (x, YS, 0.2), NATUR_DUNKEL, radius=0.02)
    bg.box(name + "Kasten", (L, 0.34, 0.3), (x, YS, 0.385), BLAU, radius=0.06)
    bg.box(name + "Fenster", (L - 0.22, 0.352, 0.1), (x, YS, 0.43), BLAU_DUNKEL, radius=0.03)
    bg.box(name + "Dach", (L - 0.1, 0.3, 0.07), (x, YS, 0.55), NATUR, radius=0.03)
    for dx in (-L / 2 + 0.24, L / 2 - 0.24):
        for dy in (-0.15, 0.15):
            rad(f"{name}Rad{dx}{dy}", x + dx, YS + dy)
    if lok:
        bg.box(name + "Front", (0.02, 0.24, 0.1), (x + L / 2 + 0.002, YS, 0.43), BLAU_DUNKEL, radius=0.01)
        for dy in (-0.1, 0.1):
            bg.zylinder(f"{name}Licht{dy}", 0.03, 0.03, (x + L / 2 + 0.01, YS + dy, 0.29), GELB, achse="X", rundung=0.008)
    return L


XZ = XL + 0.62  # Zugspitze: schon über der Linie
wagen("Lok", XZ - 0.75, True)
wagen("Wagen2", XZ - 0.75 - 1.58, False)
bg.zylinder("Magnet", 0.035, 0.1, (XZ - 1.54, YS, 0.24), SCHWARZ, achse="X")

# ---------------------------------------------------------------- Auto
XA = XL - 0.32 - 0.42  # Mitte Auto (Front knapp vor der Linie)
bg.box("AutoUnten", (0.86, 0.4, 0.16), (XA, YR, 0.19), ORANGE, radius=0.06)
bg.box("AutoKabine", (0.46, 0.34, 0.17), (XA - 0.06, YR, 0.34), NATUR, radius=0.06)
for dy in (-0.172, 0.172):
    bg.box(f"Scheibe{dy}", (0.34, 0.006, 0.09), (XA - 0.06, YR + dy, 0.35), BLAU_DUNKEL, radius=0.002)
bg.box("Frontscheibe", (0.006, 0.26, 0.09), (XA + 0.172, YR, 0.35), BLAU_DUNKEL, radius=0.002)
for dx in (-0.27, 0.27):
    for dy in (-0.2, 0.2):
        w = bg.zylinder(f"AutoRad{dx}{dy}", 0.1, 0.07, (XA + dx, YR + dy, 0.1), SCHWARZ, achse="Y", rundung=0.02)
        bg.zylinder(f"AutoNabe{dx}{dy}", 0.035, 0.08, (XA + dx, YR + dy * 1.02, 0.1), NATUR, achse="Y", rundung=0.008)
for dy in (-0.12, 0.12):
    bg.zylinder(f"Scheinwerfer{dy}", 0.03, 0.02, (XA + 0.43, YR + dy, 0.22), GELB, achse="X", rundung=0.006)

# ---------------------------------------------------------------- Schild „13“ und Spielgeld
schild = bg.gruppe("Schild", (XL - 0.2, 0.76, 0))
bg.zylinder("Pfosten", 0.03, 0.72, (0, 0, 0.36), NATUR, eltern=schild)
bg.zylinder("Fuss", 0.12, 0.05, (0, 0, 0.025), NATUR_DUNKEL, rundung=0.015, eltern=schild)
bg.box("Tafel", (0.05, 0.5, 0.4), (0, 0, 0.9), GELB, radius=0.04, eltern=schild)
bg.text("Dreizehn", "13", (0.03, 0, 0.9), 0.3, BLAU_DUNKEL, dicke=0.012, rot=(math.pi / 2, 0, math.pi / 2), eltern=schild)
schild.rotation_euler = (0, 0, math.radians(-12))


def muenzen(x, y, n):
    for k in range(n):
        bg.zylinder(f"Muenze{x}{k}", 0.11, 0.035, (x + (k % 2) * 0.006, y + ((k * 7) % 3 - 1) * 0.005, 0.0175 + k * 0.036), GELB, rundung=0.01)


muenzen(XL - 0.95, 0.8, 9)   # Auto: hoher Stapel
muenzen(XL + 0.25, -0.66, 3)  # Ticket: kleiner Stapel

# ---------------------------------------------------------------- Bäume, Bauklötze (Kulisse)
def baum(x, y, s=1.0, farbe=GRUEN):
    bg.zylinder(f"Stamm{x}{y}", 0.05 * s, 0.35 * s, (x, y, 0.175 * s), NATUR_DUNKEL, rundung=0.01)
    bg.kegel(f"Krone{x}{y}", 0.26 * s, 0.0, 0.62 * s, (x, y, 0.62 * s), farbe)


def ball_baum(x, y, s=1.0, farbe=GRUEN2):
    bg.zylinder(f"Stamm{x}{y}", 0.05 * s, 0.4 * s, (x, y, 0.2 * s), NATUR_DUNKEL, rundung=0.01)
    bg.kugel(f"Kugel{x}{y}", 0.25 * s, (x, y, 0.58 * s), farbe)


for (x, y, s, f) in [(-1.4, -1.0, 1.0, GRUEN), (-2.8, -1.2, 1.3, GRUEN2), (-4.2, -0.95, 1.1, GRUEN), (-2.0, 1.15, 1.1, GRUEN2), (-3.6, 1.3, 1.25, GRUEN), (-5.4, 1.0, 1.4, GRUEN2), (-6.2, -1.4, 1.3, GRUEN)]:
    (baum if f is GRUEN else ball_baum)(x, y, s, f)
# Haus aus Bauklötzen
bg.box("HausA", (0.6, 0.6, 0.6), (-4.2, -2.1, 0.3), WEISS, radius=0.03)
dach = bg.box("DachA", (0.62, 0.45, 0.45), (-4.2, -2.1, 0.78), ROT, radius=0.03, rot=(math.radians(45), 0, 0))
bg.box("HausB", (0.5, 0.5, 0.8), (-6.4, 2.2, 0.4), GELB, radius=0.03)
bg.box("HausC", (0.8, 0.5, 0.5), (-7.6, -2.2, 0.25), BLAU, radius=0.03)

# ---------------------------------------------------------------- Licht und Kamera
bg.licht("SUN", (6, -4, 8), 3.4, farbe=(1.0, 0.92, 0.8), winkel=6, ziel=(0, 0, 0))
bg.licht("AREA", (4, 4, 3), 220, farbe=(0.85, 0.9, 1.0), groesse=4, ziel=(0, 0, 0.3))
bg.kamera((4.5, 0.2, 1.62), (0.25, 0.14, 0.18), brennweite=44, blende=1.1, fokus=None)
cam = bpy.context.scene.camera
cam.data.dof.focus_distance = (cam.location - __import__("mathutils").Vector((XL + 0.1, 0.0, 0.3))).length

# STIL_NUR_SZENE=1: nur aufbauen (z. B. für das Backen nach glTF in stil_15_holz_gltf.py)
if not os.environ.get("STIL_NUR_SZENE"):
    bg.render(sc, 9, "holz")
