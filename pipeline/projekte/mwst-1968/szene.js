// „1968 oder heute: Wie viel mehr Mehrwertsteuer zahlt ein Haushalt im Jahr?“ · Stil 17 Nachtstadt-Miniatur (Nachtstraße), Simulierbar 08.11.2026 abend.
// Zwei gleiche Wagen (links DAMALS in Orange, rechts HEUTE in Cyan) fahren nebeneinander eine nasse Nachtstraße entlang und halten an vier Stationen
// desselben Einkaufs (Restaurant, Supermarkt, Miete, der Rest). Über jedem Wagen steht die bisher gezahlte Steuer im Monat; wer mehr zahlt, fährt vorn.
// Alle Zahlen kommen aus pipeline/sim/mwst_1968.mjs. Alles ist eine reine Funktion von t (window.renderAt(t)).
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, lichtKegel, staub, buendeln, aktualisiere, spiegelBoden } from "../../engine/sim_atmosphaere.js";
import { gebaeude, strassenBoden, laterne, autoNacht, lichtSpur, skyline, himmelNacht, preisAnhaenger } from "../../engine/stil_nachtstadt.js";
import { wohnHaus } from "../../engine/stil_nachtstadt_auto.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/mwst_1968.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Wagenlack, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const DAMALS = "#FF8A3D";
const HEUTE = "#22C6F2";
const AKZENT = "#ECE6DA";

// ---------- Rechnung (aus sim/mwst_1968.mjs) ----------
const Z = videoZahlen();
const de = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const GAP_MAX = Z.monatHeute - Z.monatAlt; // 125,40 € im Monat

