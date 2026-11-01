#!/usr/bin/env python3
"""Bringt ein fertiges, abgenommenes TikTok-Video als ENTWURF nach Buffer. Der Inhaber gibt den Post selbst in Buffer frei.

Regel:   CLAUDE.md (Plattformregeln) und docs/11-automatisierung.md §3C bzw. §3C-Technik (exakte Feldnamen, Quelle: Introspection 01.11.).
         Das Skript legt NUR Entwürfe an (saveToDraft: true). Es veröffentlicht nie selbst, es gibt keinen Schalter dafür.

Aufruf:  python3 pipeline/post_buffer.py --video <mp4> --kanal simulierbar|stelldirvor.pov --text "<Caption>" --zeit "2026-11-01T22:30:00+01:00" [--trocken]
         python3 pipeline/post_buffer.py --pruefen [--schreibtest]      Zugangstest (Buffer lesen, Supabase lesen, optional Supabase-Roundtrip)
         python3 pipeline/post_buffer.py --aufraeumen [--trocken]       Supabase-Dateien löschen, deren Buffer-Post „sent“ ist

Ablauf:  1. Video prüfen (1080x1920, mind. 61 s)  2. > 48 MB: Upload-Kopie per 2-pass H.264 (Original bleibt unberührt)
         3. Upload nach Supabase (privater Bucket, nicht erratbarer Pfad <datum>/<uuid>.mp4)  4. signierter Link (24 h)
         5. Buffer-Entwurf mit KI-Kennzeichnung AN  6. Eintrag in pipeline/out/buffer_log.jsonl (nicht im Repo)
         --trocken führt alle Prüfungen und lesenden Abfragen aus, schreibt aber nichts nach Supabase und Buffer, sondern gibt die Mutation nur aus.

Zugänge: Cloud: Der Proxy setzt die Header selbst ein (Buffer: Authorization; Supabase: apikey). Das Skript setzt dort KEINE Anmelde-Header.
         Lokal (Windows): Umgebungsvariablen BUFFER_API_KEY (→ Authorization: Bearer) und SUPABASE_KEY (→ Header apikey).
         Supabase-Host: Umgebungsvariable SUPABASE_URL oder --supabase-url. Steht bewusst NICHT im Repo (öffentlich), es gibt keinen Fallback.
         Storage braucht evtl. zusätzlich einen Authorization-Header. Konfigurierbar (Einzelheiten in docs/11 §3C-Technik):
           SUPABASE_AUTH=keine    (Standard) kein Authorization-Header vom Skript; das Gateway ergänzt ihn bei neuen sb_secret_-Keys (zu testen)
           SUPABASE_AUTH=bearer   Authorization: Bearer $SUPABASE_KEY (nur für alte JWT-Keys, die mit „eyJ“ beginnen)
           SUPABASE_AUTHORIZATION kompletter Wert des Authorization-Headers, z. B. „Bearer eyJ…“ (hat Vorrang)
Python:  nur Standardbibliothek + ffmpeg/ffprobe. Optional: ist `graphql-core` installiert, prüft --trocken zusätzlich das ganze Mutations-Dokument gegen das Live-Schema.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

HIER = Path(__file__).resolve().parent
LOG_STANDARD = HIER / "out" / "buffer_log.jsonl"
KOPIEN_ORDNER = HIER / "out" / "_buffer"     # Upload-Kopien (das Original wird nie angefasst)

BUFFER_API = "https://api.buffer.com"
KANAELE = ("simulierbar", "stelldirvor.pov")  # Namen der TikTok-Kanäle in Buffer; IDs werden live aufgelöst
BUCKET = "buffer-uploads"
SIGNIER_SEKUNDEN = 86400                       # 24 h
MIN_SEKUNDEN = 61                              # CLAUDE.md: Videos mindestens 61 s
MAX_SEKUNDEN = 600                             # Buffer/TikTok: Video 3 s bis 10 min (docs/11 §2)
BREITE, HOEHE = 1080, 1920
MAX_MB = 48                                    # ab dieser Größe Upload-Kopie
ZIEL_MB = 45                                   # Zielgröße der Kopie (MB = 1024*1024 Byte)
MB = 1024 * 1024
AUDIO_BPS = 192_000
MIN_VIDEO_BPS = 1_500_000                      # darunter wird die Kopie bei 1080x1920 sichtbar schlecht → lieber abbrechen
GUELTIG = ("automatic", "notification")


class Fehler(Exception):
    """Abbruch mit lesbarer Meldung (kein Traceback)."""


# ───────────────────────── Ausgabe ─────────────────────────

def info(text):
    print(text, flush=True)


class Bericht:
    """Sammelt die Prüfungen eines Laufs. Im Trockenlauf wird alles gesammelt, im echten Lauf bricht jede Prüfung ab, bevor etwas geschrieben wird."""

    def __init__(self):
        self.fehler = []
        self.warnungen = []
        self.angelegt = False  # Buffer-Post existiert bereits (dann bedeutet ein Fehler: Zustand prüfen)

    def ok(self, text):
        info(f"[OK]       {text}")

    def warnung(self, text):
        self.warnungen.append(text)
        info(f"[WARNUNG]  {text}")

    def fehl(self, text):
        self.fehler.append(text)
        info(f"[FEHLER]   {text}")


def kurz(url):
    """URL ohne Query (enthält bei signierten Links das Token) für Meldungen."""
    return url.split("?", 1)[0]


# ───────────────────────── HTTP ─────────────────────────

def http(methode, url, kopf=None, daten=None, timeout=60):
    """Liefert (status, header, bytes). HTTP-Fehler werfen nicht; Netzwerkfehler werfen Fehler. daten = bytes oder geöffnete Datei (dann Content-Length im Kopf)."""
    anfrage = urllib.request.Request(url, data=daten, headers=kopf or {}, method=methode)
    try:
        with urllib.request.urlopen(anfrage, timeout=timeout) as antwort:
            return antwort.status, antwort.headers, antwort.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read()
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
        raise Fehler(f"Netzwerkfehler bei {methode} {kurz(url)}: {e}")


def json_oder_text(rohdaten):
    try:
        return json.loads(rohdaten)
    except ValueError:
        return rohdaten.decode("utf-8", "replace")[:300]


# ───────────────────────── Buffer (GraphQL) ─────────────────────────

MUTATION = """mutation EntwurfAnlegen($input: CreatePostInput!) {
  createPost(input: $input) {
    __typename
    ... on PostActionSuccess {
      post {
        id
        status
        dueAt
        schedulingType
        channelId
        text
        metadata { __typename ... on TiktokPostMetadata { isAiGenerated type } }
        assets {
          id
          type
          mimeType
          source
          ... on VideoAsset { video { durationMs width height fileSize isVideoProcessing isTranscodingRequired } }
        }
      }
    }
    ... on NotFoundError { message }
    ... on UnauthorizedError { message }
    ... on UnexpectedError { message }
    ... on RestProxyError { message }
    ... on LimitReachedError { message }
    ... on InvalidInputError { message }
  }
}"""

KANAL_ABFRAGE = """query Kanaele($o: OrganizationId!) {
  channels(input: {organizationId: $o}) { id name service isDisconnected isLocked isQueuePaused timezone }
}"""

POST_ABFRAGE = """query PostStatus($id: PostId!) { post(input: {id: $id}) { id status dueAt sentAt externalLink } }"""


def buffer_kopf():
    kopf = {"Content-Type": "application/json"}
    if os.environ.get("BUFFER_API_KEY"):  # lokal; in der Cloud setzt der Proxy den Header
        kopf["Authorization"] = "Bearer " + os.environ["BUFFER_API_KEY"]
    return kopf


def buffer_roh(query, variablen=None):
    """Sendet eine GraphQL-Anfrage, liefert (http_status, antwort_dict)."""
    status, _, body = http("POST", BUFFER_API, buffer_kopf(), json.dumps({"query": query, "variables": variablen or {}}).encode(), timeout=120)
    antwort = json_oder_text(body)
    if not isinstance(antwort, dict):
        raise Fehler(f"Buffer: keine JSON-Antwort (HTTP {status}): {antwort}")
    return status, antwort


def buffer_lesen(query, variablen=None):
    """Lesende Abfrage; liefert `data` oder wirft Fehler."""
    status, antwort = buffer_roh(query, variablen)
    if antwort.get("errors") or not antwort.get("data"):
        meldungen = "; ".join(f.get("message", "?") for f in antwort.get("errors", [])) or f"HTTP {status}"
        hinweis = " (Buffer-Zugang fehlt: Header Authorization nicht gesetzt?)" if status in (401, 403) else ""
        raise Fehler(f"Buffer-Abfrage fehlgeschlagen: {meldungen}{hinweis}")
    return antwort["data"]


def lade_kanaele():
    org = os.environ.get("BUFFER_ORG_ID")
    if not org:
        orgs = buffer_lesen("query { account { organizations { id name } } }")["account"]["organizations"]
        if len(orgs) != 1:
            raise Fehler(f"{len(orgs)} Organisationen im Buffer-Konto: BUFFER_ORG_ID setzen.")
        org = orgs[0]["id"]
    return org, buffer_lesen(KANAL_ABFRAGE, {"o": org})["channels"]


def finde_kanal(name, bericht):
    org, kanaele = lade_kanaele()
    treffer = [k for k in kanaele if k["name"] == name]
    if not treffer:
        raise Fehler(f"Kanal „{name}“ nicht in Buffer gefunden (vorhanden: {', '.join(k['name'] for k in kanaele)}).")
    k = treffer[0]
    if k["service"] != "tiktok":
        raise Fehler(f"Kanal „{name}“ ist kein TikTok-Kanal (service={k['service']}).")
    if k["isDisconnected"] or k["isLocked"]:
        raise Fehler(f"Kanal „{name}“ ist {'getrennt' if k['isDisconnected'] else 'gesperrt'}: in Buffer neu verbinden.")
    if k["isQueuePaused"]:
        bericht.warnung(f"Die Warteschlange von „{name}“ ist in Buffer pausiert (Entwürfe sind davon nicht betroffen, geplante Posts schon).")
    bericht.ok(f"Buffer-Kanal „{name}“: TikTok, verbunden, Zeitzone {k['timezone']}.")
    return k


# ───────── Schema-Abgleich (Introspection, nur lesend) ─────────

TYP_FRAGMENT = "fragment T on __Type { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } } } }"
TYP_ABFRAGE = "query($n: String!) { __type(name: $n) { kind name inputFields { name defaultValue type { ...T } } enumValues { name } } }\n" + TYP_FRAGMENT
ISO = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$")


class Schema:
    """Holt nur die Eingabetypen, die in den Variablen vorkommen, und prüft Feldnamen, Pflichtfelder, Enum-Werte und Skalartypen."""

    def __init__(self):
        self.typen = {}

    def typ(self, name):
        if name not in self.typen:
            t = buffer_lesen(TYP_ABFRAGE, {"n": name}).get("__type")
            if t is None:
                raise Fehler(f"Schema: Typ „{name}“ existiert nicht mehr bei Buffer.")
            self.typen[name] = t
        return self.typen[name]

    def pruefe(self, t, wert, pfad, fehler):
        if t["kind"] == "NON_NULL":
            if wert is None:
                fehler.append(f"{pfad}: Pflichtfeld ist null")
            else:
                self.pruefe(t["ofType"], wert, pfad, fehler)
            return
        if wert is None:
            return
        if t["kind"] == "LIST":
            if not isinstance(wert, list):
                fehler.append(f"{pfad}: Liste erwartet")
                return
            for i, w in enumerate(wert):
                self.pruefe(t["ofType"], w, f"{pfad}[{i}]", fehler)
            return
        name, art = t["name"], t["kind"]
        if art == "SCALAR":
            if name == "Boolean" and not isinstance(wert, bool):
                fehler.append(f"{pfad}: Boolean erwartet, ist {wert!r}")
            elif name == "Int" and (not isinstance(wert, int) or isinstance(wert, bool)):
                fehler.append(f"{pfad}: Int erwartet, ist {wert!r}")
            elif name == "DateTime" and not (isinstance(wert, str) and ISO.match(wert)):
                fehler.append(f"{pfad}: DateTime (ISO 8601 mit Zone) erwartet, ist {wert!r}")
            elif name not in ("Boolean", "Int", "DateTime", "Float") and not isinstance(wert, str):
                fehler.append(f"{pfad}: String ({name}) erwartet, ist {wert!r}")
        elif art == "ENUM":
            erlaubt = [e["name"] for e in self.typ(name)["enumValues"]]
            if wert not in erlaubt:
                fehler.append(f"{pfad}: {wert!r} ist kein Wert von {name} ({', '.join(erlaubt)})")
        elif art == "INPUT_OBJECT":
            if not isinstance(wert, dict):
                fehler.append(f"{pfad}: Objekt ({name}) erwartet")
                return
            felder = {f["name"]: f for f in self.typ(name)["inputFields"]}
            for schluessel in wert:
                if schluessel not in felder:
                    fehler.append(f"{pfad}.{schluessel}: Feld gibt es in {name} nicht (vorhanden: {', '.join(felder)})")
            for fname, f in felder.items():
                if fname in wert:
                    self.pruefe(f["type"], wert[fname], f"{pfad}.{fname}", fehler)
                elif f["type"]["kind"] == "NON_NULL" and f["defaultValue"] is None:
                    fehler.append(f"{pfad}.{fname}: Pflichtfeld fehlt")


def schema_pruefung(variablen, bericht):
    """Variablen der Mutation gegen das Live-Schema; zusätzlich (falls graphql-core installiert) das ganze Dokument."""
    try:
        fehler = []
        Schema().pruefe({"kind": "NON_NULL", "ofType": {"kind": "INPUT_OBJECT", "name": "CreatePostInput"}}, variablen["input"], "input", fehler)
    except Fehler as e:
        bericht.fehl(f"Schema-Abgleich nicht möglich: {e}")
        return
    if fehler:
        for f in fehler:
            bericht.fehl(f"Schema-Abgleich: {f}")
    else:
        bericht.ok("Schema-Abgleich: alle Felder und Werte von `input` passen zu CreatePostInput (Live-Introspection).")
    try:
        import graphql  # optional
    except ImportError:
        info("[HINWEIS]  graphql-core nicht installiert: Selektion der Mutation (Antwortfelder) nicht gegen das Schema geprüft (pip install graphql-core).")
        return
    try:
        schema = graphql.build_client_schema(buffer_lesen(graphql.get_introspection_query(descriptions=False)))
        probleme = graphql.validate(schema, graphql.parse(MUTATION))
    except Fehler as e:
        bericht.fehl(f"graphql-core: Schema nicht ladbar: {e}")
        return
    if probleme:
        for p in probleme:
            bericht.fehl(f"graphql-core: {p.message}")
    else:
        bericht.ok("graphql-core: Mutations-Dokument ist gegen das Live-Schema gültig.")


# ───────────────────────── Video ─────────────────────────

def sonde(pfad):
    """ffprobe → Dict mit den Eckdaten."""
    if not shutil.which("ffprobe") or not shutil.which("ffmpeg"):
        raise Fehler("ffmpeg/ffprobe nicht gefunden (PATH).")
    lauf = subprocess.run(["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(pfad)], capture_output=True, text=True)
    if lauf.returncode != 0:
        raise Fehler(f"ffprobe kann {pfad} nicht lesen: {lauf.stderr.strip()[:200]}")
    d = json.loads(lauf.stdout)
    v = next((s for s in d["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in d["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        raise Fehler("Die Datei enthält keine Videospur.")
    return {
        "dauer": float(d["format"]["duration"]),
        "groesse": int(d["format"]["size"]),
        "breite": int(v["width"]), "hoehe": int(v["height"]),
        "vcodec": v.get("codec_name"), "pix_fmt": v.get("pix_fmt"),
        "farbe": {k: v.get(k) for k in ("color_space", "color_primaries", "color_transfer") if v.get(k) not in (None, "unknown")},
        "audio": a is not None, "acodec": a.get("codec_name") if a else None,
        "abitrate": int(a["bit_rate"]) if a and a.get("bit_rate") else None,
    }


def pruefe_video(pfad, bericht):
    if not pfad.is_file():
        raise Fehler(f"Video nicht gefunden: {pfad}")
    s = sonde(pfad)
    if (s["breite"], s["hoehe"]) == (BREITE, HOEHE):
        bericht.ok(f"Video {s['breite']}x{s['hoehe']}, {s['dauer']:.1f} s, {s['groesse'] / MB:.1f} MB, {s['vcodec']}/{s['acodec'] or 'ohne Ton'}.")
    else:
        bericht.fehl(f"Video ist {s['breite']}x{s['hoehe']}, erwartet {BREITE}x{HOEHE}.")
    if s["dauer"] < MIN_SEKUNDEN:
        bericht.fehl(f"Video ist nur {s['dauer']:.1f} s lang, nötig sind mindestens {MIN_SEKUNDEN} s (CRP, CLAUDE.md).")
    if s["dauer"] > MAX_SEKUNDEN:
        bericht.fehl(f"Video ist {s['dauer']:.0f} s lang, Buffer/TikTok erlauben höchstens {MAX_SEKUNDEN} s.")
    if s["vcodec"] != "h264":
        bericht.warnung(f"Videocodec ist {s['vcodec']}, erwartet h264.")
    if not s["audio"]:
        bericht.warnung("Das Video hat keine Tonspur.")
    return s


def komprimiere(video, s, ziel, max_bytes, ziel_bytes, preset, bericht):
    """2-pass H.264 in gleicher Auflösung auf Zielgröße. Audio: AAC bleibt unverändert (copy), sonst AAC 192k. Das Original wird nur gelesen."""
    if ziel.is_file() and ziel.stat().st_mtime >= video.stat().st_mtime and ziel.stat().st_size <= max_bytes:
        k = sonde(ziel)
        if (k["breite"], k["hoehe"]) == (s["breite"], s["hoehe"]) and abs(k["dauer"] - s["dauer"]) < 0.5:
            bericht.ok(f"Upload-Kopie schon vorhanden und aktuell: {ziel.name} ({ziel.stat().st_size / MB:.1f} MB).")
            return ziel
    ziel.parent.mkdir(parents=True, exist_ok=True)
    audio_kopie = s["audio"] and s["acodec"] == "aac"
    audio_bps = (s["abitrate"] or AUDIO_BPS) if audio_kopie else (AUDIO_BPS if s["audio"] else 0)
    audio_args = ["-c:a", "copy"] if audio_kopie else (["-c:a", "aac", "-b:a", "192k"] if s["audio"] else ["-an"])
    farbe = []
    for flag, key in (("-colorspace", "color_space"), ("-color_primaries", "color_primaries"), ("-color_trc", "color_transfer")):
        if s["farbe"].get(key):
            farbe += [flag, s["farbe"][key]]
    faktor = 0.97  # Container und Rate-Control-Spielraum
    info(f"           Datei ist {s['groesse'] / MB:.1f} MB (> {max_bytes / MB:.0f} MB): erzeuge Upload-Kopie mit 2-pass H.264, das dauert ein bis drei Minuten ...")
    for versuch in range(3):
        v_bps = int(ziel_bytes * 8 * faktor / s["dauer"] - audio_bps)
        if v_bps < MIN_VIDEO_BPS:
            raise Fehler(f"Zielbitrate {v_bps / 1e6:.2f} Mbit/s ist zu niedrig für 1080x1920 (Dauer {s['dauer']:.0f} s). Größeres --ziel-mb wählen oder das Video kürzen.")
        kbps = v_bps // 1000
        with tempfile.TemporaryDirectory() as tmp:
            logbasis = str(Path(tmp) / "pass")
            basis = ["ffmpeg", "-y", "-hide_banner", "-v", "error", "-stats" if sys.stderr.isatty() else "-nostats", "-i", str(video), "-map", "0:v:0",
                     "-c:v", "libx264", "-preset", preset, "-profile:v", "high", "-pix_fmt", "yuv420p", "-b:v", f"{kbps}k", "-passlogfile", logbasis]
            for nr, extra in ((1, ["-an", "-f", "null", os.devnull]),
                              (2, (["-map", "0:a:0"] if s["audio"] else []) + farbe + audio_args + ["-movflags", "+faststart", str(ziel)])):
                info(f"           Pass {nr}/2 mit {kbps} kbit/s (Versuch {versuch + 1}) ...")
                lauf = subprocess.run(basis + ["-pass", str(nr)] + extra)
                if lauf.returncode != 0:
                    ziel.unlink(missing_ok=True)
                    raise Fehler(f"ffmpeg Pass {nr} ist fehlgeschlagen (Exit {lauf.returncode}).")
        groesse = ziel.stat().st_size
        if groesse <= max_bytes:
            break
        faktor *= ziel_bytes / groesse * 0.98  # zu groß: Bitrate proportional senken und erneut
    else:
        ziel.unlink(missing_ok=True)
        raise Fehler(f"Upload-Kopie bleibt über {max_bytes / MB:.0f} MB.")
    k = sonde(ziel)
    if (k["breite"], k["hoehe"]) != (s["breite"], s["hoehe"]) or abs(k["dauer"] - s["dauer"]) > 0.5:
        ziel.unlink(missing_ok=True)
        raise Fehler(f"Upload-Kopie weicht ab: {k['breite']}x{k['hoehe']}, {k['dauer']:.1f} s (Original {s['breite']}x{s['hoehe']}, {s['dauer']:.1f} s).")
    bericht.ok(f"Upload-Kopie: {ziel.name}, {groesse / MB:.1f} MB, {k['breite']}x{k['hoehe']}, {k['dauer']:.1f} s, Video {kbps} kbit/s ({'Audio unverändert' if audio_kopie else 'AAC 192k'}).")
    return ziel


# ───────────────────────── Supabase Storage ─────────────────────────

class Supabase:
    def __init__(self, url, bucket, auth):
        if not url:
            raise Fehler("SUPABASE_URL fehlt (Umgebungsvariable oder --supabase-url). Der Host steht bewusst nicht im Repo.")
        url = url.strip().rstrip("/")
        if not url.startswith("https://"):
            raise Fehler("SUPABASE_URL muss mit https:// beginnen.")
        self.basis = url
        self.host = urllib.parse.urlsplit(url).netloc
        self.bucket = bucket
        self.auth = auth

    def kopf(self, extra=None):
        # Cloud: der Proxy setzt apikey (und ggf. Authorization). Lokal: SUPABASE_KEY.
        k = dict(extra or {})
        key = os.environ.get("SUPABASE_KEY")
        if key:
            k["apikey"] = key
            if self.auth == "bearer":
                k["Authorization"] = "Bearer " + key
        if os.environ.get("SUPABASE_AUTHORIZATION"):
            k["Authorization"] = os.environ["SUPABASE_AUTHORIZATION"]
        return k

    def pfad(self, objekt):
        return urllib.parse.quote(objekt, safe="/")

    def meldung(self, status, kopfzeilen, body, was):
        text = json_oder_text(body)
        code = kopfzeilen.get("Sb-Error-Code") if kopfzeilen else None
        hinweis = ""
        blob = f"{code or ''} {text}"
        if "MISSING_API_KEY" in blob or "No API key" in blob:
            hinweis = " → Der Header apikey kommt nicht an (Proxy-Secret für den Supabase-Host fehlt oder greift nicht)."
        elif "required property 'authorization'" in blob:
            hinweis = (" → Storage verlangt einen Authorization-Header. Entweder kommt der apikey nicht an (Proxy-Secret fehlt), oder das Gateway ergänzt "
                       "Authorization nicht (dann SUPABASE_AUTHORIZATION bzw. Proxy-Header Authorization setzen). Siehe docs/11 §3C-Technik.")
        elif "authorization" in blob.lower() or "JWT" in blob or status in (401, 403):
            hinweis = " → Authorization oder apikey wird abgelehnt: SUPABASE_AUTH/SUPABASE_AUTHORIZATION bzw. docs/11 §3C-Technik beachten."
        return Fehler(f"Supabase {was} fehlgeschlagen (HTTP {status}{', ' + code if code else ''}): {text}{hinweis}")

    def bucket_info(self):
        status, kopfzeilen, body = http("GET", f"{self.basis}/storage/v1/bucket/{self.pfad(self.bucket)}", self.kopf())
        if status != 200:
            raise self.meldung(status, kopfzeilen, body, f"Bucket-Abfrage „{self.bucket}“")
        return json.loads(body)

    def liste(self):
        status, kopfzeilen, body = http("POST", f"{self.basis}/storage/v1/object/list/{self.pfad(self.bucket)}",
                                        self.kopf({"Content-Type": "application/json"}), json.dumps({"prefix": "", "limit": 1}).encode())
        if status != 200:
            raise self.meldung(status, kopfzeilen, body, "Auflisten")
        return json.loads(body)

    def hochladen(self, objekt, datei):
        groesse = Path(datei).stat().st_size
        with open(datei, "rb") as f:
            status, kopfzeilen, body = http("POST", f"{self.basis}/storage/v1/object/{self.pfad(self.bucket)}/{self.pfad(objekt)}",
                                            self.kopf({"Content-Type": "video/mp4", "Content-Length": str(groesse), "x-upsert": "false",
                                                       "Cache-Control": "max-age=3600"}), f, timeout=1800)
        if status not in (200, 201):
            raise self.meldung(status, kopfzeilen, body, "Upload")

    def signieren(self, objekt, sekunden=SIGNIER_SEKUNDEN):
        status, kopfzeilen, body = http("POST", f"{self.basis}/storage/v1/object/sign/{self.pfad(self.bucket)}/{self.pfad(objekt)}",
                                        self.kopf({"Content-Type": "application/json"}), json.dumps({"expiresIn": sekunden}).encode())
        if status != 200:
            raise self.meldung(status, kopfzeilen, body, "Link-Signierung")
        rel = json.loads(body).get("signedURL") or json.loads(body).get("signedUrl")
        if not rel:
            raise Fehler(f"Supabase: Antwort der Signierung ohne signedURL: {body[:200]!r}")
        if rel.startswith("http"):
            return rel
        return self.basis + ("" if rel.startswith("/storage/v1") else "/storage/v1") + rel

    def link_test(self, signiert):
        """Ruft den signierten Link ab (nur das erste Byte). Hinweis: Läuft der Aufruf über den Proxy, ergänzt dieser evtl. den apikey; die öffentliche Erreichbarkeit beweist das nicht."""
        status, kopfzeilen, _ = http("GET", signiert, {"Range": "bytes=0-0"})
        return status, kopfzeilen.get("Content-Type") if kopfzeilen else None

    def loeschen(self, objekte):
        status, kopfzeilen, body = http("DELETE", f"{self.basis}/storage/v1/object/{self.pfad(self.bucket)}",
                                        self.kopf({"Content-Type": "application/json"}), json.dumps({"prefixes": list(objekte)}).encode())
        if status != 200:
            raise self.meldung(status, kopfzeilen, body, "Löschen")
        return json.loads(body)


def supabase_pruefung(sb, bericht, brauche_bytes=None):
    """Lesender Zugangstest: Bucket vorhanden, privat, Größenlimit, Auflisten erlaubt."""
    try:
        b = sb.bucket_info()
        sb.liste()
    except Fehler as e:
        bericht.fehl(str(e))
        return False
    bericht.ok(f"Supabase-Bucket „{sb.bucket}“ erreichbar, Auflisten erlaubt (apikey und Authorization werden akzeptiert).")
    if b.get("public"):
        bericht.warnung("Der Bucket ist ÖFFENTLICH. Erwartet war ein privater Bucket (signierte Links).")
    limit = b.get("file_size_limit")
    if limit and brauche_bytes and brauche_bytes > limit:
        bericht.fehl(f"Bucket-Limit {limit / MB:.0f} MB je Datei ist kleiner als die Upload-Datei ({brauche_bytes / MB:.1f} MB).")
    elif limit:
        info(f"           Bucket-Limit je Datei: {limit / MB:.0f} MB. Erlaubte MIME-Typen: {b.get('allowed_mime_types') or 'alle'}.")
    return True


# ───────────────────────── Log ─────────────────────────

def log_lesen(pfad):
    if not pfad.is_file():
        return []
    zeilen = []
    for z in pfad.read_text(encoding="utf-8").splitlines():
        try:
            zeilen.append(json.loads(z))
        except ValueError:
            pass
    return zeilen


def log_schreiben(pfad, eintrag):
    pfad.parent.mkdir(parents=True, exist_ok=True)
    with open(pfad, "a", encoding="utf-8") as f:
        f.write(json.dumps(eintrag, ensure_ascii=False) + "\n")


def offene_eintraege(zeilen):
    """Angelegte Entwürfe, deren Supabase-Datei noch nicht gelöscht wurde."""
    weg = {z["pfad"] for z in zeilen if z.get("ereignis") == "geloescht"}
    return [z for z in zeilen if z.get("ereignis") == "angelegt" and z["pfad"] not in weg]


def jetzt():
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ───────────────────────── Eingaben ─────────────────────────

def parse_zeit(text):
    try:
        z = datetime.datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    except ValueError:
        raise Fehler(f"--zeit „{text}“ ist kein ISO-8601-Zeitpunkt (Beispiel: 2026-11-01T22:30:00+01:00).")
    if z.tzinfo is None:
        raise Fehler("--zeit braucht eine Zeitzone, z. B. +01:00 (Winterzeit) bzw. +02:00 (Sommerzeit).")
    return z.astimezone(datetime.timezone.utc)


def caption_hinweise(text, bericht):
    """Weiche Prüfung nach dem Caption-Format in CLAUDE.md (nur Warnungen)."""
    if not text.strip():
        bericht.fehl("Der Text (Caption) ist leer.")
        return
    tags = re.findall(r"#\w+", text)
    if len(text) > 2200:
        bericht.warnung(f"Caption hat {len(text)} Zeichen; TikTok erlaubt höchstens 2200 [Annahme].")
    if "\n" in text.strip():
        bericht.warnung("Caption hat mehrere Zeilen; Format laut CLAUDE.md: eine Zeile.")
    if len(tags) != 5:
        bericht.warnung(f"Caption hat {len(tags)} Hashtags; Format laut CLAUDE.md: genau 5.")
    if any(t.lower() in ("#fyp", "#viral", "#foryou", "#foryoupage") for t in tags):
        bericht.warnung("Caption enthält #fyp/#viral o. Ä.; laut CLAUDE.md verboten.")


def sha256(pfad):
    h = hashlib.sha256()
    with open(pfad, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def raeume_weg(sb, objekt):
    try:
        sb.loeschen([objekt])
        info("           Supabase-Datei wieder gelöscht.")
    except Fehler as e:
        info(f"[WARNUNG]  Supabase-Datei {objekt} konnte nicht gelöscht werden ({e}); später mit --aufraeumen --verwaiste prüfen bzw. im Dashboard löschen.")


def baue_variablen(kanal_id, text, zeit_utc, planung, link):
    return {"input": {
        "channelId": kanal_id,
        "text": text,
        "mode": "customScheduled",          # Zeitpunkt aus dueAt
        "dueAt": zeit_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "schedulingType": planung,          # automatic = Buffer veröffentlicht nach DEINER Freigabe selbst; notification = nur Erinnerung
        "saveToDraft": True,                # ENTWURF: Status „draft“, wird nicht veröffentlicht, bis der Inhaber in Buffer freigibt
        "assets": [{"video": {"url": link}}],
        "metadata": {"tiktok": {"isAiGenerated": True}},  # KI-Kennzeichnung AN
    }}


# ───────────────────────── Befehle ─────────────────────────

def befehl_pruefen(args, sb_url):
    bericht = Bericht()
    info("== Buffer (lesend) ==")
    try:
        org, kanaele = lade_kanaele()
        bericht.ok(f"Buffer erreichbar, {len(kanaele)} Kanäle: " + ", ".join(f"{k['name']} ({k['service']})" for k in kanaele))
        for name in KANAELE:
            if name not in [k["name"] for k in kanaele]:
                bericht.fehl(f"Kanal „{name}“ fehlt in Buffer.")
    except Fehler as e:
        bericht.fehl(str(e))
    info("== Supabase ==")
    try:
        sb = Supabase(sb_url, args.bucket, args.supabase_auth)
    except Fehler as e:
        bericht.fehl(str(e))
        return bericht
    ok = supabase_pruefung(sb, bericht)
    if ok and args.schreibtest:
        info("== Supabase-Schreibtest (Mini-Video, wird danach gelöscht; Buffer wird NICHT berührt) ==")
        objekt = f"_test/{uuid.uuid4().hex}.mp4"
        try:
            with tempfile.TemporaryDirectory() as tmp:
                klein = Path(tmp) / "test.mp4"
                lauf = subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "color=c=black:s=64x64:d=1", "-c:v", "libx264",
                                       "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(klein)], capture_output=True, text=True)
                if lauf.returncode != 0:
                    raise Fehler(f"ffmpeg konnte das Testvideo nicht erzeugen: {lauf.stderr[:200]}")
                sb.hochladen(objekt, klein)
                bericht.ok(f"Upload ok ({objekt}).")
                try:
                    signiert = sb.signieren(objekt, 120)
                    bericht.ok("Signierter Link erzeugt (120 s gültig).")
                    status, typ = sb.link_test(signiert)
                    (bericht.ok if status in (200, 206) else bericht.fehl)(f"Abruf des signierten Links: HTTP {status}, Content-Type {typ}.")
                finally:
                    sb.loeschen([objekt])
                    bericht.ok("Testdatei gelöscht.")
        except Fehler as e:
            bericht.fehl(str(e))
    return bericht


def befehl_posten(args, sb_url):
    bericht = Bericht()
    trocken = args.trocken

    def halt():  # im echten Lauf: vor jedem Schreiben stoppen
        if bericht.fehler and not trocken:
            raise Fehler("Abbruch vor dem Hochladen, es wurde nichts geschrieben.")

    info(f"== Prüfungen ({'Trockenlauf: es wird nichts nach Supabase oder Buffer geschrieben' if trocken else 'echter Lauf'}) ==")
    max_bytes, ziel_bytes = int(args.max_mb * MB), int(args.ziel_mb * MB)
    if not args.kanal or not args.zeit or not (args.text or args.text_datei) or not args.video:
        raise Fehler("Für einen Entwurf sind --video, --kanal, --text (oder --text-datei) und --zeit nötig.")
    video = Path(args.video).expanduser().resolve()
    text = Path(args.text_datei).read_text(encoding="utf-8").strip() if args.text_datei else args.text.strip()
    zeit = parse_zeit(args.zeit)
    if zeit <= datetime.datetime.now(datetime.timezone.utc):
        bericht.fehl(f"--zeit {args.zeit} liegt in der Vergangenheit.")
    else:
        bericht.ok(f"Zeitpunkt: {zeit.strftime('%Y-%m-%dT%H:%M:%SZ')} (UTC).")
    caption_hinweise(text, bericht)

    s = pruefe_video(video, bericht)
    pruef_hash = sha256(video)
    if not args.nochmal and any(z.get("video_sha256") == pruef_hash and z.get("kanal") == args.kanal for z in log_lesen(Path(args.log)) if z.get("ereignis") == "angelegt"):
        bericht.fehl(f"Für dieses Video und den Kanal „{args.kanal}“ gibt es schon einen Entwurf im Log ({args.log}). Mit --nochmal trotzdem anlegen.")

    kanal = None
    try:
        kanal = finde_kanal(args.kanal, bericht)
    except Fehler as e:
        bericht.fehl(str(e))

    sb = None
    try:
        sb = Supabase(sb_url, args.bucket, args.supabase_auth)
        supabase_pruefung(sb, bericht, brauche_bytes=min(s["groesse"], max_bytes))
    except Fehler as e:
        bericht.fehl(str(e))
    objekt = f"{datetime.date.today().isoformat()}/{uuid.uuid4()}.mp4"
    platzhalter = f"<SUPABASE_URL>/storage/v1/object/sign/{args.bucket}/{objekt}?token=<SIGNIERT, {SIGNIER_SEKUNDEN // 3600} h>"
    variablen = baue_variablen(kanal["id"] if kanal else "<KANAL-ID>", text, zeit, args.planung, platzhalter)
    if kanal:
        schema_pruefung(variablen, bericht)  # nur lesende Introspection; vor dem Upload, damit nichts umsonst hochgeladen wird
    halt()

    # Upload-Datei (bei > 48 MB eine Kopie; das Original bleibt unberührt)
    upload = video
    kopie = False
    if s["groesse"] > max_bytes:
        if bericht.fehler:  # Trockenlauf mit Fehlern: die Kopie lohnt sich erst, wenn der Rest passt
            info("           (Upload-Kopie wird erst erzeugt, wenn die übrigen Prüfungen bestehen.)")
        else:
            upload = komprimiere(video, s, KOPIEN_ORDNER / f"{video.stem}_upload.mp4", max_bytes, ziel_bytes, args.preset, bericht)
            kopie = True
    else:
        bericht.ok(f"Datei ist {s['groesse'] / MB:.1f} MB (≤ {max_bytes / MB:.0f} MB): wird unverändert hochgeladen.")

    if trocken:
        info("")
        info(f"== Trockenlauf: Es würde hochgeladen: {upload.name} ({upload.stat().st_size / MB:.1f} MB) → {args.bucket}/{objekt}")
        info("== GraphQL-Mutation (POST https://api.buffer.com, NICHT gesendet) ==")
        info(MUTATION)
        info("== Variablen ==")
        info(json.dumps(variablen, indent=2, ensure_ascii=False))
        info("")
        info(f"Ergebnis: {len(bericht.fehler)} Fehler, {len(bericht.warnungen)} Warnungen. Nichts wurde geschrieben.")
        return bericht
    halt()

    # ── ab hier wird geschrieben ──
    info("== Upload nach Supabase ==")
    sb.hochladen(objekt, upload)
    bericht.ok(f"Hochgeladen: {args.bucket}/{objekt} ({upload.stat().st_size / MB:.1f} MB).")
    try:
        link = sb.signieren(objekt)
        status, typ = sb.link_test(link)
        if status not in (200, 206):
            raise Fehler(f"Signierter Link liefert HTTP {status} statt 200/206.")
        bericht.ok(f"Signierter Link ({SIGNIER_SEKUNDEN // 3600} h) erzeugt und abrufbar (Content-Type {typ}).")
    except Fehler:
        raeume_weg(sb, objekt)  # nichts liegen lassen, wenn es nicht weitergeht
        raise
    variablen = baue_variablen(kanal["id"], text, zeit, args.planung, link)
    info("== Buffer: Entwurf anlegen ==")
    try:
        status, antwort = buffer_roh(MUTATION, variablen)
    except Fehler as e:  # Antwort unklar: der Entwurf kann trotzdem entstanden sein, deshalb die Datei NICHT löschen
        raise Fehler(f"{e} Der Entwurf kann trotzdem entstanden sein: in Buffer unter Entwürfe nachsehen. Die Supabase-Datei {objekt} bleibt liegen.")
    nutzlast = (antwort.get("data") or {}).get("createPost")
    if not nutzlast or nutzlast.get("__typename") != "PostActionSuccess":
        raeume_weg(sb, objekt)
        meldung = nutzlast.get("message") if nutzlast else "; ".join(f.get("message", "?") for f in antwort.get("errors", [])) or f"HTTP {status}"
        raise Fehler(f"Buffer hat keinen Entwurf angelegt ({nutzlast.get('__typename') if nutzlast else 'GraphQL-Fehler'}): {meldung}. Supabase-Datei wieder gelöscht.")

    post = nutzlast["post"]
    bericht.angelegt = True
    ki = (post.get("metadata") or {}).get("isAiGenerated")
    eintrag = {"ereignis": "angelegt", "zeit": jetzt(), "post_id": post["id"], "kanal": args.kanal, "kanal_id": kanal["id"], "bucket": args.bucket,
               "pfad": objekt, "video": video.name, "video_sha256": pruef_hash, "upload_kopie": kopie, "due_at": post.get("dueAt"),
               "status": post["status"], "ki_flag": ki}
    log_schreiben(Path(args.log), eintrag)
    bericht.ok(f"Entwurf angelegt: Post-ID {post['id']}, Status {post['status']}, fällig {post.get('dueAt')}, Planung {post.get('schedulingType')}.")
    (bericht.ok if ki else bericht.fehl)(f"KI-Kennzeichnung (isAiGenerated) in Buffer: {ki}.")
    if post["status"] != "draft":
        bericht.fehl(f"STATUS IST NICHT „draft“ SONDERN „{post['status']}“. Der Post könnte automatisch veröffentlicht werden: SOFORT in Buffer prüfen (Post-ID {post['id']}).")
    for a in post.get("assets") or []:
        host = urllib.parse.urlsplit(a.get("source") or "").netloc
        v = a.get("video") or {}
        info(f"           Asset {a.get('type')}: {a.get('mimeType')}, {v.get('width')}x{v.get('height')}, {(v.get('durationMs') or 0) / 1000:.1f} s, "
             f"Verarbeitung läuft: {v.get('isVideoProcessing')}, Transcodierung nötig: {v.get('isTranscodingRequired')}, "
             f"Quelle: {'noch der Supabase-Link (läuft in 24 h ab!)' if host == sb.host else 'Buffer-eigener Speicher (' + host + ')'}")
        if host == sb.host:
            bericht.warnung("Buffer verweist noch auf den signierten Supabase-Link. Gibst du den Entwurf nach mehr als 24 h frei, könnte der Link abgelaufen sein.")
    info("")
    if not bericht.fehler:
        info("Nächster Schritt: In Buffer prüfen und freigeben (Kalender/Entwürfe). Dort auch Sichtbarkeit (öffentlich) und Markeninhalt (AUS) kontrollieren: per API nicht setzbar.")
    return bericht


def befehl_aufraeumen(args, sb_url):
    bericht = Bericht()
    log = Path(args.log)
    offen = offene_eintraege(log_lesen(log))
    if not offen:
        info("Nichts aufzuräumen: keine offenen Einträge im Log.")
        return bericht
    sb = Supabase(sb_url, args.bucket, args.supabase_auth)
    weg = []
    for e in offen:
        status = None
        try:
            status, antwort = buffer_roh(POST_ABFRAGE, {"id": e["post_id"]})
            if (antwort.get("data") or {}).get("post"):
                status = antwort["data"]["post"]["status"]
            elif any((f.get("extensions") or {}).get("code") == "NOT_FOUND" for f in antwort.get("errors", [])):
                status = "nicht_gefunden"
            else:
                raise Fehler("; ".join(f.get("message", "?") for f in antwort.get("errors", [])) or f"HTTP {status}")
        except Fehler as f:
            bericht.fehl(f"Post {e['post_id']}: Status nicht abrufbar: {f}")
            continue
        loeschen = status == "sent" or (status == "nicht_gefunden" and args.verwaiste)
        info(f"{e['post_id']}  {e['kanal']:<16} {status:<15} {e['pfad']}  → {'löschen' if loeschen else 'bleibt'}")
        if loeschen:
            weg.append((e, status))
    if args.trocken:
        info(f"Trockenlauf: {len(weg)} Datei(en) würden gelöscht, nichts geändert.")
        return bericht
    if weg:
        try:
            sb.loeschen([e["pfad"] for e, _ in weg])
        except Fehler as f:
            bericht.fehl(str(f))
            return bericht
        for e, status in weg:
            log_schreiben(log, {"ereignis": "geloescht", "zeit": jetzt(), "post_id": e["post_id"], "pfad": e["pfad"], "grund": status})
        bericht.ok(f"{len(weg)} Supabase-Datei(en) gelöscht.")
    else:
        info("Nichts zu löschen (kein Post mit Status „sent“).")
    return bericht


# ───────────────────────── main ─────────────────────────

def main():
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    p = argparse.ArgumentParser(description="Video als Entwurf nach Buffer (TikTok). Nur Entwürfe, die Freigabe gibt der Inhaber in Buffer.")
    p.add_argument("--video", help="fertiges MP4 (1080x1920, mind. 61 s)")
    p.add_argument("--kanal", choices=KANAELE)
    p.add_argument("--text", help="Caption (eine Zeile, Format laut CLAUDE.md)")
    p.add_argument("--text-datei", help="Caption aus Textdatei (UTF-8), nützlich unter Windows wegen Emojis")
    p.add_argument("--zeit", help="geplanter Zeitpunkt mit Zone, z. B. 2026-11-01T22:30:00+01:00")
    p.add_argument("--trocken", action="store_true", help="alles prüfen, nichts schreiben, Mutation nur ausgeben")
    p.add_argument("--nochmal", action="store_true", help="auch anlegen, wenn für dieses Video und den Kanal schon ein Entwurf im Log steht")
    p.add_argument("--planung", choices=GUELTIG, default="automatic", help="automatic (Standard): Buffer veröffentlicht nach Freigabe selbst; notification: nur Erinnerung")
    p.add_argument("--aufraeumen", action="store_true", help="Supabase-Dateien löschen, deren Buffer-Post „sent“ ist")
    p.add_argument("--verwaiste", action="store_true", help="mit --aufraeumen auch Dateien löschen, deren Post in Buffer nicht mehr existiert")
    p.add_argument("--pruefen", action="store_true", help="Zugangstest (Buffer und Supabase, nur lesend)")
    p.add_argument("--schreibtest", action="store_true", help="mit --pruefen: Mini-Video nach Supabase hochladen, signieren, abrufen, löschen")
    p.add_argument("--supabase-url", default=os.environ.get("SUPABASE_URL"), help="Projekt-Host https://<ref>.supabase.co (sonst Umgebungsvariable SUPABASE_URL; kein Fallback)")
    p.add_argument("--bucket", default=os.environ.get("SUPABASE_BUCKET", BUCKET))
    p.add_argument("--supabase-auth", choices=("keine", "bearer"), default=os.environ.get("SUPABASE_AUTH", "keine"), help="Authorization-Header für Storage, siehe Kopf der Datei")
    p.add_argument("--max-mb", type=float, default=MAX_MB, help=f"ab dieser Dateigröße Upload-Kopie (Standard {MAX_MB})")
    p.add_argument("--ziel-mb", type=float, default=ZIEL_MB, help=f"Zielgröße der Upload-Kopie (Standard {ZIEL_MB})")
    p.add_argument("--preset", default="medium", help="x264-Preset der Upload-Kopie (Standard medium; slow = bessere Qualität, deutlich langsamer)")
    p.add_argument("--log", default=str(LOG_STANDARD), help="Log-Datei (JSON-Zeilen)")
    args = p.parse_args()
    try:
        if args.pruefen:
            bericht = befehl_pruefen(args, args.supabase_url)
        elif args.aufraeumen:
            bericht = befehl_aufraeumen(args, args.supabase_url)
        else:
            bericht = befehl_posten(args, args.supabase_url)
    except Fehler as e:
        info(f"[FEHLER]   {e}")
        return 1
    except KeyboardInterrupt:
        info("Abgebrochen.")
        return 130
    if bericht.fehler:
        if not args.trocken or args.pruefen:
            info(f"{len(bericht.fehler)} Fehler.")
        return 2 if bericht.angelegt else 1  # 2 = Entwurf existiert, aber Zustand falsch (Status/KI-Flag): in Buffer prüfen
    return 0


if __name__ == "__main__":
    sys.exit(main())
