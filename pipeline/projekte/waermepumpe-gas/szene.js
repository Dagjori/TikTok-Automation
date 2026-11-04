// „Wärmepumpe oder neue Gasheizung: Was kostet dich in 20 Jahren mehr?“ · Stil 17 Nachtstadt-Miniatur (Winternacht), Simulierbar 04.11.2026 abend.
// Zwei gleiche Einfamilienhäuser auf Miniatur-Platten im Schnee zur blauen Stunde: links Gas (Rot-Orange), rechts Wärmepumpe (Blau).
// Heizraum-Einblick (alter Kessel mit Flamme, Typenschild 2006), neue Gasheizung, Wärmepumpen-Außeneinheit mit drehendem Lüfter, Kostensäulen
// zwischen den Häusern (Höhe = Gesamtkosten), Kostenströme (dick = Gas, dünn = Wärmepumpe), Förderstapel, Bio-Treppe über dem Gashaus.
// Alle Zahlen kommen aus pipeline/sim/waermepumpe_gas.mjs; das Jahr läuft als Zeitraffer an den gesprochenen Zwischenständen entlang.
// Alles ist eine reine Funktion von t (window.renderAt(t)).
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, lichtKegel, staub, buendeln, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { schneePlatte, einfamilienhaus, gasKessel, waermepumpeAussen, speicherTank, kostenSaeule, foerderStapel, bioTreppe, energieFluss, preisAnhaenger, rauchSaeule, abstandsAnzeige, winterBaum, laterne } from "../../engine/stil_nachtstadt.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { verlauf } from "../../engine/licht.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { P, gasJahr, wpJahr, gasSumme, wpSumme, abstand } from "../../sim/waermepumpe_gas.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Welt, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const GAS = "#FF5A1F";
const WP = "#2F8CFF";
const AKZENT = "#ECE6DA";

