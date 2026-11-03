// Himmel der Neon-Stadt in Echtzeit (Entscheidung 03.11.: „Neon-Tag und Neon-Nacht“): tagsüber Pastellhimmel Rosa/Lila/Türkis
// mit schwächerem Neon, kräftiger Synthwave-Sonnenuntergang, nachts dunkel mit Sternen und Mond. Sonne und Mond stehen dort,
// wo sie über Berlin gerade stehen. Dazu Wolken, Regen, Schnee und Nebel nach dem echten Berliner Wetter.
import * as THREE from "three";
import { szene, U, PUNKT, clamp, glatt, richtungAus } from "./kern.js";
import { sonnenstand, mondstand, mondphase, sonnenzeiten, abschnitt } from "./sonne.js";

const c = (h) => new THREE.Color(h);
// Stimmung je Sonnenhöhe (Grad); dazwischen wird gemischt
const STIMMUNGEN = [
  { h: -90, oben: c("#02030a"), mitte: c("#0a0718"), unten: c("#170a2a"), glut: c("#3a1050"), glutStaerke: 0.25, umgebung: c("#0d0a1e"), boden: c("#05030b"), nebel: c("#0a0616"), sonne: c("#000000"), nacht: 1, neon: 1, sterne: 1, dichte: 0.0042 },
  { h: -18, oben: c("#02030a"), mitte: c("#0a0718"), unten: c("#170a2a"), glut: c("#3a1050"), glutStaerke: 0.25, umgebung: c("#0d0a1e"), boden: c("#05030b"), nebel: c("#0a0616"), sonne: c("#000000"), nacht: 1, neon: 1, sterne: 1, dichte: 0.0042 },
  { h: -10, oben: c("#050a26"), mitte: c("#1a1048"), unten: c("#3a1658"), glut: c("#6a2a8a"), glutStaerke: 0.5, umgebung: c("#16163a"), boden: c("#07051a"), nebel: c("#170f32"), sonne: c("#000000"), nacht: 1, neon: 1, sterne: 0.7, dichte: 0.004 },
  { h: -5, oben: c("#120a38"), mitte: c("#3a1460"), unten: c("#a02a6a"), glut: c("#ff3d7f"), glutStaerke: 0.9, umgebung: c("#2c1a46"), boden: c("#0c0618"), nebel: c("#2c1238"), sonne: c("#000000"), nacht: 0.95, neon: 1, sterne: 0.3, dichte: 0.0038 },
  { h: -1, oben: c("#2a1a6a"), mitte: c("#8a2a8a"), unten: c("#ff5a6a"), glut: c("#ff8a3d"), glutStaerke: 1.25, umgebung: c("#4a2c5c"), boden: c("#140a1c"), nebel: c("#5a2346"), sonne: c("#ff7a50").multiplyScalar(0.55), nacht: 0.8, neon: 0.92, sterne: 0.04, dichte: 0.0034 },
  { h: 3, oben: c("#4a56c0"), mitte: c("#b06ad0"), unten: c("#ffa47a"), glut: c("#ffc06a"), glutStaerke: 1.0, umgebung: c("#7a6a9e"), boden: c("#2a1a2c"), nebel: c("#c27a9c"), sonne: c("#ffb070").multiplyScalar(1.0), nacht: 0.35, neon: 0.72, sterne: 0, dichte: 0.003 },
  { h: 10, oben: c("#62b8ea"), mitte: c("#a99cff"), unten: c("#ffb8d8"), glut: c("#ffd6a0"), glutStaerke: 0.6, umgebung: c("#a49ccc"), boden: c("#3a2c44"), nebel: c("#dcb0d6"), sonne: c("#ffe2c8").multiplyScalar(1.1), nacht: 0.06, neon: 0.5, sterne: 0, dichte: 0.0023 },
  { h: 25, oben: c("#6fd3ee"), mitte: c("#b0a4ff"), unten: c("#ffc6e6"), glut: c("#fff0d8"), glutStaerke: 0.45, umgebung: c("#b4b4e2"), boden: c("#40344c"), nebel: c("#e4c6ea"), sonne: c("#fff4e8").multiplyScalar(1.2), nacht: 0, neon: 0.42, sterne: 0, dichte: 0.002 },
  { h: 90, oben: c("#7adcf2"), mitte: c("#b6abff"), unten: c("#ffcde9"), glut: c("#fff6e6"), glutStaerke: 0.4, umgebung: c("#bcbce6"), boden: c("#44384e"), nebel: c("#e8ccee"), sonne: c("#fffaf0").multiplyScalar(1.25), nacht: 0, neon: 0.4, sterne: 0, dichte: 0.0019 },
];
const FARB_SCHLUESSEL = ["oben", "mitte", "unten", "glut", "umgebung", "boden", "nebel", "sonne"];
const ZAHL_SCHLUESSEL = ["glutStaerke", "nacht", "neon", "sterne", "dichte"];
const stimmung = Object.fromEntries([...FARB_SCHLUESSEL.map((k) => [k, new THREE.Color()]), ...ZAHL_SCHLUESSEL.map((k) => [k, 0])]);

