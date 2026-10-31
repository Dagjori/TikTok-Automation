/**
 * Auswertung „Spurwechsel im Stau“ (nur Node, nutzt spurwechsel.mjs)
 *
 * Aufruf (aus dem Repo-Wurzelverzeichnis):
 *   node pipeline/sim/auswertung_spurwechsel.mjs                 (Standard: 100 Läufe, Sensitivität je 40 Läufe)
 *   LAEUFE=50 SENS_LAEUFE=20 node pipeline/sim/auswertung_spurwechsel.mjs
 *
 * Schreibt nach pipeline/projekte/spurwechsel/:
 *   sim_ergebnisse.json            Kennzahlen, Parameter, Methodik, Sensitivität, Auswahl der Animationsläufe
 *   trajektorien_rennen.json       1-Hz-Bahnen eines typischen Duells (Paul = Spurwechsler, Anna = Spurhalterin)
 *   trajektorien_wahrnehmung.json  1-Hz-Bahnen eines Beispiels aus dem Referenzlauf (niemand wechselt)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SpurSim, STANDARD_PARAMETER, ZELLE_M, kennzahlen, duelle } from "./spurwechsel.mjs";

const ZIEL = fileURLToPath(new URL("../projekte/spurwechsel/", import.meta.url));
mkdirSync(ZIEL, { recursive: true });

const LAEUFE = Number(process.env.LAEUFE ?? 100);
const SENS_LAEUFE = Number(process.env.SENS_LAEUFE ?? 40);
const SEED0 = 1000; // Seeds 1001, 1002, …

const runde = (x, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);
function statistik(werte, d = 1) {
  const w = werte.filter((x) => Number.isFinite(x));
  const n = w.length;
  if (!n) return { n: 0 };
  const m = w.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)) : 0;
  const s = [...w].sort((a, b) => a - b);
  const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  return { n, mittel: runde(m, d), sd: runde(sd, d), ci95: runde((1.96 * sd) / Math.sqrt(n), d), min: runde(s[0], d), median: runde(med, d), max: runde(s[n - 1], d) };
}

// ---------------------------------------------------------------------------------
// 1) Läufe eines Szenarios

function szenario(parameter, laeufe, { sammleDuelle = false } = {}) {
  const proLauf = [];
  const alleDuelle = [];
  const proFahrzeug = { halter: [], wechsler: [] };
  for (let k = 1; k <= laeufe; k++) {
    const sim = new SpurSim({ seed: SEED0 + k, parameter });
    sim.laufe();
    const kz = kennzahlen(sim);
    const alle = [];
    for (let i = 0; i < sim.n; i++) alle.push(sim.renn.zeit[i]);
    proLauf.push({ seed: SEED0 + k, ...kz, fahrzeitAlleS: alle.reduce((a, b) => a + b, 0) / alle.length });
    if (sammleDuelle) for (const d of duelle(sim)) alleDuelle.push({ seed: SEED0 + k, ...d });
    if (sammleDuelle)
      for (let i = 0; i < sim.n; i++) proFahrzeug[sim.typ[i] ? "wechsler" : "halter"].push({ zeit: sim.renn.zeit[i], wechsel: sim.renn.wechsel[i] });
  }
  const s = (f, d = 1) => statistik(proLauf.map(f), d);
  const erg = {
    laeufe,
    fahrzeitHalterS: s((l) => l.halter.fahrzeitS),
    fahrzeitWechslerS: s((l) => l.wechsler.fahrzeitS),
    fahrzeitAlleS: s((l) => l.fahrzeitAlleS),
    vorteilWechslerS: s((l) => l.halter.fahrzeitS - l.wechsler.fahrzeitS),
    vorteilWechslerProzent: s((l) => (100 * (l.halter.fahrzeitS - l.wechsler.fahrzeitS)) / l.halter.fahrzeitS),
    spurwechselWechsler: s((l) => l.wechsler.spurwechsel),
    sekundenProSpurwechsel: s((l) => (l.halter.fahrzeitS - l.wechsler.fahrzeitS) / l.wechsler.spurwechsel, 2),
    wahrnehmungHalter: {
      anteilZeitUeberholtWerdenProzent: s((l) => 100 * l.halter.anteilZeitUeberholtWerden),
      anteilZeitUeberholenProzent: s((l) => 100 * l.halter.anteilZeitUeberholen),
      autosUeberholtWerden: s((l) => l.halter.autosUeberholtWerden),
      autosUeberholen: s((l) => l.halter.autosUeberholen),
      anteilNachbarSchnellerProzent: s((l) => 100 * l.halter.anteilNachbarSchneller),
      anteilNachbarLangsamerProzent: s((l) => 100 * l.halter.anteilNachbarLangsamer),
      anteilStandProzent: s((l) => 100 * l.halter.anteilStand),
    },
    wahrnehmungWechsler: {
      anteilZeitUeberholtWerdenProzent: s((l) => 100 * l.wechsler.anteilZeitUeberholtWerden),
      anteilZeitUeberholenProzent: s((l) => 100 * l.wechsler.anteilZeitUeberholen),
      autosUeberholtWerden: s((l) => l.wechsler.autosUeberholtWerden),
      autosUeberholen: s((l) => l.wechsler.autosUeberholen),
    },
  };
  if (sammleDuelle) {
    const v = alleDuelle.map((d) => d.vorteilS);
    erg.duelle = {
      definition: "Spurwechsler und Spurhalter starten nebeneinander (verschiedene Spuren, höchstens 1 Zelle versetzt).",
      anzahl: v.length,
      wechslerGewinntProzent: runde((100 * v.filter((x) => x > 0).length) / v.length),
      vorteilS: statistik(v),
      vorteilMehrAls60SProzent: runde((100 * v.filter((x) => x > 60).length) / v.length),
      halterMehrAls60SVornProzent: runde((100 * v.filter((x) => x < -60).length) / v.length),
    };
    const zw = proFahrzeug.wechsler.map((f) => f.zeit), zh = proFahrzeug.halter.map((f) => f.zeit);
    erg.einzelfahrzeuge = {
      fahrzeitHalterS: statistik(zh),
      fahrzeitWechslerS: statistik(zw),
      spurwechselWechsler: statistik(proFahrzeug.wechsler.map((f) => f.wechsel)),
    };
  }
  return { erg, proLauf, alleDuelle };
}

console.log(`Basis: ${LAEUFE} Läufe …`);
const t0 = Date.now();
const basis = szenario({}, LAEUFE, { sammleDuelle: true });
console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)} s · Vorteil ${basis.erg.vorteilWechslerS.mittel} s ± ${basis.erg.vorteilWechslerS.ci95}, Wechsel ${basis.erg.spurwechselWechsler.mittel}`);
console.log(`Referenz (niemand wechselt): ${LAEUFE} Läufe …`);
const referenz = szenario({ anteilWechsler: 0 }, LAEUFE);
console.log(`  Halter ${referenz.erg.fahrzeitHalterS.mittel} s · überholt werden ${referenz.erg.wahrnehmungHalter.anteilZeitUeberholtWerdenProzent.mittel} % · überholen ${referenz.erg.wahrnehmungHalter.anteilZeitUeberholenProzent.mittel} %`);

// Gepaarter Vergleich Basis gegen Referenz (gleiche Seeds = gleiche Startaufstellung)
const paar = basis.proLauf.map((l, k) => ({ alle: referenz.proLauf[k].halter.fahrzeitS - l.fahrzeitAlleS, halter: referenz.proLauf[k].halter.fahrzeitS - l.halter.fahrzeitS }));
const gegenReferenz = {
  erklaerung: "Positiv = in der Basis (30 % Spurwechsler) schneller als in der Referenz (niemand wechselt), gepaart nach Seed.",
  alleFahrzeugeS: statistik(paar.map((p) => p.alle)),
  nurHalterS: statistik(paar.map((p) => p.halter)),
};

// ---------------------------------------------------------------------------------
// 2) Sensitivität

const VARIANTEN = [
  ["Drängler: quetscht sich in jede Lücke (Sicherheitsabstand 0)", { sicherheitZellen: 0 }],
  ["Vorsichtig: 2 Zellen (15 m) Sicherheitsabstand", { sicherheitZellen: 2 }],
  ["Wechsel kostet Tempo (kein Beschleunigen beim Wechsel)", { wechselOhneBeschleunigung: true }],
  ["Nur 10 % Spurwechsler", { anteilWechsler: 0.1 }],
  ["60 % Spurwechsler", { anteilWechsler: 0.6 }],
  ["95 % Spurwechsler", { anteilWechsler: 0.95 }],
  ["Weniger dicht (30 Fz/km/Spur)", { dichteKmSpur: 30 }],
  ["Dichter (50 Fz/km/Spur)", { dichteKmSpur: 50 }],
  ["Sperre 1 s statt 3 s", { sperreS: 1 }],
  ["Sperre 8 s statt 3 s", { sperreS: 8 }],
  ["Trödeln p = 0,1", { troedel: 0.1 }],
  ["Trödeln p = 0,3", { troedel: 0.3 }],
  ["Anfahren p0 = 0,3 (weniger Stop-and-go)", { anfahrTroedel: 0.3 }],
  ["Anfahren p0 = 0,7 (mehr Stop-and-go)", { anfahrTroedel: 0.7 }],
  ["Höheres Tempo (vmax 135 km/h)", { vmax: 5 }],
  ["Längere Strecke (10 km)", { streckeM: 10000, ringM: 20000 }],
];
const sensitivitaet = [];
for (const [name, par] of VARIANTEN) {
  const s = szenario(par, SENS_LAEUFE).erg;
  const z = {
    variante: name,
    parameter: par,
    laeufe: SENS_LAEUFE,
    fahrzeitHalterS: s.fahrzeitHalterS.mittel,
    fahrzeitWechslerS: s.fahrzeitWechslerS.mittel,
    vorteilS: s.vorteilWechslerS.mittel,
    vorteilCi95S: s.vorteilWechslerS.ci95,
    vorteilProzent: s.vorteilWechslerProzent.mittel,
    spurwechsel: s.spurwechselWechsler.mittel,
    sekundenProSpurwechsel: s.sekundenProSpurwechsel.mittel,
    halterUeberholtWerdenProzent: s.wahrnehmungHalter.anteilZeitUeberholtWerdenProzent.mittel,
    halterUeberholenProzent: s.wahrnehmungHalter.anteilZeitUeberholenProzent.mittel,
  };
  sensitivitaet.push(z);
  console.log(`  ${name}: Vorteil ${z.vorteilS} s (${z.vorteilProzent} %), ${z.spurwechsel} Wechsel`);
}
// Wahrnehmung in der Referenz bei anderer Dichte
const refSens = [];
for (const [name, par] of [["Referenz, 30 Fz/km/Spur", { anteilWechsler: 0, dichteKmSpur: 30 }], ["Referenz, 50 Fz/km/Spur", { anteilWechsler: 0, dichteKmSpur: 50 }], ["Referenz, p0 = 0,3", { anteilWechsler: 0, anfahrTroedel: 0.3 }]]) {
  const s = szenario(par, SENS_LAEUFE).erg;
  refSens.push({ variante: name, parameter: par, laeufe: SENS_LAEUFE, ueberholtWerdenProzent: s.wahrnehmungHalter.anteilZeitUeberholtWerdenProzent.mittel, ueberholenProzent: s.wahrnehmungHalter.anteilZeitUeberholenProzent.mittel, autosUeberholtWerden: s.wahrnehmungHalter.autosUeberholtWerden.mittel, autosUeberholen: s.wahrnehmungHalter.autosUeberholen.mittel });
}

// ---------------------------------------------------------------------------------
// 3) Typisches Duell für die Animation

const MITTEL_VORTEIL = basis.erg.vorteilWechslerS.mittel;
const MITTEL_WECHSEL = basis.erg.spurwechselWechsler.mittel;

/** Spielt einen Lauf ab und zeichnet je Sekunde den Weg aller Fahrzeuge auf (ab Rennstart) */
function laufMitWegen(seed, parameter = {}) {
  const sim = new SpurSim({ seed, parameter });
  const wege = [];
  const spuren = [];
  sim.laufe({
    beiStart: (s) => { wege.push(Float32Array.from(s.weg)); spuren.push(Uint8Array.from(s.spur)); },
    beiSchritt: (s) => { wege.push(Float32Array.from(s.weg)); spuren.push(Uint8Array.from(s.spur)); },
  });
  return { sim, wege, spuren };
}

