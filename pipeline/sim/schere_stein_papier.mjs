// Simulation „Schere, Stein, Papier: Gibt es eine Gewinnstrategie?“
// Rot (Taktik) spielt 100 Runden gegen Cyan. Cyan ist erst ein Zufallsspieler, dann ein Mensch-Modell mit Muster.
//   - Gegen den Zufallsspieler hat jede Taktik pro Runde 1/3 Sieg, 1/3 Unentschieden, 1/3 Niederlage
//     (Nash-Gleichgewicht der gemischten Strategie, jeder Zug mit 1/3). Das ist Mathematik, kein Messwert.
//   - Das Mensch-Modell wiederholt seinen Zug nach Sieg häufiger und wechselt nach Niederlage bevorzugt auf den Zug,
//     der den letzten Zug des Gegners geschlagen hätte (Wang, Xu, Zhou 2014, Sci. Rep. 4:5830, „Social cycling and
//     conditional responses in the Rock-Paper-Scissors game“). Die Taktik von Rot nutzt genau dieses Muster.
// Deterministisch (fester Seed). Läuft in Node (Tests, Auswertung) und im Browser (szene.js).
// Kennzeichnung: (F) belegt mit Quelle (siehe projekte/schere-stein-papier/skript.json), (A) Annahme, (S) Ergebnis der Simulation.
//
//   spiele({seed, runden, gegner})   → Lauf mit allen Runden (Züge, Ergebnis, Zwischenstand)
//   monteCarlo({n, runden, gegner})  → Verteilung der Endstände über n Wiederholungen
//   warumFaktoren(...)               → Trefferquoten von Rot nach Sieg / Niederlage / Unentschieden des Menschen
//   videoLaeufe()                    → die drei Läufe, die das Video zeigt (Auswahl nach festen Kriterien, siehe waehleLaeufe)

/** Züge: 0 Stein, 1 Papier, 2 Schere. Papier schlägt Stein, Schere schlägt Papier, Stein schlägt Schere. */
export const ZUEGE = ["Stein", "Papier", "Schere"];
export const schlaegt = (a, b) => (a - b + 3) % 3 === 1;
/** +1: a gewinnt, −1: b gewinnt, 0: unentschieden */
export const ergebnis = (a, b) => (a === b ? 0 : schlaegt(a, b) ? 1 : -1);
/** Der Zug, der z schlägt */
export const besieger = (z) => (z + 1) % 3;

/**
 * Mensch-Modell (bedingte Reaktion, „conditional response“). Wahrscheinlichkeiten für den nächsten Zug nach dem Ergebnis der
 * vorigen Runde (aus Sicht des Menschen). stay = gleicher Zug, links = Zug z−1 (der Zug, den z schlägt; bei einer Niederlage
 * ist das der Zug, der den letzten Zug des Gegners geschlagen hätte), rechts = Zug z+1 (der Zug, der z schlägt).
 *
 * (F) Wang & Xu 2014 (ESA-Preprint, arXiv:1407.1170, Tab. 2, Standard-Auszahlung a = 2, 12 Gruppen × 6 Personen × 300 Runden):
 *     Spieler behalten ihren letzten Zug in 44,0 % der Fälle (Zufall: 33,3 %), wechseln in beide Richtungen je ca. 28 %.
 * (F) Wang, Xu, Zhou 2014: Nach einem Sieg wird der Zug „deutlich häufiger“ wiederholt als gewechselt; nach einer Niederlage
 *     wechseln Spieler (a ≥ 2) häufiger in Richtung „links“ als dass sie bleiben oder nach „rechts“ gehen.
 * (A) Die einzelnen Zahlen unten sind eine Annahme: Sie halten die Richtung der Befunde ein und ergeben im Mittel über
 *     Sieg/Unentschieden/Niederlage genau die belegten 44 % Wiederholung ((0,55 + 0,45 + 0,32) / 3 = 0,44).
 */
