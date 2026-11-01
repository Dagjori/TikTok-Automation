// Account 2, Video 4: „Was siehst du, wenn der Boden unter dir 5 Sekunden durchsichtig wird?“
// Stil 16 „POV-Filmlook stilisiert“ (wie der Prototyp schall-schritttempo): Ich-Kamera auf einem Schulhof, der Boden wird
// durchsichtig, der Blick fällt Schicht für Schicht durch die Erde (Kugelschalen) bis in den Südpazifik.
// Dann Karte um den Gegenpunkt (Antipodeninseln 843 km), Erd-Querschnitt mit Tunnel (42 Minuten) und zurück auf den Schulhof.
// Rechnung: ../../sim/boden_durchsichtig.mjs (Tests: node --test sim/boden_durchsichtig.test.mjs).
// Deterministisch: window.renderAt(t). Kein Logo, kein Kanalname, keine Rubrik im Bild.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, keyframes, smoothstep } from "../../engine/bewegung.js";
import { mat } from "../../engine/bausteine.js";
import * as S from "../../sim/boden_durchsichtig.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.85;
const SKALA = Q.has("skala") ? +Q.get("skala") : 1; // interne 3D-Auflösung (HUD bleibt scharf)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich): Land = Koralle, Wasser = Türkis. Kein Gelb (Gelb = aktuelles Untertitel-Wort).
const KORALLE = "#FF4F5A";
const TUERKIS = "#2EC4B6";

// =====================================================================================
// Maßstab der Erde in der Welt: 1 km = 0,05 Einheiten, die Kruste ist auf 30 Einheiten übertrieben (sonst unsichtbar)
// =====================================================================================
const KK = 0.05;
const CRUST_W = 30;
const RW_KNOTEN = [[0, 0], [S.RADIUS.innerer, S.RADIUS.innerer * KK], [S.RADIUS.kernMantel, S.RADIUS.kernMantel * KK], [S.RADIUS.moho, S.RADIUS.moho * KK], [S.R, S.RADIUS.moho * KK + CRUST_W]];
/** Radius in km → Radius in der Welt */
const rw = (rKm) => {
  for (let i = 1; i < RW_KNOTEN.length; i++) if (rKm <= RW_KNOTEN[i][0]) { const [a, b] = RW_KNOTEN[i - 1], [c, d] = RW_KNOTEN[i]; return b + ((d - b) * (rKm - a)) / (c - a); }
  return RW_KNOTEN[RW_KNOTEN.length - 1][1];
};
const R_OBER = rw(S.R); // 347,05
const R_MOHO = rw(S.RADIUS.moho), R_CMB = rw(S.RADIUS.kernMantel), R_ICB = rw(S.RADIUS.innerer);
const YC = -R_OBER; // Erdmittelpunkt (Schulhofboden bei y = 0)
const R_MEER = R_OBER - 4; // Meeresboden auf der Gegenseite (4 Einheiten Wassertiefe)
const Y_ENDE = -2 * R_OBER + 1; // Blick endet 1 Einheit unter der Meeresoberfläche
/** Kamerahöhe auf dem Weg durch die Erde (weg in km: 0 … 12.742) */
const yPfad = (w) => {
  if (w <= S.R) return YC + rw(S.R - w);
  const hinten = w - S.R; // Entfernung hinter dem Mittelpunkt
  if (S.R - hinten >= S.R - S.SCHICHT.kruste) { // letzte 30 km (Kruste/Wasser): bis 1 Einheit unter die Oberfläche
    const k = (w - (S.D - S.SCHICHT.kruste)) / S.SCHICHT.kruste;
    return lerp(YC - R_MOHO, Y_ENDE, k);
  }
  return YC - rw(hinten);
};

