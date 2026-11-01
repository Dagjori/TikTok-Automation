// Stil 13 · Blaupause / Schnittmodell als Produktions-Baukasten (Muster: stile/stil_13_blaupause.*).
// Technische Zeichnung auf Blaupausen-Raster: weiße dicke Kanten, verdeckte Kanten gestrichelt, Füllungen in Blau
// oder Teamfarbe. Ohne Licht und Schatten, rendert sehr schnell. Für Szenenwechsel („Warum?“) in jedem Stil.
import * as THREE from "three";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

/** Blaupausen-Papier (Verlauf, Raster, leichte Fleckigkeit) als Hintergrund-Textur */
export function blaupausePapier({ breite = 1080, hoehe = 1920, raster = 27 } = {}) {
  const c = document.createElement("canvas");
  c.width = breite;
  c.height = hoehe;
  const g = c.getContext("2d");
  const v = g.createRadialGradient(breite * 0.5, hoehe * 0.45, 100, breite * 0.5, hoehe * 0.5, 1300);
  v.addColorStop(0, "#1257a8");
  v.addColorStop(1, "#0a3270");
  g.fillStyle = v;
  g.fillRect(0, 0, breite, hoehe);
  for (let x = 0; x <= breite; x += raster) { g.fillStyle = x % (raster * 5) === 0 ? "rgba(190,220,255,0.20)" : "rgba(190,220,255,0.08)"; g.fillRect(x, 0, x % (raster * 5) === 0 ? 2 : 1, hoehe); }
  for (let y = 0; y <= hoehe; y += raster) { g.fillStyle = y % (raster * 5) === 0 ? "rgba(190,220,255,0.20)" : "rgba(190,220,255,0.08)"; g.fillRect(0, y, breite, y % (raster * 5) === 0 ? 2 : 1); }
  const bild = g.getImageData(0, 0, breite, hoehe);
  let s = 7;
  for (let i = 0; i < bild.data.length; i += 4) { s = (s * 16807) % 2147483647; const n = ((s / 2147483647) - 0.5) * 10; bild.data[i] += n; bild.data[i + 1] += n; bild.data[i + 2] += n; }
  g.putImageData(bild, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const AUFL = new THREE.Vector2(1080, 1920);
const mats = new Map();
/** Linienmaterial (Breite in px), optional gestrichelt bzw. nur verdeckte Teile (GreaterDepth) */
export function linienMat(farbe, breite, { gestrichelt = false, verdeckt = false, deckkraft = 1 } = {}) {
  const k = `${farbe}|${breite}|${gestrichelt}|${verdeckt}|${deckkraft}`;
  if (mats.has(k)) return mats.get(k);
  const m = new LineMaterial({ color: farbe, linewidth: breite, resolution: AUFL, dashed: gestrichelt, dashSize: 0.16, gapSize: 0.12, transparent: deckkraft < 1 || verdeckt, opacity: verdeckt ? 0.38 : deckkraft });
  if (verdeckt) { m.depthFunc = THREE.GreaterDepth; m.depthWrite = false; }
  else { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -6; }
  mats.set(k, m);
  return m;
}
export const FUELL = new THREE.MeshBasicMaterial({ color: "#0f4a96", polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 6 });
export const fuellung = (farbe, deckkraft = 1) => new THREE.MeshBasicMaterial({ color: farbe, transparent: deckkraft < 1, opacity: deckkraft, depthWrite: deckkraft >= 1, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 6 });

/** Körper zeichnen: Füllung, sichtbare Kanten durchgezogen, verdeckte gestrichelt */
export function koerper(geo, { x = 0, y = 0, z = 0, ry = 0, farbe = "#ffffff", fuell = FUELL, winkel = 24, breite = 3.0, verdeckt = true, eltern } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  if (fuell) g.add(new THREE.Mesh(geo, fuell));
  const lg = new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geo, winkel));
  g.add(new LineSegments2(lg, linienMat(farbe, breite)));
  if (verdeckt) {
    const l2 = new LineSegments2(lg, linienMat(farbe, breite * 0.7, { gestrichelt: true, verdeckt: true }));
    l2.computeLineDistances();
    g.add(l2);
  }
  if (eltern) eltern.add(g);
  return g;
}
/** Einzelne Linien [[x1,y1,z1,x2,y2,z2], …] */
export function linien(punkte, { farbe = "#d8ecff", breite = 2.2, gestrichelt = false, deckkraft = 1, eltern } = {}) {
  const lg = new LineSegmentsGeometry().setPositions(punkte.flat());
  const l = new LineSegments2(lg, linienMat(farbe, breite, { gestrichelt, deckkraft }));
  if (gestrichelt) l.computeLineDistances();
  if (eltern) eltern.add(l);
  return l;
}
