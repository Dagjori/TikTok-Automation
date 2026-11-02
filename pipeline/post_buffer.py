#!/usr/bin/env python3
"""Plant ein fertiges, geprüftes TikTok-Video über Buffer ein (Supabase als Zwischenspeicher) und prüft es nach dem Posten.

Regel:   Regeln des Inhabers vom 01.11.: kein KI-Label als Standard, keine Freigabe in Buffer (Claude prüft selbst und plant direkt),
         feste Posting-Zeiten (data/plan/posting_zeiten.json). Technik und Feldnamen: pipeline/README.md, Abschnitt „Buffer-API und Supabase im Detail“.
         Standard = geplanter Post (Status „scheduled“, Buffer veröffentlicht zur Zeit selbst). Mit --entwurf wie bisher nur ein Entwurf.

Aufruf:  python3 pipeline/post_buffer.py --video <mp4> --kanal simulierbar|stelldirvor.pov --text "<Caption>" --zeit auto:2026-11-03:mittag [--trocken]
           --zeit  auto:YYYY-MM-DD:slot (Uhrzeit aus posting_zeiten.json, Sommer-/Winterzeit automatisch) | ISO mit Zone | sofort (= jetzt + 15 Min.)
           --ki-label   setzt die KI-Kennzeichnung (isAiGenerated) auf AN; Standard AUS, nur für realistischen KI-Inhalt
           --entwurf    nur Entwurf (saveToDraft), kein Einplanen
         python3 pipeline/post_buffer.py --pruefen [--schreibtest]      Zugangstest (Buffer lesen, Supabase lesen, optional Supabase-Roundtrip)
         python3 pipeline/post_buffer.py --nachpruefen [--trocken]      gepostete Videos auf der öffentlichen TikTok-Seite prüfen, dann Supabase-Datei löschen
         python3 pipeline/post_buffer.py --aufraeumen [--trocken]       nur Supabase-Dateien löschen, deren Buffer-Post „sent“ ist

Ablauf:  1. Prüfen: Caption (3–5 Hashtags, kein #fyp), Zeit (mind. 10 Min. Vorlauf), Video (1080x1920, mind. 61 s), Kanal, Slot frei, Supabase, Schema
         2. > 48 MB: Upload-Kopie per 2-pass H.264 (Original bleibt unberührt)  3. Upload nach Supabase (privater Bucket, Pfad <datum>/<uuid>.mp4)
         4. signierter Link, gültig bis dueAt + 12 h (mind. 24 h)  5. createPost (geplant, bzw. Entwurf)  6. Eintrag in pipeline/out/buffer_log.jsonl (nicht im Repo)
         Erwarteter Status nach dem Anlegen: „scheduled“ (mit --entwurf „draft“), sonst Exit-Code 2.
         --trocken führt alle Prüfungen und lesenden Abfragen aus, schreibt aber nichts nach Supabase und Buffer, sondern gibt die Mutation nur aus.

Zugänge: Cloud: Der Proxy setzt die Header selbst ein (Buffer: Authorization; Supabase: apikey). Das Skript setzt dort KEINE Anmelde-Header.
         Lokal (Windows): Umgebungsvariablen BUFFER_API_KEY (→ Authorization: Bearer) und SUPABASE_KEY (→ Header apikey).
         Supabase-Host: Umgebungsvariable SUPABASE_URL oder --supabase-url. Steht bewusst NICHT im Repo (öffentlich), es gibt keinen Fallback.
         Falls Storage zusätzlich einen Authorization-Header verlangt (in der Cloud war das nicht nötig), konfigurierbar:
           SUPABASE_AUTH=keine (Standard) | bearer (Authorization: Bearer $SUPABASE_KEY, nur für alte JWT-Keys) | SUPABASE_AUTHORIZATION = kompletter Header-Wert
Python:  nur Standardbibliothek + ffmpeg/ffprobe. Windows: für Europe/Berlin einmal `pip install tzdata`. Optional: ist `graphql-core` installiert,
         prüft --trocken zusätzlich das ganze Mutations-Dokument gegen das Live-Schema.
"""
import argparse
import datetime
import gzip
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
MIN_LINK_SEKUNDEN = 86400                      # signierter Link: mindestens 24 h gültig ...
LINK_NACHLAUF_STUNDEN = 12                     # ... und bis dueAt + 12 h
ZEITEN_DATEI = HIER.parent / "data" / "plan" / "posting_zeiten.json"
TAGE = ("mo", "di", "mi", "do", "fr", "sa", "so")
MIN_VORLAUF_MIN = 10                           # Posting-Zeit mindestens so weit in der Zukunft
SOFORT_MIN = 15                                # --zeit sofort = jetzt + 15 Min.
SLOT_FENSTER_MIN = 20                          # anderer Post auf demselben Kanal innerhalb von ± 20 Min. gilt als belegt
MIN_TAGS, MAX_TAGS, MAX_CAPTION = 3, 5, 2200
VERBOTENE_TAGS = ("#fyp", "#viral", "#foryou", "#foryoupage")
BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
MIN_SEKUNDEN = 61                              # CLAUDE.md: Videos mindestens 61 s
MAX_SEKUNDEN = 600                             # Buffer/TikTok: Video 3 s bis 10 min (pipeline/README.md)
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

