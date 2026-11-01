// Video #2 · Simulierbar · „Früh einordnen oder bis zum Ende? Simuliert“ (Rubrik ALLTAG)
// Deterministische Szene: window.renderAt(t) zeichnet das Bild zur Zeit t (Sekunden).
// Zwei gleiche Baustellen nebeneinander: links TEAM FRÜH (blau), rechts TEAM REISSVERSCHLUSS (orange).
// Fahrtrichtung nach oben, Engstelle oben, der Stau wächst nach unten. Die Autos fahren exakt die
// 30-Hz-Trajektorien der typischen Simulationsläufe (trajektorien_<szenario>_<strategie>.json).
// Alle Zahlen im Bild stammen aus sim_ergebnisse.json (kernzahlen) und sind wie im Sprechtext gerundet.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import * as B from "../../engine/bausteine.js";
import { autobahn, Fahrzeugflotte, Trajektorie, spurX } from "../../engine/strasse.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, KinetikTitel, Karaoke, Anker, Erscheinung, chip, el, fmt, SPRECHBLASE } from "../../engine/hud.js";
import { RundenAnzeige, Anzeigetafel, ergebnisPille, STOPPUHR } from "../../engine/duell.js";
import { ease, feder, FEDER, fortschritt, clamp, lerp, hash, rauschen, keyframes, smoothstep } from "../../engine/bewegung.js";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};
function wortZeit(zp, seg, wort, anteil = 0.5, opt) {
  try {
    return zp.w(seg, wort, opt);
  } catch (e) {
    const g = zp.seg(seg);
    console.warn(`Anker fehlt: ${seg}/${wort} → ${Math.round(anteil * 100)} % des Segments`);
    return g.start + anteil * (g.ende - g.start);
  }
}

// Farben
const BLAU = "#2F6FED", ORANGE = "#FF7A1A", GRUEN = "#19B36B", ROT = "#F0443A";
const TEAM = { frueh: new THREE.Color(BLAU), reissverschluss: new THREE.Color(ORANGE) };
const NEUTRAL = ["#F6F4F0", "#F6F4F0", "#ECE7DD", "#D2D8E2", "#D2D8E2", "#A7B0C0", "#4A5161", "#DDE8D9", "#F2E4C4"].map((c) => new THREE.Color(c));

// Lage der beiden Fahrbahnen (Mitte der Fahrstreifen) auf der x-Achse
const XO = 9.6;
const STRASSE_X = { frueh: -XO, reissverschluss: XO };

