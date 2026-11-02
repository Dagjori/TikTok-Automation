#!/usr/bin/env python3
"""Render-Dienst für den Windows-PC mit Grafikkarte (ohne KI, keine Token). Läuft dauerhaft und rendert Aufträge der Cloud-Sitzung.

Ablauf pro Auftrag (Auftrag kommt von auftrag.py über den Supabase-Bucket, Präfix render/):
    1. git fetch + Checkout des Commits aus dem Auftrag (Repo ist öffentlich, kein Login). Stimm-MP3s liegen im Repo.
    2. GPU-Prüfung: WebGL-Renderer auslesen (gpu_pruefung.mjs, dieselben Schalter wie render.js --gpu). SwiftShader/Software → Status „keine_gpu“.
    3. node render.js projekte/<name> --gpu [Optionen aus dem Auftrag]
    4. Ton und Mux wie im Skill:  Simulierbar:  ./mux.sh projekte/<name> [Ton-Optionen]
                                   stelldirvor.pov:  python atmo.py projekte/<name>  und  TON_FERTIG=1 LRA_ZIEL=20 ./mux.sh projekte/<name>
       mux.sh ist Bash und läuft unter Windows in Git Bash (wird automatisch gefunden); keine Logik doppelt.
    5. MP4 prüfen (ffprobe), bei > 48 MB verkleinerte Kopie wie post_buffer.py, Upload von video.mp4, ereignisse.json, renderzeit.json, log.txt.
Zusätzlich: Herzschlag jede Minute (render/herzschlag/<rechner>.json), Status je Auftrag (render/status/<id>.json).

Start:   python dienst.py                (Windows: dienst_starten.bat, startet nach Updates neu)
Test:    python dienst.py --cpu-erlaubt --repo <Klon> --einmal      (ohne Grafikkarte, z. B. in der Cloud; nur für Tests)
Zugang:  pipeline/render_dienst/.env mit SUPABASE_URL und SUPABASE_KEY (Vorlage .env.beispiel).
Python:  3.10+, nur Standardbibliothek + pipeline/post_buffer.py; für den Ton auf dem PC: pip install numpy.
Beenden: Strg+C. Ein unterbrochener Auftrag wird beim nächsten Start fortgesetzt (--nur-fehlende).
"""
import argparse
import hashlib
import json
import os
import platform
import queue
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

import speicher as sp
from speicher import PRAEFIX, iso, maskiere, pb, sauber

DIENST_VERSION = "1.0"
EXIT_NEUSTART = 75                  # dienst_starten.bat startet bei diesem Code neu (Update des Dienstes)
KONTEN = ("simulierbar", "stelldirvor.pov")
MAX_STILLE_MIN = 25                 # so lange darf ein Unterprozess ohne jede Ausgabe laufen
SOFTWARE_RENDERER = re.compile(r"swiftshader|llvmpipe|softpipe|basic render|\bwarp\b|software", re.I)
RE_DAUER = re.compile(r"Dauer ([\d.]+) s · (\d+) Bilder gesamt · rendere (\d+) \((\d+)–(\d+)\)")
RE_FORTSCHRITT = re.compile(r"^\s*(\d+)/(\d+) ·.*?Rest ca\. ([\d.]+) min")
RE_FERTIG = re.compile(r"Fertig: (\d+) Bilder in ([\d.]+) min \(([\d.]+) s/Bild effektiv; je Bild im Worker: Rendern (\d+) ms, Screenshot (\d+) ms\)")
MB = pb.MB


class DienstFehler(Exception):
    """Abbruch eines Auftrags mit lesbarer Meldung."""


class KeineGpu(Exception):
    pass


# ───────────────────────── Werkzeuge finden ─────────────────────────

def finde_bash(vorgabe=None):
    """Windows: Git Bash (NICHT C:\\Windows\\System32\\bash.exe, das ist WSL). Sonst bash aus dem PATH."""
    if os.name != "nt":
        return shutil.which("bash") or "bash"
    kandidaten = [Path(p) for p in (vorgabe, os.environ.get("BASH_PFAD")) if p]
    for var in ("ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"):
        basis = os.environ.get(var)
        if basis:
            kandidaten += [Path(basis) / "Git" / "bin" / "bash.exe", Path(basis) / "Programs" / "Git" / "bin" / "bash.exe"]
    git = shutil.which("git")
    if git:
        g = Path(git).resolve()
        kandidaten += [g.parent.parent / "bin" / "bash.exe", g.parent.parent / "usr" / "bin" / "bash.exe"]
    for k in kandidaten:
        if k.is_file():
            return str(k)
    return None


def bash_befehl(bash, skript, *args):
    """Befehlsliste für ein Bash-Skript. Windows: Login-Shell, damit /usr/bin (find, grep, sed …) vor den Windows-Programmen im PATH steht."""
    if os.name == "nt":
        return [bash, "--login", skript, *args]
    return [bash, skript, *args]


def kind_env(extra=None):
    """Umgebung für Unterprozesse: UTF-8 (Windows-Konsolen nutzen sonst cp1252), kein Git-Passwort-Dialog, Python für mux.sh, Git Bash bleibt im Ordner."""
    env = os.environ.copy()
    env.update({"PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8", "GIT_TERMINAL_PROMPT": "0", "PYTHON": sys.executable, "CHERE_INVOKING": "1"})
    env.update(extra or {})
    return env


