// „Kaiserreich oder heute: Wer zahlt bei gleichem Gehalt mehr Steuern?“ · Stil 19 Architekturmodell (Abendlicht), Simulierbar 08.11.2026 mittag.
// Zwei Kartonhäuser auf einer Sperrholzplatte: links das Amt um 1900 (Kupfer, Tarif 1891), rechts das moderne Finanzamt (Türkis, Tarif 2026).
// Zwischen ihnen wachsen zwei Acryl-Säulen (Steuer, Höhe mit Wurzelskala, Zahl exakt auf der Tafel) neben einer schmalen Einkommens-Schiene.
// Der Gemeindezuschlag (+100 %) setzt als heller Block auf die Kupfer-Säule. Alle Zahlen kommen aus pipeline/sim/kaiserreich_steuer.mjs
// (Tests dort); Zähler und Säulen laufen an den gesprochenen Zahlen entlang. Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { SimBuehne, GRADING, rigAbendsonne, dunst, lichtKegel, lichtBahn, staub, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { modellPlatte, modellHaus, modellBaum, modellFigur, abendWand, acrylMarker, schnittHaus, schild, geldSaeule, modellLaeufer } from "../../engine/stil_architektur.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, huelle, FEDER } from "../../engine/bewegung.js";
import { steuer1900, est2026, videoZahlen } from "../../sim/kaiserreich_steuer.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Licht, Acryl, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const KR = "#E58A47"; // Kaiserreich (Kupfer)
const HE = "#2FD6C9"; // Heute (Türkis)
const AKZENT = "#ECE6DA";

const Z = videoZahlen();
const ZVE = Z.zveExakt; // 41.932 €
const XL = -1.6, XT = 1.6; // Häuser
const SL = -0.42, ST = 0.42; // Säulen
const HAUS = { breite: 1.7, tiefe: 1.5, etagen: 4, eh: 0.62 };
const HMAX = 2.6; // Säulenhöhe bei 7.827 € (Wurzelskala: die Reihenfolge stimmt, die Zahl steht exakt auf der Tafel)
const hh = (steuer) => HMAX * Math.sqrt(Math.max(0, steuer) / Z.heute);

