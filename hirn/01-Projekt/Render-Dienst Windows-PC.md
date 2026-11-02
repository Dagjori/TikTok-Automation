---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: docs/18-render-pc.md, CLAUDE.md §4
tags: [konto/gemeinsam, render, windows, gpu]
cssclasses: [konto-gemeinsam, typ-anleitung]
---

# Render-Dienst auf dem Windows-PC

**Entscheidung 02.11.:** Die ganze Arbeit (Skript, Szene, Prüfung, Posting) bleibt in der Cloud-Sitzung. **Nur das Rendern läuft auf dem Windows-PC** des Inhabers, über einen kleinen Dienst **ohne KI** (verbraucht keine Tokens). Ist der PC aus, rendert die Cloud (Rückfall).

## Ergebnis (gemessen 02.11.2026, **F**)
| | Cloud (SwiftShader, 4 Kerne) | Windows-PC (RTX 2070, `DESKTOP-IAD2JVM`) |
|---|---|---|
| Zeit pro Bild | ca. 3,4 s | **0,04 s** |
| ganzes Video | ca. 1–3 Std. (80 s = 2.400 Bilder) | **ca. 3 Min.** inklusive Ton und Übertragung (66 s, 1.988 Bilder: Rendern 1,2 Min.) |
- Qualität gleich: Test mit „Fußgängerampel“ (Simulierbar): Dauer 66,27 s und −14,0 LUFS identisch zum gepostet Original, Bild gleich; Account-2-Weg mit „Eiszeit Toronto“ (10-s-Ausschnitt) ebenfalls getestet.
- **Noch nicht auf der GPU gemessen:** Stile 17–21 ([[Stile 17 bis 21]]; mehr Licht und Schatten, Schätzung höchstens 5–10 Min.).

## Ablauf
1. Claude (Cloud) baut Skript, Szene, Stimme, committet und pusht, dann `python3 pipeline/render_dienst/auftrag.py senden <projekt> --konto simulierbar|stelldirvor.pov`.
2. Der Auftrag liegt im Supabase-Bucket `buffer-uploads` unter `render/`. Der Dienst fragt alle 30 s nach und meldet jede Minute „ich lebe“.
3. Der Dienst holt den Commit von GitHub, prüft die GPU (`gpu_pruefung.mjs`), rendert mit `node render.js … --gpu`, mischt Ton (`mux.sh` über Git Bash) und lädt das MP4 hoch.
4. Claude wartet mit `auftrag.py warten` (Hintergrund, kostet nichts), bekommt das MP4 nach `pipeline/out/<projekt>/<projekt>.mp4` und die Dateien in Supabase werden gelöscht.
5. Claude prüft das Video wie bisher und plant es in Buffer ein ([[Plattformregeln und Posting]]).

## Befehle (in der Cloud-Sitzung)
| Befehl | Zweck |
|---|---|
| `auftrag.py pc` | Herzschlag und GPU des PCs; Exit 0 = online, 3 = offline |
| `auftrag.py senden <projekt> --konto …` | Auftrag senden (prüft: Commit liegt auf GitHub, nichts Uncommittetes in Projekt/Engine, Stimme bzw. `ton.json` im Commit); Optionen `--von/--bis` (Sekunden), `--ohne-ton`, `--worker`, `--query`, `--bilder`, `--trocken` |
| `auftrag.py warten [id]` | auf Ergebnis warten (im Hintergrund starten) |
| `auftrag.py status [--alle]` | Status |
| `auftrag.py aufraeumen [--alles]` | Liegengebliebenes unter `render/` löschen |
Voraussetzung in der Sitzung: Umgebungsvariable `SUPABASE_URL` ([[Technik und Umgebung]]).

**Exit-Codes** von `senden`/`warten`: 0 ok · 1 Fehler · 2 Voraussetzung fehlt (nicht gepusht, nicht committet, Stimme fehlt) · 3 PC offline oder ausgefallen (**dann Cloud-Render**: `node render.js … --worker 2`, `./mux.sh`) · 4 Zeitlimit · 5 `keine_gpu`.

## Kanal (Supabase-Bucket `buffer-uploads`, Präfix `render/`)
`auftraege/<id>.json` (Cloud schreibt) · `status/<id>.json` (`wartet`/`laeuft`/`fertig`/`fehler`/`keine_gpu`, Phase, Prozent) · `fertig/<id>/` (`video.mp4`, `ereignisse.json`, `renderzeit.json`, `log.txt`) · `herzschlag/<rechner>.json` (jede Minute). ID = `JJJJMMTT-HHMMSS-<projekt>-<4 Zeichen>`. Online heißt: Herzschlag ≤ 300 s alt nach Supabase-Serverzeit.

