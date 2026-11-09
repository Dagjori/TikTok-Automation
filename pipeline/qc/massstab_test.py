#!/usr/bin/env python3
"""Tests für qc/massstab.py: Richtwerte ohne Tempo-Regeln (Entscheidung des Inhabers 09.11.2026: 12b, 12d, 12d2, 12e und die
Tempo-Profile sind entfernt; Hook-Zeit, Wortzahl, Satzlängen, Länge 65–80 s und Endstand sind nur noch Hinweis; Pflicht bleibt
die Mindestlänge 61 s), Stil-Prüfung 18b und die Regeln aus dem REA-Regelwerk (Schlusskarte, Untertitel-Blöcke, R1–R7).

Aufruf (im Ordner pipeline/):  python3 qc/massstab_test.py
Die Tests bauen kleine Projekte mit künstlichen Wortzeiten in einem Temp-Ordner; sie brauchen weder Stimme noch Render.
"""
import contextlib
import io
import json
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import massstab  # noqa: E402


def timing(anzahl, satzlaenge, wd=0.3, lk=0.06, sp=0.5, wort="wort"):
    """Künstliche Wortzeiten: `anzahl` Wörter, je `satzlaenge` Wörter ein Satz; Wortdauer wd, Lücke im Satz lk, Pause nach Satzende sp."""
    woerter, t = [], 0.0
    for i in range(anzahl):
        ende_satz = (i + 1) % satzlaenge == 0 or i == anzahl - 1
        woerter.append({"wort": f"{wort}{i}" + ("." if ende_satz else ""), "start": round(t, 3), "ende": round(t + wd, 3)})
        t += wd + (sp if ende_satz else lk)
    ende = woerter[-1]["ende"]
    return {"dauer": round(ende + 0.8, 3), "segmente": [{"id": "hook", "text": "x", "start": 0.0, "ende": ende, "woerter": woerter}]}


def pruefe(profil="ben", stil="18 Dunkles Studio", szene="", skill="video-produktion", extra=None, segmente=None,
           ereignisse=None, timing_json=None, testbloecke=None, **timing_args):
    """Baut ein Temp-Projekt und gibt die Prüfzeilen als {nr: Zeile} zurück.
    ereignisse: {"dauer": …, "ereignisse": [...], "massstab": {...}} wird als audio/ereignisse.json geschrieben (mit protokoll: true)."""
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)
        (p / "audio").mkdir()
        skript = {"konto": "simulierbar", "stil": stil,
                  "segmente": segmente or [{"id": "hook", "phase": "hook", "text": "Am Ende zählt die Zeit.", "sprechtext": ""}]}
        if testbloecke is not None:
            skript["testbloecke"] = testbloecke
        if skill:
            skript["skill"] = "simulierbar-video" if skill is True else skill
        (p / "skript.json").write_text(json.dumps(skript, ensure_ascii=False), encoding="utf-8")
        (p / "audio" / "timing.json").write_text(json.dumps(timing_json or timing(**timing_args)), encoding="utf-8")
        if ereignisse is not None:
            (p / "audio" / "ereignisse.json").write_text(json.dumps({"protokoll": True, **ereignisse}, ensure_ascii=False), encoding="utf-8")
        (p / "szene.js").write_text(szene, encoding="utf-8")
        zeilen, _ = massstab.pruefe(p, profil, extra or {})
    return {z["nr"]: z for z in zeilen}


def segment_timing(gesamt=70.0, **starts):
    """Timing mit benannten Segmenten: starts = {"ergebnis": 56.0, …}; je Segment ein Satz aus zwei Wörtern."""
    segmente, ids = [], [("hook", 0.05)] + sorted(starts.items(), key=lambda x: x[1])
    for i, (sid, start) in enumerate(ids):
        ende = (ids[i + 1][1] - 0.3) if i + 1 < len(ids) else gesamt - 1.0
        segmente.append({"id": sid, "text": "x", "start": start, "ende": ende,
                         "woerter": [{"wort": "endstand" if sid == "ergebnis" else "zwei", "start": start, "ende": start + 0.4},
                                     {"wort": "worte.", "start": start + 0.5, "ende": start + 0.9}]})
    return {"dauer": gesamt, "segmente": segmente}


