// Tests für cockpit/lib/modelle.mjs, vor allem die feste Regel des Inhabers vom 08.11.2026:
// Videos mit Sonnet 5.5 von der Steuerung bis zur Abnahme, Opus nur als Agent für einen Neubau.
// Aufruf: node --test cockpit/lib/modelle.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { modellWaehlen, eineStufeHoeher, PRODUKTION_MODELLREGEL } from "./modelle.mjs";

test("Produktion läuft mit Sonnet (feste Regel 08.11.)", () => {
  const wahl = modellWaehlen({ art: "produktion", text: "Neue Welt bauen, Design, Szene, Animation" });
  assert.equal(wahl.modell, "sonnet");
  assert.match(wahl.grund, /Sonnet 5\.5/);
  assert.match(wahl.grund, /Opus nur als Agent für einen Neubau/);
});

test("Abnahme und Nachprüfung laufen mit Sonnet", () => {
  assert.equal(modellWaehlen({ art: "abnahme" }).modell, "sonnet");
  assert.equal(modellWaehlen({ art: "nachpruefen" }).modell, "sonnet");
});

test("Ideen und Skripte bleiben bei Opus", () => {
  assert.equal(modellWaehlen({ art: "ideen" }).modell, "opus");
  assert.equal(modellWaehlen({ art: "skripte" }).modell, "opus");
});

test("Regeltext für den Auftrag: Sonnet als Standard, Opus nur als einzelner Neubau-Agent", () => {
  assert.match(PRODUKTION_MODELLREGEL, /Sonnet 5\.5/);
  assert.match(PRODUKTION_MODELLREGEL, /model: sonnet/);
  assert.match(PRODUKTION_MODELLREGEL, /genau einen Agenten mit model: opus/);
  assert.match(PRODUKTION_MODELLREGEL, /kein Neubau/);
});

test("Eskalation geht höchstens bis Opus", () => {
  assert.equal(eineStufeHoeher("sonnet"), "opus");
  assert.equal(eineStufeHoeher("opus"), null);
});
