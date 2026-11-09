"""Erzeugt die Sprecherstimme eines Projekts über ElevenLabs, inklusive Zeitstempeln.

Aufruf:  python3 pipeline/tts.py <projektordner> [--voice NAME_ODER_ID] [--modell v4|v2] [--gespeicherte-einstellungen] [--proben]
                                  [--neuaufnahme "<was an der Stimme falsch klingt>"]
         Einziges Verfahren: das ganze Skript in EINER Anfrage (/with-timestamps). Das alte Verfahren je Segment
         (--segmente, mit festen Pausen und Tempo-Faktor) ist seit 09.11.2026 entfernt.
Regel:   Entscheidung des Inhabers 09.11.2026: Es gibt keine Sprechtempo-Regeln mehr (Wörter bzw. Silben je Sekunde,
         gemessene Satzpausen, geschätzte Stimmdauer, Hook-Zeit). Das Video folgt der fertigen Stimme (audio/timing.json),
         nie umgekehrt. Die Stimme wird nie beschleunigt, gedehnt oder geschnitten.
Credits: Feste Regel des Inhabers 08.11.2026: Jedes Skript geht genau EINMAL durch ElevenLabs. Vor der ersten bezahlten
         Anfrage prüft der Wächter (Klasse Waechter) kostenlos mit qc/stimme_vorab.py die Text-Hygiene des Sprechtexts
         (Ziffern, Zeichen, Abkürzungen, Markierungen, Audio-Tags …) und sperrt jede zweite Aufnahme; Ausnahme nur
         --neuaufnahme bei einem hörbaren Fehler der Stimme, höchstens einmal. Länge, Tempo und Pausen sind nie ein Grund.
         Exit 1 mit Meldung = keine Anfrage gestellt, keine Credits verbraucht. Jede Aufnahme steht in
         <projekt>/audio/aufnahmen.json (mit Seed, Anfrage-Kennung und Zeichen-Kosten, soweit ElevenLabs sie meldet).
         Ein Cache-Treffer (gleicher Text) kostet nichts und ist frei.
Stimme:  Ben (aTTiK3YzK3dXETpuDE2h), Modell eleven_v4. Seit 09.11.2026 (Wahl des Inhabers „feste Stabilität“) schickt die
         Anfrage feste voice_settings: stability 0,5 und similarity_boost 0,75 (Eleven v4 kennt nur diese zwei; style und
         use_speaker_boost gehen nur bei v2 mit), dazu language_code „de“ (nur v4) und einen festen Seed, der aus dem
         Namen des Projektordners berechnet wird (eine Neuaufnahme bekommt einen eigenen festen Seed).
         --gespeicherte-einstellungen = keine voice_settings senden (Verhalten 31.10.–08.11.: gespeicherte Einstellungen
         der Stimme bei ElevenLabs). --eigene-einstellungen ist jetzt der Standard und wird nur noch geduldet.
         Lehnt ElevenLabs language_code, seed oder voice_settings mit HTTP 400/422 ab, geht die Anfrage EINMAL ohne
         dieses Feld erneut raus (eine abgelehnte Anfrage kostet keine Credits), mit Hinweis.
Aussprache: Gibt es pipeline/aussprache.json ({"Wort": "gesprochene Form"}, ganzes Wort, Groß-/Kleinschreibung genau;
         Schlüssel mit „_“ am Anfang sind Anmerkungen), ersetzt aufbereiten() diese Wörter in jedem Sprechtext, bevor er
         an ElevenLabs geht. qc/stimme_vorab.py prüft den Text NACH dieser Ersetzung. Der Anzeigetext bleibt unberührt.
Regie:   Der „sprechtext“ ist der Text für die Stimme (.claude/skills/stimme-elevenlabs/SKILL.md): Zahlen ausgeschrieben,
         Pausen nur über Satzzeichen und Absätze; bei Eleven v4 höchstens EIN ruhiger Audio-Tag ganz am Anfang
         ([calm], [thoughtful] oder [curious]). Tags werden nicht gesprochen und nicht als Untertitel-Wörter gezählt.
Liest:   <projekt>/skript.json  (Segmente mit Text), optional pipeline/aussprache.json
Schreibt:<projekt>/audio/stimme.mp3, <projekt>/audio/timing.json (Start und Ende je Segment und je Wort; Format unverändert)
Key:     Cloud: Netzwerk-Secret (Header xi-api-key für api.elevenlabs.io); lokal: Umgebungsvariable ELEVENLABS_API_KEY. Nie ins Repo.
"""
import base64
import difflib
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
MODELLE = {"v4": "eleven_v4", "v2": "eleven_multilingual_v2"}
MODELL = MODELLE["v4"]  # Standard für alle Videos: Eleven v4 (Wahl des Inhabers per Hörprobe, 01.11.); --modell v2 nur zum Vergleich
GESPEICHERTE_EINSTELLUNGEN = False  # True (--gespeicherte-einstellungen) = keine voice_settings senden → gespeicherte Einstellungen der Stimme
STANDARD_STIMME = "aTTiK3YzK3dXETpuDE2h"  # „Ben“, muttersprachlich Deutsch (Wahl des Inhabers 31.10. per Hörprobe)
# Feste Einstellungen (Inhaber 09.11.2026: „feste Stabilität“). Eleven v4 kennt nur stability und similarity_boost;
# style und use_speaker_boost gibt es nur bei v2 (Empfehlung von ElevenLabs: Startwert 50/75, „style“ immer 0).
EINSTELLUNGEN_V4 = {"stability": 0.5, "similarity_boost": 0.75}
EINSTELLUNGEN_V2 = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True}
SPRACHE = "de"          # language_code, nur Eleven v4
SEED = None             # wird in main() aus dem Namen des Projektordners berechnet (seed_aus_name)
PAUSE_ABSCHNITT = 0.35  # nur Multilingual v2: <break> zwischen zwei Abschnitten (v4 setzt Pausen selbst aus Satzzeichen und Absätzen)
AUSSPRACHE_DATEI = Path(__file__).resolve().parent / "aussprache.json"
KOPFZEILEN = {}         # Kopfzeilen der letzten Antwort von ElevenLabs (request-id, character-cost), von anfrage() gefüllt
RATE = 44100


