#!/usr/bin/env python3
"""Prüft in etwa einer Minute, ob der Render-PC alles hat: Programme, Pakete, Git Bash, Supabase-Zugang und Grafikkarte.

Aufruf (im Ordner pipeline\\render_dienst):   python pc_test.py          (Windows auch:  py -3 pc_test.py)
Am Ende steht „ALLES BEREIT“ oder eine Liste dessen, was noch fehlt, mit dem Befehl, der es behebt. Nichts wird verändert,
außer einer winzigen Testdatei render/pc_test.json im Supabase-Bucket (wird sofort wieder gelöscht).
Anleitung: docs/18-render-pc.md
"""
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import speicher as sp
from dienst import bash_befehl, finde_bash, gpu_name, gpu_probe, ist_gpu, kind_env
from speicher import PIPELINE, PRAEFIX, REPO, maskiere, pb

ergebnisse = {"ok": 0, "warn": 0, "fehlt": 0}
todo = []


def ok(text):
    ergebnisse["ok"] += 1
    print(f"[OK]       {maskiere(text)}", flush=True)


def warn(text, hilfe=None):
    ergebnisse["warn"] += 1
    print(f"[WARNUNG]  {maskiere(text)}", flush=True)
    if hilfe:
        print(f"           -> {hilfe}", flush=True)


def fehlt(text, hilfe):
    ergebnisse["fehlt"] += 1
    todo.append((text, hilfe))
    print(f"[FEHLT]    {maskiere(text)}", flush=True)
    print(f"           -> {hilfe}", flush=True)


def kurz(befehl, timeout=60, **kw):
    try:
        r = subprocess.run(befehl, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout, env=kind_env(), **kw)
        return r.returncode, (r.stdout or "").strip(), (r.stderr or "").strip()
    except FileNotFoundError:
        return 127, "", "nicht gefunden"
    except subprocess.TimeoutExpired:
        return 124, "", "Zeitüberschreitung"


