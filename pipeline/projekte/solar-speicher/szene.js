// „Solaranlage mit Speicher oder ohne: Was bringt dir mehr Geld?“ · Stil 19 Architekturmodell (Abendlicht), Simulierbar 04.11.2026 mittag.
// Lena (türkis, Anlage ohne Akku) und Jonas (orange, mit 8-kWh-Akku im aufgeschnittenen Keller) haben zwei identische Einfamilienhaus-
// Modelle auf einer Sperrholzplatte. Lichtströme in Teamfarbe zeigen Dach → Haus, Dach → Netz (Strommast am Plattenrand) und Dach → Akku.
// Alle Werte kommen aus pipeline/sim/solar_speicher.mjs (Tests: solar_speicher.test.mjs); das Jahr läuft als Zeitraffer an den gesprochenen
// Zwischenständen entlang, Tag und Nacht wechseln im Zeitraffer. „Warum?“ als Blaupause (Stil 13). Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { SimBuehne, GRADING, rigAbendsonne, dunst, lichtKegel, lichtBahn, staub, buendeln, fokus, aktualisiere, leuchtMat } from "../../engine/sim_atmosphaere.js";
import { modellPlatte, modellBaum, modellFigur, abendWand, solarHaus, strommast, leitung, lichtStrom, ringAnzeige, preisSchild, geldSaeule } from "../../engine/stil_architektur.js";
import { blaupausePapier, koerper, linien, fuellung, FUELL } from "../../engine/stil_blaupause.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { P, ohne, mit, mehr, abstand } from "../../sim/solar_speicher.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Licht, Ströme, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const LENA = "#2EC4B6";
const JONAS = "#FF8A3D";
const AKZENT = "#ECE6DA";

