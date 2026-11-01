// Simulation „Fußgängerampel: Bringt mehrmaliges Drücken des Knopfs etwas?“
// Zwei Fußgänger gehen denselben Weg zur Straßenbahn über drei Ampeln mit drei Steuerungsarten:
//   Ampel 1  Bedarfsampel ohne Koordinierung: Grün erst nach Anforderung UND nach Ablauf der Kfz-Mindestfreigabe
//   Ampel 2  Festzeitsteuerung: Grün im festen Umlauf, der Taster hat auf das Grün keine Wirkung
//   Ampel 3  koordinierte Bedarfsampel („grüne Welle“): Grün nur im Zeitfenster des Umlaufs, die Anforderung muss vor
//            dem Entscheidungszeitpunkt da sein, sonst erst im nächsten Umlauf
// Max (Dauerdrücker) hetzt und drückt ständig, Lea (Einmaldrücker) geht normal und drückt einmal.
// Deterministisch (Monte-Carlo-Auswertung mit festem Seed). Läuft in Node (Tests, Auswertung) und im Browser (szene.js).
// Kennzeichnung: (F) belegt mit Quelle (siehe projekte/fussgaengerampel/skript.json „quellen“), (A) Annahme, (S) Ergebnis.
//
//   steuerung(ampel)                 → {gruenAb(t), gruenPhasen(bis), signal(t), kfz(t), signalKommt(t), anfordern(t)}
//   rennen(opt)                      → {ampeln, personen:{max, lea}, bahn, ...}
//   wartezeitVerteilung(ampel, opt)  → Monte Carlo: mittlere Wartezeit bei zufälliger Ankunft, je Drückverhalten

export const PARAMETER = {
  V_LEA: 1.3, // (A) normales Gehen; Mittel aus vielen Studien 1,34 m/s (F, Weidmann 1993)
  V_MAX: 1.8, // (A) Max „hetzt“ (sehr zügiges Gehen, ca. 6,5 km/h)
  GELB: 3, // (F) Gelbzeit 3 s bei 50 km/h (VwV-StVO zu § 37)
  ZWISCHEN: 2, // (A) Rest der Zwischenzeit nach Gelb (Kfz-Rot), bevor Fußgänger Grün bekommen
  RAEUMEN: 6, // (A) Räumzeit der Fußgänger nach Grünende, bevor die Autos wieder Grün bekommen (inkl. Rot-Gelb)
  ROTGELB: 1, // (A) Rot-Gelb vor Kfz-Grün
  DRUECK_SALVE: 5, // (A) Max: so oft drückt er sofort beim Ankommen …
  DRUECK_SALVE_TAKT: 0.25, // (A) … im Abstand von 0,25 s
  DRUECK_TAKT: 2.0, // (A) danach alle 2 s ein weiterer Druck, bis Grün kommt
  DRUECK_VERZUG: 0.15, // (A) erster Druck 0,15 s nach dem Ankommen (Max)
  DRUECK_VERZUG_LEA: 0.6, // (A) Lea drückt 0,6 s nach dem Ankommen einmal
  HALTESTELLE_M: 2.5, // (A) vom Ende der Furt bis zum Einstieg auf der Haltestelleninsel
};

/**
 * Weg (Meter ab Haustür) und Ampeln. Die Versätze der Umläufe (Ampel 2 und 3) sind Szenario-Werte (A): so gewählt,
 * dass Max an Ampel 2 eine Sekunde vor Grünende ankommt und an Ampel 3 eine Sekunde nach dem Entscheidungszeitpunkt
 * drückt. Alle anderen Werte sind typische Größen (siehe Kennzeichnung).
 */