export const MENSCH = {
  sieg: { stay: 0.55, links: 0.225, rechts: 0.225 },
  remis: { stay: 0.45, links: 0.275, rechts: 0.275 },
  niederlage: { stay: 0.32, links: 0.38, rechts: 0.3 },
  // (F) Erste Runde: Häufigkeit der Züge in den Daten von Wang u. a. 2014 (R 0,36, P 0,33, S 0,32 bei 354 Spielern)
  start: [0.36, 0.33, 0.31],
};
export const WIEDERHOLUNG_BELEGT = 0.44; // (F) Wang & Xu 2014, Tab. 2, a = 2

/** Kleiner deterministischer Zufallsgenerator (mulberry32) */
export function zufall(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const zieheAus = (rng, p) => {
  const u = rng();
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    s += p[i];
    if (u < s) return i;
  }
  return p.length - 1;
};

/** Verteilung des nächsten Menschen-Zugs nach letztem eigenen Zug z und eigenem Ergebnis (+1 Sieg, 0, −1 Niederlage) */
export function menschVerteilung(z, ergMensch, modell = MENSCH) {
  const m = ergMensch > 0 ? modell.sieg : ergMensch < 0 ? modell.niederlage : modell.remis;
  const p = [0, 0, 0];
  p[z] += m.stay;
  p[(z + 2) % 3] += m.links; // z − 1
  p[(z + 1) % 3] += m.rechts; // z + 1
  return p;
}

/** Erwarteter Gewinn (Siege − Niederlagen) eines Zugs gegen eine Verteilung des Gegners */
export const erwartung = (zug, p) => p.reduce((s, pj, j) => s + pj * ergebnis(zug, j), 0);

/**
 * Taktik von Rot: Sie geht davon aus, dass der Gegner das Mensch-Muster spielt, und wählt den Zug mit dem höchsten
 * erwarteten Gewinn. Gegen einen Zufallsspieler weiß sie nichts davon. Erste Runde: Zufall.
 */
export function taktikZug(rng, letzterGegner, ergGegner, modell = MENSCH) {
  if (letzterGegner === null) return Math.floor(rng() * 3);
  const p = menschVerteilung(letzterGegner, ergGegner, modell);
  let beste = [0], bestW = -Infinity;
  for (let z = 0; z < 3; z++) {
    const w = erwartung(z, p);
    if (w > bestW + 1e-12) { bestW = w; beste = [z]; } else if (Math.abs(w - bestW) <= 1e-12) beste.push(z);
  }
  return beste[Math.floor(rng() * beste.length)];
}

/**
 * Ein Lauf. gegner: "zufall" (gleichverteilt), "mensch" (Mensch-Modell), "mensch-wuerfelt" (Mensch-Modell bis Runde
 * wechselRunde − 1, danach gleichverteilt). Rot und Cyan ziehen aus getrennten Zufallsströmen: Die ersten Runden
 * von „mensch“ und „mensch-wuerfelt“ sind bei gleichem Seed identisch.
 */
export function spiele({ seed = 1, runden = 100, gegner = "zufall", wechselRunde = 51, modell = MENSCH } = {}) {
  const rngT = zufall(seed * 2654435761 + 11);
  const rngG = zufall(seed * 40503 + 977);
  const rundenListe = [];
  let siegeRot = 0, siegeCyan = 0, remis = 0;
  let letzterG = null, ergG = 0;
  for (let r = 1; r <= runden; r++) {
    const rot = taktikZug(rngT, letzterG, ergG, modell);
    const zufaellig = gegner === "zufall" || (gegner === "mensch-wuerfelt" && r >= wechselRunde);
    const cyanZufall = zieheAus(rngG, [1 / 3, 1 / 3, 1 / 3]);
    let cyan;
    if (zufaellig) cyan = cyanZufall;
    else if (letzterG === null) cyan = zieheAus(rngG, modell.start);
    else cyan = zieheAus(rngG, menschVerteilung(letzterG, ergG, modell));
    const erg = ergebnis(rot, cyan); // aus Sicht von Rot
    if (erg > 0) siegeRot++; else if (erg < 0) siegeCyan++; else remis++;
    rundenListe.push({ r, rot, cyan, erg, siegeRot, siegeCyan, remis, vorsprung: siegeRot - siegeCyan, vorigesErgCyan: letzterG === null ? null : ergG });
    letzterG = cyan;
    ergG = -erg;
  }
  return { seed, gegner, runden: rundenListe, siegeRot, siegeCyan, remis, vorsprung: siegeRot - siegeCyan };
}

