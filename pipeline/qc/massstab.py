#!/usr/bin/env python3
"""Prüft die messbaren Punkte für Simulierbar-Videos (Skill .claude/skills/video-produktion/, Teil simulierbar.md; Regeln: Hirn
„REA Simulierbar Regelwerk“, „Videoaufbau Simulierbar“, „Maßstab Simulierbar“) und gibt eine Tabelle ja/nein aus.

Seit 07.11.2026 (REA-Regelwerk freigegeben): Folgen-Aufruf nur noch Hinweis (7), Schlusskarte statt festem Schlusssatz (10),
Schleife freiwillig (11), Untertitel in Blöcken von höchstens 4 Wörtern (14) und die REA-Punkte R1–R7 (Titel ab Bild 1, Tafel ab
Bild 0, Erklärgrafik, neutrale Erzählhaltung, Endstand, Kipp-Moment, erster Satz).
Seit 08.11.2026 (Wahl des Inhabers): 7 = Folgen-Hinweis als nicht gesprochene Textzeile am Ende (M.hinweis), Pflicht und nur im
Testblock folgen_hinweis = „mit“ (skript.json → testbloecke, tools/testblock.py); M.folgen bei ca. 20 s ist ersetzt.
Seit 08.11.2026: 12h = Auflösung des fertigen MP4 (pipeline/out/<name>/<name>.mp4) genau 1080×1920, Pflicht (CRP-Zusatzbonus);
vor dem Render gibt es kein MP4, dann entfällt der Punkt.
Seit 09.11.2026 (Entscheidung des Inhabers): KEINE Sprechtempo-Regeln mehr. Entfernt sind 12b (Wörter bzw. Silben je Sekunde),
12d und 12d2 (gemessene Satzpausen), 12e (Komma-Pause) und alle Tempo-Profile. Das Video folgt der fertigen Stimme
(audio/timing.json), nie umgekehrt. Nur noch Hinweis sind: 2 (Hook-Zeit), 12a (Wortzahl), 12c (Satzlängen), 12f2 (Richtwert
65–80 s) und R5 (Endstand; der Aufbau-Standard ändert sich: Zähler ab Sekunde 3, erste Wendung bis 12–15 s, Ergebnis bei
ca. 75–80 % der Länge). Pflicht bleibt bei der Länge allein 12f: mindestens 61 s (Creator Rewards verlangt über 60 s).

Aufruf (im Ordner pipeline/):
  python3 qc/massstab.py projekte/<name>                      Prüfung (einziges Profil „ben“)
  python3 qc/massstab.py projekte/<name> --ziel woerter=140:180 --ziel laenge_min=61   Richtwerte bzw. Mindestlänge überschreiben
  python3 qc/massstab.py projekte/<name> --json               maschinenlesbar
  (--profil ben_alt|ben_0211|massstab und --ziel tempo=…/silben=…/satzpause_…=… gibt es nicht mehr; sie werden mit Hinweis übergangen.)
Tests: python3 qc/massstab_test.py

Liest: skript.json, audio/timing.json (sonst audio/timing_schaetzung.json, dann als „geschätzt“ markiert),
       audio/ereignisse.json (schreibt render.js aus dem Ereignis-Protokoll der Bausteine), szene.js.
Exit-Code 1, wenn ein Pflichtpunkt „nein“ ist (Kennzahlen mit Zielbereich zählen als Pflicht, Hinweise nicht).

Hinweis zu den Richtwerten: 150–190 Wörter und 65–80 s sind nur noch eine grobe Orientierung (Hinweis). Die Stimme „Ben“
(Eleven v4) spricht, wie sie spricht; sie wird nie beschleunigt und nicht für Länge, Tempo oder Pausen neu vertont.
"""
import json
import re
import shutil
import statistics
import subprocess
import sys
from pathlib import Path

