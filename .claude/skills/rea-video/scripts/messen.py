#!/usr/bin/env python3
"""REA-Video · Messung eines Videos oder eines ganzen Korpus (Skill .claude/skills/rea-video/, Anleitung messung.md).

Aufruf:
  python messen.py <video.mp4> <ausgabeordner> [--id V01] [Optionen]
  python messen.py <korpusordner> [Optionen]      misst alle Videos aus <korpus>/videos/ nach <korpus>/analysen/<id>/
Optionen:
  --whisper-modell PFAD   whisper.cpp-Modell (ggml-*.bin). Ohne Angabe: Umgebungsvariable REA_WHISPER_MODELL,
                          sonst das größte ggml-*.bin in <arbeitsordner>/_modelle/
  --sprache auto|de|en    Sprache des Transkripts (Standard: auto)
  --ohne-bilder           keine Kontaktbögen und Bildreihen (nur Zahlen)
  --neu                   im Korpus-Modus bereits gemessene Videos erneut messen
Ergebnis je Video: messung.json, messung.md, bilder/, transkript.srt (nur mit Modell). Alles bleibt lokal: fremde Inhalte
(Bilder, Transkripte, Ton) kommen nie ins Repo.
Braucht nur ffmpeg/ffprobe (Transkript: ffmpeg ab 8.0 mit whisper.cpp), kein numpy.
Kennzeichnung: Zahlen aus der Messung sind F (gemessen). Einordnungen (Klangart, Takt, Schnittart) sind S (Schätzung)
und tragen im JSON die Endung „_S“.
"""
import argparse
import json
import math
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

VIDEO_ENDUNGEN = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
SCHRIFTEN = ["C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/arial.ttf",
             "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
             "/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/Library/Fonts/Arial.ttf"]

# Schwellen (S = Startwerte, begründet in messung.md; bei Bedarf nach den ersten Videos nachschärfen)
SCHNITT_HART = 25.0       # scdet-Wert (0–100) ab dem ein harter Schnitt gilt
SCHNITT_WEICH = 8.0       # darunter kein Ereignis; 8–25: weicher Übergang oder schnelle Bewegung (Sicht prüfen)
AUDIO_SCHRITT = 0.02      # s je Audiofenster (882 Samples bei 44,1 kHz)
KLANG_SPRUNG = 9.0        # dB über dem Median der vorigen 0,3 s = Klang-Ereignis (volles und tiefes Band)
KLANG_SPRUNG_HELL = 12.0  # helles Band (Zischlaute der Stimme fallen sonst mit hinein)
KLANG_MIN = -45.0         # dBFS; leiser zählt nicht als Ereignis
STILLE_DB, STILLE_MIN = -40, 0.3
RUHE_FAKTOR = 0.35        # Sekunde mit Bewegung unter 35 % des Video-Medians = ruhige Sekunde
FENSTER = 5.0             # s je Zeile der Takt-Tabelle
BILD_FPS = 10             # Bildwerte je Sekunde (Helligkeit, Sättigung, Bewegung)
MAX_SCHNITTBILDER = 30    # Schnitte mit Vorher/Nachher-Bild


# ---------------------------------------------------------------- Hilfen

def lauf(cmd, cwd=None):
    r = subprocess.run([str(c) for c in cmd], cwd=cwd, capture_output=True)
    return r.returncode, r.stdout, r.stderr.decode("utf-8", "replace")


def filter_pfad(p):
    """Pfad für eine ffmpeg-Filteroption (Doppelpunkt maskieren, Schrägstriche vorwärts)."""
    return "'" + str(p).replace("\\", "/").replace(":", "\\:").replace("'", "") + "'"


def bruch(s):
    try:
        a, b = str(s).split("/")
        return round(float(a) / float(b), 3) if float(b) else None
    except (ValueError, ZeroDivisionError):
        return None


def r1(x, n=1):
    return None if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))) else round(x, n)


def median(werte):
    w = [x for x in werte if x is not None]
    return statistics.median(w) if w else None


def mittel(werte):
    w = [x for x in werte if x is not None and not math.isinf(x)]
    return sum(w) / len(w) if w else None


def meta_lesen(pfad):
    """Liest die Ausgabe von metadata/ametadata=mode=print: [{t, schluessel: wert}]."""
    frames, akt = [], None
    if not Path(pfad).exists():
        return frames
    for z in Path(pfad).read_text(encoding="utf-8", errors="replace").splitlines():
        z = z.strip()
        if z.startswith("frame:"):
            m = re.search(r"pts_time:([-\d.e]+)", z)
            akt = {"t": float(m.group(1)) if m else None}
            frames.append(akt)
        elif "=" in z and akt is not None:
            k, v = z.split("=", 1)
            try:
                akt[k.split(".")[-1]] = float(v)
            except ValueError:
                akt[k.split(".")[-1]] = v
    return frames


def ffmpeg_vorhanden():
    return shutil.which("ffmpeg") and shutil.which("ffprobe")


# ---------------------------------------------------------------- Messungen

def probe(video):
    rc, out, err = lauf(["ffprobe", "-v", "error", "-show_entries",
                         "format=duration,bit_rate,size:stream=codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate,sample_rate,channels",
                         "-of", "json", video])
    j = json.loads(out.decode("utf-8", "replace") or "{}")
    v = next((s for s in j.get("streams", []) if s.get("codec_type") == "video"), {})
    a = next((s for s in j.get("streams", []) if s.get("codec_type") == "audio"), None)
    f = j.get("format", {})
    return {
        "dauer_s": r1(float(f.get("duration", 0) or 0), 2),
        "breite": v.get("width"), "hoehe": v.get("height"),
        "fps": bruch(v.get("avg_frame_rate")) or bruch(v.get("r_frame_rate")),
        "video_codec": v.get("codec_name"),
        "ton": a is not None,
        "ton_codec": a.get("codec_name") if a else None,
        "samplerate": int(a["sample_rate"]) if a and a.get("sample_rate") else None,
        "kanaele": a.get("channels") if a else None,
        "groesse_mb": r1(int(f.get("size", 0) or 0) / 1e6, 1),
        "seitenverhaeltnis": (f"{v['width']}:{v['height']}" if v.get("width") else None),
    }


def bildwerte(video, tmp):
    """Je 0,1 s: Helligkeit (YAVG), Bewegung (YDIF = mittlere Helligkeitsänderung zum vorigen Messbild), Sättigung, Kontrast."""
    datei = "bildwerte.txt"
    lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-vf",
          f"fps={BILD_FPS},scale=108:192:flags=area,signalstats,metadata=mode=print:file={datei}", "-f", "null", "-"], cwd=tmp)
    return [{"t": f["t"], "hell": f.get("YAVG"), "bew": f.get("YDIF"), "satt": f.get("SATAVG"),
             "kontrast": (f.get("YHIGH", 0) - f.get("YLOW", 0)) if f.get("YHIGH") is not None else None, "farbton": f.get("HUEMED")}
            for f in meta_lesen(Path(tmp) / datei) if f.get("t") is not None]