function stimmungMischen(h) {
  let i = 0;
  while (i < STIMMUNGEN.length - 2 && h > STIMMUNGEN[i + 1].h) i++;
  const a = STIMMUNGEN[i], b = STIMMUNGEN[i + 1];
  const t = glatt(a.h, b.h, h);
  for (const k of FARB_SCHLUESSEL) stimmung[k].copy(a[k]).lerp(b[k], t);
  for (const k of ZAHL_SCHLUESSEL) stimmung[k] = a[k] + (b[k] - a[k]) * t;
}

const H = {
  kuppel: null, sonne: null, mond: null, sterne: null, regen: null, schnee: null,
  sonneRichtung: new THREE.Vector3(), mondRichtung: new THREE.Vector3(),
  wetter: { wolken: 0.15, regen: 0, schnee: 0, nebel: 0, wind: 8 }, // weich gemischt
  wetterZiel: { wolken: 0.15, regen: 0, schnee: 0, nebel: 0, wind: 8 },
  info: { abschnitt: "", hoeheGrad: 0, zeiten: null, zeitenTag: "" },
  wolkenLauf: new THREE.Vector2(),
};

const KUPPEL_U = {
  uOben: { value: new THREE.Color() }, uMitte: { value: new THREE.Color() }, uUnten: { value: new THREE.Color() },
  uGlut: { value: new THREE.Color() }, uGlutStaerke: { value: 1 }, uSonne: { value: new THREE.Vector3() },
  uWolken: { value: 0.2 }, uWolkenLauf: { value: new THREE.Vector2() }, uWolkenLicht: { value: new THREE.Color() }, uWolkenSchatten: { value: new THREE.Color() },
};

