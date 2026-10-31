/**
 * Auswertung „Früh einordnen oder Reißverschluss?“ (nur Node, nutzt reissverschluss.mjs)
 *
 * Aufruf (aus dem Repo-Wurzelverzeichnis):
 *   node pipeline/sim/auswertung_reissverschluss.mjs
 *   LAEUFE=50 SENS_LAEUFE=30 node pipeline/sim/auswertung_reissverschluss.mjs   (Standardwerte)
 *   SCHNELL=1 node pipeline/sim/auswertung_reissverschluss.mjs                 (nur Hauptläufe, ohne Sensitivität)
 *
 * Schreibt nach pipeline/projekte/reissverschluss/:
 *   sim_ergebnisse.json                         Kennzahlen, Parameter, Methodik, Sensitivität
 *   trajektorien_<szenario>_<strategie>.json    30-Hz-Trajektorien eines typischen Laufs
 *   out/ (nicht im Repo)                        Rohdaten für plot_raumzeit.py
 * Danach:  python3 pipeline/sim/plot_raumzeit.py
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  Aufzeichner,
  freieFahrzeitS,
  pruefeTrajektorien,
  Simulation,
  STANDARD_PARAMETER,
  STRATEGIEN,
  SZENARIEN,
  trajektorien30Hz,
  ZELLE_M,
} from './reissverschluss.mjs';

const ZIEL = fileURLToPath(new URL('../projekte/reissverschluss/', import.meta.url));
const OUT = ZIEL + 'out/';
mkdirSync(OUT, { recursive: true });

const LAEUFE = Number(process.env.LAEUFE ?? 50);
const SENS_LAEUFE = Number(process.env.SENS_LAEUFE ?? 30);
const SEED0 = 1000; // Seeds: 1001, 1002, ...
const FENSTER_START_S = 1200; // Animationsfenster beginnt nach 20 min
const FENSTER_DAUER_S = 18;
const FPS = 30;
const MAX_BYTES = 1_450_000;

const strategien = Object.keys(STRATEGIEN);
const szenarien = Object.keys(SZENARIEN);

// --- Statistik ---------------------------------------------------------------

const runde = (x, d = 1) => (Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null);

function statistik(werte, d = 1) {
  const w = werte.filter((x) => Number.isFinite(x));
  const n = w.length;
  if (n === 0) return { n: 0, mittel: null, sd: null, ci95: null, min: null, median: null, max: null };
  const mittel = w.reduce((a, b) => a + b, 0) / n;
  const sd = n > 1 ? Math.sqrt(w.reduce((a, b) => a + (b - mittel) ** 2, 0) / (n - 1)) : 0;
  const s = [...w].sort((a, b) => a - b);
  const median = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  return {
    n,
    mittel: runde(mittel, d),
    sd: runde(sd, d),
    ci95: runde((1.96 * sd) / Math.sqrt(n), d), // Halbbreite des 95-%-Intervalls des Mittelwerts
    min: runde(s[0], d),
    median: runde(median, d),
    max: runde(s[n - 1], d),
  };
}

const mittelwert = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// --- Läufe -------------------------------------------------------------------

const T_FREI = freieFahrzeitS();

function lauf(szenarioId, strategie, seed, parameter = {}, zuflussFaktor = 1) {
  const sim = new Simulation({
    strategie,
    zuflussKfzH: SZENARIEN[szenarioId].zuflussKfzH * zuflussFaktor,
    seed,
    parameter,
  });
  const e = sim.laufeBisEnde();
  e.verlustzeitMittelS = e.reisezeitMittelS - T_FREI;
  // Abstand der Stauspitze zur Engstelle (positiv: Spitze liegt vor der Engstelle)
  e.stauSpitzeVorEngstelleM = e.rueckstauEndeM - e.stauEndeM;
  return e;
}

const KENNZAHLEN = [
  ['rueckstauEndeM', 1],
  ['rueckstauMaxM', 1],
  ['rueckstauMittelM', 1],
  ['stauEndeM', 1],
  ['stauMaxM', 1],
  ['stauMittelM', 1],
  ['stauSpitzeVorEngstelleM', 1],
  ['fahrzeugeImStauAmEnde', 1],
  ['reisezeitMittelS', 1],
  ['verlustzeitMittelS', 1],
  ['durchsatzKfzH', 1],
  ['anteilVonEndenderSpurProzent', 1],
  ['wechselquoteProzent', 1],
  ['wechselAbstandMittelM', 1],
  ['stauDichteFzgProZelle', 2],
  ['maxWartend', 1],
];

function aggregiere(laeufe) {
  const o = {};
  for (const [k, d] of KENNZAHLEN) o[k] = statistik(laeufe.map((l) => l[k]), d);
  return o;
}

/** Vergleich B gegenüber A, gepaart nach Seed (gleiche Ankünfte). */
function vergleiche(a, b) {
  const rel = (k) => {
    const ma = mittelwert(a.map((x) => x[k]));
    const mb = mittelwert(b.map((x) => x[k]));
    const paar = a
      .map((x, i) => (x[k] > 500 ? (100 * (x[k] - b[i][k])) / x[k] : NaN))
      .filter((x) => Number.isFinite(x));
    return {
      A_mittel: runde(ma, 1),
      B_mittel: runde(mb, 1),
      // „B ist x % kürzer als A“, aus den Mittelwerten (positiv = B kürzer)
      reduktionProzent: ma > 500 ? runde((100 * (ma - mb)) / ma, 1) : null, // nur bei Staus über 500 m sinnvoll
      reduktionProzentJeSeed: statistik(paar, 1),
    };
  };
  const diff = (k, d = 1) => {
    const dif = a.map((x, i) => b[i][k] - x[k]);
    const s = statistik(dif, d);
    const ma = mittelwert(a.map((x) => x[k]));
    return {
      A_mittel: runde(ma, d),
      B_mittel: runde(mittelwert(b.map((x) => x[k])), d),
      differenzBMinusA: s,
      differenzProzent: ma ? runde((100 * (s.mittel ?? 0)) / ma, 1) : null,
      // signifikant, wenn das 95-%-Intervall der gepaarten Differenz die 0 nicht enthält
      unterscheidbar: s.n > 1 && Math.abs(s.mittel) > s.ci95,
    };
  };
  return {
    rueckstauEnde: rel('rueckstauEndeM'),
    rueckstauMax: rel('rueckstauMaxM'),
    rueckstauMittel: rel('rueckstauMittelM'),
    stauEnde: rel('stauEndeM'),
    stauMax: rel('stauMaxM'),
    stauMittel: rel('stauMittelM'),
    reisezeit: diff('reisezeitMittelS'),
    durchsatz: diff('durchsatzKfzH'),
  };
}

