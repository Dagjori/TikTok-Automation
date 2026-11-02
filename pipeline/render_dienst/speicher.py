"""Gemeinsamer Zugriff auf den Supabase-Bucket für Render-Aufträge (Cloud: auftrag.py, PC: dienst.py, pc_test.py).

Nutzt den Bucket, den post_buffer.py schon verwendet (Standard „buffer-uploads“), mit dem Präfix „render/“:
    render/auftraege/<id>.json     Auftrag (Cloud schreibt, PC liest)
    render/status/<id>.json        Status (PC schreibt, Cloud liest)
    render/fertig/<id>/…           video.mp4, ereignisse.json, renderzeit.json, log.txt (PC schreibt, Cloud holt und löscht)
    render/herzschlag/<rechner>.json   Lebenszeichen des PCs (jede Minute)
Es werden weder ein neuer Bucket noch Tabellen angelegt.

Zugänge (wie post_buffer.py):
    Cloud: Der Proxy setzt den Header apikey selbst. Nötig ist nur die Umgebungsvariable SUPABASE_URL (steht nicht im Repo).
    PC:    SUPABASE_URL und SUPABASE_KEY aus pipeline/render_dienst/.env (steht in .gitignore).
Die Adresse und der Schlüssel werden in jeder Ausgabe und in jedem Log durch Platzhalter ersetzt (maskiere()).
"""
import datetime
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HIER = Path(__file__).resolve().parent          # pipeline/render_dienst
PIPELINE = HIER.parent                          # pipeline
REPO = PIPELINE.parent                          # Repo-Wurzel
sys.path.insert(0, str(PIPELINE))
import post_buffer as pb  # noqa: E402  (Supabase-Zugriff, ffprobe, Upload-Kopie: nicht doppelt pflegen)

PRAEFIX = "render"
OFFLINE_NACH_SEKUNDEN = 300                     # Herzschlag älter als 5 Min. = PC offline
ENDZUSTAENDE = ("fertig", "fehler", "keine_gpu")
MB = pb.MB

_GEHEIM = []                                    # Texte, die nie in einer Ausgabe stehen dürfen (Adresse, Schlüssel)


def konsole_utf8():
    """Windows-Konsolen und Umleitungen nutzen sonst cp1252 und stolpern über „→“ oder „·“. Außerdem: Tracebacks laufen durch maskiere()."""
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass

    def hook(typ, wert, tb):
        import traceback
        sys.stderr.write(maskiere("".join(traceback.format_exception(typ, wert, tb))))

    sys.excepthook = hook


def merke_geheimnis(text):
    if text and len(text) >= 8 and text not in _GEHEIM:
        _GEHEIM.append(text)
        host = re.sub(r"^https?://", "", text).rstrip("/")
        if host != text and host not in _GEHEIM:
            _GEHEIM.append(host)


def maskiere(text):
    text = str(text)
    for g in sorted(_GEHEIM, key=len, reverse=True):
        text = text.replace(g, "<GEHEIM>")
    return re.sub(r"https://[a-z0-9]+\.supabase\.co", "https://<SUPABASE_URL>", text)


def ausgabe(text="", ende="\n"):
    print(maskiere(text), end=ende, flush=True)


def lade_env(pfad=None):
    """Liest pipeline/render_dienst/.env (KEY=WERT, # Kommentare) in os.environ. Bereits gesetzte Variablen bleiben unverändert."""
    pfad = Path(pfad) if pfad else HIER / ".env"
    if not pfad.is_file():
        return False
    for zeile in pfad.read_text(encoding="utf-8-sig").splitlines():
        zeile = zeile.strip()
        if not zeile or zeile.startswith("#") or "=" not in zeile:
            continue
        k, _, v = zeile.partition("=")
        k, v = k.strip(), v.strip()
        if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
            v = v[1:-1]
        if k and v and k not in os.environ:
            os.environ[k] = v
    return True


def jetzt():
    return datetime.datetime.now(datetime.timezone.utc)


def iso(zeit=None):
    return (zeit or jetzt()).isoformat(timespec="seconds")


def parse_zeit(text):
    """ISO-Zeit (auch mit „Z“ oder beliebig vielen Nachkommastellen) → datetime mit Zone, sonst None."""
    if not text:
        return None
    t = str(text).strip().replace("Z", "+00:00")
    t = re.sub(r"\.(\d{1,6})\d*", lambda m: "." + m.group(1).ljust(6, "0"), t)
    try:
        d = datetime.datetime.fromisoformat(t)
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)


