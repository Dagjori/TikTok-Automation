"""Tonspur eines Projekts: Stimme + selbst erzeugte Soundeffekte + leiser Klangteppich (alles synthetisch).

Aufruf:  python3 pipeline/klang.py <projektordner> [--ohne-musik] [--ohne-sfx] [--ohne-stimme]
Liest:   pipeline/out/<projekt>/ereignisse.json   (schreibt render.js: Dauer und Klang-Ereignisse der Szene)
         <projekt>/audio/stimme.mp3                (falls vorhanden, wird per ffmpeg dekodiert)
Schreibt:pipeline/out/<projekt>/ton.wav            (48 kHz, Stereo, noch nicht lautheitsnormalisiert)

Keine fremden Audiodateien: Effekte und Musik werden hier mit numpy erzeugt (deterministisch, fester Seed).
"""
import json
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
RNG = np.random.default_rng(7)


# ---------------------------------------------------------------- Hilfen
def zeit(n):
    return np.arange(n) / SR


def huelle(n, angriff=0.004, abfall=0.12):
    t = zeit(n)
    a = np.clip(t / max(angriff, 1e-4), 0, 1)
    return a * np.exp(-t / abfall)


def tiefpass_schnell(x, grenz):
    """Tiefpass per FFT (für lange Signale)"""
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    X *= 1 / np.sqrt(1 + (f / grenz) ** 4)
    return np.fft.irfft(X, n)


def bandpass_schnell(x, unten, oben):
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(x)
    X *= (1 / np.sqrt(1 + (unten / np.maximum(f, 1)) ** 4)) * (1 / np.sqrt(1 + (f / oben) ** 4))
    return np.fft.irfft(X, n)


def sinus_glide(n, f0, f1, kurve=1.0):
    t = np.linspace(0, 1, n) ** kurve
    f = f0 + (f1 - f0) * t
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


# ---------------------------------------------------------------- Effekte (mono, Spitze ≈ 1)
def pop():
    n = int(0.12 * SR)
    s = sinus_glide(n, 900, 380, 0.6) * huelle(n, 0.002, 0.045)
    klick = RNG.standard_normal(n) * huelle(n, 0.0005, 0.004) * 0.3
    return s + klick


def weg():
    n = int(0.1 * SR)
    return sinus_glide(n, 420, 820, 1.2) * huelle(n, 0.004, 0.03) * 0.5


def schlag():
    n = int(0.35 * SR)
    tief = sinus_glide(n, 120, 45, 0.5) * huelle(n, 0.002, 0.12)
    rauschen = tiefpass_schnell(RNG.standard_normal(n), 2500) * huelle(n, 0.001, 0.03) * 0.8
    return tief + rauschen


def whoosh(dauer):
    n = int(max(0.3, dauer + 0.25) * SR)
    r = RNG.standard_normal(n)
    # Sweep: erst tief, dann hell, dann wieder weg
    t = np.linspace(0, 1, n)
    hell = bandpass_schnell(r, 1500, 7000)
    dunkel = bandpass_schnell(r, 150, 1200)
    mix = dunkel * (1 - t) + hell * t
    env = np.sin(np.pi * np.clip(t, 0, 1)) ** 2
    return mix * env * 1.6


def tick():
    n = int(0.03 * SR)
    return np.sin(2 * np.pi * 2400 * zeit(n)) * huelle(n, 0.0005, 0.006)


def zaehlen(dauer):
    n = int((dauer + 0.1) * SR)
    out = np.zeros(n)
    k = 22
    for i in range(k):
        # Ticks folgen dem Ease-out des Zählers: anfangs dicht, dann seltener
        p = i / k
        t = dauer * (-np.log2(1 - p * 0.999) / 10)
        s = int(t * SR)
        tk = tick() * (0.6 + 0.4 * (1 - p))
        out[s:s + len(tk)] += tk[: max(0, n - s)]
    return out


def ding():
    n = int(0.9 * SR)
    t = zeit(n)
    s = np.sin(2 * np.pi * 1318.5 * t) + 0.45 * np.sin(2 * np.pi * 2637 * t) + 0.2 * np.sin(2 * np.pi * 3955 * t)
    return s * huelle(n, 0.002, 0.25) * 0.55


def klick():
    n = int(0.05 * SR)
    return (np.sin(2 * np.pi * 1700 * zeit(n)) * huelle(n, 0.0005, 0.01) + RNG.standard_normal(n) * huelle(n, 0.0002, 0.002) * 0.3) * 0.7


