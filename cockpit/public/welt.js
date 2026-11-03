// 3D-Welt des Cockpits: „Neon-Stadt“ (Vorschlag vom 03.11., der Inhaber hatte keine Vorliebe). Jedes Video der letzten 30 Tage
// ist ein leuchtender Turm (Höhe = Views, Cyan = Simulierbar, Pink = Stell dir vor), dazu Neon-Gitterboden mit Datenpaketen,
// Synthwave-Sonne, Drahtgitter-Berge, der Claude-Kern über der Stadt und eine Baustelle für den laufenden Render.
// Liegt als Ebene hinter der Oberfläche; 🌐 (oder „zeig die Stadt“) blendet die Oberfläche aus: ziehen, zoomen, Türme anklicken.
// Leistung (Entscheidung 03.11.): Auto = volle Pracht, aber sparsam, solange dieser Laptop rendert (gleiche Grafikkarte).
// Nutzt S, ZS, $, esc, lokal, toast, tickerNeu, Ton, zahl, kurzZahl aus den übrigen Skripten.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const leinwand = document.getElementById("welt");
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, powerPreference: "high-performance" });
} catch (e) {
  console.warn("3D-Welt: kein WebGL", e);
}
if (!renderer) {
  document.body.classList.add("welt-fehlt");
  throw new Error("3D-Welt: WebGL nicht verfügbar, das Cockpit bleibt in 2D");
}

const STUFEN = {
  ultra: { pr: 1.25, bloom: true, fps: 60, partikel: 1, name: "Ultra" },
  sparsam: { pr: 0.6, bloom: false, fps: 24, partikel: 0.3, name: "Sparsam" },
};
const WAHL = ["auto", "ultra", "sparsam", "aus"];
const WAHL_TEXT = {
  auto: ["Auto", "volle Pracht, sparsam solange der Laptop rendert"],
  ultra: ["Ultra", "immer volle Pracht (Rendern kann langsamer werden)"],
  sparsam: ["Sparsam", "weniger Bilder pro Sekunde, kein Leuchten"],
  aus: ["Aus", "nur der flache Hintergrund"],
};
const CYAN = new THREE.Color("#25f4ee"), PINK = new THREE.Color("#fe2c55"), GOLD = new THREE.Color("#ffd166");
const VIOLETT = new THREE.Color("#9b5cff"), GRUEN = new THREE.Color("#3ef0a0"), ROT = new THREE.Color("#ff4d6d");
const FARBE = { simulierbar: CYAN, "stelldirvor.pov": PINK };
const KANAL_NAME = { simulierbar: "Simulierbar", "stelldirvor.pov": "Stell dir vor" };
const MODELL_FARBE = { opus: VIOLETT, sonnet: CYAN, haiku: GRUEN };
const NEBEL = new THREE.Color("#0b0716"), NEBEL_DICHTE = 0.0058;
const BREITE = 3.2, ABSTAND_Z = 7.5, BAUSTELLE_HOEHE = 26;
const ZEIT = { value: 0 };

const W = {
  wahl: WAHL.includes(lokal.lesen("welt-stufe", "auto")) ? lokal.lesen("welt-stufe", "auto") : "auto",
  stufe: null, prFaktor: 1, ansicht: document.body.dataset.ansicht || "live", stadt: false,
  lauf: 0, warp: 0, warpT: 1, wackeln: 0, claudeAktiv: false,
  tuerme: new Map(), tiefe: 30, gebaut: false, hover: null, gewaehlt: null,
  maus: { x: 0, y: 0 },
  orbit: { az: 0.5, el: 0.55, dist: 95, ziehen: null, ruhe: 0 },
  zeiten: [], messung: 0, schweber: [], wellen: [], strahlen: [],
};

const szene = new THREE.Scene();
szene.fog = new THREE.FogExp2(NEBEL, NEBEL_DICHTE);
szene.background = NEBEL.clone();
const kamera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.5, 2000);
kamera.position.set(0, 150, 190); // Anflug beim Start
const istZiel = new THREE.Vector3(0, 0, -40), sollPos = new THREE.Vector3(), sollZiel = new THREE.Vector3();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(szene, kamera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.85, 0.45, 0.5);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const kurzTitel = (t, n = 26) => { t = String(t || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n).replace(/\s\S*$/, "") + " …" : t; };
const hex = (c) => "#" + c.getHexString();

