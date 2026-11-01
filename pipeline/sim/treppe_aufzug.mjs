// Simulation „Treppe oder Aufzug: Wer ist im Bürohaus wirklich schneller oben?“
// Deterministisches Modell (keine Zufallszahlen): eine Person nimmt die Treppe, eine den Aufzug, beide starten im
// Erdgeschoss zur selben Zeit (Knopfdruck = Start). Quellen und Kennzeichnung (F/S/A) stehen in PARAMETER und in
// projekte/treppe-aufzug/skript.json („quellen“). Läuft in Node (Tests, Auswertung) und im Browser (szene.js).
//
//   treppe(ziel)                         → {zeit, etagen:[Ankunft je Etage], phasen, hoehe(t), zustand(t)}
//   aufzug(ziel, {warte, halte:[2]})     → {zeit, phasen, hoehe(t), zustand(t), fahrzeit, standzeit}
//   rennen(ziel, opt)                    → {treppe, aufzug, sieger, differenz, ueberholt}
//   breakEven({warte, halte})            → höchste Etage, in der die Treppe noch gewinnt
//
// Höhe in Metern über dem Erdgeschoss; Etage = Höhe / ETAGE_M.

export const PARAMETER = {
  ETAGE_M: 3.5, // (A) Geschosshöhe Bürobau, üblich 3,3–3,8 m
  STEIGUNG_M: 0.175, // (A) Stufenhöhe, DIN 18065 erlaubt im Bürobau 14–19 cm
  AUFTRITT_M: 0.28, // (A) Schrittmaßregel 2 s + a = 63 cm → 2 · 17,5 + 28
  V_TREPPE_HORIZONTAL: 0.61, // (F) Weidmann 1993, Mittel aus ca. 58 Studien: 0,610 m/s horizontal treppauf
  PODEST_WEG_M: 1.6, // (A) Weg über ein Podest (Wende um 180°)
  V_PODEST: 1.0, // (A) Gehen mit Wende, langsamer als frei in der Ebene (1,34 m/s, Weidmann)
  ERMUEDUNG_JE_ETAGE: 0.02, // (A) jede weitere Etage dauert 2 % länger (Messungen zeigen sinkendes Tempo beim Steigen)
  V_AUFZUG: 1.6, // (A) Nenngeschwindigkeit üblicher Büroaufzüge 1,0–2,5 m/s
  A_AUFZUG: 0.8, // (A) Beschleunigung und Bremsung, üblich 0,8–1,2 m/s²
  START_VERZUG: 0.5, // (A) Bremse lösen, anfahren
  EINFAHREN: 0.5, // (A) Feinpositionieren am Halt
  TUER_AUF: 2.5, // (F) EMSD Hongkong, Mindestwert für die Verkehrsberechnung, 0,8 m seitlich öffnend
  TUER_ZU: 3.0, // (F) EMSD Hongkong, 0,8 m seitlich öffnend
  TUER_OFFEN_START: 3.0, // (F) Property Council of Australia: door dwell 1 = 3 s
  TUER_OFFEN_HALT: 1.0, // (F) Property Council of Australia: door dwell 2 mindestens 1 s
  JE_PERSON: 1.0, // (F) Property Council of Australia: 1 s je Person beim Ein- bzw. Aussteigen
  WARTEZEIT: 25, // (F/S) mittlere Wartezeit Büro: 30-s-Intervall ≈ 22,5–25,5 s Warten, Mittag 25 s (Designing Buildings/BCO)
};

const P = PARAMETER;

/** Zeit für die Treppe je Etage (ohne Ermüdung): zwei Läufe plus zwei Podeste */
export function treppeJeEtage(p = P) {
  const stufen = Math.round(p.ETAGE_M / p.STEIGUNG_M); // 20 Steigungen
  const proLauf = stufen / 2; // zweiläufige Treppe: 10 Steigungen je Lauf
  const auftritte = proLauf - 1; // 9 Auftritte je Lauf (der letzte Tritt ist das Podest)
  const lauf = (auftritte * p.AUFTRITT_M) / p.V_TREPPE_HORIZONTAL;
  const podest = p.PODEST_WEG_M / p.V_PODEST;
  return { stufen, lauf, podest, etage: 2 * lauf + 2 * podest };
}

