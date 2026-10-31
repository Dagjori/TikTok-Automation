"""Sicht-Prüfung der Reißverschluss-Simulation: Raum-Zeit-Diagramme und Trajektorien-Detail.

Aufruf (nach `node pipeline/sim/auswertung_reissverschluss.mjs`):
    python3 -I pipeline/sim/plot_raumzeit.py

Liest:    pipeline/projekte/reissverschluss/out/raumzeit_<szenario>_<strategie>.{bin,json}  (Rohdaten, nicht im Repo)
          pipeline/projekte/reissverschluss/trajektorien_<szenario>_<strategie>.json
Schreibt: pipeline/projekte/reissverschluss/plots/raumzeit_<szenario>.png   (Geschwindigkeit je Spur, A links, B rechts)
          pipeline/projekte/reissverschluss/plots/detail_<szenario>.png     (30-Hz-Trajektorien des Animationsfensters)
Benötigt: numpy, Pillow (matplotlib ist nicht nötig).
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

WURZEL = Path(__file__).resolve().parent.parent / "projekte" / "reissverschluss"
OUT = WURZEL / "out"
PLOTS = WURZEL / "plots"
PLOTS.mkdir(exist_ok=True)

SZENARIEN = [("wenig", "Wenig Verkehr"), ("feierabend", "Feierabend"), ("rushhour", "Rushhour")]
STRATEGIEN = [("frueh", "A · Früh einordnen"), ("reissverschluss", "B · Reißverschluss")]
SPUREN = ["Spur 0 (durchgehend)", "Spur 1 (endet an der Engstelle)"]

SCHRIFT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SCHRIFT_FETT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(groesse, fett=False):
    try:
        return ImageFont.truetype(SCHRIFT_FETT if fett else SCHRIFT, groesse)
    except OSError:
        return ImageFont.load_default(size=groesse)


# Farbskala: Geschwindigkeit in Zellen/s (7,5 m/s je Zelle)
STUETZ = np.array([0.0, 1.0, 2.0, 3.0])
FARBEN = np.array([[150, 20, 40], [230, 100, 60], [250, 215, 110], [30, 150, 80]], dtype=float)
LEER = np.array([246, 246, 246], dtype=np.uint8)


def farbe(v):
    """v: Array (NaN = leer) -> RGB-Array."""
    rgb = np.empty(v.shape + (3,), dtype=np.uint8)
    rgb[:] = LEER
    ok = ~np.isnan(v)
    vv = np.clip(v[ok], 0, 3)
    for k in range(3):
        rgb[ok, k] = np.interp(vv, STUETZ, FARBEN[:, k]).astype(np.uint8)
    return rgb


def verkleinere(g, nx, ny):
    """g: (T, W) uint8, 255 = leer. Mittlere Geschwindigkeit der belegten Zellen je Bildpunkt."""
    belegt = g != 255
    summe = np.where(belegt, g, 0).astype(np.float64)
    ix = np.linspace(0, g.shape[0], nx + 1).astype(int)
    iy = np.linspace(0, g.shape[1], ny + 1).astype(int)
    s = np.add.reduceat(np.add.reduceat(summe, ix[:-1], axis=0), iy[:-1], axis=1)
    n = np.add.reduceat(np.add.reduceat(belegt.astype(np.float64), ix[:-1], axis=0), iy[:-1], axis=1)
    with np.errstate(invalid="ignore", divide="ignore"):
        m = np.where(n > 0, s / n, np.nan)
    return m  # (nx, ny)


def raumzeit(sz, sz_name):
    spalten = []
    for st, st_name in STRATEGIEN:
        meta = json.loads((OUT / f"raumzeit_{sz}_{st}.json").read_text())
        daten = np.fromfile(OUT / f"raumzeit_{sz}_{st}.bin", dtype=np.uint8).reshape(meta["T"], 2, meta["W"])
        spalten.append((st, st_name, meta, daten))

    PW, PH = 640, 400  # Panelgröße
    RL, RO, RU, RR = 78, 96, 56, 18  # Ränder
    luecke = 24
    breite = RL + 2 * PW + luecke + RR
    hoehe = RO + 2 * PH + luecke + RU
    bild = Image.new("RGB", (breite, hoehe), (255, 255, 255))
    d = ImageDraw.Draw(bild)
    f_t, f_k, f_s = font(22, True), font(15, True), font(13)

    z = spalten[0][2]
    d.text((RL, 16), f"Raum-Zeit-Diagramm · {sz_name} · {z['zuflussKfzH']:.0f} Kfz/h", font=f_t, fill=(20, 20, 20))
    d.text(
        (RL, 50),
        "Farbe = mittlere Geschwindigkeit (rot: steht, gelb: 15 m/s, grün: 22 m/s), weiß = leer. Fahrtrichtung nach oben, Zeit nach rechts.",
        font=f_s,
        fill=(70, 70, 70),
    )
    d.text((RL, 68), "Schwarze Linie: Ende des Rückstaus. Gestrichelt: Engstelle (schwarz), Schild bzw. Wechselzone (blau).", font=f_s, fill=(70, 70, 70))

    for ci, (st, st_name, meta, daten) in enumerate(spalten):
        T, W = meta["T"], meta["W"]
        xb = meta["xbIndex"]
        zelle = meta["zelleM"]
        tmax_s = 3600 if sz != "rushhour" else 4200
        tmax_s = min(T, tmax_s)
        x0 = RL + ci * (PW + luecke)
        d.text((x0, RO - 26), f"{st_name}  (Seed {meta['seed']})", font=f_k, fill=(20, 20, 20))
        for ri in range(2):
            y0 = RO + ri * (PH + luecke)
            g = daten[:tmax_s, ri, :]
            m = verkleinere(g, PW, PH)  # (PW, PH): x = Zeit, y = Zelle
            rgb = farbe(m.T[::-1])  # Fahrtrichtung nach oben
            panel = Image.fromarray(rgb, "RGB")
            bild.paste(panel, (x0, y0))
            # Bereich ohne Spur (Spur 1 hinter der Engstelle)
            if ri == 1:
                gy = y0 + int(PH * (W - xb) / W)  # y der Engstelle (von oben)
                d.rectangle([x0, y0, x0 + PW - 1, gy - 1], fill=None)
                d.rectangle([x0, y0, x0 + PW - 1, gy], outline=None)
                tex = Image.new("RGB", (PW, max(1, gy - y0)), (210, 210, 210))
                bild.paste(tex, (x0, y0))
            d.rectangle([x0, y0, x0 + PW, y0 + PH], outline=(60, 60, 60))

            def ypos(zelle_idx):
                return y0 + PH - int(PH * zelle_idx / W)

            # Engstelle, Schild/Zone
            yb = ypos(xb)
            for xx in range(x0, x0 + PW, 8):
                d.line([xx, yb, xx + 4, yb], fill=(0, 0, 0), width=1)
            marke = meta["schildZellen"] if st == "frueh" else 8
            ym = ypos(xb - marke)
            for xx in range(x0, x0 + PW, 8):
                d.line([xx, ym, xx + 4, ym], fill=(30, 80, 220), width=1)
            # Rückstauende
            pts = []
            for px in range(PW):
                t = min(len(meta["rueckstauM"]) - 1, int(px * tmax_s / PW))
                r = meta["rueckstauM"][t]
                if r > 0:
                    pts.append((x0 + px, ypos(xb - r / zelle)))
                else:
                    if len(pts) > 1:
                        d.line(pts, fill=(0, 0, 0), width=2)
                    pts = []
            if len(pts) > 1:
                d.line(pts, fill=(0, 0, 0), width=2)
            # Zeitachse (unten) und Weg-Achse (links)
            if ri == 1:
                for minute in range(0, int(tmax_s / 60) + 1, 10):
                    xx = x0 + int(PW * minute * 60 / tmax_s)
                    d.line([xx, y0 + PH, xx, y0 + PH + 5], fill=(60, 60, 60))
                    d.text((xx - 8, y0 + PH + 8), f"{minute}", font=f_s, fill=(40, 40, 40))
                d.text((x0 + PW // 2 - 50, y0 + PH + 28), "Zeit in Minuten", font=f_s, fill=(40, 40, 40))
            if ci == 0:
                d.text((6, y0 + PH // 2 - 8), SPUREN[ri][:6], font=f_s, fill=(40, 40, 40))
                for km in range(-6, 1):
                    yy = ypos(xb + km * 1000 / zelle)
                    if y0 <= yy <= y0 + PH:
                        d.line([x0 - 5, yy, x0, yy], fill=(60, 60, 60))
                        d.text((x0 - 52, yy - 8), f"{km:+d} km" if km else "0 km", font=f_s, fill=(40, 40, 40))
            d.text((x0 + 6, y0 + 4), SPUREN[ri], font=f_s, fill=(20, 20, 20))
    pfad = PLOTS / f"raumzeit_{sz}.png"
    bild.save(pfad, optimize=True)
    return pfad


def detail(sz, sz_name):
    """Trajektorien des Animationsfensters (aus den fertigen JSON-Dateien) je Spur."""
    PW, PH = 640, 330
    RL, RO, RU, RR = 78, 96, 50, 18
    luecke = 24
    bild = Image.new("RGB", (RL + 2 * PW + luecke + RR, RO + 2 * PH + luecke + RU), (255, 255, 255))
    d = ImageDraw.Draw(bild)
    f_t, f_k, f_s = font(22, True), font(15, True), font(13)
    d.text((RL, 16), f"Trajektorien (30 Hz) · {sz_name}", font=f_t, fill=(20, 20, 20))
    d.text((RL, 50), "Je Fahrzeug eine Linie: Position vor der Engstelle über die Zeit. Orange = kommt von der endenden Spur, blau = durchgehende Spur.", font=f_s, fill=(70, 70, 70))
    d.text((RL, 68), "Linien derselben Spur dürfen sich nicht kreuzen (kein Überholen), Sprünge wären senkrechte Striche.", font=f_s, fill=(70, 70, 70))
    for ci, (st, st_name) in enumerate(STRATEGIEN):
        traj = json.loads((WURZEL / f"trajektorien_{sz}_{st}.json").read_text())
        meta = traj["meta"]
        xmin, xmax = meta["x_bereich_m"]
        frames = meta["frames"]
        dauer = meta["fenster"]["dauer_s"]
        x0 = RL + ci * (PW + luecke)
        d.text((x0, RO - 26), f"{st_name}  ·  Fenster ab Minute {meta['fenster']['start_s'] // 60}  ·  {len(traj['fahrzeuge'])} Fahrzeuge", font=f_k, fill=(20, 20, 20))
        for ri in range(2):
            y0 = RO + ri * (PH + luecke)
            d.rectangle([x0, y0, x0 + PW, y0 + PH], fill=(250, 250, 250), outline=(60, 60, 60))
            if ri == 1:
                gy = y0 + int(PH * (xmax - 0) / (xmax - xmin))
                d.rectangle([x0 + 1, y0 + 1, x0 + PW - 1, gy], fill=(215, 215, 215))
            yb = y0 + int(PH * xmax / (xmax - xmin))
            for xx in range(x0, x0 + PW, 8):
                d.line([xx, yb, xx + 4, yb], fill=(0, 0, 0))
            for fz in traj["fahrzeuge"]:
                segment = []
                farbe_f = (230, 120, 20) if fz["h"] == 1 else (30, 100, 200)
                for k, (xv, sv) in enumerate(zip(fz["x"], fz["s"])):
                    in_spur = (sv < 0.5) if ri == 0 else (sv >= 0.5)
                    if in_spur:
                        px = x0 + int(PW * (fz["f"] + k) / (frames - 1))
                        py = y0 + PH - int(PH * (xv - xmin) / (xmax - xmin))
                        segment.append((px, py))
                    else:
                        if len(segment) > 1:
                            d.line(segment, fill=farbe_f, width=1)
                        segment = []
                if len(segment) > 1:
                    d.line(segment, fill=farbe_f, width=1)
            d.text((x0 + 6, y0 + 4), SPUREN[ri], font=f_s, fill=(20, 20, 20))
            if ri == 1:
                for s in range(0, int(dauer) + 1, 3):
                    xx = x0 + int(PW * s / dauer)
                    d.line([xx, y0 + PH, xx, y0 + PH + 5], fill=(60, 60, 60))
                    d.text((xx - 6, y0 + PH + 8), f"{s}", font=f_s, fill=(40, 40, 40))
                d.text((x0 + PW // 2 - 40, y0 + PH + 26), "Zeit in Sekunden", font=f_s, fill=(40, 40, 40))
            if ci == 0:
                for m in range(int(xmin // 200) * 200, int(xmax) + 1, 200):
                    if xmin <= m <= xmax:
                        yy = y0 + PH - int(PH * (m - xmin) / (xmax - xmin))
                        d.line([x0 - 5, yy, x0, yy], fill=(60, 60, 60))
                        d.text((x0 - 56, yy - 8), f"{m:+d} m" if m else "0 m", font=f_s, fill=(40, 40, 40))
    pfad = PLOTS / f"detail_{sz}.png"
    bild.save(pfad, optimize=True)
    return pfad


if __name__ == "__main__":
    for sz, name in SZENARIEN:
        print(raumzeit(sz, name))
        print(detail(sz, name))
