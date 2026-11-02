"""Erzeugt die Sprecherstimme eines Projekts über ElevenLabs, inklusive Zeitstempeln.

Aufruf:  python3 pipeline/tts.py <projektordner> [--voice NAME_ODER_ID] [--modell v4|v2] [--eigene-einstellungen] [--proben] [--segmente]
         Standard: ganzes Skript in einer Anfrage (flüssig). --segmente = altes Verfahren je Segment.
Stimme:  Seit 31.10. (Entscheidung des Inhabers) klingt Ben wie auf der ElevenLabs-Webseite: Die Anfrage schickt KEINE
         voice_settings, also nutzt ElevenLabs die gespeicherten Einstellungen der Stimme („Voice settings overriding
         stored settings for the given voice“, API-Doku). --eigene-einstellungen = alte feste Werte (nur zum Vergleich).
Regie:   Der „sprechtext“ ist ein Regie-Text (.claude/skills/simulierbar-video/ton.md und ablauf.md): Satzzeichen, Zeilenumbrüche, Großschreibung
         für Betonung; bei Eleven v4 zusätzlich Audio-Tags wie [curious] oder [short pause]; bei Multilingual v2
         <break time="0.3s" />. Tags und Break-Markierungen werden nicht gesprochen und nicht als Untertitel-Wörter gezählt.
Liest:   <projekt>/skript.json  (Segmente mit Text)
Schreibt:<projekt>/audio/stimme.mp3, <projekt>/audio/timing.json (Start und Ende je Segment und je Wort)
Key:     Cloud: Netzwerk-Secret (Header xi-api-key für api.elevenlabs.io); lokal: Umgebungsvariable ELEVENLABS_API_KEY. Nie ins Repo.
"""
import base64
import difflib
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
MODELLE = {"v4": "eleven_v4", "v2": "eleven_multilingual_v2"}
MODELL = MODELLE["v4"]  # Standard für alle Videos: Eleven v4 (Wahl des Inhabers per Hörprobe, 01.11.); --modell v2 nur zum Vergleich
GESPEICHERTE_EINSTELLUNGEN = True  # True = keine voice_settings senden → Original-Klang wie auf ElevenLabs
STANDARD_STIMME = "aTTiK3YzK3dXETpuDE2h"  # „Ben“, muttersprachlich Deutsch (Wahl des Inhabers 31.10. per Hörprobe)
EINSTELLUNGEN = {"stability": 0.5, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True}  # Empfehlung von ElevenLabs: Startwert 50/75, „style“ immer 0 (sonst weniger stabil)
PAUSE_ABSCHNITT = 0.35  # Pause zwischen zwei Abschnitten (Maßstab .claude/skills/simulierbar-video/massstab.md: Satzpausen ca. 0,26 s, nie über 0,4 s)
PAUSE = 0.22          # Pause zwischen Segmenten (Vorbilder: Median 0,16–0,38 s)
PAUSE_LANG = 0.3      # nach dem Hook und vor dem Schluss-Satz
ZIEL_WPS = 2.95       # Wörter pro Sekunde beim Sprechen (Top-Videos: 2,91–3,02, gemessen 31.10.2026)
MAX_DEHNUNG = 1.0     # keine künstliche Beschleunigung (Inhaber 31.10.: 1,35 war zu schnell); Tempo kommt aus der Stimme selbst
RATE = 44100


def anfrage(pfad, daten=None):
    kopf = {"Content-Type": "application/json"}
    # In der Cloud setzt der Proxy den Header xi-api-key selbst ein (Netzwerk-Secret).
    # Lokal (z. B. Windows) kommt der Key aus der Umgebungsvariable.
    if os.environ.get("ELEVENLABS_API_KEY"):
        kopf["xi-api-key"] = os.environ["ELEVENLABS_API_KEY"]
    body = json.dumps(daten).encode() if daten is not None else None
    req = urllib.request.Request(API + pfad, data=body, headers=kopf, method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=120) as antwort:
        return json.loads(antwort.read())


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


def sprechen(text, voice_id, davor="", danach=""):
    daten = {"text": text, "model_id": MODELL}
    if not GESPEICHERTE_EINSTELLUNGEN:
        daten["voice_settings"] = EINSTELLUNGEN
    if davor:
        daten["previous_text"] = davor
    if danach:
        daten["next_text"] = danach
    import hashlib
    schluessel = hashlib.sha1(json.dumps([voice_id, daten], sort_keys=True).encode()).hexdigest()[:16]
    if CACHE is not None and (CACHE / f"{schluessel}.json").exists():
        return json.loads((CACHE / f"{schluessel}.json").read_text())
    antwort = anfrage(f"/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128", daten)
    if CACHE is not None:
        CACHE.mkdir(parents=True, exist_ok=True)
        (CACHE / f"{schluessel}.json").write_text(json.dumps(antwort))
    return antwort