class OhneTempoRegeln(unittest.TestCase):
    """Entscheidung des Inhabers 09.11.2026: keine Sprechtempo-Regeln mehr, das Video folgt der Stimme."""

    def test_profil_ohne_tempo_werte(self):
        self.assertEqual(list(massstab.PROFILE), ["ben"])
        ben = massstab.PROFILE["ben"]
        self.assertEqual(ben["woerter"], (150, 190))
        self.assertEqual(ben["satzlaenge_median"], (3, 5))
        self.assertEqual(ben["laenge"], (65, 80))
        self.assertEqual(ben["laenge_min"], 61.0)
        for alt in ("tempo", "silben", "satzpause_max", "satzpause_median"):
            self.assertNotIn(alt, ben)
        for name in ("silben", "stille_im_audio", "satzpausen_hoerbar"):
            self.assertFalse(hasattr(massstab, name), name)

    def test_tempo_und_pausen_punkte_sind_weg(self):
        for z in (pruefe(anzahl=168, satzlaenge=4), pruefe(anzahl=168, satzlaenge=6, sp=1.5), pruefe(anzahl=168, satzlaenge=6, wd=0.15, lk=0.02, sp=0.1)):
            self.assertFalse({"12b", "12d", "12d2", "12e"} & set(z))
            for zeile in z.values():
                for wort in ("W/s", "Silben", "Tempo", "Pause"):
                    self.assertNotIn(wort, zeile["punkt"] + str(zeile["ist"]) + zeile["ziel"], zeile["nr"])

    def test_sehr_langsame_und_sehr_schnelle_stimme_bestehen(self):
        # früher 12b/12d nein; jetzt entscheidet kein Tempo und keine Pause mehr über „ja“ oder „nein“
        langsam = pruefe(anzahl=168, satzlaenge=4, wd=0.5, lk=0.2, sp=1.5)
        schnell = pruefe(anzahl=420, satzlaenge=4, wd=0.15, lk=0.02, sp=0.1)   # ca. 5,3 Wörter/s, ca. 80 s
        for z in (langsam, schnell):
            tempo_pflicht = [x["nr"] for x in z.values() if x["pflicht"] and not x["ok"] and x["nr"].startswith("12")]
            self.assertEqual(tempo_pflicht, [])

    def test_wortzahl_ist_nur_hinweis(self):
        for anzahl, erwartet in ((149, False), (150, True), (190, True), (191, False)):
            with self.subTest(anzahl=anzahl):
                z = pruefe(anzahl=anzahl, satzlaenge=4)["12a"]
                self.assertEqual(z["ok"], erwartet)
                self.assertFalse(z["pflicht"])

    def test_satzlaenge_ist_nur_hinweis(self):
        lang = pruefe(anzahl=168, satzlaenge=7)["12c"]
        self.assertFalse(lang["ok"])
        self.assertFalse(lang["pflicht"])
        self.assertTrue(pruefe(anzahl=168, satzlaenge=4)["12c"]["ok"])

    def test_hook_zeit_ist_nur_hinweis(self):
        z = pruefe(timing_json=segment_timing(70.0, regeln=9.0, ergebnis=56.0))["2"]     # Hook endet erst bei 8,7 s
        self.assertFalse(z["ok"], z["ist"])
        self.assertFalse(z["pflicht"])

    def test_mindestlaenge_61_s_bleibt_pflicht(self):
        for gesamt, erwartet in ((60.0, False), (60.9, False), (61.0, True), (72.0, True), (95.0, True)):
            with self.subTest(gesamt=gesamt):
                z = pruefe(timing_json=segment_timing(gesamt, ergebnis=gesamt * 0.8), ereignisse={"dauer": gesamt, "ereignisse": []})["12f"]
                self.assertEqual(z["ok"], erwartet, z["ist"])
                self.assertTrue(z["pflicht"])
        nur_stimme = pruefe(timing_json=segment_timing(58.0, ergebnis=45.0))["12f"]      # ohne Ereignis-Protokoll zählt die Stimme
        self.assertFalse(nur_stimme["ok"])
        self.assertIn("nur Stimme", nur_stimme["ist"])

    def test_richtwert_65_bis_80_ist_nur_hinweis(self):
        for gesamt, erwartet in ((62.0, False), (65.0, True), (80.0, True), (95.0, False)):
            with self.subTest(gesamt=gesamt):
                z = pruefe(timing_json=segment_timing(gesamt, ergebnis=gesamt * 0.8), ereignisse={"dauer": gesamt, "ereignisse": []})["12f2"]
                self.assertEqual(z["ok"], erwartet, z["ist"])
                self.assertFalse(z["pflicht"])

    def test_extra_ziel_ueberschreibt_profil(self):
        self.assertFalse(pruefe(anzahl=168, satzlaenge=6, extra={"woerter": (100, 120)})["12a"]["ok"])
        self.assertTrue(pruefe(timing_json=segment_timing(58.0, ergebnis=45.0), extra={"laenge_min": 50.0})["12f"]["ok"])

    def test_alte_tempo_ziele_werden_uebergangen(self):
        z = pruefe(anzahl=168, satzlaenge=4, extra={"tempo": (2.0, 2.5), "silben": (4.6, 5.4), "satzpause_max": 0.7, "satzpause_median": (0.3, 0.6)})
        self.assertNotIn("12b", z)
        self.assertNotIn("12d", z)

    def test_cli_alte_profile_und_ziele(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / "audio").mkdir()
            (p / "skript.json").write_text(json.dumps({"stil": "18", "segmente": [{"id": "hook", "text": "x"}]}), encoding="utf-8")
            (p / "audio" / "timing.json").write_text(json.dumps(timing(168, 4)), encoding="utf-8")
            (p / "szene.js").write_text("", encoding="utf-8")
            for argv in (["--profil", "massstab"], ["--profil", "ben_alt"], ["--ziel", "tempo=2.0:2.5", "--ziel", "satzpause_max=0.7"]):
                with self.subTest(argv=argv), mock.patch.object(sys, "argv", ["massstab.py", str(p), "--json"] + argv), \
                        contextlib.redirect_stdout(io.StringIO()) as aus, contextlib.redirect_stderr(io.StringIO()) as fehler, \
                        self.assertRaises(SystemExit) as ende:
                    massstab.main()
                self.assertIn(ende.exception.code, (0, 1))               # läuft durch (kein Aufruffehler 2)
                self.assertIn("gibt es seit 09.11.2026 nicht mehr", fehler.getvalue())
                ergebnis = json.loads(aus.getvalue())
                self.assertEqual(ergebnis["info"]["profil"], "ben")
                self.assertNotIn("tempo", ergebnis["info"]["ziele"])
            with mock.patch.object(sys, "argv", ["massstab.py", str(p), "--profil", "gibtsnicht"]), \
                    contextlib.redirect_stdout(io.StringIO()), self.assertRaises(SystemExit) as ende:
                massstab.main()
            self.assertEqual(ende.exception.code, 2)


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
        for skill in ("video-produktion", True):           # neuer Skill seit 07.11. und alter Skill (bis 06.11.)
            with self.subTest(skill=skill):
                self.assertTrue(pruefe(stil="3 Clay", skill=skill, anzahl=168, satzlaenge=6)["18b"]["pflicht"])
        ohne = pruefe(stil="Keine Nummer", skill=False, anzahl=168, satzlaenge=6)["18b"]
        self.assertFalse(ohne["pflicht"])
        mit_szene = pruefe(stil="Keine Nummer", skill=False, szene='import { SimBuehne } from "../../engine/sim_atmosphaere.js";', anzahl=168, satzlaenge=6)["18b"]
        self.assertTrue(mit_szene["pflicht"])