// =====================================================================================
// Texturen (alles prozedural, deterministisch)
// =====================================================================================
function canvasTextur(b, h, malen, { wiederholen = false } = {}) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  malen(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (wiederholen) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Wert-Rauschen 0..1 (kachelbar), mehrere Oktaven */
function rauschFeld(b, h, seed, { sx = 8, sy = 4, oktaven = 4, gain = 0.5 } = {}) {
  const f = new Float32Array(b * h);
  let amp = 1, summe = 0;
  const gl = (i, j, fx, fy) => hash((((i % fx) + fx) % fx) * 7919 + (((j % fy) + fy) % fy) * 104729, seed);
  for (let o = 0; o < oktaven; o++) {
    const fx = sx * 2 ** o, fy = sy * 2 ** o;
    for (let y = 0; y < h; y++) {
      const v = (y / h) * fy, j0 = Math.floor(v), fv = v - j0, sv = fv * fv * (3 - 2 * fv);
      for (let x = 0; x < b; x++) {
        const u = (x / b) * fx, i0 = Math.floor(u), fu = u - i0, su = fu * fu * (3 - 2 * fu);
        const a = lerp(gl(i0, j0, fx, fy), gl(i0 + 1, j0, fx, fy), su), c = lerp(gl(i0, j0 + 1, fx, fy), gl(i0 + 1, j0 + 1, fx, fy), su);
        f[y * b + x] += lerp(a, c, sv) * amp;
      }
    }
    summe += amp; amp *= gain;
  }
  for (let i = 0; i < f.length; i++) f[i] /= summe;
  return f;
}
const hexRGB = (h) => { const c = new THREE.Color(h); return [c.r, c.g, c.b].map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255)); };
const rampe = (stops, x) => {
  x = clamp(x);
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) { const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const k = (x - a) / (b - a || 1); return ca.map((v, j) => v + (cb[j] - v) * k); }
  return stops[stops.length - 1][1];
};
/** Rauschtextur mit Farbverlauf (Stops: [[0..1, "#hex"]]) und optionaler Alpha-Kurve */
function rauschTextur(b, h, seed, stops, { sx = 8, sy = 4, oktaven = 4, kontrast = 1.4, alpha = null, wiederholen = true } = {}) {
  const f = rauschFeld(b, h, seed, { sx, sy, oktaven });
  const st = stops.map(([p, c]) => [p, hexRGB(c)]);
  const c = document.createElement("canvas"); c.width = b; c.height = h;
  const g = c.getContext("2d"); const id = g.createImageData(b, h);
  for (let i = 0; i < f.length; i++) {
    const v = clamp((f[i] - 0.5) * kontrast + 0.5);
    const col = rampe(st, v);
    id.data[i * 4] = col[0]; id.data[i * 4 + 1] = col[1]; id.data[i * 4 + 2] = col[2];
    id.data[i * 4 + 3] = alpha ? Math.round(255 * clamp(alpha(v))) : 255;
  }
  g.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (wiederholen) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function textSprite(text, { farbe = "#FFFFFF", kontur = "#0B1020", hoehe = 0.5, schrift = 900, b = 1024, h = 256 } = {}) {
  const tex = canvasTextur(b, h, (g) => {
    g.font = `${schrift} ${Math.round(h * 0.62)}px "SB Display", Inter, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = h * 0.11; g.strokeStyle = kontur;
    g.strokeText(text, b / 2, h * 0.54);
    g.fillStyle = farbe; g.fillText(text, b / 2, h * 0.54);
  });
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false });
  const s = new THREE.Sprite(m);
  s.scale.set(hoehe * (b / h), hoehe, 1);
  s.renderOrder = 30;
  return s;
}
const weichPunkt = () => canvasTextur(64, 64, (g) => {
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.35, "rgba(255,255,255,0.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
});

// Schicht für Schicht leuchtend: Rand-Leuchten (Fresnel) wie die Schallwellen im Prototyp
function randMaterial(farbe, { staerke = 1, potenz = 3, kern = 0.12 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, deck: { value: 1 }, staerke: { value: staerke }, potenz: { value: potenz }, kern: { value: kern } },
    vertexShader: `varying vec3 vN; varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 farbe; uniform float deck; uniform float staerke; uniform float potenz; uniform float kern; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 v = normalize(cameraPosition - vW); float f = 1.0 - abs(dot(normalize(vN), v));
        float a = (pow(f, potenz) * 1.2 + kern) * staerke * deck; gl_FragColor = vec4(farbe * a, 1.0); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
  });
}
// Fließende Hitze: zwei gegenläufig wandernde Rauschschichten, unbeleuchtet (HDR für Bloom)
function hitzeMaterial(tex, { sk = [3, 2], gain = 1.6, tint = "#FFFFFF", tempo = 1 } = {}) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.ShaderMaterial({
    uniforms: { tA: { value: tex }, zeit: { value: 0 }, sk: { value: new THREE.Vector2(...sk) }, gain: { value: gain }, tint: { value: new THREE.Color(tint) }, tempo: { value: tempo } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D tA; uniform float zeit; uniform vec2 sk; uniform float gain; uniform vec3 tint; uniform float tempo; varying vec2 vUv;
      void main(){ vec2 u1 = vUv * sk + vec2(zeit * 0.011, zeit * 0.004) * tempo; vec2 u2 = vUv * sk * 1.7 + vec2(-zeit * 0.015, zeit * 0.007) * tempo;
        vec3 a = texture2D(tA, u1).rgb; vec3 b = texture2D(tA, u2).rgb; vec3 c = (a * b * 1.6 + a * 0.55 + b * 0.45) * 0.85; gl_FragColor = vec4(c * tint * gain, 1.0); }`,
    side: THREE.DoubleSide, fog: false,
  });
}

// =====================================================================================
// Schulhof
// =====================================================================================
function figurBauen({ jacke = "#4E5D8C", hose = "#2A2F3D", haare = "#4A2E22", haut = "#E8B996", groesse = 1.45 } = {}) {
  const g = new THREE.Group();
  const k = groesse / 1.68;
  const m = (f, r = 0.75) => mat(f, { rau: r });
  const bein = (x) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.68, 4, 10), m(hose)); b.position.set(0, 0.43, x); return b; };
  g.add(bein(-0.1), bein(0.1));
  const schuh = (x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.11), m("#1C1F27")); s.position.set(0.04, 0.04, x); return s; };
  g.add(schuh(-0.1), schuh(0.1));
  const rumpf = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), m(jacke, 0.85));
  rumpf.scale.set(0.78, 1, 1.05); rumpf.position.y = 1.06; g.add(rumpf);
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), m(haut, 0.55)); kopf.scale.set(0.95, 1.08, 0.9); kopf.position.y = 1.53; g.add(kopf);
  const haar = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), m(haare, 0.9)); haar.position.set(-0.012, 1.55, 0); haar.rotation.z = 0.25; g.add(haar);
  const rucksack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.3), m(jacke === "#8A4F4F" ? "#3C5A8A" : "#C45A3C", 0.8)); rucksack.position.set(-0.2, 1.1, 0); g.add(rucksack);
  const arm = (seite) => {
    const p = new THREE.Group(); p.position.set(0, 1.3, seite * 0.23);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.5, 4, 10), m(jacke, 0.85)); a.position.y = -0.28; p.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m(haut, 0.6)); hand.position.y = -0.58; p.add(hand);
    g.add(p); return p;
  };
  const armL = arm(-1), armR = arm(1);
  g.scale.setScalar(k);
  return { g, armL, armR };
}

const BODEN_B = 24; // Kantenlänge der bemalten Bodenplatte (m)
function bodenTextur() {
  return canvasTextur(2048, 2048, (g, b, h) => {
    const px = b / BODEN_B; // Pixel je Meter
    const X = (x) => (x + BODEN_B / 2) * px, Z = (z) => (z + BODEN_B / 2) * px;
    g.fillStyle = "#5C5F69"; g.fillRect(0, 0, b, h);
    // Flicken und Fugen
    for (let i = 0; i < 70; i++) {
      const x = hash(i, 1) * b, y = hash(i, 2) * h, w = (0.8 + hash(i, 3) * 4) * px, hh = (0.6 + hash(i, 4) * 3) * px;
      const v = 78 + Math.round(hash(i, 5) * 22);
      g.fillStyle = `rgba(${v},${v + 2},${v + 8},${0.09 + hash(i, 6) * 0.12})`; g.fillRect(x, y, w, hh);
    }
    for (let i = 0; i < 14000; i++) { const v = hash(i, 7) > 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${0.04 + hash(i, 8) * 0.07})`; g.fillRect(hash(i, 9) * b, hash(i, 10) * h, 3 + hash(i, 11) * 5, 3 + hash(i, 12) * 5); }
    g.strokeStyle = "rgba(25,26,32,0.55)"; g.lineWidth = 0.035 * px; g.lineJoin = "round";
    for (let i = 0; i < 26; i++) { // Risse
      g.beginPath(); let x = hash(i, 20) * b, y = hash(i, 21) * h; g.moveTo(x, y);
      for (let k = 0; k < 9; k++) { x += (hash(i * 31 + k, 22) - 0.5) * 1.6 * px; y += (hash(i * 31 + k, 23) - 0.3) * 1.2 * px; g.lineTo(x, y); }
      g.stroke();
    }
    // Schatten (eingebacken, verschwinden mit dem Boden)
    const schatten = (x, z, rx, rz, a = 0.4) => { const gr = g.createRadialGradient(X(x), Z(z), 0, X(x), Z(z), rx * px); gr.addColorStop(0, `rgba(10,12,20,${a})`); gr.addColorStop(1, "rgba(10,12,20,0)"); g.save(); g.translate(X(x), Z(z)); g.scale(1, rz / rx); g.translate(-X(x), -Z(z)); g.fillStyle = gr; g.beginPath(); g.arc(X(x), Z(z), rx * px, 0, 7); g.fill(); g.restore(); };
    schatten(-4.2, -8.5, 2.2, 1.3); schatten(5.8, -10.2, 1.3, 0.5); schatten(-7.5, -11.2, 1.3, 0.5); schatten(8.6, -5, 0.9, 0.6);
    for (const [x, z] of [[-1.5, -11.5], [3.2, -12], [8.8, -8.6], [-9, -6.2]]) schatten(x + 0.3, z + 0.15, 0.55, 0.26, 0.45);
    // Markierungen: Hüpfkästchen (Kreide, vor dir), Kreis, Felder
    g.strokeStyle = "rgba(244,246,250,0.92)"; g.lineWidth = 0.055 * px; g.lineCap = "round";
    const feld = (x, z, w, hh, nr) => { g.strokeRect(X(x), Z(z), w * px, hh * px); if (nr) { g.save(); g.fillStyle = "rgba(244,246,250,0.9)"; g.font = `800 ${0.34 * px}px Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(nr), X(x + w / 2), Z(z + hh / 2) + 0.02 * px); g.restore(); } };
    const hx = 0.35, hz = -1.2, s = 0.62; // Hüpfkästchen von dir weg (z wird kleiner)
    feld(hx, hz, s, s, 1); feld(hx, hz - s, s, s, 2); feld(hx, hz - 2 * s, s, s, 3);
    feld(hx - s, hz - 3 * s, s, s, 4); feld(hx, hz - 3 * s, s, s, 5);
    feld(hx, hz - 4 * s, s, s, 6); feld(hx - s, hz - 5 * s, s, s, 7); feld(hx, hz - 5 * s, s, s, 8);
    feld(hx, hz - 6 * s, s, s, 9);
    g.beginPath(); g.arc(X(hx + s / 2), Z(hz - 6 * s - 0.2), 0.52 * px, Math.PI, 0); g.closePath(); g.stroke();
    g.fillStyle = "rgba(244,246,250,0.9)"; g.font = `800 ${0.34 * px}px Inter, sans-serif`; g.textAlign = "center"; g.fillText("10", X(hx + s / 2), Z(hz - 6 * s - 0.42));
    g.lineWidth = 0.07 * px; g.strokeStyle = "rgba(244,246,250,0.8)";
    g.beginPath(); g.arc(X(0), Z(-12), 4.2 * px, 0, 7); g.stroke(); // Mittelkreis des Spielfelds
    g.beginPath(); g.moveTo(X(-12), Z(-12)); g.lineTo(X(12), Z(-12)); g.stroke();
    g.strokeStyle = "rgba(159,211,255,0.8)"; g.lineWidth = 0.05 * px; g.strokeRect(X(-11), Z(-1.5), 5.2 * px, 3.4 * px); // Spielfeld in Hellblau
    g.strokeStyle = "rgba(244,246,250,0.55)"; g.lineWidth = 0.045 * px; // Vier-Felder-Spiel
    g.strokeRect(X(5), Z(1), 3.2 * px, 3.2 * px); g.beginPath(); g.moveTo(X(6.6), Z(1)); g.lineTo(X(6.6), Z(4.2)); g.moveTo(X(5), Z(2.6)); g.lineTo(X(8.2), Z(2.6)); g.stroke();
    // bunte Kreidezeichnungen
    const kreide = ["#7DB7FF", "#FF8FA3", "#9BE59A", "#FFB86B"];
    g.lineWidth = 0.05 * px;
    for (let i = 0; i < 4; i++) { g.strokeStyle = kreide[i]; g.beginPath(); g.arc(X(-5.5 + i * 1.1), Z(-3.5 - (i % 2) * 0.6), 0.28 * px, 0, 7); g.stroke(); }
    g.strokeStyle = kreide[0]; g.beginPath(); g.moveTo(X(-6), Z(-2.2)); g.quadraticCurveTo(X(-5), Z(-1.2), X(-3.8), Z(-2.2)); g.stroke();
    g.fillStyle = "#4A4D56"; g.beginPath(); g.arc(X(2.6), Z(-6.4), 0.34 * px, 0, 7); g.fill(); // Gully
    g.strokeStyle = "rgba(0,0,0,0.5)"; g.lineWidth = 0.03 * px; for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(X(2.6 + i * 0.1), Z(-6.4) - 0.28 * px); g.lineTo(X(2.6 + i * 0.1), Z(-6.4) + 0.28 * px); g.stroke(); }
    // Rand der Platte weich in den Asphalt überblenden
    for (const [x0, y0, x1, y1] of [[0, 0, 0, 0.1 * h], [0, h, 0, 0.9 * h], [0, 0, 0.1 * b, 0], [b, 0, 0.9 * b, 0]]) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, "rgba(92,95,105,1)"); gr.addColorStop(1, "rgba(92,95,105,0)"); g.fillStyle = gr; g.fillRect(0, 0, b, h); }
  });
}
function bodenMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, hat: { value: tex ? 1 : 0 }, basis: { value: new THREE.Color("#5C5F69") }, radius: { value: 0 }, weich: { value: 0.5 }, hell: { value: 1.0 }, aussparen: { value: tex ? 0 : 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform sampler2D map; uniform float hat; uniform vec3 basis; uniform float radius; uniform float weich; uniform float hell; uniform float aussparen; varying vec2 vUv; varying vec3 vW;
      void main(){
        float d = length(vW.xz);
        if (aussparen > 0.5 && abs(vW.x) < 12.0 && abs(vW.z) < 12.0) discard;
        vec3 c = hat > 0.5 ? texture2D(map, vUv).rgb : basis;
        float an = radius > 0.001 ? smoothstep(radius - weich, radius + 0.02, d) : 1.0;
        float rim = radius > 0.001 ? exp(-pow((d - radius - 0.05) / 0.22, 2.0)) : 0.0;
        vec3 col = c * hell + rim * vec3(0.10, 1.05, 0.95) * 1.7;
        float al = max(an, rim * 0.75);
        if (al < 0.01) discard;
        gl_FragColor = vec4(col, al);
      }`,
    transparent: true, depthWrite: true, fog: false,
  });
}

function baueHof(szene) {
  const hof = new THREE.Group();
  szene.add(hof);
  const boden = { mats: [] };
  const plane = (b, h, y, material) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(b, h), material); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 6; boden.mats.push(material); return m; };
  hof.add(plane(900, 900, 0, bodenMaterial(null)));
  hof.add(plane(BODEN_B, BODEN_B, 0.004, bodenMaterial(bodenTextur())));

  // --- Schulgebäude (Fassade mit Fenstern), Flügel rechts und links ---
  const fassade = canvasTextur(1024, 512, (g, b, h) => {
    g.fillStyle = "#E9D9BE"; g.fillRect(0, 0, b, h);
    g.fillStyle = "rgba(160,120,90,0.18)"; g.fillRect(0, h * 0.88, b, h * 0.12);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
      const x = 28 + c * 124, y = 34 + r * 158;
      g.fillStyle = "#F7F2E8"; g.fillRect(x - 6, y - 6, 96, 126);
      const gr = g.createLinearGradient(x, y, x, y + 114); gr.addColorStop(0, "#9CC8F0"); gr.addColorStop(1, "#5E8FBF");
      g.fillStyle = gr; g.fillRect(x, y, 84, 114);
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(x + 6, y + 8, 18, 98);
      g.fillStyle = "#F7F2E8"; g.fillRect(x + 40, y, 4, 114); g.fillRect(x, y + 56, 84, 4);
    }
  }, { wiederholen: true });
  fassade.repeat.set(7, 1);
  const wandMat = mat("#E9D9BE", { rau: 0.95 });
  const baukoerper = (b, h, t, x, y, z, ry = 0) => {
    const tex = fassade.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(b / 12, 1);
    const m = new THREE.Mesh(new THREE.BoxGeometry(b, h, t), [wandMat, wandMat, mat("#8E7A62", { rau: 0.9 }), wandMat, new THREE.MeshLambertMaterial({ map: tex }), wandMat]);
    m.position.set(x, y, z); m.rotation.y = ry; hof.add(m); return m;
  };
  baukoerper(70, 11, 11, 0, 5.5, -34);
  baukoerper(34, 9, 10, 32, 4.5, -14, -Math.PI / 2);
  baukoerper(34, 9, 10, -32, 4.5, -14, Math.PI / 2);
  const dach = new THREE.Mesh(new THREE.BoxGeometry(72, 0.5, 12), mat("#6B4A3E", { rau: 0.8 })); dach.position.set(0, 11.2, -34); hof.add(dach);
  const eingang = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 3.4), mat("#C9573F", { rau: 0.7 })); eingang.position.set(2, 3.4, -28.2); hof.add(eingang);
  const tuer = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.1, 0.2), mat("#3E6B9E", { rau: 0.5 })); tuer.position.set(2, 1.55, -28.45); hof.add(tuer);

  // --- Zaun hinten rechts/links, Bäume ---
  const pfostenGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6);
  const pfostenMat = mat("#2F3544", { rau: 0.6, metall: 0.5 });
  const nPf = 30;
  const pf = new THREE.InstancedMesh(pfostenGeo, pfostenMat, nPf * 2);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nPf; i++) { m4.makeTranslation(-27.5, 0.8, 8 - i * 1.5); pf.setMatrixAt(i, m4); m4.makeTranslation(27.5, 0.8, 8 - i * 1.5); pf.setMatrixAt(nPf + i, m4); }
  hof.add(pf);
  for (const x of [-27.5, 27.5]) for (const y of [0.45, 1.1, 1.55]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 45), pfostenMat); r.position.set(x, y, -14); hof.add(r); }
  const baeume = [[-19, -24, 1.7], [-14, -22, 1.4], [18, -23, 1.8], [23, -17, 1.5], [-23, -6, 1.6], [21, -1, 1.5], [-12, 8, 1.3], [14, 7, 1.4], [-24, -14, 1.6], [25, -9, 1.4]];
  const stamm = new THREE.CylinderGeometry(0.16, 0.24, 3.2, 8); stamm.translate(0, 1.6, 0);
  const krone = new THREE.IcosahedronGeometry(1, 1);
  baeume.forEach(([x, z, s], i) => {
    const b = new THREE.Group();
    b.add(new THREE.Mesh(stamm, mat("#7A5A44", { rau: 0.9 })));
    for (const [dx, dy, dz, k, f] of [[0, 4.6, 0, 2.4, "#4E9A5E"], [1.2, 5.4, 0.5, 1.7, "#79C27C"], [-1.1, 5.2, -0.6, 1.6, "#5BAA68"]]) { const c = new THREE.Mesh(krone, mat(f, { rau: 0.8 })); c.scale.setScalar(k); c.position.set(dx, dy, dz); b.add(c); }
    b.scale.setScalar(s * (0.8 + hash(i, 9) * 0.3)); b.position.set(x, 0, z); b.rotation.y = hash(i, 4) * 6; hof.add(b);
  });

  // --- Tischtennisplatte (Beton, wie im Pausenhof) ---
  const platte = new THREE.Group();
  const oben = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.07, 1.525), mat("#4C7CA8", { rau: 0.6 })); oben.position.y = 0.76; platte.add(oben);
  const lin = (b, h, x, z) => { const l = new THREE.Mesh(new THREE.BoxGeometry(b, 0.004, h), mat("#F4F6FA", { rau: 0.5 })); l.position.set(x, 0.797, z); platte.add(l); };
  lin(2.74, 0.02, 0, -0.752); lin(2.74, 0.02, 0, 0.752); lin(0.02, 1.525, -1.36, 0); lin(0.02, 1.525, 1.36, 0); lin(2.74, 0.006, 0, 0);
  for (const x of [-1.05, 1.05]) { const bein = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.76, 1.3), mat("#9AA0A8", { rau: 0.9 })); bein.position.set(x, 0.38, 0); platte.add(bein); }
  const netz = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.15, 1.7), new THREE.MeshLambertMaterial({ color: "#3A3F4A" })); netz.position.set(0, 0.88, 0); platte.add(netz);
  platte.position.set(-4.2, 0, -8.5); platte.rotation.y = 0.35; hof.add(platte);
  // --- Bänke, Basketballkorb, Ball, Rucksäcke ---
  const bank = (x, z, ry) => {
    const b = new THREE.Group();
    const sitz = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), mat("#7A5B44", { rau: 0.7 })); sitz.position.y = 0.46; b.add(sitz);
    const lehne = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.05), mat("#7A5B44", { rau: 0.7 })); lehne.position.set(0, 0.72, 0.2); b.add(lehne);
    for (const fx of [-0.75, 0.75]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.4), mat("#2F3544")); f.position.set(fx, 0.23, 0); b.add(f); }
    b.position.set(x, 0, z); b.rotation.y = ry; hof.add(b);
  };
  bank(5.8, -10.2, -0.2); bank(-7.5, -11.2, 0.15);
  const korb = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.5, 10), mat("#2F3544", { rau: 0.5, metall: 0.5 })); mast.position.y = 1.75; korb.add(mast);
  const brett = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.05), mat("#F4F6FA", { rau: 0.4 })); brett.position.set(0, 3.2, 0.4); korb.add(brett);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 8, 24), mat("#E8642B", { rau: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.set(0, 2.95, 0.65); korb.add(ring);
  korb.position.set(8.6, 0, -5); korb.rotation.y = -0.9; hof.add(korb);
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshStandardMaterial({ color: "#F4F6FA", roughness: 0.5, flatShading: true })); ball.position.set(-1.35, 0.11, -3.0); hof.add(ball);
  for (const [x, z, f, ry] of [[-2.6, -9.6, "#C45A3C", 0.4], [-5.8, -7.0, "#3C5A8A", -0.3], [3.4, -11.6, "#5E8F5E", 0.9]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.44, 0.2), mat(f, { rau: 0.8 })); r.position.set(x, 0.22, z); r.rotation.y = ry; hof.add(r);
  }
  // --- Kinder in der Ferne ---
  const jacken = ["#8A4F4F", "#4F6A8A", "#5E6B4A", "#7A5E4A", "#6C4F8A"];
  const kinder = [[-1.5, -11.5, 0.6], [3.2, -12, 3.8], [8.8, -8.6, -1.2], [-9, -6.2, 1.3], [0.4, -14.8, 2.2]].map(([x, z, ry], i) => {
    const f = figurBauen({ jacke: jacken[i], haare: hash(i, 9) > 0.5 ? "#2A1E18" : "#8A6A3A", groesse: 1.25 + hash(i, 8) * 0.25 });
    f.g.position.set(x, 0, z); f.g.rotation.y = ry; hof.add(f.g); return f;
  });
  return { hof, boden, kinder, platte };
}

