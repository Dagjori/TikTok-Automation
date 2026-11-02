#!/usr/bin/env python3
"""Prüft die messbaren Punkte der Prüfliste aus docs/15-massstab.md §11 und gibt eine Tabelle ja/nein aus.

Aufruf (im Ordner pipeline/):
  python3 qc/massstab.py projekte/<name>                      Standard-Profil „ben“ (Stimme Ben, Original-Einstellungen)
  python3 qc/massstab.py projekte/<name> --profil massstab    Zielbereiche der Vorbilder (2,5–2,9 W/s usw.)
  python3 qc/massstab.py projekte/<name> --ziel tempo=2.0:2.5 --ziel woerter=140:180 --ziel satzpause_max=0.7
  python3 qc/massstab.py projekte/<name> --json               maschinenlesbar

Liest: skript.json, audio/timing.json (sonst audio/timing_schaetzung.json, dann als „geschätzt“ markiert),
       audio/ereignisse.json (schreibt render.js aus dem Ereignis-Protokoll der Bausteine), szene.js.
Exit-Code 1, wenn ein Pflichtpunkt „nein“ ist (Kennzahlen mit Zielbereich zählen als Pflicht, Hinweise nicht).

Hinweis zu den Zielbereichen (Stand 31.10.2026): Die Stimme „Ben“ läuft mit den gespeicherten Original-Einstellungen
von ElevenLabs (Wunsch des Inhabers). Gemessen: ca. 2,0 Wörter/s, Satzpausen 0,5–0,7 s. Deshalb prüft das Standard-
Profil Tempo, Satzpausen und Wortzahl gegen die Ben-Werte; die Werte der Vorbilder stehen in der Spalte „Maßstab“.
"""
import json
import re
import statistics
import sys
from pathlib import Path

SCHLUSS = "Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare."
# Schlusssatz je Konto (skript.json „konto“); Account 2 @stelldirvor.pov laut Auftrag des Inhabers 01.11.
SCHLUSS_KONTO = {"stelldirvor": "Welches Szenario soll ich als Nächstes durchspielen? Schreib es in die Kommentare."}

PROFILE = {
    # Stimme Ben, Original-Einstellungen (Entscheidung 31.10.)
    "ben": {"tempo": (1.9, 2.4), "satzpause_max": 0.8, "woerter": (130, 170), "laenge": (65, 80), "satzlaenge_median": (4, 8)},
    # Vorbilder K1–K4 (docs/15 §2)
    "massstab": {"tempo": (2.5, 2.9), "satzpause_max": 0.4, "woerter": (170, 220), "laenge": (65, 80), "satzlaenge_median": (4, 8)},
}
MASSSTAB_TEXT = {
    "tempo": "2,5–2,9 W/s",
    "satzpause": "≈ 0,25 s, max. 0,4 s",
    "woerter": "170–220",
    "laenge": "65–80 s",
    "satzlaenge": "Median 4–8, meist < 10",
}
SATZENDE = re.compile(r"[.!?…][\"“”»«’]*$")
KOMMA = re.compile(r"[,;:–—][\"“”»«’]*$")
# Bild-Ereignisse, die für „Lücke ohne neues Bild-Ereignis“ nicht zählen
NICHT_BILD = {"untertitel", "chip-weg", "schleife"}
NICHT_KAMERA = {"folgen", "atmen"}


def zahl(x, nk=2):
    return f"{x:.{nk}f}".replace(".", ",")


def norm(w):
    return re.sub(r"[^\wäöüß']", "", w.lower())


def lade(projekt):
    skript = json.loads((projekt / "skript.json").read_text(encoding="utf-8"))
    tpfad = projekt / "audio" / "timing.json"
    geschaetzt = False
    if not tpfad.exists():
        tpfad = projekt / "audio" / "timing_schaetzung.json"
        geschaetzt = True
    timing = json.loads(tpfad.read_text(encoding="utf-8")) if tpfad.exists() else None
    epfad = projekt / "audio" / "ereignisse.json"
    ereignisse = json.loads(epfad.read_text(encoding="utf-8")) if epfad.exists() else None
    szene = (projekt / "szene.js").read_text(encoding="utf-8") if (projekt / "szene.js").exists() else ""
    return skript, timing, geschaetzt, ereignisse, szene


def satz_liste(woerter):
    saetze, akt = [], []
    for i, w in enumerate(woerter):
        akt.append(w)
        if SATZENDE.search(w["wort"]) or i == len(woerter) - 1:
            saetze.append(akt)
            akt = []
    return saetze


