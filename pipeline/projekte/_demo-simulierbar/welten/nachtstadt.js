// Stil 17 „Nachtstadt-Miniatur“ · Beispiel „Parkhaus oder Parkplatz suchen?“ (Plan 05.11., Beispielwerte)
// Zeigt: Fensterfassaden, Laternen mit Kegel und Lichtfleck, nasser Asphalt mit Spiegelung und Pfützen, Lichtspuren
// in Teamfarbe (Sucher dreht Runden, Parkhaus-Fahrer biegt ein), Parkhaus mit LED-Kanten, Skyline im Dunst, Tilt-Shift.
import * as THREE from "three";
import { GRADING, rigNacht, dunst, nebelSchicht, spiegelBoden, buendeln } from "../../../engine/sim_atmosphaere.js";
import { gebaeude, strassenBoden, laterne, autoNacht, lichtSpur, parkhaus, skyline, baumNacht, himmelNacht } from "../../../engine/stil_nachtstadt.js";
import { Regie } from "../../../engine/regie.js";
import { ease, fortschritt, hash } from "../../../engine/bewegung.js";

const TEAM_A = "#3D8BFF"; // Parkhaus (Blau)
const TEAM_B = "#FF8A3D"; // Parkplatz suchen (Orange)

export const info = {
  teams: { a: { name: "PARKHAUS", farbe: TEAM_A, woerter: ["Parkhaus*"] }, b: { name: "SUCHEN", farbe: TEAM_B, woerter: ["Sucher*", "suchen*"] } },
  segmente: [
    { id: "hook", text: "Parkhaus oder Parkplatz suchen?" },
    { id: "frage", text: "Was kostet dich die Runde wirklich?" },
    { id: "rennen", text: "Der Sucher dreht schon die zweite Runde." },
  ],
  tafel: { links: { einheit: "€", nk: 2, max: 99 }, rechts: { einheit: "€", nk: 2, max: 99 } },
  standbild: 8.2,
  teppich: "strasse",
};