# Seit 07.11.2026 gibt es keinen festen Schlusssatz mehr (Inhaber: „Satz fällt ganz weg“); das Video endet auf der Schlusskarte.
# Am Ende stehen weder Frage noch Aufruf (REA: mit offener Frage enden 1/6 stark gegen 2/3 schwach).
AUFRUF = re.compile(r"kommentar|folg\w*\s+mir|abonnier|schreib\w*\s+(es|uns|mir)|lass\w*\s+(ein|uns)", re.I)
# Neutrale Erzählhaltung (Inhaber 07.11.): Du-Ansprache höchstens im Hook (und im Folgen-Aufruf eines Testvideos).
DU = re.compile(r"\b(du|dich|dir|dein|deine|deinen|deinem|deiner|deines)\b", re.I)
DU_ERLAUBT = {"hook", "folgen"}
# Erklärgrafik (REA R04, belastbar 6/6): Balken, Formel- bzw. Vergleichskarte oder Bilanz
ERKLAERGRAFIK = {"balken", "formel", "bilanz"}
# Skill-Kennungen von Account 1 (alt bis 06.11. und neu seit 07.11.)
SKILLS_A1 = {"simulierbar-video", "video-produktion"}

# Seit 09.11.2026 (Entscheidung des Inhabers) gibt es keine Tempo-Profile mehr (ben_alt, ben_0211, massstab und die Werte
# tempo, silben, satzpause_max, satzpause_median sind entfernt). Wortzahl, Satzlänge und Länge 65–80 s sind Richtwerte
# (Hinweis); Pflicht ist nur die Mindestlänge des Videos (Creator Rewards: über 60 s).
PROFILE = {
    "ben": {"woerter": (150, 190), "laenge": (65, 80), "laenge_min": 61.0, "satzlaenge_median": (3, 5)},
}
ALTE_PROFILE = {"ben_alt", "ben_0211", "massstab"}                     # werden mit Hinweis als „ben“ geprüft
ALTE_ZIELE = {"tempo", "silben", "satzpause_max", "satzpause_median"}  # werden mit Hinweis übergangen
MASSSTAB_TEXT = {
    "woerter": "170–220",
    "laenge": "65–80 s",
    "satzlaenge": "Median 4–8, meist < 10",
}
SATZENDE = re.compile(r"[.!?…][\"“”»«’]*$")
# Bild-Ereignisse, die für „Lücke ohne neues Bild-Ereignis“ nicht zählen
NICHT_BILD = {"untertitel", "chip-weg", "schleife"}
NICHT_KAMERA = {"folgen", "atmen"}
# Erlaubte Stile für Simulierbar (Inhaber 02.11.2026 abends): 1–15 und 17–21 (Qualitätslatte per Sichtprüfung, siehe stile.md).
# Stil 16 (Lunar-POV) gehört ausschließlich zu Account 2 (@stelldirvor.pov).
ERLAUBTE_STILE = set(range(1, 16)) | set(range(17, 22))
# Module von Account 2: gehören nie in eine Simulierbar-Szene (Trennung der Accounts)
ACCOUNT2_MODULE = r"stil_lunar_pov\.js|lunar_hud\.js|welt_grossstadt_dach\.js"


def zahl(x, nk=2):
    return f"{x:.{nk}f}".replace(".", ",")


def norm(w):
    return re.sub(r"[^\wäöüß']", "", w.lower())


# Folgen-Hinweis (Wahl des Inhabers 08.11.2026, Hirn „Regelwerk Simulierbar“): ersetzt den Folgen-Aufruf bei ca. 20 s (M.folgen) durch
# eine nicht gesprochene Textzeile unter der Schlusskarte in den letzten 2–3 s (M.hinweis), nur im Testblock folgen_hinweis = „mit“
# (tools/testblock.py, skript.json → testbloecke). An den Inhalt gebunden; kein Tausch, keine Belohnung, kein Druck.
HINWEIS_FENSTER_S = 3.5          # Hinweis beginnt frühestens 3,5 s vor dem Ende (letzte 2–3 s, kleine Toleranz)
HINWEIS_MAX_WOERTER = 10
DRUCK = re.compile(r"folg\w*\s+(mir|uns|jetzt|sofort|für|fuer)|wenn\s+du\s+(mir\s+|uns\s+)?folgst|nicht\s+verpassen|verpass|sonst\b|gewinn|verlos|gratis|"
                   r"geschenk|belohn|abonnier|\blike\b|\bfolgen\s*!|\bjetzt\b", re.I)


