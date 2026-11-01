"""Nachbearbeitung der Logo-Renderings (System-Python mit Pillow, kein Blender nötig).

Aus marke/logo/<konzept>/roh-2048.png (freigestellter Cycles-Render) entstehen:
  - <name>-freigestellt-2048.png  transparenter Hintergrund, mittig
  - <name>-profilbild-1080.png    Profilbild mit Hintergrund, kreissicher
  - <name>-pruefbild-klein.png    Kontrolle 110 px und 48 px im Kreis (hell/dunkel)
und für alle Konzepte zusammen marke/logo/uebersicht.png.

Aufruf:  python3 nachbearbeitung.py [a-s-kurve b-kugelbahn c-schleppzeiger]
Die Beschriftung nutzt die Schrift Inter (SIL Open Font License 1.1), falls installiert.
"""

import math
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HIER = os.path.dirname(os.path.abspath(__file__))
LOGO = os.path.dirname(HIER)

KONZEPTE = {
    "a-s-kurve": ("A", "S-Kurve", "simulierbar-logo-a-s-kurve"),
    "b-kugelbahn": ("B", "Kugelbahn", "simulierbar-logo-b-kugelbahn"),
    "c-schleppzeiger": ("C", "Schleppzeiger", "simulierbar-logo-c-schleppzeiger"),
}

TINTE = (20, 23, 31)
HG_MITTE = (36, 42, 58)      # Profilbild: hellere Mitte (Studio-Spot)
HG_RAND = (14, 16, 22)       # Profilbild: dunkler Rand
RADIUS_ANTEIL = 0.415        # Motiv reicht bis 83 % des Kreisdurchmessers


def schrift(groesse, fett=False):
    for p in ([
        "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
        "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
    ] if fett else [
        "/usr/share/fonts/opentype/inter/Inter-Medium.otf",
        "/usr/share/fonts/opentype/inter/Inter-Regular.otf",
    ]):
        if os.path.exists(p):
            return ImageFont.truetype(p, groesse)
    return ImageFont.load_default()


def radialer_verlauf(groesse, mitte=HG_MITTE, rand=HG_RAND, zentrum=(0.5, 0.42)):
    """Weicher radialer Verlauf mit feinem Dithering gegen Banding."""
    y, x = np.mgrid[0:groesse, 0:groesse].astype(np.float32)
    d = np.clip(np.hypot(x - zentrum[0] * groesse, y - zentrum[1] * groesse) / (groesse * 0.78), 0, 1)
    t = d * d * (3 - 2 * d)
    m = np.array(mitte, np.float32)
    r = np.array(rand, np.float32)
    rgb = m + (r - m) * t[..., None]
    rgb += np.random.default_rng(7).uniform(-0.75, 0.75, rgb.shape)
    return Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), "RGB")


def alpha_box(im, schwelle=8):
    a = im.split()[-1].point(lambda v: 255 if v > schwelle else 0)
    return a.getbbox()


def max_radius(im, mitte, schwelle=40):
    """Größter Abstand eines (deutlich) deckenden Pixels von `mitte`."""
    a = np.asarray(im.split()[-1])
    ys, xs = np.nonzero(a > schwelle)
    return float(np.max(np.hypot(xs + 0.5 - mitte[0], ys + 0.5 - mitte[1])))


def kreis_maske(groesse, ueberabtastung=4):
    g = groesse * ueberabtastung
    m = Image.new("L", (g, g), 0)
    ImageDraw.Draw(m).ellipse((0, 0, g - 1, g - 1), fill=255)
    return m.resize((groesse, groesse), Image.LANCZOS)


