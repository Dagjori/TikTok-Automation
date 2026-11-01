// Demo · Maßstab-Bausteine (docs/15): „Rasen oder rollen? Wer gewinnt?“ – zeigt alle neuen Bausteine in ca. 13 s.
// Kein Video zum Posten: Beispielwerte, geschätztes Timing (keine Stimme). Deterministisch: window.renderAt(t).
//
// Bausteine: Titel, Anzeigetafel (Live-Zähler, vs → Renn-Uhr, Führungswechsel), Stoppuhr, Countdown-Ring, Chips,
// Sticker/Stempel, Fortschrittsleiste, schwebende Live-Zähler, Bilanz-, Aufschlüsselungs- und Formelkarte, Pointe,
// Folgen-Aufruf, Phrasen-Untertitel; Kamera folgt, zoomt auf den Moment, Stöße; Übergänge Zoom-Wisch, Blasen, Wolken;
// Schleife (letztes Bild = erstes Bild).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, keyframes } from "../../engine/bewegung.js";
import { auto, haus, baum, strasse, rundeBox, mat, leucht, kontaktSchatten, FARBE } from "../../engine/bausteine.js";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.55;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Autos, Tafel, Chips, Leiste, Untertitel)
const TEAM_A = "#FF5A4E"; // Raser (Koralle)
const TEAM_B = "#13B5A6"; // Roller (Türkis)
const ROT = "#F0443A";

// =====================================================================================
// Modell (Beispielwerte): 2 km, 6 Ampeln, Raser 60 km/h mit zwei Rotphasen, Roller 40 km/h in der grünen Welle
// =====================================================================================
const STRECKE = 2000;
const AMPEL_M = [1, 2, 3, 4, 5, 6].map((k) => (STRECKE * k) / 7);
const M_PRO_E = 10; // 1 Welteinheit = 10 m

/** Fahrplan integrieren: Phasen [{bis (m), v (m/s), halt}|{warten (s)}], a: Beschleunigung, b: Bremsung → Tabelle τ → x */
function fahrplan(phasen, { a = 3.0, b = 3.5, dt = 0.02, bis = 320 } = {}) {
  const tab = [];
  let x = 0, v = 0, tau = 0, i = 0, warten = 0;
  while (tau <= bis) {
    tab.push(x);
    const p = phasen[Math.min(i, phasen.length - 1)];
    if (p.warten !== undefined) {
      warten += dt;
      v = 0;
      if (warten >= p.warten - 1e-9) { i++; warten = 0; }
    } else {
      const rest = p.bis - x;
      const bremsweg = (v * v) / (2 * b);
      if (p.halt && rest <= bremsweg + 1e-6) v = Math.max(0, v - b * dt);
      else v = Math.min(p.v, v + a * dt);
      x += v * dt;
      if (p.halt && (rest <= 0.02 || (v === 0 && rest < 1))) { x = p.bis; v = 0; i++; }
      if (!p.halt && x >= p.bis) i++;
    }
    tau += dt;
  }
  return { dt, tab, x: (t) => {
    if (t <= 0) return 0;
    const k = t / dt, j = Math.floor(k);
    if (j >= tab.length - 1) return tab[tab.length - 1];
    return lerp(tab[j], tab[j + 1], k - j);
  } };
}
const kreuzt = (f, ziel, von = 0) => { // erster Zeitpunkt mit f(τ) ≥ ziel
  for (let t = von; t < 400; t += 0.01) if (f(t) >= ziel) return t;
  return Infinity;
};
function baueModell() {
  const V_A = 60 / 3.6, V_B = 40 / 3.6;
  const W1 = 40;
  const roller = fahrplan([{ bis: STRECKE + 80, v: V_B, halt: true }], { a: 1.6, b: 1.2 });
  const T_B = kreuzt(roller.x, STRECKE);
  const raserMit = (W2) => fahrplan([
    { bis: AMPEL_M[1], v: V_A, halt: true }, { warten: W1 },
    { bis: AMPEL_M[3], v: V_A, halt: true }, { warten: W2 },
    { bis: STRECKE + 70, v: V_A, halt: true },
  ]);
  // zweite Rotphase so wählen, dass der Roller genau 12 s vorn liegt
  const T0 = kreuzt(raserMit(0).x, STRECKE);
  const W2 = Math.round((T_B + 12 - T0) * 50) / 50;
  const raser = raserMit(W2);
  const T_A = kreuzt(raser.x, STRECKE);
  const ankunft1 = kreuzt(raser.x, AMPEL_M[1] - 0.05);
  const abfahrt1 = ankunft1 + W1;
  const ankunft2 = kreuzt(raser.x, AMPEL_M[3] - 0.05, abfahrt1);
  const abfahrt2 = ankunft2 + W2;
  let fuehrung = null; // Roller zieht vorbei
  for (let t = 1; t < T_B; t += 0.01) if (roller.x(t) > raser.x(t) + 0.01) { fuehrung = t; break; }
  return { raser, roller, T_A, T_B, W1, W2, ankunft1, abfahrt1, ankunft2, abfahrt2, fuehrung, V_A, V_B };
}

