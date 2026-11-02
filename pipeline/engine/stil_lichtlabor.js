// Stil 20 „Glas & Licht“ (Lichtlabor; nur Simulierbar, Skill .claude/skills/simulierbar-video/stile.md):
// Messgefäße aus Glas im dunklen Labor, Dunkelfeld-Beleuchtung (Glas zeichnet sich nur über leuchtende Kanten),
// Geld als leuchtende Flüssigkeit in Teamfarbe (Füllstand = Live-Zähler), Zulauf-Strahl, aufsteigende Bläschen,
// Kaustik-Licht auf der spiegelnden Laborbank, Spot-Kegel von oben. Billiger und edler als echtes Glas mit
// transmission (keine zweite Szenen-Passage): Glas = additive Fresnel-Kanten + Streiflicht. Alles prozedural.
//
//   const g = glasGefaess({ hoehe: 3.2, radius: 0.55, farbe: TEAM_A, max: 400, teilung: 50 }); szene.add(g)
//   g.setze({ wert: 120, t, zulauf: true })        // Füllstand in Einheiten (z. B. Euro), Strahl an/aus
//   const k = kaustik({ radius: 1.2, farbe: TEAM_A }); k.position.set(x, 0.003, z)    // Lichtmuster auf der Bank
//   const b = laborBank({ breite: 20, tiefe: 8 })                                    // schwarze Bank + Spiegelung
import * as THREE from "three";
import { rauschTextur, spiegelBoden, leuchtMat } from "./sim_atmosphaere.js";

const speicher = new Map();
const gemeinsam = (k, bau) => { if (!speicher.has(k)) speicher.set(k, bau()); return speicher.get(k); };
const zeitMats = new Set();
/** Zeit für Flüssigkeit, Bläschen, Kaustik setzen (zusätzlich zu sim_atmosphaere.aktualisiere) */
export function laborZeit(t) { for (const m of zeitMats) m.uniforms.zeit.value = t; }

