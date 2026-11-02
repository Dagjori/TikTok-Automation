import { test } from "node:test";
import assert from "node:assert/strict";
import { d, anzeige, gezeiten, licht, groesse, ROCHE, ROCHE_STARR, GEO, D0 } from "./mond_naeher.mjs";
test("Roche-Grenze flüssig ≈ 18.400 km, starr ≈ 9.500 km", () => {
  assert.equal(Math.round(ROCHE / 100) * 100, 18400); assert.equal(Math.round(ROCHE_STARR / 100) * 100, 9500);
});
test("Stufen: halb (×8), Viertel (×64, Licht ×16), geostationär (×758, Größe ×9,1), Roche (×9.100, Größe ×21)", () => {
  assert.equal(gezeiten(D0 / 2), 8); assert.equal(gezeiten(D0 / 4), 64); assert.equal(licht(D0 / 4), 16);
  assert.equal(Math.round(gezeiten(GEO)), 758); assert.equal(Math.round(groesse(GEO) * 10) / 10, 9.1);
  assert.equal(Math.round(gezeiten(ROCHE) / 100) * 100, 9200); assert.equal(Math.round(groesse(ROCHE)), 21);
});
test("Knoten-Zeiten und monoton, HIER bei 60 s", () => {
  assert.equal(d(20), 192200); assert.equal(d(32), 96100); assert.equal(d(44), 42164);
  for (let t = 0; t < 60; t += 0.5) assert.ok(d(t + 0.5) < d(t));
  assert.ok(anzeige(60).hier && anzeige(60).wert === 0);
});
