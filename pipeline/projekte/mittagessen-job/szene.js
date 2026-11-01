// „Mittagessen im Job: Selbst kochen oder bestellen, was kostet ein Jahr wirklich?“ – Stil 6 Papier-Collage in Three.js
// (engine/stil_collage.js). Packpapier-Grund, ein Pappbrett mit Klebeband als Bühne, darauf Münzsäulen aus Papierscheiben
// (Höhe = Euro: unten Geld, oben Zeit), ein Abreißkalender, der Blätter verliert, eine Papieruhr, Papierfiguren und Symbole
// (Topf, Lieferbeutel, Kantinen-Tablett). Alle Zahlen stammen aus pipeline/sim/mittagessen.mjs (13 Tests, Netto-Modul 2026).
// Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { HUD, el, fmt } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes, schleifenWert, hash } from "../../engine/bewegung.js";
import {
  CollageBuehne, CollageWelt, COLLAGE, gruppe, setzePx, ton, papier, band, rechteck, kreisForm, kraftGrund, zeitung, muenzSaeule, topf,
  lieferbeutel, tablett, einkaufstuete, schwamm, kalender, flugBlaetter, papierUhr, papierFigur, pappstreifen, etikett, stopp, blende,
} from "../../engine/stil_collage.js";
import { ANNAHMEN, vergleich, verlauf, videoZahlen, nettoStundenlohn } from "../../sim/mittagessen.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Säulen, Figuren, Tafel, Chips, Untertitel-Schlüsselwörter). Kein Gelb (Untertitel-Wort ist gelb).
const GRUEN = "#2ECC71"; // KOCHEN
const MAGENTA = "#E040FB"; // BESTELLEN
const BLAU = "#3F6AF0"; // Kantine (dritte Option im Schlussteil, kein Team)
const ROT = "#D9402B"; // Akzent (Sticker, Ergebnis)
const TINTE = COLLAGE.tinte;
const ZEIT_GRUEN = "#9BEBBE"; // Zeitteil der Kochen-Säule (heller, mit Raster)
const ZEIT_MAGENTA = "#F2A4FD";
const ZEIT_BLAU = "#A9BDF8";
const euro = (v, nk = 0) => `${fmt.zahl(v, nk)} €`;
const UT_OBEN = 1296; // Untertitel-Bereich (kontur, 2 Zeilen)

// Maße der Bühne (px, y nach unten)
const BASIS = 1215; // Standfläche der Säulen
const COIN = 60; // € je Papier-Münze
const DICKE = 7.5; // px je Münze
const X = { k: 250, c: 540, b: 830 }; // Säulen Kochen, Kantine, Bestellen