function duellVerlauf(lauf, p, a) {
  const { sim, wege } = lauf;
  const r = sim.renn;
  const dA = sim.rel(r.startX[p], r.startX[a]); // Versatz von Anna gegenüber Paul beim Start (Zellen)
  const ende = Math.ceil(Math.max(r.zeit[p], r.zeit[a]));
  const vorsprung = []; // Paul − Anna in m
  for (let t = 0; t <= Math.min(ende, wege.length - 1); t++) {
    const xp = (wege[t][p] - wege[0][p]) * ZELLE_M;
    const xa = (wege[t][a] - wege[0][a] + dA) * ZELLE_M;
    vorsprung.push(xp - xa);
  }
  return vorsprung;
}

console.log("Suche ein typisches Duell …");
// Kriterien: Paul (Spurwechsler) und Anna (Spurhalterin) starten nebeneinander; Pauls Spurwechsel = gerundetes Mittel;
// beide Fahrzeiten höchstens 4 s vom Mittel ihres Typs; Vorteil höchstens 1 s vom mittleren Vorteil.
// Unter diesen wird das Duell gewählt, in dem Anna zwischendurch am weitesten vorn liegt (zeigt das Hin und Her).
const MITTEL_P = basis.erg.fahrzeitWechslerS.mittel, MITTEL_A = basis.erg.fahrzeitHalterS.mittel;
const kandidaten = basis.alleDuelle.filter((d) => Math.abs(d.vorteilS - MITTEL_VORTEIL) <= 1);
const proSeed = new Map();
for (const d of kandidaten) {
  if (!proSeed.has(d.seed)) proSeed.set(d.seed, []);
  proSeed.get(d.seed).push(d);
}
let bestes = null;
for (const [seed, liste] of proSeed) {
  const lauf = laufMitWegen(seed);
  const r = lauf.sim.renn;
  for (const d of liste) {
    const wechsel = r.wechsel[d.wechsler];
    if (wechsel !== Math.round(MITTEL_WECHSEL)) continue;
    if (Math.abs(r.zeit[d.wechsler] - MITTEL_P) > 4 || Math.abs(r.zeit[d.halter] - MITTEL_A) > 4) continue;
    const vs = duellVerlauf(lauf, d.wechsler, d.halter);
    const annaVorn = -Math.min(...vs);
    const score = annaVorn - 10 * Math.abs(d.vorteilS - MITTEL_VORTEIL);
    if (!bestes || score > bestes.score) bestes = { seed, ...d, wechsel, zeitPaulS: r.zeit[d.wechsler], zeitAnnaS: r.zeit[d.halter], maxVorn: Math.max(...vs), minVorn: Math.min(...vs), score };
  }
}
console.log("  gewählt:", JSON.stringify({ ...bestes, score: runde(bestes.score, 2) }));

