// „Aktivrente: Gleiches Gehalt, wer hat mehr netto?“ · Stil 19 Architekturmodell (Abendlicht), Simulierbar 13.11.2026 mittag.
// Zwei identische Büro-Schnitthäuser auf dunkler Platte: links die Kollegin mit 45 (Türkis), rechts die mit 67 (Orange).
// Zwischen den Häusern stehen zwei Acryl-Säulen (Netto, füllen sich bis 2.000 €); jeder Abzug löst sich als Kachel aus der Säule und fliegt davon.
// Hinter den Häusern sammelt sich der Arbeitgeberanteil in der Rentenkasse. Alle Werte aus pipeline/sim/aktivrente.mjs (Tests dort).
// Deterministisch: window.renderAt(t). Der Lohnlauf (Tag 1 bis 30) läuft ab 3 s als Uhr.
import * as THREE from "three";
import { SimBuehne, GRADING, rigAbendsonne, dunst, lichtKegel, lichtBahn, staub, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { modellPlatte, modellHaus, modellBaum, abendWand, acrylMarker, schnittHaus, geldSaeule, modellLaeufer, lichtStrom } from "../../engine/stil_architektur.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, huelle } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/aktivrente.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

const JU = "#22C6D6";   // Kollegin 45
const AL = "#FF7A59";   // Kollegin 67
const AKZENT = "#ECE6DA";
const Z = videoZahlen();

const XL = -1.6, XT = 1.6, SL = -0.42, ST = 0.42;
const HAUS = { breite: 1.7, tiefe: 1.5, etagen: 3, eh: 0.62 };
const SK = (n) => 0.35 + clamp((n - 1300) / 700, 0, 1.1) * 2.4;   // Säulenhöhe je Netto-Euro (gestreckt zwischen 1.300 und 2.000)
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
      a: { name: "KOLLEGIN 45", farbe: JU, woerter: ["Jüngere*", "Jüngeren*", "91,08*", "186*", "26*", "175*", "1.485,92*", "45*"] },
      b: { name: "KOLLEGIN 67", farbe: AL, woerter: ["Ältere*", "169*", "1.795,00*", "67*", "0*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  const A = {
    akt: T("hook:Aktivrente"), job: T("hook:Job"), n2000: T("hook:2.000"), brutto: T("hook:brutto"), wer: T("hook:Wer"), konto: T("hook:Konto"), k67: T("hook:67"), k45: T("hook:45"),
    beide: T("regeln:Beide"), tisch: T("regeln:Schreibtisch"), beide2: T("regeln:Beide#2"), kind: T("regeln:Kind"), kirche: T("regeln:Kirchensteuer"),
    klar: T("falle:Klar"), nettoF: T("falle:Netto"), oder: T("falle:Oder"),
    erster: T("wendung1:Erster"), lst: T("wendung1:Lohnsteuer"), jung1: T("wendung1:Jüngere"), n91: T("wendung1:91,08"), alt1: T("wendung1:Ältere"), null1: T("wendung1:0"), nach: T("wendung1:Nach"), n2000b: T("wendung1:2.000"), frei: T("wendung1:steuerfrei"),
    dann: T("wendung2:Dann"), rv: T("wendung2:Rentenversicherung"), n186: T("wendung2:186"), jung2: T("wendung2:Jüngeren"), befreit: T("wendung2:befreit"), ihr: T("wendung2:Ihr"), arbeitgeber: T("wendung2:Arbeitgeber"), anteil: T("wendung2:Anteil"), was: T("wendung2:Was"), ende: T("wendung2:Ende"),
    av: T("wendung3:Arbeitslosenversicherung"), n26: T("wendung3:26"), gegen3: T("wendung3:gegen"), null3: T("wendung3:0"), abstand: T("wendung3:Abstand"), n303: T("wendung3:303,08"),
    bleibt: T("kipp:Bleibt"), kk: T("kipp:Krankenkasse"), hier: T("kipp:hier"), n175: T("kipp:175"), gegenK: T("kipp:gegen"), n169: T("kipp:169"), ohne: T("kipp:Ohne"), satz: T("kipp:Satz"), pflege: T("kipp:Pflege"), n36: T("kipp:36"), beiden: T("kipp:beiden"),
    nettoE: T("ergebnis:Netto"), n1485: T("ergebnis:1.485,92"), gegenE: T("ergebnis:gegen"), n1795: T("ergebnis:1.795,00"), n309: T("ergebnis:309,08"), mehr: T("ergebnis:mehr"), n3708: T("ergebnis:3.708,96"),
    warum: T("warum:Den"), lstW: T("warum:Lohnsteuer"), rbW: T("warum:Rentenbeitrag"),
    und: T("pointe:Und"), ag: T("pointe:Arbeitgebers"), n186p: T("pointe:186"), rk: T("pointe:Rentenkasse"), ihre: T("pointe:Ihre"), rente: T("pointe:Rente"), n0p: T("pointe:0"),
    gleiches: T("schlusskarte:Gleiches"), brS: T("schlusskarte:Brutto"), n309s: T("schlusskarte:309"), nettoS: T("schlusskarte:netto"),
  };

  // Abzüge (Betrag, Zeitpunkt): jeder gleitet in 0,9 s von der Säule weg
  const ABZ45 = [[Z.lst45, A.n91, "LSt"], [Z.rv45, A.n186, "RV"], [Z.av45, A.n26, "AV"], [Z.kv45, A.n175, "KV"], [Z.pv, A.n36, "PV"]];
  const ABZ67 = [[Z.kv67, A.n169, "KV"], [Z.pv, A.n36 + 0.3, "PV"]];
  const DAU = 0.9;
  const abgezogen = (abz, t) => abz.reduce((s, [b, ta]) => s + b * glatt(t, ta, ta + DAU), 0);
  const hochlauf = (t) => glatt(t, 0.25, A.n2000 + 0.7);   // beide Säulen füllen sich bis 2.000 € (Brutto)

  const S = (t) => {
    const h = hochlauf(t);
    const n45 = Z.brutto * h - abgezogen(ABZ45, t);
    const n67 = Z.brutto * h - abgezogen(ABZ67, t);
    const diff = n67 - n45;
    return {
      n45, n67, diff, h,
      tag: 1 + 29 * glatt(t, A.n2000 + 0.3, A.erster - 0.3),
      saeulen: huelle(t, 0.1, Infinity, { feder: 0.3 }),
      markL: 0.5 + 0.5 * Math.max(huckel(t, A.k45 - 0.2, A.k45 + 0.4, A.beide - 0.1, A.beide + 0.4), huelle(t, A.beide, A.beide + 1.2, { ausDauer: 0.7 })),
      markT: 0.5 + 0.5 * Math.max(huckel(t, A.k67 - 0.2, A.k67 + 0.4, A.oder - 0.1, A.oder + 0.4), huelle(t, A.beide2, A.beide2 + 1.2, { ausDauer: 0.7 })),
      warm: glatt(t, A.klar, A.erster) * 0.3 + glatt(t, A.dann, A.nettoE) * 0.7,
      hoehe: glatt(t, A.kk, A.n309 + 0.5) - 0.5 * glatt(t, A.warum, A.warum + 3),
      spotL: huckel(t, A.klar - 0.1, A.klar + 0.4, A.oder - 0.2, A.oder + 0.2), spotT: huckel(t, A.oder - 0.1, A.oder + 0.4, A.erster - 0.2, A.erster + 0.3),
      pulsL: 0.8 * huelle(t, A.n91, A.n91 + 1.1, { ausDauer: 0.7 }) + 0.8 * huelle(t, A.n186, A.n186 + 1.2, { ausDauer: 0.8 }) + 0.7 * huelle(t, A.n26, A.n26 + 1.1, { ausDauer: 0.7 }) + 0.8 * huelle(t, A.n175, A.n175 + 1.2, { ausDauer: 0.8 }) + 0.9 * huelle(t, A.n1485, A.n1485 + 1.4, { ausDauer: 0.9 }),
      pulsT: 0.9 * huelle(t, A.null1, A.null1 + 1.2, { ausDauer: 0.8 }) + 0.9 * huelle(t, A.befreit, A.befreit + 1.2, { ausDauer: 0.8 }) + 0.8 * huelle(t, A.null3, A.null3 + 1.1, { ausDauer: 0.7 }) + 0.8 * huelle(t, A.n169, A.n169 + 1.2, { ausDauer: 0.8 }) + 1.1 * huelle(t, A.n1795, A.n1795 + 1.5, { ausDauer: 0.9 }),
      kasse: huelle(t, A.arbeitgeber - 0.3, Infinity, { feder: 0.4 }),
      kasseFeuer: Math.max(huelle(t, A.n186p, A.n186p + 1.5, { ausDauer: 1.0 }), 0.35 * glatt(t, A.arbeitgeber, A.was)),
      blick: Math.sin(t * 0.55) * 0.25,
    };
  };
  const SW = M.wert(S);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = abendWand();
  dunst(szene, "#1E2230", 0.02);
  const SONNE = [-0.62, 0.2, -0.76];
  const rig = rigAbendsonne(szene, buehne.renderer, { richtung: SONNE, ziel: [0, 0, 0], bereich: 11, schatten: SCHATTEN, farbe: "#FFB070", staerke: 3.6, himmel: "#7A8AAA", boden: "#3A2E26", himmelStaerke: 0.45, umgebungsStaerke: 0.36 });
  szene.add(modellPlatte({ breite: 22, tiefe: 24, strassen: [{ z: 3.1, richtung: "x", breite: 1.3 }, { x: -4.6, richtung: "z", breite: 1.1 }], holz: false, tisch: "#1C1916" }));
  // Kulisse: Büro- und Wohnblöcke aus Karton ringsum, einzelne Bäume
  for (let i = 0; i < 70; i++) {
    const x = -10 + (i % 10) * 2.15 + hash(i, 1) * 0.5, z = -10.5 + Math.floor(i / 10) * 2.0 + hash(i, 2) * 0.4;
    if (Math.abs(x) < 3.7 && z > -3.6 && z < 4.2) continue;
    if (Math.abs(x + 4.6) < 0.9 || Math.abs(z - 3.1) < 1.0) continue;
    const sattel = hash(i, 4) < 0.35;
    const h = modellHaus({ breite: 1.3 + hash(i, 5) * 0.7, hoehe: sattel ? 0.9 + hash(i, 6) * 0.7 : 1.5 + hash(i, 6) * 2.2, tiefe: 1.2 + hash(i, 7) * 0.6, dach: sattel ? "sattel" : "flach", material: hash(i, 8) < 0.15 ? "holz" : "karton", seed: i + 30 });
    h.position.set(x, 0, z); h.rotation.y = hash(i, 9) < 0.5 ? 0 : Math.PI / 2;
    szene.add(h);
  }
  for (let i = 0; i < 22; i++) { const b = modellBaum({ groesse: 0.5 + hash(i, 21) * 0.4, seed: 100 + i, farbe: i % 3 ? "#5B6B4F" : "#8A6A3A" }); b.position.set(-8 + i * 0.8 + hash(i, 22) * 0.3, 0, 4.9 + hash(i, 23) * 0.8); szene.add(b); }

  const hausL = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 8, licht: 0.9 });
  const hausT = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 8, licht: 0.9 });
  hausL.position.set(XL, 0, 0); hausT.position.set(XT, 0, 0); szene.add(hausL, hausT);
  const markL = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: JU }); markL.position.set(XL, 0.03, 0); szene.add(markL);
  const markT = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: AL }); markT.position.set(XT, 0.03, 0); szene.add(markT);
  const vorL = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: JU, deckkraft: 0.28 }); vorL.position.set(XL, 0, 1.15); szene.add(vorL);
  const vorT = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: AL, deckkraft: 0.28 }); vorT.position.set(XT, 0, 1.15); szene.add(vorT);
  const kolL = modellLaeufer({ groesse: 0.85, farbe: JU, jacke: 0.7 }); szene.add(kolL);
  const kolT = modellLaeufer({ groesse: 0.85, farbe: AL, jacke: 0.7 }); szene.add(kolT);

  const saeuleL = geldSaeule({ breite: 0.3, farbe: JU, deckkraft: 0.26 }); saeuleL.position.set(SL, 0, 0.35); szene.add(saeuleL);
  const saeuleT = geldSaeule({ breite: 0.3, farbe: AL, deckkraft: 0.26 }); saeuleT.position.set(ST, 0, 0.35); szene.add(saeuleT);
  const leisteL = geldSaeule({ breite: 0.12, farbe: JU, deckkraft: 0.4, kanten: 3.6 }); leisteL.rotation.z = Math.PI / 2; leisteL.position.set(0, 0.07, 1.0); szene.add(leisteL);
  const leisteT = geldSaeule({ breite: 0.12, farbe: AL, deckkraft: 0.4, kanten: 3.6 }); leisteT.rotation.z = -Math.PI / 2; leisteT.position.set(0, 0.07, 1.0); szene.add(leisteT);

  // Abzugskacheln: eine je Abzug, fliegt aus der Säule nach außen und oben und verblasst
  const KACHEL_FARBE = { LSt: "#F2C14E", RV: "#C9B8FF", AV: "#9AD7FF", KV: "#FF9EC4", PV: "#B6F2A4" };
  const kacheln = [];
  const mach = (liste, seite) => liste.forEach(([b, ta, art], idx) => {
    if (b <= 0) return;
    const m = acrylMarker({ breite: 0.34, tiefe: 0.34, hoehe: 0.12 + Math.min(0.22, b / 900), farbe: KACHEL_FARBE[art], deckkraft: 0.45, kanten: 3.4 });
    szene.add(m); kacheln.push({ m, ta, seite, art, b, idx });
  });
  mach(ABZ45, -1); mach(ABZ67, 1);

  // Rentenkasse hinter den Häusern, Lichtstrom vom Arbeitgeber (hinter dem rechten Haus) in die Kasse
  const kasse = acrylMarker({ breite: 1.1, tiefe: 0.7, hoehe: 0.9, farbe: "#C9B8FF", deckkraft: 0.3 }); kasse.position.set(0, 0, -2.4); szene.add(kasse);
  const strom = lichtStrom({ punkte: [[XT + 0.2, 1.4, -0.9], [XT - 0.6, 1.8, -1.6], [0.7, 1.4, -2.1], [0.25, 0.9, -2.35]], farbe: "#C9B8FF", radius: 0.02, kugeln: 7, kugelRadius: 0.055, staerke: 2.4 }); szene.add(strom);
  const sackT = acrylMarker({ breite: 0.55, tiefe: 0.5, hoehe: 0.5, farbe: AL, deckkraft: 0.25 }); sackT.position.set(XT, 0.0, -1.3); szene.add(sackT);

  const kegel = (farbe) => { const k = lichtKegel({ hoehe: 5.0, radiusOben: 0.1, radiusUnten: 1.1, farbe, staerke: 0.55, streifen: 0.25 }); k.material = k.material.clone(); k.userData.dynamisch = true; szene.add(k); return k; };
  const kegelL = kegel(JU), kegelT = kegel(AL);
  szene.add(staub({ anzahl: 500, bereich: [10, 5, 10], mitte: [0, 2, 0], farbe: "#FFC796", groesse: 0.013, staerke: 1.2, aussen: 0.35 }));
  const richt = new THREE.Vector3(...SONNE).normalize();
  for (const [x, z, b, st] of [[-2.9, -0.5, 1.2, 0.08], [0.0, -1.0, 1.4, 0.07], [3.4, -1.5, 1.0, 0.07]]) {
    const l = lichtBahn({ laenge: 13, breite: b, farbe: "#FFB57A", staerke: st, streifen: 0.6 });
    l.position.set(x + richt.x * 9, richt.y * 9, z + richt.z * 9);
    l.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), richt.clone().negate());
    l.rotateY(Math.PI / 2);
    szene.add(l);
  }
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(34, 1080 / 1920, 0.1, 220);
  const shot = (t, pos, ziel, fov = 40) => ({ t, pos, ziel, fov });
  const SH = [
    shot(0, [0, 6.6, 11.6], [0, 1.2, 0.2], 42),
    shot(A.akt + 0.8, [-0.9, 5.8, 11.0], [-0.8, 1.15, 0.3], 41),
    shot(A.job + 0.2, [0.9, 5.8, 11.0], [0.8, 1.15, 0.3], 41),
    shot(A.n2000 + 0.2, [0.0, 4.6, 10.0], [0, 0.9, 0.8], 38),
    shot(A.wer, [0.0, 6.8, 12.4], [0, 1.2, 0.3], 42),
    shot(A.k67 - 0.2, [1.4, 5.0, 10.4], [1.3, 1.0, 0.5], 38),
    shot(A.beide, [-1.0, 4.4, 9.6], [-1.0, 0.9, 0.8], 38),
    shot(A.beide2, [1.0, 4.4, 9.6], [1.0, 0.9, 0.8], 38),
    shot(A.kirche, [0.0, 6.8, 12.8], [0, 1.2, 0.3], 41),
    shot(A.klar - 0.1, [-1.2, 5.4, 10.4], [-1.2, 1.0, 0.5], 38),
    shot(A.oder + 0.2, [1.2, 5.4, 10.4], [1.2, 1.0, 0.5], 38),
    shot(A.erster - 0.1, [-0.6, 3.8, 8.8], [-0.6, 1.2, 0.9], 38),
    shot(A.alt1 - 0.2, [1.4, 4.2, 9.4], [1.2, 1.2, 0.8], 37),
    shot(A.nach, [0.0, 6.2, 12.4], [0, 1.2, 0.3], 41),
    shot(A.dann, [-0.8, 4.6, 10.0], [-0.8, 1.3, 0.6], 38),
    shot(A.befreit - 0.2, [1.2, 4.8, 10.2], [1.2, 1.1, 0.5], 38),
    shot(A.ihr, [1.0, 5.4, 11.6], [0.6, 1.0, -0.6], 40),
    shot(A.was, [0.0, 6.4, 12.8], [0, 1.2, -0.3], 42),
    shot(A.av, [-0.8, 4.4, 9.8], [-0.7, 1.2, 0.7], 37),
    shot(A.abstand, [0.0, 4.0, 9.2], [0, 1.1, 1.0], 36),
    shot(A.bleibt, [0.0, 6.6, 12.8], [0, 1.4, 0.3], 41),
    shot(A.n175 - 0.2, [-0.8, 4.6, 10.0], [-0.6, 1.3, 0.6], 37),
    shot(A.n169 - 0.2, [0.9, 4.6, 10.0], [0.6, 1.3, 0.6], 37),
    shot(A.pflege, [0.0, 5.6, 11.4], [0, 1.4, 0.4], 38),
    shot(A.nettoE, [0.0, 5.6, 11.4], [0, 1.6, 0.4], 38),
    shot(A.n1795 - 0.2, [0.4, 4.4, 9.6], [0.4, 1.6, 0.6], 36),
    shot(A.n309, [0.0, 4.2, 9.4], [0, 1.0, 1.0], 35),
    shot(A.warum - 0.1, [0.0, 7.0, 13.6], [0, 1.4, 0.3], 42),
    shot(A.und, [0.8, 5.4, 11.4], [0.3, 1.0, -0.8], 40),
    shot(A.n186p - 0.2, [0.2, 4.6, 9.8], [0.1, 1.0, -1.6], 38),
    shot(A.ihre, [1.4, 4.4, 9.8], [1.2, 1.2, 0.5], 37),
    shot(A.gleiches, [0.0, 7.2, 13.8], [0, 1.4, 0.3], 42),
  ].sort((a, b) => a.t - b.t);
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const ziel = a.ziel.map((v, k) => lerp(v, b.ziel[k], p));
    const FK = 1.26;
    return { pos: a.pos.map((v, k) => ziel[k] + (lerp(v, b.pos[k], p) - ziel[k]) * FK), ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  regie.zoom({ t: A.n91 - 0.3, ziel: [-0.6, 1.2, 0.8], staerke: 0.14, halt: 1.6, rueck: 0.9 });
  regie.zoom({ t: A.n303 - 0.4, ziel: [0.0, 1.6, 0.4], staerke: 0.14, halt: 1.6, rueck: 0.9 });
  regie.zoom({ t: A.n309 - 0.4, ziel: [0.0, 2.0, 0.4], staerke: 0.14, halt: 1.8, rueck: 0.9 });
  regie.zoom({ t: A.n0p - 0.6, ziel: [1.2, 1.2, 0.4], staerke: 0.14, halt: 1.8, rueck: 0.8 });

  const sonne = rig.sonne, hemi = rig.hemi;
  const sonneBasis = new THREE.Color("#FFB070"), sonneHeiss = new THREE.Color("#FF9250");
  const sonnenPunkt = new THREE.Vector3(...SONNE).normalize().multiplyScalar(60).toArray();
  const post = { ...GRADING.abend, belichtung: 0.9, splitStaerke: 0.24, saettigung: 1.0, kontrast: 1.12, vignette: 0.42, bloomSchwelle: 1.2, lift: [0.004, 0.004, 0.012], strahlen: 0.22, strahlenPunkt: sonnenPunkt, strahlenSchwelle: 1.4, strahlenLaenge: 0.75, strahlenAbfall: 0.97, strahlenFarbe: [1, 0.78, 0.55] };
  const tmp = new THREE.Vector3();
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t);
      kolL.scale.setScalar(0.85); kolT.scale.setScalar(0.85);
      kolL.position.set(XL - 0.35, 0, 1.2); kolL.rotation.y = 0.35 + s.blick;
      kolT.position.set(XT + 0.35, 0, 1.2); kolT.rotation.y = -0.35 - s.blick;
      kolL.pose({ geh: t * 1.2, schritt: 0, sitz: 0 }); kolT.pose({ geh: t * 1.2, schritt: 0, sitz: 0 });
      kolL.leuchte(0.8 + 1.4 * s.pulsL + 0.5 * s.spotL); kolT.leuchte(0.8 + 1.4 * s.pulsT + 0.5 * s.spotT);
      markL.setze(s.markL); markT.setze(s.markT);
      vorL.setze(0.35 + 0.65 * s.pulsL); vorT.setze(0.35 + 0.65 * s.pulsT);
      saeuleL.setze(s.saeulen > 0.01 ? s.saeulen : 0); saeuleL.hoehe(Math.max(0.01, s.h < 0.02 ? 0.01 : SK(s.n45))); saeuleL.puls(0.3 + 0.9 * s.pulsL);
      saeuleT.setze(s.saeulen > 0.01 ? s.saeulen : 0); saeuleT.hoehe(Math.max(0.01, s.h < 0.02 ? 0.01 : SK(s.n67))); saeuleT.puls(0.3 + 0.9 * s.pulsT);
      const L = 0.36 * Math.pow(Math.abs(s.diff) / 150, 0.7);
      leisteL.setze(s.saeulen > 0.01 && s.diff < -1 ? s.saeulen : 0); leisteT.setze(s.saeulen > 0.01 && s.diff > 1 ? s.saeulen : 0);
      leisteL.hoehe(Math.max(0.01, L)); leisteT.hoehe(Math.max(0.01, L));
      leisteL.puls(0.3 + 0.7 * s.pulsL); leisteT.puls(0.3 + 0.7 * s.pulsT);
      // Kacheln
      for (const k of kacheln) {
        const u = fortschritt(t, k.ta, k.ta + 1.4);
        const sicht = u > 0 && u < 1;
        k.m.visible = sicht;
        if (!sicht) continue;
        const x0 = k.seite < 0 ? SL : ST, y0 = SK(Z.brutto - (k.seite < 0 ? abgezogen(ABZ45, k.ta) : abgezogen(ABZ67, k.ta))) * 0.9;
        const e = ease.inOutSine(u);
        k.m.position.set(x0 + k.seite * (0.2 + 1.5 * e), y0 + 0.9 * e + 0.15 * k.idx * e, 0.35 + 0.5 * e);
        k.m.rotation.y = k.seite * e * 1.2;
        k.m.setze(clamp(1.6 * Math.min(u * 4, 1) * (1 - Math.max(0, (u - 0.7) / 0.3))));
      }
      kasse.setze(s.kasse); strom.setze(s.kasse); strom.lauf(t, 0.3);
      sackT.setze(0.3 + 0.7 * s.kasse);
      kegelL.visible = s.spotL > 0.01; kegelL.material.uniforms.staerke.value = 0.7 * s.spotL; kegelL.position.set(XL, 5.0, 1.0);
      kegelT.visible = s.spotT > 0.01; kegelT.material.uniforms.staerke.value = 0.7 * s.spotT; kegelT.position.set(XT, 5.0, 1.0);
      sonne.target.position.set(0, 0, 0); sonne.position.set(rig.richtung.x * 40, rig.richtung.y * 40, rig.richtung.z * 40); sonne.target.updateMatrixWorld();
      sonne.color.copy(sonneBasis).lerp(sonneHeiss, s.warm);
      sonne.intensity = 3.6 + 1.0 * s.warm + 0.6 * s.hoehe + 0.5 * s.kasseFeuer;
      hemi.intensity = 0.42 - 0.06 * s.hoehe;
      post.bloomStaerke = 0.5 + 0.22 * s.hoehe + 0.15 * s.kasseFeuer;
      post.vignette = 0.42 + 0.08 * s.hoehe;
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, regie.zustand(t).ziel, { tiefe: 0.3, nah: 0.45, fern: 0.6 }));
    },
  };

  // ---------- HUD ----------
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 2, max: 9999 }, rechts: { team: "b", einheit: "€", nk: 2, max: 9999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: s.n45, b: s.n67 }; },
    uhr: { ein: 0, zeit: (t) => SW(t).tag, format: (v) => `${Math.floor(v + 1e-6)}`, label: "TAG IM MONAT" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return Math.abs(w.a - w.b) < 0.005 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "hell", y = 490) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.1) => x - d;
  // Statuszeile (y 372)
  chip("BRUTTO 2.000 € · BEIDE GLEICH", 0.05, A.beide - 0.35, "akzent", "hell", 372);
  chip("LOHNLAUF LÄUFT", A.beide - 0.05, A.erster - 0.35, "akzent", "hell", 372);
  chip("ABZUG 1 · LOHNSTEUER", A.erster - 0.05, A.dann - 0.35, "akzent", "voll", 372);
  chip("ABZUG 2 · RENTENVERSICHERUNG", A.dann - 0.05, A.av - 0.35, "akzent", "voll", 372);
  chip("ABZUG 3 · ARBEITSLOSENVERS.", A.av - 0.05, A.bleibt - 0.35, "akzent", "voll", 372);
  chip("ABZUG 4 · KRANKENKASSE", A.bleibt - 0.05, A.nettoE - 0.35, "akzent", "voll", 372);
  // Regeln (Chips, während der Lohnlauf läuft)
  chip("GLEICHER SCHREIBTISCH", v(A.tisch, 0.3), v(A.klar, 0.4), "akzent", "voll", 490);
  chip("EIN KIND · KEINE KIRCHENSTEUER", v(A.kind, 0.05), v(A.klar, 0.4), "akzent", "voll", 610);
  chip("KRANKENKASSE Ø 2,9 % ZUSATZ", v(A.kirche, 0.0), v(A.klar, 0.4), "akzent", "hell", 730);
  chip("45 · STEUERKLASSE 1", v(A.beide, 0.05), v(A.beide2, 0.4), "a", "voll", 850);
  chip("67 · RENTE WIRD BEZOGEN", v(A.beide2, 0.05), v(A.klar, 0.4), "b", "voll", 850);
  // Denkfalle
  chip("GLEICHES BRUTTO = GLEICHES NETTO?", v(A.klar, 0.05), v(A.erster, 0.2), "akzent", "voll");
  // Wendung 1
  chip("LOHNSTEUER 91,08 €", v(A.n91, 0.1), v(A.alt1, 0.45), "a", "voll");
  chip("LOHNSTEUER 0 €", v(A.alt1, 0.0), v(A.dann, 0.2), "b", "voll");
  chip("SEIT 2026: BIS 2.000 € STEUERFREI", v(A.nach, 0.0), v(A.dann, 0.2), "akzent", "hell", 650);
  // Wendung 2
  chip("RENTENBEITRAG 186 €", v(A.n186, 0.1), v(A.befreit, 0.45), "a", "voll");
  chip("BEFREIT · 0 €", v(A.befreit, 0.0), v(A.av, 0.2), "b", "voll");
  chip("ARBEITGEBER ZAHLT TROTZDEM?", v(A.ihr, 0.05), v(A.av, 0.2), "akzent", "voll", 650);
  // Wendung 3
  chip("ARBEITSLOSENVERS. 26 € · 0 €", v(A.n26, 0.1), v(A.abstand, 0.5), "akzent", "voll");
  chip("ABSTAND 303,08 €", v(A.abstand, 0.0), v(A.bleibt, 0.2), "akzent", "voll");
  // Kipp-Moment
  chip("KRANKENKASSE: BEIDE ZAHLEN", v(A.hier, 0.05), v(A.n175, 0.5), "akzent", "voll");
  chip("175 € GEGEN 169 €", v(A.n175, 0.1), v(A.ohne, 0.1), "akzent", "voll");
  chip("OHNE KRANKENGELD: NIEDRIGERER SATZ", v(A.ohne, 0.0), v(A.pflege, 0.2), "b", "hell", 590);
  chip("PFLEGE · 36 € BEI BEIDEN", v(A.pflege, 0.0), v(A.nettoE, 0.15), "akzent", "voll");
  // Ergebnis und Warum
  M.bilanz({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "NETTO IM MONAT", ein: A.nettoE + 0.15, aus: A.warum - 0.2,
    zeilen: [{ label: "KOLLEGIN 45", wert: Z.netto45, nk: 2, einheit: "€", team: "a", ein: A.n1485 - 0.05 }, { label: "KOLLEGIN 67", wert: Z.netto67, nk: 2, einheit: "€", team: "b", ein: A.n1795 - 0.05 }],
    differenz: { label: "MEHR NETTO", wert: Z.diffMonat, nk: 2, einheit: "€", ein: A.n309 - 0.1 },
  });
  M.balken({
    x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.warum + 0.3, aus: A.und - 0.3, max: 200,
    faktoren: [
      { label: "LOHNSTEUER · € IM MONAT", ein: A.lstW - 0.2, a: { wert: Z.lst45, text: "91,08" }, b: { wert: 0, text: "0" }, tag: "STEUERFREI", tagEin: A.lstW },
      { label: "RENTENBEITRAG · € IM MONAT", ein: A.rbW - 0.2, a: { wert: Z.rv45, text: "186" }, b: { wert: 0, text: "0" }, tag: "BEFREIT", tagEin: A.rbW },
    ],
  });
  // Pointe: Arbeitgeberanteil und die Rente der Älteren
  M.zaehler({ wert: (t) => Z.agRvMonat * glatt(t, A.n186p - 0.1, A.n186p + 1.0), einheit: " €", nk: 0, max: 999, team: "akzent", art: "voll", label: "ARBEITGEBER · MONAT", punkt: () => proj([0, 1.45, -2.4]), ein: v(A.n186p, 0.2), aus: v(A.ihre, 0.2) });
  M.zaehler({ wert: () => 0, einheit: " €", nk: 0, max: 999, team: "b", art: "voll", label: "RENTE STEIGT UM", punkt: () => proj([XT, 2.55, 0.2]), ein: v(A.n0p, 0.4), aus: v(A.gleiches, 0.3) });
  chip("RENTENKASSE", v(A.rk, 0.05), v(A.ihre, 0.1), "akzent", "hell", 590);
  chip("+0 € RENTE FÜR 67", v(A.rente, 0.0), v(A.gleiches, 0.3), "b", "voll", 490);
  M.titel({ woerter: [{ text: "AKTIVRENTE", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "NETTO 45", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "67", ein: -0.3, team: "b" }, { umbruch: true }, { text: "WER HAT MEHR?", ein: -0.3, art: "klein" }], y: 470, groesse: 100, aus: A.beide - 0.15 });
  M.pointe({ woerter: [{ text: "GLEICHES BRUTTO,", ein: A.gleiches, farbe: "akzent" }, { umbruch: true }, { text: "309 € MEHR", ein: A.n309s, farbe: "b" }, { umbruch: true }, { text: "NETTO.", ein: A.nettoS, farbe: "akzent" }], ein: A.gleiches, y: 470, groesse: 88 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "pop", "Kamera gleitet, Säulen füllen sich bis 2.000 €"); ev(A.akt + 0.2, "pop", "Haus der 45-Jährigen leuchtet türkis"); ev(A.job, "pop", "Haus der 67-Jährigen leuchtet orange"); ev(A.wer, "whoosh", "Kamera zurück, beide Büros");
  ev(A.beide, "whoosh", "Kamera nah an das Haus der 45-Jährigen, Titel blendet aus"); ev(A.tisch, "klick", "Chip gleicher Schreibtisch"); ev(A.beide2, "whoosh", "Kamera wechselt zur 67-Jährigen"); ev(A.kind, "klick", "Chip Kind, keine Kirchensteuer"); ev(A.kirche, "klick", "Chip Zusatzbeitrag");
  ev(A.klar, "whoosh", "Spot auf die 45-Jährige"); ev(A.nettoF, "pop", "Chip gleiches Netto"); ev(A.oder, "klick", "Spot wechselt zur 67-Jährigen");
  ev(A.erster, "whoosh", "Kamera nah, Lohnlauf Tag 30"); ev(A.n91, "ding", "Lohnsteuer-Kachel löst sich links, Säule sinkt"); ev(A.alt1, "klick", "Rechts bleibt die Säule stehen, 0 € leuchtet"); ev(A.nach, "whoosh", "Kamera zurück, Chip steuerfrei bis 2.000 €");
  ev(A.dann, "whoosh", "Kamera zur Jüngeren, Rentenversicherung"); ev(A.n186, "ding", "186-€-Kachel fliegt links davon"); ev(A.befreit, "klick", "Ältere befreit, Haus rechts glüht"); ev(A.ihr, "whoosh", "Kamera zur Rentenkasse, Lichtstrom vom Arbeitgeber"); ev(A.was, "klick", "Chip Arbeitgeber zahlt trotzdem");
  ev(A.av, "whoosh", "Kamera zur Jüngeren, Arbeitslosenversicherung"); ev(A.n26, "ding", "26-€-Kachel fliegt links davon"); ev(A.abstand, "ding", "Abstand 303,08 € wächst, Leiste leuchtet");
  ev(A.bleibt, "whoosh", "Kamera hebt sich, Krankenkasse bei beiden"); ev(A.n175, "ding", "175-€-Kachel links"); ev(A.n169, "ding", "169-€-Kachel rechts"); ev(A.pflege, "whoosh", "Kamera mittig, Pflege bei beiden"); ev(A.n36, "ding", "36-€-Kacheln beidseitig");
  ev(A.nettoE, "whoosh", "Kamera nah, Endstand-Karte erscheint"); ev(A.n1795 - 0.05, "ding", "1.795,00 € rechts"); ev(A.n309 - 0.1, "ding", "Differenz 309,08 € glüht");
  ev(A.warum, "whoosh", "Erklärgrafik Warum"); ev(A.lstW, "ding", "Balken Lohnsteuer"); ev(A.rbW, "ding", "Balken Rentenbeitrag");
  ev(A.und, "whoosh", "Kamera zur Rentenkasse, Arbeitgeberanteil"); ev(A.n186p, "ding", "186 € fließen in die Kasse, Zähler läuft"); ev(A.ihre, "whoosh", "Kamera zur Älteren, Rente bleibt"); ev(A.n0p, "ding", "Rente steigt um 0 €");
  ev(A.gleiches, "akzent", "Welt dunkelt ab, Schlusskarte"); ev(A.n309s, "akzent", "309 € leuchtet");
  const sortiert = []; M.extra.forEach((e) => sortiert.push(e.t)); sortiert.sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Licht wandert, Kolleginnen atmen"); }
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
