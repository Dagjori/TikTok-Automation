"""Tests für die Regeln vom 08.11. und 09.11.2026 in tools/chat_befehle.py. Aufruf: python tools/chat_befehle_test.py (oder pytest)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import chat_befehle as cb  # noqa: E402
import testblock as tb  # noqa: E402


def test_themen_regeln_vom_0911():
    """Entscheidung 09.11.2026: Nachfrage-Pflicht, Winkel Pflicht, Duell keine Pflicht, stark gesuchte Themen geöffnet."""
    a1 = cb.ideen_befehl("simulierbar", format="json")
    a2 = cb.ideen_befehl("stelldirvor", format="json")
    for p in (a1, a2):
        assert "NACHFRAGE (Pflicht seit 09.11.2026" in p
        assert "suggestqueries.google.com/complete/search?client=firefox&hl=de&gl=de&q=" in p and "&ds=yt" in p
        assert "WINKEL-WERKZEUGE" in p and "SUCHSTÄMME" in p
        assert "20 naheliegendsten Ideen" in p
        assert "freiwillige Startpunkte" in p          # Zutaten sind kein Zwang mehr
        assert "Unter 14 Punkten nicht vorschlagen" in p
        for feld in ('"nachfrage"', '"winkel"', '"vermeidet"', '"punkte"', '"zutat"', '"originalitaet"'):
            assert feld in p, feld
    assert "ein Duell ist seit 09.11.2026 keine Pflicht mehr" in a1
    assert "Duell | Zeitverlauf | Was bleibt | Lernvideo" in a1 and "höchstens 5 Duelle" in a1
    assert "Jede Idee braucht ein Duell" not in a1 and "bis zu 3 von 10" not in a1 and "Die fünf KLASSIKER" not in a1
    assert "Rente, Steuererklärung, Kindergeld, Grundsicherung" in a1 and "Parteipolitik" in a1
    assert "Kindergeld, was ein Kind kostet" not in a1   # alte Sperrliste ist weg
    for feld in ('"format"', '"tipp"', '"zweite_frage"', '"ergebnis_ansatz"', '"alternativen"', '"hook"', '"warum_relevant"'):
        assert feld in a1, feld
    assert "Körper und Leben" in a2 and "was passiert wenn man" in a2 and "Sonne explodiert" in a2
    assert "Fasten- oder Schlafentzug als Anleitung" in a2
    assert "höchstens 5 Duelle" not in a2
    for feld in ('"ereignis"', '"messgroesse"', '"hoehepunkt"', '"pointe"', '"massstab"', '"leitbild"'):
        assert feld in a2, feld
    assert "LEITBILD WECHSELN" in a2 and "höchstens 1 von 4" in a2   # Vorschlag Leitmotiv wechseln, 11.11.2026
    assert "LEITBILD WECHSELN" not in a1
    s2 = cb.skript_befehl("stelldirvor", "{{IDEEN}}", format="json")
    assert "„Teil 2 im Profil“), kein Tausch" not in s2 and "nie einen Folgeteil an" in s2


def test_skript_aufbau_und_textformat_vom_0911():
    """Kein Sprechtempo mehr; neuer Aufbau; Sprechtext ohne Auslassungspunkte, Gedankenstriche, GROSS-Wörter und Tags."""
    a1 = cb.skript_befehl("simulierbar", "{{IDEEN}}", format="json")
    for weg in ("Wörtern pro Sekunde", "2,3 bis 2,7", "Sätze meist 3 bis 5 Wörter", "[curious]", "[thoughtful]", "KNAPP",
                "Auslassungspunkte „…“", "Gedankenstrich „ – “", "REGIE-TEXT", "großgeschriebenes Wort pro Satz"):
        assert weg not in a1, weg
    for da in ("meist 4 bis 10 Wörter", "Richtwert für die Länge, keine Sperre", "keine Tempo-, Silben- oder Pausenvorgaben",
               "regeln (3 bis 8 s): Die Zähler laufen schon", "wendung1 (12 bis 15 s)", "ZWEITE FRAGE",
               "ergebnis (bei ca. 75 bis 80 % der Länge)", "pointe (die letzten 6 s): löst die zweite Frage auf",
               "TEXTFORMAT FÜR DIE STIMME", "Kein Wort in Großbuchstaben", "Verboten: Auslassungspunkte, Gedankenstriche als Pause",
               "SELBSTPRÜFUNG"):
        assert da in a1, da
    for feld in ('"format"', '"nachfrage"', '"offene_frage"', '"aufloesung"', '"zweite_frage"', '"gesetzt_in"', '"segmente"',
                 '"sprechtext"', '"woerter"', '"laender"', '"folgen_hinweis"', '"selbstpruefung"'):
        assert feld in a1, feld
    a2 = cb.skript_befehl("stelldirvor", "{{IDEEN}}", format="json")
    assert "TEXTFORMAT FÜR DIE STIMME" not in a2 and "12 bis 18 kursive Sätze" in a2   # Account 2 bleibt stumm, Aufbau unverändert
    assert '"nachfrage"' in a2 and '"anzeige_plan"' in a2 and '"saetze"' in a2


def test_json_formen_sind_gueltig_und_datum():
    import json
    for k in cb.KONFIG:
        assert len(json.loads(cb.KONFIG[k]["ideen_json"])["ideen"]) == 1
        assert len(json.loads(cb.KONFIG[k]["skript_json"])["skripte"]) == 1
    assert cb.DATUM == "2026-11-09"
    assert "1-Skripterstellung" in Path(cb.__file__).read_text(encoding="utf-8")


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