def anfrage(pfad, daten=None):
    kopf = {"Content-Type": "application/json"}
    # In der Cloud setzt der Proxy den Header xi-api-key selbst ein (Netzwerk-Secret).
    # Lokal (z. B. Windows) kommt der Key aus der Umgebungsvariable.
    if os.environ.get("ELEVENLABS_API_KEY"):
        kopf["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    body = json.dumps(daten).encode() if daten is not None else None
    req = urllib.request.Request(API + pfad, data=body, headers=kopf, method="POST" if body else "GET")
    try:
        with urllib.request.urlopen(req, timeout=120) as antwort:
            KOPFZEILEN.clear()
            for name in ("request-id", "character-cost"):
                if antwort.headers.get(name) is not None:
                    KOPFZEILEN[name] = antwort.headers.get(name)
            return json.loads(antwort.read())
    except urllib.error.HTTPError as e:
        # Antwort von ElevenLabs zeigen (enthält den Grund, z. B. quota_exceeded oder invalid_api_key, nie den Schlüssel)
        grund = e.read().decode("utf-8", "replace")[:500]
        print(f"ElevenLabs HTTP {e.code}: {grund}", file=sys.stderr)
        e.grund = grund  # sprechen() entscheidet daran, ob ein abgelehntes Feld einmal weggelassen wird
        raise


# Feste Voice-IDs (der Key braucht dafür kein Leserecht „voices_read“). Deutsche Bibliotheksstimmen: IDs laut json2video.com/ai-voices/elevenlabs/languages/german/
STIMMEN = {
    "Ben": "aTTiK3YzK3dXETpuDE2h",        # deutsch, jung, locker (Bibliotheksstimme, Standard)
    "Marc": "gGjaVIGkCSfKUIBYtNT2",       # deutsch, angenehm, erklärend
    "Alexander": "kkJxCnlRCckmfFvzDW5Q",  # deutsch, tief, TV-Sprecher
    "Otto": "FTNCalFNG5bRnkkaP5Ug",       # deutsch, ruhig, Studio
    "George": "JBFqnCBsd6RMkjVDRZzb",     # männlich, warm
    "Daniel": "onwK4e9ZLuTAKqWW03F9",     # männlich, nachrichtlich
    "Brian": "nPczCjzI2devNBz1zQrb",      # männlich, tief
    "Sarah": "EXAVITQu4vr4xnSDxMaL",      # weiblich, weich
    "Lily": "pFZP5JQG7iQjIQuC4Bku",       # weiblich, warm
    "Charlotte": "XB0fDUnXU5powFXDhCwa",  # weiblich, klar
}


def stimme_finden(wunsch):
    for name, vid in STIMMEN.items():
        if wunsch in (name, vid) or name.lower() == wunsch.lower():
            return vid, name
    if len(wunsch) >= 20:  # beliebige Voice-ID direkt verwenden
        return wunsch, wunsch
    sys.exit(f"Stimme '{wunsch}' unbekannt. Bekannt: {', '.join(STIMMEN)} (oder eine Voice-ID angeben)")


CACHE = None  # wird in main() auf <projekt>/audio/cache gesetzt
WAECHTER = None  # wird in main() gesetzt: Sperre + Vorprüfung vor jeder BEZAHLTEN Anfrage (Cache-Treffer kosten nichts)
CREDITS_JE_ZEICHEN = 0.4  # Eleven v4, gemessen 02.–07.11.2026 (ca. 480 Credits für 1.200 Zeichen)
ABLEHNBAR = ("language_code", "seed", "voice_settings")  # Felder, die bei HTTP 400/422 einmal weggelassen werden dürfen


def seed_aus_name(name, neuaufnahme=False):
    """Fester Seed je Projekt (0 … 2**32 − 1), berechnet aus dem Namen des Projektordners. Eine Neuaufnahme (hörbarer
    Fehler der Stimme) bekommt einen eigenen festen Seed, sonst käme bei gleichem Text derselbe Fehler noch einmal."""
    basis = name + ("#neuaufnahme" if neuaufnahme else "")
    return int.from_bytes(hashlib.sha256(basis.encode("utf-8")).digest()[:4], "big")


def anfrage_daten(text):
    """Body der Anfrage an /text-to-speech/<voice>/with-timestamps."""
    daten = {"text": text, "model_id": MODELL}
    v4 = MODELL == MODELLE["v4"]
    if v4:
        daten["language_code"] = SPRACHE
    if not GESPEICHERTE_EINSTELLUNGEN:
        daten["voice_settings"] = dict(EINSTELLUNGEN_V4 if v4 else EINSTELLUNGEN_V2)
    if SEED is not None:
        daten["seed"] = SEED
    return daten


def cache_schluessel(voice_id, daten):
    return hashlib.sha1(json.dumps([voice_id, daten], sort_keys=True).encode()).hexdigest()[:16]


def sprechen(text, voice_id):
    daten = anfrage_daten(text)
    schluessel = cache_schluessel(voice_id, daten)
    # Aufnahmen bis 08.11.2026 liegen unter dem Schlüssel der damaligen Anfrage (nur Text und Modell) im Cache
    for k in (schluessel, cache_schluessel(voice_id, {"text": text, "model_id": MODELL})):
        if CACHE is not None and (CACHE / f"{k}.json").exists():
            return json.loads((CACHE / f"{k}.json").read_text())
    if WAECHTER is not None:
        WAECHTER.vor_anfrage(len(text))  # beendet das Skript, wenn die Aufnahme nicht erlaubt ist
    pfad = f"/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128"
    ohne = []
    try:
        antwort = anfrage(pfad, daten)
    except urllib.error.HTTPError as e:
        grund = str(getattr(e, "grund", ""))
        ohne = [f for f in ABLEHNBAR if f in daten and f in grund] if e.code in (400, 422) else []
        if not ohne:
            raise
        e.close()
        print(f"Hinweis: ElevenLabs lehnt {', '.join(ohne)} ab (HTTP {e.code}, keine Credits verbraucht). "
              f"Die Anfrage geht EINMAL ohne {'dieses Feld' if len(ohne) == 1 else 'diese Felder'} erneut raus.")
        daten = {k: v for k, v in daten.items() if k not in ohne}
        antwort = anfrage(pfad, daten)  # scheitert auch das, endet der Lauf mit dem Fehler von ElevenLabs
    if CACHE is not None:
        CACHE.mkdir(parents=True, exist_ok=True)
        (CACHE / f"{schluessel}.json").write_text(json.dumps(antwort))
    if WAECHTER is not None:
        angaben = {"seed": daten.get("seed"), "request_id": KOPFZEILEN.get("request-id"),
                   "character_cost": KOPFZEILEN.get("character-cost")}
        if ohne:
            angaben["ohne_felder"] = ohne
        WAECHTER.nach_anfrage(len(text), angaben)
    return antwort


# Grund einer Neuaufnahme darf nie Länge, Hook, Tempo oder Pausen sein: Das Video folgt der Stimme (Inhaber 09.11.2026).
ZEIT_GRUND = re.compile(r"\bzu\s+(lang|kurz|schnell|langsam)\b|\b(video|stimm|satz|hook)?l(ä|ae)nge\b|\bkürz|\bkuerz|\bgekürzt|"
                        r"\bhook\b|\btempo\b|\bdauert?\b|\bpausen?\b|\bstraff|\bsekunden?\b", re.I)


class Waechter:
    """Feste Regel des Inhabers (08.11.2026): Jedes Skript geht genau EINMAL durch ElevenLabs, die Stimme muss beim
    ersten Mal sitzen. Vor der ersten bezahlten Anfrage eines Laufs prüft der Wächter
      1. die Sperre: Hat das Projekt schon eine Aufnahme (audio/aufnahmen.json, sonst Dateien im Cache), gibt es eine
         zweite nur mit --neuaufnahme "<Grund>" und nur bei einem hörbaren Fehler der Stimme (falsche Aussprache,
         verschlucktes Wort, Störgeräusch), höchstens einmal je Projekt. Länge, Tempo und Pausen sind nie ein Grund:
         Das Video folgt der Stimme (Inhaber 09.11.2026);
      2. die kostenlose Text-Hygiene qc/stimme_vorab.py (Ziffern, Zeichen, Abkürzungen, Markierungen, Audio-Tags …),
         für jede Stimme und jedes Modell.
    Nach jeder bezahlten Anfrage trägt er die Aufnahme in audio/aufnahmen.json ein."""

    def __init__(self, projekt, skript, grund=None, voice_id=None):
        self.projekt, self.skript, self.grund, self.voice_id = projekt, skript, grund, voice_id
        self.datei = projekt / "audio" / "aufnahmen.json"
        self.freigegeben = False
        self.eintrag = None

    def bisher(self):
        if self.datei.exists():
            return json.loads(self.datei.read_text(encoding="utf-8")).get("aufnahmen", [])
        cache = self.projekt / "audio" / "cache"
        alt = sorted(cache.glob("*.json")) if cache.exists() else []
        return [{"zeit": "vor 08.11.2026", "grund": "aus dem Cache gezählt"} for _ in alt]

    def vor_anfrage(self, zeichen):
        if self.freigegeben:
            return
        bisher = self.bisher()
        self.basis = bisher  # Stand VOR dieser Anfrage (danach liegt die neue Antwort schon im Cache)
        if bisher and not self.grund:
            sys.exit(f"GESPERRT (keine Anfrage an ElevenLabs): Dieses Projekt hat schon {len(bisher)} Aufnahme(n). Jedes Skript geht nur "
                     f"einmal durch ElevenLabs (Regel des Inhabers 08.11.). Für Länge, Tempo oder Pausen gibt es keine zweite "
                     f"Aufnahme: Das Video folgt der fertigen Stimme (audio/timing.json), nie umgekehrt. Nur bei einem hörbaren "
                     f"Fehler der Stimme (falsche Aussprache, verschlucktes Wort, Störgeräusch) gibt es EINE Neuaufnahme: "
                     f"--neuaufnahme \"<was genau falsch klingt>\".")
        if self.grund:
            if len(bisher) >= 2:
                sys.exit(f"GESPERRT: Dieses Projekt hatte schon {len(bisher)} Aufnahmen, eine weitere Neuaufnahme gibt es nicht. "
                         f"Slot auf Rückfrage an den Inhaber.")
            if ZEIT_GRUND.search(self.grund):
                sys.exit(f"GESPERRT: „{self.grund}“ ist kein Grund für eine Neuaufnahme. Länge, Hook, Tempo und Pausen der Stimme "
                         f"bleiben, wie sie sind; das Video folgt der Stimme (audio/timing.json).")
        sys.path.insert(0, str(Path(__file__).resolve().parent / "qc"))
        import stimme_vorab
        bereit, zeilen, info = stimme_vorab.pruefe_skript(self.skript)
        stimme_vorab.ausgeben(zeilen, info, bereit)
        if not bereit:
            sys.exit("VORPRÜFUNG NICHT BESTANDEN (keine Anfrage an ElevenLabs, keine Credits verbraucht). "
                     "Sprechtext in skript.json anpassen und erneut prüfen: python qc/stimme_vorab.py <projekt>")
        print(f"Aufnahme freigegeben: {zeichen} Zeichen, ca. {round(zeichen * CREDITS_JE_ZEICHEN)} Credits"
              + (f" (Neuaufnahme: {self.grund})" if self.grund else ""))
        self.freigegeben = True

    def nach_anfrage(self, zeichen, angaben=None):
        """Ein Lauf = eine Aufnahme = ein Eintrag. angaben: Seed, Anfrage-Kennung und Zeichen-Kosten laut ElevenLabs."""
        import datetime
        if self.eintrag is None:
            self.eintrag = {"zeit": datetime.datetime.now().astimezone().isoformat(timespec="seconds"), "zeichen": 0,
                            "credits_geschaetzt": 0, "modell": MODELL, "voice_id": self.voice_id,
                            "grund": self.grund or "erste Aufnahme"}
            self.liste = self.basis + [self.eintrag]
        self.eintrag["zeichen"] += zeichen
        self.eintrag["credits_geschaetzt"] = round(self.eintrag["zeichen"] * CREDITS_JE_ZEICHEN)
        self.eintrag.update({k: v for k, v in (angaben or {}).items() if v is not None})
        self.datei.parent.mkdir(parents=True, exist_ok=True)
        self.datei.write_text(json.dumps({"regel": "Ein Skript geht genau einmal durch ElevenLabs (Inhaber 08.11.2026)",
                                          "aufnahmen": self.liste}, ensure_ascii=False, indent=1), encoding="utf-8")


def pcm(mp3_bytes):
    """MP3 → 16-bit-Mono-Samples (über ffmpeg)."""
    import subprocess
    roh = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "pipe:1"],
                         input=mp3_bytes, capture_output=True, check=True).stdout
    import array
    a = array.array("h"); a.frombytes(roh); return a