def laengste_luecke(ereignisse, von, bis, mit_laufenden=True):
    """Längste Zeitspanne in [von, bis] ohne Bild-Ereignis. Laufende Ereignisse (Zähler, Uhr) decken ihr Intervall ab."""
    abdeckung = []
    for e in ereignisse:
        if e.get("typ") in NICHT_BILD or e.get("bild") is False:
            continue
        if e.get("typ") == "kamera" and e.get("art") in NICHT_KAMERA:
            continue
        a = float(e["t"])
        b = a + (float(e.get("dauer") or 0) if (mit_laufenden and e.get("laufend")) or e.get("typ") in ("uebergang", "kamera") else 0)
        abdeckung.append((a, b))
    abdeckung.sort()
    luecke, wo, ende = 0.0, (von, von), von
    for a, b in abdeckung:
        if b < von or a > bis:
            continue
        if a > ende and a - ende > luecke:
            luecke, wo = a - ende, (ende, a)
        ende = max(ende, b)
    if bis > ende and bis - ende > luecke:
        luecke, wo = bis - ende, (ende, bis)
    return luecke, wo


def pruefe(projekt, profil, extra_ziele):
    ziele = dict(PROFILE[profil])
    ziele.update(extra_ziele)
    skript, timing, geschaetzt, ev, szene = lade(projekt)
    zeilen = []

    def zeile(nr, punkt, ist, ziel, massstab, ok, pflicht=True):
        zeilen.append({"nr": nr, "punkt": punkt, "ist": ist, "ziel": ziel, "massstab": massstab, "ok": ok, "pflicht": pflicht})

    if not timing:
        print("Kein Timing gefunden (audio/timing.json bzw. timing_schaetzung.json). Erst tts.py oder render.js ausführen.")
        sys.exit(2)
    segmente = timing["segmente"]
    woerter = [w for s in segmente for w in s["woerter"]]
    saetze = satz_liste(woerter)
    erstes, letztes = woerter[0], woerter[-1]
    stimm_ende = float(timing.get("dauer") or letztes["ende"])
    ereignisse = (ev or {}).get("ereignisse") or []
    protokoll = bool((ev or {}).get("protokoll"))
    dauer = float((ev or {}).get("dauer") or 0) or None
    ms = (ev or {}).get("massstab") or {}

    # 1 Stimme startet
    zeile("1", "Stimme startet", f"{zahl(erstes['start'])} s", "< 0,2 s", "0,08–0,16 s", erstes["start"] < 0.2)

    # 2 Hook fertig vor 5 s, max. 2 Sätze
    hook = next((s for s in segmente if s["id"] == "hook"), segmente[0])
    hook_saetze = len(satz_liste(hook["woerter"]))
    zeile("2", "Hook fertig gesprochen", f"{zahl(hook['ende'])} s, {hook_saetze} Sätze", "vor 5 s, max. 2 Sätze", "3,4–5,2 s", hook["ende"] < 5.0 and hook_saetze <= 2)

    # 3 Denkfalle und Startsignal vor 16 s (Text)
    n = [norm(w["wort"]) for w in woerter]
    t_klar = next((w["start"] for w, x in zip(woerter, n) if x == "klar"), None)
    t_oder = next((w["start"] for w, x in zip(woerter, n) if x == "oder" and t_klar is not None and w["start"] >= t_klar and SATZENDE.search(w["wort"])), None)
    t_los = next((woerter[i]["start"] for i in range(len(n) - 1) if n[i] == "los" and n[i + 1].startswith("geht")), None)
    ok3 = t_klar is not None and t_oder is not None and max(t_klar, t_oder) < 16
    ist3 = f"Klar {zahl(t_klar) if t_klar is not None else '–'} · oder? {zahl(t_oder) if t_oder is not None else '–'}"
    zeile("3", "Denkfalle „Klar …, oder?“ (ruhig)", ist3, "vor 16 s", "3–15,5 s", ok3, pflicht=False)
    # 3b Inhaber 02.11.: kein „Los geht's“, kein Geschrei – ruhiger Erzählton wie die Vorbilder (docs/15: „ruhig, sachlich, freundlich“)
    zeile("3b", "Kein „Los geht's“ (Inhaber 02.11.)", "fehlt" if t_los is None else f"bei {zahl(t_los)} s", "nicht vorhanden", "ruhiger Erzählton", t_los is None)

    # 4 Ab Rennstart laufen Uhr bzw. Zähler
    if protokoll:
        laufend = [e for e in ereignisse if e.get("laufend") and e.get("typ") in ("uhr", "zaehler", "ring")]
        nach_start = [e for e in laufend if t_los is None or e["t"] >= t_los - 0.5]
        zeile("4", "Uhr/Zähler laufen ab Rennstart", f"{len(nach_start)} Laufphasen", "≥ 1", "Uhr bzw. Zähler sichtbar", len(nach_start) > 0, pflicht=False)

    # 5 Längste Lücke zwischen Bild-Ereignissen
    if protokoll:
        bis = dauer or stimm_ende
        l1, wo1 = laengste_luecke(ereignisse, 0.0, bis, True)
        l2, wo2 = laengste_luecke(ereignisse, 0.0, bis, False)
        zeile("5", "Längste Phase ohne Bild-Ereignis", f"{zahl(l1)} s ({zahl(wo1[0], 1)}–{zahl(wo1[1], 1)} s)", "≤ 2 s", "1,7 s (K3)", l1 <= 2.0)
        zeile("5b", "… ohne laufende Zähler/Uhren gerechnet", f"{zahl(l2)} s ({zahl(wo2[0], 1)}–{zahl(wo2[1], 1)} s)", "≤ 2 s (Hinweis)", "–", l2 <= 2.0, pflicht=False)
        bild = [e for e in ereignisse if e.get("typ") not in NICHT_BILD and e.get("bild") is not False]
        zeile("5c", "Bild-Ereignisse je Sekunde", zahl(len(bild) / max(1e-9, bis), 2), "≥ 0,5 (Hinweis)", "alle 1–2 s neu", len(bild) / max(1e-9, bis) >= 0.5, pflicht=False)
        # 5d/5e Gesundes Maß (Inhaber 01.11.: „wir übertreiben mit den Stickern“): große Sticker/Stempel nur an
        # Dramaturgie-Punkten, max. 5 je Video, mind. 5 s Abstand; Chips nur mit neuer Zahl bzw. Info.
        st = sorted(e["t"] for e in ereignisse if e.get("typ") in ("stempel", "sticker"))
        abst = min((b - a for a, b in zip(st, st[1:])), default=None)
        # Inhaber 02.11.: „auch der Sticker muss nicht sein“ – keine großen Sticker/Stempel mehr; Dynamik aus Welt und Kamera
        ok5d = len(st) == 0
        zeile("5d", "Keine großen Sticker/Stempel (Inhaber 02.11.)", f"{len(st)}×", "0", "Dynamik aus Welt, Kamera, Zählern", ok5d)
        chips = sum(1 for e in ereignisse if e.get("typ") == "chip")
        zeile("5e", "Chips gesamt", f"{chips}", "≤ 15 (Hinweis)", "–", chips <= 15, pflicht=False)
    else:
        zeile("5", "Längste Phase ohne Bild-Ereignis", "kein Ereignis-Protokoll", "≤ 2 s", "1,7 s (K3)", False)

    # 6 Erste Wendung 18–25 s (Text-Heuristik: Satz beginnt mit Aber/Doch/Jetzt/Und das)
    wendungen = [s[0]["start"] for s in saetze if norm(s[0]["wort"]) in ("aber", "doch") or (len(s) > 2 and norm(s[0]["wort"]) == "und" and norm(s[1]["wort"]) == "das")]
    erste = next((t for t in wendungen if t >= 15), None)
    zeile("6", "Erste Wendung (Satz mit „Aber/Doch …“)", f"{zahl(erste, 1) if erste is not None else '–'} s", "18–25 s (Hinweis)", "18,4–20,8 s", erste is not None and 18 <= erste <= 25, pflicht=False)

    # 7 Folgen-Aufruf
    if protokoll:
        f = [e for e in ereignisse if e.get("typ") == "folgen"]
        if f:
            e = f[0]
            ok = 15 <= e["t"] <= 25 and float(e.get("dauer") or 0) <= 2.0
            zeile("7", "Folgen-Aufruf", f"{zahl(e['t'], 1)} s, {zahl(float(e.get('dauer') or 0), 1)} s lang", "15–25 s, max. 2 s", "(eigene Regel, ca. 20 s)", ok)
        else:
            zeile("7", "Folgen-Aufruf", "fehlt", "15–25 s, max. 2 s", "(eigene Regel, ca. 20 s)", False)
    else:
        zeile("7", "Folgen-Aufruf", "kein Ereignis-Protokoll", "15–25 s, max. 2 s", "(eigene Regel)", False)

    # 16 Ruhiger Ton (Inhaber 02.11.): keine aufgeregten Audio-Tags, wenige Ausrufezeichen im Sprechtext
    sprech = " ".join(str(sg.get("sprechtext", "")) for sg in skript.get("segmente", []))
    laut = sorted(set(m.group(0) for m in re.finditer(r"\[[^\]]*(excit|shout|yell|scream|energ|enthus|thrill|hype|aufgeregt|schrei|ruf)[^\]]*\]", sprech, re.I)))
    zeile("16a", "Keine aufgeregten Audio-Tags (Inhaber 02.11.)", ", ".join(laut) if laut else "keine", "keine", "ruhig, sachlich, freundlich", not laut)
    ausruf = sprech.count("!")
    zeile("16b", "Ausrufezeichen im Sprechtext", str(ausruf), "≤ 3 (Hinweis)", "Erzähler-Ton", ausruf <= 3, pflicht=False)

    # 8 „Warum?“
    t_warum = next((w["start"] for w, x in zip(woerter, n) if x == "warum" and w["wort"].endswith("?")), None)
    zeile("8", "„Warum?“ nach dem Ergebnis", f"{zahl(t_warum, 1)} s" if t_warum is not None else "fehlt", "vorhanden (Hinweis)", "50–55 s", t_warum is not None, pflicht=False)

    # 10 Schlusssatz exakt
    letzter_text = " ".join(skript["segmente"][-1]["text"].split())
    gesprochen = " ".join(w["wort"] for w in woerter)
    schluss = SCHLUSS_KONTO.get(skript.get("konto"), SCHLUSS)
    ok10 = letzter_text == schluss or gesprochen.endswith(schluss)
    zeile("10", "Schlusssatz exakt", "ja" if ok10 else f"„{letzter_text[-60:]}“", f"„{' '.join(schluss.split()[:3])} … Kommentare.“", "Frage an den Zuschauer", ok10)

    # 11 Schleife
    sp = ms.get("schleifenPruefung") if ms else None
    if sp:
        zeile("11", "Letztes Bild = erstes Bild", "ja" if sp.get("ok") else f"nein ({len(sp.get('nurErstesBild', [])) + len(sp.get('nurLetztesBild', []))} HUD-Unterschiede, Kamera {sp.get('kameraAbweichung')})", "ja", "K3, K4", bool(sp.get("ok")), pflicht=False)
    else:
        zeile("11", "Letztes Bild = erstes Bild", "nicht geprüft", "ja", "K3, K4", False, pflicht=False)

    # 12 Sprache: Wörter, Tempo, Satzlängen, Satzpausen, Länge
    anzahl = len(woerter)
    sprechzeit = max(1e-9, letztes["ende"] - erstes["start"])
    tempo = anzahl / sprechzeit
    lw = [len(s) for s in saetze]
    med = statistics.median(lw)
    unter10 = sum(1 for x in lw if x < 10) / len(lw)
    pausen = [woerter[i + 1]["start"] - woerter[i]["ende"] for i in range(len(woerter) - 1) if SATZENDE.search(woerter[i]["wort"])]
    kommas = [woerter[i + 1]["start"] - woerter[i]["ende"] for i in range(len(woerter) - 1) if KOMMA.search(woerter[i]["wort"])]
    a, b = ziele["woerter"]
    zeile("12a", "Wörter", str(anzahl), f"{a}–{b}", MASSSTAB_TEXT["woerter"], a <= anzahl <= b)
    a, b = ziele["tempo"]
    zeile("12b", "Sprechtempo", f"{zahl(tempo)} W/s", f"{zahl(a, 1)}–{zahl(b, 1)} W/s", MASSSTAB_TEXT["tempo"], a <= tempo <= b)
    a, b = ziele["satzlaenge_median"]
    zeile("12c", "Wörter je Satz", f"Median {zahl(med, 1)}, max. {max(lw)}, {round(unter10 * 100)} % unter 10", f"Median {a}–{b}, ≥ 75 % unter 10", MASSSTAB_TEXT["satzlaenge"], a <= med <= b and unter10 >= 0.75)
    if pausen:
        pm, px = statistics.median(pausen), max(pausen)
        zeile("12d", "Pause nach Satzende", f"Median {zahl(pm)} s, max. {zahl(px)} s", f"max. ≤ {zahl(ziele['satzpause_max'], 1)} s", MASSSTAB_TEXT["satzpause"], px <= ziele["satzpause_max"] + 1e-9)
    if kommas:
        zeile("12e", "Pause nach Komma (Kennzahl)", f"Median {zahl(statistics.median(kommas))} s", "–", "0,25–0,3 s", True, pflicht=False)
    laenge = dauer if dauer else stimm_ende
    a, b = ziele["laenge"]
    zeile("12f", "Videolänge", f"{zahl(laenge, 1)} s" + ("" if dauer else " (nur Stimme)"), f"{a}–{b} s", MASSSTAB_TEXT["laenge"], a <= laenge <= b)
    if dauer:
        nach = dauer - stimm_ende
        zeile("12g", "Nach dem letzten Wort", f"{zahl(nach, 1)} s", "0,5–1,0 s (Hinweis)", "0,5–1,0 s", 0.5 <= nach <= 1.0, pflicht=False)

    # 13 Ton: Teppich, Akzent auf der Pointe
    teppich = (ev or {}).get("teppich") or skript.get("klangteppich")
    zeile("13a", "Klangteppich zum Thema", teppich or "nicht gesetzt", "gesetzt", "Regen, Wasser, Meer, Nachtfahrt, Musik", bool(teppich), pflicht=False)
    if protokoll:
        akz = [e for e in ereignisse if e.get("typ") == "pointe" or e.get("klang") == "akzent"]
        zeile("13b", "Akzent-Klang auf der Pointe", f"{len(akz)}×", "≥ 1", "K1, K2", len(akz) > 0, pflicht=False)

    # 14 Untertitel: Wort für Wort im Stil „kontur“ (Entscheidung des Inhabers 01.11.; Maßstab: Phrasen)
    ut = ms.get("untertitel") if ms else None
    stil_ut = (ut or {}).get("stil", "unbekannt")
    zeile("14", "Untertitel Wort für Wort (kontur)", stil_ut, "kontur (Inhaber 01.11.)", "Phrasen 2–5 Wörter", stil_ut == "kontur")

    # 15 Kein Kanalname, kein Logo, keine Rubrik
    funde = re.findall(r"SIMULIERBAR|new Markenleiste\(|WUERFEL|logoGross|rubrik:|stelldirvor|STELLDIRVOR|marke/account2", szene)
    zeile("15", "Kein Kanalname/Logo/Rubrik (szene.js)", "keine Fundstelle" if not funde else ", ".join(sorted(set(funde))), "keine Fundstelle", "kein Logo, keine Rubrik", not funde)

    return zeilen, {"profil": profil, "ziele": ziele, "timing": "geschätzt" if geschaetzt else "echt", "protokoll": protokoll}


