// Netto-Modul 2026: Brutto → Lohnsteuer, Solidaritätszuschlag, Kirchensteuer, Sozialabgaben, Netto.
// Wiederverwendbar für alle GELD-Videos (Gehalt, Weihnachtsgeld, 4-Tage-Woche, Pendlerpauschale …). Läuft in Node und im Browser.
//
//   netto({ brutto: 3500 })                                → {brutto, lohnsteuer, soli, kirchensteuer, rv, av, kv, pv, sozial, steuern, netto, …}
//   netto({ brutto: 3500, stkl: 1, kinderlos: true, zusatzbeitrag: 2.9, kirche: false, bundesland: "NW" })
//   lohnsteuerMonat({ brutto, stkl, … })                   → {lst, soli, kist, zve, vsp, …} (Cent-genau wie der PAP)
//   sonstigerBezug({ jahreslohn, bezug, … })               → Lohnsteuer/Soli/KiSt auf eine Einmalzahlung (Weihnachtsgeld)
//   grenzbelastung({ brutto, plus: 200 })                  → was von „plus“ Euro brutto netto ankommt
//   rentenpunkte(bruttoJahr)                               → Entgeltpunkte für ein Jahr Arbeitslohn
//
// Grundlage (F): Programmablaufplan (PAP) für die maschinelle Berechnung der vom Arbeitslohn einzubehaltenden Lohnsteuer 2026,
// BMF-Schreiben IV C 5 - S 2361/00025/016/028 vom 12.11.2025 (Anlage 1). Methoden, Rundungen und Konstanten folgen dem PAP:
// MPARA, MRE4JL, MRE4ABZ, MBERECH, MZTABFB, MLSTJAHR, UPEVP, MVSPKVPV, MVSPHB, UPMLST, UPTAB26, MST5_6, UP5_6, MSOLZ, UPANTEIL,
// MSONST (ohne Versorgungsbezüge, Altersentlastungsbetrag und Entschädigungen; die braucht kein geplantes Video).
// Sozialversicherung 2026 (F): Rechengrößen-Verordnung 2026 (BBG RV/AV 8.450 €/Monat, KV/PV 5.812,50 €/Monat), Beitragssätze
// RV 18,6 %, AV 2,6 %, KV 14,6 % + durchschnittlicher Zusatzbeitrag 2,9 % (BMG-Bekanntmachung), PV 3,6 % + 0,6 % Kinderlosenzuschlag.
// Quellen im Detail: projekte/gehalt-steuerfrei/skript.json („quellen“). Nur Modellrechnung, keine Steuerberatung.

// ---------------------------------------------------------------------------------------------------------------
// Parameter 2026
// ---------------------------------------------------------------------------------------------------------------
export const P2026 = {
  jahr: 2026,
  // Einkommensteuertarif § 32a EStG 2026 (PAP UPTAB26)
  GFB: 12348, // Grundfreibetrag
  ZONE2: 17800, // Beginn 2. Progressionszone (X < 17.800)
  ZONE3: 69879, // Beginn Proportionalzone 42 %
  ZONE4: 277826, // Beginn 45 %
  // Lohnsteuer-Pauschbeträge (PAP MZTABFB)
  ANP: 1230, // Arbeitnehmer-Pauschbetrag
  SAP: 36, // Sonderausgaben-Pauschbetrag
  EFA: 4260, // Entlastungsbetrag Alleinerziehende (Steuerklasse 2)
  KFB_VOLL: 9756, // Kinderfreibetrag + BEA je Kind (Zähler 1,0) in Steuerklasse 1–3
  KFB_HALB: 4878, // Steuerklasse 4
  // Steuerklassen 5/6 (PAP MPARA)
  W1STKL5: 14071,
  W2STKL5: 34939,
  W3STKL5: 222260,
  // Solidaritätszuschlag (PAP MPARA, MSOLZ)
  SOLZFREI: 20350, // Freigrenze (Jahreslohnsteuer, Steuerklasse 3: doppelt)
  SOLZ_SATZ: 0.055,
  SOLZ_MILDERUNG: 0.119,
  // Sozialversicherung 2026 (Arbeitnehmeranteile)
  BBG_RV_JAHR: 101400, // Renten- und Arbeitslosenversicherung (bundeseinheitlich ab 2025)
  BBG_KV_JAHR: 69750, // Kranken- und Pflegeversicherung
  RV_AN: 0.093, // 18,6 % / 2
  AV_AN: 0.013, // 2,6 % / 2
  KV_AN_ALLG: 0.073, // 14,6 % / 2
  KV_AN_ERM: 0.07, // ermäßigter Satz 14,0 % / 2: nur für die Vorsorgepauschale (PAP: KVSATZAN = KVZ/2/100 + 0,07)
  ZUSATZBEITRAG: 2.9, // durchschnittlicher Zusatzbeitrag 2026 in Prozent (je zur Hälfte AN/AG)
  PV_AN: 0.018, // 3,6 % / 2
  PV_AN_SACHSEN: 0.023, // Sachsen: Arbeitnehmer 2,3 %
  PV_KINDERLOS: 0.006, // Zuschlag Kinderlose ab 23 Jahren (nur Arbeitnehmer)
  PV_ABSCHLAG_KIND: 0.0025, // Abschlag je Kind ab dem 2. bis zum 5. (unter 25 Jahren)
  VSP_HOECHST: 1900, // Höchstbetrag KV/PV + AV in der Vorsorgepauschale (PAP MVSPHB)
  // Rente (für die Rentenpunkte)
  DURCHSCHNITTSENTGELT: 51944, // vorläufiges Durchschnittsentgelt 2026 (Anlage 1 SGB VI, Sozialversicherungsrechengrößen-VO 2026)
  RENTENWERT: 42.52, // aktueller Rentenwert ab 1.7.2026 (Rentenwertbestimmungsverordnung 2026)
};

