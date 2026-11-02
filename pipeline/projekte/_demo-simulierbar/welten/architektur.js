// Stil 19 „Architekturmodell im Abendlicht“ · Beispiel „WG-Zimmer oder eigene Wohnung?“ (Plan 09.11., Beispielwerte)
// Zeigt: Modellplatte, weiße Kartonhäuser mit Fensterschnitten, Schnitt-Haus mit warmem Innenlicht, Acrylglas-Marker
// in Teamfarbe (WG-Zimmer oben, eigene Wohnung unten), tiefe Abendsonne mit langen Schatten, Lichtbahnen, Staub, Tiefenschärfe.
import * as THREE from "three";
import { GRADING, rigAbendsonne, dunst, lichtBahn, staub, buendeln, fokus } from "../../../engine/sim_atmosphaere.js";
import { modellPlatte, modellHaus, schnittHaus, acrylMarker, modellBaum, modellFigur, abendWand } from "../../../engine/stil_architektur.js";
import { Regie } from "../../../engine/regie.js";
import { ease, fortschritt, hash, huelle } from "../../../engine/bewegung.js";

const TEAM_A = "#8E6CFF"; // WG-Zimmer (Violett)
const TEAM_B = "#FF8A3D"; // eigene Wohnung (Orange)

export const info = {
  teams: { a: { name: "WG-ZIMMER", farbe: TEAM_A, woerter: ["WG-Zimmer"] }, b: { name: "WOHNUNG", farbe: TEAM_B, woerter: ["Wohnung*"] } },
  segmente: [
    { id: "hook", text: "WG-Zimmer oder eigene Wohnung?" },
    { id: "frage", text: "Was kostet dich ein Jahr wirklich?" },
    { id: "rennen", text: "Die Wohnung ist teurer. Aber das ist nur die Miete." },
  ],
  tafel: { links: { einheit: "€", nk: 0, max: 99999 }, rechts: { einheit: "€", nk: 0, max: 99999 }, vorn: "tief" },
  standbild: 10.8,
  tiefe: true,
  teppich: "raum",
};

