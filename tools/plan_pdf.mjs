#!/usr/bin/env node
// Erzeugt docs/plan/30-tage-plan.pdf aus data/plan/30-tage.csv (Simulierbar, Standard)
// bzw. mit --plan account2 docs/plan/account2-30-tage-plan.pdf aus data/plan/account2-30-tage.csv (@stelldirvor.pov).
//
// Aufruf (Repo-Wurzel, Windows und Linux):
//   node tools/plan_pdf.mjs                     -> docs/plan/30-tage-plan.pdf
//   node tools/plan_pdf.mjs --plan account2     -> docs/plan/account2-30-tage-plan.pdf
//   node tools/plan_pdf.mjs --html plan.html    -> schreibt zusätzlich das HTML (zum Ansehen im Browser)
//   node tools/plan_pdf.mjs --out pfad.pdf      -> anderer Zielpfad
//
// Braucht Playwright mit Chromium (`npm i -D playwright` und `npx playwright install chromium`,
// falls nicht vorhanden). Schrift: Inter aus pipeline/node_modules/@fontsource/inter, sonst Systemschrift.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const PLAN = args.includes("--plan") ? args[args.indexOf("--plan") + 1] : "account1";
if (!["account1", "account2"].includes(PLAN)) { console.error(`Unbekannter Plan: ${PLAN} (erlaubt: account1, account2)`); process.exit(1); }
const A2 = PLAN === "account2";
const CSV_PATH = A2 ? path.join(ROOT, "data", "plan", "account2-30-tage.csv") : path.join(ROOT, "data", "plan", "30-tage.csv");
const PLANSTAND = A2
  ? "01.11.2026, 2 Videos pro Tag (Entscheidung 01.11. 21:30); die ersten 4 Videos sind in Produktion"
  : "01.11.2026 (Termine verschoben: GTA 6 und Spurwechsel sind gepostet, heute geht es mit Treppe oder Aufzug weiter)";

const argVal = (name) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? path.resolve(args[i + 1]) : null;
};
const OUT_PDF = argVal("--out") || path.join(ROOT, "docs", "plan", A2 ? "account2-30-tage-plan.pdf" : "30-tage-plan.pdf");
const OUT_HTML = argVal("--html");

// ---------- CSV ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.map((r) => Object.fromEntries(head.map((h, j) => [h, r[j] ?? ""])));
}

const rows = parseCsv(fs.readFileSync(CSV_PATH, "utf8").replace(/^﻿/, ""));
rows.forEach((r, i) => (r.nr = i + 1));

// ---------- Hilfen ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const dateOf = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };
const tag = (iso) => { const d = dateOf(iso); return `${WT[d.getUTCDay()]} ${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.`; };
const SLOT = { mittag: "Mittag · 12:00", bonus: "Bonus · 16:00", abend: "Abend · 20:00" };
const AUFWAND = { 1: "0,5 Std.", 2: "1,5 Std.", 3: "3 Std.", 4: "5 Std." };
const PRIO = { A: "A · bleibt fix", B: "B · darf 1–3 Tage rutschen", C: "C · darf entfallen" };
const MAX = { D: 30, K: 25, B: 20, L: 15, F: 10 };
const KRIT = { D: "Duell/Rennen mit Zählern", K: "kontraintuitiv mit Bedingung", B: "jeder kennt es", L: "trägt 65–80 s, 2 Wendungen", F: "frei von Konkurrenz/Sperre" };

function scoreClass(s) { s = Number(s); return s >= 85 ? "s-top" : s >= 75 ? "s-gut" : s >= 65 ? "s-mittel" : "s-knapp"; }
function statusKind(st) {
  st = st.replace(/ · verschoben 01\.11\. \([^)]*\)/, ""); // reine Terminverschiebung vom 01.11. zählt nicht als Änderung
  if (st.startsWith("gepostet")) return ["gepostet", "st-alt"];
  if (st.startsWith("Neubau")) return ["Neubau nötig", "st-neubau"];
  if (st.startsWith("geplant (neu 31.10.") && /Score|Maßstab|eigene Idee/.test(st)) return ["neu im Plan", "st-neu"];
  if (st.includes("umgebaut") || st.includes("Hook nach Maßstab")) return ["umgebaut", "st-umbau"];
  if (st.includes("verschoben") || st.includes("vorgezogen")) return ["verschoben", "st-schieb"];
  return ["wie bisher", "st-alt"];
}
function teile(begr) {
  const m = begr.match(/^D(\d+) K(\d+) B(\d+) L(\d+) F(\d+)\s*·\s*(.*)$/);
  if (!m) return { sub: null, text: begr };
  return { sub: { D: +m[1], K: +m[2], B: +m[3], L: +m[4], F: +m[5] }, text: m[6] };
}
function farben(s) {
  const out = [];
  const re = /([^/]+?)\s*#([0-9A-Fa-f]{6})\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(s))) out.push({ name: m[1].trim(), hex: "#" + m[2], rolle: m[3] });
  return out;
}
const woche = (iso) => { const d = dateOf(iso).getUTCDate(); return d <= 7 ? 1 : d <= 14 ? 2 : d <= 21 ? 3 : d <= 28 ? 4 : 5; };
const WOCHEN = { 1: "So 01.–Sa 07.11.", 2: "So 08.–Sa 14.11.", 3: "So 15.–Sa 21.11.", 4: "So 22.–Sa 28.11.", 5: "So 29.–Mo 30.11." };