def freistellen(roh):
    """Motiv mittig auf 2048er Leinwand (nur verschieben/verkleinern, nie vergrößern)."""
    box = alpha_box(roh)
    motiv = roh.crop(box)
    ziel = int(2048 * 0.90)
    f = min(1.0, ziel / max(motiv.size))
    if f < 1.0:
        motiv = motiv.resize((round(motiv.width * f), round(motiv.height * f)), Image.LANCZOS)
    out = Image.new("RGBA", (2048, 2048), (0, 0, 0, 0))
    out.alpha_composite(motiv, ((2048 - motiv.width) // 2, (2048 - motiv.height) // 2))
    return out


def profilbild(frei, groesse=1080, glanz=None):
    """Profilbild: Motiv kreissicher (Radius RADIUS_ANTEIL) auf Studio-Verlauf mit weichem Schatten."""
    hg = radialer_verlauf(groesse).convert("RGBA")
    if glanz:
        # dezentes Teamfarben-Licht im Hintergrund (links Blau, rechts Orange)
        schicht = Image.new("RGBA", (groesse, groesse), (0, 0, 0, 0))
        d = ImageDraw.Draw(schicht)
        for (fx, farbe) in glanz:
            cx = int(fx * groesse)
            d.ellipse((cx - groesse * 0.42, groesse * 0.12, cx + groesse * 0.42, groesse * 0.88), fill=farbe + (34,))
        schicht = schicht.filter(ImageFilter.GaussianBlur(groesse * 0.14))
        hg.alpha_composite(schicht)
    mitte = (frei.width / 2, frei.height / 2)
    r = max_radius(frei, mitte)
    f = (RADIUS_ANTEIL * groesse) / r
    motiv = frei.resize((round(frei.width * f), round(frei.height * f)), Image.LANCZOS)
    ox = (groesse - motiv.width) // 2
    oy = (groesse - motiv.height) // 2
    # weicher Schatten nach unten
    schatten = Image.new("RGBA", motiv.size, (0, 0, 0, 0))
    schatten.putalpha(motiv.split()[-1].point(lambda v: int(v * 0.55)))
    schatten = schatten.filter(ImageFilter.GaussianBlur(groesse * 0.022))
    hg.alpha_composite(schatten, (ox, oy + int(groesse * 0.018)))
    hg.alpha_composite(motiv, (ox, oy))
    return hg.convert("RGB")


def rund(bild, groesse):
    klein = bild.resize((groesse, groesse), Image.LANCZOS).convert("RGBA")
    klein.putalpha(kreis_maske(groesse))
    return klein


def pruefbild(profil, titel):
    """Kontrolle: 110 px und 48 px im Kreis auf dunkler und heller Oberfläche,
    dazu 48 px vierfach vergrößert und eine Profilzeile wie in Suche/Kommentaren."""
    B, Z = 980, 300
    img = Image.new("RGB", (B, 2 * Z), (245, 245, 247))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, B, Z), fill=(18, 18, 18))
    f_titel = schrift(22, True)
    f_text = schrift(16)
    for zeile, fg in enumerate([(235, 235, 235), (40, 40, 40)]):
        y0 = zeile * Z
        d.text((24, y0 + 16), f"{titel} – {'dunkler' if zeile == 0 else 'heller'} Modus", font=f_titel, fill=fg)
        r110 = rund(profil, 110)
        img.paste(r110, (40, y0 + 97), r110)
        d.text((68, y0 + 258), "110 px", font=f_text, fill=fg)
        r48 = rund(profil, 48)
        img.paste(r48, (200, y0 + 128), r48)
        d.text((202, y0 + 258), "48 px", font=f_text, fill=fg)
        lupe = r48.resize((192, 192), Image.NEAREST)
        img.paste(lupe, (300, y0 + 56), lupe)
        d.text((316, y0 + 258), "48 px, 4× vergrößert", font=f_text, fill=fg)
        x = 580
        r40 = rund(profil, 40)
        img.paste(r40, (x, y0 + 100), r40)
        d.text((x + 52, y0 + 102), "simulierbar", font=schrift(18, True), fill=fg)
        d.text((x + 52, y0 + 124), "Alltag durchgerechnet", font=f_text, fill=(150, 150, 150))
        r32 = rund(profil, 32)
        img.paste(r32, (x + 4, y0 + 170), r32)
        d.text((x + 52, y0 + 176), "32 px (Kommentar)", font=f_text, fill=fg)
    return img