// ---------------------------------------------------------------------------------
// 4) Aufzeichnung für die Animation

/**
 * Zeichnet ab `vorlaufS` vor dem Rennstart bis `nachlaufS` nach dem Ziel des Letzten der beiden alle Fahrzeuge
 * im Fenster [min(Paul, Anna) − rand, max + rand] auf. x in m, entrollt, 0 = Startpunkt (Mitte zwischen beiden).
 */
function aufzeichnen({ seed, parameter = {}, p, a, vorlaufS = 30, nachlaufS = 25, randM = 330, vonS = null, bisS = null }) {
  const sim = new SpurSim({ seed, parameter });
  const L = sim.L;
  while (sim.t < sim.p.einschwingS - vorlaufS) sim.schritt();
  // Rennen startet bei einschwingS; Ursprung legen wir auf den Startpunkt, daher erst vorspulen und merken
  const proben = [];
  const nimm = () => {
    proben.push({ t: sim.t, x: Int32Array.from(sim.x), spur: Uint8Array.from(sim.spur), v: Int8Array.from(sim.v), weg: Float64Array.from(sim.weg) });
  };
  nimm();
  while (sim.t < sim.p.einschwingS) { sim.schritt(); nimm(); }
  sim.starteRennen();
  const r = sim.renn;
  const ende = () => !Number.isNaN(r.zeit[p]) && !Number.isNaN(r.zeit[a]);
  let nach = 0;
  while (sim.t < sim.p.maxS) {
    if (bisS !== null ? sim.t - r.t0 >= bisS : nach >= nachlaufS) break;
    sim.schritt();
    nimm();
    if (ende()) nach++;
  }
  const t0 = r.t0;
  const i0 = proben.findIndex((q) => q.t === t0);
  const dA = sim.rel(proben[i0].x[p], proben[i0].x[a]);
  // entrollte Lage von Paul und Anna (m), 0 = Mitte beim Start
  const X = (q, i, start) => (q.weg[i] - proben[i0].weg[i] + start) * ZELLE_M;
  const reihen = new Map();
  let lfd = 0;
  for (const q of proben) {
    const tr = q.t - t0;
    if (vonS !== null && tr < vonS) continue;
    const xp = X(q, p, -dA / 2), xa = X(q, a, dA / 2);
    const lo = Math.min(xp, xa) - randM, hi = Math.max(xp, xa) + randM;
    // Bezugspunkt: Paul (Ringlage), andere relativ dazu
    for (let i = 0; i < sim.n; i++) {
      const xi = xp + sim.rel(q.x[p], q.x[i]) * ZELLE_M;
      if (xi < lo || xi > hi) {
        if (reihen.has(i) && reihen.get(i).offen) reihen.get(i).offen = false;
        continue;
      }
      let rr = reihen.get(i);
      if (!rr || !rr.offen || rr.letzte !== tr - 1) {
        if (rr) rr.offen = false;
        rr = { schluessel: lfd++, id: i, typ: sim.typ[i], t0: tr, x: [], s: [], v: [], offen: true, letzte: tr - 1 };
        reihen.set(i, rr);
        (reihen.alle ||= []).push(rr);
      }
      rr.x.push(Math.round(xi * 10) / 10);
      rr.s.push(q.spur[i]);
      rr.v.push(q.v[i]);
      rr.letzte = tr;
    }
  }
  const fahrzeuge = (reihen.alle || []).filter((rr) => rr.x.length >= 2).map((rr) => ({
    id: rr.id,
    typ: rr.typ,
    rolle: rr.id === p ? "paul" : rr.id === a ? "anna" : null,
    t0: rr.t0,
    x: rr.x,
    s: rr.s,
    v: rr.v,
  }));
  // Verlauf der beiden (je Sekunde ab Start)
  const verlauf = [];
  for (let k = i0; k < proben.length; k++) {
    const q = proben[k];
    verlauf.push({ t: q.t - t0, paul: runde(X(q, p, -dA / 2), 1), anna: runde(X(q, a, dA / 2), 1), spurPaul: q.spur[p], spurAnna: q.spur[a] });
  }
  return {
    sim,
    daten: {
      meta: { seed, zelleM: ZELLE_M, hz: 1, tVonS: proben[0].t - t0, tBisS: proben[proben.length - 1].t - t0, streckeM: sim.p.streckeM, startDifferenzZellen: dA },
      paul: { id: p, zeitS: runde(r.zeit[p], 2), spurwechsel: r.wechsel[p], ueberholtWerden: r.nUeberholtWerden[p], ueberholt: r.nUeberholen[p] },
      anna: { id: a, zeitS: runde(r.zeit[a], 2), spurwechsel: r.wechsel[a], ueberholtWerden: r.nUeberholtWerden[a], ueberholt: r.nUeberholen[a], sekUeberholtWerden: r.sekUeberholtWerden[a], sekUeberholen: r.sekUeberholen[a], sek: r.sek[a] },
      verlauf,
      fahrzeuge,
    },
  };
}

