// Treppe oder Aufzug: Wer ist im Bürohaus wirklich schneller oben?  (Stil 12 Comic-Toon 3D + Stil 13 Blaupause)
// Bürohaus im Schnitt: Treppenhaus links (zweiläufig), Aufzugsschacht rechts, Büros außen. Rennen in den 4. Stock nach
// der eigenen Simulation (sim/treppe_aufzug.mjs): Treppe 45,55 s, Aufzug 48,75 s (25 s Warten). „Warum?“ als Blaupause.
// Deterministisch: window.renderAt(t). Alle Zahlen im Bild kommen aus der Simulation.
import * as THREE from "three";
import { Zeitplan, schaetzeTiming, normalisiere } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder } from "../../engine/bewegung.js";
import { ComicBuehne, toon, flach, teil, box, walze, comicHimmel, textTextur, figur, setzeFigur, KONTUR, setzeKonturDicke } from "../../engine/stil_comic.js";
import { blaupausePapier, koerper, linien, fuellung, FUELL } from "../../engine/stil_blaupause.js";
import { PARAMETER as P, rennen, aufzug as aufzugSim, fahrt, breakEven } from "../../sim/treppe_aufzug.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Figuren, Tafel, Chips, Untertitel, Etagenschilder)
const TEAM_A = "#FF8A3D"; // Treppe (Orange)
const TEAM_B = "#3D8BFF"; // Aufzug (Blau)
const TINTE = "#12151D";
const GELB = "#FFD23F";

// =====================================================================================
// Modell (Simulation): Hauptrennen 4. Stock, 25 s Warten
// =====================================================================================
const E = P.ETAGE_M; // 3,5 m
const ZIEL = 4;
const R = rennen(ZIEL);
const TR = R.treppe, AU = R.aufzug;
const T_TREPPE = TR.zeit, T_AUFZUG = AU.zeit;
/** Zeitpunkt (Rennzeit), zu dem die Treppe die Höhe h erreicht */
const treppeBei = (h) => { for (let x = 0; x < 80; x += 0.005) if (TR.hoehe(x) >= h - 1e-9) return x; return Infinity; };
const aufzugBei = (h, ab = 25) => { for (let x = ab; x < 80; x += 0.005) if (AU.hoehe(x) >= h - 1e-9) return x; return Infinity; };
// Wert auf der Tafel: Höhe in m. Der Aufzug zählt erst als „oben“, wenn die Person ausgestiegen ist.
const wertTreppe = (tau) => TR.hoehe(Math.max(0, tau));
const wertAufzug = (tau) => (tau >= T_AUFZUG ? ZIEL * E : Math.max(0, AU.hoehe(Math.max(0, tau)) - 0.03));
let TAU_UEBERHOLT = null;
for (let x = 30; x < T_TREPPE; x += 0.005) if (wertAufzug(x) > wertTreppe(x) + 1e-6) { TAU_UEBERHOLT = x; break; }
const FAHRZEIT = AU.fahrzeit, STANDZEIT = AU.standzeit;
// Etagen-Ergebnis für die zweite Überraschung: ohne Halte und mit zwei Halten
const SIEGER_OHNE = [], SIEGER_HALTE = [];
for (let e = 1; e <= 7; e++) {
  SIEGER_OHNE[e] = rennen(e).sieger;
  const h = e > 2 ? [Math.max(1, Math.round(e / 3)), Math.max(2, Math.round((2 * e) / 3))] : [];
  SIEGER_HALTE[e] = e > 2 ? rennen(e, { halte: [...new Set(h)].length === 2 ? h : [1, 2] }).sieger : SIEGER_OHNE[e];
}
const BE_OHNE = breakEven({}), BE_HALTE = breakEven({ halte: [1, 2] });

// Kabine vor dem Rennen bzw. während der Wartezeit: steht im 5. Stock, fährt mit einem Halt im 3. Stock nach unten
// und ist genau nach der Wartezeit (25 s) im EG (Darstellung der 25 s; die Simulation nimmt nur die Wartezeit an).
const ABWAERTS = (() => {
  const ph = [];
  let t = 0;
  const add = (art, d, h0, h1, f = null) => { ph.push({ art, von: t, bis: t + d, h0, h1, f }); t += d; };
  add("start", P.START_VERZUG, 5 * E, 5 * E);
  const f1 = fahrt(2 * E);
  add("fahrt", f1.dauer, 5 * E, 3 * E, (x) => 5 * E - f1.s(x));
  add("einfahren", P.EINFAHREN, 3 * E, 3 * E);
  add("tuer_auf", P.TUER_AUF, 3 * E, 3 * E);
  add("halt", 2, 3 * E, 3 * E);
  add("tuer_zu", P.TUER_ZU, 3 * E, 3 * E);
  add("start", P.START_VERZUG, 3 * E, 3 * E);
  const f2 = fahrt(3 * E);
  add("fahrt", f2.dauer, 3 * E, 0, (x) => 3 * E - f2.s(x));
  add("einfahren", P.EINFAHREN, 0, 0);
  add("warten", Math.max(0, P.WARTEZEIT - t), 0, 0);
  return ph;
})();
/** Zustand der Kabine zur Rennzeit tau: {h (Kabinenboden), tuer 0..1, v (m/s, aufwärts positiv)} */
function kabine(tau) {
  const k = (ph, x) => (ph.bis > ph.von ? clamp((x - ph.von) / (ph.bis - ph.von)) : 1);
  const hoehe = (x) => {
    if (x <= 0) return 5 * E;
    if (x < P.WARTEZEIT) {
      const ph = ABWAERTS.find((p) => x < p.bis) || ABWAERTS[ABWAERTS.length - 1];
      return ph.f ? ph.f(x - ph.von) : ph.h0;
    }
    return AU.hoehe(x);
  };
  let tuer = 0;
  if (tau > 0 && tau < P.WARTEZEIT) {
    const ph = ABWAERTS.find((p) => tau < p.bis);
    if (ph && ph.art === "tuer_auf") tuer = ease.inOutSine(k(ph, tau));
    else if (ph && ph.art === "halt") tuer = 1;
    else if (ph && ph.art === "tuer_zu") tuer = 1 - ease.inOutSine(k(ph, tau));
  } else if (tau >= P.WARTEZEIT) {
    const z = AU.zustand(tau);
    const a = z.phase.art;
    if (a === "tuer_auf") tuer = ease.inOutSine(z.k);
    else if (a === "einsteigen" || a === "halt" || a === "aussteigen" || a === "oben") tuer = 1;
    else if (a === "tuer_zu") tuer = 1 - ease.inOutSine(z.k);
  }
  const v = (hoehe(tau + 0.05) - hoehe(tau - 0.05)) / 0.1;
  return { h: hoehe(tau), tuer, v };
}

// =====================================================================================
// Geometrie des Bürohauses (Meter): x nach rechts, y nach oben, z zur Kamera
// =====================================================================================
const G = {
  xL0: -8.6, xS0: -5.8, xF0: -4.4, xF1: -1.88, xS1: -0.8, xK1: 0.4, xA0: 0.4, xA1: 3.0, xR1: 7.8,
  zB: -2.3, zV: 1.8, zVorn: 0.85, zHinten: -1.15, zA0: -2.2, zA1: 0.3,
  ebenen: 8, // EG … 7. Stock, Dach auf 8·E
  kabX: 1.7, kabZ: -0.95, kabB: 2.1, kabH: 2.5, kabT: 2.1,
};
const DACH = G.ebenen * E;
const LAUF_B = 1.2; // Laufbreite
const AUFTRITT = (G.xF1 - G.xF0) / 9;
const STEIG = E / 20;

/** Laufweg der Treppe → Position, Richtung, Schrittphase (aus den Phasen der Simulation) */
function laeufer(tau) {
  if (tau <= 0) return { pos: [G.xF0 - 0.3, 0, G.zVorn], richtung: Math.PI / 2, phase: 0, lauf: 0, steigen: 0, oben: false };
  if (tau >= T_TREPPE) {
    const d = tau - T_TREPPE;
    const k = ease.inOutSine(clamp(d / 1.0));
    const x = lerp(G.xF0, -5.0, k), z = lerp(G.zHinten, 0.75, k);
    return { pos: [x, ZIEL * E, z], richtung: lerp(-Math.PI / 2 - 0.6, 0.15, k), phase: d * 3.2, lauf: d < 1 ? 0.8 : 0, steigen: 0, oben: true, jubel: Math.max(0, d - 1.0) };
  }
  const z = TR.zustand(tau);
  const ph = z.phase, k = z.k;
  const schritte = (n) => k * n;
  let pos, richtung, phase = 0, lauf = 1, steigen = 0;
  if (ph.art === "lauf") {
    const x0 = ph.seite === 0 ? G.xF0 : G.xF1, x1 = ph.seite === 0 ? G.xF1 : G.xF0;
    const zz = ph.seite === 0 ? G.zVorn : G.zHinten;
    const n = k * 10; // 10 Steigungen
    const stufe = Math.floor(n), rest = n - stufe;
    const y = ph.h0 + STEIG * (stufe + ease.inOutSine(clamp(rest * 1.6)));
    pos = [lerp(x0, x1, k), y, zz];
    richtung = ph.seite === 0 ? Math.PI / 2 : -Math.PI / 2;
    phase = schritte(10);
    steigen = 1;
  } else {
    // Podest: Wende um 180° (rechts bzw. links)
    const rechts = ph.seite === 0;
    const xc = rechts ? G.xF1 : G.xF0, zc = (G.zVorn + G.zHinten) / 2, r = (G.zVorn - G.zHinten) / 2;
    const w = Math.PI * ease.inOutSine(k);
    const x = rechts ? xc + 0.62 * Math.sin(w) : xc - 0.62 * Math.sin(w);
    const zz = rechts ? zc + r * Math.cos(w) : zc - r * Math.cos(w);
    pos = [x, ph.h0, zz];
    richtung = rechts ? Math.PI / 2 + w : -Math.PI / 2 + w;
    phase = schritte(3);
  }
  return { pos, richtung, phase: phase + ph.etage * 26 + (ph.art === "podest" ? (ph.seite === 0 ? 10 : 23) : ph.seite === 0 ? 0 : 13), lauf, steigen, oben: false };
}

