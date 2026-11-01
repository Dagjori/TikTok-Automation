"""Nachbearbeitung Logo Account 2 (System-Python mit Pillow, kein Blender nötig).

Aus marke/account2/logo/roh-2048.png entstehen:
  - account2-logo-fragezeichen-freigestellt-2048.png  transparent, für Banner und Impressum
  - account2-logo-fragezeichen-profilbild-1080.png    TikTok/YouTube-Profilbild, quadratisch, kreissicher
  - account2-logo-fragezeichen-profilbild-400.jpg     kleine Reserve unter 50 KB
  - account2-logo-fragezeichen-pruefbild-klein.png    Kontrolle 110 px und 48 px im Kreis (hell/dunkel)
Nutzt die Funktionen von Simulierbar (`marke/logo/skripte/nachbearbeitung.py`).
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HIER, "..", "..", "logo", "skripte"))
import nachbearbeitung as nb  # noqa: E402

LOGO = os.path.join(HIER, "..", "logo")
NAME = "account2-logo-fragezeichen"
HG_MITTE = (44, 38, 70)    # Studio-Spot, leicht violett (Abgrenzung zu Simulierbar)
HG_RAND = (13, 11, 22)
GLANZ = [(0.30, (255, 79, 90)), (0.72, (46, 196, 182))]   # Koralle links, Türkis rechts, sehr dezent


def profilbild(frei, groesse=1080):
    hg = nb.radialer_verlauf(groesse, mitte=HG_MITTE, rand=HG_RAND).convert("RGBA")
    schicht = Image.new("RGBA", (groesse, groesse), (0, 0, 0, 0))
    d = ImageDraw.Draw(schicht)
    for fx, farbe in GLANZ:
        cx = int(fx * groesse)
        d.ellipse((cx - groesse * 0.40, groesse * 0.14, cx + groesse * 0.40, groesse * 0.86), fill=farbe + (26,))
    hg.alpha_composite(schicht.filter(ImageFilter.GaussianBlur(groesse * 0.14)))
    mitte = (frei.width / 2, frei.height / 2)
    r = nb.max_radius(frei, mitte)
    f = (nb.RADIUS_ANTEIL * groesse) / r
    motiv = frei.resize((round(frei.width * f), round(frei.height * f)), Image.LANCZOS)
    ox, oy = (groesse - motiv.width) // 2, (groesse - motiv.height) // 2
    schatten = Image.new("RGBA", motiv.size, (0, 0, 0, 0))
    schatten.putalpha(motiv.split()[-1].point(lambda v: int(v * 0.55)))
    schatten = schatten.filter(ImageFilter.GaussianBlur(groesse * 0.022))
    hg.alpha_composite(schatten, (ox, oy + int(groesse * 0.018)))
    hg.alpha_composite(motiv, (ox, oy))
    return hg.convert("RGB")


if __name__ == "__main__":
    roh = Image.open(os.path.join(LOGO, "roh-2048.png")).convert("RGBA")
    frei = nb.freistellen(roh)
    p = os.path.join(LOGO, f"{NAME}-freigestellt-2048.png")
    frei.save(p, optimize=True)
    nb.optimieren(p)
    profil = profilbild(frei)
    p = os.path.join(LOGO, f"{NAME}-profilbild-1080.png")
    profil.save(p, optimize=True)
    nb.optimieren(p, "85-98")
    klein = profil.resize((400, 400), Image.LANCZOS)
    p_klein = os.path.join(LOGO, f"{NAME}-profilbild-400.jpg")
    for q in (90, 85, 80, 75):
        klein.save(p_klein, quality=q, optimize=True, progressive=True)
        if os.path.getsize(p_klein) < 50_000:
            break
    nb.pruefbild(profil, "Account 2 „Fragezeichen-Countdown“").save(os.path.join(LOGO, f"{NAME}-pruefbild-klein.png"), optimize=True)
    for f in sorted(os.listdir(LOGO)):
        print(f, os.path.getsize(os.path.join(LOGO, f)) // 1024, "KB")