def gpu_probe(pipeline, cpu=False, timeout=180, skript=None):
    """Startet gpu_pruefung.mjs und gibt das Ergebnis als dict zurück (renderer, vendor, webgl2, software oder fehler)."""
    node = shutil.which("node")
    if not node:
        return {"fehler": "Node.js nicht gefunden (PATH)"}
    skript = Path(skript) if skript else Path(__file__).resolve().with_name("gpu_pruefung.mjs")
    try:
        lauf = subprocess.run([node, str(skript)] + (["--cpu"] if cpu else []), cwd=str(pipeline), capture_output=True, text=True,
                              encoding="utf-8", errors="replace", timeout=timeout, env=kind_env())
    except subprocess.TimeoutExpired:
        return {"fehler": f"GPU-Prüfung nach {timeout} s abgebrochen"}
    for zeile in reversed((lauf.stdout or "").splitlines()):
        if zeile.startswith("GPU_JSON:"):
            try:
                return json.loads(zeile[len("GPU_JSON:"):])
            except ValueError:
                break
    rest = (lauf.stderr or lauf.stdout or "").strip().splitlines()
    return {"fehler": (rest[-1] if rest else f"Exit-Code {lauf.returncode}")[:300]}


def ist_gpu(info):
    return bool(info) and not info.get("fehler") and not info.get("software") and not SOFTWARE_RENDERER.search(str(info.get("renderer", "")))


def gpu_name(info):
    if not info:
        return "unbekannt"
    if info.get("fehler"):
        return f"keine ({info['fehler'][:80]})"
    r = str(info.get("renderer", "?"))
    m = re.match(r"ANGLE \((.*)\)$", r)
    if m:  # „ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)“ → Name
        teile = [t.strip() for t in m.group(1).split(",")]
        r = teile[1] if len(teile) > 1 else teile[0]
        r = re.sub(r"\s+Direct3D\d*.*$", "", r)
    return r


# ───────────────────────── Optionen aus dem Auftrag ─────────────────────────

def render_args(opt):
    """Whitelist der Optionen von render.js; alles andere wird ignoriert bzw. abgelehnt."""
    a = []

    def zahl(schluessel, flag, typ, lo, hi):
        if opt.get(schluessel) is None:
            return
        try:
            wert = typ(opt[schluessel])
        except (TypeError, ValueError):
            raise DienstFehler(f"Option {schluessel} ist keine Zahl: {opt[schluessel]!r}")
        if not lo <= wert <= hi:
            raise DienstFehler(f"Option {schluessel}={wert} liegt außerhalb {lo}–{hi}")
        a.extend([flag, str(wert)])

    zahl("von", "--von", float, 0, 3600)
    zahl("bis", "--bis", float, 0, 3600)
    zahl("worker", "--worker", int, 1, 8)
    zahl("qualitaet", "--qualitaet", int, 1, 100)
    zahl("fps", "--fps", float, 1, 120)
    if opt.get("format") is not None:
        if opt["format"] not in ("jpg", "png"):
            raise DienstFehler(f"Option format={opt['format']!r} (erlaubt: jpg, png)")
        a.extend(["--format", opt["format"]])
    if opt.get("query"):
        if not re.fullmatch(r"[A-Za-z0-9_=&.,-]{1,200}", str(opt["query"])):
            raise DienstFehler("Option query enthält unerlaubte Zeichen")
        a.extend(["--query", str(opt["query"])])
    if opt.get("bilder"):
        try:
            a.extend(["--bilder", ",".join(str(int(x)) for x in opt["bilder"])])
        except (TypeError, ValueError):
            raise DienstFehler("Option bilder muss eine Liste ganzer Zahlen sein")
    return a


def ton_args(liste):
    out = []
    for x in liste or []:
        if not re.fullmatch(r"[A-Za-z0-9_.,:=+-]{1,60}", str(x)):
            raise DienstFehler(f"Ton-Option {x!r} enthält unerlaubte Zeichen")
        out.append(str(x))
    return out


# ───────────────────────── Dienst ─────────────────────────