class ReaRegeln(unittest.TestCase):
    """Regeln aus dem REA-Regelwerk Simulierbar (Freigabe des Inhabers 07.11.2026)."""
    VOLL = {"dauer": 70.0, "ereignisse": [
        {"t": 0.0, "typ": "titel", "text": "Mieten"}, {"t": -1, "typ": "tafel"}, {"t": 58.0, "typ": "balken", "dauer": 0.7},
        {"t": 67.4, "typ": "pointe", "text": "Zeit schlägt Zins."}],
        "massstab": {"untertitel": {"stil": "phrase", "maxWoerter": 4}}}

    def test_ohne_testblock_kein_folgen_hinweis_und_kein_aufruf(self):
        # seit 08.11.2026: Standard ohne Hinweis ist ok; der alte Aufruf M.folgen ist immer ein Fehler (Pflicht)
        ohne = pruefe(anzahl=168, satzlaenge=4, ereignisse={"dauer": 70.0, "ereignisse": []})["7"]
        self.assertTrue(ohne["ok"], ohne["ist"])
        self.assertTrue(ohne["pflicht"])
        alt = pruefe(anzahl=168, satzlaenge=4, ereignisse={"dauer": 70.0, "ereignisse": [{"t": 20.0, "typ": "folgen", "dauer": 1.8}]})["7"]
        self.assertFalse(alt["ok"])
        self.assertIn("M.folgen", alt["ist"])
        ohne_block = pruefe(anzahl=168, satzlaenge=4, testbloecke={"folgen_hinweis": "ohne"},
                            ereignisse={"dauer": 70.0, "ereignisse": [{"t": 67.5, "typ": "folgen_hinweis", "text": "Teil 2 ist im Profil"}]})["7"]
        self.assertFalse(ohne_block["ok"])

    def test_folgen_hinweis_im_testblock_mit(self):
        def sieben(hinweise):
            return pruefe(anzahl=168, satzlaenge=4, testbloecke={"folgen_hinweis": "mit"}, ereignisse={"dauer": 70.0, "ereignisse": hinweise})["7"]
        gut = sieben([{"t": 67.5, "typ": "folgen_hinweis", "text": "Jeden Tag ein Geld-Duell im Profil"}])
        self.assertTrue(gut["ok"], gut["ist"])
        self.assertFalse(sieben([])["ok"])                                                                    # fehlt
        self.assertIn("zu früh", sieben([{"t": 50.0, "typ": "folgen_hinweis", "text": "Teil 2 ist im Profil"}])["ist"])
        self.assertIn("Druck", sieben([{"t": 67.5, "typ": "folgen_hinweis", "text": "Folg mir für Teil 2"}])["ist"])
        self.assertIn("Druck", sieben([{"t": 67.5, "typ": "folgen_hinweis", "text": "Nicht verpassen: Teil 2"}])["ist"])
        self.assertIn("Wörter", sieben([{"t": 67.5, "typ": "folgen_hinweis", "text": " ".join(["Wort"] * 12)}])["ist"])

    def test_folgen_hinweis_darf_nicht_gesprochen_werden(self):
        # Die künstlichen Wortzeiten heißen „wort0 … wort167“; ein Hinweis mit denselben Wörtern am Ende gilt als gesprochen
        z = pruefe(anzahl=168, satzlaenge=4, testbloecke={"folgen_hinweis": "mit"},
                   ereignisse={"dauer": 70.0, "ereignisse": [{"t": 67.0, "typ": "folgen_hinweis", "text": "wort166 wort167"}]})["7"]
        self.assertFalse(z["ok"])
        self.assertIn("gesprochen", z["ist"])

    def test_druck_muster(self):
        for text, druck in (("Teil 2 ist im Profil", False), ("Morgen: Pfand gegen Müll", False), ("Folg mir, damit du nichts verpasst", True),
                            ("Wenn du folgst, kommt Teil 2", True), ("Gratis-Rechner im Profil", True), ("Jetzt folgen!", True)):
            with self.subTest(text=text):
                self.assertEqual(bool(massstab.DRUCK.search(text)), druck)

    def test_schlusskarte_statt_schlusssatz(self):
        gut = pruefe(anzahl=168, satzlaenge=4, ereignisse=self.VOLL)["10"]
        self.assertTrue(gut["ok"], gut["ist"])
        self.assertTrue(gut["pflicht"])
        alt = pruefe(anzahl=168, satzlaenge=4, ereignisse=self.VOLL, segmente=[
            {"id": "schluss", "text": "Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.", "sprechtext": ""}])["10"]
        self.assertFalse(alt["ok"])
        ohne_karte = pruefe(anzahl=168, satzlaenge=4, ereignisse={**self.VOLL, "ereignisse": self.VOLL["ereignisse"][:3]})["10"]
        self.assertFalse(ohne_karte["ok"])
        self.assertIn("keine Schlusskarte", ohne_karte["ist"])

    def test_untertitel_bloecke_hoechstens_vier(self):
        self.assertTrue(pruefe(anzahl=168, satzlaenge=4, ereignisse=self.VOLL)["14"]["ok"])
        for ut in ({"stil": "phrase", "maxWoerter": 5}, {"stil": "kontur"}):
            with self.subTest(ut=ut):
                self.assertFalse(pruefe(anzahl=168, satzlaenge=4, ereignisse={**self.VOLL, "massstab": {"untertitel": ut}})["14"]["ok"])

    def test_titel_tafel_erklaergrafik(self):
        z = pruefe(anzahl=168, satzlaenge=4, ereignisse=self.VOLL)
        for nr in ("R1", "R2", "R3"):
            with self.subTest(nr=nr):
                self.assertTrue(z[nr]["ok"], z[nr]["ist"])
                self.assertTrue(z[nr]["pflicht"])
        leer = pruefe(anzahl=168, satzlaenge=4, ereignisse={"dauer": 70.0, "ereignisse": [{"t": 2.0, "typ": "titel"}]})
        self.assertFalse(leer["R1"]["ok"])                 # Titel erst bei 2 s
        self.assertFalse(leer["R2"]["ok"])
        self.assertFalse(leer["R3"]["ok"])

    def test_du_nur_im_hook(self):
        neutral = [{"id": "hook", "text": "x", "sprechtext": "Du oder ich? Wer hat mehr?"},
                   {"id": "ergebnis", "text": "x", "sprechtext": "Wer wechselt, wird [calm] doppelt so lange überholt."}]
        self.assertTrue(pruefe(anzahl=168, satzlaenge=4, segmente=neutral)["R4"]["ok"])
        mit_du = neutral + [{"id": "pointe", "text": "x", "sprechtext": "Dein Geld arbeitet. Und du?"}]
        z = pruefe(anzahl=168, satzlaenge=4, segmente=mit_du)["R4"]
        self.assertFalse(z["ok"])
        self.assertTrue(z["pflicht"])
        self.assertIn("pointe", z["ist"])

    def test_endstand_bei_ca_80_prozent_ist_hinweis(self):
        for start, erwartet in ((56.0, True), (53.0, True), (40.0, False), (63.0, False)):
            with self.subTest(start=start):
                z = pruefe(timing_json=segment_timing(70.0, rennen=12.0, kipp=45.0, ergebnis=start))["R5"]
                self.assertEqual(z["ok"], erwartet, z["ist"])
                self.assertFalse(z["pflicht"])                # seit 09.11.2026 nur Hinweis (Phasen-Zeitpunkte)
        ohne = pruefe(anzahl=168, satzlaenge=4)["R5"]      # weder Segment „ergebnis“ noch das Wort „Endstand“
        self.assertFalse(ohne["ok"])

    def test_kipp_moment_ist_hinweis(self):
        z = pruefe(timing_json=segment_timing(70.0, kipp=45.0, ergebnis=56.0))["R6"]
        self.assertTrue(z["ok"], z["ist"])
        self.assertFalse(z["pflicht"])