MUTATION = """mutation PostAnlegen($input: CreatePostInput!) {
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

POST_ABFRAGE = """query PostStatus($id: PostId!) { post(input: {id: $id}) { id status dueAt sentAt externalLink error { message } } }"""

LIMIT_ABFRAGE = """query Limit($c: ChannelId!, $d: DateTime!) { dailyPostingLimits(input: {channelIds: [$c], date: $d}) { channelId isAtLimit limit scheduled sent } }"""

SLOT_ABFRAGE = """query Slot($o: OrganizationId!, $c: ChannelId!, $s: DateTime!, $e: DateTime!) {
  posts(first: 5, input: {organizationId: $o, filter: {channelIds: [$c], status: [draft, scheduled, sending], dueAt: {start: $s, end: $e}}}) {
    edges { node { id status dueAt } }
  }
}"""


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


def finde_kanal(name, bericht, plant=True):
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
        if plant:
            bericht.fehl(f"Die Warteschlange von „{name}“ ist in Buffer pausiert: geplante Posts würden nicht veröffentlicht.")
        else:
            bericht.warnung(f"Die Warteschlange von „{name}“ ist in Buffer pausiert (Entwürfe sind davon nicht betroffen).")
    bericht.ok(f"Buffer-Kanal „{name}“: TikTok, verbunden, Zeitzone {k['timezone']}.")
    k["org"] = org
    return k


def belegte_posts(kanal, zeit):
    """Lesend: geplante Posts/Entwürfe/laufende Posts desselben Kanals im Zeitfenster um `zeit`."""
    f = datetime.timedelta(minutes=SLOT_FENSTER_MIN)
    fmt = "%Y-%m-%dT%H:%M:%S.000Z"
    daten = buffer_lesen(SLOT_ABFRAGE, {"o": kanal["org"], "c": kanal["id"], "s": (zeit - f).strftime(fmt), "e": (zeit + f).strftime(fmt)})
    return [e["node"] for e in daten["posts"]["edges"] or []]


def tageslimit(kanal, zeit):
    """Lesend: Buffer-Tageslimit (TikTok: 25 Posts je 24 h und Kanal). Liefert das Statusobjekt."""
    daten = buffer_lesen(LIMIT_ABFRAGE, {"c": kanal["id"], "d": zeit.strftime("%Y-%m-%dT%H:%M:%S.000Z")})
    return daten["dailyPostingLimits"][0]


def buffer_post(post_id):
    """Post lesen; None, wenn es ihn in Buffer nicht (mehr) gibt."""
    status, antwort = buffer_roh(POST_ABFRAGE, {"id": post_id})
    post = (antwort.get("data") or {}).get("post")
    if post:
        return post
    if any((f.get("extensions") or {}).get("code") == "NOT_FOUND" for f in antwort.get("errors", [])):
        return None
    raise Fehler("; ".join(f.get("message", "?") for f in antwort.get("errors", [])) or f"HTTP {status}")


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
                       "Authorization nicht (dann SUPABASE_AUTHORIZATION bzw. Proxy-Header Authorization setzen). Siehe pipeline/README.md (Abschnitt „Buffer-API und Supabase im Detail“).")
        elif "authorization" in blob.lower() or "JWT" in blob or status in (401, 403):
            hinweis = " → Authorization oder apikey wird abgelehnt: SUPABASE_AUTH/SUPABASE_AUTHORIZATION bzw. pipeline/README.md (Abschnitt „Buffer-API und Supabase im Detail“) beachten."
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

    def signieren(self, objekt, sekunden=MIN_LINK_SEKUNDEN):
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
    bericht.ok(f"Supabase-Bucket „{sb.bucket}“ erreichbar, Auflisten erlaubt (Anmeldung wird akzeptiert).")
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

def jetzt_utc():
    return datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0)


def zeitzone(name):
    try:
        from zoneinfo import ZoneInfo
        return ZoneInfo(name)
    except Exception as e:
        raise Fehler(f"Zeitzone {name} nicht verfügbar ({e}). Unter Windows einmal: pip install tzdata")


def lade_zeiten():
    try:
        return json.loads(ZEITEN_DATEI.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        raise Fehler(f"{ZEITEN_DATEI} nicht lesbar: {e}")


def tage_aus(schluessel):
    """„mo-fr“, „sa,so“, „mo“ → Menge von Tageskürzeln."""
    tage = set()
    for teil in schluessel.lower().replace(" ", "").split(","):
        grenzen = teil.split("-")
        if not 1 <= len(grenzen) <= 2 or any(g not in TAGE for g in grenzen):
            raise Fehler(f"posting_zeiten.json: Tagesangabe „{schluessel}“ nicht verständlich (erlaubt: {' '.join(TAGE)}, Bereiche wie mo-fr, Listen mit Komma).")
        i, j = TAGE.index(grenzen[0]), TAGE.index(grenzen[-1])
        tage |= {TAGE[(i + k) % 7] for k in range((j - i) % 7 + 1)}
    return tage


def slots_fuer(kanal, tag):
    """{slot: 'HH:MM'} für den Kanal am Datum `tag` (Wochentag → Gruppe in posting_zeiten.json)."""
    zeiten = lade_zeiten()
    konf = (zeiten.get("kanaele") or {}).get(kanal)
    if not konf:
        raise Fehler(f"posting_zeiten.json kennt den Kanal „{kanal}“ nicht.")
    wochentag = TAGE[tag.weekday()]
    slots = {}
    for gruppe, eintraege in konf.items():
        if wochentag in tage_aus(gruppe):
            slots.update(eintraege)
    return slots, zeitzone(zeiten.get("zeitzone", "Europe/Berlin")), wochentag


def auto_zeit(text, kanal):
    m = re.fullmatch(r"auto:(\d{4}-\d{2}-\d{2}):([\wäöü-]+)", text.strip().lower())
    if not m:
        raise Fehler(f"--zeit „{text}“: erwartet auto:YYYY-MM-DD:slot, z. B. auto:2026-11-03:mittag.")
    try:
        tag = datetime.date.fromisoformat(m.group(1))
    except ValueError:
        raise Fehler(f"--zeit „{text}“: {m.group(1)} ist kein Datum.")
    slot = m.group(2)
    slots, tz, wochentag = slots_fuer(kanal, tag)
    if slot not in slots:
        raise Fehler(f"Slot „{slot}“ gibt es für {kanal} am {tag} ({wochentag.upper()}) nicht (vorhanden: {', '.join(slots) or 'keiner'}).")
    try:
        stunde, minute = (int(x) for x in slots[slot].split(":"))
        lokal = datetime.datetime(tag.year, tag.month, tag.day, stunde, minute, tzinfo=tz)
    except ValueError:
        raise Fehler(f"posting_zeiten.json: Uhrzeit „{slots[slot]}“ für {kanal}/{slot} ist nicht HH:MM.")
    versatz = lokal.strftime("%z")
    return lokal.astimezone(datetime.timezone.utc), f"{wochentag.upper()} {tag} {slot} = {slots[slot]} {tz.key} (UTC{versatz[:3]}:{versatz[3:]})"


def lese_zeit(text, kanal):
    """--zeit → (UTC-Zeitpunkt, Beschreibung). Formen: auto:YYYY-MM-DD:slot | sofort | ISO 8601 mit Zone."""
    t = text.strip()
    if t.lower() == "sofort":
        return jetzt_utc() + datetime.timedelta(minutes=SOFORT_MIN), f"sofort = jetzt + {SOFORT_MIN} Min."
    if t.lower().startswith("auto:"):
        return auto_zeit(t, kanal)
    try:
        z = datetime.datetime.fromisoformat(t.replace("Z", "+00:00"))
    except ValueError:
        raise Fehler(f"--zeit „{text}“ ist weder auto:YYYY-MM-DD:slot noch sofort noch ISO 8601 (Beispiel: 2026-11-01T22:30:00+01:00).")
    if z.tzinfo is None:
        raise Fehler("--zeit braucht eine Zeitzone, z. B. +01:00 (Winterzeit) bzw. +02:00 (Sommerzeit).")
    return z.astimezone(datetime.timezone.utc), "feste Zeit"


def pruefe_vorlauf(zeit, bericht):
    """Mindestens MIN_VORLAUF_MIN Minuten in der Zukunft. Liefert True, wenn ok."""
    rest = (zeit - jetzt_utc()).total_seconds() / 60
    if rest < MIN_VORLAUF_MIN:
        bericht.fehl(f"Die Posting-Zeit {zeit:%Y-%m-%d %H:%M} UTC liegt {'in der Vergangenheit' if rest < 0 else f'nur {rest:.0f} Min. in der Zukunft'}; nötig sind mindestens {MIN_VORLAUF_MIN} Min. Vorlauf.")
        return False
    return True


def link_sekunden(zeit):
    """Signierter Link: bis dueAt + 12 h, mindestens 24 h."""
    bis_zeit = int((zeit - jetzt_utc()).total_seconds()) + LINK_NACHLAUF_STUNDEN * 3600
    return max(MIN_LINK_SEKUNDEN, bis_zeit)


def caption_pruefung(text, bericht):
    """Caption ist Pflicht: 3 bis 5 Hashtags, kein #fyp/#viral/#foryou, höchstens 2200 Zeichen. Verstöße brechen ab (Fehler)."""
    t = text.strip()
    if not t:
        bericht.fehl("Die Caption ist Pflicht und darf nicht leer sein (--text bzw. --text-datei).")
        return
    tags = re.findall(r"#\w+", t)
    schlecht = False
    if len(t) > MAX_CAPTION:
        bericht.fehl(f"Caption hat {len(t)} Zeichen, erlaubt sind höchstens {MAX_CAPTION}.")
        schlecht = True
    if not MIN_TAGS <= len(tags) <= MAX_TAGS:
        bericht.fehl(f"Caption hat {len(tags)} Hashtags, erlaubt sind {MIN_TAGS} bis {MAX_TAGS}.")
        schlecht = True
    verboten = [x for x in tags if x.lower() in VERBOTENE_TAGS]
    if verboten:
        bericht.fehl(f"Caption enthält verbotene Hashtags: {', '.join(verboten)}.")
        schlecht = True
    if "\n" in t:
        bericht.warnung("Caption hat mehrere Zeilen; Format laut CLAUDE.md: eine Zeile.")
    if not schlecht:
        bericht.ok(f"Caption: {len(t)} Zeichen, {len(tags)} Hashtags.")


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