def tabelle(zeilen, info, projekt):
    print(f"Maßstab-Prüfung · {projekt.name} · Profil „{info['profil']}“ · Timing {info['timing']}" + ("" if info["protokoll"] else " · OHNE Ereignis-Protokoll"))
    kopf = ("Nr", "Prüfpunkt", "Ist", "Ziel", "Maßstab (Vorbilder)", "ok")
    reihen = [(z["nr"], z["punkt"], z["ist"], z["ziel"] + ("" if z["pflicht"] else ""), z["massstab"], ("ja" if z["ok"] else "NEIN") + ("" if z["pflicht"] else " (H)")) for z in zeilen]
    breiten = [min(60, max(len(str(r[i])) for r in reihen + [kopf])) for i in range(len(kopf))]
    def fmt(r):
        return " | ".join(str(r[i])[: breiten[i]].ljust(breiten[i]) for i in range(len(r)))
    print(fmt(kopf))
    print("-+-".join("-" * b for b in breiten))
    for r in reihen:
        print(fmt(r))
    pflicht = [z for z in zeilen if z["pflicht"]]
    ok = sum(1 for z in pflicht if z["ok"])
    print(f"\nPflichtpunkte: {ok} von {len(pflicht)} ja · Hinweise (H): {sum(1 for z in zeilen if not z['pflicht'] and z['ok'])} von {sum(1 for z in zeilen if not z['pflicht'])} ja")
    if info["timing"] == "geschätzt":
        print("Achtung: Timing ist geschätzt (keine Stimme). Tempo und Pausen gelten erst mit audio/timing.json.")


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        sys.exit(2)
    projekt = Path(args[0]).resolve()
    profil = "ben"
    extra = {}
    i = 1
    while i < len(args):
        if args[i] == "--profil":
            profil = args[i + 1]
            i += 1
        elif args[i] == "--ziel":
            k, v = args[i + 1].split("=")
            if ":" in v:
                a, b = v.split(":")
                extra[k] = (float(a), float(b))
            else:
                extra[k] = float(v)
            i += 1
        i += 1
    if profil not in PROFILE:
        print(f"Profil „{profil}“ unbekannt. Möglich: {', '.join(PROFILE)}")
        sys.exit(2)
    zeilen, info = pruefe(projekt, profil, extra)
    if "--json" in args:
        print(json.dumps({"info": info, "zeilen": zeilen}, ensure_ascii=False, indent=1))
    else:
        tabelle(zeilen, info, projekt)
    sys.exit(0 if all(z["ok"] for z in zeilen if z["pflicht"]) else 1)


if __name__ == "__main__":
    main()
