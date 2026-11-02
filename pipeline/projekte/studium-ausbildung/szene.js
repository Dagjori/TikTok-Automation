// „Studium oder Ausbildung: Wer hat mit 40 mehr verdient?“ · Stil 19 Architekturmodell (Abendlicht), Simulierbar 03.11.2026 mittag.
// Lena (Ausbildung, orange) und Tom (Studium, blau) gehen als Modellfiguren über eine Sperrholzplatte. Die Wegstrecke ist das
// angesammelte Nettoeinkommen (1 Einheit ≈ 48.600 €): wer mehr verdient hat, ist weiter vorn; der Abstand ist der Rückstand.
// Neben jeder Figur wächst eine Acryl-Säule (Geld als Pegel). Alle Werte kommen aus pipeline/sim/studium_ausbildung.mjs
// (Tests: studium_ausbildung.test.mjs); das Alter läuft als Zeitraffer an den gesprochenen Zwischenständen entlang.
// Deterministisch: window.renderAt(t). Alles Zeitabhängige steckt in S(t), die Schleife (letztes Bild = erstes) läuft über M.wert.
import * as THREE from "three";
import { SimBuehne, GRADING, rigAbendsonne, dunst, lichtKegel, lichtBahn, staub, buendeln, fokus, aktualisiere, leuchtMat, lichtPfuetze } from "../../engine/sim_atmosphaere.js";
import { modellPlatte, modellHaus, modellBaum, modellFigur, abendWand, acrylMarker, hoersaal, werkstatt, schulhaus, zielTor, geldSaeule, schild, spurBand, modellLaeufer } from "../../engine/stil_architektur.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, keyframes, huelle, FEDER } from "../../engine/bewegung.js";
import { lena, tom, rueckstand, QUELLEN } from "../../sim/studium_ausbildung.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Licht, Acryl, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const LENA = "#FF8A3D";
const TOM = "#3D8BFF";
const AKZENT = "#ECE6DA";

// ---------- Weg: Geld → Strecke ----------
const Z0 = 4.0; // Startlinie
const XL = -0.85, XT = 0.85; // Spuren
const K = 13.2 / tom(40); // Einheiten je Euro (Tom erreicht mit 40 genau das Tor)
const ZG = Z0 - tom(40) * K; // Ziellinie (z ≈ −9,2)
const zVon = (euro) => Z0 - euro * K;
const SAEULE = 6e-6; // Säulenhöhe je Euro
const IAB = { studium: QUELLEN.iabStudium / 1e6, ausbildung: QUELLEN.iabAusbildung / 1e6 };