def pcm(mp3_bytes):
    """MP3 → 16-bit-Mono-Samples (über ffmpeg)."""
    import subprocess
    roh = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "pipe:1"],
                         input=mp3_bytes, capture_output=True, check=True).stdout
    import array
    a = array.array("h"); a.frombytes(roh); return a


def dehnen(samples, faktor):
    """Beschleunigt Sprache ohne Tonhöhenänderung (ffmpeg atempo)."""
    import array, subprocess
    raus = subprocess.run(["ffmpeg", "-v", "error", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-i", "pipe:0",
                           "-filter:a", f"atempo={faktor:.4f}", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "pipe:1"],
                          input=samples.tobytes(), capture_output=True, check=True).stdout
    a = array.array("h"); a.frombytes(raus); return a


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


def am_stueck(skript, texte, voice_id, name, ziel):
    """Ganzes Skript in einer einzigen Anfrage sprechen lassen (Standard seit 31.10.).

    Die Stimme spricht durchgehend wie bei einer echten Aufnahme: natürliche Satzmelodie und Pausen,
    keine Schnitte. Das alte Verfahren (je Segment eine Anfrage, harte Schnitte, feste Pausen in digitaler
    Stille) klang abgehackt. Segment- und Wortzeiten kommen aus den Zeichen-Zeitstempeln.
    """
    # Wie ein Sprecher-Skript: jeder Satz auf eine eigene Zeile, Leerzeile vor jedem neuen Abschnitt.
    # Die Stimme setzt dadurch nach jedem Satz eine kurze und vor jedem Abschnitt eine längere Pause.
    texte = [re.sub(r"([.!?:])\s+", r"\1\n", t.strip()) for t in texte]
    if MODELL == MODELLE["v2"]:
        if any(re.search(r"\[[^\]]+\]", t) for t in texte):
            sys.exit("Audio-Tags wie [curious] funktionieren nur mit Eleven v4 (--modell v4); v2 würde sie vorlesen.")
        trenner = f'\n<break time="{PAUSE_ABSCHNITT}s" />\n'  # offizielle Pausen-Markierung (nur v2/Flash)
    else:
        if any("<break" in t for t in texte):
            sys.exit("Eleven v4 unterstützt keine <break>-Markierungen; Pausen über Satzzeichen bzw. [short pause].")
        trenner = "\n\n"  # v4: Leerzeile zwischen Abschnitten, Pausen kommen aus Satzzeichen und Tags
    gesamt = trenner.join(texte)
    antwort = sprechen(gesamt, voice_id)
    al = antwort["alignment"]
    zeichen, starts, enden = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    if "".join(zeichen) != gesamt:
        sys.exit("Zeitstempel passen nicht zum Text (Zeichen weichen ab). Mit --segmente erzeugen.")
    samples = pcm(base64.b64decode(antwort["audio_base64"]))
    sichtbar = [k for k, z in enumerate(ohne_regie(zeichen)) if not z.isspace()]
    von = max(0.0, starts[sichtbar[0]] - 0.05)               # Atem bzw. Ansatz vor dem ersten Wort behalten
    bis = min(len(samples) / RATE, enden[sichtbar[-1]] + 0.45)  # Ausklang des letzten Worts behalten
    stueck = samples[int(von * RATE):int(bis * RATE)]
    segmente, pos = [], 0
    for seg, t in zip(skript["segmente"], texte):
        a, b = pos, pos + len(t)
        gesprochen = [{"wort": w["wort"], "start": round(w["start"] - von, 3), "ende": round(w["ende"] - von, 3)}
                      for w in woerter(zeichen[a:b], starts[a:b], enden[a:b])]
        segmente.append({"id": seg["id"], "text": seg["text"],
                         "start": gesprochen[0]["start"], "ende": gesprochen[-1]["ende"],
                         "woerter": anzeige_woerter(seg["text"], gesprochen)})
        print(f"  {seg['id']:11} {segmente[-1]['start']:6.2f}–{segmente[-1]['ende']:6.2f} s")
        pos = b + len(trenner)
    mp3_schreiben(stueck, ziel / "stimme.mp3")
    dauer = round(len(stueck) / RATE, 3)
    timing = {"stimme": name, "voice_id": voice_id, "modell": MODELL, "verfahren": "am_stueck",
              "einstellungen": "gespeichert (Original)" if GESPEICHERTE_EINSTELLUNGEN else EINSTELLUNGEN,
              "dauer": dauer, "segmente": segmente}
    (ziel / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {dauer} s, {len(gesamt)} Zeichen, eine Anfrage")


def main():
    projekt = Path(sys.argv[1])
    args = sys.argv[2:]
    wunsch = args[args.index("--voice") + 1] if "--voice" in args else STANDARD_STIMME
    voice_id, name = stimme_finden(wunsch)
    skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
    ziel = projekt / "audio"
    ziel.mkdir(parents=True, exist_ok=True)
    global CACHE, MODELL, GESPEICHERTE_EINSTELLUNGEN
    CACHE = ziel / "cache"
    if "--modell" in args:
        MODELL = MODELLE.get(args[args.index("--modell") + 1], args[args.index("--modell") + 1])
    if "--eigene-einstellungen" in args:
        GESPEICHERTE_EINSTELLUNGEN = False

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
    if "--segmente" not in args:
        return am_stueck(skript, texte, voice_id, name, ziel)
    import array
    # Durchgang 1: alle Segmente erzeugen (Cache), Ränder bestimmen, natürliches Tempo messen
    roh = []
    for i, gesprochen in enumerate(texte):
        davor = " ".join(texte[max(0, i - 2):i])
        danach = texte[i + 1] if i + 1 < len(texte) else ""
        antwort = sprechen(gesprochen, voice_id, davor, danach)
        al = antwort["alignment"]
        zeichen, starts, enden = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
        sichtbar = [k for k, z in enumerate(zeichen) if not z.isspace()]
        von = max(0.0, starts[sichtbar[0]] - 0.03)
        bis = enden[sichtbar[-1]] + 0.07
        samples = pcm(base64.b64decode(antwort["audio_base64"]))
        roh.append((zeichen, starts, enden, von, samples[int(von * RATE):int(bis * RATE)]))
    anzahl_woerter = sum(len(s["text"].split()) for s in skript["segmente"])
    sprechdauer = sum(len(r[4]) for r in roh) / RATE
    faktor = min(MAX_DEHNUNG, max(1.0, ZIEL_WPS / (anzahl_woerter / sprechdauer)))
    print(f"  natürliches Tempo {anzahl_woerter / sprechdauer:.2f} W/s → Faktor {faktor:.3f}")

    # Durchgang 2: beschleunigen (Tonhöhe bleibt), Pausen setzen, Zeiten umrechnen
    gesamt_audio, segmente, zeit = array.array("h"), [], 0.0
    for i, (seg, (zeichen, starts, enden, von, stueck)) in enumerate(zip(skript["segmente"], roh)):
        if faktor > 1.0:
            stueck = dehnen(stueck, faktor)
        if i > 0:  # Pause vor diesem Segment
            pause = PAUSE_LANG if i == 1 or i == len(texte) - 1 else PAUSE
            gesamt_audio.extend(array.array("h", bytes(2 * int(pause * RATE))))
            zeit += pause
        gesprochene_woerter = [{"wort": w["wort"], "start": round(zeit + (w["start"] - von) / faktor, 3),
                                "ende": round(zeit + (w["ende"] - von) / faktor, 3)}
                               for w in woerter(zeichen, starts, enden)]
        laenge = len(stueck) / RATE  # echte Länge (kann kürzer sein als bis - von, wenn das Audio vorher endet)
        segmente.append({
            "id": seg["id"], "text": seg["text"],
            "start": round(zeit, 3), "ende": round(zeit + laenge, 3),
            "woerter": anzeige_woerter(seg["text"], gesprochene_woerter),
        })
        gesamt_audio.extend(stueck)
        zeit += laenge
        print(f"  {seg['id']:11} {laenge:5.2f} s")
    mp3_schreiben(gesamt_audio, ziel / "stimme.mp3")
    gesamt = " ".join(texte)
    enden = [segmente[-1]["ende"]]
    timing = {"stimme": name, "voice_id": voice_id, "modell": MODELL, "dauer": round(enden[-1], 3), "segmente": segmente}
    (ziel / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {timing['dauer']} s, {len(gesamt)} Zeichen")


if __name__ == "__main__":
    main()
