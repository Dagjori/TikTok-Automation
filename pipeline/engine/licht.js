// Licht-Presets: Umgebungslicht (RoomEnvironment + PMREM), Sonne mit weichen Schatten, Himmelslicht.
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const cache = new WeakMap();
/** Weiches Studio-Umgebungslicht als PMREM-Textur (einmal je Renderer) */
export function umgebung(renderer) {
  if (cache.has(renderer)) return cache.get(renderer);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  cache.set(renderer, tex);
  return tex;
}

/**
 * Tageslicht für Miniatur-Welten: warme Sonne mit großer Schattenkarte, kühles Himmelslicht, Umgebungslicht.
 * bereich = halbe Kantenlänge des Schatten-Frustums (so klein wie möglich halten → schärfere Schatten).
 */
export function lichtTag(szene, renderer, {
  sonnenRichtung = [0.55, 1.0, 0.35], sonnenFarbe = "#FFF1DD", sonnenStaerke = 2.6,
  himmel = "#CFE3FF", boden = "#F3E6D3", himmelStaerke = 0.9,
  umgebungsStaerke = 0.55, schattenKarte = 2048, bereich = 14, schattenWeich = 4, ziel = [0, 0, 0],
} = {}) {
  szene.environment = umgebung(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  const hemi = new THREE.HemisphereLight(himmel, boden, himmelStaerke);
  szene.add(hemi);
  const sonne = new THREE.DirectionalLight(sonnenFarbe, sonnenStaerke);
  const d = new THREE.Vector3(...sonnenRichtung).normalize().multiplyScalar(40);
  sonne.position.set(ziel[0] + d.x, ziel[1] + d.y, ziel[2] + d.z);
  sonne.target.position.set(...ziel);
  sonne.castShadow = true;
  sonne.shadow.mapSize.set(schattenKarte, schattenKarte);
  const c = sonne.shadow.camera;
  c.left = -bereich; c.right = bereich; c.top = bereich; c.bottom = -bereich;
  c.near = 1; c.far = 100;
  sonne.shadow.bias = -0.0004;
  sonne.shadow.normalBias = 0.02;
  sonne.shadow.radius = schattenWeich;
  szene.add(sonne, sonne.target);
  return { sonne, hemi };
}

/** Licht für den Globus: Studio-Umgebung, Führungslicht von oben links, kühles Gegenlicht */
export function lichtGlobus(szene, renderer, { umgebungsStaerke = 0.38 } = {}) {
  szene.environment = umgebung(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  const key = new THREE.DirectionalLight("#FFFFFF", 1.9);
  key.position.set(-3, 4, 5);
  const rim = new THREE.DirectionalLight("#7FB2FF", 1.6);
  rim.position.set(4, 2, -4);
  const hemi = new THREE.HemisphereLight("#BFD6FF", "#0A1530", 0.6);
  szene.add(key, rim, hemi);
  return { key, rim, hemi };
}

/** Farbverlauf-Hintergrund als Textur (linear von oben nach unten, optional radiales Leuchten) */
export function verlauf(stops, { radial = null, groesse = 512 } = {}) {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = groesse;
  const g = c.getContext("2d");
  const lin = g.createLinearGradient(0, 0, 0, groesse);
  stops.forEach(([p, f]) => lin.addColorStop(p, f));
  g.fillStyle = lin;
  g.fillRect(0, 0, 16, groesse);
  if (radial) {
    // radiales Leuchten braucht ein quadratischeres Canvas
    const r = document.createElement("canvas");
    r.width = 288; r.height = 512;
    const h = r.getContext("2d");
    h.drawImage(c, 0, 0, 288, 512);
    const [x, y, rad, farbe] = radial;
    const rg = h.createRadialGradient(x * 288, y * 512, 0, x * 288, y * 512, rad * 512);
    rg.addColorStop(0, farbe);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    h.fillStyle = rg;
    h.fillRect(0, 0, 288, 512);
    const tex = new THREE.CanvasTexture(r);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