/** Führungswechsel (Vorzeichenwechsel des Vorsprungs, Gleichstand zählt nicht als Führung) */
export function fuehrungswechsel(lauf) {
  const w = [];
  let f = 0;
  for (const r of lauf.runden) {
    const g = Math.sign(r.vorsprung);
    if (g !== 0 && g !== f) { if (f !== 0) w.push({ r: r.r, zu: g > 0 ? "rot" : "cyan" }); f = g; }
  }
  return w;
}
/** Wer führt zuerst (erste Runde mit Vorsprung ≠ 0) */
export const ersteFuehrung = (lauf) => { const r = lauf.runden.find((x) => x.vorsprung !== 0); return r ? (r.vorsprung > 0 ? "rot" : "cyan") : null; };
/** Vorsprung nach Runde n (aus Sicht Rot) */
export const vorsprungNach = (lauf, n) => lauf.runden[Math.min(n, lauf.runden.length) - 1].vorsprung;

/** Monte-Carlo über n Wiederholungen: Verteilung des Endstands nach `runden` Runden */
export function monteCarlo({ n = 100000, runden = 100, gegner = "zufall", seed0 = 1, wechselRunde = 51 } = {}) {
  let rotVorn = 0, gleich = 0, cyanVorn = 0, summe = 0, summeQ = 0, rotSiege = 0, cyanSiege = 0, remis = 0;
  let h1 = 0, h2 = 0;
  const diffs = [];
  for (let i = 0; i < n; i++) {
    const l = spiele({ seed: seed0 + i, runden, gegner, wechselRunde });
    const d = l.vorsprung;
    diffs.push(d);
    if (d > 0) rotVorn++; else if (d < 0) cyanVorn++; else gleich++;
    summe += d; summeQ += d * d; rotSiege += l.siegeRot; cyanSiege += l.siegeCyan; remis += l.remis;
    const mitte = l.runden[Math.min(wechselRunde - 1, runden) - 1].vorsprung;
    h1 += mitte; h2 += d - mitte;
  }
  diffs.sort((a, b) => a - b);
  const q = (p) => diffs[Math.min(n - 1, Math.floor(p * n))];
  const mittel = summe / n;
  return {
    n, runden, gegner,
    anteilRotVorn: rotVorn / n, anteilGleich: gleich / n, anteilCyanVorn: cyanVorn / n,
    mittlererVorsprung: mittel, standardabweichung: Math.sqrt(summeQ / n - mittel * mittel),
    mittlereSiegeRot: rotSiege / n, mittlereSiegeCyan: cyanSiege / n, mittlereRemis: remis / n,
    vorsprungErsteHaelfte: h1 / n, vorsprungZweiteHaelfte: h2 / n,
    quantile: { p05: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95) },
    absMedian: diffs.map(Math.abs).sort((a, b) => a - b)[Math.floor(n / 2)],
  };
}

/**
 * „Warum?“: Wie oft gewinnt Rot (bzw. Cyan) in Runden, die auf einen Sieg / ein Unentschieden / eine Niederlage des
 * Menschen folgen? Mittel über n Läufe gegen das Mensch-Modell.
 */
export function warumFaktoren({ n = 20000, runden = 100, seed0 = 500001 } = {}) {
  const z = { sieg: [0, 0, 0, 0], remis: [0, 0, 0, 0], niederlage: [0, 0, 0, 0] }; // [Runden, Rot gewinnt, Cyan gewinnt, Unentschieden]
  for (let i = 0; i < n; i++) {
    const l = spiele({ seed: seed0 + i, runden, gegner: "mensch" });
    for (const r of l.runden) {
      if (r.vorigesErgCyan === null) continue;
      const k = r.vorigesErgCyan > 0 ? z.sieg : r.vorigesErgCyan < 0 ? z.niederlage : z.remis;
      k[0]++;
      if (r.erg > 0) k[1]++; else if (r.erg < 0) k[2]++; else k[3]++;
    }
  }
  const out = {};
  for (const [k, v] of Object.entries(z)) out[k] = { runden: v[0] / n, rotGewinnt: v[1] / v[0], cyanGewinnt: v[2] / v[0], remis: v[3] / v[0], nettoRot: (v[1] - v[2]) / n };
  return out;
}

