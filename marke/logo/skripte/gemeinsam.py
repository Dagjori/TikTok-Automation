"""Gemeinsame Bausteine für die 3D-Logo-Konzepte von Simulierbar (bpy 5.2).

Alles hier ist selbst erzeugte Geometrie und prozedurales Material,
keine fremden Assets. Aufruf der Konzept-Skripte:

    /home/user/.venv-blender/bin/python konzept_a_s_kurve.py [-- --vorschau]

Ausrichtung: Das Logo liegt in der lokalen XY-Ebene eines Empties "Logo",
das um +90° um X gedreht ist. Damit zeigt das Logo in Blender nach -Y
(Frontansicht) und im glTF/Three.js nach +Z, also direkt zur Standardkamera.
"""

import math
import os
import sys

import bpy
from mathutils import Vector

HIER = os.path.dirname(os.path.abspath(__file__))
LOGO_ORDNER = os.path.dirname(HIER)
SCRATCH = os.environ.get("LOGO_SCRATCH", "/tmp")

# Markenfarben (sRGB). "weiss" ist ein warmes Porzellanweiß für das Logo.
FARBEN = {
    "tinte": "#14171F",
    "blau": "#2F6FED",
    "orange": "#FF7A1A",
    "gruen": "#19B36B",
    "gelb": "#FFD23F",
    "weiss": "#F4F2ED",
}


def argumente():
    """Argumente nach '--' auswerten."""
    a = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    return {
        "vorschau": "--vorschau" in a,
        "nur_render": "--nur-render" in a,
        "animation": "--animation" in a,
    }


def hex_linear(h, alpha=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (lin[0], lin[1], lin[2], alpha)


# ---------------------------------------------------------------- Szene

def leere_szene(aufloesung=2048, samples=96):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    s.cycles.device = "CPU"
    s.cycles.samples = samples
    s.cycles.use_adaptive_sampling = True
    s.cycles.adaptive_threshold = 0.01
    s.cycles.use_denoising = True
    s.cycles.denoiser = "OPENIMAGEDENOISE"
    s.cycles.max_bounces = 8
    s.cycles.glossy_bounces = 4
    s.cycles.transmission_bounces = 8
    s.cycles.diffuse_bounces = 3
    s.cycles.caustics_reflective = False
    s.cycles.caustics_refractive = False
    s.cycles.blur_glossy = 0.5
    s.render.film_transparent = True
    s.cycles.film_transparent_glass = False
    s.render.resolution_x = aufloesung
    s.render.resolution_y = aufloesung
    s.render.resolution_percentage = 100
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_mode = "RGBA"
    s.render.image_settings.color_depth = "8"
    s.render.image_settings.compression = 90
    # Khronos PBR Neutral: Grundfarben bleiben markentreu, Glanzlichter brennen nicht aus
    s.view_settings.view_transform = "Khronos PBR Neutral"
    s.view_settings.look = "None"
    s.view_settings.exposure = 0.0
    s.view_settings.gamma = 1.0
    s.render.threads_mode = "FIXED"
    s.render.threads = 3  # CPU wird mit anderen Agenten geteilt
    return s


def welt(staerke=0.35, unten="#0B0D12", oben="#3A4256"):
    """Sanfter Verlauf als Umgebung, damit Glanzflächen etwas spiegeln."""
    w = bpy.data.worlds.new("Studio")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = -0.3
    mr.inputs["From Max"].default_value = 0.9
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = hex_linear(unten)
    ramp.color_ramp.elements[1].color = hex_linear(oben)
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = staerke
    out = nt.nodes.new("ShaderNodeOutputWorld")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bg.inputs["Color"])
    nt.links.new(bg.outputs[0], out.inputs[0])
    return w


def flaechenlicht(name, ort, ziel=(0, 0, 0), energie=500.0, groesse=(3.0, 3.0), farbe=(1, 1, 1), form="RECTANGLE"):
    l = bpy.data.lights.new(name, "AREA")
    l.shape = form
    l.size = groesse[0]
    l.size_y = groesse[1]
    l.energy = energie
    l.color = farbe
    o = bpy.data.objects.new(name, l)
    bpy.context.scene.collection.objects.link(o)
    o.location = ort
    richte_aus(o, ziel)
    return o


def richte_aus(obj, ziel):
    d = Vector(ziel) - Vector(obj.location)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = d.to_track_quat("-Z", "Y")