## Einrichtung auf dem PC (einmalig, ca. 30–45 Min.; Details `docs/18-render-pc.md`)
Windows 10/11, Grafikkarte mit aktuellem Treiber, ca. 10 GB frei. Alles in PowerShell, ohne Administrator-Rechte.
1. **Programme:** `winget install -e --id Git.Git`, `OpenJS.NodeJS.LTS`, `Python.Python.3.12`, `Gyan.FFmpeg`; danach neues PowerShell-Fenster.
2. **Projekt:** `mkdir C:\render`, dort `git clone -c core.autocrlf=false https://github.com/Dagjori/TikTok-Automation.git` (Ordner gehört nur dem Dienst, nie von Hand ändern, nicht in OneDrive).
3. **Pakete:** `npm install`, **`npm install -g playwright`** und danach **`playwright install chromium`** (global, nicht mit `npx`), `py -3 -m pip install numpy`.
4. **Treiber:** aktuellen Grafiktreiber installieren.
5. **Zugang:** in `pipeline\render_dienst\` `copy .env.beispiel .env`, dann `SUPABASE_URL` und `SUPABASE_KEY` (Secret key `sb_secret_…`) eintragen; **Schlüssel nur der Inhaber selbst, nie in einen Chat**.
6. **Prüfen:** `py -3 pc_test.py` muss „GPU erkannt“ und „ALLES BEREIT“ zeigen.
7. **Dienst starten:** `dienst_starten.bat` (schwarzes Fenster „Render-Dienst“ offen lassen).
8. **Autostart:** Windows-Aufgabenplanung, Aufgabe „Render-Dienst“, „Nur ausführen, wenn Benutzer angemeldet“, Trigger „Bei Anmeldung“ (1 Min. verzögert), Aktion = `dienst_starten.bat`, Neustart bei Fehler, **Haken „länger als 3 Tage beenden“ entfernen**.
9. **Energieoptionen:** `powercfg /change standby-timeout-ac 0`, `hibernate-timeout-ac 0`, `monitor-timeout-ac 10`. Sperren (Win+L) ist okay, **Abmelden nicht**.

**Stand 02.11. abends:** Schritte 1–7 erledigt, Dienst läuft im Fenster; **Schritt 8 und 9 (Autostart, Energieoptionen) offen** ([[Stand und nächste Schritte]]).

## Sicherheit
Der Dienst nimmt nur Aufträge aus dem eigenen Supabase-Bucket und führt nur Code aus dem öffentlichen GitHub-Repo aus. Keine offenen Ports, nur ausgehendes HTTPS. Der Schlüssel steht nur in der `.env` auf dem PC. **Repo nicht auf privat stellen**, solange der PC ohne Login klont (sonst vorher Lesezugang einrichten, ca. 10 Min.).

## Fehlerbehebung
| Symptom | Lösung |
|---|---|
| „Cannot find module …playwright“ / GPU: keine (02.11. so passiert) | `npm install -g playwright`, `playwright install chromium`, neues Fenster; der Dienst prüft die GPU vor jedem Auftrag neu, kein Neustart nötig |
| „KEINE echte Grafikkarte“ / SwiftShader / Basic Render Driver | Treiber installieren, PC neu starten; Test direkt am PC (Remotedesktop schaltet die GPU oft ab); bei Laptop mit 2 GPUs `node.exe` auf „Höchstleistung“ |
| Screenshot-Zeitüberschreitung mitten im Render (02.11. zweimal, bei Bild ca. 1.200 und 1.980) | seit Commit `b725767` repariert `render.js` das selbst (Screenshot-Timeout 30 s, Browser neu öffnen, 3 Versuche; auf der GPU alle 600 Bilder neuer Browser); Hinweis im Log: „Browser neu öffnen“ |
| `winget`/`git`/`node`/`ffmpeg` nicht erkannt | neues PowerShell-Fenster, sonst PC neu starten |
| Git Bash nicht gefunden | Git for Windows installieren, ggf. `BASH_PFAD` in `.env`; nicht `System32\bash.exe` (WSL) |
| Supabase 401/403 | falscher Schlüssel (Publishable/anon statt Secret); alter Schlüssel `service_role`: zusätzlich `SUPABASE_AUTH=bearer` |
| Auftrag `keine_gpu` / `fehler` | Claude rendert in der Cloud oder sendet nach Korrektur neu; Log `pipeline\out\_render_dienst\<auftrag>.log` |
| Rendern „hängt“ | ohne Ausgabe 25 Min. → Abbruch (Status `fehler`) |
| Datei über 50 MB | Dienst erzeugt automatisch verkleinerte Kopie (Ziel 45 MB), die auch gepostet wird |
| Platte voll | `pipeline\out` löschen (nicht während eines Auftrags) |

## Lehren vom 02.11.
- Die Cloud-Sitzung kann sich **nicht** mit Windows-Ordnern verbinden (Remote Control/„Ordner anfordern“ nur Mac/Linux). Deshalb der Dienst ohne Claude: Auftrag per Supabase.
- Dispatch (Handy → PC) war als Einrichtungsweg denkbar, ist aber in begrenzter Beta; die Einrichtung lief schließlich durch eine lokale Claude-Sitzung auf dem PC.
- Auf dem PC liegt der Klon unter `C:\render\TikTok-Automation`.

## Siehe auch
[[Produktion Rhythmus und Modelle]] · [[Technik und Umgebung]] · [[Technik und Szenenbau Simulierbar]] · [[Technik und Szenenbau Account 2]] · [[Index]]