// ---------- Schrift ----------
function fontFaces() {
  const dir = path.join(ROOT, "pipeline", "node_modules", "@fontsource", "inter", "files");
  const want = [[400, "normal"], [500, "normal"], [600, "normal"], [700, "normal"], [800, "normal"], [400, "italic"]];
  let css = "";
  for (const [w, st] of want) {
    const f = path.join(dir, `inter-latin-${w}-${st}.woff2`);
    if (fs.existsSync(f)) css += `@font-face{font-family:"InterPlan";font-weight:${w};font-style:${st};src:url(data:font/woff2;base64,${fs.readFileSync(f).toString("base64")}) format("woff2");}\n`;
  }
  return css;
}

// ---------- Inhalt ----------
const scores = rows.map((r) => Number(r.massstab_score));
const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1).replace(".", ",");
const haupt = rows.filter((r) => r.slot !== "bonus").length;
const bonus = rows.length - haupt;
const kinds = {};
rows.forEach((r) => { const k = statusKind(r.status)[0]; kinds[k] = (kinds[k] || 0) + 1; });
const top5 = [...rows].filter((r) => !r.status.startsWith("gepostet")).sort((a, b) => b.massstab_score - a.massstab_score || a.nr - b.nr).slice(0, 5);
const erzeugt = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function pill(text, cls) { return `<span class="pill ${cls}">${esc(text)}</span>`; }
function badge(s) { return `<span class="score ${scoreClass(s)}">${esc(s)}</span>`; }

function deckblatt() {
  return `
<section class="cover">
  <div class="kicker">Simulierbar · Content-Plan</div>
  <h1>30-Tage-Plan<br><span>01.–30. November 2026</span></h1>
  <p class="lead">Jedes Video im Duell- bzw. Rennformat nach dem Maßstab aus vier viralen Simulationsvideos. Pro Video: Hook, Denkfalle, zwei Wendungen, Stil, Teamfarben, Rechnung, Quellen, Aufwand und Maßstab-Score.</p>
  <div class="stand">Planstand: ${esc(PLANSTAND)}<br>PDF erzeugt am ${esc(erzeugt)} aus <code>data/plan/30-tage.csv</code></div>

  <div class="kpis">
    <div class="kpi"><b>${rows.length}</b><span>Videos<br>${haupt} Haupt, ${bonus} Bonus</span></div>
    <div class="kpi"><b>${avg}</b><span>Ø Maßstab-Score<br>min. ${Math.min(...scores)}, max. ${Math.max(...scores)}</span></div>
    <div class="kpi"><b>${kinds["neu im Plan"] || 0}</b><span>neue Themen<br>(Überarbeitung 31.10.)</span></div>
    <div class="kpi"><b>${(kinds["umgebaut"] || 0) + (kinds["verschoben"] || 0)}</b><span>umgebaut bzw.<br>verschoben</span></div>
  </div>

  <div class="cols">
    <div class="box">
      <h3>Kurzüberblick</h3>
      <ul>
        <li>2 Videos pro Tag (12:00 und 20:00), dazu höchstens 3 Bonusvideos pro Woche (16:00). Uhrzeiten sind eine Annahme (A), bis Analytics vorliegen.</li>
        <li>Produktion nur auf dein Startsignal, in der Reihenfolge dieses Plans. Fällt ein Tag aus, rutscht die Liste nach; Terminvideos (Priorität A) bleiben fix.</li>
        <li>GTA 6 weltweit und Spurwechsel sind bereits gepostet (alte Version, kein Neubau). Ab Sonntag 01.11. geht es mit „Treppe oder Aufzug“ (12:00) und „200 € oder 100 € steuerfrei“ (20:00) weiter. Termin-Videos behalten ihr Datum, der Rest ist nachgerückt.</li>
        <li>Jedes Video: Hook in 5 s, „Klar … Oder?“ und „Los geht's.“ vor Sekunde 16, erste Wendung bei 18–25 s, Folgen-Aufruf bei ca. 20 s, Schluss „Was sollen wir als Nächstes zeigen? Schreib es in die Kommentare.“, letztes Bild = erstes Bild.</li>
        <li>Stil je Video aus dem Katalog (derzeit 15 Stile), passend zum Thema, nie zweimal hintereinander. Untertitel Wort für Wort, Stimme Ben (Eleven v4). Keine Rubrik und kein Kanalname im Bild.</li>
      </ul>
    </div>
    <div class="box">
      <h3>Die 5 stärksten Videos (S)</h3>
      <ol class="top">${top5.map((r) => `<li>${badge(r.massstab_score)}<span><b>${esc(r.titel)}</b><br><small>${esc(tag(r.datum))} · ${esc(SLOT[r.slot])}</small></span></li>`).join("")}</ol>
    </div>
  </div>

  <div class="cols">
    <div class="box">
      <h3>Maßstab-Score (0–100, Schätzung)</h3>
      <table class="raster">${Object.entries(MAX).map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(KRIT[k])}</td><td>0–${v}</td></tr>`).join("")}</table>
      <p class="hint">Unter 60 Punkten fliegt ein Thema raus. Farben: <span class="score s-top">85+</span> <span class="score s-gut">75+</span> <span class="score s-mittel">65+</span> <span class="score s-knapp">&lt;65</span></p>
    </div>
    <div class="box">
      <h3>Legende</h3>
      <table class="raster">
        <tr><td><b>(F)</b></td><td>belegter Fakt mit Quelle</td></tr>
        <tr><td><b>(S)</b></td><td>Schätzung</td></tr>
        <tr><td><b>(A)</b></td><td>Annahme</td></tr>
        <tr><td><b>(B)</b></td><td>Beispielwert, wird vor der Produktion gerechnet</td></tr>
        <tr><td><b>Hypothese</b></td><td>erst die Rechnung entscheidet</td></tr>
        <tr><td><b>prüfen</b></td><td>Quelle bzw. Rechtsstand vor der Produktion klären</td></tr>
      </table>
      <p class="hint">Aufwand: 1 = 0,5 Std., 2 = 1,5 Std., 3 = 3 Std., 4 = 5 Std. aktive Agentenarbeit (S).</p>
    </div>
  </div>
