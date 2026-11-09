#!/usr/bin/env python3
"""Tests für qc/stimme_vorab.py: kostenlose Text-Hygiene des Sprechtexts vor der einen Aufnahme.
Entscheidung des Inhabers 09.11.2026: keine Schätzung von Dauer, Hook, Tempo, Silben oder Pausen mehr.

Aufruf (im Ordner pipeline/):  python3 qc/stimme_vorab_test.py
ElevenLabs wird nie aufgerufen; pipeline/aussprache.json wird in den Tests nicht gelesen (aliase={} bzw. eigene Liste).
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stimme_vorab  # noqa: E402

SAUBER = [
    ("hook", "Mieten oder kaufen? Wer hat am Ende mehr Geld?"),
    ("regeln", "Beide starten mit zwanzigtausend Euro. Die Miete steigt jedes Jahr um zwei Prozent."),
    ("rennen", "Nach zehn Jahren liegt die Mieterin vorn, denn ihr Geld arbeitet am Markt."),
    ("ergebnis", "Nach dreißig Jahren gewinnt der Käufer mit rund vierzigtausend Euro Vorsprung."),
]


def skript(**ersatz):
    """Sauberes Skript; ersatz = {segment_id: neuer Sprechtext}."""
    return {"segmente": [{"id": i, "text": t, "sprechtext": ersatz.get(i, t)} for i, t in SAUBER]}


def pruefe(aliase=None, **ersatz):
    bereit, zeilen, info = stimme_vorab.pruefe_skript(skript(**ersatz), {} if aliase is None else aliase)
    return bereit, {z["nr"]: z for z in zeilen}, info


class Sauber(unittest.TestCase):
    def test_sauberes_skript_ist_bereit(self):
        bereit, z, info = pruefe()
        self.assertTrue(bereit, [x for x in z.values() if not x["ok"] and x["pflicht"]])
        for nr in ("T0", "Ta", "Tb", "Tc", "Td", "Te", "Tf", "Tg", "Th", "Ti"):
            self.assertTrue(z[nr]["ok"], nr)
            self.assertTrue(z[nr]["pflicht"], nr)
        self.assertEqual(info["segmente"], 4)
        self.assertGreater(info["zeichen"], 100)
        self.assertEqual(info["credits"], round(info["zeichen"] * stimme_vorab.tts.CREDITS_JE_ZEICHEN))

    def test_keine_schaetzung_mehr(self):
        _, z, info = pruefe()
        for schluessel in ("dauer", "hook_ende", "silben_je_wort", "eichung"):
            self.assertNotIn(schluessel, info)
        self.assertFalse({"2", "12a", "12b", "12c", "12d", "12f", "R5"} & set(z))
        for name in ("simuliere", "eichen", "lade_eichung", "VORAB_ZIELE"):
            self.assertFalse(hasattr(stimme_vorab, name), name)
        with self.assertRaises(SystemExit):
            stimme_vorab.schaetze_timing(skript())

    def test_bindestrich_im_wort_und_buchstabiert_sind_erlaubt(self):
        bereit, z, _ = pruefe(regeln="Die Vier-Tage-Woche kommt. G T A sechs auch, sagt Haus- und Hofbesitzer Kurt.")
        self.assertTrue(bereit, [x["funde"] for x in z.values() if not x["ok"] and x["pflicht"]])

    def test_ein_ruhiger_tag_am_anfang_ist_erlaubt(self):
        for tag in ("[calm]", "[thoughtful]", "[curious]", "[Calm]"):
            with self.subTest(tag=tag):
                bereit, z, _ = pruefe(hook=f"{tag} Mieten oder kaufen? Wer hat am Ende mehr Geld?")
                self.assertTrue(z["Tg"]["ok"], z["Tg"]["funde"])
                self.assertTrue(bereit)


class Pflicht(unittest.TestCase):
    def faellt(self, nr, text, segment="regeln", enthaelt=None):
        bereit, z, info = pruefe(**{segment: text})
        self.assertFalse(bereit, text)
        self.assertFalse(z[nr]["ok"], f"{nr}: {text}")
        self.assertTrue(z[nr]["pflicht"])
        fund = z[nr]["funde"][0]
        self.assertEqual(fund["segment"], segment)       # Segment, Textstelle und Abhilfe gehören zu jedem Fund
        self.assertTrue(fund["stelle"] and fund["abhilfe"])
        if enthaelt:
            self.assertIn(enthaelt, " ".join(f["stelle"] + f["abhilfe"] for f in z[nr]["funde"]))
        self.assertTrue(any(t.startswith(nr) for t in info["tipps"]))
        return z

    def test_a_ziffern(self):
        self.faellt("Ta", "Beide starten mit 20.000 Euro.", enthaelt="20.000")
        self.faellt("Ta", "Im Jahr 2026 kippt es.", enthaelt="2026")

    def test_b_zeichen(self):
        for zeichen in "€%&§+=/*#@°":
            with self.subTest(zeichen=zeichen):
                self.faellt("Tb", f"Das kostet zwei {zeichen} mehr.", enthaelt=zeichen)

    def test_b_abkuerzungen(self):
        for abk in ("z. B.", "z.B.", "ca.", "bzw.", "usw.", "d. h.", "Mio.", "Mrd.", "Tsd.", "Nr.", "inkl.", "ggf.", "etc.", "km/h", "kWh", "EUR"):
            with self.subTest(abk=abk):
                self.faellt("Tb", f"Das sind {abk} zwei Dinge.", enthaelt="ausschreiben")

    def test_b_normale_woerter_sind_keine_abkuerzung(self):
        _, z, _ = pruefe(regeln="Monica kauft ein Eurohaus. Das Mioma ist kein Wort, usw auch nicht.")
        self.assertTrue(z["Tb"]["ok"], z["Tb"]["funde"])

    def test_c_auslassungspunkte(self):
        self.faellt("Tc", "Und dann… kippt es.")
        self.faellt("Tc", "Und dann... kippt es.")

    def test_d_strich_als_pause(self):
        for text in ("Die Miete steigt – jedes Jahr.", "Die Miete steigt — jedes Jahr.", "Die Miete steigt - jedes Jahr."):
            with self.subTest(text=text):
                self.faellt("Td", text, enthaelt="Komma")

    def test_e_grossbuchstaben(self):
        z = self.faellt("Te", "Das ist WIRKLICH viel Geld.", enthaelt="WIRKLICH")
        self.assertEqual(len(z["Te"]["funde"]), 1)
        self.faellt("Te", "Der ETF-Sparplan läuft.", enthaelt="E T F")

    def test_f_markierungen(self):
        z = self.faellt("Tf", 'Die Miete steigt. <break time="0.3s" /> Jedes Jahr.', enthaelt="<break")
        self.assertTrue(z["Ta"]["ok"])                    # die Ziffern in der Markierung zählen nicht doppelt

    def test_g_audio_tags(self):
        self.faellt("Tg", "[excited] Mieten oder kaufen? Wer hat mehr?", segment="hook", enthaelt="[excited]")     # nicht ruhig
        self.faellt("Tg", "Mieten oder kaufen? [calm] Wer hat mehr?", segment="hook", enthaelt="Anfang")          # nicht am Anfang
        self.faellt("Tg", "[calm] Beide starten mit zwanzigtausend Euro.", enthaelt="Anfang")                      # nicht im ersten Segment
        self.faellt("Tg", "[short pause] Beide starten gleich.", enthaelt="[short pause]")
        bereit, z, _ = pruefe(hook="[calm] Mieten oder kaufen?", regeln="[curious] Beide starten gleich.")          # zwei Tags
        self.assertFalse(bereit)
        self.assertEqual([f["segment"] for f in z["Tg"]["funde"]], ["regeln"])

    def test_h_ausrufezeichen(self):
        bereit, z, _ = pruefe(hook="Mieten! Oder kaufen!", regeln="Beide starten gleich! Die Miete steigt.")
        self.assertTrue(bereit)                                   # genau 3 sind erlaubt
        self.assertEqual(z["Th"]["ist"], "3")
        bereit, z, _ = pruefe(hook="Mieten! Oder kaufen!", regeln="Beide starten gleich! Die Miete steigt!")
        self.assertFalse(bereit)
        self.assertFalse(z["Th"]["ok"])
        self.assertIn("4 Ausrufezeichen", z["Th"]["funde"][0]["stelle"])

    def test_i_emoji_und_fremde_zeichen(self):
        self.faellt("Ti", "Das Geld wächst 🚀 schnell.", enthaelt="🚀")
        self.faellt("Ti", "Das Geld wächst ~ schnell.")
        self.faellt("Ti", "Eine Klammer ] ohne Anfang.")
        self.faellt("Ti", "Das kostet zwei $ mehr.")

    def test_leeres_segment_blockt(self):
        self.faellt("T0", "[calm]")
        bereit, z, _ = stimme_vorab.pruefe_skript({"segmente": [{"id": "hook", "text": "", "sprechtext": ""}]}, {})
        self.assertFalse(bereit)
        self.assertFalse(z[0]["ok"])

    def test_ohne_sprechtext_zaehlt_der_anzeigetext(self):
        s = {"segmente": [{"id": "hook", "text": "Wer hat 2026 mehr Geld?"}]}
        bereit, zeilen, _ = stimme_vorab.pruefe_skript(s, {})
        self.assertFalse(bereit)
        self.assertFalse({z["nr"]: z for z in zeilen}["Ta"]["ok"])


class Hinweise(unittest.TestCase):
    def hinweis(self, nr, **ersatz):
        bereit, z, _ = pruefe(**ersatz)
        self.assertTrue(bereit)                                   # Hinweise blocken nie
        self.assertFalse(z[nr]["pflicht"])
        return z[nr]

    def test_wortzahl_ist_nur_hinweis(self):
        z = self.hinweis("N1")                                    # das saubere Skript hat weit unter 150 Wörter
        self.assertFalse(z["ok"])
        self.assertIn("Stimme bestimmt die Videolänge", z["funde"][0]["abhilfe"])
        lang = " ".join(["Das Geld wächst langsam weiter."] * 30)  # 150 Wörter, mit den anderen Segmenten ca. 180
        self.assertTrue(self.hinweis("N1", rennen=lang)["ok"])

    def test_langer_satz(self):
        z = self.hinweis("N2", regeln="Beide starten mit zwanzigtausend Euro und zahlen jeden Monat genau den gleichen Betrag in ihren Topf ein, egal was kommt.")
        self.assertFalse(z["ok"])
        self.assertTrue(self.hinweis("N2")["ok"])

    def test_viele_kurzsaetze(self):
        self.assertTrue(self.hinweis("N3", regeln="Klar. Oder? Beide starten gleich.")["ok"])
        self.assertFalse(self.hinweis("N3", regeln="Klar. Oder? Nein. Beide starten gleich.")["ok"])

    def test_segment_ohne_satzende(self):
        z = self.hinweis("N4", regeln="Beide starten mit zwanzigtausend Euro")
        self.assertFalse(z["ok"])
        self.assertEqual(z["funde"][0]["segment"], "regeln")

    def test_regieanweisung_in_klammern_und_anfuehrungszeichen(self):
        self.assertFalse(self.hinweis("N5", regeln="Beide starten gleich (kurze Pause). Dann kippt es.")["ok"])
        self.assertFalse(self.hinweis("N5", regeln="„leise“ Beide starten gleich.")["ok"])
        self.assertTrue(self.hinweis("N5", regeln="Sie sagt „Kaufen lohnt sich“. Stimmt das?")["ok"])

    def test_englisches_wort_nur_wenn_wie_in_der_anzeige(self):
        s = {"segmente": [{"id": "hook", "text": "Cashback oder Rabatt?", "sprechtext": "Cashback oder Rabatt?"},
                          {"id": "regeln", "text": "Der Deal läuft.", "sprechtext": "Der Diel läuft."}]}
        bereit, zeilen, _ = stimme_vorab.pruefe_skript(s, {})
        z = {x["nr"]: x for x in zeilen}["N6"]
        self.assertTrue(bereit)
        self.assertEqual([f["stelle"] for f in z["funde"]], ["cashback"])


class Aussprache(unittest.TestCase):
    def test_geprueft_wird_nach_der_ersetzung(self):
        ohne, z, _ = pruefe(regeln="Der ETF wächst.")
        self.assertFalse(ohne)
        self.assertFalse(z["Te"]["ok"])
        mit, z, info = pruefe(aliase={"ETF": "E T F"}, regeln="Der ETF wächst.")
        self.assertTrue(mit, z["Te"]["funde"])
        self.assertEqual(info["aussprache"], ["ETF"])

    def test_ersetzung_kann_selbst_durchfallen(self):
        bereit, z, _ = pruefe(aliase={"Zins": "5 %"}, regeln="Der Zins steigt.")
        self.assertFalse(bereit)
        self.assertFalse(z["Ta"]["ok"])
        self.assertFalse(z["Tb"]["ok"])

    def test_standard_liest_die_datei_von_tts(self):
        with tempfile.TemporaryDirectory() as tmp:
            datei = Path(tmp) / "aussprache.json"
            datei.write_text(json.dumps({"_hinweis": "Anmerkung", "ETF": "E T F"}), encoding="utf-8")
            with mock.patch.object(stimme_vorab.tts, "AUSSPRACHE_DATEI", datei):
                bereit, _, info = stimme_vorab.pruefe_skript(skript(regeln="Der ETF wächst."))
        self.assertTrue(bereit)
        self.assertEqual(info["aussprache"], ["ETF"])


class Ausgabe(unittest.TestCase):
    def text(self, **ersatz):
        bereit, zeilen, info = stimme_vorab.pruefe_skript(skript(**ersatz), {})
        puffer = io.StringIO()
        with contextlib.redirect_stdout(puffer):
            stimme_vorab.ausgeben(zeilen, info, bereit)
        return puffer.getvalue()

    def test_bereit_und_nicht_bereit(self):
        gut = self.text()
        self.assertIn("BEREIT: Die eine Aufnahme darf erzeugt werden.", gut)
        self.assertNotIn("NICHT BEREIT", gut)
        schlecht = self.text(regeln="Beide starten mit 20.000 €.")
        self.assertIn("NICHT BEREIT", schlecht)
        self.assertIn("regeln", schlecht)
        self.assertIn("in Worten schreiben", schlecht)

    def test_keine_tempo_woerter_in_der_tabelle(self):
        for wort in ("Silben", "W/s", "Hook bis", "Eichung"):
            self.assertNotIn(wort, self.text())

    def test_cli(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)
            (p / "skript.json").write_text(json.dumps(skript(), ensure_ascii=False), encoding="utf-8")
            db = p / "db.json"
            db.write_text(json.dumps({"daten": {"skript": skript(regeln="Nur 5 Euro.")}}, ensure_ascii=False), encoding="utf-8")
            for argv, code in (([str(p)], 0), (["--datei", str(db), "--json"], 1), ([], 2), ([str(p / "fehlt")], 2), (["--eichen"], 2)):
                with self.subTest(argv=argv), mock.patch.object(sys, "argv", ["stimme_vorab.py"] + argv), \
                        mock.patch.object(stimme_vorab.tts, "AUSSPRACHE_DATEI", p / "keine.json"), \
                        contextlib.redirect_stdout(io.StringIO()) as aus, self.assertRaises(SystemExit) as ende:
                    stimme_vorab.main()
                self.assertEqual(ende.exception.code, code, aus.getvalue()[:300])
                if "--json" in argv:
                    self.assertFalse(json.loads(aus.getvalue())["bereit"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