// =====================================================================================
// Die Erde unter dir: Kugelschalen, Hitze, Meer auf der Gegenseite
// =====================================================================================
function baueAbgrund(szene) {
  const gr = new THREE.Group();
  gr.position.set(0, YC, 0);
  szene.add(gr);
  const kugel = (r, material, { ws = 64, hs = 40, ro = 1 } = {}) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, ws, hs), material);
    m.rotation.z = Math.PI / 2; // Pole auf die x-Achse, weg von der Blickachse
    m.frustumCulled = false;
    gr.add(m);
    m.renderOrder = ro;
    return m;
  };
  const hitzen = [];
  const hitze = (tex, o) => { const m = hitzeMaterial(tex, o); hitzen.push(m); return m; };
  // Mantel: dunkle Lava mit glühenden Adern (Innenwand der Kugel)
  const texMantel = rauschTextur(1024, 512, 11, [[0, "#0A0305"], [0.35, "#2A0808"], [0.55, "#8A1C0C"], [0.75, "#E04512"], [1, "#FF8A2E"]], { sx: 6, sy: 3, oktaven: 5, kontrast: 2.1 });
  kugel(R_MOHO - 1, hitze(texMantel, { sk: [2, 1], gain: 1.0 }), { ws: 96, hs: 48 });
  // äußerer Kern: flüssiges Eisen, hell
  const texKern = rauschTextur(1024, 512, 23, [[0, "#4A0F05"], [0.4, "#B53410"], [0.65, "#F2701E"], [0.85, "#FFA444"], [1, "#FFE0B0"]], { sx: 6, sy: 3, oktaven: 5, kontrast: 2.5 });
  kugel(R_CMB, hitze(texKern, { sk: [4, 3], gain: 1.0, tempo: 1.6 }), { ws: 96, hs: 48 });
  // innerer Kern: weißglühend
  const texInnen = rauschTextur(512, 256, 37, [[0, "#E8742E"], [0.45, "#FFB878"], [0.8, "#FFE6C8"], [1, "#FFFFFF"]], { sx: 6, sy: 3, oktaven: 4, kontrast: 2.4 });
  kugel(R_ICB, hitze(texInnen, { sk: [4, 3], gain: 1.0, tempo: 2.2 }), { ws: 64, hs: 32 });

  // Rand-Leuchten an den Grenzen (Fresnel, additiv)
  const rand = [
    kugel(R_MOHO, randMaterial("#FF7A2E", { staerke: 0.9, potenz: 2.6, kern: 0.06 }), { ro: 4 }),
    kugel(R_CMB + 0.3, randMaterial("#FFB067", { staerke: 0.9, potenz: 2.8, kern: 0.06 }), { ro: 4 }),
    kugel(R_ICB + 0.3, randMaterial("#FFFFFF", { staerke: 0.9, potenz: 2.8, kern: 0.06 }), { ro: 4 }),
  ];
  // Krustenschichten (durchscheinend, additiv: Boden, Sand, Kies, Granit, Basalt)
  const schichten = [
    { r: R_OBER - 1.6, farbe: "#C8A074", a: 0.9, seed: 41 }, { r: R_OBER - 5, farbe: "#E6D2A0", a: 0.85, seed: 42 }, { r: R_OBER - 10.5, farbe: "#B7B4AC", a: 0.85, seed: 43 },
    { r: R_OBER - 17, farbe: "#D8A4A0", a: 0.85, seed: 44 }, { r: R_OBER - 23.5, farbe: "#7E93B4", a: 0.9, seed: 45 },
  ];
  const kruste = schichten.map((s, i) => {
    const tex = rauschTextur(512, 256, s.seed, [[0, s.farbe], [1, s.farbe]], { sx: 14, sy: 7, oktaven: 4, kontrast: 2.4, alpha: (v) => smoothstep(0.64, 0.82, v) * 0.55 });
    const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: s.a, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: new THREE.Color(0.7, 0.7, 0.7) });
    tex.repeat.set(2, 2);
    return { m: kugel(s.r, m, { ro: 2 + i * 0.01 }), r: s.r };
  });
  // Meeresboden und Meeresoberfläche nur auf der Gegenseite (Kappe um den unteren Pol)
  const kappe = (r, mater, winkel, ro) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 16, 0, Math.PI * 2, Math.PI - winkel, winkel), mater); m.frustumCulled = false; m.renderOrder = ro; gr.add(m); return m; };
  const texBoden = rauschTextur(512, 512, 51, [[0, "#102A3A"], [0.5, "#1D4C5C"], [0.8, "#3C7E84"], [1, "#6FB5B0"]], { sx: 10, sy: 10, oktaven: 4, kontrast: 1.6 });
  texBoden.repeat.set(5, 5);
  kappe(R_MEER, new THREE.MeshBasicMaterial({ map: texBoden, side: THREE.DoubleSide, fog: false }), 0.5, 1);
  const texWelle = rauschTextur(512, 512, 52, [[0, "#1F8FB0"], [0.5, "#4FD0DC"], [0.8, "#B8F4F2"], [1, "#FFFFFF"]], { sx: 8, sy: 8, oktaven: 4, kontrast: 2.2 });
  texWelle.repeat.set(7, 7);
  const oberflaeche = kappe(R_OBER - 0.05, new THREE.MeshBasicMaterial({ map: texWelle, color: new THREE.Color(1.5, 1.5, 1.5), side: THREE.DoubleSide, fog: false }), 0.5, 1);
  // Lichtstrahlen im Wasser
  const strahlen = new THREE.Group(); gr.add(strahlen);
  for (let i = 0; i < 9; i++) {
    const a = hash(i, 61) * Math.PI * 2, d = 3 + hash(i, 62) * 12;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.5 + hash(i, 63), 2.2 + hash(i, 64) * 1.6, 4.4, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: new THREE.Color("#7FEFF2").multiplyScalar(0.28), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.position.set(Math.cos(a) * d, -R_OBER + 2.2 - 0.01, Math.sin(a) * d);
    m.rotation.x = Math.PI; // breit an der Oberfläche
    m.scale.y = -1;
    strahlen.add(m);
  }
  // Fische (kleine Schwärme) unter der Oberfläche
  const fische = new THREE.Group(); gr.add(fische);
  const fischGeo = new THREE.SphereGeometry(0.16, 8, 6); fischGeo.scale(2.2, 0.8, 0.45);
  const fischMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#CFFAF5").multiplyScalar(1.6), fog: false });
  const fischInst = new THREE.InstancedMesh(fischGeo, fischMat, 36); fischInst.frustumCulled = false; fische.add(fischInst);
  // Partikel entlang der Achse (Staub, Funken, Plankton), Farbe nach Schicht
  const NP = 1500;
  const pos = new Float32Array(NP * 3), col = new Float32Array(NP * 3);
  const farbeBei = (y) => { // y = Weltkoordinate relativ zum Mittelpunkt
    const r = Math.abs(y);
    if (r > R_OBER - 4) return [0.7, 1.4, 1.4];
    if (r > R_MOHO) return [1.1, 0.8, 0.55];
    if (r > R_CMB) return [1.7, 0.55, 0.22];
    if (r > R_ICB) return [2.0, 1.1, 0.45];
    return [2.2, 1.8, 1.4];
  };
  for (let i = 0; i < NP; i++) {
    const y = (hash(i, 71) * 2 - 1) * R_OBER; // gleichmäßig über die ganze Achse
    const rad = 1.5 + hash(i, 72) * 22, an = hash(i, 73) * Math.PI * 2;
    pos[i * 3] = Math.cos(an) * rad; pos[i * 3 + 1] = y; pos[i * 3 + 2] = Math.sin(an) * rad;
    const c = farbeBei(y); const s = 0.5 + hash(i, 74) * 0.7;
    col[i * 3] = c[0] * s; col[i * 3 + 1] = c[1] * s; col[i * 3 + 2] = c[2] * s;
  }
  const pg = new THREE.BufferGeometry();
  pg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); pg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const partikel = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.55, map: weichPunkt(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, fog: false }));
  partikel.frustumCulled = false; partikel.renderOrder = 8; gr.add(partikel);
  return { gr, hitzen, rand, kruste, strahlen, fische, fischInst, oberflaeche, partikel };
}