class Aufloesung(unittest.TestCase):
    """12h (seit 08.11.2026): fertiges MP4 genau 1080×1920, sonst Pflichtpunkt nein; ohne MP4 entfällt der Punkt."""

    def projekt_mit_video(self, tmp, groesse):
        pipeline = Path(tmp)
        p = pipeline / "projekte" / "testvideo"
        (p / "audio").mkdir(parents=True)
        (p / "skript.json").write_text(json.dumps({"konto": "simulierbar", "stil": "17", "segmente": [{"id": "hook", "text": "x"}]}), encoding="utf-8")
        (p / "audio" / "timing.json").write_text(json.dumps(timing(170, 4)), encoding="utf-8")
        (p / "szene.js").write_text("", encoding="utf-8")
        if groesse:
            out = pipeline / "out" / "testvideo"
            out.mkdir(parents=True)
            import subprocess
            subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", f"color=c=black:s={groesse}:d=0.2", "-pix_fmt", "yuv420p", str(out / "testvideo.mp4")], check=True)
        return p

    def test_ohne_video_entfaellt_der_punkt(self):
        with tempfile.TemporaryDirectory() as tmp:
            zeilen, _ = massstab.pruefe(self.projekt_mit_video(tmp, None), "ben", {})
        self.assertNotIn("12h", {z["nr"] for z in zeilen})

    @unittest.skipIf(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, "ffmpeg/ffprobe fehlt")
    def test_1080p_besteht(self):
        with tempfile.TemporaryDirectory() as tmp:
            zeilen, _ = massstab.pruefe(self.projekt_mit_video(tmp, "1080x1920"), "ben", {})
        z = {z["nr"]: z for z in zeilen}["12h"]
        self.assertTrue(z["ok"])
        self.assertTrue(z["pflicht"])
        self.assertEqual(z["ist"], "1080×1920")

    @unittest.skipIf(shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None, "ffmpeg/ffprobe fehlt")
    def test_720p_faellt_durch(self):
        with tempfile.TemporaryDirectory() as tmp:
            zeilen, _ = massstab.pruefe(self.projekt_mit_video(tmp, "720x1280"), "ben", {})
        z = {z["nr"]: z for z in zeilen}["12h"]
        self.assertFalse(z["ok"])
        self.assertTrue(z["pflicht"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
