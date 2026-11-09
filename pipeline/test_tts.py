"""Tests für tts.py: Untertitel-Zuordnung, die Sperre „ein Skript geht genau einmal durch ElevenLabs“ (Inhaber 08.11.2026),
der Body der Anfrage (feste Einstellungen, Sprache, Seed; Inhaber 09.11.2026), Aussprache-Ersetzungen und das eine Verfahren.
Aufruf: python3 -m unittest pipeline/test_tts.py   (ElevenLabs wird nie aufgerufen, die Anfrage ist eine Attrappe)"""
import contextlib
import io
import json
import sys
import tempfile
import types
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).parent))
import tts  # noqa: E402
from tts import anzeige_woerter  # noqa: E402


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


class Sperre(unittest.TestCase):
    """Jedes Skript geht genau einmal durch ElevenLabs; jede Sperre greift VOR der Anfrage (keine Credits)."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.projekt = Path(self.tmp.name)
        (self.projekt / "audio").mkdir()
        tts.CACHE = self.projekt / "audio" / "cache"
        self.anfragen = []

        def anfrage(pfad, daten=None):
            self.anfragen.append(daten["text"])
            self.daten.append(daten)
            return {"audio_base64": "", "alignment": {}}

        self.daten = []

        self.vorab_bereit = True
        modul = types.SimpleNamespace(pruefe_skript=lambda s: (self.vorab_bereit, [], {}), ausgeben=lambda *a: None)
        self.patches = [mock.patch.object(tts, "anfrage", side_effect=anfrage), mock.patch.dict(sys.modules, {"stimme_vorab": modul})]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        tts.CACHE, tts.WAECHTER, tts.SEED = None, None, None
        tts.MODELL, tts.GESPEICHERTE_EINSTELLUNGEN = tts.MODELLE["v4"], False
        tts.KOPFZEILEN.clear()
        self.tmp.cleanup()

    def lauf(self, text, grund=None, voice_id=None):
        tts.WAECHTER = tts.Waechter(self.projekt, {"segmente": []}, grund, voice_id or tts.STANDARD_STIMME)
        return tts.sprechen(text, voice_id or tts.STANDARD_STIMME)

    def aufnahmen(self):
        return json.loads((self.projekt / "audio" / "aufnahmen.json").read_text(encoding="utf-8"))["aufnahmen"]

    def test_erste_aufnahme_wird_gebucht(self):
        self.lauf("Erste Fassung.")
        self.assertEqual(self.anfragen, ["Erste Fassung."])
        a = self.aufnahmen()
        self.assertEqual(len(a), 1)
        self.assertEqual(a[0]["grund"], "erste Aufnahme")
        self.assertEqual(a[0]["zeichen"], len("Erste Fassung."))

    def test_zweite_aufnahme_ohne_grund_gesperrt(self):
        self.lauf("Erste Fassung.")
        with self.assertRaises(SystemExit) as fehler:
            self.lauf("Gekürzte Fassung.")
        self.assertIn("GESPERRT", str(fehler.exception))
        self.assertEqual(len(self.anfragen), 1)  # keine zweite Anfrage, keine Credits

    def test_gleicher_text_kostet_nichts_und_ist_frei(self):
        self.lauf("Erste Fassung.")
        self.lauf("Erste Fassung.")  # Cache-Treffer: keine Anfrage, keine Sperre
        self.assertEqual(len(self.anfragen), 1)
        self.assertEqual(len(self.aufnahmen()), 1)

    def test_neuaufnahme_wegen_laenge_gesperrt(self):
        self.lauf("Erste Fassung.")
        for grund in ("Video zu lang", "Hook dauert 5,2 s", "Tempo zu langsam"):
            with self.assertRaises(SystemExit):
                self.lauf("Gekürzte Fassung.", grund)
        self.assertEqual(len(self.anfragen), 1)

    def test_zeitgruende_erkannt_aussprachegruende_nicht(self):
        for g in ("Video zu lang", "Hook dauert 5,2 s", "Tempo zu langsam", "Länge 82 s", "Text gekürzt", "Pause zu lang"):
            self.assertTrue(tts.ZEIT_GRUND.search(g), g)
        for g in ("Ben betont langfristig falsch", "Dauerauftrag falsch ausgesprochen", "Wort Zeitraum verschluckt",
                  "Störgeräusch bei 30 s", "spricht Steuerklasse falsch aus"):
            self.assertFalse(tts.ZEIT_GRUND.search(g), g)

    def test_neuaufnahme_bei_hoerbarem_fehler_genau_einmal(self):
        self.lauf("Erste Fassung.")
        self.lauf("Erste Fassung, richtig betont.", "Ben spricht Steuerklasse falsch aus")
        self.assertEqual(len(self.anfragen), 2)
        self.assertEqual(self.aufnahmen()[-1]["grund"], "Ben spricht Steuerklasse falsch aus")
        with self.assertRaises(SystemExit):
            self.lauf("Dritte Fassung.", "Störgeräusch bei 30 s")
        self.assertEqual(len(self.anfragen), 2)

    def test_vorpruefung_nicht_bestanden_keine_anfrage(self):
        self.vorab_bereit = False
        with self.assertRaises(SystemExit) as fehler:
            self.lauf("Viel zu lange Fassung.")
        self.assertIn("VORPRÜFUNG", str(fehler.exception))
        self.assertEqual(self.anfragen, [])
        self.assertFalse((self.projekt / "audio" / "aufnahmen.json").exists())

    def test_alte_cache_aufnahmen_zaehlen(self):
        tts.CACHE.mkdir(parents=True)
        (tts.CACHE / "alt.json").write_text("{}")
        with self.assertRaises(SystemExit):
            self.lauf("Neue Fassung.")
        self.assertEqual(self.anfragen, [])

    def test_alte_aufnahme_im_cache_bleibt_treffer(self):
        # Aufnahmen bis 08.11.2026 liegen unter dem Schlüssel der damaligen Anfrage (nur Text und Modell)
        tts.CACHE.mkdir(parents=True)
        alt = tts.cache_schluessel(tts.STANDARD_STIMME, {"text": "Alte Fassung.", "model_id": tts.MODELL})
        (tts.CACHE / f"{alt}.json").write_text(json.dumps({"audio_base64": "", "alignment": {"alt": True}}))
        self.assertEqual(self.lauf("Alte Fassung.")["alignment"], {"alt": True})
        self.assertEqual(self.anfragen, [])

    def test_vorpruefung_gilt_fuer_jede_stimme_und_jedes_modell(self):
        self.vorab_bereit = False
        tts.MODELL = tts.MODELLE["v2"]
        with self.assertRaises(SystemExit) as fehler:
            self.lauf("Fassung mit 3 Ziffern.", voice_id=tts.STIMMEN["Otto"])
        self.assertIn("VORPRÜFUNG", str(fehler.exception))
        self.assertEqual(self.anfragen, [])

    def test_meldungen_ohne_vorab_schaetzung(self):
        self.lauf("Erste Fassung.")
        with self.assertRaises(SystemExit) as fehler:
            self.lauf("Gekürzte Fassung.")
        meldung = str(fehler.exception)
        self.assertIn("Das Video folgt der fertigen Stimme", meldung)
        self.assertNotIn("stimme_vorab", meldung)             # Länge und Tempo werden nicht mehr vorher „geklärt“

    def test_seed_und_kopfzeilen_stehen_in_aufnahmen(self):
        tts.SEED = tts.seed_aus_name("mieten-kaufen")
        tts.KOPFZEILEN.update({"request-id": "abc123", "character-cost": "14"})  # füllt sonst anfrage() aus der Antwort
        self.lauf("Erste Fassung.")
        a = self.aufnahmen()[0]
        self.assertEqual(a["seed"], tts.SEED)
        self.assertEqual(a["request_id"], "abc123")
        self.assertEqual(a["character_cost"], "14")
        self.assertNotIn("ohne_felder", a)


class Anfrage(unittest.TestCase):
    """Body der Anfrage (Inhaber 09.11.2026: feste Stabilität, Sprache „de“, fester Seed) und der eine Ersatzversuch."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.projekt = Path(self.tmp.name)
        (self.projekt / "audio").mkdir()
        tts.CACHE = self.projekt / "audio" / "cache"
        tts.SEED = tts.seed_aus_name("mieten-kaufen")
        self.daten, self.fehler = [], []

        def anfrage(pfad, daten=None):
            self.daten.append(daten)
            if self.fehler:
                code, grund = self.fehler.pop(0)
                e = urllib.error.HTTPError("https://api.elevenlabs.io", code, "Fehler", None, None)
                e.grund = grund
                raise e
            return {"audio_base64": "", "alignment": {}}

        modul = types.SimpleNamespace(pruefe_skript=lambda s: (True, [], {}), ausgeben=lambda *a: None)
        self.patches = [mock.patch.object(tts, "anfrage", side_effect=anfrage), mock.patch.dict(sys.modules, {"stimme_vorab": modul})]
        for p in self.patches:
            p.start()

    def tearDown(self):
        for p in self.patches:
            p.stop()
        tts.CACHE, tts.WAECHTER, tts.SEED = None, None, None
        tts.MODELL, tts.GESPEICHERTE_EINSTELLUNGEN = tts.MODELLE["v4"], False
        self.tmp.cleanup()

    def lauf(self, text="Erste Fassung."):
        tts.WAECHTER = tts.Waechter(self.projekt, {"segmente": []}, None, tts.STANDARD_STIMME)
        with contextlib.redirect_stdout(io.StringIO()) as aus:
            tts.sprechen(text, tts.STANDARD_STIMME)
        return aus.getvalue()

    def aufnahmen(self):
        pfad = self.projekt / "audio" / "aufnahmen.json"
        return json.loads(pfad.read_text(encoding="utf-8"))["aufnahmen"] if pfad.exists() else []

    def test_standard_v4(self):
        self.lauf()
        d = self.daten[0]
        self.assertEqual(d["model_id"], "eleven_v4")
        self.assertEqual(d["language_code"], "de")
        self.assertEqual(d["voice_settings"], {"stability": 0.5, "similarity_boost": 0.75})   # v4 kennt nur diese zwei
        self.assertEqual(d["seed"], tts.seed_aus_name("mieten-kaufen"))
        self.assertNotIn("previous_text", d)
        self.assertNotIn("next_text", d)

    def test_v2_ohne_sprache_mit_style(self):
        tts.MODELL = tts.MODELLE["v2"]
        d = tts.anfrage_daten("Text.")
        self.assertNotIn("language_code", d)
        self.assertEqual(set(d["voice_settings"]), {"stability", "similarity_boost", "style", "use_speaker_boost"})

    def test_gespeicherte_einstellungen_senden_keine_voice_settings(self):
        tts.GESPEICHERTE_EINSTELLUNGEN = True
        self.assertNotIn("voice_settings", tts.anfrage_daten("Text."))

    def test_seed_fest_je_projekt(self):
        a = tts.seed_aus_name("mieten-kaufen")
        self.assertEqual(a, tts.seed_aus_name("mieten-kaufen"))
        self.assertEqual(a, 594573789)                     # darf sich nie ändern (sonst andere Stimme, anderer Cache)
        self.assertTrue(0 <= a < 2 ** 32)
        self.assertNotEqual(a, tts.seed_aus_name("pfand-muell"))
        self.assertNotEqual(a, tts.seed_aus_name("mieten-kaufen", neuaufnahme=True))

    def test_abgelehntes_feld_einmal_ohne(self):
        for code, feld in ((422, "seed"), (400, "language_code"), (422, "voice_settings")):
            with self.subTest(feld=feld):
                self.daten.clear()
                self.fehler = [(code, f'{{"detail": "Unsupported parameter {feld} for this model"}}')]
                ausgabe = self.lauf(f"Fassung für {feld}.")
                (self.projekt / "audio" / "aufnahmen.json").rename(self.projekt / "audio" / f"aufnahmen_{feld}.json")
                self.assertEqual(len(self.daten), 2)
                self.assertIn(feld, self.daten[0])
                self.assertNotIn(feld, self.daten[1])
                self.assertEqual(self.daten[1]["text"], f"Fassung für {feld}.")
                self.assertIn(f"lehnt {feld} ab", ausgabe)
                a = json.loads((self.projekt / "audio" / f"aufnahmen_{feld}.json").read_text(encoding="utf-8"))["aufnahmen"]
                self.assertEqual(len(a), 1)                   # die abgelehnte Anfrage zählt nicht als Aufnahme
                self.assertEqual(a[0]["ohne_felder"], [feld])
                self.lauf(f"Fassung für {feld}.")             # gleicher Text danach: Cache-Treffer trotz weggelassenem Feld
                self.assertEqual(len(self.daten), 2)
                for datei in tts.CACHE.glob("*.json"):        # nächster Durchgang beginnt als frisches Projekt
                    datei.unlink()

    def test_zweite_ablehnung_beendet_den_lauf(self):
        self.fehler = [(422, "seed is not supported"), (422, "language_code is not supported")]
        with self.assertRaises(urllib.error.HTTPError) as fehler:
            self.lauf()
        fehler.exception.close()
        self.assertEqual(len(self.daten), 2)                  # genau EIN Ersatzversuch
        self.assertEqual(self.aufnahmen(), [])

    def test_andere_fehler_ohne_ersatzversuch(self):
        for code, grund in ((401, "invalid_api_key"), (422, "text too long"), (429, "seed quota_exceeded"), (400, "previous_text invalid")):
            with self.subTest(code=code, grund=grund):
                self.daten.clear()
                self.fehler = [(code, grund)]
                with self.assertRaises(urllib.error.HTTPError) as fehler:
                    self.lauf()
                fehler.exception.close()
                self.assertEqual(len(self.daten), 1)
        self.assertEqual(self.aufnahmen(), [])


