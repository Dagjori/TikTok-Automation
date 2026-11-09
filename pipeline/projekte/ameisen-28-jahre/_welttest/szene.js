// Hilfsszene (nicht posten): Standbild-Test der neuen Welt engine/welt_garten_terrasse.js und des Bausteins engine/ameisen.js
// für „Was wäre, wenn du 28 Jahre lang Ameisen zusiehst?“. Zeiten wie im Skript (sim/ameisen.mjs), Kamera je Station vereinfacht.
// Aufruf: node render.js projekte/ameisen-28-jahre/_welttest --zeiten 2.6,6.4,16.8,27.55,29,33.4,58.8,64 --gpu --ausgabe out/ameisen-28-jahre/welttest
import * as THREE from "three";
import { Buehne } from "../../../engine/kern.js";
import { clamp, lerp, smoothstep, ease, keyframes } from "../../../engine/bewegung.js";
import { aktiviereHoehenNebel, Himmel, PovKamera } from "../../../engine/stil_lunar_pov.js";
import { GartenTerrasse, jahreszeit, tageslicht, hoehe, TERRASSE, NEST, ROSE, FUGE_Y } from "../../../engine/welt_garten_terrasse.js";
import { Ameisen, Koenigin, Schwarm } from "../../../engine/ameisen.js";
import * as S from "../../../sim/ameisen.mjs";

const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const TY = TERRASSE.y;
const K = (keys, e = ease.inOutSine) => (t) => keyframes(keys.map(([tt, v, ee]) => ({ t: tt, v, e: ee || e })), t);

// Volk (nur Test): erste Arbeiterinnen ab Tag ≈ 46, dann Wurzelwachstum bis ≈ 6.000
const volk = (t) => { const d = S.tag(t), j = S.jahr(t); if (j < 1) return d < 44 ? 0 : 6 + 14 * smoothstep(44, 300, d); return Math.min(6000, 30 + 5970 * smoothstep(1, 14, j)); };
const STUNDE = K([[0, 18.0], [9, 18.0], [10, 15], [16, 13], [22, 15], [52, 16], [56, 18.0], [80, 18.2]]);
// Königin: Landung 2,5 s auf der Platte, Flügel ab 4,8–6,6 s, läuft zur Fuge 6,6–8,0 s, verschwindet bis 8,8 s
const LAND = [0.045, TY + 0.0003, 0.285], FUGE = [0.0, FUGE_Y + 0.0003, 0.24];
function koenigin(t) {
  if (t < 2.5) { const f = clamp((2.5 - t) / 2.5); return { pos: [LAND[0] + 0.25 * f, LAND[1] + 0.35 * f * f + 0.02 * Math.sin(t * 6) * f, LAND[2] - 0.6 * f], flug: 1, yaw: 2.2 }; }
  const geh = smoothstep(6.6, 8.0, t);
  return { pos: [lerp(LAND[0], FUGE[0], geh), lerp(LAND[1], FUGE[1], smoothstep(0.7, 1, geh)), lerp(LAND[2], FUGE[2], geh)], flug: 1 - smoothstep(2.5, 3.1, t), yaw: lerp(2.2, 2.9, geh),
    fluegelAb: smoothstep(4.8, 6.6, t), versinken: smoothstep(8.0, 8.8, t), tempo: t > 6.6 && t < 8.2 ? 1 : 0.15 };
}
// Kamera-Stationen (nur Test)
let RP = null;
function kamera(t) {
  if (t < 9) { const z = smoothstep(4, 8.5, t); return { pos: [lerp(0.11, 0.06, z), TY + lerp(0.15, 0.085, z), lerp(0.46, 0.36, z)], ziel: [0.02, TY, 0.255], fov: 50, fokus: lerp(0.24, 0.15, z), tiefe: 2.4 }; }
  if (t < 22) return { pos: [0.3, TY + 0.38, 0.92], ziel: [-0.12, 0.06, -0.8], fov: 56, fokus: 1.1, tiefe: 0.9 };
  if (t > 28.5 && t < 29.5 && RP) { const z = RP[RP.length - 1].p; return { pos: [z[0] + 0.1, z[1] + 0.05, z[2] + 0.2], ziel: z, fov: 40, fokus: 0.23, tiefe: 1.6 }; }   // Nahaufnahme Blattläuse
  if (t < 32) return { pos: [-0.2, 0.2, -1.55], ziel: [ROSE.x + 0.05, 0.28, ROSE.z + 0.15], fov: 50, fokus: 1.35, tiefe: 1.2 };
  if (t < 58.5) return { pos: [0.18, TY + 0.2, 0.62], ziel: [0.0, TY + 0.03, 0.12], fov: 54, fokus: 0.6, tiefe: 1.2 };
  return { pos: [0.25, 0.78, 0.9], ziel: [-0.35, 1.05, -3.0], fov: 60, fokus: 3.5, tiefe: 0.3 };
}

