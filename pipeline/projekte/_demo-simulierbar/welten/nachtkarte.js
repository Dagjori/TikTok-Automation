// Stil 21 „Nachtkarte“ · Beispiel „40 km pendeln oder näher ziehen?“ (Plan 10.11., Beispielwerte)
// Zeigt: Relief im Mondlicht, Stadt als Lichtteppich, Dorf und Vorort, schwaches Straßennetz, zwei Routen in Teamfarbe
// mit Lichtkopf, Ortsmarken mit Puls, tiefe Wolken mit Parallaxe, Dunst, Tilt-Shift.
import * as THREE from "three";
import { GRADING, rigNacht, dunst, buendeln } from "../../../engine/sim_atmosphaere.js";
import { reliefKarte, stadtLichter, strassenNetz, route, ortsMarke, wolkenSchicht, karteZeit } from "../../../engine/stil_nachtkarte.js";
import { Regie } from "../../../engine/regie.js";
import { ease, fortschritt } from "../../../engine/bewegung.js";

const TEAM_A = "#FF8A3D"; // 40 km pendeln (Orange)
const TEAM_B = "#2EC4B6"; // näher ziehen (Türkis)

export const info = {
  teams: { a: { name: "PENDELN", farbe: TEAM_A, woerter: ["pendeln*", "Pendler*"] }, b: { name: "NÄHER", farbe: TEAM_B, woerter: ["näher*"] } },
  segmente: [
    { id: "hook", text: "Vierzig Kilometer pendeln oder näher ziehen?" },
    { id: "frage", text: "Was kostet dich der Arbeitsweg im Jahr?" },
    { id: "rennen", text: "Jeden Tag hin und zurück. Die Kilometer summieren sich." },
  ],
  tafel: { links: { einheit: "€", nk: 0, max: 99999 }, rechts: { einheit: "€", nk: 0, max: 99999 }, vorn: "tief" },
  standbild: 12.6,
  teppich: "strasse",
};

export async function baue({ renderer, T, dauer, schatten, Q }) {
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#05070C");
  dunst(szene, "#0B1220", 0.028);
  rigNacht(szene, renderer, { richtung: [-0.9, 0.42, -0.35], farbe: "#A9C2EE", staerke: 2.0, bereich: 24, schatten, himmelStaerke: 0.25, umgebungsStaerke: 0.2 });
  const STADT = [0.5, -11], VORORT = [-2.6, -6.2], DORF = [5.2, 9.5];
  const karte = reliefKarte({ breite: 30, tiefe: 44, seed: 5, hoehe: 2.6, flach: [[...STADT, 3.2], [...VORORT, 1.2], [...DORF, 0.9]] });
  szene.add(karte);
  szene.add(stadtLichter(karte, { mitte: STADT, radius: 3.0, anzahl: 6000, seed: 1 }));
  szene.add(stadtLichter(karte, { mitte: VORORT, radius: 1.0, anzahl: 900, strahlen: 3, seed: 2 }));
  szene.add(stadtLichter(karte, { mitte: DORF, radius: 0.7, anzahl: 450, strahlen: 3, seed: 3 }));
  for (const [m, r, n, s] of [[[-7, 4], 0.8, 500, 4], [[8, -4], 1.0, 700, 5], [[-8, -14], 1.2, 900, 6], [[9, -17], 0.9, 600, 7], [[-4, 14], 0.6, 300, 8]]) szene.add(stadtLichter(karte, { mitte: m, radius: r, anzahl: n, strahlen: 3, seed: s }));
  szene.add(strassenNetz(karte, [[[-7, 4], [-4, -2], VORORT, [-1, -9], STADT], [[8, -4], [4, -8], STADT], [[-8, -14], [-3, -12], STADT], [[9, -17], [5, -14], STADT], [[-4, 14], [-6, 8], [-7, 4]], [DORF, [8, 2], [8, -4]]]));
  const rA = route(karte, [DORF, [3.6, 6.5], [4.6, 3], [2.4, 0], [3.4, -3.5], [1.8, -6.5], STADT], { farbe: TEAM_A });
  const rB = route(karte, [VORORT, [-1.6, -8], [-0.4, -9.8], STADT], { farbe: TEAM_B });
  const mA = ortsMarke(karte, DORF, { farbe: TEAM_A }), mB = ortsMarke(karte, VORORT, { farbe: TEAM_B }), mZ = ortsMarke(karte, STADT, { farbe: "#E9E4D8", hoehe: 3, staerke: 0.7 });
  szene.add(rA, rB, mA, mB, mZ);
  szene.add(wolkenSchicht({ breite: 70, tiefe: 70, hoehe: 3.2, lagen: 2, deckung: 0.42, deckkraft: 0.5, massstab: 0.045 }));
  buendeln(szene);

  // Beispielwerte: 40 km je Richtung, 220 Arbeitstage, 0,30 €/km; näher ziehen = 250 € mehr Miete im Monat
  const tage = (t) => 220 * ease.inOutSine(fortschritt(t, T("Was"), dauer - 0.4));
  const kamera = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 200);
  const regie = new Regie(kamera, (t) => {
    const k = ease.inOutSine(fortschritt(t, 0, dauer));
    return { pos: [6.6 - 2.0 * k, 21 - 1.2 * k, 25 - 1.6 * k], ziel: [1.9, 0, 1.2 - 1.0 * k], fov: 34 };
  });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  const post = { ...GRADING.karte, tiltMitte: 0.48, tiltBreite: 0.38, tiltStaerke: 0.55 };
  const welt = {
    szene, kamera, post,
    update(t) {
      karteZeit(t);
      rA.setze(ease.inOutSine(fortschritt(t, T("pendeln") - 0.4, T("pendeln") + 2.2)));
      rB.setze(ease.inOutSine(fortschritt(t, T("näher") - 0.2, T("näher") + 1.2)));
      mA.setze(t, Math.min(1, fortschritt(t, T("Vierzig"), T("Vierzig") + 0.5)));
      mB.setze(t, Math.min(1, fortschritt(t, T("näher"), T("näher") + 0.5)));
      mZ.setze(t, 1);
      regie.anwenden(t);
    },
  };
  const werte = (t) => ({ a: Math.round(tage(t) * 80 * 0.3), b: Math.round((tage(t) / 220) * 3000) });
  const uhr = { ein: "Was", zeit: (t) => tage(t), format: (s) => `${Math.round(s)}`, label: "TAGE" };
  return { welt, werte, uhr };
}
