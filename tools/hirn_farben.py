#!/usr/bin/env python3
"""Farben für das Obsidian-Hirn: feste Farbe je Kategorie (Graph, Dateiliste, Überschriften, Tags).

Erzeugt/aktualisiert (idempotent):
  hirn/.obsidian/graph.json           Farbgruppen im Graphen
  hirn/.obsidian/appearance.json      aktiviert das CSS-Snippet
  hirn/.obsidian/snippets/tiktok-farben.css
  hirn/00-Start/Farbcode.md           Legende
  jede Notiz: Zeile `cssclasses: [konto-…, typ-…]` im Kopf (für die Überschriftenfarben)
Aufruf: python3 tools/hirn_farben.py   (nach größeren Hirn-Änderungen wiederholen)
"""
import json
import re
from pathlib import Path

HIRN = Path(__file__).resolve().parent.parent / "hirn"

FARBEN = {
    "regelwerk": ("Regelwerk-Notizen", "#E5534B", "Rot"),
    "chat": ("Claude Chat: Workflow und Befehle", "#1FC7C7", "Türkis"),
    "lernen": ("Lernschleife und Insights", "#E85D9A", "Pink"),
    "start": ("00-Start: Index, Anleitung, Farbcode", "#E3B341", "Gold"),
    "projekt": ("01-Projekt: gemeinsam für beide Accounts", "#4C8DF6", "Blau"),
    "simulierbar": ("02-Simulierbar: Account 1 @simulierbar (Geld)", "#2FBF71", "Grün"),
    "stelldirvor": ("03-stelldirvor-pov: Account 2 @stelldirvor.pov", "#A066F0", "Violett"),
    "recherche": ("04-Recherche: Marktbeobachtung, Auswertungen", "#F2883A", "Orange"),
    "vorlagen": ("05-Vorlagen", "#8B949E", "Grau"),
}


def rgb_int(hexfarbe):
    h = hexfarbe.lstrip("#")
    return (int(h[0:2], 16) << 16) + (int(h[2:4], 16) << 8) + int(h[4:6], 16)


def graph():
    def grp(q, key):
        return {"query": q, "color": {"a": 1, "rgb": rgb_int(FARBEN[key][1])}}
    return {
        "collapse-filter": True, "search": "", "showTags": False, "showAttachments": False, "hideUnresolved": False,
        "showOrphans": True, "collapse-color-groups": False,
        # die erste passende Gruppe gewinnt: Besonderes zuerst, dann die Ordner
        "colorGroups": [
            grp("file:Regelwerk", "regelwerk"),
            grp("file:Befehl OR file:Claude-Chat", "chat"),
            grp("file:Lernschleife OR file:Insights", "lernen"),
            grp("path:00-Start", "start"),
            grp("path:01-Projekt", "projekt"),
            grp("path:02-Simulierbar", "simulierbar"),
            grp("path:03-stelldirvor-pov", "stelldirvor"),
            grp("path:04-Recherche", "recherche"),
            grp("path:05-Vorlagen", "vorlagen"),
        ],
        "collapse-display": True, "showArrow": False, "textFadeMultiplier": -0.5, "nodeSizeMultiplier": 1.3,
        "lineSizeMultiplier": 1, "collapse-forces": True, "centerStrength": 0.45, "repelStrength": 12, "linkStrength": 1,
        "linkDistance": 220, "scale": 1, "close": False,
    }


def css():
    v = {k: f[1] for k, f in FARBEN.items()}
    regeln = [f"""/* TikTok Automation: Farbcode (erzeugt von tools/hirn_farben.py, nicht von Hand ändern) */
:root {{
  --c-regelwerk: {v['regelwerk']}; --c-chat: {v['chat']}; --c-lernen: {v['lernen']}; --c-start: {v['start']};
  --c-projekt: {v['projekt']}; --c-a1: {v['simulierbar']}; --c-a2: {v['stelldirvor']}; --c-recherche: {v['recherche']}; --c-vorlagen: {v['vorlagen']};
}}"""]
    # Dateiliste: Ordner und Notizen farbig
    for pfad, var in [("00-Start", "start"), ("01-Projekt", "projekt"), ("02-Simulierbar", "a1"), ("03-stelldirvor-pov", "a2"),
                      ("04-Recherche", "recherche"), ("05-Vorlagen", "vorlagen")]:
        regeln.append(f'.nav-folder-title[data-path^="{pfad}"], .nav-file-title[data-path^="{pfad}"] {{ color: var(--c-{var}); }}')
        regeln.append(f'.nav-folder-title[data-path="{pfad}"] {{ font-weight: 700; }}')
    regeln.append('.nav-file-title[data-path*="Regelwerk"] { color: var(--c-regelwerk); font-weight: 700; }')
    regeln.append('.nav-file-title[data-path*="Befehl"], .nav-file-title[data-path*="Claude-Chat"] { color: var(--c-chat); }')
    regeln.append('.nav-file-title[data-path*="Lernschleife"], .nav-file-title[data-path*="Insights"] { color: var(--c-lernen); }')
    # Überschriften je Konto (cssclasses im Notizkopf)
    for klasse, var in [("konto-simulierbar", "a1"), ("konto-stelldirvor", "a2"), ("konto-gemeinsam", "projekt")]:
        regeln.append(f""".{klasse} h1, .{klasse} .cm-header-1, .{klasse} .inline-title {{ border-left: 7px solid var(--c-{var}); padding-left: 0.5em; }}
.{klasse} h2, .{klasse} .cm-header-2 {{ color: var(--c-{var}); }}
.{klasse} h3, .{klasse} .cm-header-3 {{ color: color-mix(in srgb, var(--c-{var}) 70%, var(--text-normal)); }}
.{klasse} th {{ border-bottom: 2px solid var(--c-{var}); }}""")
    regeln.append(".typ-regel h1, .typ-regel .cm-header-1 { border-left-color: var(--c-regelwerk) !important; }")
    # Tags als farbige Chips
    for tag, var in [("konto/simulierbar", "a1"), ("konto/stelldirvor", "a2"), ("konto/gemeinsam", "projekt")]:
        regeln.append(f'a.tag[href^="#{tag}"], .cm-hashtag[class*="{tag.split("/")[1]}"] {{ background-color: color-mix(in srgb, var(--c-{var}) 22%, transparent); color: var(--c-{var}); border: 1px solid var(--c-{var}); }}')
    regeln.append('a.tag[href^="#regelwerk"] { background-color: color-mix(in srgb, var(--c-regelwerk) 22%, transparent); color: var(--c-regelwerk); border: 1px solid var(--c-regelwerk); }')
    return "\n".join(regeln) + "\n"