// =====================================================================================
// Karte um den Gegenpunkt (azimutale Karte, Abstand vom Mittelpunkt stimmt)
// =====================================================================================
function baueKarte(szene, daten) {
  const gr = new THREE.Group(); gr.position.set(3000, 0, 0); szene.add(gr);
  const M100 = 100; // 1 Einheit = 100 km
  const c0 = S.GEGENPUNKT;
  const proj = (lat, lon) => {
    const p = (lat * Math.PI) / 180, p0 = (c0.lat * Math.PI) / 180, dl = ((lon - c0.lon) * Math.PI) / 180;
    const cosc = clamp(Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl), -1, 1);
    const c = Math.acos(cosc), k = c < 1e-9 ? 1 : c / Math.sin(c);
    const x = k * Math.cos(p) * Math.sin(dl), y = k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl));
    return { x: (x * S.R) / M100, z: (-y * S.R) / M100, km: c * S.R };
  };
  // Ozean: Scheibe mit Verlauf
  const ozTex = canvasTextur(512, 512, (g, b) => {
    const r = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
    r.addColorStop(0, "#1B8FA6"); r.addColorStop(0.45, "#126A86"); r.addColorStop(0.85, "#0B3556"); r.addColorStop(1, "#09182E");
    g.fillStyle = r; g.fillRect(0, 0, b, b);
  });
  const ozean = new THREE.Mesh(new THREE.CircleGeometry(95, 96), new THREE.MeshBasicMaterial({ map: ozTex, fog: false }));
  ozean.rotation.x = -Math.PI / 2; gr.add(ozean);
  // Entfernungsringe
  const ring = (km, farbe, breite, deck) => {
    const r = km / M100;
    const m = new THREE.Mesh(new THREE.RingGeometry(r - breite / 2, r + breite / 2, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(deck), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.02; gr.add(m); return m;
  };
  const ringe = [1000, 2000, 3000, 4000, 5000].map((km) => ring(km, "#8FE9FF", 0.1, 0.35));
  // Land als Punkte (Natural Earth, ca. 165 km Abstand)
  const punkte = daten.punkte.map(([la, lo]) => ({ la, lo, ...proj(la, lo) })).filter((p) => p.km < 8200);
  const dotGeo = new THREE.CircleGeometry(0.62, 10); dotGeo.rotateX(-Math.PI / 2);
  const dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(KORALLE).multiplyScalar(1.15), fog: false }), punkte.length);
  const m4 = new THREE.Matrix4();
  punkte.forEach((p, i) => { m4.makeTranslation(p.x, 0.05, p.z); dots.setMatrixAt(i, m4); });
  gr.add(dots);
  // Antipodeninseln, 843 km: Marke, Strahl, hervorgehobener Ring
  const ai = proj(S.ANTIPODENINSELN.lat, S.ANTIPODENINSELN.lon);
  const insel = new THREE.Group(); insel.position.set(ai.x, 0, ai.z); gr.add(insel);
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.5, 2.2, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(1.6), fog: false }));
  pin.position.y = 1.4; pin.rotation.x = Math.PI; insel.add(pin);
  const pinKopf = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(KORALLE).multiplyScalar(2.2), fog: false })); pinKopf.position.y = 2.6; insel.add(pinKopf);
  const rIns = ring(ai.km, "#FFFFFF", 0.22, 1.3);
  const rDist = Math.hypot(ai.x, ai.z);
  // Verbindungslinie vom Gegenpunkt zur Insel (Länge = 843 km)
  const linie = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(1.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  linie.scale.x = rDist; linie.position.set(ai.x / 2, 0.12, ai.z / 2); linie.rotation.y = -Math.atan2(ai.z, ai.x); gr.add(linie);
  // Du / Gegenpunkt in der Mitte: Ring plus Lichtstrahl nach oben
  const duRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.4, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(2.2), side: THREE.DoubleSide, fog: false }));
  duRing.rotation.x = -Math.PI / 2; duRing.position.y = 0.2; gr.add(duRing);
  const strahl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 1.1, 36, 16, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(0.9), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  strahl.position.y = 18; gr.add(strahl);
  // Beschriftungen als 3D-Schilder
  const etikett = (text, x, z, o = {}) => { const s = textSprite(text, { hoehe: o.hoehe ?? 2.6, b: 1400, h: 256, farbe: o.farbe ?? "#FFFFFF" }); s.position.set(x, o.y ?? 4.2, z); gr.add(s); return s; };
  const nz = proj(-43.5, 172.5); // Südinsel
  const aus = proj(-33.0, 150.0);
  const labels = {
    insel: etikett("ANTIPODENINSELN", ai.x + 1.5, ai.z - 7.5, { hoehe: 2.2 }),
    nz: etikett("NEUSEELAND", nz.x - 1, nz.z + 6, { hoehe: 2.6, farbe: KORALLE, y: 3 }),
    australien: etikett("AUSTRALIEN", aus.x + 4, aus.z - 3, { hoehe: 3, farbe: KORALLE, y: 3 }),
    du: etikett("HIER KOMMST DU AN", 0, 4.5, { hoehe: 2.6, farbe: TUERKIS, y: 6 }),
  };
  labels.insel.position.set(ai.x + 1.5, 6.4, ai.z - 2.5);
  return { gr, ozean, ringe, dots, rIns, linie, insel, strahl, duRing, labels, proj, ai, nz, aus };
}