const rennen = aufzeichnen({ seed: bestes.seed, p: bestes.wechsler, a: bestes.halter });
writeFileSync(ZIEL + "trajektorien_rennen.json", JSON.stringify(rennen.daten));
console.log(`  trajektorien_rennen.json: ${rennen.daten.fahrzeuge.length} Bahnen, Paul ${rennen.daten.paul.zeitS} s, Anna ${rennen.daten.anna.zeitS} s, Wechsel ${rennen.daten.paul.spurwechsel}`);

// Spurwechsel-Zeitpunkte von Paul (für Kamera und Klang)
const wechselPaul = [];
for (let k = 1; k < rennen.daten.verlauf.length; k++) if (rennen.daten.verlauf[k].spurPaul !== rennen.daten.verlauf[k - 1].spurPaul) wechselPaul.push(rennen.daten.verlauf[k].t);

// ---------------------------------------------------------------------------------
// 5) Beispiel für die Wahrnehmung (Referenz: niemand wechselt)

console.log("Suche ein Beispiel für die Wahrnehmung …");
function wahrnehmungsBeispiel(seed) {
  const sim = new SpurSim({ seed, parameter: { anteilWechsler: 0 } });
  const reihen = []; // je Sekunde: [überholtWerden, überholen] je Fahrzeug
  let vorher = null;
  sim.laufe({
    beiStart: (s) => { vorher = { w: Int32Array.from(s.renn.nUeberholtWerden), u: Int32Array.from(s.renn.nUeberholen) }; },
    beiSchritt: (s) => {
      const w = Int32Array.from(s.renn.nUeberholtWerden), u = Int32Array.from(s.renn.nUeberholen);
      const dw = new Int8Array(s.n), du = new Int8Array(s.n);
      for (let i = 0; i < s.n; i++) { dw[i] = w[i] - vorher.w[i]; du[i] = u[i] - vorher.u[i]; }
      reihen.push({ dw, du });
      vorher = { w, u };
    },
  });
  // Fenster: 9 s überholt werden (lockerer Strom), danach 5 s selbst überholen (dichte Kolonne)
  let best = null;
  const A = 9, B = 5;
  for (let i = 0; i < sim.n; i++) {
    for (let t = 20; t + A + B < Math.min(reihen.length, 500); t++) {
      let sekW = 0, autosW = 0, uInA = 0;
      for (let k = t; k < t + A; k++) { if (reihen[k].dw[i]) sekW++; autosW += reihen[k].dw[i]; uInA += reihen[k].du[i]; }
      let sekU = 0, autosU = 0, wInB = 0;
      for (let k = t + A; k < t + A + B; k++) { if (reihen[k].du[i]) sekU++; autosU += reihen[k].du[i]; wInB += reihen[k].dw[i]; }
      if (uInA || wInB || autosW < 3 || autosU < 3) continue;
      // möglichst: viele Sekunden mit Überholtwerden, gleich viele Autos, wenige Sekunden mit Überholen
      const score = sekW - sekU * 1.5 - Math.abs(autosW - autosU) * 1.2;
      if (!best || score > best.score) best = { seed, id: i, t, sekW, autosW, sekU, autosU, score };
    }
  }
  return best;
}
let wBest = null;
for (let k = 1; k <= 12; k++) {
  const b = wahrnehmungsBeispiel(SEED0 + k);
  if (b && (!wBest || b.score > wBest.score)) wBest = b;
}
console.log("  gewählt:", JSON.stringify(wBest));
// Aufzeichnung: Anna = gewähltes Fahrzeug; „Paul“ = ein beliebiges anderes Fahrzeug direkt daneben ist nicht nötig → p = a
const wahr = aufzeichnen({ seed: wBest.seed, parameter: { anteilWechsler: 0 }, p: wBest.id, a: wBest.id, vorlaufS: 0, nachlaufS: 0, randM: 260, vonS: wBest.t - 8, bisS: wBest.t + 9 + 5 + 10 });
wahr.daten.meta.beispiel = { erklaerung: "Fenster ab t (s nach Start): 9 s wird Anna überholt, danach 5 s überholt sie selbst.", t: wBest.t, sekundenUeberholtWerden: wBest.sekW, autosUeberholtWerden: wBest.autosW, sekundenUeberholen: wBest.sekU, autosUeberholen: wBest.autosU };
writeFileSync(ZIEL + "trajektorien_wahrnehmung.json", JSON.stringify(wahr.daten));
console.log(`  trajektorien_wahrnehmung.json: ${wahr.daten.fahrzeuge.length} Bahnen`);