/** Phasen-Abspieler: [{art, von, bis, h0, h1, ...}] → hoehe(t), zustand(t) */
function abspieler(phasen) {
  const finde = (t) => {
    if (t <= phasen[0].von) return phasen[0];
    for (const ph of phasen) if (t < ph.bis) return ph;
    return phasen[phasen.length - 1];
  };
  return {
    hoehe(t) {
      const ph = finde(t);
      if (t >= ph.bis) return ph.h1;
      if (t <= ph.von) return ph.h0;
      return ph.h ? ph.h(t - ph.von) : ph.h0 + (ph.h1 - ph.h0) * ((t - ph.von) / (ph.bis - ph.von));
    },
    zustand(t) {
      const ph = finde(t);
      return { art: ph.art, k: ph.bis > ph.von ? Math.min(1, Math.max(0, (t - ph.von) / (ph.bis - ph.von))) : 1, phase: ph };
    },
  };
}

/** Treppe bis Etage `ziel`: Lauf, Podest, Lauf, Podest je Etage; Ermüdung verlängert jede weitere Etage */
export function treppe(ziel, p = P) {
  const j = treppeJeEtage(p);
  const phasen = [];
  const etagen = [0];
  let t = 0;
  for (let e = 0; e < ziel; e++) {
    const f = Math.pow(1 + p.ERMUEDUNG_JE_ETAGE, e);
    const h = e * p.ETAGE_M;
    const halb = p.ETAGE_M / 2;
    const teile = [
      { art: "lauf", d: j.lauf * f, h0: h, h1: h + halb, seite: 0 },
      { art: "podest", d: j.podest * f, h0: h + halb, h1: h + halb, seite: 0 },
      { art: "lauf", d: j.lauf * f, h0: h + halb, h1: h + p.ETAGE_M, seite: 1 },
      { art: "podest", d: j.podest * f, h0: h + p.ETAGE_M, h1: h + p.ETAGE_M, seite: 1 },
    ];
    for (const x of teile) {
      phasen.push({ art: x.art, von: t, bis: t + x.d, h0: x.h0, h1: x.h1, etage: e, seite: x.seite });
      t += x.d;
    }
    // Ziel: Ankunft auf dem Etagenpodest (das letzte Podest der Zieletage wird nicht mehr gegangen)
    if (e === ziel - 1) {
      const letztes = phasen.pop();
      t = letztes.von;
    }
    etagen.push(t);
  }
  phasen.push({ art: "oben", von: t, bis: Infinity, h0: ziel * p.ETAGE_M, h1: ziel * p.ETAGE_M, etage: ziel });
  return { zeit: t, etagen, phasen, ...abspieler(phasen), jeEtage: j.etage };
}

/** Fahrt über die Strecke d mit Trapezprofil (Beschleunigung a, Höchstgeschwindigkeit v) */
export function fahrt(d, p = P) {
  const a = p.A_AUFZUG, v = p.V_AUFZUG;
  if (d <= 0) return { dauer: 0, s: () => 0 };
  const dA = (v * v) / (2 * a);
  if (d >= 2 * dA) {
    const tA = v / a, tK = (d - 2 * dA) / v, T = 2 * tA + tK;
    return {
      dauer: T, vmax: v,
      s(t) {
        if (t <= 0) return 0;
        if (t < tA) return 0.5 * a * t * t;
        if (t < tA + tK) return dA + v * (t - tA);
        if (t < T) { const r = T - t; return d - 0.5 * a * r * r; }
        return d;
      },
    };
  }
  const tA = Math.sqrt(d / a), T = 2 * tA; // Dreieck: Höchstgeschwindigkeit wird nicht erreicht
  return {
    dauer: T, vmax: a * tA,
    s(t) {
      if (t <= 0) return 0;
      if (t < tA) return 0.5 * a * t * t;
      if (t < T) { const r = T - t; return d - 0.5 * a * r * r; }
      return d;
    },
  };
}