function pchip(pts) {
  const n = pts.length, t = pts.map((p) => p[0]), v = pts.map((p) => p[1]);
  const h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = t[i + 1] - t[i]; d[i] = (v[i + 1] - v[i]) / h[i]; }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return (x) => {
    if (x <= t[0]) return v[0];
    if (x >= t[n - 1]) return v[n - 1];
    let i = 0;
    while (x > t[i + 1]) i++;
    const s = (x - t[i]) / h[i], s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * v[i] + (s3 - 2 * s2 + s) * h[i] * m[i] + (-2 * s3 + 3 * s2) * v[i + 1] + (s3 - s2) * h[i] * m[i + 1];
  };
}
const glatt = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
const huckel = (t, a, b, c, d) => glatt(t, a, b) * (1 - glatt(t, c, d));
const puls = (t, ein, dauer, auf = 0.25, ab = 0.45) => fortschritt(t, ein, ein + auf) * (1 - glatt(t, ein + dauer, ein + dauer + ab));

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["800 40px 'SB Display'", "700 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "DAMALS", farbe: DAMALS, woerter: ["Damals*", "damals*", "1968*", "Zwanzig*", "ZWANZIG*", "zwanzig*", "hundertdreißig*", "130*"] },
      b: { name: "HEUTE", farbe: HEUTE, woerter: ["Heute*", "heute*", "neunzehn*", "vierzehn*", "260*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    hDamals: T("hook:Damals"), hWo: T("hook:Wo"), hSteuer: T("hook:Steuer"),
    rEin: T("regeln:Ein"), r3000: T("regeln:3.000"), rDamals: T("regeln:Damals"), r10: T("regeln:10"), rHeute: T("regeln:Heute"), r19: T("regeln:19"), r7: T("regeln:7"),
    fKlar: T("falle:Klar"), fHeute: T("falle:heute"), fMehr: T("falle:mehr"), fOder: T("falle:Oder"),
    rErste: T("rennen:Erste"), rRest: T("rennen:Restaurant"), r200: T("rennen:200"), rHeute2: T("rennen:Heute"), r14: T("rennen:14"), rDamals2: T("rennen:Damals"), r20: T("rennen:20"),
    w1Denn: T("wendung1:Denn"), w1nur: T("wendung1:nur"), w17: T("wendung1:7"), w1Damals: T("wendung1:Damals"),
    w2Zweite: T("wendung2:Zweite"), w2Super: T("wendung2:Supermarkt"), w2500: T("wendung2:500"), w2Heute: T("wendung2:Heute"), w234: T("wendung2:34"), w2damals: T("wendung2:damals"), w224: T("wendung2:24"), w2Jetzt: T("wendung2:Jetzt"),
    w3Dritte: T("wendung3:Dritte"), w3Miete: T("wendung3:Miete"), w3Keine: T("wendung3:Keine"), w3Abst: T("wendung3:Abstand"),
    kDann: T("kipp:Dann"), kStrom: T("kipp:Strom"), kHandy: T("kipp:Handy"), k1600: T("kipp:1.600"), kHeute: T("kipp:Heute"), k260: T("kipp:260"), kDamals: T("kipp:Damals"), k130: T("kipp:130"), kZieht: T("kipp:zieht"), kMonat: T("kipp:Monat"),
    eEnd: T("ergebnis:Endstand"), eJahr: T("ergebnis:Jahr"), eRund: T("ergebnis:Rund"), e1500: T("ergebnis:1.500"),
    wWarum: T("warum:Warum"), wHaelfte: T("warum:Hälfte"), wAusg: T("warum:Ausgaben"),
    pDas: T("pointe:Das"), p10: T("pointe:10"), pHielten: T("pointe:hielten"), pHalbes: T("pointe:halbes"),
    s70: T("schlusskarte:70"), sNur: T("schlusskarte:Nur"), sTeurer: T("schlusskarte:teurer"),
  };

  // ---------- Zähler: gezahlte Steuer im Monat, je Station ----------
  // Restaurant: Heute zuerst (14 €), dann Damals (20 €) · Supermarkt: Heute +34, Damals +24 · Miete: 0 · Rest: beide laufen zusammen, Heute schneller
  const H = (t) => Z.gastroHeute * glatt(t, A.rHeute2 + 0.1, A.r14 + 0.55) + Z.ermHeute * glatt(t, A.w2Heute, A.w234 + 0.7) + Z.regelHeute * glatt(t, A.kDann + 3.2, A.kMonat + 0.9);
  const D = (t) => Z.gastroAlt * glatt(t, A.rDamals2 + 0.05, A.r20 + 0.6) + Z.ermAlt * glatt(t, A.w2damals, A.w224 + 0.7) + Z.regelAlt * glatt(t, A.kDann + 3.2, A.kMonat + 0.9);
  const jahr = (t) => glatt(t, A.eEnd + 0.3, A.eJahr + 1.0);
  const SW = M.wert((t) => { const h = H(t), d = D(t); return { h, d, gap: h - d, j: jahr(t) }; });

  // ---------- Fahrt: Ankerpunkt der Kamera entlang der Straße (−z) ----------
  const zc = pchip([[0, 0], [A.rErste, -17], [A.w1Denn, -29], [A.w2Zweite, -36], [A.w3Dritte, -49], [A.kDann, -57], [A.eEnd, -74], [DAUER, -88]]);
  const LEAD = 1.35;
  const fuehrung = (gap) => Math.sign(gap) * Math.sqrt(Math.min(1, Math.abs(gap) / GAP_MAX)) * LEAD; // > 0: Heute vorn

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = himmelNacht();
  dunst(szene, "#121A28", 0.03);
  const rig = rigNacht(szene, buehne.renderer, { ziel: [0, 0, 0], bereich: 9, schatten: SCHATTEN, richtung: [-0.5, 0.9, 0.5], farbe: "#A9C4F2", staerke: 0.85, umgebungsStaerke: 0.8, himmelStaerke: 0.55 });
  const LAENGE = 130;
  const KACHEL = 36;
  for (let k = 0; k * KACHEL < LAENGE + 20; k++) {
    const b = strassenBoden({ breite: KACHEL, tiefe: KACHEL, strassen: [{ x: 0, richtung: "z", breite: 2.2 }], aufloesung: 2048, seed: 2 });
    b.position.set(0, 0, 14 - KACHEL / 2 - k * KACHEL); szene.add(b);
  }
  szene.add(spiegelBoden({ breite: 7.6, tiefe: LAENGE + 30, staerke: 1.05, pfuetze: 0.5, streckung: 3.2, massstab: 0.35, aufloesung: 0.22 }).translateZ(-(LAENGE / 2 - 14)).translateY(0));
  const him = skyline({ anzahl: 46, radius: 34, bogen: [Math.PI * 1.02, Math.PI * 1.98], mitte: [0, 0] });
  him.userData.dynamisch = true; szene.add(him);

  // Stationen beiderseits der Straße: links Damals (orange), rechts Heute (cyan); Haus-Paare mit Leuchtleiste
  const zAt = (t) => zc(t);
  const stationen = [];
  const stat = [
    { t: A.rRest + 0.2, wand: "#B7A58E", s: 21 },       // Restaurant
    { t: A.w2Super + 0.2, wand: "#AEB8C6", s: 22 },     // Supermarkt
    { t: A.w3Miete + 0.2, wand: "#C2B6A8", s: 23 },     // Mietshaus
    { t: A.kHandy - 0.4, wand: "#9FA9BA", s: 24 },      // Strom, Auto, Handy
  ];
  const haeuser = stat.map((s) => {
    const l = wohnHaus({ farbe: DAMALS, wallbox: false, solar: false, wand: s.wand, seed: s.s }); l.position.set(-2.12, 0, zAt(s.t)); szene.add(l);
    const r = wohnHaus({ farbe: HEUTE, wallbox: false, solar: false, wand: s.wand, seed: s.s + 10 }); r.rotation.y = Math.PI; r.position.set(2.12, 0, zAt(s.t)); szene.add(r);
    stationen.push({ z: zAt(s.t), links: true, rechts: true });
    return { l, r };
  });

  // Häuserzeilen beiderseits (Fassaden zur Straße), Lücken an den Stationen
  const frei = (z, seite) => stationen.some((s) => (seite < 0 ? s.links : s.rechts) && Math.abs(z - s.z) < 1.55);
  let n = 0;
  for (const seite of [-1, 1]) {
    for (let reihe = 0; reihe < 2; reihe++) {
      let z = 9;
      while (z > -LAENGE - 8) {
        const tt = 1.3 + hash(n, 3) * 1.4 + (reihe ? 0.5 : 0);
        const b = reihe ? 2.4 + hash(n, 7) * 1.4 : 1.5 + hash(n, 11) * 0.9;
        const nah = reihe === 0;
        const h = nah ? 0.9 + hash(n * 3 + 1, 5) * 1.3 : 2.6 + Math.pow(hash(n * 3 + 2, 5), 1.3) * 5.6;
        const xm = seite * (2.45 + (reihe ? 2.45 + b / 2 : b / 2));
        const zm = z - tt / 2;
        if (!(reihe === 0 && frei(zm, seite))) {
          const g = gebaeude({ breite: b, hoehe: h, tiefe: tt - 0.08, seed: n * 2 + (seite > 0 ? 1 : 0), anteilAn: 0.42 + hash(n, 9) * 0.3, leuchten: 3, fassade: ["#2B313D", "#30343B", "#262C38", "#363A42"][n % 4], laden: nah && hash(n, 13) < 0.5, warnlicht: h > 5.5, schatten: true });
          g.position.set(xm, 0, zm); szene.add(g);
        }
        z -= tt + 0.05; n++;
      }
    }
  }
  for (let z = 6; z > -LAENGE - 6; z -= 3.4) {
    for (const s of [-1, 1]) {
      const l = laterne({ hoehe: 1.45, arm: 0.34, pfuetze: 0.9, kegel: 0.12 });
      l.position.set(s * 1.36, 0, z + (s > 0 ? 1.7 : 0));
      l.rotation.y = s > 0 ? Math.PI : 0;
      szene.add(l);
    }
  }

  // Wagen, Lichtspuren, Schilder, Spots
  const kurveD = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.55, 0, 14), new THREE.Vector3(-0.55, 0, -LAENGE - 10)]);
  const kurveH = new THREE.CatmullRomCurve3([new THREE.Vector3(0.55, 0, 14), new THREE.Vector3(0.55, 0, -LAENGE - 10)]);
  const spurD = lichtSpur(kurveD, { farbe: DAMALS, staerke: 4.2, breite: 0.06, segmente: 400 });
  const spurH = lichtSpur(kurveH, { farbe: HEUTE, staerke: 4.2, breite: 0.06, segmente: 400 });
  const autoD = autoNacht({ farbe: DAMALS, laenge: 0.9 }), autoH = autoNacht({ farbe: HEUTE, laenge: 0.9 });
  [autoD, autoH, spurD, spurH].forEach((o) => { o.userData.dynamisch = true; });
  autoD.rotation.y = autoH.rotation.y = Math.PI / 2;
  szene.add(spurD, spurH, autoD, autoH);
  const anhD = preisAnhaenger({ farbe: DAMALS, breite: 0.95, hoehe: 0.4 }), anhH = preisAnhaenger({ farbe: HEUTE, breite: 0.95, hoehe: 0.4 });
  anhD.scale.setScalar(0.01); anhH.scale.setScalar(0.01); szene.add(anhD, anhH);
  const lichtD = new THREE.PointLight(DAMALS, 0, 0, 2), lichtH = new THREE.PointLight(HEUTE, 0, 0, 2);
  szene.add(lichtD, lichtH);
  const kegelD = lichtKegel({ hoehe: 3.2, radiusOben: 0.08, radiusUnten: 0.85, farbe: DAMALS, staerke: 0.4, streifen: 0.25 }); kegelD.material = kegelD.material.clone(); kegelD.userData.dynamisch = true;
  const kegelH = lichtKegel({ hoehe: 3.2, radiusOben: 0.08, radiusUnten: 0.85, farbe: HEUTE, staerke: 0.4, streifen: 0.25 }); kegelH.material = kegelH.material.clone(); kegelH.userData.dynamisch = true;
  szene.add(kegelD, kegelH);
  const nebel = staub({ anzahl: 700, bereich: [9, 5, 12], mitte: [0, 2.2, 0], farbe: "#9FB4D8", groesse: 0.03, staerke: 1.0, aussen: 1, tempo: -0.08, seed: 11 });
  nebel.userData.dynamisch = true; szene.add(nebel);
  const statistik = buendeln(szene);
  if (Q.has("statistik")) console.warn("buendeln", JSON.stringify(statistik));

  // ---------- Kamera: relativ zum Ankerpunkt auf der Straße ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 220);
  const sh = (t, pos, ziel, fov = 36) => ({ t, pos, ziel, fov });
  const SH = [
    sh(0, [0.0, 3.3, 6.6], [0.0, 0.3, -2.2], 36),
    sh(A.hDamals + 0.1, [0.5, 2.5, 4.8], [0.0, 0.35, -1.0], 36),
    sh(A.hWo, [-0.7, 2.0, 4.2], [0.0, 0.35, -0.6], 35),
    sh(A.rEin + 0.1, [0.0, 3.3, 6.4], [0.0, 0.3, -1.5], 36),
    sh(A.rDamals, [-1.7, 1.4, 3.0], [-0.55, 0.5, 0.0], 35),        // Damals (orange)
    sh(A.rHeute, [1.7, 1.4, 3.0], [0.55, 0.5, 0.0], 35),           // Heute (cyan)
    sh(A.r7 + 0.6, [0.0, 3.0, 6.0], [0.0, 0.3, -1.0], 36),
    sh(A.fKlar, [1.1, 1.9, 3.8], [0.55, 0.4, -0.3], 34),           // Denkfalle: Licht auf Heute
    sh(A.fOder + 0.2, [0.4, 2.5, 5.0], [0.0, 0.3, -0.8], 35),
    sh(A.rErste, [0.0, 1.05, 3.4], [0.0, 0.35, -2.0], 38),         // Station 1: tief hinter den Wagen
    sh(A.rRest - 0.3, [-1.4, 1.1, 2.6], [-1.3, 0.7, -0.6], 36),    // Restaurant
    sh(A.rHeute2 - 0.2, [1.9, 1.0, 2.2], [0.8, 0.6, -0.4], 36),    // Heute zahlt 14 €
    sh(A.rDamals2 - 0.3, [-1.9, 1.0, 2.2], [-0.8, 0.6, -0.4], 36), // Damals zahlt 20 €
    sh(A.w1Denn, [0.0, 3.4, 5.8], [0.0, 0.2, -2.5], 36),           // Wendung 1: hoch
    sh(A.w1nur, [1.3, 1.5, 2.6], [0.55, 0.5, 0.0], 34),
    sh(A.w1Damals, [-1.3, 1.5, 2.6], [-0.55, 0.5, 0.0], 34),
    sh(A.w2Zweite, [-0.5, 2.3, 4.2], [-0.1, 0.35, -0.5], 35),
    sh(A.w2Super - 0.2, [1.4, 1.4, 3.0], [1.6, 0.6, -0.4], 36),    // Supermarkt
    sh(A.w234, [1.3, 1.3, 2.6], [0.55, 0.5, 0.0], 34),             // Heute 34
    sh(A.w224, [-1.3, 1.3, 2.6], [-0.55, 0.5, 0.0], 34),           // Damals 24
    sh(A.w2Jetzt - 0.1, [0.0, 1.4, 3.6], [0.0, 0.4, -0.3], 33),    // knapp
    sh(A.w3Dritte, [0.0, 2.6, 4.6], [0.0, 0.35, -0.6], 35),
    sh(A.w3Miete, [-1.6, 1.5, 3.0], [-1.8, 0.8, -0.5], 35),        // Mietshaus
    sh(A.w3Keine, [0.0, 1.8, 3.8], [0.0, 0.4, -0.3], 34),
    sh(A.kDann, [-1.5, 2.2, 4.4], [-1.5, 0.9, -2.2], 36),          // Rest: hoher Block voraus
    sh(A.kStrom + 0.5, [1.8, 1.8, 3.4], [2.0, 1.0, -0.8], 36),
    sh(A.k1600, [0.0, 2.8, 5.0], [0.0, 0.3, -1.2], 36),
    sh(A.kHeute + 0.4, [1.3, 1.3, 2.7], [0.6, 0.5, -0.1], 33),
    sh(A.kDamals + 0.4, [-1.3, 1.3, 2.7], [-0.6, 0.5, -0.1], 33),
    sh(A.kZieht - 0.2, [0.0, 1.3, 2.9], [0.0, 0.4, -0.2], 32),     // zieht davon: ganz nah
    sh(A.kMonat + 0.4, [0.8, 1.9, 4.2], [0.5, 0.4, -0.4], 36),
    sh(A.eEnd + 0.3, [0.0, 3.6, 6.8], [0.0, 0.2, -1.8], 36),       // Endstand: Totale
    sh(A.e1500 + 0.4, [0.9, 2.0, 4.0], [0.5, 0.4, -0.3], 35),
    sh(A.wWarum, [0.0, 3.0, 5.4], [0.0, 0.3, -1.0], 36),
    sh(A.wAusg + 0.6, [0.0, 2.2, 4.6], [0.0, 0.3, -0.8], 36),
    sh(A.pDas, [-1.1, 2.0, 4.0], [-0.8, 0.5, -0.8], 35),
    sh(A.p10 - 0.2, [-1.6, 1.5, 3.0], [-1.3, 0.6, -0.6], 35),
    sh(A.s70 - 0.3, [0.0, 3.2, 6.6], [0.0, 0.25, -2.2], 36),
    sh(DAUER, [0.0, 3.6, 7.4], [0.0, 0.25, -2.6], 37),
  ];
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const z0 = zc(t);
    const ziel = [lerp(a.ziel[0], b.ziel[0], p), lerp(a.ziel[1], b.ziel[1], p), z0 + lerp(a.ziel[2], b.ziel[2], p)];
    const pos = [lerp(a.pos[0], b.pos[0], p), lerp(a.pos[1], b.pos[1], p), z0 + lerp(a.pos[2], b.pos[2], p)];
    const K = 1.75;
    const pk = pos.map((v, j) => ziel[j] + (v - ziel[j]) * K);
    return { pos: pk, ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.28 });
  regie.zoom({ t: A.w1nur, ziel: (t) => [0.55, 0.5, zc(t)], staerke: 0.22, halt: 1.2, rueck: 0.6 });
  regie.zoom({ t: A.w2Jetzt, ziel: (t) => [0, 0.4, zc(t)], staerke: 0.2, halt: 1.4, rueck: 0.6 });
  regie.zoom({ t: A.kZieht, ziel: (t) => [0.55, 0.4, zc(t)], staerke: 0.2, halt: 1.0, rueck: 0.7 });
  regie.zoom({ t: A.pHielten, ziel: (t) => [-0.55, 0.5, zc(t)], staerke: 0.16, halt: 1.2, rueck: 0.7 });

  // ---------- Zustand auf die Welt anwenden ----------
  const post = { ...GRADING.nacht, belichtung: 1.2, bloomStaerke: 0.9, bloomSchwelle: 1.0, tiltMitte: 0.5, tiltBreite: 0.34, tiltStaerke: 0.5, vignette: 0.36, strahlen: 0.14, strahlenSchwelle: 1.3, strahlenLaenge: 0.7, strahlenAbfall: 0.96, strahlenFarbe: [1, 0.85, 0.7], strahlenPunkt: [0, 6, -6] };
  const moon = rig.mond;
  const bis = (x, a, b) => clamp((x - a) / (b - a));
  const tmp = new THREE.Vector3();
  const ledZeiten = [
    [A.rRest, A.rHeute2, A.rDamals2], [A.w2Super, A.w2Heute, A.w2damals], [A.w3Miete, A.w3Keine, A.w3Abst], [A.kStrom, A.kHeute, A.kDamals],
  ];
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t), z0 = zc(t);
      const g = fuehrung(s.gap);                 // > 0: Heute vorn
      const zH = z0 - g / 2, zD = z0 + g / 2;
      autoD.position.set(-0.55, 0, zD); autoH.position.set(0.55, 0, zH);
      spurD.setze(clamp((14 - zD) / (LAENGE + 24)), 0.05); spurH.setze(clamp((14 - zH) / (LAENGE + 24)), 0.05);
      // Spot-Wechsel: der Führende leuchtet, dazu Hook, Denkfalle, Kipp
      const lH = 0.35 + 0.7 * huckel(t, A.fKlar - 0.1, A.fKlar + 0.6, A.fOder + 0.4, A.fOder + 1.1) + 0.7 * bis(s.gap, 0, 40) + 0.6 * puls(t, A.kZieht, 1.8);
      const lD = 0.35 + 0.7 * bis(-s.gap, 0, 6) + 0.7 * puls(t, A.rDamals2, 1.4) + 0.5 * puls(t, A.pHielten, 1.8);
      lichtH.intensity = 7 * Math.min(1.6, lH); lichtD.intensity = 7 * Math.min(1.6, lD);
      lichtH.position.set(0.55, 1.6, zH); lichtD.position.set(-0.55, 1.6, zD);
      kegelH.visible = lH > 0.45; kegelD.visible = lD > 0.45;
      kegelH.material.uniforms.staerke.value = 0.34 * Math.min(1.4, lH); kegelD.material.uniforms.staerke.value = 0.34 * Math.min(1.4, lD);
      kegelH.position.set(0.55, 3.2, zH); kegelD.position.set(-0.55, 3.2, zD);
      // Schilder über den Wagen: bisher gezahlte Steuer im Monat (ab Station 1), am Ende der Jahreswert
      const schild = glatt(t, A.rErste, A.rErste + 0.6) * (1 - glatt(t, A.s70 - 0.4, A.s70 + 0.2));
      anhD.position.set(-0.55, 0.95, zD); anhH.position.set(0.55, 0.95, zH);
      anhD.scale.setScalar(0.5 * clamp(schild) + 0.001); anhH.scale.setScalar(0.5 * clamp(schild) + 0.001);
      anhD.visible = schild > 0.01; anhH.visible = schild > 0.01;
      const jj = s.j;
      anhD.text(`${de(lerp(s.d, Z.jahrAlt, jj))} €`); anhH.text(`${de(lerp(s.h, Z.jahrHeute, jj))} €`);
      anhD.glimm(0.4 * puls(t, A.r20, 1.0) + (s.gap < 0 ? 0.8 : 0.1) + 0.5 * puls(t, A.w224, 1.0));
      anhH.glimm(0.4 * puls(t, A.r14, 1.0) + (s.gap > 0 ? 0.8 : 0.1) + 0.5 * puls(t, A.kZieht, 1.4));
      // Stationen: Leuchtleisten pulsieren, wenn sie genannt werden
      ledZeiten.forEach(([t0, t1, t2], i) => { haeuser[i].l.led(0.4 + 0.9 * puls(t, t0, 1.2) + 0.9 * puls(t, t2, 1.0)); haeuser[i].r.led(0.4 + 0.9 * puls(t, t0, 1.2) + 0.9 * puls(t, t1, 1.0)); });
      // Himmel und Luft folgen den Wagen
      him.position.set(0, 0, z0); nebel.position.set(0, 0, z0 - 1);
      moon.target.position.set(0, 0, z0 - 1); moon.position.set(-2.5, 6.5, z0 + 3); moon.target.updateMatrixWorld();
      // Nachbearbeitung: Strahlen und Glow steigen bis zum Kipp-Moment, danach Sieger-Glow
      const spann = bis(t, A.w1nur, A.kZieht);
      post.bloomStaerke = 0.9 + 0.2 * spann + 0.3 * puls(t, A.kZieht, 1.6);
      post.strahlen = 0.12 + 0.34 * spann * (1 - bis(t, A.eEnd + 1.0, A.wWarum)) + 0.15 * puls(t, A.kZieht, 1.8) + 0.18 * puls(t, A.pHielten, 1.8);
      tmp.set(lerp(0.55, -0.55, clamp(0.5 - Math.sign(s.gap) * 0.5)), 1.2, zc(t) - 6); post.strahlenPunkt = [tmp.x, tmp.y, tmp.z];
      post.splitBalance = 0.02 + 0.2 * clamp(s.gap / 100, -1, 1);
      post.belichtung = 1.2 - 0.34 * bis(t, A.s70 - 0.2, A.s70 + 0.9) + 0.06 * puls(t, A.kZieht, 1.4);
      regie.anwenden(t);
    },
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: lerp(s.d, Z.jahrAlt, s.j), b: lerp(s.h, Z.jahrHeute, s.j) }; },
    uhr: { ein: A.rErste, zeit: (t) => 1 + 11 * SW(t).j, format: (v) => (v < 1.5 ? "MONAT 1" : `${Math.round(v)} MONATE`), label: "STEUER" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  // Statuszeile (mitlaufend): Station
  chip("EIN MONAT · EIN EINKAUF", 0.05, A.rErste - 0.5, "akzent", "hell");
  chip("STATION 1/4 · RESTAURANT", A.rErste - 0.05, A.w2Zweite - 0.5, "akzent", "voll");
  chip("STATION 2/4 · SUPERMARKT", A.w2Zweite - 0.05, A.w3Dritte - 0.5, "akzent", "voll");
  chip("STATION 3/4 · MIETE", A.w3Dritte - 0.05, A.kDann - 0.5, "akzent", "voll");
  chip("STATION 4/4 · DER REST", A.kDann - 0.05, A.eEnd - 0.2, "akzent", "voll");
  // Regeln: Sätze beider Zeiten
  chip("3.000 € IM MONAT", A.r3000 - 0.05, A.rDamals - 0.2, "akzent", "hell", 490);
  chip("1968 · 10 % UND 5 %", A.rDamals - 0.05, A.fKlar - 0.1, "a", "voll", 490);
  chip("HEUTE · 19 % UND 7 %", A.rHeute - 0.05, A.fKlar - 0.1, "b", "voll", 590);
  // Stationen: Beträge
  chip("RESTAURANT · 215 € IM MONAT", A.r200 - 0.1, A.rHeute2 - 0.1, "akzent", "hell", 490);
  chip("HEUTE · 14 € STEUER", A.r14 - 0.1, A.w1Denn - 0.1, "b", "voll", 490);
  chip("DAMALS · 20 € STEUER", A.r20 - 0.1, A.w1Denn - 0.1, "a", "voll", 590);
  chip("HEUTE NUR 7 %", A.w17 - 0.1, A.w1Damals - 0.2, "b", "voll", 490);
  chip("DAMALS: VOLLER SATZ 10 %", A.w1Damals - 0.05, A.w2Zweite - 0.2, "a", "voll", 590);
  chip("500 € · ERMÄSSIGT", A.w2500 - 0.1, A.w2Heute - 0.1, "akzent", "hell", 490);
  chip("HEUTE · 34 € STEUER", A.w234 - 0.1, A.w3Dritte - 0.1, "b", "voll", 490);
  chip("DAMALS · 24 € STEUER", A.w224 - 0.1, A.w3Dritte - 0.1, "a", "voll", 590);
  chip("MIETE · 0 € STEUER", A.w3Keine - 0.05, A.kDann - 0.2, "akzent", "voll", 490);
  chip("1.600 € · VOLLER SATZ", A.k1600 - 0.1, A.kHeute - 0.1, "akzent", "hell", 490);
  chip("REST: HEUTE RUND 260 €", A.k260 - 0.1, A.eEnd - 0.2, "b", "voll", 490);
  chip("REST: DAMALS RUND 130 €", A.k130 - 0.1, A.eEnd - 0.2, "a", "voll", 590);
  // Vorsprung: wer mehr Steuer zahlt, liegt vorn
  const vorsD = (t) => Math.max(0, SW(t).d - SW(t).h), vorsH = (t) => Math.max(0, SW(t).h - SW(t).d);
  M.zaehler({ wert: vorsD, einheit: " €", nk: 0, max: 999, team: "a", art: "voll", label: "DAMALS ZAHLT MEHR", x: SICHER.mitte, y: 790, ein: A.r20 + 0.5, aus: A.w2Heute + 0.2, anker: "mitte" });
  M.zaehler({ wert: vorsH, einheit: " €", nk: 0, max: 999, team: "b", art: "voll", label: "HEUTE ZAHLT MEHR", x: SICHER.mitte, y: 790, ein: A.w2Jetzt - 0.3, aus: A.eEnd - 0.2, anker: "mitte" });
  // Endstand: Jahres-Karte, Erklärgrafik „Warum?“, Pointe-Karte am Ende
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "STEUER IM JAHR", ein: A.eEnd + 0.3, aus: A.wWarum - 0.1,
    zeilen: [{ label: "DAMALS", wert: Math.round(Z.jahrAlt), einheit: "€", team: "a", ein: A.eJahr + 0.2 }, { label: "HEUTE", wert: Math.round(Z.jahrHeute), einheit: "€", team: "b", ein: A.eRund + 0.2 }],
    differenz: { label: "HEUTE ZAHLT MEHR", wert: Math.round(Z.differenzJahr), einheit: "€", ein: A.e1500 - 0.1 } });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.wWarum + 0.3, aus: A.pDas - 0.7, max: 100,
    faktoren: [
      { label: "AUSGABEN OHNE VOLLEN SATZ · %", ein: A.wHaelfte - 0.1, a: { wert: Z.anteilNichtRegel, text: `${Z.anteilNichtRegel} %` }, b: { wert: Z.anteilNichtRegel, text: `${Z.anteilNichtRegel} %` }, tag: "FAST DIE HÄLFTE", tagEin: A.wAusg },
    ] });
  M.titel({ woerter: [{ text: "DAMALS", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "HEUTE", ein: -0.3, team: "b" }, { umbruch: true }, { text: "WER ZAHLT MEHR", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "MEHRWERTSTEUER?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: A.rEin + 0.6 });
  M.pointe({ woerter: [{ text: "70 % MEHR STEUER.", ein: A.s70, farbe: "b" }, { umbruch: true }, { text: "NUR 4 %", ein: A.sNur, farbe: "akzent" }, { umbruch: true }, { text: "TEURER.", ein: A.sTeurer, farbe: "akzent" }], ein: A.s70, y: 470, groesse: 88 });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "pop", "Wagen rollen an, Scheinwerfer, Lichtspuren hinter beiden Wagen"); ev(1.4, "klick", "Kamera schiebt sich heran, Laternen ziehen vorbei"); ev(A.hWo, "klick", "Titel läuft, Lichtkegel streicht über die Dächer"); ev(3.0, "klick", "Wagen ziehen an den Laternen vorbei, Lichtspuren länger");
  ev(A.rEin + 0.2, "whoosh", "Kamera weitet, Titel blendet aus"); ev(A.r3000, "klick", "Chip 3.000 € im Monat"); ev(A.rDamals, "ding", "Kamera auf Damals, Chip 10 und 5 %"); ev(A.rHeute, "ding", "Kamera auf Heute, Chip 19 und 7 %");
  ev(9.0, "klick", "Kamera gleitet nach rechts, Laternen ziehen vorbei"); ev(9.9, "klick", "Kamera schiebt sich zwischen die Wagen, Heute-Wagen rückt ins Bild"); ev(A.fKlar, "whoosh", "Lichtkegel und Spot auf Heute"); ev(A.fMehr, "ding", "Spot hält auf Heute, Schild glüht"); ev(A.fOder, "klick", "Licht hält, Kamera ruhig");
  ev(A.rErste, "whoosh", "Station 1: Wagen beschleunigen, Steuerzähler laufen"); ev(A.rRest, "ding", "Restaurant-Häuser beiderseits leuchten auf"); ev(A.r14, "ding", "Heute zahlt 14 €, Heute-Schild leuchtet"); ev(A.r20, "ding", "Damals zahlt 20 €, Führung wechselt zu Damals");
  ev(A.w1Denn, "whoosh", "Kamera hoch"); ev(A.w1nur, "ding", "Chip heute nur 7 %, Zoom auf Heute"); ev(A.w1Damals, "ding", "Chip Damals voller Satz 10 %");
  ev(A.w2Zweite, "whoosh", "Station 2: Kamera gleitet zum Supermarkt"); ev(A.w2Super, "ding", "Supermarkt-Häuser leuchten"); ev(A.w234, "ding", "Heute zahlt 34 € im Supermarkt, Führung wechselt zu Heute"); ev(A.w224, "ding", "Damals zahlt 24 €, holt auf"); ev(A.w2Jetzt, "whoosh", "Kamera eng, Zähler nahe beieinander");
  ev(A.w3Dritte, "whoosh", "Station 3: Kamera hoch zum Mietshaus"); ev(A.w3Miete, "ding", "Mietshäuser leuchten, Steuer 0 €"); ev(A.w3Abst, "klick", "Zähler bleiben stehen, Abstand bleibt");
  ev(A.kDann, "whoosh", "Station 4: Kamera auf den hohen Block"); ev(A.kStrom, "ding", "Block leuchtet, Strom Auto Handy"); ev(A.k1600, "klick", "Chip 1.600 € zum vollen Satz"); ev(A.k260, "ding", "Heute rund 260 €, Zähler steigen"); ev(A.k130, "ding", "Damals rund 130 €"); ev(A.kZieht, "whoosh", "Heute zieht davon, Glow und Zoom");
  ev(A.eEnd, "whoosh", "Kamera zurück, Jahreskarte"); ev(A.e1500, "ding", "Heute zahlt 1.505 € mehr");
  ev(62.9, "klick", "Kamera gleitet über die Wagen, Laternen ziehen vorbei"); ev(63.6, "klick", "Kamera hebt sich Richtung Erklärgrafik, Jahreskarte steht"); ev(A.wWarum, "whoosh", "Erklärgrafik Warum"); ev(A.wHaelfte, "ding", "Balken 44 % ohne vollen Satz"); ev(A.wAusg, "klick", "Tag fast die Hälfte");
  ev(A.pDas, "whoosh", "Rückblende zu Damals, Kamera auf das Haus"); ev(A.p10, "ding", "Damals leuchtet auf, 10 %"); ev(A.pHalbes, "klick", "Damals-Licht pulsiert");
  ev(A.s70, "akzent", "Welt dunkelt ab, Schlusskarte: 70 % mehr Steuer"); ev(A.sNur, "klick", "Zeile Nur 4 % erscheint"); ev(A.sTeurer, "akzent", "Teurer, Kamera weitet");

  ev(5.0, "klick", "Wagen ziehen weiter, Laternen ziehen vorbei"); ev(11.9, "klick", "Kamera gleitet nach oben, Heute-Wagen im Bild"); ev(14.1, "klick", "Spot auf Heute baut sich auf, Lichtkegel wächst"); ev(20.2, "klick", "Kamera schwenkt zum Heute-Wagen, Laternen ziehen vorbei"); ev(34.5, "klick", "Kamera nähert sich dem Heute-Wagen"); ev(48.9, "klick", "Kamera gleitet zum hohen Block, Laternen ziehen vorbei"); ev(67.3, "klick", "Kamera sinkt, Balken steht"); ev(73.5, "klick", "Kamera weitet langsam, Welt dunkelt weiter ab");
  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); };
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
