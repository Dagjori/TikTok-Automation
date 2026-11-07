#!/usr/bin/env python3
"""Hirn-Abgleich: Repo-Hirn (`hirn/`, Master) direkt in den Obsidian-Vault auf dem Desktop schreiben (ersetzt das ZIP, 07.11.2026).

Aufruf:
  python tools/hirn_abgleich.py                 abgleichen und Bericht ausgeben
  python tools/hirn_abgleich.py --pruefen       nur zeigen, was passieren würde
  python tools/hirn_abgleich.py --still         nur bei Konflikten etwas ausgeben (für Git-Hooks)
  python tools/hirn_abgleich.py --hook          für Claude-Code-Hooks: liest das Ereignis von stdin, gleicht nur ab,
                                                wenn es das Hirn betreffen kann, meldet Konflikte als Kontext an Claude
  python tools/hirn_abgleich.py --uebernehmen "<pfad im Hirn>"
                                                eine im Desktop geänderte Notiz ins Repo-Hirn übernehmen (nur auf Wunsch
                                                des Inhabers; das Repo ist öffentlich)

Richtung: Repo → Desktop. Der Desktop-Vault wird nie blind überschrieben:
  - Notizen, die der Inhaber in Obsidian geändert hat, bleiben unangetastet (Konflikt wird gemeldet).
  - Eigene Desktop-Notizen und Dateien (z. B. .txt) bleiben, wie sie sind; sie gehen nie automatisch ins Repo.
  - Was entfernt oder ersetzt wird, landet im Obsidian-Papierkorb `.trash/abgleich-<datum>/` (wiederherstellbar).
Merkt sich in `<vault>/.hirn-abgleich.json`, welche Fassung zuletzt abgeglichen wurde und welche Fassungen das Skript
selbst geschrieben hat. Läufe sind über `<vault>/.hirn-abgleich.lock` gegeneinander gesperrt: Die Hooks starten nach
jeder Änderung parallel; ohne Sperre hielt ein Lauf die Kopie eines anderen für eine Änderung des Inhabers (07.11.).
Vault-Pfad: Umgebungsvariable HIRN_DESKTOP, sonst ~/Desktop/TikTok Automation.
"""
import contextlib
import datetime
import hashlib
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path

REPO_HIRN = Path(os.environ.get("HIRN_REPO") or (Path(__file__).resolve().parents[1] / "hirn"))
VAULT = Path(os.environ.get("HIRN_DESKTOP") or (Path.home() / "Desktop" / "TikTok Automation"))
STAND = ".hirn-abgleich.json"
SPERRE = ".hirn-abgleich.lock"
NIE = re.compile(r"^(\.trash/|\.git/|\.hirn-abgleich\.(json|lock)$|\.obsidian/workspace[^/]*\.json$|\.obsidian/plugins/)", re.I)
VERLAUF = 10  # so viele selbst geschriebene Fassungen je Datei merken


@contextlib.contextmanager
def gesperrt(warten=25.0):
    """Nur ein Abgleich zugleich. Eine Sperre älter als 2 Minuten gilt als verwaist."""
    pfad = VAULT / SPERRE
    ende = time.monotonic() + warten
    while True:
        try:
            fd = os.open(str(pfad), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, str(os.getpid()).encode())
            os.close(fd)
            break
        except FileExistsError:
            try:
                if time.time() - pfad.stat().st_mtime > 120:
                    pfad.unlink()
                    continue
            except OSError:
                continue
            if time.monotonic() > ende:
                raise TimeoutError("ein anderer Hirn-Abgleich läuft noch")
            time.sleep(0.2)
    try:
        yield
    finally:
        try:
            pfad.unlink()
        except OSError:
            pass


def dateien(basis):
    out = {}
    for p in basis.rglob("*"):
        if p.is_file():
            rel = p.relative_to(basis).as_posix()
            if not NIE.match(rel):
                out[rel] = p
    return out


