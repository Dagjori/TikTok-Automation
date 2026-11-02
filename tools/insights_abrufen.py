#!/usr/bin/env python3
"""Holt die Kennzahlen aller Posts der letzten Tage beider TikTok-Kanäle (Lernschleife, täglich 20:00 Berlin).

Quellen (beide öffentlich bzw. offiziell, nichts umgangen):
  1. Buffer-API `post.metrics`: Aufrufe, Likes/Reaktionen, Kommentare, Engagement-Rate, durchschnittliche und gesamte
     Wiedergabezeit, Follower-Zuwachs (Buffer aktualisiert nur alle paar Stunden: Feld `buffer_stand`).
  2. Öffentliche TikTok-Videoseite (wie `post_buffer.py --nachpruefen`): Aufrufe, Likes, Kommentare, Shares, Saves, Dauer.
     Höchstens 12 Seitenabrufe je Lauf, 3 s Pause, bei Fehler (z. B. 429) sofort Abbruch ohne Umgehung.

Schreibt: data/insights/metriken.csv (Verlauf: je Lauf eine Zeile je Post, nur anhängen) und
          data/insights/letzter_abruf.json (vollständiger letzter Stand).
Aufruf:   python3 tools/insights_abrufen.py [--tage 14] [--ohne-tiktok]
Voraussetzung: Buffer-Zugang (Netzwerk-Secret der Cloud-Umgebung). Kein Supabase nötig.
"""
import argparse
import csv
import datetime as dt
import json
import sys
import time
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(WURZEL / "pipeline"))
sys.argv, _argv = [sys.argv[0]], sys.argv[1:]
import post_buffer as pb  # noqa: E402

AUS = WURZEL / "data" / "insights"
FELDER = ["abruf", "kanal", "post_id", "gesendet", "titel", "projekt", "dauer_s", "views", "likes", "kommentare", "shares", "saves",
          "engagement_rate", "avg_watch_s", "total_watch_s", "follows", "tt_views", "tt_likes", "tt_kommentare", "tt_shares", "tt_saves", "buffer_stand"]
POSTS = """query Posts($o: OrganizationId!, $c: ChannelId!, $a: String) {
  posts(first: 50, after: $a, input: {organizationId: $o, filter: {channelIds: [$c], status: [sent]}}) {
    pageInfo { hasNextPage endCursor }
    edges { node { id status sentAt externalLink text metricsUpdatedAt metrics { type value } } }
  }
}"""


def projekt_zuordnen(text):
    """Ordnet einen Post dem Projektordner zu, indem die Caption mit `beschreibung` in skript.json verglichen wird."""
    schluessel = (text or "").strip()[:60]
    if not schluessel:
        return ""
    for p in sorted((WURZEL / "pipeline" / "projekte").glob("*/skript.json")):
        try:
            b = json.loads(p.read_text(encoding="utf-8")).get("beschreibung") or json.loads(p.read_text(encoding="utf-8")).get("caption") or ""
        except Exception:
            continue
        if b.strip()[:60] == schluessel:
            return p.parent.name
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tage", type=int, default=14)
    ap.add_argument("--ohne-tiktok", action="store_true")
    args = ap.parse_args(_argv)
    grenze = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=args.tage)
    jetzt = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    org, kanaele = pb.lade_kanaele()
    zeilen, tt_abrufe, tt_stopp = [], 0, False
    for name in pb.KANAELE:
        ch = next((c for c in kanaele if c["name"] == name and c.get("service") == "tiktok"), None) or next((c for c in kanaele if c["name"] == name), None)
        if not ch:
            print(f"WARNUNG: Kanal {name} in Buffer nicht gefunden", file=sys.stderr)
            continue
        cursor, posts = None, []
        for _ in range(3):
            d = pb.buffer_lesen(POSTS, {"o": org, "c": ch["id"], "a": cursor})["posts"]
            posts += [e["node"] for e in d["edges"]]
            if not d["pageInfo"]["hasNextPage"]:
                break
            cursor = d["pageInfo"]["endCursor"]
        for p in sorted(posts, key=lambda x: x.get("sentAt") or "", reverse=True):
            if not p.get("sentAt"):
                continue
            gesendet = dt.datetime.fromisoformat(p["sentAt"].replace("Z", "+00:00"))
            if gesendet < grenze:
                continue
            m = {x["type"]: x["value"] for x in (p.get("metrics") or [])}
            z = {"abruf": jetzt, "kanal": name, "post_id": p["id"], "gesendet": p["sentAt"], "titel": (p.get("text") or "").replace("\n", " ")[:120],
                 "projekt": projekt_zuordnen(p.get("text")), "dauer_s": "", "views": m.get("views", ""), "likes": m.get("likes", m.get("reactions", "")),
                 "kommentare": m.get("comments", ""), "shares": m.get("shares", ""), "saves": m.get("saves", ""), "engagement_rate": m.get("engagementRate", ""),
                 "avg_watch_s": m.get("averageTimeWatched", ""), "total_watch_s": m.get("totalTimeWatched", ""), "follows": m.get("follows", ""),
                 "tt_views": "", "tt_likes": "", "tt_kommentare": "", "tt_shares": "", "tt_saves": "", "buffer_stand": p.get("metricsUpdatedAt") or ""}
            if not args.ohne_tiktok and not tt_stopp and tt_abrufe < 12 and p.get("externalLink") and (dt.datetime.now(dt.timezone.utc) - gesendet).days < 7:
                try:
                    item = pb.tiktok_seite(p["externalLink"])
                    st = item.get("statsV2") or item.get("stats") or {}
                    z.update(tt_views=st.get("playCount", ""), tt_likes=st.get("diggCount", ""), tt_kommentare=st.get("commentCount", ""),
                             tt_shares=st.get("shareCount", ""), tt_saves=st.get("collectCount", ""), dauer_s=(item.get("video") or {}).get("duration", ""))
                except Exception as e:  # kein Umgehen: beim ersten Fehler (429, Format) keine weiteren Seiten
                    print(f"HINWEIS: TikTok-Seite nicht lesbar ({str(e)[:90]}); keine weiteren Seitenabrufe in diesem Lauf.", file=sys.stderr)
                    tt_stopp = True
                tt_abrufe += 1
                time.sleep(3)
            zeilen.append(z)
    AUS.mkdir(parents=True, exist_ok=True)
    neu = not (AUS / "metriken.csv").exists()
    with open(AUS / "metriken.csv", "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FELDER)
        if neu:
            w.writeheader()
        w.writerows(zeilen)
    (AUS / "letzter_abruf.json").write_text(json.dumps({"abruf": jetzt, "tage": args.tage, "tiktok_seiten": tt_abrufe, "posts": zeilen}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(zeilen)} Posts, {tt_abrufe} TikTok-Seitenabrufe → data/insights/metriken.csv")
    for z in zeilen:
        print(f"{z['gesendet'][:16]} {z['kanal']:16} Aufrufe {z['views']!s:>6} (TT {z['tt_views']!s:>6}) Likes {z['likes']!s:>4} Komm {z['kommentare']!s:>3} Ø-Zeit {z['avg_watch_s']!s:>5}s  {z['projekt'] or z['titel'][:40]}")


if __name__ == "__main__":
    main()
