/**
 * Mikromodell „Spurwechsel im Stau: Bist du auf der anderen Spur wirklich schneller?“ (Simulierbar)
 *
 * Nagel-Schreckenberg-Zellularautomat (NaSch) mit zwei Spuren auf einem Ring (periodischer Rand).
 * Der Ring hält die Verkehrsdichte konstant: Es herrscht dauerhaft dichter Stop-and-go-Verkehr,
 * ohne dass ein Engpass den Vergleich verzerrt. Reines ES-Modul: läuft in Node und im Browser.
 *
 * Zelle = 7,5 m, Zeitschritt = 1 s. Spur 0 = rechts, Spur 1 = links (beide gleichwertig, kein Rechtsfahrgebot).
 *
 * Zwei Fahrertypen
 *   0 Spurhalter:   wechselt nie die Spur.
 *   1 Spurwechsler: wechselt, sobald die Nachbarspur schneller wirkt und der Wechsel sicher ist.
 *     „Wirkt schneller“: Das Tempo, das in der nächsten Sekunde möglich scheint, ist nebenan höher.
 *       möglich(Spur) = min(vmax, v + 1, Lücke + Tempo des Vordermanns)
 *       (Lücke = freie Zellen bis zum Vordermann; rollt der Vordermann, wirkt die Spur schneller.)
 *     „Sicher“: Die Zelle nebenan ist frei, und hinter mir bleibt Platz für den neuen Hintermann:
 *       freie Zellen hinter mir >= Tempo des neuen Hintermanns + `sicherheitZellen` (Standard 1 Zelle = 7,5 m).
 *       Mit 0 quetscht sich der Wechsler in jede Lücke, in die er gerade so passt (Variante „Drängler“).
 *     Nach einem Wechsel vergehen mindestens `sperreS` Sekunden bis zum nächsten (Spurwechsel dauert).
 *
 * Regeln je Zeitschritt (alle Fahrzeuge parallel)
 *   1. Spurwechsel: Entscheidung aller Spurwechsler auf Basis des alten Zustands, dann seitlicher Versatz.
 *      Zwei Spuren: Die Zielzelle (andere Spur, gleiche Position) kann nur ein Fahrzeug wollen, also keine Konflikte.
 *   2. Bewegung nach NaSch mit „slow-to-start“ (VDR):
 *      v = min(v + 1, vmax); v = min(v, Lücke); mit Wahrscheinlichkeit p (bzw. p0 aus dem Stand): v = v − 1; x += v.
 *
 * Messung („Rennen“): Ab dem Zeitpunkt `startS` (nach der Einschwingzeit) fährt jedes Fahrzeug `streckeM` weit.
 *   Fahrzeit, Spurwechsel und Überholvorgänge werden je Fahrzeug bis zum Ziel gezählt.
 *   Überholen: Ein Fahrzeug der Nachbarspur zieht an mir vorbei (wird überholt) bzw. ich an ihm (überhole).
 *   Gleichauf zählt die linke Spur als vorn (fester Gleichstand-Bruch, damit nichts doppelt gezählt wird).
 *
 * Zufall: drei getrennte Ströme mit festem Seed (Aufbau, Trödeln, frei). Gleicher Seed = exakt gleicher Lauf.
 * Grenzen: nur Pkw, gleiches Wunschtempo, sofortiger Seitenwechsel, 7,5-m-Zellen. Siehe sim_ergebnisse.md.
 */

export const ZELLE_M = 7.5;
export const SCHRITT_S = 1;

