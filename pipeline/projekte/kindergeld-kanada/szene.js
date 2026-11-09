// „Kindergeld in Deutschland oder in Kanada: Wo zahlt der Staat bis 18 mehr?“ · Stil 19 Architekturmodell (Abendlicht), Simulierbar 10.11.2026 abend.
// Zwei Kinderzimmer-Schnitthäuser auf dunkler Platte: links Deutschland (Blau), rechts Kanada (Rot). Das Kind vor jedem Haus wächst mit den Jahren.
// Zwischen den Häusern wachsen zwei Acryl-Säulen (Kindergeld bzw. CCB, aufsummiert), davor zeigt eine Vorsprung-Leiste, wer vorn liegt;
// ein Einkommens-Schieberegler steuert Kanadas Kürzung (Grenze 38.237 CAD). Alle Werte kommen aus pipeline/sim/kindergeld.mjs (Tests dort).
// Deterministisch: window.renderAt(t). Die Jahresuhr läuft an den gesprochenen Zwischenständen entlang.
import * as THREE from "three";
import { SimBuehne, GRADING, rigAbendsonne, dunst, lichtKegel, lichtBahn, staub, buendeln, fokus, aktualisiere, leuchtMat } from "../../engine/sim_atmosphaere.js";
import { modellPlatte, modellHaus, modellBaum, abendWand, acrylMarker, schnittHaus, geldSaeule, modellLaeufer } from "../../engine/stil_architektur.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, huelle } from "../../engine/bewegung.js";
import { P, ccbJahrCad, videoZahlen } from "../../sim/kindergeld.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Licht, Acryl, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const DE = "#3D8BFF";
const CA = "#FF4D5A";
const AKZENT = "#ECE6DA";

// ---------- Rechnung (getestet in sim/kindergeld.mjs) ----------
const Z = videoZahlen();
const KURS = P.kurs;
const CAD_50K = P.einkommenEur * KURS;                    // 78.525 CAD
const CAD_40K = 40000 * KURS;                             // Pointe: 40.000 € = 62.820 CAD
const GRENZE = P.grenze1;                                 // 38.237 CAD
const deSumme = (j) => P.kindergeldMonat * 12 * j;
const caSumme = (j, cad) => (ccbJahrCad(cad, 0) / KURS) * Math.min(j, P.jahreU6) + (ccbJahrCad(cad, P.jahreU6) / KURS) * Math.max(0, j - P.jahreU6);
const caMonat = (j, cad) => ccbJahrCad(cad, j < P.jahreU6 ? 0 : P.jahreU6) / KURS / 12;