const glatt = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
const huckel = (t, a, b, c, d) => glatt(t, a, b) * (1 - glatt(t, c, d));

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
      a: { name: "KAISERREICH", farbe: KR, woerter: ["Kaiserreich*", "damals", "Damals:", "Mark", "Berlin*", "Preußen*", "Stadt."] },
      b: { name: "HEUTE", farbe: HE, woerter: ["heute", "Heute", "Heute:", "2026", "steuerfrei*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    heuteH: T("hook:heute"), wer: T("hook:Wer"), mehr: T("hook:mehr"),
    tarife: T("regeln:Tarife"), eine: T("regeln:Eine"), n850: T("regeln:8,50"), nur: T("regeln:Nur"),
    klar: T("falle:Klar"), damalsF: T("falle:damals"), zahlte: T("falle:zahlte"), weniger: T("falle:weniger"), oder: T("falle:Oder"),
    start: T("rennen:Start"), n10000: T("rennen:10.000"), heuteR: T("rennen:Heute"), n0: T("rennen:0"), kaiserR: T("rennen:Kaiserreich"), n76: T("rennen:76,50"), frei: T("rennen:Steuerfrei"), n900: T("rennen:900"),
    doch: T("wendung1:Doch"), stadt: T("wendung1:Stadt"), berlin: T("wendung1:Berlin"), n100: T("wendung1:+100"), schon: T("wendung1:Schon"), n153: T("wendung1:153"),
    gehalt: T("wendung2:Gehalt"), n15000: T("wendung2:15.000"), heute2: T("wendung2:Heute:"), n435: T("wendung2:435"), damals2: T("wendung2:Damals:"), n442: T("wendung2:442"), jetzt: T("wendung2:Jetzt"), knapp: T("wendung2:knapp"),
    ein: T("wendung3:Ein"), kippt: T("wendung3:kippt"), heute3: T("wendung3:Heute"), mehr3: T("wendung3:mehr."), n20000: T("wendung3:20.000"), zweieinhalb: T("wendung3:zweieinhalbmal"),
    dann: T("kipp:Dann"), n54066: T("kipp:54.066"), zu: T("kipp:Zu"), n41932: T("kipp:41.932"), abstand: T("kipp:Abstand"), heute4: T("kipp:Heute:"), n32: T("kipp:32"), damals4: T("kipp:Damals:"), n6: T("kipp:6"),
    endstand: T("ergebnis:Endstand"), heute5: T("ergebnis:Heute"), knapp5: T("ergebnis:knapp"), n6000: T("ergebnis:6.000"), mehr5: T("ergebnis:mehr"), jedes: T("ergebnis:jedes"),
    warum: T("warum:Warum?"), heute6: T("warum:Heute"), frei6: T("warum:steuerfrei."), danach: T("warum:Danach"), steil: T("warum:steil."),
    das: T("pointe:Das"), mit: T("pointe:Mit"), reich: T("pointe:reich."),
    kleine: T("schlusskarte:Kleine"), einkommen: T("schlusskarte:Einkommen:"), damals7: T("schlusskarte:damals"), teurer: T("schlusskarte:teurer."), ab: T("schlusskarte:Ab"), mitte: T("schlusskarte:Mitte:"), heute7: T("schlusskarte:heute."),
  };

  // ---------- Zahlen aus der Rechnung, nur Funktionen von t ----------
  // Einkommen (zu versteuerndes Einkommen, auf der Tafel in der Mitte): wächst an den gesprochenen Stufen
  const inc = pchip([
    [0, 0], [A.start + 0.1, 0], [A.n10000 + 0.6, 10000], [A.gehalt - 0.1, 10000], [A.n15000 + 0.5, 15000], [A.ein + 0.2, 15000],
    [A.kippt - 0.15, 15035], [A.kippt + 0.35, 15200], [A.heute3 + 0.6, 15400], [A.n20000 - 0.5, 15600], [A.n20000 + 0.55, 20000],
    [A.dann + 0.1, 20000], [A.n41932 - 0.1, ZVE], [DAUER, ZVE],
  ]);
  const S = (t) => {
    const e = inc(t);
    // Steuer heute: erst bei der gesprochenen Zahl sichtbar (435 € bei „Heute: 435“), danach folgt sie dem Einkommen
    const incB = lerp(10000, e, glatt(t, A.heute2 + 0.35, A.n435 + 0.6));
    const B = est2026(incB);
    // Kaiserreich: 76,50 € bei „76,50“, Gemeindezuschlag bei „noch einmal +100 %“, 442 € bei „Damals: 442“, danach folgt es dem Einkommen
    const incA = lerp(10000, e, glatt(t, A.damals2 + 0.3, A.n442 + 0.4));
    const staat = steuer1900(incA, { zuschlag: 0 }) * glatt(t, A.kaiserR + 0.2, A.n76 + 0.4);
    const zus = glatt(t, A.n100 - 0.1, A.n153 + 0.1);
    const Aw = staat * (1 + zus);
    return {
      e, a: Aw, b: B, staat, blockA: Aw - staat,
      saeulen: huelle(t, A.start - 0.5, Infinity, { feder: FEDER.weich }),
      warm: glatt(t, A.klar, A.doch) * 0.3 + glatt(t, A.gehalt, A.endstand) * 0.7,
      hoehe: glatt(t, A.gehalt, A.n6000 + 0.5) - 0.5 * glatt(t, A.warum, A.warum + 3),
      spotL: huckel(t, A.klar - 0.1, A.klar + 0.5, A.oder - 0.15, A.oder + 0.3), spotT: huckel(t, A.oder - 0.05, A.oder + 0.4, A.start - 0.4, A.start + 0.3),
      pulsL: 0.7 * huelle(t, A.damalsF, A.damalsF + 1.0, { ausDauer: 0.6 }) + 0.8 * huelle(t, A.weniger, A.weniger + 0.8, { ausDauer: 0.5 }) + 0.6 * huelle(t, A.n850, A.n850 + 1.1, { ausDauer: 0.6 }) + 0.7 * huelle(t, A.n76, A.n76 + 1.1, { ausDauer: 0.6 }) + 0.7 * huelle(t, A.n900, A.n900 + 1.2, { ausDauer: 0.7 }) + 0.9 * huelle(t, A.n153, A.n153 + 1.2, { ausDauer: 0.7 }) + 0.8 * huelle(t, A.n442, A.n442 + 1.2, { ausDauer: 0.7 }) + 0.7 * huelle(t, A.damals4, A.damals4 + 1.2, { ausDauer: 0.7 }) + 0.8 * huelle(t, A.heute5 + 0.4, A.heute5 + 1.6, { ausDauer: 0.7 }),
      pulsT: 0.6 * huelle(t, A.n850, A.n850 + 1.1, { ausDauer: 0.6 }) + 0.6 * huelle(t, A.n0, A.n0 + 0.9, { ausDauer: 0.6 }) + 0.9 * huelle(t, A.n435, A.n435 + 1.2, { ausDauer: 0.7 }) + 1.0 * huelle(t, A.kippt, A.kippt + 1.4, { ausDauer: 0.8 }) + 0.8 * huelle(t, A.n32, A.n32 + 1.3, { ausDauer: 0.7 }) + huelle(t, A.n6000, A.n6000 + 1.6, { ausDauer: 0.9 }) + 0.8 * huelle(t, A.frei6, A.frei6 + 1.2, { ausDauer: 0.7 }),
      blitz: huelle(t, A.kippt, A.kippt + 0.5, { ausDauer: 0.4 }) + 0.6 * huelle(t, A.mehr5, A.mehr5 + 0.5, { ausDauer: 0.4 }),
      markL: 0.5 + 0.5 * Math.max(huckel(t, A.klar - 0.15, A.klar + 0.25, A.weniger + 0.1, A.oder), huelle(t, A.kaiserR, A.kaiserR + 1.0, { ausDauer: 0.7 }), huelle(t, A.stadt, A.stadt + 1.2, { ausDauer: 0.7 }), huelle(t, A.reich, A.reich + 1.2, { ausDauer: 0.8 })),
      markT: 0.5 + 0.5 * Math.max(huckel(t, A.oder - 0.05, A.oder + 0.3, A.start - 0.4, A.start), huelle(t, A.heuteR, A.heuteR + 1.0, { ausDauer: 0.7 }), huelle(t, A.heute3, A.heute3 + 1.2, { ausDauer: 0.7 })),
      blick: Math.sin(t * 0.55) * 0.25,
      karte: glatt(t, A.kleine - 0.3, A.kleine + 0.6),
    };
  };

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = abendWand();
  dunst(szene, "#2E3240", 0.018);
  const SONNE = [-0.62, 0.2, -0.76];
  const rig = rigAbendsonne(szene, buehne.renderer, { richtung: SONNE, ziel: [0, 0, 0], bereich: 11, schatten: SCHATTEN, farbe: "#FFC283", staerke: 5.0, himmel: "#9FB0CC", boden: "#5A4636", himmelStaerke: 0.6, umgebungsStaerke: 0.5 });
  szene.add(modellPlatte({ breite: 22, tiefe: 24, strassen: [{ z: 3.1, richtung: "x", breite: 1.3 }, { x: -4.6, richtung: "z", breite: 1.1 }, { x: 4.6, richtung: "z", breite: 1.1 }], holz: true }));

  // Kulisse: Kartonhäuser, hinten höher, vorn niedrig und frei
  for (let i = 0; i < 70; i++) {
    const x = -10 + (i % 10) * 2.15 + hash(i, 1) * 0.5, z = -10.5 + Math.floor(i / 10) * 2.0 + hash(i, 2) * 0.4;
    if (Math.abs(x) < 3.7 && z > -2.3 && z < 4.2) continue;
    if (Math.abs(x + 4.6) < 0.9 || Math.abs(x - 4.6) < 0.9 || Math.abs(z - 3.1) < 1.0) continue;
    const sattel = hash(i, 4) < 0.35;
    const h = modellHaus({ breite: 1.3 + hash(i, 5) * 0.7, hoehe: sattel ? 0.9 + hash(i, 6) * 0.7 : 1.3 + hash(i, 6) * 1.7, tiefe: 1.2 + hash(i, 7) * 0.6, dach: sattel ? "sattel" : "flach", material: hash(i, 8) < 0.18 ? "holz" : "karton", seed: i + 30 });
    h.position.set(x, 0, z); h.rotation.y = hash(i, 9) < 0.5 ? 0 : Math.PI / 2;
    szene.add(h);
  }
  for (let i = 0; i < 20; i++) { const b = modellBaum({ groesse: 0.5 + hash(i, 11) * 0.3, seed: i }); b.position.set(-3.3 + i * 0.35 + (i % 2) * 0.1, 0, 2.1 + (i % 2) * 0.35); if (Math.abs(b.position.x) < 2.8) continue; szene.add(b); }
  for (let i = 0; i < 8; i++) { const b = modellBaum({ groesse: 0.55 + hash(i, 13) * 0.3, seed: 60 + i }); b.position.set((i % 2 ? 1 : -1) * (3.0 + hash(i, 14) * 0.5), 0, -1.6 + i * 0.45); szene.add(b); }
  for (let i = 0; i < 6; i++) { const f = modellFigur({ groesse: 0.4 }); f.position.set(-4.0 + i * 1.6, 0, 3.15 + (i % 2) * 0.3); f.rotation.y = hash(i, 15) * 6; szene.add(f); }

  // Amt um 1900 (links, zwei Räume) und modernes Finanzamt (rechts, drei Räume); je ein Acryl-Marker in Teamfarbe auf Etage 2
  const hausL = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 3, licht: 1.0, material: "holz" });
  const hausT = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 3, seed: 9, licht: 0.7 });
  hausL.position.set(XL, 0, 0); hausT.position.set(XT, 0, 0); szene.add(hausL, hausT);
  const markL = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: KR }); markL.position.set(XL, HAUS.eh + 0.03, 0); szene.add(markL);
  const markT = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: HE }); markT.position.set(XT, HAUS.eh + 0.03, 0); szene.add(markT);
  const vorL = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: KR, deckkraft: 0.28 }); vorL.position.set(XL, 0, 1.15); szene.add(vorL);
  const vorT = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: HE, deckkraft: 0.28 }); vorT.position.set(XT, 0, 1.15); szene.add(vorT);
  // Jahresschilder vor den Häusern: 1891 (Tarif) und 2026
  const schL = schild({ text: "1891", breite: 0.78, hoehe: 0.3, pfosten: 0.3 }); schL.position.set(XL, 0, 1.95); schL.userData.dynamisch = true; szene.add(schL);
  const schT = schild({ text: "2026", breite: 0.78, hoehe: 0.3, pfosten: 0.3 }); schT.position.set(XT, 0, 1.95); schT.userData.dynamisch = true; szene.add(schT);
  // Dieselbe Modellperson (gleiches Gehalt) vor beiden Ämtern
  const figL = modellLaeufer({ groesse: 0.62, farbe: KR, jacke: 0.65 }); szene.add(figL);
  const figT = modellLaeufer({ groesse: 0.62, farbe: HE, jacke: 0.65 }); szene.add(figT);

  // Säulen: Steuer Kaiserreich (Staatssteuer + heller Zuschlagsblock), Steuer heute, schmale Einkommens-Schiene dazwischen
  const saeuleL = geldSaeule({ breite: 0.3, farbe: KR, deckkraft: 0.26 }); saeuleL.position.set(SL, 0, 0.35); szene.add(saeuleL);
  const saeuleT = geldSaeule({ breite: 0.3, farbe: HE, deckkraft: 0.26 }); saeuleT.position.set(ST, 0, 0.35); szene.add(saeuleT);
  const zuschlag = geldSaeule({ breite: 0.3, farbe: AKZENT, deckkraft: 0.55, kanten: 4.0 }); zuschlag.position.set(SL, 0, 0.35); szene.add(zuschlag);
  const schiene = geldSaeule({ breite: 0.09, farbe: AKZENT, deckkraft: 0.4, kanten: 2.4 }); schiene.position.set(0, 0, 0.35); szene.add(schiene);
  const kegel = (farbe) => { const k = lichtKegel({ hoehe: 5.0, radiusOben: 0.1, radiusUnten: 1.1, farbe, staerke: 0.55, streifen: 0.25 }); k.material = k.material.clone(); k.userData.dynamisch = true; szene.add(k); return k; };
  const kegelL = kegel(KR), kegelT = kegel(HE);
  // Münzen/Scheine fliegen aus der Hand der Person ins Amt (Steuer wird gezahlt), je Ereignis eine Gruppe
  const schein = (farbe) => new THREE.MeshStandardMaterial({ color: farbe, emissive: farbe, emissiveIntensity: 0.9, roughness: 0.5, side: THREE.DoubleSide, transparent: true });
  const gruppen = [];
  const burst = (t0, seite, n = 7) => {
    const ms = [];
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), schein(seite === "L" ? "#F2B27E" : "#8EF0E8")); m.userData.dynamisch = true; m.visible = false; szene.add(m); ms.push(m); }
    gruppen.push({ t0, seite, ms });
  };
  burst(A.n76 - 0.1, "L"); burst(A.n100, "L"); burst(A.n435 - 0.1, "T"); burst(A.n442 - 0.1, "L"); burst(A.mehr3 - 0.2, "T"); burst(A.heute5 + 0.2, "T", 10); burst(A.heute5 + 0.2, "L", 4);
  szene.add(staub({ anzahl: 500, bereich: [10, 5, 10], mitte: [0, 2, 0], farbe: "#FFD7A8", groesse: 0.013, staerke: 1.2, aussen: 0.35 }));
  const richt = new THREE.Vector3(...SONNE).normalize();
  for (const [x, z, b, st] of [[-2.9, -0.5, 1.2, 0.09], [0.0, -1.0, 1.4, 0.08], [3.4, -1.5, 1.0, 0.07]]) {
    const l = lichtBahn({ laenge: 13, breite: b, farbe: "#FFC58A", staerke: st, streifen: 0.6 });
    l.position.set(x + richt.x * 9, richt.y * 9, z + richt.z * 9);
    l.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), richt.clone().negate());
    l.rotateY(Math.PI / 2);
    szene.add(l);
  }
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 220);
  const WEIT = { pos: [0, 6.6, 11.6], ziel: [0, 1.45, 0.2], fov: 42 };
  const shot = (t, pos, ziel, fov = 40) => ({ t: typeof t === "number" ? t : T(t), pos, ziel, fov });
  const SH = [
    shot(0, WEIT.pos, WEIT.ziel, WEIT.fov),
    shot(A.wer + 0.4, [0.0, 7.0, 13.6], [0, 1.3, 0.2], 41),
    shot(A.tarife - 0.2, [-1.6, 5.0, 10.6], [-1.2, 1.3, 0.2], 38),
    shot(A.eine - 0.1, [0.4, 5.8, 11.6], [0, 1.0, 0.8], 40),
    shot(A.eine + 0.9, [1.0, 5.2, 10.8], [0.4, 0.9, 0.9], 38),
    shot(A.n850 - 0.2, [-0.6, 4.6, 10.0], [-0.4, 0.8, 1.0], 38),
    shot(A.nur - 0.1, [0.0, 6.4, 12.2], [0, 1.5, 0.2], 41),
    shot(A.klar - 0.1, [-1.0, 5.4, 10.6], [-1.2, 1.4, 0.3], 38),
    shot(A.damalsF + 0.2, [-1.4, 4.8, 10.2], [-1.3, 1.5, 0.4], 36),
    shot(A.oder + 0.4, [1.2, 5.4, 10.6], [1.2, 1.4, 0.3], 38),
    shot(A.start - 0.15, [0.0, 4.2, 9.8], [0, 0.8, 0.4], 38),
    shot(A.heuteR - 0.1, [1.9, 4.4, 9.8], [0.8, 0.9, 0.5], 38),
    shot(A.kaiserR - 0.15, [-2.3, 4.4, 9.8], [-0.9, 0.9, 0.5], 38),
    shot(A.frei - 0.1, [-0.6, 5.0, 10.6], [-0.2, 1.0, 0.5], 39),
    shot(A.n900 - 0.2, [-1.8, 4.6, 9.6], [-0.9, 1.0, 0.5], 37),
    shot(A.doch - 0.1, [0.0, 6.6, 12.6], [0, 1.4, 0.3], 41),
    shot(A.berlin - 0.3, [-2.2, 5.0, 10.4], [-1.2, 1.5, 0.4], 38),
    shot(A.n100 - 0.4, [-1.3, 4.4, 9.4], [-0.5, 1.1, 0.5], 36),
    shot(A.n153 + 0.4, [0.0, 5.4, 11.2], [0, 1.2, 0.4], 39),
    shot(A.gehalt - 0.1, [0.0, 6.2, 12.0], [0, 1.3, 0.3], 41),
    shot(A.heute2 - 0.1, [2.1, 5.0, 10.4], [0.7, 1.0, 0.4], 38),
    shot(A.damals2 - 0.1, [-2.1, 5.0, 10.4], [-0.7, 1.0, 0.4], 38),
    shot(A.jetzt - 0.1, [0.0, 4.6, 9.4], [0, 1.0, 0.4], 36),
    shot(A.ein - 0.1, [0.0, 5.4, 10.8], [0, 1.2, 0.4], 39),
    shot(A.kippt - 0.4, [0.1, 4.2, 8.8], [0, 1.1, 0.4], 34),
    shot(A.heute3 + 0.5, [1.6, 5.0, 10.4], [0.5, 1.3, 0.4], 38),
    shot(A.n20000 - 0.3, [0.0, 5.6, 11.2], [0, 1.6, 0.4], 39),
    shot(A.dann - 0.1, [-0.8, 6.0, 12.2], [0, 1.9, 0.3], 41),
    shot(A.n54066, [0.0, 6.4, 12.6], [0, 2.0, 0.3], 42),
    shot(A.n41932 - 0.3, [0.0, 5.4, 11.0], [0, 2.0, 0.3], 38),
    shot(A.abstand - 0.1, [0.0, 4.8, 9.6], [0, 1.9, 0.3], 35),
    shot(A.heute4 - 0.2, [2.0, 5.0, 10.6], [0.7, 2.1, 0.3], 38),
    shot(A.damals4 - 0.2, [-2.0, 5.0, 10.6], [-0.7, 1.4, 0.3], 38),
    shot(A.endstand, [0.0, 5.6, 11.0], [0, 2.0, 0.3], 38),
    shot(A.mehr5 - 0.3, [0.2, 4.8, 9.4], [0.1, 2.0, 0.3], 35),
    shot(A.warum - 0.1, [0.0, 7.0, 13.6], [0, 1.5, 0.3], 42),
    shot(A.heute6 + 0.2, [2.1, 5.2, 10.8], [0.8, 1.5, 0.3], 38),
    shot(A.danach, [-1.2, 5.0, 10.6], [-0.4, 1.4, 0.3], 38),
    shot(A.das - 0.1, [0.0, 6.4, 12.4], [0, 1.4, 0.3], 41),
    shot(A.mit, [-2.3, 4.6, 10.0], [-1.2, 1.6, 0.4], 38),
    shot(A.kleine - 0.2, [0.0, 6.6, 12.8], [0, 1.4, 0.3], 41),
    shot(A.ab - 0.2, [0.4, 7.0, 13.4], [0.1, 1.5, 0.3], 42),
  ];
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const ziel = a.ziel.map((v, k) => lerp(v, b.ziel[k], p));
    const FK = 1.26; // Grundabstand: beide Häuser bleiben in der sicheren Breite
    return { pos: a.pos.map((v, k) => ziel[k] + (lerp(v, b.pos[k], p) - ziel[k]) * FK), ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  regie.zoom({ t: A.n100 - 0.1, ziel: [-0.4, 1.0, 0.4], staerke: 0.14, halt: 1.6, rueck: 0.9 });
  regie.zoom({ t: A.kippt - 0.1, ziel: [0.0, 1.2, 0.35], staerke: 0.16, halt: 2.0, rueck: 0.9 });
  regie.zoom({ t: A.mehr5 - 0.4, ziel: [0.0, 2.0, 0.35], staerke: 0.12, halt: 2.0, rueck: 0.8 });

  // ---------- Zustand auf die Welt anwenden ----------
  const sonne = rig.sonne, hemi = rig.hemi;
  const sonneBasis = new THREE.Color("#FFC283"), sonneHeiss = new THREE.Color("#FFA45C");
  const sonnenPunkt = new THREE.Vector3(...SONNE).normalize().multiplyScalar(60).toArray();
  const post = { ...GRADING.abend, belichtung: 1.02, splitStaerke: 0.24, saettigung: 1.0, kontrast: 1.1, vignette: 0.36, bloomSchwelle: 1.3, lift: [0.004, 0.004, 0.01], strahlen: 0.22, strahlenPunkt: sonnenPunkt, strahlenSchwelle: 1.4, strahlenLaenge: 0.75, strahlenAbfall: 0.97, strahlenFarbe: [1, 0.82, 0.6] };
  const slab = (g, x, basis, hoehe, s) => { g.position.set(x, 0, 0.35); g.hoehe(Math.max(0.005, hoehe)); g.position.y = basis; g.setze(s); };
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = S(t);
      figL.position.set(XL - 0.35, 0, 1.2); figL.rotation.y = 0.35 + s.blick;
      figT.position.set(XT + 0.35, 0, 1.2); figT.rotation.y = -0.35 - s.blick;
      figL.pose({ geh: t * 1.2, schritt: 0.0, sitz: 0 }); figT.pose({ geh: t * 1.2, schritt: 0.0, sitz: 0 });
      figL.leuchte(0.8 + 1.4 * s.pulsL + 0.5 * s.spotL); figT.leuchte(0.8 + 1.4 * s.pulsT + 0.5 * s.spotT);
      markL.setze(s.markL); markT.setze(s.markT);
      vorL.setze(0.35 + 0.65 * s.pulsL); vorT.setze(0.35 + 0.65 * s.pulsT);
      // Säulen: Kupfer = Staatssteuer, heller Block = Gemeindezuschlag; Türkis = Steuer heute; Schiene = Einkommen
      const hS = hh(s.staat), hA = hh(s.a), hB = hh(s.b);
      saeuleL.setze(s.saeulen); saeuleL.hoehe(Math.max(0.01, hS)); saeuleL.puls(0.3 + 0.9 * s.pulsL);
      saeuleT.setze(s.saeulen); saeuleT.hoehe(Math.max(0.01, hB)); saeuleT.puls(0.3 + 0.9 * s.pulsT);
      const zS = s.blockA > 0.01 ? s.saeulen : 0;
      slab(zuschlag, SL, hS, Math.max(0.01, hA - hS), zS); zuschlag.puls(0.5 + 0.9 * huelle(t, A.n100, A.n100 + 1.2, { ausDauer: 0.6 }));
      schiene.setze(s.saeulen); schiene.hoehe(Math.max(0.01, (s.e / 54066) * 2.8)); schiene.puls(0.2 + 0.7 * s.blitz);
      // Münzen: fliegen von der Person ins Amt
      for (const g of gruppen) {
        const x0 = g.seite === "L" ? XL - 0.35 : XT + 0.35, x1 = g.seite === "L" ? XL : XT;
        g.ms.forEach((m, i) => {
          const k = (t - (g.t0 + i * 0.13)) / 0.95;
          m.visible = k > 0 && k < 1;
          if (!m.visible) return;
          const e = ease.inOutSine(k);
          m.position.set(lerp(x0, x1, e) + (hash(i, 3) - 0.5) * 0.25, 1.0 + Math.sin(k * Math.PI) * 0.7 + e * 0.4, lerp(1.2, 0.5, e));
          m.rotation.set(k * 6 + i, k * 4, k * 3); m.material.opacity = 1 - ease.inCubic(k); m.scale.setScalar(1 - 0.4 * k);
        });
      }
      kegelL.visible = s.spotL > 0.01; kegelL.material.uniforms.staerke.value = 0.7 * s.spotL; kegelL.position.set(XL, 5.0, 1.0);
      kegelT.visible = s.spotT > 0.01; kegelT.material.uniforms.staerke.value = 0.7 * s.spotT; kegelT.position.set(XT, 5.0, 1.0);
      // Licht: Spannung steigt bis zum Endstand, Bloom bei der Wende, danach ruhiger
      sonne.target.position.set(0, 0, 0); sonne.position.set(rig.richtung.x * 40, rig.richtung.y * 40, rig.richtung.z * 40); sonne.target.updateMatrixWorld();
      sonne.color.copy(sonneBasis).lerp(sonneHeiss, s.warm);
      sonne.intensity = 4.9 + 1.0 * s.warm + 0.6 * s.hoehe + 0.5 * s.blitz;
      hemi.intensity = 0.6 - 0.06 * s.hoehe;
      post.bloomStaerke = 0.4 + 0.2 * s.hoehe + 0.3 * s.blitz;
      post.vignette = 0.36 + 0.08 * s.hoehe;
      post.belichtung = (1.02 + 0.04 * s.blitz) * (1 - 0.32 * s.karte);
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, regie.zustand(t).ziel, { tiefe: 0.3, nah: 0.45, fern: 0.6 }));
    },
  };

  // ---------- HUD ----------
  // Titelfrage ab Bild 1 (Suchbegriff „Steuern“), Tafel ab Bild 0 mit beiden Seiten und VS
  M.titel({ y: 520, groesse: 112, aus: A.eine - 0.25, woerter: [
    { text: "KAISERREICH", ein: -0.3, team: "a" }, { umbruch: true },
    { text: "vs", art: "vs", ein: -0.3 }, { text: "HEUTE", ein: -0.3, team: "b" }, { umbruch: true },
    { text: "WER ZAHLT MEHR STEUERN?", ein: -0.3, art: "klein" },
  ] });
  M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "tief",
    werte: (t) => { const s = S(t); return { a: s.a, b: s.b }; },
    uhr: { ein: 0, zeit: (t) => S(t).e, format: (v) => Math.round(v).toLocaleString("de-DE"), label: "EINKOMMEN" },
  });
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  chip("GLEICHES GEHALT", A.tarife - 1.5, A.tarife + 0.1, "akzent", "voll");
  chip("1 MARK 1900 = 8,50 €", A.eine, A.nur - 0.4, "akzent", "voll");
  chip("NUR EINKOMMENSTEUER", A.nur, A.klar - 0.4, "akzent", "hell");
  chip("KLAR: DAMALS WENIGER?", A.klar, A.start - 0.3, "akzent", "hell");
  chip("KAISERREICH: 76,50 €", A.kaiserR + 0.3, A.frei - 0.4, "a", "voll");
  chip("STEUERFREI BIS 900 MARK", A.frei, A.doch - 0.1, "akzent", "hell");
  chip("BERLIN: +100 %", A.n100 - 0.1, A.gehalt - 0.1, "a", "voll");
  chip("435 € GEGEN 442 €", A.jetzt - 0.1, A.ein - 0.1, "akzent", "voll");
  chip("AB 15.040 € ZAHLT HEUTE MEHR", A.kippt + 0.1, A.n20000 - 0.15, "b", "voll");
  chip("20.000 €: FAKTOR 2,6", A.n20000 + 0.2, A.dann - 0.1, "b", "voll");
  chip("BRUTTO 54.066 € (MITTLERES GEHALT)", A.dann + 0.35, A.zu - 0.4, "akzent", "hell");
  chip("ZU VERSTEUERN 41.932 €", A.zu, A.abstand - 0.1, "akzent", "voll");
  chip("HEUTE: 32 CENT JE EURO", A.heute4, A.damals4 - 0.4, "b", "voll");
  chip("DAMALS: 6 CENT JE EURO", A.damals4, A.endstand - 0.15, "a", "voll");
  chip("4,6 × DURCHSCHNITTSLOHN 1913", A.mit + 0.1, A.kleine - 0.2, "a", "hell");
  // Endstand als Bilanzkarte, „Warum?“ als Balkenpaar, Schlusskarte als Typo
  M.bilanz({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "JAHRESSTEUER", ein: A.endstand + 0.15, aus: A.warum - 0.25,
    zeilen: [{ label: "KAISERREICH", wert: Math.round(Z.damals), einheit: "€", team: "a", ein: A.heute5 + 0.3 }, { label: "HEUTE", wert: Z.heute, einheit: "€", team: "b", ein: A.heute5 }],
    differenz: { label: "HEUTE MEHR", wert: Math.round(Z.diff), einheit: "€", ein: A.n6000 }, sieger: { text: "HEUTE ZAHLT MEHR", team: "b", ein: A.mehr5 + 0.3 },
  });
  M.balken({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "WARUM?", ein: A.warum, aus: A.das - 0.2, max: 12348,
    faktoren: [
      { label: "STEUERFREI BIS", ein: A.heute6, a: { wert: Z.steuerfrei1900, text: "7.650 €" }, b: { wert: Z.grundfreibetrag, text: "12.348 €" }, tag: "HEUTE MEHR", tagEin: A.frei6 },
      { label: "STEUER AUF DEN NÄCHSTEN EURO", ein: A.danach, a: { wert: 12348 * 0.056 / 0.323, text: "6 %" }, b: { wert: 12348, text: "32 %" }, tag: "HEUTE STEIL", tagEin: A.steil },
    ],
  });
  M.pointe({ woerter: [
    { text: "KLEINE", ein: A.kleine, farbe: "a" }, { text: "EINKOMMEN:", ein: A.einkommen, farbe: "a" }, { umbruch: true },
    { text: "DAMALS", ein: A.damals7, farbe: "a" }, { text: "TEURER.", ein: A.teurer, farbe: "a" }, { umbruch: true },
    { text: "AB", ein: A.ab, farbe: "akzent" }, { text: "DER", ein: A.ab + 0.15, farbe: "akzent" }, { text: "MITTE:", ein: A.mitte, farbe: "akzent" }, { umbruch: true },
    { text: "HEUTE.", ein: A.heute7, farbe: "b" },
  ], ein: A.kleine, aus: DAUER + 1, y: 470, groesse: 86 });
  M.untertitel({ max: 4, unten: 1450, groesse: 64, zahlen: true, versteckt: [[A.kleine - 0.1, DAUER + 1]] }); // die Schlusskarte trägt den Text

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.5, "pop", "Amt von 1900 leuchtet"); ev(A.heuteH, "pop", "Finanzamt leuchtet"); ev(A.wer, "whoosh", "Kamera hebt sich: beide Ämter");
  ev(A.tarife, "pop", "Tarif 1891 und 2026"); ev(A.eine, "klick", "Kamera auf Platte: Kaufkraft"); ev(A.eine + 1.5, "whoosh", "Kamera gleitet über die Platte"); ev(A.n850, "ding", "8,50 €: beide Vorplätze leuchten"); ev(A.nur, "pop", "Nur Einkommensteuer");
  ev(A.klar, "whoosh", "Spot auf das Kaiserreich"); ev(A.damalsF, "pop", "Amt von 1900 leuchtet auf"); ev(A.weniger, "ding", "Spot pulst: weniger?"); ev(A.oder, "klick", "Spot wechselt auf heute");
  ev(A.start, "ding", "Säulen wachsen, Einkommen 10.000 €"); ev(A.n0, "klick", "Heute: null"); ev(A.n76, "ding", "Kaiserreich 76,50 €: Münzen fliegen"); ev(A.frei, "pop", "Steuerfrei bis 900 Mark");
  ev(A.n900, "pop", "900 Mark: Amt und Säule leuchten"); ev(A.doch - 0.5, "whoosh", "Kamera zieht zurück"); ev(A.doch, "klick", "Doch: Stadt"); ev(A.stadt, "pop", "Amt leuchtet: Stadt"); ev(A.n100, "whoosh", "Zuschlagsblock wächst auf die Säule"); ev(A.n153, "ding", "Kaiserreich 153 €");
  ev(A.n15000, "whoosh", "Einkommen springt auf 15.000 €"); ev(A.n435, "ding", "Heute 435 €"); ev(A.n442, "ding", "Kaiserreich 442 €"); ev(A.jetzt, "klick", "Kamera nah: knapp");
  ev(A.kippt, "whoosh", "Führung kippt: heute mehr"); ev(A.mehr3, "klick", "Münzen: heute zahlt mehr"); ev(A.n20000, "ding", "Einkommen 20.000 €: Faktor 2,6");
  ev(A.dann, "whoosh", "Kamera hebt sich: mittleres Gehalt"); ev(A.n54066, "pop", "Brutto 54.066 €"); ev(A.n41932, "ding", "zu versteuern 41.932 €"); ev(A.abstand, "klick", "Abstand wächst");
  ev(A.n32, "pop", "Heute: 32 Cent"); ev(A.n6, "pop", "Damals: 6 Cent");
  ev(A.endstand, "ding", "Endstand-Karte"); ev(A.heute5, "klick", "Endstand heute 7.827 €"); ev(A.n6000, "ding", "Differenz 5.821 €");
  ev(A.warum, "klick", "Warum-Karte"); ev(A.heute6, "pop", "Freibetrag-Balken"); ev(A.danach, "pop", "Steuersatz-Balken");
  ev(A.mit, "whoosh", "Kamera auf das Amt von 1900"); ev(A.reich, "ding", "Reich: Durchschnittslohn-Chip"); ev(A.einkommen, "klick", "Schlusskarte: Einkommen"); ev(A.damals7, "klick", "Schlusskarte: damals teurer"); ev(A.ab, "pop", "Schlusskarte: Ab der Mitte"); M.melde({ t: A.heute7, typ: "pointe", klang: "akzent", text: "Schlusskarte: Ab der Mitte: heute" });

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
