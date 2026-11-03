#!/usr/bin/env python3
"""Live-Zahlen für das Cockpit (Missionen, Video-Tabelle). Nur die Buffer-API und öffentliche TikTok-Seiten, nichts umgangen.

  py -3 cockpit/werkzeuge/live_zahlen.py profile             Follower, Likes, Videozahl beider Konten (2 Profilseiten, 2 s Pause)
  py -3 cockpit/werkzeuge/live_zahlen.py videos [--tiktok N]  Posts der letzten 30 Tage aus Buffer (Kennzahlen, Link); für die
                                                             N neuesten (höchstens 7 Tage alt, Standard 4) zusätzlich die TikTok-Seite

Ausgabe: ein JSON-Objekt auf stdout. Exit 0 ok · 4 TikTok drosselt bzw. blockt (kein weiterer Abruf, nie umgehen) · 1 Fehler.
Nutzt die vorhandenen Funktionen aus tools/monitor_kanaele.py (Profil) und tools/insights_abrufen.py bzw. pipeline/post_buffer.py.
Der Buffer-Schlüssel kommt als Umgebungsvariable BUFFER_API_KEY vom Cockpit-Server und wird nirgends gespeichert oder ausgegeben.
"""
import datetime as dt
import json
import subprocess
import sys
import time
import urllib.error
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(WURZEL / "tools"))
sys.path.insert(0, str(WURZEL / "pipeline"))
befehl = sys.argv[1:]
sys.argv = [sys.argv[0]]  # die importierten Werkzeuge lesen sys.argv nicht selbst aus
import insights_abrufen as ia  # noqa: E402  (bringt post_buffer als ia.pb mit)
import monitor_kanaele as mk  # noqa: E402

pb = ia.pb


def zahl(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def projekt_dauer(projekt):
    """Videolänge aus der Sprachspur des Projekts (weicht vom fertigen Video um weniger als 1 s ab); auch aus origin/main,
    falls der Arbeits-Klon das Projekt noch nicht hat."""
    if not projekt:
        return None
    pfad = f"pipeline/projekte/{projekt}/audio/timing.json"
    try:
        if (WURZEL / pfad).exists():
            text = (WURZEL / pfad).read_text(encoding="utf-8")
        else:
            text = subprocess.run(["git", "show", f"origin/main:{pfad}"], cwd=WURZEL, capture_output=True, encoding="utf-8", timeout=20).stdout
        return round(float(json.loads(text)["dauer"])) if text else None
    except Exception:
        return None


def profile():
    ergebnis, gedrosselt = {}, False
    for kanal in pb.KANAELE:
        try:
            ergebnis[kanal] = mk.profil_abrufen(kanal)
        except urllib.error.HTTPError as e:
            ergebnis[kanal] = None
            gedrosselt = e.code in (403, 429)
            if gedrosselt:
                break
        except Exception as e:  # Format geändert, Netz weg: nichts umgehen, nur melden
            ergebnis[kanal] = None
            print(f"Profil {kanal}: {str(e)[:120]}", file=sys.stderr)
        time.sleep(2)
    return {"profile": ergebnis, "gedrosselt": gedrosselt}


def videos(tiktok_max):
    org, kanaele = pb.lade_kanaele()
    grenze = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)
    posts, tt_abrufe, gedrosselt, tt_stopp = [], 0, False, tiktok_max <= 0
    for name in pb.KANAELE:
        ch = next((c for c in kanaele if c["name"] == name and c.get("service") == "tiktok"), None)
        if not ch:
            continue
        knoten, cursor = [], None
        for _ in range(3):
            d = pb.buffer_lesen(ia.POSTS, {"o": org, "c": ch["id"], "a": cursor})["posts"]
            knoten += [e["node"] for e in d["edges"]]
            if not d["pageInfo"]["hasNextPage"]:
                break
            cursor = d["pageInfo"]["endCursor"]
        for p in knoten:
            if not p.get("sentAt"):
                continue
            gesendet = dt.datetime.fromisoformat(p["sentAt"].replace("Z", "+00:00"))
            if gesendet < grenze:
                continue
            m = {x["type"]: x["value"] for x in (p.get("metrics") or [])}
            posts.append({
                "kanal": name, "post_id": p["id"], "gesendet": p["sentAt"], "link": p.get("externalLink") or "",
                "titel": (p.get("text") or "").replace("\n", " ")[:140], "projekt": ia.projekt_zuordnen(p.get("text")),
                "buffer": {"views": zahl(m.get("views")), "likes": zahl(m.get("likes", m.get("reactions"))), "kommentare": zahl(m.get("comments")),
                           "shares": zahl(m.get("shares")), "saves": zahl(m.get("saves")), "engagement": m.get("engagementRate"),
                           "avg_watch_s": m.get("averageTimeWatched"), "follows": zahl(m.get("follows"))},
                "buffer_stand": p.get("metricsUpdatedAt") or "", "tiktok": None, "dauer_s": None,
            })
    posts.sort(key=lambda x: x["gesendet"], reverse=True)
    jetzt = dt.datetime.now(dt.timezone.utc)
    for post in posts:
        if tt_stopp or tt_abrufe >= tiktok_max:
            break
        alter = jetzt - dt.datetime.fromisoformat(post["gesendet"].replace("Z", "+00:00"))
        if not post["link"] or alter.days >= 7:
            continue
        try:
            item = pb.tiktok_seite(post["link"])
            st = item.get("statsV2") or item.get("stats") or {}
            post["tiktok"] = {"views": zahl(st.get("playCount")), "likes": zahl(st.get("diggCount")), "kommentare": zahl(st.get("commentCount")),
                              "shares": zahl(st.get("shareCount")), "saves": zahl(st.get("collectCount"))}
            post["dauer_s"] = zahl((item.get("video") or {}).get("duration"))
        except Exception as e:  # beim ersten Fehler (429, Bot-Schutz) keine weiteren Seiten
            gedrosselt = "429" in str(e) or "Bot-Schutz" in str(e) or "403" in str(e)
            tt_stopp = True
            print(f"TikTok-Seite: {str(e)[:120]}", file=sys.stderr)
        tt_abrufe += 1
        time.sleep(3)
    for post in posts:
        post["dauer_s"] = post["dauer_s"] or projekt_dauer(post["projekt"])
    return {"posts": posts, "tiktok_seiten": tt_abrufe, "gedrosselt": gedrosselt}


def main():
    if not befehl or befehl[0] not in ("profile", "videos"):
        print(__doc__, file=sys.stderr)
        return 1
    try:
        if befehl[0] == "profile":
            daten = profile()
        else:
            n = int(befehl[befehl.index("--tiktok") + 1]) if "--tiktok" in befehl else 4
            daten = videos(n)
    except Exception as e:
        print(json.dumps({"fehler": str(e)[:300]}, ensure_ascii=False))
        return 1
    daten["zeit"] = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(json.dumps(daten, ensure_ascii=False))
    return 4 if daten.get("gedrosselt") else 0


if __name__ == "__main__":
    sys.exit(main())
