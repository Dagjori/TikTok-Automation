// Stil 20 „Glas & Licht“ · Beispiel „Kapselmaschine oder Vollautomat: Was kostet dich die Tasse?“ (Plan 13.11., Beispielwerte)
// Zeigt: zwei Messzylinder im dunklen Labor, Geld als leuchtende Flüssigkeit (Füllstand = Zähler), Zulauf, Bläschen,
// Kaustik auf der spiegelnden Bank, Spot-Kegel mit Staub, Gegenlicht-Wand, Lichtstrahlen, Tiefenschärfe.
import * as THREE from "three";
import { GRADING, rigLabor, lichtKegel, staub, buendeln, fokus } from "../../../engine/sim_atmosphaere.js";
import { glasGefaess, kaustik, laborBank, gegenlichtWand, laborZeit } from "../../../engine/stil_lichtlabor.js";
import { Regie } from "../../../engine/regie.js";
import { ease, fortschritt } from "../../../engine/bewegung.js";

const TEAM_A = "#FF5A5F"; // Kapsel (Koralle)
const TEAM_B = "#3D8BFF"; // Vollautomat (Blau)

export const info = {
  teams: { a: { name: "KAPSEL", farbe: TEAM_A, woerter: ["Kapsel*"] }, b: { name: "VOLLAUTOMAT", farbe: TEAM_B, woerter: ["Vollautomat*"] } },
  segmente: [
    { id: "hook", text: "Kapselmaschine oder Vollautomat?" },
    { id: "frage", text: "Was kostet dich die Tasse wirklich?" },
    { id: "rennen", text: "Jede Tasse läuft mit. Die Kapsel zieht davon." },
  ],
  tafel: { links: { einheit: "€", nk: 0, max: 9999 }, rechts: { einheit: "€", nk: 0, max: 9999 }, vorn: "tief" },
  standbild: 10.6,
  tiefe: true,
  teppich: "raum",
};

export async function baue({ renderer, T, dauer, schatten, Q }) {
  const AUS = new Set((Q.get("aus") || "").split(","));
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#040507");
  const XA = -0.68, XB = 0.68;
  rigLabor(szene, renderer, { schatten: schatten > 0 ? 1024 : 0, spots: [{ pos: [XA, 7, 0.4], staerke: 18, winkel: 0.2 }, { pos: [XB, 7, 0.4], staerke: 18, winkel: 0.2 }] });
  szene.add(laborBank({ breite: 18, tiefe: 7, spiegel: AUS.has("spiegel") ? 0 : 0.35 }));
  const wand = gegenlichtWand({ farbe: "#1A2334", staerke: 1.0 }); wand.position.set(0, 4, -6); szene.add(wand);
  const A = glasGefaess({ farbe: TEAM_A, max: 400, teilung: 25, beschriftung: 100, seed: 1 });
  const B = glasGefaess({ farbe: TEAM_B, max: 400, teilung: 25, beschriftung: 100, seed: 2 });
  A.position.x = XA; B.position.x = XB;
  szene.add(A, B);
  const kA = kaustik({ radius: 1.0, farbe: TEAM_A, staerke: 0.9 }), kB = kaustik({ radius: 1.0, farbe: TEAM_B, staerke: 0.9 });
  kA.position.set(XA + 0.25, 0.004, 0.5); kB.position.set(XB + 0.25, 0.004, 0.5);
  szene.add(kA, kB);
  if (!AUS.has("kegel")) for (const x of [XA, XB]) {
    const k = lichtKegel({ hoehe: 7, radiusOben: 0.08, radiusUnten: 1.3, farbe: "#E8F0FF", staerke: 0.07, weich: 1.3, streifen: 0.5 });
    k.position.set(x, 7, 0.4); szene.add(k);
  }
  szene.add(staub({ anzahl: 400, bereich: [4.5, 6, 3], mitte: [0, 3.2, 0.4], farbe: "#DCE6FF", groesse: 0.01, staerke: 1.4, aussen: 0.15 }));
  buendeln(szene);

  // Beispielwerte: Kapsel 0,45 € je Tasse, Vollautomat 0,18 € plus Gerät anteilig; 2 Tassen am Tag, ein Jahr im Zeitraffer
  const tassen = (t) => 730 * ease.inOutSine(fortschritt(t, T("Was"), dauer - 0.4));
  const kostenA = (n) => n * 0.45, kostenB = (n) => 60 + n * 0.18;
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const regie = new Regie(kamera, (t) => {
    const k = ease.inOutSine(fortschritt(t, 0, dauer));
    return { pos: [2.2 - 1.2 * k, 2.6 + 0.2 * k, 11.2 - 0.6 * k], ziel: [0, 1.85, 0], fov: 30 };
  });
  regie.atmen({ staerke: 0.008, tempo: 0.25 });
  const post = { ...GRADING.labor, strahlen: AUS.has("strahlen") ? 0 : 0.35, strahlenQuelle: [0.5, 0.98], strahlenSchwelle: 1.2, strahlenLaenge: 0.6 };
  const welt = {
    szene, kamera, post,
    update(t) {
      laborZeit(t);
      const n = tassen(t);
      const lauf = t > T("Was") && t < dauer - 0.4;
      A.setze({ wert: kostenA(n) * (t > T("Kapselmaschine") ? 1 : 0), t, zulauf: lauf });
      B.setze({ wert: kostenB(n) * (t > T("Vollautomat?") ? 1 : 0), t, zulauf: lauf });
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, [0, 1.6, 0.3], { tiefe: 0.2, nah: 0.5, fern: 0.75 }));
    },
  };
  const werte = (t) => ({ a: Math.round(t > T("Kapselmaschine") ? kostenA(tassen(t)) : 0), b: Math.round(t > T("Vollautomat?") ? kostenB(tassen(t)) : 0) });
  const uhr = { ein: "Was", zeit: (t) => tassen(t), format: (s) => `${Math.round(s)}`, label: "TASSEN" };
  return { welt, werte, uhr };
}
