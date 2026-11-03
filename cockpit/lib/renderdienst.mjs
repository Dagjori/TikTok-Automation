// Render-Dienst im Cockpit: startet pipeline/render_dienst/dienst.py als Unterprozess (kein eigenes Fenster mehr),
// liest jede Zeile mit, startet nach einem Dienst-Update (Exit 75, wie dienst_starten.bat) und nach Abstürzen neu.
// Läuft, solange der Cockpit-Server läuft (Entscheidung des Inhabers 03.11.: „nur mit offenem Cockpit“).
import fs from "node:fs";
import path from "node:path";
import { spawn, execFile } from "node:child_process";

const EXIT_NEUSTART = 75;
const PAUSEN = [5, 15, 30, 60, 120, 300]; // Sekunden zwischen Neustarts nach Absturz

export function erstelleRenderDienst({ renderRepo, senden = () => {}, log = () => {}, maskiere = (t) => t }) {
  const ordner = path.join(renderRepo, "pipeline", "render_dienst");
  const z = { status: "aus", pid: null, start: null, neustarts: 0, letzterCode: null, hinweis: "", zeilen: [], gewollt: false, fremd: false };
  let prozess = null;
  let timer = null;

  function zustand() {
    const { zeilen, ...rest } = z;
    return { ...rest, zeilen: zeilen.slice(-80) };
  }
  const melden = () => senden("dienst", zustand());

  function zeile(text, art = "aus") {
    const eintrag = { zeit: new Date().toISOString(), text: maskiere(text), art };
    z.zeilen.push(eintrag);
    if (z.zeilen.length > 400) z.zeilen.splice(0, z.zeilen.length - 400);
    senden("dienst_zeile", eintrag);
    // Erkennen, dass schon ein anderes Fenster den Dienst betreibt
    // dienst.py: „Der Render-Dienst läuft in diesem Klon schon (zweites Fenster?). Beende mich.“
    if (/läuft .*schon|zweites Fenster/i.test(text)) {
      z.fremd = true;
      z.hinweis = "Der Render-Dienst läuft noch in einem eigenen Fenster. Mit „Übernehmen“ beendet das Cockpit das Fenster und führt den Dienst selbst.";
    }
  }

  function starten() {
    if (prozess) return;
    clearTimeout(timer);
    if (!fs.existsSync(path.join(ordner, "dienst.py"))) {
      Object.assign(z, { status: "fehler", hinweis: `dienst.py nicht gefunden in ${ordner}` });
      melden();
      return;
    }
    z.gewollt = true;
    z.fremd = false;
    z.hinweis = "";
    const p = spawn("py", ["-3", "-u", "dienst.py"], {
      cwd: ordner,
      windowsHide: true,
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    prozess = p;
    Object.assign(z, { status: "startet", pid: p.pid, start: new Date().toISOString() });
    log(`Render-Dienst gestartet (PID ${p.pid})`);
    melden();
    let rest = { out: "", err: "" };
    const lesen = (kanal, art) => (chunk) => {
      rest[kanal] += chunk;
      let i;
      while ((i = rest[kanal].indexOf("\n")) >= 0) {
        const t = rest[kanal].slice(0, i).replace(/\r$/, "");
        rest[kanal] = rest[kanal].slice(i + 1);
        if (!t.trim()) continue;
        zeile(t, art);
        if (z.status === "startet" && /Bereit/.test(t)) { z.status = "laeuft"; z.neustarts = 0; melden(); }
      }
    };
    p.stdout.setEncoding("utf8");
    p.stderr.setEncoding("utf8");
    p.stdout.on("data", lesen("out", "aus"));
    p.stderr.on("data", lesen("err", "fehler"));
    p.on("error", (e) => zeile(`Konnte nicht starten: ${e.message}`, "fehler"));
    p.on("close", (code) => {
      prozess = null;
      Object.assign(z, { pid: null, letzterCode: code });
      if (!z.gewollt) {
        z.status = "aus";
        zeile("Render-Dienst angehalten.", "info");
        melden();
        return;
      }
      if (code === EXIT_NEUSTART) {
        zeile("Der Render-Dienst wurde aktualisiert und startet neu …", "info");
        z.status = "startet";
        melden();
        timer = setTimeout(starten, 5000);
        return;
      }
      if (z.fremd) {
        z.status = "fremd";
        melden();
        return;
      }
      const pause = PAUSEN[Math.min(z.neustarts, PAUSEN.length - 1)];
      z.neustarts++;
      z.status = "neustart";
      z.hinweis = `Beendet mit Code ${code}. Neuer Versuch in ${pause} s.`;
      zeile(z.hinweis, "fehler");
      melden();
      timer = setTimeout(starten, pause * 1000);
    });
  }

  function stoppen() {
    z.gewollt = false;
    clearTimeout(timer);
    if (prozess?.pid) execFile("taskkill", ["/PID", String(prozess.pid), "/T", "/F"], { windowsHide: true }, () => {});
    else { z.status = "aus"; melden(); }
  }

  // Altes Fenster (dienst_starten.bat aus der Aufgabenplanung) beenden und selbst übernehmen
  function uebernehmen() {
    execFile("powershell.exe", ["-NoProfile", "-Command",
      "Get-CimInstance Win32_Process | Where-Object { ($_.CommandLine -match 'render_dienst\\\\dienst_starten\\.bat') -or ($_.Name -match 'python' -and $_.CommandLine -match 'dienst\\.py') } | ForEach-Object { $_.ProcessId }"],
    { windowsHide: true }, (_e, out) => {
      const eigene = prozess?.pid;
      const pids = String(out || "").split(/\s+/).map(Number).filter((n) => n && n !== eigene);
      let offen = pids.length;
      const weiter = () => { if (--offen <= 0) setTimeout(() => { z.fremd = false; starten(); }, 1500); };
      if (!offen) return weiter();
      for (const pid of pids) execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, weiter);
      zeile(`Altes Render-Dienst-Fenster beendet (${pids.length} Prozess(e)), das Cockpit übernimmt.`, "info");
    });
  }

  return { starten, stoppen, uebernehmen, zustand, laeuft: () => !!prozess };
}
