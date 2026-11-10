// Testprojekt (nicht posten): Welt „Wattenmeer mit Leuchtturm“ (engine/welt_watt_leuchtturm.js) in Prüfzuständen, ohne Stimme und ohne Ton.
// Jeder Zustand gilt für eine Sekunde [k, k+1): Standbild z. B. bei t = k + 0.5.
//   0 (a) Abenddämmerung, Blick Nord, Wolken, ohne Polarlicht      1 (b) tiefe Nacht, plNord 0,6 (grüner Saum)
//   2 (c) plRot 0,7 + plNord 1 (rote Bögen über dem Watt)          3 (d) plKrone 1, Blick zum Zenit (pitch 80)
//   4 (e) plSued 1 + plHelle 0,8, Blick Süd auf Dorf und Deich      5 (f) dorfAugePos, Blick über die Dächer, Maximum
//   6 (g) Morgengrauen (morgen 1, Polarlicht fast aus), Blick Ost   7 Hochwasser, Blick West, plRot 0,5
//   8 Blick steil nach unten (Salzwiese, Priele, Galerie)           9 Tele auf das Dorf (Nacht, Fenster)
//  10 Blick Ost bei plRot 0,8 + plNord 0,8                          11 Draufsicht (Prielnetz, nur Kontrolle)
//  12 Blick in Richtung des Leuchtfeuer-Strahls (Wolken)             13 vom Dorf zum Turm (Strahl im Dunst)
//  14 Schwenk 20°/s über das Watt (Flacker-Probe)
// URL-Schalter (gelten für alle Zustände): ?yaw=&pitch=&fov=&dunkel=&morgen=&wolken=&pegel=&wind=&plNord=&plRot=&plKrone=&plSued=&plHelle=&strahl=&auge=dorf|turm&zustand=k&schatten=&msaa=
// Render: cd pipeline && node render.js projekte/_welttest_watt --zeiten 0.5,1.5,2.5,3.5,4.5,5.5,6.5 --worker 1
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { aktiviereHoehenNebel } from "../../engine/stil_lunar_pov.js";
import { WattLeuchtturm, richtung } from "../../engine/welt_watt_leuchtturm.js";

const FPS = 30, DAUER = 15;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048, MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const ZAHLEN = ["yaw", "pitch", "fov", "dunkel", "morgen", "wolken", "pegel", "wind", "plNord", "plRot", "plKrone", "plSued", "plHelle", "strahl", "moewen"];

