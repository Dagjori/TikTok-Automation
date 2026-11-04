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
