"""Gemeinsame Bausteine für die Blender-Stilbilder (Stil 9 ff.).

Aufruf eines Stil-Skripts (bpy als Python-Modul, kein Blender-Programm nötig):
    /home/user/.venv-blender/bin/python pipeline/stile/stil_9_holz.py              # 1080×1920, finale Qualität
    /home/user/.venv-blender/bin/python pipeline/stile/stil_9_holz.py --vorschau   # 540×960, wenige Samples
    ... --samples 64 --gpu                                                          # Windows-PC mit Grafikkarte
Unter Windows: `py -m pip install bpy` (passende Python-Version laut Blender-Doku), dann `python pipeline\\stile\\stil_9_holz.py --gpu`.

Ausgabe: pipeline/out/stile/blender/stil_<nr>_<name>.png (nur die Szene, ohne HUD) plus .json mit Renderzeit.
Das HUD (Anzeigetafel, Chips, Untertitel) legt danach `node stile/render_neu.js <nr>` darüber.

Alle Geometrie, Materialien und Texturen entstehen hier im Code (prozedural). Keine fremden Assets.
"""
import json
import math
import os
import sys
import time

import bpy
from mathutils import Matrix, Vector

HIER = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HIER, "..", ".."))
AUSGABE = os.path.join(REPO, "pipeline", "out", "stile", "blender")


# ---------------------------------------------------------------- Aufrufparameter
def argumente():
    a = sys.argv
    vorschau = "--vorschau" in a
    samples = None
    if "--samples" in a:
        samples = int(a[a.index("--samples") + 1])
    return {"vorschau": vorschau, "samples": samples, "gpu": "--gpu" in a}


