// „Maut 2021 oder heute: Welche Familie zahlt beim Einkaufen mehr mit?“ · Stil 17 Nachtstadt-Miniatur (Autobahn mit Mautbrücken), Simulierbar 10.11.2026 mittag.
// Zwei gleiche Einkaufswagen (links Familie A 2021 in Blau, rechts Familie B heute in Orange) rollen eine nasse Nacht-Autobahn entlang und passen
// Mautbrücken, die den Stand des Jahres anzeigen. Wie weit ein Wagen vorn liegt, folgt seinem Zähler (mitgezahlte Maut im Jahr). Am Ende bremsen beide;
// die Warnlinie des Verbands (bis zu 400 € mehr) liegt noch vor Wagen B. Alle Zahlen kommen aus pipeline/sim/maut.mjs.
// Alles ist eine reine Funktion von t (window.renderAt(t)).
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, lichtKegel, staub, buendeln, aktualisiere, spiegelBoden, leuchtMat } from "../../engine/sim_atmosphaere.js";
import { gebaeude, strassenBoden, laterne, lichtSpur, skyline, himmelNacht, preisAnhaenger, rauchSaeule, energieFluss } from "../../engine/stil_nachtstadt.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/maut.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Wagen, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb.
const BLAU = "#3D8BFF";   // Familie A (2021)
const ORANGE = "#FF8A3D"; // Familie B (heute)
const AKZENT = "#ECE6DA";

// ---------- Rechnung (aus sim/maut.mjs) ----------
const Z = videoZahlen();
const FAM_A = Z.roh.famA, FAM_B = Z.roh.famB, FAM_24 = Z.roh.fam24;   // 367,31 / 641,92 / 2024-Zwischenstand
const WARN_ENDE = FAM_A + 400;                                         // Warnlinie: Familie A + 400 €
const de2 = (n) => n.toFixed(2).replace(".", ",");
const de1 = (n) => n.toFixed(1).replace(".", ",");

const glatt = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
const puls = (t, ein, dauer, auf = 0.25, ab = 0.45) => fortschritt(t, ein, ein + auf) * (1 - glatt(t, ein + dauer, ein + dauer + ab));

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

/** Einkaufswagen aus Leuchtgitter: Korb, Kanten, Räder, Griff, Waren (erscheinen mit dem Zähler); Fahrtrichtung −z */
function einkaufsWagen(farbe) {
  const g = new THREE.Group();
  const c = new THREE.Color(farbe);
  const flaeche = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, metalness: 0.6, roughness: 0.35, transparent: true, opacity: 0.4, depthWrite: false });
  const BW = 0.5, BH = 0.3, BL = 0.78, Y = 0.36;
  const korb = new THREE.Mesh(new THREE.BoxGeometry(BW, BH, BL), flaeche); korb.position.y = Y; g.add(korb);
  const kanten = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(BW, BH, BL)), new THREE.LineBasicMaterial({ color: c.clone().multiplyScalar(2.4) })); kanten.position.y = Y; g.add(kanten);
  const gitter = leuchtMat(farbe, 2.2, { neu: true });
  for (let i = 1; i < 5; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(BW * 0.98, 0.012, 0.012), gitter); s.position.set(0, Y - BH / 2 + i * BH / 5, BL / 2 * 0.995); g.add(s); const s2 = s.clone(); s2.position.z = -BL / 2 * 0.995; g.add(s2); }
  for (let i = 1; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, BL * 0.98), gitter); s.position.set(-BW / 2 * 0.995 + (i - 0.5) * BW / 6 * 1.0, Y + BH / 2, 0); g.add(s); }
  const rahmen = new THREE.MeshStandardMaterial({ color: "#2A313C", metalness: 0.8, roughness: 0.35 });
  const unter = new THREE.Mesh(new THREE.BoxGeometry(BW * 0.9, 0.03, BL * 0.9), rahmen); unter.position.y = 0.12; g.add(unter);
  for (const [x, z] of [[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.3], [0.2, -0.3]]) {
    const rad = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.035, 14), new THREE.MeshStandardMaterial({ color: "#0B0C10", roughness: 0.8 }));
    rad.rotation.z = Math.PI / 2; rad.position.set(x, 0.05, z); g.add(rad);
    const bein = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.02), rahmen); bein.position.set(x, 0.1, z); g.add(bein);
  }
  const griff = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.025, 0.025), gitter); griff.position.set(0, Y + BH / 2 + 0.16, BL / 2 + 0.1); g.add(griff);
  for (const x of [-BW / 2, BW / 2]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.19, 0.02), rahmen); st.position.set(x, Y + BH / 2 + 0.06, BL / 2 + 0.05); g.add(st); }
  // Waren: kleine Kisten in neutralen Tönen und Teamfarbe
  const warenFarben = ["#ECE6DA", farbe, "#9FB4D8", "#CFD6E2", farbe, "#ECE6DA", "#9FB4D8", farbe];
  const waren = warenFarben.map((f, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.1 + (i % 3) * 0.03, 0.14), new THREE.MeshStandardMaterial({ color: f, roughness: 0.5, emissive: f, emissiveIntensity: 0.25 }));
    m.position.set(-0.15 + (i % 3) * 0.15, Y - 0.1 + (m.geometry.parameters.height / 2), -0.26 + Math.floor(i / 3) * 0.2); m.visible = false; g.add(m); return m;
  });
  g.waren = (k) => waren.forEach((m, i) => { m.visible = k > (i + 0.5) / waren.length; });
  g.userData.dynamisch = true;
  return g;
}

/** Mautbrücke über der Fahrbahn: zwei Säulen, Balken, Leuchtleiste, Schild mit wechselbarem Text (text, glimm, led) */
function mautBruecke({ breite = 3.9, hoehe = 2.3 } = {}) {
  const g = new THREE.Group();
  const metall = new THREE.MeshStandardMaterial({ color: "#3F4A5C", roughness: 0.5, metalness: 0.5, emissive: "#141C2C", emissiveIntensity: 0.6, envMapIntensity: 1.4 });
  for (const x of [-breite / 2, breite / 2]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.16, hoehe, 0.16), metall); s.position.set(x, hoehe / 2, 0); s.castShadow = true; g.add(s); }
  const balken = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.3, 0.24, 0.22), metall); balken.position.y = hoehe; balken.castShadow = true; g.add(balken);
  const led = leuchtMat(AKZENT, 1, { neu: true });
  const leiste = new THREE.Mesh(new THREE.BoxGeometry(breite, 0.03, 0.04), led); leiste.position.set(0, hoehe - 0.2, 0.14); leiste.userData.dynamisch = true; g.add(leiste);
  for (let i = 0; i < 5; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.07), metall); k.position.set(-1.5 + i * 0.75, hoehe - 0.26, 0.14); g.add(k); }
  const schild = preisAnhaenger({ breite: 2.0, hoehe: 0.4, farbe: AKZENT });
  schild.position.set(0, hoehe - 0.55, 0.22);
  g.add(schild);
  const cE = new THREE.Color(AKZENT);
  g.text = (s) => schild.text(s);
  g.glimm = (k) => schild.glimm(k);
  g.led = (k) => led.color.copy(cE).multiplyScalar(0.5 + 2.4 * k);
  g.schild = schild;
  g.userData.dynamisch = true; g.traverse((o) => { o.userData.dynamisch = true; });
  return g;
}