def baue_variablen(kanal_id, text, zeit_utc, planung, link, ki_label=False, entwurf=False):
    eingabe = {
        "channelId": kanal_id,
        "text": text,
        "mode": "customScheduled",          # Zeitpunkt aus dueAt
        "dueAt": zeit_utc.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "schedulingType": planung,          # automatic = Buffer veröffentlicht zur Zeit selbst; notification = nur Erinnerung
        "assets": [{"video": {"url": link}}],
        "metadata": {"tiktok": {"isAiGenerated": bool(ki_label)}},  # KI-Kennzeichnung: Standard AUS, --ki-label = AN
    }
    if entwurf:
        eingabe["saveToDraft"] = True       # nur mit --entwurf: Status „draft“, wird nicht veröffentlicht, bis der Inhaber in Buffer freigibt
    return {"input": eingabe}


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
    info("== Posting-Zeiten ==")
    try:
        zeiten = lade_zeiten()
        zeitzone(zeiten.get("zeitzone", "Europe/Berlin"))
        for name in KANAELE:
            konf = (zeiten.get("kanaele") or {}).get(name)
            if not konf:
                bericht.fehl(f"posting_zeiten.json: Kanal „{name}“ fehlt.")
                continue
            for gruppe in konf:
                tage_aus(gruppe)
            bericht.ok(f"{name}: " + "; ".join(f"{g} " + ", ".join(f"{slot} {uhr}" for slot, uhr in sl.items()) for g, sl in konf.items()) + f" ({zeiten.get('zeitzone')})")
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
    trocken, entwurf, ki = args.trocken, args.entwurf, args.ki_label
    erwartet = "draft" if entwurf else "scheduled"

    def halt():  # im echten Lauf: vor jedem Schreiben stoppen
        if bericht.fehler and not trocken:
            raise Fehler("Abbruch vor dem Hochladen, es wurde nichts geschrieben.")

    modus = "Entwurf (saveToDraft)" if entwurf else "geplanter Post (Buffer veröffentlicht zur Zeit selbst)"
    info(f"== Prüfungen ({'Trockenlauf: es wird nichts nach Supabase oder Buffer geschrieben' if trocken else 'echter Lauf'}; {modus}) ==")
    max_bytes, ziel_bytes = int(args.max_mb * MB), int(args.ziel_mb * MB)
    if not args.kanal or not args.zeit or not args.video:
        raise Fehler("Für einen Post sind --video, --kanal, --text (oder --text-datei) und --zeit nötig.")
    video = Path(args.video).expanduser().resolve()
    if args.text_datei:
        text = Path(args.text_datei).read_text(encoding="utf-8").strip()
    else:
        text = (args.text or "").strip()
    caption_pruefung(text, bericht)
    zeit, zeit_text = lese_zeit(args.zeit, args.kanal)
    if pruefe_vorlauf(zeit, bericht):
        bericht.ok(f"Zeitpunkt: {zeit:%Y-%m-%d %H:%M} UTC ({zeit_text}).")
    bericht.ok(f"KI-Kennzeichnung: {'AN (--ki-label)' if ki else 'AUS (Standard)'}.")

    s = pruefe_video(video, bericht)
    pruef_hash = sha256(video)
    log = Path(args.log)
    if not args.nochmal and any(z.get("video_sha256") == pruef_hash and z.get("kanal") == args.kanal for z in log_lesen(log) if z.get("ereignis") == "angelegt"):
        bericht.fehl(f"Für dieses Video und den Kanal „{args.kanal}“ gibt es schon einen Eintrag im Log ({args.log}). Mit --nochmal trotzdem anlegen.")

    kanal = None
    try:
        kanal = finde_kanal(args.kanal, bericht, plant=not entwurf)
    except Fehler as e:
        bericht.fehl(str(e))
    if kanal and not args.nochmal:
        try:
            belegt = belegte_posts(kanal, zeit)
            if belegt:
                bericht.fehl("Auf dem Kanal ist rund um diese Zeit schon etwas eingeplant: " + ", ".join(f"{b['id']} ({b['status']}, {b['dueAt']})" for b in belegt)
                             + ". Mit --nochmal trotzdem anlegen.")
            else:
                bericht.ok(f"Slot frei: kein anderer Post auf „{args.kanal}“ innerhalb von ± {SLOT_FENSTER_MIN} Min.")
        except Fehler as e:
            bericht.fehl(f"Slot-Prüfung nicht möglich: {e}")

    if kanal and not entwurf:  # bei Entwürfen prüft Buffer die Limits nicht
        try:
            lim = tageslimit(kanal, zeit)
            if lim["isAtLimit"]:
                bericht.fehl(f"Buffer-Tageslimit erreicht: {lim['scheduled']} geplant + {lim['sent']} gesendet bei höchstens {lim['limit']} Posts je 24 h.")
            else:
                bericht.ok(f"Buffer-Tageslimit frei: {lim['scheduled']} geplant, {lim['sent']} gesendet, Limit {lim['limit']} je 24 h.")
        except Fehler as e:
            bericht.fehl(f"Tageslimit-Prüfung nicht möglich: {e}")

    sb = None
    try:
        sb = Supabase(sb_url, args.bucket, args.supabase_auth)
        supabase_pruefung(sb, bericht, brauche_bytes=min(s["groesse"], max_bytes))
    except Fehler as e:
        bericht.fehl(str(e))
    objekt = f"{datetime.date.today().isoformat()}/{uuid.uuid4()}.mp4"
    platzhalter = f"<SUPABASE_URL>/storage/v1/object/sign/{args.bucket}/{objekt}?token=<SIGNIERT, {link_sekunden(zeit) / 3600:.0f} h>"
    variablen = baue_variablen(kanal["id"] if kanal else "<KANAL-ID>", text, zeit, args.planung, platzhalter, ki, entwurf)
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
        if args.zeit.strip().lower() == "sofort":  # „jetzt + 15 Min.“ ab jetzt rechnen, Kopieren und Hochladen haben gedauert
            zeit = lese_zeit(args.zeit, args.kanal)[0]
        if not pruefe_vorlauf(zeit, bericht):
            raise Fehler("Die Posting-Zeit ist inzwischen zu nah (Kopieren/Hochladen hat gedauert). Neue --zeit wählen.")
        sekunden = link_sekunden(zeit)
        link = sb.signieren(objekt, sekunden)
        status, typ = sb.link_test(link)
        if status not in (200, 206):
            raise Fehler(f"Signierter Link liefert HTTP {status} statt 200/206.")
        bis = jetzt_utc() + datetime.timedelta(seconds=sekunden)
        bericht.ok(f"Signierter Link erzeugt und abrufbar (gültig bis {bis:%Y-%m-%d %H:%M} UTC = dueAt + {LINK_NACHLAUF_STUNDEN} h, mind. 24 h; Content-Type {typ}).")
    except Fehler:
        raeume_weg(sb, objekt)  # nichts liegen lassen, wenn es nicht weitergeht
        raise
    variablen = baue_variablen(kanal["id"], text, zeit, args.planung, link, ki, entwurf)
    info(f"== Buffer: {'Entwurf anlegen' if entwurf else 'Post einplanen'} ==")
    try:
        status, antwort = buffer_roh(MUTATION, variablen)
    except Fehler as e:  # Antwort unklar: der Post kann trotzdem entstanden sein, deshalb die Datei NICHT löschen
        raise Fehler(f"{e} Der Post kann trotzdem entstanden sein: in Buffer nachsehen (Kalender/Entwürfe). Die Supabase-Datei {objekt} bleibt liegen.")
    nutzlast = (antwort.get("data") or {}).get("createPost")
    if not nutzlast or nutzlast.get("__typename") != "PostActionSuccess":
        raeume_weg(sb, objekt)
        meldung = nutzlast.get("message") if nutzlast else "; ".join(f.get("message", "?") for f in antwort.get("errors", [])) or f"HTTP {status}"
        raise Fehler(f"Buffer hat den Post nicht angelegt ({nutzlast.get('__typename') if nutzlast else 'GraphQL-Fehler'}): {meldung}. Supabase-Datei wieder gelöscht.")

    post = nutzlast["post"]
    bericht.angelegt = True
    ki_ist = (post.get("metadata") or {}).get("isAiGenerated")
    log_schreiben(log, {"ereignis": "angelegt", "zeit": jetzt(), "post_id": post["id"], "kanal": args.kanal, "kanal_id": kanal["id"], "bucket": args.bucket,
                        "pfad": objekt, "video": video.name, "video_sha256": pruef_hash, "video_dauer_s": round(s["dauer"], 1), "upload_kopie": kopie,
                        "modus": "entwurf" if entwurf else "geplant", "due_at": post.get("dueAt"), "status": post["status"], "ki_flag": ki_ist})
    bericht.ok(f"Angelegt: Post-ID {post['id']}, Status {post['status']}, fällig {post.get('dueAt')}, Planung {post.get('schedulingType')}.")
    if post["status"] == erwartet:
        bericht.ok(f"Status „{erwartet}“ wie erwartet.")
    else:
        bericht.fehl(f"STATUS IST „{post['status']}“, ERWARTET „{erwartet}“. In Buffer sofort prüfen (Post-ID {post['id']}); "
                     + ("der Post könnte automatisch veröffentlicht werden." if entwurf else "der Post wird so nicht veröffentlicht."))
    if ki_ist == ki:
        bericht.ok(f"KI-Kennzeichnung (isAiGenerated) in Buffer: {ki_ist}, wie gesetzt.")
    else:
        bericht.fehl(f"KI-Kennzeichnung (isAiGenerated) in Buffer ist {ki_ist}, gesetzt war {ki}.")
    try:
        gleich = datetime.datetime.fromisoformat((post.get("dueAt") or "").replace("Z", "+00:00")) == zeit
    except ValueError:
        gleich = False
    if not gleich:
        bericht.fehl(f"dueAt in Buffer ({post.get('dueAt')}) weicht von der gewünschten Zeit ({zeit:%Y-%m-%dT%H:%M:%SZ}) ab.")
    for a in post.get("assets") or []:
        host = urllib.parse.urlsplit(a.get("source") or "").netloc
        v = a.get("video") or {}
        auf_supabase = host == sb.host
        info(f"           Asset {a.get('type')}: {a.get('mimeType')}, {v.get('width')}x{v.get('height')}, {(v.get('durationMs') or 0) / 1000:.1f} s, "
             f"Verarbeitung läuft: {v.get('isVideoProcessing')}, Transcodierung nötig: {v.get('isTranscodingRequired')}")
        if auf_supabase:
            info(f"           assets[].source zeigt noch auf Supabase (Link gültig bis {bis:%Y-%m-%d %H:%M} UTC): die Datei dort NICHT vor dem Posten löschen.")
            if entwurf:
                bericht.warnung("Entwurf mit Supabase-Link: wird er nach Ablauf des Links freigegeben, kann das Video fehlen.")
        else:
            info(f"           assets[].source zeigt auf eine Buffer-Kopie ({host}), die Supabase-Datei wird nur noch als Reserve gebraucht.")
    info("")
    if not bericht.fehler:
        if entwurf:
            info("Nächster Schritt: In Buffer prüfen und freigeben (Entwürfe). Sichtbarkeit und Markeninhalt sind per API nicht setzbar, dort kontrollieren.")
        else:
            info(f"Eingeplant für {zeit:%Y-%m-%d %H:%M} UTC. Nach dem Posten: python3 pipeline/post_buffer.py --nachpruefen (öffentlich? Dauer, KI-Label; löscht dann die Supabase-Datei).")
    return bericht