// ---------- Rechnung (aus sim/waermepumpe_gas.mjs) ----------
const GJ = gasJahr(), WJ = wpJahr(), FOERD = P.foerderQuote * Math.min(P.wpInvest, P.foerderMax); // 2.019,17 · 1.263,20 · 12.880
const GLEICH = (wpSumme(0) - gasSumme(0)) / (GJ - WJ); // 16,03 Jahre
const SK = 2.6 / gasSumme(20); // Säulenhöhe je Euro (Höhe 2,6 bei 50.383 €)

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
/** kurzer weicher Puls: steigt ab `ein` in 0,25 s, hält `dauer`, fällt ab */
const puls = (t, ein, dauer, auf = 0.25, ab = 0.45) => fortschritt(t, ein, ein + auf) * (1 - glatt(t, ein + dauer, ein + dauer + ab));
const noise = (t, s) => 0.5 + 0.3 * Math.sin(t * 9.1 + s) + 0.2 * Math.sin(t * 23.7 + 1.3 * s) * (0.6 + 0.4 * Math.sin(t * 3.3 + s));

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
      a: { name: "GAS", farbe: GAS, woerter: ["Gas*", "Gasheizung*", "Kauf"] },
      b: { name: "WÄRMEPUMPE", farbe: WP, woerter: ["Wärmepumpe*", "Förderung*", "Jahre"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    alt: T("hook:alt"), neue: T("hook:Neue"), wpH: T("hook:Wärmepumpe"),
    wir: T("regeln:Wir"), z20: T("regeln:20"), gasR: T("regeln:Gasheizung"), g10: T("regeln:10.000"), wpR: T("regeln:Wärmepumpe"), w35: T("regeln:35.000"),
    staat: T("regeln:Staat"), f12880: T("regeln:12.880"), dazu: T("regeln:dazu"),
    klar: T("falle:Klar"), gasF: T("falle:Gas"), oder: T("falle:Oder"),
    wpRen: T("rennen:Wärmepumpe"), z12120: T("rennen:12.120"), hinten: T("rennen:hinten"),
    folg: T("folgen:Folg"), verpasst: T("folgen:verpasst"),
    aber: T("wendung1:Aber"), gasW: T("wendung1:Gas"), w2019: T("wendung1:2.019"), wpW: T("wendung1:Wärmepumpe"), w1263: T("wendung1:1.263"), holt: T("wendung1:holt"), w756: T("wendung1:756"), auf: T("wendung1:auf"),
    j10: T("wendung2:10"), j15: T("wendung2:15"), gasV: T("wendung2:Gas"), vorn: T("wendung2:vorn"), jahr16: T("wendung2:Jahr#2"), j16: T("wendung2:16"), nur: T("wendung2:nur"), n24: T("wendung2:24"), euro24: T("wendung2:Euro"),
    j17: T("wendung3:17"), zieht: T("wendung3:zieht"), vorbei: T("wendung3:vorbei"),
    nach: T("ergebnis:Nach"), e20: T("ergebnis:20"), gasE: T("ergebnis:Gas"), n50: T("ergebnis:50.383"), wpE: T("ergebnis:Wärmepumpe"), n47: T("ergebnis:47.384"), spart: T("ergebnis:spart"), n2999: T("ergebnis:2.999"),
    warum: T("warum:Warum"), aus: T("warum:Aus"), k1: T("warum:Kilowattstunde"), strom: T("warum:Strom"), z3: T("warum:3"), k3: T("warum:Kilowattstunden"), waerme: T("warum:Wärme"), ohne: T("warum:Ohne"), foerd: T("warum:Förderung"), verlieren: T("warum:verlieren"),
    und: T("ueberraschung:Und"), verr: T("ueberraschung:Verrückte"), schont: T("ueberraschung:schont"), gasU: T("ueberraschung:Gas"), ab: T("ueberraschung:Ab"), y2029: T("ueberraschung:2029"), muss: T("ueberraschung:muss"), biogas: T("ueberraschung:Biogas"),
    erste: T("ueberraschung:erste"), stufe: T("ueberraschung:Stufe"), kostet: T("ueberraschung:kostet"), z200: T("ueberraschung:200"), jahrU: T("ueberraschung:Jahr"),
    gasM: T("merksatz:Gasheizung"), kauf: T("merksatz:Kauf"), wpM: T("merksatz:Wärmepumpe"), jahre: T("merksatz:Jahre"),
    schluss: T("schluss:Was"),
  };
  const T_SCHLEIFE = A.schluss - 0.3;

  // ---------- Zeitachse des Modells: Jahre (Zeitraffer an den gesprochenen Zwischenständen) ----------
  // Jahr 0 bis „Aber“; erstes Jahr bei „1.263 Euro“; „holt jedes Jahr 756 auf“ → Jahr 3; „Jahr 10, 15“ im Zeitraffer; Jahr 16 hält bis „17.“,
  // dann kriecht der Abstand von 24 € auf 0 (Wärmepumpe überholt bei „vorbei“); danach Zeitraffer bis Jahr 20.
  const jahrRoh = pchip([
    [0, 0], [A.w1263 + 0.1, 0], [A.w1263 + 1.35, 1.0], [A.holt + 0.3, 1.0], [A.auf, 3.0], [A.j10 - 0.4, 3.0], [A.j10 + 0.15, 10.0], [A.j15 - 0.3, 10.0], [A.j15 + 0.3, 15.0],
    [A.jahr16 - 0.1, 15.0], [A.j16 + 0.2, 16.0], [A.j17 - 0.05, 16.0], [A.vorbei - 0.09, 16.0 + 0.9 * (GLEICH - 16)], [A.vorbei + 0.7, 17.0], [A.e20 - 0.1, 17.0], [A.e20 + 0.95, 20.0], [DAUER, 20.0],
  ]);
  // Preise (Kauf)
  const pG = (t) => P.gasInvest * glatt(t, A.g10 - 0.25, A.g10 + 0.7);
  const pW = (t) => P.wpInvest * glatt(t, A.w35 - 0.25, A.w35 + 0.85) - FOERD * glatt(t, A.f12880 - 0.1, A.f12880 + 1.0);
  const ohneF = (t) => FOERD * glatt(t, A.foerd - 0.05, A.foerd + 0.75) * (1 - glatt(t, A.und + 0.1, A.und + 0.9)); // „ohne Förderung“: +12.880 €

  // Rohzustand der Welt zur Zeit t (nur Zahlen; die Schleife lässt ihn zum Zustand bei t = 0 zurückgleiten)
  const S = (t) => {
    const y = jahrRoh(t);
    const G = pG(t) + y * GJ;
    const W = pW(t) + y * WJ + ohneF(t);
    const abst = G - W; // > 0: Wärmepumpe vorn (nur Förderung wie im Video eingerechnet; ohne Förderung läuft der Abstand ins Minus)
    const zr = huckel(t, A.auf + 0.05, A.j10 - 0.3, A.j15 + 0.35, A.j15 + 1.5);
    const stFall = fortschritt(t, A.staat - 0.1, A.f12880 - 0.02);
    return {
      y, jahrAnz: Math.max(0, Math.ceil(y - 1e-6)), G, W, abst,
      sG: glatt(t, A.g10 - 0.35, A.g10 + 0.35), sW: glatt(t, A.w35 - 0.35, A.w35 + 0.35),
      anhG: huckel(t, A.g10 - 0.3, A.g10 + 0.3, A.f12880 + 1.3, A.f12880 + 2.0), anhW: huckel(t, A.w35 - 0.3, A.w35 + 0.3, A.f12880 + 1.3, A.f12880 + 2.0),
      tauschG: glatt(t, A.gasR + 0.4, A.gasR + 1.1), tauschW: glatt(t, A.wpR + 0.45, A.wpR + 1.2), wpEin: glatt(t, A.wpH - 0.05, A.wpH + 0.75),
      // Förderstapel: fällt bei „Staat zahlt“ auf die Außeneinheit und verschwindet; kehrt bei „Ohne Förderung“ zurück, wird weggenommen und fällt bei „Und“ wieder zurück
      stH: 3.2 * (1 - ease.inQuad(stFall)) + 2.6 * glatt(t, A.foerd - 0.05, A.foerd + 0.75) * (1 - glatt(t, A.und + 0.05, A.und + 0.75)),
      stS: Math.min(1, huckel(t, A.staat - 0.1, A.staat + 0.2, A.f12880 + 0.45, A.f12880 + 1.35) + huckel(t, A.ohne - 0.6, A.ohne - 0.1, A.foerd + 0.55, A.foerd + 1.0) + fortschritt(t, A.und, A.und + 0.3) * (1 - glatt(t, A.und + 0.9, A.und + 1.4))),
      stG: puls(t, A.f12880 - 0.1, 0.5) + 0.8 * puls(t, A.ohne - 0.1, 0.5),
      // Kostenströme (dick = Gas 2.019 €, dünn = Wärmepumpe 1.263 €); Bio-Treppe macht den Gasstrom breiter
      stromG: glatt(t, A.gasW - 0.1, A.gasW + 0.5) * (1 - glatt(t, A.e20 + 1.2, A.e20 + 2.2)), stromW: glatt(t, A.wpW - 0.1, A.wpW + 0.5) * (1 - glatt(t, A.e20 + 1.2, A.e20 + 2.2)),
      rG: 0.056 + 0.03 * glatt(t, A.z200 - 0.8, A.z200 + 0.4) * (1 - glatt(t, A.gasM + 0.1, A.gasM + 0.9)), rW: 0.0352,
      // Abstandsanzeige am Boden (Wurzelskala, damit 24 € sichtbar bleibt)
      abstEin: glatt(t, A.wpRen - 0.1, A.wpRen + 0.5) * (1 - glatt(t, A.e20 + 0.3, A.e20 + 0.9)),
      abstL: Math.max(0, -abst) > 0 ? 0.95 * Math.sqrt(Math.max(0, -abst) / 12120) : 0, abstR: abst > 0 ? 0.95 * Math.sqrt(abst / 12120) : 0,
      // Licht (Spot-Wechsel): Gas, Wärmepumpe
      lG: huckel(t, A.neue - 0.1, A.neue + 0.55, A.wpH - 0.05, A.wpH + 0.7) * 0.9 + huckel(t, A.klar - 0.1, A.klar + 0.7, A.oder + 0.3, A.oder + 1.0) + huckel(t, A.verr - 0.1, A.verr + 0.7, A.erste + 0.2, A.erste + 1.2) * 0.8 + puls(t, A.kauf - 0.05, 0.7) * 0.9,
      lW: huckel(t, A.wpH - 0.05, A.wpH + 0.5, A.wpH + 0.8, A.wpH + 1.5) * 0.9 + huckel(t, A.vorbei - 0.5, A.vorbei + 0.3, A.e20 + 1.0, A.e20 + 2.2) + huckel(t, A.n2999 - 0.35, A.n2999 + 0.5, A.warum + 0.3, A.warum + 1.1) + 0.3 * huckel(t, A.warum + 0.2, A.warum + 0.9, A.ohne + 0.2, A.ohne + 0.8) + puls(t, A.jahre - 0.05, 0.8) * 0.9,
      zr, wpGlow: puls(t, A.n2999 - 0.1, 1.3, 0.3, 0.7), glowKauf: puls(t, A.kauf - 0.05, 0.7),
      // Bio-Treppe: vier Stufen, erste leuchtet bei „erste Stufe“
      b0: glatt(t, A.y2029 - 0.05, A.y2029 + 0.5) * (1 - glatt(t, A.gasM + 0.2, A.gasM + 1.0)), b1: glatt(t, A.y2029 + 0.5, A.y2029 + 1.0) * (1 - glatt(t, A.gasM + 0.2, A.gasM + 1.0)),
      b2: glatt(t, A.muss - 0.5, A.muss + 0.05) * (1 - glatt(t, A.gasM + 0.2, A.gasM + 1.0)), b3: glatt(t, A.biogas - 0.25, A.biogas + 0.6) * (1 - glatt(t, A.gasM + 0.2, A.gasM + 1.0)),
      bp0: puls(t, A.erste - 0.05, 1.0),
    };
  };
  const SW = M.wert(S);
  M.schleife({ ab: T_SCHLEIFE });

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#070D1C"], [0.2, "#12234A"], [0.31, "#2A4A7C"], [0.36, "#22406F"], [0.5, "#1B3158"], [1, "#101A30"]], { radial: [0.5, 0.33, 0.42, "rgba(255,176,120,0.14)"] });
  dunst(szene, "#1E3560", 0.016);
  const rig = rigNacht(szene, buehne.renderer, { ziel: [0, 0.4, 0.5], bereich: 7.5, schatten: SCHATTEN, richtung: [-0.5, 0.95, 0.6], farbe: "#A9C4F2", staerke: 0.85, umgebungsStaerke: 0.7, himmelStaerke: 0.5, himmel: "#3A5078", boden: "#1A2230" });
  const Y0 = 0.245, GX = -1.62, WX = 1.62, HZ = -0.35;
  // Boden: verschneite Ebene
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: "#5A6D8F", roughness: 0.95 }));
  boden.rotation.x = -Math.PI / 2; boden.position.y = -0.002; boden.receiveShadow = true; szene.add(boden);
  // Mond mit Hof (steht hinter dem Dorf, wandert mit der Kamera im Bild)
  const mondM = new THREE.Mesh(new THREE.SphereGeometry(1.05, 28, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color("#C9DAFF").multiplyScalar(1.35), fog: false }));
  mondM.position.set(-3.5, 6.2, -26); szene.add(mondM);
  const mondHof = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color("#9FC0FF") }, staerke: { value: 0.55 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 farbe; uniform float staerke; varying vec2 vUv; void main(){ float r = length(vUv - 0.5) * 2.0; float a = pow(clamp(1.0 - r, 0.0, 1.0), 2.6); gl_FragColor = vec4(farbe * staerke * a, 1.0); }",
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  mondHof.position.set(-3.5, 6.2, -26.2); szene.add(mondHof);
  // Dorf im Hintergrund: kleine gleiche Häuser mit warmen Fenstern (ohne eigenes Licht), versinken im Dunst
  [[-10, -19, 0.3, 0], [-4.5, -22, -0.2, 1], [4.2, -20.5, 0.15, 2], [10.5, -18, -0.35, 0], [-15, -25, 0.1, 1], [0.8, -27.5, 0, 2], [15, -24, 0.4, 0], [-8.5, -31, -0.1, 2], [8, -30, 0.2, 1]].forEach(([x, z, r, k], i) => {
    const h = einfamilienhaus({ seed: 4 + i, wand: ["#C8CFDA", "#D4C6B8", "#B7C3D6"][k] });
    h.remove(h.raumLicht); h.position.set(x, 0, z); h.rotation.y = r; h.scale.setScalar(1.6); szene.add(h);
  });

  const platteG = schneePlatte({ breite: 2.9, tiefe: 2.8, led: GAS, seed: 5, pfadX: 0.62, pfadBreite: 0.42 }); platteG.position.set(GX, 0, 0); szene.add(platteG);
  const platteW = schneePlatte({ breite: 2.9, tiefe: 2.8, led: WP, seed: 8, pfadX: 0.62, pfadBreite: 0.42 }); platteW.position.set(WX, 0, 0); szene.add(platteW);
  const hausG = einfamilienhaus({ seed: 2 }); hausG.position.set(GX, Y0, HZ); szene.add(hausG);
  const hausW = einfamilienhaus({ seed: 2 }); hausW.position.set(WX, Y0, HZ); szene.add(hausW);

  // Heizraum: alte Kessel (flackern), neuer Gaskessel links, Speicher der Wärmepumpe rechts
  const kAltG = gasKessel({ alt: true }), kNeuG = gasKessel({ alt: false, farbe: GAS });
  const kAltW = gasKessel({ alt: true }), tank = speicherTank({ farbe: WP });
  hausG.kesselHalter.add(kAltG, kNeuG); hausW.kesselHalter.add(kAltW, tank);
  // Außeneinheit der Wärmepumpe (rechts neben dem Weg), Förderstapel darüber
  const aussen = waermepumpeAussen({ farbe: WP }); aussen.position.set(WX + 1.08, Y0, 1.0); szene.add(aussen);
  const stapel = foerderStapel({ farbe: AKZENT, akzent: WP }); szene.add(stapel);
  const AU = new THREE.Vector3(WX + 1.08, Y0, 1.0);
  // Rauch am Gas-Schornstein
  const rauch = rauchSaeule({ hoehe: 1.1 }); rauch.position.set(GX + hausG.punkte.schornstein.x, Y0 + hausG.punkte.schornstein.y, HZ + hausG.punkte.schornstein.z); szene.add(rauch);
  // Kostensäulen zwischen den Häusern (Höhe = Gesamtkosten, Skala alle 10.000 €), Abstandsanzeige davor
  const CZ = 2.1, CX = 0.34;
  const saeuleG = kostenSaeule({ breite: 0.3, farbe: GAS, tick: 10000 * SK }); saeuleG.position.set(-CX, 0, CZ); szene.add(saeuleG);
  const saeuleW = kostenSaeule({ breite: 0.3, farbe: WP, tick: 10000 * SK }); saeuleW.position.set(CX, 0, CZ); szene.add(saeuleW);
  const abstAnz = abstandsAnzeige({ farbeL: GAS, farbeR: WP }); abstAnz.position.set(0, 0, 1.68); szene.add(abstAnz);
  // Preis-Anhänger über den Dächern
  const anhG = preisAnhaenger({ farbe: GAS }); anhG.position.set(GX, Y0 + 2.85, HZ + 0.3); szene.add(anhG);
  const anhW = preisAnhaenger({ farbe: WP }); anhW.position.set(WX, Y0 + 2.85, HZ + 0.3); szene.add(anhW);
  // Bio-Treppe über dem Gashaus
  const treppe = bioTreppe({ farbe: GAS }); treppe.position.set(GX, Y0 + 2.65, HZ + 0.3); treppe.scale.setScalar(1.15); szene.add(treppe);
  // Kostenströme: Gas aus dem Heizraum, Wärmepumpe aus der Außeneinheit, beide in ihre Säule
  const stromG = energieFluss({ punkte: [[GX - 0.34, Y0 + 0.3, HZ + 0.9], [GX + 0.1, 0.78, 1.35], [-1.0, 0.72, 1.95], [-CX, 0.5, CZ], [-CX, 0.2, CZ]], farbe: GAS, radius: 0.056, wuerfel: 9, groesse: 0.085 });
  const stromW = energieFluss({ punkte: [[AU.x - 0.2, Y0 + 0.3, AU.z + 0.1], [2.1, 0.8, 1.7], [1.0, 0.72, 2.0], [CX, 0.5, CZ], [CX, 0.2, CZ]], farbe: WP, radius: 0.0352, wuerfel: 9, groesse: 0.085 });
  szene.add(stromG, stromW);
  // „Warum?“: 1 kWh Strom (Elfenbein) in die Außeneinheit, 3 kWh Wärme (Blau) ins Haus
  const fanW = aussen.userData.fanPos;
  const stromKwh = energieFluss({ punkte: [[AU.x + 1.5, 1.45, AU.z + 0.5], [AU.x + 0.8, 0.75, AU.z + 0.45], [AU.x + fanW.x, AU.y + fanW.y, AU.z + 0.3]], farbe: AKZENT, radius: 0.012, wuerfel: 1, groesse: 0.13, staerke: 2.2 });
  const waermeKwh = energieFluss({ punkte: [[AU.x - 0.05, AU.y + 0.78, AU.z + 0.1], [WX + 0.85, 1.05, 0.9], [WX + 0.0, 0.62, 0.65], [WX - 0.34, Y0 + 0.3, HZ + 0.45]], farbe: WP, radius: 0.012, wuerfel: 3, groesse: 0.1, staerke: 2.4 });
  szene.add(stromKwh, waermeKwh);
  // Laternen und Tannen
  const lat1 = laterne({ hoehe: 1.45, arm: 0.34, kegel: 0.16, pfuetze: 0.9 }); lat1.position.set(GX - 1.32, Y0, 1.25); szene.add(lat1);
  const lat2 = laterne({ hoehe: 1.45, arm: 0.34, kegel: 0.16, pfuetze: 0.9 }); lat2.position.set(WX + 1.32, Y0, -0.9); lat2.rotation.y = Math.PI; szene.add(lat2);
  const baeume = [[-5.2, -1.2, 1.1], [-4.2, -3.2, 1.3], [-6.4, 0.8, 0.9], [-2.9, -4.3, 1.2], [-0.9, -4.8, 1.4], [1.1, -4.2, 1.2], [3.2, -4.6, 1.3], [5.0, -3.0, 1.1], [5.6, -0.6, 1.2], [6.6, 1.6, 0.9], [-6.0, 3.4, 1.0], [6.0, 3.8, 1.0], [-8.2, -4.0, 1.5], [8.3, -4.6, 1.6], [-3.4, -7.5, 1.6], [2.2, -8.0, 1.8], [-7.6, -1.5, 1.4], [7.5, -1.8, 1.3], [0.6, -6.4, 1.5], [-5.0, -6.2, 1.5], [5.2, -6.6, 1.6]];
  baeume.forEach(([x, z, g], i) => { const b = winterBaum({ groesse: g, seed: i + 2 }); b.position.set(x, 0, z); b.rotation.y = hash(i, 3) * 6; szene.add(b); });
  // Spot-Wechsel: echte Punktlichter und sichtbare Kegel je Haus
  const lichtG = new THREE.PointLight("#FF8240", 0, 0, 2); lichtG.position.set(GX, Y0 + 2.2, 2.3); szene.add(lichtG);
  const lichtW = new THREE.PointLight("#4D9CFF", 0, 0, 2); lichtW.position.set(WX, Y0 + 2.2, 2.3); szene.add(lichtW);
  const kegelG = lichtKegel({ hoehe: 5.4, radiusOben: 0.1, radiusUnten: 1.6, farbe: GAS, staerke: 0.5, streifen: 0.25 }); kegelG.material = kegelG.material.clone(); kegelG.userData.dynamisch = true; szene.add(kegelG);
  const kegelW = lichtKegel({ hoehe: 5.4, radiusOben: 0.1, radiusUnten: 1.6, farbe: WP, staerke: 0.5, streifen: 0.25 }); kegelW.material = kegelW.material.clone(); kegelW.userData.dynamisch = true; szene.add(kegelW);
  // Schneefall (zwei Lagen)
  const schneeFern = staub({ anzahl: 700, bereich: [18, 10, 14], mitte: [0, 4, 1], farbe: "#DCE8FF", groesse: 0.04, staerke: 1.25, aussen: 1, tempo: -0.06, seed: 11 });
  const schneeNah = staub({ anzahl: 380, bereich: [9, 6, 7], mitte: [0, 2.6, 3.2], farbe: "#E8F0FF", groesse: 0.055, staerke: 1.4, aussen: 1, tempo: -0.1, seed: 23 });
  szene.add(schneeFern, schneeNah);
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 220);
  const sh = (t, pos, ziel, fov = 36) => ({ t: typeof t === "number" ? t : T(t), pos, ziel, fov });
  const SH = [
    sh(0, [0.0, 4.6, 20.5], [0.0, 1.5, 0.4], 36),                  // Start: beide Häuser, Tafel oben
    sh(A.neue - 0.3, [-0.3, 4.2, 17.5], [-0.8, 1.4, 0.3], 36),      // fährt heran, Spot links
    sh(A.wpH + 0.5, [0.4, 4.2, 16.4], [1.2, 1.4, 0.5], 36),         // Spot rechts, Außeneinheit erscheint
    sh(A.wir + 0.35, [0.0, 4.3, 18.0], [0.0, 1.4, 0.4], 36),        // Regeln: Totale
    sh(A.gasR - 0.1, [-1.5, 3.4, 12.6], [-1.75, 1.1, 0.0], 36),     // Gasheizung: Heizraum links, alter Kessel
    sh(A.g10 + 0.9, [-1.5, 3.2, 12.0], [-1.75, 1.2, 0.0], 36),      // neuer Kessel
    sh(A.wpR - 0.1, [1.6, 3.2, 12.4], [1.95, 1.1, 0.6], 36),        // Wärmepumpe: rechtes Haus, Außeneinheit
    sh(A.staat - 0.1, [1.5, 3.4, 12.6], [2.2, 0.9, 0.9], 36),       // Förderstapel fällt auf die Außeneinheit
    sh(A.f12880 + 1.0, [0.8, 4.0, 15.0], [1.4, 1.1, 0.7], 36),
    sh(A.dazu + 0.5, [0.0, 4.4, 17.5], [0.0, 1.4, 0.5], 36),        // Totale
    sh(A.klar, [-0.7, 3.7, 14.6], [-1.3, 1.4, 0.0], 36),            // Denkfalle: Licht auf dem Gashaus
    sh(A.oder + 0.5, [-1.2, 3.5, 13.3], [-1.6, 1.3, 0.0], 36),
    sh(A.wpRen - 0.1, [0.0, 3.0, 10.4], [0.0, 1.2, 1.8], 34),       // Rennen: Säulen und Abstand
    sh(A.folg - 0.1, [0.0, 3.2, 10.8], [0.0, 1.3, 1.8], 34),
    sh(A.folg + 0.5, [0.0, 4.6, 18.6], [0.0, 1.4, 0.8], 36),        // Folgen: Welt läuft, Kamera weitet
    sh(A.aber + 0.3, [0.5, 4.0, 15.2], [0.0, 1.2, 1.0], 36),
    sh(A.w2019 - 0.2, [-1.0, 3.4, 13.0], [-0.9, 1.0, 1.5], 36),     // Gasstrom dick
    sh(A.w1263 - 0.2, [1.0, 3.4, 13.0], [0.9, 1.0, 1.5], 36),       // Wärmepumpenstrom dünn
    sh(A.holt, [0.0, 3.4, 12.0], [0.0, 1.4, 1.8], 35),
    sh(A.auf, [0.0, 3.6, 12.6], [0.0, 1.6, 1.8], 35),
    sh(A.j10 + 0.2, [-3.6, 4.3, 14.8], [0.0, 1.3, 0.8], 38),        // Zeitraffer: Schwenk
    sh(A.j15 + 0.2, [3.6, 4.5, 15.4], [0.0, 1.3, 0.8], 38),
    sh(A.jahr16, [0.0, 3.6, 12.6], [0.0, 1.8, 1.6], 35),            // Jahr 16: auf die Säulenspitzen
    sh(A.j16 + 0.9, [0.0, 2.9, 9.2], [0.0, 2.1, 2.1], 32),
    sh(A.j17 + 0.2, [0.0, 3.0, 9.6], [0.0, 2.1, 2.1], 32),
    sh(A.vorbei + 0.4, [0.8, 3.7, 13.4], [0.9, 1.5, 0.9], 36),      // Wärmepumpe vorbei: Licht springt rechts
    sh(A.nach + 0.2, [0.0, 4.8, 19.0], [0.0, 1.5, 0.6], 36),        // Ergebnis: Totale
    sh(A.n47 + 0.4, [0.6, 4.2, 15.6], [1.0, 1.3, 0.5], 36),
    sh(A.n2999 + 0.6, [1.0, 3.8, 14.4], [1.5, 1.3, 0.5], 36),
    sh(A.warum - 0.05, [3.9, 2.2, 7.4], [2.8, 0.8, 1.0], 34),      // Warum: dicht an der Außeneinheit
    sh(A.z3, [3.2, 2.3, 7.2], [2.3, 0.9, 0.8], 34),
    sh(A.ohne - 0.3, [2.3, 3.0, 8.4], [2.2, 0.9, 0.9], 35),
    sh(A.verr - 0.2, [-1.0, 3.5, 13.4], [-1.7, 1.6, -0.2], 36),     // Überraschung: Gashaus, Rauch
    sh(A.y2029 - 0.2, [-1.0, 4.0, 14.2], [-1.75, 2.9, -0.3], 38),   // Bio-Treppe
    sh(A.biogas + 0.3, [-0.7, 4.3, 13.4], [-1.65, 3.2, -0.3], 38),
    sh(A.z200 - 0.4, [-1.6, 3.8, 12.6], [-1.75, 3.0, 0.0], 36),
    sh(A.gasM, [-0.4, 4.2, 15.8], [-0.7, 1.7, 0.1], 36),            // Merksatz: zurück
    sh(A.wpM, [0.0, 4.5, 17.8], [0.0, 1.5, 0.4], 36),
    sh(T_SCHLEIFE, [0.0, 4.6, 20.5], [0.0, 1.5, 0.4], 36),          // = erstes Bild
  ];
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const ziel = a.ziel.map((v, j) => lerp(v, b.ziel[j], p));
    const pos = a.pos.map((v, j) => lerp(v, b.pos[j], p));
    const k = 1 + 0.12 * Math.min(fortschritt(t, 1.0, 3.5), 1 - fortschritt(t, T_SCHLEIFE - 3.0, T_SCHLEIFE)); // Start und Schleifenende exakt, dazwischen etwas weiter weg
    return { pos: pos.map((v, j) => ziel[j] + (v - ziel[j]) * k), ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.01, tempo: 0.25 });
  regie.zoom({ t: A.j16 + 0.7, ziel: [0.0, 2.2, CZ], staerke: 0.22, halt: 1.6, rueck: 0.6 });   // Jahr 16: Zoom auf die Säulenspitzen
  regie.zoom({ t: A.vorbei - 0.55, ziel: [WX - 0.3, 1.3, HZ], staerke: 0.2, halt: 1.2, rueck: 0.7 }); // Wärmepumpe zieht vorbei
  regie.zoom({ t: A.n2999 - 0.2, ziel: [WX, 1.3, HZ], staerke: 0.16, halt: 1.4, rueck: 0.7 });   // Ergebnis: Vorteil
  regie.schleife({ ab: T_SCHLEIFE, ende: DAUER - 1 / FPS });

  // ---------- Zustand auf die Welt anwenden ----------
  const post = { ...GRADING.nacht, belichtung: 1.08, bloomStaerke: 0.9, bloomSchwelle: 1.05, tiltMitte: 0.5, tiltBreite: 0.34, tiltStaerke: 0.5, vignette: 0.36, strahlen: 0.16, strahlenSchwelle: 1.3, strahlenLaenge: 0.7, strahlenAbfall: 0.96, strahlenFarbe: [1, 0.85, 0.7], strahlenPunkt: [0, 6, -6] };
  const moon = rig.mond, hemi = rig.hemi;
  const moonBasis = 0.85, hemiBasis = 0.5;
  const tmp = new THREE.Vector3();
  const bis = (x, a, b) => clamp((x - a) / (b - a));
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t);
      // Kessel: alter flackert (Heizraum links und rechts gleich), neuer Kessel stetig; Tausch = Sinken und Aufsteigen mit Aufleuchten
      const fAlt = Math.max(0.1, noise(t, 0) * (Math.sin(t * 3.1) > 0.82 ? 0.25 : 1) + 0.15);
      const fAltW = Math.max(0.1, noise(t, 2) * (Math.sin(t * 2.7 + 1) > 0.82 ? 0.25 : 1) + 0.15);
      const fNeu = 0.86 + 0.05 * Math.sin(t * 4.1);
      kAltG.position.y = -0.5 * ease.inCubic(s.tauschG); kAltG.visible = s.tauschG < 0.995; kAltG.flamme(fAlt * (1 - s.tauschG)); kAltG.glimm(0.2 + 0.3 * fAlt);
      kNeuG.position.y = -0.5 * (1 - ease.outBack(clamp(s.tauschG), 1.3)); kNeuG.visible = s.tauschG > 0.005; kNeuG.flamme(fNeu * 0.8); kNeuG.glimm(0.5 + 1.1 * puls(t, A.gasR + 0.95, 0.9) + 0.35 * puls(t, A.gasM - 0.05, 0.9));
      kAltW.position.y = -0.5 * ease.inCubic(s.tauschW); kAltW.visible = s.tauschW < 0.995; kAltW.flamme(fAltW * (1 - s.tauschW)); kAltW.glimm(0.2 + 0.3 * fAltW);
      tank.position.y = -0.5 * (1 - ease.outBack(clamp(s.tauschW), 1.3)); tank.visible = s.tauschW > 0.005; tank.glimm(0.5 + 1.1 * puls(t, A.wpR + 1.0, 0.9) + 0.9 * puls(t, A.k3 - 0.1, 1.2));
      hausG.raumLicht.intensity = 1.6 + 2.4 * (fAlt * (1 - s.tauschG) + fNeu * 0.8 * s.tauschG);
      hausW.raumLicht.intensity = 1.6 + 2.4 * (fAltW * (1 - s.tauschW)) + 1.6 * s.tauschW;
      hausW.raumLicht.color.set(s.tauschW > 0.5 ? "#9CC4FF" : "#FFB070");
      hausG.raumMat.emissiveIntensity = 0.3 + 0.35 * fAlt * (1 - s.tauschG) + 0.3 * s.tauschG;
      hausW.raumMat.emissiveIntensity = 0.3 + 0.35 * fAltW * (1 - s.tauschW) + 0.3 * s.tauschW;
      // Außeneinheit
      aussen.setze(s.wpEin); aussen.lauf(t, 0.7 + 0.8 * s.wpEin + 1.4 * huckel(t, A.warum, A.warum + 0.6, A.ohne - 0.2, A.ohne + 0.5));
      aussen.led(0.7 + 0.6 * puls(t, A.wpH, 1.0) + 0.7 * puls(t, A.w35 - 0.05, 0.9) + 0.8 * s.wpGlow + 0.5 * puls(t, A.k3, 1.2));
      // Förderstapel
      stapel.position.set(AU.x, AU.y + 0.66 + Math.max(0, s.stH), AU.z); stapel.rotation.y = 0.3 + 0.8 * s.stH; stapel.setze(Math.min(1, s.stS)); stapel.glimm(s.stG);
      // Säulen, Anhänger
      saeuleG.setze(s.sG); saeuleG.hoehe(Math.max(0.005, s.G * SK)); saeuleG.puls(0.55 * puls(t, A.g10 + 0.3, 0.6) + 0.6 * puls(t, A.gasM - 0.05, 0.9) + 0.5 * puls(t, A.n47 + 0.95, 0.7) + 0.45 * puls(t, A.w2019 + 1.0, 0.7) + 0.5 * puls(t, A.n50 + 0.95, 0.7) + (s.abst < 0 ? 0.15 * (0.5 + 0.5 * Math.sin(t * 5)) * glatt(t, A.hinten, A.hinten + 0.6) * (1 - glatt(t, A.aber, A.aber + 0.6)) : 0));
      saeuleW.setze(s.sW); saeuleW.hoehe(Math.max(0.005, s.W * SK)); saeuleW.puls(0.55 * puls(t, A.w35 + 0.4, 0.6) + 0.8 * puls(t, A.f12880 + 0.5, 0.7) + 0.9 * puls(t, A.vorbei - 0.05, 1.0) + 0.7 * s.wpGlow + 0.6 * puls(t, A.jahre - 0.05, 0.8) + 0.5 * puls(t, A.verlieren - 0.1, 0.7));
      anhG.setze(s.anhG); anhG.text("10.000 €"); anhG.glimm(puls(t, A.g10, 0.6));
      anhW.setze(s.anhW); anhW.text(t < A.f12880 ? "35.000 €" : "22.120 €"); anhW.glimm(puls(t, A.w35, 0.6) + puls(t, A.f12880 + 0.9, 0.6));
      // Abstandsanzeige
      abstAnz.setze(s.abstEin); abstAnz.laenge(s.abstL, s.abstR);
      // Kostenströme
      const lauf = (st, amp, tempo) => { st.setze(Math.min(1, amp)); st.lauf(t, tempo); };
      stromG.breite(s.rG); stromW.breite(s.rW);
      lauf(stromG, s.stromG, 0.34 + 0.12 * s.y / 5); lauf(stromW, s.stromW, 0.3 + 0.12 * s.y / 5);
      // Warum: Strom/Wärme
      lauf(stromKwh, huckel(t, A.aus, A.aus + 0.5, A.verr - 0.15, A.verr + 0.3), 0.3);
      lauf(waermeKwh, huckel(t, A.z3 - 0.2, A.z3 + 0.4, A.verr - 0.15, A.verr + 0.3), 0.3);
      // Bio-Treppe
      treppe.stufe(0, s.b0); treppe.stufe(1, s.b1); treppe.stufe(2, s.b2); treppe.stufe(3, s.b3); treppe.puls(0, s.bp0);
      treppe.visible = s.b0 > 0.002;
      // Rauch am Gas-Schornstein: kräftiger bei „Gas schont“ und „Biogas“
      rauch.lauf(t, 0.75 + 0.4 * puls(t, A.schont, 1.8) + 0.2 * (1 - s.tauschG));
      // Spot-Wechsel
      lichtG.intensity = 24 * Math.min(1.2, s.lG); lichtW.intensity = 24 * Math.min(1.2, s.lW);
      kegelG.visible = s.lG > 0.01; kegelG.material.uniforms.staerke.value = 0.45 * Math.min(1.2, s.lG); kegelG.position.set(GX, 5.4, HZ + 0.4);
      kegelW.visible = s.lW > 0.01; kegelW.material.uniforms.staerke.value = 0.45 * Math.min(1.2, s.lW); kegelW.position.set(WX, 5.4, HZ + 0.4);
      // Zeitraffer: Himmel hellt kurz auf, Schnee dünnt aus
      moon.intensity = moonBasis * (1 + 0.9 * s.zr + 0.25 * s.wpGlow);
      hemi.intensity = hemiBasis * (1 + 0.9 * s.zr);
      szene.environmentIntensity = 0.7 * (1 + 0.5 * s.zr);
      szene.backgroundIntensity = 1 + 0.9 * s.zr;
      schneeFern.material.uniforms.staerke.value = 1.25 * (1 - 0.55 * s.zr); schneeNah.material.uniforms.staerke.value = 1.4 * (1 - 0.7 * s.zr);
      // Nachbearbeitung: Strahlen steigen bis zum Ergebnis, Glow auf dem Sieger
      post.bloomStaerke = 0.9 + 0.3 * s.wpGlow + 0.15 * s.zr;
      post.strahlen = 0.14 + 0.38 * bis(t, A.zieht, A.n2999) * (1 - bis(t, A.warum - 0.2, A.warum + 1.0)) + 0.12 * s.zr;
      post.strahlenPunkt = [lerp(GX, WX, clamp(0.5 + 0.5 * (s.lW - s.lG))), 2.4, HZ];
      post.belichtung = 1.08 + 0.05 * s.wpGlow;
      post.splitBalance = 0.02 + 0.2 * (s.lW - s.lG);
      regie.anwenden(t);
    },
  };

  // ---------- HUD ----------
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "tief",
    werte: (t) => { const s = SW(t); return { a: s.G, b: s.W }; },
    uhr: { ein: A.aber + 0.1, zeit: (t) => SW(t).jahrAnz, format: (v) => `${Math.round(v)}`, label: "JAHR" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 ? 0 : fuehrerAlt.call(this, w); }; // „VORN“ erst, wenn beide Seiten einen Preis haben
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  chip("130 M² · EINFAMILIENHAUS", A.wir, A.gasR - 0.1, "akzent", "hell");
  chip("20 JAHRE", A.z20 - 0.05, A.gasR - 0.1, "akzent", "voll", 466);
  chip("GASHEIZUNG 10.000 €", A.g10 - 0.1, A.wpR - 0.2, "a", "voll");
  chip("WÄRMEPUMPE 35.000 €", A.w35 - 0.1, A.staat - 0.2, "b", "voll");
  chip("−12.880 € FÖRDERUNG", A.f12880 - 0.05, A.klar - 0.2, "b", "voll");
  chip("2.019 € / JAHR", A.w2019 - 0.1, A.w1263 - 0.35, "a", "voll", 450);
  chip("1.263 € / JAHR", A.w1263 - 0.1, A.w756 - 0.4, "b", "voll", 450);
  chip("+756 € / JAHR", A.w756 - 0.1, A.j10 - 0.1, "akzent", "voll", 450);
  chip("BIO-ANTEIL AB 2029", A.y2029 - 0.05, A.z200 - 0.35, "a", "hell", 450);
  chip("≈ 200 € / JAHR", A.z200 - 0.1, A.gasM - 0.1, "a", "voll", 450);
  M.zaehler({ wert: (t) => SW(t).abst, einheit: " €", nk: 0, max: 99999, team: "akzent", art: "voll", label: "ABSTAND", x: SICHER.mitte, y: 372, ein: A.z12120 - 0.1, aus: A.nach - 0.2, anker: "mitte" });
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "NACH 20 JAHREN", ein: A.n50 - 0.3, aus: A.warum - 0.2,
    zeilen: [{ label: "GAS", wert: Math.round(gasSumme(20)), einheit: "€", team: "a", ein: A.n50 }, { label: "WÄRMEPUMPE", wert: Math.round(wpSumme(20)), einheit: "€", team: "b", ein: A.n47 }],
    differenz: { label: "WÄRMEPUMPE SPART", wert: Math.round(abstand(20)), einheit: "€", ein: A.n2999 } });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 372, titel: "WARUM?", ein: A.warum + 0.6, aus: A.verr - 0.15, max: 60264,
    faktoren: [
      { label: "WÄRME AUS 1 kWh GAS / STROM · kWh", ein: A.aus + 0.4, a: { wert: 12706, text: "0,9" }, b: { wert: 48000, text: "3,4" } },
      { label: "20 JAHRE OHNE FÖRDERUNG · €", ein: A.ohne, a: { wert: Math.round(gasSumme(20)), text: "50.383" }, b: { wert: Math.round(wpSumme(20, 0)), text: "60.264" }, tag: "VERLIERT", tagEin: A.verlieren },
    ] });
  M.pointe({ woerter: [{ text: "KAUF", ein: A.kauf, farbe: "a" }, { umbruch: true }, { text: "JAHRE", ein: A.jahre, farbe: "b" }], y: 560, groesse: 170, aus: A.schluss - 0.1 });
  M.folgen({ ein: A.folg, dauer: 1.8 });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.4, "pop", "Schnee fällt, alter Kessel flackert in beiden Heizräumen"); ev(1.4, "klick", "Kamera fährt heran"); ev(A.alt, "klick", "Typenschild 2006 im Heizraum links erkennbar"); ev(A.neue, "whoosh", "Spot und LED auf das linke Haus");
  ev(A.wpH, "whoosh", "Spot wechselt auf das rechte Haus, Außeneinheit wächst, Lüfter dreht");
  ev(A.wir, "klick", "Kamera weitet zur Totalen"); ev(A.z20, "pop", "Chip 20 Jahre"); ev(A.gasR, "whoosh", "Kamera zum linken Heizraum"); ev(A.gasR + 0.5, "klick", "alter Kessel sinkt");
  ev(A.gasR + 1.0, "ding", "neuer Kessel steigt auf, Aufleuchten"); ev(A.g10, "ding", "Säule links wächst auf 10.000 €, Preisanhänger"); ev(A.wpR, "whoosh", "Kamera zum rechten Haus"); ev(A.wpR + 0.6, "klick", "alter Kessel rechts sinkt, Speicher steigt auf");
  ev(A.w35, "ding", "Säule rechts wächst auf 35.000 €, Preisanhänger"); ev(A.staat, "whoosh", "Förderstapel fällt auf die Außeneinheit"); ev(A.f12880, "ding", "Stapel leuchtet, Chip −12.880 €"); ev(A.f12880 + 0.7, "klick", "Säule rechts sinkt auf 22.120 €, Anhänger wechselt");
  ev(A.dazu + 0.4, "klick", "Kamera zurück in die Totale"); ev(A.klar, "whoosh", "Lichtkegel auf dem Gashaus, Wärmepumpenhaus im Schatten"); ev(A.gasF, "klick", "Gashaus leuchtet"); ev(A.oder, "klick", "Licht steht ruhig");
  ev(A.wpRen, "whoosh", "Kamera zu den Säulen, Abstandsbalken erscheint"); ev(A.z12120, "ding", "Abstand −12.120 €, Gasbalken links"); ev(A.hinten, "klick", "Säule rechts höher als links");
  ev(A.folg + 0.5, "klick", "Kamera weitet, Rauch steigt"); ev(A.verpasst, "klick", "Schnee und Rauch laufen weiter");
  ev(A.aber, "whoosh", "Kamera fährt zur Mitte"); ev(A.gasW, "klick", "Kostenstrom links dick"); ev(A.w2019, "ding", "Chip 2.019 € / Jahr, Würfel fließen in die Gassäule"); ev(A.wpW, "klick", "Kostenstrom rechts dünn");
  ev(A.w2019 + 1.0, "klick", "Gaswürfel erreichen die Säule, sie pulsiert"); ev(A.w1263, "ding", "Chip 1.263 € / Jahr, Jahresuhr läuft an"); ev(A.holt, "klick", "Säulen wachsen, Abstand schrumpft"); ev(A.w756, "ding", "Chip +756 € / Jahr"); ev(A.auf, "klick", "Jahr 3");
  ev(A.j10, "whoosh", "Zeitraffer: Himmel hellt auf, Kamera schwenkt, Jahr 10"); ev(A.j15, "whoosh", "Jahr 15, Schwenk zur anderen Seite"); ev(A.gasV, "klick", "Gas bleibt vorn, Himmel dunkelt wieder"); ev(A.vorn, "klick", "Kamera fährt auf die Säulen");
  ev(A.jahr16, "ding", "Jahr 16"); ev(A.j16 + 0.6, "whoosh", "Zoom auf die Säulenspitzen"); ev(A.nur, "klick", "Spitzen fast gleich hoch"); ev(A.n24, "ding", "Abstand nur noch 24 €"); ev(A.euro24, "klick", "Abstand kriecht Richtung 0");
  ev(A.j17, "ding", "Jahr 17 beginnt, Abstand schrumpft"); ev(A.zieht, "klick", "Spitzen auf gleicher Höhe, Licht beginnt zu wandern"); ev(A.vorbei, "whoosh", "Wärmepumpe überholt: Licht springt auf das rechte Haus, rechte Säule leuchtet"); ev(A.vorbei + 0.8, "klick", "Säulen wachsen bis Jahr 17");
  ev(A.nach, "whoosh", "Kamera zurück ins Totale, Jahresuhr läuft auf 20"); ev(A.e20 + 0.9, "klick", "Jahr 20"); ev(A.gasE, "klick", "Gassäule vorn rechts neben der Wärmepumpensäule"); ev(A.n50, "ding", "Bilanz: Gas 50.383 €"); ev(A.wpE, "klick", "Kamera fährt heran"); ev(A.n47 + 1.0, "klick", "Gassäule pulsiert: noch etwas höher als die Wärmepumpensäule");
  ev(A.n50 + 1.0, "klick", "Gas-Säule leuchtet auf: die höchste Säule"); ev(A.n47, "ding", "Bilanz: Wärmepumpe 47.384 €"); ev(A.spart, "whoosh", "Licht wandert auf das rechte Haus"); ev(A.n2999, "ding", "Wärmepumpe spart 2.999 €, Glow auf dem rechten Haus");
  ev(A.warum, "whoosh", "Kamera nah an die Außeneinheit"); ev(A.aus, "klick", "Strom-Würfel läuft zur Außeneinheit"); ev(A.k1, "klick", "1 kWh Strom"); ev(A.z3, "ding", "drei Wärme-Würfel strömen ins Haus"); ev(A.k3 + 0.4, "klick", "Wärme im Heizraum, Speicher leuchtet");
  ev(A.ohne, "whoosh", "Förderstapel kehrt zurück"); ev(A.foerd, "klick", "Förderstapel wird weggenommen, Wärmepumpe-Säule wächst"); ev(A.foerd + 0.9, "ding", "Wärmepumpe 60.264 €, Gas vorn"); ev(A.verlieren, "klick", "Wärmepumpe verliert");
  ev(A.verr, "whoosh", "Kamera zum Gashaus, Förderung zurück"); ev(A.schont, "klick", "Rauch am Schornstein, Licht auf dem Gashaus"); ev(A.y2029, "ding", "Bio-Treppe: 2029 10 %"); ev(A.y2029 + 0.5, "klick", "Stufe 2030 15 %"); ev(A.muss, "klick", "Stufe 2035 30 %"); ev(A.biogas, "ding", "Stufe 2040 60 %");
  ev(A.erste, "klick", "erste Stufe leuchtet"); ev(A.z200 - 0.8, "klick", "der Gas-Kostenstrom beginnt breiter zu werden"); ev(A.z200, "ding", "Chip ≈ 200 € / Jahr, Gasstrom wird breiter"); ev(A.jahrU, "klick", "Gasstrom breit");
  ev(A.gasM, "whoosh", "Bio-Treppe sinkt, Kamera fährt zurück"); ev(A.kauf, "ding", "KAUF: Gashaus leuchtet"); ev(A.wpM, "klick", "Kamera gleitet Richtung Startbild"); ev(A.jahre, "ding", "JAHRE: Wärmepumpenhaus leuchtet");
  ev(A.schluss + 0.8, "klick", "Kamera und Werte gleiten zum Startbild (Schleife)");

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
