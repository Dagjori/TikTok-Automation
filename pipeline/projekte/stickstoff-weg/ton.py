"""Tonspur „Stickstoff weg“ (Referenzformat, keine Stimme): nur selbst erzeugte Atmo und Sounddesign (numpy, fester Seed).

Aufruf:  python3 projekte/stickstoff-weg/ton.py        → out/stickstoff-weg/ton.wav (stereo, 48 kHz)
         danach: TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/stickstoff-weg     (Lautheit −14 LUFS integriert)

Ablauf (docs/16 §12): leise Supermarkt-Atmo (Raumklang, Kühlregale, Stimmengewirr, Wagen, Scanner) → ab 30 s dünnt die Luft aus
(leiser, dumpfer), Rascheln der Tüten (39–46 s), Zischen und Sprudeln des Kaffees (ab 37,9 s), Grollen bis zum Höhepunkt (56,8 s),
Knall der Palette, Rückkehr der Luft (62–64,6 s), Ruhe, Abblende 70–72 s, leiser Abspann.
Der Luftdruck p(t) kommt aus derselben Kurve wie im Bild (zeiten.json).
"""
import json
import sys
from pathlib import Path

import numpy as np

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent.parent))
import klang as K  # noqa: E402  (Hilfsfunktionen: Filter, Hüllkurven)

SR = K.SR
ZT = json.loads((HIER / "zeiten.json").read_text(encoding="utf-8"))
DAUER = ZT["dauer"]
N = int(DAUER * SR)
RNG = np.random.default_rng(20261102)
TT = np.arange(N) / SR
P0, PR = 1013.25, 222.06


def inout_sine(x):
    return -(np.cos(np.pi * np.clip(x, 0, 1)) - 1) / 2


def f_kurve(t):
    """Anteil des Stickstoffs (1 → 0 → 1), wie in szene.js"""
    kn = ZT["fKnoten"]
    ts = np.array([k[0] for k in kn]); vs = np.array([k[1] for k in kn])
    out = np.empty_like(t)
    for i, tt in enumerate(t):
        if tt >= ZT["ueberleitung"]["rueck"]:
            x = np.clip((tt - ZT["ueberleitung"]["rueck"]) / ZT["rueckDauer"], 0, 1)
            out[i] = 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
        elif tt <= ts[0]:
            out[i] = vs[0]
        else:
            j = np.searchsorted(ts, tt)
            x = (tt - ts[j - 1]) / (ts[j] - ts[j - 1])
            out[i] = vs[j - 1] + (vs[j] - vs[j - 1]) * inout_sine(x)
    return out


GRID = np.arange(0, DAUER + 0.01, 0.01)
F = f_kurve(GRID)
LUFT = (PR + F * (P0 - PR)) / P0           # 1 … 0,22


def am(werte):                              # Kurve (100 Hz) → Audiorate
    return np.interp(TT, GRID, werte)


def stufe(a, b):
    x = np.clip((GRID - a) / (b - a), 0, 1)
    return x * x * (3 - 2 * x)


luft = am(LUFT)
ZB, ZK, ZC, ZR = (ZT["ueberleitung"][k] for k in ("boil", "klatsch", "crash", "rueck"))
koch_g = stufe(ZB, 52) * np.clip((0.3185 - F) / 0.3185, 0, 1)   # Siedeintensität wie im Bild (Kaffee 80 °C siedet ab p < 474 hPa)
koch = am(koch_g)


def rosa(n):
    x = RNG.standard_normal(n)
    return K.tiefpass_schnell(x, 2500) * 0.6 + K.tiefpass_schnell(RNG.standard_normal(n), 300) * 0.5


def stereo_rauschen(fn):
    return np.stack([fn(), fn()])


def hell_dunkel(sig, hell, dunkel_grenz=650):
    """Zeitvariabler Tiefpass: bei dünner Luft dumpfer (Mischung aus heller und dunkler Fassung)"""
    d = K.tiefpass_schnell(sig, dunkel_grenz)
    return sig * hell + d * (1 - hell)


