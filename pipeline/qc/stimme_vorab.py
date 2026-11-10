#!/usr/bin/env python3
"""Kostenlose Vorprüfung vor der einen Aufnahme: Text-Hygiene des Sprechtexts (ohne ElevenLabs, ohne Credits).

Entscheidung des Inhabers 09.11.2026: Es gibt keine Sprechtempo-Regeln mehr. Dieses Skript schätzt weder Stimmdauer noch
Hook-Zeit, Tempo, Silben oder Pausen (die Schätzung vom 08.11. samt Eichdatei ist entfernt und wird
nicht mehr gelesen). Das Video folgt der fertigen Stimme (audio/timing.json), nie umgekehrt.
Geprüft wird nur, ob der Text sauber ist, damit die EINE Aufnahme (Regel 08.11.2026) nicht an vermeidbaren Lesefehlern
scheitert. Geprüft wird genau der Text, den tts.aufbereiten an ElevenLabs schickt: „sprechtext“ (sonst „text“) je Segment,
NACH den Aussprache-Ersetzungen aus pipeline/aussprache.json.

PFLICHT (blockt, „NICHT BEREIT“), jeder Fund mit Segment, Textstelle und Abhilfe:
  T0  jedes Segment hat gesprochenen Text (sonst bricht tts.py NACH der bezahlten Anfrage ab)
  Ta  keine Ziffern (Zahlen in Worten)
  Tb  keine Zeichen € % & § + = / * # @ ° und keine Abkürzungen (z. B., ca., bzw., usw., d. h., Mio., Mrd., Tsd., Nr.,
      inkl., ggf., etc., km/h, kWh, EUR)
  Tc  keine Auslassungspunkte („…“ oder „...“)
  Td  kein Strich als Pause („ – “, „ — “, „ - “; der Bindestrich im Wort, z. B. „Vier-Tage-Woche“, ist in Ordnung)
  Te  keine Wörter in GROSSBUCHSTABEN (erlaubt: buchstabiert mit Leerzeichen, z. B. „G T A“)
  Tf  keine Markierungen <…> (z. B. <break>)
  Tg  Audio-Tags […]: höchstens EINER im ganzen Skript, nur ganz am Anfang des ersten Segments, nur [calm],
      [thoughtful] oder [curious]
  Th  höchstens 3 Ausrufezeichen im ganzen Skript
  Ti  keine Emojis und sonstigen Zeichen, die nicht gesprochen werden
HINWEIS (blockt nie): N1 Wortzahl außerhalb 150–190 (grobe Länge, die Stimme bestimmt die Videolänge), N2 Sätze mit mehr
als 16 Wörtern, N3 mehr als 2 Sätze mit höchstens 2 Wörtern, N4 Segment endet ohne . ? !, N5 Klammern bzw.
Anführungszeichen mit Regieanweisung, N6 englische Wörter, die im Sprechtext genauso stehen wie in der Anzeige.

Aufruf (im Ordner pipeline/):
  python3 qc/stimme_vorab.py projekte/<name>            prüft projekte/<name>/skript.json
  python3 qc/stimme_vorab.py --datei <skript.json>      prüft eine JSON-Datei mit "segmente" (auch ein Skript aus der Datenbank)
  python3 qc/stimme_vorab.py … --json                   maschinenlesbar
Exit 0 = BEREIT (die eine Aufnahme darf erzeugt werden), 1 = nicht bereit (Text anpassen), 2 = Aufruffehler.
pipeline/tts.py ruft diese Prüfung vor jeder bezahlten Anfrage selbst auf und stellt ohne „BEREIT“ keine Anfrage.
Tests: python3 qc/stimme_vorab_test.py
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER.parent))
import tts  # noqa: E402

WOERTER_RICHTWERT = (150, 190)   # nur Hinweis: grobe Länge
SATZ_MAX_WOERTER = 16            # nur Hinweis
KURZSAETZE_MAX = 2               # nur Hinweis: so viele Sätze mit höchstens 2 Wörtern
AUSRUFEZEICHEN_MAX = 3
RUHIGE_TAGS = {"calm", "thoughtful", "curious"}

TAG = re.compile(r"\[[^\[\]]*\]")
MARKUP = re.compile(r"<[^<>]*>")
ZIFFERN = re.compile(r"\d[\d.,]*\d|\d")
ZEICHEN = {"€": "„Euro“ schreiben", "%": "„Prozent“ schreiben", "&": "„und“ schreiben", "§": "„Paragraf“ schreiben",
           "+": "„plus“ schreiben", "=": "„gleich“ bzw. „ist“ schreiben", "/": "ausschreiben („pro“, „durch“, „oder“)",
           "*": "weglassen bzw. „mal“ schreiben", "#": "weglassen bzw. ausschreiben", "@": "ausschreiben", "°": "„Grad“ schreiben"}
ABKUERZUNGEN = [(re.compile(m, f), voll) for m, f, voll in (
    (r"\bz\.\s?B\.", re.I, "zum Beispiel"), (r"\bd\.\s?h\.", re.I, "das heißt"), (r"\bca\.", re.I, "rund bzw. etwa"),
    (r"\bbzw\.", re.I, "beziehungsweise bzw. oder"), (r"\busw\.", re.I, "und so weiter"), (r"\bMio\b\.?", re.I, "Millionen"),
    (r"\bMrd\b\.?", re.I, "Milliarden"), (r"\bTsd\b\.?", re.I, "Tausend"), (r"\bNr\.", re.I, "Nummer"),
    (r"\binkl\.", re.I, "inklusive bzw. mit"), (r"\bggf\.", re.I, "gegebenenfalls"), (r"\betc\.", re.I, "und so weiter"),
    (r"\bkm/h\b", re.I, "Kilometer pro Stunde"), (r"\bkWh\b", 0, "Kilowattstunden"), (r"\bEUR\b", 0, "Euro"))]
PUNKTE = re.compile(r"…|\.{2,}")
STRICH = re.compile(r"[–—]|(?:(?<=\s)|^)-(?=\s|$)")
BUCHSTABE = "A-Za-zÄÖÜäöüßẞ"
GROSS = re.compile(rf"(?<![{BUCHSTABE}])[A-ZÄÖÜẞ]{{2,}}(?![{BUCHSTABE}])")
ERLAUBTE_ZEICHEN = set(".,;:?!'’-\"„“”»«‚‘()")
ANDERSWO = set(ZEICHEN) | set("…–—")   # diese Zeichen meldet schon ein anderer Punkt
SATZENDE = re.compile(r"[.?!][\"“”»«’')]*$")
KLAMMER = re.compile(r"\([^()]*\)")
ZITAT = re.compile(r"[„“\"»]([^„“”\"»«]{1,60})[“”\"«]")
REGIE = re.compile(r"\b(pause|leise|laut|lauter|flüster\w*|lach\w*|seufz\w*|atmet|betont|langsam\w*|schnell\w*|ruhig\w*|stimme)\b", re.I)
# Englische Wörter, die eine deutsche Stimme leicht falsch liest (kleine Liste, nur Hinweis)
ENGLISCH = {"cashback", "leasing", "streaming", "download", "update", "upgrade", "deal", "sale", "fake", "jackpot", "account",
            "podcast", "newsletter", "shopping", "influencer", "startup", "cloud", "tool", "level", "gaming", "homeoffice",
            "feature", "ranking", "challenge", "lifestyle", "highlight", "content", "follower", "feedback", "business"}


def gesprochene_texte(skript, aliase=None):
    """[(Segment-ID, Text)] genau so, wie tts.py ihn sendet: „sprechtext“ (sonst „text“), nach den Aussprache-Ersetzungen."""
    aliase = tts.aussprache_laden() if aliase is None else aliase
    return [(str(s.get("id", i + 1)), tts.aussprache_anwenden(str(s.get("sprechtext") or s.get("text") or ""), aliase).strip())
            for i, s in enumerate(skript.get("segmente") or [])]


def rein(text):
    """Text ohne Audio-Tags […] und Markierungen <…> (gleich lang, damit Fundstellen stimmen)."""
    return MARKUP.sub(lambda m: " " * len(m.group(0)), TAG.sub(lambda m: " " * len(m.group(0)), text))


def stelle(text, a, b, rand=16):
    """Textstelle mit etwas Umgebung, auf einer Zeile."""
    vor, nach = text[max(0, a - rand):a], text[b:b + rand]
    roh = ("…" if a > rand else "") + vor + text[a:b] + nach + ("…" if b + rand < len(text) else "")
    return " ".join(roh.split())


def woerter(text):
    return [w for w in rein(text).split() if any(z.isalpha() or z.isdigit() for z in w)]


def saetze(text):
    return [s for s in (" ".join(t.split()) for t in re.split(r"(?<=[.?!])\s+|\n+", rein(text))) if woerter(s)]


def fund(seg, text, abhilfe):
    return {"segment": seg, "stelle": text, "abhilfe": abhilfe}


def pflicht_funde(texte):
    """{Nr: [Funde]} für die Pflichtpunkte T0–Ti."""
    f = {k: [] for k in ("T0", "Ta", "Tb", "Tc", "Td", "Te", "Tf", "Tg", "Th", "Ti")}
    if not texte:
        f["T0"].append(fund("–", "keine Segmente", "skript.json braucht „segmente“ mit Text"))
    tags = []
    for nr, (seg, text) in enumerate(texte):
        r = rein(text)
        if not woerter(text):
            f["T0"].append(fund(seg, text or "(leer)", "Sprechtext eintragen oder das Segment streichen"))
        for m in ZIFFERN.finditer(r):
            f["Ta"].append(fund(seg, stelle(text, *m.span()), f"„{m.group(0)}“ in Worten schreiben"))
        for m in re.finditer("[" + re.escape("".join(ZEICHEN)) + "]", r):
            f["Tb"].append(fund(seg, stelle(text, *m.span()), f"„{m.group(0)}“: {ZEICHEN[m.group(0)]}"))
        for muster, voll in ABKUERZUNGEN:
            for m in muster.finditer(r):
                f["Tb"].append(fund(seg, stelle(text, *m.span()), f"„{m.group(0)}“ ausschreiben: {voll}"))
        for m in PUNKTE.finditer(r):
            f["Tc"].append(fund(seg, stelle(text, *m.span()), "Auslassungspunkte streichen, Satz mit Punkt beenden"))
        for m in STRICH.finditer(r):
            f["Td"].append(fund(seg, stelle(text, *m.span()), "Strich durch Komma oder Punkt ersetzen (Pausen nur über Satzzeichen)"))
        for m in GROSS.finditer(r):
            wort = m.group(0)
            f["Te"].append(fund(seg, stelle(text, *m.span()), f"„{wort}“ normal schreiben („{wort.capitalize()}“ bzw. „{wort.lower()}“)" + (
                f"; eine Abkürzung buchstabieren („{' '.join(wort)}“) oder in pipeline/aussprache.json eintragen" if len(wort) <= 5 else "")))
        for m in MARKUP.finditer(text):
            f["Tf"].append(fund(seg, stelle(text, *m.span()), "Markierung streichen (Pausen nur über Satzzeichen und Absätze)"))
        for m in TAG.finditer(text):
            tags.append((nr, seg, text, m))
        for i, z in enumerate(r):
            if z.isspace() or z.isdigit() or z in ERLAUBTE_ZEICHEN or z in ANDERSWO or unicodedata.category(z)[0] in "LM":
                continue
            name = unicodedata.name(z, "unbekanntes Zeichen").lower()
            f["Ti"].append(fund(seg, stelle(text, i, i + 1), f"„{z}“ ({name}) streichen bzw. ausschreiben"))
    for k, (nr, seg, text, m) in enumerate(tags):
        inhalt = m.group(0)[1:-1].strip().lower()
        if len(tags) > 1 and k > 0:
            f["Tg"].append(fund(seg, stelle(text, *m.span()), "streichen: höchstens EIN Audio-Tag im ganzen Skript"))
        elif inhalt not in RUHIGE_TAGS:
            f["Tg"].append(fund(seg, stelle(text, *m.span()), "streichen oder durch [calm], [thoughtful] bzw. [curious] ersetzen"))
        elif nr != 0 or text[:m.start()].strip():
            f["Tg"].append(fund(seg, stelle(text, *m.span()), "der eine Audio-Tag steht ganz am Anfang des ersten Segments, sonst streichen"))
    ausruf = [(seg, m) for seg, text in texte for m in re.finditer("!", rein(text))]
    if len(ausruf) > AUSRUFEZEICHEN_MAX:
        segs = ", ".join(sorted({seg for seg, _ in ausruf}, key=[s for s, _ in texte].index))
        f["Th"].append(fund(segs, f"{len(ausruf)} Ausrufezeichen", f"auf höchstens {AUSRUFEZEICHEN_MAX} kürzen (ruhiger Erzählton), sonst Punkt"))
    return f


def hinweis_funde(texte, skript):
    f = {k: [] for k in ("N1", "N2", "N3", "N4", "N5", "N6")}
    anzahl = sum(len(woerter(t)) for _, t in texte)
    a, b = WOERTER_RICHTWERT
    if not a <= anzahl <= b:
        f["N1"].append(fund("gesamt", f"{anzahl} Wörter", f"Richtwert {a}–{b} Wörter; nur grobe Länge, die Stimme bestimmt die Videolänge"))
    kurz = []
    for seg, text in texte:
        for s in saetze(text):
            n = len(woerter(s))
            if n > SATZ_MAX_WOERTER:
                f["N2"].append(fund(seg, f"{n} Wörter: {s[:60]}{'…' if len(s) > 60 else ''}", "Satz teilen"))
            if n <= 2:
                kurz.append((seg, s))
        r = " ".join(rein(text).split())
        if woerter(text) and not SATZENDE.search(r):
            f["N4"].append(fund(seg, "…" + r[-24:], "Segment mit Punkt, Fragezeichen oder Ausrufezeichen beenden"))
        for m in KLAMMER.finditer(rein(text)):
            f["N5"].append(fund(seg, stelle(text, *m.span()), "Klammern werden mitgelesen; Regieanweisung streichen bzw. als Satz schreiben"))
        for m in ZITAT.finditer(rein(text)):
            if REGIE.search(m.group(1)):
                f["N5"].append(fund(seg, stelle(text, *m.span()), "sieht nach Regieanweisung aus; sie würde vorgelesen"))
    if len(kurz) > KURZSAETZE_MAX:
        f["N3"].append(fund(", ".join(dict.fromkeys(seg for seg, _ in kurz)), f"{len(kurz)} Sätze mit höchstens 2 Wörtern: "
                            + " · ".join(s for _, s in kurz[:5]), f"höchstens {KURZSAETZE_MAX} solche Sätze, sonst klingt es abgehackt"))
    norm = lambda w: re.sub(r"[^\w]", "", w.lower())
    for (seg, text), s in zip(texte, skript.get("segmente") or []):
        anzeige = {norm(w) for w in str(s.get("text") or "").split()}
        for w in dict.fromkeys(norm(w) for w in woerter(text)):
            if w in ENGLISCH and w in anzeige:
                f["N6"].append(fund(seg, w, "englisches Wort: prüfen, ob die deutsche Stimme es richtig liest; sonst im Sprechtext "
                                            "lautnah schreiben oder in pipeline/aussprache.json eintragen"))
    return f


PUNKTE_TEXT = [
    ("T0", "Jedes Segment hat gesprochenen Text", "alle", True),
    ("Ta", "Keine Ziffern (Zahlen in Worten)", "keine", True),
    ("Tb", "Keine Zeichen (€ % & § + = / * # @ °) und Abkürzungen", "keine", True),
    ("Tc", "Keine Auslassungspunkte", "keine", True),
    ("Td", "Kein Strich als Pause", "keiner", True),
    ("Te", "Keine Wörter in GROSSBUCHSTABEN", "keine", True),
    ("Tf", "Keine Markierungen <…>", "keine", True),
    ("Tg", "Audio-Tag: höchstens einer, ganz am Anfang, ruhig", "0–1: [calm], [thoughtful], [curious]", True),
    ("Th", "Ausrufezeichen im ganzen Skript", f"≤ {AUSRUFEZEICHEN_MAX}", True),
    ("Ti", "Keine Emojis und nicht gesprochenen Zeichen", "keine", True),
    ("N1", "Wortzahl (grobe Länge)", f"{WOERTER_RICHTWERT[0]}–{WOERTER_RICHTWERT[1]} (Hinweis)", False),
    ("N2", "Sätze mit mehr als 16 Wörtern", "keine (Hinweis)", False),
    ("N3", "Sätze mit höchstens 2 Wörtern", f"≤ {KURZSAETZE_MAX} (Hinweis)", False),
    ("N4", "Segment endet mit . ? !", "alle (Hinweis)", False),
    ("N5", "Keine Regieanweisung in Klammern bzw. Anführungszeichen", "keine (Hinweis)", False),
    ("N6", "Englische Wörter wie in der Anzeige geschrieben", "keine (Hinweis)", False),
]


def pruefe_skript(skript, aliase=None):
    """→ (bereit, zeilen, info). bereit = alle Pflichtpunkte ja. aliase: Aussprache-Ersetzungen statt pipeline/aussprache.json."""
    aliase = tts.aussprache_laden() if aliase is None else aliase
    texte = gesprochene_texte(skript, aliase)
    funde = {**pflicht_funde(texte), **hinweis_funde(texte, skript)}
    anzahl = sum(len(woerter(t)) for _, t in texte)
    ausruf = sum(rein(t).count("!") for _, t in texte)
    zeilen = []
    for nr, punkt, ziel, pflicht in PUNKTE_TEXT:
        fd = funde[nr]
        ist = {"N1": str(anzahl), "Th": str(ausruf)}.get(nr) or (ziel.split(" (")[0] if not fd else f"{len(fd)}×: " + "; ".join(
            f"{x['segment']}: „{x['stelle']}“" for x in fd[:3]) + (" …" if len(fd) > 3 else ""))
        if nr == "Tg" and not fd:
            ist = next((m.group(0) for _, t in texte for m in TAG.finditer(t)), "keiner")
        zeilen.append({"nr": nr, "punkt": punkt, "ist": ist, "ziel": ziel, "massstab": "Text-Hygiene (Inhaber 09.11.2026)",
                       "ok": not fd, "pflicht": pflicht, "funde": fd})
    bereit = all(z["ok"] for z in zeilen if z["pflicht"])
    try:  # genau der Text, der an ElevenLabs geht (für Zeichen und Credits)
        gesamt = tts.aufbereiten([str(s.get("sprechtext") or s.get("text") or "") for s in skript.get("segmente") or []], aliase)[2]
    except SystemExit:  # z. B. <break> bei Eleven v4: steht oben schon als Fund
        gesamt = "\n\n".join(t for _, t in texte)
    roh = " ".join(str(s.get("sprechtext") or s.get("text") or "") for s in skript.get("segmente") or [])
    info = {"segmente": len(texte), "woerter": anzahl, "zeichen": len(gesamt), "credits": round(len(gesamt) * tts.CREDITS_JE_ZEICHEN),
            "aussprache": sorted(w for w in aliase if tts.aussprache_anwenden(roh, {w: "\0"}) != roh),
            "tipps": [f"{z['nr']} {x['segment']}: „{x['stelle']}“ → {x['abhilfe']}" for z in zeilen for x in z["funde"]]}
    return bereit, zeilen, info


def ausgeben(zeilen, info, bereit):
    print(f"Stimm-Vorprüfung (Text-Hygiene, kostenlos): {info.get('segmente', '?')} Segmente, {info.get('woerter', '?')} Wörter, "
          f"{info.get('zeichen', '?')} Zeichen ≈ {info.get('credits', '?')} Credits. Keine Tempo- oder Längenregel: Das Video folgt der Stimme.")
    if info.get("aussprache"):
        print("  Aussprache-Ersetzungen (pipeline/aussprache.json): " + ", ".join(info["aussprache"]))
    for z in zeilen:
        marke = ("ja " if z["ok"] else "NEIN") + ("" if z["pflicht"] else " (H)")
        print(f"  {z['nr']:4} {marke:8} {z['punkt'][:56]:56} | {str(z['ist'])[:70]:70} | Ziel {z['ziel']}")
    for t in info.get("tipps", []):
        print("  → " + t)
    print("BEREIT: Die eine Aufnahme darf erzeugt werden." if bereit else
          "NICHT BEREIT: Erst den Sprechtext anpassen, dann erneut prüfen (kostet nichts). Keine Anfrage an ElevenLabs.")


def schaetze_timing(*_, **__):
    """Entfernt am 09.11.2026 (Entscheidung des Inhabers): Die Stimme wird nicht mehr geschätzt."""
    sys.exit("stimme_vorab.schaetze_timing gibt es seit 09.11.2026 nicht mehr: keine Schätzung von Stimmdauer, Hook, Tempo oder "
             "Pausen. Das Video folgt der fertigen Stimme (audio/timing.json).")


def main():
    args = sys.argv[1:]
    if "--eichen" in args:
        print("--eichen gibt es seit 09.11.2026 nicht mehr: Die Stimme wird nicht mehr geschätzt (keine Tempo-Regeln).")
        sys.exit(2)
    if "--datei" in args:
        pfad = Path(args[args.index("--datei") + 1])
    elif args and not args[0].startswith("-"):
        pfad = Path(args[0]) / "skript.json"
    else:
        print(__doc__)
        sys.exit(2)
    if not pfad.exists():
        print(f"Nicht gefunden: {pfad}")
        sys.exit(2)
    skript = json.loads(pfad.read_text(encoding="utf-8"))
    if "segmente" not in skript:  # Datenbank-Dokument (node cockpit/db.mjs get …): {"daten": {"skript": {…}}} bzw. {"skript": {…}}
        skript = skript.get("daten", skript)
        skript = skript.get("skript", skript)
    if not isinstance(skript, dict) or not skript.get("segmente"):
        print(f"Keine Segmente in {pfad}")
        sys.exit(2)
    bereit, zeilen, info = pruefe_skript(skript)
    if "--json" in args:
        print(json.dumps({"bereit": bereit, "info": info, "zeilen": zeilen}, ensure_ascii=False, indent=1))
    else:
        ausgeben(zeilen, info, bereit)
    sys.exit(0 if bereit else 1)


if __name__ == "__main__":
    main()