const Z = [
  { yaw: 182, pitch: 2, fov: 62, z: { dunkel: 0.05, wolken: 0.62, pegel: 0.35 } },
  { yaw: 178, pitch: 6, fov: 62, z: { dunkel: 1, wolken: 0.35, pegel: 0.3, plNord: 0.6 } },
  { yaw: 184, pitch: 14, fov: 66, z: { dunkel: 1, wolken: 0.25, pegel: 0.3, plNord: 1, plRot: 0.7, plHelle: 0.2 } },
  { yaw: 180, pitch: 80, fov: 72, z: { dunkel: 1, wolken: 0.15, pegel: 0.3, plNord: 0.8, plRot: 0.8, plKrone: 1, plHelle: 0.4 } },
  { yaw: 2, pitch: -2, fov: 60, z: { dunkel: 1, wolken: 0.2, pegel: 0.35, plNord: 0.6, plRot: 0.8, plKrone: 0.5, plSued: 1, plHelle: 0.8 } },
  { auge: "dorf", yaw: 4, pitch: 24, fov: 62, z: { dunkel: 1, wolken: 0.15, pegel: 0.4, plNord: 1, plRot: 1, plKrone: 1, plSued: 1, plHelle: 1 } },
  { yaw: -88, pitch: 3, fov: 62, z: { dunkel: 1, morgen: 1, wolken: 0.4, pegel: 0.25, plNord: 0.08, plRot: 0.05 } },
  { yaw: 92, pitch: 4, fov: 62, z: { dunkel: 1, wolken: 0.3, pegel: 1, plNord: 0.7, plRot: 0.5, plHelle: 0.3 } },
  { yaw: 190, pitch: -55, fov: 62, z: { dunkel: 0.3, wolken: 0.5, pegel: 0.2 } },
  { yaw: 4, pitch: -1.6, fov: 9, z: { dunkel: 1, wolken: 0.2, pegel: 0.3, plSued: 0.4, plHelle: 0.2 } },
  { yaw: -92, pitch: 10, fov: 64, z: { dunkel: 1, wolken: 0.25, pegel: 0.3, plNord: 0.8, plRot: 0.8, plHelle: 0.3 } },
  { auge: "oben", yaw: 180, pitch: -89.5, fov: 70, z: { dunkel: 0.0, wolken: 0, pegel: 0.3 } },
  { strahlBlick: true, pitch: 1, fov: 62, z: { dunkel: 1, wolken: 0.55, pegel: 0.3, plNord: 0.3 } },
  { auge: "dorf", yaw: 170.2, pitch: 2, fov: 40, z: { dunkel: 1, wolken: 0.4, pegel: 0.3, plNord: 0.5 } },
  { schwenk: true, pitch: -3, fov: 60, z: { dunkel: 0.2, wolken: 0.5, pegel: 0.3 } },
];

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(62, 1080 / 1920, 0.15, 90000);
  const t0 = performance.now();
  const welt0 = new WattLeuchtturm(szene, { schatten: SCHATTEN, spiegel: Q.has("spiegel") ? +Q.get("spiegel") : 0.5 });
  const OHNE = (Q.get("ohne") || "").split(",");
  if (OHNE.includes("striche")) welt0.striche.mesh.visible = false;
  if (OHNE.includes("koog")) welt0.koog.visible = false;
  if (Q.has("debug")) welt0.wasserU.debug.value = 1;
  const aufbau = performance.now() - t0;
  const ziel = new THREE.Vector3();

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const P = Z[Q.has("zustand") ? +Q.get("zustand") : Math.min(Z.length - 1, Math.floor(t))];
    const o = { ...P, ...P.z }; if (P.schwenk && !Q.has("yaw")) o.yaw = 160 + (t - 14) * 20; if (P.strahlBlick) o.yaw = 180 - ((t / 7) * 360 + 0.6 / Math.PI * 180) + 8; for (const k of ZAHLEN) if (Q.has(k)) o[k] = +Q.get(k);
    const auge = Q.get("auge") || P.auge || "turm";
    const pos = auge === "dorf" ? welt0.dorfAugePos : auge === "oben" ? [Q.has("ox") ? +Q.get("ox") : 200, Q.has("oy") ? +Q.get("oy") : 2600, Q.has("oz") ? +Q.get("oz") : 600] : welt0.augePos(t, o.yaw);
    const d = richtung(o.yaw, o.pitch);
    kam.position.set(...pos); kam.fov = o.fov; kam.updateProjectionMatrix();
    if (Math.abs(o.pitch) > 89) kam.up.set(0, 0, 1); else kam.up.set(0, 1, 0);
    kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100)); kam.updateMatrixWorld();
    const z = {}; for (const k of ["dunkel", "morgen", "wolken", "pegel", "wind", "plNord", "plRot", "plKrone", "plSued", "plHelle", "strahl", "moewen"]) if (o[k] !== undefined) z[k] = o[k];
    welt0.update(t, { kamera: kam, ...z });
    Object.assign(welt.post, welt0.post, { koernung: 0.012, tiltStaerke: 0 });
    if (OHNE.includes("striche")) welt0.striche.mesh.visible = false;
  } };

  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); };
  window.dauer = DAUER; window.ereignisse = []; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.modell = { vertices: welt0.vertices, haeuser: welt0.hausZahl, priele: welt0.priele.length, aufbauMs: Math.round(aufbau) };
  console.warn("Modell: " + JSON.stringify(window.modell));
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
