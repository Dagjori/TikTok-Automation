// Stil 21 „Nachtkarte“ (Reliefkarte bei Nacht; nur Simulierbar, Skill .claude/skills/simulierbar-video/stile.md):
// dunkles Geländerelief im Mondlicht (Höhenlinien, Flüsse, Wälder), Städte als glühende Lichtteppiche, schwaches
// Straßennetz, Routen in Teamfarbe mit wanderndem Lichtkopf, Ortsmarken als Lichtsäulen mit Puls, tiefe Wolken
// mit Parallaxe. Für Orte, Wege, Pendeln, Regionen, Miete Stadt gegen Land. Alles prozedural (kein Kartenmaterial).
//
//   const k = reliefKarte({ breite: 26, tiefe: 40, seed: 3 }); szene.add(k); k.hoehe(x, z) → Geländehöhe
//   const s = stadtLichter(k, { mitte: [0, -10], radius: 3, anzahl: 5000 })
//   const r = route(k, [[x, z], …], { farbe: TEAM_A }); r.setze(anteil)          // 0 … 1, Lichtkopf an der Spitze
//   const m = ortsMarke(k, [x, z], { farbe: TEAM_B }); m.setze(t, sichtbar)
//   const w = wolkenSchicht({ breite: 60, tiefe: 60, hoehe: 3 })
import * as THREE from "three";
import { rauschTextur, leuchtMat, lichtPfuetze } from "./sim_atmosphaere.js";

const zufall = (seed) => { let s = (seed * 2654435761) % 4294967296; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; };
const zeitMats = new Set();
/** Zeit für Lichter, Wolken, Marken setzen (zusätzlich zu sim_atmosphaere.aktualisiere) */
export function karteZeit(t) { for (const m of zeitMats) m.uniforms.zeit.value = t; }

function wertRauschen(seed) {
  const N = 256, g = new Float32Array(N * N), r = zufall(seed);
  for (let i = 0; i < N * N; i++) g[i] = r();
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const A = (i, j) => g[(((j % N) + N) % N) * N + (((i % N) + N) % N)];
    return (A(xi, yi) * (1 - sx) + A(xi + 1, yi) * sx) * (1 - sy) + (A(xi, yi + 1) * (1 - sx) + A(xi + 1, yi + 1) * sx) * sy;
  };
  return (x, y, ok = 5) => { let s = 0, a = 0.5, f = 1, sum = 0; for (let i = 0; i < ok; i++) { s += a * n(x * f + i * 17.3, y * f - i * 9.1); sum += a; a *= 0.5; f *= 2.03; } return s / sum; };
}

/**
 * Reliefkarte: verschobenes Gitter (Höhe aus Rauschen), Textur mit Höhenstufen, Höhenlinien, Flüssen, Wäldern.
 * flach: Liste [x, z, radius] von Flächen, die flach bleiben (Städte). karte.hoehe(x, z) für das Aufsetzen.
 */
