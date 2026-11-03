// Boden, Skyline und die sieben Zentralen der Neon-Stadt (Entscheidung 03.11.: keine Video-Türme mehr; die Stadt ist die
// Zentrale, einzelne Gebäude sind anklickbar und führen in ihre Räume). Die Skyline wird mit fester Saat gebaut, damit
// Laptop und PC dieselbe Stadt zeigen.
import * as THREE from "three";
import { szene, U, NEBEL_GLSL, LICHT_GLSL, WELT_VERTEX, CYAN, PINK, GOLD, VIOLETT, GRUEN, ORANGE, ROT, zufall, schriftTextur, SCHRIFT, MONO } from "./kern.js";

export const BLOCK = 24, STRASSE = 6, PLATZ_RADIUS = 58, STADT_RADIUS = 520;
export const TAFEL_ORT = { x: 36, z: -122 }; // Hochhaus mit der Anzeigetafel (dort keine Skyline-Häuser)

// ───────────────────────── Fassaden-Shader (für Skyline und Zentralen) ─────────────────────────
const FASSADE_FRAGMENT = `
  uniform vec3 uGrund, uHimmelOben, uHimmelUnten; uniform float uGlas, uFensterAnteil, uKanten, uHover, uSaat, uLaufband;
  #ifdef PALETTE
    uniform vec3 uAkzentA, uAkzentB, uAkzentC;
  #else
    uniform vec3 uAkzent;
  #endif
  ${NEBEL_GLSL} ${LICHT_GLSL}
  varying vec3 vWelt; varying vec3 vNormale; varying vec3 vLokal; varying vec3 vGroesse; varying vec4 vStil;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec3 fensterFarbe(float h) {
    if (h < 0.55) return lin(vec3(1.0, 0.8, 0.55));
    if (h < 0.72) return lin(vec3(0.66, 0.84, 1.0));
    if (h < 0.86) return lin(vec3(1.0, 0.56, 0.86));
    return lin(vec3(0.55, 1.0, 0.96));
  }
  void main() {
    #ifdef PALETTE
      vec3 uAkzent = vStil.y < 0.4 ? uAkzentA : vStil.y < 0.75 ? uAkzentB : uAkzentC; // Neonfarbe je Haus
    #endif
    vec3 n = normalize(vNormale);
    float saat = uSaat + vStil.x * 97.0;
    vec3 grund = uGrund * (0.85 + 0.3 * fract(vStil.y * 7.31));
    // Tagsüber Pastellfassaden (Lavendel, Mint, Pfirsich), nachts fast unsichtbar, weil das Grundlicht fehlt
    float ton = fract(vStil.x * 13.7 + vStil.y * 3.1);
    vec3 pastell = ton < 0.34 ? lin(vec3(0.66, 0.6, 0.86)) : ton < 0.67 ? lin(vec3(0.58, 0.8, 0.84)) : lin(vec3(0.9, 0.68, 0.74));
    grund = mix(grund, pastell * 0.55, 0.55);
    vec3 f;
    if (n.y > 0.5) {
      // Dach: dunkel, ein paar Lichtpunkte
      f = grund * 0.6 * licht(n);
      float punkt = step(0.985, hash(floor(vWelt.xz * 0.8) + saat)) * uNacht;
      f += lin(vec3(1.0, 0.3, 0.4)) * punkt * (0.6 + 0.4 * sin(uZeit * 3.0 + saat));
    } else if (n.y < -0.5) {
      f = grund * 0.2;
    } else {
      float u = abs(n.x) > 0.5 ? vWelt.z : vWelt.x;
      float v = vWelt.y;
      vec2 zelle = vec2(floor(u / 2.0), floor(v / 3.2));
      vec2 inZelle = vec2(fract(u / 2.0), fract(v / 3.2));
      float fenster = step(0.2, inZelle.x) * step(inZelle.x, 0.8) * step(0.3, inZelle.y) * step(inZelle.y, 0.76);
      float id = hash(zelle + vec2(saat, n.x * 3.0 + n.z * 7.0));
      // Fenster gehen in der Dämmerung nach und nach an, einzelne wechseln langsam
      float an = step(id, uFensterAnteil * uNacht * (0.55 + 0.45 * vStil.z)) ;
      float wechsel = step(0.97, hash(zelle + floor(uZeit / 23.0 + id * 9.0)));
      an = abs(an - wechsel * step(0.5, uNacht));
      vec3 himmel = mix(uHimmelUnten, uHimmelOben, 0.4 + 0.3 * n.y);
      vec3 matt = grund * licht(n);
      // Glasflächen spiegeln den Himmel, Fenster leuchten nachts
      vec3 glas = mix(matt, himmel * 0.55 + uSonneFarbe * pow(max(dot(reflect(normalize(vWelt - cameraPosition), n), uSonneRichtung), 0.0), 24.0) * 0.8, uGlas);
      f = mix(matt, glas, fenster * 0.85);
      f += fensterFarbe(hash(zelle * 1.7 + saat)) * fenster * an * (0.55 + 0.25 * hash(zelle + 3.1));
      // Laufbänder (Zahlen-Turm): Lichtstreifen wandern nach oben
      if (uLaufband > 0.0) {
        float spur = step(0.86, fract(u * 0.5 + 0.13));
        f += uAkzent * spur * pow(fract(v * 0.04 - uZeit * 0.35 + hash(vec2(floor(u * 0.5), saat)) ), 6.0) * 2.2 * uLaufband;
      }
    }
    // Neonkanten: oberer Rand und senkrechte Ecken
    vec3 g = vGroesse;
    float kante;
    if (n.y > 0.5) kante = max(step(g.x * 0.5 - 0.3, abs(vLokal.x)), step(g.z * 0.5 - 0.3, abs(vLokal.z))); // Dachrand
    else {
      float rand = smoothstep(g.y - 0.45, g.y - 0.05, vLokal.y);
      float ecke = step(g.x * 0.5 - 0.22, abs(vLokal.x)) * step(g.z * 0.5 - 0.22, abs(vLokal.z));
      kante = max(rand, ecke);
    }
    kante *= vStil.w * uKanten;
    f += uAkzent * kante * uNeon * (1.6 + uHover * 2.5);
    // Sockel leuchtet leicht (Straßenlicht)
    f += uAkzent * exp(-vWelt.y * 0.9) * 0.25 * uNacht;
    f += uAkzent * uHover * 0.18;
    gl_FragColor = vec4(nebeln(f, vWelt), 1.0);
    #include <colorspace_fragment>
  }`;

