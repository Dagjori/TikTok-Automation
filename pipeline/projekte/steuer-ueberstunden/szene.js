// „Steuererklärung oder Überstunden: Was bringt dir mehr Geld pro Stunde?“ – Stil 4 Flat-Infografik in Three.js (engine/stil_flat.js).
// Zwei Zimmer als Flat-Karten (links Büro mit Überstunden, rechts Küchentisch mit Steuererklärung), darunter die
// Werbungskosten-Leiste mit der Pauschbetrag-Hürde, ganz unten der Arbeitsweg (Haus – Straße – Büro). Die Kamera fährt
// orthografisch zwischen den Bereichen. Uhr 17–21 Uhr, Himmel von Abendrot zu Nacht, Belege fliegen in die Leiste.
// Zahlen: pipeline/sim/steuer_ueberstunden.mjs (Netto-Modul 2026). Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { HUD, el, fmt } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes, schleifenWert, smoothstep } from "../../engine/bewegung.js";
import {
  FlatBuehne, FlatWelt, FLAT, mat, ton, gruppe, setzePx, rr, rrPfad, rahmen, mitLoechern, kreis, ring, poly, streifen, textFlaeche,
  himmel, figurRuecken, wanduhr, muenze, muenzStapel, beleg, monitor, laptop, schreibtisch, pflanze, haengelampe, haus, buero, auto, deko,
} from "../../engine/stil_flat.js";
import { videoZahlen, REGELN, erstattung } from "../../sim/steuer_ueberstunden.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Pullover, Münzen, Belege, Auto, Tafel, Chips). Kein Gelb (Untertitel-Wort ist gelb).
const ORANGE = "#FF8A3D"; // ÜBERSTUNDEN
const INDIGO = "#5465FF"; // STEUERERKLÄRUNG
const GRUEN = "#12B886"; // Akzent: Geld zurück, Ergebnis
const ROT = "#E8484F"; // Abzüge, Hürde
const TINTE = FLAT.tinte;
const euro = (v, nk = 2) => `${fmt.zahl(v, nk)} €`;

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
    const top = clamp(p.y + this.dy - this.h / 2, this.minY, this.maxY);
    this.e.style.transform = `translate(${left.toFixed(1)}px, ${(top + (1 - s) * 24 - x * 16).toFixed(1)}px) scale(${((0.3 + 0.7 * s) * (1 - 0.35 * x)).toFixed(4)}) rotate(${(this.winkel + (1 - s) * -8).toFixed(2)}deg)`;
    this.e.style.opacity = String(clamp((t - this.ein) / 0.06) * (1 - x));
  }
}