async function start() {
  aktiviereHoehenNebel({ abfall: 0.01, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  const szene = new THREE.Scene();
  szene.fog = new THREE.FogExp2("#D6E2EC", 0.006);
  const kam = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.004, 6000);
  const welt0 = new GartenTerrasse(szene, { schatten: SCHATTEN > 0 });
  const himmel = new Himmel(szene, { radius: 3000, zenit: "#4A84C8", horizont: "#D6E2EC", unten: "#8A8F80", dunst: 0.25, sonnenStaerke: 24, glanz: 0.7, zirren: 0.35 });
  const pov = new PovKamera(kam, { pos: [0, 0.3, 0.5], ziel: [0, 0.17, 0], fov: 50 }).atmen({ staerke: 0.5 });
  const hemi = new THREE.HemisphereLight("#C6D8EE", "#6E7A4C", 1.0);
  const sonne = new THREE.DirectionalLight("#FFF3DE", 3);
  sonne.castShadow = SCHATTEN > 0; sonne.shadow.mapSize.set(SCHATTEN || 1, SCHATTEN || 1);
  Object.assign(sonne.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 60 });
  sonne.shadow.bias = -0.0002; sonne.shadow.normalBias = 0.01;
  szene.add(hemi, sonne, sonne.target);
  const ameisen = new Ameisen(szene, { max: 2600 });
  const kn = new Koenigin(szene);
  const tanz = new Schwarm(szene, { max: 300 }), schwarm = new Schwarm(szene, { max: 1500 });
  const sv = new THREE.Vector3();

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const p = t > 50 ? 0.55 : S.jahresPos(t), j = S.jahr(t), jn = j < 1 ? 0 : Math.floor(j);
    const Z = jahreszeit(p, jn), L = tageslicht(p, STUNDE(t), Z);
    // Kamera
    RP = welt0.rosenPfad(j); const k = kamera(t); pov.fov = k.fov; pov.posKeys = [{ t: 0, v: k.pos }]; pov.zielKeys = [{ t: 0, v: k.ziel }];
    pov.anwenden(t); himmel.folge(kam);
    // Licht
    himmel.setze({ zenit: L.zenit, horizont: L.horizont, unten: L.horizont.clone().multiplyScalar(0.55), sonnenRichtung: L.sonne, sonnenFarbe: L.licht.farbe, sonnenStaerke: L.hoehe > -2 ? 14 + 18 * L.tag : 0, glanz: 0.45 + 0.4 * L.gold });
    szene.fog.color.copy(L.horizont);
    hemi.color.copy(L.hemi.oben); hemi.groundColor.copy(L.hemi.unten); hemi.intensity = L.hemi.staerke;
    sonne.color.copy(L.licht.farbe); sonne.intensity = L.licht.staerke;
    sv.set(...L.licht.richtung).normalize();
    const mitte = new THREE.Vector3(kam.position.x * 0.5, 0, Math.min(kam.position.z, 0.5) - 1.5);
    sonne.position.copy(mitte).addScaledVector(sv, 30); sonne.target.position.copy(mitte); sonne.target.updateMatrixWorld();
    // Welt
    const jahre = j;
    welt0.setze(t, kam, { zustand: Z, jahre, wind: 0.8, sand: t < 9 ? 0 : clamp(0.15 + j / 10), loch: smoothstep(7.5, 9, t), blattlaeuse: j >= 1 ? 1 : 0, moebel: j < 9 ? 0 : j < 19 ? 1 : 2, hummeln: 1 });
    // Ameisen
    const v = volk(t), str = welt0.strassen(jahre);
    const offen = [smoothstep(0.6, 3, j) + (j < 1 && S.tag(t) > 200 ? 0.3 : 0), smoothstep(4, 9, j), smoothstep(10, 16, j)];
    const nestBoden = (x, z) => (Math.abs(x - NEST.x) < 0.0034 || Math.abs(z - 0.5) < 0.0034 ? FUGE_Y : TY);
    ameisen.update(t, { strassen: str.map((s, i) => ({ punkte: s.punkte, anteil: Math.min(1, offen[i]), gewicht: [1, 0.6, 0.4][i] })), volk: v, aktiv: Z.aktiv, tempo: 1.2,
      nest: [NEST.x, FUGE_Y, NEST.z], nestBoden, nestRadius: 0.035 });
    // Königin
    const q = koenigin(t);
    kn.update(t, { sichtbar: t < 9, ...q, ablage: LAND, glanz: 0.8 * L.gold + 0.3 });
    // Schwärme: Tanz anderer Nester im Gegenlicht (Einstieg), eigener Schwarm ab Jahr 9 (33,4 s), Hochzeitsflug 54–62 s
    tanz.update(t, kam, { modus: "tanzen", anzahl: t < 4 ? 220 : 0, bereich: { mitte: [-0.4, 0.35, -2.0], radius: 2.2, hoehe: 1.6 }, sonne: L.sonne, glanz: 1 });
    const gross = t > 50;
    schwarm.update(t, kam, { modus: "aufstieg", anzahl: gross ? 1500 : 160, t0: gross ? 54.5 : 33.2, dauer: gross ? 6 : 2.5, quellen: welt0.fugenPunkte.map((f) => [f[0], FUGE_Y, f[2]]), streu: 0.015,
      krabbeln: gross ? 2.5 : 1.5, steig: 0.8, hoehe: 14, wind: [0.15, -0.35], sonne: L.sonne, glanz: 1.1 });
    // Nachbearbeitung
    Object.assign(welt.post, { belichtung: lerp(1.05, 1.32, L.gold), bloomStaerke: 0.7 + 0.5 * L.gold, bloomSchwelle: 0.95, saettigung: lerp(1.02, 0.85, Z.kalt * 0.6), kontrast: 1.04,
      tonung: [1.08, 0.98, 0.86], tonungStaerke: 0.35 * L.gold, vignette: 0.24, koernung: 0.012, tiefeFern: k.tiefe, fokusFern: k.fokus, tiefeNah: 0.35, fokusNah: k.fokus * 0.4 });
  } };
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * 30), t }); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.dauer = 80; window.ereignisse = []; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.modell = { vertices: welt0.vertices };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
