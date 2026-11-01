// Tests: node --test sim/ampel.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { PARAMETER as P, AMPELN, BAHN, steuerung, druckZeiten, rennen, wartezeitVerteilung } from "./ampel.mjs";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);
const [A1, A2, A3] = AMPELN;

test("Bedarfsampel: ohne Druck nie Grün (Heidelberg/Bremen), mit Druck erst nach Kfz-Mindestfreigabe plus Gelb und Zwischenzeit", () => {
  const s = steuerung(A1);
  assert.equal(s.gruenPhasen(600).length, 0);
  assert.equal(s.gruenAb(10), Infinity);
  s.anfordern(20);
  nah(s.gruenAb(20), A1.kfzFreiAb + P.GELB + P.ZWISCHEN); // 45 s
  const t = steuerung(A1).anfordern(70); // Mindestfreigabe schon abgelaufen → „sofort“ (nur Gelb + Zwischenzeit)
  nah(t.gruenAb(70), 70 + P.GELB + P.ZWISCHEN);
});

test("Bedarfsampel: weitere Drücke ändern nichts (gespeicherte Anforderung)", () => {
  const ein = steuerung(A1).anfordern(28);
  const viele = steuerung(A1);
  for (let k = 0; k < 40; k++) viele.anfordern(28 + k * 0.4);
  assert.deepEqual(ein.gruenPhasen(200), viele.gruenPhasen(200));
});

test("Festzeit: Grün kommt im Takt, egal ob und wie oft gedrückt wird", () => {
  const ohne = steuerung(A2), mit = steuerung(A2);
  for (let k = 0; k < 30; k++) mit.anfordern(100 + k);
  assert.deepEqual(ohne.gruenPhasen(400), mit.gruenPhasen(400));
  assert.equal(ohne.signal(81), "gruen");
  assert.equal(ohne.signal(97), "rot");
  nah(ohne.gruenAb(100), 170);
});

test("Koordiniert: Druck vor dem Entscheidungszeitpunkt → dieses Fenster, eine Sekunde danach → nächster Umlauf", () => {
  const W = A3.versatz;
  nah(steuerung(A3).anfordern(W - A3.entscheidung - 0.01).gruenAb(W - 5), W);
  nah(steuerung(A3).anfordern(W - A3.entscheidung + 1).gruenAb(W - 4), W + A3.umlauf);
  assert.equal(steuerung(A3).gruenAb(W - 10), Infinity); // ohne Anforderung kein Fenster
});

test("„Signal kommt“ leuchtet ab dem ersten Druck bis Grün", () => {
  const s = steuerung(A1).anfordern(30);
  assert.equal(s.signalKommt(29), false);
  assert.equal(s.signalKommt(31), true);
  assert.equal(s.signalKommt(44.9), true);
  assert.equal(s.signalKommt(46), false);
  assert.equal(steuerung(A2).anfordern(100).signalKommt(101), false); // Festzeit: keine Rückmeldung
});

test("Druckzeiten: Max drückt eine Salve und dann alle 2 s, Lea genau einmal, bei Grün niemand", () => {
  const z = druckZeiten(10, 30, "viele");
  assert.equal(z.length, P.DRUECK_SALVE + Math.floor((30 - 0.3 - (10 + P.DRUECK_VERZUG + (P.DRUECK_SALVE - 1) * P.DRUECK_SALVE_TAKT)) / P.DRUECK_TAKT));
  assert.ok(z.every((t) => t >= 10 && t < 30));
  assert.deepEqual(druckZeiten(10, 30, "einmal"), [10 + P.DRUECK_VERZUG_LEA]);
  assert.deepEqual(druckZeiten(10, 10, "viele"), []);
});