def optimieren(pfad, qualitaet="80-95"):
    """PNG verlustarm verkleinern (pngquant, falls vorhanden)."""
    if shutil.which("pngquant"):
        subprocess.run(["pngquant", "--force", "--skip-if-larger", "--speed", "1", "--quality", qualitaet,
                        "--output", pfad, pfad], check=False)


def konzept(ordner):
    kenn, titel, name = KONZEPTE[ordner]
    pfad = os.path.join(LOGO, ordner)
    roh = Image.open(os.path.join(pfad, "roh-2048.png")).convert("RGBA")
    frei = freistellen(roh)
    p_frei = os.path.join(pfad, f"{name}-freigestellt-2048.png")
    frei.save(p_frei, optimize=True)
    optimieren(p_frei)
    profil = profilbild(frei)
    p_profil = os.path.join(pfad, f"{name}-profilbild-1080.png")
    profil.save(p_profil, optimize=True)
    optimieren(p_profil, "85-98")
    p_pruef = os.path.join(pfad, f"{name}-pruefbild-klein.png")
    pruefbild(profil, f"Konzept {kenn} „{titel}“").save(p_pruef, optimize=True)
    optimieren(p_pruef)
    print("fertig:", ordner)
    return profil


def uebersicht(profile):
    B, H = 1920, 1180
    img = Image.new("RGB", (B, H), (246, 245, 242))
    d = ImageDraw.Draw(img)
    d.rectangle((0, 0, B, 820), fill=(16, 18, 24))
    d.text((60, 44), "Simulierbar · Bildmarke · 3 Konzepte", font=schrift(44, True), fill=(240, 240, 240))
    d.text((60, 104), "Profilbild im Kreis-Zuschnitt (TikTok/YouTube). Unten: echte Größen 110 px, 48 px und 32 px.",
           font=schrift(22), fill=(160, 166, 180))
    spalte = B // 3
    for i, (ordner, profil) in enumerate(profile.items()):
        kenn, titel, _ = KONZEPTE[ordner]
        x0 = i * spalte
        gross = rund(profil, 520)
        img.paste(gross, (x0 + (spalte - 520) // 2, 180), gross)
        d.text((x0 + (spalte - 520) // 2, 724), f"{kenn}  {titel}", font=schrift(34, True), fill=(240, 240, 240))
        # Kleinvorschau: dunkel (oben im hellen Bereich als dunkle Karte) und hell
        for k, (hg, y) in enumerate([((18, 18, 18), 860), ((255, 255, 255), 1010)]):
            karte = (x0 + 60, y, x0 + spalte - 60, y + 130)
            d.rounded_rectangle(karte, radius=18, fill=hg, outline=(220, 220, 220) if k else None)
            fg = (235, 235, 235) if k == 0 else (30, 30, 30)
            cx = karte[0] + 24
            for gr in (110, 48, 32):
                r = rund(profil, gr)
                img.paste(r, (cx, y + (130 - gr) // 2), r)
                cx += gr + 28
            d.text((cx + 6, y + 40), "simulierbar", font=schrift(22, True), fill=fg)
            d.text((cx + 6, y + 70), f"{'dunkler' if k == 0 else 'heller'} Modus", font=schrift(18), fill=(140, 140, 140))
    p = os.path.join(LOGO, "uebersicht.png")
    img.save(p, optimize=True)
    optimieren(p)
    print("fertig:", p)


if __name__ == "__main__":
    auswahl = sys.argv[1:] or list(KONZEPTE)
    profile = {}
    for o in auswahl:
        profile[o] = konzept(o)
    if len(profile) == 3:
        uebersicht(profile)