# ---------- 1. Raumklang und Kühlregale ----------
ch = []
for c in range(2):
    raum = rosa(N) * 0.5
    brumm = (np.sin(2 * np.pi * 50 * TT + c) * 0.5 + np.sin(2 * np.pi * 100 * TT + 2 * c) * 0.25 + np.sin(2 * np.pi * 150.3 * TT) * 0.08) * 0.1
    kuehl = K.tiefpass_schnell(RNG.standard_normal(N), 700) * (0.22 + 0.12 * np.sin(2 * np.pi * 0.11 * TT + c))
    sig = hell_dunkel(raum + kuehl, np.clip(luft * 1.3, 0, 1)) + brumm * (0.6 + 0.4 * luft)
    ch.append(sig * (0.2 + 0.8 * luft ** 1.2))
raumklang = np.stack(ch)

# ---------- 2. Stimmengewirr (Murmeln) ----------
murmel = []
for c in range(2):
    r = K.bandpass_schnell(RNG.standard_normal(N), 220, 2400)
    mod = 0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 3.7 * TT + RNG.uniform(0, 6))) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.19 * TT + c))
    mod2 = 0.5 + 0.5 * K.tiefpass_schnell(np.abs(RNG.standard_normal(N)), 1.2) * 4
    murmel.append(r * mod * np.clip(mod2, 0.3, 1.4))
murmel = np.stack(murmel) * 0.55 * (luft ** 1.6)

# ---------- 3. Einkaufswagen (rollen), Scanner, Ansage-Gong ----------
ereig = np.zeros((2, N))


def einlegen(sig, t0, pan=0.0, gain=1.0):
    a = int(t0 * SR); b = min(N, a + len(sig))
    if a < 0 or a >= N:
        return
    ereig[0, a:b] += sig[: b - a] * gain * (1 - pan)
    ereig[1, a:b] += sig[: b - a] * gain * (1 + pan)


for _ in range(26):                          # Wagen rollen vorbei
    t0 = RNG.uniform(1, 66); d = RNG.uniform(1.2, 3.2); n = int((d + 0.3) * SR)
    r = K.bandpass_schnell(RNG.standard_normal(n), 90, 700) * K.huelle(n, 0.3, d / 2.2) * 0.5
    r += np.sin(2 * np.pi * np.cumsum(RNG.uniform(180, 260) + 40 * np.sin(2 * np.pi * RNG.uniform(3, 6) * np.arange(n) / SR)) / SR) * 0.02 * K.huelle(n, 0.3, d / 2.2)
    g = float(np.interp(t0, GRID, LUFT)) ** 1.4
    einlegen(r, t0, RNG.uniform(-0.6, 0.6), g * 0.8)
for _ in range(34):                          # Scanner-Piepser
    t0 = RNG.uniform(2, 52); n = int(0.09 * SR)
    b = np.sin(2 * np.pi * RNG.choice([2100, 2350, 1900]) * np.arange(n) / SR) * K.huelle(n, 0.002, 0.04)
    einlegen(b, t0, RNG.uniform(-0.7, 0.7), 0.12 * float(np.interp(t0, GRID, LUFT)) ** 2)
for t0 in (9.0, 23.0, 66.5):                 # sanfter Ansage-Gong
    n = int(2.2 * SR); t = np.arange(n) / SR
    g = (np.sin(2 * np.pi * 784 * t) + 0.5 * np.sin(2 * np.pi * 1568 * t)) * np.exp(-t * 2.2) + 0.9 * np.roll((np.sin(2 * np.pi * 659 * t) + 0.4 * np.sin(2 * np.pi * 1318 * t)) * np.exp(-t * 2.2), int(0.45 * SR))
    einlegen(g * 0.07, t0, 0.0, float(np.interp(t0, GRID, LUFT)) ** 1.5)
for _ in range(30):                          # Regal-Klappern, Dosen
    t0 = RNG.uniform(3, 40); n = int(0.12 * SR)
    k = K.bandpass_schnell(RNG.standard_normal(n), 900, 6000) * K.huelle(n, 0.001, 0.025)
    einlegen(k, t0, RNG.uniform(-0.8, 0.8), 0.18 * float(np.interp(t0, GRID, LUFT)) ** 1.5)

