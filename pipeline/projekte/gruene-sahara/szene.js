// Account 2 @stelldirvor.pov – „Was wäre, wenn du 16.000 Jahre auf einer Sahara-Düne stehst?“ (Skript acc2-2026-11-04-abend)
// Afrikanische Feuchtzeit am Nordrand des Tschadbeckens. Grundwelt engine/welt_wueste_see.js (Erstbau 04.11.2026).
// Zeitachse = Jahre vor heute (sim/gruene_sahara.mjs: jvh(t), seeflaeche(t)). Eine durchgehende Einstellung: Sonnenaufgang auf dem Dünenkamm,
// Wolken und Monsun (14–30 s), Fahrt die Düne hinab, während das Becken vollläuft (20–34 s), Regenbogen über dem See (32,5 s), Schwenk über
// Flusspferde, Giraffen, Menschen am Felsbild (34–48 s), Zoom auf den schrumpfenden See (49–57 s), Staubwand bei Sonnenuntergang = HIER (60 s).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Glut, Puffs, Partikel, Voegel, Menschen, PovKamera, farbPhasen, Protokoll, wolkenFeld, staubWand, blitzKurve } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { WuesteSee, hoehe, FELS, PEGEL_MAX, PEGEL_MIN } from "../../engine/welt_wueste_see.js";
import { jvh, seeflaeche, deutschlandUeberschritten } from "../../sim/gruene_sahara.mjs";

const FPS = 30, DAUER = 80, T_HIER = 60;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const D2R = Math.PI / 180, L = ease.inOutSine;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
const T_DE = deutschlandUeberschritten();
const BLITZE = [16.8, 21.6, 25.4, 28.8];

const POS = [{ t: 0, v: [0, 13.6, 2] }, { t: 20, v: [0, 13.6, 2] }, { t: 34, v: [0, hoehe(0, -30) + 1.6, -30], e: L }];
const BLICK = [{ t: 0, v: [-10, -4] }, { t: 9, v: [-5, -3] }, { t: 19, v: [0, -1] }, { t: 26, v: [2, -7], e: L }, { t: 34, v: [5, -9], e: L }, { t: 37.5, v: [8, -10], e: L },
  { t: 41, v: [1, -3], e: L }, { t: 45, v: [-13, -9], e: L }, { t: 48.5, v: [-4, -6], e: L }, { t: 55, v: [0, -5], e: L }, { t: 58.5, v: [0, -1], e: L },
  { t: 61.5, v: [-9, -8], e: L }, { t: 70, v: [-11, -8], e: L }];
const FOV = [{ t: 0, v: 60 }, { t: 48.5, v: 60 }, { t: 56, v: 46, e: L }, { t: 58.5, v: 54, e: L }, { t: 62, v: 58, e: L }, { t: 70, v: 58 }];