// ───────────────────────── Shader-Bausteine ─────────────────────────
const NEBEL_GLSL = `
uniform vec3 uNebelFarbe; uniform float uNebel;
vec3 nebeln(vec3 farbe, vec3 welt) { float d = length(welt - cameraPosition); return mix(farbe, uNebelFarbe, 1.0 - exp(-uNebel * uNebel * d * d)); }`;
const nebelUniforms = () => ({ uNebelFarbe: { value: NEBEL }, uNebel: { value: NEBEL_DICHTE } });
const WELT_VERTEX = `varying vec3 vWelt; varying vec3 vLokal; varying vec3 vNormale; varying vec2 vUv;
void main() { vLokal = position; vNormale = normal; vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWelt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

function punktTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const v = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(0.3, "rgba(255,255,255,0.55)"); v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const PUNKT = punktTextur();

// ───────────────────────── Himmel, Sonne, Berge, Sterne, Boden ─────────────────────────
function himmelBauen() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uOben: { value: new THREE.Color("#03040a") }, uHorizont: { value: new THREE.Color("#2a0a3c") }, uGlut: { value: PINK } },
    vertexShader: `varying vec3 vRichtung; void main() { vRichtung = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uOben, uHorizont, uGlut; varying vec3 vRichtung;
      void main() {
        float h = vRichtung.y;
        vec3 f = mix(uHorizont, uOben, smoothstep(0.0, 0.42, h));
        f += uGlut * 0.42 * exp(-abs(h) * 16.0) * (0.35 + 0.65 * max(0.0, -vRichtung.z));
        gl_FragColor = vec4(f, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  szene.add(new THREE.Mesh(new THREE.SphereGeometry(1200, 32, 16), m));
}

function sonneBauen() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uZeit: ZEIT, uOben: { value: GOLD }, uUnten: { value: PINK } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uZeit; uniform vec3 uOben, uUnten; varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5; float r = length(p); float R = 0.31;
        float scheibe = smoothstep(R, R - 0.004, r);
        float y = p.y / R;
        float streifen = 1.0;
        if (y < 0.2) {
          float s = fract((y + uZeit * 0.035) * 8.0);
          float breite = mix(0.06, 0.6, clamp(0.2 - y, 0.0, 1.0));
          streifen = step(breite, s);
        }
        vec3 f = mix(uUnten, uOben, smoothstep(-0.9, 0.85, y)) * 1.7;
        float halo = exp(-max(r - R, 0.0) * 16.0) * 0.6 * (1.0 - scheibe);
        float a = scheibe * streifen;
        gl_FragColor = vec4(f * a + mix(uUnten, uOben, 0.35) * halo, max(a, halo));
        #include <colorspace_fragment>
      }`,
  });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), m);
  s.position.set(0, 34, -640);
  s.renderOrder = -1;
  szene.add(s);
}

function bergeBauen() {
  const g = new THREE.PlaneGeometry(560, 240, 70, 28);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const tal = Math.max(0, (Math.abs(x) - 48) / 232);
    const rauschen = 0.55 + 0.45 * Math.sin(x * 0.071 + z * 0.052) * Math.cos(z * 0.093 - x * 0.031);
    pos.setY(i, Math.pow(tal, 1.35) * 78 * rauschen);
  }
  const fuellung = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x06030d, fog: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const gitter = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: VIOLETT.clone().multiplyScalar(0.8), wireframe: true, transparent: true, opacity: 0.5, fog: false }));
  for (const m of [fuellung, gitter]) { m.position.set(0, 0, -320); szene.add(m); }
}

let sterne;
function sterneBauen() {
  const n = 1600, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.asin(0.04 + Math.random() * 0.96), r = 1000;
    p.set([Math.cos(u) * Math.cos(v) * r, Math.sin(v) * r, Math.sin(u) * Math.cos(v) * r], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  sterne = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xe4ecff, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9, map: PUNKT, depthWrite: false }));
  szene.add(sterne);
}

let bodenMat;
function bodenBauen() {
  bodenMat = new THREE.ShaderMaterial({
    uniforms: { uLauf: { value: 0 }, uCyan: { value: CYAN }, uPink: { value: PINK }, ...nebelUniforms() },
    vertexShader: WELT_VERTEX,
    fragmentShader: `uniform float uLauf; uniform vec3 uCyan, uPink; ${NEBEL_GLSL} varying vec3 vWelt;
      float linie(float k) { float d = abs(fract(k - 0.5) - 0.5) / max(fwidth(k), 1e-4); return 1.0 - min(d / 1.3, 1.0); }
      void main() {
        vec2 p = vWelt.xz / 6.0;
        float lx = linie(p.x), lz = linie(p.y);
        vec3 f = vec3(0.006, 0.004, 0.016) + uPink * lx * 0.42 + uCyan * lz * 0.5;
        // Datenpakete laufen auf den Längslinien zur Kamera
        float spalte = floor(p.x + 0.5);
        float paket = pow(fract(p.y * 0.07 + uLauf * 0.05 + fract(sin(spalte * 91.7) * 47.3)), 18.0);
        f += mix(uPink, uCyan, step(0.5, fract(spalte * 0.5))) * lx * paket * 3.2;
        f += mix(uCyan, uPink, 0.5) * exp(-abs(vWelt.x) * 0.22) * 0.06;
        gl_FragColor = vec4(nebeln(f, vWelt), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const b = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), bodenMat);
  b.rotation.x = -Math.PI / 2;
  szene.add(b);
}

// Aufsteigende Lichtteilchen über der Stadt
const SCHWEBE_N = 520;
let schwebe;
function schwebeteilchenBauen() {
  const p = new Float32Array(SCHWEBE_N * 3), c = new Float32Array(SCHWEBE_N * 3);
  const farben = [CYAN, PINK, VIOLETT];
  for (let i = 0; i < SCHWEBE_N; i++) {
    p.set([(Math.random() - 0.5) * 180, Math.random() * 70, 40 - Math.random() * 260], i * 3);
    farben[i % 3].toArray(c, i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  schwebe = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.55, vertexColors: true, map: PUNKT, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
  schwebe.frustumCulled = false;
  szene.add(schwebe);
}

// ───────────────────────── Partikel (Feuerwerk, Funken, Datenströme) ─────────────────────────
const POOL = 2600;
const T = {
  pos: new Float32Array(POOL * 3), farbe: new Float32Array(POOL * 3), groesse: new Float32Array(POOL), alpha: new Float32Array(POOL),
  v: new Float32Array(POOL * 3), leben: new Float32Array(POOL), max: new Float32Array(POOL), schwer: new Float32Array(POOL), zug: new Float32Array(POOL),
  start: new Float32Array(POOL), naechster: 0, mat: null, geo: null,
};
function partikelBauen() {
  T.geo = new THREE.BufferGeometry();
  T.geo.setAttribute("position", new THREE.BufferAttribute(T.pos, 3).setUsage(THREE.DynamicDrawUsage));
  T.geo.setAttribute("aFarbe", new THREE.BufferAttribute(T.farbe, 3).setUsage(THREE.DynamicDrawUsage));
  T.geo.setAttribute("aGroesse", new THREE.BufferAttribute(T.groesse, 1).setUsage(THREE.DynamicDrawUsage));
  T.geo.setAttribute("aAlpha", new THREE.BufferAttribute(T.alpha, 1).setUsage(THREE.DynamicDrawUsage));
  T.mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uPixel: { value: 1 } },
    vertexShader: `attribute vec3 aFarbe; attribute float aGroesse; attribute float aAlpha; uniform float uPixel; varying vec3 vFarbe; varying float vAlpha;
      void main() { vFarbe = aFarbe; vAlpha = aAlpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aGroesse * uPixel * (340.0 / max(-mv.z, 1.0)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vFarbe; varying float vAlpha;
      void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vAlpha; if (a < 0.01) discard; gl_FragColor = vec4(vFarbe * 2.2 * a, a);
        #include <colorspace_fragment>
      }`,
  });
  const punkte = new THREE.Points(T.geo, T.mat);
  punkte.frustumCulled = false;
  szene.add(punkte);
}

function spruehen(ort, o = {}) {
  const { farben = [CYAN, PINK, GOLD], tempo = 14, schwerkraft = -9, leben = 1.6, groesse = 1.2, richtung = null, streuung = 1, zug = 0.9 } = o;
  const anzahl = Math.round((o.anzahl ?? 60) * (STUFEN[W.stufe]?.partikel ?? 1));
  for (let k = 0; k < anzahl; k++) {
    const i = T.naechster;
    T.naechster = (i + 1) % POOL;
    let vx, vy, vz;
    if (richtung) {
      vx = richtung.x + (Math.random() - 0.5) * streuung; vy = richtung.y + (Math.random() - 0.5) * streuung; vz = richtung.z + (Math.random() - 0.5) * streuung;
    } else {
      const u = Math.random() * 2 - 1, w = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u), t = tempo * (0.35 + Math.random() * 0.65);
      vx = s * Math.cos(w) * t; vy = u * t; vz = s * Math.sin(w) * t;
    }
    T.pos.set([ort.x, ort.y, ort.z], i * 3);
    T.v.set([vx, vy, vz], i * 3);
    farben[k % farben.length].toArray(T.farbe, i * 3);
    T.leben[i] = T.max[i] = leben * (0.7 + Math.random() * 0.3);
    T.schwer[i] = schwerkraft; T.zug[i] = zug;
    T.start[i] = T.groesse[i] = groesse * (0.6 + Math.random() * 0.8);
    T.alpha[i] = 1;
  }
}