def version(text):
    m = re.search(r"(\d+)\.(\d+)", text or "")
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def main():
    sp.konsole_utf8()
    start = time.time()
    print(f"Render-PC-Test auf {platform.node()} ({platform.platform()})\nKlon: {REPO}\n", flush=True)

    # 1. Python
    if sys.version_info >= (3, 10):
        ok(f"Python {platform.python_version()} ({sys.executable})")
    else:
        fehlt(f"Python {platform.python_version()} ist zu alt (nötig: 3.10 oder neuer)", "winget install -e --id Python.Python.3.12  (danach ein neues Fenster öffnen)")
    try:
        import numpy
        ok(f"numpy {numpy.__version__} (für den Ton)")
    except ImportError:
        fehlt("numpy fehlt (Ton: klang.py, atmo.py)", f'"{sys.executable}" -m pip install numpy')

    # 2. Git und Klon
    c, out, _ = kurz(["git", "--version"])
    if c == 0:
        ok(out)
        c, url, _ = kurz(["git", "remote", "get-url", "origin"], cwd=str(REPO))
        if c == 0 and url:
            ok(f"Klon mit Quelle: {url}")
            c, _, err = kurz(["git", "ls-remote", "--heads", "origin"], timeout=60, cwd=str(REPO))
            if c == 0:
                ok("GitHub erreichbar (git ls-remote), kein Login nötig")
            else:
                fehlt(f"GitHub nicht erreichbar: {err[:150]}", "Internetverbindung, Firewall oder Proxy prüfen (docs/18, Fehlerbehebung)")
        else:
            fehlt("Dieser Ordner ist kein Git-Klon mit Quelle „origin“", "git clone https://github.com/Dagjori/tiktok-automation.git C:\\render\\tiktok-automation  (siehe docs/18)")
        mux = PIPELINE / "mux.sh"
        if mux.is_file() and b"\r\n" in mux.read_bytes():
            warn("mux.sh hat Windows-Zeilenenden (CRLF). Der Dienst repariert das bei jedem Auftrag selbst.", "Dauerhaft:  git config core.autocrlf false  und danach  git checkout -f -- pipeline/mux.sh")
        elif mux.is_file():
            ok("mux.sh hat Unix-Zeilenenden (LF)")
    else:
        fehlt("git nicht gefunden", "winget install -e --id Git.Git  (danach ein neues Fenster öffnen)")

    # 3. Node, npm, Pakete
    c, out, _ = kurz(["node", "--version"])
    if c == 0 and version(out) >= (20, 0):
        ok(f"Node.js {out}")
    elif c == 0:
        fehlt(f"Node.js {out} ist zu alt (nötig: 20 oder neuer)", "winget install -e --id OpenJS.NodeJS.LTS")
    else:
        fehlt("Node.js nicht gefunden", "winget install -e --id OpenJS.NodeJS.LTS  (danach ein neues Fenster öffnen)")
    npm = shutil.which("npm")
    if npm:
        ok("npm gefunden")
    else:
        fehlt("npm nicht gefunden", "kommt mit Node.js: winget install -e --id OpenJS.NodeJS.LTS")
    if (PIPELINE / "node_modules" / "three").is_dir():
        ok("npm-Pakete installiert (pipeline/node_modules/three)")
    else:
        fehlt("npm-Pakete fehlen (three, Schriften)", f'cd "{PIPELINE}"  und dann  npm install')

    # 4. ffmpeg
    for prog in ("ffmpeg", "ffprobe"):
        c, out, _ = kurz([prog, "-version"])
        if c == 0:
            ok(out.splitlines()[0][:90])
        else:
            fehlt(f"{prog} nicht gefunden", "winget install -e --id Gyan.FFmpeg  (danach ein neues Fenster öffnen)")
    c, out, _ = kurz(["ffmpeg", "-hide_banner", "-encoders"])
    if c == 0:
        if "libx264" in out:
            ok("ffmpeg kann H.264 (libx264)")
        else:
            fehlt("Dieses ffmpeg hat keinen H.264-Encoder (libx264)", "winget install -e --id Gyan.FFmpeg  (die Gyan-Version hat ihn)")

    # 5. Git Bash für mux.sh
    bash = finde_bash(os.environ.get("BASH_PFAD"))
    if not bash:
        fehlt("Git Bash (bash.exe) nicht gefunden (mux.sh ist ein Bash-Skript)", "winget install -e --id Git.Git  oder BASH_PFAD in .env setzen")
    else:
        ok(f"Bash gefunden: {bash}")
        c, out, err = kurz(bash_befehl(bash, "-c", 'echo bash-ok; command -v ffmpeg >/dev/null && echo ffmpeg-ok; command -v find >/dev/null && echo find-ok; "$PYTHON" -c "import numpy; print(\'numpy-ok\')"'))
        for erwartet, was, hilfe in (("bash-ok", "Bash startet", "Git for Windows neu installieren"),
                                     ("ffmpeg-ok", "ffmpeg ist aus Git Bash erreichbar", "ffmpeg in den PATH aufnehmen; Windows neu anmelden"),
                                     ("find-ok", "Unix-Werkzeuge (find, grep, sed) in Git Bash vorhanden", "Git for Windows neu installieren"),
                                     ("numpy-ok", "Python mit numpy ist aus Git Bash erreichbar (PYTHON)", f'"{sys.executable}" -m pip install numpy')):
            if erwartet in out:
                ok(was)
            else:
                fehlt(f"Git Bash: {was} fehlgeschlagen ({(err or out)[:120]})", hilfe)

    # 6. Platz
    frei = shutil.disk_usage(REPO).free / 1024 ** 3
    text = f"{frei:.0f} GB frei auf dem Laufwerk des Klons (ein Video braucht ca. 1 GB Bilder)"
    if frei >= 5:
        ok(text)
    elif frei >= 2:
        warn(text, "Festplatte aufräumen")
    else:
        fehlt(text, "Festplatte aufräumen")

    # 7. Supabase
    sp.lade_env()
    if not (Path(__file__).resolve().parent / ".env").is_file() and not os.environ.get("SUPABASE_URL"):
        fehlt("Datei pipeline\\render_dienst\\.env fehlt", "copy .env.beispiel .env  und SUPABASE_URL und SUPABASE_KEY eintragen (docs/18, Schritt 5)")
    else:
        try:
            s = sp.Speicher()
            hat_key = bool(os.environ.get("SUPABASE_KEY"))
            ok(f"Supabase-Adresse gesetzt (Bucket „{s.bucket}“), Schlüssel {'gesetzt' if hat_key else 'nicht gesetzt (in der Cloud setzt der Proxy ihn)'}")
            try:
                b = s.bucket_info()
                s.liste(PRAEFIX)
            except pb.Fehler as e:
                if hat_key:
                    raise
                raise pb.Fehler(f"{e} (SUPABASE_KEY fehlt in .env)")
            ok(f"Supabase erreicht, Bucket „{s.bucket}“ vorhanden ({'privat' if not b.get('public') else 'ÖFFENTLICH'}), Auflisten erlaubt")
            s.schreibe_json(f"{PRAEFIX}/pc_test.json", {"zeit": sp.iso(), "rechner": platform.node()})
            if (s.lese_json(f"{PRAEFIX}/pc_test.json") or {}).get("rechner") == platform.node():
                ok("Supabase: Schreiben, Lesen und Löschen funktioniert")
            else:
                fehlt("Supabase: Testdatei kann nicht gelesen werden", "Schlüssel prüfen (Secret key bzw. service_role, nicht der Publishable/anon-Schlüssel)")
            s.loesche([f"{PRAEFIX}/pc_test.json"])
        except pb.Fehler as e:
            fehlt(f"Supabase: {e}", "SUPABASE_URL und SUPABASE_KEY in .env prüfen (Secret key, nicht Publishable/anon; alter service_role-Schlüssel: zusätzlich SUPABASE_AUTH=bearer); Internet/Firewall prüfen (docs/18)")

    # 8. Grafikkarte
    print("\nGrafikkarte wird geprüft (Chromium startet kurz, ca. 10-30 Sekunden) ...", flush=True)
    info = gpu_probe(PIPELINE)
    fehler = info.get("fehler") or ""
    if "Cannot find module" in fehler or "playwright" in fehler.lower() and "find" in fehler.lower():
        fehlt("Playwright ist nicht installiert", "npm install -g playwright   und dann   npx playwright install chromium")
    elif "Executable doesn't exist" in fehler or "playwright install" in fehler:
        fehlt("Der Chromium-Browser für Playwright fehlt", "npx playwright install chromium")
    elif fehler:
        fehlt(f"WebGL-Test fehlgeschlagen: {fehler}", "Grafiktreiber aktualisieren; npx playwright install chromium; docs/18, Fehlerbehebung")
    elif ist_gpu(info):
        ok(f"GPU erkannt: {gpu_name(info)}")
        print(f"           WebGL-Renderer: {info.get('renderer')}  (WebGL2: {'ja' if info.get('webgl2') else 'nein'}, {info.get('ms', 0) / 1000:.0f} s)", flush=True)
    else:
        fehlt(f"KEINE echte Grafikkarte erkannt: {info.get('renderer')}",
              "Aktuellen Grafiktreiber installieren (NVIDIA/AMD/Intel), PC neu starten, Test wiederholen. Läuft der Test über Remote-Desktop, direkt am PC testen.")

    dauer = time.time() - start
    print(f"\n{ergebnisse['ok']} in Ordnung, {ergebnisse['warn']} Warnung(en), {ergebnisse['fehlt']} fehlt · {dauer:.0f} s", flush=True)
    if todo:
        print("\nNOCH ZU TUN:")
        for i, (text, hilfe) in enumerate(todo, 1):
            print(f"  {i}. {maskiere(text)}\n     {hilfe}")
        return 1
    print("\nALLES BEREIT. Dienst starten:  dienst_starten.bat  (Anleitung: docs/18-render-pc.md, Schritt 7)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