export async function baue({ renderer, T, dauer, schatten, Q }) {
  const AUS = new Set((Q.get("aus") || "").split(","));
  const szene = new THREE.Scene();
  szene.background = himmelNacht();
  dunst(szene, "#121A28", 0.03);
  rigNacht(szene, renderer, { ziel: [2, 0, -3], bereich: 16, schatten, staerke: 0.85, umgebungsStaerke: 0.8, himmelStaerke: 0.55 });

  const STR = [{ x: 0, richtung: "z", breite: 2.2 }, { x: 7.6, richtung: "z", breite: 2.0 }, { x: -7.6, richtung: "z", breite: 2.0 }, { z: 2.2, richtung: "x", breite: 2.0 }, { z: -8.2, richtung: "x", breite: 2.0 }];
  szene.add(strassenBoden({ breite: 70, tiefe: 70, strassen: STR }));
  if (!AUS.has("spiegel")) szene.add(spiegelBoden({ breite: 70, tiefe: 70, staerke: 1.1, pfuetzen: 0.55, streckung: 3.2, massstab: 0.35, aufloesung: 0.3 }));
  if (!AUS.has("nebel")) szene.add(nebelSchicht({ breite: 60, tiefe: 60, y: 0.15, lagen: 2, farbe: "#7F93B8", deckkraft: 0.07, massstab: 0.12 }));
  szene.add(skyline({ anzahl: 46, radius: 34, bogen: [Math.PI * 1.02, Math.PI * 1.98], mitte: [2, -6] }));

  // Häuserblöcke zwischen den Straßen (Fassaden zur Straße), Parkhaus links vorne
  const bloecke = [[-7.6, 0, -8.2, 2.2], [0, 7.6, -8.2, 2.2], [-7.6, 0, 2.2, 14], [0, 7.6, 2.2, 14], [-7.6, 0, -24, -8.2], [0, 7.6, -24, -8.2], [7.6, 16, -24, 14], [-16, -7.6, -24, 14]];
  let n = 0;
  for (const [x0, x1, z0, z1] of bloecke) {
    const rx0 = x0 + 1.25, rx1 = x1 - 1.25, rz0 = z0 + 1.2, rz1 = z1 - 1.2;
    const parkBlock = x0 === -7.6 && z0 === 2.2;
    const schleifeB = x0 === 0 && z0 === -8.2;
    for (let z = rz0; z < rz1 - 0.6; ) {
      const t = 1.4 + hash(n, 3) * 1.4;
      const tt = Math.min(t, rz1 - z);
      for (const seite of [0, 1]) {
        if (parkBlock && seite === 1 && z + tt > 2.6 && z < 7.4) continue;
        const b = schleifeB ? Math.min(1.9, (rx1 - rx0) / 2 - 0.5) : Math.min(2.6, (rx1 - rx0) / 2 - 0.1);
        const nah = z0 >= 2.2, schleife = x0 === 0 && z0 === -8.2;
        const h = nah ? 0.9 + hash(n * 3 + seite, 5) * 1.0 : schleife ? 1.0 + hash(n * 3 + seite, 5) * 1.1 : 1.6 + Math.pow(hash(n * 3 + seite, 5), 1.4) * 5.6;
        const g = gebaeude({ breite: b, hoehe: h, tiefe: tt - 0.08, seed: n * 2 + seite, anteilAn: 0.42 + hash(n, 9) * 0.3, leuchten: 3, fassade: ["#2B313D", "#30343B", "#262C38", "#363A42"][n % 4], laden: hash(n, 13) < 0.6, warnlicht: h > 5.5, schatten: true });
        g.position.set(seite === 0 ? rx1 - b / 2 : rx0 + b / 2, 0, z + tt / 2);
        szene.add(g);
      }
      z += tt + (schleifeB ? 0.45 : 0.06);
      n++;
    }
  }
  const ph = parkhaus({ etagen: 4, breite: 4.6, tiefe: 3.2, akzent: TEAM_A, seed: 2 });
  ph.rotation.y = Math.PI / 2;
  ph.position.set(-2.95, 0, 5.0);
  szene.add(ph);

  // Laternen und Bäume entlang der Hauptstraße
  for (let z = -22; z < 12; z += 3.1) {
    for (const s of [-1, 1]) {
      const l = laterne({ hoehe: 1.45, arm: 0.34, pfuetze: 0.9, kegel: 0.12 });
      l.position.set(s * 1.36, 0, z + (s > 0 ? 1.5 : 0));
      l.rotation.y = s > 0 ? Math.PI : 0;
      szene.add(l);
    }
    if (hash(z, 2) < 0.6) { const b = baumNacht({ groesse: 0.55, seed: z }); b.position.set(1.6, 0, z + 0.8); szene.add(b); }
  }
  for (let x = 1.6; x < 7; x += 2.6) for (const z of [-8.2, 2.2]) {
    const l = laterne({ hoehe: 1.35, arm: 0.3, kegel: 0.12, pfuetze: 0.8 }); l.position.set(x, 0, z - 1.25); l.rotation.y = -Math.PI / 2; szene.add(l);
  }
  // geparkte Autos am Rand
  for (let i = 0; i < 12; i++) {
    const a = autoNacht({ farbe: ["#4B525E", "#8D939D", "#24282F", "#6A5F55", "#3B4A5A"][i % 5], laenge: 0.82, scheinwerfer: false, rueck: false, glanz: 0.25 });
    a.rotation.y = Math.PI / 2;
    a.position.set(i % 2 ? 0.86 : -0.86, 0, -20 + i * 2.6 + hash(i, 4));
    if (Math.abs(a.position.z - 5.0) < 2.6 && a.position.x < 0) continue;
    szene.add(a);
  }

  // Wege: Sucher (B) dreht Runden um den rechten Block (Rechtsverkehr), Parkhaus-Fahrer (A) kommt entgegen und biegt ein
  const runde = (k) => [[0.55, 9 - k * 0.02], [0.55, -7.2], [1.4, -7.65], [6.6, -7.65], [7.05, -7.2], [7.05, 1.2], [6.6, 1.65], [1.4, 1.65], [0.55, 1.2]];
  const pB = [[0.55, 13], ...runde(0).slice(1), ...runde(1).slice(1, -1), [0.55, -7.2], [1.0, -7.6]].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const kurveB = new THREE.CatmullRomCurve3(pB, false, "catmullrom", 0.1);
  const kurveA = new THREE.CatmullRomCurve3([[-0.55, -21], [-0.55, 3.2], [-0.75, 4.2], [-1.6, 4.55], [-3.6, 4.55]].map(([x, z]) => new THREE.Vector3(x, 0, z)), false, "catmullrom", 0.2);
  const spurB = lichtSpur(kurveB, { farbe: TEAM_B, staerke: 4.5, breite: 0.07, segmente: 900 });
  const spurA = lichtSpur(kurveA, { farbe: TEAM_A, staerke: 4.5, breite: 0.07, segmente: 400 });
  szene.add(spurA, spurB);
  const autoA = autoNacht({ farbe: TEAM_A, laenge: 0.85 }), autoB = autoNacht({ farbe: TEAM_B, laenge: 0.85 });
  autoA.userData.dynamisch = autoB.userData.dynamisch = spurA.userData.dynamisch = spurB.userData.dynamisch = true;
  szene.add(autoA, autoB);
  const statistik = buendeln(szene);
  if (Q.has("statistik")) console.warn("buendeln", JSON.stringify(statistik));
  const setzeAuto = (a, kurve, u) => {
    const p = kurve.getPointAt(u), q = kurve.getPointAt(Math.min(1, u + 0.002));
    a.position.set(p.x, 0, p.z);
    a.rotation.y = Math.atan2(-(q.z - p.z), q.x - p.x);
  };
  const uA = (t) => 0.06 + 0.94 * ease.inOutSine(fortschritt(t, 0.2, dauer * 0.95));
  const uB = (t) => 0.02 + 0.93 * fortschritt(t, 0, dauer);

  // Kamera: schräg von oben die Hauptstraße entlang, langsame Fahrt nach vorn (Miniatur-Look über Tilt-Shift)
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 200);
  const regie = new Regie(kamera, (t) => {
    const k = ease.inOutSine(fortschritt(t, 0, dauer));
    return { pos: [2.6 - 0.5 * k, 8.2 - 0.4 * k, 15.4 - 1.2 * k], ziel: [-1.1, 0.4, -1.6 - 0.4 * k], fov: 34 };
  });
  regie.atmen({ staerke: 0.015, tempo: 0.3 });
  const post = { ...GRADING.nacht, belichtung: 1.25, tiltMitte: 0.5, tiltBreite: 0.32, tiltStaerke: AUS.has("tilt") ? 0 : 0.6 };
  const welt = {
    szene, kamera, post,
    update(t) {
      setzeAuto(autoA, kurveA, uA(t)); spurA.setze(uA(t), 0.6);
      setzeAuto(autoB, kurveB, uB(t)); spurB.setze(uB(t), 0.55);
      regie.anwenden(t);
    },
  };
  // Beispielwerte: Parkhaus 3,50 € für die Stunde, Suche kostet Sprit und Zeit je Runde
  const werte = (t) => ({ a: t > T("Parkhaus>") ? 3.5 : 0, b: 6.4 * fortschritt(t, T("Was"), dauer) });
  const uhr = { ein: "Was", zeit: (t) => Math.max(0, t - T("Was")) * 95, label: "SUCHE" };
  return { welt, werte, uhr };
}