function partikelBewegen(dt) {
  for (let i = 0; i < POOL; i++) {
    if (T.leben[i] <= 0) { if (T.alpha[i] !== 0) T.alpha[i] = 0; continue; }
    T.leben[i] -= dt;
    const j = i * 3;
    T.v[j + 1] += T.schwer[i] * dt;
    const bremse = Math.max(0, 1 - T.zug[i] * dt);
    T.v[j] *= bremse; T.v[j + 1] *= bremse; T.v[j + 2] *= bremse;
    T.pos[j] += T.v[j] * dt; T.pos[j + 1] += T.v[j + 1] * dt; T.pos[j + 2] += T.v[j + 2] * dt;
    const rest = Math.max(0, T.leben[i] / T.max[i]);
    T.alpha[i] = Math.pow(rest, 0.6);
    T.groesse[i] = T.start[i] * (0.4 + 0.6 * rest);
  }
  for (const n of ["position", "aFarbe", "aGroesse", "aAlpha"]) T.geo.attributes[n].needsUpdate = true;
}

function feuerwerk(ort, gross = false) {
  const salven = gross ? 4 : 2;
  for (let s = 0; s < salven; s++) {
    setTimeout(() => {
      const o = ort.clone().add(new THREE.Vector3((Math.random() - 0.5) * (gross ? 30 : 10), (Math.random() - 0.3) * 8, (Math.random() - 0.5) * 10));
      const farbe = [CYAN, PINK, GOLD, VIOLETT, GRUEN][Math.floor(Math.random() * 5)];
      spruehen(o, { anzahl: gross ? 220 : 120, farben: [farbe, farbe, new THREE.Color("#ffffff")], tempo: gross ? 26 : 18, schwerkraft: -6, leben: 2.2, groesse: 1.5 });
      if (Ton?.blip && s > 0) Ton.blip();
    }, s * (gross ? 320 : 260));
  }
}

const RING_GEO = new THREE.RingGeometry(0.93, 1, 96);
function welle(ort, farbe = CYAN, groesse = 60, dauer = 1.4) {
  const m = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: farbe.clone().multiplyScalar(1.6), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(ort);
  szene.add(m);
  W.wellen.push({ m, t: 0, groesse, dauer });
}

