"""Stil 15 · Holzspielzeug gebacken: Blender → glTF → Three.js (Machbarkeitsbeweis für die Kombination).

Baut die Szene aus stil_9_holz.py, backt das Cycles-Licht (direkt + indirekt + Farbe) in Texturen und exportiert
alles als eine .glb-Datei. Three.js zeigt sie danach mit unbeleuchteten Materialien an (stil_15_holz_gltf.html):
Licht und Schatten kommen aus Blender, die Bewegung aus Three.js. So kostet jedes Videobild nur noch Browser-Zeit.

Regeln für bewegte Teile (wichtig fürs Video):
- Tisch und Kulisse werden OHNE Zug und Auto gebacken (sonst bliebe deren Schatten am Startpunkt kleben).
- Zug und Auto werden einzeln gebacken und bekommen in Three.js einen weichen Kontaktschatten, der mitfährt.
- Glanz (Spiegelungen) ist blickabhängig und wird nicht gebacken; nur die diffuse Beleuchtung.

Aufruf (im Repo-Ordner, dauert in der Cloud einige Minuten, auf dem Windows-PC mit --gpu deutlich kürzer):
    /home/user/.venv-blender/bin/python pipeline/stile/stil_15_holz_gltf.py [--samples N] [--gpu]
Danach:  cd pipeline && node stile/render_neu.js 15
Ausgabe: pipeline/out/stile/blender/gltf/holz.glb (+ Bake-Texturen als PNG zur Kontrolle)
"""
import json
import math
import os
import runpy
import sys
import time

import numpy as np

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)
os.environ["STIL_NUR_SZENE"] = "1"
runpy.run_path(os.path.join(HIER, "stil_9_holz.py"), run_name="holz")

import bpy  # noqa: E402
import blender_gemeinsam as bg  # noqa: E402

t_start = time.time()
sc = bpy.context.scene
ZIEL = os.path.join(bg.AUSGABE, "gltf")
os.makedirs(ZIEL, exist_ok=True)
arg = bg.argumente()
SAMPLES = arg["samples"] or 40


def nur_auswahl(objs, aktiv=None):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = aktiv or objs[0]


# ---------------------------------------------------------------- 1. Alles in echte Meshes umwandeln
for o in list(sc.objects):
    if o.parent:
        m = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = m
geo = [o for o in sc.objects if o.type in ("MESH", "CURVE", "FONT") and not o.hide_render]
nur_auswahl(geo)
bpy.ops.object.convert(target="MESH")
for o in list(sc.objects):
    if (o.type == "MESH" and o.hide_render) or o.type == "EMPTY":
        bpy.data.objects.remove(o, do_unlink=True)


# ---------------------------------------------------------------- 2. In Gruppen zusammenfassen
def gruppe_von(n):
    if n.startswith(("Lok", "Wagen2", "Magnet")):
        return "Zug"
    if n.startswith(("Auto", "Scheibe", "Frontscheibe", "Scheinwerfer")):
        return "Auto"
    if n == "Tisch":
        return "Tisch"
    if n == "Wand":
        return "Wand"
    return "Kulisse"


gruppen = {}
for o in [o for o in sc.objects if o.type == "MESH"]:
    gruppen.setdefault(gruppe_von(o.name), []).append(o)
# Tisch durch eine passende Platte im sichtbaren Bereich ersetzen (spart Texturfläche)
tisch_mat = gruppen["Tisch"][0].active_material
for o in gruppen.pop("Tisch"):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.mesh.primitive_plane_add(size=1, location=(-2.5, 0.2, 0))
tisch = bpy.context.active_object
tisch.name = "Tisch"
tisch.scale = (15, 7.2, 1)
bpy.ops.object.transform_apply(scale=True)
tisch.data.materials.append(tisch_mat)
tisch.data.uv_layers[0].name = "Bake"
teile = {"Tisch": tisch}
for name, objs in gruppen.items():
    nur_auswahl(objs)
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    teile[name] = o

# ---------------------------------------------------------------- 3. Lightmap-UVs
for name, o in teile.items():
    if name == "Tisch":
        continue
    me = o.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    me.uv_layers.new(name="Bake")
    nur_auswahl([o])
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.003, area_weight=0.0)
    bpy.ops.object.mode_set(mode="OBJECT")

