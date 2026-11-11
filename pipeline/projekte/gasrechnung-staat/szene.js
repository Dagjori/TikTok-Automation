// „Gaspreis: Wie viel von 2.446 € Gasrechnung bekommt der Staat?“ · Stil 17 Nachtstadt-Miniatur (Winternacht), Simulierbar, Slot acc1-2026-11-12-abend (Format Was bleibt).
// Einfamilienhaus im verschneiten Nachtdorf, davor der Gaszähler. Aus dem Zähler fließt das Geld in drei Kostensäulen: STAAT (orange, vier Stücke:
// Mehrwertsteuer, CO₂-Preis, Energiesteuer, Gemeinde), NETZ und LIEFERANT (blau). Die Höhe jeder Säule ist der Euro-Betrag. Vorn liegt ein Kalender aus
// zwölf Monatsplatten: Die Pointe füllt ihn bis zum 21. April (111 von 365 Tagen). Alle Werte kommen aus pipeline/sim/gasrechnung.mjs (Tests dort).
// Deterministisch: window.renderAt(t). Anker an den gesprochenen Wörtern (audio/sprech_woerter.json, Wortzeiten der einen Aufnahme).
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, lichtKegel, staub, buendeln, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { schneePlatte, einfamilienhaus, kostenSaeule, energieFluss, rauchSaeule, winterBaum, laterne } from "../../engine/stil_nachtstadt.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { verlauf } from "../../engine/licht.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { videoZahlen, P } from "../../sim/gasrechnung.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich): STAAT = Orange, DER REST = Blau. Kein Gelb.
const ST = "#FF5A1F";
const RE = "#2F8CFF";
const AKZENT = "#ECE6DA";

