#!/usr/bin/env python3
"""Welcher Testblock gilt für ein Video? (Wahl des Inhabers 08.11.2026; Plan in data/tests/testbloecke.json)

Aufruf:  python tools/testblock.py --konto simulierbar|stelldirvor --datum JJJJ-MM-TT --slot mittag|abend [--json]
Ausgabe: je laufendem Test die Variante (z. B. folgen_hinweis = mit, einstieg_a2 = c) und was das für den Bau heißt.
         Die Produktion trägt das Ergebnis in skript.json ein: "testbloecke": {"folgen_hinweis": "mit", "einstieg_a2": "c"};
         qc/massstab.py und qc/referenz_pov.py prüfen danach.
Zählung: je Account 2 Videos pro Video-Tag, Index = 2 × (Tage seit Start) + (0 mittag, 1 abend), Block = Index ÷ Blockgröße.
         Kein Speicherstand: jeder Rechner und jede Sitzung kommt zum selben Ergebnis; fällt ein Video aus, wird der Block kürzer.
Tests:   python tools/testblock_test.py
"""
import argparse
import datetime
import json
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
PLAN = WURZEL / "data" / "tests" / "testbloecke.json"
SLOTS = ("mittag", "abend")
KONTEN = ("simulierbar", "stelldirvor")
KONTO_ALIAS = {"acc1": "simulierbar", "acc2": "stelldirvor", "stelldirvor.pov": "stelldirvor"}


def plan_laden(pfad=PLAN):
    return json.loads(Path(pfad).read_text(encoding="utf-8"))


def konto_name(konto):
    k = KONTO_ALIAS.get(konto, konto)
    if k not in KONTEN:
        raise ValueError(f"Unbekanntes Konto „{konto}“ (simulierbar oder stelldirvor)")
    return k


def index(datum, slot, start):
    """Laufende Nummer des Videos im Test (0 = erstes Video am Starttag mittags); negativ = vor dem Start."""
    if slot not in SLOTS:
        raise ValueError(f"Unbekannter Slot „{slot}“ (mittag oder abend)")
    tage = (datetime.date.fromisoformat(datum) - datetime.date.fromisoformat(start)).days
    return 2 * tage + SLOTS.index(slot)


def variante(test, datum, slot):
    """Variante eines Tests für ein Video oder None (vor dem Start). Ohne Wiederholung nach dem letzten Block: test["danach"]."""
    i = index(datum, slot, test["start"])
    if i < 0:
        return None
    nr = i // test["block"]
    folge = test["folge"]
    if nr >= len(folge) and not test.get("wiederholen"):
        return {"variante": test.get("danach", "standard"), "block_nr": nr + 1, "nr_im_block": None, "index": i, "beendet": True}
    return {"variante": folge[nr % len(folge)], "block_nr": nr + 1, "nr_im_block": i % test["block"] + 1, "index": i, "beendet": False}


def testbloecke(konto, datum, slot, plan=None):
    """{test_id: {variante, block_nr, nr_im_block, index, beendet}} für alle Tests des Kontos, die schon laufen."""
    plan = plan or plan_laden()
    k = konto_name(konto)
    erg = {}
    for t in plan["tests"]:
        if k not in t["konten"]:
            continue
        v = variante(t, datum, slot)
        if v:
            erg[t["id"]] = v
    return erg


def fuer_skript(bloecke):
    """Kurzform für skript.json → testbloecke (nur die Variante je Test)."""
    return {tid: b["variante"] for tid, b in bloecke.items()}


def anweisungen(konto, bloecke, plan=None):
    """Was die Variante für Skript und Bau heißt (Text aus dem Plan)."""
    plan = plan or plan_laden()
    tests = {t["id"]: t for t in plan["tests"]}
    zeilen = []
    for tid, b in bloecke.items():
        t = tests[tid]
        text = t.get("varianten", {}).get(b["variante"], "")
        pos = f"Block {b['block_nr']}, Video {b['nr_im_block']} von {t['block']}" if b["nr_im_block"] else "Test beendet"
        zeilen.append(f"{tid} = {b['variante']} ({pos}): {text}")
    return zeilen


def main(argv=None):
    ap = argparse.ArgumentParser(description="Testblock eines Videos bestimmen (data/tests/testbloecke.json).")
    ap.add_argument("--konto", required=True, help="simulierbar | stelldirvor (auch acc1, acc2, stelldirvor.pov)")
    ap.add_argument("--datum", required=True, help="Video-Tag JJJJ-MM-TT (Posting-Tag, nicht Produktionstag)")
    ap.add_argument("--slot", required=True, choices=SLOTS)
    ap.add_argument("--json", action="store_true", help="nur JSON ausgeben")
    a = ap.parse_args(argv)
    plan = plan_laden()
    b = testbloecke(a.konto, a.datum, a.slot, plan)
    if a.json:
        print(json.dumps({"testbloecke": fuer_skript(b), "details": b, "anweisungen": anweisungen(a.konto, b, plan)}, ensure_ascii=False, indent=1))
        return 0
    if not b:
        print(f"{konto_name(a.konto)} {a.datum} {a.slot}: kein Test läuft (vor dem Start). In skript.json: \"testbloecke\": {{}}")
        return 0
    print(f"{konto_name(a.konto)} {a.datum} {a.slot}:")
    for z in anweisungen(a.konto, b, plan):
        print(f"- {z}")
    print("In skript.json eintragen: \"testbloecke\": " + json.dumps(fuer_skript(b), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
