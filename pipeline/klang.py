"""Tonspur eines Projekts: Stimme + selbst erzeugte Soundeffekte + Klangteppich (alles synthetisch, keine fremden Dateien).

Aufruf:  python3 pipeline/klang.py <projektordner> [--teppich regen|wasser|meer|strasse|nacht|raum|musik|keiner]
                                   [--teppich-db -10] [--ohne-musik] [--ohne-sfx] [--ohne-stimme]
Liest:   <projekt>/audio/ereignisse.json   (schreibt render.js: Dauer, Ereignis-Protokoll der Bausteine, Klang-Extras;
                                            Ersatz: pipeline/out/<projekt>/ereignisse.json)
         <projekt>/audio/stimme.mp3        (falls vorhanden, wird per ffmpeg dekodiert)
         <projekt>/skript.json             ("klangteppich": Thema des Teppichs, falls die Szene keinen setzt)
Schreibt:pipeline/out/<projekt>/ton.wav    (48 kHz, Stereo, noch nicht lautheitsnormalisiert; mux.sh macht −14 LUFS)

Maßstab (docs/15 §7, §12): Unter der Stimme liegt immer ein Klangteppich passend zum Thema, in Sprechpausen ca. 10 dB
leiser als die Stimme (Vorbilder 8–13 dB). Jedes Bild-Ereignis bekommt einen kurzen Effekt (Pop, Wisch, Tick, Ding,
Zähler-Ticken, Stempel-Aufprall), die Pointe einen Akzent-Klang. Effekte kommen automatisch aus dem Ereignis-Protokoll:
jedes Ereignis trägt "klang" (Name, false = stumm) oder bekommt ihn über seinen Typ (AUTO unten).
Der Teppich ist schleifenfest: sein Ende blendet in den Anfang über (Video-Schleife ohne Sprung im Ton).
Alles deterministisch (fester Seed).
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
def pop(f=1.0):
    n = int(0.12 * SR)
    s = sinus_glide(n, 900 * f, 380 * f, 0.6) * huelle(n, 0.002, 0.045)
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
    dauer = min(dauer, 2.5)
    n = int((dauer + 0.1) * SR)
    out = np.zeros(n)
    k = int(np.clip(dauer * 14, 6, 34))
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


def stempel():
    """Aufprall: tiefer Schlag + Geräuschstoß + kurzer Klack + kleiner Raum"""
    n = int(0.6 * SR)
    t = zeit(n)
    tief = sinus_glide(n, 95, 38, 0.4) * huelle(n, 0.001, 0.14) * 1.2
    stoss = bandpass_schnell(RNG.standard_normal(n), 180, 4200) * huelle(n, 0.0005, 0.045) * 0.9
    klack = (np.sin(2 * np.pi * 1250 * t) + 0.6 * np.sin(2 * np.pi * 2730 * t)) * huelle(n, 0.0004, 0.018) * 0.5
    raum = tiefpass_schnell(RNG.standard_normal(n), 2500) * huelle(n, 0.02, 0.22) * 0.12
    return tief + stoss + klack + raum


def akzent():
    """Tonaler Akzent auf der Pointe: heller Dur-Klang mit langem Nachhall und weichem Tiefton"""
    n = int(2.2 * SR)
    t = zeit(n)
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    s = np.zeros(n)
    for i, (m, a) in enumerate([(72, 1.0), (76, 0.8), (79, 0.7), (84, 0.45), (88, 0.25)]):
        f = hz(m)
        s += a * (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2.01 * f * t)) * huelle(n, 0.003 + i * 0.012, 0.75)
    sub = np.sin(2 * np.pi * hz(48) * t) * np.clip(t / 0.05, 0, 1) * np.exp(-t / 0.5) * 0.8
    glanz = bandpass_schnell(RNG.standard_normal(n), 5000, 12000) * huelle(n, 0.05, 0.4) * 0.08
    return (s * 0.32 + sub + glanz) * 0.8


def sieg():
    """Sieger: kurzes aufsteigendes Arpeggio"""
    n = int(1.1 * SR)
    out = np.zeros(n)
    hz = lambda m: 440 * 2 ** ((m - 69) / 12)
    for i, m in enumerate([76, 81, 85, 88]):
        a = int(i * 0.075 * SR)
        k = n - a
        tt = zeit(k)
        out[a:] += (np.sin(2 * np.pi * hz(m) * tt) + 0.35 * np.sin(4 * np.pi * hz(m) * tt)) * huelle(k, 0.002, 0.28) * (0.7 + 0.1 * i)
    return out * 0.45


def uhr(dauer):
    """Uhr läuft: Tick-Tack, 6 pro Sekunde, nach 2 s leiser"""
    n = int((dauer + 0.1) * SR)
    out = np.zeros(n)
    k = 0
    while k / 6 < dauer:
        a = int(k / 6 * SR)
        f = 3100 if k % 2 == 0 else 2350
        m = int(0.025 * SR)
        tk = np.sin(2 * np.pi * f * zeit(m)) * huelle(m, 0.0004, 0.004) + RNG.standard_normal(m) * huelle(m, 0.0002, 0.0015) * 0.25
        laut = 1.0 if k / 6 < 2 else max(0.35, 1 - (k / 6 - 2) * 0.3)
        e = min(n, a + m)
        out[a:e] += tk[: e - a] * laut
        k += 1
    return out


def wachsen(dauer=0.6):
    """Balken wächst: aufsteigender Wisch mit Ton"""
    n = int((dauer + 0.15) * SR)
    t = np.linspace(0, 1, n)
    r = RNG.standard_normal(n)
    luft = bandpass_schnell(r, 800, 6000) * t * 0.5
    ton = sinus_glide(n, 280, 880, 0.8) * 0.4
    env = np.clip(t * 5, 0, 1) * np.clip((1 - t) * 6, 0, 1)
    return (luft + ton) * env


def folgen():
    """Folgen-Aufruf: freundliches Zwei-Ton-Pling"""
    n = int(0.6 * SR)
    out = np.zeros(n)
    for i, f in enumerate([1318.5, 1760.0]):
        a = int(i * 0.09 * SR)
        k = n - a
        tt = zeit(k)
        out[a:] += (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(4 * np.pi * f * tt)) * huelle(k, 0.002, 0.16)
    return out * 0.5


def wolke(dauer=1.0):
    """Wolkenwand: weiches, luftiges Rauschen, das an- und abschwillt"""
    n = int((dauer + 0.4) * SR)
    t = np.linspace(0, 1, n)
    r = tiefpass_schnell(RNG.standard_normal(n), 2200) + bandpass_schnell(RNG.standard_normal(n), 3000, 9000) * 0.25
    return r * np.sin(np.pi * t) ** 2 * 0.9


def blasen(dauer=0.7):
    """Blasen: viele kurze aufsteigende Plopp-Töne"""
    n = int((dauer + 0.3) * SR)
    out = np.zeros(n)
    for i in range(14):
        a = int((i / 14) ** 0.8 * dauer * SR)
        m = int(0.06 * SR)
        f0 = 380 + RNG.uniform(0, 500)
        b = sinus_glide(m, f0, f0 * 2.6, 0.6) * huelle(m, 0.002, 0.02)
        e = min(n, a + m)
        out[a:e] += b[: e - a] * (0.5 + 0.5 * RNG.uniform())
    return out * 0.7


def rueck(dauer=1.5):
    """Schleife: rückwärts anschwellender Wisch (wie zurückgespult)"""
    n = int((dauer + 0.1) * SR)
    t = np.linspace(0, 1, n)
    r = RNG.standard_normal(n)
    hell = bandpass_schnell(r, 2000, 9000)
    dunkel = bandpass_schnell(r, 200, 1500)
    env = t ** 2.2 * np.clip((1 - t) * 25, 0, 1)
    return (hell * t + dunkel * (1 - t)) * env * 1.1


def zoom():
    n = int(0.45 * SR)
    t = np.linspace(0, 1, n)
    return bandpass_schnell(RNG.standard_normal(n), 400, 3500) * np.sin(np.pi * t) ** 2 * 0.6


EFFEKTE = {
    "pop": lambda e: pop(e.get("_tonhoehe", 1.0)) * 0.7,
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
    "stempel": lambda e: stempel() * 0.9,
    "akzent": lambda e: akzent(),
    "sieg": lambda e: sieg(),
    "uhr": lambda e: uhr(min(e.get("dauer", 1.0), 6.0)) * 0.3,
    "wachsen": lambda e: wachsen(e.get("dauer", 0.6)) * 0.5,
    "folgen": lambda e: folgen(),
    "wolke": lambda e: wolke(e.get("dauer", 1.0)) * 0.6,
    "blasen": lambda e: blasen(e.get("dauer", 0.7)),
    "rueck": lambda e: rueck(min(e.get("dauer", 1.5), 2.5)) * 0.5,
    "zoom": lambda e: zoom() * 0.45,
    "tick": lambda e: tick() * 0.6,
}

# Bild-Ereignis (Typ im Protokoll) → Effekt, falls das Ereignis keinen eigenen "klang" mitbringt
AUTO = {
    "titel": "klick", "tafel": "pop", "fuehrung": "ding", "zaehler": "zaehlen", "zaehler-ein": "pop", "uhr": "uhr",
    "uhr-ein": "pop", "ring": "uhr", "ring-ende": "ding", "chip": "pop", "stempel": "stempel", "marke": "tick",
    "leiste": "pop", "formel": "pop", "bilanz": "klick", "sieger": "sieg", "balken": "wachsen", "balken-tag": "pop",
    "pointe": "akzent", "folgen": "folgen", "uebergang": "whoosh", "schleife": "rueck", "element": None,
    "kamera": None, "untertitel": None,
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
    # kurzes Einblenden (sonst Knacksen); das Ende übernimmt die Schleifen-Überblendung in erzeuge_teppich()
    fade = np.clip(t / 0.05, 0, 1)
    return musik * fade


def _rosa(n, rng):
    """rosa Rauschen (1/f) per FFT"""
    f = np.fft.rfftfreq(n, 1 / SR)
    X = np.fft.rfft(rng.standard_normal(n))
    X /= np.sqrt(np.maximum(f, 20))
    x = np.fft.irfft(X, n)
    return x / (np.abs(x).max() + 1e-9)


def _ereignisse(n, rate, rng, laenge, erzeuge):
    """Poisson-artig verteilte kurze Klänge (deterministisch)"""
    out = np.zeros(n)
    t = 0.0
    dauer = n / SR
    while True:
        t += rng.exponential(1 / rate)
        if t >= dauer:
            break
        a = int(t * SR)
        m = int(laenge * SR)
        k = erzeuge(m, rng)
        e = min(n, a + m)
        out[a:e] += k[: e - a]
    return out


def teppich_regen(n, rng):
    rauschen = bandpass_schnell(_rosa(n, rng), 350, 9000)
    tropfen = _ereignisse(n, 55, rng, 0.03, lambda m, r: bandpass_schnell(r.standard_normal(m), 1500 + r.uniform(0, 3000), 9000) * huelle(m, 0.0005, 0.004) * r.uniform(0.2, 1))
    welle = 1 + 0.15 * np.sin(2 * np.pi * zeit(n) / 7.3)
    return rauschen * welle + tropfen * 0.35


def teppich_wasser(n, rng):
    fluss = bandpass_schnell(_rosa(n, rng), 250, 4500)
    t = zeit(n)
    mod = 1 + 0.25 * np.sin(2 * np.pi * t * 0.37) * np.sin(2 * np.pi * t * 0.11 + 1)
    blubb = _ereignisse(n, 16, rng, 0.05, lambda m, r: sinus_glide(m, 500 + r.uniform(0, 700), 1400 + r.uniform(0, 900), 0.7) * huelle(m, 0.002, 0.015) * r.uniform(0.2, 0.8))
    return fluss * mod + blubb * 0.25


def teppich_meer(n, rng):
    t = zeit(n)
    grund = tiefpass_schnell(_rosa(n, rng), 900)
    periode = 7.5
    phase = (t % periode) / periode
    welle = 0.35 + 0.65 * np.sin(np.pi * np.clip(phase * 1.15, 0, 1)) ** 2
    gischt = bandpass_schnell(rng.standard_normal(n), 2500, 9000) * np.clip(np.sin(np.pi * np.clip((phase - 0.25) * 2.2, 0, 1)), 0, 1) ** 3
    return grund * welle + gischt * 0.18


def teppich_strasse(n, rng):
    """Straße/Nachtfahrt: tiefes Rollen, Motorbrummen, ab und zu ein vorbeifahrendes Auto"""
    t = zeit(n)
    rollen = tiefpass_schnell(_rosa(n, rng), 420)
    f = 58 + 3 * np.sin(2 * np.pi * t * 0.13)
    brumm = tiefpass_schnell(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.3, 260)
    vorbei = np.zeros(n)
    k = 0.0
    while True:
        k += rng.uniform(3.5, 7.0)
        if k >= n / SR:
            break
        a = int(k * SR)
        m = int(2.2 * SR)
        tt = np.linspace(0, 1, m)
        w = bandpass_schnell(rng.standard_normal(m), 300, 2600) * np.exp(-((tt - 0.5) / 0.18) ** 2)
        e = min(n, a + m)
        vorbei[a:e] += w[: e - a] * 0.6
    return rollen + brumm * 0.5 + vorbei


def teppich_raum(n, rng):
    return tiefpass_schnell(_rosa(n, rng), 2600) * 0.7 + tiefpass_schnell(rng.standard_normal(n), 120) * 0.3


TEPPICHE = {
    "regen": teppich_regen, "wasser": teppich_wasser, "meer": teppich_meer, "strasse": teppich_strasse,
    "nacht": teppich_strasse, "nachtfahrt": teppich_strasse, "raum": teppich_raum,
}


def erzeuge_teppich(art, dauer, n):
    """Teppich der Art erzeugen, schleifenfest (das letzte Stück blendet in den Anfang über)"""
    if art in (None, "", "keiner", "aus"):
        return np.zeros(n)
    ueber = int(min(1.5, dauer * 0.15) * SR)
    m = n + ueber
    rng = np.random.default_rng(1234)
    if art == "musik":
        x = klangteppich(m / SR, n=m)
        # klangteppich blendet selbst ein/aus; für die Schleife ohne Blende neu zusammensetzen
    elif art in TEPPICHE:
        x = TEPPICHE[art](m, rng)
    else:
        raise SystemExit(f"Unbekannter Klangteppich „{art}“. Möglich: {', '.join(sorted(set(TEPPICHE) | {'musik', 'keiner'}))}")
    x = x[:m]
    if ueber > 0:
        k = np.linspace(0, 1, ueber)
        kopf = x[:ueber] * np.sqrt(k) + x[n:n + ueber] * np.sqrt(1 - k)
        x = np.concatenate([kopf, x[ueber:n]])
    return x[:n]


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


def lade_meta(projekt, out):
    p = projekt / "audio" / "ereignisse.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8")), p
    p = out / "ereignisse.json"
    return json.loads(p.read_text(encoding="utf-8")), p


def effekt_liste(meta):
    """Effekte aus dem Protokoll (automatisch je Ereignis) plus Klang-Extras der Szene; Doppelte (< 40 ms) fallen weg"""
    liste = []
    if meta.get("protokoll"):
        for i, e in enumerate(meta.get("ereignisse", [])):
            k = e.get("klang", None)
            if k is False:
                continue
            if k is None or k is True:
                k = AUTO.get(e.get("typ"))
            if not k:
                continue
            liste.append({**e, "typ": k, "_tonhoehe": 0.92 + 0.16 * ((i * 0.618) % 1)})
        liste += meta.get("klang", [])
    else:
        liste = list(meta.get("klang", []))
    liste.sort(key=lambda e: e["t"])
    ohne = []
    for e in liste:
        if any(x["typ"] == e["typ"] and abs(x["t"] - e["t"]) < 0.04 for x in ohne[-6:]):
            continue
        ohne.append(e)
    return ohne


def main():
    projekt = Path(sys.argv[1]).resolve()
    args = sys.argv[2:]
    wert = lambda name, std=None: args[args.index(name) + 1] if name in args and args.index(name) + 1 < len(args) else std
    wurzel = Path(__file__).resolve().parent
    out = wurzel / "out" / projekt.name
    out.mkdir(parents=True, exist_ok=True)
    meta, quelle = lade_meta(projekt, out)
    dauer = float(meta["dauer"])
    n = int(round(dauer * SR))

    effekte = [] if "--ohne-sfx" in args else effekt_liste(meta)
    sfx = np.zeros((2, n))
    for i, e in enumerate(effekte):
        f = EFFEKTE.get(e["typ"])
        if not f or e["t"] < 0 or e["t"] >= dauer:
            continue
        s = f(e)
        a = int(e["t"] * SR)
        b = min(n, a + len(s))
        pan = ((i * 0.37) % 1 - 0.5) * 0.5  # leichte Stereo-Verteilung
        sfx[0, a:b] += s[: b - a] * (1 - pan)
        sfx[1, a:b] += s[: b - a] * (1 + pan)

    skript = {}
    if (projekt / "skript.json").exists():
        skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
    art = wert("--teppich") or meta.get("teppich") or skript.get("klangteppich") or "musik"
    if "--ohne-musik" in args:
        art = "keiner"
    teppich_db = float(wert("--teppich-db", -10))
    musik = erzeuge_teppich(art, dauer, n)

    stimme_pfad = projekt / "audio" / "stimme.mp3"
    stimme = lade_stimme(stimme_pfad, n) if stimme_pfad.exists() else np.zeros(n)
    stimme_im_mix = 0.0 if "--ohne-stimme" in args else 1.0  # nur für Pegelkontrollen

    # Ducking: Teppich unter der Stimme etwas leiser (ca. −4 dB), in Sprechpausen voll
    if np.any(stimme):
        env = tiefpass_schnell(np.abs(stimme), 4)
        env = env / (np.percentile(env, 95) + 1e-9)
        duck = 1 - 0.37 * np.clip(env, 0, 1)
    else:
        duck = np.ones(n)

    # Pegel relativ zur Stimme (RMS der Stimme beim Sprechen): Teppich teppich_db (Standard −10 dB), Effekte −12 dB
    ref = rms_db(stimme[np.abs(stimme) > 1e-4]) if np.any(stimme) else -20.0
    def auf(x, ziel_db):
        aktiv = x[np.abs(x) > 1e-5]
        if len(aktiv) == 0:
            return x
        return x * 10 ** ((ziel_db - rms_db(aktiv)) / 20)

    musik = auf(musik, ref + teppich_db) * duck
    sfx_mono = sfx.sum(axis=0) / 2
    faktor = 10 ** (((ref - 12) - rms_db(sfx_mono[np.abs(sfx_mono) > 1e-5])) / 20) if np.any(sfx_mono) else 1
    sfx *= faktor
    links = stimme * stimme_im_mix + musik * 0.95 + sfx[0]
    rechts = stimme * stimme_im_mix + musik * 1.05 + sfx[1]
    schreibe_wav(out / "ton.wav", links, rechts)
    arten = {}
    for e in effekte:
        arten[e["typ"]] = arten.get(e["typ"], 0) + 1
    print(f"ton.wav: {dauer:.2f} s · Stimme {'ja' if np.any(stimme) else 'nein'} · Teppich „{art}“ {teppich_db:+.0f} dB zur Stimme"
          f" · {len(effekte)} Effekte ({', '.join(f'{k} {v}' for k, v in sorted(arten.items()))}) · Quelle {quelle.name}")


if __name__ == "__main__":
    main()