def loesche_dateien(sb, log, liste, bericht):
    """liste = [(Log-Eintrag, Grund)]; löscht in Supabase und vermerkt es im Log."""
    if not liste:
        return
    try:
        sb.loeschen([e["pfad"] for e, _ in liste])
    except Fehler as f:
        bericht.fehl(str(f))
        return
    for e, grund in liste:
        log_schreiben(log, {"ereignis": "geloescht", "zeit": jetzt(), "post_id": e["post_id"], "pfad": e["pfad"], "grund": grund})
    bericht.ok(f"{len(liste)} Supabase-Datei(en) gelöscht.")


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
        try:
            post = buffer_post(e["post_id"])
        except Fehler as f:
            bericht.fehl(f"Post {e['post_id']}: Status nicht abrufbar: {f}")
            continue
        status = post["status"] if post else "nicht_gefunden"
        loeschen = status == "sent" or (status == "nicht_gefunden" and args.verwaiste)
        info(f"{e['post_id']}  {e['kanal']:<16} {status:<15} {e['pfad']}  → {'löschen' if loeschen else 'bleibt'}")
        if loeschen:
            weg.append((e, status))
    if args.trocken:
        info(f"Trockenlauf: {len(weg)} Datei(en) würden gelöscht, nichts geändert.")
    elif weg:
        loesche_dateien(sb, log, weg, bericht)
    else:
        info("Nichts zu löschen (kein Post mit Status „sent“).")
    return bericht


