# 18 · Rendern auf dem Windows-PC (Render-Dienst ohne KI)

**Stand:** 02.11.2026 · Auftrag des Inhabers: Die ganze Arbeit (Skript, Szene, Prüfung, Posting) bleibt in der Cloud-Sitzung. **Nur das Rendern läuft auf deinem Windows-PC mit Grafikkarte.** Auf dem PC läuft **kein Claude**, sondern ein kleiner Dienst ohne KI. Der verbraucht keine Token.

**Kennzeichnung:** **[Fakt]** = in der Cloud gemessen oder getestet. **[Annahme]** = auf Windows nicht getestet, nach Dokumentation der Programme. **[Schätzung]** = Rechnung ohne Messung.

## 1. Kurzfazit

- **Warum:** In der Cloud rendert Chrome WebGL über SwiftShader auf 4 CPU-Kernen: ca. 3,4 s je Bild, ca. 2 Std. für 80 s (2.400 Bilder) **[Fakt, gemessen]**. Eine Grafikkarte soll das deutlich verkürzen. **Wie viel genau, ist noch nicht gemessen** **[Annahme]**; die erste Messung steht nach dem ersten Auftrag in `renderzeit.json` (s/Bild).
- **Ablauf (5 Zeilen):**
  1. Claude (Cloud) baut Skript, Szene und Stimme, committet und pusht, dann: `python3 pipeline/render_dienst/auftrag.py senden <projekt> --konto …`.
  2. Der Auftrag liegt im Supabase-Bucket `buffer-uploads` unter `render/`. Der Dienst auf dem PC fragt alle 30 s nach (und meldet jede Minute „ich lebe“).
  3. Der Dienst holt den Commit von GitHub, prüft die Grafikkarte, rendert mit `node render.js … --gpu`, macht Ton und `mux.sh` und lädt das MP4 hoch.
  4. Claude wartet mit `auftrag.py warten` (ein Befehl, kostet beim Warten nichts), holt das MP4 nach `pipeline/out/<projekt>/<projekt>.mp4` und löscht die Dateien in Supabase.
  5. Claude prüft das Video wie bisher und plant es in Buffer ein. Ist der PC aus (kein Herzschlag seit 5 Min.), rendert die Sitzung selbst in der Cloud.
- **Dein Aufwand:** einmal ca. 30 bis 45 Minuten (Schritte 1 bis 9), danach nichts. Der PC muss nur **an und angemeldet** sein (Bildschirm sperren ist okay).
- **Sicherheit:** Der Dienst nimmt nur Aufträge aus deinem eigenen Supabase-Bucket an und führt nur Code aus deinem öffentlichen GitHub-Repo aus. Es werden keine Ports geöffnet, nur ausgehende HTTPS-Verbindungen (GitHub, Supabase). Der Supabase-Schlüssel steht nur in der Datei `.env` auf dem PC (nicht im Repo).

## 2. Was du brauchst

- Windows 10 oder 11, ein PC mit **Grafikkarte** (NVIDIA, AMD oder Intel Arc/Xe, aktueller Treiber), ca. 10 GB freier Platz, Internet.
- Das Passwort deines Supabase-Kontos (für Schritt 5).
- Alles Folgende kopierst du mit der Maus in das Fenster und drückst Enter. Ein Fenster heißt **PowerShell**: Startmenü öffnen, „PowerShell“ tippen, Enter. Du brauchst **keine** Administrator-Rechte, außer Windows fragt von selbst.

## 3. Einrichtung, Schritt für Schritt

### Schritt 1: Programme installieren (ca. 10 Minuten)

Diese vier Zeilen nacheinander kopieren (jede mit Enter). Zwischendurch fragt Windows evtl. „Änderungen zulassen?“ → **Ja**:

```powershell
winget install -e --id Git.Git
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Python.Python.3.12
winget install -e --id Gyan.FFmpeg
```

Danach das PowerShell-Fenster **schließen und ein neues öffnen** (sonst kennt es die neuen Programme nicht). Kontrolle, jede Zeile muss eine Versionsnummer zeigen:

```powershell
git --version
node --version
py -3 --version
ffmpeg -version
```

Hinweis: `winget` ist bei Windows 10/11 dabei. Kommt „winget wird nicht erkannt“, im Microsoft Store die App „App-Installer“ aktualisieren.

