// Gemeinsame Grundlagen der Neon-Stadt: Szene, Farben, geteilte Shader-Werte (Stimmung je Tageszeit), Zufall mit Saat.
import * as THREE from "three";

export const szene = new THREE.Scene();

export const CYAN = new THREE.Color("#25f4ee"), PINK = new THREE.Color("#fe2c55"), GOLD = new THREE.Color("#ffd166");
export const VIOLETT = new THREE.Color("#9b5cff"), GRUEN = new THREE.Color("#3ef0a0"), ROT = new THREE.Color("#ff4d6d");
export const ORANGE = new THREE.Color("#ff8a3d"), WEISS = new THREE.Color("#ffffff");

// Werte, die Himmel und Wetter setzen und alle Materialien lesen (Stimmung je Sonnenstand)
export const U = {
  uZeit: { value: 0 },
  uSonneRichtung: { value: new THREE.Vector3(0, 1, 0) },
  uSonneFarbe: { value: new THREE.Color(1, 1, 1) }, // Helligkeit steckt in der Farbe
  uHimmelOben: { value: new THREE.Color("#03040a") },
  uHimmelUnten: { value: new THREE.Color("#2a0a3c") },
  uUmgebung: { value: new THREE.Color("#120c22") }, // Grundlicht von oben
  uBoden: { value: new THREE.Color("#07040d") }, // Grundlicht von unten
  uNacht: { value: 1 }, // 0 = Tag, 1 = Nacht: Fenster und Straßenlicht
  uNeon: { value: 1 }, // Stärke der Neonkanten
  uNebelFarbe: { value: new THREE.Color("#0b0716") },
  uNebel: { value: 0.0042 },
  uNass: { value: 0 }, // Regen: Boden spiegelt stärker
};

export const NEBEL_GLSL = `
uniform vec3 uNebelFarbe; uniform float uNebel;
vec3 nebeln(vec3 farbe, vec3 welt) { float d = length(welt - cameraPosition); return mix(farbe, uNebelFarbe, 1.0 - exp(-uNebel * uNebel * d * d)); }`;

// Licht für matte Flächen: Himmel von oben, Boden von unten, Sonne (bzw. Mond) gerichtet
// lin(): Farbwerte, die im Shader als sRGB geschrieben sind, in den linearen Farbraum umrechnen (gerechnet wird linear)
export const LICHT_GLSL = `
uniform vec3 uSonneRichtung, uSonneFarbe, uUmgebung, uBoden; uniform float uNacht, uNeon, uZeit;
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 licht(vec3 n) {
  vec3 halbkugel = mix(uBoden, uUmgebung, n.y * 0.5 + 0.5);
  return halbkugel + uSonneFarbe * max(dot(n, uSonneRichtung), 0.0);
}`;

export const WELT_VERTEX = `varying vec3 vWelt; varying vec3 vLokal; varying vec3 vNormale; varying vec2 vUv;
void main() { vLokal = position; vNormale = normalize(mat3(modelMatrix) * normal); vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWelt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const glatt = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const hex = (c) => "#" + c.getHexString();

// Zufall mit fester Saat: Laptop und PC bauen dieselbe Stadt
export function zufall(saat = 1) {
  let s = saat >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Blickrichtung der Grundansicht: nach Südwesten, dort geht die Sonne im Winterhalbjahr hinter der Skyline unter
export const BLICK_KOMPASS = 225 * Math.PI / 180;
/** Himmelsrichtung (Höhe, Kompass in Bogenmaß) → Richtungsvektor der Szene (−z = Südwest, +x = Nordwest) */
export function richtungAus(hoehe, kompass, ziel = new THREE.Vector3()) {
  const rel = kompass - BLICK_KOMPASS;
  return ziel.set(Math.cos(hoehe) * Math.sin(rel), Math.sin(hoehe), -Math.cos(hoehe) * Math.cos(rel));
}

function punktTextur() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const v = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  v.addColorStop(0, "rgba(255,255,255,1)"); v.addColorStop(0.3, "rgba(255,255,255,0.55)"); v.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = v; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export const PUNKT = punktTextur();

// Schild mit Text als Textur (Leuchtschrift an Gebäuden, Anzeigetafel)
export function schriftTextur(breite, hoehe, malen) {
  const c = document.createElement("canvas");
  c.width = breite; c.height = hoehe;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  let zuletzt = [];
  const neu = (...a) => { zuletzt = a; const g = c.getContext("2d"); g.clearRect(0, 0, breite, hoehe); malen(g, breite, hoehe, ...a); tex.needsUpdate = true; };
  neu();
  document.fonts?.ready.then(() => neu(...zuletzt)); // Webschrift erst nach dem Laden sichtbar
  return { tex, neu, canvas: c };
}

export const SCHRIFT = "'Space Grotesk', 'Segoe UI', sans-serif";
export const MONO = "'JetBrains Mono', Consolas, monospace";