# ---------- 4. Rascheln der Tüten (Folie): Dichte steigt mit dem Zusammenfallen ----------
rasch = np.zeros((2, N))
rate = np.zeros(len(GRID))
rate += 4 * stufe(ZK - 1, ZK + 2) * (1 - stufe(ZK + 6, ZK + 9))
rate += 38 * stufe(ZK, ZK + 3) * (1 - stufe(ZK + 5, ZK + 9))
rate += 22 * stufe(ZC - 2.5, ZC) * (1 - stufe(ZC + 1.5, ZC + 4))
rate += 26 * stufe(ZR, ZR + 0.4) * (1 - stufe(ZR + 1.0, ZR + 3.4))
t = 0.0
while t < DAUER:
    r = np.interp(t, GRID, rate)
    if r > 0.5 and RNG.random() < r * 0.01:
        n = int(RNG.uniform(0.03, 0.16) * SR)
        c = K.bandpass_schnell(RNG.standard_normal(n), RNG.uniform(1500, 3500), RNG.uniform(5000, 11000)) * K.huelle(n, 0.0008, RNG.uniform(0.01, 0.04))
        einlegen(c, t, RNG.uniform(-0.8, 0.8), RNG.uniform(0.25, 0.9) * min(1.0, r / 20 + 0.3))
    t += 0.01

# ---------- 5. Kaffee: Zischen und Sprudeln ----------
zisch = np.stack([K.bandpass_schnell(RNG.standard_normal(N), 2500, 10500) for _ in range(2)]) * (koch ** 0.8 * 0.35)[None, :]
sprudel = np.zeros((2, N))
t = ZB
while t < ZR + 1.0:
    r = float(np.interp(t, GRID, koch_g))
    if RNG.random() < (3 + 70 * r ** 1.2) * 0.01 and r > 0.02:
        m = int(RNG.uniform(0.04, 0.09) * SR); f0 = RNG.uniform(200, 650)
        b = K.sinus_glide(m, f0, f0 * RNG.uniform(1.5, 2.6), 1.0) * K.huelle(m, 0.002, 0.02) * RNG.uniform(0.3, 0.9)
        a = int(t * SR)
        if a + m < N:
            p = RNG.uniform(-0.3, 0.3)
            sprudel[0, a:a + m] += b * (1 - p) * (0.15 + 0.4 * r); sprudel[1, a:a + m] += b * (1 + p) * (0.15 + 0.4 * r)
    t += 0.01

# ---------- 6. Grollen (tief), Höhepunkt, Rückkehr ----------
groll_hull = (stufe(48, ZC) * (1 - stufe(ZC + 0.4, ZC + 5.5)) ** 1.5)
groll = np.stack([K.tiefpass_schnell(RNG.standard_normal(N), 110) for _ in range(2)]) * 2.6
groll = groll * am(groll_hull)[None, :] * 1.1
groll += (np.sin(2 * np.pi * 37 * TT + 0.2 * np.sin(2 * np.pi * 0.7 * TT)) * 0.5)[None, :] * am(groll_hull)[None, :]
crash = np.zeros((2, N))
n = int(3.2 * SR); tc = np.arange(n) / SR
boom = K.sinus_glide(n, 95, 28, 0.5) * np.exp(-tc * 1.6) * 1.0 + K.tiefpass_schnell(RNG.standard_normal(n), 800) * np.exp(-tc * 3.0) * 0.8 + K.bandpass_schnell(RNG.standard_normal(n), 1500, 9000) * K.huelle(n, 0.001, 0.25) * 0.5
a = int(ZC * SR); crash[:, a:a + n] += boom[None, :n] * 1.25
for dt, g in ((-1.2, 0.35), (-0.5, 0.5), (0.5, 0.6), (1.1, 0.4)):    # Vorbeben und Nachbeben der Palette
    m = int(0.6 * SR); s = K.sinus_glide(m, 70, 35, 0.6) * K.huelle(m, 0.002, 0.15) + K.tiefpass_schnell(RNG.standard_normal(m), 900) * K.huelle(m, 0.001, 0.07) * 0.5
    a = int((ZC + dt) * SR); crash[:, a:a + m] += s[None, :] * g
