#!/usr/bin/env python3
"""Tests für qc/massstab.py: Tempo-Profil „ben“ (seit 02.11.2026 abends), hörbare Satzpause (12d2), Stil-Prüfung 18b.

Aufruf (im Ordner pipeline/):  python3 qc/massstab_test.py
Die Tests bauen kleine Projekte mit künstlichen Wortzeiten in einem Temp-Ordner; sie brauchen weder Stimme noch Render.
Der ffmpeg-Test (silencedetect) wird übersprungen, wenn ffmpeg fehlt.
"""
import json
import math
import shutil
import struct
import sys
import tempfile
import unittest
import wave
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import massstab  # noqa: E402


def timing(anzahl, satzlaenge, wd=0.3, lk=0.06, sp=0.5):
    """Künstliche Wortzeiten: `anzahl` Wörter, je `satzlaenge` Wörter ein Satz; Wortdauer wd, Lücke im Satz lk, Pause nach Satzende sp."""
    woerter, t = [], 0.0
    for i in range(anzahl):
        ende_satz = (i + 1) % satzlaenge == 0 or i == anzahl - 1
        woerter.append({"wort": f"wort{i}" + ("." if ende_satz else ""), "start": round(t, 3), "ende": round(t + wd, 3)})
        t += wd + (sp if ende_satz else lk)
    ende = woerter[-1]["ende"]
    return {"dauer": round(ende + 0.8, 3), "segmente": [{"id": "hook", "text": "x", "start": 0.0, "ende": ende, "woerter": woerter}]}


