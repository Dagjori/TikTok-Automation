// „200 € mehr Gehalt oder 100 € steuerfrei: Was bringt dir netto mehr?“ – Stil 14 Glas-Labor (Three.js).
// Geld ist Flüssigkeit: Brutto fließt in zwei Messzylinder, Sozialkassen und Finanzamt zapfen aus dem Gehalt-Glas ab
// (Becherglas mit Schichten), das steuerfreie Glas bleibt voll. Füllstand = Live-Zähler (Tafel oben).
// Zahlen: pipeline/sim/gehalt_steuerfrei.mjs (Netto-Modul 2026). Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { HUD, el, fmt } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes, schleifenWert } from "../../engine/bewegung.js";
import { baueStudio, Messzylinder, Becherglas, Strahl, rohr, kontaktFleck } from "../../engine/stil_glas.js";
import { videoZahlen } from "../../sim/gehalt_steuerfrei.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.35;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Flüssigkeit, Tafel, Chips, Karten)
const BLAU = "#3D8BFF"; // GEHALT
const GELB = "#FFD23F"; // STEUERFREI
const KORALLE = "#FF5A5F"; // Akzent (Abzüge, Stempel)
const TINTE = "#1B1F33";
// Schichten im Abzugsglas
const SCHICHTEN = [
  { id: "rv", farbe: "#8C7BFF" },
  { id: "kv", farbe: "#22C3B0" },
  { id: "pv", farbe: "#FF8FB6" },
  { id: "av", farbe: "#FFB04A" },
  { id: "lst", farbe: "#FF5A5F" },
];
const euro = (v, nk = 2) => `${fmt.zahl(v, nk)} €`;

