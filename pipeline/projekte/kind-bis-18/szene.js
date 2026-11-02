// „Kind: Was kostet es wirklich bis 18?“ · Simulierbar · Stil 18 Dunkles Studio (Produktlicht)
// Zwei schwarze Sockel mit LED-Kante: links AUSGABEN (Münzturm wächst, Pink), rechts KINDERGELD (kleinerer Turm, Türkis).
// In der Mitte hinten ein Drehteller mit der Lebensphase als Modell (Kinderwagen → Kinderrad → Jugendfahrrad), davor ein
// Altersring mit 18 Stationen. Alle Zahlen kommen aus pipeline/sim/kind_bis_18.mjs (Destatis EVS 2018, Kindergeld 2026).
// Alles ist eine reine Funktion von t (jedes Bild einzeln renderbar); die Welt-Werte laufen über M.wert (Schleife: letztes Bild = erstes).
import * as THREE from "three";
import { SimBuehne, GRADING, rigStudio, spiegelBoden, lichtKegel, staub, lichtPfuetze, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { hohlkehle, wandLicht, muenzStapel, sockel, drehteller, altersRing, kinderwagen, kinderrad, jugendrad, windelPaket, erstausstattung, saeule } from "../../engine/stil_studio.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes } from "../../engine/bewegung.js";
import { ausgabenBis, kindergeldBis, videoZahlen, AUSGABEN, KINDERGELD } from "../../sim/kind_bis_18.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const AUS = new Set((Q.get("aus") || "").split(","));
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: LED-Kante, Lichtfleck, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb.
const PINK = "#FF4F9A"; // AUSGABEN
const TUERKIS = "#2EC4B6"; // KINDERGELD
const ELFENBEIN = "#ECE6DA"; // Akzent (Drehteller, Lücke, Ergebnis)
const euro = (v) => `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.round(v))} €`;
const MUENZ = 6000; // eine Münze = 6.000 €
const Z = videoZahlen();

// ---------- kleine HUD-Bausteine nur für dieses Video ----------
/** Quellenzeile unter der Ausgaben-Karte */
class Quelle {
  constructor(M, { text, ein, aus, x, y }) {
    this.ein = M.zeit(ein); this.aus = M.zeit(aus);
    this.e = el("div", "ms kb-quelle", text, M.hud.wurzel);
    this.x = x; this.y = y;
    this.b = this.e.offsetWidth;
    this._ev = [{ t: this.ein, typ: "chip", klang: false, text }];
  }
  ereignisse() { return this._ev; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const k = clamp((t - this.ein) / 0.4) * (1 - clamp((t - this.aus) / 0.3));
    this.e.style.opacity = String(k);
    this.e.style.transform = `translate(${(this.x - this.b / 2).toFixed(1)}px, ${(this.y + (1 - k) * 10).toFixed(1)}px)`;
  }
}
/** Warum-Karte: Ausgaben pro Monat als steigende Säulen (Pink), Kindergeld als flache Säulen (Türkis); Reihen wachsen nacheinander auf */
class WarumKarte {
  constructor(M, { ein, aus, y = 470, reihen }) {
    this.M = M; this.ein = M.zeit(ein); this.aus = M.zeit(aus); this.y = y;
    this.e = el("div", "ms ms-karte kb-warum", `<div class="ms-kk"><i></i>WARUM?</div>`, M.hud.wurzel);
    this.e.style.width = SICHER.breite + "px";
    const max = Math.max(...reihen.flatMap((r) => r.werte));
    this.reihen = reihen.map((r) => {
      const box = el("div", "kb-reihe", `<div class="kb-kopf"><i></i><span>${r.label}</span></div>`, this.e);
      M.setzeFarbe(box, r.team);
      const sa = el("div", "kb-saeulen", "", box);
      el("div", "kb-unter", r.unter.map((u) => `<span>${u}</span>`).join(""), box);
      const s = r.werte.map((w, i) => { const c = el("div", "kb-s", `<span>${euro(w)}</span><b style="height:${(w / max * 84).toFixed(1)}px"></b>`, sa); return { c, b: c.querySelector("b"), z: c.querySelector("span"), t: M.zeit(r.ein) + i * 0.36 }; });
      const voll = box.scrollHeight;
      box.style.overflow = "hidden";
      return { box, s, t: M.zeit(r.ein), voll };
    });
    this._ev = this.reihen.map((r) => ({ t: r.t, typ: "balken", dauer: 0.7, klang: "wachsen", text: "warum" }));
  }
  ereignisse() { return this._ev; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    this.e.style.visibility = an ? "visible" : "hidden";
    for (const r of this.reihen) r.box.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const h = feder(t - this.ein, { frequenz: 2.5, daempfung: 0.52 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.25));
    this.e.style.transform = `translate(${SICHER.links}px, ${(this.y + (1 - h) * 50 - x * 26).toFixed(1)}px) scale(${(0.93 + 0.07 * h).toFixed(4)})`;
    this.e.style.opacity = String(clamp(h * 3) * (1 - x));
    for (const r of this.reihen) {
      const k = ease.outCubic(clamp((t - r.t + 0.1) / 0.5));
      r.box.style.height = (r.voll * k).toFixed(1) + "px";
      r.box.style.opacity = String(clamp((t - r.t + 0.1) / 0.2));
      for (const s of r.s) {
        const d = t - s.t;
        const kk = d < 0 ? 0 : Math.max(0, feder(d, { frequenz: 2.4, daempfung: 0.42 }));
        s.b.style.transform = `scaleY(${kk.toFixed(4)})`;
        s.z.style.opacity = String(clamp(d / 0.12));
      }
    }
  }
}

async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); } catch { timing = schaetzeTiming(skript); }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.55 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "AUSGABEN", farbe: PINK, woerter: ["Ausgaben*", "ausgeben", "Eltern"] },
      b: { name: "KINDERGELD", farbe: TUERKIS, woerter: ["Kindergeld*"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // =====================================================================================
  // Zeitachse (alles an Wortzeiten): Alter 0 → 18
  // =====================================================================================
  const tJahr = T("rennen:Jahr"), tSwap1 = T("wendung1:wächst") - 0.1, tSwap2 = T("wendung2:Jugend") - 0.05;
  const alterKeys = [
    { t: 0, v: 0 }, { t: tJahr, v: 0 },
    { t: tSwap1, v: 6, e: ease.inOutSine },                // Jahr 1–6 (Kinderwagen), Münzen regnen
    { t: T("wendung1:Ab") + 0.2, v: 6, e: ease.linear },
    { t: T("wendung1:links"), v: 12, e: ease.inOutSine },   // 6–12: Kinderrad
    { t: T("wendung2:Jetzt") - 0.7, v: 12, e: ease.linear },
    { t: T("wendung3:Fünfzehn"), v: 15, e: ease.inOutSine }, // 12–15 langsam: Jugendrad
    { t: T("wendung3:sechzehn"), v: 16, e: ease.linear },
    { t: T("wendung3:siebzehn"), v: 17, e: ease.linear },
    { t: T("wendung3:achtzehn"), v: 18, e: ease.outQuad },
  ];
  const alterF = (t) => keyframes(alterKeys, t);

  /** weiche Glocke: 0 → 1 (rein) → 1 → 0 (raus) */
  const fenster = (t, a, b, rein = 0.4, raus = 0.5) => ease.inOutSine(fortschritt(t, a, a + rein)) * (1 - ease.inOutSine(fortschritt(t, b - raus, b)));
  const puls = (t, t0, d = 0.7) => { const k = fortschritt(t, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const blitzF = (t, tc) => Math.exp(-(((t - tc) / 0.16) ** 2));
  const ein = (t, t0, f = { frequenz: 2.8, daempfung: 0.5 }) => Math.max(0, feder(t - t0, f));

  const tW = T("falle:Windeln"), tK = T("falle:Kinderwagen"), tE = T("falle:Erstausstattung"), tOder = T("falle:Oder"), tFalleEnde = T("rennen:Jahr") - 0.2;
  const tLinks = T("regeln:Links"), tRechts = T("regeln:Rechts"), t259 = T("regeln:259"), tRegelnEnde = T("falle:Klar") - 0.1;
  const tErg = T("ergebnis:Ausgaben"), tBleiben = T("ergebnis:Bleiben");
  const tUeb = T("ueberraschung:Die"), tSaeuleB = T("ueberraschung:6"), tSaeuleA = T("ueberraschung:ersten"), tDiff = T("ueberraschung:19.728");
  const tMerk = T("merksatz:Ein");

  // Zustand der Welt (nur Zahlen; die Schleife lässt alles weich zum Anfangszustand zurückgleiten)
  const zustandRoh = (t) => {
    const alter = alterF(t);
    const aus1 = ease.inCubic(fortschritt(t, tSwap1 - 0.3, tSwap1 + 0.05)), aus2 = ease.inCubic(fortschritt(t, tSwap2 - 0.3, tSwap2 + 0.05));
    const blendeAus = ease.inCubic(fortschritt(t, tUeb - 0.5, tUeb)); // Modell macht Platz für die Säulen
    const modellAn = 1 - blendeAus;
    const sW = (1 - aus1) * modellAn;
    const sR = (t < tSwap1 ? 0 : ein(t, tSwap1 + 0.05, { frequenz: 2.4, daempfung: 0.46 })) * (1 - aus2) * modellAn;
    const sJ = (t < tSwap2 ? 0 : ein(t, tSwap2 + 0.05, { frequenz: 2.4, daempfung: 0.46 })) * modellAn;
    const denkAus = 1 - ease.inCubic(fortschritt(t, tFalleEnde - 0.35, tFalleEnde));
    const regelnMitte = fenster(t, T("falle:Klar") - 0.3, tFalleEnde, 0.6, 0.6);
    return {
      alter, ausg: ausgabenBis(alter), kg: kindergeldBis(alter),
      sW, sR, sJ,
      sWindel: (t < tW ? 0 : ein(t, tW)) * denkAus, sErst: (t < tE ? 0 : ein(t, tE)) * denkAus,
      wagenPuls: puls(t, tK, 0.9) + puls(t, T("falle:Babys"), 0.9),
      blitz: blitzF(t, tSwap1 + 0.05) + blitzF(t, tSwap2 + 0.05) + 0.6 * blitzF(t, tUeb - 0.1),
      dreh: 0.5 * Math.sin(0.3 * t) + 2 * Math.PI * ease.inOutCubic(fortschritt(t, tSwap1 - 0.3, tSwap1 + 0.9)) + 2 * Math.PI * ease.inOutCubic(fortschritt(t, tSwap2 - 0.3, tSwap2 + 0.9)),
      ledL: 1 + 0.9 * puls(t, 0.5, 0.9) + 1.2 * puls(t, T("hook:Geld")) + 1.0 * puls(t, T("regeln:Eltern")) + 1.3 * puls(t, tLinks) + 1.0 * puls(t, T("wendung1:786")) + 1.4 * puls(t, T("wendung1:105.480"), 0.9) + 1.0 * puls(t, T("wendung2:953")) + 1.6 * puls(t, T("ergebnis:174.096"), 1.0) + 2.2 * puls(t, T("ergebnis:118.152"), 1.2) + 1.0 * puls(t, T("warum:Ausgaben")) + 1.0 * puls(t, T("warum:Alter")),
      ledR: 1 + 0.9 * puls(t, 0.5, 0.9) + 1.2 * puls(t, T("hook:Geld")) + 1.3 * puls(t, tRechts) + 1.0 * puls(t, T("regeln:Kindergeld")) + 1.0 * puls(t, T("regeln:Monat")) + 1.0 * puls(t, t259) + 1.0 * puls(t, T("wendung1:37.296")) + 1.0 * puls(t, T("wendung3:Viertel")) + 1.6 * puls(t, T("ergebnis:55.944"), 1.0) + 1.0 * puls(t, T("warum:Kindergeld")) + 1.0 * puls(t, T("warum:nicht")),
      ledP: 1 + 1.2 * puls(t, T("hook:Jahre"), 0.9) + 1.2 * puls(t, T("hook:wirklich"), 0.9) + 1.0 * puls(t, T("falle:teuersten"), 0.9) + 1.3 * puls(t, T("falle:Oder"), 1.0) + 1.0 * puls(t, tSwap1 + 0.05, 1.0) + 1.0 * puls(t, tSwap2 + 0.05, 1.0) + 1.4 * puls(t, tDiff, 1.0) + 1.0 * puls(t, tDiff + 1.3, 0.9),
      spotM: 0.45 + 0.9 * regelnMitte + 0.25 * fenster(t, tSwap1 - 0.6, tSwap1 + 1.2) + 0.25 * fenster(t, tSwap2 - 0.5, tSwap2 + 1.5) + 0.7 * fenster(t, T("wendung3:Fünfzehn") - 0.5, T("wendung3:achtzehn") + 0.8) + 0.8 * fenster(t, tUeb - 0.3, tMerk - 0.3),
      spotL: 0.5 + 1.1 * fenster(t, tLinks - 0.2, tRechts - 0.1, 0.4, 0.5) + 0.5 * fenster(t, T("wendung1:links") - 0.4, T("wendung1:Rechts") - 0.1) + 1.2 * fenster(t, tErg, T("ergebnis:Minus") - 0.1, 0.5, 0.5) + 1.4 * fenster(t, tBleiben - 0.3, tBleiben + 3.0, 0.4, 1.2),
      spotR: 0.5 + 1.1 * fenster(t, tRechts - 0.1, tRegelnEnde, 0.4, 0.6) + 0.8 * fenster(t, T("wendung1:Rechts") - 0.1, T("wendung2:Jetzt") - 0.2) + 1.2 * fenster(t, T("ergebnis:Minus"), tBleiben - 0.2, 0.5, 0.4),
      luecke: fenster(t, T("wendung1:links") - 0.2, tErg + 0.5, 0.6, 0.7),
      saeuleA: t < tSaeuleA ? 0 : ein(t, tSaeuleA, { frequenz: 1.8, daempfung: 0.6 }),
      saeuleB: t < tSaeuleB ? 0 : ein(t, tSaeuleB, { frequenz: 1.8, daempfung: 0.6 }),
      saeuleLuecke: fenster(t, tDiff - 0.1, tMerk + 1.0, 0.4, 0.8),
      glanz: fenster(t, tBleiben - 0.1, tBleiben + 2.4, 0.3, 1.2),
    };
  };
  const zustand = M.wert(zustandRoh);

  // =====================================================================================
  // Szene
  // =====================================================================================
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#050608");
  const ZIEL0 = [0, 1.45, 0];
  const rig = rigStudio(szene, buehne.renderer, {
    ziel: ZIEL0,
    softbox: { farbe: "#EAF1FF", staerke: 6, breite: 3.6, hoehe: 1.2, pos: [3.8, 4.4, 3.4] }, fuell: 0.22, umgebungsStaerke: 0.7,
    oben: { farbe: "#F4F8FF", staerke: 70, pos: [0.2, 9.5, 0.8], winkel: 0.42, rand: 0.6, schatten: SCHATTEN },
    kanten: [{ farbe: "#FFC7D8", staerke: 2.4, pos: [-6, 3.5, -5] }, { farbe: "#A8F0E6", staerke: 2.4, pos: [6, 3, -6] }],
  });
  szene.add(hohlkehle({ breite: 44, tiefe: 24, hoehe: 17, radius: 5, farbe: "#0B0C10", rau: 0.38 }));
  if (!AUS.has("spiegel")) { const sp = spiegelBoden({ breite: 30, tiefe: 14, staerke: 0.3, streckung: 1.2, unschaerfe: 1.4, fresnel: 0.5, aufloesung: 0.28, verzerrung: 0.3 }); sp.position.z = 0.5; szene.add(sp); }
  const wl = wandLicht({ breite: 10, hoehe: 7, farbe: "#242C42", staerke: 0.8 }); wl.position.set(0, 5.5, -11.85); szene.add(wl);
      if (!AUS.has("kegel")) {
    const k = lichtKegel({ hoehe: 9.4, radiusOben: 0.25, radiusUnten: 3.2, farbe: "#EEF4FF", staerke: 0.09, weich: 1.2, streifen: 0.6 });
    k.position.set(0.2, 9.5, 0.8); szene.add(k);
    szene.add(staub({ anzahl: 420, bereich: [7, 7, 7], mitte: [0, 3.5, -0.4], groesse: 0.012, staerke: 1.6, aussen: 0.0, kegel: { spitze: [0.2, 9.5, 0.8], richtung: [0, -1, 0], winkel: 0.4 } }));
  }
  // Zusatzlichter (ohne Schatten): Teamlicht auf den Sockeln, Spot auf dem Drehteller, Blitz beim Modellwechsel
  const spot = (farbe, pos, ziel, winkel) => { const s = new THREE.SpotLight(farbe, 0, 0, winkel, 0.7, 2); s.position.set(...pos); s.target.position.set(...ziel); szene.add(s, s.target); return s; };
  const spotL = spot("#FF86B8", [-1.6, 7.5, 3.0], [-1.05, 1.6, 1.2], 0.3), spotR = spot("#7FE8DC", [1.6, 7.5, 3.0], [1.05, 1.2, 1.2], 0.3);
  const spotM = spot("#FFF4E6", [0.2, 8.5, 0.5], [0, 0.6, -1.7], 0.26);
  const blitz = new THREE.PointLight("#FFFFFF", 0, 0, 2); blitz.position.set(0, 1.6, -0.6); szene.add(blitz);

  // Sockel mit Münztürmen
  const SX = 0.85, SZ = 1.3;
  const sockA = sockel({ breite: 0.8, hoehe: 0.62, tiefe: 0.8, farbe: PINK, led: 3.5, fleck: 0.5 }); sockA.position.set(-SX, 0, SZ);
  const sockB = sockel({ breite: 0.8, hoehe: 0.62, tiefe: 0.8, farbe: TUERKIS, led: 3.5, fleck: 0.5 }); sockB.position.set(SX, 0, SZ);
  szene.add(sockA, sockB);
  // LED-Kanten mit eigener Helligkeit (Aufleuchten): zusätzliche Linie über der festen
  const ledMat = (farbe) => leuchtMat(farbe, 1, { neu: true });
  const ledA = ledMat(PINK), ledB = ledMat(TUERKIS);
  const ledLinie = (mat, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.022, 0.022), mat); m.position.set(x, 0.622, SZ + 0.41); m.userData.dynamisch = true; return m; };
  szene.add(ledLinie(ledA, -SX), ledLinie(ledB, SX));
  const dickeM = 0.07, radM = 0.27;
  const turmA = muenzStapel({ art: "kupfer", max: 34, radius: radM, dicke: dickeM, unordnung: 0.03, seed: 11, fallHoehe: 0.75 });
  const turmB = muenzStapel({ art: "silber", max: 14, radius: radM, dicke: dickeM, unordnung: 0.03, seed: 5, fallHoehe: 0.75 });
  turmA.position.set(-SX, sockA.oben, SZ); turmB.position.set(SX, sockB.oben, SZ);
  // Münzen etwas matter und weniger spiegelnd, damit fallende Münzen nahe der Kamera nicht ausbrennen (Bloom)
  for (const [t, k] of [[turmA, 0.8], [turmB, 0.75]]) for (const m of t.children[0].material) { m.envMapIntensity = 0.55; m.roughness = Math.min(0.55, m.roughness + 0.2); m.color.multiplyScalar(k); }
  szene.add(turmA, turmB);

  // Drehteller mit Modellen, Altersring
  const PZ = -2.6;
  const teller = drehteller({ radius: 0.85, led: ELFENBEIN, ledStaerke: 2.2 }); teller.position.set(0, 0, PZ); szene.add(teller);
  const ring = altersRing({ radius: 1.3 }); ring.position.set(0, 0, PZ); szene.add(ring);
  const wagen = kinderwagen(), rad1 = kinderrad(), rad2 = jugendrad();
  wagen.scale.setScalar(0.7); rad1.scale.setScalar(0.82); rad2.scale.setScalar(0.57);
  wagen.position.x = 0.0; rad1.position.x = 0.0; rad2.position.x = 0.0;
  for (const m of [wagen, rad1, rad2]) { m.userData.dynamisch = true; teller.modell.add(m); }
  const paket = windelPaket(), erst = erstausstattung();
  paket.position.set(-0.66, teller.oben, PZ + 0.5); paket.rotation.y = 0.45; paket.scale.setScalar(0.48);
  erst.position.set(0.64, teller.oben, PZ + 0.5); erst.rotation.y = -0.45; erst.scale.setScalar(0.48);
  for (const m of [paket, erst]) { m.userData.dynamisch = true; szene.add(m); }
  // Säulen der Überraschung (auf dem Drehteller): Jahre 1–6 links, Jahre 13–18 rechts, Ausgaben in Pink
  const HK = 1 / 44000; // Höhe je Euro
  const sA = saeule({ breite: 0.42, farbe: PINK, staerke: 2.4 }), sB = saeule({ breite: 0.42, farbe: PINK, staerke: 2.8 });
  sA.position.set(-0.38, teller.oben, PZ); sB.position.set(0.38, teller.oben, PZ);
  szene.add(sA, sB);
  // Lücken-Anzeige: waagerechte Linie in Höhe des linken Turms, senkrechte Klammer rechts (Elfenbein)
  const lueckeMat = ledMat(ELFENBEIN);
  const lV = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1, 0.016), lueckeMat);
  const lT = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.016), lueckeMat), lT2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.016), lueckeMat);
  const striche = Array.from({ length: 14 }, () => new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.012), lueckeMat));
  for (const m of [lV, lT, lT2, ...striche]) { m.userData.dynamisch = true; m.visible = false; szene.add(m); }
  const lueckeMat2 = ledMat(ELFENBEIN);
  const sLH = new THREE.Mesh(new THREE.BoxGeometry(1, 0.016, 0.016), lueckeMat2), sLV = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1, 0.016), lueckeMat2);
  for (const m of [sLH, sLV]) { m.userData.dynamisch = true; m.visible = false; szene.add(m); }
  buendeln(szene);

  // =====================================================================================
  // Kamera (Fahrten, mal Zoom, mal Weitwinkel) und Update der Welt
  // =====================================================================================
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(0.5, 5.2, 14.8, 0, 0.9, -0.6) },
    { t: T("hook:Wie"), v: C(0.3, 4.9, 13.6, 0, 0.95, -0.5), e: ease.inOutSine },
    { t: tLinks - 0.2, v: C(0.0, 4.4, 12.0, 0, 1.0, 0), e: ease.inOutSine },
    { t: T("regeln:Statistikamt"), v: C(-1.6, 3.4, 10.0, -1.2, 1.0, 1.3), e: ease.inOutCubic },
    { t: tRechts - 0.25, v: C(-1.2, 3.3, 9.8, -1.1, 1.0, 1.3), e: ease.inOutSine },
    { t: T("regeln:Kindergeld") + 0.5, v: C(1.6, 3.3, 10.0, 1.2, 0.8, 1.3), e: ease.inOutCubic },
    { t: tRegelnEnde, v: C(1.0, 3.2, 9.6, 1.1, 0.8, 1.3), e: ease.inOutSine },
    { t: tW - 0.4, v: C(0.0, 3.8, 8.4, 0, 0.9, PZ + 0.3, 28), e: ease.inOutCubic },
    { t: tOder, v: C(0.0, 3.4, 7.0, 0, 0.95, PZ + 0.3, 26), e: ease.inOutSine },
    { t: tFalleEnde, v: C(0.05, 3.4, 6.9, 0, 0.95, PZ + 0.3, 26), e: ease.linear },
    { t: tJahr + 1.8, v: C(1.3, 5.0, 14.4, 0.1, 1.0, -0.4, 30), e: ease.inOutCubic },
    { t: tSwap1 - 1.0, v: C(0.9, 4.2, 11.0, 0, 1.1, -1.0, 30), e: ease.inOutSine },
    { t: tSwap1 + 0.4, v: C(0.2, 3.6, 10.4, 0, 1.0, PZ + 0.3, 26), e: ease.inOutCubic },
    { t: T("wendung1:Nach") + 0.5, v: C(-1.6, 3.6, 10.2, 0, 1.2, -0.6, 30), e: ease.inOutCubic },
    { t: T("wendung1:links") - 0.4, v: C(-0.6, 3.8, 11.8, 0, 1.3, 0.4, 30), e: ease.inOutSine },
    { t: T("wendung1:105.480") + 0.3, v: C(0.0, 3.6, 12.2, 0, 1.3, 0.8, 30), e: ease.inOutCubic },
    { t: T("wendung1:37.296") + 0.4, v: C(0.0, 3.3, 11.0, 0, 1.3, 0.8, 28), e: ease.inOutSine },
    { t: tSwap2 + 0.3, v: C(0.6, 3.0, 9.8, 0, 1.1, PZ + 0.3, 27), e: ease.inOutCubic },
    { t: T("wendung2:40") + 0.6, v: C(-0.5, 3.1, 10.0, 0, 1.1, PZ + 0.3, 27), e: ease.inOutSine },
    { t: T("wendung3:Das"), v: C(1.6, 4.6, 13.2, 0.1, 1.2, 0, 30), e: ease.inOutCubic },
    { t: T("wendung3:Es") + 0.5, v: C(0.4, 4.2, 12.4, 0.1, 1.2, 0, 30), e: ease.inOutSine },
    { t: T("wendung3:achtzehn"), v: C(0.1, 3.6, 10.4, 0, 1.1, PZ + 0.3, 25), e: ease.inOutQuad },
    { t: tErg + 0.8, v: C(0, 5.0, 12.8, 0, 1.5, 0, 30), e: ease.inOutCubic },
    { t: tErg + 3.4, v: C(0, 5.5, 14.8, 0, 1.5, -0.3, 30), e: ease.inOutSine },
    { t: T("warum:Warum"), v: C(1.2, 4.6, 14.4, 0, 1.5, 0, 30), e: ease.inOutSine },
    { t: T("warum:Zweitens") + 0.6, v: C(-1.2, 4.4, 14.2, 0, 1.5, 0, 30), e: ease.inOutSine },
    { t: tUeb - 0.1, v: C(-0.8, 3.9, 11.6, 0, 1.2, -1.0, 30), e: ease.inOutCubic },
    { t: tSaeuleB + 0.3, v: C(0.0, 3.8, 10.6, 0, 1.2, PZ + 0.3, 27), e: ease.inOutCubic },
    { t: tMerk - 0.2, v: C(0.8, 3.6, 10.2, 0, 1.2, PZ + 0.3, 27), e: ease.inOutSine },
  ];
  const regie = new Regie(kamera, (t) => { const v = keyframes(camKeys, t); const z = v.slice(3, 6), D = 1.16; return { pos: [0, 1, 2].map((i) => z[i] + (v[i] - z[i]) * D), ziel: z, fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  // Zoom auf die Ergebnisse (mal ja, mal nein): kurzer Heranzoom auf den linken Turm beim Ergebnis
  regie.zoom({ t: T("ergebnis:174.096") + 0.7, ziel: [-SX, 1.6, SZ], staerke: 0.14, halt: 0.9, rueck: 0.8 });
  regie.zoom({ t: T("wendung1:105.480") + 0.6, ziel: [-SX, 1.8, SZ], staerke: 0.12, halt: 1.0, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:55.944") + 0.9, ziel: [SX, 1.2, SZ], staerke: 0.18, halt: 1.0, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:118.152"), ziel: [-0.7, 2.0, 1.2], staerke: 0.22, halt: 1.3, rueck: 1.0 });
  regie.schleife({ ab: tMerk, ende: DAUER - 1 / FPS });

  const post = { ...GRADING.studio, strahlen: AUS.has("strahlen") ? 0 : 0.55, strahlenPunkt: [0.2, 9.4, 0.8], strahlenSchwelle: 1.4, strahlenLaenge: 0.7, strahlenFarbe: [1, 0.95, 0.88] };
  const pa = new THREE.Vector3(), tmp = new THREE.Vector3();
  const farbeA = new THREE.Color(PINK), farbeB = new THREE.Color(TUERKIS), farbeE = new THREE.Color(ELFENBEIN);
  const welt = { szene, kamera, post, update: null };
  welt.update = (t) => {
    const s = zustand(t);
    // Münztürme
    // am Ende rastet der Turm auf ganze Münzen (keine schwebende Münze im Standbild)
    const rast = (x, k) => lerp(x, Math.round(x), k);
    const kRast = ease.inOutSine(clamp((s.alter - 17.2) / 0.8));
    const cA = rast(s.ausg / MUENZ, kRast), cB = rast(s.kg / MUENZ, kRast);
    turmA.setze(cA); turmB.setze(cB);
    const hA = turmA.hoehe(cA), hB = turmB.hoehe(cB);
    // Drehteller und Modelle
    teller.dreh(s.dreh);
    wagen.scale.setScalar(Math.max(1e-4, 0.7 * s.sW)); wagen.visible = s.sW > 0.002;
    rad1.scale.setScalar(Math.max(1e-4, 0.82 * s.sR)); rad1.visible = s.sR > 0.002;
    rad2.scale.setScalar(Math.max(1e-4, 0.57 * s.sJ)); rad2.visible = s.sJ > 0.002;
    const rolle = s.alter * 5.5;
    wagen.rolle(rolle); rad1.rolle(rolle); rad2.rolle(rolle);
    wagen.position.y = 0.02 + 0.03 * s.wagenPuls; wagen.rotation.y = 0.35 * Math.sin(s.wagenPuls * Math.PI);
    teller.led.setze(s.ledP);
    ring.setze(s.alter, ELFENBEIN, 1.5);
    paket.scale.setScalar(Math.max(1e-4, 0.48 * s.sWindel)); paket.visible = s.sWindel > 0.002; paket.position.y = teller.oben + (1 - clamp(s.sWindel)) * 0.9;
    erst.scale.setScalar(Math.max(1e-4, 0.48 * s.sErst)); erst.visible = s.sErst > 0.002; erst.position.y = teller.oben + (1 - clamp(s.sErst)) * 0.9;
    // Säulen
    sA.setze(s.saeuleA * ausgabenBis(6) * HK); sB.setze(s.saeuleB * (AUSGABEN[2] * 72) * HK);
    sA.led(1 + 0.8 * s.saeuleLuecke); sB.led(1 + 0.8 * s.saeuleLuecke);
    // LED-Helligkeit (Aufleuchten)
    ledA.color.copy(farbeA).multiplyScalar(2.2 * s.ledL); ledB.color.copy(farbeB).multiplyScalar(2.2 * s.ledR);
    // Lichter
    spotL.intensity = 34 * s.spotL; spotR.intensity = 34 * s.spotR; spotM.intensity = 70 * s.spotM;
    blitz.intensity = 8 * s.blitz;
    post.bloomStaerke = GRADING.studio.bloomStaerke * (1 + 0.45 * Math.min(1, s.blitz) + 0.5 * s.glanz);
    // Lücke zwischen den Türmen (Elfenbein): Linie in Höhe von Turm A, Klammer rechts von Turm B
    const yA = sockA.oben + hA, yB = sockB.oben + hB, vis = s.luecke > 0.01 && yA - yB > 0.05;
    const k = Math.min(1, s.luecke);
    lueckeMat.color.copy(farbeE).multiplyScalar(1.15 * k);
    const xR = SX + radM + 0.17;
    lV.visible = lT.visible = lT2.visible = vis;
    striche.forEach((m, i) => { m.visible = vis; if (vis) { const x0 = -SX + radM + 0.08, x1 = xR - 0.12; m.position.set(x0 + (x1 - x0) * (i / (striche.length - 1)), yA, SZ + 0.02); } });
    if (vis) {
      const len = (yA - yB) * k; lV.scale.y = Math.max(0.001, len); lV.position.set(xR, yA - len / 2, SZ + 0.02);
      lT.position.set(xR, yA, SZ + 0.02); lT2.position.set(xR, yA - len, SZ + 0.02);
    }
    // Lücke der Säulen (Jahre 13–18 gegen Jahre 1–6)
    const hSA = s.saeuleA * ausgabenBis(6) * HK, hSB = s.saeuleB * (AUSGABEN[2] * 72) * HK, ys = teller.oben;
    const vis2 = s.saeuleLuecke > 0.01 && hSB - hSA > 0.03;
    sLH.visible = sLV.visible = vis2;
    if (vis2) {
      const kk = Math.min(1, s.saeuleLuecke);
      lueckeMat2.color.copy(farbeE).multiplyScalar(1.6 * kk);
      const len = (hSB - hSA) * kk;
      sLH.scale.x = 0.9; sLH.position.set(0, ys + hSB, PZ + 0.3);
      sLV.scale.y = Math.max(0.001, len); sLV.position.set(-0.05, ys + hSB - len / 2, PZ + 0.3);
    }
    aktualisiere(t);
    regie.anwenden(t);
    // Fokus (Tiefenschärfe): wandert mit dem Geschehen
    let fp = [0, 1.4, 0.2];
    if (t < tRegelnEnde) fp = s.spotL > s.spotR ? [-SX, 1.2, SZ] : [SX, 0.9, SZ];
    else if (t < tFalleEnde + 0.2) fp = [0, 0.9, PZ];
    else if (t > tUeb - 0.3 && t < tMerk) fp = [0, 1.0, PZ];
    else if (t > tSwap1 - 0.6 && t < tSwap1 + 1.6) fp = [0, 0.9, PZ];
    else if (t > tSwap2 - 0.4 && t < T("wendung3:Das")) fp = [0, 0.9, PZ];
    else if (t > T("wendung3:achtzehn") - 1.6 && t < tErg + 0.2) fp = [0, 0.95, PZ];
    Object.assign(post, fokus(kamera, fp, { tiefe: 0.2, nah: 0.5, fern: 0.7 }));
  };

  // =====================================================================================
  // HUD (design.md): Tafel ab Bild 0, Chips nur mit neuer Information, Quelle klein, keine Sticker
  // =====================================================================================
  M.tafel({
    y: 166,
    links: { team: "a", name: "AUSGABEN", einheit: "€", nk: 0, max: 999999 },
    rechts: { team: "b", name: "KINDERGELD", einheit: "€", nk: 0, max: 999999 },
    werte: (t) => { const s = zustandRoh(t); return { a: s.ausg, b: s.kg }; },
    vorn: null,
    uhr: { ein: "rennen:Jahr", zeit: (t) => (alterF(t) * 60) / 18, format: (sek) => String(Math.min(18, Math.floor((sek * 18) / 60 + 0.02))), label: "ALTER" },
  });
  M.melde({ t: 0.5, typ: "welt", klang: "pop", text: "LED-Kanten leuchten auf" });
  M.melde({ t: T("hook:Jahre"), typ: "welt", klang: "pop", text: "Drehteller-Ring leuchtet" });
  M.melde({ t: T("hook:Geld"), typ: "welt", klang: "ding", text: "beide Sockel leuchten" });
  M.melde({ t: T("hook:wirklich"), typ: "welt", klang: "pop", text: "Drehteller-Ring leuchtet" });
  M.melde({ t: tLinks, typ: "welt", klang: "pop", text: "Licht auf Ausgaben-Sockel" });
  M.melde({ t: T("regeln:Eltern"), typ: "welt", klang: "pop", text: "Ausgaben-Sockel leuchtet" });
  M.melde({ t: tRechts, typ: "welt", klang: "pop", text: "Licht auf Kindergeld-Sockel" });
  M.melde({ t: T("regeln:Kindergeld"), typ: "welt", klang: "pop", text: "Kindergeld-Sockel leuchtet" });
  M.melde({ t: T("regeln:Monat"), typ: "welt", klang: "pop", text: "Kindergeld-Sockel leuchtet" });
  M.melde({ t: T("falle:Klar"), typ: "welt", klang: "pop", text: "Spot auf den Drehteller" });
  M.melde({ t: T("falle:Babys"), typ: "welt", klang: "pop", text: "Kinderwagen dreht sich im Spot" });
  M.melde({ t: T("falle:teuersten"), typ: "welt", klang: "pop", text: "Drehteller-Ring leuchtet" });
  M.melde({ t: T("ergebnis:174.096"), typ: "welt", klang: "ding", text: "Ausgaben-Sockel leuchtet" });
  M.melde({ t: T("ergebnis:55.944"), typ: "welt", klang: "ding", text: "Kindergeld-Sockel leuchtet" });
  for (const w of ["warum:Ausgaben", "warum:Alter"]) M.melde({ t: T(w), typ: "welt", klang: "pop", text: "Ausgaben-Sockel leuchtet" });
  for (const w of ["warum:Kindergeld", "warum:nicht"]) M.melde({ t: T(w), typ: "welt", klang: "pop", text: "Kindergeld-Sockel leuchtet" });
  M.melde({ t: T("wendung1:105.480"), typ: "welt", klang: "ding", text: "Ausgaben-Sockel leuchtet, Lücke sichtbar" });
  M.melde({ t: T("falle:Oder"), typ: "welt", klang: "ding", text: "Ring leuchtet, Bild steht" });
  M.melde({ t: tDiff, typ: "welt", klang: "ding", text: "Differenz leuchtet" });
  M.melde({ t: tDiff + 1.3, typ: "welt", klang: "pop", text: "Drehteller-Ring leuchtet" });
  M.melde({ t: tSwap1 + 0.05, typ: "welt", klang: "whoosh", text: "Kinderwagen wird Kinderrad" });
  M.melde({ t: tSwap2 + 0.05, typ: "welt", klang: "whoosh", text: "Kinderrad wird Jugendfahrrad" });
  M.melde({ t: tW, typ: "welt", klang: "pop", text: "Windelpaket" });
  M.melde({ t: tK, typ: "welt", klang: "pop", text: "Kinderwagen im Spot" });
  M.melde({ t: tE, typ: "welt", klang: "pop", text: "Erstausstattung" });
  M.melde({ t: tSaeuleB, typ: "welt", klang: "wachsen", text: "Säule Jahre 13-18" });
  M.melde({ t: tSaeuleA, typ: "welt", klang: "wachsen", text: "Säule Jahre 1-6" });
  M.melde({ t: tBleiben, typ: "welt", klang: "ding", text: "Ergebnis leuchtet" });
  M.melde({ t: T("wendung1:Rechts"), typ: "welt", klang: "ding", text: "Lücke leuchtet" });
  M.melde({ t: T("wendung3:achtzehn"), typ: "welt", klang: "ding", text: "Alter 18" });

  hud.add(new Quelle(M, { text: "Destatis · EVS 2018", ein: "regeln:Statistikamt", aus: "wendung1:Doch", x: 345, y: 330 }));

  const reihe = 390, reihe2 = 498, reihe3 = 606, XL = 345, XR = 735;
  const vor = (w, d = 0.3) => T(w) - d; // alte Chips blenden vor dem neuen aus (keine Überlappung beim Wechsel)
  M.chip({ text: "259 € / MONAT", ein: "regeln:259", aus: vor("ergebnis:Ausgaben", 0.4), team: "b", art: "hell", x: XR, y: reihe, anker: "mitte" });
  M.chip({ text: "679 € / MONAT", ein: "rennen:679", aus: vor("wendung1:786"), team: "a", art: "hell", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "786 € / MONAT", ein: "wendung1:786", aus: vor("wendung2:953"), team: "a", art: "hell", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "953 € / MONAT", ein: "wendung2:953", aus: vor("ergebnis:Ausgaben", 0.4), team: "a", art: "voll", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "+ 40 %", ein: "wendung2:40", aus: vor("wendung3:Das", 0.2), team: "akzent", art: "voll", x: 540, y: reihe2, anker: "mitte" });
  M.chip({ text: "DECKT NUR 27 %", ein: "wendung3:Viertel", aus: vor("ergebnis:Ausgaben", 0.4), team: "b", art: "voll", x: XR, y: reihe2, anker: "mitte" });
  M.chip({ text: "JAHR 13–18 · 68.616 €", ein: "ueberraschung:6", aus: vor("merksatz:Ein", 0.2), team: "a", art: "voll", x: SICHER.rechts, y: reihe, anker: "rechts" });
  M.chip({ text: "JAHR 1–6 · 48.888 €", ein: "ueberraschung:ersten", aus: vor("merksatz:Ein", 0.2), team: "a", art: "hell", x: SICHER.links, y: reihe2, anker: "links" });
  M.chip({ text: "+ 19.728 €", ein: "ueberraschung:19.728", aus: vor("merksatz:Ein", 0.2), team: "akzent", art: "voll", x: 540, y: reihe3, anker: "mitte" });

  M.bilanz({
    y: 470, ein: "ergebnis:Ausgaben", aus: vor("warum:Warum", 0.35), titel: "BILANZ 18 JAHRE",
    zeilen: [
      { label: "AUSGABEN", wert: Z.gesamt, einheit: "€", team: "a", ein: "ergebnis:174.096" },
      { label: "MINUS KINDERGELD", wert: Z.kindergeld, einheit: "€", team: "b", ein: "ergebnis:Minus" },
    ],
    differenz: { label: "BLEIBEN", wert: Z.netto, einheit: "€", ein: "ergebnis:Bleiben" },
  });
  hud.add(new WarumKarte(M, {
    ein: "warum:Warum", aus: "ueberraschung:Die", y: 470,
    reihen: [
      { label: "AUSGABEN PRO MONAT", team: "a", werte: AUSGABEN, unter: ["JAHR 1–6", "JAHR 7–12", "JAHR 13–18"], ein: "warum:Erstens" },
      { label: "KINDERGELD PRO MONAT", team: "b", werte: [KINDERGELD, KINDERGELD, KINDERGELD], unter: ["JAHR 1–6", "JAHR 7–12", "JAHR 13–18"], ein: "warum:Zweitens" },
    ],
  }));
  M.pointe({ woerter: [{ text: "AM", ein: T("merksatz:Ende") - 0.3 }, { text: "ENDE", ein: "merksatz:Ende", farbe: "akzent" }], ein: "merksatz:sondern", aus: "schluss:Schreib", y: 520, groesse: 190 });
  M.folgen({ ein: "folgen:Folg", dauer: 1.8, team: "a" });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });
  M.schleife({ ab: tMerk });

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.update(t); // nur HUD (schnell), für qc/text_ueberlappung.mjs
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "raum", schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) });
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
