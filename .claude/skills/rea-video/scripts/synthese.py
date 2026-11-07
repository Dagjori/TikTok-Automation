#!/usr/bin/env python3
"""REA-Video · Synthese über alle Videos eines Korpus (Skill .claude/skills/rea-video/, Anleitung synthese.md).

Aufruf:  python synthese.py <korpusordner>                               ein Korpus (ein Account/Format)
         python synthese.py <korpus1> <korpus2> … [--aus <ordner>]        übergreifend (nur formatunabhängige Muster
                                                                          verwenden; Spalte „je Korpus“ zeigt die Verteilung)
Liest:   <korpus>/korpus.csv (Trennzeichen ;), <korpus>/analysen/<id>/messung.json und merkmale.json
Schreibt <korpus>/synthese/ bzw. <aus> (Standard: <elternordner>/_uebergreifend/synthese/): matrix.md, regelkandidaten.md, kennzahlen.json
Erfolg:  Aufrufe, wenn notiert; sonst Likes als Erfolgsmaß (Kommentare und Saves je 100 Likes).
Belastbar: untere 95-%-Grenze ≥ 50 % (gilt auch in kleinen Korpora, z. B. 6 von 6); sonst „vorläufig“.
Rechnet: Anteil je Merkmal in der viralen Gruppe und in der Vergleichsgruppe, untere Grenze des 95-%-Intervalls (Wilson),
         Stärke (Gesetz ≥ 80 %, Muster ≥ 50 %, Variante ≥ 25 %, sonst Einzelfall), Unterscheider (viral − Vergleich ≥ 30 Prozentpunkte),
         Zielkorridore (25.–75. Perzentil) für Zahlen, Korpus-Status (Mindestzahl, Vielfalt, Sättigung).
Nenner ist immer die Zahl der Videos, in denen das Merkmal kodiert wurde (fehlt der Schlüssel, zählt das Video nicht mit).
"""
import csv
import datetime
import json
import math
import re
import statistics
import sys
from pathlib import Path

MINIMUM = {"viral": 12, "creator": 3, "creator_anteil": 1 / 3, "vergleich": 4}
ZIEL = {"viral": 20, "creator": 4, "vergleich": 6}
SAETTIGUNG_LETZTE = 3

MESS = {  # Name → Pfad in messung.json
    "Länge (s)": ("steckbrief", "dauer_s"),
    "harte Schnitte je Minute": ("schnitt", "schnitte_pro_min"),
    "erster harter Schnitt (s)": ("schnitt", "erster_schnitt_s"),
    "Einstellungslänge Median (s)": ("schnitt", "einstellung_median_s"),
    "Bewegung Median": ("bewegung", "median"),
    "Bewegung Einstieg (× Median)": ("bewegung", "einstieg_faktor"),
    "ruhige Sekunden (%)": ("bewegung", "ruhige_anteil_prozent"),
    "Helligkeit (0–255)": ("bild", "helligkeit_mittel"),
    "Sättigung": ("bild", "saettigung_mittel"),
    "Kontrast": ("bild", "kontrast_median"),
    "Loop-Differenz (klein = nahtlos)": ("bild", "loop_differenz"),
    "Lautheit (LUFS)": ("ton", "lufs_integriert"),
    "Lautheitsumfang LRA (LU)": ("ton", "lra_lu"),
    "Effekt-Kandidaten je Minute (S)": ("ton", "klang_pro_min"),
    "Stille (%)": ("ton", "stille_anteil_prozent"),
    "Wörter": ("sprache", "woerter"),
    "Wörter je Sekunde": ("sprache", "woerter_pro_s"),
    "Sprechbeginn (s)": ("sprache", "sprechbeginn_s"),
    "Intensität Einstieg (0–10)": ("spannung", "einstieg_intensitaet"),
    "Höhepunkt (% der Länge)": ("spannung", "hoehepunkt_anteil_der_laenge_prozent"),
    "Anstieg bis Höhepunkt": ("spannung", "anstieg_einstieg_bis_hoehepunkt"),
}


