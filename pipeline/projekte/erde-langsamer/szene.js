// Account 2 @stelldirvor.pov – „Was wäre, wenn sich die Erde immer langsamer drehen würde?“ (Skript acc2-2026-11-05-mittag)
// Pazifikstrand bei Pedernales (Ecuador, Äquator), Blick nach Westen vom Holz-Rettungsturm. Grundwelt engine/welt_tropenstrand.js (Erstbau 04.11.2026).
// Eine durchgehende Einstellung: Sonnenaufgang über den Palmen (0–5 s, 1 s = 1 h), Zoom auf die Seestapel (0–7 s), Jahres-Zeitraffer (9–48 s: Lichtspur = Sonnenbahn
// über dem Meer, Wolken jagen), das Meer weicht zurück (9–34 s), Felsen und Sandbänke tauchen auf (ab 21 s), Schwenk nach links (18–27 s), Fahrt vom Turm hinaus
// über den Meeresboden (34–50 s), Vögel ziehen dem Wasser nach (43 s), Zeitraffer 1 s = 1 Tag (52–60 s), die Sonne bleibt stehen (54,6 s), Neigung zur Sonne (50–58 s),
// Sonne leuchtet auf und eine Lichtwelle läuft über den Boden (HIER 60 s), Schwenk zurück zur Küste mit den Palmen (62–70 s).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes, hash } from "../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, Puffs, Partikel, Voegel, Menschen, PovKamera, farbPhasen, Protokoll, wolkenFeld } from "../../engine/stil_lunar_pov.js";
import { LunarHUD, zahlDE } from "../../engine/lunar_hud.js";
import { Tropenstrand, hoehe, TURM } from "../../engine/welt_tropenstrand.js";
import { sonnentagH, meer } from "../../sim/erde_langsamer.mjs";

const FPS = 30, DAUER = 80, T_HIER = 60, T_STILL = 54.6;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const D2R = Math.PI / 180, L = ease.inOutSine;
const richtung = (yaw, pitch) => [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), -Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];