// =====================================================================================
// Welt: zwei Autobahn-Baustellen in einer Spielzeuglandschaft
// =====================================================================================
function baueWelt(buehne) {
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#8EBBFF"], [0.5, "#CFE2FF"], [1, "#F4EDE2"]]);
  szene.fog = new THREE.Fog("#DCE8F4", 700, 2600);
  const licht = lichtTag(szene, buehne.renderer, {
    sonnenRichtung: [-0.5, 1.0, 0.42], sonnenStaerke: 2.55, bereich: 60, schattenKarte: SCHATTEN, schattenWeich: 4,
    umgebungsStaerke: 0.4, himmelStaerke: 1.25, himmel: "#DDEBFF", boden: "#F6E7CF",
  });
  if (Q.get("env") !== "1") szene.environment = null;

  // Boden
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), B.mat("#A9D592", { rau: 1 }));
  boden.rotation.x = -Math.PI / 2;
  boden.receiveShadow = true;
  szene.add(boden);

  // Fahrbahnen
  const strassen = {};
  for (const [st, X] of Object.entries(STRASSE_X)) {
    const a = autobahn({ vor: 1250, nach: 330, schilder: [800, 400, 200] });
    a.gruppe.position.x = X;
    szene.add(a.gruppe);
    strassen[st] = a;
  }

  // Felder (Flickenteppich) links und rechts, Wege dazwischen
  const feldFarben = ["#9CCF7F", "#B9DE8C", "#D3E69C", "#EADFA2", "#86C473", "#E6D592", "#A8D88E", "#C7E0A0"];
  const feldGeo = new THREE.BoxGeometry(1, 0.06, 1);
  const felder = [];
  for (const seite of [-1, 1]) {
    let x0 = seite < 0 ? -26 : 27;
    for (let spalte = 0; spalte < 6; spalte++) {
      const breite = 38 + hash(spalte * 7 + (seite > 0 ? 3 : 0), 1) * 50;
      let z = -420;
      let k = 0;
      while (z < 1500) {
        const tiefe = 60 + hash(spalte * 31 + k * 5 + (seite > 0 ? 11 : 0), 2) * 120;
        felder.push({ x: x0 + seite * breite / 2, z: z + tiefe / 2, b: breite - 4, t: tiefe - 4, f: feldFarben[Math.floor(hash(spalte * 13 + k * 3 + seite, 3) * feldFarben.length)] });
        z += tiefe;
        k++;
      }
      x0 += seite * breite;
    }
  }
  const feldMesh = new THREE.InstancedMesh(feldGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }), felder.length);
  const m4 = new THREE.Matrix4();
  const farbe = new THREE.Color();
  felder.forEach((f, i) => {
    m4.makeScale(f.b, 1, f.t);
    m4.setPosition(f.x, 0.0, f.z);
    feldMesh.setMatrixAt(i, m4);
    feldMesh.setColorAt(i, farbe.set(f.f));
  });
  feldMesh.receiveShadow = true;
  szene.add(feldMesh);

  // Bäume: Reihen an Feldrändern, Gruppen, Büsche im Mittelstreifen
  const baeume = [];
  const zufall = (i, s) => hash(i, s);
  let n = 0;
  for (const f of felder) {
    if (zufall(n, 4) < 0.55) {
      const anzahl = 3 + Math.floor(zufall(n, 5) * 6);
      for (let k = 0; k < anzahl; k++) baeume.push({ x: f.x - f.b / 2 - 1.5, z: f.z - f.t / 2 + (k + 0.5) * (f.t / anzahl), g: 3.2 + zufall(n * 17 + k, 6) * 2.6 });
    }
    if (zufall(n, 7) < 0.25) {
      const cx = f.x + (zufall(n, 8) - 0.5) * f.b * 0.6, cz = f.z + (zufall(n, 9) - 0.5) * f.t * 0.6;
      for (let k = 0; k < 7; k++) baeume.push({ x: cx + (zufall(n * 3 + k, 10) - 0.5) * 16, z: cz + (zufall(n * 5 + k, 11) - 0.5) * 16, g: 3.6 + zufall(n + k, 12) * 3 });
    }
    n++;
  }
  // Baumreihen entlang der Autobahn (außen)
  for (let z = -380; z < 1500; z += 13) {
    if (hash(Math.round(z), 13) < 0.7) baeume.push({ x: -XO - 4.5 - 7 - hash(Math.round(z), 14) * 4, z: z + hash(Math.round(z), 15) * 6, g: 3 + hash(Math.round(z), 16) * 2.5 });
    if (hash(Math.round(z), 17) < 0.7) baeume.push({ x: XO + 6.25 + 8 + hash(Math.round(z), 18) * 4, z: z + hash(Math.round(z), 19) * 6, g: 3 + hash(Math.round(z), 20) * 2.5 });
  }
  const kroneGeo = new THREE.IcosahedronGeometry(1, 2);
  const krone = new THREE.InstancedMesh(kroneGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, flatShading: false }), baeume.length * 2);
  const stamm = new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(0.22, 0.3, 1, 8); g.translate(0, 0.5, 0); return g; })(), B.mat("#B58C68"), baeume.length);
  const gruen = ["#5DBB7A", "#4FAE6E", "#6CC584", "#86D09A", "#58B070"];
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  baeume.forEach((b, i) => {
    m4.compose(p.set(b.x, 0, b.z), q.identity(), s.set(1, b.g * 0.55, 1));
    stamm.setMatrixAt(i, m4);
    const r = b.g * 0.42;
    m4.compose(p.set(b.x, b.g * 0.55 + r * 0.7, b.z), q, s.set(r, r * 1.05, r));
    krone.setMatrixAt(i * 2, m4);
    krone.setColorAt(i * 2, farbe.set(gruen[i % gruen.length]));
    const r2 = r * 0.65;
    m4.compose(p.set(b.x + r * 0.45, b.g * 0.55 + r * 1.2, b.z + r * 0.2), q, s.set(r2, r2, r2));
    krone.setMatrixAt(i * 2 + 1, m4);
    krone.setColorAt(i * 2 + 1, farbe.set(gruen[(i + 2) % gruen.length]).offsetHSL(0, 0, 0.06));
  });
  krone.castShadow = stamm.castShadow = true;
  krone.receiveShadow = stamm.receiveShadow = true;
  szene.add(krone, stamm);
  // Büsche im Mittelstreifen
  const buesche = [];
  const mitte = (-XO + 6.25 + XO - 4.5) / 2;
  for (let z = -320; z < 1300; z += 5.5) if (hash(Math.round(z * 3), 21) < 0.8) buesche.push(V(mitte + (hash(Math.round(z), 22) - 0.5) * 1.2, 0.5, z));
  const busch = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), B.mat("#6CBF7E", { rau: 0.8 }), buesche.length);
  buesche.forEach((b, i) => {
    const g = 0.9 + hash(i, 23) * 0.5;
    m4.compose(b, q.identity(), s.set(g * 1.3, g * 0.85, g * 1.6));
    busch.setMatrixAt(i, m4);
  });
  busch.castShadow = true;
  busch.receiveShadow = true;
  szene.add(busch);

  // Markierungsbänder („500 m kaum Stau“ links, „genutzt“ rechts), anfangs unsichtbar
  const band = (X, farbe) => {
    const g = new THREE.Group();
    const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe), transparent: true, opacity: 0.0, depthWrite: false }));
    flaeche.rotation.x = -Math.PI / 2;
    flaeche.renderOrder = 3;
    g.add(flaeche);
    const kanteMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(2.4), toneMapped: false, transparent: true, opacity: 0 });
    const kanten = [-4.4, 4.4].map((x) => {
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1), kanteMat);
      k.position.x = x;
      g.add(k);
      return k;
    });
    const quer = [0, 1].map(() => {
      const k = new THREE.Mesh(new THREE.BoxGeometry(9.3, 0.08, 1.2), kanteMat);
      g.add(k);
      return k;
    });
    g.position.set(X, 0.09, 0);
    szene.add(g);
    return {
      g,
      setze(von, bis, sichtbar) {
        const l = Math.max(0.01, bis - von);
        flaeche.scale.y = l;
        flaeche.position.z = (von + bis) / 2;
        kanten.forEach((k) => { k.scale.z = l; k.position.z = (von + bis) / 2; });
        quer[0].position.z = von;
        quer[1].position.z = bis;
        flaeche.material.opacity = 0.34 * sichtbar;
        kanteMat.opacity = sichtbar;
        g.visible = sichtbar > 0.01;
      },
    };
  };
  const baender = { frueh: band(-XO, "#3BD18A"), reissverschluss: band(XO, ORANGE) };
  baender.frueh.setze(0, 1, 0);
  baender.reissverschluss.setze(0, 1, 0);

  const flotte = new Fahrzeugflotte(900);
  szene.add(flotte.gruppe);
  return { szene, licht, strassen, flotte, baender };
}