/** Person im Aufzug: wartet in der Lobby, steigt ein, fährt, steigt aus */
const LOBBY = [0.95, 0, 1.15];
function fahrgast(tau) {
  const kab = kabine(tau);
  const innen = [G.kabX, 0, G.kabZ + 0.2];
  if (tau < P.WARTEZEIT + P.TUER_AUF) {
    // wartet: tippelt ab dem Start ungeduldig
    const ung = tau > 0 ? 1 : 0;
    return { pos: [LOBBY[0], 0, LOBBY[2]], richtung: tau > 0 ? 2.55 : 0.35, phase: tau * 1.6, lauf: 0.12 * ung, huepf: ung * Math.abs(Math.sin(tau * 5)) * 0.03 };
  }
  const tEin = P.WARTEZEIT + P.TUER_AUF;
  if (tau < tEin + P.TUER_OFFEN_START) {
    const k = clamp((tau - tEin) / 2.0);
    const pos = [lerp(LOBBY[0], innen[0], ease.inOutSine(k)), 0, lerp(LOBBY[2], innen[2], ease.inOutSine(k))];
    const dreh = clamp((tau - tEin - 1.8) / 0.9);
    const r0 = Math.atan2(innen[0] - LOBBY[0], innen[2] - LOBBY[2]);
    return { pos, richtung: lerp(r0, Math.PI * 2, ease.inOutSine(dreh)), phase: (tau - tEin) * 3, lauf: k < 1 ? 0.7 : 0 };
  }
  const tAus = T_AUFZUG - P.JE_PERSON;
  if (tau < tAus) return { pos: [innen[0], kab.h, innen[2]], richtung: 0, phase: 0, lauf: 0, huepf: 0 };
  const k = clamp((tau - tAus) / 1.0);
  const ziel = [G.kabX - 0.3, ZIEL * E, 1.15];
  return { pos: [lerp(innen[0], ziel[0], ease.inOutSine(k)), ZIEL * E, lerp(innen[2], ziel[2], ease.inOutSine(k))], richtung: 0, phase: (tau - tAus) * 3, lauf: k < 1 ? 0.7 : 0, schulter: Math.max(0, tau - tAus - 1.2) };
}