def zahl(x):
    """Liest 1234567, 1.234.567, 1,2 Mio, 2,5M, 850k, 3.4 (Punkt als Dezimalzeichen nur ohne Tausenderpunkte)."""
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x or "").strip().replace(" ", "").replace(" ", "")
    faktor = 1.0
    for endung, f in (("mio", 1e6), ("tsd", 1e3), ("m", 1e6), ("k", 1e3)):
        if s.lower().endswith(endung):
            s, faktor = s[: -len(endung)], f
            break
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        s = s.replace(".", "")
    elif s.count(",") > 1:
        s = s.replace(",", "")
    elif "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        return float(s) * faktor if s else None
    except ValueError:
        return None


def wilson_unten(k, n, z=1.96):
    if n == 0:
        return None
    p = k / n
    mitte = (p + z * z / (2 * n)) / (1 + z * z / n)
    breite = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / (1 + z * z / n)
    return max(0.0, mitte - breite)


def quantil(werte, q):
    w = sorted(werte)
    if not w:
        return None
    pos = (len(w) - 1) * q
    a, b = int(math.floor(pos)), int(math.ceil(pos))
    return w[a] + (w[b] - w[a]) * (pos - a)


def staerke(anteil):
    return "Gesetz" if anteil >= 0.8 else "Muster" if anteil >= 0.5 else "Variante" if anteil >= 0.25 else "Einzelfall"


def korpus_lesen(ordner):
    datei = ordner / "korpus.csv"
    if not datei.exists():
        sys.exit(f"{datei} fehlt (Vorlage: vorlagen/korpus.csv)")
    text = datei.read_text(encoding="utf-8-sig")
    trenner = ";" if text.count(";") >= text.count(",") else ","
    zeilen = [z for z in csv.DictReader(text.splitlines(), delimiter=trenner) if (z.get("id") or "").strip()]
    for z in zeilen:
        z["id"] = z["id"].strip()
        z["gruppe"] = (z.get("gruppe") or "viral").strip().lower()
    return zeilen


def p(x, n=0):
    if x is None:
        return "–"
    if not isinstance(x, (int, float)):
        return str(x)
    if abs(x) >= 10000:
        return f"{x:,.0f}".replace(",", ".")
    return f"{x:.{n}f}" if n else f"{round(x):d}"