export const AMPELN = [
  {
    id: 1, name: "Ampel 1", strasse: "Lindenstraße", typ: "bedarf",
    x: 50, breite: 8, // (A) 50 m bis zur Bordsteinkante, 8 m Fahrbahn (2 Spuren)
    gruen: 10, // (F) Mindestfreigabezeit Fußgänger 10 s (München seit 17.12.2020)
    kfzFreiAb: 40, // (A) bis t = 40 s läuft noch die Kfz-Mindestfreigabe seit der letzten Fußgängerfreigabe
    kfzMin: 30, // (A) Kfz-Mindestfreigabe nach jeder Fußgängerfreigabe
  },
  {
    id: 2, name: "Ampel 2", strasse: "Ringstraße", typ: "festzeit",
    x: 140, breite: 15, // (A) große Kreuzung, 4 Spuren
    umlauf: 90, // (F) 90-s-Umläufe sind an Hauptstraßen üblich (München); Obergrenze für Wartezeiten ca. 90 s (Karlsruhe, Münster)
    gruen: 16, // (A) Fußgängergrün je Umlauf
    versatz: 80, // (A) Szenario: Grün von 80 bis 96 s, 170 bis 186 s, …
  },
  {
    id: 3, name: "Ampel 3", strasse: "Bahnhofstraße", typ: "koordiniert",
    x: 225, breite: 7, // (A) Fahrbahn bis zur Haltestelleninsel
    umlauf: 90, // (F, s. o.)
    gruen: 10, // (F) Mindestfreigabe 10 s
    entscheidung: 6, // (A) Entscheidungszeitpunkt 6 s vor Grünbeginn (Reaktionszeit der Anlage, F: München)
    versatz: 147.4, // (A) Szenario: Grünfenster beginnen bei 147,4 s, 237,4 s, … (Max drückt knapp 1 s nach dem Entscheidungszeitpunkt)
  },
];

export const BAHN = { an: 252, tuerAuf: 253, ab: 265 }; // (A) Straßenbahn nach Fahrplan an der Insel

const P = PARAMETER;
const EPS = 1e-9;

// =====================================================================================
// Steuerungen
// =====================================================================================
/**
 * Steuerung einer Ampel. Anforderungen werden gespeichert (F: Bremen, München, GIGA): weitere Drücke ändern nichts.
 * anfordern(t) speichert einen Druck; gruenPhasen(bis) liefert alle Fußgänger-Grünzeiten [[von, bis], …] bis `bis`.
 */
