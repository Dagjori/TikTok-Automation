// „Kaffee oder Tee? Wer zahlt im Leben mehr Steuern für sein Heißgetränk?“ · Simulierbar · Stil 18 Dunkles Studio (Produktlicht), belebte Szene
// Zwei Küchen-Dioramen im schwarzen Studio: links Tom (Kaffee, Kupfer), rechts Mia (Tee, Grün), je mit dampfender Tasse, Fenster und Lampe;
// Toms Steuer fällt als Münzen in seinen Stapel, Mias Stapel bleibt leer. Hinten die Balkenwaage (kippt zu Tom) und die Kalenderwand: 60 Kacheln = 60 Jahre.
// Alle Zahlen kommen aus pipeline/sim/kaffeesteuer.mjs. Alles ist eine reine Funktion von t (window.renderAt(t)).
import * as THREE from "three";
import { SimBuehne, GRADING, rigStudio, spiegelBoden, lichtKegel, staub, buendeln, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { hohlkehle, wandLicht, muenzStapel, waage, diorama, tasse, tischlampe, pflanze, kalenderGitter } from "../../engine/stil_studio.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, keyframes } from "../../engine/bewegung.js";
import { videoZahlen, bisJahr } from "../../sim/kaffeesteuer.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich). Kein Gelb.
const KUPFER = "#D9822B"; // Tom (Kaffee)
const GRUEN = "#3FBF7F";  // Mia (Tee)
const ELFENBEIN = "#ECE6DA";
const Z = videoZahlen();
const TASSE_ST = Z.centTasseMitUst / 100;                                 // € je Tasse (1,76 ct)

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.5 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "TOM · KAFFEE", farbe: KUPFER, woerter: ["Tom*", "Toms*", "Kaffee*", "1.154,66*", "192*", "577*"] },
      b: { name: "MIA · TEE", farbe: GRUEN, woerter: ["Mia*", "Mias*", "Tee*", "Teesteuer*"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);
  const R = (x, a, b, e = ease.inOutSine) => e(fortschritt(x, a, b));
  const puls = (x, t0, d = 0.7) => { const k = fortschritt(x, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const fenster = (x, a, b, rein = 0.4, raus = 0.5) => ease.inOutSine(fortschritt(x, a, a + rein)) * (1 - ease.inOutSine(fortschritt(x, b - raus, b)));

  // ---------- Zeitachse an gesprochenen Wörtern ----------
  const tCoin = T("rennen:Darauf"), tK0 = T("kipp:Jetzt"), t10 = T("kipp:192"), t30 = T("kipp:577"), tErg = T("ergebnis:Endstand"), t60 = tErg + 0.5;
  const jahr = (x) => {                                                    // Jahre im Zeitraffer (nur in der Kipp-Phase)
    if (x <= tK0) return 0;
    if (x <= t10) return 10 * ease.inOutSine(fortschritt(x, tK0, t10)) ** 0.9;
    if (x <= t30) return lerp(10, 30, fortschritt(x, t10, t30));
    return lerp(30, 60, ease.inOutSine(fortschritt(x, t30, t60)));
  };
  const tom = (x) => Math.max(x >= tCoin + 0.3 ? TASSE_ST : 0, bisJahr(jahr(x)));    // gezählte Extra-Steuer in €
  const zustand = M.wert((x) => ({ tom: tom(x), jahr: jahr(x) }));

  // Lichtpulse an Wortzeiten
  const PA = ["hook:Kaffee", "regeln:Tom", "regeln:Kaffee", "falle:Klar", "rennen:Toms", "rennen:Darauf", "rennen:2,19", "wendung1:Fast", "wendung2:Zurück", "wendung2:1,64", "wendung2:7", "wendung3:Löslicher", "wendung3:4,78", "kipp:192", "kipp:577", "ergebnis:Tom", "warum:Kaffee", "pointe:Der", "schlusskarte:Kaffee"];
  const PB = ["hook:Tee", "regeln:Mia", "regeln:Tee", "falle:Oder", "rennen:Mias", "rennen:0", "wendung1:Teesteuer", "wendung1:1992", "wendung1:4,15", "kipp:Mia", "ergebnis:Mia", "warum:Tee", "schlusskarte:Durst"];
  const PU = ["hook:Wer", "hook:Heißgetränk", "regeln:Beide", "regeln:Gezählt", "falle:beide", "rennen:Die", "wendung1:Denn", "wendung2:Doch", "wendung2:Steuer#2", "wendung3:Noch", "wendung3:Pro", "kipp:Jetzt", "ergebnis:Endstand", "warum:Warum", "pointe:Und"];
  const tPA = PA.map((k) => T(k)), tPB = PB.map((k) => T(k)), tPU = PU.map((k) => T(k));
  const summe = (liste, x, d = 0.8) => liste.reduce((a, p) => a + puls(x, p, d), 0);

  // ---------- Szene ----------
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#050608");
  rigStudio(szene, buehne.renderer, {
    ziel: [0, 0.9, 0],
    softbox: { farbe: "#EAF1FF", staerke: 5, breite: 3.6, hoehe: 1.2, pos: [3.8, 4.4, 4.2] }, fuell: 0.2, umgebungsStaerke: 0.7,
    oben: { farbe: "#F4F8FF", staerke: 62, pos: [0.2, 9.5, 2.2], winkel: 0.5, rand: 0.6, schatten: SCHATTEN },
    kanten: [{ farbe: "#FFD2B0", staerke: 2.4, pos: [-6, 3.5, -5] }, { farbe: "#A8F0CC", staerke: 2.4, pos: [6, 3, -6] }],
  });
  szene.add(hohlkehle({ breite: 44, tiefe: 30, hoehe: 17, radius: 5, farbe: "#0B0C10", rau: 0.38 }));
  { const sp = spiegelBoden({ breite: 30, tiefe: 16, staerke: 0.28, streckung: 1.2, unschaerfe: 1.4, fresnel: 0.5, aufloesung: 0.28, verzerrung: 0.3 }); sp.position.z = -1; szene.add(sp); }
  const wl = wandLicht({ breite: 10, hoehe: 7, farbe: "#2A2630", staerke: 0.8 }); wl.position.set(0, 5.5, -14.85); szene.add(wl);
  { const k = lichtKegel({ hoehe: 9.4, radiusOben: 0.25, radiusUnten: 3.4, farbe: "#EEF4FF", staerke: 0.085, weich: 1.2, streifen: 0.6 }); k.position.set(0.2, 9.5, 2.2); szene.add(k);
    szene.add(staub({ anzahl: 420, bereich: [7, 5, 7], mitte: [0, 2.5, 0], groesse: 0.012, staerke: 1.6, aussen: 0.0, kegel: { spitze: [0.2, 9.5, 2.2], richtung: [0, -1, 0], winkel: 0.42 } })); }
  const spot = (farbe, pos, ziel, winkel) => { const s = new THREE.SpotLight(farbe, 0, 0, winkel, 0.7, 2); s.position.set(...pos); s.target.position.set(...ziel); szene.add(s, s.target); return s; };
  const spotA = spot("#FFC890", [-1.9, 6.0, 4.2], [-1.0, 0.7, 0.2], 0.3), spotB = spot("#B8F4D6", [1.9, 6.0, 4.2], [1.0, 0.7, 0.2], 0.3);
  const spotU = spot("#FFF4E6", [0.3, 7.0, 2.5], [0, 1.6, -1.7], 0.26);
  const blitz = new THREE.PointLight("#FFFFFF", 0, 0, 2); blitz.position.set(0, 2.0, 1.2); szene.add(blitz);

  // Dioramen: Küche mit Tasse, Dampf, Lampe (Tom) bzw. Pflanze (Mia), Münzstapel
  const AX = -1.0, BX = 1.0;
  const bau = (tom) => {
    const farbe = tom ? KUPFER : GRUEN;
    const g = new THREE.Group(); g.position.x = tom ? AX : BX;
    const dio = diorama({ farbe, fenster: tom ? "#FFD9A8" : "#CFF5E0", fensterStaerke: 0.62, wand: tom ? "#221D1B" : "#18221E", boden: tom ? "#2B2723" : "#222B27" });
    g.add(dio);
    const ta = tasse({ farbe: tom ? "#E6D2BE" : "#DDEFE3" }); ta.scale.setScalar(4.2); ta.position.set(tom ? -0.15 : 0.15, 0.1, 0.2); g.add(ta);
    const lampe = tischlampe({ farbe: tom ? "#FFD0A0" : "#D8FFEA", staerke: 2.0 }); lampe.position.set(tom ? -0.62 : 0.62, 0.1, -0.05); g.add(lampe);
    if (!tom) { const pf = pflanze(); pf.position.set(-0.55, 0.1, -0.1); g.add(pf); }
    const stapel = muenzStapel({ art: tom ? "gold" : "silber", max: 40, seed: tom ? 3 : 4 }); stapel.position.set(tom ? 0.5 : -0.5, 0.1, 0.25); g.add(stapel);
    szene.add(g);
    return { g, dio, ta, stapel, lampe };
  };
  const PA_ = bau(true), PB_ = bau(false);
  const wg = waage({ breite: 3.2, hoehe: 1.7, schalenRadius: 0.5 }); wg.position.set(0, 0, -1.9); szene.add(wg);
  const kal = kalenderGitter({ spalten: 20, reihen: 3, kachel: 0.11, luecke: 0.035, farbe: KUPFER }); kal.position.set(0, 2.55, -3.4); szene.add(kal);
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 120);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(0.0, 4.3, 14.4, 0, 1.1, -0.3) },
    { t: T("hook:Tee"), v: C(0.9, 3.2, 10.4, 0.6, 0.8, 0.1, 28), e: ease.inOutSine },
    { t: T("hook:Wer"), v: C(-0.2, 3.9, 12.8, 0, 1.0, -0.2), e: ease.inOutSine },
    { t: T("regeln:Tom"), v: C(-1.5, 2.9, 8.6, -1.0, 0.85, 0.2, 27), e: ease.inOutCubic },
    { t: T("regeln:Mia"), v: C(1.5, 2.9, 8.6, 1.0, 0.85, 0.2, 27), e: ease.inOutCubic },
    { t: T("regeln:Beide"), v: C(0.0, 4.2, 13.6, 0, 1.0, -0.3), e: ease.inOutCubic },
    { t: T("falle:Klar") - 0.1, v: C(0.2, 3.2, 10.0, 0, 1.2, -0.8, 29), e: ease.inOutCubic },
    { t: T("falle:Oder") - 0.3, v: C(0.0, 3.9, 12.6, 0, 1.2, -0.5, 29), e: ease.inOutCubic },
    { t: T("rennen:Toms") - 0.1, v: C(-1.4, 2.6, 8.4, -1.0, 0.8, 0.2, 27), e: ease.inOutCubic },
    { t: T("rennen:Darauf"), v: C(-1.0, 2.1, 6.8, -0.7, 0.7, 0.2, 26), e: ease.inOutSine },
    { t: T("rennen:Mias") - 0.2, v: C(1.4, 2.7, 8.6, 1.0, 0.8, 0.2, 27), e: ease.inOutCubic },
    { t: T("wendung1:Denn") - 0.1, v: C(0.2, 4.0, 13.0, 0, 1.4, -0.8), e: ease.inOutCubic },
    { t: T("wendung1:Bis"), v: C(1.3, 2.8, 8.6, 0.9, 0.9, 0.1, 27), e: ease.inOutCubic },
    { t: T("wendung1:Fast"), v: C(-0.3, 3.4, 11.4, 0, 1.2, -0.3, 29), e: ease.inOutCubic },
    { t: T("wendung2:Zurück") - 0.1, v: C(-1.3, 2.5, 7.6, -1.0, 0.7, 0.2, 26), e: ease.inOutCubic },
    { t: T("wendung2:Doch") - 0.2, v: C(-0.7, 1.9, 6.0, -0.5, 0.6, 0.3, 24), e: ease.inOutSine },
    { t: T("wendung2:Steuer#2") - 0.2, v: C(0.2, 3.6, 11.8, 0, 1.0, -0.2), e: ease.inOutCubic },
    { t: T("wendung3:Noch"), v: C(-1.3, 2.7, 8.0, -0.9, 0.8, 0.2, 27), e: ease.inOutCubic },
    { t: T("wendung3:Pro"), v: C(-0.6, 2.2, 6.6, -0.5, 0.65, 0.2, 25), e: ease.inOutSine },
    { t: T("kipp:Jetzt") - 0.1, v: C(0.0, 4.4, 13.8, 0, 1.6, -1.2), e: ease.inOutCubic },
    { t: T("kipp:192"), v: C(-0.8, 3.0, 9.6, -0.5, 1.5, -0.6, 28), e: ease.inOutCubic },
    { t: T("kipp:577"), v: C(0.8, 3.0, 9.6, 0.5, 1.6, -0.6, 28), e: ease.inOutCubic },
    { t: T("kipp:Mia"), v: C(1.4, 2.7, 8.4, 1.0, 0.8, 0.2, 27), e: ease.inOutCubic },
    { t: tErg - 0.2, v: C(0.0, 4.2, 14.0, 0, 1.1, -0.3), e: ease.inOutCubic },
    { t: T("ergebnis:Tom") - 0.2, v: C(-1.4, 2.7, 8.2, -0.9, 0.9, 0.2, 27), e: ease.inOutCubic },
    { t: T("warum:Warum"), v: C(1.2, 3.3, 10.6, 0.5, 1.0, -0.2, 28), e: ease.inOutCubic },
    { t: T("warum:Tee"), v: C(1.5, 2.8, 8.4, 1.0, 0.8, 0.2, 27), e: ease.inOutCubic },
    { t: T("pointe:Und") - 0.2, v: C(0.0, 3.6, 11.4, 0, 1.0, -0.4), e: ease.inOutCubic },
    { t: T("schlusskarte:Gleicher") - 0.3, v: C(0.0, 4.0, 13.6, 0, 1.1, -0.3), e: ease.inOutCubic },
    { t: DAUER, v: C(0.0, 4.4, 15.2, 0, 1.1, -0.3), e: ease.inOutSine },
  ];
  const regie = new Regie(kamera, (x) => { const v = keyframes(camKeys, x); return { pos: [v[0], v[1], v[2]], ziel: [v[3], v[4], v[5]], fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.01, tempo: 0.25 });
  regie.zoom({ t: T("rennen:Darauf") + 0.2, ziel: [AX + 0.4, 0.5, 0.3], staerke: 0.13, halt: 0.9, rueck: 0.7 });
  regie.zoom({ t: T("wendung1:1992"), ziel: [BX, 0.5, 0.2], staerke: 0.12, halt: 0.9, rueck: 0.7 });
  regie.zoom({ t: T("ergebnis:1.154,66"), ziel: [AX + 0.5, 0.8, 0.3], staerke: 0.13, halt: 1.0, rueck: 0.8 });

  const post = { ...GRADING.studio, strahlen: 0.5, strahlenPunkt: [0.2, 9.4, 2.2], strahlenSchwelle: 1.4, strahlenLaenge: 0.7, strahlenFarbe: [1, 0.95, 0.88] };
  const cA = new THREE.Color(KUPFER), cB = new THREE.Color(GRUEN), cE = new THREE.Color(ELFENBEIN);
  const welt = { szene, kamera, post, update: null };
  welt.update = (x) => {
    const s = zustand(x);
    aktualisiere(x);
    // Münzen: erste Tasse = eine Münze, danach wächst der Stapel mit der Steuer (1 Münze ≈ 30 €); fällt eine neue, sieht man sie fallen
    const coins = Math.max(x >= tCoin ? R(x, tCoin, tCoin + 0.7, ease.linear) : 0, s.tom / 30);
    PA_.stapel.setze(coins); PB_.stapel.setze(0);
    // Waage kippt zu Tom (links = negativ)
    wg.setze(-clamp(0.14 * R(x, tCoin + 0.4, tCoin + 1.2) + 0.28 * clamp(s.tom / 1154.66), 0, 0.5));
    // Kalenderwand: ein Jahr = eine Kachel in Toms Farbe
    const jf = Math.floor(s.jahr), fr = s.jahr - jf;
    kal.faerbe((i) => (i < jf ? 1 : i === jf ? fr : 0), 1.9);
    kal.visible = x > tK0 - 0.8 && x < T("pointe:Und") - 0.2;
    // Licht
    const pa = summe(tPA, x), pb = summe(tPB, x), pu = summe(tPU, x, 0.9);
    spotA.intensity = 7 * (0.45 + 0.8 * Math.min(1.4, pa) + 0.5 * fenster(x, tK0, tErg + 2, 0.8, 0.8));
    spotB.intensity = 7 * (0.45 + 0.8 * Math.min(1.4, pb));
    spotU.intensity = 7 * (0.55 + 0.6 * Math.min(1.4, pu) + 0.5 * fenster(x, T("wendung3:Noch"), T("wendung3:Pro") + 1.5));
    PA_.dio.led.color.copy(cA).multiplyScalar(1.0 + 1.6 * Math.min(1.5, pa)); PB_.dio.led.color.copy(cB).multiplyScalar(1.0 + 1.6 * Math.min(1.5, pb));
    PA_.lampe.led.color.copy(cA.clone().lerp(cE, 0.6)).multiplyScalar(PA_.lampe.staerke * (0.8 + 0.4 * Math.min(1, pa)));
    blitz.intensity = 4 * Math.exp(-(((x - tErg) / 0.2) ** 2)) + 2.5 * Math.exp(-(((x - T("pointe:Millionen")) / 0.2) ** 2));
    PA_.ta.scale.setScalar(4.2 * (1 + 0.12 * puls(x, T("wendung3:Pro"), 0.8)));
    post.bloomStaerke = GRADING.studio.bloomStaerke * (1 + 0.35 * puls(x, tErg, 1.6) + 0.2 * fenster(x, tK0, tErg, 1, 1));
    regie.anwenden(x);
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "€", nk: 2, max: 9999.99 }, rechts: { team: "b", einheit: "€", nk: 2, max: 9999.99 }, vorn: "hoch",
    werte: (x) => ({ a: zustand(x).tom, b: 0 }),
    uhr: { ein: tK0 - 0.2, zeit: (x) => Math.max(1, zustand(x).jahr), format: (v) => `JAHR ${Math.round(v)}`, label: "LEBEN" },
  });
  const fAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 0.005 && w.b < 0.005 ? 0 : fAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "voll", y = 490) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (k, d = 0.12) => T(k) - d;
  // Statuszeile
  chip("EXTRA-STEUER IM LEBEN", 0.05, v("rennen:Die", 0.4), "akzent", "hell", 372);
  chip("STUFE 1 · TASSE FÜR TASSE", v("rennen:Die", 0.05), v("wendung1:Denn", 0.4), "akzent", "voll", 372);
  chip("RÜCKBLICK · TEESTEUER BIS 1992", v("wendung1:Denn", 0.05), v("wendung2:Zurück", 0.4), "akzent", "voll", 372);
  chip("STEUER AUF DIE STEUER", v("wendung2:Zurück", 0.05), v("wendung3:Noch", 0.4), "akzent", "voll", 372);
  chip("LÖSLICHER KAFFEE", v("wendung3:Noch", 0.05), v("kipp:Jetzt", 0.4), "akzent", "voll", 372);
  chip("ZEITRAFFER · 60 JAHRE", v("kipp:Jetzt", 0.05), v("ergebnis:Endstand", 0.2), "akzent", "voll", 372);
  // Regeln
  chip("TOM · KAFFEE", v("regeln:Tom", 0.1), v("falle:Klar", 0.1), "a", "voll", 490);
  chip("MIA · TEE", v("regeln:Mia", 0.1), v("falle:Klar", 0.1), "b", "voll", 600);
  chip("3 TASSEN AM TAG", v("regeln:3", 0.1), v("falle:Klar", 0.1), "akzent", "hell", 710);
  chip("60 JAHRE", v("regeln:60", 0.1), v("falle:Klar", 0.1), "akzent", "hell", 820);
  // Rennen
  chip("7,5 G KAFFEE JE TASSE", v("rennen:7,5", 0.1), v("rennen:Darauf", 0.1), "a", "hell", 490);
  chip("KAFFEESTEUER · 2,19 € JE KILO", v("rennen:Darauf", 0.1), v("wendung1:Denn", 0.2), "a", "voll", 490);
  chip("MIA · 0 €", v("rennen:Mias", 0.1), v("wendung1:Denn", 0.2), "b", "voll", 600);
  // Wendung 1: Teesteuer bis 1992
  chip("TEESTEUER BIS 1992", v("wendung1:Teesteuer", 0.1), v("wendung2:Zurück", 0.2), "b", "voll", 490);
  chip("4,15 MARK = 2,12 € JE KILO", v("wendung1:4,15", 0.1), v("wendung2:Zurück", 0.2), "b", "voll", 600);
  chip("KAFFEE HEUTE · 2,19 €", v("wendung1:Fast", 0.1), v("wendung2:Zurück", 0.2), "a", "voll", 710);
  // Wendung 2
  chip("1,64 CENT JE TASSE", v("wendung2:1,64", 0.1), v("wendung3:Noch", 0.2), "a", "voll", 490);
  chip("+ 7 % UMSATZSTEUER DARAUF", v("wendung2:7", 0.1), v("wendung3:Noch", 0.2), "a", "hell", 600);
  chip("= 1,76 CENT JE TASSE", v("wendung2:Steuer#2", 0.2), v("wendung3:Noch", 0.2), "a", "voll", 710);
  // Wendung 3
  chip("LÖSLICH · 4,78 € JE KILO", v("wendung3:4,78", 0.1), v("kipp:Jetzt", 0.2), "a", "voll", 490);
  chip("JE TASSE NUR 0,86 CENT", v("wendung3:Pro", 0.1), v("kipp:Jetzt", 0.2), "a", "voll", 600);
  // Kipp
  chip("10 JAHRE · 192 €", v("kipp:192", 0.1), v("ergebnis:Endstand", 0.2), "a", "voll", 490);
  chip("30 JAHRE · 577 €", v("kipp:577", 0.1), v("ergebnis:Endstand", 0.2), "a", "voll", 600);
  chip("MIA · IMMER NOCH 0 €", v("kipp:Mia", 0.1), v("ergebnis:Endstand", 0.2), "b", "voll", 710);
  // Ergebnis, Warum, Pointe, Schlusskarte
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 400, titel: "EXTRA-STEUER NACH 60 JAHREN", ein: tErg + 0.25, aus: v("warum:Warum", 0.1),
    zeilen: [{ label: "TOM · KAFFEE", wert: Z.ende, einheit: "€", nk: 2, team: "a", ein: T("ergebnis:Tom") }, { label: "MIA · TEE", wert: 0, einheit: "€", nk: 2, team: "b", ein: T("ergebnis:Mia") }],
    differenz: { label: "TOM ZAHLT MEHR", wert: Z.ende, einheit: "€", nk: 2, ein: T("ergebnis:Mia") + 0.5 } });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 400, titel: "WARUM?", ein: T("warum:Warum") + 0.3, aus: v("pointe:Und", 0.7), max: 2.5,
    faktoren: [{ label: "STEUER JE KILO · KAFFEE GEGEN TEE", ein: T("warum:Kaffee"), a: { wert: 2.19, text: "2,19 €" }, b: { wert: 0, text: "0 €" }, tag: "TEE SEIT 1993 FREI", tagEin: T("warum:1993") }] });
  chip("BUND · 2,84 MIO. € JE TAG", v("pointe:Millionen", 0.2), v("schlusskarte:Gleicher", 0.2), "akzent", "voll", 490);
  chip("1.038 MIO. € KAFFEESTEUER 2025", v("pointe:Bund", 0.1), v("schlusskarte:Gleicher", 0.2), "akzent", "hell", 600);
  M.titel({ woerter: [{ text: "KAFFEE", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "TEE", ein: -0.3, team: "b" }, { umbruch: true }, { text: "WER ZAHLT MEHR", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "KAFFEESTEUER IM LEBEN?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: T("regeln:Tom") + 0.6 });
  M.pointe({ woerter: [{ text: "GLEICHER DURST –", ein: T("schlusskarte:Gleicher"), farbe: "akzent" }, { umbruch: true }, { text: "NUR KAFFEE", ein: T("schlusskarte:nur"), farbe: "a" }, { umbruch: true }, { text: "ZAHLT EXTRA.", ein: T("schlusskarte:extra"), farbe: "a" }], ein: T("schlusskarte:Gleicher"), y: 470, groesse: 88 });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (jede Zeile ist im Bild zu sehen) ----------
  const evs = [];
  const ev = (x, klang, text) => { evs.push(x); M.melde({ t: x, typ: "welt", klang, text }); };
  PA.forEach((k) => ev(T(k), "pop", "Toms Küche leuchtet, Tasse dampft, Licht pulsiert"));
  PB.forEach((k) => ev(T(k), "pop", "Mias Küche leuchtet, Tee dampft, Licht pulsiert"));
  PU.forEach((k) => ev(T(k), "klick", "Waage und Kalenderwand im Licht, Kamera gleitet"));
  ev(0.4, "pop", "Zwei Küchen leuchten auf, Dampf steigt, Kamera schiebt sich heran");
  ev(tCoin, "ding", "Erste Münze fällt in Toms Stapel, Waage neigt sich zu Tom"); ev(T("rennen:Mias"), "klick", "Mias Stapel bleibt leer");
  ev(T("wendung1:Denn"), "whoosh", "Rückblick: Kamera zu Mias Teetasse"); ev(T("wendung1:1992"), "ding", "Teesteuer bis 1992, Zoom auf Mias Tasse");
  ev(T("wendung2:Zurück"), "whoosh", "Zurück zu Tom, Kamera nah"); ev(T("wendung2:Steuer#2"), "ding", "Steuer auf die Steuer: Chip 1,76 Cent");
  ev(T("wendung3:Noch"), "whoosh", "Löslicher Kaffee: Spot auf Toms Tasse"); ev(T("wendung3:Pro"), "ding", "Je Tasse nur die Hälfte, Tasse pulsiert");
  ev(tK0, "whoosh", "Zeitraffer: Kalenderwand leuchtet, Jahre laufen, Stapel wächst"); ev(t10, "ding", "10 Jahre: 192 €"); ev(t30, "ding", "30 Jahre: 577 €");
  ev(tErg, "whoosh", "Kamera zurück, Bilanzkarte, Lichtblitz"); ev(T("ergebnis:1.154,66"), "ding", "Toms Steuer 1.154,66 €, Zoom");
  ev(T("warum:Warum"), "whoosh", "Erklärgrafik Warum"); ev(T("warum:1993"), "ding", "Tee seit 1993 steuerfrei");
  ev(T("pointe:Millionen"), "ding", "Bund nimmt 2,84 Mio. € täglich ein, Lichtblitz");
  ev(T("schlusskarte:Gleicher"), "akzent", "Studio dunkelt ab, Schlusskarte"); ev(T("schlusskarte:extra"), "akzent", "Extra leuchtet");
  const sortiert = evs.slice().sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Dampf steigt, Staub schwebt im Lichtkegel"); }
    last = nxt;
  }

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (x) => { zl.zeichne(x, Math.round(x * FPS)); hud.update(x); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (x) => { regie.anwenden(x); hud.update(x); };
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "raum" });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