### Schritt 2: Das Projekt herunterladen (1 Minute)

```powershell
mkdir C:\render
cd C:\render
git clone -c core.autocrlf=false https://github.com/Dagjori/TikTok-Automation.git
cd tiktok-automation\pipeline
```

Warum `C:\render`: kurzer Pfad ohne Leerzeichen, und **nicht** in OneDrive oder „Dokumente“ (OneDrive würde die vielen Bilder hochladen). Dieser Ordner gehört **nur dem Render-Dienst**: Er setzt ihn bei jedem Auftrag auf den gewünschten Stand zurück. Nichts darin von Hand ändern.

### Schritt 3: Pakete installieren (ca. 5 Minuten)

Im selben Fenster (du bist jetzt in `C:\render\tiktok-automation\pipeline`):

```powershell
npm install
npm install -g playwright
playwright install chromium
py -3 -m pip install numpy
```

Wichtig: Playwright **global** installieren (`-g`) und den Browser mit dem globalen Befehl `playwright install chromium` holen (nicht mit `npx`, das kann eine andere Version laden). Fehlt das, zeigt der Dienst „GPU: keine (Cannot find module …\npm\node_modules\playwright)“ (02.11. so passiert).

Meldet PowerShell bei `npm`: „…npm.ps1 kann nicht geladen werden, da die Ausführung von Skripts … deaktiviert ist“, dann einmal das ausführen und danach die Zeile wiederholen:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

### Schritt 4: Treiber

Aktuellen Grafiktreiber installieren (NVIDIA: GeForce Experience bzw. nvidia.com/drivers, AMD: amd.com/support, Intel: Intel Treiber- und Support-Assistent). Danach den PC einmal neu starten. Ohne echten Treiber nutzt Windows nur eine Software-Grafik („Microsoft Basic Render Driver“), und der Dienst lehnt Aufträge ab.

### Schritt 5: Zugang eintragen (`.env`)

```powershell
cd render_dienst
copy .env.beispiel .env
notepad .env
```

Im Editor zwei Zeilen ausfüllen, speichern (Strg+S), schließen:

```
SUPABASE_URL=https://....supabase.co
SUPABASE_KEY=sb_secret_...
```

**Wo du die Werte findest** (Menünamen ändert Supabase manchmal; sinngemäß suchen):

1. Im Browser **supabase.com/dashboard** öffnen, anmelden, das **Projekt** wählen, das auch Buffer-Uploads bekommt.
2. **URL:** links unten auf das Zahnrad **Project Settings** → **Data API** → Feld **Project URL** → Kopieren-Symbol. Das ist `SUPABASE_URL`.
3. **Schlüssel:** **Project Settings** → **API Keys** → Reiter **Publishable and secret API keys** → Abschnitt **Secret keys** → bei der Zeile `default` auf **Reveal** (Auge) → Kopieren. Er beginnt mit `sb_secret_`. Das ist `SUPABASE_KEY`.
   - Hast du nur den alten Schlüssel: Reiter **Legacy anon, service_role API keys** → **service_role** → **Reveal** → Kopieren, und in `.env` eine dritte Zeile `SUPABASE_AUTH=bearer` ergänzen.
   - **Nicht** den „Publishable“ oder „anon“ Schlüssel nehmen, der darf hier nichts.

**Der Schlüssel ist wie ein Passwort.** Nicht weitergeben, nicht in den Chat schreiben, nicht ins Repo. Die Datei `.env` steht in `.gitignore` und wird nie hochgeladen.

### Schritt 6: Alles prüfen (1 Minute)

```powershell
py -3 pc_test.py
```

**Das musst du sehen** (die Zahlen und Namen sind bei dir anders):

```
[OK]       Python 3.12.x (...)
[OK]       numpy 2.x (für den Ton)
[OK]       git version 2.x
[OK]       GitHub erreichbar (git ls-remote), kein Login nötig
[OK]       Node.js v22.x
[OK]       ffmpeg kann H.264 (libx264)
[OK]       Bash gefunden: C:\Program Files\Git\bin\bash.exe
[OK]       Supabase: Schreiben, Lesen und Löschen funktioniert
[OK]       GPU erkannt: NVIDIA GeForce RTX ...
...
ALLES BEREIT. Dienst starten:  dienst_starten.bat
```

