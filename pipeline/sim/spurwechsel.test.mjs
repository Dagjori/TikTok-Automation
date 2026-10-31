// Tests für das Spurwechsel-Modell:  node --test pipeline/sim/spurwechsel.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { SpurSim, kennzahlen, duelle, ZELLE_M } from "./spurwechsel.mjs";

const klein = { ringM: 3000, einschwingS: 200, streckeM: 1000 };

function pruefeZustand(sim) {
  const belegt = new Set();
  for (let i = 0; i < sim.n; i++) {
    const k = sim.spur[i] * sim.L + sim.x[i];
    assert.ok(!belegt.has(k), `zwei Fahrzeuge in Zelle ${k}`);
    belegt.add(k);
    assert.equal(sim.occ[sim.spur[i]][sim.x[i]], i);
    assert.ok(sim.v[i] >= 0 && sim.v[i] <= sim.vmax);
  }
  let zaehler = 0;
  for (const o of sim.occ) for (const j of o) if (j !== -1) zaehler++;
  assert.equal(zaehler, sim.n, "Belegung und Fahrzeugzahl passen nicht");
}

test("gleicher Seed ergibt exakt den gleichen Lauf", () => {
  const a = new SpurSim({ seed: 7, parameter: klein });
  const b = new SpurSim({ seed: 7, parameter: klein });
  a.laufe();
  b.laufe();
  assert.deepEqual(Array.from(a.renn.zeit), Array.from(b.renn.zeit));
  assert.deepEqual(Array.from(a.renn.wechsel), Array.from(b.renn.wechsel));
});

test("keine Kollisionen, Fahrzeugzahl bleibt, Tempo in [0, vmax], Weg = Summe der Tempi", () => {
  const sim = new SpurSim({ seed: 3, parameter: { ...klein, dichteKmSpur: 60 } });
  const weg0 = Float64Array.from(sim.weg);
  let summe = new Float64Array(sim.n);
  for (let k = 0; k < 400; k++) {
    sim.schritt();
    pruefeZustand(sim);
    for (let i = 0; i < sim.n; i++) summe[i] += sim.v[i];
  }
  for (let i = 0; i < sim.n; i++) assert.equal(sim.weg[i] - weg0[i], summe[i]);
});

test("Spurhalter wechseln nie, Spurwechsler schon", () => {
  const sim = new SpurSim({ seed: 5, parameter: klein });
  const spur0 = Uint8Array.from(sim.spur);
  for (let k = 0; k < 600; k++) sim.schritt();
  let wechslerGewechselt = 0;
  for (let i = 0; i < sim.n; i++) {
    if (sim.typ[i] === 0) {
      assert.equal(sim.wechselGesamt[i], 0);
      assert.equal(sim.spur[i], spur0[i]);
    } else wechslerGewechselt += sim.wechselGesamt[i];
  }
  assert.ok(wechslerGewechselt > 0, "kein einziger Spurwechsel");
});

test("Spurwechsel nur mit Platz hinter sich (Tempo des neuen Hintermanns + Sicherheitsabstand)", () => {
  for (const sicherheitZellen of [0, 1, 2]) {
    const sim = new SpurSim({ seed: 11, parameter: { ...klein, sicherheitZellen } });
    for (let k = 0; k < 300; k++) {
      // Zustand vor dem Schritt merken, nach dem Schritt jeden Wechsel prüfen
      const x0 = Int32Array.from(sim.x), s0 = Uint8Array.from(sim.spur), v0 = Int8Array.from(sim.v);
      const occ0 = [Int32Array.from(sim.occ[0]), Int32Array.from(sim.occ[1])];
      sim.schritt();
      for (let i = 0; i < sim.n; i++) {
        if (sim.spur[i] === s0[i]) continue;
        const o = sim.spur[i];
        assert.equal(occ0[o][x0[i]], -1, "Zielzelle war belegt");
        for (let d = 1; d <= sim.vmax + sicherheitZellen + 1; d++) {
          const j = occ0[o][(x0[i] - d + sim.L) % sim.L];
          if (j === -1) continue;
          assert.ok(d - 1 >= v0[j] + sicherheitZellen, `Hintermann zu nah: Lücke ${d - 1}, Tempo ${v0[j]}`);
          break;
        }
      }
    }
  }
});