// monotone kubische Interpolation (Fritsch–Carlson): stetig, ohne Stillstand an den Ankern
function mono(pts) {
  const n = pts.length, x = pts.map((p) => p[0]), y = pts.map((p) => p[1]), d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return (t) => {
    if (t <= x[0]) return y[0]; if (t >= x[n - 1]) return y[n - 1];
    let i = 0; while (t > x[i + 1]) i++;
    const h = x[i + 1] - x[i], s = (t - x[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * y[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * y[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
// Drehgeschwindigkeit am Äquator (km/h): Anker aus dem Skript (rechenweg)
const vAnker = mono([[0, 1674.4], [3, 1669], [7, 1640], [18, 1450], [21.6, 1270], [30, 835], [38, 700], [42.8, 574], [47, 250], [50, 20], [54.6, 4.6], [60, 0]]);
const vT = (t) => Math.max(0, vAnker(Math.min(t, 60)));
// Meeresspiegel der Szene (m): Wasserlinie wandert von 30 m auf ca. 4,6 km Abstand
const pegelT = mono([[0, 0], [4, 0], [9, -0.7], [13, -1.5], [17.4, -2.7], [21.6, -5.2], [25.8, -9.5], [30, -16], [34.2, -22], [38.4, -30], [42.6, -39], [46.8, -46], [50, -48], [80, -48]]);
const pegelV = (t, v) => pegelT(Math.max(0, t - v));
// Zeitraffer der Wolken (Zeit-Integral des Faktors): 1× bis 5 s, bis 9 s auf 14×, 14× bis 48 s, bis 52 s zurück auf 3×
const wolkenZeitTab = (() => { const a = [0]; let ct = 0; for (let i = 1; i <= 1600; i++) { const t = i * 0.05, f = t < 5 ? 1 : t < 9 ? lerp(1, 14, ease.inOutSine((t - 5) / 4)) : t < 48 ? 14 : t < 52 ? lerp(14, 3, ease.inOutSine((t - 48) / 4)) : 3; ct += f * 0.05; a.push(ct); } return a; })();
const wolkenZeit = (t) => { const x = clamp(t, 0, 80) / 0.05, i = Math.min(1599, Math.floor(x)); return lerp(wolkenZeitTab[i], wolkenZeitTab[i + 1], x - i); };

const AUGE = [TURM.x, TURM.auge, TURM.z];
const POS_END = [0, -300];
const augeBei = (t) => {
  const p = ease.inOutSine(clamp((t - 34) / 16)), z = lerp(0, POS_END[1], p), y0 = TURM.auge, y1 = hoehe(0, POS_END[1]) + 2.0;
  const y = lerp(y0, y1, p);
  return [0, Math.max(y, hoehe(0, z) + 1.7), z];
};
const BLICK = [{ t: 0, v: [-8, -5] }, { t: 7, v: [-15, -2.6], e: L }, { t: 12, v: [-12, -3.4], e: L }, { t: 18, v: [-8, -4], e: L }, { t: 27, v: [-36, -5], e: L }, { t: 34, v: [-3, -5], e: L },
  { t: 40, v: [0, -4], e: L }, { t: 50, v: [-10, -3.5], e: L }, { t: 58, v: [-55, 8], e: L }, { t: 62, v: [-55, 7], e: L }, { t: 70, v: [-170, 1.5], e: L }];
const FOV = [{ t: 0, v: 62 }, { t: 7, v: 46, e: L }, { t: 12, v: 48, e: L }, { t: 18, v: 56, e: L }, { t: 34, v: 58, e: L }, { t: 50, v: 58, e: L }, { t: 56, v: 52, e: L }, { t: 62, v: 55, e: L }, { t: 70, v: 55 }];
const zielBei = (t) => { const [y, p] = keyframes(BLICK, t), d = richtung(y, p), a = augeBei(t); return [a[0] + d[0] * 100, a[1] + d[1] * 100, a[2] + d[2] * 100]; };

// Sonne: Aufgang im Osten (hinter dem Betrachter), Bahn über den Himmel (5–9 s), hoch im Westen bis 50 s, dann langsam herab und stehen bleiben (54,6 s)
const sOst = richtung(165, 34), sHoch = richtung(-25, 40), sStill = richtung(-55, 13);
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
const sonnenR = (t) => {
  if (t < 5) { const p = t / 5; return richtung(lerp(172, 165, p), lerp(13, 34, ease.outSine(p))); }
  if (t < 9) { const p = ease.inOutSine((t - 5) / 4); return norm(sOst.map((x, i) => lerp(x, sHoch[i], p))); }
  if (t < 50) return sHoch;
  if (t < T_STILL) { const p = ease.outQuad((t - 50) / (T_STILL - 50)); return norm(sHoch.map((x, i) => lerp(x, sStill[i], p))); }
  return sStill;
};

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0026, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["400 80px 'Lunar Serif'", "italic 400 57px 'Lunar Serif'", "600 22px 'Lunar Sans'", "500 20px 'Lunar Sans'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#E6DCCB", 1.0e-4);
  const kam = new THREE.PerspectiveCamera(62, 1080 / 1920, 0.1, 40000);
  const welt0 = new Tropenstrand(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 9000, zenit: "#6F8FBE", horizont: "#E6E2D4", sonnenRichtung: sonnenR(0), sonnenStaerke: 26, glanz: 0.7, zirren: 0.07 });
  const pov = new PovKamera(kam, { pos: augeBei(0), ziel: zielBei(0), fov: 62 }).atmen({ staerke: 1 });

  const hemi = new THREE.HemisphereLight("#BCD0E8", "#A08A66", 0.9);
  const sonne = new THREE.DirectionalLight("#FFE8C8", 2.6);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 1, far: 700 });
  sonne.shadow.bias = -0.0008; sonne.shadow.normalBias = 0.3;
  szene.add(hemi, sonne, sonne.target);

  // Lichtspur: die Sonnenbahn eines Jahres. Am Äquator liegt jede Sonnenposition bei x = sin(Deklination), also füllt sie den Streifen |x| ≤ sin(23,44°) (am Rand verweilt sie länger → heller)
  const spur = (() => {
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: true, blending: THREE.AdditiveBlending, fog: false, side: THREE.BackSide,
      uniforms: { amp: { value: 0 }, breite: { value: 0.398 }, farbe: { value: new THREE.Color("#FFE3B8") }, zeit: { value: 0 } },
      vertexShader: "varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
      fragmentShader: `uniform float amp, breite, zeit; uniform vec3 farbe; varying vec3 vDir;
        float h(float x){ return fract(sin(x * 127.1) * 43758.5453); }
        float n(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h(i), h(i + 1.0), f); }
        void main(){ vec3 d = normalize(vDir); float y = d.y; if (y < 0.0) discard;
          float u = abs(d.x) / max(breite, 0.004);
          float prof = (0.3 + 1.2 * pow(clamp(u, 0.0, 1.0), 3.0)) * smoothstep(1.1, 0.9, u);
          float hoch = smoothstep(0.0, 0.03, y) * (1.0 - 0.85 * smoothstep(0.1, 0.75, y));
          float str = 0.85 + 0.25 * n(d.x * 60.0 + zeit * 0.6);
          float eng = sqrt(0.398 / max(breite, 0.02));
          gl_FragColor = vec4(farbe * prof * hoch * str * amp * eng, 1.0); }` });
    const m = new THREE.Mesh(new THREE.SphereGeometry(8800, 48, 24), mat); m.renderOrder = -990; m.frustumCulled = false; szene.add(m); return m;
  })();

  const puffs = new Puffs(szene, { max: 900, schatten: 0.4 });
  const sandP = new Partikel(szene, { art: "staub", anzahl: 1600, box: [30, 8, 30], seed: 6, groesse: 0.03, farbe: "#E8D2A8" });
  const staubP = new Partikel(szene, { art: "staub", anzahl: 2200, box: [40, 14, 40], seed: 7, groesse: 0.05, farbe: "#E0C698" });
  const menschen = new Menschen(szene, { anzahl: 4, seed: 83, kleidung: ["#E8E2D6", "#C4473A", "#2F5D8C", "#D9A441"], haut: ["#8D5A3E", "#6B4330", "#A87050"] });
  menschen.verteile({ anzahl: 4, punkte: [[-21, -25], [-33, -20], [27, -29], [34, -26]], boden: (x, z) => hoehe(x, z), gehen: 0.5, tempo: [0.5, 0.9], weg: [2, 5] });
  menschen.reaktion({ t0: 8.5, art: "fliehen", weg: [0.2, 1], tempo: [1.8, 2.6], verzoegerung: [0, 3], anteil: 1 });
  const pelikane = new Voegel(szene, { anzahl: 7, seed: 91, farbe: "#3E3A38", spannweite: 2.1 }).schwarm({ zentrum: [-4, 14, -120], radius: 55, hoehe: 5, tempo: 7, anzahl: 7 }).flucht({ t0: 43, richtung: [0.05, 0.12, -1], tempo: 14 });
  const fregatt = new Voegel(szene, { anzahl: 9, seed: 93, farbe: "#17171B", spannweite: 1.9 }).schwarm({ zentrum: [-30, 34, -110], radius: 80, hoehe: 12, tempo: 9, anzahl: 9 }).flucht({ t0: 44, richtung: [-0.1, 0.1, -1], tempo: 16 });
  const seevoegel = new Voegel(szene, { anzahl: 40, seed: 95, farbe: "#F0ECE4", spannweite: 1.0 }).schwarm({ zentrum: [10, 12, -380], radius: 50, hoehe: 6, tempo: 7, anzahl: 40 }).flucht({ t0: 45, richtung: [0.1, 0.08, -1], tempo: 15 });
  const sterne = (() => { const n = 700, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = hash(i, 1) * 6.283, z = 0.15 + 0.85 * hash(i, 2), r = Math.sqrt(1 - z * z); p.set([Math.cos(a) * r * 8000, z * 8000, Math.sin(a) * r * 8000], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const m = new THREE.PointsMaterial({ color: "#FFFFFF", size: 2.0, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    const o = new THREE.Points(g, m); o.renderOrder = -900; szene.add(o); return o; })();
  const wolkenA = wolkenFeld({ anzahl: 22, bereich: { x: [-4400, 4400], z: [-4800, -700] }, hoehe: [650, 1100], groesse: 230, farbe: "#F7F4EE", a: 0.92, wind: [0, 0], seed: 3 });
  const wolkenB = wolkenFeld({ anzahl: 14, bereich: { x: [-3000, 3000], z: [-2600, -600] }, hoehe: [520, 800], groesse: 170, farbe: "#F2F0EC", a: 0.9, wind: [0, 0], seed: 4 });
  const WX = [-4500, 4500], WZ = [-5200, -300];
  const wrap = (v, a, b) => a + ((((v - a) % (b - a)) + (b - a)) % (b - a));

  // ---------------------------------------------------------------- Zustände
  const K = (keys) => (t) => keyframes(keys.map(([tt, v, e]) => ({ t: tt, v, e: e || L })), t);
  const farbe = (keys) => { const Cs = keys.map(([tt, c]) => [tt, new THREE.Color(c)]), o = new THREE.Color(); return (t) => { o.copy(Cs[0][1]); for (let i = 1; i < Cs.length; i++) { if (t <= Cs[i][0]) { const p = L(clamp((t - Cs[i - 1][0]) / (Cs[i][0] - Cs[i - 1][0]))); return o.copy(Cs[i - 1][1]).lerp(Cs[i][1], p); } o.copy(Cs[i][1]); } return o; }; };
  const zenit = farbe([[0, "#3A4C7E"], [5, "#5A78AE"], [9, "#6486BC"], [48, "#6486BC"], [54, "#5A71A4"], [60, "#4C5C90"], [66, "#313962"], [70, "#232846"]]);
  const horizont = farbe([[0, "#F0B088"], [5, "#F2D3B0"], [9, "#E4E2D6"], [47, "#E8DCC6"], [54, "#EDB27C"], [60, "#F0A060"], [66, "#C47A58"], [70, "#6E4C50"]]);
  const sonnenF = farbe([[0, "#FF9A58"], [5, "#FFD9A8"], [9, "#FFF4E4"], [48, "#FFF0D8"], [54, "#FFB468"], [60, "#FF9A48"], [70, "#E88040"]]);
  const wasserTief = farbe([[0, "#14506A"], [5, "#0C4A5E"], [48, "#0B4A5C"], [60, "#233E52"], [70, "#1A2A3C"]]);
  const lichtS = K([[0, 2.2], [5, 1.9], [9, 2.0], [48, 2.0], [54, 1.8], [58, 1.7], [60.3, 2.3], [63, 1.7], [70, 1.2]]);
  const hemiS = K([[0, 1.05], [5, 0.85], [48, 0.8], [60, 0.75], [66, 0.6], [70, 0.45]]);
  const nebelD = K([[0, 1.5e-4], [5, 1.1e-4], [48, 1.0e-4], [56, 1.5e-4], [60, 2.2e-4], [66, 3.0e-4], [70, 3.2e-4]]);
  const wind = K([[0, 0.5], [5, 0.7], [9, 1.0], [48, 1.0], [54, 0.6], [60, 0.4], [70, 0.4]]);
  const farben = farbPhasen([
    { t: 0, werte: { belichtung: 0.96, saettigung: 0.98, kontrast: 1.06, tonung: [1.1, 0.96, 0.82], tonungStaerke: 0.35, bloomStaerke: 1.2 } },
    { t: 5, werte: { belichtung: 1.0, saettigung: 0.95, kontrast: 1.04, tonung: [1.04, 1.0, 0.94], tonungStaerke: 0.15, bloomStaerke: 1.0 } },
    { t: 9, werte: { belichtung: 1.02, saettigung: 0.96, kontrast: 1.04, tonung: [1.0, 1.0, 1.0], tonungStaerke: 0.08, bloomStaerke: 1.05 } },
    { t: 48, werte: { belichtung: 1.02, saettigung: 0.96, kontrast: 1.04, tonung: [1.02, 1.0, 0.97], tonungStaerke: 0.12, bloomStaerke: 1.1 } },
    { t: 54.6, werte: { belichtung: 1.0, saettigung: 0.98, kontrast: 1.05, tonung: [1.1, 0.97, 0.84], tonungStaerke: 0.3, bloomStaerke: 1.25 } },
    { t: 59, werte: { belichtung: 1.02, saettigung: 1.0, kontrast: 1.05, tonung: [1.12, 0.95, 0.78], tonungStaerke: 0.4, bloomStaerke: 1.55 } },
    { t: 63, werte: { belichtung: 0.96, saettigung: 0.98, kontrast: 1.05, tonung: [1.12, 0.94, 0.76], tonungStaerke: 0.45, bloomStaerke: 1.3 } },
    { t: 70, werte: { belichtung: 0.82, saettigung: 0.82, kontrast: 1.04, tonung: [1.04, 0.92, 0.88], tonungStaerke: 0.4, bloomStaerke: 1.1, schleier: [0.82, 0.68, 0.52], schleierStaerke: 0.16 } },
  ]);
  const staubFahnen = (t) => {   // Staub steigt vom trockenen Meeresboden (ab 56 s), im Nachspiel ruhig
    const a = smoothstep(55.5, 59, t) * (1 - 0.4 * smoothstep(64, 70, t)); if (a < 0.01) return [];
    const out = [], fr = (x) => x - Math.floor(x), c = kam.position;
    for (let i = 0; i < 70; i++) { const ang = hash(i, 401) * 6.283, rr = 25 + 520 * hash(i, 402) ** 0.8, tau = fr(t * 0.07 + hash(i, 403)), x = c.x + Math.cos(ang) * rr, z = c.z + Math.sin(ang) * rr - 40;
      out.push({ p: [x + 50 * tau, hoehe(x, z) + 3 + 26 * tau, z + 20 * tau], r: 10 + 26 * tau, dreh: i, farbe: [0.88, 0.76, 0.58], a: 0.26 * a * Math.sin(tau * Math.PI), licht: 0.9, bild: i % 4 }); }
    return out;
  };

  // ---------------------------------------------------------------- Protokoll
  const prot = new Protokoll();
  prot.effekt(1.0, "sonnenaufgang", { klang: false }).effekt(2.4, "pelikane_ziehen", { klang: "fluegel", staerke: 0.1 }).effekt(3.2, "brandung_rollt", { klang: "gischt", staerke: 0.12, dauer: 3 })
    .effekt(5.4, "zeitraffer_setzt_ein", { klang: "windstoss", staerke: 0.1, dauer: 3 }).effekt(9.0, "lichtspur", { klang: false }).effekt(13.5, "wasserlinie_weicht", { klang: "zischen", staerke: 0.3, dauer: 4 })
    .effekt(17.4, "nasser_sand_glaenzt", { klang: false }).effekt(21.2, "felsen_tauchen_auf", { klang: "gischt", staerke: 0.4, dauer: 4 }).effekt(24.0, "sandbaenke", { klang: false })
    .effekt(26.0, "stroemung_nord_sued", { klang: "gischt", staerke: 0.3, dauer: 4 }).effekt(29.0, "tuempel_bleiben", { klang: false }).effekt(38.4, "kueste_zum_horizont", { klang: false })
    .effekt(43.0, "voegel_ziehen_dem_wasser_nach", { klang: "fluegel", staerke: 0.6 }).effekt(48.0, "lichtspur_zerfaellt", { klang: "zischen", staerke: 0.3, dauer: 3 })
    .effekt(T_STILL, "sonne_steht_still", { klang: "grollen", staerke: 0.5, dauer: 4 }).effekt(T_HIER, "sonne_leuchtet_auf", { klang: "druckwelle", staerke: 1.0 })
    .effekt(60.4, "lichtwelle_ueber_den_boden", { klang: "windstoss", staerke: 0.6, dauer: 4 }).effekt(63.0, "staubfahnen_ueber_dem_boden", { klang: false }).effekt(65.0, "sterne", { klang: false });
  prot.melde({ t: 0, typ: "kamera", art: "zoom", dauer: 7, von: 62, bis: 46, text: "Zoom von der Brandung auf die Seestapel", klang: false })
    .melde({ t: 18, typ: "kamera", art: "schwenk", dauer: 9, text: "Schwenk nach links über die auftauchenden Sandbänke", klang: false })
    .melde({ t: 34, typ: "kamera", art: "fahrt", dauer: 16, text: "Fahrt vom Turm hinaus über den Meeresboden", klang: false })
    .melde({ t: 50, typ: "kamera", art: "schwenk", dauer: 8, text: "Neigung und Schwenk zur stehenden Sonne", klang: false })
    .melde({ t: 62, typ: "kamera", art: "schwenk", dauer: 8, text: "Schwenk zurück zur Küste mit den Palmen", klang: false });

  const sV = new THREE.Vector3(), fwd = new THREE.Vector3(), cT = new THREE.Color();
  const welt = { szene, kamera: kam, post: {}, update(t) {
    pov.fov = keyframes(FOV, t);
    pov.posKeys = [{ t: 0, v: augeBei(t) }]; pov.zielKeys = [{ t: 0, v: zielBei(t) }];
    const z = pov.anwenden(t);
    himmel.folge(kam); spur.position.copy(kam.position);
    const sd = sonnenR(t), zen = zenit(t).clone(), hor = horizont(t).clone();
    const hell = 1 + 1.4 * smoothstep(58.2, 60.2, t) * (1 - smoothstep(62.5, 66, t));
    himmel.setze({ zenit: zen, horizont: hor, unten: hor.clone().multiplyScalar(0.7), sonnenRichtung: sd, sonnenFarbe: sonnenF(t), sonnenStaerke: 26 * hell, glanz: 0.7 * hell, zirren: 0.07 });
    szene.fog.color.copy(hor); szene.fog.density = nebelD(t);
    sV.set(...sd).normalize(); fwd.set(...zielBei(t)).sub(kam.position).setY(0).normalize();
    sonne.position.copy(kam.position).addScaledVector(fwd, 30).addScaledVector(sV, 300); sonne.target.position.copy(kam.position).addScaledVector(fwd, 30); sonne.target.updateMatrixWorld();
    sonne.color.copy(sonnenF(t)); sonne.intensity = lichtS(t) * Math.max(0.2, smoothstep(-2, 6, Math.asin(sd[1]) / D2R));
    hemi.intensity = hemiS(t); hemi.color.copy(zen).lerp(cT.set("#D8E0EC"), 0.4);
    // Lichtspur
    const su = spur.material.uniforms; su.amp.value = 0.7 * smoothstep(5.5, 9, t) * (1 - smoothstep(47.5, 50.5, t)); su.breite.value = 0.398 * (1 - smoothstep(47.5, 51, t)) + 0.012; su.zeit.value = t;
    const pg = pegelT(t), lw = smoothstep(59.6, 60.2, t) * (1 - smoothstep(62.2, 63.6, t));
    welt0.setze(t, kam, { pegel: pg, pegelV1: pegelV(t, 4), pegelV2: pegelV(t, 12), sonne: sd, sonnenFarbe: sonnenF(t), himmelFarbe: hor.clone().lerp(zen, 0.35), wasserFarbe: wasserTief(t), wind: wind(t),
      lichtwelle: { r: Math.max(0, (t - 59.6)) * 330, a: lw }, tuempel: 1 - 0.85 * smoothstep(30, 62, t) });
    const mvis = t < 17; menschen.koerper.visible = menschen.kopf.visible = mvis; if (mvis) menschen.setze(t);
    pelikane.mesh.visible = t < 60; pelikane.setze(t); fregatt.mesh.visible = t < 66; fregatt.setze(t); seevoegel.mesh.visible = t > 32 && t < 62; seevoegel.setze(t);
    sterne.material.opacity = smoothstep(64, 70, t) * 0.8; sterne.rotation.y = 0.004 * t;
    // Wolken ziehen mit dem Zeitraffer, am Rand des Feldes wird umgesetzt
    const ct = wolkenZeit(t), wf = (p) => ({ ...p, p: [wrap(p.p[0] + 3 * ct, WX[0], WX[1]), p.p[1], wrap(p.p[2] - 9 * ct, WZ[0], WZ[1])] });
    const rot = smoothstep(52, 64, t), dunkel = 1 - 0.28 * smoothstep(54, 70, t);
    const wl = [...wolkenA(0), ...wolkenB(0)].map(wf).map((w, i) => ({ ...w, a: w.a * (0.55 + 0.45 * smoothstep(0, 4, t)) * (1 - 0.35 * smoothstep(56, 70, t)),
      farbe: [0.97 * dunkel + 0.03 * rot, 0.95 * dunkel - 0.05 * rot, 0.92 * dunkel - 0.16 * rot].map((c) => clamp(c, 0, 1)) }));
    puffs.setze([...wl, ...staubFahnen(t)], kam);
    sandP.setze(t, kam, { zentrum: [kam.position.x, kam.position.y - 1.6, kam.position.z - 7], deckkraft: 0.5 * smoothstep(0.5, 2.5, t) * (1 - smoothstep(6, 9, t)), wind: [-4 * wind(t), 0.2, -3] });
    staubP.setze(t, kam, { deckkraft: 0.65 * smoothstep(58, 61, t) * (1 - 0.45 * smoothstep(64, 70, t)), wind: [2, 0.1, 5 * (1 - 0.6 * smoothstep(62, 68, t))] });
    const fp = farben(t);
    Object.assign(welt.post, fp, { belichtung: fp.belichtung, flimmern: 0.35 * smoothstep(5, 8, t) * (1 - smoothstep(14, 17, t)), vignette: 0, koernung: 0.008, tiltStaerke: 0 });
    return z;
  } };

  // ---------------------------------------------------------------- Text (1:1 aus dem Skript)
  const TITEL = "Was wäre, wenn sich die Erde immer langsamer drehen würde?";
  const FAKT = "DIE ERDE BREMST WIRKLICH · DER TAG WIRD JE JAHRHUNDERT 1,8 MILLISEKUNDEN LÄNGER";
  const SAETZE = [
    [4.8, "Morgens an Ecuadors Küste, am Äquator.", 3.6], [9.0, "Dann vergehen Jahre in Sekunden.", 3.6], [13.2, "Die Erde dreht sich immer langsamer.", 3.6],
    [17.4, "Das Meer zieht sich vom Strand zurück.", 3.6], [21.6, "Dann tauchen Felsen und Sandbänke auf.", 3.6], [25.8, "Das Wasser fließt nach Norden und Süden.", 3.6],
    [30.0, "Ein Tag dauert jetzt 48 Stunden.", 3.6], [34.2, "Wo Meer war, liegt nackter Meeresboden.", 3.6], [38.4, "Dann zieht die Küste zum Horizont.", 3.6],
    [42.6, "Das Meer liegt drei Kilometer tiefer.", 3.6], [46.8, "Die Vögel ziehen dem Wasser hinterher.", 3.6], [51.0, "Dann dreht sich der Boden nur noch im Schritttempo.", 3.6],
    [55.0, "Die Sonne bleibt am Himmel stehen.", 3.6], [62.4, "Ein Tag dauert jetzt ein ganzes Jahr.", 3.6], [66.4, "Erst die Drehung hält das Meer am Äquator.", 3.2],
  ];
  const mm = (m) => "−" + zahlDE(Math.round(-m));
  const anzeige = (t) => {
    const v = vT(t);
    if (t < 18) return { etikett: "DREHUNG AM ÄQUATOR", zahl: zahlDE(Math.round(v)), einheit: "km/h", unter: t < 5.5 ? "ZEITRAFFER: 1 SEKUNDE = 1 STUNDE" : t < 9 ? "ZEITRAFFER BESCHLEUNIGT" : "ZEITRAFFER: 1 SEKUNDE = 1 JAHR", wert: v };
    if (t < 38) return { etikett: "MEERESSPIEGEL", zahl: mm(meer(v)), einheit: "m", unter: `EIN TAG: ${Math.round(sonnentagH(v))} STUNDEN · 1 S = 1 JAHR`, wert: meer(v) };
    if (t < 50) return { etikett: "TAGESLÄNGE", zahl: zahlDE(sonnentagH(v) / 24, 1), einheit: "Tage", unter: t < 48 ? `MEER ${mm(meer(v))} M · 1 SEKUNDE = 1 JAHR` : `MEER ${mm(meer(v))} M · ZEITRAFFER SINKT`, wert: sonnentagH(v) / 24 };
    if (t < T_HIER) return { etikett: "DREHUNG AM ÄQUATOR", zahl: zahlDE(v, 1), einheit: "km/h", unter: t < 52 ? "ZEITRAFFER SINKT · SCHRITTTEMPO" : t < T_STILL ? "1 SEKUNDE = 1 TAG · SCHRITTTEMPO" : "SONNE STEHT STILL BEI 4,6 KM/H", wert: v };
    return { etikett: "HIER", zahl: "0", einheit: "km/h", unter: "EIN TAG = EIN JAHR", wert: 0 };
  };
  const hud = new LunarHUD(document.getElementById("hud"), { titel: TITEL, fakt: FAKT, anzeige, saetze: SAETZE });
  hud.flecken({ von: 62.4, bis: 71, anzahl: 9, art: "225,190,140", seed: 13, wind: [10, 4], deckkraft: [0.12, 0.3] });

  const ereignisse = prot.alle(hud.ereignisse(), pov.ereignisse());
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); hud.at(t); };
  window.hudAt = (t) => hud.at(t);
  window.dauer = DAUER; window.ereignisse = ereignisse; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.massstab = { version: 2, format: "referenz_pov", untertitel: null };
  window.modell = { T_HIER, vertices: welt0.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