/** Monotone kubische Interpolation (PCHIP) durch Stützpunkte [[t, v], …] */
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

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await Promise.all(["800 40px 'SB Display'", "700 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "LENA", farbe: LENA, woerter: ["Lena*", "Ausbildung*", "Job*"] },
      b: { name: "TOM", farbe: TOM, woerter: ["Tom*", "Studium*", "Hörsaal*", "Abi*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    vierzigHook: T("hook:40"),
    lena: T("regeln:Lena"), ausb: T("regeln:Ausbildung"), job: T("regeln:Job"), tomR: T("regeln:Tom"), abi: T("regeln:Abi"),
    studium: T("regeln:Studium"), minijob: T("regeln:Minijob"), danach: T("regeln:Danach"), mehr: T("regeln:mehr"),
    klar: T("falle:Klar"), oder: T("falle:Oder"),
    lenaSchon: T("rennen:34.200"), sitzt: T("rennen:sitzt"), hoersaal: T("rennen:Hörsaal"),
    folg: T("folgen:Folg"), verpasst: T("folgen:verpasst"),
    mit24: T("wendung1:24"), startet: T("wendung1:startet"), rueck: T("wendung1:Rückstand"), n127: T("wendung1:127.200"),
    jetzt: T("wendung2:Jetzt"), langsam: T("wendung2:langsam"), mit30: T("wendung2:30"), n100: T("wendung2:100.800"),
    ab30: T("wendung3:Ab"), gehalt: T("wendung3:Gehalt"), n61: T("wendung3:61.200"), n34: T("wendung3:34.800"), n8: T("wendung3:8.400"), kurz: T("wendung3:Kurz"), vorbei: T("wendung3:vorbei"),
    erg40: T("ergebnis:40"), vorne: T("ergebnis:vorne"), n31: T("ergebnis:31.200"),
    warum: T("warum:Warum"), erstens: T("warum:Erstens"), acht: T("warum:8"), zweitens: T("warum:Zweitens"), n300: T("warum:300"),
    abstand: T("ueberraschung:Abstand"), iab: T("ueberraschung:IAB-Studie"), studium2: T("ueberraschung:Studium"), ausb2: T("ueberraschung:Ausbildung"),
    merk: T("merksatz:Ein"), lohnt: T("merksatz:lohnt"), spaeter: T("merksatz:später"), schluss: T("schluss:Was"),
  };
  const T_SCHLEIFE = A.schluss - 0.3;

  // ---------- Zeitachse des Modells: Alter in Jahren (Zeitraffer, an den gesprochenen Zwischenständen) ----------
  const alterRoh = pchip([
    [0, 16.0], [5.0, 16.8], [13.8, 18.2], [A.lenaSchon + 0.06, 19.0], [A.lenaSchon + 1.0, 19.0], [A.folg, 19.9], [A.mit24 + 0.3, 24.0], [A.jetzt - 0.2, 24.0],
    [A.mit30 + 0.55, 30.0], [A.ab30 + 0.1, 30.0], [A.n61, 33.0], [A.n34, 35.0], [A.n8, 37.0], [A.vorbei + 0.2, 37.64], [A.erg40 + 0.9, 40.0], [DAUER, 40.0],
  ]);
  // Hörsaal: Tom geht mit 19 hinein, sitzt dort bis 24, geht dann hinaus
  const hallIn = [18.95, 20.6], hallOut = [A.mit24 + 0.2, A.startet + 0.6];
  const sitzIn = [A.sitzt - 0.25, A.sitzt + 0.35], sitzOut = [A.mit24 + 0.15, A.mit24 + 0.7];
  const kopfDreh = [[0, 0], [hallIn[0], 0], [hallIn[0] + 0.5, -Math.PI / 2], [hallIn[1] - 0.1, -Math.PI / 2], [A.sitzt + 0.4, -Math.PI], [sitzOut[0], -Math.PI], [sitzOut[1] + 0.25, -1.5 * Math.PI], [hallOut[1] - 0.2, -1.5 * Math.PI], [hallOut[1] + 0.5, -2 * Math.PI], [DAUER, -2 * Math.PI]];
  const drehRoh = pchip(kopfDreh);

  // Rohzustand der Welt zur Zeit t (nur Zahlen; die Schleife lässt ihn zum Zustand bei t = 0 zurückgleiten)
  const S = (t) => {
    const al = alterRoh(t);
    const rate = (alterRoh(t + 0.04) - alterRoh(t - 0.04)) / 0.08;
    const eL = lena(al), eT = tom(al);
    const halle = huckel(t, hallIn[0], hallIn[1], hallOut[0], hallOut[1]);
    const sitz = huckel(t, sitzIn[0], sitzIn[1], sitzOut[0], sitzOut[1]);
    const hallRate = Math.abs(huckel(t + 0.05, hallIn[0], hallIn[1], hallOut[0], hallOut[1]) - huckel(t - 0.05, hallIn[0], hallIn[1], hallOut[0], hallOut[1])) / 0.1;
    const ampL = rate > 0.02 ? clamp(rate / 0.7, 0.35, 1) : 0;
    const ampT = Math.max(halle < 0.02 && al >= 23.99 && rate > 0.02 ? clamp(rate / 0.7, 0.35, 1) : 0, clamp(hallRate * 2.5, 0, 1) * (1 - sitz));
    return {
      al, rate, eL, eT, halle, sitz, drehT: drehRoh(t), ampL, ampT,
      gehL: al * Math.PI * 2 * 1.7, gehT: al * Math.PI * 2 * 1.7 + halle * 14,
      tor: 0.06 + 0.5 * glatt(t, A.vierzigHook - 0.1, A.vierzigHook + 0.6) + 0.44 * glatt(t, A.erg40 - 0.3, A.erg40 + 0.5),
      // Gehaltssäulen am Firmenviertel (Regeln) und Vergleichssäulen (Warum)
      gbL: 0.96 * huelle(t, A.job, Infinity, { feder: FEDER.weich }), gbT: 1.4 * huelle(t, A.mehr - 0.1, Infinity, { feder: FEDER.weich }),
      zeitL: glatt(t, A.erstens, A.erstens + 0.9), zeitT: glatt(t, A.erstens + 1.2, A.erstens + 2.1), klammer: glatt(t, A.acht - 0.2, A.acht + 0.5),
      vL: glatt(t, A.zweitens - 0.2, A.zweitens + 0.8), vT: glatt(t, A.zweitens + 0.25, A.zweitens + 1.1), vD: huelle(t, A.n300 - 0.1, Infinity, { feder: FEDER.standard }),
      colT: glatt(t, A.studium2 + 0.0, A.studium2 + 2.0) * IAB.studium, colL: glatt(t, A.ausb2 + 0.0, A.ausb2 + 1.8) * IAB.ausbildung,
      pulsTor: huelle(t, T("ueberraschung:erst"), T("ueberraschung:erst") + 1.2, { ausDauer: 0.6 }) * 0.6 + huelle(t, A.iab, A.iab + 1.6, { ausDauer: 0.8 }) + huelle(t, T("ueberraschung:Arbeitsleben"), T("ueberraschung:Arbeitsleben") + 1.4, { ausDauer: 0.8 }),
      ende: glatt(t, A.abstand - 0.3, A.abstand + 0.6), pulsCol: huelle(t, A.spaeter - 0.2, A.spaeter + 1.6, { ausDauer: 0.8 }) + 0.6 * huelle(t, A.lohnt - 0.1, A.lohnt + 0.9, { ausDauer: 0.5 }),
      // Lichtstimmung: Spannung steigt bis zum Ergebnis, danach ruhiger
      warm: glatt(t, A.klar, A.mit24) * 0.35 + glatt(t, A.jetzt, A.vorbei) * 0.65, hoehe: glatt(t, A.n61, A.erg40 + 0.6) - 0.45 * glatt(t, A.warum, A.warum + 3),
      spotT: huckel(t, A.klar - 0.1, A.klar + 0.5, A.oder - 0.15, A.oder + 0.3), spotL: huckel(t, A.oder - 0.05, A.oder + 0.4, A.lenaSchon - 1.0, A.lenaSchon - 0.2),
      markAusb: huelle(t, A.ausb - 0.05, Infinity), markJob: huelle(t, A.job - 0.05, Infinity), markAbi: huelle(t, A.abi - 0.05, Infinity), markStud: huelle(t, A.studium - 0.05, Infinity),
      markFirma: huelle(t, A.danach - 0.05, Infinity),
      blitz: huelle(t, A.vorbei + 0.1, A.vorbei + 0.9, { ausDauer: 0.6 }),
      luecke: glatt(t, A.rueck - 0.3, A.rueck + 0.5) * (1 - glatt(t, A.vorbei + 0.25, A.vorbei + 0.5)),
    };
  };
  const SW = M.wert(S); // schleifenfest
  M.schleife({ ab: T_SCHLEIFE });

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = abendWand();
  dunst(szene, "#2A2128", 0.008);
  const SONNE = [-0.62, 0.2, -0.76];
  const rig = rigAbendsonne(szene, buehne.renderer, { richtung: SONNE, ziel: [0, 0, 0], bereich: 12, schatten: SCHATTEN, farbe: "#FFC283", staerke: 5.0, himmel: "#9FB0CC", boden: "#5A4636", himmelStaerke: 0.6, umgebungsStaerke: 0.45 });
  const platte = modellPlatte({ breite: 15, tiefe: 44, strassen: [{ x: XL, richtung: "z", breite: 0.95 }, { x: XT, richtung: "z", breite: 0.95 }], holz: true });
  platte.position.set(0, 0, -8.5);
  szene.add(platte);

  // Gebäude am Start: links Lena (Berufsschule, Betrieb, Büro), rechts Tom (Gymnasium, Hörsaal, Firma); Front zur Spur
  const links = (obj, z, x = -3.65) => { obj.position.set(x, 0, z); obj.rotation.y = Math.PI / 2; szene.add(obj); return obj; };
  const rechts = (obj, z, x = 3.65) => { obj.position.set(x, 0, z); obj.rotation.y = -Math.PI / 2; szene.add(obj); return obj; };
  const berufsschule = links(schulhaus({ breite: 3.0, tiefe: 1.6, hoehe: 1.3, seed: 11 }), 8.3, -3.55);
  const betrieb = links(werkstatt({ breite: 3.0, tiefe: 2.3, hoehe: 1.55 }), 3.7, -3.3);
  const buero = links(modellHaus({ breite: 1.6, hoehe: 3.2, tiefe: 1.5, dach: "flach", seed: 21 }), -0.1, -3.7);
  const gymnasium = rechts(schulhaus({ breite: 3.0, tiefe: 1.6, hoehe: 1.3, seed: 15 }), 8.3, 3.55);
  const hs = hoersaal({ breite: 4.3, tiefe: 2.4, hoehe: 2.4, stufen: 4, gespiegelt: true });
  rechts(hs, 3.2, 3.35);
  const firma = rechts(modellHaus({ breite: 1.7, hoehe: 4.2, tiefe: 1.6, dach: "flach", seed: 25 }), -1.0, 3.7);
  szene.updateMatrixWorld(true);
  const sitzWelt = new THREE.Vector3(...hs.sitz(2, 1, 3)).applyMatrix4(hs.matrixWorld);
  const SITZ = { x: sitzWelt.x, y: sitzWelt.y - 0.12, z: sitzWelt.z };
  // Weitere Modellhäuser, Bäume, Figuren als Kulisse
  for (let i = 0; i < 54; i++) {
    const seite = i % 2 ? 1 : -1;
    const z = 11.5 - Math.floor(i / 2) * 1.5 - hash(i, 3) * 0.5;
    const x = seite * (5.0 + hash(i, 1) * 1.7);
    if (z < -26) continue;
    const sattel = hash(i, 4) < 0.4;
    const h = modellHaus({ breite: 1.1 + hash(i, 5) * 0.7, hoehe: sattel ? 0.9 + hash(i, 6) * 0.7 : 1.2 + hash(i, 6) * 2.6, tiefe: 1.1 + hash(i, 7) * 0.6, dach: sattel ? "sattel" : "flach", material: hash(i, 8) < 0.2 ? "holz" : "karton", seed: i + 40 });
    h.position.set(x, 0, z); h.rotation.y = hash(i, 9) < 0.5 ? 0 : Math.PI / 2;
    szene.add(h);
  }
  for (let i = 0; i < 44; i++) {
    const seite = i % 2 ? 1 : -1;
    const z = 11 - Math.floor(i / 2) * 1.0 - hash(i, 12) * 0.4;
    const x = seite * (2.35 + hash(i, 13) * 0.25);
    if (z < -26 || (z < 6 && z > 0.8 && Math.abs(x) > 2.3 && Math.abs(x) < 4.9)) continue; // Platz für Betrieb/Hörsaal
    if (seite < 0 && z > 1.8 && z < 5.5) continue;
    const b = modellBaum({ groesse: 0.5 + hash(i, 14) * 0.3, seed: i });
    b.position.set(x, 0, z); szene.add(b);
  }
  for (let i = 0; i < 9; i++) { const f = modellFigur({ groesse: 0.5 }); f.position.set((i % 2 ? 1 : -1) * (2.1 + hash(i, 5) * 0.2), 0, 6.5 - i * 1.6); f.rotation.y = hash(i, 6) * 6; szene.add(f); }
  // Hörsaal: weiße Kommilitonen (sitzend, Blick zum Pult)
  const kommilitonen = [];
  for (const [st, nr] of [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2], [3, 0], [3, 1], [3, 2]]) {
    const f = modellLaeufer({ groesse: 0.7, farbe: "#F4F1EC", lichtfleck: false });
    const p = new THREE.Vector3(...hs.sitz(st, nr, 3)).applyMatrix4(hs.matrixWorld);
    f.position.set(p.x, p.y - 0.12, p.z); f.rotation.y = Math.PI;
    f.pose({ sitz: 1 }); szene.add(f); kommilitonen.push(f);
  }
  // Meilensteine: Schilder mit dem Geldstand am Weg (beide Seiten), 100.000 € … 600.000 €
  for (let k = 1; k <= 6; k++) {
    for (const x of [-1.75, 1.75]) {
      const s = schild({ text: `${k * 100}.000 €`, breite: 0.78, hoehe: 0.28, pfosten: 0.26 });
      s.position.set(x, 0, zVon(k * 100000)); szene.add(s);
    }
  }
  // Ziellinie 40 und Verlängerung der Bahn bis 65
  const tor = zielTor({ breite: 3.4, hoehe: 1.9, text: "40" });
  tor.position.set(0, 0, ZG); szene.add(tor);
  const tor65 = zielTor({ breite: 3.4, hoehe: 1.9, text: "65" });
  tor65.position.set(0, 0, -23.5); szene.add(tor65);
  for (const [x, f] of [[XL, LENA], [XT, TOM]]) {
    const b = spurBand({ breite: 0.07, farbe: f, staerke: 1.1 });
    b.position.set(x, 0, ZG); b.laenge(14); szene.add(b);
  }
  // Geldsäulen der Figuren
  const saeuleL = geldSaeule({ breite: 0.4, farbe: LENA, deckkraft: 0.2 }); saeuleL.userData.dynamisch = true; szene.add(saeuleL);
  const saeuleT = geldSaeule({ breite: 0.4, farbe: TOM, deckkraft: 0.2 }); szene.add(saeuleT);
  // Spuren (Lichtspur hinter den Figuren)
  const spurL = spurBand({ breite: 0.1, farbe: LENA, staerke: 1.5 }); spurL.position.set(XL, 0, Z0); szene.add(spurL);
  const spurT = spurBand({ breite: 0.1, farbe: TOM, staerke: 1.5 }); spurT.position.set(XT, 0, Z0); szene.add(spurT);
  // Figuren
  const figL = modellLaeufer({ groesse: 0.78, farbe: LENA, jacke: 0.65 }); szene.add(figL);
  const figT = modellLaeufer({ groesse: 0.78, farbe: TOM, jacke: 0.65 }); szene.add(figT);
  // Maßlinie (Rückstand) zwischen den Spuren
  const masMat = leuchtMat(AKZENT, 1.5, { transparent: true, neu: true });
  const masse = new THREE.Group(); masse.userData.dynamisch = true; szene.add(masse);
  const mLinie = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 1), masMat); masse.add(mLinie);
  const mEndeL = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.02, 0.035), masMat), mEndeT = mEndeL.clone(); masse.add(mEndeL, mEndeT);
  // Sockel-Marker an Gebäuden (Acryl, Teamfarbe): leuchten, wenn das Wort fällt
  const sockel = (obj, b, t, farbe, ox = 0, oz = 0) => { const m = acrylMarker({ breite: b, tiefe: t, hoehe: 0.1, farbe, deckkraft: 0.34 }); m.position.set(obj.position.x + ox, 0.0, obj.position.z + oz); m.setze(0); szene.add(m); return m; };
  const mBerufs = sockel(berufsschule, 1.9, 3.4, LENA), mBetrieb = sockel(betrieb, 2.6, 3.3, LENA), mBuero = sockel(buero, 1.9, 1.9, LENA);
  const mGym = sockel(gymnasium, 1.9, 3.4, TOM), mHs = sockel(hs, 2.8, 4.7, TOM), mFirma = sockel(firma, 2.0, 2.0, TOM);
  // Gehaltssäulen im Firmenviertel (Regeln: „danach verdient Tom deutlich mehr“)
  const gbL = geldSaeule({ breite: 0.46, farbe: LENA }); gbL.position.set(-1.95, 0, 0.55); szene.add(gbL);
  const gbT = geldSaeule({ breite: 0.46, farbe: TOM }); gbT.position.set(1.95, 0, -0.1); szene.add(gbT);
  // Spot-Kegel für die Denkfalle (Tom, dann Lena)
  const kegel = (farbe) => { const k = lichtKegel({ hoehe: 5.2, radiusOben: 0.1, radiusUnten: 1.0, farbe, staerke: 0.55, streifen: 0.25 }); k.material = k.material.clone(); k.userData.dynamisch = true; szene.add(k); return k; };
  const kegelT = kegel(TOM), kegelL = kegel(LENA);

  // Bereich hinter dem Ziel: Zeitstrahl (Warum 1), Gehaltssäulen (Warum 2), Lebensverdienst-Säulen (Überraschung)
  const ZEIT_Z = [-11.0, -11.95];
  const JAHR = 0.17; // Einheiten je Jahr
  const zeitL = acrylMarker({ breite: 24 * JAHR, tiefe: 0.6, hoehe: 0.34, farbe: LENA }); szene.add(zeitL);
  const zeitT = acrylMarker({ breite: 16 * JAHR, tiefe: 0.6, hoehe: 0.34, farbe: TOM }); zeitT.position.set(4 * JAHR, 0, ZEIT_Z[1]); szene.add(zeitT); // Alter 24 → 40
  zeitL.position.set(0, 0, ZEIT_Z[0]); // Alter 16 → 40, Mitte bei x = 0
  const klammer = new THREE.Group(); klammer.userData.dynamisch = true; szene.add(klammer);
  const kMat = leuchtMat(AKZENT, 3.0, { transparent: true, neu: true });
  { // Klammer über den ersten 8 Jahren (Alter 16 → 24): Linie + zwei Pfosten
    const x0 = -12 * JAHR, x1 = x0 + 8 * JAHR, z = ZEIT_Z[0] + 0.62;
    const l = new THREE.Mesh(new THREE.BoxGeometry(8 * JAHR, 0.05, 0.05), kMat); l.position.set((x0 + x1) / 2, 0.5, z); klammer.add(l);
    for (const x of [x0, x1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.05), kMat); p.position.set(x, 0.25, z); klammer.add(p); }
  }
  const gvL = geldSaeule({ breite: 0.55, farbe: LENA }); gvL.position.set(-0.55, 0, -13.4); szene.add(gvL);
  const gvT = geldSaeule({ breite: 0.55, farbe: TOM }); gvT.position.set(0.55, 0, -13.4); szene.add(gvT);
  const gvD = geldSaeule({ breite: 0.55, farbe: AKZENT, deckkraft: 0.5 }); gvD.position.set(0.55, 1.35, -13.4); szene.add(gvD);
  const colL = geldSaeule({ breite: 0.95, farbe: LENA }); colL.position.set(-1.15, 0, -18.0); szene.add(colL);
  const colT = geldSaeule({ breite: 0.95, farbe: TOM }); colT.position.set(1.15, 0, -18.0); szene.add(colT);
  const SC = 2.0; // Höhe je Mio. €
  szene.add(staub({ anzahl: 600, bereich: [12, 5, 40], mitte: [0, 2, -6], farbe: "#FFD7A8", groesse: 0.014, staerke: 1.2, aussen: 0.35 }));
  // Lichtbahnen entlang der Spuren (Gegenlicht)
  const richt = new THREE.Vector3(...SONNE).normalize();
  for (const [x, z, b, st] of [[-2.9, -2.0, 1.3, 0.07], [0, -14.0, 1.8, 0.07]]) {
    const l = lichtBahn({ laenge: 14, breite: b, farbe: "#FFC58A", staerke: st, streifen: 0.6 });
    l.position.set(x + richt.x * 9, richt.y * 9, z + richt.z * 9);
    l.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), richt.clone().negate());
    l.rotateY(Math.PI / 2);
    szene.add(l);
  }
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 220);
  const zMitte = (s) => (zVon(s.eL) + zVon(s.eT)) / 2;
  const fokusPunkt = (t) => { const s = SW(t); return [0, 0.55, zMitte(s)]; };
  // Einstellungen: f = 1 → Versatz zum Mittelpunkt der Figuren, f = 0 → feste Weltkoordinaten
  const shot = (t, f, pos, ziel, fov = 34) => ({ t: typeof t === "number" ? t : T(t), f, pos, ziel, fov });
  const SH = [
    shot(0, 1, [0.0, 8.6, 13.0], [0.0, -0.9, -6.0], 44),
    shot(5.0, 1, [0.6, 6.0, 9.2], [0.0, 0.2, -2.8], 40),
    shot(A.ausb - 0.3, 1, [3.2, 3.8, 7.2], [-3.0, 0.9, -0.6], 40),
    shot(A.job - 0.1, 1, [1.6, 4.2, 7.0], [-3.0, 1.6, -3.4], 40),
    shot(A.tomR - 0.25, 1, [-0.6, 4.4, 7.2], [0.0, 0.8, -1.6], 40),
    shot(A.tomR + 0.5, 1, [-3.2, 3.8, 7.2], [3.0, 0.9, 0.0], 40),
    shot(A.studium + 0.3, 1, [-2.6, 4.0, 6.6], [3.0, 1.0, 0.4], 40),
    shot(A.danach, 1, [0.0, 5.0, 8.0], [1.8, 1.4, -4.5], 40),
    shot(A.klar, 1, [1.4, 7.4, 6.7], [0.0, 0.3, 0.4], 38),
    shot(A.oder + 0.5, 1, [-1.4, 7.4, 6.7], [0.0, 0.3, 0.4], 38),
    shot(A.lenaSchon - 0.6, 0, [-2.4, 4.6, 11.5], [2.6, 0.8, 3.4], 42),
    shot(A.hoersaal + 0.4, 0, [-1.6, 4.6, 10.6], [3.4, 1.0, 3.2], 46),
    shot(A.folg + 0.2, 1, [1.8, 7.8, 8.0], [0.0, 0.3, 0.0], 40),
    shot(A.mit24 + 0.4, 1, [1.6, 7.4, 6.7], [0.0, 0.3, 0.4], 38),
    shot(A.jetzt, 1, [-2.2, 7.4, 6.7], [0.0, 0.3, 0.4], 38),
    shot(A.mit30, 1, [2.2, 7.0, 6.4], [0.0, 0.3, 0.4], 38),
    shot(A.ab30, 1, [-2.0, 6.2, 5.8], [0.0, 0.3, 0.3], 38),
    shot(A.n34, 1, [1.0, 5.6, 5.4], [0.0, 0.3, 0.3], 38),
    shot(A.kurz + 0.2, 1, [0.4, 5.8, 5.4], [0.0, 0.3, -0.5], 38),
    shot(A.vorbei + 0.4, 1, [0.6, 5.6, 5.2], [0.0, 0.3, -0.5], 38),
    shot(A.erg40 + 0.8, 1, [0.3, 3.0, 6.0], [0.0, 1.1, -0.9], 38),
    shot(A.warum - 0.2, 0, [0.0, 11.0, -6.0], [0.0, 0.0, -11.6], 44),
    shot(A.zweitens - 1.3, 0, [0.0, 11.0, -6.0], [0.0, 0.0, -11.6], 44),
    shot(A.zweitens - 0.1, 0, [3.4, 3.4, -9.0], [0.0, 0.7, -13.4], 38),
    shot(A.abstand - 0.2, 0, [0.0, 4.4, -9.6], [0.0, 1.6, -18.0], 40),
    shot(A.iab + 0.9, 0, [1.4, 5.4, -8.8], [0.0, 1.0, -18.0], 40),
    shot(A.studium2 + 1.0, 0, [0.0, 3.8, -8.2], [0.0, 2.3, -18.0], 42),
    shot(A.ausb2 + 1.2, 0, [1.0, 3.0, -8.5], [0.0, 3.1, -18.0], 44),
    shot(A.merk, 0, [2.0, 4.6, -4.5], [0.0, 1.6, -14.0], 40),
  ];
  const kameraBasis = (t) => {
    const F = fokusPunkt(t);
    const sz = SW(t), luecke = Math.abs(zVon(sz.eL) - zVon(sz.eT));
    const sk = 1 + Math.max(0, luecke - 0.6) * 0.22; // große Lücke: Kamera geht zurück, beide Figuren bleiben im Bild
    const FK = 1.4; // Grundabstand: alles in der sicheren Breite
    const ab = (k) => k.f && k.t > 3 ? { pos: [F[0] + k.pos[0] * sk * FK, F[1] + k.pos[1] * sk * FK, F[2] + k.pos[2] * sk * FK], ziel: [F[0] + k.ziel[0], F[1] + k.ziel[1], F[2] + k.ziel[2]] } : { pos: k.pos, ziel: k.ziel };
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const x = ab(a), y = ab(b);
    return { pos: x.pos.map((v, j) => lerp(v, y.pos[j], p)), ziel: x.ziel.map((v, j) => lerp(v, y.ziel[j], p)), fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  regie.zoom({ t: A.hoersaal - 0.1, ziel: [3.4, 1.0, 3.2], staerke: 0.15, halt: 1.2, rueck: 0.8 });
  regie.zoom({ t: A.rueck - 0.05, ziel: (t) => { const s = SW(t); return [0, 0.5, zMitte(s)]; }, staerke: 0.15, halt: 2.4, rueck: 1.0 });
  regie.zoom({ t: A.kurz - 0.1, ziel: (t) => { const s = SW(t); return [0, 0.6, zMitte(s)]; }, staerke: 0.12, halt: 1.7, rueck: 0.6 });
  regie.schleife({ ab: T_SCHLEIFE, ende: DAUER - 1 / FPS });

  // ---------- Zustand auf die Welt anwenden ----------
  const sonne = rig.sonne, hemi = rig.hemi;
  const sonneBasis = new THREE.Color("#FFC283"), sonneHeiss = new THREE.Color("#FFA45C");
  const sonnenPunkt = new THREE.Vector3(...SONNE).normalize().multiplyScalar(60).toArray();
  const post = { ...GRADING.abend, belichtung: 1.02, splitStaerke: 0.24, saettigung: 1.0, kontrast: 1.1, vignette: 0.36, bloomSchwelle: 1.3, lift: [0.004, 0.004, 0.01], strahlen: 0.22, strahlenPunkt: sonnenPunkt, strahlenSchwelle: 1.4, strahlenLaenge: 0.75, strahlenAbfall: 0.97, strahlenFarbe: [1, 0.82, 0.6] };
  const tmp = new THREE.Vector3();
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t);
      const zL = zVon(s.eL), zT = zVon(s.eT);
      // Lena: auf der Spur
      figL.position.set(XL, 0, zL); figL.rotation.y = 0;
      figL.pose({ geh: s.gehL, schritt: s.ampL * 0.95, sitz: 0 });
      figL.leuchte(0.8 + 0.5 * s.blitz);
      // Tom: Spur → Hörsaal (Sitzplatz) → Spur
      const x = lerp(XT, SITZ.x, s.halle), z = lerp(zT, SITZ.z, s.halle), y = SITZ.y * s.halle;
      figT.position.set(x, y, z); figT.rotation.y = s.drehT;
      figT.pose({ geh: s.gehT, schritt: s.ampT, sitz: s.sitz });
      figT.leuchte(0.8 + 2.4 * s.blitz + 0.4 * s.spotT); figT.fleck.scale.setScalar(1 + 1.3 * s.blitz);
      if (s.ampT === 0 && s.sitz < 0.01) figT.rotation.y += Math.sin(t * 0.8) * 0.12; // wartet, schaut sich um
      // Säulen und Spuren
      saeuleL.position.set(XL - 0.65, 0, zL); const fade = 1 - glatt(t, A.warum - 0.4, A.warum + 0.5); saeuleL.setze(s.eL > 6000 ? fade : 0); saeuleL.hoehe(Math.max(0.02, s.eL * SAEULE)); saeuleL.puls(0.35 * s.blitz);
      saeuleT.position.set(XT + 0.65, 0, zT); saeuleT.setze(s.eT > 6000 ? fade : 0); saeuleT.hoehe(Math.max(0.02, s.eT * SAEULE)); saeuleT.puls(0.9 * s.blitz);
      spurL.laenge(Z0 - zL); spurT.laenge(Math.max(0, Z0 - zT));
      // Maßlinie des Rückstands
      masse.visible = s.luecke > 0.01 && Math.abs(zL - zT) > 0.05;
      masMat.opacity = s.luecke;
      mLinie.scale.z = Math.max(1e-3, Math.abs(zL - zT)); mLinie.position.set(0, 0.03, (zL + zT) / 2);
      mEndeL.position.set(XL / 2, 0.03, zL); mEndeT.position.set(XT / 2, 0.03, zT);
      // Gebäude-Marker, Gehaltssäulen, Tor
      mBerufs.setze(Math.min(1, s.markAusb) * 0.7); mBetrieb.setze(Math.min(1, s.markAusb)); mBuero.setze(Math.min(1, s.markJob) * 0.8);
      mGym.setze(Math.min(1, s.markAbi) * 0.7); mHs.setze(Math.min(1, s.markStud)); mFirma.setze(Math.min(1, s.markFirma) * 0.8);
      gbL.hoehe(Math.max(0.01, s.gbL)); gbL.setze(s.gbL > 0.01 ? 1 : 0);
      gbT.hoehe(Math.max(0.01, s.gbT)); gbT.setze(s.gbT > 0.01 ? 1 : 0);
      tor.setze(s.tor); tor65.setze(0.1 + 0.4 * s.ende + 0.5 * s.pulsTor);
      // Warum + Überraschung
      zeitL.setze(s.zeitL); zeitT.setze(s.zeitT); klammer.visible = s.klammer > 0.01; kMat.opacity = s.klammer;
      gvL.setze(s.vL > 0.01 ? 1 : 0); gvL.hoehe(Math.max(0.01, 2.4 * 0.5 * s.vL));
      gvT.setze(s.vT > 0.01 ? 1 : 0); gvT.hoehe(Math.max(0.01, 2.7 * 0.5 * s.vT));
      gvD.setze(s.vD > 0.02 ? 1 : 0); gvD.hoehe(Math.max(0.01, 0.15 * Math.min(1, s.vD))); gvD.puls(0.4 * Math.max(0, s.vD - 1));
      colL.setze(s.colL > 0.01 ? 1 : 0); colL.hoehe(Math.max(0.01, s.colL * SC)); colL.puls(0.5 * Math.min(1.4, s.pulsCol));
      colT.setze(s.colT > 0.01 ? 1 : 0); colT.hoehe(Math.max(0.01, s.colT * SC)); colT.puls(0.8 * Math.min(1.4, s.pulsCol));
      // Spotlights der Denkfalle
      kegelT.visible = s.spotT > 0.01; kegelT.material.uniforms.staerke.value = 0.7 * s.spotT; kegelT.position.set(XT, 5.2, zT);
      kegelL.visible = s.spotL > 0.01; kegelL.material.uniforms.staerke.value = 0.7 * s.spotL; kegelL.position.set(XL, 5.2, zL);
      // Kommilitonen atmen leicht
      kommilitonen.forEach((f, i) => f.pose({ sitz: 1, geh: 0, schritt: 0 }));
      // Licht: Sonne wandert mit dem Bild (Schatten bleiben scharf), wird wärmer und stärker
      const F = fokusPunkt(t);
      const sx = Math.round(F[0] / 1) * 1, sz = Math.round(F[2] / 1) * 1;
      sonne.target.position.set(sx, 0, sz);
      sonne.position.set(sx + rig.richtung.x * 40, rig.richtung.y * 40, sz + rig.richtung.z * 40);
      sonne.target.updateMatrixWorld();
      sonne.color.copy(sonneBasis).lerp(sonneHeiss, s.warm);
      sonne.intensity = 4.9 + 1.0 * s.warm + 0.6 * s.hoehe + 0.5 * s.blitz;
      hemi.intensity = 0.6 - 0.06 * s.hoehe;
      post.bloomStaerke = 0.4 + 0.2 * s.hoehe + 0.2 * s.blitz;
      post.vignette = 0.36 + 0.08 * s.hoehe;
      post.belichtung = 1.02 + 0.04 * s.blitz;
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, regie.zustand(t).ziel, { tiefe: 0.28, nah: 0.45, fern: 0.6 }));
    },
  };

  // ---------- HUD ----------
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 999999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 999999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: s.eL, b: s.eT }; },
    uhr: { ein: 0, zeit: (t) => SW(t).al, format: (v) => `${Math.floor(v + 1e-6)}`, label: "ALTER" },
  });
  // Regeln als Chips genau beim Wort (mit exakten Beträgen), je einer zur Zeit
  const chip = (text, ein, aus, team, art = "hell") => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y: 372, anker: "mitte" });
  chip("AUSBILDUNG · 950 € NETTO", A.ausb, A.job - 0.3, "a");
  chip("JOB · 2.000 €, AB 25: 2.400 €", A.job, A.tomR - 0.3, "a");
  chip("ABI · 5 JAHRE STUDIUM", A.abi, A.minijob - 0.3, "b");
  chip("MINIJOB · 500 €", A.minijob, A.danach - 0.3, "b");
  chip("DANN 2.700 €, AB 30: 3.500 €", A.danach, A.klar - 0.15, "b", "voll");
  chip("AB 30: 3.500 € NETTO", A.gehalt, A.n61 - 0.2, "b");
  chip("8 JAHRE FRÜHER", A.erstens + 0.6, A.zweitens - 0.15, "a");
  chip("+ 300 € IM MONAT", A.zweitens + 0.7, A.n300 + 2.2, "b");
  // Rückstand: schwebender Zähler an der Maßlinie
  M.zaehler({ wert: (t) => { const s = SW(t); return rueckstand(s.al); }, einheit: "€", nk: 0, max: 999999, team: "a", label: "RÜCKSTAND", art: "voll",
    punkt: (t) => { const s = SW(t); return proj([0, 0.5, zMitte(s)]); }, ein: A.rueck - 0.1, aus: A.vorbei + 0.35 });
  // Lebensverdienst (IAB): Zähler über den Säulen
  M.zaehler({ wert: (t) => SW(t).colT, einheit: " Mio. €", nk: 2, max: 9, team: "b", label: "STUDIUM", art: "voll", punkt: () => proj([1.15, SC * IAB.studium + 0.25, -18.0]), ein: A.studium2 - 0.1, aus: A.merk - 0.2 });
  M.zaehler({ wert: (t) => SW(t).colL, einheit: " Mio. €", nk: 2, max: 9, team: "a", label: "AUSBILDUNG", art: "voll", punkt: () => proj([-1.15, SC * IAB.ausbildung + 0.25, -18.0]), ein: A.ausb2 - 0.1, aus: A.merk - 0.2 });
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "MIT 40", ein: A.erg40 + 0.3, aus: A.warum - 0.25,
    zeilen: [{ label: "TOM", wert: tom(40), einheit: "€", team: "b", ein: A.erg40 + 0.5 }, { label: "LENA", wert: lena(40), einheit: "€", team: "a", ein: A.vorne }],
    differenz: { label: "VORSPRUNG", wert: tom(40) - lena(40), einheit: "€", ein: A.n31 }, sieger: { text: "TOM GEWINNT", team: "b", ein: A.n31 + 0.8 } });
  M.folgen({ ein: A.folg, dauer: 1.8 });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(A.vierzigHook, "ding", "Ziellinie 40 leuchtet auf");
  ev(A.ausb, "pop", "Betrieb leuchtet"); ev(A.job, "pop", "Büro leuchtet"); ev(A.abi, "pop", "Gymnasium leuchtet"); ev(A.studium, "pop", "Hörsaal leuchtet");
  ev(A.minijob, "klick", "Minijob"); ev(A.mehr, "ding", "Gehaltssäule wächst");
  ev(A.klar, "whoosh", "Spot auf Tom"); ev(A.oder, "klick", "Spot wechselt auf Lena");
  ev(A.lenaSchon, "pop", "19: Tom geht in den Hörsaal"); ev(A.sitzt, "pop", "Tom setzt sich"); ev(hallIn[0] + 0.7, "klick", "Tom im Hörsaal");
  ev(A.mit24, "whoosh", "Tom steht auf"); ev(A.startet, "pop", "Tom startet"); ev(A.rueck, "ding", "Maßlinie Rückstand");
  ev(A.langsam, "klick", "Abstand schrumpft"); ev(A.n100, "pop", "30: Rückstand 100.800 €");
  ev(A.gehalt, "ding", "Toms Gehalt zieht an"); ev(A.n61, "klick", "Countdown 61.200"); ev(A.n34, "klick", "Countdown 34.800"); ev(A.n8, "klick", "Countdown 8.400");
  ev(A.kurz, "whoosh", "Zoom auf beide"); ev(A.vorbei, "ding", "Tom überholt: Aufleuchten");
  ev(A.erg40, "ding", "Ziel erreicht"); ev(A.erstens, "pop", "Zeitstrahl Lena"); ev(A.erstens + 1.2, "klick", "Zeitstrahl Tom"); ev(A.acht, "ding", "8 Jahre Klammer");
  ev(A.zweitens, "whoosh", "Gehaltssäulen"); ev(A.zweitens + 1.0, "klick", "Gehaltssäule Tom"); ev(A.n300, "ding", "300 € Differenz");
  ev(A.merk, "whoosh", "Kamera gleitet zurück"); ev(A.lohnt, "ding", "Säulen leuchten"); M.melde({ t: A.spaeter, typ: "pointe", klang: "akzent", text: "Merksatz: Säulen leuchten auf" });
  ev(A.abstand, "whoosh", "Fahrt hinter die Ziellinie"); ev(T("ueberraschung:erst"), "klick", "Tor 65 glimmt auf"); ev(T("ueberraschung:nach"), "pop", "Bahn läuft weiter"); ev(A.iab, "klick", "Bahn bis 65: Tor 65 leuchtet"); ev(T("ueberraschung:rechnet"), "klick", "Bahn glimmt"); ev(T("ueberraschung:Arbeitsleben"), "ding", "Tor 65 leuchtet erneut"); ev(T("ueberraschung:durch"), "klick", "Kamera hebt sich"); ev(A.studium2, "ding", "Säule Studium wächst"); ev(A.ausb2, "ding", "Säule Ausbildung wächst");

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); }; // nur HUD (für qc/text_ueberlappung.mjs)
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