def schnitte_messen(video, tmp):
    datei = "schnitte.txt"
    lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-vf",
          f"scale=216:384:flags=area,scdet=threshold={SCHNITT_WEICH}:sc_pass=1,metadata=mode=print:file={datei}", "-f", "null", "-"], cwd=tmp)
    roh = [(f["t"], f.get("score", 0.0)) for f in meta_lesen(Path(tmp) / datei) if f.get("t") is not None]
    zus = []
    for t, s in roh:  # Treffer innerhalb 0,15 s zusammenfassen (Blitze, Übergänge über mehrere Bilder)
        if zus and t - zus[-1]["bis"] <= 0.15:
            zus[-1]["bis"] = t
            zus[-1]["wert"] = max(zus[-1]["wert"], s)
            zus[-1]["bilder"] += 1
        else:
            zus.append({"t": t, "bis": t, "wert": s, "bilder": 1})
    for z in zus:
        z["art_S"] = "hart" if z["wert"] >= SCHNITT_HART and z["bilder"] <= 2 else ("Übergang über mehrere Bilder" if z["bilder"] > 2 else "weich/Bewegung (prüfen)")
        z["t"], z["bis"], z["wert"] = r1(z["t"], 2), r1(z["bis"], 2), r1(z["wert"], 1)
    return zus


