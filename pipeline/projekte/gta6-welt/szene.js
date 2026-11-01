// Video #1 · Simulierbar · „GTA 6: Kostet das Krankfeiern die Welt eine Milliarde?“
// Deterministische Szene: window.renderAt(t) zeichnet das Bild zur Zeit t (Sekunden).
// Alle Zeiten hängen am Stimm-Timing (audio/timing.json bzw. audio/timing_schaetzung.json).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, lichtGlobus, verlauf, umgebung } from "../../engine/licht.js";
import { PunktGlobus } from "../../engine/globus.js";
import * as B from "../../engine/bausteine.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, SchrittAnzeige, karte, chip, Zaehler, KinetikTitel, Karaoke, Anker, Erscheinung, el, fmt, SPRECHBLASE } from "../../engine/hud.js";
import { ease, feder, FEDER, fortschritt, clamp, lerp, hash, rauschen, keyframes, smoothstep } from "../../engine/bewegung.js";

const FPS = 30;
// Qualitätsschalter per URL (für Tests): ?msaa=0&schatten=1024
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};
const hdr = (hex, k) => new THREE.Color(hex).multiplyScalar(k);
/**
 * Startzeit eines Worts; fehlt es (z. B. nach einer Skriptänderung), wird geschätzt:
 * Anteil `anteil` der Segmentdauer. So bricht die Szene nie, und die Warnung zeigt, was nachzuziehen ist.
 */
function wortZeit(zp, seg, wort, anteil = 0.5, opt) {
  try {
    return zp.w(seg, wort, opt);
  } catch (e) {
    const g = zp.seg(seg);
    console.warn(`Anker fehlt: ${seg}/${wort} → ${Math.round(anteil * 100)} % des Segments`);
    return g.start + anteil * (g.ende - g.start);
  }
}