def pruefe(profil="ben", stil="18 Dunkles Studio", szene="", skill=True, extra=None, **timing_args):
    """Baut ein Temp-Projekt und gibt die Prüfzeilen als {nr: Zeile} zurück."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        (p / "audio").mkdir()
        skript = {"konto": "simulierbar", "stil": stil, "segmente": [{"id": "hook", "phase": "hook", "text": "Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.", "sprechtext": ""}]}
        if skill:
            skript["skill"] = "simulierbar-video"
        (p / "skript.json").write_text(json.dumps(skript, ensure_ascii=False), encoding="utf-8")
        (p / "audio" / "timing.json").write_text(json.dumps(timing(**timing_args)), encoding="utf-8")
        (p / "szene.js").write_text(szene, encoding="utf-8")
        zeilen, _ = massstab.pruefe(p, profil, extra or {})
    return {z["nr"]: z for z in zeilen}


class TempoProfil(unittest.TestCase):
    def test_profil_werte(self):
        ben = massstab.PROFILE["ben"]
        self.assertEqual(ben["woerter"], (150, 190))
        self.assertEqual(ben["tempo"], (2.2, 2.5))
        self.assertEqual(ben["satzpause_median"], (0.35, 0.6))
        self.assertEqual(ben["satzpause_max"], 0.8)
        self.assertEqual(ben["laenge"], (65, 80))

    def test_altes_profil_bleibt_zum_nachmessen(self):
        alt = massstab.PROFILE["ben_alt"]
        self.assertEqual(alt["woerter"], (130, 170))
        self.assertEqual(alt["tempo"], (1.9, 2.4))
        self.assertNotIn("satzpause_median", alt)

    def test_ziel_ist_ca_2_3_wps_in_der_spanne(self):
        a, b = massstab.PROFILE["ben"]["tempo"]
        self.assertTrue(a < 2.3 < b)

    def test_gutes_tempo(self):
        z = pruefe(anzahl=168, satzlaenge=6)            # 168 Wörter, ca. 2,32 W/s, ca. 72 s
        self.assertTrue(z["12a"]["ok"], z["12a"]["ist"])
        self.assertTrue(z["12b"]["ok"], z["12b"]["ist"])
        self.assertTrue(z["12f"]["ok"], z["12f"]["ist"])

    def test_untere_und_obere_wortgrenze(self):
        for anzahl, erwartet in ((149, False), (150, True), (190, True), (191, False)):
            with self.subTest(anzahl=anzahl):
                self.assertEqual(pruefe(anzahl=anzahl, satzlaenge=6)["12a"]["ok"], erwartet)

    def test_zu_wenig_woerter_nach_altem_profil_ok_nach_neuem_nicht(self):
        neu = pruefe(anzahl=140, satzlaenge=5, sp=0.6)   # 140 Wörter bei ca. 2,14 W/s: altes Ben-Profil ja, neues nein
        alt = pruefe(profil="ben_alt", anzahl=140, satzlaenge=5, sp=0.6)
        self.assertFalse(neu["12a"]["ok"])
        self.assertFalse(neu["12b"]["ok"])
        self.assertTrue(alt["12a"]["ok"])
        self.assertTrue(alt["12b"]["ok"])

    def test_zu_langsam_und_zu_schnell(self):
        langsam = pruefe(anzahl=168, satzlaenge=6, sp=1.2)
        schnell = pruefe(anzahl=168, satzlaenge=6, wd=0.22, lk=0.04, sp=0.3)
        self.assertFalse(langsam["12b"]["ok"], langsam["12b"]["ist"])
        self.assertFalse(schnell["12b"]["ok"], schnell["12b"]["ist"])
        self.assertFalse(langsam["12d"]["ok"])           # Satzpause über 0,8 s bleibt Pflichtverstoß

    def test_extra_ziel_ueberschreibt_profil(self):
        z = pruefe(anzahl=168, satzlaenge=6, extra={"woerter": (100, 120)})
        self.assertFalse(z["12a"]["ok"])


class SatzpauseHoerbar(unittest.TestCase):
    WOERTER = [{"wort": "a.", "start": 0.0, "ende": 1.0}, {"wort": "b", "start": 1.04, "ende": 1.5},
               {"wort": "c?", "start": 1.6, "ende": 2.0}, {"wort": "d", "start": 2.05, "ende": 2.5}]

    def test_stillen_werden_den_satzenden_zugeordnet(self):
        werte = massstab.satzpausen_hoerbar(self.WOERTER, [(0.85, 1.27), (2.0, 2.3)])
        self.assertEqual(len(werte), 2)
        self.assertAlmostEqual(werte[0], 0.42, places=2)
        self.assertAlmostEqual(werte[1], 0.3, places=2)

    def test_ohne_stille_ist_die_pause_null(self):
        self.assertEqual(massstab.satzpausen_hoerbar(self.WOERTER, []), [0.0, 0.0])

    def test_fenster_nimmt_nur_stillen_in_der_naehe(self):
        werte = massstab.satzpausen_hoerbar(self.WOERTER, [(5.0, 6.0)])
        self.assertEqual(werte, [0.0, 0.0])

    def test_hinweis_12d2_mit_gepatchter_stille(self):
        with mock.patch.object(massstab, "stille_im_audio", return_value=None):
            z = pruefe(anzahl=168, satzlaenge=6)
        self.assertFalse(z["12d2"]["ok"])
        self.assertFalse(z["12d2"]["pflicht"])           # nur Hinweis
        self.assertIn("nicht messbar", z["12d2"]["ist"])
        # Stille 0,5 s nach jedem Satzende: im Richtwert
        t = timing(anzahl=168, satzlaenge=6)["segmente"][0]["woerter"]
        gut = [(w["ende"], w["ende"] + 0.5) for w in t if w["wort"].endswith(".")]
        kurz = [(w["ende"], w["ende"] + 0.2) for w in t if w["wort"].endswith(".")]
        with mock.patch.object(massstab, "stille_im_audio", return_value=gut):
            self.assertTrue(pruefe(anzahl=168, satzlaenge=6)["12d2"]["ok"])
        with mock.patch.object(massstab, "stille_im_audio", return_value=kurz):
            z = pruefe(anzahl=168, satzlaenge=6)
            self.assertFalse(z["12d2"]["ok"])
            self.assertFalse(z["12d2"]["pflicht"])

    def test_profil_massstab_hat_keine_hoerpause(self):
        self.assertNotIn("12d2", pruefe(profil="massstab", anzahl=190, satzlaenge=6, wd=0.22, lk=0.04, sp=0.26))

    @unittest.skipIf(shutil.which("ffmpeg") is None, "ffmpeg fehlt")
    def test_stille_im_audio_mit_ffmpeg(self):
        rate = 16000
        def ton(sekunden):
            return [int(8000 * math.sin(2 * math.pi * 440 * i / rate)) for i in range(int(sekunden * rate))]
        proben = ton(1.0) + [0] * int(0.4 * rate) + ton(1.0) + [0] * int(0.2 * rate) + ton(1.0)
        with tempfile.TemporaryDirectory() as tmp:
            pfad = Path(tmp) / "stimme.wav"
            with wave.open(str(pfad), "wb") as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(rate)
                w.writeframes(struct.pack("<%dh" % len(proben), *proben))
            stillen = massstab.stille_im_audio(pfad)
        self.assertEqual(len(stillen), 2)
        self.assertAlmostEqual(stillen[0][1] - stillen[0][0], 0.4, delta=0.05)
        self.assertAlmostEqual(stillen[1][1] - stillen[1][0], 0.2, delta=0.05)

    def test_stille_im_audio_ohne_datei(self):
        self.assertIsNone(massstab.stille_im_audio(Path("/gibt/es/nicht.mp3")))


class StilPruefung18b(unittest.TestCase):
    def test_alle_erlaubten_stile(self):
        for nr in list(range(1, 16)) + list(range(17, 22)):
            with self.subTest(stil=nr):
                z = pruefe(stil=f"{nr} Irgendein Stil (Begründung)", anzahl=168, satzlaenge=6)["18b"]
                self.assertTrue(z["ok"], z["ist"])
                self.assertTrue(z["pflicht"])

    def test_stil_16_und_ausserhalb_sind_nicht_erlaubt(self):
        for stil in ("16 Lunar-POV", "22 Neu", "0 Null", "Studio ohne Nummer", ""):
            with self.subTest(stil=stil):
                self.assertFalse(pruefe(stil=stil, anzahl=168, satzlaenge=6)["18b"]["ok"])

    def test_einschub_nach_dem_hauptstil_ist_ok(self):
        z = pruefe(stil="1 Low-Poly-Miniatur + 13 Blaupause als Szenenwechsel für „Warum?“", anzahl=168, satzlaenge=6)["18b"]
        self.assertTrue(z["ok"])

    def test_alte_stilmodule_sind_wieder_erlaubt(self):
        szene = 'import { papier } from "../../engine/stil_collage.js";\nimport { figur } from "../../engine/stil_clay_welt.js";\nimport iso from "../../engine/iso.js";'
        z = pruefe(stil="6 Papier-Collage", szene=szene, anzahl=168, satzlaenge=6)["18b"]
        self.assertTrue(z["ok"], z["ist"])

    def test_account2_module_sind_nicht_erlaubt(self):
        for modul in ("stil_lunar_pov.js", "lunar_hud.js", "welt_grossstadt_dach.js"):
            with self.subTest(modul=modul):
                z = pruefe(stil="18 Studio", szene=f'import x from "../../engine/{modul}";', anzahl=168, satzlaenge=6)["18b"]
                self.assertFalse(z["ok"])
                self.assertIn("Account-2-Module", z["ist"])

    def test_pflicht_nur_nach_skill(self):
        mit = pruefe(stil="3 Clay", anzahl=168, satzlaenge=6)["18b"]
        ohne = pruefe(stil="Keine Nummer", skill=False, anzahl=168, satzlaenge=6)["18b"]
        self.assertTrue(mit["pflicht"])
        self.assertFalse(ohne["pflicht"])
        mit_szene = pruefe(stil="Keine Nummer", skill=False, szene='import { SimBuehne } from "../../engine/sim_atmosphaere.js";', anzahl=168, satzlaenge=6)["18b"]
        self.assertTrue(mit_szene["pflicht"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
