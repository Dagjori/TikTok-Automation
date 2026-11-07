#!/usr/bin/env python3
"""REA-Video · neue Videos aufnehmen (Skill .claude/skills/rea-video/, Schnellablauf in SKILL.md).

Aufruf:
  python aufnehmen.py suchen [<datei oder ordner> …] [--tage 14] [--json]
      Findet Videodateien: die genannten Pfade, sonst Downloads und <wurzel>/_eingang (nur die letzten --tage Tage).
      Meldet je Datei Länge, Größe, den am Dateinamen erkannten Account und ob sie schon im Korpus ist (Prüfsumme).
  python aufnehmen.py aufnehmen --konto <simulierbar|stelldirvor> <datei>
                      [--likes … --kommentare … --saves … --shares … --aufrufe … --follower …]
                      [--gruppe viral|vergleich] [--creator @konto] [--link URL] [--notiz "…"] [--trocken]
      Vergibt die nächste freie ID (über alle Korpora fortlaufend), kopiert nach <korpus>/videos/Vxx.mp4,
      schreibt die Zeile in korpus.csv und die Prüfsumme in <wurzel>/_index.csv. Doppelte Videos werden abgewiesen.
  python aufnehmen.py einrichten
      Legt den Verweis-Skill unter ~/.claude/skills/rea-video/ an bzw. aktualisiert ihn (gleiche Beschreibung wie
      der Master), damit der Skill in jeder Claude-Code-Sitzung greift, auch außerhalb des Repos.

Gruppe: --gruppe gewinnt. Sonst aus den Zahlen: Vergleich = unter 10 % des Medians der viralen Videos des Korpus
(Aufrufe, wenn beide Seiten Aufrufe haben, sonst Likes; korpus.md §2b), 10–25 % wird als Grenzfall vermerkt.
Ohne Zahlen: viral als Annahme (A), in der Spalte notiz vermerkt.
Arbeitsordner: --wurzel, sonst <repo>/../rea-video (auf dem Laptop C:\\tiktok\\rea-video).
"""
import argparse
import csv
import datetime
import hashlib
import json
import re
import shutil
import statistics
import subprocess
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
from synthese import zahl  # noqa: E402  (gleiche Zahlenlogik wie die Synthese: „2,2 Mio“, „183,4k“, „10.700“)

VIDEO_ENDUNGEN = {".mp4", ".mov", ".m4v", ".webm", ".mkv"}
KONTEN = {  # Eingabe → Korpusordner
    "simulierbar": "simulierbar", "1": "simulierbar", "account1": "simulierbar", "account 1": "simulierbar",
    "stelldirvor": "stelldirvor", "stelldirvor.pov": "stelldirvor", "2": "stelldirvor", "account2": "stelldirvor",
    "account 2": "stelldirvor", "pov": "stelldirvor",
}
SPALTEN = ["id", "gruppe", "link", "creator", "aufrufe", "likes", "kommentare", "shares", "saves", "follower",
           "datum", "abgerufen", "notiz"]
INDEX_SPALTEN = ["id", "konto", "sha256", "bytes", "quelle", "aufgenommen"]


def wurzel_finden(arg):
    if arg:
        return Path(arg).resolve()
    neben_repo = HIER.parents[3].parent / "rea-video"  # scripts → rea-video → skills → .claude → repo
    if neben_repo.is_dir():
        return neben_repo
    laptop = Path(r"C:\tiktok\rea-video")
    return laptop if laptop.is_dir() else neben_repo


def pruefsumme(datei):
    h = hashlib.sha256()
    with open(datei, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def dauer(datei):
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                              "default=nw=1:nk=1", str(datei)], capture_output=True, timeout=60).stdout
        return round(float(out.decode().strip() or 0), 1)
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def korpora(wurzel):
    return [p for p in sorted(wurzel.iterdir()) if p.is_dir() and not p.name.startswith("_") and (p / "korpus.csv").exists()]


def csv_lesen(datei):
    if not datei.exists():
        return []
    text = datei.read_text(encoding="utf-8-sig")
    return [z for z in csv.DictReader(text.splitlines(), delimiter=";") if (z.get("id") or "").strip()]