// ---------------------------------------------------------------------------------
// 6) Ergebnisdatei

const b = basis.erg, rf = referenz.erg;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const ergebnis = {
  titel: "Spurwechsel im Stau: Bist du auf der anderen Spur wirklich schneller?",
  stand: new Date().toISOString().slice(0, 10),
  modell: "pipeline/sim/spurwechsel.mjs (Nagel-Schreckenberg, 2 Spuren, Ring, slow-to-start)",
  parameter: { ...STANDARD_PARAMETER },
  parameterBegruendung: {
    ringM: "Ring (periodischer Rand) hält die Dichte konstant: dauerhaft dichter Stop-and-go-Verkehr, kein Engpass.",
    dichteKmSpur: "40 Fz/km/Spur (Abstand im Mittel 25 m): dichter Stop-and-go-Verkehr. Annahme, keine Zählstellendaten.",
    anteilWechsler: "30 % der übrigen Fahrer wechseln aktiv. Annahme; Varianten 10–95 % in der Sensitivität.",
    vmax: "81 km/h, wie im Reißverschluss-Modell. Zwischen zwei Staus erreicht man selten mehr.",
    troedel: "p = 0,2 (Standardwert der NaSch-Literatur).",
    anfahrTroedel: "p0 = 0,5: verzögertes Anfahren aus dem Stand, erzeugt Stop-and-go-Wellen (VDR-Modell).",
    sperreS: "Ein Spurwechsel dauert; danach mindestens 3 s bis zum nächsten. Annahme.",
    sicherheitZellen: "1 Zelle (7,5 m) mehr Platz hinter sich als das Tempo des neuen Hintermanns. Annahme; 0 und 2 in der Sensitivität.",
    einschwingS: "20 min Einschwingen, damit sich die Staus voll ausbilden.",
    streckeM: "5 km Stau; Varianten 10 km.",
  },
  methodik: [
    `${LAEUFE} Läufe (Seeds ${SEED0 + 1}–${SEED0 + LAEUFE}), je ca. ${Math.round((STANDARD_PARAMETER.dichteKmSpur * STANDARD_PARAMETER.ringM) / 1000) * 2} Fahrzeuge auf 2 × 10 km Ring.`,
    "Nach 20 min Einschwingen startet das „Rennen“: Jedes Fahrzeug fährt ab seiner aktuellen Position 5 km weit. Gemessen werden Fahrzeit, Spurwechsel und Überholvorgänge bis zum Ziel.",
    "Mittelwerte je Lauf und Typ, dann Mittel ± 95-%-Intervall über die Läufe. Der Vorteil ist gepaart je Lauf (gleicher Lauf, gleiche Bedingungen).",
    "Referenz: dieselben Seeds, aber niemand wechselt die Spur. Dann sind beide Spuren im Mittel exakt gleich schnell (Symmetrie).",
    "Überholt werden: In dieser Sekunde zieht mindestens ein Auto der Nachbarspur an mir vorbei. Überholen: Ich ziehe an mindestens einem vorbei. Gleichauf zählt die linke Spur als vorn.",
  ],
  basis: { ...b, gegenReferenz },
  referenzNiemandWechselt: { laeufe: rf.laeufe, fahrzeitS: rf.fahrzeitHalterS, wahrnehmung: rf.wahrnehmungHalter },
  sensitivitaet,
  sensitivitaetWahrnehmung: refSens,
  animation: {
    rennen: {
      datei: "trajektorien_rennen.json",
      auswahl: `Duell aus Lauf ${bestes.seed}: Spurwechsler ${bestes.wechsler} („Paul“) und Spurhalterin ${bestes.halter} („Anna“) starten nebeneinander. Kriterien: Pauls Spurwechsel = gerundetes Mittel (${Math.round(MITTEL_WECHSEL)}), beide Fahrzeiten höchstens 4 s vom Mittel ihres Typs, Vorteil höchstens 1 s vom Mittel. Unter diesen das Duell, in dem Anna zwischendurch am weitesten vorn liegt (zeigt das Hin und Her).`,
      zeitPaulS: runde(bestes.zeitPaulS, 1),
      zeitAnnaS: runde(bestes.zeitAnnaS, 1),
      seed: bestes.seed,
      vorteilS: runde(bestes.vorteilS, 1),
      spurwechselPaul: bestes.wechsel,
      maxVorsprungPaulM: runde(bestes.maxVorn, 0),
      maxVorsprungAnnaM: runde(-bestes.minVorn, 0),
      paulErstmalsVorn30mS: bestes.pVorn,
      annaDanachVorn15mS: bestes.annaDanachVorn,
      spurwechselZeitpunktePaulS: wechselPaul,
    },
    wahrnehmung: { datei: "trajektorien_wahrnehmung.json", ...wahr.daten.meta.beispiel, seed: wBest.seed, fahrzeug: wBest.id },
  },
};
// Kernzahlen für Skript und Bild (gerundet wie im Sprechtext)
ergebnis.kernzahlen = {
  fahrzeitHalter: mmss(b.fahrzeitHalterS.mittel),
  fahrzeitWechsler: mmss(b.fahrzeitWechslerS.mittel),
  fahrzeitHalterS: Math.round(b.fahrzeitHalterS.mittel),
  fahrzeitWechslerS: Math.round(b.fahrzeitWechslerS.mittel),
  vorteilS: Math.round(b.vorteilWechslerS.mittel),
  vorteilProzent: Math.round(b.vorteilWechslerProzent.mittel),
  spurwechsel: Math.round(b.spurwechselWechsler.mittel),
  sekundenProSpurwechsel: Math.round(b.vorteilWechslerS.mittel / b.spurwechselWechsler.mittel),
  duellWechslerGewinntProzent: Math.round(b.duelle.wechslerGewinntProzent),
  wahrnehmungReferenz: {
    ueberholtWerdenProzent: Math.round(rf.wahrnehmungHalter.anteilZeitUeberholtWerdenProzent.mittel),
    ueberholenProzent: Math.round(rf.wahrnehmungHalter.anteilZeitUeberholenProzent.mittel),
    autosUeberholtWerden: Math.round(rf.wahrnehmungHalter.autosUeberholtWerden.mittel),
    autosUeberholen: Math.round(rf.wahrnehmungHalter.autosUeberholen.mittel),
  },
  draenglerVorteilS: Math.round(sensitivitaet[0].vorteilS),
  draenglerSpurwechsel: Math.round(sensitivitaet[0].spurwechsel),
};
writeFileSync(ZIEL + "sim_ergebnisse.json", JSON.stringify(ergebnis, null, 1));
console.log("Kernzahlen:", JSON.stringify(ergebnis.kernzahlen));
console.log(`Fertig in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
