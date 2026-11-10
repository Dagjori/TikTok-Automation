// „Rente 2010 oder 2026: gleiche 2.000 Euro, wer zahlt mehr Steuern?“ · Simulierbar · Stil 20 Glas & Licht (11.11.2026 mittag)
// Dunkles Labor: zwei Messzylinder (links Start 2010 in Türkis, rechts Start 2026 in Violett). Der Betrag, der besteuert wird, läuft als leuchtende
// Flüssigkeit durch die Abzugstreppe: Jahresrente → steuerpflichtiger Teil → nach Vorsorge und Pauschalen → über dem Grundfreibetrag → Steuer.
// Das Röhrchen in der Mitte zeigt den Unterschied. Alle Zahlen kommen aus pipeline/sim/rente_startjahr.mjs. Alles ist eine reine Funktion von t.
import * as THREE from "three";
import { SimBuehne, GRADING, rigLabor, lichtKegel, staub, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { glasGefaess, kaustik, laborBank, gegenlichtWand, laborZeit } from "../../engine/stil_lichtlabor.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, keyframes } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/rente_startjahr.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

const TUERKIS = "#22C6D6"; // Start 2010 (sie)
const VIOLETT = "#A06BFF"; // Start 2026 (er)
const ELFENBEIN = "#ECE6DA";
const Z = videoZahlen();
const J = Z.jahresrente;                                   // 24.508,95
const PFL_A = Z.pflA, PFL_B = Z.pflB;                      // 18.075,61 / 20.587,52
const ZVE_A = Z.zveA, ZVE_B = Z.zveB;                      // 14.910 / 17.422
const UEB_A = Z.ueberA, UEB_B = Z.ueberB;                  // 2.562 / 5.074
const EST_A = Z.estA, EST_B = Z.estB;                      // 418 / 945
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
      a: { name: "START 2010", farbe: TUERKIS, woerter: ["Rentenstart*", "2010*", "ihre*", "Ihr*", "sie*", "Sie*", "418*", "60*"] },
      b: { name: "START 2026", farbe: VIOLETT, woerter: ["heute*", "Heute*", "Er*", "ihm*", "945*", "16*", "74*"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);
  const R = (t, a, b, e = ease.inOutSine) => e(fortschritt(t, a, b));
  const puls = (t, t0, d = 0.7) => { const k = fortschritt(t, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const an = (t, a, b) => (t > a && t < b ? 1 : 0);

  // ---------- Zeitachse an gesprochenen Wörtern ----------
  const tF0 = 0.3, tF1 = T("regeln:Beide") + 1.4;                                   // beide füllen sich mit der Jahresrente
  const tAd0 = T("wendung1:2010") - 0.1, tAd1 = T("wendung1:steuerfrei.") + 0.2;   // A: nur noch der steuerpflichtige Teil
  const tBd0 = T("wendung1:Heute") - 0.1, tBd1 = T("wendung1:16") + 0.5;           // B ebenso
  const tVa = T("rennen:Dieser") + 0.6, tVb = T("rennen:Euro") + 0.3;               // Röhrchen: Unterschied 2.512 €
  const tAb0 = T("kipp:Jetzt") - 0.1, tAb1 = T("kipp:3.000") + 0.4;                 // Vorsorge und Pauschalen: beide sinken
  const tGf = T("kipp:Grundfreibetrag.") - 0.1;                                      // Linie bei 12.348 €
  const tDb0 = T("kipp:Er") - 0.15, tDb1 = T("kipp:5.000") + 0.3;                    // B: alles unter der Linie fällt weg
  const tDa0 = T("kipp:Sie") - 0.15, tDa1 = T("kipp:2.600") + 0.4;                   // A ebenso
  const tE0 = T("ergebnis:Sie") - 0.15, tEz = T("ergebnis:Sie") + 1.1;               // Vergrößerung auf die Steuer
  const tEa1 = T("ergebnis:418") + 0.5;
  const tEb0 = T("ergebnis:Er") - 0.15, tEb1 = T("ergebnis:945") + 0.5;
  const tErg = T("ergebnis:Sie"), tWarum = T("warum:Ihr");
  const tRz0 = T("wendung2:Seitdem") - 0.05, tRz1 = T("wendung2:gestiegen.") + 0.2;  // Rente 2010 → 2026
  const tPz0 = T("pointe:Weil"), tPz1 = T("pointe:74") + 0.3;                         // 60 % → 73,8 %
  const fillJ = (t) => J * R(t, tF0, tF1, ease.outCubic);

  const zustandRoh = (t) => {
    let A = fillJ(t), B = fillJ(t);
    A += (PFL_A - J) * R(t, tAd0, tAd1, ease.inOutCubic);
    B += (PFL_B - J) * R(t, tBd0, tBd1, ease.inOutCubic);
    A += (ZVE_A - PFL_A) * R(t, tAb0, tAb1, ease.inOutCubic);
    B += (ZVE_B - PFL_B) * R(t, tAb0, tAb1, ease.inOutCubic);
    B += (UEB_B - ZVE_B) * R(t, tDb0, tDb1, ease.inOutCubic);
    A += (UEB_A - ZVE_A) * R(t, tDa0, tDa1, ease.inOutCubic);
    A += (EST_A - UEB_A) * R(t, tE0, tEa1, ease.inOutCubic);
    B += (EST_B - UEB_B) * R(t, tEb0, tEb1, ease.inOutCubic);
    const visV = R(t, tVa, tVb);
    const vor = Math.abs(B - A) * visV;
    const lgT = lerp(Math.log(3500), Math.log(700), R(t, tE0, tEz));
    return {
      A, B, vor, maxTube: Math.exp(lgT),
      zA: an(t, tF0, tF1), zB: an(t, tF0, tF1),
      maxW: Math.exp(lerp(Math.log(30000), Math.log(1000), R(t, tE0, tEz, ease.inOutCubic))),
      skala: R(t, tE0, tEz, ease.inOutCubic),
    };
  };
  const zustand = M.wert(zustandRoh);

  // Lichtpulse an Wortzeiten (nie mehr als 2 s ohne neue Information)
  const PA = ["hook:Zweimal", "hook:2010", "regeln:Beide", "falle:Klar", "falle:gleiche", "wendung1:Finanzamt", "wendung1:2010", "rennen:Bei", "wendung2:Dabei", "wendung2:Sie", "wendung2:Seitdem", "wendung2:60", "kipp:Krankenversicherung", "kipp:Sie", "ergebnis:Sie", "ergebnis:418", "warum:Ihr", "pointe:Und", "pointe:60"];
  const PB = ["hook:Wer", "hook:heute?", "regeln:alleinstehend,", "falle:Oder", "wendung1:Startjahr", "wendung1:Heute", "wendung1:16", "rennen:Bei#2", "rennen:3.900", "kipp:Jetzt", "kipp:Er", "ergebnis:Er", "ergebnis:945", "warum:kostet", "pointe:Erhöhung", "pointe:74"];
  const PU = ["hook:Steuern:", "regeln:Gerechnet", "falle:doch", "wendung1:blieben", "rennen:festgeschrieben.", "wendung2:Stimmt", "kipp:Dann", "kipp:Grundfreibetrag.", "ergebnis:527", "warum:Euro", "pointe:Weil"];
  const tPA = PA.map((k) => T(k)), tPB = PB.map((k) => T(k)), tPU = PU.map((k) => T(k));
  const summe = (liste, t, d = 0.8) => liste.reduce((a, p) => a + puls(t, p, d), 0);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#040507");
  const XA = -1.02, XB = 1.02;
  const lab = rigLabor(szene, buehne.renderer, { umgebungsStaerke: 0.55, schatten: SCHATTEN > 0 ? 1024 : 0, spots: [{ pos: [XA, 7, 0.4], staerke: 18, winkel: 0.2 }, { pos: [XB, 7, 0.4], staerke: 18, winkel: 0.2 }] });
  szene.add(laborBank({ breite: 18, tiefe: 7, spiegel: 0.2 }));
  const wand = gegenlichtWand({ farbe: "#1A2334", staerke: 1.0 }); wand.position.set(0, 4, -6); szene.add(wand);
  const SKALEN = [{ max: 30000, teilung: 2500, beschriftung: 5000 }, { max: 1000, teilung: 100, beschriftung: 200 }];
  const HOEHE = 3.1;
  const gA = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: TUERKIS, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 1 });
  const gB = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: VIOLETT, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 2 });
  gA.position.x = XA; gB.position.x = XB;
  gA.skalaMeshes.forEach((m) => { m.rotation.y = 0.32; }); gB.skalaMeshes.forEach((m) => { m.rotation.y = -0.32; });
  const gU = glasGefaess({ hoehe: 2.2, radius: 0.15, wand: 0.03, boden: 0.1, farbe: ELFENBEIN, ohneSkala: true, blasen: 30, seed: 3 });
  gU.position.set(0, 0, 0.1);
  szene.add(gA, gB, gU);
  const kA = kaustik({ radius: 1.0, farbe: TUERKIS, staerke: 0.9 }), kB = kaustik({ radius: 1.0, farbe: VIOLETT, staerke: 0.9 }), kU = kaustik({ radius: 0.55, farbe: ELFENBEIN, staerke: 0.6 });
  kA.position.set(XA + 0.25, 0.004, 0.5); kB.position.set(XB - 0.25, 0.004, 0.5); kU.position.set(0.1, 0.004, 0.7);
  szene.add(kA, kB, kU);
  for (const x of [XA, XB]) {
    const k = lichtKegel({ hoehe: 7, radiusOben: 0.08, radiusUnten: 1.3, farbe: "#E8F0FF", staerke: 0.07, weich: 1.3, streifen: 0.5 });
    k.position.set(x, 7, 0.4); szene.add(k);
  }
  szene.add(staub({ anzahl: 420, bereich: [5.5, 6, 3], mitte: [0, 3.2, 0.4], farbe: "#DCE6FF", groesse: 0.01, staerke: 1.4, aussen: 0.15 }));
  const ringMat = (f) => leuchtMat(f, 1, { neu: true });
  const rA = ringMat(TUERKIS), rB = ringMat(VIOLETT), rU = ringMat(ELFENBEIN);
  const ring = (mat, x, r, z = 0) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 72), mat); m.rotation.x = Math.PI / 2; m.position.set(x, 0.012, z); m.userData.dynamisch = true; szene.add(m); return m; };
  ring(rA, XA, 0.56); ring(rB, XB, 0.56); ring(rU, 0, 0.22, 0.1);
  // Grundfreibetrag-Linie: weißer Ring auf beiden Zylindern in der Höhe von 12.348 € (Skala 30.000)
  const glMat = ringMat(ELFENBEIN);
  const gRing = (x) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 8, 72), glMat); m.rotation.x = Math.PI / 2; m.userData.dynamisch = true; m.visible = false; m.position.set(x, gA.fluessigHoehe(12348, 30000), 0); szene.add(m); return m; };
  const gl1 = gRing(XA), gl2 = gRing(XB);
  const fFrei = funken({ n: 70, farbe: ELFENBEIN, seed: 5, radius: 0.3 });
  const fFreiB = funken({ n: 70, farbe: VIOLETT, seed: 6, radius: 0.3 });
  const fAbz = funken({ n: 80, farbe: TUERKIS, seed: 9, radius: 0.3, groesse: 6 });
  const fAbzB = funken({ n: 80, farbe: VIOLETT, seed: 12, radius: 0.3, groesse: 6 });
  const fGrA = funken({ n: 70, farbe: ELFENBEIN, seed: 7, radius: 0.3 });
  const fGrB = funken({ n: 70, farbe: ELFENBEIN, seed: 8, radius: 0.3 });
  szene.add(fFrei, fFreiB, fAbz, fAbzB, fGrA, fGrB);
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(1.0, 3.5, 17.8, 0, 2.4, 0) },
    { t: T("hook:2010"), v: C(-0.6, 3.4, 17.0, -0.5, 2.3, 0), e: ease.inOutSine },
    { t: T("hook:heute?"), v: C(0.6, 3.4, 17.0, 0.5, 2.3, 0), e: ease.inOutSine },
    { t: T("regeln:Beide"), v: C(0.0, 3.7, 18.8, 0, 2.5, 0), e: ease.inOutSine },
    { t: T("regeln:Gerechnet"), v: C(-0.5, 3.4, 16.8, -0.4, 2.4, 0), e: ease.inOutCubic },
    { t: T("falle:Klar") - 0.1, v: C(0.5, 3.2, 16.0, 0.45, 2.3, 0, 29), e: ease.inOutCubic },
    { t: T("falle:Oder") - 0.5, v: C(0.0, 3.7, 18.6, 0, 2.5, 0, 29), e: ease.inOutCubic },
    { t: T("wendung1:Finanzamt"), v: C(-0.7, 3.3, 16.6, -0.5, 2.2, 0), e: ease.inOutCubic },
    { t: T("wendung1:Heute") - 0.1, v: C(0.7, 3.3, 16.6, 0.5, 2.2, 0), e: ease.inOutCubic },
    { t: T("rennen:Dieser"), v: C(0.0, 3.8, 18.6, 0, 2.5, 0.1), e: ease.inOutCubic },
    { t: T("rennen:Bei") - 0.1, v: C(-0.8, 3.4, 16.6, -0.6, 2.4, 0), e: ease.inOutCubic },
    { t: T("rennen:Bei#2") - 0.1, v: C(0.8, 3.4, 16.6, 0.6, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung2:Dabei") - 0.1, v: C(-0.6, 3.5, 17.0, -0.4, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung2:Stimmt") - 0.2, v: C(0.0, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("kipp:Jetzt"), v: C(0.0, 3.6, 18.2, 0, 2.5, 0), e: ease.inOutCubic },
    { t: T("kipp:Dann"), v: C(0.0, 3.2, 16.0, 0, 2.2, 0, 28), e: ease.inOutCubic },
    { t: T("kipp:Er"), v: C(0.7, 3.3, 16.4, 0.5, 2.3, 0), e: ease.inOutCubic },
    { t: T("kipp:Sie") - 0.1, v: C(-0.7, 3.3, 16.4, -0.5, 2.3, 0), e: ease.inOutCubic },
    { t: tErg - 0.3, v: C(0.0, 3.9, 19.2, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("ergebnis:Er") - 0.1, v: C(0.5, 3.4, 16.6, 0.4, 2.2, 0), e: ease.inOutCubic },
    { t: T("ergebnis:527") - 0.3, v: C(0.0, 3.8, 18.2, 0, 2.5, 0.1), e: ease.inOutCubic },
    { t: tWarum, v: C(0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: T("warum:kostet") - 0.2, v: C(-0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: T("pointe:Und") - 0.1, v: C(0.4, 3.5, 17.2, 0.3, 2.3, 0), e: ease.inOutCubic },
    { t: T("pointe:74"), v: C(-0.3, 3.2, 15.6, -0.4, 2.1, 0), e: ease.inOutCubic },
    { t: T("schluss:Gleiche") - 0.2, v: C(0.0, 3.8, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: DAUER, v: C(0.0, 3.9, 19.8, 0, 2.6, 0), e: ease.inOutSine },
  ];
  const regie = new Regie(kamera, (t) => { const v = keyframes(camKeys, t); return { pos: v.slice(0, 3), ziel: v.slice(3, 6), fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.008, tempo: 0.25 });
  regie.zoom({ t: T("wendung1:steuerfrei."), ziel: [XA, 2.0, 0.1], staerke: 0.13, halt: 1.0, rueck: 0.8 });
  regie.zoom({ t: T("kipp:Grundfreibetrag."), ziel: [0, 2.0, 0.1], staerke: 0.14, halt: 1.1, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:527"), ziel: [0, 1.7, 0.1], staerke: 0.12, halt: 1.1, rueck: 0.8 });

  const post = { ...GRADING.labor, strahlen: 0.35, strahlenQuelle: [0.5, 0.98], strahlenSchwelle: 1.2, strahlenLaenge: 0.6 };
  const cA = new THREE.Color(TUERKIS), cB = new THREE.Color(VIOLETT), cE = new THREE.Color(ELFENBEIN);
  const welt = { szene, kamera, post, update: null };
  welt.update = (t) => {
    const s = zustand(t);
    laborZeit(t);
    gA.setze({ wert: s.A, t, zulauf: !!s.zA, zulauf2: !!s.zA, maxWert: s.maxW, skala: s.skala });
    gB.setze({ wert: s.B, t, zulauf: !!s.zB, zulauf2: !!s.zB, maxWert: s.maxW, skala: s.skala });
    gU.setze({ wert: s.vor, t, zulauf: false, maxWert: s.maxTube });
    const pA = summe(tPA, t), pB = summe(tPB, t), pU = summe(tPU, t, 0.9);
    const spann = fortschritt(t, tAd0, tE0);
    lab.spots[0].intensity = 18 * (1 + 0.55 * Math.min(1.6, pA) + 0.25 * spann);
    lab.spots[1].intensity = 18 * (1 + 0.55 * Math.min(1.6, pB) + 0.25 * spann);
    rA.color.copy(cA).multiplyScalar(1.4 + 2.6 * Math.min(1.5, pA));
    rB.color.copy(cB).multiplyScalar(1.4 + 2.6 * Math.min(1.5, pB));
    rU.color.copy(cE).multiplyScalar(1.0 + 2.8 * Math.min(1.5, pU));
    post.bloomStaerke = GRADING.labor.bloomStaerke * (1 + 0.3 * spann + 0.35 * puls(t, T("ergebnis:527"), 1.6) + 0.3 * puls(t, T("kipp:Grundfreibetrag."), 1.4));
    // Grundfreibetrag-Linie (auf der Skala 0–30.000, bis die Vergrößerung beginnt)
    const glk = fortschritt(t, tGf, tGf + 0.5) * (1 - fortschritt(t, tDa1, tDa1 + 0.6));
    glMat.color.copy(cE).multiplyScalar(2.4 * glk); gl1.visible = gl2.visible = glk > 0.02;
    // Funken: Freibetrag, Abzüge, alles unter der Linie
    fFrei.setze(clamp((t - tAd0) / 2.4), [XA, gA.fluessigHoehe(Math.max(s.A, 0), s.maxW), 0.1], [0, 1.2, 0.2]);
    fFreiB.setze(clamp((t - tBd0) / 2.4), [XB, gB.fluessigHoehe(Math.max(s.B, 0), s.maxW), 0.1], [0, 1.2, 0.2]);
    fAbz.setze(clamp((t - tAb0) / 2.6), [XA, gA.fluessigHoehe(s.A, s.maxW), 0.1], [0, 1.1, 0.2]);
    fAbzB.setze(clamp((t - tAb0) / 2.6), [XB, gB.fluessigHoehe(s.B, s.maxW), 0.1], [0, 1.1, 0.2]);
    fGrB.setze(clamp((t - tDb0) / 2.4), [XB, gB.fluessigHoehe(Math.max(s.B, 0), s.maxW), 0.1], [0, 1.0, 0.2]);
    fGrA.setze(clamp((t - tDa0) / 2.4), [XA, gA.fluessigHoehe(Math.max(s.A, 0), s.maxW), 0.1], [0, 1.0, 0.2]);
    aktualisiere(t);
    regie.anwenden(t);
    Object.assign(post, fokus(kamera, [0, 1.5, 0.1], { tiefe: 0.22, nah: 0.5, fern: 0.75 }));
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "hoch",
    werte: (t) => { const s = zustandRoh(t); return { a: s.A, b: s.B }; },
    uhr: { ein: T("regeln:Gerechnet") - 0.05, zeit: () => 2026, format: () => "2026", label: "STEUERJAHR" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 || Math.abs(w.a - w.b) < 1 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "voll", y = 490) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.12) => T(x) - d;
  // Statuszeile (wechselt je Stufe)
  chip("2.000 € RENTE IM MONAT", 0.05, v("wendung1:Finanzamt", 0.5), "akzent", "hell", 372);
  chip("STUFE 1 · STEUERPFLICHTIGER TEIL", v("wendung1:Finanzamt", 0.05), v("kipp:Jetzt", 0.5), "akzent", "voll", 372);
  chip("STUFE 2 · ABZÜGE", v("kipp:Jetzt", 0.05), v("kipp:Dann", 0.3), "akzent", "voll", 372);
  chip("STUFE 3 · ÜBER DEM GRUNDFREIBETRAG", v("kipp:Dann", 0.05), v("ergebnis:Sie", 0.3), "akzent", "voll", 372);
  chip("STUFE 4 · EINKOMMENSTEUER · 30× GRÖSSER", v("ergebnis:Sie", 0.05), v("warum:Ihr", 0.2), "akzent", "voll", 372);
  // Regeln
  chip("BEIDE ALLEINSTEHEND", v("regeln:alleinstehend,", 0.1), v("falle:Klar", 0.1), "akzent", "hell", 490);
  chip("NUR GESETZLICHE RENTE", v("regeln:ohne", 0.1), v("falle:Klar", 0.1), "akzent", "hell", 600);
  chip("STEUERJAHR 2026", v("regeln:Steuerjahr", 0.1), v("falle:Klar", 0.1), "akzent", "hell", 710);
  chip("GLEICHE RENTE · GLEICHE STEUER?", v("falle:Klar", 0.0), v("falle:Oder", 0.0), "akzent", "voll", 490);
  // Wendung 1: Startjahr und steuerfreier Anteil
  chip("START 2010 · 40 % STEUERFREI", v("wendung1:40", 0.15), v("rennen:Dieser", 0.1), "a", "voll", 490);
  chip("START 2026 · 16 % STEUERFREI", v("wendung1:16", 0.15), v("rennen:Dieser", 0.1), "b", "voll", 600);
  // Rennen: in Euro festgeschrieben
  chip("EINMAL FEST IN EURO", v("rennen:Dieser", 0.05), v("rennen:Bei", 0.2), "akzent", "voll", 490);
  chip("SIE · 6.433 € STEUERFREI", v("rennen:Bei", 0.1), v("wendung2:Dabei", 0.2), "a", "voll", 490);
  chip("ER · 3.921 € STEUERFREI", v("rennen:Bei#2", 0.1), v("wendung2:Dabei", 0.2), "b", "voll", 600);
  const vorB = (t) => zustandRoh(t).vor;
  M.zaehler({ wert: vorB, einheit: " €", nk: 0, max: 99999, team: "b", art: "voll", label: "ER VERSTEUERT MEHR", x: SICHER.mitte, y: 790, ein: v("rennen:Euro", 0.2), aus: v("ergebnis:Sie", 0.35), anker: "mitte" });
  // Wendung 2: Rente 2010 gegen heute, die zweite Frage
  M.zaehler({ wert: (t) => Z.monat2010A + (2000 - Z.monat2010A) * R(t, tRz0, tRz1, ease.inOutCubic), einheit: " €", nk: 0, max: 99999, team: "a", art: "voll", label: "IHRE RENTE · MONAT", x: SICHER.mitte, y: 900, ein: v("wendung2:Dabei", 0.1), aus: v("kipp:Jetzt", 0.3), anker: "mitte" });
  chip("2010 · 1.334 € IM MONAT", v("wendung2:1.300", 0.1), v("wendung2:Seitdem", 0.1), "a", "voll", 490);
  chip("SEITDEM + 50 % · HEUTE 2.000 €", v("wendung2:Seitdem", 0.1), v("wendung2:Auf", 0.1), "a", "voll", 490);
  chip("BESCHEID · 60 % STEUERPFLICHTIG", v("wendung2:Bescheid", 0.15), v("kipp:Jetzt", 0.3), "a", "voll", 490);
  chip("STIMMT DAS HEUTE NOCH?", v("wendung2:Stimmt", 0.1), v("kipp:Jetzt", 0.3), "akzent", "hell", 600);
  // Kipp-Moment: Abzüge und Grundfreibetrag
  chip("KRANKEN- UND PFLEGEVERSICHERUNG · 3.027 €", v("kipp:Krankenversicherung", 0.1), v("kipp:Dann", 0.15), "akzent", "voll", 490);
  chip("GRUNDFREIBETRAG · 12.348 €", v("kipp:Grundfreibetrag.", 0.25), v("ergebnis:Sie", 0.3), "akzent", "voll", 490);
  chip("ER · 5.074 € DARÜBER", v("kipp:5.000", 0.1), v("ergebnis:Sie", 0.3), "b", "voll", 600);
  chip("SIE · 2.562 € DARÜBER", v("kipp:2.600", 0.1), v("ergebnis:Sie", 0.3), "a", "voll", 710);
  // Ergebnis, Warum, Pointe, Schlusskarte
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 470, titel: "EINKOMMENSTEUER 2026", ein: tErg + 0.35, aus: v("warum:Ihr", 0.1),
    zeilen: [{ label: "SIE · START 2010", wert: EST_A, einheit: "€", team: "a", ein: T("ergebnis:418") }, { label: "ER · START 2026", wert: EST_B, einheit: "€", team: "b", ein: T("ergebnis:945") }],
    differenz: { label: "ER ZAHLT MEHR", wert: Z.diffJahr, einheit: "€", ein: T("ergebnis:527") - 0.1 } });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 440, titel: "WARUM?", ein: tWarum + 0.3, aus: v("pointe:Und", 0.7), max: 6433,
    faktoren: [
      { label: "STEUERFREI FEST IN €", ein: T("warum:Freibetrag"), a: { wert: Math.round(Z.freiA), text: de(Z.freiA) }, b: { wert: Math.round(Z.freiB), text: de(Z.freiB) }, tag: "SIE +2.512", tagEin: T("warum:größer.") },
      { label: "SATZ AUF DEN LETZTEN EURO", ein: T("warum:Euro"), a: { wert: Math.round(Z.grenzA * 20000), text: `${(Z.grenzA * 100).toFixed(1).replace(".", ",")} %` }, b: { wert: Math.round(Z.grenzB * 20000), text: `${(Z.grenzB * 100).toFixed(1).replace(".", ",")} %` }, tag: "PROGRESSION", tagEin: T("warum:kostet") },
    ] });
  M.zaehler({ wert: (t) => 60 + (Z.anteilA * 100 - 60) * R(t, tPz0, tPz1, ease.inOutCubic), einheit: " %", nk: 1, max: 99999, team: "a", art: "voll", label: "SIE · STEUERPFLICHTIG", x: SICHER.mitte, y: 790, ein: v("pointe:Und", 0.1), aus: v("schluss:Gleiche", 0.2), anker: "mitte" });
  chip("JEDE ERHÖHUNG VOLL STEUERPFLICHTIG", v("pointe:Weil", 0.1), v("schluss:Gleiche", 0.2), "akzent", "voll", 490);
  chip("BESCHEID VON 2010 · 60 %", v("pointe:Und", 0.1), v("pointe:Weil", 0.1), "a", "hell", 490);
  M.titel({ woerter: [{ text: "RENTE", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "2010", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "2026", ein: -0.3, team: "b" }, { umbruch: true }, { text: "WER ZAHLT MEHR STEUERN?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: T("regeln:Beide") + 0.6 });
  M.pointe({ woerter: [{ text: "GLEICHE RENTE.", ein: T("schluss:Gleiche"), farbe: "akzent" }, { umbruch: true }, { text: "DAS STARTJAHR", ein: T("schluss:Startjahr"), farbe: "akzent" }, { umbruch: true }, { text: "ENTSCHEIDET.", ein: T("schluss:entscheidet."), farbe: "b" }], ein: T("schluss:Gleiche"), y: 470, groesse: 88 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (jede Zeile ist im Bild zu sehen) ----------
  const evs = [];
  const ev = (t, klang, text) => { evs.push(t); M.melde({ t, typ: "welt", klang, text }); };
  PA.forEach((k) => ev(T(k), "pop", "Zylinder links leuchtet, Lichtkegel pulsiert"));
  PB.forEach((k) => ev(T(k), "pop", "Zylinder rechts leuchtet, Lichtkegel pulsiert"));
  PU.forEach((k) => ev(T(k), "klick", "Röhrchen leuchtet, Kamera gleitet"));
  ev(0.4, "pop", "Zylinder leuchten auf, Kamera schiebt sich heran");
  ev(tF0, "wachsen", "beide Zylinder füllen sich mit der Jahresrente");
  ev(tAd0, "whoosh", "Freibetrag fällt weg: linker Zylinder sinkt, Funken"); ev(tBd0, "whoosh", "rechter Zylinder sinkt weniger, Funken");
  ev(tVa, "ding", "Röhrchen füllt sich: Unterschied 2.512 €");
  ev(tRz0, "wachsen", "Rente von 2010 steigt auf 2.000 €");
  ev(tAb0, "whoosh", "Abzüge: beide sinken, Funken"); ev(tGf, "ding", "Grundfreibetrag-Linie leuchtet auf, Zoom");
  ev(tDb0, "whoosh", "alles unter der Linie fällt weg (rechts)"); ev(tDa0, "whoosh", "alles unter der Linie fällt weg (links)");
  ev(tE0, "whoosh", "Vergrößerung 30×: Skala wechselt, Bilanz"); ev(T("ergebnis:527"), "ding", "Unterschied 527 €, Zoom");
  ev(tWarum, "whoosh", "Erklärgrafik Warum"); ev(T("warum:größer."), "ding", "Freibetrag +2.512 € bei ihr");
  ev(tPz0, "wachsen", "Anteil steuerpflichtig steigt von 60 % auf 73,8 %"); ev(T("pointe:74"), "ding", "fast 74 Prozent");
  ev(T("schluss:Gleiche"), "akzent", "Welt dunkelt ab, Schlusskarte"); ev(T("schluss:entscheidet."), "akzent", "Startjahr leuchtet");
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
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "raum" });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