// =====================================================================================
// Welt 1: Comic-Bürohaus
// =====================================================================================
function baueComic() {
  const szene = new THREE.Scene();
  szene.background = comicHimmel({ strahlenMitte: [520, 820] });
  szene.add(new THREE.AmbientLight("#ffffff", 1.0));
  const sonne = new THREE.DirectionalLight("#ffffff", 3.0);
  sonne.position.set(14, 30, 26);
  sonne.target.position.set(-0.5, 12, 0);
  szene.add(sonne.target);
  sonne.castShadow = SCHATTEN > 0;
  if (SCHATTEN > 0) {
    sonne.shadow.mapSize.set(SCHATTEN, SCHATTEN);
    Object.assign(sonne.shadow.camera, { left: -17, right: 17, top: 21, bottom: -21, near: 1, far: 90 });
    sonne.shadow.bias = -0.0006;
    sonne.shadow.normalBias = 0.02;
  }
  szene.add(sonne);
  const haus = new THREE.Group();
  szene.add(haus);
  const T_ = (geo, farbe, x, y, z, opt) => teil(geo, farbe, x, y, z, haus, opt);

  // ---------- Umgebung: Erdreich im Schnitt mit Keller (füllt den unteren Bildteil), Gehweg, Bäume ----------
  const ZF = G.zV + 3.4; // Schnittkante des Bodens (vorne)
  const UG = -4.2; // Kellerboden
  const ERDE = "#B07444", ERDE2 = "#8E5A33", RASEN = "#63D36E";
  const block = (x0, x1, y0, y1, z0, z1, farbe, opt = {}) => teil(box(x1 - x0, y1 - y0, z1 - z0, 0.04), farbe, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, szene, { linie: false, ...opt });
  block(-70, G.xL0 - 0.3, -16, -0.64, -80, ZF, ERDE);
  block(G.xR1 + 0.3, 70, -16, -0.64, -80, ZF, ERDE);
  block(G.xL0 - 0.3, G.xR1 + 0.3, -16, UG - 0.35, -80, ZF, ERDE);
  block(G.xL0 - 0.3, G.xR1 + 0.3, UG - 0.35, -0.64, -80, G.zB - 0.3, ERDE);
  block(-70, 70, -0.66, -0.6, -80, G.zB - 0.3, RASEN, { punkte: true });
  for (const [x0, x1] of [[-70, G.xL0 - 0.3], [G.xR1 + 0.3, 70]]) block(x0, x1, -0.66, -0.6, G.zB - 0.3, G.zV, RASEN);
  // Gehweg vor dem Haus (Decke des Kellers vorne) mit Bordstein
  block(-70, 70, -0.62, -0.02, G.zV, ZF, "#E9E4DA", { linie: false });
  block(-70, 70, -0.62, -0.42, ZF - 0.05, ZF + 0.02, "#C9C2B4", { linie: false, schatten: false });
  // Schnittkante: Erdschichten, Steine, Leitungen
  for (const [y, h, f] of [[-1.3, 0.14, ERDE2], [-5.6, 0.22, ERDE2], [-8.4, 0.3, "#9C6639"], [-11.2, 0.25, ERDE2]]) block(-70, 70, y - h / 2, y + h / 2, ZF - 0.02, ZF + 0.03, f, { schatten: false });
  const STEINE = [[-14.5, -2.6, 0.5], [-10.6, -6.8, 0.7], [-12.8, -9.6, 0.45], [10.8, -2.2, 0.55], [13.6, -7.1, 0.75], [11.2, -10.3, 0.5], [-4.6, -6.6, 0.4], [-1.2, -9.0, 0.6], [3.9, -6.0, 0.45], [6.8, -9.4, 0.55], [-7.4, -11.6, 0.4], [1.9, -12.2, 0.5]];
  for (const [x, y, r] of STEINE) { const st = teil(new THREE.SphereGeometry(r, 14, 10), "#A9ADB8", x, y, ZF - r * 0.35, szene); st.scale.set(1.3, 0.8, 0.7); }
  const rohr = teil(walze(0.32, 140, 20), "#3DB5FF", 0, -5.0, ZF - 0.5, szene);
  rohr.rotation.z = Math.PI / 2;
  const kabel = teil(walze(0.12, 140, 12), GELB, 0, -7.3, ZF - 0.2, szene);
  kabel.rotation.z = Math.PI / 2;
  // Keller: Wände, Boden, Leuchten, Autos, Regale, Schachtgrube mit Puffern
  const BETON = "#B8BFCC", BETON2 = "#9AA3B5";
  block(G.xL0 - 0.3, G.xR1 + 0.3, UG - 0.35, UG, G.zB - 0.3, ZF, "#8C94A6", { linie: true });
  block(G.xL0 - 0.3, G.xR1 + 0.3, UG, -0.6, G.zB - 0.3, G.zB, BETON2);
  block(G.xL0 - 0.3, G.xL0, UG, -0.6, G.zB, ZF, BETON, { linie: true });
  block(G.xR1, G.xR1 + 0.3, UG, -0.6, G.zB, ZF, BETON, { linie: true });
  for (const x of [-4.6, 3.4]) block(x - 0.2, x + 0.2, UG, -0.6, -0.6, -0.2, BETON, { linie: true });
  for (let i = 0; i < 9; i++) block(G.xL0 + 0.6 + i * 1.85, G.xL0 + 1.3 + i * 1.85, UG + 0.005, UG + 0.02, 0.4, 0.55, "#FFFFFF", { schatten: false });
  for (const x of [-6.0, -1.4, 3.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.35), flach("#FFF7C2")); l.position.set(x, -0.72, 0.2); szene.add(l); }
  const auto = (x, farbe, ry) => {
    const a = new THREE.Group();
    teil(box(3.6, 0.85, 1.7, 0.3), farbe, 0, 0.62, 0, a);
    teil(box(2.0, 0.7, 1.55, 0.28), farbe, -0.25, 1.32, 0, a);
    teil(box(1.85, 0.5, 1.6, 0.18), "#9FDCFF", -0.25, 1.32, 0, a, { linie: false, punkte: false });
    for (const dx of [-1.15, 1.15]) for (const dz of [-0.82, 0.82]) { const r = teil(walze(0.36, 0.26, 18), "#22222C", dx, 0.36, dz, a); r.rotation.x = Math.PI / 2; }
    for (const dz of [-0.55, 0.55]) teil(box(0.08, 0.18, 0.32, 0.04), "#FFF6A8", 1.81, 0.72, dz, a, { linie: false, punkte: false });
    a.position.set(x, UG, -0.4);
    a.rotation.y = ry;
    szene.add(a);
  };
  auto(-5.9, "#2FC17B", 0.18);
  auto(5.6, "#E94B6A", -0.12);
  for (let i = 0; i < 3; i++) teil(box(0.7, 0.55, 0.6, 0.05), "#D9A066", -1.8 + i * 0.8, UG + 0.28 + (i === 1 ? 0.55 : 0), -1.7, szene);
  teil(box(0.7, 0.55, 0.6, 0.05), "#D9A066", -1.4, UG + 1.38, -1.7, szene);
  for (const y of [-1.05, -1.35]) { const r = teil(walze(0.09, G.xR1 - G.xL0, 10), y > -1.2 ? "#FF7A1A" : "#9AA3B5", (G.xL0 + G.xR1) / 2, y, -2.0, szene, { schatten: false }); r.rotation.z = Math.PI / 2; }
  block(G.xA0, G.xA1, UG, -0.6, G.zA0, G.zA1, "#6E778C");
  for (const dx of [-0.55, 0.55]) { teil(walze(0.14, 0.7, 14), "#FFD23F", G.kabX + dx, -0.6 - 0.35 + 0.0, G.kabZ, szene); }
  const baum = (x, z, s) => {
    teil(walze(0.16 * s, 1.6 * s), "#8A5A3C", x, -0.6 + 0.8 * s, z, szene);
    teil(new THREE.SphereGeometry(1.25 * s, 20, 14), "#2FB54A", x, -0.6 + 2.3 * s, z, szene);
    teil(new THREE.SphereGeometry(0.9 * s, 18, 12), "#41C45C", x + 0.6 * s, -0.6 + 2.9 * s, z + 0.3, szene);
  };
  baum(-11.2, 0.6, 1.4); baum(-13.4, -3.0, 1.8); baum(10.6, 0.6, 1.3); baum(12.8, -3.5, 1.9);
  // Nachbarhäuser im Hintergrund
  const NB = ["#FFE14D", "#FF9EC4", "#9FDCFF", "#C8A2FF", "#FFFFFF"];
  [[-19, 14, 7], [-26, 22, 9], [18, 18, 8], [25, 26, 9], [-14, 9, 6], [14, 11, 6]].forEach(([x, h, b], i) => teil(box(b, h, 6, 0.1), NB[i % 5], x, h / 2 - 0.6, -16 - (i % 3) * 3, szene));

  // ---------- Decken (Etagen), Podeste, Läufe ----------
  const DECKE = "#F4EFE6", DECKE_KANTE = "#E2D9C8";
  const platte = (x0, x1, z0, z1, y, d = 0.3, farbe = DECKE) => T_(box(x1 - x0, d, z1 - z0, 0.05), farbe, (x0 + x1) / 2, y - d / 2, (z0 + z1) / 2);
  for (let k = 0; k <= G.ebenen; k++) {
    const y = k * E;
    const d = k === 0 ? 0.6 : 0.3;
    platte(G.xL0, G.xS0, G.zB, G.zV, y, d);
    platte(G.xS0, G.xF0, G.zB, G.zV, y, d, "#F8E9C9");
    platte(G.xS1, G.xK1, G.zB, G.zV, y, d, "#E7E3DA");
    platte(G.xA0, G.xA1, G.zA1, G.zV, y, d, "#DCE8F7");
    platte(G.xA1, G.xR1, G.zB, G.zV, y, d);
    if (k === 0) platte(G.xF0, G.xS1, G.zB, G.zV, 0, 0.6, "#F8E9C9");
    if (k === G.ebenen) platte(G.xF0, G.xS1, G.zB, G.zV, y, d), platte(G.xA0, G.xA1, G.zB, G.zA1, y, d, "#C9D3E6");
    // Deckenkante vorne (dunkler Streifen) für Lesbarkeit der Etagen
    if (k > 0) T_(box(G.xR1 - G.xL0, 0.08, 0.06, 0.02), DECKE_KANTE, (G.xL0 + G.xR1) / 2, y - 0.3, G.zV + 0.01, { linie: false, schatten: false });
  }
  // Zwischenpodest rechts (halbe Etage)
  for (let k = 0; k < G.ebenen; k++) platte(G.xF1, G.xS1, G.zHinten - LAUF_B / 2, G.zVorn + LAUF_B / 2, k * E + E / 2, 0.25, "#F8E9C9");
  // Treppenläufe: Stufenprofil extrudiert
  const laufGeo = (() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    for (let i = 0; i < 9; i++) { s.lineTo(i * AUFTRITT, (i + 1) * STEIG); s.lineTo((i + 1) * AUFTRITT, (i + 1) * STEIG); }
    s.lineTo(9 * AUFTRITT, 10 * STEIG);
    s.lineTo(9 * AUFTRITT, 10 * STEIG - 0.3);
    s.lineTo(0.1, -0.3);
    s.lineTo(0, -0.3);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: LAUF_B, bevelEnabled: false });
    g.translate(0, 0, -LAUF_B / 2);
    return g;
  })();
  const STUFE = "#FFC36B";
  for (let k = 0; k < G.ebenen; k++) {
    const vorne = T_(laufGeo, STUFE, G.xF0, k * E, G.zVorn);
    const hinten = T_(laufGeo, "#F5B04F", G.xF1, k * E + E / 2, G.zHinten);
    hinten.scale.x = -1;
    // Handlauf (schräg) an der Innenseite beider Läufe
    const lang = Math.hypot(9 * AUFTRITT, E / 2);
    const winkel = Math.atan2(E / 2, 9 * AUFTRITT);
    const hl = T_(box(lang, 0.07, 0.07, 0.03), TINTE, (G.xF0 + G.xF1) / 2, k * E + E / 4 + 1.0, G.zVorn - LAUF_B / 2, { schatten: false });
    hl.rotation.z = winkel;
    const hl2 = T_(box(lang, 0.07, 0.07, 0.03), TINTE, (G.xF0 + G.xF1) / 2, k * E + (3 * E) / 4 + 1.0, G.zHinten + LAUF_B / 2, { schatten: false });
    hl2.rotation.z = -winkel;
    for (const [x, y] of [[G.xF0 + 0.3, k * E], [G.xF1 - 0.2, k * E + E / 2]]) T_(box(0.06, 1.0, 0.06, 0.02), TINTE, x, y + 0.5 + (x < -3 ? 0.1 : 0), G.zVorn - LAUF_B / 2, { schatten: false, linie: false });
  }

  // ---------- Wände: Rückwand je Bereich, Seitenwände ----------
  const WAND_T = "#FFF3D6", WAND_K = "#D9DDE6", WAND_B = "#FFFFFF";
  T_(box(G.xS1 - G.xS0, DACH, 0.2, 0.02), WAND_T, (G.xS0 + G.xS1) / 2, DACH / 2, G.zB - 0.1, { linie: false });
  T_(box(G.xK1 - G.xS1, DACH, G.zV - G.zB - 0.02, 0.04), WAND_K, (G.xS1 + G.xK1) / 2, DACH / 2, (G.zB + G.zV) / 2 - 0.01);
  T_(box(G.xA1 - G.xA0, DACH + 1, 0.2, 0.02), "#7B8499", (G.xA0 + G.xA1) / 2, DACH / 2, G.zA0 - 0.1, { linie: false });
  T_(box(G.xS0 - G.xL0, DACH, 0.2, 0.02), WAND_B, (G.xL0 + G.xS0) / 2, DACH / 2, G.zB - 0.1, { linie: false });
  T_(box(G.xR1 - G.xA1, DACH, 0.2, 0.02), WAND_B, (G.xA1 + G.xR1) / 2, DACH / 2, G.zB - 0.1, { linie: false });
  for (const x of [G.xL0 - 0.15, G.xR1 + 0.15]) T_(box(0.3, DACH + 0.6, G.zV - G.zB + 0.3, 0.04), "#F2F2F2", x, DACH / 2 - 0.3, (G.zB + G.zV) / 2 - 0.1);
  // Schachtpfosten vorne und Schienen
  for (const x of [G.xA0 + 0.08, G.xA1 - 0.08]) T_(box(0.16, DACH, 0.22, 0.03), "#5A6378", x, DACH / 2, G.zA1 - 0.1);
  for (const x of [G.xA0 + 0.35, G.xA1 - 0.35]) T_(box(0.1, DACH, 0.1, 0.02), "#AEB6C6", x, DACH / 2, G.zA0 + 0.12, { linie: false });
  // Fenster in den Büros (Rückwand)
  const fensterMat = flach("#BFE6FF");
  for (let k = 0; k < G.ebenen; k++) {
    for (const [x0, x1] of [[G.xL0 + 0.5, G.xS0 - 0.5], [G.xA1 + 0.6, G.xR1 - 0.5]]) {
      const w = x1 - x0;
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.5), fensterMat);
      f.position.set((x0 + x1) / 2, k * E + 1.9, G.zB + 0.01);
      haus.add(f);
      T_(box(w + 0.12, 0.1, 0.08, 0.02), TINTE, (x0 + x1) / 2, k * E + 1.15, G.zB + 0.05, { linie: false, schatten: false });
      T_(box(w + 0.12, 0.1, 0.08, 0.02), TINTE, (x0 + x1) / 2, k * E + 2.65, G.zB + 0.05, { linie: false, schatten: false });
      for (let j = 0; j <= Math.round(w / 1.4); j++) T_(box(0.08, 1.6, 0.08, 0.02), TINTE, x0 + (j * w) / Math.round(w / 1.4), k * E + 1.9, G.zB + 0.05, { linie: false, schatten: false });
    }
  }
  // Büro-Einrichtung (einmal bauen, dann je Etage klonen)
  const buero = new THREE.Group();
  const tisch = (x, z) => {
    teil(box(1.5, 0.08, 0.75, 0.03), "#FFFFFF", x, 0.76, z, buero);
    for (const dx of [-0.65, 0.65]) teil(box(0.06, 0.74, 0.6, 0.02), "#9AA3B5", x + dx, 0.38, z, buero, { linie: false });
    teil(box(0.62, 0.4, 0.05, 0.03), TINTE, x, 1.12, z - 0.2, buero);
    teil(box(0.54, 0.32, 0.02, 0.02), "#7FD6FF", x, 1.12, z - 0.17, buero, { linie: false, punkte: false });
    teil(box(0.5, 0.5, 0.5, 0.12), "#FF6B8A", x, 0.5, z + 0.62, buero);
  };
  tisch(4.5, -1.2); tisch(6.5, -1.2);
  teil(walze(0.22, 0.4), "#C77B4D", 7.2, 0.2, 0.9, buero);
  teil(new THREE.SphereGeometry(0.45, 16, 12), "#2FB54A", 7.2, 0.75, 0.9, buero);
  teil(box(1.0, 1.6, 0.5, 0.05), "#8C7AE6", -7.6, 0.8, -1.8, buero);
  teil(walze(0.22, 0.4), "#C77B4D", -6.5, 0.2, 0.9, buero);
  teil(new THREE.SphereGeometry(0.42, 16, 12), "#41C45C", -6.5, 0.72, 0.9, buero);
  teil(walze(0.2, 1.1), "#E9F4FF", -8.0, 0.55, 0.6, buero);
  teil(walze(0.17, 0.42), "#7FD6FF", -8.0, 1.3, 0.6, buero, { linie: false });
  for (let k = 0; k < G.ebenen; k++) {
    const b = buero.clone();
    b.position.y = k * E;
    haus.add(b);
    // Deckenleuchten
    for (const x of [-7.2, 5.5]) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), flach("#FFF7C2"));
      l.position.set(x, k * E + E - 0.34, -0.5);
      haus.add(l);
    }
  }
  // Dach: Brüstung, Maschinenraum über dem Schacht, Antenne
  T_(box(G.xR1 - G.xL0 + 0.3, 0.6, 0.2, 0.03), "#F2F2F2", (G.xL0 + G.xR1) / 2, DACH + 0.3, G.zV);
  T_(box(G.xA1 - G.xA0 + 0.4, 2.2, G.zA1 - G.zA0 + 0.6, 0.06), "#C9D3E6", (G.xA0 + G.xA1) / 2, DACH + 1.1, (G.zA0 + G.zA1) / 2);
  T_(walze(0.06, 3), TINTE, -3, DACH + 1.5, -1.5, { linie: false });
  T_(new THREE.SphereGeometry(0.18, 12, 10), "#FF4D2E", -3, DACH + 3.1, -1.5);

  // ---------- Etagenschilder: Treppenhaus (Rückwand) und Kern (vorne) ----------
  const NAMEN = ["EG", "1", "2", "3", "4", "5", "6", "7"];
  const texturen = (txt, gross) => ({
    neutral: textTextur(txt, { b: gross ? 384 : 256, h: 192, grund: "#FFFFFF", farbe: TINTE, kursiv: true }),
    a: textTextur(txt, { b: gross ? 384 : 256, h: 192, grund: TEAM_A, farbe: TINTE, kursiv: true }),
    b: textTextur(txt, { b: gross ? 384 : 256, h: 192, grund: TEAM_B, farbe: "#FFFFFF", kursiv: true }),
    ziel: textTextur(txt, { b: gross ? 384 : 256, h: 192, grund: GELB, farbe: TINTE, kursiv: true }),
  });
  const schilderT = [], schilderK = [];
  for (let k = 0; k < G.ebenen; k++) {
    const txT = texturen(NAMEN[k], true);
    const mT = new THREE.MeshBasicMaterial({ map: k === ZIEL ? txT.ziel : txT.neutral, transparent: true });
    const sT = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), mT);
    sT.position.set(-3.15, k * E + 2.45, G.zB + 0.02);
    haus.add(sT);
    schilderT.push({ m: mT, tx: txT, k });
    const txK = texturen(NAMEN[k], false);
    const mK = new THREE.MeshBasicMaterial({ map: k === ZIEL ? txK.ziel : txK.neutral, transparent: true });
    const sK = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.64), mK);
    sK.position.set((G.xS1 + G.xK1) / 2, k * E + 2.5, G.zV + 0.01);
    haus.add(sK);
    schilderK.push({ m: mK, tx: txK, k });
  }
  // Rufknopf je Etage (Kern vorne)
  const knoepfe = [];
  for (let k = 0; k < G.ebenen; k++) {
    T_(box(0.22, 0.36, 0.06, 0.03), "#5A6378", (G.xS1 + G.xK1) / 2, k * E + 1.25, G.zV + 0.02, { schatten: false });
    const m = new THREE.MeshBasicMaterial({ color: "#3A4152" });
    const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 18), m);
    kn.rotation.x = Math.PI / 2;
    kn.position.set((G.xS1 + G.xK1) / 2, k * E + 1.25, G.zV + 0.07);
    haus.add(kn);
    knoepfe.push(m);
  }
  // Ziel: Banner im 4. Stock und Schachbrett-Kante
  const zielTx = textTextur("ZIEL · 4. STOCK", { b: 1024, h: 192, grund: GELB, farbe: TINTE, groesse: 0.56 });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.79), new THREE.MeshBasicMaterial({ map: zielTx, transparent: true }));
  banner.position.set(-1.6, (ZIEL + 1) * E - 0.85, G.zV + 0.05);
  haus.add(banner);
  banner.userData.ziel = true;
  for (const x of [-3.5, 0.3]) T_(walze(0.025, 0.55), TINTE, x, (ZIEL + 1) * E - 0.55, G.zV + 0.05, { linie: false, schatten: false });
  const schach = document.createElement("canvas");
  schach.width = 512; schach.height = 32;
  const sg = schach.getContext("2d");
  for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) { sg.fillStyle = (i + j) % 2 ? TINTE : "#FFFFFF"; sg.fillRect(i * 16, j * 16, 16, 16); }
  const schachTx = new THREE.CanvasTexture(schach);
  schachTx.colorSpace = THREE.SRGBColorSpace;
  schachTx.magFilter = THREE.NearestFilter;
  const kante = new THREE.Mesh(new THREE.PlaneGeometry(G.xA1 - G.xS0, 0.3), new THREE.MeshBasicMaterial({ map: schachTx }));
  kante.position.set((G.xS0 + G.xA1) / 2, ZIEL * E - 0.15, G.zV + 0.03);
  haus.add(kante);

  // ---------- Kabine mit Glastüren, Seil, Gegengewicht ----------
  const kab = new THREE.Group();
  szene.add(kab);
  const KB = "#2F6FED";
  teil(box(G.kabB, 0.16, G.kabT, 0.04), "#3A4152", 0, 0.08, 0, kab);
  teil(box(G.kabB, 0.16, G.kabT, 0.04), KB, 0, G.kabH - 0.08, 0, kab);
  teil(box(G.kabB, G.kabH, 0.1, 0.03), "#9EC4FF", 0, G.kabH / 2, -G.kabT / 2 + 0.05, kab);
  for (const s of [-1, 1]) teil(box(0.1, G.kabH, G.kabT, 0.03), KB, s * (G.kabB / 2 - 0.05), G.kabH / 2, 0, kab);
  teil(box(G.kabB * 0.8, 0.06, 0.06, 0.02), "#D9DDE6", 0, 1.0, -G.kabT / 2 + 0.14, kab, { linie: false });
  teil(box(0.5, 0.3, 0.3, 0.05), "#5A6378", 0, G.kabH + 0.15, 0, kab);
  const glas = new THREE.MeshBasicMaterial({ color: "#CFEAFF", transparent: true, opacity: 0.2, depthWrite: false });
  const tueren = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(G.kabB / 2 - 0.08, G.kabH - 0.36, 0.05), glas);
    g.add(p);
    const rahmenMat = toon("#DCE6F5", { punkte: false });
    for (const [w, h, x, y] of [[G.kabB / 2 - 0.08, 0.08, 0, (G.kabH - 0.36) / 2], [G.kabB / 2 - 0.08, 0.08, 0, -(G.kabH - 0.36) / 2], [0.08, G.kabH - 0.36, (G.kabB / 4 - 0.04), 0], [0.08, G.kabH - 0.36, -(G.kabB / 4 - 0.04), 0]]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.07), rahmenMat);
      r.position.set(x, y, 0);
      g.add(r);
    }
    g.position.set(s * (G.kabB / 4), G.kabH / 2, G.kabT / 2 + 0.03);
    kab.add(g);
    return { g, s };
  });
  const seilMat = new THREE.MeshBasicMaterial({ color: TINTE });
  const seil = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6), seilMat);
  szene.add(seil);
  const gegen = teil(box(0.5, 1.6, 0.3, 0.05), "#5A6378", G.xA1 - 0.55, 0, G.zA0 + 0.3, szene);
  const seil2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), seilMat);
  szene.add(seil2);
  // Tempostriche unter der Kabine (nur bei Fahrt)
  const strichMat = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0 });
  const striche = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const l = 1.2 + ((i * 37) % 10) / 10 * 1.6;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, l, 0.06), strichMat);
    s.position.set(-0.85 + i * 0.28, -l / 2 - 0.2 - ((i * 13) % 5) * 0.12, G.kabT / 2 + 0.25);
    striche.add(s);
  }
  kab.add(striche);

  // ---------- Figuren ----------
  const treppe = figur({ farbe: TEAM_A, haut: "#FFD9B8", hose: "#2B3045", groesse: 1.08 });
  const fahr = figur({ farbe: TEAM_B, haut: "#F1C9A5", hose: "#2B3045", groesse: 1.08 });
  szene.add(treppe, fahr);
  // Röntgen-Silhouette: verdeckte Teile der Figuren erscheinen in Teamfarbe (bleiben hinter Treppen sichtbar)
  for (const [f, farbe] of [[treppe, TEAM_A], [fahr, TEAM_B]]) {
    const xm = new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.55, depthFunc: THREE.GreaterDepth, depthWrite: false });
    const liste = [];
    f.traverse((o) => { if (o.isMesh && o.material !== KONTUR) liste.push(o); });
    for (const o of liste) {
      const x = new THREE.Mesh(o.geometry, xm);
      x.renderOrder = 20;
      o.add(x);
    }
  }
  // Bodenmarke (Teamfarbe) unter den Figuren
  const marke = (farbe) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), new THREE.MeshBasicMaterial({ color: farbe, transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.renderOrder = 3;
    szene.add(m);
    return m;
  };
  const markeA = marke(TEAM_A), markeB = marke(TEAM_B);

  return { szene, sonne, banner, kab, tueren, seil, seil2, gegen, strichMat, treppe, fahr, markeA, markeB, schilderT, schilderK, knoepfe };
}

