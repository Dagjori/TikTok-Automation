import { test } from "node:test";
import assert from "node:assert/strict";
import * as S from "./leichtes_auto.mjs";

const nah = (a, b, eps, was = "") => assert.ok(Math.abs(a - b) <= eps, `${was} ${a} ≠ ${b} (±${eps})`);
const e = (tab) => tab[tab.length - 1];

test("Luftwiderstand bei 130 km/h: 473 N", () => {
  nah(S.K, 0.363, 1e-9);
  nah(S.luftwiderstand(130 / 3.6), 473.4, 0.1);
});
test("Haftgrenze: 15 kg → 147 N (µ = 1), normales Auto 1.400 kg → 13.734 N", () => {
  nah(S.haftgrenze(15), 147.15, 0.01);
  nah(S.haftgrenze(1400), 13734, 0.1);
});
test("Gas weg: 31,6 m/s² = 3,2 g am Anfang", () => {
  const t = S.integriere({ modus: "gasweg" });
  nah(-t[0].a, 31.56, 0.02);
  nah(-S.gRichtung(t[0].a), 3.22, 0.01);
});
test("Gas weg: nach 5 s ca. 24 km/h, ca. 69 m (numerisch = geschlossen)", () => {
  const t = S.integriere({ modus: "gasweg" });
  nah(S.kmh(e(t).v), 24.2, 0.1);
  nah(e(t).x, 69.45, 0.1);
  const g = S.gaswegGeschlossen(5);
  nah(e(t).v, g.v, 1e-4);
  nah(e(t).x, g.x, 1e-3);
});
test("Vollgas: Räder drehen durch (Antrieb = Haftgrenze 147 N), Endgeschwindigkeit 72,5 km/h", () => {
  const t = S.integriere({ modus: "vollgas" });
  nah(t[0].antrieb, 147.15, 0.01);
  assert.equal(t[0].durchdrehen, true);
  nah(S.kmh(S.endgeschwindigkeit()), 72.5, 0.1);
});
test("Vollgas: Tacho fällt trotzdem auf ca. 73 km/h (numerisch = geschlossen), nie darunter", () => {
  const t = S.integriere({ modus: "vollgas" });
  nah(S.kmh(e(t).v), 72.8, 0.1);
  nah(e(t).v, S.vollgasGeschlossen(5).v, 1e-4);
  for (let i = 1; i < t.length; i++) {
    assert.ok(t[i].v <= t[i - 1].v + 1e-9, "Tempo nimmt nie zu");
    assert.ok(t[i].v >= S.endgeschwindigkeit() - 1e-6, "nie unter der Endgeschwindigkeit");
  }
  // Gleichgewicht: Luftwiderstand ≈ Haftgrenze am Ende
  nah(e(t).luft, 147.15, 1.5);
});
test("Vollgas bremst am Anfang weniger als Gas weg (2,2 g statt 3,2 g), ist nach 5 s aber schneller", () => {
  const a = S.integriere({ modus: "gasweg" }), b = S.integriere({ modus: "vollgas" });
  nah(-S.gRichtung(b[0].a), 2.22, 0.01);
  assert.ok(e(b).v > e(a).v * 2.5);
});
test("Normales Auto (1.400 kg), Gas weg: nur 0,34 m/s², nach 5 s noch 124 km/h", () => {
  const t = S.integriere({ modus: "gasweg", m: 1400 });
  nah(-t[0].a, 0.338, 0.001);
  nah(S.kmh(e(t).v), 124.2, 0.1);
});
test("Numerik konvergiert (dt 10 ms gegen 1 ms)", () => {
  const a = S.integriere({ modus: "vollgas", dt: 0.01 }), b = S.integriere({ modus: "vollgas", dt: 0.001 });
  nah(e(a).v, e(b).v, 1e-6);
});
test("Tabellenabfrage interpoliert", () => {
  const t = S.integriere({ modus: "gasweg" });
  nah(S.abfrage(t, 2.5).v, S.gaswegGeschlossen(2.5).v, 1e-3);
  nah(S.abfrage(t, 99).v, e(t).v, 1e-12);
});
test("Lkw-Luftstoß: 50 km/h auf 6 m² mit cW 1 → 694 N, fast fünfmal die Haftgrenze (> 4×)", () => {
  nah(S.seitenKraft(), 694.4, 0.1);
  nah(S.seitenKraft() / S.haftgrenze(), 4.72, 0.01);
  assert.ok(S.seitenKraft() > 4 * S.haftgrenze());
});
test("Lkw (80 km/h) überholt das gebremste Auto, Relativtempo 50 km/h, innerhalb der 5 s", () => {
  const l = S.lkwUeberholt();
  assert.ok(l.tPass > 3 && l.tPass < 4.5, String(l.tPass));
  nah(S.kmh(l.vRel), 50, 0.01);
  nah(S.kmh(l.vDu), 30, 0.01);
  nah(l.ort(l.tPass), 0, 1e-6); // Lkw-Front genau neben dir
  assert.ok(l.ort(0) < -20, "Lkw startet hinter dir");
  assert.ok(l.ort(5) > 5, "am Ende ist er vorbei");
});
test("Seitenrutschen: beginnt sofort, endet vor dem Ende der 5 s, versetzt dich nur um knapp eine halbe Spur (< 2 m)", () => {
  const r = S.seitenRutschen();
  assert.ok(r.rutschStart !== null && r.rutschStart < 0.2);
  assert.ok(r.yEnde > 0.5 && r.yEnde < 2, String(r.yEnde));
  const l = S.lkwUeberholt();
  assert.ok(l.tPass + r.rutschEnde < 5, "Rutschen endet vor τ = 5 s");
});
test("Kasten Wasser: 12 × (0,7 kg Wasser + ca. 0,45 kg Glas) + Kasten 1,5 kg ≈ 15 kg", () => {
  nah(12 * (0.7 + 0.45) + 1.5, 15.3, 0.5);
});
test("Rutschprofil: wächst, endet bei ca. 1,6 m", () => {
  const p = S.rutschProfil();
  nah(p.abfrage(0).y, 0, 1e-9);
  assert.ok(p.abfrage(0.3).y > 0.3);
  nah(p.abfrage(1.4).y, S.seitenRutschen().yEnde, 0.05);
});