// =====================================================================================
// Kamera und Schatten
// =====================================================================================
/** Kamera aus [Azimut, Höhenwinkel, Abstand, Ziel x, y, z, fov] (Azimut 0 = hinter dem Ziel, Blick nach −z) */
function setzeKamera(kamera, v) {
  const [az, elv, d, tx, ty, tz, fov] = v;
  kamera.position.set(tx + d * Math.cos(elv) * Math.sin(az), ty + d * Math.sin(elv), tz + d * Math.cos(elv) * Math.cos(az));
  kamera.lookAt(tx, ty, tz);
  if (kamera.fov !== fov) {
    kamera.fov = fov;
    kamera.updateProjectionMatrix();
  }
  kamera.updateMatrixWorld();
}
const _ray = new THREE.Raycaster();
const _ebene = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
/** Sichtbarer Bodenbereich (z-Spanne) der Kamera, für Schatten und Fahrzeug-Auswahl */
function bodenBereich(kamera) {
  const zs = [], xs = [];
  for (const [u, v] of [[-1, -1], [1, -1], [-1, 0.35], [1, 0.35], [0, 1]]) {
    _ray.setFromCamera(new THREE.Vector2(u, v), kamera);
    const p = new THREE.Vector3();
    if (_ray.ray.intersectPlane(_ebene, p)) { zs.push(p.z); xs.push(p.x); }
    else { zs.push(kamera.position.z - 3000); }
  }
  return { zMin: Math.min(...zs), zMax: Math.max(...zs), xMin: Math.min(...xs), xMax: Math.max(...xs) };
}
function folgeSchatten(licht, kamera) {
  // Schatten-Box über dem vorderen, gut sichtbaren Bodenbereich (Bildmitte bis unten)
  const pts = [];
  for (const [u, v] of [[-1, -1], [1, -1], [-1, 0.25], [1, 0.25]]) {
    _ray.setFromCamera(new THREE.Vector2(u, v), kamera);
    const p = new THREE.Vector3();
    if (_ray.ray.intersectPlane(_ebene, p)) pts.push(p);
  }
  if (!pts.length) return;
  const m = pts.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / pts.length);
  let r = 10;
  for (const p of pts) r = Math.max(r, p.distanceTo(m));
  r = Math.min(r * 1.05, 260);
  // auf ein Raster runden, damit Schatten beim Fahren der Kamera nicht flimmern
  const raster = (r * 2) / licht.sonne.shadow.mapSize.x;
  m.x = Math.round(m.x / raster) * raster;
  m.z = Math.round(m.z / raster) * raster;
  const c = licht.sonne.shadow.camera;
  if (Math.abs(c.right - r) > 0.5) {
    c.left = -r; c.right = r; c.top = r; c.bottom = -r;
    c.far = 400;
    c.updateProjectionMatrix();
  }
  const d = new THREE.Vector3(-0.5, 1.0, 0.42).normalize().multiplyScalar(150);
  licht.sonne.position.copy(m).add(d);
  licht.sonne.target.position.copy(m);
  licht.sonne.target.updateMatrixWorld();
}

// =====================================================================================
// Verkehr aus Trajektorien
// =====================================================================================
function farbeFuer(st, f) {
  return f.h === 1 ? TEAM[st] : NEUTRAL[Math.floor(hash(f.id, 5) * NEUTRAL.length)];
}
const _kp = new THREE.Vector3();
function setzeVerkehr(W, daten, tau, kamera, merke = null) {
  const ber = bodenBereich(kamera);
  const zMin = ber.zMin - 30, zMax = ber.zMax + 20;
  const liste = [];
  for (const st of ["frueh", "reissverschluss"]) {
    const X = STRASSE_X[st];
    daten[st].fahrzeuge(tau, (f) => {
      const z = -f.x;
      if (z < zMin || z > zMax) return;
      const x = X + spurX(f.s);
      // roter Bodenschein nur in der Ferne (dort sind die Rücklichter selbst nur noch Punkte)
      const d = _kp.set(x, 0, z).distanceTo(kamera.position);
      const auto = { x, z, rot: Math.PI / 2 - f.gier, farbe: farbeFuer(st, f), bremse: f.bremse, schein: 0.12 + 0.88 * smoothstep(120, 420, d) };
      liste.push(auto);
      if (merke) merke(st, f, auto);
    });
  }
  W.flotte.setze(liste);
}

