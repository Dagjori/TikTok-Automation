"""Tests für Hinweis 13 (Einstieg) in qc/referenz_pov.py. Aufruf: py -3 -m pytest pipeline/qc/referenz_pov_test.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from referenz_pov import einstieg  # noqa: E402


def anzeige(*paare):
    return [{"t": t, "typ": "anzeige", "wert": w, "etikett": "ENTFERNUNG"} for t, w in paare]


def ok(res):
    return {n: o for n, _, o in res}


def test_dichter_einstieg_besteht():
    ev = [{"t": 1.2, "typ": "effekt", "name": "wind"}] + anzeige((0, 100), (0.5, 100), (1.0, 99))
    res = einstieg(ev, {"kamera": [{"t": 6, "art": "schwenk"}]})
    assert ok(res) == {"Welteffekt": True, "Kamera": True, "Anzeige": True}


def test_ruhiger_einstieg_wie_sonne_naeher_faellt_auf():
    # Kamera ruht bis 19 s, erste Effekte ab 12,5 s, Anzeige steht bis 9 s (Lernschleife 03.11.)
    ev = [{"t": 12.5, "typ": "effekt", "name": "glanz"}] + anzeige((0, 5), (8.5, 5), (9.0, 6))
    res = einstieg(ev, {"lern_notizen": {"kamera": [{"t": 19, "art": "fahrt"}]}})
    assert ok(res) == {"Welteffekt": False, "Kamera": False, "Anzeige": False}


def test_bildanalyse_ersetzt_fehlenden_effekt_und_atmen_zaehlt_nicht():
    ev = [{"t": 0, "typ": "kamera", "art": "beben"}] + anzeige((0, 1), (0.5, 2))
    res = einstieg(ev, {"kamera": [{"t": 0, "art": "atmen"}]}, fenster=[(0.0, 3.1), (0.5, 1.0)])
    assert ok(res) == {"Welteffekt": True, "Kamera": False, "Anzeige": True}


# --- seit 07.11.2026 (REA-Regelwerk stelldirvor): Ereignis auf Countdown-Null, Statuszeile, gezielte Schnitte ---
from referenz_pov import ereignis_auf_null, statuszeile, szenenwechsel  # noqa: E402


def phasen(*teile):
    """teile = (etikett, [(t, wert, unter), …]) → Anzeige-Messpunkte."""
    return [{"t": t, "typ": "anzeige", "etikett": et, "wert": w, "zahl": str(w), "unter": u} for et, punkte in teile for t, w, u in punkte]


def test_countdown_bis_null_dann_ereignis_bei_8_s():
    an = phasen(("ANKUNFT IN", [(0, 8, "RUHIG"), (4, 4, "RUHIG"), (7.5, 0.5, "GLEICH")]), ("HÖHE", [(8.0, 0, "STEIGT"), (12, 40, "STEIGT")]))
    assert ereignis_auf_null(an) == (8.0, True)


def test_alter_ablauf_mit_ausloeser_bei_20_s_wird_erkannt():
    an = phasen(("ENTFERNUNG", [(0, 100, ""), (10, 90, ""), (19.5, 80, "")]), ("HÖHE", [(20.0, 1, "")]))
    t, null = ereignis_auf_null(an)
    assert t == 20.0 and null is False


def test_ohne_etikettwechsel_kein_ereignis():
    assert ereignis_auf_null(phasen(("JAHR", [(0, 1, ""), (5, 2, "")]))) == (None, False)


def test_statuszeile_zaehlt_wechsel():
    an = phasen(("A", [(0, 1, "RUHIG"), (1, 1, "RUHIG"), (2, 1, "UNRUHE"), (3, 1, "")]), ("B", [(4, 1, "FLUT"), (5, 1, "HIER")]))
    assert statuszeile(an) == (3, 4)


def test_szenenwechsel_vereint_protokoll_und_bild():
    prot = [{"t": 31.0, "typ": "schnitt", "grund": "Maßstabssprung"}]
    assert szenenwechsel(prot, [31.2, 60.1]) == [(31.0, "Maßstabssprung"), (60.1, None)]
    assert szenenwechsel([], None) == []


if __name__ == "__main__":  # ohne pytest: python3 qc/referenz_pov_test.py
    tests = [f for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    for f in tests:
        f()
        print("ok  ", f.__name__)
    print(f"{len(tests)} Tests ok")
