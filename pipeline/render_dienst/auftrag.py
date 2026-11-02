#!/usr/bin/env python3
"""Render-Aufträge an den Windows-PC senden, abfragen und das fertige MP4 holen (läuft in der Cloud-Sitzung, nur Standardbibliothek).

    python3 pipeline/render_dienst/auftrag.py pc                              Herzschlag des PCs (online? GPU? beschäftigt?)
    python3 pipeline/render_dienst/auftrag.py senden <projekt> --konto simulierbar|stelldirvor.pov [Optionen]
    python3 pipeline/render_dienst/auftrag.py status [<id>] [--alle] [--json]
    python3 pipeline/render_dienst/auftrag.py warten [<id>]                   blockiert bis fertig/Fehler, holt das MP4, löscht danach in Supabase
    python3 pipeline/render_dienst/auftrag.py aufraeumen [--alles]            liegengebliebene Dateien unter render/ löschen

Zugang: Umgebungsvariable SUPABASE_URL (Cloud; steht nicht im Repo). Der Proxy setzt den Header apikey. Siehe speicher.py.

Rückfall: Ist der Herzschlag älter als 5 Minuten (oder meldet der PC keine Grafikkarte), endet `senden` mit Exit-Code 3 („PC offline“).
Dann rendert die Sitzung wie bisher in der Cloud (node render.js … ohne --gpu).

Exit-Codes: 0 ok · 1 Fehler (Render fehlgeschlagen, Netzwerk …) · 2 Voraussetzung nicht erfüllt (Commit nicht gepusht, Änderungen nicht committet …)
            3 PC offline/ausgefallen · 4 Zeitüberschreitung beim Warten · 5 PC hat keine Grafikkarte (Status „keine_gpu“)
Lange Aufträge (bis ca. 1 Stunde auf dem PC): `warten` im Hintergrund starten (Bash run_in_background), dann braucht die Sitzung keine Tokens zum Warten.
"""
import argparse
import datetime
import json
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path

import speicher as sp
from speicher import PIPELINE, PRAEFIX, REPO, ausgabe, iso, jetzt, pb

KONTEN = ("simulierbar", "stelldirvor.pov")
LOKAL = PIPELINE / "out" / "_render"            # Merkzettel der gesendeten Aufträge (out/ steht in .gitignore)
EXIT_VORAUSSETZUNG, EXIT_OFFLINE, EXIT_ZEIT, EXIT_KEINE_GPU = 2, 3, 4, 5


class Abbruch(Exception):
    def __init__(self, text, code=1):
        super().__init__(text)
        self.code = code


def git(*a):
    return subprocess.run(["git", *a], cwd=str(REPO), capture_output=True, text=True, encoding="utf-8", errors="replace")


def minuten(s):
    return f"{s / 60:.0f} Min." if s >= 90 else f"{s:.0f} s"


# ───────────────────────── pc ─────────────────────────

def beschreibe_pc(h):
    d = h["daten"]
    zustand = "ONLINE" if h["online"] else ("beendet" if d.get("status") == "beendet" else "OFFLINE")
    teile = [f"{h['rechner']}: {zustand} (Herzschlag vor {minuten(h['alter_s'])})", f"GPU {d.get('gpu') or '?'}"]
    if d.get("cpu_erlaubt"):
        teile.append("CPU-Test-Modus")
    if d.get("status") == "rendert":
        teile.append(f"rendert {d.get('auftrag')} ({d.get('prozent') or 0:.0f} %)")
    else:
        teile.append(str(d.get("status") or "?"))
    teile.append(f"Dienst {d.get('version', '?')}, Stand {d.get('head', '?')}")
    return " · ".join(teile)


def befehl_pc(args, s):
    hb = s.herzschlaege()
    if not hb:
        ausgabe("Kein Herzschlag vorhanden: Der Render-Dienst auf dem PC wurde noch nie gestartet.")
        return EXIT_OFFLINE
    for h in hb:
        ausgabe(beschreibe_pc(h))
    if args.json:
        ausgabe(json.dumps([{**h["daten"], "alter_s": round(h["alter_s"]), "online": h["online"]} for h in hb], ensure_ascii=False, indent=1))
    return 0 if any(h["online"] for h in hb) else EXIT_OFFLINE


# ───────────────────────── senden ─────────────────────────

