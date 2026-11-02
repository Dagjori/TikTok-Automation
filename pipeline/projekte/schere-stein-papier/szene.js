// „Schere, Stein, Papier: Gibt es eine Gewinnstrategie?“ · Stil 3 Clay-Spielzeug-3D in Three.js
// (engine/stil_clay.js + engine/stil_clay_welt.js). Neu gebaut am 02.11.: Spielabend mit zwei Figuren mit Gesicht (Rot = Taktik mit
// Notizblock, Cyan = Zufall mit Würfelbecher, dann „wie ein Mensch“), Fans in zwei Logen, Wandbrett mit 10×10 Kacheln,
// Lampen für den Rundensieger. Alle Runden stammen aus sim/schere_stein_papier.mjs (Tests: sim/schere_stein_papier.test.mjs).
// Keine großen Sticker/Stempel (Inhaber 02.11.): Die Dynamik kommt aus Figuren, Fans, Würfel und Kamera. Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, hash } from "../../engine/bewegung.js";
import { TON, ton, brett, setzeKachel, teil, rbox, bauer, wuerfel, dunkler } from "../../engine/stil_clay.js";
import { figur, fan, becher, notizblock, tasse, spieltisch, raumWelt, loge, wimpelkette, pflanze, katze } from "../../engine/stil_clay_welt.js";
import { videoLaeufe, monteCarlo } from "../../sim/schere_stein_papier.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 1024;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Pullover, Tafel, Chips, Kacheln, Fahnen, Untertitel). Kein Gelb (Untertitel-Wort ist gelb).
const ROT = TON.rot; // #FF4D4D  Taktik
const CYAN = TON.cyan; // #33D1FF  Zufall, dann Mensch
const AKZENT = "#7B5CFA";
const TINTE = TON.tinte;

