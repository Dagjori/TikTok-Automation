#!/usr/bin/env node
// Erzeugt docs/plan/30-tage-plan.pdf aus data/plan/30-tage.csv (Simulierbar, Standard; Captions aus data/plan/simulierbar-plan.json, Uhrzeiten aus data/plan/posting_zeiten.json)
// bzw. mit --plan account2 docs/plan/account2-30-tage-plan.pdf aus data/plan/account2-30-tage.csv (@stelldirvor.pov, Spalten seit 02.11.2026).
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
  ? "02.11.2026, komplett neu nach Format docs/16 §12/§12a (keine Stimme, globale Gedankenexperimente); 2 Videos pro Tag"
  : "02.11.2026, komplett neu mit Geld-Schwerpunkt (jedes Video mit Euro-Ergebnis, nur neue Themen); Zeilen 31.10.–02.11. unverändert; 2 Videos pro Tag 03.11.–02.12.";

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
// Account 1: Uhrzeiten je Wochentag aus data/plan/posting_zeiten.json; Zeilen vor dem 03.11. ohne Uhrzeit (schon gepostet bzw. eingeplant)
const A1_ZEITEN = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, "data", "plan", "posting_zeiten.json"), "utf8")).kanaele.simulierbar; } catch { return null; } })();
function slotLabel(r) {
  if (r.datum === "reserve") return "Reserve";
  const name = { mittag: "Mittag", abend: "Abend", bonus: "Bonus" }[r.slot] || r.slot;
  if (r.datum < "2026-11-03" || !A1_ZEITEN) return name;
  const wt = dateOf(r.datum).getUTCDay();
  const z = (wt === 0 || wt === 6 ? A1_ZEITEN["sa-so"] : A1_ZEITEN["mo-fr"]) || {};
  return z[r.slot] ? `${name} · ${z[r.slot]}` : name;
}
const CAPTIONS = (() => { try { return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(ROOT, "data", "plan", "simulierbar-plan.json"), "utf8")).map((e) => [e.titel, e.caption_vorschlag])); } catch { return {}; } })();
const AUFWAND = { 1: "0,5 Std.", 2: "1,5 Std.", 3: "3 Std.", 4: "5 Std." };
const PRIO = { A: "A · bleibt fix", B: "B · darf 1–3 Tage rutschen", C: "C · darf entfallen" };
const MAX = { D: 30, K: 25, B: 20, L: 15, F: 10 };
const KRIT = { D: "Duell/Rennen mit Zählern", K: "kontraintuitiv mit Bedingung", B: "jeder kennt es", L: "trägt 65–80 s, 2 Wendungen", F: "frei von Konkurrenz/Sperre" };