# ---------------------------------------------------------------- Szene und Render
def neue_szene(samples=48, hintergrund=(0.9, 0.9, 0.9), staerke=1.0, look="AgX - Medium High Contrast", belichtung=0.0, bounces=6, ansicht="AgX"):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    arg = argumente()
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    if arg["gpu"]:
        try:
            prefs = bpy.context.preferences.addons["cycles"].preferences
            for typ in ("OPTIX", "CUDA", "HIP", "ONEAPI", "METAL"):
                try:
                    prefs.compute_device_type = typ
                    prefs.get_devices()
                    if any(d.type == typ for d in prefs.devices):
                        for d in prefs.devices:
                            d.use = True
                        sc.cycles.device = "GPU"
                        break
                except TypeError:
                    continue
        except Exception as e:  # noqa: BLE001
            print("GPU nicht verfügbar, rendere mit CPU:", e)
    sc.cycles.samples = arg["samples"] or (max(8, samples // 3) if arg["vorschau"] else samples)
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = 0.02
    sc.cycles.use_denoising = True
    sc.cycles.denoiser = "OPENIMAGEDENOISE"
    sc.cycles.max_bounces = bounces
    sc.cycles.diffuse_bounces = min(bounces, 3)
    sc.cycles.glossy_bounces = min(bounces, 3)
    sc.cycles.transmission_bounces = bounces
    sc.cycles.transparent_max_bounces = 8
    sc.cycles.caustics_reflective = False
    sc.cycles.caustics_refractive = False
    sc.cycles.blur_glossy = 1.0
    sc.render.resolution_x, sc.render.resolution_y = (540, 960) if arg["vorschau"] else (1080, 1920)
    sc.render.resolution_percentage = 100
    # Geteilter Rechner (Cloud): Threads begrenzen, z. B. BLENDER_THREADS=2; sonst alle Kerne
    if os.environ.get("BLENDER_THREADS"):
        sc.render.threads_mode = "FIXED"
        sc.render.threads = int(os.environ["BLENDER_THREADS"])
    sc.render.film_transparent = False
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.view_settings.view_transform = ansicht
    for l in ((look, "AgX - Base Contrast", "None") if ansicht == "AgX" else (look, "None")):
        try:
            sc.view_settings.look = l
            break
        except TypeError:
            continue
    sc.view_settings.exposure = belichtung
    welt = bpy.data.worlds.new("Welt")
    sc.world = welt
    welt.use_nodes = True
    bg = welt.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*hintergrund, 1)
    bg.inputs[1].default_value = staerke
    return sc


def render(sc, nr, name):
    os.makedirs(AUSGABE, exist_ok=True)
    pfad = os.path.join(AUSGABE, f"stil_{nr}_{name}.png")
    sc.render.filepath = pfad
    t = time.time()
    bpy.ops.render.render(write_still=True)
    dauer = time.time() - t
    info = {"sekunden": round(dauer, 1), "samples": sc.cycles.samples, "aufloesung": f"{sc.render.resolution_x}x{sc.render.resolution_y}", "geraet": sc.cycles.device, "kerne": os.cpu_count()}
    with open(os.path.join(AUSGABE, f"stil_{nr}_{name}.json"), "w") as f:
        json.dump(info, f)
    print(f"RENDER {nr} {name}: {dauer:.1f} s · {info['samples']} Samples · {info['aufloesung']} → {pfad}")
    return pfad


def kamera(pos, ziel, brennweite=50, blende=None, fokus=None, sensor=36):
    cam = bpy.data.cameras.new("Kamera")
    cam.lens = brennweite
    cam.sensor_width = sensor
    cam.sensor_fit = "AUTO"
    obj = bpy.data.objects.new("Kamera", cam)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = pos
    richtung = Vector(ziel) - Vector(pos)
    obj.rotation_euler = richtung.to_track_quat("-Z", "Y").to_euler()
    if blende:
        cam.dof.use_dof = True
        cam.dof.aperture_fstop = blende
        cam.dof.focus_distance = fokus if fokus else richtung.length
    bpy.context.scene.camera = obj
    return obj


def licht(typ, pos, energie, farbe=(1, 1, 1), groesse=1.0, ziel=(0, 0, 0), winkel=None):
    l = bpy.data.lights.new(typ, typ)
    l.energy = energie
    l.color = farbe
    if typ == "AREA":
        l.size = groesse
    if typ == "SUN" and winkel is not None:
        l.angle = math.radians(winkel)
    if typ in ("POINT", "SPOT"):
        l.shadow_soft_size = groesse
    o = bpy.data.objects.new(typ, l)
    bpy.context.scene.collection.objects.link(o)
    o.location = pos
    o.rotation_euler = (Vector(ziel) - Vector(pos)).to_track_quat("-Z", "Y").to_euler()
    return o


# ---------------------------------------------------------------- Geometrie
def _link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def box(name, groesse, pos, mat=None, radius=0.0, segmente=4, rot=(0, 0, 0), eltern=None):
    """Quader mit echten Maßen (keine Objektskalierung), optional abgerundet (Bevel-Modifier), glatt schattiert."""
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(groesse), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    obj = _link(bpy.data.objects.new(name, me))
    obj.location = pos
    obj.rotation_euler = rot
    if radius > 0:
        bev = obj.modifiers.new("Rundung", "BEVEL")
        bev.width = min(radius, min(groesse) / 2 * 0.98)
        bev.segments = segmente
        bev.limit_method = "NONE"
        for p in me.polygons:
            p.use_smooth = True
    if mat:
        me.materials.append(mat)
    if eltern:
        obj.parent = eltern
    return obj


def zylinder(name, radius, tiefe, pos, mat=None, achse="Z", n=48, rundung=0.0, eltern=None, rot=None):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=radius, radius2=radius, depth=tiefe)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = _link(bpy.data.objects.new(name, me))
    obj.location = pos
    if rot is not None:
        obj.rotation_euler = rot
    elif achse == "X":
        obj.rotation_euler = (0, math.pi / 2, 0)
    elif achse == "Y":
        obj.rotation_euler = (math.pi / 2, 0, 0)
    if rundung > 0:
        bev = obj.modifiers.new("Rundung", "BEVEL")
        bev.width = rundung
        bev.segments = 3
        bev.limit_method = "ANGLE"
        bev.angle_limit = math.radians(50)
    if mat:
        me.materials.append(mat)
    if eltern:
        obj.parent = eltern
    return obj


def kugel(name, radius, pos, mat=None, skala=(1, 1, 1), eltern=None, unterteilung=4):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=unterteilung, radius=radius)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = _link(bpy.data.objects.new(name, me))
    obj.location = pos
    obj.scale = skala
    if mat:
        me.materials.append(mat)
    if eltern:
        obj.parent = eltern
    return obj


def kegel(name, r1, r2, tiefe, pos, mat=None, n=40, eltern=None):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=r1, radius2=r2, depth=tiefe)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    obj = _link(bpy.data.objects.new(name, me))
    obj.location = pos
    if mat:
        me.materials.append(mat)
    if eltern:
        obj.parent = eltern
    return obj