Steht am Ende **„NOCH ZU TUN“**, dann steht unter jedem Punkt der Befehl, der ihn behebt. Danach `py -3 pc_test.py` wiederholen. Besonders wichtig ist die Zeile **„GPU erkannt“**. Steht dort „KEINE echte Grafikkarte erkannt“ oder „SwiftShader“, siehe Fehlerbehebung (Abschnitt 5).

### Schritt 7: Dienst von Hand starten (Probe)

Im Datei-Explorer in den Ordner `C:\render\tiktok-automation\pipeline\render_dienst` gehen und **`dienst_starten.bat` doppelklicken** (oder in PowerShell: `.\dienst_starten.bat`). Ein schwarzes Fenster öffnet sich:

```
... Render-Dienst 1.0 auf DEIN-PC · Repo C:\render\tiktok-automation · Zweig main ...
... GPU: NVIDIA GeForce RTX ...
... Bereit. Warte auf Aufträge ...
```

**Sag Claude in der Sitzung „PC ist an“.** Claude prüft mit `auftrag.py pc`, ob der Herzschlag ankommt, und schickt einen kurzen Testauftrag. Das Fenster zeigt dann den Fortschritt. Fenster offen lassen. Beenden mit **Strg+C**.

### Schritt 8: Autostart über die Windows-Aufgabenplanung

Damit der Dienst nach jedem Anmelden von selbst startet:

1. Startmenü → „**Aufgabenplanung**“ tippen → öffnen.
2. Rechts auf **Aufgabe erstellen…** klicken (nicht „Einfache Aufgabe erstellen“).
3. Reiter **Allgemein:** Name `Render-Dienst`. **„Nur ausführen, wenn der Benutzer angemeldet ist“** auswählen (nötig, sonst hat der Dienst keinen Zugriff auf die Grafikkarte).
4. Reiter **Trigger** → **Neu…** → „Aufgabe starten:“ **Bei Anmeldung** → „Bestimmter Benutzer“ (dein Konto) → Haken **„Aufgabe verzögern für“ 1 Minute** → OK.
5. Reiter **Aktionen** → **Neu…** → Aktion **Programm starten**:
   - Programm/Skript: `C:\render\tiktok-automation\pipeline\render_dienst\dienst_starten.bat`
   - Starten in: `C:\render\tiktok-automation\pipeline\render_dienst`
   - OK.
6. Reiter **Bedingungen:** Haken bei **„Aufgabe nur starten, falls Computer im Netzbetrieb“** entfernen (nur wichtig bei Laptops).
7. Reiter **Einstellungen:**
   - Haken **„Aufgabe so schnell wie möglich nach einem verpassten Start ausführen“** setzen.
   - Haken **„Aufgabe bei Fehler neu starten“** setzen: alle **1 Minute**, höchstens **99** Mal.
   - Haken **„Aufgabe beenden, falls sie länger ausgeführt wird als: 3 Tage“ entfernen** (der Standard würde den Dienst alle 3 Tage abschießen).
   - Unten bei „Falls die Aufgabe bereits ausgeführt wird“ → **„Keine neue Instanz starten“**.
8. **OK** klicken (Windows fragt evtl. nach deinem Windows-Passwort).
9. Probe: In der Liste mit der rechten Maustaste auf `Render-Dienst` → **Ausführen**. Das schwarze Fenster erscheint. Danach den PC einmal neu starten und prüfen, ob es nach der Anmeldung nach ca. 1 Minute von selbst erscheint.

### Schritt 9: Energieoptionen (Ruhezustand)