// =====================================================================================
// HUD-Etikett an einem Weltpunkt (Chip, der mit der Kamera mitwandert), meldet sich wie ein Chip im Protokoll
// =====================================================================================
class Etikett {
  constructor(M, { html, art = "voll", farbe = "akzent", ein, aus = Infinity, punkt, anker = "mitte", dx = 0, dy = 0, gross = false, klang = "pop", winkel = 0, klasse = "", minY = SICHER.oben + 170, maxY = SICHER.unten - 230 }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = aus === Infinity ? Infinity : M.zeit(aus);
    Object.assign(this, { punkt, anker, dx, dy, winkel, minY, maxY, klang });
    this.e = el("div", "ms fl-etikett", "", M.hud.wurzel);
    this.chip = el("div", `ms-chip ${art} ${gross ? "gross" : ""} ${klasse}`, `<i></i><span>${html}</span>`, this.e);
    M.setzeFarbe(this.chip, farbe);
    this.b = this.chip.offsetWidth;
    this.h = this.chip.offsetHeight;
    this.text = String(html).replace(/<[^>]+>/g, "");
  }
  ereignisse() {
    return [{ t: this.ein, typ: "chip", klang: this.klang, text: this.text }];
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.22;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 3.4, daempfung: 0.36 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.22));
    const p = this.punkt(t);
    let left = p.x + this.dx - (this.anker === "mitte" ? this.b / 2 : this.anker === "rechts" ? this.b : 0);
    left = clamp(left, SICHER.links, SICHER.rechts - this.b);
    const top = clamp(p.y + this.dy - this.h / 2, this.minY, Math.min(this.maxY, UT_OBEN - 14 - this.h)); // nie in den Untertitel-Bereich
    this.e.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - s) * 24 - x * 16).toFixed(1)}px) scale(${((0.3 + 0.7 * s) * (1 - 0.35 * x)).toFixed(4)}) rotate(${(this.winkel + (1 - s) * -8).toFixed(2)}deg)`;
    this.e.style.opacity = String(clamp((t - this.ein) / 0.06) * (1 - x));
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.9 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new CollageBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: false });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'", "700 26px 'Liberation Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const V = vergleich();
  const Z = videoZahlen();
  const SL = nettoStundenlohn();

  // =====================================================================================
  // Zeitachse des Modells (alles an Wortzeiten)
  // =====================================================================================
  const tLos = T("falle:Los");
  const tJahr = T("rennen:Kochen"); // Jahr zu Ende: Zähler stehen
  const tSchleife = T("schluss:Was") + 0.05;
  // Tage 0..220: Zeitraffer von „Los“ bis „Nach einem Jahr: Kochen …“
  const tagRoh = (t) => (t <= tLos - 0.1 ? 0 : keyframes([{ t: tLos - 0.1, v: 0 }, { t: tJahr, v: 220, e: ease.inOutSine }], t));
  const geldKRoh = (t) => verlauf("kochen", tagRoh(t)).geld;
  const geldBRoh = (t) => verlauf("bestellen", tagRoh(t)).geld;
  // Zeit Kochen: wächst mit „55 Stunden“ bis „740 Euro“; Uhr zählt 0 → 55 Stunden
  const tStd0 = T("netto:55") - 0.12, tStd1 = T("netto:Stunden.>"), tZK1 = T("netto:740") + 0.25;
  const uhrPRoh = (t) => ease.inOutSine(fortschritt(t, tStd0, tStd1));
  const zeitKRoh = (t) => V.kochen.zeitwert * ease.inOutSine(fortschritt(t, tStd0 + 0.1, tZK1));
  // Zeit Bestellen: „Nur 6 Minuten“ bis „296 Euro“
  const tZB0 = T("bestellzeit:Nur"), tZB1 = T("bestellzeit:300") + 0.45;
  const zeitBRoh = (t) => V.bestellen.zeitwert * ease.inOutSine(fortschritt(t, tZB0, tZB1));
  // Kantine: Geld mit „4,57 Euro“, Zeit mit „10 Minuten Weg“
  const tC0 = T("ueberraschung:4") - 0.1, tC1 = T("ueberraschung:Euro,>") + 0.1, tC2 = T("ueberraschung:Minuten") - 0.3, tC3 = T("ueberraschung:Weg.>") + 0.25;
  const geldCRoh = (t) => V.kantine.geld * ease.outCubic(fortschritt(t, tC0, tC1));
  const zeitCRoh = (t) => V.kantine.zeitwert * ease.inOutSine(fortschritt(t, tC2, tC3));
  const gesamtK = (t) => geldKRoh(t) + zeitKRoh(t);
  const gesamtB = (t) => geldBRoh(t) + zeitBRoh(t);
  const gesamtC = (t) => geldCRoh(t) + zeitCRoh(t);

  // Schleife: alle Weltwerte gleiten bis zum letzten Bild in den Zustand von t = 0 zurück
  const SO = { ab: tSchleife, ende: ENDE };
  const S = schleifenWert((t) => ({ tau: t, tag: tagRoh(t), gK: geldKRoh(t), zK: zeitKRoh(t), gB: geldBRoh(t), zB: zeitBRoh(t), gC: geldCRoh(t), zC: zeitCRoh(t), uhr: uhrPRoh(t) }), SO);
  const topY = (g, z) => BASIS - ((g + z) / COIN) * DICKE;

  // =====================================================================================
  // Welt
  // =====================================================================================
  const W = new CollageWelt({ hintergrund: COLLAGE.kraft });
  const wurzel = W.wurzel;
  kraftGrund(wurzel);
  const dekoEbene = W.ebene(0.5, -20);
  zeitung(dekoEbene, 930, 70, 640, 380, 5, 0, 11);
  zeitung(dekoEbene, 70, 30, 420, 280, -4, 0.02, 12);
  zeitung(dekoEbene, 130, 1760, 640, 460, -3, 0, 13);
  zeitung(dekoEbene, 960, 1790, 660, 500, 4, 0.02, 14);
  zeitung(dekoEbene, 1220, 900, 300, 560, 80, 0, 15);
  zeitung(dekoEbene, -150, 960, 300, 520, -86, 0.03, 16);

  // ---------- Pappbrett als Bühne mit Klebeband, Hilfslinien bei 1.000 / 2.000 / 3.000 € ----------
  papier(wurzel, rechteck(980, 724, 8), "#EBDDC1", { x: 540, y: 950, z: 2, dreh: -0.5, amp: 4, schritt: 13, schatten: 1.4, seed: 31 });
  const bandA = [[150, 598, 150, -14], [925, 606, 140, 11], [140, 1302, 130, 9], [940, 1296, 140, -10]];
  for (const [bx, by, bw, bd] of bandA) band(wurzel, bx, by, bw, bd, 2.6, { seed: bx });
  const hilfslinien = gruppe(wurzel, 0, 0, 3);
  const strichTex = (() => {
    const c = document.createElement("canvas");
    c.width = 34; c.height = 4;
    const g = c.getContext("2d");
    g.fillStyle = "#BFB195";
    g.fillRect(0, 0, 18, 4);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const strichMat = new THREE.MeshBasicMaterial({ map: strichTex, transparent: true, depthWrite: false });
  const strichGeo = new THREE.PlaneGeometry(782, 4);
  { const uv = strichGeo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (782 / 34)); }
  for (const k of [1, 2, 3]) {
    const y = BASIS - k * (1000 / COIN) * DICKE;
    const strich = new THREE.Mesh(strichGeo.clone(), strichMat);
    strich.position.set(178 + 391, -y, 0);
    hilfslinien.add(strich);
    etikett(wurzel, `${k}.000 €`, 108, y, { w: 118, groesse: 23, z: 3.4, dreh: k % 2 ? -2 : 2, seed: 300 + k, grund: "#EADFC4" });
  }
  // Boden: Wellpappe
  pappstreifen(wurzel, 540, 1262, 1040, 92, 8, { seed: 170 });

  // ---------- Säulen ----------
  const saeuleK = muenzSaeule(wurzel, { x: X.k, boden: BASIS, farbe: GRUEN, zeitFarbe: ZEIT_GRUEN, dicke: DICKE, z: 6, seed: 9 });
  const saeuleB = muenzSaeule(wurzel, { x: X.b, boden: BASIS, farbe: MAGENTA, zeitFarbe: ZEIT_MAGENTA, dicke: DICKE, z: 6, seed: 19 });
  const saeuleC = muenzSaeule(wurzel, { x: X.c, boden: BASIS, farbe: BLAU, zeitFarbe: ZEIT_BLAU, dicke: DICKE, z: 6, seed: 29 });

  // ---------- Symbole auf den Säulen ----------
  const potI = topf({ farbe: GRUEN });
  potI.g.position.z = 7.5;
  wurzel.add(potI.g);
  const beutel = lieferbeutel({ farbe: MAGENTA });
  beutel.g.position.z = 7.5;
  wurzel.add(beutel.g);
  const tabl = tablett({ farbe: BLAU });
  tabl.g.position.z = 7.5;
  wurzel.add(tabl.g);

  // ---------- Papierfiguren auf dem Boden ----------
  const figK = papierFigur({ farbe: GRUEN, trage: "dose", seed: 200 });
  figK.g.scale.setScalar(0.82);
  setzePx(figK.g, 92, 1292, 9);
  wurzel.add(figK.g);
  const figB = papierFigur({ farbe: MAGENTA, trage: "tuete", haar: "#5A3A2A", seed: 230 });
  figB.g.scale.set(-0.82, 0.82, 1);
  setzePx(figB.g, 990, 1292, 9);
  wurzel.add(figB.g);
  const figC = papierFigur({ farbe: BLAU, trage: "tablett", haar: "#2F2A2A", seed: 260 });
  figC.g.scale.setScalar(0.82);
  setzePx(figC.g, 688, 1292, 9);
  wurzel.add(figC.g);

  // ---------- Mitte: Kalender (Rennen) → Uhr (Zeit) ----------
  const KAL = { x: 540, y: 905 };
  const kal = kalender();
  setzePx(kal.g, KAL.x, KAL.y, 6.5);
  wurzel.add(kal.g);
  const flug = flugBlaetter(wurzel);
  const UHR = { x: 540, y: 872 };
  const uhr = papierUhr({ r: 112 });
  setzePx(uhr.g, UHR.x, UHR.y, 6.6);
  wurzel.add(uhr.g);

  // ---------- Symbole der Zeit-Phase (Einkaufen, Kochen, Spülen) ----------
  const zeitIcons = [
    { o: einkaufstuete(), x: 160, y: 850, t: "wendung:Einkaufen," },
    { o: topf({ farbe: GRUEN, seed: 321 }), x: 258, y: 872, t: "wendung:kochen," },
    { o: schwamm(), x: 356, y: 850, t: "wendung:spülen:" },
  ].map((i) => { i.o.g.position.z = 7.8; wurzel.add(i.o.g); i.o.g.scale.setScalar(0.95); i.t = T(i.t); return i; });
  const tIconsAus = T("netto:Dein") + 0.35;

  // ---------- Vergleichslinie auf Höhe der Kochen-Säule (zweite Überraschung) ----------
  const refLinie = gruppe(wurzel, 0, 0, 7.2);
  const refDashes = [];
  for (let x = 110; x < 980; x += 32) refDashes.push(papier(refLinie, rechteck(18, 3.4, 1), TINTE, { x, y: 0, amp: 0.5, saum: false, schatten: 0.3, seed: x, faser: false }));

  // =====================================================================================
  // Kamera: Fahrten zwischen Einstellungen (orthografisch: Blickmitte in px + Zoom)
  // =====================================================================================
  const E = {
    start: [540, 960, 1.0],
    hook: [540, 940, 1.05],
    regelnTage: [540, 930, 1.16],
    regelnK: [330, 1010, 1.3],
    regelnB: [750, 960, 1.22],
    falle: [540, 960, 1.0],
    los: [540, 950, 1.06],
    jahrK: [370, 1020, 1.3],
    jahrB: [700, 930, 1.2],
    folgen: [540, 960, 1.0],
    zeit: [540, 930, 1.18],
    icons: [350, 940, 1.2],
    netto: [420, 1000, 1.22],
    stunden: [380, 1040, 1.38],
    besZeit: [700, 930, 1.22],
    ergebnis: [540, 1010, 0.98],
    warum: [540, 985, 1.04],
    kantine: [540, 1030, 1.12],
    tops: [395, 1034, 2.5],
    merk: [540, 960, 1.0],
  };
  const fahrten = [
    { t: 0, z: E.start },
    { t: 0.05, z: E.hook, d: 4.8, e: ease.inOutSine },
    { t: T("regeln:220") + 0.05, z: E.regelnTage, d: 0.9 },
    { t: T("regeln:Kochen:") - 0.2, z: E.regelnK, d: 0.9 },
    { t: T("regeln:Bestellen:") - 0.2, z: E.regelnB, d: 0.9 },
    { t: T("falle:Klar,") - 0.2, z: E.falle, d: 0.8 },
    { t: tLos - 0.3, z: E.los, d: 0.7 },
    { t: tJahr - 0.2, z: E.jahrK, d: 0.7 },
    { t: T("rennen:Bestellen") - 0.25, z: E.jahrB, d: 0.8 },
    { t: T("folgen:Folg") - 0.1, z: E.folgen, d: 1.4, e: ease.inOutSine },
    { t: T("wendung:Doch") - 0.15, z: E.zeit, d: 0.8 },
    { t: T("wendung:Einkaufen,") - 0.35, z: E.icons, d: 0.9 },
    { t: T("netto:Dein") - 0.1, z: E.netto, d: 0.9 },
    { t: T("netto:Mal") - 0.3, z: E.stunden, d: 0.8 },
    { t: T("bestellzeit:Und") - 0.1, z: E.besZeit, d: 0.8 },
    { t: T("ergebnis:Endstand:") - 0.25, z: E.ergebnis, d: 0.8 },
    { t: T("warum:Warum") - 0.15, z: E.warum, d: 0.8 },
    { t: T("ueberraschung:Und") - 0.1, z: E.kantine, d: 0.9 },
    { t: T("ueberraschung:Am") + 0.2, z: E.tops, d: 1.3, e: ease.inOutCubic },
    { t: T("merksatz:Kochen") - 0.1, z: E.merk, d: 0.9 },
  ];
  const kamBasis = (t) => {
    let z = fahrten[0].z;
    for (let i = 1; i < fahrten.length; i++) {
      const f = fahrten[i];
      if (t < f.t) break;
      const k = (f.e || ease.inOutCubic)(fortschritt(t, f.t, f.t + f.d));
      z = z.map((v, j) => lerp(v, f.z[j], k));
    }
    // leichtes Driften (nichts steht still), am Anfang und Ende 0 (Schleife)
    const dx = Math.sin(t * 0.41) * 6, dy = Math.sin(t * 0.33 + 1) * 4;
    return W.kamPx(z[0] + dx, z[1] + dy, z[2]);
  };
  const regie = new Regie(W.kamera, kamBasis, { zp });
  regie.schleife({ ab: tSchleife, ende: ENDE });
  const P = (x, y) => (t) => { regie.anwenden(t); return W.projiziere(x, y); };

  // =====================================================================================
  // HUD und Bausteine
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "KOCHEN", farbe: GRUEN, woerter: ["Kochen*", "kochen", "Kochen:"] },
      b: { name: "BESTELLEN", farbe: MAGENTA, woerter: ["Bestellen*", "bestellen"] },
    },
    akzent: ROT,
    tinte: TINTE,
    karte: COLLAGE.papier,
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  fahrten.slice(2).forEach((f) => M.melde({ t: f.t, typ: "kamera", art: "fahrt", dauer: f.d, klang: "whoosh" }));

  // ---------- Anzeigetafel: Euro je Team (Geld + bewertete Zeit), Mitte: Tag im Zeitraffer ----------
  M.tafel({
    y: 166,
    links: { team: "a", einheit: "€", nk: 0, max: 5000 },
    rechts: { team: "b", einheit: "€", nk: 0, max: 5000 },
    werte: (t) => ({ a: Math.round(gesamtK(t)), b: Math.round(gesamtB(t)) }),
    anteil: (t) => ({ a: gesamtK(t) / 4000, b: gesamtB(t) / 4000 }),
    vorn: "tief",
    uhr: { ein: "falle:Los", zeit: (t) => Math.round(tagRoh(t)), format: (s) => String(Math.round(s)), label: "TAG" },
  });

  // ---------- Hook: Titel Wort für Wort ----------
  M.titel({
    y: 346, groesse: 100, aus: "hook:wirklich?>+0.05",
    woerter: [
      { text: "KOCHEN", ein: "hook:kochen-0.02", team: "a" },
      { umbruch: true },
      { art: "vs", ein: "hook:oder-0.02" },
      { text: "BESTELLEN?", ein: "hook:bestellen?-0.02", team: "b" },
      { umbruch: true },
      { text: "MITTAGESSEN", ein: "hook:Mittagessen-0.02", art: "klein" }, { text: "IM JAHR?", ein: "hook:im-0.02", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips ----------
  M.chips({ y: 372, ausrichtung: "mitte", aus: "falle:Klar,-0.45", liste: [{ text: "220 ARBEITSTAGE", ein: "regeln:220-0.03", art: "dunkel", gross: true }] });
  M.chips({ y: 512, ausrichtung: "mitte", aus: "falle:Klar,-0.45", abstand: 52, liste: [
    { text: "KOCHEN 3,50 €", ein: "regeln:3,50-0.03", art: "voll", team: "a" },
    { text: "BESTELLEN 15 €", ein: "regeln:15-0.03", art: "voll", team: "b" },
  ] });

  // ---------- Denkfalle und Start ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "falle:Klar,", aus: "falle:Los-0.1", x: 540, y: 612, winkel: -8, farbe: "a", groesse: 88 });

  // ---------- Kalender: Tag im Zeitraffer ----------
  M.zaehler({ wert: (t) => Math.round(tagRoh(t)), nk: 0, einheit: "TAG", max: 300, team: "tinte", art: "voll", punkt: P(KAL.x, KAL.y + 28), aus: "wendung:Doch-0.1", minY: 300 });
  M.zaehler({ wert: (t) => Math.round(tagRoh(t)), nk: 0, einheit: "TAG", max: 300, team: "tinte", art: "voll", punkt: P(KAL.x, KAL.y + 28), ein: tSchleife + 0.7, minY: 300 }); // Schleife: der Kalender kommt mit zurück

  // ---------- Jahresende: Summen an den Säulen ----------
  hud.add(new Etikett(M, { html: `<span class="klein">KOCHEN</span><span class="betrag">${euro(V.kochen.geld)}</span>`, art: "voll", farbe: "a", ein: "rennen:770", aus: "rennen:Bestellen-0.1", punkt: (t) => P(X.k, topY(S(t).gK, S(t).zK) - 200)(t), gross: true }));
  hud.add(new Etikett(M, { html: `<span class="klein">BESTELLEN</span><span class="betrag">${euro(V.bestellen.geld)}</span>`, art: "voll", farbe: "b", ein: "rennen:3.300", aus: "folgen:Folg-0.05", punkt: (t) => P(X.b - 40, topY(S(t).gB, S(t).zB) - 200)(t), gross: true }));

  // ---------- Folgen-Aufruf (ca. 20 s, vor der Wendung) ----------
  M.folgen({ ein: "folgen:Folg-0.05", dauer: 1.8, y: 800, team: "a" });

  // ---------- Wendung: Zeit mit einrechnen ----------
  M.stempel({ text: "ZEIT!", ein: "wendung:Zeit", aus: "wendung:Zeit+0.7", x: 540, y: 700, winkel: 6, farbe: "akzent", groesse: 104 });
  M.chips({ y: 372, ausrichtung: "mitte", aus: "netto:Dein-0.1", abstand: 34, zeilenabstand: 30, liste: [
    { text: "EINKAUFEN 3 MIN", ein: "wendung:Einkaufen,-0.03", art: "voll", team: "a" },
    { text: "KOCHEN 9 MIN", ein: "wendung:kochen,-0.03", art: "voll", team: "a" },
    { text: "SPÜLEN 3 MIN", ein: "wendung:spülen:-0.03", art: "voll", team: "a" },
  ] });

  // ---------- Netto-Stundenlohn ----------
  M.formel({
    y: 372, aus: "netto:Mal-0.1", titel: "Netto-Stundenlohn", groesse: 66,
    teile: [
      { text: "27.999", einheit: "€", ein: "netto:Dein+0.25" },
      { text: "÷", ein: "netto:Dein+0.55" },
      { text: "2.080", einheit: "h", ein: "netto:Dein+0.8" },
      { text: "=", ein: "netto:13-0.5" },
      { text: "13,46", einheit: "€/h", ein: "netto:13-0.05", art: "erg" },
    ],
  });
  // Stunden der Kochen-Zeit (Uhr zählt hoch)
  M.zaehler({ wert: (t) => Math.round(55 * uhrPRoh(t)), nk: 0, einheit: "STD", max: 99, team: "a", art: "voll", punkt: P(UHR.x, UHR.y + 6), ein: "netto:55-0.15", aus: "bestellzeit:Und-0.05", minY: 300 });
  hud.add(new Etikett(M, { html: `<span class="klein">ZEIT</span><span class="betrag">+${euro(V.kochen.zeitwert)}</span>`, art: "voll", farbe: "a", ein: "netto:740", aus: "bestellzeit:Und-0.05", punkt: (t) => P(X.k, topY(S(t).gK, S(t).zK) - 200)(t), gross: true }));

  // ---------- Bestellen: nur 6 Minuten ----------
  hud.add(new Etikett(M, { html: `<span class="klein">ZEIT</span><span class="betrag">+${euro(V.bestellen.zeitwert)}</span>`, art: "voll", farbe: "b", ein: "bestellzeit:300", aus: "ergebnis:Endstand:-0.5", punkt: (t) => P(X.b - 40, topY(S(t).gB, S(t).zB) - 215)(t), gross: true }));

  // ---------- Ergebnis: Bilanzkarte ----------
  M.bilanz({
    y: 352, ein: "ergebnis:Endstand:-0.15", aus: "warum:Warum-0.15", titel: "Endstand · Euro pro Jahr",
    zeilen: [
      { label: "KOCHEN", zusatz: "Geld + Zeit", wert: V.kochen.gesamt, einheit: "€", nk: 0, team: "a", ein: "ergebnis:1.510" },
      { label: "BESTELLEN", zusatz: "Geld + Zeit", wert: V.bestellen.gesamt, einheit: "€", nk: 0, team: "b", ein: "ergebnis:3.600" },
    ],
    sieger: { text: "KOCHEN GEWINNT", team: "a", ein: "ergebnis:gewinnt" },
  });

  // ---------- Warum? zwei Faktoren ----------
  M.balken({
    y: 352, aus: "ueberraschung:Und-0.1", titel: "Warum?", max: V.bestellen.geld,
    faktoren: [
      { label: "GELD", ein: "warum:Kochen", a: { wert: V.kochen.geld, text: euro(V.kochen.geld) }, b: { wert: V.bestellen.geld, text: euro(V.bestellen.geld) }, tag: `−${euro(Z.geld_vorteil_kochen)}`, tagEin: "warum:Geld." },
      { label: "ZEIT", ein: "warum:Aber", a: { wert: V.kochen.zeitwert, text: euro(V.kochen.zeitwert) }, b: { wert: V.bestellen.zeitwert, text: euro(V.bestellen.zeitwert) }, tag: `+${euro(Z.zeit_nachteil_kochen)}`, tagEin: "warum:Zeit." },
    ],
  });

  // ---------- Zweite Überraschung: die Kantine ----------
  hud.add(new Etikett(M, { html: "MIT ZUSCHUSS", art: "dunkel", ein: "ueberraschung:Kantine.", aus: "ueberraschung:Am-0.1", punkt: (t) => P(X.c, topY(S(t).gC, S(t).zC) - 190)(t), dy: 0 }));
  M.zaehler({ wert: (t) => Math.round(gesamtC(t)), nk: 0, einheit: "€", max: 5000, team: BLAU, art: "voll", punkt: (t) => P(X.c, topY(S(t).gC, S(t).zC) - 100)(t), ein: "ueberraschung:4-0.05", aus: "ueberraschung:Sie-0.2", minY: 300 });
  hud.add(new Etikett(M, { html: `<span class="klein">KOCHEN</span><span class="betrag">${euro(V.kochen.gesamt)}</span>`, art: "voll", farbe: "a", ein: "ueberraschung:fast", aus: "ueberraschung:Sie-0.2", punkt: (t) => P(X.k - 20, topY(S(t).gK, S(t).zK) - 110)(t), gross: false, dy: 0 }));
  M.stempel({ text: "EINGEHOLT!", ein: "ueberraschung:holt", aus: "ueberraschung:holt+0.65", x: 540, y: 700, winkel: -6, farbe: BLAU, groesse: 100 });
  M.chips({ y: 372, ausrichtung: "mitte", aus: "ueberraschung:Sie-0.2", liste: [{ text: `KIPPPUNKT: ${fmt.zahl(Z.kipp_kochminuten_kantine, 1)} MIN KOCHZEIT`, ein: "ueberraschung:Am", art: "dunkel" }] });
  M.melde({ t: "ueberraschung:Sie-0.05", typ: "fuehrung", klang: "ding", text: "Kantine holt Kochen ein" });

  // ---------- Merksatz ----------
  M.pointe({ woerter: [{ text: "KOCHEN", ein: "merksatz:Kochen", farbe: "a" }, { text: "SPART", ein: "merksatz:spart" }, { umbruch: true }, { text: "GELD.", ein: "merksatz:Geld.", farbe: "akzent" }], aus: "merksatz:Geld.>-0.1", y: 500, groesse: 104 });
  M.pointe({ woerter: [{ text: "DIE", ein: "merksatz:Die" }, { text: "KANTINE", ein: "merksatz:Kantine" }, { umbruch: true }, { text: "SPART", ein: "merksatz:spart#2" }, { text: "ZEIT.", ein: "merksatz:Zeit.", farbe: "akzent" }], aus: "merksatz:Und-0.05", y: 500, groesse: 104 });
  M.pointe({ woerter: [{ text: "ZEIT", ein: "merksatz:Zeit#2", farbe: "akzent" }, { text: "HAT", ein: "merksatz:hat" }, { umbruch: true }, { text: "EINEN", ein: "merksatz:einen" }, { text: "PREIS.", ein: "merksatz:Preis.", farbe: "akzent" }], aus: "schluss:Was-0.1", y: 500, groesse: 104 });
  M.melde({ t: "merksatz:Geld.", typ: "pointe-wort", klang: "klick", text: "GELD." });
  M.melde({ t: "merksatz:Zeit.", typ: "pointe-wort", klang: "klick", text: "ZEIT." });
  M.melde({ t: "merksatz:Preis.", typ: "pointe-wort", klang: "akzent", text: "PREIS." });

  // ---------- Untertitel Wort für Wort (Stil „kontur“, Entscheidung des Inhabers 01.11.) ----------
  M.untertitel({ stil: "kontur", versteckt: [[T("schluss:Kommentare.>") + 0.5, DAUER + 1]] });

  // Welt-Ereignisse für Bild und Klang (Münzen, Kalenderblätter, Papier-Pops)
  const tMuenz = (a, b, n) => Array.from({ length: n }, (_, i) => lerp(a, b, i / Math.max(1, n - 1)));
  for (const t of tMuenz(tLos, tJahr, 6)) M.melde({ t, typ: "muenzen", klang: "pop", text: "Münzen" });
  for (const i of zeitIcons) M.melde({ t: i.t, typ: "symbol", klang: "pop", text: "Symbol" });
  M.melde({ t: T("wendung:15"), typ: "symbol", klang: "ding", text: "15 Minuten: Symbole hüpfen" });
  M.melde({ t: T("wendung:Doch"), typ: "kalender", klang: "whoosh", text: "Kalender weg" });
  M.melde({ t: T("wendung:Doch") + 0.3, typ: "uhr-ein", klang: "ding", text: "Uhr erscheint" });
  M.melde({ t: T("netto:Euro") + 0.05, typ: "puls", klang: "klick", text: "Uhr: Stundenlohn" });
  M.melde({ t: T("netto:46.") + 0.1, typ: "puls", klang: "ding", text: "Uhr: Stundenlohn" });
  for (const t of tMuenz(tStd0, tZK1, 4)) M.melde({ t, typ: "muenzen", klang: "pop", text: "Zeit-Münzen Kochen" });
  for (const t of tMuenz(tZB0, tZB1, 3)) M.melde({ t, typ: "muenzen", klang: "pop", text: "Zeit-Münzen Bestellen" });
  for (const t of tMuenz(tC0, tC3, 6)) M.melde({ t, typ: "muenzen", klang: "pop", text: "Münzen Kantine" });
  M.melde({ t: T("ueberraschung:Und") + 0.1, typ: "kalender", klang: "whoosh", text: "Uhr weg" });
  M.melde({ t: T("ueberraschung:Kantine."), typ: "symbol", klang: "pop", text: "Kantinen-Figur" });
  M.melde({ t: T("warum:Geld."), typ: "puls", klang: "klick", text: "Geld-Teil" });
  M.melde({ t: T("warum:Zeit."), typ: "puls", klang: "klick", text: "Zeit-Teil" });
  M.melde({ t: T("ergebnis:1.510") + 0.05, typ: "puls", klang: "klick", text: "Kochen-Säule" });
  M.melde({ t: T("ergebnis:Euro.") + 0.1, typ: "puls", klang: "klick", text: "Kochen-Säule" });
  M.melde({ t: T("ergebnis:Bestellen") + 0.05, typ: "puls", klang: "klick", text: "Bestellen-Säule" });
  M.melde({ t: T("ergebnis:fast") + 0.4, typ: "puls", klang: "klick", text: "Bestellen-Säule" });
  M.melde({ t: T("ergebnis:Kochen#2") - 0.1, typ: "puls", klang: "ding", text: "Kochen vorn" });
  M.melde({ t: T("ueberraschung:Ende:") + 1.4, typ: "linie", klang: "klick", text: "Vergleichslinie" });

  // =====================================================================================
  // Weltzustand je Bild
  // =====================================================================================
  const tWarumGeld = T("warum:Geld."), tWarumZeit = T("warum:Zeit.");
  const tRefAn = T("ueberraschung:Ende:") + 1.4, tRefAus = T("merksatz:Kochen") - 0.05;
  const tUhrEin = T("wendung:Doch") + 0.3, tUhrAus = T("ueberraschung:Und") + 0.1;
  const tKalAus = T("wendung:Doch") - 0.05;
  const tFigC = T("ueberraschung:Kantine.") - 0.05;
  const puls = (t, t0, d = 0.5) => { const k = (t - t0) / d; return k < 0 || k > 1 ? 0 : Math.sin(k * Math.PI) * (1 - k * 0.3); };
  const rest = (n, i) => hash(n, i) - 0.5;

  const setzeWelt = (tReal) => {
    const s = S(tReal);
    const t = s.tau; // Weltzeit: spult in der Schleife auf 0 zurück (letztes Bild = erstes Bild), alle Ereignisse laufen dabei rückwärts
    const tau = t;
    // Säulen
    const geldPuls = puls(t, tWarumGeld - 0.1, 0.8), zeitPuls = puls(t, tWarumZeit - 0.1, 0.8);
    const pK = puls(t, T("ergebnis:1.510"), 0.5) + puls(t, T("ergebnis:Euro.") + 0.05, 0.5) + puls(t, T("ergebnis:Kochen#2") - 0.1, 0.7);
    const pB = puls(t, T("ergebnis:Bestellen"), 0.5) + puls(t, T("ergebnis:fast") + 0.35, 0.5);
    const rK = saeuleK.setze(s.gK / COIN, s.zK / COIN);
    const rB = saeuleB.setze(s.gB / COIN, s.zB / COIN);
    const rC = saeuleC.setze(s.gC / COIN, s.zC / COIN);
    saeuleK.muenzen.forEach((c, i) => { if (c.visible) { const istGeld = i + 0.5 < s.gK / COIN; c.scale.x = 1 + 0.06 * (istGeld ? geldPuls : zeitPuls) + 0.05 * pK; } });
    saeuleB.muenzen.forEach((c, i) => { if (c.visible) { const istGeld = i + 0.5 < s.gB / COIN; c.scale.x = 1 + 0.06 * (istGeld ? geldPuls : zeitPuls) + 0.05 * pB; } });
    // Stop-Motion-Wackeln der Symbole (12 Bilder je Sekunde)
    const n12 = Math.floor(tau * 12 + 1e-6);
    const wack = (i) => ({ dy: rest(n12, i) * 5, dr: rest(n12, i + 50) * 0.07 });
    const wk = wack(1), wb = wack(2), wc = wack(3);
    setzePx(potI.g, X.k + rest(n12, 7) * 2, rK - 3 + wk.dy, 7.5);
    potI.g.rotation.z = wk.dr;
    potI.setze(tau);
    setzePx(beutel.g, X.b + rest(n12, 8) * 2, rB - 3 + wb.dy, 7.5);
    beutel.g.rotation.z = wb.dr;
    // Kantine: Säule und Tablett erscheinen mit „Die Kantine.“
    const cAn = t >= tFigC || s.gC + s.zC > 0.5;
    saeuleC.g.visible = cAn;
    tabl.g.visible = cAn && s.gC + s.zC > 0.5;
    setzePx(tabl.g, X.c + rest(n12, 9) * 2, rC - 3 + wc.dy, 7.5);
    tabl.g.rotation.z = wc.dr;
    // Figuren
    const rennt = clamp(fortschritt(t, tLos - 0.3, tLos + 0.2)) * (1 - fortschritt(t, tJahr, tJahr + 0.6));
    figK.setze(tau, { gehen: rennt * 0.9, arm: puls(t, T("rennen:Kochen") + 0.4, 0.8) * 0.4, wippen: 0.5, phase: 0 });
    figB.setze(tau, { gehen: rennt * 0.9, arm: puls(t, T("rennen:Bestellen") + 0.4, 0.8) * 0.4, wippen: 0.5, phase: 0.31 });
    const cFig = clamp(feder(t - tFigC, { frequenz: 3, daempfung: 0.4 }));
    figC.g.visible = t >= tFigC;
    figC.g.scale.set(0.82 * cFig, 0.82 * cFig, 1);
    figC.setze(tau, { gehen: 0, arm: puls(t, T("ueberraschung:ein.") - 0.1, 0.8) * 0.5, wippen: 0.6, phase: 0.6 });
    // Kalender → Uhr
    const kalEin = t < tKalAus ? 1 : 1 - ease.inCubic(fortschritt(t, tKalAus, tKalAus + 0.35));
    kal.g.visible = kalEin > 0.01;
    const kalStoss = t < tLos ? 0 : 1;
    setzePx(kal.g, KAL.x + rest(n12, 11) * 3 * kalStoss * (t < tJahr ? 1 : 0), KAL.y + (1 - kalEin) * -380, 6.5);
    kal.g.scale.setScalar(Math.max(0.001, kalEin));
    kal.g.rotation.z = (1 - kalEin) * -0.6 + (t < tJahr ? rest(n12, 12) * 0.03 * kalStoss : 0);
    flug.setze(t, { start: tLos - 0.05, ende: tJahr, rate: 17, x0: KAL.x, y0: KAL.y - 10, leben: 0.7 });
    const uEin = t < tUhrEin ? 0 : t < tUhrAus ? clamp(feder(t - tUhrEin, { frequenz: 2.6, daempfung: 0.42 })) : 1 - ease.inCubic(fortschritt(t, tUhrAus, tUhrAus + 0.4));
    uhr.g.visible = uEin > 0.01 && t >= tUhrEin - 0.01;
    uhr.g.scale.setScalar(Math.max(0.001, uEin) * (1 + 0.06 * (puls(t, T("netto:Euro") + 0.05, 0.4) + puls(t, T("netto:46.") + 0.1, 0.4))));
    setzePx(uhr.g, UHR.x, UHR.y + (t >= tUhrAus ? -ease.inCubic(fortschritt(t, tUhrAus, tUhrAus + 0.4)) * 300 : 0), 6.6);
    uhr.g.rotation.z = (1 - clamp(uEin)) * 0.5;
    uhr.setze(0.2 + s.uhr * 3.2 + Math.max(0, tau - tStd1) * 0.02);
    // Symbole der Zeit-Phase
    zeitIcons.forEach((ic, i) => {
      const d = t - ic.t;
      const aus = ease.inCubic(fortschritt(t, tIconsAus, tIconsAus + 0.3));
      const k = d < 0 ? 0 : clamp(feder(d, { frequenz: 3.2, daempfung: 0.38 })) * (1 - aus);
      ic.o.g.visible = k > 0.005;
      if (!ic.o.g.visible) return;
      const w = wack(20 + i);
      setzePx(ic.o.g, ic.x, ic.y + w.dy * 0.8 - (1 - k) * 40, 7.8);
      ic.o.g.scale.setScalar(0.95 * k * (1 + 0.14 * puls(t, T("wendung:15"), 0.45)));
      ic.o.g.rotation.z = w.dr * 1.3;
      if (ic.o.setze) ic.o.setze(tau);
    });
    // Vergleichslinie auf Höhe der Kochen-Säule
    const rl = t >= tRefAn && t < tRefAus + 0.3 ? clamp(fortschritt(t, tRefAn, tRefAn + 0.35)) * (1 - fortschritt(t, tRefAus, tRefAus + 0.3)) : 0;
    refLinie.visible = rl > 0.01;
    if (refLinie.visible) {
      setzePx(refLinie, 0, rK, 7.2);
      refDashes.forEach((d, i) => { const k = clamp(rl * 1.6 - i / refDashes.length * 0.6); d.g.scale.set(k, k, 1); });
    }
    // Kamera und Parallaxe zuletzt
    regie.anwenden(tReal);
    W.parallax();
  };
  const post = { vignette: 0.14, koernung: 0.012 };
  const welt = { szene: W.szene, kamera: W.kamera, post, update(t) { setzeWelt(t); } };
  for (const st of [sKlar]) regie.stoss({ t: st.ein + 0.1, staerke: 0.5 });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t });
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, 16, 30, 45, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.hudAt = (t) => { regie.anwenden(t); W.parallax(); hud.update(t); };
  window.__weltSetzen = (t) => setzeWelt(t);
  window.modell = { kochen: V.kochen.gesamt, bestellen: V.bestellen.gesamt, kantine: V.kantine.gesamt, netto_stundenlohn: SL, annahmen: ANNAHMEN.arbeitstage };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
