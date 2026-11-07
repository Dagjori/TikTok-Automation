---
typ: wissen
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §4, §7, §10
tags: [konto/gemeinsam, technik, umgebung, supabase]
cssclasses: [konto-gemeinsam, typ-wissen]
---

# Technik und Umgebung

## Wo was läuft
| Ort | Was | Hinweis |
|---|---|---|
| **Cloud-Sitzung** (Anthropic, Linux-Container) | Denken, Skript, Szenen, Prüfung, Posting, Radar | flüchtig: nach Inaktivität wird der Container zurückgesetzt; nur das Repo bleibt. Sie sieht **nicht** den Desktop. |
| **Windows-PC des Inhabers** (RTX 2070) | nur Rendern, Dienst ohne KI ([[Render-Dienst Windows-PC]]) | nur mit Supabase verbunden |
| **Supabase** (Frankfurt, Gratis-Plan) | Datei-Austausch: Buffer-Uploads, Render-Aufträge | privater Bucket `buffer-uploads`, ≤ 50 MB je Datei |
| **Buffer** | Posten auf TikTok ([[Plattformregeln und Posting]]) | Essentials, ca. 12 $/Monat |
| **GitHub** `Dagjori/TikTok-Automation` | Repo, öffentlich | PC klont ohne Login (daher noch nicht privat) |
| **Claude-Artifact Cockpit** | Freigaben ([[Cockpit]]) | Planthemen = Archiv |
| **Claude-Artifact Ideen-Studio** | tägliche Ideen und Skripte ([[Claude-Chat-Workflow]]) | https://claude.ai/artifact/PMqMpqpmSHYmuhY229ghZC; fragt Claude auf deinem claude.ai-Konto (`sample`), speichert in der Artifact-Datenbank (`db`); kann nicht recherchieren |
| **Geplante Aufgabe „Lernschleife Insights täglich“** | tägliche Auswertung 19:52 Berlin ([[Lernschleife und Insights]]) | Trigger `trig_01BBUe6iY7u7hpT4kEUSKn4a`, frische Sitzung je Lauf, Sonnet |

## Cloud-Umgebung („Default“)
Netzwerkzugriff eingeschränkt (10 Domains, Paketmanager aktiviert), **3 Netzwerk-Secrets** (Schlüssel für Supabase, ElevenLabs, Buffer u. a.; der Proxy hängt sie an Anfragen an, sie sind in der Sitzung nie sichtbar), Umgebungsvariablen (1: `SUPABASE_URL`).
- **Umgebungsvariablen** stehen in **einem Textfeld im `.env`-Format**, eine Zeile `NAME=Wert`, ohne Leerzeichen um das `=` (richtig: `SUPABASE_URL=https://….supabase.co`, ohne `/` am Ende). Jeder, der die Umgebung nutzt, kann sie lesen, also keine Secrets dort.
- **Klickweg:** in der Sitzung neben dem Titel auf den kleinen Pfeil → „Edit cloud environment“ → Zeile „Umgebungsvariablen“ → eintragen → „Änderungen speichern“ (kleines Fenster) → im großen Fenster nochmals „Änderungen speichern“.
- **Wirkung:** neue Sitzungen sofort; eine laufende Sitzung erst, wenn ihr virtueller Rechner nach einer Ruhepause wieder aufgeweckt wird. Notfalls Wert vor den Befehl setzen.
- **Stand 02.11.:** `SUPABASE_URL` eingetragen (Adresse mit der funktionierenden verglichen, identisch), in der laufenden Sitzung noch nicht aktiv. Bisher holte Claude die Adresse aus der Container-Sicherung `.sitzung/` (geht nach Container-Reset verloren).

## Netzwerk (Beobachtungen)
- **tiktok.com:** das Abrufwerkzeug `WebFetch` löst `www.tiktok.com` **nicht** auf. Über Bash (`curl`, Python `urllib`) geht es über den Proxy (HTTP 200). Öffentliche **Profilseiten** liefern Follower, Likes, Videozahl (so arbeitet `tools/monitor_kanaele.py`); **Such- und Hashtag-Seiten liefern ohne Login keine Videoliste** ([[Recherche-Methode und Grenzen]]).
- **Buffer-Kennzahlen:** `post.metrics` über die GraphQL-Schnittstelle (Aufrufe, Likes, Kommentare, Ø-Wiedergabezeit, Follower; Shares/Saves für TikTok 0), Aktualisierung nur alle paar Stunden. Werkzeug `tools/insights_abrufen.py`.
- `elevenlabs.io` (Doku) gesperrt, `api.elevenlabs.io` erreichbar; TikTok Creative Center und mehrere Drittquellen gesperrt; `api.buffer.com`, Supabase, `api.telegram.org` über die Umgebungs-Einstellungen.
- **Firecrawl-Credits fast leer:** Recherche über die Websuche.
- Viele Plugin-MCP-Server verbinden nicht („403 Forbidden“): irrelevant für das Projekt.