// =====================================================================================
// Welt 2: Blaupause (Warum?) – derselbe Kern als technische Zeichnung
// =====================================================================================
function baueBlau() {
  const szene = new THREE.Scene();
  szene.background = blaupausePapier();
  const W = "#ffffff";
  const g = new THREE.Group();
  szene.add(g);
  const B = (geo, o) => koerper(geo, { eltern: g, ...o });
  // Decken EG … 2
  for (let k = 0; k <= 4; k++) {
    for (const [x0, x1, z0, z1] of [[G.xS0, G.xF0, G.zB, G.zV], [G.xS1, G.xK1, G.zB, G.zV], [G.xA0, G.xA1, G.zA1, G.zV], [G.xA1, G.xA1 + 2.5, G.zB, G.zV]]) {
      B(new THREE.BoxGeometry(x1 - x0, 0.3, z1 - z0), { x: (x0 + x1) / 2, y: k * E - 0.15, z: (z0 + z1) / 2, breite: 2.4 });
    }
  }
  // Treppenläufe als Profil
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  for (let i = 0; i < 9; i++) { s.lineTo(i * AUFTRITT, (i + 1) * STEIG); s.lineTo((i + 1) * AUFTRITT, (i + 1) * STEIG); }
  s.lineTo(9 * AUFTRITT, 10 * STEIG); s.lineTo(9 * AUFTRITT, 10 * STEIG - 0.3); s.lineTo(0.1, -0.3); s.lineTo(0, -0.3); s.closePath();
  const lauf = new THREE.ExtrudeGeometry(s, { depth: LAUF_B, bevelEnabled: false });
  lauf.translate(0, 0, -LAUF_B / 2);
  for (let k = 0; k < 4; k++) {
    B(lauf, { x: G.xF0, y: k * E, z: G.zVorn, winkel: 30, breite: 2.6 });
    const h = B(lauf, { x: G.xF1, y: k * E + E / 2, z: G.zHinten, winkel: 30, breite: 2.0 });
    h.scale.x = -1;
    B(new THREE.BoxGeometry(G.xS1 - G.xF1, 0.25, 2 * LAUF_B + 0.8), { x: (G.xF1 + G.xS1) / 2, y: k * E + E / 2 - 0.125, z: (G.zVorn + G.zHinten) / 2, breite: 2.0 });
  }
  // Schacht: Pfosten, Rückwand (Umriss), Kabine im EG, Gegengewicht
  for (const x of [G.xA0 + 0.08, G.xA1 - 0.08]) B(new THREE.BoxGeometry(0.16, 16, 0.22), { x, y: 8, z: G.zA1 - 0.1, breite: 2.4 });
  B(new THREE.BoxGeometry(G.xA1 - G.xA0, 16, 0.2), { x: (G.xA0 + G.xA1) / 2, y: 8, z: G.zA0 - 0.1, breite: 1.8, verdeckt: false });
  const kab = new THREE.Group();
  g.add(kab);
  koerper(new THREE.BoxGeometry(G.kabB, G.kabH, G.kabT), { eltern: kab, y: G.kabH / 2, fuell: fuellung("#2b6cc4", 0.35), farbe: "#8fc0ff", breite: 3.4 });
  const tuerBlau = [-1, 1].map((sg) => koerper(new THREE.BoxGeometry(G.kabB / 2 - 0.06, G.kabH - 0.36, 0.05), { eltern: kab, x: sg * G.kabB / 4, y: G.kabH / 2, z: G.kabT / 2 + 0.05, fuell: fuellung("#8fc0ff", 0.25), farbe: "#8fc0ff", breite: 2.6, verdeckt: false }));
  kab.position.set(G.kabX, 0, G.kabZ);
  // Kern mit Rufknopf
  B(new THREE.BoxGeometry(G.xK1 - G.xS1, 3.2, G.zV - G.zB), { x: (G.xS1 + G.xK1) / 2, y: 1.6, z: (G.zB + G.zV) / 2, breite: 2.2, verdeckt: false });
  // Bodenlinie
  linien([[-9, 0, G.zV, 7, 0, G.zV]], { eltern: g, breite: 3 });
  // Figuren als Umriss (Kapseln) in Teamfarbe
  const figurLinie = (farbe) => {
    const f = new THREE.Group();
    koerper(new THREE.CapsuleGeometry(0.3, 0.55, 4, 12), { eltern: f, y: 1.25, fuell: fuellung(farbe, 0.9), farbe: "#ffffff", breite: 2.4, winkel: 40, verdeckt: false });
    koerper(new THREE.SphereGeometry(0.28, 14, 10), { eltern: f, y: 2.05, fuell: fuellung(farbe, 0.9), farbe: "#ffffff", breite: 2.4, winkel: 40, verdeckt: false });
    for (const dx of [-0.14, 0.14]) koerper(new THREE.CapsuleGeometry(0.1, 0.5, 4, 8), { eltern: f, x: dx, y: 0.45, fuell: fuellung(farbe, 0.9), farbe: "#ffffff", breite: 2.0, winkel: 40, verdeckt: false });
    g.add(f);
    return f;
  };
  const figA = figurLinie(TEAM_A), figB = figurLinie(TEAM_B);
  figB.position.set(LOBBY[0], 0, LOBBY[2]);
  // Maßlinie am Schacht: Fahrt 14 m (wächst bei „fährt“)
  const mass = new THREE.Group();
  g.add(mass);
  const XM = G.xA1 + 0.55;
  linien([[XM, 0, G.zV, XM, ZIEL * E, G.zV]], { eltern: mass, farbe: "#8fc0ff", breite: 4 });
  for (let k = 0; k <= ZIEL; k++) linien([[XM - 0.25, k * E, G.zV, XM + 0.25, k * E, G.zV]], { eltern: mass, farbe: "#8fc0ff", breite: 3 });
  linien([[XM, ZIEL * E, G.zV, XM - 0.25, ZIEL * E - 0.45, G.zV], [XM, ZIEL * E, G.zV, XM + 0.25, ZIEL * E - 0.45, G.zV]], { eltern: mass, farbe: "#8fc0ff", breite: 4 });
  return { szene, kab, tuerBlau, figA, figB, mass };
}