// =====================================================================================
// Welt 1: Punkte-Globus (hook, behauptung, kaeufer) und Schluss
// =====================================================================================
function baueGlobus(buehne, daten, zp) {
  const W = (s, w, a, o) => wortZeit(zp, s, w, a, o);
  const S = (id) => zp.seg(id);
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#06112B"], [0.42, "#0E2862"], [0.7, "#0C2457"], [1, "#071530"]], { radial: [0.5, 0.55, 0.52, "rgba(70,130,255,0.42)"] });
  lichtGlobus(szene, buehne.renderer);
  const g = new PunktGlobus(daten);
  szene.add(g.wurzel);
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.05, 100);

  // Scan-Ring für „Ich hab's … simuliert“
  const scanMat = new THREE.MeshBasicMaterial({ color: hdr("#8FE3FF", 3), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const scanRing = new THREE.Mesh(new THREE.TorusGeometry(1.004, 0.006, 8, 200), scanMat);
  scanRing.rotation.x = Math.PI / 2;
  g.gruppe.add(scanRing);

  const P = g.punkte;
  const ORANGE = hdr("#FF6A0A", 1.75);
  const GELB = hdr("#FFD23F", 1.55);
  const DUNKEL = hdr("#5B78B8", 0.55);
  const WEISS = hdr("#FFFFFF", 2.6);
  const CYAN = hdr("#8FE3FF", 2.2);

  // Hook: Lichtpunkte poppen weltweit auf (beschleunigend)
  const hook = P.filter((p) => hash(p.i, 11) < 0.11 && p.lat > -50).map((p) => ({
    i: p.i, t0: -0.4 + 5.6 * Math.pow(hash(p.i, 12), 0.75), strahl: hash(p.i, 13) < 0.32, ring: hash(p.i, 14) < 0.55, farbe: new THREE.Color(),
  }));
  // USA-Welle
  const usa = P.filter((p) => p.region === 1 && p.lat < 50 && p.lon > -126).map((p) => {
    const d = Math.hypot(p.lat - 39, (p.lon + 97) * Math.cos((39 * Math.PI) / 180));
    return { i: p.i, d, farbe: new THREE.Color() };
  });
  const usaStart = W("behauptung", "USA,", 0.4) - 0.6;
  const usaEnde = W("behauptung", "Also", 0.78) + 0.05;
  const scanStart = W("behauptung", "rechnen", 0.82) + 0.05;
  const scanDauer = 1.5;
  // Käufer: Schwerpunkt Nordamerika, Europa, Japan
  const gewicht = { 0: 0.08, 1: 0.95, 2: 0.5, 3: 1, 4: 1, 5: 1, 6: 0.45, 7: 0.28, 8: 0.22, 9: 0.3, 10: 0.06, 11: 0.14 };
  const kStart = W("kaeufer", "25", 0.08) - 0.25;
  const kSplit = W("kaeufer", "Schüler", 0.55) - 0.1;
  const kaeufer = P.filter((p) => {
    let w = gewicht[p.region] ?? 0.08;
    if (p.region === 2 && p.lat > 56) w = 0.08;
    if (p.region === 1 && p.lat > 52) w = 0.15;
    if (p.region === 0 && p.lat > 60) w = 0.02;
    return hash(p.i, 21) < w;
  }).map((p) => ({ i: p.i, t0: kStart + 2.6 * Math.pow(hash(p.i, 22), 1.5), job: hash(p.i, 23) < 0.6, tS: kSplit + hash(p.i, 25) * 0.9, strahl: hash(p.i, 24) < 0.05, ring: hash(p.i, 26) < 0.22, farbe: new THREE.Color() }));

  // Blickrichtung (Breite, Länge) und Kameradistanz über die Zeit
  const sB = S("behauptung").start;
  const kEnde = zp.seg("krank").start;
  const blick = [
    { t: 0, v: [18, 28] },
    { t: sB - 0.2, v: [24, -18], e: ease.linear },
    { t: sB + 2.0, v: [36, -97], e: ease.inOutCubic },
    { t: usaEnde - 0.2, v: [37, -92], e: ease.linear },
    { t: usaEnde + 1.6, v: [32, -42], e: ease.inOutCubic },
    { t: kEnde - 1.6, v: [40, -12], e: ease.linear },
    { t: kEnde - 0.3, v: [49, 6], e: ease.inOutCubic },
  ];
  const abstand = [
    { t: 0, v: 10.8 },
    { t: sB, v: 9.8, e: ease.outCubic },
    { t: sB + 2.2, v: 5.6, e: ease.inOutCubic },
    { t: usaEnde - 0.2, v: 5.2, e: ease.linear },
    { t: usaEnde + 1.6, v: 11.4, e: ease.inOutCubic },
    { t: kEnde - 1.25, v: 10.4, e: ease.linear },
    { t: kEnde + 0.5, v: 1.55, e: ease.inCubic },
  ];

  const liste = [];
  function update(t) {
    const [lat, lon] = keyframes(blick, t);
    g.setzeDrehung((lat * Math.PI) / 180, (-lon * Math.PI) / 180);
    const D = keyframes(abstand, t);
    const atmen = rauschen(t * 0.35, 3) * 0.06;
    kamera.position.set(atmen, 0.02 * D + rauschen(t * 0.3, 4) * 0.04, D);
    kamera.lookAt(0, 0.032 * D, 0);
    kamera.updateMatrixWorld();

    liste.length = 0;
    // Hook-Lichter
    const hookAus = 1 - smoothstep(sB, sB + 1.0, t);
    if (hookAus > 0) {
      for (const h of hook) {
        if (t < h.t0) continue;
        const dt = t - h.t0;
        const s = feder(dt, FEDER.pop) * hookAus;
        h.farbe.copy(ORANGE).lerp(GELB, clamp(1 - dt / 0.5) * 0.6);
        liste.push({
          i: h.i, groesse: s * 1.45, farbe: h.farbe,
          ring: h.ring ? dt / 1.1 : undefined,
          strahl: h.strahl ? feder(dt, FEDER.weich) * (0.3 + 0.7 * Math.exp(-dt / 1.4)) * hookAus : undefined,
        });
      }
    }
    // USA-Welle
    if (t > usaStart && t < usaEnde + 0.8) {
      const aus = 1 - smoothstep(usaEnde, usaEnde + 0.7, t);
      for (const u of usa) {
        const t0 = usaStart + u.d * 0.035;
        if (t < t0) continue;
        const dt = t - t0;
        const puls = 1 + 0.22 * Math.sin(dt * 5.5 - u.d * 0.3);
        u.farbe.copy(ORANGE).multiplyScalar(0.8 + 0.25 * puls);
        liste.push({ i: u.i, groesse: feder(dt, FEDER.pop) * 0.6 * puls * aus, farbe: u.farbe, ring: u.d < 3 ? (dt % 1.3) / 1.3 : undefined, ringFarbe: GELB });
      }
    }
    // Scan
    const sp = fortschritt(t, scanStart, scanStart + scanDauer);
    if (sp > 0 && sp < 1) {
      const sl = lerp(-62, 86, ease.inOutSine(sp));
      const rad = (sl * Math.PI) / 180;
      scanRing.visible = true;
      scanRing.position.set(0, Math.sin(rad) * 1.004, 0);
      scanRing.scale.setScalar(Math.cos(rad));
      scanMat.color.copy(CYAN).multiplyScalar(Math.sin(sp * Math.PI) * 1.4);
    } else scanRing.visible = false;
    if (t > scanStart && t < scanStart + scanDauer + 0.8) {
      for (const p of P) {
        const tp = scanStart + scanDauer * inversSinus((p.lat + 62) / 148);
        const dt = t - tp;
        if (dt < 0 || dt > 0.7) continue;
        liste.push({ i: p.i, groesse: 0.9 * (1 - dt / 0.7), farbe: CYAN });
      }
    }
    // Käufer
    for (const k of kaeufer) {
      if (t < k.t0) continue;
      const dt = t - k.t0;
      let s = feder(dt, FEDER.pop);
      const split = t - k.tS;
      if (split > 0) {
        const p = ease.outCubic(clamp(split / 0.45));
        if (k.job) {
          k.farbe.copy(GELB).lerp(ORANGE, p);
          s *= 1 + 0.35 * Math.sin(clamp(split / 0.35) * Math.PI);
        } else {
          k.farbe.copy(GELB).lerp(DUNKEL, p);
          s *= 1 - 0.35 * p;
        }
      } else k.farbe.copy(GELB);
      liste.push({
        i: k.i, groesse: s * 0.85, farbe: k.farbe,
        ring: k.ring ? dt / 1.0 : k.job && split > 0 && hash(k.i, 27) < 0.25 ? split / 0.9 : undefined,
        strahl: k.strahl ? feder(dt, FEDER.weich) * (0.35 + 0.65 * Math.exp(-dt / 1.2)) : undefined,
      });
    }
    g.setzeLichter(liste);
  }
  function inversSinus(x) {
    // Umkehrung von inOutSine, damit Punkte genau dann aufblitzen, wenn der Ring vorbeizieht
    return Math.acos(1 - 2 * clamp(x)) / Math.PI;
  }

  const welt = {
    szene, kamera, update,
    post: { bloomStaerke: 1.2, bloomSchwelle: 1.35, bloomKnie: 0.5, vignette: 0.38, koernung: 0.045, saettigung: 1.06, kontrast: 1.04 },
  };

  // Schluss-Welt: gleicher Globus, eigene Kamera und Lichter
  const kameraEnde = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.05, 100);
  const sE = zp.seg("ende").start - 0.3;
  const ende = P.filter((p) => hash(p.i, 41) < 0.33).map((p) => ({ i: p.i, d: Math.hypot(p.lat - 50, p.lon - 8), farbe: [GELB, ORANGE, hdr("#19B36B", 2.6), WEISS][Math.floor(hash(p.i, 42) * 4)] }));
  const welt2 = {
    szene, kamera: kameraEnde,
    post: { bloomStaerke: 1.2, bloomSchwelle: 1.35, vignette: 0.42, koernung: 0.045, saettigung: 1.06, unschaerfe: 0.0 },
    update(t) {
      const dt = t - sE;
      g.setzeDrehung((22 * Math.PI) / 180, ((-8 - dt * 9) * Math.PI) / 180);
      const D = lerp(13.5, 11.8, ease.outCubic(clamp(dt / 4)));
      kameraEnde.position.set(0, 0, D);
      kameraEnde.lookAt(0, 0.1 * D, 0);
      kameraEnde.updateMatrixWorld();
      scanRing.visible = false;
      liste.length = 0;
      for (const e of ende) {
        const t0 = sE + 0.15 + e.d * 0.012;
        if (t < t0) continue;
        const tw = 0.75 + 0.25 * Math.sin(t * 3 + e.i);
        liste.push({ i: e.i, groesse: feder(t - t0, FEDER.pop) * tw, farbe: e.farbe });
      }
      g.setzeLichter(liste);
      welt2.post.unschaerfe = 0.0;
    },
  };
  return { welt, weltEnde: welt2, globus: g };
}

