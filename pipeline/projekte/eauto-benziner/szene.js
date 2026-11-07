// „Elektroauto oder Benziner: Welches kostet in 5 Jahren weniger?“ · Stil 17 Nachtstadt-Miniatur (Nachtstraße), Simulierbar 07.11.2026 mittag.
// Zwei gleiche Kompaktwagen (links Stromer in Cyan, rechts Benziner in Orange) fahren nebeneinander eine nasse Nachtstraße entlang; die Kamera folgt.
// Je Runde steht der Ladeort am Straßenrand (Schnellladesäule und Zapfsäule mit Dach · Haus mit Wallbox · Haus mit Solardach); der Stromer-Zähler
// fällt von Runde zu Runde (60 → 45 → 35 → 18 ct je kWh), der Benziner-Zähler bleibt: der günstigere Wagen fährt vorn.
// Alle Zahlen kommen aus pipeline/sim/eauto_benziner.mjs. Alles ist eine reine Funktion von t (window.renderAt(t)).
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, lichtKegel, staub, buendeln, aktualisiere, spiegelBoden } from "../../engine/sim_atmosphaere.js";
import { gebaeude, strassenBoden, laterne, autoNacht, lichtSpur, skyline, himmelNacht, preisAnhaenger } from "../../engine/stil_nachtstadt.js";
import { ladeSaeule, zapfSaeule, wohnHaus } from "../../engine/stil_nachtstadt_auto.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { P, videoZahlen } from "../../sim/eauto_benziner.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Wagenlack, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const STROM = "#22C6F2";
const BENZIN = "#FF8A3D";
const AKZENT = "#ECE6DA";