function lichtstrahl(ort, farbe = GOLD) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.2, 220, 20, 1, true), new THREE.MeshBasicMaterial({ color: farbe.clone().multiplyScalar(2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(ort.x, ort.y + 110, ort.z);
  szene.add(m);
  W.strahlen.push({ m, t: 0 });
}

// Aufsteigende Zahl über einem Turm (+Views)
function schweber(ort, text, farbe) {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 96;
  const g = c.getContext("2d");
  g.font = "700 58px 'Space Grotesk', sans-serif"; g.textAlign = "center"; g.fillStyle = hex(farbe); g.shadowColor = hex(farbe); g.shadowBlur = 18;
  g.fillText(text, 128, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(8, 3, 1);
  s.position.copy(ort);
  szene.add(s);
  W.schweber.push({ s, t: 0, y: ort.y });
}

// ───────────────────────── Türme (ein Turm je Video) ─────────────────────────
const TURM_GEO = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
const TURM_FRAGMENT = `uniform vec3 uFarbe, uGroesse; uniform float uZeit, uPuls, uHover, uSaat; ${NEBEL_GLSL}
  varying vec3 vLokal; varying vec3 vNormale; varying vec3 vWelt;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 p = vLokal * uGroesse;
    vec3 f = vec3(0.01, 0.012, 0.03);
    if (vNormale.y > 0.5) f = uFarbe * 1.5;
    else if (vNormale.y < -0.5) f = vec3(0.0);
    else {
      float u = abs(vNormale.x) > 0.5 ? p.z : p.x;
      float seite = vNormale.x + vNormale.z * 3.0;
      vec2 k = vec2(u * 1.7, p.y * 1.15);
      vec2 zelle = floor(k), q = fract(k);
      float fenster = step(0.2, q.x) * step(q.x, 0.8) * step(0.28, q.y) * step(q.y, 0.78);
      float an = step(0.45, hash(zelle + vec2(uSaat, seite)));
      float flackern = 0.7 + 0.3 * sin(uZeit * 1.7 + hash(zelle.yx + uSaat) * 40.0);
      f += uFarbe * fenster * an * flackern * (0.12 + 0.45 * vLokal.y);
      float kante = max(smoothstep(0.12, 0.0, 0.5 * uGroesse.x - abs(u)), smoothstep(0.2, 0.0, uGroesse.y - p.y));
      f += uFarbe * kante * 1.8;
      f += uFarbe * smoothstep(1.4, 0.0, p.y) * 0.3;
      float scan = smoothstep(0.4, 0.0, abs(fract(uZeit * 0.09 + uSaat * 0.37) * (uGroesse.y + 4.0) - 2.0 - p.y));
      f += uFarbe * scan * 0.9;
    }
    f += uFarbe * (uPuls * 1.4 + uHover * 0.5);
    gl_FragColor = vec4(nebeln(f, vWelt), 1.0);
    #include <colorspace_fragment>
  }`;
const turmMaterial = (farbe) => new THREE.ShaderMaterial({
  uniforms: { uFarbe: { value: farbe.clone() }, uGroesse: { value: new THREE.Vector3(BREITE, 0.01, BREITE) }, uZeit: ZEIT, uPuls: { value: 0 }, uHover: { value: 0 }, uSaat: { value: Math.random() * 100 }, ...nebelUniforms() },
  vertexShader: WELT_VERTEX, fragmentShader: TURM_FRAGMENT,
});
const hoeheAus = (views) => 2 + Math.pow(Math.log10(Math.max(0, views || 0) + 1), 1.6) * 3.2;

function turmNeu(post) {
  const mat = turmMaterial(FARBE[post.kanal] || CYAN);
  const koerper = new THREE.Mesh(TURM_GEO, mat);
  koerper.scale.set(BREITE, 0.01, BREITE);
  const gruppe = new THREE.Group();
  gruppe.add(koerper);
  szene.add(gruppe);
  const t = { gruppe, koerper, mat, post, hoehe: 0.01, ziel: hoeheAus(post.views), puls: 0, verz: 0, label: null, labelText: "", zielPos: new THREE.Vector3(), weg: false };
  koerper.userData.turm = t;
  return t;
}

function turmSpitze(t) { return new THREE.Vector3(t.gruppe.position.x, t.hoehe + 0.5, t.gruppe.position.z); }

function labelSetzen(t, sichtbar) {
  if (!sichtbar) { if (t.label) t.label.visible = false; return; }
  if (!t.label) {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 128;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    t.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    t.label.scale.set(7.6, 3.8, 1);
    t.label.userData.c = c;
    t.gruppe.add(t.label);
  }
  t.label.visible = true;
  const text = kurzZahl(t.post.views);
  if (t.labelText === text + t.post.titel) return;
  t.labelText = text + t.post.titel;
  const c = t.label.userData.c, g = c.getContext("2d"), f = hex(FARBE[t.post.kanal] || CYAN);
  g.clearRect(0, 0, 256, 128);
  g.textAlign = "center";
  g.font = "700 54px 'Space Grotesk', sans-serif"; g.fillStyle = f; g.shadowColor = f; g.shadowBlur = 16;
  g.fillText(text, 128, 62);
  g.shadowBlur = 0; g.font = "500 19px 'Space Grotesk', sans-serif"; g.fillStyle = "#dfe3f2";
  g.fillText(kurzTitel(t.post.titel), 128, 100);
  t.label.material.map.needsUpdate = true;
}

function turmEntfernen(t) {
  szene.remove(t.gruppe);
  t.mat.dispose();
  if (t.label) { t.label.material.map.dispose(); t.label.material.dispose(); }
  W.tuerme.delete(t.post.post_id);
  if (W.gewaehlt === t) karteSchliessen();
}

// Aus den Zahlen (ZS.zahlen.posts) die Stadt bauen bzw. nachziehen: Simulierbar links der Allee, Stell dir vor rechts,
// das neueste Video ganz vorn. Mehr Views → der Turm wächst und pulsiert, dazu „+N“ über dem Dach.
function stadtBauen() {
  const posts = ((typeof ZS !== "undefined" && ZS.zahlen?.posts) || []).slice().sort((a, b) => String(b.gesendet).localeCompare(String(a.gesendet)));
  const zaehler = { "-1": 0, 1: 0 }, da = new Set();
  let neuIndex = 0;
  posts.forEach((p) => {
    let t = W.tuerme.get(p.post_id);
    const istNeu = !t;
    const seite = p.kanal === "stelldirvor.pov" ? 1 : -1;
    const i = zaehler[seite]++;
    if (istNeu) {
      t = turmNeu(p);
      W.tuerme.set(p.post_id, t);
      t.verz = W.gebaut ? 0.2 : 0.6 + neuIndex++ * 0.08;
    }
    const vorher = t.post.views;
    t.post = p;
    t.weg = false;
    t.zielPos.set(seite * (8 + (i % 2) * 6.5), 0, 10 - Math.floor(i / 2) * ABSTAND_Z);
    if (istNeu) t.gruppe.position.copy(t.zielPos);
    t.ziel = hoeheAus(p.views);
    if (!istNeu && p.views > vorher) {
      t.puls = 1;
      schweber(turmSpitze(t).add(new THREE.Vector3(0, 4, 0)), `+${kurzZahl(p.views - vorher)}`, FARBE[p.kanal] || CYAN);
      spruehen(turmSpitze(t), { anzahl: 40, farben: [FARBE[p.kanal] || CYAN, GOLD], tempo: 9, leben: 1.3 });
    }
    if (istNeu && W.gebaut) welle(new THREE.Vector3(t.zielPos.x, 0.06, t.zielPos.z), FARBE[p.kanal] || CYAN, 22);
    da.add(p.post_id);
  });
  for (const t of W.tuerme.values()) if (!da.has(t.post.post_id)) t.weg = true;
  W.tiefe = Math.max(30, Math.ceil(Math.max(zaehler["-1"], zaehler[1]) / 2) * ABSTAND_Z);
  posts.forEach((p, i) => labelSetzen(W.tuerme.get(p.post_id), i < 24));
  W.gebaut = W.gebaut || posts.length > 0;
  hudZeichnen();
}

function tuermeBewegen(dt, zeit) {
  for (const t of [...W.tuerme.values()]) {
    if (t.verz > 0) { t.verz -= dt; continue; }
    const ziel = t.weg ? 0.01 : t.ziel;
    const vorher = t.hoehe;
    t.hoehe += (ziel - t.hoehe) * (1 - Math.exp(-dt * 2.4));
    t.koerper.scale.y = t.hoehe;
    t.mat.uniforms.uGroesse.value.y = t.hoehe;
    t.gruppe.position.lerp(t.zielPos, 1 - Math.exp(-dt * 3));
    if (t.hoehe - vorher > dt * 2 && Math.random() < dt * 22) spruehen(turmSpitze(t), { anzahl: 3, farben: [FARBE[t.post.kanal] || CYAN], tempo: 4, leben: 0.9, groesse: 0.9 });
    t.puls = Math.max(0, t.puls - dt * 0.7);
    t.mat.uniforms.uPuls.value = t.puls * (0.6 + 0.4 * Math.sin(zeit * 12));
    const h = W.hover === t || W.gewaehlt === t ? 1 : 0;
    t.mat.uniforms.uHover.value += (h - t.mat.uniforms.uHover.value) * (1 - Math.exp(-dt * 10));
    if (t.label) t.label.position.y = t.hoehe + 2.8 + Math.sin(zeit * 1.3 + t.mat.uniforms.uSaat.value) * 0.25;
    if (t.weg && t.hoehe < 0.05) turmEntfernen(t);
  }
}

// ───────────────────────── Baustelle (laufender Render) ─────────────────────────
const B = { gruppe: null, fuellung: null, ring: null, label: null, labelText: "", aktiv: false, ziel: 0, wert: 0, sicht: 0, projekt: "", fertigT: -1 };
function baustelleBauen() {
  B.gruppe = new THREE.Group();
  B.gruppe.position.set(0, 0, 18);
  const pkt = [], b = 2.3, H = BAUSTELLE_HOEHE, ecken = [[-b, -b], [b, -b], [b, b], [-b, b]];
  for (let y = 0; y <= H + 0.01; y += 2.6) {
    for (let k = 0; k < 4; k++) {
      const [x1, z1] = ecken[k], [x2, z2] = ecken[(k + 1) % 4];
      pkt.push(x1, y, z1, x2, y, z2);
      if (y + 2.6 <= H + 0.01) pkt.push(x1, y, z1, x2, y + 2.6, z2);
    }
  }
  for (const [x, z] of ecken) pkt.push(x, 0, z, x, H, z);
  const geruest = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pkt, 3)), new THREE.LineBasicMaterial({ color: GOLD.clone().multiplyScalar(1.4), transparent: true, opacity: 0.75 }));
  B.fuellung = new THREE.Mesh(TURM_GEO, turmMaterial(GOLD));
  B.fuellung.scale.set(4, 0.01, 4);
  B.ring = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.09, 6, 80), new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(2.2) }));
  B.ring.rotation.x = Math.PI / 2;
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  B.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  B.label.scale.set(14, 3.5, 1);
  B.label.position.y = H + 4;
  B.label.userData.c = c;
  B.gruppe.add(geruest, B.fuellung, B.ring, B.label);
  B.gruppe.scale.setScalar(0.001);
  B.gruppe.visible = false;
  szene.add(B.gruppe);
}