</section>`;
}

function aenderungen() {
  const neu = rows.filter((r) => statusKind(r.status)[0] !== "wie bisher");
  return `
<section class="page">
  <h2>Was sich am 31.10. geändert hat</h2>
  <p class="intro">Grundlage: Maßstab aus <code>docs/15-massstab.md</code>. Gesperrt, weil schon viral: Rennen oder Gehen im Regen, Pausen gegen Tempo auf der Autobahn, Tsunami-Warnzeichen, Duschen gegen Baden (inklusive Duschkosten). Konkurrenz-Check je Thema per Websuche (nur Mindest-Check, der Trend-Radar prüft am Vortag jeder Produktion erneut).</p>
  <table class="list">
    <thead><tr><th>#</th><th>Tag</th><th>Video</th><th>Änderung</th><th>Score</th></tr></thead>
    <tbody>${neu.map((r) => { const [k, c] = statusKind(r.status); return `<tr><td>${r.nr}</td><td class="nowrap">${esc(tag(r.datum))}<br><small>${esc(r.slot)}</small></td><td><b>${esc(r.titel)}</b><br><small>${esc(r.status)}</small></td><td>${pill(k, c)}</td><td>${badge(r.massstab_score)}</td></tr>`; }).join("")}</tbody>
  </table>
</section>`;
}

function wochenuebersicht() {
  let html = `<section class="page"><h2>Wochenübersicht</h2><p class="intro">Fett = Priorität A. Die Zahl im Kreis ist der Maßstab-Score, darunter Stil und Vorlage. Bonusvideos sind optional.</p>`;
  for (let w = 1; w <= 5; w++) {
    const wr = rows.filter((r) => woche(r.datum) === w);
    const tage = [...new Set(wr.map((r) => r.datum))];
    const a = wr.filter((r) => r.prioritaet === "A").map((r) => `${tag(r.datum)} ${r.titel.split(":")[0]}`);
    const cell = (r) => r ? `<div class="wz ${r.prioritaet === "A" ? "prio-a" : ""}">${badge(r.massstab_score)}<div><span class="nr">#${r.nr}</span> ${esc(r.titel)}<br><small>Stil ${esc(r.stil)} · ${esc(r.vorlage.split(" ")[0])}</small></div></div>` : `<span class="leer">–</span>`;
    html += `<div class="woche"><h3>Woche ${w} · ${WOCHEN[w]} <small>${wr.length} Videos</small></h3>
      ${a.length ? `<p class="termine">Termin- und Fundamentvideos: ${esc(a.join(" · "))}</p>` : ""}
      <table class="wt"><thead><tr><th class="c-tag">Tag</th><th>Mittag 12:00</th><th>Bonus 16:00</th><th>Abend 20:00</th></tr></thead><tbody>
      ${tage.map((d) => { const by = Object.fromEntries(wr.filter((r) => r.datum === d).map((r) => [r.slot, r])); return `<tr><td class="c-tag">${esc(tag(d))}</td><td>${cell(by.mittag)}</td><td>${cell(by.bonus)}</td><td>${cell(by.abend)}</td></tr>`; }).join("")}
      </tbody></table></div>`;
  }
  return html + `</section>`;
}