def mp3_schreiben(samples, ziel):
    import subprocess
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-i", "pipe:0",
                    "-codec:a", "libmp3lame", "-b:a", "160k", str(ziel)], input=samples.tobytes(), check=True)


def ohne_regie(zeichen):
    """Ersetzt Audio-Tags [..] und Markierungen <..> durch Leerzeichen, damit sie nicht als Wörter zählen."""
    raus, tiefe = [], 0
    for z in zeichen:
        if z in "[<":
            tiefe += 1
        raus.append(" " if tiefe else z)
        if z in "]>" and tiefe:
            tiefe -= 1
    return raus


def woerter(zeichen, starts, enden, versatz=0):
    liste, wort, beginn = [], "", None
    for z, s, e in zip(ohne_regie(zeichen), starts, enden):
        if z.isspace():
            if wort:
                liste.append({"wort": wort, "start": round(beginn, 3), "ende": round(vorher, 3)})
            wort, beginn = "", None
            continue
        if beginn is None:
            beginn = s
        wort += z
        vorher = e
    if wort:
        liste.append({"wort": wort, "start": round(beginn, 3), "ende": round(vorher, 3)})
    return liste


def anzeige_woerter(anzeige, gesprochen):
    """Ordnet die Wörter der Anzeigefassung den gesprochenen Wörtern zu.

    Gleiche Wörter bekommen ihre exakte Zeit. Abweichende Blöcke (z. B. „3,4“ ↔ „drei Komma vier“,
    „GTA“ ↔ „G T A“) teilen sich die Zeit des gesprochenen Blocks.
    """
    ziel = anzeige.split()
    if not gesprochen or [w["wort"] for w in gesprochen] == ziel:
        return gesprochen
    norm = lambda w: re.sub(r"[^\w]", "", w.lower())
    abgleich = difflib.SequenceMatcher(None, [norm(w) for w in ziel], [norm(w["wort"]) for w in gesprochen], autojunk=False)
    ergebnis = []
    for art, i1, i2, j1, j2 in abgleich.get_opcodes():
        if art == "equal":
            ergebnis += [{"wort": ziel[i1 + k], "start": gesprochen[j1 + k]["start"], "ende": gesprochen[j1 + k]["ende"]}
                         for k in range(i2 - i1)]
        elif i2 > i1:  # „replace“ oder „delete“; „insert“ (nur gesprochen) braucht kein Anzeige-Wort
            if j2 > j1:
                start, ende = gesprochen[j1]["start"], gesprochen[j2 - 1]["ende"]
            else:  # Anzeige-Wort ohne gesprochenes Gegenstück: in die Lücke zwischen den Nachbarn
                start = gesprochen[j1 - 1]["ende"] if j1 > 0 else gesprochen[0]["start"]
                ende = gesprochen[j1]["start"] if j1 < len(gesprochen) else start
            schritt = (ende - start) / (i2 - i1)
            ergebnis += [{"wort": ziel[i1 + k], "start": start + k * schritt, "ende": start + (k + 1) * schritt}
                         for k in range(i2 - i1)]
    return ergebnis