function baustelleAktualisieren() {
  const job = (S.render?.auftraege || []).find((a) => a.status === "laeuft" && !(typeof haengt === "function" && haengt(a)));
  B.aktiv = !!job;
  if (job) {
    B.ziel = clamp((job.prozent || 0) / 100, 0, 1);
    B.projekt = job.projekt || "";
  }
}

function baustelleBewegen(dt, zeit) {
  const sichtbar = B.aktiv || B.fertigT >= 0;
  B.sicht += ((sichtbar ? 1 : 0) - B.sicht) * (1 - Math.exp(-dt * 3));
  B.gruppe.visible = B.sicht > 0.01;
  if (!B.gruppe.visible) return;
  B.gruppe.scale.setScalar(Math.max(0.001, B.sicht));
  const ziel = B.fertigT >= 0 ? 1 : B.ziel;
  B.wert += (ziel - B.wert) * (1 - Math.exp(-dt * 2));
  const h = Math.max(0.01, B.wert * BAUSTELLE_HOEHE);
  B.fuellung.scale.y = h;
  B.fuellung.material.uniforms.uGroesse.value.set(4, h, 4);
  B.ring.position.y = h + Math.sin(zeit * 3) * 0.3;
  B.ring.rotation.z += dt * 2.5;
  B.fuellung.material.uniforms.uPuls.value = B.fertigT >= 0 ? Math.max(0, 1 - B.fertigT) * 1.5 : 0.15 + 0.1 * Math.sin(zeit * 4);
  if (B.aktiv && Math.random() < dt * 14) spruehen(new THREE.Vector3((Math.random() - 0.5) * 4, h, 18 + (Math.random() - 0.5) * 4), { anzahl: 2, farben: [GOLD], tempo: 5, leben: 0.8, groesse: 0.8, schwerkraft: -12 });
  if (B.fertigT >= 0) {
    B.fertigT += dt;
    if (B.fertigT > 3.5) B.fertigT = -1;
  }
  const text = B.fertigT >= 0 ? "🎬 FERTIG!" : `🎬 ${Math.round(B.ziel * 100)} %  ·  ${kurzTitel(B.projekt, 18)}`;
  if (text !== B.labelText) {
    B.labelText = text;
    const c = B.label.userData.c, g = c.getContext("2d");
    g.clearRect(0, 0, 512, 128);
    g.textAlign = "center"; g.font = "700 50px 'Space Grotesk', sans-serif"; g.fillStyle = "#ffd166"; g.shadowColor = "#ffd166"; g.shadowBlur = 18;
    g.fillText(text, 256, 80);
    B.label.material.map.needsUpdate = true;
  }
}

// ───────────────────────── Claude-Kern ─────────────────────────
const K = { gruppe: null, huelle: null, innen: null, ringe: [], farbe: CYAN.clone(), ziel: CYAN.clone(), puls: 0, fehlerBis: 0 };
function kernBauen() {
  K.gruppe = new THREE.Group();
  K.gruppe.position.set(0, 30, -30);
  K.huelle = new THREE.Mesh(new THREE.IcosahedronGeometry(4.6, 1), new THREE.MeshBasicMaterial({ color: CYAN.clone(), wireframe: true, transparent: true, opacity: 0.9 }));
  K.innen = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 2), new THREE.MeshBasicMaterial({ color: CYAN.clone() }));
  for (const [r, f] of [[7.2, PINK], [9, VIOLETT]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.07, 6, 140), new THREE.MeshBasicMaterial({ color: f.clone().multiplyScalar(1.5) }));
    K.ringe.push(ring);
  }
  K.gruppe.add(K.huelle, K.innen, ...K.ringe);
  szene.add(K.gruppe);
}

function kernBewegen(dt, zeit) {
  const tempo = W.claudeAktiv ? 1.7 : 0.25;
  K.huelle.rotation.y += dt * tempo;
  K.huelle.rotation.x += dt * tempo * 0.4;
  K.ringe[0].rotation.x = Math.PI / 2 + Math.sin(zeit * 0.5) * 0.35;
  K.ringe[0].rotation.z += dt * tempo * 0.8;
  K.ringe[1].rotation.y += dt * tempo * 0.6;
  K.ringe[1].rotation.x = Math.sin(zeit * 0.3) * 0.9;
  const ziel = performance.now() < K.fehlerBis ? ROT : K.ziel;
  K.farbe.lerp(ziel, 1 - Math.exp(-dt * 3));
  K.puls = Math.max(0, K.puls - dt * 1.8);
  K.huelle.material.color.copy(K.farbe).multiplyScalar(1.2 + K.puls);
  K.innen.material.color.copy(K.farbe).multiplyScalar(1.8 + K.puls * 3 + (W.claudeAktiv ? 0.6 * Math.sin(zeit * 6) : 0));
  K.gruppe.scale.setScalar(1 + K.puls * 0.22 + (W.claudeAktiv ? Math.sin(zeit * 6) * 0.03 : 0));
  K.gruppe.position.y = 30 + Math.sin(zeit * 0.8) * 0.8;
}

// Ein Claude-Werkzeug: Datenstrom vom Kern zur Baustelle bzw. zu einem der neuesten Türme
function datenstrom() {
  const tuerme = [...W.tuerme.values()].filter((t) => !t.weg);
  const ziel = B.aktiv ? new THREE.Vector3(0, B.wert * BAUSTELLE_HOEHE + 1, 18)
    : tuerme.length ? turmSpitze(tuerme[Math.floor(Math.random() * Math.min(tuerme.length, 12))]) : new THREE.Vector3((Math.random() - 0.5) * 30, 0.5, 0);
  const von = K.gruppe.position.clone(), dauer = 0.9;
  spruehen(von, { anzahl: 22, richtung: ziel.sub(von).divideScalar(dauer), streuung: 3, schwerkraft: 0, zug: 0, leben: dauer, groesse: 1.1, farben: [K.farbe.clone(), new THREE.Color("#ffffff")] });
  K.puls = 1;
}