// ---------------------------------------------------------------------------------------------------------------
// Rundung wie im PAP (BigDecimal ROUND_DOWN / ROUND_UP). Kleiner Puffer gegen Gleitkomma-Reste (alle Werte ≥ 0).
// ---------------------------------------------------------------------------------------------------------------
const EPS = 1e-7;
const ab = (x, nk = 0) => { const f = 10 ** nk; return Math.floor(x * f + EPS) / f; };
const auf = (x, nk = 0) => { const f = 10 ** nk; return Math.ceil(x * f - EPS) / f; };
/** kaufmännisch auf Cent (Beiträge zur Sozialversicherung) */
export const cent = (x) => Math.round((x + Math.sign(x) * EPS) * 100) / 100;

/** Einkommensteuertarif 2026 (§ 32a EStG, PAP UPTAB26) für ein zu versteuerndes Einkommen X (volle Euro), Grundtabelle */
export function tarif(x, P = P2026) {
  x = ab(x);
  if (x < P.GFB + 1) return 0;
  if (x < P.ZONE2) {
    const y = ab((x - P.GFB) / 10000, 6);
    return ab((y * 914.51 + 1400) * y);
  }
  if (x < P.ZONE3) {
    const y = ab((x - 17799) / 10000, 6);
    return ab((y * 173.1 + 2397) * y + 1034.87);
  }
  if (x < P.ZONE4) return ab(x * 0.42 - 11135.63);
  return ab(x * 0.45 - 19470.38);
}

/** Lohnsteuer Steuerklasse 5/6 (PAP MST5_6, UP5_6) */
function st56(zzx, P) {
  const up = (zx) => {
    const st1 = tarif(ab(zx * 1.25), P);
    const st2 = tarif(ab(zx * 0.75), P);
    const diff = (st1 - st2) * 2;
    const mist = ab(zx * 0.14);
    return mist > diff ? mist : diff;
  };
  if (zzx > P.W2STKL5) {
    let st = up(P.W2STKL5);
    if (zzx > P.W3STKL5) {
      st = ab(st + (P.W3STKL5 - P.W2STKL5) * 0.42);
      return ab(st + (zzx - P.W3STKL5) * 0.45);
    }
    return ab(st + (zzx - P.W2STKL5) * 0.42);
  }
  let st = up(zzx);
  if (zzx > P.W1STKL5) {
    const vergl = st;
    const hoch = ab(up(P.W1STKL5) + (zzx - P.W1STKL5) * 0.42);
    st = hoch < vergl ? hoch : vergl;
  }
  return st;
}

