"""Tests für die Untertitel-Zuordnung in tts.py.  Aufruf: python3 -m unittest pipeline/test_tts.py"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from tts import anzeige_woerter


def gesprochen(satz):
    return [{"wort": w, "start": i * 1.0, "ende": i * 1.0 + 0.8} for i, w in enumerate(satz.split())]


class AnzeigeWoerter(unittest.TestCase):
    def test_zahl_deckt_ganzen_gesprochenen_block(self):
        w = anzeige_woerter("Stau 3,4 Kilometer.", gesprochen("Stau drei Komma vier Kilometer."))
        self.assertEqual([x["wort"] for x in w], ["Stau", "3,4", "Kilometer."])
        self.assertEqual((w[1]["start"], w[1]["ende"]), (1.0, 3.8))
        self.assertEqual(w[2]["start"], 4.0)  # folgendes Wort exakt, nicht verschoben

    def test_mehrere_anzeige_woerter_teilen_block(self):
        w = anzeige_woerter("GTA 6 kommt.", gesprochen("G T A sechs kommt."))
        self.assertEqual((w[0]["start"], w[1]["ende"]), (0.0, 3.8))
        self.assertEqual(w[2]["start"], 4.0)

    def test_gleiche_fassung_unveraendert(self):
        g = gesprochen("Ich hab's simuliert.")
        self.assertIs(anzeige_woerter("Ich hab's simuliert.", g), g)

    def test_anzeige_wort_ohne_gegenstueck_sitzt_in_luecke(self):
        w = anzeige_woerter("Paragraf 7 StVO", gesprochen("Paragraf StVO"))
        self.assertEqual((w[1]["start"], w[1]["ende"]), (0.8, 1.0))


if __name__ == "__main__":
    unittest.main()