// ───────────────────────── Kamera ─────────────────────────
function stadtZentrum() { return new THREE.Vector3(0, 6, 10 - W.tiefe / 2); }
function blick(ansicht) {
  switch (ansicht) {
    case "studio": return { pos: [-34, 20, 32], ziel: [6, 8, -30] };
    case "zahlen": return { pos: [0, 60, 46], ziel: [0, 0, 10 - W.tiefe / 2] };
    case "lernen": return { pos: [18, 34, 0], ziel: [0, 30, -30] };
    default: return { pos: [0, 5, 60], ziel: [0, 14, -60] }; // Skyline vor dem Sonnenuntergang, hinter der Bühne
  }
}
function kameraFuehren(dt, zeit) {
  if (W.stadt) {
    const o = W.orbit;
    if (!o.ziehen && performance.now() - o.ruhe > 4000) o.az += dt * 0.06;
    const z = stadtZentrum();
    sollZiel.copy(z);
    sollPos.set(z.x + Math.sin(o.az) * Math.cos(o.el) * o.dist, z.y + Math.sin(o.el) * o.dist, z.z + Math.cos(o.az) * Math.cos(o.el) * o.dist);
  } else {
    const b = blick(W.ansicht);
    sollPos.set(...b.pos);
    sollZiel.set(...b.ziel);
    sollPos.x += Math.sin(zeit * 0.07) * 3 + W.maus.x * 3.5;
    sollPos.y += Math.sin(zeit * 0.11) * 1.2 - W.maus.y * 2;
  }
  const k = 1 - Math.exp(-dt * (W.stadt && W.orbit.ziehen ? 8 : 1.3));
  kamera.position.lerp(sollPos, k);
  istZiel.lerp(sollZiel, k);
  if (W.wackeln > 0) {
    kamera.position.x += (Math.random() - 0.5) * W.wackeln;
    kamera.position.y += (Math.random() - 0.5) * W.wackeln;
    W.wackeln = Math.max(0, W.wackeln - dt * 2.5);
  }
  kamera.lookAt(istZiel);
  if (W.warpT < 1) { W.warpT = Math.min(1, W.warpT + dt / 0.9); W.warp = Math.sin(W.warpT * Math.PI); } else W.warp = 0;
  const fov = 58 + W.warp * 24;
  if (Math.abs(kamera.fov - fov) > 0.01) { kamera.fov = fov; kamera.updateProjectionMatrix(); }
}

// ───────────────────────── Stadt-Modus (Oberfläche ausblenden, Stadt begehbar) ─────────────────────────
const strahl = new THREE.Raycaster(), ndc = new THREE.Vector2();
function turmUnter(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  strahl.setFromCamera(ndc, kamera);
  const treffer = strahl.intersectObjects([...W.tuerme.values()].filter((t) => !t.weg).map((t) => t.koerper), false)[0];
  return treffer?.object.userData.turm || null;
}

function stadtModus(an) {
  an = !!an;
  if (an === W.stadt) return;
  if (an && W.stufe === "aus") { toast("🌐", "3D-Welt ist aus", "Mit ✨ wieder einschalten.", ""); return; }
  W.stadt = an;
  document.body.classList.toggle("stadt", an);
  $("stadt-hud").hidden = !an;
  $("k-welt").classList.toggle("an", an);
  W.warpT = 0;
  Ton?.whoosh?.();
  if (an) {
    // Anflug auf eine Übersicht schräg von vorn; danach dreht sich die Kamera langsam, bis du ziehst
    const z = stadtZentrum();
    Object.assign(W.orbit, { dist: 70 + W.tiefe * 0.6, el: 0.38, az: 0.42, ruhe: performance.now() });
    welle(new THREE.Vector3(z.x, 0.06, z.z), CYAN, 90, 1.8);
    hudZeichnen();
  } else {
    karteSchliessen();
    W.hover = null;
    leinwand.classList.remove("zeiger", "ziehen");
  }
}

function hudZeichnen() {
  if (!$("stadt-info")) return;
  const posts = (typeof ZS !== "undefined" && ZS.zahlen?.posts) || [];
  const summe = posts.reduce((a, p) => a + (p.views || 0), 0);
  const top = posts.reduce((a, p) => (p.views > (a?.views ?? -1) ? p : a), null);
  $("stadt-info").textContent = posts.length
    ? `${posts.length} Videos · ${zahl(summe)} Views in 30 Tagen · höchster Turm: ${kurzZahl(top.views)} (${kurzTitel(top.titel, 32)})`
    : "Noch keine Videozahlen. Sie kommen über Buffer, sobald der Schlüssel in der .env steht.";
}

function karteZeigen(t) {
  W.gewaehlt = t;
  const p = t.post, k = $("stadt-karte");
  const datum = p.gesendet ? new Date(p.gesendet).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  const wert = (v, s = "") => (v === null || v === undefined ? "–" : zahl(v) + s);
  k.className = `stadt-karte ${p.kanal === "stelldirvor.pov" ? "acc2" : "acc1"}`;
  k.innerHTML = `
    <div class="zeile"><span class="chip ${p.kanal === "stelldirvor.pov" ? "acc2" : "acc1"}">${esc(KANAL_NAME[p.kanal] || p.kanal)}</span><small>${esc(datum)}</small><button class="icon-knopf" data-zu title="Schließen">✕</button></div>
    <b class="stadt-karte-titel">${esc(p.titel)}</b>
    <div class="stadt-werte">
      <div class="gross"><b>${wert(p.views)}</b><small>Views</small></div>
      <div><b>${wert(p.likes)}</b><small>Likes</small></div>
      <div><b>${wert(p.kommentare)}</b><small>Kommentare</small></div>
      <div><b>${wert(p.shares)}</b><small>Shares</small></div>
      <div><b>${wert(p.saves)}</b><small>Gespeichert</small></div>
      <div><b>${wert(p.gesehen_prozent, " %")}</b><small>Ø gesehen</small></div>
    </div>
    ${p.link ? `<a class="knopf klein glanz" href="${esc(p.link)}" target="_blank" rel="noopener">Auf TikTok ansehen ↗</a>` : ""}`;
  k.hidden = false;
  k.classList.remove("rein"); void k.offsetWidth; k.classList.add("rein");
  Ton?.blip?.();
  spruehen(turmSpitze(t), { anzahl: 50, farben: [FARBE[p.kanal] || CYAN, new THREE.Color("#ffffff")], tempo: 10, leben: 1.2 });
}
function karteSchliessen() { W.gewaehlt = null; if ($("stadt-karte")) $("stadt-karte").hidden = true; }

