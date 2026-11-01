import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "./boden_durchsichtig.mjs";

const nah = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} ≠ ${b} (±${eps})`);

test("Erddurchmesser 12.742 km, Radien der Grenzflächen", () => {
  assert.equal(S.D, 12742);
  assert.equal(S.RADIUS.moho, 6341);
  assert.equal(S.RADIUS.kernMantel, 3480);
  assert.equal(S.RADIUS.innerer, 1221);
});

test("Gegenpunkt von Niederdorla: 51,16° S, 169,55° W (Südpazifik)", () => {
  nah(S.GEGENPUNKT.lat, -51.16, 1e-9);
  nah(S.GEGENPUNKT.lon, -169.55, 1e-9);
  // Gegenpunkt des Gegenpunkts ist wieder der Ausgangspunkt
  const z = S.gegenpunkt(S.GEGENPUNKT);
  nah(z.lat, 51.16, 1e-9);
  nah(z.lon, 10.45, 1e-9);
});

test("Haversine: halber Erdumfang zum Gegenpunkt, bekannte Kontrollstrecke Berlin–Paris", () => {
  nah(S.haversine(S.NIEDERDORLA, S.GEGENPUNKT), Math.PI * S.R, 0.01); // 20.015 km
  nah(S.haversine({ lat: 52.52, lon: 13.405 }, { lat: 48.8566, lon: 2.3522 }), 878, 3); // Berlin–Paris ≈ 878 km
});

test("Nächstes Land: Antipodeninseln, ca. 843 km (Mittelpunkt der Hauptinsel)", () => {
  const l = S.naechstesLand();
  assert.equal(l.name, "Antipodeninseln");
  nah(l.km, 843, 1.5);
  // alle anderen Kandidaten sind weiter weg
  for (const k of S.KANDIDATEN.slice(1)) assert.ok(S.haversine(S.GEGENPUNKT, k) > l.km + 50, k.name);
});

test("Festland Neuseeland: ca. 1.540 km (Banks Peninsula), weit hinter den Inseln", () => {
  const f = S.naechstesFestland();
  assert.ok(f.km > 1500 && f.km < 1620, `${f.name} ${f.km}`);
  assert.ok(f.km > 1.7 * S.naechstesLand().km);
});

test("Australien liegt nicht gegenüber: über 4.000 km vom Gegenpunkt entfernt", () => {
  assert.ok(S.abstandAustralien() > 4000, String(S.abstandAustralien()));
  assert.ok(S.abstandAustralienNah() > 3000, String(S.abstandAustralienNah())); // selbst Tasmanien ist weit weg
  // gegenüber von Australien läge der Nordatlantik / Westeuropa-Küste (ca. 25° N, 46° W)
  const g = S.gegenueberAustralien();
  nah(g.lat, 25, 1e-9);
  nah(g.lon, -46, 1e-9);
});

test("Fallzeit durch das Loch: π·√(R/g) ≈ 42,2 min, Rückfahrt gleich lang, 7,9 km/s im Mittelpunkt", () => {
  nah(S.fallzeitMin(), 42.2, 0.05);
  nah(S.periodeMin(), 84.4, 0.1);
  nah(S.maxTempoKmS(), 7.9, 0.01);
  nah(S.tunnelWeg(0), 0, 1e-9);
  nah(S.tunnelWeg(S.fallzeitMin()), S.D, 1e-6); // nach einer Fahrt ist man drüben
  nah(S.tunnelWeg(S.periodeMin()), 0, 1e-6); // und danach wieder zurück
  nah(S.tunnelTempo(S.fallzeitMin() / 2), S.maxTempoKmS(), 1e-9);
  assert.ok(S.FALLZEIT_PREM_MIN > 38 && S.FALLZEIT_PREM_MIN < 38.3);
});

test("Weg und Temperatur: 5 Etappen in 5 s, Kerntemperatur ≈ Sonnenoberfläche", () => {
  assert.equal(S.weg(0), 0);
  assert.equal(S.weg(1), 30);
  assert.equal(S.weg(2), 2891);
  assert.equal(S.weg(3), 5150);
  assert.equal(S.weg(4), S.D - 5150);
  assert.equal(S.weg(5), S.D);
  nah(S.weg(3.5), S.R, 1e-6); // Mitte des inneren Kerns = Erdmittelpunkt
  assert.equal(S.temperatur(0), 10);
  assert.ok(S.temperatur(30) > 500 && S.temperatur(30) < 800);
  nah(S.temperatur(5150), 5960, 1);
  assert.ok(S.temperatur(S.R) >= 5900 && S.temperatur(S.R) <= 6100);
  assert.ok(Math.abs(S.KERN_TEMPERATUR - S.SONNENOBERFLAECHE) <= 600);
  // gespiegelt hinter dem Mittelpunkt
  nah(S.temperatur(S.D - 30), S.temperatur(30), 1e-9);
  nah(S.temperatur(S.D), 10, 1e-9);
  // monoton bis zur Mitte
  for (let w = 0; w < S.R; w += 100) assert.ok(S.temperatur(w + 100) >= S.temperatur(w) - 1e-9);
});

test("Schicht-Nummern entlang des Wegs", () => {
  assert.equal(S.schichtNr(10), 0);
  assert.equal(S.schichtNr(1000), 1);
  assert.equal(S.schichtNr(4000), 2);
  assert.equal(S.schichtNr(S.R), 3);
  assert.equal(S.schichtNr(S.D - 4000), 4);
  assert.equal(S.schichtNr(S.D - 1000), 5);
  assert.equal(S.schichtNr(S.D - 10), 6);
});