# ---------------------------------------------------------------- 4. Backen (Cycles, diffus: direkt + indirekt + Farbe)
sc.cycles.samples = SAMPLES
sc.render.bake.use_pass_direct = True
sc.render.bake.use_pass_indirect = True
sc.render.bake.use_pass_color = True
sc.render.bake.margin = 8
GROESSE = {"Tisch": (2048, 1024), "Kulisse": (2048, 2048), "Zug": (1024, 1024), "Auto": (1024, 1024), "Wand": (512, 512)}
zeiten = {}


def backe(name):
    o = teile[name]
    w, h = GROESSE[name]
    img = bpy.data.images.new("Bake_" + name, w, h, float_buffer=True)
    neu = []
    for slot in o.material_slots:
        nodes = slot.material.node_tree.nodes
        n = nodes.new("ShaderNodeTexImage")
        n.image = img
        nodes.active = n
        neu.append((nodes, n))
    bewegt = [teile["Zug"], teile["Auto"]] if name in ("Tisch", "Kulisse", "Wand") else []
    for b in bewegt:
        b.hide_render = True
    nur_auswahl([o])
    t = time.time()
    bpy.ops.object.bake(type="DIFFUSE")
    zeiten[name] = round(time.time() - t, 1)
    print(f"BAKE {name}: {zeiten[name]} s ({w}×{h}, {SAMPLES} Samples)")
    for b in bewegt:
        b.hide_render = False
    for nodes, n in neu:
        nodes.remove(n)
    # Halbe Helligkeit speichern (Reserve für Lichter über 1.0), Three.js verdoppelt wieder und mappt mit AgX
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    px[:, :3] *= 0.5
    img.pixels.foreach_set(px.ravel())
    pfad = os.path.join(ZIEL, f"bake_{name.lower()}.png")
    vs = sc.view_settings
    alt = (vs.view_transform, vs.look, vs.exposure)
    vs.view_transform, vs.exposure = "Standard", 0.0
    img.save_render(pfad, scene=sc)
    vs.view_transform = alt[0]
    try:
        vs.look = alt[1]
    except TypeError:
        pass
    vs.exposure = alt[2]
    # Export-Material: nur die gebackene Textur
    fertig = bpy.data.images.load(pfad)
    fertig.colorspace_settings.name = "sRGB"
    m = bpy.data.materials.new("Bake_" + name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    tex = m.node_tree.nodes.new("ShaderNodeTexImage")
    tex.image = fertig
    m.node_tree.links.new(tex.outputs["Color"], p.inputs["Base Color"])
    o.data.materials.clear()
    o.data.materials.append(m)


for name in ("Tisch", "Wand", "Kulisse", "Zug", "Auto"):
    backe(name)

# ---------------------------------------------------------------- 5. Export als GLB (mit Kamera)
cam = sc.camera
nur_auswahl(list(teile.values()) + [cam], teile["Kulisse"])
glb = os.path.join(ZIEL, "holz.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_cameras=True, export_lights=False, export_apply=True,
                          export_texcoords=True, export_normals=False, export_materials="EXPORT", export_image_format="JPEG", export_jpeg_quality=92)
info = {"bake_sekunden": zeiten, "gesamt_sekunden": round(time.time() - t_start, 1), "samples": SAMPLES, "glb_mb": round(os.path.getsize(glb) / 1e6, 2),
        "fokus_m": round(cam.data.dof.focus_distance, 3), "blende": cam.data.dof.aperture_fstop, "dreiecke": sum(len(o.data.polygons) for o in teile.values())}
with open(os.path.join(ZIEL, "holz.json"), "w") as f:
    json.dump(info, f)
with open(os.path.join(bg.AUSGABE, "stil_15_holz_gltf.json"), "w") as f:
    json.dump({"sekunden": info["gesamt_sekunden"], "samples": SAMPLES, "art": "einmaliges Backen + Export (nicht pro Bild)", **info}, f)
print("GLTF", json.dumps(info))