export function reliefKarte({ breite = 26, tiefe = 40, aufl = 200, hoehe = 1.6, seed = 3, flach = [], fluesse = 2, massstab = 0.09 } = {}) {
  const fbm = wertRauschen(seed);
  const hf = (x, z) => {
    let h = Math.pow(fbm(x * massstab + 3, z * massstab + 7), 1.6) * hoehe * 1.8 - hoehe * 0.25;
    h += (fbm(x * massstab * 4, z * massstab * 4, 3) - 0.5) * hoehe * 0.12;
    for (const [fx, fz, fr] of flach) { const d = Math.hypot(x - fx, z - fz); const k = Math.min(1, Math.max(0, (d - fr) / (fr * 1.2))); h = h * (k * k * (3 - 2 * k)) + 0.05 * (1 - k); }
    return Math.max(0, h);
  };
  const geo = new THREE.PlaneGeometry(breite, tiefe, aufl, Math.round(aufl * tiefe / breite));
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, hf(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  // Textur
  const W = 1024, H = Math.round(1024 * tiefe / breite);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const img = g.createImageData(W, H);
  const r = zufall(seed + 5);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = (x / W - 0.5) * breite, wz = (y / H - 0.5) * tiefe;
    const h = hf(wx, wz) / hoehe;
    const wald = fbm(wx * 0.45 + 50, wz * 0.45 + 20, 3) > 0.56 && h > 0.08 && h < 0.75;
    let cr = 38 + h * 60, cg = 46 + h * 58, cb = 56 + h * 52;
    if (wald) { cr *= 0.7; cg *= 0.82; cb *= 0.75; }
    const linie = Math.abs(((h * 12) % 1) - 0.5) > 0.47 ? 1 : 0;
    cr += linie * 22; cg += linie * 24; cb += linie * 28;
    const n = (r() - 0.5) * 6;
    const k = (y * W + x) * 4;
    img.data[k] = cr + n; img.data[k + 1] = cg + n; img.data[k + 2] = cb + n; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.lineCap = "round";
  for (let f = 0; f < fluesse; f++) { // Flüsse: mäandernde Linien
    let x = r() * W, y = 0, w = (r() - 0.5) * 0.6;
    g.strokeStyle = "rgba(14,22,36,0.95)"; g.lineWidth = 5 + f * 2;
    g.beginPath(); g.moveTo(x, y);
    while (y < H) { w += (r() - 0.5) * 0.35; w *= 0.92; x += Math.sin(w) * 6; y += 6; g.lineTo(x, y); }
    g.stroke();
    g.strokeStyle = "rgba(90,120,160,0.25)"; g.lineWidth = 1.5; g.stroke();
  }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0 }));
  m.receiveShadow = true; m.castShadow = true;
  m.hoehe = hf;
  m.userData.groesse = [breite, tiefe];
  return m;
}