/** Lkw (Zugmaschine + Aufbau), Fahrtrichtung −z; gross = Sattelzug, sonst kleiner Transporter */
function lkw({ gross = true } = {}) {
  const g = new THREE.Group();
  const lack = new THREE.MeshStandardMaterial({ color: gross ? "#39424F" : "#4A5565", roughness: 0.5, metalness: 0.5, envMapIntensity: 1.2 });
  const planen = new THREE.MeshStandardMaterial({ color: "#5B687C", roughness: 0.55, metalness: 0.3, emissive: "#1B2536", emissiveIntensity: 0.6 });
  const b = gross ? 0.54 : 0.4, h = gross ? 0.58 : 0.36, l = gross ? 1.7 : 0.62, cab = gross ? 0.42 : 0.3;
  const aufbau = new THREE.Mesh(new THREE.BoxGeometry(b, h, l), planen); aufbau.position.set(0, 0.12 + h / 2, l / 2 + cab / 2 + 0.02); aufbau.castShadow = true; g.add(aufbau);
  const kabine = new THREE.Mesh(new THREE.BoxGeometry(b * 0.94, h * 0.78, cab), lack); kabine.position.set(0, 0.12 + h * 0.39, 0); kabine.castShadow = true; g.add(kabine);
  const scheibe = new THREE.Mesh(new THREE.BoxGeometry(b * 0.8, h * 0.28, 0.02), new THREE.MeshStandardMaterial({ color: "#0B0F16", roughness: 0.1, metalness: 0.9 })); scheibe.position.set(0, 0.12 + h * 0.55, -cab / 2 - 0.005); g.add(scheibe);
  const scheinw = leuchtMat("#DCE8FF", 2.4);
  for (const x of [-b * 0.3, b * 0.3]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), scheinw); s.position.set(x, 0.2, -cab / 2 - 0.01); g.add(s); }
  const rueck = leuchtMat("#FF3B3B", 2.2);
  for (const x of [-b * 0.38, b * 0.38]) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.02), rueck); s.position.set(x, 0.22, l + cab / 2 + 0.03); g.add(s); }
  const streifen = leuchtMat(AKZENT, 2.6);
  const kontur = new THREE.LineSegments(new THREE.EdgesGeometry(aufbau.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color("#BFD0EE").multiplyScalar(1.8) })); kontur.position.copy(aufbau.position); g.add(kontur);
  const sl = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, l * 0.92), streifen); sl.position.set(-b / 2 - 0.005, 0.12 + h * 0.3, l / 2 + cab / 2); const sr = sl.clone(); sr.position.x = b / 2 + 0.005; g.add(sl, sr);
  const rad = new THREE.MeshStandardMaterial({ color: "#0A0B0D", roughness: 0.8 });
  const achsen = gross ? [0, 0.7, 1.15, 1.6] : [0, 0.6];
  for (const z of achsen) for (const x of [-b / 2 + 0.02, b / 2 - 0.02]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 14), rad); r.rotation.z = Math.PI / 2; r.position.set(x, 0.075, z + (z ? cab / 2 : 0)); g.add(r); }
  g.userData.dynamisch = true;
  g.rueckPunkt = [0, 0.12 + h + 0.02, l + cab / 2];
  return g;
}

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["800 40px 'SB Display'", "700 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "FAMILIE A", farbe: BLAU, woerter: ["A", "2021*", "einundzwanzig*", "367,31*", "damals*"] },
      b: { name: "FAMILIE B", farbe: ORANGE, woerter: ["B", "heute*", "641,92*", "274,61*", "sechshundertvierzig*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    hMaut: T("hook:Maut"), h2021: T("hook:2021"), hHeute: T("hook:heute"), hWelche: T("hook:Welche"), hMit: T("hook:mit"),
    rFam: T("regeln:Familie"), r2021: T("regeln:2021"), rB: T("regeln:B"), rHeute: T("regeln:heute"), rBeide: T("regeln:Beide"), rViert: T("regeln:viert"), rAnn: T("regeln:Annahme"), rJeder: T("regeln:Jeder"), rPreis: T("regeln:Preis"),
    fKlar: T("falle:Klar"), fCent: T("falle:Cent"), fEinkauf: T("falle:Einkauf"), fOder: T("falle:Oder"),
    nFam: T("rennen:Familie"), nZuerst: T("rennen:zuerst"), n2021: T("rennen:2021"), n764: T("rennen:7,64"), nMrd: T("rennen:Mrd"), nMaut: T("rennen:Maut"), nPro: T("rennen:Pro"), n9183: T("rennen:91,83"), nFam2: T("rennen:Familie#2"), n36731: T("rennen:367,31"), nJahr: T("rennen:Jahr"),
    w1Dann: T("wendung1:Dann"), w1Dez: T("wendung1:Dezember"), w1Auf: T("wendung1:Auf"), w1CO2: T("wendung1:CO2-Aufschlag"), w1200: T("wendung1:200"), w1Tonne: T("wendung1:Tonne"), w1Gross: T("wendung1:Großer"), w190: T("wendung1:19,0"), w1348: T("wendung1:34,8"), w1km: T("wendung1:km"),
    w2Juli: T("wendung2:Juli"), w2Jetzt: T("wendung2:Jetzt"), w2klein: T("wendung2:kleinere"), w2Schon: T("wendung2:Schon"), w235: T("wendung2:3,5"),
    w3Doch: T("wendung3:Doch"), w3Wirt: T("wendung3:Wirtschaft"), w3Weniger: T("wendung3:Weniger"), w32024: T("wendung3:2024"), w3Fehlen: T("wendung3:fehlen"), w3Plan: T("wendung3:Plan"), w3129: T("wendung3:12,96"), w3Abst: T("wendung3:Abstand"), w3Lang: T("wendung3:langsamer"),
    k2025: T("kipp:2025"), kEinn: T("kipp:Einnahmen"), k134: T("kipp:13,4"), kVerb: T("kipp:Lkw-Verband"), kWarnte: T("kipp:warnte"), k400: T("kipp:400"), kMehr: T("kipp:mehr"), kKommt: T("kipp:Kommt"), kSchlimm: T("kipp:schlimm"),
    eEnd: T("ergebnis:Endstand"), eFam: T("ergebnis:Familie"), e641: T("ergebnis:641,92"), e2025: T("ergebnis:2025"), e274: T("ergebnis:274,61"), eMehr: T("ergebnis:mehr"), eA: T("ergebnis:A"),
    wWarum: T("warum:Warum"), wCO2: T("warum:CO2-Aufschlag"), wUnd: T("warum:Und"), wLkw: T("warum:Lkw"),
    pWen: T("pointe:Weniger"), pBefu: T("pointe:befürchtet"), pUnd: T("pointe:Und"), pHaelfte: T("pointe:Hälfte"), pSchiene: T("pointe:Schiene"),
    sGut: T("schlusskarte:Gut"), sMehr: T("schlusskarte:mehr"), sJede: T("schlusskarte:jede"), sWoche: T("schlusskarte:Woche"),
  };

  // ---------- Zähler: mitgezahlte Maut je Familie und Jahr (€) ----------
  const R = (t, a, b, e = ease.inOutSine) => e(fortschritt(t, a, b));
  const zA = (t) => FAM_A * R(t, A.n36731 - 0.4, A.n36731 + 0.9, ease.outCubic);
  const zB = (t) => {
    let b = FAM_A * R(t, A.w1Dez - 0.1, A.w1Auf - 0.25, ease.inOutCubic);                  // B startet auf dem Stand von 2021
    b += (500 - FAM_A) * R(t, A.w1CO2, A.w1km + 0.3, ease.inOutSine);                       // CO2-Aufschlag
    b += (570 - 500) * R(t, A.w2Juli, A.w2Schon + 1.0, ease.inOutSine);                     // Mautpflicht ab 3,5 t
    b += (FAM_24 - 570) * R(t, A.w3Doch, A.w3Lang + 0.5, ease.inOutSine);                   // Konjunkturdelle: langsamer
    b += (FAM_B - FAM_24) * R(t, A.k2025, A.k134 + 0.9, ease.inOutSine);                   // 2025: 13,4 Mrd. €
    return b;
  };
  const stufe = (t) => (t < A.w1Dann - 0.05 ? 0 : t < A.w2Juli - 0.05 ? 1 : t < A.w3Doch - 0.05 ? 2 : t < A.k2025 - 0.05 ? 3 : 4);
  const SW = M.wert((t) => ({ a: zA(t), b: zB(t), gap: zB(t) - zA(t) }));

  // ---------- Fahrt: Ankerpunkt der Kamera entlang der Autobahn (−z), danach bremsen beide ----------
  const zc = pchip([[0, 0], [A.nFam, -9], [A.w1Dann, -22], [A.w2Juli, -36], [A.w3Doch, -47], [A.k2025, -60], [A.eEnd, -71], [A.eEnd + 3.5, -72.6], [DAUER, -72.9]]);
  const ZENDE = -72.9;
  const LM = 5.6, V0 = 1.4;                                // Vorsprung: Zähler 0 … Warnlinie ⇒ V0 … V0 − LM
  const lead = (c) => V0 - (c / WARN_ENDE) * LM;
  const ZLINIE = ZENDE + V0 - LM;                          // Warnlinie der 400 €: B bleibt davor stehen

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = himmelNacht();
  dunst(szene, "#121A28", 0.03);
  const rig = rigNacht(szene, buehne.renderer, { ziel: [0, 0, 0], bereich: 9, schatten: SCHATTEN, richtung: [-0.5, 0.9, 0.5], farbe: "#A9C4F2", staerke: 0.85, umgebungsStaerke: 0.8, himmelStaerke: 0.55 });
  const LAENGE = 140, KACHEL = 36;
  for (let k = 0; k * KACHEL < LAENGE + 20; k++) {
    const b = strassenBoden({ breite: KACHEL, tiefe: KACHEL, strassen: [{ x: 0, richtung: "z", breite: 3.2 }], aufloesung: 2048, seed: 4 });
    b.position.set(0, 0, 14 - KACHEL / 2 - k * KACHEL); szene.add(b);
  }
  szene.add(spiegelBoden({ breite: 8.4, tiefe: LAENGE + 30, staerke: 1.05, pfuetze: 0.5, streckung: 3.2, massstab: 0.35, aufloesung: 0.22 }).translateZ(-(LAENGE / 2 - 14)));
  const him = skyline({ anzahl: 46, radius: 34, bogen: [Math.PI * 1.02, Math.PI * 1.98], mitte: [0, 0] });
  him.userData.dynamisch = true; szene.add(him);

  // Mautbrücken (Stand des Jahres am Schild), Position = dort, wo die Wagen im Takt der Wörter darunter durchrollen
  const brueckenZ = [zc(A.nMrd + 1.0), zc(A.w1Gross + 0.6), zc(A.w2Schon + 0.4), zc(A.w3Plan + 0.4), zc(A.k134 + 0.9), ZENDE - 7.2];
  const bruecken = brueckenZ.map((z) => { const b = mautBruecke(); b.position.set(0, 0, z); szene.add(b); return b; });
  const freiZ = (z) => brueckenZ.some((bz) => Math.abs(z - bz) < 0.7);

  // Gleise neben der Autobahn (rechts): leuchten bei der Pointe (Hälfte der Maut fließt in die Schiene)
  const schieneMat = leuchtMat(AKZENT, 1, { neu: true });
  const cE = new THREE.Color(AKZENT);
  for (const x of [2.5, 2.9]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, LAENGE + 30), schieneMat); r.position.set(x, 0.03, -(LAENGE / 2 - 14)); r.userData.dynamisch = true; szene.add(r); }
  const schwelle = new THREE.MeshStandardMaterial({ color: "#2A2D33", roughness: 0.9 });
  for (let z = 10; z > -LAENGE - 12; z -= 0.8) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.03, 0.12), schwelle); s.position.set(2.7, 0.015, z); szene.add(s); }

  // Häuserzeilen beiderseits (Fassaden zur Fahrbahn)
  let n = 0;
  for (const seite of [-1, 1]) {
    for (let reihe = 0; reihe < 2; reihe++) {
      let z = 9;
      while (z > -LAENGE - 8) {
        const tt = 1.3 + hash(n, 3) * 1.4 + (reihe ? 0.5 : 0);
        const b = reihe ? 2.4 + hash(n, 7) * 1.4 : 1.5 + hash(n, 11) * 0.9;
        const h = reihe === 0 ? 0.9 + hash(n * 3 + 1, 5) * 1.3 : 2.6 + Math.pow(hash(n * 3 + 2, 5), 1.3) * 5.6;
        const xm = seite * ((seite > 0 ? 3.55 : 2.55) + (reihe ? 2.45 + b / 2 : b / 2));
        const zm = z - tt / 2;
        const g = gebaeude({ breite: b, hoehe: h, tiefe: tt - 0.08, seed: n * 2 + (seite > 0 ? 1 : 0), anteilAn: 0.42 + hash(n, 9) * 0.3, leuchten: 3, fassade: ["#2B313D", "#30343B", "#262C38", "#363A42"][n % 4], laden: false, warnlicht: h > 5.5, schatten: true });
        g.position.set(xm, 0, zm); szene.add(g);
        z -= tt + 0.05; n++;
      }
    }
  }
  for (let z = 6; z > -LAENGE - 6; z -= 3.4) {
    for (const s of [-1, 1]) {
      const zz = z + (s > 0 ? 1.7 : 0);
      if (freiZ(zz)) continue;
      const l = laterne({ hoehe: 1.45, arm: 0.34, pfuetze: 0.9, kegel: 0.12 });
      l.position.set(s * 1.95, 0, zz);
      l.rotation.y = s > 0 ? Math.PI : 0;
      szene.add(l);
    }
  }

  // Wagen, Lichtspuren, Spots
  const XA = -0.75, XB = 0.75;
  const kurveA = new THREE.CatmullRomCurve3([new THREE.Vector3(XA, 0, 14), new THREE.Vector3(XA, 0, -LAENGE - 10)]);
  const kurveB = new THREE.CatmullRomCurve3([new THREE.Vector3(XB, 0, 14), new THREE.Vector3(XB, 0, -LAENGE - 10)]);
  const spurA = lichtSpur(kurveA, { farbe: BLAU, staerke: 4.2, breite: 0.06, segmente: 400 });
  const spurB = lichtSpur(kurveB, { farbe: ORANGE, staerke: 4.2, breite: 0.06, segmente: 400 });
  const wagenA = einkaufsWagen(BLAU), wagenB = einkaufsWagen(ORANGE);
  [spurA, spurB].forEach((o) => { o.userData.dynamisch = true; });
  szene.add(spurA, spurB, wagenA, wagenB);
  const lichtA = new THREE.PointLight(BLAU, 0, 0, 2), lichtB = new THREE.PointLight(ORANGE, 0, 0, 2);
  szene.add(lichtA, lichtB);
  const kegel = (f) => { const k = lichtKegel({ hoehe: 3.2, radiusOben: 0.08, radiusUnten: 0.85, farbe: f, staerke: 0.4, streifen: 0.25 }); k.material = k.material.clone(); k.userData.dynamisch = true; return k; };
  const kegelA = kegel(BLAU), kegelB = kegel(ORANGE);
  szene.add(kegelA, kegelB);
  const nebel = staub({ anzahl: 700, bereich: [9, 5, 12], mitte: [0, 2.2, 0], farbe: "#9FB4D8", groesse: 0.03, staerke: 1.0, aussen: 1, tempo: -0.08, seed: 11 });
  nebel.userData.dynamisch = true; szene.add(nebel);

  // Lkw: großer Sattelzug (Wendung 1), kleinere Transporter (Wendung 2), danach dünnt der Verkehr aus (Wendung 3)
  const lkwGross = lkw({ gross: true });
  const lkwKlein = [lkw({ gross: false }), lkw({ gross: false }), lkw({ gross: false })];
  const rauch = rauchSaeule({ anzahl: 16, hoehe: 1.1, farbe: "#8C97A8", seed: 8, drift: 0.2 });
  szene.add(lkwGross, ...lkwKlein, rauch);
  lkwGross.rotation.y = 0; lkwKlein.forEach((k) => { k.rotation.y = 0; });
  // Geldstrom der Pointe: halb auf die Fahrbahn, halb auf das Gleis
  const bz = brueckenZ[5];
  const stromStr = energieFluss({ punkte: [[0, 1.7, bz + 0.2], [-0.4, 0.9, bz - 1.4], [-0.75, 0.2, bz - 3.6]], farbe: BLAU, radius: 0.03, wuerfel: 8, groesse: 0.07, staerke: 2.4 });
  const stromGleis = energieFluss({ punkte: [[0, 1.7, bz + 0.2], [1.4, 1.0, bz - 1.2], [2.7, 0.15, bz - 3.4]], farbe: ORANGE, radius: 0.03, wuerfel: 8, groesse: 0.07, staerke: 2.4 });
  szene.add(stromStr, stromGleis);
  // Warnlinie der 400 €: gestrichelt quer über die Fahrbahn
  const warnMat = leuchtMat(AKZENT, 1, { neu: true });
  const warnGruppe = new THREE.Group();
  for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.05), warnMat); d.position.set(-1.45 + i * 0.3625, 0.02, 0); d.userData.dynamisch = true; warnGruppe.add(d); }
  warnGruppe.position.z = ZLINIE; szene.add(warnGruppe);
  const statistik = buendeln(szene);
  if (Q.has("statistik")) console.warn("buendeln", JSON.stringify(statistik));

  // ---------- Kamera: relativ zum Ankerpunkt auf der Autobahn ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 220);
  const sh = (t, pos, ziel, fov = 36) => ({ t, pos, ziel, fov });
  const SH = [
    sh(0, [0.0, 3.3, 6.6], [0.0, 0.3, -2.2], 36),
    sh(A.h2021, [-0.9, 2.2, 4.6], [-0.4, 0.4, -1.0], 36),
    sh(A.hHeute, [0.9, 2.2, 4.6], [0.4, 0.4, -1.0], 36),
    sh(A.hWelche, [0.0, 3.1, 6.2], [0.0, 0.3, -1.6], 36),
    sh(A.rFam + 0.1, [-1.7, 1.4, 3.2], [-0.75, 0.45, 0.0], 35),     // Familie A
    sh(A.rB - 0.1, [1.7, 1.4, 3.2], [0.75, 0.45, 0.0], 35),         // Familie B
    sh(A.rBeide, [0.0, 3.0, 6.0], [0.0, 0.3, -1.2], 36),
    sh(A.rAnn, [0.0, 2.0, 4.0], [0.0, 0.4, -0.8], 35),
    sh(A.fKlar - 0.1, [0.0, 1.5, 3.4], [0.0, 0.4, -0.4], 34),       // Denkfalle: ruhig, nah
    sh(A.fOder + 0.2, [0.4, 2.5, 5.0], [0.0, 0.3, -0.8], 35),
    sh(A.nFam, [-0.8, 1.2, 3.2], [-0.8, 0.5, -1.0], 37),            // Rennen: Familie A zuerst
    sh(A.nMrd, [0.0, 2.6, 5.4], [0.0, 1.5, -2.5], 36),             // Brücke zählt Milliarden
    sh(A.nPro, [-0.6, 1.5, 3.8], [-0.5, 0.6, -1.4], 36),
    sh(A.nFam2, [-1.3, 1.3, 2.8], [-0.75, 0.5, -0.6], 34),
    sh(A.w1Dann, [0.3, 3.4, 6.2], [0.1, 0.3, -2.0], 36),            // Dezember 2023: Kalender springt
    sh(A.w1Dez + 0.8, [1.0, 1.7, 3.6], [0.75, 0.5, -0.6], 35),     // B holt auf
    sh(A.w1CO2 - 0.2, [0.4, 2.3, 4.8], [0.0, 0.9, -2.8], 36),      // Lkw mit CO2-Wolke
    sh(A.w1Gross, [0.0, 1.9, 4.0], [0.0, 0.9, -3.0], 35),
    sh(A.w190, [0.0, 2.7, 5.4], [0.0, 1.5, -3.6], 35),             // Tarifanzeige auf der Brücke
    sh(A.w2Juli, [-0.4, 3.2, 5.8], [0.0, 0.5, -2.0], 36),          // Juli 2024
    sh(A.w2Jetzt, [1.1, 1.6, 3.8], [0.4, 0.5, -2.6], 35),          // kleinere Lkw rollen durch
    sh(A.w2Schon, [0.0, 2.6, 5.0], [0.0, 1.3, -3.0], 35),
    sh(A.w3Doch, [-0.6, 2.8, 5.8], [-0.2, 0.5, -1.4], 36),          // Konjunktur: Verkehr dünnt aus
    sh(A.w3Weniger, [0.8, 1.4, 3.2], [0.6, 0.5, -1.0], 34),
    sh(A.w32024 + 0.3, [0.0, 2.4, 5.0], [0.0, 1.3, -3.2], 35),
    sh(A.w3Abst, [0.9, 1.3, 2.9], [0.75, 0.5, -0.4], 33),
    sh(A.k2025 - 0.1, [0.0, 3.0, 6.0], [0.0, 0.4, -2.4], 36),       // Kipp: 2025, Warnlinie voraus
    sh(A.kVerb, [0.0, 1.8, 4.2], [0.0, 0.3, -3.6], 35),
    sh(A.k400, [0.5, 1.2, 3.0], [0.2, 0.2, -3.8], 33),             // Warnlinie ganz nah
    sh(A.kKommt, [0.0, 1.5, 3.4], [0.0, 0.3, -3.0], 32),
    sh(A.eEnd + 0.3, [0.0, 3.4, 6.8], [0.0, 0.2, -2.2], 36),       // Endstand: Totale, beide halten
    sh(A.e274 + 0.4, [1.0, 1.7, 3.6], [0.5, 0.4, -1.4], 35),
    sh(A.wWarum, [0.0, 3.0, 5.6], [0.0, 0.4, -2.0], 36),
    sh(A.wUnd + 0.4, [0.0, 2.3, 4.8], [0.0, 0.5, -2.8], 36),
    sh(A.pWen, [0.0, 2.2, 5.0], [0.0, 1.0, -5.0], 36),             // Pointe: zur Brücke mit dem Geldstrom
    sh(A.pHaelfte - 0.2, [1.0, 1.6, 3.6], [0.7, 0.6, -6.0], 35),
    sh(A.sGut - 0.3, [0.0, 3.2, 6.6], [0.0, 0.3, -3.0], 36),
    sh(DAUER, [0.0, 3.6, 7.4], [0.0, 0.3, -3.4], 37),
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
  regie.zoom({ t: A.w1CO2, ziel: (t) => [0, 0.9, zc(t) - 4.5], staerke: 0.2, halt: 1.2, rueck: 0.6 });
  regie.zoom({ t: A.w2Schon, ziel: (t) => [0, 0.5, zc(t) - 5], staerke: 0.18, halt: 1.2, rueck: 0.6 });
  regie.zoom({ t: A.k400, ziel: (t) => [0.4, 0.3, ZLINIE], staerke: 0.24, halt: 1.2, rueck: 0.7 });
  regie.zoom({ t: A.e274, ziel: (t) => [0.75, 0.4, zc(t) + lead(FAM_B)], staerke: 0.18, halt: 1.2, rueck: 0.7 });

  // ---------- Zustand auf die Welt anwenden ----------
  const post = { ...GRADING.nacht, belichtung: 1.2, bloomStaerke: 0.9, bloomSchwelle: 1.0, tiltMitte: 0.5, tiltBreite: 0.34, tiltStaerke: 0.5, vignette: 0.36, strahlen: 0.14, strahlenSchwelle: 1.3, strahlenLaenge: 0.7, strahlenAbfall: 0.96, strahlenFarbe: [1, 0.85, 0.7], strahlenPunkt: [0, 6, -6] };
  const moon = rig.mond;
  const bis = (x, a, b) => clamp((x - a) / (b - a));
  const tmp = new THREE.Vector3();
  const nummern = (t, a, b, v0, v1, f) => f(lerp(v0, v1, ease.inOutSine(fortschritt(t, a, b))));
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t), z0 = zc(t);
      const zWA = z0 + lead(s.a), zWB = z0 + lead(s.b);
      wagenA.position.set(XA, 0, zWA); wagenB.position.set(XB, 0, zWB);
      wagenA.waren(s.a / FAM_A * 1.0); wagenB.waren(s.b / FAM_B);
      spurA.setze(clamp((14 - zWA) / (LAENGE + 24)), 0.05); spurB.setze(clamp((14 - zWB) / (LAENGE + 24)), 0.05);
      // Spot-Wechsel: der Führende leuchtet, dazu Hook, Denkfalle, Kipp
      const lB = 0.35 + 0.7 * bis(s.gap, 0, 150) + 0.7 * puls(t, A.h2021 + 0.0, 1.0) * 0 + 0.7 * puls(t, A.hHeute, 1.2) + 0.7 * puls(t, A.w1CO2, 1.6) + 0.6 * puls(t, A.e641, 1.8);
      const lA = 0.35 + 0.7 * bis(-s.gap, 0, 300) + 0.7 * puls(t, A.h2021, 1.2) + 0.7 * puls(t, A.n36731, 1.4) + 0.5 * puls(t, A.eA, 1.6);
      lichtB.intensity = 7 * Math.min(1.6, lB); lichtA.intensity = 7 * Math.min(1.6, lA);
      lichtB.position.set(XB, 1.6, zWB); lichtA.position.set(XA, 1.6, zWA);
      kegelB.visible = lB > 0.45; kegelA.visible = lA > 0.45;
      kegelB.material.uniforms.staerke.value = 0.34 * Math.min(1.4, lB); kegelA.material.uniforms.staerke.value = 0.34 * Math.min(1.4, lA);
      kegelB.position.set(XB, 3.2, zWB); kegelA.position.set(XA, 3.2, zWA);
      // Mautbrücken: Schilder
      bruecken.forEach((b, i) => { const d = z0 - brueckenZ[i]; const auf = clamp((11.0 - d) / 1.6), ab = clamp(1 - (-d - 1.2) / 1.0); const k = Math.min(ease.outCubic(auf), ab); b.scale.set(1, Math.max(0.001, k), 1); b.visible = k > 0.01 && !(Q.has("ohnebr") && +Q.get("ohnebr") !== i + 1 && +Q.get("ohnebr") !== 0); });
      const [b1, b2, b3, b4, b5, b6] = bruecken;
      b1.text(t < A.n764 - 0.1 ? "MAUT 2021" : `${de2(7.64 * R(t, A.n764 - 0.05, A.nMrd + 0.5, ease.outCubic))} Mrd. €`);
      b2.text(t < A.w190 - 0.2 ? "CO2-MAUT" : `${de1(lerp(19.0, 34.8, R(t, A.w190 + 0.1, A.w1348 + 0.35, ease.inOutSine)))} ct/km`);
      b3.text("ab 3,5 t");
      b4.text(t < A.w3129 - 0.1 ? "PLAN 15 Mrd. €" : "IST 12,96 Mrd. €");
      b5.text(t < A.k134 - 0.1 ? "2025" : "13,4 Mrd. €");
      b6.text(t < A.pHaelfte - 0.2 ? "EINNAHMEN" : "ZUR SCHIENE");
      const brGlimm = [puls(t, A.nMrd, 1.6) + puls(t, A.n764, 1.0), puls(t, A.w190, 1.6) + puls(t, A.w1CO2, 1.0), puls(t, A.w2Schon, 1.6) + puls(t, A.w2klein, 1.0), puls(t, A.w3Plan, 1.4) + puls(t, A.w3129, 1.2), puls(t, A.k134, 1.8) + puls(t, A.k2025, 1.0), puls(t, A.pWen, 1.6) + puls(t, A.pHaelfte, 1.6)];
      bruecken.forEach((b, i) => { b.glimm(Math.min(1.4, brGlimm[i])); b.led(Math.min(1.5, brGlimm[i])); });
      // Lkw
      const aGross = glatt(t, A.w1Gross - 1.6, A.w1Gross - 0.9) * (1 - glatt(t, A.w2Juli - 0.4, A.w2Juli + 0.5));
      lkwGross.visible = aGross > 0.01; lkwGross.scale.setScalar(Math.max(0.01, aGross));
      lkwGross.position.set(0, 0, z0 - 5.4);
      const rp = lkwGross.rueckPunkt;
      rauch.visible = lkwGross.visible; rauch.position.set(0, rp[1], z0 - 5.4 + rp[2] * aGross);
      rauch.lauf(t, 0.15 + 0.85 * glatt(t, A.w1CO2 - 0.3, A.w1200 + 0.6) * aGross);
      lkwKlein.forEach((k, i) => {
        const dichte = glatt(t, A.w2klein - 0.6 + i * 0.3, A.w2klein + 0.1 + i * 0.3) * (1 - glatt(t, A.w3Weniger - 0.1 + i * 0.8, A.w3Weniger + 0.6 + i * 0.8));
        k.visible = dichte > 0.01; k.scale.setScalar(Math.max(0.01, dichte));
        k.position.set(0, 0, z0 - 4.6 - i * 3.3);
      });
      // Warnlinie und Geldstrom
      const wl = glatt(t, A.k2025 - 0.2, A.k2025 + 1.0) * 1.0;
      warnGruppe.visible = wl > 0.02; warnMat.color.copy(cE).multiplyScalar(0.6 + 2.8 * wl + 1.6 * puls(t, A.k400, 1.6) + 1.4 * puls(t, A.kKommt, 1.4) + 1.6 * puls(t, A.e274, 1.6));
      const ps = glatt(t, A.pWen - 0.1, A.pWen + 0.6);
      stromStr.setze(ps); stromGleis.setze(ps); stromStr.lauf(t, 0.5); stromGleis.lauf(t, 0.5);
      schieneMat.color.copy(cE).multiplyScalar(0.7 + 3.0 * glatt(t, A.pHaelfte - 0.2, A.pHaelfte + 0.5) + 0.5 * puls(t, A.pSchiene, 1.2));
      // Himmel und Luft folgen den Wagen
      him.position.set(0, 0, z0); nebel.position.set(0, 0, z0 - 1);
      moon.target.position.set(0, 0, z0 - 1); moon.position.set(-2.5, 6.5, z0 + 3); moon.target.updateMatrixWorld();
      // Nachbearbeitung: Strahlen und Glow steigen bis zum Kipp-Moment, danach Sieger-Glow
      const spann = bis(t, A.w1CO2, A.k400);
      post.bloomStaerke = 0.9 + 0.2 * spann + 0.3 * puls(t, A.k400, 1.6) + 0.2 * puls(t, A.e274, 1.6);
      post.strahlen = 0.12 + 0.34 * spann * (1 - bis(t, A.eEnd + 1.0, A.wWarum)) + 0.15 * puls(t, A.k400, 1.8) + 0.18 * puls(t, A.pHaelfte, 1.8);
      tmp.set(lerp(0.75, -0.75, clamp(0.5 - Math.sign(s.gap) * 0.5)), 1.2, zWB - 6); post.strahlenPunkt = [tmp.x, tmp.y, tmp.z];
      post.splitBalance = 0.02 + 0.2 * clamp(s.gap / 300, -1, 1);
      post.belichtung = 1.2 - 0.34 * bis(t, A.sGut - 0.2, A.sGut + 0.9) + 0.06 * puls(t, A.k400, 1.4);
      regie.anwenden(t);
    },
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 2, max: 9999 }, rechts: { team: "b", einheit: "€", nk: 2, max: 9999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: s.a, b: s.b }; },
    uhr: { ein: 0.05, zeit: (t) => stufe(t), format: (v) => ["2021", "2023", "2024", "2024", "2025"][Math.round(v)] || "2025", label: "JAHR" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.1) => x - d;
  // Statuszeile (mitlaufend): Jahr und Etappe
  chip("DER BUND NIMMT MAUT EIN", 0.05, A.nFam - 0.4, "akzent", "hell");
  chip("JAHR 2021 · FAMILIE A", A.nFam - 0.05, A.w1Dann - 0.3, "akzent", "voll");
  chip("DEZ. 2023 · CO2-AUFSCHLAG", A.w1Dann - 0.05, A.w2Juli - 0.3, "akzent", "voll");
  chip("JULI 2024 · AB 3,5 TONNEN", A.w2Juli - 0.05, A.w3Doch - 0.3, "akzent", "voll");
  chip("2024 · WIRTSCHAFT SCHWÄCHELT", A.w3Doch - 0.05, A.k2025 - 0.3, "akzent", "voll");
  chip("2025 · EINNAHMEN STEIGEN", A.k2025 - 0.05, A.eEnd - 0.2, "akzent", "voll");
  // Regeln
  chip("FAMILIE A · 2021", v(A.rFam, 0.05), v(A.fKlar), "a", "voll", 490);
  chip("FAMILIE B · HEUTE", v(A.rB, 0.05), v(A.fKlar), "b", "voll", 590);
  chip("BEIDE ZU VIERT", v(A.rBeide), v(A.fKlar), "akzent", "hell", 710);
  chip("ANNAHME: JEDER MAUT-EURO IM PREIS", v(A.rAnn), v(A.fOder, 0.0), "akzent", "hell", 830);
  // Denkfalle
  chip("EIN PAAR CENT PRO EINKAUF?", v(A.fCent), v(A.nFam, 0.3), "akzent", "voll", 490);
  // Rennen: Familie A
  M.zaehler({ wert: (t) => 7.64 * R(t, A.n764 - 0.05, A.nMrd + 0.5, ease.outCubic), einheit: " Mrd. €", nk: 2, max: 99, team: "akzent", art: "voll", label: "BUND NIMMT EIN", x: SICHER.mitte, y: 790, ein: v(A.n764), aus: v(A.nPro, 0.1), anker: "mitte" });
  M.zaehler({ wert: (t) => Z.kopfA * R(t, A.n9183 - 0.05, A.n9183 + 0.9, ease.outCubic), einheit: " €", nk: 2, max: 999, team: "a", art: "voll", label: "PRO KOPF", x: SICHER.mitte, y: 790, ein: v(A.n9183), aus: v(A.nFam2, 0.1), anker: "mitte" });
  chip("÷ 83,2 MIO. EINWOHNER", v(A.nPro), v(A.nFam2, 0.35), "akzent", "hell", 490);
  chip("× 4 PERSONEN = FAMILIE A", v(A.nFam2), v(A.w1Dann, 0.3), "a", "voll", 490);
  // Wendung 1: CO2-Aufschlag
  chip("B STARTET AUF DEM STAND VON 2021", v(A.w1Dez), v(A.w1Auf, 0.0), "b", "hell", 490);
  chip("200 € JE TONNE CO2", v(A.w1200), v(A.w1Gross, 0.3), "akzent", "voll", 490);
  M.zaehler({ wert: (t) => lerp(19.0, 34.8, R(t, A.w190 + 0.1, A.w1348 + 0.35, ease.inOutSine)), einheit: " ct/km", nk: 1, max: 99, team: "akzent", art: "voll", label: "GROSSER LKW", x: SICHER.mitte, y: 590, ein: v(A.w1Gross), aus: v(A.w2Juli, 0.2), anker: "mitte" });
  const vorsB = (t) => Math.max(0, SW(t).b - SW(t).a);
  M.zaehler({ wert: vorsB, einheit: " €", nk: 2, max: 999, team: "b", art: "voll", label: "B ZAHLT MEHR", x: SICHER.mitte, y: 790, ein: v(A.w1CO2, 0.0), aus: v(A.eEnd, 0.2), anker: "mitte" });
  // Wendung 2
  chip("MAUTPFLICHT SCHON AB 3,5 t", v(A.w2Jetzt), v(A.w3Doch, 0.2), "akzent", "voll", 490);
  chip("VORHER NUR AB 7,5 t", v(A.w235, 0.0), v(A.w3Doch, 0.2), "akzent", "hell", 590);
  // Wendung 3
  chip("WENIGER FAHRTEN", v(A.w3Weniger), v(A.w32024, 0.35), "akzent", "voll", 490);
  chip("PLAN 2024 · 15 MRD. €", v(A.w32024, 0.0), v(A.k2025, 0.2), "akzent", "hell", 490);
  chip("IST · 12,96 MRD. €", v(A.w3129), v(A.k2025, 0.2), "b", "voll", 590);
  chip("LÜCKE · 2 MRD. €", v(A.w3Fehlen, 0.0), v(A.w3129, 0.35), "akzent", "voll", 590);
  // Kipp
  chip("2025 · 13,4 MRD. €", v(A.k134), v(A.kVerb, 0.1), "b", "voll", 490);
  chip("WARNUNG 2023 · BIS ZU 400 € MEHR", v(A.kWarnte, 0.0), v(A.eEnd, 0.2), "akzent", "voll", 490);
  chip("KOMMT ES SO SCHLIMM?", v(A.kKommt), v(A.eEnd, 0.2), "akzent", "hell", 590);
  // Endstand: Karte mit exakten Euro-Werten, Erklärgrafik „Warum?“
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "MAUT-ANTEIL PRO FAMILIE UND JAHR", ein: A.eEnd + 0.25, aus: A.wWarum - 0.1,
    zeilen: [{ label: "FAMILIE B · HEUTE", wert: FAM_B, nk: 2, einheit: "€", team: "b", ein: A.e641 - 0.2 }, { label: "FAMILIE A · 2021", wert: FAM_A, nk: 2, einheit: "€", team: "a", ein: A.eA - 0.1 }],
    differenz: { label: "B ZAHLT MEHR", wert: Z.differenz, nk: 2, einheit: "€", ein: A.e274 - 0.1 } });
  chip("BLEIBT UNTER DER WARNLINIE", v(A.eMehr), v(A.wWarum, 0.1), "akzent", "voll", 980);
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.wWarum + 0.3, aus: A.pWen - 0.4, max: 40,
    faktoren: [
      { label: "CO2-AUFSCHLAG · MAUTSATZ GROSSER LKW (CT/KM)", ein: A.wCO2 - 0.1, a: { wert: 19.0, text: "19,0" }, b: { wert: 34.8, text: "34,8" }, tag: `+ ${de1(Z.satzPlus)} %`, tagEin: A.wCO2 + 0.6 },
      { label: "MEHR ZAHLENDE LKW · MAUTPFLICHT AB (TONNEN)", ein: A.wLkw - 0.7, a: { wert: 7.5, text: "7,5" }, b: { wert: 3.5, text: "3,5" }, tag: "GRENZE SINKT", tagEin: A.wLkw },
    ] });
  // Pointe
  chip("WENIGER ALS BEFÜRCHTET", v(A.pWen), v(A.pHaelfte, 0.3), "akzent", "voll", 490);
  chip("FAST DIE HÄLFTE → SCHIENE", v(A.pHaelfte), v(A.sGut, 0.2), "b", "voll", 490);
  M.titel({ woerter: [{ text: "2021", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "HEUTE", ein: -0.3, team: "b" }, { umbruch: true }, { text: "LKW-MAUT", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "WELCHE FAMILIE ZAHLT MEHR?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: A.rFam - 0.55 });
  M.pointe({ woerter: [{ text: "GUT 5 € MEHR", ein: A.sGut, farbe: "b" }, { umbruch: true }, { text: "JEDE WOCHE.", ein: A.sJede, farbe: "akzent" }, { umbruch: true }, { text: "12,34 € STATT 7,06 €", ein: A.sWoche + 0.15, farbe: "akzent" }], ein: A.sGut, y: 470, groesse: 88 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "pop", "Wagen rollen an, Scheinwerfer der Laternen, Lichtspuren hinter beiden Wagen"); ev(1.4, "klick", "Kamera schiebt sich heran, Laternen ziehen vorbei"); ev(A.h2021, "ding", "Wagen A leuchtet blau auf"); ev(A.hHeute, "ding", "Wagen B leuchtet orange auf"); ev(A.hWelche, "klick", "Kamera weitet, Titel läuft");
  ev(A.rFam, "whoosh", "Kamera auf Familie A, Titel blendet aus"); ev(A.rB, "ding", "Kamera auf Familie B, Chip heute"); ev(A.rBeide, "klick", "Kamera hebt sich, beide Wagen im Bild"); ev(A.rAnn, "klick", "Kamera gleitet heran, Chip Annahme");
  ev(A.fKlar, "whoosh", "Lichtkegel auf die Wagen, Kamera ruhig und nah"); ev(A.fCent, "ding", "Chip ein paar Cent"); ev(A.fOder, "klick", "Licht hält, Kamera weitet");
  ev(A.nFam, "whoosh", "Wagen A zieht an, Kamera folgt"); ev(A.n764, "ding", "Mautbrücke zählt Milliarden, Schild leuchtet"); ev(A.nPro, "klick", "Kamera gleitet zu Wagen A, Chip pro Kopf"); ev(A.n9183, "ding", "Zähler pro Kopf läuft auf 91,83 €"); ev(A.n36731, "ding", "Zähler Familie A läuft auf 367,31 €, Wagen A rollt vor");
  ev(A.w1Dann, "whoosh", "Kamera hoch, Dezember 2023, Statuszeile springt"); ev(A.w1Dez, "ding", "Wagen B holt auf, Zähler läuft"); ev(A.w1CO2, "whoosh", "Großer Lkw mit CO2-Wolke rollt ein, Zoom"); ev(A.w190, "ding", "Brücke zeigt Tarif 19,0 → 34,8 ct/km"); ev(A.w1348, "ding", "Tarif steht bei 34,8 ct/km");
  ev(A.w2Juli, "whoosh", "Juli 2024, Kamera hoch, Statuszeile springt"); ev(A.w2klein, "ding", "Kleinere Lkw rollen durch die Mautbrücke"); ev(A.w2Schon, "ding", "Brücke zeigt ab 3,5 t, Zoom");
  ev(A.w3Doch, "whoosh", "Verkehr dünnt aus, Zähler B verlangsamt"); ev(A.w3Weniger, "klick", "Lkw verschwinden, Chip weniger Fahrten"); ev(A.w3Plan, "ding", "Brücke zeigt Plan 15 Mrd. €"); ev(A.w3129, "ding", "Brücke zeigt Ist 12,96 Mrd. €, Lücke"); ev(A.w3Abst, "klick", "Kamera nah an Wagen B, Abstand wächst langsamer");
  ev(A.k2025, "whoosh", "2025: Brücke zeigt 13,4 Mrd. €, Warnlinie leuchtet auf"); ev(A.kVerb, "klick", "Kamera auf die Warnlinie"); ev(A.k400, "ding", "Warnung 400 € leuchtet, Zoom"); ev(A.kKommt, "klick", "Wagen B nähert sich der Warnlinie");
  ev(A.eEnd, "whoosh", "Beide Wagen bremsen, Kamera zurück, Endstand-Karte"); ev(A.e641, "ding", "Wagen B bleibt bei 641,92 € stehen"); ev(A.e274, "ding", "B zahlt 274,61 € mehr, Zoom, Warnlinie leuchtet");
  ev(A.wWarum, "whoosh", "Erklärgrafik Warum"); ev(A.wCO2, "ding", "Balken Mautsatz 19,0 gegen 34,8"); ev(A.wLkw, "ding", "Balken Mautpflicht 7,5 gegen 3,5 Tonnen");
  ev(A.pWen, "whoosh", "Kamera zur Brücke, Geldstrom teilt sich"); ev(A.pHaelfte, "ding", "Gleis leuchtet, Hälfte fließt in die Schiene");
  ev(A.sGut, "akzent", "Welt dunkelt ab, Schlusskarte: Gut 5 € mehr"); ev(A.sJede, "klick", "Zeile jede Woche erscheint"); ev(A.sWoche + 0.15, "akzent", "Zeile 12,34 € statt 7,06 € leuchtet");
  // Lücken schließen (Kamera fährt, Laternen und Lichtspuren ziehen vorbei)
  const sortiert = []; M.extra.forEach((e) => sortiert.push(e.t)); sortiert.sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Laternen und Lichtspuren ziehen vorbei"); }
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