// =====================================================================================
// HUD-Etikett an einem 3D-Punkt (Chip, der mit der Kamera mitwandert), meldet sich wie ein Chip im Protokoll
// =====================================================================================
class Etikett {
  constructor(M, { html, art = "voll", farbe = "akzent", ein, aus = Infinity, punkt, anker = "links", dx = 0, dy = 0, gross = false, klang = "pop", winkel = 0 }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = aus === Infinity ? Infinity : M.zeit(aus);
    this.punkt = punkt;
    this.anker = anker;
    this.dx = dx;
    this.dy = dy;
    this.winkel = winkel;
    this.e = el("div", "ms gl-etikett", "", M.hud.wurzel);
    this.chip = el("div", `ms-chip ${art} ${gross ? "gross" : ""}`, `<i></i><span>${html}</span>`, this.e);
    M.setzeFarbe(this.chip, farbe);
    this.b = this.chip.offsetWidth;
    this.h = this.chip.offsetHeight;
    this.klang = klang;
    this.text = String(html).replace(/<[^>]+>/g, "");
  }
  ereignisse() {
    return [{ t: this.ein, typ: "chip", klang: this.klang, text: this.text }];
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.22;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 3.4, daempfung: 0.36 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.22));
    const p = this.punkt(t);
    let left = p.x + this.dx - (this.anker === "mitte" ? this.b / 2 : this.anker === "rechts" ? this.b : 0);
    left = clamp(left, SICHER.links, SICHER.rechts - this.b);
    const top = clamp(p.y + this.dy - this.h / 2, SICHER.oben + 160, SICHER.unten - 260);
    this.e.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - s) * 24 - x * 16).toFixed(1)}px) scale(${((0.3 + 0.7 * s) * (1 - 0.35 * x)).toFixed(4)}) rotate(${(this.winkel + (1 - s) * -8).toFixed(2)}deg)`;
    this.e.style.opacity = String(clamp((t - this.ein) / 0.06) * (1 - x));
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
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 1.0 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  buehne.renderer.shadowMap.type = THREE.VSMShadowMap;
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const Z = videoZahlen();
  const B = Z.basis, H = Z.hoch;
  const ab = Object.fromEntries(B.abzuege.map((a) => [a.id, a]));

  // =====================================================================================
  // Welt
  // =====================================================================================
  const szene = new THREE.Scene();
  const studio = baueStudio(szene, buehne.renderer, { farbe: "#C2BBD3", boden: "#D4CFE0", schatten: SCHATTEN, umgebungsStaerke: 0.85 });
  const X_G = -1.05, X_S = 1.55, X_B = -3.95; // Gehalt, Steuerfrei, Becherglas (Abzüge)
  const SOCKEL = 0.9;
  // Laborsockel (weiß, abgerundet)
  const sockelM = new THREE.MeshPhysicalMaterial({ color: "#EEEBF4", roughness: 0.45, clearcoat: 0.25, envMapIntensity: 0.45 });
  for (const x of [X_G, X_S]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(2.1, SOCKEL, 2.1, 1, 1, 1), sockelM);
    s.position.set(x, SOCKEL / 2, 0);
    s.castShadow = true;
    s.receiveShadow = true;
    szene.add(s);
    const kante = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.05, 2.14), new THREE.MeshPhysicalMaterial({ color: "#DCD8E6", roughness: 0.5 }));
    kante.position.set(x, SOCKEL - 0.025, 0);
    szene.add(kante);
    const fleck = kontaktFleck(1.7, 0.3);
    fleck.position.set(x, 0.004, 0.1);
    szene.add(fleck);
  }
  const zylG = new Messzylinder({ x: X_G, radius: 0.78, hoehe: 4.3, max: 200, fuellHoehe: 3.5, farbe: "#2D6EEB", fluessigKante: "#0A2466", seed: 2 });
  const zylS = new Messzylinder({ x: X_S, radius: 0.78, hoehe: 4.3, max: 200, fuellHoehe: 3.5, farbe: "#FFC117", fluessigKante: "#8A5A00", seed: 5 });
  for (const z of [zylG, zylS]) {
    z.gruppe.position.y = SOCKEL;
    z.gruppe.traverse((o) => { if (o.isMesh && o.material && o.material.transmission) o.castShadow = false; });
    szene.add(z.gruppe);
    const fleck = kontaktFleck(1.2, 0.25);
    fleck.position.set(z.gruppe.position.x, SOCKEL + 0.006, 0);
    szene.add(fleck);
  }
  const becher = new Becherglas({ x: X_B, radius: 1.12, hoehe: 1.3, schichten: SCHICHTEN, proEinheit: 0.0112 });
  szene.add(becher.gruppe);
  const fleckB = kontaktFleck(1.4, 0.3);
  fleckB.position.set(X_B, 0.004, 0);
  szene.add(fleckB);
  // Zulauf-Rohre (Schwanenhals von hinten oben), Auslauf über der Mitte
  const Y_AUS = SOCKEL + 0.2 + 4.3 + 0.75;
  const zulaufG = rohr([[X_G + 0.2, 12, -3.4], [X_G + 0.1, Y_AUS + 1.6, -2.0], [X_G, Y_AUS + 0.75, -0.9], [X_G, Y_AUS + 0.25, -0.15], [X_G, Y_AUS, 0]]);
  const zulaufS = rohr([[X_S - 0.2, 12, -3.4], [X_S - 0.1, Y_AUS + 1.6, -2.0], [X_S, Y_AUS + 0.75, -0.9], [X_S, Y_AUS + 0.25, -0.15], [X_S, Y_AUS, 0]]);
  szene.add(zulaufG.gruppe, zulaufS.gruppe);
  // Ablauf: Hahn unten links am Gehalt-Glas → waagerecht → Auslauf über dem Becherglas
  const Y_HAHN = SOCKEL + 0.62;
  const ablauf = rohr([[X_G - 0.74, Y_HAHN, 0.25], [X_G - 1.3, Y_HAHN, 0.3], [X_B + 0.9, Y_HAHN + 0.02, 0.32], [X_B + 0.35, Y_HAHN + 0.02, 0.32], [X_B + 0.22, Y_HAHN - 0.12, 0.32], [X_B + 0.2, Y_HAHN - 0.2, 0.32]], { radius: 0.07 });
  szene.add(ablauf.gruppe);
  // Ventilrad am Hahn
  const rad = new THREE.Group();
  const radM = new THREE.MeshPhysicalMaterial({ color: KORALLE, roughness: 0.35, clearcoat: 0.6 });
  rad.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 32), radM));
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), radM);
    sp.rotation.z = (i / 3) * Math.PI;
    rad.add(sp);
  }
  rad.rotation.x = Math.PI / 2;
  const radStange = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 10), ablauf.material);
  radStange.position.set(X_G - 1.3, Y_HAHN + 0.15, 0.3);
  rad.position.set(X_G - 1.3, Y_HAHN + 0.32, 0.3);
  szene.add(rad, radStange);
  // Strahlen
  const strahlG = new Strahl({ farbe: BLAU, seed: 3 });
  const strahlS = new Strahl({ farbe: GELB, seed: 7 });
  const strahlAb = new Strahl({ farbe: BLAU, radius: 0.045, seed: 11 });
  szene.add(strahlG.gruppe, strahlS.gruppe, strahlAb.gruppe);
  // Tropfen im Hook: beide Hähne tropfen schon (Bewegung ab Bild 1, Vorgeschmack auf das Rennen)
  const tropfenGeo = new THREE.SphereGeometry(0.055, 14, 10);
  const tropfen = [[zulaufG, "#2D6EEB", 0], [zulaufS, "#FFC117", 0.31]].map(([z, farbe, versatz]) => {
    const m = new THREE.Mesh(tropfenGeo, new THREE.MeshPhysicalMaterial({ color: farbe, roughness: 0.15, clearcoat: 1, emissive: new THREE.Color(farbe).multiplyScalar(0.2) }));
    m.visible = false;
    szene.add(m);
    return { m, spitze: z.spitze, versatz };
  });
  // Gleichstandslinie bei 100 € (gestrichelt, über beide Gläser)
  const linieC = document.createElement("canvas");
  linieC.width = 512; linieC.height = 16;
  const lg = linieC.getContext("2d");
  for (let i = 0; i < 16; i++) { lg.fillStyle = i % 2 ? "rgba(0,0,0,0)" : "#FFD23F"; lg.fillRect(i * 32, 0, 32, 16); }
  const linieT = new THREE.CanvasTexture(linieC);
  linieT.colorSpace = THREE.SRGBColorSpace;
  linieT.wrapS = THREE.RepeatWrapping;
  linieT.repeat.set(3, 1);
  const linie = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 0.05), new THREE.MeshBasicMaterial({ map: linieT, transparent: true, depthWrite: false, depthTest: false }));
  linie.position.set((X_G + X_S) / 2, zylG.yVon(100) + SOCKEL, 0.95);
  linie.renderOrder = 20;
  szene.add(linie);

  // =====================================================================================
  // Modell über die Zeit: Füllstände, Abzüge, Strahlen (alles an Wortzeiten)
  // =====================================================================================
  const tPourG = T("rennen:200") - 0.05, tPourS = T("rennen:100") - 0.05;
  const zuflussG = { start: tPourG, stopp: tPourG + 0.95 }, zuflussS = { start: tPourS, stopp: tPourS + 0.7 };
  const fallzeit = (h) => Math.sqrt((2 * h) / 98);
  // Füllkurven (Strahl muss erst ankommen)
  const ankunftG = tPourG + fallzeit(Y_AUS - (SOCKEL + zylG.y0));
  const ankunftS = tPourS + fallzeit(Y_AUS - (SOCKEL + zylS.y0));
  // Abzüge Sozialkassen: nacheinander ab „zapfen“
  const tZapf = T("rennen:zapfen");
  const sozFolge = [
    { id: "rv", t0: tZapf + 0.05, dauer: 0.5 },
    { id: "kv", t0: tZapf + 0.62, dauer: 0.5 },
    { id: "pv", t0: tZapf + 1.2, dauer: 0.36 },
    { id: "av", t0: tZapf + 1.66, dauer: 0.3 },
  ];
  // Lohnsteuer: fällt synchron zum Countdown „150, 130, 110“
  const tFin = T("wendung:Finanzamt.");
  const tLst0 = T("wendung:150") - 0.42;
  const lstKeys = [
    { t: tLst0, v: 0 },
    { t: T("wendung:150"), v: B.abzuege[3].rest - 150, e: ease.inOutSine },
    { t: T("wendung:130"), v: B.abzuege[3].rest - 130, e: ease.linear },
    { t: T("wendung:110"), v: B.abzuege[3].rest - 110, e: ease.linear },
    { t: T("wendung:110>") - 0.25, v: ab.lst.betrag, e: ease.outCubic },
  ];
  // Zweite Überraschung (5.500 €): zusätzliche Lohnsteuer bis 99,09 €
  const tHoch0 = T("ueberraschung:bleiben") - 0.1, tHoch1 = T("ueberraschung:99>") + 0.15;
  const lstExtra = H.steuern - B.steuern; // 10,66 €
  const tSchleife = T("schluss:Was") + 0.05;

  const abzugRoh = (t) => {
    const w = { rv: 0, kv: 0, pv: 0, av: 0, lst: 0 };
    for (const s of sozFolge) w[s.id] = ab[s.id].betrag * ease.inOutSine(fortschritt(t, s.t0, s.t0 + s.dauer));
    w.lst = t < tLst0 ? 0 : keyframes(lstKeys, t) + lstExtra * ease.inOutSine(fortschritt(t, tHoch0, tHoch1));
    return w;
  };
  const fuellRoh = (t) => {
    const zuG = 200 * ease.outCubic(fortschritt(t, ankunftG, zuflussG.stopp + fallzeit(1.5)));
    const zuS = 100 * ease.outCubic(fortschritt(t, ankunftS, zuflussS.stopp + fallzeit(2.4)));
    const w = abzugRoh(t);
    const weg = w.rv + w.kv + w.pv + w.av + w.lst;
    return { g: Math.max(0, zuG - weg), s: zuS, ...w };
  };
  // Schleifenfest (am Ende wieder leer wie im ersten Bild); nur Zahlen, damit alles weich zurückgleitet
  const schleifeOpt = { ab: tSchleife, ende: ENDE };
  const fuellFlach = schleifenWert((t) => fuellRoh(t), schleifeOpt);
  const fuell = (t) => { const f = fuellFlach(t); return { ...f, abzug: { rv: f.rv, kv: f.kv, pv: f.pv, av: f.av, lst: f.lst } }; };
  const fG = (t) => fuell(t).g, fS = (t) => fuell(t).s;
  // Abflussstrahl aktiv, solange etwas abläuft
  const abflussAn = (t) => {
    for (const s of sozFolge) if (t >= s.t0 - 0.05 && t <= s.t0 + s.dauer) return true;
    if (t >= tLst0 - 0.05 && t <= lstKeys[lstKeys.length - 1].t) return true;
    if (t >= tHoch0 - 0.05 && t <= tHoch1) return true;
    return false;
  };
  // Ventil öffnet/schließt (Drehung) – für die Hand am Rad
  const ventil = (t) => {
    let k = 0;
    const fenster = [[sozFolge[0].t0 - 0.2, sozFolge[3].t0 + sozFolge[3].dauer], [tLst0 - 0.2, lstKeys[lstKeys.length - 1].t], [tHoch0 - 0.2, tHoch1]];
    for (const [a, b] of fenster) k = Math.max(k, ease.inOutCubic(fortschritt(t, a, a + 0.3)) * (1 - ease.inOutCubic(fortschritt(t, b, b + 0.3))));
    return k;
  };

  // =====================================================================================
  // Kamera: Fahrten zwischen festen Einstellungen (Stichwörter), Zoom/Stoß über die Regie
  // =====================================================================================
  const kam = new THREE.PerspectiveCamera(28, 1080 / 1920, 0.1, 200);
  const E = {
    front: { pos: [0.25, 4.6, 22], ziel: [0.25, 2.6, 0], fov: 28 },
    hook: { pos: [0.25, 4.8, 21], ziel: [0.25, 2.75, 0], fov: 28 },
    links: { pos: [-2.0, 3.2, 16.5], ziel: [-3.0, 1.3, 0], fov: 28 },
    gehalt: { pos: [-0.4, 4.9, 17], ziel: [-1.2, 3.4, 0], fov: 28 },
    rechts: { pos: [2.4, 4.8, 17], ziel: [1.45, 3.2, 0], fov: 28 },
    ergebnis: { pos: [0.25, 5.8, 22], ziel: [0.25, 4.3, 0], fov: 28 },
    becher: { pos: [-3.1, 3.1, 15], ziel: [-3.7, 1.2, 0], fov: 28 },
    rente: { pos: [-1.4, 5.8, 21], ziel: [0.15, 3.6, 0], fov: 28 },
    schluss: { pos: [1.5, 5.2, 21.5], ziel: [0.2, 3.1, 0], fov: 28 },
  };
  const fahrten = [
    { t: 0, z: E.hook },
    { t: T("regeln:3.500") - 0.3, z: E.front, d: 1.2 },
    { t: T("rennen:zapfen") - 0.45, z: E.links, d: 0.9 },
    { t: T("wendung:Doch") - 0.1, z: E.gehalt, d: 0.8 },
    { t: T("wendung:Vorsprung") - 0.2, z: E.front, d: 0.8 },
    { t: T("knapp:Und") - 0.05, z: E.rechts, d: 0.75 },
    { t: T("knapp:knapp.") - 0.35, z: E.front, d: 0.6 },
    { t: T("ergebnis:Endstand:") - 0.2, z: E.ergebnis, d: 0.7 },
    { t: T("warum:Fast") - 0.25, z: E.becher, d: 0.9 },
    { t: T("ueberraschung:Und") - 0.1, z: E.ergebnis, d: 0.8 },
    { t: T("rente:Aber") - 0.05, z: E.rente, d: 1.2 },
    { t: T("merksatz:Brutto") - 0.1, z: E.schluss, d: 1.6 },
  ];
  const mix = (a, b, k) => ({ pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), ziel: a.ziel.map((v, i) => lerp(v, b.ziel[i], k)), fov: lerp(a.fov, b.fov, k) });
  const kamBasis = (t) => {
    let z = fahrten[0].z;
    for (let i = 1; i < fahrten.length; i++) {
      const f = fahrten[i];
      if (t < f.t) break;
      z = mix(z, f.z, ease.inOutCubic(fortschritt(t, f.t, f.t + f.d)));
    }
    // langsames Driften innerhalb jeder Einstellung (nichts steht still)
    const drift = Math.sin(t * 0.37) * 0.25;
    return { pos: [z.pos[0] + drift, z.pos[1] + Math.sin(t * 0.29) * 0.12, z.pos[2]], ziel: z.ziel, fov: z.fov };
  };
  const regie = new Regie(kam, kamBasis, { zp });
  regie.zoom({ t: "wendung:Finanzamt.", ziel: [X_G - 0.3, 2.6, 0], staerke: 0.18, halt: 0.9, rueck: 0.5 });
  regie.zoom({ t: "ueberraschung:99", ziel: [X_G, SOCKEL + zylG.yVon(99), 0], staerke: 0.22, halt: 1.0, rueck: 0.6 });
  regie.atmen({ staerke: 0.012, tempo: 0.5 });
  regie.schleife({ ab: tSchleife, ende: ENDE });
  const projiziere = (v, t) => {
    regie.anwenden(t);
    const p = v.clone().project(kam);
    return { x: ((p.x + 1) / 2) * 1080, y: ((1 - p.y) / 2) * 1920 };
  };

  // =====================================================================================
  // HUD und Bausteine
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "GEHALT", farbe: BLAU, woerter: ["Gehalt"] },
      b: { name: "STEUERFREI", farbe: GELB, woerter: ["steuerfrei*"] },
    },
    akzent: KORALLE,
    tinte: TINTE,
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  // Flüssigkeit: Zulauf und Abläufe hörbar machen (Blubbern, nur selbst erzeugte Klänge aus klang.py)
  M.melde({ t: ankunftG - 0.05, typ: "fluss", dauer: zuflussG.stopp - ankunftG + 0.3, klang: "blasen", text: "Zulauf Gehalt" });
  M.melde({ t: ankunftS - 0.05, typ: "fluss", dauer: zuflussS.stopp - ankunftS + 0.3, klang: "blasen", text: "Zulauf steuerfrei" });
  M.melde({ t: sozFolge[0].t0, typ: "fluss", dauer: sozFolge[3].t0 + sozFolge[3].dauer - sozFolge[0].t0, klang: "blasen", text: "Abzüge Sozialkassen" });
  M.melde({ t: tLst0, typ: "fluss", dauer: lstKeys[lstKeys.length - 1].t - tLst0, klang: "blasen", text: "Abzug Lohnsteuer" });
  M.melde({ t: tHoch0, typ: "fluss", dauer: tHoch1 - tHoch0, klang: "blasen", text: "Abzug Lohnsteuer 5.500 €" });
  // Kamerafahrten ins Protokoll (Bild-Ereignisse)
  fahrten.slice(1).forEach((f) => M.melde({ t: f.t, typ: "kamera", art: "fahrt", dauer: f.d, klang: "whoosh" }));

  // ---------- Anzeigetafel: Netto im Glas ----------
  M.tafel({
    y: 166,
    links: { team: "a", einheit: "€", nk: 2, max: 200 },
    rechts: { team: "b", einheit: "€", nk: 2, max: 200 },
    werte: (t) => ({ a: Math.round(fuellRoh(t).g * 100) / 100, b: Math.round(fuellRoh(t).s * 100) / 100 }),
    anteil: (t) => ({ a: fuellRoh(t).g / 200, b: fuellRoh(t).s / 200 }),
  });

  // ---------- Hook: Titel Wort für Wort ----------
  M.titel({
    y: 372, groesse: 120, aus: "regeln:3.500-0.12",
    woerter: [
      { text: "+200 €", ein: "hook:200+0.04", team: "a" }, { text: "GEHALT", ein: "hook:Gehalt-0.03", team: "a" },
      { umbruch: true },
      { text: "ODER", ein: "hook:oder-0.03", art: "klein" },
      { umbruch: true },
      { text: "+100 €", ein: "hook:100-0.03", team: "b" }, { text: "STEUERFREI", ein: "hook:steuerfrei?-0.03", team: "b" },
      { umbruch: true },
      { text: "WAS BLEIBT", ein: "hook:Was-0.03", art: "klein" }, { text: "DIR?", ein: "hook:dir-0.03", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips (synchron zum Wort) ----------
  M.chips({ y: 404, ausrichtung: "mitte", aus: "falle:Klar,-0.1", liste: [
    { text: "3.500 € BRUTTO", ein: "regeln:3.500-0.03", art: "dunkel", gross: true },
  ] });
  M.chips({ y: 524, ausrichtung: "mitte", aus: "falle:Klar,-0.1", liste: [
    { text: "STEUERKLASSE 1", ein: "regeln:3.500+0.45", art: "hell", team: "a" },
    { text: "KINDERLOS", ein: "regeln:brutto.", art: "hell", team: "a" },
  ] });
  // gelbe Extras direkt über dem steuerfreien Glas
  const ueberS = (w, dy = 0) => (t) => projiziere(new THREE.Vector3(X_S, SOCKEL + zylS.yVon(w), 0.8), t);
  hud.add(new Etikett(M, { html: "50 € GUTSCHEIN", art: "voll", farbe: "b", ein: "regeln:Gutschein-0.03", aus: "falle:Los-0.1", punkt: ueberS(150), anker: "mitte", dy: -60 }));
  hud.add(new Etikett(M, { html: "50 € JOBTICKET", art: "voll", farbe: "b", ein: "regeln:Jobticket.-0.03", aus: "falle:Los-0.1", punkt: ueberS(150), anker: "mitte", dy: 30 }));
  hud.add(new Etikett(M, { html: "STEUER- &amp; ABGABENFREI", art: "hell", farbe: "b", ein: "regeln:Jobticket.>+0.15", aus: "falle:Los-0.1", punkt: ueberS(150), anker: "mitte", dy: 120 }));
  hud.add(new Etikett(M, { html: "+200 € BRUTTO", art: "voll", farbe: "a", ein: "regeln:brutto.+0.25", aus: "falle:Klar,-0.1", punkt: (t) => projiziere(new THREE.Vector3(X_G, SOCKEL + zylG.yVon(150), 0.8), t), anker: "mitte", dy: 30 }));

  // ---------- Denkfalle und Start ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "falle:Klar,", x: 330, y: 740, winkel: -8, farbe: "a" });
  hud.add(new Etikett(M, { html: "2× SO VIEL?", art: "dunkel", ein: "falle:Doppelt", aus: "falle:Oder?-0.08", punkt: () => ({ x: 600, y: 880 }), anker: "mitte", gross: true, winkel: 4 }));
  const sOder = M.stempel({ text: "ODER?", ein: "falle:Oder?", aus: "falle:Los-0.06", x: 640, y: 860, winkel: 7, farbe: "weiss", textFarbe: "tinte" });
  const sLos = M.stempel({ text: "LOS GEHT'S!", ein: "falle:Los", aus: "rennen:200+0.5", x: 492, y: 760, winkel: -5, farbe: "#19B36B", groesse: 112 });

  // ---------- Rennen: Zulauf, Abzüge der Sozialkassen ----------
  const anGlasG = (w) => (t) => projiziere(new THREE.Vector3(X_G + 0.8, SOCKEL + zylG.yVon(w), 0.4), t);
  const anGlasS = (w) => (t) => projiziere(new THREE.Vector3(X_S + 0.8, SOCKEL + zylS.yVon(w), 0.4), t);
  hud.add(new Etikett(M, { html: "+200 €", art: "voll", farbe: "a", ein: "rennen:200+0.15", aus: "rennen:zapfen-0.4", punkt: (t) => projiziere(new THREE.Vector3(X_G, SOCKEL + zylG.yVon(fG(t)) + 0.35, 0.8), t), anker: "mitte", gross: true }));
  hud.add(new Etikett(M, { html: "+100 €", art: "voll", farbe: "b", ein: "rennen:100+0.15", aus: "rennen:zapfen-0.2", punkt: (t) => projiziere(new THREE.Vector3(X_S, SOCKEL + zylS.yVon(fS(t)) + 0.35, 0.8), t), anker: "mitte", gross: true }));
  // Abzugs-Etiketten an der jeweiligen Schicht im Becherglas (links daneben)
  const NAMEN = { rv: "RENTE", kv: "KRANKEN", pv: "PFLEGE", av: "ARBEITSLOS", lst: "LOHNSTEUER" };
  const schichtMitte = (id) => (t) => {
    const kanten = becher.setze(fuell(t).abzug);
    const k = kanten[id];
    return projiziere(becher.gruppe.localToWorld(new THREE.Vector3(-becher.R - 0.05, Math.max(k.mitte, 0.15), 0.5)), t);
  };
  const sozAus = "wendung:Doch-0.15";
  sozFolge.forEach((s, i) => {
    hud.add(new Etikett(M, { html: `<span class="klein">${NAMEN[s.id]}</span><span class="betrag">−${fmt.zahl(ab[s.id].betrag, 2)} €</span>`, art: "hell", farbe: SCHICHTEN[i].farbe, ein: s.t0, aus: sozAus, punkt: (t) => ({ x: 60, y: 900 - i * 92 }), anker: "links", klang: "pop" }));
  });
  hud.add(new Etikett(M, { html: `SOZIALKASSEN −${fmt.zahl(B.sozial, 2)} €`, art: "voll", farbe: "akzent", ein: "folgen:damit", aus: sozAus, punkt: () => ({ x: 60, y: 520 }), anker: "links", gross: false }));

  // ---------- Folgen-Aufruf (ca. 20 s, vor der Wendung) ----------
  M.folgen({ ein: "folgen:Folg-0.05", dauer: 1.8, y: 950, team: "a" });

  // ---------- Wendung: Finanzamt ----------
  M.stempel({ text: "FINANZAMT", ein: "wendung:Finanzamt.-0.05", aus: "wendung:150+0.2", x: 520, y: 560, winkel: -6, art: "stempel", farbe: KORALLE, groesse: 104 });
  hud.add(new Etikett(M, { html: `<span class="klein">LOHNSTEUER</span><span class="betrag">−${fmt.zahl(ab.lst.betrag, 2)} €</span>`, art: "voll", farbe: "akzent", ein: "wendung:150-0.1", aus: "wendung:Vorsprung-0.1", punkt: (t) => projiziere(new THREE.Vector3(X_G + 0.85, SOCKEL + zylG.yVon(190), 0.6), t), anker: "links", dx: 10 }));
  // schwebender Live-Zähler am Gehalt-Glas (Füllstand)
  M.zaehler({ ein: "wendung:150-0.3", aus: "wendung:schmilzt.", wert: (t) => Math.round(fG(t) * 100) / 100, nk: 2, einheit: "€", max: 200, team: "a", art: "voll", punkt: (t) => projiziere(new THREE.Vector3(X_G - 0.95, SOCKEL + zylG.yVon(fG(t)), 0.6), t) });
  // Countdown-Marken am Füllstand („150, 130, 110“)
  for (const [w, v] of [["wendung:150", 150], ["wendung:130", 130], ["wendung:110", 110]]) {
    hud.add(new Etikett(M, { html: `${v} €`, art: "dunkel", ein: w, aus: T(w) + 0.85, punkt: (t) => projiziere(new THREE.Vector3(X_G + 0.85, SOCKEL + zylG.yVon(v), 0.6), t), anker: "links", dx: 10, klang: "tick" }));
  }
  hud.add(new Etikett(M, { html: `VORSPRUNG NUR ${fmt.zahl(B.differenz, 2)} €`, art: "dunkel", ein: "wendung:Vorsprung", aus: "knapp:Und-0.1", punkt: () => ({ x: 492, y: 560 }), anker: "mitte", gross: true }));

  // ---------- Und steuerfrei? ----------
  hud.add(new Etikett(M, { html: "ABZÜGE: 0,00 €", art: "voll", farbe: "b", ein: "knapp:kein", aus: "ergebnis:Endstand:-0.25", punkt: (t) => projiziere(new THREE.Vector3(X_S, SOCKEL + zylS.yVon(100) + 0.5, 0.8), t), anker: "mitte", gross: true }));
  M.stempel({ text: "KEIN CENT WEG", ein: "knapp:weg.-0.05", aus: "knapp:wird's", x: 492, y: 640, winkel: -5, farbe: "b", groesse: 84 });
  M.stempel({ text: "KNAPP!", ein: "knapp:knapp.-0.03", aus: "ergebnis:Endstand:-0.25", x: 492, y: 600, winkel: 6, farbe: "akzent", groesse: 120 });
  const linieAn = (t) => {
    const a = clamp(ease.outCubic(fortschritt(t, T("knapp:knapp.") - 0.1, T("knapp:knapp.") + 0.35))) * (1 - fortschritt(t, T("ergebnis:Doppelt") - 0.2, T("ergebnis:Doppelt")));
    const b = clamp(ease.outCubic(fortschritt(t, T("ueberraschung:bleiben") - 0.2, T("ueberraschung:bleiben") + 0.2))) * (1 - fortschritt(t, T("rente:Aber") - 0.2, T("rente:Aber")));
    return Math.max(a, b);
  };
  M.melde({ t: T("knapp:knapp.") - 0.1, typ: "linie", klang: "ding", text: "Gleichstand-Linie 100 €" });

  // ---------- Ergebnis: Bilanzkarte ----------
  M.bilanz({
    y: 360, ein: "ergebnis:Endstand:-0.15", aus: "ergebnis:Doppelt-0.12", titel: "Endstand · netto mehr im Monat",
    zeilen: [
      { label: "GEHALT +200 €", wert: B.gehaltNetto, einheit: "€", nk: 2, team: "a", ein: "ergebnis:110" },
      { label: "STEUERFREI +100 €", wert: B.steuerfrei, einheit: "€", nk: 2, team: "b", ein: "ergebnis:100." },
    ],
    differenz: { label: "VORSPRUNG", wert: B.differenz, einheit: "€", nk: 2, ein: "ergebnis:Gehalt" },
    sieger: { text: "GEHALT GEWINNT", team: "a", ein: "ergebnis:gewinnt." },
  });
  M.formel({
    y: 380, aus: "warum:Warum?-0.1", titel: "Doppelt so viel brutto?",
    teile: [
      { text: "2×", einheit: "brutto", ein: "ergebnis:Doppelt", team: "a" },
      { text: "→", art: "op", ein: "ergebnis:aber" },
      { text: "+9,75", einheit: "€ netto", ein: "ergebnis:10", art: "erg" },
    ],
    unter: { text: "200 € → 109,75 € · 100 € → 100 €", ein: "ergebnis:netto.-0.1" },
  });

  // ---------- Warum? 2 Faktoren ----------
  M.balken({
    y: 360, ein: "warum:Warum?-0.1", aus: "ueberraschung:Und-0.1", titel: "Warum? Was vom Plus abgeht", max: 50,
    faktoren: [
      { label: "SOZIALABGABEN", ein: "warum:Gut", a: { wert: B.sozial, text: fmt.zahl(B.sozial, 2) }, b: { wert: 0, text: "0" }, tag: "21,75 %", tagEin: "warum:Sozialkassen." },
      { label: "LOHNSTEUER", ein: "warum:47-0.15", a: { wert: B.steuern, text: fmt.zahl(B.steuern, 2) }, b: { wert: 0, text: "0" }, tag: "23,4 %", tagEin: "warum:Lohnsteuer." },
    ],
  });
  M.stempel({ text: "−45 %", ein: "warum:Hälfte-0.05", aus: "warum:Gut-0.1", x: 760, y: 980, winkel: -8, farbe: "akzent", groesse: 110 });
  // Schicht-Etiketten im Becherglas: Sozialabgaben (4 Schichten) und Lohnsteuer
  hud.add(new Etikett(M, { html: `<span class="klein">SOZIAL</span><span class="betrag">${fmt.zahl(B.sozial, 2)} €</span>`, art: "voll", farbe: "#22C3B0", ein: "warum:Sozialkassen.-0.2", aus: "ueberraschung:Und-0.1", punkt: (t) => { const k = becher.setze(fuell(t).abzug); return projiziere(becher.gruppe.localToWorld(new THREE.Vector3(0, (k.rv.unten + k.av.oben) / 2, becher.R + 0.1)), t); }, anker: "mitte" }));
  hud.add(new Etikett(M, { html: `<span class="klein">STEUER</span><span class="betrag">${fmt.zahl(B.steuern, 2)} €</span>`, art: "voll", farbe: "akzent", ein: "warum:Lohnsteuer.-0.2", aus: "ueberraschung:Und-0.1", punkt: (t) => { const k = becher.setze(fuell(t).abzug); return projiziere(becher.gruppe.localToWorld(new THREE.Vector3(0, k.lst.mitte, becher.R + 0.1)), t); }, anker: "mitte" }));

  // ---------- Zweite Überraschung: 5.500 € brutto ----------
  M.chips({ y: 404, ausrichtung: "mitte", aus: "rente:Aber-0.1", liste: [
    { text: "BEI 5.500 € BRUTTO", ein: "ueberraschung:5.500-0.03", art: "dunkel", gross: true },
  ] });
  hud.add(new Etikett(M, { html: `<span class="klein">LOHNSTEUER</span><span class="betrag">−${fmt.zahl(H.steuern, 2)} €</span>`, art: "voll", farbe: "akzent", ein: "ueberraschung:bleiben-0.05", aus: "rente:Aber-0.1", punkt: () => ({ x: 492, y: 540 }), anker: "mitte" }));
  M.stempel({ text: "STEUERFREI VORN!", ein: "ueberraschung:steuerfrei.-0.05", aus: "rente:Aber-0.05", x: 492, y: 820, winkel: -6, farbe: "b", groesse: 92 });
  M.stempel({ text: "ACHTUNG!", ein: "rente:Achtung:-0.05", aus: "rente:zählen", x: 492, y: 700, winkel: 5, farbe: "akzent", groesse: 110 });

  // ---------- Rente (Bedingung) ----------
  M.formel({
    y: 380, ein: "rente:Extras-0.15", aus: "merksatz:Brutto-0.12", titel: "Rente je Jahr mit +200 € brutto", groesse: 64,
    teile: [
      { text: "+0,046", einheit: "Punkte", ein: "rente:Rente.-0.1", team: "a" },
      { text: "≈", ein: "rente:Da" },
      { text: "+1,96 €", einheit: "Rente/Mon.", ein: "rente:Nase-0.1", art: "erg" },
    ],
    unter: { text: "STEUERFREI: 0 RENTENPUNKTE", ein: "rente:zählen", team: "b" },
  });

  // ---------- Merksatz ----------
  M.pointe({ text: "BRUTTO ≠ *NETTO.*", ein: "merksatz:Brutto", takt: 0.2, aus: "merksatz:Zähl-0.15", y: 560, groesse: 150 });
  M.pointe({ woerter: [{ text: "ZÄHL,", ein: "merksatz:Zähl" }, { text: "WAS", ein: "merksatz:was" }, { umbruch: true }, { text: "ANKOMMT.", ein: "merksatz:ankommt.", farbe: "akzent" }], aus: "schluss:Was-0.1", y: 520, groesse: 140 });

  // Einzelne Pointe-Wörter ins Protokoll (Bild-Ereignis und Klang)
  M.melde({ t: "merksatz:netto.", typ: "pointe-wort", klang: "klick", text: "NETTO." });
  M.melde({ t: "merksatz:was", typ: "pointe-wort", klang: "klick", text: "WAS" });
  M.melde({ t: "merksatz:ankommt.", typ: "pointe-wort", klang: "akzent", text: "ANKOMMT." });

  // ---------- Untertitel Wort für Wort (Stil „kontur“, Entscheidung des Inhabers 01.11.) ----------
  M.untertitel({ stil: "kontur", versteckt: [[T("schluss:Kommentare.>") + 0.5, DAUER + 1]] });

  // =====================================================================================
  // 3D-Zustand je Bild
  // =====================================================================================
  const tAkt = (t, a, b) => clamp(Math.min(fortschritt(t, a - 0.1, a + 0.2), 1 - fortschritt(t, b, b + 0.8)));
  const setzeWelt = (t) => {
    const f = fuell(t);
    const aktivG = Math.max(tAkt(t, ankunftG, zuflussG.stopp + 0.3), abflussAn(t) ? 0.6 : 0);
    const aktivS = tAkt(t, ankunftS, zuflussS.stopp + 0.3);
    zylG.setze({ wert: f.g, aktiv: aktivG, t });
    zylS.setze({ wert: f.s, aktiv: aktivS, t });
    becher.setze(f.abzug);
    const s = t >= tSchleife ? 0 : 1; // in der Schleife keine Strahlen
    strahlG.setze(t, zulaufG.spitze, { start: zuflussG.start, stopp: s ? zuflussG.stopp : -1, bisY: SOCKEL + zylG.yVon(f.g) });
    strahlS.setze(t, zulaufS.spitze, { start: zuflussS.start, stopp: s ? zuflussS.stopp : -1, bisY: SOCKEL + zylS.yVon(f.s) });
    // Abfluss: Strahl vom Ablauf ins Becherglas, an/aus mit dem Ventil
    const an = abflussAn(t) && s;
    let start = Infinity, stopp = Infinity;
    if (an) { start = t - 1; stopp = Infinity; } else { start = -10; stopp = -9; }
    strahlAb.setze(t, new THREE.Vector3(X_B + 0.2, Y_HAHN - 0.22, 0.32), { start, stopp, bisY: becher.oberkante || 0.12 });
    rad.rotation.z = ventil(t) * Math.PI * 1.5;
    // Tropfen: alle 0,62 s je Hahn, nur im Hook bis kurz vor dem Zulauf (erstes und letztes Bild ohne Tropfen)
    for (const tr of tropfen) {
      const periode = 0.62, t0 = 0.35 + tr.versatz;
      const boden = SOCKEL + zylG.y0 + 0.03;
      let sicht = false;
      if (t >= t0 && t < tPourG - 0.4) {
        const d = (t - t0) % periode;
        const y = tr.spitze.y - 0.08 - 0.5 * 98 * d * d;
        if (y > boden) {
          sicht = true;
          tr.m.position.set(tr.spitze.x, y, tr.spitze.z);
          tr.m.scale.set(1, 1 + Math.min(1.2, d * 6), 1);
        }
      }
      tr.m.visible = sicht;
    }
    // Gleichstandslinie
    const l = linieAn(t);
    linie.visible = l > 0.01;
    linie.scale.x = Math.max(0.001, l);
    linie.material.opacity = l;
    linieT.offset.x = -t * 0.6;
  };
  const post = { bloomStaerke: BLOOM, bloomSchwelle: 1.4, belichtung: 0.98, vignette: 0.18, saettigung: 1.16, kontrast: 1.06, koernung: 0.012 };
  const welt = { szene, kamera: kam, post, update(t) { setzeWelt(t); regie.anwenden(t); } };
  for (const s of [sKlar, sOder, sLos]) regie.stoss({ t: s.ein + 0.1, staerke: 0.7 });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t });
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, 16, 30, 45, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = { basis: { netto: B.gehaltNetto, sozial: B.sozial, steuern: B.steuern }, hoch: { netto: H.gehaltNetto, steuern: H.steuern } };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
