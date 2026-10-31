/**
 * Tests für das Reißverschluss-Modell.
 * Aufruf (Repo-Wurzel):  node --test pipeline/sim/reissverschluss.test.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  Aufzeichner,
  freieFahrzeitS,
  pruefeTrajektorien,
  Simulation,
  STANDARD_PARAMETER,
  SZENARIEN,
  trajektorien30Hz,
  ZELLE_M,
} from './reissverschluss.mjs';

const STRATEGIEN = ['frueh', 'reissverschluss'];

const neu = (strategie, szenario, seed, parameter = {}) =>
  new Simulation({ strategie, zuflussKfzH: SZENARIEN[szenario].zuflussKfzH, seed, parameter });

test('Modul ist browserfähig: keine Node-Importe oder -APIs im Kern', () => {
  const quelle = readFileSync(new URL('./reissverschluss.mjs', import.meta.url), 'utf8');
  // Kommentare entfernen, dann nach Node-spezifischem suchen
  const code = quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /^\s*import\s/m, 'kein import');
  assert.doesNotMatch(code, /\brequire\s*\(/);
  assert.doesNotMatch(code, /\bprocess\./);
  assert.doesNotMatch(code, /node:/);
  assert.doesNotMatch(code, /\bBuffer\b/);
  assert.doesNotMatch(code, /__dirname|__filename/);
  assert.doesNotMatch(code, /Math\.random/, 'nur seedbare Zufallszahlen');
});

test('Determinismus: gleicher Seed gibt exakt gleiche Ergebnisse, anderer Seed nicht', () => {
  for (const st of STRATEGIEN) {
    const a = neu(st, 'feierabend', 7).laufeBisEnde();
    const b = neu(st, 'feierabend', 7).laufeBisEnde();
    const c = neu(st, 'feierabend', 8).laufeBisEnde();
    assert.deepEqual(a, b);
    assert.notDeepEqual(a, c);
  }
});

test('Gepaarter Vergleich: gleicher Seed erzeugt bei A und B dieselben Ankünfte', () => {
  const a = neu('frueh', 'rushhour', 5).laufeBisEnde();
  const b = neu('reissverschluss', 'rushhour', 5).laufeBisEnde();
  assert.equal(a.fahrzeugeGesamt, b.fahrzeugeGesamt);
});

test('Invarianten in jedem Schritt: keine Doppelbelegung, kein Überholen, kein Rückwärts, Tempolimit', () => {
  for (const st of STRATEGIEN) {
    const sim = neu(st, 'rushhour', 11);
    const { xb, vmax } = sim;
    let vorher = new Map();
    for (let t = 0; t < 900; t++) {
      sim.schritt();
      const s = sim.momentaufnahme();
      const belegt = new Set();
      const jetzt = new Map();
      for (let i = 0; i < s.n; i++) {
        const schluessel = `${s.spur[i]}:${s.x[i]}`;
        assert.ok(!belegt.has(schluessel), `Doppelbelegung ${schluessel} (t=${s.t})`);
        belegt.add(schluessel);
        assert.ok(s.v[i] >= 0 && s.v[i] <= vmax, 'Geschwindigkeit im Bereich');
        if (s.spur[i] === 1) assert.ok(s.x[i] < xb, 'Spur 1 endet an der Engstelle');
        const alt = vorher.get(s.id[i]);
        if (alt) {
          const dx = s.x[i] - alt.x;
          assert.ok(dx >= 0 && dx <= vmax, `Schrittweite ${dx}`);
          assert.ok(!(alt.spur === 0 && s.spur[i] === 1), 'kein Wechsel nach rechts');
        }
        jetzt.set(s.id[i], { x: s.x[i], spur: s.spur[i] });
      }
      // Reihenfolge innerhalb einer Spur bleibt erhalten (kein Überholen, kein Durchfahren)
      for (const spur of [0, 1]) {
        const ids = [...jetzt.entries()]
          .filter(([id, z]) => z.spur === spur && vorher.get(id)?.spur === spur)
          .sort((p, q) => p[1].x - q[1].x);
        for (let k = 0; k + 1 < ids.length; k++) {
          const a = vorher.get(ids[k][0]).x;
          const b = vorher.get(ids[k + 1][0]).x;
          assert.ok(a < b, `Überholvorgang in Spur ${spur} (t=${s.t})`);
        }
      }
      vorher = jetzt;
    }
  }
});

test('Fahrzeugbilanz: Anfangsbestand + Ankünfte = auf der Straße + wartend + ausgefahren', () => {
  const sim = neu('reissverschluss', 'feierabend', 3);
  const anfang = sim.n;
  const e = sim.laufeBisEnde();
  assert.equal(sim.n, 0);
  assert.equal(sim.wartend[0].length + sim.wartend[1].length, 0);
  // ausgefahren = Fahrzeuge mit Reisezeit (Ankünfte) + Fahrzeuge des Anfangsbestands
  assert.equal(sim.reisezeiten.length, e.fahrzeugeGesamt);
  assert.ok(anfang > 100);
});

test('Wenig Verkehr: kein Stau, Durchsatz entspricht dem Zufluss, Reisezeit nahe der freien Fahrzeit', () => {
  const frei = freieFahrzeitS();
  assert.ok(frei > 500 && frei < 540, `freie Fahrzeit ${frei}`);
  for (const st of STRATEGIEN) {
    const e = neu(st, 'wenig', 21).laufeBisEnde();
    assert.ok(e.stauMaxM < 300, `Stau ${e.stauMaxM}`);
    assert.ok(Math.abs(e.durchsatzKfzH - 1200) < 120, `Durchsatz ${e.durchsatzKfzH}`);
    assert.ok(e.reisezeitMittelS < frei + 15, `Reisezeit ${e.reisezeitMittelS}`);
  }
});

test('Überlast (Rushhour): Stau entsteht, Kapazität der Engstelle im plausiblen Bereich', () => {
  for (const st of STRATEGIEN) {
    const e = neu(st, 'rushhour', 31).laufeBisEnde();
    assert.ok(e.rueckstauEndeM > 2000, `Rückstau ${e.rueckstauEndeM}`);
    // HCM-Richtwert 1.600, Praxisspanne 1.100–1.900 Kfz/h je Spur (Toleranz nach oben für das Modell)
    assert.ok(e.durchsatzKfzH > 1500 && e.durchsatzKfzH < 2100, `Durchsatz ${e.durchsatzKfzH}`);
    assert.ok(e.maxWartend < 100, 'Stau reicht nicht bis zum Streckenanfang');
    assert.ok(e.rueckstauMaxM < STANDARD_PARAMETER.streckeVorM, 'Stau passt in die Strecke');
  }
});

test('Reißverschluss wechselt nahe der Engstelle, Früh-Einordner ab dem Schild', () => {
  const a = neu('frueh', 'feierabend', 4).laufeBisEnde();
  const b = neu('reissverschluss', 'feierabend', 4).laufeBisEnde();
  // Früh-Einordner wechseln nie vor dem Schild (802,5 m), im Stau im Mittel einige 100 m dahinter
  assert.ok(a.wechselAbstandMittelM > 500 && a.wechselAbstandMittelM < 803, `A ${a.wechselAbstandMittelM}`);
  assert.ok(b.wechselAbstandMittelM < 80, `B ${b.wechselAbstandMittelM}`);
});

test('Trajektorien (30 Hz): monoton, ohne Sprünge, unter vmax, ohne Überlappung oder Überholen', () => {
  for (const st of STRATEGIEN) {
    const sim = neu(st, 'rushhour', 41);
    const xbM = sim.xb * ZELLE_M;
    const aufz = new Aufzeichner({ xVonM: xbM - 1100, xBisM: xbM + 330 });
    const von = 600;
    sim.laufeBisEnde({
      maxS: von + 25,
      beiSchritt: (s) => {
        if (s.t >= von - 3) aufz.aufnehmen(s);
      },
    });
    const traj = trajektorien30Hz(aufz, { tVonS: von, dauerS: 15, fps: 30, engstelleM: xbM, xVonRelM: -1000, xBisRelM: 250 });
    const p = pruefeTrajektorien(traj, STANDARD_PARAMETER.vmax * ZELLE_M);
    assert.ok(p.fahrzeuge > 50);
    assert.equal(p.rueckwaertsBilder, 0);
    assert.equal(p.ueberholvorgaengeInSpur, 0);
    assert.equal(p.ueberlappungenUnter4_5m, 0);
    assert.ok(p.maxGeschwindigkeitMs <= STANDARD_PARAMETER.vmax * ZELLE_M + 1e-9, `v ${p.maxGeschwindigkeitMs}`);
    assert.ok(p.maxSprungProBildM <= (STANDARD_PARAMETER.vmax * ZELLE_M) / 30 + 0.02, `Sprung ${p.maxSprungProBildM}`);
    assert.ok(p.kleinsterAbstandGleicheSpurM >= 6.5, `Abstand ${p.kleinsterAbstandGleicheSpurM}`);
    for (const f of traj.fahrzeuge) {
      assert.ok(f.s.every((s) => s >= -1e-9 && s <= 1 + 1e-9), 'Spurwert zwischen 0 und 1');
      assert.equal(f.x.length, f.v.length);
      assert.equal(f.x.length, f.s.length);
    }
  }
});