def studio_licht(skala=1.0, staerke=1.0):
    """Studio-Setup: große Softbox links oben, Aufheller rechts,
    zwei Kantenlichter von hinten und ein Streifenlicht von oben."""
    k = skala
    e = staerke
    lichter = [
        flaechenlicht("Key", (-6 * k, -9 * k, 7 * k), energie=2600 * e * k * k, groesse=(6 * k, 6 * k)),
        flaechenlicht("Fill", (8 * k, -8 * k, -1 * k), energie=700 * e * k * k, groesse=(7 * k, 7 * k),
                      farbe=(0.92, 0.95, 1.0)),
        flaechenlicht("KanteL", (-7 * k, 6 * k, 3 * k), energie=1500 * e * k * k, groesse=(2 * k, 8 * k),
                      farbe=(0.85, 0.9, 1.0)),
        flaechenlicht("KanteR", (7 * k, 6 * k, 4 * k), energie=1500 * e * k * k, groesse=(2 * k, 8 * k),
                      farbe=(1.0, 0.93, 0.85)),
        flaechenlicht("Oben", (0, -2 * k, 10 * k), energie=900 * e * k * k, groesse=(10 * k, 1.5 * k)),
    ]
    return lichter


def kamera(abstand=30.0, azimut=0.0, hoehe=0.0, brennweite=100.0, ziel=(0, 0, 0), verschiebung=(0.0, 0.0)):
    """Kamera auf einer Kugel um das Ziel. azimut: Grad nach rechts, hoehe: Grad nach oben."""
    cam = bpy.data.cameras.new("Kamera")
    cam.lens = brennweite
    cam.sensor_width = 36
    cam.shift_x, cam.shift_y = verschiebung
    o = bpy.data.objects.new("Kamera", cam)
    bpy.context.scene.collection.objects.link(o)
    a = math.radians(azimut)
    h = math.radians(hoehe)
    o.location = (
        ziel[0] + abstand * math.sin(a) * math.cos(h),
        ziel[1] - abstand * math.cos(a) * math.cos(h),
        ziel[2] + abstand * math.sin(h),
    )
    richte_aus(o, ziel)
    bpy.context.scene.camera = o
    return o


def abstand_fuer(groesse, brennweite=100.0, fuellung=0.86):
    """Kameraabstand, bei dem ein Objekt der Größe `groesse` die Bildbreite zu `fuellung` füllt."""
    halbwinkel = math.atan(18.0 / brennweite)
    return (groesse / 2) / math.tan(halbwinkel) / fuellung


# ---------------------------------------------------------------- Materialien