/** Eingaben vereinheitlichen */
function optionen(o, P) {
  const stkl = o.stkl ?? 1;
  const kinder = o.kinder ?? 0; // Kinder unter 25 (für PV-Abschläge)
  const zkf = o.kinderfreibetraege ?? (kinder > 0 ? kinder : 0); // Zahl der Kinderfreibeträge laut Lohnsteuerabzugsmerkmalen
  const kinderlos = o.kinderlos ?? kinder === 0; // PV-Zuschlag (ab 23 Jahren, ohne Kind)
  return {
    stkl,
    zkf,
    kinder,
    kinderlos,
    zusatzbeitrag: o.zusatzbeitrag ?? P.ZUSATZBEITRAG,
    sachsen: o.bundesland === "SN",
    kirche: o.kirche ?? false,
    kistSatz: o.kistSatz ?? (["BY", "BW"].includes(o.bundesland) ? 0.08 : 0.09),
    rvPflicht: o.rvPflicht ?? true,
    avPflicht: o.avPflicht ?? true,
    faktor: o.faktor ?? 1,
  };
}

/** PV-Satz Arbeitnehmer (PAP MPARA; gleicher Satz für Beitrag und Vorsorgepauschale) */
function pvSatz(op, P) {
  let s = op.sachsen ? P.PV_AN_SACHSEN : P.PV_AN;
  if (op.kinderlos) s += P.PV_KINDERLOS;
  else s -= Math.min(4, Math.max(0, op.kinder - 1)) * P.PV_ABSCHLAG_KIND;
  return s;
}

/**
 * Jahreslohnsteuer nach PAP für einen Jahresarbeitslohn (Euro, auf Cent abgerundet), Grundlage aller Berechnungen.
 * Liefert {st (Jahreslohnsteuer vor Faktor), zve, vsp, ztabfb, kfb, kztab}
 */
function jahresSteuer(zre4j, op, P, { zre4vp = zre4j } = {}) {
  const zre4 = Math.max(0, ab(zre4j, 2));
  // MZTABFB: Pauschbeträge
  let anp = 0, sap = 0, efa = 0, kfb = 0, kztab = 1;
  if (op.stkl < 6) anp = zre4 > 0 ? (zre4 < P.ANP ? auf(zre4) : P.ANP) : 0;
  if (op.stkl === 1) { sap = P.SAP; kfb = ab(op.zkf * P.KFB_VOLL); }
  else if (op.stkl === 2) { efa = P.EFA; sap = P.SAP; kfb = ab(op.zkf * P.KFB_VOLL); }
  else if (op.stkl === 3) { kztab = 2; sap = P.SAP; kfb = ab(op.zkf * P.KFB_VOLL); }
  else if (op.stkl === 4) { sap = P.SAP; kfb = ab(op.zkf * P.KFB_HALB); }
  else if (op.stkl === 5) { sap = P.SAP; }
  const ztabfb = ab(efa + anp + sap, 2);
  // UPEVP: Vorsorgepauschale (Rente + Kranken/Pflege, Höchstbetragsrechnung mit Arbeitslosenversicherung)
  const vspr = op.rvPflicht ? ab(Math.min(zre4vp, P.BBG_RV_JAHR) * P.RV_AN, 2) : 0;
  const kvSatz = op.zusatzbeitrag / 2 / 100 + P.KV_AN_ERM;
  const vspkvpv = ab(Math.min(zre4vp, P.BBG_KV_JAHR) * (kvSatz + pvSatz(op, P)), 2);
  let vsp = auf(vspkvpv + vspr);
  if (op.avPflicht && op.stkl !== 6) {
    const vspalv = ab(P.AV_AN * Math.min(zre4vp, P.BBG_RV_JAHR), 2);
    const vsphb = Math.min(P.VSP_HOECHST, ab(vspalv + vspkvpv, 2));
    const vspn = auf(vspr + vsphb);
    if (vspn > vsp) vsp = vspn;
  }
  const steuerFuer = (abzug) => {
    let zve = zre4 - abzug - vsp;
    let x = 0;
    if (zve < 1) zve = 0;
    else x = ab(zve / kztab);
    const st = op.stkl < 5 ? tarif(x, P) * kztab : st56(x, P);
    return { st, zve };
  };
  const ohneKfb = steuerFuer(ztabfb);
  const mitKfb = op.zkf > 0 ? steuerFuer(ztabfb + kfb) : ohneKfb;
  return { st: ohneKfb.st, zve: ohneKfb.zve, stMitKfb: mitKfb.st, vsp, ztabfb, kfb, kztab, anp, vspr, vspkvpv };
}

