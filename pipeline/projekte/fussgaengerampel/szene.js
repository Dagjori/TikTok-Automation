// Fußgängerampel: Bringt mehrmaliges Drücken des Knopfs etwas?  (Stil 1 Low-Poly-Miniatur mit Tilt-Shift)
// Max (Pink, Dauerdrücker, hetzt) und Lea (Türkis, drückt einmal) gehen denselben Weg zur Straßenbahn über drei Ampeln:
// Bedarfsampel (Gleichstand), Festzeit (Max erwischt das letzte Grün), grüne Welle (Max eine Sekunde zu spät).
// Alle Zeiten, Drücke und Signalzustände kommen aus der Simulation sim/ampel.mjs (Tests: sim/ampel.test.mjs).
// Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming, normalisiere } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, hash } from "../../engine/bewegung.js";
import { haus, baum, hochhaus, rundeBox, mat, leucht, kontaktSchatten } from "../../engine/bausteine.js";
import { fussgaenger, setzeFussgaenger, fussgaengerSignal, kfzSignal, taster, querstrasse, strassenbahn, autoSpur, laterne, textTextur, fokusHoehe } from "../../engine/stil_lowpoly.js";
import { PARAMETER as P, AMPELN, BAHN, rennen, steuerung } from "../../sim/ampel.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Jacken, Bodenringe, Tafel, Chips, Leiste, Untertitel). Gelb bleibt dem Untertitel-Wort.
const MAX_F = "#FF4F9A"; // Max, Dauerdrücker (Pink)
const LEA_F = "#2EC4B6"; // Lea, Einmaldrücker (Türkis)
const TINTE = "#14171F";
const ROT = "#F0443A";
const GRUEN = "#19B36B";

// =====================================================================================
// Modell
// =====================================================================================
const R = rennen();
const MAX = R.personen.max, LEA = R.personen.lea;
const ST = R.ampeln.map((a) => a.steuerung);
const [A1, A2, A3] = AMPELN;
const ZIEL_M = MAX.xZiel; // 234,5 m

// Weg (Meter) → Welt-z (Einheiten, 1 E ≈ 3 m). Straßen in echter Breite, Blöcke dazwischen gestaucht.
const KNOTEN_M = [0, A1.x, A1.x + A1.breite, A2.x, A2.x + A2.breite, A3.x, A3.x + A3.breite, ZIEL_M];
const KNOTEN_Z = [0, -9, -9 - A1.breite / 3, -24.667, -24.667 - A2.breite / 3, -42.667, -42.667 - A3.breite / 3, -42.667 - A3.breite / 3 - P.HALTESTELLE_M / 3];
const zVon = (m) => {
  if (m <= 0) return -m / 3;
  for (let i = 1; i < KNOTEN_M.length; i++) if (m <= KNOTEN_M[i]) return lerp(KNOTEN_Z[i - 1], KNOTEN_Z[i], (m - KNOTEN_M[i - 1]) / (KNOTEN_M[i] - KNOTEN_M[i - 1]));
  return KNOTEN_Z[KNOTEN_Z.length - 1] - (m - ZIEL_M) / 3;
};
const STR = AMPELN.map((a) => ({ nah: zVon(a.x), fern: zVon(a.x + a.breite), mitte: (zVon(a.x) + zVon(a.x + a.breite)) / 2, breite: a.breite / 3 }));
const INSEL = { nah: STR[2].fern, fern: STR[2].fern - 1.25 };
const GLEIS_Z = INSEL.fern - 0.62;
const LAT = { lea: -1, max: 1 }; // Lea links, Max rechts