def flaeche(name, punkte, dicke, pos=(0, 0, 0), mat=None, rot=(math.pi / 2, 0, 0), rundung=0.0, eltern=None):
    """2D-Umriss (Liste von (x, y)) als dünne Platte, z. B. Papierschnitt. Standard: aufrecht stehend (in der XZ-Ebene)."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = dicke / 2
    cu.bevel_depth = rundung
    sp = cu.splines.new("POLY")
    sp.points.add(len(punkte) - 1)
    for p, (x, y) in zip(sp.points, punkte):
        p.co = (x, y, 0, 1)
    sp.use_cyclic_u = True
    obj = _link(bpy.data.objects.new(name, cu))
    obj.location = pos
    obj.rotation_euler = rot
    if mat:
        cu.materials.append(mat)
    if eltern:
        obj.parent = eltern
    return obj


def schrift():
    """Inter Display Black, sonst Inter Black, sonst Blenders eingebaute Schrift."""
    kandidaten = [
        "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf",
        "/usr/share/fonts/opentype/inter/Inter-Black.otf",
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts\InterDisplay-Black.ttf"),
        r"C:\Windows\Fonts\InterDisplay-Black.ttf",
        r"C:\Windows\Fonts\ariblk.ttf",
    ]
    for k in kandidaten:
        if os.path.exists(k):
            return bpy.data.fonts.load(k)
    return None


def text(name, inhalt, pos, groesse, mat=None, dicke=0.0, rot=(math.pi / 2, 0, 0), ausrichtung="CENTER", fett=None, eltern=None, rundung=0.0):
    cu = bpy.data.curves.new(name, "FONT")
    cu.body = inhalt
    f = fett or schrift()
    if f:
        cu.font = f
    cu.size = groesse
    cu.extrude = dicke / 2
    cu.bevel_depth = rundung
    cu.align_x = ausrichtung
    cu.align_y = "CENTER"
    obj = _link(bpy.data.objects.new(name, cu))
    obj.location = pos
    obj.rotation_euler = rot
    if mat:
        cu.materials.append(mat)
    if eltern:
        obj.parent = eltern
    return obj


def gruppe(name, pos=(0, 0, 0), rot=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    _link(e)
    e.location = pos
    e.rotation_euler = rot
    return e


# ---------------------------------------------------------------- Materialien
def hex2lin(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb) + (1.0,)


def material(name, farbe, rau=0.5, metall=0.0, coat=0.0, coat_rau=0.2, sss=0.0, sss_radius=(1, 0.4, 0.2), sss_skala=0.05, sheen=0.0, sheen_rau=0.5,
             transmission=0.0, ior=1.45, emission=None, emission_staerke=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = hex2lin(farbe) if isinstance(farbe, str) else farbe
    p.inputs["Roughness"].default_value = rau
    p.inputs["Metallic"].default_value = metall
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = coat_rau
    p.inputs["Subsurface Weight"].default_value = sss
    p.inputs["Subsurface Radius"].default_value = sss_radius
    p.inputs["Subsurface Scale"].default_value = sss_skala
    p.inputs["Sheen Weight"].default_value = sheen
    p.inputs["Sheen Roughness"].default_value = sheen_rau
    p.inputs["Transmission Weight"].default_value = transmission
    p.inputs["IOR"].default_value = ior
    p.inputs["Alpha"].default_value = alpha
    if emission:
        p.inputs["Emission Color"].default_value = hex2lin(emission)
        p.inputs["Emission Strength"].default_value = emission_staerke
    return m


def knoten(m):
    return m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes["Principled BSDF"]


def rausch_bump(m, skala=40.0, staerke=0.15, detail=6.0, abstand=0.02, koordinaten="Object", verzerrung=0.0, streckung=(1, 1, 1)):
    """Feine Oberflächenstruktur (Noise → Bump) auf ein Principled-Material."""
    n, l, p = knoten(m)
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = streckung
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = skala
    nz.inputs["Detail"].default_value = detail
    nz.inputs["Distortion"].default_value = verzerrung
    bu = n.new("ShaderNodeBump")
    bu.inputs["Strength"].default_value = staerke
    bu.inputs["Distance"].default_value = abstand
    l.new(tc.outputs[koordinaten], mp.inputs["Vector"])
    l.new(mp.outputs["Vector"], nz.inputs["Vector"])
    l.new(nz.outputs["Fac"], bu.inputs["Height"])
    l.new(bu.outputs["Normal"], p.inputs["Normal"])
    return bu


def farb_variation(m, farbe_a, farbe_b, skala=6.0, koordinaten="Object"):
    """Leichte Farbschwankung (Noise → ColorRamp) für handgemachte Materialien."""
    n, l, p = knoten(m)
    tc = n.new("ShaderNodeTexCoord")
    nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = skala
    nz.inputs["Detail"].default_value = 3.0
    cr = n.new("ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = hex2lin(farbe_a)
    cr.color_ramp.elements[1].color = hex2lin(farbe_b)
    cr.color_ramp.elements[0].position = 0.3
    cr.color_ramp.elements[1].position = 0.7
    l.new(tc.outputs[koordinaten], nz.inputs["Vector"])
    l.new(nz.outputs["Fac"], cr.inputs["Fac"])
    l.new(cr.outputs["Color"], p.inputs["Base Color"])
    return cr