Solange ein Auftrag läuft, verhindert der Dienst den Ruhezustand selbst. **Im Leerlauf** schläft der PC aber, und dann sieht Claude keinen Herzschlag und rendert in der Cloud (der Rückfall funktioniert, ist aber langsamer). Wenn der PC jederzeit bereit sein soll, einmal in PowerShell:

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 10
```

(Netzbetrieb: Standby nie, Ruhezustand nie, Bildschirm nach 10 Minuten aus. Bildschirm aus und **Sperren mit Win+L sind okay**; **Abmelden nicht**, weil der Dienst dann stoppt.) Bei einem Laptop zusätzlich: Systemsteuerung → Hardware und Sound → Energieoptionen → „Verhalten beim Zuklappen des Computers ändern“ → „Beim Zuklappen“: **Nichts unternehmen**.

Windows-Updates, die den PC neu starten, sind kein Problem: Nach der Anmeldung startet der Dienst von selbst und setzt einen unterbrochenen Auftrag fort.

## 4. Im Alltag

- **Du tust nichts.** Nur: PC an, angemeldet, Internet.
- **Updates:** Der Dienst holt im Leerlauf alle 10 Minuten den neuesten Stand von GitHub. Ändert sich der Dienst selbst, startet er sich neu (`dienst_starten.bat` fängt das ab).
- **Fortschritt:** Im schwarzen Fenster. Die Protokolle liegen in `C:\render\tiktok-automation\pipeline\out\_render_dienst\<auftrag>.log`.
- **Bilder und Zwischenstände** liegen in `pipeline\out\<projekt>\frames` (ca. 600 MB je Video **[Fakt, gemessen an einem Video]**). Wird der Platz knapp: den Ordner `pipeline\out` löschen (geht jederzeit, nur bei laufendem Auftrag nicht).
- **Dienst stoppen:** Strg+C im Fenster (oder Fenster schließen). Ein laufender Auftrag wird beim nächsten Start fortgesetzt.
- **Wie Claude den Dienst benutzt:** `auftrag.py pc` (Herzschlag), `auftrag.py senden`, `auftrag.py status`, `auftrag.py warten`. Technik siehe Abschnitt 6.

## 5. Fehlerbehebung

| Symptom | Ursache und Lösung |
|---|---|
| `pc_test.py`: **„KEINE echte Grafikkarte erkannt“ / „SwiftShader“ / „Microsoft Basic Render Driver“** | Kein oder falscher Grafiktreiber. Treiber des Herstellers installieren (Schritt 4), PC neu starten, Test wiederholen. Läuft der Test über Remote-Desktop, direkt am PC testen (Remote-Desktop schaltet die Grafikkarte oft ab). Zwei Grafikkarten (Laptop)? Windows-Einstellungen → System → Anzeige → Grafik → `node.exe` und `chrome-headless-shell.exe` auf „Höchstleistung“ stellen. Hilft nichts: Claude melden, in `render.js` kann ein anderer Chrome-Modus gewählt werden. |
| **„WebGL-Test fehlgeschlagen“** | Meist Treiber. Sonst `playwright install chromium` wiederholen. Meldung an Claude weitergeben. |
| **„Cannot find module playwright“** | `npm install -g playwright` ausführen, neues Fenster öffnen. |
| **„Executable doesn't exist“** | `playwright install chromium` ausführen (neues PowerShell-Fenster). |
| `winget` / `git` / `node` / `ffmpeg` „wird nicht erkannt“ | Nach der Installation ein **neues** PowerShell-Fenster öffnen. Hilft das nicht: PC neu starten. |
| **Git Bash nicht gefunden** | Git for Windows (Schritt 1) installieren. Liegt es an einem ungewöhnlichen Ort: in `.env` die Zeile `BASH_PFAD=C:\Pfad\zu\Git\bin\bash.exe` ergänzen. **Nicht** `C:\Windows\System32\bash.exe` nehmen (das ist WSL). |
| `mux.sh`: „$'\r': command not found“ | Windows-Zeilenenden. Der Dienst repariert das automatisch. Dauerhaft: `git config core.autocrlf false` (im Klon) und `git checkout -f -- pipeline/mux.sh`. |
| Es öffnet sich der Microsoft Store, wenn `python` getippt wird | Windows-Einstellungen → Apps → Erweiterte App-Einstellungen → **App-Ausführungsaliase** → `python.exe` und `python3.exe` ausschalten. Der Dienst nutzt ohnehin `py -3`. |
| **Supabase: 401/403, „invalid API key“, „Authorization“** | Falscher Schlüssel (Publishable/anon statt Secret/service_role) oder Tippfehler. Bei dem alten service_role-Schlüssel `SUPABASE_AUTH=bearer` in `.env`. |
| **Supabase / GitHub nicht erreichbar** | Firewall oder Firmen-Proxy. Der Dienst braucht nur **ausgehendes HTTPS (Port 443)** zu `github.com` und `*.supabase.co`, keine eingehenden Ports. Fragt die Windows-Firewall bei `node.exe` oder `python.exe`, **Zugriff zulassen** (privates Netzwerk). |
| Dienst meldet **„läuft schon“** | Es läuft ein zweites Fenster desselben Dienstes. Eins schließen. |
| Auftrag **„keine_gpu“** | Die GPU-Prüfung vor dem Auftrag fand nur Software-Rendering. Treiber prüfen (siehe oben). Claude rendert dann in der Cloud. |
| Auftrag **„fehler“** | Claude bekommt das Log (letzte Zeilen) und rendert in der Cloud oder sendet nach der Korrektur neu. Das vollständige Log: `pipeline\out\_render_dienst\<auftrag>.log`. |
| Rendern „hängt“ | Gibt ein Programm 25 Minuten lang keine Zeile aus, bricht der Dienst es ab (Status „fehler“). |
| Datei **zu groß (50 MB)** | Der Dienst macht automatisch eine verkleinerte Kopie wie `post_buffer.py` (Ziel 45 MB). Das gepostete Video ist ohnehin diese Kopie. |
| Festplatte voll | `pipeline\out` löschen (nicht während eines Auftrags). |
| Aufgabenplanung zeigt „Letztes Ergebnis 0x1“ | Pfad im Reiter „Aktionen“ prüfen (Programm und „Starten in“), dann Rechtsklick → Ausführen. Fenster erscheinen nur, wenn du angemeldet bist. |

## 6. Technik (für Claude und für Fehlersuche)

**Dateien:** `pipeline/render_dienst/`: `dienst.py` (PC), `auftrag.py` (Cloud), `speicher.py` (gemeinsamer Supabase-Zugriff, nutzt `post_buffer.Supabase`), `gpu_pruefung.mjs` (WebGL-Renderer, gleiche Chromium-Schalter wie `render.js`), `pc_test.py`, `dienst_starten.bat`, `.env.beispiel`. Änderungen außerhalb davon: `mux.sh` (Variable `PYTHON` überschreibt den Python-Fund), `.gitattributes` (`*.sh` mit LF, `*.bat` mit CRLF), `.gitignore` (`!.env.beispiel`).

**Bucket `buffer-uploads`, Präfix `render/`** (kein neuer Bucket, keine Tabellen):

| Pfad | Inhalt | Schreibt |
|---|---|---|
| `render/auftraege/<id>.json` | Auftrag: `projekt`, `konto` (`simulierbar`\|`stelldirvor.pov`), `commit` (40 Zeichen), `optionen` (`von`, `bis`, `worker`, `qualitaet`, `fps`, `format`, `query`, `bilder`), `ton` (`mux_args`, `ohne_ton`) | Cloud |
| `render/status/<id>.json` | `status` = `wartet`\|`laeuft`\|`fertig`\|`fehler`\|`keine_gpu`, `phase`, `prozent`, `bilder`, `rest_min`, `rechner`, `gpu`, `modus`, `dateien`, `renderzeit`, `fehler` | PC (anfangs Cloud) |
| `render/fertig/<id>/` | `video.mp4`, `ereignisse.json`, `renderzeit.json`, `log.txt` | PC |
| `render/herzschlag/<rechner>.json` | `zeit`, `rechner`, `gpu`, `gpu_ok`, `status`, `auftrag`, `prozent`, `version`, `head`, `cpu_erlaubt` | PC (jede Minute) |

**ID** = `JJJJMMTT-HHMMSS-<projekt>-<4 Zeichen>`. Online heißt: Dateialter laut **Supabase-Serverzeit** höchstens 300 s (die Uhr des PCs spielt keine Rolle) und Status nicht `beendet`.

**Schritte auf dem PC (wie im Skill, ohne Logik doppelt):**

| Konto | Schritte |
|---|---|
| `simulierbar` | `git fetch` + `checkout --detach <commit>` → `node render.js projekte/<p> --gpu [Optionen]` → `bash mux.sh projekte/<p> [Ton-Optionen]` (ruft `klang.py`: Stimme aus dem Commit + Effekte + Teppich, dann loudnorm −14 LUFS, H.264 CRF 18) |
| `stelldirvor.pov` | gleiches Rendern → `python atmo.py projekte/<p>` → `TON_FERTIG=1 LRA_ZIEL=20 bash mux.sh projekte/<p>` |

Wie in der Cloud nötig im Commit: bei Simulierbar `audio/stimme.mp3` und `audio/timing.json` (`senden` prüft das), bei Account 2 `ton.json`. `senden` prüft außerdem, dass der Commit auf GitHub liegt und dass es in `pipeline/projekte/<p>`, `engine`, `render.js`, `mux.sh`, `klang.py`, `atmo.py` keine nicht committeten Änderungen gibt (der PC sieht nur GitHub, nicht die Sitzung).

**Befehle in der Sitzung:**

```bash
python3 pipeline/render_dienst/auftrag.py pc                      # Exit 0 = online, 3 = offline
python3 pipeline/render_dienst/auftrag.py senden a2-beispiel --konto stelldirvor.pov   # Exit 3 = PC offline → in der Cloud rendern
python3 pipeline/render_dienst/auftrag.py warten                  # letzter Auftrag; im Hintergrund starten (run_in_background)
python3 pipeline/render_dienst/auftrag.py status [--alle]
python3 pipeline/render_dienst/auftrag.py aufraeumen [--alles]    # liegengebliebene Dateien unter render/
```

**Exit-Codes** von `senden`/`warten`: 0 ok · 1 Fehler · 2 Voraussetzung nicht erfüllt (nicht gepusht, nicht committet, Stimme fehlt) · 3 PC offline oder ausgefallen · 4 Zeitlimit · 5 `keine_gpu`.

**Ergebnis in der Cloud:** `pipeline/out/<projekt>/<projekt>.mp4` (Name wie `mux.sh`; `qc/referenz_pov.py` findet es), dazu `ereignisse.json` (auch nach `projekte/<projekt>/audio/`, wie `render.js`) und `render_pc/renderzeit.json`, `render_pc/log.txt`. Bilder liegen nicht in der Cloud: Für die Sichtprüfung Standbilder und Kontaktbogen mit `ffmpeg` aus dem MP4 ziehen. Über 48 MB macht der PC eine verkleinerte Kopie wie `post_buffer.py` (das MP4 im Bucket darf höchstens 50 MB haben); `status.dateien.video.verkleinert` zeigt das an.

**Test des Dienstes ohne Grafikkarte (nur Entwicklung):** `python3 dienst.py --cpu-erlaubt --repo <eigener Klon>`; rendert dann mit SwiftShader und meldet sich im Herzschlag als `cpu_erlaubt`. **Nie im Arbeits-Repo der Sitzung starten**, der Dienst setzt seinen Klon bei jedem Auftrag zurück (er verweigert den Start bei nicht gesicherten Änderungen).

## 7. Offene Punkte und Risiken

- **Grafikkarte in Headless-Chrome unter Windows: getestet [Fakt, 02.11.].** RTX 2070 über ANGLE/Direct3D 11, 0,04 s/Bild (Cloud ca. 3,4 s). Gelegentliche Screenshot-Hänger der Grafikkarte fängt `render.js` selbst ab (Browser neu öffnen, Wiederholung); ohne diese Reparatur brach ein Voll-Render zweimal bei ca. Bild 1.200 bzw. 1.980 ab.
- **`mux.sh` unter Git Bash: getestet [Fakt, 02.11.].** Fußgängerampel komplett auf dem PC gerendert und gemischt: 66,27 s, −14,0 LUFS, wie das Original; gesamt ca. 3 Min. (Rendern 1,2 Min.).
- **Schriften:** Auf dem PC greift `@fontsource/inter` aus `npm install`, wenn Inter nicht installiert ist (Hinweis in `pipeline/README.md`). Das Aussehen kann leicht von der Cloud abweichen (Zeilenabstände); die erste Abnahme eines PC-Renders vergleicht deshalb ein Standbild mit dem aus der Cloud.
- **Verkleinerte Kopie:** Sobald das MP4 über 48 MB liegt, hat die Cloud nur die Kopie (ca. 45 MB). Gepostet würde ohnehin diese Kopie. Ein Original in voller Qualität wird nicht übertragen.
- **Ein PC, ein Auftrag zugleich.** Mehrere Aufträge stehen in der Reihenfolge ihrer ID in der Warteschlange. Ein Abbruch eines laufenden Auftrags aus der Cloud ist nicht vorgesehen (Dienst am PC mit Strg+C beenden).
- **Zeitgleich Cloud und PC** (Rückfall bei Ausfall): Die Sitzung sollte einen offenen Auftrag erst mit `auftrag.py aufraeumen --alles` entfernen, bevor sie selbst rendert, sonst rendert der PC beim Wiederkommen doppelt.
