// Tests: node --test pipeline/sim/kind_bis_18.test.mjs (von Hand nachgerechnet)
import { test } from "node:test";
import assert from "node:assert/strict";
import { ausgabenBis, kindergeldBis, videoZahlen } from "./kind_bis_18.mjs";

test("Phasen: 48.888 / 56.592 / 68.616 €, gesamt 174.096 €", () => {
  const v = videoZahlen();
  assert.deepEqual(v.phasen, [48888, 56592, 68616]);
  assert.equal(v.gesamt, 174096);
});
test("Nach 12 Jahren: 105.480 € Ausgaben, 37.296 € Kindergeld", () => {
  assert.equal(ausgabenBis(12), 105480); assert.equal(kindergeldBis(12), 37296);
});
test("Ergebnis: 174.096 − 55.944 = 118.152 €", () => {
  const v = videoZahlen(); assert.equal(v.kindergeld, 55944); assert.equal(v.netto, 118152);
});
test("Jugend 40 % teurer (nicht über die Hälfte), Kindergeld deckt gut ein Viertel, Ende 19.728 € teurer als Anfang", () => {
  const v = videoZahlen();
  assert.ok(v.mehrJugend > 0.40 && v.mehrJugend < 0.41);
  assert.ok(v.deckungJugend > 0.25 && v.deckungJugend < 0.28);
  assert.equal(v.differenzEndeAnfang, 19728);
});