def sha256(pfad):
    return pb.sha256(pfad)


def sauber(name):
    """Dateisichere Kennung (Rechnername, Projekt)."""
    return re.sub(r"[^A-Za-z0-9_.-]+", "-", str(name)).strip("-") or "x"


class SpeicherFehler(pb.Fehler):
    def __init__(self, text, status=None):
        super().__init__(maskiere(text))
        self.status = status


class Speicher(pb.Supabase):
    """Supabase Storage mit Wiederholung bei Netz- und Serverfehlern. Erbt Adresse und Anmelde-Köpfe von post_buffer.Supabase."""

    def __init__(self, url=None, bucket=None):
        super().__init__(url or os.environ.get("SUPABASE_URL"), bucket or os.environ.get("SUPABASE_BUCKET", pb.BUCKET),
                         os.environ.get("SUPABASE_AUTH", "keine"))
        merke_geheimnis(self.basis)
        merke_geheimnis(os.environ.get("SUPABASE_KEY"))

    # ── Basis ──
    def _anfrage(self, methode, teil, kopf=None, daten=None, timeout=60, versuche=4):
        url = f"{self.basis}/storage/v1/{teil}"
        letzte = None
        for v in range(versuche):
            try:
                status, kz, body = pb.http(methode, url, self.kopf(kopf), daten, timeout)
            except pb.Fehler as e:
                letzte = SpeicherFehler(str(e))
            else:
                if status < 500 and status != 429:
                    return status, kz, body
                letzte = SpeicherFehler(f"HTTP {status} bei {methode} {teil.split('?')[0]}: {pb.json_oder_text(body)}", status)
            if v < versuche - 1:
                time.sleep(min(30, 2 * 2 ** v))
        raise letzte

    def _fehler(self, status, kz, body, was):
        return SpeicherFehler(str(self.meldung(status, kz, body, was)), status)

    # ── Dateien ──
    def schreibe_json(self, objekt, daten):
        roh = json.dumps(daten, ensure_ascii=False, indent=1).encode("utf-8")
        status, kz, body = self._anfrage("POST", f"object/{self.pfad(self.bucket)}/{self.pfad(objekt)}",
                                         {"Content-Type": "application/json", "x-upsert": "true", "Cache-Control": "max-age=0",
                                          "Content-Length": str(len(roh))}, roh)
        if status not in (200, 201):
            raise self._fehler(status, kz, body, f"Schreiben {objekt}")

    def lese_bytes(self, objekt):
        """Inhalt oder None, wenn es die Datei nicht gibt."""
        status, kz, body = self._anfrage("GET", f"object/authenticated/{self.pfad(self.bucket)}/{self.pfad(objekt)}?t={int(time.time() * 1000)}",
                                         {"Cache-Control": "no-cache"})
        if status == 200:
            return body
        if status == 404 or (status == 400 and (b"not_found" in body.lower() or b"not found" in body.lower())):
            return None
        raise self._fehler(status, kz, body, f"Lesen {objekt}")

    def lese_json(self, objekt):
        roh = self.lese_bytes(objekt)
        if roh is None:
            return None
        try:
            return json.loads(roh.decode("utf-8-sig"))
        except ValueError:
            return None

    def liste(self, praefix, limit=1000):
        """Einträge direkt unter dem Präfix (Dateien mit name, updated_at, created_at, metadata; Ordner ohne id)."""
        koerper = json.dumps({"prefix": praefix.strip("/"), "limit": limit, "offset": 0, "sortBy": {"column": "name", "order": "asc"}}).encode()
        status, kz, body = self._anfrage("POST", f"object/list/{self.pfad(self.bucket)}", {"Content-Type": "application/json"}, koerper)
        if status != 200:
            raise self._fehler(status, kz, body, f"Auflisten {praefix}")
        return [e for e in json.loads(body) if not str(e.get("name", "")).startswith(".")]

    def lade_hoch(self, objekt, datei, mime="application/octet-stream", versuche=3):
        datei = Path(datei)
        groesse = datei.stat().st_size
        letzte = None
        for v in range(versuche):
            try:
                with open(datei, "rb") as f:
                    status, kz, body = pb.http("POST", f"{self.basis}/storage/v1/object/{self.pfad(self.bucket)}/{self.pfad(objekt)}",
                                               self.kopf({"Content-Type": mime, "Content-Length": str(groesse), "x-upsert": "true",
                                                          "Cache-Control": "max-age=0"}), f, 1800)
                if status in (200, 201):
                    return
                if status < 500 and status != 429:
                    raise self._fehler(status, kz, body, f"Upload {objekt}")
                letzte = SpeicherFehler(f"HTTP {status} beim Upload {objekt}: {pb.json_oder_text(body)}", status)
            except pb.Fehler as e:
                if isinstance(e, SpeicherFehler) and e.status and e.status < 500 and e.status != 429:
                    raise
                letzte = SpeicherFehler(str(e))
            if v < versuche - 1:
                time.sleep(5 * (v + 1))
        raise letzte

    def lade_runter(self, objekt, ziel, versuche=3):
        """Streamt eine Datei nach ziel (erst *.teil, dann umbenennen). Gibt die Größe zurück."""
        ziel = Path(ziel)
        ziel.parent.mkdir(parents=True, exist_ok=True)
        teil = ziel.with_name(ziel.name + ".teil")
        url = f"{self.basis}/storage/v1/object/authenticated/{self.pfad(self.bucket)}/{self.pfad(objekt)}?t={int(time.time() * 1000)}"
        letzte = None
        for v in range(versuche):
            try:
                anfrage = urllib.request.Request(url, headers=self.kopf({"Cache-Control": "no-cache"}), method="GET")
                with urllib.request.urlopen(anfrage, timeout=300) as antwort, open(teil, "wb") as f:
                    soll = int(antwort.headers.get("Content-Length") or -1)
                    n = 0
                    while True:
                        block = antwort.read(1 << 20)
                        if not block:
                            break
                        f.write(block)
                        n += len(block)
                if soll >= 0 and n != soll:
                    raise SpeicherFehler(f"Download {objekt} unvollständig ({n} von {soll} Byte)")
                os.replace(teil, ziel)
                return n
            except urllib.error.HTTPError as e:
                body = e.read()
                if e.code < 500 and e.code != 429:
                    raise self._fehler(e.code, e.headers, body, f"Download {objekt}")
                letzte = SpeicherFehler(f"HTTP {e.code} beim Download {objekt}", e.code)
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, SpeicherFehler) as e:
                letzte = e if isinstance(e, SpeicherFehler) else SpeicherFehler(f"Netzwerkfehler beim Download {objekt}: {e}")
            if v < versuche - 1:
                time.sleep(5 * (v + 1))
        teil.unlink(missing_ok=True)
        raise letzte

    def loesche(self, objekte):
        objekte = [o for o in objekte if o]
        if not objekte:
            return
        koerper = json.dumps({"prefixes": objekte}).encode()
        status, kz, body = self._anfrage("DELETE", f"object/{self.pfad(self.bucket)}", {"Content-Type": "application/json"}, koerper)
        if status != 200:
            raise self._fehler(status, kz, body, "Löschen")

    def loesche_ordner(self, praefix):
        """Löscht alle Dateien direkt unter dem Präfix (Auftragsordner in render/fertig/<id>/)."""
        namen = [f"{praefix.strip('/')}/{e['name']}" for e in self.liste(praefix) if e.get("id")]
        self.loesche(namen)
        return namen

    # ── Herzschlag und Aufträge ──
    def herzschlaege(self):
        """Alle Rechner mit Herzschlag: Liste von dict(rechner, daten, alter_s, online). Das Alter kommt von der Serverzeit (updated_at), nicht von der PC-Uhr."""
        ergebnis = []
        for e in self.liste(f"{PRAEFIX}/herzschlag"):
            if not e.get("id") or not e["name"].endswith(".json"):
                continue
            daten = self.lese_json(f"{PRAEFIX}/herzschlag/{e['name']}") or {}
            server = parse_zeit(e.get("updated_at") or e.get("created_at"))
            eigen = parse_zeit(daten.get("zeit"))
            alter = (jetzt() - (server or eigen or jetzt())).total_seconds()
            online = alter <= OFFLINE_NACH_SEKUNDEN and daten.get("status") != "beendet"
            ergebnis.append({"rechner": daten.get("rechner") or e["name"][:-5], "daten": daten, "alter_s": alter, "online": online})
        return sorted(ergebnis, key=lambda x: x["alter_s"])


def verbinde():
    """Speicher mit Zugang aus Umgebung/.env; verständliche Meldung statt Traceback."""
    lade_env()
    return Speicher()