def pruefe_projekt(args, commit):
    """Alles, was der PC aus dem Commit braucht, muss im Commit stehen (der PC sieht nur GitHub, nicht diese Sitzung)."""
    p = args.projekt
    wurzel = f"pipeline/projekte/{p}"
    probleme = []

    def im_commit(pfad):
        return git("cat-file", "-e", f"{commit}:{pfad}").returncode == 0

    for d in ("szene.html", "szene.js"):
        if not im_commit(f"{wurzel}/{d}"):
            probleme.append(f"{wurzel}/{d} fehlt im Commit {commit[:10]}")
    if args.konto == "simulierbar":
        roh = git("show", f"{commit}:{wurzel}/skript.json")
        try:
            hat_stimme = bool(json.loads(roh.stdout).get("segmente"))
        except ValueError:
            hat_stimme = False
        if hat_stimme:
            for d in ("audio/stimme.mp3", "audio/timing.json"):
                if not im_commit(f"{wurzel}/{d}"):
                    probleme.append(f"{wurzel}/{d} fehlt im Commit (Stimme committen und pushen, sonst rendert der PC ohne die echte Stimme)")
        else:
            ausgabe("Hinweis: skript.json ohne Sprecher-Segmente (Demo): kein Stimmenabgleich.")
    elif not im_commit(f"{wurzel}/ton.json"):
        probleme.append(f"{wurzel}/ton.json fehlt im Commit (Atmo-Spur für Account 2)")
    return probleme


def pruefe_commit(args):
    r = git("rev-parse", "--verify", f"{args.commit or 'HEAD'}^{{commit}}")
    if r.returncode != 0:
        raise Abbruch(f"Commit {args.commit!r} unbekannt", EXIT_VORAUSSETZUNG)
    commit = r.stdout.strip()
    f = git("fetch", "--quiet", "origin")
    if f.returncode != 0:
        ausgabe(f"Hinweis: git fetch fehlgeschlagen ({f.stderr.strip()[:120]}); prüfe gegen die vorhandenen Remote-Zweige.")
    zweige = [z.strip() for z in git("branch", "-r", "--contains", commit).stdout.splitlines() if z.strip() and "->" not in z]
    if not zweige:
        raise Abbruch(f"Commit {commit[:10]} ist nicht auf GitHub. Zuerst committen und pushen (git push), der PC holt den Stand von dort.", EXIT_VORAUSSETZUNG)
    if not args.trotz_aenderungen:
        relevant = [f"pipeline/projekte/{args.projekt}", "pipeline/engine", "pipeline/render.js", "pipeline/mux.sh", "pipeline/klang.py",
                    "pipeline/atmo.py", "pipeline/package.json", "pipeline/package-lock.json"]
        st = git("status", "--porcelain", "--untracked-files=all", "--", *relevant, ":(exclude)pipeline/projekte/*/audio/ereignisse.json",
                 ":(exclude)pipeline/projekte/*/audio/timing_schaetzung.json")
        if st.stdout.strip():
            zeilen = st.stdout.strip().splitlines()
            raise Abbruch("Es gibt Änderungen, die nicht im Commit stehen (der PC rendert nur den Commit):\n  " + "\n  ".join(zeilen[:8])
                          + ("\n  …" if len(zeilen) > 8 else "") + "\nErst committen und pushen oder mit --trotz-aenderungen bewusst ignorieren.", EXIT_VORAUSSETZUNG)
    return commit, zweige[0]


def warteschlange(s):
    """Wie viele Aufträge liegen vor uns (nicht beendet)?"""
    offen = []
    for e in s.liste(f"{PRAEFIX}/auftraege"):
        if e.get("id") and e["name"].endswith(".json"):
            st = s.lese_json(f"{PRAEFIX}/status/{e['name'][:-5]}.json") or {}
            if st.get("status", "wartet") not in sp.ENDZUSTAENDE:
                offen.append((e["name"][:-5], st))
    return offen


