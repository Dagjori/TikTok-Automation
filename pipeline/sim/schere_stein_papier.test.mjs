// Tests: node --test sim/schere_stein_papier.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ZUEGE, schlaegt, ergebnis, besieger, zufall, MENSCH, menschVerteilung, erwartung, taktikZug, spiele, monteCarlo, warumFaktoren,
  wiederholungsrate, modellWiederholung, WIEDERHOLUNG_BELEGT, fuehrungswechsel, videoLaeufe,
} from "./schere_stein_papier.mjs";

const nah = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);

test("Regeln: Papier schlägt Stein, Schere schlägt Papier, Stein schlägt Schere; jeder Zug hat genau einen Besieger", () => {
  assert.ok(schlaegt(1, 0) && schlaegt(2, 1) && schlaegt(0, 2));
  assert.ok(!schlaegt(0, 1) && !schlaegt(1, 2) && !schlaegt(2, 0));
  for (const z of [0, 1, 2]) {
    assert.ok(schlaegt(besieger(z), z));
    assert.equal(ergebnis(z, z), 0);
    assert.equal(ergebnis(z, besieger(z)), -1);
    assert.equal(ergebnis(besieger(z), z), 1);
  }
  assert.deepEqual(ZUEGE, ["Stein", "Papier", "Schere"]);
});

test("Nash: Gegen die gleichverteilte Strategie hat jeder Zug und jede Mischung den Erwartungswert 0 (je 1/3 Sieg, remis, Niederlage)", () => {
  const u = [1 / 3, 1 / 3, 1 / 3];
  for (const z of [0, 1, 2]) nah(erwartung(z, u), 0);
  // beliebige Mischungen von Rot
  for (const m of [[1, 0, 0], [0.2, 0.5, 0.3], [0.7, 0.1, 0.2]]) nah(m.reduce((s, pz, z) => s + pz * erwartung(z, u), 0), 0);
});

test("Mensch-Modell: Verteilungen summieren zu 1; mittlere Wiederholungsrate = belegte 44 % (Wang & Xu 2014, Tab. 2, a = 2)", () => {
  for (const e of [1, 0, -1]) for (const z of [0, 1, 2]) nah(menschVerteilung(z, e).reduce((a, b) => a + b, 0), 1);
  nah(modellWiederholung(), WIEDERHOLUNG_BELEGT, 1e-9);
  nah(MENSCH.start.reduce((a, b) => a + b, 0), 1);
  // Richtung der Befunde: nach Sieg wiederholen deutlich mehr als wechseln; nach Niederlage ist „links“ (= Zug, der den letzten Zug des Gegners geschlagen hätte) am häufigsten
  assert.ok(MENSCH.sieg.stay > 2 * MENSCH.sieg.links && MENSCH.sieg.stay > 2 * MENSCH.sieg.rechts);
  assert.ok(MENSCH.niederlage.links > MENSCH.niederlage.stay && MENSCH.niederlage.links > MENSCH.niederlage.rechts);
});

test("Nach einer Niederlage ist „links“ der Zug, der den letzten Zug des Gegners geschlagen hätte", () => {
  for (const z of [0, 1, 2]) {
    const gegner = besieger(z); // Gegner hat z geschlagen
    const links = (z + 2) % 3;
    assert.ok(schlaegt(links, gegner));
  }
});

test("Taktik wählt den Zug mit dem höchsten Erwartungswert gegen das Mensch-Modell", () => {
  const rng = zufall(1);
  // Mensch hat gerade gewonnen und Stein gespielt → bleibt mit 55 % bei Stein → Papier ist die beste Antwort
  assert.equal(taktikZug(rng, 0, 1), besieger(0));
  const p = menschVerteilung(0, 1);
  for (const z of [0, 1, 2]) assert.ok(erwartung(besieger(0), p) >= erwartung(z, p) - 1e-12);
  // Erwartungswert dieser Antwort: Siegwahrscheinlichkeit 0,55 − Niederlagenwahrscheinlichkeit 0,225
  nah(erwartung(besieger(0), p), 0.55 - 0.225);
});

test("Läufe sind deterministisch, haben 100 Runden und konsistente Zähler", () => {
  const a = spiele({ seed: 7, gegner: "mensch" }), b = spiele({ seed: 7, gegner: "mensch" });
  assert.deepEqual(a, b);
  assert.equal(a.runden.length, 100);
  assert.equal(a.siegeRot + a.siegeCyan + a.remis, 100);
  assert.equal(a.vorsprung, a.siegeRot - a.siegeCyan);
  for (const r of a.runden) assert.equal(r.erg, ergebnis(r.rot, r.cyan));
});