/**
 * Aufzug bis Etage `ziel`. opt.warte: Wartezeit bis die Kabine im EG ist; opt.halte: Zwischenhalte (Etagen) für andere;
 * opt.personenHalt: Personen, die je Zwischenhalt ein- bzw. aussteigen. Ziel = ausgestiegen in der Zieletage.
 */
export function aufzug(ziel, { warte = P.WARTEZEIT, halte = [], personenHalt = 1 } = {}, p = P) {
  const phasen = [];
  let t = 0;
  const add = (art, d, h0, h1, extra = {}) => {
    phasen.push({ art, von: t, bis: t + d, h0, h1, ...extra });
    t += d;
  };
  add("warten", warte, 0, 0);
  add("tuer_auf", p.TUER_AUF, 0, 0);
  add("einsteigen", p.TUER_OFFEN_START, 0, 0); // Einsteigen (1 s) liegt in der Offenhaltezeit
  add("tuer_zu", p.TUER_ZU, 0, 0);
  const stopps = [...halte.filter((e) => e > 0 && e < ziel).sort((a, b) => a - b), ziel];
  let h = 0, fahrzeit = 0;
  stopps.forEach((e, i) => {
    const h1 = e * p.ETAGE_M;
    const f = fahrt(h1 - h, p);
    const hStart = h;
    add("anfahren", p.START_VERZUG, h, h);
    add("fahrt", f.dauer, h, h1, { h: (x) => hStart + f.s(x), ziel: e, vmax: f.vmax });
    add("einfahren", p.EINFAHREN, h1, h1);
    fahrzeit += f.dauer;
    add("tuer_auf", p.TUER_AUF, h1, h1, { etage: e });
    if (i < stopps.length - 1) {
      add("halt", Math.max(p.TUER_OFFEN_HALT, personenHalt * p.JE_PERSON), h1, h1, { etage: e });
      add("tuer_zu", p.TUER_ZU, h1, h1, { etage: e });
    } else add("aussteigen", p.JE_PERSON, h1, h1, { etage: e });
    h = h1;
  });
  phasen.push({ art: "oben", von: t, bis: Infinity, h0: h, h1: h });
  const standzeit = t - fahrzeit;
  return { zeit: t, phasen, fahrzeit, standzeit, warte, halte: stopps.slice(0, -1), ...abspieler(phasen) };
}

/** Rennen bis Etage `ziel`: Sieger, Differenz, Überholzeitpunkt (Aufzug zieht in der Höhe an der Treppe vorbei) */
export function rennen(ziel, opt = {}, p = P) {
  const T = treppe(ziel, p), A = aufzug(ziel, opt, p);
  let ueberholt = null;
  for (let t = 0.01; t < Math.min(T.zeit, A.zeit) + 5; t += 0.01) {
    if (A.hoehe(t) > T.hoehe(t) + 1e-6 && T.hoehe(t) > 0) { ueberholt = { t: +t.toFixed(2), hoehe: +T.hoehe(t).toFixed(2), etage: +(T.hoehe(t) / p.ETAGE_M).toFixed(2) }; break; }
  }
  const differenz = Math.abs(T.zeit - A.zeit);
  return { ziel, treppe: T, aufzug: A, sieger: T.zeit < A.zeit ? "treppe" : "aufzug", differenz, ueberholt };
}

/** Höchste Etage (1..max), in der die Treppe noch gewinnt; 0 = Aufzug gewinnt schon im 1. Stock */
export function breakEven(opt = {}, p = P, max = 40) {
  let beste = 0;
  for (let e = 1; e <= max; e++) {
    const halte = (opt.halte || []).filter((h) => h < e);
    if (rennen(e, { ...opt, halte }, p).sieger === "treppe") beste = e;
    else break;
  }
  return beste;
}

/** Halte für Varianten „n Zwischenhalte“: gleichmäßig unter der Zieletage verteilt */
export function halteFuer(n, ziel) {
  return Array.from({ length: n }, (_, i) => Math.max(1, Math.round(((i + 1) * ziel) / (n + 1))));
}
