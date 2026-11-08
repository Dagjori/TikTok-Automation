// Tests: node --test pipeline/sim/sonne_aus.test.mjs  (Soll-Werte aus daten.skript.rechenweg)
import { test } from "node:test"; import assert from "node:assert/strict";
import { erloeschenS, erloeschtBei, wegAE, radiusAE, abstandAE, simSeit, videoAus, saturnCountdown, countdown, vorS, leuchtet, dunkelSeit, T_EREIGNIS, T_HIER } from "./sonne_aus.mjs";
const nah = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
test("Bahnradien in AE", () => { nah(radiusAE("venus"), 0.723, 0.001, "Venus"); nah(radiusAE("mars"), 1.524, 0.001, "Mars"); nah(radiusAE("jupiter"), 5.204, 0.001, "Jupiter"); nah(radiusAE("saturn"), 9.572, 0.001, "Saturn"); });
test("Abstände Erde–Planet", () => { nah(abstandAE("venus"), 0.691, 0.001, "Venus"); nah(abstandAE("mars"), 1.150, 0.001, "Mars"); nah(abstandAE("jupiter"), 5.107, 0.001, "Jupiter"); nah(abstandAE("saturn"), 9.520, 0.001, "Saturn"); });
test("Erlöschzeiten in Sekunden und Minuten", () => {
  nah(erloeschenS("mond"), 1.28, 0.01, "Mond");
  nah(erloeschenS("venus"), 207, 1, "Venus s"); nah(erloeschenS("venus") / 60, 3.4, 0.05, "Venus min");
  nah(erloeschenS("mars"), 835, 1, "Mars s"); nah(erloeschenS("mars") / 60, 13.9, 0.05, "Mars min");
  nah(erloeschenS("jupiter"), 4646, 2, "Jupiter s"); nah(erloeschenS("jupiter") / 60, 77.4, 0.05, "Jupiter min");
  nah(erloeschenS("saturn"), 9028, 2, "Saturn s"); nah(erloeschenS("saturn") / 60, 150.5, 0.05, "Saturn min");
});
test("Weg Sonne–Saturn–Erde 19,09 AE = 158,8 min", () => { nah(wegAE("saturn"), 19.09, 0.01, "AE"); nah((wegAE("saturn") * 499) / 60, 158.8, 0.1, "min"); });
test("Saturn über zweieinhalb Stunden, Saturn fast doppelt so weit wie Jupiter", () => { assert.ok(erloeschenS("saturn") / 3600 > 2.4); nah(radiusAE("saturn") / radiusAE("jupiter"), 1.84, 0.01, "Verhältnis"); });
test("Videozeiten: Mond 9,3 · Venus 22,1 · Mars 31,9 · Jupiter 46,2 · Saturn 60,8", () => {
  nah(erloeschtBei("mond"), 9.3, 0.05, "Mond"); nah(erloeschtBei("venus"), 22.1, 0.05, "Venus"); nah(erloeschtBei("mars"), 31.9, 0.05, "Mars");
  nah(erloeschtBei("jupiter"), 46.2, 0.05, "Jupiter"); nah(erloeschtBei("saturn"), 60.8, 0.05, "Saturn"); nah(erloeschtBei("saturn"), T_HIER, 0.05, "HIER");
});
test("Zeitraffer: simSeit stetig, monoton, Umkehrung stimmt", () => {
  assert.equal(simSeit(0), 0); assert.equal(simSeit(8), 0); nah(simSeit(12), 4, 1e-9, "12 s"); nah(simSeit(24), 244, 1e-9, "24 s"); nah(simSeit(34), 994, 1e-9, "34 s");
  let p = -1; for (let t = 0; t <= 80; t += 0.01) { const s = simSeit(t); assert.ok(s >= p - 1e-9); p = s; }
  for (const s of [1, 100, 500, 3000, 9000]) nah(simSeit(videoAus(s)), s, 1e-6, "Umkehrung " + s);
});
test("Anzeige: DUNKEL SEIT bei 47 s = 1:21:34, Saturn-Countdown ab 47 s = 1:08:54", () => {
  nah(dunkelSeit(47), 4894, 0.5, "4894 s = 1:21:34"); nah(saturnCountdown(47), 4134, 2, "4134 s = 1:08:54"); assert.equal(saturnCountdown(70), 0);
  nah(simSeit(31.9), 835, 6, "Mars bei 31,9 s zeigt 0:13:55"); nah(simSeit(44.6), 4174, 1, "44,6 s: 1:09:34, über einer Stunde");
});
test("Countdown 8 → 0 und „erloschen vor 8:11 … 8:19“", () => { assert.equal(countdown(0), 8); assert.equal(countdown(T_EREIGNIS), 0); assert.equal(vorS(0), 491); assert.equal(vorS(8), 499); });
test("Sichtbarkeit: alle leuchten vor 8 s, danach erlöschen sie der Reihe nach", () => {
  for (const n of ["mond", "venus", "mars", "jupiter", "saturn"]) assert.ok(leuchtet(n, 7.9));
  assert.ok(leuchtet("mond", 9.0) && !leuchtet("mond", 9.4)); assert.ok(leuchtet("venus", 22.0) && !leuchtet("venus", 22.2));
  assert.ok(leuchtet("mars", 31.8) && !leuchtet("mars", 32)); assert.ok(leuchtet("jupiter", 46.1) && !leuchtet("jupiter", 46.3)); assert.ok(leuchtet("saturn", 60.7) && !leuchtet("saturn", 60.9));
});
