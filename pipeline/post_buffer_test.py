"""Tests für das Cover in pipeline/post_buffer.py (seit 08.11.2026). Ohne Netz: Schema als Attrappe, Videos mit ffmpeg erzeugt.
Aufruf: python pipeline/post_buffer_test.py   (oder: python -m pytest pipeline/post_buffer_test.py)"""
import datetime
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import post_buffer as pb  # noqa: E402

ZEIT = datetime.datetime(2026, 11, 10, 11, 30, tzinfo=datetime.timezone.utc)


class Bericht:
    def __init__(self):
        self.oks, self.warnungen, self.fehler = [], [], []

    def ok(self, t):
        self.oks.append(t)

    def warnung(self, t):
        self.warnungen.append(t)

    def fehl(self, t):
        self.fehler.append(t)


class SchemaAttrappe:
    """Liefert Eingabetypen wie die Live-Introspection (nur die Felder, die cover_im_schema braucht)."""

    def __init__(self, mit_offset=True, mit_metadata=True):
        meta = [{"name": "title"}] + ([{"name": "thumbnailOffset"}] if mit_offset else [])
        video = [{"name": "url", "type": {"kind": "NON_NULL", "ofType": {"kind": "SCALAR", "name": "String"}}},
                 {"name": "thumbnailUrl", "type": {"kind": "SCALAR", "name": "String"}}]
        if mit_metadata:
            video.append({"name": "metadata", "type": {"kind": "INPUT_OBJECT", "name": "VideoAssetMetadataInput", "ofType": None}})
        self.typen = {"VideoAssetInput": {"inputFields": video}, "VideoAssetMetadataInput": {"inputFields": meta}}

    def typ(self, name):
        return self.typen[name]


def test_variablen_mit_cover():
    v = pb.baue_variablen("k1", "Text #a #b #c", ZEIT, "automatic", "https://x/v.mp4", cover_ms=1000)
    assert v["input"]["assets"] == [{"video": {"url": "https://x/v.mp4", "metadata": {"thumbnailOffset": 1000}}}]
    assert "thumbnailUrl" not in v["input"]["assets"][0]["video"]   # lehnt Buffer ab


def test_variablen_ohne_cover_wie_bisher():
    v = pb.baue_variablen("k1", "Text", ZEIT, "automatic", "https://x/v.mp4")
    assert v["input"]["assets"] == [{"video": {"url": "https://x/v.mp4"}}]
    assert v["input"]["metadata"] == {"tiktok": {"isAiGenerated": False}}


def test_cover_ohne_entfernt_nur_das_cover():
    v = pb.baue_variablen("k1", "Text", ZEIT, "automatic", "https://x/v.mp4", ki_label=True, cover_ms=1500)
    o = pb.cover_ohne(v)
    assert o["input"]["assets"] == [{"video": {"url": "https://x/v.mp4"}}]
    assert o["input"]["metadata"]["tiktok"]["isAiGenerated"] is True
    assert v["input"]["assets"][0]["video"]["metadata"] == {"thumbnailOffset": 1500}   # Original unverändert


def test_cover_zeitpunkt_je_kanal():
    assert pb.cover_ms_fuer("simulierbar") == 1000
    assert pb.cover_ms_fuer("stelldirvor.pov") == 1500
    assert pb.cover_ms_fuer("simulierbar", 2500) == 2500
    assert pb.cover_ms_fuer("simulierbar", 2500, ohne=True) is None


def test_cover_im_schema():
    assert pb.cover_im_schema(SchemaAttrappe()) is True
    assert pb.cover_im_schema(SchemaAttrappe(mit_offset=False)) is False
    assert pb.cover_im_schema(SchemaAttrappe(mit_metadata=False)) is False


def test_schema_attrappe_prueft_variablen_ohne_fehler():
    """Die Variablen mit Cover bestehen die eigene Schema-Prüfung (gleiche Logik wie gegen das Live-Schema)."""
    s = pb.Schema()
    s.typen = {
        "VideoAssetInput": {"kind": "INPUT_OBJECT", "name": "VideoAssetInput", "inputFields": [
            {"name": "url", "defaultValue": None, "type": {"kind": "NON_NULL", "ofType": {"kind": "SCALAR", "name": "String"}}},
            {"name": "metadata", "defaultValue": None, "type": {"kind": "INPUT_OBJECT", "name": "VideoAssetMetadataInput"}}]},
        "VideoAssetMetadataInput": {"kind": "INPUT_OBJECT", "name": "VideoAssetMetadataInput", "inputFields": [
            {"name": "thumbnailOffset", "defaultValue": None, "type": {"kind": "SCALAR", "name": "Int"}}]},
    }
    fehler = []
    video = pb.baue_variablen("k", "t", ZEIT, "automatic", "u", cover_ms=1000)["input"]["assets"][0]["video"]
    s.pruefe({"kind": "INPUT_OBJECT", "name": "VideoAssetInput"}, video, "video", fehler)
    assert fehler == []
    s.pruefe({"kind": "INPUT_OBJECT", "name": "VideoAssetInput"}, {"url": "u", "metadata": {"thumbnailOffset": "1000"}}, "video", fehler)
    assert fehler and "Int erwartet" in fehler[0]


def _video(ordner, farbe):
    pfad = Path(ordner) / f"probe_{farbe}.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c={farbe}:s=108x192:d=3:r=10", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", str(pfad)], check=True)
    return pfad


def test_cover_bild_wird_gespeichert_und_schwarz_erkannt():
    with tempfile.TemporaryDirectory() as tmp:
        b = Bericht()
        bild = pb.cover_bild(_video(tmp, "white"), 1000, 3.0, b)
        assert bild is not None and bild.exists() and bild.name == "probe_white_cover.jpg"
        assert not b.warnungen and not b.fehler
        b = Bericht()
        pb.cover_bild(_video(tmp, "black"), 1500, 3.0, b)
        assert any("fast schwarz" in w for w in b.warnungen)


def test_cover_ausserhalb_des_videos_ist_fehler():
    b = Bericht()
    assert pb.cover_bild(Path("egal.mp4"), 90000, 80.0, b) is None
    assert b.fehler
    b = Bericht()
    assert pb.cover_bild(Path("egal.mp4"), None, 80.0, b) is None
    assert not b.fehler and b.oks


if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    fehl = 0
    for n, f in tests:
        try:
            f()
            print(f"ok    {n}")
        except Exception as e:  # noqa: BLE001
            fehl += 1
            print(f"FEHL  {n}: {type(e).__name__}: {e}")
    print(f"{len(tests) - fehl} von {len(tests)} Tests grün")
    sys.exit(1 if fehl else 0)
