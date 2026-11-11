"""Atmo-Spur ohne Stimme für Account 2 @stelldirvor.pov (Referenzformat, Skill .claude/skills/stelldirvor-video/ton.md).

Nur selbst erzeugte Klänge (numpy, fester Seed), keine fremden Dateien, keine Musik, keine Sprache.

Aufruf:  python3 atmo.py projekte/<name>                  → out/<name>/ton.wav (48 kHz, stereo)
         danach: TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>   (loudnorm linear auf −14 LUFS integriert)
         (gleichwertig: python3 klang.py projekte/<name> --atmo)

Eingaben
  projekte/<name>/ton.json   Tonplan: Schichten mit Pegelkurven, Ereignisse, „dumpf“ (Ohren zu), „stille“-Fenster
  out/<name>/ereignisse.json Ereignis-Protokoll der Szene (render.js). Mit "protokoll_effekte": true wird jeder Eintrag
                             {typ: "effekt", klang: "<name>"} an genau seiner Zeit vertont (klang: false = stumm).

ton.json (Beispiel: projekte/_demo-lunar-pov/ton.json)
  {"dauer": 80, "seed": 1,
   "schichten": [{"art": "wind", "pegel": [[0, -26], [60, -6], [80, -50]], "hell": [[0, 0.6], [61, 0.2]]}, …],
   "ereignisse": [{"t": 60.4, "art": "druckwelle", "pegel": 0}, …],
   "dumpf": [[0, 0], [60.4, 0], [61, 0.85]],          # 0 = offen, 1 = stark gedämpft (Tiefpass ≈ 500 Hz), nach Explosionen
   "stille": [[22, 53.5, -16]],                        # alle Schichten außer brummen/tinnitus in diesem Fenster um x dB leiser
   "protokoll_effekte": true}
  Pegel in dB (0 = Vollaussteuerung der normierten Quelle, ≤ −60 = aus), Kurven linear zwischen den Stützstellen.

Schichten: wind, voegel, stadt, dorf, meer, wasser, regen, feuer, grollen, brummen (f), tinnitus (f), raum
Ereignisse: druckwelle, einschlag, blitz, donner, glas, truemmer (dauer), fluegel, gischt, zischen, windstoss, grollen (dauer), tinnitus (dauer)

Lautheit (gemessen an den Referenzen): integriert −14,3 … −14,7 LUFS, LRA 9–18 LU; kurzzeitig Start −14 … −23, Höhepunkt −9 … −11
(bei 58–64 s), Abspann −18 … −32. Ausgabe hier: Lautheit ≈ −14 LUFS, LRA ≤ 19 LU, Spitzen begrenzt auf 0,78;
mux.sh mit TON_FERTIG (ohne Vorbegrenzer, loudnorm linear) korrigiert nur noch Zehntel. Den Verlauf (leise → laut → leise) machen die Pegelkurven in ton.json.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import klang as K  # noqa: E402  (Filter, Hüllkurven, WAV schreiben)

SR = K.SR


def kurve(punkte, tt, std=-60.0):
    """[[t, wert], …] → Werte je Abtastzeit (linear)"""
    if not punkte:
        return np.full_like(tt, std)
    p = np.array(punkte, dtype=float)
    return np.interp(tt, p[:, 0], p[:, 1])


def db_zu_lin(db):
    return np.where(db <= -59.9, 0.0, 10 ** (db / 20))


def norm(x, rms=0.1):
    r = np.sqrt(np.mean(x ** 2)) + 1e-12
    return x * (rms / r)


def rosa(n, rng):
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(rng.standard_normal(n)) / np.sqrt(np.maximum(f, 20))
    x = np.fft.irfft(X, n)
    return x / (np.abs(x).max() + 1e-9)


def braun(n, rng):
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(rng.standard_normal(n)) / np.maximum(f, 15)
    x = np.fft.irfft(X, n)
    return x / (np.abs(x).max() + 1e-9)


def langsam(n, rng, hz):
    """langsame positive Modulation 0..1 (Böen, Wellen)"""
    m = K.tiefpass_schnell(rng.standard_normal(n), hz)
    m = (m - m.min()) / (m.max() - m.min() + 1e-9)
    return m


def streuen(n, rate, rng, laenge, erzeuge, pan=True):
    """Poisson-verteilte kurze Klänge, stereo mit zufälligem Panorama"""
    out = np.zeros((2, n))
    t = 0.0
    while True:
        t += rng.exponential(1 / max(rate, 1e-6))
        if t >= n / SR:
            break
        m = int(laenge * SR)
        k = erzeuge(m, rng)
        a = int(t * SR)
        e = min(n, a + len(k))
        p = rng.uniform(-0.8, 0.8) if pan else 0
        out[0, a:e] += k[: e - a] * (1 - p) * 0.5
        out[1, a:e] += k[: e - a] * (1 + p) * 0.5
    return out


def stereo(fn, n):
    return np.stack([fn(), fn()])


# ------------------------------------------------------------------ Schichten (stereo, RMS ≈ 0,1)
def s_wind(n, rng, tt, o):
    hell = kurve(o.get("hell"), tt, 0.5)
    def kanal():
        r = rosa(n, rng)
        boe = 0.35 + 0.65 * langsam(n, rng, 0.15) ** 1.5
        dunkel = K.tiefpass_schnell(r, 380)
        klar = K.bandpass_schnell(r, 180, 4200)
        pfeif = K.bandpass_schnell(rng.standard_normal(n), 600, 1400) * 0.15 * langsam(n, rng, 0.3)
        return (dunkel * (1 - hell) + klar * hell + pfeif * hell) * boe
    return norm(stereo(kanal, n))


def s_voegel(n, rng, tt, o):
    dichte = o.get("dichte", 1.0)
    def lied(m, r):
        out = np.zeros(m)
        f0 = r.uniform(2400, 5600)
        k = int(r.integers(3, 9))
        for i in range(k):
            a = int((i * r.uniform(0.07, 0.14)) * SR)
            d = int(r.uniform(0.03, 0.09) * SR)
            if a + d >= m:
                break
            g = K.sinus_glide(d, f0 * r.uniform(0.85, 1.1), f0 * r.uniform(0.9, 1.35), r.uniform(0.5, 2))
            out[a:a + d] += g * K.huelle(d, 0.004, d / SR / 3) * r.uniform(0.4, 1)
        return out
    x = streuen(n, 1.6 * dichte, rng, 1.3, lied)
    return norm(x + 0.002 * rng.standard_normal((2, n)))


def s_stadt(n, rng, tt, o, gemurmel=0.6, verkehr=1.0):
    def kanal():
        brumm = K.tiefpass_schnell(rosa(n, rng), 260) * verkehr
        silben = langsam(n, rng, 4.0)
        murmel = K.bandpass_schnell(rng.standard_normal(n), 280, 1600) * (0.3 + 0.7 * silben) * gemurmel * 0.6
        return brumm + murmel
    x = stereo(kanal, n)
    vorbei = streuen(n, 0.12 * verkehr, rng, 6.0, lambda m, r: K.bandpass_schnell(r.standard_normal(m), 120, 2500) * np.sin(np.linspace(0, np.pi, m)) ** 2 * 0.8)
    return norm(x + vorbei)


def s_dorf(n, rng, tt, o):
    x = s_stadt(n, rng, tt, o, gemurmel=1.0, verkehr=0.35)
    schritte = streuen(n, 0.5, rng, 0.25, lambda m, r: K.bandpass_schnell(r.standard_normal(m), 300, 3000) * K.huelle(m, 0.002, 0.03) * 0.5)
    return norm(x + schritte)


def s_meer(n, rng, tt, o):
    def kanal():
        welle = 0.2 + 0.8 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.09 * tt + rng.uniform(0, 6))) ** 2
        return K.tiefpass_schnell(rosa(n, rng), 900) * welle + K.bandpass_schnell(rng.standard_normal(n), 1500, 9000) * welle ** 3 * 0.25
    return norm(stereo(kanal, n))


def s_wasser(n, rng, tt, o):
    def kanal():
        return K.bandpass_schnell(rng.standard_normal(n), 300, 5500) * (0.6 + 0.4 * langsam(n, rng, 6))
    return norm(stereo(kanal, n))


def s_regen(n, rng, tt, o):
    return norm(stereo(lambda: K.teppich_regen(n, rng), n))


def s_feuer(n, rng, tt, o):
    basis = stereo(lambda: K.tiefpass_schnell(braun(n, rng), 300) * (0.6 + 0.4 * langsam(n, rng, 1.5)), n)
    knistern = streuen(n, 18, rng, 0.02, lambda m, r: K.bandpass_schnell(r.standard_normal(m), 1500, 9000) * K.huelle(m, 0.0005, 0.004) * r.uniform(0.2, 1))
    return norm(basis + knistern * 0.8)


def s_grollen(n, rng, tt, o):
    def kanal():
        b = K.tiefpass_schnell(braun(n, rng), 95)
        sub = np.sin(2 * np.pi * np.cumsum(32 + 8 * langsam(n, rng, 0.3)) / SR) * 0.35
        return (b + sub) * (0.5 + 0.5 * langsam(n, rng, 1.2))
    return norm(stereo(kanal, n))


def s_brummen(n, rng, tt, o):
    f = o.get("f", 55)
    # optional "f_kurve": [[t, Hz], …] → Brummton, dessen Frequenz im Lauf der Zeit sinkt/steigt (Netzbrummen im Video zur Netzfrequenz)
    ph0 = 2 * np.pi * np.cumsum(kurve(o["f_kurve"], tt, f)) / SR if o.get("f_kurve") else 2 * np.pi * f * tt
    def kanal():
        p = rng.uniform(0, 6)
        x = sum(np.sin(ph0 * h * (1 + 0.003 * h) + p * h) / h ** 1.3 for h in (1, 2, 3, 4))
        return x * (0.8 + 0.2 * np.sin(2 * np.pi * 0.13 * tt + p)) + K.tiefpass_schnell(braun(n, rng), 120) * 0.5
    return norm(stereo(kanal, n))


def s_tinnitus(n, rng, tt, o):
    f = o.get("f", 600)
    x = np.sin(2 * np.pi * f * tt + 0.2 * np.sin(2 * np.pi * 0.4 * tt))
    return norm(np.stack([x, x * 0.96]))


def s_raum(n, rng, tt, o):
    return norm(stereo(lambda: K.tiefpass_schnell(rosa(n, rng), 500) + K.bandpass_schnell(rng.standard_normal(n), 1000, 4000) * 0.05, n))


SCHICHTEN = {"wind": s_wind, "voegel": s_voegel, "stadt": s_stadt, "dorf": s_dorf, "meer": s_meer, "wasser": s_wasser, "regen": s_regen,
             "feuer": s_feuer, "grollen": s_grollen, "brummen": s_brummen, "tinnitus": s_tinnitus, "raum": s_raum}
OFFEN = {"brummen", "tinnitus"}  # werden von „dumpf“ und „stille“ nicht erfasst (das hört man im Kopf)


# ------------------------------------------------------------------ Ereignisse (mono, Spitze ≈ 1)
def e_druckwelle(rng, d=6.0):
    m = int(d * SR); t = np.arange(m) / SR
    boom = K.sinus_glide(m, 85, 38, 0.45) * np.exp(-t / 1.5) * np.clip(t / 0.012, 0, 1) * 0.45   # tiefer Anteil maßvoll: frisst sonst die Aussteuerung
    koerper = K.tiefpass_schnell(braun(m, rng), 700) * np.exp(-t / 1.1) * 1.4
    knall = K.bandpass_schnell(rng.standard_normal(m), 1200, 9000) * np.exp(-t / 0.12) * 0.7
    sturm = K.bandpass_schnell(rng.standard_normal(m), 150, 3500) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 2.2) * 0.6
    x = boom + koerper + knall + sturm
    return x / (np.abs(x).max() + 1e-9)


def e_einschlag(rng, d=3.0):
    x = e_druckwelle(rng, d)
    return x * np.exp(-np.arange(len(x)) / SR / 0.9)


def e_blitz(rng, d=2.0):
    m = int(d * SR); t = np.arange(m) / SR
    x = K.sinus_glide(m, 58, 34, 0.6) * np.exp(-t / 0.5) * np.clip(t / 0.02, 0, 1) + K.bandpass_schnell(rng.standard_normal(m), 300, 3000) * np.sin(np.clip(t / d, 0, 1) * np.pi) ** 2 * 0.4
    return x / (np.abs(x).max() + 1e-9)


def e_donner(rng, d=4.0):
    m = int(d * SR); t = np.arange(m) / SR
    x = np.zeros(m)
    for k in range(5):
        a = rng.uniform(0, d * 0.5)
        x += K.tiefpass_schnell(braun(m, rng), rng.uniform(120, 300)) * np.exp(-np.maximum(t - a, 0) / rng.uniform(0.4, 1.0)) * (t >= a) * rng.uniform(0.4, 1)
    return x / (np.abs(x).max() + 1e-9)


def e_glas(rng, d=1.6):
    m = int(d * SR)
    x = np.zeros(m)
    for k in range(int(rng.integers(4, 8))):  # Risse: scharfe Klicks in den ersten 0,15 s
        a = int(rng.uniform(0, 0.15) * SR); q = int(0.006 * SR)
        x[a:a + q] += K.bandpass_schnell(rng.standard_normal(q), 2500, 12000)[: max(0, min(q, m - a))] * rng.uniform(0.5, 1)
    for k in range(int(rng.integers(10, 18))):  # Klirren: kurze hohe Töne
        a = int(rng.uniform(0.05, d * 0.7) * SR); q = int(rng.uniform(0.05, 0.25) * SR)
        if a + q >= m:
            continue
        x[a:a + q] += np.sin(2 * np.pi * rng.uniform(3500, 9000) * np.arange(q) / SR) * K.huelle(q, 0.001, q / SR / 4) * rng.uniform(0.1, 0.35)
    return x / (np.abs(x).max() + 1e-9)


def e_truemmer(rng, d=3.0):
    m = int(d * SR); t = np.arange(m) / SR
    x = np.zeros(m)
    n = int(14 * d)
    for k in range(n):
        a = rng.uniform(0, d) ** 1.6 / d ** 0.6
        q = int(rng.uniform(0.06, 0.3) * SR); i = int(a * SR)
        if i + q >= m:
            continue
        if rng.uniform() < 0.6:
            s = K.tiefpass_schnell(rng.standard_normal(q), rng.uniform(150, 500)) * K.huelle(q, 0.002, 0.06)
        else:
            s = K.bandpass_schnell(rng.standard_normal(q), 700, 4500) * K.huelle(q, 0.001, 0.03) * 0.6
        x[i:i + q] += s * np.exp(-a / (d * 0.5))
    return x / (np.abs(x).max() + 1e-9)


def e_fluegel(rng, d=1.6):
    m = int(d * SR)
    x = np.zeros(m)
    for k in range(int(d * 14)):
        a = int((k / 14 + rng.uniform(0, 0.03)) * SR); q = int(0.05 * SR)
        if a + q < m:
            x[a:a + q] += K.bandpass_schnell(rng.standard_normal(q), 250, 2500) * np.sin(np.linspace(0, np.pi, q)) * rng.uniform(0.4, 1) * (1 - a / m)
    return x / (np.abs(x).max() + 1e-9)


def e_rauschen(rng, d, unten, oben):
    m = int(d * SR)
    x = K.bandpass_schnell(rng.standard_normal(m), unten, oben) * np.sin(np.linspace(0, np.pi, m)) ** 2
    return x / (np.abs(x).max() + 1e-9)


def e_grollen(rng, d=4.0):
    m = int(d * SR)
    x = K.tiefpass_schnell(braun(m, rng), 90) * np.sin(np.linspace(0, np.pi, m)) ** 0.7
    return x / (np.abs(x).max() + 1e-9)


def e_tinnitus(rng, d=8.0, f=620):
    m = int(d * SR); t = np.arange(m) / SR
    x = np.sin(2 * np.pi * f * t) * np.clip(t / 0.6, 0, 1) * np.clip((d - t) / 2.5, 0, 1)
    return x


# Standardpegel der Einzelklänge (dB Spitze; Schichten: dB bezogen auf RMS 0,1) – abgestimmt mit der Demo: Alltag-Schichten −22 … −30 dB,
# Höhepunkt kurzzeitig ≈ 6–9 dB über dem Alltag (Referenzen: Start −14 … −23, Maximum −8,7 … −11 LUFS). Pfeifton bewusst leise.
EREIGNISSE = {
    "druckwelle": (e_druckwelle, -8), "einschlag": (e_einschlag, -10), "blitz": (e_blitz, -24), "donner": (e_donner, -26), "glas": (e_glas, -16),
    "truemmer": (e_truemmer, -16), "fluegel": (e_fluegel, -32), "gischt": (lambda r, d=2.0: e_rauschen(r, d, 900, 9000), -20),
    "zischen": (lambda r, d=1.5: e_rauschen(r, d, 3000, 11000), -28), "windstoss": (lambda r, d=3.0: e_rauschen(r, d, 200, 3000), -24),
    "grollen": (e_grollen, -16), "tinnitus": (e_tinnitus, -46),
}


# ------------------------------------------------------------------ Lautheit
def messen(x):
    """(integrierte Lautheit LUFS, Lautheitsumfang LRA LU) mit ffmpeg ebur128"""
    skal = max(1.0, np.abs(x).max() / 0.98)
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "m.wav"
        K.schreibe_wav(p, x[0] / skal, x[1] / skal)
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s*([-\d.]+) LUFS", r)[-1]) + 20 * np.log10(skal), float(re.findall(r"LRA:\s*([-\d.]+) LU", r)[-1])


def lufs(x):
    return messen(x)[0]


def kurzzeit(x):
    """Kurzzeit-Lautheit S (3-s-Fenster) je 0,1 s: (Zeiten, Werte)"""
    skal = max(1.0, np.abs(x).max() / 0.98)
    with tempfile.TemporaryDirectory() as d:
        p = Path(d) / "m.wav"
        K.schreibe_wav(p, x[0] / skal, x[1] / skal)
        r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    v = [(float(m.group(1)), float(m.group(2))) for z in r.splitlines() for m in [re.search(r"t:\s*([\d.]+)\s+TARGET.*?S:\s*([-\d.]+)", z)] if m]
    t = np.array([a for a, b in v]); s = np.array([b for a, b in v]) + 20 * np.log10(skal)
    return t, s


def verlauf_sichern(x, mindest_hoch=6.0, mindest_abspann=8.0):
    """Erzwingt den Lautheitsverlauf der Referenzen: Höhepunkt (52–68 s) mindestens mindest_hoch dB über dem Start (4–28 s),
    Abspann (73–79 s) mindestens mindest_abspann dB unter dem Start. Senkt dazu Alltag/Eskalation (bis 54 s) bzw. den Abspann ab."""
    t, s = kurzzeit(x)
    ok = s > -70
    start = s[(t >= 4) & (t < 28) & ok].mean(); hoch = s[(t >= 52) & (t <= 68) & ok].max(); absp = s[(t >= 73) & (t < 79) & ok].mean()
    tt = np.arange(x.shape[1]) / SR
    g = np.zeros_like(tt)
    if hoch - start < mindest_hoch:
        g -= (mindest_hoch - (hoch - start) + 0.5) * (1 - np.clip((tt - 52) / 3, 0, 1))
    if start - absp < mindest_abspann:
        g -= (mindest_abspann - (start - absp) + 0.5) * np.clip((tt - 70) / 2, 0, 1)
    return x * (10 ** (g / 20))[None, :], (round(start, 1), round(hoch, 1), round(absp, 1))


def umfang_begrenzen(x, ziel_lra=19.0, nur_bis=55.0):
    """Leise Abschnitte vor dem Höhepunkt (bis nur_bis s) sanft anheben (langsame Aufwärts-Kompression), bis der Lautheitsumfang
    ≤ ziel_lra ist. Höhepunkt, Nachspiel und Abspann bleiben unangetastet (der Verlauf leise → laut → leise kommt aus ton.json).
    Grund: mux.sh normalisiert mit loudnorm linear nur, wenn LRA ≤ LRA_ZIEL (20); sonst regelt loudnorm dynamisch und verfehlt −14 LUFS."""
    if messen(x)[1] <= ziel_lra:
        return x
    n = x.shape[1]
    m = (x[0] + x[1]) / 2
    fen = int(3 * SR)
    c = np.concatenate([[0.0], np.cumsum(m ** 2)])
    a = np.clip(np.arange(n) - fen // 2, 0, n); b = np.clip(np.arange(n) + fen // 2, 0, n)
    pegel = 10 * np.log10((c[b] - c[a]) / np.maximum(b - a, 1) + 1e-12)
    oben = np.percentile(pegel[pegel > pegel.max() - 40], 95)
    schutz = 1 - np.clip((np.arange(n) / SR - nur_bis) / 2, 0, 1)
    besser = x
    for staerke in (0.3, 0.45, 0.6, 0.75, 0.9):
        anheben = np.clip(oben - ziel_lra + 3 - pegel, 0, 15) * staerke * schutz
        anheben = K.tiefpass_schnell(anheben, 0.4)
        besser = x * (10 ** (anheben / 20))[None, :]
        if messen(besser)[1] <= ziel_lra:
            break
    return besser


def begrenzen(x, grenze=0.6, block=240, freigabe=0.08):
    """Spitzenbegrenzer mit Vorausschau (ein Block = 5 ms): Verstärkung je Block, schnelles Absenken, weiches Freigeben.
    Verhindert Übersteuerung bzw. Zwischenabtastwert-Spitzen, die beim harten Sättigen breitbandiger Knalle entstehen."""
    n = x.shape[1]
    nb = (n + block - 1) // block
    pad = np.zeros((2, nb * block)); pad[:, :n] = np.abs(x)
    spitze = pad.reshape(2, nb, block).max(axis=(0, 2))
    spitze = np.maximum(spitze, np.concatenate([spitze[1:], [0]]))          # Vorausschau um einen Block
    ziel = np.minimum(1.0, grenze / np.maximum(spitze, 1e-9))
    g = np.empty(nb); k = 1.0; a = np.exp(-block / SR / freigabe)
    for i in range(nb):
        k = ziel[i] if ziel[i] < k else ziel[i] + (k - ziel[i]) * a
        g[i] = k
    mitte = (np.arange(nb) + 0.5) * block
    return x * np.interp(np.arange(n), mitte, g)[None, :]


def weich_begrenzen(x, grenze=0.7):
    a = np.abs(x)
    knie = grenze * 0.6
    ueber = a > knie
    y = x.copy()
    y[ueber] = np.sign(x[ueber]) * (knie + (grenze - knie) * np.tanh((a[ueber] - knie) / (grenze - knie)))
    return y


def erzeuge(projekt, ziel_lufs=-14.0):
    projekt = Path(projekt).resolve()
    plan = json.loads((projekt / "ton.json").read_text(encoding="utf-8"))
    dauer = float(plan.get("dauer", 80))
    n = int(round(dauer * SR)); tt = np.arange(n) / SR
    rng = np.random.default_rng(int(plan.get("seed", 1)))
    mix = np.zeros((2, n)); offen = np.zeros((2, n))
    stille = np.ones(n)
    for von, bis, db in plan.get("stille", []):
        f = np.clip(np.minimum((tt - von) / 1.0, (bis - tt) / 1.0), 0, 1)
        stille *= 1 - f * (1 - 10 ** (db / 20))
    for s in plan.get("schichten", []):
        x = SCHICHTEN[s["art"]](n, rng, tt, s) * db_zu_lin(kurve(s.get("pegel"), tt))[None, :]
        if s["art"] in OFFEN:
            offen += x
        else:
            mix += x * stille[None, :]
    liste = list(plan.get("ereignisse", []))
    out = HIER / "out" / projekt.name
    if plan.get("protokoll_effekte") and (out / "ereignisse.json").exists():
        for e in json.loads((out / "ereignisse.json").read_text(encoding="utf-8")).get("ereignisse", []):
            if e.get("typ") == "effekt" and e.get("klang"):
                liste.append({"t": e["t"], "art": e["klang"], "dauer": e.get("dauer") or None, "staerke": e.get("staerke", 1)})
    arten = {}
    for e in liste:
        if e["art"] not in EREIGNISSE:
            print(f"Hinweis: unbekannter Klang „{e['art']}“ bei {e['t']:.2f} s – übersprungen")
            continue
        fn, std = EREIGNISSE[e["art"]]
        x = fn(rng, e["dauer"]) if e.get("dauer") else fn(rng)
        pegel = e.get("pegel", std + 20 * np.log10(max(e.get("staerke", 1), 1e-3)))
        x = x * 10 ** (pegel / 20)
        a = int(e["t"] * SR); b = min(n, a + len(x))
        if a >= n or b <= 0:
            continue
        p = float(e.get("pan", 0))
        ziel = offen if e["art"] == "tinnitus" else mix
        ziel[0, a:b] += x[: b - a] * (1 - p * 0.5); ziel[1, a:b] += x[: b - a] * (1 + p * 0.5)
        arten[e["art"]] = arten.get(e["art"], 0) + 1
    # dumpf: nach der Explosion „Ohren zu“ (Tiefpass), Brummen und Pfeifen bleiben klar
    d = np.clip(kurve(plan.get("dumpf"), tt, 0), 0, 1)
    if d.max() > 0:
        tief = np.stack([K.tiefpass_schnell(mix[0], 480), K.tiefpass_schnell(mix[1], 480)])
        mix = mix * (1 - d)[None, :] + tief * d[None, :]
    ges = umfang_begrenzen(mix + offen)
    ges = np.stack([K.bandpass_schnell(ges[0], 28, 16000), K.bandpass_schnell(ges[1], 28, 16000)])   # Unterschall weg (Handys geben ihn nicht wieder)
    # auf Ziel-Lautheit bringen; der Begrenzer (Decke 0,78 ≈ −2,2 dBFS) fängt nur die Spitzen des Höhepunkts.
    # Nur zweimal nachregeln – häufiges Begrenzen und Nachverstärken drückt den Verlauf platt (Höhepunkt ≈ Alltag).
    for _ in range(3):
        ges *= 10 ** ((ziel_lufs - lufs(ges)) / 20)
        ges = begrenzen(ges, 0.78)
        ges, werte = verlauf_sichern(ges)
    ges *= 10 ** ((ziel_lufs - lufs(ges)) / 20)
    ges = begrenzen(ges, 0.78)
    out.mkdir(parents=True, exist_ok=True)
    K.schreibe_wav(out / "ton.wav", ges[0], ges[1])
    I, lra = messen(ges)
    print(f"ton.wav: {dauer:.1f} s · Schichten {', '.join(s['art'] for s in plan.get('schichten', []))} · Ereignisse "
          f"{', '.join(f'{k} {v}' for k, v in sorted(arten.items()))} · Roh-Lautheit {I:.1f} LUFS, LRA {lra:.1f} LU, Spitze {np.abs(ges).max():.2f}")
    print(f"Weiter: TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/{projekt.name}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    erzeuge(sys.argv[1])
