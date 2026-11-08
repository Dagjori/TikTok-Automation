#!/usr/bin/env python3
"""Prüfung für das Referenzformat von Account 2 @stelldirvor.pov (Skill .claude/skills/video-produktion/, Teil stelldirvor.md;
Regeln: Hirn „REA stelldirvor Regelwerk“, „Ablauf Account 2“, „Prüfung und Abnahme Account 2“):
feste Ich-Perspektive, keine Stimme, Titelfrage, Messwert-Anzeige, kursive Sätze, Abspann.

Seit 07.11.2026 (REA-Regelwerk freigegeben): 5b erlaubt höchstens 3 gezielte harte Schnitte (Höhepunkt bzw. Maßstabs- oder
Szenensprung; 5c Hinweis), 14 Ereignis bei ca. 8 s auf Countdown-Null (erster Etikettwechsel 6–11 s, Pflicht), 14b Countdown
erreicht 0 (Hinweis), 15 Statuszeile (Unterzeile) wechselt mehrfach (Hinweis).
Seit 08.11.2026 (Wahl des Inhabers, Testblöcke aus skript.json → testbloecke, tools/testblock.py; je Block nur eine Änderung):
einstieg_a2 = a → 14 Ereignis bei 2–3 s · b → 14c zweite sichtbare Stufe bei 12–15 s (Pflicht) · c → 1 Länge 62–70 s, alle Zeitfenster
mit der Länge laut Protokoll (Abspann die letzten 8 s, Abblende 2 s davor, Höhepunkt-Fenster gestaucht wie engine/lunar_hud.js → lpSkala);
16 Folgen-Hinweis im Abspann nur bei folgen_hinweis = „mit“ (Pflicht; sonst darf keiner da sein).

Aufruf:  python3 qc/referenz_pov.py projekte/<name> [--video out/<name>/<name>.mp4] [--json]
Daten:   out/<name>/ereignisse.json (Ereignis-Protokoll der Szene, von render.js geschrieben) und – falls vorhanden – das MP4 (Länge, Lautheit,
         Lautheitsverlauf mit ffmpeg/ffprobe). Exit-Code 1, wenn ein Pflichtpunkt „nein“ ist.
Prüft:   21 Pflichtpunkte: Länge 80 ± 0,5 s · Titel nur in 0–4,4 s · Messwert-Anzeige vorhanden, Zahl ändert sich, Etikett wechselt 2–4×,
         „HIER“ beim Höhepunkt · keine Stimme · 12–18 Sätze mit 3–9 Wörtern, jeder mindestens 3 s sichtbar, keine Überlappung der Sätze ·
         keine Sticker, Chips, Karaoke, Folgen-Aufruf, Zähler-Ringe im Protokoll · keine harten Schnitte (Protokoll und Bildvergleich Bild für Bild;
         langsame Fahrt, Schwenk und Zoom sind erlaubt) · Abspann ab 72 s mindestens 7 s · Lautheit −14 ± 1 LUFS integriert ·
         Verlauf: Start leiser als Höhepunkt (55–65 s), Abspann leise.
         Dazu Hinweise (nicht Pflicht, Ausgabe „nein (Hinweis)“, Exit-Code bleibt 0), seit 02.11.2026 abends:
         10 Bewegung (kein Leerlauf in 2,5-s-Fenstern) · 10b Einzelbild-Flackern · 11 Zeitraffer im Skript ausgewiesen und Anzeige läuft mit ·
         12 Anzeige ohne unbegründete Sprünge · 13 Einstieg dicht (seit 04.11.2026: Welteffekt vor 4 s, Kamerafahrt/-schwenk/Zoom
         vor 8 s laut Protokoll oder skript.json → kamera, Anzeige ändert sich vor 8 s).
Nr. 9 („Kein 5-Sekunden-Rahmen“) entfällt seit 02.11.2026 abends (Inhaber: 5-Sekunden-Themen sind erlaubt); die Nummern bleiben stabil.
Bildanalyse (5b, 10, 10b) braucht numpy und ffmpeg; ohne numpy bleibt 5b beim Protokoll, 10/10b entfallen mit Hinweis.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:  # Bildanalyse entfällt, Protokollprüfungen laufen weiter
    np = None

WURZEL = Path(__file__).resolve().parent.parent

# Bildanalyse: Graustufen, Faktor 0,1 (108 × 192), 30 Bilder/s. Schwellen sind Startwerte (S), gemessen am Video „Eiszeit Toronto“ (02.11.2026):
# Einzelbild-Sprünge dort 4–9, Schnitt-/Blitz-Sprung 9, ruhige Phasen (Inhaber: „es wird gewartet“) 1,3–2,3 je 2,5 s, belebte Phasen 3,3–25.
BILD_B, BILD_H, FPS = 108, 192, 30
SCHNITT_MIN, SCHNITT_FAKTOR = 6.0, 8.0     # Bild-zu-Bild-Differenz (Grauwerte): absolut und gegenüber dem Umfeld (Median ± 0,5 s)
BEWEGUNG_FENSTER, BEWEGUNG_SCHRITT, BEWEGUNG_MIN = 2.5, 0.5, 2.5   # Sekunden; mittlere Grauwert-Differenz zwischen Anfang und Ende des Fensters
# Bild-Ausnahmen für die Bewegungsmessung (1080 × 1920): Anzeige links, Satz unten, Titelfrage (nur bis 4,6 s). Text zählt nicht als Bewegung der Welt.
MASKEN = {"anzeige": (40, 880, 760, 1050), "satz": (100, 1160, 980, 1340), "titel": (80, 400, 1000, 760)}
# Effekte, die ihren harten Bildsprung selbst mitbringen (Protokoll-Name enthält eines der Wörter) → in ihrem Zeitfenster kein „Schnitt“
HARTE_EFFEKTE = re.compile(r"blitz|weiss|weiß|staubwand|einschlag|druckwelle|knall|stoss|stoß|kippen|aufhellung|flash|explosion|glas", re.I)


def ffprobe_dauer(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=width,height,r_frame_rate,codec_type", "-of", "json", str(video)], capture_output=True, text=True)
    j = json.loads(r.stdout)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), {})
    a = any(s["codec_type"] == "audio" for s in j["streams"])
    return float(j["format"]["duration"]), v.get("width"), v.get("height"), v.get("r_frame_rate"), a


def lautheit(video):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(video), "-af", "ebur128=peak=true", "-vn", "-f", "null", "-"], capture_output=True, text=True)
    zeilen = r.stderr.splitlines()
    verlauf = []
    for z in zeilen:
        m = re.search(r"t:\s*([\d.]+)\s+TARGET.*?M:\s*([-\d.]+)\s+S:\s*([-\d.]+)", z)
        if m:
            verlauf.append((float(m.group(1)), float(m.group(2)), float(m.group(3))))
    ints = [z for z in zeilen if re.search(r"^\s+I:\s", z)]
    tp = [z for z in zeilen if re.search(r"^\s+Peak:\s", z)]
    I = float(re.search(r"I:\s*([-\d.]+)", ints[-1]).group(1)) if ints else None
    TP = float(re.search(r"Peak:\s*([-\d.]+)", tp[-1]).group(1)) if tp else None
    return I, TP, verlauf


def mittel_s(verlauf, a, b):
    w = [s for t, m, s in verlauf if a <= t < b and s > -100]
    return sum(w) / len(w) if w else None


def bildfolge(video):
    """Alle Bilder als Graustufen-Array (n, 192, 108) uint8 oder None (ohne numpy/ffmpeg-Fehler)."""
    if np is None or not Path(video).exists():
        return None
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(video), "-an", "-vf", f"fps={FPS},scale={BILD_B}:{BILD_H}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True)
    n = len(r.stdout) // (BILD_B * BILD_H)
    if r.returncode != 0 or n < 2:
        return None
    return np.frombuffer(r.stdout[: n * BILD_B * BILD_H], dtype=np.uint8).reshape(n, BILD_H, BILD_B)


def schritte(a):
    """d[i] = mittlere Grauwert-Differenz zwischen Bild i und Bild i+1 (blockweise, spart Speicher)."""
    d = np.empty(len(a) - 1, dtype=np.float32)
    for k in range(0, len(d), 300):
        m = min(300, len(d) - k)
        x = a[k + 1: k + 1 + m].astype(np.int16) - a[k: k + m].astype(np.int16)
        d[k: k + m] = np.abs(x).mean(axis=(1, 2))
    return d


def ausnahme_fenster(ev):
    """Zeitfenster [von, bis], in denen ein harter Bildsprung gewollt ist: Kamera-Stoß/Kippen und Effekte aus HARTE_EFFEKTE."""
    fenster = []
    for e in ev:
        name = str(e.get("name", "")) + " " + str(e.get("klang", "")) if e.get("typ") == "effekt" else ""
        if (e.get("typ") == "kamera" and e.get("art") in ("stoss", "kippen")) or (name and HARTE_EFFEKTE.search(name)):
            fenster.append((e["t"] - 0.3, e["t"] + max(float(e.get("dauer") or 0), 0.8) + 1.0))
    return fenster


def harte_schnitte(a, ev):
    """Bildzeitpunkte (s) mit hartem Schnitt: Sprung ≥ SCHNITT_MIN und ≥ SCHNITT_FAKTOR × Umfeld, der danach bleibt (kein Einzelbild-Aussetzer),
    außerhalb gewollter Effekte. Langsame Fahrten, Schwenks und Zooms ändern das Bild stetig (kleine Bild-zu-Bild-Differenz) und fallen durch."""
    d = schritte(a)
    n = len(d)
    frei = ausnahme_fenster(ev)
    treffer = []
    for i in range(3, n - 3):
        if d[i] < SCHNITT_MIN:
            continue
        umfeld = np.concatenate([d[max(0, i - 15): i], d[i + 1: i + 16]])
        if d[i] < SCHNITT_FAKTOR * max(float(np.median(umfeld)), 0.3):
            continue
        vor = a[i - 2: i + 1].astype(np.float32).mean(axis=0)
        nach = a[i + 1: i + 4].astype(np.float32).mean(axis=0)
        if float(np.abs(nach - vor).mean()) < 0.5 * d[i]:
            continue
        t = (i + 1) / FPS
        if any(v <= t <= b for v, b in frei):
            continue
        if not treffer or t - treffer[-1] > 0.3:
            treffer.append(round(t, 2))
    return treffer


def einzelbild_flackern(a, ev):
    """Zeitpunkte, an denen genau ein Bild aus der Reihe fällt (Sprung hin und gleich zurück): Render-Aussetzer, z. B. springende Spiegelung."""
    d = schritte(a)
    frei = ausnahme_fenster(ev)
    zeiten = []
    for i in range(2, len(d) - 3):
        if d[i] >= 4.0 and d[i + 1] >= 4.0 and float(np.abs(a[i + 2].astype(np.int16) - a[i].astype(np.int16)).mean()) <= 0.35 * min(d[i], d[i + 1]):
            t = (i + 1) / FPS
            if not any(v <= t <= b for v, b in frei):
                zeiten.append(round(t, 2))
    return zeiten


def bewegung_fenster(a):
    """[(Start s, mittlere Differenz)] für Fenster von BEWEGUNG_FENSTER s (Schritt BEWEGUNG_SCHRITT) zwischen 0 und 70 s. Text-Bereiche sind maskiert."""
    s = BILD_B / 1080.0

    def maske(*namen):
        m = np.ones((BILD_H, BILD_B), dtype=bool)
        for n in namen:
            x0, y0, x1, y1 = MASKEN[n]
            m[int(y0 * s): int(y1 * s) + 1, int(x0 * s): int(x1 * s) + 1] = False
        return m
    m_titel, m_text = maske("anzeige", "satz", "titel"), maske("anzeige", "satz")
    res, t0 = [], 0.0
    while t0 + BEWEGUNG_FENSTER <= 70.0 + 1e-9 and int(round((t0 + BEWEGUNG_FENSTER) * FPS)) < len(a):
        i, j = int(round(t0 * FPS)), int(round((t0 + BEWEGUNG_FENSTER) * FPS))
        m = m_titel if t0 < 4.6 else m_text
        res.append((round(t0, 2), float(np.abs(a[j].astype(np.int16) - a[i].astype(np.int16))[m].mean())))
        t0 += BEWEGUNG_SCHRITT
    return res


def luecken(fenster, grenze):
    """Fasst aufeinanderfolgende Fenster unter der Grenze zu Zeitbereichen zusammen: [(von, bis, Minimum)]."""
    out, akt = [], None
    for t0, w in fenster:
        if w < grenze:
            if akt and t0 <= akt[1] - BEWEGUNG_FENSTER + BEWEGUNG_SCHRITT + 1e-6:
                akt[1] = t0 + BEWEGUNG_FENSTER; akt[2] = min(akt[2], w)
            else:
                akt = [t0, t0 + BEWEGUNG_FENSTER, w]; out.append(akt)
    return [tuple(x) for x in out]


EINSTIEG_EFFEKT, EINSTIEG_KAMERA, EINSTIEG_ANZEIGE = 4.0, 8.0, 8.0   # s (Vorschlag der Lernschleife, Inhaber 04.11.2026)
KAMERA_ARTEN = ("fahrt", "schwenk", "zoom", "drift", "kran", "dolly")


def einstieg(ev, skript, fenster=None):
    """Hinweis 13: Einstieg dicht. Liefert [(Teil, Ist-Text, ok)] für Welteffekt < 4 s, Kamerabewegung < 8 s, Anzeige ändert sich < 8 s.
    Welteffekt: Protokoll-Effekt vor 4 s oder (Bildanalyse) ein 2,5-s-Fenster mit Start < 1,5 s, das ≥ BEWEGUNG_MIN Veränderung zeigt.
    Kamera: Protokoll typ „kamera“ (fahrt/schwenk/zoom) oder skript.json → kamera bzw. lern_notizen → kamera (atmen/beben zählen nicht)."""
    res = []
    eff = sorted(e["t"] for e in ev if e.get("typ") == "effekt" and e.get("t") is not None)
    bild = [w for t0, w in (fenster or []) if t0 + BEWEGUNG_FENSTER <= EINSTIEG_EFFEKT + 1e-6]
    if eff and eff[0] < EINSTIEG_EFFEKT:
        res.append(("Welteffekt", f"Effekt bei {eff[0]:.1f} s", True))
    elif bild and max(bild) >= BEWEGUNG_MIN:
        res.append(("Welteffekt", f"Bildveränderung {max(bild):.1f} in 0–4 s", True))
    else:
        res.append(("Welteffekt", f"erster Effekt {eff[0]:.1f} s" if eff else "kein Effekt vor 4 s", False))
    kam = [e["t"] for e in ev if e.get("typ") == "kamera" and str(e.get("art", "")).lower() in KAMERA_ARTEN and e.get("t") is not None]
    for quelle in (skript.get("kamera"), (skript.get("lern_notizen") or {}).get("kamera")):
        if isinstance(quelle, list):
            kam += [float(k["t"]) for k in quelle if isinstance(k, dict) and k.get("t") is not None and any(a in str(k.get("art", "")).lower() for a in KAMERA_ARTEN)]
    k0 = min(kam) if kam else None
    res.append(("Kamera", f"erste Bewegung {k0:.1f} s" if k0 is not None else "keine Fahrt/Schwenk/Zoom geplant", k0 is not None and k0 < EINSTIEG_KAMERA))
    an = [e for e in ev if e.get("typ") == "anzeige" and e.get("wert") is not None]
    a0 = next((b["t"] for a, b in zip(an, an[1:]) if a["wert"] != b["wert"] or a.get("etikett") != b.get("etikett")), None)
    res.append(("Anzeige", f"erste Änderung {a0:.1f} s" if a0 is not None else "ändert sich nicht", a0 is not None and a0 < EINSTIEG_ANZEIGE))
    return res


EREIGNIS_FENSTER = (6.0, 11.0)   # s: Ereignis bei ca. 8 s genau auf Countdown-Null (Inhaber 07.11.2026, REA: Vorbilder ca. 8 s)
SCHNITTE_MAX = 3                 # gezielte harte Schnitte (Inhaber 07.11.2026, REA: 4 von 6 starken Vorbildern setzen 1–3)
HOEHEPUNKT = (55.0, 65.0)        # s: ein Schnitt am Höhepunkt braucht keine weitere Begründung

# ───────── Testblöcke (Wahl des Inhabers 08.11.2026; skript.json → testbloecke, tools/testblock.py; je Block nur eine Änderung) ─────────
# einstieg_a2: a = Ereignis bei 2–3 s · b = zweite sichtbare Stufe bei 12–15 s · c = Länge 62–70 s (Abspann bleibt die letzten 8 s)
# folgen_hinweis: „mit“ = Textzeile im Abspann (LunarHUD-Option hinweis), sonst keine.
EREIGNIS_FENSTER_A = (1.5, 3.5)  # s: Testblock a (Ereignis bei 2–3 s, kleine Toleranz)
STUFE2_FENSTER = (12.0, 15.0)    # s: Testblock b
LAENGE_STANDARD = (79.5, 80.5)
LAENGE_C = (61.5, 70.5)          # Testblock c: 62–70 s, ± 0,5 s
HINWEIS_MAX_WOERTER = 10
# wie qc/massstab.py (Account 1), hier eigenständig gehalten (die Prüfungen der Accounts bleiben getrennt)
DRUCK = re.compile(r"folg\w*\s+(mir|uns|jetzt|sofort|für|fuer)|wenn\s+du\s+(mir\s+|uns\s+)?folgst|nicht\s+verpassen|verpass|sonst\b|gewinn|verlos|gratis|"
                   r"geschenk|belohn|abonnier|\blike\b|\bfolgen\s*!|\bjetzt\b", re.I)


def skala(t, laenge=80.0):
    """Zeitpunkt aus dem 80-s-Plan auf die Länge des Videos (gleich engine/lunar_hud.js → lpSkala): bis 10 s unverändert,
    10–70 s gleichmäßig gestaucht auf 10 bis Länge − 10, ab 70 s (Abblende, Abspann) fest vor dem Ende."""
    if t <= 10:
        return t
    if t >= 70:
        return t - 80 + laenge
    return 10 + (t - 10) * (laenge - 20) / 60


def laenge_ziel(testbloecke):
    """(min, max, Text) der Länge: Testblock c 62–70 s, sonst 80 s."""
    if (testbloecke or {}).get("einstieg_a2") == "c":
        return (*LAENGE_C, "62–70 s (Testblock c), 1080×1920")
    return (*LAENGE_STANDARD, "80 ± 0,5 s, 1080×1920")


def ereignis_fenster(testbloecke):
    return EREIGNIS_FENSTER_A if (testbloecke or {}).get("einstieg_a2") == "a" else EREIGNIS_FENSTER


def zweite_stufe(an, t_null, fenster=STUFE2_FENSTER):
    """Testblock b: nach dem Ereignis eine zweite sichtbare Stufe in 12–15 s (neues Etikett, neue Statuszeile oder ein Protokoll-
    Ereignis „stufe“). Liefert den Zeitpunkt oder None."""
    for a, b in zip(an, an[1:]):
        if t_null is not None and b["t"] <= t_null + 0.25:
            continue
        if fenster[0] <= b["t"] <= fenster[1] and (a.get("etikett") != b.get("etikett") or (str(b.get("unter") or "").strip() and a.get("unter") != b.get("unter"))):
            return float(b["t"])
    return None


def folgen_hinweis_a2(ev, testbloecke, laenge):
    """Prüfpunkt 16 (seit 08.11.2026) → (ist, ok): nur im Testblock folgen_hinweis = „mit“ eine Textzeile im Abspann (letzte 8 s),
    an den Inhalt gebunden, ohne Druck; sonst keine. Ein alter Folgen-Aufruf („folgen“) fällt schon unter Punkt 5."""
    variante = (testbloecke or {}).get("folgen_hinweis")
    h = [e for e in ev if e.get("typ") == "folgen_hinweis"]
    if variante != "mit":
        return (f"„{h[0].get('text', '')}“, aber Testblock {variante or '–'} (nur bei „mit“)", False) if h else (f"keiner (Testblock {variante or 'keiner'})", True)
    if not h:
        return "Testblock „mit“, aber kein Hinweis im Abspann (LunarHUD hinweis)", False
    text = " ".join(str(h[0].get("text", "")).split())
    t = float(h[0]["t"])
    probleme = []
    if not text:
        probleme.append("leer")
    if t < laenge - 8.0 - 0.05:
        probleme.append(f"vor dem Abspann ({t:.1f} s)")
    if len(text.split()) > HINWEIS_MAX_WOERTER:
        probleme.append(f"{len(text.split())} Wörter")
    d = DRUCK.search(text)
    if d:
        probleme.append(f"Druck/Tausch „{d.group(0)}“")
    return f"„{text}“ bei {t:.1f} s" + (f": {', '.join(probleme)}" if probleme else ""), not probleme


def ereignis_auf_null(an):
    """Ereignis = erster Etikettwechsel der Anzeige (Phase 1 ist der Countdown bis zum Ereignis). Liefert (t oder None, null_erreicht):
    null_erreicht = der Countdown vor dem Wechsel läuft abwärts bis nahe 0 (≤ 1 bzw. ≤ 5 % des Startwerts) oder zeigt „0:00“."""
    for i, (a, b) in enumerate(zip(an, an[1:])):
        if a.get("etikett") != b.get("etikett"):
            gruppe = [e.get("wert") for e in an[: i + 1] if e.get("wert") is not None]
            zahl_text = str(a.get("zahl", "")).strip()
            null = zahl_text in ("0", "0:00", "00:00", "0,0") or (
                len(gruppe) >= 2 and gruppe[-1] < gruppe[0] and gruppe[-1] <= max(1.0, 0.05 * abs(gruppe[0])))
            return float(b["t"]), null
    return None, False


def statuszeile(an):
    """(Wechsel, verschiedene Texte) der Unterzeile über alle Messpunkte; leere Texte zählen nicht."""
    texte = [str(e.get("unter") or "").strip() for e in an]
    return sum(1 for a, b in zip(texte, texte[1:]) if a != b and b), len({t for t in texte if t})


def szenenwechsel(prot, bild):
    """Vereinigt harte Schnitte aus Protokoll (Ereignisse) und Bildvergleich (Zeiten) zu [(t, grund oder None)], Abstand ≥ 0,5 s."""
    alle = sorted([(float(e["t"]), e.get("grund")) for e in prot] + [(float(t), None) for t in (bild or [])])
    out = []
    for t, g in alle:
        if out and t - out[-1][0] < 0.5:
            out[-1] = (out[-1][0], out[-1][1] or g)
        else:
            out.append((t, g))
    return out


def zeiten_text(liste, maximal=4):
    return ", ".join(f"{t:.1f}" for t in liste[:maximal]) + (" …" if len(liste) > maximal else "")


def main():
    args = sys.argv[1:]
    projekt = Path(args[0]).resolve()
    name = projekt.name
    if "--video" in args:
        video = Path(args[args.index("--video") + 1])
    else:
        video = next((v for v in (WURZEL / "out" / name / f"{name}.mp4", WURZEL / "out" / name / f"{name}_tiktok.mp4") if v.exists()), WURZEL / "out" / name / f"{name}.mp4")
    erg = json.loads((WURZEL / "out" / name / "ereignisse.json").read_text(encoding="utf-8"))
    ev = erg["ereignisse"]
    zeilen = []
    bilder = bildfolge(video) if video.exists() else None
    skript = {}
    if (projekt / "skript.json").exists():
        try:
            skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
        except ValueError:
            skript = {}

    def z(nr, punkt, ist, ziel, ok, pflicht=True):
        zeilen.append((nr, punkt, ist, ziel, ok, pflicht))

    # Testblöcke (seit 08.11.2026): Zeitfenster richten sich nach der Länge des Videos (Testblock c: 62–70 s)
    tb = skript.get("testbloecke") or {}
    lmin, lmax, ltext = laenge_ziel(tb)
    # Länge
    dauer_prot = float(erg["dauer"])
    if video.exists():
        d, w, h, fps, hat_ton = ffprobe_dauer(video)
        z("1", "Länge des MP4", f"{d:.2f} s ({w}×{h}, {fps})", ltext, lmin <= d <= lmax and (w, h) == (1080, 1920))
        z("1b", "Tonspur vorhanden", "ja" if hat_ton else "nein", "ja", hat_ton)
    else:
        z("1", "Länge laut Protokoll", f"{dauer_prot:.2f} s", ltext.split(",")[0], lmin <= dauer_prot <= lmax)
    L = dauer_prot  # Zeitfenster aus der geplanten Länge laut Protokoll (80 s bzw. im Testblock c 62–70 s)
    if tb:
        z("T", "Testblöcke laut skript.json", ", ".join(f"{k} = {v}" for k, v in tb.items()), "tools/testblock.py", True, pflicht=False)
    S = lambda t: skala(t, L)  # noqa: E731  Zeitpunkt aus dem 80-s-Plan auf diese Länge
    # Titel
    titel = [e for e in ev if e["typ"] == "titel"]
    ok = len(titel) == 1 and titel[0]["t"] >= 0 and titel[0]["t"] + titel[0].get("dauer", 0) <= 4.45
    z("2", "Titelfrage nur in 0–4,4 s (wie Referenz)", ", ".join(f"{e['t']:.2f}–{e['t'] + e.get('dauer', 0):.2f} s" for e in titel) or "fehlt", "genau einmal, ≤ 4,4 s", ok)
    # Messwert-Anzeige
    an = [e for e in ev if e["typ"] == "anzeige"]
    werte = [e["wert"] for e in an if e.get("wert") is not None]
    wechsel = sum(1 for a, b in zip(an, an[1:]) if a["etikett"] != b["etikett"])
    aend = sum(1 for a, b in zip(an, an[1:]) if a["wert"] != b["wert"])
    z("3", "Messwert-Anzeige vorhanden", f"{len(an)} Messpunkte, {an[0]['t']:.1f}–{an[-1]['t']:.1f} s" if an else "fehlt", f"ab ≤ 4,5 s bis ≥ {L - 12:.0f} s", bool(an) and an[0]["t"] <= 4.5 and an[-1]["t"] >= L - 12 - 1e-6)
    z("3b", "Zahl ändert sich (live)", f"{aend} von {max(1, len(an) - 1)} Schritten, min {min(werte):g}, max {max(werte):g}" if an else "–", "ändert sich in ≥ 60 % der Schritte", bool(an) and aend >= 0.6 * (len(an) - 1))
    z("3c", "Etikett wechselt mit der Phase", f"{wechsel}×", "2–4×", 2 <= wechsel <= 4)
    hier = [e for e in an if S(52) <= e["t"] <= S(68) and (str(e.get("zahl", "")).strip().upper() == "HIER" or e.get("wert") == 0)]
    z("3d", "Höhepunkt: Anzeige zeigt „HIER“ bzw. 0", f"ab {hier[0]['t']:.1f} s" if hier else "nicht gefunden", f"zwischen {S(52):.0f} und {S(68):.0f} s", bool(hier))
    # Zeitraffer und Anzeige (Hinweis 11, 12; Regel des Inhabers 02.11.2026 abends)
    zr = skript.get("zeitraffer", None)
    if "zeitraffer" not in skript:
        z("11", "Zeitraffer im Skript ausgewiesen, Anzeige läuft mit", "Feld „zeitraffer“ fehlt in skript.json", "Liste {von, bis, faktor} oder \"keiner\"", False, pflicht=False)
    elif zr in ("keiner", "keine", "echtzeit", "Echtzeit", [], None):
        z("11", "Zeitraffer im Skript ausgewiesen, Anzeige läuft mit", "Echtzeit (keiner)", "ausgewiesen", True, pflicht=False)
    else:
        abschnitte = zr if isinstance(zr, list) else [zr]
        probleme = []
        for ab in abschnitte:
            if not isinstance(ab, dict) or not ab.get("faktor") or ab.get("von") is None or ab.get("bis") is None:
                probleme.append("Abschnitt ohne von/bis/faktor"); continue
            fen = [(a, b) for a, b in zip(an, an[1:]) if ab["von"] <= a["t"] < ab["bis"] and a.get("wert") is not None and b.get("wert") is not None]
            lauf = sum(1 for a, b in fen if a["wert"] != b["wert"]) / len(fen) if fen else 0
            if lauf < 0.8:
                probleme.append(f"{ab['von']}–{ab['bis']} s: Anzeige läuft nur in {lauf:.0%}")
        z("11", "Zeitraffer im Skript ausgewiesen, Anzeige läuft mit", "; ".join(probleme)[:60] if probleme else f"{len(abschnitte)} Abschnitt(e), Anzeige läuft mit", "Faktor genannt, Zahl ändert sich in ≥ 80 % der Schritte", not probleme, pflicht=False)
    sprung = []
    for a, b, c in zip(an, an[1:], an[2:]):
        if a["etikett"] == b["etikett"] == c["etikett"] and None not in (a.get("wert"), b.get("wert"), c.get("wert")):
            s1, s2 = abs(b["wert"] - a["wert"]), abs(c["wert"] - b["wert"])
            spanne = (max(werte) - min(werte)) or 1.0
            if max(s1, s2) > 3 * max(min(s1, s2), 1e-9) and max(s1, s2) > 0.02 * spanne and abs(s1 - s2) > 0.02 * spanne:
                sprung.append(c["t"] if s2 > s1 else b["t"])
    z("12", "Anzeige ohne unbegründete Sprünge (innerhalb eines Etiketts)", f"Sprünge bei {zeiten_text(sorted(set(sprung)))} s" if sprung else "keine", "Etikettwechsel ausgenommen", not sprung, pflicht=False)
    # keine Stimme
    stimme = (projekt / "audio" / "stimme.mp3").exists()
    ms = erg.get("massstab") or {}
    z("8", "Keine Stimme, keine Untertitel", "stimme.mp3 vorhanden" if stimme else ("Untertitel gesetzt" if ms.get("untertitel") else "keine"), "keine", not stimme and not ms.get("untertitel"))
    # Nr. 9 („Kein 5-Sekunden-Rahmen“) entfällt seit 02.11.2026 abends: 5-Sekunden-Themen sind erlaubt, wenn sie sich gut simulieren lassen.
    z("9", "Kein „5 Sekunden“-Rahmen (entfallen seit 02.11.2026)", "–", "–", True, pflicht=False)
    # Sätze
    sa = sorted([e for e in ev if e["typ"] == "satz"], key=lambda e: e["t"])
    z("4", "Anzahl Sätze", str(len(sa)), "12–18 (Ziel 14–17)", 12 <= len(sa) <= 18)
    mind = min((e["dauer"] for e in sa), default=0)
    z("4b", "Jeder Satz mindestens 3 s sichtbar", f"kürzester {mind:.1f} s", "≥ 3 s", mind >= 3.0 - 1e-6)
    wmin = min((e["woerter"] for e in sa), default=0); wmax = max((e["woerter"] for e in sa), default=0)
    z("4c", "Wörter je Satz", f"{wmin}–{wmax}", "3–9", wmin >= 3 and wmax <= 9)
    ueber = [(a["text"], b["text"]) for a, b in zip(sa, sa[1:]) if a["t"] + a["dauer"] > b["t"] + 1e-6]
    z("4d", "Sätze überlappen nicht", "ja" if not ueber else f"{len(ueber)} Überlappungen", "keine", not ueber)
    erster = sa[0]["t"] if sa else 0; letzter = max((e["t"] + e["dauer"] for e in sa), default=0)
    z("4e", "Sätze zwischen Titel und Abblende", f"{erster:.1f}–{letzter:.1f} s", f"ab ≥ 4,4 s, bis ≤ {L - 10:.0f} s", erster >= 4.4 and letzter <= L - 10 + 1e-6)
    # Verbotene Elemente
    verboten = sorted({e["typ"] for e in ev if e["typ"] in ("chip", "stempel", "sticker", "folgen", "ring", "tafel", "untertitel", "karaoke", "titel-wort", "pointe", "formel", "bilanz", "balken", "leiste", "zaehler", "uhr", "logo")})
    z("5", "Keine Sticker, Chips, Karaoke, Folgen-Aufruf, Ringe", ", ".join(verboten) if verboten else "keine", "keine", not verboten)
    # 5b: seit 07.11.2026 höchstens 3 gezielte harte Schnitte (am Höhepunkt bzw. bei Maßstabs- oder Szenensprung), sonst lange
    # durchgehende Einstellungen. Langsame Fahrt, Schwenk und Zoom (typ „kamera“: fahrt, schwenk, zoom) sind erlaubt und gewollt.
    # Ein Schnitt im Protokoll (typ „schnitt“) soll seinen Grund tragen: {"t", "typ": "schnitt", "grund": "Maßstabssprung …"}.
    schnitte_prot = [e for e in ev if e["typ"] in ("uebergang", "schnitt") or (e["typ"] == "kamera" and e.get("art") in ("schnitt", "cut", "uebergang"))]
    schnitte_bild = harte_schnitte(bilder, ev) if bilder is not None else None
    wechsel = szenenwechsel(schnitte_prot, schnitte_bild)
    if not wechsel:
        ist = "keine" + (" im Protokoll (Bildvergleich nicht möglich: kein MP4 oder numpy)" if schnitte_bild is None else " (Protokoll und Bildvergleich Bild für Bild)")
    else:
        ist = f"{len(wechsel)} Schnitt(e) bei {zeiten_text([t for t, _ in wechsel])} s"
    z("5b", "Höchstens 3 gezielte harte Schnitte (Fahrt, Schwenk, Zoom frei)", ist, f"0–{SCHNITTE_MAX} (Inhaber 07.11.)", len(wechsel) <= SCHNITTE_MAX)
    ohne_grund = [t for t, g in wechsel if not g and not (S(HOEHEPUNKT[0]) <= t <= S(HOEHEPUNKT[1]))]
    z("5c", "Schnitte nur am Höhepunkt oder mit Grund (Maßstab/Szene)", f"ohne Grund bei {zeiten_text(ohne_grund)} s" if ohne_grund else ("keine Schnitte" if not wechsel else "alle begründet bzw. am Höhepunkt"),
      f"Grund im Protokoll oder {S(HOEHEPUNKT[0]):.0f}–{S(HOEHEPUNKT[1]):.0f} s (Sichtprüfung)", not ohne_grund, pflicht=False)
    # 14, 14b, 15: Ereignis auf Countdown-Null bei ca. 8 s (Testblock a: 2–3 s), Statuszeile (REA-Regelwerk stelldirvor, Inhaber 07.11.2026)
    t_null, null_ok = ereignis_auf_null(an)
    ef = ereignis_fenster(tb)
    z("14", "Ereignis auf Countdown-Null (erster Etikettwechsel)" + (" · Testblock a" if tb.get("einstieg_a2") == "a" else " bei ca. 8 s"), f"bei {t_null:.1f} s" if t_null is not None else "kein Etikettwechsel",
      f"{ef[0]:g}–{ef[1]:g} s (Inhaber {'08.11., Testblock a' if ef == EREIGNIS_FENSTER_A else '07.11.'})", t_null is not None and ef[0] <= t_null <= ef[1])
    if tb.get("einstieg_a2") == "b":
        t2 = zweite_stufe(an, t_null)
        z("14c", "Testblock b: zweite sichtbare Stufe bei 12–15 s", f"bei {t2:.1f} s" if t2 is not None else "kein Etikett- bzw. Statuswechsel in 12–15 s",
          "neues Etikett oder neue Statuszeile in 12–15 s", t2 is not None)
    z("14b", "Countdown läuft vor dem Ereignis bis 0", "ja" if null_ok else "nein (Phase 1 ist kein Countdown bis 0)", "Phase 1 = Countdown, endet bei 0", null_ok, pflicht=False)
    st_wechsel, st_texte = statuszeile(an)
    z("15", "Statuszeile (Unterzeile) wechselt mehrfach", f"{st_wechsel} Wechsel, {st_texte} Texte", "≥ 3 Wechsel (Hinweis)", st_wechsel >= 3, pflicht=False)
    # 10, 10b: Bewegung (Hinweis; die Sichtprüfung in pruefung.md entscheidet)
    fen = bewegung_fenster(bilder) if bilder is not None else None
    # 13: Einstieg (Hinweis; Lernschleife 03.11., Inhaber 04.11.2026): Welteffekt < 4 s, Kamerabewegung < 8 s, Anzeige ändert sich < 8 s
    teile = einstieg(ev, skript, fen)
    z("13", "Einstieg: Effekt < 4 s, Kamera < 8 s, Anzeige < 8 s", "; ".join(f"{n}: {t}" for n, t, _ in teile)[:60] if all(o for *_, o in teile) else "; ".join(f"{n}: {t}" for n, t, o in teile if not o)[:60], "alle drei erfüllt (ruhige Phase ≤ 5 s)", all(o for *_, o in teile), pflicht=False)
    if bilder is not None:
        leer = luecken(fen, BEWEGUNG_MIN)
        z("10", "Bewegung: kein Leerlauf (Veränderung in jedem 2,5-s-Fenster)", ("Leerlauf " + ", ".join(f"{v:.1f}–{b:.1f} s ({m:.1f})" for v, b, m in leer[:3]) + (" …" if len(leer) > 3 else "")) if leer else f"kleinste Veränderung {min(w for _, w in fen):.1f}", f"≥ {BEWEGUNG_MIN:g} (Grauwerte) je Fenster, 0–70 s", not leer, pflicht=False)
        flackern = einzelbild_flackern(bilder, ev)
        z("10b", "Kein Einzelbild-Flackern (Render-Aussetzer)", f"{len(flackern)}× bei {zeiten_text(flackern)} s" if flackern else "keins", "keins", not flackern, pflicht=False)
    else:
        z("10", "Bewegung / Einzelbild-Flackern (Bildanalyse)", "nicht geprüft (kein MP4 oder numpy)", "–", False, pflicht=False)
    # Abspann
    ab = [e for e in ev if e["typ"] == "abspann"]
    z("6", f"Abspann ab {L - 8:.0f} s, mindestens 7 s", ", ".join(f"{e['t']:.1f}+{e['dauer']:.1f} s" for e in ab) or "fehlt", f"t ≤ {L - 8 + 0.05:.2f}, Dauer ≥ 7".replace(".", ","), bool(ab) and ab[0]["t"] <= L - 8 + 0.05 and ab[0]["dauer"] >= 7.0 - 1e-6)
    z("6b", "Abspann: Titelfrage plus Faktenzeile", "ja" if ab and ab[0].get("text") and ab[0].get("fakt") else "nein", "ja", bool(ab) and bool(ab[0].get("text")) and bool(ab[0].get("fakt")))
    abl = [e for e in ev if e["typ"] == "abblende"]
    z("6c", f"Abblende auf Schwarz {L - 10:.0f}–{L - 8:.0f} s", ", ".join(f"{e['t']:.1f}+{e['dauer']:.1f} s" for e in abl) or "fehlt", f"{L - 10:.0f}–{L - 8:.0f} s", bool(abl) and abs(abl[0]["t"] - (L - 10)) < 0.05 and abs(abl[0]["t"] + abl[0]["dauer"] - (L - 8)) < 0.05)
    # 16 Folgen-Hinweis im Abspann (seit 08.11.2026, nur Testblock „mit“)
    ist16, ok16 = folgen_hinweis_a2(ev, tb, L)
    z("16", "Folgen-Hinweis im Abspann (nur Testblock „mit“)", ist16, "„mit“: Zeile im Abspann, ohne Druck; sonst keiner", ok16)
    # Lautheit
    if video.exists():
        I, TP, verlauf = lautheit(video)
        z("7", "Lautheit integriert", f"{I:.1f} LUFS, True Peak {TP:.1f} dBTP" if I is not None else "nicht messbar", "−14 ± 1 LUFS, ≤ −1 dBTP", I is not None and abs(I + 14) <= 1.0 and (TP is None or TP <= -1.0))
        h0, h1 = S(52), S(68)
        start = mittel_s(verlauf, 4, S(28)); mitte = mittel_s(verlauf, S(30), S(50)); hoch = max((s for t, m, s in verlauf if h0 <= t <= h1), default=None); abspann = mittel_s(verlauf, L - 7, L - 1)
        hoch_t = max(((s, t) for t, m, s in verlauf if 0 <= t <= L if s > -100), default=(None, None))[1]
        z("7b", f"Verlauf: Höhepunkt bei {S(55):.0f}–{S(65):.0f} s", f"Maximum (kurzzeitig) bei {hoch_t:.1f} s: {hoch:.1f} LUFS, Start {start:.1f}, Mitte {mitte:.1f}" if hoch is not None and start is not None else "–", f"Maximum in {h0:.0f}–{h1:.0f} s, ≥ 4 dB über dem Start", hoch is not None and hoch_t is not None and h0 <= hoch_t <= h1 and hoch >= start + 4)
        z("7c", "Verlauf: Abspann leise", f"{abspann:.1f} LUFS (kurzzeitig), Start {start:.1f}" if abspann is not None else "–", "mind. 6 dB unter dem Start", abspann is not None and abspann <= start - 6)
    else:
        z("7", "Lautheit (MP4 fehlt)", "–", "−14 ± 1 LUFS", False)

    br = [max(len(str(c[i])) for c in zeilen) for i in range(4)]
    print(f"Referenzformat-Prüfung · {name}")
    print(" | ".join(["Nr ", "Prüfpunkt".ljust(min(br[1], 46)), "Ist".ljust(min(br[2], 60)), "Ziel", "ok"]))
    for nr, punkt, ist, ziel, ok, pflicht in zeilen:
        print(" | ".join([str(nr).ljust(3), punkt.ljust(min(br[1], 46)), str(ist).ljust(min(br[2], 60)), ziel, "entfällt" if nr == "9" else "ja" if ok else "NEIN" if pflicht else "nein (Hinweis)"]))
    schlecht = [x for x in zeilen if x[5] and not x[4]]
    hinweise = [x for x in zeilen if not x[5] and not x[4]]
    print(f"\nPflichtpunkte: {sum(1 for x in zeilen if x[5] and x[4])} von {sum(1 for x in zeilen if x[5])} ja")
    if hinweise:
        print(f"Hinweise (nicht Pflicht, in pruefung.md Abschnitt 2 klären): {', '.join(str(x[0]) for x in hinweise)}")
    if "--json" in args:
        print(json.dumps([dict(nr=a, punkt=b, ist=str(c), ziel=d, ok=e) for a, b, c, d, e, f in zeilen], ensure_ascii=False))
    sys.exit(1 if schlecht else 0)


if __name__ == "__main__":
    main()