def befehl_senden(args, s):
    if args.konto not in KONTEN:
        raise Abbruch(f"--konto muss {' oder '.join(KONTEN)} sein", EXIT_VORAUSSETZUNG)
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,80}", args.projekt):
        raise Abbruch("Projektname ungültig (nur Buchstaben, Ziffern, _ . -)", EXIT_VORAUSSETZUNG)
    projekt_dir = PIPELINE / "projekte" / args.projekt
    if not projekt_dir.is_dir():
        raise Abbruch(f"{projekt_dir} gibt es nicht", EXIT_VORAUSSETZUNG)
    commit, zweig = pruefe_commit(args)
    probleme = pruefe_projekt(args, commit)
    if probleme:
        raise Abbruch("Der Commit ist nicht vollständig:\n  " + "\n  ".join(probleme), EXIT_VORAUSSETZUNG)

    # Rückfall: PC offline → Exit 3, die Sitzung rendert dann selbst in der Cloud
    hb = s.herzschlaege()
    online = [h for h in hb if h["online"]]
    pc = None
    if not online and not args.auch_offline:
        letzter = f"letzter Herzschlag von {hb[0]['rechner']} vor {minuten(hb[0]['alter_s'])}" if hb else "noch nie ein Herzschlag"
        ausgabe(f"PC offline ({letzter}). Rückfall: in der Cloud rendern (node render.js projekte/{args.projekt} ohne --gpu).")
        return EXIT_OFFLINE
    if online:
        pc = online[0]
        d = pc["daten"]
        if d.get("gpu_ok") is False and not d.get("cpu_erlaubt") and not args.auch_offline:
            ausgabe(f"PC offline im Sinne des Rückfalls: {pc['rechner']} meldet keine Grafikkarte ({d.get('gpu')}). Rückfall: in der Cloud rendern.")
            return EXIT_OFFLINE

    opt = {}
    for k in ("von", "bis", "worker", "qualitaet", "fps", "format", "query"):
        if getattr(args, k) is not None:
            opt[k] = getattr(args, k)
    if args.bilder:
        opt["bilder"] = [int(x) for x in args.bilder.split(",")]
    ton = {}
    if args.mux:
        ton["mux_args"] = args.mux.split()
    if args.ohne_ton:
        ton["ohne_ton"] = True
    id_ = f"{datetime.datetime.now(datetime.timezone.utc):%Y%m%d-%H%M%S}-{sp.sauber(args.projekt)}-{uuid.uuid4().hex[:4]}"
    auftrag = {"version": 1, "id": id_, "projekt": args.projekt, "konto": args.konto, "commit": commit, "optionen": opt, "ton": ton,
               "erstellt": iso(), "von": "cloud-sitzung"}
    if args.trocken:
        ausgabe(f"Trockenlauf (nichts gesendet). Zweig {zweig}, PC: {beschreibe_pc(pc) if pc else 'keiner online'}")
        ausgabe(json.dumps(auftrag, ensure_ascii=False, indent=1))
        return 0
    vor = warteschlange(s)
    # erst der Status, dann der Auftrag: Der Dienst sieht einen Auftrag erst, wenn sein Status „wartet“ schon da ist
    s.schreibe_json(f"{PRAEFIX}/status/{id_}.json", {"id": id_, "projekt": args.projekt, "konto": args.konto, "commit": commit, "status": "wartet",
                                                     "phase": "wartet", "prozent": 0, "erstellt": auftrag["erstellt"]})
    s.schreibe_json(f"{PRAEFIX}/auftraege/{id_}.json", auftrag)
    LOKAL.mkdir(parents=True, exist_ok=True)
    (LOKAL / f"{id_}.json").write_text(json.dumps(auftrag, ensure_ascii=False, indent=1), encoding="utf-8")
    (LOKAL / "letzter.txt").write_text(id_, encoding="utf-8")
    ausgabe(f"Auftrag {id_} gesendet (Commit {commit[:10]}, {zweig}).")
    if pc:
        ausgabe(f"PC: {pc['rechner']}, GPU {pc['daten'].get('gpu')}" + (f", davor {len(vor)} Auftrag/Aufträge" if vor else "") + (" (CPU-Testmodus)" if pc["daten"].get("cpu_erlaubt") else ""))
    ausgabe(f"Warten: python3 pipeline/render_dienst/auftrag.py warten {id_}")
    return 0


# ───────────────────────── status / warten ─────────────────────────

def letzte_id():
    d = LOKAL / "letzter.txt"
    if not d.is_file():
        raise Abbruch("Keine Auftrags-ID angegeben und kein letzter Auftrag gemerkt.", EXIT_VORAUSSETZUNG)
    return d.read_text(encoding="utf-8").strip()