// =====================================================================================
// Welt: Miniatur-Straße mit zwei Spuren, Ampelbrücken, Start/Ziel, Häuser und Bäume
// =====================================================================================
function textTextur(text, { b = 512, h = 128, farbe = "#FFFFFF", grund = "#12151D" } = {}) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  const g = c.getContext("2d");
  g.fillStyle = grund; g.fillRect(0, 0, b, h);
  g.fillStyle = farbe;
  g.font = `900 ${Math.round(h * 0.62)}px "SB Display", Inter, sans-serif`;
  g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, b / 2, h * 0.54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function schachTextur(n = 8, m = 2) {
  const c = document.createElement("canvas");
  c.width = n * 16; c.height = m * 16;
  const g = c.getContext("2d");
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { g.fillStyle = (i + j) % 2 ? "#12151D" : "#FFFFFF"; g.fillRect(i * 16, j * 16, 16, 16); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

function baueWelt(buehne) {
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#9CC7FF"], [0.45, "#CFE4FF"], [0.62, "#EAF2FB"], [1, "#F6EFE2"]]);
  szene.fog = new THREE.Fog("#DCE9F7", 38, 120);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 16, schattenKarte: SCHATTEN, sonnenRichtung: [-0.35, 1.0, 0.55], sonnenStaerke: 2.8, umgebungsStaerke: 0.6, schattenWeich: 3 });
  const L = STRECKE / M_PRO_E;
  // Boden
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(900, 300), mat("#96D07A", { rau: 1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.position.set(L / 2, -0.01, 0);
  boden.receiveShadow = true;
  szene.add(boden);
  // Straße (2 Spuren), Gehwege
  const s = strasse({ laenge: L + 120, breite: 3.0, farbe: "#646E87" });
  s.position.x = L / 2 + 20;
  szene.add(s);
  for (const z of [-1.95, 1.95]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(L + 120, 0.08, 0.9), mat("#EFE6D6", { rau: 0.95 }));
    g.position.set(L / 2 + 20, 0.04, z);
    g.receiveShadow = true;
    szene.add(g);
  }
  // Start- und Ziellinie
  const startLinie = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3.0), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.6 }));
  startLinie.rotation.x = -Math.PI / 2;
  startLinie.position.set(0.6, 0.046, 0);
  szene.add(startLinie);
  const ziel = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 3.0), new THREE.MeshStandardMaterial({ map: schachTextur(2, 10), roughness: 0.6 }));
  ziel.rotation.x = -Math.PI / 2;
  ziel.position.set(L, 0.047, 0);
  szene.add(ziel);
  // Zielbogen mit Banner
  const bogen = new THREE.Group();
  for (const z of [-1.9, 1.9]) {
    const p = rundeBox(0.16, 2.6, 0.16, { farbe: "#12151D", radius: 0.05 });
    p.position.set(0, 0, z);
    bogen.add(p);
  }
  const banner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 4.0), [mat("#12151D"), mat("#12151D"), mat("#12151D"), mat("#12151D"), new THREE.MeshStandardMaterial({ map: textTextur("ZIEL", { grund: "#12151D", farbe: "#FFD23F" }), roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: textTextur("ZIEL"), roughness: 0.6 })]);
  banner.rotation.y = Math.PI / 2;
  banner.position.set(0, 2.45, 0);
  banner.castShadow = true;
  bogen.add(banner);
  bogen.position.x = L + 0.15;
  szene.add(bogen);
  // Ampelbrücken: je Spur ein Signal (rot oben, grün unten), Blick gegen die Fahrtrichtung
  const ampeln = AMPEL_M.map((m) => {
    const g = new THREE.Group();
    g.position.x = m / M_PRO_E;
    for (const z of [-1.9, 1.9]) {
      const p = rundeBox(0.12, 2.1, 0.12, { farbe: "#3A4152", radius: 0.04 });
      p.position.set(0, 0, z);
      g.add(p);
    }
    const quer = rundeBox(0.12, 0.12, 3.92, { farbe: "#3A4152", radius: 0.04 });
    quer.position.set(0, 2.0, 0);
    g.add(quer);
    const spuren = [-0.75, 0.75].map((z) => {
      const k = rundeBox(0.22, 0.52, 0.26, { farbe: "#12151D", radius: 0.06 });
      k.position.set(0, 1.46, z);
      g.add(k);
      const r = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: "#331818" }));
      r.position.set(-0.12, 1.84, z);
      const gr = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), new THREE.MeshBasicMaterial({ color: "#123322" }));
      gr.position.set(-0.12, 1.6, z);
      g.add(r, gr);
      return { r: r.material, g: gr.material };
    });
    // Haltelinie
    const hl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 3.0), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.7 }));
    hl.rotation.x = -Math.PI / 2;
    hl.position.set(-0.55, 0.046, 0);
    g.add(hl);
    szene.add(g);
    return { m, spuren };
  });
  // Häuser und Bäume
  const WAND = ["#FFF6EA", "#FCE7D4", "#E9F1FF", "#F7F1FF", "#FFFFFF", "#EAF7EE"];
  const DACH = ["#FF8A5C", "#5B8DEF", "#F2B544", "#7AC48F", "#E86A7E", "#8C7AE6"];
  for (let seite = -1; seite <= 1; seite += 2) {
    let x = -26 + hash(seite + 5, 3) * 2;
    let n = 0;
    while (x < L + 40) {
      const r = hash(n * 7 + (seite > 0 ? 1 : 0), 11);
      if (r < 0.62) {
        const h = haus({ breite: 1.4 + hash(n, 2) * 0.7, tiefe: 1.2, hoehe: 0.95 + hash(n, 5) * 0.6, wand: WAND[Math.floor(hash(n, 7) * WAND.length)], dach: DACH[Math.floor(hash(n, 9) * DACH.length)] });
        const obj = h.gruppe || h;
        obj.position.set(x, 0, seite * (3.6 + hash(n, 13) * 0.5));
        obj.rotation.y = seite < 0 ? 0 : Math.PI;
        szene.add(obj);
        x += 2.3 + hash(n, 17) * 0.8;
      } else {
        const b = baum({ groesse: 0.9 + hash(n, 19) * 0.6, seed: n });
        b.position.set(x, 0, seite * (3.0 + hash(n, 23) * 1.2));
        szene.add(b);
        x += 1.1 + hash(n, 29) * 0.7;
      }
      n++;
    }
    // zweite Reihe Bäume (Tiefe)
    for (let k = 0; k < 90; k++) {
      const b = baum({ groesse: 1.1 + hash(k, 31) * 0.8, seed: k + 100, farbe: "#58B574", farbe2: "#7FCB8F" });
      b.position.set(-30 + k * 3.2 + hash(k, 37) * 1.5, 0, seite * (6.2 + hash(k, 41) * 3));
      szene.add(b);
    }
  }
  // Autos
  const raser = auto({ farbe: TEAM_A, laenge: 1.05 });
  const roller = auto({ farbe: TEAM_B, laenge: 1.05 });
  raser.scale.setScalar(0.9);
  roller.scale.setScalar(0.9);
  szene.add(raser, roller);
  // Teamfarbene Bodenmarke unter den Autos
  const marke = (farbe) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.2), transparent: true, opacity: 0.45, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.scale.set(0.95, 0.55, 1);
    m.renderOrder = 2;
    szene.add(m);
    return m;
  };
  return { szene, licht, ampeln, raser, roller, marken: { raser: marke(TEAM_A), roller: marke(TEAM_B) } };
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
  const ENDE = DAUER - 1 / FPS; // letztes Bild
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const MOD = baueModell();
  const W = baueWelt(buehne);
  const L = STRECKE / M_PRO_E;

  // ---------- Zeitraffer: Videozeit → Rennzeit τ (Sekunden im Modell) ----------
  const tLos = T("Los"), tRot = T("Rot!"), tUe = T("Überholt!"), tZiel = T("Ziel.");
  const tauRoh = (() => {
    const keys = [
      { t: 0, v: 0 }, { t: tLos, v: 0 },
      { t: tRot, v: MOD.ankunft1 + 0.6, e: ease.inQuad },
      { t: tUe, v: MOD.fuehrung + 2.5, e: ease.linear },
      { t: tZiel, v: MOD.T_B, e: ease.linear },
      { t: T("Vorsprung.>"), v: MOD.T_A + 5, e: ease.linear },
      { t: DAUER, v: MOD.T_A + 14, e: ease.outCubic },
    ];
    return (t) => keyframes(keys, t);
  })();
  const videoZeit = (tau) => { // Umkehrung (monoton): Videozeit zu einer Rennzeit
    let a = tLos, b = DAUER;
    for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (tauRoh(m) < tau) a = m; else b = m; }
    return (a + b) / 2;
  };
  const xA = (t) => MOD.raser.x(tauRoh(t)), xB = (t) => MOD.roller.x(tauRoh(t));
  const kmh = (plan, tau) => Math.round(((plan.x(tau + 0.3) - plan.x(tau - 0.3)) / 0.6) * 3.6);

  // =====================================================================================
  // HUD und Bausteine
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "RASER", farbe: TEAM_A, woerter: ["Rasen", "Raser*"] },
      b: { name: "ROLLER", farbe: TEAM_B, woerter: ["rollen", "Roller*"] },
    },
  });
  // Schleife: ab der Wolkenwand kehren Tafel, Kamera und Autos in den Anfangszustand zurück
  const tWolke = T("Kommentare.");
  M.schleife({ ab: tWolke - 0.5, ende: ENDE });
  const tau = M.wert(tauRoh); // schleifenfeste Rennzeit (Ampeln)
  // Autos: Positionen schleifenfest (gleiten wie die Kamera zurück, bleiben dadurch beim Zurückspulen im Bild)
  const posSchleife = { a: M.wert((t) => xA(t)), b: M.wert((t) => xB(t)) };

  // ---------- Anzeigetafel oben (ab dem ersten Bild) ----------
  M.tafel({
    y: 166,
    links: { team: "a", einheit: "km", nk: 1, max: 2 },
    rechts: { team: "b", einheit: "km", nk: 1, max: 2 },
    werte: (t) => ({ a: Math.min(STRECKE, xA(t)) / 1000, b: Math.min(STRECKE, xB(t)) / 1000 }),
    anteil: (t) => ({ a: Math.min(1, xA(t) / STRECKE), b: Math.min(1, xB(t) / STRECKE) }),
    uhr: { ein: "Los", zeit: (t) => Math.min(MOD.T_A, tauRoh(t)) },
  });

  // ---------- Hook: Titel baut sich Wort für Wort auf ----------
  M.titel({
    y: 372, groesse: 132, aus: "Zwei-0.15",
    woerter: [
      { text: "RASEN", ein: "Rasen-0.04", team: "a" }, { art: "vs", ein: "oder" }, { text: "ROLLEN", ein: "rollen?-0.04", team: "b" },
      { umbruch: true },
      { text: "WER", ein: "Wer-0.04", art: "klein" }, { text: "GEWINNT?", ein: "gewinnt?-0.04", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips (synchron zum Wort) ----------
  M.chips({ y: 404, ausrichtung: "mitte", aus: "Los-0.12", liste: [
    { text: "2 KM", ein: "Zwei-0.03", art: "voll", team: "akzent", gross: true },
    { text: "6 AMPELN", ein: "sechs-0.03", art: "dunkel", gross: true },
  ] });
  M.chips({ y: 524, ausrichtung: "mitte", aus: "Los-0.12", liste: [
    { text: "60 KM/H", ein: "Raser.-0.03", art: "voll", team: "a" },
    { text: "40 KM/H", ein: "Raser.+0.22", art: "voll", team: "b" },
  ] });

  // ---------- Folgen-Aufruf (im echten Video bei ca. 20 s, hier früh) ----------
  M.folgen({ ein: "Zwei", dauer: 1.8, y: 940, team: "a" });

  // ---------- Fortschrittsleiste mit Ampel-Marken ----------
  M.leiste({
    y: 1178, ein: "sechs", aus: "Was", label: "2 km · 6 Ampeln",
    marken: AMPEL_M.map((m, i) => ({ anteil: m / STRECKE, label: String(i + 1) })),
    teams: { a: (t) => Math.min(1, xA(t) / STRECKE), b: (t) => Math.min(1, xB(t) / STRECKE) },
  });

  // ---------- Denkfalle und Start: Sticker ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "Klar,", x: 340, y: 740, winkel: -8, farbe: "akzent" });
  const sOder = M.stempel({ text: "ODER?", ein: "falle:Oder?", aus: "Los-0.06", x: 620, y: 830, winkel: 7, farbe: "weiss", textFarbe: "tinte" });
  const sLos = M.stempel({ text: "LOS GEHT'S!", ein: "Los", aus: "Rot!-0.05", x: 492, y: 760, winkel: -5, farbe: "#19B36B", groesse: 112 });
  const sUe = M.stempel({ text: "ÜBERHOLT!", ein: "Überholt!-0.02", aus: "Ziel.-0.12", x: 492, y: 700, winkel: -9, art: "stempel", farbe: "b", groesse: 120 });

  // ---------- Stoppuhr im Zeitraffer ----------
  M.uhr({ ein: "Los+0.12", aus: "Ziel.-0.1", x: 186, y: 352, groesse: 196, team: "b", label: "ZEITRAFFER", zeit: (t) => Math.min(MOD.T_A, tauRoh(t)) });

  // ---------- Kamera und Projektion (für Ring und schwebende Zähler) ----------
  const kamRennen = new THREE.PerspectiveCamera(40, 1080 / 1920, 0.1, 400);
  const posA = (t) => V(xA(t) / M_PRO_E, 0, -0.75), posB = (t) => V(xB(t) / M_PRO_E, 0, 0.75);
  const bildpunkt = (p, k) => { const v = p.clone().project(k); return { x: ((v.x + 1) / 2) * 1080, y: ((1 - v.y) / 2) * 1920 }; };
  const imRennen = (t) => t < tZiel - 0.15;

  // ---------- Pausen-Ring an der roten Ampel ----------
  const tAb1 = videoZeit(MOD.abfahrt1);
  const ampel2 = V(AMPEL_M[1] / M_PRO_E, 2.6, -0.75);
  M.ring({ ein: "Rot!-0.02", dauer: Math.max(0.5, tAb1 - tRot), von: MOD.W1, bis: 0, label: "ROT", ende: "GRÜN", team: ROT, groesse: 136, aus: Math.min(tAb1 + 0.2, tZiel - 0.2),
    punkt: (t) => { regie.anwenden(t); const p = bildpunkt(ampel2, kamRennen); return { x: p.x + 170, y: p.y - 60 }; } });

  // ---------- Schwebende Live-Zähler über den Autos (Tempo) ----------
  const ueberAuto = (pos) => (t) => { regie.anwenden(t); const p = bildpunkt(pos(t).add(V(0, 1.05, 0)), kamRennen); return { x: p.x, y: p.y - 30 }; };
  M.zaehler({ ein: "Los+0.15", aus: "Ziel.-0.15", wert: (t) => Math.max(0, kmh(MOD.raser, tauRoh(t))), einheit: "km/h", max: 99, team: "a", punkt: ueberAuto(posA) });
  M.zaehler({ ein: "Los+0.25", aus: "Ziel.-0.15", wert: (t) => Math.max(0, kmh(MOD.roller, tauRoh(t))), einheit: "km/h", max: 99, team: "b", punkt: ueberAuto(posB) });

  // ---------- Ergebnis: Bilanzkarte Zeile für Zeile ----------
  const TA = Math.round(MOD.T_A), TB = Math.round(MOD.T_B), STEH = Math.round(MOD.W1 + MOD.W2), FAHR = TA - STEH;
  M.bilanz({
    y: 400, ein: "Zwölf-0.2", aus: "Was+0.02", titel: "Endstand",
    zeilen: [
      { label: "ROLLER", wert: TB, einheit: "s", team: "b", ein: "Zwölf" },
      { label: "RASER", wert: TA, einheit: "s", team: "a", ein: "Sekunden" },
    ],
    differenz: { label: "VORSPRUNG", wert: TA - TB, einheit: "s", ein: "Vorsprung." },
    sieger: { text: "ROLLER GEWINNT", team: "b", ein: "Vorsprung.+0.2" },
  });

  // ---------- Warum? Aufschlüsselung (2 Faktoren) ----------
  M.balken({
    y: 400, ein: "sollen-0.1", aus: "Nächstes-0.1", titel: "Warum?", max: Math.max(FAHR, TB, STEH),
    faktoren: [
      { label: "STEHZEIT", ein: "sollen", a: { wert: STEH }, b: { wert: 0 }, tag: `+${STEH} S`, tagEin: "wir" },
      { label: "FAHRZEIT", ein: "wir+0.1", a: { wert: FAHR }, b: { wert: TB }, tag: `${FAHR - TB} S`.replace("-", "−"), tagEin: "als+0.05" },
    ],
  });

  // ---------- Formelkarte ----------
  M.formel({
    y: 420, aus: "Schreib-0.12", titel: "Raser",
    teile: [
      { text: String(FAHR), einheit: "s", ein: "Nächstes", team: "a" },
      { text: "+", ein: "Nächstes+0.14" },
      { text: String(STEH), einheit: "s", ein: "Nächstes+0.28", team: "a" },
      { text: "=", ein: "zeigen?" },
      { text: String(TA), einheit: "s", ein: "zeigen?+0.14", art: "erg" },
    ],
    unter: { text: `ROLLER: ${TB} S`, ein: "zeigen?>+0.05", team: "b" },
  });

  // ---------- Pointe ----------
  M.pointe({ text: "ROLLEN | *GEWINNT.*", ein: "Schreib", takt: 0.16, aus: "die", y: 560, groesse: 168 });

  // ---------- Untertitel (Phrasen, Schlüsselwörter in Teamfarbe) ----------
  M.untertitel({ unten: 1450, groesse: 60, schluessel: { "Vorsprung.": "akzent" } });

  // =====================================================================================
  // 3D: Welten und Regie
  // =====================================================================================
  const setzeWelt = (t) => {
    const ta = tau(t);
    const a = posSchleife.a(t) / M_PRO_E, b = posSchleife.b(t) / M_PRO_E;
    W.raser.position.set(a, 0, -0.75);
    W.roller.position.set(b, 0, 0.75);
    W.marken.raser.position.set(a, 0.05, -0.75);
    W.marken.roller.position.set(b, 0.05, 0.75);
    // Ampeln: Spur des Rasers rot, solange er an Ampel 2 bzw. 4 wartet (und kurz davor), sonst grün
    W.ampeln.forEach((am, i) => {
      const rot = (i === 1 && ta > MOD.ankunft1 - 4 && ta < MOD.abfahrt1) || (i === 3 && ta > MOD.ankunft2 - 4 && ta < MOD.abfahrt2);
      am.spuren.forEach((s, j) => {
        const r = j === 0 && rot;
        s.r.color.set(r ? "#FF2B1F" : "#3A1E1E").multiplyScalar(r ? 4 : 1);
        s.g.color.set(r ? "#123322" : "#22E07A").multiplyScalar(r ? 1 : 3);
      });
    });
    return { a, b };
  };
  const sonneFolgt = (x) => {
    const s = W.licht.sonne;
    const d = new THREE.Vector3(-0.35, 1.0, 0.55).normalize().multiplyScalar(40);
    s.position.set(x + d.x, d.y, d.z);
    s.target.position.set(x, 0, 0);
    s.target.updateMatrixWorld();
  };

  // Rennen: Kamera hinter den Autos, Straße läuft ins Bild; folgt dem Paar, zoomt bei „Rot!“, Stöße bei Stickern.
  // Der Abstand wächst mit dem Vorsprung, damit beide Autos im Bild bleiben.
  // Hook: flacher Blick hinter den Autos; ab „Los“ steiler (beide Autos bleiben im Bild, auch mit Vorsprung)
  const OFF_HOOK = [-8.6, 7.4, 1.9], OFF_RENNEN = [-6.4, 9.8, 1.5];
  const abstand = (t) => Math.abs(xA(t) - xB(t)) / M_PRO_E;
  const regie = new Regie(kamRennen, (t) => {
    const u = ease.inOutCubic(fortschritt(t, tLos - 0.15, tLos + 0.55));
    const k = lerp(1.1, 0.96, ease.inOutSine(fortschritt(t, 0, tLos))) * (1 + abstand(t) / 17); // Push-in im Hook
    const off = OFF_HOOK.map((v, i) => lerp(v, OFF_RENNEN[i], u) * k);
    const ziel = [0.4, 0, 0];
    return { pos: [ziel[0] + off[0], off[1], off[2]], ziel, fov: 38 };
  }, { zp });
  const paar = (t) => {
    const a = xA(t) / M_PRO_E, b = xB(t) / M_PRO_E;
    return [lerp(Math.min(a, b), Math.max(a, b), 0.5) + 0.4, 0, 0];
  };
  regie.folge({ von: "Los", ziel: paar, glaettung: 0.08, ein: 0.3 });
  regie.zoom({ t: "Rot!", ziel: (t) => [xA(t) / M_PRO_E + 0.6, 0.4, -0.5], staerke: 0.42, halt: 0.3, rueck: 0.25 });
  for (const s of [sKlar, sOder, sLos, sUe]) regie.stoss({ t: s.ein + 0.1, staerke: 0.9 });
  regie.atmen({ staerke: 0.02, tempo: 0.4 });
  regie.schleife({ ab: tWolke - 0.5, ende: ENDE });
  const post = { bloomStaerke: BLOOM, bloomSchwelle: 1.1, belichtung: 0.9, vignette: 0.22, saettigung: 1.14, kontrast: 1.07, koernung: 0.018 };
  const weltRennen = {
    szene: W.szene, kamera: kamRennen, post,
    update(t) {
      setzeWelt(t);
      const z = regie.anwenden(t);
      sonneFolgt(z.ziel[0]);
    },
  };
  // Ziel: Blick vom Zielbogen zurück auf die ankommenden Autos (leichter Push-in)
  const kamZiel = new THREE.PerspectiveCamera(38, 1080 / 1920, 0.1, 400);
  const regieZiel = new Regie(kamZiel, (t) => {
    const k = ease.outCubic(fortschritt(t, tZiel - 0.3, T("Was")));
    return { pos: [L + 15.5 - 1.5 * k, 4.6 - 0.5 * k, 5.2 - 0.6 * k], ziel: [L + 3.2, 0.2, -0.2], fov: 36 };
  });
  regieZiel.stoss({ t: T("Vorsprung.>+0.05"), staerke: 0.6 });
  const weltZiel = { szene: W.szene, kamera: kamZiel, post, update(t) { setzeWelt(t); regieZiel.anwenden(t); sonneFolgt(L - 2); } };
  // Überblick: Luftbild über dem Ziel, langsame Kreisfahrt
  const kamUeber = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 600);
  const regieUeber = new Regie(kamUeber, (t) => {
    const w = 0.75 + 0.3 * fortschritt(t, T("Was") - 0.4, tWolke + 0.6);
    return { pos: [L + 4 - Math.cos(w) * 24, 27, Math.sin(w) * 24], ziel: [L + 1, 0, 0], fov: 34 };
  });
  const weltUeber = { szene: W.szene, kamera: kamUeber, post, update(t) { setzeWelt(t); regieUeber.anwenden(t); sonneFolgt(L); } };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltRennen);
  zl.shot(tZiel - 0.08, weltZiel, { typ: "zoomwisch", dauer: 0.5, richtung: [1, -0.25], mitte: [0.5, 0.55] });
  zl.shot(T("Was") - 0.08, weltUeber, { typ: "blasen", dauer: 0.7 });
  zl.shot(tWolke, weltRennen, { typ: "wolken", dauer: 1.0, mitte: [0.5, 0.6] });

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
  for (const t of [0, tLos + 0.5, tZiel + 0.3, T("Was") + 0.5, tWolke]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = { T_A: MOD.T_A, T_B: MOD.T_B, W1: MOD.W1, W2: MOD.W2, fuehrung: MOD.fuehrung, ankunft1: MOD.ankunft1 };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