function scoreClass(s) { s = Number(s); return s >= 85 ? "s-top" : s >= 75 ? "s-gut" : s >= 65 ? "s-mittel" : "s-knapp"; }
function statusKind(st) {
  if (st.startsWith("Reserve")) return ["Reserve", "st-alt"];
  if (st.startsWith("gepostet") || st.startsWith("fertig")) return ["gepostet bzw. eingeplant", "st-alt"];
  if (st.includes("halb gebaut")) return ["halb gebaut", "st-neubau"];
  if (st.includes("übernommen")) return ["aus altem Plan", "st-umbau"];
  if (st.includes("neu 02.11.")) return ["neu (Geld)", "st-neu"];
  return ["geplant", "st-alt"];
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
const A1_WOCHEN = [["2026-11-03", "2026-11-08", "Di 03.–So 08.11."], ["2026-11-09", "2026-11-15", "Mo 09.–So 15.11."], ["2026-11-16", "2026-11-22", "Mo 16.–So 22.11."],
  ["2026-11-23", "2026-11-29", "Mo 23.–So 29.11."], ["2026-11-30", "2026-12-02", "Mo 30.11.–Mi 02.12."]];
const A1_CSS = `.cards .card { font-size:7pt; line-height:1.22; padding:1.8mm 2.8mm 1.6mm; margin-bottom:2.2mm; }
.cards .card h3 { font-size:9.6pt; } .cards .card header { margin-bottom:0.8mm; }
.cards .hook { font-size:7.8pt; padding:0.9mm 2.2mm; margin-bottom:0.7mm; }
.cards table.dl th { width:21mm; font-size:6.5pt; padding:0.35mm 1.5mm 0.35mm 0; } .cards table.dl td { padding:0.35mm 0; }
.cards .bars { margin:0.2mm 0 0.3mm; } .cards .why { font-size:6.6pt; }
.cards .facts { margin-top:0.7mm; padding-top:0.7mm; gap:0.5mm 3mm; } .cards .facts b { font-size:6.9pt; }
.cards .big { width:10.5mm; height:10.5mm; } .cards .big b { font-size:10.5pt; }`;

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

// ---------- Inhalt (Account 1 Simulierbar, Planstand 02.11.2026: Geld-Schwerpunkt) ----------
const erzeugt = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function pill(text, cls) { return `<span class="pill ${cls}">${esc(text)}</span>`; }
function badge(s) { return `<span class="score ${scoreClass(s)}">${esc(s)}</span>`; }

// Konkurrenz-Sperrliste (öffentliche Embed-Listen und Videoseiten, 02.11.2026; Details docs/12 §3.4)
const A1_SPERRE = [
  ["Mieten oder kaufen", "@kontostand.vs 617k · @wissentogo_de 34k"],
  ["Leasen, finanzieren oder bar (inkl. 0-%-Falle)", "@wissentogo_de 363k"],
  ["Studium oder Ausbildung", "@kontostand.vs 359k · @wissentogo_de"],
  ["E-Auto oder Benziner", "@alltaginzahlen 198k"],
  ["Fenster auf oder Klimaanlage (Sprit)", "@kurzsimuliert 196k"],
  ["Spülmaschine oder Handspülen", "@kurzsimuliert 124k"],
  ["„So viel Geld ausgeben“ (Traumgeld)", "@mal.angenommen 879k"],
  ["Auto oder Flieger (mit Personen-Wendung)", "@wissentogo_de 57k"],
  ["Wärmepumpe oder Gasheizung", "@wissentogo_de 51k"],
  ["Heizung nachts aus", "@rechnetsichdas 22k · @alltagsduell"],
  ["Reifendruck, Tempo 130/160, Ganzjahresreifen", "@kurzsimuliert 15k · @alltaginzahlen 5k/4k"],
  ["Neuwagen oder Gebrauchter", "@geldsimuliert 3k · @wissentogo_de"],
  ["Früh anfangen zu sparen, Million, Inflation", "@geldsimuliert 0,5–2k"],
  ["Kind kostet bzw. Kindergeld bzw. kinderfrei", "@wissentogo_de · @alltagsformel · @kontostand.vs"],
  ["Tanken: Umweg und 12-Uhr-Regel, Trockner, LED, Abos", "@alltaginzahlen 1–1,5k · @alltagsformel"],
  ["Maßstab K1–K4 (Regen, Pausen, Tsunami, Duschen)", "docs/15 §9 · @kurzsimuliert bis 2,1 Mio."],
];
const A1_REGELN = [
  ["Keine Finanz-Betrugsmaschen, keine „get-rich-quick“-Versprechen, keine MLM", "Community Guidelines, Frauds and Scams (gültig seit 24.09.2026)"],
  ["Werbung für eigene Produkte oder bezahlte Inhalte kennzeichnen", "Community Guidelines, Commercial Disclosure"],
  ["Finanzdienstleistungen (Kredite, Karten, Versicherungen, Anlagen) als Branded Content nur 18+ und eingeschränkt", "Branded Content Policy (gültig seit 30.10.2026)"],
  ["Irreführende Inhalte mit möglichem Schaden fliegen aus dem Für-dich-Feed", "Community Guidelines, Misinformation und FYF-Standards"],
  ["CRP: mindestens 1 Minute, original, keine Werbung, hohe Qualität", "Creator Rewards Program Terms EEA"],
];
const A1_TERMINE = [
  "Start Di 03.11. · Mittagessen (halb gebaut) · Erstbau Isometrisch (Stil 2) und Karte (Stil 8) für Sa 07.11.",
  "Singles Day Mi 11.11. · Erstbau Holzspielzeug (Stil 9) für Do 12.11. und Filz (Stil 11) für So 15.11.",
  "Erstbau Papier-Diorama (Stil 10) für Mo 16.11. · GTA-6-Release Do 19.11. · Steuerklassen-Frist 30.11. (Video Fr 20.11.)",
  "Kfz-Stichtag 30.11. (Video Mo 23.11.) · Black Friday Fr 27.11. (Videos 24. und 27.11.) · Weihnachtsgeld-Zeit · Monatsende · 1. Advent So 29.11.",
  "Cyber Monday 30.11. · Wichteln · Jahresende-Steuer (01.12.) · Sparvorsätze 2027 (02.12.)",
];

function htmlAccount1() {
  const alt = rows.filter((r) => r.datum !== "reserve" && r.datum < "2026-11-03");
  const neu = rows.filter((r) => r.datum !== "reserve" && r.datum >= "2026-11-03");
  const reserve = rows.filter((r) => r.datum === "reserve");
  neu.forEach((r, i) => (r.pn = `#${i + 1}`));
  reserve.forEach((r, i) => (r.pn = `R${i + 1}`));
  const sc = neu.map((r) => Number(r.massstab_score));
  const avg = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1).replace(".", ",");
  const geld = neu.filter((r) => r.rubrik === "GELD").length;
  const stile = new Set(neu.map((r) => r.stil.split(" ")[0]));
  const erstbau = neu.filter((r) => /Erstbau/.test(r.vorlage)).length;
  const top5 = [...neu].sort((a, b) => b.massstab_score - a.massstab_score || a.nr - b.nr).slice(0, 5);
  const avg10 = (neu.slice(0, 20).reduce((s, r) => s + Number(r.massstab_score), 0) / 20).toFixed(1).replace(".", ",");

  const deck = `
<section class="cover">
  <div class="kicker">Simulierbar · Content-Plan · Schwerpunkt Geld</div>
  <h1>30-Tage-Plan<br><span>03. November – 02. Dezember 2026</span></h1>
  <p class="lead">Jedes Video ist ein Duell zweier echter Alternativen derselben Entscheidung und endet mit einem Ergebnis in Euro auf der Anzeigetafel. Nur neue Themen: Was ein Konkurrent schon viral gemacht hat, ist gesperrt. Pro Video: Hook, Denkfalle, zwei Wendungen, Stil, Teamfarben, Rechnung, Quellen, Konkurrenz-Check, Caption und Maßstab-Score.</p>
  <div class="stand">Planstand: ${esc(PLANSTAND)}<br>PDF erzeugt am ${esc(erzeugt)} aus <code>data/plan/30-tage.csv</code> · Text: <code>docs/12-30-tage-plan.md</code> · Captions: <code>data/plan/simulierbar-plan.json</code></div>
  <div class="kpis">
    <div class="kpi"><b>${neu.length}</b><span>Videos (2 pro Tag)<br>+ ${reserve.length} Reservethemen</span></div>
    <div class="kpi"><b>${avg}</b><span>Ø Maßstab-Score (S)<br>min. ${Math.min(...sc)}, max. ${Math.max(...sc)}, erste 10 Tage ${avg10}</span></div>
    <div class="kpi"><b>${geld} / ${neu.length - geld}</b><span>GELD / ALLTAG<br>alle mit Euro-Ergebnis</span></div>
    <div class="kpi"><b>${stile.size}</b><span>Stile im Einsatz<br>${erstbau} Erstbauten, nie 2× hintereinander</span></div>
  </div>
  <div class="cols">
    <div class="box">
      <h3>Kurzüberblick</h3>
      <ul>
        <li>2 Videos pro Tag: Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30 (Europe/Berlin). Produktion am Vortag, nach Prüfung plant Claude in Buffer ein.</li>
        <li>Die Zeilen vom 31.10. bis 02.11. bleiben unverändert (gepostet bzw. eingeplant). Ab 03.11. ist alles neu.</li>
        <li>Was bei der Konkurrenz zieht: große Lebensentscheidungen mit großer Endzahl (bis 617k Aufrufe). Kleine Spartipps bleiben meist unter 5k. Deshalb liegen Gehalt, Rente, Wohnen und Auto in den ersten 10 Tagen.</li>
        <li>Finanzthemen nur als Modellrechnung: keine Produkte, Banken, Coins oder Aktien, kein Kaufaufruf, kein „schnell reich“. Zahlen für 2026 mit (F), (S), (A); Unklares steht unter „prüfen“.</li>
        <li>Jedes Video: Hook in 5 s, „Klar … Oder?“ vor Sekunde 16, kein „Los geht's“, erste Wendung bei 18–25 s, Folgen-Aufruf bei ca. 20 s, genauer Schluss, letztes Bild = erstes Bild.</li>
      </ul>
    </div>
    <div class="box">
      <h3>Die 5 stärksten Videos (S)</h3>
      <ol class="top">${top5.map((r) => `<li>${badge(r.massstab_score)}<span><b>${esc(r.titel)}</b><br><small>${esc(tag(r.datum))} · ${esc(slotLabel(r))} · ${esc(r.rubrik)}</small></span></li>`).join("")}</ol>
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
        <tr><td><b>Rechnung</b></td><td>eigene Rechnung, z. B. Netto-Modul PAP 2026</td></tr>
        <tr><td><b>prüfen</b></td><td>Zahl bzw. Rechtsstand vor der Produktion klären</td></tr>
      </table>
      <p class="hint">Aufwand: 2 = 1,5 Std., 3 = 3 Std., 4 = 5 Std. aktive Agentenarbeit (S); Erstbau eines Stils zusätzlich 3–8 Std.</p>
    </div>
  </div>
</section>`;

  const aend = `
<section class="page">
  <h2>Was sich am 02.11. geändert hat</h2>
  <p class="intro">Auftrag des Inhabers: klarer Schwerpunkt Geld, Konkurrenz ansehen, nur neue Ideen, kompletter Plan neu, heutige Videos bleiben. Von 64 offenen Themen des alten Plans sind 10 übernommen, 5 zu neuen Geld-Fragen umgebaut und 6 in der Reserve; 43 sind raus, meist ohne Euro-Ergebnis oder bei der Konkurrenz schon gelaufen (Gründe in docs/12 §3.5).</p>
  <div class="cols">
    <div class="box"><h3>Bleibt unverändert (31.10.–02.11.)</h3>
      <table class="raster">${alt.map((r) => `<tr><td class="nowrap">${esc(tag(r.datum))}</td><td>${esc(r.titel)}</td><td>${badge(r.massstab_score)}</td></tr>`).join("")}</table></div>
    <div class="box"><h3>TikTok-Regeln für Geld-Inhalte (F)</h3>
      <table class="raster">${A1_REGELN.map(([a, b]) => `<tr><td>${esc(a)}</td><td><small>${esc(b)}</small></td></tr>`).join("")}</table>
      <p class="hint">Folge für uns: keine Krypto-, Aktien-, Lotto- oder Wett-Themen, keine Anbieter, keine Kreditwerbung, Zahlen sauber belegt.</p></div>
  </div>
  <div class="box"><h3>Konkurrenz-Sperrliste (öffentliche Aufrufzahlen, 02.11.)</h3>
    <table class="list"><thead><tr><th>Gesperrtes Thema</th><th>Konto und Aufrufe</th></tr></thead><tbody>${A1_SPERRE.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>
    <p class="hint">Geprüft: 14 deutsche Geld- und Simulationskonten über die öffentlichen Profil-Embeds und Videoseiten, dazu US-Konten als Ideenquelle. Der Trend-Radar prüft am Vortag jeder Produktion erneut.</p></div>
</section>`;

  const cell = (r) => r ? `<div class="wz ${r.prioritaet === "A" ? "prio-a" : ""}">${badge(r.massstab_score)}<div><span class="nr">${esc(r.pn)}</span> ${esc(r.titel)}<br><small>${esc(r.rubrik)} · Stil ${esc(r.stil)}${/Erstbau/.test(r.vorlage) ? " · Erstbau" : ""}</small></div></div>` : `<span class="leer">–</span>`;
  let wochen = `<section class="page"><h2>Wochenübersicht</h2><p class="intro">Fett = Priorität A (Termin oder Top-Thema). Die Zahl im Kreis ist der Maßstab-Score, darunter Rubrik (intern) und Stil.</p>`;
  A1_WOCHEN.forEach(([von, bis, label], i) => {
    const wr = neu.filter((r) => r.datum >= von && r.datum <= bis);
    const tage = [...new Set(wr.map((r) => r.datum))];
    wochen += `<div class="woche"><h3>Woche ${i + 1} · ${label} <small>${wr.length} Videos</small></h3>
      <p class="termine">${esc(A1_TERMINE[i])}</p>
      <table class="wt"><thead><tr><th class="c-tag">Tag</th><th>Mittag (12:30, Sa/So 09:30)</th><th>Abend 19:30</th></tr></thead><tbody>
      ${tage.map((d) => { const by = Object.fromEntries(wr.filter((r) => r.datum === d).map((r) => [r.slot, r])); return `<tr><td class="c-tag">${esc(tag(d))}</td><td>${cell(by.mittag)}</td><td>${cell(by.abend)}</td></tr>`; }).join("")}
      </tbody></table></div>`;
  });
  wochen += `</section>`;

  let kartenHtml = "";
  A1_WOCHEN.forEach(([von, bis, label], i) => {
    const wr = neu.filter((r) => r.datum >= von && r.datum <= bis);
    kartenHtml += `<section class="page cards"><h2>Woche ${i + 1} · ${label} <small>Videos ${wr[0].pn}–${wr[wr.length - 1].pn}</small></h2>${wr.map(karte).join("")}</section>`;
  });
  kartenHtml += `<section class="page cards"><h2>Reserve <small>${reserve.length} Themen für Ausfälle oder freie Slots</small></h2>${reserve.map(karte).join("")}</section>`;

  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>30-Tage-Plan Simulierbar</title><style>${CSS}${A1_CSS}</style></head><body>
${deck}
${aend}
${wochen}
${kartenHtml}
</body></html>`;
}

function karte(r) {
  const { sub, text } = teile(r.massstab_begruendung);
  const [sk, sc] = statusKind(r.status);
  const fb = farben(r.teamfarben);
  const bars = sub ? Object.entries(MAX).map(([k, mx]) => `<div class="bar"><span class="bl">${k}</span><span class="bt"><i style="width:${(100 * sub[k]) / mx}%"></i></span><span class="bv">${sub[k]}/${mx}</span></div>`).join("") : "";
  const [stNr, ...stName] = r.stil.split(" ");
  const kc = r.konkurrenz_check.replace(/^Embed-Listen und Videoseiten 02\.11\. \([^)]*\):\s*/, "");
  const cap = CAPTIONS[r.titel];
  const meta = r.datum === "reserve" ? `${r.pn} · Reserve` : `${r.pn} · ${tag(r.datum)} 2026 · ${slotLabel(r)}`;
  return `
<article class="card">
  <header>
    <div class="meta">${esc(meta)} · ${esc(r.rubrik)} ${r.prioritaet === "A" && r.datum !== "reserve" ? pill("Priorität A", "st-a") : ""} ${pill(sk, sc)}</div>
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
    <tr><th>Konkurrenz und Logik</th><td>${esc(kc)} <small>(Check 02.11.)</small></td></tr>
    <tr><th>Maßstab</th><td><div class="bars">${bars}</div><div class="why">${esc(text)}</div></td></tr>
    ${cap ? `<tr><th>Caption</th><td>${esc(cap)}</td></tr>` : ""}
  </table>
  <div class="facts">
    <div><span>Stil</span><b>${esc(stNr)} · ${esc(stName.join(" "))}</b></div>
    <div class="w2"><span>Teamfarben</span><b class="sw">${fb.map((f) => `<i style="background:${f.hex}"></i>${esc(f.name)} <small>(${esc(f.rolle)})</small>`).join("<em>vs</em>") || esc(r.teamfarben)}</b></div>
    <div><span>Aufwand</span><b>${esc(r.aufwand)} · ${esc(AUFWAND[r.aufwand] || "")}</b></div>
    <div class="w2"><span>Vorlage und Baukasten</span><b>${esc(r.vorlage)}</b></div>
    <div><span>Priorität</span><b>${esc(PRIO[r.prioritaet] || r.prioritaet)}</b></div>
    <div><span>Rubrik (intern)</span><b>${esc(r.rubrik)}</b></div>
    <div class="w4"><span>Status</span><b>${esc(r.status)}</b></div>
  </div>
</article>`;
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
// Spalten seit 02.11.2026 (Format docs/16 §12/§12a): datum, slot, uhrzeit, titel, themenfeld, standpunkt, welt, ereignis,
// zeitraffer, messwert_etiketten, hoehepunkt, pointe, beats, faktenzeile, kernrechnung, quellen_pruefen, score,
// score_begruendung, konkurrenz_check, caption_vorschlag, aufwand, status
const A2_KRIT = { N: ["Nachfrage-Signal", 30], T: ["Timing", 20], W: ["Wettbewerb", 15], P: ["Passung zum Format", 15], A: ["Aufwand (Baukasten)", 10], R: ["Risiko", 10] };
const A2_WOCHEN = [["2026-11-03", "2026-11-08", "Di 03.–So 08.11."], ["2026-11-09", "2026-11-15", "Mo 09.–So 15.11."], ["2026-11-16", "2026-11-22", "Mo 16.–So 22.11."],
  ["2026-11-23", "2026-11-29", "Mo 23.–So 29.11."], ["2026-11-30", "2026-12-02", "Mo 30.11.–Mi 02.12."]];
const a2Class = (s) => { s = Number(s); return s >= 86 ? "s-top" : s >= 83 ? "s-gut" : s >= 79 ? "s-mittel" : "s-knapp"; };
const a2Badge = (s) => `<span class="score ${a2Class(s)}">${esc(s)}</span>`;
function a2Teile(begr) {
  const m = begr.match(/^N(\d) T(\d) W(\d) P(\d) A(\d) R(\d)\s*·\s*(.*)$/);
  return m ? { sub: { N: +m[1], T: +m[2], W: +m[3], P: +m[4], A: +m[5], R: +m[6] }, text: m[7] } : { sub: null, text: begr };
}
const a2Slot = (r) => r.datum === "reserve" ? "Reserve" : `${r.slot === "mittag" ? "Mittag" : "Abend"} · ${r.uhrzeit}`;
const a2Ort = (r) => r.standpunkt.split(/[;(]/)[0].trim();
const a2Erstbau = (r) => /Erstbau/.test(r.aufwand);

function htmlAccount2() {
  const haupt = rows.filter((r) => r.datum !== "reserve");
  const reserve = rows.filter((r) => r.datum === "reserve");
  const sc = haupt.map((r) => Number(r.score));
  const avg2 = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1).replace(".", ",");
  const top = [...haupt].sort((a, b) => b.score - a.score || a.nr - b.nr).slice(0, 5);
  const welten = {}, felder = {};
  haupt.forEach((r) => { (welten[r.welt] ||= []).push(r); (felder[r.themenfeld] ||= []).push(r); });
  const erstbau = haupt.filter(a2Erstbau).length;

  const deck = `
<section class="cover">
  <div class="kicker">Stell dir vor … · @stelldirvor.pov · Content-Plan</div>
  <h1>30-Tage-Plan<br><span>03. November – 02. Dezember 2026</span></h1>
  <p class="lead">Große, globale Gedankenexperimente aus Physik, Mathematik, Biologie, Chemie, Astronomie, Geologie und Klima, strikt im Format der Referenzvideos (docs/16 §12): 80 s, keine Stimme, feste Ich-Perspektive von einem erhöhten Standpunkt, Messwert-Anzeige bis „HIER“, schwarzer Abspann mit Faktenzeile.</p>
  <div class="stand">Planstand: ${esc(PLANSTAND)}<br>PDF erzeugt am ${esc(erzeugt)} aus <code>data/plan/account2-30-tage.csv</code> · Text: <code>docs/17-account2-30-tage-plan.md</code> · Sätze der ersten 8 Videos: <code>data/plan/account2-plan.json</code></div>
  <div class="kpis">
    <div class="kpi"><b>${haupt.length}</b><span>Videos (2 pro Tag)<br>+ ${reserve.length} Reservethemen</span></div>
    <div class="kpi"><b>${avg2}</b><span>Ø Trend-Score<br>min. ${Math.min(...sc)}, max. ${Math.max(...sc)}</span></div>
    <div class="kpi"><b>${Object.keys(welten).length}</b><span>Grundwelten im Baukasten<br>${erstbau} Erstbauten</span></div>
    <div class="kpi"><b>${Object.keys(felder).length}</b><span>Themenfelder<br>nie zweimal hintereinander</span></div>
  </div>
  <div class="cols">
    <div class="box">
      <h3>Kurzüberblick</h3>
      <ul>
        <li>2 Videos pro Tag: Mo–Fr 12:30 und 19:30, Sa–So 09:30 und 19:30 (Europe/Berlin). Produktion jeweils am Vortag, 2 Videos dieses Accounts pro Tag.</li>
        <li>Jedes Video: ein Ereignis, das man von einem festen Standpunkt aus wachsen sieht; Anzeige mit 2–4 Etiketten, Höhepunkt „HIER“ bei 55–62 s, Pointe gegen eine Denkfalle, Faktenzeile mit echtem Bezug.</li>
        <li>Die drei Beispiele des Inhabers laufen in den ersten 3 Tagen (Eiszeit, Sonne 1 m pro Jahr, alles automatisiert).</li>
        <li>Regeln: an keinem Tag gleiche Welt, gleiches Feld oder gleiches Ende; gleiche Grundwelt nie an Folgetagen; Nachthimmel-Enden nur abends; ähnliche Themen mit Mindestabstand (docs/17 §3).</li>
        <li>Gesperrt: Themen von Lunar Animations und der US-Konten (Liste docs/17 §3.5), kein „5 Sekunden“, keine Alltagsthemen.</li>
      </ul>
    </div>
    <div class="box">
      <h3>Die 5 stärksten Videos (S)</h3>
      <ol class="top">${top.map((r) => `<li>${a2Badge(r.score)}<span><b>${esc(r.titel)}</b><br><small>${esc(tag(r.datum))} · ${esc(a2Slot(r))} · ${esc(r.themenfeld)} · ${esc(a2Ort(r))}</small></span></li>`).join("")}</ol>
    </div>
  </div>
  <div class="cols">
    <div class="box">
      <h3>Trend-Score (docs/07, tools/trend_score.py)</h3>
      <table class="raster">${Object.entries(A2_KRIT).map(([k, [n, g]]) => `<tr><td><b>${k}</b></td><td>${esc(n)}</td><td>${g} %</td></tr>`).join("")}</table>
      <p class="hint">Je 1–5 Punkte, Score = Σ(Gewicht × Punkte) ÷ 5. Ab 70 vorschlagen. Farben: <span class="score s-top">86+</span> <span class="score s-gut">83+</span> <span class="score s-mittel">79+</span> <span class="score s-knapp">&lt;79</span></p>
    </div>
    <div class="box">
      <h3>Legende</h3>
      <table class="raster">
        <tr><td><b>(F)</b></td><td>belegter Fakt mit Quelle</td></tr>
        <tr><td><b>(S)</b></td><td>Schätzung</td></tr>
        <tr><td><b>(A)</b></td><td>Annahme</td></tr>
        <tr><td><b>Rechnung</b></td><td>eigene Rechnung aus belegten Werten</td></tr>
        <tr><td><b>prüfen</b></td><td>Zahl bzw. Quelle vor der Produktion klären</td></tr>
      </table>
      <p class="hint">Aufwand: 2 = ca. 1,5 Std., 3 = ca. 3 Std., 4 = ca. 5 Std. aktive Agentenarbeit (S); Erstbau einer Grundwelt zusätzlich Baukasten-Zeit.</p>
    </div>
  </div>
</section>`;

  const cell = (r) => r ? `<div class="wz">${a2Badge(r.score)}<div><span class="nr">#${r.nr}</span> ${esc(r.titel)}<br><small>${esc(r.welt)} · ${esc(r.themenfeld)}${a2Erstbau(r) ? " · Erstbau" : ""}</small></div></div>` : `<span class="leer">–</span>`;
  let wochen = `<section class="page"><h2>Wochenübersicht</h2><p class="intro">Die Zahl im Kreis ist der Trend-Score; darunter Grundwelt, Themenfeld und ob eine Grundwelt bzw. Variante neu gebaut wird.</p>`;
  for (const [von, bis, label] of A2_WOCHEN) {
    const wr = haupt.filter((r) => r.datum >= von && r.datum <= bis);
    const tage = [...new Set(wr.map((r) => r.datum))];
    wochen += `<div class="woche"><h3>Woche · ${label} <small>${wr.length} Videos</small></h3>
      <table class="wt"><thead><tr><th class="c-tag">Tag</th><th>Mittag (12:30 bzw. Sa/So 09:30)</th><th>Abend 19:30</th></tr></thead><tbody>
      ${tage.map((d) => { const by = Object.fromEntries(wr.filter((r) => r.datum === d).map((r) => [r.slot, r])); return `<tr><td class="c-tag">${esc(tag(d))}</td><td>${cell(by.mittag)}</td><td>${cell(by.abend)}</td></tr>`; }).join("")}
      </tbody></table></div>`;
  }
  wochen += `</section>`;

  const weltTab = `<section class="page"><h2>Grundwelten und Baukasten</h2><p class="intro">Sechs Grundwelten werden in den ersten 4 Tagen gebaut und danach wiederverwendet (Gelände, Wasser, Himmel, Licht, Vordergrund-Geländer, Partikel). Gleiche Grundwelt nie an zwei aufeinanderfolgenden Tagen.</p>
  <table class="list"><thead><tr><th>Grundwelt</th><th>Erstbau</th><th>Einsätze</th><th>Videos (Standpunkt)</th></tr></thead><tbody>
  ${Object.entries(welten).sort((a, b) => b[1].length - a[1].length).map(([w, rs]) => `<tr><td><b>${esc(w)}</b></td><td class="nowrap">${esc(tag(rs[0].datum))}</td><td>${rs.length}</td><td>${rs.map((r) => `#${r.nr} ${esc(r.titel)} <small>(${esc(a2Ort(r))})</small>`).join("<br>")}</td></tr>`).join("")}
  </tbody></table>
  <h2 style="margin-top:5mm">Themenfelder</h2>
  <table class="list"><thead><tr><th>Themenfeld</th><th>Videos</th><th>Ø Score</th></tr></thead><tbody>${Object.entries(felder).sort((a, b) => b[1].length - a[1].length).map(([f, rs]) => `<tr><td>${esc(f)}</td><td>${rs.length}</td><td>${(rs.reduce((s, r) => s + Number(r.score), 0) / rs.length).toFixed(1).replace(".", ",")}</td></tr>`).join("")}</tbody></table>
  </section>`;

  const karte2 = (r) => {
    const { sub, text } = a2Teile(r.score_begruendung);
    const bars = sub ? Object.keys(A2_KRIT).map((k) => `<div class="bar"><span class="bl">${k}</span><span class="bt"><i style="width:${20 * sub[k]}%"></i></span><span class="bv">${sub[k]}/5</span></div>`).join("") : "";
    const meta = r.datum === "reserve" ? `Reserve ${esc(r.nr - haupt.length)}` : `#${r.nr} · ${esc(tag(r.datum))} 2026 · ${esc(a2Slot(r))}`;
    return `
<article class="card">
  <header>
    <div class="meta">${meta} · ${esc(r.themenfeld)} · ${esc(r.welt)} ${a2Erstbau(r) ? pill("Erstbau", "st-neubau") : ""}</div>
    <h3>${esc(r.titel)}</h3>
    <div class="big ${a2Class(r.score)}"><b>${esc(r.score)}</b><span>Score</span></div>
  </header>
  <div class="hook"><span class="lbl">Pointe</span>${esc(r.pointe)}</div>
  <table class="dl">
    <tr><th>Standpunkt</th><td>${esc(r.standpunkt)}</td></tr>
    <tr><th>Ereignis</th><td>${esc(r.ereignis)}</td></tr>
    <tr><th>Zeitraffer</th><td>${esc(r.zeitraffer)}</td></tr>
    <tr><th>Anzeige</th><td><b>${esc(r.messwert_etiketten)}</b></td></tr>
    <tr><th>Ablauf</th><td>${esc(r.beats)}</td></tr>
    <tr><th>Höhepunkt</th><td>${esc(r.hoehepunkt)}</td></tr>
    <tr><th>Faktenzeile</th><td><b>${esc(r.faktenzeile)}</b></td></tr>
    <tr><th>Rechnung</th><td>${esc(r.kernrechnung)}</td></tr>
    <tr><th>Quellen prüfen</th><td>${esc(r.quellen_pruefen)}</td></tr>
    <tr><th>Konkurrenz-Check</th><td>${esc(r.konkurrenz_check)}</td></tr>
    <tr><th>Trend-Score</th><td><div class="bars bars6">${bars}</div><div class="why">${esc(text)}</div></td></tr>
    <tr><th>Caption</th><td>${esc(r.caption_vorschlag)}</td></tr>
  </table>
  <div class="facts">
    <div class="w4"><span>Aufwand</span><b>${esc(r.aufwand)}</b></div>
    <div><span>Status</span><b>${esc(r.status)}</b></div>
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
.cards .card { font-size:6.6pt; line-height:1.18; padding:1.6mm 2.6mm 1.4mm; margin-bottom:2mm; }
.cards .card h3 { font-size:9.2pt; } .cards .card header { margin-bottom:0.7mm; }
.cards .hook { font-size:7.2pt; font-weight:500; padding:0.8mm 2mm; margin-bottom:0.6mm; }
.cards table.dl th { width:18mm; font-size:6.3pt; padding:0.3mm 1.4mm 0.3mm 0; } .cards table.dl td { padding:0.3mm 0; }
.cards .bars { margin:0.2mm 0 0.3mm; } .cards .why { font-size:6.3pt; }
.cards .facts { margin-top:0.6mm; padding-top:0.6mm; gap:0.4mm 3mm; } .cards .facts b { font-size:6.6pt; }
.cards .big { width:10.5mm; height:10.5mm; } .cards .big b { font-size:10.5pt; }`;
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>30-Tage-Plan Stell dir vor</title><style>${CSS}${css2}</style></head><body>
${deck}
${wochen}
${weltTab}
${karten2}
</body></html>`;
}

const html = A2 ? htmlAccount2() : htmlAccount1();

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
      <span>${A2 ? "@stelldirvor.pov · 30-Tage-Plan 03.11.–02.12.2026 · Planstand 02.11.2026" : "Simulierbar · 30-Tage-Plan 03.11.–02.12.2026 · Schwerpunkt Geld · Planstand 02.11.2026"}</span>
      <span>Seite <span class="pageNumber"></span> von <span class="totalPages"></span></span></div>`,
  });
} finally {
  await browser.close();
  fs.rmSync(tmp, { force: true });
}
console.log(`PDF geschrieben: ${path.relative(ROOT, OUT_PDF)} (${rows.length} ${A2 ? "Zeilen, davon " + rows.filter((r) => r.datum === "reserve").length + " Reserve" : "Zeilen, davon " + rows.filter((r) => r.datum === "reserve").length + " Reserve"})`);
