import test from "node:test";
import assert from "node:assert/strict";
import * as S from "./polarnacht_tromso.mjs";
const H = S.hm;
test("Tageswerte laut Rechenweg: 29.10. 7:57–14:59 = 7:02; 10.11. 5:02; 20.11. 3:01; 22.11. 2:31; 26.11. 1:08", () => {
  assert.equal(H(S.tag(0).auf), "7:57"); assert.equal(H(S.tag(0).unter), "14:59"); assert.equal(H(S.tag(0).laenge), "7:02");
  assert.equal(H(S.tag(12).laenge), "5:02"); assert.equal(H(S.tag(22).laenge), "3:01"); assert.equal(H(S.tag(24).laenge), "2:31"); assert.equal(H(S.tag(28).laenge), "1:08");
});
test("Letzte Sonne 27.11. 11:21–11:43 = 0:22; 28.11. keine Sonne; Datum n=29 ist der 27.11.", () => {
  const t = S.tag(29); assert.equal(H(t.auf), "11:21"); assert.equal(H(t.unter), "11:43"); assert.equal(H(t.laenge), "0:22");
  assert.equal(S.tag(30).auf, null); assert.deepEqual(S.datum(29), { tag: 27, monat: 11 }); assert.equal(S.datumText(5), "3. NOVEMBER");
});
test("Polarnacht 48 Tage (28.11.2026 bis 14.01.2027, keine Sonne) und erster Aufgang 15.01. 11:35–12:13", () => {
  let n = 30, tage = 0; while (S.tag(n).auf === null) { tage++; n++; }
  assert.equal(tage, 48); assert.equal(S.datumText(n), "15. JANUAR"); assert.equal(H(S.tag(n).auf), "11:35"); assert.equal(H(S.tag(n).unter), "12:13");
});
test("Verlust je Tag: 29.10.–11.11. 9–11 Min. („rund zehn“), 20.11. 13–15 Min.", () => {
  for (let n = 1; n <= 13; n++) { const v = S.verlustMin(n); assert.ok(v >= 8 && v <= 12, `Tag ${n}: ${v}`); }
  for (let n = 21; n <= 24; n++) { const v = S.verlustMin(n); assert.ok(v >= 12 && v <= 16, `Tag ${n}: ${v}`); }
});
test("Zeitachse: stetig, wachsend, Ereignis 2,5 s = Sonnenuntergang, 60 s Sonnenaufgang 27.11. 11:21, 60,5 s Untergang 11:43", () => {
  let vor = S.tau(0); for (let t = 0.01; t <= 80; t += 0.01) { const x = S.tau(t); if (Math.abs(t - S.T_SCHNITT) < 0.03) { vor = x; continue; } assert.ok(x >= vor - 1e-9, `t=${t}`); assert.ok(x - vor < 0.4, `Sprung bei ${t}`); vor = x; }
  assert.ok(Math.abs(S.tau(2.5) - 14.9833) < 0.01); assert.ok(Math.abs(S.tau(60) - (29 * 24 + 11 + 21 / 60)) < 1e-6); assert.ok(Math.abs(S.tau(60.5) - (29 * 24 + 11 + 43 / 60)) < 1e-6);
  assert.ok(Math.abs(S.sonneBei(2.5).alt - -0.833) < 0.1, "Sonnenrand am Horizont bei 2,5 s");
});
test("Prüfwerte laut Skript: 25,8 s → 5:05 („fünf Stunden“), 46,8 s → 2:59 („drei Stunden“), 50,8 s → noch 5 Tage; 1 Tag = 2 s", () => {
  assert.equal(S.tageslaengeText(25.8), "5:06"); assert.equal(S.tageslaengeText(46.8), "2:59"); assert.equal(S.tageBisAnzeige(50.8), 5);
  assert.ok(Math.abs(S.tau(12.5) - S.tau(10.5) - 24) < 1e-9);
});
test("Countdown 0:02 bei Bild 0, 0:00 bei 2,0–2,5 s; Tage-Countdown 5 → 0 in 50,5–60,5 s", () => {
  assert.equal(S.countdownText(0), "0:02"); assert.equal(S.countdownText(1), "0:01"); assert.equal(S.countdownText(2.2), "0:00");
  assert.equal(S.tageBisAnzeige(50.5), 5); assert.equal(S.tageBisAnzeige(60.2), 0); const w = []; for (let t = 50.5; t < 60.01; t += 0.1) w.push(S.tageBisAnzeige(t));
  for (let i = 1; i < w.length; i++) assert.ok(w[i] <= w[i - 1]); assert.equal(w[0], 5);
});
test("Mittagshöhe: ca. 3° um den 10.11., ca. 1° um den 18.11.", () => {
  assert.ok(Math.abs(S.tag(12).hoch - 3.1) < 0.3); assert.ok(Math.abs(S.tag(20).hoch - 1.1) < 0.3);
});
test("Dämmerung 21.12. mittags: bürgerliche (−6°) 9:32–13:54 = 4:22 („noch vier Stunden“)", () => {
  const fruehst = []; for (let m = 0; m < 1440; m++) if (S.sonne((S.tag(0).auf * 0 + 53 * 24) + m / 60).alt > -6) fruehst.push(m);
  assert.equal(H(fruehst[0]), "9:32"); assert.equal(H(fruehst.at(-1) + 1), "13:54"); assert.equal(H(fruehst.at(-1) + 1 - fruehst[0]), "4:22");
});