def tiktok_seite(url):
    """Öffentliche TikTok-Videoseite mit normalem Browser-User-Agent abrufen (kein Login, keine internen APIs, kein Umgehen von Schutz).
    Liest das JSON __UNIVERSAL_DATA_FOR_REHYDRATION__ → __DEFAULT_SCOPE__ → webapp.video-detail → itemInfo.itemStruct."""
    status, kopfzeilen, body = http("GET", url.split("?", 1)[0], {"User-Agent": BROWSER_UA, "Accept": "text/html,application/xhtml+xml",
                                                                    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8"}, timeout=30)
    if status != 200:
        raise Fehler(f"TikTok-Seite liefert HTTP {status}.")
    if kopfzeilen and (kopfzeilen.get("Content-Encoding") or "").lower() == "gzip":
        body = gzip.decompress(body)
    treffer = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', body.decode("utf-8", "replace"), re.S)
    if not treffer:
        raise Fehler("Die Seite enthält keine Videodaten (Bot-Schutz oder geändertes Seitenformat). Das wird nicht umgangen; Video von Hand im Browser ansehen.")
    detail = json.loads(treffer.group(1)).get("__DEFAULT_SCOPE__", {}).get("webapp.video-detail", {})
    item = (detail.get("itemInfo") or {}).get("itemStruct")
    if not item:
        raise Fehler(f"Seite ohne itemStruct (statusCode {detail.get('statusCode')}, {detail.get('statusMsg') or 'ohne Meldung'}): Video nicht öffentlich abrufbar?")
    return item


def befehl_nachpruefen(args, sb_url):
    """Gepostete Videos (Buffer-Status sent) auf der öffentlichen TikTok-Seite prüfen, Ergebnis ins Log, dann Supabase-Datei löschen."""
    bericht = Bericht()
    log = Path(args.log)
    zeilen = log_lesen(log)
    geprueft = {z["post_id"] for z in zeilen if z.get("ereignis") == "nachgeprueft"}
    geloescht = {z["pfad"] for z in zeilen if z.get("ereignis") == "geloescht"}
    kandidaten = [z for z in zeilen if z.get("ereignis") == "angelegt" and (z["post_id"] not in geprueft or z["pfad"] not in geloescht)]
    if not kandidaten:
        info("Nichts nachzuprüfen: alle Log-Einträge sind geprüft und aufgeräumt.")
        return bericht
    sb = Supabase(sb_url, args.bucket, args.supabase_auth)
    weg = []
    for e in kandidaten:
        kopf = f"{e['post_id']} ({e['kanal']}, {e.get('video', '?')})"
        try:
            post = buffer_post(e["post_id"])
        except Fehler as f:
            bericht.fehl(f"{kopf}: Status nicht abrufbar: {f}")
            continue
        if not post:
            info(f"{kopf}: in Buffer nicht (mehr) vorhanden; Datei bleibt (--aufraeumen --verwaiste löscht sie).")
            continue
        if post["status"] != "sent":
            fehlertext = f", Fehler: {post['error']['message']}" if post.get("error") else ""
            (bericht.fehl if post["status"] == "error" else info)(f"{kopf}: Status „{post['status']}“, fällig {post.get('dueAt')}{fehlertext}; noch nichts zu prüfen.")
            continue
        info(f"{kopf}: gesendet {post.get('sentAt')}")
        if e["post_id"] not in geprueft:
            if not post.get("externalLink"):
                bericht.warnung(f"{kopf}: Buffer liefert keinen externalLink, Seite nicht prüfbar.")
            else:
                try:
                    item = tiktok_seite(post["externalLink"])
                    ergebnis = bewerte_seite(item, e, bericht, kopf)
                    if not args.trocken:
                        log_schreiben(log, {"ereignis": "nachgeprueft", "zeit": jetzt(), "post_id": e["post_id"], "externer_link": post["externalLink"].split("?", 1)[0], **ergebnis})
                except Fehler as f:
                    bericht.warnung(f"{kopf}: öffentliche Seite nicht prüfbar: {f}")
        if e["pfad"] not in geloescht:
            weg.append((e, "nachgeprueft"))
    if args.trocken:
        info(f"Trockenlauf: {len(weg)} Supabase-Datei(en) würden gelöscht; Log und Supabase unverändert.")
    else:
        loesche_dateien(sb, log, weg, bericht)
    return bericht


def bewerte_seite(item, eintrag, bericht, kopf):
    """Meldet privateItem (muss false sein), Dauer und KI-Label; liefert das Ergebnis fürs Log."""
    privat = item.get("privateItem")
    dauer = (item.get("video") or {}).get("duration")
    label = item.get("aigcLabelType")
    ist_aigc = item.get("IsAigc")
    hat_label = label not in (None, "", 0, "0") or bool(ist_aigc)  # aigcLabelType kommt als Text („1“), fehlt ohne Label
    ergebnis = {"privateItem": privat, "dauer_s": dauer, "aigcLabelType": label, "IsAigc": ist_aigc}
    info(f"           TikTok-Seite: privateItem={privat}, Dauer={dauer} s, aigcLabelType={label}, IsAigc={ist_aigc}")
    if privat is False:
        bericht.ok(f"{kopf}: öffentlich (privateItem=false).")
    else:
        bericht.fehl(f"{kopf}: privateItem={privat}: das Video ist NICHT öffentlich. In TikTok auf „Alle“ stellen.")
    soll = eintrag.get("video_dauer_s")
    if soll and dauer is not None and abs(float(dauer) - float(soll)) > 1.5:
        bericht.warnung(f"{kopf}: Dauer auf TikTok {dauer} s, Original {soll} s.")
    if eintrag.get("ki_flag"):
        if not hat_label:
            bericht.fehl(f"{kopf}: KI-Label war gesetzt (--ki-label), steht aber nicht am TikTok-Video (aigcLabelType={label}).")
        else:
            bericht.ok(f"{kopf}: KI-Label am Video vorhanden.")
    elif hat_label:
        bericht.warnung(f"{kopf}: am Video steht ein KI-Label (aigcLabelType={label}, IsAigc={ist_aigc}), obwohl keins gesetzt wurde.")
    else:
        info("           Kein KI-Label am Video, wie vorgesehen.")
    for schluessel in ("isProhibited", "takeDown", "isReviewing"):
        if item.get(schluessel):
            bericht.warnung(f"{kopf}: TikTok meldet {schluessel}={item[schluessel]}.")
    return ergebnis


# ───────────────────────── main ─────────────────────────

def main():
    for strom in (sys.stdout, sys.stderr):
        try:
            strom.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass
    p = argparse.ArgumentParser(description="Video über Buffer auf TikTok einplanen (Supabase als Zwischenspeicher), nach dem Posten prüfen und aufräumen.")
    p.add_argument("--video", help="fertiges MP4 (1080x1920, mind. 61 s)")
    p.add_argument("--kanal", choices=KANAELE)
    p.add_argument("--text", help="Caption (Pflicht; eine Zeile, 3 bis 5 Hashtags, höchstens 2200 Zeichen, kein #fyp/#viral/#foryou)")
    p.add_argument("--text-datei", help="Caption aus Textdatei (UTF-8), nützlich unter Windows wegen Emojis")
    p.add_argument("--zeit", help="auto:YYYY-MM-DD:slot (Slots in data/plan/posting_zeiten.json, z. B. auto:2026-11-03:mittag) | ISO 8601 mit Zone | sofort (jetzt + 15 Min.)")
    p.add_argument("--ki-label", action="store_true", help="KI-Kennzeichnung (isAiGenerated) AN; Standard AUS, nur für realistischen KI-Inhalt")
    p.add_argument("--entwurf", action="store_true", help="nur Entwurf anlegen (saveToDraft), nicht einplanen; der Inhaber gibt dann in Buffer frei")
    p.add_argument("--trocken", action="store_true", help="alles prüfen, nichts schreiben, Mutation nur ausgeben")
    p.add_argument("--nochmal", action="store_true", help="auch anlegen, wenn für dieses Video und den Kanal schon ein Log-Eintrag steht oder der Slot belegt ist")
    p.add_argument("--planung", choices=GUELTIG, default="automatic", help="automatic (Standard): Buffer veröffentlicht zur Zeit selbst; notification: nur Erinnerung")
    p.add_argument("--nachpruefen", action="store_true", help="gepostete Videos (Buffer: sent) auf der öffentlichen TikTok-Seite prüfen, dann Supabase-Datei löschen")
    p.add_argument("--aufraeumen", action="store_true", help="nur Supabase-Dateien löschen, deren Buffer-Post „sent“ ist")
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
        elif args.nachpruefen:
            bericht = befehl_nachpruefen(args, args.supabase_url)
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
        if not args.trocken or args.pruefen or args.nachpruefen:
            info(f"{len(bericht.fehler)} Fehler.")
        return 2 if bericht.angelegt else 1  # 2 = Post existiert, aber Zustand falsch (Status/KI-Flag/Zeit): in Buffer prüfen
    return 0


if __name__ == "__main__":
    sys.exit(main())