// ---------- Rechnung (aus sim/eauto_benziner.mjs) ----------
const Z = videoZahlen();
const KM = Z.km; // 75.000
const B_END = Z.benziner, S60 = Z.s60, S45 = Z.s45, S35 = Z.s35, S18 = Z.s18, PRAEMIE = P.praemie; // 50.025 · 53.250 · 51.750 · 50.550 · 48.750 · 3.000
const GAP1 = Z.v60; // 3.225
const de = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

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
      a: { name: "STROMER", farbe: STROM, woerter: ["Strom*", "Solarstrom*", "Steckdose*", "Haushaltsstrom*", "Stromer*"] },
      b: { name: "BENZINER", farbe: BENZIN, woerter: ["Benzin*", "Benziner*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    hGegen: T("hook:gegen"), h5: T("hook:5"), hWer: T("hook:wer"),
    r15: T("regeln:15.000"), rStromer: T("regeln:Stromer"), r4599: T("regeln:45.990"), rBenz: T("regeln:Benziner"), r3779: T("regeln:37.790"), rGez: T("regeln:Gezählt"), rWert: T("regeln:Wertverlust"),
    fKlar: T("falle:Klar"), fBenz: T("falle:Benziner"), f8200: T("falle:8.200"), fBill: T("falle:billiger"), fOder: T("falle:Oder"),
    rRunde: T("rennen:Runde"), rNur: T("rennen:nur"), r60: T("rennen:60"), rBenzin: T("rennen:Benzin"), rDavon: T("rennen:davon"), rBenziner2: T("rennen:Benziner"),
    w1Nach: T("wendung1:Nach"), w13225: T("wendung1:3.225"), w1Vor: T("wendung1:Vorsprung"), w1Doch: T("wendung1:Doch"), w1anders: T("wendung1:anders"), w1Halb: T("wendung1:Halb"), w1unter: T("wendung1:unterwegs"),
    w245: T("wendung2:45"), w2Abst: T("wendung2:Abstand"), w21725: T("wendung2:1.725"), w2Runde: T("wendung2:Runde"), w2nur: T("wendung2:nur"), w235: T("wendung2:35"), w2Jetzt: T("wendung2:Jetzt"), w2knapp: T("wendung2:knapp"),
    w3Pro: T("wendung3:Pro"), w3842: T("wendung3:842,50"), w3833: T("wendung3:833,75"), w3Nach: T("wendung3:Nach"), w3525: T("wendung3:525"), w3Rueck: T("wendung3:Rückstand"), w3Der: T("wendung3:Der"), w3noch: T("wendung3:noch"),
    kLetzte: T("kipp:Letzte"), kDach: T("kipp:Dach"), k18: T("kipp:18"), kBeide: T("kipp:Beide"), kGleich: T("kipp:gleichauf"), kUnd: T("kipp:Und"), kLiegt: T("kipp:liegt"), kVorn: T("kipp:vorn"),
    eEnd: T("ergebnis:Endstand"), eMit: T("ergebnis:Mit"), e1275: T("ergebnis:1.275"), eAn: T("ergebnis:An"), eSaeule: T("ergebnis:Säule"), e3225: T("ergebnis:3.225"),
    wWarum: T("warum:Warum"), w8200: T("warum:8.200"), wStart: T("warum:Startnachteil"), wDen: T("warum:Den"), wBill: T("warum:billiger"),
    pUnd: T("pointe:Und"), pVerr: T("pointe:Verrückte"), pMit: T("pointe:Mit"), p3000: T("pointe:3.000"), pPraemie: T("pointe:Prämie"), pReicht: T("pointe:reicht"), pHaush: T("pointe:Haushaltsstrom"),
    sNicht: T("schlusskarte:Nicht"), sMotor: T("schlusskarte:Motor"), sEnt: T("schlusskarte:entscheidet"), sSond: T("schlusskarte:Sondern"), sSteck: T("schlusskarte:Steckdose"),
  };

  // ---------- Zähler: Stromer fällt von Runde zu Runde, Benziner bleibt ----------
  const uKm = (t) => glatt(t, A.rRunde + 0.5, A.w13225 - 0.25); // Kilometer 0 → 75.000 in Runde 1
  const dFall2 = (t) => (S60 - S45) * glatt(t, A.w245 + 0.1, A.w21725 - 0.1);          // 45 ct: Abstand 3.225 → 1.725
  const dFall3 = (t) => (S45 - S35) * glatt(t, A.w235 + 0.05, A.w3842 + 0.4);          // 35 ct: Abstand → 525
  const dFall4 = (t) => (S35 - S18) * glatt(t, A.kGleich + 1.0, A.kVorn + 0.45);       // 18 ct: Stromer zieht vorbei (Führungswechsel bei „liegt“)
  const dUp5 = (t) => (S60 - S18) * glatt(t, A.eAn + 0.05, A.e3225 - 0.05);             // nur Säule: Stromer-Zähler zurück auf 53.250
  const dFall6 = (t) => (S60 - S35) * glatt(t, A.pUnd + 0.05, A.pVerr + 0.9);           // Rückblende: Zu Hause 35 ct
  const dFall7 = (t) => PRAEMIE * glatt(t, A.p3000 - 0.1, A.pPraemie + 0.5);            // Prämie −3.000 €
  const SW = M.wert((t) => {
    const u = uKm(t);
    const B = B_END * u;
    const S = S60 * u - dFall2(t) - dFall3(t) - dFall4(t) + dUp5(t) - dFall6(t) - dFall7(t);
    return { u, km: KM * u, B, S, gap: S - B };
  });
  const SWF = (t) => SW(t);

  // ---------- Fahrt: Ankerpunkt der Kamera entlang der Straße (−z) ----------
  const zc = pchip([[0, 0], [A.rRunde, -9.5], [A.w1Nach + 0.4, -36.5], [A.w1Nach + 8.5, -49], [A.kLetzte, -61.5], [A.kVorn + 0.7, -75], [DAUER, -92]]);
  const LEAD = 1.35; // größte Führung in Weltmaß
  const fuehrung = (gap) => Math.sign(gap) * Math.sqrt(Math.min(1, Math.abs(gap) / GAP1)) * LEAD; // > 0: Benziner vorn

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
  szene.add(spiegelBoden({ breite: 7.6, tiefe: LAENGE + 30, staerke: 1.05, pfuetzen: 0.5, streckung: 3.2, massstab: 0.35, aufloesung: 0.22 }).translateZ(-(LAENGE / 2 - 14)).translateY(0));
  const him = skyline({ anzahl: 46, radius: 34, bogen: [Math.PI * 1.02, Math.PI * 1.98], mitte: [0, 0] });
  him.userData.dynamisch = true; szene.add(him);

  // Stationen am Straßenrand (an der Stelle, an der die Wagen zur genannten Zeit vorbeifahren)
  const zAt = (t) => zc(t);
  const stationen = [];
  const ladeS1 = ladeSaeule({ farbe: STROM }); ladeS1.position.set(-1.38, 0, zAt(A.rNur + 0.3)); szene.add(ladeS1);
  const zapf1 = zapfSaeule({ farbe: BENZIN }); zapf1.rotation.y = Math.PI; zapf1.position.set(1.62, 0, zAt(A.rNur + 0.3)); szene.add(zapf1);
  stationen.push({ z: zAt(A.rNur + 0.3), links: true, rechts: true });
  const haus2 = wohnHaus({ farbe: STROM, wallbox: true, solar: false, seed: 2 }); haus2.position.set(-2.12, 0, zAt(A.w1Halb + 0.4)); szene.add(haus2);
  const ladeS2 = ladeSaeule({ farbe: STROM }); ladeS2.position.set(-1.38, 0, zAt(A.w1unter + 0.4)); szene.add(ladeS2);
  stationen.push({ z: zAt(A.w1Halb + 0.4), links: true }, { z: zAt(A.w1unter + 0.4), links: true });
  const haus3 = wohnHaus({ farbe: STROM, wallbox: true, solar: false, wand: "#C2B6A8", seed: 3 }); haus3.position.set(-2.12, 0, zAt(A.w2nur + 0.3)); szene.add(haus3);
  stationen.push({ z: zAt(A.w2nur + 0.3), links: true });
  const haus4 = wohnHaus({ farbe: STROM, wallbox: true, solar: true, wand: "#B2BBC9", seed: 4 }); haus4.position.set(-2.12, 0, zAt(A.kDach + 0.2)); szene.add(haus4);
  stationen.push({ z: zAt(A.kDach + 0.2), links: true });
  const haus5 = wohnHaus({ farbe: STROM, wallbox: true, solar: false, wand: "#C2B6A8", seed: 5 }); haus5.position.set(-2.12, 0, zAt(A.pReicht + 0.2)); szene.add(haus5);
  stationen.push({ z: zAt(A.pReicht + 0.2), links: true });

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
        if (!(reihe === 0 && frei(zm, seite)) && !(reihe === 0 && Math.abs(xm) < 0)) {
          const g = gebaeude({ breite: b, hoehe: h, tiefe: tt - 0.08, seed: n * 2 + (seite > 0 ? 1 : 0), anteilAn: 0.42 + hash(n, 9) * 0.3, leuchten: 3, fassade: ["#2B313D", "#30343B", "#262C38", "#363A42"][n % 4], laden: nah && hash(n, 13) < 0.5, warnlicht: h > 5.5, schatten: true });
          g.position.set(xm, 0, zm); szene.add(g);
        }
        z -= tt + 0.05; n++;
      }
    }
  }
  // Laternen beiderseits
  for (let z = 6; z > -LAENGE - 6; z -= 3.4) {
    for (const s of [-1, 1]) {
      if ((s < 0 ? false : false)) continue;
      const l = laterne({ hoehe: 1.45, arm: 0.34, pfuetze: 0.9, kegel: 0.12 });
      l.position.set(s * 1.36, 0, z + (s > 0 ? 1.7 : 0));
      l.rotation.y = s > 0 ? Math.PI : 0;
      szene.add(l);
    }
  }

  // Wagen, Lichtspuren, Schilder, Spots
  const kurveS = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.55, 0, 14), new THREE.Vector3(-0.55, 0, -LAENGE - 10)]);
  const kurveB = new THREE.CatmullRomCurve3([new THREE.Vector3(0.55, 0, 14), new THREE.Vector3(0.55, 0, -LAENGE - 10)]);
  const spurS = lichtSpur(kurveS, { farbe: STROM, staerke: 4.2, breite: 0.06, segmente: 400 });
  const spurB = lichtSpur(kurveB, { farbe: BENZIN, staerke: 4.2, breite: 0.06, segmente: 400 });
  const autoS = autoNacht({ farbe: STROM, laenge: 0.9 }), autoB = autoNacht({ farbe: BENZIN, laenge: 0.9 });
  [autoS, autoB, spurS, spurB].forEach((o) => { o.userData.dynamisch = true; });
  autoS.rotation.y = autoB.rotation.y = Math.PI / 2;
  szene.add(spurS, spurB, autoS, autoB);
  const anhS = preisAnhaenger({ farbe: STROM, breite: 0.95, hoehe: 0.4 }), anhB = preisAnhaenger({ farbe: BENZIN, breite: 0.95, hoehe: 0.4 });
  anhS.scale.setScalar(0.01); anhB.scale.setScalar(0.01); szene.add(anhS, anhB);
  const lichtS = new THREE.PointLight(STROM, 0, 0, 2), lichtB = new THREE.PointLight(BENZIN, 0, 0, 2);
  szene.add(lichtS, lichtB);
  const kegelS = lichtKegel({ hoehe: 3.2, radiusOben: 0.08, radiusUnten: 0.85, farbe: STROM, staerke: 0.4, streifen: 0.25 }); kegelS.material = kegelS.material.clone(); kegelS.userData.dynamisch = true;
  const kegelB = lichtKegel({ hoehe: 3.2, radiusOben: 0.08, radiusUnten: 0.85, farbe: BENZIN, staerke: 0.4, streifen: 0.25 }); kegelB.material = kegelB.material.clone(); kegelB.userData.dynamisch = true;
  szene.add(kegelS, kegelB);
  const nebel = staub({ anzahl: 700, bereich: [9, 5, 12], mitte: [0, 2.2, 0], farbe: "#9FB4D8", groesse: 0.03, staerke: 1.0, aussen: 1, tempo: -0.08, seed: 11 });
  nebel.userData.dynamisch = true; szene.add(nebel);
  const statistik = buendeln(szene);
  if (Q.has("statistik")) console.warn("buendeln", JSON.stringify(statistik));

  // ---------- Kamera: relativ zum Ankerpunkt auf der Straße ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 220);
  const sh = (t, pos, ziel, fov = 36) => ({ t: typeof t === "number" ? t : T(t), pos, ziel, fov });
  const SH = [
    sh(0, [0.0, 3.3, 6.6], [0.0, 0.3, -2.2], 36),                  // Totale von schräg oben hinten: beide Wagen, Straße voraus
    sh(A.hGegen, [0.5, 2.5, 4.8], [0.0, 0.35, -1.0], 36),         // Hook: Kamera schiebt sich heran
    sh(A.hWer + 0.3, [-0.7, 2.0, 4.2], [0.0, 0.35, -0.6], 35),
    sh(A.r15 + 0.1, [0.0, 3.3, 6.4], [0.0, 0.3, -1.5], 36),       // Regeln: Totale
    sh(A.rStromer, [-1.7, 1.4, 3.0], [-0.55, 0.5, 0.0], 35),       // Stromer, Preisschild
    sh(A.rBenz, [1.7, 1.4, 3.0], [0.55, 0.5, 0.0], 35),            // Benziner, Preisschild
    sh(A.rGez, [0.0, 3.0, 6.0], [0.0, 0.3, -1.0], 36),
    sh(A.rWert + 0.4, [0.0, 1.7, 3.8], [0.0, 0.4, -0.2], 34),
    sh(A.fKlar, [1.1, 1.9, 3.8], [0.55, 0.4, -0.3], 34),           // Denkfalle: Licht auf dem Benziner
    sh(A.fOder + 0.2, [0.4, 2.5, 5.0], [0.0, 0.3, -0.8], 35),
    sh(A.rRunde, [0.0, 1.05, 3.4], [0.0, 0.35, -2.0], 38),         // Runde 1: tief hinter den Wagen, Säulen voraus
    sh(A.r60 - 0.2, [-1.4, 1.1, 2.6], [-1.0, 0.55, -0.6], 36),     // Ladesäule
    sh(A.rBenzin - 0.2, [1.9, 1.0, 2.2], [1.0, 0.7, -0.6], 36),    // Zapfsäule
    sh(A.rDavon - 0.4, [1.6, 0.9, 2.0], [0.2, 0.3, -0.6], 37),     // Benziner zieht davon
    sh(A.rBenziner2 + 2.2, [0.0, 3.4, 5.8], [0.0, 0.2, -2.5], 36), // hoch
    sh(A.w1Doch, [-1.3, 1.5, 2.6], [-0.55, 0.5, 0.0], 34),         // Wendung 1: Zoom auf den Stromer
    sh(A.w1Halb, [-2.7, 1.5, 2.4], [-1.9, 0.7, -1.5], 36),         // Haus und Wallbox
    sh(A.w245, [-0.5, 2.3, 4.2], [-0.1, 0.35, -0.5], 35),
    sh(A.w2Abst, [0.0, 3.3, 5.6], [0.0, 0.2, -1.2], 36),
    sh(A.w2Runde, [-1.3, 1.5, 3.2], [-1.3, 0.7, -1.0], 36),        // Runde 3: Wallbox am Haus
    sh(A.w2Jetzt - 0.1, [0.0, 1.4, 3.6], [0.0, 0.4, -0.3], 33),    // knapp: enge Einstellung
    sh(A.w3Pro, [0.0, 2.6, 4.6], [0.0, 0.35, -0.6], 35),
    sh(A.w3833, [0.7, 1.6, 3.4], [0.2, 0.4, -0.4], 34),
    sh(A.w3Rueck, [0.0, 1.2, 3.0], [0.0, 0.4, -0.2], 33),
    sh(A.w3Der + 0.3, [0.8, 1.8, 3.4], [0.3, 0.4, -0.4], 34),
    sh(A.kLetzte, [-1.5, 2.2, 4.4], [-1.5, 0.9, -2.2], 36),        // Kipp: Haus mit Solardach voraus
    sh(A.kDach + 0.3, [-2.1, 1.6, 2.2], [-2.0, 1.0, -0.6], 36),    // Module leuchten auf
    sh(A.k18 + 0.4, [0.0, 2.8, 5.0], [0.0, 0.3, -1.2], 36),
    sh(A.kBeide + 0.2, [0.0, 1.5, 3.4], [0.0, 0.4, -0.3], 33),
    sh(A.kUnd, [0.0, 1.3, 2.9], [0.0, 0.4, -0.2], 32),            // „Und am Ende …“: ganz nah
    sh(A.kVorn + 0.4, [-0.8, 1.9, 4.2], [-0.5, 0.4, -0.4], 36),
    sh(A.eEnd + 0.3, [0.0, 3.6, 6.8], [0.0, 0.2, -1.8], 36),      // Ergebnis: Totale
    sh(A.e1275 + 0.4, [-0.9, 2.0, 4.0], [-0.5, 0.4, -0.3], 35),
    sh(A.eSaeule + 0.3, [0.9, 2.2, 4.4], [0.4, 0.3, -0.5], 35),
    sh(A.wWarum, [0.0, 3.0, 5.4], [0.0, 0.3, -1.0], 36),          // Warum: ruhige Fahrt
    sh(A.wDen + 0.6, [0.0, 2.2, 4.6], [0.0, 0.3, -0.8], 36),
    sh(A.pUnd, [-1.1, 2.0, 4.0], [-0.8, 0.5, -0.8], 35),          // Pointe: zurück zu Runde 3
    sh(A.pReicht - 0.2, [-1.6, 1.5, 3.0], [-1.3, 0.6, -0.6], 35),
    sh(A.sNicht - 0.3, [0.0, 3.2, 6.6], [0.0, 0.25, -2.2], 36),
    sh(DAUER, [0.0, 3.6, 7.4], [0.0, 0.25, -2.6], 37),            // Schlusskarte: Welt dunkelt ab, Kamera weitet
  ];
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const z0 = zc(t);
    const rel = (v, j) => v[j];
    const ziel = [lerp(a.ziel[0], b.ziel[0], p), lerp(a.ziel[1], b.ziel[1], p), z0 + lerp(a.ziel[2], b.ziel[2], p)];
    const pos = [lerp(a.pos[0], b.pos[0], p), lerp(a.pos[1], b.pos[1], p), z0 + lerp(a.pos[2], b.pos[2], p)];
    const K = 1.75; // Abstand: beide Wagen bleiben im Hochformat im Bild
    const pk = pos.map((v, j) => ziel[j] + (v - ziel[j]) * K);
    return { pos: pk, ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.28 });
  regie.zoom({ t: A.w1Doch, ziel: (t) => [-0.55, 0.5, zc(t)], staerke: 0.22, halt: 1.2, rueck: 0.6 });   // Wendung 1: Zoom auf den Stromer
  regie.zoom({ t: A.kUnd, ziel: (t) => [0, 0.4, zc(t)], staerke: 0.2, halt: 1.4, rueck: 0.6 });         // „Und am Ende …“
  regie.zoom({ t: A.kLiegt + 0.1, ziel: (t) => [-0.55, 0.4, zc(t)], staerke: 0.2, halt: 1.0, rueck: 0.7 }); // Stromer vorn
  regie.zoom({ t: A.p3000 + 0.2, ziel: (t) => [-0.55, 0.5, zc(t)], staerke: 0.16, halt: 1.2, rueck: 0.7 }); // Prämie

  // ---------- Zustand auf die Welt anwenden ----------
  const post = { ...GRADING.nacht, belichtung: 1.2, bloomStaerke: 0.9, bloomSchwelle: 1.0, tiltMitte: 0.5, tiltBreite: 0.34, tiltStaerke: 0.5, vignette: 0.36, strahlen: 0.14, strahlenSchwelle: 1.3, strahlenLaenge: 0.7, strahlenAbfall: 0.96, strahlenFarbe: [1, 0.85, 0.7], strahlenPunkt: [0, 6, -6] };
  const moon = rig.mond, hemi = rig.hemi;
  const bis = (x, a, b) => clamp((x - a) / (b - a));
  const tmp = new THREE.Vector3();
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t), z0 = zc(t);
      const g = fuehrung(s.gap);                 // > 0: Benziner vorn
      const zS = z0 + g / 2, zB = z0 - g / 2;
      autoS.position.set(-0.55, 0, zS); autoB.position.set(0.55, 0, zB);
      spurS.setze(clamp((14 - zS) / (LAENGE + 24)), 0.05); spurB.setze(clamp((14 - zB) / (LAENGE + 24)), 0.05);
      // Spot-Wechsel: der Führende leuchtet, dazu Hook, Denkfalle, Kipp und Prämie
      const lB = 0.35 + 0.7 * huckel(t, A.fKlar - 0.1, A.fKlar + 0.6, A.fOder + 0.4, A.fOder + 1.1) + 0.4 * bis(s.gap, 0, GAP1) * bis(t, A.rRunde, A.rRunde + 3) * (1 - bis(t, A.kGleich, A.kVorn));
      const lS = 0.35 + 0.8 * bis(-s.gap, 0, 600) + 0.8 * huckel(t, A.w1Doch, A.w1Doch + 0.6, A.w1Halb + 0.4, A.w1Halb + 1.2) + 0.6 * puls(t, A.kVorn, 1.8) + 0.8 * puls(t, A.pReicht, 1.8) + 0.5 * puls(t, A.e1275, 1.2);
      lichtS.intensity = 7 * Math.min(1.6, lS); lichtB.intensity = 7 * Math.min(1.6, lB);
      lichtS.position.set(-0.55, 1.6, zS); lichtB.position.set(0.55, 1.6, zB);
      kegelS.visible = lS > 0.45; kegelB.visible = lB > 0.45;
      kegelS.material.uniforms.staerke.value = 0.34 * Math.min(1.4, lS); kegelB.material.uniforms.staerke.value = 0.34 * Math.min(1.4, lB);
      kegelS.position.set(-0.55, 3.2, zS); kegelB.position.set(0.55, 3.2, zB);
      // Schilder über den Wagen: Preis (Regeln), danach laufender Kostenzähler
      const tS = A.r4599, tB = A.r3779;
      const schildS = huckel(t, tS - 0.1, tS + 0.5, A.rRunde - 0.4, A.rRunde + 0.2) + glatt(t, A.rRunde, A.rRunde + 0.6) * (1 - glatt(t, A.sNicht - 0.4, A.sNicht + 0.2)) * (1 - glatt(t, A.eEnd - 0.3, A.eEnd + 0.3) * 0);
      const schildB = huckel(t, tB - 0.1, tB + 0.5, A.rRunde - 0.4, A.rRunde + 0.2) + glatt(t, A.rRunde, A.rRunde + 0.6) * (1 - glatt(t, A.sNicht - 0.4, A.sNicht + 0.2));
      anhS.position.set(-0.55, 0.95, zS); anhB.position.set(0.55, 0.95, zB);
      anhS.scale.setScalar(0.5 * clamp(schildS) + 0.001); anhB.scale.setScalar(0.5 * clamp(schildB) + 0.001);
      anhS.visible = schildS > 0.01; anhB.visible = schildB > 0.01;
      anhS.text(t < A.rRunde ? "45.990 €" : `${de(s.S)} €`); anhB.text(t < A.rRunde ? "37.790 €" : `${de(s.B)} €`);
      anhS.glimm(0.4 * puls(t, A.r4599, 1.0) + (s.gap < 0 ? 0.8 : 0.1) + 0.5 * puls(t, A.kVorn, 1.4));
      anhB.glimm(0.4 * puls(t, A.r3779, 1.0) + (s.gap > 0 ? 0.8 : 0.1) + 0.5 * puls(t, A.fBill, 1.0));
      // Stationen: Leuchtleisten pulsieren, wenn der Wagen vorbeikommt oder genannt wird
      ladeS1.led(0.6 + 0.8 * puls(t, A.r60, 1.0)); ladeS2.led(0.6 + 0.8 * puls(t, A.w1unter - 0.4, 1.0));
      haus2.led(0.5 + 0.9 * puls(t, A.w1Halb, 1.0)); haus3.led(0.5 + 0.9 * puls(t, A.w2nur, 1.0) + 0.5 * puls(t, A.w235, 0.8));
      haus4.led(0.3); haus4.solar(0.35 + 1.2 * huckel(t, A.kDach - 0.3, A.kDach + 0.6, A.kVorn + 1.0, A.kVorn + 2.5));
      haus5.led(0.4 + 0.9 * puls(t, A.pReicht, 1.4)); haus5.solar(0);
      // Himmel und Luft folgen den Wagen
      him.position.set(0, 0, z0); nebel.position.set(0, 0, z0 - 1);
      moon.target.position.set(0, 0, z0 - 1); moon.position.set(-2.5, 6.5, z0 + 3); moon.target.updateMatrixWorld();
      // Nachbearbeitung: Strahlen und Glow steigen bis zum Kipp-Moment, danach Sieger-Glow
      const spann = bis(t, A.w1Doch, A.kVorn);
      post.bloomStaerke = 0.9 + 0.2 * spann + 0.3 * puls(t, A.kVorn, 1.6);
      post.strahlen = 0.12 + 0.34 * spann * (1 - bis(t, A.eEnd + 1.0, A.wWarum)) + 0.15 * puls(t, A.kVorn, 1.8) + 0.18 * puls(t, A.pReicht, 1.8);
      tmp.set(lerp(0.55, -0.55, clamp(0.5 - Math.sign(s.gap) * 0.5)), 1.2, zc(t) - 6); post.strahlenPunkt = [tmp.x, tmp.y, tmp.z];
      post.splitBalance = 0.02 + 0.2 * clamp(-s.gap / 1500, -1, 1);
      // Abspann: Welt dunkelt zur Schlusskarte
      post.belichtung = 1.2 - 0.34 * bis(t, A.sNicht - 0.2, A.sNicht + 0.9) + 0.06 * puls(t, A.kVorn, 1.4);
      regie.anwenden(t);
    },
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "tief",
    werte: (t) => { const s = SW(t); return { a: s.S, b: s.B }; },
    uhr: { ein: A.rRunde, zeit: (t) => SW(t).km, format: (v) => de(v), label: "KM" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 ? 0 : fuehrerAlt.call(this, w); }; // „VORN“ erst, wenn beide Seiten einen Wert haben
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  // Statuszeile (mitlaufend): Runde und Ladeort
  chip("RUNDE 0 · 0 KM", 0.05, A.rRunde - 0.5, "akzent", "hell");
  chip("RUNDE 1/4 · SÄULE 60 CT", A.rRunde - 0.05, A.w1Doch - 0.5, "a", "voll");
  chip("RUNDE 2/4 · GEMISCHT 45 CT", A.w245 - 0.1, A.w2Runde - 0.5, "a", "voll");
  chip("RUNDE 3/4 · ZU HAUSE 35 CT", A.w2Runde - 0.05, A.kLetzte - 0.5, "a", "voll");
  chip("RUNDE 4/4 · SOLAR 18 CT", A.kLetzte - 0.05, A.eEnd - 0.6, "a", "voll");
  chip("RUNDE 3/4 · ZU HAUSE 35 CT", A.pUnd - 0.05, A.sNicht - 0.6, "a", "voll");
  // Regeln und Köder
  chip("15.000 KM / JAHR", A.r15 - 0.05, A.rGez - 0.5, "akzent", "hell", 490);
  chip("WERTVERLUST · VERSICHERUNG", A.rGez - 0.05, A.fKlar - 0.1, "akzent", "hell", 490);
  chip("WERKSTATT · ENERGIE", A.rWert - 0.15, A.fKlar - 0.1, "akzent", "hell", 590);
  chip("8.200 € BILLIGER", A.f8200 - 0.05, A.rRunde - 0.1, "b", "voll", 490);
  chip("BENZIN 2,23 € / L", A.rBenzin - 0.05, A.w1Nach - 0.1, "b", "voll", 590);
  chip("842,50 € / MONAT", A.w3842 - 0.1, A.w3Nach - 0.1, "a", "voll", 590);
  chip("833,75 € / MONAT", A.w3833 - 0.1, A.w3Nach - 0.1, "b", "voll", 710);
  chip("− 3.000 € PRÄMIE", A.p3000 - 0.1, A.sNicht - 0.7, "a", "voll", 590);
  // Abstand zwischen den Wagen (y = 466): wer vorn liegt, wechselt die Farbe
  const vorsB = (t) => Math.max(0, SW(t).S - SW(t).B), vorsS = (t) => Math.max(0, SW(t).B - SW(t).S);
  M.zaehler({ wert: vorsB, einheit: " €", nk: 0, max: 99999, team: "b", art: "voll", label: "VORSPRUNG BENZINER", x: SICHER.mitte, y: 515, ein: A.rNur + 1.2, aus: A.kLiegt - 0.55, anker: "mitte" });
  M.zaehler({ wert: vorsS, einheit: " €", nk: 0, max: 99999, team: "a", art: "voll", label: "VORSPRUNG STROMER", x: SICHER.mitte, y: 515, ein: A.kLiegt - 0.05, aus: A.eEnd - 0.6, anker: "mitte" });
  M.zaehler({ wert: vorsB, einheit: " €", nk: 0, max: 99999, team: "b", art: "voll", label: "VORSPRUNG BENZINER", x: SICHER.mitte, y: 515, ein: A.pUnd + 0.3, aus: A.p3000 - 0.35, anker: "mitte" });
  M.zaehler({ wert: vorsS, einheit: " €", nk: 0, max: 99999, team: "a", art: "voll", label: "VORSPRUNG STROMER", x: SICHER.mitte, y: 515, ein: A.p3000 + 0.15, aus: A.sNicht - 0.7, anker: "mitte" });
  // Endstand: zwei Karten (Solar, Säule), Erklärgrafik „Warum?“, Pointe-Karte am Ende
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "ENDSTAND · SOLAR 18 CT", ein: A.eEnd + 0.3, aus: A.eAn - 0.5,
    zeilen: [{ label: "STROMER", wert: Math.round(S18), einheit: "€", team: "a", ein: A.eMit + 0.3 }, { label: "BENZINER", wert: Math.round(B_END), einheit: "€", team: "b", ein: A.eMit + 1.0 }],
    differenz: { label: "STROMER SPART", wert: Math.round(Z.v18 * -1), einheit: "€", ein: A.e1275 - 0.1 } });
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "ENDSTAND · NUR SÄULE 60 CT", ein: A.eAn + 0.05, aus: A.wWarum - 0.1,
    zeilen: [{ label: "STROMER", wert: Math.round(S60), einheit: "€", team: "a", ein: A.eAn + 0.3 }, { label: "BENZINER", wert: Math.round(B_END), einheit: "€", team: "b", ein: A.eSaeule + 0.1 }],
    differenz: { label: "BENZINER SPART", wert: Math.round(Z.v60), einheit: "€", ein: A.e3225 - 0.1 } });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.wWarum + 0.3, aus: A.pUnd - 0.7, max: 8200,
    faktoren: [
      { label: "AUFPREIS STROMER BEIM KAUF · €", ein: A.w8200 - 0.1, a: { wert: Z.kaufDiff, text: "8.200" }, b: { wert: 0, text: "0" }, tag: "STARTNACHTEIL", tagEin: A.wStart },
      { label: "STROM: SOLAR GEGEN SÄULE · €", ein: A.wDen - 0.1, a: { wert: Z.spanne, text: "4.500" }, b: { wert: 0, text: "0" }, tag: "HOLT AUF", tagEin: A.wBill },
    ] });
  M.titel({ woerter: [{ text: "STROMER", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "BENZINER", ein: -0.3, team: "b" }, { umbruch: true }, { text: "WER FÄHRT BILLIGER?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: A.r15 - 0.5 });
  M.pointe({ woerter: [{ text: "NICHT DER MOTOR", ein: A.sNicht, farbe: "akzent" }, { umbruch: true }, { text: "ENTSCHEIDET.", ein: A.sEnt, farbe: "akzent" }, { umbruch: true }, { text: "SONDERN DIE", ein: A.sSond, farbe: "akzent" }, { umbruch: true }, { text: "STECKDOSE.", ein: A.sSteck, farbe: "a" }], ein: A.sNicht, y: 470, groesse: 88 });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "pop", "Wagen rollen an, Scheinwerfer, Lichtspuren hinter beiden Wagen"); ev(1.4, "klick", "Kamera schiebt sich heran, Laternen ziehen vorbei"); ev(A.hGegen, "klick", "Titel läuft, Lichtkegel streicht über die Dächer"); ev(A.h5, "whoosh", "Kamera schwenkt näher an die Wagen"); ev(3.0, "klick", "Wagen ziehen an den Laternen vorbei, Lichtspuren länger"); ev(4.1, "klick", "Titel blendet aus, Tafel bleibt");
  ev(A.r15, "whoosh", "Kamera weitet, Chip 15.000 km"); ev(5.8, "klick", "Kamera gleitet zum Stromer, Laternen ziehen vorbei"); ev(6.5, "klick", "Kamera sinkt, Preisschild kündigt sich an"); ev(A.rStromer + 0.5, "klick", "Kamera auf den Stromer (Cyan)"); ev(A.r4599, "ding", "Preisschild 45.990 € über dem Stromer");
  ev(A.rBenz + 0.5, "klick", "Kamera auf den Benziner (Orange)"); ev(A.r3779, "ding", "Preisschild 37.790 € über dem Benziner"); ev(A.rGez, "whoosh", "Kamera zurück, Chips Wertverlust, Versicherung"); ev(A.rWert, "klick", "Chips Werkstatt, Energie");
  ev(A.fKlar, "whoosh", "Lichtkegel und Spot auf den Benziner"); ev(A.f8200, "ding", "Chip 8.200 € billiger, Benziner leuchtet"); ev(A.fOder, "klick", "Licht hält, Kamera ruhig");
  ev(A.rRunde, "whoosh", "Runde 1: Wagen beschleunigen, Kilometer- und Kostenzähler laufen"); ev(A.r60, "ding", "Ladesäule links (60 ct) leuchtet auf"); ev(A.rBenzin, "ding", "Zapfsäule rechts mit Dach, Chip 2,23 €/L");
  ev(A.rBenzin + 1.5, "klick", "Benziner schiebt sich nach vorn"); ev(A.rDavon, "ding", "Benziner zieht sichtbar davon, Vorsprung läuft"); ev(A.rBenziner2 + 1.2, "klick", "Kamera steigt, Vorsprung wächst");
  ev(A.w1Nach, "whoosh", "Kamera hoch, Zähler bei 75.000 km"); ev(A.w13225, "ding", "Vorsprung Benziner 3.225 €"); ev(A.w1Doch, "whoosh", "Zoom auf den Stromer, Lichtwechsel auf Cyan"); ev(A.w1Halb, "ding", "Haus mit Wallbox am Straßenrand, Wallbox leuchtet"); ev(A.w1unter, "klick", "zweite Ladesäule im Bild");
  ev(A.w245, "ding", "Stromer-Zähler fällt (45 ct)"); ev(A.w2Abst + 0.2, "klick", "Abstand schrumpft"); ev(A.w21725, "ding", "Abstand 1.725 €"); ev(A.w2Runde, "whoosh", "Runde 3: Haus mit Wallbox"); ev(A.w235, "ding", "Wallbox leuchtet (35 ct), Zähler fällt");
  ev(A.w2Jetzt, "whoosh", "Kamera enger, Wagen nah beieinander"); ev(A.w2knapp, "klick", "Zähler nahezu gleich, Abstand pulsiert");
  ev(A.w3Pro, "whoosh", "Kamera hoch, Monatschips"); ev(A.w3842, "ding", "Chip 842,50 € pro Monat"); ev(A.w3833, "ding", "Chip 833,75 € pro Monat"); ev(A.w3Nach, "klick", "Kamera tief, Rückstand 525 €"); ev(A.w3525, "ding", "Abstand 525 €"); ev(A.w3Der + 0.4, "klick", "Orange noch vorn, Strahlen steigen");
  ev(A.kLetzte, "whoosh", "Runde 4: Kamera auf das Haus mit Solardach"); ev(A.kDach, "ding", "Solarmodule leuchten auf, Cyan-Glühen"); ev(A.k18, "klick", "18 ct, Status Runde 4/4"); ev(A.kBeide, "whoosh", "Kamera eng, Zähler fast gleich"); ev(A.kUnd, "klick", "Zoom, Stille: Zähler dicht beieinander");
  ev(A.kLiegt, "ding", "Führungswechsel: Stromer-Zähler fällt unter den Benziner, Tafel springt auf Cyan"); ev(A.kVorn, "whoosh", "Stromer fährt vor, Glow und Zoom");
  ev(A.eEnd, "whoosh", "Kamera zurück, Endstand-Karte Solar"); ev(A.e1275, "ding", "Stromer spart 1.275 €"); ev(A.eAn, "whoosh", "Wechsel auf nur Säule, Stromer-Zähler steigt"); ev(A.e3225, "ding", "Benziner spart 3.225 €");
  ev(A.wWarum, "whoosh", "Erklärgrafik Warum"); ev(A.w8200, "ding", "Balken Aufpreis 8.200 €"); ev(A.wDen, "klick", "Balken Solar gegen Säule 4.500 €");
  ev(A.pUnd, "whoosh", "Rückblende zu Runde 3, Haus mit Wallbox"); ev(A.p3000, "ding", "Prämie 3.000 € fällt auf den Stromer, Zähler 47.550 €"); ev(A.pReicht, "ding", "Stromer vorn, Vorsprung 2.475 €");
  ev(A.sNicht, "akzent", "Welt dunkelt ab, Schlusskarte: Nicht der Motor entscheidet"); ev(A.sSteck, "akzent", "STECKDOSE in Cyan");

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); }; // nur HUD (für qc/text_ueberlappung.mjs)
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