function kuppelBauen() {
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: KUPPEL_U,
    vertexShader: `varying vec3 vRichtung; void main() { vRichtung = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`,
    fragmentShader: `uniform vec3 uOben, uMitte, uUnten, uGlut, uSonne, uWolkenLicht, uWolkenSchatten; uniform float uGlutStaerke, uWolken; uniform vec2 uWolkenLauf;
      varying vec3 vRichtung;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float rauschen(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
      float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * rauschen(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
      void main() {
        vec3 d = normalize(vRichtung);
        float h = d.y;
        vec3 f = mix(uUnten, uMitte, smoothstep(-0.02, 0.22, h));
        f = mix(f, uOben, smoothstep(0.18, 0.85, h));
        // Glut um die Sonne und ein breites Band am Horizont in ihrer Richtung
        float nah = max(dot(d, uSonne), 0.0);
        vec2 dh = normalize(d.xz + 1e-5), sh = normalize(uSonne.xz + 1e-5);
        float band = pow(max(dot(dh, sh), 0.0), 3.0) * exp(-abs(h) * 9.0);
        f += uGlut * uGlutStaerke * (pow(nah, 18.0) * 0.9 + pow(nah, 4.0) * 0.25 + band * 0.55);
        // Wolken: Ebene über der Stadt, nach Bedeckung ausgedünnt
        if (h > 0.0 && uWolken > 0.01) {
          vec2 p = d.xz / (h + 0.06) * 0.9 + uWolkenLauf;
          float n = fbm(p);
          float deckung = smoothstep(1.0 - uWolken * 0.9 - 0.25, 1.0 - uWolken * 0.9 + 0.2, n);
          float rand = smoothstep(0.0, 0.25, h);
          vec3 wolke = mix(uWolkenSchatten, uWolkenLicht, clamp(n * 1.3 - 0.2 + pow(nah, 6.0) * 0.6, 0.0, 1.0));
          f = mix(f, wolke, deckung * rand * 0.92);
        }
        gl_FragColor = vec4(f, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  H.kuppel = new THREE.Mesh(new THREE.SphereGeometry(1500, 48, 24), m);
  H.kuppel.renderOrder = -10;
  H.kuppel.frustumCulled = false;
  szene.add(H.kuppel);
}

// Sonnenscheibe: tagsüber hell und weich, tief am Horizont die gestreifte Synthwave-Sonne
function sonneBauen() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uZeit: U.uZeit, uOben: { value: new THREE.Color("#ffd166") }, uUnten: { value: new THREE.Color("#fe2c55") }, uStreifen: { value: 1 }, uHell: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uZeit, uStreifen, uHell; uniform vec3 uOben, uUnten; varying vec2 vUv;
      void main() {
        vec2 p = vUv - 0.5; float r = length(p); float R = 0.3;
        float scheibe = smoothstep(R, R - 0.006, r);
        float y = p.y / R;
        float streifen = 1.0;
        if (y < 0.25) { float s = fract((y + uZeit * 0.035) * 8.0); float breite = mix(0.06, 0.6, clamp(0.25 - y, 0.0, 1.0)); streifen = mix(1.0, step(breite, s), uStreifen); }
        vec3 f = mix(uUnten, uOben, smoothstep(-0.9, 0.85, y));
        float halo = exp(-max(r - R, 0.0) * 14.0) * 0.55 * (1.0 - scheibe);
        float a = scheibe * streifen;
        gl_FragColor = vec4((f * 1.6 * a + mix(uUnten, uOben, 0.5) * halo) * uHell, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  H.sonne = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  H.sonne.renderOrder = -9;
  H.sonne.frustumCulled = false;
  szene.add(H.sonne);
}

function mondBauen() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { uPhase: { value: 0.5 }, uHell: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uPhase, uHell; varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 p = (vUv - 0.5) * 2.0; float r = length(p);
        float scheibe = smoothstep(0.5, 0.48, r);
        // Lichtgrenze: Licht kommt je nach Phase von hinten (Neumond), rechts (zunehmend), vorn (Vollmond), links (abnehmend)
        vec2 q = p / 0.5;
        float z = sqrt(max(0.0, 1.0 - dot(q, q)));
        float w = uPhase * 6.2831853;
        float hell = smoothstep(-0.05, 0.05, q.x * sin(w) - z * cos(w));
        float flecken = 0.82 + 0.18 * hash(floor(p * 7.0));
        vec3 f = vec3(0.92, 0.94, 1.0) * flecken * (0.08 + 0.92 * hell);
        float halo = exp(-max(r - 0.5, 0.0) * 9.0) * 0.25 * (1.0 - scheibe) * hell;
        gl_FragColor = vec4(f * scheibe * uHell + vec3(0.6, 0.65, 1.0) * halo * uHell, max(scheibe, halo) * uHell);
        #include <colorspace_fragment>
      }`,
  });
  H.mond = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m);
  H.mond.renderOrder = -9;
  H.mond.frustumCulled = false;
  szene.add(H.mond);
}

