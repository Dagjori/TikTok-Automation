"""Wettbewerbs-Monitor: hält Follower, Likes und Videozahl beobachteter TikTok-Kanäle fest.

Ruft pro Kanal genau eine öffentliche Profilseite ab (wie ein normaler Browser-Aufruf,
2 s Pause), keine internen APIs. Hängt einen Datenstand an data/monitor/verlauf.csv an
und vergleicht ihn mit dem letzten Stand je Kanal.

Aufruf: python3 tools/monitor_kanaele.py
"""
import csv
import datetime
import json
import re
import time
import urllib.request
from pathlib import Path

BASIS = Path(__file__).resolve().parent.parent / "data" / "monitor"
KANAELE = BASIS / "kanaele.csv"
VERLAUF = BASIS / "verlauf.csv"
FELDER = ["datum", "kanal", "follower", "likes", "videos"]
USER_AGENT = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")

# Ab hier gilt ein Kanal als auffällig
SCHWELLE_PROZENT = 20
SCHWELLE_ABSOLUT = 1000


def profil_abrufen(kanal):
    anfrage = urllib.request.Request(
        f"https://www.tiktok.com/@{kanal}",
        headers={"User-Agent": USER_AGENT, "Accept-Language": "de-DE,de;q=0.9"},
    )
    with urllib.request.urlopen(anfrage, timeout=30) as antwort:
        html = antwort.read().decode("utf-8", errors="ignore")
    treffer = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)</script>', html, re.S)
    if not treffer:
        return None
    info = json.loads(treffer.group(1))["__DEFAULT_SCOPE__"].get("webapp.user-detail", {}).get("userInfo") or {}
    stats = info.get("statsV2") or info.get("stats") or {}
    if not info.get("user"):
        return None
    return {
        "follower": int(stats.get("followerCount", 0)),
        "likes": int(stats.get("heartCount") or stats.get("heart") or 0),
        "videos": int(stats.get("videoCount", 0)),
    }


def letzte_staende():
    staende = {}
    if VERLAUF.exists():
        with open(VERLAUF, encoding="utf-8", newline="") as fh:
            for zeile in csv.DictReader(fh):
                staende[zeile["kanal"]] = zeile  # Datei ist chronologisch, letzter Eintrag gewinnt
    return staende


def main():
    with open(KANAELE, encoding="utf-8", newline="") as fh:
        kanaele = list(csv.DictReader(fh))
    vorher = letzte_staende()
    heute = datetime.date.today().isoformat()
    neu, auffaellig = [], []

    for eintrag in kanaele:
        kanal = eintrag["kanal"]
        try:
            stand = profil_abrufen(kanal)
        except Exception as fehler:  # einzelner Kanal darf den Lauf nicht abbrechen
            print(f"{kanal}: Abruf fehlgeschlagen ({fehler})")
            continue
        finally:
            time.sleep(2)
        if stand is None:
            print(f"{kanal}: keine Profildaten")
            continue
        neu.append({"datum": heute, "kanal": kanal, **stand})

        alt = vorher.get(kanal)
        if not alt:
            print(f"{kanal:24} {stand['follower']:>9} Follower (erster Stand)")
            continue
        diff = stand["follower"] - int(alt["follower"])
        prozent = diff / max(int(alt["follower"]), 1) * 100
        videos = stand["videos"] - int(alt["videos"])
        print(f"{kanal:24} {stand['follower']:>9} Follower  {diff:+8} ({prozent:+6.1f} %)  "
              f"{videos:+3} Videos  seit {alt['datum']}  [{eintrag['gruppe']}]")
        if prozent >= SCHWELLE_PROZENT or diff >= SCHWELLE_ABSOLUT:
            auffaellig.append(f"{kanal} ({diff:+} Follower, {prozent:+.1f} %)")

    neu_datei = not VERLAUF.exists()
    with open(VERLAUF, "a", encoding="utf-8", newline="") as fh:
        schreiber = csv.DictWriter(fh, fieldnames=FELDER)
        if neu_datei:
            schreiber.writeheader()
        schreiber.writerows(neu)

    print(f"\n{len(neu)} Kanäle gespeichert in {VERLAUF.relative_to(BASIS.parent.parent)}")
    print("Auffällig:", ", ".join(auffaellig) if auffaellig else "keiner")


if __name__ == "__main__":
    main()
