/**
 * Mikromodell „Früh einordnen oder Reißverschluss?“ (Simulierbar, Video #2)
 *
 * Nagel-Schreckenberg-Zellularautomat (NaSch) mit zwei Spuren und offenen Rändern.
 * Reines ES-Modul ohne Node-Abhängigkeiten: läuft unverändert in Node und im Browser.
 *
 * Geometrie (x läuft in Fahrtrichtung, Zelle = 7,5 m, Zeitschritt = 1 s)
 *   Spur 0 = durchgehende Spur, Spur 1 = endende Spur.
 *   Spur 1 existiert nur bis zur Engstelle (Zelle xb). Danach gibt es nur Spur 0.
 *   [0 ........................ xb) Engstelle | [xb ... N) eine Spur
 *
 * Regeln je Zeitschritt (alle Fahrzeuge parallel)
 *   1. Spurwechsel (nur Spur 1 -> Spur 0), von vorn nach hinten:
 *        - Wechselwunsch je Strategie (siehe unten)
 *        - Wechsel nur, wenn die Zielzelle frei ist, der neue Vordermann nicht zu dicht steht
 *          (Lücke >= v - Toleranz) und der neue Hintermann höchstens um `bremsToleranz`
 *          Zellen/s stärker bremsen muss (v_hinten - Lücke <= Toleranz).
 *        - Wer wechseln will, aber nicht kann, passt sich der Geschwindigkeit der Zielspur an und
 *          bremst mit Wahrscheinlichkeit `suchBremsWahrsch` zusätzlich um 1, um eine Lücke zu finden.
 *   2. Bewegung nach NaSch: v = min(v+1, vmax, Lücke); mit Wahrscheinlichkeit p: v = v - 1; x += v.
 *      Das Ende von Spur 1 an der Engstelle wirkt wie ein stehendes Hindernis.
 *
 * Strategien
 *   'frueh'           (A) Wechselwunsch ab `schildM` vor der Engstelle (Standard 800 m).
 *   'reissverschluss' (B) Wechselwunsch erst in der Zone `zoneM` vor der Engstelle (Standard 60 m).
 *                         Die Fahrer der Spur 0 lassen Einfädler in Lücken ein (Toleranz).
 *                         Das Abwechseln entsteht aus den Lücken, es wird NICHT vorgegeben.
 *
 * Zufluss: je Spur und Sekunde eine Ankunft mit Wahrscheinlichkeit (Kfz/h der Spur / 3600).
 * Zwei getrennte Zufallsströme (Zufluss, Trödeln) mit festem Seed: gleicher Seed = gleiche Ankünfte
 * bei beiden Strategien (gepaarter Vergleich) und jeder Lauf ist exakt wiederholbar.
 *
 * Grenzen: nur Pkw, alle gleich schnell, kein Überholen, keine Spurwechsel nach rechts,
 * sofortiges Bremsen (typisch für NaSch), Zelle = 7,5 m grob. Siehe sim_ergebnisse.md.
 */

export const ZELLE_M = 7.5;
export const SCHRITT_S = 1;

/** Standardparameter (Annahmen, siehe sim_ergebnisse.md). */
export const STANDARD_PARAMETER = Object.freeze({
  vmax: 3, // Zellen/s = 22,5 m/s = 81 km/h (Baustellentempo 80 km/h)
  traeodel: 0.2, // p, Trödelwahrscheinlichkeit
  anfahrTraeodel: 0.2, // p0, Trödelwahrscheinlichkeit für stehende Fahrzeuge (VDR; = p: klassisches NaSch)
  streckeVorM: 10000, // Strecke vor der Engstelle (Platz für den Rückstau)
  streckeNachM: 900, // Strecke hinter der Engstelle (eine Spur)
  schildM: 800, // Strategie A: Einordnen ab hier
  zoneM: 60, // Strategie B: Wechsel nur in den letzten Metern
  anteilEndendeSpur: 0.5, // Anteil der Ankünfte auf der endenden Spur
  bremsToleranz: 1, // Zellen/s, die ein Hintermann wegen eines Einfädlers bremsen darf
  suchBremsWahrsch: 0.5, // zusätzliches Bremsen beim Lückensuchen
  abwechselnd: 1, // Wahrscheinlichkeit, dass ein Fahrer „im Wechsel“ einfädelt (0 = Drängler)
  abwechselndLueckeZellen: 4, // „Im Wechsel“ gilt, wenn der Nachbar höchstens so viele freie Zellen (4 = 30 m) entfernt ist
  stauGeschwindigkeit: 1, // Zellen/s (= 27 km/h): langsamer gilt als „im Stau“
  stauLueckeM: 112.5, // max. Abstand zwischen zwei langsamen Fahrzeugen innerhalb eines Staus
  stauMinFahrzeuge: 10, // kleinere Ansammlungen zählen nicht als Stau
  zuflussDauerS: 1800, // Dauer der Verkehrsspitze
  messVonS: 600, // Messfenster für den Durchsatz (Anlaufphase ausgeklammert)
  messBisS: 1800,
});

