// „Mieten oder kaufen: Wer hat nach 30 Jahren mehr Vermögen?“ · Stil 19 Architekturmodell (Abendlicht), Simulierbar 06.11.2026 abend.
// Zwei identische Kartonhäuser (Schnittmodelle) auf einer Sperrholzplatte: links Lisa (kauft, orange), rechts Tom (mietet, blau).
// In jedem steht dieselbe Wohnung als Acryl-Marker. Zwischen den Häusern wachsen zwei Acryl-Säulen (Lisas Vermögen = Wohnungswert minus
// Restschuld, Toms Depot); vor Lisas Haus schrumpft der Kreditturm. Alle Werte kommen aus pipeline/sim/mieten_kaufen.mjs (Tests dort);
// die Jahresuhr läuft an den gesprochenen Zwischenständen entlang. Deterministisch: window.renderAt(t), Schleife über M.wert.
import * as THREE from "three";
import { SimBuehne, GRADING, rigAbendsonne, dunst, lichtKegel, lichtBahn, staub, buendeln, fokus, aktualisiere, leuchtMat } from "../../engine/sim_atmosphaere.js";
import { modellPlatte, modellHaus, modellBaum, modellFigur, abendWand, acrylMarker, schnittHaus, schild, geldSaeule, modellLaeufer } from "../../engine/stil_architektur.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, huelle, FEDER } from "../../engine/bewegung.js";
import { rechne } from "../../sim/mieten_kaufen.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Licht, Acryl, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb.
const LISA = "#FF8A3D";
const TOM = "#3D8BFF";
const AKZENT = "#ECE6DA";

// ---------- Rechnung (getestet) ----------
const B = rechne(), O = rechne({ tomLegtAn: false });
const MB = B.monat, MO = O.monat;
const am = (arr, key, j) => { const x = clamp(j * 12, 0, 360), i = Math.min(359, Math.floor(x)); return lerp(arr[i][key], arr[i + 1][key], x - i); };
const EK = 50000;
const NEBEN = EK - MB[0].lisa; // 26.869,10 €
const SC = 7.5e-6; // Säulenhöhe je Euro