test("Rennen: Gleichstand an Ampel 1, Max erwischt Ampel 2, verpasst Ampel 3, beide im selben Grün und in derselben Bahn", () => {
  const R = rennen();
  const { max, lea } = R.personen;
  // Ampel 1: Max ist zuerst da, beide bekommen in derselben Sekunde Grün
  assert.ok(max.ankunft[0] < lea.ankunft[0] - 10);
  nah(max.gruen[0], lea.gruen[0]);
  nah(max.gruen[0], 45);
  // Ampel 2: Max kommt 1 s vor Grünende an und geht, Lea bekommt Rot und wartet bis zum nächsten Umlauf
  nah(max.warte[1], 0);
  nah(A2.versatz + A2.gruen - max.ankunft[1], 1, 1e-6);
  nah(lea.gruen[1], A2.versatz + A2.umlauf);
  // Ampel 3: Max drückt knapp 1 s nach dem Entscheidungszeitpunkt → ganzer Umlauf; Lea kommt kurz vor dem nächsten Grün
  const spaet = max.druecke[2][0] - (A3.versatz - A3.entscheidung);
  assert.ok(spaet > 0.9 && spaet < 1.1, `zu spät um ${spaet}`);
  nah(max.gruen[2], A3.versatz + A3.umlauf);
  nah(lea.gruen[2], max.gruen[2]);
  assert.ok(lea.ankunft[2] < lea.gruen[2] && lea.gruen[2] - lea.ankunft[2] < 3);
  // Ziel: beide an der Insel vor der Bahn, dieselbe Bahn
  assert.ok(max.insel < BAHN.an && lea.insel < BAHN.an);
  assert.equal(max.bahn, lea.bahn);
  // Zahlen fürs Video
  assert.equal(max.druckSumme, 63);
  assert.equal(lea.druckSumme, 3);
  nah(max.warteSumme, 112.4, 0.05);
  nah(lea.warteSumme, 64.3, 0.05);
});

test("Rennen: Max mit nur einem Druck je Ampel hat exakt dieselben Zeiten (mehrfaches Drücken bringt 0 s)", () => {
  const viel = rennen();
  const ein = rennen({ personen: [{ id: "max", v: P.V_MAX, verhalten: "einmal" }, { id: "lea", v: P.V_LEA, verhalten: "einmal" }] });
  const p = { ...P, DRUECK_VERZUG_LEA: P.DRUECK_VERZUG }; // erster Druck zur selben Zeit
  const ein2 = rennen({ p, personen: [{ id: "max", v: P.V_MAX, verhalten: "einmal" }, { id: "lea", v: P.V_LEA, verhalten: "einmal" }] });
  for (const r of [ein, ein2]) {
    assert.deepEqual(r.personen.max.gruen, viel.personen.max.gruen);
    nah(r.personen.max.insel, viel.personen.max.insel);
    nah(r.personen.lea.insel, viel.personen.lea.insel);
  }
});

test("Rennen: Drückt an Ampel 1 keiner, wird es dort nie Grün", () => {
  const R = rennen({ personen: [{ id: "max", v: P.V_MAX, verhalten: "nie" }, { id: "lea", v: P.V_LEA, verhalten: "nie" }] });
  assert.equal(R.personen.max.gruen[0], Infinity);
  assert.equal(R.personen.lea.gruen[0], Infinity);
  assert.equal(R.ampeln[0].gruenPhasen.length, 0);
});

test("Monte Carlo: mittlere Wartezeit mit vielen Drücken = mit einem Druck (alle drei Steuerungen); ohne Druck an Bedarfsampeln nie Grün", () => {
  for (const a of AMPELN) {
    const e = wartezeitVerteilung(a, { verhalten: "einmal", n: 3000 });
    const v = wartezeitVerteilung(a, { verhalten: "viele", n: 3000 });
    nah(e.mittel, v.mittel, 1e-9);
    const nie = wartezeitVerteilung(a, { verhalten: "nie", n: 500 });
    if (a.typ === "festzeit") nah(nie.mittel, wartezeitVerteilung(a, { verhalten: "nie", n: 500 }).mittel);
    else assert.equal(nie.nieGruen, 1);
  }
  // Festzeit: Erwartungswert (U − g)² / (2U)
  const f = wartezeitVerteilung(A2, { n: 100000 });
  nah(f.mittel, (A2.umlauf - A2.gruen) ** 2 / (2 * A2.umlauf), 0.4);
});