/** Kleine Marke unter der Tafel (BRUTTO → NETTO), Text wechselt bei `wechsel` */
class Marke {
  constructor(M, { x, y, ein, aus, texte }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = M.zeit(aus);
    this.texte = texte.map((z) => ({ ...z, t: M.zeit(z.t) }));
    this.x = x;
    this.y = y;
    this.e = el("div", "ms fl-marke", "", M.hud.wurzel);
  }
  ereignisse() {
    return this.texte.map((z, i) => ({ t: Math.max(this.ein, z.t), typ: "chip", klang: i ? "klick" : "pop", text: z.text }));
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.2;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    let z = this.texte[0], tz = this.ein;
    for (const k of this.texte) if (t >= k.t) { z = k; tz = Math.max(this.ein, k.t); }
    if (this.e.textContent !== z.text) this.e.textContent = z.text;
    this.e.style.background = z.farbe;
    const s = feder(t - tz, { frequenz: 3.4, daempfung: 0.4 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.2));
    this.e.style.transform = `translate(${this.x}px, ${this.y}px) scale(${((0.5 + 0.5 * s) * (1 - 0.3 * x)).toFixed(4)})`;
    this.e.style.opacity = String(clamp((t - this.ein) / 0.08) * (1 - x));
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
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 1.0 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new FlatBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: false });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  const Z = videoZahlen();
  const UE = Z.ue, A = Z.fallA, B = Z.fallB;
  const postenA = Object.fromEntries(A.posten.map((p) => [p.id, p]));

  // =====================================================================================
  // Zeitachse des Modells (alles an Wortzeiten)
  // =====================================================================================
  const tLos = T("falle:Los");
  const tSchleife = T("schluss:Was") + 0.05;
  // Uhr: Stunden seit 17:00 (Zeitraffer, an den gesprochenen Zwischenständen ausgerichtet)
  const uhrKeys = [
    { t: tLos, v: 0 },
    { t: T("rennen:20"), v: 1, e: ease.inOutSine },
    { t: T("rennen:40,"), v: 2, e: ease.linear },
    { t: T("rennen:60."), v: 3, e: ease.linear },
    { t: T("folgen:Folg"), v: 3.3, e: ease.outSine },
    { t: T("wendung:Pendelweg."), v: 3.55, e: ease.linear },
    { t: T("netto:80"), v: 4, e: ease.inOutSine },
  ];
  const stundenRoh = (t) => (t < tLos ? 0 : keyframes(uhrKeys, t));
  // Überstunden: brutto läuft mit der Uhr, dann Abzüge (Lohnsteuer, Sozialabgaben) bis netto
  const tLst = T("netto:Steuer"), tSoz = T("netto:Abgaben");
  const ueRoh = (t) => {
    const brutto = UE.brutto * (stundenRoh(t) / 4);
    const lst = UE.lohnsteuer * ease.inOutCubic(fortschritt(t, tLst, tLst + 0.55));
    const soz = UE.sozial * ease.inOutCubic(fortschritt(t, tSoz, tSoz + 0.6));
    return Math.max(0, brutto - lst - soz);
  };
  // Werbungskosten Fall A: Einträge (Belege fliegen ab tFlug, kommen nach 0,55 s an)
  const FLUG = 0.55;
  const eintraege = [
    { id: "konto", tFlug: T("rennen:Euro,") - 0.1 },
    { id: "mittel", tFlug: T("rennen:40,") + 0.2 },
    { id: "ho", tFlug: T("rennen:60.") + 0.25 },
    { id: "weg", tFlug: T("wendung:Pendelweg.") - 0.1 },
  ].map((e) => ({ ...e, ...postenA[e.id], tAn: e.tFlug + FLUG }));
  // Fall B: 5 km, ohne Extras, dann 16 km
  const tB5 = T("ueberraschung:5") - 0.1, tExtras = T("ueberraschung:Extras") - 0.15, tNull = T("ueberraschung:null.");
  const t16a = T("ueberraschung:16") - 0.15, t16b = T("ueberraschung:dreht") + 0.05;
  const kmRoh = (t) => {
    let km = 25;
    km = lerp(km, 5, ease.inOutCubic(fortschritt(t, tB5, tB5 + 0.8)));
    km = lerp(km, 16, ease.inOutSine(fortschritt(t, t16a, t16b)));
    return km;
  };
  const tageRoh = (t) => lerp(138, 230, ease.inOutCubic(fortschritt(t, tB5, tB5 + 0.8)));
  // Posten-Beträge über die Zeit (für die Leiste)
  const postenRoh = (t) => {
    const w = {};
    for (const e of eintraege) w[e.id] = e.betrag * ease.outCubic(fortschritt(t, e.tAn - 0.05, e.tAn + (e.id === "weg" ? 0.9 : 0.35)));
    // Fall B: Pendelweg aus km und Tagen, Extras fallen weg
    if (t >= tB5) {
      w.weg = kmRoh(t) * REGELN.kmSatz * tageRoh(t);
      const x = ease.inOutCubic(fortschritt(t, tExtras, tExtras + 0.6));
      w.mittel *= 1 - x;
      w.ho *= 1 - x;
    }
    return w;
  };
  const wkRoh = (t) => { const w = postenRoh(t); return w.konto + w.mittel + w.ho + w.weg; };
  // Erstattung (Tafel rechts): 0 bis „222“, dann Sprung; Fall B: fällt auf 0, steigt mit den Kilometern auf 54
  const t222 = T("wendung:222");
  const erstRoh = (t) => {
    let v = A.erstattung * ease.outCubic(fortschritt(t, t222 - 0.05, t222 + 0.55));
    if (t >= tB5) {
      v = lerp(v, 0, ease.inOutCubic(fortschritt(t, tNull - 0.75, tNull)));
      if (t >= t16a) {
        const wk = wkRoh(t);
        v = erstattung(wk).betrag;
      }
    }
    return v;
  };
  // Himmel: 17:00 Abendrot → 21:00 Nacht
  const nachtRoh = (t) => smoothstep(0.2, 3.4, stundenRoh(t));
  // Münzstapel Überstunden (8 Münzen = 80,77 € brutto)
  const stapelRoh = (t) => (ueRoh(t) / UE.brutto) * 8;

  // Schleife: alle Weltwerte gleiten bis zum letzten Bild in den Zustand von t = 0 zurück
  const SO = { ab: tSchleife, ende: ENDE };
  const S = schleifenWert((t) => ({ tau: t, vor: Math.max(0, (tLos - t) / tLos), h: stundenRoh(t), nacht: nachtRoh(t), stapel: stapelRoh(t), km: kmRoh(t), wk: wkRoh(t), ...postenRoh(t) }), SO);

  // =====================================================================================
  // Welt
  // =====================================================================================
  const W = new FlatWelt({ hintergrund: FLAT.creme });
  const wurzel = W.wurzel;
  const dekoEbene = W.ebene(0.55, 0.2);
  const KARTE_L = [60, 600], KARTE_R = [560, 600], KB = 460;
  const BAR = { x: 60, y: 1085, w: 960, h: 170 };
  deko(dekoEbene, { bereich: [-200, -200, 1480, 2400], anzahl: 90, farbe: "#F3DFBE", seed: 7, sperren: [[40, 580, 1000, 700]] });

  // ---------- Hilfen ----------
  const nachtMats = [];
  const nachtFarbe = (tag, nacht) => { const m = mat(tag, 1, { eigen: true }); m.transparent = false; m.depthWrite = true; nachtMats.push({ m, a: new THREE.Color(tag), b: new THREE.Color(nacht) }); return m; };
  const zimmer = (x0, y0, { wand, wandNacht, boden, fenster }) => {
    const g = gruppe(wurzel, x0, y0, 0);
    // Flat-Schatten der Karte
    rr(g, 12, 16, KB, KB, 40, TINTE, 0.5, { deckkraft: 0.12 });
    const sky = himmel(g, fenster[0], fenster[1], fenster[2], fenster[3], 1);
    const w = mitLoechern(g, [0, 0, KB, KB, 40], [fenster], wand, 5);
    w.material = nachtFarbe(wand, wandNacht);
    const bo = rr(g, 0, 392, KB, 68, 0, boden, 5.5);
    rr(g, 0, 388, KB, 6, 0, ton(boden, -0.12), 5.6);
    // Fensterrahmen, Sprosse, Fensterbank
    const [fx, fy, fw, fh] = fenster;
    rahmen(g, fx - 9, fy - 9, fw + 18, fh + 18, 22, 11, "#FFFFFF", 6);
    rr(g, fx + fw / 2 - 4, fy, 8, fh, 0, "#FFFFFF", 6);
    rr(g, fx - 16, fy + fh + 6, fw + 32, 14, 5, "#FFFFFF", 6.2);
    rr(g, fx - 16, fy + fh + 18, fw + 32, 6, 0, TINTE, 6.1, { deckkraft: 0.1 });
    // Sonne, Mond, Sterne, Silhouette der Stadt im Fenster
    const sonne = kreis(g, fx + fw * 0.62, fy + 70, 30, "#FF9F70", 2);
    const sonneHof = kreis(g, fx + fw * 0.62, fy + 70, 46, "#FFC9A0", 1.9, { deckkraft: 0.6 });
    const mond = new THREE.Group();
    mond.position.set(fx + fw * 0.28, -(fy + 50), 2);
    kreis(mond, 0, 0, 20, "#FFF1D6", 0);
    kreis(mond, 9, -6, 18, "#232E66", 0.1);
    g.add(mond);
    const sterne = [];
    for (let i = 0; i < 9; i++) sterne.push(kreis(g, fx + 14 + ((i * 53) % (fw - 28)), fy + 16 + ((i * 37) % 70), i % 3 ? 2.6 : 3.6, "#FFFFFF", 2.05, { eigen: true }));
    const lichter = [];
    const haeuser = [[0, 70, 34], [36, 104, 30], [68, 56, 40], [110, 120, 34], [146, 82, 44]];
    for (const [hx, hh, hw] of haeuser) {
      rr(g, fx + hx, fy + fh - hh, hw, hh + 4, 3, "#7B6BA6", 3);
      for (let r = 0; r < Math.floor((hh - 14) / 18); r++) for (let c = 0; c < Math.floor((hw - 8) / 12); c++) {
        const l = rr(g, fx + hx + 6 + c * 12, fy + fh - hh + 10 + r * 18, 6, 8, 1, "#FFE2A8", 3.1, { eigen: true });
        l.userData.schwelle = ((hx * 7 + r * 13 + c * 29) % 100) / 100;
        lichter.push(l);
      }
    }
    // Rand der Karte (weiß) und Maske unter der Karte (Überstand der Figuren verdecken)
    rahmen(g, -6, -6, KB + 12, KB + 12, 44, 14, "#FFFFFF", 14);
    const m = new THREE.Shape();
    m.moveTo(-30, -(KB - 38));
    m.lineTo(-6, -(KB - 38));
    m.absarc(38, -(KB - 38), 44, Math.PI, 1.5 * Math.PI, false);
    m.lineTo(KB - 38, -(KB + 6));
    m.absarc(KB - 38, -(KB - 38), 44, 1.5 * Math.PI, 2 * Math.PI, false);
    m.lineTo(KB + 30, -(KB - 38));
    m.lineTo(KB + 30, -(KB + 60));
    m.lineTo(-30, -(KB + 60));
    const maske = new THREE.Mesh(new THREE.ShapeGeometry(m, 12), mat(FLAT.creme));
    maske.position.z = 12;
    g.add(maske);
    return {
      g, sky, sonne, sonneHof, mond, sterne, lichter,
      setzeNacht(k) {
        sky.setze(k);
        const sy = fy + 70 + 170 * ease.inSine(clamp(k / 0.55));
        sonne.position.y = -sy;
        sonneHof.position.y = -sy;
        mond.visible = k > 0.45;
        mond.position.y = -(fy + 50 + (1 - ease.outCubic(clamp((k - 0.45) / 0.4))) * 120);
        sterne.forEach((s, i) => { s.material.opacity = smoothstep(0.5 + i * 0.03, 0.75 + i * 0.03, k); s.visible = s.material.opacity > 0.01; });
        for (const l of lichter) { l.material.opacity = smoothstep(l.userData.schwelle * 0.7, l.userData.schwelle * 0.7 + 0.15, k); l.visible = l.material.opacity > 0.01; }
      },
    };
  };

  // ---------- Zimmer links: Büro (ÜBERSTUNDEN) ----------
  const ZL = zimmer(...KARTE_L, { wand: "#FFE6D2", wandNacht: "#F6D6C6", boden: "#F0C9A8", fenster: [40, 44, 190, 168, 14] });
  const uhrL = wanduhr({ r: 50, akzent: ORANGE });
  uhrL.g.position.set(362, -120, 6.3);
  ZL.g.add(uhrL.g);
  schreibtisch(ZL.g, 140, 334, 296, 70, TINTE, 7);
  const monL = monitor({ w: 196, h: 128 });
  setzePx(monL.g, 196, 178, 7.5);
  ZL.g.add(monL.g);
  // Bildschirm: Tabelle mit wandernder Zeile
  rr(monL.bild, 0, 0, monL.w, 16, 0, ORANGE, 0);
  const zeilenL = [];
  for (let i = 0; i < 5; i++) {
    rr(monL.bild, 10, 24 + i * 15, 46, 7, 3, "#C8CFE6", 0.05);
    zeilenL.push(rr(monL.bild, 64, 24 + i * 15, 70 + ((i * 37) % 30), 7, 3, "#9AA6CF", 0.05));
  }
  const cursorL = rr(monL.bild, 4, 20, monL.w - 8, 15, 4, ORANGE, 0.02, { deckkraft: 0.22 });
  const glowL = rr(ZL.g, 176, 160, 236, 168, 30, "#FFD9BF", 7.3, { deckkraft: 0.0, eigen: true });
  const stapel = muenzStapel({ max: 9, farbe: ORANGE });
  stapel.g.position.set(395, -334, 7.6);
  ZL.g.add(stapel.g);
  const pflL = pflanze(ZL.g, 166, 334, 7.55, { groesse: 0.42 });
  const figL = figurRuecken({ farbe: ORANGE });
  figL.g.position.set(262, -374, 8);
  ZL.g.add(figL.g);
  rr(ZL.g, 262 - 80, 424, 160, 80, 26, "#2B3A67", 9);
  rr(ZL.g, 262 - 70, 432, 140, 10, 5, "#3E4E86", 9.1);

  // ---------- Zimmer rechts: Küchentisch (STEUERERKLÄRUNG) ----------
  const ZR = zimmer(...KARTE_R, { wand: "#E3E6FF", wandNacht: "#D2D6F8", boden: "#C8CDF2", fenster: [230, 44, 190, 168, 14] });
  const lampe = haengelampe(ZR.g, 128, 8, 4, { kabel: 60 });
  lampe.kegel.geometry.dispose();
  lampe.kegel.geometry = new THREE.ShapeGeometry(new THREE.Shape([[-34, 102], [34, 102], [150, 392], [-122, 392]].map(([x, y]) => new THREE.Vector2(x, -y))));
  schreibtisch(ZR.g, 26, 334, 304, 70, "#8C5E45", 7);
  const lapR = laptop({ w: 176, h: 112 });
  setzePx(lapR.g, 120, 208, 7.5);
  ZR.g.add(lapR.g);
  // Laptop-Bildschirm: Formular mit 4 Zeilen, die sich füllen
  rr(lapR.bild, 0, 0, lapR.w, 14, 0, INDIGO, 0);
  const felder = [];
  for (let i = 0; i < 4; i++) {
    rr(lapR.bild, 8, 22 + i * 17, 54, 8, 3, "#C8CFE6", 0.05);
    rr(lapR.bild, 70, 19 + i * 17, 80, 13, 3, "#FFFFFF", 0.05);
    const f = rr(lapR.bild, 70, 19 + i * 17, 80, 13, 3, INDIGO, 0.06, { eigen: true });
    f.geometry.translate(-70, 0, 0);
    f.position.x = 70;
    f.scale.x = 0.001;
    felder.push(f);
  }
  const glowR = rr(ZR.g, 98, 190, 220, 150, 30, "#C9CEFF", 7.3, { deckkraft: 0.0, eigen: true });
  // Papierstapel und Tasse
  const papiere = gruppe(ZR.g, 40, 300, 7.6);
  for (let i = 0; i < 4; i++) { const b = beleg({ w: 64, h: 30, farbe: INDIGO }); b.position.set(i * 2 - 2, i * 7, i * 0.3); b.rotation.z = ((i % 2) - 0.5) * 0.08; papiere.add(b); }
  rr(ZR.g, 296, 300, 30, 34, 6, "#FFFFFF", 7.6);
  ring(ZR.g, 330, 316, 7, 12, "#FFFFFF", 7.55);
  const pflR = pflanze(ZR.g, 402, 400, 6.8, { groesse: 0.95, topf: "#7A86FF" });
  const figR = figurRuecken({ farbe: INDIGO });
  figR.g.position.set(212, -374, 8);
  ZR.g.add(figR.g);
  rr(ZR.g, 212 - 80, 424, 160, 80, 26, "#6B4A3A", 9);
  rr(ZR.g, 212 - 70, 432, 140, 10, 5, "#8C5E45", 9.1);

  // ---------- Werbungskosten-Leiste mit Pauschbetrag-Hürde ----------
  const leiste = gruppe(wurzel, BAR.x, BAR.y, 13);
  rr(leiste, 10, 14, BAR.w, BAR.h, 34, TINTE, -0.2, { deckkraft: 0.12 });
  rr(leiste, 0, 0, BAR.w, BAR.h, 34, "#FFFFFF", 0);
  const SP = { x: 50, y: 86, w: 860, h: 46, max: 2000 };
  const pxE = (e) => SP.x + (e / SP.max) * SP.w;
  rr(leiste, SP.x, SP.y, SP.w, SP.h, SP.h / 2, "#ECEEF7", 0.1);
  textFlaeche(leiste, "WERBUNGSKOSTEN", SP.x + 4, 44, { groesse: 26, farbe: "#6A7392", anker: "links", z: 0.2 });
  const segFarben = { konto: "#A9B2FF", mittel: "#8592FF", ho: "#6F7DFF", weg: INDIGO };
  const segmente = {};
  for (const id of ["konto", "mittel", "ho", "weg"]) {
    const m = rr(leiste, 0, SP.y, 1, SP.h, 0, segFarben[id], 0.2, { eigen: true });
    m.material.transparent = false;
    m.material.depthWrite = true;
    segmente[id] = m;
  }
  const kappe = kreis(leiste, SP.x + SP.h / 2, SP.y + SP.h / 2, SP.h / 2, "#A9B2FF", 0.19);
  // Überlauf (zählt): grün über der Hürde
  const ueberlauf = rr(leiste, 0, SP.y, 1, SP.h, 0, GRUEN, 0.3, { eigen: true });
  // Schraffur „zählt nicht“ (Warum)
  const schraffur = new THREE.Group();
  schraffur.position.z = 0.35;
  leiste.add(schraffur);
  for (let i = 0; i < 26; i++) {
    const x0 = SP.x + 10 + i * 22;
    if (x0 > pxE(REGELN.pauschbetrag) - 12) break;
    poly(schraffur, [[x0, SP.y + SP.h], [x0 + 10, SP.y + SP.h], [x0 + 26, SP.y], [x0 + 16, SP.y]], "#FFFFFF", 0, { deckkraft: 0.55 });
  }
  const schraffurGrau = rr(schraffur, SP.x, SP.y, pxE(REGELN.pauschbetrag) - SP.x, SP.h, 0, TINTE, -0.01, { deckkraft: 0.35, eigen: true });
  // Hürde (rot-weiß gestreift) bei 1.230 €
  const huerde = gruppe(leiste, pxE(REGELN.pauschbetrag), 0, 0.5);
  rr(huerde, -5, 56, 16, 96, 8, TINTE, -0.05, { deckkraft: 0.15 });
  rr(huerde, -8, 52, 16, 96, 8, "#FFFFFF", 0);
  for (let i = 0; i < 4; i++) rr(huerde, -8, 64 + i * 22, 16, 11, 0, ROT, 0.05);
  rahmen(huerde, -8, 52, 16, 96, 8, 2.5, ROT, 0.08);
  kreis(huerde, 0, 50, 15, ROT, 0.1);
  kreis(huerde, 0, 50, 6, "#FFFFFF", 0.12);
  textFlaeche(leiste, "PAUSCHBETRAG 1.230 €", pxE(REGELN.pauschbetrag), 22, { groesse: 24, farbe: ROT, z: 0.2 });
  const huerdeBlitz = kreis(huerde, 0, 100, 60, ROT, -0.2, { deckkraft: 0, eigen: true });

  // ---------- Arbeitsweg: Haus – Straße – Büro ----------
  const weg = gruppe(wurzel, 0, 0, 0);
  poly(weg, [[-300, 1420], [120, 1370], [420, 1400], [760, 1360], [1380, 1400], [1380, 2300], [-300, 2300]], "#CDEBC9", 0.6);
  poly(weg, [[-300, 1480], [260, 1450], [640, 1475], [1000, 1445], [1380, 1470], [1380, 2300], [-300, 2300]], "#A7DDA9", 0.7);
  rr(weg, -300, 1560, 1680, 74, 0, FLAT.strasse, 1);
  rr(weg, -300, 1563, 1680, 4, 0, "#FFFFFF", 1.1);
  rr(weg, -300, 1627, 1680, 4, 0, "#FFFFFF", 1.1);
  for (let i = 0; i < 22; i++) rr(weg, -280 + i * 80, 1595, 40, 5, 2.5, "#FFFFFF", 1.1);
  for (const [bx, s] of [[40, 0.9], [262, 0.7], [470, 0.85], [1040, 0.8]]) {
    rr(weg, bx - 6, 1500, 12, 60, 3, "#8A5A3B", 1.4);
    kreis(weg, bx, 1484 - 10 * s, 40 * s, "#3E9C5E", 1.5);
    kreis(weg, bx - 10 * s, 1474 - 10 * s, 26 * s, "#5DBB7A", 1.55);
  }
  haus(weg, 150, 1560, 2, { breite: 140, dach: TINTE, tuer: INDIGO });
  const bueroX = (km) => 230 + km * 29.5;
  const bueroG = buero(weg, bueroX(25), 1560, 2.2, { breite: 104, hoehe: 250, farbe: "#7DB9DA" });
  const autoW = auto(weg, 300, 1606, 3, { farbe: INDIGO, laenge: 112 });
  // Klammer „Arbeitsweg“ über der Straße
  const klammer = gruppe(weg, 0, 1292, 2.5);
  const klBalken = rr(klammer, 0, -3, 1, 6, 0, TINTE, 0, { eigen: true });
  const klL = rr(klammer, -3, -16, 6, 32, 3, TINTE, 0.1, { eigen: true });
  const klR = rr(klammer, -3, -16, 6, 32, 3, TINTE, 0.1, { eigen: true });

  // ---------- fliegende Belege (Einträge) und Münzen ----------
  const fliegend = eintraege.map((e) => {
    const g = beleg({ w: e.id === "weg" ? 120 : 76, h: e.id === "weg" ? 150 : 96, farbe: INDIGO });
    g.position.z = 20;
    wurzel.add(g);
    return { ...e, g };
  });
  const burst = [];
  for (let i = 0; i < 12; i++) { const m = muenze(18, INDIGO); m.position.z = 21; wurzel.add(m); burst.push(m); }
  const ueMuenzen = [];
  for (let i = 0; i < 4; i++) { const m = muenze(16, ORANGE); m.position.z = 20; wurzel.add(m); ueMuenzen.push(m); }

  // =====================================================================================
  // Kamera: Fahrten zwischen Einstellungen (orthografisch: Blickmitte in px + Zoom)
  // =====================================================================================
  const E = {
    start: [540, 960, 1.0],
    hook: [540, 930, 1.04],
    regeln: [540, 870, 1.1],
    strasse: [560, 1260, 1.0],
    falle: [540, 900, 1.05],
    links: [500, 975, 1.06],
    rechts: [600, 1010, 1.12],
    folgen: [590, 1000, 1.1],
    weg: [560, 1270, 1.0],
    huerde: [660, 1180, 1.3],
    uebers: [300, 900, 1.45],
    ergebnis: [540, 1030, 1.0],
    warum: [540, 1100, 1.12],
    fallB: [560, 1300, 1.0],
    merk: [540, 960, 0.98],
  };
  const fahrten = [
    { t: 0, z: E.start },
    { t: 0.05, z: E.hook, d: 4.1, e: ease.inOutSine },
    { t: T("regeln:Vier") - 0.2, z: E.regeln, d: 0.9 },
    { t: T("regeln:25") - 0.25, z: E.strasse, d: 0.9 },
    { t: T("falle:Klar,") - 0.25, z: E.falle, d: 0.8 },
    { t: T("rennen:20") - 0.35, z: E.links, d: 0.8 },
    { t: T("rennen:Und") - 0.2, z: E.rechts, d: 0.8 },
    { t: T("folgen:Folg"), z: E.folgen, d: 1.6, e: ease.inOutSine },
    { t: T("wendung:Doch") - 0.15, z: E.weg, d: 0.8 },
    { t: T("wendung:222") - 0.3, z: E.huerde, d: 0.55 },
    { t: T("netto:Und") - 0.15, z: E.uebers, d: 0.8 },
    { t: T("ergebnis:Endstand:") - 0.25, z: E.ergebnis, d: 0.8 },
    { t: T("warum:Warum") - 0.15, z: E.warum, d: 0.8 },
    { t: T("ueberraschung:Und") - 0.1, z: E.fallB, d: 0.9 },
    { t: T("merksatz:Merk") - 0.15, z: E.merk, d: 1.0 },
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
      a: { name: "ÜBERSTUNDEN", farbe: ORANGE, woerter: ["Überstunden*"] },
      b: { name: "STEUERERKLÄRUNG", farbe: INDIGO, woerter: ["Steuererklärung*", "Erklärung"] },
    },
    akzent: GRUEN,
    tinte: TINTE,
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  fahrten.slice(2).forEach((f) => M.melde({ t: f.t, typ: "kamera", art: "fahrt", dauer: f.d, klang: "whoosh" }));

  // ---------- Anzeigetafel: Euro je Team, Uhr 17–21 Uhr ----------
  const fmtUhr = (s) => { const h = 17 + Math.floor(s / 3600 + 1e-6), m = Math.floor((s % 3600) / 60 + 1e-6); return `${h}:${String(m).padStart(2, "0")}`; };
  M.tafel({
    y: 166,
    links: { team: "a", einheit: "€", nk: 2, max: 200 },
    rechts: { team: "b", einheit: "€", nk: 0, max: 300 },
    werte: (t) => ({ a: Math.round(ueRoh(t) * 100) / 100, b: Math.round(erstRoh(t)) }),
    anteil: (t) => ({ a: ueRoh(t) / 230, b: erstRoh(t) / 230 }),
    uhr: { ein: "falle:Los", zeit: (t) => Math.round(stundenRoh(t) * 3600 / 60) * 60, format: fmtUhr, label: "UHR" },
  });
  hud.add(new Marke(M, { x: 74, y: 330, ein: T("rennen:20") - 0.1, aus: "ergebnis:Endstand:-0.3", texte: [{ t: T("rennen:20") - 0.1, text: "BRUTTO", farbe: TINTE }, { t: "netto:Netto", text: "NETTO", farbe: ROT }] }));

  // ---------- Hook: Titel Wort für Wort ----------
  M.titel({
    y: 352, groesse: 104, aus: "regeln:Vier-0.12",
    woerter: [
      { text: "STEUERERKLÄRUNG", ein: "hook:Steuererklärung+0.02", team: "b" },
      { umbruch: true },
      { art: "vs", ein: "hook:oder-0.02" },
      { text: "ÜBERSTUNDEN?", ein: "hook:Überstunden?-0.02", team: "a" },
      { umbruch: true },
      { text: "MEHR", ein: "hook:mehr-0.02", art: "klein" }, { text: "PRO STUNDE?", ein: "hook:pro-0.02", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips ----------
  M.chips({ y: 372, ausrichtung: "mitte", aus: "regeln:25-0.12", liste: [
    { text: "4 STUNDEN", ein: "regeln:Vier-0.03", art: "dunkel", gross: true },
    { text: "17–21 UHR", ein: "regeln:Zeit.-0.03", art: "hell", team: "a" },
  ] });
  M.chips({ y: 480, ausrichtung: "mitte", aus: "regeln:25-0.12", liste: [
    { text: "3.500 € BRUTTO", ein: "regeln:3.500-0.03", art: "voll", team: "a" },
    { text: "STEUERKLASSE 1", ein: "regeln:brutto.-0.03", art: "hell", team: "a" },
  ] });
  hud.add(new Etikett(M, { html: "25 KM ARBEITSWEG", art: "voll", farbe: "b", ein: "regeln:25-0.03", aus: "falle:Klar,-0.15", punkt: P(540, 1280), gross: true }));
  hud.add(new Etikett(M, { html: "PENDELN MIT DEM AUTO", art: "hell", farbe: "b", ein: "regeln:Arbeit.-0.05", aus: "falle:Klar,-0.15", punkt: P(540, 1380) }));

  // ---------- Denkfalle und Start ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "falle:Klar,", x: 300, y: 560, winkel: -8, farbe: "a" });
  hud.add(new Etikett(M, { html: "SICHERES GELD", art: "dunkel", ein: "falle:Sicheres", aus: "falle:Los-0.08", punkt: () => ({ x: 640, y: 600 }), gross: true, winkel: 3 }));
  const sOder = M.stempel({ text: "ODER?", ein: "falle:Oder?", aus: "falle:Los-0.06", x: 660, y: 720, winkel: 7, farbe: "weiss", textFarbe: "tinte" });
  const sLos = M.stempel({ text: "LOS GEHT'S!", ein: "falle:Los", aus: "rennen:20+0.3", x: 492, y: 640, winkel: -5, farbe: "akzent", groesse: 112 });

  // ---------- Rennen: Überstunden zählen, Belege fliegen ----------
  const stapelOben = (t) => { const n = S(t).stapel; return P(KARTE_L[0] + 395, KARTE_L[1] + 334 - Math.max(1, n) * 9.5 - 20)(t); };
  for (const [w, v] of [["rennen:20", 20.19], ["rennen:40,", 40.38], ["rennen:60.", 60.58]]) {
    hud.add(new Etikett(M, { html: `+${fmt.zahl(v, 2)} €`, art: "voll", farbe: "a", ein: w, aus: T(w) + 0.9, punkt: stapelOben, dy: -40, klang: "pop" }));
  }
  const kurz = { konto: "KONTOFÜHRUNG", mittel: "ARBEITSMITTEL", ho: "HOMEOFFICE", weg: "PENDELWEG" };
  for (const e of eintraege.slice(0, 3)) {
    const naechster = eintraege[eintraege.indexOf(e) + 1];
    hud.add(new Etikett(M, { html: `<span class="klein">${kurz[e.id]}</span><span class="betrag">+${fmt.zahl(e.betrag, 0)} €</span>`, art: "hell", farbe: "b", ein: e.tFlug, aus: e.id === "ho" ? T("rennen:Und") - 0.1 : naechster.tFlug - 0.05, punkt: P(KARTE_R[0] + 215, KARTE_R[1] + 150), klang: "pop" }));
  }
  hud.add(new Etikett(M, { html: `<span class="betrag">688 €</span><span class="klein">&nbsp;&lt; 1.230 €</span>`, art: "dunkel", ein: "rennen:Steuererklärung?", aus: "rennen:null.+0.9", punkt: P(BAR.x + pxE(1660), BAR.y + 44), gross: true }));
  M.stempel({ text: "NOCH NULL!", ein: "rennen:null.-0.04", aus: "folgen:Folg+0.2", x: 520, y: 640, winkel: -6, farbe: "b", groesse: 104 });

  // ---------- Folgen-Aufruf (ca. 20 s, vor der Wendung) ----------
  M.folgen({ ein: "folgen:Folg-0.05", dauer: 1.8, y: 800, team: "b" });

  // ---------- Wendung: Pendelweg ----------
  hud.add(new Etikett(M, { html: "25 KM × 138 TAGE × 0,38 €", art: "hell", farbe: "b", ein: "wendung:Pendelweg.", aus: "wendung:222-0.3", punkt: P(560, 1300), klang: "pop" }));
  hud.add(new Etikett(M, { html: `<span class="klein">PENDELWEG</span><span class="betrag">+${fmt.zahl(postenA.weg.betrag, 0)} €</span>`, art: "voll", farbe: "b", ein: T("wendung:Pendelweg.") + FLUG + 0.1, aus: "netto:Und-0.2", punkt: P(BAR.x + pxE(1999) - 90, BAR.y - 52), gross: true }));
  M.melde({ t: eintraege[3].tAn + 0.35, typ: "huerde", klang: "ding", text: "Hürde überwunden" });
  const sUeber = M.stempel({ text: "ÜBERHOLT!", ein: T("wendung:222") + 0.15, aus: "netto:Und-0.1", x: 470, y: 520, winkel: -7, art: "stempel", farbe: INDIGO, groesse: 112 });
  hud.add(new Etikett(M, { html: `<span class="klein">ZURÜCK</span><span class="betrag">+${A.erstattung} €</span>`, art: "voll", farbe: "akzent", ein: "wendung:Euro", aus: "netto:Und-0.2", punkt: P(BAR.x + pxE(1600), BAR.y + SP.y + SP.h + 50), gross: true, maxY: 1230 }));

  // ---------- Netto der Überstunden ----------
  hud.add(new Etikett(M, { html: `<span class="betrag">${euro(UE.brutto)}</span><span class="klein">&nbsp;BRUTTO</span>`, art: "voll", farbe: "a", ein: "netto:80", aus: "netto:Netto-0.1", punkt: P(KARTE_L[0] + 330, KARTE_L[1] - 34), gross: true }));
  hud.add(new Etikett(M, { html: `<span class="klein">LOHNSTEUER</span><span class="betrag">−${euro(UE.lohnsteuer)}</span>`, art: "voll", klasse: "minus", ein: "netto:Steuer", aus: "ergebnis:Endstand:-0.3", punkt: P(KARTE_L[0] + 150, KARTE_L[1] + 125), dy: 0 }));
  hud.add(new Etikett(M, { html: `<span class="klein">SOZIALABGABEN</span><span class="betrag">−${euro(UE.sozial)}</span>`, art: "voll", klasse: "minus", ein: "netto:Abgaben", aus: "ergebnis:Endstand:-0.3", punkt: P(KARTE_L[0] + 150, KARTE_L[1] + 205), dy: 0 }));
  M.stempel({ text: "−45 %", ein: "netto:fast-0.05", aus: "netto:Netto-0.05", x: 770, y: 680, winkel: -8, farbe: ROT, groesse: 120 });
  hud.add(new Etikett(M, { html: `<span class="klein">NETTO</span><span class="betrag">${euro(UE.netto)}</span>`, art: "voll", farbe: "a", ein: "netto:44.", aus: "ergebnis:Endstand:-0.3", punkt: P(KARTE_L[0] + 330, KARTE_L[1] - 34), gross: true }));

  // ---------- Ergebnis: Bilanzkarte pro Stunde ----------
  M.bilanz({
    y: 360, ein: "ergebnis:Endstand:-0.15", aus: "warum:Warum-0.15", titel: "Endstand · Euro pro Stunde",
    zeilen: [
      { label: "STEUERERKLÄRUNG", zusatz: "222 € ÷ 4 h", wert: A.proStunde, einheit: "€/h", nk: 2, team: "b", ein: "ergebnis:55" },
      { label: "ÜBERSTUNDEN", zusatz: "44,45 € ÷ 4 h", wert: UE.proStunde, einheit: "€/h", nk: 2, team: "a", ein: "ergebnis:11." },
    ],
    differenz: { label: "FAKTOR", wert: Z.faktorA, einheit: "×", nk: 1, ein: "ergebnis:Fünfmal" },
    sieger: { text: "STEUERERKLÄRUNG GEWINNT", team: "b", ein: "ergebnis:gewinnt." },
  });

  M.stempel({ text: "÷ 4 STUNDEN", ein: "ergebnis:pro-0.05", aus: "ergebnis:11.-0.12", x: 492, y: 820, winkel: -4, farbe: "tinte", groesse: 76 });

  // ---------- Warum? Pauschbetrag und Steuersatz ----------
  M.formel({
    y: 380, aus: "warum:Davon-0.12", titel: "Werbungskosten − Pauschbetrag (€)", groesse: 72,
    teile: [
      { text: "1.999", ein: "warum:Die", team: "b" },
      { text: "−", ein: "warum:ersten" },
      { text: "1.230", ein: "warum:1.230" },
      { text: "=", ein: "warum:Erst" },
      { text: "769", einheit: "€", ein: "warum:Rest", art: "erg" },
    ],
  });
  M.formel({
    y: 380, aus: "ueberraschung:Und-0.12", titel: "Davon zurück · Steuersatz 28,9 %", groesse: 72,
    teile: [
      { text: "769", ein: "warum:Davon", team: "b" },
      { text: "×", ein: "warum:kommen" },
      { text: "28,9 %", ein: "warum:30" },
      { text: "=", ein: "warum:Prozent" },
      { text: "222", einheit: "€", ein: "warum:zurück.", art: "erg" },
    ],
  });
  hud.add(new Etikett(M, { html: "ZÄHLT NICHT", art: "dunkel", ein: "warum:Pauschbetrag.", aus: "ueberraschung:Und-0.15", punkt: P(BAR.x + pxE(615), BAR.y + SP.y + SP.h + 44), maxY: 1240 }));
  hud.add(new Etikett(M, { html: "ZÄHLT", art: "voll", farbe: "akzent", ein: "warum:Rest", aus: "ueberraschung:Und-0.15", punkt: P(BAR.x + pxE(1615), BAR.y + SP.y + SP.h + 44), maxY: 1240 }));
  M.melde({ t: "warum:Pauschbetrag.", typ: "schraffur", klang: "klick", text: "Pauschbetrag zählt nicht" });

  // ---------- Zweite Überraschung: 5 km ohne Extras, dann 16 km ----------
  M.stempel({ text: "NEUER FALL", ein: "ueberraschung:Verrückte:-0.05", aus: "ueberraschung:Bei+0.4", x: 492, y: 560, winkel: -5, farbe: "tinte", groesse: 96 });
  const kmZaehler = M.zaehler({ ein: "ueberraschung:Bei-0.05", aus: "merksatz:Merk-0.2", wert: (t) => Math.round(kmRoh(t)), nk: 0, einheit: "km", max: 30, team: "b", art: "voll", punkt: (t) => P((150 + bueroX(S(t).km)) / 2, 1340)(t), minY: 300 });
  hud.add(new Etikett(M, { html: "KEIN HOMEOFFICE · KEINE EXTRAS", art: "dunkel", ein: "ueberraschung:Extras-0.1", aus: "ueberraschung:Erst-0.15", punkt: P(540, 1040), klang: "pop" }));
  M.stempel({ text: "0 € ZURÜCK", ein: "ueberraschung:null.-0.04", aus: "ueberraschung:Überstunden.+0.1", x: 470, y: 560, winkel: -6, farbe: ROT, groesse: 104 });
  M.stempel({ text: "ÜBERSTUNDEN VORN!", ein: "ueberraschung:gewinnen-0.05", aus: "ueberraschung:Erst-0.1", x: 492, y: 700, winkel: 5, farbe: "a", groesse: 84 });
  hud.add(new Etikett(M, { html: "AB 16 KM", art: "voll", farbe: "b", ein: "ueberraschung:16", aus: "merksatz:Merk-0.2", punkt: P(540, 1040), gross: true }));
  const sDreht = M.stempel({ text: "DREHT SICH!", ein: "ueberraschung:dreht-0.04", aus: "merksatz:Merk-0.1", x: 492, y: 600, winkel: -6, art: "stempel", farbe: INDIGO, groesse: 104 });

  // ---------- Merksatz ----------
  M.pointe({ woerter: [{ text: "DER", ein: "merksatz:Der" }, { text: "PAUSCHBETRAG", ein: "merksatz:Pauschbetrag" }, { umbruch: true }, { text: "IST DIE", ein: "merksatz:ist" }, { text: "HÜRDE.", ein: "merksatz:Hürde.", farbe: "b" }], aus: "merksatz:Dein-0.12", y: 520, groesse: 120 });
  M.pointe({ woerter: [{ text: "DEIN", ein: "merksatz:Dein" }, { text: "ARBEITSWEG", ein: "merksatz:Arbeitsweg", farbe: "b" }, { umbruch: true }, { text: "ENTSCHEIDET.", ein: "merksatz:entscheidet.", farbe: "akzent" }], aus: "schluss:Was-0.1", y: 520, groesse: 120 });
  M.melde({ t: "merksatz:Hürde.", typ: "pointe-wort", klang: "klick", text: "HÜRDE." });
  M.melde({ t: "merksatz:entscheidet.", typ: "pointe-wort", klang: "akzent", text: "ENTSCHEIDET." });

  // ---------- Untertitel Wort für Wort (Stil „kontur“, Entscheidung des Inhabers 01.11.) ----------
  M.untertitel({ stil: "kontur", versteckt: [[T("schluss:Kommentare.>") + 0.5, DAUER + 1]] });

  // Flug- und Burst-Ereignisse (Bild und Klang)
  for (const e of eintraege) M.melde({ t: e.tFlug, typ: "beleg", dauer: FLUG, klang: "whoosh", text: kurz[e.id] });
  M.melde({ t: t222, typ: "muenzen", klang: "ding", text: "Münzen" });
  for (const [w] of [["rennen:20"], ["rennen:40,"], ["rennen:60."], ["netto:80"]]) M.melde({ t: T(w) - 0.35, typ: "muenze", klang: false, text: "Münze" });

  // =====================================================================================
  // Weltzustand je Bild
  // =====================================================================================
  const ueFlug = [T("rennen:20"), T("rennen:40,"), T("rennen:60."), T("netto:80")];
  const setzeWelt = (t) => {
    const s = S(t);
    const imLoop = t >= tSchleife;
    const tau = s.tau; // Zeit für periodische Bewegungen: spult in der Schleife auf 0 zurück (letztes Bild = erstes Bild)
    // Nacht
    ZL.setzeNacht(s.nacht);
    ZR.setzeNacht(s.nacht);
    for (const n of nachtMats) n.m.color.copy(n.a).lerp(n.b, s.nacht * 0.85);
    lampe.kegel.material.opacity = 0.12 + 0.3 * s.nacht;
    glowL.material.opacity = 0.15 + 0.45 * s.nacht;
    glowR.material.opacity = 0.15 + 0.45 * s.nacht;
    // Uhr an der Wand (vor dem Rennen 16:58 → 17:00)
    uhrL.setze(17 + s.h - s.vor * 0.033);
    // Figuren
    const rennt = clamp(fortschritt(t, tLos - 0.3, tLos + 0.2)) * (1 - fortschritt(t, T("netto:80"), T("netto:80") + 0.5));
    figL.setze(tau, { tippen: 0.45 + 0.55 * rennt, nicken: 0 });
    const jubel = clamp(Math.sin(clamp((t - t222) / 1.6) * Math.PI)) * (t >= t222 && t < t222 + 1.6 ? 1 : 0);
    figR.setze(tau, { schreiben: 0.5 + 0.5 * rennt, jubeln: jubel, phase: 0.37 });
    pflL.setze(tau);
    pflR.setze(tau, 1.3);
    // Bildschirm links: Zeile wandert
    const zeile = Math.floor(tau * 1.6) % 5;
    cursorL.position.y = -(zeile * 15);
    zeilenL.forEach((z, i) => { z.scale.x = 0.6 + 0.4 * ((Math.sin(tau * 2.2 + i * 1.7) + 1) / 2); });
    // Laptop rechts: Felder füllen sich mit den Einträgen
    ["konto", "mittel", "ho", "weg"].forEach((id, i) => {
      const p = postenA[id].betrag > 0 ? clamp(s[id] / postenA[id].betrag) : 0;
      felder[i].scale.x = Math.max(0.001, p);
    });
    // Münzstapel
    stapel.setze(s.stapel);
    // Münzen fliegen vom Bildschirm auf den Stapel (je Stunde)
    ueMuenzen.forEach((m, i) => {
      const t0 = ueFlug[i] - 0.4, d = t - t0;
      m.visible = d >= 0 && d < 0.45 && !imLoop;
      if (!m.visible) return;
      const k = d / 0.45;
      const x0 = KARTE_L[0] + 300, y0 = KARTE_L[1] + 230, x1 = KARTE_L[0] + 395, y1 = KARTE_L[1] + 334 - (i + 1) * 2 * 9.5;
      setzePx(m, lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(k * Math.PI) * 70, 20);
      m.scale.setScalar(1 - 0.3 * k);
    });
    // Leiste: Segmente
    let x = SP.x;
    for (const id of ["konto", "mittel", "ho", "weg"]) {
      const b = (Math.max(0, s[id]) / SP.max) * SP.w;
      segmente[id].position.x = x;
      segmente[id].scale.x = Math.max(0.001, b);
      segmente[id].visible = b > 0.5;
      x += b;
    }
    kappe.visible = x > SP.x + 1;
    const xH = pxE(REGELN.pauschbetrag);
    const ue = Math.max(0, x - xH);
    ueberlauf.position.x = xH;
    ueberlauf.scale.x = Math.max(0.001, ue);
    ueberlauf.visible = ue > 0.5;
    const blitz = Math.max(0, 1 - Math.abs(t - (eintraege[3].tAn + 0.35)) / 0.3);
    huerdeBlitz.material.opacity = 0.35 * blitz;
    huerde.scale.setScalar(1 + 0.12 * blitz);
    // Schraffur „zählt nicht“ im Warum
    const sch = clamp(fortschritt(t, T("warum:Pauschbetrag.") - 0.1, T("warum:Pauschbetrag.") + 0.3)) * (1 - fortschritt(t, T("ueberraschung:Und") - 0.2, T("ueberraschung:Und") + 0.1));
    schraffur.visible = sch > 0.01;
    schraffur.scale.x = Math.max(0.001, ease.outCubic(sch));
    schraffur.position.x = SP.x * (1 - ease.outCubic(sch));
    // Belege fliegen vom Küchentisch in die Leiste
    for (const f of fliegend) {
      const d = t - f.tFlug;
      f.g.visible = d >= 0 && d <= FLUG && !imLoop;
      if (!f.g.visible) continue;
      const k = ease.inOutSine(d / FLUG);
      const x0 = f.id === "weg" ? 560 : KARTE_R[0] + 70, y0 = f.id === "weg" ? 1300 : KARTE_R[1] + 290;
      const x1 = BAR.x + pxE(f.summe - f.betrag / 2) - 38, y1 = BAR.y + SP.y - 40;
      setzePx(f.g, lerp(x0, x1, k), lerp(y0, y1, k) - Math.sin(k * Math.PI) * (f.id === "weg" ? 160 : 120), 20 + f.summe * 0.001);
      f.g.rotation.z = Math.sin(k * Math.PI * 2) * 0.35;
      f.g.scale.setScalar(lerp(1, 0.55, k));
    }
    // Münz-Burst bei „222“: Münzen fliegen aus dem Überlauf hoch zur Tafel (STEUERERKLÄRUNG)
    regie.anwenden(t);
    const zielW = new THREE.Vector3((790 / 1080) * 2 - 1, 1 - (250 / 1920) * 2, 0).unproject(W.kamera);
    const zielPx = { x: zielW.x + 540, y: 960 - zielW.y };
    burst.forEach((m, i) => {
      const d = t - (t222 - 0.05 + i * 0.045);
      m.visible = d >= 0 && d < 0.75 && !imLoop;
      if (!m.visible) return;
      const k = ease.inOutSine(d / 0.75);
      const x0 = BAR.x + pxE(1250 + ((i * 97) % 700)), y0 = BAR.y + SP.y + SP.h / 2;
      const seit = ((i % 2) * 2 - 1) * (60 + (i % 4) * 30);
      setzePx(m, lerp(x0, zielPx.x, k) + Math.sin(k * Math.PI) * seit, lerp(y0, zielPx.y, k) - Math.sin(k * Math.PI) * 120, 21 + i * 0.01);
      m.rotation.z = d * (i % 2 ? 5 : -5);
      m.scale.setScalar((1.6 - 0.6 * k) / W.kamera.zoom);
    });
    // Arbeitsweg: Büro rückt mit den Kilometern, Auto pendelt, Klammer
    const bx = bueroX(s.km);
    setzePx(bueroG, bx, 1560, 2.2);
    const hausX = 150, ziel = bx - 70;
    const periode = 2.6 + s.km * 0.06;
    const ph = ((tau + 0.3) % periode) / periode;
    const hin = ph < 0.5;
    const k = ease.inOutSine(hin ? ph * 2 : (1 - ph) * 2);
    setzePx(autoW.g, lerp(hausX + 70, ziel, k), hin ? 1606 : 1580, 3);
    autoW.g.scale.x = hin ? 1 : -1;
    autoW.raeder.forEach((r) => { r.rotation.z = -tau * 9 * (hin ? 1 : -1); });
    const fenster = [[T("regeln:25") - 0.2, T("falle:Klar,")], [T("wendung:Doch"), T("wendung:222")], [T("ueberraschung:Bei") - 0.3, T("merksatz:Merk")]];
    let kl = 0;
    for (const [a, b] of fenster) kl = Math.max(kl, clamp(fortschritt(t, a, a + 0.3)) * (1 - fortschritt(t, b - 0.2, b + 0.1)));
    for (const o of [klBalken, klL, klR]) { o.material.opacity = kl; o.visible = kl > 0.01; }
    klBalken.position.x = hausX;
    klBalken.scale.x = Math.max(1, bx - hausX);
    klL.position.x = hausX;
    klR.position.x = bx;
  };
  const post = { vignette: 0.06, koernung: 0.006 };
  const welt = { szene: W.szene, kamera: W.kamera, post, update(t) { setzeWelt(t); regie.anwenden(t); W.parallax(); } };
  for (const s of [sKlar, sOder, sLos, sUeber, sDreht]) regie.stoss({ t: s.ein + 0.1, staerke: 0.7 });

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
  window.modell = { ue: UE.netto, erstattungA: A.erstattung, erstattungB: B.erstattung, proStunde: [UE.proStunde, A.proStunde] };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