const FASSADE_VERTEX_INSTANZ = `
  attribute vec3 aGroesse; attribute vec4 aStil;
  varying vec3 vWelt; varying vec3 vNormale; varying vec3 vLokal; varying vec3 vGroesse; varying vec4 vStil;
  void main() {
    vGroesse = aGroesse; vStil = aStil;
    vLokal = vec3(position.x * aGroesse.x, position.y * aGroesse.y, position.z * aGroesse.z);
    vNormale = normalize(mat3(instanceMatrix) * normal);
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWelt = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

// Für einzelne Bauteile der Zentralen: Größe und Stil als Uniform
const FASSADE_VERTEX_EINZELN = `
  uniform vec3 uGroesseT; uniform vec4 uStilT; uniform float uSockel;
  varying vec3 vWelt; varying vec3 vNormale; varying vec3 vLokal; varying vec3 vGroesse; varying vec4 vStil;
  void main() {
    vGroesse = uGroesseT; vStil = uStilT;
    vLokal = position + vec3(0.0, uSockel, 0.0);
    vNormale = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWelt = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

function fassadeUniforms(o = {}) {
  return {
    ...U,
    uAkzent: { value: (o.akzent || CYAN).clone() }, uGrund: { value: new THREE.Color(o.grund || "#2c2742") },
    uGlas: { value: o.glas ?? 0.6 }, uFensterAnteil: { value: o.fenster ?? 0.55 }, uKanten: { value: o.kanten ?? 1 },
    uHover: o.hover || { value: 0 }, uSaat: { value: o.saat ?? 0 }, uLaufband: { value: o.laufband ?? 0 },
  };
}

/** Material für ein Bauteil einer Zentrale. Box-Geometrie mit Boden bei y = 0 (translate) und Größe g. */
export function fassade(g, o = {}) {
  const uni = fassadeUniforms(o);
  uni.uGroesseT = { value: new THREE.Vector3(g.x, g.y, g.z) };
  uni.uStilT = { value: new THREE.Vector4(o.saat ?? 0.3, o.farbe ?? 0.5, o.fensterStil ?? 1, o.kanten === 0 ? 0 : 1) };
  uni.uSockel = { value: 0 };
  return new THREE.ShaderMaterial({ uniforms: uni, vertexShader: FASSADE_VERTEX_EINZELN, fragmentShader: FASSADE_FRAGMENT });
}

// ───────────────────────── Boden: Straßen, Gehwege, Platz ─────────────────────────
let bodenMat;
export function bodenBauen() {
  bodenMat = new THREE.ShaderMaterial({
    uniforms: { ...U, uLauf: { value: 0 }, uCyan: { value: CYAN }, uPink: { value: PINK } },
    vertexShader: WELT_VERTEX,
    fragmentShader: `uniform float uLauf, uNass; uniform vec3 uCyan, uPink, uHimmelOben, uHimmelUnten; ${NEBEL_GLSL} ${LICHT_GLSL} varying vec3 vWelt;
      float linie(float k, float b) { float d = abs(fract(k - 0.5) - 0.5) / max(fwidth(k), 1e-4); return 1.0 - min(d / b, 1.0); }
      void main() {
        vec2 p = vWelt.xz;
        float r = length(p);
        vec2 g = abs(fract(p / ${BLOCK.toFixed(1)} + 0.5) - 0.5) * ${BLOCK.toFixed(1)}; // Abstand zur Straßenmitte
        float strasse = 1.0 - step(${(STRASSE / 2).toFixed(1)}, min(g.x, g.y));
        float platz = 1.0 - smoothstep(${PLATZ_RADIUS - 2}.0, ${PLATZ_RADIUS}.0, r);
        strasse *= 1.0 - platz;
        vec3 asphalt = lin(vec3(0.17, 0.15, 0.21)), gehweg = lin(vec3(0.3, 0.28, 0.36)), platzF = lin(vec3(0.26, 0.24, 0.34));
        vec3 f = mix(gehweg, asphalt, strasse);
        f = mix(f, platzF, platz);
        f *= licht(vec3(0.0, 1.0, 0.0));
        // Neonlinien: Straßenränder und Mittellinie, auf dem Platz Ringe und Gitter
        float rand = (1.0 - step(${(STRASSE / 2 + 0.25).toFixed(2)}, min(g.x, g.y))) * step(${(STRASSE / 2 - 0.25).toFixed(2)}, min(g.x, g.y)) * (1.0 - platz);
        // Mittellinie gestrichelt: in x-Richtung laufende Straßen gestrichelt entlang x, die anderen entlang z
        float mitte = linie(p.x / ${BLOCK.toFixed(1)}, 1.2) * step(0.5, fract(p.y * 0.25)) + linie(p.y / ${BLOCK.toFixed(1)}, 1.2) * step(0.5, fract(p.x * 0.25));
        mitte *= 1.0 - platz;
        vec3 neon = uPink * rand * 0.9 + uCyan * mitte * 0.5;
        float ring = linie(r / 6.0, 1.5) * platz * step(12.0, r);
        float ring2 = (1.0 - smoothstep(0.0, 0.6, abs(r - ${PLATZ_RADIUS - 1}.0))) ;
        vec2 pg = p / 6.0;
        float gitter = max(linie(pg.x, 1.0), linie(pg.y, 1.0)) * platz;
        neon += uCyan * ring * 0.35 + uPink * ring2 * 1.2 + mix(uCyan, uPink, 0.5) * gitter * 0.18;
        // Datenpakete laufen über den Platz nach außen
        float paket = pow(fract(r * 0.05 - uLauf * 0.06), 22.0) * platz * gitter;
        neon += uCyan * paket * 2.5;
        f += neon * uNeon * (0.35 + 0.65 * uNacht);
        // Nässe: Himmel und Neon spiegeln sich
        f += mix(uHimmelUnten, uHimmelOben, 0.3) * uNass * 0.18;
        gl_FragColor = vec4(nebeln(f, vWelt), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const b = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), bodenMat);
  b.rotation.x = -Math.PI / 2;
  szene.add(b);
}
export function bodenBewegen(lauf) { if (bodenMat) bodenMat.uniforms.uLauf.value = lauf; }

// ───────────────────────── Skyline ─────────────────────────
const NEON_PALETTE = [CYAN, PINK, VIOLETT, CYAN, PINK, GOLD];
export function skylineBauen() {
  const r = zufall(2026);
  const teile = [];
  const n = Math.ceil(STADT_RADIUS / BLOCK);
  for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
    const mx = (i + 0.5) * BLOCK, mz = (j + 0.5) * BLOCK, d = Math.hypot(mx, mz);
    if (d < PLATZ_RADIUS + 8 || d > STADT_RADIUS) continue;
    if (r() < 0.06) continue; // Park
    // Um den Platz ein niedriges Viertel (freie Sicht auf die Zentralen), nach außen höher; die Innenstadt mit den
    // höchsten Türmen liegt hinter den Zentralen im Südwesten (−z), dort geht die Sonne unter
    const winkel = Math.atan2(mx, -mz); // 0 = geradeaus (−z)
    const innenstadt = Math.exp(-Math.pow(winkel / 0.8, 2)) * Math.exp(-Math.pow((d - 270) / 110, 2));
    const aussen = Math.min(1, Math.max(0, (d - 120) / 140));
    const rand = d > 430 ? 0.5 : 1;
    const nutz = BLOCK - STRASSE - 1.5;
    const lose = r() < 0.35 ? [[0, 0, nutz, nutz]] : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [a * nutz / 4, b * nutz / 4, nutz / 2 - 0.8, nutz / 2 - 0.8]);
    for (const [ox, oz, w, t] of lose) {
      if (r() < 0.12) continue;
      if (Math.hypot(mx + ox - TAFEL_ORT.x, mz + oz - TAFEL_ORT.z) < 30) continue;
      let h;
      if (d < 135) h = 4 + r() * 9;
      else h = ((7 + r() * 20) * (0.45 + aussen * 0.9) + innenstadt * (50 + r() * 120)) * rand;
      if (d > 160 && r() < 0.035) h *= 1.8;
      const bw = w * (0.75 + r() * 0.25), bt = t * (0.75 + r() * 0.25);
      const stil = [r(), r(), 0.3 + r() * 0.7, r() < 0.45 + innenstadt * 0.4 ? 1 : 0];
      const neon = Math.floor(r() * NEON_PALETTE.length);
      teile.push({ x: mx + ox, z: mz + oz, w: bw, t: bt, h, y: 0, stil, neon });
      // Rücksprung und Turmspitze bei hohen Häusern
      if (h > 45 && r() < 0.6) {
        const h2 = h * (0.25 + r() * 0.35);
        teile.push({ x: mx + ox, z: mz + oz, w: bw * 0.62, t: bt * 0.62, h: h2, y: h, stil: [r(), stil[1], stil[2], stil[3]], neon });
        if (r() < 0.5) teile.push({ x: mx + ox, z: mz + oz, w: 0.5, t: 0.5, h: 6 + r() * 14, y: h + h2, stil: [r(), 0, 0, 1], neon });
      }
    }
  }
  const geo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const groesse = new Float32Array(teile.length * 3), stil = new Float32Array(teile.length * 4);
  const uni = fassadeUniforms({ grund: "#2a2540", glas: 0.55, fenster: 0.4, saat: 3 });
  Object.assign(uni, { uAkzentA: { value: CYAN }, uAkzentB: { value: PINK }, uAkzentC: { value: VIOLETT } });
  const mat = new THREE.ShaderMaterial({ uniforms: uni, defines: { PALETTE: 1 }, vertexShader: FASSADE_VERTEX_INSTANZ, fragmentShader: FASSADE_FRAGMENT });
  const mesh = new THREE.InstancedMesh(geo, mat, teile.length);
  const m = new THREE.Matrix4();
  teile.forEach((t, i) => {
    m.makeScale(t.w, t.h, t.t).setPosition(t.x, t.y, t.z);
    mesh.setMatrixAt(i, m);
    groesse.set([t.w, t.h, t.t], i * 3);
    stil.set(t.stil, i * 4);
  });
  geo.setAttribute("aGroesse", new THREE.InstancedBufferAttribute(groesse, 3));
  geo.setAttribute("aStil", new THREE.InstancedBufferAttribute(stil, 4));
  mesh.frustumCulled = false;
  szene.add(mesh);
  return teile.length;
}

// ───────────────────────── Die sieben Zentralen ─────────────────────────
export const ZENTRALEN = [
  { id: "live", name: "Live-Zentrale", emoji: "🎬", akzent: PINK, winkel: -35, abstand: 36, taste: "1" },
  { id: "studio", name: "Studio", emoji: "💡", akzent: GOLD, winkel: 35, abstand: 36, taste: "2" },
  { id: "zahlen", name: "Zahlen-Turm", emoji: "📈", akzent: CYAN, winkel: -72, abstand: 38, taste: "3" },
  { id: "ziele", name: "Ziele-Turm", emoji: "🎯", akzent: GRUEN, winkel: -112, abstand: 40, taste: "4" },
  { id: "lernen", name: "Lernzentrale", emoji: "🧠", akzent: VIOLETT, winkel: 72, abstand: 38, taste: "5" },
  { id: "radar", name: "Trend-Radar", emoji: "📡", akzent: ORANGE, winkel: 112, abstand: 40, taste: "6" },
  { id: "claude", name: "Claude-Hauptquartier", emoji: "🤖", akzent: VIOLETT, winkel: 0, abstand: 44, taste: "7" },
];

const KASTEN = (w, h, t) => new THREE.BoxGeometry(w, h, t).translate(0, h / 2, 0);
function teil(z, w, h, t, o = {}) {
  const m = new THREE.Mesh(KASTEN(w, h, t), fassade(new THREE.Vector3(w, h, t), { akzent: z.akzent, hover: z.hoverU, saat: o.saat ?? z.saat, ...o }));
  if (o.y) m.position.y = o.y;
  z.gruppe.add(m);
  return m;
}
const leucht = (farbe, staerke = 1.6) => new THREE.MeshBasicMaterial({ color: farbe.clone().multiplyScalar(staerke) });
const additiv = (farbe, deckung = 0.5) => new THREE.MeshBasicMaterial({ color: farbe.clone(), transparent: true, opacity: deckung, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

// Leuchtende Tür an der Front (Ziel der Roboter, Einstieg der Kamera)
function tuerBauen(z, t) {
  const tuer = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.6), additiv(z.akzent, 0.85));
  tuer.position.set(0, 2.3, t / 2 + 0.05);
  z.gruppe.add(tuer);
  const rahmen = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.25, 0.3), leucht(z.akzent, 2));
  rahmen.position.set(0, 4.75, t / 2 + 0.1);
  z.gruppe.add(rahmen);
  z.tuerTiefe = t / 2;
}

const BAUER = {
  live(z) {
    const w = 16, h = 40, t = 14;
    teil(z, w, h, t, { glas: 0.45, fenster: 0.7, grund: "#2e2440" });
    // Große LED-Wand an der Front: zeigt LIVE und den Render-Fortschritt
    z.wand = schriftTextur(640, 360, (g, b, hh, d = {}) => {
      g.fillStyle = "#07040c"; g.fillRect(0, 0, b, hh);
      const rendert = d.rendert;
      g.fillStyle = rendert ? "#fe2c55" : "#3a2a48";
      g.beginPath(); g.arc(70, 70, 22, 0, Math.PI * 2); g.fill();
      g.font = `700 64px ${SCHRIFT}`; g.fillStyle = "#ffffff"; g.textBaseline = "middle";
      g.fillText(rendert ? "LIVE" : "BEREIT", 110, 72);
      g.font = `600 34px ${SCHRIFT}`; g.fillStyle = "#c9cee0";
      g.fillText(d.titel || "Warte auf Aufträge", 44, 170, b - 88);
      g.fillStyle = "#1c1428"; g.fillRect(44, 250, b - 88, 34);
      g.fillStyle = "#fe2c55"; g.fillRect(44, 250, (b - 88) * Math.min(1, (d.prozent || 0) / 100), 34);
      g.font = `700 40px ${SCHRIFT}`; g.fillStyle = "#ffd166"; g.textAlign = "right";
      g.fillText(rendert ? `${Math.round(d.prozent || 0)} %` : "", b - 44, 318);
      g.textAlign = "left";
    });
    const led = new THREE.Mesh(new THREE.PlaneGeometry(12, 6.75), new THREE.MeshBasicMaterial({ map: z.wand.tex, toneMapped: false }));
    led.position.set(0, 24, t / 2 + 0.08);
    z.gruppe.add(led);
    // Antennenmast mit Blinklicht und Satellitenschüsseln
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 18, 6), leucht(new THREE.Color("#8a8aa0"), 0.6));
    mast.position.set(2, h + 9, -2);
    z.gruppe.add(mast);
    z.blink = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), leucht(ROT, 3));
    z.blink.position.set(2, h + 18.4, -2);
    z.gruppe.add(z.blink);
    for (const [x, rz] of [[-4.5, 0.6], [-1, -0.4]]) {
      const schale = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshBasicMaterial({ color: 0xb8b4d0, side: THREE.DoubleSide }));
      schale.rotation.x = Math.PI * 0.62; schale.rotation.z = rz;
      schale.position.set(x, h + 2.2, 3);
      z.gruppe.add(schale);
    }
    tuerBauen(z, t);
    return h + 18;
  },
  studio(z) {
    const t = 16;
    teil(z, 24, 14, t, { glas: 0.7, fenster: 0.75, grund: "#33283e" });
    teil(z, 18, 10, 12, { y: 14, glas: 0.7, fenster: 0.7, grund: "#33283e", saat: z.saat + 1 });
    teil(z, 11, 6, 8, { y: 24, glas: 0.8, fenster: 0.8, grund: "#33283e", saat: z.saat + 2 });
    // Riesige Glühbirne auf dem Dach (leuchtet stärker, wenn Ideen entstehen)
    z.birne = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 18), leucht(GOLD, 1.8));
    z.birne.position.set(0, 30 + 6.2, 0);
    const fassung = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.6, 2.6, 16), new THREE.MeshBasicMaterial({ color: 0x7a7488 }));
    fassung.position.set(0, 31.3, 0);
    z.gruppe.add(z.birne, fassung);
    const draht = new THREE.Mesh(new THREE.TorusKnotGeometry(1.3, 0.12, 64, 6, 2, 5), leucht(new THREE.Color("#ffffff"), 2.2));
    draht.position.copy(z.birne.position);
    z.gruppe.add(draht);
    z.draht = draht;
    tuerBauen(z, t);
    return 40;
  },
  zahlen(z) {
    const h = 58, t = 10;
    teil(z, 10, h, t, { glas: 0.75, fenster: 0.4, grund: "#232a40", laufband: 1 });
    // Balkendiagramm als Krone
    z.balken = [];
    [3, 5, 7.5, 10, 13].forEach((bh, i) => {
      const b = new THREE.Mesh(KASTEN(1.4, bh, 1.4), leucht(CYAN, 1.2 + i * 0.15));
      b.position.set(-3.6 + i * 1.8, h, 0);
      b.userData.h = bh;
      z.gruppe.add(b);
      z.balken.push(b);
    });
    tuerBauen(z, t);
    return h + 13;
  },
  ziele(z) {
    const h = 54, r = 6.2;
    // Gläserner Rundturm, innen füllt sich ein Lichtkern mit dem Fortschritt zum CRP-Ziel
    const huelle = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 32, 1, true).translate(0, h / 2, 0), additiv(GRUEN, 0.12));
    const sockel = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.2, r + 1.8, 3, 32).translate(0, 1.5, 0), fassade(new THREE.Vector3(14, 3, 14), { akzent: GRUEN, hover: z.hoverU, glas: 0.2, fenster: 0 }));
    z.fuellung = new THREE.Mesh(new THREE.CylinderGeometry(r - 1.6, r - 1.6, 1, 32).translate(0, 0.5, 0), leucht(GRUEN, 1.5));
    z.fuellung.position.y = 3;
    z.fuellung.scale.y = 0.01;
    z.gruppe.add(huelle, sockel, z.fuellung);
    for (const anteil of [0.25, 0.5, 0.75, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.15, 0.12, 6, 48), leucht(anteil === 1 ? GOLD : GRUEN, anteil === 1 ? 2.2 : 1));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 3 + (h - 3) * anteil;
      z.gruppe.add(ring);
    }
    // Zielring über der Spitze
    z.zielRing = new THREE.Mesh(new THREE.TorusGeometry(4, 0.35, 8, 48), leucht(GOLD, 2));
    z.zielRing.position.y = h + 6;
    z.gruppe.add(z.zielRing);
    z.hoeheFuellung = h - 3;
    const tuer = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 4.6), additiv(GRUEN, 0.85));
    tuer.position.set(0, 2.3, r + 1.6);
    z.gruppe.add(tuer);
    z.tuerTiefe = r + 1.6;
    return h + 8;
  },
  lernen(z) {
    const h = 22, t = 16;
    teil(z, 18, h, t, { glas: 0.6, fenster: 0.65, grund: "#2c2444" });
    const kuppel = new THREE.Mesh(new THREE.SphereGeometry(8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), additiv(VIOLETT, 0.16));
    kuppel.position.y = h;
    z.gruppe.add(kuppel);
    // „Gehirn“: Drahtgitter, das pulsiert, umkreist von Synapsen
    z.hirn = new THREE.Mesh(new THREE.IcosahedronGeometry(3.6, 2), new THREE.MeshBasicMaterial({ color: VIOLETT.clone().multiplyScalar(1.6), wireframe: true }));
    z.hirn.position.y = h + 4;
    z.synapsen = [0, 1, 2].map((i) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), leucht([CYAN, PINK, GOLD][i], 2.4));
      s.userData.phase = i * 2.1;
      z.gruppe.add(s);
      return s;
    });
    z.gruppe.add(z.hirn);
    tuerBauen(z, t);
    return h + 8;
  },
  radar(z) {
    const h = 44;
    // Gittermast aus vier Beinen mit Querstreben
    const bein = new THREE.CylinderGeometry(0.3, 0.45, h, 5);
    const metall = new THREE.MeshBasicMaterial({ color: 0x6d6884 });
    for (const [x, zz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const b = new THREE.Mesh(bein, metall);
      b.position.set(x * 0.6, h / 2, zz * 0.6);
      b.rotation.z = -x * 0.025; b.rotation.x = zz * 0.025;
      z.gruppe.add(b);
    }
    for (let y = 6; y < h; y += 7) {
      const ring = new THREE.Mesh(new THREE.BoxGeometry(4.6 - y * 0.03, 0.2, 4.6 - y * 0.03), leucht(ORANGE, 0.9));
      ring.position.y = y;
      z.gruppe.add(ring);
    }
    const kabine = new THREE.Mesh(KASTEN(6, 4, 6), fassade(new THREE.Vector3(6, 4, 6), { akzent: ORANGE, hover: z.hoverU, glas: 0.8, fenster: 0.9 }));
    kabine.position.y = h;
    z.gruppe.add(kabine);
    // Drehende Radarschüssel mit Suchstrahl
    z.schuessel = new THREE.Group();
    const schale = new THREE.Mesh(new THREE.SphereGeometry(4.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 3), new THREE.MeshBasicMaterial({ color: 0xd8d2ea, side: THREE.DoubleSide }));
    schale.rotation.x = Math.PI / 2 + 0.35;
    // Suchstrahl: schmal, an der Schüssel hell, nach außen auslaufend
    const strahl = new THREE.Mesh(new THREE.ConeGeometry(7, 110, 24, 1, true).translate(0, -55, 0), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uFarbe: { value: ORANGE } },
      vertexShader: `varying float vY; void main() { vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform vec3 uFarbe; varying float vY; void main() { float a = pow(clamp((vY + 110.0) / 110.0, 0.0, 1.0), 3.0) * 0.22; gl_FragColor = vec4(uFarbe * a, a); }`,
    }));
    strahl.rotation.x = -Math.PI / 2 + 0.12;
    z.schuessel.add(schale, strahl);
    z.schuessel.position.y = h + 6;
    z.gruppe.add(z.schuessel);
    z.blink = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), leucht(ROT, 3));
    z.blink.position.y = h + 10;
    z.gruppe.add(z.blink);
    const tuer = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.2), additiv(ORANGE, 0.85));
    tuer.position.set(0, 2.1, 2.2);
    z.gruppe.add(tuer);
    z.tuerTiefe = 2.2;
    return h + 12;
  },
  claude(z) {
    const h = 56, t = 14;
    teil(z, 14, h, t, { glas: 0.85, fenster: 0.55, grund: "#262040" });
    teil(z, 9, 6, 9, { y: h, glas: 0.9, fenster: 0.3, grund: "#262040", saat: z.saat + 4 });
    // Claude-Kern schwebt über dem Dach, Farbe = Modell
    z.kern = new THREE.Group();
    z.kernHuelle = new THREE.Mesh(new THREE.IcosahedronGeometry(4.2, 1), new THREE.MeshBasicMaterial({ color: CYAN.clone(), wireframe: true }));
    z.kernInnen = new THREE.Mesh(new THREE.IcosahedronGeometry(1.9, 2), new THREE.MeshBasicMaterial({ color: CYAN.clone() }));
    z.kernRinge = [[6.4, PINK], [8, VIOLETT]].map(([r, f]) => new THREE.Mesh(new THREE.TorusGeometry(r, 0.08, 6, 120), leucht(f, 1.5)));
    z.kern.add(z.kernHuelle, z.kernInnen, ...z.kernRinge);
    z.kern.position.y = h + 18;
    z.gruppe.add(z.kern);
    z.kernFarbe = CYAN.clone(); z.kernZiel = CYAN.clone(); z.kernPuls = 0;
    tuerBauen(z, t);
    return h + 26;
  },
};

export function zentralenBauen() {
  for (const [i, z] of ZENTRALEN.entries()) {
    z.gruppe = new THREE.Group();
    z.saat = i * 11.3 + 5;
    z.hoverU = { value: 0 };
    z.hover = 0;
    const w = (z.winkel * Math.PI) / 180;
    z.gruppe.position.set(Math.sin(w) * z.abstand, 0, -Math.cos(w) * z.abstand);
    z.gruppe.lookAt(0, 0, 0); // Front (lokal +z) zeigt zum Platz
    z.hoehe = BAUER[z.id](z); // Namensschilder setzt stadt.js als HTML über die Gebäude
    // Unsichtbarer Trefferkasten für Mauszeiger und Klick
    const treffer = new THREE.Mesh(new THREE.BoxGeometry(22, z.hoehe + 8, 22).translate(0, (z.hoehe + 8) / 2, 0), new THREE.MeshBasicMaterial({ visible: false }));
    treffer.userData.zentrale = z;
    z.gruppe.add(treffer);
    z.treffer = treffer;
    szene.add(z.gruppe);
    z.gruppe.updateMatrixWorld(true);
    // Punkte für Kamera und Roboter
    const vorn = new THREE.Vector3(0, 0, 1).applyQuaternion(z.gruppe.quaternion);
    z.vorn = vorn;
    z.tuer = z.gruppe.position.clone().addScaledVector(vorn, (z.tuerTiefe ?? 7) + 1.2);
    z.mitte = z.gruppe.position.clone().setY(z.hoehe * 0.45);
  }
  return ZENTRALEN;
}

// Zustand aus dem Cockpit (Render, Claude, Ziele …) → Darstellung der Zentralen
export const ZD = { rendert: false, prozent: 0, titel: "", claudeAktiv: false, modell: "", ideenAktiv: false, lernAktiv: false, zielAnteil: 0, radarNeu: 0, zahlenPuls: 0 };
let letzteWand = "";
export function zentralenDaten(d) {
  Object.assign(ZD, d);
  const live = ZENTRALEN.find((z) => z.id === "live");
  const schluessel = `${ZD.rendert}|${Math.round(ZD.prozent)}|${ZD.titel}`;
  if (live?.wand && schluessel !== letzteWand) { letzteWand = schluessel; live.wand.neu(ZD); }
  const claude = ZENTRALEN.find((z) => z.id === "claude");
  if (claude) claude.kernZiel.copy({ opus: VIOLETT, sonnet: CYAN, haiku: GRUEN }[ZD.modell] || CYAN);
}

export function zentralenBewegen(dt, zeit) {
  for (const z of ZENTRALEN) {
    z.hover += ((z.hoverZiel ? 1 : 0) - z.hover) * (1 - Math.exp(-dt * 8));
    z.hoverU.value = z.hover;
    if (z.blink) z.blink.visible = Math.sin(zeit * (z.id === "live" && ZD.rendert ? 9 : 3)) > 0;
  }
  const g = Object.fromEntries(ZENTRALEN.map((z) => [z.id, z]));
  // Studio: Glühbirne pulsiert, wenn Ideen oder Skripte entstehen
  const st = g.studio;
  st.birne.material.color.copy(GOLD).multiplyScalar(1.3 + (ZD.ideenAktiv ? 0.9 + Math.sin(zeit * 8) * 0.6 : Math.sin(zeit * 1.2) * 0.15));
  st.draht.rotation.y += dt * (ZD.ideenAktiv ? 3 : 0.4);
  // Zahlen-Turm: Balken wippen, beim Abruf neuer Zahlen kräftig
  ZD.zahlenPuls = Math.max(0, ZD.zahlenPuls - dt * 0.5);
  g.zahlen.balken.forEach((b, i) => { b.scale.y = 0.75 + 0.25 * Math.sin(zeit * (1 + ZD.zahlenPuls * 4) + i * 0.9) + ZD.zahlenPuls * 0.4; });
  // Ziele-Turm: Füllstand zum CRP-Ziel
  const zi = g.ziele;
  const soll = Math.max(0.01, Math.min(1, ZD.zielAnteil || 0));
  zi.fuellung.scale.y += (soll * zi.hoeheFuellung - zi.fuellung.scale.y) * (1 - Math.exp(-dt * 1.5));
  zi.fuellung.material.color.copy(GRUEN).multiplyScalar(1.2 + Math.sin(zeit * 2) * 0.25);
  zi.zielRing.rotation.x = Math.PI / 2 + Math.sin(zeit * 0.6) * 0.25;
  zi.zielRing.rotation.z += dt * 0.5;
  // Lernzentrale: Gehirn pulsiert, Synapsen kreisen (schneller während der Lernschleife)
  const le = g.lernen, lt = ZD.lernAktiv ? 2.6 : 0.7;
  le.hirn.rotation.y += dt * 0.3 * lt;
  le.hirn.scale.setScalar(1 + Math.sin(zeit * 2 * lt) * 0.06);
  le.synapsen.forEach((s, i) => {
    const a = zeit * lt * (0.9 + i * 0.3) + s.userData.phase;
    s.position.set(Math.cos(a) * 5.2, le.hirn.position.y + Math.sin(a * 1.3) * 2.5, Math.sin(a) * 5.2);
  });
  // Radar: Schüssel dreht, schneller bei neuen Trend-Vorschlägen
  g.radar.schuessel.rotation.y += dt * (0.6 + Math.min(3, ZD.radarNeu) * 0.5);
  // Claude-Kern
  const cl = g.claude, tempo = ZD.claudeAktiv ? 1.7 : 0.25;
  cl.kernHuelle.rotation.y += dt * tempo; cl.kernHuelle.rotation.x += dt * tempo * 0.4;
  cl.kernRinge[0].rotation.x = Math.PI / 2 + Math.sin(zeit * 0.5) * 0.35; cl.kernRinge[0].rotation.z += dt * tempo * 0.8;
  cl.kernRinge[1].rotation.y += dt * tempo * 0.6; cl.kernRinge[1].rotation.x = Math.sin(zeit * 0.3) * 0.9;
  cl.kernFarbe.lerp(cl.kernZiel, 1 - Math.exp(-dt * 3));
  cl.kernPuls = Math.max(0, cl.kernPuls - dt * 1.8);
  cl.kernHuelle.material.color.copy(cl.kernFarbe).multiplyScalar(1.2 + cl.kernPuls);
  cl.kernInnen.material.color.copy(cl.kernFarbe).multiplyScalar(1.8 + cl.kernPuls * 3 + (ZD.claudeAktiv ? 0.6 * Math.sin(zeit * 6) : 0));
  cl.kern.position.y = cl.hoehe - 8 + Math.sin(zeit * 0.8) * 0.8;
}