class Dienst:
    def __init__(self, args):
        self.args = args
        self.repo = Path(args.repo).resolve()
        self.pipeline = self.repo / "pipeline"
        if not (self.pipeline / "render.js").is_file():
            raise DienstFehler(f"{self.pipeline} enthält kein render.js (falscher --repo?)")
        self.arbeit = self.pipeline / "out" / "_render_dienst"
        ersterstart = not (self.arbeit / "zustand.json").exists()
        self.arbeit.mkdir(parents=True, exist_ok=True)
        # Die Sonde liegt außerhalb des Git-Stands, damit sie auch nach dem Checkout eines älteren Commits vorhanden ist
        self.sonde_skript = self.arbeit / "gpu_pruefung.mjs"
        shutil.copyfile(Path(__file__).resolve().with_name("gpu_pruefung.mjs"), self.sonde_skript)
        self.rechner = sauber(args.rechnername or os.environ.get("RECHNERNAME") or socket.gethostname())
        self.sp = sp.verbinde()
        self.env = kind_env()
        self.bash = finde_bash(args.bash)
        self.node = shutil.which("node")
        self.npm = shutil.which("npm")
        self.hb = {"status": "bereit", "auftrag": None, "prozent": None, "gpu": None, "gpu_ok": None}
        self.hb_lock = threading.Lock()
        self.stop = threading.Event()
        self.erledigt = set()
        self.log_handle = None
        self.status = {}
        self._status_t = 0.0
        self._log_frame_t = 0.0
        self.render_info = {}
        self.dienst_hash = self.hash_dienstdateien()
        if ersterstart:
            try:
                offen = self.git("status", "--porcelain", "--untracked-files=no", check=False, timeout=60).stdout.strip()
            except DienstFehler:
                offen = ""
            if offen:
                raise DienstFehler("Dieser Klon hat nicht gesicherte Änderungen. Der Dienst setzt den Klon bei jedem Auftrag zurück (git checkout -f). "
                                   "Bitte nur in einem eigenen Klon starten (docs/18-render-pc.md) oder mit --repo einen anderen Klon angeben.")
        self.ruhebranch = self.bestimme_ruhebranch()
        self.bucket_limit = None

    # ── Ausgabe ──
    def log(self, text, still=False):
        zeile = f"{time.strftime('%H:%M:%S')} {maskiere(text)}"
        if self.log_handle:
            try:
                self.log_handle.write(zeile + "\n")
                self.log_handle.flush()
            except OSError:
                pass
        if not still:
            print(zeile, flush=True)

    # ── Herzschlag ──
    def hb_setzen(self, **felder):
        with self.hb_lock:
            self.hb.update(felder)

    def herzschlag_schreiben(self):
        with self.hb_lock:
            daten = dict(self.hb)
        daten.update(zeit=iso(), epoch=int(time.time()), rechner=self.rechner, version=DIENST_VERSION, system=platform.platform(),
                     python=platform.python_version(), cpu_erlaubt=bool(self.args.cpu_erlaubt), ruhebranch=self.ruhebranch, head=self.head_kurz())
        self.sp.schreibe_json(f"{PRAEFIX}/herzschlag/{self.rechner}.json", daten)

    def herzschlag_thread(self):
        while not self.stop.wait(self.args.herzschlag):
            try:
                self.herzschlag_schreiben()
            except Exception as e:  # Netz weg: weiter versuchen, nie den Dienst beenden
                print(f"{time.strftime('%H:%M:%S')} Herzschlag nicht geschrieben: {maskiere(e)}", flush=True)

    # ── Git ──
    def git(self, *a, check=True, timeout=900):
        try:
            r = subprocess.run(["git", *a], cwd=str(self.repo), capture_output=True, text=True, encoding="utf-8", errors="replace", env=self.env, timeout=timeout)
        except FileNotFoundError:
            raise DienstFehler("git nicht gefunden (PATH). Git for Windows installieren.")
        if check and r.returncode != 0:
            raise DienstFehler(f"git {' '.join(a)} fehlgeschlagen: {(r.stderr or r.stdout).strip()[:400]}")
        return r

    def head_kurz(self):
        try:
            return self.git("rev-parse", "--short", "HEAD", check=False, timeout=20).stdout.strip() or "?"
        except Exception:
            return "?"

    def bestimme_ruhebranch(self):
        datei = self.arbeit / "zustand.json"
        zustand = {}
        try:
            zustand = json.loads(datei.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
        branch = self.args.branch or ""
        if not branch:
            try:
                b = self.git("rev-parse", "--abbrev-ref", "HEAD", check=False, timeout=20).stdout.strip()
            except Exception:
                b = ""
            branch = b if b and b != "HEAD" else zustand.get("ruhebranch", "main")
        if zustand.get("ruhebranch") != branch:
            try:
                datei.write_text(json.dumps({**zustand, "ruhebranch": branch}), encoding="utf-8")
            except OSError:
                pass
        return branch

    def git_auf_commit(self, commit):
        r = self.git("fetch", "--prune", "origin", check=False)
        if r.returncode != 0:
            self.log(f"git fetch fehlgeschlagen ({(r.stderr or '').strip()[:200]}); versuche mit dem vorhandenen Stand")
        if self.git("cat-file", "-e", f"{commit}^{{commit}}", check=False, timeout=30).returncode != 0:
            self.git("fetch", "origin", commit)
        self.git("checkout", "-f", "--detach", commit)
        self.log(f"Stand {commit[:10]} ausgecheckt")

    def ruhezustand(self):
        """Zurück auf den Hauptzweig, damit der Dienst selbst (dienst.py …) nach einem Auftrag nicht auf einem alten Stand liegt."""
        try:
            self.git("checkout", "-f", self.ruhebranch, check=False, timeout=120)
            self.git("merge", "--ff-only", f"origin/{self.ruhebranch}", check=False, timeout=120)
        except Exception as e:
            self.log(f"Rückkehr auf {self.ruhebranch} nicht möglich: {e}")

    def hash_dienstdateien(self):
        h = hashlib.sha256()
        hier = Path(__file__).resolve().parent
        for d in sorted(list(hier.glob("*.py")) + list(hier.glob("*.mjs")) + list(hier.glob("*.bat")) + [hier.parent / "post_buffer.py"]):
            try:
                h.update(d.name.encode() + d.read_bytes())
            except OSError:
                pass
        return h.hexdigest()

    def selbst_aktualisieren(self):
        """Im Leerlauf: neuen Stand holen. Hat sich der Dienst selbst geändert, Neustart (Exit 75, dienst_starten.bat startet neu)."""
        if self.args.keine_selbstaktualisierung or self.repo != sp.REPO:
            return False
        try:
            if self.git("fetch", "--prune", "origin", check=False).returncode != 0:
                return False
            self.ruhezustand()
        except Exception as e:
            self.log(f"Aktualisierung nicht möglich: {e}")
            return False
        if self.hash_dienstdateien() != self.dienst_hash:
            self.log("Der Dienst wurde aktualisiert, starte neu …")
            return True
        return False

    # ── Werkzeuge im Repo ──
    def npm_pruefen(self):
        sperre = self.pipeline / "package-lock.json"
        marker = self.arbeit / "npm_hash.txt"
        aktuell = sp.sha256(sperre) if sperre.is_file() else ""
        alt = marker.read_text(encoding="utf-8").strip() if marker.is_file() else None
        fehlt = not (self.pipeline / "node_modules").exists()
        if fehlt or (alt is not None and alt != aktuell):
            if not self.npm:
                raise DienstFehler("npm nicht gefunden (PATH). Node.js installieren.")
            self.log("npm install (node_modules fehlen oder package-lock.json hat sich geändert) …")
            if self.lauf([self.npm, "install", "--no-audit", "--no-fund"], self.pipeline) != 0:
                raise DienstFehler("npm install fehlgeschlagen")
        marker.write_text(aktuell, encoding="utf-8")

    def lf_reparieren(self):
        """mux.sh mit Windows-Zeilenenden (CRLF, git autocrlf) bricht in Bash mit „$'\\r': command not found“ ab."""
        for name in ("mux.sh",):
            d = self.pipeline / name
            try:
                roh = d.read_bytes()
            except OSError:
                continue
            if b"\r\n" in roh:
                d.write_bytes(roh.replace(b"\r\n", b"\n"))
                self.log(f"{name}: Windows-Zeilenenden in Unix-Zeilenenden umgewandelt")

    # ── Unterprozesse ──
    def lauf(self, befehl, cwd, env=None, on_zeile=None, max_stille=MAX_STILLE_MIN * 60):
        self.log("$ " + " ".join(str(b) for b in befehl))
        kw = dict(cwd=str(cwd), env=env or self.env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8",
                  errors="replace", bufsize=1)
        if os.name == "nt":
            kw["creationflags"] = 0x00000200 | (0x00004000 if self.args.prio_niedrig else 0)  # eigene Prozessgruppe, ggf. „unter normal“
        else:
            kw["start_new_session"] = True
            if self.args.prio_niedrig:
                kw["preexec_fn"] = lambda: os.nice(10)
        try:
            p = subprocess.Popen([str(b) for b in befehl], **kw)
        except FileNotFoundError as e:
            raise DienstFehler(f"Programm nicht gefunden: {befehl[0]} ({e})")
        q = queue.Queue()

        def leser():
            for z in p.stdout:
                q.put(z)
            q.put(None)

        threading.Thread(target=leser, daemon=True).start()
        letzte = time.time()
        try:
            while True:
                try:
                    z = q.get(timeout=5)
                except queue.Empty:
                    if time.time() - letzte > max_stille:
                        self.beende(p)
                        raise DienstFehler(f"Keine Ausgabe seit {max_stille // 60} Minuten (hängt?): {befehl[0]} abgebrochen")
                    continue
                if z is None:
                    break
                letzte = time.time()
                z = z.rstrip("\r\n")
                if not z:
                    continue
                if re.match(r"^(frame|size)=", z):  # ffmpeg -stats: nur alle 20 s ins Log
                    if time.time() - self._log_frame_t > 20:
                        self._log_frame_t = time.time()
                        self.log(z)
                else:
                    self.log(z)
                if on_zeile:
                    on_zeile(z)
            return p.wait()
        except BaseException:
            if p.poll() is None:
                self.beende(p)
            raise

    @staticmethod
    def beende(p):
        try:
            if os.name == "nt":
                subprocess.run(["taskkill", "/PID", str(p.pid), "/T", "/F"], capture_output=True)
            else:
                os.killpg(os.getpgid(p.pid), signal.SIGKILL)
        except Exception:
            try:
                p.kill()
            except Exception:
                pass

    # ── Status ──
    def status_senden(self, erzwingen=False):
        if not erzwingen and time.time() - self._status_t < 15:
            return
        self._status_t = time.time()
        self.status["aktualisiert"] = iso()
        try:
            self.sp.schreibe_json(f"{PRAEFIX}/status/{self.status['id']}.json", self.status)
        except pb.Fehler as e:
            self.log(f"Status nicht geschrieben: {e}")

    def phase(self, name, prozent=None, **extra):
        self.status.update(phase=name, **extra)
        if prozent is not None:
            self.status["prozent"] = round(prozent, 1)
        self.log(f"== {name} ({self.status.get('prozent', 0):.0f} %)")
        self.status_senden(True)
        self.hb_setzen(prozent=self.status.get("prozent"))

    # ── Aufträge ──
    def naechster_auftrag(self):
        eintraege = self.sp.liste(f"{PRAEFIX}/auftraege")
        for name in sorted(e["name"] for e in eintraege if e.get("id") and e["name"].endswith(".json")):
            id_ = name[:-5]
            if id_ in self.erledigt:
                continue
            st = self.sp.lese_json(f"{PRAEFIX}/status/{id_}.json") or {}
            zustand = st.get("status", "wartet")
            if zustand in sp.ENDZUSTAENDE:
                self.erledigt.add(id_)
                continue
            if zustand == "laeuft" and st.get("rechner") != self.rechner:
                continue
            auftrag = self.sp.lese_json(f"{PRAEFIX}/auftraege/{id_}.json")
            if not isinstance(auftrag, dict):
                continue
            auftrag["id"] = id_
            auftrag["_alt"] = st
            return auftrag
        return None

    def pruefe_auftrag(self, a):
        if a.get("konto") not in KONTEN:
            raise DienstFehler(f"Konto {a.get('konto')!r} unbekannt (erlaubt: {', '.join(KONTEN)})")
        if not re.fullmatch(r"[A-Za-z0-9_.-]{1,80}", str(a.get("projekt", ""))):
            raise DienstFehler(f"Projektname {a.get('projekt')!r} ungültig")
        if not re.fullmatch(r"[0-9a-f]{40}", str(a.get("commit", ""))):
            raise DienstFehler("Commit-Hash fehlt oder ist nicht 40-stellig")
        render_args(a.get("optionen") or {})
        ton_args((a.get("ton") or {}).get("mux_args"))

    def gpu_entscheiden(self):
        """GPU-Prüfung vor jedem Auftrag. Rückgabe: (modus, info) mit modus „gpu“ oder „cpu“ (nur mit --cpu-erlaubt)."""
        info = gpu_probe(self.pipeline, skript=self.sonde_skript)
        name = gpu_name(info)
        self.log(f"WebGL-Renderer: {info.get('renderer') or info.get('fehler')} → {name}")
        self.hb_setzen(gpu=name, gpu_ok=ist_gpu(info))
        if ist_gpu(info):
            return "gpu", info
        if self.args.cpu_erlaubt:
            cpu = gpu_probe(self.pipeline, cpu=True, skript=self.sonde_skript)
            self.log(f"Keine Grafikkarte, --cpu-erlaubt: rendere mit SwiftShader ({cpu.get('renderer') or cpu.get('fehler')})")
            return "cpu", cpu
        raise KeineGpu(f"Keine echte Grafikkarte erkannt (WebGL: {info.get('renderer') or info.get('fehler')}). Treiber prüfen, siehe docs/18-render-pc.md.")

    def bearbeite(self, auftrag):
        id_ = auftrag["id"]
        alt = auftrag.get("_alt") or {}
        fortsetzen = alt.get("status") == "laeuft" and alt.get("rechner") == self.rechner
        self.status = {"id": id_, "projekt": auftrag.get("projekt"), "konto": auftrag.get("konto"), "commit": auftrag.get("commit"),
                       "status": "laeuft", "phase": "vorbereiten", "prozent": 0, "rechner": self.rechner, "version": DIENST_VERSION,
                       "gestartet": iso(), "modus": None, "gpu": None}
        self.render_info = {}
        self.log_handle = open(self.arbeit / f"{id_}.log", "a" if fortsetzen else "w", encoding="utf-8")
        self.log(f"Auftrag {id_}: {auftrag.get('projekt')} ({auftrag.get('konto')}), Commit {str(auftrag.get('commit'))[:10]}{' (Fortsetzung)' if fortsetzen else ''}")
        self.hb_setzen(status="rendert", auftrag=id_, prozent=0)
        self.schlafsperre(True)
        t_start = time.time()
        zeiten = {}
        try:
            self.pruefe_auftrag(auftrag)
            self.phase("vorbereiten", 0)
            t = time.time()
            modus, info = self.gpu_entscheiden()          # zuerst: ohne Grafikkarte lohnt sich nichts anderes
            self.status.update(modus=modus, gpu=gpu_name(info), renderer=info.get("renderer"))
            self.git_auf_commit(auftrag["commit"])
            self.lf_reparieren()
            self.npm_pruefen()
            zeiten["vorbereiten_s"] = round(time.time() - t, 1)

            t = time.time()
            self.render(auftrag, modus, fortsetzen)
            zeiten["rendern_s"] = round(time.time() - t, 1)

            t = time.time()
            video = self.ton_und_mux(auftrag)
            zeiten["ton_mux_s"] = round(time.time() - t, 1)

            t = time.time()
            self.phase("hochladen", 96)
            dateien = self.hochladen(auftrag, video, {**zeiten, "gesamt_bisher_s": round(time.time() - t_start, 1)})
            zeiten["hochladen_s"] = round(time.time() - t, 1)
            zeiten["gesamt_s"] = round(time.time() - t_start, 1)
            self.status.update(status="fertig", phase="fertig", prozent=100, dateien=dateien, renderzeit={**self.render_info, **zeiten}, beendet=iso())
            self.log(f"Fertig in {zeiten['gesamt_s'] / 60:.1f} min")
            self.status_senden(True)
        except KeineGpu as e:
            self.log(f"ABGELEHNT: {e}")
            self.status.update(status="keine_gpu", phase="abgelehnt", fehler=str(e), beendet=iso())
            self.fehler_hochladen(id_)
            self.status_senden(True)
        except BaseException as e:
            unterbrochen = isinstance(e, (KeyboardInterrupt, SystemExit))
            self.log(f"FEHLER: {type(e).__name__}: {e}")
            if unterbrochen:
                self.log("Dienst wurde beendet; der Auftrag wird beim nächsten Start fortgesetzt.")
                self.status.update(phase="unterbrochen")
                self.status_senden(True)
                raise
            self.status.update(status="fehler", fehler=maskiere(str(e))[:600], beendet=iso())
            self.fehler_hochladen(id_)
            self.status_senden(True)
        finally:
            self.schlafsperre(False)
            if self.status.get("status") in sp.ENDZUSTAENDE:
                self.erledigt.add(id_)
            if self.log_handle:
                self.log_handle.close()
                self.log_handle = None
            self.hb_setzen(status="bereit", auftrag=None, prozent=None)
            self.ruhezustand()

    # ── Schritte ──
    def render(self, auftrag, modus, fortsetzen):
        p, opt = auftrag["projekt"], auftrag.get("optionen") or {}
        out = self.pipeline / "out" / p
        marker = out / "auftrag_pc.json"
        gleich = False
        if fortsetzen and marker.is_file():
            try:
                m = json.loads(marker.read_text(encoding="utf-8"))
                gleich = m.get("id") == auftrag["id"] and m.get("commit") == auftrag["commit"]
            except (OSError, ValueError):
                pass
        if not gleich:
            shutil.rmtree(out / "frames", ignore_errors=True)
            for f in (f"{p}.mp4", "vorschau_ohne_ton.mp4", "ton.wav", "ton_norm.wav"):
                (out / f).unlink(missing_ok=True)
        out.mkdir(parents=True, exist_ok=True)
        if gleich:  # Fortsetzung nach Abbruch: die zuletzt geschriebenen Bilder können halb sein → neu rendern lassen
            letzte = sorted((out / "frames").glob("f_*"), key=lambda f: f.stat().st_mtime)[-8:]
            for f in letzte:
                f.unlink(missing_ok=True)
            self.log(f"Fortsetzung: {len(letzte)} zuletzt geschriebene Bilder werden neu gerendert, der Rest bleibt")
        marker.write_text(json.dumps({"id": auftrag["id"], "commit": auftrag["commit"]}), encoding="utf-8")
        if not (self.pipeline / "projekte" / p / "szene.html").is_file():
            raise DienstFehler(f"pipeline/projekte/{p}/szene.html gibt es im Commit {auftrag['commit'][:10]} nicht")
        a = render_args(opt)
        if "--worker" not in a:
            a += ["--worker", "2" if modus == "gpu" else "1"]
        befehl = [self.node or "node", "render.js", f"projekte/{p}", *a, *(["--gpu"] if modus == "gpu" else []), *(["--nur-fehlende"] if gleich else [])]
        info = {"bereich": None, "gesamt": 0, "zu_rendern": 0}

        def zeile(z):
            m = RE_DAUER.search(z)
            if m:
                info.update(dauer=float(m[1]), gesamt=int(m[2]), zu_rendern=int(m[3]), bereich=(int(m[4]), int(m[5])))
                self.render_info.update(dauer_s=float(m[1]), bilder_gesamt=int(m[2]))
            m = RE_FORTSCHRITT.match(z)
            if m:
                fertig, total, rest = int(m[1]), int(m[2]), float(m[3])
                anteil = fertig / max(1, total)
                self.status.update(bilder=[fertig, total], rest_min=round(rest, 1), prozent=round(2 + 88 * anteil, 1))
                self.hb_setzen(prozent=self.status["prozent"])
                self.status_senden()
            m = RE_FERTIG.search(z)
            if m:
                self.render_info.update(bilder=int(m[1]), render_min=float(m[2]), s_pro_bild=float(m[3]), ms_rendern=int(m[4]), ms_screenshot=int(m[5]))

        self.phase("rendern", 2, modus=modus)
        code = self.lauf(befehl, self.pipeline, on_zeile=zeile)
        if code != 0:
            raise DienstFehler(f"render.js endete mit Exit-Code {code}")
        self.render_info.update(modus=modus, gpu=self.status.get("gpu"), worker=int(a[a.index("--worker") + 1]), fps=float(opt.get("fps") or 30))
        if info["bereich"] and not opt.get("bilder"):
            von, bis = info["bereich"]
            fmt = opt.get("format") or "jpg"
            fehlend = [f for f in range(von, bis + 1) if not (out / "frames" / f"f_{f:05d}.{fmt}").exists()]
            if fehlend:
                raise DienstFehler(f"{len(fehlend)} Bilder fehlen nach dem Rendern (erstes: {fehlend[0]})")
            self.render_info["bereich"] = [von, bis]

    def ton_und_mux(self, auftrag):
        p, opt, ton = auftrag["projekt"], auftrag.get("optionen") or {}, auftrag.get("ton") or {}
        out = self.pipeline / "out" / p
        if not self.bash:
            raise DienstFehler("Git Bash (bash.exe) nicht gefunden. Git for Windows installieren oder BASH_PFAD in .env setzen.")
        ohne_ton = bool(ton.get("ohne_ton")) or float(opt.get("von") or 0) > 0   # Ausschnitt ab Bild > 0: Ton passt nicht
        env = dict(self.env)
        mux = []
        if ohne_ton:
            mux = ["--ohne-ton"]
            self.status["hinweis"] = "stumme Vorschau (--ohne-ton)"
        elif auftrag["konto"] == "stelldirvor.pov":
            self.phase("ton", 90)
            if self.lauf([sys.executable, "atmo.py", f"projekte/{p}"], self.pipeline) != 0:
                raise DienstFehler("atmo.py (Atmo-Spur) fehlgeschlagen. Ist numpy installiert (pip install numpy)?")
            env.update(TON_FERTIG="1", LRA_ZIEL="20")
        else:
            mux = ton_args(ton.get("mux_args"))
        self.phase("mux", 92 if not ohne_ton else 90)
        if self.lauf(bash_befehl(self.bash, "mux.sh", f"projekte/{p}", *mux), self.pipeline, env=env) != 0:
            raise DienstFehler("mux.sh fehlgeschlagen (siehe Log). Fehlt numpy für den Ton, ffmpeg oder Git Bash?")
        video = out / ("vorschau_ohne_ton.mp4" if ohne_ton else f"{p}.mp4")
        if not video.is_file():
            raise DienstFehler(f"mux.sh hat {video.name} nicht erzeugt")
        return video

    def hochladen(self, auftrag, video, zeiten):
        p, id_ = auftrag["projekt"], auftrag["id"]
        out = self.pipeline / "out" / p
        bericht = pb.Bericht()
        s = pb.sonde(video)
        if (s["breite"], s["hoehe"]) != (pb.BREITE, pb.HOEHE):
            raise DienstFehler(f"Video ist {s['breite']}x{s['hoehe']}, erwartet {pb.BREITE}x{pb.HOEHE}")
        bereich = self.render_info.get("bereich")
        if bereich and not (auftrag.get("optionen") or {}).get("bilder"):
            erwartet = (bereich[1] - bereich[0] + 1) / self.render_info.get("fps", 30)
            if abs(s["dauer"] - erwartet) > 1.0 and float((auftrag.get("optionen") or {}).get("von") or 0) == 0:
                raise DienstFehler(f"Video dauert {s['dauer']:.1f} s, erwartet {erwartet:.1f} s")
        if self.bucket_limit is None:
            try:
                self.bucket_limit = int(self.sp.bucket_info().get("file_size_limit") or 0)
            except Exception:
                self.bucket_limit = 0
        max_bytes = self.args.max_mb * MB if not self.bucket_limit else min(self.args.max_mb * MB, self.bucket_limit - MB)
        upload, verkleinert = video, False
        if s["groesse"] > max_bytes:
            self.phase("verkleinern", 95, original_mb=round(s["groesse"] / MB, 1))
            upload = pb.komprimiere(video, s, self.pipeline / "out" / "_buffer" / f"{video.stem}_upload.mp4", int(max_bytes), int(min(pb.ZIEL_MB * MB, max_bytes * 0.95)), "medium", bericht)
            verkleinert = True
        u = pb.sonde(upload)
        base = f"{PRAEFIX}/fertig/{id_}"
        self.phase("hochladen", 97)
        self.sp.lade_hoch(f"{base}/video.mp4", upload, "video/mp4")
        dateien = {"video": {"name": video.name, "bytes": u["groesse"], "sha256": sp.sha256(upload), "dauer_s": round(u["dauer"], 2),
                             "breite": u["breite"], "hoehe": u["hoehe"], "verkleinert": verkleinert, "original_bytes": s["groesse"]}}
        for quelle, ziel in ((out / "ereignisse.json", "ereignisse.json"),):
            if quelle.is_file():
                self.sp.lade_hoch(f"{base}/{ziel}", quelle, "application/json")
                dateien[ziel] = {"bytes": quelle.stat().st_size, "sha256": sp.sha256(quelle)}
        rz = self.arbeit / f"{id_}_renderzeit.json"
        rz.write_text(json.dumps({**self.render_info, **zeiten, "auftrag": id_, "projekt": p, "rechner": self.rechner, "version": DIENST_VERSION}, indent=1, ensure_ascii=False), encoding="utf-8")
        self.sp.lade_hoch(f"{base}/renderzeit.json", rz, "application/json")
        dateien["renderzeit.json"] = {"bytes": rz.stat().st_size}
        self.log_hochladen(id_, dateien)
        return dateien

    def log_hochladen(self, id_, dateien=None):
        if not self.log_handle:
            return
        self.log_handle.flush()
        quelle = self.arbeit / f"{id_}.log"
        try:
            roh = quelle.read_bytes()
            if len(roh) > 1_500_000:
                roh = b"... (gekuerzt) ...\n" + roh[-1_500_000:]
            teil = self.arbeit / f"{id_}_log_upload.txt"
            teil.write_bytes(maskiere(roh.decode("utf-8", "replace")).encode("utf-8"))
            self.sp.lade_hoch(f"{PRAEFIX}/fertig/{id_}/log.txt", teil, "text/plain")
            if dateien is not None:
                dateien["log.txt"] = {"bytes": teil.stat().st_size}
        except (OSError, pb.Fehler) as e:
            self.log(f"Log nicht hochgeladen: {e}")

    def fehler_hochladen(self, id_):
        self.log_hochladen(id_)

    @staticmethod
    def schlafsperre(an):
        """Windows: Ruhezustand/Standby verhindern, solange ein Auftrag läuft (SetThreadExecutionState)."""
        if os.name != "nt":
            return
        try:
            import ctypes
            ctypes.windll.kernel32.SetThreadExecutionState(0x80000000 | (0x00000001 if an else 0))
        except Exception:
            pass

    # ── Hauptschleife ──
    def start(self):
        self.log(f"Render-Dienst {DIENST_VERSION} auf {self.rechner} · Repo {self.repo} · Zweig {self.ruhebranch} · Python {platform.python_version()}")
        if self.args.cpu_erlaubt:
            self.log("ACHTUNG: --cpu-erlaubt (nur für Tests): ohne Grafikkarte wird mit SwiftShader gerendert.")
        for was, wo in (("git", shutil.which("git")), ("node", self.node), ("ffmpeg", shutil.which("ffmpeg")), ("ffprobe", shutil.which("ffprobe"))):
            if not wo:
                self.log(f"WARNUNG: {was} nicht im PATH")
        if os.name == "nt" and not self.bash:
            self.log("WARNUNG: Git Bash nicht gefunden (mux.sh läuft nicht). Git for Windows installieren.")
        self.ruhezustand()
        info = gpu_probe(self.pipeline, skript=self.sonde_skript)
        self.hb_setzen(gpu=gpu_name(info), gpu_ok=ist_gpu(info))
        self.log(f"GPU: {gpu_name(info)}{'' if ist_gpu(info) else ('  (keine echte Grafikkarte, CPU-Modus erlaubt)' if self.args.cpu_erlaubt else '  (KEINE echte Grafikkarte: Aufträge werden abgelehnt)')}")
        self.herzschlag_schreiben()
        threading.Thread(target=self.herzschlag_thread, daemon=True).start()
        self.log("Bereit. Warte auf Aufträge …")

    def lauf_schleife(self):
        letzte_aktualisierung = time.time()
        fehler_serie = 0
        while not self.stop.is_set():
            try:
                auftrag = self.naechster_auftrag()
                fehler_serie = 0
            except pb.Fehler as e:
                fehler_serie += 1
                if fehler_serie in (1, 5) or fehler_serie % 20 == 0:
                    self.log(f"Auftragsliste nicht lesbar ({fehler_serie}. Versuch): {e}")
                auftrag = None
            if auftrag:
                self.bearbeite(auftrag)
                continue
            if self.args.einmal:
                return 0
            if time.time() - letzte_aktualisierung > 600:
                letzte_aktualisierung = time.time()
                if self.selbst_aktualisieren():
                    return EXIT_NEUSTART
            self.stop.wait(self.args.intervall)
        return 0

    def beenden(self):
        self.stop.set()
        self.hb_setzen(status="beendet", auftrag=None, prozent=None)
        try:
            self.herzschlag_schreiben()
        except Exception:
            pass


def sperre_holen(pfad):
    """Nur eine Instanz je Klon. Gibt das offene Datei-Objekt zurück (Sperre gilt, solange der Prozess lebt) oder None."""
    f = open(pfad, "a+")
    try:
        if os.name == "nt":
            import msvcrt
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        f.close()
        return None
    return f


def main():
    sp.konsole_utf8()
    p = argparse.ArgumentParser(description="Render-Dienst (PC mit Grafikkarte)")
    p.add_argument("--repo", default=str(sp.REPO), help="Klon, in dem gerendert wird (Standard: das Repo, in dem dienst.py liegt)")
    p.add_argument("--intervall", type=float, default=30, help="Sekunden zwischen zwei Abfragen (Standard 30)")
    p.add_argument("--herzschlag", type=float, default=60, help="Sekunden zwischen zwei Herzschlägen (Standard 60)")
    p.add_argument("--cpu-erlaubt", action="store_true", help="NUR FÜR TESTS: auch ohne Grafikkarte rendern (SwiftShader)")
    p.add_argument("--einmal", action="store_true", help="wartende Aufträge abarbeiten und beenden (Test)")
    p.add_argument("--max-mb", type=float, default=pb.MAX_MB, help=f"ab dieser Dateigröße entsteht eine verkleinerte Upload-Kopie (Standard {pb.MAX_MB}, Bucket-Limit 50 MB)")
    p.add_argument("--prio-niedrig", action="store_true", help="Render-Prozesse mit niedriger Priorität (PC bleibt flüssig bedienbar)")
    p.add_argument("--branch", default=None, help="Zweig, auf den der Dienst zwischen den Aufträgen zurückkehrt (Standard: der beim Start ausgecheckte, sonst main)")
    p.add_argument("--bash", default=None, help="Pfad zu bash.exe (Git Bash), sonst automatisch")
    p.add_argument("--rechnername", default=None)
    p.add_argument("--keine-selbstaktualisierung", action="store_true")
    args = p.parse_args()
    sp.lade_env()
    try:
        dienst = Dienst(args)
    except (DienstFehler, pb.Fehler) as e:
        print(f"FEHLER: {maskiere(e)}")
        return 1
    sperre = sperre_holen(dienst.arbeit / "dienst.lock")
    if sperre is None:
        print("Der Render-Dienst läuft in diesem Klon schon (zweites Fenster?). Beende mich.")
        return 0
    def beendet(*_):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, beendet)
    code = 0
    try:
        dienst.start()
        code = dienst.lauf_schleife()
    except KeyboardInterrupt:
        dienst.log("Beendet (Strg+C).")
    except (DienstFehler, pb.Fehler) as e:
        dienst.log(f"FEHLER: {e}")
        code = 1
    finally:
        dienst.beenden()
    return code


if __name__ == "__main__":
    sys.exit(main())