/** Standardparameter (Annahmen, Begründung in sim_ergebnisse.md). */
export const STANDARD_PARAMETER = Object.freeze({
  ringM: 10000, // Ringlänge je Spur
  dichteKmSpur: 40, // Fahrzeuge je km und Spur (dichter Stau, Stop-and-go)
  anteilWechsler: 0.3, // Anteil der Spurwechsler am übrigen Verkehr
  vmax: 3, // Zellen/s = 22,5 m/s = 81 km/h (wie im Reißverschluss-Modell; Stop-and-go erreicht selten mehr)
  troedel: 0.2, // p, Trödeln in Fahrt
  anfahrTroedel: 0.5, // p0, Trödeln aus dem Stand (slow-to-start, erzeugt Stop-and-go-Wellen)
  sperreS: 3, // Mindestzeit zwischen zwei Spurwechseln
  sicherheitZellen: 1, // zusätzlicher Abstand zum neuen Hintermann (Zellen) über dessen Tempo hinaus (1 Zelle = 7,5 m)
  wechselOhneBeschleunigung: false, // true: im Schritt des Wechsels kein Beschleunigen (Wechsel kostet Tempo)
  einschwingS: 1200, // Einschwingzeit vor dem Start
  streckeM: 5000, // Länge des Rennens
  maxS: 6000, // Notbremse
});

export const TYPEN = Object.freeze({ HALTER: 0, WECHSLER: 1 });

