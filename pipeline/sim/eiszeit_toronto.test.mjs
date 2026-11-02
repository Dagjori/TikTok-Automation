import { test } from "node:test";
import assert from "node:assert/strict";
import * as E from "./eiszeit_toronto.mjs";

const nah = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);

test("Eisrand: 125 km bei der weißen Linie, ≈ 5,5 km wenn die Wand den Turm überragt, 0 bei HIER", () => {
  nah(E.eisrandKm(E.T.linie), 125, 1e-6);
  nah(E.eisrandKm(E.T.wandHoeher), 5.5, 1e-6);
  assert.equal(E.eisrandKm(E.T.hier), 0);
  for (let t = E.T.linie; t < E.T.hier; t += 0.1) assert.ok(E.eisrandKm(t + 0.1) < E.eisrandKm(t), `nicht fallend bei ${t}`);
});
test("Turm (3 km) wird zwischen 53 und 55 s erreicht", () => {
  let t = E.T.linie; while (E.eisrandKm(t) > 3) t += 0.01;
  assert.ok(t > 53 && t < 55, String(t));
});
test("Jahre: monoton, 88.750 bei der Linie, 90.000 bei HIER, 94.000 am Ende", () => {
  nah(E.jahre(E.T.linie), 88750, 1);
  nah(E.jahre(E.T.hier), 90000, 1);
  nah(E.jahre(70), 94000, 1);
  for (let t = 0; t < 70; t += 0.05) assert.ok(E.jahre(t + 0.05) >= E.jahre(t));
});
test("LGM-Werte: −6,1 °C und −130 m im Maximum; bei HIER ≈ −5,9 °C", () => {
  nah(E.temperatur(94000), -6.1, 1e-9);
  nah(E.meeresspiegel(94000), -130, 1e-9);
  nah(E.temperatur(E.jahre(E.T.hier)), -5.9, 0.05);
  nah(E.temperatur(E.jahre(47.1)), -5.85, 0.06); // Satz „Weltweit nur sechs Grad kälter.“ (Anzeige −5,8/−5,9 °C)
});
test("Weiße Linie: Eis ragt bei 125 km gerade über die Kimm, bei 130 km noch nicht", () => {
  assert.ok(E.erhebungGrad(125) > E.kimmGrad(), String(E.erhebungGrad(125)));
  assert.ok(E.erhebungGrad(130) < E.kimmGrad());
});
test("Anzeige: Etiketten, deutsche Zahlen, HIER", () => {
  assert.deepEqual([0, 30, 45, 61].map((t) => E.anzeige(t).etikett), ["Abkühlung weltweit", "Meeresspiegel", "Eisrand", "Eisrand"]);
  assert.equal(E.anzeige(0).zahl, "0,0");
  assert.equal(E.anzeige(0).unter, "heute");
  assert.match(E.anzeige(23).zahl, /^−\d,\d$/);
  assert.match(E.anzeige(30).unter, /^weltweit, in \d{2}\.\d{3} Jahren$/);
  assert.equal(E.anzeige(E.T.linie + 0.01).zahl, "125");
  assert.equal(E.anzeige(61).zahl, "HIER");
  const w = []; for (let t = 0; t <= 70; t += 0.5) w.push(E.anzeige(t).wert);
  let a = 0; for (let i = 1; i < w.length; i++) if (w[i] !== w[i - 1]) a++;
  assert.ok(a >= 0.6 * (w.length - 1), `${a} von ${w.length - 1}`);
});
test("Jahreszeiten: Sommer bis 14 s, Schnee bleibt ab 24 s, See zu bei 32,3 s", () => {
  assert.equal(E.schnee(10), 0);
  assert.ok(E.schnee(16) > 0.9 && E.schnee(18.2) < 0.1);
  for (let t = 24.5; t < 60; t += 0.25) assert.ok(E.schnee(t) >= 0.75, String(t));
  nah(E.seeEis(E.T.seeZu), 1, 1e-9);
});