// =====================================================================================
// Welt 2: Miniatur-Stadt (krank, kosten, dreh) und Rechts-Szene
// =====================================================================================
function baueStadt(buehne, zp) {
  const W = (s, w, a, o) => wortZeit(zp, s, w, a, o);
  const S = (id) => zp.seg(id);
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#8EBBFF"], [0.45, "#CFE2FF"], [1, "#FFF1E2"]]);
  szene.fog = new THREE.Fog("#DCE9F7", 75, 170);
  lichtTag(szene, buehne.renderer, { sonnenRichtung: [0.5, 1.0, 0.55], sonnenStaerke: 2.5, bereich: 22, schattenKarte: SCHATTEN, schattenWeich: 5, ziel: [3.5, 0, -1.5], umgebungsStaerke: 0.4, himmelStaerke: 1.25, himmel: "#DDEBFF", boden: "#F6E7CF" });
  // Ohne PMREM-Umgebung: halbe Renderzeit unter SwiftShader und kräftigere Spielzeugfarben (getestet)
  if (Q.get("env") !== "1") szene.environment = null;

  const boden = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), B.mat("#A9D795", { rau: 1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.receiveShadow = true;
  szene.add(boden);

  // Straßen: x-Achse bei z = 1.6, z-Achse bei x = -1.2
  const sx = B.strasse({ laenge: 90 });
  sx.position.z = 1.6;
  const sz = B.strasse({ laenge: 90 });
  sz.rotation.y = Math.PI / 2;
  sz.position.x = -1.2;
  szene.add(sx, sz);
  const kreuzung = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.056, 2.6), B.mat("#8C95AA", { rau: 0.9 }));
  kreuzung.position.set(-1.2, 0.028, 1.6);
  kreuzung.receiveShadow = true;
  szene.add(kreuzung);
  // Zebrastreifen
  const zebra = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.012, 0.7), B.mat("#FFFFFF", { rau: 0.6 }), 24);
  const m4 = new THREE.Matrix4();
  let zi = 0;
  for (let i = 0; i < 6; i++) {
    const o = -0.85 + i * 0.34;
    m4.makeTranslation(0.45, 0.05, 1.6 + o); m4.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); zebra.setMatrixAt(zi++, m4);
    m4.makeTranslation(-2.85, 0.05, 1.6 + o); m4.multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2)); zebra.setMatrixAt(zi++, m4);
    m4.makeTranslation(-1.2 + o, 0.05, 0.0); zebra.setMatrixAt(zi++, m4);
    m4.makeTranslation(-1.2 + o, 0.05, 3.2); zebra.setMatrixAt(zi++, m4);
  }
  zebra.receiveShadow = true;
  szene.add(zebra);

  // Blöcke (Gehweg-Platten) und Rasen
  const SOCKEL = 0.14;
  const block = (x0, x1, z0, z1, rasen = true) => {
    const p = B.rundeBox(x1 - x0, SOCKEL, z1 - z0, { farbe: "#EFE5D5", radius: 0.12, segmente: 2 });
    p.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    szene.add(p);
    if (rasen) {
      const r = B.rundeBox(x1 - x0 - 1.3, 0.07, z1 - z0 - 1.3, { farbe: "#8FCB72", radius: 0.06, segmente: 2 });
      r.position.set((x0 + x1) / 2, SOCKEL - 0.01, (z0 + z1) / 2);
      szene.add(r);
    }
  };
  block(0.25, 22, -22, 0.15, false); // Büro-Block (Platz)
  block(-24, -2.65, -22, 0.15);
  block(-24, -2.65, 3.05, 24);
  block(0.25, 22, 3.05, 24);
  // Grünstreifen hinter dem Büro
  const gs = B.rundeBox(19, 0.07, 6, { farbe: "#8FCB72", radius: 0.06, segmente: 2 });
  gs.position.set(11.5, SOCKEL - 0.01, -15);
  szene.add(gs);
  const RASEN = SOCKEL + 0.06;

  // Bürohochhaus
  const buero = B.hochhaus({ breite: 2.9, tiefe: 2.9, hoehe: 7.4, etagen: 12, spalten: 4 });
  const BUERO = V(3.4, SOCKEL, -3.6);
  buero.gruppe.position.copy(BUERO);
  szene.add(buero.gruppe);
  const tuerBuero = V(3.4, SOCKEL, -1.75);

  // Häuser
  const wandFarben = ["#FFFFFF", "#FFF4E2", "#E6F0FF", "#FFEFC2", "#FFE1D9", "#E3F5E8"];
  const dachFarben = [B.FARBE.orange, B.FARBE.blau, B.FARBE.gelb, B.FARBE.koralle, B.FARBE.gruen, "#7A5CFA"];
  const haeuser = [];
  const setzeHaus = (x, z, blickNachVorn, q, n) => {
    const h = B.haus({ wand: wandFarben[n % 6], dach: dachFarben[(n * 7 + 1) % 6], breite: 1.55 + hash(n, 3) * 0.3, tiefe: 1.3, hoehe: 1.0 + hash(n, 4) * 0.3, tuerFarbe: dachFarben[(n * 3 + 2) % 6] });
    h.gruppe.position.set(x, RASEN, z);
    h.gruppe.rotation.y = blickNachVorn ? 0 : Math.PI;
    szene.add(h.gruppe);
    const tuer = h.tuer.clone().applyAxisAngle(V(0, 1, 0), h.gruppe.rotation.y).add(h.gruppe.position);
    tuer.y = SOCKEL;
    haeuser.push({ ...h, q, tuerWelt: tuer, n });
  };
  let n = 0;
  [-4.2, -6.9, -9.6, -12.3, -15].forEach((x) => setzeHaus(x, -1.45, true, "Q2", n++));
  [-4.2, -6.9, -9.6, -12.3].forEach((x) => setzeHaus(x, 4.75, false, "Q3", n++));
  [2.2, 4.9, 7.6, 10.3, 13].forEach((x) => setzeHaus(x, 4.75, false, "Q4", n++));
  [-4.6, -7.8, -11].forEach((x) => setzeHaus(x, -5.6, true, "Q2b", n++));
  [3.0, 6.4, 9.8].forEach((x) => setzeHaus(x, 8.6, false, "Q4b", n++));
  [-4.6, -8.0].forEach((x) => setzeHaus(x, 8.6, false, "Q3b", n++));

  // Bäume
  const baumPos = [[12.5, -1.0], [14.2, -2.8], [12.8, -5.2], [15.5, -6.8], [-3.6, -8.6], [-6.2, -9.2], [-9.4, -8.4], [-13.5, -4.2], [-14.6, 7.4],
    [-11.2, 8.8], [12.8, 8.4], [15.2, 6.5], [1.2, 7.0], [-3.4, 11.2], [6.1, 11.6], [0.9, -6.4], [0.8, -9.0], [6.9, -8.8], [9.6, -9.6], [-16.5, -1.6], [16.8, 3.9], [-7.4, 12.2], [11.8, -12.4], [4.0, -12.8], [-1.0, -14.0], [8.5, 13.5]];
  baumPos.forEach(([x, z], i) => {
    const b = B.baum({ groesse: 1.25 + hash(i, 5) * 0.7, seed: i, farbe: i % 3 ? "#5DBB7A" : "#4FAE6E", farbe2: i % 2 ? "#86D09A" : "#9AD9A6" });
    b.position.set(x, RASEN, z);
    b.rotation.y = hash(i, 6) * 6;
    szene.add(b);
  });

  // Autos
  const autoFarben = [B.FARBE.blau, B.FARBE.orange, B.FARBE.gelb, "#FFFFFF", B.FARBE.koralle, B.FARBE.gruen];
  const autos = [
    { spur: "x", pos: 2.15, dir: 1, v: 2.4, x0: 0 },
    { spur: "x", pos: 1.05, dir: -1, v: 2.0, x0: 20 },
    { spur: "x", pos: 2.15, dir: 1, v: 2.4, x0: 27 },
    { spur: "z", pos: -0.65, dir: 1, v: 2.1, x0: 8 },
    { spur: "z", pos: -1.75, dir: -1, v: 2.3, x0: 31 },
    { spur: "x", pos: 1.05, dir: -1, v: 2.0, x0: 42 },
  ].map((a, i) => {
    const m = B.auto({ farbe: autoFarben[i % autoFarben.length], dachFarbe: i % 2 ? "#FFFFFF" : null });
    szene.add(m);
    return { ...a, m };
  });

  // Figuren mit Wegen vom Büro nach Hause
  const figFarben = [B.FARBE.orange, B.FARBE.blau, B.FARBE.gruen, B.FARBE.gelb, B.FARBE.koralle, "#7A5CFA", "#FFFFFF"];
  const ziele = haeuser.filter((h) => ["Q2", "Q3", "Q4"].includes(h.q));
  const figStart = W("krank", "wie", 0.02) - 0.2;
  const figuren = ziele.map((h, i) => {
    const f = B.figur({ farbe: figFarben[i % figFarben.length] });
    f.userData.skala = 1.45;
    szene.add(f);
    const spur = (hash(i, 51) - 0.5) * 0.5;
    const z0 = -0.12 + spur * 0.4;
    const pts = [tuerBuero.clone().add(V(spur * 0.6, 0, 0)), V(3.4 + spur, SOCKEL, z0)];
    const d = h.tuerWelt;
    if (h.q === "Q2") {
      pts.push(V(0.6, SOCKEL, z0), V(-2.9, SOCKEL, z0), V(d.x, SOCKEL, z0), d.clone());
    } else if (h.q === "Q4") {
      pts.push(V(d.x + spur, SOCKEL, z0), V(d.x + spur, SOCKEL, 3.35 + spur * 0.3), d.clone());
    } else {
      pts.push(V(0.55, SOCKEL, z0), V(0.55, SOCKEL, 3.35 + spur * 0.3), V(-2.95, SOCKEL, 3.35 + spur * 0.3), V(d.x, SOCKEL, 3.35 + spur * 0.3), d.clone());
    }
    const laengen = [0];
    for (let k = 1; k < pts.length; k++) laengen.push(laengen[k - 1] + pts[k].distanceTo(pts[k - 1]));
    const tempo = 1.25 + hash(i, 52) * 0.45;
    const t0 = figStart + i * 0.5 + hash(i, 53) * 0.3;
    const t1 = t0 + laengen[laengen.length - 1] / tempo;
    h.ankunft = t1;
    return { f, pts, laengen, tempo, t0, t1, haus: h };
  });
  const aufStrasse = (p) => (p.z > 0.4 && p.z < 2.8) || (p.x > -2.4 && p.x < 0.0);
  function setzeFiguren(t) {
    for (const fg of figuren) {
      if (t < fg.t0 || t > fg.t1 + 0.35) { fg.f.visible = false; continue; }
      fg.f.visible = true;
      const s = clamp((t - fg.t0) * fg.tempo, 0, fg.laengen[fg.laengen.length - 1]);
      let k = 1;
      while (k < fg.laengen.length - 1 && fg.laengen[k] < s) k++;
      const a = fg.pts[k - 1], b = fg.pts[k];
      const u = clamp((s - fg.laengen[k - 1]) / Math.max(1e-6, fg.laengen[k] - fg.laengen[k - 1]));
      const p = a.clone().lerp(b, u);
      p.y = aufStrasse(p) ? 0.045 : SOCKEL;
      const richtung = Math.atan2(b.x - a.x, b.z - a.z);
      B.setzeFigur(fg.f, p, richtung, s * 3.2, 1);
      const rein = feder(t - fg.t0, FEDER.pop);
      const raus = 1 - ease.inCubic(clamp((t - fg.t1) / 0.35));
      fg.f.scale.setScalar(Math.max(0.001, rein * raus) * fg.f.userData.skala);
    }
  }

  // Münzen (kosten): fliegen aus den Bürofenstern auf einen Haufen
  const HAUFEN = V(6.4, SOCKEL, -0.85);
  const muenzGeo = B.muenzGeo(0.12, 0.034);
  const NM = 150;
  // Gold braucht Spiegelungen: eigene Umgebungstextur nur für die Münzen (billig, da klein im Bild)
  const gold = B.goldMaterial().clone();
  gold.envMap = umgebung(buehne.renderer);
  gold.envMapIntensity = 1.4;
  const muenzen = new THREE.InstancedMesh(muenzGeo, gold, NM);
  muenzen.castShadow = true;
  muenzen.receiveShadow = true;
  muenzen.frustumCulled = false;
  szene.add(muenzen);
  const mStart = W("kosten", "Geld.", 0.05) - 0.1;
  const mEnde = W("kosten", "300", 0.87) + 0.3;
  const fensterVorne = buero.fensterInfo.filter((f) => (f.seite === 0 || f.seite === 1) && f.etage >= 2);
  const muenzDaten = Array.from({ length: NM }, (_, k) => {
    const f = fensterVorne[Math.floor(hash(k, 61) * fensterVorne.length)];
    const start = f.pos.clone().add(BUERO).add(f.seite === 0 ? V(0, 0, 0.25) : V(0.25, 0, 0));
    const r = 0.72 * Math.sqrt(hash(k, 62));
    const w = hash(k, 63) * Math.PI * 2;
    const h = 0.42 * Math.sqrt((k + 1) / NM) * (1 - r / 0.8) + 0.02;
    const ziel = HAUFEN.clone().add(V(Math.cos(w) * r, h, Math.sin(w) * r));
    const tL = mStart + (mEnde - mStart) * Math.pow(k / NM, 0.85);
    const flug = 0.85 + hash(k, 64) * 0.35;
    const achse = V(hash(k, 65) - 0.5, hash(k, 66) - 0.5, hash(k, 67) - 0.5).normalize();
    const ruhe = new THREE.Quaternion().setFromEuler(new THREE.Euler((hash(k, 68) - 0.5) * 0.5, hash(k, 69) * 6, (hash(k, 70) - 0.5) * 0.5));
    return { start, ziel, tL, flug, achse, ruhe };
  });
  const morph = S("dreh").start - 0.35;
  const _q = new THREE.Quaternion(), _p = V(0, 0, 0), _s = V(1, 1, 1);
  function setzeMuenzen(t) {
    let c = 0;
    const weg = ease.inCubic(clamp((t - morph) / 0.35));
    if (weg >= 1) { muenzen.count = 0; return; }
    for (const m of muenzDaten) {
      if (t < m.tL) continue;
      const u = clamp((t - m.tL) / m.flug);
      if (u < 1) {
        _p.copy(m.start).lerp(m.ziel, u);
        _p.y += 4 * 1.6 * u * (1 - u);
        _q.setFromAxisAngle(m.achse, u * 9);
      } else {
        const nach = t - m.tL - m.flug;
        _p.copy(m.ziel);
        _p.y += Math.abs(Math.sin(nach * 14)) * Math.exp(-nach * 9) * 0.08;
        _q.copy(m.ruhe);
      }
      if (weg > 0) _p.lerp(V(HAUFEN.x, HAUFEN.y + 0.1, HAUFEN.z), weg);
      _s.setScalar(1 - weg);
      m4.compose(_p, _q, _s);
      muenzen.setMatrixAt(c++, m4);
    }
    muenzen.count = c;
    muenzen.instanceMatrix.needsUpdate = true;
  }

  // Ein Bündel = 0,3 Mrd. $ (GTA-Effekt), Turm = 1.500 Bündel = 450 Mrd. $ (1 Arbeitstag Weltwirtschaft)
  const bGeo = B.buendelGeo(0.8, 0.1, 0.36);
  const bMat = B.buendelMaterialien();
  const klein = new THREE.Mesh(bGeo, bMat);
  klein.castShadow = true;
  klein.receiveShadow = true;
  klein.position.copy(HAUFEN);
  klein.rotation.y = 0.35;
  szene.add(klein);
  const kleinSchatten = B.kontaktSchatten(1.3, 0.8, 0.35);
  kleinSchatten.position.set(HAUFEN.x, SOCKEL + 0.006, HAUFEN.z);
  szene.add(kleinSchatten);

  const TURM = V(8.9, SOCKEL, -2.7);
  const NT = 1500;
  const turm = new THREE.InstancedMesh(bGeo, bMat, NT);
  turm.castShadow = true;
  turm.receiveShadow = true;
  turm.frustumCulled = false;
  szene.add(turm);
  const tBau0 = W("dreh", "Weltwirtschaft", 0.12) - 0.15;
  const tBau1 = W("dreh", "450", 0.3) + 0.9;
  const LAGE = 0.102;
  const turmDaten = Array.from({ length: NT }, (_, k) => {
    const lage = Math.floor(k / 9);
    const j = k % 9;
    const x = ((j % 3) - 1) * 0.82 + (hash(k, 71) - 0.5) * 0.02;
    const z = (Math.floor(j / 3) - 1) * 0.38 + (hash(k, 72) - 0.5) * 0.02;
    const tl = tBau0 + (tBau1 - tBau0) * Math.pow(lage / 167, 0.78) + j * 0.012;
    return { pos: TURM.clone().add(V(x, lage * LAGE, z)), tl, rot: (hash(k, 73) - 0.5) * 0.03 };
  });
  const turmHoehe = (t) => {
    let h = 0;
    for (let L = 0; L < 167; L++) if (turmDaten[L * 9].tl + 0.2 <= t) h = (L + 1) * LAGE;
    return h;
  };
  function setzeTurm(t) {
    let c = 0;
    for (const d of turmDaten) {
      if (t < d.tl) break;
      const u = clamp((t - d.tl) / 0.2);
      _p.copy(d.pos);
      _p.y += (1 - ease.inQuad(u)) * 2.2;
      _q.setFromAxisAngle(V(0, 1, 0), d.rot + (1 - u) * 0.4);
      _s.set(1, 1, 1);
      m4.compose(_p, _q, _s);
      turm.setMatrixAt(c++, m4);
    }
    turm.count = c;
    turm.instanceMatrix.needsUpdate = true;
  }
  const turmSchatten = B.kontaktSchatten(3.6, 1.9, 0.4);
  turmSchatten.position.set(TURM.x, SOCKEL + 0.006, TURM.z);
  szene.add(turmSchatten);

  // Kamerafahrt (Position, Ziel) – an Wörter gebunden
  const kamera = new THREE.PerspectiveCamera(32, 1080 / 1920, 0.1, 600);
  const sK = S("krank").start;
  const kw = (s, w, a) => W(s, w, a);
  // Kamera in Kugelkoordinaten um ein Ziel: [Azimut, Höhenwinkel, Abstand, Ziel x, y, z]
  const fahrt = [
    { t: sK - 0.5, v: [0.5, 1.25, 95, 1.5, 0, -0.5] },
    { t: sK + 1.9, v: [0.42, 0.92, 44, 0.8, 0, 0.0], e: ease.outCubic },
    { t: kw("krank", "Mitte.", 0.6), v: [0.02, 0.86, 39, 0.4, 0, 0.2], e: ease.linear },
    { t: S("kosten").start + 1.8, v: [0.62, 0.5, 21, 4.9, 1.7, -1.7], e: ease.inOutCubic },
    { t: kw("kosten", "300") + 0.6, v: [0.72, 0.4, 15.5, 5.7, 1.0, -1.1], e: ease.linear },
    { t: S("dreh").start + 0.9, v: [0.78, 0.2, 4.4, 6.35, 0.26, -0.85], e: ease.inOutCubic },
    { t: tBau0 + 0.1, v: [0.74, 0.24, 5.4, 6.6, 0.42, -1.0], e: ease.linear },
    { t: tBau1 + 0.4, v: [0.6, 0.27, 74, 7.4, 6.8, -2.0], e: ease.inOutCubic },
    { t: zp.segEnde("dreh") + 1, v: [0.56, 0.28, 77, 7.4, 6.8, -2.0], e: ease.linear },
  ];
  const _z = V(0, 0, 0);
  const post = { bloomStaerke: 0.6, bloomSchwelle: 1.2, tiltStaerke: 0.85, tiltBreite: 0.3, tiltMitte: 0.5, vignette: 0.24, koernung: 0.038, saettigung: 1.04, kontrast: 1.0, belichtung: 1.0 };

  function zustand(t) {
    // Fenster gehen aus, wenn die Figuren gehen
    const fStart = figStart;
    buero.setzeFenster((i) => {
      if (hash(i, 32) < 0.12) return 1;
      const tAus = fStart + hash(i, 31) * 9.5;
      return 1 - smoothstep(tAus, tAus + 0.18, t);
    });
    // Bildschirme in den Häusern
    haeuser.forEach((h) => {
      if (!h.ankunft) { B.setzeBildschirm(h.bildschirm, 0); return; }
      const an = clamp(feder(t - h.ankunft - 0.15, FEDER.knackig));
      const flackern = 0.5 + 0.5 * Math.sin(t * 9 + h.n * 3) * Math.sin(t * 3.7 + h.n);
      B.setzeBildschirm(h.bildschirm, an, flackern * an);
    });
    setzeFiguren(t);
    for (const a of autos) {
      const s = ((a.x0 + a.v * t) % 50) - 25;
      if (a.spur === "x") { a.m.position.set(s * a.dir, 0.04, a.pos); a.m.rotation.y = a.dir > 0 ? 0 : Math.PI; }
      else { a.m.position.set(a.pos, 0.04, s * a.dir); a.m.rotation.y = a.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
      // an der Kreuzung kein Zusammenstoß: z-Autos warten nicht, aber Abstand reicht optisch
    }
    setzeMuenzen(t);
    const kleinS = feder(t - morph - 0.15, FEDER.pop);
    klein.visible = t > morph + 0.15;
    klein.scale.setScalar(Math.max(0.001, kleinS));
    kleinSchatten.visible = klein.visible;
    setzeTurm(t);
    turmSchatten.visible = t > tBau0;
  }

  const welt = {
    szene, kamera, post,
    update(t) {
      zustand(t);
      const v = keyframes(fahrt, t);
      const az = v[0] + rauschen(t * 0.3, 7) * 0.006, el = v[1] + rauschen(t * 0.27, 8) * 0.004;
      kamera.position.set(v[3] + v[2] * Math.cos(el) * Math.sin(az), v[4] + v[2] * Math.sin(el), v[5] + v[2] * Math.cos(el) * Math.cos(az));
      kamera.lookAt(_z.set(v[3], v[4], v[5]));
      kamera.updateMatrixWorld();
      // Tilt-Shift bei der Nahaufnahme stärker, beim Turm schwächer
      const nah = smoothstep(S("dreh").start - 0.4, S("dreh").start + 0.6, t) * (1 - smoothstep(tBau0 + 0.6, tBau1, t));
      const weit = smoothstep(tBau0 + 0.8, tBau1 + 0.2, t);
      post.tiltStaerke = lerp(0.85, 1.0, nah) * (1 - 0.6 * weit);
      post.tiltBreite = lerp(0.3, 0.16, nah) + 0.2 * weit;
      post.tiltMitte = lerp(0.5, 0.47, nah) + 0.06 * weit;
    },
  };

  // Rechts-Szene: gleiche Stadt, ruhige Nahaufnahme bei den Häusern, stark unscharf
  const kameraR = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 400);
  const sR = S("recht").start;
  const weltRecht = {
    szene, kamera: kameraR,
    post: { bloomStaerke: 0.9, bloomSchwelle: 1.0, tiltStaerke: 0, unschaerfe: 0.5, vignette: 0.3, koernung: 0.04, saettigung: 1.0, kontrast: 1.0, belichtung: 0.92, tonung: [0.92, 0.96, 1.08], tonungStaerke: 0.5 },
    update(t) {
      zustand(t);
      const p = ease.outCubic(clamp((t - sR + 0.5) / 8));
      kameraR.position.set(lerp(1.5, 0.2, p), lerp(7.5, 6.4, p), lerp(19, 16.5, p));
      kameraR.lookAt(-6.4, 0.6, 4.0);
      kameraR.updateMatrixWorld();
    },
  };

  return { welt, weltRecht, kamera, turmHoehe, TURM, HAUFEN, tBau0, tBau1, morph };
}