/** Wiederholungsrate des Mensch-Modells über alle Runden, im Spiel gegen Rot (muss zur belegten Rate passen) */
export function wiederholungsrate({ n = 5000, runden = 100, seed0 = 900001 } = {}) {
  let bleibt = 0, summe = 0;
  for (let i = 0; i < n; i++) {
    const l = spiele({ seed: seed0 + i, runden, gegner: "mensch" });
    for (let k = 1; k < l.runden.length; k++) { summe++; if (l.runden[k].cyan === l.runden[k - 1].cyan) bleibt++; }
  }
  return bleibt / summe;
}
/** Erwartete Wiederholungsrate des Modells, wenn Sieg/Remis/Niederlage gleich häufig sind (so ist 44 % definiert) */
export const modellWiederholung = (m = MENSCH) => (m.sieg.stay + m.remis.stay + m.niederlage.stay) / 3;

/**
 * Auswahl der drei Läufe für das Video nach festen Kriterien (transparent, keine handverlesenen Ausreißer):
 *  - Zufall: Endstand höchstens 3 Siege Unterschied (typisch; der Median von |Vorsprung| liegt bei ca. 5), Rot führt zuerst,
 *    Cyan überholt später, mindestens 3 Führungswechsel.
 *  - Mensch: Endvorsprung von Rot innerhalb von ±3 um den Median der Verteilung, Cyan führt in den ersten 8 Runden
 *    mindestens einmal (Führungswechsel), danach zieht Rot davon.
 *  - Mensch würfelt ab Runde 51: gleicher Seed wie „Mensch“; Vorsprung in den Runden 51–100 höchstens ±3.
 */
export function waehleLaeufe({ medianMensch = null } = {}) {
  const med = medianMensch ?? monteCarlo({ n: 20000, gegner: "mensch" }).quantile.p50;
  let zufallSeed = null;
  for (let s = 1; s < 5000 && zufallSeed === null; s++) {
    const l = spiele({ seed: s, gegner: "zufall" });
    if (Math.abs(l.vorsprung) <= 3 && ersteFuehrung(l) === "rot" && fuehrungswechsel(l).length >= 3 && l.remis >= 30 && l.remis <= 37 && l.runden[9].vorsprung >= 2 && vorsprungNach(l, 40) <= -1) zufallSeed = s;
  }
  let menschSeed = null;
  for (let s = 1; s < 5000 && menschSeed === null; s++) {
    const l = spiele({ seed: s, gegner: "mensch" });
    const w = spiele({ seed: s, gegner: "mensch-wuerfelt" });
    const zweite = w.vorsprung - vorsprungNach(w, 50);
    const frueh = l.runden.slice(0, 8).some((r) => r.vorsprung < 0);
    if (Math.abs(l.vorsprung - med) <= 3 && frueh && vorsprungNach(l, 20) >= 3 && Math.abs(zweite) <= 3 && vorsprungNach(w, 50) >= 6) menschSeed = s;
  }
  return { zufallSeed, menschSeed, medianMensch: med };
}

/** Die drei Läufe, die das Video zeigt */
export function videoLaeufe() {
  const { zufallSeed, menschSeed, medianMensch } = waehleLaeufe();
  return {
    seeds: { zufall: zufallSeed, mensch: menschSeed },
    medianMensch,
    zufall: spiele({ seed: zufallSeed, gegner: "zufall" }),
    mensch: spiele({ seed: menschSeed, gegner: "mensch" }),
    wuerfelt: spiele({ seed: menschSeed, gegner: "mensch-wuerfelt" }),
  };
}