export const STRATEGIEN = Object.freeze({
  frueh: { id: 'frueh', kurz: 'A', name: 'Früh einordnen' },
  reissverschluss: { id: 'reissverschluss', kurz: 'B', name: 'Reißverschluss' },
});

/**
 * Szenarien: Zufluss in Fahrzeugen pro Stunde (beide Spuren zusammen).
 * Die Werte sind Annahmen/Schätzungen, siehe Begründung. Sie sind NICHT auf ein Ergebnis hin gewählt.
 */
export const SZENARIEN = Object.freeze({
  wenig: {
    id: 'wenig',
    name: 'Wenig Verkehr',
    zuflussKfzH: 1200,
    begruendung:
      'Nebenverkehrszeit (mittags, abends): 600 Kfz/h je Spur, deutlich unter der Kapazität einer einzelnen Baustellenspur (HCM-Richtwert 1.600, Praxis 1.100–1.900).',
  },
  feierabend: {
    id: 'feierabend',
    name: 'Feierabend',
    zuflussKfzH: 2400,
    begruendung:
      'Spitzenstunde einer gut belasteten zweistreifigen Autobahnrichtung: 1.200 Kfz/h je Spur, etwa 60 % der Kapazität der freien Strecke, aber über der einer einzelnen Baustellenspur.',
  },
  rushhour: {
    id: 'rushhour',
    name: 'Rushhour',
    zuflussKfzH: 3200,
    begruendung:
      'Stark belastete Pendlerstrecke: 1.600 Kfz/h je Spur, etwa 80 % der Kapazität der freien Strecke, weit über der einer einzelnen Baustellenspur.',
  },
});

// ---------------------------------------------------------------------------
// Zufallszahlen (Seed -> reproduzierbar, keine Abhängigkeiten)

