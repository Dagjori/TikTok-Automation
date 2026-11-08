"""Tests für tools/testblock.py (Zählung der Testblöcke). Aufruf: python tools/testblock_test.py (oder pytest)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import testblock as tb  # noqa: E402

PLAN = {"tests": [
    {"id": "folgen_hinweis", "konten": ["simulierbar", "stelldirvor"], "start": "2026-11-10", "block": 10, "folge": ["mit", "ohne"], "wiederholen": True},
    {"id": "einstieg_a2", "konten": ["stelldirvor"], "start": "2026-11-10", "block": 5, "folge": ["a", "b", "c"], "wiederholen": False, "danach": "standard"},
]}


def v(konto, datum, slot):
    return tb.fuer_skript(tb.testbloecke(konto, datum, slot, PLAN))


def test_vor_dem_start_kein_test():
    assert v("simulierbar", "2026-11-09", "abend") == {}


def test_index_zaehlt_zwei_videos_je_tag():
    assert tb.index("2026-11-10", "mittag", "2026-11-10") == 0
    assert tb.index("2026-11-10", "abend", "2026-11-10") == 1
    assert tb.index("2026-11-14", "abend", "2026-11-10") == 9
    assert tb.index("2026-11-09", "abend", "2026-11-10") == -1


def test_folgen_hinweis_10_mit_dann_10_ohne_dann_wieder_mit():
    assert v("simulierbar", "2026-11-10", "mittag") == {"folgen_hinweis": "mit"}
    assert v("simulierbar", "2026-11-14", "abend") == {"folgen_hinweis": "mit"}      # Video 10
    assert v("simulierbar", "2026-11-15", "mittag") == {"folgen_hinweis": "ohne"}    # Video 11
    assert v("simulierbar", "2026-11-19", "abend") == {"folgen_hinweis": "ohne"}     # Video 20
    assert v("simulierbar", "2026-11-20", "mittag") == {"folgen_hinweis": "mit"}     # Video 21: nächster Block


def test_einstieg_a2_a_b_c_je_5_dann_standard():
    folge = [v("stelldirvor", d, s)["einstieg_a2"] for d in ("2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17") for s in ("mittag", "abend")]
    assert folge[:15] == ["a"] * 5 + ["b"] * 5 + ["c"] * 5
    assert folge[15] == "standard"


def test_einstieg_nur_fuer_account_2_und_aliase():
    assert "einstieg_a2" not in v("simulierbar", "2026-11-10", "mittag")
    assert v("acc2", "2026-11-10", "mittag") == v("stelldirvor.pov", "2026-11-10", "mittag") == {"folgen_hinweis": "mit", "einstieg_a2": "a"}


def test_position_im_block_und_anweisungen():
    b = tb.testbloecke("stelldirvor", "2026-11-12", "abend", PLAN)   # Index 5
    assert b["einstieg_a2"]["block_nr"] == 2 and b["einstieg_a2"]["nr_im_block"] == 1
    plan = dict(PLAN, tests=[dict(t, varianten={"mit": "Hinweis am Ende", "ohne": "-", "a": "-", "b": "zweite Stufe 12–15 s", "c": "-"}) for t in PLAN["tests"]])
    z = tb.anweisungen("stelldirvor", b, plan)
    assert any(x.startswith("einstieg_a2 = b (Block 2, Video 1 von 5): zweite Stufe") for x in z)


def test_fehler_bei_unbekanntem_konto_oder_slot():
    for args in (("x", "2026-11-10", "mittag"), ("simulierbar", "2026-11-10", "nachts")):
        try:
            tb.testbloecke(*args, PLAN)
        except ValueError:
            continue
        raise AssertionError(f"kein Fehler für {args}")


def test_echter_plan_ist_gueltig():
    plan = tb.plan_laden()
    ids = {t["id"] for t in plan["tests"]}
    assert ids == {"folgen_hinweis", "einstieg_a2"}
    for t in plan["tests"]:
        assert set(t["folge"]) <= set(t["varianten"])
    assert tb.fuer_skript(tb.testbloecke("stelldirvor", "2026-11-10", "mittag", plan)) == {"folgen_hinweis": "mit", "einstieg_a2": "a"}


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