rueck = np.zeros((2, N))                      # Luft kehrt zurück: Windstoß, dumpfer Schlag, Tüten-Plopp
n = int(3.4 * SR); tr = np.arange(n) / SR
wind = K.bandpass_schnell(RNG.standard_normal(n), 200, 5000) * np.sin(np.pi * np.clip(tr / 3.0, 0, 1)) ** 2 * 0.9
thump = K.sinus_glide(int(1.0 * SR), 80, 40, 0.5) * K.huelle(int(1.0 * SR), 0.004, 0.3) * 1.1
a = int(ZR * SR); rueck[:, a:a + n] += wind[None, :n]; rueck[:, a:a + len(thump)] += thump[None, :]
for k in range(16):                           # Tüten blasen sich auf (Plopp)
    t0 = ZR + 0.6 + RNG.uniform(0, 2.4); m = int(0.1 * SR); f = RNG.uniform(260, 520)
    p = K.sinus_glide(m, f * 0.8, f * 1.5, 0.8) * K.huelle(m, 0.002, 0.03) * RNG.uniform(0.4, 0.9)
    a = int(t0 * SR); pan = RNG.uniform(-0.7, 0.7)
    rueck[0, a:a + m] += p * (1 - pan) * 0.6; rueck[1, a:a + m] += p * (1 + pan) * 0.6
# Tür-/Schritt-Details im Nachspiel
for t0 in (66.0, 67.8, 69.2):
    m = int(0.2 * SR); s = K.bandpass_schnell(RNG.standard_normal(m), 120, 1400) * K.huelle(m, 0.002, 0.05)
    a = int(t0 * SR); ereig[:, a:a + m] += s[None, :] * 0.2

# ---------- Mischung und Gesamt-Lautstärkeverlauf ----------
mix = raumklang * 1.4 + murmel * 1.0 + ereig * 1.05 + rasch * 1.2 + zisch * 1.2 + sprudel * 1.2 + groll * 0.65 + crash * 0.65 + rueck * 1.0
# Gesamtverlauf (leise → Höhepunkt bei 55–65 s → leise im Abspann), vgl. Referenzen: Start −16…−24, Höhepunkt ≈ −10, Abspann −22…−30 LUFS
kn = [(0, 0.24), (4, 0.28), (30, 0.32), (40, 0.5), (50, 0.78), (55, 1.0), (58.5, 1.0), (61.5, 0.8), (64.5, 0.5), (70, 0.34), (72, 0.14), (80, 0.09)]
verlauf = np.interp(TT, [k[0] for k in kn], [k[1] for k in kn])
mix = mix * verlauf[None, :]
mix[:, :int(0.4 * SR)] *= np.linspace(0, 1, int(0.4 * SR))[None, :]       # kurzes Einblenden gegen Knacken
fade = np.clip((DAUER - TT) / 1.5, 0, 1)
mix *= fade[None, :]
# Weicher Begrenzer: Spitze 0,6 (−4,4 dBFS), Lautheit des Rohmixes ≈ −16,5 LUFS, damit mux.sh (alimiter 0,6 + loudnorm linear) auf −14 LUFS integriert kommt,
# ohne dynamisch zu komprimieren (Spitze − Lautheit ≤ 12,5 dB, wie bei den Referenzen).
import subprocess, tempfile


def messe(x):
    tmp = Path(tempfile.gettempdir()) / "ton_messung.wav"
    K.schreibe_wav(tmp, x[0], x[1])
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(tmp), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    import re
    return float(re.findall(r"I:\s*([-\d.]+) LUFS", r)[-1])


basis = mix / (np.max(np.abs(mix)) + 1e-9)
G = 3.0
for _ in range(7):
    roh = 0.6 * np.tanh(G * basis / 0.6)
    I = messe(roh)
    if abs(I + 16.5) < 0.12:
        break
    G *= 10 ** ((-16.5 - I) / 20 * 0.9)
mix = roh
print(f"Begrenzer: Verstärkung {G:.2f}, Roh-Lautheit {I:.1f} LUFS")
# Abspann: nur noch ein Hauch Raumton (72–80 s); Abblende 70–72 s ist im Verlauf enthalten
K.schreibe_wav(HIER.parent.parent / "out" / "stickstoff-weg" / "ton.wav", mix[0], mix[1])
print(f"ton.wav: {DAUER:.1f} s · Spitze {20 * np.log10(np.max(np.abs(mix)) + 1e-9):.1f} dBFS")