def zeile(st):
    teile = [st.get("id", "?"), str(st.get("status")), f"{st.get('phase', '')} {st.get('prozent') or 0:.0f} %"]
    if st.get("bilder") and st["bilder"][0]:
        teile.append(f"Bild {st['bilder'][0]}/{st['bilder'][1]}")
    if st.get("rest_min") is not None and st.get("status") == "laeuft":
        teile.append(f"Rest ca. {st['rest_min']} Min.")
    if st.get("rechner"):
        teile.append(f"PC {st['rechner']}" + (f" ({st['gpu']})" if st.get("gpu") else ""))
    if st.get("fehler"):
        teile.append("Fehler: " + str(st["fehler"])[:200])
    return " · ".join(teile)


def befehl_status(args, s):
    if args.alle:
        n = 0
        for e in s.liste(f"{PRAEFIX}/status"):
            if e.get("id") and e["name"].endswith(".json"):
                st = s.lese_json(f"{PRAEFIX}/status/{e['name']}") or {}
                ausgabe(zeile(st))
                n += 1
        if not n:
            ausgabe("Keine Aufträge vorhanden.")
        return 0
    id_ = args.id or letzte_id()
    st = s.lese_json(f"{PRAEFIX}/status/{id_}.json")
    if st is None:
        ausgabe(f"Kein Status für {id_} (schon geholt und gelöscht, oder nie gesendet).")
        return 1
    ausgabe(json.dumps(st, ensure_ascii=False, indent=1) if args.json else zeile(st))
    return 0


def holen(args, s, st):
    id_, p = st["id"], st["projekt"]
    d = st.get("dateien") or {}
    v = d.get("video") or {}
    if not v:
        raise Abbruch("Status „fertig“, aber ohne Video-Angaben.")
    basis = f"{PRAEFIX}/fertig/{id_}"
    ziel = Path(args.ausgabe).resolve() if args.ausgabe else PIPELINE / "out" / p
    video = ziel / v["name"]
    s.lade_runter(f"{basis}/video.mp4", video)
    if video.stat().st_size != v["bytes"] or sp.sha256(video) != v["sha256"]:
        video.unlink(missing_ok=True)
        raise Abbruch("Das heruntergeladene Video stimmt nicht mit der Prüfsumme des PCs überein (Übertragungsfehler). Nichts gelöscht, bitte nochmal `warten`.")
    if "ereignisse.json" in d:
        s.lade_runter(f"{basis}/ereignisse.json", ziel / "ereignisse.json")
        if not args.ausgabe:  # wie render.js: auch ins Projekt (qc/massstab.py und klang.py lesen dort)
            audio = PIPELINE / "projekte" / p / "audio"
            audio.mkdir(parents=True, exist_ok=True)
            (audio / "ereignisse.json").write_bytes((ziel / "ereignisse.json").read_bytes())
    pc_ordner = ziel / "render_pc"
    for name in ("renderzeit.json", "log.txt"):
        if name in d:
            s.lade_runter(f"{basis}/{name}", pc_ordner / name)
    info = pb.sonde(video)
    rz = st.get("renderzeit") or {}
    ausgabe(f"FERTIG: {video}")
    ausgabe(f"  {info['dauer']:.1f} s · {info['breite']}x{info['hoehe']} · {info['groesse'] / sp.MB:.1f} MB · {info['vcodec']}/{info['acodec'] or 'ohne Ton'}"
            + (f" · verkleinerte Kopie (Original {v.get('original_bytes', 0) / sp.MB:.0f} MB)" if v.get("verkleinert") else ""))
    ausgabe(f"  PC {st.get('rechner')} · {st.get('gpu') or '?'} · Modus {st.get('modus')} · {rz.get('bilder', '?')} Bilder in {rz.get('render_min', '?')} min "
            f"({rz.get('s_pro_bild', '?')} s/Bild) · gesamt {minuten(rz.get('gesamt_s', 0))}")
    ausgabe(f"  Ereignis-Protokoll, renderzeit.json und log.txt: {ziel} (render_pc/)")
    if not args.behalten:
        s.loesche_ordner(basis)
        s.loesche([f"{PRAEFIX}/auftraege/{id_}.json", f"{PRAEFIX}/status/{id_}.json"])
        ausgabe("  Supabase: Auftrag, Status und Dateien gelöscht.")


def log_zeigen(s, st, ausgabe_ordner=None):
    id_ = st["id"]
    try:
        ziel = (Path(ausgabe_ordner).resolve() if ausgabe_ordner else PIPELINE / "out" / st["projekt"]) / "render_pc" / "log.txt"
        s.lade_runter(f"{PRAEFIX}/fertig/{id_}/log.txt", ziel)
        zeilen = ziel.read_text(encoding="utf-8", errors="replace").splitlines()
        ausgabe(f"  Log des PCs ({ziel}), letzte Zeilen:")
        for z in zeilen[-15:]:
            ausgabe("    " + z)
    except pb.Fehler:
        ausgabe("  (Kein Log vom PC verfügbar.)")