def muenze():
    n = int(0.35 * SR)
    t = zeit(n)
    f = 2600 * (1 + RNG.uniform(-0.12, 0.12))
    s = sum(a * np.sin(2 * np.pi * f * m * t + RNG.uniform(0, 6)) for m, a in [(1, 1), (1.47, 0.7), (2.09, 0.5), (2.71, 0.3)])
    return s * huelle(n, 0.0008, 0.07) * 0.4


def rumpeln(dauer):
    n = int((dauer + 0.4) * SR)
    r = tiefpass_schnell(RNG.standard_normal(n), 140)
    t = np.linspace(0, 1, n)
    env = np.clip(t * 6, 0, 1) * np.clip((1 - t) * 4, 0, 1)
    out = r / (np.abs(r).max() + 1e-9) * env * 0.8
    # kleine „Stapel“-Klacks, beschleunigend
    for i in range(30):
        p = (i / 30) ** 0.78
        s = int(p * dauer * SR)
        m = int(0.04 * SR)
        k = bandpass_schnell(RNG.standard_normal(m), 600, 3500) * huelle(m, 0.0005, 0.008) * 0.5
        out[s:s + m] += k[: max(0, n - s)]
    return out


def scan(dauer):
    n = int((dauer + 0.2) * SR)
    t = np.linspace(0, 1, n)
    s = sinus_glide(n, 300, 1500, 1.4) * (0.6 + 0.4 * np.sin(2 * np.pi * 18 * t * dauer))
    return s * np.sin(np.pi * t) ** 1.5 * 0.35


def blip(laut=0.5):
    n = int(0.08 * SR)
    return np.sin(2 * np.pi * 1250 * zeit(n)) * huelle(n, 0.002, 0.02) * laut * 0.6


def boom():
    n = int(1.0 * SR)
    tief = sinus_glide(n, 85, 38, 0.6) * huelle(n, 0.004, 0.35)
    luft = tiefpass_schnell(RNG.standard_normal(n), 900) * huelle(n, 0.002, 0.08) * 0.4
    return tief + luft


EFFEKTE = {
    "pop": lambda e: pop() * 0.7,
    "weg": lambda e: weg() * 0.5,
    "schlag": lambda e: schlag() * 0.8,
    "whoosh": lambda e: whoosh(e.get("dauer", 0.8)) * 0.55,
    "zaehlen": lambda e: zaehlen(e.get("dauer", 1.0)) * 0.45,
    "ding": lambda e: ding() * 0.45,
    "klick": lambda e: klick() * 0.6,
    "muenze": lambda e: muenze() * 0.6,
    "rumpeln": lambda e: rumpeln(e.get("dauer", 3.0)) * 0.5,
    "scan": lambda e: scan(e.get("dauer", 1.5)) * 0.6,
    "blip": lambda e: blip(e.get("lautstaerke", 0.5)),
    "boom": lambda e: boom() * 0.9,
}


# ---------------------------------------------------------------- Klangteppich
def klangteppich(dauer, bpm=96, n=None):
    """Weicher Pad-Akkord plus leises Arpeggio (Fmaj7 → Am7 → Dm9 → Bbmaj7), 4 Takte je Akkord."""
    n = n or int(round(dauer * SR))
    t = zeit(n)
    takt = 60 / bpm * 4
    akkorde = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 57, 60, 65], [46, 53, 57, 62]]
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    pad = np.zeros(n)
    for i, ak in enumerate(akkorde * 10):
        a = int(i * 2 * takt * SR)
        if a >= n:
            break
        b = min(n, int((i + 1) * 2 * takt * SR) + int(0.8 * SR))
        seg = np.arange(b - a) / SR
        env = np.clip(seg / 0.8, 0, 1) * np.clip((b - a) / SR - seg, 0, 0.8) / 0.8
        for m in ak:
            for verstimm in (-0.12, 0.12):
                f = hz(m) * 2 ** (verstimm / 12)
                pad[a:b] += (np.sin(2 * np.pi * f * seg) + 0.25 * np.sin(4 * np.pi * f * seg)) * env * 0.08
    pad = tiefpass_schnell(pad, 1800)
    # Arpeggio in Achteln
    arp = np.zeros(n)
    achtel = 60 / bpm / 2
    k = 0
    while k * achtel < dauer:
        s = int(k * achtel * SR)
        ak = (akkorde * 10)[int(k * achtel / (2 * takt))]
        m = ak[[0, 2, 1, 3, 2, 1, 3, 2][k % 8]] + 12
        ln = int(0.32 * SR)
        seg = np.arange(ln) / SR
        ton = np.sin(2 * np.pi * hz(m) * seg) * np.exp(-seg / 0.11) * np.clip(seg / 0.004, 0, 1)
        e = min(n, s + ln)
        arp[s:e] += ton[: e - s] * 0.22
        k += 1
    arp = tiefpass_schnell(arp, 3500)
    musik = pad + arp
    # Ein- und Ausblenden
    fade = np.clip(t / 1.2, 0, 1) * np.clip((dauer - t) / 1.5, 0, 1)
    return musik * fade