async function start() {
  aktiviereHoehenNebel({ abfall: 0.003, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#D8C4A4", 1.1e-4);
  const kam = new THREE.PerspectiveCamera(60, 1080 / 1920, 0.1, 30000);
  const welt0 = new WuesteSee(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#6F87AE", horizont: "#E8C9A0", sonnenRichtung: richtung(-75, 2), sonnenStaerke: 26, glanz: 0.7, zirren: 0.2 });
  const augeBei = (t) => keyframes(POS, t);
  const zielBei = (t) => { const [y, p] = keyframes(BLICK, t), d = richtung(y, p), a = augeBei(t); return [a[0] + d[0] * 100, a[1] + d[1] * 100, a[2] + d[2] * 100]; };
  const pov = new PovKamera(kam, { pos: augeBei(0), ziel: zielBei(0), fov: 60 }).atmen({ staerke: 1 })
    .beben({ von: 57.5, bis: 60.5, staerke: 0.08, frequenz: 4, anstieg: 2, abkling: 1 }).stoss({ t: T_HIER, staerke: 0.6, abkling: 1.4 });

  const hemi = new THREE.HemisphereLight("#BCD0E8", "#9A7A54", 0.9);
  const sonne = new THREE.DirectionalLight("#FFE8C8", 2.6);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 500 });
  sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.05;
  szene.add(hemi, sonne, sonne.target);
  const blitzGlut = new Glut(szene, { farbe: "#E8EEFF", staerke: 0, groesse: 160 });
  const puffs = new Puffs(szene, { max: 900, schatten: 0.4 });
  const regen = new Partikel(szene, { art: "regen", anzahl: 2200, box: [40, 24, 40], seed: 5 });
  const sandP = new Partikel(szene, { art: "staub", anzahl: 1800, box: [30, 8, 30], seed: 6, groesse: 0.03, farbe: "#D8A870" });
  const staubP = new Partikel(szene, { art: "staub", anzahl: 2600, box: [40, 18, 40], seed: 7, groesse: 0.06, farbe: "#C08A58" });
  const menschen = new Menschen(szene, { anzahl: 5, seed: 81, kleidung: ["#8A6A4A", "#C8B090", "#6A4A3A", "#A08060"], haut: ["#6B4330", "#8D5A3E"] });
  menschen.verteile({ anzahl: 5, punkte: [[FELS[0] - 2.6, FELS[1] + 0.6], [FELS[0] + 2.5, FELS[1] + 0.9], [FELS[0] + 1.2, FELS[1] + 2.6], [FELS[0] - 1.4, FELS[1] + 2.4], [FELS[0] + 3.6, FELS[1] - 0.6]], boden: (x, z) => hoehe(x, z), gehen: 0.2, tempo: [0.3, 0.6], weg: [0.5, 1.5] });
  const raben = new Voegel(szene, { anzahl: 6, seed: 91, farbe: "#1A1A1C", spannweite: 0.9 }).schwarm({ zentrum: [-10, 30, -60], radius: 25, hoehe: 6, tempo: 7, anzahl: 6 });
  const seevoegel = new Voegel(szene, { anzahl: 30, seed: 92, farbe: "#E8E4DC", spannweite: 1.2 }).schwarm({ zentrum: [6, 12, -70], radius: 22, hoehe: 5, tempo: 8, anzahl: 30 }).flucht({ t0: 49.5, richtung: [0.3, 0.4, -1], tempo: 16 });
  const sterne = (() => { const n = 900, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i, 1) * 6.283, z = 0.05 + 0.95 * hash(i, 2), r = Math.sqrt(1 - z * z); p.set([Math.cos(a) * r * 8000, z * 8000, Math.sin(a) * r * 8000], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: "#FFFFFF", size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const o = new THREE.Points(g, m); o.renderOrder = -900; szene.add(o); return o; })();
  // Regenbogen über dem See (32,5–37 s)
  const bogen = (() => { const g = new THREE.RingGeometry(1300, 1420, 96, 1, 0, Math.PI); const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { a: { value: 0 } }, vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform float a; varying vec2 vP; vec3 sp(float x){ return clamp(vec3(abs(x*6.0-3.0)-1.0, 2.0-abs(x*6.0-2.0), 2.0-abs(x*6.0-4.0)),0.0,1.0); } void main(){ float r=(length(vP)-1300.0)/120.0; float k=sin(r*3.14159); gl_FragColor=vec4(sp(1.0-r)*k*a*0.45, 1.0); }" });
    const o = new THREE.Mesh(g, m); o.position.set(150, -160, -2600); szene.add(o); return o; })();
  // Wolkenfelder: Monsunwolken türmen sich im Süden
  const wolkenH = wolkenFeld({ anzahl: 14, bereich: { x: [-3000, 3000], z: [-4200, -1600] }, hoehe: [700, 1100], groesse: 240, farbe: "#F4EEE6", a: 0.9, wind: [10, 4], seed: 3 });
  const wolkenN = wolkenFeld({ anzahl: 10, bereich: { x: [-2200, 2200], z: [-2200, -700] }, hoehe: [600, 900], groesse: 200, farbe: "#F0F0EE", a: 0.9, wind: [14, 8], seed: 4 });
  const staubwand = staubWand({ ziel: [0, -30], boden: -6, richtung: [0, 1], start: 2400, t0: 54.5, ankunft: 60.2, breite: 5200, hoehe: 240, anzahl: 300, farbe: "#C8925C", farbeSchatten: "#6A4430", seed: 29 });

  // ---------------------------------------------------------------- Zustände
  const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || L })), t);
  const pegel = K([[0, PEGEL_MIN], [20, PEGEL_MIN], [24, -17], [29, -9], [34, PEGEL_MAX], [48.5, PEGEL_MAX], [52, -6], [55, -11], [58, PEGEL_MIN - 1]]);
  const gruen = K([[0, 0], [19.5, 0], [23, 0.35], [28, 0.8], [33, 1], [49, 1], [53, 0.7], [57, 0.05], [60, 0]]);
  const gelb = K([[0, 0.6], [20, 0.5], [26, 0], [44, 0], [47, 0.35], [52, 0.8], [56, 1]]);
  const nass = K([[0, 0], [16.5, 0], [19, 0.8], [30, 0.6], [34, 0.2], [40, 0]]);
  const weiss = K([[0, 0], [48.5, 0], [53, 0.7], [57, 1]]);
  const sandZ = K([[0, 999], [52.5, 999], [53, 40], [58, -150], [60, -200]]);
  const sturm = K([[0, 0], [11, 0], [15, 0.45], [18, 1], [27, 1], [31, 0.4], [34, 0.15], [40, 0.2], [46, 0.1], [50, 0], [80, 0]]);
  const wind = K([[0, 0.5], [16, 0.8], [20, 1], [30, 0.6], [44, 0.5], [54, 0.8], [58, 1.4], [61, 1.6], [66, 0.8], [70, 0.6]]);
  const blitz = (t) => Math.max(...BLITZE.map((b) => blitzKurve(t, b, { anstieg: 0.04, halten: 0.08, abkling: 0.5 })));
  const farbe = (keys) => { const Cs = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(Cs[0][1]); for (let i = 1; i < Cs.length; i++) { if (t <= Cs[i][0]) { const p = L(clamp((t - Cs[i - 1][0]) / (Cs[i][0] - Cs[i - 1][0]))); return o.copy(Cs[i - 1][1]).lerp(Cs[i][1], p); } o.copy(Cs[i][1]); } return o; }; };
  const zenit = farbe([[0, "#3C4E7A"], [5, "#5A72A0"], [10, "#6E8CBE"], [14, "#7894C2"], [18, "#4A5466"], [27, "#55606E"], [32, "#7A92B4"], [38, "#7290BC"], [47, "#6E84AE"], [54, "#6E6C80"], [59, "#6A5A60"], [62, "#4A3E46"], [66, "#1E2236"], [70, "#121628"]]);
  const horizont = farbe([[0, "#E8A470"], [5, "#F0C090"], [10, "#E8D6BC"], [14, "#E8DCC8"], [18, "#9C9890"], [27, "#A8A49A"], [32, "#D8D6CC"], [38, "#E8D2AA"], [47, "#EAC89A"], [54, "#E8A870"], [59, "#E08A50"], [62, "#9A5A3A"], [66, "#4A3036"], [70, "#26202A"]]);
  const sonnenF = farbe([[0, "#FFA860"], [6, "#FFD8A8"], [12, "#FFF4E4"], [34, "#FFF4E4"], [40, "#FFE0B0"], [50, "#FFD8A0"], [55, "#FFB070"], [59, "#FF9050"], [63, "#E06A3A"]]);
  const sonnenR = (t) => { const k = [[0, [-62, 1.5]], [8, [-58, 14]], [14, [-30, 58]], [34, [8, 62]], [40, [38, 30]], [48, [30, 20]], [54, [16, 9]], [59, [8, 2.5]], [63, [6, -1.5]], [70, [5, -8]]];
    const [y, p] = keyframes(k.map(([tt, v]) => ({ t: tt, v, e: L })), t); return richtung(y, p); };
  const lichtS = K([[0, 1.2], [6, 2.4], [12, 3.0], [16, 2.4], [18, 1.0], [27, 1.1], [31, 2.4], [40, 2.8], [50, 2.6], [55, 2.0], [58.5, 1.2], [60.5, 0.5], [64, 0.35], [70, 0.2]]);
  const hemiS = K([[0, 0.6], [6, 0.9], [18, 0.75], [30, 0.9], [55, 0.85], [60.3, 0.7], [64, 0.45], [70, 0.32]]);
  const nebelD = K([[0, 1.0e-4], [16, 1.5e-4], [20, 2.4e-4], [28, 2.0e-4], [33, 0.8e-4], [48, 0.9e-4], [54, 1.6e-4], [58, 3.5e-4], [60.4, 1.4e-3], [63, 7e-4], [70, 4e-4]]);
  const wasserF = farbe([[0, "#2C5A62"], [30, "#3A6466"], [36, "#2E6068"], [48, "#305E62"], [52, "#5A6A5A"]]);
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 0.95, saettigung: 0.95, kontrast: 1.06, tonung: [1.12, 0.96, 0.84], tonungStaerke: 0.4, bloomStaerke: 1.2 } },
    { t: 8, werte: { belichtung: 1.02, saettigung: 0.92, kontrast: 1.04, tonung: [1.06, 1.0, 0.92], tonungStaerke: 0.25, bloomStaerke: 1.0 } },
    { t: 13, werte: { belichtung: 1.08, saettigung: 0.82, kontrast: 1.0, tonung: [1.04, 1.0, 0.94], tonungStaerke: 0.2, bloomStaerke: 1.0 } },
    { t: 18, werte: { belichtung: 0.92, saettigung: 0.8, kontrast: 1.04, tonung: [0.94, 0.98, 1.06], tonungStaerke: 0.3, bloomStaerke: 1.0 } },
    { t: 28, werte: { belichtung: 0.94, saettigung: 0.86, kontrast: 1.04 } },
    { t: 33, werte: { belichtung: 1.02, saettigung: 0.98, kontrast: 1.05, bloomStaerke: 1.05 } },
    { t: 40, werte: { belichtung: 1.02, saettigung: 1.0, kontrast: 1.05, tonung: [1.08, 1.0, 0.88], tonungStaerke: 0.3, bloomStaerke: 1.1 } },
    { t: 54, werte: { belichtung: 1.0, saettigung: 0.92, kontrast: 1.05, tonung: [1.12, 0.96, 0.82], tonungStaerke: 0.4, bloomStaerke: 1.2 } },
    { t: 59.6, phase: "staub", werte: { belichtung: 0.98, tonung: [1.16, 0.9, 0.7], tonungStaerke: 0.6 } },
    { t: 60.3, phase: "staubwand", werte: { tonung: [1.12, 0.92, 0.72] } },
    { t: 62.5, phase: "staub", werte: { belichtung: 0.85, tonung: [1.12, 0.9, 0.74], tonungStaerke: 0.55, schleierStaerke: 0.3 } },
    { t: 70, phase: "staub", werte: { belichtung: 0.75, saettigung: 0.7, tonung: [0.96, 0.9, 0.92], tonungStaerke: 0.4, schleierStaerke: 0.22 } },
  ]);
  const regenSaeulen = (t) => {
    const s = sturm(t); if (s < 0.05) return [];
    const out = [];
    for (let k = 0; k < 7; k++) { const cx = -1800 + 600 * k + 30 * t + 200 * Math.sin(k * 2.1), cz = -1300 - 800 * hash(k, 3) + 12 * t;
      for (let j = 0; j < 9; j++) out.push({ p: [cx + 40 * Math.sin(j + k), 60 + j * 90, cz], r: 120 + 30 * hash(j, k), dreh: j + k, farbe: [0.42, 0.44, 0.48], a: 0.22 * s, licht: 0.6, bild: (j + k) % 4 }); }
    return out;
  };
  const staubFahnen = (t) => {   // Staub steigt vom trockenen Seegrund (ab 56 s), im Nachspiel ruhig
    const a = smoothstep(55.5, 58, t) * (1 - 0.5 * smoothstep(62, 70, t)); if (a < 0.01) return [];
    const out = [];
    for (let i = 0; i < 60; i++) { const x = -300 + 600 * hash(i, 401), z = -70 - 500 * hash(i, 402) ** 0.7, tau = fr(t * 0.08 + hash(i, 403));
      out.push({ p: [x + 40 * tau, hoehe(x, z) + 4 + 30 * tau, z], r: 12 + 30 * tau, dreh: i, farbe: [0.78, 0.62, 0.44], a: 0.3 * a * Math.sin(tau * Math.PI), licht: 0.8, bild: i % 4 }); }
    return out;
  };
  function fr(x) { return x - Math.floor(x); }

  // ---------------------------------------------------------------- Protokoll
  const prot = new Protokoll();
  prot.effekt(1.0, "sonnenaufgang", { klang: false }).effekt(6.0, "sand_weht", { klang: "windstoss", staerke: 0.35 })
    .effekt(11.0, "wolken_tuermen", { klang: "grollen", staerke: 0.25, dauer: 4 });
  for (const b of BLITZE) prot.effekt(b, "blitz", { klang: "blitz", staerke: 0.6 }).effekt(b + 1.6, "donner", { klang: "donner", staerke: 0.7 });
  prot.effekt(17.5, "regen", { klang: false, dauer: 12 }).effekt(22.0, "gras_keimt", { klang: false }).effekt(24.0, "wasser_steigt", { klang: "gischt", staerke: 0.3, dauer: 4 })
    .effekt(T_DE, "groesser_als_deutschland", { klang: false }).effekt(32.6, "regenbogen", { klang: false })
    .effekt(36.0, "flusspferde", { klang: "gischt", staerke: 0.35 }).effekt(40.5, "giraffen", { klang: false }).effekt(44.0, "menschen_fels", { klang: false })
    .effekt(49.4, "voegel_fliehen", { klang: "fluegel", staerke: 0.6 }).effekt(49.5, "see_sinkt", { klang: "zischen", staerke: 0.3, dauer: 5 })
    .effekt(53.0, "duenen_wandern", { klang: "windstoss", staerke: 0.6, dauer: 4 }).effekt(55.0, "staubwand_horizont", { klang: "grollen", staerke: 0.6, dauer: 5 })
    .effekt(T_HIER, "staubwand", { klang: "druckwelle", staerke: 0.7 }).effekt(60.4, "sandsturm", { klang: "windstoss", staerke: 1.0, dauer: 5 })
    .effekt(64.0, "sterne", { klang: false });
  prot.melde({ t: 20, typ: "kamera", art: "fahrt", dauer: 14, text: "Fahrt die Düne hinab zum neuen Ufer", klang: false })
    .melde({ t: 34, typ: "kamera", art: "schwenk", dauer: 14.5, text: "Schwenk über Flusspferde, Giraffen und das Felsbild", klang: false })
    .melde({ t: 48.5, typ: "kamera", art: "zoom", dauer: 7.5, von: 60, bis: 46, text: "Zoom auf den schrumpfenden See", klang: false })
    .melde({ t: 61.5, typ: "kamera", art: "schwenk", dauer: 3, text: "Blick auf das Felsbild im Staub", klang: false });

  const sV = new THREE.Vector3(), fwd = new THREE.Vector3(), cT = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.posKeys = [{ t: 0, v: augeBei(t) }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    const z = pov.anwenden(t);
    himmel.folge(kam);
    const st = sturm(t), bl = blitz(t), sd = sonnenR(t);
    const zen = zenit(t).clone(), hor = horizont(t).clone();
    himmel.setze({ zenit: zen, horizont: hor, unten: hor.clone().multiplyScalar(0.7), sonnenRichtung: sd, sonnenFarbe: sonnenF(t), sonnenStaerke: 26 * (1 - 0.8 * st) * (1 - 0.8 * smoothstep(58.5, 61, t)), glanz: 0.7 * (1 - 0.6 * st), zirren: 0.2 + 0.3 * st });
    szene.fog.color.copy(hor).lerp(cT.set("#C8905A"), smoothstep(58, 60.5, t) * 0.7); szene.fog.density = nebelD(t);
    sV.set(...sd).normalize(); fwd.set(...zielBei(t)).sub(kam.position).setY(0).normalize();
    sonne.position.copy(kam.position).addScaledVector(fwd, 20).addScaledVector(sV, 200); sonne.target.position.copy(kam.position).addScaledVector(fwd, 20); sonne.target.updateMatrixWorld();
    sonne.color.copy(sonnenF(t)); sonne.intensity = lichtS(t) * Math.max(0.15, smoothstep(-6, 4, sd[1] / D2R * 0 + Math.asin(sd[1]) / D2R));
    hemi.intensity = hemiS(t) + 0.8 * bl; hemi.color.copy(zen).lerp(cT.set("#D8E0EC"), 0.4);
    const blitzP = [-600 + 300 * BLITZE.indexOf(BLITZE.find((b) => Math.abs(t - b) < 1.2) ?? 0), 500, -2600];
    blitzGlut.setze({ p: blitzP, staerke: 30 * bl });
    welt0.setze(t, kam, { pegel: pegel(t), gruen: gruen(t), gelb: gelb(t), nass: nass(t), weiss: weiss(t), sandZ: sandZ(t), sonne: sd, sonnenFarbe: sonnenF(t),
      himmelFarbe: hor.clone().lerp(zen, 0.4), wasserFarbe: wasserF(t), wind: wind(t),
      tiere: { giraffen: smoothstep(35.5, 37.5, t) * (1 - smoothstep(51, 53, t)), nilpferde: smoothstep(34.5, 36, t) * (1 - smoothstep(49, 50.5, t)), krokodile: smoothstep(35, 36.5, t) * (1 - smoothstep(48.6, 49.6, t)), antilopen: smoothstep(29, 32, t) * (1 - smoothstep(51, 54, t)) },
      ritzbild: smoothstep(44.2, 47.5, t), felsSinkt: smoothstep(53, 59, t) * 0.45 });
    const mvis = t > 42.5 && t < 50; menschen.koerper.visible = menschen.kopf.visible = mvis; if (mvis) menschen.setze(t);
    raben.mesh.visible = t < 15 || t > 63; raben.setze(t); seevoegel.mesh.visible = t > 33 && t < 56; seevoegel.setze(t);
    sterne.material.opacity = smoothstep(63, 69, t) * 0.85; sterne.rotation.y = 0.004 * t; sterne.rotation.x = 0.02 * Math.sin(t * 0.03);
    bogen.material.uniforms.a.value = smoothstep(T_DE - 0.6, T_DE + 1.2, t) * (1 - smoothstep(36, 38.5, t)); bogen.lookAt(kam.position.x, bogen.position.y, kam.position.z);
    const wf = (t < 20 ? 1 : 1 + 0.06 * (t - 20));
    const dunkel = 1 - 0.55 * st;
    const wl = [...wolkenH(t * 2 * wf), ...wolkenN(t * 2 * wf)].map((w, i) => ({ ...w, r: w.r * (0.45 + 0.9 * smoothstep(9, 18, t) * (1 - 0.6 * smoothstep(30, 40, t)) * (i % 3 ? 1 : 1.2) + 0.15), a: w.a * (0.35 + 0.65 * smoothstep(8, 15, t)) * (1 - 0.85 * smoothstep(46, 54, t)),
      farbe: [0.95, 0.93, 0.9].map((c, k) => c * dunkel * (k === 0 ? 1 : 0.98) * (1 + 0.6 * bl)) }));
    puffs.setze([...wl, ...regenSaeulen(t), ...staubwand.puffs(t), ...staubFahnen(t)], kam);
    regen.setze(t, kam, { deckkraft: 0.55 * smoothstep(17, 18.5, t) * (1 - smoothstep(27, 30, t)), wind: [2, -9, 1] });
    sandP.setze(t, kam, { zentrum: [kam.position.x, kam.position.y - 1.3, kam.position.z - 8], deckkraft: 0.55 * (smoothstep(3, 6, t) * (1 - smoothstep(15, 18, t)) + smoothstep(52, 56, t) * (1 - smoothstep(59, 60, t))), wind: [4 * wind(t), 0.3, 1.5] });
    staubP.setze(t, kam, { deckkraft: 0.75 * smoothstep(59.6, 60.4, t) * (1 - 0.6 * smoothstep(63, 70, t)), wind: [3, -0.2, 8 * (1 - 0.7 * smoothstep(61, 66, t))] });
    const fp = farben(t), sw = staubwand.vorKamera(t);
    Object.assign(welt.post, fp, { belichtung: fp.belichtung * (1 + 0.35 * bl), schleierStaerke: Math.max(fp.schleierStaerke, 0.75 * sw * (1 - smoothstep(61.5, 63.5, t))), schleier: [0.8, 0.6, 0.42],
      flimmern: 0.5 * (smoothstep(5, 8, t) * (1 - smoothstep(14, 16, t)) + smoothstep(52, 55, t) * (1 - smoothstep(58, 59, t))), vignette: 0, koernung: 0.008, tiltStaerke: 0 });
    return z;
  } };

  // ---------------------------------------------------------------- Text (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn du 16.000 Jahre auf einer Sahara-Düne stehst?";
  const FAKT = "TSCHADBECKEN, VOR 11.500 BIS 5.000 JAHREN · EIN SEE VON BIS ZU 400.000 KM²";
  const SAETZE = [
    [4.8, "Sonnenaufgang auf einer Düne in der Sahara.", 3.7], [9.2, "Hier fällt fast kein Regen.", 3.7], [13.6, "Dann ziehen jeden Sommer mehr Wolken auf.", 3.7],
    [18.0, "Der Monsun erreicht die Wüste.", 3.7], [22.4, "Gras keimt, wo eben noch Sand war.", 3.9], [27.0, "Wasser sammelt sich unten im Becken.", 3.8],
    [32.8, "Der See wird größer als Deutschland.", 3.3], [36.8, "Flusspferde und Krokodile leben im Wasser.", 3.5], [41.0, "Giraffen ziehen durch die Savanne.", 3.5],
    [45.2, "Menschen ritzen Tiere in den Fels.", 3.5], [49.4, "Dann sinkt der See, und zwar schnell.", 3.7], [53.8, "Die Dünen wandern zurück ins Becken.", 4.0],
    [62.6, "Der Staub stammt vom alten Seegrund.", 3.2], [66.4, "Ein Kreiseln der Erdachse machte die Sahara grün.", 3.4],
  ];
  const anzeige = (t) => {
    const j = jvh(Math.min(t, 60));
    if (t < 20) return { etikett: "JAHRE VOR HEUTE", zahl: zahlDE(Math.round(j)), einheit: "", unter: "ZEITRAFFER: 1 SEKUNDE = 75 JAHRE", wert: j };
    if (t < 34) { const f = seeflaeche(t); return { etikett: "SEEFLÄCHE", zahl: zahlDE(Math.round(f / 100) * 100), einheit: "km²", unter: t >= T_DE ? "GRÖSSER ALS DEUTSCHLAND" : "1 SEKUNDE = 214 JAHRE", wert: f }; }
    if (t < T_HIER) return { etikett: "JAHRE VOR HEUTE", zahl: zahlDE(Math.round(j)), einheit: "", unter: "1 SEKUNDE = 440 JAHRE", wert: j };
    return { etikett: "JAHRE VOR HEUTE", zahl: "HIER", einheit: "", unter: "", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  hud.flecken({ von: T_HIER + 0.4, bis: 71, anzahl: 10, art: "dunkel", seed: 13, wind: [10, 4] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices, T_DE };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