// =====================================================================================
// Rückstau-Kurven für die Zähler: Verlauf des typischen Laufs, Endwert = Kernzahl (Mittel aus 50 Läufen)
// =====================================================================================
function rueckstauKurve(traj, endwertM) {
  const gl = traj.daten.staulaenge.ganzer_lauf;
  const dt = gl.dt_s;
  const n = Math.round(1800 / dt) + 1;
  const roh = gl.rueckstau_m.slice(0, n);
  const glatt = roh.map((_, i) => {
    let s = 0, k = 0;
    for (let j = Math.max(0, i - 3); j <= Math.min(roh.length - 1, i + 3); j++) { s += roh[j]; k++; }
    return s / k;
  });
  const ende = glatt[glatt.length - 1];
  return (p) => {
    const f = clamp(p) * (glatt.length - 1);
    const i = Math.floor(f), u = f - i;
    const w = glatt[i] + ((glatt[Math.min(glatt.length - 1, i + 1)]) - glatt[i]) * u;
    if (p <= 0) return 0;
    // Anfang weich bei 0 beginnen (der geglättete erste Wert ist nicht 0)
    return p >= 1 ? endwertM : Math.min(endwertM, Math.max(0, (w * endwertM) / ende)) * smoothstep(0, 0.08, p);
  };
}
const formatStau = (m) => (m < 995 ? `${fmt.zahl(Math.round(m / 10) * 10)} m` : `${fmt.zahl(m / 1000, 1)} km`);

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing);
  const W = (s, w, a, o) => wortZeit(zp, s, w, a, o);
  const S = (id) => zp.seg(id);
  const namen = skript.szenario_namen || { wenig: "Wenig Verkehr", feierabend: "Feierabend", rushhour: "Rushhour" };

  // Daten
  const erg = await lade("sim_ergebnisse.json");
  const kern = (sz) => erg.szenarien[sz].kernzahlen;
  const traj = {};
  for (const sz of ["wenig", "feierabend", "rushhour"]) {
    traj[sz] = {};
    for (const st of ["frueh", "reissverschluss"]) traj[sz][st] = new Trajektorie(await lade(`trajektorien_${sz}_${st}.json`));
  }

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "600 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const WELT = baueWelt(buehne);
  const { szene } = WELT;

  // ---------- Segmentzeiten ----------
  const tSetup = S("setup").start, tR1 = S("runde1").start, tR2 = S("runde2").start, tR3 = S("runde3").start;
  const tRegel = S("regel").start, tEnde = S("ende").start;
  const DAUER = zp.dauer;

  // ---------- Kamera-Fahrten (Werte: Azimut, Höhenwinkel, Abstand, Ziel x, y, z, fov) ----------
  const kamOverride = Q.get("kam") ? Q.get("kam").split(",").map(Number) : null;
  const welt = (name, kameraKeys, datenFn, post, extra = null, merke = null) => {
    const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 1, 6000);
    const w = {
      name, szene, kamera, post: { ...post },
      update(t) {
        setzeKamera(kamera, kamOverride || keyframes(kameraKeys, t));
        // leichtes Atmen der Kamera (Drohne)
        kamera.position.x += rauschen(t * 0.3, 3) * 0.25;
        kamera.position.y += rauschen(t * 0.27, 4) * 0.2;
        kamera.updateMatrixWorld();
        const { daten, tau } = datenFn(t);
        setzeVerkehr(WELT, daten, tau, kamera, merke);
        folgeSchatten(WELT.licht, kamera);
        WELT.strassen.frueh.update(t);
        WELT.strassen.reissverschluss.update(t);
        if (extra) extra(t, w);
      },
    };
    return w;
  };
  const tauLinear = (t0, rate = 1, tau0 = 0, max = 17.98) => (t) => clamp(tau0 + (t - t0) * rate, 0, max);

  // Kamera-Einstellungen (berechnet: Engstelle z = 0 liegt knapp unter der Anzeigetafel, y ≈ 650 px)
  const K = {
    beide: [0, 0.5, 170, 1.5, 0, 33, 30],           // beide Engstellen, Straßen füllen die Bildbreite
    schildLinks: [0, 0.5, 150, -XO, 0, 790, 30],    // linke Straße am Schild (800 m vor der Engstelle)
    endeRechts: [0, 0.6, 225, XO, 0, 40, 30],       // rechte Straße: Engstelle oben, Einfädelzone (60 m) in der Bildmitte
    ueberblick: [0, 0.16, 325, 1.5, 0, 485, 32],    // flache Drohne: Engstelle oben (y ≈ 640), 570 m davor bei y ≈ 1150
    stau: [0, 0.45, 160, 1.5, 0, 800, 30],          // über den Staus vor dem Schild (Bremswellen); Bildunterkante bleibt vor 1.000 m
  };
  const mix = (a, b, d) => a.map((x, i) => x + (d[i] || 0));

  // Hook: Nahaufnahme der rechten Baustelle (Reißverschluss), Daten „rushhour“
  const hookTau = tauLinear(0, 1, 0.0);
  let vorderstes = V(XO + 1.875, 1.6, 4);
  const weltHook = welt("hook", [
    { t: 0, v: [0.1, 0.55, 118, XO + 0.8, 0, 20, 30] },
    { t: tSetup, v: [0.04, 0.56, 100, XO + 0.8, 0, 16, 30], e: ease.linear },
  ], (t) => ({ daten: traj.rushhour, tau: hookTau(t) }), { bloomStaerke: 0.8, bloomSchwelle: 1.15, tiltStaerke: 0.9, tiltBreite: 0.3, tiltMitte: 0.52, vignette: 0.26, koernung: 0.038 },
  null, (st, f, auto) => {
    // vorderstes Auto auf dem endenden Streifen (für das Drängler-Schild)
    if (st === "reissverschluss" && f.s > 0.7 && auto.z > 0 && auto.z < vorderstes.z + 0.01) vorderstes.set(auto.x, 1.6, auto.z);
  });
  const hookUpdate = weltHook.update;
  weltHook.update = (t) => { vorderstes.set(XO + 1.875, 1.6, 999); hookUpdate(t); if (vorderstes.z > 900) vorderstes.z = 4; };

  // Setup: Feierabend-Daten. Einstellung beide → linke Straße am Schild (Früh-Einordner) → rechte Engstelle (Reißverschluss)
  const tLinks = W("setup", "Links", 0.4), tRechts = W("setup", "Rechts", 0.7);
  const setupTau = tauLinear(tSetup, 1, 0.0);
  const weltSetup = welt("setup", [
    { t: tSetup - 0.4, v: mix(K.beide, [], [0, 0.04, 30, 0, 0, 0]) },
    { t: tLinks - 0.15, v: K.beide, e: ease.outCubic },
    { t: tLinks + 0.95, v: K.schildLinks, e: ease.inOutCubic },
    { t: tRechts - 0.2, v: mix(K.schildLinks, [], [0.04, 0.02, -15, 0, 0, -10]), e: ease.linear },
    { t: tRechts + 0.95, v: K.endeRechts, e: ease.inOutCubic },
    { t: tR1 + 0.5, v: mix(K.endeRechts, [], [-0.05, 0.02, -20, 0, 0, -6]), e: ease.linear },
  ], (t) => ({ daten: traj.feierabend, tau: setupTau(t) }), { bloomStaerke: 0.75, bloomSchwelle: 1.12, tiltStaerke: 0.85, tiltBreite: 0.34, tiltMitte: 0.55, vignette: 0.24, koernung: 0.038 });

  // Runde 1: wenig Verkehr. Beide Straßen, dann zum Schild links (dort ordnet sich gerade jemand früh ein)
  const r1Tau = tauLinear(tR1, 1, 0.0);
  const tOkay = W("runde1", "frühes", 0.75);
  const weltR1 = welt("runde1", [
    { t: tR1 - 0.4, v: mix(K.beide, [], [0, 0.02, 20, 0, 0, 10]) },
    { t: tOkay - 1.4, v: mix(K.beide, [], [0, -0.02, 10, 0, 0, 40]), e: ease.linear },
    { t: tOkay - 0.2, v: K.schildLinks, e: ease.inOutCubic },
    { t: tR2 + 0.5, v: mix(K.schildLinks, [], [0.03, 0.01, -15, 0, 0, -8]), e: ease.linear },
  ], (t) => ({ daten: traj.wenig, tau: r1Tau(t) }), { bloomStaerke: 0.7, bloomSchwelle: 1.15, tiltStaerke: 0.85, tiltBreite: 0.34, tiltMitte: 0.55, vignette: 0.24, koernung: 0.038 });

  // Runde 2: Feierabend. Engstellen → flache Drohne (500 m vor der Engstelle sichtbar) → über die Staus
  const r2Tau = tauLinear(tR2, 1, 0.0);
  const tNach = W("runde2", "Nach", 0.2);
  const tBrems = W("runde2", "Bremswellen", 0.85);
  const weltR2 = welt("runde2", [
    { t: tR2 - 0.4, v: mix(K.beide, [], [0, 0, 30, 0, 0, 10]) },
    { t: tNach, v: mix(K.beide, [], [0, -0.02, -20, 0, 0, 0]), e: ease.linear },
    { t: W("runde2", "Denn", 0.6) - 0.2, v: K.ueberblick, e: ease.inOutCubic },
    { t: W("runde2", "In", 0.9, { ab: 20 }) - 0.4, v: mix(K.ueberblick, [], [0, 0.01, -20, 0, 0, 10]), e: ease.linear },
    { t: tBrems + 0.7, v: K.stau, e: ease.inOutCubic },
    { t: tR3 + 0.5, v: mix(K.stau, [], [0, 0.02, -10, 0, 0, -12]), e: ease.linear },
  ], (t) => ({ daten: traj.feierabend, tau: r2Tau(t) }), { bloomStaerke: 0.85, bloomSchwelle: 1.05, tiltStaerke: 0.8, tiltBreite: 0.38, tiltMitte: 0.55, vignette: 0.24, koernung: 0.038 });

  // Runde 3: Ferienbeginn (Daten „rushhour“), leicht verlangsamt, damit das 18-s-Fenster reicht.
  // Staus → Überblick → zur rechten Engstelle (§ 7: Einfädeln unmittelbar vor der Engstelle)
  const r3Rate = Math.min(1, 17.9 / (tRegel - tR3 + 0.4));
  const r3Tau = tauLinear(tR3, r3Rate, 0.0);
  const weltR3 = welt("runde3", [
    { t: tR3 - 0.4, v: mix(K.stau, [], [0, 0.02, 10, 0, 0, -20]) },
    { t: W("runde3", "Rückstau", 0.3), v: K.stau, e: ease.linear },
    { t: W("runde3", "13", 0.5) + 0.6, v: K.ueberblick, e: ease.inOutCubic },
    { t: W("runde3", "Die", 0.7, { ab: 30 }) - 0.3, v: mix(K.ueberblick, [], [0, 0.01, -25, 0, 0, 10]), e: ease.linear },
    { t: W("runde3", "Deutschland", 0.85), v: K.endeRechts, e: ease.inOutCubic },
    { t: tRegel + 0.5, v: mix(K.endeRechts, [], [-0.06, 0.02, -25, 0, 0, -6]), e: ease.linear },
  ], (t) => ({ daten: traj.rushhour, tau: r3Tau(t) }), { bloomStaerke: 0.85, bloomSchwelle: 1.05, tiltStaerke: 0.8, tiltBreite: 0.38, tiltMitte: 0.55, vignette: 0.24, koernung: 0.038 });

  // Regel: ruhiger Flug über die Baustellen, unscharf und abgedunkelt hinter der Regel-Karte
  const regelTau = tauLinear(tRegel, 1, 1.5);
  const weltRegel = welt("regel", [
    { t: tRegel - 0.5, v: [-0.1, 0.55, 300, 1.5, 0, 60, 28] },
    { t: tEnde + 0.5, v: [0.1, 0.6, 270, 1.5, 0, 40, 28], e: ease.linear },
  ], (t) => ({ daten: traj.wenig, tau: regelTau(t) }), { bloomStaerke: 0.8, bloomSchwelle: 1.0, tiltStaerke: 0, unschaerfe: 0.5, vignette: 0.3, koernung: 0.04, belichtung: 0.92, tonung: [0.9, 0.95, 1.08], tonungStaerke: 0.4 });

  // Ende: hoch über der Landschaft, stark unscharf, dunkelblau getönt
  const endeTau = tauLinear(tEnde, 1, 2.0);
  const weltEnde = welt("ende", [
    { t: tEnde - 0.5, v: [0.0, 1.0, 700, 1.5, 0, 200, 30] },
    { t: DAUER, v: [0.08, 1.1, 620, 1.5, 0, 160, 30], e: ease.linear },
  ], (t) => ({ daten: traj.feierabend, tau: endeTau(t) }), { bloomStaerke: 0.6, bloomSchwelle: 1.2, unschaerfe: 0.85, vignette: 0.55, koernung: 0.045, belichtung: 0.42, tonung: [0.42, 0.58, 1.3], tonungStaerke: 0.92, saettigung: 0.75 });

  // Markierungsbänder in Runde 2 und 3
  const t500 = W("runde2", "500", 0.4);
  const tGenutzt = W("runde2", "Rechts", 0.6);
  const t500b = W("runde3", "500", 0.6, { ab: 20 });
  const baenderBei = (t) => {
    let l = 0, r = 0, lLaenge = 0, rLaenge = 0;
    if (t >= t500 - 0.2 && t < tR3) {
      l = clamp((t - t500 + 0.2) * 3) * (1 - clamp((t - (W("runde2", "Bremswellen", 0.85) - 0.3)) * 2.5));
      lLaenge = 500 * ease.outCubic(clamp((t - t500 + 0.2) / 0.9));
    }
    if (t >= tGenutzt - 0.2 && t < tR3) {
      r = clamp((t - tGenutzt + 0.2) * 3) * (1 - clamp((t - (W("runde2", "Bremswellen", 0.85) - 0.3)) * 2.5));
      rLaenge = 500 * ease.outCubic(clamp((t - tGenutzt + 0.2) / 0.9));
    }
    if (t >= t500b - 0.2 && t < tRegel) {
      l = Math.max(l, clamp((t - t500b + 0.2) * 3) * (1 - clamp((t - t500b - 2.4) * 2.5)));
      lLaenge = Math.max(lLaenge, 500 * ease.outCubic(clamp((t - t500b + 0.2) / 0.9)));
    }
    WELT.baender.frueh.setze(0, Math.max(1, lLaenge), l);
    WELT.baender.reissverschluss.setze(0, Math.max(1, rLaenge), r);
  };
  for (const w of [weltR2, weltR3]) {
    const u = w.update;
    w.update = (t) => { u(t); baenderBei(t); };
  }
  for (const w of [weltHook, weltSetup, weltR1, weltRegel, weltEnde]) {
    const u = w.update;
    w.update = (t) => { u(t); WELT.baender.frueh.setze(0, 1, 0); WELT.baender.reissverschluss.setze(0, 1, 0); };
  }

  // ---------- Zeitleiste ----------
  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltHook);
  zl.shot(tSetup - 0.15, weltSetup, { typ: "wisch", dauer: 0.7, richtung: [1, -0.3], farbe1: BLAU, farbe2: ORANGE });
  zl.shot(tR1 - 0.05, weltR1, { typ: "wisch", dauer: 0.7, richtung: [-1, -0.3], farbe1: "#FFD23F", farbe2: GRUEN });
  zl.shot(tR2 - 0.05, weltR2, { typ: "wisch", dauer: 0.7, richtung: [-1, -0.3], farbe1: "#FFD23F", farbe2: BLAU });
  zl.shot(tR3 - 0.05, weltR3, { typ: "wisch", dauer: 0.7, richtung: [1, -0.3], farbe1: "#FFD23F", farbe2: ORANGE });
  zl.shot(tRegel - 0.1, weltRegel, { typ: "iris", dauer: 0.8, mitte: [0.5, 0.45], farbe1: GRUEN });
  zl.shot(tEnde - 0.1, weltEnde, { typ: "zoom", dauer: 0.8, mitte: [0.5, 0.45] });

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  const KY = 1300;
  // (Markenleiste entfernt: kein Kanalname, kein Logo, keine Rubrik im Video, Entscheidung 31.10.)

  // Hook: kinetischer Titel
  const hk = (w, a) => Math.max(0.02, W("hook", w, a) - 0.1);
  const hookTitel = hud.add(new KinetikTitel(hud, [
    // schon im ersten Bild vollständig (Vorschaubild im Feed)
    { text: "Wer", t: -0.8 },
    { text: "macht’s", t: -0.8 },
    { umbruch: true },
    { text: "richtig?", t: -0.8, klasse: "gelb" },
  ], { y: 290, groesse: 120, zeilenhoehe: 1.0, aus: tSetup - 0.35 }));
  chip(hud, { flagge: "SIM", text: "simuliert", x: 54, y: 590, ein: hk("simuliert.", 0.8), aus: tSetup - 0.35, farbe: BLAU, klasse: "gross" });
  // Drängler-Schild über dem vordersten orangen Auto
  const draengler = hud.add(new Anker(hud, {
    html: "<small>Fährt bis vorne</small>Drängler?", kamera: weltHook.kamera, ein: -0.8, aus: tSetup - 0.4, minY: 470, hoehe: 170,
    punkt: () => vorderstes,
  }));
  // Das Schild weicht dem Titel aus: mindestens 24 px Abstand zu jedem Titelwort (nach rechts verschieben)
  const draenglerUpdate = draengler.update.bind(draengler);
  draengler.update = (t) => {
    draenglerUpdate(t);
    if (draengler.e.style.visibility === "hidden") return;
    const a = draengler.schild.getBoundingClientRect();
    let dx = 0, dy = 0;
    for (const w of hookTitel.woerter) {
      if (w.el.style.opacity === "0") continue;
      const r = w.el.getBoundingClientRect();
      const senkrecht = a.top < r.bottom + 24 && a.bottom > r.top - 24;
      if (senkrecht && a.left < r.right + 24 && a.right > r.left - 24) {
        dx = Math.max(dx, r.right + 24 - a.left);
        dy = Math.max(dy, r.bottom + 24 - a.top);
      }
    }
    // bevorzugt nach rechts ausweichen, solange die rechte Sicherheitszone (150 px) frei bleibt, sonst nach unten
    if (dx > 0 && a.right + dx <= 930) draengler.schild.style.transform += ` translateX(${dx.toFixed(1)}px)`;
    else if (dy > 0) draengler.schild.style.transform += ` translateY(${dy.toFixed(1)}px)`;
  };

  // Setup: wo wird eingeordnet?
  hud.add(new Anker(hud, {
    html: "<small>800 m vor der Baustelle</small>früh rein", kamera: weltSetup.kamera, ein: tLinks + 0.75, aus: tRechts - 0.15, minY: 600, hoehe: 110,
    punkt: () => V(-XO, 1.0, 805),
  }));
  hud.add(new Anker(hud, {
    html: "<small>an der Engstelle</small>abwechselnd", kamera: weltSetup.kamera, ein: tRechts + 0.8, aus: tR1 - 0.3, minY: 600, hoehe: 110,
    punkt: () => V(XO, 1.0, 50),
  }));

  // Runden-Anzeige
  hud.add(new RundenAnzeige(hud, [
    { ab: tR1, bis: tR2, titel: namen.wenig },
    { ab: tR2, bis: tR3, titel: namen.feierabend },
    { ab: tR3, bis: tRegel - 0.3, titel: namen.rushhour },
  ], { top: 240 }));

  // Anzeigetafel (zwei Teams)
  const k2 = kern("feierabend"), k3 = kern("rushhour");
  const kurve2 = {
    frueh: rueckstauKurve(traj.feierabend.frueh, k2.rueckstauAmEndeKm.frueh * 1000),
    reissverschluss: rueckstauKurve(traj.feierabend.reissverschluss, k2.rueckstauAmEndeKm.reissverschluss * 1000),
  };
  const kurve3 = {
    frueh: rueckstauKurve(traj.rushhour.frueh, k3.rueckstauAmEndeKm.frueh * 1000),
    reissverschluss: rueckstauKurve(traj.rushhour.reissverschluss, k3.rueckstauAmEndeKm.reissverschluss * 1000),
  };
  const SKALA = 7000; // Längenbalken: 7 km = volle Breite
  const z2a = W("runde2", "Nach", 0.2) - 0.1, z2b = W("runde2", "3,4", 0.32) + 0.45;
  const z3a = W("runde3", "Hier", 0.2) - 0.1, z3b = W("runde3", "13", 0.5) - 0.2;
  const tFahrzeit = W("runde3", "Schneller", 0.6) - 0.1, tFahrzeitAus = W("runde3", "kürzer.", 0.75, { ab: 25 }) + 0.45;
  const reisezeitMin = (sz, st) => Math.round(erg.szenarien[sz].strategien[st].reisezeitMittelS.mittel / 60);
  const tafel = new Anzeigetafel(hud, {
    y: 330, ein: W("setup", "Zwei", 0.02) + 0.1, aus: tRegel - 0.3,
    links: { titel: "TEAM FRÜH", farbe: BLAU },
    rechts: { titel: "TEAM REISSVERSCHLUSS", farbe: ORANGE },
    stoesse: [{ t: z2b, seite: "links" }, { t: W("runde2", "2,5", 0.7), seite: "rechts" }, { t: z3b, seite: "beide" }],
    zustand: (t) => {
      if (t < tR1) return { label: "Strategie", links: { wert: "früh einordnen", anteil: null, klein: true }, rechts: { wert: "bis zum Ende", anteil: null, klein: true } };
      if (t < tR2) return { label: "Stau", links: { wert: "0 m", anteil: 0 }, rechts: { wert: "0 m", anteil: 0 } };
      if (t < tR3) {
        const p = ease.inOutSine(fortschritt(t, z2a, z2b));
        const l = kurve2.frueh(p), r = kurve2.reissverschluss(p);
        return { label: "Rückstau · 30 Min.", links: { wert: formatStau(l), anteil: l / SKALA }, rechts: { wert: formatStau(r), anteil: r / SKALA } };
      }
      if (t >= tFahrzeit && t < tFahrzeitAus) {
        // „Schneller bist du damit aber nicht“: mittlere Fahrzeit über die ganze Strecke, gerundet auf Minuten
        return { label: "Fahrzeit Ø", links: { wert: `${reisezeitMin("rushhour", "frueh")} min`, anteil: null }, rechts: { wert: `${reisezeitMin("rushhour", "reissverschluss")} min`, anteil: null } };
      }
      const p = ease.inOutSine(fortschritt(t, z3a, z3b));
      const l = kurve3.frueh(p), r = kurve3.reissverschluss(p);
      return { label: "Rückstau · 30 Min.", links: { wert: formatStau(l), anteil: l / SKALA }, rechts: { wert: formatStau(r), anteil: r / SKALA } };
    },
  });
  hud.add(tafel);
  // kleine Werte (Strategie) in kleinerer Schrift
  const tafelUpdate = tafel.update.bind(tafel);
  tafel.update = (t) => {
    tafelUpdate(t);
    const z = tafel.zustand(t);
    tafel.l.wert.classList.toggle("klein", !!z.links.klein);
    tafel.r.wert.classList.toggle("klein", !!z.rechts.klein);
  };

  // Runde 1
  chip(hud, { flagge: "=", text: "gleiche Fahrzeit", x: 492, y: 590, basis: "translateX(-50%)", ein: W("runde1", "gleiche", 0.4) - 0.1, aus: W("runde1", "frühes", 0.75) - 0.5, farbe: GRUEN });
  chip(hud, { flagge: "✓", text: "früh einordnen: okay", x: 54, y: 590, ein: W("runde1", "völlig", 0.85) - 0.2, aus: tR2 - 0.35, farbe: GRUEN });

  // Runde 2: 3D-Labels an den Markierungsbändern
  const bandAus = W("runde2", "Bremswellen", 0.85) - 0.45;
  chip(hud, { flagge: "500 m", text: "kaum Stau", x: 54, y: 760, ein: t500 + 0.25, aus: bandAus, farbe: GRUEN, stil: "links" });
  chip(hud, { flagge: "500 m", text: "genutzt", x: 596, y: 760, ein: tGenutzt + 0.25, aus: bandAus, farbe: ORANGE, stil: "rechts" });
  chip(hud, { flagge: "500 m", text: "zählen kaum", x: 54, y: 760, ein: t500b + 0.2, aus: t500b + 2.6, farbe: GRUEN, stil: "links" });
  chip(hud, { flagge: "!", text: "Bremswellen laufen nach hinten", x: 54, y: 590, ein: W("runde2", "Bremswellen", 0.85) - 0.15, aus: tR3 - 0.35, farbe: ROT });

  // Runde 3: Ergebnis, Fahrzeit, Quellen
  const red3 = erg.szenarien.rushhour.kernzahlen.rueckstauReduktionProzent.amEnde;
  const pille = ergebnisPille(hud, { html: `−${fmt.zahl(red3)} %<small>kürzerer<br>Rückstau</small>`, x: 0, y: 590, ein: W("runde3", "13", 0.5) - 0.12, aus: tRegel - 0.35, farbe: ORANGE });
  pille.style.left = "auto";
  pille.style.right = "150px";
  pille.style.transformOrigin = "80% 50%";
  chip(hud, { flagge: "USA", text: "MnDOT: bis zu −40 % Rückstau", x: 54, y: 760, ein: W("runde3", "40", 0.85) - 0.15, aus: tRegel - 0.35, farbe: BLAU });
  chip(hud, { flagge: "§", text: "7 Abs. 4 StVO", x: 54, y: 870, ein: W("runde3", "Paragraf", 0.9) - 0.1, aus: tRegel - 0.35, farbe: "#14171F" });

  // Regel-Karte
  const PFEIL = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12h12M12 6l6 6-6 6" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const HAKEN = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const regel = el("div", "regelkarte", `<div class="kopf"><span class="haken">${HAKEN}</span>Die Regel</div>
    <div class="zeile z1" style="--farbe:${ORANGE}"><div class="wenn"><small>Wenn</small>Viel Verkehr</div><span class="pfeil">${PFEIL}</span><div class="dann">bis zum Ende,<br>abwechselnd</div></div>
    <div class="zeile z2" style="--farbe:${BLAU}"><div class="wenn"><small>Wenn</small>Wenig Verkehr</div><span class="pfeil">${PFEIL}</span><div class="dann">ruhig früher</div></div>`, hud.wurzel);
  const z1 = regel.querySelector(".z1"), z2 = regel.querySelector(".z2");
  const tViel = W("regel", "Viel", 0.15) - 0.15, tWenig = W("regel", "Wenig", 0.5) - 0.15;
  hud.add(new Erscheinung(hud, regel, {
    x: 54, y: 300, breite: 876, ein: tRegel + 0.05, aus: tEnde - 0.3, stil: "kipp", farbe: GRUEN, klang: "ding",
    nachUpdate: (t) => {
      for (const [z, t0] of [[z1, tViel], [z2, tWenig]]) {
        // Zeilen sind von Anfang an da (gedimmt), damit die Karte nie leer wirkt; zum Wort leuchten sie auf
        const s = t < t0 ? 0 : feder(t - t0, FEDER.knackig);
        z.style.opacity = String(0.22 + 0.78 * clamp(s * 2.5));
        z.style.transform = `translateX(${(1 - Math.min(1, s)) * 40}px) scale(${0.97 + 0.03 * Math.min(1, s)})`;
      }
    },
  }));
  hud.klang.push({ t: tViel, typ: "pop" }, { t: tWenig, typ: "pop" });
  chip(hud, { flagge: "!", text: "Drängler = wer keinen reinlässt", x: 54, y: 880, ein: W("regel", "Drängler", 0.6) - 0.1, aus: tEnde - 0.3, farbe: ROT });

  // Schlusskarte
  const schluss = el("div", "schluss", `<div class="aufruf"><span class="blase">${SPRECHBLASE}</span><span>Schreibt euren Simulations&shy;wunsch in die Kommentare</span></div>`, hud.wurzel);
  const aufruf = schluss.querySelector(".aufruf");
  const blase = schluss.querySelector(".blase");
  hud.add(new Erscheinung(hud, aufruf, {
    ein: tEnde + 0.05, stil: "hoch", feder: FEDER.standard, klang: "ding",
    nachUpdate: (t) => {
      const b = Math.max(0, Math.sin((t - tEnde - 0.9) * 4.2)) * Math.exp(-Math.max(0, t - tEnde - 0.9) * 0.25);
      blase.style.transform = `translateY(${-b * 16}px) rotate(${-b * 6}deg)`;
    },
  }));

  // Karaoke-Untertitel
  const karaoke = new Karaoke(hud, zp, { y: KY, maxBreite: 860, groesse: 72, versteckt: [[tEnde - 0.15, 999]] });
  karaoke.vorbereiten();
  // nie zwei Untertitel-Blöcke gleichzeitig (sonst springt der alte Block für 2 Bilder zur Seite): der neuere gewinnt
  const karaokeUpdate = karaoke.update.bind(karaoke);
  karaoke.update = (t) => {
    karaokeUpdate(t);
    const sichtbar = karaoke.bloecke.filter((b) => b.el.style.display !== "none");
    for (let i = 0; i < sichtbar.length - 1; i++) sichtbar[i].el.style.display = "none";
  };
  hud.add(karaoke);

  // Klang-Ereignisse
  const klang = [...hud.klang, ...zl.klangEreignisse()];
  klang.push({ t: z2a, typ: "zaehlen", dauer: z2b - z2a }, { t: z3a, typ: "zaehlen", dauer: z3b - z3a });
  klang.push({ t: 0.02, typ: "schlag" }); // Titel steht schon im ersten Bild: ein Schlag zum Start
  klang.sort((a, b) => a.t - b.t);

  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, tSetup, tR2, tR3, tRegel, tEnde, tEnde + 1]) window.renderAt(Math.min(t, zp.dauer - 0.05));
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