def farbcode_notiz():
    zeilen = "\n".join(f"| {f[2]} | `{f[1]}` | {f[0]} |" for k, f in FARBEN.items())
    return f"""---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: tools/hirn_farben.py
tags: [konto/gemeinsam, farbcode, obsidian]
---

# Farbcode

Jede Kategorie hat eine feste Farbe. Du siehst sie im **Graph** (Knoten), in der **Dateiliste** (Ordner und Notizen), bei den **Überschriften** (farbiger Balken und Titel) und bei den **Tags** (farbige Chips). So erkennst du auf einen Blick, was zu welchem Account gehört.

| Farbe | Wert | Kategorie |
|---|---|---|
{zeilen}

## Wichtigste Merkregel
- **Grün = Account 1 (Simulierbar, Geld).**
- **Violett = Account 2 (stelldirvor.pov).**
- **Blau = gemeinsam für beide.**
- **Rot = Regelwerk**, Türkis = Claude-Chat-Befehle, Pink = Lernschleife.

## Technik
- Der Graph nutzt Farbgruppen (`.obsidian/graph.json`): die erste passende Gruppe gewinnt, deshalb stehen Regelwerk, Chat und Lernen vor den Ordnerfarben. Im Graph-Fenster unter „Gruppen“ kannst du Farben von Hand ändern.
- Dateiliste und Überschriften färbt das CSS-Snippet `tiktok-farben` (Einstellungen → Design → CSS-Snippets, muss an sein). Die Überschriftenfarbe kommt aus `cssclasses` im Notizkopf (`konto-simulierbar`, `konto-stelldirvor`, `konto-gemeinsam`).
- Neue Notiz im richtigen Ordner anlegen und im Kopf `konto:` setzen. Danach `python3 tools/hirn_farben.py` (Claude erledigt das), dann stimmt die Farbe.
- Farbwerte ändern: in `tools/hirn_farben.py` (Tabelle `FARBEN`), danach das Skript laufen lassen.

## Siehe auch
[[Wie dieses Hirn funktioniert]] · [[Index]]
"""


def kopf_klassen(text):
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        return text
    kopf = m.group(1)
    konto = (re.search(r"^konto:\s*(\S+)", kopf, re.M) or [None, "gemeinsam"])[1]
    typ = (re.search(r"^typ:\s*(\S+)", kopf, re.M) or [None, "wissen"])[1]
    zeile = f"cssclasses: [konto-{konto}, typ-{typ}]"
    if re.search(r"^cssclasses:.*$", kopf, re.M):
        kopf = re.sub(r"^cssclasses:.*$", zeile, kopf, flags=re.M)
    else:
        kopf = kopf + "\n" + zeile
    return "---\n" + kopf + "\n---\n" + text[m.end():]


def main():
    (HIRN / "00-Start").mkdir(parents=True, exist_ok=True)
    obs = HIRN / ".obsidian"
    (obs / "snippets").mkdir(parents=True, exist_ok=True)
    (obs / "graph.json").write_text(json.dumps(graph(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (obs / "appearance.json").write_text(json.dumps({"enabledCssSnippets": ["tiktok-farben"]}, indent=2) + "\n", encoding="utf-8")
    (obs / "snippets" / "tiktok-farben.css").write_text(css(), encoding="utf-8")
    (HIRN / "00-Start" / "Farbcode.md").write_text(farbcode_notiz(), encoding="utf-8")
    n = 0
    for p in HIRN.rglob("*.md"):
        t = p.read_text(encoding="utf-8")
        neu = kopf_klassen(t)
        if neu != t:
            p.write_text(neu, encoding="utf-8")
            n += 1
    print(f"Farben geschrieben, cssclasses in {n} Notizen gesetzt")


if __name__ == "__main__":
    main()