VORLAUF = 0.05   # so viel Atem bzw. Ansatz bleibt vor dem ersten Wort
AUSKLANG = 0.45  # so viel Ausklang bleibt nach dem letzten Wort


def aussprache_laden(datei=None):
    """Aussprache-Ersetzungen aus pipeline/aussprache.json ({"Wort": "gesprochene Form"}); {} ohne Datei.
    Schlüssel mit „_“ am Anfang sind Anmerkungen und zählen nicht."""
    datei = Path(datei) if datei else AUSSPRACHE_DATEI
    if not datei.exists():
        return {}
    roh = json.loads(datei.read_text(encoding="utf-8"))
    return {str(k): v for k, v in roh.items() if isinstance(v, str) and str(k).strip() and not str(k).startswith("_")}


def aussprache_anwenden(text, aliase=None):
    """Ersetzt ganze Wörter (Groß-/Kleinschreibung genau) durch ihre gesprochene Form; längere Einträge zuerst."""
    aliase = aussprache_laden() if aliase is None else aliase
    for wort in sorted(aliase, key=len, reverse=True):
        text = re.sub(r"(?<!\w)" + re.escape(wort) + r"(?!\w)", lambda m, form=aliase[wort]: form, text)
    return text


def aufbereiten(texte, aliase=None):
    """Sprechtexte so zusammensetzen, wie sie an ElevenLabs gehen (qc/stimme_vorab.py prüft genau diesen Text).

    Zuerst die Aussprache-Ersetzungen (pipeline/aussprache.json), dann wie ein Sprecher-Skript: jeder Satz auf eine
    eigene Zeile, Leerzeile vor jedem neuen Abschnitt. Die Stimme setzt ihre Pausen daraus selbst.
    """
    aliase = aussprache_laden() if aliase is None else aliase
    texte = [re.sub(r"([.!?:])\s+", r"\1\n", aussprache_anwenden(t, aliase).strip()) for t in texte]
    if MODELL == MODELLE["v2"]:
        if any(re.search(r"\[[^\]]+\]", t) for t in texte):
            sys.exit("Audio-Tags wie [curious] funktionieren nur mit Eleven v4 (--modell v4); v2 würde sie vorlesen.")
        trenner = f'\n<break time="{PAUSE_ABSCHNITT}s" />\n'  # offizielle Pausen-Markierung (nur v2/Flash)
    else:
        if any("<break" in t for t in texte):
            sys.exit("Eleven v4 unterstützt keine <break>-Markierungen; Pausen über Satzzeichen und Absätze.")
        trenner = "\n\n"  # v4: Leerzeile zwischen Abschnitten, Pausen kommen aus Satzzeichen
    return texte, trenner, trenner.join(texte)


