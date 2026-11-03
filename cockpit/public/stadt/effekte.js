// Partikel und Effekte der Neon-Stadt (aus der ersten 3D-Welt übernommen): Feuerwerk, Funken, Datenströme, Wellen, Lichtstrahlen,
// aufsteigende Zahlen.
import * as THREE from "three";
import { szene, CYAN, PINK, GOLD, VIOLETT, GRUEN, hex, SCHRIFT } from "./kern.js";

export const EFFEKT = { menge: 1 }; // Anteil der Partikel je Qualitätsstufe
const POOL = 3000;
const T = {
  pos: new Float32Array(POOL * 3), farbe: new Float32Array(POOL * 3), groesse: new Float32Array(POOL), alpha: new Float32Array(POOL),
  v: new Float32Array(POOL * 3), leben: new Float32Array(POOL), max: new Float32Array(POOL), schwer: new Float32Array(POOL), zug: new Float32Array(POOL),
  start: new Float32Array(POOL), naechster: 0, mat: null, geo: null,
};
const wellen = [], strahlen = [], schweber = [];

export function effekteBauen(ziel = szene) {
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
  ziel.add(punkte);
}
export const pixelSetzen = (pr) => { if (T.mat) T.mat.uniforms.uPixel.value = pr; };

export function spruehen(ort, o = {}) {
  const { farben = [CYAN, PINK, GOLD], tempo = 14, schwerkraft = -9, leben = 1.6, groesse = 1.2, richtung = null, streuung = 1, zug = 0.9 } = o;
  const anzahl = Math.round((o.anzahl ?? 60) * EFFEKT.menge);
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

export function feuerwerk(ort, gross = false, ton = null) {
  const salven = gross ? 5 : 2;
  for (let s = 0; s < salven; s++) {
    setTimeout(() => {
      const o = ort.clone().add(new THREE.Vector3((Math.random() - 0.5) * (gross ? 40 : 12), (Math.random() - 0.3) * 10, (Math.random() - 0.5) * 12));
      const farbe = [CYAN, PINK, GOLD, VIOLETT, GRUEN][Math.floor(Math.random() * 5)];
      spruehen(o, { anzahl: gross ? 240 : 130, farben: [farbe, farbe, new THREE.Color("#ffffff")], tempo: gross ? 28 : 19, schwerkraft: -6, leben: 2.3, groesse: 1.6 });
      if (ton && s > 0) ton();
    }, s * (gross ? 320 : 260));
  }
}

const RING_GEO = new THREE.RingGeometry(0.93, 1, 96);
export function welle(ort, farbe = CYAN, groesse = 60, dauer = 1.4, ziel = szene) {
  const m = new THREE.Mesh(RING_GEO, new THREE.MeshBasicMaterial({ color: farbe.clone().multiplyScalar(1.6), transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2;
  m.position.copy(ort);
  ziel.add(m);
  wellen.push({ m, t: 0, groesse, dauer });
}

export function lichtstrahl(ort, farbe = GOLD) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2.6, 240, 20, 1, true), new THREE.MeshBasicMaterial({ color: farbe.clone().multiplyScalar(2), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(ort.x, ort.y + 120, ort.z);
  szene.add(m);
  strahlen.push({ m, t: 0 });
}

export function schwebetext(ort, text, farbe) {
  const c = document.createElement("canvas");
  c.width = 320; c.height = 96;
  const g = c.getContext("2d");
  g.font = `700 58px ${SCHRIFT}`; g.textAlign = "center"; g.fillStyle = hex(farbe); g.shadowColor = hex(farbe); g.shadowBlur = 18;
  g.fillText(text, 160, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false }));
  s.scale.set(10, 3, 1);
  s.position.copy(ort);
  szene.add(s);
  schweber.push({ s, t: 0, y: ort.y });
}

export function effekteBewegen(dt) {
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
  for (const w of [...wellen]) {
    w.t += dt;
    const a = Math.min(1, w.t / w.dauer);
    w.m.scale.setScalar(1 + (1 - Math.pow(1 - a, 3)) * w.groesse);
    w.m.material.opacity = 1 - a;
    if (a >= 1) { w.m.parent?.remove(w.m); w.m.material.dispose(); wellen.splice(wellen.indexOf(w), 1); }
  }
  for (const s of [...strahlen]) {
    s.t += dt;
    s.m.material.opacity = Math.max(0, 0.9 * (1 - s.t / 2.6));
    s.m.scale.x = s.m.scale.z = 1 + s.t * 0.6;
    if (s.t > 2.6) { szene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); strahlen.splice(strahlen.indexOf(s), 1); }
  }
  for (const s of [...schweber]) {
    s.t += dt;
    s.s.position.y = s.y + s.t * 3.2;
    s.s.material.opacity = Math.max(0, 1 - s.t / 2.4);
    if (s.t > 2.4) { szene.remove(s.s); s.s.material.map.dispose(); s.s.material.dispose(); schweber.splice(schweber.indexOf(s), 1); }
  }
}
