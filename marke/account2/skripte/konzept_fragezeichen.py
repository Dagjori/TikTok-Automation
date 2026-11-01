"""Account 2 („Was wäre, wenn …“-POV): Bildmarke „Fragezeichen-Countdown“ (bpy 5.2).

Ein 3D-Fragezeichen aus glasierter Keramik steht in einem Countdown-Ring aus fünf Segmenten
(fünf Sekunden, die Uhr läuft): vier leuchten in Koralle, das erste ist schon abgelaufen.
Der Punkt des Fragezeichens ist eine kleine türkise Welt – das Gedankenexperiment.
Das Fragezeichen ist ein selbst konstruierter Strich mit runden Enden (keine Schrift),
wie das S im Simulierbar-Logo. Bausteine aus `marke/logo/skripte/gemeinsam.py`, damit beide
Marken dieselbe Material- und Lichtqualität haben.

Aufruf:  /home/user/.venv-blender/bin/python konzept_fragezeichen.py [-- --vorschau]
"""

import math
import os
import sys

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HIER, "..", "..", "logo", "skripte"))
import gemeinsam as g  # noqa: E402

ORDNER = os.path.join(HIER, "..", "logo")
NAME = "account2-logo-fragezeichen"

FARBE = {"koralle": "#FF4F5A", "abgelaufen": "#3B3F55", "tuerkis": "#2EC4B6"}

R = 1.62          # Radius der Ring-Mittellinie
RING = 0.30       # Ringbreite
LUECKE = 15.0     # Lücke zwischen den Segmenten (Grad)

# Fragezeichen (Mittellinie, vor der Skalierung)
BOGEN_M = (0.0, 0.42)   # Mittelpunkt des Bogens
BOGEN_R = 0.52
STRICH = 0.36           # Strichbreite
PUNKT_R = 0.22          # Radius der Welt (Punkt)
SKALA = 1.0


def ring_segmente(wurzel, m_an, m_aus):
    """Fünf Bogensegmente im Uhrzeigersinn ab 12 Uhr; Segment 0 ist abgelaufen."""
    for i in range(5):
        w0 = 90 - i * 72 - LUECKE / 2
        w1 = 90 - (i + 1) * 72 + LUECKE / 2
        n = 48
        pts = []
        for k in range(n + 1):
            w = math.radians(w0 + (w1 - w0) * k / n)
            pts.append((R * math.cos(w), R * math.sin(w)))
        umriss = g.strich_umriss(pts, RING)
        g.platte_aus_umriss(f"Segment{i}", [umriss], tiefe=0.10, fase=0.05, fase_aufloesung=6,
                            mat=m_aus if i == 0 else m_an, eltern=wurzel)


HALS_ENDE = (0.02, -0.30)  # Ende des schrägen Abstrichs


def frage_mittellinie(n=120):
    """Bogen von links (165°) über oben bis rechts unten (-45°), dann ein gerader, schräger
    Abstrich fast tangential (Knick 0,4°) bis HALS_ENDE. Rechnerisch geprüft: der Strich-Umriss
    überschneidet sich nirgends (enge Kurven erzeugen sonst Splitter in der Geometrie)."""
    cx, cy = BOGEN_M
    pts = []
    for k in range(n + 1):
        w = math.radians(165 - (165 + 45) * k / n)
        pts.append((cx + BOGEN_R * math.cos(w), cy + BOGEN_R * math.sin(w)))
    p0 = pts[-1]
    for k in range(1, 25):
        t = k / 24
        pts.append((p0[0] + (HALS_ENDE[0] - p0[0]) * t, p0[1] + (HALS_ENDE[1] - p0[1]) * t))
    return pts


def fragezeichen(wurzel, m_keramik, m_welt):
    pts = frage_mittellinie()
    punkt_y = HALS_ENDE[1] - STRICH / 2 - 0.20 - PUNKT_R
    oben = BOGEN_M[1] + BOGEN_R + STRICH / 2
    unten = punkt_y - PUNKT_R
    dy = -(oben + unten) / 2            # senkrecht mittig im Ring
    pts = [(x * SKALA, (y + dy) * SKALA) for x, y in pts]
    umriss = g.strich_umriss(pts, STRICH * SKALA)
    o = g.platte_aus_umriss("Frage", [umriss], tiefe=0.13, fase=0.08, fase_aufloesung=8,
                            mat=m_keramik, eltern=wurzel)
    g.kugel("Welt", PUNKT_R * SKALA, (HALS_ENDE[0] * SKALA, (punkt_y + dy) * SKALA, 0.0), m_welt, eltern=wurzel)
    return o


def baue():
    wurzel = g.logo_wurzel()
    m_an = g.kunststoff("Koralle", FARBE["koralle"])
    m_aus = g.material("Abgelaufen", FARBE["abgelaufen"], rauheit=0.55, lack=0.3, lack_rauheit=0.2)
    m_keramik = g.keramik("Porzellan")
    m_welt = g.material("Welt", FARBE["tuerkis"], rauheit=0.25, lack=1.0, lack_rauheit=0.03,
                        emission=FARBE["tuerkis"], emission_staerke=0.6)
    ring_segmente(wurzel, m_an, m_aus)
    fragezeichen(wurzel, m_keramik, m_welt)
    return wurzel


def szene(vorschau=False, aufloesung=2048, staerke=0.75):
    s = g.leere_szene(aufloesung=aufloesung, samples=32 if vorschau else 64)
    g.welt(unten="#0D0B16", oben="#3A3550")
    baue()
    groesse = 2 * R + RING
    g.kamera(abstand=g.abstand_fuer(groesse, 100, 0.80), azimut=-12, hoehe=9, brennweite=100)
    g.studio_licht(skala=1.0, staerke=staerke)
    g.kamera_einpassen(0.86)
    return s


if __name__ == "__main__":
    arg = g.argumente()
    szene(vorschau=arg["vorschau"], aufloesung=1024 if arg["vorschau"] else 2048)
    os.makedirs(ORDNER, exist_ok=True)
    if arg["vorschau"]:
        g.rendern(os.path.join(g.SCRATCH, "account2_vorschau.png"))
    else:
        g.speichern_und_exportieren(ORDNER, NAME)
        g.rendern(os.path.join(ORDNER, "roh-2048.png"))