// =====================================================================================
// Erd-Querschnitt mit Tunnel (Schnitt durch die Mitte, Kruste übertrieben)
// =====================================================================================
function baueSchnitt(szene, renderer) {
  renderer.localClippingEnabled = true;
  const RC = 11, fk = RC / R_OBER;
  const gr = new THREE.Group(); gr.position.set(-3000, 0, 0); szene.add(gr);
  const bRad = (r) => rw(r) * fk;
  // Querschnittsfläche als Radial-Textur
  const flaeche = canvasTextur(1024, 1024, (g, b) => {
    const c = b / 2;
    const r = (rKm) => (rw(rKm) / R_OBER) * c;
    const rg = g.createRadialGradient(c, c, 0, c, c, c);
    const st = (kmR) => clamp(r(kmR) / c);
    rg.addColorStop(0, "#FFFDF2");
    rg.addColorStop(st(S.RADIUS.innerer) - 0.004, "#FFE9B8");
    rg.addColorStop(st(S.RADIUS.innerer) + 0.004, "#FFB347");
    rg.addColorStop(st(S.RADIUS.kernMantel) - 0.004, "#FF7A22");
    rg.addColorStop(st(S.RADIUS.kernMantel) + 0.004, "#F2552E");
    rg.addColorStop(st(S.RADIUS.moho) - 0.004, "#A82A1C");
    rg.addColorStop(st(S.RADIUS.moho) + 0.004, "#7B5A3E");
    rg.addColorStop(1, "#5E4631");
    g.fillStyle = rg; g.beginPath(); g.arc(c, c, c - 1, 0, 7); g.fill();
    g.strokeStyle = "rgba(12,14,26,0.85)"; g.lineWidth = 7;
    for (const km of [S.RADIUS.innerer, S.RADIUS.kernMantel, S.RADIUS.moho]) { g.beginPath(); g.arc(c, c, r(km), 0, 7); g.stroke(); }
    // Körnung im Mantel
    for (let i = 0; i < 2600; i++) { const a = hash(i, 81) * 7, rr = r(S.RADIUS.kernMantel) + hash(i, 82) * (r(S.RADIUS.moho) - r(S.RADIUS.kernMantel)); g.fillStyle = `rgba(255,${120 + Math.round(hash(i, 83) * 100)},60,0.07)`; g.beginPath(); g.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, 3 + hash(i, 84) * 9, 0, 7); g.fill(); }
  });
  const flMat = new THREE.MeshBasicMaterial({ map: flaeche, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.15, 1.15), fog: false });
  const halb = new THREE.CircleGeometry(RC, 128, -Math.PI / 2, Math.PI);
  const fA = new THREE.Mesh(halb, flMat); gr.add(fA); // Ebene z = 0, x ≥ 0
  const fB = new THREE.Mesh(halb, flMat); fB.rotation.y = -Math.PI / 2; gr.add(fB); // Ebene x = 0, z ≥ 0
  // Außenhülle (Planet), Keil ausgeschnitten
  const pl1 = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), pl2 = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  const planetTex = rauschTextur(1024, 512, 91, [[0, "#1B5EA8"], [0.52, "#2E7FC9"], [0.56, "#5DAF62"], [0.7, "#3E8A4F"], [0.85, "#8B7A55"], [1, "#E8E4D6"]], { sx: 4, sy: 2, oktaven: 5, kontrast: 3.4 });
  const huelle = new THREE.Mesh(new THREE.SphereGeometry(RC, 96, 64), new THREE.MeshBasicMaterial({ map: planetTex, clippingPlanes: [pl1, pl2], clipIntersection: true, fog: false }));
  gr.add(huelle);
  // Tunnel (Achse x = z = 0) und Punkt, der fällt
  const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2 * RC + 0.2, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(1.7), fog: false }));
  gr.add(tunnel);
  const spur = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1, 14, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(1.1), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  gr.add(spur);
  const punkt = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(2.4), fog: false }));
  gr.add(punkt);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: weichPunkt(), color: new THREE.Color(TUERKIS).multiplyScalar(2), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  halo.scale.set(4.4, 4.4, 1); gr.add(halo);
  // Marken: oben „DU“, unten „PAZIFIK“, Maßlinie links
  const duS = textSprite("DU", { farbe: TUERKIS, hoehe: 2.0, b: 512 }); duS.position.set(0.1, RC + 1.9, 0.1); gr.add(duS);
  const pazS = textSprite("PAZIFIK", { farbe: "#FFFFFF", hoehe: 1.9, b: 1024 }); pazS.position.set(0.1, -RC - 1.9, 0.1); gr.add(pazS);
  const mass = new THREE.Group(); gr.add(mass);
  const mx = -(RC + 2.8);
  const ml = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2 * RC, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(1.3), fog: false })); ml.position.set(mx, 0, 0.5); mass.add(ml);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.16, 0.16), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFFFFF").multiplyScalar(1.3), fog: false })); e.position.set(mx, s * RC, 0.5); mass.add(e); }
  const massT = textSprite("12.742 KM", { hoehe: 2.3, b: 1400, h: 256 }); massT.position.set(mx - 1.5, 0, 0.5); massT.material.rotation = Math.PI / 2; mass.add(massT);
  return { gr, RC, punkt, spur, halo, tunnel, mass, huelle };
}

// =====================================================================================
// HUD: Countdown (5 Segmente), Schichtband
// =====================================================================================
class Countdown {
  constructor(M, wurzel, { tauFn, tauRoh, von, bis }) {
    this.M = M; this.tauFn = tauFn; this.tauRoh = tauRoh; this.von = von; this.bis = bis;
    this.e = el("div", "ms ms-countdown", `<div class="cd-reihe">${"<div class='cd-seg'><i></i></div>".repeat(5)}</div><div class="cd-zahl">5,0<small>s</small></div>`, wurzel);
    this.segs = [...this.e.querySelectorAll(".cd-seg")];
    this.balken = this.segs.map((s) => s.querySelector("i"));
    this.zahl = this.e.querySelector(".cd-zahl");
    this._letzt = null;
  }
  update(t) {
    const tau = clamp(this.tauFn(t), 0, 5);
    this.segs.forEach((s, i) => {
      const f = clamp(i + 1 - tau, 0, 1);
      this.balken[i].style.transform = `scaleX(${f.toFixed(4)})`;
      s.classList.toggle("aktiv", tau > i && tau < i + 1 && t > this.von);
    });
    const rest = Math.max(0, 5 - tau);
    const txt = rest.toFixed(1).replace(".", ",");
    if (txt !== this._letzt) { this.zahl.innerHTML = `${txt}<small>s</small>`; this._letzt = txt; }
    this.zahl.classList.toggle("null", rest <= 0.001);
    const ph = tau % 1, puls = tau > 0 && tau < 5 ? Math.exp(-ph * 9) * 0.06 : 0;
    this.e.style.transform = `scale(${(1 + puls).toFixed(4)})`;
  }
  ereignisse() {
    const ev = [];
    for (const [a, b] of this.M.laufIntervalle((t) => +clamp(this.tauRoh(t), 0, 5).toFixed(1), this.von, this.bis)) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    for (let k = 1; k <= 5; k++) {
      let t = this.von; while (t < this.bis && this.tauRoh(t) < k - 1e-6) t += 1 / 60;
      if (t < this.bis) ev.push({ t, typ: "marke", klang: "tick", text: `Sekunde ${k} vorbei` });
    }
    return ev;
  }
}
/** Weg durch die Erde als Band aus 7 Schichten, Marke läuft mit, darunter der Name der aktuellen Schicht */
class Schichtband {
  constructor(M, wurzel, { wegFn, ein, aus }) {
    this.M = M; this.wegFn = M.wert(wegFn); this.ein = ein; this.aus = aus;
    // Breiten in Pixel (Kruste groß genug zum Sehen, sonst nach Strecke gestaucht)
    this.teile = [
      { name: "KRUSTE", km: [0, 30], b: 40, farbe: "#B98A5B" }, { name: "MANTEL", km: [30, 2891], b: 150, farbe: "#E8553A" },
      { name: "ÄUSSERER KERN", km: [2891, 5150], b: 120, farbe: "#FF9A3C" }, { name: "INNERER KERN", km: [5150, S.D - 5150], b: 150, farbe: "#FFE6C4" },
      { name: "ÄUSSERER KERN", km: [S.D - 5150, S.D - 2891], b: 120, farbe: "#FF9A3C" }, { name: "MANTEL", km: [S.D - 2891, S.D - 30], b: 150, farbe: "#E8553A" },
      { name: "PAZIFIK", km: [S.D - 30, S.D], b: 40, farbe: TUERKIS },
    ];
    const gesamt = this.teile.reduce((a, t) => a + t.b, 0), luecken = 4 * (this.teile.length - 1);
    const faktor = (780 - luecken) / gesamt;
    this.teile.forEach((t) => { t.b = t.b * faktor; });
    this.e = el("div", "ms ms-band", `<div class="bd-reihe">${this.teile.map((t) => `<div class="bd-seg" style="width:${t.b.toFixed(1)}px;background:${t.farbe}"><i></i><b style="background:${t.farbe}"></b></div>`).join("")}<div class="bd-marke"></div></div><div class="bd-name"></div>`, wurzel);
    this.segB = [...this.e.querySelectorAll(".bd-seg b")];
    this.marke = this.e.querySelector(".bd-marke");
    this.name = this.e.querySelector(".bd-name");
    this._n = -1;
    let x = 0; this.teile.forEach((t) => { t.x0 = x; x += t.b + 4; });
  }
  xBei(w) {
    for (const t of this.teile) if (w <= t.km[1] + 1e-6) return t.x0 + ((w - t.km[0]) / (t.km[1] - t.km[0])) * t.b;
    const l = this.teile[this.teile.length - 1]; return l.x0 + l.b;
  }
  nrBei(w) { return this.teile.findIndex((t) => w <= t.km[1] + 1e-6); }
  update(t) {
    const an = t >= this.ein && t < this.aus;
    this.e.style.display = an ? "block" : "none";
    if (!an) return;
    const k = ease.outCubic(fortschritt(t, this.ein, this.ein + 0.35)) * (1 - ease.inCubic(fortschritt(t, this.aus - 0.25, this.aus)));
    this.e.style.opacity = String(k.toFixed(3));
    const w = this.wegFn(t);
    this.marke.style.transform = `translateX(${this.xBei(w).toFixed(1)}px)`;
    this.teile.forEach((tt, i) => {
      const f = clamp((w - tt.km[0]) / (tt.km[1] - tt.km[0]));
      this.segB[i].style.transform = `scaleX(${f.toFixed(4)})`;
    });
    const n = this.nrBei(w);
    if (n !== this._n) { this.name.textContent = this.teile[n].name; this._n = n; }
  }
  ereignisse() {
    const ev = [];
    let letzt = this.nrBei(this.wegFn(this.ein));
    for (let t = this.ein; t < this.aus; t += 1 / 30) { const n = this.nrBei(this.wegFn(t)); if (n !== letzt) { ev.push({ t, typ: "marke", klang: "tick", text: `Grenze: ${this.teile[n].name}` }); letzt = n; } }
    return ev;
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);
  const daten = await lade("../../engine/daten/globus-punkte.json");