leinwand.addEventListener("pointerdown", (e) => {
  if (!W.stadt) return;
  W.orbit.ziehen = { x: e.clientX, y: e.clientY, az: W.orbit.az, el: W.orbit.el, weg: 0 };
  leinwand.setPointerCapture(e.pointerId);
  leinwand.classList.add("ziehen");
});
leinwand.addEventListener("pointermove", (e) => {
  if (!W.stadt) return;
  const z = W.orbit.ziehen;
  if (z) {
    z.weg = Math.max(z.weg, Math.hypot(e.clientX - z.x, e.clientY - z.y));
    W.orbit.az = z.az - (e.clientX - z.x) * 0.006;
    W.orbit.el = clamp(z.el + (e.clientY - z.y) * 0.004, 0.06, 1.35);
    return;
  }
  W.hover = turmUnter(e);
  leinwand.classList.toggle("zeiger", !!W.hover);
});
leinwand.addEventListener("pointerup", (e) => {
  const z = W.orbit.ziehen;
  W.orbit.ziehen = null;
  W.orbit.ruhe = performance.now();
  leinwand.classList.remove("ziehen");
  if (!W.stadt || !z || z.weg > 6) return;
  const t = turmUnter(e);
  if (t) karteZeigen(t); else karteSchliessen();
});
leinwand.addEventListener("wheel", (e) => {
  if (!W.stadt) return;
  e.preventDefault();
  W.orbit.dist = clamp(W.orbit.dist * (1 + e.deltaY * 0.0012), 25, 230);
  W.orbit.ruhe = performance.now();
}, { passive: false });
$("stadt-karte").addEventListener("click", (e) => { if (e.target.closest("[data-zu]")) karteSchliessen(); });
$("k-stadt-zurueck").addEventListener("click", () => stadtModus(false));
$("k-welt").addEventListener("click", () => stadtModus(!W.stadt));
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && W.stadt && !document.querySelector("dialog[open]")) stadtModus(false); });
addEventListener("pointermove", (e) => { W.maus.x = (e.clientX / innerWidth) * 2 - 1; W.maus.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

// ───────────────────────── Stufen und Leistung ─────────────────────────
const laptopRendert = () => !!(S.live?.aktiv || (S.render?.rechner || []).some((r) => r.lokal && r.online && r.daten?.status === "rendert"));

function groesseSetzen() {
  const st = STUFEN[W.stufe];
  if (!st) return;
  const pr = Math.min(devicePixelRatio || 1, st.pr * (W.stufe === "ultra" ? W.prFaktor : 1));
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  T.mat.uniforms.uPixel.value = pr;
}

function stufeKnopf() {
  const [name, text] = WAHL_TEXT[W.wahl];
  $("k-welt-stufe").title = `3D-Qualität: ${name} (${text})${W.wahl === "auto" && W.stufe ? ` · gerade ${STUFEN[W.stufe]?.name || "aus"}` : ""} · klicken zum Wechseln`;
  $("k-welt-stufe").classList.toggle("aus", W.wahl === "aus");
}

function stufeBestimmen() {
  let st = W.wahl === "auto" ? (laptopRendert() ? "sparsam" : "ultra") : W.wahl;
  if (st === "ultra" && matchMedia("(prefers-reduced-motion: reduce)").matches) st = "sparsam";
  if (st !== W.stufe) {
    const vorher = W.stufe;
    W.stufe = st;
    const aus = st === "aus";
    document.body.classList.toggle("welt-an", !aus);
    document.body.classList.toggle("welt-sparsam", st === "sparsam");
    leinwand.hidden = aus;
    $("k-welt").hidden = aus;
    if (aus && W.stadt) stadtModus(false);
    if (!aus) groesseSetzen();
    if (W.wahl === "auto" && vorher === "ultra" && st === "sparsam") tickerNeu("🌐 3D-Welt läuft sparsam, solange der Laptop rendert");
    if (W.wahl === "auto" && vorher === "sparsam" && st === "ultra") tickerNeu("🌐 Laptop rendert nicht mehr: 3D-Welt wieder in voller Pracht");
  }
  stufeKnopf();
}

$("k-welt-stufe").addEventListener("click", () => {
  W.wahl = WAHL[(WAHL.indexOf(W.wahl) + 1) % WAHL.length];
  lokal.schreiben("welt-stufe", W.wahl);
  W.prFaktor = 1;
  stufeBestimmen();
  const [name, text] = WAHL_TEXT[W.wahl];
  toast("✨", `3D-Welt: ${name}`, text, "meilenstein");
  Ton?.klick?.();
});
addEventListener("resize", groesseSetzen);
setInterval(stufeBestimmen, 5000);

// Bildrate messen: Ultra wird bei Ruckeln von selbst feiner aufgelöst gerendert, erholt sich langsam wieder
function messen(dt, jetzt) {
  if (dt < 0.25) W.zeiten.push(dt);
  if (jetzt - W.messung < 4000) return;
  W.messung = jetzt;
  if (W.stufe !== "ultra" || W.zeiten.length < 20) { W.zeiten = []; return; }
  const schnitt = W.zeiten.reduce((a, b) => a + b, 0) / W.zeiten.length;
  W.zeiten = [];
  if (schnitt > 1 / 34 && W.prFaktor > 0.5) { W.prFaktor = Math.max(0.5, W.prFaktor - 0.15); groesseSetzen(); }
  else if (schnitt < 1 / 55 && W.prFaktor < 1) { W.prFaktor = Math.min(1, W.prFaktor + 0.05); groesseSetzen(); }
}

// ───────────────────────── Bildschleife ─────────────────────────
let letzte = 0;
function schleife(jetzt) {
  requestAnimationFrame(schleife);
  const st = STUFEN[W.stufe];
  if (!st || document.hidden) return;
  if (jetzt - letzte < 1000 / st.fps - 2) return;
  const dt = letzte ? Math.min(0.1, (jetzt - letzte) / 1000) : 1 / 60;
  if (letzte) messen((jetzt - letzte) / 1000, jetzt);
  letzte = jetzt;
  const zeit = jetzt / 1000;
  ZEIT.value = zeit;

  const tempo = 1 + (W.claudeAktiv ? 1 : 0) + (B.aktiv ? 1.5 : 0) + W.warp * 12;
  W.lauf += dt * tempo * 4;
  bodenMat.uniforms.uLauf.value = W.lauf;
  sterne.rotation.y += dt * 0.004;
  const p = schwebe.geometry.attributes.position, n = Math.round(SCHWEBE_N * st.partikel);
  schwebe.geometry.setDrawRange(0, n);
  for (let i = 0; i < n; i++) {
    let y = p.getY(i) + dt * (1 + (i % 7) * 0.35) * tempo;
    if (y > 70) y = 0;
    p.setY(i, y);
  }
  p.needsUpdate = true;

  tuermeBewegen(dt, zeit);
  baustelleBewegen(dt, zeit);
  kernBewegen(dt, zeit);
  partikelBewegen(dt);
  for (const w of [...W.wellen]) {
    w.t += dt;
    const a = Math.min(1, w.t / w.dauer);
    w.m.scale.setScalar(1 + (1 - Math.pow(1 - a, 3)) * w.groesse);
    w.m.material.opacity = 1 - a;
    if (a >= 1) { szene.remove(w.m); w.m.material.dispose(); W.wellen.splice(W.wellen.indexOf(w), 1); }
  }
  for (const s of [...W.strahlen]) {
    s.t += dt;
    s.m.material.opacity = Math.max(0, 0.9 * (1 - s.t / 2.6));
    s.m.scale.x = s.m.scale.z = 1 + s.t * 0.6;
    if (s.t > 2.6) { szene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); W.strahlen.splice(W.strahlen.indexOf(s), 1); }
  }
  for (const s of [...W.schweber]) {
    s.t += dt;
    s.s.position.y = s.y + s.t * 3.2;
    s.s.material.opacity = Math.max(0, 1 - s.t / 2.4);
    if (s.t > 2.4) { szene.remove(s.s); s.s.material.map.dispose(); s.s.material.dispose(); W.schweber.splice(W.schweber.indexOf(s), 1); }
  }
  kameraFuehren(dt, zeit);

  if (st.bloom) composer.render(); else renderer.render(szene, kamera);
}

// ───────────────────────── Ereignisse aus dem Cockpit ─────────────────────────
const bezirk = (kanal) => new THREE.Vector3(kanal === "stelldirvor.pov" ? 15 : -15, 34, 10 - W.tiefe / 3);

document.addEventListener("cockpit:verbunden", (ev) => {
  const es = ev.detail;
  const an = (art, f) => es.addEventListener(art, (e) => { try { f(JSON.parse(e.data)); } catch (err) { console.error("welt", art, err); } });
  an("zustand", (z) => { W.claudeAktiv = !!z.claude?.laeuft; stadtBauen(); baustelleAktualisieren(); stufeBestimmen(); });
  an("zahlen", () => stadtBauen());
  an("zahlen_puls", (z) => {
    if (z.art !== "follower") return;
    feuerwerk(bezirk(z.kanal));
    schweber(bezirk(z.kanal).add(new THREE.Vector3(0, 6, 0)), `+${z.plus} 👥`, FARBE[z.kanal] || CYAN);
  });
  an("mission_erreicht", () => {
    feuerwerk(new THREE.Vector3(0, 40, 10 - W.tiefe / 2), true);
    welle(new THREE.Vector3(0, 0.06, 10 - W.tiefe / 2), GOLD, 140, 2.2);
    W.wackeln = 1.6;
  });
  an("render", () => { baustelleAktualisieren(); stufeBestimmen(); });
  an("live", () => stufeBestimmen());
  an("meilenstein", (m) => {
    const fuss = new THREE.Vector3(0, 0.06, 18);
    if (m.art === "render_start") { welle(fuss, GOLD, 40); spruehen(new THREE.Vector3(0, 2, 18), { anzahl: 80, farben: [GOLD], tempo: 12, leben: 1.2 }); }
    if (m.art === "render_fertig") {
      B.fertigT = 0;
      const spitze = new THREE.Vector3(0, BAUSTELLE_HOEHE + 2, 18);
      feuerwerk(spitze.clone().setY(BAUSTELLE_HOEHE + 10), true);
      lichtstrahl(new THREE.Vector3(0, BAUSTELLE_HOEHE, 18));
      welle(fuss, GOLD, 90, 1.8);
      W.wackeln = 0.8;
    }
    if (m.art === "render_fehler") { K.fehlerBis = performance.now() + 2500; W.wackeln = 0.6; }
  });
  an("xp", (x) => {
    welle(new THREE.Vector3(0, 0.06, 26), GOLD, x.levelup ? 120 : 26, x.levelup ? 2.2 : 1.1);
    if (x.levelup) { feuerwerk(new THREE.Vector3(0, 36, -10), true); W.wackeln = 1.2; }
  });
  an("erfolg", () => feuerwerk(new THREE.Vector3(0, 38, -20)));
  an("claude", (c) => { W.claudeAktiv = !!c.laeuft; });
});

document.addEventListener("cockpit:feed", (ev) => {
  const e = ev.detail;
  if (e.art === "werkzeug") datenstrom();
  else if (e.art === "modell") { K.ziel.copy(MODELL_FARBE[e.modell] || CYAN); K.puls = 1; }
  else if (e.art === "auftrag" || e.art === "du") K.puls = 1;
  else if (e.art === "fertig") { K.puls = 1.5; spruehen(K.gruppe.position, { anzahl: 120, farben: [K.farbe.clone(), GOLD, new THREE.Color("#ffffff")], tempo: 16, leben: 1.6 }); }
  else if (e.art === "fehler") { K.fehlerBis = performance.now() + 2500; W.wackeln = 0.5; }
});

document.addEventListener("cockpit:ansicht", (ev) => {
  W.ansicht = ev.detail;
  W.warpT = 0;
  if (W.stadt) stadtModus(false);
});

document.fonts?.ready.then(() => { for (const t of W.tuerme.values()) t.labelText = ""; stadtBauen(); });

// ───────────────────────── Start ─────────────────────────
himmelBauen();
sonneBauen();
bergeBauen();
sterneBauen();
bodenBauen();
schwebeteilchenBauen();
partikelBauen();
baustelleBauen();
kernBauen();
stufeBestimmen();
requestAnimationFrame(schleife);

window.Welt = {
  stadt: stadtModus,
  feuerwerk: () => feuerwerk(new THREE.Vector3(0, 36, -10), true),
  get stufe() { return W.stufe; },
  // Für Tests: wo die Türme gerade auf dem Bildschirm stehen (Mitte des Turms, CSS-Pixel)
  tuermeAufBildschirm: () => [...W.tuerme.values()].map((t) => {
    const v = new THREE.Vector3(t.gruppe.position.x, t.hoehe / 2, t.gruppe.position.z).project(kamera);
    return { titel: t.post.titel, views: t.post.views, x: Math.round((v.x + 1) / 2 * innerWidth), y: Math.round((1 - v.y) / 2 * innerHeight) };
  }),
};