def material(name, farbe, rauheit=0.3, lack=0.0, lack_rauheit=0.05, metall=0.0, spiegel=0.5,
             transmission=0.0, ior=1.5, emission=None, emission_staerke=0.0, sss=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = hex_linear(farbe) if isinstance(farbe, str) else farbe
    p.inputs["Roughness"].default_value = rauheit
    p.inputs["Metallic"].default_value = metall
    p.inputs["Specular IOR Level"].default_value = spiegel
    p.inputs["IOR"].default_value = ior
    p.inputs["Coat Weight"].default_value = lack
    p.inputs["Coat Roughness"].default_value = lack_rauheit
    p.inputs["Transmission Weight"].default_value = transmission
    if sss:
        p.inputs["Subsurface Weight"].default_value = sss
        p.inputs["Subsurface Radius"].default_value = (0.2, 0.1, 0.05)
        p.inputs["Subsurface Scale"].default_value = 0.05
    if emission:
        p.inputs["Emission Color"].default_value = hex_linear(emission)
        p.inputs["Emission Strength"].default_value = emission_staerke
    m.diffuse_color = hex_linear(farbe) if isinstance(farbe, str) else farbe
    return m


def kunststoff(name, farbe, rauheit=0.32):
    """Weich glänzender Kunststoff mit dünnem Klarlack (wie hochwertiges Spielzeug)."""
    return material(name, farbe, rauheit=rauheit, lack=0.55, lack_rauheit=0.06, spiegel=0.45)


def keramik(name, farbe=FARBEN["weiss"]):
    """Glasierte Keramik: matter Unterbau, spiegelnde Glasur."""
    return material(name, farbe, rauheit=0.38, lack=1.0, lack_rauheit=0.025, spiegel=0.4, sss=0.08)


def glas(name="Glas"):
    return material(name, "#FFFFFF", rauheit=0.02, transmission=1.0, ior=1.45, spiegel=0.5)


# ---------------------------------------------------------------- Geometrie

def logo_wurzel():
    """Empty, in dessen lokaler XY-Ebene das Logo liegt (Z zeigt zum Betrachter)."""
    e = bpy.data.objects.new("Logo", None)
    bpy.context.scene.collection.objects.link(e)
    e.rotation_euler = (math.radians(90), 0, 0)
    return e


def strich_umriss(punkte, breite, kappe_segmente=24):
    """Umriss eines Strichs mit runden Kappen um eine 2D-Mittellinie (Liste von (x, y))."""
    n = len(punkte)
    P = [Vector((p[0], p[1])) for p in punkte]
    T = []
    for i in range(n):
        a = P[max(i - 1, 0)]
        b = P[min(i + 1, n - 1)]
        t = (b - a).normalized()
        T.append(t)
    N = [Vector((-t.y, t.x)) for t in T]
    h = breite / 2
    links = [P[i] + N[i] * h for i in range(n)]
    rechts = [P[i] - N[i] * h for i in range(n)]
    umriss = list(links)
    # Endkappe: von links über vorne nach rechts
    w0 = math.atan2(N[-1].y, N[-1].x)
    for k in range(1, kappe_segmente):
        w = w0 - math.pi * k / kappe_segmente
        umriss.append(P[-1] + Vector((math.cos(w), math.sin(w))) * h)
    umriss += list(reversed(rechts))
    # Startkappe: von rechts über hinten nach links
    w0 = math.atan2(-N[0].y, -N[0].x)
    for k in range(1, kappe_segmente):
        w = w0 - math.pi * k / kappe_segmente
        umriss.append(P[0] + Vector((math.cos(w), math.sin(w))) * h)
    return [(v.x, v.y) for v in umriss]


def platte_aus_umriss(name, umrisse, tiefe=0.2, fase=0.06, fase_aufloesung=6, mat=None, eltern=None,
                      z=0.0, als_mesh=True):
    """Extrudiert einen oder mehrere geschlossene 2D-Umrisse zu einer weich gefasten Platte
    (wie 3D-Text). tiefe = halbe Dicke ohne Fase."""
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "2D"
    cu.fill_mode = "BOTH"
    cu.extrude = tiefe
    cu.bevel_depth = fase
    cu.bevel_resolution = fase_aufloesung
    cu.offset = -fase * 0.0
    for umriss in umrisse:
        sp = cu.splines.new("POLY")
        sp.points.add(len(umriss) - 1)
        for i, (x, y) in enumerate(umriss):
            sp.points[i].co = (x, y, 0, 1)
        sp.use_cyclic_u = True
        sp.use_smooth = True
    o = bpy.data.objects.new(name, cu)
    bpy.context.scene.collection.objects.link(o)
    if mat:
        cu.materials.append(mat)
    if als_mesh:
        o = curve_zu_mesh(o)
    if eltern:
        o.parent = eltern
    o.location.z = z
    return o


def curve_zu_mesh(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    name = o.name
    mats = list(o.data.materials)
    bpy.data.objects.remove(o)
    neu = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(neu)
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    glaetten_nach_winkel(neu, 40)
    return neu


def glaetten_nach_winkel(o, winkel=35):
    me = o.data
    for p in me.polygons:
        p.use_smooth = True
    # Kanten schärfer als `winkel` als hart markieren (ersetzt Auto-Smooth)
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me)
    grenze = math.radians(winkel)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > grenze:
            e.smooth = False
    bm.to_mesh(me)
    bm.free()


def kugel(name, radius, ort, mat, eltern=None, unterteilung=5):
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=unterteilung, radius=radius)
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    me.materials.append(mat)
    o.location = ort
    if eltern:
        o.parent = eltern
    return o


def zylinder(name, radius, hoehe, ort, mat, eltern=None, segmente=128, fase=0.02, fase_segmente=4,
             drehung=(0, 0, 0)):
    """Gefaster Zylinder (Achse lokal Z, Mitte bei ort)."""
    import bmesh
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=segmente, radius1=radius,
                          radius2=radius, depth=hoehe)
    if fase > 0:
        kanten = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(60)]
        bmesh.ops.bevel(bm, geom=kanten, offset=fase, segments=fase_segmente, affect="EDGES", profile=0.5)
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    glaetten_nach_winkel(o, 30)
    me.materials.append(mat)
    o.location = ort
    o.rotation_euler = drehung
    if eltern:
        o.parent = eltern
    return o


# ---------------------------------------------------------------- Ausgabe

def speichern_und_exportieren(ordner, name):
    os.makedirs(ordner, exist_ok=True)
    blend = os.path.join(ordner, f"{name}.blend")
    glb = os.path.join(ordner, f"{name}.glb")
    # Für glTF nur die Logo-Geometrie, ohne Kamera und Lichter
    bpy.ops.object.select_all(action="DESELECT")
    for o in bpy.context.scene.objects:
        if o.type in {"MESH", "EMPTY"}:
            o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_apply=True,
                              export_cameras=False, export_lights=False, export_yup=True)
    bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True, relative_remap=True)
    print("gespeichert:", blend, glb)


def rendern(pfad, aufloesung=None, samples=None):
    s = bpy.context.scene
    if aufloesung:
        s.render.resolution_x = s.render.resolution_y = aufloesung
    if samples:
        s.cycles.samples = samples
    s.render.filepath = pfad
    bpy.ops.render.render(write_still=True)
    print("gerendert:", pfad)
