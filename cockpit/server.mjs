#!/usr/bin/env node
// TikTok-Cockpit: lokaler Server (nur 127.0.0.1, ohne npm-Pakete).
// Liefert die Oberfläche, Live-Ereignisse per SSE, den Render-Stand (Supabase + Bilder vom Laptop),
// den Tagesplan aus dem Repo, startet Claude Code (CLI, Abo des Inhabers), führt die Ziele und holt das Berliner Wetter.
// Start: node cockpit/server.mjs  (oder Desktop-Verknüpfung / Strg+Alt+T, siehe cockpit/README.md)
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { spawn, execFile, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { erstelleDb, DbFehler, SAMMLUNGEN } from "./lib/db.mjs";
import { erstelleStudio, KONTEN } from "./lib/studio.mjs";
import { erstelleRenderDienst } from "./lib/renderdienst.mjs";
import { modellWaehlen, eineStufeHoeher } from "./lib/modelle.mjs";
import { erstelleZahlen } from "./lib/zahlen.mjs";
import { erstelleLernen } from "./lib/lernen.mjs";
import { erstelleAbgleich } from "./lib/abgleich.mjs";
import { erstelleWetter } from "./lib/wetter.mjs";

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ARBEITS_REPO = path.resolve(HIER, "..");
const RENDER_REPO = process.env.RENDER_REPO || "C:\\render\\tiktok-automation";
const PORT = Number(process.env.COCKPIT_PORT || 4777);
const DATEN = process.env.COCKPIT_DATEN || path.join(HIER, "daten"); // COCKPIT_DATEN nur für Tests
const OEFFENTLICH = path.join(HIER, "public");
const TOKEN = crypto.randomBytes(16).toString("hex");
const CLAUDE_TOKEN = crypto.randomBytes(16).toString("hex"); // nur für node cockpit/db.mjs in Claude-Prozessen
const STEUER_TOKEN = crypto.randomBytes(16).toString("hex"); // nur für Chat-Aufträge des Inhabers: node cockpit/aktion.mjs
const INSTANZ = crypto.randomBytes(6).toString("hex"); // wechselt bei jedem Start: die Oberfläche lädt dann neu (neues Token, neuer Code)
const ERLAUBTE_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const RECHNER = (process.env.COCKPIT_RECHNER || os.hostname()).toUpperCase(); // COCKPIT_RECHNER nur für Tests
const OFFLINE_NACH_S = 300;
const ZEITZONE = "Europe/Berlin";

fs.mkdirSync(DATEN, { recursive: true });
const logDatei = fs.createWriteStream(path.join(DATEN, "server.log"), { flags: "a" });
function log(text) {
  const zeile = `${new Date().toISOString()} ${text}`;
  logDatei.write(zeile + "\n");
  console.log(zeile);
}

// ───────────────────────── Geheimnisse (bleiben im Server, nie im Browser, nie bei Claude) ─────────────────────────

function ladeEnv(datei) {
  const werte = {};
  try {
    for (const roh of fs.readFileSync(datei, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
      const zeile = roh.trim();
      if (!zeile || zeile.startsWith("#") || !zeile.includes("=")) continue;
      const i = zeile.indexOf("=");
      let v = zeile.slice(i + 1).trim();
      if (v.length >= 2 && v[0] === v.at(-1) && `"'`.includes(v[0])) v = v.slice(1, -1);
      if (v) werte[zeile.slice(0, i).trim()] = v;
    }
  } catch { /* Datei fehlt */ }
  return werte;
}

const GEHEIM = {
  ...ladeEnv(path.join(RENDER_REPO, "pipeline", "render_dienst", ".env")),
  ...ladeEnv(path.join(ARBEITS_REPO, "pipeline", "render_dienst", ".env")),
};
const SB = {
  url: (GEHEIM.SUPABASE_URL || "").replace(/\/+$/, ""),
  key: GEHEIM.SUPABASE_KEY || "",
  bucket: GEHEIM.SUPABASE_BUCKET || "buffer-uploads",
  auth: GEHEIM.SUPABASE_AUTH || "keine",
  authorization: GEHEIM.SUPABASE_AUTHORIZATION || "",
};

function maskiere(text) {
  let t = String(text ?? "");
  for (const g of [SB.url, SB.key, SB.authorization]) if (g && g.length > 6) t = t.split(g).join("<GEHEIM>");
  return t;
}

// ───────────────────────── Supabase (gleiche Köpfe wie post_buffer.Supabase) ─────────────────────────

function sbKopf(extra = {}) {
  const k = { ...extra };
  if (SB.key) {
    k.apikey = SB.key;
    if (SB.auth === "bearer") k.Authorization = "Bearer " + SB.key;
  }
  if (SB.authorization) k.Authorization = SB.authorization;
  return k;
}

const sbPfad = (o) => encodeURI(o).replace(/#/g, "%23").replace(/\?/g, "%3F");

async function sbListe(praefix) {
  const r = await fetch(`${SB.url}/storage/v1/object/list/${sbPfad(SB.bucket)}`, {
    method: "POST",
    headers: sbKopf({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix: praefix, limit: 1000, offset: 0, sortBy: { column: "name", order: "asc" } }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`Supabase Auflisten ${praefix}: HTTP ${r.status}`);
  return (await r.json()).filter((e) => !String(e.name || "").startsWith("."));
}

async function sbJson(objekt) {
  const r = await fetch(`${SB.url}/storage/v1/object/authenticated/${sbPfad(SB.bucket)}/${sbPfad(objekt)}?t=${Date.now()}`, {
    headers: sbKopf({ "Cache-Control": "no-cache" }),
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404 || r.status === 400) return null;
  if (!r.ok) throw new Error(`Supabase Lesen ${objekt}: HTTP ${r.status}`);
  try {
    return JSON.parse((await r.text()).replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
}

async function sbSchreiben(objekt, daten) {
  const r = await fetch(`${SB.url}/storage/v1/object/${sbPfad(SB.bucket)}/${sbPfad(objekt)}`, {
    method: "POST",
    headers: sbKopf({ "Content-Type": "application/json", "x-upsert": "true", "Cache-Control": "max-age=0" }),
    body: JSON.stringify(daten),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Supabase Schreiben ${objekt}: HTTP ${r.status}`);
}

// Nur anlegen, wenn es die Datei noch nicht gibt („wer zuerst kommt“, lib/abgleich.mjs): true = angelegt, false = gab es schon
async function sbAnlegen(objekt, daten) {
  const r = await fetch(`${SB.url}/storage/v1/object/${sbPfad(SB.bucket)}/${sbPfad(objekt)}`, {
    method: "POST",
    headers: sbKopf({ "Content-Type": "application/json", "x-upsert": "false" }),
    body: JSON.stringify(daten),
    signal: AbortSignal.timeout(20000),
  });
  if (r.ok) return true;
  const text = await r.text().catch(() => "");
  if (r.status === 409 || /Duplicate|already exists/i.test(text)) return false;
  throw new Error(`Supabase Anlegen ${objekt}: HTTP ${r.status}`);
}

async function sbLoeschen(objekte) {
  const r = await fetch(`${SB.url}/storage/v1/object/${sbPfad(SB.bucket)}`, {
    method: "DELETE",
    headers: sbKopf({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefixes: objekte }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`Supabase Löschen: HTTP ${r.status}`);
}

// ───────────────────────── Live-Ereignisse (SSE) ─────────────────────────

const clients = new Set();
function senden(art, daten) {
  const text = `event: ${art}\ndata: ${JSON.stringify(daten)}\n\n`;
  for (const c of clients) c.write(text);
}

// ───────────────────────── Datum (Berlin) ─────────────────────────

function heute(d = new Date()) {
  return d.toLocaleDateString("sv-SE", { timeZone: ZEITZONE }); // JJJJ-MM-TT
}

// ───────────────────────── Render: Supabase (alle Rechner) ─────────────────────────

const render = { rechner: [], auftraege: [], wartend: [], fehler: null, zeit: null };
const letzterStatus = new Map(); // id → status (für Übergänge)
let ersteAbfrage = true;

function projektAusId(id) {
  const teile = String(id).split("-");
  return teile.length > 3 ? teile.slice(2, -1).join("-") : id;
}

let renderAbfrageLaeuft = false;
async function renderAbfragen() {
  if (!SB.url || !SB.key) {
    render.fehler = "Kein Supabase-Zugang gefunden (pipeline\\render_dienst\\.env im Render-Klon).";
    senden("render", render);
    return;
  }
  if (renderAbfrageLaeuft) return;
  renderAbfrageLaeuft = true;
  try {
    const rechner = [];
    for (const e of await sbListe("render/herzschlag")) {
      if (!e.id || !e.name.endsWith(".json")) continue;
      const d = (await sbJson(`render/herzschlag/${e.name}`)) || {};
      const server = Date.parse(e.updated_at || e.created_at || "");
      const alter = (Date.now() - (server || Date.parse(d.zeit || "") || Date.now())) / 1000;
      const name = d.rechner || e.name.slice(0, -5);
      rechner.push({ rechner: name, daten: d, alter_s: Math.round(alter), online: alter <= OFFLINE_NACH_S && d.status !== "beendet", lokal: name.toUpperCase() === RECHNER });
    }
    rechner.sort((a, b) => a.alter_s - b.alter_s);

    const liste = (await sbListe("render/status")).filter((e) => e.id && e.name.endsWith(".json")).sort((a, b) => b.name.localeCompare(a.name)).slice(0, 14);
    const auftraege = await Promise.all(liste.map(async (e) => {
      const id = e.name.slice(0, -5);
      const s = (await sbJson(`render/status/${e.name}`)) || {};
      return { id, projekt: s.projekt || projektAusId(id), konto: s.konto, ...s, aktualisiert: e.updated_at };
    }));
    // Wartend = Auftragsdatei ohne Status oder mit Status „wartet“ (laufende Aufträge behalten ihre Datei bis zum Ende)
    const statusVon = new Map(auftraege.map((a) => [a.id, a.status]));
    const wartend = (await sbListe("render/auftraege")).filter((e) => e.id && e.name.endsWith(".json")).map((e) => e.name.slice(0, -5))
      .filter((id) => !statusVon.has(id) || statusVon.get(id) === "wartet");

    if (!ersteAbfrage) uebergaengeAuswerten(auftraege);
    for (const a of auftraege) letzterStatus.set(a.id, a.status);
    ersteAbfrage = false;

    Object.assign(render, { rechner, auftraege, wartend, fehler: null, zeit: new Date().toISOString() });
  } catch (e) {
    render.fehler = maskiere(e.message);
  } finally {
    renderAbfrageLaeuft = false;
  }
  senden("render", render);
}

// Statuswechsel als Meilensteine für die Anzeige (Toast, Stadt); die gibt es auf jedem Rechner
function uebergaengeAuswerten(auftraege) {
  for (const a of auftraege) {
    if (!letzterStatus.has(a.id)) {
      if (a.status === "laeuft" || a.status === "wartet") senden("meilenstein", { art: "render_start", text: `Render gestartet: ${a.projekt}`, id: a.id });
      continue;
    }
    if (letzterStatus.get(a.id) !== a.status) {
      if (a.status === "fertig") {
        senden("meilenstein", { art: "render_fertig", text: `Render fertig: ${a.projekt}`, id: a.id });
      } else if (a.status === "fehler" || a.status === "keine_gpu") {
        senden("meilenstein", { art: "render_fehler", text: `Render-Problem (${a.status}): ${a.projekt}`, id: a.id });
      } else if (a.phase) {
        senden("meilenstein", { art: "render_phase", text: `${a.projekt}: ${a.phase}`, id: a.id });
      }
    }
  }
}

// ───────────────────────── Render: Bilder und Log vom Laptop (live) ─────────────────────────

const OUT = path.join(RENDER_REPO, "pipeline", "out");
const live = { projekt: null, bild: null, nr: 0, anzahl: 0, fps: 0, aktiv: false, zeit: null };
const bekannteBilder = new Map(); // projekt → Set(Dateiname)
const BILD_RE = /^f_\d{5}\.(jpg|png)$/;
const fpsVerlauf = [];

async function liveBildPruefen() {
  try {
    let bestes = null;
    for (const p of await fsp.readdir(OUT).catch(() => [])) {
      if (p.startsWith("_") || !/^[A-Za-z0-9_.-]+$/.test(p)) continue;
      const st = await fsp.stat(path.join(OUT, p, "frames")).catch(() => null);
      if (st?.isDirectory() && (!bestes || st.mtimeMs > bestes.mtime)) bestes = { projekt: p, mtime: st.mtimeMs };
    }
    if (!bestes) return;
    const aktiv = Date.now() - bestes.mtime < 60000;
    if (!aktiv && live.projekt === bestes.projekt && !live.aktiv) return;
    const dateien = (await fsp.readdir(path.join(OUT, bestes.projekt, "frames"))).filter((f) => BILD_RE.test(f));
    const bekannt = bekannteBilder.get(bestes.projekt) || new Set();
    const neu = dateien.filter((f) => !bekannt.has(f)).sort();
    bekannteBilder.set(bestes.projekt, new Set(dateien));
    const jetzt = Date.now();
    if (bekannt.size) fpsVerlauf.push([jetzt, neu.length]);
    while (fpsVerlauf.length && jetzt - fpsVerlauf[0][0] > 5000) fpsVerlauf.shift();
    const fps = fpsVerlauf.reduce((s, [, n]) => s + n, 0) / 5;
    // Das jüngste Bild kann noch geschrieben werden: das vorletzte neue nehmen
    const kandidat = neu.length > 1 ? neu.at(-2) : neu[0] || live.bild || dateien.sort().at(-1);
    const geaendert = kandidat !== live.bild || aktiv !== live.aktiv || bestes.projekt !== live.projekt;
    Object.assign(live, { projekt: bestes.projekt, bild: kandidat, nr: kandidat ? Number(kandidat.slice(2, 7)) : 0, anzahl: dateien.length, fps: Math.round(fps * 10) / 10, aktiv, zeit: new Date().toISOString() });
    if (geaendert) senden("live", live);
  } catch { /* Ordner wird gerade angelegt oder gelöscht */ }
}

// Fertige Ausgaben auf dem Laptop (MP4, Bilder, gemessene Renderdauer aus den Zeitstempeln der Bilder)
let lokal = [];
async function lokaleVideosScannen() {
  const liste = [];
  for (const p of await fsp.readdir(OUT).catch(() => [])) {
    if (p.startsWith("_") || !/^[A-Za-z0-9_.-]+$/.test(p)) continue;
    const mp4 = await fsp.stat(path.join(OUT, p, `${p}.mp4`)).catch(() => null);
    const ordner = path.join(OUT, p, "frames");
    const bilder = (await fsp.readdir(ordner).catch(() => [])).filter((f) => BILD_RE.test(f)).sort();
    let dauer = null;
    if (bilder.length > 1) {
      const a = await fsp.stat(path.join(ordner, bilder[0])).catch(() => null);
      const b = await fsp.stat(path.join(ordner, bilder.at(-1))).catch(() => null);
      if (a && b && b.mtimeMs > a.mtimeMs) dauer = Math.round((b.mtimeMs - a.mtimeMs) / 1000);
    }
    if (mp4 || bilder.length) {
      liste.push({ projekt: p, mp4: !!mp4, mb: mp4 ? Math.round(mp4.size / 1e5) / 10 : 0, zeit: mp4 ? mp4.mtime.toISOString() : null, bilder: bilder.length, renderdauer_s: dauer, vorschau: bilder.length ? bilder[Math.floor(bilder.length * 0.35)] : null });
    }
  }
  liste.sort((a, b) => String(b.zeit).localeCompare(String(a.zeit)));
  if (JSON.stringify(liste) !== JSON.stringify(lokal)) {
    lokal = liste;
    senden("lokal", lokal);
  }
}

const renderLog = { datei: null, groesse: 0 };
async function renderLogPruefen() {
  try {
    const ordner = path.join(OUT, "_render_dienst");
    const logs = [];
    for (const f of await fsp.readdir(ordner).catch(() => [])) {
      if (!f.endsWith(".log")) continue;
      const st = await fsp.stat(path.join(ordner, f));
      logs.push({ f, st });
    }
    logs.sort((a, b) => b.st.mtimeMs - a.st.mtimeMs);
    const neuestes = logs[0];
    if (!neuestes || Date.now() - neuestes.st.mtimeMs > 6 * 3600 * 1000) return;
    if (renderLog.datei !== neuestes.f) Object.assign(renderLog, { datei: neuestes.f, groesse: Math.max(0, neuestes.st.size - 4000) });
    if (neuestes.st.size <= renderLog.groesse) return;
    const fh = await fsp.open(path.join(ordner, neuestes.f), "r");
    const laenge = Math.min(neuestes.st.size - renderLog.groesse, 64000);
    const puffer = Buffer.alloc(laenge);
    await fh.read(puffer, 0, laenge, neuestes.st.size - laenge);
    await fh.close();
    renderLog.groesse = neuestes.st.size;
    const zeilen = puffer.toString("utf8").split(/\r?\n/).filter(Boolean).slice(-40).map(maskiere);
    senden("renderlog", { auftrag: neuestes.f.replace(/\.log$/, ""), zeilen });
  } catch { /* ignorieren */ }
}

// ───────────────────────── Tagesplan aus dem Repo (origin/main, ohne den Arbeitsstand zu ändern) ─────────────────────────

const plan = { protokoll: [], vorschlaege: [], commit: null, zeit: null, fehler: null };

function git(args, timeout = 60000) {
  return new Promise((ok) => {
    execFile("git", args, { cwd: ARBEITS_REPO, timeout, windowsHide: true, maxBuffer: 8 << 20, encoding: "utf8" }, (err, stdout, stderr) => ok({ code: err ? err.code || 1 : 0, out: stdout || "", err: stderr || "" }));
  });
}

function csvZeilen(text) {
  const zeilen = [];
  for (const roh of text.split(/\r?\n/)) {
    if (!roh.trim()) continue;
    const felder = [];
    let f = "", inQ = false;
    for (let i = 0; i < roh.length; i++) {
      const c = roh[i];
      if (inQ) {
        if (c === '"' && roh[i + 1] === '"') { f += '"'; i++; } else if (c === '"') inQ = false; else f += c;
      } else if (c === '"') inQ = true;
      else if (c === ",") { felder.push(f); f = ""; } else f += c;
    }
    felder.push(f);
    zeilen.push(felder);
  }
  const [kopf, ...rest] = zeilen;
  return (rest || []).map((z) => Object.fromEntries((kopf || []).map((k, i) => [k, z[i] ?? ""])));
}

function vorschlaegeLesen(md) {
  const liste = [];
  for (const block of md.split(/\n(?=## )/).slice(1)) {
    const titel = block.split("\n")[0].replace(/^##\s*/, "").trim();
    const score = Number((block.match(/\*\*Score:\*\*\s*(\d+)/) || [])[1] || 0);
    const status = ((block.match(/\*\*Status:\*\*\s*([^\s·]+)/) || [])[1] || "").trim();
    const posten = ((block.match(/\*\*Posten:\*\*\s*([^\n]+)/) || [])[1] || "").trim();
    liste.push({ titel, score, status, posten });
  }
  return liste;
}

async function planAktualisieren() {
  const f = await git(["fetch", "--quiet", "origin", "main"]);
  if (f.code !== 0) plan.fehler = "git fetch fehlgeschlagen: " + f.err.split("\n")[0];
  else plan.fehler = null;
  const prot = await git(["show", "origin/main:data/produktion/protokoll.csv"]);
  const vor = await git(["show", "origin/main:docs/trends/vorschlaege.md"]);
  const kopf = await git(["log", "-1", "--format=%h %ad %s", "--date=format:%d.%m. %H:%M", "origin/main"]);
  plan.protokoll = prot.code === 0 ? csvZeilen(prot.out).slice(-30) : [];
  plan.vorschlaege = vor.code === 0 ? vorschlaegeLesen(vor.out) : [];
  plan.commit = kopf.out.trim();
  plan.zeit = new Date().toISOString();
  senden("plan", plan);
}

// ───────────────────────── Claude Code (CLI, Abo des Inhabers) ─────────────────────────

// Ein Claude-Prozess zur Zeit. Aufträge: der Chat (setzt seine Sitzung fort) und Studio-Aufträge (Ideen, Skripte …)
// mit eigener, frischer Sitzung und einer Rückmeldung nachher(text, istFehler) nach dem Ende.
const claude = { laeuft: false, prozess: null, aktiv: null, sessionId: null, modus: "auto", modell: "", warteschlange: [], aufgaben: [], start: null };
const FEED_DATEI = path.join(DATEN, "feed.json");
let feed = [];
try {
  feed = JSON.parse(fs.readFileSync(FEED_DATEI, "utf8"));
  claude.sessionId = feed.findLast?.((e) => e.session_id)?.session_id || null;
} catch { feed = []; }
let feedTimer = null;

function feedEintrag(e) {
  const eintrag = { nr: (feed.at(-1)?.nr || 0) + 1, zeit: new Date().toISOString(), ...e };
  feed.push(eintrag);
  if (feed.length > 400) feed = feed.slice(-400);
  clearTimeout(feedTimer);
  feedTimer = setTimeout(() => fsp.writeFile(FEED_DATEI, JSON.stringify(feed)).catch(() => {}), 800);
  senden("feed", eintrag);
  return eintrag;
}

function findeClaude() {
  const home = os.homedir();
  const appdata = process.env.APPDATA || path.join(home, "AppData", "Roaming");
  const kandidaten = [
    { pfad: path.join(home, ".local", "bin", "claude.exe"), node: false },
    { pfad: path.join(appdata, "npm", "node_modules", "@anthropic-ai", "claude-code", "cli.js"), node: true },
    { pfad: path.join(appdata, "npm", "node_modules", "@anthropic-ai", "claude-code", "bin", "claude.exe"), node: false },
  ];
  for (const k of kandidaten) if (fs.existsSync(k.pfad)) return k;
  for (const ordner of (process.env.PATH || "").split(path.delimiter)) {
    const exe = path.join(ordner, "claude.exe");
    if (ordner && fs.existsSync(exe)) return { pfad: exe, node: false };
  }
  return null;
}

const SYSTEM_ZUSATZ = [
  "Du läufst im TikTok-Cockpit auf dem Laptop des Inhabers. Er sieht jeden deiner Schritte live (Werkzeuge, Texte, Aufgabenliste).",
  "Zerlege jeden Auftrag zuerst mit deinem Aufgaben-Werkzeug in kleine, nummerierte Schritte und hake sie einzeln ab (CLAUDE.md §1).",
  "Antworte kurz, auf Deutsch, du-Form. Lies niemals .env-Dateien und gib keine Schlüssel aus.",
].join(" ");
const STEUERUNG_ZUSATZ = [
  "Cockpit-Steuerung (nur in diesem Chat): `node cockpit/aktion.mjs stand` zeigt Slots, Render-Dienst, Zahlen und offene Vorschläge.",
  "Studio: `node cockpit/aktion.mjs ideen konto=simulierbar|stelldirvor datum=JJJJ-MM-TT [wunsch=\"…\"]`, `waehlen konto=… datum=… slot=mittag|abend nr=3`, `recherchieren konto=… datum=…`,",
  "`freigeben id=acc1-JJJJ-MM-TT-mittag`, `zuruecknehmen id=…`, `neu_schreiben id=… kommentar=\"…\"`, `verwerfen id=…`, `uebergeben datum=…`, `rueckfrage_annehmen id=…`, `erneut id=…`.",
  "Cockpit: `ansicht ziel=live|studio|zahlen|lernen`, `dienst an|aus`, `lernschleife`, `vorschlag id=… wahl=annehmen|ablehnen`. acc1 = Simulierbar, acc2 = Stell dir vor.",
  "Aktionen, die freigeben, übergeben, verwerfen oder ablehnen, nur ausführen, wenn der Inhaber es in seiner Nachricht ausdrücklich verlangt; sonst nachfragen.",
].join(" ");
const STIMME_ZUSATZ = "Diese Nachricht kam per Sprache und deine Antwort wird vorgelesen: höchstens 3 kurze Sätze, kein Markdown, keine Listen, keine Emojis, keine Dateipfade. Sag zuerst, was du getan oder herausgefunden hast.";

// Gültige Werte von claude --permission-mode (CLI 2.1.317): acceptEdits, auto, bypassPermissions, manual, dontAsk, plan.
// Im Cockpit nur die drei sinnvollen ohne Rückfrage (Rückfragen kann -p nicht beantworten), nie bypassPermissions.
const MODI = new Set(["auto", "acceptEdits", "plan"]);

function claudeStatus() {
  return {
    laeuft: claude.laeuft, sessionId: claude.sessionId, modus: claude.modus, modell: claude.modell,
    aktiv: claude.aktiv ? { art: claude.aktiv.art, titel: claude.aktiv.titel } : null,
    warteschlange: claude.warteschlange.length, wartend: claude.warteschlange.map((j) => j.titel),
    aufgaben: claude.aufgaben, start: claude.start, cli: !!findeClaude(),
  };
}

// Chat aus dem Eingabefeld: setzt die Chat-Sitzung fort
function claudeAuftrag(text, opt = {}) {
  text = String(text || "").trim().slice(0, 20000);
  if (!text) return { ok: false, fehler: "Leerer Auftrag" };
  if (opt.modus && MODI.has(opt.modus)) claude.modus = opt.modus;
  if (typeof opt.modell === "string") claude.modell = /^[a-z0-9.-]{0,40}$/i.test(opt.modell) ? opt.modell : "";
  if (opt.neu) claude.sessionId = null;
  // Modell leer = Automatik; sonst vom Inhaber fest gewählt
  return claudeJob({ art: "chat", titel: opt.stimme ? "Sprachbot" : "Chat", text, modus: claude.modus, modellFest: claude.modell || undefined, stimme: !!opt.stimme });
}

// job: {art, titel, text, modus, modell, nachher?(ergebnisText, istFehler)}
function claudeJob(job) {
  if (!MODI.has(job.modus)) job.modus = "plan";
  if (claude.laeuft) {
    claude.warteschlange.push(job);
    feedEintrag({ art: "warteschlange", text: job.art === "chat" ? job.text : job.titel });
    senden("claude", claudeStatus());
    return { ok: true, wartet: claude.warteschlange.length };
  }
  return claudeStarten(job);
}

function claudeStarten(job) {
  const cli = findeClaude();
  if (!cli) {
    feedEintrag({ art: "fehler", text: "Claude Code ist auf diesem Laptop noch nicht installiert (siehe Hinweis im Cockpit)." });
    if (job.nachher) setTimeout(() => jobAbschliessen(job, true), 0);
    return { ok: false, fehler: "Claude CLI fehlt" };
  }
  const chat = job.art === "chat";
  // Modell-Automatik: günstigstes Modell ohne Qualitätsverlust (lib/modelle.mjs), Begründung sichtbar im Feed
  const wahl = job.modell ? { modell: job.modell, grund: job.grund || "vorgegeben" } : modellWaehlen(job, { lernschleifeVideos: job.lernschleifeVideos || 0 });
  Object.assign(job, { modell: wahl.modell, grund: wahl.grund });
  const zusatz = [SYSTEM_ZUSATZ, chat ? STEUERUNG_ZUSATZ : "", job.stimme ? STIMME_ZUSATZ : ""].filter(Boolean).join(" ");
  const args = ["-p", "--output-format", "stream-json", "--verbose", "--permission-mode", job.modus, "--append-system-prompt", zusatz, "--model", job.modell];
  if (chat && claude.sessionId) args.push("--resume", claude.sessionId);
  const befehl = cli.node ? process.execPath : cli.pfad;
  const argv = cli.node ? [cli.pfad, ...args] : args;
  // Kein Schlüssel an Claude; dafür Adresse und eigene Tokens (db.mjs für alle, aktion.mjs nur im Chat des Inhabers)
  const env = { ...process.env, CLAUDE_COCKPIT: "1", COCKPIT_URL: `http://127.0.0.1:${PORT}`, COCKPIT_DB_TOKEN: CLAUDE_TOKEN };
  if (chat) env.COCKPIT_STEUER_TOKEN = STEUER_TOKEN;
  for (const k of Object.keys(env)) if (/^SUPABASE_|^BUFFER_|^ELEVEN/i.test(k)) delete env[k];

  claude.aufgaben = [];
  if (chat) feedEintrag({ art: "du", text: job.text, stimme: job.stimme });
  else feedEintrag({ art: "auftrag", text: job.titel, auftrag: job.titel });
  feedEintrag({ art: "modell", text: `${job.modell[0].toUpperCase() + job.modell.slice(1)} · ${job.grund}`, modell: job.modell });
  log(`Claude-${chat ? "Chat" : "Auftrag"} (${job.modus}${job.modell ? ", " + job.modell : ""}${chat && claude.sessionId ? ", fortgesetzt" : ""}): ${(chat ? job.text : job.titel).slice(0, 120)}`);

  const p = spawn(befehl, argv, { cwd: ARBEITS_REPO, env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  Object.assign(claude, { laeuft: true, prozess: p, aktiv: job, start: new Date().toISOString() });
  senden("claude", claudeStatus());
  p.stdin.end(job.text);

  let rest = "";
  p.stdout.setEncoding("utf8");
  p.stdout.on("data", (chunk) => {
    rest += chunk;
    let i;
    while ((i = rest.indexOf("\n")) >= 0) {
      const zeile = rest.slice(0, i).trim();
      rest = rest.slice(i + 1);
      if (zeile) claudeZeile(zeile);
    }
  });
  let fehlerText = "";
  p.stderr.setEncoding("utf8");
  p.stderr.on("data", (c) => { fehlerText = (fehlerText + c).slice(-4000); });
  p.on("error", (e) => feedEintrag({ art: "fehler", text: "Claude ließ sich nicht starten: " + e.message }));
  p.on("close", (code) => {
    if (rest.trim()) claudeZeile(rest.trim());
    if (code && code !== 0 && fehlerText.trim()) feedEintrag({ art: "fehler", text: maskiere(fehlerText.trim().split("\n").slice(-6).join("\n")) });
    Object.assign(claude, { laeuft: false, prozess: null, aktiv: null });
    jobAbschliessen(job, !!(code && code !== 0) || job.istFehler || job.ergebnis === undefined);
    senden("claude", claudeStatus());
    const naechster = claude.warteschlange.shift();
    if (naechster) setTimeout(() => claudeStarten(naechster), 300);
  });
  return { ok: true };
}

// Eskalation: Fehler oder ungültiges Ergebnis eines kleineren Modells → einmal eine Stufe höher wiederholen
function eskalieren(job, grund) {
  const hoeher = eineStufeHoeher(job.modell);
  if (!hoeher || job.modellFest || job.eskaliert || job.gestoppt || !["chat", "ideen", "briefing"].includes(job.art)) return false;
  feedEintrag({ art: "modell", text: `${grund} · wiederhole mit ${hoeher[0].toUpperCase() + hoeher.slice(1)}`, modell: hoeher });
  claudeJob({ ...job, modell: hoeher, grund: `Eskalation nach ${job.modell}`, eskaliert: true, abgeschlossen: false, ergebnis: undefined, istFehler: false });
  return true;
}

function jobAbschliessen(job, istFehler) {
  if (job.abgeschlossen) return;
  job.abgeschlossen = true;
  if (!job.nachher) {
    if (istFehler && job.art === "chat") eskalieren(job, "Antwort mit Fehler");
    return;
  }
  try {
    job.nachher(job.ergebnis || "", istFehler);
  } catch (e) {
    if (!eskalieren(job, `Ergebnis von ${job.modell} unbrauchbar`)) feedEintrag({ art: "fehler", text: `${job.titel}: ${maskiere(e.message)}` });
  }
}

const offeneWerkzeuge = new Map(); // tool_use_id → feed-nr

function kurz(wert, n = 600) {
  const t = typeof wert === "string" ? wert : JSON.stringify(wert);
  return maskiere(t.length > n ? t.slice(0, n) + " …" : t);
}

function werkzeugTitel(name, input = {}) {
  switch (name) {
    case "Bash": case "PowerShell": return input.description || input.command || name;
    case "Read": return "Liest " + path.basename(input.file_path || "");
    case "Write": return "Schreibt " + path.basename(input.file_path || "");
    case "Edit": case "MultiEdit": return "Ändert " + path.basename(input.file_path || "");
    case "Grep": return "Sucht „" + (input.pattern || "") + "“";
    case "Glob": return "Findet " + (input.pattern || "");
    case "WebSearch": return "Websuche: " + (input.query || "");
    case "WebFetch": return "Öffnet " + (input.url || "");
    case "Task": case "Agent": return "Agent: " + (input.description || "");
    case "TodoWrite": return "Aufgabenliste aktualisiert";
    default: return name;
  }
}

function aufgabenAusWerkzeug(name, input) {
  if (name === "TodoWrite" && Array.isArray(input?.todos)) {
    claude.aufgaben = input.todos.map((t) => ({ text: t.content || t.activeForm || "", status: t.status || "pending" }));
    senden("claude", claudeStatus());
  }
}

function claudeZeile(zeile) {
  let m;
  try {
    m = JSON.parse(zeile);
  } catch {
    return;
  }
  const job = claude.aktiv;
  if (job?.art === "chat" && m.session_id && m.session_id !== claude.sessionId) claude.sessionId = m.session_id;
  if (m.type === "system" && m.subtype === "init") {
    feedEintrag({ art: "start", text: `Sitzung ${m.model || ""} · Modus ${m.permissionMode || job?.modus || ""}`, ...(job?.art === "chat" ? { session_id: m.session_id } : { job_session: m.session_id }) });
    senden("claude", claudeStatus());
    return;
  }
  if (m.type === "assistant") {
    for (const teil of m.message?.content || []) {
      if (teil.type === "text" && teil.text?.trim()) feedEintrag({ art: "text", text: maskiere(teil.text) });
      else if (teil.type === "thinking" && teil.thinking?.trim()) feedEintrag({ art: "denken", text: kurz(teil.thinking, 1500) });
      else if (teil.type === "tool_use") {
        const e = feedEintrag({ art: "werkzeug", name: teil.name, titel: kurz(werkzeugTitel(teil.name, teil.input), 160), eingabe: kurz(teil.input, 1500), id: teil.id });
        offeneWerkzeuge.set(teil.id, e.nr);
        aufgabenAusWerkzeug(teil.name, teil.input);
      }
    }
    return;
  }
  if (m.type === "user") {
    for (const teil of m.message?.content || []) {
      if (teil.type !== "tool_result") continue;
      const inhalt = Array.isArray(teil.content) ? teil.content.map((c) => c.text || "").join("\n") : teil.content;
      senden("werkzeug_ergebnis", { id: teil.tool_use_id, nr: offeneWerkzeuge.get(teil.tool_use_id), fehler: !!teil.is_error, ausgabe: kurz(inhalt, 2500) });
      const nr = offeneWerkzeuge.get(teil.tool_use_id);
      const eintrag = feed.find((x) => x.nr === nr);
      if (eintrag) Object.assign(eintrag, { fehler: !!teil.is_error, ausgabe: kurz(inhalt, 2500) });
      offeneWerkzeuge.delete(teil.tool_use_id);
    }
    return;
  }
  if (m.type === "result") {
    if (job) Object.assign(job, { ergebnis: typeof m.result === "string" ? m.result : "", istFehler: !!m.is_error });
    const verweigert = (m.permission_denials || []).map((d) => d.tool_name).filter(Boolean);
    feedEintrag({
      art: "fertig",
      text: m.is_error ? `Abgebrochen (${m.subtype})` : job && job.art !== "chat" ? `Erledigt: ${job.titel}` : "Auftrag erledigt",
      dauer_s: Math.round((m.duration_ms || 0) / 1000),
      schritte: m.num_turns,
      verweigert,
    });
  }
}

function claudeStoppen() {
  // Wartende Studio-Aufträge melden ihren Abbruch (Slots gehen auf „fehler“ statt still auf „recherche“ zu bleiben)
  const wartende = claude.warteschlange;
  claude.warteschlange = [];
  if (claude.aktiv) claude.aktiv.gestoppt = true;
  for (const j of wartende) { j.gestoppt = true; jobAbschliessen(j, true); }
  if (claude.prozess?.pid) execFile("taskkill", ["/PID", String(claude.prozess.pid), "/T", "/F"], { windowsHide: true }, () => {});
  feedEintrag({ art: "fehler", text: "Von dir gestoppt." });
  senden("claude", claudeStatus());
}

// ───────────────────────── Datenbank, Supabase-Kopie, Studio ─────────────────────────

const EINSTELLUNGEN_DATEI = path.join(DATEN, "einstellungen.json");
let einstellungen = {};
try { einstellungen = JSON.parse(fs.readFileSync(EINSTELLUNGEN_DATEI, "utf8")); } catch { einstellungen = {}; }

// Einstellungen gelten für alle Rechner (Abgleich), außer was nur diesen Rechner betrifft. Je Schlüssel merkt _zeiten,
// wann er zuletzt geändert wurde: beim Zusammenführen gewinnt die neuere Änderung.
const NUR_HIER = new Set(["dienst_autostart"]);
const ALT = "2000-01-01T00:00:00.000Z";
const geteilteSchluessel = () => Object.keys(einstellungen).filter((k) => !NUR_HIER.has(k) && !k.startsWith("_")).sort();
einstellungen._zeiten ||= {};
const einstellungenStand = {}; // Schlüssel → JSON beim letzten Sichern (erkennt, was sich geändert hat)
for (const k of geteilteSchluessel()) { einstellungenStand[k] = JSON.stringify(einstellungen[k]); einstellungen._zeiten[k] ||= ALT; }
// Stabile Schlüsselreihenfolge, damit gleiche Stände auch als gleich erkannt werden
const sortiert = (o) => JSON.parse(JSON.stringify(o ?? {}, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v)));

// Kopie in Supabase unter cockpit/db/<sammlung>/<id>.json (gesammelt, bei Fehlern später erneut); trägt den Rechner,
// damit der Abgleich auf den anderen Rechnern weiß, woher eine Änderung kam
const ABGLEICH_BASIS = process.env.COCKPIT_ABGLEICH || "cockpit"; // anderer Bereich nur für Tests
const SPIEGEL_PRAEFIX = `${ABGLEICH_BASIS}/db`;
const OHNE_SPIEGEL = !!process.env.COCKPIT_KEIN_SPIEGEL; // nur für Tests: keine Kopie, kein Abgleich
const spiegelOffen = new Map(); // "sammlung/id" → Dokument oder null (löschen)
let spiegelTimer = null;
const spiegel = { offen: 0, zuletzt: null, fehler: null, aus: OHNE_SPIEGEL };
function spiegeln(s, id, doc) {
  if (OHNE_SPIEGEL) return;
  spiegelOffen.set(`${s}/${id}`, doc ? { ...doc, rechner: RECHNER } : null);
  clearTimeout(spiegelTimer);
  spiegelTimer = setTimeout(spiegelSenden, 2500);
}
async function spiegelSenden() {
  if (!SB.url || !SB.key) return;
  for (const [k, doc] of [...spiegelOffen]) {
    try {
      if (doc) await sbSchreiben(`${SPIEGEL_PRAEFIX}/${k}.json`, doc);
      else await sbLoeschen([`${SPIEGEL_PRAEFIX}/${k}.json`]);
      if (spiegelOffen.get(k) === doc) spiegelOffen.delete(k);
      Object.assign(spiegel, { zuletzt: new Date().toISOString(), fehler: null });
    } catch (e) {
      spiegel.fehler = maskiere(e.message);
    }
  }
  spiegel.offen = spiegelOffen.size;
  if (spiegelOffen.size) spiegelTimer = setTimeout(spiegelSenden, 60000);
}

let lernen = null; // wird unten angelegt; meldet neue Vorschläge
const db = erstelleDb({
  ordner: path.join(DATEN, "db"),
  spiegel: spiegeln,
  beiAenderung: (e) => {
    senden("db", e);
    // Vom anderen Rechner übernommen: nur anzeigen (eine neue Meldung auch hier als Push), nichts erneut auslösen
    if (e.abgleich) { if (e.sammlung === "meldungen" && !e.geloescht && e.version === 1 && !e.daten?.gelesen) senden("meldung", e); return; }
    lernen?.dbEreignis(e);
  },
});

// Abgleich mit den anderen Rechnern (lib/abgleich.mjs): Dokumente, Einstellungen, Missionen, „wer zuerst kommt“
const abgleich = erstelleAbgleich({
  sb: { bereit: () => !!(SB.url && SB.key) && !OHNE_SPIEGEL, liste: sbListe, json: sbJson, schreiben: sbSchreiben, anlegen: sbAnlegen, loeschen: sbLoeschen },
  db, sammlungen: SAMMLUNGEN, rechner: RECHNER, ordner: DATEN, basis: ABGLEICH_BASIS, maskiere, log, senden,
  ausstehend: (s, id) => spiegelOffen.has(`${s}/${id}`),
  nochmalSpiegeln: (s, id) => { const d = db.roh(s, id); if (d) spiegeln(s, id, d); },
});
abgleich.teilen("einstellungen", {
  lokal: () => sortiert({ werte: Object.fromEntries(geteilteSchluessel().map((k) => [k, einstellungen[k]])), zeiten: Object.fromEntries(geteilteSchluessel().map((k) => [k, einstellungen._zeiten[k] || ALT])) }),
  mischen: (l, f) => {
    const werte = {}, zeiten = {};
    for (const k of new Set([...Object.keys(l.werte || {}), ...Object.keys(f.werte || {})])) {
      if (NUR_HIER.has(k)) continue;
      const fern = k in (f.werte || {}) && (!(k in (l.werte || {})) || String(f.zeiten?.[k] || ALT) > String(l.zeiten?.[k] || ALT));
      werte[k] = fern ? f.werte[k] : l.werte[k];
      zeiten[k] = fern ? f.zeiten?.[k] || ALT : l.zeiten?.[k] || ALT;
    }
    return sortiert({ werte, zeiten });
  },
  anwenden: (g) => {
    for (const [k, v] of Object.entries(g.werte)) {
      einstellungen[k] = v;
      einstellungenStand[k] = JSON.stringify(v);
      einstellungen._zeiten[k] = g.zeiten[k] || ALT;
    }
    fsp.writeFile(EINSTELLUNGEN_DATEI, JSON.stringify(einstellungen, null, 1)).catch(() => {});
    senden("einstellungen", einstellungen);
  },
});

function einstellungenSichern() {
  for (const k of geteilteSchluessel()) {
    const j = JSON.stringify(einstellungen[k]);
    if (einstellungenStand[k] !== j) { einstellungenStand[k] = j; einstellungen._zeiten[k] = new Date().toISOString(); }
  }
  fsp.writeFile(EINSTELLUNGEN_DATEI, JSON.stringify(einstellungen, null, 1)).catch(() => {});
  senden("einstellungen", einstellungen);
  abgleich.geaendert("einstellungen");
}
const berlinZeit = () => new Date().toLocaleTimeString("de-DE", { timeZone: ZEITZONE, hour: "2-digit", minute: "2-digit", hour12: false });

// Leere Kopie (erster Start mit Supabase, z. B. nach dem Studio-Import): alle Dokumente einmal hochladen.
// Eine leere Ablage (neuer Rechner, gelöschter Ordner) füllt der Abgleich aus der Kopie, mit den Versionsnummern.
async function kopieAnlegen() {
  if (OHNE_SPIEGEL || !SB.url || !SB.key || db.anzahl() === 0) return;
  const kopie = await sbListe(`${SPIEGEL_PRAEFIX}/skripte`).catch(() => null);
  if (kopie && !kopie.some((e) => e.id)) {
    let m = 0;
    for (const s of SAMMLUNGEN) for (const d of db.liste(s)) { spiegeln(s, d.id, { daten: d.daten, version: d.version, aktualisiert: d.aktualisiert, von: d.von }); m++; }
    log(`Supabase-Kopie angelegt: ${m} Dokumente`);
  }
}

const studio = erstelleStudio({
  db,
  repo: ARBEITS_REPO,
  auftrag: (job) => claudeJob(job),
  log,
  einstellungen: () => einstellungen,
});

// Render-Dienst als Teil des Cockpits (kein eigenes Fenster)
const renderdienst = erstelleRenderDienst({ renderRepo: RENDER_REPO, senden, log, maskiere });

// Meldungen, Lernschleife, Vorschläge, Testwoche
lernen = erstelleLernen({
  db, repo: ARBEITS_REPO, geheim: GEHEIM, auftrag: (job) => claudeJob(job), senden, log,
  einstellungen: () => einstellungen, einstellungenSichern, heute, berlinZeit,
  anspruch: (k) => abgleich.anspruch(k),
});

// Live-Zahlen und Missionen (Ziele); Startwerte und erreichte Missionen teilen sich alle Rechner, gemeldet wird nur einmal
const zahlen = erstelleZahlen({
  repo: ARBEITS_REPO, ordner: path.join(DATEN, "zahlen"), geheim: GEHEIM, senden, log,
  beiGeteilt: () => abgleich.geaendert("zahlen"),
  belohnen: ({ konto, mission, wert }) => {
    abgleich.anspruch(`mission-${konto}-${mission.id}`).then((ok) => {
      if (ok === false) return; // schon auf dem anderen Rechner gemeldet
      const name = KONTEN[konto]?.name || konto;
      senden("mission_erreicht", { konto, mission, wert });
      lernen.melden({ art: "erfolg", titel: `🎯 Mission geschafft: ${mission.titel} (${name})`, text: `Stand: ${Number(wert).toLocaleString("de-DE")}`, ziel: { ansicht: "zahlen" } });
    });
  },
});
abgleich.teilen("zahlen", {
  lokal: () => sortiert(zahlen.geteilt()),
  mischen: (l, f) => {
    const start = { ...(f.start || {}) }, erreicht = { ...(f.erreicht || {}) };
    for (const [k, v] of Object.entries(l.start || {})) if (!start[k] || String(v?.zeit) < String(start[k]?.zeit)) start[k] = v;
    for (const [k, v] of Object.entries(l.erreicht || {})) if (!erreicht[k] || v < erreicht[k]) erreicht[k] = v;
    return sortiert({ start, erreicht });
  },
  anwenden: (g) => zahlen.geteiltSetzen(g),
});

// Echtes Berliner Wetter für die Stadt (lib/wetter.mjs, Open-Meteo)
const wetter = erstelleWetter({ senden, log });

// Für die Oberfläche: Skripte der letzten 14 Tage, Ideen der letzten 3 Tage, Lernstände, Vorschläge, letzte Meldungen
function dbAuszug() {
  const d = new Date();
  const vor = (n) => { const x = new Date(d); x.setDate(x.getDate() - n); return heute(x); };
  return {
    skripte: db.liste("skripte", [["datum", ">=", vor(14)]]),
    ideen: db.liste("ideen", [["datum", ">=", vor(3)]]),
    stand: db.liste("stand"),
    vorschlaege: db.liste("vorschlaege"),
    meldungen: db.liste("meldungen").sort((a, b) => String(b.daten.zeit).localeCompare(String(a.daten.zeit))).slice(0, 60),
  };
}

// Steuerung aus dem Chat bzw. Sprachbot (aktion.mjs) und aus der Oberfläche
async function steuern(d) {
  const a = d.aktion;
  if (a === "ansicht") {
    if (!["live", "studio", "zahlen", "lernen"].includes(d.ziel || d.wert)) return { ok: false, fehler: "ziel=live|studio|zahlen|lernen" };
    senden("steuerung", { ansicht: d.ziel || d.wert });
    return { ok: true };
  }
  if (a === "dienst") {
    const w = d.wert || d.ziel;
    if (w === "an") renderdienst.starten();
    else if (w === "aus") renderdienst.stoppen();
    else if (w === "uebernehmen") renderdienst.uebernehmen();
    else return { ok: false, fehler: "dienst an|aus|uebernehmen" };
    return { ok: true, dienst: renderdienst.zustand().status };
  }
  if (a === "lernschleife") return lernen.lernschleife("Auftrag aus dem Chat");
  if (a === "vorschlag") return lernen.entscheiden(d.id, d.wahl, d.kommentar);
  if (a === "stand") {
    const z = zahlen.zustand();
    return {
      ok: true,
      slots: db.liste("skripte", [["datum", ">=", heute()]]).map((x) => ({ id: x.id, titel: x.daten.titel, status: x.daten.status })),
      dienst: { status: renderdienst.zustand().status, gpu: render.rechner.find((r) => r.lokal)?.daten?.gpu },
      rechner: render.rechner.map((r) => ({ name: r.rechner, online: r.online, status: r.daten?.status })),
      zahlen: Object.fromEntries(Object.entries(z.profile).map(([k, p]) => [k, { follower: p.follower, likes: p.likes }])),
      offene_vorschlaege: db.liste("vorschlaege", [["status", "==", "offen"]]).map((v) => ({ id: v.id, titel: v.daten.titel })),
      claude: { laeuft: claude.laeuft, wartend: claude.warteschlange.length },
    };
  }
  return studio.ausfuehren(a, d) || { ok: true };
}

function dbAntwort(res, e) {
  if (e instanceof DbFehler) return antwortJson(res, e.code, { ok: false, fehler: e.message, aktuell: e.aktuell });
  if (studio.istStudioFehler(e)) return antwortJson(res, 400, { ok: false, fehler: e.message });
  throw e;
}

// ───────────────────────── HTTP ─────────────────────────

const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".json": "application/json" };

function antwortJson(res, code, daten) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(daten));
}

async function koerper(req) {
  let roh = "";
  for await (const c of req) {
    roh += c;
    if (roh.length > 100000) throw new Error("zu groß");
  }
  return roh ? JSON.parse(roh) : {};
}

function zustand() {
  return { instanz: INSTANZ, db: dbAuszug(), einstellungen, spiegel, abgleich: abgleich.status(), konten: KONTEN, dienst: renderdienst.zustand(), zahlen: zahlen.zustand(), lernschleife: { laeuft: lernen.laeuft(), buffer: !!GEHEIM.BUFFER_API_KEY }, rechner: RECHNER, render, live, lokal, plan, claude: claudeStatus(), feed: feed.slice(-120), wetter: wetter.zustand(), heute: heute(), supabase: !!(SB.url && SB.key) };
}

const server = http.createServer(async (req, res) => {
  try {
    if (!ERLAUBTE_HOSTS.has(req.headers.host || "")) {
      res.writeHead(403).end("Falscher Host");
      return;
    }
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "POST") {
      // Schutz gegen fremde Webseiten: eigener Kopf mit Token (erzwingt CORS-Preflight) und passende Herkunft
      const herkunft = req.headers.origin;
      const token = req.headers["x-cockpit-token"];
      const tokenOk = token === TOKEN
        || (token === CLAUDE_TOKEN && url.pathname.startsWith("/api/db/"))
        || (token === STEUER_TOKEN && (url.pathname.startsWith("/api/db/") || url.pathname === "/api/steuerung"));
      if (!tokenOk || (herkunft && !ERLAUBTE_HOSTS.has(herkunft.replace(/^https?:\/\//, "")))) {
        antwortJson(res, 403, { ok: false, fehler: "Nicht erlaubt" });
        return;
      }
      const daten = await koerper(req);
      const dbWeg = url.pathname.match(/^\/api\/db\/([^/]+)\/([^/]+)$/);
      if (dbWeg) {
        const [, s, id] = dbWeg.map(decodeURIComponent);
        const von = token === CLAUDE_TOKEN ? "claude" : "cockpit";
        try {
          if (daten.art === "meilenstein") return antwortJson(res, 200, { ok: true, ...db.meilenstein(s, id, daten.text || "", { von }) });
          if (daten.art === "loeschen") return antwortJson(res, 200, db.loeschen(s, id, { ifVersion: daten.version, von }));
          return antwortJson(res, 200, { ok: true, ...db.schreiben(s, id, daten.daten, { art: daten.art === "update" ? "update" : "set", ifVersion: daten.version, von }) });
        } catch (e) { return dbAntwort(res, e); }
      }
      if (url.pathname === "/api/studio") {
        try {
          return antwortJson(res, 200, studio.ausfuehren(daten.aktion, daten) || { ok: true });
        } catch (e) { return dbAntwort(res, e); }
      }
      if (url.pathname === "/api/steuerung") {
        try {
          return antwortJson(res, 200, await steuern(daten));
        } catch (e) {
          if (e instanceof DbFehler) return dbAntwort(res, e);
          return antwortJson(res, 400, { ok: false, fehler: maskiere(e.message) });
        }
      }
      if (url.pathname === "/api/dienst") {
        if (daten.aktion === "an") renderdienst.starten();
        else if (daten.aktion === "aus") renderdienst.stoppen();
        else if (daten.aktion === "uebernehmen") renderdienst.uebernehmen();
        else if (daten.aktion === "autostart") { einstellungen.dienst_autostart = !!daten.wert; einstellungenSichern(); }
        return antwortJson(res, 200, { ok: true, dienst: renderdienst.zustand() });
      }
      if (url.pathname === "/api/lernen") {
        try {
          if (daten.aktion === "lernschleife") return antwortJson(res, 200, await lernen.lernschleife("von dir gestartet"));
          if (daten.aktion === "entscheiden") return antwortJson(res, 200, lernen.entscheiden(daten.id, daten.wahl, daten.kommentar));
          if (daten.aktion === "autonomie") return antwortJson(res, 200, lernen.autonomie(daten.wahl));
          if (daten.aktion === "aktiv") { einstellungen.lernschleife_aktiv = !!daten.wert; einstellungenSichern(); return antwortJson(res, 200, { ok: true }); }
          if (daten.aktion === "zahlen_jetzt") { zahlen.profileAbrufen(); zahlen.videosAbrufen(); return antwortJson(res, 200, { ok: true }); }
          return antwortJson(res, 400, { ok: false, fehler: "Unbekannte Aktion" });
        } catch (e) {
          if (e instanceof DbFehler) return dbAntwort(res, e);
          return antwortJson(res, 400, { ok: false, fehler: maskiere(e.message) });
        }
      }
      if (url.pathname === "/api/meldungen") {
        const offen = db.liste("meldungen", [["gelesen", "==", false]]);
        const ziel = daten.aktion === "alle_gelesen" ? offen : offen.filter((m) => m.id === daten.id);
        for (const m of ziel) db.schreiben("meldungen", m.id, { gelesen: true }, { art: "update", ifVersion: m.version });
        return antwortJson(res, 200, { ok: true, gelesen: ziel.length });
      }
      if (url.pathname === "/api/claude") return antwortJson(res, 200, claudeAuftrag(daten.text, daten));
      if (url.pathname === "/api/claude/stopp") { claudeStoppen(); return antwortJson(res, 200, { ok: true }); }
      if (url.pathname === "/api/claude/neu") { claude.sessionId = null; claude.aufgaben = []; feedEintrag({ art: "start", text: "Neue Unterhaltung" }); senden("claude", claudeStatus()); return antwortJson(res, 200, { ok: true }); }
      if (url.pathname === "/api/aktualisieren") { renderAbfragen(); planAktualisieren(); return antwortJson(res, 200, { ok: true }); }
      if (url.pathname === "/api/beenden") {
        antwortJson(res, 200, { ok: true });
        log("Beendet über das Cockpit");
        renderdienst.stoppen();
        setTimeout(() => process.exit(0), 1200);
        return;
      }
      if (url.pathname === "/api/neustart") {
        if (claude.laeuft) return antwortJson(res, 409, { ok: false, fehler: "Claude arbeitet gerade. Erst stoppen oder warten." });
        antwortJson(res, 200, { ok: true });
        neuStarten();
        return;
      }
      return antwortJson(res, 404, { ok: false });
    }

    if (url.pathname === "/api/ping") return antwortJson(res, 200, { ok: true, cockpit: true });
    if (url.pathname === "/api/zahlen/verlauf") return antwortJson(res, 200, { ok: true, verlauf: await zahlen.verlauf(Math.min(60, Number(url.searchParams.get("tage")) || 7)) });
    if (url.pathname === "/api/vorschau") {
      const id = url.searchParams.get("id") || "", f = url.searchParams.get("f") || "";
      if (!/^[A-Za-z0-9_.-]+$/.test(id) || !/^[A-Za-z0-9_.-]+\.(png|jpe?g|webp)$/i.test(f)) return antwortJson(res, 400, { ok: false });
      const inhalt = await fsp.readFile(path.join(DATEN, "vorschau", id, f)).catch(() => null);
      if (!inhalt) return antwortJson(res, 404, { ok: false });
      res.writeHead(200, { "Content-Type": f.endsWith("png") ? "image/png" : f.endsWith("webp") ? "image/webp" : "image/jpeg", "Cache-Control": "max-age=600" });
      res.end(inhalt);
      return;
    }
    const dbLesen = url.pathname.match(/^\/api\/db\/([^/]+)(?:\/([^/]+))?$/);
    if (dbLesen) {
      const s = decodeURIComponent(dbLesen[1]);
      try {
        if (dbLesen[2]) {
          const doc = db.get(s, decodeURIComponent(dbLesen[2]));
          return doc ? antwortJson(res, 200, { ok: true, ...doc }) : antwortJson(res, 404, { ok: false, fehler: "Dokument nicht gefunden" });
        }
        let filter = [];
        try { filter = JSON.parse(url.searchParams.get("filter") || "[]"); } catch { filter = []; }
        return antwortJson(res, 200, { ok: true, dokumente: db.liste(s, Array.isArray(filter) ? filter : []) });
      } catch (e) { return dbAntwort(res, e); }
    }
    if (url.pathname === "/api/zustand") return antwortJson(res, 200, zustand());
    if (url.pathname === "/api/events") {
      res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-store", Connection: "keep-alive" });
      res.write(`event: zustand\ndata: ${JSON.stringify(zustand())}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    if (url.pathname === "/api/video") {
      const p = url.searchParams.get("p") || "";
      if (!/^[A-Za-z0-9_.-]+$/.test(p) || p.startsWith(".")) return antwortJson(res, 400, { ok: false });
      const datei = path.join(OUT, p, `${p}.mp4`);
      const st = await fsp.stat(datei).catch(() => null);
      if (!st) return antwortJson(res, 404, { ok: false });
      const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if (!m) {
        res.writeHead(200, { "Content-Type": "video/mp4", "Content-Length": st.size, "Accept-Ranges": "bytes" });
        fs.createReadStream(datei).pipe(res);
        return;
      }
      let start = m[1] ? Number(m[1]) : st.size - Number(m[2] || 0);
      let ende = m[1] && m[2] ? Number(m[2]) : st.size - 1;
      ende = Math.min(ende, st.size - 1);
      if (!(start >= 0) || start > ende) {
        res.writeHead(416, { "Content-Range": `bytes */${st.size}` }).end();
        return;
      }
      res.writeHead(206, { "Content-Type": "video/mp4", "Content-Range": `bytes ${start}-${ende}/${st.size}`, "Accept-Ranges": "bytes", "Content-Length": ende - start + 1 });
      fs.createReadStream(datei, { start, end: ende }).pipe(res);
      return;
    }
    if (url.pathname === "/api/bild") {
      const p = url.searchParams.get("p") || "";
      const f = url.searchParams.get("f") || "";
      if (!/^[A-Za-z0-9_.-]+$/.test(p) || p.startsWith(".") || !BILD_RE.test(f)) return antwortJson(res, 400, { ok: false });
      const datei = path.join(OUT, p, "frames", f);
      const inhalt = await fsp.readFile(datei).catch(() => null);
      if (!inhalt) return antwortJson(res, 404, { ok: false });
      res.writeHead(200, { "Content-Type": MIME[path.extname(f)], "Cache-Control": "max-age=3600" });
      res.end(inhalt);
      return;
    }

    // Statische Dateien; index.html bekommt das Token
    const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
    const datei = path.resolve(OEFFENTLICH, rel);
    if (!datei.startsWith(OEFFENTLICH + path.sep)) return antwortJson(res, 400, { ok: false });
    let inhalt = await fsp.readFile(datei).catch(() => null);
    if (!inhalt) return antwortJson(res, 404, { ok: false });
    if (rel === "index.html") inhalt = Buffer.from(inhalt.toString("utf8").replace("__COCKPIT_TOKEN__", TOKEN));
    res.writeHead(200, { "Content-Type": MIME[path.extname(datei)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(inhalt);
  } catch (e) {
    log("Fehler: " + maskiere(e.stack || e.message));
    if (!res.headersSent) antwortJson(res, 500, { ok: false, fehler: "Serverfehler" });
  }
});

// Neustart nach einem Update: neuen Server starten (gleicher Kontext wie dieser), dann diesen beenden
function neuStarten() {
  log("Neustart über das Cockpit");
  for (const c of clients) c.end();
  server.close();
  // Render-Dienst zuerst beenden (seine Sperre gilt je Klon), dann den neuen Server starten
  const warten = renderdienst.laeuft() ? 2000 : 0;
  renderdienst.stoppen();
  setTimeout(() => {
    const ausgabe = fs.openSync(path.join(DATEN, "server-start.log"), "a");
    spawn(process.execPath, [path.join(HIER, "server.mjs")], { cwd: HIER, detached: true, stdio: ["ignore", ausgabe, ausgabe], windowsHide: true, env: { ...process.env, COCKPIT_NEUSTART: "1" } }).unref();
    setTimeout(() => process.exit(0), 300);
  }, warten);
}

// Stirbt der Server, darf kein verwaister Render-Dienst ohne Aufsicht weiterlaufen
process.on("exit", () => {
  const pid = renderdienst.zustand().pid;
  if (pid) try { execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); } catch { /* schon weg */ }
});
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) process.on(sig, () => process.exit(0));

let lauschVersuche = 0;
server.on("error", (e) => {
  // Nach einem Neustart kann der alte Prozess den Port noch kurz halten
  if (e.code === "EADDRINUSE" && process.env.COCKPIT_NEUSTART && ++lauschVersuche < 20) {
    setTimeout(() => server.listen(PORT, "127.0.0.1"), 300);
    return;
  }
  if (e.code === "EADDRINUSE") log(`Port ${PORT} ist belegt: Läuft das Cockpit schon?`);
  else log("Serverfehler: " + e.message);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  log(`TikTok-Cockpit läuft auf http://127.0.0.1:${PORT} · Rechner ${RECHNER} · Arbeits-Repo ${ARBEITS_REPO} · Render-Repo ${RENDER_REPO} · Supabase ${SB.url ? "ja" : "nein"} · Claude CLI ${findeClaude() ? "ja" : "fehlt"}`);
  renderAbfragen();
  planAktualisieren();
  lokaleVideosScannen();
  kopieAnlegen().catch((e) => log("Supabase-Kopie anlegen fehlgeschlagen: " + maskiere(e.message))).then(() => abgleich.starten());
  if (einstellungen.dienst_autostart !== false && !process.env.COCKPIT_OHNE_DIENST) renderdienst.starten();
  if (!process.env.COCKPIT_OHNE_ZAHLEN) zahlen.starten(); // ohne: nur für Tests (keine TikTok-Abrufe)
  if (!process.env.COCKPIT_OHNE_WETTER) wetter.starten(); // ohne: nur für Tests (keine Wetter-Abrufe)
  lernen.starten();
  setInterval(() => senden("spiegel", spiegel), 30000);
  setInterval(lokaleVideosScannen, 20000);
  setInterval(renderAbfragen, 8000);
  setInterval(liveBildPruefen, 1000);
  setInterval(renderLogPruefen, 2000);
  setInterval(planAktualisieren, 5 * 60 * 1000);
  setInterval(() => senden("puls", { zeit: new Date().toISOString() }), 15000);
});