// =====================================================================================
// Welt
// =====================================================================================
/** Pflaster-Material (Canvas-Textur) für eine Fläche b × l (Einheiten) */
function pflaster(b, l) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#C9BBA2"; g.fillRect(0, 0, 128, 128);
  for (let j = 0; j < 4; j++) for (let i = -1; i < 3; i++) {
    const x = i * 48 + (j % 2) * 24, y = j * 32;
    g.fillStyle = ["#DCD0B9", "#D3C5AC", "#E0D5C0", "#CFC1A7"][((i + 4) + j * 2) % 4];
    g.fillRect(x + 2, y + 2, 44, 28);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(b / 1.5, l / 1.0);
  t.anisotropy = 8;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

function baueWelt(buehne) {
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#8FC0F2"], [0.42, "#CFE3F7"], [0.62, "#EEF3F2"], [1, "#F4EEE2"]]);
  szene.fog = new THREE.Fog("#D5E6F5", 75, 170);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 18, schattenKarte: SCHATTEN || 512, sonnenRichtung: [-0.45, 1.0, 0.5], sonnenStaerke: 3.1, sonnenFarbe: "#FFEBD2", himmel: "#CFE3FF", boden: "#E9DCC6", himmelStaerke: 0.7, umgebungsStaerke: 0.42, schattenWeich: 3 });
  if (!SCHATTEN) licht.sonne.castShadow = false;
  const add = (o, x = 0, y = 0, z = 0, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; szene.add(o); return o; };
  const flaeche = (x0, x1, z0, z1, farbe, y = 0, rau = 0.95) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.04, z0 - z1), mat(farbe, { rau }));
    m.position.set((x0 + x1) / 2, y - 0.02, (z0 + z1) / 2);
    m.receiveShadow = true;
    szene.add(m);
    return m;
  };
  // Boden (Rasen), Blöcke mit Pflaster, Weg in der Mitte
  flaeche(-90, 90, 30, -120, "#86C766", -0.03);
  const BLOECKE = [[6, STR[0].nah], [STR[0].fern, STR[1].nah], [STR[1].fern, STR[2].nah]];
  for (const [z0, z1] of BLOECKE) {
    flaeche(-60, 60, z0, z1, "#93CF71", 0.0);
    const weg = flaeche(-1.15, 1.15, z0, z1, "#FFFFFF", 0.012, 0.9); // Gehweg der Route (Pflaster)
    weg.material = pflaster(2.3, z0 - z1);
    for (const sx of [-1, 1]) flaeche(sx * 1.15 - 0.06, sx * 1.15 + 0.06, z0, z1, "#B9AE9C", 0.03, 0.8); // Randsteine
    for (const sz of [-1, 1]) flaeche(-60, 60, sz > 0 ? z0 : z1 + 0.9, sz > 0 ? z0 - 0.9 : z1, "#D3C8B6", 0.008); // Gehwege entlang der Straßen
  }
  // Startlinie
  const start = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.006, 0.12), mat("#FFFFFF", { rau: 0.6 }));
  start.position.set(0, 0.02, 0.32);
  szene.add(start);
  // Straßen
  const strassen = STR.map((s, i) => {
    const q = querstrasse({ breite: s.breite, laenge: 120, spuren: i === 1 ? 2 : 1, furtBreite: 1.7, farbe: i === 1 ? "#6F778A" : "#7C8497" });
    add(q.gruppe, 0, 0, s.mitte);
    return q;
  });
  // Haltestelleninsel, Gleis, Gegenfahrbahn, Bahnhofsplatz
  const insel = rundeBox(24, 0.09, INSEL.nah - INSEL.fern, { farbe: "#D9D3C5", radius: 0.03 });
  add(insel, 0, 0, (INSEL.nah + INSEL.fern) / 2);
  const kante = new THREE.Mesh(new THREE.BoxGeometry(24, 0.01, 0.08), mat("#FFFFFF", { rau: 0.5 }));
  kante.position.set(0, 0.095, INSEL.fern + 0.1);
  szene.add(kante);
  flaeche(-90, 90, INSEL.fern, INSEL.fern - 1.35, "#B9B2A4", 0.0); // Gleisbett
  for (const dz of [-0.33, 0.33]) { const s = new THREE.Mesh(new THREE.BoxGeometry(180, 0.04, 0.05), mat("#9AA2B1", { rau: 0.3, metall: 0.6 })); s.position.set(0, 0.03, GLEIS_Z + dz); szene.add(s); }
  for (let x = -60; x < 60; x += 0.5) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.95), mat("#8B6F5A", { rau: 0.9 })); s.position.set(x, 0.012, GLEIS_Z); szene.add(s); }
  const gegen = querstrasse({ breite: 2.4, laenge: 120, spuren: 1, furtBreite: 1.7 });
  add(gegen.gruppe, 0, 0, INSEL.fern - 1.35 - 1.2);
  flaeche(-90, 90, INSEL.fern - 3.95, -70, "#E6DFD0", 0.006);
  // Wartehäuschen und Haltestellenschild
  const dachH = rundeBox(2.4, 0.06, 0.8, { farbe: "#3A4152", radius: 0.02 });
  add(dachH, 1.9, 0.95, (INSEL.nah + INSEL.fern) / 2 - 0.05);
  const glasW = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 0.03), new THREE.MeshStandardMaterial({ color: "#CFE7FF", transparent: true, opacity: 0.35, roughness: 0.1 }));
  glasW.position.set(1.9, 0.52, INSEL.fern + 0.18);
  szene.add(glasW);
  for (const dx of [-1.1, 1.1]) add(rundeBox(0.05, 0.9, 0.05, { farbe: "#3A4152", radius: 0.01 }), 1.9 + dx, 0.08, INSEL.fern + 0.2);
  const hSchild = new THREE.Group();
  const hMast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), mat("#3A4152", { rau: 0.5 }));
  hMast.position.y = 0.6;
  hSchild.add(hMast);
  const hTx = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#FFD23F"; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#1F9D55"; g.lineWidth = 8; g.stroke(); g.fillStyle = "#1F9D55"; g.font = '900 84px "SB Display", Inter, sans-serif'; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("H", 64, 70); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const hTafel = new THREE.Mesh(new THREE.CircleGeometry(0.2, 28), new THREE.MeshBasicMaterial({ map: hTx }));
  hTafel.position.set(0, 1.22, 0.03);
  hSchild.add(hTafel);
  add(hSchild, -1.3, 0.09, INSEL.fern + 0.3);
  // Straßenbahn
  const bahn = strassenbahn({ farbe: "#EEF2F7", streifen: "#5B6CFF", laenge: 10 });
  add(bahn.gruppe, 40, 0.16, GLEIS_Z);
  // Ampeln: je Straße auf der nahen Seite zwei Masten mit Taster (links Lea, rechts Max), Signale auf der fernen Seite
  const ampeln = STR.map((s, i) => {
    const o = { fern: [], nah: [], kfz: [], taster: {} };
    for (const sx of [-1, 1]) {
      const fs = fussgaengerSignal({ hoehe: 0.95 });
      add(fs.gruppe, sx * 1.02, 0, s.fern - 0.18, 0); // schaut zu den Wartenden (+z)
      o.fern.push(fs);
      const ns = fussgaengerSignal({ hoehe: 0.95 });
      add(ns.gruppe, sx * 1.02, 0, s.nah + 0.18, Math.PI);
      o.nah.push(ns);
      const ts = taster();
      ts.gruppe.position.set(sx * 1.02, 0.52, s.nah + 0.18 + 0.045);
      szene.add(ts.gruppe);
      o.taster[sx < 0 ? "lea" : "max"] = ts;
    }
    // Kfz-Signale an den Haltlinien (Richtung +x: nahe Seite links; Richtung −x: ferne Seite rechts)
    const k1 = kfzSignal({ hoehe: 1.15 });
    add(k1.gruppe, -2.0, 0, s.nah + 0.25, -Math.PI / 2);
    const k2 = kfzSignal({ hoehe: 1.15 });
    add(k2.gruppe, 2.0, 0, s.fern - 0.25, Math.PI / 2);
    o.kfz.push(k1, k2);
    return o;
  });
  // Häuser, Bäume, Laternen in den Blöcken (links und rechts des Wegs)
  const WAND = ["#FFF6EA", "#FCE7D4", "#E9F1FF", "#F7F1FF", "#FFFFFF", "#EAF7EE", "#FFF1F4"];
  const DACH = ["#FF8A5C", "#5B8DEF", "#F2B544", "#7AC48F", "#E86A7E", "#8C7AE6"];
  let n = 0;
  for (const [z0, z1] of BLOECKE) {
    for (const sx of [-1, 1]) {
      let z = z0 - 1.6;
      while (z > z1 + 1.6) {
        const r = hash(n * 7 + (sx > 0 ? 3 : 1), 11);
        if (r < 0.6) {
          const b = 1.5 + hash(n, 2) * 0.6;
          const h = haus({ breite: b, tiefe: 1.3, hoehe: 0.95 + hash(n, 5) * 0.7, wand: WAND[Math.floor(hash(n, 7) * WAND.length)], dach: DACH[Math.floor(hash(n, 9) * DACH.length)] });
          add(h.gruppe, sx * (2.75 + hash(n, 13) * 0.4), 0, z - b / 2, sx < 0 ? Math.PI / 2 : -Math.PI / 2);
          z -= b + 0.55 + hash(n, 17) * 0.5;
        } else {
          const bm = baum({ groesse: 0.95 + hash(n, 19) * 0.5, seed: n });
          add(bm, sx * (1.75 + hash(n, 23) * 0.3), 0, z - 0.4);
          z -= 1.3 + hash(n, 29) * 0.6;
        }
        n++;
      }
      // zweite Reihe (Tiefe)
      for (let k = 0; k < 9; k++) {
        const zz = lerp(z0 - 1, z1 + 1, (k + hash(k + n, 3) * 0.5) / 9);
        if (hash(k, n) < 0.5) add(baum({ groesse: 1.2 + hash(k, 31) * 0.8, seed: k + 100 + n, farbe: "#58B574", farbe2: "#7FCB8F" }), sx * (5.4 + hash(k, 41) * 3.5), 0, zz);
        else { const h = haus({ breite: 1.8, tiefe: 1.6, hoehe: 1.4 + hash(k, 43) * 0.9, wand: WAND[(k + n) % WAND.length], dach: DACH[(k + 2 * n) % DACH.length] }); add(h.gruppe, sx * (6.2 + hash(k, 47) * 2.5), 0, zz, sx < 0 ? Math.PI / 2 : -Math.PI / 2); }
      }
      for (let z = z0 - 1.0; z > z1 + 0.5; z -= 4.2) add(laterne({ hoehe: 1.35 }), sx * 1.32, 0, z, sx < 0 ? 0 : Math.PI);
    }
  }
  // Bahnhof und Stadt am Horizont
  const bhf = rundeBox(14, 2.6, 4, { farbe: "#F3EBDD", radius: 0.12 });
  add(bhf, 0, 0, INSEL.fern - 7.5);
  const bhfDach = rundeBox(14.6, 0.35, 4.6, { farbe: "#C46A4A", radius: 0.1 });
  add(bhfDach, 0, 2.6, INSEL.fern - 7.5);
  const uhrTx = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"); g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill(); g.strokeStyle = TINTE; g.lineWidth = 7; g.stroke(); g.lineCap = "round"; g.lineWidth = 8; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 24); g.moveTo(64, 64); g.lineTo(92, 74); g.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const bhfUhr = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ map: uhrTx }));
  bhfUhr.position.set(0, 1.85, INSEL.fern - 5.48);
  szene.add(bhfUhr);
  for (let i = 0; i < 4; i++) { const tuer = rundeBox(1.0, 1.3, 0.05, { farbe: "#2D3A55", radius: 0.04 }); add(tuer, -4.5 + i * 3, 0, INSEL.fern - 5.48); }
  for (let i = 0; i < 10; i++) {
    const hh = hochhaus({ hoehe: 4 + hash(i, 3) * 5, etagen: 8, spalten: 3, breite: 2.2, tiefe: 2.2, akzent: i % 2 ? "#5B8DEF" : "#FF8A5C" });
    add(hh.gruppe, -22 + i * 4.6 + hash(i, 5) * 1.5, 0, INSEL.fern - 16 - hash(i, 7) * 8);
  }
  for (let i = 0; i < 30; i++) add(baum({ groesse: 1.4 + hash(i, 61) * 0.8, seed: i + 300 }), (hash(i, 63) - 0.5) * 70, 0, INSEL.fern - 11 - hash(i, 67) * 6);
  // Figuren
  const max = fussgaenger({ farbe: MAX_F, haut: "#F3C29C", hose: "#2B3045", frisur: "kappe", groesse: 1.3 });
  const lea = fussgaenger({ farbe: LEA_F, haut: "#F6CFAE", hose: "#3A3550", haar: "#5A3A26", frisur: "dutt", groesse: 1.3 });
  // Kleinteile am Weg: Poller, Bänke, Blumenkübel (füllen den Vordergrund)
  for (const [z0, z1] of BLOECKE) for (let z = z0 - 0.8, k = 0; z > z1 + 0.6; z -= 1.15, k++) {
    const sx = k % 2 ? 1 : -1;
    const r = hash(k * 13 + Math.round(z0), 5);
    if (r < 0.35) { const p = rundeBox(0.07, 0.24, 0.07, { farbe: "#3A4152", radius: 0.025 }); add(p, sx * 1.07, 0, z); }
    else if (r < 0.6) { const kb = rundeBox(0.36, 0.2, 0.36, { farbe: "#C46A4A", radius: 0.05 }); add(kb, sx * 1.42, 0, z); const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), mat(["#F27BA8", "#F2C14E", "#7DD87D"][k % 3], { rau: 0.7 })); bl.position.set(sx * 1.42, 0.3, z); bl.castShadow = true; szene.add(bl); }
    else if (r < 0.8) { const b = rundeBox(0.16, 0.12, 0.6, { farbe: "#A0754F", radius: 0.03 }); add(b, sx * 1.45, 0.1, z); const l = rundeBox(0.04, 0.22, 0.6, { farbe: "#A0754F", radius: 0.02 }); add(l, sx * 1.53, 0.2, z); }
  }
  szene.add(max, lea);
  // Passanten (neutrale Farben, keine Teamfarben) auf den Gehwegen entlang der Querstraßen
  const NPC_F = ["#8C9BB5", "#E2A86A", "#9E8CC9", "#7FB0A0", "#C98C7A", "#6F86A8"];
  const passanten = [];
  STR.slice(0, 2).forEach((s, i) => {
    for (const [zz, r] of [[s.fern - 0.4, 1], [s.fern - 0.75, -1]]) for (let k = 0; k < 2; k++) {
      const f = fussgaenger({ farbe: NPC_F[(i * 3 + k + (r > 0 ? 0 : 2)) % NPC_F.length], haut: ["#F3C29C", "#C68E64", "#F6CFAE"][k % 3], hose: "#3A4152", frisur: k % 2 ? "kurz" : "dutt", haar: ["#3A2A22", "#7A5230", "#222"][k % 3], groesse: 1.15 });
      f.userData.ring.visible = false;
      szene.add(f);
      passanten.push({ f, z: zz, r, x0: -24 + k * 26 + i * 9 + (r > 0 ? 0 : 13), v: 0.3 + 0.06 * k });
    }
  });
  return { szene, licht, strassen, ampeln, bahn, max, lea, passanten };
}