def index_laden(wurzel):
    """Liest _index.csv und ergänzt fehlende Einträge für Videos, die schon in einem Korpus liegen."""
    datei = wurzel / "_index.csv"
    zeilen = csv_lesen(datei)
    bekannt = {(z["konto"], z["id"]) for z in zeilen}
    neu = False
    for k in korpora(wurzel):
        for v in sorted((k / "videos").glob("*")) if (k / "videos").is_dir() else []:
            if v.suffix.lower() in VIDEO_ENDUNGEN and (k.name, v.stem) not in bekannt:
                zeilen.append({"id": v.stem, "konto": k.name, "sha256": pruefsumme(v), "bytes": str(v.stat().st_size),
                               "quelle": "", "aufgenommen": datetime.date.fromtimestamp(v.stat().st_mtime).isoformat()})
                neu = True
    if neu:
        index_schreiben(wurzel, zeilen)
    return zeilen


def index_schreiben(wurzel, zeilen):
    with open(wurzel / "_index.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=INDEX_SPALTEN, delimiter=";")
        w.writeheader()
        for z in zeilen:
            w.writerow({s: z.get(s, "") for s in INDEX_SPALTEN})


def naechste_id(wurzel, index):
    nummern = [0]
    for z in index:
        m = re.fullmatch(r"V(\d+)", z["id"].strip(), re.I)
        if m:
            nummern.append(int(m.group(1)))
    for k in korpora(wurzel):
        for z in csv_lesen(k / "korpus.csv"):
            m = re.fullmatch(r"V(\d+)", z["id"].strip(), re.I)
            if m:
                nummern.append(int(m.group(1)))
    return "V%02d" % (max(nummern) + 1)


def konto_erkennen(name):
    n = name.lower()
    if "simulierbar" in n or re.search(r"account[ _-]?1\b", n):
        return "simulierbar"
    if "stelldirvor" in n or re.search(r"account[ _-]?2\b", n) or re.search(r"\bpov\b", n):
        return "stelldirvor"
    return ""


def kandidaten(pfade, tage, wurzel):
    dateien, explizit = [], bool(pfade)
    ordner = [Path(p) for p in pfade] if pfade else [Path.home() / "Downloads", wurzel / "_eingang"]
    grenze = datetime.datetime.now().timestamp() - tage * 86400
    for p in ordner:
        p = p.expanduser()
        if p.is_file() and p.suffix.lower() in VIDEO_ENDUNGEN:
            dateien.append(p)
        elif p.is_dir():
            for d in p.iterdir():
                if d.is_file() and d.suffix.lower() in VIDEO_ENDUNGEN and (explizit or d.stat().st_mtime >= grenze):
                    dateien.append(d)
        elif explizit:
            print(f"nicht gefunden oder kein Video: {p}", file=sys.stderr)
    return sorted(set(dateien), key=lambda d: d.stat().st_mtime)


def suchen(a):
    wurzel = wurzel_finden(a.wurzel)
    index = index_laden(wurzel)
    groessen = {z["bytes"] for z in index}
    nach_hash = {z["sha256"]: z for z in index}
    liste = []
    for d in kandidaten(a.pfade, a.tage, wurzel):
        groesse = d.stat().st_size
        treffer = None
        if str(groesse) in groessen:  # nur dann lohnt die Prüfsumme
            treffer = nach_hash.get(pruefsumme(d))
        liste.append({"datei": str(d), "name": d.name, "dauer_s": dauer(d), "mb": round(groesse / 1e6, 1),
                      "geaendert": datetime.datetime.fromtimestamp(d.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
                      "konto_erkannt": konto_erkennen(d.name),
                      "schon_im_korpus": (treffer["konto"] + "/" + treffer["id"]) if treffer else ""})
    if a.json:
        print(json.dumps({"wurzel": str(wurzel), "naechste_id": naechste_id(wurzel, index), "videos": liste},
                         ensure_ascii=False, indent=1))
        return
    neu = [x for x in liste if not x["schon_im_korpus"]]
    print(f"Arbeitsordner {wurzel} · nächste ID {naechste_id(wurzel, index)} · {len(neu)} neue von {len(liste)} gefundenen Videos")
    for x in liste:
        status = ("schon im Korpus: " + x["schon_im_korpus"]) if x["schon_im_korpus"] else "NEU"
        erkannt = (" · erkannt: " + x["konto_erkannt"]) if x["konto_erkannt"] else ""
        print(f"  [{status}] {x['name']} · {x['dauer_s']} s · {x['mb']} MB · {x['geaendert']}{erkannt}")
        print(f"      {x['datei']}")
    if not liste:
        print("  keine Videos gefunden (Datei in den Chat ziehen, Pfad nennen oder nach Downloads bzw. _eingang legen)")


def gruppe_bestimmen(a, korpus_zeilen):
    """Gibt (gruppe, begruendung) zurück."""
    if a.gruppe:
        return a.gruppe, "Gruppe vom Inhaber"
    viral = [z for z in korpus_zeilen if (z.get("gruppe") or "viral").strip().lower() == "viral"]
    for mass in ("aufrufe", "likes"):
        wert = zahl(getattr(a, mass))
        werte = [zahl(z.get(mass)) for z in viral]
        werte = [w for w in werte if w]
        if wert and werte:
            median = statistics.median(werte)
            anteil = wert / median
            text = f"{round(anteil * 100)} % des viralen {'Like' if mass == 'likes' else 'Aufrufe'}-Medians"
            if anteil < 0.10:
                return "vergleich", text
            if anteil < 0.25:
                return "viral", text + " · Grenzfall (10–25 %), prüfen"
            return "viral", text
        if wert and not werte:
            return "viral", f"{mass.capitalize()} notiert, noch kein virales Vergleichsmaß im Korpus"
    return "viral", "Zahlen fehlen, als viral angenommen (A)"


def aufnehmen(a):
    wurzel = wurzel_finden(a.wurzel)
    konto = KONTEN.get(a.konto.strip().lower())
    if not konto:
        sys.exit(f"unbekannter Account „{a.konto}“ (simulierbar oder stelldirvor)")
    quelle = Path(a.datei).expanduser().resolve()
    if not quelle.is_file() or quelle.suffix.lower() not in VIDEO_ENDUNGEN:
        sys.exit(f"keine Videodatei: {quelle}")
    korpus = wurzel / konto
    if not (korpus / "korpus.csv").exists():
        sys.exit(f"{korpus / 'korpus.csv'} fehlt (Korpus anlegen nach korpus.md §4)")
    index = index_laden(wurzel)
    summe = pruefsumme(quelle)
    doppelt = next((z for z in index if z["sha256"] == summe), None)
    if doppelt:
        print(f"schon im Korpus: {doppelt['konto']}/{doppelt['id']} ({quelle.name}) · nicht erneut aufgenommen")
        sys.exit(2)
    vid = naechste_id(wurzel, index)
    zeilen = csv_lesen(korpus / "korpus.csv")
    gruppe, grund = gruppe_bestimmen(a, zeilen)
    notiz = " · ".join(t for t in ["Datei: " + quelle.name, grund, a.notiz or ""] if t)
    heute = datetime.date.today().isoformat()
    zeile = {"id": vid, "gruppe": gruppe, "link": a.link or "", "creator": a.creator or "", "aufrufe": a.aufrufe or "",
             "likes": a.likes or "", "kommentare": a.kommentare or "", "shares": a.shares or "", "saves": a.saves or "",
             "follower": a.follower or "", "datum": "", "abgerufen": heute if any([a.likes, a.aufrufe]) else "",
             "notiz": notiz.replace(";", ",")}
    ziel = korpus / "videos" / (vid + ".mp4")
    print(f"{vid} → {konto} · Gruppe {gruppe} ({grund}) · {dauer(quelle)} s · {ziel}")
    if a.trocken:
        print("(trocken: nichts kopiert, nichts geschrieben)")
        return
    ziel.parent.mkdir(parents=True, exist_ok=True)
    if quelle.suffix.lower() == ".mp4":
        shutil.copy2(quelle, ziel)
    else:  # erst ohne Neukodierung umpacken, sonst neu kodieren
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(quelle), "-c", "copy", "-movflags", "+faststart", str(ziel)])
        if r.returncode != 0:
            r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(quelle), "-c:v", "libx264", "-crf", "16",
                                "-preset", "medium", "-c:a", "aac", "-b:a", "192k", str(ziel)])
        if r.returncode != 0 or not ziel.exists():
            sys.exit("Umwandeln nach MP4 fehlgeschlagen (ffmpeg)")
    text = (korpus / "korpus.csv").read_text(encoding="utf-8-sig")
    with open(korpus / "korpus.csv", "a", encoding="utf-8", newline="") as f:
        if text and not text.endswith("\n"):
            f.write("\n")
        csv.DictWriter(f, fieldnames=SPALTEN, delimiter=";", lineterminator="\n").writerow(zeile)
    index = csv_lesen(wurzel / "_index.csv")
    index.append({"id": vid, "konto": konto, "sha256": summe, "bytes": str(quelle.stat().st_size),
                  "quelle": quelle.name, "aufgenommen": heute})
    index_schreiben(wurzel, index)
    viral = sum(1 for z in zeilen if (z.get("gruppe") or "viral").lower() == "viral") + (gruppe == "viral")
    vergleich = len(zeilen) + 1 - viral
    print(f"aufgenommen · Korpus {konto}: {viral} viral, {vergleich} Vergleich (Minimum 12 + 4, Ziel 20 + 6)")
    print(f"weiter: python {HIER / 'messen.py'} {korpus}")


