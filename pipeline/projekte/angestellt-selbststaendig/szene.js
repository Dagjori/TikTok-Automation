// „Angestellt oder selbstständig: Wer hat bei gleichen 60.000 € mehr netto?“ · Simulierbar · Stil 18 Dunkles Studio (Produktlicht), belebte Szene
// Zwei Mini-Dioramen im schwarzen Studio: links Büro (JONAS, Blau), rechts Homeoffice (SARA, Orange), je mit Schreibtisch, Stuhl, Modellfigur,
// Monitor bzw. Laptop, Lampe, Fenster, einem Münzstapel (1 Münze = 1.000 €). Hinten die Balkenwaage auf einem Sockel, ganz hinten die Kalenderwand.
// Steuerblätter, Rechnungsstapel, fliegende Münzen und ein gesichtsloser Ärmel (Arbeitgeber) sind die Handlung.
// Alle Zahlen kommen aus pipeline/sim/angestellt_selbststaendig.mjs (Modellrechnung 2026). Alles ist eine reine Funktion von t.
import * as THREE from "three";
import { SimBuehne, GRADING, rigStudio, spiegelBoden, lichtKegel, staub, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { hohlkehle, wandLicht, muenzStapel, sockel, waage, diorama, schreibtisch, buerostuhl, modellFigur, monitor, laptop, tischlampe, pflanze, tasse, papierStapel, papierBlatt, schwarm, aermel, kalenderGitter } from "../../engine/stil_studio.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, keyframes } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/angestellt_selbststaendig.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const AUS = new Set((Q.get("aus") || "").split(","));
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: LED-Kanten, Hemd/Bluse, Lichtflecke, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb.
const BLAU = "#3D8BFF"; // JONAS (angestellt)
const ORANGE = "#FF8A3D"; // SARA (selbstständig)
const ELFENBEIN = "#ECE6DA";
const Z = videoZahlen();
const euroK = (k) => `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.round(k))} €`;

async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); } catch { timing = schaetzeTiming(skript); }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "JONAS", farbe: BLAU, woerter: ["Jonas*"] },
      b: { name: "SARA", farbe: ORANGE, woerter: ["Sara*", "Saras"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // =====================================================================================
  // Zeitachse (alles an Wortzeiten)
  // =====================================================================================
  const t = {
    jonas: T("hook:Angestellt"), sara: T("hook:selbstständig"), beide: T("hook:Beide"), wer: T("hook:Wer"),
    rJ: T("regeln:Jonas"), rS: T("regeln:Sara"), rBeide: T("regeln:Beide"), rRente: T("regeln:Rente"),
    klar: T("falle:Klar"), oder: T("falle:Oder"),
    runde: T("rennen:Erste"), steuer: T("rennen:Steuer"), j9: T("rennen:9.000"), s6: T("rennen:6.000"), vorn: T("rennen:vorn"),
    folg: T("folgen:Folg"),
    doch: T("wendung1:Doch"), sozial: T("wendung1:Sozialabgaben"), bei: T("wendung1:Bei"), haelfte: T("wendung1:Hälfte"), saraAllein: T("wendung1:Sara"), allein: T("wendung1:allein"),
    kk: T("wendung2:Krankenkasse"), s105: T("wendung2:10.500"), j525: T("wendung2:Hälfte"), rente: T("wendung2:Rente"), s1116: T("wendung2:dasselbe"), j558: T("wendung2:dasselbe+0.4"),
    strich: T("wendung2:Jonas#2-0.5"), s2418: T("wendung2:Jonas#2-0.3"), j1305: T("wendung2:Jonas#2-0.1"), vorbei: T("wendung2:vorbei"),
    end: T("ergebnis:Endstand"), e37: T("ergebnis:37.500"), e29: T("ergebnis:30.000"), e77: T("ergebnis:8.000"), e647: T("ergebnis:650"),
    warum: T("warum:Warum"), ag: T("warum:13.000"), sv: T("warum:3.000"), svWort: T("warum:Steuervorteil"),
    und: T("ueberraschung:Und"), gleich: T("ueberraschung:Gleichstand"), g767: T("ueberraschung:77.000"), ohne: T("ueberraschung:Ohne"), urlaub: T("ueberraschung:Urlaub"), krank: T("ueberraschung:Krankentage"),
    s4581: T("ueberraschung:46"), j2874: T("ueberraschung:29"),
    merk: T("merksatz:Merke"), viertel: T("merksatz:Viertel"), schluss: T("schluss:Was"),
  };
  const fenster = (x, a, b, rein = 0.4, raus = 0.5) => ease.inOutSine(fortschritt(x, a, a + rein)) * (1 - ease.inOutSine(fortschritt(x, b - raus, b)));
  const puls = (x, t0, d = 0.7) => { const k = fortschritt(x, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const rampe = (x, a, b, e = ease.inOutSine) => e(fortschritt(x, a, b));

  // Zahlungen (in Tausend Euro = Münzen): Münzen fliegen vom Stapel in Steuerblatt bzw. Rechnungsstapel
  const ZAHL_J = [
    { t0: t.j9 - 0.1, dur: 1.15, k: Z.J.est / 1000, ziel: "blattJ" },
    { t0: t.j525, dur: 0.9, k: Z.J.kv / 1000, ziel: "pileJ" },
    { t0: t.j558, dur: 0.9, k: Z.J.rv / 1000, ziel: "pileJ" },
    { t0: t.j1305 - 0.2, dur: 0.9, k: (Z.J.av + Z.J.pv) / 1000, ziel: "pileJ" },
  ];
  const ZAHL_S = [
    { t0: t.s6 - 0.05, dur: 1.0, k: Z.S.est / 1000, ziel: "blattS" },
    { t0: t.s105 - 0.1, dur: 1.0, k: Z.S.kv / 1000, ziel: "pileS" },
    { t0: t.s1116 - 0.1, dur: 1.0, k: Z.S.rv / 1000, ziel: "pileS" },
    { t0: t.s2418 - 0.2, dur: 0.9, k: Z.S.pv / 1000, ziel: "pileS" },
  ];
  const abzug = (x, liste) => liste.reduce((a, e) => a + e.k * ease.inOutSine(fortschritt(x, e.t0, e.t0 + e.dur)), 0);
  const kalTage = (() => { // Saras verlorene Tage (Index in Kacheln, ohne Wiederholung, verstreut): 7 Feiertage, 30 Urlaub, 14,6 Krank
    let s = 12345; const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    const idx = Array.from({ length: 261 }, (_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
    return idx;
  })();
  const ordnung = new Array(261); kalTage.forEach((tile, rang) => { ordnung[tile] = rang; }); // rang 0…: Feiertage 0–6, Urlaub 7–36, Krank 37–51 (Rang 51 = 0,6)

  // Zustand der Welt (nur Zahlen; die Schleife lässt alles weich zum Anfangszustand zurückgleiten)
  const zustandRoh = (x) => {
    const ju = 60 - abzug(x, ZAHL_J);
    const su = 60 - abzug(x, ZAHL_S) + (Z.J.netto - Z.S.netto) / 1000 * rampe(x, t.g767 + 0.1, t.g767 + 2.4);
    const bJ = rampe(x, t.steuer, t.steuer + 0.9) * (1 - rampe(x, t.vorn + 0.4, t.vorn + 1.2));
    const bS = rampe(x, t.steuer + 0.15, t.steuer + 1.05) * (1 - rampe(x, t.vorn + 0.4, t.vorn + 1.2));
    const pJ = rampe(x, t.sozial, t.sozial + 0.7) * 0.24 * (1 - 0.5 * rampe(x, t.haelfte + 0.3, t.haelfte + 1.1)) * (1 - rampe(x, t.end - 0.2, t.end + 0.6));
    const pS = rampe(x, t.sozial + 0.15, t.sozial + 0.85) * 0.22 * (1 - rampe(x, t.end - 0.2, t.end + 0.6));
    // Ärmel: Hand-Position (Welt), kommt zum Rechnungsstapel und holt die Hälfte; später legt er den Arbeitgeber-Stapel ab
    const a1 = rampe(x, t.bei - 0.3, t.bei + 0.8) * (1 - rampe(x, t.haelfte + 1.0, t.haelfte + 2.0));
    const a2 = rampe(x, t.warum + 0.4, t.ag - 0.2) * (1 - rampe(x, t.ag + 1.6, t.ag + 2.5));
    const aermelAn = Math.max(a1, a2);
    const ziel = a2 > 0.001 && a1 < 0.001 ? 1 : 0; // 0 = Rechnungsstapel, 1 = Arbeitgeber-Stapel
    const griff = rampe(x, t.haelfte - 0.1, t.haelfte + 0.5) * (1 - rampe(x, t.haelfte + 1.1, t.haelfte + 1.7));
    const agS = Z.J.agAnteile / 1000 * rampe(x, t.ag - 0.1, t.ag + 1.9, ease.linear) * (1 - rampe(x, t.merk - 0.5, t.merk + 0.9));
    const svS = Z.steuerVorteilS / 1000 * rampe(x, t.sv - 0.2, t.sv + 1.0, ease.linear) * (1 - rampe(x, t.merk - 0.5, t.merk + 0.9));
    const kal = rampe(x, t.ohne - 0.8, t.ohne - 0.1);
    const kalFeier = rampe(x, t.ohne + 0.0, t.ohne + 0.7), kalUrl = rampe(x, t.urlaub - 0.1, t.urlaub + 1.5), kalKrank = rampe(x, t.krank - 0.1, t.krank + 1.3);
    // Blickrichtung der Figuren
    const blick = fenster(x, t.rBeide - 0.1, t.rRente + 0.6, 0.4, 0.5);
    const hebe = 0.5 * puls(x, t.jonas + 0.0, 0.8) + 0.5 * puls(x, t.sara + 0.0, 0.8);
    return {
      ju, su, bJ, bS, pJ, pS, aermelAn, ziel, griff, agS, svS, kal, kalFeier, kalUrl, kalKrank, blick, hebe,
      ledJ: 1 + 1.3 * puls(x, 0.5, 0.9) + 1.0 * puls(x, T("ergebnis:Jonas#2"), 0.8) + 0.9 * puls(x, T("folgen:nichts"), 0.8) + 1.5 * puls(x, t.jonas, 0.9) + 1.2 * puls(x, t.rJ, 0.9) + 1.0 * puls(x, T("regeln:60.000"), 0.8) + 1.2 * puls(x, t.rBeide, 0.9) + 1.2 * puls(x, T("rennen:Jonas"), 0.9) + 1.4 * puls(x, t.j9, 0.9) + 1.3 * puls(x, t.bei, 0.9) + 1.0 * puls(x, t.j525, 0.8) + 1.0 * puls(x, t.j558, 0.8) + 1.4 * puls(x, t.j1305, 0.9) + 1.5 * puls(x, t.vorbei, 1.0) + 1.5 * puls(x, t.e37, 1.0) + 1.0 * puls(x, t.warum, 0.9) + 1.2 * puls(x, t.ag, 0.9) + 1.0 * puls(x, t.j2874, 0.9) + 1.2 * puls(x, t.merk, 1.0),
      ledS: 1 + 1.0 * puls(x, T("ergebnis:Sara"), 0.8) + 0.9 * puls(x, T("folgen:nichts"), 0.8) + 1.3 * puls(x, 0.5, 0.9) + 1.5 * puls(x, t.sara, 0.9) + 1.2 * puls(x, t.rS, 0.9) + 1.0 * puls(x, T("regeln:60.000#2"), 0.8) + 1.2 * puls(x, t.rBeide, 0.9) + 1.2 * puls(x, T("rennen:Sara"), 0.9) + 1.4 * puls(x, t.s6, 0.9) + 1.5 * puls(x, t.vorn, 1.0) + 1.3 * puls(x, t.saraAllein, 0.9) + 1.0 * puls(x, t.s105, 0.8) + 1.0 * puls(x, t.s1116, 0.8) + 1.4 * puls(x, t.s2418, 0.9) + 1.2 * puls(x, t.e29, 0.9) + 1.2 * puls(x, t.svWort, 0.9) + 1.5 * puls(x, t.g767, 1.0) + 1.4 * puls(x, t.s4581, 1.0) + 1.2 * puls(x, t.merk + 0.5, 1.0),
      ledU: 1 + 1.0 * puls(x, t.wer, 0.9) + 1.2 * puls(x, t.oder, 1.0) + 1.0 * puls(x, t.vorn + 0.3, 1.0) + 1.0 * puls(x, t.vorbei + 0.2, 1.0) + 1.0 * puls(x, t.e77, 1.0) + 1.0 * puls(x, t.gleich + 2.0, 1.0),
      spotJ: 0.45 + 1.0 * fenster(x, t.rJ - 0.2, t.rS - 0.1, 0.4, 0.5) + 0.7 * fenster(x, t.j9 - 0.5, t.j9 + 1.6) + 1.1 * fenster(x, t.doch - 0.2, t.saraAllein - 0.1, 0.5, 0.5) + 0.9 * fenster(x, t.j525 - 0.5, t.j525 + 1.2) + 0.9 * fenster(x, t.e37 - 0.2, t.e29 - 0.1, 0.4, 0.5) + 1.0 * fenster(x, t.warum, t.sv - 0.6, 0.6, 0.6) + 0.5 * fenster(x, t.merk - 0.3, t.merk + 4.4, 0.5, 1.0),
      spotS: 0.45 + 1.0 * fenster(x, t.rS - 0.1, t.rBeide - 0.2, 0.4, 0.5) + 0.7 * fenster(x, t.s6 - 0.4, t.vorn + 0.8) + 1.0 * fenster(x, t.saraAllein - 0.1, t.kk - 0.3, 0.4, 0.5) + 0.9 * fenster(x, t.s105 - 0.5, t.s105 + 1.3) + 0.9 * fenster(x, t.e29 - 0.1, t.e77 - 0.1, 0.4, 0.5) + 1.0 * fenster(x, t.svWort - 0.2, t.und, 0.5, 0.5) + 1.1 * fenster(x, t.gleich - 0.2, t.ohne - 0.4, 0.5, 0.6) + 0.5 * fenster(x, t.merk - 0.3, t.merk + 4.4, 0.5, 1.0),
      spotU: 0.55 + 0.9 * fenster(x, t.klar - 0.3, t.oder + 1.0, 0.7, 0.6) + 0.7 * fenster(x, t.vorbei - 0.2, t.end + 1.0) + 0.6 * fenster(x, t.gleich + 1.8, t.ohne - 0.3),
      kuehl: fenster(x, t.doch - 0.1, t.kk - 0.2, 0.6, 0.8), // kühler Lichtwechsel bei der Wendung
      blitz: 0.6 * Math.exp(-(((x - t.vorbei) / 0.16) ** 2)) + 0.8 * Math.exp(-(((x - t.e37) / 0.16) ** 2)) + 0.6 * Math.exp(-(((x - (t.g767 + 2.3)) / 0.16) ** 2)),
      glanz: fenster(x, t.e37 - 0.1, t.e37 + 2.4, 0.3, 1.2),
    };
  };
  const zustand = M.wert(zustandRoh);

  // =====================================================================================
  // Szene
  // =====================================================================================
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#050608");
  rigStudio(szene, buehne.renderer, {
    ziel: [0, 0.9, 0],
    softbox: { farbe: "#EAF1FF", staerke: 5, breite: 3.6, hoehe: 1.2, pos: [3.8, 4.4, 4.2] }, fuell: 0.2, umgebungsStaerke: 0.7,
    oben: { farbe: "#F4F8FF", staerke: 62, pos: [0.2, 9.5, 2.2], winkel: 0.5, rand: 0.6, schatten: SCHATTEN },
    kanten: [{ farbe: "#9EC6FF", staerke: 2.4, pos: [-6, 3.5, -5] }, { farbe: "#FFD2B0", staerke: 2.4, pos: [6, 3, -6] }],
  });
  szene.add(hohlkehle({ breite: 44, tiefe: 30, hoehe: 17, radius: 5, farbe: "#0B0C10", rau: 0.38 }));
  if (!AUS.has("spiegel")) { const sp = spiegelBoden({ breite: 30, tiefe: 16, staerke: 0.28, streckung: 1.2, unschaerfe: 1.4, fresnel: 0.5, aufloesung: 0.28, verzerrung: 0.3 }); sp.position.z = -1; szene.add(sp); }
  const wl = wandLicht({ breite: 10, hoehe: 7, farbe: "#242C42", staerke: 0.8 }); wl.position.set(0, 5.5, -14.85); szene.add(wl);
  if (!AUS.has("kegel")) {
    const k = lichtKegel({ hoehe: 9.4, radiusOben: 0.25, radiusUnten: 3.4, farbe: "#EEF4FF", staerke: 0.085, weich: 1.2, streifen: 0.6 });
    k.position.set(0.2, 9.5, 2.2); szene.add(k);
    szene.add(staub({ anzahl: 420, bereich: [7, 5, 7], mitte: [0, 2.5, 0], groesse: 0.012, staerke: 1.6, aussen: 0.0, kegel: { spitze: [0.2, 9.5, 2.2], richtung: [0, -1, 0], winkel: 0.42 } }));
  }
  const spot = (farbe, pos, ziel, winkel) => { const s = new THREE.SpotLight(farbe, 0, 0, winkel, 0.7, 2); s.position.set(...pos); s.target.position.set(...ziel); szene.add(s, s.target); return s; };
  const spotJ = spot("#9CC4FF", [-1.9, 6.0, 4.2], [-1.0, 0.7, 0.2], 0.3), spotS = spot("#FFC08A", [1.9, 6.0, 4.2], [1.0, 0.7, 0.2], 0.3);
  const spotU = spot("#FFF4E6", [0.3, 7.0, 2.5], [0, 1.6, -1.7], 0.26);
  const blitz = new THREE.PointLight("#FFFFFF", 0, 0, 2); blitz.position.set(0, 2.0, 1.2); szene.add(blitz);

  // ---------- Dioramen ----------
  const JX = -1.0, SX = 1.0, DESK = 0.5; // Weltposition der Plattenmitten, Schreibtischoberkante (Welt)
  const bauPlatz = (seite) => {
    const jonas = seite === "J", farbe = jonas ? BLAU : ORANGE;
    const g = new THREE.Group(); g.position.x = jonas ? JX : SX;
    const dio = diorama({ farbe, fenster: jonas ? "#BFD4FF" : "#FFD9A8", fensterStaerke: 0.62, wand: jonas ? "#1A1E27" : "#221D1B", boden: jonas ? "#252A33" : "#2B2723" });
    g.add(dio);
    const tisch = schreibtisch({ breite: 1.4, tiefe: 0.46, hoehe: 0.4, farbe: jonas ? "#6F6A62" : "#8A6B4E" }); tisch.position.set(0, 0.1, 0.2); g.add(tisch);
    const stuhl = buerostuhl({ farbe: jonas ? "#1D2230" : "#3A2F2A" }); stuhl.position.set(0, 0.1, -0.15); g.add(stuhl);
    const fig = modellFigur({ hemd: farbe, hose: jonas ? "#1F232C" : "#2A2522", frisur: jonas ? "kurz" : "dutt", haar: jonas ? "#2B241F" : "#4A3022", tischY: 0.4, tischZ: 0.33 }); fig.position.set(0, 0.1, -0.15); g.add(fig);
    const sgn = jonas ? 1 : -1; // Monitor/Laptop auf der Außenseite zum Stapel hin
    if (jonas) {
      const mon = monitor({ breite: 0.4, hoehe: 0.24 }); mon.position.set(0.34, 0.5, 0.26); mon.rotation.y = -0.4; g.add(mon);
      const lampe = tischlampe({ farbe: "#FFE2B8", staerke: 2.4 }); lampe.position.set(-0.62, 0.5, 0.1); g.add(lampe);
      const tasseJ = tasse({ farbe: "#ECE6DA" }); tasseJ.position.set(-0.2, 0.5, 0.36); g.add(tasseJ);
      g.lampe = lampe;
    } else {
      const lap = laptop({ breite: 0.38, tiefe: 0.26 }); lap.position.set(-0.34, 0.5, 0.3); lap.rotation.y = 0.35; g.add(lap);
      const pf = pflanze(); pf.position.set(0.64, 0.5, 0.12); g.add(pf);
      const ta = tasse({ farbe: "#E8D5C0" }); ta.position.set(0.2, 0.5, 0.38); g.add(ta);
      const lampe = tischlampe({ farbe: "#FFD0A0", staerke: 2.0 }); lampe.position.set(0.5, 0.5, 0.05); lampe.scale.setScalar(0.85); g.add(lampe);
      g.lampe = lampe;
    }
    // Münzstapel (1 Münze = 1.000 €) neben der Tastatur Richtung Mitte
    const stapel = muenzStapel({ art: jonas ? "silber" : "kupfer", radius: 0.085, dicke: 0.0095, max: 64, unordnung: 0.012, seed: jonas ? 11 : 5, fallHoehe: 0.45 });
    stapel.position.set(jonas ? 0.58 : -0.58, 0.5, 0.2); g.add(stapel);
    // Rechnungsstapel (Sozialabgaben) außen
    const pile = papierStapel({ farbe, breite: 0.2, laenge: 0.26 }); pile.position.set(jonas ? -0.3 : 0.3, 0.5, 0.3); g.add(pile);
    // Münzstapel vorn (Warum): Arbeitgeberanteil bzw. Steuervorteil
    const vorn = muenzStapel({ art: jonas ? "silber" : "kupfer", radius: 0.085, dicke: 0.0095, max: 16, unordnung: 0.01, seed: jonas ? 3 : 9, fallHoehe: 0.45 });
    vorn.position.set(jonas ? -0.62 : 0.62, 0.1, 0.54); g.add(vorn);
    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.02, 32), new THREE.MeshStandardMaterial({ color: "#0C0D11", roughness: 0.3, metalness: 0.4 })); sock.position.set(jonas ? -0.62 : 0.62, 0.11, 0.54); g.add(sock);
    vorn.position.y = 0.12;
    szene.add(g);
    return { g, dio, fig, stapel, pile, vorn, farbe, sgn, wx: g.position.x };
  };
  const PJ = bauPlatz("J"), PS = bauPlatz("S");
  // Steuerblätter (schweben über dem Stapel), Welt-Positionen
  const blattJ = papierBlatt({ farbe: BLAU }), blattS = papierBlatt({ farbe: ORANGE });
  szene.add(blattJ, blattS);
  const BLATT_POS = { J: [JX + 0.42, 1.12, 0.62], S: [SX - 0.42, 1.12, 0.62] };

  // ---------- Waage auf Sockel (hinten Mitte) ----------
  const WZ = -1.75;
  const sockW = sockel({ breite: 0.9, hoehe: 0.85, tiefe: 0.9, farbe: ELFENBEIN, led: 2.2, fleck: 0.25 }); sockW.position.set(0, 0, WZ); szene.add(sockW);
  const wg = waage({ breite: 1.7, hoehe: 0.95, schalenRadius: 0.3, faden: 0.55 }); wg.position.set(0, sockW.oben, WZ); szene.add(wg);
  const mini = (art, seed) => muenzStapel({ art, radius: 0.07, dicke: 0.0058, max: 64, unordnung: 0.008, seed, fallHoehe: 0.2 });
  const wsJ = mini("silber", 21), wsS = mini("kupfer", 22);
  wg.links.add(wsJ); wg.rechts.add(wsS);

  // ---------- Kalenderwand ----------
  const KZ = -4.6, KY = 1.85;
  const wand = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.7, 0.06), new THREE.MeshStandardMaterial({ color: "#10131A", roughness: 0.5, metalness: 0.3 }));
  wand.position.set(0, KY - 0.35, KZ - 0.06); wand.receiveShadow = true; wand.userData.dynamisch = true; szene.add(wand);
  const gJ = kalenderGitter({ farbe: BLAU, kachel: 0.05, luecke: 0.014 }), gS = kalenderGitter({ farbe: ORANGE, kachel: 0.05, luecke: 0.014 });
  gJ.position.set(0, KY + 0.0, KZ); gS.position.set(0, KY - 0.74, KZ); szene.add(gJ, gS);
  const kLEDs = [];
  const kLED = (y, farbe) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.62, 0.02), leuchtMat(farbe, 2.2)); m.position.set(-1.05, y, KZ + 0.01); m.userData.dynamisch = true; return m; };
  kLEDs.push(kLED(KY, BLAU), kLED(KY - 0.74, ORANGE)); szene.add(...kLEDs);

  // ---------- Fliegende Münzen, Ärmel ----------
  const muenzGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.0095, 24);
  const flugJ = schwarm({ geo: muenzGeo, mat: new THREE.MeshStandardMaterial({ color: "#D2D6DD", metalness: 1, roughness: 0.25, envMapIntensity: 1.3 }), n: 48 });
  const flugS = schwarm({ geo: muenzGeo, mat: new THREE.MeshStandardMaterial({ color: "#C47A4A", metalness: 1, roughness: 0.3, envMapIntensity: 1.3 }), n: 48 });
  szene.add(flugJ, flugS);
  const arm = aermel({ laenge: 1.6 }); szene.add(arm);
  const haelfte = papierStapel({ farbe: BLAU, breite: 0.2, laenge: 0.26 }); haelfte.position.set(-0.02, -0.03, 0); arm.add(haelfte); // die Hälfte, die der Arbeitgeber mitnimmt (hängt an der Hand)
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 120);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const WIDE = C(0.5, 4.3, 14.8, 0, 0.8, -0.3);
  const camKeys = [
    { t: 0, v: WIDE },
    { t: t.sara, v: C(0.2, 4.0, 13.6, 0, 0.85, -0.3), e: ease.inOutSine },
    { t: t.wer - 0.2, v: C(0.0, 3.6, 12.2, 0, 0.95, -0.4), e: ease.inOutSine },
    { t: t.rJ - 0.2, v: C(-1.5, 3.0, 8.6, -1.0, 0.8, 0.0, 28), e: ease.inOutCubic },
    { t: t.rS - 0.35, v: C(-1.5, 2.9, 8.4, -1.0, 0.8, 0.0, 28), e: ease.inOutSine },
    { t: t.rS + 0.3, v: C(1.5, 3.0, 8.6, 1.0, 0.8, 0.0, 28), e: ease.inOutCubic },
    { t: t.rBeide - 0.35, v: C(1.4, 2.9, 8.4, 1.0, 0.8, 0.0, 28), e: ease.inOutSine },
    { t: t.rBeide + 0.3, v: C(0.0, 3.8, 12.4, 0, 0.9, -0.3, 30), e: ease.inOutCubic },
    { t: t.klar - 0.4, v: C(0.0, 3.5, 11.6, 0, 1.0, -0.4, 30), e: ease.inOutSine },
    { t: t.klar + 0.3, v: C(0.0, 2.8, 8.8, 0, 1.55, WZ + 0.2, 28), e: ease.inOutCubic },
    { t: t.oder + 0.5, v: C(0.0, 2.7, 8.4, 0, 1.55, WZ + 0.2, 27), e: ease.inOutSine },
    { t: t.runde, v: C(0.0, 3.5, 10.8, 0, 0.8, 0.0, 30), e: ease.inOutCubic },
    { t: t.steuer + 0.6, v: C(0.0, 3.4, 10.2, 0, 0.85, 0.1, 30), e: ease.inOutSine },
    { t: T("rennen:Jonas") - 0.2, v: C(-1.5, 2.6, 7.6, -1.0, 0.9, 0.2, 27), e: ease.inOutCubic },
    { t: t.s6 - 0.7, v: C(-1.4, 2.6, 7.8, -0.9, 0.9, 0.2, 27), e: ease.inOutSine },
    { t: t.s6 - 0.2, v: C(1.5, 2.6, 7.6, 1.0, 0.9, 0.2, 27), e: ease.inOutCubic },
    { t: t.vorn - 0.3, v: C(1.3, 2.6, 7.8, 0.9, 0.9, 0.2, 27), e: ease.inOutSine },
    { t: t.vorn + 0.4, v: C(0.0, 3.2, 10.8, 0, 1.3, -0.5, 29), e: ease.inOutCubic },
    { t: t.folg, v: C(0.4, 4.1, 13.4, 0, 1.0, -0.3, 30), e: ease.inOutSine },
    { t: t.doch, v: C(-1.7, 2.5, 7.0, -1.1, 0.8, 0.25, 26), e: ease.inOutCubic },
    { t: t.haelfte + 1.6, v: C(-1.3, 2.7, 7.6, -1.0, 0.9, 0.2, 27), e: ease.inOutSine },
    { t: t.saraAllein - 0.35, v: C(-0.4, 3.0, 9.4, 0, 0.9, 0.2, 29), e: ease.inOutCubic },
    { t: t.saraAllein + 0.4, v: C(1.6, 2.6, 7.4, 1.0, 0.8, 0.25, 26), e: ease.inOutCubic },
    { t: t.kk - 0.3, v: C(1.4, 2.7, 7.8, 1.0, 0.85, 0.2, 27), e: ease.inOutSine },
    { t: t.j525 - 0.9, v: C(-1.5, 2.7, 7.8, -1.0, 0.85, 0.2, 27), e: ease.inOutCubic },
    { t: t.rente - 0.3, v: C(0.0, 3.4, 10.6, 0, 0.8, 0.1, 30), e: ease.inOutCubic },
    { t: t.strich - 0.2, v: C(0.0, 3.7, 12.0, 0, 0.85, 0.0, 30), e: ease.inOutCubic },
    { t: t.vorbei - 0.5, v: C(0.0, 3.1, 10.2, 0, 1.4, -0.9, 29), e: ease.inOutCubic },
    { t: t.end, v: C(0.6, 4.3, 14.0, 0, 1.0, -0.3, 30), e: ease.inOutCubic },
    { t: t.e37 - 0.2, v: C(-1.4, 2.8, 8.6, -0.8, 0.95, 0.1, 28), e: ease.inOutCubic },
    { t: t.e29 - 0.2, v: C(1.4, 2.8, 8.6, 0.8, 0.95, 0.1, 28), e: ease.inOutCubic },
    { t: t.e77 - 0.2, v: C(0.0, 3.6, 11.6, 0, 1.2, -0.5, 30), e: ease.inOutCubic },
    { t: t.warum, v: C(-1.5, 2.9, 8.2, -1.0, 0.8, 0.4, 27), e: ease.inOutCubic },
    { t: t.svWort - 0.4, v: C(0.2, 3.3, 10.2, 0, 0.8, 0.4, 29), e: ease.inOutCubic },
    { t: t.svWort + 0.4, v: C(1.5, 2.9, 8.2, 1.0, 0.8, 0.4, 27), e: ease.inOutCubic },
    { t: t.und + 0.3, v: C(0.4, 3.4, 11.0, 0, 1.0, 0.0, 30), e: ease.inOutCubic },
    { t: t.gleich, v: C(0.8, 3.1, 9.4, 0.3, 1.0, -0.2, 29), e: ease.inOutSine },
    { t: t.ohne - 0.9, v: C(0.4, 3.0, 9.0, 0.3, 1.1, -0.2, 29), e: ease.inOutCubic },
    { t: t.ohne - 0.1, v: C(0.0, 1.75, 4.4, 0, 1.5, KZ, 30), e: ease.inOutCubic },
    { t: t.s4581 - 0.4, v: C(0.0, 1.45, 4.3, 0, 1.05, KZ, 30), e: ease.inOutSine },
    { t: t.j2874 - 0.3, v: C(0.0, 1.9, 4.2, 0, 1.85, KZ, 30), e: ease.inOutSine },
    { t: t.merk - 0.1, v: C(0.0, 2.2, 4.6, 0, 1.6, KZ, 30), e: ease.inOutSine },
    { t: t.merk + 2.5, v: C(0.2, 3.6, 11.5, 0, 1.0, -0.4, 30), e: ease.inOutCubic },
  ];
  const regie = new Regie(kamera, (x) => { const v = keyframes(camKeys, x); return { pos: [v[0], v[1], v[2]], ziel: [v[3], v[4], v[5]], fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.01, tempo: 0.25 });
  // Zoom (mal ja, mal nein): Wendung 1 auf den Ärmel, Ergebnis auf Jonas' Stapel, Warum auf den Arbeitgeber-Stapel
  regie.zoom({ t: t.haelfte, ziel: [JX - 0.3, 0.85, 0.3], staerke: 0.13, halt: 0.8, rueck: 0.7 });
  regie.zoom({ t: t.e37 + 0.5, ziel: [JX + 0.58, 0.8, 0.25], staerke: 0.13, halt: 0.9, rueck: 0.8 });
  regie.zoom({ t: t.ag + 0.3, ziel: [JX - 0.62, 0.35, 0.55], staerke: 0.13, halt: 0.9, rueck: 0.8 });
  regie.schleife({ ab: t.merk, ende: DAUER - 1 / FPS });

  const post = { ...GRADING.studio, strahlen: AUS.has("strahlen") ? 0 : 0.5, strahlenPunkt: [0.2, 9.4, 2.2], strahlenSchwelle: 1.4, strahlenLaenge: 0.7, strahlenFarbe: [1, 0.95, 0.88] };
  const farbeB = new THREE.Color(BLAU), farbeO = new THREE.Color(ORANGE), farbeE = new THREE.Color(ELFENBEIN);
  const weltJ = (ox, oy, oz) => new THREE.Vector3(ox, oy, oz);
  const welt = { szene, kamera, post, update: null };
  const ZIEL_POS = (name, s) => {
    if (name === "blattJ") return weltJ(...BLATT_POS.J);
    if (name === "blattS") return weltJ(...BLATT_POS.S);
    if (name === "pileJ") return weltJ(JX - 0.3, DESK + 0.02 + s.pJ, 0.3);
    return weltJ(SX + 0.3, DESK + 0.02 + s.pS, 0.3);
  };
  const flugBilder = (x, liste, ichJ, schw, s) => {
    let i = 0;
    const stapelX = ichJ ? JX + 0.58 : SX - 0.58;
    const hoehe0 = DESK + 0.01 + 0.0095 * Math.min(64, ichJ ? s.ju : s.su);
    for (const e of liste) {
      const n = Math.max(3, Math.min(9, Math.round(e.k * 1.0))), df = 0.6;
      for (let k = 0; k < n; k++) {
        const tk = e.t0 + (k / n) * Math.max(0.1, e.dur - 0.2), u = (x - tk) / df;
        const von = new THREE.Vector3(stapelX, hoehe0 + 0.1, 0.2), nach = ZIEL_POS(e.ziel, s);
        if (u > 0 && u < 1 && i < 48) {
          const w = ease.inOutSine(u);
          const p = von.clone().lerp(nach, w); p.y += 0.5 * Math.sin(w * Math.PI);
          schw.setzeInstanz(i++, p.toArray(), u * 5, u * 6, 1, true, 0.5 * Math.sin(u * 6));
        }
      }
    }
    for (; i < 48; i++) schw.setzeInstanz(i, [0, -5, 0], 0, 0, 1, false);
    schw.fertig();
  };
  let letzteSicht = -1;
  welt.update = (x) => {
    const s = zustand(x), sv = zustand(x - 0.05);
    // Stapel: fällt die Zahl, geht die oberste Münze sofort; steigt sie, fällt eine Münze von oben (Standbild: ganze Münzen)
    const stapelWert = (v, v0) => { const fall = v - v0; return fall < -0.0005 ? Math.ceil(v - 1e-6) : fall > 0.0005 ? v : Math.round(v); };
    const wJ = stapelWert(s.ju, sv.ju), wS = stapelWert(s.su, sv.su);
    PJ.stapel.setze(wJ); PS.stapel.setze(wS); wsJ.setze(wJ); wsS.setze(wS);
    PJ.vorn.setze(s.agS > 0.001 ? (s.agS < Z.J.agAnteile / 1000 - 0.01 && sv.agS < s.agS ? s.agS : Math.round(s.agS)) : 0);
    PS.vorn.setze(s.svS > 0.001 ? (s.svS < Z.steuerVorteilS / 1000 - 0.01 && sv.svS < s.svS ? s.svS : Math.round(s.svS)) : 0);
    // Waage: Neigung = Differenz der Stände (positiv = rechte Schale = Sara tiefer)
    wg.setze(clamp((s.su - s.ju) * 0.06, -0.5, 0.5));
    // Figuren: tippen, Blick zueinander
    const ph = x * 5.0;
    PJ.fig.setze({ tippen: ph, kopfDreh: 0.55 * s.blick + 0.25 * s.hebe, kopfNick: -0.1 * s.hebe + 0.04 * Math.sin(x * 1.3), lehnen: 0.03 * Math.sin(x * 0.9) });
    PS.fig.setze({ tippen: ph + 1.3, kopfDreh: -0.55 * s.blick - 0.25 * s.hebe, kopfNick: -0.1 * s.hebe + 0.04 * Math.sin(x * 1.1 + 1), lehnen: 0.03 * Math.sin(x * 0.8 + 2) });
    // Steuerblätter
    for (const [bl, b, pos] of [[blattJ, s.bJ, BLATT_POS.J], [blattS, s.bS, BLATT_POS.S]]) {
      bl.visible = b > 0.003; bl.position.set(pos[0], pos[1] + (1 - b) * 1.6 + 0.03 * Math.sin(x * 2.1), pos[2]); bl.rotation.set(0.95 + 0.35 * (1 - b) + 0.05 * Math.sin(x * 1.7), 0.3 * (1 - b), 0.04 * Math.sin(x * 1.3)); bl.scale.setScalar(0.9 + 0.5 * b);
    }
    // Rechnungsstapel
    PJ.pile.setze(s.pJ); PS.pile.setze(s.pS);
    PJ.pile.led.color.copy(farbeB).multiplyScalar(0.9 + 1.2 * puls(x, t.j525, 0.7) + 1.2 * puls(x, t.j558, 0.7) + 1.2 * puls(x, t.j1305, 0.7));
    PS.pile.led.color.copy(farbeO).multiplyScalar(0.9 + 1.2 * puls(x, t.s105 + 0.4, 0.7) + 1.2 * puls(x, t.s1116 + 0.4, 0.7) + 1.2 * puls(x, t.s2418 + 0.4, 0.7));
    // Münzen im Flug
    flugBilder(x, ZAHL_J, true, flugJ, s); flugBilder(x, ZAHL_S, false, flugS, s);
    // Ärmel (Arbeitgeber): fährt von links ein; Ziel = Rechnungsstapel (Hälfte holen) bzw. Arbeitgeber-Stapel (Warum)
    const ziel = s.ziel;
    const hx = lerp(JX - 0.3, JX - 0.62, ziel), hy = lerp(DESK + 0.12 + s.pJ, 0.12 + 0.0095 * Math.max(1, s.agS) + 0.14, ziel), hz = lerp(0.3, 0.54, ziel);
    arm.visible = s.aermelAn > 0.003;
    const a = s.aermelAn; arm.position.set(hx - (1 - a) * 2.4, hy + (1 - a) * 0.3, hz); arm.greifen(s.griff);
    haelfte.setze(ziel > 0.5 ? 0 : 0.11 * s.griff); haelfte.led.color.copy(farbeB).multiplyScalar(1.0);
    // Kalender: Jonas alle 261 Tage hell, Sara verliert 7 Feiertage, 30 Urlaubs- und 14,6 Krankentage
    const helligJ = s.kal, ein = (i) => (i < 7 ? s.kalFeier : i < 37 ? s.kalUrl : i < 51 ? s.kalKrank : s.kalKrank * 0.6);
    gJ.visible = gS.visible = wand.visible = s.kal > 0.003; kLEDs.forEach((m) => { m.visible = s.kal > 0.003; });
    if (gJ.visible) { gJ.faerbe(() => helligJ * 0.9); gS.faerbe((i) => s.kal * (1 - ein(ordnung[i]) * (ordnung[i] < 52 ? 1 : 0) * 0.96) * 0.9); }
    // LED, Fenster, Lampen, Lichter
    PJ.dio.led.color.copy(farbeB).multiplyScalar(2.2 * s.ledJ); PS.dio.led.color.copy(farbeO).multiplyScalar(2.2 * s.ledS);
    PJ.dio.fensterMat.color.set("#BFD4FF").multiplyScalar(0.62 * (1 + 0.6 * s.kuehl)); PS.dio.fensterMat.color.set("#FFD9A8").multiplyScalar(0.62 * (1 - 0.35 * s.kuehl));
    spotJ.intensity = 34 * s.spotJ; spotS.intensity = 34 * s.spotS; spotU.intensity = 70 * s.spotU;
    blitz.intensity = 8 * s.blitz;
    post.bloomStaerke = GRADING.studio.bloomStaerke * (1 + 0.45 * Math.min(1, s.blitz) + 0.5 * s.glanz);
    aktualisiere(x);
    regie.anwenden(x);
    // Fokus (Tiefenschärfe): wandert mit dem Geschehen
    const v = keyframes(camKeys, x);
    Object.assign(post, fokus(kamera, [v[3], v[4], v[5]], { tiefe: 0.22, nah: 0.5, fern: 0.7 }));
  };

  // =====================================================================================
  // HUD (design.md): Tafel ab Bild 0, Chips nur mit neuer Information, keine Sticker
  // =====================================================================================
  M.tafel({
    y: 166,
    links: { team: "a", name: "JONAS", einheit: "€", nk: 0, max: 99999 },
    rechts: { team: "b", name: "SARA", einheit: "€", nk: 0, max: 99999 },
    werte: (x) => { const s = zustandRoh(x); return { a: s.ju * 1000, b: s.su * 1000 }; },
    vorn: null,
  });
  const w = (x, typ, klang, text) => M.melde({ t: x, typ, klang, text });
  w(0.5, "welt", "pop", "LED-Kanten leuchten auf");
  w(t.jonas, "welt", "pop", "Jonas’ Kante leuchtet"); w(t.sara, "welt", "pop", "Saras Kante leuchtet");
  w(t.beide + 0.3, "welt", "pop", "beide Stapel leuchten"); w(T("hook:60.000"), "welt", "ding", "beide Münzstapel gleich hoch"); w(t.wer, "welt", "pop", "Waage leuchtet");
  w(t.rJ, "welt", "whoosh", "Kamera zu Jonas"); w(T("regeln:60.000"), "welt", "pop", "Jonas’ Stapel leuchtet");
  w(t.rS, "welt", "whoosh", "Kamera zu Sara"); w(T("regeln:60.000#2"), "welt", "pop", "Saras Stapel leuchtet");
  w(t.rBeide, "welt", "whoosh", "Weitwinkel, beide blicken sich an"); w(T("regeln:gesetzlich"), "welt", "pop", "Kanten pulsieren"); w(T("regeln:gleiche"), "welt", "pop", "Blick zueinander");
  w(t.klar, "welt", "whoosh", "Kamera zur Waage, Spot"); w(T("falle:gleiches"), "welt", "pop", "Waage steht gerade"); w(T("falle:gleiches#2"), "welt", "pop", "Waage leuchtet"); w(t.oder, "welt", "ding", "Waage, Bild steht kurz");
  w(t.runde, "welt", "whoosh", "Steuerblätter schweben ein"); w(t.steuer, "welt", "pop", "Blätter über beiden Tischen");
  w(T("rennen:Jonas"), "welt", "pop", "Kamera zu Jonas"); w(t.j9, "welt", "ding", "Münzen fliegen ins Blatt, Jonas’ Stapel sinkt"); w(T("rennen:9.000+0.5"), "welt", "pop", "Jonas’ Stapel 50.601");
  w(T("rennen:Sara"), "welt", "whoosh", "Kamera zu Sara"); w(t.s6, "welt", "ding", "Münzen fliegen ins Blatt, Saras Stapel sinkt"); w(T("rennen:nur"), "welt", "pop", "Saras Stapel 53.968");
  w(t.vorn, "welt", "ding", "Saras Seite vorn, Waage neigt zu Sara");
  w(T("folgen:nichts"), "welt", "pop", "beide LED-Kanten pulsieren"); w(t.doch, "welt", "whoosh", "Zoom auf Jonas, kühles Licht"); w(t.sozial, "welt", "pop", "Rechnungsstapel erscheinen"); w(t.bei, "welt", "whoosh", "Ärmel fährt ein");
  w(T("wendung1:Arbeitgeber"), "welt", "pop", "Ärmel greift nach den Rechnungen"); w(t.haelfte, "welt", "ding", "Hälfte des Stapels verschwindet im Ärmel"); w(t.saraAllein, "welt", "whoosh", "Kamera zu Sara, ganzer Stapel liegt vor ihr"); w(t.allein, "welt", "pop", "Saras Stapel leuchtet");
  w(t.kk, "welt", "whoosh", "Kamera zu Sara"); w(t.s105, "welt", "ding", "Münzen fliegen in Saras Stapel, 10.500"); w(t.j525 - 0.3, "welt", "whoosh", "Kamera zu Jonas"); w(t.j525, "welt", "ding", "Jonas 5.250");
  w(t.rente, "welt", "whoosh", "Kamera weit"); w(t.s1116, "welt", "ding", "Sara 11.160"); w(t.j558, "welt", "ding", "Jonas 5.580");
  w(t.strich, "welt", "whoosh", "Weitwinkel"); w(t.s2418, "welt", "ding", "Sara 24.180 Abgaben"); w(t.j1305, "welt", "ding", "Jonas 13.050 Abgaben");
  w(t.vorbei - 0.1, "welt", "whoosh", "Kamera zur Waage"); w(t.vorbei, "welt", "ding", "Waage kippt zu Jonas, Blitz");
  w(t.end, "welt", "whoosh", "Weitwinkel, Licht auf den Sieger"); w(T("ergebnis:Sara"), "welt", "pop", "Saras Kante leuchtet"); w(T("ergebnis:Jonas#2"), "welt", "pop", "Jonas’ Kante leuchtet"); w(t.e37, "welt", "ding", "Jonas’ Stapel glüht, Zoom"); w(t.e29, "welt", "ding", "Saras Stapel leuchtet"); w(t.e77, "welt", "ding", "Waage, Differenz"); w(t.e647, "welt", "pop", "Monatswert");
  w(t.warum, "welt", "whoosh", "Fahrt zu Jonas"); w(T("warum:zahlt"), "welt", "whoosh", "Ärmel fährt ein"); w(t.ag, "welt", "ding", "Ärmel legt den Arbeitgeber-Stapel ab"); w(T("warum:obendrauf"), "welt", "pop", "Stapel leuchtet"); w(t.svWort, "welt", "whoosh", "Kamera zu Sara"); w(t.sv, "welt", "ding", "Saras kleiner Steuervorteil-Stapel");
  w(t.und, "welt", "whoosh", "Kamera weit"); w(t.gleich, "welt", "pop", "Fahrt zu Sara"); w(t.g767, "welt", "ding", "Saras Stapel wächst, Waage gleicht sich aus"); w(T("ueberraschung:Gewinn"), "welt", "pop", "Saras Stapel gleich hoch");
  w(t.ohne - 0.1, "welt", "whoosh", "Szenenwechsel zur Kalenderwand"); w(t.ohne + 0.1, "welt", "pop", "Feiertage erlöschen"); w(t.urlaub, "welt", "pop", "Urlaubstage erlöschen"); w(t.krank, "welt", "pop", "Krankentage erlöschen");
  w(T("ueberraschung:Das"), "welt", "pop", "Fahrt zu Saras Kacheln"); w(t.s4581, "welt", "ding", "Saras Stunden leuchten"); w(T("ueberraschung:Jonas"), "welt", "whoosh", "Fahrt zu Jonas’ Kacheln"); w(t.j2874, "welt", "ding", "Jonas’ Kacheln leuchten");
  w(t.merk, "welt", "whoosh", "Rückfahrt zum Anfangsbild"); w(T("merksatz:Selbstständige"), "welt", "pop", "Licht ruhig"); w(t.viertel, "welt", "ding", "Waage gleicht sich aus");

  // ---------- Chips ----------
  const vor = (x, d = 0.3) => T(x) - d;
  const R1 = 380, R2 = 475, R3 = 570, R4 = 665, XL = 322, XR = 758;
  M.chip({ text: "60.000 € BRUTTO", ein: "regeln:60.000", aus: vor("falle:Klar", 0.4), team: "a", art: "hell", x: XL, y: R1, anker: "mitte" });
  M.chip({ text: "60.000 € GEWINN", ein: "regeln:60.000#2", aus: vor("falle:Klar", 0.4), team: "b", art: "hell", x: XR, y: R1, anker: "mitte" });
  M.chip({ text: "KINDERLOS · GESETZLICH", ein: "regeln:Beide", aus: vor("falle:Klar", 0.4), team: "akzent", art: "voll", x: 540, y: R2 + 20, anker: "mitte" });
  M.chip({ text: "GLEICHE RENTE", ein: "regeln:gleiche", aus: vor("falle:Klar", 0.4), team: "akzent", art: "hell", x: 540, y: R3 + 25, anker: "mitte" });
  M.chip({ text: "RUNDE 1 · STEUER", ein: "rennen:Erste", aus: vor("wendung1:Doch", 0.5), team: "akzent", art: "voll", x: 540, y: R1, anker: "mitte" });
  M.chip({ text: "ESt −9.399 €", ein: "rennen:9.000", aus: vor("wendung1:Doch", 0.5), team: "a", art: "hell", x: XL, y: R2, anker: "mitte" });
  M.chip({ text: "ESt −6.032 €", ein: "rennen:6.000", aus: vor("wendung1:Doch", 0.5), team: "b", art: "hell", x: XR, y: R2, anker: "mitte" });
  M.chip({ text: "RUNDE 2 · SOZIALABGABEN", ein: "wendung1:Sozialabgaben", aus: vor("ergebnis:Endstand", 0.3), team: "akzent", art: "voll", x: 540, y: R1, anker: "mitte" });
  M.chip({ text: "ARBEITGEBER: 1/2", ein: "wendung1:Arbeitgeber", aus: vor("wendung2:Krankenkasse", 0.3), team: "a", art: "hell", x: XL, y: R2, anker: "mitte" });
  M.chip({ text: "SARA: ALLES", ein: "wendung1:allein", aus: vor("wendung2:Krankenkasse", 0.3), team: "b", art: "hell", x: XR, y: R2, anker: "mitte" });
  M.chip({ text: "KASSE 5.250 €", ein: "wendung2:Hälfte", aus: vor("ergebnis:Endstand", 0.3), team: "a", art: "hell", x: XL, y: R2, anker: "mitte" });
  M.chip({ text: "KASSE 10.500 €", ein: "wendung2:10.500", aus: vor("ergebnis:Endstand", 0.3), team: "b", art: "hell", x: XR, y: R2, anker: "mitte" });
  M.chip({ text: "RENTE 5.580 €", ein: "wendung2:dasselbe+0.4", aus: vor("ergebnis:Endstand", 0.3), team: "a", art: "hell", x: XL, y: R3, anker: "mitte" });
  M.chip({ text: "RENTE 11.160 €", ein: "wendung2:dasselbe", aus: vor("ergebnis:Endstand", 0.3), team: "b", art: "hell", x: XR, y: R3, anker: "mitte" });
  M.chip({ text: "ABGABEN 13.050 €", ein: "wendung2:Jonas#2-0.1", aus: vor("ergebnis:Endstand", 0.3), team: "a", art: "voll", x: XL, y: R4, anker: "mitte" });
  M.chip({ text: "ABGABEN 24.180 €", ein: "wendung2:Jonas#2-0.3", aus: vor("ergebnis:Endstand", 0.3), team: "b", art: "voll", x: XR, y: R4, anker: "mitte" });
  M.bilanz({
    y: 440, ein: "ergebnis:Endstand", aus: vor("warum:Warum", 0.35), titel: "NETTO PRO JAHR",
    zeilen: [
      { label: "JONAS", wert: Math.round(Z.jNetto), einheit: "€", team: "a", ein: "ergebnis:37.500" },
      { label: "SARA", wert: Math.round(Z.sNetto), einheit: "€", team: "b", ein: "ergebnis:30.000" },
    ],
    differenz: { label: "JONAS VORN", wert: Math.round(Z.diff), einheit: "€", ein: "ergebnis:8.000" },
  });
  M.chip({ text: "647 € / MONAT MEHR", ein: "ergebnis:Monat", aus: vor("warum:Warum", 0.35), team: "a", art: "voll", x: 540, y: 900, anker: "mitte" });
  M.balken({
    y: 440, ein: "warum:Warum", aus: vor("ueberraschung:Und", 0.3), titel: "WARUM?", max: 12690,
    faktoren: [
      { label: "ARBEITGEBER OBENDRAUF", ein: "warum:13.000", a: { wert: Math.round(Z.J.agAnteile) }, b: { wert: 0 }, tag: "+12.690 €" },
      { label: "STEUERVORTEIL SARA", ein: "warum:3.000", a: { wert: 0 }, b: { wert: Math.round(Z.steuerVorteilS) }, tag: "+3.367 €" },
    ],
  });
  M.chip({ text: "GLEICHSTAND: 76.736 € GEWINN", ein: "ueberraschung:77.000", aus: vor("ueberraschung:Jonas", 0.3), team: "b", art: "voll", x: 540, y: R1, anker: "mitte" });
  M.chip({ text: "45,81 € / ARBEITSSTUNDE", ein: "ueberraschung:Arbeitsstunde", aus: vor("merksatz:Merke", 0.3), team: "b", art: "voll", x: 540, y: R2 + 25, anker: "mitte" });
  M.chip({ text: "28,74 € / STUNDE", ein: "ueberraschung:29", aus: vor("merksatz:Merke", 0.3), team: "a", art: "voll", x: 540, y: R2 + 145, anker: "mitte" });
  M.pointe({ woerter: [{ text: "+", ein: "merksatz:Selbstständige" }, { text: "27,9 %", ein: "merksatz:Viertel", farbe: "akzent" }], ein: "merksatz:Selbstständige", aus: "schluss:Schreib", y: 520, groesse: 150 });
  M.folgen({ ein: "folgen:Folg", dauer: 1.8, team: "a" });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });
  M.schleife({ ab: t.merk });

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (x) => { zl.zeichne(x, Math.round(x * FPS)); hud.update(x); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (x) => hud.update(x);
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "raum", schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) });
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