test("Überholzählung: ein fahrendes Auto zieht genau einmal an einem stehenden vorbei", () => {
  // Spur 0: A steht hinter einer Kolonne, Spur 1: ein Auto fährt vorbei
  const sim = new SpurSim({
    seed: 1,
    parameter: { ringM: 300, dichteKmSpur: 0, einschwingS: 0, streckeM: 10000, maxS: 30, troedel: 0, anfahrTroedel: 0 },
  });
  // eigene Belegung: Spurhalter A (Spur 0, Zelle 10); Kolonne aus 3 Autos direkt davor (Zellen 11–13, Spur 0)
  const autos = [[0, 10], [0, 11], [0, 12], [0, 13], [1, 2]];
  sim.n = autos.length;
  for (const a of ["x", "spur", "v", "typ", "sperre", "weg", "wechselGesamt"]) sim[a] = new sim[a].constructor(sim.n);
  sim._x0 = new Int32Array(sim.n); sim._s0 = new Uint8Array(sim.n); sim._gewechselt = new Uint8Array(sim.n);
  sim.occ[0].fill(-1); sim.occ[1].fill(-1);
  autos.forEach(([s, x], i) => { sim.spur[i] = s; sim.x[i] = x; sim.occ[s][x] = i; });
  // Ohne Trödeln löst sich die Kolonne von vorn auf: A fährt erst in Sekunde 4 an (auf Zelle 11).
  // Das Auto in Spur 1 fährt 1, 2, 3, 3 Zellen (2 → 11) und zieht dabei genau einmal an A vorbei.
  sim.starteRennen();
  for (let k = 0; k < 4; k++) sim.schritt();
  assert.equal(sim.x[0], 11);
  assert.equal(sim.x[4], 11);
  assert.equal(sim.renn.nUeberholtWerden[0], 1);
  assert.equal(sim.renn.sekUeberholtWerden[0], 1);
  assert.equal(sim.renn.nUeberholen[4], 1);
  assert.equal(sim.renn.nUeberholen[0], 0);
});

test("Überholzählung ist symmetrisch: Summe überholt = Summe wird überholt (ohne Wechsler, niemand im Ziel)", () => {
  const sim = new SpurSim({ seed: 21, parameter: { ...klein, anteilWechsler: 0, streckeM: 1e9 } });
  for (let k = 0; k < 200; k++) sim.schritt();
  sim.starteRennen();
  for (let k = 0; k < 300; k++) sim.schritt();
  const s = (a) => a.reduce((x, y) => x + y, 0);
  assert.equal(s(sim.renn.nUeberholen), s(sim.renn.nUeberholtWerden));
  assert.ok(s(sim.renn.nUeberholen) > 50);
});

test("Rennen: alle kommen an, Fahrzeit plausibel (zwischen freier Fahrt und Notbremse)", () => {
  const sim = new SpurSim({ seed: 2, parameter: klein });
  sim.laufe();
  const frei = 1000 / (3 * ZELLE_M);
  for (let i = 0; i < sim.n; i++) {
    assert.ok(Number.isFinite(sim.renn.zeit[i]));
    assert.ok(sim.renn.zeit[i] >= frei - 1, `zu schnell: ${sim.renn.zeit[i]}`);
  }
  const k = kennzahlen(sim);
  assert.ok(k.halter.anzahl > 0 && k.wechsler.anzahl > 0);
  assert.ok(k.wechsler.spurwechsel > 0);
  assert.equal(k.halter.spurwechsel, 0);
  for (const d of duelle(sim)) assert.notEqual(sim.typ[d.wechsler], sim.typ[d.halter]);
});