function sterneBauen() {
  const n = 2200, p = new Float32Array(n * 3), g = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2, v = Math.asin(0.03 + Math.random() * 0.97), r = 1300;
    p.set([Math.cos(u) * Math.cos(v) * r, Math.sin(v) * r, Math.sin(u) * Math.cos(v) * r], i * 3);
    g[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  geo.setAttribute("aHell", new THREE.BufferAttribute(g, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    uniforms: { uSichtbar: { value: 1 }, uZeit: U.uZeit, uKarte: { value: PUNKT } },
    vertexShader: `attribute float aHell; uniform float uZeit; varying float vHell;
      void main() { vHell = aHell * (0.6 + 0.4 * sin(uZeit * (1.0 + aHell * 3.0) + aHell * 50.0)); gl_PointSize = 1.2 + aHell * 2.2; gl_Position = (projectionMatrix * modelViewMatrix * vec4(position, 1.0)).xyww; }`,
    fragmentShader: `uniform float uSichtbar; uniform sampler2D uKarte; varying float vHell;
      void main() { float a = texture2D(uKarte, gl_PointCoord).a * vHell * uSichtbar; gl_FragColor = vec4(vec3(0.9, 0.93, 1.0) * a, a); }`,
  });
  H.sterne = new THREE.Points(geo, m);
  H.sterne.renderOrder = -8;
  H.sterne.frustumCulled = false;
  szene.add(H.sterne);
}

// Regen und Schnee folgen der Kamera in einem Kasten um sie herum
const REGEN_N = 5000, SCHNEE_N = 3000, KASTEN = 120;
function niederschlagBauen() {
  const rp = new Float32Array(REGEN_N * 6);
  for (let i = 0; i < REGEN_N; i++) {
    const x = (Math.random() - 0.5) * KASTEN, y = Math.random() * KASTEN * 0.7, z = (Math.random() - 0.5) * KASTEN;
    rp.set([x, y, z, x, y - 1.6, z], i * 6);
  }
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3).setUsage(THREE.DynamicDrawUsage));
  H.regen = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.35, depthWrite: false }));
  H.regen.frustumCulled = false;
  H.regen.visible = false;
  szene.add(H.regen);

  const sp = new Float32Array(SCHNEE_N * 3);
  for (let i = 0; i < SCHNEE_N; i++) sp.set([(Math.random() - 0.5) * KASTEN, Math.random() * KASTEN * 0.7, (Math.random() - 0.5) * KASTEN], i * 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3).setUsage(THREE.DynamicDrawUsage));
  H.schnee = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, map: PUNKT, transparent: true, opacity: 0.85, depthWrite: false }));
  H.schnee.frustumCulled = false;
  H.schnee.visible = false;
  szene.add(H.schnee);
}

function niederschlagBewegen(dt, kamera) {
  const w = H.wetter, wind = w.wind / 3.6; // m/s, nur für die Schräge
  H.regen.visible = w.regen > 0.02;
  if (H.regen.visible) {
    const p = H.regen.geometry.attributes.position, n = Math.round(REGEN_N * clamp(w.regen, 0, 1));
    H.regen.geometry.setDrawRange(0, n * 2);
    H.regen.position.set(kamera.position.x, kamera.position.y - KASTEN * 0.35, kamera.position.z);
    const fall = 60 * dt, seit = wind * 0.9 * dt;
    for (let i = 0; i < n; i++) {
      const j = i * 6;
      let y = p.array[j + 1] - fall, x = p.array[j] + seit;
      if (y < 0) { y += KASTEN * 0.7; x = (Math.random() - 0.5) * KASTEN; }
      if (x > KASTEN / 2) x -= KASTEN;
      p.array[j] = x; p.array[j + 1] = y; p.array[j + 3] = x - wind * 0.04; p.array[j + 4] = y - 1.6;
    }
    p.needsUpdate = true;
    H.regen.material.opacity = 0.18 + 0.25 * clamp(w.regen, 0, 1);
  }
  H.schnee.visible = w.schnee > 0.02;
  if (H.schnee.visible) {
    const p = H.schnee.geometry.attributes.position, n = Math.round(SCHNEE_N * clamp(w.schnee, 0, 1));
    H.schnee.geometry.setDrawRange(0, n);
    H.schnee.position.set(kamera.position.x, kamera.position.y - KASTEN * 0.35, kamera.position.z);
    const t = U.uZeit.value;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      let y = p.array[j + 1] - (2.2 + (i % 5) * 0.4) * dt;
      if (y < 0) y += KASTEN * 0.7;
      p.array[j] += (Math.sin(t * 0.7 + i) * 0.6 + wind * 0.15) * dt;
      if (p.array[j] > KASTEN / 2) p.array[j] -= KASTEN;
      p.array[j + 1] = y;
    }
    p.needsUpdate = true;
  }
}

