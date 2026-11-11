// Tests: node --test sim/rente_erhoehung.test.mjs  (Werte aus dem Skript acc1-2026-11-12-mittag; dort mit Python gerechnet, cockpit/daten/tmp/rechnung_rente.py)
import { test } from "node:test";
import assert from "node:assert/strict";
import { videoZahlen, rechne, est } from "./rente_erhoehung.mjs";

const v = videoZahlen();
const nahe = (a, b, tol = 0.005) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);

test("Erhöhung: 4,1 % von 2.000 € = 82,00 €", () => nahe(v.erh, 82));
test("KV 5,99 €, halber Zusatzbeitrag 1,19 €, PV 2,95 €, zusammen 10,13 €", () => {
  nahe(v.kv, 5.99); nahe(v.zus, 1.19); nahe(v.pv, 2.95); nahe(v.svSumme, 10.13); nahe(v.svSatz, 0.1235, 1e-9);
});
test("Nach KV 74,82 €, nach Pflege 71,87 €", () => { nahe(v.nachKv, 74.82); nahe(v.nachSv, 71.87); });
test("Rentenfreibetrag 3.860 € (Rente 2021: 1.608,23 €)", () => { assert.equal(v.fb, 3860); nahe(v.r21, 1608.23, 0.01); });
test("zvE ohne 17.038 €, mit 17.900 €; ESt 817 € bzw. 1.018 €", () => {
  assert.equal(v.zveOhne, 17038); assert.equal(v.zveMit, 17900); assert.equal(v.estOhne, 817); assert.equal(v.estMit, 1018);
});
test("Steuer 16,75 €/Monat, Grenzsteuersatz 24,0 %", () => { nahe(v.steuerMonat, 16.75); nahe(v.grenzsatz, 24.0, 0.05); });
test("Es bleiben 55,12 € von 82 € (67,2 %)", () => { nahe(v.bleibt, 55.12); nahe(v.anteil, 67.2, 0.05); assert.ok(v.anteil > 66.67); });
test("Jahr 2027: 492 € brutto, SV 60,76 €, Steuer 99 €, bleiben 332,24 €", () => {
  nahe(v.brutto27, 492); nahe(v.sv27, 60.76); assert.equal(v.steuer27, 99); nahe(v.bleibt27, 332.24);
});
test("Tarif: Grundfreibetrag 0, darüber positiv; Rentenerhöhung 0 € ergibt 0 € Mehrsteuer", () => {
  assert.equal(est(12564), 0); assert.ok(est(12600) > 0); nahe(rechne({ prozent: 0 }).steuerMonat, 0);
});
