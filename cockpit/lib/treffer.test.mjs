// Tests für cockpit/lib/treffer.mjs (Follower 24 h, Aufrufe 24 h, Treffer, Serie). Aufruf: node --test cockpit/lib/treffer.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { median, punkteOrdnen, wertBei, zuwachs24, aufrufe24, jeTausend, bewerten, naechsterTeil, frageAusCaption, teilAusText, teilIdee, STUNDE, TAG } from "./treffer.mjs";

const T0 = Date.parse("2026-11-09T11:30:00Z");
const p = (h, wert) => ({ t: T0 + h * STUNDE, wert });

test("median: gerade und ungerade Anzahl, leer", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), null);
});

test("punkteOrdnen sortiert, verwirft Unsinn, gleiche Zeit: letzter Wert gewinnt", () => {
  const r = punkteOrdnen([p(2, 5), { t: "kaputt", wert: 1 }, p(1, 4), p(2, 6), { t: T0, wert: "x" }]);
  assert.deepEqual(r.map((x) => x.wert), [4, 6]);
});

test("wertBei: linear zwischen zwei Punkten, exakter Punkt gilt als gemessen", () => {
  const pk = punkteOrdnen([p(0, 100), p(10, 200)]);
  const w = wertBei(pk, T0 + 5 * STUNDE);
  assert.equal(w.wert, 150);
  assert.equal(w.geschaetzt, true);           // Klammer 5 h je Seite
  assert.deepEqual(wertBei(pk, T0 + 10 * STUNDE), { wert: 200, abstand_h: 0, geschaetzt: false });
});

test("wertBei: Lücke über 12 h → nur der nahe Punkt (≤ 2 h), sonst nichts", () => {
  const pk = punkteOrdnen([p(0, 100), p(30, 400)]);
  assert.equal(wertBei(pk, T0 + 1 * STUNDE).wert, 100);
  assert.equal(wertBei(pk, T0 + 15 * STUNDE), null);
});

test("zuwachs24: Follower vor dem Post und 24 h danach (Beispiel 2.830 → 2.841)", () => {
  const pk = punkteOrdnen([p(-0.4, 2830), p(0.6, 2831), p(23.5, 2840), p(24.5, 2842)]);
  const z = zuwachs24(T0, pk, T0 + 30 * STUNDE);
  assert.equal(z.status, "ok");
  assert.equal(z.vorher, 2830);   // 2830 + 0,4 × 1
  assert.equal(z.nachher, 2841);  // Mitte zwischen 2840 und 2842
  assert.equal(z.plus, 11);
  assert.equal(z.geschaetzt, false);
});

test("zuwachs24: läuft noch → bisheriger Zuwachs; fehlende Daten → keine_daten", () => {
  const pk = punkteOrdnen([p(-0.5, 10), p(5, 13)]);
  assert.deepEqual(zuwachs24(T0, pk, T0 + 6 * STUNDE), { status: "laeuft", plus: null, bisher: 3 });
  assert.equal(zuwachs24(T0, pk, T0 + 40 * STUNDE).status, "keine_daten");
});

test("aufrufe24: Momentaufnahmen um die 24-h-Marke, Startpunkt 0 beim Posten", () => {
  const a = aufrufe24(T0, [p(20, 800), p(26, 1100)], T0 + 30 * STUNDE);
  assert.equal(a.status, "ok");
  assert.equal(a.views, 1000);
  // tägliche Momentaufnahme (8 h und 40 h nach dem Post): linear geschätzt
  const g = aufrufe24(T0, [p(8, 300), p(40, 900)], T0 + 50 * STUNDE);
  assert.deepEqual([g.views, g.geschaetzt], [600, true]);
  // Lücke über 24 h auf einer Seite und kein Punkt in 3 h: keine Zahl statt einer falschen
  assert.equal(aufrufe24(T0, [p(60, 900)], T0 + 70 * STUNDE).status, "keine_daten");
  assert.equal(aufrufe24(T0, [p(5, 300)], T0 + 6 * STUNDE).status, "laeuft");
});

