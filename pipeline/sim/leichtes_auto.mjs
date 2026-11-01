// „Stell dir vor, dein Auto wiegt so viel wie ein Kasten Wasser“ – eigene Rechnung (Account 2, @stelldirvor.pov).
// Szenario (Gedankenexperiment): Du fährst 130 km/h auf der Autobahn. Fünf Sekunden lang wiegen Auto und du zusammen nur
// 15 kg (Masse). Luft, Motor und Reifen bleiben gleich. Auftrieb wird nicht modelliert.
// Fahrzeug: Kompaktwagen, cW 0,275, Stirnfläche 2,2 m², Luftdichte 1,2 kg/m³, Haftreibungszahl µ = 1,0 (Obergrenze trocken).
// Alle Werte in m, s, kg, N. Numerische Integration (RK4, dt = 1 ms) mit Gegenprobe gegen die geschlossene Lösung.
// Tests: node --test sim/leichtes_auto.test.mjs

export const G = 9.81;
export const P = {
  cw: 0.275, // Luftwiderstandsbeiwert Kompaktwagen (Herstellerangabe Golf 8: 0,275)
  stirn: 2.2, // Stirnfläche m² (Herstellerangabe 2,21)
  rho: 1.2, // Luftdichte kg/m³ (ca. 20 °C, Meereshöhe)
  v0: 130 / 3.6, // Startgeschwindigkeit (Richtgeschwindigkeit)
  mLeicht: 15, // Szenario-Masse (Auto + du) für 5 s: ein Kasten Wasser
  mNormal: 1400, // normaler Kompaktwagen mit Fahrer (Vergleich)
  mu: 1.0, // Haftreibungszahl Reifen–Asphalt, trocken (Obergrenze; Lehrbuchwerte 0,8–1,0)
  dauer: 5, // Szenario in s
  // Lkw-Luftstoß: Seitenwind-Ersatzmodell
  lkwV: 80 / 3.6, // Lkw (> 3,5 t) auf der Autobahn: 80 km/h
  lkwRelV: 50 / 3.6, // Geschwindigkeitsunterschied beim Vorbeifahren = Luftstoß wie 50 km/h Seitenwind
  seitenflaeche: 6.0, // Seitenfläche des Autos m² (Länge 4,3 m × Höhe 1,45 m ≈ 6,2 m² Silhouette, abzüglich Bodenfreiheit)
  cwSeite: 1.0, // cW bei Queranströmung (Platte ≈ 1)
  lkwStoss: 0.3, // Dauer des Luftstoßes in s (Annahme: Fahrerhaus und Bugwelle passieren die Autolänge, kurz und scharf)
};

/** k = ½ · ρ · cW · A, damit F_Luft = k · v² */
export const K = 0.5 * P.rho * P.cw * P.stirn;
export const luftwiderstand = (v) => K * v * v;
export const haftgrenze = (m = P.mLeicht) => P.mu * m * G; // höchste Kraft, die die Reifen übertragen
export const kmh = (v) => v * 3.6;
export const gRichtung = (a) => a / G;

/**
 * Antriebskraft (am Boden) je Fahrweise. Der Motor könnte mehr, aber die Reifen übertragen höchstens µ·m·g.
 *  - "gasweg":  Fuß vom Gas, kein Antrieb
 *  - "vollgas": Motor will mehr als die Reifen halten, die Räder drehen durch (Antrieb = Haftgrenze)
 */
export function antrieb(modus, m = P.mLeicht) {
  if (modus === "gasweg") return 0;
  if (modus === "vollgas") return Math.min(1e5, haftgrenze(m));
  throw new Error("Modus?");
}

