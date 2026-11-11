// „Rentenerhöhung 2027: Was bleibt von 82 Euro mehr?“ · Stil 21 Nachtkarte, Simulierbar, Slot acc1-2026-11-12-mittag (Format Was bleibt).
// Der Geldweg der Rentenerhöhung auf einer Reliefkarte bei Nacht: Von der Rentenkasse (Lichtteppich oben) wandert ein Lichtkopf mit 82 € durch zwei
// Schranken (Krankenkasse, Pflege) zum Konto; an jeder Schranke zweigt ein Abzug in Korallrot ab und der Weg wird schmaler. Das Finanzamt holt sich
// seinen Teil erst vom Konto zurück. Die Lichtsäule des Kontos schrumpft mit dem Rest. Alle Werte kommen aus pipeline/sim/rente_erhoehung.mjs (Tests dort).
// Deterministisch: window.renderAt(t). Zeiten der Anker aus audio/sprech_woerter.json (Wortzeiten der einen Aufnahme, gleiche Zeitachse wie timing.json).
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, buendeln } from "../../engine/sim_atmosphaere.js";
import { reliefKarte, stadtLichter, strassenNetz, route, ortsMarke, wolkenSchicht, karteZeit } from "../../engine/stil_nachtkarte.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/rente_erhoehung.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 1024;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich): BLEIBT = Mint, ABZÜGE = Korall. Kein Gelb.
const BL = "#3DDC97";
const AB = "#FF5C7A";
const AKZENT = "#ECE6DA";

const Z = videoZahlen();
const glatt = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
const sanft = (t, a, b) => ease.inOutCubic(fortschritt(t, a, b));