// ---------- Weltmaße ----------
const XL = -1.6, XT = 1.6;                                // Häuser (links Deutschland, rechts Kanada)
const SL = -0.42, ST = 0.42;                              // Säulen
const HAUS = { breite: 1.7, tiefe: 1.5, etagen: 3, eh: 0.62 };
const SK = (v) => Math.pow(clamp(v / 56000, 0, 1.4), 0.6) * 2.9; // Säulenhöhe je Euro (gestaucht, damit kleine Beträge sichtbar sind)
const SLX0 = -1.1, SLX1 = 1.1, CAD_A = 30000, CAD_B = 110000;     // Schieberegler: Spur und CAD-Bereich
const sx = (cad) => lerp(SLX0, SLX1, (cad - CAD_A) / (CAD_B - CAD_A));

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
      a: { name: "DEUTSCHLAND", farbe: DE, woerter: ["Deutschland*", "deutsche*", "259*"] },
      b: { name: "KANADA", farbe: CA, woerter: ["Kanada*", "kanadische*", "432,82*", "283,18*", "215,58*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    deutsch: T("hook:Deutschland"), gegen: T("hook:gegen"), kanadaH: T("hook:Kanada"), wo: T("hook:Wo"), kindergeld: T("hook:Kindergeld"),
    ein: T("regeln:Ein"), kind: T("regeln:Kind"), einkommen: T("regeln:Einkommen"), n50: T("regeln:50.000"), gezaehlt: T("regeln:Gezählt"), alles: T("regeln:Alles"),
    klar: T("falle:Klar"), kanadaF: T("falle:Kanada"), klein: T("falle:Kleinkinder"), oder: T("falle:Oder"),
    jahr1: T("rennen:Jahr"), deR: T("rennen:Deutschland"), n259: T("rennen:259"), egal: T("rennen:Egal"),
    kanadaR: T("rennen:Kanada"), n43282: T("rennen:432,82"),
    doch: T("wendung1:Doch"), rechnet: T("wendung1:rechnet"), ab1: T("wendung1:Ab"), grenze: T("wendung1:Grenze"), dollar: T("wendung1:Dollar"), n7: T("wendung1:7"),
    hier: T("wendung1:Hier"), n283: T("wendung1:283,18"), trotzdem: T("wendung1:trotzdem"),
    nach: T("wendung2:Nach"), n6: T("wendung2:6"), n1741: T("wendung2:1.741"),
    ab3: T("wendung3:Ab"), nur: T("wendung3:Nur"), n215: T("wendung3:215,58"), deW: T("wendung3:Deutschland"), holt: T("wendung3:holt"), n521: T("wendung3:521"),
    j7: T("kipp:7"), j8: T("kipp:8"), vorsprung: T("kipp:Vorsprung"), mit: T("kipp:Mit"), n9: T("kipp:9"), deK: T("kipp:Deutschland"), ueberholt: T("kipp:überholt"),
    endstand: T("ergebnis:Endstand"), n18e: T("ergebnis:18"), deE: T("ergebnis:Deutschland"), vorne: T("ergebnis:vorn"), n4511: T("ergebnis:4.511"),
    warum: T("warum:Warum"), kanadaW: T("warum:Kanada"), kuerzt: T("warum:kürzt"), einkW: T("warum:Einkommen"), und: T("warum:Und"), schulk: T("warum:Schulkinder"),
    aber: T("pointe:Aber"), unter: T("pointe:unter"), n464: T("pointe:46.400"), gewinnt: T("pointe:gewinnt"),
    den: T("schlusskarte:Den"), das: T("schlusskarte:das"), einkS: T("schlusskarte:Einkommen"),
  };

  // ---------- Zeitachse des Modells: Alter des Kindes in Jahren ----------
  const jahrRoh = pchip([
    [0, 0], [A.jahr1, 0], [A.n259 + 1.0, 1], [A.nach - 0.1, 1], [A.n6 + 2.2, 6], [A.ab3 + 2.6, 6], [A.j7 - 0.5, 6.9], [A.j7 + 0.05, 7], [A.j8 + 0.05, 8],
    [A.n9 + 1.9, 9.42], [A.ueberholt + 0.45, 9.42], [A.n18e + 0.1, 18], [DAUER, 18],
  ]);
  // Schieberegler (CAD): links geparkt (bis zu), Wendung 1 fährt auf 78.525 CAD, Pointe zurück auf 62.820 CAD
  const cadRoh = pchip([
    [0, CAD_A], [A.rechnet, CAD_A], [A.n7 + 0.4, CAD_50K], [A.aber + 0.05, CAD_50K], [A.n464 + 1.2, CAD_40K], [DAUER, CAD_40K],
  ]);

  const S = (t) => {
    const j = jahrRoh(t);
    const cad = cadRoh(t);
    const a = deSumme(j), b = caSumme(j, cad);
    const diff = a - b; // > 0: Deutschland vorn
    return {
      j, cad, a, b, diff,
      saeulen: huelle(t, A.n50 - 0.1, Infinity, { feder: 0.3 }),
      markL: 0.5 + 0.5 * Math.max(huckel(t, A.deutsch - 0.1, A.deutsch + 0.3, A.gegen - 0.1, A.gegen + 0.4), huelle(t, A.wo, A.wo + 1.2, { ausDauer: 0.7 }), huelle(t, A.kind, A.kind + 1.0, { ausDauer: 0.6 })),
      markT: 0.5 + 0.5 * Math.max(huckel(t, A.kanadaH - 0.05, A.kanadaH + 0.3, A.wo - 0.1, A.wo + 0.5), huelle(t, A.wo, A.wo + 1.2, { ausDauer: 0.7 }), huelle(t, A.kind, A.kind + 1.0, { ausDauer: 0.6 })),
      slider: huelle(t, A.doch - 0.1, Infinity, { feder: 0.3 }),
      grenzeLeucht: Math.max(huelle(t, A.grenze, A.grenze + 1.3, { ausDauer: 0.8 }), 0.35 * glatt(t, A.doch, A.grenze)),
      warm: glatt(t, A.klar, A.doch) * 0.3 + glatt(t, A.nach, A.endstand) * 0.7,
      hoehe: glatt(t, A.nach, A.ueberholt + 0.5) - 0.5 * glatt(t, A.warum, A.warum + 3),
      spotD: huckel(t, A.oder - 0.1, A.oder + 0.4, A.jahr1 - 0.2, A.jahr1 + 0.3), spotK: huckel(t, A.klar - 0.1, A.klar + 0.5, A.oder - 0.15, A.oder + 0.3),
      pulsD: 0.6 * huelle(t, A.n259, A.n259 + 1.1, { ausDauer: 0.7 }) + 0.7 * huelle(t, A.deW, A.deW + 1.2, { ausDauer: 0.7 }) + 0.9 * huelle(t, A.n521, A.n521 + 1.2, { ausDauer: 0.8 }) + huelle(t, A.deK, A.deK + 1.4, { ausDauer: 0.9 }) + 0.8 * huelle(t, A.deE, A.deE + 1.4, { ausDauer: 0.9 }),
      pulsK: 0.7 * huelle(t, A.n43282, A.n43282 + 1.1, { ausDauer: 0.7 }) + 0.8 * huelle(t, A.n283, A.n283 + 1.2, { ausDauer: 0.8 }) + 0.8 * huelle(t, A.n1741, A.n1741 + 1.2, { ausDauer: 0.8 }) + 0.7 * huelle(t, A.n215, A.n215 + 1.2, { ausDauer: 0.7 }) + huelle(t, A.gewinnt, A.gewinnt + 1.5, { ausDauer: 0.9 }),
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

  // Kulisse links: deutsche Kartonhäuser in Reihen; rechts: Ahorn- und Nadelwald (Kanada)
  for (let i = 0; i < 70; i++) {
    const x = -10 + (i % 10) * 2.15 + hash(i, 1) * 0.5, z = -10.5 + Math.floor(i / 10) * 2.0 + hash(i, 2) * 0.4;
    if (Math.abs(x) < 3.7 && z > -2.3 && z < 4.2) continue;
    if (Math.abs(x + 4.6) < 0.9 || Math.abs(z - 3.1) < 1.0) continue;
    if (x > 0.4 && z > -7.5) continue; // rechts vorn: Wald statt Häuser
    const sattel = hash(i, 4) < 0.5;
    const h = modellHaus({ breite: 1.3 + hash(i, 5) * 0.7, hoehe: sattel ? 0.9 + hash(i, 6) * 0.7 : 1.3 + hash(i, 6) * 1.7, tiefe: 1.2 + hash(i, 7) * 0.6, dach: sattel ? "sattel" : "flach", material: hash(i, 8) < 0.18 ? "holz" : "karton", seed: i + 30 });
    h.position.set(x, 0, z); h.rotation.y = hash(i, 9) < 0.5 ? 0 : Math.PI / 2;
    szene.add(h);
  }
  const ahorn = ["#B8402F", "#D2673A", "#A8362B", "#C95A33"];
  for (let i = 0; i < 70; i++) {
    const b = modellBaum({ groesse: 0.7 + hash(i, 21) * 0.5, seed: 100 + i, farbe: i % 3 === 0 ? "#3F5A48" : ahorn[i % 4] });
    b.position.set(3.2 + (i % 10) * 0.95 + hash(i, 22) * 0.5, 0, -7.2 + Math.floor(i / 10) * 1.55 + hash(i, 23) * 0.5);
    if (Math.abs(b.position.x - XT) < 1.5 && b.position.z > -1 && b.position.z < 2.8) continue;
    szene.add(b);
  }
  for (let i = 0; i < 10; i++) { const b = modellBaum({ groesse: 0.55 + hash(i, 13) * 0.3, seed: 60 + i, farbe: ahorn[i % 4] }); b.position.set(2.8 + hash(i, 14) * 0.5 + (i % 2) * 2.2, 0, -1.9 + i * 0.4); if (b.position.x < 3.0 && b.position.z > -0.9 && b.position.z < 1.0) continue; szene.add(b); }
  for (let i = 0; i < 8; i++) { const b = modellBaum({ groesse: 0.5 + hash(i, 15) * 0.3, seed: 80 + i }); b.position.set(-3.2 - hash(i, 16) * 0.6 - (i % 2) * 0.5, 0, -1.4 + i * 0.45); szene.add(b); }

  // Die beiden Kinderzimmer-Schnitthäuser und der Acryl-Marker „Kinderzimmer“
  const hausL = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 6, licht: 0.9 });
  const hausT = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 6, licht: 0.9 });
  hausL.position.set(XL, 0, 0); hausT.position.set(XT, 0, 0); szene.add(hausL, hausT);
  const markL = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: DE }); markL.position.set(XL, 0.03, 0); szene.add(markL);
  const markT = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: CA }); markT.position.set(XT, 0.03, 0); szene.add(markT);
  const vorL = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: DE, deckkraft: 0.28 }); vorL.position.set(XL, 0, 1.15); szene.add(vorL);
  const vorT = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: CA, deckkraft: 0.28 }); vorT.position.set(XT, 0, 1.15); szene.add(vorT);
  // Das Kind vor jedem Haus wächst mit den Jahren (Skalierung)
  const kindL = modellLaeufer({ groesse: 1.0, farbe: DE, jacke: 0.7 }); szene.add(kindL);
  const kindT = modellLaeufer({ groesse: 1.0, farbe: CA, jacke: 0.7 }); szene.add(kindT);

  // Säulen und Vorsprung-Leiste (liegt vor den Säulen, wächst zur führenden Seite)
  const saeuleL = geldSaeule({ breite: 0.3, farbe: DE, deckkraft: 0.26 }); saeuleL.position.set(SL, 0, 0.35); szene.add(saeuleL);
  const saeuleT = geldSaeule({ breite: 0.3, farbe: CA, deckkraft: 0.26 }); saeuleT.position.set(ST, 0, 0.35); szene.add(saeuleT);
  const leisteD = geldSaeule({ breite: 0.12, farbe: DE, deckkraft: 0.4, kanten: 3.6 }); leisteD.rotation.z = Math.PI / 2; leisteD.position.set(0, 0.07, 1.0); szene.add(leisteD);
  const leisteK = geldSaeule({ breite: 0.12, farbe: CA, deckkraft: 0.4, kanten: 3.6 }); leisteK.rotation.z = -Math.PI / 2; leisteK.position.set(0, 0.07, 1.0); szene.add(leisteK);
  // Einkommens-Schieberegler (vorn): Spur, Grenzmarke bei 38.237 CAD, Knopf in Kanadas Rot
  const spur = new THREE.Mesh(new THREE.BoxGeometry(SLX1 - SLX0 + 0.2, 0.05, 0.14), new THREE.MeshStandardMaterial({ color: "#2B2622", roughness: 0.7 })); spur.position.set(0, 0.025, 2.35); spur.castShadow = true; szene.add(spur);
  const spurLicht = new THREE.Mesh(new THREE.BoxGeometry(SLX1 - SLX0, 0.012, 0.04), leuchtMat(AKZENT, 1.2, { neu: true, transparent: true })); spurLicht.position.set(0, 0.058, 2.35); szene.add(spurLicht);
  const grenzMat = leuchtMat(AKZENT, 1, { neu: true, transparent: true });
  const grenzMarke = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, 0.03), grenzMat); grenzMarke.position.set(sx(GRENZE), 0.2, 2.35); szene.add(grenzMarke);
  const knopf = acrylMarker({ breite: 0.2, tiefe: 0.26, hoehe: 0.2, farbe: CA, deckkraft: 0.55, kanten: 4 }); szene.add(knopf);
  const kegel = (farbe) => { const k = lichtKegel({ hoehe: 5.0, radiusOben: 0.1, radiusUnten: 1.1, farbe, staerke: 0.55, streifen: 0.25 }); k.material = k.material.clone(); k.userData.dynamisch = true; szene.add(k); return k; };
  const kegelL = kegel(DE), kegelT = kegel(CA);
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
  const WEIT = { pos: [0, 6.6, 11.6], ziel: [0, 1.2, 0.2], fov: 42 };
  const shot = (t, pos, ziel, fov = 40) => ({ t, pos, ziel, fov });
  const SH = [
    shot(0, WEIT.pos, WEIT.ziel, WEIT.fov),
    shot(A.deutsch + 0.6, [0.3, 6.0, 11.2], [0, 1.15, 0.3], 41),
    shot(A.kanadaH + 0.4, [-0.3, 5.7, 11.0], [0, 1.15, 0.3], 41),
    shot(A.wo, [0.0, 6.6, 12.6], [0, 1.2, 0.3], 42),
    shot(A.ein, [-0.6, 4.4, 9.6], [-0.6, 0.8, 1.0], 38),
    shot(A.einkommen, [0.6, 4.4, 9.6], [0.6, 0.8, 1.0], 38),
    shot(A.n50 - 0.1, [0.0, 4.0, 9.6], [0, 0.7, 0.5], 38),
    shot(A.gezaehlt, [0.0, 7.0, 13.4], [0, 1.2, 0.3], 41),
    shot(A.klar - 0.1, [1.6, 5.4, 10.4], [1.3, 1.0, 0.5], 38),
    shot(A.oder + 0.3, [-1.2, 5.4, 10.4], [-1.2, 1.0, 0.5], 38),
    shot(A.jahr1 - 0.1, [-2.3, 3.5, 8.8], [-1.0, 0.7, 0.6], 38),
    shot(A.n259 - 0.1, [-0.8, 4.6, 10.4], [-0.5, 0.9, 0.5], 39),
    shot(A.kanadaR - 0.1, [1.6, 4.6, 10.4], [0.9, 1.0, 0.5], 39),
    shot(A.doch + 0.1, [0.0, 3.6, 8.6], [0, 0.5, 2.0], 38),
    shot(A.n7 + 0.3, [0.4, 4.4, 9.8], [0.4, 0.9, 1.2], 38),
    shot(A.hier - 0.1, [1.8, 4.6, 10.4], [1.0, 1.1, 0.5], 38),
    shot(A.trotzdem, [0.0, 6.2, 12.4], [0, 1.1, 0.3], 41),
    shot(A.nach, [0.0, 7.0, 13.6], [0, 1.4, 0.3], 42),
    shot(A.n1741 - 0.2, [0.4, 4.8, 10.0], [0.1, 1.6, 0.4], 37),
    shot(A.ab3, [1.8, 5.0, 10.6], [1.2, 1.1, 0.5], 38),
    shot(A.nur + 0.2, [2.2, 4.4, 9.6], [1.1, 1.0, 0.6], 36),
    shot(A.deW, [-1.8, 5.0, 10.6], [-1.0, 1.2, 0.5], 38),
    shot(A.n521 - 0.3, [0.0, 4.6, 10.0], [0, 1.0, 1.0], 37),
    shot(A.j7 - 0.2, [0.0, 6.4, 12.8], [0, 1.5, 0.3], 41),
    shot(A.vorsprung, [-0.8, 5.0, 10.6], [-0.2, 1.6, 0.4], 38),
    shot(A.mit, [0.0, 4.4, 9.4], [0, 1.9, 0.5], 36),
    shot(A.deK, [-0.6, 4.8, 9.6], [-0.3, 2.0, 0.5], 35),
    shot(A.endstand, [0.0, 5.6, 11.4], [0, 1.9, 0.3], 38),
    shot(A.n4511 - 0.4, [0.0, 4.2, 9.4], [0, 1.0, 1.0], 35),
    shot(A.warum - 0.1, [0.0, 7.0, 13.6], [0, 1.4, 0.3], 42),
    shot(A.kuerzt, [1.8, 5.0, 10.6], [1.0, 1.2, 0.8], 38),
    shot(A.und, [1.4, 4.6, 10.0], [1.2, 1.0, 0.6], 37),
    shot(A.aber, [0.0, 3.8, 8.8], [0, 0.6, 2.0], 38),
    shot(A.gewinnt - 0.3, [0.6, 4.6, 9.8], [0.4, 1.0, 1.4], 37),
    shot(A.den, [0.0, 7.2, 13.8], [0, 1.4, 0.3], 42),
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
  regie.zoom({ t: A.doch + 0.9, ziel: [0.2, 0.7, 2.1], staerke: 0.14, halt: 1.8, rueck: 0.9 });
  regie.zoom({ t: A.ueberholt - 0.5, ziel: [0.0, 2.0, 0.35], staerke: 0.16, halt: 1.8, rueck: 0.9 });
  regie.zoom({ t: A.n4511 - 0.5, ziel: [0.0, 2.2, 0.35], staerke: 0.12, halt: 1.8, rueck: 0.8 });

  // ---------- Zustand auf die Welt anwenden ----------
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
      // Kinder wachsen: 0,3 (Baby) bis 0,78 (18) der Modellgröße
      const gr = lerp(0.5, 0.92, clamp(s.j / 18));
      kindL.scale.setScalar(gr); kindT.scale.setScalar(gr);
      kindL.position.set(XL - 0.35, 0, 1.2); kindL.rotation.y = 0.35 + s.blick;
      kindT.position.set(XT + 0.35, 0, 1.2); kindT.rotation.y = -0.35 - s.blick;
      kindL.pose({ geh: t * 1.2, schritt: 0, sitz: 0 }); kindT.pose({ geh: t * 1.2, schritt: 0, sitz: 0 });
      kindL.leuchte(0.8 + 1.4 * s.pulsD + 0.5 * s.spotD); kindT.leuchte(0.8 + 1.4 * s.pulsK + 0.5 * s.spotK);
      markL.setze(s.markL); markT.setze(s.markT);
      vorL.setze(0.35 + 0.65 * s.pulsD); vorT.setze(0.35 + 0.65 * s.pulsK);
      // Säulen und Vorsprung-Leiste
      saeuleL.setze(s.saeulen > 0.01 ? s.saeulen : 0); saeuleL.hoehe(Math.max(0.01, SK(s.a))); saeuleL.puls(0.3 + 0.9 * s.pulsD);
      saeuleT.setze(s.saeulen > 0.01 ? s.saeulen : 0); saeuleT.hoehe(Math.max(0.01, SK(s.b))); saeuleT.puls(0.3 + 0.9 * s.pulsK);
      const L = 0.36 * Math.pow(Math.abs(s.diff) / 1000, 0.7);
      const dVorn = s.diff > 0, kVorn = s.diff < 0;
      leisteD.setze(s.saeulen > 0.01 && dVorn ? s.saeulen : 0); leisteK.setze(s.saeulen > 0.01 && kVorn ? s.saeulen : 0);
      leisteD.hoehe(Math.max(0.01, L)); leisteK.hoehe(Math.max(0.01, L));
      leisteD.puls(0.3 + 0.7 * s.pulsD); leisteK.puls(0.3 + 0.7 * s.pulsK);
      // Schieberegler
      const sl = s.slider;
      [spur, spurLicht, grenzMarke].forEach((m) => { m.visible = sl > 0.01; });
      spurLicht.material.opacity = sl; grenzMat.color.set(AKZENT).multiplyScalar(0.5 + 3.0 * s.grenzeLeucht); grenzMat.opacity = sl;
      knopf.setze(sl); knopf.position.set(sx(s.cad), 0.07, 2.35);
      // Spots
      kegelL.visible = s.spotD > 0.01; kegelL.material.uniforms.staerke.value = 0.7 * s.spotD; kegelL.position.set(XL, 5.0, 1.0);
      kegelT.visible = s.spotK > 0.01; kegelT.material.uniforms.staerke.value = 0.7 * s.spotK; kegelT.position.set(XT, 5.0, 1.0);
      // Licht: Sonne wärmer und stärker bis zum Kipp-Moment, Bloom am Höhepunkt
      sonne.target.position.set(0, 0, 0); sonne.position.set(rig.richtung.x * 40, rig.richtung.y * 40, rig.richtung.z * 40); sonne.target.updateMatrixWorld();
      sonne.color.copy(sonneBasis).lerp(sonneHeiss, s.warm);
      sonne.intensity = 3.6 + 1.0 * s.warm + 0.6 * s.hoehe;
      hemi.intensity = 0.42 - 0.06 * s.hoehe;
      post.bloomStaerke = 0.5 + 0.22 * s.hoehe;
      post.vignette = 0.42 + 0.08 * s.hoehe;
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, regie.zustand(t).ziel, { tiefe: 0.3, nah: 0.45, fern: 0.6 }));
    },
  };

  // ---------- HUD ----------
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 99999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 99999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: s.a, b: s.b }; },
    uhr: { ein: 0, zeit: (t) => SW(t).j, format: (v) => `${Math.floor(v + 1e-6)}`, label: "ALTER" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 && w.b < 1 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "hell", y = 490) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.1) => x - d;
  // Statuszeile (y 372)
  chip("KINDERGELD · BIS ZUM 18. GEBURTSTAG", 0.05, A.ein - 0.1, "akzent", "hell", 372);
  chip("ALTER 0 · BABY", A.ein - 0.05, A.jahr1 - 0.1, "akzent", "hell", 372);
  chip("ALTER 1 · KLEINKIND", A.jahr1 - 0.05, A.n6 + 2.0, "akzent", "voll", 372);
  chip("ALTER 6 · SCHULKIND", A.n6 + 2.1, A.j7 - 0.2, "akzent", "voll", 372);
  chip("ALTER 7 BIS 9", A.j7 - 0.15, A.ueberholt + 0.4, "akzent", "voll", 372);
  // Regeln
  chip("EIN KIND", v(A.kind, 0.05), v(A.klar), "akzent", "voll", 490);
  chip("50.000 € FAMILIENEINKOMMEN", v(A.einkommen, 0.05), v(A.klar), "akzent", "voll", 590);
  chip("GEZÄHLT BIS 18", v(A.gezaehlt, 0.05), v(A.klar), "akzent", "hell", 710);
  chip("ALLES IN EURO", v(A.alles, 0.05), v(A.klar), "akzent", "hell", 830);
  // Denkfalle
  chip("KANADA ZAHLT MEHR?", v(A.kanadaF, 0.05), v(A.jahr1, 0.1), "b", "voll");
  // Rennen
  chip("DEUTSCHLAND · 259 € IM MONAT", v(A.deR, 0.05), v(A.kanadaR, 0.1), "a", "voll");
  chip("EGAL, WAS DIE ELTERN VERDIENEN", v(A.egal, 0.05), v(A.kanadaR, 0.1), "akzent", "hell", 590);
  chip("KANADA · BIS ZU 432,82 € IM MONAT", v(A.kanadaR, 0.05), v(A.doch, 0.1), "b", "voll");
  // Wendung 1
  chip("EINKOMMEN: 78.525 CAD", v(A.doch, 0.0), v(A.ab1, 0.0), "akzent", "voll");
  chip("GRENZE: 38.237 CAD", v(A.grenze, 0.15), v(A.hier, 0.1), "akzent", "voll");
  chip("JEDER DOLLAR DARÜBER: −7 CENT", v(A.dollar, 0.1), v(A.hier, 0.1), "b", "hell", 590);
  chip("KANADA · NUR NOCH 283,18 €", v(A.hier, 0.0), v(A.nach, 0.3), "b", "voll");
  chip("KANADA LIEGT TROTZDEM VORN", v(A.trotzdem, 0.1), v(A.nach, 0.3), "b", "hell", 590);
  // Wendung 2
  chip("NACH 6 JAHREN", v(A.nach, 0.0), v(A.ab3, 0.25), "akzent", "voll");
  chip("KANADA +1.741 €", v(A.n1741, 0.1), v(A.ab3, 0.25), "b", "voll", 590);
  // Wendung 3
  chip("AB 6 JAHREN: WENIGER", v(A.ab3, 0.0), v(A.nur, 0.1), "b", "voll");
  chip("KANADA · 215,58 € IM MONAT", v(A.nur, 0.0), v(A.j7, 0.2), "b", "voll");
  chip("DEUTSCHLAND HOLT 521 € PRO JAHR AUF", v(A.holt, 0.1), v(A.j7, 0.2), "a", "voll", 590);
  // Kipp
  chip("DER VORSPRUNG SCHMILZT", v(A.vorsprung, 0.05), v(A.mit, 0.1), "akzent", "voll");
  chip("9 JAHRE · 5 MONATE", v(A.mit, 0.0), v(A.endstand, 0.1), "a", "voll");
  chip("DEUTSCHLAND ÜBERHOLT", v(A.deK, 0.0), v(A.endstand, 0.1), "a", "voll", 590);
  // Ergebnis und Warum
  M.bilanz({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "BIS 18 · MODELLFAMILIE", ein: A.endstand + 0.15, aus: A.warum - 0.2,
    zeilen: [{ label: "DEUTSCHLAND", wert: Math.round(Z.deSumme), einheit: "€", team: "a", ein: A.deE - 0.05 }, { label: "KANADA", wert: Math.round(Z.caSumme), einheit: "€", team: "b", ein: A.vorne }],
    differenz: { label: "VORSPRUNG", wert: Math.round(Z.vorsprungDe), einheit: "€", ein: A.n4511 - 0.1 },
  });
  M.balken({
    x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: A.warum + 0.3, aus: A.aber - 0.4, max: 3200,
    faktoren: [
      { label: "KÜRZUNG DURCH EINKOMMEN · € JE JAHR", ein: A.kanadaW - 0.2, a: { wert: 0, text: "0" }, b: { wert: 1796, text: "1.796" }, tag: "KANADA KÜRZT", tagEin: A.einkW },
      { label: "BETRAG AB 6 JAHREN · € JE JAHR", ein: A.und - 0.2, a: { wert: 3108, text: "3.108" }, b: { wert: 2587, text: "2.587" }, tag: "SCHULKINDER: WENIGER", tagEin: A.schulk },
    ],
  });
  // Pointe
  chip("UNTER 46.400 €: KANADA VORN", v(A.unter, 0.1), v(A.den, 0.3), "b", "voll");
  M.zaehler({ wert: (t) => Math.round(SW(t).cad / KURS), einheit: " €", nk: 0, max: 99999, team: "akzent", art: "voll", label: "EINKOMMEN", punkt: () => proj([sx(CAD_40K), 0.55, 2.35]), ein: v(A.n464, 0.3), aus: v(A.den, 0.3) });
  M.zaehler({ wert: (t) => SW(t).cad, einheit: " CAD", nk: 0, max: 999999, team: "akzent", art: "voll", label: "EINKOMMEN", punkt: () => proj([sx(CAD_50K), 0.55, 2.35]), ein: v(A.doch, 0.0), aus: v(A.nach, 0.3) });
  // Monatsbeträge über den Häusern
  M.zaehler({ wert: () => P.kindergeldMonat, einheit: " €", nk: 0, max: 9999, team: "a", label: "MONAT", art: "voll", punkt: () => proj([XL, 1.25, 0.6]), ein: v(A.n259, 0.2), aus: v(A.nach, 0.3) });
  M.zaehler({ wert: (t) => caMonat(SW(t).j, SW(t).cad), einheit: " €", nk: 2, max: 999, team: "b", label: "MONAT", art: "voll", punkt: () => proj([XT, 1.25, 0.6]), ein: v(A.n43282, 0.2), aus: v(A.nach, 0.3) });
  M.zaehler({ wert: () => P.kindergeldMonat, einheit: " €", nk: 0, max: 9999, team: "a", label: "MONAT", art: "voll", punkt: () => proj([XL, 1.25, 0.6]), ein: v(A.ab3, 0.0), aus: v(A.endstand, 0.1) });
  M.zaehler({ wert: (t) => caMonat(SW(t).j, SW(t).cad), einheit: " €", nk: 2, max: 999, team: "b", label: "MONAT", art: "voll", punkt: () => proj([XT, 1.25, 0.6]), ein: v(A.ab3, 0.0), aus: v(A.endstand, 0.1) });
  M.titel({ woerter: [{ text: "DEUTSCHLAND", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "KANADA", ein: -0.3, team: "b" }, { umbruch: true }, { text: "KINDERGELD BIS 18", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "WO GIBT ES MEHR?", ein: -0.3, art: "klein" }], y: 470, groesse: 100, aus: A.ein - 0.15 });
  M.pointe({ woerter: [{ text: "DEN SIEGER", ein: A.den, farbe: "akzent" }, { umbruch: true }, { text: "BESTIMMT", ein: T("schlusskarte:bestimmt"), farbe: "akzent" }, { umbruch: true }, { text: "DAS EINKOMMEN.", ein: A.das, farbe: "akzent" }], ein: A.den, y: 470, groesse: 88 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "pop", "Kamera gleitet, beide Kinderzimmer im Abendlicht"); ev(A.deutsch + 0.1, "pop", "Deutsches Zimmer leuchtet blau auf"); ev(A.kanadaH, "pop", "Kanadisches Zimmer leuchtet rot auf"); ev(A.wo, "whoosh", "Kamera zurück, beide Zimmer");
  ev(A.ein, "whoosh", "Kamera nah an die Kinder, Titel blendet aus"); ev(A.einkommen, "klick", "Kamera wechselt zu Kanada, Chip Einkommen"); ev(A.n50, "ding", "Säulen wachsen aus dem Boden"); ev(A.gezaehlt, "klick", "Kamera hebt sich, Chip bis 18"); ev(A.alles, "klick", "Chip alles in Euro");
  ev(A.klar, "whoosh", "Spot auf Kanada"); ev(A.klein, "pop", "Kanadisches Kind leuchtet"); ev(A.oder, "klick", "Spot wechselt auf Deutschland");
  ev(A.jahr1, "whoosh", "Kamera tief, Jahresuhr läuft"); ev(A.n259, "ding", "Deutschland 259 € im Monat, Säule wächst"); ev(A.egal, "klick", "Chip egal, was die Eltern verdienen"); ev(A.kanadaR, "whoosh", "Kamera zu Kanada, Säule wächst höher"); ev(A.n43282, "ding", "Kanada bis zu 432,82 €");
  ev(A.doch, "whoosh", "Einkommens-Schieberegler erscheint"); ev(A.grenze, "ding", "Grenze 38.237 CAD leuchtet auf"); ev(A.dollar, "klick", "Knopf fährt über die Grenze, Kanadas Säule schrumpft"); ev(A.n283, "ding", "Kanada nur noch 283,18 €"); ev(A.trotzdem, "klick", "Kamera zurück, Kanada bleibt vorn");
  ev(A.nach, "whoosh", "Jahresuhr springt auf 6, Kinder wachsen"); ev(A.n1741, "ding", "Kanada führt mit 1.741 €");
  ev(A.ab3, "whoosh", "Kanadas Betrag sinkt, Kamera zu Kanada"); ev(A.n215, "ding", "Kanada 215,58 € im Monat"); ev(A.holt, "klick", "Deutschland holt auf, Leiste schrumpft"); ev(A.n521, "ding", "521 € pro Jahr");
  ev(A.j7, "whoosh", "Jahre 7 und 8 laufen, Vorsprung schmilzt"); ev(A.mit, "ding", "9 Jahre 5 Monate, Gleichstand"); ev(A.deK, "ding", "Deutschland überholt, Leiste wechselt auf Blau");
  ev(A.endstand, "whoosh", "Jahresuhr läuft auf 18, Zimmer ausgewachsen"); ev(A.n4511 - 0.1, "ding", "Endstand-Karte, Differenz 4.511 € glüht");
  ev(A.warum, "whoosh", "Erklärgrafik Warum"); ev(A.kuerzt, "ding", "Balken Kürzung durch Einkommen"); ev(A.schulk, "ding", "Balken Betrag ab 6 Jahren");
  ev(A.aber, "whoosh", "Schieberegler fährt nach links, Kamera zum Regler"); ev(A.n464, "ding", "Einkommen 40.000 €, Säule Kanada steigt"); ev(A.gewinnt, "ding", "Kanada überholt zurück, Leiste wechselt auf Rot");
  ev(A.den, "akzent", "Welt dunkelt ab, Schlusskarte"); ev(A.einkS, "akzent", "Wort Einkommen leuchtet");
  const sortiert = []; M.extra.forEach((e) => sortiert.push(e.t)); sortiert.sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Licht wandert, Kinder atmen"); }
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