def summe(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def stand_laden():
    """Gibt (dateien, geschrieben) zurück: zuletzt abgeglichene Summe je Datei und selbst geschriebene Summen."""
    try:
        s = json.loads((VAULT / STAND).read_text(encoding="utf-8"))
        return s.get("dateien", {}), s.get("geschrieben", {})
    except (OSError, ValueError):
        return {}, {}


def stand_schreiben(dateien_, geschrieben):
    geschrieben = {k: v[-VERLAUF:] for k, v in geschrieben.items() if k in dateien_}
    (VAULT / STAND).write_text(json.dumps({"stand": datetime.datetime.now().isoformat(timespec="seconds"),
                                           "repo": str(REPO_HIRN), "dateien": dateien_, "geschrieben": geschrieben},
                                          ensure_ascii=False, indent=1), encoding="utf-8")


def papierkorb(p, heute, trocken):
    ziel = VAULT / ".trash" / ("abgleich-" + heute) / p.relative_to(VAULT)
    n = 2
    while ziel.exists():
        ziel = ziel.with_name(f"{ziel.stem} ({n}){ziel.suffix}")
        n += 1
    if not trocken:
        ziel.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(ziel))
    return ziel


def kopieren(quelle, ziel, trocken):
    if not trocken:
        ziel.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(quelle, ziel)