/** mulberry32: kleiner, schneller, seedbarer Zufallsgenerator. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function zufall() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Leitet aus Seed und Salz einen unabhängigen Strom-Seed ab. */
export function mischeSeed(seed, salz) {
  let h = ((seed >>> 0) ^ Math.imul(salz + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// ---------------------------------------------------------------------------

const MAX_FAHRZEUGE = 12000;

export class Simulation {
  /**
   * @param {object} opt
   * @param {'frueh'|'reissverschluss'} opt.strategie
   * @param {number} opt.zuflussKfzH  Gesamtzufluss beider Spuren in Kfz/h
   * @param {number} opt.seed
   * @param {object} [opt.parameter]  überschreibt STANDARD_PARAMETER
   */
  constructor({ strategie, zuflussKfzH, seed = 1, parameter = {} }) {
    if (!STRATEGIEN[strategie]) throw new Error(`Unbekannte Strategie: ${strategie}`);
    const p = { ...STANDARD_PARAMETER, ...parameter };
    this.p = p;
    this.strategie = strategie;
    this.zuflussKfzH = zuflussKfzH;
    this.seed = seed;

    this.vmax = p.vmax;
    this.xb = Math.round(p.streckeVorM / ZELLE_M); // Zelle der Engstelle
    this.N = this.xb + Math.round(p.streckeNachM / ZELLE_M); // Gesamtlänge in Zellen
    this.schildZellen = Math.round(p.schildM / ZELLE_M);
    this.zoneZellen = Math.round(p.zoneM / ZELLE_M);
    this.stauLuecke = Math.round(p.stauLueckeM / ZELLE_M);
    this.einfahrtLuecke = Math.max(0, p.vmax - 1); // freie Zellen, die zur Einfahrt nötig sind
    this.wechselStartZellen = strategie === 'frueh' ? this.schildZellen : this.zoneZellen;

    this.zufluss = mulberry32(mischeSeed(seed, 1));
    this.troedel = mulberry32(mischeSeed(seed, 2));
    this.abwZufall = mulberry32(mischeSeed(seed, 3));
    this.lambda = [
      (zuflussKfzH * (1 - p.anteilEndendeSpur)) / 3600, // Spur 0
      (zuflussKfzH * p.anteilEndendeSpur) / 3600, // Spur 1
    ];

    // Fahrzeuge (Struct of Arrays, Reihenfolge = Einfügereihenfolge)
    this.n = 0;
    this.vId = new Int32Array(MAX_FAHRZEUGE);
    this.vSpur = new Uint8Array(MAX_FAHRZEUGE);
    this.vX = new Int32Array(MAX_FAHRZEUGE);
    this.vV = new Int8Array(MAX_FAHRZEUGE);
    this.vHerk = new Uint8Array(MAX_FAHRZEUGE); // Spur bei der Ankunft
    this.vTIn = new Int32Array(MAX_FAHRZEUGE); // Ankunftszeit, -1 = Anfangsbestand
    this.vSuche = new Uint8Array(MAX_FAHRZEUGE);
    this.naechsteId = 0;

    this.occ0 = new Int32Array(this.N).fill(-1);
    this.occ1 = new Int32Array(this.xb).fill(-1);
    this.wartend = [[], []]; // Ankünfte, die noch nicht einfahren konnten

    this.t = 0;
    // Zähler und Ergebnisse
    this.reisezeiten = [];
    this.kreuzZeiten = []; // Zeitpunkt, an dem ein Fahrzeug die Engstelle überquert
    this.kreuzHerkunft = []; // Herkunftsspur dieses Fahrzeugs
    this.stauVerlaufM = []; // Staulänge je Sekunde (m)
    this.stauVerlaufFzg = [];
    this.rueckstauVerlaufM = []; // Abstand des Stauendes zur Engstelle (m)
    this.angekommen = 0;
    this.maxWartend = 0;
    this.wechsel = 0;
    this.wechselAbstandSummeM = 0;

    this._anfangsbestand();
    this._belegung();
    this._zufluss();
    this._stauMessen();
  }

  // --- Aufbau ---------------------------------------------------------------

  _neuesFahrzeug(spur, x, v, tIn) {
    const i = this.n++;
    if (i >= MAX_FAHRZEUGE) throw new Error('Zu viele Fahrzeuge (MAX_FAHRZEUGE)');
    this.vId[i] = this.naechsteId++;
    this.vSpur[i] = spur;
    this.vX[i] = x;
    this.vV[i] = v;
    this.vHerk[i] = spur;
    this.vTIn[i] = tIn;
    return i;
  }

  /** Straße ist bei t=0 mit freiem Verkehr in der Dichte des Zuflusses gefüllt (Gleichgewicht). */
  _anfangsbestand() {
    const { vmax, p, xb } = this;
    const vFrei = vmax - p.traeodel;
    for (let spur = 0; spur < 2; spur++) {
      const dichte = Math.min(0.5, this.lambda[spur] / vFrei);
      for (let x = 0; x < xb; x++) {
        if (this.zufluss() < dichte) this._neuesFahrzeug(spur, x, vmax, -1);
      }
    }
  }

  _belegung() {
    this.occ0.fill(-1);
    this.occ1.fill(-1);
    for (let i = 0; i < this.n; i++) {
      if (this.vSpur[i] === 0) this.occ0[this.vX[i]] = i;
      else this.occ1[this.vX[i]] = i;
    }
  }

  _zufluss() {
    const { vmax } = this;
    for (let spur = 0; spur < 2; spur++) {
      if (this.t < this.p.zuflussDauerS && this.zufluss() < this.lambda[spur]) {
        this.wartend[spur].push(this.t);
        this.angekommen++;
      }
      const warte = this.wartend[spur];
      if (warte.length > this.maxWartend) this.maxWartend = warte.length;
      const occ = spur === 0 ? this.occ0 : this.occ1;
      if (warte.length > 0 && occ[0] === -1) {
        let luecke = vmax;
        for (let k = 1; k <= vmax; k++) {
          if (occ[k] !== -1) {
            luecke = k - 1;
            break;
          }
        }
        // Einfahrt nur mit Mindestlücke, sonst entstünden am Rand künstliche Pulks
        if (luecke >= this.einfahrtLuecke) {
          const i = this._neuesFahrzeug(spur, 0, Math.min(vmax, luecke), warte.shift());
          occ[0] = i;
        }
      }
    }
  }

  // --- Ein Zeitschritt --------------------------------------------------------

  schritt() {
    this._spurwechsel();
    this._bewegung();
    this.t += SCHRITT_S;
    this._belegung();
    this._zufluss();
    this._stauMessen();
  }

  _spurwechsel() {
    const { xb, N, vmax, occ0, occ1, vV, vSpur, vSuche, vHerk } = this;
    const tol = this.p.bremsToleranz;
    const abw = this.p.abwechselnd;
    const nah = this.p.abwechselndLueckeZellen;
    const rueck = Math.max(vmax, nah + 1);
    vSuche.fill(0, 0, this.n);
    const von = Math.max(0, xb - this.wechselStartZellen);
    for (let c = xb - 1; c >= von; c--) {
      const i = occ1[c];
      if (i < 0) continue;
      const vv = vV[i];
      let moeglich = occ0[c] === -1;
      let dichtDahinterEingefaedelt = false;
      if (moeglich) {
        // neuer Vordermann
        let luecke = vmax;
        let vorn = -1;
        for (let k = 1; k <= rueck && c + k < N; k++) {
          if (occ0[c + k] !== -1) {
            luecke = k - 1;
            vorn = occ0[c + k];
            break;
          }
        }
        if (luecke < vv - tol) moeglich = false;
        if (vorn >= 0 && luecke <= nah && vHerk[vorn] === 1) dichtDahinterEingefaedelt = true;
      }
      if (moeglich) {
        // neuer Hintermann
        for (let k = 1; k <= rueck && c - k >= 0; k++) {
          const j = occ0[c - k];
          if (j !== -1) {
            if (k <= vmax && vV[j] - (k - 1) > tol) moeglich = false;
            if (k - 1 <= nah && vHerk[j] === 1) dichtDahinterEingefaedelt = true;
            break;
          }
        }
      }
      // „Im Wechsel“: nicht direkt neben einem Fahrzeug einscheren, das selbst schon eingefädelt ist
      if (moeglich && dichtDahinterEingefaedelt && (abw >= 1 || this.abwZufall() < abw)) moeglich = false;
      if (moeglich) {
        occ1[c] = -1;
        occ0[c] = i;
        vSpur[i] = 0;
        this.wechsel++;
        this.wechselAbstandSummeM += (xb - c) * ZELLE_M;
      } else {
        vSuche[i] = 1;
      }
    }
  }

  _bewegung() {
    const { xb, N, vmax, occ0, occ1, vX, vV, vSpur, vSuche, n } = this;
    const pTroedel = this.p.traeodel;
    const pAnfahr = this.p.anfahrTraeodel;
    const pSuche = this.p.suchBremsWahrsch;
    const tNeu = this.t + SCHRITT_S;
    const vNeu = new Int8Array(n);

    for (let i = 0; i < n; i++) {
      const x = vX[i];
      let vn = vV[i] + 1;
      if (vn > vmax) vn = vmax;
      // Lücke nach vorn
      let luecke = vmax;
      if (vSpur[i] === 0) {
        for (let k = 1; k <= vmax; k++) {
          const c = x + k;
          if (c >= N) break;
          if (occ0[c] !== -1) {
            luecke = k - 1;
            break;
          }
        }
      } else {
        for (let k = 1; k <= vmax; k++) {
          const c = x + k;
          if (c >= xb || occ1[c] !== -1) {
            luecke = k - 1;
            break;
          }
        }
      }
      if (vn > luecke) vn = luecke;
      if (vSuche[i]) {
        // an die Zielspur anpassen: nächstes Fahrzeug der Spur 0 auf gleicher Höhe oder davor
        for (let k = 0; k <= vmax; k++) {
          const c = x + k;
          if (c >= N) break;
          const j = occ0[c];
          if (j !== -1) {
            if (vV[j] < vn) vn = vV[j];
            break;
          }
        }
        if (vn > 0 && this.troedel() < pSuche) vn -= 1;
      }
      // Trödeln (Zufallszahl wird immer gezogen)
      if (this.troedel() < (vV[i] === 0 ? pAnfahr : pTroedel) && vn > 0) vn -= 1;
      vNeu[i] = vn;
    }

    // Anwenden, Engstelle zählen, ausgefahrene Fahrzeuge entfernen
    let m = 0;
    for (let i = 0; i < n; i++) {
      const x0 = vX[i];
      const x1 = x0 + vNeu[i];
      if (x0 < xb && x1 >= xb) {
        this.kreuzZeiten.push(tNeu);
        this.kreuzHerkunft.push(this.vHerk[i]);
      }
      if (x1 >= N) {
        if (this.vTIn[i] >= 0) this.reisezeiten.push(tNeu - this.vTIn[i]);
        continue;
      }
      if (m !== i) {
        this.vId[m] = this.vId[i];
        this.vSpur[m] = vSpur[i];
        this.vHerk[m] = this.vHerk[i];
        this.vTIn[m] = this.vTIn[i];
      }
      vX[m] = x1;
      vV[m] = vNeu[i];
      m++;
    }
    this.n = m;
  }

  /**
   * Staumessung. Ein Stau ist eine zusammenhängende Kolonne langsamer Fahrzeuge
   * (v <= stauGeschwindigkeit, beide Spuren zusammen). Zwei langsame Fahrzeuge gehören zur selben
   * Kolonne, wenn sie höchstens `stauLueckeM` auseinanderliegen. Kolonnen mit weniger als
   * `stauMinFahrzeuge` Fahrzeugen zählen nicht, ebenso Kolonnen, deren Spitze weit weg vom
   * Einordnungs-/Einfädelpunkt liegt (abgekoppelte Stauwellen).
   *   staulaenge = Länge der Kolonne von der Spitze bis zum Stauende
   *   rueckstau  = Abstand zwischen Stauende und Engstelle
   * Bei B liegt die Spitze an der Engstelle, beide Werte sind dann (fast) gleich. Bei A liegt die Spitze
   * am Ort des frühen Einordnens, der Rückstau ist um diese Strecke länger.
   */
  _stauMessen() {
    const { N, xb, occ0, occ1, vV } = this;
    const vs = this.p.stauGeschwindigkeit;
    const luecke = this.stauLuecke;
    const minFzg = this.p.stauMinFahrzeuge;
    const kopfMin = xb - this.wechselStartZellen - 40; // Spitze höchstens 300 m vor dem Wechselbereich
    const kopfMax = xb + 60; // langsam anfahrende Fahrzeuge reichen bis ca. 450 m hinter die Engstelle
    let besteLaenge = 0;
    let besteAnzahl = 0;
    let besteEnde = -1;
    let kopf = -1; // stromabwärtigste Zelle der laufenden Kolonne
    let ende = -1; // stromaufwärtigste Zelle
    let anzahl = 0;
    const abschliessen = () => {
      if (kopf >= 0 && anzahl >= minFzg && kopf >= kopfMin && kopf <= kopfMax) {
        const laenge = kopf - ende + 1;
        if (laenge > besteLaenge) {
          besteLaenge = laenge;
          besteAnzahl = anzahl;
          besteEnde = ende;
        }
      }
      kopf = -1;
      anzahl = 0;
    };
    for (let c = N - 1; c >= 0; c--) {
      let langsam = 0;
      const i0 = occ0[c];
      if (i0 !== -1 && vV[i0] <= vs) langsam++;
      if (c < xb) {
        const i1 = occ1[c];
        if (i1 !== -1 && vV[i1] <= vs) langsam++;
      }
      if (langsam === 0) continue;
      if (kopf >= 0 && ende - c > luecke) abschliessen();
      if (kopf < 0) kopf = c;
      ende = c;
      anzahl += langsam;
    }
    abschliessen();
    this.stauVerlaufM.push(besteLaenge * ZELLE_M);
    this.stauVerlaufFzg.push(besteAnzahl);
    this.rueckstauVerlaufM.push(besteLaenge > 0 ? Math.max(0, xb - besteEnde) * ZELLE_M : 0);
  }

  // --- Abfragen ---------------------------------------------------------------

  get ende() {
    return (
      this.t >= this.p.zuflussDauerS &&
      this.n === 0 &&
      this.wartend[0].length === 0 &&
      this.wartend[1].length === 0
    );
  }

  /** Momentaufnahme: id, spur, x (Zelle), v (Zellen/s), herkunft. */
  momentaufnahme() {
    const n = this.n;
    return {
      t: this.t,
      n,
      id: this.vId.slice(0, n),
      spur: this.vSpur.slice(0, n),
      x: this.vX.slice(0, n),
      v: this.vV.slice(0, n),
      herk: this.vHerk.slice(0, n),
    };
  }

  /** Geschwindigkeiten je Zelle einer Spur (255 = leer), Zellen von..bis (bis exklusiv). */
  geschwindigkeitsraster(spur, von, bis, ziel) {
    const occ = spur === 0 ? this.occ0 : this.occ1;
    for (let c = von; c < bis; c++) {
      const i = c < occ.length ? occ[c] : -1;
      ziel[c - von] = i === -1 ? 255 : this.vV[i];
    }
  }

  /** Läuft bis zum Ende (oder Notbremse). */
  laufeBisEnde({ maxS = 8000, beiSchritt = null } = {}) {
    if (beiSchritt) beiSchritt(this);
    while (!this.ende && this.t < maxS) {
      this.schritt();
      if (beiSchritt) beiSchritt(this);
    }
    return this.ergebnis();
  }

  /** Kennzahlen eines Laufs (Längen in m, Zeiten in s, Durchsatz in Kfz/h). */
  ergebnis() {
    const p = this.p;
    const dauer = p.zuflussDauerS;
    const nSp = Math.min(dauer, this.stauVerlaufM.length - 1); // letzter Zeitpunkt der Verkehrsspitze
    // „Ende“ = Mittel der letzten 60 s der Verkehrsspitze (robust gegen Einzelmessungen)
    const mittel = (reihe, von, bis) => {
      let sm = 0;
      for (let t = Math.max(0, von); t <= bis; t++) sm += reihe[t];
      return sm / (bis - Math.max(0, von) + 1);
    };
    let stauMax = 0;
    let stauSumme = 0;
    let rueckMax = 0;
    let rueckSumme = 0;
    let dichteSumme = 0;
    let dichteN = 0;
    for (let t = 0; t < this.stauVerlaufM.length; t++) {
      const s = this.stauVerlaufM[t];
      const r = this.rueckstauVerlaufM[t];
      if (s > stauMax) stauMax = s;
      if (r > rueckMax) rueckMax = r;
      if (t <= nSp) {
        stauSumme += s;
        rueckSumme += r;
      }
      if (s >= 300) {
        dichteSumme += this.stauVerlaufFzg[t] / (s / ZELLE_M);
        dichteN++;
      }
    }
    const zeitenImFenster = [];
    const herkImFenster = [];
    for (let k = 0; k < this.kreuzZeiten.length; k++) {
      const z = this.kreuzZeiten[k];
      if (z > p.messVonS && z <= p.messBisS) {
        zeitenImFenster.push(z);
        herkImFenster.push(this.kreuzHerkunft[k]);
      }
    }
    const fensterS = p.messBisS - p.messVonS;
    let wechselnd = 0;
    for (let k = 1; k < herkImFenster.length; k++) {
      if (herkImFenster[k] !== herkImFenster[k - 1]) wechselnd++;
    }
    const aus1 = herkImFenster.filter((h) => h === 1).length;
    const rz = this.reisezeiten;
    const reisezeit = rz.length ? rz.reduce((a, b) => a + b, 0) / rz.length : NaN;
    return {
      seed: this.seed,
      // Kolonne (Spitze bis Stauende); „Ende“ = Mittel der letzten 60 s der Verkehrsspitze
      stauMaxM: stauMax,
      stauMittelM: stauSumme / (nSp + 1),
      stauEndeM: mittel(this.stauVerlaufM, nSp - 59, nSp),
      // Rückstau (Stauende bis Engstelle)
      rueckstauMaxM: rueckMax,
      rueckstauMittelM: rueckSumme / (nSp + 1),
      rueckstauEndeM: mittel(this.rueckstauVerlaufM, nSp - 59, nSp),
      fahrzeugeImStauAmEnde: mittel(this.stauVerlaufFzg, nSp - 59, nSp),
      stauDichteFzgProZelle: dichteN ? dichteSumme / dichteN : NaN,
      reisezeitMittelS: reisezeit,
      durchsatzKfzH: (zeitenImFenster.length / fensterS) * 3600,
      anteilVonEndenderSpurProzent: herkImFenster.length ? (100 * aus1) / herkImFenster.length : NaN,
      wechselquoteProzent: herkImFenster.length > 1 ? (100 * wechselnd) / (herkImFenster.length - 1) : NaN,
      wechselAbstandMittelM: this.wechsel ? this.wechselAbstandSummeM / this.wechsel : NaN,
      maxWartend: this.maxWartend,
      fahrzeugeGesamt: this.angekommen,
      laufzeitS: this.t,
    };
  }
}

/**
 * Mittlere Fahrzeit eines einzelnen Fahrzeugs auf der leeren Strecke in Sekunden (Referenz für die Verlustzeit).
 * Läuft mit demselben Regelwerk (Beschleunigen, Trödeln), nur ohne andere Fahrzeuge.
 */
export function freieFahrzeitS(parameter = {}, anzahl = 400, seed = 12345) {
  const p = { ...STANDARD_PARAMETER, ...parameter };
  const zufall = mulberry32(mischeSeed(seed, 9));
  const N = Math.round(p.streckeVorM / ZELLE_M) + Math.round(p.streckeNachM / ZELLE_M);
  let summe = 0;
  for (let f = 0; f < anzahl; f++) {
    let x = 0;
    let v = p.vmax;
    let t = 0;
    while (x < N) {
      v = Math.min(v + 1, p.vmax);
      if (v > 0 && zufall() < p.traeodel) v -= 1;
      x += v;
      t += 1;
    }
    summe += t;
  }
  return summe / anzahl;
}

// ---------------------------------------------------------------------------
// Aufzeichnung und Interpolation für die Animation (30 Hz)

const glatt = (u) => {
  const s = Math.min(1, Math.max(0, u));
  return s * s * (3 - 2 * s);
};

/** Zeichnet je Sekunde die Fahrzeuge in einem Streckenabschnitt auf. */
export class Aufzeichner {
  /** @param {{xVonM:number, xBisM:number}} bereich  Bereich in Metern ab Streckenanfang */
  constructor({ xVonM, xBisM }) {
    this.xVonM = xVonM;
    this.xBisM = xBisM;
    this.reihen = new Map(); // id -> { t0, herk, x: [], spur: [] }
    this.stau = new Map(); // t -> Länge der Kolonne (m)
    this.rueckstau = new Map(); // t -> Abstand Stauende–Engstelle (m)
    this.kumulativ = new Map(); // t -> Fahrzeuge, die die Engstelle passiert haben
  }

  aufnehmen(sim) {
    const t = sim.t;
    for (let i = 0; i < sim.n; i++) {
      const xm = (sim.vX[i] + 0.5) * ZELLE_M;
      if (xm < this.xVonM || xm > this.xBisM) continue;
      const id = sim.vId[i];
      let r = this.reihen.get(id);
      if (!r) {
        r = { id, t0: t, herk: sim.vHerk[i], x: [], spur: [] };
        this.reihen.set(id, r);
      }
      if (r.t0 + r.x.length !== t) throw new Error(`Aufzeichnung unterbrochen (Fahrzeug ${id})`);
      r.x.push(xm);
      r.spur.push(sim.vSpur[i]);
    }
    this.stau.set(t, sim.stauVerlaufM[t]);
    this.rueckstau.set(t, sim.rueckstauVerlaufM[t]);
    this.kumulativ.set(t, sim.kreuzZeiten.length);
  }
}

/**
 * Weg eines Fahrzeugs als stückweise lineare Funktion der Zeit (Stützstellen im Abstand 1 s),
 * außerhalb der Stützstellen mit der Randgeschwindigkeit verlängert. Liefert Weg P(u) und das
 * Integral I(u) von P ab u = 0, damit sich gleitende Mittel exakt berechnen lassen.
 */
function lineareBahn(xs) {
  const n = xs.length;
  const summe = new Array(n).fill(0); // Integral von 0 bis k
  for (let k = 1; k < n; k++) summe[k] = summe[k - 1] + (xs[k - 1] + xs[k]) / 2;
  const d0 = n > 1 ? xs[1] - xs[0] : 0;
  const d1 = n > 1 ? xs[n - 1] - xs[n - 2] : 0;
  const P = (u) => {
    if (n < 2) return xs[0];
    if (u <= 0) return xs[0] + d0 * u;
    if (u >= n - 1) return xs[n - 1] + d1 * (u - (n - 1));
    const k = Math.floor(u);
    return xs[k] + (xs[k + 1] - xs[k]) * (u - k);
  };
  const I = (u) => {
    if (n < 2) return xs[0] * u;
    if (u <= 0) return xs[0] * u + (d0 * u * u) / 2;
    if (u >= n - 1) {
      const r = u - (n - 1);
      return summe[n - 1] + xs[n - 1] * r + (d1 * r * r) / 2;
    }
    const k = Math.floor(u);
    const f = u - k;
    return summe[k] + xs[k] * f + ((xs[k + 1] - xs[k]) * f * f) / 2;
  };
  return { P, I };
}

/**
 * Erzeugt Trajektorien mit `fps` Bildern pro Sekunde aus den Sekundenaufzeichnungen.
 *  - Weg: lineare Interpolation zwischen den Modellschritten, danach gleitendes Mittel über `glaettungS`
 *    (Standard 0,6 s). Das Mittel ist exakt monoton, überschreitet nie die Modellgeschwindigkeit und
 *    hält den Mindestabstand (7,5 m Mitte–Mitte) zwischen Fahrzeugen derselben Spur ein.
 *  - Geschwindigkeit v (m/s) ist die exakte Ableitung des geglätteten Wegs.
 *  - x relativ zur Engstelle (negativ = davor), Spur `s` kontinuierlich (0 = durchgehend, 1 = endend);
 *    ein Spurwechsel dauert `wechselDauerS` und beginnt `wechselVersatzS` nach dem Modellschritt
 *    (negativ = kurz davor; so bleiben Fahrzeuge beim Einfädeln ohne Überlappung).
 */
export function trajektorien30Hz(
  aufz,
  { tVonS, dauerS, fps = 30, engstelleM, xVonRelM, xBisRelM, glaettungS = 0.6, wechselDauerS = 1, wechselVersatzS = -0.25 },
) {
  const frames = Math.round(dauerS * fps) + 1;
  const fahrzeuge = [];
  const halb = glaettungS / 2;
  for (const r of aufz.reihen.values()) {
    const xs = r.x;
    const { P, I } = lineareBahn(xs);
    const tEnde = r.t0 + xs.length - 1;
    // Spurwechsel-Ereignisse (Zeitpunkt = Modellschritt, in dem gewechselt wurde)
    const ereignisse = [];
    for (let k = 0; k < xs.length - 1; k++) {
      if (r.spur[k] !== r.spur[k + 1]) ereignisse.push({ t: r.t0 + k, von: r.spur[k], nach: r.spur[k + 1] });
    }
    let f0 = -1;
    const X = [];
    const S = [];
    const V = [];
    for (let f = 0; f < frames; f++) {
      const t = tVonS + f / fps;
      // Das Mittelungsfenster muss in der Aufzeichnung liegen
      if (t - halb < r.t0 || t + halb > tEnde) {
        if (f0 >= 0) break;
        continue;
      }
      const u = t - r.t0;
      const x = (I(u + halb) - I(u - halb)) / glaettungS;
      const v = (P(u + halb) - P(u - halb)) / glaettungS;
      const xRel = x - engstelleM;
      if (xRel < xVonRelM || xRel > xBisRelM) {
        if (f0 >= 0) break;
        continue;
      }
      let s = r.spur[Math.min(xs.length - 1, Math.floor(u))];
      for (const e of ereignisse) {
        const w = (t - (e.t + wechselVersatzS)) / wechselDauerS;
        if (w >= 0) s = e.von + (e.nach - e.von) * glatt(w);
      }
      if (f0 < 0) f0 = f;
      X.push(xRel);
      S.push(s);
      V.push(Math.max(0, v));
    }
    if (f0 >= 0) fahrzeuge.push({ id: r.id, h: r.herk, f: f0, x: X, s: S, v: V });
  }
  return { frames, fahrzeuge };
}

/**
 * Plausibilitätsprüfung von 30-Hz-Trajektorien (Ausgabe von `trajektorien30Hz`):
 * Rückwärtsfahren, Sprünge, Höchstgeschwindigkeit, Überholen innerhalb einer Spur,
 * Abstand in einer Spur und Überlappungen (Längsabstand < 4,5 m bei gleicher Querposition).
 */
export function pruefeTrajektorien(traj, vmaxMs) {
  const r1 = (x, d = 1) => Math.round(x * 10 ** d) / 10 ** d;
  const frames = traj.frames;
  let sprungMax = 0;
  let rueckwaerts = 0;
  let minAbstand = Infinity;
  let minAbstandUeberlappung = Infinity;
  let ueberlappung = 0;
  let ueberholt = 0;
  let schnellMax = 0;
  let vorher = new Map();
  for (let fr = 0; fr < frames; fr++) {
    const jetzt = [];
    for (const f of traj.fahrzeuge) {
      const k = fr - f.f;
      if (k < 0 || k >= f.x.length) continue;
      jetzt.push({ id: f.id, x: f.x[k], s: f.s[k] });
      if (k > 0) {
        const dx = f.x[k] - f.x[k - 1];
        if (dx < -0.06) rueckwaerts++;
        if (dx > sprungMax) sprungMax = dx;
      }
      if (f.v[k] > schnellMax) schnellMax = f.v[k];
    }
    for (const g of [0, 1]) {
      const gruppe = jetzt.filter((a) => (g === 0 ? a.s < 0.15 : a.s > 0.85)).sort((a, b) => a.x - b.x);
      for (let i = 0; i + 1 < gruppe.length; i++) {
        const d = gruppe[i + 1].x - gruppe[i].x;
        if (d < minAbstand) minAbstand = d;
        const pa = vorher.get(gruppe[i].id);
        const pb = vorher.get(gruppe[i + 1].id);
        if (pa && pb && pa.g === g && pb.g === g && pa.x > pb.x) ueberholt++;
      }
    }
    const sortiert = [...jetzt].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sortiert.length; i++) {
      for (let j = i + 1; j < sortiert.length && sortiert[j].x - sortiert[i].x < 4.5; j++) {
        if (Math.abs(sortiert[j].s - sortiert[i].s) < 0.6) {
          ueberlappung++;
          minAbstandUeberlappung = Math.min(minAbstandUeberlappung, sortiert[j].x - sortiert[i].x);
        }
      }
    }
    vorher = new Map(jetzt.map((a) => [a.id, { x: a.x, g: a.s < 0.15 ? 0 : a.s > 0.85 ? 1 : -1 }]));
  }
  const spurwechsel = traj.fahrzeuge.filter((f) => new Set(f.s.map((s) => Math.round(s))).size > 1).length;
  return {
    fahrzeuge: traj.fahrzeuge.length,
    frames,
    maxSprungProBildM: r1(sprungMax, 2),
    maxGeschwindigkeitMs: r1(schnellMax),
    erlaubtMs: vmaxMs,
    rueckwaertsBilder: rueckwaerts,
    kleinsterAbstandGleicheSpurM: r1(minAbstand),
    ueberlappungenUnter4_5m: ueberlappung,
    kleinsterAbstandBeiUeberlappungM: ueberlappung ? r1(minAbstandUeberlappung) : null,
    ueberholvorgaengeInSpur: ueberholt,
    spurwechsel,
  };
}
