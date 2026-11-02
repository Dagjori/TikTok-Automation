import { test } from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, anzeige, d } from "./mond_halb.mjs";
test("halbe Entfernung: 192.200 km, doppelt so groß, Gezeitenkraft ×8, Licht ×4, Umlauf 9,7 Tage", () => {
  const v = videoZahlen();
  assert.equal(v.d_halb, 192200); assert.equal(v.groesse, 2); assert.equal(v.gezeiten, 8); assert.equal(v.licht, 4);
  assert.equal(Math.round(v.umlauf_tage * 10) / 10, 9.7);
});
test("Anzeige stetig fallend/steigend, 192.200 km ab 52 s, HIER bei 60 s", () => {
  assert.equal(Math.round(d(52)), 192200);
  assert.ok(d(10) < d(5) && d(5) < d(0));
  assert.ok(anzeige(41).wert > 4 && anzeige(41).wert < 4.6);
  assert.ok(anzeige(30).wert > 1.3 && anzeige(30).wert < 1.35 && anzeige(30).etikett === "MOND AM HIMMEL");
  assert.ok(anzeige(60).hier && anzeige(60).wert === 0);
});