def prozent(x):
    return "–" if x is None else f"{100 * x:.0f} %"


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    args = sys.argv[1:]
    aus_arg = None
    if "--aus" in args:
        i = args.index("--aus")
        aus_arg = Path(args[i + 1]).resolve()
        args = args[:i] + args[i + 2:]
    if not args:
        sys.exit("Aufruf: python synthese.py <korpusordner> [<korpus2> …] [--aus <ordner>]")
    ordner_liste = [Path(a).resolve() for a in args]
    mehrere = len(ordner_liste) > 1
    ordner = ordner_liste[0]
    kname = " + ".join(o.name for o in ordner_liste)
    korpus = []
    for o in ordner_liste:
        for z in korpus_lesen(o):
            z["_ordner"], z["_korpus"] = o, o.name
            korpus.append(z)
    if len({z["id"] for z in korpus}) < len(korpus):
        sys.exit("Video-IDs sind über die Korpora nicht eindeutig (V01 … fortlaufend vergeben)")
    daten, warnungen = [], []
    for z in korpus:
        a = z["_ordner"] / "analysen" / z["id"]
        mj = a / "messung.json"
        kj = a / "merkmale.json"
        messung = json.loads(mj.read_text(encoding="utf-8")) if mj.exists() else None
        merkmale = json.loads(kj.read_text(encoding="utf-8")) if kj.exists() else None
        if not messung:
            warnungen.append(f"{z['id']}: messung.json fehlt (scripts/messen.py)")
        if not merkmale:
            warnungen.append(f"{z['id']}: merkmale.json fehlt (Einzelanalyse nach raster.md)")
        daten.append({"zeile": z, "messung": messung or {}, "merkmale": (merkmale or {}).get("merkmale", {}), "werte": (merkmale or {}).get("werte", {}),
                      "analysiert": merkmale is not None})
    viral = [d for d in daten if d["zeile"]["gruppe"] == "viral"]
    vergleich = [d for d in daten if d["zeile"]["gruppe"] != "viral"]
    v_ok = [d for d in viral if d["analysiert"]]
    c_ok = [d for d in vergleich if d["analysiert"]]

    # ---------- Korpus-Status
    creator = {}
    for d in viral:
        c = (d["zeile"].get("creator") or "").strip().lower()
        if c:
            creator[c] = creator.get(c, 0) + 1
    unbekannt = sum(1 for d in viral if not (d["zeile"].get("creator") or "").strip())
    groesster = max(creator.values()) / len(viral) if creator and viral else 0
    mangel = []
    if len(v_ok) < MINIMUM["viral"]:
        mangel.append(f"nur {len(v_ok)} virale Videos analysiert (Minimum {MINIMUM['viral']})")
    if unbekannt:
        warnungen.append(f"Creator bei {unbekannt} viralen Videos unbekannt: Vielfalt (≥ {MINIMUM['creator']} Creator, keiner > 1/3) nicht prüfbar")
    if creator and len(creator) < MINIMUM["creator"] and not unbekannt:
        mangel.append(f"nur {len(creator)} Creator (Minimum {MINIMUM['creator']})")
    if groesster > MINIMUM["creator_anteil"] + 1e-9:
        mangel.append(f"ein Creator stellt {groesster:.0%} der viralen Videos (höchstens ein Drittel)")
    if len(c_ok) < MINIMUM["vergleich"]:
        mangel.append(f"nur {len(c_ok)} Vergleichsvideos (Minimum {MINIMUM['vergleich']}; ohne sie bleibt „Unterscheider“ offen)")
    ziel = len(v_ok) >= ZIEL["viral"] and len(creator) >= ZIEL["creator"] and len(c_ok) >= ZIEL["vergleich"]

    # ---------- Erfolg
    def rate(d, feld):
        a, x = zahl(d["zeile"].get("aufrufe")), zahl(d["zeile"].get(feld))
        return 100 * x / a if a and x is not None else None
    def je_like(d, feld):
        a, x = zahl(d["zeile"].get("likes")), zahl(d["zeile"].get(feld))
        return 100 * x / a if a and x is not None else None

    def med(werte):
        w = [x for x in werte if x is not None]
        return statistics.median(w) if w else None
    erfolg = {}
    for gruppe, liste in (("viral", viral), ("vergleich", vergleich)):
        erfolg[gruppe] = {
            "Likes (Median)": med([zahl(d["zeile"].get("likes")) for d in liste]),
            "Kommentare je 100 Likes (Median)": med([je_like(d, "kommentare") for d in liste]),
            "Saves je 100 Likes (Median)": med([je_like(d, "saves") for d in liste]),
            "Shares je 100 Likes (Median)": med([je_like(d, "shares") for d in liste]),
            "Aufrufe (Median)": statistics.median([zahl(d["zeile"].get("aufrufe")) for d in liste if zahl(d["zeile"].get("aufrufe"))]) if any(zahl(d["zeile"].get("aufrufe")) for d in liste) else None,
            **{f"{n} je 100 Aufrufe (Median)": (statistics.median([r for r in (rate(d, f) for d in liste) if r is not None]) if any(rate(d, f) is not None for d in liste) else None)
               for n, f in (("Likes", "likes"), ("Kommentare", "kommentare"), ("Shares", "shares"), ("Saves", "saves"))},
            "Aufrufe je Follower (Median)": (statistics.median([zahl(d["zeile"]["aufrufe"]) / zahl(d["zeile"]["follower"]) for d in liste
                                                                if zahl(d["zeile"].get("aufrufe")) and zahl(d["zeile"].get("follower"))])
                                             if any(zahl(d["zeile"].get("aufrufe")) and zahl(d["zeile"].get("follower")) for d in liste) else None),
        }

    # ---------- Merkmale (Ja/Nein, Kategorien, Listen)
    def auspraegungen(d):
        """{merkmal: True/False} je Video; Basisschlüssel → kodiert."""
        out = {}
        for k, v in d["merkmale"].items():
            if isinstance(v, bool):
                out[k] = v
            elif isinstance(v, list):
                out[k + " = *"] = None  # Platzhalter: Basisschlüssel kodiert
                for x in v:
                    out[f"{k} = {x}"] = True
            elif v is None or v == "":
                continue
            else:
                out[k + " = *"] = None
                out[f"{k} = {v}"] = True
        return out
    alle = {}
    for d in v_ok + c_ok:
        d["_a"] = auspraegungen(d)
        for k in d["_a"]:
            if not k.endswith(" = *"):
                alle.setdefault(k, None)

    def zaehlen(liste, merkmal):
        basis = merkmal.split(" = ")[0] + " = *" if " = " in merkmal else None
        n = k = 0
        belege, gegen = [], []
        for d in liste:
            a = d["_a"]
            kodiert = (merkmal in a) if basis is None else (basis in a)
            if not kodiert:
                continue
            n += 1
            if a.get(merkmal) is True:
                k += 1; belege.append(d["zeile"]["id"])
            else:
                gegen.append(d["zeile"]["id"])
        return k, n, belege, gegen

    zeilen = []
    for m in sorted(alle):
        k, n, belege, gegen = zaehlen(v_ok, m)
        if n == 0:
            continue
        kc, nc, _, _ = zaehlen(c_ok, m)
        anteil = k / n
        ac = kc / nc if nc else None
        if nc >= 3:
            diff = anteil - ac
            unt = ("ja (Erfolgsfaktor)" if diff >= 0.30 else "vermeiden (typisch für schwache Videos)" if diff <= -0.30
                   else "nein (Grundformat)" if abs(diff) <= 0.10 and ac >= 0.6 else "eher nein" if abs(diff) <= 0.10 else "unklar")
        else:
            diff, unt = None, "offen (zu wenig Vergleich)"
        je_korpus = ""
        if mehrere:
            teile = []
            for o in ordner_liste:
                kk, nk, _, _ = zaehlen([d for d in v_ok if d["zeile"]["_korpus"] == o.name], m)
                teile.append(f"{o.name} {kk}/{nk}" if nk else f"{o.name} –")
            je_korpus = " · ".join(teile)
        w = wilson_unten(k, n)
        zeilen.append({"merkmal": m, "k": k, "n": n, "anteil": anteil, "wilson": w, "kc": kc, "nc": nc, "anteil_c": ac,
                       "diff": diff, "staerke": staerke(anteil), "unterscheider": unt, "belege": belege, "gegen": gegen,
                       "belastbar": w is not None and w >= 0.5, "je_korpus": je_korpus})
    rang = {"Gesetz": 0, "Muster": 1, "Variante": 2, "Einzelfall": 3}
    zeilen.sort(key=lambda z: (rang[z["staerke"]], -z["anteil"], z["merkmal"]))

    # ---------- Zahlen (Messung + kodierte Werte)
    def wert_aus(d, pfad):
        x = d["messung"]
        for t in pfad:
            x = x.get(t) if isinstance(x, dict) else None
        return x if isinstance(x, (int, float)) else None
    zahlen = []
    namen = list(MESS) + sorted({k for d in v_ok + c_ok for k, v in d["werte"].items() if isinstance(v, (int, float))})
    for name in namen:
        if name in MESS:
            wv = [wert_aus(d, MESS[name]) for d in viral]
            wc = [wert_aus(d, MESS[name]) for d in vergleich]
            quelle = "Messung (F)"
        else:
            wv = [d["werte"].get(name) for d in v_ok]
            wc = [d["werte"].get(name) for d in c_ok]
            quelle = "kodiert"
        wv = [x for x in wv if isinstance(x, (int, float))]
        wc = [x for x in wc if isinstance(x, (int, float))]
        if not wv:
            continue
        zahlen.append({"wert": name, "quelle": quelle, "n": len(wv), "median": statistics.median(wv), "q1": quantil(wv, 0.25), "q3": quantil(wv, 0.75),
                       "min": min(wv), "max": max(wv), "median_c": statistics.median(wc) if wc else None, "nc": len(wc)})

    # ---------- Sättigung (Reihenfolge = korpus.csv)
    relevant = {z["merkmal"] for z in zeilen if z["anteil"] >= 0.25}
    gesehen, neu_je = set(), []
    for d in v_ok:
        neu = sorted(m for m in relevant if d["_a"].get(m) is True and m not in gesehen)
        gesehen |= set(neu)
        neu_je.append((d["zeile"]["id"], neu))
    letzte = neu_je[-SAETTIGUNG_LETZTE:]
    gesaettigt = len(v_ok) >= MINIMUM["viral"] and all(not n for _, n in letzte)

    # ---------- Ausgabe
    aus = aus_arg or ((ordner.parent / "_uebergreifend" / "synthese") if mehrere else (ordner / "synthese"))
    aus.mkdir(parents=True, exist_ok=True)
    heute = datetime.date.today().isoformat()
    md = [f"# Synthese Korpus „{kname}“ (Stand {heute})", "",
          "Erzeugt mit `scripts/synthese.py`. Zahlen aus der Messung sind F, kodierte Merkmale stammen aus den Einzelanalysen "
          "(Sicht/Transkript, je Video belegt). Nur lokal; ins Hirn kommen ausschließlich abstrahierte Regeln (hirn.md).", "",
          "## Korpus", "| Gruppe | Videos | analysiert | Creator | größter Creator-Anteil |", "|---|---|---|---|---|",
          f"| viral | {len(viral)} | {len(v_ok)} | {len(creator) if creator else '–'}{f' (+{unbekannt} unbekannt)' if unbekannt else ''} | {f'{groesster:.0%}' if creator else 'offen'} |",
          f"| Vergleich | {len(vergleich)} | {len(c_ok)} | – | – |", "",
          f"**Minimum erreicht:** {'ja' if not mangel else 'nein – ' + '; '.join(mangel)}  ",
          f"**Ziel erreicht (≥ {ZIEL['viral']} viral, ≥ {ZIEL['creator']} Creator, ≥ {ZIEL['vergleich']} Vergleich):** {'ja' if ziel else 'nein'}  ",
          f"**Sättigung (letzte {SAETTIGUNG_LETZTE} viralen Videos ohne neues Merkmal ≥ 25 %):** {'ja' if gesaettigt else 'nein'}", ""]
    if mangel:
        md += ["> Unter dem Minimum gelten die Ergebnisse als **Beobachtung (Entwurf)**. Nur Merkmale mit „belastbar = ja“ "
               "(untere 95-%-Grenze ≥ 50 %) dürfen schon als vorläufige Regel vorgeschlagen werden.", ""]
    if mehrere:
        md += ["> **Übergreifend:** Diese Matrix fasst mehrere Formate zusammen. Daraus nur formatunabhängiges Handwerk ableiten "
               "(Hook-Mechanik, Text, Schnitt, Bildqualität, Spannungsbogen); jede Regel je Account prüfen (Spalte „je Korpus“).", ""]
    md += ["## Erfolg", "| Kennzahl | viral | Vergleich |", "|---|---|---|"]
    for k in erfolg["viral"]:
        a, b = erfolg["viral"][k], erfolg["vergleich"][k]
        ganz = k.startswith(("Likes (", "Aufrufe ("))
        md.append(f"| {k} | {p(a) if ganz or not (a and a < 1000) else p(a, 2)} | {p(b) if ganz or not (b and b < 1000) else p(b, 2)} |")
    kopf_k = " je Korpus |" if mehrere else ""
    md += ["", "## Merkmale (Anteil = viral mit Merkmal / viral kodiert)",
           "| Merkmal | viral | Anteil | untere Grenze 95 % | belastbar | Vergleich | Δ (Pp) | Stärke | Unterscheider |" + kopf_k + " Belege | Gegenbeispiele |",
           "|---|---|---|---|---|---|---|---|---|" + ("---|" if mehrere else "") + "---|---|"]
    for z in zeilen:
        md.append(f"| {z['merkmal']} | {z['k']}/{z['n']} | {prozent(z['anteil'])} | {prozent(z['wilson'])} | {'ja' if z['belastbar'] else 'vorläufig'} | "
                  f"{(str(z['kc']) + '/' + str(z['nc'])) if z['nc'] else '–'} | {p(None if z['diff'] is None else 100 * z['diff'])} | "
                  f"{z['staerke']} | {z['unterscheider']} |" + (f" {z['je_korpus']} |" if mehrere else "") +
                  f" {', '.join(z['belege'])} | {', '.join(z['gegen'])} |")
    md += ["", "## Zahlen und Zielkorridore (Korridor = 25.–75. Perzentil der viralen Videos)",
           "| Wert | Quelle | n | Median viral | Korridor | Spanne | Median Vergleich |", "|---|---|---|---|---|---|---|"]
    for z in zahlen:
        md.append(f"| {z['wert']} | {z['quelle']} | {z['n']} | {p(z['median'], 2)} | {p(z['q1'], 2)}–{p(z['q3'], 2)} | "
                  f"{p(z['min'], 2)}–{p(z['max'], 2)} | {p(z['median_c'], 2)} |")
    md += ["", "## Sättigung (neue Merkmale mit Endanteil ≥ 25 % je Video, Reihenfolge wie korpus.csv)", "| Video | neue Merkmale |", "|---|---|"]
    for vid, neu in neu_je:
        md.append(f"| {vid} | {', '.join(neu) or '–'} |")
    if warnungen:
        md += ["", "## Warnungen"] + [f"- {w}" for w in warnungen]
    (aus / "matrix.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    karten = [f"# Regelkandidaten Korpus „{kname}“ (Stand {heute})", "",
              "Vorbefüllt aus der Matrix. Für jede Karte in eigenen Worten ergänzen: Regel, Wirkung (Hypothese), Umsetzung. "
              "Erst nach Freigabe des Inhabers wird daraus eine Regel im Hirn (synthese.md › Freigabe).", ""]
    nr = 0
    for z in zeilen:
        if z["staerke"] not in ("Gesetz", "Muster"):
            continue
        nr += 1
        karten += [f"## R{nr:02d} · {z['merkmal']}",
                   f"- **Stärke:** {z['staerke']} ({'belastbar' if z['belastbar'] else 'vorläufig'}) · {z['k']} von {z['n']} viralen Videos ({prozent(z['anteil'])}, untere Grenze {prozent(z['wilson'])})"
                   + (f" · je Korpus: {z['je_korpus']}" if mehrere else ""),
                   "- **Gilt für:** Account 1 · Account 2 · beide · keiner (Grund)",
                   f"- **Vergleich:** {(str(z['kc']) + ' von ' + str(z['nc']) + ' (' + prozent(z['anteil_c']) + ')') if z['nc'] else 'keine Daten'} · Unterscheider: {z['unterscheider']}",
                   f"- **Belege:** {', '.join(z['belege'])} · **Gegenbeispiele:** {', '.join(z['gegen']) or 'keine'}",
                   "- **Regel (eigene Worte):** …", "- **Warum es wirkt (S):** …", "- **Umsetzung in der Produktion:** …", ""]
    meiden = [z for z in zeilen if z["unterscheider"].startswith("vermeiden") and (z["anteil_c"] or 0) >= 0.5]
    if meiden:
        karten += ["## Vermeiden (häufig in schwachen, selten in viralen Videos)", ""]
        for z in meiden:
            nr += 1
            karten += [f"## R{nr:02d} · NICHT: {z['merkmal']}",
                       f"- viral {z['k']} von {z['n']} ({prozent(z['anteil'])}) · Vergleich {z['kc']} von {z['nc']} ({prozent(z['anteil_c'])})",
                       "- **Regel (eigene Worte):** …", "- **Warum es schadet (S):** …", ""]
    karten += ["## Zielkorridore (Zahlen)", ""]
    for z in zahlen:
        if z["n"] >= 3:
            karten.append(f"- **{z['wert']}:** Median {p(z['median'], 2)}, Korridor {p(z['q1'], 2)}–{p(z['q3'], 2)} (n = {z['n']}; Vergleich {p(z['median_c'], 2)})")
    (aus / "regelkandidaten.md").write_text("\n".join(karten) + "\n", encoding="utf-8")
    (aus / "kennzahlen.json").write_text(json.dumps({
        "stand": heute, "korpus": kname, "viral": len(viral), "viral_analysiert": len(v_ok), "vergleich": len(vergleich),
        "vergleich_analysiert": len(c_ok), "creator": creator, "minimum_erreicht": not mangel, "mangel": mangel, "ziel_erreicht": ziel,
        "gesaettigt": gesaettigt, "erfolg": erfolg, "merkmale": [{k: v for k, v in z.items()} for z in zeilen], "zahlen": zahlen,
        "saettigung": neu_je, "warnungen": warnungen}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Synthese {kname}: {len(v_ok)}/{len(viral)} viral, {len(c_ok)}/{len(vergleich)} Vergleich analysiert · "
          f"{sum(1 for z in zeilen if z['staerke'] == 'Gesetz')} Gesetze, {sum(1 for z in zeilen if z['staerke'] == 'Muster')} Muster · "
          f"Minimum {'ja' if not mangel else 'nein'} · Sättigung {'ja' if gesaettigt else 'nein'} → {aus / 'matrix.md'}")


if __name__ == "__main__":
    main()