// ---------- Weltmaße ----------
const XL = -1.6, XT = 1.6; // Häuser
const SL = -0.42, ST = 0.42; // Säulen zwischen den Häusern
const HAUS = { breite: 1.7, tiefe: 1.5, etagen: 4, eh: 0.62 };

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
      a: { name: "LISA", farbe: LISA, woerter: ["Lisa*", "Lisas", "kauft*", "Kredit*", "Rate*", "Wohnung*"] },
      b: { name: "TOM", farbe: TOM, woerter: ["Tom*", "Toms", "mietet*", "Miete*", "Depot*", "Steuer*"] },
    },
    akzent: AKZENT, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    kauft: T("hook:kauft"), tomH: T("hook:Tom"), wer: T("hook:Wer"), n30h: T("hook:30"),
    leipzig: T("regeln:Leipzig"), n80: T("regeln:80"), preis: T("regeln:242.720"), beide: T("regeln:beide"), fuenfzig: T("regeln:50.000"),
    lisaR: T("regeln:Lisa"), n1226: T("regeln:1.226"), tomR: T("regeln:Tom"), n718: T("regeln:718"), rest: T("regeln:Rest"), legt: T("regeln:legt"),
    klar: T("falle:Klar"), raus: T("falle:rausgeworfenes"), oder: T("falle:Oder"),
    tag: T("rennen:Tag"), n26: T("rennen:26.869"), neben: T("rennen:Nebenkosten"), weg: T("rennen:weg"),
    folg: T("folgen:Folg"), verpasst: T("folgen:verpasst"),
    aber: T("wendung1:Aber"), steigt: T("wendung1:steigt"), lisas1: T("wendung1:Lisas"), gleich: T("wendung1:gleich"), n20: T("wendung1:20"), n1000: T("wendung1:1.000"),
    jahr: T("wendung2:Jahr"), n30: T("wendung2:30"), abbez: T("wendung2:abbezahlt"), n439: T("wendung2:439.654"), depot: T("wendung2:Depot"), n512: T("wendung2:512.969"),
    doch: T("wendung2:Doch"), steuer: T("wendung2:Steuer"),
    endstand: T("ergebnis:Endstand"), tomE: T("ergebnis:Tom"), n448: T("ergebnis:448.266"), lisaE: T("ergebnis:Lisa"), n439e: T("ergebnis:439.654"), gewinnt: T("ergebnis:gewinnt"), n8612: T("ergebnis:8.612"),
    warum: T("warum:Warum"), miete2: T("warum:Miete"), lisas2: T("warum:Lisas"), nicht2: T("warum:nicht"), toms2: T("warum:Toms"), n64: T("warum:64.703"),
    und: T("ueberraschung:Und"), legtU: T("ueberraschung:Legt"), nichtU: T("ueberraschung:nicht"), n185: T("ueberraschung:185.431"), dann: T("ueberraschung:Dann"), n254: T("ueberraschung:254.222"),
    merkMiete: T("merksatz:Miete"), geld: T("merksatz:Geld"), aberM: T("merksatz:Aber"), kaufen: T("merksatz:Kaufen"), sparen: T("merksatz:Sparen"),
    schluss: T("schluss:Was"), schreib: T("schluss:Schreib"),
  };
  const T_SCHLEIFE = A.schluss - 0.3;

  // ---------- Zeitachse des Modells: Jahre (Zeitraffer an den gesprochenen Zwischenständen) ----------
  const jahrRoh = pchip([
    [0, 0], [A.aber, 0], [A.n20 + 0.1, 20], [A.jahr + 0.0, 20], [A.n30 + 0.55, 30], [A.und - 0.45, 30], [A.und + 0.45, 0], [A.und + 1.2, 0],
    [A.n185 - 0.5, 30], [DAUER, 30],
  ]);
  const STB = B.steuerT, STO = O.steuerT;

  // Rohzustand der Welt zur Zeit t (nur Zahlen; die Schleife lässt ihn zum Zustand bei t = 0 zurückgleiten)
  const S = (t) => {
    const j = jahrRoh(t);
    const w = glatt(t, A.und - 0.45, A.und + 0.45); // Runde 2 (Tom legt nicht an)
    const tax1 = glatt(t, A.steuer - 0.15, A.steuer + 0.9), tax2 = glatt(t, A.n185 - 0.45, A.n185 + 0.5);
    const start50 = EK * glatt(t, A.fuenfzig - 0.05, A.fuenfzig + 0.6);
    const lisaSerie = am(MB, "lisa", j);
    const a = lerp(start50, lisaSerie, glatt(t, A.weg - 0.05, A.weg + 0.5));
    const jf = clamp(j / 30);
    const tomB = am(MB, "tom", j) - tax1 * STB * jf;
    const tomO = am(MO, "tom", j) - tax2 * STO * jf;
    const b = lerp(tomB, tomO, w) * (start50 / EK);
    const rest = am(MB, "rest", j);
    // Nebenkosten-Block (oberes Stück von Lisas Säule), Steuer-Block (abgetrennt von Toms Säule)
    const nebenS = huelle(t, A.n26 - 0.1, Infinity, { feder: FEDER.weich }) * (1 - glatt(t, A.weg + 0.05, A.weg + 0.9));
    const nebenHoch = glatt(t, A.weg + 0.05, A.weg + 1.0);
    const steuerS1 = glatt(t, A.steuer - 0.2, A.steuer + 0.1) * (1 - glatt(t, A.n448 - 0.3, A.n448 + 0.6)) * (1 - w);
    const steuerSchub = glatt(t, A.steuer + 0.3, A.n448 + 0.5);
    const steuerS2 = glatt(t, A.n185 - 0.5, A.n185 - 0.2) * (1 - glatt(t, A.n185 + 0.5, A.n185 + 1.3));
    const steuerS3 = glatt(t, A.n64 - 0.2, A.n64 + 0.3) * (1 - glatt(t, A.und - 0.9, A.und - 0.45));
    const miete = am(MB, "miete", j);
    return {
      j, a, b, rest, w, tax1, tax2,
      saeulen: huelle(t, A.fuenfzig - 0.1, Infinity, { feder: FEDER.weich }),
      kredit: huelle(t, A.lisaR - 0.05, Infinity, { feder: FEDER.weich }),
      markL: 0.5 + 0.5 * Math.max(huelle(t, T("regeln:Quadratmeter"), T("regeln:Quadratmeter") + 1.0, { ausDauer: 0.6 }), huckel(t, A.kauft - 0.15, A.kauft + 0.25, A.wer - 0.1, A.wer + 0.5), huelle(t, A.n30h - 0.1, A.n30h + 1.0, { ausDauer: 0.7 })), markT: 0.5 + 0.5 * Math.max(huelle(t, T("regeln:Quadratmeter"), T("regeln:Quadratmeter") + 1.0, { ausDauer: 0.6 }), huckel(t, A.tomH - 0.05, A.tomH + 0.3, A.wer - 0.1, A.wer + 0.5), huelle(t, A.n30h - 0.1, A.n30h + 1.0, { ausDauer: 0.7 })),
      nebenS, nebenHoch, steuerS1, steuerS2, steuerS3, steuerSchub,
      leipzig: huelle(t, A.leipzig - 0.1, A.beide + 0.1, { feder: FEDER.weich, ausDauer: 0.4 }),
      miete,
      // Lichtstimmung: Spannung steigt bis zum Ergebnis, danach ruhiger
      warm: glatt(t, A.klar, A.aber) * 0.3 + glatt(t, A.jahr, A.endstand) * 0.7, hoehe: glatt(t, A.jahr, A.n8612 + 0.5) - 0.5 * glatt(t, A.warum, A.warum + 3),
      spotL: huckel(t, A.klar - 0.1, A.klar + 0.5, A.oder - 0.15, A.oder + 0.3), spotT: huckel(t, A.oder - 0.05, A.oder + 0.4, A.neben - 0.8, A.neben - 0.3),
      pulsL: 0.6 * huelle(t, A.beide, A.beide + 1.0, { ausDauer: 0.6 }) + 0.8 * huelle(t, A.merkMiete + 0.9, A.merkMiete + 2.0, { ausDauer: 0.7 }) + huelle(t, A.n439, A.n439 + 1.2, { ausDauer: 0.8 }) + 0.8 * huelle(t, A.dann + 0.9, A.dann + 2.2, { ausDauer: 0.8 }) + 0.5 * huelle(t, A.lisaE, A.lisaE + 1.2, { ausDauer: 0.6 }),
      pulsT: 0.6 * huelle(t, T("regeln:Miete"), T("regeln:Miete") + 1.0, { ausDauer: 0.6 }) + 0.6 * huelle(t, A.beide, A.beide + 1.0, { ausDauer: 0.6 }) + 0.7 * huelle(t, A.toms2, A.toms2 + 1.2, { ausDauer: 0.7 }) + huelle(t, A.n1000, A.n1000 + 1.0, { ausDauer: 0.6 }) + 0.8 * huelle(t, A.geld, A.geld + 1.3, { ausDauer: 0.7 }) + huelle(t, A.n512, A.n512 + 1.2, { ausDauer: 0.8 }) + 0.7 * huelle(t, A.tomE, A.tomE + 1.2, { ausDauer: 0.6 }) + huelle(t, A.gewinnt, A.gewinnt + 1.4, { ausDauer: 0.9 }),
      blitzWeg: huelle(t, A.weg, A.weg + 0.5, { ausDauer: 0.4 }),
      ueberholt: huelle(t, A.dann + 0.55, A.dann + 1.7, { ausDauer: 0.6 }), // Lisa zieht in Runde 2 vorbei
      tuten: 0, // Platzhalter, Tüten laufen aus t
      blick: Math.sin(t * 0.55) * 0.25, gruss: huelle(t, A.folg + 0.2, A.folg + 1.6, { ausDauer: 0.5 }),
    };
  };
  const SW = M.wert(S); // schleifenfest
  M.schleife({ ab: T_SCHLEIFE });

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = abendWand();
  dunst(szene, "#2E3240", 0.018);
  const SONNE = [-0.62, 0.2, -0.76];
  const rig = rigAbendsonne(szene, buehne.renderer, { richtung: SONNE, ziel: [0, 0, 0], bereich: 11, schatten: SCHATTEN, farbe: "#FFC283", staerke: 5.0, himmel: "#9FB0CC", boden: "#5A4636", himmelStaerke: 0.6, umgebungsStaerke: 0.5 });
  szene.add(modellPlatte({ breite: 22, tiefe: 24, strassen: [{ z: 3.1, richtung: "x", breite: 1.3 }, { x: -4.6, richtung: "z", breite: 1.1 }, { x: 4.6, richtung: "z", breite: 1.1 }], holz: true }));

  // Kulisse: Kartonhäuser (Leipziger Blockrand), hinten höher, vorn niedrig und frei
  for (let i = 0; i < 70; i++) {
    const x = -10 + (i % 10) * 2.15 + hash(i, 1) * 0.5, z = -10.5 + Math.floor(i / 10) * 2.0 + hash(i, 2) * 0.4;
    if (Math.abs(x) < 3.7 && z > -2.3 && z < 4.2) continue; // Platz für die beiden Häuser und den Vorplatz
    if (Math.abs(x + 4.6) < 0.9 || Math.abs(x - 4.6) < 0.9 || Math.abs(z - 3.1) < 1.0) continue;
    const sattel = hash(i, 4) < 0.35;
    const hoch = 1.0;
    const h = modellHaus({ breite: 1.3 + hash(i, 5) * 0.7, hoehe: (sattel ? 0.9 + hash(i, 6) * 0.7 : 1.3 + hash(i, 6) * 1.7) * hoch, tiefe: 1.2 + hash(i, 7) * 0.6, dach: sattel ? "sattel" : "flach", material: hash(i, 8) < 0.18 ? "holz" : "karton", seed: i + 30 });
    h.position.set(x, 0, z); h.rotation.y = hash(i, 9) < 0.5 ? 0 : Math.PI / 2;
    szene.add(h);
  }
  for (let i = 0; i < 20; i++) { const b = modellBaum({ groesse: 0.5 + hash(i, 11) * 0.3, seed: i }); b.position.set(-3.3 + i * 0.35 + (i % 2) * 0.1, 0, 2.1 + (i % 2) * 0.35); if (Math.abs(b.position.x) < 2.8) continue; szene.add(b); }
  for (let i = 0; i < 8; i++) { const b = modellBaum({ groesse: 0.55 + hash(i, 13) * 0.3, seed: 60 + i }); b.position.set((i % 2 ? 1 : -1) * (3.0 + hash(i, 14) * 0.5), 0, -1.6 + i * 0.45); szene.add(b); }
  for (let i = 0; i < 6; i++) { const f = modellFigur({ groesse: 0.4 }); f.position.set(-4.0 + i * 1.6, 0, 3.15 + (i % 2) * 0.3); f.rotation.y = hash(i, 15) * 6; szene.add(f); }

  // Die beiden identischen Häuser (Schnittmodell mit warmem Licht) und die gleiche Wohnung als Acryl-Marker auf Etage 2
  const hausL = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 6, licht: 0.9 });
  const hausT = schnittHaus({ breite: HAUS.breite, tiefe: HAUS.tiefe, etagen: HAUS.etagen, etagenHoehe: HAUS.eh, raeume: 2, seed: 6, licht: 0.9 });
  hausL.position.set(XL, 0, 0); hausT.position.set(XT, 0, 0); szene.add(hausL, hausT);
  const markL = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: LISA }); markL.position.set(XL, HAUS.eh + 0.03, 0); szene.add(markL);
  const markT = acrylMarker({ breite: HAUS.breite * 0.96, tiefe: HAUS.tiefe * 0.94, hoehe: HAUS.eh * 0.92, farbe: TOM }); markT.position.set(XT, HAUS.eh + 0.03, 0); szene.add(markT);
  // Sockelplatten in Teamfarbe vor den Häusern (Vorplatz)
  const vorL = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: LISA, deckkraft: 0.28 }); vorL.position.set(XL, 0, 1.15); szene.add(vorL);
  const vorT = acrylMarker({ breite: 1.9, tiefe: 1.0, hoehe: 0.05, farbe: TOM, deckkraft: 0.28 }); vorT.position.set(XT, 0, 1.15); szene.add(vorT);
  // Schild „LEIPZIG“
  const sch = schild({ text: "LEIPZIG", breite: 1.1, hoehe: 0.34, pfosten: 0.34 }); sch.position.set(0, 0, 2.15); sch.userData.dynamisch = true; szene.add(sch);
  // Figuren: Lisa (orange) und Tom (blau) vor ihrem Haus
  const figL = modellLaeufer({ groesse: 0.62, farbe: LISA, jacke: 0.65 }); figL.position.set(XL - 0.35, 0, 1.2); szene.add(figL);
  const figT = modellLaeufer({ groesse: 0.62, farbe: TOM, jacke: 0.65 }); figT.position.set(XT + 0.35, 0, 1.2); szene.add(figT);

  // Säulen: Lisas Vermögen, Toms Depot, Lisas Kredit, Nebenkosten-Block, Steuer-Blöcke
  const saeuleL = geldSaeule({ breite: 0.3, farbe: LISA, deckkraft: 0.26 }); saeuleL.position.set(SL, 0, 0.35); szene.add(saeuleL);
  const saeuleT = geldSaeule({ breite: 0.3, farbe: TOM, deckkraft: 0.26 }); saeuleT.position.set(ST, 0, 0.35); szene.add(saeuleT);
  const kredit = geldSaeule({ breite: 0.46, farbe: "#C9C2B4", deckkraft: 0.2, kanten: 2.2 }); kredit.position.set(XL - 1.18, 0, 0.9); szene.add(kredit);
  const nebenB = geldSaeule({ breite: 0.3, farbe: AKZENT, deckkraft: 0.55, kanten: 4.0 }); nebenB.position.set(SL, 0, 0.35); szene.add(nebenB);
  const steuerB = geldSaeule({ breite: 0.3, farbe: AKZENT, deckkraft: 0.55, kanten: 4.0 }); steuerB.position.set(ST, 0, 0.35); szene.add(steuerB);
  // Spot-Kegel für die Denkfalle (Lisa, dann Tom)
  const kegel = (farbe) => { const k = lichtKegel({ hoehe: 5.0, radiusOben: 0.1, radiusUnten: 1.1, farbe, staerke: 0.55, streifen: 0.25 }); k.material = k.material.clone(); k.userData.dynamisch = true; szene.add(k); return k; };
  const kegelL = kegel(LISA), kegelT = kegel(TOM);
  // Fliegende Mietscheine (rausgeworfenes Geld) aus Toms Haus, Einkaufstüten (Runde 2)
  const scheinMat = new THREE.MeshStandardMaterial({ color: "#8EBBFF", emissive: TOM, emissiveIntensity: 0.9, roughness: 0.5, side: THREE.DoubleSide, transparent: true });
  const scheine = [];
  for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), scheinMat.clone()); m.userData.dynamisch = true; m.visible = false; szene.add(m); scheine.push(m); }
  const tuetenMat = new THREE.MeshStandardMaterial({ color: "#C9A57A", roughness: 0.85 });
  const tueten = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group(), k = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.1), tuetenMat), s = new THREE.Mesh(new THREE.BoxGeometry(0.152, 0.03, 0.102), new THREE.MeshStandardMaterial({ color: TOM, emissive: TOM, emissiveIntensity: 0.6 }));
    k.castShadow = true; s.position.y = 0.06; g.add(k, s); g.userData.dynamisch = true; g.visible = false; szene.add(g); tueten.push(g);
  }
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
    shot(A.kauft - 0.2, [0.2, 7.0, 13.0], [-0.2, 1.25, 0.2], 41),
    shot(A.kauft + 0.5, [-1.8, 5.0, 10.6], [-1.4, 1.35, 0.2], 38),
    shot(A.tomH + 0.2, [1.8, 5.0, 10.6], [1.4, 1.35, 0.2], 38),
    shot(A.wer + 0.1, [0.0, 7.0, 13.6], [0, 1.3, 0.2], 41),
    shot(A.leipzig + 0.2, [0.4, 5.6, 11.4], [0, 0.8, 1.2], 40),
    shot(A.preis - 0.2, [0.0, 6.4, 12.2], [0, 1.5, 0.2], 41),
    shot(A.fuenfzig - 0.1, [0.0, 4.0, 9.6], [0, 0.7, 0.4], 38),
    shot(A.lisaR - 0.15, [-2.5, 4.4, 9.8], [-1.0, 1.0, 0.5], 38),
    shot(A.tomR - 0.15, [2.5, 4.4, 9.8], [1.0, 1.0, 0.5], 38),
    shot(A.rest - 0.1, [0.0, 6.0, 12.4], [0, 1.3, 0.3], 41),
    shot(A.klar - 0.1, [-1.0, 5.4, 10.6], [-1.2, 1.4, 0.3], 38),
    shot(A.oder + 0.4, [1.2, 5.4, 10.6], [1.2, 1.4, 0.3], 38),
    shot(A.tag - 0.2, [-2.3, 3.5, 8.8], [-1.0, 0.7, 0.6], 38),
    shot(A.weg + 0.8, [-1.6, 4.2, 10.0], [-0.8, 0.9, 0.5], 39),
    shot(A.folg + 0.1, [0.0, 7.2, 13.8], [0, 1.3, 0.2], 42),
    shot(A.aber + 0.2, [2.6, 4.8, 10.4], [1.2, 1.4, 0.5], 38),
    shot(A.gleich - 0.3, [-2.0, 5.0, 10.8], [-0.5, 1.5, 0.4], 39),
    shot(A.n20 - 0.4, [1.4, 5.4, 11.0], [0.8, 1.7, 0.4], 38),
    shot(A.jahr + 0.1, [0.0, 7.2, 14.0], [0, 1.6, 0.2], 43),
    shot(A.abbez - 0.1, [-2.2, 5.0, 11.0], [-0.9, 1.9, 0.4], 39),
    shot(A.depot - 0.1, [2.2, 5.4, 11.4], [0.9, 2.0, 0.4], 39),
    shot(A.doch + 0.3, [0.4, 5.0, 9.6], [0.4, 2.45, 0.3], 36),
    shot(A.endstand, [0.0, 5.6, 11.0], [0, 2.0, 0.3], 38),
    shot(A.gewinnt - 0.3, [0.2, 4.8, 9.4], [0.1, 2.0, 0.3], 35),
    shot(A.warum - 0.1, [0.0, 7.0, 13.6], [0, 1.5, 0.3], 42),
    shot(A.lisas2, [-2.3, 5.2, 11.0], [-1.0, 1.4, 0.4], 39),
    shot(A.toms2 - 0.1, [1.9, 5.0, 10.6], [0.7, 2.0, 0.3], 38),
    shot(A.und - 0.2, [0.0, 7.0, 13.6], [0, 1.4, 0.3], 42),
    shot(A.legtU + 0.1, [2.0, 4.6, 10.0], [1.0, 1.0, 0.5], 38),
    shot(A.n185 - 0.1, [0.0, 5.2, 10.8], [0, 1.6, 0.3], 38),
    shot(A.dann, [-0.4, 5.6, 11.6], [-0.2, 2.2, 0.3], 38),
    shot(A.n254 - 0.2, [0.0, 4.8, 9.8], [0, 2.0, 0.3], 36),
    shot(A.merkMiete, [0.0, 6.2, 12.6], [0, 1.4, 0.3], 41),
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
  regie.zoom({ t: A.aber + 1.2, ziel: [1.6, 1.3, 0.4], staerke: 0.14, halt: 1.6, rueck: 0.9 });
  regie.zoom({ t: A.doch - 0.1, ziel: [0.42, 2.3, 0.35], staerke: 0.16, halt: 2.0, rueck: 0.9 });
  regie.zoom({ t: A.gewinnt - 0.4, ziel: [0.0, 2.0, 0.35], staerke: 0.12, halt: 2.0, rueck: 0.8 });
  regie.schleife({ ab: T_SCHLEIFE, ende: DAUER - 1 / FPS });

  // ---------- Zustand auf die Welt anwenden ----------
  const sonne = rig.sonne, hemi = rig.hemi;
  const sonneBasis = new THREE.Color("#FFC283"), sonneHeiss = new THREE.Color("#FFA45C");
  const sonnenPunkt = new THREE.Vector3(...SONNE).normalize().multiplyScalar(60).toArray();
  const post = { ...GRADING.abend, belichtung: 1.02, splitStaerke: 0.24, saettigung: 1.0, kontrast: 1.1, vignette: 0.36, bloomSchwelle: 1.3, lift: [0.004, 0.004, 0.01], strahlen: 0.22, strahlenPunkt: sonnenPunkt, strahlenSchwelle: 1.4, strahlenLaenge: 0.75, strahlenAbfall: 0.97, strahlenFarbe: [1, 0.82, 0.6] };
  const tmp = new THREE.Vector3();
  const slab = (g, x, basis, hoehe, s) => { g.position.set(x, 0, 0.35); g.hoehe(Math.max(0.005, hoehe)); g.position.y = basis; g.setze(s); };
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      const s = SW(t);
      // Figuren: atmen, schauen zur Mitte, drehen sich bei ihrem Namen
      figL.position.set(XL - 0.35, 0, 1.2); figL.rotation.y = (0.35 + s.blick + 0.4 * huelle(t, A.kauft, A.kauft + 1.0, { ausDauer: 0.5 })) * (1 - s.gruss);
      figT.position.set(XT + 0.35, 0, 1.2); figT.rotation.y = (-0.35 - s.blick - 0.4 * huelle(t, A.tomH, A.tomH + 1.0, { ausDauer: 0.5 })) * (1 - s.gruss);
      figL.pose({ geh: t * 1.2, schritt: 0.0, sitz: 0 }); figT.pose({ geh: t * 1.2, schritt: 0.0, sitz: 0 });
      figL.leuchte(0.8 + 1.4 * s.pulsL + 0.5 * s.spotL + 0.8 * s.gruss); figT.leuchte(0.8 + 1.4 * s.pulsT + 0.5 * s.spotT + 0.8 * s.gruss);
      // Wohnungs-Marker
      markL.setze(s.markL); markT.setze(s.markT);
      vorL.setze(0.35 + 0.65 * s.pulsL); vorT.setze(0.35 + 0.65 * s.pulsT);
      // Schild
      sch.visible = s.leipzig > 0.01; sch.scale.setScalar(Math.max(0.01, s.leipzig));
      // Säulen
      const hL = Math.max(0.01, s.a * SC), hT = Math.max(0.01, s.b * SC);
      saeuleL.setze(s.saeulen > 0.01 ? s.saeulen : 0); saeuleL.hoehe(hL); saeuleL.puls(0.3 + 0.9 * s.pulsL + 0.5 * s.ueberholt);
      saeuleT.setze(s.saeulen > 0.01 ? s.saeulen : 0); saeuleT.hoehe(hT); saeuleT.puls(0.3 + 0.9 * s.pulsT);
      kredit.setze(s.kredit > 0.01 ? s.kredit * 0.9 : 0); kredit.hoehe(Math.max(0.01, s.rest * SC));
      // Nebenkosten-Block: oberes Stück von Lisas Säule (50.000 → 23.131), löst sich auf
      slab(nebenB, SL, MB[0].lisa * SC + 0.55 * s.nebenHoch, NEBEN * SC, s.nebenS);
      nebenB.puls(1.0 * s.blitzWeg + 0.3 + 0.8 * huelle(t, A.neben, A.neben + 0.9, { ausDauer: 0.5 }));
      // Steuer-Block: wird von Toms Säule abgetrennt und gleitet zur Seite (Runde 1 mit 64.703 €, Runde 2 mit 30.666 €)
      const stRoh = s.steuerS1 > 0.001 ? STB : STO, stS = Math.max(s.steuerS1, s.steuerS2, s.steuerS3);
      const stHoch = s.steuerS3 > 0.001 && s.steuerS1 < 0.001 && s.steuerS2 < 0.001 ? STB : stRoh;
      const basisSt = s.steuerS3 > 0.001 ? hT - 0.0 : hT;
      slab(steuerB, ST + 0.95 * (s.steuerS1 > 0.001 ? s.steuerSchub : s.steuerS2 > 0.001 ? 0.4 : 0) + 0.5 * (s.steuerS3 > 0.001 ? 1 : 0), basisSt, stHoch * SC, stS);
      steuerB.puls(0.9 * stS);
      // Scheine (Denkfalle): fliegen aus Toms Haus, solange „rausgeworfenes Geld“ gesagt wird
      scheine.forEach((m, i) => {
        const t0 = A.raus - 0.1 + i * 0.22, d = 1.5, k = (t - t0) / d;
        m.visible = k > 0 && k < 1;
        if (!m.visible) return;
        const e = ease.outCubic(k);
        m.position.set(XT + 0.1 + e * 1.6 + hash(i, 3) * 0.3, HAUS.eh * 1.6 + e * 1.4 + Math.sin(k * Math.PI) * 0.5, 0.9 + e * 1.4);
        m.rotation.set(k * 6 + i, k * 4, k * 3); m.material.opacity = 1 - ease.inCubic(k);
      });
      // Tüten (Runde 2): Toms Sparrate wandert in Einkaufstüten
      tueten.forEach((g, i) => {
        const t0 = A.legtU + 0.15 + i * 0.2, d = 1.1, k = (t - t0) / d;
        g.visible = k > 0 && k < 1;
        if (!g.visible) return;
        const e = ease.outCubic(k);
        g.position.set(XT + 0.2 + e * 1.5, 0.3 + Math.sin(k * Math.PI) * 0.9, 0.9 + e * 1.8);
        g.rotation.set(0, k * 3, Math.sin(k * 5) * 0.4); g.scale.setScalar(1 - 0.6 * ease.inCubic(k));
      });
      // Spots der Denkfalle
      kegelL.visible = s.spotL > 0.01; kegelL.material.uniforms.staerke.value = 0.7 * s.spotL; kegelL.position.set(XL, 5.0, 1.0);
      kegelT.visible = s.spotT > 0.01; kegelT.material.uniforms.staerke.value = 0.7 * s.spotT; kegelT.position.set(XT, 5.0, 1.0);
      // Licht: Sonne wird wärmer und stärker, Bloom am Höhepunkt, danach ruhiger
      sonne.target.position.set(0, 0, 0); sonne.position.set(rig.richtung.x * 40, rig.richtung.y * 40, rig.richtung.z * 40); sonne.target.updateMatrixWorld();
      sonne.color.copy(sonneBasis).lerp(sonneHeiss, s.warm);
      sonne.intensity = 4.9 + 1.0 * s.warm + 0.6 * s.hoehe + 0.5 * s.blitzWeg;
      hemi.intensity = 0.6 - 0.06 * s.hoehe;
      post.bloomStaerke = 0.4 + 0.2 * s.hoehe + 0.25 * s.blitzWeg;
      post.vignette = 0.36 + 0.08 * s.hoehe;
      post.belichtung = 1.02 + 0.04 * s.blitzWeg;
      regie.anwenden(t);
      Object.assign(post, fokus(kamera, regie.zustand(t).ziel, { tiefe: 0.3, nah: 0.45, fern: 0.6 }));
    },
  };

  // ---------- HUD ----------
  const proj = (p) => { kamera.updateMatrixWorld(); tmp.set(p[0], p[1], p[2]).project(kamera); return { x: (tmp.x * 0.5 + 0.5) * 1080, y: (1 - (tmp.y * 0.5 + 0.5)) * 1920 }; };
  M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 0, max: 999999 }, rechts: { team: "b", einheit: "€", nk: 0, max: 999999 }, vorn: "hoch",
    werte: (t) => { const s = SW(t); return { a: s.a, b: s.b }; },
    uhr: { ein: 0, zeit: (t) => SW(t).j, format: (v) => `${Math.floor(v + 1e-6)}`, label: "JAHR" },
  });
  const chip = (text, ein, aus, team, art = "hell") => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y: 372, anker: "mitte" });
  chip("DIESELBE WOHNUNG", A.kauft + 1.3, A.leipzig - 0.3, "akzent", "voll");
  chip("LEIPZIG · 80 m²", A.leipzig, A.preis - 0.25, "akzent", "hell");
  chip("KAUFPREIS 242.720 €", A.preis, A.beide + 0.05, "akzent", "voll");
  chip("JE 50.000 € START", A.fuenfzig, A.lisaR - 0.25, "akzent", "hell");
  chip("LISA · 1.226 € IM MONAT", A.lisaR, A.tomR - 0.3, "a", "voll");
  chip("TOM · 718 € MIETE", A.tomR, A.rest - 0.1, "b", "voll");
  chip("RAUSGEWORFENES GELD?", A.raus, A.tag - 0.15, "akzent", "hell");
  chip("NEBENKOSTEN −26.869 €", A.n26, A.folg - 0.1, "a", "voll");
  chip("MIETE +2 % IM JAHR", A.steigt, A.lisas1 - 0.1, "b", "hell");
  chip("WOHNUNG 439.654 €", A.n439, A.depot - 0.1, "a", "hell");
  chip("DEPOT 512.969 €", A.n512, A.doch - 0.1, "b", "hell");
  chip("STEUER AUF GEWINN", A.doch + 0.3, A.endstand - 0.1, "akzent", "voll");
  chip("STEUER −64.703 €", A.n64, A.und - 0.5, "b", "voll");
  chip("TOM LEGT NICHT AN", A.legtU, A.n185 - 0.1, "b", "voll");
  chip("LISA +254.222 €", A.n254, A.merkMiete - 0.3, "a", "voll");
  // Rate und Miete als schwebende Zähler über den Häusern
  M.zaehler({ wert: (t) => lerp(MB[0].miete, am(MB, "miete", 20), glatt(t, A.aber, A.n20 + 0.1)), einheit: " €", nk: 0, max: 9999, team: "b", label: "MIETE", art: "voll", punkt: () => proj([XT, 2.95, 0]), ein: A.aber + 0.1, aus: A.jahr - 0.1 });
  M.zaehler({ wert: () => B.rate, einheit: " €", nk: 0, max: 9999, team: "a", label: "RATE", art: "voll", punkt: () => proj([XL, 2.95, 0]), ein: A.lisas1, aus: A.jahr - 0.1 });
  M.zaehler({ wert: (t) => lerp(MB[0].miete, am(MB, "miete", 30), glatt(t, A.miete2, A.miete2 + 1.1)), einheit: " €", nk: 0, max: 9999, team: "b", label: "MIETE", art: "voll", punkt: () => proj([XT, 2.95, 0]), ein: A.miete2, aus: A.toms2 - 0.1 });
  M.zaehler({ wert: () => B.rate, einheit: " €", nk: 0, max: 9999, team: "a", label: "RATE", art: "voll", punkt: () => proj([XL, 2.95, 0]), ein: A.lisas2, aus: A.toms2 - 0.1 });
  M.bilanz({
    x: SICHER.mitte - 330, breite: 660, y: 400, titel: "NACH 30 JAHREN", ein: A.endstand + 0.15, aus: A.warum - 0.25,
    zeilen: [{ label: "TOM", wert: Math.round(B.tom), einheit: "€", team: "b", ein: A.n448 }, { label: "LISA", wert: Math.round(B.lisa), einheit: "€", team: "a", ein: A.n439e }],
    differenz: { label: "VORSPRUNG", wert: Math.round(B.vorsprung), einheit: "€", ein: A.n8612 }, sieger: { text: "TOM GEWINNT", team: "b", ein: A.n8612 + 0.9 },
  });
  M.pointe({ woerter: [{ text: "KAUFEN", ein: A.kaufen, farbe: "a" }, { text: "= SPAREN", ein: A.sparen, farbe: "akzent" }], ein: A.kaufen, aus: A.schreib - 0.3, y: 520, groesse: 120 });
  M.folgen({ ein: A.folg, dauer: 1.8 });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(A.kauft, "pop", "Lisas Wohnung leuchtet"); ev(A.tomH, "pop", "Toms Wohnung leuchtet"); ev(A.wer, "whoosh", "Kamera zurück: beide Häuser"); ev(A.n30h, "pop", "Beide Wohnungen leuchten: dreißig Jahre");
  ev(A.leipzig, "pop", "Schild Leipzig"); ev(T("regeln:Quadratmeter"), "pop", "80 m²: beide Wohnungen leuchten"); ev(A.neben, "klick", "Nebenkosten-Block leuchtet"); ev(A.preis, "ding", "Kaufpreis"); ev(A.beide, "pop", "Beide Vorplätze und Säulenfüße leuchten"); ev(A.fuenfzig, "ding", "Säulen wachsen auf 50.000 €");
  ev(A.lisaR, "pop", "Kreditturm steigt"); ev(A.n1226, "klick", "Lisas Rate"); ev(A.n718, "klick", "Toms Miete"); ev(T("regeln:Miete"), "pop", "Toms Säule pulst: Miete"); ev(A.legt, "pop", "Rest wird angelegt");
  ev(A.klar, "whoosh", "Spot auf Lisa"); ev(A.raus, "pop", "Mietscheine fliegen weg"); ev(A.oder, "klick", "Spot wechselt auf Tom");
  ev(A.n26, "ding", "Nebenkosten-Block"); ev(A.weg, "whoosh", "Nebenkosten lösen sich auf");
  ev(A.folg + 1.0, "pop", "Lisa und Tom blicken in die Kamera, Figuren leuchten"); ev(A.steigt, "klick", "Miete steigt"); ev(A.gleich, "klick", "Rate bleibt fest"); ev(A.n20, "ding", "Jahr 20: über 1.000 € Miete");
  ev(A.n30, "whoosh", "Jahr 30"); ev(A.n439, "ding", "Wohnung abbezahlt: Lisa leuchtet"); ev(A.n512, "ding", "Toms Depot leuchtet"); ev(A.steuer, "whoosh", "Steuer schneidet ein Stück ab");
  ev(A.tomE, "klick", "Endstand Tom"); ev(A.lisaE, "klick", "Endstand Lisa"); ev(A.gewinnt, "ding", "Tom gewinnt knapp");
  ev(A.warum, "klick", "Warum: ruhige Fahrt"); ev(A.miete2, "klick", "Miete tickt"); ev(A.toms2, "klick", "Toms Säule pulst"); ev(A.n64, "pop", "Steuer 64.703 €");
  ev(A.und, "whoosh", "Uhr springt auf 0"); ev(A.legtU, "pop", "Tüten statt Depot"); ev(A.dann + 0.6, "ding", "Lisa zieht vorbei");
  ev(A.merkMiete, "whoosh", "Kamera gleitet zurück"); ev(A.merkMiete + 0.9, "klick", "Lisas Säule pulst"); ev(A.geld, "pop", "Toms Säule pulst"); ev(A.n1000, "ding", "Miete über 1.000 €: Toms Säule pulst"); ev(A.n1000 + 0.9, "klick", "Kamera hebt sich"); M.melde({ t: A.sparen, typ: "pointe", klang: "akzent", text: "Merksatz: Kaufen = Sparen" });

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