def folgen_hinweis(ereignisse, testbloecke, laenge, woerter):
    """Prüfpunkt 7 seit 08.11.2026 → (ist, ok). testbloecke: skript.json → testbloecke; woerter: Wortzeiten der Stimme."""
    variante = (testbloecke or {}).get("folgen_hinweis")
    alt = [e for e in ereignisse if e.get("typ") == "folgen"]
    h = [e for e in ereignisse if e.get("typ") == "folgen_hinweis"]
    if alt:
        return f"M.folgen bei {zahl(float(alt[0]['t']), 1)} s (seit 08.11. ersetzt durch M.hinweis am Ende)", False
    if variante != "mit":
        if h:
            return f"Hinweis „{h[0].get('text', '')}“, aber Testblock {variante or '–'} (nur bei „mit“)", False
        return f"kein Hinweis (Testblock {variante or 'keiner'})", True
    if not h:
        return "Testblock „mit“, aber kein M.hinweis am Ende", False
    e = h[0]
    text = " ".join(str(e.get("text", "")).split())
    t = float(e["t"])
    probleme = []
    if not text:
        probleme.append("leer")
    if laenge and t < laenge - HINWEIS_FENSTER_S:
        probleme.append(f"zu früh ({zahl(t, 1)} s, Ende {zahl(laenge, 1)} s)")
    if len(text.split()) > HINWEIS_MAX_WOERTER:
        probleme.append(f"{len(text.split())} Wörter (höchstens {HINWEIS_MAX_WOERTER})")
    druck = DRUCK.search(text)
    if druck:
        probleme.append(f"Druck/Tausch „{druck.group(0)}“")
    gesprochen = " ".join(norm(w["wort"]) for w in woerter if float(w.get("start", 0)) >= t - 6)
    if text and len(text.split()) >= 2 and " ".join(norm(w) for w in text.split()) in gesprochen:
        probleme.append("wird gesprochen (soll nur Textzeile sein)")
    ist = f"„{text}“ bei {zahl(t, 1)} s" + (f": {', '.join(probleme)}" if probleme else "")
    return ist, not probleme


def video_pfad(projekt):
    """Fertiges MP4 des Projekts (pipeline/out/<name>/<name>.mp4, wie render warten es ablegt), sonst None."""
    p = projekt.parent.parent / "out" / projekt.name / f"{projekt.name}.mp4"
    return p if p.is_file() else None


def aufloesung(video):
    """(Breite, Höhe) der Videospur per ffprobe; (None, None) ohne ffprobe oder bei unlesbarer Datei."""
    if not shutil.which("ffprobe"):
        return None, None
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", str(video)],
                       capture_output=True, text=True)
    try:
        b, h = r.stdout.strip().splitlines()[0].split("x")[:2]
        return int(b), int(h)
    except (IndexError, ValueError):
        return None, None


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


