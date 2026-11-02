"""Übersicht Account 2 (@stelldirvor.pov) als HTML für das PDF.

Quelle der Ideen: data/plan/account2-naechste-tage.json (angepasste Themen mit Score).
Aufruf:  python3 tools/account2_uebersicht.py docs/plan/account2-uebersicht.html
         node tools/html_pdf.mjs docs/plan/account2-uebersicht.html docs/plan/account2-uebersicht-JJJJ-MM-TT.pdf
"""
import datetime
import html
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDEEN = os.path.join(ROOT, "data", "plan", "account2-naechste-tage.json")
WT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]


def e(x):
    return html.escape(str(x if x is not None else ""))


def datum(d):
    t = datetime.date.fromisoformat(d)
    return f"{WT[t.weekday()]} {t.strftime('%d.%m.')}"


def idee_html(i):
    mw = "".join(f"<tr><td>{e(m.get('etikett'))}</td><td>{e(m.get('einheit'))}</td><td>{e(m.get('verlauf'))}</td></tr>" for m in i.get("messwert", []))
    saetze = "".join(f"<li>{e(s)}</li>" for s in i.get("saetze", []))
    namen = {"nachfrage": "Nachfrage", "timing": "Timing", "wettbewerb": "Wettbewerb", "passung": "Passung", "aufwand": "Aufwand", "risiko": "Risiko"}
    fak = "".join(f"<span>{namen.get(k, k)} <b>{e(v)}</b></span>" for k, v in (i.get("score_faktoren") or {}).items())
    return f"""
<section class="idee">
  <div class="idee-kopf"><div><p class="eyebrow">{e(datum(i['datum']))} · {e(i.get('uhrzeit'))} · {e(i.get('slot'))}</p>
  <h3>{e(i.get('titel'))}</h3></div><div class="score"><span>Score</span><b>{e(i.get('score'))}</b></div></div>
  <div class="spalten">
    <div><p class="lab">Titelfrage im Video</p><p>{e(i.get('titelfrage_video'))}</p>
    <p class="lab">Standpunkt</p><p>{e(i.get('standpunkt'))}</p>
    <p class="lab">Ort</p><p>{e(i.get('ort'))}</p>
    <p class="lab">Ereignis</p><p>{e(i.get('ereignis_kurz'))}</p>
    <p class="lab">Faktenzeile im Abspann</p><p>{e(i.get('faktenzeile'))}</p></div>
    <div><p class="lab">Messwert-Anzeige</p><table><tr><th>Etikett</th><th>Einheit</th><th>Verlauf</th></tr>{mw}</table>
    <p class="lab">Kernrechnung</p><p>{e(i.get('kernrechnung'))}</p></div>
  </div>
  <p class="lab">Sätze im Video ({len(i.get('saetze', []))})</p><ol class="saetze">{saetze}</ol>
  <p class="lab">Score-Faktoren</p><p class="faktoren">{fak}</p>
  <p class="lab">Begründung</p><p>{e(i.get('score_begruendung'))}</p>
  <p class="lab">Konkurrenz-Check</p><p>{e(i.get('konkurrenz_check'))}</p>
  <p class="lab">Geändert gegenüber dem alten Plan</p><p>{e(i.get('geaendert'))}</p>
  <p class="lab">Caption</p><p class="caption">{e(i.get('caption'))}</p>
</section>"""