// ---------------------------------------------------------------------------
// Zufallszahlen (wie reissverschluss.mjs)

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function zufall() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mischeSeed(seed, salz) {
  let h = ((seed >>> 0) ^ Math.imul(salz + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// ---------------------------------------------------------------------------

export class SpurSim {
  /**
   * @param {object} opt
   * @param {number} opt.seed
   * @param {object} [opt.parameter]  überschreibt STANDARD_PARAMETER
   * @param {(i:number, zufall:()=>number)=>number} [opt.typVon]  eigener Typ je Fahrzeug (Standard: zufällig nach Anteil)
   */
  constructor({ seed = 1, parameter = {}, typVon = null } = {}) {
    const p = { ...STANDARD_PARAMETER, ...parameter };
    this.p = p;
    this.seed = seed;
    this.vmax = p.vmax;
    this.L = Math.round(p.ringM / ZELLE_M);
    this.zAufbau = mulberry32(mischeSeed(seed, 1));
    this.zTroedel = mulberry32(mischeSeed(seed, 2));

    const L = this.L;
    const n = Math.round((p.dichteKmSpur * p.ringM) / 1000) * 2;
    if (n > 2 * L) throw new Error("Dichte zu hoch");
    this.n = n;
    this.x = new Int32Array(n);
    this.spur = new Uint8Array(n);
    this.v = new Int8Array(n);
    this.typ = new Uint8Array(n);
    this.sperre = new Int16Array(n);
    this.weg = new Float64Array(n); // zurückgelegte Zellen seit Beginn (entrollt)
    this.wechselGesamt = new Int32Array(n);
    this.occ = [new Int32Array(L).fill(-1), new Int32Array(L).fill(-1)];

    // zufällige, verschiedene Startzellen auf beiden Spuren (Ziehen ohne Zurücklegen)
    const zellen = new Int32Array(2 * L);
    for (let k = 0; k < 2 * L; k++) zellen[k] = k;
    for (let k = 0; k < n; k++) {
      const j = k + Math.floor(this.zAufbau() * (2 * L - k));
      const tmp = zellen[k];
      zellen[k] = zellen[j];
      zellen[j] = tmp;
    }
    for (let i = 0; i < n; i++) {
      const z = zellen[i];
      this.spur[i] = z >= L ? 1 : 0;
      this.x[i] = z % L;
      this.v[i] = 0;
      this.occ[this.spur[i]][this.x[i]] = i;
    }
    for (let i = 0; i < n; i++) {
      this.typ[i] = typVon ? typVon(i, this.zAufbau) : this.zAufbau() < p.anteilWechsler ? 1 : 0;
    }
    this.t = 0;
    this.renn = null;
    // Zwischenspeicher für die Überhol-Zählung
    this._x0 = new Int32Array(n);
    this._s0 = new Uint8Array(n);
    this._occ0 = [new Int32Array(L), new Int32Array(L)];
    this._gewechselt = new Uint8Array(n);
  }

  /** Abstand b − a auf dem Ring, in (−L/2, L/2] */
  rel(a, b) {
    const L = this.L;
    let d = (b - a) % L;
    if (d < 0) d += L;
    if (d > L / 2) d -= L;
    return d;
  }

  /** freie Zellen bis zum Vordermann (bis max) und dessen Tempo (vmax, falls keiner in Sicht) */
  vorn(spur, x, max) {
    const occ = this.occ[spur];
    const L = this.L;
    for (let k = 1; k <= max + 1; k++) {
      const j = occ[(x + k) % L];
      if (j !== -1) return { luecke: k - 1, vv: this.v[j] };
    }
    return { luecke: max, vv: this.vmax };
  }

  /** freie Zellen bis zum Hintermann (bis max) und dessen Tempo (0, falls keiner in Reichweite) */
  hinten(spur, x, max) {
    const occ = this.occ[spur];
    const L = this.L;
    for (let k = 1; k <= max + 1; k++) {
      const j = occ[(x - k + L) % L];
      if (j !== -1) return { luecke: k - 1, vh: this.v[j] };
    }
    return { luecke: max, vh: 0 };
  }

  /** Möglich wirkendes Tempo in einer Spur (siehe Kopfkommentar) */
  moeglich(v, luecke, vv) {
    return Math.min(this.vmax, v + 1, luecke + vv);
  }

  /** Startet die Messung: jedes Fahrzeug fährt ab jetzt `streckeM` */
  starteRennen() {
    const n = this.n;
    const r = {
      t0: this.t,
      ziel: this.p.streckeM / ZELLE_M,
      start: Float64Array.from(this.weg),
      startX: Int32Array.from(this.x),
      startSpur: Uint8Array.from(this.spur),
      zeit: new Float64Array(n).fill(NaN),
      wechsel: new Int32Array(n),
      sekUeberholtWerden: new Int32Array(n), // Sekunden, in denen mich mindestens ein Auto der Nachbarspur überholt
      sekUeberholen: new Int32Array(n), // Sekunden, in denen ich mindestens ein Auto der Nachbarspur überhole
      nUeberholtWerden: new Int32Array(n), // Anzahl Autos, die mich überholen
      nUeberholen: new Int32Array(n), // Anzahl Autos, die ich überhole
      sekNachbarSchneller: new Int32Array(n), // Nachbar auf gleicher Höhe fährt schneller als ich
      sekNachbarLangsamer: new Int32Array(n),
      sekStand: new Int32Array(n), // Sekunden mit v = 0
      sek: new Int32Array(n), // gemessene Sekunden
      fertig: 0,
    };
    this.renn = r;
    return r;
  }

  schritt() {
    const { n, L, vmax, occ, x, spur, v, typ, sperre } = this;
    const r = this.renn;
    // Zustand vorher sichern (für Überhol-Zählung)
    if (r) {
      this._x0.set(x);
      this._s0.set(spur);
      this._occ0[0].set(occ[0]);
      this._occ0[1].set(occ[1]);
    }
    const gew = this._gewechselt;
    gew.fill(0);

    // 1. Spurwechsel (Entscheidung auf dem alten Zustand)
    const wechsler = [];
    for (let i = 0; i < n; i++) {
      if (typ[i] !== 1) continue;
      if (sperre[i] > 0) continue;
      const s = spur[i];
      const o = 1 - s;
      const xi = x[i];
      if (occ[o][xi] !== -1) continue;
      const vi = v[i];
      const eigen = this.vorn(s, xi, 2 * vmax);
      const nachbar = this.vorn(o, xi, 2 * vmax);
      if (this.moeglich(vi, nachbar.luecke, nachbar.vv) <= this.moeglich(vi, eigen.luecke, eigen.vv)) continue;
      const h = this.hinten(o, xi, vmax + this.p.sicherheitZellen);
      if (h.luecke < h.vh + this.p.sicherheitZellen) continue;
      wechsler.push(i);
    }
    for (const i of wechsler) {
      const s = spur[i];
      occ[s][x[i]] = -1;
      spur[i] = 1 - s;
      occ[1 - s][x[i]] = i;
      sperre[i] = this.p.sperreS;
      this.wechselGesamt[i]++;
      gew[i] = 1;
      if (r && Number.isNaN(r.zeit[i])) r.wechsel[i]++;
    }
    for (let i = 0; i < n; i++) if (sperre[i] > 0 && !gew[i]) sperre[i]--;

    // 2. Bewegung (NaSch mit slow-to-start), parallel auf dem neuen Zustand
    const vNeu = new Int8Array(n);
    const pT = this.p.troedel;
    const p0 = this.p.anfahrTroedel;
    for (let i = 0; i < n; i++) {
      let vn = v[i] + 1;
      if (vn > vmax) vn = vmax;
      if (gew[i] && this.p.wechselOhneBeschleunigung && vn > v[i]) vn = v[i];
      const o = occ[spur[i]];
      let luecke = vmax;
      for (let k = 1; k <= vmax; k++) {
        if (o[(x[i] + k) % L] !== -1) {
          luecke = k - 1;
          break;
        }
      }
      if (vn > luecke) vn = luecke;
      const zz = this.zTroedel(); // wird immer gezogen (Reproduzierbarkeit)
      if (vn > 0 && zz < (v[i] === 0 ? p0 : pT)) vn -= 1;
      vNeu[i] = vn;
    }
    occ[0].fill(-1);
    occ[1].fill(-1);
    for (let i = 0; i < n; i++) {
      v[i] = vNeu[i];
      x[i] = (x[i] + vNeu[i]) % L;
      this.weg[i] += vNeu[i];
      occ[spur[i]][x[i]] = i;
    }
    this.t += SCHRITT_S;
    if (r) this._messen();
  }

  _messen() {
    const r = this.renn;
    const { n, L, vmax, x, spur, v } = this;
    const x0 = this._x0, s0 = this._s0, occ0 = this._occ0;
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(r.zeit[i])) continue;
      const gefahren = this.weg[i] - r.start[i];
      // Ziel erreicht? Zeitpunkt innerhalb der Sekunde linear eingeordnet
      if (gefahren >= r.ziel) {
        const vor = gefahren - v[i];
        const anteil = v[i] > 0 ? (r.ziel - vor) / v[i] : 1;
        r.zeit[i] = this.t - 1 - r.t0 + anteil;
        r.fertig++;
      }
      r.sek[i]++;
      if (v[i] === 0) r.sekStand[i]++;
      // Überholen: nur wenn ich in dieser Sekunde nicht die Spur gewechselt habe
      if (this._gewechselt[i] || s0[i] !== spur[i]) continue;
      const si = spur[i];
      const o = 1 - si;
      let wurdeUeberholt = 0, hatUeberholt = 0;
      for (let k = -vmax - 1; k <= vmax + 1; k++) {
        const j = occ0[o][(x0[i] + k + L) % L];
        if (j === -1) continue;
        if (s0[j] !== o || spur[j] !== o) continue; // muss die ganze Sekunde nebenan gewesen sein
        const d0 = 2 * this.rel(x0[i], x0[j]) + (o - si); // > 0: j vorn (gleichauf: linke Spur vorn)
        const d1 = 2 * this.rel(x[i], x[j]) + (o - si);
        if (d0 < 0 && d1 > 0) wurdeUeberholt++;
        else if (d0 > 0 && d1 < 0) hatUeberholt++;
      }
      if (wurdeUeberholt) r.sekUeberholtWerden[i]++;
      if (hatUeberholt) r.sekUeberholen[i]++;
      r.nUeberholtWerden[i] += wurdeUeberholt;
      r.nUeberholen[i] += hatUeberholt;
      // Nachbar auf gleicher Höhe (nächstes Fahrzeug nebenan innerhalb ±2 Zellen)
      let best = -1, bestD = 99;
      for (let k = -2; k <= 2; k++) {
        const j = this.occ[o][(x[i] + k + L) % L];
        if (j !== -1 && Math.abs(k) < bestD) {
          bestD = Math.abs(k);
          best = j;
        }
      }
      if (best >= 0) {
        if (v[best] > v[i]) r.sekNachbarSchneller[i]++;
        else if (v[best] < v[i]) r.sekNachbarLangsamer[i]++;
      }
    }
  }

  /** Einschwingen, Rennen starten, bis alle im Ziel sind. beiSchritt(sim) nach jedem Schritt im Rennen. */
  laufe({ beiSchritt = null, beiStart = null } = {}) {
    while (this.t < this.p.einschwingS) this.schritt();
    this.starteRennen();
    if (beiStart) beiStart(this);
    while (this.renn.fertig < this.n && this.t < this.p.maxS) {
      this.schritt();
      if (beiSchritt) beiSchritt(this);
    }
    return this.renn;
  }
}

// ---------------------------------------------------------------------------
// Auswertung eines Laufs

const mittel = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const median = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((p, q) => p - q);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Kennzahlen je Typ aus einem fertigen Rennen */
export function kennzahlen(sim) {
  const r = sim.renn;
  const proTyp = {};
  for (const [name, typ] of [["halter", 0], ["wechsler", 1]]) {
    const idx = [];
    for (let i = 0; i < sim.n; i++) if (sim.typ[i] === typ && !Number.isNaN(r.zeit[i])) idx.push(i);
    const summe = (arr) => idx.reduce((s, i) => s + arr[i], 0);
    const sekGesamt = summe(r.sek);
    proTyp[name] = {
      anzahl: idx.length,
      fahrzeitS: mittel(idx.map((i) => r.zeit[i])),
      fahrzeitMedianS: median(idx.map((i) => r.zeit[i])),
      spurwechsel: mittel(idx.map((i) => r.wechsel[i])),
      spurwechselMedian: median(idx.map((i) => r.wechsel[i])),
      // Zeitanteile über alle Sekunden des Typs (gewichtet nach Fahrzeit)
      anteilZeitUeberholtWerden: summe(r.sekUeberholtWerden) / sekGesamt,
      anteilZeitUeberholen: summe(r.sekUeberholen) / sekGesamt,
      autosUeberholtWerden: mittel(idx.map((i) => r.nUeberholtWerden[i])),
      autosUeberholen: mittel(idx.map((i) => r.nUeberholen[i])),
      anteilNachbarSchneller: summe(r.sekNachbarSchneller) / sekGesamt,
      anteilNachbarLangsamer: summe(r.sekNachbarLangsamer) / sekGesamt,
      anteilStand: summe(r.sekStand) / sekGesamt,
    };
  }
  return proTyp;
}

/**
 * Direkte Duelle: Paare (Spurwechsler, Spurhalter), die beim Start nebeneinander stehen
 * (verschiedene Spuren, höchstens `toleranzZellen` auseinander). Liefert Zeitvorteil je Paar.
 */
export function duelle(sim, toleranzZellen = 1) {
  const r = sim.renn;
  const paare = [];
  for (let i = 0; i < sim.n; i++) {
    if (sim.typ[i] !== 1 || Number.isNaN(r.zeit[i])) continue;
    for (let j = 0; j < sim.n; j++) {
      if (sim.typ[j] !== 0 || Number.isNaN(r.zeit[j])) continue;
      if (r.startSpur[i] === r.startSpur[j]) continue;
      if (Math.abs(sim.rel(r.startX[i], r.startX[j])) > toleranzZellen) continue;
      paare.push({ wechsler: i, halter: j, vorteilS: r.zeit[j] - r.zeit[i] });
    }
  }
  return paare;
}