class Aussprache(unittest.TestCase):
    ALIASE = {"ETF": "E T F", "kWh": "Kilowattstunden", "DAX": "Dax"}

    def test_ganzes_wort_gross_klein_genau(self):
        f = lambda t: tts.aussprache_anwenden(t, self.ALIASE)
        self.assertEqual(f("Der ETF steigt, der DAX auch."), "Der E T F steigt, der Dax auch.")
        self.assertEqual(f("ETFs und Etf bleiben."), "ETFs und Etf bleiben.")
        self.assertEqual(f("Zehn kWh. ETF-Sparplan."), "Zehn Kilowattstunden. E T F-Sparplan.")

    def test_aufbereiten_ersetzt_vor_dem_senden(self):
        texte, trenner, gesamt = tts.aufbereiten(["Der ETF steigt. Klar?", "Der DAX auch."], self.ALIASE)
        self.assertEqual(texte, ["Der E T F steigt.\nKlar?", "Der Dax auch."])
        self.assertEqual(gesamt, "Der E T F steigt.\nKlar?\n\nDer Dax auch.")

    def test_datei_mit_anmerkung_und_ohne_datei(self):
        with tempfile.TemporaryDirectory() as tmp:
            datei = Path(tmp) / "aussprache.json"
            self.assertEqual(tts.aussprache_laden(datei), {})
            datei.write_text(json.dumps({"_hinweis": "Anmerkung", "ETF": "E T F", "": "x", "Zahl": 5}), encoding="utf-8")
            self.assertEqual(tts.aussprache_laden(datei), {"ETF": "E T F"})
            with mock.patch.object(tts, "AUSSPRACHE_DATEI", datei):
                self.assertEqual(tts.aufbereiten(["Ein ETF."])[2], "Ein E T F.")

    def test_mitgelieferte_datei_ist_gueltig(self):
        aliase = tts.aussprache_laden()
        self.assertTrue(aliase)
        self.assertTrue(all(isinstance(v, str) and v for v in aliase.values()))