def segmente_bauen(skript, texte, trenner, zeichen, starts, enden, von):
    """Segment- und Wortzeiten aus den Zeichen-Zeitstempeln der Antwort von ElevenLabs."""
    segmente, pos = [], 0
    for seg, t in zip(skript["segmente"], texte):
        a, b = pos, pos + len(t)
        gesprochen = [{"wort": w["wort"], "start": round(w["start"] - von, 3), "ende": round(w["ende"] - von, 3)}
                      for w in woerter(zeichen[a:b], starts[a:b], enden[a:b])]
        segmente.append({"id": seg["id"], "text": seg["text"],
                         "start": gesprochen[0]["start"], "ende": gesprochen[-1]["ende"],
                         "woerter": anzeige_woerter(seg["text"], gesprochen)})
        pos = b + len(trenner)
    return segmente


def am_stueck(skript, texte, voice_id, name, ziel):
    """Ganzes Skript in einer einzigen Anfrage sprechen lassen (seit 31.10. Standard, seit 09.11.2026 das einzige Verfahren).

    Die Stimme spricht durchgehend wie bei einer echten Aufnahme: natürliche Satzmelodie und Pausen, keine Schnitte,
    kein Tempo-Faktor. Segment- und Wortzeiten kommen aus den Zeichen-Zeitstempeln; das Video richtet sich danach.
    """
    texte, trenner, gesamt = aufbereiten(texte)
    antwort = sprechen(gesamt, voice_id)
    al = antwort["alignment"]
    zeichen, starts, enden = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    if "".join(zeichen) != gesamt:
        sys.exit("Zeitstempel passen nicht zum Text (Zeichen weichen ab). Die Antwort liegt im Cache (audio/cache); "
                 "nicht neu vertonen, Rückfrage an den Inhaber.")
    samples = pcm(base64.b64decode(antwort["audio_base64"]))
    sichtbar = [k for k, z in enumerate(ohne_regie(zeichen)) if not z.isspace()]
    von = max(0.0, starts[sichtbar[0]] - VORLAUF)                  # Atem bzw. Ansatz vor dem ersten Wort behalten
    bis = min(len(samples) / RATE, enden[sichtbar[-1]] + AUSKLANG)  # Ausklang des letzten Worts behalten
    stueck = samples[int(von * RATE):int(bis * RATE)]
    segmente = segmente_bauen(skript, texte, trenner, zeichen, starts, enden, von)
    for s in segmente:
        print(f"  {s['id']:11} {s['start']:6.2f}–{s['ende']:6.2f} s")
    mp3_schreiben(stueck, ziel / "stimme.mp3")
    dauer = round(len(stueck) / RATE, 3)
    einstellungen = "gespeichert (Original)" if GESPEICHERTE_EINSTELLUNGEN else dict(EINSTELLUNGEN_V4 if MODELL == MODELLE["v4"] else EINSTELLUNGEN_V2)
    timing = {"stimme": name, "voice_id": voice_id, "modell": MODELL, "verfahren": "am_stueck",
              "einstellungen": einstellungen, "dauer": dauer, "segmente": segmente}
    (ziel / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {dauer} s, {len(gesamt)} Zeichen, eine Anfrage")


def main():
    projekt = Path(sys.argv[1])
    args = sys.argv[2:]
    if "--segmente" in args:
        sys.exit("--segmente gibt es seit 09.11.2026 nicht mehr (Entscheidung des Inhabers): Das ganze Skript geht in EINER "
                 "Anfrage an ElevenLabs, ohne feste Pausen und ohne Tempo-Faktor. Keine Anfrage gestellt.")
    wunsch = args[args.index("--voice") + 1] if "--voice" in args else STANDARD_STIMME
    voice_id, name = stimme_finden(wunsch)
    skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
    ziel = projekt / "audio"
    ziel.mkdir(parents=True, exist_ok=True)
    global CACHE, MODELL, GESPEICHERTE_EINSTELLUNGEN, WAECHTER, SEED
    CACHE = ziel / "cache"
    if "--modell" in args:
        MODELL = MODELLE.get(args[args.index("--modell") + 1], args[args.index("--modell") + 1])
    if "--gespeicherte-einstellungen" in args:
        GESPEICHERTE_EINSTELLUNGEN = True
    elif "--eigene-einstellungen" in args:
        print("Hinweis: --eigene-einstellungen ist seit 09.11.2026 der Standard (feste voice_settings) und nicht mehr nötig.")
    grund = args[args.index("--neuaufnahme") + 1].strip() if "--neuaufnahme" in args and args.index("--neuaufnahme") + 1 < len(args) else None
    if "--neuaufnahme" in args and not grund:
        sys.exit("--neuaufnahme braucht den Grund in Anführungszeichen (was genau an der Stimme falsch klingt).")
    SEED = seed_aus_name(projekt.resolve().name, neuaufnahme=bool(grund))
    if "--proben" not in args:  # Hörproben (nur auf Wunsch des Inhabers) laufen ohne Sperre
        WAECHTER = Waechter(projekt, skript, grund, voice_id)

    if "--proben" in args:  # kurze Hörproben mehrerer Stimmen
        for kandidat in STIMMEN:
            try:
                vid, vname = stimme_finden(kandidat)
            except SystemExit:
                continue
            probe = sprechen(skript["segmente"][0]["text"], vid)
            (ziel / f"probe_{vname}.mp3").write_bytes(base64.b64decode(probe["audio_base64"]))
            print("Probe:", vname)
        return

    # „sprechtext“ = Fassung für die Stimme (Zahlen ausgeschrieben, Lautschrift); „text“ = Anzeige bzw. Untertitel
    texte = [s.get("sprechtext") or s["text"] for s in skript["segmente"]]
    return am_stueck(skript, texte, voice_id, name, ziel)


if __name__ == "__main__":
    main()