// =====================================================================================
// HUD-Hilfen dieses Videos
// =====================================================================================
/** Nummernschild an einer Ampel (folgt dem 3D-Punkt): {nr, text, ein, aus, punkt(t) → {x,y}} */
class AmpelNr {
  constructor(M, { nr, text, ein, aus, punkt, klein = false }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = M.zeit(aus);
    this.punkt = punkt;
    this.e = el("div", `ms fa-nr${klein ? " klein" : ""}`, `<b>${nr}</b>${text}<i class="zeiger"></i>`, M.hud.wurzel);
    this.w = this.e.offsetWidth; this.h = this.e.offsetHeight;
  }
  ereignisse() { return [{ t: this.ein, typ: "chip", klang: "pop", text: this.e.textContent }]; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.25;
    const v = an ? "visible" : "hidden";
    if (this.e.style.visibility !== v) this.e.style.visibility = v;
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 3.2, daempfung: 0.42 });
    const raus = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.25));
    const p = this.punkt(t);
    const x = clamp(p.x - 30, SICHER.links, SICHER.rechts - this.w);
    const y = clamp(p.y - this.h - 18, SICHER.oben + 170, SICHER.unten - 260);
    const drin = p.x > -80 && p.x < 1160 && p.y > 0 && p.y < 1920 ? 1 : 0;
    this.e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${(0.4 + 0.6 * s).toFixed(4)})`;
    this.e.style.transformOrigin = "30px 100%";
    this.e.style.opacity = String(clamp((t - this.ein) / 0.06) * (1 - raus) * drin);
  }
}

/** Chip an einen 3D-Punkt heften (Position folgt der Kamera) */
function anheften(chip, punkt, { dy = -40, min = SICHER.oben + 170 } = {}) {
  const upd = chip.update.bind(chip);
  chip.anker = "mitte";
  chip.update = (t) => {
    if (t >= chip.ein - 0.01 && t <= chip.aus + 0.3) {
      const p = punkt(t);
      chip.x = clamp(p.x, SICHER.links + chip.breite / 2, SICHER.rechts - chip.breite / 2);
      chip.y = clamp(p.y + dy, min, SICHER.unten - 280);
    }
    upd(t);
  };
  return chip;
}

/** monotone kubische Interpolation (Fritsch–Carlson) über Stützstellen [[x, y], …] */
function monoton(keys) {
  const n = keys.length, xs = keys.map((k) => k[0]), ys = keys.map((k) => k[1]);
  for (let i = 1; i < n; i++) if (!(xs[i] > xs[i - 1]) || ys[i] < ys[i - 1]) throw new Error(`Zeitraffer nicht monoton bei Stützstelle ${i}: ${keys[i]}`);
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
    if (t <= xs[0]) return ys[0] + m[0] * (t - xs[0]);
    if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]);
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h;
    const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
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

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const W = baueWelt(buehne);

  // ---------- Videozeit → Rennzeit τ (Sekunden im Modell) ----------
  const tLos = T("Los");
  const keys = [
    [0, -tLos], [tLos, 0],
    [T("rennen1:Ampel") + 0.25, MAX.ankunft[0]],
    [T("rennen1:drückt.") + 0.1, 32],
    [T("folgen:verpasst."), 36],
    [T("wendung1:Lea.") + 0.05, LEA.ankunft[0]],
    [T("wendung1:Druck."), LEA.druecke[0][0] + 0.25],
    [T("wendung1:Grün.") + 0.02, MAX.gruen[0]],
    [T("rennen2:Takt."), 75],
    [T("rennen2:letzte"), MAX.ankunft[1]],
    [T("rennen2:Grün.") + 0.1, MAX.ankunft[1] + 2.5],
    [T("rennen2:Lea:") + 0.3, LEA.ankunft[1]],
    [T("wendung2:kommt"), 139.6],
    [T("wendung2:spät.") + 0.05, MAX.ankunft[2] + 0.4],
    [T("wendung2:Umlauf."), LEA.gruen[1] - 1],
    [T("wendung2:holt"), 197],
    [T("wendung2:knapp."), LEA.ankunft[2] - 0.6],
    [T("ergebnis:Grün") + 0.02, MAX.gruen[2]],
    [T("ergebnis:Endstand:"), LEA.insel - 0.5],
    [T("ergebnis:Bahn."), BAHN.an],
    [T("ergebnis:63-mal"), BAHN.tuerAuf + 1],
    [DAUER + 1, BAHN.tuerAuf + 1 + (DAUER + 1 - T("ergebnis:63-mal")) * 0.9],
  ];
  const tauRoh = monoton(keys);
  const videoZeit = (tau) => { let a = 0, b = DAUER + 1; for (let k = 0; k < 44; k++) { const m = (a + b) / 2; if (tauRoh(m) < tau) a = m; else b = m; } return (a + b) / 2; };

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "MAX", farbe: MAX_F, woerter: ["Max*"] },
      b: { name: "LEA", farbe: LEA_F, woerter: ["Lea*"] },
    },
    akzent: "#FFD23F", tinte: TINTE,
  });
  const tLoop = T("schluss:Was") - 0.25;
  M.schleife({ ab: tLoop, ende: ENDE });
  const tau = M.wert(tauRoh); // schleifenfest
  const uhrAuto = M.wert((t) => t); // Uhr der Autos (Videozeit), schleifenfest

  // ---------- Was-wäre-Welt (zweite Überraschung): niemand drückt an Ampel 1, dann drückt Lea einmal ----------
  const tWas = T("ueberraschung:Und");
  const tWasDrueck = T("merksatz:Einmal") + 0.15;
  const WAS_ST = steuerung({ ...A1, kfzFreiAb: -1000 });
  const wasTauRoh = monoton([[0, -600], [tWas - 0.6, -0.6], [T("ueberraschung:Drückt"), 4], [T("ueberraschung:rot."), 150], [T("ueberraschung:Egal,"), 260], [T("ueberraschung:wartest.") + 0.3, 590], [tWasDrueck, 600], [T("merksatz:reicht."), 605.2], [T("merksatz:Wann"), 607.5], [DAUER + 1, 615]]);
  WAS_ST.anfordern(600);
  const wasTau = (t) => wasTauRoh(t);

  // ---------- Anzeigetafel: Drücke je Person, Mitte: Rennuhr ----------
  const druecke = (q, t) => (t >= tWas - 0.3 ? (q === LEA && t >= tWasDrueck ? 1 : 0) : q.drueckeBis(tau(t)));
  M.tafel({
    y: 166, vorn: null,
    links: { team: "b", einheit: "×", max: 99 },
    rechts: { team: "a", einheit: "×", max: 99 },
    werte: (t) => ({ a: druecke(MAX, t), b: druecke(LEA, t) }),
    uhr: { ein: "Los", zeit: (t) => (t >= tWas - 0.3 ? Math.max(0, wasTau(t)) : Math.max(0, tauRoh(t))), label: "" },
  });

  // ---------- Hook: Titel ----------
  M.titel({
    y: 372, groesse: 128, aus: "regeln:Drei-0.32",
    woerter: [
      { text: "EINMAL", ein: "hook:Einmal+0.02", team: "b" }, { art: "vs", ein: "hook:oder" }, { text: "ZEHNMAL", ein: "hook:zehnmal?", team: "a" },
      { umbruch: true },
      { text: "WER KRIEGT", ein: "hook:Wer", art: "klein" }, { text: "SCHNELLER", ein: "hook:schneller", art: "klein" }, { text: "GRÜN?", ein: "hook:Grün?", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips ----------
  M.chips({ y: 360, ausrichtung: "mitte", aus: "falle:Klar,-0.1", liste: [
    { text: "3 AMPELN", ein: "regeln:Drei", art: "voll", team: "akzent", gross: true },
    { text: "ZUR BAHN", ein: "regeln:Bahn.", art: "dunkel", gross: true },
  ] });
  M.chips({ y: 470, ausrichtung: "mitte", aus: "falle:Klar,-0.1", liste: [
    { text: "MAX HETZT", ein: "regeln:hetzt", art: "voll", team: "a" },
    { text: "DRÜCKT STURM", ein: "regeln:Sturm.", art: "voll", team: "a" },
  ] });
  M.chips({ y: 560, ausrichtung: "mitte", aus: "falle:Klar,-0.1", liste: [
    { text: "LEA GEHT NORMAL", ein: "regeln:Lea", art: "voll", team: "b" },
    { text: "DRÜCKT 1×", ein: "regeln:einmal.", art: "voll", team: "b" },
  ] });

  // ---------- Denkfalle und Start ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "falle:Klar,", x: 330, y: 520, winkel: -8, farbe: "akzent", groesse: 120 });
  const sOder = M.stempel({ text: "ODER?", ein: "falle:Oder?", aus: "Los-0.06", x: 650, y: 560, winkel: 7, farbe: "weiss", textFarbe: "tinte", groesse: 120 });
  const sLos = M.stempel({ text: "LOS GEHT'S!", ein: "Los", aus: "rennen1:Ampel-0.1", x: 492, y: 520, winkel: -5, farbe: GRUEN, groesse: 116 });

  // ---------- Projektion ----------
  const kamera = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.2, 400);
  const bild = (p, k = kamera) => { const v = new THREE.Vector3(...p).project(k); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920, z: v.z }; };
  let regie; // unten
  const an = (p, dx = 0, dy = 0) => (t) => { regie.anwenden(t); const q = bild(typeof p === "function" ? p(t) : p); return { x: q.x + dx, y: q.y + dy }; };

  // ---------- Figuren: Position, Haltung ----------
  const pressV = (q) => q.druecke.map((z) => z.map((p) => videoZeit(p)));
  const PRESS_V = { max: pressV(MAX), lea: pressV(LEA) };
  // Nähe zur Bordsteinkante (0..1): an der Ampel treten beide zum Taster-Mast und bleiben knapp vor der Kante stehen
  const kante = (m) => { let w = 0; for (const a of AMPELN) w = Math.max(w, Math.exp(-(((m - a.x + 0.4) / 2.2) ** 2))); return w; };
  const lateral = (q, m) => LAT[q.id] * (0.3 + 0.5 * kante(m));
  const figurZustand = (q, ta, t) => {
    const m = q.x(ta);
    const v = (q.x(ta + 0.25) - q.x(ta - 0.25)) / 0.5;
    const lauf = clamp(v / 0.9);
    const z = zVon(m) + 0.55 * kante(m);
    const x = lateral(q, m);
    const zu = q.zustand(ta);
    const wartet = zu.art === "warten";
    const i = zu.ampel;
    // Drücken: Max hält die Hand am Taster, solange er wartet; Lea nur kurz um ihren einen Druck
    let druecken = 0, stoss = 0;
    if (wartet && i !== undefined) {
      const pv = PRESS_V[q.id][i] || [];
      if (q.id === "max") {
        druecken = pv.length ? clamp((t - (pv[0] - 0.25)) / 0.2) : 0;
        for (const p of pv) stoss = Math.max(stoss, Math.exp(-(((t - p) / 0.06) ** 2)));
      } else if (pv.length) {
        druecken = clamp((t - (pv[0] - 0.3)) / 0.2) * (1 - clamp((t - (pv[0] + 0.45)) / 0.3));
        stoss = Math.exp(-(((t - pv[0]) / 0.07) ** 2));
      }
    }
    return { pos: [x, 0.0, z], m, lauf, wartet, ampel: i, druecken, stoss, schritt: m / (q.id === "max" ? 0.9 : 0.72) };
  };
  const kopf = (q) => (t) => { const z = figurZustand(q, tau(t), t); return [z.pos[0], 1.05, z.pos[2]]; };

  // ---------- Leiste (Weg zur Bahn) ----------
  M.leiste({
    y: 1160, ein: "rennen2:Ampel", aus: "ergebnis:Endstand:-0.1", label: "Weg zur Bahn · 235 m",
    marken: AMPELN.map((a) => ({ anteil: a.x / ZIEL_M, label: String(a.id) })),
    teams: { a: (t) => clamp(MAX.x(tau(t)) / ZIEL_M), b: (t) => clamp(LEA.x(tau(t)) / ZIEL_M) },
    kurz: { a: "M", b: "L" },
  });

  // ---------- Rennen: Ampelschilder, Wartezähler, Chips, Stempel ----------
  const signalPunkt = (i, dx = 0) => [dx, 1.75, STR[i].fern - 0.18];
  hud.add(new AmpelNr(M, { nr: 1, text: "BEDARFSAMPEL", ein: "rennen1:Ampel", aus: "folgen:Folg-0.1", punkt: an(signalPunkt(0, -1.02)) }));
  hud.add(new AmpelNr(M, { nr: 2, text: "FESTER TAKT · 90 S", ein: "rennen2:Ampel", aus: "rennen2:Lea:-0.1", punkt: an(signalPunkt(1, -1.02)) }));
  hud.add(new AmpelNr(M, { nr: 3, text: "GRÜNE WELLE · 90 S", ein: "wendung2:Ampel", aus: "wendung2:spät.-0.05", punkt: an(signalPunkt(2, -1.02)) }));
  const wartet = (q, i, label = "WARTET") => {
    const ein = videoZeit(q.ankunft[i]) + 0.05, aus = videoZeit(q.gruen[i]) - 0.05;
    return M.zaehler({ ein, aus, wert: (t) => clamp(tau(t) - q.ankunft[i], 0, q.warte[i]), einheit: "s", max: 99, team: q === MAX ? "a" : "b", art: "voll", label, punkt: an(kopf(q), 0, -48) });
  };
  wartet(MAX, 0);
  wartet(LEA, 0);
  wartet(LEA, 1);
  wartet(MAX, 2);
  const tasterPunkt = (i, q) => [LAT[q.id] * 1.02, 0.7, STR[i].nah + 0.25];
  M.chip({ text: "SIGNAL KOMMT", ein: videoZeit(MAX.druecke[0][0]) + 0.05, aus: "folgen:Folg-0.15", art: "dunkel", x: SICHER.rechts, y: 470, anker: "rechts" });
  M.chip({ text: "SCHON GESPEICHERT", ein: "wendung1:Druck.", aus: "wendung1:Grün.-0.1", art: "voll", team: "b", x: SICHER.links, y: 455 });
  const sGleich = M.stempel({ text: "GLEICHSTAND!", ein: "wendung1:Grün.", aus: "rennen2:Ampel-0.05", x: 492, y: 480, winkel: -6, farbe: "akzent", groesse: 104 });
  M.melde({ t: T("wendung1:Grün."), typ: "wendung", klang: "ding" });
  anheften(M.chip({ text: "KNOPF OHNE WIRKUNG", ein: "rennen2:Takt.", aus: "rennen2:letzte-0.1", art: "dunkel", x: 0, y: 0 }), an(tasterPunkt(1, MAX)), { dy: -70 });
  anheften(M.chip({ text: "NOCH 1 S GRÜN", ein: "rennen2:letzte", aus: "rennen2:Lea:-0.05", art: "voll", team: "a", x: 0, y: 0 }), an(kopf(MAX)), { dy: -60 });
  const sRot = M.stempel({ text: "ROT!", ein: "rennen2:Rot.", aus: "wendung2:Ampel-0.1", x: 560, y: 480, winkel: 8, farbe: ROT, textFarbe: "weiss", groesse: 104 });
  M.melde({ t: T("rennen2:letzte"), typ: "fuehrung", klang: "ding", text: "Max vorn" });
  // Ampel 3: Ring bis zum Entscheidungszeitpunkt, dann bis zum nächsten Grün (an die Rennzeit gekoppelt)
  const ringNachTau = (r, tau0, tau1) => {
    const orig = r.update.bind(r);
    r.update = (t) => {
      let tt = t;
      if (t >= r.ein + 0.1 && t <= r.ein + r.dauer) tt = r.ein + 0.1 + clamp((tauRoh(t) - tau0) / (tau1 - tau0)) * (r.dauer - 0.1);
      orig(tt < r.ein + 0.1 && t >= r.ein + 0.1 ? r.ein + 0.1 : tt);
    };
    return r;
  };
  const DEC = A3.versatz - A3.entscheidung;
  const tR1 = T("wendung2:Ampel"), tR1e = videoZeit(DEC);
  ringNachTau(M.ring({ ein: tR1, dauer: Math.max(0.6, tR1e - tR1), von: Math.round(DEC - tauRoh(tR1 + 0.1)), bis: 0, label: "ANFORDERN", ende: "ZU!", team: "a", groesse: 150, aus: T("wendung2:Grün") - 0.15, x: 200, y: 700 }), tauRoh(tR1 + 0.1), DEC);
  const sSpaet = M.stempel({ text: "1 S ZU SPÄT!", ein: "wendung2:spät.", aus: "wendung2:Umlauf.-0.1", x: 470, y: 480, winkel: -7, farbe: ROT, textFarbe: "weiss", groesse: 100 });
  M.melde({ t: T("wendung2:spät."), typ: "wendung", klang: "ding" });
  const tR2 = T("wendung2:Grün"), tR2e = T("ergebnis:Grün");
  ringNachTau(M.ring({ ein: tR2, dauer: tR2e - tR2, von: Math.round(MAX.gruen[2] - tauRoh(tR2 + 0.1)), bis: 0, label: "NÄCHSTES GRÜN", ende: "GRÜN", team: "b", groesse: 150, aus: tR2e + 0.4, x: 200, y: 700 }), tauRoh(tR2 + 0.1), MAX.gruen[2]);
  anheften(M.chip({ text: "NÄCHSTER UMLAUF", ein: "wendung2:nächsten", aus: "wendung2:Lea-0.1", art: "voll", team: "a", x: 0, y: 0 }), an(kopf(MAX)), { dy: -140 });
  // Lea holt auf: Restweg bis Ampel 3
  M.zaehler({ ein: "wendung2:Lea", aus: videoZeit(LEA.ankunft[2]) + 0.1, wert: (t) => Math.max(0, Math.round(A3.x - LEA.x(tau(t)))), einheit: "m", max: 999, team: "b", art: "voll", label: "NOCH", punkt: an(kopf(LEA), 0, -48) });
  M.melde({ t: T("wendung2:holt"), typ: "wendung", klang: "whoosh" });
  const sBeide = M.stempel({ text: "GRÜN FÜR BEIDE!", ein: "ergebnis:Grün", aus: "ergebnis:Endstand:-0.1", x: 492, y: 480, winkel: -6, farbe: GRUEN, textFarbe: "weiss", groesse: 96 });

  // ---------- Folgen-Aufruf ----------
  M.folgen({ ein: "folgen:Folg", dauer: 1.8, y: 540, team: "a" });

  // ---------- Ergebnis ----------
  const sBahn = M.stempel({ text: "DIESELBE BAHN!", ein: "ergebnis:dieselbe", aus: "ergebnis:Max-0.1", x: 492, y: 840, winkel: -5, farbe: "akzent", groesse: 98 });
  M.bilanz({
    y: 330, ein: "ergebnis:Endstand:", aus: "warum:Nur-0.4", titel: "Endstand · dieselbe Bahn",
    zeilen: [
      { label: "MAX · GEDRÜCKT", wert: MAX.druckSumme, einheit: "×", team: "a", ein: "ergebnis:63-mal" },
      { label: "LEA · GEDRÜCKT", wert: LEA.druckSumme, einheit: "×", team: "b", ein: "ergebnis:dreimal." },
    ],
    differenz: { label: "ZEITGEWINN", wert: 0, einheit: "s", ein: T("ergebnis:dreimal.") + 0.42 },
  });

  // ---------- Warum? ----------
  const WS = { max: Math.round(MAX.warteSumme), lea: Math.round(LEA.warteSumme) };
  M.balken({
    y: 330, ein: "warum:Nur-0.25", aus: "ueberraschung:Und-0.35", titel: "Warum?", max: WS.max,
    faktoren: [
      { label: "DRÜCKE", ein: "warum:erste", a: { wert: (MAX.druckSumme / MAX.druckSumme) * WS.max, text: `${MAX.druckSumme}×` }, b: { wert: (LEA.druckSumme / MAX.druckSumme) * WS.max, text: `${LEA.druckSumme}×` }, tag: "NUR DER 1. ZÄHLT", tagEin: "warum:zählt." },
      { label: "WARTEZEIT", ein: "warum:schneller", a: { wert: WS.max, text: `${WS.max} s` }, b: { wert: WS.lea, text: `${WS.lea} s` }, tag: `+${WS.max - WS.lea} S FÜR MAX`, tagEin: "warum:länger" },
    ],
  });
  const kamUeber = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.5, 400);
  let regieUeber;
  const anUeber = (p, dx = 0, dy = 0) => (t) => { regieUeber.anwenden(t); const q = bild(p, kamUeber); return { x: q.x + dx, y: q.y + dy }; };

  // ---------- Zweite Überraschung: niemand drückt ----------
  const kamWas = new THREE.PerspectiveCamera(32, 1080 / 1920, 0.2, 400);
  let regieWas;
  const anWas = (p, dx = 0, dy = 0) => (t) => { regieWas.anwenden(t); const q = bild(typeof p === "function" ? p(t) : p, kamWas); return { x: q.x + dx, y: q.y + dy }; };
  anheften(M.chip({ text: "KEINE ANFORDERUNG", ein: "ueberraschung:keiner,", aus: "merksatz:Einmal-0.1", art: "dunkel", x: 0, y: 0 }), anWas([0, 0.55, STR[0].nah + 0.25]), { dy: -80 });
  M.zaehler({ ein: "ueberraschung:Drückt", aus: "merksatz:Einmal+0.4", wert: (t) => Math.max(0, wasTau(t)) / 60, nk: 1, einheit: "min", max: 99, team: ROT, art: "voll", label: "WARTEN", punkt: anWas([0, 1.15, STR[0].nah + 0.55], 0, -40) });
  const sBleibt = M.stempel({ text: "BLEIBT ROT!", ein: "ueberraschung:bleibt", aus: "ueberraschung:wartest.+0.3", x: 492, y: 480, winkel: -6, farbe: ROT, textFarbe: "weiss", groesse: 100 });
  anheften(M.chip({ text: "SIGNAL KOMMT", ein: tWasDrueck + 0.05, aus: "merksatz:reicht.", art: "voll", team: "b", x: 0, y: 0 }), anWas([LAT.lea * 1.02, 0.55, STR[0].nah + 0.25]), { dy: -80 });

  // ---------- Merksatz: Pointe ----------
  M.pointe({ text: "EINMAL | *REICHT.*", ein: "merksatz:Einmal", takt: 0.16, aus: "merksatz:Wann-0.1", y: 420, groesse: 158 });
  M.pointe({ text: "WANN DU KOMMST, | *ENTSCHEIDET.*", ein: "merksatz:Wann", takt: 0.14, aus: "schluss:Was-0.15", y: 420, groesse: 100, klang: "pop" });

  // ---------- Untertitel: Wort für Wort (Stil „kontur“), Teamwörter in Teamfarbe ----------
  const ut = M.untertitel({ stil: "kontur", groesse: 70, versteckt: [[T("schluss:Kommentare.>") + 0.5, DAUER + 1]] });
  for (const b of ut.bloecke) for (const w of b.woerter) {
    const nrm = normalisiere(w.wort);
    if (nrm.startsWith("max")) w.el.style.setProperty("--wf", MAX_F);
    else if (nrm.startsWith("lea")) w.el.style.setProperty("--wf", LEA_F);
  }

  // =====================================================================================
  // Kamera-Regie
  // =====================================================================================
  // blick: Kamera auf `ziel` aus Abstand/Höhenwinkel/Azimut; bildY = Bildzeile (px), in der das Ziel erscheinen soll
  const blick = ({ ziel, abstand, el: elev = 0.5, az = 0, fov = 34, bildY = 960 }) => {
    const d = ((bildY - 960) / 960) * abstand * Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const u = [-Math.sin(az) * Math.sin(elev) * d, Math.cos(elev) * d, -Math.cos(az) * Math.sin(elev) * d];
    const zi = [ziel[0] + u[0], ziel[1] + u[1], ziel[2] + u[2]];
    return { pos: [zi[0] + Math.sin(az) * Math.cos(elev) * abstand, zi[1] + Math.sin(elev) * abstand, zi[2] + Math.cos(az) * Math.cos(elev) * abstand], ziel: zi, fov };
  };
  const mitte = (t) => { const a = figurZustand(MAX, tau(t), t), b = figurZustand(LEA, tau(t), t); return [(a.pos[0] + b.pos[0]) / 2, 0.4, (a.pos[2] + b.pos[2]) / 2]; };
  const fuehrer = (t) => { const a = figurZustand(MAX, tau(t), t); return [0, 0.4, a.pos[2]]; };
  const WART = (i) => STR[i].nah + 0.55; // Wartepunkt vor Ampel i
  const S = {
    hook: (t) => { const k = ease.inOutSine(fortschritt(t, 0, T("regeln:Drei"))); return blick({ ziel: [0, 0.5, -0.2], abstand: 9.5 - 1.2 * k, el: 0.34, az: 0.14 - 0.06 * k, fov: 38, bildY: 1080 }); },
    ueberblick: (t) => { const k = fortschritt(t, T("regeln:Drei"), T("regeln:Max")); return blick({ ziel: [0, 0, -24 - 2 * k], abstand: 66 - 3 * k, el: 0.98, az: 0.1 - 0.05 * k, fov: 34, bildY: 820 }); },
    max: (t) => { const k = fortschritt(t, T("regeln:Max"), T("regeln:Lea")); return blick({ ziel: [0.3, 0.6, 0], abstand: 4.6 - 0.5 * k, el: 0.26, az: 0.55, fov: 34, bildY: 980 }); },
    lea: (t) => { const k = fortschritt(t, T("regeln:Lea"), T("falle:Klar,")); return blick({ ziel: [-0.3, 0.6, 0], abstand: 4.4 - 0.5 * k, el: 0.26, az: -0.55, fov: 34, bildY: 980 }); },
    zwei: (t) => { const k = fortschritt(t, T("falle:Klar,"), tLos); return blick({ ziel: [0, 0.45, -0.2], abstand: 9.5 - k, el: 0.4, az: 0.1, fov: 36, bildY: 1020 }); },
    rennen: (t) => { const f = fuehrer(t); return blick({ ziel: [0, 0.45, Math.min(-0.2, f[2] - 1.2)], abstand: 11, el: 0.5, az: 0.12, fov: 36, bildY: 980 }); },
    a1: (t) => { const k = fortschritt(t, T("rennen1:Ampel"), T("wendung1:Grün.")); return blick({ ziel: [0, 0.5, WART(0)], abstand: 7.6 - 1.0 * k, el: 0.42, az: 0.3 - 0.1 * k, fov: 34, bildY: 1000 }); },
    a1weg: (t) => { const m = mitte(t); return blick({ ziel: [0, 0.45, Math.min(STR[0].mitte, m[2] - 1.5)], abstand: 12, el: 0.52, az: 0.1, fov: 36, bildY: 980 }); },
    a2: (t) => { const k = fortschritt(t, T("rennen2:Ampel"), T("wendung2:Aber")); return blick({ ziel: [0, 0.45, WART(1)], abstand: 10.5 - 1.5 * k, el: 0.5, az: -0.35 + 0.1 * k, fov: 34, bildY: 960 }); },
    a3: (t) => { const k = fortschritt(t, T("wendung2:Aber"), T("wendung2:Lea")); return blick({ ziel: [0.45, 0.5, WART(2)], abstand: 8.2 - 1.2 * k, el: 0.44, az: 0.18 - 0.06 * k, fov: 34, bildY: 1060 }); },
    aufholen: (t) => { const l = figurZustand(LEA, tau(t), t); return blick({ ziel: [0, 0.3, lerp(l.pos[2], WART(2), 0.5)], abstand: 24, el: 0.78, az: 0.1, fov: 34, bildY: 900 }); },
    knapp: (t) => { const k = fortschritt(t, T("wendung2:Jetzt"), T("ergebnis:Grün")); return blick({ ziel: [0, 0.5, WART(2)], abstand: 8.6 - 1.2 * k, el: 0.44, az: 0.3, fov: 34, bildY: 1040 }); },
    insel: (t) => { const k = fortschritt(t, T("ergebnis:Grün"), T("warum:Warum?")); return blick({ ziel: [0.6, 0.5, INSEL.fern - 0.3], abstand: 12.5 - 1.5 * k, el: 0.4, az: -0.38 + 0.12 * k, fov: 36, bildY: 1040 }); },
  };
  const einstellungen = [
    { t: 0, d: 0, z: S.hook },
    { t: T("regeln:Drei") - 0.1, d: 0.8, z: S.ueberblick },
    { t: T("regeln:Max") - 0.1, d: 0.6, z: S.max },
    { t: T("regeln:Lea") - 0.1, d: 0.5, z: S.lea },
    { t: T("falle:Klar,") - 0.1, d: 0.6, z: S.zwei },
    { t: tLos - 0.05, d: 0.8, z: S.rennen },
    { t: T("rennen1:Ampel") - 0.35, d: 0.7, z: S.a1 },
    { t: T("wendung1:Grün.") + 0.25, d: 0.6, z: S.a1weg },
    { t: T("rennen2:Ampel") + 0.1, d: 0.8, z: S.a2 },
    { t: T("wendung2:Aber"), d: 0.8, z: S.a3 },
    { t: T("wendung2:Lea") - 0.1, d: 0.7, z: S.aufholen },
    { t: T("wendung2:Jetzt") - 0.1, d: 0.6, z: S.knapp },
    { t: T("ergebnis:Grün") + 0.3, d: 0.8, z: S.insel },
    { t: tLoop - 0.6, d: 0.01, z: S.hook },
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
  for (const s of [sKlar, sOder, sLos, sGleich, sRot, sSpaet, sBeide, sBahn]) regie.stoss({ t: s.ein + 0.1, staerke: 0.7 });
  regie.zoom({ t: "rennen1:drückt,", ziel: () => [0.7, 0.55, WART(0)], staerke: 0.16, halt: 0.9, rueck: 0.5 });
  regie.zoom({ t: "wendung2:spät.", ziel: () => [0.7, 0.55, WART(2)], staerke: 0.2, halt: 0.6, rueck: 0.5 });
  regie.atmen({ staerke: 0.012, tempo: 0.35 });
  regie.schleife({ ab: tLoop, ende: ENDE });

  // =====================================================================================
  // Welten aktualisieren
  // =====================================================================================
  // Autos (Videozeit-Uhr c, Rot aus dem Kfz-Signal der jeweiligen Ampel zur Rennzeit τ(c))
  const kfzRot = (st, tauFn) => (c) => { const z = st.kfz(tauFn(c)); return z === "gruen" ? null : z; };
  const AUTO_FARBEN = ["#F2F2F2", "#C9D3E3", "#D6DCE8", "#FFFFFF", "#8FA3C4", "#E6E1D8", "#F7C873", "#9BC6E8"];
  const spuren = [];
  const autosWelt = (st, i, tauFn, eltern, seed) => {
    const q = W.strassen[i];
    const liste = [];
    const nSp = i === 1 ? 2 : 1;
    for (const r of [1, -1]) for (let k = 0; k < nSp; k++) {
      liste.push(autoSpur({ richtung: r, z: STR[i].mitte + q.spurZ(r, k), halt: q.haltX(r) - r * 0.5, rot: kfzRot(st, tauFn), von: 0, bis: DAUER + 0.5, v: 3.4, takt: i === 1 ? 2.0 : 2.6, abstand: 1.35, laenge: 70, farben: AUTO_FARBEN, seed: seed + r * 3 + k * 7, eltern }));
    }
    return liste;
  };
  const gHaupt = new THREE.Group(), gWas = new THREE.Group();
  W.szene.add(gHaupt, gWas);
  for (let i = 0; i < 3; i++) spuren.push(...autosWelt(ST[i], i, tauRoh, gHaupt, 11 + i * 17));
  const spurenWas = autosWelt(WAS_ST, 0, wasTauRoh, gWas, 91);
  // Gegenfahrbahn hinter der Bahn (freier Verkehr)
  const gegenSpuren = [1, -1].map((r) => autoSpur({ richtung: r, z: INSEL.fern - 1.35 - 1.2 + r * 0.6, halt: -999, rot: () => null, von: 0, bis: DAUER + 0.5, v: 3.4, takt: 3.2, laenge: 70, farben: AUTO_FARBEN, seed: 300 + r, eltern: gHaupt }));
  const bahnX = (ta) => {
    if (ta < BAHN.an - 12) return 60;
    if (ta < BAHN.an) { const u = (ta - (BAHN.an - 12)) / 12; return 60 * (1 - u) ** 2.2; }
    if (ta < BAHN.ab) return 0;
    return -0.6 * (ta - BAHN.ab) ** 2;
  };
  const setzeSignale = (ampelNr, sigFn, kfzFn, kommtFn, druckFn) => {
    const o = W.ampeln[ampelNr];
    const s = sigFn();
    for (const f of o.fern) f.setze(s);
    for (const f of o.nah) f.setze(s);
    const k = kfzFn();
    o.kfz[0].setze(k); o.kfz[1].setze(k);
    for (const id of ["lea", "max"]) o.taster[id].setze({ kommt: kommtFn(), druck: druckFn(id) });
  };
  const sonneFolgt = (ziel, bereich) => {
    const s = W.licht.sonne;
    const d = new THREE.Vector3(-0.45, 1.0, 0.5).normalize().multiplyScalar(40);
    s.position.set(ziel[0] + d.x, d.y, ziel[2] + d.z);
    s.target.position.set(ziel[0], 0, ziel[2]);
    s.target.updateMatrixWorld();
    const c = s.shadow.camera;
    if (c.right !== bereich) { c.left = -bereich; c.right = bereich; c.top = bereich; c.bottom = -bereich; c.updateProjectionMatrix(); }
  };

  const setzePassanten = (c, t) => {
    for (const p of W.passanten) {
      const x = ((((p.x0 + p.r * p.v * c) % 52) + 78) % 52) - 26;
      setzeFussgaenger(p.f, { pos: [x, 0, p.z], richtung: p.r > 0 ? Math.PI / 2 : -Math.PI / 2, phase: (p.v * c) / 0.16, lauf: 1, tempo: 0.2, zeit: t });
    }
  };
  const setzeHaupt = (t) => {
    gHaupt.visible = true; gWas.visible = false;
    const ta = tau(t);
    const c = uhrAuto(t);
    for (const s of spuren) s.setze(c);
    for (const s of gegenSpuren) s.setze(c);
    for (const q of [MAX, LEA]) {
      const z = figurZustand(q, ta, t);
      const f = q === MAX ? W.max : W.lea;
      const vorStart = ta <= 0.05;
      setzeFussgaenger(f, {
        pos: z.pos, richtung: Math.PI, phase: z.schritt, lauf: z.lauf, tempo: q === MAX ? 1 : 0.25,
        druecken: z.druecken, stoss: z.stoss, seite: -LAT[q.id], zeit: t,
        ungeduld: q === MAX ? (z.wartet || vorStart ? 1 : 0) : 0,
        huepf: q === MAX && vorStart ? Math.abs(Math.sin(t * 6.5)) * 0.03 : 0,
        verschraenkt: q === LEA && z.wartet && z.druecken < 0.05 ? clamp((ta - q.ankunft[z.ampel] - 2) / 1.5) : 0,
        schauen: vorStart ? (q === MAX ? 0.25 * Math.sin(t * 1.3) : -0.15 * Math.sin(t * 0.9)) : 0,
      });
    }
    for (let i = 0; i < 3; i++) {
      setzeSignale(i, () => ST[i].signal(ta), () => ST[i].kfz(ta), () => ST[i].signalKommt(ta), (id) => {
        const q = id === "max" ? MAX : LEA;
        let d = 0;
        for (const p of PRESS_V[id][i] || []) d = Math.max(d, Math.exp(-(((t - p) / 0.06) ** 2)));
        return d;
      });
    }
    setzePassanten(c, t);
    W.bahn.gruppe.position.x = bahnX(ta);
    W.bahn.setzeTueren(clamp((ta - BAHN.tuerAuf) / 1.2) * (1 - clamp((ta - (BAHN.ab - 1.5)) / 1.2)));
  };
  const post = (fokus, staerke = 0.7) => ({ tiltMitte: fokus, tiltBreite: 0.26, tiltStaerke: staerke, bloomStaerke: 0.5, bloomSchwelle: 1.1, belichtung: 0.9, vignette: 0.2, saettigung: 1.22, kontrast: 1.1, koernung: 0.014 });
  const fokusPunkt = (t) => {
    if (t < T("regeln:Drei") - 0.1) return [0, 0.45, -0.2];
    if (t < T("regeln:Max") - 0.1) return [0, 0, -20];
    if (t < tLos) return [0, 0.6, 0];
    if (t >= tLoop - 0.6) return [0, 0.45, -0.2];
    if (t >= T("ergebnis:Grün") + 0.3) return [0.5, 0.5, INSEL.fern - 0.3];
    if (t >= T("wendung2:Lea") - 0.1 && t < T("wendung2:Jetzt")) { const l = figurZustand(LEA, tau(t), t); return [0, 0.3, lerp(l.pos[2], WART(2), 0.5)]; }
    if (t >= T("wendung2:Aber")) return [0, 0.5, WART(2)];
    if (t >= T("rennen2:Ampel") + 0.1) return [0, 0.5, WART(1)];
    if (t >= T("rennen1:Ampel") - 0.35 && t < T("wendung1:Grün.") + 0.25) return [0, 0.5, WART(0)];
    return mitte(t);
  };
  const weltHaupt = {
    szene: W.szene, kamera, post: post(0.4),
    update(t) {
      setzeHaupt(t);
      const z = regie.anwenden(t);
      sonneFolgt(z.ziel, t >= T("regeln:Drei") - 0.1 && t < T("regeln:Max") ? 30 : 16);
      this.post = post(fokusHoehe(fokusPunkt(t), kamera));
    },
  };

  // Überblick (Warum?): Luftbild über den drei Ampeln, langsame Drehung; Figuren an der Insel, Bahn steht
  const tWarum = T("warum:Warum?");
  regieUeber = new Regie(kamUeber, (t) => {
    const k = fortschritt(t, tWarum - 0.4, tWas);
    return blick({ ziel: [0, 0, -24 - 3 * k], abstand: 58 - 6 * k, el: 1.0 + 0.1 * k, az: 0.2 - 0.25 * k, fov: 30 });
  }, { zp });
  M.melde({ t: tWarum, typ: "kamera", art: "fahrt", dauer: tWas - tWarum, klang: false });
  const weltUeber = {
    szene: W.szene, kamera: kamUeber, post: post(0.45),
    update(t) {
      setzeHaupt(t);
      regieUeber.anwenden(t);
      sonneFolgt([0, 0, -24], 32);
      this.post = { ...post(0.38), tiltBreite: 0.32, tiltStaerke: 0.7 };
    },
  };

  // Was wäre, wenn keiner drückt? Ampel 1 aus der Nähe, beide warten; dann drückt Lea einmal
  regieWas = new Regie(kamWas, (t) => {
    const k = fortschritt(t, tWas - 0.4, tLoop);
    return blick({ ziel: [0, 0.5, STR[0].nah + 0.55 - 1.4 * ease.inOutSine(fortschritt(t, T("merksatz:reicht."), tLoop))], abstand: 7.6 - 1.4 * k, el: 0.38, az: -0.3 + 0.45 * k, fov: 34, bildY: 1090 });
  }, { zp });
  regieWas.atmen({ staerke: 0.012, tempo: 0.35 });
  regieWas.stoss({ t: sBleibt.ein + 0.1, staerke: 0.7 });
  M.melde({ t: tWas, typ: "kamera", art: "fahrt", dauer: tLoop - tWas, klang: false });
  const tWasGruen = WAS_ST.gruenAb(600);
  const weltWas = {
    szene: W.szene, kamera: kamWas, post: post(0.4),
    update(t) {
      gHaupt.visible = false; gWas.visible = true;
      for (const s of spurenWas) s.setze(t);
      for (const s of gegenSpuren) s.setze(uhrAuto(t));
      setzePassanten(uhrAuto(t), t);
      const wt = wasTau(t);
      const geht = clamp((wt - tWasGruen) / 8);
      for (const q of [LEA, MAX]) {
        const f = q === MAX ? W.max : W.lea;
        const x = LAT[q.id] * 0.52;
        const z = lerp(STR[0].nah + 0.32, STR[0].fern - 0.8, geht);
        const pv = q === LEA ? [tWasDrueck] : [];
        let druecken = 0, stoss = 0;
        if (pv.length) { druecken = clamp((t - (pv[0] - 0.3)) / 0.2) * (1 - clamp((t - (pv[0] + 0.45)) / 0.3)); stoss = Math.exp(-(((t - pv[0]) / 0.07) ** 2)); }
        const warten = geht <= 0;
        setzeFussgaenger(f, { pos: [x, 0, z], richtung: Math.PI, phase: geht * 9, lauf: geht > 0 && geht < 1 ? 1 : 0, tempo: 0.2,
          druecken, stoss, seite: -LAT[q.id], zeit: t,
          verschraenkt: warten && druecken < 0.05 ? clamp((t - tWas) / 0.6) : 0, ungeduld: warten && q === MAX ? 0.6 : 0,
          schauen: warten ? (q === MAX ? 0.4 * Math.sin(t * 1.7) : -0.3 * Math.sin(t * 1.1 + 1)) : 0 });
      }
      setzeSignale(0, () => WAS_ST.signal(wt), () => WAS_ST.kfz(wt), () => WAS_ST.signalKommt(wt), (id) => (id === "lea" ? Math.exp(-(((t - tWasDrueck) / 0.06) ** 2)) : 0));
      for (let i = 1; i < 3; i++) setzeSignale(i, () => ST[i].signal(tau(t)), () => ST[i].kfz(tau(t)), () => false, () => 0);
      W.bahn.gruppe.position.x = 60;
      const z = regieWas.anwenden(t);
      sonneFolgt(z.ziel, 12);
      this.post = post(fokusHoehe([0, 0.4, STR[0].nah + 0.3], kamWas));
    },
  };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltHaupt);
  zl.shot(tWarum - 0.1, weltUeber, { typ: "zoomwisch", dauer: 0.5, richtung: [0.2, 1], mitte: [0.5, 0.45] });
  zl.shot(tWas - 0.1, weltWas, { typ: "blasen", dauer: 0.7 });
  zl.shot(tLoop + 0.1, weltHaupt, { typ: "wolken", dauer: 0.9, mitte: [0.5, 0.55] });

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
  for (const t of [0, tLos + 1, tWarum + 1, tWas + 1]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = { max: { ankunft: MAX.ankunft, gruen: MAX.gruen, warte: MAX.warte, druecke: MAX.druckSumme, insel: MAX.insel }, lea: { ankunft: LEA.ankunft, gruen: LEA.gruen, warte: LEA.warte, druecke: LEA.druckSumme, insel: LEA.insel }, keys };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
