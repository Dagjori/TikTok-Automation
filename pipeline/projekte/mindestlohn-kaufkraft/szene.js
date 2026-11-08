// „Mindestlohn 2015 oder 2026: Wer kann sich mit einem Jahr Arbeit mehr leisten?“ · Simulierbar · Stil 20 Glas & Licht (09.11.2026 mittag)
// Dunkles Labor: zwei Messzylinder (links Anna 2015 in Kupfer, rechts Lena 2026 in Türkis), der Jahreslohn läuft als leuchtende Flüssigkeit hinein;
// Füllstand = Zahl auf der Tafel. Stufen: nominal brutto, in heutigen Euro (Preise heben Annas Stand), Mai 2022 (Lenas Stand bricht ein,
// Anna vorn), Sprung auf 12 € (Lena zieht vorbei), Abgaben (beide sinken auf netto). Das Röhrchen in der Mitte zeigt den Vorsprung.
// Alle Zahlen kommen aus pipeline/sim/mindestlohn.mjs. Alles ist eine reine Funktion von t (window.renderAt(t)).
import * as THREE from "three";
import { SimBuehne, GRADING, rigLabor, lichtKegel, staub, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { glasGefaess, kaustik, laborBank, gegenlichtWand, laborZeit } from "../../engine/stil_lichtlabor.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, keyframes } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/mindestlohn.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Flüssigkeit, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb.
const KUPFER = "#E0813A"; // Anna 2015
const TUERKIS = "#22C6D6"; // Lena 2026
const ELFENBEIN = "#ECE6DA";
const Z = videoZahlen();
const ANNA0 = Z.bruttoAlt, LENA0 = Z.bruttoNeu;                 // 17.680 / 28.912 (nominal brutto)
const ANNA_REAL = Z.bruttoAltReal;                               // 23.348,83 (heutige Euro)
const LENA_MAI = Z.lenaMai22Real, LENA_OKT = Z.lenaOkt22Real;    // 23.215,98 / 27.445
const ANNA_NET = Z.nettoAltReal, LENA_NET = Z.nettoNeu;          // 17.118,10 / 20.597,64
const de = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Funken: kleine Lichtpunkte, die aus einem Punkt aufsteigen (deterministisch aus k = 0…1) */
function funken({ n = 70, farbe = "#FFFFFF", seed = 3, radius = 0.3, groesse = 7 }) {
  let s = seed * 977 + 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const sd = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) sd[i] = r();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(sd, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { k: { value: 0 }, ursprung: { value: new THREE.Vector3() }, richtung: { value: new THREE.Vector3(0, 1, 0) }, farbe: { value: new THREE.Color(farbe) }, radius: { value: radius }, groesse: { value: groesse } },
    vertexShader: /* glsl */ `attribute vec3 seed; uniform float k, radius, groesse; uniform vec3 ursprung, richtung; varying float vA;
      void main(){ float d = seed.x * 0.5; float p = clamp((k - d) / 0.5, 0.0, 1.0);
        vec3 w = ursprung + vec3((seed.y - 0.5) * radius * 2.0, 0.0, (seed.z - 0.5) * radius * 2.0) + richtung * p * (0.7 + seed.z) + vec3(sin(p * 6.0 + seed.x * 30.0) * 0.08, 0.0, 0.0);
        vA = sin(p * 3.14159) * step(0.001, k) * step(k, 0.999);
        vec4 mv = viewMatrix * vec4(w, 1.0); gl_PointSize = groesse * (0.6 + seed.y) * 14.0 / max(-mv.z, 1.0) * 10.0 / 10.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(farbe * a * a * vA * 2.2, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 11; p.userData.dynamisch = true;
  p.setze = (k, ursprung, richtung) => { m.uniforms.k.value = k; if (ursprung) m.uniforms.ursprung.value.set(...ursprung); if (richtung) m.uniforms.richtung.value.set(...richtung); p.visible = k > 0.001 && k < 0.999; };
  p.visible = false;
  return p;
}


async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.5 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "ANNA 2015", farbe: KUPFER, woerter: ["Anna*", "Annas*", "8,50*", "17.680*", "17.118*", "2015*"] },
      b: { name: "LENA 2026", farbe: TUERKIS, woerter: ["Lena*", "13,90*", "28.912*", "20.598*", "2026*"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);
  const R = (t, a, b, e = ease.inOutSine) => e(fortschritt(t, a, b));
  const puls = (t, t0, d = 0.7) => { const k = fortschritt(t, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const an = (t, a, b) => (t > a && t < b ? 1 : 0);

  // ---------- Zeitachse an gesprochenen Wörtern ----------
  const tFa0 = T("rennen:Anna") + 0.25, tFa1 = T("rennen:brutto") + 0.3;            // Anna füllt sich (brutto)
  const tFl0 = T("rennen:Lena") + 0.25, tFl1 = T("rennen:28.912>") + 0.2;           // Lena füllt sich
  const tVa = T("rennen:11.232") - 0.3, tVb = T("rennen:Vorsprung") + 0.25;         // Vorsprung-Röhrchen
  const tP0 = T("wendung1:Preise") - 0.1, tP1 = T("wendung1:32>") + 0.4;            // Preise heben Annas Stand
  const tM0 = T("wendung2:Mai") - 0.1, tM1 = T("wendung2:rasen>") + 0.3;            // Mai 2022: Lenas Stand bricht ein
  const tO0 = T("wendung3:Lena") - 0.2, tO1 = T("wendung3:vorbei>") + 0.1;          // 12 €: Lena zieht vorbei
  const tH0 = T("wendung3:13,90") - 0.1, tH1 = T("wendung3:13,90>") + 0.2;          // heute 13,90 €
  const tK0 = T("kipp:Abgaben") - 0.1, tK1 = T("kipp:Cent.") + 0.1;                 // Abgaben: beide sinken auf netto
  const tPo0 = T("pointe:Und") - 0.1, tPo1 = T("pointe:Und") + 0.3;                 // Lena leert sich (Rückblende)
  const tRf0 = T("pointe:Und") + 0.45, tRf1 = T("pointe:Oktober") + 0.45;           // Lena füllt sich Monat für Monat
  const tErg = T("ergebnis:Endstand"), tWarum = T("warum:Warum");
  const fillM = (t) => 1 + 11 * R(t, tFa0, tFl1, ease.linear);

  // Zustand (Jahreslohn in €, in der jeweiligen Stufe)
  const zustandRoh = (t) => {
    let A = ANNA0 * R(t, tFa0, tFa1, ease.outCubic);
    A += (ANNA_REAL - ANNA0) * R(t, tP0, tP1, ease.inOutCubic);
    A += (ANNA_NET - ANNA_REAL) * R(t, tK0, tK1, ease.inOutCubic);
    let L = LENA0 * R(t, tFl0, tFl1, ease.outCubic);
    L += (LENA_MAI - LENA0) * R(t, tM0, tM1, ease.inOutCubic);
    L += (LENA_OKT - LENA_MAI) * R(t, tO0, tO1, ease.inOutSine);
    L += (LENA0 - LENA_OKT) * R(t, tH0, tH1, ease.inOutSine);
    L += (LENA_NET - LENA0) * R(t, tK0, tK1, ease.inOutCubic);
    if (t > tPo0 - 0.01) {
      const leer = 1 - R(t, tPo0, tPo1, ease.inCubic);
      const refill = R(t, tRf0, tRf1, ease.linear);
      L = LENA_NET * (t < tRf0 ? leer : refill);
    }
    const pm = (t - tRf0) / (tRf1 - tRf0);                           // 0 … 1 = Monat 0 … ca. 10 (Ende Oktober = 9,97)
    const monat = t < tPo0 ? fillM(t) : Math.max(1, 9.97 * clamp(pm));
    const visV = R(t, tVa, tVb) * (1 - R(t, tPo0 - 0.2, tPo0 + 0.2));
    const vor = Math.abs(L - A) * visV;
    const lg = lerp(lerp(lerp(Math.log(12000), Math.log(7000), R(t, T("wendung1:Doch") - 0.2, T("wendung1:Doch") + 0.5)), Math.log(400), R(t, tM0 - 0.2, tM0 + 0.5)), Math.log(6000), R(t, tO0 - 0.4, tO0 + 0.4));
    return {
      A, L, vor, monat, maxTube: Math.exp(lg),
      zA: an(t, tFa0, tFa1) || an(t, tP0, tP1), zL: an(t, tFl0, tFl1) || an(t, tO0, tO1) || an(t, tH0, tH1) || an(t, tRf0, tRf1),
    };
  };
  const zustand = M.wert(zustandRoh);

  // Lichtpulse an Wortzeiten (nie mehr als 2 s ohne neue Information)
  const PA = ["hook:2015", "regeln:Anna", "regeln:8,50", "regeln:Gezählt", "falle:Klar", "rennen:Anna", "rennen:17.680", "wendung1:Preise", "wendung1:Annas", "wendung1:11,23", "wendung2:Anna", "wendung2:8,45", "kipp:Anna", "kipp:73", "ergebnis:Anna", "warum:Preise", "pointe:Annas", "pointe:ganzes"];
  const PL = ["hook:2026", "regeln:Lena", "regeln:13,90", "regeln:Beide", "falle:Lena", "falle:haushoch", "rennen:Lena", "rennen:28.912", "wendung2:Mai", "wendung3:Lena", "wendung3:13,90", "kipp:Lena", "kipp:71", "ergebnis:3.480", "warum:Abgaben", "pointe:Lena", "pointe:Oktober"];
  const PU = ["hook:Wer", "hook:leisten", "regeln:40", "falle:Oder", "rennen:11.232", "rennen:Vorsprung", "wendung1:Doch", "wendung2:Und", "wendung2:9,82", "wendung2:liegt", "wendung3:12", "wendung3:vorbei", "kipp:Jetzt", "kipp:Der", "ergebnis:Endstand"];
  const tPA = PA.map((k) => T(k)), tPL = PL.map((k) => T(k)), tPU = PU.map((k) => T(k));
  const summe = (liste, t, d = 0.8) => liste.reduce((a, p) => a + puls(t, p, d), 0);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#040507");
  const XA = -1.02, XB = 1.02;
  const lab = rigLabor(szene, buehne.renderer, { umgebungsStaerke: 0.55, schatten: SCHATTEN > 0 ? 1024 : 0, spots: [{ pos: [XA, 7, 0.4], staerke: 18, winkel: 0.2 }, { pos: [XB, 7, 0.4], staerke: 18, winkel: 0.2 }] });
  szene.add(laborBank({ breite: 18, tiefe: 7, spiegel: 0.2 }));
  const wand = gegenlichtWand({ farbe: "#1A2334", staerke: 1.0 }); wand.position.set(0, 4, -6); szene.add(wand);
  const SKALEN = [{ max: 30000, teilung: 2500, beschriftung: 5000 }];
  const HOEHE = 3.1;
  const gA = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: KUPFER, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 1 });
  const gB = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: TUERKIS, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 2 });
  gA.position.x = XA; gB.position.x = XB;
  gA.skalaMeshes.forEach((m) => { m.rotation.y = 0.32; }); gB.skalaMeshes.forEach((m) => { m.rotation.y = -0.32; });
  const gU = glasGefaess({ hoehe: 2.2, radius: 0.15, wand: 0.03, boden: 0.1, farbe: ELFENBEIN, ohneSkala: true, blasen: 30, seed: 3 });
  gU.position.set(0, 0, 0.1);
  szene.add(gA, gB, gU);
  const kA = kaustik({ radius: 1.0, farbe: KUPFER, staerke: 0.9 }), kB = kaustik({ radius: 1.0, farbe: TUERKIS, staerke: 0.9 }), kU = kaustik({ radius: 0.55, farbe: ELFENBEIN, staerke: 0.6 });
  kA.position.set(XA + 0.25, 0.004, 0.5); kB.position.set(XB - 0.25, 0.004, 0.5); kU.position.set(0.1, 0.004, 0.7);
  szene.add(kA, kB, kU);
  for (const x of [XA, XB]) {
    const k = lichtKegel({ hoehe: 7, radiusOben: 0.08, radiusUnten: 1.3, farbe: "#E8F0FF", staerke: 0.07, weich: 1.3, streifen: 0.5 });
    k.position.set(x, 7, 0.4); szene.add(k);
  }
  szene.add(staub({ anzahl: 420, bereich: [5.5, 6, 3], mitte: [0, 3.2, 0.4], farbe: "#DCE6FF", groesse: 0.01, staerke: 1.4, aussen: 0.15 }));
  const ringMat = (f) => leuchtMat(f, 1, { neu: true });
  const rA = ringMat(KUPFER), rB = ringMat(TUERKIS), rU = ringMat(ELFENBEIN);
  const ring = (mat, x, r, z = 0) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 72), mat); m.rotation.x = Math.PI / 2; m.position.set(x, 0.012, z); m.userData.dynamisch = true; szene.add(m); return m; };
  ring(rA, XA, 0.56); ring(rB, XB, 0.56); ring(rU, 0, 0.22, 0.1);
  // Marker auf Lenas Zylinder in Annas Höhe (Pointe: Lena erreicht Annas Jahr)
  const markMat = ringMat(ELFENBEIN);
  const marker = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.014, 8, 72), markMat); marker.rotation.x = Math.PI / 2; marker.userData.dynamisch = true; marker.visible = false; szene.add(marker);
  const fPreis = funken({ n: 70, farbe: KUPFER, seed: 5, radius: 0.3 });
  const fAbg = funken({ n: 80, farbe: ELFENBEIN, seed: 9, radius: 0.3, groesse: 6 });
  const fAbgL = funken({ n: 80, farbe: TUERKIS, seed: 12, radius: 0.3, groesse: 6 });
  const fMai = funken({ n: 70, farbe: TUERKIS, seed: 7, radius: 0.3 });
  szene.add(fPreis, fAbg, fAbgL, fMai);
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(1.0, 3.5, 17.8, 0, 2.4, 0) },
    { t: T("hook:2015"), v: C(-0.6, 3.4, 17.0, -0.5, 2.3, 0), e: ease.inOutSine },
    { t: T("hook:2026"), v: C(0.6, 3.4, 17.0, 0.5, 2.3, 0), e: ease.inOutSine },
    { t: T("hook:Wer"), v: C(0.0, 3.7, 18.8, 0, 2.5, 0), e: ease.inOutSine },
    { t: T("regeln:Anna"), v: C(-0.6, 3.4, 16.8, -0.5, 2.4, 0), e: ease.inOutCubic },
    { t: T("regeln:Lena"), v: C(0.6, 3.4, 16.8, 0.5, 2.4, 0), e: ease.inOutCubic },
    { t: T("regeln:Beide"), v: C(0.0, 3.8, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("falle:Klar") - 0.1, v: C(0.5, 3.2, 16.0, 0.45, 2.3, 0, 29), e: ease.inOutCubic },
    { t: T("falle:Oder") - 0.5, v: C(0.0, 3.7, 18.6, 0, 2.5, 0, 29), e: ease.inOutCubic },
    { t: T("rennen:Anna"), v: C(-0.7, 3.3, 16.6, -0.5, 2.2, 0), e: ease.inOutCubic },
    { t: T("rennen:Lena") - 0.1, v: C(0.7, 3.3, 16.6, 0.5, 2.2, 0), e: ease.inOutCubic },
    { t: T("rennen:11.232") - 0.2, v: C(0.0, 3.8, 18.6, 0, 2.5, 0.1), e: ease.inOutCubic },
    { t: T("wendung1:Doch") - 0.1, v: C(-0.4, 3.9, 19.0, -0.4, 2.6, 0), e: ease.inOutCubic },
    { t: T("wendung1:Annas") - 0.1, v: C(-0.8, 3.4, 16.6, -0.6, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung2:Und"), v: C(0.3, 3.8, 18.8, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("wendung2:Mai") - 0.1, v: C(0.8, 3.4, 16.6, 0.6, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung2:Anna"), v: C(-0.6, 3.5, 17.0, -0.4, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung3:Dann"), v: C(0.0, 3.8, 18.8, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("wendung3:Lena") - 0.1, v: C(0.6, 3.4, 16.6, 0.5, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung3:Und"), v: C(0.0, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("kipp:Jetzt"), v: C(0.0, 3.6, 18.2, 0, 2.5, 0), e: ease.inOutCubic },
    { t: T("kipp:Anna"), v: C(-0.7, 3.3, 16.4, -0.5, 2.3, 0), e: ease.inOutCubic },
    { t: T("kipp:Lena"), v: C(0.7, 3.3, 16.4, 0.5, 2.3, 0), e: ease.inOutCubic },
    { t: T("kipp:Der"), v: C(0.0, 3.7, 17.6, 0, 2.4, 0.1), e: ease.inOutCubic },
    { t: tErg - 0.2, v: C(0.0, 3.9, 19.2, 0, 2.6, 0), e: ease.inOutCubic },
    { t: tWarum, v: C(0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: T("warum:Abgaben"), v: C(-0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: tPo0 - 0.1, v: C(0.4, 3.5, 17.2, 0.3, 2.3, 0), e: ease.inOutCubic },
    { t: T("pointe:Oktober"), v: C(0.2, 3.2, 15.4, 0.4, 2.1, 0), e: ease.inOutCubic },
    { t: T("schlusskarte:Vom") - 0.2, v: C(0.0, 3.8, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: DAUER, v: C(0.0, 3.9, 19.8, 0, 2.6, 0), e: ease.inOutSine },
  ];
  const regie = new Regie(kamera, (t) => { const v = keyframes(camKeys, t); return { pos: v.slice(0, 3), ziel: v.slice(3, 6), fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.008, tempo: 0.25 });
  regie.zoom({ t: T("wendung2:liegt"), ziel: [XA, 2.0, 0.1], staerke: 0.14, halt: 1.0, rueck: 0.8 });
  regie.zoom({ t: T("wendung3:vorbei"), ziel: [XB, 2.2, 0.1], staerke: 0.13, halt: 1.0, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:3.480"), ziel: [0, 1.7, 0.1], staerke: 0.12, halt: 1.1, rueck: 0.8 });

  const post = { ...GRADING.labor, strahlen: 0.35, strahlenQuelle: [0.5, 0.98], strahlenSchwelle: 1.2, strahlenLaenge: 0.6 };
  const cA = new THREE.Color(KUPFER), cB = new THREE.Color(TUERKIS), cE = new THREE.Color(ELFENBEIN);
  const welt = { szene, kamera, post, update: null };
  const MAXW = 30000;
  welt.update = (t) => {
    const s = zustand(t);
    laborZeit(t);
    gA.setze({ wert: s.A, t, zulauf: !!s.zA, zulauf2: !!s.zA, maxWert: MAXW, skala: 0 });
    gB.setze({ wert: s.L, t, zulauf: !!s.zL, zulauf2: !!s.zL, maxWert: MAXW, skala: 0 });
    gU.setze({ wert: s.vor, t, zulauf: false, maxWert: s.maxTube });
    const pA = summe(tPA, t), pL = summe(tPL, t), pU = summe(tPU, t, 0.9);
    const spann = fortschritt(t, tP0, tK0);
    lab.spots[0].intensity = 18 * (1 + 0.55 * Math.min(1.6, pA) + 0.25 * spann);
    lab.spots[1].intensity = 18 * (1 + 0.55 * Math.min(1.6, pL) + 0.25 * spann);
    rA.color.copy(cA).multiplyScalar(1.4 + 2.6 * Math.min(1.5, pA));
    rB.color.copy(cB).multiplyScalar(1.4 + 2.6 * Math.min(1.5, pL));
    rU.color.copy(cE).multiplyScalar(1.0 + 2.8 * Math.min(1.5, pU));
    post.bloomStaerke = GRADING.labor.bloomStaerke * (1 + 0.3 * spann + 0.35 * puls(t, T("ergebnis:3.480"), 1.6) + 0.3 * puls(t, T("wendung3:vorbei"), 1.4));
    // Marker in Annas Höhe auf Lenas Zylinder (Pointe)
    const mk = fortschritt(t, tPo0 + 0.3, tPo0 + 0.9) * (1 - fortschritt(t, T("schlusskarte:Vom"), T("schlusskarte:Vom") + 0.5));
    marker.visible = mk > 0.02; markMat.color.copy(cE).multiplyScalar(2.2 * mk);
    marker.position.set(XB, gB.fluessigHoehe(ANNA_NET, MAXW), 0);
    // Funken: Preise (Anna), Mai-Einbruch (Lena), Abgaben (beide)
    fPreis.setze(clamp((t - tP0) / 2.4), [XA, gA.fluessigHoehe(s.A, MAXW), 0.1], [0, 1.2, 0.2]);
    fMai.setze(clamp((t - tM0) / 2.6), [XB, gB.fluessigHoehe(s.L, MAXW), 0.1], [0, 1.1, 0.2]);
    fAbg.setze(clamp((t - tK0) / 2.6), [XA, gA.fluessigHoehe(s.A, MAXW), 0.1], [0, 1.1, 0.2]);
    fAbgL.setze(clamp((t - tK0) / 2.6), [XB, gB.fluessigHoehe(s.L, MAXW), 0.1], [0, 1.1, 0.2]);
    aktualisiere(t);
    regie.anwenden(t);
    Object.assign(post, fokus(kamera, [0, 1.5, 0.1], { tiefe: 0.22, nah: 0.5, fern: 0.75 }));
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "hoch",
    werte: (t) => { const s = zustandRoh(t); return { a: s.A, b: s.L }; },
    uhr: { ein: T("rennen:Ein") - 0.05, zeit: (t) => zustandRoh(t).monat, format: (v) => (v < 1.5 ? "MONAT 1" : `${Math.round(v)} MONATE`), label: "LOHN" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "voll", y = 490) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.12) => T(x) - d;
  // Statuszeile
  chip("EIN JAHR VOLLZEIT", 0.05, v("rennen:Ein", 0.5), "akzent", "hell", 372);
  chip("STUFE 1 · LOHN NOMINAL", v("rennen:Ein", 0.05), v("wendung1:Doch", 0.5), "akzent", "voll", 372);
  chip("STUFE 2 · IN HEUTIGEN EURO", v("wendung1:Doch", 0.05), v("wendung2:Und", 0.3), "akzent", "voll", 372);
  chip("MAI 2022 · IN HEUTIGEN EURO", v("wendung2:Und", 0.05), v("wendung3:Dann", 0.3), "akzent", "voll", 372);
  chip("HEUTE · IN HEUTIGEN EURO", v("wendung3:Dann", 0.05), v("kipp:Jetzt", 0.5), "akzent", "voll", 372);
  chip("STUFE 3 · NETTO", v("kipp:Jetzt", 0.05), v("ergebnis:Endstand", 0.2), "akzent", "voll", 372);
  // Regeln
  chip("ANNA · 2015 · 8,50 € JE STUNDE", v("regeln:8,50", 0.1), v("falle:Klar", 0.1), "a", "voll", 490);
  chip("LENA · 2026 · 13,90 € JE STUNDE", v("regeln:13,90", 0.1), v("falle:Klar", 0.1), "b", "voll", 600);
  chip("VOLLZEIT · 40 STUNDEN", v("regeln:40", 0.1), v("falle:Klar", 0.1), "akzent", "hell", 710);
  chip("GEZÄHLT WIRD NETTO", v("regeln:Gezählt", 0.1), v("falle:Oder", 0.0), "akzent", "hell", 820);
  // Rennen
  chip("ANNA 17.680 € BRUTTO", v("rennen:17.680", 0.1), v("wendung1:Doch", 0.2), "a", "voll", 490);
  chip("LENA 28.912 € BRUTTO", v("rennen:28.912", 0.1), v("wendung1:Doch", 0.2), "b", "voll", 590);
  const vorsA = (t) => { const s = zustandRoh(t); return Math.max(0, s.A - s.L); };
  const vorsL = (t) => { const s = zustandRoh(t); return Math.max(0, s.L - s.A); };
  M.zaehler({ wert: vorsL, einheit: " €", nk: 0, max: 99999, team: "b", art: "voll", label: "LENA VORN", x: SICHER.mitte, y: 790, ein: v("rennen:11.232", 0.1), aus: v("wendung2:9,82", 0.7), anker: "mitte" });
  M.zaehler({ wert: vorsA, einheit: " €", nk: 0, max: 99999, team: "a", art: "voll", label: "ANNA VORN", x: SICHER.mitte, y: 790, ein: v("wendung2:9,82", 0.1), aus: v("wendung3:vorbei", 0.5), anker: "mitte" });
  M.zaehler({ wert: vorsL, einheit: " €", nk: 0, max: 99999, team: "b", art: "voll", label: "LENA VORN", x: SICHER.mitte, y: 790, ein: v("wendung3:vorbei", 0.0), aus: v("ergebnis:Endstand", 0.2), anker: "mitte" });
  // Wendung 1: Preise
  chip("PREISE + 32 %", v("wendung1:32", 0.1), v("wendung1:Annas", 0.1), "akzent", "voll", 490);
  chip("ANNAS 8,50 € = 11,23 € HEUTE", v("wendung1:8,50", 0.1), v("wendung2:Und", 0.2), "a", "voll", 490);
  // Wendung 2: Mai 2022
  chip("MAI 2022 · 9,82 € MINDESTLOHN", v("wendung2:Mai", 0.1), v("wendung2:9,82", 0.1), "b", "voll", 490);
  chip("= NUR 8,45 € VON 2015", v("wendung2:8,45", 0.1), v("wendung3:Dann", 0.2), "b", "voll", 490);
  chip("ANNA LIEGT VORN", v("wendung2:Anna", 0.1), v("wendung3:Dann", 0.2), "a", "hell", 590);
  // Wendung 3
  chip("OKT. 2022 · 12 €", v("wendung3:12", 0.1), v("wendung3:Lena", 0.4), "b", "voll", 490);
  chip("LENA ZIEHT VORBEI", v("wendung3:Lena", -0.1), v("wendung3:Und", 0.1), "b", "hell", 490);
  chip("HEUTE · 13,90 €", v("wendung3:13,90", 0.1), v("kipp:Jetzt", 0.2), "b", "voll", 490);
  // Kipp: Abgaben
  chip("ABGABEN · KASSE UND PFLEGE", v("kipp:Kasse", 0.1), v("kipp:Von", 0.1), "akzent", "voll", 490);
  chip("ANNA BEHÄLT 73 CENT JE EURO", v("kipp:73", 0.1), v("ergebnis:Endstand", 0.2), "a", "voll", 490);
  chip("LENA BEHÄLT 71 CENT JE EURO", v("kipp:71", 0.1), v("ergebnis:Endstand", 0.2), "b", "voll", 600);
  // Ergebnis, Warum, Pointe, Schlusskarte
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "JAHRESNETTO · HEUTIGE EURO", ein: tErg + 0.25, aus: v("warum:Warum", 0.1),
    zeilen: [{ label: "ANNA 2015", wert: Math.round(ANNA_NET), einheit: "€", team: "a", ein: T("ergebnis:Anna") }, { label: "LENA 2026", wert: Math.round(LENA_NET), einheit: "€", team: "b", ein: T("ergebnis:Lena") }],
    differenz: { label: "LENA HAT MEHR", wert: Math.round(Z.vorsprungNettoReal), einheit: "€", ein: T("ergebnis:3.480") - 0.1 } });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: tWarum + 0.3, aus: v("pointe:Und", 0.7), max: 7636,
    faktoren: [
      { label: "PLUS NOMINAL (KUPFER) · REAL (TÜRKIS)", ein: T("warum:Preise"), a: { wert: Math.round(Z.vorsprungNominal), text: `${de(Z.vorsprungNominal)} €` }, b: { wert: Math.round(Z.vorsprungNettoReal), text: `${de(Z.vorsprungNettoReal)} €` }, tag: `− ${de(Z.teuerungFrisst)} €`, tagEin: T("warum:4.156") },
      { label: "ABGABEN (SCHON IM NETTO)", ein: T("warum:Abgaben"), a: { wert: Math.round(Z.abgabenEffekt), text: `${Math.round(Z.abgabenEffekt / 100) * 100} €` }, b: { wert: 0, text: "" }, tag: "ZUSATZ", tagEin: T("warum:600") },
    ] });
  chip("ENDE OKTOBER · 17.118 €", v("pointe:Oktober", 0.1), v("schlusskarte:Vom", 0.2), "b", "voll", 490);
  chip("ANNAS GANZES JAHR", v("pointe:Annas", 0.1), v("schlusskarte:Vom", 0.2), "a", "hell", 590);
  M.titel({ woerter: [{ text: "2015", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "2026", ein: -0.3, team: "b" }, { umbruch: true }, { text: "MINDESTLOHN", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "WER KANN MEHR KAUFEN?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: T("regeln:Anna") + 0.6 });
  M.pointe({ woerter: [{ text: "VOM PLUS BLEIBT", ein: T("schlusskarte:Vom"), farbe: "akzent" }, { umbruch: true }, { text: "REAL KNAPP", ein: T("schlusskarte:real"), farbe: "akzent" }, { umbruch: true }, { text: "DIE HÄLFTE.", ein: T("schlusskarte:Hälfte"), farbe: "b" }], ein: T("schlusskarte:Vom"), y: 470, groesse: 88 });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (jede Zeile ist im Bild zu sehen) ----------
  const evs = [];
  const ev = (t, klang, text) => { evs.push(t); M.melde({ t, typ: "welt", klang, text }); };
  PA.forEach((k) => ev(T(k), "pop", "Annas Zylinder leuchtet, Lichtkegel pulsiert"));
  PL.forEach((k) => ev(T(k), "pop", "Lenas Zylinder leuchtet, Lichtkegel pulsiert"));
  PU.forEach((k) => ev(T(k), "klick", "Vorsprung-Röhrchen leuchtet, Kamera gleitet"));
  ev(0.4, "pop", "Zylinder leuchten auf, Kamera schiebt sich heran");
  ev(tFa0, "wachsen", "Annas Zylinder füllt sich"); ev(tFl0, "wachsen", "Lenas Zylinder füllt sich"); ev(tVa, "ding", "Vorsprung-Röhrchen füllt sich");
  ev(tP0, "whoosh", "Preise steigen: Annas Stand steigt, Funken"); ev(T("wendung1:11,23"), "ding", "Annas Stand 11,23 € heute");
  ev(tM0, "whoosh", "Mai 2022: Lenas Stand bricht ein, Funken"); ev(T("wendung2:8,45"), "ding", "Mindestlohn real nur 8,45 €, Anna vorn");
  ev(tO0, "whoosh", "Sprung auf 12 €: Lenas Stand steigt"); ev(T("wendung3:vorbei"), "ding", "Lena zieht vorbei, Zoom auf Lena"); ev(tH0, "wachsen", "Lena steigt auf 13,90 €");
  ev(tK0, "whoosh", "Abgaben: beide Zylinder sinken, Funken"); ev(T("kipp:73"), "ding", "Anna behält 73 Cent"); ev(T("kipp:71"), "ding", "Lena behält 71 Cent");
  ev(tErg, "whoosh", "Kamera zurück, Jahresnetto-Karte"); ev(T("ergebnis:3.480"), "ding", "Lena hat 3.480 € mehr, Zoom");
  ev(tWarum, "whoosh", "Erklärgrafik Warum"); ev(T("warum:4.156"), "ding", "Teuerung frisst 4.156 €");
  ev(tPo0, "whoosh", "Rückblende: Lenas Zylinder leert sich, Marker in Annas Höhe"); ev(tRf0, "wachsen", "Lenas Zylinder füllt sich Monat für Monat"); ev(T("pointe:Oktober"), "ding", "Ende Oktober: Lena erreicht Annas Jahr");
  ev(T("schlusskarte:Vom"), "akzent", "Welt dunkelt ab, Schlusskarte"); ev(T("schlusskarte:Hälfte"), "akzent", "Hälfte leuchtet");
  // Lücken schließen (Kamera fährt, Staub und Bläschen steigen im Lichtkegel)
  const sortiert = evs.slice().sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Bläschen steigen im Lichtkegel"); }
    last = nxt;
  }

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); };
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "wasser" });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
