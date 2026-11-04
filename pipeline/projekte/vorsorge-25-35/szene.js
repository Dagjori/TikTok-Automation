// „Mit 25 oder mit 35 anfangen vorzusorgen: Wer hat mit 67 mehr?“ · Simulierbar · Stil 18 Dunkles Studio (Produktlicht)
// Zwei schwarze Sockel mit LED-Kante: links LENA (Türkis, 100 €/Monat ab 25), rechts MIA (Orange, 150 €/Monat ab 35), je ein Münzturm.
// In der Mitte hinten die Lebensuhr: Drehteller mit Ring aus 42 Stationen (25 bis 67) und leuchtendem Zeiger.
// Alle Zahlen kommen aus pipeline/sim/vorsorge_25_35.mjs (Modellrendite 5 % p. a. = ANNAHME, Variante 3 %).
// Alles ist eine reine Funktion von t (jedes Bild einzeln renderbar); die Welt-Werte laufen über M.wert (Schleife: letztes Bild = erstes).
import * as THREE from "three";
import { SimBuehne, GRADING, rigStudio, spiegelBoden, lichtKegel, staub, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { hohlkehle, wandLicht, muenzStapel, sockel, drehteller, altersRing } from "../../engine/stil_studio.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes } from "../../engine/bewegung.js";
import { endwertStetig, videoZahlen } from "../../sim/vorsorge_25_35.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const AUS = new Set((Q.get("aus") || "").split(","));
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: LED-Kante, Lichtfleck, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb.
const TUERKIS = "#2EC4B6"; // LENA
const ORANGE = "#FF8A3D"; // MIA
const ELFENBEIN = "#ECE6DA"; // Akzent (Lebensuhr, Lücke, Ergebnis)
const euro = (v) => `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 }).format(Math.round(v))} €`;
const MUENZ = 6000; // eine Münze = 6.000 €
const Z = videoZahlen();
const KONTO = (rate, start, alter, p) => endwertStetig(rate, start, alter, p);
const L67_5 = KONTO(100, 25, 67, 0.05), L35 = KONTO(100, 25, 35, 0.05);

// ---------- kleine HUD-Bausteine nur für dieses Video ----------
/** Annahme-Pille: „ANNAHME · 5 % RENDITE / JAHR“ (3 % in der Variante) */
class Pille {
  constructor(M, { ein, aus, x, y, prozent, wechsel = [] }) {
    this.ein = M.zeit(ein); this.aus = M.zeit(aus); this.prozent = prozent; this.wechsel = wechsel.map((w) => M.zeit(w));
    this.e = el("div", "ms vs-pille", "", M.hud.wurzel);
    this.x = x; this.y = y; this.txt = "";
    this._ev = [{ t: this.ein, typ: "chip", klang: "pop", text: "Annahme 5 % Rendite" }, ...this.wechsel.map((t) => ({ t, typ: "chip", klang: "pop", text: "Annahme 3 % bzw. 5 % Rendite" }))];
  }
  ereignisse() { return this._ev; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const txt = `ANNAHME · <b>${this.prozent(t) > 0.04 ? "5 %" : "3 %"}</b> RENDITE / JAHR`;
    if (txt !== this.txt) { this.e.innerHTML = txt; this.txt = txt; this.b = this.e.offsetWidth; }
    const k = clamp((t - this.ein) / 0.4) * (1 - clamp((t - this.aus) / 0.3));
    let bump = 0;
    for (const w of this.wechsel) { const d = t - w; if (d > 0 && d < 0.6) bump = Math.max(bump, Math.sin((d / 0.6) * Math.PI)); }
    this.e.style.opacity = String(k);
    this.e.style.transform = `translate(${(this.x - (this.b || 520) / 2).toFixed(1)}px, ${(this.y + (1 - k) * 10).toFixed(1)}px) scale(${(1 + 0.08 * bump).toFixed(4)})`;
  }
}
/** Einzahlungs-Zähler: „EINGEZAHLT 36.000 €“ in Teamfarbe */
class Zaehler {
  constructor(M, { team, x, y, ein, aus, wert, sicht, puls = [] }) {
    this.M = M; this.ein = M.zeit(ein); this.aus = M.zeit(aus); this.wert = wert; this.sicht = sicht || (() => 1); this.puls = puls.map((p) => M.zeit(p));
    this.e = el("div", "ms vs-zaehler", `<small>EINGEZAHLT</small><span></span>`, M.hud.wurzel);
    M.setzeFarbe(this.e, team);
    this.z = this.e.querySelector("span"); this.x = x; this.y = y; this.txt = "";
    this._ev = [{ t: this.ein, typ: "chip", klang: "pop", text: "Eingezahlt " + team }, ...this.puls.map((t) => ({ t, typ: "chip", klang: "ding", text: "Eingezahlt leuchtet" }))];
  }
  ereignisse() { return this._ev; }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    const s = an ? this.sicht(t) : 0;
    this.e.style.visibility = s > 0.01 ? "visible" : "hidden";
    if (s <= 0.01) return;
    const txt = euro(this.wert(t));
    if (txt !== this.txt) { this.z.textContent = txt; this.txt = txt; }
    const k = clamp((t - this.ein) / 0.4) * (1 - clamp((t - this.aus) / 0.3)) * s;
    let bump = 0;
    for (const p of this.puls) { const d = t - p; if (d > 0 && d < 0.7) bump = Math.max(bump, Math.sin((d / 0.7) * Math.PI)); }
    this.e.style.opacity = String(k);
    this.e.style.transform = `translate(${(this.x - 165).toFixed(1)}px, ${(this.y + (1 - k) * 12).toFixed(1)}px) scale(${(1 + 0.1 * bump).toFixed(4)})`;
    this.e.style.boxShadow = `0 0 ${(22 + 40 * bump).toFixed(0)}px -4px var(--tf)`;
  }
}
/** Warum-Karte: je Person Säulen „Eingezahlt“ und „Zinsen“ (Zinsen in der Teamfarbe), Reihen wachsen nacheinander auf */
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
      const s = r.werte.map((w, i) => { const c = el("div", "kb-s", `<span>${euro(w)}</span><b style="height:${(w / max * 84).toFixed(1)}px${i === 0 ? ";filter:saturate(0.25) brightness(0.85)" : ""}"></b>`, sa); return { c, b: c.querySelector("b"), z: c.querySelector("span"), t: M.zeit(r.ein) + i * 0.5 }; });
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
      a: { name: "LENA", farbe: TUERKIS, woerter: ["Lena*", "Lenas"] },
      b: { name: "MIA", farbe: ORANGE, woerter: ["Mia*"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // =====================================================================================
  // Zeitachse (alles an Wortzeiten): Alter 25 → 67
  // =====================================================================================
  const tOder = T("falle:Oder"), t35 = T("rennen:15.499"), tDoch = T("wendung1:Doch"), t55 = T("wendung1:55") + 0.4;
  const tJetzt = T("wendung2:Ab"), t60 = T("wendung2:60"), tEnd = T("ergebnis:Endstand"), t67 = T("ergebnis:166.640");
  const tWarum = T("warum:Warum"), tDrei = T("warum:3"), tBlieb = T("warum:blieben"), tAbst3 = T("warum:3.986");
  const tUeb = T("ueberraschung:Und"), tHoert = T("ueberraschung:Hört"), t35b = T("ueberraschung:35") + 0.1, tHat = T("ueberraschung:hat"), tEnd2 = T("ueberraschung:73.853");
  const tMerk = T("merksatz:Mia");
  const alterKeys = [
    { t: 0, v: 25 }, { t: tOder, v: 25 },
    { t: t35, v: 35, e: ease.inOutSine },                 // Rennen: 25 → 35, nur Lenas Turm wächst
    { t: tDoch, v: 35, e: ease.linear },
    { t: t55, v: 55, e: ease.inOutSine },                 // Wendung 1: 35 → 55, beide gleich eingezahlt
    { t: tJetzt, v: 55, e: ease.linear },
    { t: t60 - 0.2, v: 60, e: ease.inOutSine },           // Wendung 2: 55 → 60
    { t: t67 - 2.3, v: 60, e: ease.linear },
    { t: t67, v: 67, e: ease.inOutSine },                 // Ergebnis: 60 → 67
  ];
  const alterHaupt = (t) => keyframes(alterKeys, t);
  const fenster = (t, a, b, rein = 0.4, raus = 0.5) => ease.inOutSine(fortschritt(t, a, a + rein)) * (1 - ease.inOutSine(fortschritt(t, b - raus, b)));
  const puls = (t, t0, d = 0.7) => { const k = fortschritt(t, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const blitzF = (t, tc) => Math.exp(-(((t - tc) / 0.16) ** 2));

  // Zustand der Welt (nur Zahlen; die Schleife lässt alles weich zum Anfangszustand zurückgleiten)
  // Zusätzliche sanfte Lichtpulse der Lebensuhr in längeren Pausen (Wortzeiten, damit nie > 2 s ohne neue Information)
  const FUELL = [9.2, 14.8, 27.4, 30.8, 34.4, 36.3, 47.9, 53.2, 59.4, 61.5, 63.4, 74.0, 79.6];
  const zustandRoh = (t) => {
    const aH = alterHaupt(t);
    // Rendite: 5 % (Annahme), in „Warum“ kurz 3 %, danach wieder 5 %
    const p = 0.05 - 0.02 * ease.inOutSine(fortschritt(t, tDrei, tBlieb)) + 0.02 * ease.inOutSine(fortschritt(t, tUeb, tHoert - 0.3));
    const sink = ease.inOutCubic(fortschritt(t, tHoert, t35b));
    const u = ease.inOutSine(fortschritt(t, tHat, tEnd2));
    const lenaHaupt = KONTO(100, 25, aH, p), miaHaupt = KONTO(150, 35, aH, p);
    let lena, mia, ring, einL, einM;
    if (t < tHoert) { lena = lenaHaupt; mia = miaHaupt; ring = aH; einL = 1200 * (aH - 25); einM = 1800 * Math.max(0, aH - 35); }
    else if (t < t35b) { lena = lerp(lenaHaupt, L35, sink); mia = miaHaupt * (1 - sink); ring = lerp(67, 35, sink); einL = lerp(50400, 12000, sink); einM = lerp(57600, 0, sink); }
    else { lena = L35 * Math.pow(1.05, 32 * u); mia = 0; ring = 35 + 32 * u; einL = 12000; einM = 0; }
    const regelnMitte = fenster(t, T("falle:Klar") - 0.3, T("rennen:Mit") - 0.1, 0.6, 0.5);
    return {
      alter: ring, lena, mia, einL, einM, p,
      blitz: 0.6 * blitzF(t, t35) + 0.6 * blitzF(t, t55) + 0.8 * blitzF(t, t67) + 0.5 * blitzF(t, tHoert + 0.2) + 0.6 * blitzF(t, tEnd2),
      ledL: 1 + 1.0 * puls(t, 0.5, 0.9) + 1.2 * puls(t, T("hook:Hundert"), 0.9) + 1.3 * puls(t, T("regeln:Lena")) + 1.0 * puls(t, T("regeln:25")) + 1.0 * puls(t, T("rennen:Lena")) + 1.4 * puls(t, T("rennen:15.499"), 0.9) + 1.4 * puls(t, T("wendung1:Lena"), 0.9) + 1.6 * puls(t, T("ergebnis:166.640"), 1.0) + 2.2 * puls(t, T("ergebnis:27.459"), 1.2) + 1.2 * puls(t, T("ergebnis:weniger"), 0.8) + 1.0 * puls(t, T("warum:Warum"), 0.8) + 1.0 * puls(t, T("warum:Lenas")) + 1.2 * puls(t, T("ueberraschung:Hört")) + 1.6 * puls(t, tEnd2, 1.0) + 1.0 * puls(t, T("merksatz:Lena"), 0.9),
      ledR: 1 + 1.0 * puls(t, 0.5, 0.9) + 1.2 * puls(t, T("hook:35"), 0.9) + 1.2 * puls(t, T("hook:150"), 0.9) + 1.3 * puls(t, T("regeln:Mia")) + 1.0 * puls(t, T("regeln:mehr")) + 1.4 * puls(t, T("falle:Mia")) + 1.2 * puls(t, T("rennen:Mia")) + 1.4 * puls(t, T("wendung1:Mia"), 0.9) + 1.0 * puls(t, T("wendung1:Mia#2")) + 1.2 * puls(t, T("wendung2:Mia")) + 1.6 * puls(t, T("ergebnis:139.181"), 1.0) + 1.2 * puls(t, T("ergebnis:eingezahlt"), 0.8) + 1.0 * puls(t, T("warum:Warum") + 0.4, 0.8) + 1.0 * puls(t, T("warum:Zeit")) + 1.0 * puls(t, T("merksatz:Mia")),
      ledU: 1 + FUELL.reduce((a, f) => a + 1.0 * puls(t, f, 0.9), 0) + 1.2 * puls(t, T("ergebnis:Euro#2"), 0.9) + 1.2 * puls(t, T("ergebnis:Lena#2"), 0.9) + 1.2 * puls(t, T("hook:Wer"), 0.9) + 1.2 * puls(t, T("hook:hat") + 0.4, 0.9) + 1.2 * puls(t, T("hook:oder"), 0.9) + 1.2 * puls(t, T("hook:67"), 0.9) + 1.0 * puls(t, T("falle:Oder"), 1.0) + 1.0 * puls(t, t35, 0.9) + 1.2 * puls(t, t55, 1.0) + 1.0 * puls(t, t60, 0.9) + 1.4 * puls(t, t67, 1.0) + 1.0 * puls(t, tHat, 0.9) + 1.4 * puls(t, tEnd2, 1.0) + 1.0 * puls(t, T("merksatz:Zeit"), 1.0),
      spotU: 0.5 + 0.9 * regelnMitte + 0.7 * fenster(t, tOder - 1.2, tOder + 1.4) + 0.5 * fenster(t, t55 - 0.8, t55 + 1.6) + 0.7 * fenster(t, t67 - 1.5, t67 + 1.5) + 0.8 * fenster(t, tHat - 0.4, tEnd2 + 1.0) + 0.8 * fenster(t, tMerk - 0.3, tMerk + 4.4, 0.5, 1.0),
      spotL: 0.5 + 1.1 * fenster(t, T("regeln:Lena") - 0.2, T("regeln:Mia") - 0.1, 0.4, 0.5) + 0.6 * fenster(t, t35 - 1.8, t35 + 1.2) + 0.9 * fenster(t, T("wendung1:Lena") - 0.3, T("wendung1:Mia#2") - 0.1) + 1.2 * fenster(t, T("ergebnis:Lena"), T("ergebnis:Mia") - 0.1, 0.5, 0.5) + 1.4 * fenster(t, T("ergebnis:Lena#2") - 0.3, T("ergebnis:Und") - 0.1, 0.4, 0.8) + 1.0 * fenster(t, T("warum:Lenas") - 0.2, T("warum:Zeit"), 0.4, 0.5) + 1.1 * fenster(t, tHoert - 0.3, tEnd2 + 1.6, 0.5, 1.0),
      spotR: 0.5 + 1.1 * fenster(t, T("regeln:Mia") - 0.1, T("falle:Klar") - 0.3, 0.4, 0.6) + 1.2 * fenster(t, T("falle:Mia") - 0.3, T("falle:Oder"), 0.5, 0.5) + 0.8 * fenster(t, T("rennen:Mia") - 0.1, tDoch + 0.5) + 0.9 * fenster(t, T("wendung1:Mia#2") - 0.1, tJetzt - 0.2) + 0.8 * fenster(t, tJetzt, t60) + 1.2 * fenster(t, T("ergebnis:Mia"), T("ergebnis:Lena#2") - 0.1, 0.5, 0.4) + 0.8 * fenster(t, T("warum:Zeit"), tDrei, 0.4, 0.5),
      luecke: fenster(t, T("wendung1:Konto") - 0.2, tWarum - 0.1, 0.6, 0.7) * (1 - sink) + fenster(t, tAbst3 - 0.3, tUeb + 0.2, 0.5, 0.5),
      glanz: fenster(t, T("ergebnis:27.459") - 0.1, T("ergebnis:27.459") + 2.4, 0.3, 1.2),
      gleich: puls(t, T("wendung1:gleich") - 0.1, 1.2),
      ueber: puls(t, tJetzt + 0.2, 1.2),
      miaAn: ease.inOutSine(fortschritt(t, T("rennen:Mia"), T("rennen:Mia") + 0.5)),
    };
  };
  const zustand = M.wert(zustandRoh);

  // =====================================================================================
  // Szene
  // =====================================================================================
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#050608");
  const ZIEL0 = [0, 1.45, 0];
  rigStudio(szene, buehne.renderer, {
    ziel: ZIEL0,
    softbox: { farbe: "#EAF1FF", staerke: 6, breite: 3.6, hoehe: 1.2, pos: [3.8, 4.4, 3.4] }, fuell: 0.22, umgebungsStaerke: 0.7,
    oben: { farbe: "#F4F8FF", staerke: 70, pos: [0.2, 9.5, 0.8], winkel: 0.42, rand: 0.6, schatten: SCHATTEN },
    kanten: [{ farbe: "#A8F0E6", staerke: 2.4, pos: [-6, 3.5, -5] }, { farbe: "#FFD2B0", staerke: 2.4, pos: [6, 3, -6] }],
  });
  szene.add(hohlkehle({ breite: 44, tiefe: 24, hoehe: 17, radius: 5, farbe: "#0B0C10", rau: 0.38 }));
  if (!AUS.has("spiegel")) { const sp = spiegelBoden({ breite: 30, tiefe: 14, staerke: 0.3, streckung: 1.2, unschaerfe: 1.4, fresnel: 0.5, aufloesung: 0.28, verzerrung: 0.3 }); sp.position.z = 0.5; szene.add(sp); }
  const wl = wandLicht({ breite: 10, hoehe: 7, farbe: "#242C42", staerke: 0.8 }); wl.position.set(0, 5.5, -11.85); szene.add(wl);
  if (!AUS.has("kegel")) {
    const k = lichtKegel({ hoehe: 9.4, radiusOben: 0.25, radiusUnten: 3.2, farbe: "#EEF4FF", staerke: 0.09, weich: 1.2, streifen: 0.6 });
    k.position.set(0.2, 9.5, 0.8); szene.add(k);
    szene.add(staub({ anzahl: 420, bereich: [7, 7, 7], mitte: [0, 3.5, -0.4], groesse: 0.012, staerke: 1.6, aussen: 0.0, kegel: { spitze: [0.2, 9.5, 0.8], richtung: [0, -1, 0], winkel: 0.4 } }));
  }
  // Zusatzlichter (ohne Schatten): Teamlicht auf den Sockeln, Spot auf der Lebensuhr, Blitz bei Sprüngen
  const spot = (farbe, pos, ziel, winkel) => { const s = new THREE.SpotLight(farbe, 0, 0, winkel, 0.7, 2); s.position.set(...pos); s.target.position.set(...ziel); szene.add(s, s.target); return s; };
  const spotL = spot("#7FE8DC", [-1.6, 7.5, 3.0], [-1.05, 1.6, 1.2], 0.3), spotR = spot("#FFB27A", [1.6, 7.5, 3.0], [1.05, 1.2, 1.2], 0.3);
  const spotU = spot("#FFF4E6", [0.2, 8.5, 0.5], [0, 0.6, -1.7], 0.26);
  const blitz = new THREE.PointLight("#FFFFFF", 0, 0, 2); blitz.position.set(0, 1.6, -0.6); szene.add(blitz);

  // Sockel mit Münztürmen
  const SX = 0.85, SZ = 1.3;
  const sockA = sockel({ breite: 0.8, hoehe: 0.62, tiefe: 0.8, farbe: TUERKIS, led: 3.5, fleck: 0.5 }); sockA.position.set(-SX, 0, SZ);
  const sockB = sockel({ breite: 0.8, hoehe: 0.62, tiefe: 0.8, farbe: ORANGE, led: 3.5, fleck: 0.5 }); sockB.position.set(SX, 0, SZ);
  szene.add(sockA, sockB);
  const ledMat = (farbe) => leuchtMat(farbe, 1, { neu: true });
  const ledA = ledMat(TUERKIS), ledB = ledMat(ORANGE);
  const ledLinie = (mat, x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.022, 0.022), mat); m.position.set(x, 0.622, SZ + 0.41); m.userData.dynamisch = true; return m; };
  szene.add(ledLinie(ledA, -SX), ledLinie(ledB, SX));
  const dickeM = 0.07, radM = 0.27;
  const turmA = muenzStapel({ art: "silber", max: 32, radius: radM, dicke: dickeM, unordnung: 0.03, seed: 11, fallHoehe: 0.75 });
  const turmB = muenzStapel({ art: "kupfer", max: 32, radius: radM, dicke: dickeM, unordnung: 0.03, seed: 5, fallHoehe: 0.75 });
  turmA.position.set(-SX, sockA.oben, SZ); turmB.position.set(SX, sockB.oben, SZ);
  for (const [t, k] of [[turmA, 0.8], [turmB, 0.8]]) for (const m of t.children[0].material) { m.envMapIntensity = 0.55; m.roughness = Math.min(0.55, m.roughness + 0.2); m.color.multiplyScalar(k); }
  szene.add(turmA, turmB);

  // Lebensuhr: Drehteller mit Ring (42 Stationen, 25 → 67), Startmarken und Zeiger
  const PZ = -2.6, RR = 1.3, N = 42;
  const teller = drehteller({ radius: 0.85, led: ELFENBEIN, ledStaerke: 2.2 }); teller.position.set(0, 0, PZ); szene.add(teller);
  const ring = altersRing({ radius: RR, n: N }); ring.position.set(0, 0, PZ); szene.add(ring);
  const winkelVon = (i) => Math.PI / 2 + (i / N) * Math.PI * 2; // Ring-Station i (ohne Halbschritt)
  const marke = (i, farbe) => {
    const mat = ledMat(farbe);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12), mat);
    const w = winkelVon(i) + (Math.PI * 2) / N * 0.5;
    m.position.set(Math.cos(w) * RR, 0.17, PZ + Math.sin(w) * RR); m.userData.dynamisch = true; szene.add(m);
    return mat;
  };
  const markeL = marke(0, TUERKIS), markeM = marke(10, ORANGE), markeE = marke(41, ELFENBEIN);
  // Zeiger: leuchtender Balken von der Mitte zum Ring, dreht mit dem Alter
  const zeigerMat = ledMat(ELFENBEIN);
  const zeigerG = new THREE.Group(); zeigerG.position.set(0, teller.oben + 0.02, PZ); zeigerG.userData.dynamisch = true;
  const zeigerB = new THREE.Mesh(new THREE.BoxGeometry(RR - 0.1, 0.03, 0.035), zeigerMat); zeigerB.position.x = (RR - 0.1) / 2; zeigerG.add(zeigerB);
  const nabe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 32), zeigerMat); zeigerG.add(nabe);
  szene.add(zeigerG);
  // Lücken-Anzeige: waagerechte Linie in Höhe des linken Turms, senkrechte Klammer rechts (Elfenbein)
  const lueckeMat = ledMat(ELFENBEIN);
  const lV = new THREE.Mesh(new THREE.BoxGeometry(0.016, 1, 0.016), lueckeMat);
  const lT = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.016), lueckeMat), lT2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.016), lueckeMat);
  const striche = Array.from({ length: 14 }, () => new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.012), lueckeMat));
  for (const m of [lV, lT, lT2, ...striche]) { m.userData.dynamisch = true; m.visible = false; szene.add(m); }
  buendeln(szene);

  // =====================================================================================
  // Kamera (Fahrten, mal Zoom, mal Weitwinkel) und Update der Welt
  // =====================================================================================
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(0.5, 5.2, 14.8, 0, 0.9, -0.6) },
    { t: T("hook:ab#2"), v: C(0.2, 4.7, 13.4, 0, 0.95, -0.5), e: ease.inOutSine },
    { t: T("hook:Wer") - 0.2, v: C(0.0, 4.2, 12.4, 0, 1.0, -0.6), e: ease.inOutSine },
    { t: T("regeln:Lena") - 0.1, v: C(-1.5, 3.4, 10.0, -1.2, 1.0, 1.3), e: ease.inOutCubic },
    { t: T("regeln:Mia") - 0.2, v: C(-1.2, 3.3, 9.8, -1.1, 1.0, 1.3), e: ease.inOutSine },
    { t: T("regeln:Mia") + 0.5, v: C(1.5, 3.3, 10.0, 1.2, 0.9, 1.3), e: ease.inOutCubic },
    { t: T("regeln:Annahme") - 0.2, v: C(1.2, 3.4, 9.8, 1.1, 0.9, 1.3), e: ease.inOutSine },
    { t: T("regeln:Annahme") + 0.4, v: C(0.0, 4.4, 12.0, 0, 1.0, 0), e: ease.inOutCubic },
    { t: T("falle:Klar") - 0.2, v: C(0.4, 3.8, 9.8, 0.3, 1.0, 1.2, 28), e: ease.inOutCubic },
    { t: T("falle:Mia") - 0.1, v: C(1.5, 3.4, 8.6, 1.0, 0.9, 1.3, 26), e: ease.inOutSine },
    { t: T("falle:Oder") - 0.6, v: C(0.0, 4.2, 12.4, 0, 0.95, PZ + 0.6, 29), e: ease.inOutCubic },
    { t: T("falle:Oder") + 0.5, v: C(0.05, 4.2, 12.3, 0, 0.95, PZ + 0.6, 29), e: ease.linear },
    { t: T("rennen:Lena") - 0.4, v: C(-0.9, 4.2, 11.0, -0.4, 1.1, 0.4, 30), e: ease.inOutCubic },
    { t: t35 + 0.5, v: C(-0.8, 3.5, 10.6, -0.6, 1.4, 0.9, 28), e: ease.inOutSine },
    { t: T("rennen:Mia") - 0.1, v: C(0.9, 3.6, 10.4, 0.6, 1.0, 1.0, 28), e: ease.inOutCubic },
    { t: T("folgen:Folg"), v: C(0.2, 4.8, 13.0, 0, 1.2, 0), e: ease.inOutSine },
    { t: tDoch, v: C(1.3, 5.0, 14.4, 0.1, 1.0, -0.4, 30), e: ease.inOutCubic },
    { t: T("wendung1:Mit") + 0.3, v: C(0.2, 3.6, 10.4, 0, 1.0, PZ + 0.3, 26), e: ease.inOutCubic },
    { t: T("wendung1:Aber") - 0.4, v: C(-0.6, 3.8, 11.8, 0, 1.3, 0.4, 30), e: ease.inOutSine },
    { t: T("wendung1:Lena") + 0.3, v: C(0.0, 3.6, 12.2, 0, 1.3, 0.8, 30), e: ease.inOutCubic },
    { t: T("wendung1:Mia#2") + 0.3, v: C(0.0, 3.3, 11.0, 0, 1.3, 0.8, 28), e: ease.inOutSine },
    { t: tJetzt + 0.1, v: C(0.6, 3.0, 9.8, 0, 1.1, PZ + 0.3, 27), e: ease.inOutCubic },
    { t: T("wendung2:wächst") - 0.4, v: C(-0.5, 3.1, 10.0, 0, 1.2, 0.2, 28), e: ease.inOutSine },
    { t: t60, v: C(0.1, 3.6, 12.2, 0, 1.4, 0.8, 30), e: ease.inOutCubic },
    { t: tEnd - 0.1, v: C(1.6, 4.6, 13.2, 0.1, 1.3, 0, 30), e: ease.inOutCubic },
    { t: t67 + 0.5, v: C(0, 5.0, 12.8, 0, 1.5, 0), e: ease.inOutCubic },
    { t: t67 + 6.0, v: C(0, 5.5, 14.8, 0, 1.5, -0.3), e: ease.inOutSine },
    { t: tWarum, v: C(1.2, 4.6, 14.4, 0, 1.5, 0), e: ease.inOutSine },
    { t: T("warum:Zeit"), v: C(-1.2, 4.4, 14.2, 0, 1.5, 0), e: ease.inOutSine },
    { t: tDrei - 0.2, v: C(0.0, 3.9, 12.0, 0, 1.3, 0.5), e: ease.inOutCubic },
    { t: tAbst3 + 0.6, v: C(0.4, 4.2, 12.6, 0, 1.3, 0.3), e: ease.inOutSine },
    { t: tUeb, v: C(-0.8, 3.9, 11.6, 0, 1.2, -1.0), e: ease.inOutCubic },
    { t: tHoert + 0.1, v: C(-1.0, 3.6, 10.6, -0.8, 1.3, 1.3, 28), e: ease.inOutCubic },
    { t: tHat - 0.1, v: C(-0.4, 4.0, 12.0, -0.5, 1.6, 0.8, 30), e: ease.inOutSine },
    { t: tEnd2 + 0.2, v: C(0.4, 4.6, 13.6, -0.2, 1.8, 0.6, 30), e: ease.inOutCubic },
    { t: tMerk - 0.1, v: C(0.8, 3.6, 10.2, 0, 1.2, PZ + 0.3, 27), e: ease.inOutSine },
  ];
  const regie = new Regie(kamera, (t) => { const v = keyframes(camKeys, t); const z = v.slice(3, 6), D = 1.16; return { pos: [0, 1, 2].map((i) => z[i] + (v[i] - z[i]) * D), ziel: z, fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.25 });
  // Zoom (mal ja, mal nein): Wendung 1 auf die ungleichen Türme, Ergebnis auf beide Türme, Überraschung auf Lena
  regie.zoom({ t: T("wendung1:81.870") + 0.2, ziel: [-SX, 1.8, SZ], staerke: 0.14, halt: 1.2, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:166.640") + 0.7, ziel: [-SX, 1.8, SZ], staerke: 0.14, halt: 0.9, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:27.459") + 0.2, ziel: [0, 2.0, SZ], staerke: 0.2, halt: 1.3, rueck: 1.0 });
  regie.zoom({ t: tEnd2 - 0.2, ziel: [-SX, 1.9, SZ], staerke: 0.12, halt: 1.0, rueck: 0.9 });
  regie.schleife({ ab: tMerk, ende: DAUER - 1 / FPS });

  const post = { ...GRADING.studio, strahlen: AUS.has("strahlen") ? 0 : 0.55, strahlenPunkt: [0.2, 9.4, 0.8], strahlenSchwelle: 1.4, strahlenLaenge: 0.7, strahlenFarbe: [1, 0.95, 0.88] };
  const farbeA = new THREE.Color(TUERKIS), farbeB = new THREE.Color(ORANGE), farbeE = new THREE.Color(ELFENBEIN);
  const welt = { szene, kamera, post, update: null };
  welt.update = (t) => {
    const s = zustand(t);
    // Münztürme (am Ende rastet der Turm auf ganze Münzen: keine schwebende Münze im Standbild)
    const rast = (x, k) => lerp(x, Math.round(x), k);
    // Münzen rasten ein, wenn sich das Alter nicht ändert (keine in der Luft hängende Münze); in Bewegung fallen sie
    const tempo = Math.abs(zustandRoh(t + 0.06).alter - zustandRoh(t - 0.06).alter) / 0.12;
    const rastOK = 1 - clamp(tempo / 0.6);
    const cA = rast(s.lena / MUENZ, rastOK), cB = rast(s.mia / MUENZ, rastOK);
    turmA.setze(cA); turmB.setze(cB);
    const hA = turmA.hoehe(cA), hB = turmB.hoehe(cB);
    // Lebensuhr: Ring, Zeiger, Startmarken
    teller.dreh(0.12 * Math.sin(0.3 * t));
    ring.setze(s.alter - 25, ELFENBEIN, 1.5);
    zeigerG.rotation.y = -(Math.PI / 2 + ((s.alter - 25) / N) * Math.PI * 2);
    zeigerMat.color.copy(farbeE).multiplyScalar(2.0 * s.ledU);
    teller.led.setze(s.ledU);
    markeL.color.copy(farbeA).multiplyScalar(2.0 + 1.5 * (s.alter > 25.2 ? 1 : 0));
    markeM.color.copy(farbeB).multiplyScalar(1.0 + 3.0 * ease.inOutSine(clamp(s.alter - 34.6)) + 2.5 * puls(t, T("regeln:Mia"), 0.9));
    markeE.color.copy(farbeE).multiplyScalar(0.8 + 2.4 * ease.inOutSine(clamp(s.alter - 66.4)));
    // LED-Helligkeit (Aufleuchten)
    ledA.color.copy(farbeA).multiplyScalar(2.2 * s.ledL); ledB.color.copy(farbeB).multiplyScalar(2.2 * s.ledR);
    // Lichter
    spotL.intensity = 34 * s.spotL; spotR.intensity = 34 * s.spotR; spotU.intensity = 70 * s.spotU;
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
    aktualisiere(t);
    regie.anwenden(t);
    // Fokus (Tiefenschärfe): wandert mit dem Geschehen
    let fp = [0, 1.4, 0.2];
    if (t < T("regeln:Mia") - 0.1) fp = t < T("regeln:Lena") - 0.2 ? [0, 1.2, 0.4] : [-SX, 1.2, SZ];
    else if (t < T("falle:Klar") - 0.2) fp = [SX, 0.9, SZ];
    else if (t < T("rennen:Lena") - 0.3) fp = t < T("falle:Mia") - 0.1 ? [0, 0.9, 1.0] : [SX, 1.0, SZ];
    else if (t > tDoch + 1.0 && t < T("wendung1:Aber") - 0.2) fp = [0, 0.9, PZ];
    else if (t > tJetzt - 0.2 && t < T("wendung2:wächst") - 0.5) fp = [0, 0.9, PZ];
    else if (t > tHat - 0.3 && t < tEnd2) fp = [-SX, 1.4, SZ];
    else if (t > tMerk - 0.2) fp = [0, 0.95, PZ];
    Object.assign(post, fokus(kamera, fp, { tiefe: 0.2, nah: 0.5, fern: 0.7 }));
  };

  // =====================================================================================
  // HUD (design.md): Tafel ab Bild 0, Chips nur mit neuer Information, keine Sticker
  // =====================================================================================
  const secToAlter = (a) => ((a - 25) / 42) * 59.9;
  M.tafel({
    y: 166,
    links: { team: "a", name: "LENA", einheit: "€", nk: 0, max: 999999 },
    rechts: { team: "b", name: "MIA", einheit: "€", nk: 0, max: 999999 },
    werte: (t) => { const s = zustandRoh(t); return { a: s.lena, b: s.mia }; },
    vorn: null,
    uhr: { ein: 0.4, zeit: (t) => secToAlter(zustandRoh(t).alter), format: (sek) => String(25 + Math.min(42, Math.floor((sek * 42) / 59.9 + 0.02))), label: "ALTER" },
  });
  const w = (t, typ, klang, text) => M.melde({ t, typ, klang, text });
  w(0.5, "welt", "pop", "LED-Kanten leuchten auf");
  w(T("hook:Hundert"), "welt", "pop", "Lenas Sockel leuchtet");
  w(T("hook:150"), "welt", "pop", "Mias Sockel leuchtet");
  w(T("hook:oder"), "welt", "pop", "Lebensuhr-Ring leuchtet");
  w(T("hook:67"), "welt", "ding", "Ring-Ende 67 leuchtet");
  for (const f of FUELL) w(f, "welt", "pop", "Lebensuhr leuchtet");
  w(T("hook:35"), "welt", "pop", "Mias Sockel leuchtet");
  w(T("hook:Wer"), "welt", "pop", "Lebensuhr leuchtet");
  w(T("hook:hat") + 0.4, "welt", "pop", "Zeiger leuchtet");
  w(T("regeln:Lena"), "welt", "pop", "Licht auf Lenas Sockel");
  w(T("regeln:25"), "welt", "pop", "Startmarke 25 leuchtet");
  w(T("regeln:Mia"), "welt", "pop", "Licht auf Mias Sockel, Startmarke 35");
  w(T("regeln:mehr"), "welt", "pop", "Mias Sockel leuchtet");
  w(T("falle:Klar"), "welt", "pop", "Spot auf die Lebensuhr");
  w(T("falle:Mia"), "welt", "pop", "Licht auf Mias Turm-Platz");
  w(T("falle:Oder"), "welt", "ding", "Ring leuchtet, Bild steht");
  w(T("rennen:Mit"), "welt", "pop", "Zeiger startet, Münzen fallen");
  w(t35, "welt", "ding", "Alter 35, Lenas Turm 15.499");
  w(T("rennen:Mia"), "welt", "ding", "Mias Sockel geht an");
  w(tDoch, "welt", "whoosh", "Kamera weit, Mias Turm wächst schneller");
  w(T("wendung1:55"), "welt", "pop", "Zeiger auf 55");
  w(T("wendung1:gleich"), "welt", "ding", "beide Eingezahlt-Zähler 36.000 € leuchten");
  w(T("wendung1:Konto"), "welt", "pop", "Lücke zwischen den Türmen leuchtet");
  w(T("wendung1:81.870"), "welt", "ding", "Lenas Turm leuchtet, Zoom");
  w(T("wendung1:61.119"), "welt", "ding", "Mias Turm leuchtet");
  w(tJetzt, "welt", "pop", "Mias Eingezahlt-Zähler überholt");
  w(T("wendung2:wächst"), "welt", "ding", "Lücke wird länger");
  w(t60, "welt", "ding", "Alter 60, Abstand 23.080");
  w(tEnd, "welt", "whoosh", "Alter 67, Kamera weit");
  w(T("ergebnis:166.640"), "welt", "ding", "Lenas Turm leuchtet");
  w(T("ergebnis:139.181"), "welt", "ding", "Mias Turm leuchtet");
  w(T("ergebnis:27.459"), "welt", "ding", "Differenz leuchtet");
  w(T("ergebnis:Euro#2"), "welt", "pop", "Lebensuhr leuchtet");
  w(T("ergebnis:Lena#2"), "welt", "pop", "Lebensuhr leuchtet");
  w(T("ergebnis:7.200"), "welt", "ding", "Einzahlungen leuchten");
  w(T("ergebnis:weniger"), "welt", "pop", "Lenas Sockel und Zähler leuchten");
  w(T("ergebnis:eingezahlt"), "welt", "pop", "Mias Sockel und Zähler leuchten");
  for (const x of ["warum:Lenas", "warum:Zeit"]) w(x, "welt", "pop", "Turm leuchtet");
  w(tDrei, "welt", "whoosh", "Rendite 5 % → 3 %, Türme schrumpfen");
  w(tAbst3, "welt", "ding", "Abstand 3.986 leuchtet");
  w(tUeb, "welt", "whoosh", "Rendite zurück auf 5 %, Kamera fährt");
  w(tHoert, "welt", "whoosh", "Mias Turm sinkt, Lenas Turm sinkt auf 35");
  w(T("ueberraschung:auf"), "welt", "pop", "Zeiger steht bei 35");
  w(T("ueberraschung:12.000"), "welt", "ding", "Eingezahlt 12.000 leuchtet");
  w(tHat, "welt", "wachsen", "Lenas Turm wächst allein");
  w(tEnd2, "welt", "ding", "Endwert 73.853 leuchtet");
  w(T("merksatz:Zeit"), "welt", "ding", "Lebensuhr leuchtet");

  // Annahme-Pille (Rendite klar als Annahme), darunter Einzahlungs-Zähler
  hud.add(new Pille(M, { ein: "regeln:Annahme", aus: "merksatz:Mia", x: 540, y: 330, prozent: (t) => zustand(t).p, wechsel: [tDrei, tUeb] }));
  const vor = (x, d = 0.3) => T(x) - d; // alte Chips blenden vor dem neuen aus (keine Überlappung beim Wechsel)
  const reihe = 390, reihe2 = 510, XL = 345, XR = 735;
  M.chip({ text: "100 € / MONAT", ein: "regeln:ab", aus: vor("wendung1:Doch", 0.5), team: "a", art: "hell", x: XL, y: reihe, anker: "mitte" });
  M.chip({ text: "AB 25", ein: "regeln:25", aus: vor("wendung1:Doch", 0.5), team: "a", art: "voll", x: XL, y: reihe2, anker: "mitte" });
  M.chip({ text: "150 € / MONAT", ein: "regeln:startet", aus: vor("wendung1:Doch", 0.5), team: "b", art: "hell", x: XR, y: reihe, anker: "mitte" });
  M.chip({ text: "AB 35", ein: "regeln:10", aus: vor("wendung1:Doch", 0.5), team: "b", art: "voll", x: XR, y: reihe2, anker: "mitte" });
  hud.add(new Zaehler(M, { team: "a", x: XL, y: reihe, ein: tDoch - 0.2, aus: vor("merksatz:Mia", 0.2), wert: (t) => zustand(t).einL, puls: [T("wendung1:gleich"), T("ergebnis:7.200"), T("ergebnis:weniger"), T("ergebnis:eingezahlt")] }));
  hud.add(new Zaehler(M, { team: "b", x: XR, y: reihe, ein: tDoch - 0.2, aus: vor("merksatz:Mia", 0.2), wert: (t) => zustand(t).einM, sicht: (t) => 1 - ease.inOutSine(fortschritt(t, tHoert, t35b)), puls: [T("wendung1:gleich"), tJetzt + 0.3, T("ergebnis:7.200"), T("ergebnis:weniger"), T("ergebnis:eingezahlt")] }));
  M.chip({ text: "ABSTAND 23.080 €", ein: "wendung2:23.080", aus: vor("ergebnis:Endstand", 0.2), team: "akzent", art: "voll", x: 540, y: reihe2, anker: "mitte" });
  M.chip({ text: "ABSTAND 3.986 €", ein: "warum:3.986", aus: vor("ueberraschung:Und", 0.2), team: "akzent", art: "voll", x: 540, y: reihe2, anker: "mitte" });

  M.bilanz({
    y: 510, ein: "ergebnis:Endstand", aus: vor("warum:Warum", 0.35), titel: "BILANZ MIT 67",
    zeilen: [
      { label: "LENA", wert: Z.lena67, einheit: "€", team: "a", ein: "ergebnis:166.640" },
      { label: "MIA", wert: Z.mia67, einheit: "€", team: "b", ein: "ergebnis:139.181" },
    ],
    differenz: { label: "LENA VORN", wert: Z.abstand67, einheit: "€", ein: "ergebnis:27.459" },
  });
  M.chip({ text: "7.200 € WENIGER EINGEZAHLT", ein: "ergebnis:7.200", aus: vor("warum:Warum", 0.35), team: "a", art: "voll", x: 540, y: 960, anker: "mitte" });
  hud.add(new WarumKarte(M, {
    ein: "warum:Warum", aus: "warum:Bei", y: 510,
    reihen: [
      { label: "LENA · 42 JAHRE", team: "a", werte: [Z.einLena, Math.round(Z.lena67 - Z.einLena)], unter: ["EINGEZAHLT", "ZINSEN"], ein: "warum:Lenas" },
      { label: "MIA · 32 JAHRE", team: "b", werte: [Z.einMia, Math.round(Z.mia67 - Z.einMia)], unter: ["EINGEZAHLT", "ZINSEN"], ein: "warum:Zeit" },
    ],
  }));
  M.pointe({ woerter: [{ text: "DIE", ein: T("merksatz:die") }, { text: "ZEIT", ein: "merksatz:Zeit#2", farbe: "akzent" }], ein: "merksatz:Zeit#2", aus: "schluss:Schreib", y: 520, groesse: 190 });
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