export function steuerung(a, p = P) {
  const druecke = [];
  const self = {
    ampel: a,
    druecke,
    anfordern(t) {
      druecke.push(t);
      druecke.sort((x, y) => x - y);
      return self;
    },
    /** Fußgänger-Grünphasen bis zur Zeit `bis` */
    gruenPhasen(bis = 600) {
      const ph = [];
      if (a.typ === "festzeit") {
        for (let k = Math.floor((-a.versatz) / a.umlauf) - 1; ; k++) {
          const s = a.versatz + k * a.umlauf;
          if (s > bis) break;
          if (s + a.gruen > -60) ph.push([s, s + a.gruen]);
        }
        return ph;
      }
      if (a.typ === "bedarf") {
        // erster noch nicht bedienter Druck → Grün nach Ablauf der Kfz-Mindestfreigabe plus Zwischenzeit
        let frei = a.kfzFreiAb;
        let i = 0;
        while (i < druecke.length) {
          const r = druecke[i];
          const s = Math.max(r, frei) + p.GELB + p.ZWISCHEN;
          if (s > bis) break;
          const e = s + a.gruen;
          ph.push([s, e]);
          while (i < druecke.length && druecke[i] <= e + EPS) i++; // bediente Drücke (auch alle Wiederholungen)
          frei = e + p.RAEUMEN + a.kfzMin;
        }
        return ph;
      }
      if (a.typ === "koordiniert") {
        // Grünfenster nur, wenn vor dem Entscheidungszeitpunkt eine Anforderung gespeichert ist
        let i = 0;
        for (let k = Math.floor((-a.versatz) / a.umlauf) - 1; ; k++) {
          const s = a.versatz + k * a.umlauf;
          if (s > bis) break;
          const e = s + a.gruen;
          const d = s - a.entscheidung;
          // offene Anforderungen: Drücke nach dem letzten Grünende
          let offen = false;
          while (i < druecke.length && druecke[i] <= d + EPS) { offen = true; i++; }
          if (offen) {
            ph.push([s, e]);
            while (i < druecke.length && druecke[i] <= e + EPS) i++; // Drücke während Gelb/Grün sind mitbedient
          }
        }
        return ph.filter(([s, e]) => e > -60);
      }
      throw new Error(`unbekannte Steuerung ${a.typ}`);
    },
    /** Beginn des nächsten Grüns ab t (falls gerade Grün: t selbst); Infinity, wenn ohne weitere Anforderung nie */
    gruenAb(t, bis = 900) {
      for (const [s, e] of self.gruenPhasen(bis)) {
        if (t >= s - EPS && t < e - EPS) return t;
        if (s >= t) return s;
      }
      return Infinity;
    },
    /** Fußgängersignal bei t: "gruen" | "rot" */
    signal(t) {
      for (const [s, e] of self.gruenPhasen(t + 1)) if (t >= s && t < e) return "gruen";
      return "rot";
    },
    /** Kfz-Signal bei t: "gruen" | "gelb" | "rot" | "rotgelb" (Kfz quer zum Fußgängerweg) */
    kfz(t) {
      for (const [s, e] of self.gruenPhasen(t + 60)) {
        const g0 = s - p.GELB - p.ZWISCHEN; // Beginn Gelb
        if (t >= g0 && t < g0 + p.GELB) return "gelb";
        if (t >= g0 + p.GELB && t < e + p.RAEUMEN - p.ROTGELB) return "rot";
        if (t >= e + p.RAEUMEN - p.ROTGELB && t < e + p.RAEUMEN) return "rotgelb";
      }
      return "gruen";
    },
    /** „Signal kommt“ leuchtet: eine Anforderung ist gespeichert und noch nicht bedient (nur Bedarfsampeln) */
    signalKommt(t) {
      if (a.typ === "festzeit") return false;
      const ph = self.gruenPhasen(t + 200);
      for (const r of druecke) {
        if (r > t + EPS) break;
        const g = ph.find(([s, e]) => e >= r - EPS); // Grün, das diesen Druck bedient
        if (!g || g[0] > t) return true;
      }
      return false;
    },
  };
  return self;
}

// =====================================================================================
// Personen und Rennen
// =====================================================================================
/** Druckzeiten eines Wartenden: verhalten "viele" (Max), "einmal" (Lea), "nie" */
export function druckZeiten(ankunft, gruen, verhalten, p = P) {
  if (verhalten === "nie" || gruen <= ankunft + EPS) return [];
  if (verhalten === "einmal") { const t = ankunft + p.DRUECK_VERZUG_LEA; return t < gruen ? [t] : [ankunft]; }
  const z = [];
  const ende = Number.isFinite(gruen) ? gruen : ankunft + 600;
  for (let k = 0; k < p.DRUECK_SALVE; k++) { const t = ankunft + p.DRUECK_VERZUG + k * p.DRUECK_SALVE_TAKT; if (t < ende) z.push(t); }
  for (let t = ankunft + p.DRUECK_VERZUG + (p.DRUECK_SALVE - 1) * p.DRUECK_SALVE_TAKT + p.DRUECK_TAKT; t < ende - 0.3; t += p.DRUECK_TAKT) z.push(t);
  return z;
}

/**
 * Rennen über alle Ampeln. opt: {personen:[{id, v, verhalten}], ampeln, bahn, start:{max:0, lea:0}}
 * Rückgabe je Person: {ankunft[], gruen[], start[] (Beginn Überqueren), warte[], druecke[][] (Zeiten), insel (Ankunft),
 *   phasen[{art:"gehen"|"warten", von, bis, x0, x1, ampel}], x(t) (Meter), zustand(t)}
 */
