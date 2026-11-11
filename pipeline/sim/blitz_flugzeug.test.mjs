import test from "node:test";
import assert from "node:assert/strict";
import * as B from "./blitz_flugzeug.mjs";
test("Zeitlupenfaktoren: ca. 1:909.000 (µs), 1:219 (ms), 1:250 (Ende)", () => {
  assert.ok(Math.abs(B.ZEITLUPE_US - 909091) < 2); assert.ok(Math.abs(B.ZEITLUPE_MS - 218.75) < 1e-9); assert.equal(B.ZEITLUPE_ENDE, 250);
});
test("ms-Zeitachse: 0 bei 8 s, 0,0055 bei 13 s, 160 bei 48 s, 200 bei 58 s; stetig und steigend", () => {
  assert.equal(B.msBei(7.9), -1); assert.ok(Math.abs(B.msBei(13) - 0.0055) < 1e-9 || Math.abs(B.msBei(13)) < 1e-9);
  assert.equal(B.msBei(13), 0); assert.equal(B.msBei(48), 160); assert.equal(B.msBei(58), 200);
  let v = -2; for (let t = 7.5; t <= 70; t += 0.02) { const x = B.msBei(t); assert.ok(x >= v - 1e-6, `t=${t}`); v = x; }
});
test("Teilschläge bei 20,7 / 28,3 / 36,0 s (Skript: 35, 70, 105 ms)", () => {
  assert.ok(Math.abs(B.schlagZeit(1) - 20.66) < 0.01); assert.ok(Math.abs(B.schlagZeit(2) - 28.31) < 0.01); assert.ok(Math.abs(B.schlagZeit(3) - 35.97) < 0.01);
});
test("Strecke: 130 m/s · 0,16 s = 20,8 ≈ 21 m; · 0,2 s = 26 m", () => {
  assert.equal(Math.round(B.strecke(160)), 21); assert.equal(B.strecke(200), 26);
  assert.equal(B.anzeige(48).zahl, "21"); assert.equal(B.anzeige(57.99).zahl, "26");
});
test("250 kt ≈ 128,6 m/s gerundet 130 m/s", () => { assert.equal(Math.round(250 * 0.5144), 129); assert.equal(B.GESCHWINDIGKEIT_M_S, 130); });
test("Anzeige: Countdown 8 → 0, Spitzenstrom 0 → 30.000 A, ms 0 → 160, Etiketten und HIER", () => {
  assert.deepEqual([B.anzeige(0).etikett, B.anzeige(0).zahl], ["EINSCHLAG IN", "8"]);
  assert.equal(B.anzeige(7.5).zahl, "1"); assert.equal(B.anzeige(8).etikett, "SPITZENSTROM"); assert.equal(B.anzeige(8).zahl, "0");
  assert.equal(B.anzeige(12.99).zahl, "30.000"); assert.equal(B.anzeige(13).etikett, "ZEIT SEIT EINSCHLAG"); assert.equal(B.anzeige(47.99).zahl, "160");
  assert.equal(B.anzeige(20.7).unter, "SCHLAG 2 · 35 MS"); assert.equal(B.anzeige(20.7).zahl, "35"); assert.equal(B.anzeige(28.4).zahl, "70");
  assert.equal(B.anzeige(58).zahl, "HIER"); assert.equal(B.anzeige(58).wert, 0);
});
test("Häufigkeit: Quellen uneinig (3.000 FAA/US, 1.000 ONERA) – das Video nennt nur ‚etwa einmal pro Jahr‘", () => {
  assert.equal(B.FLUGSTUNDEN_JE_TREFFER.faa_usa, 3000); assert.equal(B.FLUGSTUNDEN_JE_TREFFER.onera, 1000);
});