/** Integration von τ = 0 … dauer. Liefert Tabelle (alle `schritt` s) mit v, x, a, F_Luft, F_Antrieb. */
export function integriere({ modus = "gasweg", m = P.mLeicht, v0 = P.v0, dauer = P.dauer, dt = 0.001, schritt = 1 / 120 } = {}) {
  const F = antrieb(modus, m);
  const acc = (v) => (F - K * v * v) / m;
  let v = v0, x = 0, t = 0;
  const tab = [];
  const n = Math.round(dauer / dt);
  const jeSchritt = Math.max(1, Math.round(schritt / dt));
  for (let i = 0; i <= n; i++) {
    if (i % jeSchritt === 0) tab.push({ t, v, x, a: acc(v), luft: K * v * v, antrieb: F, durchdrehen: modus === "vollgas" });
    if (i === n) break;
    // RK4 für (x, v)
    const k1v = acc(v), k1x = v;
    const k2v = acc(v + 0.5 * dt * k1v), k2x = v + 0.5 * dt * k1v;
    const k3v = acc(v + 0.5 * dt * k2v), k3x = v + 0.5 * dt * k2v;
    const k4v = acc(v + dt * k3v), k4x = v + dt * k3v;
    v += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    x += (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    t += dt;
  }
  return tab;
}

/** Linear interpolierte Abfrage in einer Tabelle */
export function abfrage(tab, t) {
  if (t <= 0) return tab[0];
  const last = tab[tab.length - 1];
  if (t >= last.t) return last;
  const h = tab[1].t - tab[0].t;
  const i = Math.min(tab.length - 2, Math.floor(t / h));
  const f = (t - tab[i].t) / (tab[i + 1].t - tab[i].t);
  const a = tab[i], b = tab[i + 1];
  const mix = (p) => a[p] + (b[p] - a[p]) * f;
  return { t, v: mix("v"), x: mix("x"), a: mix("a"), luft: mix("luft"), antrieb: mix("antrieb"), durchdrehen: a.durchdrehen };
}

// ---------------------------------------------------------------- geschlossene Lösungen (Gegenprobe)
/** Gas weg: v = v0 / (1 + k v0 τ / m), x = (m/k) ln(1 + k v0 τ / m) */
export function gaswegGeschlossen(tau, m = P.mLeicht, v0 = P.v0) {
  const q = 1 + (K * v0 * tau) / m;
  return { v: v0 / q, x: (m / K) * Math.log(q) };
}
/** Vollgas (Antrieb F konstant): Endgeschwindigkeit vt = √(F/k); für v0 > vt gilt v = vt · coth(κ τ + c) */
export function endgeschwindigkeit(m = P.mLeicht, F = haftgrenze(m)) {
  return Math.sqrt(F / K);
}
export function vollgasGeschlossen(tau, m = P.mLeicht, v0 = P.v0) {
  const F = haftgrenze(m);
  const vt = Math.sqrt(F / K), kappa = (K * vt) / m;
  const c = Math.atanh(vt / v0);
  return { v: vt / Math.tanh(kappa * tau + c), vt };
}

// ---------------------------------------------------------------- Lkw-Luftstoß
export const seitenKraft = (vRel = P.lkwRelV) => 0.5 * P.rho * P.cwSeite * P.seitenflaeche * vRel * vRel;

/**
 * Lkw hinter dir (Lkw 80 km/h, du fährst im Szenario „Gas weg“ langsamer werden): Abstand des Lkw-Hecks zu deinem Auto.
 * Ort relativ zu dir: lkw(τ) = −g0 + (v_lkw·τ − x_du(τ)). g0 so gewählt, dass der Lkw bei Relativ-Tempo 50 km/h neben dir ist.
 */
export function lkwUeberholt({ tab = integriere({ modus: "gasweg" }) } = {}) {
  // Zeitpunkt, an dem dein Tempo = Lkw-Tempo − 50 km/h
  const vZiel = P.lkwV - P.lkwRelV;
  let tp = 0;
  for (const r of tab) { if (r.v <= vZiel) { tp = r.t; break; } }
  // lineare Verfeinerung
  const a = abfrage(tab, tp - 1 / 120), b = abfrage(tab, tp);
  const f = (a.v - vZiel) / (a.v - b.v || 1);
  const tPass = a.t + f * (b.t - a.t);
  const xDu = abfrage(tab, tPass).x;
  const g0 = P.lkwV * tPass - xDu; // Lkw-Front startet g0 hinter dir (Fahrerhaus neben dir bei tPass)
  return { tPass, g0, vDu: abfrage(tab, tPass).v, vRel: P.lkwV - abfrage(tab, tPass).v, ort: (t) => -g0 + P.lkwV * t - abfrage(tab, t).x };
}

/**
 * Seitlicher Versatz durch den Luftstoß (nur zur Einordnung, im Video wird der Beginn nur angedeutet).
 * Puls F(s) = F_max · sin²(π s / Δ). Rutscht, solange F > µ·m·g; danach bremst die Gleitreibung µ·m·g.
 */
export function seitenRutschen({ m = P.mLeicht, dt = 0.0005 } = {}) {
  const Fmax = seitenKraft(), Fh = haftgrenze(m), D = P.lkwStoss;
  let y = 0, vy = 0, t = 0, rutschStart = null, rutschEnde = null, yBeiPulsEnde = null, vyMax = 0;
  const yBei = {};
  while (t < 5) {
    const F = t < D ? Fmax * Math.sin((Math.PI * t) / D) ** 2 : 0;
    let a = 0;
    if (vy > 1e-9 || F > Fh) {
      // Gleiten: Luftstoß schiebt, Gleitreibung bremst entgegen der Bewegung
      if (rutschStart === null) rutschStart = t;
      a = (F - Fh) / m;
      if (vy <= 0 && F <= Fh) a = 0;
    }
    vy = Math.max(0, vy + a * dt);
    y += vy * dt;
    vyMax = Math.max(vyMax, vy);
    if (rutschStart !== null && rutschEnde === null && vy <= 1e-9 && t > D) rutschEnde = t;
    if (yBeiPulsEnde === null && t >= D) yBeiPulsEnde = y;
    for (const q of [0.1, 0.2, 0.3, 0.4, 0.5]) if (yBei[q] === undefined && t >= rutschStart + q && rutschStart !== null) yBei[q] = y;
    t += dt;
  }
  return { Fmax, haftgrenze: Fh, verhaeltnis: Fmax / Fh, rutschStart, rutschEnde, yBeiPulsEnde, yEnde: y, vyMax, yBei };
}

// ---------------------------------------------------------------- Gesamtergebnis
export function alles() {
  const leicht = integriere({ modus: "gasweg" });
  const voll = integriere({ modus: "vollgas" });
  const normal = integriere({ modus: "gasweg", m: P.mNormal });
  const e = (tab) => tab[tab.length - 1];
  const lkw = lkwUeberholt({ tab: leicht });
  return {
    k: K,
    luftwiderstand_130: luftwiderstand(P.v0),
    haftgrenze_leicht: haftgrenze(),
    haftgrenze_normal: haftgrenze(P.mNormal),
    gasweg: { a_start_ms2: leicht[0].a, a_start_g: gRichtung(leicht[0].a), v_ende_kmh: kmh(e(leicht).v), weg_m: e(leicht).x },
    vollgas: {
      a_start_ms2: voll[0].a, a_start_g: gRichtung(voll[0].a), v_ende_kmh: kmh(e(voll).v), weg_m: e(voll).x,
      v_end_kmh: kmh(endgeschwindigkeit()), v_ende_geschlossen_kmh: kmh(vollgasGeschlossen(P.dauer).v),
    },
    normal_gasweg: { a_start_ms2: normal[0].a, a_start_g: gRichtung(normal[0].a), v_ende_kmh: kmh(e(normal).v), weg_m: e(normal).x },
    lkw: { kraft_N: seitenKraft(), verhaeltnis: seitenKraft() / haftgrenze(), tPass: lkw.tPass, abstandStart_m: lkw.g0, vDu_kmh: kmh(lkw.vDu), vRel_kmh: kmh(lkw.vRel), rutschen: seitenRutschen() },
  };
}

if (typeof process !== "undefined" && process.argv && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(alles(), null, 2));

/** Seitlicher Versatz y(s) in m, s = Sekunden seit Beginn des Luftstoßes (Tabelle für die Szene). */
export function rutschProfil({ m = P.mLeicht, dt = 0.001, dauer = 1.5 } = {}) {
  const Fmax = seitenKraft(), Fh = haftgrenze(m), D = P.lkwStoss;
  let y = 0, vy = 0, s = 0;
  const tab = [];
  const jeSchritt = Math.round(0.005 / dt);
  for (let i = 0; s <= dauer + 1e-9; i++) {
    if (i % jeSchritt === 0) tab.push({ s, y, vy });
    const F = s < D ? Fmax * Math.sin((Math.PI * s) / D) ** 2 : 0;
    let a = 0;
    if (vy > 1e-9 || F > Fh) a = (F - Fh) / m;
    vy = Math.max(0, vy + a * dt);
    y += vy * dt;
    s += dt;
  }
  return { tab, abfrage: (x) => { if (x <= 0) return { y: 0, vy: 0 }; const k = Math.min(tab.length - 1, Math.floor(x / 0.005)); return tab[k]; } };
}