// ---------- Rechnung (aus sim/solar_speicher.mjs) ----------
const L_JAHR = ohne(), J_JAHR = mit(), MEHR = mehr();
const UNAB = { lena: P.autOhne, jonas: P.autMit }; // 37,4 % und 78,7 % (HTW-Tabellen)
const PLUS = MEHR / L_JAHR; // +37,8 % → „+38 %“

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
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

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
      a: { name: "LENA", farbe: LENA, woerter: ["Lena*", "Einspeisung*", "Netz*"] },
      b: { name: "JONAS", farbe: JONAS, woerter: ["Jonas*", "Akku*", "Speicher*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    sonne: T("hook:Sonne"), akkuHook: T("hook:Akku"), lohnt: T("hook:Lohnt"),
    zehn: T("regeln:10"), v4000: T("regeln:4.000"), lenaR: T("regeln:Lena"), ueber: T("regeln:Überschuss"), c77: T("regeln:7,7"), jonasR: T("regeln:Jonas"),
    c4800: T("regeln:4.800"), extra: T("regeln:extra"), akkuR: T("regeln:Akku"),
    klar: T("falle:Klar"), haushoch: T("falle:haushoch"), oder: T("falle:Oder"),
    folg: T("folgen:Folg"), verpasst: T("folgen:verpasst"),
    jahr1: T("rennen:Jahr"), jonasRen: T("rennen:Jonas"), aber: T("rennen:Aber"), minus: T("rennen:Minus"),
    merk: T("wendung1:Merkwürdige"), sein: T("wendung1:Sein"), verdoppelt: T("wendung1:verdoppelt"), unab: T("wendung1:Unabhängigkeit"), v37: T("wendung1:37"), v79: T("wendung1:79"),
    prozent: T("wendung1:Prozent"), aber2: T("wendung1:Aber"), geld: T("wendung1:Geld"), waechst: T("wendung1:wächst"), drittel: T("wendung1:Drittel"),
    jahr5: T("wendung2:Jahr"), j5: T("wendung2:5"), j8: T("wendung2:8"), j10: T("wendung2:10"), lenaVorn: T("wendung2:Lena"), erst: T("wendung2:Erst"), elften: T("wendung2:elften"), zieht: T("wendung2:zieht"), vorbei: T("wendung2:vorbei"),
    v15: T("wendung3:15"), akkuEnde: T("wendung3:Akku"), ende: T("wendung3:Ende"),
    endstand: T("ergebnis:Endstand"), v20: T("ergebnis:20"), lenaE: T("ergebnis:Lena"), n24: T("ergebnis:24.620"), jonasE: T("ergebnis:Jonas"), n26: T("ergebnis:26.802"), der: T("ergebnis:Der"), n2182: T("ergebnis:2.182"),
    warum: T("warum:Warum"), jede: T("warum:Jede"), kwh: T("warum:Kilowattstunde"), akkuW: T("warum:Akku"), fehlt: T("warum:fehlt"), einsp: T("warum:Einspeisung"), und: T("warum:Und"), sechstel: T("warum:Sechstel"), geht: T("warum:geht"), verloren: T("warum:verloren"),
    verrueckt: T("ueberraschung:Verrückte"), kostet: T("ueberraschung:Kostet"), p6600: T("ueberraschung:6.600"), keine: T("ueberraschung:keine"), v400: T("ueberraschung:400"), bei: T("ueberraschung:Bei"), p3000: T("ueberraschung:3.000"), fast: T("ueberraschung:fast"), v4000e: T("ueberraschung:4.000"),
    gleiche: T("merksatz:Gleiche"), unterschied: T("merksatz:Unterschied"), preis: T("merksatz:Preis"), keller: T("merksatz:Keller"),
    sonneM: T("merksatz:Sonne"), dachM: T("merksatz:Dach"),
    schluss: T("schluss:Was"),
  };
  const T_SCHLEIFE = A.schluss - 0.3;

  // ---------- Zeitachse des Modells: Jahre (Zeitraffer, an den gesprochenen Zwischenständen) ----------
  const jahrRoh = pchip([
    [0, 0], [A.jahr1, 0], [A.jahr1 + 0.5, 0.06], [A.jonasRen + 1.2, 1.0], [A.jahr5 + 0.05, 1.0],
    [A.j5 + 0.14, 5.0], [A.j5 + 0.62, 5.0], [A.j8 + 0.2, 8.0], [A.j8 + 0.62, 8.0], [A.j10 + 0.3, 10.0], [A.elften - 0.1, 10.0],
    [A.elften + 0.06, 10.02], [A.elften + 0.4, 10.36], [A.elften + 0.72, 11.0], [A.v15 - 0.4, 11.0], [A.v15 + 0.15, 15.0], [A.v15 + 0.8, 15.0],
    [A.ende + 0.5, 17.0], [A.v20 + 0.4, 20.0], [DAUER, 20.0],
  ]);
  let T_GLEICH = A.elften + 0.4; // Führungswechsel: Jonas überholt (Jahr 10,31)
  for (let t = A.elften; t < A.zieht + 1; t += 1 / 120) if (jahrRoh(t) >= P.akku / MEHR) { T_GLEICH = t; break; }
  const preisRoh = (t) => P.akku * glatt(t, A.c4800 - 0.02, A.c4800 + 0.45) + 1800 * glatt(t, A.p6600 - 0.05, A.p6600 + 0.85) - 3600 * glatt(t, A.p3000 - 0.05, A.p3000 + 0.85);

  // Tag und Nacht (Zeitraffer in der Wendung 2: zwei Tage, danach genau wieder der Abend vom Anfang)
  const TAG0 = A.jahr5 + 0.03, TAG1 = A.v15 - 0.12;

  // Rohzustand der Welt zur Zeit t (nur Zahlen; die Schleife lässt ihn zum Zustand bei t = 0 zurückgleiten)
  const S = (t) => {
    const y = jahrRoh(t);
    const pr = preisRoh(t);
    const L = y * L_JAHR;
    const J = y * L_JAHR + Math.min(y, P.leben) * MEHR - pr;
    const th = 4 * Math.PI * glatt(t, TAG0, TAG1);
    const e = 0.2 + 0.78 * Math.sin(th);
    const d = sstep(-0.12, 0.2, e);
    const dSpaet = sstep(-0.12, 0.2, 0.2 + 0.78 * Math.sin(4 * Math.PI * glatt(t - 0.5, TAG0, TAG1)));
    const akkuAktiv = 1 - glatt(t, A.v15 + 0.9, A.ende + 0.3);
    const boostL = huckel(t, A.lenaR - 0.05, A.lenaR + 0.4, A.c77 + 0.9, A.c77 + 1.6);
    const boostJ = huckel(t, A.c4800 + 0.3, A.c4800 + 0.8, A.klar - 0.1, A.klar + 0.5);
    const zehn = huckel(t, A.zehn - 0.02, A.zehn + 0.35, A.v4000 + 0.5, A.v4000 + 1.6);
    const flashJ = huelle2(t, T_GLEICH, 1.1);
    const bias = 0.61 * glatt(t, A.ende + 0.4, A.endstand + 0.2) * (1 - glatt(t, A.p6600 - 0.05, A.p6600 + 0.85));
    return {
      y, L, J, pr, th, e, d, dSpaet, akkuAktiv, T: t,
      jahrAnz: Math.max(1, Math.ceil(y - 1e-6)),
      diff: J - L + bias,
      // Ströme
      lH: d * (0.55 + 0.1 * zehn), lN: d * (0.65 + 0.35 * boostL + 0.2 * zehn), lNH: (1 - d) * 0.9,
      jH: d * (0.55 + 0.1 * zehn), jA: d * akkuAktiv * (0.7 + 0.3 * boostJ + 0.2 * zehn), jN: d * (0.3 + 0.35 * (1 - akkuAktiv) + 0.2 * zehn), jAH: (1 - d) * 0.9 * akkuAktiv,
      // Paneele und Fenster
      panL: 0.14 + 0.5 * d + 0.9 * zehn + 0.2 * boostL + 0.8 * (huelle2(t, A.sonneM, 0.9, 0.3) + huelle2(t, A.dachM, 0.9, 0.3)), panJ: 0.14 + 0.5 * d + 0.9 * zehn + 0.2 * boostJ + 1.0 * flashJ + 0.7 * huelle2(t, A.n26 + 1.0, 1.0, 0.3) + 0.8 * (huelle2(t, A.sonneM, 0.9, 0.3) + huelle2(t, A.dachM, 0.9, 0.3)),
      fen: 0.55 * (1 - d) + 0.22,
      // Akku: Ladestand folgt der Sonne, Aufleuchten bei „Akku“, Ende bei „am Ende“
      akkuLade: (0.3 + 0.62 * dSpaet) * akkuAktiv * (0.45 + 0.55 * glatt(t, A.akkuHook, A.akkuHook + 0.9)),
      akkuGlimm: (0.1 + 0.9 * huelle2(t, A.akkuHook, 1.4, 0.0) + 0.7 * huelle2(t, A.akkuR, 1.2, 0.0) + 0.5 * boostJ + 0.35 * flashJ) * akkuAktiv,
      // Ringe und Balken (Wendung 1)
      ringEin: glatt(t, A.unab - 0.2, A.unab + 0.35) * (1 - glatt(t, A.jahr5 - 0.15, A.jahr5 + 0.15)),
      ringL: glatt(t, A.v37 - 0.1, A.v37 + 0.95) * UNAB.lena, ringJ: glatt(t, A.v79 - 0.1, A.v79 + 1.05) * UNAB.jonas,
      barEin: glatt(t, A.aber2 + 0.2, A.geld + 0.45) * (1 - glatt(t, A.jahr5 - 0.15, A.jahr5 + 0.15)), barJ: glatt(t, A.waechst - 0.1, A.drittel + 0.2),
      // Kegel, Licht
      spotJ: huckel(t, A.klar - 0.1, A.klar + 0.5, A.oder - 0.1, A.oder + 0.4) + 0.8 * huelle2(t, T("ueberraschung:bleiben") - 0.1, 1.0, 0.3),
      spotErg: huckel(t, A.endstand, A.endstand + 0.7, A.n2182 + 1.3, A.n2182 + 2.2) * 0.7 + 0.5 * huelle2(t, A.n2182, 1.4, 0.4) + 0.4 * huelle2(t, A.der, 1.2, 0.4),
      glueh: huelle2(t, A.n2182, 1.6, 0.3),
      // Preisschild
      schildEin: glatt(t, A.kostet - 0.1, A.kostet + 0.45) * (1 - glatt(t, A.gleiche, A.gleiche + 0.6)),
      schildDreh: glatt(t, A.p6600 - 0.05, A.p6600 + 0.7) * Math.PI * 2 + glatt(t, A.p3000 - 0.05, A.p3000 + 0.7) * Math.PI * 2,
      schildTxt: t < A.p6600 + 0.25 ? 0 : t < A.p3000 + 0.25 ? 1 : 2,
      warm: glatt(t, A.klar, A.v15) * 0.4 + glatt(t, A.v15, A.n2182) * 0.6 - 0.6 * glatt(t, A.warum, A.warum + 3),
    };
  };
  const SW = M.wert(S);
  M.schleife({ ab: T_SCHLEIFE });
  function huelle2(t, ein, dauer, lang = 0.5) { const k = fortschritt(t, ein, ein + 0.25); return k * (1 - glatt(t, ein + dauer * (1 - lang), ein + dauer + 0.2)); }

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = abendWand();
  dunst(szene, "#2A2128", 0.006);
  const SONNE = [-0.62, 0.2, -0.76];
  const rig = rigAbendsonne(szene, buehne.renderer, { richtung: SONNE, ziel: [0, 0, 0], bereich: 11, schatten: SCHATTEN, farbe: "#FFC283", staerke: 5.0, himmel: "#9FB0CC", boden: "#5A4636", himmelStaerke: 0.6, umgebungsStaerke: 0.45 });
  const platte = modellPlatte({ breite: 9.4, tiefe: 12.4, holz: true, strassen: [{ z: 6.2, richtung: "x", breite: 1.1 }] });
  platte.position.set(0, 0, 2.5);
  szene.add(platte);

  // Zwei identische Häuser (Front zur Kamera); Jonas hat den aufgeschnittenen Keller mit dem Akku
  const LX = -1.55, JX = 1.55, HZ = -0.5;
  const hausL = solarHaus({ offen: false, farbe: LENA }); hausL.position.set(LX, 0, HZ); szene.add(hausL);
  const hausJ = solarHaus({ offen: true, farbe: JONAS }); hausJ.position.set(JX, 0, HZ); szene.add(hausJ);
  const akku = hausJ.akku;
  // Strommasten am Plattenrand (vorn und hinten, Kabel dazwischen)
  const MX = 3.35;
  const mastL = strommast({ hoehe: 2.1 }); mastL.position.set(-MX, 0, -0.1); szene.add(mastL);
  const mastJ = strommast({ hoehe: 2.1 }); mastJ.position.set(MX, 0, -0.1); szene.add(mastJ);
  const mastLh = strommast({ hoehe: 2.1 }); mastLh.position.set(-MX, 0, -3.3); szene.add(mastLh);
  const mastJh = strommast({ hoehe: 2.1 }); mastJh.position.set(MX, 0, -3.3); szene.add(mastJh);
  for (const [m, h] of [[mastL, mastLh], [mastJ, mastJh]]) for (const nr of [0, 1, 2]) {
    const a = m.spitze(nr).add(m.position), b = h.spitze(nr).add(h.position);
    szene.add(leitung([a.x, a.y, a.z], [b.x, b.y, b.z], { durchhang: 0.14 }));
  }
  // Umgebung: Bäume, Straße und Figuren als Maßstab (weiß, klein)
  const baeume = [[-3.9, -2.6, 0.7], [-2.6, -2.9, 0.6], [-1.2, -2.7, 0.55], [0.3, -2.9, 0.65], [1.6, -2.7, 0.55], [2.9, -2.9, 0.7], [4.0, -2.3, 0.6], [-3.9, 1.4, 0.55], [3.9, 1.5, 0.6], [-3.9, 4.9, 0.6], [-2.5, 5.0, 0.5], [2.4, 4.95, 0.55], [3.8, 4.9, 0.65], [0.1, 1.9, 0.45]];
  baeume.forEach(([x, z, g], i) => { const b = modellBaum({ groesse: g, seed: i + 3 }); b.position.set(x, 0, z); szene.add(b); });
  for (const [x, z, r] of [[-0.9, 1.3, 0.3], [3.3, 1.9, 0.9], [-3.1, 1.8, -0.8], [0.4, 5.5, 2.4], [-1.6, 5.4, 1.2], [2.2, 6.4, 3.4]]) { const f = modellFigur({ groesse: 0.5 }); f.position.set(x, 0, z); f.rotation.y = r; szene.add(f); }

  // Weltpunkte der Ströme
  const W = (h, v) => [h.position.x + v.x, h.position.y + v.y, h.position.z + v.z];
  const pL = hausL.punkte, pJ = hausJ.punkte, uHz = hausL.userData.tiefe / 2;
  const mastTop = (m) => { const s = m.spitze(1); return [m.position.x + s.x, m.position.y + s.y, m.position.z + s.z]; };
  const stromL_haus = lichtStrom({ farbe: LENA, punkte: [W(hausL, pL.dach), [LX + 0.45, 1.98, HZ + 0.98], [LX + 0.55, 1.5, HZ + 1.12], W(hausL, pL.haus)], kugeln: 4 });
  const stromL_netz = lichtStrom({ farbe: LENA, punkte: [W(hausL, pL.dach), [LX - 0.9, 2.75, HZ + 0.3], [-MX + 0.8, 2.55, HZ + 0.1], mastTop(mastL)], kugeln: 6 });
  const stromL_nacht = lichtStrom({ farbe: LENA, punkte: [mastTop(mastL), [-MX + 0.6, 1.7, HZ + 0.6], [LX - 1.15, 1.2, HZ + uHz + 0.45], W(hausL, pL.haus)], kugeln: 5 });
  const stromJ_haus = lichtStrom({ farbe: JONAS, punkte: [W(hausJ, pJ.dach), [JX + 0.45, 1.98, HZ + 0.98], [JX + 0.55, 1.5, HZ + 1.12], W(hausJ, pJ.haus)], kugeln: 4 });
  const stromJ_netz = lichtStrom({ farbe: JONAS, punkte: [W(hausJ, pJ.dach), [JX + 0.9, 2.75, HZ + 0.3], [MX - 0.8, 2.55, HZ + 0.1], mastTop(mastJ)], kugeln: 4 });
  const stromJ_akku = lichtStrom({ farbe: JONAS, punkte: [W(hausJ, pJ.dach), [JX - 0.6, 2.05, HZ + 1.0], [JX - 0.85, 1.0, HZ + 1.1], [JX - 0.55, 0.55, HZ + 0.3], [JX + 0.3, 0.45, HZ - 0.35]], kugeln: 5 });
  const stromJ_nacht = lichtStrom({ farbe: JONAS, punkte: [[JX + 0.3, 0.55, HZ - 0.3], [JX + 0.95, 0.6, HZ + 0.5], [JX + 0.9, 1.1, HZ + uHz + 0.45], W(hausJ, pJ.haus)], kugeln: 5 });
  const stroeme = [stromL_haus, stromL_netz, stromL_nacht, stromJ_haus, stromJ_netz, stromJ_akku, stromJ_nacht];
  stroeme.forEach((s) => szene.add(s));

  // Ringe und Balken (Wendung 1) vorn auf der Platte
  const ringZ = 3.3, ringY = 0.85;
  const ringL = ringAnzeige({ radius: 0.62, farbe: LENA }); ringL.position.set(-1.25, ringY, ringZ); szene.add(ringL);
  const ringJ = ringAnzeige({ radius: 0.62, farbe: JONAS }); ringJ.position.set(1.25, ringY, ringZ); szene.add(ringJ);
  const BAR = 1.0; // Höhe der Lena-Säule (1 Jahr)
  const barL = geldSaeule({ breite: 0.17, farbe: LENA }); barL.position.set(-0.17, 0, ringZ); szene.add(barL);
  const barJ = geldSaeule({ breite: 0.17, farbe: JONAS }); barJ.position.set(0.17, 0, ringZ); szene.add(barJ);
  // Preisschild vor dem Keller (Überraschung)
  const schild = preisSchild({ breite: 1.0, hoehe: 0.46, farbe: JONAS }); schild.position.set(JX + 0.5, 0, HZ + 1.55); szene.add(schild);
  // Spot-Kegel für die Denkfalle und das Ergebnis
  const kegelJ = lichtKegel({ hoehe: 5.4, radiusOben: 0.1, radiusUnten: 1.6, farbe: JONAS, staerke: 0.55, streifen: 0.25 }); kegelJ.material = kegelJ.material.clone(); kegelJ.userData.dynamisch = true; szene.add(kegelJ);
  const kegelE = lichtKegel({ hoehe: 5.4, radiusOben: 0.1, radiusUnten: 1.7, farbe: "#FFD7A8", staerke: 0.5, streifen: 0.25 }); kegelE.material = kegelE.material.clone(); kegelE.userData.dynamisch = true; szene.add(kegelE);
  szene.add(staub({ anzahl: 500, bereich: [10, 4, 8], mitte: [0, 2, 0], farbe: "#FFD7A8", groesse: 0.013, staerke: 1.2, aussen: 0.35 }));
  const richt = new THREE.Vector3(...SONNE).normalize();
  for (const [x, z, b, st] of [[-1.5, -3.0, 1.1, 0.07], [2.2, -3.0, 1.4, 0.07]]) {
    const l = lichtBahn({ laenge: 12, breite: b, farbe: "#FFC58A", staerke: st, streifen: 0.6 });
    l.position.set(x + richt.x * 8, richt.y * 8, z + richt.z * 8);
    l.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), richt.clone().negate());
    l.rotateY(Math.PI / 2);
    szene.add(l);
  }
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 220);
  const shot = (t, pos, ziel, fov = 34) => ({ t: typeof t === "number" ? t : T(t), pos, ziel, fov });
  const SH = [
    shot(0, [0.0, 3.9, 22.5], [0.0, 1.5, 0.4], 38),
    shot(A.akkuHook - 0.2, [0.5, 3.7, 20.0], [0.3, 1.4, 0.2], 38),
    shot(4.7, [0.0, 3.5, 17.5], [0.0, 1.3, 0.0], 38),
    shot(A.zehn + 0.2, [0.0, 4.6, 20.0], [0.0, 1.3, 0.2], 38),
    shot(A.lenaR - 0.1, [-1.6, 4.0, 15.5], [-2.0, 1.4, -0.3], 38),
    shot(A.c77 + 0.2, [-1.7, 4.4, 17.0], [-2.4, 1.5, -0.3], 38),
    shot(A.jonasR - 0.5, [-1.7, 4.4, 17.0], [-2.4, 1.5, -0.3], 38),
    shot(A.jonasR - 0.1, [1.8, 3.5, 15.0], [1.9, 1.1, 0.0], 38),
    shot(A.akkuR + 0.1, [1.9, 2.7, 11.8], [1.9, 0.8, 0.0], 38),
    shot(A.klar, [1.8, 3.4, 12.5], [1.8, 1.2, 0.0], 36),
    shot(A.oder + 0.5, [1.4, 3.8, 13.5], [1.5, 1.1, 0.0], 36),
    shot(A.folg + 0.2, [0.0, 5.0, 20.5], [0.0, 1.2, 0.2], 38),
    shot(A.jahr1, [-0.4, 4.8, 19.5], [0.0, 1.2, 0.2], 38),
    shot(A.aber, [0.8, 4.2, 17.5], [1.2, 1.0, 0.0], 38),
    shot(A.merk, [0.0, 5.4, 19.5], [0.0, 0.9, 1.4], 38),
    shot(A.v79 + 0.6, [0.0, 4.8, 18.0], [0.0, 0.9, 1.6], 38),
    shot(A.jahr5 - 0.3, [0.0, 5.8, 22.0], [0.0, 1.2, 0.0], 38),
    shot(A.j10 + 0.1, [-0.6, 5.0, 19.0], [-0.4, 1.2, 0.0], 38),
    shot(A.elften - 0.4, [0.9, 4.2, 16.5], [1.4, 1.2, 0.0], 38),
    shot(A.zieht + 0.4, [1.8, 3.8, 14.5], [1.8, 1.2, 0.0], 38),
    shot(A.v15, [1.6, 3.0, 13.5], [1.8, 0.8, 0.0], 38),
    shot(A.endstand + 0.3, [0.4, 4.4, 17.5], [1.0, 1.3, 0.0], 38),
    shot(A.jonasE, [1.4, 4.0, 16.5], [1.6, 1.3, 0.0], 38),
    shot(A.warum - 0.2, [0.4, 4.2, 17.5], [0.8, 1.2, 0.0], 38),
    shot(A.verrueckt, [1.8, 3.8, 15.5], [1.9, 0.8, 0.8], 38),
    shot(A.kostet + 0.4, [2.0, 2.8, 11.5], [2.0, 0.8, 0.6], 38),
    shot(A.p3000, [2.0, 3.2, 12.5], [2.0, 0.8, 0.6], 38),
    shot(A.gleiche + 0.2, [1.0, 4.2, 17.5], [1.0, 1.0, 0.2], 38),
    shot(A.unterschied, [0.4, 5.0, 21.0], [0.2, 1.2, 0.3], 38),
    shot(T_SCHLEIFE, [0.0, 3.9, 22.5], [0.0, 1.5, 0.4], 38),
  ];
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const ziel = a.ziel.map((v, j) => lerp(v, b.ziel[j], p));
    const pos = a.pos.map((v, j) => lerp(v, b.pos[j], p));
    ziel[1] += 0.6; // Szene sitzt etwas tiefer im Bild (oben liegt die Tafel)
    return { pos: pos.map((v, j) => ziel[j] + (v - ziel[j] + (j === 1 ? 0.6 : 0)) * 0.88), ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  regie.zoom({ t: A.v79 - 0.1, ziel: [0.0, 1.1, 3.1], staerke: 0.2, halt: 1.5, rueck: 0.8 });
  regie.zoom({ t: T_GLEICH - 0.2, ziel: [JX, 1.4, HZ], staerke: 0.22, halt: 1.5, rueck: 0.7 });
  regie.zoom({ t: A.n2182 - 0.1, ziel: [JX, 1.3, HZ], staerke: 0.18, halt: 1.5, rueck: 0.8 });
  regie.schleife({ ab: T_SCHLEIFE, ende: DAUER - 1 / FPS });

  // ---------- Zustand auf die Welt anwenden ----------
  const sonne = rig.sonne, hemi = rig.hemi;
  const sonneBasis = new THREE.Color("#FFC283"), sonneHeiss = new THREE.Color("#FFA45C"), sonneNoon = new THREE.Color("#FFE6C4");
  const sonnenPunkt = new THREE.Vector3(...SONNE).normalize().multiplyScalar(60).toArray();
  const post = { ...GRADING.abend, belichtung: 1.02, splitStaerke: 0.24, saettigung: 1.0, kontrast: 1.1, vignette: 0.36, bloomSchwelle: 1.3, lift: [0.004, 0.004, 0.01], strahlen: 0.22, strahlenPunkt: sonnenPunkt, strahlenSchwelle: 1.4, strahlenLaenge: 0.75, strahlenAbfall: 0.97, strahlenFarbe: [1, 0.82, 0.6] };
  const tmp = new THREE.Vector3();
  const mond = new THREE.Color("#8FA8E8"), hemiTag = new THREE.Color("#9FB0CC"), hemiNacht = new THREE.Color("#5A78B0");
  const tempo = 0.33;
  const preisText = ["4.800 €", "6.600 €", "3.000 €"];
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t);
      // Häuser: Paneelen, Fenster, Akku
      hausL.paneele(s.panL); hausJ.paneele(s.panJ);
      hausL.fenster(s.fen); hausJ.fenster(s.fen);
      akku.lade(s.akkuLade); akku.glimm(s.akkuGlimm);
      // Lichtströme
      const set = (st, amp, dir = 1) => { st.setze(Math.min(1, amp)); st.lauf(t, tempo * dir * (0.6 + 0.6 * Math.min(1, amp))); };
      set(stromL_haus, s.lH); set(stromL_netz, s.lN); set(stromL_nacht, s.lNH);
      set(stromJ_haus, s.jH); set(stromJ_netz, s.jN); set(stromJ_akku, s.jA); set(stromJ_nacht, s.jAH);
      // Ringe, Balken, Preisschild
      ringL.setze(s.ringEin); ringL.fuell(s.ringL); ringJ.setze(s.ringEin); ringJ.fuell(s.ringJ);
      barL.setze(s.barEin); barL.hoehe(Math.max(0.01, BAR * s.barEin)); barJ.setze(s.barEin); barJ.hoehe(Math.max(0.01, BAR * (1 + PLUS * s.barJ) * s.barEin));
      schild.visible = s.schildEin > 0.01; schild.scale.setScalar(Math.max(0.01, s.schildEin)); schild.text(preisText[s.schildTxt]); schild.dreh(s.schildDreh);
      // Spot-Kegel
      kegelJ.visible = s.spotJ > 0.01; kegelJ.material.uniforms.staerke.value = 0.5 * s.spotJ; kegelJ.position.set(JX, 5.4, HZ + 0.4);
      kegelE.visible = s.spotErg > 0.01; kegelE.material.uniforms.staerke.value = 0.5 * s.spotErg; kegelE.position.set(lerp(LX, JX, glatt(t, A.jonasE - 0.3, A.jonasE + 0.5)), 5.4, HZ + 0.4);
      // Licht: Sonne wandert im Zeitraffer, sonst steht sie tief im Abend; Nacht dimmt Himmel und Sonne
      const dir = new THREE.Vector3(-0.62 * Math.cos(s.th), s.e, -0.76).normalize();
      sonne.target.position.set(0, 0, 0);
      sonne.position.set(dir.x * 40, dir.y * 40, dir.z * 40);
      sonne.target.updateMatrixWorld();
      sonne.color.copy(sonneBasis).lerp(sonneNoon, clamp((s.e - 0.2) / 0.78)).lerp(sonneHeiss, clamp(s.warm)).lerp(mond, 1 - s.d);
      sonne.intensity = (4.9 + 1.0 * s.warm + 0.9 * s.glueh) * (0.04 + 0.96 * s.d) + 0.9 * (1 - s.d);
      hemi.color.copy(hemiTag).lerp(hemiNacht, 1 - s.d);
      hemi.intensity = 0.6 * (0.5 + 0.5 * s.d) - 0.04 * s.warm;
      szene.environmentIntensity = 0.45 * (0.45 + 0.55 * s.d);
      szene.backgroundIntensity = 0.22 + 0.78 * s.d;
      post.bloomStaerke = 0.45 + 0.25 * s.warm + 0.3 * s.glueh + 0.2 * (1 - s.d);
      post.vignette = 0.36 + 0.06 * s.warm;
      post.strahlen = 0.22 * s.d;
      post.belichtung = 1.02 + 0.04 * s.glueh;
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, regie.zustand(t).ziel, { tiefe: 0.3, nah: 0.4, fern: 0.55 }));
    },
  };

  // ---------- Welt 2: Blaupause (Warum?) – Energiefluss-Schema ----------
  const BL = (() => {
    const bs = new THREE.Scene();
    bs.background = blaupausePapier();
    const g = new THREE.Group(); bs.add(g);
    const WEISS = "#ffffff";
    const fuell = fuellung("#1257a8", 0.55);
    const hx = -0.6;
    koerper(new THREE.BoxGeometry(3.4, 1.0, 1.6), { x: hx, y: 0.5, eltern: g, farbe: WEISS, fuell, breite: 3.0 });
    koerper(new THREE.BoxGeometry(3.4, 1.3, 1.6), { x: hx, y: 1.65, eltern: g, farbe: WEISS, breite: 3.0 });
    const sh = new THREE.Shape(); sh.moveTo(-0.9, 0); sh.lineTo(0.9, 0); sh.lineTo(0, 1.0); sh.closePath();
    const dg = new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false }); dg.translate(0, 0, -1.7); dg.rotateY(Math.PI / 2);
    koerper(dg, { x: hx, y: 2.3, eltern: g, farbe: WEISS, breite: 3.0 });
    // Paneelen-Umriss auf dem Dach (Vorderseite)
    linien([[hx - 1.3, 2.35, 0.55, hx + 1.3, 2.35, 0.55], [hx - 1.3, 2.75, 0.18, hx + 1.3, 2.75, 0.18]], { eltern: g, farbe: "#d8ecff", breite: 2.6 });
    // Akku (Jonas) im Keller mit sechs Zellen
    const akkuK = koerper(new THREE.BoxGeometry(1.0, 0.8, 0.5), { x: hx - 0.9, y: 0.48, z: 0.55, eltern: g, farbe: JONAS, fuell: fuellung("#8a4a1e", 0.55), breite: 3.4, verdeckt: false });
    const zellen = [];
    for (let i = 0; i < 6; i++) {
      const c = koerper(new THREE.BoxGeometry(0.2, 0.2, 0.2), { x: hx - 0.9 + ((i % 3) - 1) * 0.28, y: 0.32 + Math.floor(i / 3) * 0.3, z: 0.82, eltern: g, farbe: JONAS, fuell: fuellung("#ff8a3d", 0.85), breite: 2.4, verdeckt: false });
      c.visible = false; zellen.push(c);
    }
    // Mast und Netzpfeil
    linien([[3.4, 0, 0, 3.4, 3.2, 0], [3.0, 3.0, 0, 3.8, 3.0, 0], [3.1, 2.7, 0, 3.7, 2.7, 0], [3.4, 3.2, 0, 3.15, 2.7, 0], [3.4, 3.2, 0, 3.65, 2.7, 0]], { eltern: g, farbe: WEISS, breite: 2.8 });
    const netzK = new THREE.CatmullRomCurve3([new THREE.Vector3(hx, 3.35, 0.3), new THREE.Vector3(1.2, 3.85, 0.3), new THREE.Vector3(3.0, 3.35, 0.3)]);
    const zweigK = new THREE.CatmullRomCurve3([new THREE.Vector3(hx - 0.4, 3.35, 0.3), new THREE.Vector3(hx - 1.6, 3.5, 0.5), new THREE.Vector3(hx - 2.6, 2.4, 0.6), new THREE.Vector3(hx - 2.6, 1.2, 0.6), new THREE.Vector3(hx - 1.7, 0.7, 0.6)]);
    const pt = (k, n) => k.getPoints(n).flatMap((p, i, a) => (i ? [a[i - 1].x, a[i - 1].y, a[i - 1].z, p.x, p.y, p.z] : []));
    const netzLinie = linien(chunk(pt(netzK, 24)), { eltern: g, farbe: WEISS, breite: 4.0 });
    const zweigLinie = linien(chunk(pt(zweigK, 28)), { eltern: g, farbe: "#ffb27a", breite: 3.2, gestrichelt: true });
    // Pfeilspitze Netz
    linien([[2.78, 3.58, 0.3, 3.0, 3.35, 0.3], [2.95, 3.12, 0.3, 3.0, 3.35, 0.3]], { eltern: g, farbe: WEISS, breite: 4.0 });
    // Pakete (kWh) auf dem Netzpfeil und eines, das abbiegt
    const paket = (farbe, fuellFarbe) => koerper(new THREE.BoxGeometry(0.34, 0.34, 0.34), { eltern: g, farbe, fuell: fuellung(fuellFarbe, 0.9), breite: 2.8, verdeckt: false });
    const fluss = [0, 1, 2].map(() => paket(WEISS, "#2f7fd0"));
    const abbieger = paket(JONAS, "#ff8a3d");
    // Wärme: Wellenlinien über dem Akku
    const waerme = new THREE.Group(); g.add(waerme);
    for (let k = 0; k < 3; k++) {
      const pts = [];
      for (let i = 0; i < 12; i++) { const u = i / 11; pts.push(hx - 0.9 + (k - 1) * 0.28 + Math.sin(u * 9 + k) * 0.06, 1.0 + u * 0.55, 0.8); }
      const segs = []; for (let i = 0; i < 11; i++) segs.push([pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], pts[i * 3 + 3], pts[i * 3 + 4], pts[i * 3 + 5]]);
      linien(segs, { eltern: waerme, farbe: "#ff9d6b", breite: 2.6 });
    }
    waerme.visible = false;
    function chunk(a) { const r = []; for (let i = 0; i < a.length; i += 6) r.push(a.slice(i, i + 6)); return r; }
    return { szene: bs, netzK, zweigK, netzLinie, zweigLinie, fluss, abbieger, zellen, waerme, hx, akkuK };
  })();
  const kamBlau = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 100);
  const setzeKamBlau = () => { kamBlau.position.set(0.35, 2.3, 20.5); kamBlau.lookAt(0.35, 2.1, 0); kamBlau.fov = 36; kamBlau.updateProjectionMatrix(); kamBlau.updateMatrixWorld(); };
  setzeKamBlau();
  const tBlauEin = A.warum - 0.15, tBlauAus = A.verrueckt - 0.1;
  const weltBlau = {
    szene: BL.szene, kamera: kamBlau, post: { vignette: 0.2, koernung: 0.008 },
    update(t) {
      setzeKamBlau();
      // Netzpfeil: ein Paket pro Stück, der Abbieger löst sich bei „Kilowattstunde“
      const tA = A.kwh - 0.1, fl = fortschritt(t, tA, tA + 1.5);
      BL.fluss.forEach((p, i) => { const u = (((t * 0.28 + i / 3) % 1) + 1) % 1; const q = BL.netzK.getPointAt(u); p.position.set(q.x, q.y, q.z); p.visible = t > A.warum + 0.2; p.scale.setScalar(0.5 + 0.8 * Math.sin(Math.PI * u) ** 0.6); });
      // Abbieger: erst auf dem Netzpfeil, dann zweigt er ab in den Akku
      const ab = BL.abbieger;
      if (t < tA) ab.visible = false;
      else {
        ab.visible = true;
        const q = fl < 0.25 ? BL.netzK.getPointAt(0.02 + fl * 0.5) : BL.zweigK.getPointAt(clamp((fl - 0.25) / 0.75));
        ab.position.set(q.x, q.y, q.z);
        ab.scale.setScalar(t > A.akkuW + 1.7 ? Math.max(0.01, 1 - glatt(t, A.akkuW + 1.7, A.akkuW + 2.0)) : 1);
      }
      // Zellen im Akku füllen sich; die sechste steigt bei „Sechstel“ als Wärme auf
      BL.zellen.forEach((c, i) => {
        const an = fortschritt(t, A.akkuW + 1.5 + i * 0.06, A.akkuW + 1.6 + i * 0.06);
        c.visible = an > 0.01 && t > A.akkuW + 0.4;
        if (i === 5) {
          const rise = glatt(t, A.sechstel + 0.2, A.verloren + 0.3);
          c.position.y = 0.32 + 0.3 + rise * 1.0; c.position.x = BL.hx - 0.9 + 0.28 + 0.06 * Math.sin(rise * 12);
          c.scale.setScalar(Math.max(0.01, 1 - 0.6 * rise));
          c.visible = c.visible && rise < 0.98;
        }
      });
      BL.waerme.visible = t > A.sechstel + 0.4 && t < A.verrueckt - 0.1;
      BL.waerme.position.y = 0.08 * Math.sin(t * 5);
    },
  };

  // ---------- HUD ----------
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const projB = (p) => { kamBlau.updateMatrixWorld(); kamBlau.updateProjectionMatrix(); tmp.set(p[0], p[1], p[2]).project(kamBlau); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: s.L, b: s.J }; },
    uhr: { ein: A.jahr1 - 0.05, zeit: (t) => SW(t).jahrAnz, format: (v) => `${Math.round(v)}`, label: "JAHR" },
  });
  // Jonas' Zähler im Minus rot getönt (Teamfarbe des Rahmens bleibt)
  hud.add({ update(t) { const s = SW(t); const w = tafel.seiten[1].wert; const neg = s.J < -0.5; const c = neg ? "#FF6B5E" : ""; if (w.style.color !== c) w.style.color = c; }, ereignisse: () => [] });
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  chip("10 KWP · 10.240 KWH SONNE", A.zehn - 0.05, A.v4000 - 0.4, "a", "voll");
  chip("4.000 KWH VERBRAUCH/JAHR", A.v4000, A.lenaR - 0.12, "a");
  chip("7,7 CT/KWH", A.c77, A.jonasR - 0.1, "a", "voll");
  chip("AKKU 8 KWH · 4.800 €", A.c4800 - 0.02, A.klar - 0.12, "b", "voll");
  chip("LENA +1.231 €/JAHR", A.jahr1 + 0.15, A.jonasRen - 0.4, "a");
  chip("JONAS +1.696 €/JAHR", A.jonasRen, A.aber - 0.1, "b", "voll");
  chip("UNABHÄNGIGKEIT", A.unab, A.aber2 - 0.1, "akzent", "hell");
  chip("+38 % GELD", A.drittel, A.jahr5 - 0.1, "b", "voll");
  chip("AKKU HÄLT 15 JAHRE", A.v15 - 0.05, A.endstand - 0.12, "b", "hell");
  chip("AKKU 6.600 €", A.p6600 - 0.02, A.p3000 - 0.4, "b", "voll");
  chip("AKKU 3.000 €", A.p3000 - 0.02, A.gleiche - 0.15, "b", "voll");
  // Ringe: Zahlen in der Mitte der Ringe
  M.zaehler({ wert: (t) => SW(t).ringL * 100, einheit: " %", nk: 0, max: 100, team: "a", art: "voll", punkt: () => proj([-1.25, ringY, ringZ + 0.1]), ein: A.v37 - 0.15, aus: A.jahr5 - 0.1 });
  M.zaehler({ wert: (t) => SW(t).ringJ * 100, einheit: " %", nk: 0, max: 100, team: "b", art: "voll", punkt: () => proj([1.25, ringY, ringZ + 0.1]), ein: A.v79 - 0.15, aus: A.jahr5 - 0.1 });
  M.zaehler({ wert: (t) => { const s = SW(t); return Math.max(0, s.barJ * PLUS * 100); }, einheit: " %", nk: 0, max: 99, team: "b", art: "hell", label: "MEHR GELD", punkt: () => proj([0, BAR * (1 + PLUS) + 0.55, ringZ]), ein: A.waechst, aus: A.jahr5 - 0.1 });
  // Differenz Jonas gegen Lena (Wendung 2) und Akku-Ertrag (Überraschung)
  M.zaehler({ wert: (t) => SW(t).diff, einheit: " €", nk: 0, max: 9999, team: "akzent", art: "voll", label: "JONAS GEGEN LENA", x: SICHER.mitte, y: 372, ein: A.jahr5 + 0.1, aus: A.v15 - 0.45, anker: "mitte" });
  M.zaehler({ wert: (t) => SW(t).diff, einheit: " €", nk: 0, max: 9999, team: "akzent", art: "voll", label: "AKKU BRINGT", x: SICHER.mitte, y: 530, ein: A.verrueckt + 0.2, aus: A.gleiche - 0.1, anker: "mitte" });
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "NACH 20 JAHREN", ein: A.endstand + 0.2, aus: A.warum - 0.25,
    zeilen: [{ label: "LENA", wert: 24620, einheit: "€", team: "a", ein: A.n24 }, { label: "JONAS", wert: 26802, einheit: "€", team: "b", ein: A.n26 }],
    differenz: { label: "AKKU", wert: 2182, einheit: "€", ein: A.n2182 } });
  // Blaupause-Beschriftungen (Warum?)
  const bChip = (text, p, ein, aus, team = "akzent", art = "hell") => M.chip({ text, ein, aus, team, art, x: p.x, y: p.y, anker: "mitte" });
  bChip("NETZ", projB([3.1, 3.95, 0]), A.warum + 0.5, A.verrueckt - 0.15, "akzent", "hell");
  bChip("AKKU", projB([BL.hx + 0.55, 0.5, 0.9]), A.warum + 0.9, A.verrueckt - 0.15, "b", "hell");
  bChip("−7,7 CT", { x: 540, y: 372 }, A.fehlt, A.sechstel - 0.4, "a", "voll");
  bChip("−16 %", { x: 540, y: 372 }, A.sechstel, A.verrueckt - 0.15, "akzent", "voll");
  M.folgen({ ein: A.folg, dauer: 1.8 });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.4, "pop", "Sonne steht über beiden Dächern"); ev(1.6, "klick", "Paneelen glimmen"); ev(A.akkuHook, "ding", "Akku im Keller leuchtet auf"); ev(4.4, "klick", "Kamera fährt zwischen die Häuser");
  ev(A.zehn, "ding", "10 kWp: Paneelen leuchten auf"); ev(A.v4000, "klick", "Verbrauch 4.000 kWh"); ev(7.5, "klick", "Lichtstrom Dach → Haus"); ev(A.lenaR, "whoosh", "Kamera zu Lena: Strom Dach → Netz verstärkt");
  ev(A.ueber, "klick", "Überschuss fließt zum Mast"); ev(A.c77, "ding", "7,7 ct je kWh"); ev(A.jonasR, "whoosh", "Kamera zu Jonas"); ev(A.c4800, "ding", "Jonas −4.800 € (Zähler rot)"); ev(A.extra, "klick", "Keller leuchtet"); ev(A.akkuR, "ding", "Akku glimmt: Strom Dach → Akku");
  ev(A.klar, "whoosh", "Spot auf Jonas' Haus"); ev(A.haushoch, "klick", "Akku-Licht pulsiert"); ev(A.oder, "klick", "Spot erlischt"); ev(A.folg + 0.6, "klick", "Kamera weitet"); ev(A.verpasst, "klick", "Lichtströme beschleunigen");
  ev(A.jahr1, "ding", "JAHR 1: Zähler laufen"); ev(A.jonasRen, "pop", "Jonas holt mehr raus"); ev(A.aber, "klick", "Jonas bleibt im Minus"); ev(A.minus, "klick", "Kamera schwenkt");
  ev(A.merk, "whoosh", "Kamera zu den Ringen"); ev(A.sein, "klick", "Akku verdoppelt"); ev(A.unab, "pop", "Ringe erscheinen"); ev(A.v37, "klick", "Ring Lena füllt sich bis 37 %"); ev(A.v79, "whoosh", "Ring Jonas füllt sich bis 79 %"); ev(A.prozent, "klick", "Zoom auf den Kontrast");
  ev(A.aber2, "klick", "Euro-Balken erscheinen"); ev(A.waechst, "ding", "Balken Jonas wächst +38 %"); ev(A.drittel, "klick", "+38 % steht");
  ev(A.jahr5, "whoosh", "Zeitraffer: Sonne wandert"); ev(A.j5 + 0.14, "ding", "Jahr 5: Lena vorn"); ev(A.j8 + 0.2, "ding", "Jahr 8"); ev(A.j10 + 0.3, "ding", "Jahr 10: knapp"); ev(A.lenaVorn + 0.2, "klick", "Nacht: Fenster aus dem Netz bzw. Akku"); ev(A.lenaVorn + 1.4, "klick", "zweiter Tag");
  ev(A.erst + 0.4, "klick", "Spannung steigt"); ev(A.elften, "whoosh", "Zoom auf Jonas' Haus"); ev(T_GLEICH, "ding", "Jonas überholt: Aufleuchten Jahr 11"); ev(A.vorbei, "ding", "Jonas vorn: +320 €");
  ev(A.v15, "ding", "JAHR 15"); ev(A.akkuEnde, "klick", "Akku-Licht erlischt"); ev(A.ende, "klick", "Akku dunkel"); ev(A.ende + 0.9, "klick", "beide Zähler laufen gleich schnell");
  ev(A.endstand, "whoosh", "Bilanzkarte, Lichtkegel erscheint"); ev(A.v20 + 0.7, "klick", "Lichtkegel wird heller"); ev(A.lenaE + 0.9, "klick", "Kamera fährt langsam heran"); ev(A.n24 + 0.8, "klick", "Lichtströme pulsieren"); ev(A.jonasE - 0.3, "whoosh", "Licht wandert auf Jonas' Haus"); ev(A.n24, "ding", "Lena 24.620 €"); ev(A.n26, "ding", "Jonas 26.802 €"); ev(A.n2182, "ding", "Akku +2.182 €"); ev(A.n26 + 1.0, "klick", "Jonas-Paneele leuchten auf"); ev(A.der, "klick", "Lichtkegel pulsiert auf den Keller");
  ev(A.warum, "whoosh", "Szenenwechsel: Blaupause"); ev(A.kwh, "klick", "kWh zweigt zum Akku ab"); ev(A.fehlt, "klick", "Netzpfeil verliert eine kWh: −7,7 ct"); ev(A.sechstel, "ding", "Ein Sechstel verdampft als Wärme"); ev(A.geht, "klick", "−16 %");
  ev(A.verrueckt, "whoosh", "Zurück ins Modell: Kamera zum Keller"); ev(A.kostet, "klick", "Preisschild erscheint"); ev(A.p6600, "ding", "Preisschild dreht auf 6.600 €"); ev(T("ueberraschung:bleiben"), "klick", "Lichtkegel auf den Keller"); ev(A.keine, "klick", "Differenz 381 €"); ev(A.bei, "whoosh", "Schild dreht auf 3.000 €"); ev(A.p3000, "ding", "Differenz steigt auf 3.981 €"); ev(A.fast, "klick", "fast 4.000");
  ev(A.gleiche, "whoosh", "Kamera fährt zurück"); ev(A.unterschied, "klick", "Fahrt zurück zur Startposition"); ev(A.sonneM, "klick", "Paneelen beider Häuser leuchten: gleiche Sonne"); ev(A.dachM, "klick", "Paneelen beider Häuser leuchten: gleiches Dach"); ev(A.preis, "ding", "Preis im Keller"); M.melde({ t: A.keller, typ: "pointe", klang: "akzent", text: "Merksatz: Keller leuchtet" });

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  zl.shot(tBlauEin, weltBlau, { typ: "wisch", dauer: 0.5, richtung: [1, -0.35], farbe1: "#8fc0ff", farbe2: "#0a3270" });
  zl.shot(tBlauAus, welt, { typ: "wisch", dauer: 0.5, richtung: [-1, 0.35], farbe1: JONAS, farbe2: "#0B0D12" });
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); }; // nur HUD (für qc/text_ueberlappung.mjs)
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