// =====================================================================================
// Hilfen
// =====================================================================================
const mixD = (a, b, k) => {
  if (typeof a === "number") return a + (b - a) * k;
  if (Array.isArray(a)) return a.map((v, i) => mixD(v, b[i], k));
  const o = {};
  for (const key of Object.keys(a)) o[key] = mixD(a[key], b[key], k);
  return o;
};
const huelle = (t, intervalle, fade = 0.2) => {
  let m = 0;
  for (const [a, b] of intervalle) m = Math.max(m, ease.inOutSine(fortschritt(t, a - fade * 0.5, a + fade * 0.5)) * (1 - ease.inOutSine(fortschritt(t, b - fade * 0.5, b + fade * 0.5))));
  return m;
};
const puls = (d, rate = 1.6) => (d < 0 ? 0 : Math.exp(-d * rate));
const EMO_K = ["laecheln", "offD", "offO", "hoch", "sorge", "lid", "wangen", "nick", "neig"];
const EMO = {
  fokus: [0.12, 0, 0, -0.1, -0.25, 0.12, 0, 0.02, 0],
  schlau: [0.65, 0, 0, 0.25, -0.35, 0.3, 0.25, -0.04, 0.05],
  froh: [1, 0.7, 0, 0.5, 0.1, 0.15, 0.8, -0.08, 0],
  traurig: [-0.8, 0, 0, 0.1, 0.9, 0.35, 0, 0.12, 0],
  schock: [0, 0, 0.85, 1, 0.2, -0.4, 0, -0.06, 0],
  verwirrt: [-0.25, 0, 0.1, 0.5, 0.55, 0.1, 0, 0, 0.18],
  denken: [-0.1, 0, 0.15, 0.4, 0.4, 0.25, 0, 0.05, 0.12],
  grinsen: [0.9, 0.25, 0, 0.35, -0.25, 0.2, 0.5, 0, -0.06],
  frage: [0.45, 0, 0, 0.6, 0.35, 0, 0.2, -0.04, 0.06],
  ruhig: [0.3, 0, 0, 0, 0, 0.1, 0.1, 0, 0],
};
const emoMix = (basis, name, w) => basis.map((v, i) => v + (EMO[name][i] - v) * clamp(w));
const emoObj = (a, extra = {}) => {
  const o = {};
  EMO_K.forEach((k, i) => { o[k] = a[i]; });
  return { laecheln: o.laecheln, offD: o.offD, offO: o.offO, hoch: o.hoch, hochL: 0, hochR: 0, sorge: o.sorge, lid: o.lid, wangen: o.wangen, breite: 1, blickX: 0, blickY: 0, ...extra, _nick: o.nick, _neig: o.neig };
};
const blinzeln = (t, seed) => {
  const periode = 3.1 + hash(seed, 4) * 1.4;
  const ph = ((t + hash(seed, 9) * periode) % periode);
  return ph < 0.14 ? Math.sin((ph / 0.14) * Math.PI) : 0;
};
const POSEN = ["stein", "papier", "schere", "zeig", "daumen"];
const pose = (o = {}) => { const r = {}; for (const k of POSEN) r[k] = o[k] || 0; return r; };
const g3 = (zug) => pose({ [["stein", "papier", "schere"][zug]]: 1 });
const mix3 = (a, b, k) => POSEN.reduce((r, n) => { r[n] = lerp(a[n] || 0, b[n] || 0, k); return r; }, {});
const addv = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const lerpv = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// =====================================================================================
// Unentschieden-Pille mit Live-Zähler
// =====================================================================================
class RemisPille {
  constructor(M, { y, ein, aus, wert }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = M.zeit(aus);
    this.y = y;
    this.wert = wert;
    this.e = el("div", "ms ssp-remis", "<b>0</b><span>UNENTSCHIEDEN</span>", M.hud.wurzel);
    this.b = this.e.querySelector("b");
    this.breite = this.e.offsetWidth;
  }
  ereignisse() { return [{ t: this.ein, typ: "chip", klang: "pop", text: "Unentschieden" }]; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.22;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 3.4, daempfung: 0.36 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.22));
    const txt = String(this.wert(t));
    if (this.b.textContent !== txt) this.b.textContent = txt;
    this.e.style.transform = `translate(${(SICHER.mitte - this.breite / 2).toFixed(1)}px, ${(this.y + (1 - s) * 24 - x * 14).toFixed(1)}px) scale(${((0.3 + 0.7 * s) * (1 - 0.3 * x)).toFixed(4)})`;
    this.e.style.opacity = String(clamp((t - this.ein) / 0.06) * (1 - x));
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.9 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  // =====================================================================================
  // Modell: drei Läufe aus der Simulation (Auswahlkriterien in sim/schere_stein_papier.mjs)
  // =====================================================================================
  const V = videoLaeufe();
  const MC_ZUFALL = monteCarlo({ n: 100000, gegner: "zufall" });
  const lz = V.zufall, lm = V.mensch, lw = V.wuerfelt;
  const farbeVon = (erg) => (erg > 0 ? "rot" : erg < 0 ? "cyan" : "remis");

  const verteile = (plan) => {
    const tz = new Array(101).fill(0);
    for (const [von, bis, t0, t1] of plan) for (let r = von; r <= bis; r++) tz[r] = bis === von ? t0 : lerp(t0, t1, (r - von) / (bis - von));
    return tz;
  };
  // Akt Z (Cyan würfelt)
  const tZ = verteile([
    [1, 1, T("start:unentschieden") - 0.1],
    [2, 2, T("start:Rot") - 0.06],
    [3, 3, T("start:Cyan") - 0.04],
    [4, 9, T("start:Cyan") + 0.9, T("rennen1:Rot") - 0.3],
    [10, 10, T("rennen1:Rot") + 0.05],
    [11, 11, T("rennen1:zwei") + 0.45],
    [12, 12, T("wendung1:Doch") + 0.02],
    [13, 13, T("wendung1:zieht") - 0.02],
    [14, 14, T("wendung1:vorbei") - 0.1],
    [15, 29, T("wendung1:vorbei") + 0.3, T("wendung1:dreißig") - 0.05],
    [30, 30, T("wendung1:dreißig") + 0.05],
    [31, 59, T("rennen2:Es") + 0.3, T("rennen2:sechzig") - 0.12],
    [60, 60, T("rennen2:sechzig") + 0.05],
    [61, 100, T("rennen2:Rot"), T("ergebnis1:34") - 0.2],
  ]);
  const tLeerZ = T("wendung2:Aber") - 0.05; // Brett wird geleert (Welle)
  // Akt M (Cyan spielt wie ein Mensch)
  const tM = verteile([
    [1, 1, T("mensch:Menschen") + 0.55],
    [2, 2, T("mensch:oft") - 0.1],
    [3, 3, T("mensch:44") + 0.6],
    [4, 29, T("mensch:33") + 0.75, T("rennen3:dreißig") - 0.05],
    [30, 30, T("rennen3:dreißig") + 0.05],
    [31, 31, T("rennen3:8") + 0.4],
    [32, 100, T("rennen3:8") + 0.6, T("ergebnis2:Rot") - 0.15],
  ]);
  const tClearM = T("ueberraschung:Und") + 0.05; // sortiertes Brett wird geleert
  const tW0 = T("ueberraschung:Würfelt") - 0.1; // ab hier würfelt Cyan wieder (Würfel fällt aufs Brett)
  const tW = verteile([[51, 100, T("ueberraschung:wieder") + 0.02, T("ueberraschung:14") - 0.12]]);
  for (let r = 1; r <= 50; r++) tW[r] = tW0 - 5; // Runde 1–50 sind „schon gespielt“
  const tWKachel = (r) => (r <= 50 ? tW0 + 0.3 + (r - 1) * 0.008 : tW[r]);
  // Wiederholung für „Warum?“: die ersten drei echten Runden des Mensch-Laufs (Gewinner bleibt, Verlierer wechselt)
  const tR = [0, T("warum:bleiben"), T("warum:Zug") + 0.3, T("warum:wechseln") + 0.0];
  const tR0 = T("warum:Warum") + 0.2, tR1 = T("ueberraschung:Und") - 0.1;
  const tMerk = T("merksatz:Gegen") - 0.25; // Brett räumt auf
  const tSchleife = T("schluss:Was") + 0.05;
  const tGeist = T("regeln:Hundert") + 0.05; // Brett leuchtet auf

  const akte = [
    { id: "Z", von: 0, bis: tLeerZ + 0.5, runden: lz.runden, zeiten: tZ, start: tZ[1] - 1.0 },
    { id: "M", von: tLeerZ + 0.5, bis: tW0, runden: lm.runden, zeiten: tM, start: tM[1] - 1.0 },
    { id: "W", von: tW0, bis: Infinity, runden: [...lm.runden.slice(0, 50), ...lw.runden.slice(50)], zeiten: tW, start: tW0 },
  ];
  const akteR = { id: "R", runden: lm.runden.slice(0, 3), zeiten: tR, start: tR[1] - 1.0 };
  const aktAt = (t) => (t < akte[1].von ? akte[0] : t < akte[2].von ? akte[1] : akte[2]);
  const handAkt = (t) => (t >= tR0 && t < tR1 ? akteR : aktAt(t));
  const rundenBis = (A, t) => {
    let k = 0;
    const n = A.runden.length;
    for (let r = 1; r <= n; r++) { if (A.zeiten[r] <= t) k = r; else break; }
    return k;
  };
  const stand = (t) => {
    const A = aktAt(t);
    const k = rundenBis(A, t);
    if (k === 0) return { rot: 0, cyan: 0, remis: 0, runde: 0, k: 0, A };
    const r = A.runden[k - 1];
    return { rot: r.siegeRot, cyan: r.siegeCyan, remis: r.remis, runde: k, k, A };
  };

  // =====================================================================================
  // Welt
  // =====================================================================================
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#8B86B5"], [1, "#C79B6A"]]);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 9, schattenKarte: SCHATTEN || 512, sonnenRichtung: [-0.6, 1.0, 1.0], sonnenStaerke: 2.3, sonnenFarbe: "#FFF0DA", himmel: "#FFF4E2", boden: "#C9B79C", himmelStaerke: 1.0, umgebungsStaerke: 0.75, schattenWeich: 5, ziel: [0, 2.5, -0.5] });
  if (!SCHATTEN) licht.sonne.castShadow = false;
  const warm = new THREE.PointLight("#FFD9A0", 14, 14, 1.6);
  warm.position.set(0, 6.4, 0.8);
  szene.add(warm);

  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 1, 200);
  szene.add(raumWelt());
  const tisch = spieltisch({ breite: 4.8 });
  tisch.position.set(0, 0, 0);
  szene.add(tisch);
  const TISCH_Y = 1.655;

  // Wandbrett mit 10×10 Kacheln, zwei Lampen für den Rundensieger
  const B = brett({ n: 10, teilung: 0.18 });
  B.position.set(0, 5.0, -3.22);
  B.scale.setScalar(0.92);
  szene.add(B);
  const lampe = (farbe, x) => {
    const g = new THREE.Group();
    g.position.set(x, 6.18, -3.05);
    const fuss = teil(new THREE.CylinderGeometry(0.1, 0.14, 0.14, 16), ton(TON.holz), 0, 0, 0, g);
    const m = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.4, emissive: new THREE.Color(farbe), emissiveIntensity: 0 });
    const kugel = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), m);
    kugel.position.y = 0.22;
    g.add(kugel);
    szene.add(g);
    return { m, kugel };
  };
  const lampeR = lampe(ROT, -0.78), lampeC = lampe(CYAN, 0.78);
  lampeR.m.color = new THREE.Color(heller(ROT)); lampeC.m.color = new THREE.Color(heller(CYAN));
  function heller(hex) { return `#${new THREE.Color(hex).lerp(new THREE.Color("#FFFFFF"), 0.55).getHexString()}`; }

  // Wimpelkette
  const wim = wimpelkette({ x0: -2.9, x1: 2.9, y: 6.8, durchhang: 0.4, n: 13, farben: [ROT, "#F2E4CC", CYAN, "#F2E4CC"] });
  szene.add(wim);

  // Logen mit Fans (links für Rot, rechts für Cyan)
  const fanDefs = [
    { s: -1, farbe: ROT, fahne: ROT, x: -0.42, haut: "#F3C9A3", haar: "#3A2A22", stil: "kurz" },
    { s: -1, farbe: dunkler(ROT, 0.85), fahne: null, x: 0.42, haut: "#C98A5E", haar: "#241A17", stil: "wirr" },
    { s: 1, farbe: CYAN, fahne: CYAN, x: -0.42, haut: "#EDBD93", haar: "#B5651D", stil: "wirr" },
    { s: 1, farbe: dunkler(CYAN, 0.85), fahne: null, x: 0.42, haut: "#F5D2B3", haar: "#2E2A3A", stil: "kurz", brille: true },
  ];
  const fans = [];
  for (const s of [-1, 1]) {
    const lg = loge({ breite: 1.7, hoehe: 1.7 });
    lg.position.set(s * 1.95, 3.87, -2.75);
    szene.add(lg);
  }
  fanDefs.forEach((d, i) => {
    const f = fan({ farbe: d.farbe, haut: d.haut, haar: d.haar, haarStil: d.stil, brille: !!d.brille, fahne: d.fahne, groesse: 0.72, yaw: -d.s * 0.4 });
    f.gruppe.position.set(d.s * 1.95 + d.x, 3.97, -2.45);
    szene.add(f.gruppe);
    fans.push({ ...f, d, i });
  });
  // Pflanzen auf den Logen
  for (const s of [-1, 1]) { const p = pflanze({ groesse: 0.6, topf: s < 0 ? "#D98A5B" : "#6FB8CF" }); p.position.set(s * 2.6, 4.71, -2.0); szene.add(p); }

  // Spieler
  const ROT_P = { x: -1.45, z: -1.45, yaw: 0.55 }, CYAN_P = { x: 1.45, z: -1.45, yaw: -0.55 };
  const rot = figur({ farbe: ROT, haut: "#F6C9A2", haar: "#4B3328", haarStil: "kurz", brille: true, yaw: ROT_P.yaw, ort: [ROT_P.x, 1.0, ROT_P.z] });
  const cyan = figur({ farbe: CYAN, haut: "#E2A877", haar: "#2B1F1A", haarStil: "wirr", yaw: CYAN_P.yaw, ort: [CYAN_P.x, 1.0, CYAN_P.z], pullover: "kapuze" });
  szene.add(rot.gruppe, cyan.gruppe);

  // Requisiten: Rot hat Notizblock und Bauer, Cyan hat Becher und Würfel, dazu Tassen
  const block = notizblock({ deckel: dunkler(ROT, 0.9) });
  block.position.set(-1.5, TISCH_Y, 0.5);
  block.rotation.y = 0.35;
  szene.add(block);
  const stiftB = block.userData.stift; // Bleistift liegt auf dem Block …
  const stiftM = stiftB.clone(); // … und steckt beim Schreiben in Rots Hand
  stiftM.position.set(0.0, 0.62, 0.34);
  stiftM.rotation.set(0, 0, 1.0);
  stiftM.scale.setScalar(1 / 0.56);
  rot.arme.aussen.h.add(stiftM);
  const pawn = bauer({ farbe: ROT });
  pawn.position.set(-0.62, TISCH_Y, 0.75);
  pawn.scale.setScalar(0.62);
  szene.add(pawn);
  const BECHER_RUHE = [1.62, TISCH_Y, 0.5];
  const becherM = becher();
  becherM.position.set(...BECHER_RUHE);
  szene.add(becherM);
  const DIE_LAND = [0.8, TISCH_Y + 0.25, 0.8];
  const wuerf = wuerfel({ farbe: CYAN, groesse: 0.5 });
  szene.add(wuerf);
  const tasse1 = tasse(), tasse2 = tasse({ farbe: "#D8E8F0" });
  tasse1.position.set(-0.15, TISCH_Y, 1.15); tasse2.position.set(0.25, TISCH_Y, 1.25);
  szene.add(tasse1, tasse2);
  const pflTisch = pflanze({ groesse: 0.55, topf: "#E8B04A" });
  pflTisch.position.set(2.0, TISCH_Y, 1.1);
  szene.add(pflTisch);

  // Katze auf dem Teppich (Umfeld): folgt dem Spiel mit Kopf und Ohren
  const katzeM = katze({ groesse: 0.95 });
  katzeM.gruppe.position.set(1.15, 0.1, 2.9);
  katzeM.gruppe.rotation.y = -0.45;
  szene.add(katzeM.gruppe);

  // =====================================================================================
  // Hände je Zeitpunkt (Gesten, Pumpen, Gewinner-Effekt) – aus Aktenlage und Rundenzeiten
  // =====================================================================================
  const PUMP_DAUER = 0.8;
  const FAUST = [1, 0, 0];
  const mixW = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
  const gewichte = (zug) => [zug === 0 ? 1 : 0, zug === 1 ? 1 : 0, zug === 2 ? 1 : 0];
  function haende(t) {
    const A = handAkt(t);
    const kEcht = rundenBis(A, t);
    const nMax = A.runden.length;
    const tn0 = kEcht < nMax ? A.zeiten[kEcht + 1] : Infinity;
    const tk0 = kEcht > 0 ? A.zeiten[kEcht] : -Infinity;
    const luecke = tn0 - tk0;
    const schnell = luecke < 0.7 && A.id !== "R";
    let k = kEcht;
    if (schnell && kEcht > 0) k = rundenBis(A, Math.floor(t / 0.27) * 0.27);
    const rd = k > 0 ? A.runden[k - 1] : null;
    const tk = k > 0 ? A.zeiten[k] : -Infinity;
    const gR = rd ? gewichte(rd.rot) : FAUST, gC = rd ? gewichte(rd.cyan) : FAUST;
    let wR = FAUST, wC = FAUST, pumpR = 0, pumpC = 0, wackR = 0, wackC = 0, gew = 0, seit = 99, quR = 1, quC = 1, pumpt = 0, revT = -99;
    const imPumpen = tn0 !== Infinity && tn0 - t < PUMP_DAUER && !schnell;
    if (!schnell) {
      const halt = rd && t >= tk ? clamp(1 - (t - tk - 1.0) / 0.3) : 0; // Geste wird nach ca. 1,0 s wieder zur Faust
      if (rd && t >= tk) { wR = mixW(FAUST, gR, halt); wC = mixW(FAUST, gC, halt); }
      const mo = tn0 !== Infinity ? clamp(1 - (tn0 - t - PUMP_DAUER) / 0.2) : 0;
      if (imPumpen || mo > 0) { wR = mixW(wR, FAUST, ease.inOutSine(clamp(mo))); wC = mixW(wC, FAUST, ease.inOutSine(clamp(mo))); }
      if (imPumpen) {
        const u = (t - (tn0 - PUMP_DAUER)) / PUMP_DAUER; // drei Schläge
        const hub = Math.abs(Math.sin(u * Math.PI * 3));
        pumpR = pumpC = -0.3 * (1 - hub) + 0.1 * hub;
        wackR = 0.05 * Math.sin(u * Math.PI * 6);
        wackC = -wackR;
        pumpt = 1;
      }
      if (rd && t >= tk) {
        seit = t - tk;
        revT = tk;
        const s = feder(seit, { frequenz: 3.6, daempfung: 0.34 });
        if (seit < 0.6) {
          gew = rd.erg;
          quR = rd.erg > 0 ? 1 + 0.16 * (1 - s) * -1 : rd.erg < 0 ? 1 - 0.08 * Math.exp(-seit * 8) : 1 + 0.05 * Math.exp(-seit * 8);
          quC = rd.erg < 0 ? 1 + 0.16 * (1 - s) * -1 : rd.erg > 0 ? 1 - 0.08 * Math.exp(-seit * 8) : 1 + 0.05 * Math.exp(-seit * 8);
          if (!imPumpen) {
            pumpR = rd.erg > 0 ? 0.3 * Math.exp(-seit * 6) * Math.sin(seit * 22) : 0.05 * Math.exp(-seit * 4);
            pumpC = rd.erg < 0 ? 0.3 * Math.exp(-seit * 6) * Math.sin(seit * 22) : 0.05 * Math.exp(-seit * 4);
          }
        } else gew = rd.erg;
      }
    } else if (kEcht > 0 || t > A.start) {
      const ph = (t % 0.27) / 0.27;
      const zeig = ease.outCubic(clamp(ph / 0.4)) * (1 - ease.inCubic(clamp((ph - 0.78) / 0.22)));
      wR = mixW(FAUST, gR, zeig); wC = mixW(FAUST, gC, zeig);
      const hub = Math.abs(Math.sin(ph * Math.PI));
      pumpR = pumpC = -0.2 * (1 - hub) + 0.08 * hub;
      wackR = 0.04 * Math.sin(ph * Math.PI * 2);
      wackC = -wackR;
      if (rd) gew = rd.erg;
      pumpt = 1;
    }
    // Einleitung: Schere, Stein, Papier = drei Pumpbewegungen im Takt der Wörter
    const intro = ["hook:Schere", "hook:Stein", "hook:Papier"].map((w) => T(w));
    for (const t0 of intro) {
      const u = (t - t0 - 0.02) / 0.42;
      if (u >= 0 && u < 1) { const h = -0.28 * Math.sin(u * Math.PI); pumpR += h; pumpC += h; }
    }
    return { wR, wC, pumpR, pumpC, wackR, wackC, quR, quC, gew, seit, schnell, pumpt, rd, k, revT, A };
  }

  // Sortieren: Zum Ergebnis laufen die Kacheln in Farbblöcke (Rot, Cyan, unentschieden)
  const rangVon = (lauf) => {
    const grp = { rot: 0, cyan: 1, remis: 2 };
    const ord = lauf.runden.map((r, i) => ({ i, g: grp[farbeVon(r.erg)] })).sort((a, b) => a.g - b.g || a.i - b.i);
    const rang = new Array(100);
    ord.forEach((o, k) => { rang[o.i] = k; });
    return rang;
  };
  const rangZ = rangVon(lz), rangM = rangVon(lm);
  const tSortZ = T("ergebnis1:34") - 0.1;
  const tSortM = tM[100] + 0.12;
  const SORT_D = 0.6;
  const sortP = (t, t0, i) => ease.inOutCubic(clamp((t - t0 - i * 0.004) / SORT_D));

  /** Kachel-Zustand von Runde r (1..100) zum Zeitpunkt t */
  function kachel(r, t) {
    const i = r - 1;
    const pop = (d) => (d < 0 ? 0 : feder(d, { frequenz: 3.4, daempfung: 0.4 }));
    const leer = (t0, d0, extra) => {
      const d = t - t0 - i * 0.0045;
      if (d <= 0) return null;
      const k = ease.inCubic(clamp(d / 0.2));
      return { groesse: (1 - k) * d0, drehung: k * 1.2, hebe: k * 0.15, ...extra };
    };
    const platz = B.userData.platz;
    const mitSort = (rang, p) => {
      if (p <= 0.0005) return {};
      const [x0, y0] = platz(i), [x1, y1] = platz(rang[i]);
      return { x: lerp(x0, x1, p), y: lerp(y0, y1, p), hebe: 0.18 * Math.sin(p * Math.PI) };
    };
    if (t < tLeerZ + 0.5 - 0.0001 && t < akte[1].von) {
      if (t < tZ[r]) return { groesse: 0 };
      const farbe = farbeVon(lz.runden[i].erg);
      const sp = mitSort(rangZ, sortP(t, tSortZ, i));
      const e = leer(tLeerZ, pop(t - tZ[r]), { farbe, ...sp });
      return e || { groesse: pop(t - tZ[r]), farbe, ...sp };
    }
    if (t < tClearM) {
      if (t < tM[r]) return { groesse: 0 };
      const farbe = farbeVon(lm.runden[i].erg);
      const sp = mitSort(rangM, sortP(t, tSortM, i));
      const e = leer(tClearM, pop(t - tM[r]), { farbe, ...sp });
      return e || { groesse: pop(t - tM[r]), farbe, ...sp };
    }
    // Würfel-Akt: Runde 1–50 wie im Mensch-Lauf, Runde 51–100 neu gewürfelt
    const tk = tWKachel(r);
    if (t < tk) return { groesse: 0 };
    return { groesse: pop(t - tk), farbe: farbeVon(A_W_RUNDEN[i].erg) };
  }
  const A_W_RUNDEN = akte[2].runden;

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "TAKTIK", farbe: ROT, woerter: ["Rot", "Taktik"] },
      b: { name: "ZUFALL", farbe: CYAN, woerter: ["Cyan", "Zufall", "Mensch*"] },
    },
    akzent: AKZENT,
    tinte: TINTE,
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  const kL = (t) => M.schleifenK(t);

  // Anzeigetafel: Siege, Mitte = Rundenzähler
  const tLos = T("start:Runde") - 0.25;
  const tafel = M.tafel({
    y: 166,
    links: { team: "a", name: "TAKTIK", einheit: "", nk: 0, max: 100 },
    rechts: { team: "b", name: "ZUFALL", einheit: "", nk: 0, max: 100 },
    werte: (t) => { const s = stand(t); return { a: s.rot, b: s.cyan }; },
    anteil: (t) => { const s = stand(t); return { a: s.rot / 50, b: s.cyan / 50 }; },
    uhr: { ein: tLos, zeit: (t) => stand(t).runde, format: (s) => String(Math.round(s)), label: "RUNDE" },
  });
  const nameC = tafel.seiten[1].k.querySelector(".ms-kopf span");
  const tMensch = T("wendung2:Mensch") - 0.05;
  const tMenschEnde = T("ueberraschung:Würfelt") - 0.05;
  const tafelUpdate = tafel.update.bind(tafel);
  tafel.update = (t) => {
    tafelUpdate(t);
    const soll = t >= tMensch && t < tMenschEnde ? "MENSCH" : "ZUFALL";
    if (nameC.textContent !== soll) nameC.textContent = soll;
  };

  // Hook: Titel Wort für Wort
  M.titel({
    y: 372, groesse: 100, aus: "regeln:Hundert-0.4",
    woerter: [
      { text: "SCHERE", ein: "hook:Schere+0.02" }, { text: "STEIN", ein: "hook:Stein+0.02" }, { umbruch: true },
      { text: "PAPIER", ein: "hook:Papier+0.02" }, { umbruch: true },
      { text: "GLÜCK", ein: "hook:Glück-0.02", team: "b" }, { art: "vs", ein: "hook:oder-0.02" }, { text: "TAKTIK?", ein: "hook:Taktik-0.02", team: "a" }, { umbruch: true },
      { text: "WER GEWINNT?", ein: "hook:Wer-0.02", art: "klein" },
    ],
  });
  // Regeln als Chips
  M.chips({ y: 735, ausrichtung: "mitte", aus: "falle:Klar-0.3", liste: [{ text: "100 RUNDEN", ein: "regeln:Hundert-0.03", art: "dunkel", gross: true }] });
  M.chips({ y: 385, abstand: 44, ausrichtung: "mitte", aus: "falle:Klar-0.3", liste: [
    { text: "ROT = TAKTIK", ein: "regeln:Rot-0.03", art: "voll", team: "a" },
    { text: "CYAN = ZUFALL", ein: "regeln:Cyan-0.03", art: "voll", team: "b" },
  ] });
  // Die ersten drei Runden einzeln
  const remisPille = new RemisPille(M, { y: 640, ein: tZ[3] + 1.3, aus: T("ergebnis1:Endstand") - 0.1, wert: (t) => stand(t).remis });
  hud.add(remisPille);
  // Folgen-Aufruf
  M.folgen({ ein: "folgen:Folg-0.05", dauer: 1.8, y: 960, team: "a" });
  // Wendung 1
  // Ergebnis 1
  M.chips({ y: 745, abstand: 36, ausrichtung: "mitte", aus: "wendung2:Aber-0.1", liste: [
    { text: `ROT ${lz.siegeRot}`, ein: "ergebnis1:34", art: "voll", team: "a", gross: true },
    { text: `CYAN ${lz.siegeCyan}`, ein: "ergebnis1:31.", art: "voll", team: "b", gross: true },
  ] });
  // Wendung 2: Mensch
  M.chip({ text: "MENSCH: 44 %", ein: "mensch:44", aus: "rennen3:Runde-0.1", art: "voll", team: "b", x: 330, anker: "mitte", y: 735 });
  M.chip({ text: "ZUFALL: 33 %", ein: "mensch:33", aus: "rennen3:Runde-0.1", art: "dunkel", x: 750, anker: "mitte", y: 735 });
  // Ergebnis 2
  const vorsprung2 = lm.siegeRot - lm.siegeCyan;
  M.chips({ y: 745, abstand: 36, ausrichtung: "mitte", aus: "warum:Warum-0.1", liste: [
    { text: `ROT ${lm.siegeRot}`, ein: "ergebnis2:50,", art: "voll", team: "a", gross: true },
    { text: `CYAN ${lm.siegeCyan}`, ein: "ergebnis2:31.", art: "voll", team: "b", gross: true },
  ] });
  M.chip({ text: `+${vorsprung2} SIEGE VORSPRUNG`, ein: "ergebnis2:Neunzehn", aus: "warum:Warum-0.1", art: "dunkel", gross: true, x: SICHER.mitte, anker: "mitte", y: 600 });
  // Warum: Wiederholung der Runden 1–3 mit den zwei Faktoren
  M.chip({ text: "RUNDE 2: CYAN BLEIBT", ein: tR[2] + 0.05, aus: tR[3] - 0.3, art: "voll", team: "b", x: SICHER.mitte, anker: "mitte", y: 735 });
  M.chip({ text: "RUNDE 3: CYAN WECHSELT", ein: tR[3] + 0.05, aus: "warum:Rot-0.1", art: "voll", team: "b", x: SICHER.mitte, anker: "mitte", y: 735 });
  // Zweite Überraschung: zweite Hälfte
  const haelfte2Rot = lw.siegeRot - lw.runden[49].siegeRot, haelfte2Cyan = lw.siegeCyan - lw.runden[49].siegeCyan;
  M.chip({ text: String(haelfte2Rot), ein: "ueberraschung:14", aus: "merksatz:Gegen-0.15", art: "voll", team: "a", gross: true, x: 400, anker: "mitte", y: 735 });
  M.chip({ text: String(haelfte2Cyan), ein: "ueberraschung:15.", aus: "merksatz:Gegen-0.15", art: "voll", team: "b", gross: true, x: 680, anker: "mitte", y: 735 });
  // Merksatz
  M.pointe({ woerter: [{ text: "GEGEN ZUFALL", ein: "merksatz:Gegen" }, { umbruch: true }, { text: "HILFT KEINE", ein: "merksatz:hilft" }, { text: "TAKTIK.", ein: "merksatz:Taktik", farbe: "a" }], aus: "merksatz:Nur-0.32", y: 420, groesse: 112 });
  M.pointe({ woerter: [{ text: "NUR GEGEN", ein: "merksatz:Nur" }, { umbruch: true }, { text: "MUSTER.", ein: "merksatz:Muster", farbe: "akzent" }], aus: "schluss:Was-0.1", y: 420, groesse: 128 });
  M.melde({ t: "merksatz:Taktik", typ: "pointe-wort", klang: "klick", text: "TAKTIK." });
  M.melde({ t: "merksatz:Muster", typ: "pointe-wort", klang: "akzent", text: "MUSTER." });
  // Untertitel Wort für Wort (Stil „kontur“)
  M.untertitel({ stil: "kontur", versteckt: [[T("schluss:Kommentare.>") + 0.5, DAUER + 1]] });

  // =====================================================================================
  // Würfel, Becher und andere Requisiten
  // =====================================================================================
  const slowRunden = (A) => { const l = []; for (let r = 1; r <= A.runden.length; r++) { const g = (A.zeiten[r + 1] ?? Infinity) - A.zeiten[r]; const vor = A.zeiten[r] - (A.zeiten[r - 1] ?? -Infinity); if (r <= 3 || (g >= 0.7 && vor >= 0.7)) l.push({ r, t: A.zeiten[r], rd: A.runden[r - 1] }); } return l; };
  const WURF_Z = slowRunden(akte[0]).filter((x) => x.t > 0); // Würfe von Cyan in Akt Z (langsame Runden)
  const tDemoWurf = T("regeln:Zug") + 0.12; // Demo-Wurf bei „Cyan würfelt jeden Zug“
  const tSchiebt = T("wendung2:nicht"), tSchiebtEnde = T("wendung2:mehr.") + 0.55; // Cyan fegt Becher und Würfel vom Tisch
  const tZurueck = T("ueberraschung:Würfelt") - 0.05; // sie fallen zurück auf den Tisch
  const FLIEG = 0.42; // Flugdauer des Würfels
  const tHookWurf = T("hook:Glück") + 1.1; // Becher schüttelt bei „Glück“, Würfel fällt aus dem Becher
  const wurfZeiten = [{ t: tHookWurf, face: 3 }, { t: tDemoWurf, face: 5 }, ...WURF_Z.map((x) => ({ t: x.t, face: x.rd.cyan === 0 ? 1 : x.rd.cyan === 1 ? 3 : 5 }))].sort((a, b) => a.t - b.t);
  const dieFace = (face, extraYaw) => { // Quaternion: Seite `face` oben
    const n = { 1: [0, 0, 1], 6: [0, 0, -1], 2: [1, 0, 0], 5: [-1, 0, 0], 3: [0, 1, 0], 4: [0, -1, 0] }[face];
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...n), new THREE.Vector3(0, 1, 0));
    q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), extraYaw));
    return q;
  };
  const qRuhe = dieFace(3, 0.5);
  // „Cyan würfelt“-Zeiten: in Akt Z ab Regeln bis Wechsel, in Akt W ab Würfelt
  const wuerfeltAn = (t) => (t >= T("regeln:Cyan") - 0.2 && t < tSchiebt) || t >= tZurueck;
  const letzterWurf = (t) => { let w = null; for (const x of wurfZeiten) if (x.t <= t + FLIEG * 0) w = x; return w; };
  function wuerfelZustand(t) {
    // Standard: Würfel liegt in Ruhe, Becher steht auf dem Tisch
    let wp = [...DIE_LAND], wq = qRuhe.clone(), ws = 1, bp = [...BECHER_RUHE], bneig = 0, bhoch = 0, wirft = 0;
    // Würfel im Becher (unsichtbar), wenn Cyan schüttelt: Pumpphase einer langsamen Runde in Akt Z/W oder Zeitraffer
    const h = haende(t);
    const inW = t >= tZurueck;
    const inZ = t < tSchiebt;
    let schuettelt = 0;
    if ((t >= T("hook:Glück") - 0.1 && t < tHookWurf) || (t >= T("regeln:Cyan") && t < tDemoWurf)) schuettelt = 1;
    else if (wuerfeltAn(t) && (inZ || inW)) {
      if (h.schnell) schuettelt = 1;
      else if (h.pumpt) schuettelt = 1;
    }
    // Wurf: während der letzten FLIEG s vor dem Reveal fliegt der Würfel aus dem Becher
    let flugInfo = null;
    const kandidaten = inW ? akte[2].zeiten : null;
    if (inZ || inW) {
      let tn = Infinity;
      if (inZ) { for (const x of wurfZeiten) if (x.t > t - 0.01 && x.t < tn) { tn = x.t; flugInfo = x; } }
      else if (!h.schnell) { const A = akte[2]; for (let r = 51; r <= 100; r++) if (A.zeiten[r] > t - 0.01) { tn = A.zeiten[r]; flugInfo = { t: tn, face: A.runden[r - 1].cyan === 0 ? 1 : A.runden[r - 1].cyan === 1 ? 3 : 5 }; break; } }
      if (flugInfo && !h.schnell && tn - t < FLIEG) {
        const u = clamp(1 - (tn - t) / FLIEG);
        wirft = 1;
        const von = [BECHER_RUHE[0] - 0.27, BECHER_RUHE[1] + 1.05, 0.3];
        const bogen = lerpv(von, DIE_LAND, u);
        wp = [bogen[0], bogen[1] + 0.7 * Math.sin(u * Math.PI), bogen[2]];
        const spin = (1 - u) * 14;
        const end = dieFace(flugInfo.face, 0.5 + 0.7 * hash(Math.round(flugInfo.t * 10), 3));
        wq = end.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(spin, spin * 0.7, spin * 0.4)));
        ws = 1;
      }
      // Landung: Landeposition und Ergebnis-Seite
      const letzt = [...(inZ ? wurfZeiten : [])].reverse().find((x) => x.t <= t);
      if (!wirft && letzt && inZ) {
        wq = dieFace(letzt.face, 0.5 + 0.7 * hash(Math.round(letzt.t * 10), 3));
        const d = t - letzt.t;
        wp = [DIE_LAND[0], DIE_LAND[1] + 0.12 * Math.max(0, Math.exp(-d * 8) * Math.abs(Math.sin(d * 18))), DIE_LAND[2]];
      }
      if (schuettelt && !wirft) ws = 0.0001; // im Becher
    }
    // Becher: in Cyans Hand beim Schütteln
    let becherInHand = 0;
    if (schuettelt) {
      becherInHand = 1;
      const ph = Math.sin(t * 26) * 0.5;
      bhoch = 0.55 + 0.12 * (h.schnell ? Math.abs(Math.sin(t * 13)) : Math.abs(Math.sin(t * 15)));
      bneig = wirft ? 1.2 * ease.inOutSine(clamp(1 - (flugInfo.t - t) / FLIEG)) : 0.1 * ph;
      bp = [BECHER_RUHE[0] + 0.43, BECHER_RUHE[1] + bhoch - 0.1, 0.1];
    }
    // fegen: Becher und Würfel fliegen vom Tisch nach rechts unten
    if (t >= tSchiebt && t < tZurueck) {
      const u = clamp(fortschritt(t, tSchiebt, tSchiebtEnde));
      const fall = ease.inCubic(u);
      wp = [DIE_LAND[0] + 4.5 * ease.outCubic(u), DIE_LAND[1] + 0.9 * Math.sin(u * Math.PI) - 3.6 * fall, DIE_LAND[2] + 1.0 * u];
      wq = qRuhe.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(u * 9, u * 6, u * 4)));
      bp = [BECHER_RUHE[0] + 4.2 * ease.outCubic(u), BECHER_RUHE[1] + 0.8 * Math.sin(u * Math.PI) - 3.5 * fall, BECHER_RUHE[2] + 0.8 * u];
      bneig = u * 5;
      if (u >= 1) { ws = 0.0001; }
    }
    // Rückkehr: fallen von oben herab, federn
    if (t >= tZurueck - 1.0 && t < tZurueck + 0.9 && t >= tSchiebt) {
      const d = t - tZurueck;
      if (d < 0) { ws = 0.0001; bp = [BECHER_RUHE[0], 12, BECHER_RUHE[2]]; wp = [DIE_LAND[0], 12, DIE_LAND[2]]; }
      else {
        const fall = (v, d0) => { const dd = d - d0; if (dd < 0) return 9; const f = Math.max(0, 1 - dd / 0.38); return dd < 0.38 ? 9 * f * f : 0.5 * Math.exp(-(dd - 0.38) * 6) * Math.abs(Math.sin((dd - 0.38) * 14)); };
        wp = [DIE_LAND[0], DIE_LAND[1] + fall(0, 0.0), DIE_LAND[2]];
        bp = [BECHER_RUHE[0], BECHER_RUHE[1] + fall(0, 0.12), BECHER_RUHE[2]];
        ws = 1;
        wq = qRuhe.clone();
      }
    }
    if (t >= tSchiebt && t < tZurueck - 1.0) { /* weg */ }
    return { wp, wq: [wq.x, wq.y, wq.z, wq.w], ws, bp, bneig, becherInHand, bhoch, schuettelt };
  }

  // =====================================================================================
  // Ausdruck, Haltung und Armziele der Figuren
  // =====================================================================================
  const headWelt = (p, yaw) => [p.x, 1.0 + 1.62, p.z]; // Kopfmitte (Welt) ungefähr
  const fwd = (yaw) => [Math.sin(yaw), 0, Math.cos(yaw)];
  const KOPF_R = headWelt(ROT_P, ROT_P.yaw), KOPF_C = headWelt(CYAN_P, CYAN_P.yaw);
  const SPIEL_R = [-0.6, 2.8, -0.3], SPIEL_C = [0.6, 2.8, -0.3]; // Faust-Mitte der Spielhände (Welt)

  // Cues (Intervalle) je Figur
  const cue = {
    rotSchreibt: [[T("regeln:Rot") - 0.15, T("regeln:Taktik.") + 0.6], [T("wendung2:Mensch") - 0.2, T("wendung2:Mensch") + 0.8]],
    rotBrille: [[T("hook:Taktik") - 0.1, T("hook:Taktik") + 1.0], [T("warum:setzt") - 0.2, T("warum:darauf.") + 0.7]],
    rotZeigt: [[T("folgen:Folg") - 0.2, T("folgen:verpasst") + 0.45]],
    rotSchulter: [[T("ergebnis1:Praktisch") - 0.1, T("wendung2:Aber") - 0.1], [T("merksatz:Nur") - 0.1, T("merksatz:Muster") + 0.6], [T("schluss:Was") - 0.1, T("schluss:Kommentare.>") + 0.4]],
    cyanBecher: [[T("hook:Glück") - 0.2, T("hook:Glück") + 0.9]],
    cyanSchulter: [[T("falle:Klar") - 0.1, T("falle:Oder?") + 0.5], [T("ergebnis1:Praktisch") - 0.1, T("wendung2:Aber") - 0.1], [T("schluss:Was") - 0.1, T("schluss:Kommentare.>") + 0.4]],
    cyanDenkt: [[T("wendung2:Cyan#2") - 0.1, tW0 - 0.1]],
    cyanFegt: [[tSchiebt - 0.25, tSchiebtEnde]],
  };

  function emotion(t, wer, h, st) {
    const sg = wer === "rot" ? 1 : -1; // +1 für Rot
    let e = EMO.fokus.slice();
    const B = (name, w) => { e = emoMix(e, name, w); };
    // Spielstand-Stimmung (Zeitraffer und Ruhe): vorn = schlau, hinten = besorgt
    const lead = (st.rot - st.cyan) * sg;
    if (t > tLos) { if (lead > 1) B("schlau", clamp(lead / 8) * 0.7); else if (lead < -1) B("verwirrt", clamp(-lead / 6) * 0.6); }
    // Ergebnis einer langsamen Runde
    if (!h.schnell && h.rd && h.seit < 1.8) {
      const w = puls(h.seit, 1.3) * clamp(h.seit / 0.04);
      const mein = h.rd.erg * sg;
      if (mein > 0) B("froh", w); else if (mein < 0) B("traurig", w); else B("verwirrt", w * 0.7);
    }
    // Pumpen: konzentriert
    if (h.pumpt && !h.schnell) B("fokus", 0.8);
    // Skript-Momente
    const m = (name, a, b, f = 0.25, w = 1) => B(name, huelle(t, [[a, b]], f) * w);
    if (wer === "rot") {
      m("schlau", T("hook:Taktik") - 0.1, T("hook:gewinnt?") + 0.6, 0.3);
      m("schlau", T("regeln:Rot") - 0.1, T("regeln:Cyan") - 0.2, 0.3, 0.8);
      m("grinsen", T("falle:Klar"), T("falle:Oder?") + 0.4, 0.3);
      m("froh", T("folgen:Folg"), T("folgen:verpasst") + 0.2, 0.3, 0.8);
      m("schock", T("wendung1:vorbei") - 0.25, T("wendung1:vorbei") + 0.85, 0.2, 0.9);
      m("verwirrt", T("wendung1:elf") - 0.1, T("rennen2:Es") + 0.4, 0.3, 0.8);
      m("verwirrt", T("ergebnis1:Praktisch") - 0.1, T("wendung2:Aber") + 0.4, 0.3, 0.8);
      m("schock", T("wendung2:nicht") - 0.2, T("wendung2:Cyan#2") + 0.2, 0.25, 0.8);
      m("schlau", T("wendung2:Mensch") + 0.2, T("mensch:Prozent.") + 0.6, 0.4);
      m("froh", T("rennen3:Rot") - 0.1, T("warum:Warum") - 0.2, 0.4, 0.9);
      m("schlau", T("warum:Warum"), T("warum:setzt") - 0.1, 0.3, 0.8);
      m("grinsen", T("warum:setzt") - 0.1, T("warum:darauf.") + 0.9, 0.3);
      m("verwirrt", T("ueberraschung:Und"), T("ueberraschung:Hälfte:") + 0.4, 0.4, 0.8);
      m("traurig", T("ueberraschung:nicht") - 0.2, T("ueberraschung:15.") + 0.6, 0.4, 0.45);
      m("ruhig", T("merksatz:Gegen"), T("merksatz:Muster") + 0.5, 0.4);
      m("frage", T("schluss:Was"), T("schluss:Kommentare.>") + 0.4, 0.3, 1);
    } else {
      m("grinsen", T("hook:Glück") - 0.1, T("hook:oder"), 0.3, 0.9);
      m("grinsen", T("regeln:Cyan") - 0.1, T("regeln:Zug.") + 0.8, 0.3, 0.9);
      m("grinsen", T("falle:Klar"), T("falle:Oder?") + 0.5, 0.3);
      m("froh", T("wendung1:Doch"), T("wendung1:vorbei") + 1.2, 0.3, 0.8);
      m("grinsen", T("wendung1:elf"), T("rennen2:Es") + 0.5, 0.3, 0.7);
      m("verwirrt", T("ergebnis1:Praktisch") - 0.1, T("wendung2:Aber") + 0.4, 0.3, 0.8);
      m("grinsen", T("wendung2:Aber"), T("wendung2:nicht") + 0.1, 0.2);
      m("denken", T("wendung2:Cyan#2") - 0.1, T("mensch:44") + 0.4, 0.4, 1);
      m("verwirrt", T("rennen3:Rot"), T("ergebnis2:Neunzehn") - 0.1, 0.4, 0.8);
      m("traurig", T("ergebnis2:Neunzehn") - 0.1, T("warum:Warum") - 0.2, 0.4, 0.9);
      m("denken", T("warum:Warum"), T("warum:wechseln.") - 0.1, 0.3, 0.8);
      m("grinsen", T("ueberraschung:Würfelt") - 0.2, T("ueberraschung:15.") + 0.6, 0.3, 0.9);
      m("schock", T("ueberraschung:Verrückte:") - 0.1, T("ueberraschung:Würfelt") - 0.15, 0.2, 0.5);
      m("ruhig", T("merksatz:Gegen"), T("merksatz:Muster") + 0.5, 0.4);
      m("frage", T("schluss:Was"), T("schluss:Kommentare.>") + 0.4, 0.3, 1);
    }
    // sanftes Zurück zum Ausgangszustand liefert die Schleife (mixD), hier keine Sonderbehandlung
    const bl = blinzeln(t, wer === "rot" ? 1 : 2);
    const kameraBlick = wer === "rot" ? huelle(t, cue.rotZeigt, 0.3) : 0;
    const schlussBlick = huelle(t, [[T("schluss:Was"), T("schluss:Kommentare.>") + 0.4]], 0.3);
    const zuKamera = Math.max(kameraBlick, schlussBlick, huelle(t, [[T("hook:Schere"), T("hook:Papier") + 0.6]], 0.2) * 0.0);
    const o = emoObj(e, { blickX: 0, blickY: 0 });
    o.lid = e[5] + bl * 1.0;
    const yaw = wer === "rot" ? ROT_P.yaw : CYAN_P.yaw;
    const dreh = -Math.sign(yaw) * (0.2 + 0.4 * zuKamera);
    const nickA = e[7] + Math.sin(t * 0.9 + (wer === "rot" ? 0 : 2)) * 0.015;
    const neigA = e[8] + Math.sin(t * 0.7 + (wer === "rot" ? 1 : 3)) * 0.02;
    const gesicht = { ...o };
    delete gesicht._nick; delete gesicht._neig;
    return { gesicht, kopf: { nick: nickA, neig: neigA, dreh } };
  }

  /** Arm-Ziele: Spielhand (innen) und freie Hand (aussen) einer Figur */
  function arme(t, wer, h, st) {
    const sg = wer === "rot" ? 1 : -1;
    const P = wer === "rot" ? ROT_P : CYAN_P;
    const spiel = wer === "rot" ? SPIEL_R : SPIEL_C;
    const kopf = wer === "rot" ? KOPF_R : KOPF_C;
    const pump = wer === "rot" ? h.pumpR : h.pumpC;
    const wack = wer === "rot" ? h.wackR : h.wackC;
    const qu = wer === "rot" ? h.quR : h.quC;
    const w3 = wer === "rot" ? h.wR : h.wC;
    const siegNow = h.rd ? h.rd.erg * sg : 0;
    const idle = Math.sin(t * 1.5 + (wer === "rot" ? 0 : 1.6));
    // ---- Spielhand
    let zi = [spiel[0] + (-sg) * 0.0, spiel[1] + pump * 1.2 + 0.03 * idle, spiel[2] + 0.0];
    let hint = [sg * 0.3, 0.1, 1];
    let po = pose({ stein: w3[0], papier: w3[1], schere: w3[2] });
    // Reveal: nach vorn schieben
    if (!h.schnell && h.rd && h.seit < 0.9) zi[2] += 0.28 * puls(h.seit, 2.5) * clamp(h.seit / 0.05);
    // Jubel mit der Siegerhand
    let jub = 0;
    if (!h.schnell && h.rd && siegNow > 0 && h.seit > 0.25 && h.seit < 1.5) jub = ease.inOutSine(clamp((h.seit - 0.25) / 0.2)) * (1 - ease.inOutSine(clamp((h.seit - 1.1) / 0.4)));
    if (h.schnell && t > tLos && ((st.rot - st.cyan) * sg) > 3) jub = 0.35;
    zi = lerpv(zi, [spiel[0] - sg * 0.1, 3.75 + 0.1 * Math.abs(Math.sin(t * 9)), spiel[2] - 0.3], jub);
    if (jub > 0.5) po = mix3(po, pose({ stein: 1 }), 0.8);
    // Schulterzucken (Frage): offene Hände nach oben
    const schulter = huelle(t, wer === "rot" ? cue.rotSchulter : cue.cyanSchulter, 0.25);
    zi = lerpv(zi, [spiel[0] - sg * 1.5, 2.1, 0.35], schulter);
    po = mix3(po, pose({ papier: 1 }), schulter);
    hint = lerpv(hint, [0, 1, 0.55], schulter);
    // Cyan denkt: Hand am Kinn (Spielhand bleibt am Spiel, freie Hand geht zum Kinn)
    const inn = { ziel: zi, hint, pose: po, quetsch: qu, wackeln: wack * 1.0, neigung: 0.03 * Math.sin(t * 1.3) };
    // ---- freie Hand
    const nA = P; // Figur-Ort
    const ruhe = wer === "rot" ? [-1.85, TISCH_Y + 0.2, 0.2] : [1.9, TISCH_Y + 0.22, 0.25];
    let zf = ruhe.slice(), hf = [0, -1, 0.3], pf = pose({ stein: 0.6, papier: 0.4 });
    if (wer === "rot") {
      const sch = huelle(t, cue.rotSchreibt, 0.25);
      const notiz = [-1.55 + 0.07 * Math.sin(t * 9), TISCH_Y + 0.28, 0.58 + 0.05 * Math.cos(t * 7)];
      zf = lerpv(zf, notiz, sch); pf = mix3(pf, pose({ stein: 0.85, papier: 0.15 }), sch);
      const br = huelle(t, cue.rotBrille, 0.25);
      const fw = fwd(P.yaw);
      const nase = [kopf[0] + fw[0] * 0.5, kopf[1] + 0.12, kopf[2] + fw[2] * 0.5];
      zf = lerpv(zf, nase, br); hf = lerpv(hf, [0.2, 0.2, 1], br); pf = mix3(pf, pose({ zeig: 1 }), br);
      const zg = huelle(t, cue.rotZeigt, 0.25);
      zf = lerpv(zf, [-1.95 + 0.2 * Math.sin(t * 9), 3.15, 0.25], zg); hf = lerpv(hf, [0, 0, 1], zg); pf = mix3(pf, pose({ papier: 1 }), zg);
      // Jubel (freie Hand mit): wenn Rot gewinnt
      zf = lerpv(zf, [-2.35, 3.65 + 0.12 * Math.abs(Math.sin(t * 8)), 0.0], jub * 0.9);
      pf = mix3(pf, pose({ stein: 1 }), jub);
      const sc2 = schulter;
      zf = lerpv(zf, [-2.55, 2.1, 0.3], sc2); pf = mix3(pf, pose({ papier: 1 }), sc2); hf = lerpv(hf, [0, 1, 0.55], sc2);
    } else {
      // Becher in der Hand beim Schütteln; sonst liegt die Hand neben dem Becher
      const wz = wuerfelZustandCache;
      const bc = wz.becherInHand;
      const becherGriff = [wz.bp[0], wz.bp[1] + 0.66, wz.bp[2] + 0.02];
      zf = lerpv(zf, becherGriff, bc); pf = mix3(pf, pose({ stein: 1 }), bc); hf = lerpv(hf, [0, 0.6, 0.8], bc);
      const fe = huelle(t, cue.cyanFegt, 0.12);
      zf = lerpv(zf, [BECHER_RUHE[0] + 2.0 * fortschritt(t, tSchiebt - 0.1, tSchiebtEnde), TISCH_Y + 0.5, 0.8], fe);
      pf = mix3(pf, pose({ papier: 1 }), fe);
      const dk = huelle(t, cue.cyanDenkt, 0.5);
      const fw = fwd(P.yaw);
      const kinn = [kopf[0] + fw[0] * 0.38, kopf[1] - 0.66, kopf[2] + fw[2] * 0.38];
      zf = lerpv(zf, kinn, dk); pf = mix3(pf, pose({ stein: 1 }), dk); hf = lerpv(hf, [-0.3, 0.2, 1], dk);
      zf = lerpv(zf, [2.35, 3.65 + 0.12 * Math.abs(Math.sin(t * 8)), 0.0], jub * 0.9);
      pf = mix3(pf, pose({ stein: 1 }), jub);
      const sc2 = schulter;
      zf = lerpv(zf, [2.55, 2.1, 0.3], sc2); pf = mix3(pf, pose({ papier: 1 }), sc2); hf = lerpv(hf, [0, 1, 0.55], sc2);
    }
    const aus = { ziel: zf, hint: hf, pose: pf, quetsch: 1, wackeln: wer === "rot" ? huelle(t, cue.rotZeigt, 0.25) * 0.3 * Math.sin(t * 9) : 0, neigung: 0, pol: [sg * -0.6, -0.8, -0.2] };
    return { innen: { ...inn, pol: [-sg * 0.45, -0.8, -0.25] }, aussen: { ...aus, pol: [-sg * 0.7, -0.8, -0.1] } };
  }
  let wuerfelZustandCache = null;

  // Fans
  function fansZustand(t, h, st) {
    const lead = st.rot - st.cyan;
    const out = [];
    const sk = (s) => (s < 0 ? 1 : -1); // Seite → Vorzeichen für Rot (links)
    // Schock-Momente (beide Seiten)
    const schock = huelle(t, [
      [T("wendung1:vorbei") - 0.2, T("wendung1:vorbei") + 0.8],
      [T("wendung2:nicht") - 0.1, T("wendung2:Cyan#2") + 0.4],
      [T("ueberraschung:Verrückte:") - 0.1, T("ueberraschung:Würfelt") + 0.3],
      [T("ergebnis1:Praktisch") - 0.1, T("ergebnis1:gleich.") + 0.5],
    ], 0.2);
    for (const f of fans) {
      const mein = sk(f.d.s); // +1 = Rot-Fan
      let jub = 0, trau = 0;
      if (!h.schnell && h.rd && h.seit < 1.8) {
        const w = puls(h.seit, 1.1) * clamp(h.seit / 0.06);
        if (h.rd.erg * mein > 0) jub = w; else if (h.rd.erg * mein < 0) trau = w * 0.8;
      }
      if (t > tLos) {
        const l = lead * mein;
        if (l > 1) jub = Math.max(jub, clamp(l / 7) * 0.8);
        else if (l < -1) trau = Math.max(trau, clamp(-l / 7) * 0.6);
        else if (h.schnell) jub = Math.max(jub, 0.25);
      }
      // gezielte Jubel-Momente
      const gez = f.d.s < 0
        ? huelle(t, [[T("rennen1:Rot"), T("rennen1:zwei.") + 0.5], [T("rennen3:Rot"), T("warum:Warum") - 0.3], [T("warum:setzt"), T("warum:darauf.") + 0.5]], 0.3)
        : huelle(t, [[T("wendung1:vorbei") - 0.1, T("wendung1:vorbei") + 1.2], [T("ueberraschung:Würfelt"), T("ueberraschung:15.") + 0.5]], 0.3);
      jub = Math.max(jub, gez * 0.9);
      const ph = f.i * 1.7;
      const sprung = jub * Math.abs(Math.sin(t * 7.5 + ph)) * 0.12;
      const arm = [];
      const hoch = 2.5 + 0.35 * Math.sin(t * 9 + ph);
      // Arm 0 trägt die Fahne (falls vorhanden) und hebt sich bei Jubel
      arm.push({ x: lerp(0.2, hoch, jub) + (1 - jub) * 0.0 - schock * 0.0, z: lerp(0.05, 0.35, jub), ell: lerp(0.3, 0.2, jub) });
      arm.push({ x: lerp(0.15, hoch * 0.95, jub), z: lerp(0.05, 0.35, jub), ell: lerp(0.3, 0.3, jub) });
      // Schock: Hände vor den Mund
      const e = EMO.fokus.slice();
      let em = e;
      em = emoMix(em, "schlau", 0.3 * (1 - jub));
      em = emoMix(em, "froh", jub);
      em = emoMix(em, "traurig", trau);
      em = emoMix(em, "schock", schock * (1 - 0.3 * jub));
      const bl = blinzeln(t, 10 + f.i);
      const o = emoObj(em);
      o.lid = em[5] + bl;
      const gesicht = { ...o };
      delete gesicht._nick; delete gesicht._neig;
      const nach = (h.rd && !h.schnell) ? 0 : 0;
      if (schock > 0.01) { arm[0] = { x: lerp(arm[0].x, 1.7, schock), z: lerp(arm[0].z, -0.1, schock), ell: lerp(arm[0].ell, 2.2, schock) }; arm[1] = { x: lerp(arm[1].x, 1.7, schock), z: lerp(arm[1].z, -0.1, schock), ell: lerp(arm[1].ell, 2.2, schock) }; }
      out.push({ hoch: sprung, gesicht, kopf: { nick: -0.1 * jub + 0.1 * trau, neig: 0.08 * Math.sin(t * 1.1 + ph), dreh: 0 }, arm, wipp: jub * 0.06 * Math.sin(t * 7 + ph), lehn: 0 });
    }
    return out;
  }

  // =====================================================================================
  // Kamera: Fahrten und Verfolgung
  // =====================================================================================
  // [t, camX, camY, camZ, zielX, zielY, fov]
  const KF = [
    [0, 0, 4.1, 20.5, 0, 3.25, 30],
    [T("hook:Glück") - 0.3, 0.55, 3.9, 17.2, 0.6, 3.0, 30],
    [T("hook:Taktik") - 0.2, -0.55, 3.9, 17.2, -0.6, 3.0, 30],
    [T("hook:Wer") - 0.1, 0, 4.1, 19.6, 0, 3.1, 30],
    [T("regeln:Hundert") - 0.2, 0, 4.6, 21.0, 0, 3.7, 30],
    [T("regeln:Rot") - 0.3, -0.7, 3.8, 16.6, -0.9, 2.95, 30],
    [T("regeln:Cyan") - 0.3, 0.7, 3.8, 16.6, 0.9, 2.95, 30],
    [T("falle:Klar") - 0.3, 0, 4.1, 19.6, 0, 3.1, 30],
    [T("falle:Oder?") - 0.2, 0.9, 3.6, 15.6, 1.0, 2.8, 30],
    [T("start:Runde") - 0.3, 0, 4.1, 19.8, 0, 3.1, 30],
    [T("rennen1:Zehn") - 0.1, 0, 4.2, 20.2, 0, 3.2, 30],
    [T("folgen:Folg") - 0.3, -0.5, 3.6, 15.0, -0.8, 2.85, 30],
    [T("folgen:verpasst") + 0.5, 0, 4.1, 19.4, 0, 3.1, 30],
    [T("wendung1:zieht") - 0.2, 0.7, 3.8, 16.6, 0.9, 2.9, 30],
    [T("wendung1:Runde") - 0.1, 0, 4.2, 20.4, 0, 3.3, 30],
    [T("rennen2:Es") - 0.1, 0, 4.2, 20.6, 0, 3.3, 30],
    [T("ergebnis1:Endstand") - 0.1, 0, 4.7, 21.4, 0, 3.8, 30],
    [T("ergebnis1:Praktisch") - 0.2, 0, 3.9, 17.6, 0, 3.0, 30],
    [T("wendung2:Aber") - 0.2, 0, 4.1, 19.4, 0, 3.1, 30],
    [T("wendung2:würfelt") - 0.1, 0.9, 3.6, 15.8, 1.2, 2.8, 30],
    [T("wendung2:Cyan#2") - 0.2, 0.9, 3.4, 14.6, 1.25, 2.65, 30],
    [T("mensch:Menschen") - 0.1, 0.3, 3.9, 17.6, 0.5, 3.0, 30],
    [T("mensch:44") - 0.2, 0, 4.2, 20.2, 0, 3.2, 30],
    [T("rennen3:Runde") - 0.1, 0, 4.2, 20.6, 0, 3.3, 30],
    [T("ergebnis2:Endstand") - 0.1, 0, 4.7, 21.4, 0, 3.8, 30],
    [T("ergebnis2:Neunzehn") - 0.1, -0.6, 3.8, 16.4, -0.9, 2.9, 30],
    [T("warum:Warum") - 0.1, 0, 4.0, 18.6, 0, 3.0, 30],
    [T("warum:bleiben") - 0.3, 0.95, 3.3, 14.6, 1.3, 2.7, 30],
    [T("warum:wechseln") + 0.35, 0, 3.7, 16.4, 0, 2.9, 30],
    [T("warum:setzt") - 0.2, -0.95, 3.4, 14.8, -1.35, 2.75, 30],
    [T("ueberraschung:Und") - 0.1, 0, 4.2, 20.0, 0, 3.3, 30],
    [T("ueberraschung:Würfelt") - 0.25, 1.0, 3.6, 15.8, 1.2, 2.75, 30],
    [T("ueberraschung:wieder") + 0.2, 0, 4.2, 20.4, 0, 3.3, 30],
    [T("ueberraschung:Zweite") - 0.1, 0, 4.0, 19.0, 0, 3.0, 30],
    [T("merksatz:Gegen") - 0.2, 0, 3.7, 17.2, 0, 2.95, 30],
    [T("schluss:Was") - 0.3, 0, 4.1, 19.6, 0, 3.1, 30],
    [ENDE, 0, 4.1, 20.5, 0, 3.25, 30],
  ];
  for (const k of KF) { k[3] = Math.max(k[3], 17.3); k[5] = Math.max(k[5], 3.05); k[1] *= 0.85; k[2] += 1.0; k[3] = 16.2 + (k[3] - 20.5) * 0.8; k[4] *= 0.85; k[5] -= 0.25; }
  const kamBasis = (t) => {
    let i = 0;
    while (i < KF.length - 1 && KF[i + 1][0] <= t) i++;
    const a = KF[i], b = KF[Math.min(i + 1, KF.length - 1)];
    const k = b[0] === a[0] ? 0 : ease.inOutCubic(fortschritt(t, a[0], b[0]));
    const v = a.map((x, j) => lerp(x, b[j], k));
    // sanftes Driften, am Anfang und Ende 0 (Schleife)
    const dx = Math.sin(t * 0.37) * 0.09, dy = Math.sin(t * 0.29 + 1) * 0.05;
    // Verfolgung: Die Kamera schwenkt leicht zur Seite des Führenden
    const s = stand(t);
    const lead = clamp((s.rot - s.cyan) / 8, -1, 1) * (t > tLos ? 1 : 0) * (t < tMerk ? 1 : 0);
    return { pos: [v[1] + dx - lead * 0.2, v[2] + dy, v[3]], ziel: [v[4] - lead * 0.25, v[5], 0], fov: v[6] };
  };
  const regie = new Regie(kamera, kamBasis, { zp });
  regie.schleife({ ab: tSchleife, ende: ENDE });
  KF.slice(1, -1).forEach((f) => M.melde({ t: f[0], typ: "kamera", art: "fahrt", dauer: 1.0, klang: "whoosh" }));
  regie.zoom({ t: "wendung1:vorbei", ziel: [0.9, 2.9, 0], staerke: 0.14, halt: 0.9, rueck: 0.6 });
  regie.zoom({ t: "ergebnis2:Neunzehn", ziel: [-0.9, 2.9, 0], staerke: 0.1, halt: 1.0, rueck: 0.6 });
  regie.zoom({ t: "warum:setzt", ziel: [-1.4, 2.8, 0], staerke: 0.12, halt: 1.0, rueck: 0.6 });

  // Ereignisse für Ton und Prüfung: jede langsame Runde, Würfelwürfe, Jubel, Schock
  for (let r = 1; r <= 3; r++) M.melde({ t: tZ[r], typ: "zug", klang: "pop", text: `Runde ${r}` });
  for (const x of WURF_Z) if (x.r > 3) M.melde({ t: x.t, typ: "zug", klang: "pop", text: `Runde ${x.r}` });
  for (let r = 1; r <= 3; r++) M.melde({ t: tM[r], typ: "zug", klang: "pop", text: `Mensch Runde ${r}` });
  for (let r = 1; r <= 3; r++) M.melde({ t: tR[r], typ: "zug", klang: "pop", text: `Wiederholung Runde ${r}` });
  M.melde({ t: tGeist, typ: "welt", klang: "pop", text: "100 Plätze leuchten auf" });
  M.melde({ t: tDemoWurf, typ: "wuerfel", klang: "klick", text: "Würfel rollt" });
  M.melde({ t: T("hook:Glück"), typ: "wuerfel", klang: "klick", text: "Becher schüttelt" });
  M.melde({ t: T("hook:Taktik"), typ: "welt", klang: "pop", text: "Rot schiebt die Brille" });
  M.melde({ t: T("regeln:Rot"), typ: "welt", klang: "pop", text: "Rot schreibt" });
  M.melde({ t: T("folgen:Folg"), typ: "welt", klang: "pop", text: "Rot zeigt auf dich" });
  M.melde({ t: T("wendung1:vorbei"), typ: "wendung", klang: "whoosh", text: "Cyan zieht vorbei" });
  M.melde({ t: tLeerZ, typ: "welle", klang: "whoosh", text: "Brett leeren" });
  M.melde({ t: tSchiebt, typ: "wandlung", klang: "whoosh", text: "Cyan fegt den Würfel vom Tisch" });
  M.melde({ t: tMensch, typ: "wandlung", klang: "whoosh", text: "Cyan spielt wie ein Mensch" });
  M.melde({ t: tClearM, typ: "welle", klang: "whoosh", text: "Brett leeren" });
  M.melde({ t: tW0, typ: "wandlung", klang: "whoosh", text: "Cyan würfelt wieder" });
  M.melde({ t: T("warum:setzt"), typ: "welt", klang: "pop", text: "Rot setzt darauf" });
  M.melde({ t: tMerk, typ: "welle", klang: "whoosh", text: "Brett leeren" });
  M.melde({ t: T("schluss:Was"), typ: "welt", klang: "pop", text: "Beide fragen dich" });
  // Zeitraffer-Phasen: Ereignisse im Takt (damit nie mehr als 2 s ohne Bild-Ereignis vergehen)
  const rasterPhasen = [[tZ[4], tZ[9]], [tZ[15], tZ[29]], [tZ[31], tZ[59]], [tZ[61], tZ[100]], [tM[4], tM[29]], [tM[32], tM[100]], [tW[51], tW[100]]];
  for (const [a, b] of rasterPhasen) for (let x = a; x <= b; x += 0.5) M.melde({ t: x, typ: "zug", klang: false, text: "Zeitraffer" });

  // =====================================================================================
  // Weltzustand je Bild
  // =====================================================================================
  const zustand = (t) => {
    const h = haende(t);
    const st = stand(t);
    wuerfelZustandCache = wuerfelZustand(t);
    const wz = wuerfelZustandCache;
    const ruhe = (wer, sg) => ({ lehn: 0.1 + 0.012 * Math.sin(t * 1.4 + (wer === "rot" ? 0 : 2)) + (h.pumpt ? 0.03 : 0), wipp: 0.01 * Math.sin(t * 0.9), hoch: 0.01 * Math.sin(t * 1.4) });
    const aR = arme(t, "rot", h, st), aC = arme(t, "cyan", h, st);
    const eR = emotion(t, "rot", h, st), eC = emotion(t, "cyan", h, st);
    // Lampen: Rundensieger
    let lR = 0, lC = 0;
    if (!h.schnell && h.rd && h.A.id !== "R") { const w = puls(h.seit, 1.2) * clamp(h.seit / 0.03); if (h.rd.erg > 0) lR = w; else if (h.rd.erg < 0) lC = w; else { lR = lC = w * 0.4; } }
    else if (h.schnell && h.rd) { const w = 0.5 * (0.5 + 0.5 * Math.sin(t * 24)); if (h.rd.erg > 0) lR = w; else if (h.rd.erg < 0) lC = w; }
    return {
      rot: { gesicht: eR.gesicht, kopf: eR.kopf, rumpf: ruhe("rot"), arme: aR },
      cyan: { gesicht: eC.gesicht, kopf: eC.kopf, rumpf: ruhe("cyan"), arme: aC },
      fans: fansZustand(t, h, st),
      wuerfel: { p: wz.wp, q: wz.wq, s: wz.ws },
      becher: { p: wz.bp, n: wz.bneig, hand: wz.becherInHand, hoch: wz.bhoch },
      lampen: [lR, lC],
      katze: (() => {
        const jubel = Math.max(huelle(t, [[T("wendung1:vorbei") - 0.2, T("wendung1:vorbei") + 1.0], [T("wendung2:nicht") - 0.2, T("wendung2:nicht") + 0.9], [T("ueberraschung:Würfelt") - 0.3, T("ueberraschung:Würfelt") + 1.0]], 0.2), (!h.schnell && h.rd && h.seit < 0.9 && h.A.id !== "R") ? puls(h.seit, 2.5) * 0.6 : 0);
        return { kopf: 0.15 + 0.85 * jubel, wedel: t * (2.2 + 4 * jubel), amp: 0.25 + 0.4 * jubel, auf: 0.18 + 0.82 * jubel, ohr: jubel * Math.sin(t * 18), dreh: -0.25 * jubel + 0.12 * Math.sin(t * 0.6), neig: 0.05 * Math.sin(t * 0.8), hochSchwanz: jubel };
      })(),
      stift: { s: huelle(t, cue.rotSchreibt, 0.25), hand: 0 },
      wimpel: Math.sin(t * 1.3),
      pawn: Math.max(puls(Math.max(0, t - Math.max(0, h.revT)), 3) * (h.rd && h.rd.erg > 0 && !h.schnell ? 1 : 0), ...[T("hook:Taktik"), T("regeln:Taktik.")].map((t0) => (t >= t0 && t < t0 + 0.9 ? puls(t - t0, 3) : 0))),
    };
  };
  const Z0 = zustand(0);
  const setzeBecher = (b, A) => {
    becherM.position.set(...b.p);
    becherM.rotation.set(0, 0, 0);
    becherM.rotation.z = b.n;
  };
  const wende = (Zs) => {
    rot.setze(Zs.rot);
    cyan.setze(Zs.cyan);
    Zs.fans.forEach((s, i) => fans[i].setze(s));
    wuerf.position.set(...Zs.wuerfel.p);
    wuerf.quaternion.set(...Zs.wuerfel.q).normalize();
    wuerf.scale.setScalar(Math.max(0.0001, Zs.wuerfel.s));
    wuerf.visible = Zs.wuerfel.s > 0.01;
    setzeBecher(Zs.becher);
    katzeM.setze(Zs.katze);
    lampeR.m.emissiveIntensity = 2.2 * Zs.lampen[0];
    lampeC.m.emissiveIntensity = 2.2 * Zs.lampen[1];
    wim.userData.fahnen.forEach((f, i) => { f.rotation.z = 0.08 * Math.sin(Zs.wimpel * 2 + i * 0.7); });
    stiftM.visible = Zs.stift.s > 0.15 || Zs.stift.hand > 0.5;
    stiftB.visible = !stiftM.visible;
    pawn.position.y = TISCH_Y + 0.25 * Zs.pawn * Math.abs(Math.sin(Zs.pawn * 12));
  };
  const setzeWelt = (t) => {
    const kl = kL(t);
    const ein = 1 - kl;
    wende(kl > 0 ? mixD(Z0, zustand(t), ein) : zustand(t));
    // Brett
    for (let r = 1; r <= 100; r++) {
      let s = kachel(r, t);
      // „Hundert Runden.“: alle 100 Plätze des Bretts leuchten einmal reihenweise auf
      if (!(s.groesse > 0) && t >= tGeist && t < tGeist + 1.8) {
        const u = (t - tGeist - Math.floor((r - 1) / 10) * 0.07 - ((r - 1) % 10) * 0.012) / 0.4;
        if (u > 0 && u < 1) s = { groesse: 0.7 * Math.sin(Math.PI * u), farbe: "remis", hebe: 0.05 * Math.sin(Math.PI * u) };
      }
      if (s.x === undefined) { const [bx, by] = B.userData.platz(r - 1); s.x = bx; s.y = by; }
      const g = (s.groesse || 0) * (t >= tMerk ? 1 - ease.inCubic(clamp((t - tMerk - (r - 1) * 0.004) / 0.2)) : 1) * (1 - kl);
      setzeKachel(B, r - 1, { groesse: g, farbe: s.farbe || "remis", drehung: s.drehung || 0, hebe: s.hebe || 0, x: s.x ?? null, y: s.y ?? null });
    }
    regie.anwenden(t);
  };
  const post = { bloomStaerke: 0, bloomSchwelle: 1.1, tiltStaerke: 0, vignette: 0.2, koernung: 0.026, saettigung: 1.05, kontrast: 1.04, belichtung: 1.0 };
  const welt = { szene, kamera, post, update(t) { setzeWelt(t); } };

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t });
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, 16, 30, 45, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.__nurHud = (t) => { regie.anwenden(t); hud.update(t); };
  window.hudAt = (t) => hud.update(t);
  window.__weltSetzen = (t) => setzeWelt(t);
  window.modell = {
    seeds: V.seeds,
    zufall: { rot: lz.siegeRot, cyan: lz.siegeCyan, remis: lz.remis },
    mensch: { rot: lm.siegeRot, cyan: lm.siegeCyan, remis: lm.remis },
    haelfte2: [haelfte2Rot, haelfte2Cyan],
    mc: MC_ZUFALL,
  };
  window.__info = () => ({ ...buehne.renderer.info.render, geometrien: buehne.renderer.info.memory.geometries });
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