// =====================================================================================
// HUD und Zeitleiste
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing);
  const W = (s, w, a, o) => wortZeit(zp, s, w, a, o);
  const S = (id) => zp.seg(id);

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "600 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const daten = await lade("../../engine/daten/globus-punkte.json");
  const G = baueGlobus(buehne, daten, zp);
  const ST = baueStadt(buehne, zp);
  if (Q.get("pcf") === "1") buehne.renderer.shadowMap.type = THREE.PCFShadowMap;

  // Zeitleiste
  const zl = new Zeitleiste(buehne);
  const sKrank = S("krank").start;
  const sRecht = S("recht").start;
  const sEnde = S("ende").start;
  zl.shot(0, G.welt);
  zl.shot(sKrank, ST.welt, { typ: "zoom", dauer: 0.9, mitte: [0.5, 0.5] });
  zl.shot(sRecht - 0.05, ST.weltRecht, { typ: "wisch", dauer: 0.75, richtung: [1, -0.35], farbe1: "#FFD23F", farbe2: "#2F6FED" });
  zl.shot(sEnde - 0.1, G.weltEnde, { typ: "iris", dauer: 0.85, mitte: [0.5, 0.42], farbe1: "#FFD23F" });

  // ---------- HUD ----------
  const hud = new HUD(document.getElementById("hud"));
  const KY = 1300; // Untertitel-Oberkante
  // (Markenleiste entfernt: kein Kanalname, kein Logo, keine Rubrik im Video, Entscheidung 31.10.)

  // Hook: kinetischer Titel
  // Wörter am Videoanfang sind schon im ersten Bild ganz da (Vorschaubild im Feed)
  const hk = (w) => (W("hook", w) - 0.12 <= 0.05 ? -0.8 : W("hook", w) - 0.12);
  hud.add(new KinetikTitel(hud, [
    { text: "GTA 6", t: hk("GTA"), klasse: "gelb" },
    { text: "kommt.", t: hk("kommt.") },
  ], { y: 300, groesse: 150, aus: hk("Kostet") - 0.15 }));
  hud.add(new KinetikTitel(hud, [
    { text: "Kostet", t: hk("Kostet") },
    { text: "das", t: hk("das") },
    { umbruch: true },
    { text: "die Welt", t: hk("wirklich") },
    { umbruch: true },
    { text: "1 Mrd. $?", t: hk("eine"), klasse: "gelb" },
  ], { y: 280, groesse: 108, zeilenhoehe: 1.02, aus: S("behauptung").start + 0.6 }));
  const pille = el("div", "pille", "<span>0 $</span>", hud.wurzel);
  hud.add(new Erscheinung(hud, pille, { x: 54, y: 650, ein: W("hook", "Milliarde", 0.6) - 0.35, aus: S("behauptung").start + 0.45, stil: "pop", feder: FEDER.knackig }));
  hud.add(new Zaehler(hud, pille.querySelector("span"), { start: W("hook", "Milliarde", 0.6) - 0.3, dauer: 1.25, bis: 1e9, format: (n) => fmt.zahl(Math.round(n)) + " $" }));

  // Behauptung
  const kb = karte(hud, { label: "Schätzung eines Ökonomen", wert: "USA: 1 Mrd. $", einheit: "", zusatz: "Schaden an einem Tag?", x: 54, y: 300, ein: W("behauptung", "Ökonomen.", 0.12) - 0.1, aus: W("behauptung", "Also", 0.78) - 0.05, stil: "kipp", farbe: "#FF7A1A" });
  kb.e.querySelector(".wert").style.fontSize = "92px";
  const simChip = chip(hud, { flagge: "SIM", text: "Jetzt die ganze Welt", x: 54, y: 300, ein: W("behauptung", "ganze", 0.9) - 0.2, aus: S("kaeufer").start + 0.1, stil: "pop", farbe: "#2F6FED", klasse: "gross" });

  // Schritte
  hud.add(new SchrittAnzeige(hud, [
    { ab: S("kaeufer").start, bis: S("krank").start, titel: "Wer kauft?" },
    { ab: S("krank").start, bis: S("kosten").start, titel: "Wer schwänzt?" },
    { ab: S("kosten").start, bis: S("dreh").start - 0.3, titel: "Was kostet das?" },
  ], { top: 240 }));

  // Käufer
  const kk = karte(hud, { label: "Käufer am 1. Tag", wert: "0", einheit: "Mio.", x: 54, y: 330, ein: W("kaeufer", "25", 0.08) - 0.3, aus: sKrank - 0.25, stil: "pop", farbe: "#FFD23F" });
  hud.add(new Zaehler(hud, kk.zahl, { start: W("kaeufer", "25", 0.08) - 0.2, dauer: 2.2, bis: 25, format: (n) => fmt.zahl(Math.round(n)) }));
  const kc = chip(hud, { flagge: "× 60 %", text: "berufstätig", x: 54, y: 560, ein: W("kaeufer", "arbeitet.", 0.45) - 0.1, aus: sKrank - 0.25, farbe: "#FF7A1A", klasse: "gross" });
  const kr = chip(hud, { flagge: "=", text: "15 Mio. Berufstätige", x: 54, y: 690, ein: W("kaeufer", "15", 0.8) - 0.1, aus: sKrank - 0.25, farbe: "#19B36B", klasse: "gross" });

  // Krank
  const uk = chip(hud, { flagge: "UK", text: "2 %", x: 54, y: 330, ein: W("krank", "2", 0.25) - 0.1, aus: W("krank", "Mitte.", 0.6) - 0.1, farbe: "#2F6FED" });
  const us = chip(hud, { flagge: "USA", text: "10 %", x: 54, y: 440, ein: W("krank", "10", 0.45) - 0.1, aus: W("krank", "Mitte.", 0.6) - 0.1, farbe: "#FF7A1A" });
  const mitte = chip(hud, { flagge: "Mitte", text: "5 % schwänzen", x: 54, y: 330, ein: W("krank", "5", 0.66) - 0.15, aus: S("kosten").start + 0.05, farbe: "#19B36B", klasse: "gross" });
  const fehl = karte(hud, { label: "Leere Schreibtische", wert: "0", x: 54, y: 470, ein: W("krank", "750.000", 0.8) - 0.15, aus: zp.segEnde("kosten") - 0.35, stil: "pop", farbe: "#FF7A1A" });
  hud.add(new Zaehler(hud, fehl.zahl, { start: W("krank", "750.000", 0.8) - 0.1, dauer: 1.1, bis: 750000, format: (n) => fmt.zahl(Math.round(n / 1000) * 1000) }));

  // Kosten
  const proTag = chip(hud, { flagge: "× 400 $", text: "pro Arbeitstag", x: 54, y: 700, ein: W("kosten", "400", 0.48) - 0.1, aus: zp.segEnde("kosten") - 0.35, farbe: "#2F6FED", klasse: "gross" });
  const summe = karte(hud, { label: "Wirtschaftsleistung weg", wert: "0", einheit: "Mio. $", x: 54, y: 830, ein: W("kosten", "Macht", 0.85) - 0.1, aus: zp.segEnde("kosten") - 0.35, stil: "pop", farbe: "#19B36B" });
  hud.add(new Zaehler(hud, summe.zahl, { start: W("kosten", "300", 0.87) - 0.15, dauer: 1.0, bis: 300, format: (n) => fmt.zahl(Math.round(n)) }));
  // Bei Münzen-Szene Fehltage-Karte etwas kleiner nach oben
  fehl.e.style.transformOrigin = "left top";

  // Dreh: Größenvergleich mit 3D-Ankern
  const kamStadt = ST.kamera;
  hud.add(new Anker(hud, {
    html: "<small>GTA 6</small>0,3 Mrd. $", kamera: kamStadt, ein: S("dreh").start + 0.15, aus: W("dreh", "Milliarde?", 0.82) - 0.3, minY: 330,
    punkt: () => ST.HAUFEN.clone().add(V(0, 0.12, 0)), hoehe: (t) => lerp(330, 150, smoothstep(ST.tBau0, ST.tBau1, t)),
  }));
  const turmLabel = new Anker(hud, {
    html: "<small>1 Arbeitstag Weltwirtschaft</small><span class='tz'>0</span> Mrd. $", kamera: kamStadt, ein: ST.tBau0 + 0.25, aus: W("dreh", "Milliarde?", 0.82) - 0.3, minY: 250,
    punkt: (t) => ST.TURM.clone().add(V(0, ST.turmHoehe(t) + 0.15, 0)), hoehe: 70, klasse: "turm",
  });
  hud.add(turmLabel);
  hud.add(new Zaehler(hud, turmLabel.e.querySelector(".tz"), { start: ST.tBau0 + 0.1, dauer: ST.tBau1 - ST.tBau0, bis: 450, kurve: (x) => Math.pow(x, 1 / 0.78) > 1 ? 1 : 1 - Math.pow(1 - x, 1.6), format: (n) => fmt.zahl(Math.round(n)) }));
  const promille = el("div", "pille", "&lt; 1 ‰", hud.wurzel);
  promille.style.fontSize = "120px";
  promille.style.height = "160px";
  promille.style.padding = "0 50px";
  hud.add(new Erscheinung(hud, promille, { x: 54, y: 560, ein: W("dreh", "weniger", 0.53) - 0.1, aus: W("dreh", "Milliarde?", 0.82) - 0.35, stil: "zoom", feder: FEDER.knackig, klang: "boom" }));
  chip(hud, { flagge: "↺", text: "meist nachgearbeitet", x: 54, y: 745, ein: W("dreh", "meiste", 0.67) - 0.1, aus: W("dreh", "Milliarde?", 0.82) - 0.35, farbe: "#19B36B" });

  // „Die Milliarde? Weltweit nicht mal ein Drittel davon.“ – Balkenvergleich
  const tMrd = W("dreh", "Milliarde?", 0.82);
  const tDrittel = W("dreh", "Drittel", 0.95);
  const vgl = el("div", "karte vergleich", `<div class="label"><span class="punkt"></span>Die Milliarde?</div>
    <div class="vz"><span>Behauptung · nur USA</span><b>1 Mrd. $</b></div><div class="vb"><i class="b1"></i></div>
    <div class="vz"><span>Simuliert · ganze Welt</span><b class="g">0,3 Mrd. $</b></div><div class="vb"><i class="b2"></i></div>`, hud.wurzel);
  const b1 = vgl.querySelector(".b1"), b2 = vgl.querySelector(".b2");
  const vz2 = vgl.querySelectorAll(".vz")[1];
  hud.add(new Erscheinung(hud, vgl, {
    x: 54, y: 270, breite: 820, ein: tMrd - 0.15, aus: zp.segEnde("dreh") - 0.3, stil: "pop", farbe: "#FF7A1A",
    nachUpdate: (t) => {
      b1.style.transform = `scaleX(${ease.outCubic(fortschritt(t, tMrd, tMrd + 0.6))})`;
      const p2 = feder(t - (tDrittel - 0.35), FEDER.standard);
      b2.style.transform = `scaleX(${0.3 * Math.max(0, p2)})`;
      vz2.style.opacity = String(clamp((t - tDrittel + 0.45) * 4));
    },
  }));

  // Recht
  const rot = karte(hud, { label: "Krank vortäuschen", wert: "→ Kündigung möglich", x: 54, y: 380, ein: W("recht", "vortäuscht,", 0.35) - 0.15, aus: sEnde - 0.3, stil: "links", farbe: "#F0443A", klasse: "farbig" });
  rot.e.style.background = "#F0443A";
  rot.e.querySelector(".wert").style.fontSize = "74px";
  const gruen = karte(hud, { label: "Der sichere Weg", wert: "Urlaub ✓", x: 54, y: 640, ein: W("recht", "sichere", 0.7) - 0.1, aus: sEnde - 0.3, stil: "rechts", farbe: "#19B36B", klasse: "farbig" });
  gruen.e.style.background = "#19B36B";
  const teuer = chip(hud, { flagge: "!", text: "Teuer wird's für dich", x: 54, y: 260, ein: W("recht", "Teuer", 0.02) + 0.15, aus: sEnde - 0.3, farbe: "#F0443A" });

  // Schlusskarte
  const schluss = el("div", "schluss", `<div class="aufruf"><span class="blase">${SPRECHBLASE}</span><span>Schreibt euren Simulations&shy;wunsch in die Kommentare</span></div>`, hud.wurzel);
  const aufruf = schluss.querySelector(".aufruf");
  const blase = schluss.querySelector(".blase");
  hud.add(new Erscheinung(hud, aufruf, {
    ein: sEnde + 0.05, stil: "hoch", feder: FEDER.standard, klang: "ding",
    nachUpdate: (t) => {
      const b = Math.max(0, Math.sin((t - sEnde - 0.9) * 4.2)) * Math.exp(-Math.max(0, t - sEnde - 0.9) * 0.25);
      blase.style.transform = `translateY(${-b * 16}px) rotate(${-b * 6}deg)`;
    },
  }));

  // Karaoke-Untertitel (über allem außer Schlusskarte)
  const karaoke = new Karaoke(hud, zp, { y: KY, maxBreite: 860, groesse: 74, versteckt: [[sEnde - 0.15, 999]] });
  karaoke.vorbereiten();
  window.karaoke = karaoke; // für Prüfskripte
  hud.add(karaoke);

  // Klang-Ereignisse für die Tonspur
  const klang = [...hud.klang, ...zl.klangEreignisse()];
  klang.push({ t: ST.tBau0, typ: "rumpeln", dauer: ST.tBau1 - ST.tBau0 });
  klang.push({ t: ST.morph + 0.15, typ: "pop" });
  klang.push({ t: W("behauptung", "rechnen", 0.82) + 0.05, typ: "scan", dauer: 1.5 });
  for (let k = 0; k < 14; k++) klang.push({ t: 0.2 + k * 0.38, typ: "blip", lautstaerke: 0.4 + 0.04 * k });
  for (let k = 0; k < 40; k++) klang.push({ t: W("kosten", "Geld.", 0.05) + 0.8 + k * ((W("kosten", "300", 0.87) - W("kosten", "Geld.", 0.05)) / 40), typ: "muenze" });
  klang.sort((a, b) => a.t - b.t);

  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // wartet, bis die GPU fertig ist (ehrliche Zeitmessung)
  };
  // Aufwärmen: alle Shader einmal kompilieren (Übergänge eingeschlossen)
  for (const t of [0, sKrank, sKrank + 1, ST.tBau1 + 0.5, sRecht, sRecht + 1, sEnde, sEnde + 1]) window.renderAt(Math.min(t, zp.dauer - 0.05));
  window.dauer = zp.dauer;
  window.stimmEnde = zp.stimmEnde;
  window.klangEreignisse = klang;
  window.zeitplan = zp;
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