def einrichten(a):
    master = HIER.parent / "SKILL.md"
    text = master.read_text(encoding="utf-8")
    m = re.search(r"^description:\s*(.+)$", text, re.M)
    if not m:
        sys.exit("Beschreibung im Master-SKILL.md nicht gefunden")
    ziel = Path.home() / ".claude" / "skills" / "rea-video"
    ziel.mkdir(parents=True, exist_ok=True)
    beschreibung = m.group(1).strip().strip('"').replace("\\", "\\\\").replace('"', '\\"')
    inhalt = (
        "---\nname: rea-video\ndescription: \"" + beschreibung + "\"\n---\n\n"
        "# REA-Video (Verweis auf den Master im Repo)\n\n"
        "Dieser Verweis macht den Skill in **jeder** Claude-Code-Sitzung verfügbar, auch wenn sie nicht im Repo läuft "
        "(z. B. im Desktop-Ordner „TikTok Automation“). Erzeugt von `scripts/aufnehmen.py einrichten`; "
        "nicht von Hand ändern, sondern den Master ändern und `einrichten` erneut ausführen.\n\n"
        "**Zuerst den Master vollständig lesen und ihm folgen:** `" + str(master) + "`\n\n"
        "Alle Pfade dort (`scripts/`, `raster.md`, `korpus.md` …) gelten relativ zum Ordner `" + str(master.parent) + "`. "
        "Skripte immer mit vollem Pfad aufrufen, z. B. `python \"" + str(HIER / "aufnehmen.py") + "\" suchen`.\n"
    )
    (ziel / "SKILL.md").write_text(inhalt, encoding="utf-8")
    print(f"Verweis-Skill geschrieben: {ziel / 'SKILL.md'} → Master {master}")


