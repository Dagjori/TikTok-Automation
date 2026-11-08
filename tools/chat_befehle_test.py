"""Tests für die Regeln vom 08.11.2026 in tools/chat_befehle.py. Aufruf: python tools/chat_befehle_test.py (oder pytest)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import chat_befehle as cb  # noqa: E402
import testblock as tb  # noqa: E402


def test_klassiker_bis_3_nur_simulierbar():
    a1 = cb.ideen_befehl("simulierbar", format="json")
    a2 = cb.ideen_befehl("stelldirvor", format="json")
    assert "bis zu 3 von 10" in a1 and "höchstens 1 von 10, und nur" not in a1
    assert "Die fünf KLASSIKER" in a1                 # Ausnahme in der Anti-Liste
    assert "bis zu 3 von 10" not in a2 and "Sonne explodiert" in a2   # Account 2: Klassiker bleiben gesperrt


def test_weiterschicken_und_suchbegriff_in_beiden_ideen_befehlen():
    for k in ("simulierbar", "stelldirvor"):
        p = cb.ideen_befehl(k, format="json")
        assert "WÜRDE MAN DAS JEMANDEM SCHICKEN?" in p
        assert "SUCHBEGRIFF" in p
        assert '"weiterschicken"' in p and '"suchbegriff"' in p
        assert "Folgeteile eigener Treffer" in p


def test_folgeteil_block_nur_fuer_folgeteile():
    idee = {"titel": "Teil 2: Studium oder Ausbildung?", "typ": "folgeteil", "teil": 2, "serie": {"wurzel_titel": "Studium oder Ausbildung?"}}
    p = cb.code_skript_befehl("simulierbar", idee)
    assert "FOLGETEIL (diese Idee ist Teil 2" in p
    assert "kein „Folg für Teil 3“" in p
    assert "FOLGETEIL (" not in cb.code_skript_befehl("simulierbar", {"titel": "Pfand oder Müll?"})


def test_testblock_im_skript_befehl():
    b = tb.testbloecke("stelldirvor", "2026-11-10", "mittag")
    p = cb.code_skript_befehl("stelldirvor", {"titel": "Was wäre, wenn …?"}, testbloecke=b)
    assert '"testbloecke": {"folgen_hinweis": "mit", "einstieg_a2": "a"}' in p
    assert "Ereignis bei 2–3 s" in p
    assert "TESTBLOCK DIESES VIDEOS" not in cb.code_skript_befehl("stelldirvor", {"titel": "Was wäre, wenn …?"})


def test_kein_gesprochener_folgen_aufruf_mehr_im_format():
    a1 = cb.KONFIG["simulierbar"]["format"]
    assert "Folg mir, damit du nichts verpasst" not in a1
    assert "folgen_hinweis" in a1 and "folgen_hinweis" in cb.KONFIG["stelldirvor"]["format"]


def test_studio_vorlagen_behalten_platzhalter():
    for k in ("simulierbar", "stelldirvor"):
        v = cb.ideen_befehl(k, lernstand="{{LERNSTAND}}", bisher=["{{BISHER}}"], wunsch="", format="json")
        assert "{{LERNSTAND}}" in v and "- {{BISHER}}" in v and "{{ZUTATEN}}" in v


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