const Z = videoZahlen();
const glatt = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
const huckel = (t, a, b, c, d) => glatt(t, a, b) * (1 - glatt(t, c, d));
const puls = (t, ein, dauer, auf = 0.25, ab = 0.45) => fortschritt(t, ein, ein + auf) * (1 - glatt(t, ein + dauer, ein + dauer + ab));
const eur = (v) => v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Gesprochene Wörter für die Untertitel: Zahlwörter als Ziffern */
const ZIFFERN = { zweitausendvierhundert: "2.400", vierhundert: "400", sechs: "6", fünfundsechzig: "65", zweihundertvierzig: "240", hundertzehn: "110", fünfhundert: "500", zwölfhundert: "1.200", siebenhundert: "700", siebenhundertvierzig: "740", einundzwanzigsten: "21.", ersten: "1." };
function untertitelTiming(timing, woerter) {
  const liste = woerter.map(([w, s, e]) => {
    const m = /^(.*?)([.,?!:;]*)$/.exec(w);
    const z = ZIFFERN[m[1].toLowerCase()];
    return { wort: (z || m[1]) + m[2], start: s, ende: e };
  });
  const segmente = timing.segmente.map((s) => ({ ...s, woerter: liste.filter((w) => w.start >= s.start - 0.02 && w.start < s.ende + 0.02) }));
  return { ...timing, segmente };
}

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const sprech = (await lade("audio/sprech_woerter.json")).woerter;
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const zpUT = new Zeitplan(untertitelTiming(timing, sprech), { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["800 40px 'SB Display'", "700 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "STAAT", farbe: ST, woerter: ["Staat*", "Mehrwertsteuer*", "Kohlendioxidpreis*", "Energiesteuer*", "Gemeinde*", "700*", "740*", "Drittel*", "Zehntel*", "Sechstel*"] },
      b: { name: "DER REST", farbe: RE, woerter: ["Netz*", "Gasnetz*", "Lieferant*", "Vertrieb*", "1.200*", "500*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // ---------- Anker: Zeit des n-ten gesprochenen Wortes (Index in audio/sprech_woerter.json) ----------
  const s_ = (i) => sprech[i][1], e_ = (i) => sprech[i][2];
  const A = {
    gaspreis: s_(2), einfam: s_(5), n2400: s_(7), euro0: s_(8), jahr: s_(10), wie: s_(11), staat0: s_(16), staat0E: e_(16),
    gerechnet: s_(17), durchschn: s_(21), neukunden: s_(23), neukundenE: e_(23),
    klar: s_(24), zehntel: s_(30), oder: s_(31), nicht: s_(33),
    schon: s_(34), mwst: s_(36), mwstE: e_(36), vierhundert: s_(40), euro1E: e_(41), sechstel: s_(47), rechnung1: s_(49),
    dann: s_(50), co2: s_(52), n65: s_(53), tonne: s_(56), auf: s_(57), n240: s_(63), euro2E: e_(64), bis: s_(65), tag: s_(68), nurF: s_(73), staat2: s_(76),
    dazu: s_(77), es: s_(80), n110: s_(82), euro3E: e_(83), gemeinde: s_(85), sechs: s_(87), euro4E: e_(88), leitungen: s_(91), das2: s_(95), gasnetz: s_(96), n500: s_(99), euro5E: e_(100),
    fuer: s_(101), gas: s_(103), vertrieb: s_(107), n1200: s_(110), euro6E: e_(111),
    kDer: s_(112), stapel: s_(113), staat3: s_(116), netz: s_(124), er: s_(125), sogar: s_(127), haelfte: s_(131), lieferant: s_(135), wachst: s_(138), n700: s_(141), euro7E: e_(142),
    eDer: s_(143), staat4: s_(144), n740: s_(147), euro8E: e_(148), eDas: s_(149), drittel: s_(153), rechnung2: s_(155),
    groesster: s_(156), posten: s_(157), mwst2: s_(160), danach: s_(161), co2b: s_(163),
    vom: s_(164), januar: s_(166), april: s_(170), heizt: s_(171), rechnerisch: s_(173), nur2: s_(174), staat5: s_(177), staat5E: e_(177),
    sk: s_(178), dritte: s_(180), euroS: s_(181), skStaat: s_(187),
  };

  // ---------- Geldfunktionen der Zeit (alles aus sim/gasrechnung.mjs) ----------
  const rechnung = (t) => Z.brutto * glatt(t, 0.3, A.euro0 + 0.2);
  const vMw = (t) => Z.mwst * glatt(t, A.mwst + 0.1, A.euro1E);
  const vCo = (t) => Z.co2 * glatt(t, A.auf + 0.1, A.euro2E - 0.05);
  const vEs = (t) => Z.es * glatt(t, A.es + 0.4, A.euro3E);
  const vKo = (t) => Z.konz * glatt(t, A.sechs, A.sechs + 0.55);
  const vNe = (t) => Z.netz * glatt(t, A.gasnetz + 0.3, A.euro5E);
  const vLi = (t) => Z.lieferant * glatt(t, A.vertrieb - 0.2, A.euro6E - 0.1);
  const staat = (t) => vMw(t) + vCo(t) + vEs(t) + vKo(t);
  const rest = (t) => vNe(t) + vLi(t);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#070D1C"], [0.2, "#12234A"], [0.31, "#2A4A7C"], [0.36, "#22406F"], [0.5, "#1B3158"], [1, "#101A30"]], { radial: [0.5, 0.33, 0.42, "rgba(255,176,120,0.14)"] });
  dunst(szene, "#1E3560", 0.016);
  const rig = rigNacht(szene, buehne.renderer, { ziel: [0, 0.4, 0.8], bereich: 8, schatten: SCHATTEN, richtung: [-0.5, 0.95, 0.6], farbe: "#A9C4F2", staerke: 0.85, umgebungsStaerke: 0.7, himmelStaerke: 0.5, himmel: "#3A5078", boden: "#1A2230" });
  const Y0 = 0.245;
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: "#5A6D8F", roughness: 0.95 }));
  boden.rotation.x = -Math.PI / 2; boden.position.y = -0.002; boden.receiveShadow = true; szene.add(boden);
  const mondM = new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color("#C9DAFF").multiplyScalar(1.35), fog: false }));
  mondM.position.set(2.5, 6.4, -26); szene.add(mondM);
  const mondHof = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color("#9FC0FF") }, staerke: { value: 0.55 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 farbe; uniform float staerke; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - r, 0.0, 1.0), 2.6); gl_FragColor = vec4(farbe * staerke * a, 1.0); }",
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  mondHof.position.set(2.5, 6.4, -26.2); szene.add(mondHof);
  // Dorf im Hintergrund (versinkt im Dunst), Schornsteine rauchen nicht
  [[-10, -19, 0.3, 0], [-4.5, -22, -0.2, 1], [4.2, -20.5, 0.15, 2], [10.5, -18, -0.35, 0], [-15, -25, 0.1, 1], [0.8, -27.5, 0, 2], [15, -24, 0.4, 0], [-8.5, -31, -0.1, 2], [8, -30, 0.2, 1]].forEach(([x, z, r, k], i) => {
    const h = einfamilienhaus({ seed: 4 + i, wand: ["#C8CFDA", "#D4C6B8", "#B7C3D6"][k] });
    h.remove(h.raumLicht); h.position.set(x, 0, z); h.rotation.y = r; h.scale.setScalar(1.6); szene.add(h);
  });

  // Platte mit Haus
  const platte = schneePlatte({ breite: 7.4, tiefe: 5.6, led: ST, seed: 5, pfadX: -0.5, pfadBreite: 0.5, pfadAb: 0.4 }); platte.position.set(0.1, 0, 0.7); szene.add(platte);
  const HX = -2.15, HZ = -0.85;
  const haus = einfamilienhaus({ seed: 2 }); haus.position.set(HX, Y0, HZ); szene.add(haus);
  const rauch = rauchSaeule({ hoehe: 1.1 }); rauch.position.set(HX + haus.punkte.schornstein.x, Y0 + haus.punkte.schornstein.y, HZ + haus.punkte.schornstein.z); szene.add(rauch);

  // Gaszähler vor dem Haus: Gehäuse, Zifferblatt mit Strichen, Zeiger, drehende Zählräder, Leitung ins Haus
  const MX = -0.55, MZ = 0.95;
  const zaehler = new THREE.Group(); zaehler.position.set(MX, Y0, MZ); szene.add(zaehler);
  const metall = new THREE.MeshStandardMaterial({ color: "#8E98A6", roughness: 0.45, metalness: 0.55 });
  const kasten = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.3), metall); kasten.position.y = 0.55; kasten.castShadow = true; zaehler.add(kasten);
  const sockelZ = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: "#4A525E", roughness: 0.7, metalness: 0.3 })); sockelZ.position.y = 0.06; zaehler.add(sockelZ);
  const blatt = document.createElement("canvas"); blatt.width = blatt.height = 256;
  { const c = blatt.getContext("2d"); c.fillStyle = "#EFEFE8"; c.fillRect(0, 0, 256, 256); c.strokeStyle = "#20242C"; c.lineWidth = 6;
    for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r1 = i % 5 === 0 ? 96 : 110; c.beginPath(); c.moveTo(128 + Math.sin(a) * r1, 128 - Math.cos(a) * r1); c.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); c.stroke(); }
    c.fillStyle = "#20242C"; c.fillRect(70, 150, 116, 34); c.fillStyle = "#E8E8E0"; for (let i = 0; i < 5; i++) c.fillRect(74 + i * 22.5, 154, 19, 26); }
  const blattTex = new THREE.CanvasTexture(blatt); blattTex.colorSpace = THREE.SRGBColorSpace;
  const zifferblatt = new THREE.Mesh(new THREE.CircleGeometry(0.25, 40), new THREE.MeshBasicMaterial({ map: blattTex })); zifferblatt.position.set(0, 0.62, 0.153); zaehler.add(zifferblatt);
  const zeigerG = new THREE.Group(); zeigerG.position.set(0, 0.62, 0.16); zaehler.add(zeigerG);
  const zeigerM = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.2, 0.01), new THREE.MeshBasicMaterial({ color: new THREE.Color(ST).multiplyScalar(2.2) })); zeigerM.position.y = 0.09; zeigerG.add(zeigerM);
  const lede = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(RE).multiplyScalar(2) })); lede.position.set(0.22, 0.88, 0.16); zaehler.add(lede);
  const leitungMat = new THREE.MeshStandardMaterial({ color: "#6B7482", roughness: 0.5, metalness: 0.6 });
  const rohr = (a, b, r) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, va.distanceTo(vb), 10), leitungMat); m.position.copy(va).add(vb).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize()); m.castShadow = true; szene.add(m); };
  rohr([MX - 0.18, Y0 + 0.92, MZ - 0.05], [MX - 0.18, Y0 + 1.1, MZ - 0.05], 0.035);
  rohr([MX - 0.18, Y0 + 1.1, MZ - 0.05], [HX + 0.4, Y0 + 1.1, MZ - 0.05], 0.035);
  rohr([HX + 0.4, Y0 + 1.1, MZ - 0.05], [HX + 0.4, Y0 + 1.1, HZ + 0.75], 0.035);
  rohr([MX + 0.18, Y0 + 0.92, MZ - 0.05], [MX + 0.18, Y0 + 1.15, MZ - 0.05], 0.035);

  // Kostensäulen (Höhe = Euro): Staat aus vier Stücken, Netz, Lieferant
  const SK = 2.35 / Z.lieferant;
  const CZ = 1.75, CXS = 0.95, CXN = 1.6, CXL = 2.25;
  const stueck = (farbe) => { const s = kostenSaeule({ breite: 0.34, farbe, tick: 0, deckkraft: 0.55 }); return s; };
  const sMw = stueck(ST), sCo = stueck(ST), sEs = stueck(ST), sKo = stueck(ST);
  const sNe = stueck(RE), sLi = stueck(RE);
  [[sMw, CXS], [sCo, CXS], [sEs, CXS], [sKo, CXS], [sNe, CXN], [sLi, CXL]].forEach(([s, x]) => { s.position.set(x, Y0, CZ); szene.add(s); });
  // Zehntel-Marke (244,60 €) am Staats-Stapel
  const marke = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.62), new THREE.MeshBasicMaterial({ color: new THREE.Color(AKZENT).multiplyScalar(1.6), transparent: true, opacity: 0.9, fog: false }));
  marke.position.set(CXS, Y0 + Z.zehntel * SK, CZ); szene.add(marke);
  const marke2 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.62), new THREE.MeshBasicMaterial({ color: new THREE.Color(AKZENT).multiplyScalar(1.6), transparent: true, opacity: 0.9, fog: false }));
  marke2.position.set(CXS, Y0 + 700 * SK, CZ); szene.add(marke2);
  // Vergleichslinie Staat gegen Netz (Kipp)
  const linie = new THREE.Mesh(new THREE.BoxGeometry(CXN - CXS + 0.5, 0.012, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(AKZENT).multiplyScalar(1.8), transparent: true, fog: false }));
  linie.position.set((CXS + CXN) / 2, Y0 + Z.netz * SK, CZ + 0.2); szene.add(linie);

  // Geldströme: Gas ins Haus, dann drei Ströme aus dem Zähler in die Säulen (Breite = Anteil)
  const ZP = [MX, Y0 + 1.2, MZ + 0.1];
  const gasStrom = energieFluss({ punkte: [[-3.2, Y0 + 0.5, MZ + 1.4], [-2.0, Y0 + 0.9, MZ + 0.7], [MX - 0.18, Y0 + 0.95, MZ - 0.05]], farbe: "#BFD8FF", radius: 0.035, wuerfel: 8, groesse: 0.06, staerke: 1.6 });
  const stromS = energieFluss({ punkte: [[MX + 0.18, Y0 + 0.95, MZ + 0.05], [0.15, Y0 + 1.6, MZ + 0.3], [CXS - 0.2, Y0 + 1.9, CZ - 0.2], [CXS, Y0 + 1.1, CZ]], farbe: ST, radius: 0.05, wuerfel: 9, groesse: 0.085 });
  const stromN = energieFluss({ punkte: [[MX + 0.18, Y0 + 0.95, MZ + 0.05], [0.4, Y0 + 1.15, MZ + 0.5], [CXN - 0.3, Y0 + 1.0, CZ - 0.3], [CXN, Y0 + 0.8, CZ]], farbe: RE, radius: 0.04, wuerfel: 8, groesse: 0.075 });
  const stromL = energieFluss({ punkte: [[MX + 0.18, Y0 + 0.95, MZ + 0.05], [0.6, Y0 + 0.9, MZ + 0.7], [CXL - 0.5, Y0 + 0.9, CZ - 0.3], [CXL, Y0 + 0.8, CZ]], farbe: RE, radius: 0.05, wuerfel: 9, groesse: 0.085 });
  szene.add(gasStrom, stromS, stromN, stromL);

  // Kalender: zwölf Monatsplatten vorn, die Pointe füllt sie bis zum 21. April
  const KZ = 3.15, KTAGE = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const kal = [];
  KTAGE.forEach((tage, i) => {
    const x = -2.31 + i * 0.42;
    const g = new THREE.Group(); g.position.set(x, Y0 - 0.03, KZ + (i % 2) * 0.0);
    const basis = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.05, 0.37), new THREE.MeshStandardMaterial({ color: "#26324A", roughness: 0.6, emissive: new THREE.Color("#1D2B46"), emissiveIntensity: 0.5 })); basis.receiveShadow = true; g.add(basis);
    const fg = new THREE.BoxGeometry(0.37, 1, 0.37); fg.translate(0, 0.5, 0);
    const fuell = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: new THREE.Color(ST).multiplyScalar(2.0) }));
    fuell.position.y = 0.025; g.add(fuell); szene.add(g); kal.push({ g, basis, fuell, tage, i });
  });
  const kalWert = (t) => Z.tage * glatt(t, A.januar - 0.15, A.april + 0.55); // gefüllte Tage 0..111
  const kalEin = (t) => huckel(t, A.bis, A.bis + 0.6, A.vom - 0.5, A.vom);       // Platten schon bei der Frage schwach sichtbar

  // Laternen, Bäume, Schnee
  const lat1 = laterne({ hoehe: 1.45, arm: 0.34, kegel: 0.16, pfuetze: 0.9 }); lat1.position.set(-3.2, Y0, 1.9); szene.add(lat1);
  const lat2 = laterne({ hoehe: 1.45, arm: 0.34, kegel: 0.16, pfuetze: 0.9 }); lat2.position.set(3.2, Y0, 0.2); lat2.rotation.y = Math.PI; szene.add(lat2);
  const baeume = [[-5.6, -1.2, 1.1], [-4.6, -3.2, 1.3], [-6.6, 0.8, 0.9], [-3.1, -4.3, 1.2], [-0.9, -4.8, 1.4], [1.1, -4.2, 1.2], [3.2, -4.6, 1.3], [5.3, -3.0, 1.1], [5.9, -0.6, 1.2], [6.8, 1.6, 0.9], [-6.2, 3.4, 1.0], [6.2, 3.9, 1.0], [-8.2, -4.0, 1.5], [8.3, -4.6, 1.6], [-3.4, -7.5, 1.6], [2.2, -8.0, 1.8], [-7.8, -1.5, 1.4], [7.9, 0.4, 1.3]];
  baeume.forEach(([x, z, g], i) => { const b = winterBaum({ groesse: g, seed: i + 2 }); b.position.set(x, 0, z); b.rotation.y = hash(i, 3) * 6; szene.add(b); });
  // Lichtspots: Staat (orange) und Rest (blau) bekommen Punktlicht und Kegel
  const lichtS = new THREE.PointLight("#FF8A44", 0, 0, 2); lichtS.position.set(CXS, Y0 + 2.4, CZ + 1.3); szene.add(lichtS);
  const lichtR = new THREE.PointLight("#4D9CFF", 0, 0, 2); lichtR.position.set(CXL - 0.4, Y0 + 2.8, CZ + 1.3); szene.add(lichtR);
  const kegelS = lichtKegel({ hoehe: 5.4, radiusOben: 0.1, radiusUnten: 1.2, farbe: ST, staerke: 0.5, streifen: 0.25 }); kegelS.material = kegelS.material.clone(); kegelS.userData.dynamisch = true; szene.add(kegelS);
  const schneeFern = staub({ anzahl: 700, bereich: [18, 10, 14], mitte: [0, 4, 1], farbe: "#DCE8FF", groesse: 0.04, staerke: 1.25, aussen: 1, tempo: -0.06, seed: 11 });
  const schneeNah = staub({ anzahl: 380, bereich: [9, 6, 7], mitte: [0, 2.6, 3.2], farbe: "#E8F0FF", groesse: 0.055, staerke: 1.4, aussen: 1, tempo: -0.1, seed: 23 });
  szene.add(schneeFern, schneeNah);
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 220);
  const sh = (t, pos, ziel, fov = 36) => ({ t, pos, ziel, fov });
  const SH = [
    sh(0, [0.4, 4.4, 19.5], [0.0, 2.2, 0.8], 36),                  // Totale: Haus, Zähler, Säulen
    sh(2.4, [-0.4, 3.2, 13.0], [-0.7, 1.9, 0.7], 36),              // fährt zum Zähler
    sh(A.n2400 + 0.4, [-0.3, 2.6, 10.0], [-0.6, 1.6, 1.0], 33),    // Zählerblatt nah
    sh(A.wie, [0.9, 4.0, 16.5], [0.9, 2.2, 1.0], 36),               // zurück: Frage, Säulen im Blick
    sh(A.gerechnet + 0.3, [0.9, 3.8, 17.0], [0.8, 2.3, 1.2], 36),  // Regeln: Totale
    sh(A.klar, [1.3, 3.1, 14.0], [1.3, 1.5, 1.7], 35),             // Denkfalle: Blick auf den Staats-Stapel, Zehntel-Marke
    sh(A.oder + 0.5, [1.2, 2.7, 11.5], [1.2, 1.3, 1.7], 33),
    sh(A.schon + 0.2, [0.7, 3.3, 14.0], [0.5, 1.6, 1.4], 35),      // Wendung 1: vom Zähler zum Staats-Stapel
    sh(A.vierhundert, [1.3, 2.9, 12.8], [1.2, 1.5, 1.7], 34),
    sh(A.dann, [-0.8, 4.2, 15.5], [-0.8, 3.0, 0.2], 36),            // Kohlendioxid: Schornstein und Rauch
    sh(A.n65 + 0.6, [0.8, 3.2, 13.8], [0.8, 1.6, 1.6], 35),
    sh(A.bis, [0.2, 5.0, 17.5], [0.2, 0.9, 2.4], 38),               // zweite Frage: Kalenderreihe
    sh(A.nurF + 0.4, [1.2, 3.5, 15.0], [1.2, 1.5, 1.6], 36),
    sh(A.dazu, [1.3, 3.0, 13.4], [1.3, 1.5, 1.7], 34),              // Rennen entlang der Säulen
    sh(A.gasnetz - 0.2, [1.5, 2.9, 13.0], [1.5, 1.3, 1.7], 34),
    sh(A.fuer + 0.2, [1.6, 3.1, 13.4], [1.6, 1.7, 1.7], 35),
    sh(A.kDer, [1.3, 3.1, 15.0], [1.3, 1.6, 1.7], 36),              // Kipp: Totale der Säulen
    sh(A.netz, [1.3, 2.6, 12.5], [1.3, 1.3, 1.7], 34),
    sh(A.n700, [1.3, 3.0, 13.2], [1.3, 1.5, 1.7], 35),
    sh(A.eDer, [1.5, 2.9, 12.5], [1.5, 1.4, 1.7], 34),              // Ergebnis: Staats-Stapel
    sh(A.drittel + 0.4, [1.2, 3.5, 14.5], [1.2, 1.6, 1.6], 36),
    sh(A.groesster, [1.2, 2.9, 13.0], [1.2, 1.4, 1.7], 35),         // Warum
    sh(A.vom - 0.1, [0.0, 5.0, 17.5], [0.0, 0.9, 2.6], 38),         // Pointe: Kalender, alle zwölf Platten im Bild
    sh(A.april + 0.8, [0.0, 4.8, 17.0], [0.0, 0.9, 2.8], 37),
    sh(A.sk - 0.2, [0.6, 4.0, 17.0], [0.5, 2.2, 1.4], 36),         // Schlusskarte
    sh(DAUER, [0.5, 4.4, 19.5], [0.2, 2.2, 1.0], 36),
  ].sort((a, b) => a.t - b.t);
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    return { pos: a.pos.map((v, j) => lerp(v, b.pos[j], p)), ziel: a.ziel.map((v, j) => lerp(v, b.ziel[j], p)), fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.01, tempo: 0.25 });
  regie.zoom({ t: A.mwst + 1.2, ziel: [CXS, 1.0, CZ], staerke: 0.14, halt: 1.4, rueck: 0.8 });
  regie.zoom({ t: A.staat3 - 0.1, ziel: [CXS, 1.4, CZ], staerke: 0.16, halt: 1.4, rueck: 0.8 });
  regie.zoom({ t: A.staat4 - 0.15, ziel: [CXS, 1.1, CZ], staerke: 0.2, halt: 2.0, rueck: 0.9 });

  // ---------- Zustand auf die Welt anwenden ----------
  const post = { ...GRADING.nacht, belichtung: 1.08, bloomStaerke: 0.9, bloomSchwelle: 1.05, tiltMitte: 0.5, tiltBreite: 0.34, tiltStaerke: 0.5, vignette: 0.36, strahlen: 0.14, strahlenSchwelle: 1.3, strahlenLaenge: 0.7, strahlenAbfall: 0.96, strahlenFarbe: [1, 0.85, 0.7], strahlenPunkt: [CXS, 6, -6] };
  const moon = rig.mond, hemi = rig.hemi;
  const moonBasis = 0.85, hemiBasis = 0.5;
  const hoeheSaeule = (s, unten, v) => { s.position.y = Y0 + unten * SK; s.hoehe(Math.max(0.004, v * SK)); };
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const mw = vMw(t), co = vCo(t), es = vEs(t), ko = vKo(t);
      // Staats-Stapel aus vier Stücken
      hoeheSaeule(sMw, 0, mw); hoeheSaeule(sCo, Z.mwst, co); hoeheSaeule(sEs, Z.mwst + Z.co2, es); hoeheSaeule(sKo, Z.mwst + Z.co2 + Z.es, ko);
      sMw.setze(fortschritt(t, A.mwst, A.mwst + 0.2)); sCo.setze(fortschritt(t, A.auf, A.auf + 0.2)); sEs.setze(fortschritt(t, A.es, A.es + 0.2)); sKo.setze(fortschritt(t, A.sechs - 0.1, A.sechs + 0.1));
      sNe.position.y = Y0; sNe.hoehe(Math.max(0.004, vNe(t) * SK)); sNe.setze(fortschritt(t, A.gasnetz, A.gasnetz + 0.2));
      sLi.position.y = Y0; sLi.hoehe(Math.max(0.004, vLi(t) * SK)); sLi.setze(fortschritt(t, A.vertrieb - 0.3, A.vertrieb - 0.1));
      const glS = puls(t, A.mwst + 1.0, 0.8) + puls(t, A.n240 + 0.2, 0.8) + puls(t, A.n110 - 0.1, 0.7) + puls(t, A.staat3 - 0.1, 1.1) * 1.2 + puls(t, A.n700 - 0.1, 1.5) * 1.2 + puls(t, A.n740 - 0.1, 2.2) * 1.4 + puls(t, A.mwst2 - 0.1, 0.9) * 0.6 + puls(t, A.co2b - 0.1, 0.9) * 0.6;
      [sMw, sCo, sEs, sKo].forEach((s) => s.puls(Math.min(1.4, glS)));
      sNe.puls(puls(t, A.netz - 0.2, 1.0) * 0.8 + puls(t, A.n500, 0.7) * 0.6); sLi.puls(puls(t, A.lieferant - 0.2, 1.0) * 0.8 + puls(t, A.n1200, 0.7) * 0.6);
      // Marken
      const mk = huckel(t, A.klar - 0.2, A.klar + 0.4, A.mwst + 0.9, A.mwst + 1.6);
      marke.visible = mk > 0.01; marke.material.opacity = 0.9 * mk * (0.75 + 0.25 * Math.sin(t * 6)); marke.position.y = Y0 + Z.zehntel * SK;
      marke2.visible = t > A.wachst - 0.3 && t < A.eDer + 0.2; marke2.material.opacity = 0.9 * puls(t, A.wachst - 0.3, 1.8, 0.3, 0.4);
      linie.visible = t > A.staat3 - 0.2 && t < A.er + 0.8; linie.material.opacity = puls(t, A.staat3 - 0.2, 2.7, 0.3, 0.5);
      // Ströme
      const lauf = (st, amp, tempo) => { st.setze(Math.min(1, amp)); st.lauf(t, tempo); };
      lauf(gasStrom, glatt(t, 0.2, 1.2) * (1 - glatt(t, A.dann - 0.3, A.dann + 0.6)) * 0.9 + 0.12, 0.34);
      lauf(stromS, huckel(t, A.schon + 0.1, A.schon + 0.5, A.rechnung1 + 0.2, A.dann) + huckel(t, A.dann + 3.0, A.auf + 0.1, A.euro2E, A.euro2E + 0.8) + huckel(t, A.dazu + 0.7, A.es + 0.4, A.euro3E, A.gemeinde - 0.1) + huckel(t, A.sechs - 0.3, A.sechs, A.sechs + 0.55, A.sechs + 0.9), 0.36);
      lauf(stromN, huckel(t, A.gasnetz - 0.2, A.gasnetz + 0.3, A.euro5E, A.euro5E + 0.5), 0.3);
      lauf(stromL, huckel(t, A.vertrieb - 0.5, A.vertrieb - 0.2, A.euro6E, A.euro6E + 0.5), 0.3);
      // Zähler: Zeiger dreht schneller, wenn Geld fließt; LED blinkt
      const durch = 0.5 + 1.8 * (huckel(t, 0.2, 1.2, A.dann - 0.3, A.dann + 0.6)) + 1.3 * (huckel(t, A.schon, A.schon + 0.5, A.euro6E, A.euro6E + 1.0));
      zeigerG.rotation.z = -(0.9 * t * durch) % (Math.PI * 2);
      lede.material.color.set(RE).multiplyScalar(1.2 + 1.6 * (0.5 + 0.5 * Math.sin(t * 7)));
      // Kalender
      const kw = kalWert(t), ke = kalEin(t) + glatt(t, A.januar - 0.1, A.januar + 0.2);
      let rest_ = kw;
      kal.forEach((k) => {
        const f = clamp(rest_ / k.tage); rest_ = Math.max(0, rest_ - k.tage);
        k.g.visible = ke > 0.01 || t > A.vom; k.g.scale.set(1, 1, 1);
        k.g.position.y = Y0 + 0.02 - 0.08 * (1 - Math.min(1, ke * 1.5));
        k.fuell.scale.set(1, 0.02 + 0.42 * f, 1); k.fuell.visible = f > 0.002;
        k.basis.material.emissiveIntensity = 0.5 + 0.9 * ke;
      });
      // Spots: Staat (orange) in den Phasen des Staats, Rest (blau) bei Netz und Lieferant
      const lS = huckel(t, A.klar - 0.1, A.klar + 0.6, A.oder + 0.4, A.oder + 1.2) * 0.8 + huckel(t, A.schon, A.schon + 0.6, A.rechnung1 + 0.4, A.rechnung1 + 1.0) + huckel(t, A.dann + 3.0, A.auf, A.euro2E + 0.4, A.euro2E + 1.0) + huckel(t, A.dazu, A.dazu + 0.6, A.euro4E + 0.2, A.euro4E + 0.9) + huckel(t, A.kDer - 0.1, A.kDer + 0.6, A.lieferant - 0.4, A.lieferant) + huckel(t, A.eDer - 0.2, A.eDer + 0.5, A.drittel + 2.4, A.groesster + 1.2) + huckel(t, A.vom + 0.3, A.vom + 1.0, A.sk - 0.3, A.sk + 0.6) * 0.7;
      const lR = huckel(t, A.gasnetz - 0.3, A.gasnetz + 0.4, A.euro6E + 0.6, A.euro6E + 1.4) * 0.9 + huckel(t, A.lieferant - 0.1, A.lieferant + 0.5, A.lieferant + 1.5, A.lieferant + 2.0) * 0.6;
      lichtS.intensity = 9 * Math.min(1.2, lS); lichtR.intensity = 9 * Math.min(1.2, lR);
      kegelS.visible = lS > 0.01; kegelS.material.uniforms.staerke.value = 0.1 * Math.min(1.2, lS); kegelS.position.set(CXS, 5.4, CZ);
      rauch.lauf(t, 0.7 + 0.5 * puls(t, A.co2, 3.0, 0.4, 0.8));
      haus.raumLicht.intensity = 1.2 + 0.4 * Math.sin(t * 2.3); haus.raumMat.emissiveIntensity = 0.3 + 0.1 * Math.sin(t * 2.3);
      moon.intensity = moonBasis * (1 + 0.2 * puls(t, A.n740 - 0.1, 2.0)); hemi.intensity = hemiBasis;
      post.bloomStaerke = 0.9 + 0.25 * glS; post.strahlen = 0.08 + 0.1 * huckel(t, A.kDer, A.n740, A.groesster, A.groesster + 1.2);
      post.strahlenPunkt = [CXS, 2.4, CZ]; post.splitBalance = 0.02 + 0.12 * (lR - lS);
      schneeFern.material.uniforms.staerke.value = 1.25; schneeNah.material.uniforms.staerke.value = 1.4;
      regie.anwenden(t);
    },
  };

  // ---------- HUD ----------
  const tmp = new THREE.Vector3();
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const SW = M.wert((t) => ({ a: staat(t), b: rest(t) }));
  M.tafel({
    y: 166, links: { team: "a", einheit: " €", nk: 2, max: 9999 }, rechts: { team: "b", einheit: " €", nk: 2, max: 9999 }, vorn: null,
    werte: (t) => { const s = SW(t); return { a: s.a, b: s.b }; },
    uhr: { ein: 0, zeit: (t) => 59.99 * (staat(t) / Z.brutto), format: (v) => `${Math.round((v / 59.99) * 100)}`, label: "% STAAT" },
  });
  const chip = (text, ein, aus, team, art = "voll", y = 490) => M.chip({ text, ein, aus: aus === Infinity ? aus : aus - 0.25, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.05) => x - d;
  M.titel({ woerter: [{ text: "GASPREIS", ein: -0.3, team: "a" }, { umbruch: true }, { text: "VON 2.446 €", ein: -0.3, team: "a" }, { umbruch: true }, { text: "WIE VIEL BEKOMMT DER STAAT?", ein: -0.3, art: "klein" }], y: 495, groesse: 104, aus: A.gerechnet - 0.15 });
  chip("MODELLRECHNUNG · EINFAMILIENHAUS · 2026", 0.6, A.klar - 0.05, "akzent", "hell", 372);
  // Regeln (Chips während die Zähler laufen)
  chip("20.000 KWH IM JAHR", A.gerechnet + 0.4, A.klar - 0.1, "akzent", "voll", 490);
  chip("12,23 CT/KWH · NEUKUNDEN 2026", A.durchschn - 0.1, A.klar - 0.1, "akzent", "voll", 605);
  chip("CO₂-PREIS 65 € PRO TONNE", A.neukunden - 0.05, A.klar - 0.1, "akzent", "hell", 720);
  // Denkfalle
  chip("STAAT: HÖCHSTENS EIN ZEHNTEL?", v(A.klar, 0.0), A.schon - 0.1, "a", "voll", 810);
  // Wendung 1
  chip("MEHRWERTSTEUER 19 % = 390,54 €", v(A.mwst), A.dann - 0.1, "a", "voll", 490);
  chip("MEHR ALS EIN SECHSTEL · 16 %", v(A.sechstel, 0.2), A.dann - 0.1, "a", "voll", 605);
  // Wendung 2
  chip("CO₂-PREIS 1,18 CT/KWH = 236,00 €", v(A.co2, 0.0), A.es - 0.2, "a", "voll", 490);
  chip("BIS ZU WELCHEM TAG NUR FÜR DEN STAAT?", v(A.bis, 0.1), A.vom - 0.1, "akzent", "voll", 1250);
  // Rennen
  chip("ENERGIESTEUER 0,55 CT/KWH = 110,00 €", v(A.es), A.gasnetz - 0.1, "a", "voll", 490);
  chip("GEMEINDE: 6,00 €", v(A.gemeinde), A.gasnetz - 0.1, "a", "hell", 605);
  // Kipp
  chip("STAAT 742,54 € > NETZ 514,00 €", v(A.staat3, 0.05), A.eDer - 0.35, "a", "voll", 490);
  chip("> HÄLFTE DES LIEFERANTEN · 594,73 €", v(A.haelfte, 0.35), A.eDer - 0.35, "b", "voll", 605);
  // Ergebnis: Bilanzkarte
  M.bilanz({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "WER BEKOMMT WAS · PRO JAHR", ein: A.eDer - 0.1, aus: A.groesster - 0.4,
    zeilen: [
      { label: "MEHRWERTSTEUER", wert: Z.mwst, einheit: " €", nk: 2, team: "a", ein: A.staat4 },
      { label: "CO₂-PREIS", wert: Z.co2, einheit: " €", nk: 2, team: "a", ein: A.staat4 + 0.25 },
      { label: "ENERGIESTEUER", wert: Z.es, einheit: " €", nk: 2, team: "a", ein: A.staat4 + 0.5 },
      { label: "GEMEINDE", wert: Z.konz, einheit: " €", nk: 2, team: "a", ein: A.staat4 + 0.75 },
    ],
    differenz: { label: "STAAT", wert: Z.staat, einheit: " €", nk: 2, ein: A.n740 - 0.1 },
  });
  // Warum
  M.balken({
    x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.groesster - 0.1, aus: A.vom - 0.3, max: 100,
    faktoren: [
      { label: "MEHRWERTSTEUER", ein: A.groesster, a: { wert: 16, text: "16 %" }, b: { wert: 84, text: "84 %" }, tag: "GRÖSSTER POSTEN", tagEin: A.posten },
      { label: "CO₂-PREIS", ein: A.danach - 0.1, a: { wert: 9.6, text: "9,6 %" }, b: { wert: 90.4, text: "90,4 %" }, tag: "DANACH", tagEin: A.danach },
    ],
  });
  // Pointe und zweite Antwort
  chip("2.446 € ÷ 365 TAGE · GLEICHMÄSSIG", v(A.vom, 0.05), A.sk - 0.1, "akzent", "hell", 490);
  chip("1. JANUAR BIS 21. APRIL = 111 VON 365 TAGEN", v(A.januar, 0.1), A.sk - 0.1, "a", "voll", 605);
  // Zähler an der Welt
  const klemme = (p, ymin, ymax) => ({ x: Math.min(880, Math.max(200, p.x)), y: Math.min(ymax, Math.max(ymin, p.y)) });
  const oben = (x, y) => klemme(proj([x, Y0 + y, CZ]), 910, 1180);
  M.zaehler({ wert: (t) => rechnung(t), einheit: " €", nk: 2, max: 9999, team: "akzent", art: "voll", label: "GASRECHNUNG IM JAHR", punkt: () => klemme(proj([MX, Y0 + 1.9, MZ]), 900, 1150), ein: v(A.gaspreis, 0.4), aus: A.gerechnet + 1.2 });
  const sp = (xw, y) => ({ x: Math.min(840, Math.max(250, proj([xw, Y0, CZ]).x)), y });
  M.zaehler({ wert: (t) => staat(t), einheit: " €", nk: 2, max: 9999, team: "a", art: "voll", label: "STAAT", punkt: () => sp(CXS - 0.2, 960), ein: v(A.klar, 0.0), aus: A.eDer - 0.3 });
  M.zaehler({ wert: (t) => vNe(t), einheit: " €", nk: 2, max: 9999, team: "b", art: "voll", label: "NETZ", punkt: () => sp(CXN, 1040), ein: v(A.gasnetz, 0.2), aus: A.eDer - 0.3 });
  M.zaehler({ wert: (t) => vLi(t), einheit: " €", nk: 2, max: 9999, team: "b", art: "voll", label: "LIEFERANT", punkt: () => sp(CXL + 0.2, 1120), ein: v(A.vertrieb, 0.2), aus: A.eDer - 0.3 });
  M.zaehler({ wert: (t) => 365 * (kalWert(t) / 365), einheit: " TAGE", nk: 0, max: 365, team: "a", art: "voll", label: "NUR FÜR DEN STAAT", punkt: () => ({ x: 540, y: 930 }), ein: v(A.januar, 0.1), aus: A.sk - 0.5 });
  // Schlusskarte
  M.pointe({ woerter: [{ text: "FAST JEDER", ein: A.sk, farbe: "akzent" }, { umbruch: true }, { text: "DRITTE EURO", ein: A.dritte, farbe: "a" }, { umbruch: true }, { text: "GEHT AN DEN STAAT.", ein: A.euroS, farbe: "akzent" }], ein: A.sk, y: 470, groesse: 80 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  // Untertitel nach dem tatsächlich Gesprochenen (Zahlwörter als Ziffern): eigener Zeitplan nur für die Blöcke
  const zpAlt = M.zp; M.zp = zpUT;
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });
  M.zp = zpAlt;

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "whoosh", "Gas fließt in den Zähler, Zähler der Rechnung läuft, Kamera gleitet"); ev(A.einfam, "klick", "Kamera nah am Gaszähler, Zeiger dreht"); ev(A.n2400, "ding", "Rechnung 2.446 €"); ev(A.wie, "klick", "Kamera zurück, Frage an die Säulen");
  ev(A.gerechnet, "whoosh", "Regeln als Chips, Kamera Totale"); ev(A.klar, "whoosh", "Kamera zum Staats-Stapel, Zehntel-Marke leuchtet"); ev(A.oder, "klick", "Kamera näher, Zweifel");
  ev(A.schon, "whoosh", "Orangefarbener Strom aus dem Zähler in den Staats-Stapel"); ev(A.mwst, "ding", "Mehrwertsteuer wächst, Stapel springt über die Zehntel-Marke"); ev(A.sechstel, "klick", "Mehr als ein Sechstel");
  ev(A.dann, "whoosh", "Kamera zum Schornstein, Rauch steigt"); ev(A.co2, "ding", "CO₂-Preis, zweites Stück im Staats-Stapel"); ev(A.n240, "klick", "236 € Zuwachs"); ev(A.bis, "whoosh", "Kalenderplatten erscheinen, zweite Frage");
  ev(A.dazu, "whoosh", "Kamera an den Säulen entlang"); ev(A.es, "ding", "Energiesteuer, drittes Stück"); ev(A.gemeinde, "klick", "Gemeinde, viertes Stück"); ev(A.gasnetz, "ding", "Netz-Säule wächst");
  ev(A.fuer, "whoosh", "Kamera zur Lieferanten-Säule"); ev(A.vertrieb, "ding", "Lieferanten-Säule wächst");
  ev(A.kDer, "whoosh", "Licht kippt, Vergleichslinie Staat gegen Netz"); ev(A.netz, "ding", "Staat höher als Netz"); ev(A.haelfte, "klick", "Mehr als die Hälfte des Lieferanten"); ev(A.n700, "ding", "Marke 700 € leuchtet");
  ev(A.eDer, "whoosh", "Zoom auf den Staats-Stapel, Bilanzkarte"); ev(A.n740, "ding", "742,54 € Staat, Stapel leuchtet"); ev(A.drittel, "klick", "Fast ein Drittel");
  ev(A.groesster, "whoosh", "Erklärgrafik Warum"); ev(A.danach, "klick", "Balken CO₂-Preis");
  ev(A.vom, "whoosh", "Kamera zum Kalender"); ev(A.januar, "ding", "Kalender füllt sich ab Januar"); ev(A.april, "ding", "21. April erreicht"); ev(A.heizt, "klick", "111 von 365 Tagen");
  ev(A.sk, "akzent", "Welt dunkelt ab, Schlusskarte"); ev(A.dritte, "akzent", "Dritte Euro leuchtet");
  const sortiert = []; M.extra.forEach((e) => sortiert.push(e.t)); sortiert.sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Schnee fällt, Rauch steigt"); }
    last = nxt;
  }

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
