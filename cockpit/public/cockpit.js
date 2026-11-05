"use strict";
// TikTok-Cockpit · Oberfläche (ohne Bibliotheken). Daten kommen live per SSE vom lokalen Server.

const TOKEN = document.querySelector('meta[name="cockpit-token"]').content;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const zahl = (n) => Number(n || 0).toLocaleString("de-DE");
const kurzZahl = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",") + "K" : zahl(n));
const lokal = {
  lesen(k, std) { try { return localStorage.getItem(k) ?? std; } catch { return std; } },
  schreiben(k, v) { try { localStorage.setItem(k, v); } catch { /* privat */ } },
};

const S = {
  render: { rechner: [], auftraege: [], wartend: [] },
  live: {},
  lokal: [],
  plan: { protokoll: [], vorschlaege: [] },
  claude: { aufgaben: [] },
  feed: [],
  heute: "",
  rechner: "",
  auswahl: null, // {typ: "job"|"video", id}
  schritt: null,
  renderlog: { auftrag: null, zeilen: [] },
  ticker: [],
  verbunden: false,
};

async function post(pfad, daten = {}) {
  try {
    const r = await fetch(pfad, { method: "POST", headers: { "Content-Type": "application/json", "X-Cockpit-Token": TOKEN }, body: JSON.stringify(daten) });
    return await r.json();
  } catch {
    return { ok: false, fehler: "Server nicht erreichbar" };
  }
}

// ───────────────────────── Ton (WebAudio-Synth, keine Dateien) ─────────────────────────