export function himmelBauen() {
  kuppelBauen();
  sterneBauen();
  sonneBauen();
  mondBauen();
  niederschlagBauen();
}

/** Wetter aus der Abfrage (Open-Meteo, über den Cockpit-Server) in Ziele für die Darstellung übersetzen */
export function wetterSetzen(w) {
  if (!w) return;
  const code = Number(w.code ?? 0);
  const z = H.wetterZiel;
  z.wolken = clamp((w.wolken ?? (code >= 3 ? 90 : code >= 1 ? 40 : 10)) / 100, 0, 1);
  const regenCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const schneeCodes = [71, 73, 75, 77, 85, 86];
  z.regen = regenCodes.includes(code) ? clamp(0.25 + (w.regen ?? 0) / 4, 0.25, 1) : 0;
  z.schnee = schneeCodes.includes(code) ? clamp(0.3 + (w.schnee ?? 0) / 2, 0.3, 1) : 0;
  z.nebel = code === 45 || code === 48 ? 1 : 0;
  z.wind = Number(w.wind ?? 8);
  if (z.regen || z.schnee) z.wolken = Math.max(z.wolken, 0.85);
}

const hilf = new THREE.Vector3();
/** Einmal je Bild: Sonnenstand, Stimmung, Wetter → geteilte Werte U und Himmelsobjekte */
export function himmelAktualisieren(datum, dt, kamera) {
  const s = sonnenstand(datum), m = mondstand(datum);
  richtungAus(s.hoehe, s.kompass, H.sonneRichtung);
  richtungAus(m.hoehe, m.kompass, H.mondRichtung);
  stimmungMischen(s.hoeheGrad);

  // Wetter weich anpassen
  const w = H.wetter, z = H.wetterZiel, k = 1 - Math.exp(-dt * 0.4);
  for (const key of Object.keys(w)) w[key] += (z[key] - w[key]) * k;
  const truebe = clamp(w.wolken * 0.75 + w.regen * 0.3 + w.nebel * 0.4, 0, 1);

  KUPPEL_U.uOben.value.copy(stimmung.oben).lerp(stimmung.mitte, truebe * 0.55);
  KUPPEL_U.uMitte.value.copy(stimmung.mitte).lerp(stimmung.unten, truebe * 0.2);
  KUPPEL_U.uUnten.value.copy(stimmung.unten);
  KUPPEL_U.uGlut.value.copy(stimmung.glut);
  KUPPEL_U.uGlutStaerke.value = stimmung.glutStaerke * (1 - truebe * 0.6);
  KUPPEL_U.uSonne.value.copy(H.sonneRichtung);
  KUPPEL_U.uWolken.value = w.wolken;
  H.wolkenLauf.x += dt * (0.004 + w.wind * 0.0006);
  H.wolkenLauf.y += dt * 0.0015;
  KUPPEL_U.uWolkenLauf.value.copy(H.wolkenLauf);
  // Wolken tags hell, abends rosa angestrahlt, nachts vom Neon der Stadt von unten violett
  KUPPEL_U.uWolkenLicht.value.copy(stimmung.unten).lerp(new THREE.Color(1, 1, 1), 0.45 * (1 - stimmung.nacht)).lerp(new THREE.Color("#4a2a6a"), stimmung.nacht * 0.6);
  KUPPEL_U.uWolkenSchatten.value.copy(stimmung.mitte).multiplyScalar(0.6 + 0.25 * (1 - stimmung.nacht));

  // Geteilte Werte für alle Materialien
  const mondLicht = Math.max(0, Math.sin(m.hoehe)) * mondphase(datum).anteil;
  if (s.hoeheGrad > -3) {
    U.uSonneRichtung.value.copy(H.sonneRichtung).setY(Math.max(H.sonneRichtung.y, 0.04)).normalize();
    U.uSonneFarbe.value.copy(stimmung.sonne).multiplyScalar(1 - truebe * 0.65);
  } else {
    U.uSonneRichtung.value.copy(H.mondRichtung).setY(Math.max(H.mondRichtung.y, 0.1)).normalize();
    U.uSonneFarbe.value.setRGB(0.12, 0.14, 0.26).multiplyScalar(mondLicht * (1 - truebe * 0.8));
  }
  U.uHimmelOben.value.copy(KUPPEL_U.uOben.value);
  U.uHimmelUnten.value.copy(stimmung.unten);
  U.uUmgebung.value.copy(stimmung.umgebung).multiplyScalar(1 - truebe * 0.25);
  U.uBoden.value.copy(stimmung.boden);
  U.uNacht.value = clamp(stimmung.nacht + truebe * 0.25, 0, 1);
  U.uNeon.value = clamp(stimmung.neon + truebe * 0.15, 0, 1);
  U.uNebelFarbe.value.copy(stimmung.nebel).lerp(KUPPEL_U.uMitte.value, 0.3);
  if (w.nebel > 0.01) U.uNebelFarbe.value.lerp(new THREE.Color("#a9a2c4").multiplyScalar(1 - stimmung.nacht * 0.8), w.nebel * 0.7);
  U.uNebel.value = stimmung.dichte * (1 + w.nebel * 2.4 + w.regen * 0.5 + w.schnee * 0.6);
  U.uNass.value = clamp(w.regen * 1.2, 0, 1);

  // Sonne und Mond als Scheiben am Himmel, immer zur Kamera gedreht
  const tief = glatt(10, 0, s.hoeheGrad);
  H.sonne.visible = s.hoeheGrad > -4;
  if (H.sonne.visible) {
    const groesse = 120 + tief * 220;
    H.sonne.position.copy(kamera.position).addScaledVector(H.sonneRichtung, 1100);
    H.sonne.scale.setScalar(groesse);
    H.sonne.quaternion.copy(kamera.quaternion);
    const mu = H.sonne.material.uniforms;
    mu.uStreifen.value = tief;
    mu.uHell.value = glatt(-4, 0.5, s.hoeheGrad) * (1 - truebe * 0.85);
    mu.uOben.value.set(tief > 0.5 ? "#ffd166" : "#fff6e0");
    mu.uUnten.value.set("#fe2c55").lerp(new THREE.Color("#fff0d8"), 1 - tief);
  }
  H.mond.visible = m.hoeheGrad > -2 && stimmung.nacht > 0.2;
  if (H.mond.visible) {
    H.mond.position.copy(kamera.position).addScaledVector(H.mondRichtung, 1100);
    H.mond.scale.setScalar(70);
    H.mond.quaternion.copy(kamera.quaternion);
    H.mond.material.uniforms.uPhase.value = mondphase(datum).phase;
    H.mond.material.uniforms.uHell.value = stimmung.nacht * (1 - truebe * 0.9);
  }
  H.sterne.material.uniforms.uSichtbar.value = stimmung.sterne * (1 - truebe * 0.95);
  H.sterne.rotation.y += dt * 0.002;
  H.kuppel.position.copy(kamera.position);
  H.sterne.position.copy(kamera.position);
  niederschlagBewegen(dt, kamera);

  // Info für die Anzeige (Sonnenzeiten einmal je Tag)
  H.info.abschnitt = s.hoeheGrad >= -1 && s.hoeheGrad < 2 && datum.getHours() < 12 ? "Sonnenaufgang" : abschnitt(s.hoeheGrad);
  H.info.hoeheGrad = s.hoeheGrad;
  const tag = datum.toDateString();
  if (H.info.zeitenTag !== tag) { H.info.zeiten = sonnenzeiten(datum); H.info.zeitenTag = tag; }
  return H.info;
}

export const himmelInfo = () => H.info;
export const wetterJetzt = () => H.wetter;