export function rennen({
  personen = [{ id: "max", v: P.V_MAX, verhalten: "viele" }, { id: "lea", v: P.V_LEA, verhalten: "einmal" }],
  ampeln = AMPELN, bahn = BAHN, p = P,
} = {}) {
  const st = ampeln.map((a) => steuerung(a, p));
  const pers = personen.map((q) => ({ ...q, ankunft: [], gruen: [], start: [], warte: [], druecke: [], phasen: [], t: 0, xPos: 0 }));
  for (let i = 0; i < ampeln.length; i++) {
    const a = ampeln[i], s = st[i];
    // Ankunft an der Bordsteinkante
    for (const q of pers) {
      const ank = q.t + (a.x - q.xPos) / q.v;
      q.phasen.push({ art: "gehen", von: q.t, bis: ank, x0: q.xPos, x1: a.x });
      q.ankunft[i] = ank;
    }
    // in Ankunftsreihenfolge: Grün prüfen, bei Rot drücken (Anforderungen gelten für alle an der Furt)
    const reihe = [...pers].sort((x, y) => x.ankunft[i] - y.ankunft[i]);
    for (const q of reihe) {
      const ank = q.ankunft[i];
      let g = s.gruenAb(ank);
      if (g > ank + EPS) {
        // Rot: drücken (erster Druck zählt; die weiteren Druckzeiten hängen vom Grün ab → iterieren)
        let z = druckZeiten(ank, g, q.verhalten, p);
        for (const t of z) s.anfordern(t);
        let g2 = s.gruenAb(ank);
        for (let k = 0; k < 4 && Math.abs(g2 - g) > EPS; k++) {
          // Grün hat sich durch den eigenen Druck verschoben: Druckzeiten bis zum neuen Grün neu bestimmen
          s.druecke.splice(0, s.druecke.length, ...s.druecke.filter((t) => !z.includes(t)));
          g = g2;
          z = druckZeiten(ank, g, q.verhalten, p);
          for (const t of z) s.anfordern(t);
          g2 = s.gruenAb(ank);
        }
        g = g2;
        q.druecke[i] = z;
      } else q.druecke[i] = [];
      q.gruen[i] = g;
    }
    // Grün kann sich durch spätere Drücke anderer nicht verschieben (Anforderungen sind kumulativ); zur Sicherheit neu
    for (const q of pers) {
      const g = s.gruenAb(q.ankunft[i]);
      q.gruen[i] = g;
      q.druecke[i] = q.druecke[i].filter((t) => t < g + EPS);
      q.warte[i] = Math.max(0, g - q.ankunft[i]);
      q.start[i] = Math.max(q.ankunft[i], g);
      if (q.warte[i] > EPS) q.phasen.push({ art: "warten", von: q.ankunft[i], bis: g, x0: a.x, x1: a.x, ampel: i });
      const ende = q.start[i] + a.breite / q.v;
      q.phasen.push({ art: "queren", von: q.start[i], bis: ende, x0: a.x, x1: a.x + a.breite, ampel: i });
      q.t = ende;
      q.xPos = a.x + a.breite;
    }
  }
  // zur Haltestelle
  for (const q of pers) {
    const ank = q.t + p.HALTESTELLE_M / q.v;
    q.phasen.push({ art: "gehen", von: q.t, bis: ank, x0: q.xPos, x1: q.xPos + p.HALTESTELLE_M });
    q.insel = ank;
    q.xZiel = q.xPos + p.HALTESTELLE_M;
    q.bahn = Number.isFinite(ank) && ank <= bahn.ab ? bahn.ab : Infinity; // (A) Bahn nach Fahrplan
  }
  for (const q of pers) {
    q.x = (t) => {
      if (t <= 0) return 0;
      for (const ph of q.phasen) {
        if (t < ph.bis) {
          if (t <= ph.von) return ph.x0;
          if (ph.art === "warten") return ph.x0;
          return ph.x0 + (ph.x1 - ph.x0) * ((t - ph.von) / (ph.bis - ph.von));
        }
      }
      return q.xZiel;
    };
    q.zustand = (t) => {
      for (const ph of q.phasen) if (t < ph.bis) return { art: t < ph.von ? "start" : ph.art, ampel: ph.ampel, phase: ph };
      return { art: "insel" };
    };
    q.drueckeBis = (t) => q.druecke.flat().filter((x) => x <= t).length;
    q.warteBis = (t) => q.phasen.filter((ph) => ph.art === "warten").reduce((s, ph) => s + Math.max(0, Math.min(t, ph.bis) - ph.von), 0);
    q.druckSumme = q.druecke.flat().length;
    q.warteSumme = q.warte.reduce((s, w) => s + w, 0);
    q.gehSumme = q.phasen.filter((ph) => ph.art !== "warten").reduce((s, ph) => s + (ph.bis - ph.von), 0);
  }
  const byId = Object.fromEntries(pers.map((q) => [q.id, q]));
  return { ampeln: ampeln.map((a, i) => ({ ...a, steuerung: st[i], gruenPhasen: st[i].gruenPhasen(700) })), personen: byId, liste: pers, bahn };
}

