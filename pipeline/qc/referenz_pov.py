#!/usr/bin/env python3
"""Prüfung für das Referenzformat von Account 2 @stelldirvor.pov (docs/16 §12, Skill .claude/skills/stelldirvor-video/pruefung.md):
feste Ich-Perspektive, keine Stimme, Titelfrage, Messwert-Anzeige, kursive Sätze, Abspann.

Aufruf:  python3 qc/referenz_pov.py projekte/<name> [--video out/<name>/<name>.mp4] [--json]
Daten:   out/<name>/ereignisse.json (Ereignis-Protokoll der Szene, von render.js geschrieben) und – falls vorhanden – das MP4 (Länge, Lautheit,
         Lautheitsverlauf mit ffmpeg/ffprobe). Exit-Code 1, wenn ein Pflichtpunkt „nein“ ist.
Prüft:   Länge 80 ± 0,5 s · Titel nur in 0–4,4 s · Messwert-Anzeige vorhanden, Zahl ändert sich, Etikett wechselt 2–4×, „HIER“ beim Höhepunkt ·
         keine Stimme · kein „5 Sekunden“-Rahmen in Text, Skript und Szene · 12–18 Sätze mit 3–9 Wörtern,
         jeder mindestens 3 s sichtbar, keine Überlappung der Sätze · keine Sticker, Chips, Karaoke, Folgen-Aufruf, Zähler-Ringe im Protokoll ·
         Abspann ab 72 s mindestens 7 s · Lautheit −14 ± 1 LUFS integriert · Verlauf: Start leiser als Höhepunkt (55–65 s), Abspann leise.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent


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

    def z(nr, punkt, ist, ziel, ok, pflicht=True):
        zeilen.append((nr, punkt, ist, ziel, ok, pflicht))

    # Länge
    dauer_prot = float(erg["dauer"])
    if video.exists():
        d, w, h, fps, hat_ton = ffprobe_dauer(video)
        z("1", "Länge des MP4", f"{d:.2f} s ({w}×{h}, {fps})", "80 ± 0,5 s, 1080×1920", abs(d - 80) <= 0.5 and (w, h) == (1080, 1920))
        z("1b", "Tonspur vorhanden", "ja" if hat_ton else "nein", "ja", hat_ton)
    else:
        z("1", "Länge laut Protokoll", f"{dauer_prot:.2f} s", "80 ± 0,5 s", abs(dauer_prot - 80) <= 0.5)
    # Titel
    titel = [e for e in ev if e["typ"] == "titel"]
    ok = len(titel) == 1 and titel[0]["t"] >= 0 and titel[0]["t"] + titel[0].get("dauer", 0) <= 4.45
    z("2", "Titelfrage nur in 0–4,4 s (wie Referenz)", ", ".join(f"{e['t']:.2f}–{e['t'] + e.get('dauer', 0):.2f} s" for e in titel) or "fehlt", "genau einmal, ≤ 4,4 s", ok)
    # Messwert-Anzeige
    an = [e for e in ev if e["typ"] == "anzeige"]
    werte = [e["wert"] for e in an if e.get("wert") is not None]
    wechsel = sum(1 for a, b in zip(an, an[1:]) if a["etikett"] != b["etikett"])
    aend = sum(1 for a, b in zip(an, an[1:]) if a["wert"] != b["wert"])
    z("3", "Messwert-Anzeige vorhanden", f"{len(an)} Messpunkte, {an[0]['t']:.1f}–{an[-1]['t']:.1f} s" if an else "fehlt", "ab ≤ 4,5 s bis ≥ 68 s", bool(an) and an[0]["t"] <= 4.5 and an[-1]["t"] >= 68)
    z("3b", "Zahl ändert sich (live)", f"{aend} von {max(1, len(an) - 1)} Schritten, min {min(werte):g}, max {max(werte):g}" if an else "–", "ändert sich in ≥ 60 % der Schritte", bool(an) and aend >= 0.6 * (len(an) - 1))
    z("3c", "Etikett wechselt mit der Phase", f"{wechsel}×", "2–4×", 2 <= wechsel <= 4)
    hier = [e for e in an if 52 <= e["t"] <= 68 and (str(e.get("zahl", "")).strip().upper() == "HIER" or e.get("wert") == 0)]
    z("3d", "Höhepunkt: Anzeige zeigt „HIER“ bzw. 0", f"ab {hier[0]['t']:.1f} s" if hier else "nicht gefunden", "zwischen 52 und 68 s", bool(hier))
    # keine Stimme
    stimme = (projekt / "audio" / "stimme.mp3").exists()
    ms = erg.get("massstab") or {}
    z("8", "Keine Stimme, keine Untertitel", "stimme.mp3 vorhanden" if stimme else ("Untertitel gesetzt" if ms.get("untertitel") else "keine"), "keine", not stimme and not ms.get("untertitel"))
    # kein „5 Sekunden“-Rahmen (Inhaber 02.11.)
    muster = re.compile(r"(\b5|fünf|\bfuenf)[\s\-]*(sek|s\b)", re.I)
    texte = [str(e.get(k, "")) for e in ev for k in ("text", "etikett", "zahl", "unter", "fakt")]
    treffer = [x for x in texte if muster.search(x)]
    for datei in ("skript.json", "szene.js"):
        if (projekt / datei).exists():
            inhalt = (projekt / datei).read_text(encoding="utf-8")
            treffer += [f"{datei}: {m.group(0)}" for m in re.finditer(r"(\b5|fünf|fuenf)[\s\-]*sekunden", inhalt, re.I)]
    z("9", "Kein „5 Sekunden“-Rahmen", ", ".join(sorted(set(treffer)))[:60] if treffer else "keiner", "keiner", not treffer)
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
    z("4e", "Sätze zwischen Titel und Abblende", f"{erster:.1f}–{letzter:.1f} s", "ab ≥ 4,4 s, bis ≤ 70 s", erster >= 4.4 and letzter <= 70.0 + 1e-6)
    # Verbotene Elemente
    verboten = sorted({e["typ"] for e in ev if e["typ"] in ("chip", "stempel", "sticker", "folgen", "ring", "tafel", "untertitel", "karaoke", "titel-wort", "pointe", "formel", "bilanz", "balken", "leiste", "zaehler", "uhr", "logo")})
    z("5", "Keine Sticker, Chips, Karaoke, Folgen-Aufruf, Ringe", ", ".join(verboten) if verboten else "keine", "keine", not verboten)
    z("5b", "Keine Schnitte (eine Einstellung)", "keine Übergänge im Protokoll" if not [e for e in ev if e["typ"] in ("uebergang", "schnitt")] else "Übergang vorhanden", "keine", not [e for e in ev if e["typ"] in ("uebergang", "schnitt")])
    # Abspann
    ab = [e for e in ev if e["typ"] == "abspann"]
    z("6", "Abspann ab 72 s, mindestens 7 s", ", ".join(f"{e['t']:.1f}+{e['dauer']:.1f} s" for e in ab) or "fehlt", "t ≤ 72,05, Dauer ≥ 7", bool(ab) and ab[0]["t"] <= 72.05 and ab[0]["dauer"] >= 7.0 - 1e-6)
    z("6b", "Abspann: Titelfrage plus Faktenzeile", "ja" if ab and ab[0].get("text") and ab[0].get("fakt") else "nein", "ja", bool(ab) and bool(ab[0].get("text")) and bool(ab[0].get("fakt")))
    abl = [e for e in ev if e["typ"] == "abblende"]
    z("6c", "Abblende auf Schwarz 70–72 s", ", ".join(f"{e['t']:.1f}+{e['dauer']:.1f} s" for e in abl) or "fehlt", "70–72 s", bool(abl) and abs(abl[0]["t"] - 70) < 0.05 and abs(abl[0]["t"] + abl[0]["dauer"] - 72) < 0.05)
    # Lautheit
    if video.exists():
        I, TP, verlauf = lautheit(video)
        z("7", "Lautheit integriert", f"{I:.1f} LUFS, True Peak {TP:.1f} dBTP" if I is not None else "nicht messbar", "−14 ± 1 LUFS, ≤ −1 dBTP", I is not None and abs(I + 14) <= 1.0 and (TP is None or TP <= -1.0))
        start = mittel_s(verlauf, 4, 28); mitte = mittel_s(verlauf, 30, 50); hoch = max((s for t, m, s in verlauf if 52 <= t <= 68), default=None); abspann = mittel_s(verlauf, 73, 79)
        hoch_t = max(((s, t) for t, m, s in verlauf if 0 <= t <= 80 if s > -100), default=(None, None))[1]
        z("7b", "Verlauf: Höhepunkt bei 55–65 s", f"Maximum (kurzzeitig) bei {hoch_t:.1f} s: {hoch:.1f} LUFS, Start {start:.1f}, Mitte {mitte:.1f}" if hoch is not None and start is not None else "–", "Maximum in 52–68 s, ≥ 4 dB über dem Start", hoch is not None and hoch_t is not None and 52 <= hoch_t <= 68 and hoch >= start + 4)
        z("7c", "Verlauf: Abspann leise", f"{abspann:.1f} LUFS (kurzzeitig), Start {start:.1f}" if abspann is not None else "–", "mind. 6 dB unter dem Start", abspann is not None and abspann <= start - 6)
    else:
        z("7", "Lautheit (MP4 fehlt)", "–", "−14 ± 1 LUFS", False)

    br = [max(len(str(c[i])) for c in zeilen) for i in range(4)]
    print(f"Referenzformat-Prüfung · {name}")
    print(" | ".join(["Nr ", "Prüfpunkt".ljust(min(br[1], 46)), "Ist".ljust(min(br[2], 60)), "Ziel", "ok"]))
    for nr, punkt, ist, ziel, ok, pflicht in zeilen:
        print(" | ".join([str(nr).ljust(3), punkt.ljust(min(br[1], 46)), str(ist).ljust(min(br[2], 60)), ziel, "ja" if ok else "NEIN" if pflicht else "nein (Hinweis)"]))
    schlecht = [x for x in zeilen if x[5] and not x[4]]
    print(f"\nPflichtpunkte: {sum(1 for x in zeilen if x[5] and x[4])} von {sum(1 for x in zeilen if x[5])} ja")
    if "--json" in args:
        print(json.dumps([dict(nr=a, punkt=b, ist=str(c), ziel=d, ok=e) for a, b, c, d, e, f in zeilen], ensure_ascii=False))
    sys.exit(1 if schlecht else 0)


if __name__ == "__main__":
    main()