/** Gesprochene Wörter für die Untertitel: Zahlwörter als Ziffern, „Sieben Komma drei“ als 7,3 */
const ZIFFERN = { zweitausendsiebenundzwanzig: "2027", zweitausendzwanzig: "2020", zweitausend: "2.000", zweiundachtzig: "82", zweiundsiebzig: "72", siebzehn: "17", fünfundfünfzig: "55", vierundzwanzig: "24", dreihundertdreißig: "330" };
const KOMMA = { "sieben|drei": "7,3", "drei|sechs": "3,6" };
function untertitelTiming(timing, woerter) {
  const roh = woerter.map(([w, s, e]) => ({ w, s, e }));
  const liste = [];
  for (let i = 0; i < roh.length; i++) {
    const n = (x) => x.w.toLowerCase().replace(/[.,?!:;]+$/g, "");
    if (roh[i + 1] && n(roh[i + 1]) === "komma" && roh[i + 2]) {
      const k = KOMMA[`${n(roh[i])}|${n(roh[i + 2])}`];
      if (k) { liste.push({ wort: k + (/[.,?!:;]+$/.exec(roh[i + 2].w) || [""])[0], start: roh[i].s, ende: roh[i + 2].e }); i += 2; continue; }
    }
    const m = /^(.*?)([.,?!:;]*)$/.exec(roh[i].w);
    const z = ZIFFERN[m[1].toLowerCase()];
    liste.push({ wort: (z || m[1]) + m[2], start: roh[i].s, ende: roh[i].e });
  }
  const segmente = timing.segmente.map((s) => ({ ...s, woerter: liste.filter((w) => w.start >= s.start - 0.02 && w.start < s.ende + 0.02) }));
  return { ...timing, segmente };
}

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const sprech = (await lade("audio/sprech_woerter.json")).woerter;
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const zpUT = new Zeitplan(untertitelTiming(timing, sprech), { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["800 40px 'SB Display'", "700 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "BLEIBT", farbe: BL, woerter: ["bleibt*", "bleiben*", "82*", "55*", "330*", "Konto*", "72*", "74*"] },
      b: { name: "ABZÜGE", farbe: AB, woerter: ["Krankenkasse*", "Pflege*", "Finanzamt*", "Steuer*", "steuerpflichtig*", "24*", "17*", "allein*", "Zuschuss*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // ---------- Anker an gesprochenen Wörtern (n-tes Vorkommen, Satzzeichen egal) ----------
  const norm = (w) => w.replace(/[.,?!:;]+$/g, "");
  const W = (wort, n = 0, ende = false) => {
    let k = 0;
    for (const [w, s, e] of sprech) if (norm(w) === wort && k++ === n) return ende ? e : s;
    throw new Error(`Wort nicht gefunden: ${wort} #${n}`);
  };
  const A = {
    rente: W("Rentenerhöhung"), z27: W("zweitausendsiebenundzwanzig"), n82: W("zweiundachtzig"), mehr: W("mehr"), wie: W("Wie"), bleibtH: W("bleibt"), davon: W("davon"),
    gerechnet: W("Gerechnet"), beginn: W("Rentenbeginn"), n2020: W("zweitausendzwanzig"), kindern: W("Kindern"),
    klar: W("Klar"), fast: W("fast"), an: W("an"), oder: W("Oder"), doch: W("doch"),
    zuerst: W("Zuerst"), kk: W("Krankenkasse"), sieben: W("Sieben"), prozent1: W("Prozent", 0, true), dazu: W("dazu"), zusatz: W("Zusatzbeitrag"), zusatzE: W("Zusatzbeitrag", 0, true), sind: W("sind"), weniger1: W("weniger", 0, true),
    dann: W("Dann"), pflege: W("Pflegeversicherung"), drei: W("drei", 1), prozent2: W("Prozent", 1, true), allein: W("allein"), zuschuss: W("Zuschuss"), wieder: W("Wieder"), weniger2: W("weniger", 1, true),
    plus: W("Plus"), juli: W("Juli"), wie2: W("Wie", 1), jahr27: W("zweitausendsiebenundzwanzig", 1), anE: W("an", 1, true),
    auf: W("Auf"), konto: W("Konto"), n72: W("zweiundsiebzig"), euro72: W("Euro", 4, true), fa1: W("Finanzamt"), noch: W("noch"), dran: W("dran"),
    freib: W("Rentenfreibetrag"), fest: W("festgeschrieben"), eurob: W("Eurobetrag"), bei: W("Bei"), waechst: W("wächst"), mit: W("mit", 3, true),
    damit: W("Damit"), steuerpfl: W("steuerpflichtig"), jeder: W("Jeder"), n24: W("vierundzwanzig"), besteuert: W("besteuert"), bescheid: W("Steuerbescheid"), danach: W("danach", 0, true),
    rund: W("Rund"), n17: W("siebzehn"), fa2: W("Finanzamt", 1), von: W("Von", 0), n82e: W("zweiundachtzig", 1), bleibenE: W("bleiben", 0), n55: W("fünfundfünfzig"), euro55: W("Euro", 8, true),
    rentner: W("Rentner", 1), pflegeW: W("Pflege"), alleinW: W("allein", 1), und: W("Und", 1), voll: W("voll"), steuerpfl2: W("steuerpflichtig", 1),
    p27: W("Zweitausendsiebenundzwanzig"), wirkt: W("wirkt"), sechs: W("sechs", 1), monate: W("Monate"), im: W("Im"), bleiben2: W("bleiben", 1), n330: W("dreihundertdreißig"), euro330: W("Euro", 9, true),
    sk: W("Von", 1), skErh: W("Rentenerhöhung", 1), skBl: W("bleiben", 2), skGut: W("gut"), skDrittel: W("Drittel"),
  };

  // ---------- Zahlenfunktionen der Zeit (alles aus sim/rente_erhoehung.mjs) ----------
  const nachKvTeil = Z.erh - Z.kv; // 76,01 nach der Krankenkasse (7,3 %)
  const bleibtMonat = (t) => {
    const erh = Z.erh * glatt(t, 0.3, 6.4);
    return erh - (Z.kv * glatt(t, A.prozent1, A.prozent1 + 0.7) + Z.zus * glatt(t, A.zusatzE, A.zusatzE + 0.7) + Z.pv * glatt(t, A.prozent2, A.prozent2 + 0.7) + Z.steuerMonat * glatt(t, A.rund + 0.35, A.fa2 + 0.4));
  };
  const abzugMonat = (t) => Z.kv * glatt(t, A.prozent1, A.prozent1 + 0.7) + Z.zus * glatt(t, A.zusatzE, A.zusatzE + 0.7) + Z.pv * glatt(t, A.prozent2, A.prozent2 + 0.7) + Z.steuerMonat * glatt(t, A.rund + 0.35, A.fa2 + 0.4);
  const kontoWert = (t) => (t < A.rund ? Z.nachSv : Z.nachSv - Z.steuerMonat * glatt(t, A.rund + 0.35, A.fa2 + 0.4));
  const brutto27 = (t) => Z.brutto27 * glatt(t, A.wirkt + 0.5, A.monate + 0.3);
  const bleibt27 = (t) => Z.bleibt27 * glatt(t, A.im + 0.1, A.euro330 - 0.5);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#05070C");
  dunst(szene, "#0B1220", 0.026);
  rigNacht(szene, buehne.renderer, { richtung: [-0.9, 0.42, -0.35], farbe: "#A9C2EE", staerke: 2.8, bereich: 26, schatten: Math.min(SCHATTEN, 1024), himmelStaerke: 0.3, umgebungsStaerke: 0.32 });
  const KASSE = [0, -14], G1 = [-3, -8], G2 = [3, -3], KONTO = [-0.5, 3.5], FA = [2.0, 8.8], FB = [-1.9, 6.0], ER = [-0.6, 6.0];
  const S1 = [-9.5, -9], S2 = [10, -4];
  const MONATE = Array.from({ length: 12 }, (_, i) => [-2.75 + 1.1 * (i % 6), i < 6 ? 12.4 : 14.8]); // zwei Reihen: Januar bis Juni hinten, Juli bis Dezember vorn
  const flach = [[...KASSE, 3.4], [...G1, 1.0], [...G2, 1.0], [...KONTO, 1.9], [...FA, 1.1], [...S1, 0.8], [...S2, 0.8], [FA[0] + 2.6, FA[1] + 0.6, 1.5], ...MONATE.map(([x, z]) => [x, z, 0.8]), [...FB, 0.9], [...ER, 0.9]];
  const karte = reliefKarte({ breite: 32, tiefe: 48, seed: 7, hoehe: 1.1, aufl: 150, flach });
  szene.add(karte);
  szene.add(stadtLichter(karte, { mitte: KASSE, radius: 3.4, anzahl: 5000, staerke: 1.5, seed: 1 }));
  szene.add(stadtLichter(karte, { mitte: KONTO, radius: 1.9, anzahl: 1800, strahlen: 5, seed: 2, farbe: "#8CFFC8", kalt: 0.2 }));
  szene.add(stadtLichter(karte, { mitte: [FA[0] + 2.6, FA[1] + 0.6], radius: 1.5, anzahl: 1500, strahlen: 5, seed: 3, farbe: "#FF9AAE", kalt: 0.1 }));
  szene.add(stadtLichter(karte, { mitte: S1, radius: 0.8, anzahl: 400, strahlen: 3, seed: 4, farbe: "#FF9AAE" }));
  szene.add(stadtLichter(karte, { mitte: S2, radius: 0.8, anzahl: 400, strahlen: 3, seed: 5, farbe: "#FF9AAE" }));
  for (const [m, r, n, s] of [[[-10, 3], 1.2, 600, 6], [[9, -12], 1.4, 800, 7], [[-9, 10], 1.2, 600, 8], [[10, 15], 1.0, 450, 9], [[-12, -16], 1.5, 900, 10], [[10, -20], 1.2, 600, 11]]) szene.add(stadtLichter(karte, { mitte: m, radius: r, anzahl: n, strahlen: 3, seed: s }));
  szene.add(strassenNetz(karte, [[[-10, 3], [-6, 0], KONTO], [[9, -12], [6, -6], G2], [[-12, -16], [-6, -12], KASSE], [[10, -20], [5, -17], KASSE], [[-9, 10], [-4, 7], KONTO], [[10, 15], [6, 12], FA]]));

  // Der Geldweg: vier Abschnitte, die Breite folgt dem Rest (82 → 74,82 → 71,87 → Konto), dazu drei Abzugsäste in Korall (Breite folgt dem Abzug)
  const br = (v) => 0.3 * Math.pow(v / Z.erh, 1.5);
  const ast = (v) => 0.3 * Math.sqrt(v / Z.erh);
  const leg0 = route(karte, [KASSE, [0.2, -12.4], [-1.4, -10.2], G1], { farbe: BL, breite: br(Z.erh) });
  const leg1 = route(karte, [G1, [-1.6, -6.4], [0.4, -4.6], G2], { farbe: BL, breite: br(Z.nachKv) });
  const leg2 = route(karte, [G2, [2.4, -1], [0.8, 1.2], KONTO], { farbe: BL, breite: br(Z.nachSv) });
  const ast1 = route(karte, [G1, [-5.4, -8.8], S1], { farbe: AB, breite: ast(Z.kv + Z.zus) });
  const ast2 = route(karte, [G2, [6.6, -3.4], S2], { farbe: AB, breite: ast(Z.pv) });
  const ast3 = route(karte, [KONTO, [1.0, 5.0], [1.8, 6.8], FA], { farbe: AB, breite: ast(Z.steuerMonat) });
  szene.add(leg0, leg1, leg2, ast1, ast2, ast3);
  const mKasse = ortsMarke(karte, KASSE, { farbe: AKZENT, hoehe: 3.2, staerke: 0.7 });
  const mG1 = ortsMarke(karte, G1, { farbe: AB, hoehe: 2.4, staerke: 1.1 });
  const mG2 = ortsMarke(karte, G2, { farbe: AB, hoehe: 2.4, staerke: 1.1 });
  const mKonto = ortsMarke(karte, KONTO, { farbe: BL, hoehe: 3.4, staerke: 1.0 });
  const mFA = ortsMarke(karte, FA, { farbe: AB, hoehe: 2.8, staerke: 1.1 });
  const mFB = ortsMarke(karte, FB, { farbe: AKZENT, hoehe: 1.5, staerke: 0.9 });
  const mER = ortsMarke(karte, ER, { farbe: BL, hoehe: 3.0, staerke: 1.0 });
  szene.add(mKasse, mG1, mG2, mKonto, mFA, mFB, mER);
  const monAlt = MONATE.slice(0, 6).map((p) => ortsMarke(karte, p, { farbe: "#7C8AA5", hoehe: 2.4, staerke: 0.55 }));
  const monNeu = MONATE.slice(6).map((p) => ortsMarke(karte, p, { farbe: BL, hoehe: 2.4, staerke: 1.0 }));
  [...monAlt, ...monNeu].forEach((m) => szene.add(m));
  szene.add(wolkenSchicht({ breite: 80, tiefe: 80, hoehe: 3.4, lagen: 2, deckung: 0.4, deckkraft: 0.5, massstab: 0.045 }));
  buendeln(szene);

  // ---------- Zustand ----------
  const u = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
  const S = (t) => ({
    u0: u(t, 0.5, A.zuerst + 0.4), u1: u(t, A.zusatzE + 0.4, A.pflege + 0.1), u2: u(t, A.prozent2 + 0.8, A.konto + 0.2),
    a1: u(t, A.kk, A.zusatzE + 0.6), a2: u(t, A.pflege + 0.1, A.prozent2 + 0.8), a3: u(t, A.jeder - 0.4, A.fa2 + 0.2),
    g1: sanft(t, A.zuerst, A.kk + 0.5) * (1 - 0.45 * sanft(t, A.dann - 0.4, A.dann + 0.8)), g2: sanft(t, A.dann, A.pflege + 0.6) * (1 - 0.45 * sanft(t, A.plus, A.plus + 0.9)),
    faS: 0.6 * sanft(t, A.fa1, A.fa1 + 0.9) + 0.4 * sanft(t, A.damit + 0.3, A.damit + 1.2), fbS: sanft(t, A.freib, A.freib + 0.9), erS: 0.12 * sanft(t, A.freib + 0.2, A.freib + 1.1) + 0.88 * sanft(t, A.waechst - 0.3, A.mit),
    monAltS: 0.32 * sanft(t, A.plus - 0.2, A.plus + 0.6), monNeuS: 0.32 * sanft(t, A.plus + 0.2, A.juli + 0.8),
  });
  const hoeheNeu = (t, i) => 0.32 + 0.68 * sanft(t, A.wirkt + 0.35 + 0.3 * i, A.wirkt + 0.35 + 0.3 * i + 0.5);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 260);
  const B = [0.1, 1.3, 0.72];
  const sh = (t, ziel, d, fov = 36) => ({ t, ziel: [ziel[0], 0.3, ziel[1]], d, fov });
  const SH = [
    sh(0, [-1.2, -9.5], 21), sh(4.2, [-0.6, -11.5], 15), sh(6.8, [-1.0, -10.5], 17), sh(A.gerechnet + 0.2, [-1.4, -9.6], 18), sh(A.beginn + 3.2, [-1.4, -8.0], 15),
    sh(A.klar - 0.1, [-0.5, 3.0], 17), sh(A.oder + 0.6, [-0.5, 3.0], 12),
    sh(A.zuerst + 0.2, [-3.2, -8.0], 11), sh(A.sieben + 2.0, [-3.3, -8.2], 10), sh(A.dann - 1.6, [-1.5, -6.0], 13),
    sh(A.pflege + 0.4, [3.0, -3.2], 10.5), sh(A.wieder, [2.2, -2.2], 12), sh(A.plus - 0.4, [0.4, 8.0], 20), sh(A.wie2, [0.2, 9.5], 19), sh(A.anE, [0.3, 7.0], 17),
    sh(A.auf, [-0.4, 3.9], 11), sh(A.fa1 - 0.1, [0.3, 6.0], 14), sh(A.freib + 0.3, [-0.2, 6.2], 12), sh(A.bei, [-0.2, 6.2], 11),
    sh(A.damit, [0.3, 6.2], 11), sh(A.jeder + 0.2, [0.3, 5.8], 12), sh(A.bescheid, [0.3, 5.8], 13),
    sh(A.rund, [0.4, 5.8], 12), sh(A.von, [0.0, 4.8], 11), sh(A.rentner - 0.2, [0.4, 4.2], 17), sh(A.p27 - 0.4, [0.0, 13.2], 16), sh(A.im, [0.0, 13.6], 13.5), sh(A.sk - 0.2, [0.0, 8.5], 24), sh(DAUER, [0.0, 7.0], 27),
  ].sort((a, b) => a.t - b.t);
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const ziel = a.ziel.map((v, k) => lerp(v, b.ziel[k], p));
    const d = lerp(a.d, b.d, p);
    return { pos: [ziel[0] + B[0] * d, ziel[1] + B[1] * d, ziel[2] + B[2] * d], ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  regie.zoom({ t: A.damit + 0.4, ziel: [FA[0], 1.0, FA[1] - 0.4], staerke: 0.12, halt: 1.6, rueck: 0.9 });
  regie.zoom({ t: A.von + 0.3, ziel: [KONTO[0], 1.4, KONTO[1]], staerke: 0.12, halt: 1.8, rueck: 0.9 });
  regie.zoom({ t: A.im + 0.9, ziel: [0, 1.0, 14.0], staerke: 0.12, halt: 1.6, rueck: 0.9 });

  const post = { ...GRADING.karte, tiltMitte: 0.5, tiltBreite: 0.4, tiltStaerke: 0.5 };
  const welt = {
    szene, kamera, post,
    update(t) {
      karteZeit(t);
      const s = S(t);
      leg0.setze(s.u0); leg1.setze(s.u1); leg2.setze(s.u2); ast1.setze(s.a1); ast2.setze(s.a2); ast3.setze(s.a3);
      mKasse.setze(t, 1);
      mG1.setze(t, s.g1); mG2.setze(t, s.g2);
      mKonto.setze(t, lerp(0.12, kontoWert(t) / Z.erh, sanft(t, A.konto - 0.9, A.konto + 0.9)));
      mFA.setze(t, s.faS); mFB.setze(t, s.fbS); mER.setze(t, s.erS);
      monAlt.forEach((m, i) => m.setze(t, s.monAltS * clamp((t - (A.plus - 0.2 + 0.08 * i)) / 0.3)));
      monNeu.forEach((m, i) => m.setze(t, t < A.wirkt + 0.35 ? s.monNeuS * clamp((t - (A.plus + 0.2 + 0.1 * i)) / 0.3) : hoeheNeu(t, i)));
      regie.anwenden(t);
    },
  };

  // ---------- HUD ----------
  const tmp = new THREE.Vector3();
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const projV = (p, dy) => { const q = proj(p); return { x: q.x, y: q.y + dy }; };
  const oben = (xz, h) => [xz[0], karte.hoehe(xz[0], xz[1]) + h, xz[1]];
  const SW = M.wert((t) => ({ a: bleibtMonat(t), b: abzugMonat(t) }));
  M.tafel({
    y: 166, links: { team: "a", einheit: " €", nk: 2, max: 999 }, rechts: { team: "b", einheit: " €", nk: 2, max: 999 }, vorn: null,
    werte: (t) => { const s = SW(t); return { a: s.a, b: s.b }; },
    uhr: { ein: 0, zeit: (t) => 59.99 * (SW(t).a / Z.erh), format: (v) => `${Math.round((v / 59.99) * 100)}`, label: "% BLEIBT" },
  });
  const chip = (text, ein, aus, team, art = "voll", y = 490) => M.chip({ text, ein, aus: aus === Infinity ? aus : aus - 0.25, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.05) => x - d;
  M.titel({ woerter: [{ text: "RENTENERHÖHUNG", ein: -0.3, team: "a" }, { umbruch: true }, { text: "2027", ein: -0.3, team: "a" }, { umbruch: true }, { text: "WAS BLEIBT VON 82 €?", ein: -0.3, art: "klein" }], y: 470, groesse: 104, aus: A.gerechnet - 0.55 });
  // Statuszeile
  chip("PROGNOSE · AB 01.07.2027", 0.05, A.gerechnet - 0.05, "akzent", "hell", 372);
  chip("MODELLRENTE · PRO MONAT", A.gerechnet, A.zuerst - 0.1, "akzent", "hell", 372);
  chip("SCHRANKE 1 · KRANKENKASSE", A.zuerst, A.dann - 0.1, "b", "hell", 372);
  chip("SCHRANKE 2 · PFLEGE", A.dann, A.auf - 0.1, "b", "hell", 372);
  chip("DAS KONTO · 2027 NUR JULI BIS DEZEMBER", A.auf, A.damit - 0.1, "a", "hell", 372);
  // Regeln
  chip("2.000 € RENTE", A.gerechnet + 0.05, A.klar + 2.5, "akzent", "voll", 490);
  chip("+4,1 % = 82 € MEHR", A.gerechnet + 0.5, A.klar + 2.5, "akzent", "voll", 605);
  chip("RENTENBEGINN 2020", v(A.beginn), A.klar + 2.5, "akzent", "voll", 720);
  chip("MIT KINDERN", v(A.kindern), A.klar + 2.5, "akzent", "voll", 835);
  chip("LEDIG · KEINE KIRCHENSTEUER", A.kindern + 0.5, A.klar + 2.5, "akzent", "hell", 950);
  // Denkfalle
  chip("FAST ALLES KOMMT AN?", v(A.fast, 0.4), A.zuerst - 0.1, "a", "voll", 1075);
  // Wendung 1
  chip("KRANKENKASSE: 7,3 % = −5,99 €", v(A.kk), A.dann - 0.1, "b", "voll", 490);
  chip("HALBER ZUSATZBEITRAG 1,45 % = −1,19 €", v(A.dazu), A.dann - 0.1, "b", "voll", 605);
  chip("NACH DER KRANKENKASSE: 74,82 €", v(A.sind, 0.0), A.dann - 0.1, "a", "voll", 720);
  // Wendung 2
  chip("PFLEGE: 3,6 % = −2,95 €", v(A.pflege, 0.1), A.auf - 0.1, "b", "voll", 490);
  chip("RENTNER ZAHLEN ALLEIN, OHNE ZUSCHUSS", v(A.allein, 0.1), A.auf - 0.1, "b", "hell", 605);
  chip("NACH DER PFLEGE: 71,87 €", v(A.wieder, 0.0), A.auf - 0.1, "a", "voll", 720);
  chip("PLUS ERST AB JULI", v(A.plus, 0.1), A.auf - 0.1, "akzent", "voll", 835);
  chip("2027 GESAMT: ?", v(A.wie2, 0.05), A.p27 - 0.1, "akzent", "voll", 1170);
  // Rennen
  chip("FINANZAMT: NOCH NICHT DRAN", v(A.fa1, 0.05), A.damit - 0.1, "b", "voll", 490);
  chip("RENTENFREIBETRAG: 3.860 € IM JAHR · FEST", v(A.freib, 0.05), A.damit - 0.1, "akzent", "voll", 605);
  chip("ERHÖHUNG WÄCHST NICHT MIT", v(A.bei, 0.05), A.damit - 0.1, "akzent", "hell", 720);
  // Kipp
  chip("ERHÖHUNG ZU 100 % STEUERPFLICHTIG", v(A.damit, 0.05), A.rund - 0.1, "b", "voll", 490);
  chip("GRENZSTEUERSATZ CA. 24 % (GEPLANT)", v(A.n24, 0.3), A.rund - 0.1, "b", "voll", 605);
  chip("STEUERBESCHEID ERST IM JAHR DANACH", v(A.bescheid, 0.05), A.rund - 0.1, "akzent", "hell", 720);
  // Ergebnis
  M.bilanz({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "PRO MONAT · MODELLRENTE", ein: A.von - 0.1, aus: A.rentner - 0.5,
    zeilen: [
      { label: "ERHÖHUNG", wert: Z.erh, einheit: " €", nk: 2, team: "akzent", ein: A.n82e - 0.05 },
      { label: "KRANKEN- UND PFLEGEKASSE", wert: Z.svSumme, einheit: " €", nk: 2, team: "b", ein: A.bleibenE - 0.1 },
      { label: "FINANZAMT", wert: Z.steuerMonat, einheit: " €", nk: 2, team: "b", ein: A.bleibenE + 0.2 },
    ],
    differenz: { label: "BLEIBT", wert: Z.bleibt, einheit: " €", nk: 2, ein: A.n55 - 0.1 },
  });
  // Warum
  M.balken({
    x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.rentner - 0.1, aus: A.p27 - 0.3, max: 100,
    faktoren: [
      { label: "PFLEGEBEITRAG", ein: A.rentner, a: { wert: 0, text: "0 % ZUSCHUSS" }, b: { wert: 100, text: "100 % SELBST" }, tag: "RENTNER ALLEIN", tagEin: A.alleinW },
      { label: "STEUER AUF DIE ERHÖHUNG", ein: A.und - 0.1, a: { wert: 0, text: "0 % STEUERFREI" }, b: { wert: 100, text: "100 % STEUERPFLICHTIG" }, tag: "VOLL BESTEUERT", tagEin: A.voll },
    ],
  });
  // Pointe und zweite Antwort
  chip("2027: NUR 6 MONATE WIRKSAM", v(A.wirkt, 0.05), A.sk - 0.1, "akzent", "voll", 490);
  chip("6 × 82 € = 492 € BRUTTO", v(A.sechs, 0.1), A.sk - 0.1, "akzent", "hell", 605);
  M.zaehler({ wert: (t) => brutto27(t), einheit: " €", nk: 0, max: 9999, team: "akzent", art: "voll", label: "BRUTTO 2027", punkt: (t) => proj(oben([0.0, 14.8], 4.2)), ein: v(A.wirkt + 0.5, 0.0), aus: A.im - 0.45 });
  chip("2027: 332,24 € BLEIBEN", v(A.n330, 0.6), A.sk - 0.1, "a", "voll", 1170);
  M.zaehler({ wert: (t) => bleibt27(t), einheit: " €", nk: 2, max: 9999, team: "a", art: "voll", label: "BLEIBT 2027", punkt: (t) => proj(oben([0.0, 14.8], 4.2)), ein: v(A.im, 0.1), aus: A.sk - 0.75 });
  // Zähler an der Welt (unter der Marke, damit sie nicht in den Chip-Stapel laufen)
  M.zaehler({ wert: () => Z.kv + Z.zus, einheit: " €", nk: 2, max: 99, team: "b", art: "voll", label: "KRANKENKASSE", punkt: () => projV(oben(G1, 0.3), 190), ein: v(A.sieben, 0.1), aus: A.sind - 0.2 });
  M.zaehler({ wert: () => Z.pv, einheit: " €", nk: 2, max: 99, team: "b", art: "voll", label: "PFLEGE", punkt: () => projV(oben(G2, 0.3), 190), ein: v(A.drei, 0.1), aus: A.wieder - 0.3 });
  M.zaehler({ wert: (t) => kontoWert(t), einheit: " €", nk: 2, max: 999, team: "a", art: "voll", label: "AUF DEM KONTO", punkt: () => projV(oben(KONTO, 0.3), 190), ein: v(A.n72, 0.4), aus: A.fa1 - 0.3 });
  M.zaehler({ wert: (t) => kontoWert(t), einheit: " €", nk: 2, max: 999, team: "a", art: "voll", label: "AUF DEM KONTO", punkt: () => projV(oben(KONTO, 2.9), 0), ein: v(A.rund, 0.0), aus: A.von - 0.45 });
  M.zaehler({ wert: (t) => Z.steuerMonat * glatt(t, A.rund + 0.35, A.fa2 + 0.4), einheit: " €", nk: 2, max: 99, team: "b", art: "voll", label: "FINANZAMT", punkt: () => proj(oben(FA, 3.3)), ein: v(A.n17, -0.6), aus: A.rentner - 0.4 });
  M.zaehler({ wert: () => 3860, einheit: " €", nk: 0, max: 9999, team: "akzent", art: "hell", label: "FREIBETRAG · FEST", punkt: () => projV(oben(FB, 0.3), 190), ein: v(A.freib, 0.0), aus: A.damit - 0.3 });
  // Schlusskarte
  M.pointe({ woerter: [{ text: "VON DER", ein: A.sk, farbe: "akzent" }, { umbruch: true }, { text: "ERHÖHUNG BLEIBEN", ein: A.skErh, farbe: "akzent" }, { umbruch: true }, { text: "GUT ZWEI DRITTEL.", ein: A.skGut, farbe: "a" }], ein: A.sk, y: 470, groesse: 80 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  // Untertitel nach dem tatsächlich Gesprochenen (Zahlwörter als Ziffern): eigener Zeitplan nur für die Blöcke
  const zpAlt = M.zp; M.zp = zpUT;
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });
  M.zp = zpAlt;

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "whoosh", "Lichtkopf mit 82 € startet an der Rentenkasse, Kamera gleitet"); ev(A.n82, "ding", "Kamera nah an die Rentenkasse, Erhöhung 82 €"); ev(A.wie, "klick", "Kamera zurück, Frage Wie viel bleibt");
  ev(A.beginn, "klick", "Kamera über der Route, Chips Rentenbeginn und mit Kindern"); ev(A.klar, "whoosh", "Kamera zum Konto, Chip fast alles kommt an"); ev(A.oder, "klick", "Kamera näher, Zweifel");
  ev(A.zuerst, "whoosh", "Schranke Krankenkasse leuchtet auf, Lichtkopf erreicht sie"); ev(A.kk, "ding", "Abzugsast in Korall zweigt ab, Weg wird schmaler"); ev(A.sieben, "klick", "Krankenkasse 7,3 Prozent, Zähler Abzug"); ev(A.dazu, "klick", "Halber Zusatzbeitrag"); ev(A.sind, "ding", "Rest 74,82 €");
  ev(A.dann, "whoosh", "Lichtkopf läuft zur Pflege-Schranke"); ev(A.pflege, "ding", "Schranke Pflege leuchtet, zweiter Abzugsast"); ev(A.allein, "klick", "Chip allein ohne Zuschuss"); ev(A.wieder, "ding", "Rest 71,87 €");
  ev(A.plus, "whoosh", "Monatsreihe 2027 erscheint, Januar bis Juni dunkel"); ev(A.juli, "ding", "Juli bis Dezember leuchten schwach auf"); ev(A.wie2, "klick", "Chip 2027 gesamt mit Fragezeichen");
  ev(A.auf, "whoosh", "Lichtkopf erreicht das Konto, Lichtsäule wächst"); ev(A.n72, "ding", "Konto 71,87 €"); ev(A.fa1, "whoosh", "Kamera zum Finanzamt, Schranke leuchtet"); ev(A.freib, "ding", "Freibetrag-Säule 3.860 € steht fest"); ev(A.bei, "whoosh", "Erhöhungs-Säule wächst am Freibetrag vorbei");
  ev(A.damit, "whoosh", "Finanzamt-Schranke fährt hoch, Licht kippt kühl"); ev(A.jeder, "klick", "Abzugsast zum Finanzamt, Chip 24 Prozent"); ev(A.bescheid, "klick", "Chip Bescheid erst im Jahr danach");
  ev(A.rund, "whoosh", "Finanzamt holt 16,75 € vom Konto, Säule sinkt"); ev(A.fa2, "ding", "Zähler Finanzamt 16,75 €"); ev(A.von, "whoosh", "Zoom auf das Konto, Bilanzkarte"); ev(A.n55, "ding", "Es bleiben 55,12 €, Differenz leuchtet");
  ev(A.rentner, "whoosh", "Erklärgrafik Warum"); ev(A.und, "ding", "Balken Erhöhung voll steuerpflichtig");
  ev(A.p27, "whoosh", "Kamera zur Monatsreihe, 2027"); ev(A.wirkt, "ding", "Juli bis Dezember wachsen nacheinander"); ev(A.sechs, "klick", "Brutto 492 €"); ev(A.im, "ding", "Zähler 2027 bleibt"); ev(A.n330, "ding", "332,24 € bleiben im Jahr 2027");
  ev(A.sk, "akzent", "Welt dunkelt ab, Schlusskarte"); ev(A.skGut, "akzent", "Gut zwei Drittel leuchtet");
  const sortiert = []; M.extra.forEach((e) => sortiert.push(e.t)); sortiert.sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Lichtkopf wandert, Wolken ziehen"); }
    last = nxt;
  }

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); };
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