// =====================================================================================
// Monte Carlo: mittlere Wartezeit bei zufälliger Ankunft (fester Seed)
// =====================================================================================
export function zufall(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Wartezeit an einer Ampel bei zufälliger Ankunft (gleichverteilt über einen Umlauf bzw. über 0–120 s bei der
 * Bedarfsampel), allein an der Furt. verhalten: "viele" | "einmal" | "nie". Rückgabe {mittel, max, min, nieGruen, n}
 */
export function wartezeitVerteilung(a, { verhalten = "einmal", n = 100000, seed = 7, p = P } = {}) {
  // gleicher Zeitpunkt des ersten Drucks für alle Verhalten, damit nur die Zahl der Drücke verglichen wird
  p = { ...p, DRUECK_VERZUG_LEA: p.DRUECK_VERZUG };
  const r = zufall(seed);
  let summe = 0, max = 0, min = Infinity, nie = 0, gezaehlt = 0;
  for (let k = 0; k < n; k++) {
    const s = steuerung(a.typ === "bedarf" ? { ...a, kfzFreiAb: 0 } : a, p);
    // Bedarfsampel: die letzte Fußgängerfreigabe endete zufällig 0–(kfzMin+60) s vor der Ankunft
    const t0 = 300;
    const ank = a.typ === "bedarf" ? t0 : t0 + r() * a.umlauf;
    if (a.typ === "bedarf") s.ampel = { ...a, kfzFreiAb: t0 - r() * (a.kfzMin + 60) + a.kfzMin };
    const st = a.typ === "bedarf" ? steuerung(s.ampel, p) : s;
    let g = st.gruenAb(ank);
    if (g > ank + EPS) {
      const z = druckZeiten(ank, g, verhalten, p);
      for (const t of z) st.anfordern(t);
      g = st.gruenAb(ank);
      if (verhalten === "viele") { // Druckzeiten bis zum tatsächlichen Grün (identisch, da nur der erste zählt)
        const z2 = druckZeiten(ank, g, verhalten, p);
        for (const t of z2) st.anfordern(t);
        g = st.gruenAb(ank);
      }
    }
    if (!Number.isFinite(g)) { nie++; continue; }
    const w = g - ank;
    summe += w; gezaehlt++;
    max = Math.max(max, w); min = Math.min(min, w);
  }
  return { mittel: gezaehlt ? summe / gezaehlt : Infinity, max, min: gezaehlt ? min : Infinity, nieGruen: nie / n, n };
}

/** Hilfen für Text und Bild: Sekunden → „4:12“ */
export const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