def pruefe(projekt, profil, extra_ziele, daten=None):
    """daten = (skript, timing, geschaetzt, ereignisse, szene) statt aus dem Projektordner zu laden (projekt darf dann
    None sein). Alte Tempo-Ziele in extra_ziele (tempo, silben, satzpause_…) werden übergangen."""
    ziele = dict(PROFILE[profil])
    ziele.update({k: v for k, v in extra_ziele.items() if k not in ALTE_ZIELE})
    skript, timing, geschaetzt, ev, szene = daten if daten is not None else lade(projekt)
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

    # 2 Hook fertig vor 5 s, max. 2 Sätze. Seit 09.11.2026 nur Hinweis: Die Hook-Zeit kommt aus der Stimme und ist keine Regel mehr.
    hook = next((s for s in segmente if s["id"] == "hook"), segmente[0])
    hook_saetze = len(satz_liste(hook["woerter"]))
    hook_max = float(ziele.get("hook_max", 5.0))
    zeile("2", "Hook fertig gesprochen", f"{zahl(hook['ende'])} s, {hook_saetze} Sätze", f"vor {zahl(hook_max, 1)} s, max. 2 Sätze (Hinweis)", "3,4–5,2 s",
          hook["ende"] < hook_max and hook_saetze <= 2, pflicht=False)

    # 3 Denkfalle und Startsignal vor 16 s (Text)
    n = [norm(w["wort"]) for w in woerter]
    t_klar = next((w["start"] for w, x in zip(woerter, n) if x == "klar"), None)
    t_oder = next((w["start"] for w, x in zip(woerter, n) if x == "oder" and t_klar is not None and w["start"] >= t_klar and SATZENDE.search(w["wort"])), None)
    t_los = next((woerter[i]["start"] for i in range(len(n) - 1) if n[i] == "los" and n[i + 1].startswith("geht")), None)
    ok3 = t_klar is not None and t_oder is not None and max(t_klar, t_oder) < 16
    ist3 = f"Klar {zahl(t_klar) if t_klar is not None else '–'} · oder? {zahl(t_oder) if t_oder is not None else '–'}"
    zeile("3", "Denkfalle „Klar …, oder?“ (ruhig)", ist3, "vor 16 s", "3–15,5 s", ok3, pflicht=False)
    # 3b Inhaber 02.11.: kein „Los geht's“, kein Geschrei – ruhiger Erzählton wie die Vorbilder (.claude/skills/simulierbar-video/massstab.md: „ruhig, sachlich, freundlich“)
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

    # 6 Erste Wendung 12–15 s, Hinweis 10–18 s (Standard seit 09.11.2026; Text-Heuristik: Satz beginnt mit Aber/Doch/Und das)
    wendungen = [s[0]["start"] for s in saetze if norm(s[0]["wort"]) in ("aber", "doch") or (len(s) > 2 and norm(s[0]["wort"]) == "und" and norm(s[1]["wort"]) == "das")]
    erste = next((t for t in wendungen if t >= 8), None)
    zeile("6", "Erste Wendung (Satz mit „Aber/Doch …“)", f"{zahl(erste, 1) if erste is not None else '–'} s", "12–15 s (Hinweis)", "18,4–20,8 s", erste is not None and 10 <= erste <= 18, pflicht=False)

    # 7 Folgen-Hinweis (seit 08.11.2026, ersetzt den Folgen-Aufruf bei ca. 20 s): nur im Testblock „mit“ eine nicht gesprochene
    # Textzeile in den letzten 2–3 s (M.hinweis), an Inhalt gebunden; sonst gar nichts. M.folgen ist immer ein Fehler.
    if protokoll:
        ist7, ok7 = folgen_hinweis(ereignisse, skript.get("testbloecke"), dauer or stimm_ende, woerter)
    else:
        ist7, ok7 = "kein Ereignis-Protokoll", False
    zeile("7", "Folgen-Hinweis am Ende (nur Testblock „mit“)", ist7, "„mit“: Textzeile letzte 2–3 s, ohne Druck; sonst keiner", "Inhaber 08.11.: Blocktest 10/10", ok7)

    # 16 Ruhiger Ton (Inhaber 02.11.): keine aufgeregten Audio-Tags, wenige Ausrufezeichen im Sprechtext
    sprech = " ".join(str(sg.get("sprechtext", "")) for sg in skript.get("segmente", []))
    laut = sorted(set(m.group(0) for m in re.finditer(r"\[[^\]]*(excit|shout|yell|scream|energ|enthus|thrill|hype|aufgeregt|schrei|ruf)[^\]]*\]", sprech, re.I)))
    zeile("16a", "Keine aufgeregten Audio-Tags (Inhaber 02.11.)", ", ".join(laut) if laut else "keine", "keine", "ruhig, sachlich, freundlich", not laut)
    ausruf = sprech.count("!")
    zeile("16b", "Ausrufezeichen im Sprechtext", str(ausruf), "≤ 3 (Hinweis)", "Erzähler-Ton", ausruf <= 3, pflicht=False)

    # 8 „Warum?“
    t_warum = next((w["start"] for w, x in zip(woerter, n) if x == "warum" and w["wort"].endswith("?")), None)
    zeile("8", "„Warum?“ nach dem Ergebnis", f"{zahl(t_warum, 1)} s" if t_warum is not None else "fehlt", "vorhanden (Hinweis)", "50–55 s", t_warum is not None, pflicht=False)

    # 10 Schlusskarte statt Schlusssatz (seit 07.11.2026, Inhaber: fester Schlusssatz „fällt ganz weg“): Das Video endet auf einer
    # Fazit- bzw. Pointenkarte (Baustein M.pointe in den letzten 8 s); der letzte Satz ist weder Frage noch Aufruf.
    laenge_gesamt = dauer if dauer else stimm_ende
    letztes_seg = (skript.get("segmente") or [{}])[-1]
    letzter_text = " ".join(str(letztes_seg.get("text", "")).split())
    letzter_sprech = re.sub(r"\[[^\]]*\]", " ", str(letztes_seg.get("sprechtext", "")))
    letzter_satz = " ".join(w["wort"] for w in saetze[-1]) if saetze else ""
    frage = letzter_text.endswith("?") or letzter_satz.rstrip().endswith("?")
    aufruf = AUFRUF.search(" ".join((letzter_text, letzter_sprech, letzter_satz)))
    karte = [e for e in ereignisse if e.get("typ") == "pointe" and float(e["t"]) >= laenge_gesamt - 8.0]
    if not protokoll:
        ist10 = "kein Ereignis-Protokoll"
    else:
        ist10 = (f"Schlusskarte bei {zahl(float(karte[-1]['t']), 1)} s" if karte else "keine Schlusskarte (M.pointe) in den letzten 8 s")
        ist10 += "; endet mit Frage" if frage else ""
        ist10 += f"; Aufruf „{aufruf.group(0)}“" if aufruf else ""
    zeile("10", "Schlusskarte am Ende, keine Frage, kein Aufruf", ist10, "Karte in den letzten 8 s (Inhaber 07.11.)", "Vorbilder 6/6, schwache 1/3", protokoll and bool(karte) and not frage and not aufruf)

    # 11 Schleife (seit 07.11.2026 freiwillig): nur prüfen, wenn das Video eine Schleife setzt
    sp = ms.get("schleifenPruefung") if ms else None
    if not any(e.get("typ") == "schleife" for e in ereignisse):
        zeile("11", "Schleife letztes = erstes Bild (freiwillig)", "nicht genutzt", "freiwillig", "Vorbilder 3/6", True, pflicht=False)
    elif sp:
        zeile("11", "Schleife letztes = erstes Bild (freiwillig)", "ja" if sp.get("ok") else f"nein ({len(sp.get('nurErstesBild', [])) + len(sp.get('nurLetztesBild', []))} HUD-Unterschiede, Kamera {sp.get('kameraAbweichung')})", "wenn genutzt: ja", "Vorbilder 3/6", bool(sp.get("ok")), pflicht=False)
    else:
        zeile("11", "Schleife letztes = erstes Bild (freiwillig)", "genutzt, nicht geprüft", "wenn genutzt: ja", "Vorbilder 3/6", False, pflicht=False)

    # 12 Sprache: Wörter, Satzlängen, Länge. Entscheidung des Inhabers 09.11.2026: keine Sprechtempo-Regeln mehr, das Video
    # folgt der Stimme. 12a und 12c sind nur noch Hinweis.
    anzahl = len(woerter)
    lw = [len(s) for s in saetze]
    med = statistics.median(lw)
    unter10 = sum(1 for x in lw if x < 10) / len(lw)
    a, b = ziele["woerter"]
    zeile("12a", "Wörter (grobe Länge)", str(anzahl), f"{a}–{b} (Hinweis)", MASSSTAB_TEXT["woerter"], a <= anzahl <= b, pflicht=False)
    # 12b (Sprechtempo: Wörter/s bzw. Silben/s) entfernt, Entscheidung des Inhabers 09.11.2026.
    a, b = ziele["satzlaenge_median"]
    zeile("12c", "Wörter je Satz", f"Median {zahl(med, 1)}, max. {max(lw)}, {round(unter10 * 100)} % unter 10", f"Median {a}–{b}, ≥ 75 % unter 10 (Hinweis)",
          MASSSTAB_TEXT["satzlaenge"], a <= med <= b and unter10 >= 0.75, pflicht=False)
    # 12d (Pause nach Satzende), 12d2 (hörbare Satzpause) und 12e (Pause nach Komma) entfernt, Entscheidung des Inhabers
    # 09.11.2026: Pausen der Stimme werden nicht mehr gemessen.
    # 12f Mindestlänge bleibt Pflicht (Creator Rewards verlangt über 60 s); der Richtwert 65–80 s ist nur noch Hinweis (12f2).
    laenge = dauer if dauer else stimm_ende
    nur_stimme = "" if dauer else " (nur Stimme)"
    minimum = float(ziele.get("laenge_min", 61.0))
    zeile("12f", "Videolänge mindestens 61 s (Creator Rewards)", f"{zahl(laenge, 1)} s" + nur_stimme, f"≥ {zahl(minimum, 0)} s", "über 60 s (CRP)", laenge >= minimum)
    a, b = ziele["laenge"]
    zeile("12f2", "Videolänge im Richtwert", f"{zahl(laenge, 1)} s" + nur_stimme, f"{a}–{b} s (Hinweis)", MASSSTAB_TEXT["laenge"], a <= laenge <= b, pflicht=False)
    if dauer:
        nach = dauer - stimm_ende
        zeile("12g", "Nach dem letzten Wort", f"{zahl(nach, 1)} s", "0,5–1,0 s (Hinweis)", "0,5–1,0 s", 0.5 <= nach <= 1.0, pflicht=False)
    # 12h Auflösung (seit 08.11.2026 Pflicht, CRP-Zusatzbonus verlangt 1080p); vor dem Render kein MP4 → Punkt entfällt
    mp4 = video_pfad(projekt) if projekt else None
    if mp4:
        b, h = aufloesung(mp4)
        zeile("12h", "Auflösung des Videos", f"{b}×{h}" if b else "nicht lesbar (ffprobe?)", "1080×1920", "1080×1920 (CRP)", (b, h) == (1080, 1920))

    # 13 Ton: Teppich, Akzent auf der Pointe
    teppich = (ev or {}).get("teppich") or skript.get("klangteppich")
    zeile("13a", "Klangteppich zum Thema", teppich or "nicht gesetzt", "gesetzt", "Regen, Wasser, Meer, Nachtfahrt, Musik", bool(teppich), pflicht=False)
    if protokoll:
        akz = [e for e in ereignisse if e.get("typ") == "pointe" or e.get("klang") == "akzent"]
        zeile("13b", "Akzent-Klang auf der Pointe", f"{len(akz)}×", "≥ 1", "K1, K2", len(akz) > 0, pflicht=False)

    # 14 Untertitel: seit 07.11.2026 Blöcke von 1–4 Wörtern (Stil „phrase“, M.untertitel({max: 4})), Schlüsselwort in der Teamfarbe
    # (Sichtprüfung). Vorher (01.11.–07.11.) Wort für Wort im Stil „kontur“.
    ut = ms.get("untertitel") if ms else None
    stil_ut = (ut or {}).get("stil", "unbekannt")
    max_ut = (ut or {}).get("maxWoerter")
    ok14 = stil_ut == "phrase" and max_ut is not None and int(max_ut) <= 4
    zeile("14", "Untertitel in Blöcken von 1–4 Wörtern", stil_ut + (f", max. {max_ut} Wörter" if max_ut is not None else ""), "phrase, max. 4 (Inhaber 07.11.)", "REA: Blöcke 1–4 Wörter 5/5", ok14)

    # 15 Kein Kanalname, kein Logo, keine Rubrik
    funde = re.findall(r"SIMULIERBAR|new Markenleiste\(|WUERFEL|logoGross|rubrik:|stelldirvor|STELLDIRVOR|marke/account2", szene)
    zeile("15", "Kein Kanalname/Logo/Rubrik (szene.js)", "keine Fundstelle" if not funde else ", ".join(sorted(set(funde))), "keine Fundstelle", "kein Logo, keine Rubrik", not funde)

    # 18b Erlaubte Stile für Simulierbar (Inhaber 02.11.2026 abends: alle Stile 1–15 und 17–21 wieder erlaubt, mit Qualitätslatte;
    # vorher am selben Tag nur 17–21). Genau ein Hauptstil (erste Zahl in skript.json „stil“), Einschübe (13 Blaupause, 7 als HUD) stehen
    # nach der ersten Zahl. Stil 16 Lunar-POV gehört zu Account 2. Die Qualitätslatte (stile.md) prüft Claude am Kontaktbogen, nicht hier.
    # Pflicht für Projekte nach dem Skill (skript.json "skill": "simulierbar-video" oder Szene mit sim_atmosphaere.js), sonst Hinweis.
    nach_skill = skript.get("skill") in SKILLS_A1 or "sim_atmosphaere" in szene
    stil_nr = re.match(r"\s*(\d+)", str(skript.get("stil", "")))
    fremd = sorted(set(re.findall(ACCOUNT2_MODULE, szene)))
    stil_ok = bool(stil_nr) and int(stil_nr.group(1)) in ERLAUBTE_STILE and not fremd
    ist = (f"Stil {stil_nr.group(1)}" if stil_nr else "kein Stil in skript.json") + (f", Account-2-Module: {', '.join(fremd)}" if fremd else "")
    zeile("18b", "Stil erlaubt (1–15, 17–21; Qualitätslatte am Kontaktbogen)", ist, "1–15, 17–21" + ("" if nach_skill else " (Hinweis)"), "genau ein Stil, hochwertige Optik", stil_ok, pflicht=nach_skill)

    # R1–R7: Punkte aus dem freigegebenen REA-Regelwerk (Inhaber 07.11.2026, Hirn „REA Simulierbar Regelwerk“).
    # Belastbare Regeln und ausdrückliche Entscheidungen sind Pflicht, vorläufige Richtwerte Hinweis.
    titel = sorted(float(e["t"]) for e in ereignisse if e.get("typ") == "titel")
    zeile("R1", "Duell-Frage als Titel im Bild ab Bild 1", (f"ab {zahl(titel[0])} s" if titel else "kein Titel (M.titel) im Protokoll") if protokoll else "kein Ereignis-Protokoll",
          "≤ 0,5 s", "erstes Bild ohne Ton verständlich 6/6 (R01)", protokoll and bool(titel) and titel[0] <= 0.5)
    tafel = sorted(float(e["t"]) for e in ereignisse if e.get("typ") == "tafel")
    zeile("R2", "Anzeigetafel mit Zählern ab Bild 0", (f"ab {zahl(max(0.0, tafel[0]))} s" if tafel else "keine Tafel (M.tafel) im Protokoll") if protokoll else "kein Ereignis-Protokoll",
          "≤ 0,1 s", "Tafel mit laufenden Zählern 6/6 (R04)", protokoll and bool(tafel) and tafel[0] <= 0.1)
    grafik = sorted({e.get("typ") for e in ereignisse if e.get("typ") in ERKLAERGRAFIK})
    zeile("R3", "Mindestens eine Erklärgrafik (Balken, Formel, Bilanz)", (", ".join(grafik) if grafik else "keine") if protokoll else "kein Ereignis-Protokoll",
          "≥ 1", "Erklärgrafik 6/6 (R04)", protokoll and bool(grafik))
    du_funde = []
    for sg in skript.get("segmente", []):
        if str(sg.get("id", "")) in DU_ERLAUBT:
            continue
        txt = re.sub(r"\[[^\]]*\]", " ", str(sg.get("sprechtext") or sg.get("text") or ""))
        du_funde += [f"{sg.get('id', '?')}: {m.group(0)}" for m in DU.finditer(txt)]
    zeile("R4", "Erzählhaltung neutral (Du nur im Hook)", "kein Du außerhalb des Hooks" if not du_funde else ", ".join(du_funde[:3]) + (" …" if len(du_funde) > 3 else ""),
          "0 außerhalb von Hook (Inhaber 07.11.)", "durchgehend Du: stark 2/6, schwach 3/3", not du_funde)
    seg = {s.get("id"): s for s in segmente}
    t_erg = float(seg["ergebnis"]["start"]) if "ergebnis" in seg else next((w["start"] for w, x in zip(woerter, n) if x == "endstand"), None)
    anteil = t_erg / laenge_gesamt if t_erg is not None and laenge_gesamt else None
    # Seit 09.11.2026 nur Hinweis: Zeitpunkte der Phasen sind keine Pflicht mehr (neuer Aufbau-Standard: Ergebnis bei ca. 75–80 %).
    ea, eb = ziele.get("endstand", (0.75, 0.86))
    zeile("R5", "Endstand bei ca. 80 % der Länge", f"{zahl(t_erg, 1)} s = {round(anteil * 100)} %" if anteil is not None else "kein Segment „ergebnis“ und kein „Endstand“",
          f"{round(ea * 100)}–{round(eb * 100)} % (Hinweis)", "stark 79–83 %, schwach 57 %", anteil is not None and ea <= anteil <= eb, pflicht=False)
    if "kipp" in seg and laenge_gesamt:
        ak = float(seg["kipp"]["start"]) / laenge_gesamt
        zeile("R6", "Kipp-Moment (Höhepunkt) bei ca. 64 %", f"{zahl(float(seg['kipp']['start']), 1)} s = {round(ak * 100)} %", "55–72 % (Hinweis)", "stark 64 % (ca. 45 s)", 0.55 <= ak <= 0.72, pflicht=False)
    else:
        zeile("R6", "Kipp-Moment (Höhepunkt) bei ca. 64 %", "kein Segment „kipp“", "55–72 % (Hinweis)", "stark 64 % (ca. 45 s)", False, pflicht=False)
    erster = len(saetze[0]) if saetze else 0
    zeile("R7", "Erster Satz kurz", f"{erster} Wörter", "3–4 (Hinweis)", "stark 3–4, schwach 6", 1 <= erster <= 4, pflicht=False)

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
        print("Achtung: Timing ist geschätzt (keine Stimme). Alle Zeiten gelten erst mit audio/timing.json; das Video folgt der Stimme.")


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
            if profil in ALTE_PROFILE:
                print(f"Hinweis: Profil „{profil}“ gibt es seit 09.11.2026 nicht mehr (keine Tempo-Regeln); geprüft wird mit „ben“.", file=sys.stderr)
                profil = "ben"
            i += 1
        elif args[i] == "--ziel":
            k, v = args[i + 1].split("=")
            if k in ALTE_ZIELE:
                print(f"Hinweis: --ziel {k} gibt es seit 09.11.2026 nicht mehr (keine Tempo-Regeln); übergangen.", file=sys.stderr)
            elif ":" in v:
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
