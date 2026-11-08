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


# --- seit 08.11.2026 (Wahl des Inhabers): Testblöcke einstieg_a2 a/b/c und Folgen-Hinweis im Abspann ---
import contextlib  # noqa: E402
import io  # noqa: E402
import json  # noqa: E402
import tempfile  # noqa: E402
import referenz_pov  # noqa: E402
from referenz_pov import skala, laenge_ziel, ereignis_fenster, zweite_stufe, folgen_hinweis_a2  # noqa: E402


def test_skala_wie_engine_lpSkala():
    assert skala(8, 66) == 8 and skala(10, 66) == 10
    assert round(skala(60, 66), 2) == 48.33
    assert skala(70, 66) == 56 and skala(80, 66) == 66
    assert all(skala(t, 80) == t for t in (0, 8, 33.3, 60, 72, 80))


def test_laenge_und_ereignisfenster_je_testblock():
    assert laenge_ziel({})[:2] == (79.5, 80.5)
    assert laenge_ziel({"einstieg_a2": "c"})[:2] == (61.5, 70.5)
    assert ereignis_fenster({"einstieg_a2": "a"}) == (1.5, 3.5)
    assert ereignis_fenster({"einstieg_a2": "b"}) == ereignis_fenster(None) == (6.0, 11.0)


def test_zweite_stufe_in_12_bis_15_s():
    an = phasen(("IN", [(0, 8, "RUHIG"), (7.5, 0.5, "RUHIG")]), ("PEGEL", [(8.0, 1, "STEIGT"), (11.5, 3, "STEIGT"), (13.0, 5, "UFER WEG")]))
    assert zweite_stufe(an, 8.0) == 13.0
    ohne = phasen(("IN", [(0, 8, "RUHIG"), (7.5, 0.5, "RUHIG")]), ("PEGEL", [(8.0, 1, "STEIGT"), (13.0, 5, "STEIGT"), (16.0, 9, "UFER WEG")]))
    assert zweite_stufe(ohne, 8.0) is None


def test_folgen_hinweis_im_abspann():
    h = [{"t": 74.2, "typ": "folgen_hinweis", "text": "Morgen: der Golfstrom stoppt"}]
    assert folgen_hinweis_a2(h, {"folgen_hinweis": "mit"}, 80.0)[1] is True
    assert folgen_hinweis_a2([], {"folgen_hinweis": "mit"}, 80.0)[1] is False
    assert folgen_hinweis_a2(h, {"folgen_hinweis": "ohne"}, 80.0)[1] is False
    assert folgen_hinweis_a2([], {}, 80.0)[1] is True
    assert folgen_hinweis_a2([{"t": 60.0, "typ": "folgen_hinweis", "text": "Teil 2 im Profil"}], {"folgen_hinweis": "mit"}, 80.0)[1] is False
    assert "Druck" in folgen_hinweis_a2([{"t": 74.2, "typ": "folgen_hinweis", "text": "Folg mir für Teil 2"}], {"folgen_hinweis": "mit"}, 80.0)[0]


def protokoll(L=80.0, t_ereignis=8.0, stufe2=None, hinweis=None):
    """Vollständiges Ereignis-Protokoll eines regelgerechten Videos der Länge L (wie LunarHUD.ereignisse())."""
    ev = [{"t": 0.4, "typ": "titel", "dauer": 4.0, "text": "Was wäre, wenn …?"}, {"t": 1.0, "typ": "effekt", "name": "wind"}]
    t, hier = 0.0, skala(59, L)
    while t <= L - 10.8 + 1e-6:
        if t < t_ereignis:
            a = {"etikett": "IN", "wert": round(t_ereignis - t, 2), "unter": "RUHIG"}
        elif t >= hier:
            a = {"etikett": "LAGE", "wert": 0, "zahl": "HIER", "unter": "HIER"}
        elif t >= skala(30, L):
            a = {"etikett": "TIEFE", "wert": round(t, 2), "unter": "FLUT"}
        else:
            a = {"etikett": "PEGEL", "wert": round(t, 2), "unter": "STUFE 2" if stufe2 and t >= stufe2 else "STEIGT"}
        a.setdefault("zahl", str(a["wert"]))
        ev.append({"t": round(t, 2), "typ": "anzeige", **a})
        t += 0.5
    s0, ende = 5.0, L - 10
    schritt = (ende - s0) / 14
    ev += [{"t": round(s0 + i * schritt, 2), "typ": "satz", "dauer": round(schritt - 0.3, 2), "text": "Ein ruhiger Satz mit Wörtern.", "woerter": 5} for i in range(14)]
    ev += [{"t": L - 10, "typ": "abblende", "dauer": 2.0}, {"t": L - 8, "typ": "abspann", "dauer": 8.0, "text": "Was wäre, wenn …?", "fakt": "ORT · FAKT"}]
    if hinweis:
        ev.append({"t": L - 5.8, "typ": "folgen_hinweis", "dauer": 5.8, "text": hinweis})
    return {"dauer": L, "ereignisse": ev}