def befehl_warten(args, s):
    id_ = args.id or letzte_id()
    start = time.time()
    phase_alt, prozent_alt, fehler_serie, nicht_da = None, -100, 0, 0
    wartet_ohne_pc = None
    while True:
        try:
            st = s.lese_json(f"{PRAEFIX}/status/{id_}.json")
            fehler_serie = 0
        except pb.Fehler as e:
            fehler_serie += 1
            if fehler_serie >= 10:
                raise Abbruch(f"Supabase seit 10 Abfragen nicht erreichbar: {e}")
            time.sleep(args.intervall)
            continue
        if st is None:
            nicht_da += 1
            if nicht_da >= 3:
                raise Abbruch(f"Kein Status für {id_} (nie gesendet oder schon geholt).", EXIT_VORAUSSETZUNG)
            time.sleep(5)
            continue
        zustand = st.get("status")
        prozent = st.get("prozent") or 0
        if st.get("phase") != phase_alt or prozent >= prozent_alt + 10:
            ausgabe(f"[{minuten(time.time() - start)}] " + zeile(st))
            phase_alt, prozent_alt = st.get("phase"), prozent
        if zustand == "fertig":
            holen(args, s, st)
            return 0
        if zustand in ("fehler", "keine_gpu"):
            ausgabe("PC meldet: " + str(st.get("fehler")))
            log_zeigen(s, st, args.ausgabe)
            if not args.behalten:
                s.loesche_ordner(f"{PRAEFIX}/fertig/{id_}")
                s.loesche([f"{PRAEFIX}/auftraege/{id_}.json", f"{PRAEFIX}/status/{id_}.json"])
            ausgabe("Rückfall: in der Cloud rendern." if zustand == "keine_gpu" else "Fehler prüfen (Log oben); danach neu senden oder in der Cloud rendern.")
            return EXIT_KEINE_GPU if zustand == "keine_gpu" else 1
        # Lebt der PC noch?
        try:
            hb = s.herzschlaege()
        except pb.Fehler:
            hb = None
        if hb is not None:
            if zustand == "laeuft":
                mein = [h for h in hb if h["rechner"] == st.get("rechner")]
                if not mein or mein[0]["alter_s"] > 2 * sp.OFFLINE_NACH_SEKUNDEN or mein[0]["daten"].get("status") == "beendet":
                    ausgabe(f"PC {st.get('rechner')} ausgefallen oder Dienst beendet (letzter Herzschlag vor {minuten(mein[0]['alter_s']) if mein else '?'}). "
                            f"Letzter Stand: {zeile(st)}. Rückfall: in der Cloud rendern (der Auftrag bleibt liegen und wird beim Neustart des Dienstes fortgesetzt).")
                    return EXIT_OFFLINE
                wartet_ohne_pc = None
            elif not any(h["online"] for h in hb):
                wartet_ohne_pc = wartet_ohne_pc or time.time()
                if time.time() - wartet_ohne_pc > sp.OFFLINE_NACH_SEKUNDEN:
                    ausgabe("PC offline, der Auftrag wird nicht abgeholt. Rückfall: in der Cloud rendern.")
                    return EXIT_OFFLINE
            else:
                wartet_ohne_pc = None
        if time.time() - start > args.max_min * 60:
            ausgabe(f"Zeitlimit von {args.max_min} Min. erreicht. Letzter Stand: {zeile(st)}")
            return EXIT_ZEIT
        time.sleep(args.intervall)


# ───────────────────────── aufräumen ─────────────────────────

