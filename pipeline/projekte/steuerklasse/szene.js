// „Steuerklasse III/V oder IV/IV: Wer hat am Ende mehr Geld?“ · Simulierbar · Stil 20 Glas & Licht
// Dunkles Labor: zwei Messzylinder (links III/V in Blau, rechts IV/IV in Koralle), Geld als leuchtende Flüssigkeit,
// Zulauf von oben (dicker Strahl = Tom, dünner Strahl = Sara). In der Mitte ein schmales Röhrchen in Elfenbein: der Vorsprung
// von III/V. Er wächst auf 860 €, dann gleicht die Steuererklärung ihn auf 0 aus. Danach die zweite Runde: Elterngeld pro Monat.
// Alle Zahlen kommen aus pipeline/sim/steuerklasse.mjs (netto.mjs, PAP 2026). Alles ist eine reine Funktion von t.
import * as THREE from "three";
import { SimBuehne, GRADING, rigLabor, lichtKegel, staub, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { glasGefaess, kaustik, laborBank, gegenlichtWand, laborZeit } from "../../engine/stil_lichtlabor.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/steuerklasse.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const AUS = new Set((Q.get("aus") || "").split(","));
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Flüssigkeit, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb.
const BLAU = "#3D8BFF"; // III/V
const KORALLE = "#FF5A5F"; // IV/IV
const ELFENBEIN = "#ECE6DA"; // Akzent (Vorsprung-Röhrchen, Summen)
const de = (v, nk = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(v);
const euro = (v, nk = 2) => `${de(v, nk)} €`;

// Zahlen aus der geprüften Rechnung
const Z = videoZahlen();
const NETTO_L = Z.netto35, NETTO_R = Z.netto44; // 4.711,68 / 4.640,01 je Monat
const JAHR_L = NETTO_L * 12, JAHR_R = NETTO_R * 12; // vor dem Bescheid
const NACHZ = Z.nach35, ERSTATT = Z.erst44; // 554,16 / 305,88
const ENDE = Z.jahr35; // 55.986,00 (beide gleich)
const EG_L = Z.egV, EG_R = Z.egIV; // 914,45 / 1.095,36
const LST_L = Z.est - NACHZ, LST_R = Z.est + ERSTATT; // vorab abgezogen im Jahr: 9.189,84 / 10.049,88

// ---------- kleine HUD-Bausteine nur für dieses Video ----------
/** Modellfall-Pille (immer sichtbar, kein Logo) */
class Pille {
  constructor(M, { x, y, text }) { this.e = el("div", "ms st-pille", text, M.hud.wurzel); this.x = x; this.y = y; this.b = this.e.offsetWidth; }
  ereignisse() { return []; }
  update(t) { this.e.style.transform = `translate(${(this.x - this.b / 2).toFixed(1)}px, ${this.y}px)`; this.e.style.opacity = "0.9"; }
}
/** Steuerbescheid-Karte: Zeilen erscheinen nacheinander, Teamfarbe je Zeile */
class Bescheid {
  constructor(M, { ein, aus, y = 350, zeilen }) {
    this.M = M; this.ein = M.zeit(ein); this.aus = M.zeit(aus); this.y = y;
    this.e = el("div", "ms ms-karte st-bescheid", `<div class="ms-kk"><i></i>STEUERBESCHEID 2026</div>`, M.hud.wurzel);
    this.e.style.width = SICHER.breite + "px";
    this.z = zeilen.map((r) => {
      const box = el("div", "st-box", "", this.e);
      const e = el("div", "st-reihe", `<span>${r.label}</span><b>${r.wert}</b>`, box);
      M.setzeFarbe(e, r.team);
      return { box, e, t: M.zeit(r.ein), voll: box.offsetHeight };
    });
    this._ev = this.z.map((r) => ({ t: r.t, typ: "chip", klang: "pop", text: "Bescheid-Zeile" }));
  }
  ereignisse() { return this._ev; }
  update(t) {
    const an = t >= this.ein - 0.05 && t <= this.aus + 0.3;
    this.e.style.visibility = an ? "visible" : "hidden";
    for (const r of this.z) r.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    for (const r of this.z) r.box.style.height = (r.voll * ease.outCubic(clamp((t - r.t + 0.05) / 0.3))).toFixed(1) + "px";
    const h = feder(t - this.ein, { frequenz: 2.5, daempfung: 0.52 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.25));
    this.e.style.transform = `translate(${SICHER.links}px, ${(this.y + (1 - h) * 50 - x * 26).toFixed(1)}px) scale(${(0.93 + 0.07 * h).toFixed(4)})`;
    this.e.style.opacity = String(clamp(h * 3) * (1 - x));
    for (const r of this.z) {
      const s = t < r.t ? 0 : feder(t - r.t, { frequenz: 3.2, daempfung: 0.4 });
      r.e.style.opacity = String(clamp(s * 3));
      r.e.style.transform = `translateX(${((1 - clamp(s)) * -40).toFixed(1)}px) scale(${(0.9 + 0.1 * clamp(s, 0, 1.1)).toFixed(4)})`;
    }
  }
}

/** Funken: kleine Lichtpunkte, die aus einem Punkt aufsteigen (deterministisch aus k = 0…1) */
function funken({ n = 70, farbe = "#FFFFFF", seed = 3, radius = 0.3, groesse = 7 }) {
  let s = seed * 977 + 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const sd = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) sd[i] = r();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(sd, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { k: { value: 0 }, ursprung: { value: new THREE.Vector3() }, richtung: { value: new THREE.Vector3(0, 1, 0) }, farbe: { value: new THREE.Color(farbe) }, radius: { value: radius }, groesse: { value: groesse } },
    vertexShader: /* glsl */ `attribute vec3 seed; uniform float k, radius, groesse; uniform vec3 ursprung, richtung; varying float vA;
      void main(){ float d = seed.x * 0.5; float p = clamp((k - d) / 0.5, 0.0, 1.0);
        vec3 w = ursprung + vec3((seed.y - 0.5) * radius * 2.0, 0.0, (seed.z - 0.5) * radius * 2.0) + richtung * p * (0.7 + seed.z) + vec3(sin(p * 6.0 + seed.x * 30.0) * 0.08, 0.0, 0.0);
        vA = sin(p * 3.14159) * step(0.001, k) * step(k, 0.999);
        vec4 mv = viewMatrix * vec4(w, 1.0); gl_PointSize = groesse * (0.6 + seed.y) * 14.0 / max(-mv.z, 1.0) * 10.0 / 10.0; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(farbe * a * a * vA * 2.2, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 11; p.userData.dynamisch = true;
  p.setze = (k, ursprung, richtung) => { m.uniforms.k.value = k; if (ursprung) m.uniforms.ursprung.value.set(...ursprung); if (richtung) m.uniforms.richtung.value.set(...richtung); p.visible = k > 0.001 && k < 0.999; };
  p.visible = false;
  return p;
}

async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); } catch { timing = schaetzeTiming(skript); }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.5 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "III/V", farbe: BLAU, woerter: ["III", "V", "V:"] },
      b: { name: "IV/IV", farbe: KORALLE, woerter: ["IV", "IV:"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // =====================================================================================
  // Zeitachse (alles an Wortzeiten)
  // =====================================================================================
  const tFuell1a = T("rennen:III") + 0.45, tFuell1b = T("rennen:Euro>");
  const tFuell2a = T("rennen:IV") + 0.5, tFuell2b = T("rennen:Euro#2>");
  const tVorsprungA = T("rennen:71,67"), tVorsprungB = T("rennen:Vorsprung") + 0.25;
  const tZoomA = T("wendung1:Nach") + 0.3, tZoomB = tZoomA + 0.9;
  const tMonateA = T("wendung1:Jahr") + 0.45, tMonateB = T("wendung1:mehr");
  const tNachA = T("wendung2:554") - 0.1, tNachB = T("wendung2:nach,") + 0.35;
  const tErstA = T("wendung2:bekommen") + 0.1, tErstB = T("wendung2:zurück>");
  const tErg = T("ergebnis:Endstand"), tNull = T("ergebnis:0");
  const tWarum = T("warum:Warum"), tUeb = T("ueberraschung:Und"), tBaby = T("ueberraschung:Kommt");
  const tEgLA = T("ueberraschung:914") - 0.3, tEgLB = T("ueberraschung:Euro") + 0.1;
  const tEgRA = T("ueberraschung:1.095") - 0.25, tEgRB = T("ueberraschung:Euro#2>");
  const tJahrA = T("ueberraschung:Jahr") + 0.2, tJahrB = T("ueberraschung:2.171>");
  const tMerk = T("merksatz:Die");
  const R = (t, a, b, e = ease.inOutSine) => e(fortschritt(t, a, b));
  const fenster = (t, a, b, rein = 0.4, raus = 0.5) => ease.inOutSine(fortschritt(t, a, a + rein)) * (1 - ease.inOutSine(fortschritt(t, b - raus, b)));
  const puls = (t, t0, d = 0.7) => { const k = fortschritt(t, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const an = (t, a, b, f = 0.08) => (t > a && t < b + f ? 1 : 0);

  // Lichtpulse an Wortzeiten: L = linker Zylinder, R = rechter, U = Röhrchen (nie mehr als 2 s ohne neue Information)
  const PL = ["hook:III", "hook:V", "regeln:Tom", "regeln:4.500", "regeln:brutto,", "falle:Klar", "falle:III", "falle:mehr.", "rennen:III", "rennen:4.711,68", "rennen:netto,", "folgen:Folg", "wendung1:Nach", "wendung1:Doch", "wendung1:V", "wendung1:Steuererklärung", "wendung2:III", "wendung2:554", "wendung2:nach,", "ergebnis:Endstand", "ergebnis:III", "ergebnis:55.986", "warum:Warum", "warum:Steuerklasse", "warum:vorab", "warum:wird.", "ueberraschung:Und", "ueberraschung:Klasse", "ueberraschung:V:", "ueberraschung:914", "ueberraschung:Elterngeld", "ueberraschung:Monat.", "merksatz:Die", "merksatz:Steuer.", "merksatz:Elterngeld.", "schluss:Was", "schluss:zeigen?"];
  const PR = ["hook:oder", "hook:IV", "hook:IV#2", "hook:mehr?", "regeln:Sara", "regeln:2.500.", "falle:Oder?", "rennen:IV", "rennen:4.640,01", "rennen:Euro.", "folgen:damit", "wendung1:einem", "wendung1:860", "wendung1:Pflicht.", "wendung2:IV", "wendung2:bekommen", "wendung2:306", "wendung2:zurück.", "ergebnis:IV", "ergebnis:genauso", "ergebnis:viel.", "warum:Die", "warum:abgezogen", "warum:Die#2", "warum:Finanzamt", "warum:aus.", "ueberraschung:Verrückte:", "ueberraschung:Baby,", "ueberraschung:Saras", "ueberraschung:doch.", "ueberraschung:Klasse#2", "ueberraschung:IV:", "ueberraschung:1.095", "ueberraschung:Euro.", "merksatz:ändert", "merksatz:wann", "merksatz:manchmal", "schluss:Schreib", "schluss:Kommentare."];
  const PU = ["hook:Was", "hook:bringt", "regeln:Tom#2", "regeln:verdient", "rennen:71,67", "rennen:Vorsprung.", "wendung1:Jahr:", "wendung1:mehr.", "wendung2:Euro", "ergebnis:0", "ergebnis:Unterschied:", "warum:echte", "warum:gemeinsam", "ueberraschung:Klasse", "ueberraschung:Euro", "ueberraschung:In", "ueberraschung:Jahr:", "ueberraschung:2.171", "merksatz:nicht", "merksatz:zahlst."];
  const tPL = PL.map((k) => T(k)), tPR = PR.map((k) => T(k)), tPU = PU.map((k) => T(k));
  const summe = (liste, t, d = 0.8) => liste.reduce((a, p) => a + puls(t, p, d), 0);

  // Zustand der Welt (nur Zahlen; die Schleife lässt alles weich zum Anfangszustand zurückgleiten)
  const zustandRoh = (t) => {
    const mL = R(t, tFuell1a, tFuell1b) + 11 * R(t, tMonateA, tMonateB, ease.inOutCubic);
    const mR = R(t, tFuell2a, tFuell2b) + 11 * R(t, tMonateA, tMonateB, ease.inOutCubic);
    const weg = 1 - R(t, tUeb + 0.05, tBaby - 0.15, ease.inOutCubic); // Zylinder leeren sich für die zweite Runde
    let L = NETTO_L * mL - NACHZ * R(t, tNachA, tNachB);
    let Rr = NETTO_R * mR + ERSTATT * R(t, tErstA, tErstB);
    L = L * weg + EG_L * R(t, tEgLA, tEgLB);
    Rr = Rr * weg + EG_R * R(t, tEgRA, tEgRB);
    const monatE = 1 + 11 * R(t, tJahrA, tJahrB);
    const visV = R(t, tVorsprungA, tVorsprungB) * (1 - R(t, tUeb, tUeb + 0.5)) + R(t, tEgRB - 0.4, tEgRB + 0.3);
    const vor = Math.abs(L - Rr) * monatE * Math.min(1, visV);
    const monat = (t < tFuell1a - 0.4 ? 0 : 1) + 11 * R(t, tMonateA, tMonateB, ease.inOutCubic) - 11 * R(t, tUeb + 0.05, tBaby - 0.15) + 11 * R(t, tJahrA, tJahrB);
    const sk = R(t, tZoomA, tZoomB) + R(t, tUeb + 0.05, tBaby - 0.15, ease.inOutCubic);
    const lnT = lerp(lerp(Math.log(250), Math.log(1000), R(t, tZoomA, tZoomB)), Math.log(250), R(t, tUeb + 0.05, tBaby + 0.8));
    const tubeMax = Math.exp(lerp(lnT, Math.log(2500), R(t, tJahrA - 0.3, tJahrA + 0.5)));
    // Zulauf: Tom (dick) und Sara (dünn) — im Elterngeld-Teil nur Sara
    const monatsStrom = an(t, tFuell1a, tFuell1b) || an(t, tFuell2a, tFuell2b) || an(t, tMonateA, tMonateB);
    const zL = an(t, tFuell1a, tFuell1b) || an(t, tMonateA, tMonateB);
    const zR = an(t, tFuell2a, tFuell2b) || an(t, tMonateA, tMonateB) || an(t, tErstA, tErstB);
    const sL = zL || an(t, tEgLA, tEgLB), sR = (zR && !an(t, tErstA, tErstB)) || an(t, tEgRA, tEgRB);
    const tomL = zL, tomR = zR && !(t > tErstA - 0.01 && t < tErstB + 0.1) ? 1 : (an(t, tErstA, tErstB) ? 1 : 0);
    return {
      L, R: Rr, vor, monat, sk, tubeMax, zTomL: tomL ? 1 : 0, zSaraL: sL ? 1 : 0, zTomR: tomR ? 1 : 0, zSaraR: sR ? 1 : 0,
      pL: summe(tPL, t), pR: summe(tPR, t), pU: summe(tPU, t, 0.9),
      kuehl: fenster(t, T("wendung1:Doch") - 0.3, tErg + 1.0, 0.8, 1.2),
      nach: R(t, tNachA - 0.2, tNachB + 1.0, ease.linear),
      fBlitz: Math.exp(-(((t - tNull) / 0.25) ** 2)),
      linie: fenster(t, T("warum:beide") - 0.2, T("warum:aus.") + 0.8, 0.4, 0.5),
      glanz: fenster(t, tNull - 0.2, tNull + 2.2, 0.3, 1.0),
    };
  };
  const zustand = M.wert(zustandRoh);

  // =====================================================================================
  // Szene
  // =====================================================================================
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#040507");
  const XA = -1.02, XB = 1.02;
  const lab = rigLabor(szene, buehne.renderer, { umgebungsStaerke: 0.55, schatten: SCHATTEN > 0 ? 1024 : 0, spots: [{ pos: [XA, 7, 0.4], staerke: 18, winkel: 0.2 }, { pos: [XB, 7, 0.4], staerke: 18, winkel: 0.2 }] });
  szene.add(laborBank({ breite: 18, tiefe: 7, spiegel: AUS.has("spiegel") ? 0 : 0.2 }));
  const wand = gegenlichtWand({ farbe: "#1A2334", staerke: 1.0 }); wand.position.set(0, 4, -6); szene.add(wand);
  const SKALEN = [{ max: 5000, teilung: 500, beschriftung: 1000 }, { max: 60000, teilung: 5000, beschriftung: 10000 }, { max: 1200, teilung: 100, beschriftung: 200 }];
  const HOEHE = 3.1;
  const gA = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: BLAU, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 1 });
  const gB = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: KORALLE, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 2 });
  gA.position.x = XA; gB.position.x = XB;
  gA.skalaMeshes.forEach((m) => { m.rotation.y = 0.32; }); gB.skalaMeshes.forEach((m) => { m.rotation.y = -0.32; });
  // Röhrchen in der Mitte: Vorsprung von III/V (Elfenbein), ohne Skala (Wert steht im Zähler)
  const gU = glasGefaess({ hoehe: 2.2, radius: 0.15, wand: 0.03, boden: 0.1, farbe: ELFENBEIN, ohneSkala: true, blasen: 30, seed: 3 });
  gU.position.set(0, 0, 0.1);
  szene.add(gA, gB, gU);
  const kA = kaustik({ radius: 1.0, farbe: BLAU, staerke: 0.9 }), kB = kaustik({ radius: 1.0, farbe: KORALLE, staerke: 0.9 }), kU = kaustik({ radius: 0.55, farbe: ELFENBEIN, staerke: 0.6 });
  kA.position.set(XA + 0.25, 0.004, 0.5); kB.position.set(XB - 0.25, 0.004, 0.5); kU.position.set(0.1, 0.004, 0.7);
  szene.add(kA, kB, kU);
  if (!AUS.has("kegel")) for (const x of [XA, XB]) {
    const k = lichtKegel({ hoehe: 7, radiusOben: 0.08, radiusUnten: 1.3, farbe: "#E8F0FF", staerke: 0.07, weich: 1.3, streifen: 0.5 });
    k.position.set(x, 7, 0.4); szene.add(k);
  }
  szene.add(staub({ anzahl: 420, bereich: [5.5, 6, 3], mitte: [0, 3.2, 0.4], farbe: "#DCE6FF", groesse: 0.01, staerke: 1.4, aussen: 0.15 }));
  // LED-Ringe am Fuß der Zylinder (leuchten bei den Wörtern auf)
  const ringMat = (f) => leuchtMat(f, 1, { neu: true });
  const rA = ringMat(BLAU), rB = ringMat(KORALLE), rU = ringMat(ELFENBEIN);
  const ring = (mat, x, r, z = 0) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 72), mat); m.rotation.x = Math.PI / 2; m.position.set(x, 0.012, z); m.userData.dynamisch = true; szene.add(m); return m; };
  ring(rA, XA, 0.56); ring(rB, XB, 0.56); ring(rU, 0, 0.22, 0.1);
  // gemeinsame Steuerlinie (Warum): dünner Lichtbalken über beiden Zylindern
  const linieMat = ringMat(ELFENBEIN);
  const linie = new THREE.Mesh(new THREE.BoxGeometry(1, 0.025, 0.025), linieMat); linie.userData.dynamisch = true; linie.visible = false; szene.add(linie);
  const stiele = [XA, XB].map((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 1, 0.025), linieMat); m.userData.dynamisch = true; m.visible = false; szene.add(m); return m; });
  // Funken: verlorenes Geld (Nachzahlung) steigt aus dem linken Zylinder auf, Ergebnis glitzert
  const fNach = funken({ n: 60, farbe: BLAU, seed: 5, radius: 0.3 });
  const fErg = funken({ n: 80, farbe: ELFENBEIN, seed: 9, radius: 1.4, groesse: 6 });
  szene.add(fNach, fErg);
  buendeln(szene);

  // =====================================================================================
  // Kamera: normale Einstellung (Zylinder mittig groß) und Karten-Einstellung (Zylinder unten, oben Platz für Karten)
  // =====================================================================================
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(1.2, 3.4, 16.0, 0, 1.9, 0) },
    { t: T("hook:III"), v: C(0.7, 3.1, 15.0, 0, 1.8, 0), e: ease.inOutSine },
    { t: T("hook:Was"), v: C(0.0, 2.8, 14.0, 0, 1.7, 0), e: ease.inOutSine },
    { t: T("regeln:Tom"), v: C(0.5, 3.2, 14.4, 0.2, 1.9, 0), e: ease.inOutCubic },
    { t: T("regeln:Tom#2"), v: C(-0.5, 3.1, 14.2, -0.2, 1.9, 0), e: ease.inOutCubic },
    { t: T("regeln:Sara#2") - 0.2, v: C(0.5, 3.1, 14.2, 0.2, 1.9, 0), e: ease.inOutCubic },
    { t: T("falle:Klar") - 0.1, v: C(-0.4, 2.6, 13.4, -0.4, 1.7, 0, 29), e: ease.inOutCubic },
    { t: T("falle:Oder?") - 0.5, v: C(0.0, 3.0, 13.8, 0, 1.7, 0, 29), e: ease.inOutCubic },
    { t: T("rennen:III"), v: C(-0.45, 2.6, 13.6, -0.4, 1.7, 0), e: ease.inOutCubic },
    { t: T("rennen:IV") - 0.1, v: C(0.0, 2.9, 13.8, 0, 1.7, 0), e: ease.inOutSine },
    { t: T("rennen:IV") + 0.8, v: C(0.45, 2.6, 13.6, 0.4, 1.7, 0), e: ease.inOutCubic },
    { t: T("rennen:71,67") - 0.2, v: C(0.0, 2.9, 12.8, 0, 1.6, 0.1), e: ease.inOutCubic },
    { t: T("folgen:Folg"), v: C(0.4, 3.4, 15.4, 0, 1.9, 0), e: ease.inOutSine },
    { t: tZoomA - 0.2, v: C(0.0, 3.0, 15.0, 0, 1.8, 0), e: ease.inOutSine },
    { t: T("wendung1:Doch") - 0.1, v: C(-0.4, 3.9, 18.8, 0, 2.6, 0), e: ease.inOutCubic },
    { t: tNachA - 0.6, v: C(-0.6, 3.7, 18.2, -0.5, 2.5, 0), e: ease.inOutCubic },
    { t: tErstA - 0.5, v: C(0.6, 3.7, 18.2, 0.5, 2.5, 0), e: ease.inOutCubic },
    { t: tErg - 0.2, v: C(0.0, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: tWarum, v: C(0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: T("warum:echte"), v: C(-0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: tUeb - 0.1, v: C(0.2, 3.5, 17.0, 0, 2.2, 0), e: ease.inOutCubic },
    { t: tBaby + 0.3, v: C(1.3, 3.0, 14.4, 0.3, 1.8, 0), e: ease.inOutCubic },
    { t: T("ueberraschung:Klasse") - 0.1, v: C(-0.45, 2.6, 13.6, -0.4, 1.7, 0), e: ease.inOutCubic },
    { t: T("ueberraschung:Klasse#2") - 0.1, v: C(0.45, 2.6, 13.6, 0.4, 1.7, 0), e: ease.inOutCubic },
    { t: T("ueberraschung:In") - 0.1, v: C(0.0, 3.1, 14.6, 0, 1.9, 0), e: ease.inOutCubic },
    { t: tMerk - 0.1, v: C(0.0, 3.7, 18.6, 0, 2.5, 0), e: ease.inOutCubic },
  ];
  const regie = new Regie(kamera, (t) => { const v = keyframes(camKeys, t); return { pos: v.slice(0, 3), ziel: v.slice(3, 6), fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.008, tempo: 0.25 });
  // Zoom (mal ja, mal nein): Jahresvorsprung, Unterschied null, Elterngeld im Jahr
  regie.zoom({ t: T("wendung1:860") + 0.1, ziel: [0, 1.7, 0.1], staerke: 0.14, halt: 1.1, rueck: 0.8 });
  regie.zoom({ t: tNull, ziel: [0, 1.7, 0.1], staerke: 0.12, halt: 1.2, rueck: 0.9 });
  regie.zoom({ t: T("ueberraschung:2.171") - 0.3, ziel: [0, 1.4, 0.1], staerke: 0.12, halt: 1.0, rueck: 0.8 });
  regie.schleife({ ab: tMerk, ende: DAUER - 1 / FPS });

  const post = { ...GRADING.labor, strahlen: AUS.has("strahlen") ? 0 : 0.35, strahlenQuelle: [0.5, 0.98], strahlenSchwelle: 1.2, strahlenLaenge: 0.6 };
  const cA = new THREE.Color(BLAU), cB = new THREE.Color(KORALLE), cE = new THREE.Color(ELFENBEIN);
  const weissA = new THREE.Color("#FFFFFF"), kuehlC = new THREE.Color("#8FB8FF");
  const welt = { szene, kamera, post, update: null };
  const maxEff = (sk) => (sk <= 1 ? Math.exp(lerp(Math.log(5000), Math.log(60000), sk)) : Math.exp(lerp(Math.log(60000), Math.log(1200), Math.min(1, sk - 1))));
  welt.update = (t) => {
    const s = zustand(t);
    laborZeit(t);
    const mx = maxEff(s.sk);
    gA.setze({ wert: s.L, t, zulauf: s.zTomL > 0.5, zulauf2: s.zSaraL > 0.5, maxWert: mx, skala: s.sk });
    gB.setze({ wert: s.R, t, zulauf: s.zTomR > 0.5, zulauf2: s.zSaraR > 0.5, maxWert: mx, skala: s.sk });
    gU.setze({ wert: s.vor, t, zulauf: false, maxWert: s.tubeMax });
    // Lichter: Spots über den Zylindern mit Pulsen bei den Wörtern; kühleres Licht ab dem Bescheid
    lab.spots[0].intensity = 18 * (1 + 0.55 * Math.min(1.6, s.pL) + 0.5 * s.glanz);
    lab.spots[1].intensity = 18 * (1 + 0.55 * Math.min(1.6, s.pR) + 0.5 * s.glanz);
    lab.spots[0].color.copy(weissA).lerp(kuehlC, 0.6 * s.kuehl); lab.spots[1].color.copy(weissA).lerp(kuehlC, 0.6 * s.kuehl);
    rA.color.copy(cA).multiplyScalar(1.4 + 2.6 * Math.min(1.5, s.pL) + 1.5 * s.glanz);
    rB.color.copy(cB).multiplyScalar(1.4 + 2.6 * Math.min(1.5, s.pR) + 1.5 * s.glanz);
    rU.color.copy(cE).multiplyScalar(1.0 + 2.8 * Math.min(1.5, s.pU) + 2.0 * s.glanz);
    post.bloomStaerke = GRADING.labor.bloomStaerke * (1 + 0.35 * Math.min(1, s.fBlitz) + 0.45 * s.glanz);
    // Steuerlinie über beiden Zylindern (Warum: „gemeinsam“)
    const yL = HOEHE + 0.85, kk = Math.min(1, s.linie);
    linie.visible = stiele[0].visible = stiele[1].visible = kk > 0.02;
    linieMat.color.copy(cE).multiplyScalar(2.0 * kk);
    linie.scale.x = Math.max(0.001, (XB - XA) * kk); linie.position.set(0, yL, 0);
    stiele.forEach((m, i) => { m.scale.y = 0.55 * kk; m.position.set(i ? XB : XA, yL - 0.275 * kk, 0); });
    // Funken
    fNach.setze(clamp((t - tNachA + 0.1) / 2.2), [XA, gA.fluessigHoehe(s.L, mx) , 0.1], [0.6, 1.3, 0.2]);
    fErg.setze(clamp((t - tNull + 0.1) / 2.4), [0, 1.2, 0.3], [0, 1.7, 0.5]);
    aktualisiere(t);
    regie.anwenden(t);
    Object.assign(post, fokus(kamera, [0, 1.5, 0.1], { tiefe: 0.22, nah: 0.5, fern: 0.75 }));
  };

  // =====================================================================================
  // HUD (design.md): Tafel ab Bild 0, Chips nur mit neuer Information, keine Sticker
  // =====================================================================================
  M.tafel({
    y: 166,
    links: { team: "a", name: "III/V", einheit: "€", nk: 2, max: 99999.99 },
    rechts: { team: "b", name: "IV/IV", einheit: "€", nk: 2, max: 99999.99 },
    werte: (t) => { const s = zustandRoh(t); return { a: s.L, b: s.R }; },
    vorn: "hoch",
    uhr: { ein: 0.4, zeit: (t) => zustandRoh(t).monat, format: (m) => String(Math.max(0, Math.round(m))), label: "MONAT" },
  });
  const w = (t, typ, klang, text) => M.melde({ t, typ, klang, text });
  const welt_ev = (liste, text, klang = "pop") => liste.forEach((k) => w(k, "welt", klang, text));
  welt_ev(PL, "linker Zylinder leuchtet");
  welt_ev(PR, "rechter Zylinder leuchtet");
  welt_ev(PU, "Röhrchen leuchtet", false);
  w(0.5, "welt", "pop", "Zylinder leuchten auf");
  w(tFuell1a, "welt", "wachsen", "linker Zylinder füllt sich");
  w(tFuell2a, "welt", "wachsen", "rechter Zylinder füllt sich");
  w(tVorsprungA, "welt", "ding", "Vorsprung-Röhrchen füllt sich");
  w(tZoomA, "welt", "whoosh", "Skala zoomt von 5.000 auf 60.000 €");
  w(tMonateA, "welt", "wachsen", "Monate laufen 1 bis 12");
  w(tNachA, "welt", "pop", "Nachzahlung: Funken steigen auf");
  w(tErstA, "welt", "wachsen", "Erstattung läuft in IV/IV");
  w(tErg, "welt", "whoosh", "Kamera zieht zurück");
  w(tNull, "welt", "ding", "Unterschied 0 €, Röhrchen leer");
  w(tUeb, "welt", "whoosh", "Zylinder leeren sich, Skala 1.200 €");
  w(tEgLA, "welt", "wachsen", "linker Zylinder: Elterngeld Klasse V");
  w(tEgRA, "welt", "wachsen", "rechter Zylinder: Elterngeld Klasse IV");
  w(tJahrA, "welt", "wachsen", "zwölf Monate, Röhrchen wächst auf 2.171 €");

  const vor = (x, d = 0.3) => T(x) - d; // alte Chips blenden vor dem neuen aus
  // Modellfall dauerhaft sichtbar (keine Steuerberatung)
  hud.add(new Pille(M, { x: 540, y: 322, text: "MODELLFALL · KEINE STEUERBERATUNG" }));
  const reihe = 395, reihe2 = 505, XL = 335, XR = 745;
  // Hook: Zylinder benennen
  M.chip({ text: "KLASSE III + V", ein: "hook:III", aus: vor("regeln:Tom", 0.15), team: "a", art: "voll", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "KLASSE IV + IV", ein: "hook:IV", aus: vor("regeln:Tom", 0.15), team: "b", art: "voll", x: XR, y: reihe, anker: "mitte" });
  // Regeln
  M.chip({ text: "TOM 4.500 €", ein: "regeln:4.500", aus: vor("falle:Klar", 0.15), team: "akzent", art: "hell", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "SARA 2.500 €", ein: "regeln:2.500.", aus: vor("falle:Klar", 0.15), team: "akzent", art: "hell", x: XR, y: reihe, anker: "mitte" });
  M.chip({ text: "KEIN KIND · KEINE KIRCHENSTEUER", ein: "regeln:Sara", aus: vor("falle:Oder?", 0.2), team: "akzent", art: "hell", x: 540, y: reihe2, anker: "mitte" });
  // Rennen: Vorsprung als Live-Zähler
  M.chip({ text: "III + V VORN", ein: "rennen:netto,", aus: vor("rennen:IV", 0.0), team: "a", art: "hell", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "+ 71,67 € PRO MONAT", ein: "rennen:71,67", aus: vor("wendung1:Nach", 0.2), team: "a", art: "voll", x: 540, y: reihe, anker: "mitte" });
  // Wendung 1: Jahresvorsprung, dann der Bescheid
  M.chip({ text: "+ 860,04 € IM JAHR", ein: "wendung1:860", aus: vor("wendung1:Doch", 0.2), team: "a", art: "voll", x: 540, y: reihe, anker: "mitte" });
  hud.add(new Bescheid(M, {
    ein: "wendung1:Doch", aus: vor("ergebnis:Endstand", 0.35), y: 392,
    zeilen: [
      { label: "III/V · STEUERERKLÄRUNG", wert: "PFLICHT", team: "a", ein: "wendung1:Steuererklärung" },
      { label: "III/V · NACHZAHLUNG", wert: "− " + euro(NACHZ), team: "a", ein: "wendung2:554" },
      { label: "IV/IV · ERSTATTUNG", wert: "+ " + euro(ERSTATT), team: "b", ein: "wendung2:306" },
    ],
  }));
  // Vorsprung-Zähler (Röhrchen), solange es etwas zu zeigen gibt
  M.zaehler({ wert: (t) => { const s = zustandRoh(t); return s.vor; }, nk: 2, einheit: "€", max: 9999, team: "akzent", art: "hell", label: "VORSPRUNG", punkt: (t) => ({ x: 540, y: t < T("wendung1:Doch") - 0.2 ? 560 : 742 }), ein: "rennen:71,67", aus: vor("ergebnis:Endstand", 0.4) });
  M.zaehler({ wert: (t) => { const s = zustandRoh(t); return s.vor; }, nk: 2, einheit: "€", max: 9999, team: "akzent", art: "hell", label: "ABSTAND", punkt: () => ({ x: 540, y: 560 }), ein: "ueberraschung:Klasse#2", aus: vor("merksatz:Die", 0.3) });
  // Ergebnis: Bilanz (Jahresnetto nach dem Bescheid)
  M.bilanz({
    y: 395, ein: "ergebnis:Endstand", aus: vor("warum:Warum", 0.3), titel: "JAHRESNETTO NACH BESCHEID",
    zeilen: [
      { label: "III/V", wert: ENDE, einheit: "€", nk: 0, team: "a", ein: "ergebnis:55.986" },
      { label: "IV/IV", wert: ENDE, einheit: "€", nk: 0, team: "b", ein: "ergebnis:genauso" },
    ],
    differenz: { label: "UNTERSCHIED", wert: 0, einheit: "€", ein: "ergebnis:0" },
  });
  // Warum: Vorab-Abzug gegen echte Steuer
  M.balken({
    y: 395, ein: "warum:Warum", aus: vor("ueberraschung:Und", 0.25), titel: "WARUM?", max: 10050,
    faktoren: [
      { label: "VORAB ABGEZOGEN IM JAHR", ein: "warum:bestimmt", a: { wert: LST_L, text: euro(LST_L, 0) }, b: { wert: LST_R, text: euro(LST_R, 0) } },
      { label: "ECHTE STEUER, GEMEINSAM", ein: "warum:echte", a: { wert: Z.est, text: euro(Z.est, 0) }, b: { wert: Z.est, text: euro(Z.est, 0) } },
    ],
  });
  // Überraschung: nur Saras Klasse zählt, Elterngeld im Monat und im Jahr
  M.chip({ text: "NUR SARAS KLASSE ZÄHLT", ein: "ueberraschung:Saras", aus: vor("ueberraschung:Klasse", 0.15), team: "akzent", art: "voll", x: 540, y: reihe, anker: "mitte" });
  M.chip({ text: "KLASSE V", ein: "ueberraschung:V:", aus: vor("ueberraschung:In", 0.15), team: "a", art: "hell", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "KLASSE IV", ein: "ueberraschung:IV:", aus: vor("ueberraschung:In", 0.15), team: "b", art: "hell", x: XR, y: reihe, anker: "mitte" });
  M.chip({ text: "IN EINEM JAHR + " + euro(Math.round((Z.egIV - Z.egV) * 12), 0), ein: "ueberraschung:2.171", aus: vor("merksatz:Die", 0.25), team: "akzent", art: "voll", x: 540, y: reihe, anker: "mitte" });
  M.pointe({ woerter: [{ text: "NUR", ein: T("merksatz:Nur,") }, { text: "WANN", ein: "merksatz:wann", farbe: "akzent" }], ein: "merksatz:wann", aus: "schluss:Schreib", y: 400, groesse: 150 });
  M.folgen({ ein: "folgen:Folg", dauer: 1.8, team: "a" });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });
  M.schleife({ ab: tMerk });

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => hud.update(t); // nur HUD (schnell), für qc/text_ueberlappung.mjs
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "wasser", schleifenPruefung: M.pruefeSchleife(window.renderAt, { regie }) });
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