test("jeTausend: Follows je 1.000 Aufrufe, erst ab 100 Aufrufen", () => {
  assert.equal(jeTausend(11, 2750), 4);
  assert.equal(jeTausend(1, 99), null);
  assert.equal(jeTausend(null, 500), null);
});

const reihe = (werte) => werte.map((v24, i) => ({ post_id: `p${i}`, gesendet: T0 + i * TAG / 2, v24 }));

test("bewerten: Treffer ab 3× Median der letzten 10 (Beispiel Studium: 27-facher Median)", () => {
  const b = bewerten(reihe([300, 250, 280, 260, 290, 7721]));
  const t = b.get("p5");
  assert.equal(t.median, 280);
  assert.equal(t.vergleich, 5);
  assert.equal(t.treffer, true);
  assert.equal(t.faktor, 27.6);
  assert.equal(b.get("p4").median, null);     // vorher nur 4 Videos: kein Urteil
});

test("bewerten: genau 3× zählt, knapp darunter nicht; nur die letzten 10 zählen", () => {
  const alt = [10000, 10000, 10000];          // alte Ausreißer fallen aus dem Fenster der letzten 10
  const b = bewerten(reihe([...alt, ...Array(10).fill(100), 300, 299]));
  assert.equal(b.get("p13").treffer, true);
  assert.equal(b.get("p13").median, 100);
  assert.equal(b.get("p14").treffer, false);
});

test("bewerten: Videos ohne 24-h-Zahl werden übersprungen", () => {
  const b = bewerten(reihe([100, null, 100, 100, 100, 100, 500]));
  assert.equal(b.get("p6").vergleich, 5);
  assert.equal(b.get("p1").faktor, null);
});

test("naechsterTeil: Treffer → Teil 2; Folgeteil ≥ Median → weiter bis Teil 4; darunter Ende", () => {
  const treffer = { median: 100, faktor: 3.2, treffer: true, ueber_median: true };
  const mittel = { median: 100, faktor: 1.4, treffer: false, ueber_median: true };
  const schwach = { median: 100, faktor: 0.8, treffer: false, ueber_median: false };
  assert.equal(naechsterTeil(1, treffer), 2);
  assert.equal(naechsterTeil(1, mittel), null);
  assert.equal(naechsterTeil(2, mittel), 3);
  assert.equal(naechsterTeil(3, treffer), 4);
  assert.equal(naechsterTeil(4, treffer), null);   // höchstens 3 Folgeteile
  assert.equal(naechsterTeil(2, schwach), null);
  assert.equal(naechsterTeil(1, { median: null, faktor: null }), null);
});

test("frageAusCaption und teilAusText", () => {
  assert.equal(frageAusCaption("Studium oder Ausbildung: Wer hat mit 40 mehr? 🎓 Ich hab's simuliert. Team …? 👇 #studium"), "Studium oder Ausbildung: Wer hat mit 40 mehr?");
  assert.equal(teilAusText("Teil 3: Studium oder Ausbildung?"), 3);
  assert.equal(teilAusText("Mieten oder kaufen?"), 1);
});

test("teilIdee: Folgeteil mit Typ, Teil, Serie und ohne doppeltes „Teil“ im Titel", () => {
  const i = teilIdee({ konto: "simulierbar", teil: 3, wurzelTitel: "Teil 2: Studium oder Ausbildung?", post: { post_id: "x", link: "l" }, bewertung: { median: 280, faktor: 1.6, vergleich: 10 }, views24: 450 });
  assert.equal(i.titel, "Teil 3: Studium oder Ausbildung?");
  assert.equal(i.typ, "folgeteil");
  assert.equal(i.teil, 3);
  assert.equal(i.serie.post_id, "x");
  assert.match(i.hook, /„Teil 3“ groß im ersten Bild/);
  const a2 = teilIdee({ konto: "stelldirvor", teil: 2, wurzelTitel: "Was wäre, wenn …?", post: {}, bewertung: { median: 300, faktor: 4, vergleich: 8 }, views24: 1200 });
  assert.ok(a2.ereignis && !a2.hook);
  assert.match(a2.treffer, /Treffer: 1200 Aufrufe nach 24 h = 4× Median der letzten 8 Videos/);
});