def schwarzbilder(video):
    rc, out, err = lauf(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-an", "-vf", "blackdetect=d=0.08:pix_th=0.10", "-f", "null", "-"])
    return [{"von": r1(float(a), 2), "bis": r1(float(b), 2)} for a, b in re.findall(r"black_start:([\d.]+)\s+black_end:([\d.]+)", err)]


def lautheit(video):
    rc, out, err = lauf(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
    verlauf = []
    for z in err.splitlines():
        m = re.search(r"t:\s*([\d.]+)\s+TARGET.*?M:\s*(-inf|[-\d.]+)\s+S:\s*(-inf|[-\d.]+)", z)
        if m:
            verlauf.append((float(m.group(1)), float(m.group(2)), float(m.group(3))))
    zusammen = err[err.rfind("Summary:"):] if "Summary:" in err else ""
    def zahl(muster):
        m = re.search(muster, zusammen)
        return float(m.group(1)) if m else None
    return {"lufs_integriert": zahl(r"I:\s*([-\d.]+)\s*LUFS"), "lra_lu": zahl(r"LRA:\s*([-\d.]+)\s*LU"),
            "true_peak_dbfs": zahl(r"Peak:\s*([-\d.]+)\s*dBFS")}, verlauf


def band(video, tmp, name, vorfilter, seite=False):
    """RMS-Pegel je 20 ms für ein Frequenzband: [(t, dBFS)]. seite=True: Stereo-Anteil (L − R), die mittige Stimme fällt weg."""
    datei = f"band_{name}.txt"
    kette = "aformat=sample_rates=44100,pan=mono|c0=0.5*c0-0.5*c1" if seite else "aformat=sample_rates=44100:channel_layouts=mono"
    if vorfilter:
        kette += "," + vorfilter
    kette += (f",asetnsamples=n={int(44100 * AUDIO_SCHRITT)}:p=0,astats=metadata=1:reset=1:measure_perchannel=none:"
              f"measure_overall=RMS_level,ametadata=mode=print:file={datei}")
    lauf(["ffmpeg", "-v", "error", "-i", video, "-vn", "-af", kette, "-f", "null", "-"], cwd=tmp)
    return [(f["t"], max(f.get("RMS_level", -120.0), -120.0)) for f in meta_lesen(Path(tmp) / datei) if f.get("t") is not None]


def stille(video):
    rc, out, err = lauf(["ffmpeg", "-hide_banner", "-nostats", "-i", video, "-vn", "-af",
                         f"silencedetect=noise={STILLE_DB}dB:d={STILLE_MIN}", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start:\s*([-\d.]+)", err)]
    enden = [float(x) for x in re.findall(r"silence_end:\s*([-\d.]+)", err)]
    return [{"von": r1(max(a, 0.0), 2), "bis": r1(b, 2)} for a, b in zip(starts, enden + [None] * (len(starts) - len(enden))) if b is not None]


def srt_lesen(pfad):
    seg = []
    if not Path(pfad).exists():
        return seg
    text = Path(pfad).read_text(encoding="utf-8", errors="replace").replace("\r", "")
    for block in re.split(r"\n\s*\n", text.strip()):
        zeilen = block.strip().splitlines()
        for i, z in enumerate(zeilen):
            m = re.match(r"(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)", z.strip())
            if m:
                g = [int(x) for x in m.groups()]
                a = g[0] * 3600 + g[1] * 60 + g[2] + g[3] / 1000
                b = g[4] * 3600 + g[5] * 60 + g[6] + g[7] / 1000
                t = " ".join(x.strip() for x in zeilen[i + 1:]).strip()
                if t:
                    seg.append((round(a, 2), round(b, 2), t))
                break
    return seg


def transkript(video, ziel, modell, sprache):
    """Wörter mit Zeiten über Whisper (queue=20 für Kontext, max_len=1 für Wortzeiten). Kalibriert am 07.11.2026 an
    „angestellt-selbststaendig“ (151 bekannte Wörter): 150 erkannt, Wortfehlerrate 6,6 %, Wortbeginn im Median 0,18 s
    daneben (90 % unter 0,5 s), Sprechtempo exakt. Mit queue=10 und ganzen Segmenten waren es 9,3 % und 0,45 s."""
    if not modell:
        return None, "kein Whisper-Modell gefunden (messung.md › Transkript)"
    datei = "transkript_woerter.srt"
    kette = (f"aresample=16000,whisper=model={filter_pfad(modell)}:language={sprache}:queue=20:max_len=1:"
             f"destination={datei}:format=srt")
    if (Path(ziel) / datei).exists():
        (Path(ziel) / datei).unlink()
    rc, out, err = lauf(["ffmpeg", "-v", "error", "-i", video, "-vn", "-af", kette, "-f", "null", "-"], cwd=ziel)
    if rc != 0 or not (Path(ziel) / datei).exists():
        return None, "Whisper-Lauf fehlgeschlagen: " + err.strip().splitlines()[-1][:160] if err.strip() else "Whisper-Lauf fehlgeschlagen"
    woerter = []
    for a, b, t in srt_lesen(Path(ziel) / datei):
        for teil in t.split():  # selten mehrere Wörter je Segment: Zeit gleichmäßig aufteilen
            woerter.append([a, b, teil])
    return woerter, None


TON_ANFANG = re.compile(r"^[\*\[\(♪♫]")
TON_ENDE = re.compile(r"[\*\]\)♪♫][.,!?]*$")


def sprache_trennen(woerter_roh):
    """Trennt Tonhinweise von Whisper (*music*, [Musik], (Applaus), ♪ …) von gesprochenen Wörtern.
    Ohne Stimme schreibt Whisper sonst Beschreibungen wie „*Dramatic music*“ als Wörter (gesehen 07.11.2026 an Account-2-Vorbildern).
    Rückgabe: (woerter, hinweise) mit hinweise = [[von, bis, text]]; die Hinweise sind S und helfen bei der Tonanalyse."""
    woerter, hinweise, akt = [], [], None
    for a, b, t in woerter_roh:
        s = t.strip()
        if akt is not None:
            akt[1], akt[2] = b, akt[2] + " " + s
            if TON_ENDE.search(s):
                hinweise.append(akt); akt = None
            continue
        if TON_ANFANG.match(s):
            if (len(s) > 1 and TON_ENDE.search(s[1:])) or s in ("♪", "♫"):
                hinweise.append([a, b, s])
            else:
                akt = [a, b, s]
            continue
        woerter.append([a, b, t])
    if akt:
        hinweise.append(akt)
    zus = []
    for a, b, t in hinweise:
        text = re.sub(r"[\*\[\]\(\)♪♫]", "", t).strip(" .,")
        if zus and zus[-1][2].lower() == text.lower() and a - zus[-1][1] <= 1.0:
            zus[-1][1] = b
        elif text:
            zus.append([a, b, text])
    return woerter, [[r1(a, 2), r1(b, 2), t] for a, b, t in zus]


def saetze_bilden(woerter):
    """Sätze aus Wörtern (Satzende an . ? ! …), als [(start, ende, text)]."""
    saetze, akt = [], []
    for w in woerter:
        akt.append(w)
        if re.search(r"[.?!…]$", w[2]) and not re.fullmatch(r"\d+\.", w[2]):
            saetze.append((akt[0][0], akt[-1][1], " ".join(x[2] for x in akt)))
            akt = []
    if akt:
        saetze.append((akt[0][0], akt[-1][1], " ".join(x[2] for x in akt)))
    return saetze


def srt_schreiben(pfad, segmente):
    def zeit(s):
        return "%02d:%02d:%02d,%03d" % (int(s // 3600), int(s % 3600 // 60), int(s % 60), int(round((s - int(s)) * 1000)) % 1000)
    Path(pfad).write_text("\n".join(f"{i}\n{zeit(a)} --> {zeit(b)}\n{t}\n" for i, (a, b, t) in enumerate(segmente, 1)), encoding="utf-8")


def farbpalette(video):
    """Dominante Farben gesamt und je Drittel (2 Bilder/s, 36 × 64 Pixel, 512 Farbfächer)."""
    rc, out, err = lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-vf", "fps=2,scale=36:64:flags=area,format=rgb24", "-f", "rawvideo", "-"])
    px = 36 * 64 * 3
    n = len(out) // px
    if n == 0:
        return None
    teile = [{}, {}, {}, {}]  # gesamt, 1., 2., 3. Drittel
    for f in range(n):
        d = 1 + min(2, int(3 * f / n))
        blk = out[f * px:(f + 1) * px]
        for i in range(0, px, 3):
            r, g, b = blk[i], blk[i + 1], blk[i + 2]
            k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5)
            for tz in (teile[0], teile[d]):
                e = tz.get(k)
                if e is None:
                    tz[k] = [1, r, g, b]
                else:
                    e[0] += 1; e[1] += r; e[2] += g; e[3] += b

    def top(tz, anzahl=6):
        summe = sum(e[0] for e in tz.values()) or 1
        res = []
        for k, (c, r, g, b) in sorted(tz.items(), key=lambda x: -x[1][0])[:anzahl]:
            res.append({"hex": "#%02X%02X%02X" % (r // c, g // c, b // c), "anteil_prozent": r1(100 * c / summe, 1)})
        return res
    return {"gesamt": top(teile[0]), "drittel": [top(teile[i], 4) for i in (1, 2, 3)]}


# ---------------------------------------------------------------- Auswertung der Rohwerte

def je_sekunde(reihe, key, dauer):
    fach = {}
    for e in reihe:
        if e.get(key) is not None:
            fach.setdefault(int(e["t"]), []).append(e[key])
    return [r1(mittel(fach.get(s, [])), 2) for s in range(int(math.ceil(dauer)))]


def onsets(reihe, sprung, minimum, abstand=0.25):
    out, k = [], int(round(0.3 / AUDIO_SCHRITT))
    werte = [d for _, d in reihe]
    for i in range(k, len(werte)):
        d = werte[i]
        if d < minimum:
            continue
        basis = statistics.median(werte[i - k:i])
        if d - basis >= sprung and (not out or reihe[i][0] - out[-1][0] >= abstand):
            out.append((round(reihe[i][0], 2), round(d - basis, 1)))
    return out


def in_sprache(t, sprache):
    return any(a - 0.05 <= t <= e + 0.05 for a, e, _ in sprache)


def klang_ereignisse(seite, voll, tief, hell, sprache, stereo_db=None):
    """Effekt-Kandidaten (S). Quellen: Stereo-Anteil (Stimme liegt meist mittig und fällt dort weg), Sprechpausen laut Transkript,
    ohne beides die volle Mischung (dann nicht von der Stimme getrennt). Kalibriert am eigenen Video „angestellt-selbststaendig“
    (83 bekannte Effekte, 06.11.2026): Stereo-Anteil ≈ 3 von 4 Kandidaten echt, ≈ 50 % der Effekte gefunden. Die Bänder der vollen
    Mischung sind dafür unbrauchbar (die Stimme allein löst dort über 160 Treffer aus); sie dienen nur der Einordnung der Klangart."""
    breit = stereo_db is not None and stereo_db >= -20  # breite Mischung (Atmo/Musik), kein mittiger Sprecher, der alles überdeckt
    kand = [(t, "Stereo-Anteil", s) for t, s in onsets(seite, KLANG_SPRUNG if breit else 12.0, -60.0)] if seite else []
    if sprache:
        kand += [(t, "Sprechpause", s) for t, s in onsets(voll, KLANG_SPRUNG, KLANG_MIN) if not in_sprache(t, sprache)]
    elif breit or not seite:
        kand += [(t, "Mischung" if breit else "Mischung (Stimme nicht getrennt)", s) for t, s in onsets(voll, KLANG_SPRUNG, KLANG_MIN)]
    tief_t = [t for t, _ in onsets(tief, KLANG_SPRUNG, KLANG_MIN - 5)]
    hell_t = [t for t, _ in onsets(hell, KLANG_SPRUNG_HELL, KLANG_MIN - 5)]
    cl = []
    for t, quelle, s in sorted(kand):
        if cl and t - cl[-1]["t"] <= 0.1:
            cl[-1]["quelle"] = sorted(set(cl[-1]["quelle"]) | {quelle}); cl[-1]["sprung_db"] = max(cl[-1]["sprung_db"], s)
        else:
            cl.append({"t": t, "quelle": [quelle], "sprung_db": s})
    for c in cl:
        nah_t = any(abs(c["t"] - x) <= 0.1 for x in tief_t)
        nah_h = any(abs(c["t"] - x) <= 0.1 for x in hell_t)
        c["art_S"] = ("breit (Treffer/Impact)" if nah_t and nah_h else "tief (Schlag/Boom/Bass)" if nah_t
                      else "hell (Zisch/Klick/Whoosh)" if nah_h else "mittel (Pop/Ding/Akzent)")
        c["in_sprache"] = in_sprache(c["t"], sprache) if sprache else None
    return cl


def anstiege(hell, min_db=10.0):
    """Anstiegs-Kandidaten: Pegel steigt über 1–4 s um ≥ min_db, überwiegend stetig (Riser, Anschwellen von Atmo und Musik)."""
    if len(hell) < 100:
        return []
    k = int(0.5 / AUDIO_SCHRITT)
    w = [max(d, -70.0) for _, d in hell]  # Untergrenze: aus echter Stille (−120 dB) entstanden sonst Scheinanstiege über 75 dB
    kum = [0.0]
    for x in w:
        kum.append(kum[-1] + x)
    glatt = [(kum[i + 1] - kum[max(0, i + 1 - k)]) / (i + 1 - max(0, i + 1 - k)) for i in range(len(w))]
    schritt = int(0.25 / AUDIO_SCHRITT)
    kand = []
    for i in range(0, len(glatt), schritt):
        for dauer in (1.0, 2.0, 3.0, 4.0):
            j = i - int(dauer / AUDIO_SCHRITT)
            if j < 0:
                continue
            seg = glatt[j:i + 1:schritt]
            if len(seg) >= 4 and seg[-1] - seg[0] >= min_db and glatt[i] >= KLANG_MIN and \
                    sum(1 for a, b in zip(seg, seg[1:]) if b >= a - 0.5) / (len(seg) - 1) >= 0.8:
                kand.append([hell[j][0], hell[i][0], seg[-1] - seg[0]])
                break
    zus = []
    for a, b, h in kand:
        if zus and a <= zus[-1][1]:
            zus[-1][1] = max(zus[-1][1], b); zus[-1][2] = max(zus[-1][2], h)
        else:
            zus.append([a, b, h])
    return [{"von": r1(a, 2), "bis": r1(b, 2), "anstieg_db": r1(h, 1)} for a, b, h in zus]


def takt_schaetzen(voll, tief):
    """Grobe Tempo-Schätzung (S) über die Autokorrelation der Einsatz-Hüllkurve, 60–180 BPM."""
    n = min(len(voll), len(tief))
    if n < 500:
        return None
    a = [d for _, d in tief[:n]]
    b = [d for _, d in voll[:n]]
    env = [max(0.0, a[i] - a[i - 1]) + max(0.0, b[i] - b[i - 1]) for i in range(1, n)]
    m = sum(env) / len(env)
    env = [x - m for x in env]
    ac0 = sum(x * x for x in env) / len(env) or 1e-9
    werte = {}
    for lag in range(int(60 / (180 * AUDIO_SCHRITT)), int(60 / (60 * AUDIO_SCHRITT)) + 1):
        werte[lag] = sum(env[i] * env[i + lag] for i in range(len(env) - lag)) / (len(env) - lag)
    lag = max(werte, key=werte.get)
    staerke = werte[lag] / ac0
    if lag - 1 in werte and lag + 1 in werte:  # parabolische Verfeinerung
        y0, y1, y2 = werte[lag - 1], werte[lag], werte[lag + 1]
        nenner = y0 - 2 * y1 + y2
        lag = lag + (0.5 * (y0 - y2) / nenner if nenner else 0)
    return {"bpm_S": r1(60 / (lag * AUDIO_SCHRITT), 0), "staerke": r1(staerke, 2),
            "einordnung_S": "klarer Takt" if staerke >= 0.25 else "schwacher Takt" if staerke >= 0.1 else "kein klarer Takt"}


def loop_differenz(video, dauer):
    """Mittlere Helligkeitsdifferenz (0–255) zwischen erstem und letztem Bild: klein = Ende passt an den Anfang."""
    def bild(args):
        rc, out, err = lauf(["ffmpeg", "-v", "error"] + args + ["-i", video, "-frames:v", "1", "-an", "-vf",
                                                                "scale=54:96:flags=area,format=gray", "-f", "rawvideo", "-"])
        return out if len(out) == 54 * 96 else None
    a = bild([])
    b = bild(["-ss", f"{max(0.0, dauer - 0.12):.2f}"])
    if not a or not b:
        return None
    return r1(sum(abs(x - y) for x, y in zip(a, b)) / len(a), 1)


# ---------------------------------------------------------------- Bilder

def schrift_finden():
    return next((s for s in SCHRIFTEN if Path(s).exists()), None)


def drawtext(schrift, groesse, text="%{pts\\:hms}"):
    if not schrift:
        return ""
    return (f",drawtext=fontfile={filter_pfad(schrift)}:text='{text}':fontsize={groesse}:fontcolor=white:"
            f"box=1:boxcolor=black@0.65:boxborderw=4:x=6:y=6")


def bilder_erzeugen(video, ziel, dauer, schnitte, schrift):
    b = Path(ziel) / "bilder"
    b.mkdir(parents=True, exist_ok=True)
    for alt in b.glob("*.jpg"):
        alt.unlink()
    raster = "tile=4x5:padding=4:margin=4:color=0x202020"
    lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-vf", f"fps=1,scale=216:384:flags=area{drawtext(schrift, 20)},{raster}",
          "-q:v", "3", "-y", b / "kontakt_%02d.jpg"])
    lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-vf",
          f"trim=end=3,fps=4,scale=270:480:flags=area{drawtext(schrift, 22)},tile=4x3:padding=4:margin=4:color=0x202020",
          "-frames:v", "1", "-q:v", "3", "-y", b / "hook_0-3s.jpg"])
    if dauer > 3.5:
        lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-vf",
              f"trim=start=3:end=8,fps=2,scale=270:480:flags=area{drawtext(schrift, 22)},tile=5x2:padding=4:margin=4:color=0x202020",
              "-frames:v", "1", "-q:v", "3", "-y", b / "einstieg_3-8s.jpg"])
    lauf(["ffmpeg", "-v", "error", "-i", video, "-an", "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "2", "-y", b / "erstes_bild.jpg"])
    lauf(["ffmpeg", "-v", "error", "-ss", f"{max(0.0, dauer - 0.12):.2f}", "-i", video, "-an", "-frames:v", "1", "-vf", "scale=540:-2",
          "-q:v", "2", "-y", b / "letztes_bild.jpg"])
    if (b / "erstes_bild.jpg").exists() and (b / "letztes_bild.jpg").exists():
        lauf(["ffmpeg", "-v", "error", "-i", b / "erstes_bild.jpg", "-i", b / "letztes_bild.jpg", "-filter_complex",
              "[0]scale=270:-2[a];[1]scale=270:-2[b];[a][b]hstack", "-q:v", "3", "-y", b / "loop_anfang_ende.jpg"])
    # Vorher/Nachher je Schnitt bzw. Übergang
    with tempfile.TemporaryDirectory() as tmp:
        n = 0
        for s in schnitte[:MAX_SCHNITTBILDER]:
            for wann, t in (("vor", max(0.0, s["t"] - 0.15)), ("nach", min(dauer - 0.05, s["bis"] + 0.1))):
                etikett = "{} {:.2f} s".format(wann, s["t"])
                lauf(["ffmpeg", "-v", "error", "-ss", f"{t:.3f}", "-i", video, "-an", "-frames:v", "1", "-vf",
                      "scale=216:384:flags=area" + drawtext(schrift, 18, etikett), "-q:v", "3", "-y",
                      Path(tmp) / f"s_{n:03d}.jpg"])
                n += 1
        if n:
            lauf(["ffmpeg", "-v", "error", "-framerate", "1", "-i", Path(tmp) / "s_%03d.jpg", "-vf", raster, "-q:v", "3", "-y",
                  b / "schnitte_%02d.jpg"])
    # Frequenzachse logarithmisch (40 Hz–16 kHz): Stimme, Bass und Schläge unter 300 Hz werden lesbar (geprüft 07.11.2026)
    lauf(["ffmpeg", "-v", "error", "-i", video, "-vn", "-lavfi", "showspectrumpic=s=1600x512:legend=1:scale=log:fscale=log:start=40:stop=16000",
          "-y", b / "spektrum.png"])
    # Fein aufgelöste Ausschnitte je 10 s (Effekte, Anstiege und Musik-Einsätze ablesen)
    for alt in b.glob("spektrum_*.png"):
        alt.unlink()
    nr, t0 = 1, 0.0
    while t0 < dauer - 0.5:
        lauf(["ffmpeg", "-v", "error", "-ss", f"{t0:.2f}", "-t", "10", "-i", video, "-vn", "-lavfi",
              "showspectrumpic=s=1500x420:legend=1:scale=log:fscale=log:start=40:stop=16000", "-y", b / f"spektrum_{nr:02d}.png"])
        nr += 1
        t0 += 10.0
    return sorted(p.name for p in b.iterdir())


# ---------------------------------------------------------------- Zusammenführen

def messen(video, ziel, vid=None, modell=None, sprache="auto", mit_bildern=True):
    video, ziel = Path(video).resolve(), Path(ziel).resolve()
    ziel.mkdir(parents=True, exist_ok=True)
    for alt in ("transkript.srt", "transkript_woerter.srt"):
        if (ziel / alt).exists():
            (ziel / alt).unlink()
    info = probe(video)
    dauer = info["dauer_s"] or 0.0
    offen = []
    with tempfile.TemporaryDirectory() as tmp:
        bw = bildwerte(video, tmp)
        sch = schnitte_messen(video, tmp)
        if info["ton"]:
            laut, lverlauf = lautheit(video)
            voll = band(video, tmp, "voll", "")
            tief = band(video, tmp, "tief", "lowpass=f=150,lowpass=f=150")
            hell = band(video, tmp, "hell", "highpass=f=4000,highpass=f=4000")
            seite = band(video, tmp, "seite", "", seite=True) if (info["kanaele"] or 1) >= 2 else []
            sti = stille(video)
        else:
            laut, lverlauf, voll, tief, hell, seite, sti = {}, [], [], [], [], [], []
            offen.append("kein Ton im Video")
    stereo_db = r1(median([d for _, d in seite]) - median([d for _, d in voll]), 1) if seite and voll else None
    if seite and stereo_db is not None and stereo_db < -45:
        seite = []  # praktisch mono: Stereo-Anteil ist nur Rauschen
        offen.append("Mischung praktisch mono: Effekt-Kandidaten nur aus Sprechpausen bzw. der vollen Mischung")
    schwarz = schwarzbilder(video)
    woerter, fehler = (transkript(video, ziel, modell, sprache) if info["ton"] else (None, "kein Ton"))
    if fehler:
        offen.append("Transkript: " + fehler)
    woerter, ton_hinweise = sprache_trennen(woerter or [])
    seg = saetze_bilden(woerter)
    if seg:
        srt_schreiben(ziel / "transkript.srt", seg)
        # Whisper setzt Wortzeiten lückenlos; ein Klangteppich füllt die Pausen auch im Sprachband (getestet 07.11.2026: 0 von 15 gefunden)
        offen.append("Sprechpausen: nicht messbar (Wortzeiten lückenlos, Teppich/Musik füllt Pausen); im Spektrum an Lücken der Stimme ablesen")
    elif not fehler and info["ton"]:
        offen.append("keine Sprache erkannt (Video ohne Stimme oder nur Musik/Atmo)")
    farben = farbpalette(video)

    hart = [s for s in sch if s["art_S"] == "hart"]
    grenzen = [0.0] + [s["t"] for s in hart] + [dauer]
    einstellungen = [round(b - a, 2) for a, b in zip(grenzen, grenzen[1:]) if b - a > 0.05]
    bew_s = je_sekunde(bw, "bew", dauer)
    bew_med = median(bew_s)
    ruhig = [i for i, x in enumerate(bew_s) if x is not None and bew_med and x < RUHE_FAKTOR * bew_med]
    ruhe_bereiche = []
    for s in ruhig:
        if ruhe_bereiche and s == ruhe_bereiche[-1][1]:
            ruhe_bereiche[-1][1] = s + 1
        else:
            ruhe_bereiche.append([s, s + 1])
    hell_s = je_sekunde(bw, "hell", dauer)
    blitze = [r1(e["t"], 1) for i, e in enumerate(bw[1:-1], 1)
              if e["hell"] is not None and bw[i - 1]["hell"] is not None and e["hell"] - bw[i - 1]["hell"] >= 60]
    klang = klang_ereignisse(seite, voll, tief, hell, seg, stereo_db) if voll else []
    riser = anstiege(seite or hell) if (seite or hell) else []
    anschwellen = anstiege(voll, 6.0) if voll else []
    takt = takt_schaetzen(voll, tief) if voll else None
    n_woerter = len(woerter)
    sprech = (woerter[0][0], woerter[-1][1]) if woerter else None
    sti_summe = sum(s["bis"] - s["von"] for s in sti) if sti else 0.0

    def dr(werte, a, b):
        return mittel([x for i, x in enumerate(werte) if a <= i < b])
    dritt = [(0, dauer / 3), (dauer / 3, 2 * dauer / 3), (2 * dauer / 3, dauer + 1)]

    # Takt-Tabelle je 5 s
    tabelle = []
    t0 = 0.0
    while t0 < dauer - 0.25:
        t1 = min(dauer, t0 + FENSTER)
        zeile = {
            "von": r1(t0, 1), "bis": r1(t1, 1),
            "schnitte": sum(1 for s in hart if t0 <= s["t"] < t1),
            "uebergaenge": sum(1 for s in sch if s["art_S"] != "hart" and t0 <= s["t"] < t1),
            "bewegung": r1(mittel([e["bew"] for e in bw if t0 <= e["t"] < t1 and e["bew"] is not None]), 2),
            "helligkeit": r1(mittel([e["hell"] for e in bw if t0 <= e["t"] < t1]), 0),
            "lautheit_S": r1(mittel([s for t, m, s in lverlauf if t0 <= t < t1 and s > -70]), 1),
            "tief_db": r1(mittel([d for t, d in tief if t0 <= t < t1 and d > -100]), 1),
            "hell_db": r1(mittel([d for t, d in hell if t0 <= t < t1 and d > -100]), 1),
            "klang": sum(1 for k in klang if t0 <= k["t"] < t1),
            "woerter": sum(1 for a, b, t in woerter if t0 <= a < t1) if woerter else None,
        }
        tabelle.append(zeile)
        t0 += FENSTER
    for key in ("schnitte", "bewegung", "lautheit_S", "klang", "woerter"):
        w = [z[key] for z in tabelle if z[key] is not None]
        lo, hi = (min(w), max(w)) if w else (0, 0)
        for z in tabelle:
            z["_n_" + key] = None if z[key] is None else ((z[key] - lo) / (hi - lo) if hi > lo else 0.5)
    for z in tabelle:
        teile = [z[k] for k in list(z) if k.startswith("_n_") and z[k] is not None]
        z["intensitaet"] = r1(10 * sum(teile) / len(teile), 1) if teile else None
        for k in [k for k in z if k.startswith("_n_")]:
            del z[k]
    inten = [z["intensitaet"] for z in tabelle if z["intensitaet"] is not None]
    drittel_int = [mittel(inten[int(i * len(inten) / 3):int((i + 1) * len(inten) / 3)] or [None]) for i in range(3)] if inten else [None] * 3
    lauteste = max(((s, t) for t, m, s in lverlauf if s > -70), default=(None, None))

    m = {
        "id": vid or video.stem,
        "datei": video.name,
        "werkzeug": "rea-video/messen.py v1",
        "steckbrief": info,
        "schnitt": {
            "harte_schnitte": len(hart),
            "schnitte_pro_min": r1(len(hart) / dauer * 60, 1) if dauer else None,
            "erster_schnitt_s": hart[0]["t"] if hart else None,
            "einstellung_mittel_s": r1(mittel(einstellungen), 2),
            "einstellung_median_s": r1(median(einstellungen), 2),
            "einstellung_kuerzeste_s": min(einstellungen) if einstellungen else None,
            "einstellung_laengste_s": max(einstellungen) if einstellungen else None,
            "weiche_uebergaenge_S": sum(1 for s in sch if s["art_S"] != "hart"),
            "ereignisse": sch,
            "schwarzbilder": schwarz,
            "hell_blitze_s": blitze[:40],
        },
        "bewegung": {
            "median": r1(bew_med, 2),
            "einstieg_0_1s": r1(mittel(bew_s[:1]), 2),
            "einstieg_faktor": r1(mittel(bew_s[:2]) / bew_med, 2) if bew_med and bew_s[:2] and mittel(bew_s[:2]) is not None else None,
            "drittel": [r1(dr(bew_s, int(a), int(b)), 2) for a, b in dritt],
            "ruhige_sekunden": len(ruhig),
            "ruhige_anteil_prozent": r1(100 * len(ruhig) / max(1, len(bew_s)), 0),
            "ruhe_bereiche_s": ruhe_bereiche,
            "je_sekunde": bew_s,
        },
        "bild": {
            "helligkeit_mittel": r1(mittel(hell_s), 0),
            "helligkeit_drittel": [r1(dr(hell_s, int(a), int(b)), 0) for a, b in dritt],
            "saettigung_mittel": r1(mittel([e["satt"] for e in bw]), 1),
            "kontrast_median": r1(median([e["kontrast"] for e in bw]), 0),
            "farben": farben,
            "helligkeit_je_sekunde": hell_s,
            "loop_differenz": loop_differenz(video, dauer),
        },
        "ton": {
            **{k: r1(v, 1) for k, v in laut.items()},
            "einstieg_0_3s_S_lufs": r1(mittel([s for t, mm, s in lverlauf if t < 3 and s > -70]), 1),
            "lautester_moment_s": r1(lauteste[1], 1),
            "stille": sti,
            "stille_anteil_prozent": r1(100 * sti_summe / dauer, 1) if dauer else None,
            "stereo_anteil_db": stereo_db,
            "klang_ereignisse": len(klang),
            "klang_quellen": {q: sum(1 for k in klang if q in k["quelle"]) for q in sorted({q for k in klang for q in k["quelle"]})},
            "klang_pro_min": r1(len(klang) / dauer * 60, 1) if dauer else None,
            "klang_nach_art_S": {a: sum(1 for k in klang if k["art_S"] == a) for a in sorted({k["art_S"] for k in klang})},
            "klang_liste": klang[:150],
            "anstiege_S": riser,
            "anschwellen_S": anschwellen,
            "takt_S": takt,
            "kurzzeit_lautheit_je_sekunde": [r1(mittel([s for t, mm, s in lverlauf if int(t) == i and s > -70]), 1) for i in range(int(math.ceil(dauer)))],
        },
        "sprache": {
            "transkript": bool(woerter),
            "woerter": n_woerter if woerter else None,
            "woerter_pro_s": r1(n_woerter / (sprech[1] - sprech[0]), 2) if woerter and sprech[1] > sprech[0] else None,
            "sprechbeginn_s": r1(sprech[0], 2) if woerter else None,
            "sprechende_s": r1(sprech[1], 2) if woerter else None,
            "saetze": len(seg) if woerter else None,
            "woerter_je_satz_median": median([len(t.split()) for _, _, t in seg]) if seg else None,
            "erster_satz_ende_s": r1(seg[0][1], 2) if seg else None,
            "satzzeiten": [[r1(a, 2), r1(b, 2), len(t.split())] for a, b, t in seg],
            "ton_hinweise_whisper_S": ton_hinweise[:60],
        },
        "takt_tabelle": tabelle,
        "spannung": {
            "intensitaet_drittel": [r1(x, 1) for x in drittel_int],
            "einstieg_intensitaet": r1(mittel(inten[:2]), 1) if inten else None,
            "hoehepunkt_intensitaet": max(inten) if inten else None,
            "hoehepunkt_bei_s": next((z["von"] for z in tabelle if inten and z["intensitaet"] == max(inten)), None),
            "hoehepunkt_anteil_der_laenge_prozent": r1(100 * next((z["von"] for z in tabelle if inten and z["intensitaet"] == max(inten)), 0) / dauer, 0) if inten and dauer else None,
            "anstieg_einstieg_bis_hoehepunkt": r1(max(inten) - mittel(inten[:2]), 1) if inten else None,
        },
        "offen": offen + ["Text im Bild: keine Texterkennung, aus den Bildern lesen (raster.md G)",
                          "Stimmfarbe, Musikgenre und Art der Effekte: nur Schätzung aus Spektrum und Bändern (raster.md J)"],
    }
    if mit_bildern:
        m["bilder"] = bilder_erzeugen(video, ziel, dauer, sch, schrift_finden())
    (ziel / "messung.json").write_text(json.dumps(m, ensure_ascii=False, indent=1), encoding="utf-8")
    (ziel / "messung.md").write_text(bericht(m), encoding="utf-8")
    return m


def zeitliste(werte, n=12, fmt="{:.1f}"):
    w = list(werte)
    return ", ".join(fmt.format(x) for x in w[:n]) + (" …" if len(w) > n else "") if w else "–"


def bericht(m):
    st, sc, bw, bi, to, sp = m["steckbrief"], m["schnitt"], m["bewegung"], m["bild"], m["ton"], m["sprache"]
    d = st["dauer_s"] or 0
    schwarz_txt = zeitliste(["{}–{}".format(s["von"], s["bis"]) for s in sc["schwarzbilder"]], fmt="{}")
    riser_txt = zeitliste(["{}–{} s (+{} dB)".format(a["von"], a["bis"], a["anstieg_db"]) for a in to.get("anstiege_S", [])], 10, "{}")
    schwell_txt = zeitliste(["{}–{} s (+{} dB)".format(a["von"], a["bis"], a["anstieg_db"]) for a in to.get("anschwellen_S", [])], 10, "{}")
    z = [f"# Messung {m['id']} ({m['datei']})", "",
         "Alle Zahlen sind gemessen (F). Felder mit (S) sind Schätzungen aus Messwerten. Fremdes Material: bleibt lokal.", "",
         "## Steckbrief", "| Länge | Auflösung | Bilder/s | Ton | Größe |", "|---|---|---|---|---|",
         f"| {d:.1f} s | {st['breite']}×{st['hoehe']} | {st['fps']} | {'ja, ' + str(st['kanaele']) + ' Kanäle' if st['ton'] else 'nein'} | {st['groesse_mb']} MB |", "",
         "## Schnitt und Übergänge", "| Wert | Ist |", "|---|---|",
         f"| harte Schnitte | {sc['harte_schnitte']} ({sc['schnitte_pro_min']} je Minute) |",
         f"| erster Schnitt | {sc['erster_schnitt_s'] if sc['erster_schnitt_s'] is not None else '–'} s |",
         f"| Einstellungslänge Median / Mittel | {sc['einstellung_median_s']} s / {sc['einstellung_mittel_s']} s (kürzeste {sc['einstellung_kuerzeste_s']}, längste {sc['einstellung_laengste_s']}) |",
         f"| weiche Übergänge oder schnelle Bewegung (S, Sicht prüfen) | {sc['weiche_uebergaenge_S']} |",
         f"| Schwarzbilder | {schwarz_txt} |",
         f"| Helligkeitsblitze | {zeitliste(sc['hell_blitze_s'])} s |", "",
         "Schnitte und Übergänge (Zeit, Wert 0–100, Art S): " +
         zeitliste([f"{s['t']:.2f} ({s['wert']:.0f}, {s['art_S']})" for s in sc["ereignisse"]], 40, "{}"), "",
         "## Bewegung", "| Wert | Ist |", "|---|---|",
         f"| Median (mittlere Helligkeitsänderung je 0,1 s) | {bw['median']} |",
         f"| Einstieg 0–2 s im Verhältnis zum Median | {bw['einstieg_faktor']} × |",
         f"| Drittel 1 / 2 / 3 | {' / '.join(str(x) for x in bw['drittel'])} |",
         f"| ruhige Sekunden (< {int(RUHE_FAKTOR * 100)} % des Medians) | {bw['ruhige_sekunden']} ({bw['ruhige_anteil_prozent']} %): {zeitliste([f'{a}–{b}' for a, b in bw['ruhe_bereiche_s']], 10, '{}')} s |", "",
         "## Bild", "| Wert | Ist |", "|---|---|",
         f"| Helligkeit Mittel (0–255) / Drittel | {bi['helligkeit_mittel']} / {' · '.join(str(x) for x in bi['helligkeit_drittel'])} |",
         f"| Sättigung Mittel | {bi['saettigung_mittel']} |", f"| Kontrast (Median Hell-Dunkel-Spanne) | {bi['kontrast_median']} |",
         f"| Ende passt an Anfang (Loop-Differenz, klein = nahtlos) | {bi['loop_differenz']} |"]
    if bi.get("farben"):
        z += ["", "Farben gesamt: " + ", ".join(f"{f['hex']} {f['anteil_prozent']} %" for f in bi["farben"]["gesamt"])]
        for i, dr in enumerate(bi["farben"]["drittel"], 1):
            z.append(f"Drittel {i}: " + ", ".join(f"{f['hex']} {f['anteil_prozent']} %" for f in dr))
    z += ["", "## Ton"]
    if m["steckbrief"]["ton"]:
        takt = to.get("takt_S") or {}
        z += ["| Wert | Ist |", "|---|---|",
              f"| Lautheit integriert / LRA / True Peak | {to.get('lufs_integriert')} LUFS / {to.get('lra_lu')} LU / {to.get('true_peak_dbfs')} dBFS |",
              f"| Einstieg 0–3 s (Kurzzeit) | {to.get('einstieg_0_3s_S_lufs')} LUFS |",
              f"| lautester Moment | {to.get('lautester_moment_s')} s |",
              f"| Stille ≥ {STILLE_MIN} s unter {STILLE_DB} dB | {len(to['stille'])}× ({to['stille_anteil_prozent']} % der Länge) |",
              f"| Stereo-Anteil gegenüber der Mischung | {to.get('stereo_anteil_db')} dB (unter −45 dB = praktisch mono) |",
              f"| Effekt-Kandidaten (S; ≈ 3 von 4 echt, ≈ die Hälfte gefunden) | {to['klang_ereignisse']} ({to['klang_pro_min']} je Minute) · Quellen: {', '.join(f'{k}: {v}' for k, v in to['klang_quellen'].items()) or '–'} |",
              f"| nach Art (S) | {', '.join(f'{k}: {v}' for k, v in to['klang_nach_art_S'].items()) or '–'} |",
              f"| Anstiege/Riser im Stereo- bzw. Höhenanteil (S) | {riser_txt} |",
              f"| Anschwellen der Mischung ≥ 6 dB (S; Atmo, Musik, Druckwelle) | {schwell_txt} |",
              f"| Takt (S) | {str(takt.get('bpm_S')) + ' BPM, ' + takt.get('einordnung_S', '') if takt else '–'} |", "",
              "Effekt-Kandidaten (Zeit · Art S · unter Sprache): " +
              zeitliste([f"{k['t']:.2f} {k['art_S'].split(' ')[0]}{' ·Sprache' if k.get('in_sprache') else ''}" for k in to["klang_liste"]], 60, "{}"),
              "", "Die Effektliste ist eine Vorauswahl. Endgültig wird sie über die Spektrum-Ausschnitte (bilder/spektrum_NN.png) "
              "und, wo nötig, den Höreindruck des Inhabers (raster.md J, Hörprotokoll)."]
    else:
        z.append("kein Ton")
    z += ["", "## Sprache"]
    if sp["transkript"]:
        z += ["| Wert | Ist |", "|---|---|",
              f"| Wörter / Sätze | {sp['woerter']} / {sp['saetze']} (Median {sp['woerter_je_satz_median']} Wörter je Satz) |",
              f"| Sprechtempo | {sp['woerter_pro_s']} Wörter/s |",
              f"| erstes Wort / Ende erster Satz / letztes Wort | {sp['sprechbeginn_s']} s / {sp['erster_satz_ende_s']} s / {sp['sprechende_s']} s |",
              "", "Satzzeiten (Beginn–Ende · Wörter): " + zeitliste([f"{a}–{b} · {n}" for a, b, n in sp["satzzeiten"]], 40, "{}"), "",
              "Transkript: `transkript.srt` (Sätze) und `transkript_woerter.srt` (Wörter mit Zeiten; Wortbeginn im Median ±0,2 s). "
              "Nur lokal, nie ins Repo."]
    else:
        z.append("keine Sprache im Transkript (siehe „Offen“)")
    if sp.get("ton_hinweise_whisper_S"):
        z += ["", "Tonhinweise von Whisper (S, Beschreibung statt Sprache): " +
              zeitliste([f"{a}–{b} s {t}" for a, b, t in sp["ton_hinweise_whisper_S"]], 30, "{}")]
    z += ["", "## Takt-Tabelle (5-s-Fenster; Intensität = Mittel der relativen Werte im Video, 0–10)",
          "| Fenster | harte Schnitte | Übergänge (S) | Bewegung | Helligkeit | Lautheit S | Tiefen dB | Höhen dB | Effekte (S) | Wörter | Intensität |",
          "|---|---|---|---|---|---|---|---|---|---|---|"]
    for t in m["takt_tabelle"]:
        z.append(f"| {t['von']:.0f}–{t['bis']:.0f} s | {t['schnitte']} | {t['uebergaenge']} | {t['bewegung']} | {t['helligkeit']} | "
                 f"{t['lautheit_S']} | {t['tief_db']} | {t['hell_db']} | {t['klang']} | {'–' if t['woerter'] is None else t['woerter']} | {t['intensitaet']} |")
    s = m["spannung"]
    z += ["", f"Intensität je Drittel: {' / '.join(str(x) for x in s['intensitaet_drittel'])} · Einstieg (0–10 s) {s['einstieg_intensitaet']} · "
              f"Höhepunkt {s['hoehepunkt_intensitaet']} ab {s['hoehepunkt_bei_s']} s ({s['hoehepunkt_anteil_der_laenge_prozent']} % der Länge) · "
              f"Anstieg bis Höhepunkt {s['anstieg_einstieg_bis_hoehepunkt']}", ""]
    if m.get("bilder"):
        z += ["## Bilder (Ordner bilder/)",
              "- `kontakt_NN.jpg`: 1 Bild je Sekunde, 20 je Bogen (Bogen 01 = 0–19 s, 02 = 20–39 s …), Zeit oben links",
              "- `hook_0-3s.jpg`: alle 0,25 s · `einstieg_3-8s.jpg`: alle 0,5 s · `erstes_bild.jpg`, `letztes_bild.jpg`, `loop_anfang_ende.jpg`",
              "- `schnitte_NN.jpg`: je Schnitt/Übergang ein Paar „vor“/„nach“ (10 Paare je Bogen)",
              "- `spektrum.png`: Frequenzen über die ganze Länge · `spektrum_NN.png`: je 10 s fein (NN = 01 für 0–10 s, 02 für 10–20 s …)",
              "  Lesen: senkrechte helle Linie = Schlag/Pop/Klick · waagerechte Linie hoch oben = Ding/Glocke · breiter Rausch-Keil "
              "= Whoosh/Riser · gestapelte Wellenlinien unten = Stimme · gleichmäßiges Raster = Musik mit Takt", ""]
    z += ["## Offen (nicht messbar)"] + [f"- {o}" for o in m["offen"]]
    return "\n".join(z) + "\n"


# ---------------------------------------------------------------- Aufruf

def modell_finden(arg, arbeit):
    """--whisper-modell, dann REA_WHISPER_MODELL, dann <arbeitsordner>/_modelle, dann rea-video/_modelle neben dem Repo."""
    for kand in (arg, os.environ.get("REA_WHISPER_MODELL")):
        if kand and Path(kand).exists():
            return Path(kand)
    neben_repo = Path(__file__).resolve().parents[4].parent / "rea-video"
    for ordner in (Path(arbeit) if arbeit else None, neben_repo):
        if ordner and (ordner / "_modelle").exists():
            modelle = sorted((ordner / "_modelle").glob("ggml-*.bin"), key=lambda p: p.stat().st_size, reverse=True)
            if modelle:
                return modelle[0]
    return None


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="REA-Video · Messung")
    ap.add_argument("eingang")
    ap.add_argument("ausgabe", nargs="?")
    ap.add_argument("--id")
    ap.add_argument("--whisper-modell")
    ap.add_argument("--sprache", default="auto")
    ap.add_argument("--ohne-bilder", action="store_true")
    ap.add_argument("--neu", action="store_true")
    a = ap.parse_args()
    if not ffmpeg_vorhanden():
        sys.exit("ffmpeg/ffprobe fehlen (messung.md › Voraussetzungen)")
    eingang = Path(a.eingang).resolve()
    if eingang.is_dir():
        videos = sorted(p for p in (eingang / "videos").glob("*") if p.suffix.lower() in VIDEO_ENDUNGEN) if (eingang / "videos").is_dir() else []
        if not videos:
            sys.exit(f"keine Videos in {eingang / 'videos'}")
        modell = modell_finden(a.whisper_modell, eingang.parent)
        print(f"Korpus {eingang.name}: {len(videos)} Videos · Whisper: {modell.name if modell else 'kein Modell'}")
        for v in videos:
            ziel = eingang / "analysen" / v.stem
            if (ziel / "messung.json").exists() and not a.neu:
                print(f"  {v.stem}: schon gemessen (--neu misst erneut)")
                continue
            m = messen(v, ziel, v.stem, modell, a.sprache, not a.ohne_bilder)
            print(f"  {v.stem}: {m['steckbrief']['dauer_s']} s · {m['schnitt']['harte_schnitte']} Schnitte · "
                  f"{m['ton'].get('lufs_integriert')} LUFS · Wörter {m['sprache']['woerter']}")
    else:
        if not a.ausgabe:
            sys.exit("Ausgabeordner fehlt: python messen.py <video> <ausgabeordner>")
        modell = modell_finden(a.whisper_modell, Path(a.ausgabe).resolve().parent.parent.parent)
        m = messen(eingang, a.ausgabe, a.id, modell, a.sprache, not a.ohne_bilder)
        print(f"{m['id']}: {m['steckbrief']['dauer_s']} s · {m['schnitt']['harte_schnitte']} harte Schnitte · "
              f"{m['ton'].get('lufs_integriert')} LUFS · Klang-Ereignisse {m['ton'].get('klang_ereignisse')} · "
              f"Wörter {m['sprache']['woerter']} → {Path(a.ausgabe) / 'messung.md'}")


if __name__ == "__main__":
    main()
