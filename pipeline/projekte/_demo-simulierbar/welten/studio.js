// Stil 18 „Dunkles Studio / Produktlicht“ · Beispiel „1.000 € Prämie oder 50 € mehr im Monat?“ (Plan 26.11., Beispielwerte)
// Zeigt: Hohlkehle mit Spiegelboden, Balkenwaage aus Stahl, Scheinbündel mit Banderole (Team A), wachsende Münzstapel
// (Team B), Softbox-Streiflicht, Kantenlichter in Teamtönen, Spot mit Lichtkegel, Staub, Lichtstrahlen, Tiefenschärfe.
import * as THREE from "three";
import { GRADING, rigStudio, spiegelBoden, lichtKegel, staub, lichtPfuetze, buendeln, fokus } from "../../../engine/sim_atmosphaere.js";
import { hohlkehle, wandLicht, muenzStapel, scheinBuendel, waage } from "../../../engine/stil_studio.js";
import { Regie } from "../../../engine/regie.js";
import { ease, fortschritt, clamp } from "../../../engine/bewegung.js";

const TEAM_A = "#FF8A3D"; // Prämie (Orange)
const TEAM_B = "#3D8BFF"; // 50 € mehr im Monat (Blau)

export const info = {
  teams: { a: { name: "PRÄMIE", farbe: TEAM_A, woerter: ["Prämie*"] }, b: { name: "MONATLICH", farbe: TEAM_B, woerter: ["Monat*", "fünfzig"] } },
  segmente: [
    { id: "hook", text: "Tausend Euro Prämie oder fünfzig Euro mehr im Monat?" },
    { id: "frage", text: "Was bringt dir am Ende mehr?" },
    { id: "rennen", text: "Nach drei Jahren kippt die Waage." },
  ],
  tafel: { links: { einheit: "€", nk: 0, max: 9999 }, rechts: { einheit: "€", nk: 0, max: 9999 }, vorn: "hoch" },
  standbild: 11.6,
  tiefe: true,
  teppich: "raum",
};