export async function baue({ renderer, T, dauer, schatten, Q }) {
  const AUS = new Set((Q.get("aus") || "").split(","));
  const szene = new THREE.Scene();
  szene.background = abendWand();
  dunst(szene, "#2E3240", 0.022);
  const SONNE = [-0.62, 0.2, -0.76];
  rigAbendsonne(szene, renderer, { richtung: SONNE, ziel: [0, 0, 0], bereich: 12, schatten, farbe: "#FFC283", staerke: 6.0, himmel: "#A9BEDF", boden: "#6A5A4C", himmelStaerke: 0.95, umgebungsStaerke: 0.55 });
  szene.add(modellPlatte({ breite: 18, tiefe: 18, strassen: [{ x: -2.7, richtung: "z", breite: 1.3 }, { z: 3.2, richtung: "x", breite: 1.3 }, { x: 4.6, richtung: "z", breite: 1.1 }] }));

  // Umgebung: Kartonhäuser (Flach- und Satteldach), wenige in Holz
  const plaetze = [];
  for (let i = 0; i < 26; i++) {
    const x = -8 + (i % 6) * 2.9 + hash(i, 1) * 0.6, z = -8 + Math.floor(i / 6) * 3.4 + hash(i, 2) * 0.5;
    if (Math.abs(x + 2.7) < 1.3 || Math.abs(z - 3.2) < 1.4 || Math.abs(x - 4.6) < 1.2) continue;
    if (x > -1.6 && x < 3.6 && z > -1.2 && z < 2.6) continue; // Platz für das Schnitt-Haus
    plaetze.push([x, z, i]);
  }
  for (const [x, z, i] of plaetze) {
    const sattel = hash(i, 4) < 0.4;
    const h = modellHaus({ breite: 1.3 + hash(i, 5) * 0.8, hoehe: sattel ? 0.9 + hash(i, 6) * 0.7 : 1.2 + hash(i, 6) * 2.6, tiefe: 1.2 + hash(i, 7) * 0.7, dach: sattel ? "sattel" : "flach", material: hash(i, 8) < 0.18 ? "holz" : "karton", seed: i });
    h.position.set(x, 0, z);
    h.rotation.y = hash(i, 9) < 0.5 ? 0 : Math.PI / 2;
    szene.add(h);
  }
  for (let i = 0; i < 16; i++) { const b = modellBaum({ groesse: 0.55 + hash(i, 11) * 0.3, seed: i }); b.position.set(-2.0 + (i % 2) * -1.4, 0, -7 + i * 0.95); szene.add(b); }
  for (let i = 0; i < 9; i++) { const b = modellBaum({ groesse: 0.5 + hash(i, 13) * 0.3, seed: 40 + i }); b.position.set(-1 + i * 1.3, 0, 2.55 + (i % 2) * 1.3); szene.add(b); }
  for (let i = 0; i < 7; i++) { const f = modellFigur({ groesse: 0.3 }); f.position.set(-2.7 + (hash(i, 15) - 0.5) * 0.9, 0, 0.5 + i * 0.9); szene.add(f); }

  // Schnitt-Haus vorne: oben WG (Etage 3, Raum 1 = WG-Zimmer), unten eigene Wohnung (Etage 1, Räume 0–1)
  const haus = schnittHaus({ breite: 3.3, tiefe: 2.0, etagen: 4, etagenHoehe: 0.66, raeume: 3, seed: 6, licht: 0.85 });
  haus.position.set(0.9, 0, 0.6);
  szene.add(haus);
  const rb = haus.userData.raumBreite, eh = haus.userData.etagenHoehe;
  const mA = acrylMarker({ breite: rb * 0.96, tiefe: 1.92, hoehe: eh * 0.92, farbe: TEAM_A });
  mA.position.set(0.9 - 3.3 / 2 + rb * 1.5, 3 * eh + 0.03, 0.6);
  const mB = acrylMarker({ breite: rb * 1.96, tiefe: 1.92, hoehe: eh * 0.92, farbe: TEAM_B });
  mB.position.set(0.9 - 3.3 / 2 + rb, 1 * eh + 0.03, 0.6);
  szene.add(mA, mB);

  // Lichtbahnen durch die Gassen (Richtung der Sonne) und Staub darin
  if (Q.has("bahnen")) {
    const richt = new THREE.Vector3(...SONNE).normalize();
    for (const [x, z, b, st] of [[-2.7, -1.5, 1.4, 0.16], [-2.7, 3.2, 1.1, 0.12], [4.6, -3, 0.9, 0.1]]) {
      const l = lichtBahn({ laenge: 12, breite: b, farbe: "#FFC58A", staerke: st, streifen: 0.6 });
      l.position.set(x + richt.x * 9, richt.y * 9, z + richt.z * 9);
      l.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), richt.clone().negate());
      l.rotateY(Math.PI / 2);
      szene.add(l);
    }
  }
  szene.add(staub({ anzahl: 500, bereich: [10, 4, 10], mitte: [0, 2, 0], farbe: "#FFD7A8", groesse: 0.012, staerke: 1.2, aussen: 0.35 }));
  buendeln(szene);

  // Beispielwerte: WG 520 €, Wohnung 790 € im Monat; Monate laufen ab „Was“ bis 12
  const monate = (t) => 12 * ease.inOutSine(fortschritt(t, T("Was"), dauer - 0.5));
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 200);
  const regie = new Regie(kamera, (t) => {
    const k = ease.inOutSine(fortschritt(t, 0, dauer));
    return { pos: [10.5 - 1.8 * k, 9.6 - 0.5 * k, 19.5 - 1.2 * k], ziel: [0.0, 0.9, -0.6], fov: 29 };
  });
  regie.atmen({ staerke: 0.01, tempo: 0.25 });
  const sonnenPunkt = new THREE.Vector3(...SONNE).normalize().multiplyScalar(60).toArray();
  const post = { ...GRADING.abend, belichtung: 1.1, splitStaerke: 0.22, saettigung: 1.02, kontrast: 1.06, strahlen: AUS.has("strahlen") ? 0 : 0.9, strahlenPunkt: sonnenPunkt, strahlenSchwelle: 0.9, strahlenLaenge: 0.75, strahlenAbfall: 0.97, strahlenFarbe: [1, 0.82, 0.6] };
  const welt = {
    szene, kamera, post,
    update(t) {
      mA.setze(Math.min(1, huelle(t, T("WG-Zimmer"))));
      mB.setze(Math.min(1, huelle(t, T("Wohnung?"))));
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, [0.9, 1.3, 0.6], { tiefe: 0.14, nah: 0.6, fern: 0.8 }));
    },
  };
  const werte = (t) => ({ a: Math.round(520 * monate(t)), b: Math.round(790 * monate(t)) });
  const uhr = { ein: "Was", zeit: (t) => monate(t), format: (s) => `${Math.round(s)}`, label: "MONATE" };
  return { welt, werte, uhr };
}