def pruefe_pov(prot, testbloecke=None):
    """Führt referenz_pov.main auf einem Temp-Projekt aus (ohne MP4) und liefert {nr: ok}."""
    with tempfile.TemporaryDirectory() as tmp:
        wurzel = Path(tmp)
        (wurzel / "out" / "probe").mkdir(parents=True)
        (wurzel / "projekte" / "probe").mkdir(parents=True)
        (wurzel / "out" / "probe" / "ereignisse.json").write_text(json.dumps(prot), encoding="utf-8")
        (wurzel / "projekte" / "probe" / "skript.json").write_text(json.dumps({"zeitraffer": "keiner", **({"testbloecke": testbloecke} if testbloecke else {})}), encoding="utf-8")
        alt, alt_argv = referenz_pov.WURZEL, sys.argv
        referenz_pov.WURZEL, sys.argv = wurzel, ["referenz_pov.py", str(wurzel / "projekte" / "probe"), "--json"]
        aus = io.StringIO()
        try:
            with contextlib.redirect_stdout(aus):
                try:
                    referenz_pov.main()
                except SystemExit:
                    pass
        finally:
            referenz_pov.WURZEL, sys.argv = alt, alt_argv
    return {r["nr"]: r["ok"] for r in json.loads(aus.getvalue().strip().splitlines()[-1])}


ZEITPUNKTE = ("1", "3", "3c", "3d", "4", "4e", "5", "6", "6b", "6c", "14", "16")


def test_standard_80_s_besteht_alle_zeitpunkte():
    r = pruefe_pov(protokoll(80.0))
    assert {n: r[n] for n in ZEITPUNKTE} == {n: True for n in ZEITPUNKTE}


def test_testblock_c_66_s_besteht_nur_mit_testblock():
    r = pruefe_pov(protokoll(66.0), {"einstieg_a2": "c", "folgen_hinweis": "ohne"})
    assert {n: r[n] for n in ZEITPUNKTE} == {n: True for n in ZEITPUNKTE}
    ohne_block = pruefe_pov(protokoll(66.0))
    assert ohne_block["1"] is False               # 66 s ist nur im Testblock c erlaubt


def test_testblock_a_ereignis_bei_2_5_s():
    assert pruefe_pov(protokoll(80.0, t_ereignis=2.5), {"einstieg_a2": "a"})["14"] is True
    assert pruefe_pov(protokoll(80.0, t_ereignis=2.5))["14"] is False
    assert pruefe_pov(protokoll(80.0), {"einstieg_a2": "a"})["14"] is False


def test_testblock_b_zweite_stufe_ist_pflicht():
    assert pruefe_pov(protokoll(80.0, stufe2=13.0), {"einstieg_a2": "b"})["14c"] is True
    assert pruefe_pov(protokoll(80.0), {"einstieg_a2": "b"})["14c"] is False
    assert "14c" not in pruefe_pov(protokoll(80.0))


def test_folgen_hinweis_nur_im_testblock_mit():
    mit = protokoll(80.0, hinweis="Morgen: der Golfstrom stoppt")
    assert pruefe_pov(mit, {"folgen_hinweis": "mit"})["16"] is True
    assert pruefe_pov(mit, {"folgen_hinweis": "ohne"})["16"] is False
    assert pruefe_pov(protokoll(80.0), {"folgen_hinweis": "mit"})["16"] is False
    assert pruefe_pov(mit, {"folgen_hinweis": "mit"})["5"] is True     # Hinweis ist kein verbotener Folgen-Aufruf


if __name__ == "__main__":  # ohne pytest: python3 qc/referenz_pov_test.py
    tests = [f for n, f in sorted(globals().items()) if n.startswith("test_") and callable(f)]
    for f in tests:
        f()
        print("ok  ", f.__name__)
    print(f"{len(tests)} Tests ok")