// =====================================================================================
// HUD-Teile dieses Videos (eigene Bausteine, gleiche Schnittstelle wie massstab.js: update(t), ereignisse())
// =====================================================================================
/** Beschriftung mit Führungslinie (Blaupause): {text, klein, team, ein, aus, x, y (Box links oben), anker(t) → {x,y}} */
class Beschriftung {
  constructor(M, { text, klein = "", team = "b", ein, aus, x, y, anker, seite = "links" }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = M.zeit(aus);
    this.x = x; this.y = y; this.anker = anker; this.seite = seite;
    this.e = el("div", `ms ta-label ${team}`, `${text}${klein ? `<small>${klein}</small>` : ""}`, M.hud.wurzel);
    this.svg = el("div", "", `<svg class="ta-linien" viewBox="0 0 1080 1920"><polyline fill="none" stroke="${team === "a" ? "#ffb37f" : "#8fc0ff"}" stroke-width="4"/><circle r="10" fill="${team === "a" ? "#ffb37f" : "#8fc0ff"}" stroke="#0a3270" stroke-width="4"/></svg>`, M.hud.wurzel).firstChild;
    this.linie = this.svg.querySelector("polyline");
    this.punkt = this.svg.querySelector("circle");
    this.w = this.e.offsetWidth; this.h = this.e.offsetHeight;
  }
  ereignisse() { return [{ t: this.ein, typ: "chip", klang: "pop", text: this.e.textContent }]; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.25;
    const v = an ? "visible" : "hidden";
    if (this.e.style.visibility !== v) { this.e.style.visibility = v; this.svg.style.visibility = v; }
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 3.4, daempfung: 0.4 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.25));
    const op = String(clamp((t - this.ein) / 0.06) * (1 - x));
    this.e.style.opacity = op;
    this.svg.style.opacity = op;
    this.e.style.transform = `translate(${this.x}px, ${this.y}px) scale(${(0.5 + 0.5 * s).toFixed(4)})`;
    this.e.style.transformOrigin = this.seite === "links" ? "0 50%" : "100% 50%";
    const a = this.anker(t);
    const kx = this.seite === "links" ? this.x + this.w : this.x;
    const ky = this.y + this.h / 2;
    const k = clamp((t - this.ein - 0.05) / 0.3);
    const ex = lerp(kx, a.x, ease.outCubic(k)), ey = lerp(ky, a.y, ease.outCubic(k));
    this.linie.setAttribute("points", `${kx},${ky} ${(kx + ex) / 2},${ky} ${ex},${ey}`);
    this.punkt.setAttribute("cx", ex); this.punkt.setAttribute("cy", ey);
    this.punkt.style.opacity = k > 0.9 ? "1" : "0";
  }
}