function karte(r) {
  const { sub, text } = teile(r.massstab_begruendung);
  const [sk, sc] = statusKind(r.status);
  const fb = farben(r.teamfarben);
  const bars = sub ? Object.entries(MAX).map(([k, mx]) => `<div class="bar"><span class="bl">${k}</span><span class="bt"><i style="width:${(100 * sub[k]) / mx}%"></i></span><span class="bv">${sub[k]}/${mx}</span></div>`).join("") : "";
  const [stNr, ...stName] = r.stil.split(" ");
  const kc = r.konkurrenz_check.replace(/^WebSearch 31\.10\. \(tiktok\.com\/youtube\.com\):\s*/, "");
  return `
<article class="card">
  <header>
    <div class="meta">#${r.nr} · ${esc(tag(r.datum))} 2026 · ${esc(SLOT[r.slot])} ${r.prioritaet === "A" ? pill("Priorität A", "st-a") : ""} ${pill(sk, sc)}</div>
    <h3>${esc(r.titel)}</h3>
    <div class="big ${scoreClass(r.massstab_score)}"><b>${esc(r.massstab_score)}</b><span>Score</span></div>
  </header>
  <div class="hook"><span class="lbl">Hook (Sprechtext, 0–5 s)</span>„${esc(r.hook)}“</div>
  <table class="dl">
    <tr><th>Denkfalle</th><td>${esc(r.denkfalle)}</td></tr>
    <tr><th>Wendung 1<br><small>ca. 20 s</small></th><td>${esc(r.wendung_1)}</td></tr>
    <tr><th>Wendung 2</th><td>${esc(r.wendung_2)}</td></tr>
    <tr><th>Kernzahl / Twist</th><td>${esc(r.kernzahl_bzw_twist)}</td></tr>
    <tr><th>Quellen prüfen</th><td>${esc(r.quellen_pruefen)}</td></tr>
    <tr><th>Konkurrenz-Check</th><td>${esc(kc)} <small>(Websuche 31.10.)</small></td></tr>
    <tr><th>Maßstab</th><td><div class="bars">${bars}</div><div class="why">${esc(text)}</div></td></tr>
  </table>
  <div class="facts">
    <div><span>Stil</span><b>${esc(stNr)} · ${esc(stName.join(" "))}</b></div>
    <div class="w2"><span>Teamfarben</span><b class="sw">${fb.map((f) => `<i style="background:${f.hex}"></i>${esc(f.name)} <small>(${esc(f.rolle)})</small>`).join("<em>vs</em>") || esc(r.teamfarben)}</b></div>
    <div><span>Vorlage</span><b>${esc(r.vorlage)}</b></div>
    <div><span>Rubrik (intern)</span><b>${esc(r.rubrik)}</b></div>
    <div><span>Aufwand</span><b>${esc(r.aufwand)} · ${esc(AUFWAND[r.aufwand] || "")}</b></div>
    <div><span>Priorität</span><b>${esc(PRIO[r.prioritaet] || r.prioritaet)}</b></div>
    <div class="w4"><span>Status</span><b>${esc(r.status)}</b></div>
  </div>
</article>`;
}

function karten() {
  let html = "";
  for (let w = 1; w <= 5; w++) {
    const wr = rows.filter((r) => woche(r.datum) === w);
    html += `<section class="page cards"><h2>Woche ${w} · ${WOCHEN[w]} <small>Videos #${wr[0].nr}–#${wr[wr.length - 1].nr}</small></h2>${wr.map(karte).join("")}</section>`;
  }
  return html;
}

