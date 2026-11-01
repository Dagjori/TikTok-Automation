// Tests für Stichwort-Zeiten und Untertitel-Phrasen (engine/zeitplan.js). Aufruf: node --test qc/zeitplan.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { Zeitplan, schaetzeTiming, bildePhrasen } from "../engine/zeitplan.js";

const skript = { segmente: [
  { id: "hook", text: "Rasen oder rollen? Wer gewinnt?" },
  { id: "falle", text: "Klar, der Raser. Oder? Los geht's!" },
  { id: "ziel", text: "Im Ziel: Paul nach 9:36, Anna nach 9:56." },
  { id: "lang", text: "Aber warum wirkt die andere Spur immer schneller?" },
] };
const zp = new Zeitplan(schaetzeTiming(skript), { mindestlaenge: 0 });

test("Stichwort-Zeiten", () => {
  const w = (wort) => zp.alleWoerter.find((x) => x.wort === wort);
  assert.equal(zp.zeit(3.5), 3.5);
  assert.equal(zp.zeit("Los"), w("Los").start);
  assert.equal(zp.zeit("falle:Oder?"), w("Oder?").start);
  assert.equal(zp.zeit("oder"), w("oder").start); // erster Treffer im Hook
  assert.equal(zp.zeit("Oder?#2"), w("Oder?").start);
  assert.equal(zp.zeit("Los>"), w("Los").ende);
  assert.ok(Math.abs(zp.zeit("Los+0.2") - (w("Los").start + 0.2)) < 1e-9);
  assert.ok(Math.abs(zp.zeit("Los-0.1") - (w("Los").start - 0.1)) < 1e-9);
  assert.equal(zp.zeit("9:36,"), w("9:36,").start); // Doppelpunkt im Wort ist kein Segment
  assert.equal(zp.zeit("ziel:9:56."), w("9:56.").start);
  assert.equal(zp.zeit("Ziel:"), w("Ziel:").start);
  assert.equal(zp.zeit({ i: 0 }), zp.alleWoerter[0].start);
  assert.equal(zp.zeit("Rase*"), w("Rasen").start);
  assert.throws(() => zp.zeit("Gibtsnicht"));
});

test("Phrasen: 1–5 Wörter, Sätze nie verbunden, nicht vor Substantiv getrennt", () => {
  const ph = zp.phrasen().map((p) => p.map((w) => w.wort).join(" "));
  for (const p of ph) assert.ok(p.split(" ").length <= 5, p);
  assert.deepEqual(ph.slice(0, 5), ["Rasen oder rollen?", "Wer gewinnt?", "Klar, der Raser.", "Oder?", "Los geht's!"]);
  assert.ok(ph.includes("die andere Spur immer schneller?"), ph.join(" | "));
});

test("Schätzung nutzt Werte aus skript.schaetzung", () => {
  const t = schaetzeTiming({ ...skript, schaetzung: { wps: 2.7, satzpause: 0.26 } });
  const n = t.segmente.reduce((a, s) => a + s.woerter.length, 0);
  assert.ok(Math.abs(t.dauer - (0.12 + n / 2.7)) < 0.3, String(t.dauer));
});

test("bildePhrasen ohne Segmente", () => {
  const w = "eins zwei drei vier fünf sechs sieben acht neun zehn elf.".split(" ").map((wort) => ({ wort }));
  const ph = bildePhrasen(w);
  assert.ok(ph.every((p) => p.length >= 2 && p.length <= 5));
});
