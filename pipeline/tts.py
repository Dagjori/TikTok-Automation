"""Erzeugt die Sprecherstimme eines Projekts über ElevenLabs, inklusive Zeitstempeln.

Aufruf:  python3 pipeline/tts.py <projektordner> [--voice NAME_ODER_ID] [--proben]
Liest:   <projekt>/skript.json  (Segmente mit Text)
Schreibt:<projekt>/audio/stimme.mp3, <projekt>/audio/timing.json (Start und Ende je Segment und je Wort)
Key:     Cloud: Netzwerk-Secret (Header xi-api-key für api.elevenlabs.io); lokal: Umgebungsvariable ELEVENLABS_API_KEY. Nie ins Repo.
"""
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
MODELL = "eleven_multilingual_v2"
STANDARD_STIMME = "Daniel"  # vom Inhaber gewählt (31.10.)
EINSTELLUNGEN = {"stability": 0.6, "similarity_boost": 0.8, "style": 0.0, "use_speaker_boost": True, "speed": 1.12}
PAUSE = 0.22          # Pause zwischen Segmenten in Sekunden
PAUSE_LANG = 0.38     # nach dem Hook und vor dem Schluss-Satz
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


# Feste IDs der ElevenLabs-Standardstimmen (der Key braucht dafür kein Leserecht „voices_read“)
STIMMEN = {
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
    daten = {"text": text, "model_id": MODELL, "voice_settings": EINSTELLUNGEN}
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


def mp3_schreiben(samples, ziel):
    import subprocess
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ac", "1", "-ar", str(RATE), "-i", "pipe:0",
                    "-codec:a", "libmp3lame", "-b:a", "160k", str(ziel)], input=samples.tobytes(), check=True)


def woerter(zeichen, starts, enden, versatz=0):
    liste, wort, beginn = [], "", None
    for z, s, e in zip(zeichen, starts, enden):
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
    """Verteilt die Wörter der Anzeigefassung zeitlich auf die gesprochenen Wörter (anteilig nach Position)."""
    ziel = anzeige.split()
    if [w["wort"] for w in gesprochen] == ziel or not gesprochen:
        return gesprochen
    n, m = len(ziel), len(gesprochen)
    ergebnis = []
    for i, wort in enumerate(ziel):
        von = gesprochen[min(m - 1, int(i * m / n))]
        bis = gesprochen[min(m - 1, max(int((i + 1) * m / n) - 1, int(i * m / n)))]
        ergebnis.append({"wort": wort, "start": von["start"], "ende": bis["ende"]})
    return ergebnis


def main():
    projekt = Path(sys.argv[1])
    args = sys.argv[2:]
    wunsch = args[args.index("--voice") + 1] if "--voice" in args else STANDARD_STIMME
    voice_id, name = stimme_finden(wunsch)
    skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
    ziel = projekt / "audio"
    ziel.mkdir(parents=True, exist_ok=True)
    global CACHE
    CACHE = ziel / "cache"

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
    import array
    gesamt_audio, segmente, zeit = array.array("h"), [], 0.0
    for i, (seg, gesprochen) in enumerate(zip(skript["segmente"], texte)):
        davor = " ".join(texte[max(0, i - 2):i])
        danach = texte[i + 1] if i + 1 < len(texte) else ""
        antwort = sprechen(gesprochen, voice_id, davor, danach)
        al = antwort["alignment"]
        zeichen, starts, enden = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
        sichtbar = [k for k, z in enumerate(zeichen) if not z.isspace()]
        von = max(0.0, starts[sichtbar[0]] - 0.03)
        bis = enden[sichtbar[-1]] + 0.07
        samples = pcm(base64.b64decode(antwort["audio_base64"]))
        stueck = samples[int(von * RATE):int(bis * RATE)]
        if i > 0:  # Pause vor diesem Segment
            pause = PAUSE_LANG if i == 1 or i == len(texte) - 1 else PAUSE
            gesamt_audio.extend(array.array("h", bytes(2 * int(pause * RATE))))
            zeit += pause
        versatz = zeit - von
        gesprochene_woerter = [{"wort": w["wort"], "start": round(w["start"] + versatz, 3), "ende": round(w["ende"] + versatz, 3)}
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