## Vault auf dem Desktop (Entscheidung 07.11., ersetzt das ZIP vom 02.11.)
Claude schreibt in `hirn/` im Repo (Master); `tools/hirn_abgleich.py` spielt jede Änderung **direkt** in den Obsidian-Vault `~/Desktop/TikTok Automation` (Ordner und Dateinamen 1:1, Umlaute korrekt). Der Abgleich läuft automatisch: über Claude-Code-Hooks in den Benutzereinstellungen des Laptops (`~/.claude/settings.json`, eingetragen 07.11. mit Freigabe; im Hintergrund nach jeder Datei- oder Befehlsaktion, die das Hirn betrifft, und beim Sitzungsstart mit Konfliktmeldung) sowie am Ende von `tools/hirn_pruefen.py`, das nach jeder Hirn-Änderung Pflicht ist; einzeln: `python tools/hirn_abgleich.py` (`--pruefen` zeigt nur). Regeln: im Desktop geänderte Notizen werden nicht überschrieben (Konflikt-Meldung), eigene Desktop-Notizen und Dateien bleiben unangetastet und gehen nie automatisch ins öffentliche Repo, die Obsidian-Ansicht (`workspace.json`, Graph-Zoom) bleibt, Ersetztes landet in `.trash/abgleich-<datum>/`. Stand des letzten Abgleichs: `<vault>/.hirn-abgleich.json`. In der Cloud oder auf Rechnern ohne Vault passiert nichts; Notizen aus Cloud-Läufen (z. B. Lernschleife) erreichen den Desktop beim nächsten `git pull` und der nächsten Prüfung. Beim ersten Abgleich (07.11.) wurden 9 vom ZIP zerstörte Dateinamen (z. B. „Kan├ñle“) in den Papierkorb gelegt.

## Verbindungen Cloud ↔ PC (Lehren 02.11.)
- Remote Control und „Ordner anfordern“ funktionieren in Cloud-Sitzungen **nur für Mac/Linux**, nicht für Windows.
- Dispatch (Aufgaben vom Handy an den PC) nur in begrenzter Beta und nur bei offener App.
- Der Weg ist deshalb: Dienst auf dem PC, Austausch über Supabase.

## Blender
`bpy` 5.2.3 in der Cloud (`/home/user/.venv-blender`; nach Container-Neustart neu: `python3 -m venv ~/.venv-blender && ~/.venv-blender/bin/pip install bpy==5.2.3`). Cycles nur CPU (130–300 s je Bild), Eevee unbrauchbar; ganze Videos in Blender-Optik nur über Bake → glTF → Three.js oder auf dem PC mit GPU.

## Stimme (ElevenLabs)
Key nur als Netzwerk-Secret (`xi-api-key` für `api.elevenlabs.io`), nie in der Sitzung sichtbar; `voices_read` für die Bibliothek; Speech-to-Text für Analysen und den Abgleich Sprechtext gegen Spracherkennung. Reichen die Credits nicht: nächstgrößerer Plan (Free hat keine kommerzielle Lizenz). Details [[Stimme und Ton Simulierbar]].

## Kosten (**S**)
ElevenLabs ca. 5–25 $/Monat, Buffer ca. 12 $/Monat, Claude-Abo. Render-PC vorhanden (keine Zusatzkosten).

## Werkzeuge im Repo
`pipeline/` (render.js, mux.sh, klang.py, atmo.py, tts.py, post_buffer.py, qc/, sim/, engine/, projekte/, render_dienst/) · `tools/` (monitor_kanaele.py, trend_score.py, telegram_senden.py, plan_pdf.mjs, regelwerk_pdf.mjs, account2_uebersicht.py, sitzung_sichern.py, hirn_aus_skills.py, stillgelegt seit 07.11.) · `data/` (plan, ideen, monitor, trends) · `docs/` (18-render-pc.md, cockpit, plan, regelwerk, trends) · `marke/` (Logos, Account-2-Marke).
**Render-Selbstheilung (02.11.):** `render.js` öffnet bei hängenden Screenshots den Browser neu und wiederholt das Bild ([[Render-Dienst Windows-PC]]).

## Siehe auch
[[Arbeitsregeln und Sicherheit]] · [[Index]]