const CSS = `
${fontFaces()}
@page { size: A4; margin: 12mm 12mm 15mm 12mm; }
:root { --ink:#1b2333; --mut:#5d6878; --line:#dfe4ec; --soft:#f4f6fa; --acc:#2b59c3; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin:0; font-family: "InterPlan","Inter","Segoe UI",Arial,sans-serif; color:var(--ink); font-size:8.3pt; line-height:1.32; }
h1,h2,h3 { margin:0; letter-spacing:-0.01em; }
code { font-family: "JetBrains Mono", Consolas, monospace; font-size:0.92em; background:var(--soft); padding:0 3px; border-radius:3px; }
small { color:var(--mut); font-size:0.88em; }
.page { break-before: page; }
h2 { font-size:14pt; font-weight:800; margin-bottom:2.5mm; padding-bottom:1.5mm; border-bottom:2px solid var(--ink); }
h2 small { font-size:8.5pt; font-weight:500; margin-left:2mm; }
.intro { color:var(--mut); margin:0 0 3mm; }
/* Deckblatt */
.cover .kicker { text-transform:uppercase; letter-spacing:0.14em; font-weight:700; font-size:7.5pt; color:var(--acc); margin-top:2mm; }
.cover h1 { font-size:28pt; font-weight:800; line-height:1.05; margin:2mm 0 3mm; }
.cover h1 span { font-size:15pt; font-weight:600; color:var(--mut); }
.cover .lead { font-size:10pt; max-width:170mm; margin:0 0 2mm; }
.cover .stand { color:var(--mut); font-size:8pt; margin-bottom:4mm; }
.kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:3mm; margin-bottom:4mm; }
.kpi { border:1px solid var(--line); border-radius:3mm; padding:2.5mm 3mm; background:var(--soft); }
.kpi b { display:block; font-size:17pt; font-weight:800; line-height:1.1; }
.kpi span { color:var(--mut); font-size:7.6pt; }
.cols { display:grid; grid-template-columns:1fr 1fr; gap:3.5mm; margin-bottom:3.5mm; }
.box { border:1px solid var(--line); border-radius:3mm; padding:3mm 3.5mm; break-inside:avoid; }
.box h3 { font-size:10pt; font-weight:700; margin-bottom:1.5mm; }
.box ul { margin:0; padding-left:4.5mm; } .box li { margin-bottom:1mm; }
ol.top { list-style:none; margin:0; padding:0; } ol.top li { display:flex; gap:2.5mm; align-items:flex-start; margin-bottom:1.6mm; }
table.raster { border-collapse:collapse; width:100%; } table.raster td { padding:0.8mm 1.5mm; border-bottom:1px solid var(--line); vertical-align:top; }
.hint { color:var(--mut); font-size:7.6pt; margin:1.5mm 0 0; }
/* Score */
.score { display:inline-flex; align-items:center; justify-content:center; min-width:6.6mm; height:6.6mm; border-radius:50%; font-weight:800; font-size:7.5pt; color:#fff; flex:none; }
.s-top { background:#1f8a5b; } .s-gut { background:#2b7bb9; } .s-mittel { background:#c98a16; } .s-knapp { background:#c8553d; }
.pill { display:inline-block; padding:0.3mm 1.8mm; border-radius:3mm; font-size:7pt; font-weight:700; vertical-align:1px; border:1px solid transparent; }
.st-neu { background:#e3f5ec; color:#1b6e48; border-color:#bfe6d1; } .st-umbau { background:#e6eefb; color:#24508f; border-color:#c7d7f3; }
.st-schieb { background:#f0e9fb; color:#5b3a95; border-color:#ddcff4; } .st-neubau { background:#fdebe7; color:#a5361f; border-color:#f6cdc3; }
.st-alt { background:var(--soft); color:var(--mut); border-color:var(--line); } .st-a { background:#1b2333; color:#fff; }
/* Listen */
table.list { width:100%; border-collapse:collapse; font-size:8pt; }
table.list th { text-align:left; font-size:7.2pt; text-transform:uppercase; letter-spacing:0.05em; color:var(--mut); border-bottom:1.5px solid var(--ink); padding:1mm; }
table.list td { border-bottom:1px solid var(--line); padding:1.1mm 1mm; vertical-align:top; }
table.list tr { break-inside:avoid; } .nowrap { white-space:nowrap; }
/* Woche */
.woche { break-inside:avoid; margin-bottom:4mm; }
.woche h3 { font-size:10.5pt; font-weight:700; margin-bottom:0.6mm; } .woche h3 small { font-weight:500; margin-left:2mm; }
.termine { margin:0 0 1mm; color:var(--mut); font-size:7.6pt; }
table.wt { width:100%; border-collapse:collapse; table-layout:fixed; font-size:7.4pt; line-height:1.25; }
table.wt th { text-align:left; font-size:7pt; text-transform:uppercase; letter-spacing:0.05em; color:var(--mut); padding:0.8mm 1mm; border-bottom:1.5px solid var(--ink); }
table.wt td { border-bottom:1px solid var(--line); padding:0.9mm 1mm; vertical-align:top; }
.c-tag { width:14mm; font-weight:700; white-space:nowrap; }
.wz { display:flex; gap:1.4mm; align-items:flex-start; } .wz .score { min-width:5.4mm; height:5.4mm; font-size:6.6pt; }
.wz.prio-a { font-weight:700; } .wz small { font-weight:400; } .nr { color:var(--mut); font-weight:600; } .leer { color:#b9c0cb; }
/* Karten */
.card { border:1px solid var(--line); border-radius:2.5mm; padding:2.6mm 3.4mm 2.4mm; margin-bottom:3mm; break-inside:avoid; }
.card header { position:relative; padding-right:15mm; margin-bottom:1.5mm; }
.card .meta { font-size:7.3pt; color:var(--mut); font-weight:600; margin-bottom:0.5mm; }
.card h3 { font-size:10.8pt; font-weight:800; line-height:1.2; }
.big { position:absolute; right:0; top:0; width:12mm; height:12mm; border-radius:50%; color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.big b { font-size:11.5pt; line-height:1; } .big span { font-size:5.3pt; text-transform:uppercase; letter-spacing:0.08em; opacity:0.9; }
.hook { background:var(--soft); border-left:3px solid var(--acc); padding:1.4mm 2.6mm; font-size:9.6pt; font-weight:600; margin-bottom:1.2mm; }
.hook .lbl, .facts span { display:block; font-size:6.4pt; text-transform:uppercase; letter-spacing:0.07em; color:var(--mut); font-weight:700; margin-bottom:0.3mm; }
table.dl { width:100%; border-collapse:collapse; }
table.dl th { width:25mm; text-align:left; vertical-align:top; font-size:7.2pt; color:var(--mut); font-weight:700; padding:0.7mm 2mm 0.7mm 0; }
table.dl td { padding:0.7mm 0; vertical-align:top; border-top:1px solid #edf0f5; }
table.dl tr:first-child td { border-top:0; }
.bars { display:grid; grid-template-columns:repeat(5,1fr); gap:2mm; margin:0.3mm 0 0.6mm; }
.bar { display:flex; align-items:center; gap:1mm; font-size:6.8pt; } .bl { font-weight:800; width:2.5mm; }
.bt { flex:1; height:1.8mm; background:#e8ecf2; border-radius:1mm; overflow:hidden; } .bt i { display:block; height:100%; background:var(--acc); }
.bv { color:var(--mut); width:7mm; text-align:right; } .why { color:var(--ink); }
.facts { display:grid; grid-template-columns:1.15fr 1fr 1fr 1fr; gap:1.2mm 3mm; margin-top:1.4mm; padding-top:1.4mm; border-top:1.5px solid var(--line); }
.facts b { font-weight:600; font-size:7.8pt; } .facts .w2 { grid-column:span 2; } .facts .w4 { grid-column:1 / -1; }
.sw i { display:inline-block; width:2.8mm; height:2.8mm; border-radius:50%; vertical-align:-0.4mm; margin-right:1mm; border:0.3mm solid rgba(0,0,0,0.15); }
.sw em { font-style:normal; color:var(--mut); margin:0 1.5mm; font-size:7pt; }
`;

// ---------- Account 2 (@stelldirvor.pov), Aufruf mit --plan account2 ----------
const A2_KRIT = { N: ["Nachfrage-Signal", 30], T: ["Timing", 20], W: ["Wettbewerb DE", 15], P: ["Passung zum Format", 15], A: ["Aufwand (Baukasten)", 10], R: ["Risiko", 10] };
const A2_WOCHEN = [["2026-11-02", "2026-11-08", "Mo 02.–So 08.11."], ["2026-11-09", "2026-11-15", "Mo 09.–So 15.11."], ["2026-11-16", "2026-11-22", "Mo 16.–So 22.11."],
  ["2026-11-23", "2026-11-29", "Mo 23.–So 29.11."], ["2026-11-30", "2026-12-01", "Mo 30.11.–Di 01.12."]];