/** Solidaritätszuschlag auf eine Jahres-Bemessungsgrundlage (PAP MSOLZ), Ergebnis in Euro (Cent abgerundet) */
function soliJahr(jbmg, kztab, P) {
  const frei = P.SOLZFREI * kztab;
  if (jbmg <= frei) return 0;
  const voll = ab((jbmg * 5.5) / 100, 2);
  const mild = ab(((jbmg - frei) * 11.9) / 100, 2);
  return Math.min(voll, mild);
}

/**
 * Lohnsteuer, Soli und Kirchensteuer für einen laufenden Monatslohn (PAP mit LZZ = 2), Cent-genau.
 * o: {brutto (Euro/Monat), stkl, kinder, kinderfreibetraege, kinderlos, zusatzbeitrag, bundesland, kirche, kistSatz, faktor}
 */
export function lohnsteuerMonat(o, P = P2026) {
  const op = optionen(o, P);
  // MRE4JL: Jahresarbeitslohn = Monatslohn × 12 (Eingabe RE4 in Cent, abgerundet)
  const re4 = Math.round(o.brutto * 100);
  const zre4j = ab((re4 * 12) / 100, 2);
  const j = jahresSteuer(zre4j, op, P);
  const lstJahr = ab(j.st * op.faktor);
  // UPLSTLZZ / UPANTEIL: Monatsanteil in Cent, abgerundet
  const lst = ab((lstJahr * 100) / 12) / 100;
  // Bemessungsgrundlage für Soli und Kirchensteuer (mit Kinderfreibeträgen)
  const jbmg = op.zkf > 0 ? ab(j.stMitKfb * op.faktor) : lstJahr;
  const solzj = soliJahr(jbmg, j.kztab, P);
  const soli = solzj > 0 ? ab(ab(solzj * 100) / 12) / 100 : 0;
  const bk = ab((jbmg * 100) / 12) / 100; // PAP: BK (Bemessungsgrundlage Kirchensteuer, Monat)
  const kist = op.kirche ? ab(bk * op.kistSatz, 2) : 0;
  return { lst, soli, kist, bk, lstJahr, jbmg, zve: j.zve, vsp: j.vsp, ztabfb: j.ztabfb, kztab: j.kztab };
}

/** Arbeitnehmer-Beiträge zur Sozialversicherung für einen Monatslohn (ohne Übergangsbereich/Midijob) */
export function sozialMonat(o, P = P2026) {
  const op = optionen(o, P);
  const b = o.brutto;
  const bbgRV = P.BBG_RV_JAHR / 12, bbgKV = P.BBG_KV_JAHR / 12;
  const rv = op.rvPflicht ? cent(Math.min(b, bbgRV) * P.RV_AN) : 0;
  const av = op.avPflicht ? cent(Math.min(b, bbgRV) * P.AV_AN) : 0;
  const kv = cent(Math.min(b, bbgKV) * (P.KV_AN_ALLG + op.zusatzbeitrag / 2 / 100));
  const pv = cent(Math.min(b, bbgKV) * pvSatz(op, P));
  return { rv, av, kv, pv, summe: cent(rv + av + kv + pv) };
}

/**
 * Brutto → Netto für einen Monat (laufender Arbeitslohn).
 * Rückgabe: {brutto, lohnsteuer, soli, kirchensteuer, steuern, rv, av, kv, pv, sozial, abzuege, netto, zve, vsp}
 */
export function netto(o, P = P2026) {
  if (!(o.brutto >= 0)) throw new Error("brutto fehlt");
  if (o.brutto > 0 && o.brutto <= 2000 && !o.ohneMidijobPruefung) throw new Error("Übergangsbereich (Midijob, bis 2.000 €) ist nicht abgebildet");
  const s = lohnsteuerMonat(o, P);
  const sv = sozialMonat(o, P);
  const steuern = cent(s.lst + s.soli + s.kist);
  const abzuege = cent(steuern + sv.summe);
  return {
    brutto: o.brutto,
    lohnsteuer: s.lst,
    soli: s.soli,
    kirchensteuer: s.kist,
    steuern,
    rv: sv.rv,
    av: sv.av,
    kv: sv.kv,
    pv: sv.pv,
    sozial: sv.summe,
    abzuege,
    netto: cent(o.brutto - abzuege),
    zve: s.zve,
    vsp: s.vsp,
    lstJahr: s.lstJahr,
  };
}

/**
 * Was kommt von „plus“ Euro mehr brutto im Monat netto an? Vergleicht netto(brutto + plus) mit netto(brutto).
 * Rückgabe: {plus, netto, lohnsteuer, soli, kirchensteuer, rv, av, kv, pv, sozial, steuern, quote (Anteil, der ankommt)}
 */
