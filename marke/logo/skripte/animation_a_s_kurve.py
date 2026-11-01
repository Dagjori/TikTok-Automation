"""Logo-Animation für Konzept A „S-Kurve“ (2,5 s, 1080×1080, 30 fps).

Ablauf:
  0,0–1,5 s  Beide Bahnen zeichnen sich wie ein Rennen: Blau startet schneller,
             Orange holt auf und ist knapp vorher im Ziel (Führungswechsel).
             Dabei dreht sich das Zeichen aus der Schräge in die Endlage.
  1,5–2,4 s  Ein Lichtreflex wandert über die glänzenden Bahnen.
  2,4–2,5 s  Standbild = Profilbild-Motiv.

Schritt 1 (Blender):  /home/user/.venv-blender/bin/python animation_a_s_kurve.py
  rendert freigestellte Einzelbilder nach $LOGO_SCRATCH/frames_a/.
Schritt 2 (Pillow + ffmpeg):  python3 animation_a_s_kurve.py --montage
  legt die Bilder auf den Profilbild-Hintergrund und schreibt die MP4.
"""

import math
import os
import subprocess
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)

FPS = 30
DAUER = 2.5
N = int(FPS * DAUER)
AUFLOESUNG = 1080
SCRATCH = os.environ.get("LOGO_SCRATCH", "/tmp")
FRAMES = os.path.join(SCRATCH, "frames_a")
ZIEL_MP4 = os.path.join(os.path.dirname(HIER), "a-s-kurve", "simulierbar-logo-a-s-kurve-animation.mp4")


def ease_out(x, p=2.0):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** p


def ease_in(x, p=2.0):
    x = min(max(x, 0.0), 1.0)
    return x ** p


def ease_in_out(x):
    x = min(max(x, 0.0), 1.0)
    return x * x * (3 - 2 * x)


def zustand(t):
    """Fortschritt der Bahnen, Drehung (Grad) und Position des Lichtreflexes zur Zeit t."""
    blau = ease_out(t / 1.5, 2.0)            # schneller Start, langes Auslaufen
    orange = ease_in(t / 1.25, 1.8)          # langsamer Start, starkes Finish
    drehung = -38.0 * (1 - ease_out(t / 1.6, 3.0))
    reflex = ease_in_out((t - 1.45) / 0.95)  # 0 → 1 zwischen 1,45 und 2,4 s
    return (blau, orange), drehung, reflex


def rendern():
    import bpy
    import gemeinsam as g
    import konzept_a_s_kurve as a
    from mathutils import Quaternion

    test = os.environ.get("ANIM_TEST")  # z. B. "20,55": nur diese Bilder, klein, zum Prüfen
    s = a.szene(aufloesung=540 if test else AUFLOESUNG)
    s.cycles.samples = 8 if test else 20
    s.cycles.adaptive_threshold = 0.02
    s.render.threads = 3
    cam = s.camera
    wurzel = bpy.data.objects["Logo"]
    m_blau = bpy.data.materials["Blau"]
    m_orange = bpy.data.materials["Orange"]

    # Lichtreflex: langes, schmales Flächenlicht nur für Spiegelungen, wandert in der Kameraebene
    glanz = g.flaechenlicht("Glanz", (0, 0, 0), energie=2400.0, groesse=(0.5, 40.0))
    glanz.visible_diffuse = False
    glanz.visible_transmission = False
    rechts = cam.matrix_world.to_3x3().col[0].normalized()
    blick = -cam.matrix_world.to_3x3().col[2].normalized()
    cam_ort = cam.matrix_world.translation.copy()

    os.makedirs(FRAMES, exist_ok=True)
    bilder = [int(x) for x in test.split(",")] if test else range(N)
    for f in bilder:
        t = f / FPS
        fortschritt, drehung, reflex = zustand(t)
        for o in list(wurzel.children):
            me = o.data
            bpy.data.objects.remove(o)
            bpy.data.meshes.remove(me)
        a.bahnen_bauen(wurzel, fortschritt, m_blau, m_orange)
        wurzel.rotation_euler = (math.radians(90), 0, math.radians(drehung))
        # Reflex von links nach rechts, leicht schräg gestellt; außerhalb der Sweep-Zeit aus
        x = -9.0 + 18.0 * reflex
        glanz.location = cam_ort + rechts * x + blick * 2.0
        g.richte_aus(glanz, tuple(glanz.location + blick))
        glanz.rotation_quaternion = glanz.rotation_quaternion @ Quaternion((0, 0, 1), math.radians(28))
        glanz.data.energy = 2400.0 if 0.0 < reflex < 1.0 else 0.0
        s.render.filepath = os.path.join(FRAMES, f"{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Bild {f + 1}/{N}", flush=True)


def montage():
    import nachbearbeitung as nb
    from PIL import Image, ImageFilter

    komp = os.path.join(SCRATCH, "komp_a")
    os.makedirs(komp, exist_ok=True)
    letztes = Image.open(os.path.join(FRAMES, f"{N - 1:04d}.png")).convert("RGBA")
    box = nb.alpha_box(letztes)
    mitte = ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)
    r = nb.max_radius(letztes, mitte)
    f = nb.RADIUS_ANTEIL * AUFLOESUNG / r
    hg = nb.radialer_verlauf(AUFLOESUNG).convert("RGBA")
    for i in range(N):
        bild = Image.open(os.path.join(FRAMES, f"{i:04d}.png")).convert("RGBA")
        gross = bild.resize((round(bild.width * f), round(bild.height * f)), Image.LANCZOS)
        ox = round(AUFLOESUNG / 2 - mitte[0] * f)
        oy = round(AUFLOESUNG / 2 - mitte[1] * f)
        out = hg.copy()
        schatten = Image.new("RGBA", gross.size, (0, 0, 0, 0))
        schatten.putalpha(gross.split()[-1].point(lambda v: int(v * 0.55)))
        schatten = schatten.filter(ImageFilter.GaussianBlur(AUFLOESUNG * 0.022))
        out.alpha_composite(schatten, (ox, oy + int(AUFLOESUNG * 0.018)))
        out.alpha_composite(gross, (ox, oy))
        out.convert("RGB").save(os.path.join(komp, f"{i:04d}.png"))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(komp, "%04d.png"),
                    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "slow",
                    "-movflags", "+faststart", ZIEL_MP4], check=True)
    print("fertig:", ZIEL_MP4, os.path.getsize(ZIEL_MP4) // 1024, "KB")


if __name__ == "__main__":
    if "--montage" in sys.argv:
        montage()
    else:
        rendern()