const a2Class = (s) => { s = Number(s); return s >= 85 ? "s-top" : s >= 80 ? "s-gut" : s >= 75 ? "s-mittel" : "s-knapp"; };
const a2Badge = (s) => `<span class="score ${a2Class(s)}">${esc(s)}</span>`;
function a2Teile(begr) {
  const m = begr.match(/^N(\d) T(\d) W(\d) P(\d) A(\d) R(\d)\s*·\s*(.*)$/);
  return m ? { sub: { N: +m[1], T: +m[2], W: +m[3], P: +m[4], A: +m[5], R: +m[6] }, text: m[7] } : { sub: null, text: begr };
}
const a2Slot = (r) => r.datum === "reserve" ? "Reserve" : `${r.slot === "mittag" ? "Mittag" : "Abend"} · ${r.uhrzeit}`;
const a2Prio = { A: "A · bleibt fix", B: "B · darf 1–3 Tage rutschen", C: "C · darf entfallen bzw. durch Reserve ersetzt werden" };

function htmlAccount2() {
  const haupt = rows.filter((r) => r.datum !== "reserve");
  const reserve = rows.filter((r) => r.datum === "reserve");
  const sc = haupt.map((r) => Number(r.score));
  const avg2 = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1).replace(".", ",");
  const top = [...haupt].filter((r) => !r.status.startsWith("Produktion")).sort((a, b) => b.score - a.score || a.nr - b.nr).slice(0, 5);
  const orte = {};
  haupt.forEach((r) => { (orte[r.ort] ||= []).push(r); });
  const felder = {};
  haupt.forEach((r) => { felder[r.themenfeld] = (felder[r.themenfeld] || 0) + 1; });
  const erstbau = haupt.filter((r) => r.aufwand.includes("Erstbau")).length;

  const deck = `
<section class="cover">
  <div class="kicker">Stell dir vor … · @stelldirvor.pov · Content-Plan</div>
  <h1>30-Tage-Plan<br><span>02. November – 01. Dezember 2026</span></h1>
  <p class="lead">„Was wäre, wenn …“ als 3D-POV in Du-Perspektive an deutschen Alltagsorten. Pro Video: Szenario, eigene Rechnung, Hook, Denkfalle, zwei Wendungen, Ergebniszahl, Quellen, Konkurrenz-Check, Score und Caption.</p>
  <div class="stand">Planstand: ${esc(PLANSTAND)}<br>PDF erzeugt am ${esc(erzeugt)} aus <code>data/plan/account2-30-tage.csv</code> · Text: <code>docs/17-account2-30-tage-plan.md</code></div>
  <div class="kpis">
    <div class="kpi"><b>${haupt.length}</b><span>Videos (2 pro Tag)<br>+ ${reserve.length} Reservethemen</span></div>
    <div class="kpi"><b>${avg2}</b><span>Ø Trend-Score<br>min. ${Math.min(...sc)}, max. ${Math.max(...sc)}</span></div>
    <div class="kpi"><b>${Object.keys(orte).length}</b><span>Orte im Baukasten<br>${erstbau} Erstbauten</span></div>
    <div class="kpi"><b>${Object.keys(felder).length}</b><span>Themenfelder<br>im Wechsel</span></div>
  </div>
  <div class="cols">
    <div class="box">
      <h3>Kurzüberblick</h3>
      <ul>
        <li>2 Videos pro Tag: Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30 (Europe/Berlin), Startwerte, nach 14 Tagen mit eigenen Daten nachjustieren.</li>
        <li>Produktion nur auf Startsignal, in der Reihenfolge dieses Plans. Fällt ein Slot aus, rutscht die Liste nach; C-Videos dürfen entfallen oder durch Reserve ersetzt werden.</li>
        <li>Jedes Video beginnt mit „Stell dir vor, …“, spielt an einem erkennbaren deutschen Ort, rechnet selbst und hat zwei Wendungen. Länge 61–75 s, Stimme Otto (Eleven v4).</li>
        <li>Gesperrt: US-Themen (Elektronen, Protonen, Sauerstoff, Wasser), Maßstab §9, Klassiker ohne eigenen Ansatz. Gleicher Ort frühestens nach 2 freien Tagen, nie dasselbe Themenfeld zweimal hintereinander.</li>
        <li><b>Vorläufig</b> (ändert sich nach der Kalibrierung mit den Konkurrenzvideos): Spalte <code>look_vorlaeufig</code> und davon abhängig <code>aufwand</code>; Uhrzeiten nach 14 Tagen. Themen, Rechnungen und Reihenfolge sind tragfähig.</li>
      </ul>
    </div>
    <div class="box">
      <h3>Die 5 stärksten Videos (S)</h3>
      <ol class="top">${top.map((r) => `<li>${a2Badge(r.score)}<span><b>${esc(r.titel)}</b><br><small>${esc(tag(r.datum))} · ${esc(a2Slot(r))} · ${esc(r.ort)}</small></span></li>`).join("")}</ol>
    </div>
  </div>
  <div class="cols">
    <div class="box">
      <h3>Trend-Score (docs/07, tools/trend_score.py)</h3>
      <table class="raster">${Object.entries(A2_KRIT).map(([k, [n, g]]) => `<tr><td><b>${k}</b></td><td>${esc(n)}</td><td>${g} %</td></tr>`).join("")}</table>
      <p class="hint">Je 1–5 Punkte, Score = Σ(Gewicht × Punkte)/5. Ab 70 vorschlagen. Farben: <span class="score s-top">85+</span> <span class="score s-gut">80+</span> <span class="score s-mittel">75+</span> <span class="score s-knapp">&lt;75</span></p>
    </div>
    <div class="box">
      <h3>Legende</h3>
      <table class="raster">
        <tr><td><b>(F)</b></td><td>belegter Fakt mit Quelle</td></tr>
        <tr><td><b>(S)</b></td><td>Schätzung</td></tr>
        <tr><td><b>(A)</b></td><td>Annahme</td></tr>
        <tr><td><b>prüfen</b></td><td>Quelle bzw. Zahl vor der Produktion klären</td></tr>
        <tr><td><b>vorläufig</b></td><td>Look und Aufwand, bis das Format kalibriert ist</td></tr>
      </table>
      <p class="hint">Aufwand: 3 = ca. 3 Std. (Ort vorhanden), 4 = ca. 5 Std. (Erstbau eines Orts, plus Ortbau laut docs/17) aktive Agentenarbeit (S).</p>
    </div>
  </div>
</section>`;

  const cell = (r) => r ? `<div class="wz ${r.prioritaet === "A" ? "prio-a" : ""}">${a2Badge(r.score)}<div><span class="nr">#${r.nr}</span> ${esc(r.titel)}<br><small>${esc(r.ort.replace(/ \(.*\)$/, ""))} · ${esc(r.themenfeld)}${r.aufwand.includes("Erstbau") ? " · Erstbau" : ""}</small></div></div>` : `<span class="leer">–</span>`;
  let wochen = `<section class="page"><h2>Wochenübersicht</h2><p class="intro">Fett = Priorität A. Die Zahl im Kreis ist der Trend-Score; darunter Ort, Themenfeld und ob der Ort neu gebaut wird.</p>`;
  for (const [von, bis, label] of A2_WOCHEN) {
    const wr = haupt.filter((r) => r.datum >= von && r.datum <= bis);
    const tage = [...new Set(wr.map((r) => r.datum))];
    wochen += `<div class="woche"><h3>Woche · ${label} <small>${wr.length} Videos</small></h3>
      <table class="wt"><thead><tr><th class="c-tag">Tag</th><th>Mittag (12:30 bzw. Sa/So 09:30)</th><th>Abend 19:30</th></tr></thead><tbody>
      ${tage.map((d) => { const by = Object.fromEntries(wr.filter((r) => r.datum === d).map((r) => [r.slot, r])); return `<tr><td class="c-tag">${esc(tag(d))}</td><td>${cell(by.mittag)}</td><td>${cell(by.abend)}</td></tr>`; }).join("")}
      </tbody></table></div>`;
  }
  wochen += `</section>`;

  const ortTab = `<section class="page"><h2>Orte und Baukasten</h2><p class="intro">Jeder Ort wird einmal gebaut und dann mehrfach genutzt. Gleicher Ort frühestens nach 2 freien Tagen. Küche, Bad und Wohnzimmer teilen sich den Baukasten „Wohnung“, Weihnachtsmarkt baut auf der Altstadt auf.</p>
  <table class="list"><thead><tr><th>Ort</th><th>Erstbau</th><th>Einsätze</th><th>Themen</th></tr></thead><tbody>
  ${Object.entries(orte).sort((a, b) => b[1].length - a[1].length).map(([o, rs]) => `<tr><td><b>${esc(o)}</b></td><td class="nowrap">${esc(tag(rs[0].datum))}</td><td>${rs.length}</td><td>${rs.map((r) => `#${r.nr} ${esc(r.titel)}`).join("<br>")}</td></tr>`).join("")}
  </tbody></table>
  <h2 style="margin-top:5mm">Themenfelder</h2>
  <table class="list"><thead><tr><th>Themenfeld</th><th>Videos</th></tr></thead><tbody>${Object.entries(felder).sort((a, b) => b[1] - a[1]).map(([f, n]) => `<tr><td>${esc(f)}</td><td>${n}</td></tr>`).join("")}</tbody></table>
  </section>`;

  const karte2 = (r) => {
    const { sub, text } = a2Teile(r.score_begruendung);
    const bars = sub ? Object.keys(A2_KRIT).map((k) => `<div class="bar"><span class="bl">${k}</span><span class="bt"><i style="width:${20 * sub[k]}%"></i></span><span class="bv">${sub[k]}/5</span></div>`).join("") : "";
    const meta = r.datum === "reserve" ? `Reserve ${esc(r.nr - haupt.length)}` : `#${r.nr} · ${esc(tag(r.datum))} 2026 · ${esc(a2Slot(r))}`;
    return `
<article class="card">
  <header>
    <div class="meta">${meta} ${r.prioritaet === "A" ? pill("Priorität A", "st-a") : ""} ${r.aufwand.includes("Erstbau") ? pill("Erstbau Ort", "st-neubau") : ""}</div>
    <h3>${esc(r.titel)}</h3>
    <div class="big ${a2Class(r.score)}"><b>${esc(r.score)}</b><span>Score</span></div>
  </header>
  <div class="hook"><span class="lbl">Hook (Sprechtext, 0–5 s)</span>„${esc(r.hook)}“</div>
  <table class="dl">
    <tr><th>Szenario</th><td>${esc(r.szenario)}</td></tr>
    <tr><th>Denkfalle</th><td>${esc(r.denkfalle)}</td></tr>
    <tr><th>Wendung 1<br><small>18–25 s</small></th><td>${esc(r.wendung_1)}</td></tr>
    <tr><th>Wendung 2 und zweite Überraschung</th><td>${esc(r.wendung_2)}</td></tr>
    <tr><th>Ergebnis</th><td><b>${esc(r.ergebnis_zahl)}</b></td></tr>
    <tr><th>Rechnung</th><td>${esc(r.kernrechnung_bzw_twist)}</td></tr>
    <tr><th>Quellen prüfen</th><td>${esc(r.quellen_pruefen)}</td></tr>
    <tr><th>Konkurrenz-Check</th><td>${esc(r.konkurrenz_check)}</td></tr>
    <tr><th>Trend-Score</th><td><div class="bars bars6">${bars}</div><div class="why">${esc(text)}</div></td></tr>
    <tr><th>Caption</th><td>${esc(r.caption_vorschlag)}</td></tr>
  </table>
  <div class="facts">
    <div><span>Themenfeld</span><b>${esc(r.themenfeld)}</b></div>
    <div class="w2"><span>Ort</span><b>${esc(r.ort)}</b></div>
    <div><span>Priorität</span><b>${esc(a2Prio[r.prioritaet] || r.prioritaet)}</b></div>
    <div class="w2"><span>Look (vorläufig)</span><b>${esc(r.look_vorlaeufig.replace(/ \(vorläufig.*\)$/, ""))}</b></div>
    <div class="w2"><span>Aufwand (vorläufig)</span><b>${esc(r.aufwand)}</b></div>
    <div class="w4"><span>Status</span><b>${esc(r.status)}</b></div>
  </div>
</article>`;
  };
  let karten2 = "";
  for (const [von, bis, label] of A2_WOCHEN) {
    const wr = haupt.filter((r) => r.datum >= von && r.datum <= bis);
    karten2 += `<section class="page cards"><h2>Woche · ${label} <small>Videos #${wr[0].nr}–#${wr[wr.length - 1].nr}</small></h2>${wr.map(karte2).join("")}</section>`;
  }
  karten2 += `<section class="page cards"><h2>Reserve <small>${reserve.length} Themen für Ausfälle oder zusätzliche Slots</small></h2>${reserve.map(karte2).join("")}</section>`;

  const css2 = `.bars6 { grid-template-columns:repeat(6,1fr); } .cover .kicker { color:#7a3fc2; } .hook { border-left-color:#7a3fc2; } .bt i { background:#7a3fc2; }
.cards .card { font-size:7.2pt; line-height:1.25; padding:2mm 3mm 1.8mm; margin-bottom:2.4mm; }
.cards .card h3 { font-size:9.6pt; } .cards .card header { margin-bottom:1mm; }
.cards .hook { font-size:8.4pt; padding:1mm 2.2mm; margin-bottom:0.8mm; }
.cards table.dl th { width:20mm; font-size:6.8pt; padding:0.45mm 1.6mm 0.45mm 0; } .cards table.dl td { padding:0.45mm 0; }
.cards .facts { margin-top:0.8mm; padding-top:0.8mm; gap:0.6mm 3mm; } .cards .facts b { font-size:7.2pt; }
.cards .big { width:10.5mm; height:10.5mm; } .cards .big b { font-size:10.5pt; }`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>30-Tage-Plan Stell dir vor</title><style>${CSS}${css2}</style></head><body>
${deck}
${wochen}
${ortTab}
${karten2}
</body></html>`;
}

const html = A2 ? htmlAccount2() : `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>30-Tage-Plan Simulierbar</title><style>${CSS}</style></head><body>
${deckblatt()}
${aenderungen()}
${wochenuebersicht()}
${karten()}
</body></html>`;

// ---------- Drucken ----------
function loadPlaywright() {
  const req = createRequire(import.meta.url);
  for (const id of ["playwright", "playwright-core", path.join(ROOT, "pipeline", "node_modules", "playwright")]) {
    try { return req(id); } catch { /* nächster Versuch */ }
  }
  console.error("Playwright fehlt. Installieren: npm i -D playwright  und  npx playwright install chromium");
  process.exit(1);
}

const { chromium } = loadPlaywright();
const tmp = path.join(os.tmpdir(), `plan_pdf_${process.pid}.html`);
fs.writeFileSync(tmp, html);
if (OUT_HTML) fs.writeFileSync(OUT_HTML, html);
fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: OUT_PDF,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: true,
    headerTemplate: "<span></span>",
    footerTemplate: `<div style="width:100%;font-family:Arial,sans-serif;font-size:7.5px;color:#7a8494;padding:0 13mm;display:flex;justify-content:space-between;">
      <span>${A2 ? "@stelldirvor.pov · 30-Tage-Plan 02.11.–01.12.2026 · Planstand 01.11.2026" : "Simulierbar · 30-Tage-Plan November 2026 · Planstand 01.11.2026"}</span>
      <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
  });
} finally {
  await browser.close();
  fs.rmSync(tmp, { force: true });
}
console.log(`PDF geschrieben: ${path.relative(ROOT, OUT_PDF)} (${rows.length} ${A2 ? "Zeilen, davon " + rows.filter((r) => r.datum === "reserve").length + " Reserve" : "Videos"})`);