export function grenzbelastung(o, P = P2026) {
  const plus = o.plus ?? 100;
  const a = netto(o, P), b = netto({ ...o, brutto: o.brutto + plus }, P);
  const d = (k) => cent(b[k] - a[k]);
  const r = { plus, vorher: a, nachher: b };
  for (const k of ["netto", "lohnsteuer", "soli", "kirchensteuer", "rv", "av", "kv", "pv", "sozial", "steuern"]) r[k] = d(k);
  r.quote = r.netto / plus;
  return r;
}

/**
 * Lohnsteuer, Soli und Kirchensteuer auf einen sonstigen Bezug (z. B. Weihnachtsgeld) nach PAP MSONST (§ 39b Abs. 3 EStG):
 * Jahressteuer mit Bezug minus Jahressteuer ohne Bezug. jahreslohn = voraussichtlicher Jahresarbeitslohn ohne den Bezug.
 * Hinweis: Die anteilige Jahres-BBG der Sozialversicherung bei Einmalzahlungen bildet sozialSonstigerBezug() ab.
 */
export function sonstigerBezug(o, P = P2026) {
  const op = optionen(o, P);
  const jre4 = ab(o.jahreslohn, 2);
  const ohne = jahresSteuer(jre4, op, P);
  const mit = jahresSteuer(ab(jre4 + o.bezug, 2), op, P);
  const sts = ab((mit.st - ohne.st) * op.faktor); // volle Euro
  const lst = Math.max(0, sts);
  // Soli auf sonstige Bezüge (PAP MSOLZSTS): nur wenn die Jahressteuer mit Bezug (mit Kinderfreibeträgen) über der Freigrenze liegt
  const solzsbmg = ab((op.zkf > 0 ? mit.stMitKfb : mit.st) * op.faktor);
  const soli = solzsbmg > P.SOLZFREI * mit.kztab ? ab(lst * 0.055, 2) : 0;
  // Kirchensteuer: Satz auf die Lohnsteuer des Bezugs (mit Kinderfreibeträgen gerechnet)
  const bmgKist = op.zkf > 0 ? Math.max(0, ab((mit.stMitKfb - ohne.stMitKfb) * op.faktor)) : lst;
  const kist = op.kirche ? ab(bmgKist * op.kistSatz, 2) : 0;
  return { lst, soli, kist, steuern: cent(lst + soli + kist) };
}

/**
 * SV-Beiträge (Arbeitnehmer) auf eine Einmalzahlung mit anteiliger Jahres-BBG (§ 23a SGB IV):
 * beitragspflichtig ist höchstens die Differenz zwischen anteiliger Jahres-BBG (bis zum Auszahlungsmonat) und dem bisher
 * beitragspflichtigen Arbeitsentgelt. o: {monatsbrutto, bezug, monat (1–12, Auszahlungsmonat), …}
 */
export function sozialSonstigerBezug(o, P = P2026) {
  const op = optionen(o, P);
  const m = o.monat ?? 12;
  const bisher = o.monatsbrutto * m; // gleichbleibendes Gehalt angenommen
  const frei = (bbgJahr) => Math.max(0, Math.min(o.bezug, (bbgJahr * m) / 12 - Math.min(bisher, (bbgJahr * m) / 12)));
  const rvBasis = frei(P.BBG_RV_JAHR), kvBasis = frei(P.BBG_KV_JAHR);
  const rv = op.rvPflicht ? cent(rvBasis * P.RV_AN) : 0;
  const av = op.avPflicht ? cent(rvBasis * P.AV_AN) : 0;
  const kv = cent(kvBasis * (P.KV_AN_ALLG + op.zusatzbeitrag / 2 / 100));
  const pv = cent(kvBasis * pvSatz(op, P));
  return { rv, av, kv, pv, summe: cent(rv + av + kv + pv) };
}

/** Entgeltpunkte für einen Jahres-Arbeitslohn (bis zur BBG) und Monatsrente daraus zum aktuellen Rentenwert */
export function rentenpunkte(bruttoJahr, P = P2026) {
  const ep = Math.min(bruttoJahr, P.BBG_RV_JAHR) / P.DURCHSCHNITTSENTGELT;
  return { entgeltpunkte: ep, renteMonat: ep * P.RENTENWERT };
}