// --- Hauptläufe --------------------------------------------------------------

const t0 = Date.now();
const haupt = {}; // haupt[szenario][strategie] = Läufe
for (const sz of szenarien) {
  haupt[sz] = {};
  for (const st of strategien) {
    haupt[sz][st] = [];
    for (let i = 1; i <= LAEUFE; i++) haupt[sz][st].push(lauf(sz, st, SEED0 + i));
    process.stdout.write(`Hauptlauf ${sz} ${st}: ${LAEUFE} Läufe (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
  }
}

// Kapazität der Engstelle: Durchsatz bei Überlast (Rushhour)
const kapazitaet = {
  frueh: statistik(haupt.rushhour.frueh.map((l) => l.durchsatzKfzH)),
  reissverschluss: statistik(haupt.rushhour.reissverschluss.map((l) => l.durchsatzKfzH)),
};

// --- Sensitivität ------------------------------------------------------------

const VARIANTEN = [
  { id: 'schild1500', name: 'Früh-Einordner wechseln ab 1.500 m (statt 800 m)', parameterA: { schildM: 1500 } },
  { id: 'schild3000', name: 'Früh-Einordner wechseln ab 3.000 m (frühe Vorankündigung)', parameterA: { schildM: 3000 } },
  { id: 'zone120', name: 'Reißverschluss: Wechselzone 120 m statt 60 m', parameterB: { zoneM: 120 } },
  { id: 'spur40', name: 'Nur 40 % der Fahrzeuge auf der endenden Spur', parameter: { anteilEndendeSpur: 0.4 } },
  { id: 'spur60', name: '60 % der Fahrzeuge auf der endenden Spur', parameter: { anteilEndendeSpur: 0.6 } },
  { id: 'troedeln10', name: 'Weniger Trödeln (p = 0,1)', parameter: { traeodel: 0.1, anfahrTraeodel: 0.1 } },
  { id: 'troedeln30', name: 'Mehr Trödeln (p = 0,3)', parameter: { traeodel: 0.3, anfahrTraeodel: 0.3 } },
  { id: 'vmax4', name: 'Höheres Tempo (vmax = 4 Zellen/s = 108 km/h)', parameter: { vmax: 4 } },
  { id: 'anfahren40', name: 'Zögerliches Anfahren (p0 = 0,4 für stehende Fahrzeuge)', parameter: { anfahrTraeodel: 0.4 } },
  { id: 'wechsel2', name: 'Weniger strenges Abwechseln (Nachbar-Regel nur bis 2 Zellen)', parameter: { abwechselndLueckeZellen: 2 } },
  { id: 'wechsel8', name: 'Strenges Abwechseln (Nachbar-Regel bis 8 Zellen)', parameter: { abwechselndLueckeZellen: 8 } },
  { id: 'draengler', name: 'Drängler: keine Abwechsel-Regel (jede Lücke wird genutzt)', parameter: { abwechselnd: 0 } },
  { id: 'toleranz2', name: 'Hintermann bremst bereitwilliger (Toleranz 2 statt 1)', parameter: { bremsToleranz: 2 } },
  { id: 'zufluss85', name: 'Zufluss 15 % niedriger', zuflussFaktor: 0.85 },
  { id: 'zufluss115', name: 'Zufluss 15 % höher', zuflussFaktor: 1.15 },
];

const sensitivitaet = [];
if (!process.env.SCHNELL) {
  for (const v of VARIANTEN) {
    const eintrag = { id: v.id, name: v.name, laeufe: SENS_LAEUFE, szenarien: {} };
    for (const sz of ['feierabend', 'rushhour']) {
      const a = [];
      const b = [];
      for (let i = 1; i <= SENS_LAEUFE; i++) {
        const pa = { ...(v.parameter ?? {}), ...(v.parameterA ?? {}) };
        const pb = { ...(v.parameter ?? {}), ...(v.parameterB ?? {}) };
        const f = v.zuflussFaktor ?? 1;
        // Läufe ohne Änderung der Strategie-Seite stammen aus den Hauptläufen (gleiche Seeds)
        const ohneA = !v.parameter && !v.parameterA && !v.zuflussFaktor;
        const ohneB = !v.parameter && !v.parameterB && !v.zuflussFaktor;
        a.push(ohneA ? haupt[sz].frueh[i - 1] : lauf(sz, 'frueh', SEED0 + i, pa, f));
        b.push(ohneB ? haupt[sz].reissverschluss[i - 1] : lauf(sz, 'reissverschluss', SEED0 + i, pb, f));
      }
      const vg = vergleiche(a, b);
      eintrag.szenarien[sz] = {
        frueh: { rueckstauEndeM: statistik(a.map((x) => x.rueckstauEndeM)), stauEndeM: statistik(a.map((x) => x.stauEndeM)), durchsatzKfzH: statistik(a.map((x) => x.durchsatzKfzH)), reisezeitMittelS: statistik(a.map((x) => x.reisezeitMittelS)) },
        reissverschluss: { rueckstauEndeM: statistik(b.map((x) => x.rueckstauEndeM)), stauEndeM: statistik(b.map((x) => x.stauEndeM)), durchsatzKfzH: statistik(b.map((x) => x.durchsatzKfzH)), reisezeitMittelS: statistik(b.map((x) => x.reisezeitMittelS)) },
        vergleich: {
          rueckstauEndeReduktionProzent: vg.rueckstauEnde.reduktionProzent,
          stauEndeReduktionProzent: vg.stauEnde.reduktionProzent,
          reisezeitDifferenzProzent: vg.reisezeit.differenzProzent,
          durchsatzDifferenzProzent: vg.durchsatz.differenzProzent,
        },
      };
    }
    sensitivitaet.push(eintrag);
    process.stdout.write(`Sensitivität ${v.id} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
  }
}

// --- Typische Läufe, Trajektorien, Rohdaten für die Plots ----------------------

/** Wählt den Lauf, der den Medianen von Rückstau, Reisezeit und Durchsatz am nächsten kommt. */
function typischerSeed(laeufe) {
  const keys = ['rueckstauEndeM', 'reisezeitMittelS', 'durchsatzKfzH'];
  const med = {};
  const sd = {};
  for (const k of keys) {
    const s = statistik(laeufe.map((l) => l[k]), 3);
    med[k] = s.median;
    sd[k] = s.sd;
  }
  let best = null;
  for (const l of laeufe) {
    let d = 0;
    for (const k of keys) if (sd[k] > 0) d += ((l[k] - med[k]) / sd[k]) ** 2;
    if (best === null || d < best.d) best = { d, seed: l.seed };
  }
  return best.seed;
}

/** Kompakte JSON-Ausgabe: ein Fahrzeug pro Zeile, Zahlen mit höchstens einer Nachkommastelle. */
function kompaktJson(daten) {
  const arr = (a) => '[' + a.map((x) => String(runde(x, 1))).join(',') + ']';
  const sl = daten.staulaenge;
  return (
    '{\n"meta": ' + JSON.stringify(daten.meta) +
    ',\n"staulaenge": {"kolonne_m":' + arr(sl.kolonne_m) +
    ',"rueckstau_m":' + arr(sl.rueckstau_m) +
    ',"ganzer_lauf":{"dt_s":' + sl.ganzer_lauf.dt_s +
    ',"kolonne_m":' + arr(sl.ganzer_lauf.kolonne_m) +
    ',"rueckstau_m":' + arr(sl.ganzer_lauf.rueckstau_m) + '}}' +
    ',\n"engstelle_passiert": ' + JSON.stringify(daten.engstelle_passiert) +
    ',\n"fahrzeuge": [\n' +
    daten.fahrzeuge.map((f) => `{"id":${f.id},"h":${f.h},"f":${f.f},"x":${arr(f.x)},"s":${arr(f.s)},"v":${arr(f.v)}}`).join(',\n') +
    '\n]\n}\n'
  );
}

/** Wert einer je Sekunde gespeicherten Reihe zum Zeitpunkt t (linear interpoliert). */
function linear(karte, t) {
  const k = Math.floor(t);
  const u = t - k;
  const a = karte.get(k) ?? 0;
  const b = karte.get(k + 1) ?? a;
  return a * (1 - u) + b * u;
}

const lauf_info = {};
const pruefungen = {};

for (const sz of szenarien) {
  for (const st of strategien) {
    const seed = typischerSeed(haupt[sz][st]);
    const erg = haupt[sz][st].find((l) => l.seed === seed);
    const parameter = {};
    const sim = new Simulation({ strategie: st, zuflussKfzH: SZENARIEN[sz].zuflussKfzH, seed, parameter });
    const xbM = sim.xb * ZELLE_M;
    const aufz = new Aufzeichner({ xVonM: xbM - 1100, xBisM: xbM + 330 });
    const rv = sim.xb - 1100; // Plotbereich: 8,25 km vor der Engstelle bis zum Streckenende
    const W = sim.N - rv;
    const raster = [];
    const zeile = new Uint8Array(W);
    const aufnehmen = (s) => {
      if (s.t >= FENSTER_START_S - 3 && s.t <= FENSTER_START_S + FENSTER_DAUER_S + 3) aufz.aufnehmen(s);
      const r = new Uint8Array(2 * W);
      s.geschwindigkeitsraster(0, rv, s.N, zeile);
      r.set(zeile, 0);
      s.geschwindigkeitsraster(1, rv, s.N, zeile);
      r.set(zeile, W);
      raster.push(r);
    };
    sim.laufeBisEnde({ beiSchritt: aufnehmen });
    // Kontrolle: derselbe Lauf wie in der Auswertung
    const e2 = sim.ergebnis();
    if (Math.abs(e2.rueckstauEndeM - erg.rueckstauEndeM) > 1e-6 || e2.fahrzeugeGesamt !== erg.fahrzeugeGesamt) {
      throw new Error(`Lauf ${sz}/${st}/${seed} nicht reproduzierbar`);
    }

    // Raum-Zeit-Rohdaten (uint8, 255 = leer), Form [T][Spur][W]
    const T = raster.length;
    const bin = new Uint8Array(T * 2 * W);
    raster.forEach((r, i) => bin.set(r, i * 2 * W));
    writeFileSync(`${OUT}raumzeit_${sz}_${st}.bin`, bin);
    writeFileSync(
      `${OUT}raumzeit_${sz}_${st}.json`,
      JSON.stringify({
        szenario: sz,
        strategie: st,
        seed,
        T,
        W,
        spuren: 2,
        zelleM: ZELLE_M,
        xbIndex: sim.xb - rv,
        schildZellen: sim.schildZellen,
        zuflussDauerS: sim.p.zuflussDauerS,
        zuflussKfzH: sim.zuflussKfzH,
        stauM: sim.stauVerlaufM,
        rueckstauM: sim.rueckstauVerlaufM,
      }),
    );

    // Trajektorien (Fenstergröße so, dass die Datei unter MAX_BYTES bleibt)
    let upstream = 1000;
    let text = '';
    let traj;
    for (;;) {
      traj = trajektorien30Hz(aufz, {
        tVonS: FENSTER_START_S,
        dauerS: FENSTER_DAUER_S,
        fps: FPS,
        engstelleM: xbM,
        xVonRelM: -upstream,
        xBisRelM: 250,
      });
      const frames = traj.frames;
      const stau = [];
      const rueck = [];
      const pass = [];
      for (let f = 0; f < frames; f++) {
        const t = FENSTER_START_S + f / FPS;
        stau.push(linear(aufz.stau, t));
        rueck.push(linear(aufz.rueckstau, t));
        pass.push(aufz.kumulativ.get(Math.floor(t)) ?? 0);
      }
      const ganz = { dt_s: 10, kolonne_m: [], rueckstau_m: [] };
      for (let t = 0; t < sim.stauVerlaufM.length; t += 10) {
        ganz.kolonne_m.push(sim.stauVerlaufM[t]);
        ganz.rueckstau_m.push(sim.rueckstauVerlaufM[t]);
      }
      const meta = {
        szenario: sz,
        szenarioName: SZENARIEN[sz].name,
        strategie: st,
        strategieName: STRATEGIEN[st].name,
        seed,
        zuflussKfzH: SZENARIEN[sz].zuflussKfzH,
        fps: FPS,
        frames,
        fenster: { start_s: FENSTER_START_S, dauer_s: FENSTER_DAUER_S },
        koordinaten:
          'x in m relativ zur Engstelle (negativ = davor, Fahrtrichtung +x). Spur s: 0 = durchgehende Spur, 1 = endende Spur, Zwischenwerte beim Spurwechsel (ca. 1 s). v in m/s. Fahrzeugmitte, Fahrzeuglänge ca. 4,5 m.',
        felder:
          'fahrzeuge[]: id, h = Herkunftsspur (1 = Fahrzeug kommt von der endenden Spur), f = erstes Bild im Fenster, x/s/v = ein Wert je Bild ab f. staulaenge.kolonne_m = Länge der Kolonne, staulaenge.rueckstau_m = Abstand Stauende–Engstelle (je Bild), staulaenge.ganzer_lauf = dasselbe alle 10 s für den ganzen Lauf. engstelle_passiert = Fahrzeuge, die die Engstelle seit Laufbeginn passiert haben.',
        x_bereich_m: [-upstream, 250],
        engstelle_x_m: 0,
        schild_x_m: -sim.schildZellen * ZELLE_M,
        wechselzone_reissverschluss_m: -sim.zoneZellen * ZELLE_M,
        zaehlerHinweis: 'Zähler: staulaenge.rueckstau_m (je Bild im Fenster) bzw. staulaenge.ganzer_lauf.rueckstau_m (alle 10 s).',
      };
      const daten = {
        meta,
        staulaenge: { kolonne_m: stau, rueckstau_m: rueck, ganzer_lauf: ganz },
        engstelle_passiert: pass,
        fahrzeuge: traj.fahrzeuge,
      };
      text = kompaktJson(daten);
      if (Buffer.byteLength(text) <= MAX_BYTES || upstream <= 300) break;
      upstream -= 100;
    }
    const datei = `trajektorien_${sz}_${st}.json`;
    writeFileSync(ZIEL + datei, text);
    const pr = pruefeTrajektorien(traj, STANDARD_PARAMETER.vmax * ZELLE_M);
    pr.dateigroesseKB = Math.round(Buffer.byteLength(text) / 1024);
    pr.xBereichM = [-upstream, 250];
    pruefungen[`${sz}_${st}`] = pr;
    lauf_info[`${sz}_${st}`] = {
      seed,
      datei,
      rueckstauEndeM: runde(erg.rueckstauEndeM, 1),
      stauEndeM: runde(erg.stauEndeM, 1),
      reisezeitMittelS: runde(erg.reisezeitMittelS, 1),
      durchsatzKfzH: runde(erg.durchsatzKfzH, 1),
    };
    process.stdout.write(`Trajektorien ${datei}: ${pr.dateigroesseKB} KB, ${pr.fahrzeuge} Fahrzeuge\n`);
  }
}

// --- Ergebnisdatei -----------------------------------------------------------

/** Gerundete Kernzahlen je Szenario (für Skript und Kurzfassung). */
function kernzahlen(sz) {
  const A = aggregiere(haupt[sz].frueh);
  const B = aggregiere(haupt[sz].reissverschluss);
  const v = vergleiche(haupt[sz].frueh, haupt[sz].reissverschluss);
  const km = (x) => runde(x / 1000, 1);
  return {
    hinweis: 'Rückstau = Abstand Stauende–Engstelle; „am Ende“ = Mittel der letzten 60 s der 30-min-Verkehrsspitze.',
    rueckstauAmEndeKm: { frueh: km(A.rueckstauEndeM.mittel), reissverschluss: km(B.rueckstauEndeM.mittel) },
    rueckstauMaxKm: { frueh: km(A.rueckstauMaxM.mittel), reissverschluss: km(B.rueckstauMaxM.mittel) },
    rueckstauMittelKm: { frueh: km(A.rueckstauMittelM.mittel), reissverschluss: km(B.rueckstauMittelM.mittel) },
    rueckstauReduktionProzent: { amEnde: runde(v.rueckstauEnde.reduktionProzent, 0), max: runde(v.rueckstauMax.reduktionProzent, 0), mittel: runde(v.rueckstauMittel.reduktionProzent, 0) },
    kolonneAmEndeKm: { frueh: km(A.stauEndeM.mittel), reissverschluss: km(B.stauEndeM.mittel) },
    kolonneReduktionProzentAmEnde: runde(v.stauEnde.reduktionProzent, 0),
    stauSpitzeVorEngstelleM: { frueh: runde(A.stauSpitzeVorEngstelleM.mittel, 0), reissverschluss: runde(B.stauSpitzeVorEngstelleM.mittel, 0) },
    reisezeitMin: { frueh: runde(A.reisezeitMittelS.mittel / 60, 1), reissverschluss: runde(B.reisezeitMittelS.mittel / 60, 1) },
    reisezeitDifferenzSekundenBMinusA: v.reisezeit.differenzBMinusA.mittel,
    durchsatzKfzH: { frueh: runde(A.durchsatzKfzH.mittel, 0), reissverschluss: runde(B.durchsatzKfzH.mittel, 0) },
  };
}

const ergebnisse = {};
for (const sz of szenarien) {
  ergebnisse[sz] = {
    name: SZENARIEN[sz].name,
    zuflussKfzH: SZENARIEN[sz].zuflussKfzH,
    zuflussBegruendung: SZENARIEN[sz].begruendung,
    laeufeJeStrategie: LAEUFE,
    strategien: Object.fromEntries(strategien.map((st) => [st, aggregiere(haupt[sz][st])])),
    vergleichBGegenA: vergleiche(haupt[sz].frueh, haupt[sz].reissverschluss),
    typischeLaeufe: { frueh: lauf_info[`${sz}_frueh`], reissverschluss: lauf_info[`${sz}_reissverschluss`] },
    kernzahlen: kernzahlen(sz),
  };
}

const json = {
  meta: {
    titel: 'Früh einordnen oder Reißverschluss? Mikrosimulation einer Fahrstreifenreduktion 2 auf 1',
    erstellt: '2026-10-31',
    modell:
      'Nagel-Schreckenberg-Zellularautomat, 2 Spuren, offene Ränder, Seeded RNG (mulberry32). Quelle: pipeline/sim/reissverschluss.mjs',
    laeufeJeZelle: LAEUFE,
    seeds: `${SEED0 + 1}…${SEED0 + LAEUFE} (je Szenario und Strategie dieselben Seeds, gleiche Ankünfte bei A und B)`,
    kennzeichnung:
      'Alle Zahlen sind Modellergebnisse (Schätzung), keine Messungen. Die Zuflussraten und die Wahl der Strategie-Definition sind Annahmen.',
    methodik: [
      'Strecke: 10 km vor der Engstelle (2 Spuren), 0,9 km dahinter (1 Spur). Zelle 7,5 m, Zeitschritt 1 s, vmax 3 Zellen/s (81 km/h), Trödeln p = 0,2.',
      'Ablauf: Straße bei t = 0 mit freiem Verkehr in Höhe der Zuflussrate gefüllt; 30 min Verkehrsspitze mit konstantem Zufluss (je Spur Bernoulli je Sekunde), danach läuft der Verkehr aus.',
      'Strategie A (Früh einordnen): Wechselwunsch ab Schild 800 m vor der Engstelle; wer nicht sofort wechseln kann, passt sich der Zielspur an und bremst zum Lückensuchen. Strategie B (Reißverschluss): Wechselwunsch erst in den letzten 60 m vor der Engstelle.',
      'Beide Strategien: Wechsel nur in freie Zelle, wenn der Hintermann höchstens um 1 Zelle/s stärker bremsen muss; „im Wechsel“: nicht dicht neben einem Fahrzeug einscheren, das selbst eingefädelt ist.',
      'Stau: zusammenhängende Kolonne von mindestens 10 Fahrzeugen mit v ≤ 1 Zelle/s (27 km/h), Lücken bis 112,5 m. Zwei Längen: Kolonne = von der Stauspitze bis zum Stauende; Rückstau = Abstand Stauende–Engstelle. Bei B liegt die Spitze an der Engstelle (beide Längen gleich), bei A am Ort des Einordnens. „Am Ende“ = Mittel der letzten 60 s der 30-min-Spitze, „Maximum“ = größter Wert des ganzen Laufs, „Mittel“ = Zeitmittel über die 30 min.',
      'Durchsatz: Fahrzeuge, die die Engstelle in Minute 10 bis 30 passieren, hochgerechnet auf Kfz/h. Reisezeit: mittlere Fahrzeit der Fahrzeuge, die während der 30 min einfahren, über die gesamte Strecke (10,9 km).',
      'Vergleich gepaart je Seed; „Reduktion“ = (A − B) / A aus den Mittelwerten (positiv: Reißverschluss kürzer). Streuung: Standardabweichung über die Läufe, ci95 = Halbbreite des 95-%-Intervalls des Mittelwerts.',
    ],
  },
  parameter: {
    ...STANDARD_PARAMETER,
    zelleM: ZELLE_M,
    schrittS: 1,
    vmaxMs: STANDARD_PARAMETER.vmax * ZELLE_M,
    freieFahrzeitS: runde(T_FREI, 1),
    schildEffektivM: Math.round(STANDARD_PARAMETER.schildM / ZELLE_M) * ZELLE_M,
    zoneEffektivM: Math.round(STANDARD_PARAMETER.zoneM / ZELLE_M) * ZELLE_M,
  },
  kalibrierung: {
    hinweis:
      'Kapazität der Engstelle = gemessener Durchsatz bei Überlast (Rushhour). Vergleich: HCM-Richtwert 1.600 pc/h je Spur, Praxisspanne 1.100–1.900.',
    kapazitaetEngstelleKfzH: kapazitaet,
    staudichteFzgProZelleUndSpur: {
      frueh: statistik(haupt.rushhour.frueh.map((l) => l.stauDichteFzgProZelle / 2), 2),
      reissverschluss: statistik(haupt.rushhour.reissverschluss.map((l) => l.stauDichteFzgProZelle / 2), 2),
      hinweis: 'Fahrzeuge je Zelle (7,5 m) und Spur in der Kolonne; 1,0 = Stoßstange an Stoßstange. Näherung: Kolonnenlänge verteilt auf beide Spuren.',
    },
  },
  szenarien: ergebnisse,
  sensitivitaet,
  qualitaetspruefung: {
    hinweis:
      'Prüfung der 30-Hz-Trajektorien der typischen Läufe: Fahrzeuge dürfen sich weder überholen noch überlappen oder springen.',
    laeufe: pruefungen,
  },
  grenzen: [
    'Nagel-Schreckenberg ist grob: Zellen von 7,5 m, 1-s-Schritte, sofortiges Bremsen, keine echte Fahrphysik.',
    'Nur Pkw mit gleichem Wunschtempo; kein Lkw-Anteil, keine Fahrer-Unterschiede, kein Überholen, keine Spurwechsel nach rechts.',
    'Das „Abwechseln“ ist als Nachbarschaftsregel modelliert, nicht aus Fahrerverhalten gemessen. Reale Fahrer sind weniger kooperativ (Drängler, Blockierer).',
    'Das Ergebnis hängt stark davon ab, wo die Früh-Einordner wechseln (Schild-Entfernung) und wie lange die Verkehrsspitze dauert.',
    'Staulängen absolut sind unsicher (Staudichte, Trödelparameter); belastbarer sind die Verhältnisse zwischen A und B.',
  ],
};

writeFileSync(ZIEL + 'sim_ergebnisse.json', JSON.stringify(json, null, 1) + '\n');

// Kurzüberblick auf der Konsole
console.log('\n=== Überblick (Mittelwerte) ===');
for (const sz of szenarien) {
  const e = ergebnisse[sz];
  for (const st of strategien) {
    const a = e.strategien[st];
    console.log(
      `${sz.padEnd(10)} ${st.padEnd(16)} Rückstau Ende ${a.rueckstauEndeM.mittel} (sd ${a.rueckstauEndeM.sd}) | Rückstau Max ${a.rueckstauMaxM.mittel} | Kolonne Ende ${a.stauEndeM.mittel} | Kolonne Max ${a.stauMaxM.mittel} | Reisezeit ${a.reisezeitMittelS.mittel} | Durchsatz ${a.durchsatzKfzH.mittel} | Anteil Spur1 ${a.anteilVonEndenderSpurProzent.mittel} | Wechselquote ${a.wechselquoteProzent.mittel}`,
    );
  }
  const v = e.vergleichBGegenA;
  console.log(
    `  → Rückstau Ende: B ${v.rueckstauEnde.reduktionProzent} % kürzer (je Seed ${v.rueckstauEnde.reduktionProzentJeSeed.mittel} ± ${v.rueckstauEnde.reduktionProzentJeSeed.sd}); Kolonne Ende: ${v.stauEnde.reduktionProzent} %; Rückstau Max: ${v.rueckstauMax.reduktionProzent} %; Reisezeit B−A ${v.reisezeit.differenzBMinusA.mittel} s (±${v.reisezeit.differenzBMinusA.ci95}); Durchsatz B−A ${v.durchsatz.differenzBMinusA.mittel} (±${v.durchsatz.differenzBMinusA.ci95})`,
  );
}
console.log(`\nFertig in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