export async function baue({ renderer, T, dauer, schatten, Q }) {
  const AUS = new Set((Q.get("aus") || "").split(","));
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#050608");
  const rig = rigStudio(szene, renderer, {
    ziel: [0, 1.4, 0],
    softbox: { farbe: "#FFF3E2", staerke: 9, breite: 3.6, hoehe: 1.2, pos: [3.6, 4.2, 3.2] },
    oben: { farbe: "#FFF6EA", staerke: 90, pos: [0.2, 9.5, 0.6], winkel: 0.36, rand: 0.55, schatten },
    kanten: [{ farbe: "#FFC7A0", staerke: 2.4, pos: [-6, 3.5, -5] }, { farbe: "#A9C8FF", staerke: 2.6, pos: [6, 3, -6] }],
  });
  szene.add(hohlkehle({ breite: 44, tiefe: 22, hoehe: 16, radius: 5, farbe: "#0B0C10", rau: 0.38 }));
  if (!AUS.has("spiegel")) { const sp = spiegelBoden({ breite: 30, tiefe: 12, staerke: 0.42, streckung: 1.2, unschaerfe: 1.4, fresnel: 0.5, aufloesung: 0.28, verzerrung: 0.3 }); sp.position.z = 1; szene.add(sp); }
  const wl = wandLicht({ breite: 11, hoehe: 8, farbe: "#26304A", staerke: 1.1 }); wl.position.set(-0.6, 4.6, -10.9); szene.add(wl);
  if (!AUS.has("kegel")) {
    const k = lichtKegel({ hoehe: 9.4, radiusOben: 0.25, radiusUnten: 3.4, farbe: "#FFF1DE", staerke: 0.1, weich: 1.2, streifen: 0.6 });
    k.position.set(0.2, 9.5, 0.6); szene.add(k);
    szene.add(staub({ anzahl: 450, bereich: [6, 7, 5], mitte: [0.2, 3.5, 0.6], groesse: 0.011, staerke: 1.6, aussen: 0.0, kegel: { spitze: [0.2, 9.5, 0.6], richtung: [0, -1, 0], winkel: 0.33 } }));
  }

  const w = waage({ breite: 2.7, hoehe: 2.1, schalenRadius: 0.52, faden: 0.95 });
  w.rotation.y = -0.55;
  szene.add(w);
  // Teamlicht unter den Schalen (Lichtfleck in Teamfarbe auf dem Boden)
  const fleckA = lichtPfuetze({ radius: 1.1, farbe: TEAM_A, staerke: 0.32, exponent: 2 }), fleckB = lichtPfuetze({ radius: 1.1, farbe: TEAM_B, staerke: 0.32, exponent: 2 });
  fleckA.userData.dynamisch = fleckB.userData.dynamisch = true;
  szene.add(fleckA, fleckB);
  // Inhalt: links 20 Scheine à 50 (1.000 €), rechts Münzen (je Münze 50 €), 4 Stapel
  const scheine = scheinBuendel({ farbe: TEAM_A, wert: "50", max: 20, laenge: 0.7, breite: 0.34 });
  scheine.rotation.y = 0.5;
  w.links.add(scheine);
  const stapel = [[-0.17, -0.1, "silber"], [0.12, -0.17, "gold"], [0.0, 0.17, "silber"], [0.26, 0.1, "gold"]].map(([x, z, art], i) => {
    const s = muenzStapel({ art, max: 14, seed: i + 3, radius: 0.12 });
    s.position.set(x, 0, z);
    w.rechts.add(s);
    return s;
  });
  w.userData.dynamisch = true;
  buendeln(szene);

  // Modell (Beispielwerte): Monate laufen ab „Was“ im Zeitraffer bis 40; je Monat 50 € brutto, netto ca. 27 €
  const monate = (t) => 40 * ease.inOutSine(fortschritt(t, T("Was"), dauer - 0.4));
  const netto = (m) => m * 27.5;
  const welt = { szene, kamera: null, post: null, update: null };
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const regie = new Regie(kamera, (t) => {
    const k = ease.inOutSine(fortschritt(t, 0, dauer));
    return { pos: [1.4 - 0.7 * k, 1.75 + 0.1 * k, 11.2 - 0.5 * k], ziel: [0.05, 1.2, 0], fov: 30 };
  });
  regie.atmen({ staerke: 0.01, tempo: 0.25 });
  const post = { ...GRADING.studio, strahlen: AUS.has("strahlen") ? 0 : 0.55, strahlenPunkt: [0.2, 9.4, 0.6], strahlenSchwelle: 1.4, strahlenLaenge: 0.7, strahlenFarbe: [1, 0.95, 0.88] };
  welt.kamera = kamera;
  welt.post = post;
  welt.update = (t) => {
    const m = monate(t);
    const muenzen = netto(m) / 50; // eine Münze = 50 €
    stapel.forEach((s, i) => s.setze(clamp((muenzen - i) / 4, 0, 14)));
    const diff = netto(m) - 1000;
    w.setze(0.24 * Math.tanh(diff / 350));
    w.updateMatrixWorld(true);
    const pa = new THREE.Vector3(), pb = new THREE.Vector3();
    w.links.getWorldPosition(pa); w.rechts.getWorldPosition(pb);
    fleckA.position.set(pa.x, 0.006, pa.z); fleckB.position.set(pb.x, 0.006, pb.z);
    regie.anwenden(t);
    Object.assign(post, fokus(kamera, [0, 1.5, 0], { tiefe: 0.16, nah: 0.5, fern: 0.7 }));
  };
  const werte = (t) => ({ a: t > T("Prämie>") ? 1000 : 0, b: Math.round(netto(monate(t))) });
  const uhr = { ein: "Was", zeit: (t) => monate(t), format: (s) => `${Math.round(s)}`, label: "MONATE" };
  return { welt, werte, uhr };
}