# ---------------------------------------------------------------- Ein-/Ausgabe
def lade_stimme(pfad, n):
    roh = subprocess.run(["ffmpeg", "-v", "error", "-i", str(pfad), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    s = np.frombuffer(roh, dtype=np.float32).astype(np.float64)
    out = np.zeros(n)
    out[: min(n, len(s))] = s[:n]
    return out


def schreibe_wav(pfad, links, rechts):
    daten = np.stack([links, rechts], axis=1)
    spitze = np.abs(daten).max()
    if spitze > 0.99:
        daten = daten / spitze * 0.99
    pcm = (daten * 32767).astype("<i2")
    with wave.open(str(pfad), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def main():
    projekt = Path(sys.argv[1]).resolve()
    args = sys.argv[2:]
    wurzel = Path(__file__).resolve().parent
    out = wurzel / "out" / projekt.name
    meta = json.loads((out / "ereignisse.json").read_text(encoding="utf-8"))
    dauer = float(meta["dauer"])
    n = int(round(dauer * SR))

    sfx = np.zeros((2, n))
    if "--ohne-sfx" not in args:
        for i, e in enumerate(meta.get("klang", [])):
            f = EFFEKTE.get(e["typ"])
            if not f or e["t"] < 0 or e["t"] >= dauer:
                continue
            s = f(e)
            a = int(e["t"] * SR)
            b = min(n, a + len(s))
            pan = ((i * 0.37) % 1 - 0.5) * 0.5  # leichte Stereo-Verteilung
            sfx[0, a:b] += s[: b - a] * (1 - pan)
            sfx[1, a:b] += s[: b - a] * (1 + pan)

    musik = np.zeros(n) if "--ohne-musik" in args else klangteppich(dauer, n=n)

    stimme_pfad = projekt / "audio" / "stimme.mp3"
    stimme = lade_stimme(stimme_pfad, n) if stimme_pfad.exists() else np.zeros(n)
    stimme_im_mix = 0.0 if "--ohne-stimme" in args else 1.0  # nur für Pegelkontrollen

    # Ducking: Musik leiser, wenn gesprochen wird (Hüllkurve der Stimme, geglättet)
    if np.any(stimme):
        env = tiefpass_schnell(np.abs(stimme), 4)
        env = env / (np.percentile(env, 95) + 1e-9)
        duck = 1 - 0.55 * np.clip(env, 0, 1)
    else:
        duck = np.ones(n)

    # Pegel: Stimme führt, Effekte dezent, Musik leise (relativ zur Stimme)
    ref = rms_db(stimme[np.abs(stimme) > 1e-4]) if np.any(stimme) else -20.0
    def auf(x, ziel_db):
        aktiv = x[np.abs(x) > 1e-5]
        if len(aktiv) == 0:
            return x
        return x * 10 ** ((ziel_db - rms_db(aktiv)) / 20)

    musik = auf(musik, ref - 13) * duck
    sfx_mono = sfx.sum(axis=0) / 2
    faktor = 10 ** (((ref - 12) - rms_db(sfx_mono[np.abs(sfx_mono) > 1e-5])) / 20) if np.any(sfx_mono) else 1
    sfx *= faktor
    links = stimme * stimme_im_mix + musik * 0.95 + sfx[0]
    rechts = stimme * stimme_im_mix + musik * 1.05 + sfx[1]
    schreibe_wav(out / "ton.wav", links, rechts)
    print(f"ton.wav: {dauer:.2f} s · Stimme {'ja' if np.any(stimme) else 'nein'} · {len(meta.get('klang', []))} Effekte")


if __name__ == "__main__":
    main()