test("„mensch“ und „mensch-wuerfelt“ sind bei gleichem Seed in den Runden 1–50 identisch", () => {
  const m = spiele({ seed: 3, gegner: "mensch" }), w = spiele({ seed: 3, gegner: "mensch-wuerfelt" });
  assert.deepEqual(m.runden.slice(0, 50), w.runden.slice(0, 50));
});

test("Monte Carlo gegen Zufall (n = 20.000): mittlerer Vorsprung 0, Siege ≈ Niederlagen ≈ Remis ≈ 33,3", () => {
  const s = monteCarlo({ n: 20000, gegner: "zufall" });
  assert.ok(Math.abs(s.mittlererVorsprung) < 0.15, String(s.mittlererVorsprung)); // Standardfehler 8,2 / √20000 = 0,058
  assert.ok(Math.abs(s.mittlereSiegeRot - 33.33) < 0.25 && Math.abs(s.mittlereSiegeCyan - 33.33) < 0.25 && Math.abs(s.mittlereRemis - 33.33) < 0.25);
  assert.ok(Math.abs(s.standardabweichung - Math.sqrt(100 * 2 / 3)) < 0.2); // Varianz je Runde 2/3
  assert.ok(Math.abs(s.anteilRotVorn - s.anteilCyanVorn) < 0.012);
});

test("Monte Carlo gegen das Mensch-Modell (n = 20.000): Rot liegt im Mittel klar vorn und fast immer vorn", () => {
  const s = monteCarlo({ n: 20000, gegner: "mensch" });
  assert.ok(s.mittlererVorsprung > 10, String(s.mittlererVorsprung));
  assert.ok(s.anteilRotVorn > 0.9, String(s.anteilRotVorn));
});

test("Würfelt der Mensch ab Runde 51, bleibt der Vorsprung in der zweiten Hälfte bei 0 (Nash)", () => {
  const s = monteCarlo({ n: 20000, gegner: "mensch-wuerfelt" });
  assert.ok(Math.abs(s.vorsprungZweiteHaelfte) < 0.2, String(s.vorsprungZweiteHaelfte));
  assert.ok(s.vorsprungErsteHaelfte > 5, String(s.vorsprungErsteHaelfte));
});

test("Warum: Rot gewinnt nach einem Sieg des Menschen am häufigsten (≈ 55 %), Gesamtgewinn setzt sich aus den drei Fällen zusammen", () => {
  const w = warumFaktoren({ n: 8000 });
  assert.ok(w.sieg.rotGewinnt > w.niederlage.rotGewinnt && w.sieg.rotGewinnt > 0.5, JSON.stringify(w));
  const netto = w.sieg.nettoRot + w.remis.nettoRot + w.niederlage.nettoRot;
  const s = monteCarlo({ n: 8000, gegner: "mensch", seed0: 500001 });
  nah(netto, s.mittlererVorsprung, 1.2); // erste Runde zählt nicht mit
});

test("Das Mensch-Modell wiederholt gegen einen Zufallsspieler (ausgeglichene Ergebnisse) 44 % seiner Züge; gegen Rot etwas weniger, weil es öfter verliert", () => {
  const rng = zufall(2024);
  let bleibt = 0, summe = 0;
  for (let l = 0; l < 3000; l++) {
    let z = Math.floor(rng() * 3), e = 0;
    for (let r = 1; r < 100; r++) {
      const p = menschVerteilung(z, e);
      const u = rng();
      const n = u < p[0] ? 0 : u < p[0] + p[1] ? 1 : 2;
      const gegner = Math.floor(rng() * 3);
      summe++; if (n === z) bleibt++;
      z = n; e = ergebnis(n, gegner);
    }
  }
  nah(bleibt / summe, WIEDERHOLUNG_BELEGT, 0.01);
  const gegenRot = wiederholungsrate({ n: 3000 });
  assert.ok(gegenRot > 0.39 && gegenRot < 0.44, String(gegenRot)); // verliert öfter → mehr Wechsel
});

test("Videoläufe erfüllen die festen Auswahlkriterien (typisch, nicht handverlesen)", () => {
  const v = videoLaeufe();
  assert.ok(Math.abs(v.zufall.vorsprung) <= 3);
  assert.ok(fuehrungswechsel(v.zufall).length >= 3);
  assert.ok(Math.abs(v.mensch.vorsprung - v.medianMensch) <= 3);
  assert.equal(v.mensch.runden.length, 100);
  const z2 = v.wuerfelt.vorsprung - v.wuerfelt.runden[49].vorsprung;
  assert.ok(Math.abs(z2) <= 3);
  assert.deepEqual(v.mensch.runden.slice(0, 50), v.wuerfelt.runden.slice(0, 50));
});