const Ton = {
  an: lokal.lesen("ton", "an") !== "aus",
  ctx: null,
  init() {
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === "suspended") this.ctx.resume();
    } catch { this.ctx = null; }
  },
  note(f, dauer = 0.12, typ = "sine", laut = 0.06, verz = 0) {
    if (!this.an || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + verz;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = typ;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + dauer + 0.02);
  },
  blip() { this.note(1180 + Math.random() * 300, 0.05, "square", 0.018); },
  klick() { this.note(660, 0.04, "triangle", 0.03); },
  chime() { [784, 988, 1319].forEach((f, i) => this.note(f, 0.32, "triangle", 0.05, i * 0.07)); },
  fanfare() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.note(f, 0.42, "sawtooth", 0.035, i * 0.1)); },
  fehler() { this.note(233, 0.3, "sawtooth", 0.05); this.note(175, 0.45, "sawtooth", 0.045, 0.16); },
  whoosh() {
    if (!this.an || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(1800, t + 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.04, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    o.connect(g).connect(this.ctx.destination);
    o.start(t);
    o.stop(t + 0.65);
  },
};
document.addEventListener("pointerdown", () => Ton.init(), { once: false });

// ───────────────────────── Partikel (Herzen, Konfetti, Funken) ─────────────────────────

const P = {
  c: $("partikel"),
  ctx: null,
  teile: [],
  init() {
    this.ctx = this.c.getContext("2d");
    const groesse = () => { this.c.width = innerWidth * devicePixelRatio; this.c.height = innerHeight * devicePixelRatio; };
    groesse();
    addEventListener("resize", groesse);
    requestAnimationFrame(() => this.schleife());
  },
  farbe() { return ["#fe2c55", "#25f4ee", "#ffffff", "#ffd166", "#9b5cff"][Math.floor(Math.random() * 5)]; },
  herz(x, y) {
    if (this.teile.length > 400) return;
    this.teile.push({ typ: "herz", x, y, vx: (Math.random() - 0.5) * 1.2, vy: -1.4 - Math.random() * 1.6, g: 14 + Math.random() * 14, leben: 1, abbau: 0.007 + Math.random() * 0.006, farbe: Math.random() < 0.6 ? "#fe2c55" : this.farbe(), phase: Math.random() * 6 });
  },
  konfetti(x, y, n = 120, staerke = 9) {
    for (let i = 0; i < n; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = staerke * (0.4 + Math.random());
      this.teile.push({ typ: "konfetti", x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v - 4, g: 5 + Math.random() * 6, leben: 1, abbau: 0.008 + Math.random() * 0.008, farbe: this.farbe(), rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4 });
    }
  },
  funken(x, y, n = 10) {
    for (let i = 0; i < n; i++) {
      const w = Math.random() * Math.PI * 2;
      this.teile.push({ typ: "funke", x, y, vx: Math.cos(w) * (1 + Math.random() * 3), vy: Math.sin(w) * (1 + Math.random() * 3), g: 2 + Math.random() * 2, leben: 1, abbau: 0.03 + Math.random() * 0.03, farbe: Math.random() < 0.5 ? "#25f4ee" : "#fe2c55" });
    }
  },
  zeichneHerz(ctx, x, y, g) {
    ctx.beginPath();
    ctx.moveTo(x, y + g * 0.3);
    ctx.bezierCurveTo(x, y, x - g * 0.5, y, x - g * 0.5, y + g * 0.3);
    ctx.bezierCurveTo(x - g * 0.5, y + g * 0.6, x, y + g * 0.8, x, y + g);
    ctx.bezierCurveTo(x, y + g * 0.8, x + g * 0.5, y + g * 0.6, x + g * 0.5, y + g * 0.3);
    ctx.bezierCurveTo(x + g * 0.5, y, x, y, x, y + g * 0.3);
    ctx.fill();
  },
  schleife() {
    const ctx = this.ctx;
    const d = devicePixelRatio;
    ctx.clearRect(0, 0, this.c.width, this.c.height);
    this.teile = this.teile.filter((t) => t.leben > 0);
    for (const t of this.teile) {
      t.leben -= t.abbau;
      t.x += t.vx;
      t.y += t.vy;
      ctx.globalAlpha = Math.max(0, Math.min(1, t.leben * 1.4));
      ctx.fillStyle = t.farbe;
      if (t.typ === "herz") {
        t.phase += 0.08;
        t.x += Math.sin(t.phase) * 0.6;
        t.vy *= 0.995;
        this.zeichneHerz(ctx, t.x * d, t.y * d, t.g * d * (0.6 + 0.4 * Math.min(1, (1 - t.leben) * 6)));
      } else if (t.typ === "konfetti") {
        t.vy += 0.22;
        t.vx *= 0.985;
        t.rot += t.vr;
        ctx.save();
        ctx.translate(t.x * d, t.y * d);
        ctx.rotate(t.rot);
        ctx.fillRect(-t.g * d / 2, -t.g * d / 4, t.g * d, t.g * d / 2);
        ctx.restore();
      } else {
        t.vx *= 0.94;
        t.vy *= 0.94;
        ctx.beginPath();
        ctx.arc(t.x * d, t.y * d, t.g * d, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(() => this.schleife());
  },
};

// Bildschirmmitte eines Elements; liegt es gerade in der Ablage (nicht sichtbar), die Mitte des Fensters
function mitte(el) {
  const r = el?.getBoundingClientRect();
  if (!r || (!r.width && !r.height)) return [innerWidth / 2, innerHeight / 2];
  return [r.left + r.width / 2, r.top + r.height / 2];
}

function herzenAusHandy(n) {
  const r = document.querySelector(".seite-icons").getBoundingClientRect();
  if (!r.width) return; // Handy gerade nicht zu sehen (anderer Raum oder Stadt)
  for (let i = 0; i < n; i++) setTimeout(() => P.herz(r.left + r.width / 2, r.top + 10), i * 90);
}

// ───────────────────────── Hochzählen ─────────────────────────

const zaehlStand = new Map();
function hochzaehlen(el, ziel, format = zahl) {
  const von = zaehlStand.get(el) ?? 0;
  zaehlStand.set(el, ziel);
  if (von === ziel) { el.textContent = format(ziel); return; }
  const start = performance.now();
  const dauer = Math.min(1200, 300 + Math.abs(ziel - von) * 2);
  const schritt = (t) => {
    const p = Math.min(1, (t - start) / dauer);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(Math.round(von + (ziel - von) * e));
    if (p < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

// ───────────────────────── Uhr und Posting-Countdown ─────────────────────────

// Posting-Zeiten wie im Studio: Mittag 12:30 (Sa/So 09:30), Abend 19:30
function slotZeit(datum, slot) {
  if (slot === "abend") return "19:30";
  if (slot !== "mittag") return "";
  const wt = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return wt === 0 || wt === 6 ? "09:30" : "12:30";
}
const KONTO = {
  simulierbar: { name: "Simulierbar", klasse: "acc1" },
  "stelldirvor.pov": { name: "Stell dir vor", klasse: "acc2" },
};
const kontoInfo = (k) => KONTO[k] || (String(k || "").startsWith("stelldirvor") ? KONTO["stelldirvor.pov"] : { name: k || "?", klasse: "" });

function berlinJetzt() {
  const t = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Berlin" });
  return { datum: t.slice(0, 10), zeit: t.slice(11, 16) };
}

function uhrZeichnen() {
  const jetzt = new Date();
  $("uhr").textContent = jetzt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" });
  $("datum").textContent = jetzt.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  const b = berlinJetzt();
  const kommend = S.plan.protokoll
    .filter((z) => z.status === "geplant" && slotZeit(z.datum, z.slot))
    .map((z) => ({ ...z, wann: `${z.datum} ${slotZeit(z.datum, z.slot)}` }))
    .filter((z) => z.wann >= `${b.datum} ${b.zeit}`)
    .sort((a, b2) => a.wann.localeCompare(b2.wann))[0];
  if (kommend) {
    const ziel = new Date(`${kommend.datum}T${slotZeit(kommend.datum, kommend.slot)}:00`);
    const versatz = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" })) - new Date();
    const rest = Math.max(0, ziel - new Date(Date.now() + versatz));
    const h = Math.floor(rest / 3600000), m = Math.floor((rest % 3600000) / 60000), s = Math.floor((rest % 60000) / 1000);
    $("naechster").innerHTML = `Nächstes Posting: <span class="chip ${kontoInfo(kommend.konto).klasse}">${esc(kontoInfo(kommend.konto).name)}</span> in <b>${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}</b>`;
  } else {
    $("naechster").textContent = "Kein geplantes Posting";
  }
}

// ───────────────────────── Hinweise ─────────────────────────

function toast(icon, titel, text, art = "") {
  const el = document.createElement("div");
  el.className = `toast ${art}`;
  el.innerHTML = `<span class="gross">${esc(icon)}</span><div><b>${esc(titel)}</b><small>${esc(text)}</small></div>`;
  $("toasts").append(el);
  setTimeout(() => el.remove(), 5200);
}

// ───────────────────────── Ticker ─────────────────────────

function tickerNeu(text) {
  const zeit = new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  S.ticker = [`<b>${zeit}</b> ${esc(text)}`, ...S.ticker].slice(0, 14);
  const inhalt = S.ticker.join("<span>✦</span>");
  $("ticker").innerHTML = `<span>${inhalt}</span><span>${inhalt}</span>`;
}

// ───────────────────────── Tagesplan, Render-Aufträge, Rechner, Trend-Radar (Räume der Live-Zentrale und des Radar-Turms) ─────────────────────────

function morgen() {
  const d = new Date(`${S.heute}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function videosHeute() {
  const zeilen = S.plan.protokoll || [];
  let liste = zeilen.filter((z) => z.datum === S.heute || z.datum === morgen());
  if (!liste.length) liste = zeilen.slice(-4);
  return liste.sort((a, b) => (a.datum + slotZeit(a.datum, a.slot)).localeCompare(b.datum + slotZeit(b.datum, b.slot)));
}

const videoId = (v) => `${v.datum}|${v.slot}|${v.konto}`;
const jobFuerProjekt = (projekt) => S.render.auftraege.find((a) => a.projekt === projekt);
// „läuft“, aber der Rechner sendet keinen Herzschlag mehr: Auftrag hängt (wird beim nächsten Start des Dienstes fortgesetzt)
function haengt(a) {
  if (!a || a.status !== "laeuft") return false;
  const r = S.render.rechner.find((x) => x.rechner === a.rechner);
  return !!r && !r.online;
}
const jobChip = (a) => (haengt(a) ? `<span class="chip fehler">hängt · ${esc(a.rechner)} offline</span>` : statusChip(a.status));

function statusChip(status) {
  const klassen = { gepostet: "ok", geplant: "ok", fertig: "ok", laeuft: "laeuft", wartet: "laeuft", fehler: "fehler", keine_gpu: "fehler" };
  const namen = { laeuft: "läuft", keine_gpu: "keine GPU" };
  return `<span class="chip ${klassen[status] || ""}">${esc(namen[status] || status || "?")}</span>`;
}

function linksZeichnen() {
  // Tagesziel: heute online gehende Videos (geplant oder gepostet) von 4
  const heute = (S.plan.protokoll || []).filter((z) => z.datum === S.heute);
  const fertig = heute.filter((z) => ["geplant", "gepostet"].includes(z.status)).length;
  $("ziel-zahl").textContent = `${fertig}/4`;
  $("ziel-ring").style.strokeDashoffset = String(314 - 314 * Math.min(1, fertig / 4));
  $("ziel-konten").innerHTML = ["simulierbar", "stelldirvor.pov"]
    .map((k) => {
      const n = heute.filter((z) => z.konto === k && ["geplant", "gepostet"].includes(z.status)).length;
      const gepostet = heute.filter((z) => z.konto === k && z.status === "gepostet").length;
      return `<div><span class="chip ${kontoInfo(k).klasse}">${kontoInfo(k).name}</span><span>${n}/2 · ${gepostet} online</span></div>`;
    })
    .join("");

  const videos = videosHeute();
  $("videos").innerHTML = videos.length
    ? videos.map((v) => {
        const job = jobFuerProjekt(v.projekt);
        const aktiv = S.auswahl?.typ === "video" && S.auswahl.id === videoId(v);
        const tag = v.datum === S.heute ? "heute" : v.datum === morgen() ? "morgen" : v.datum.slice(8, 10) + "." + v.datum.slice(5, 7) + ".";
        return `<div class="karte ${aktiv ? "aktiv" : ""}" data-video="${esc(videoId(v))}">
          <div class="titel">${esc(v.titel)}</div>
          <div class="unter"><span class="chip ${kontoInfo(v.konto).klasse}">${esc(kontoInfo(v.konto).name)}</span><span>${tag} ${slotZeit(v.datum, v.slot) || v.slot}</span>${statusChip(v.status)}${job && job.status === "laeuft" ? jobChip(job) : ""}${S.lokal.find((l) => l.projekt === v.projekt)?.mp4 ? `<span class="chip">🎞️ MP4 lokal</span>` : ""}</div>
        </div>`;
      }).join("")
    : `<div class="karte leer">Noch keine Videos im Protokoll.</div>`;

  const jobs = S.render.auftraege.slice(0, 6);
  $("auftraege").innerHTML = jobs.length
    ? jobs.map((a) => {
        const aktiv = S.auswahl?.typ === "job" && S.auswahl.id === a.id;
        const p = a.status === "fertig" ? 100 : a.prozent || 0;
        const bild = a.bilder ? `Bild ${zahl(a.bilder[0])}/${zahl(a.bilder[1])}` : "";
        return `<div class="karte ${aktiv ? "aktiv" : ""}" data-job="${esc(a.id)}">
          <div class="zeile"><span class="titel">${esc(a.projekt)}</span>${jobChip(a)}</div>
          <div class="unter"><span>${esc(a.phase || "")}</span><span>${bild}</span><span>${esc(a.rechner || "")}</span></div>
          <div class="balken"><i style="width:${p}%"></i></div>
        </div>`;
      }).join("") + (S.render.wartend.length ? `<div class="karte leer">${S.render.wartend.length} Auftrag/Aufträge warten auf einen Rechner</div>` : "")
    : `<div class="karte leer">${esc(S.render.fehler || "Keine Render-Aufträge.")}</div>`;

  $("rechner").innerHTML = S.render.rechner.length
    ? S.render.rechner.map((r) => {
        const d = r.daten || {};
        const status = r.online ? (d.status === "rendert" ? `rendert ${Math.round(d.prozent || 0)} %` : d.status || "online") : "offline";
        const alter = r.alter_s < 120 ? `vor ${r.alter_s} s` : r.alter_s < 7200 ? `vor ${Math.round(r.alter_s / 60)} Min.` : `vor ${Math.round(r.alter_s / 3600)} Std.`;
        return `<div class="karte" data-rechner="${esc(r.rechner)}">
          <div class="zeile"><span class="titel"><span class="punkt ${r.online ? "an" : ""}"></span> ${esc(r.rechner)}${r.lokal ? " · dieser Rechner" : ""}</span><span class="chip ${r.online ? (d.status === "rendert" ? "laeuft" : "ok") : ""}">${esc(status)}</span></div>
          <div class="unter"><span>${esc(String(d.gpu || "GPU ?").replace(/\s*\(0x[0-9A-F]+\)/i, ""))}</span><span>Dienst ${esc(d.version || "?")}</span><span>${alter}</span></div>
        </div>`;
      }).join("")
    : `<div class="karte leer">${esc(S.render.fehler || "Noch kein Herzschlag.")}</div>`;

  const radar = (S.plan.vorschlaege || []).filter((v) => !v.status || v.status === "neu").sort((a, b) => b.score - a.score);
  $("radar").innerHTML = radar.length
    ? radar.map((v) => `<div class="karte" data-radar="${esc(v.titel)}"><div class="zeile"><span class="titel">${esc(v.titel.replace(/^\S+\s/, ""))}</span><span class="score">${v.score}</span></div><div class="unter">${esc(v.posten)}</div></div>`).join("")
    : `<div class="karte leer">Keine offenen Vorschläge.</div>`;

  $("plan-stand").textContent = S.plan.commit ? `Repo ${S.plan.commit.split(" ").slice(0, 3).join(" ")}` : "";
}

// Die Listen stehen je nach Raum auf verschiedenen Wandbildschirmen: Klicks daher auf Dokumentebene abfangen
document.addEventListener("click", (e) => {
  const k = e.target.closest("#videos .karte, #auftraege .karte, #rechner .karte, #radar .karte");
  if (!k || k.classList.contains("leer")) return;
  Ton.klick();
  if (k.dataset.video) S.auswahl = { typ: "video", id: k.dataset.video };
  else if (k.dataset.job) S.auswahl = { typ: "job", id: k.dataset.job };
  else if (k.dataset.radar) {
    eingabeVorbelegen(`Bewerte den Radar-Vorschlag „${k.dataset.radar}“ aus docs/trends/vorschlaege.md: Passt er für morgen? Kurzfazit in 4 Zeilen.`);
    return;
  } else if (k.dataset.rechner) {
    eingabeVorbelegen(`Wie geht es dem Render-Rechner ${k.dataset.rechner}? Führe py -3 C:\\render\\tiktok-automation\\pipeline\\render_dienst\\auftrag.py pc aus und erkläre das Ergebnis kurz.`);
    return;
  }
  S.schritt = null;
  allesZeichnen();
});

// ───────────────────────── Mitte: Bühne ─────────────────────────

const PHASEN = ["vorbereiten", "rendern", "ton", "mux", "verkleinern", "hochladen", "fertig"];

function gewaehlt() {
  let video = null, job = null;
  if (S.auswahl?.typ === "video") {
    video = videosHeute().find((v) => videoId(v) === S.auswahl.id) || null;
    job = video ? jobFuerProjekt(video.projekt) : null;
  } else if (S.auswahl?.typ === "job") {
    job = S.render.auftraege.find((a) => a.id === S.auswahl.id) || null;
    video = job ? (S.plan.protokoll || []).findLast?.((v) => v.projekt === job.projekt) || null : null;
  } else {
    job = S.render.auftraege.find((a) => a.status === "laeuft" && !haengt(a)) || null;
    video = job ? (S.plan.protokoll || []).findLast?.((v) => v.projekt === job.projekt) || null : videosHeute().find((v) => v.datum === S.heute && v.status === "geplant") || null;
  }
  return { video, job };
}

const bildTausch = { aktiv: "live-bild", letzte: 0, src: "" };
function liveBildZeigen(projekt, bild) {
  if (!projekt || !bild) return;
  const src = `/api/bild?p=${encodeURIComponent(projekt)}&f=${encodeURIComponent(bild)}`;
  if (src === bildTausch.src) return;
  // Live-Bilder höchstens ca. 4,5 je Sekunde tauschen; ein Wechsel des Projekts geht sofort
  const gleichesProjekt = bildTausch.src.includes(`p=${encodeURIComponent(projekt)}&`);
  if (gleichesProjekt && performance.now() - bildTausch.letzte < 220) return;
  bildTausch.letzte = performance.now();
  bildTausch.src = src;
  const neu = bildTausch.aktiv === "live-bild" ? $("live-bild-b") : $("live-bild");
  const alt = $(bildTausch.aktiv);
  neu.onload = () => {
    neu.classList.add("sichtbar");
    alt.classList.remove("sichtbar");
    bildTausch.aktiv = neu.id;
  };
  neu.src = src;
}

const raster = { fertig: 0, gezeigt: 0, gesamt: 0, anim: 0 };
function bildRasterZeichnen() {
  const c = $("bild-raster");
  const r = c.getBoundingClientRect();
  if (!r.width) return;
  const d = devicePixelRatio;
  if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#05060b";
  ctx.fillRect(0, 0, c.width, c.height);
  const n = Math.max(1, raster.gesamt);
  const spalten = Math.max(1, Math.round(Math.sqrt((n * c.width) / c.height)));
  const zeilen = Math.ceil(n / spalten);
  const w = c.width / spalten, h = c.height / zeilen;
  const zeigen = Math.round(raster.gezeigt);
  for (let i = 0; i < n; i++) {
    const x = (i % spalten) * w, y = Math.floor(i / spalten) * h;
    if (i < zeigen) {
      const t = i / n;
      ctx.fillStyle = `hsl(${178 + t * 170}, 95%, ${52 + 8 * Math.sin(i * 0.37)}%)`;
    } else ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x + 0.6, y + 0.6, Math.max(0.5, w - 1.2), Math.max(0.5, h - 1.2));
  }
  if (zeigen > 0 && zeigen < n) {
    const i = zeigen - 1;
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fe2c55";
    ctx.shadowBlur = 16 * d;
    ctx.fillRect((i % spalten) * w, Math.floor(i / spalten) * h, w, h);
    ctx.shadowBlur = 0;
  }
}
function rasterAnimieren() {
  cancelAnimationFrame(raster.anim);
  const schritt = () => {
    const diff = raster.fertig - raster.gezeigt;
    raster.gezeigt += Math.abs(diff) < 1 ? diff : diff * 0.12;
    bildRasterZeichnen();
    if (Math.abs(raster.fertig - raster.gezeigt) > 0.5) raster.anim = requestAnimationFrame(schritt);
  };
  schritt();
}

function bilderVerbergen() {
  ["live-bild", "live-bild-b"].forEach((id) => $(id).classList.remove("sichtbar"));
  bildTausch.src = "";
}

function laptopTempo(lok) {
  if (!lok?.renderdauer_s || !lok.bilder) return null;
  const m = Math.floor(lok.renderdauer_s / 60), s = lok.renderdauer_s % 60;
  return `${zahl(lok.bilder)} Bilder in ${m}:${String(s).padStart(2, "0")} Min. (${(lok.bilder / lok.renderdauer_s).toFixed(1).replace(".", ",")} Bilder/s)`;
}

const kontoHandle = (k) => `@${kontoInfo(k).name.toLowerCase().replace(/\s+/g, "")}`;

function buehneZeichnen() {
  const { video, job } = gewaehlt();
  const handy = $("handy");
  const projekt = video?.projekt || job?.projekt || null;
  const lok = projekt ? S.lokal.find((l) => l.projekt === projekt) : null;
  const liveJetzt = !!(S.live?.aktiv && projekt && S.live.projekt === projekt);
  const laeuft = !!(job && (job.status === "laeuft" || job.status === "wartet") && !haengt(job));
  handy.classList.toggle("rendert", laeuft || liveJetzt);
  if (videoLaeuft.projekt && videoLaeuft.projekt !== projekt) videoStoppen();
  $("k-abspielen").hidden = !lok?.mp4 || liveJetzt || laeuft || !!videoLaeuft.projekt;

  // Bild im Handy: live vom Laptop > Standbild eines Laptop-Renders > Bild-Raster (anderer Rechner) > Leerlauf
  if (liveJetzt && S.live.bild) {
    $("leerlauf").classList.add("weg");
    $("bild-raster").classList.remove("sichtbar");
    liveBildZeigen(S.live.projekt, S.live.bild);
  } else if (lok?.vorschau && !laeuft) {
    $("leerlauf").classList.add("weg");
    $("bild-raster").classList.remove("sichtbar");
    liveBildZeigen(projekt, lok.vorschau);
  } else if (job) {
    $("leerlauf").classList.add("weg");
    bilderVerbergen();
    $("bild-raster").classList.add("sichtbar");
    const [f, g] = job.bilder || [0, 0];
    raster.gesamt = g || raster.gesamt || 100;
    raster.fertig = job.status === "fertig" ? raster.gesamt : f || 0;
    rasterAnimieren();
  } else {
    $("leerlauf").classList.remove("weg");
    $("bild-raster").classList.remove("sichtbar");
    bilderVerbergen();
    const bereit = S.render.rechner.filter((r) => r.online).map((r) => r.rechner);
    $("leerlauf-text").textContent = bereit.length ? `${bereit.join(" + ")} bereit` : "Kein Render-Rechner online";
  }

  $("buehne-titel").textContent = video || job ? kontoHandle(video?.konto || job?.konto) : "@cockpit";
  $("buehne-unter").textContent = video?.titel || job?.projekt || "Warte auf den nächsten Render";

  if (!job) {
    $("prozent").textContent = video?.status === "gepostet" || video?.status === "geplant" || lok?.mp4 ? "100" : "0";
    zaehlStand.set($("prozent"), Number($("prozent").textContent));
    $("herz-zahl").textContent = kurzZahl(lok?.bilder || 0);
    $("info-zeilen").innerHTML = video
      ? infoZeilen([["Video", video.titel], ["Konto", kontoInfo(video.konto).name], ["Slot", `${video.datum} ${slotZeit(video.datum, video.slot) || video.slot}`], ["Status", video.status], ["Laptop-Render", laptopTempo(lok) || "–"], ["Post-ID", video.post_id || "–"]])
      : infoZeilen([["Stand", "kein Auftrag ausgewählt"], ["Tipp", "im Tagesplan ein Video anklicken"]]);
    $("phasen").innerHTML = "";
    return;
  }

  const prozent = job.status === "fertig" ? 100 : Math.round(job.prozent || 0);
  hochzaehlen($("prozent"), prozent);
  const [fertig, gesamt] = job.bilder || [liveJetzt ? S.live.anzahl : 0, 0];
  $("herz-zahl").textContent = kurzZahl(fertig || 0);
  const gpu = String(job.gpu || "").replace(/\s*\(0x[0-9A-F]+\)/i, "");
  $("info-zeilen").innerHTML = infoZeilen([
    ["Projekt", job.projekt],
    ["Rechner", `${job.rechner || "?"}${gpu ? " · " + gpu : ""}`],
    ["Bilder", gesamt ? `${zahl(fertig)} / ${zahl(gesamt)}` : "–"],
    ["Rest", haengt(job) ? "hängt: Rechner offline" : job.rest_min != null && laeuft ? `ca. ${String(job.rest_min).replace(".", ",")} Min.` : job.status === "fertig" ? "fertig" : "–"],
    ["Tempo", liveJetzt ? `${String(S.live.fps).replace(".", ",")} Bilder/s (live)` : job.renderzeit?.s_pro_bild ? `${job.renderzeit.s_pro_bild} s/Bild` : laptopTempo(lok) || "–"],
    ["Auftrag", job.id],
  ]);
  const index = PHASEN.indexOf(job.status === "fertig" ? "fertig" : job.phase);
  const kaputt = job.status === "fehler" || job.status === "keine_gpu" || haengt(job);
  $("phasen").innerHTML = PHASEN.map((ph, i) => `<span class="phase ${i < index || job.status === "fertig" ? "fertig" : i === index ? (kaputt ? "kaputt" : "jetzt") : ""}">${ph}</span>`).join("");
}

// Fertiges MP4 im Handy abspielen
const videoLaeuft = { projekt: null };
function videoStoppen() {
  const v = $("handy-video");
  v.pause();
  v.classList.remove("sichtbar");
  v.removeAttribute("src");
  v.load();
  $("handy").classList.remove("spielt");
  videoLaeuft.projekt = null;
}
$("k-abspielen").addEventListener("click", () => {
  const { video, job } = gewaehlt();
  const projekt = video?.projekt || job?.projekt;
  if (!projekt) return;
  Ton.whoosh();
  const v = $("handy-video");
  v.src = `/api/video?p=${encodeURIComponent(projekt)}`;
  v.controls = true;
  videoLaeuft.projekt = projekt;
  $("handy").classList.add("spielt");
  v.classList.add("sichtbar");
  $("k-abspielen").hidden = true;
  v.play().catch(() => {});
  herzenAusHandy(12);
});
$("handy-video").addEventListener("ended", () => { videoStoppen(); buehneZeichnen(); });

function infoZeilen(paare) {
  return paare.map(([k, v]) => `<div><small>${esc(k)}</small><b title="${esc(v)}">${esc(v)}</b></div>`).join("");
}

// ───────────────────────── Produktionskette ─────────────────────────

const KETTE = [
  { id: "idee", name: "Idee", icon: "💡", text: "Thema aus dem Ideen-Studio bzw. Trend-Radar." },
  { id: "skript", name: "Skript", icon: "✍️", text: "Recherche mit Quellen, Skript nach dem Skill des Accounts." },
  { id: "freigabe", name: "Freigabe", icon: "✅", text: "Du gibst das Skript frei." },
  { id: "fakten", name: "Faktencheck", icon: "🔎", text: "Jede Zahl gegen Quelle und Rechenweg, Rechnung als Code mit Tests." },
  { id: "stimme", name: "Stimme", icon: "🎙️", text: "KI-Stimme (nur Simulierbar)." },
  { id: "szene", name: "Szene", icon: "🧊", text: "Three.js-Szene, Standbilder geprüft." },
  { id: "render", name: "Render", icon: "🎬", text: "Render-Dienst auf PC oder Laptop." },
  { id: "ton", name: "Ton", icon: "🎧", text: "Ton-Mix, Lautheit −14 LUFS, MP4." },
  { id: "pruefung", name: "Prüfung", icon: "🧪", text: "Maßstab bzw. Referenzprüfung, Kontaktbogen, Abnahme." },
  { id: "buffer", name: "Buffer", icon: "📅", text: "In Buffer eingeplant." },
  { id: "online", name: "Online", icon: "🚀", text: "Gepostet und nachgeprüft." },
];

function ketteZustand(video, job) {
  const z = Object.fromEntries(KETTE.map((s) => [s.id, "offen"]));
  const bis = (id) => { for (const s of KETTE) { z[s.id] = "fertig"; if (s.id === id) break; } };
  if (video?.status === "gepostet") bis("online");
  else if (video?.status === "geplant") { bis("buffer"); z.online = "jetzt"; }
  else if (job) {
    bis("szene");
    if (job.status === "fertig") { z.render = "fertig"; z.ton = "fertig"; z.pruefung = "jetzt"; }
    else if (job.status === "fehler" || job.status === "keine_gpu" || haengt(job)) z.render = "kaputt";
    else if (["ton", "mux", "verkleinern"].includes(job.phase)) { z.render = "fertig"; z.ton = "jetzt"; }
    else if (job.phase === "hochladen") { z.render = "fertig"; z.ton = "fertig"; }
    else z.render = "jetzt";
  }
  const projekt = video?.projekt || job?.projekt || "";
  if (String(video?.konto || job?.konto || "").startsWith("stelldirvor") || projekt.startsWith("a2-")) z.stimme = "entfaellt";
  return z;
}

function ketteZeichnen() {
  const { video, job } = gewaehlt();
  const z = ketteZustand(video, job);
  $("kette-titel").textContent = video ? `Produktionskette · ${video.titel}` : job ? `Produktionskette · ${job.projekt}` : "Produktionskette";
  $("kette").innerHTML = KETTE.map((s) => `<button class="schritt ${z[s.id]} ${S.schritt === s.id ? "gewaehlt" : ""}" data-schritt="${s.id}" title="${esc(s.name)}"><span class="knoten">${z[s.id] === "fertig" ? "✓" : s.icon}</span><span>${esc(s.name)}</span></button>`).join("");
  detailZeichnen(video, job, z);
}

function detailZeichnen(video, job, z) {
  const s = KETTE.find((k) => k.id === S.schritt);
  if (!s) {
    $("detail").innerHTML = `<div class="detail-leer">${video || job ? "Klicke auf einen Schritt der Kette, um Details zu sehen." : "Wähle im Tagesplan ein Video oder einen Render-Auftrag."}</div>`;
    return;
  }
  const zustandText = { fertig: "erledigt", jetzt: "läuft gerade", kaputt: "Problem", offen: "noch offen", entfaellt: "entfällt bei diesem Account" }[z[s.id]];
  let inhalt = `<h4>${s.icon} ${esc(s.name)} · <span class="chip ${z[s.id] === "fertig" ? "ok" : z[s.id] === "jetzt" ? "laeuft" : z[s.id] === "kaputt" ? "fehler" : ""}">${zustandText}</span></h4><div>${esc(s.text)}</div>`;
  if ((s.id === "render" || s.id === "ton") && job) {
    inhalt += `<div class="log">Auftrag ${esc(job.id)} · Status ${esc(job.status)} · Phase ${esc(job.phase || "–")} · ${job.bilder ? `Bild ${zahl(job.bilder[0])}/${zahl(job.bilder[1])}` : ""}${job.fehler ? `\nFehler: ${esc(job.fehler)}` : ""}${haengt(job) ? `\nHängt: ${esc(job.rechner)} sendet keinen Herzschlag mehr. Der Dienst setzt den Auftrag beim nächsten Start dort fort.` : ""}</div>`;
    if (S.renderlog.auftrag === job.id && S.renderlog.zeilen.length) inhalt += `<div class="log">${S.renderlog.zeilen.slice(-12).map(esc).join("\n")}</div>`;
  } else if (s.id === "render" && laptopTempo(S.lokal.find((l) => l.projekt === (video?.projekt || job?.projekt)))) {
    inhalt += `<div class="log">Auf diesem Laptop gerendert: ${esc(laptopTempo(S.lokal.find((l) => l.projekt === (video?.projekt || job?.projekt))))}. Das fertige MP4 kannst du im Handy abspielen.</div>`;
  } else if (s.id === "buffer" && video) {
    inhalt += `<div class="log">Post-ID ${esc(video.post_id || "–")} · Slot ${esc(video.datum)} ${slotZeit(video.datum, video.slot) || ""} · ${esc(kontoInfo(video.konto).name)}</div>`;
  } else if (s.id === "online" && video) {
    inhalt += `<div class="log">${video.status === "gepostet" ? "Gepostet und nachgeprüft." : `Geht am ${esc(video.datum)} um ${slotZeit(video.datum, video.slot) || "?"} online.`}</div>`;
  } else if (["idee", "skript", "freigabe", "fakten"].includes(s.id)) {
    inhalt += `<div class="log">Diese Schritte liefen bisher im Ideen-Studio. Mit dem Umzug ins Cockpit (nächster Ausbau) siehst und steuerst du sie hier.</div>`;
  }
  const titel = video?.titel || job?.projekt;
  if (titel) inhalt += `<button class="knopf klein" data-frage="${esc(`Wie ist der Stand bei „${titel}“ im Schritt ${s.name}? Schau in pipeline/projekte/${video?.projekt || job?.projekt}/ und data/produktion/protokoll.csv nach und antworte kurz.`)}">Claude dazu fragen</button>`;
  $("detail").innerHTML = inhalt;
}

$("kette").addEventListener("click", (e) => {
  const b = e.target.closest(".schritt");
  if (!b) return;
  Ton.klick();
  S.schritt = S.schritt === b.dataset.schritt ? null : b.dataset.schritt;
  P.funken(...mitte(b.querySelector(".knoten")), 12);
  ketteZeichnen();
});
$("detail").addEventListener("click", (e) => {
  const b = e.target.closest("[data-frage]");
  if (b) eingabeVorbelegen(b.dataset.frage);
});

// ───────────────────────── Rechts: Claude ─────────────────────────

const WERKZEUG_ICON = { Bash: "⌨️", PowerShell: "⌨️", Read: "📖", Write: "📝", Edit: "✏️", MultiEdit: "✏️", Grep: "🔍", Glob: "🗂️", WebSearch: "🌐", WebFetch: "🔗", Task: "🤖", Agent: "🤖", TodoWrite: "📋" };
// Modell wählt die Automatik (Feld „Modell“ = Automatisch), außer du legst es oben fest
const SCHNELL = [
  ["☀️ Tages-Briefing", "Gib mir ein kurzes Tages-Briefing: Was steht heute an? Nutze data/produktion/protokoll.csv, CLAUDE.md §11 (Nächste Schritte) und docs/trends/vorschlaege.md. Höchstens 8 Zeilen, dann die 3 wichtigsten nächsten Schritte für mich."],
  ["🎬 Render-Lage", "Wie ist die Render-Lage? Führe py -3 C:\\render\\tiktok-automation\\pipeline\\render_dienst\\auftrag.py pc und danach … status --alle aus und erkläre das Ergebnis in 5 Zeilen.", {}],
  ["📈 Stand der Accounts", "Fasse den aktuellen Stand beider Accounts aus CLAUDE.md §11 in 6 Zeilen zusammen, mit den offenen Punkten, die ich entscheiden muss."],
  ["💡 Ideen für morgen", "Schlag mir je Account 3 Ideen für morgen vor (Regeln aus CLAUDE.md §3 und §9). Nur Titel und ein Satz, noch nichts recherchieren."],
];

function claudeZeichnen() {
  const c = S.claude || {};
  $("claude-panel").classList.toggle("arbeitet", !!c.laeuft);
  $("claude-status").textContent = c.laeuft ? (c.warteschlange ? `arbeitet · ${c.warteschlange} wartet` : "arbeitet …") : c.cli === false ? "nicht installiert" : "bereit";
  $("cli-fehlt").hidden = c.cli !== false;
  if (c.modus && document.activeElement !== $("modus")) $("modus").value = c.modus;
  if (c.modell != null && document.activeElement !== $("modell")) $("modell").value = c.modell;
  const zeichen = { pending: "○", in_progress: "◐", completed: "✓" };
  $("aufgaben").innerHTML = (c.aufgaben || []).map((a) => `<div class="aufgabe ${esc(a.status)}"><i>${zeichen[a.status] || "○"}</i><span>${esc(a.text)}</span></div>`).join("");
}

// Kleines, sicheres Markdown für Claudes Antworten (erst escapen, dann Fett, Code, Überschriften, Listen)
function md(text) {
  return esc(text)
    .replace(/^#{1,4}\s+(.+)$/gm, '<b class="md-h">$1</b>')
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/^(\s*)[-*]\s+/gm, "$1• ");
}
const mdOhne = (text) => String(text).replace(/\*\*|`/g, "").replace(/^#{1,4}\s+/gm, "").replace(/^(\s*)[-*]\s+/gm, "$1• ");

function eintragHtml(e) {
  const zeit = new Date(e.zeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  switch (e.art) {
    case "werkzeug": {
      const laufend = e.ausgabe === undefined && S.claude.laeuft;
      return `<div class="eintrag werkzeug ${laufend ? "laufend" : ""} ${e.fehler ? "kaputt" : ""}" data-nr="${e.nr}"><div class="kopfzeile"><span>${WERKZEUG_ICON[e.name] || "🛠️"}</span><span>${esc(e.titel)}</span><span class="zeit">${zeit}</span></div><div class="extra"><b>Eingabe</b>\n${esc(e.eingabe)}${e.ausgabe !== undefined ? `\n\n<b>Ergebnis</b>\n${esc(e.ausgabe)}` : ""}</div></div>`;
    }
    case "denken":
      return `<div class="eintrag denken" data-nr="${e.nr}"><div class="kopfzeile"><span>💭 denkt nach …</span><span class="zeit">${zeit}</span></div><div class="extra">${esc(e.text)}</div></div>`;
    case "fertig":
      return `<div class="eintrag fertig" data-nr="${e.nr}"><div class="kopfzeile"><span>🏁 ${esc(e.text)}</span><span class="zeit">${e.dauer_s ? `${e.dauer_s} s · ${e.schritte || 0} Züge` : zeit}</span></div>${e.verweigert?.length ? `<div>Nicht erlaubt: ${esc(e.verweigert.join(", "))}. Modus „Auto“ wählen oder selbst freigeben.</div>` : ""}</div>`;
    case "du":
      return `<div class="eintrag du" data-nr="${e.nr}"><div class="kopfzeile"><b>Du</b><span class="zeit">${zeit}</span></div>${esc(e.text)}</div>`;
    case "start":
    case "warteschlange":
      return `<div class="eintrag ${e.art}" data-nr="${e.nr}">${e.art === "warteschlange" ? "⏳ wartet: " : "— "}${esc(e.text)}${e.art === "start" ? " —" : ""}</div>`;
    case "fehler":
      return `<div class="eintrag fehler" data-nr="${e.nr}">⚠️ ${esc(e.text)}</div>`;
    case "auftrag":
      return `<div class="eintrag auftrag" data-nr="${e.nr}"><div class="kopfzeile"><span>📋 Auftrag: ${esc(e.text)}</span><span class="zeit">${zeit}</span></div></div>`;
    case "modell":
      return `<div class="eintrag modell modell-${esc(e.modell || "")}" data-nr="${e.nr}">🧠 Modell-Automatik: ${esc(e.text)}</div>`;
    default:
      return `<div class="eintrag text" data-nr="${e.nr}">${md(e.text)}</div>`;
  }
}

function feedUnten() {
  const f = $("feed");
  return f.scrollHeight - f.scrollTop - f.clientHeight < 80;
}

function feedNeu() {
  $("feed").innerHTML = S.feed.map(eintragHtml).join("") || `<div class="eintrag start">Noch keine Unterhaltung. Unten einen Auftrag eingeben oder einen Schnellbefehl wählen.</div>`;
  $("feed").scrollTop = $("feed").scrollHeight;
}

function feedAnhaengen(e) {
  S.feed.push(e);
  if (S.feed.length > 300) S.feed.shift();
  const unten = feedUnten();
  $("feed").querySelector(".eintrag.start:only-child")?.remove();
  $("feed").insertAdjacentHTML("beforeend", eintragHtml(e));
  const el = $("feed").lastElementChild;
  if (e.art === "text" && e.text.length < 4000) tippen(el, e.text);
  if (unten) $("feed").scrollTop = $("feed").scrollHeight;
  if (e.art === "werkzeug") tickerNeu(`Claude: ${e.titel}`);
  // Sound und Effekte passend zur Arbeit (spiel.js)
  if (typeof Spiel !== "undefined") Spiel.feed(e, el);
  else if (e.art === "werkzeug") Ton.blip();
  else if (e.art === "fertig") Ton.chime();
  else if (e.art === "fehler") Ton.fehler();
  document.dispatchEvent(new CustomEvent("cockpit:feed", { detail: e }));
}

// Schreibmaschinen-Effekt als reiner Text, am Ende mit Formatierung
function tippen(el, text) {
  const roh = mdOhne(text);
  const start = performance.now();
  const dauer = Math.min(900, 120 + roh.length * 4);
  const schritt = (t) => {
    const p = Math.min(1, (t - start) / dauer);
    if (p < 1) {
      el.textContent = roh.slice(0, Math.ceil(roh.length * p));
      requestAnimationFrame(schritt);
    } else el.innerHTML = md(text);
  };
  requestAnimationFrame(schritt);
}

$("feed").addEventListener("click", (e) => {
  const k = e.target.closest(".eintrag.werkzeug, .eintrag.denken");
  if (k) { k.classList.toggle("offen"); Ton.klick(); }
});

function eingabeVorbelegen(text) {
  $("eingabe-text").value = text;
  $("eingabe-text").focus();
  P.funken(...mitte($("eingabe-text")), 14);
}

async function auftragSenden(text, opt = {}) {
  text = text.trim();
  if (!text) return;
  Ton.init();
  const r = await post("/api/claude", { text, modus: opt.modus || $("modus").value, modell: opt.modell ?? $("modell").value, stimme: !!opt.stimme });
  if (!r.ok) toast("⚠️", "Claude", r.fehler || "Auftrag nicht angenommen", "problem");
}

$("eingabe").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("eingabe-text").value;
  $("eingabe-text").value = "";
  auftragSenden(t);
});
$("eingabe-text").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("eingabe").requestSubmit(); }
});
$("schnell").innerHTML = SCHNELL.map(([name], i) => `<button data-i="${i}">${esc(name)}</button>`).join("") + `<button data-briefing title="Beim ersten Start am Tag holt Claude das Briefing selbst">${lokal.lesen("auto-briefing", "an") === "an" ? "🔔 Auto-Briefing an" : "🔕 Auto-Briefing aus"}</button>`;
$("schnell").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  Ton.klick();
  if (b.dataset.briefing !== undefined) {
    const an = lokal.lesen("auto-briefing", "an") !== "an";
    lokal.schreiben("auto-briefing", an ? "an" : "aus");
    b.textContent = an ? "🔔 Auto-Briefing an" : "🔕 Auto-Briefing aus";
    return;
  }
  const [, text, opt] = SCHNELL[Number(b.dataset.i)];
  auftragSenden(text, opt);
});
$("k-neu").addEventListener("click", () => { Ton.klick(); post("/api/claude/neu"); });
$("k-stopp").addEventListener("click", () => { Ton.fehler(); post("/api/claude/stopp"); });
$("modus").addEventListener("change", () => Ton.klick());

function autoBriefing() {
  if (lokal.lesen("auto-briefing", "an") !== "an" || !S.claude?.cli || S.claude.laeuft) return;
  if (lokal.lesen("briefing-tag", "") === S.heute) return;
  lokal.schreiben("briefing-tag", S.heute);
  const [, text, opt] = SCHNELL[0];
  auftragSenden(text, opt);
}

// ───────────────────────── Kopfzeilen-Knöpfe ─────────────────────────

function tonKnopf() { $("k-ton").textContent = Ton.an ? "🔊" : "🔇"; }
$("k-ton").addEventListener("click", () => {
  Ton.an = !Ton.an;
  lokal.schreiben("ton", Ton.an ? "an" : "aus");
  Ton.init();
  tonKnopf();
  Ton.chime();
});
$("k-aktualisieren").addEventListener("click", (e) => { Ton.klick(); P.funken(...mitte(e.currentTarget), 16); post("/api/aktualisieren"); });
$("k-neustart").addEventListener("click", async () => {
  Ton.klick();
  const r = await post("/api/neustart");
  if (!r.ok) { toast("⚠️", "Neustart", r.fehler || "nicht möglich", "problem"); return; }
  $("verbindung").className = "verbindung";
  $("verbindung").textContent = "● startet neu …";
  P.konfetti(...mitte($("k-neustart")), 40, 5);
});
$("k-beenden").addEventListener("click", async () => {
  if (!confirm("Cockpit-Server beenden? Render-Dienst und Claude in der Cloud laufen weiter.")) return;
  await post("/api/beenden");
  $("verbindung").textContent = "● beendet · neu starten mit Strg+Alt+T";
});

// ───────────────────────── Live-Verbindung ─────────────────────────

function allesZeichnen() {
  linksZeichnen();
  buehneZeichnen();
  ketteZeichnen();
  claudeZeichnen();
}

function verbinden() {
  const es = new EventSource("/api/events");
  S.es = es;
  const an = (art, f) => es.addEventListener(art, (e) => { try { f(JSON.parse(e.data)); } catch (err) { console.error(art, err); } });

  an("zustand", (z) => {
    // Neuer Server (Neustart oder Update): Seite neu laden, damit Token und Oberfläche passen
    if (S.instanz && z.instanz && z.instanz !== S.instanz) { location.reload(); return; }
    S.instanz = z.instanz;
    Object.assign(S, { render: z.render, live: z.live, lokal: z.lokal || [], plan: z.plan, claude: z.claude, heute: z.heute, rechner: z.rechner, feed: z.feed || [], db: z.db || { skripte: [], ideen: [], stand: [] }, einstellungen: z.einstellungen || {} });
    S.verbunden = true;
    S.abgleich = z.abgleich || null;
    verbindungZeigen();
    feedNeu();
    allesZeichnen();
    studioZeichnen();
    tickerNeu(`Cockpit verbunden · ${S.render.rechner.filter((r) => r.online).length} Rechner online`);
    setTimeout(autoBriefing, 1500);
  });
  an("render", (r) => {
    const vorher = new Map(S.render.auftraege.map((a) => [a.id, a.bilder?.[0] || 0]));
    S.render = r;
    for (const a of r.auftraege) {
      const neu = (a.bilder?.[0] || 0) - (vorher.get(a.id) ?? a.bilder?.[0] ?? 0);
      if (neu > 0 && !(S.live?.aktiv && S.live.projekt === a.projekt)) herzenAusHandy(Math.min(8, Math.ceil(neu / 40)));
    }
    linksZeichnen();
    buehneZeichnen();
    ketteZeichnen();
  });
  an("live", (l) => {
    const vorher = S.live?.nr || 0;
    S.live = l;
    if (l.aktiv && l.nr > vorher) herzenAusHandy(Math.min(4, Math.max(1, Math.round((l.fps || 1) / 6))));
    buehneZeichnen();
  });
  an("renderlog", (l) => {
    if (S.renderlog.auftrag !== l.auftrag) S.renderlog = { auftrag: l.auftrag, zeilen: [] };
    S.renderlog.zeilen = [...S.renderlog.zeilen, ...l.zeilen].slice(-60);
    l.zeilen.slice(-3).forEach((z) => tickerNeu(z.replace(/^\d\d:\d\d:\d\d\s*/, "")));
    if (S.schritt === "render" || S.schritt === "ton") ketteZeichnen();
  });
  an("plan", (p) => { S.plan = p; linksZeichnen(); ketteZeichnen(); });
  an("lokal", (l) => { S.lokal = l; linksZeichnen(); buehneZeichnen(); });
  an("claude", (c) => {
    S.claude = c;
    claudeZeichnen();
    studioZeichnen();
  });
  an("db", (e) => studioDbEreignis(e));
  an("feed", (e) => feedAnhaengen(e));
  an("werkzeug_ergebnis", (r) => {
    const e = S.feed.find((x) => x.nr === r.nr);
    if (e) Object.assign(e, { ausgabe: r.ausgabe, fehler: r.fehler });
    const el = $("feed").querySelector(`[data-nr="${r.nr}"]`);
    if (el && e) {
      const offen = el.classList.contains("offen");
      el.outerHTML = eintragHtml(e);
      if (offen) $("feed").querySelector(`[data-nr="${r.nr}"]`)?.classList.add("offen");
    }
  });
  // Abgleich mit dem anderen Rechner (Laptop ⇄ PC)
  an("abgleich", (a) => { S.abgleich = a; verbindungZeigen(); });
  an("abgleich_neu", (a) => { tickerNeu(`⇄ ${a.anzahl} Änderung${a.anzahl === 1 ? "" : "en"}${a.von?.length ? ` vom ${a.von.join(", ")}` : ""} übernommen`); Ton.blip(); });
  an("meilenstein", (m) => {
    if (m.art === "render_fertig") {
      toast("🎬", "Render fertig", m.text, "meilenstein");
      Ton.whoosh();
      setTimeout(() => Ton.fanfare(), 350);
      P.konfetti(...mitte($("handy")), 180, 11);
      herzenAusHandy(20);
    } else if (m.art === "render_fehler") {
      toast("⚠️", "Render-Problem", m.text, "problem");
      Ton.fehler();
    } else if (m.art === "render_start") {
      toast("🎥", "Neuer Render", m.text, "meilenstein");
      Ton.whoosh();
      S.auswahl = { typ: "job", id: m.id };
      allesZeichnen();
    } else {
      Ton.blip();
    }
    tickerNeu(m.text);
  });
  an("puls", () => uhrZeichnen());
  es.onerror = () => {
    S.verbunden = false;
    $("verbindung").className = "verbindung aus";
    $("verbindung").textContent = "● getrennt · verbinde neu …";
  };
  // Erst jetzt hängen sich die weiteren Module (spiel.js, zahlen.js, stimme.js) an: ihre Ereignisse laufen
  // dann nach denen von cockpit.js, also mit bereits übernommenen Daten
  document.dispatchEvent(new CustomEvent("cockpit:verbunden", { detail: es }));
}

// Fußzeile: verbunden, dieser Rechner und (falls es sie gibt) die anderen Rechner mit Cockpit
function verbindungZeigen() {
  if (!S.verbunden) return;
  const a = S.abgleich;
  const andere = (a?.rechner || []).filter((r) => r !== S.rechner);
  $("verbindung").className = "verbindung an";
  $("verbindung").textContent = `● verbunden · ${S.rechner}${andere.length ? ` ⇄ ${andere.join(", ")}` : ""}${a?.fehler ? " · Abgleich gestört" : ""}`;
  $("verbindung").title = a ? `Abgleich über Supabase${a.zuletzt ? `, zuletzt ${new Date(a.zuletzt).toLocaleTimeString("de-DE")}` : ""}${a.fehler ? `: ${a.fehler}` : ""}` : "";
}

P.init();
tonKnopf();
uhrZeichnen();
setInterval(uhrZeichnen, 1000);
addEventListener("resize", () => bildRasterZeichnen());
// Erst verbinden, wenn alle Skripte (auch studio.js) geladen sind
document.addEventListener("DOMContentLoaded", verbinden);