class EinVerfahren(unittest.TestCase):
    """Seit 09.11.2026 gibt es nur noch die eine Anfrage: kein Verfahren je Segment, kein Tempo-Faktor."""

    def test_tempo_maschine_ist_weg(self):
        for name in ("ZIEL_WPS", "MAX_DEHNUNG", "dehnen", "PAUSE", "PAUSE_LANG"):
            self.assertFalse(hasattr(tts, name), name)

    def test_segmente_schalter_beendet_ohne_anfrage(self):
        with mock.patch.object(sys, "argv", ["tts.py", "projekte/gibt-es-nicht", "--segmente"]), \
                mock.patch.object(tts, "anfrage") as anfrage, self.assertRaises(SystemExit) as fehler:
            tts.main()
        self.assertIn("--segmente", str(fehler.exception))
        anfrage.assert_not_called()

    def test_timing_format_unveraendert(self):
        skript = {"segmente": [{"id": "hook", "text": "Wer hat 2 Euro?", "sprechtext": "Wer hat zwei Euro?"},
                               {"id": "ergebnis", "text": "Niemand.", "sprechtext": "Niemand."}]}
        gesamt = "Wer hat zwei Euro?\n\nNiemand."
        antwort = {"audio_base64": "", "alignment": {"characters": list(gesamt),
                                                     "character_start_times_seconds": [0.2 + 0.1 * i for i in range(len(gesamt))],
                                                     "character_end_times_seconds": [0.3 + 0.1 * i for i in range(len(gesamt))]}}
        import array
        with tempfile.TemporaryDirectory() as tmp, mock.patch.object(tts, "sprechen", return_value=antwort), \
                mock.patch.object(tts, "pcm", return_value=array.array("h", bytes(2 * tts.RATE * 5))), \
                mock.patch.object(tts, "mp3_schreiben"), contextlib.redirect_stdout(io.StringIO()):
            tts.am_stueck(skript, ["Wer hat zwei Euro?", "Niemand."], tts.STANDARD_STIMME, "Ben", Path(tmp))
            timing = json.loads((Path(tmp) / "timing.json").read_text(encoding="utf-8"))
        self.assertEqual(list(timing), ["stimme", "voice_id", "modell", "verfahren", "einstellungen", "dauer", "segmente"])
        self.assertEqual(timing["verfahren"], "am_stueck")
        self.assertEqual([s["id"] for s in timing["segmente"]], ["hook", "ergebnis"])
        self.assertEqual(list(timing["segmente"][0]), ["id", "text", "start", "ende", "woerter"])
        self.assertEqual([w["wort"] for w in timing["segmente"][0]["woerter"]], ["Wer", "hat", "2", "Euro?"])
        self.assertEqual(list(timing["segmente"][0]["woerter"][0]), ["wort", "start", "ende"])
        self.assertAlmostEqual(timing["segmente"][0]["start"], 0.05, places=2)   # 0,05 s Vorlauf vor dem ersten Wort


if __name__ == "__main__":
    unittest.main()