def befehl_aufraeumen(args, s):
    jetzt_ = jetzt()
    geloescht = 0
    for e in s.liste(f"{PRAEFIX}/auftraege"):
        if not (e.get("id") and e["name"].endswith(".json")):
            continue
        id_ = e["name"][:-5]
        st = s.lese_json(f"{PRAEFIX}/status/{id_}.json") or {}
        alt = (jetzt_ - (sp.parse_zeit(e.get("created_at")) or jetzt_)).total_seconds() > 86400
        if args.alles or st.get("status") in sp.ENDZUSTAENDE or alt:
            s.loesche_ordner(f"{PRAEFIX}/fertig/{id_}")
            s.loesche([f"{PRAEFIX}/auftraege/{id_}.json", f"{PRAEFIX}/status/{id_}.json"])
            geloescht += 1
    # Waisen: Status oder fertig-Ordner ohne Auftrag
    vorhanden = {e["name"][:-5] for e in s.liste(f"{PRAEFIX}/auftraege") if e.get("id")}
    for e in s.liste(f"{PRAEFIX}/status"):
        if e.get("id") and e["name"][:-5] not in vorhanden:
            s.loesche([f"{PRAEFIX}/status/{e['name']}"])
            geloescht += 1
    for e in s.liste(f"{PRAEFIX}/fertig"):
        if not e.get("id") and e["name"] not in vorhanden:
            s.loesche_ordner(f"{PRAEFIX}/fertig/{e['name']}")
            geloescht += 1
    ausgabe(f"Aufgeräumt: {geloescht} Einträge unter {PRAEFIX}/ gelöscht (Herzschlag bleibt).")
    return 0


# ───────────────────────── main ─────────────────────────

def main():
    sp.konsole_utf8()
    p = argparse.ArgumentParser(description="Render-Aufträge an den Windows-PC", formatter_class=argparse.RawDescriptionHelpFormatter, epilog=__doc__)
    sub = p.add_subparsers(dest="befehl", required=True)

    a = sub.add_parser("pc", help="Herzschlag des PCs anzeigen")
    a.add_argument("--json", action="store_true")

    a = sub.add_parser("senden", help="Auftrag senden")
    a.add_argument("projekt")
    a.add_argument("--konto", required=True, choices=KONTEN)
    a.add_argument("--commit", help="Commit-Hash (Standard: HEAD); muss auf GitHub liegen")
    a.add_argument("--von", type=float)
    a.add_argument("--bis", type=float)
    a.add_argument("--worker", type=int)
    a.add_argument("--qualitaet", type=int)
    a.add_argument("--fps", type=float)
    a.add_argument("--format", choices=("jpg", "png"))
    a.add_argument("--query", help='Qualitätsschalter der Szene, z. B. "msaa=2&schatten=1024"')
    a.add_argument("--bilder", help="nur diese Bildnummern, z. B. 12,13,400")
    a.add_argument("--mux", help='Ton-Optionen für mux.sh/klang.py (Simulierbar), z. B. "--teppich regen --teppich-db -11"')
    a.add_argument("--ohne-ton", action="store_true", help="nur stumme Vorschau")
    a.add_argument("--trotz-aenderungen", action="store_true", help="nicht committete Änderungen ignorieren (der PC rendert trotzdem nur den Commit)")
    a.add_argument("--auch-offline", action="store_true", help="Auftrag auch senden, wenn kein PC online ist (wird beim Start des Dienstes abgeholt)")
    a.add_argument("--trocken", action="store_true", help="nur prüfen und den Auftrag anzeigen")

    a = sub.add_parser("status", help="Status eines Auftrags")
    a.add_argument("id", nargs="?")
    a.add_argument("--alle", action="store_true")
    a.add_argument("--json", action="store_true")

    a = sub.add_parser("warten", help="blockieren, bis fertig; MP4 holen")
    a.add_argument("id", nargs="?")
    a.add_argument("--intervall", type=float, default=30, help="Sekunden zwischen zwei Abfragen (Standard 30)")
    a.add_argument("--max-min", type=float, default=240, help="Zeitlimit in Minuten (Standard 240)")
    a.add_argument("--ausgabe", help="Zielordner statt pipeline/out/<projekt>/ (z. B. für Tests; dann wird projekte/<projekt>/audio nicht angefasst)")
    a.add_argument("--behalten", action="store_true", help="Dateien in Supabase nicht löschen")

    a = sub.add_parser("aufraeumen", help="liegengebliebene Dateien unter render/ löschen")
    a.add_argument("--alles", action="store_true", help="auch noch laufende/wartende Aufträge")

    args = p.parse_args()
    try:
        s = sp.verbinde()
        return {"pc": befehl_pc, "senden": befehl_senden, "status": befehl_status, "warten": befehl_warten, "aufraeumen": befehl_aufraeumen}[args.befehl](args, s)
    except Abbruch as e:
        ausgabe(f"FEHLER: {e}")
        return e.code
    except pb.Fehler as e:
        ausgabe(f"FEHLER: {e}")
        return 1
    except KeyboardInterrupt:
        return 130


if __name__ == "__main__":
    sys.exit(main())
