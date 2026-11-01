// Tests: node --test sim/treppe_aufzug.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { PARAMETER as P, treppe, treppeJeEtage, fahrt, aufzug, rennen, breakEven } from "./treppe_aufzug.mjs";

const nah = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);

test("Treppe: 20 Stufen je Etage, ca. 11,5 s je Etage, vertikal ca. 0,3 m/s (passt zu Messungen 0,20–0,35 m/s)", () => {
  const j = treppeJeEtage();
  assert.equal(j.stufen, 20);
  nah(j.lauf, (9 * 0.28) / 0.61);
  nah(j.etage, 2 * j.lauf + 2 * 1.6);
  const v = P.ETAGE_M / j.etage;
  assert.ok(v > 0.2 && v < 0.35, `vertikal ${v}`);
});

test("Treppe: Ermüdung macht jede Etage länger, Höhe steigt monoton bis zum Ziel", () => {
  const T = treppe(4);
  const d = T.etagen.slice(1).map((x, i) => x - T.etagen[i]);
  assert.ok(d[1] > d[0] && d[2] > d[1]);
  let h0 = -1;
  for (let t = 0; t <= T.zeit + 2; t += 0.05) {
    const h = T.hoehe(t);
    assert.ok(h >= h0 - 1e-9);
    h0 = h;
  }
  nah(T.hoehe(T.zeit), 4 * P.ETAGE_M);
  nah(T.hoehe(T.zeit + 10), 4 * P.ETAGE_M);
});

test("Fahrt: Trapezprofil (Strecke, Dauer, Endwert) und Dreieck bei kurzer Strecke", () => {
  const f = fahrt(14);
  nah(f.s(f.dauer), 14);
  nah(f.dauer, 14 / P.V_AUFZUG + P.V_AUFZUG / P.A_AUFZUG);
  const k = fahrt(1);
  nah(k.dauer, 2 * Math.sqrt(1 / P.A_AUFZUG));
  assert.ok(k.vmax < P.V_AUFZUG);
  nah(k.s(k.dauer / 2), 0.5);
});

test("Aufzug: Standzeit = Warten + Türen + Ein-/Aussteigen + Verzug; Fahrzeit nur ca. 11 s bis zum 4. Stock", () => {
  const A = aufzug(4);
  nah(A.standzeit, 25 + 2.5 + 3 + 3 + 0.5 + 0.5 + 2.5 + 1);
  assert.ok(A.fahrzeit > 10 && A.fahrzeit < 11.5);
  nah(A.zeit, A.standzeit + A.fahrzeit);
  nah(A.hoehe(A.zeit), 14);
  nah(A.hoehe(30), 0); // Kabine ist noch unten
});

test("Hauptrennen 4. Stock (25 s Warten): Treppe gewinnt knapp, obwohl der Aufzug kurz vorher überholt", () => {
  const r = rennen(4);
  assert.equal(r.sieger, "treppe");
  assert.ok(r.differenz > 2.5 && r.differenz < 4, `Differenz ${r.differenz}`);
  assert.ok(r.ueberholt && r.ueberholt.t < r.treppe.zeit, "Aufzug zieht in der Höhe vorbei");
});

test("Break-even: Wartezeit und Zwischenhalte verschieben die Grenze nach oben", () => {
  assert.equal(breakEven({ warte: 25 }), 4);
  assert.equal(breakEven({ warte: 0 }), 1);
  assert.equal(breakEven({ warte: 25, halte: [1, 2] }), 6);
  let vorher = 0;
  for (const w of [0, 10, 20, 30, 45, 60]) {
    const be = breakEven({ warte: w });
    assert.ok(be >= vorher, `nicht monoton bei ${w} s`);
    vorher = be;
  }
});

test("Position der Halte ändert das Ergebnis im 6. Stock nicht (zwei Halte)", () => {
  const a = rennen(6, { halte: [1, 2] }), b = rennen(6, { halte: [3, 5] });
  nah(a.aufzug.zeit, b.aufzug.zeit, 1e-6);
  assert.equal(a.sieger, "treppe");
  assert.equal(rennen(7, { halte: [2, 4] }).sieger, "aufzug");
});