  const buehne = new Buehne(document.getElementById("leinwand"), { breite: Math.round(1080 * SKALA), hoehe: Math.round(1920 * SKALA), msaa: MSAA, schatten: false });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  // ---------- Szene: Schulhof, Erde, Karte, Querschnitt (eine Szene, drei Welten mit eigener Kamera) ----------
  const szene = new THREE.Scene();
  szene.fog = new THREE.Fog("#CFE0F6", 60, 300);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 22, schattenKarte: 512, sonnenRichtung: [-0.45, 0.8, 0.35], sonnenFarbe: "#FFE2BC", sonnenStaerke: 1.9,
    himmel: "#BFD7FF", boden: "#9A8E86", himmelStaerke: 0.95, umgebungsStaerke: 0.5, schattenWeich: 3, ziel: [0, 0, -6] });
  licht.sonne.castShadow = false;
  const HOF = baueHof(szene);
  const ABG = baueAbgrund(szene);
  const KARTE = baueKarte(szene, daten);
  const SCHN = baueSchnitt(szene, buehne.renderer);
  const himmel = verlauf([[0, "#3B7BDB"], [0.35, "#7BB0F0"], [0.55, "#BDD9F7"], [0.7, "#E8E6DC"], [1, "#B8C6D8"]]);
  const dunkel = new THREE.Color("#07040A");
  const wasser = verlauf([[0, "#0B5E7A"], [0.5, "#1B93B0"], [1, "#6ADBE0"]]);
  const nacht = verlauf([[0, "#0A1630"], [0.6, "#0C2548"], [1, "#071221"]]);

  // ---------- Zeitmarken ----------
  const tBoden = T("Boden"), tWird = T("wird"), tDurch = T("durchsichtig."), tBis = T("regeln:Bis"), tErde1 = T("regeln:Erde."), tSchulhof = T("Schulhof,"), tMitten = T("mitten"), tDeutsch = T("Deutschland.");
  const tKlar = T("Klar,"), tAustr = T("falle:Australien."), tOder = T("falle:Oder?"), tLos = T("Los");
  const tS1 = T("sek1:Sekunde"), tSand = T("Sand,"), tHeiss = T("sek1:heiß."), tFolg = T("Folg");
  const tS2 = T("sek2:Sekunde"), tDoch = T("sek2:Doch"), tKruste = T("Kruste."), tGlueht = T("glüht");
  const tS3 = T("sek3:Sekunde"), tEisen = T("Eisen."), tS4 = T("sek4:Sekunde"), t6000 = T("sechstausend"), tSonne = T("Sonnenoberfläche.");
  const tS5 = T("sek5:Sekunde"), tKein = T("kein"), tPaz = T("sek5:Pazifik."), tPazEnde = T("sek5:Pazifik.>");
  const tErg = T("Ergebnis:"), tKm = T("ergebnis:Kilometer"), tUeber = T("ergebnis:Über"), tLand = T("ergebnis:Land.");
  const tWarum = T("Warum?"), tErst = T("Erstens:"), tZweit = T("Zweitens:");
  const tUeb = T("ueberraschung:Das"), tLoch = T("Loch"), tZwei = T("zweiundvierzig"), tDrueben = T("drüben."), tDruebenEnde = T("drüben.>"), tZurueck = T("zurück."), tZurueckEnde = T("zurück.>");
  const tMerk = T("merksatz:Wer"), tGraebt = T("gräbt,"), tMeer = T("Meer."), tSchluss = T("Welches");
  const tSchleife = tSchluss + 0.6;
  // Welten-Wechsel (Mitte des Übergangs)
  const tMap = tErg - 0.12, tCut = tUeb - 0.1, tHof2 = Math.max(tZurueckEnde + 0.9, tMeer - 0.9);

  // ---------- Weg durch die Erde (km) ----------
  const tEndeTauchen = tMap - 0.5;
  const wegKeys = [
    { t: 0, v: 0 }, { t: tS1, v: 0 }, { t: tDoch, v: S.SCHICHT.kruste, e: ease.inOutSine },
    { t: tS3, v: S.SCHICHT.mantelEnde, e: ease.inOutSine }, { t: tS4, v: S.SCHICHT.aeussererKernEnde, e: ease.linear },
    { t: (tS4 + tS5) / 2, v: S.R, e: ease.linear }, { t: tS5, v: S.D - S.SCHICHT.aeussererKernEnde, e: ease.linear },
    { t: lerp(tS5, tEndeTauchen, 0.34), v: S.D - S.SCHICHT.mantelEnde, e: ease.linear },
    { t: lerp(tS5, tEndeTauchen, 0.70), v: S.D - S.SCHICHT.kruste, e: ease.linear },
    { t: tEndeTauchen, v: S.D, e: ease.outSine }, { t: DAUER + 1, v: S.D },
  ];
  const wegRoh = (t) => (t >= tHof2 - 1.0 ? 0 : keyframes(wegKeys, t));
  // ---------- Szenario-Zeit τ (0–5 s) für den Countdown: eine Sekunde je „Sekunde …“ ----------
  const tauKeys = [
    { t: 0, v: 0 }, { t: tS1, v: 0 }, { t: tS2, v: 1, e: ease.linear }, { t: tS3, v: 2, e: ease.linear }, { t: tS4, v: 3, e: ease.linear },
    { t: tS5, v: 4, e: ease.linear }, { t: tPazEnde, v: 5, e: ease.linear }, { t: DAUER + 1, v: 5 },
  ];
  const tauRoh = (t) => keyframes(tauKeys, t);

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    akzent: TUERKIS,
    teams: {
      a: { name: "LAND", farbe: KORALLE, woerter: ["Australien*", "Land*", "Kruste*"] },
      b: { name: "WASSER", farbe: TUERKIS, woerter: ["Pazifik*", "Wasser*", "Meer*"] },
    },
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  const tau = M.wert(tauRoh);
  const weg = M.wert(wegRoh);
  const wegAnzeige = (t) => Math.round(weg(t));
  hud.add(new Countdown(M, hud.wurzel, { tauFn: tau, tauRoh, von: tLos, bis: tPazEnde + 0.1 }));

  // Hook: Titel baut sich Wort für Wort auf
  M.titel({ y: 520, groesse: 112, aus: "regeln:Bis-0.2", woerter: [
    { text: "STELL", ein: "Stell-0.04", art: "klein" }, { text: "DIR", ein: "dir-0.04", art: "klein" }, { text: "VOR:", ein: "vor,-0.04", art: "klein" },
    { umbruch: true },
    { text: "BODEN", ein: "Boden-0.04" }, { text: "WIRD", ein: "wird-0.04" },
    { umbruch: true },
    { text: "DURCHSICHTIG", ein: "durchsichtig.-0.12", team: "b" },
  ] });
  // Regeln als Chips (Zahlen und Orte)
  M.chips({ y: 410, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "ANDERE SEITE DER ERDE", ein: "regeln:andere", art: "voll", team: "b", gross: true }] });
  M.chips({ y: 570, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "12.742 KM", ein: "regeln:Erde.-0.1", art: "dunkel" }] });
  M.chips({ y: 700, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "SCHULHOF", ein: "Schulhof,-0.05", art: "hell" }] });
  M.chips({ y: 830, ausrichtung: "mitte", aus: "Klar,-0.35", liste: [{ text: "MITTE DEUTSCHLANDS", ein: "mitten", art: "voll", team: "a" }] });
  // Denkfalle
  M.stempel({ text: "KLAR?", ein: "Klar,", aus: "Los-0.1", x: SICHER.mitte, y: 800, winkel: -6, farbe: "weiss", textFarbe: "tinte", groesse: 128 });
  M.chips({ y: 450, ausrichtung: "mitte", aus: "Los-0.1", liste: [{ text: "AUSTRALIEN?", ein: "falle:Australien.-0.1", art: "voll", team: "a", gross: true }] });
  // Folgen-Aufruf
  M.folgen({ ein: "Folg", dauer: 1.8, y: 960 });

  // Tauchen: Tiefe und Hitze als Live-Zähler, Schichtband
  const zaehlerAus = tMap - 0.1;
  M.zaehler({ ein: "Los+0.1", aus: zaehlerAus, wert: wegAnzeige, nk: 0, einheit: "km", max: 99999, team: "a", label: "TIEFE", x: 340, y: 395, anker: "mitte" });
  M.zaehler({ ein: "Los+0.1", aus: zaehlerAus, wert: (t) => Math.round(S.temperatur(weg(t)) / 10) * 10, nk: 0, einheit: "°C", max: 9999, team: "a", label: "HITZE", x: 760, y: 395, anker: "mitte" });
  hud.add(new Schichtband(M, hud.wurzel, { wegFn: wegRoh, ein: tLos + 0.15, aus: zaehlerAus }));
  // Wendung 1: Kruste endet
  M.stempel({ text: "30 KM KRUSTE", ein: "sek2:Doch+0.15", x: SICHER.mitte, y: 800, winkel: -4, art: "stempel", farbe: "a", groesse: 86 });
  // Kern: so heiß wie die Sonne
  M.stempel({ text: "6.000 °C", ein: "sechstausend-0.05", aus: "Sonnenoberfläche.", x: SICHER.mitte, y: 760, winkel: 4, farbe: "a", groesse: 138 });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "sek5:Sekunde-0.1", liste: [{ text: "KERN 6.000 °C", ein: "so-0.05", art: "voll", team: "a", gross: true }] });
  M.chips({ y: 1090, ausrichtung: "mitte", aus: "sek5:Sekunde-0.1", liste: [{ text: "SONNE 5.500 °C", ein: "Sonnenoberfläche.-0.4", art: "dunkel" }] });
  // Wendung 2: kein Australien
  M.stempel({ text: "KEIN AUSTRALIEN", ein: "kein-0.1", x: SICHER.mitte, y: 800, winkel: -3, farbe: "weiss", textFarbe: "tinte", groesse: 92, aus: "sek5:Pazifik.+0.3" });
  // Ergebnis: Karte
  const MM = Math.round(S.haversine(S.GEGENPUNKT, S.ANTIPODENINSELN));
  M.bilanz({
    y: 420, ein: "Ergebnis:-0.15", aus: "Warum?-0.2", titel: "Vom Schulhof aus",
    zeilen: [
      { label: "BIS ZUM PAZIFIK", wert: S.D, nk: 0, einheit: "km", team: "b", ein: "ergebnis:Kilometer" },
      { label: "BIS ZUM NÄCHSTEN LAND", wert: MM, nk: 0, einheit: "km", team: "a", ein: "ergebnis:Über" },
    ],
  });
  // Warum? Zwei Faktoren
  M.formel({ y: 420, ein: "Erstens:-0.1", aus: "ueberraschung:Das-0.15", titel: "Erstens: Wasser", teile: [
    { text: "71", einheit: "%", ein: "Erstens:+0.2", team: "b" }, { text: "DER ERDE", ein: "Erde", team: "b" }, { text: "=", ein: "Wasser" }, { text: "MEER", ein: "WASSER", art: "erg" },
  ] });
  M.formel({ y: 760, ein: "Zweitens:-0.1", aus: "ueberraschung:Das-0.15", titel: "Zweitens: Land gegenüber", teile: [
    { text: "NUR 15", einheit: "%", ein: "Zweitens:+0.3", team: "a" }, { text: "→", ein: "Land" }, { text: "LAND", ein: "gegenüber.", art: "erg" },
  ] });
  // Zweite Überraschung: Tunnel
  M.stempel({ text: "42 MINUTEN", ein: "zweiundvierzig-0.05", aus: "drüben.>", x: SICHER.mitte, y: 640, winkel: -4, farbe: "b", groesse: 112 });
  const tFallA = tZwei - 0.1, tFallB = tDruebenEnde + 0.05, tFallC = Math.min(tFallB + (tFallB - tFallA) * 0.7, tMeer - 0.2);
  const fallMin = (t) => (t <= tFallB ? S.fallzeitMin() * ease.linear(fortschritt(t, tFallA, tFallB)) : S.fallzeitMin() * (1 + fortschritt(t, tFallB, tFallC)));
  const tunnelWeg = (t) => S.tunnelWeg(fallMin(t));
  M.zaehler({ ein: "Loch-0.3", aus: "Welches-0.1", wert: (t) => Math.round(fallMin(t) * 10) / 10, nk: 1, einheit: "min", max: 99.9, team: "b", label: "ZEIT", x: 340, y: 395, anker: "mitte" });
  M.zaehler({ ein: "Loch-0.3", aus: "Welches-0.1", wert: (t) => Math.round(S.tunnelTempo(fallMin(t)) * 10) / 10, nk: 1, einheit: "km/s", max: 9.9, team: "a", label: "TEMPO", x: 760, y: 395, anker: "mitte" });
  // Merksatz und Schluss
  M.pointe({ text: "WER TIEF GENUG | GRÄBT, LANDET | *MEISTENS IM MEER.*", ein: "merksatz:Wer", takt: 0.2, aus: "Welches-0.1", y: 520, groesse: 104 });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "Schreib-0.1", liste: [{ text: "DEIN SZENARIO?", ein: "Szenario-0.05", art: "voll", team: "b", gross: true }] });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 62 });

  // Blitz an jeder Schichtgrenze (HUD-Ebene ohne Text)
  const blitz = el("div", "", "", hud.wurzel);
  Object.assign(blitz.style, { position: "absolute", left: "0", top: "0", width: "1080px", height: "1920px", pointerEvents: "none", zIndex: 5, opacity: 0 });
  const grenzen = []; // {t, farbe, staerke}
  const wegZeit = (km) => { let t = tS1; const dt = 1 / 120; while (t < tEndeTauchen + 1 && wegRoh(t) < km) t += dt; return t; };
  const bFarbe = { kruste: "255,214,150", moho: "255,122,46", cmb: "255,186,110", icb: "255,255,255", aus: "255,150,80", surf: "120,240,240" };
  // Krustenschichten (Boden, Sand, Kies, Granit, Basalt) und Moho: Radien → Weg
  const kmFuerRadius = (rWelt) => { // Weltradius → Weg (km) auf der Nahseite
    for (let km = 0; km <= S.R; km += 0.25) if (R_OBER - rw(S.R - km) >= R_OBER - rWelt) return km;
    return S.R;
  };
  const weltRadiusVonKm = (km) => rw(S.R - km);
  for (const s of ABG.kruste) { const km = kmFuerRadius(s.r); grenzen.push({ t: wegZeit(km), farbe: bFarbe.kruste, st: 0.28 }); }
  grenzen.push({ t: wegZeit(S.SCHICHT.kruste), farbe: bFarbe.moho, st: 0.7 });
  grenzen.push({ t: wegZeit(S.SCHICHT.mantelEnde), farbe: bFarbe.cmb, st: 0.7 });
  grenzen.push({ t: wegZeit(S.SCHICHT.aeussererKernEnde), farbe: bFarbe.icb, st: 0.85 });
  grenzen.push({ t: wegZeit(S.R), farbe: bFarbe.icb, st: 0.6 });
  grenzen.push({ t: wegZeit(S.D - S.SCHICHT.aeussererKernEnde), farbe: bFarbe.aus, st: 0.7 });
  grenzen.push({ t: wegZeit(S.D - S.SCHICHT.mantelEnde), farbe: bFarbe.aus, st: 0.7 });
  grenzen.push({ t: wegZeit(S.D - S.SCHICHT.kruste), farbe: bFarbe.moho, st: 0.6 });
  grenzen.push({ t: wegZeit(S.D - 4.4), farbe: bFarbe.surf, st: 0.5 });
  grenzen.forEach((g) => M.melde({ t: g.t, typ: "marke", klang: g.st > 0.6 ? "boom" : "tick", text: "Schichtgrenze" }));
  hud.add({ update(t) {
    let best = null, o = 0;
    for (const g of grenzen) { const d = t - g.t; if (d > -0.04 && d < 0.8) { const v = (d < 0 ? 1 + d / 0.04 : Math.exp(-d * 6)) * g.st; if (v > o) { o = v; best = g; } } }
    if (best) blitz.style.background = `radial-gradient(ellipse at 50% 50%, rgba(${best.farbe},0.0) 25%, rgba(${best.farbe},0.85) 100%)`;
    blitz.style.opacity = o.toFixed(3);
  } });

  // =====================================================================================
  // Weltzustand
  // =====================================================================================
  const bodenRadius = (t) => {
    if (t >= tHof2 - 1.1) return 0;
    return keyframes([{ t: 0, v: 0 }, { t: tWird, v: 0 }, { t: tDurch + 0.2, v: 2.6, e: ease.outCubic }, { t: tBis + 2, v: 3.6, e: ease.linear }, { t: tKlar, v: 5, e: ease.linear }, { t: tLos - 0.05, v: 6, e: ease.linear }, { t: tLos + 1.0, v: 330, e: ease.inCubic }, { t: DAUER + 1, v: 330 }], t);
  };
  M.melde({ t: tDurch - 0.3, typ: "welle", klang: "scan", dauer: 1.2, text: "Boden wird durchsichtig" });
  M.melde({ t: tLos, typ: "welle", klang: "boom", dauer: 1.0, text: "Boden ganz weg" });
  const tmp = new THREE.Vector3();
  const wg = weg; // schleifenfest
  const bodenR = M.wert(bodenRadius);

  const hofSetze = (t) => {
    const r = bodenR(t);
    for (const m of HOF.boden.mats) m.uniforms.radius.value = r;
    HOF.kinder.forEach((k, i) => { k.armL.rotation.x = Math.sin(t * 2.3 + i * 1.7) * 0.12; k.armR.rotation.x = -Math.sin(t * 2.3 + i * 1.7) * 0.12; });
    return r;
  };
  const abgrundSetze = (t) => {
    const w = wg(t);
    ABG.hitzen.forEach((m) => { m.uniforms.zeit.value = t; });
    // Wasser/Fische nur sichtbar, wenn wir uns dem Meer nähern
    const nah = clamp((w - (S.D - 600)) / 400);
    ABG.fische.visible = nah > 0;
    if (nah > 0) {
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1);
      for (let i = 0; i < 36; i++) {
        const gruppe = Math.floor(i / 12);
        const ph = hash(gruppe, 5) * 6.28, richt = gruppe === 1 ? -1 : 1;
        const x = (-14 + ((t * (1.6 + gruppe * 0.4) * richt + hash(i, 6) * 8 + gruppe * 9) % 28 + 28) % 28) * 1, z = -9 + gruppe * 8 + (hash(i, 7) - 0.5) * 5 + Math.sin(t * 1.3 + i) * 0.4;
        const y = -R_OBER + 2.1 + (hash(i, 8) - 0.5) * 2.6 + Math.sin(t * 2 + ph) * 0.15;
        q.setFromEuler(new THREE.Euler(0, richt > 0 ? 0 : Math.PI, Math.sin(t * 6 + i) * 0.15));
        m4.compose(tmp.set(x, y, z), q, s); ABG.fischInst.setMatrixAt(i, m4);
      }
      ABG.fischInst.instanceMatrix.needsUpdate = true;
    }
    ABG.strahlen.visible = nah > 0;
  };

  // ---------- Kamera Schulhof und Erde ----------
  const AUGE = V(0, 1.65, 0);
  const ZIELE = [
    { t: 0, z: () => V(-1.7, 0.1, -8.5), d: 0 },
    { t: tBoden - 0.25, z: () => V(0.5, 0, -2.2), d: 0.7 },
    { t: tWird - 0.1, z: () => V(0.2, 0, -0.7), d: 0.8 },
    { t: tBis - 0.1, z: () => V(0.15, -1, -0.2), d: 0.6 },
    { t: tSchulhof - 0.5, z: () => V(-5, 0.9, -8.5), d: 0.9 },
    { t: tMitten - 0.2, z: () => V(8, 1.4, -6), d: 0.9 },
    { t: tKlar - 0.15, z: () => V(0.3, -1.2, -0.3), d: 0.55 },
    { t: tAustr - 0.2, z: () => V(0, 3, -26), d: 0.8 },
    { t: tOder - 0.12, z: () => V(0.1, -1.4, -0.2), d: 0.5 },
    { t: tHof2 + 0.1, z: () => V(0.5, 0.2, -3), d: 0.01 },
    { t: tHof2 + 0.6, z: () => V(-3, 1.4, -10), d: 1.6 },
    { t: tSchluss - 0.1, z: () => V(0, 0.9, -14), d: 1.2 },
    { t: tSchleife + 1.0, z: () => V(-1.7, 0.1, -8.5), d: 1.6 },
  ];
  for (const k of ZIELE.slice(1)) if (k.d > 0.05) M.melde({ t: k.t, typ: "kamera", klang: false, dauer: k.d, text: "Blickwechsel" });
  const stehBlick = (t) => {
    let d = ZIELE[0].z(t).clone().sub(AUGE).normalize();
    for (let i = 1; i < ZIELE.length; i++) {
      const k = ZIELE[i];
      if (t < k.t) break;
      const w = ease.inOutCubic(fortschritt(t, k.t, k.t + k.d));
      d = d.lerp(k.z(t).clone().sub(AUGE).normalize(), w).normalize();
    }
    return d;
  };
  const tauchBlick = (t) => { // fast senkrecht nach unten, leicht kreisend
    const an = 0.9 + t * 0.32 + Math.sin(t * 0.7) * 0.4, kipp = 0.3 + Math.sin(t * 0.5) * 0.06;
    return V(Math.sin(kipp) * Math.cos(an), -Math.cos(kipp), Math.sin(kipp) * Math.sin(an)).normalize();
  };
  const fovKeys = [
    { t: 0, v: 72 }, { t: tWird, v: 66, e: ease.inOutSine }, { t: tKlar, v: 68, e: ease.inOutSine }, { t: tLos, v: 70, e: ease.inOutSine }, { t: tLos + 1.2, v: 78, e: ease.outCubic },
    { t: tDoch, v: 74, e: ease.inOutSine }, { t: tS3, v: 80, e: ease.inOutSine }, { t: tS4, v: 84, e: ease.inOutSine }, { t: tS5, v: 80, e: ease.inOutSine }, { t: tEndeTauchen, v: 72, e: ease.inOutSine },
    { t: tHof2, v: 70 }, { t: DAUER, v: 72, e: ease.inOutSine },
  ];
  const kam = new THREE.PerspectiveCamera(70, 1080 / 1920, 0.05, 1600);
  const regie = new Regie(kam, (t) => {
    const w = wegRoh(t);
    const tk = smoothstep(tLos - 0.1, tLos + 0.9, t) * (t < tHof2 - 1 ? 1 : 0);
    const yp = yPfad(w), auge = AUGE.y * (1 - smoothstep(0, 4, -yp));
    const orb = Math.min(1, w / 200) * 1.6, an = t * 0.9;
    const d = stehBlick(t).clone().lerp(tauchBlick(t), tk).normalize();
    const z = V(Math.cos(an) * orb, yp + auge, Math.sin(an) * orb).addScaledVector(d, 10);
    const roll = Math.sin(t * 0.6) * 0.008 + tk * Math.sin(t * 0.9) * 0.05;
    return { pos: [Math.cos(an) * orb, yp + auge, Math.sin(an) * orb], ziel: [z.x, z.y, z.z], fov: keyframes(fovKeys, t), roll };
  }, { zp });
  regie.stoss({ t: tLos + 0.05, staerke: 1.0 });
  regie.stoss({ t: tDoch, staerke: 1.0 });
  regie.stoss({ t: tS3, staerke: 0.8 });
  regie.stoss({ t: tS4, staerke: 1.0 });
  regie.stoss({ t: tS5, staerke: 0.8 });
  regie.stoss({ t: tEndeTauchen - 0.1, staerke: 0.7 });
  regie.stoss({ t: tKlar + 0.05, staerke: 0.5 });
  regie.schleife({ ab: tSchleife, ende: ENDE });

  const post = { bloomStaerke: BLOOM, bloomSchwelle: 0.95, bloomRadius: 1.0, belichtung: 1.0, vignette: 0.3, saettigung: 1.08, kontrast: 1.05, koernung: 0.03 };
  const alles = (sichtbar) => { HOF.hof.visible = sichtbar.hof; ABG.gr.visible = sichtbar.abgrund; KARTE.gr.visible = sichtbar.karte; SCHN.gr.visible = sichtbar.schnitt; };
  const weltPOV = { szene, kamera: kam, post, update(t) {
    alles({ hof: true, abgrund: true, karte: false, schnitt: false });
    const r = hofSetze(t); abgrundSetze(t);
    const w = wg(t);
    szene.fog.near = 60; szene.fog.far = 300;
    szene.background = w > S.D - 400 ? wasser : w > 0.5 ? dunkel : himmel;
    post.bloomStaerke = BLOOM * (w > 0.5 ? 0.55 : 0.8);
    regie.anwenden(t);
  } };

  // ---------- Karte ----------
  const kamK = new THREE.PerspectiveCamera(46, 1080 / 1920, 0.1, 1200);
  const regieK = new Regie(kamK, (t) => {
    const zu = ease.inOutCubic(fortschritt(t, tMap, tWarum - 0.3)); // Ergebnis: nah; Warum: zurückziehen
    const ab = ease.inOutCubic(fortschritt(t, tWarum - 0.2, tWarum + 3.2));
    const abst = lerp(lerp(78, 46, zu), 118, ab);
    const hoehe = lerp(0.62, 0.86, ab);
    const mx = KARTE.gr.position.x + lerp(0, KARTE.ai.x * 0.4, 1 - ab), mz = lerp(KARTE.ai.z * 0.35, -4, ab);
    const dreh = Math.sin(t * 0.25) * 0.05;
    return { pos: [mx + Math.sin(dreh) * abst * 0.2, abst * hoehe, mz + abst * (1 - hoehe * 0.55) * 0.95], ziel: [mx, 0, mz], fov: 46 };
  }, { zp });
  regieK.stoss({ t: tKm, staerke: 0.6 });
  regieK.stoss({ t: tUeber, staerke: 0.8 });
  M.melde({ t: tWarum, typ: "kamera", klang: "whoosh", dauer: 3, text: "Karte zieht zurück" });
  const postK = { ...post, vignette: 0.34, bloomStaerke: BLOOM * 0.8 };
  const weltKarte = { szene, kamera: kamK, post: postK, update(t) {
    alles({ hof: false, abgrund: false, karte: true, schnitt: false });
    szene.background = nacht;
    const a = clamp((t - tMap) / 0.9);
    KARTE.rIns.scale.setScalar(Math.max(0.01, ease.outCubic(fortschritt(t, tKm - 0.2, tUeber + 0.4))));
    KARTE.linie.visible = t > tUeber - 0.3; KARTE.linie.scale.y = 1;
    KARTE.linie.scale.x = Math.hypot(KARTE.ai.x, KARTE.ai.z) * ease.outCubic(fortschritt(t, tUeber - 0.2, tUeber + 0.9));
    KARTE.insel.visible = t > tUeber - 0.5; KARTE.insel.scale.setScalar(Math.max(0.01, ease.outBack(fortschritt(t, tUeber - 0.4, tUeber + 0.2))));
    KARTE.labels.insel.visible = t > tUeber + 0.2; KARTE.labels.nz.visible = t > tKm + 0.2; KARTE.labels.australien.visible = t > tWarum;
    KARTE.labels.du.visible = true;
    KARTE.strahl.material.opacity = 0.7 + 0.2 * Math.sin(t * 6) * a;
    KARTE.duRing.scale.setScalar(1 + 0.08 * Math.sin(t * 5));
    regieK.anwenden(t);
  } };

  // ---------- Querschnitt ----------
  const kamS = new THREE.PerspectiveCamera(46, 1080 / 1920, 0.1, 400);
  const SC = { x: SCHN.gr.position.x };
  const regieS = new Regie(kamS, (t) => {
    const k = fortschritt(t, tCut, tHof2);
    const az = lerp(0.62, 0.9, k) + Math.sin(t * 0.5) * 0.04, el_ = lerp(0.2, 0.28, k);
    const d = lerp(70, 62, ease.inOutSine(k));
    return { pos: [SC.x + Math.sin(az) * Math.cos(el_) * d, Math.sin(el_) * d + 1, Math.cos(az) * Math.cos(el_) * d], ziel: [SC.x, 0.5, 0], fov: 46 };
  }, { zp });
  regieS.stoss({ t: tZwei, staerke: 0.7 });
  regieS.stoss({ t: tFallB, staerke: 1.0 });
  M.melde({ t: tFallB, typ: "welle", klang: "boom", text: "Gegenseite erreicht" });
  M.melde({ t: tFallA, typ: "welle", klang: "whoosh", dauer: tFallB - tFallA, text: "Fall durch den Tunnel" });
  const weltSchnitt = { szene, kamera: kamS, post: { ...post, vignette: 0.32 }, update(t) {
    alles({ hof: false, abgrund: false, karte: false, schnitt: true });
    szene.background = nacht;
    const km = tunnelWeg(t);
    const y = SCHN.RC - (km / S.D) * 2 * SCHN.RC;
    SCHN.punkt.position.set(0.05, y, 0.05); SCHN.halo.position.copy(SCHN.punkt.position);
    const vor = tunnelWeg(t - 0.12), y0 = SCHN.RC - (vor / S.D) * 2 * SCHN.RC;
    const hi = Math.abs(y0 - y); SCHN.spur.position.set(0.05, (y + y0) / 2, 0.05); SCHN.spur.scale.set(1, Math.max(0.001, hi), 1);
    SCHN.halo.scale.setScalar(4 + 2.5 * S.tunnelTempo(fallMin(t)) / S.maxTempoKmS());
    regieS.anwenden(t);
  } };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltPOV);
  zl.shot(tMap, weltKarte, { typ: "zoomwisch", dauer: 0.55, richtung: [0, -1], mitte: [0.5, 0.5] });
  zl.shot(tCut, weltSchnitt, { typ: "blasen", dauer: 0.7 });
  zl.shot(tHof2, weltPOV, { typ: "wolken", dauer: 0.8, farbe1: "#FFFFFF", farbe2: "#9CC0F0" });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  window.hudAt = (t) => hud.update(t);
  for (const t of [0, tDoch, tMap + 0.3, tCut + 0.3, tHof2 + 0.3, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = S.alles();
  window.__dbg = { HOF, ABG, KARTE, SCHN, szene, kam, kamK, kamS, regie, T, hud, M };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