def main():
    for strom in (sys.stdout, sys.stderr):
        if hasattr(strom, "reconfigure"):
            strom.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description="REA-Video · neue Videos aufnehmen")
    ap.add_argument("--wurzel", help="Arbeitsordner (Standard: <repo>/../rea-video)")
    sub = ap.add_subparsers(dest="befehl", required=True)
    s = sub.add_parser("suchen")
    s.add_argument("pfade", nargs="*")
    s.add_argument("--tage", type=int, default=14)
    s.add_argument("--json", action="store_true")
    s.add_argument("--wurzel", default=argparse.SUPPRESS)
    n = sub.add_parser("aufnehmen")
    n.add_argument("datei")
    n.add_argument("--konto", required=True)
    n.add_argument("--gruppe", choices=["viral", "vergleich"])
    for feld in ("aufrufe", "likes", "kommentare", "shares", "saves", "follower", "creator", "link", "notiz"):
        n.add_argument("--" + feld)
    n.add_argument("--trocken", action="store_true")
    n.add_argument("--wurzel", default=argparse.SUPPRESS)
    e = sub.add_parser("einrichten")
    e.add_argument("--wurzel", default=argparse.SUPPRESS)
    a = ap.parse_args()
    {"suchen": suchen, "aufnehmen": aufnehmen, "einrichten": einrichten}[a.befehl](a)


if __name__ == "__main__":
    main()
