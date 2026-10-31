"""Erzeugt die Sprecherstimme eines Projekts über ElevenLabs, inklusive Zeitstempeln.

Aufruf:  python3 pipeline/tts.py <projektordner> [--voice NAME_ODER_ID] [--proben]
Liest:   <projekt>/skript.json  (Segmente mit Text)
Schreibt:<projekt>/audio/stimme.mp3, <projekt>/audio/timing.json (Start und Ende je Segment und je Wort)
Key:     Umgebungsvariable ELEVENLABS_API_KEY (nie ins Repo).
"""
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

API = "https://api.elevenlabs.io/v1"
MODELL = "eleven_multilingual_v2"
STANDARD_STIMME = "George"
EINSTELLUNGEN = {"stability": 0.45, "similarity_boost": 0.8, "style": 0.2, "use_speaker_boost": True}


def anfrage(pfad, daten=None):
    kopf = {"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"}
    body = json.dumps(daten).encode() if daten is not None else None
    req = urllib.request.Request(API + pfad, data=body, headers=kopf, method="POST" if body else "GET")
    with urllib.request.urlopen(req, timeout=120) as antwort:
        return json.loads(antwort.read())


def stimme_finden(wunsch):
    stimmen = anfrage("/voices")["voices"]
    for s in stimmen:
        if wunsch in (s["voice_id"], s["name"]) or s["name"].lower().startswith(wunsch.lower()):
            return s["voice_id"], s["name"]
    namen = ", ".join(s["name"] for s in stimmen[:30])
    sys.exit(f"Stimme '{wunsch}' nicht gefunden. Verfügbar: {namen}")


def sprechen(text, voice_id):
    return anfrage(f"/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
                   {"text": text, "model_id": MODELL, "voice_settings": EINSTELLUNGEN})


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


def main():
    projekt = Path(sys.argv[1])
    args = sys.argv[2:]
    wunsch = args[args.index("--voice") + 1] if "--voice" in args else STANDARD_STIMME
    voice_id, name = stimme_finden(wunsch)
    skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
    ziel = projekt / "audio"
    ziel.mkdir(parents=True, exist_ok=True)

    if "--proben" in args:  # kurze Hörproben mehrerer Stimmen
        for kandidat in ["George", "Brian", "Daniel", "Charlie", "Lily", "Charlotte"]:
            try:
                vid, vname = stimme_finden(kandidat)
            except SystemExit:
                continue
            probe = sprechen(skript["segmente"][0]["text"], vid)
            (ziel / f"probe_{vname}.mp3").write_bytes(base64.b64decode(probe["audio_base64"]))
            print("Probe:", vname)
        return

    # Ganzer Text in einem Durchgang (natürliche Betonung), Segmentgrenzen über Zeichenpositionen
    texte = [s["text"] for s in skript["segmente"]]
    gesamt = " ".join(texte)
    antwort = sprechen(gesamt, voice_id)
    (ziel / "stimme.mp3").write_bytes(base64.b64decode(antwort["audio_base64"]))
    al = antwort["alignment"]
    zeichen, starts, enden = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]

    segmente, pos = [], 0
    for seg in skript["segmente"]:
        a, b = pos, pos + len(seg["text"])
        segmente.append({
            "id": seg["id"], "text": seg["text"],
            "start": round(starts[a], 3), "ende": round(enden[b - 1], 3),
            "woerter": woerter(zeichen[a:b], starts[a:b], enden[a:b]),
        })
        pos = b + 1  # Leerzeichen zwischen den Segmenten
    timing = {"stimme": name, "voice_id": voice_id, "modell": MODELL, "dauer": round(enden[-1], 3), "segmente": segmente}
    (ziel / "timing.json").write_text(json.dumps(timing, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {timing['dauer']} s, {len(gesamt)} Zeichen")


if __name__ == "__main__":
    main()
