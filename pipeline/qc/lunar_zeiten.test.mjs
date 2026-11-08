// Tests für den Testblock einstieg_a2 = c (62–70 s) in engine/lunar_hud.js. Aufruf: node --test pipeline/qc/lunar_zeiten.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { LP_ZEITEN, lpZeitenFuer, lpSkala } from "../engine/lunar_hud.js";

const nah = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);

test("80 s: lpZeitenFuer ändert nichts, lpSkala ist die Identität", () => {
  assert.deepEqual(lpZeitenFuer(80), LP_ZEITEN);
  for (const t of [0, 4.4, 8, 30, 60, 70, 72, 80]) nah(lpSkala(t, 80), t);
});

test("66 s: Abspann die letzten 8 s, Abblende 2 s davor, Titel und Countdown unverändert", () => {
  const z = lpZeitenFuer(66);
  nah(z.ende, 66);
  nah(z.abspann, 58);
  assert.deepEqual(z.abblende.map((x) => +x.toFixed(6)), [56, 58]);
  assert.deepEqual(z.titelEin, LP_ZEITEN.titelEin);
  assert.deepEqual(z.titelAus, LP_ZEITEN.titelAus);
  assert.ok(z.hinweisEin[0] > z.faktEin[1] && z.hinweisEin[1] < z.ende);
});

test("lpSkala 66 s: Ereignis bleibt, Höhepunkt 60 → 48,33 s, Abblende 70 → 56 s, Ende 80 → 66 s", () => {
  nah(lpSkala(8, 66), 8);
  nah(lpSkala(10, 66), 10);
  nah(+lpSkala(60, 66).toFixed(2), 48.33);
  nah(lpSkala(70, 66), 56);
  nah(lpSkala(80, 66), 66);
  // monoton steigend
  let alt = -1;
  for (let t = 0; t <= 80; t += 0.5) { const s = lpSkala(t, 62); assert.ok(s >= alt); alt = s; }
});

test("lpZeitenFuer: nur 60–80 s", () => {
  assert.throws(() => lpZeitenFuer(90));
  assert.throws(() => lpZeitenFuer(55));
});