def main(ziel):
    ideen = json.load(open(IDEEN, encoding="utf-8")) if os.path.exists(IDEEN) else []
    ideen.sort(key=lambda i: (i["datum"], i.get("uhrzeit", "")))
    tabelle = "".join(f"<tr><td>{e(datum(i['datum']))}</td><td class='num'>{e(i.get('uhrzeit'))}</td><td>{e(i.get('titel'))}</td><td>{e(i.get('standpunkt'))}</td><td class='num'><b>{e(i.get('score'))}</b></td></tr>" for i in ideen)
    heute = datetime.date.today().strftime("%d.%m.%Y")
    doc = f"""<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Übersicht Stell dir vor</title>
<style>
@page {{ size:A4; margin:14mm 14mm 14mm 14mm; }}
:root {{ --ink:#17201C; --muted:#5B6863; --line:#D9DFDA; --a2:#C93A40; --soft:#F6F1EF; --sunk:#F1F3F1; }}
* {{ box-sizing:border-box; }}
body {{ margin:0; font-family:"Public Sans",Arial,Helvetica,sans-serif; color:var(--ink); font-size:9.6pt; line-height:1.42; }}
h1,h2,h3 {{ font-family:Georgia,"Times New Roman",serif; margin:0; line-height:1.2; }}
h1 {{ font-size:22pt; }} h2 {{ font-size:13.5pt; margin:14px 0 6px; padding-bottom:3px; border-bottom:1.5px solid var(--ink); }} h3 {{ font-size:12pt; }}
p {{ margin:0 0 4px; }} ul,ol {{ margin:0 0 6px; padding-left:16px; }} li {{ margin-bottom:2px; }}
.eyebrow,.lab {{ font-size:7.4pt; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; margin:6px 0 2px; }}
.kopf {{ display:flex; justify-content:space-between; align-items:flex-end; border-bottom:3px solid var(--a2); padding-bottom:8px; margin-bottom:8px; }}
.kopf .stand {{ color:var(--muted); font-size:8.5pt; text-align:right; }}
.raster {{ display:grid; grid-template-columns:1fr 1fr; gap:6px 18px; }}
.box {{ background:var(--sunk); border-radius:6px; padding:8px 10px; }}
table {{ border-collapse:collapse; width:100%; font-size:8.8pt; margin-bottom:4px; }}
th,td {{ text-align:left; padding:4px 6px; border-bottom:1px solid var(--line); vertical-align:top; }}
th {{ font-size:7.2pt; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }}
.num {{ font-variant-numeric:tabular-nums; white-space:nowrap; }}
.ablauf {{ display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }}
.ablauf div {{ background:var(--soft); border-radius:5px; padding:5px 6px; font-size:8.2pt; }}
.ablauf b {{ display:block; font-size:7.6pt; color:var(--a2); }}
.idee {{ break-inside:avoid-page; border:1px solid var(--line); border-radius:8px; padding:10px 12px; margin:10px 0; }}
.idee-kopf {{ display:flex; justify-content:space-between; gap:12px; align-items:flex-start; border-bottom:1px solid var(--line); padding-bottom:6px; margin-bottom:4px; }}
.score {{ text-align:center; background:var(--a2); color:#fff; border-radius:6px; padding:4px 10px; }}
.score span {{ display:block; font-size:6.8pt; letter-spacing:.08em; text-transform:uppercase; }} .score b {{ font-size:15pt; }}
.spalten {{ display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; }}
.saetze {{ columns:2; column-gap:18px; font-family:Georgia,serif; font-style:italic; }}
.faktoren span {{ display:inline-block; background:var(--sunk); border-radius:4px; padding:1px 6px; margin:0 4px 3px 0; }}
.caption {{ background:var(--soft); border-radius:4px; padding:4px 6px; }}
.seitenumbruch {{ break-before:page; }}
</style></head><body>
<div class="kopf"><div><p class="eyebrow">TikTok-Account 2</p><h1>Stell dir vor … (@stelldirvor.pov)</h1></div>
<div class="stand">Stand {heute}<br>Quelle: CLAUDE.md, ENTSCHEIDUNGEN.md, docs/16 §9–12, Plan</div></div>

<h2>1. Steckbrief</h2>
<div class="raster">
<div><p class="lab">Nische</p><p>„Was wäre, wenn …“-Gedankenexperimente: ein Ereignis, aus deiner eigenen Sicht erlebt, mit echter Rechnung dahinter.</p>
<p class="lab">Ziel</p><p>Creator Rewards Program (CRP): 10.000 Follower, 100.000 Aufrufe in 30 Tagen, Videos über 1 Minute. Für ca. 1.000 € im Monat braucht es grob 1,4–5 Mio. Aufrufe (Schätzung, docs/16 §6).</p>
<p class="lab">Konto</p><p>Angelegt 01.11. als Privatkonto, Region Deutschland, in Buffer verbunden.</p></div>
<div><p class="lab">Logo</p><p>„Fragezeichen-Countdown“: Fragezeichen aus Porzellan in einem Ring aus 5 Segmenten, der Punkt ist eine kleine türkise Welt. Koralle #FF4F5A, Türkis #2EC4B6. Nie im Video.</p>
<p class="lab">Bio</p><p>„Was wäre, wenn …? Du erlebst es live 🌍⏱️ Dein Szenario? 👇“ (ohne Kontaktdaten, CRP-Regel)</p>
<p class="lab">Werkzeuge</p><p>Nur Three.js und Blender, keine KI-Video-Generatoren. Gerendert in der Cloud, später auf dem Windows-PC mit Grafikkarte.</p></div>
</div>

<h2>2. Format (verbindlich seit 02.11., nach deinen 4 Referenzvideos)</h2>
<div class="raster">
<div class="box"><p class="lab">Bild und Ton</p><ul>
<li>Keine Stimme. Nur selbst erzeugte Atmo und Sounddesign, −14 LUFS, leise → Höhepunkt bei 55–65 s → leise.</li>
<li>Genau 80 Sekunden, eine durchgehende Einstellung ohne Schnitte.</li>
<li>Feste Ich-Perspektive von erhöhtem Standpunkt, Geländer oder Brüstung im Vordergrund.</li>
<li>Belebte, detailreiche Welt mit filmischem Licht. Das ist die Kunst.</li></ul></div>
<div class="box"><p class="lab">Text (nur drei Ebenen)</p><ul>
<li>Titelfrage 0–3,5 s, Serifenschrift, mittig oben.</li>
<li>Messwert-Anzeige links Mitte, läuft durchgehend, 2–4 Etiketten, am Ende „HIER“.</li>
<li>Ein kursiver Satz unten, 3–9 Wörter, ca. alle 4 s, 14–17 insgesamt.</li>
<li>Abspann 72–80 s auf Schwarz: Titelfrage und Faktenzeile.</li></ul></div>
</div>
<p class="lab">Ablauf jedes Videos</p>
<div class="ablauf"><div><b>0–3,5 s</b>Titelfrage</div><div><b>4–30 s</b>Alltag, erste Anzeichen</div><div><b>30–55 s</b>Eskalation in Stufen</div><div><b>55–62 s</b>Höhepunkt: „HIER“</div><div><b>62–70 s</b>Nachspiel</div><div><b>72–80 s</b>Abspann mit Fakt</div></div>
<p class="lab">Nicht im Video</p><p>Keine Sticker, Chips, Untertitel, Countdown-Ring, Logo, kein Folgen-Aufruf, kein gesprochener Schluss. Die Kommentarfrage steht in der Caption. Gesperrt sind die Themen der Referenzen: Asteroid über der Stadt, Sonne explodiert, Mega-Tsunami trifft Großstadt, Erde hört auf sich zu drehen.</p>

<h2>3. Produktion und Posten</h2>
<div class="raster">
<div><ul>
<li><b>2 Videos pro Tag</b>, wie Simulierbar: Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30.</li>
<li>Produziert wird immer am Vortag. Über beide Kanäle sind es <b>genau 4 Videos pro Tag, nie mehr gleichzeitig</b>, höchstens 2 Agenten parallel.</li>
<li>Start nur mit deinem Startsignal.</li></ul></div>
<div><ul>
<li><b>Vollautomatisch über Buffer</b>, ohne Freigabe: Claude prüft, lädt nach Supabase hoch (Frankfurt, privat), plant ein, prüft nach dem Posten (öffentlich?) und löscht die Datei.</li>
<li>Kein KI-Label (unsere Bilder sind nicht KI-generiert, es gibt keine Stimme).</li>
<li>Caption: „Frage? Emoji Ich hab's durchgespielt. Kommentarfrage? 👇“ plus 5 Hashtags, Schluss #wissen #waswaerewenn.</li></ul></div>
</div>

<h2>4. Qualitätsregeln</h2>
<ul>
<li><b>Die animierte Welt trägt das Video.</b> Zahlen und Timer sind nötig, aber nicht die Kunst.</li>
<li><b>Text und Bild passen exakt zusammen:</b> Was ein Satz sagt, ist im selben Moment zu sehen.</li>
<li><b>Themen-Logik:</b> Ein Ereignis, eine messbare Größe, keine schiefen Vergleiche.</li>
<li><b>Eigene Rechnung</b> mit Tests, Quellen nur intern. Keine Kopien, Konkurrenz-Check vor jedem Start.</li>
</ul>

<h2>5. Bisheriger Stand</h2>
<table><tr><th>Datum</th><th>Video</th><th>Ergebnis</th></tr>
<tr><td class="num">02.11. 07:43</td><td>Testvideo „Schall in Schritttempo“ (S-Bahn-Steig)</td><td>Gepostet, öffentlich, Automatik-Test bestanden. Noch im alten Stil mit Stimme.</td></tr>
<tr><td class="num">02.11. 12:30</td><td>Schokolade (Küche)</td><td>Bei der Abnahme abgelehnt: Titel verdeckt, Zahlen überlappen, alter Stil. Nicht gepostet.</td></tr>
<tr><td class="num">02.11. 19:30</td><td>Stickstoff weg (Supermarkt)</td><td>Umbau ins neue Format begonnen, gestoppt. Nicht gepostet.</td></tr>
</table>

<h2 class="seitenumbruch">6. Videoideen für die nächsten 2 Tage (neu bewertet nach dem Referenz-Format)</h2>
<table><tr><th>Tag</th><th>Uhrzeit</th><th>Titel</th><th>Standpunkt</th><th>Score</th></tr>{tabelle}</table>
<p class="muted" style="color:var(--muted)">Score nach unserem Raster (tools/trend_score.py, 0–100): Nachfrage, Timing, Wettbewerb, Passung, Aufwand, Risiko. Ab 70 empfohlen.</p>
{''.join(idee_html(i) for i in ideen) if ideen else '<p>Die angepassten Themen fehlen noch.</p>'}

<h2>7. Offene Punkte</h2>
<ul>
<li>Dein Startsignal für die Produktion vom 03.11. (2 Videos je Kanal).</li>
<li>Alle 60 Themen des 30-Tage-Plans an das Referenz-Format anpassen (Claude, nach Startsignal).</li>
<li>Prüfung für das neue Format (pipeline/qc/referenz_pov.py) fertigstellen, sie wurde mit dem gestoppten Agenten begonnen.</li>
<li>Nach 14 Tagen Posting-Zeiten mit echten Zahlen aus TikTok Studio nachjustieren.</li>
</ul>
</body></html>"""
    open(ziel, "w", encoding="utf-8").write(doc)
    print("HTML geschrieben:", ziel, "·", len(ideen), "Ideen")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "docs", "plan", "account2-uebersicht.html"))