/** Etagen-Ergebnis (zweite Überraschung): je Etage ein Schild „Sieger“, kippt bei Zwischenhalten zur Treppe */
class EtagenTafel {
  constructor(M, { ein, aus, anker, flips = {} }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = M.zeit(aus);
    this.anker = anker;
    this.flips = Object.fromEntries(Object.entries(flips).map(([k, v]) => [k, M.zeit(v)]));
    this.schilder = [];
    for (let e = 1; e <= 7; e++) {
      const s = el("div", "ms ta-etage", "", M.hud.wurzel);
      this.schilder.push({ e, el: s, t0: this.ein + (e - 1) * 0.09, inhalt: "" });
    }
  }
  ereignisse() {
    const ev = this.schilder.map((s) => ({ t: s.t0, typ: "chip", klang: s.e === 1 ? "pop" : false, text: `Etage ${s.e}` }));
    for (const [k, t] of Object.entries(this.flips)) ev.push({ t, typ: "fuehrung", klang: "ding", text: `Etage ${k} kippt` });
    return ev;
  }
  update(t) {
    for (const s of this.schilder) {
      const an = t >= s.t0 && t <= this.aus + 0.25;
      const v = an ? "visible" : "hidden";
      if (s.el.style.visibility !== v) s.el.style.visibility = v;
      if (!an) continue;
      const flip = this.flips[s.e];
      const gekippt = flip !== undefined && t >= flip;
      const sieger = gekippt ? "treppe" : SIEGER_OHNE[s.e];
      const team = sieger === "treppe" ? "a" : "b";
      const inhalt = `<b>${s.e}.</b>${sieger === "treppe" ? "TREPPE" : "AUFZUG"}`;
      if (s.inhalt !== inhalt) { s.el.innerHTML = inhalt; s.el.className = `ms ta-etage ${team}`; s.inhalt = inhalt; }
      const p = this.anker(s.e, t);
      const pop = feder(t - s.t0, { frequenz: 3.2, daempfung: 0.42 });
      const raus = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.25));
      let sy = 1;
      if (flip !== undefined && t >= flip - 0.15 && t < flip + 0.35) sy = Math.abs(Math.cos(((t - flip + 0.15) / 0.5) * Math.PI));
      const bump = flip !== undefined && t >= flip ? Math.exp(-(t - flip) * 6) * Math.sin(clamp((t - flip) / 0.4) * Math.PI) : 0;
      const w = s.el.offsetWidth || 240;
      const x = clamp(p.x, SICHER.links, SICHER.rechts - w);
      s.el.style.transform = `translate(${x.toFixed(1)}px, ${(p.y - 33).toFixed(1)}px) scale(${((0.4 + 0.6 * pop) * (1 + 0.12 * bump)).toFixed(4)}, ${((0.4 + 0.6 * pop) * sy * (1 + 0.12 * bump)).toFixed(4)})`;
      s.el.style.opacity = String(clamp((t - s.t0) / 0.06) * (1 - raus));
    }
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new ComicBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "italic 900 70px 'SB Kursiv'", "700 27px 'SB Text'", "800 27px 'SB Text'", "800 27px 'SB Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  setzeKonturDicke(0.05);

  const W = baueComic();
  const BL = baueBlau();

  // ---------- Videozeit → Rennzeit τ (monotone kubische Interpolation über Wortzeiten) ----------
  const tLos = T("Los");
  const keys = [
    [0, 0], [tLos, 0],
    [T("rennen1:Erster"), treppeBei(E)],
    [T("rennen2:zweiter"), treppeBei(2 * E)],
    [T("rennen2:Tür"), P.WARTEZEIT],
    [T("Einsteigen."), P.WARTEZEIT + P.TUER_AUF],
    [T("rennen2:Tür#2"), P.WARTEZEIT + P.TUER_AUF + P.TUER_OFFEN_START],
    [T("fliegt"), P.WARTEZEIT + P.TUER_AUF + P.TUER_OFFEN_START + P.TUER_ZU + P.START_VERZUG],
    [T("rennen2:Erster,"), aufzugBei(E)],
    [T("rennen2:zweiter#2"), aufzugBei(2 * E)],
    [T("dritter"), aufzugBei(3 * E)],
    [T("Überholt!"), TAU_UEBERHOLT],
    [T("Aber"), AU.phasen.find((p) => p.art === "einfahren" && p.h0 === ZIEL * E).von],
    [T("wendung2:auf."), T_AUFZUG - P.JE_PERSON - P.TUER_AUF],
    [T("knapp."), T_TREPPE],
    [T("Endstand:"), (T_TREPPE + T_AUFZUG) / 2 + 0.2],
    [T("ergebnis:Treppe"), T_AUFZUG],
    [DAUER, T_AUFZUG + (DAUER - T("ergebnis:Treppe")) * 0.6],
  ];
  for (let i = 1; i < keys.length; i++) if (!(keys[i][0] > keys[i - 1][0]) || keys[i][1] < keys[i - 1][1]) throw new Error(`Zeitraffer nicht monoton bei Stützstelle ${i}: ${keys[i]}`);
  const tauRoh = (() => { // Fritsch–Carlson: monoton, ohne Überschwingen, weiche Tempowechsel
    const n = keys.length, xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
    const d = [], m = [];
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (d[i - 1] + d[i])) / ((2 * d[i] + d[i - 1]) / d[i - 1] + (d[i] + 2 * d[i - 1]) / d[i]) || 0;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
    }
    return (t) => {
      if (t <= xs[0]) return ys[0];
      if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]);
      let i = 0;
      while (t > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h;
      const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
      return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
    };
  })();
  const videoZeit = (tau) => { let a = tLos, b = DAUER; for (let k = 0; k < 44; k++) { const m = (a + b) / 2; if (tauRoh(m) < tau) a = m; else b = m; } return (a + b) / 2; };

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "TREPPE", farbe: TEAM_A, woerter: ["Treppe*"] },
      b: { name: "AUFZUG", farbe: TEAM_B, woerter: ["Aufzug*"] },
    },
    akzent: GELB, tinte: TINTE,
  });
  const tLoop = T("Was") - 0.2;
  M.schleife({ ab: tLoop, ende: ENDE });
  const tau = M.wert(tauRoh); // schleifenfest: in der Schleife spult das Rennen zurück zum Anfang

  // ---------- Anzeigetafel (Höhe in m, Renn-Uhr) ----------
  M.tafel({
    y: 166,
    links: { team: "a", einheit: "m", nk: 1, max: 14 },
    rechts: { team: "b", einheit: "m", nk: 1, max: 14 },
    werte: (t) => ({ a: wertTreppe(tauRoh(t)), b: wertAufzug(tauRoh(t)) }),
    anteil: (t) => ({ a: wertTreppe(tauRoh(t)) / (ZIEL * E), b: wertAufzug(tauRoh(t)) / (ZIEL * E) }),
    uhr: { ein: "Los", zeit: (t) => Math.min(T_AUFZUG, Math.max(0, tauRoh(t))), format: (s) => `${Math.floor(s)}<small style="font-size:0.5em">,${Math.floor((s % 1) * 10)} s</small>` },
  });

  // ---------- Hook: Titel ----------
  M.titel({
    y: 372, groesse: 132, aus: "Bürohaus,-0.12",
    woerter: [
      { text: "TREPPE", ein: "Treppe+0.03", team: "a" }, { art: "vs", ein: "oder" }, { text: "AUFZUG", ein: "hook:Aufzug?", team: "b" },
      { umbruch: true },
      { text: "WER IST", ein: "Wer", art: "klein" }, { text: "SCHNELLER", ein: "schneller", art: "klein" }, { text: "OBEN?", ein: "oben?", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips ----------
  M.chips({ y: 380, ausrichtung: "mitte", aus: "Klar,-0.1", liste: [
    { text: "BÜROHAUS", ein: "Bürohaus,", art: "dunkel", gross: true },
    { text: "ZIEL: 4. STOCK", ein: "vierter", art: "voll", team: "akzent", gross: true },
  ] });
  M.chips({ y: 500, ausrichtung: "mitte", aus: "Klar,-0.1", liste: [
    { text: "14 M HOCH", ein: "Stock.", art: "hell", team: "akzent" },
    { text: "GLEICHER START", ein: "gleicher", art: "hell", team: "akzent" },
  ] });
  M.chips({ y: 600, ausrichtung: "mitte", aus: "Klar,-0.1", liste: [
    { text: "TREPPE", ein: "regeln:Treppe.", art: "voll", team: "a", gross: true },
    { text: "AUFZUG", ein: "regeln:Aufzug.", art: "voll", team: "b", gross: true },
  ] });

  // ---------- Denkfalle: KLAR! – Tempo-Formel – ODER? ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "Klar,", x: 330, y: 470, winkel: -8, farbe: "akzent", groesse: 120 });
  M.formel({
    y: 620, aus: "Los-0.1", titel: "Tempo nach oben",
    teile: [
      { text: "1,6", einheit: "m/s", ein: "fünfmal", team: "b" },
      { text: "vs", ein: "fünfmal+0.18", art: "op" },
      { text: "0,3", einheit: "m/s", ein: "so", team: "a" },
      { text: "≈ 5×", ein: "schnell.", art: "erg" },
    ],
  });
  const sOder = M.stempel({ text: "ODER?", ein: "falle:Oder?", aus: "Los-0.06", x: 640, y: 470, winkel: 7, farbe: "weiss", textFarbe: "tinte", groesse: 120 });
  const sLos = M.stempel({ text: "LOS GEHT'S!", ein: "Los", aus: "rennen1:Treppe", x: 492, y: 520, winkel: -5, farbe: "#19B36B", groesse: 116 });

  // ---------- Projektion für 3D-Anker ----------
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.5, 400);
  const bild = (p, k = kamera) => { const v = new THREE.Vector3(...p).project(k); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920 }; };
  let regie; // unten
  const anComic = (p, dx = 0, dy = 0) => (t) => { regie.anwenden(t); const q = bild(typeof p === "function" ? p(t) : p); return { x: q.x + dx, y: q.y + dy }; };
  const kopfTreppe = (t) => { const l = laeufer(tau(t)); return [l.pos[0], l.pos[1] + 2.3, l.pos[2]]; };
  const kabinePunkt = (t) => [G.kabX, kabine(tau(t)).h + G.kabH + 0.4, G.zA1];

  // ---------- Rennen: Live-Zähler, Ringe, Chips, Stempel ----------
  const tFliegt = T("fliegt");
  M.zaehler({ ein: "rennen1:Treppe", aus: "Endstand:-0.1", wert: (t) => Math.min(80, Math.floor(wertTreppe(tauRoh(t)) / STEIG + 1e-6)), einheit: "Stufen", max: 80, team: "a", art: "voll", punkt: anComic(kopfTreppe, 0, -40) });
  /** Ring-Zähler an die Rennzeit koppeln: Fortschritt = (τ − τ0) / (τ1 − τ0) statt linear in der Videozeit */
  const ringNachTau = (r, tau0, tau1) => {
    const orig = r.update.bind(r);
    r.update = (t) => {
      let tt = t;
      if (t >= r.ein + 0.1 && t <= r.ein + r.dauer) tt = r.ein + 0.1 + clamp((tauRoh(t) - tau0) / (tau1 - tau0)) * (r.dauer - 0.1);
      orig(tt < r.ein + 0.1 && t >= r.ein + 0.1 ? r.ein + 0.1 : tt);
    };
    return r;
  };
  const ringWarten = M.ring({ ein: "rennen1:Treppe+0.05", dauer: Math.max(0.6, T("rennen2:Tür") - T("rennen1:Treppe+0.05")), von: 0, bis: P.WARTEZEIT, label: "WARTEN", ende: "TÜR AUF", team: "b", groesse: 150,
    aus: T("rennen2:Nach"), x: 850, y: 470 });
  M.chip({ text: "1. STOCK · 9,9 S", ein: "rennen1:Erster", aus: "Folg-0.1", art: "voll", team: "a", x: SICHER.links, y: 360 });
  const sNoch = M.stempel({ text: "NOCH NICHT DA!", ein: "wendung1:da.", aus: "rennen2:Treppe", x: 450, y: 660, winkel: 6, farbe: "b", groesse: 92 });
  M.chip({ text: "2. STOCK · 21,5 S", ein: "rennen2:zweiter", aus: "Einsteigen.-0.1", art: "voll", team: "a", x: SICHER.links, y: 360 });
  M.chip({ text: `${P.WARTEZEIT} S GEWARTET`, ein: "rennen2:25", aus: "fliegt-0.2", art: "voll", team: "b", x: SICHER.rechts, y: 360, anker: "rechts" });
  ringNachTau(ringWarten, 0, P.WARTEZEIT);
  const ringZu = M.ring({ ein: "rennen2:Tür#2", dauer: Math.max(0.5, tFliegt - T("rennen2:Tür#2") - 0.1), von: P.TUER_ZU, bis: 0, label: "TÜR ZU", ende: "LOS", team: "b", groesse: 130, aus: tFliegt + 0.4,
    punkt: anComic([G.kabX, 1.2, G.zA1], 0, -260) });
  ringNachTau(ringZu, P.WARTEZEIT + P.TUER_AUF + P.TUER_OFFEN_START, P.WARTEZEIT + P.TUER_AUF + P.TUER_OFFEN_START + P.TUER_ZU);
  M.zaehler({ ein: "fliegt", aus: "Aber+0.2", wert: (t) => Math.max(0, kabine(tauRoh(t)).v), nk: 1, einheit: "m/s", max: 9, team: "b", art: "voll", punkt: anComic(kabinePunkt, 0, -30) });
  M.zaehler({ ein: "Vorsprung", aus: "Überholt!-0.05", wert: (t) => Math.max(0, wertTreppe(tauRoh(t)) - wertAufzug(tauRoh(t))), nk: 1, einheit: "m", max: 9, team: "a", art: "hell", label: "VORSPRUNG", x: 492, y: 395, minY: 300 });
  const sUe = M.stempel({ text: "ÜBERHOLT!", ein: "Überholt!-0.02", aus: "Aber-0.05", x: 540, y: 560, winkel: -8, art: "stempel", farbe: "b", groesse: 118 });
  const tOben = videoZeit(T_TREPPE);
  const ringAuf = M.ring({ ein: "Aber+0.1", dauer: Math.max(0.6, videoZeit(T_AUFZUG - P.JE_PERSON) - T("Aber") - 0.1), von: P.TUER_AUF, bis: 0, label: "TÜR AUF", ende: "AUSSTEIGEN", team: "b", groesse: 130, aus: T("Endstand:") - 0.05,
    punkt: anComic([G.kabX, ZIEL * E + 1.2, G.zA1], 60, -300) });
  ringNachTau(ringAuf, T_AUFZUG - P.JE_PERSON - P.TUER_AUF, T_AUFZUG - P.JE_PERSON);
  const sOben = M.stempel({ text: "OBEN!", ein: tOben, aus: T("Endstand:") - 0.05, x: 300, y: 560, winkel: -9, farbe: "a", groesse: 130 });
  M.melde({ t: tOben, typ: "wendung", klang: "ding" });

  // Etagen-Marken: Treppe bzw. Aufzug passiert eine Etage (Schild färbt sich, Tick)
  const passT = [], passA = [];
  for (let k = 1; k <= ZIEL; k++) {
    passT.push(treppeBei(k * E));
    passA.push(aufzugBei(k * E));
    M.melde({ t: videoZeit(treppeBei(k * E)), typ: "marke", klang: "tick", text: `Treppe ${k}. Stock` });
    M.melde({ t: videoZeit(aufzugBei(k * E)), typ: "marke", klang: "tick", text: `Aufzug ${k}. Stock` });
  }
  M.melde({ t: videoZeit(P.WARTEZEIT), typ: "tuer", klang: "ding", text: "Tür auf (EG)" });

  // ---------- Folgen-Aufruf ----------
  M.folgen({ ein: "Folg", dauer: 1.8, y: 950, team: "b" });

  // ---------- Ergebnis: Bilanzkarte ----------
  M.bilanz({
    y: 380, ein: "Endstand:", aus: "Warum?-0.12", titel: "Endstand · 4. Stock",
    zeilen: [
      { label: "TREPPE", wert: +T_TREPPE.toFixed(1), nk: 1, einheit: "s", team: "a", ein: "ergebnis:Treppe" },
      { label: "AUFZUG", wert: +T_AUFZUG.toFixed(1), nk: 1, einheit: "s", team: "b", ein: "ergebnis:Aufzug" },
    ],
    differenz: { label: "VORSPRUNG", wert: +(+T_AUFZUG.toFixed(1) - +T_TREPPE.toFixed(1)).toFixed(1), nk: 1, einheit: "s", ein: "drei" },
    sieger: { text: "TREPPE GEWINNT", team: "a", ein: "ergebnis:Treppe#2" },
  });

  // Zeit der Treppe als Chip über der Läuferin (bei „46“)
  const zeitT = M.chip({ text: `${(+T_TREPPE.toFixed(1)).toFixed(1).replace(".", ",")} S`, ein: "ergebnis:46", aus: "Warum?-0.15", art: "voll", team: "a", x: 0, y: 0, anker: "mitte" });
  {
    const upd = zeitT.update.bind(zeitT);
    zeitT.update = (t) => { if (t >= zeitT.ein - 0.01 && t <= zeitT.aus + 0.3) { regie.anwenden(t); const l = laeufer(tau(t)); const p = bild([l.pos[0], l.pos[1] + 2.9, l.pos[2]]); zeitT.x = clamp(p.x, SICHER.links + zeitT.breite / 2, SICHER.rechts - zeitT.breite / 2); zeitT.y = Math.max(940, p.y - 40); } upd(t); };
  }
  // Aufzug kommt zu spät: Chip an der Person im Aufzug (folgt der Kamera)
  const spaet = M.chip({ text: `+${(+T_AUFZUG.toFixed(1) - +T_TREPPE.toFixed(1)).toFixed(1).replace(".", ",")} S`, ein: "ergebnis:49.", aus: "Warum?-0.15", art: "voll", team: "b", x: 0, y: 0, anker: "mitte" });
  {
    const upd = spaet.update.bind(spaet);
    spaet.update = (t) => { if (t >= spaet.ein - 0.01 && t <= spaet.aus + 0.3) { regie.anwenden(t); const f = fahrgast(tau(t)); const p = bild([f.pos[0], f.pos[1] + 2.75, f.pos[2]]); spaet.x = clamp(p.x, SICHER.links + spaet.breite / 2, SICHER.rechts - spaet.breite / 2); spaet.y = Math.max(940, p.y - 40); } upd(t); };
  }

  // ---------- Warum? Aufschlüsselung (2 Faktoren) + Blaupause-Beschriftungen ----------
  M.balken({
    y: 360, ein: "Warum?-0.05", aus: "Und-0.4", titel: "Warum?", max: 48,
    faktoren: [
      { label: "IN BEWEGUNG", ein: "fährt", a: { wert: +T_TREPPE.toFixed(1), text: `${T_TREPPE.toFixed(1).replace(".", ",")} s` }, b: { wert: +FAHRZEIT.toFixed(1), text: `${FAHRZEIT.toFixed(1).replace(".", ",")} s` }, tag: "NUR 11 S", tagEin: "warum:11" },
      { label: "STILLSTAND", ein: "warum:38", a: { wert: 0, text: "0 s" }, b: { wert: +STANDZEIT.toFixed(1), text: `${Math.round(STANDZEIT)} s` }, tag: "WARTEN + TÜREN", tagEin: "still." },
    ],
  });
  const kamBlau = new THREE.PerspectiveCamera(24, 1080 / 1920, 0.5, 400);
  let regieBlau;
  const anBlau = (p) => (t) => { regieBlau.anwenden(t); return bild(typeof p === "function" ? p(t) : p, kamBlau); };
  const bAus = T("Und") - 0.4;
  hud.add(new Beschriftung(M, { text: "Fahrt", klein: "14 m in 10,8 s", team: "b", ein: "fährt+0.1", aus: bAus, x: 700, y: 820, seite: "rechts", anker: anBlau([G.xA1 + 0.55, 5.2, G.zV]) }));
  hud.add(new Beschriftung(M, { text: "Warten", klein: "25 s", team: "b", ein: "warum:Sekunden#2", aus: bAus, x: 70, y: 860, anker: anBlau([(G.xS1 + G.xK1) / 2, 1.3, G.zV]) }));
  hud.add(new Beschriftung(M, { text: "Türen", klein: "2,5 + 3 + 3 + 2,5 s", team: "b", ein: "steht", aus: bAus, x: 610, y: 1010, seite: "rechts", anker: anBlau([G.kabX + 0.3, 1.5, G.kabZ + G.kabT / 2]) }));
  hud.add(new Beschriftung(M, { text: "Rest", klein: "Anfahren + Aussteigen 2 s", team: "b", ein: "still.", aus: bAus, x: 610, y: 1150, seite: "rechts", anker: anBlau([LOBBY[0], 1.4, LOBBY[2]]) }));
  hud.add(new Beschriftung(M, { text: "Treppe", klein: "0 s Pause", team: "a", ein: "warum:Treppe", aus: bAus, x: 70, y: 1040, anker: anBlau((t) => { const p = BL.figA.position; return [p.x, p.y + 2.0, p.z]; }) }));

  // ---------- Zweite Überraschung: Etagen-Ergebnis, Zwischenhalte ----------
  const tUnd = T("Und");
  const kamZiel = (e) => [G.xR1 + 0.3, e * E + 1.75, G.zV];
  hud.add(new EtagenTafel(M, {
    ein: "Verrückte:", aus: "merksatz:Die-0.1",
    anker: (e, t) => { regie.anwenden(t); return bild(kamZiel(e)); },
    flips: { 5: "ueberraschung:gewinnt", 6: "ueberraschung:sechsten" },
  }));
  M.chip({ text: "HALT", ein: "zweimal", aus: "merksatz:Die-0.1", art: "voll", team: "b", x: 0, y: 0, anker: "mitte" });
  const halt1 = hud.teile[hud.teile.length - 1];
  M.chip({ text: "HALT", ein: "zweimal+0.25", aus: "merksatz:Die-0.1", art: "voll", team: "b", x: 0, y: 0, anker: "mitte" });
  const halt2 = hud.teile[hud.teile.length - 1];
  const sKnapp = M.stempel({ text: "BIS 6. STOCK!", ein: "ueberraschung:sechsten", aus: "merksatz:Die-0.1", x: 400, y: 470, winkel: -6, farbe: "a", groesse: 100 });

  // ---------- Merksatz: Pointe ----------
  M.pointe({ text: "DIE TREPPE | *WARTET* *NIE.*", ein: "merksatz:Die", takt: 0.16, aus: "merksatz:Der-0.1", y: 390, groesse: 150 });
  M.pointe({ text: "DER AUFZUG | *FAST* *IMMER.*", ein: "merksatz:Der", takt: 0.16, aus: "Was-0.15", y: 390, groesse: 150, klang: "pop" });

  // ---------- Untertitel: Wort für Wort (Stil „kontur“), Teamwörter in Teamfarbe ----------
  const ut = M.untertitel({ stil: "kontur", groesse: 70, versteckt: [[T("Kommentare.>") + 0.5, DAUER + 1]] });
  for (const b of ut.bloecke) for (const w of b.woerter) {
    const n = normalisiere(w.wort);
    if (n.startsWith("treppe")) w.el.style.setProperty("--wf", TEAM_A);
    else if (n.startsWith("aufzug")) w.el.style.setProperty("--wf", TEAM_B);
  }

  // =====================================================================================
  // Kamera-Regie (Comic): Einstellungen mit weichen Übergängen
  // =====================================================================================
  const OBEN_PX = 820; // Mitte des freien Bildbereichs (zwischen Tafel und Untertitel)
  const zustand = ({ x, y, h, az = 0.2, el: elev = 0.08, fov = 30, px = OBEN_PX }) => {
    const yc = y + ((px - 960) / 1920) * h; // Aktion bei px (Bild-y) statt in der Mitte
    const d = h / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    return { pos: [x + Math.sin(az) * Math.cos(elev) * d, yc + Math.sin(elev) * d, Math.cos(az) * Math.cos(elev) * d], ziel: [x, yc, 0], fov };
  };
  const rennenZustand = (t) => {
    const l = laeufer(tau(t)), kab = kabine(tau(t));
    const yT = l.pos[1] + 1.1, yA = kab.h + 1.2;
    const h = clamp(Math.abs(yT - yA) + 12.5, 18, 25);
    return zustand({ x: -1.15, y: (yT + yA) / 2, h, az: 0.14, el: 0.07 });
  };
  const einstellungen = [
    { t: 0, d: 0, z: (t) => { const k = ease.inOutSine(fortschritt(t, 0, 4.2)); return zustand({ x: -1.2 - 0.3 * k, y: 0, h: 25 - 2.5 * k, az: 0.22 - 0.05 * k, el: 0.06, px: 1185 }); } },
    { t: T("vierter") - 0.15, d: 0.7, z: () => zustand({ x: -1.5, y: ZIEL * E + 1.7, h: 15, az: 0.12, el: 0.04 }) },
    { t: T("Zwei") - 0.1, d: 0.7, z: (t) => zustand({ x: -1.7, y: 1.4, h: 13.5 - 0.6 * fortschritt(t, T("Zwei"), T("Einer")), az: 0.2, el: 0.06, px: 900 }) },
    { t: T("regeln:Einer") - 0.05, d: 0.55, z: () => zustand({ x: -4.5, y: 1.3, h: 8.5, az: 0.3, el: 0.05, px: 940 }) },
    { t: T("regeln:Einer#2") - 0.05, d: 0.55, z: () => zustand({ x: 0.7, y: 1.3, h: 8.5, az: -0.1, el: 0.05, px: 940 }) },
    { t: T("Klar,") - 0.05, d: 0.7, z: (t) => zustand({ x: -1.2, y: 6.5, h: 25 - 1.5 * fortschritt(t, T("Klar,"), tLos), az: 0.2, el: 0.06, px: 1010 }) },
    { t: tLos - 0.05, d: 0.8, z: rennenZustand },
    { t: T("rennen2:Tür") - 0.25, d: 0.6, z: () => zustand({ x: 0.3, y: 2.6, h: 12, az: 0.0, el: 0.08, px: 900 }) },
    { t: tFliegt - 0.2, d: 0.9, z: rennenZustand },
    { t: T("Aber") - 0.1, d: 0.7, z: (t) => zustand({ x: -1.55, y: ZIEL * E + 1.3, h: 16 - 1.2 * fortschritt(t, T("Aber"), T("Endstand:")), az: 0.1 - 0.06 * fortschritt(t, T("Aber"), T("Endstand:")), el: 0.05, px: 900 }) },
    { t: T("Endstand:") - 0.05, d: 0.8, z: (t) => zustand({ x: -1.95, y: ZIEL * E + 1.2, h: 15.2, az: 0.3 - 0.45 * fortschritt(t, T("Endstand:"), T("Warum?")), el: 0.12, px: 1130 }) },
    { t: tUnd - 0.45, d: 0.01, z: (t) => zustand({ x: 2.4, y: 15.5, h: 46 - 2 * fortschritt(t, tUnd, T("merksatz:Die")), az: 0.12, el: 0.05, px: 830 }) },
    { t: T("merksatz:Die") - 0.15, d: 0.7, z: (t) => zustand({ x: -4.3, y: ZIEL * E + 1.1, h: 9.5 - 0.6 * fortschritt(t, T("merksatz:Die"), T("merksatz:Der")), az: 0.35, el: 0.08, px: 1170 }) },
    { t: T("merksatz:Der") - 0.1, d: 0.6, z: (t) => zustand({ x: 1.4, y: ZIEL * E + 1.1, h: 9.5 - 0.6 * fortschritt(t, T("merksatz:Der"), tLoop), az: -0.15, el: 0.08, px: 1170 }) },
  ];
  const basis = (t) => {
    let i = 0;
    for (let k = 0; k < einstellungen.length; k++) if (t >= einstellungen[k].t) i = k;
    const e = einstellungen[i];
    const z = e.z(t);
    if (i === 0 || e.d <= 0.02) return z;
    const k = ease.inOutCubic(fortschritt(t, e.t, e.t + e.d));
    if (k >= 1) return z;
    const v = einstellungen[i - 1].z(t);
    return { pos: v.pos.map((a, j) => lerp(a, z.pos[j], k)), ziel: v.ziel.map((a, j) => lerp(a, z.ziel[j], k)), fov: lerp(v.fov, z.fov, k) };
  };
  regie = new Regie(kamera, basis, { zp });
  for (const e of einstellungen.slice(1)) if (e.d > 0.05) M.melde({ t: e.t, typ: "kamera", art: "einstellung", dauer: e.d, klang: false });
  for (const s of [sKlar, sOder, sLos, sNoch, sUe, sOben, sKnapp]) regie.stoss({ t: s.ein + 0.1, staerke: 0.8 });
  regie.zoom({ t: "rennen1:Erster", ziel: (t) => kopfTreppe(t), staerke: 0.12, halt: 0.5, rueck: 0.5 });
  regie.zoom({ t: "dritter", ziel: (t) => kabinePunkt(t), staerke: 0.12, halt: 0.5, rueck: 0.4 });
  regie.atmen({ staerke: 0.012, tempo: 0.35 });
  regie.schleife({ ab: tLoop, ende: ENDE });

  // Halt-Chips an Schacht (Etage 2 und 3), folgen der Kamera
  for (const [c, e] of [[halt1, 2], [halt2, 3]]) {
    const upd = c.update.bind(c);
    c.update = (t) => { if (t >= c.ein - 0.01 && t <= c.aus + 0.3) { regie.anwenden(t); const p = bild([G.kabX, e * E + 1.3, G.zV]); c.x = p.x; c.y = p.y - 39; } upd(t); };
  }

  // =====================================================================================
  // Welten aktualisieren
  // =====================================================================================
  const knopfAn = T("regeln:ruft");
  const setzeComic = (t) => {
    const ta = tau(t);
    const l = laeufer(ta);
    const jubel = l.jubel || 0;
    setzeFigur(W.treppe, { pos: l.pos, richtung: l.richtung, phase: l.phase, lauf: l.lauf, steigen: l.steigen,
      huepf: jubel > 0 ? Math.abs(Math.sin(jubel * 4.2)) * 0.45 : 0, winken: jubel > 0 ? 1 : t < tLos && t > T("regeln:Treppe.") - 0.3 && t < T("regeln:Einer#2") ? 0.6 : 0, neigung: jubel > 0 ? -0.05 : null });
    // Jubel: beide Arme hoch
    if (jubel > 0) { const w = 0.15 * Math.sin(jubel * 8.4); W.treppe.userData.armL.rotation.z = -2.55 + w; W.treppe.userData.armR.rotation.z = 2.55 - w; W.treppe.userData.armL.rotation.x = 0; W.treppe.userData.armR.rotation.x = 0; }
    W.markeA.position.set(l.pos[0], l.pos[1] + 0.03, l.pos[2]);
    const f = fahrgast(ta);
    const winkt = t > knopfAn - 0.2 && t < tLos + 0.3 ? 1 : 0;
    setzeFigur(W.fahr, { pos: f.pos, richtung: winkt ? -0.9 : f.richtung, phase: f.phase + (winkt ? t * 1.5 : 0), lauf: f.lauf || 0, huepf: f.huepf || 0, winken: winkt * 0.7 });
    if (f.schulter > 0) { const s = Math.sin(clamp(f.schulter / 0.6) * Math.PI); W.fahr.userData.armL.rotation.z = -0.3 - 0.9 * s; W.fahr.userData.armR.rotation.z = 0.3 + 0.9 * s; }
    W.markeB.position.set(f.pos[0], f.pos[1] + 0.03, f.pos[2]);
    W.banner.visible = t < T("Endstand:") || t >= tLoop;
    // Kabine, Türen, Seil, Gegengewicht, Tempostriche
    const kab = kabine(ta);
    W.kab.position.set(G.kabX, kab.h, G.kabZ);
    for (const d of W.tueren) d.g.position.x = d.s * (G.kabB / 4 + kab.tuer * (G.kabB / 2 - 0.12));
    const seilOben = DACH + 0.4, seilUnten = kab.h + G.kabH + 0.3;
    W.seil.scale.y = Math.max(0.01, seilOben - seilUnten);
    W.seil.position.set(G.kabX, (seilOben + seilUnten) / 2, G.kabZ);
    const gy = DACH - 2 - kab.h;
    W.gegen.position.y = gy;
    W.seil2.scale.y = Math.max(0.01, seilOben - gy - 0.8);
    W.seil2.position.set(G.xA1 - 0.55, (seilOben + gy + 0.8) / 2, G.zA0 + 0.3);
    W.strichMat.opacity = clamp(Math.abs(kab.v) / 1.6) * 0.85 * (kab.v > 0 ? 1 : 0.6);
    W.kab.children[W.kab.children.length - 1].scale.y = kab.v >= 0 ? 1 : -1;
    // Rufknopf EG leuchtet ab „ruft“ bis die Tür aufgeht; Etagenschilder färben sich beim Passieren
    const knopf = (t >= knopfAn && t < tLoop && ta < P.WARTEZEIT + 0.5) ? (t < tLos ? 0.5 + 0.5 * Math.sin((t - knopfAn) * 18) : 1) : 0;
    W.knoepfe[0].color.set(knopf > 0.5 ? GELB : "#3A4152");
    for (const s of W.schilderT) s.m.map = s.k > 0 && wertTreppe(ta) >= s.k * E - 1e-6 ? s.tx.a : s.k === ZIEL ? s.tx.ziel : s.tx.neutral;
    for (const s of W.schilderK) s.m.map = s.k > 0 && ta >= 34 && AU.hoehe(ta) >= s.k * E - 1e-6 ? s.tx.b : s.k === ZIEL ? s.tx.ziel : s.tx.neutral;
  };
  const weltComic = {
    szene: W.szene, kamera, post: { vignette: 0.16, koernung: 0.01 },
    update(t) { setzeComic(t); regie.anwenden(t); },
  };

  // Blaupause: Kamera vor dem Kern, langsame Fahrt; Kabine fährt bei „fährt“ kurz hoch und wieder runter (Fahrt 14 m)
  const tWarum = T("Warum?");
  regieBlau = new Regie(kamBlau, (t) => {
    const k = fortschritt(t, tWarum - 0.4, tUnd);
    const zz = zustand({ x: -0.6 + 0.5 * k, y: 2.2, h: 13 - 1.6 * ease.inOutSine(k), az: 0.32 - 0.28 * ease.inOutSine(k), el: 0.1, fov: 24, px: 1040 });
    return zz;
  }, { zp });
  regieBlau.atmen({ staerke: 0.01, tempo: 0.3 });
  M.melde({ t: tWarum, typ: "kamera", art: "fahrt", dauer: tUnd - tWarum, klang: false });
  const tFaehrt = T("fährt");
  const weltBlau = {
    szene: BL.szene, kamera: kamBlau, post: { vignette: 0.2, koernung: 0.008 },
    update(t) {
      // Kabine: fährt bei „fährt“ 14 m hoch (aus dem Bild) und steht ab „38“ wieder unten mit offenen Türen
      const hoch = fortschritt(t, tFaehrt, tFaehrt + 1.4), runter = fortschritt(t, T("warum:38") - 0.5, T("warum:38") + 0.2);
      const h = ZIEL * E * (ease.inOutCubic(hoch) * (1 - ease.inOutCubic(runter)));
      BL.kab.position.y = h;
      const offen = fortschritt(t, T("steht"), T("steht") + 0.5);
      BL.tuerBlau.forEach((d, i) => { d.position.x = (i ? 1 : -1) * (G.kabB / 4 + ease.inOutSine(offen) * (G.kabB / 2 - 0.12)); });
      BL.mass.scale.y = Math.max(0.001, ease.outCubic(fortschritt(t, tFaehrt, tFaehrt + 0.8)));
      // Treppenläufer (Umriss) läuft ohne Pause
      const lauf = 0.3 + (t - tWarum) * 1.25;
      const l = laeufer(lauf);
      BL.figA.position.set(l.pos[0], l.pos[1], l.pos[2]);
      BL.figA.rotation.y = l.richtung;
      regieBlau.anwenden(t);
    },
  };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltComic);
  zl.shot(tWarum - 0.15, weltBlau, { typ: "wisch", dauer: 0.5, richtung: [1, -0.35], farbe1: "#8fc0ff", farbe2: "#0a3270" });
  zl.shot(tUnd - 0.1, weltComic, { typ: "wisch", dauer: 0.5, richtung: [-1, 0.35], farbe1: GELB, farbe2: TINTE });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, tLos + 1, tWarum + 1, tUnd + 1]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = { T_TREPPE, T_AUFZUG, TAU_UEBERHOLT, FAHRZEIT, STANDZEIT, BE_OHNE, BE_HALTE, SIEGER_OHNE, SIEGER_HALTE, keys };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