/** Stadtlichter: dichter Kern + Ausfallstraßen als Lichtfäden, warm (HDR-Punkte für Bloom), leichtes Flimmern */
export function stadtLichter(karte, { mitte = [0, 0], radius = 3, anzahl = 4000, strahlen = 7, farbe = "#FFC27A", kalt = 0.12, groesse = 0.05, staerke = 2.2, seed = 1 } = {}) {
  const r = zufall(seed);
  const pos = new Float32Array(anzahl * 3), col = new Float32Array(anzahl * 3), zuf = new Float32Array(anzahl);
  const warm = new THREE.Color(farbe), k = new THREE.Color("#BFD8FF");
  const wege = Array.from({ length: strahlen }, () => r() * Math.PI * 2);
  for (let i = 0; i < anzahl; i++) {
    let x, z;
    if (r() < 0.6) { // Kern (gaußähnlich)
      const w = r() * Math.PI * 2, d = Math.pow(r(), 1.8) * radius;
      x = mitte[0] + Math.cos(w) * d; z = mitte[1] + Math.sin(w) * d * 0.85;
    } else { // Ausfallstraßen
      const w = wege[Math.floor(r() * strahlen)] + (r() - 0.5) * 0.05, d = radius * (0.5 + Math.pow(r(), 0.8) * 1.9);
      x = mitte[0] + Math.cos(w) * d + (r() - 0.5) * 0.12; z = mitte[1] + Math.sin(w) * d + (r() - 0.5) * 0.12;
    }
    pos.set([x, karte.hoehe(x, z) + 0.03, z], i * 3);
    const c = r() < kalt ? k : warm;
    col.set([c.r, c.g, c.b], i * 3);
    zuf[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("zufall", new THREE.BufferAttribute(zuf, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { zeit: { value: 0 }, groesse: { value: groesse }, staerke: { value: staerke }, sichtbar: { value: 1 } },
    vertexShader: /* glsl */ `attribute vec3 color; attribute float zufall; uniform float zeit, groesse, sichtbar; varying vec3 vC; varying float vH;
      void main(){ vC = color; vH = (0.55 + 0.45 * zufall) * (0.85 + 0.15 * sin(zeit * (2.0 + zufall * 5.0) + zufall * 40.0)) * step(zufall, sichtbar);
        vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.5, groesse * (0.6 + zufall) * projectionMatrix[1][1] * 960.0 / max(-mv.z, 0.1)); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform float staerke; varying vec3 vC; varying float vH; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(vC * staerke * vH * a * a, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  zeitMats.add(mat);
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false; p.renderOrder = 6;
  const g = new THREE.Group();
  g.add(p);
  const schein = lichtPfuetze({ radius: radius * 2.4, farbe, staerke: 0.16, exponent: 2.6 }); // Lichtglocke über der Stadt
  schein.material = schein.material.clone(); schein.material.depthTest = false;
  schein.position.set(mitte[0], karte.hoehe(...mitte) + 0.3, mitte[1]);
  g.add(schein);
  return g;
}

/** Band auf dem Gelände (Straße/Route) mit Spur-Koordinate; Shader mit Kopf, Schweif, Grundhelligkeit */
function gelaendeBand(karte, punkte, { breite = 0.08, farbe = "#FF8A3D", staerke = 3, grund = 0, kopfGlanz = 2.5, abstand = 0.05, segmente = 500 } = {}) {
  const kurve = new THREE.CatmullRomCurve3(punkte.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "catmullrom", 0.3);
  const pts = kurve.getSpacedPoints(segmente);
  const pos = [], s = [], idx = [];
  for (let i = 0; i <= segmente; i++) {
    const p = pts[i], q = pts[Math.min(segmente, i + 1)], o = pts[Math.max(0, i - 1)];
    const t = q.clone().sub(o).normalize();
    const n = new THREE.Vector3(-t.z, 0, t.x).multiplyScalar(breite / 2);
    for (const sg of [-1, 1]) { const x = p.x + n.x * sg, z = p.z + n.z * sg; pos.push(x, karte.hoehe(x, z) + abstand, z); s.push(i / segmente, sg); }
    if (i < segmente) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("spur", new THREE.Float32BufferAttribute(s, 2));
  geo.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, kopf: { value: 1 }, grund: { value: grund }, kopfGlanz: { value: kopfGlanz } },
    vertexShader: `attribute vec2 spur; varying vec2 vS; void main(){ vS = spur; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; uniform float staerke, kopf, grund, kopfGlanz; varying vec2 vS;
      void main(){ float q = pow(1.0 - abs(vS.y), 1.6); float an = step(vS.x, kopf); float k = exp(-pow((kopf - vS.x) * 90.0, 2.0)) * kopfGlanz * an;
        float a = an * (0.75 + 0.25 * smoothstep(kopf - 0.3, kopf, vS.x)) + grund * (1.0 - an);
        gl_FragColor = vec4(mix(farbe, vec3(1.0), 0.2 * q) * staerke * (a + k) * q, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false; m.renderOrder = 7;
  m.kurve = kurve;
  return m;
}

/** Schwaches Straßennetz zwischen Orten (warm, ohne Kopf) */
export function strassenNetz(karte, wege, { farbe = "#FFB36B", breite = 0.035, staerke = 0.5 } = {}) {
  const g = new THREE.Group();
  for (const w of wege) g.add(gelaendeBand(karte, w, { farbe, breite, staerke, kopfGlanz: 0, segmente: 200 }));
  return g;
}

/** Route in Teamfarbe mit Lichtkopf (Kugel + Lichtfleck); setze(anteil 0–1); punkt(anteil) → Weltpunkt */
export function route(karte, punkte, { farbe = "#FF8A3D", breite = 0.11, staerke = 3.2, grund = 0.12 } = {}) {
  const g = new THREE.Group();
  g.userData.dynamisch = true;
  const band = gelaendeBand(karte, punkte, { farbe, breite, staerke, grund, segmente: 600 });
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), leuchtMat(new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.5), 8, { neu: true }));
  const schein = lichtPfuetze({ radius: 0.9, farbe, staerke: 0.9, exponent: 2.4 });
  g.add(band, kopf, schein);
  g.punkt = (u) => { const p = band.kurve.getPointAt(Math.min(1, Math.max(0, u))); p.y = karte.hoehe(p.x, p.z); return p; };
  g.setze = (u) => {
    band.material.uniforms.kopf.value = u;
    const p = g.punkt(u);
    kopf.position.set(p.x, p.y + 0.12, p.z); schein.position.set(p.x, p.y + 0.07, p.z);
    kopf.visible = schein.visible = u > 0.001 && u < 0.999;
  };
  g.setze(0);
  return g;
}

/** Ortsmarke: Lichtsäule und Pulsring in Teamfarbe; setze(t, sichtbar 0–1) */
export function ortsMarke(karte, [x, z], { farbe = "#2EC4B6", hoehe = 2.2, staerke = 1 } = {}) {
  const g = new THREE.Group();
  g.userData.dynamisch = true;
  const y = karte.hoehe(x, z);
  const saeule = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, hoehe, 12, 1, true), new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke } },
    vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 farbe; uniform float staerke; varying float vY; void main(){ gl_FragColor = vec4(farbe * staerke * 3.0 * pow(1.0 - vY, 2.0), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  saeule.position.set(x, y + hoehe / 2, z);
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, zeit: { value: 0 }, staerke: { value: staerke } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 farbe; uniform float zeit, staerke; varying vec2 vUv;
      void main(){ float r = length(vUv - 0.5) * 2.0; float p = fract(zeit * 0.6); float ring = smoothstep(0.06, 0.0, abs(r - p)) * (1.0 - p);
        float kern = smoothstep(0.18, 0.0, r); gl_FragColor = vec4(farbe * staerke * (ring * 2.0 + kern * 2.5), 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  zeitMats.add(ringMat);
  const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.set(x, y + 0.06, z);
  g.add(saeule, ring);
  g.setze = (t, s = 1) => { g.visible = s > 0.001; saeule.scale.y = Math.max(0.001, s); saeule.position.y = y + (hoehe * s) / 2; saeule.material.uniforms.staerke.value = staerke * s; ringMat.uniforms.staerke.value = staerke * s; };
  return g;
}

/** Tiefe Wolkenschicht (Rauschen, wandert langsam), mondbeschienen; mehrere Lagen für Parallaxe */
export function wolkenSchicht({ breite = 60, tiefe = 60, hoehe = 3, lagen = 2, abstand = 0.8, farbe = "#7F93B5", deckkraft = 0.55, deckung = 0.5, massstab = 0.05, tempo = 0.02, seed = 2 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < lagen; i++) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { farbe: { value: new THREE.Color(farbe) }, zeit: { value: 0 }, deckkraft: { value: deckkraft * (1 - i * 0.3) }, deckung: { value: deckung }, massstab: { value: massstab * (1 + i * 0.6) }, tempo: { value: tempo * (1 + i * 0.4) }, seed: { value: seed * 0.17 + i * 0.41 }, tRausch: { value: rauschTextur() } },
      vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform vec3 farbe; uniform float zeit, deckkraft, deckung, massstab, tempo, seed; uniform sampler2D tRausch; varying vec2 vUv; varying vec3 vW;
        void main(){ vec2 p = vW.xz * massstab + vec2(zeit * tempo, zeit * tempo * 0.3) + seed;
          float n = texture2D(tRausch, p).r * 0.65 + texture2D(tRausch, p * 2.7 + 0.3).g * 0.35;
          float a = smoothstep(1.0 - deckung, 1.0 - deckung + 0.25, n);
          float rand = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          float licht = 0.6 + 0.6 * smoothstep(0.4, 1.0, n);
          float nahe = smoothstep(1.0, 5.0, length(cameraPosition - vW));
          gl_FragColor = vec4(farbe * licht, a * deckkraft * rand * nahe); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    zeitMats.add(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(breite, tiefe), mat);
    m.rotation.x = -Math.PI / 2; m.position.y = hoehe + i * abstand; m.renderOrder = 12;
    m.userData.dynamisch = true;
    g.add(m);
  }
  return g;
}