def gleicher_inhalt(a, b):
    """Obsidian schreibt JSON-Einstellungen neu formatiert zurück; gleicher Inhalt zählt als gleich."""
    try:
        return json.loads(a.read_text(encoding="utf-8")) == json.loads(b.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return False


def zip_name_reparieren(rel):
    """ZIP ohne UTF-8-Kennung: „Kanäle“ wird beim Entpacken zu „Kan├ñle“ (UTF-8 als CP437 gelesen)."""
    try:
        heil = rel.encode("cp437").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None
    return heil if heil != rel else None


def abgleichen(trocken=False):
    """Gibt (aktionen, konflikte) zurück, je eine Liste kurzer Texte."""
    if not REPO_HIRN.is_dir() or not VAULT.is_dir():
        return [], []
    if trocken:
        return _abgleichen(True)
    with gesperrt():
        return _abgleichen(False)


def _abgleichen(trocken):
    heute = datetime.date.today().isoformat()
    r, d = dateien(REPO_HIRN), dateien(VAULT)
    alt, geschrieben = stand_laden()
    neu, aktionen, konflikte = {}, [], []

    def merken(k, h):
        liste = [x for x in geschrieben.get(k, []) if x != h]
        geschrieben[k] = liste + [h]

    for k in sorted(set(r) | set(alt)):
        dp = VAULT / k
        hr = summe(r[k]) if k in r else None
        hd = summe(dp) if dp.is_file() else None
        last = alt.get(k)
        obsidian = k.startswith(".obsidian/")
        if hr is None:  # im Repo entfernt oder umbenannt
            if hd is None:
                continue
            if hd == last:
                papierkorb(dp, heute, trocken)
                aktionen.append(f"entfernt (im Repo gelöscht/umbenannt): {k}")
            else:
                konflikte.append(f"{k}: im Repo entfernt, im Desktop aber geändert – Desktop-Fassung bleibt")
            continue
        if hd == hr or (obsidian and hd and gleicher_inhalt(r[k], dp)):
            neu[k] = hr
            continue
        if hd is None:
            if last is not None and hr == last:  # vom Inhaber im Desktop gelöscht, im Repo unverändert: respektieren
                neu[k] = last
                continue
            kopieren(r[k], dp, trocken)
            merken(k, hr)
            aktionen.append(f"neu: {k}")
            neu[k] = hr
            continue
        if (last is not None and hd == last) or hd in geschrieben.get(k, []):  # Desktop seit dem Abgleich unverändert
            kopieren(r[k], dp, trocken)
            merken(k, hr)
            aktionen.append(f"aktualisiert: {k}")
            neu[k] = hr
        elif last is None:  # erster Abgleich dieser Datei
            if dp.stat().st_mtime <= r[k].stat().st_mtime:
                papierkorb(dp, heute, trocken)
                kopieren(r[k], dp, trocken)
                merken(k, hr)
                aktionen.append(f"aktualisiert (alte Fassung im Papierkorb): {k}")
                neu[k] = hr
            elif not obsidian:  # Obsidian-Ansicht (Zoom, Fenster) des Inhabers still behalten
                konflikte.append(f"{k}: Desktop-Fassung ist neuer als das Repo – nicht überschrieben")
        else:  # im Desktop vom Inhaber geändert
            neu[k] = last
            if hr != last and not obsidian:
                konflikte.append(f"{k}: im Desktop geändert und im Repo neu – Desktop-Fassung bleibt, Repo-Stand nicht eingespielt")
            elif hr != last:
                konflikte.append(f"{k}: Obsidian-Einstellung im Desktop geändert – Repo-Fassung nicht eingespielt")
    for k in sorted(set(d) - set(r) - set(alt)):  # vom ZIP zerstörte Dateinamen aufräumen
        heil = zip_name_reparieren(k)
        if heil and heil in r:
            papierkorb(VAULT / k, heute, trocken)
            aktionen.append(f"zerstörter Dateiname aus dem ZIP entfernt: {k} (richtig: {heil})")
    if not trocken:
        stand_schreiben(neu, geschrieben)
    return aktionen, konflikte


def betrifft_hirn(ereignis):
    if ereignis.get("hook_event_name") == "SessionStart":
        return True
    werkzeug = ereignis.get("tool_name") or ""
    eingabe = ereignis.get("tool_input") or {}
    if werkzeug in ("Edit", "Write", "MultiEdit", "NotebookEdit"):
        pfad = str(eingabe.get("file_path") or eingabe.get("notebook_path") or "")
        return str(REPO_HIRN).lower().replace("\\", "/") in pfad.lower().replace("\\", "/")
    if werkzeug in ("Bash", "PowerShell"):
        befehl = str(eingabe.get("command") or "").lower()
        return "hirn" in befehl or re.search(r"git\s+(pull|merge|rebase|checkout|switch|reset|restore|stash)", befehl) is not None
    return False


def main():
    for strom in (sys.stdout, sys.stderr):
        if hasattr(strom, "reconfigure"):
            strom.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]
    if "--hook" in args:
        try:
            ereignis = json.loads(sys.stdin.read() or "{}")
            if not betrifft_hirn(ereignis):
                return
            _, konflikte = abgleichen()
            if konflikte:
                text = ("Hirn-Abgleich Repo → Desktop-Vault: " + str(len(konflikte)) + " Konflikt(e), Desktop-Fassung nicht "
                        "überschrieben. Dem Inhaber kurz sagen; Übernahme ins Repo nur auf Wunsch "
                        "(python tools/hirn_abgleich.py --uebernehmen \"<pfad>\").\n- " + "\n- ".join(konflikte))
                print(json.dumps({"hookSpecificOutput": {"hookEventName": ereignis.get("hook_event_name", "PostToolUse"),
                                                         "additionalContext": text}}, ensure_ascii=False))
        except Exception:  # ein Hook darf die Sitzung nie stören
            pass
        return
    if "--uebernehmen" in args:
        rel = args[args.index("--uebernehmen") + 1].replace("\\", "/").strip("/")
        quelle, ziel = VAULT / rel, REPO_HIRN / rel
        if not quelle.is_file():
            sys.exit(f"nicht im Desktop-Vault: {quelle}")
        with gesperrt():
            kopieren(quelle, ziel, False)
            alt, geschrieben = stand_laden()
            alt[rel] = summe(ziel)
            stand_schreiben(alt, geschrieben)
        print(f"übernommen ins Repo-Hirn: {ziel} (vor dem Commit auf Privates prüfen, das Repo ist öffentlich)")
        return
    trocken = "--pruefen" in args
    if not VAULT.is_dir():
        if "--still" not in args:
            print(f"kein Desktop-Vault unter {VAULT} (HIRN_DESKTOP setzen)")
        return
    aktionen, konflikte = abgleichen(trocken)
    if "--still" in args and not konflikte:
        return
    kopf = "Prüfung (nichts geändert)" if trocken else "Abgleich"
    print(f"{kopf} {REPO_HIRN} → {VAULT}: {len(aktionen)} Änderung(en), {len(konflikte)} Konflikt(e)")
    for a in aktionen:
        print("  " + a)
    for k in konflikte:
        print("  KONFLIKT " + k)


if __name__ == "__main__":
    main()