/** Dunkelfeld-Glas: additive Fresnel-Kante + senkrechte Streiflichter (Softboxen links/rechts) */
export function glasMaterial({ farbe = "#DCE8FF", kante = 0.75, streif = 0.22, grund = 0.004 } = {}) {
  return gemeinsam(`glas|${farbe}|${kante}|${streif}|${grund}`, () => new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, kante: { value: kante }, streif: { value: streif }, grund: { value: grund } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vNv;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
        vNv = normalize(normalMatrix * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; uniform float kante, streif, grund; varying vec3 vN; varying vec3 vV; varying vec3 vNv;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float rand = pow(f, 3.0) * kante;
        float s = smoothstep(0.55, 0.75, abs(vNv.x)) * (1.0 - smoothstep(0.86, 0.97, abs(vNv.x)));
        float s2 = smoothstep(0.12, 0.18, vNv.x) * (1.0 - smoothstep(0.2, 0.26, vNv.x)) * 0.35;
        gl_FragColor = vec4(farbe * (rand + (s + s2) * streif + grund), 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
}

/** Leuchtende Flüssigkeit: dunkler Kern, helle Ränder (Streuung), Helligkeit nach oben, feine Schlieren */
function fluessigMaterial(farbe) {
  const m = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, zeit: { value: 0 }, hoehe: { value: 1 }, tRausch: { value: rauschTextur() } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vV; varying vec3 vL; varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vL = position; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; uniform float zeit, hoehe; uniform sampler2D tRausch; varying vec3 vN; varying vec3 vV; varying vec3 vL; varying vec3 vW;
      void main(){
        float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float y = clamp(vL.y, 0.0, 1.0);
        float n = texture2D(tRausch, vec2(atan(vL.z, vL.x) * 0.3 + zeit * 0.01, vW.y * 0.35 - zeit * 0.03)).r;
        float kern = 0.35 + 0.45 * y + 0.25 * n;
        vec3 c = farbe * (kern * 0.5 + pow(f, 1.5) * 0.9);
        c += vec3(1.0) * pow(f, 6.0) * 0.25;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  zeitMats.add(m);
  return m;
}

function skalaTextur(max, teilung, beschriftung) {
  return gemeinsam(`skala|${max}|${teilung}|${beschriftung}`, () => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 2048;
    const g = c.getContext("2d");
    g.clearRect(0, 0, 256, 2048);
    g.fillStyle = "#FFFFFF"; g.font = "600 52px Inter, sans-serif"; g.textAlign = "left"; g.textBaseline = "middle";
    for (let v = 0; v <= max; v += teilung) {
      const y = 2048 - (v / max) * 2000 - 24;
      const lang = v % beschriftung === 0;
      g.fillRect(8, y - 2, lang ? 90 : 48, 4);
      if (lang && v > 0) g.fillText(String(v), 112, y);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

/**
 * Messgefäß aus Glas mit Flüssigkeit (Teamfarbe), Skala, Bläschen und optionalem Zulauf-Strahl.
 * setze({ wert, t, zulauf }): wert in Einheiten (0 … max); Flüssigkeitshöhe = wert / max × Innenhöhe.
 */
export function glasGefaess({ hoehe = 3.2, radius = 0.46, wand = 0.035, boden = 0.14, farbe = "#3D8BFF", max = 400, teilung = 25, beschriftung = 100, blasen = 120, seed = 1 } = {}) {
  const g = new THREE.Group();
  g.userData.dynamisch = true;
  const glas = glasMaterial({});
  const aussen = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, hoehe, 72, 1, true), glas);
  aussen.position.y = hoehe / 2; aussen.renderOrder = 9;
  const innen = new THREE.Mesh(new THREE.CylinderGeometry(radius - wand, radius - wand, hoehe - boden, 72, 1, true), glasMaterial({ kante: 0.25, streif: 0.12, grund: 0.0 }));
  innen.position.y = boden + (hoehe - boden) / 2; innen.renderOrder = 9;
  const fuss = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.04, radius * 1.08, boden, 72), glasMaterial({ kante: 0.9, streif: 0.5, grund: 0.03 }));
  fuss.position.y = boden / 2; fuss.renderOrder = 9;
  const lippe = new THREE.Mesh(new THREE.TorusGeometry(radius, wand * 0.7, 10, 72), glasMaterial({ kante: 0.8, streif: 0.8, grund: 0.12 }));
  lippe.rotation.x = Math.PI / 2; lippe.position.y = hoehe; lippe.renderOrder = 9;
  g.add(aussen, innen, fuss, lippe);
  // Skala vorn (Halbzylinder-Band), leicht leuchtend
  const skala = new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.004, radius + 0.004, hoehe - boden - 0.2, 48, 1, true, -Math.PI * 0.18, Math.PI * 0.36),
    new THREE.MeshBasicMaterial({ map: skalaTextur(max, teilung, beschriftung), color: new THREE.Color("#DDE6F2").multiplyScalar(1.3), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  skala.position.y = boden + (hoehe - boden - 0.2) / 2 + 0.02;
  skala.rotation.y = 0.35; skala.renderOrder = 10;
  g.add(skala);
  // Flüssigkeit (Einheitshöhe 1, wird skaliert), Oberfläche mit Meniskus-Glanz
  const fl = new THREE.Mesh(new THREE.CylinderGeometry(radius - wand - 0.004, radius - wand - 0.004, 1, 64, 1, false), fluessigMaterial(farbe));
  fl.geometry.translate(0, 0.5, 0);
  fl.position.y = boden;
  const meniskus = new THREE.Mesh(new THREE.TorusGeometry(radius - wand - 0.012, 0.012, 8, 64), leuchtMat(new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.6), 3.5));
  meniskus.rotation.x = Math.PI / 2;
  g.add(fl, meniskus);
  // Bläschen (Punkte, steigen auf, nur unterhalb des Spiegels)
  const n = blasen, pos = new Float32Array(n * 3);
  let s = seed * 977 + 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < n; i++) { const w = r() * Math.PI * 2, rr = Math.sqrt(r()) * (radius - wand - 0.05); pos.set([Math.cos(w) * rr, r(), Math.sin(w) * rr], i * 3); }
  const bg = new THREE.BufferGeometry(); bg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const bm = new THREE.ShaderMaterial({
    uniforms: { zeit: { value: 0 }, spiegel: { value: 0 }, boden: { value: boden }, farbe: { value: new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.7) } },
    vertexShader: /* glsl */ `uniform float zeit, spiegel, boden; varying float vA;
      void main(){ float h = max(spiegel, 0.001); float y = fract(position.y + zeit * (0.08 + 0.1 * fract(position.x * 13.7)) / max(h, 0.3)) * h;
        vA = smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(h - 0.06, h, y)) * step(0.05, h);
        vec4 mv = modelViewMatrix * vec4(position.x + sin(zeit * 2.0 + position.z * 40.0) * 0.01, boden + y, position.z, 1.0);
        gl_PointSize = (4.0 + 6.0 * fract(position.x * 71.3)) * projectionMatrix[1][1] * 0.6 / max(-mv.z, 0.1) * 10.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float ring = smoothstep(1.0, 0.75, r) * smoothstep(0.35, 0.7, r); gl_FragColor = vec4(farbe * ring * vA * 1.4, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  zeitMats.add(bm);
  const bp = new THREE.Points(bg, bm); bp.frustumCulled = false; bp.renderOrder = 8;
  g.add(bp);
  // Zulauf-Strahl von oben
  const strahlMat = fluessigMaterial(farbe);
  const strahl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 1, 16, 1, true), strahlMat);
  strahl.geometry.translate(0, -0.5, 0);
  strahl.position.y = hoehe + 1.6;
  g.add(strahl);
  const innenHoehe = hoehe - boden - 0.05;
  g.setze = ({ wert = 0, t = 0, zulauf = false } = {}) => {
    const h = Math.max(0.0001, Math.min(1, wert / max)) * innenHoehe;
    fl.scale.y = h; fl.visible = wert > 0.01;
    meniskus.position.y = boden + h; meniskus.visible = fl.visible;
    bm.uniforms.spiegel.value = fl.visible ? h : 0;
    strahl.visible = zulauf;
    if (zulauf) strahl.scale.y = hoehe + 1.6 - (boden + h);
  };
  g.fluessigHoehe = (wert) => boden + Math.min(1, wert / max) * innenHoehe;
  g.setze({ wert: 0 });
  return g;
}

/** Kaustik: wanderndes Lichtnetz auf der Bank unter einem Gefäß (additiv, Farbe der Flüssigkeit) */
export function kaustik({ radius = 1.2, farbe = "#3D8BFF", staerke = 1.2, massstab = 1.6 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.25) }, staerke: { value: staerke }, zeit: { value: 0 }, massstab: { value: massstab }, tRausch: { value: rauschTextur() } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; uniform float staerke, zeit, massstab; uniform sampler2D tRausch; varying vec2 vUv;
      void main(){
        vec2 p = (vUv - 0.5) * massstab;
        float a = texture2D(tRausch, p * 0.6 + vec2(zeit * 0.015, zeit * 0.01)).r;
        float b = texture2D(tRausch, p * 0.6 * 1.3 + vec2(-zeit * 0.012, zeit * 0.017) + 0.37).g;
        float k = pow(1.0 - abs(a - b), 14.0);
        float r = length(vUv - 0.5) * 2.0;
        float maske = pow(clamp(1.0 - r, 0.0, 1.0), 1.4);
        gl_FragColor = vec4(farbe * staerke * (k * 1.4 + 0.12) * maske, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  zeitMats.add(m);
  const me = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), m);
  me.rotation.x = -Math.PI / 2;
  me.renderOrder = 3;
  me.userData.dynamisch = true;
  return me;
}

/** Schwarze Laborbank (Kunstharz) mit Spiegelung und Lichtkante vorn */
export function laborBank({ breite = 20, tiefe = 8, hoehe = 0.12, spiegel = 0.5, aufloesung = 0.28 } = {}) {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(breite, hoehe, tiefe), new THREE.MeshStandardMaterial({ color: "#040506", roughness: 0.32, metalness: 0, envMapIntensity: 0.35 }));
  b.position.y = -hoehe / 2; b.receiveShadow = true;
  g.add(b);
  if (spiegel > 0) { const s = spiegelBoden({ breite, tiefe, staerke: spiegel, streckung: 1.4, unschaerfe: 1.2, fresnel: 0.45, aufloesung, verzerrung: 0.2, rand: 0.03 }); s.position.y = 0.002; g.add(s); }
  const k = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.008, 0.008), leuchtMat("#BFD2EE", 1.6));
  k.position.set(0, 0.0, tiefe / 2);
  g.add(k);
  return g;
}

/** Rückwand mit weichem Gegenlicht-Feld (macht die Glaskanten sichtbar) */
export function gegenlichtWand({ breite = 30, hoehe = 16, farbe = "#1A2436", staerke = 1 } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, hoehe), new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 farbe; uniform float staerke; varying vec2 vUv; void main(){ vec2 d = (vUv - vec2(0.5, 0.42)) * vec2(1.6, 1.0); float a = exp(-dot(d, d) * 5.0); gl_FragColor = vec4(farbe * staerke * (0.15 + a), 1.0); }`,
  }));
  return m;
}
