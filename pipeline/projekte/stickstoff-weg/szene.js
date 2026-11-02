// Account 2, Video 2: „Was, wenn der Stickstoff 5 Sekunden aus der Luft verschwindet?“
// Stil 16 „POV-Filmlook stilisiert“ (wie das Video „Schall im Schritttempo“): Ich-Kamera auf Augenhöhe im Supermarkt, Bloom,
// sichtbare Luftmoleküle (N₂ blau, O₂ koralle). Rechnung: ../../sim/stickstoff_weg.mjs (Tests: node --test sim/stickstoff_weg.test.mjs).
// Deterministisch: window.renderAt(t). Kein Logo, kein Kanalname, keine Rubrik im Bild.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER, Rollzahl } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes, smoothstep } from "../../engine/bewegung.js";
import * as S from "../../sim/stickstoff_weg.mjs";
import { baueMarkt, V, AUGE, TASSE, N2_FARBE, O2_FARBE } from "./markt.js";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 1024;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.8;
const SKALA = Q.has("skala") ? +Q.get("skala") : 1; // interne 3D-Auflösung (HUD bleibt scharf)
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich): Stickstoff = Blau, Sauerstoff = Koralle. Kein Gelb (Gelb = aktuelles Untertitel-Wort).
const TUERKIS = "#2EC4B6";

const R = S.alles(); // Rechnung (Tests: sim/stickstoff_weg.test.mjs)
const P_NORMAL = S.P0, P_REST = R.rest_druck_hPa;
const HOEHE_KM = R.hoehe_druck_m / 1000;
const SIEDE = R.kaffee.siedepunkt;

// =====================================================================================
// Countdown-HUD (5 Segmente): Koralle = verbleibend, #3B3F55 = abgelaufen (wie im Prototyp)
// =====================================================================================
class Countdown {
  constructor(M, wurzel, { tauFn, tauRoh, von, bis }) {
    this.M = M; this.tauFn = tauFn; this.tauRoh = tauRoh; this.von = von; this.bis = bis;
    this.e = el("div", "ms ms-countdown", `<div class="cd-reihe">${"<div class='cd-seg'><i></i></div>".repeat(5)}</div><div class="cd-zahl">5,0<small>s</small></div>`, wurzel);
    this.segs = [...this.e.querySelectorAll(".cd-seg")];
    this.balken = this.segs.map((s) => s.querySelector("i"));
    this.zahl = this.e.querySelector(".cd-zahl");
    this._letzt = null;
  }
  update(t) {
    const tau = clamp(this.tauFn(t), 0, 5);
    this.segs.forEach((s, i) => {
      const f = clamp(i + 1 - tau, 0, 1);
      this.balken[i].style.transform = `scaleX(${f.toFixed(4)})`;
      s.classList.toggle("aktiv", tau > i && tau < i + 1 && t > this.von);
    });
    const rest = Math.max(0, 5 - tau);
    const txt = rest.toFixed(1).replace(".", ",");
    if (txt !== this._letzt) { this.zahl.innerHTML = `${txt}<small>s</small>`; this._letzt = txt; }
    this.zahl.classList.toggle("null", rest <= 0.001);
    const ph = tau % 1, puls = tau > 0 && tau < 5 ? Math.exp(-ph * 9) * 0.06 : 0;
    this.e.style.transform = `scale(${(1 + puls).toFixed(4)})`;
  }
  ereignisse() {
    const ev = [];
    for (const [a, b] of this.M.laufIntervalle((t) => +clamp(this.tauRoh(t), 0, 5).toFixed(1), this.von, this.bis)) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    for (let k = 1; k <= 5; k++) {
      let t = this.von; while (t < this.bis && this.tauRoh(t) < k - 1e-6) t += 1 / 60;
      if (t < this.bis) ev.push({ t, typ: "marke", klang: "tick", text: `Sekunde ${k} vorbei` });
    }
    return ev;
  }
}

// =====================================================================================
// Luftdruck-Karte: Zahl rollt von 1.013 auf 222 hPa, Balken zeigt die Zusammensetzung der Luft
// =====================================================================================
class Druckkarte {
  constructor(M, wurzel, { ein, aus, y, tFall, dauerFall = 1.3, tHoehe }) {
    this.M = M; this.ein = ein; this.aus = aus; this.tFall = tFall; this.dauerFall = dauerFall; this.tHoehe = tHoehe;
    this.e = el("div", "ms ms-karte ms-druck", `<div class="ms-kk"><i></i>LUFTDRUCK</div>
      <div class="dz"><span class="gross"></span><span class="nebe">VORHER<br>1.013 HPA</span></div>
      <div class="spur"><div class="luft"><b class="n2"></b><b class="o2"></b><b class="ar"></b></div></div>
      <div class="unter"><span>N₂ · O₂ · AR</span><span class="hoch"></span></div>`, wurzel);
    this.e.style.top = y + "px";
    this.rz = new Rollzahl(this.e.querySelector(".gross"), { nk: 0, max: 1013, einheit: "hPa" });
    this.b = { n2: this.e.querySelector(".n2"), o2: this.e.querySelector(".o2"), ar: this.e.querySelector(".ar"), luft: this.e.querySelector(".luft") };
    this.hoch = this.e.querySelector(".hoch");
    this.breite = 780 - 68; // Spur in px = 1.013 hPa
    this.visible = false;
  }
  druck(t) { return lerp(P_NORMAL, P_REST, ease.inOutCubic(fortschritt(t, this.tFall, this.tFall + this.dauerFall))); }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    const v = an ? "visible" : "hidden";
    if (this.e.style.visibility !== v) this.e.style.visibility = v;
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 2.5, daempfung: 0.52 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.3));
    this.e.style.transform = `translateY(${((1 - s) * 60 - x * 30).toFixed(2)}px) scale(${(0.92 + 0.08 * s).toFixed(4)})`;
    this.e.style.opacity = String(clamp(s * 3) * (1 - x));
    const k = ease.inOutCubic(fortschritt(t, this.tFall, this.tFall + this.dauerFall));
    const p = this.druck(t);
    this.rz.setze(p, k <= 0 || k >= 1);
    const W = this.breite / P_NORMAL;
    const n2 = LUFT_N2 * P_NORMAL * (1 - k) * W, o2 = S.teildruckO2() * W, ar = Math.max(5, (P_REST - S.teildruckO2()) * W);
    this.b.n2.style.width = n2.toFixed(1) + "px"; this.b.o2.style.width = o2.toFixed(1) + "px"; this.b.ar.style.width = ar.toFixed(1) + "px";
    this.b.luft.style.transform = `translateX(-50%)`;
    const hoehe = t >= this.tHoehe ? `${HOEHE_KM.toFixed(1).replace(".", ",")} KM HÖHE` : "";
    if (this.hoch.textContent !== hoehe) this.hoch.textContent = hoehe;
  }
  ereignisse() {
    const ev = [{ t: this.ein, typ: "formel", klang: "pop", text: "Luftdruck-Karte" }];
    for (const [a, b] of this.M.laufIntervalle((t) => Math.round(this.druck(t)), this.tFall, this.tFall + this.dauerFall + 0.1)) ev.push({ t: a, typ: "zaehler", dauer: b - a, laufend: true, klang: "zaehlen" });
    ev.push({ t: this.tFall + this.dauerFall, typ: "formel", klang: "ding", text: "222 hPa" });
    return ev;
  }
}
const LUFT_N2 = S.LUFT.N2;

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { breite: Math.round(1080 * SKALA), hoehe: Math.round(1920 * SKALA), msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const W = baueMarkt(buehne, { schatten: SCHATTEN });

  // ---------- Zeitmarken ----------
  const tLos = T("start:Los"), tS1 = T("sek1:Sekunde"), tAtmest = T("sek1:atmest"), tWeiter = T("sek1:weiter,"), tSauer = T("sek1:Sauerstoff");
  const tS2 = T("sek2:Sekunde"), tAber = T("sek2:Aber"), tFaellt = T("sek2:fällt"), t222 = T("sek2:222"), t11 = T("sek2:11"), tHoehe = T("sek2:Höhe.");
  const tS3 = T("sek3:Sekunde"), tKlatsch = T("sek3:klatschen") - 0.04, tS4 = T("sek4:Sekunde"), tS5 = T("sek5:Sekunde"), tHinter = T("sek5:Hinter"), tZischt = T("sek5:zischt");
  const tSekEnde = T("sek5:etwas.>"), tErg = T("ergebnis:Ergebnis:"), tWarum = T("warum:Warum?"), tErst = T("warum:Erstens:"), tZweit = T("warum:Zweitens:"), tGef = T("warum:Gefühlt:");
  const tUeb = T("ueberraschung:Das"), tWasser = T("ueberraschung:Wasser"), t62 = T("ueberraschung:62"), t80 = T("ueberraschung:80."), tUeber = T("ueberraschung:über,");
  const tMerk = T("merksatz:Sauerstoff"), tStick = T("merksatz:Stickstoff"), tSchluss = T("ende:Welches");
  const tRueck = tSchluss - 0.05; // Stickstoff ist wieder da
  const tSchleife = tSchluss + 0.35;

  // ---------- Szenario-Zeit τ (0–5 s), im Takt der „Sekunde …“-Marken ----------
  const tauKeys = [
    { t: 0, v: 0 }, { t: tS1, v: 0 }, { t: tS2, v: 1, e: ease.linear }, { t: tS3, v: 2, e: ease.linear }, { t: tS4, v: 3, e: ease.linear },
    { t: tS5, v: 4, e: ease.linear }, { t: tSekEnde, v: 5, e: ease.linear }, { t: DAUER + 1, v: 5 },
  ];
  const tauRoh = (t) => keyframes(tauKeys, t);

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    akzent: TUERKIS,
    teams: {
      a: { name: "STICKSTOFF", farbe: N2_FARBE, woerter: ["Stickstoff*"] },
      b: { name: "SAUERSTOFF", farbe: O2_FARBE, woerter: ["Sauerstoff*"] },
    },
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  const tau = M.wert(tauRoh);

  hud.add(new Countdown(M, hud.wurzel, { tauFn: tau, tauRoh, von: tS1, bis: tSekEnde + 0.2 }));

  // ----- Hook: Titel steigt Wort für Wort auf, dazu die Legende der Moleküle -----
  M.titel({ y: 560, groesse: 116, aus: "regeln:Du-0.25", woerter: [
    { text: "STELL", ein: "Stell-0.04", art: "klein" }, { text: "DIR", ein: "dir-0.04", art: "klein" }, { text: "VOR:", ein: "vor,-0.04", art: "klein" },
    { umbruch: true },
    { text: "STICKSTOFF", ein: "Stickstoff-0.04", team: "a" },
    { umbruch: true },
    { text: "5", ein: "fünf-0.04" }, { text: "SEKUNDEN", ein: "Sekunden-0.04" }, { text: "WEG", ein: "lang-0.04", team: "a" },
  ] });
  M.chips({ y: 392, ausrichtung: "mitte", abstand: 40, aus: "start:Los-0.45", liste: [
    { text: "N₂ · 78 %", ein: "Stickstoff+0.2", art: "voll", team: "a" },
    { text: "O₂ · 21 %", ein: "regeln:Supermarkt.-0.05", art: "voll", team: "b" },
  ] });
  // ----- Regeln: auch in Tüten, Lunge, Ohr -----
  M.chips({ y: 560, ausrichtung: "mitte", aus: "falle:Klar,-0.35", liste: [{ text: "AUCH IN DER TÜTE", ein: "Tüten,-0.02", art: "hell", team: "a" }] });
  M.chips({ y: 710, ausrichtung: "mitte", aus: "falle:Klar,-0.35", liste: [{ text: "AUCH IN DER LUNGE", ein: "Lunge-0.02", art: "hell", team: "a" }] });
  M.chips({ y: 860, ausrichtung: "mitte", aus: "falle:Klar,-0.35", liste: [{ text: "AUCH IM OHR", ein: "Ohr-0.02", art: "hell", team: "a" }] });
  // ----- Denkfalle -----
  M.stempel({ text: "KLAR?", ein: "falle:Klar,", aus: "start:Los-0.1", x: SICHER.mitte, y: 900, winkel: -6, farbe: "weiss", textFarbe: "tinte", groesse: 128 });
  // ----- Start: N₂ = 0 -----
  M.chips({ y: 392, ausrichtung: "mitte", aus: "sek1:Sekunde+0.25", liste: [{ text: "N₂ · 0 %", ein: "start:Los", art: "voll", team: "a", gross: true }] });

  // ----- Sekunde 1: Du atmest weiter -----
  M.stempel({ text: "ATMEN GEHT!", ein: "sek1:weiter,", aus: "sek1:weiter,+1.15", x: SICHER.mitte, y: 880, winkel: 5, farbe: "b", groesse: 104 });
  M.chips({ y: 520, ausrichtung: "mitte", aus: "folgen:Folg-0.1", liste: [{ text: "O₂ BLEIBT: 212 HPA", ein: "sek1:Sauerstoff", art: "voll", team: "b" }] });
  M.folgen({ ein: "Folg", dauer: 1.8, y: 960 });

  // ----- Sekunde 2: der Druck fällt -----
  hud.add(new Druckkarte(M, hud.wurzel, { ein: tAber - 0.1, aus: tS3 - 0.15, y: 410, tFall: tFaellt + 0.05, dauerFall: Math.max(0.9, t222 - tFaellt + 0.55), tHoehe: t11 - 0.1 }));
  M.chips({ y: 880, ausrichtung: "mitte", aus: "sek3:Sekunde-0.15", liste: [{ text: "REISEFLUGHÖHE EINES JETS", ein: "sek2:So", art: "dunkel" }] });

  // ----- Sekunde 3: Tüten -----
  M.chips({ y: 440, ausrichtung: "mitte", aus: "sek4:Sekunde-0.1", liste: [{ text: "INNEN: FAST NICHTS", ein: "sek3:Chipstüten", art: "dunkel" }] });
  M.chips({ y: 700, ausrichtung: "mitte", aus: "sek4:Sekunde-0.1", liste: [{ text: "≈ 2 T PRO M²", ein: "sek3:2", art: "voll", team: "b", gross: true }] });
  M.stempel({ text: "KLATSCH!", ein: "sek3:klatschen", aus: "sek3:klatschen+1.1", x: SICHER.mitte, y: 790, winkel: -7, farbe: "a", groesse: 124 });

  // ----- Sekunde 4: Ohr -----
  M.chips({ y: 470, ausrichtung: "mitte", aus: "sek5:Sekunde-0.1", liste: [{ text: "OHR: INNEN = AUSSEN", ein: "sek4:Ohr?", art: "hell", team: "a" }] });
  // ----- Sekunde 5: hinter dir -----
  M.chips({ y: 470, ausrichtung: "mitte", aus: "ergebnis:Ergebnis:-0.4", liste: [{ text: "HINTER DIR …", ein: "sek5:Hinter", art: "dunkel" }] });

  // ----- Ergebnis -----
  M.bilanz({
    y: 420, ein: "ergebnis:Ergebnis:+0.05", aus: "warum:Warum?-0.15", titel: "Luftdruck",
    zeilen: [
      { label: "NORMAL", wert: Math.round(P_NORMAL), einheit: "hPa", team: "a", ein: "ergebnis:Ergebnis:+0.25" },
      { label: "OHNE N₂", wert: Math.round(P_REST), einheit: "hPa", team: "b", ein: "ergebnis:222-0.05" },
    ],
    differenz: { label: "FEHLT", wert: Math.round(P_NORMAL - P_REST), einheit: "hPa", ein: "ergebnis:hPa.-0.1" },
  });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "warum:Warum?-0.15", liste: [{ text: `NUR ${Math.round(S.restAnteil() * 100)} % BLEIBEN`, ein: "ergebnis:hPa.+0.3", art: "voll", team: "b", gross: true }] });

  // ----- Warum? Zwei Faktoren -----
  M.balken({ y: 400, ein: "warum:Erstens:-0.1", aus: "ueberraschung:Das-0.15", titel: "Warum?", max: 100, faktoren: [
    { label: "ANTEIL DER LUFT", ein: "warum:Stickstoff", a: { wert: 78, text: "78 %" }, b: { wert: 21, text: "21 %" }, tag: "N₂: NUR EIN UND AUS", tagEin: "warum:atmest" },
  ] });
  M.formel({ y: 800, ein: "warum:Zweitens:-0.1", aus: "ueberraschung:Das-0.15", titel: "Zweitens: Sauerstoffdruck", teile: [
    { text: "212", einheit: "hPa", ein: "warum:Dein", team: "b" }, { text: "=", ein: "warum:Sauerstoffdruck" }, { text: "212", einheit: "hPa", ein: "warum:gleich.-0.1", team: "b", art: "erg" },
  ], unter: { text: "VORHER = JETZT", ein: "warum:gleich.+0.1", team: "b" } });
  M.zaehler({ ein: "warum:Gefühlt:", aus: "ueberraschung:Das-0.15", wert: M.kurve([{ t: "warum:Gefühlt:+0.1", v: 0 }, { t: "warum:Meter.-0.1", v: Math.round(R.atmung.hoehe_kurz / 500) * 500, e: ease.outCubic }]), nk: 0, einheit: "m", max: 2500, team: "b", art: "voll", label: "GEFÜHLTE HÖHE ≈", x: SICHER.mitte, y: 1135, anker: "mitte" });

  // ----- Zweite Überraschung: Kaffee -----
  M.zaehler({ ein: "ueberraschung:Wasser-0.1", aus: "merksatz:Sauerstoff-0.2", wert: M.kurve([{ t: "ueberraschung:Wasser", v: 100 }, { t: "ueberraschung:62+0.25", v: Math.round(SIEDE), e: ease.inOutCubic }]), nk: 0, einheit: "°C", max: 100, team: "a", art: "voll", label: "SIEDEPUNKT", x: SICHER.mitte, y: 440, anker: "mitte" });
  M.chips({ y: 560, ausrichtung: "mitte", aus: "merksatz:Sauerstoff-0.2", liste: [{ text: "KAFFEE: 80 °C", ein: "ueberraschung:Kaffee", art: "dunkel" }] });
  M.stempel({ text: "KOCHT!", ein: "ueberraschung:kocht#2", aus: "ueberraschung:kocht#2+1.2", x: SICHER.mitte, y: 900, winkel: -6, farbe: "akzent", groesse: 128 });

  // ----- Merksatz und Schluss -----
  M.pointe({ text: "SAUERSTOFF | ZUM *ATMEN.*", ein: "merksatz:Sauerstoff", takt: 0.22, aus: "merksatz:Stickstoff-0.5", y: 470, groesse: 124 });
  M.pointe({ text: "STICKSTOFF | FÜR DEN | *DRUCK.*", ein: "merksatz:Stickstoff", takt: 0.2, aus: "ende:Welches-0.1", y: 470, groesse: 124 });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "ende:Schreib-0.1", liste: [{ text: "DEIN SZENARIO?", ein: "ende:Szenario-0.05", art: "voll", team: "a", gross: true }] });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 62, versteckt: [[tSchluss + 4.3, DAUER + 1]] });

  // Blitz, wenn der Stickstoff verschwindet bzw. zurückkehrt (HUD-Ebene ohne Text)
  const blitz = el("div", "blitz-n2", "", hud.wurzel);
  blitz.style.background = `radial-gradient(ellipse at 50% 45%, rgba(91,140,255,0.0) 28%, rgba(91,140,255,0.6) 100%)`;
  const blitzZeiten = [tLos, tRueck];
  hud.add({ update(t) { let o = 0; for (const b of blitzZeiten) o = Math.max(o, t >= b - 0.03 ? Math.exp(-(t - b + 0.03) * 5.5) : 0); blitz.style.opacity = (o * 0.9).toFixed(3); } });

  // 3D-Ereignisse fürs Protokoll (Ton und Prüfung)
  M.melde({ t: tLos + 0.02, typ: "welle", klang: "boom", dauer: 0.5, text: "Stickstoff verschwindet (Moleküle platzen)" });
  M.melde({ t: tAtmest - 0.1, typ: "kamera", klang: "whoosh", dauer: 0.9, text: "Einatmen: Sauerstoff strömt zu dir" });
  M.melde({ t: tKlatsch, typ: "klatsch", klang: "schlag", text: "Tüten klatschen zusammen" });
  M.melde({ t: tKlatsch + 0.14, typ: "klatsch", klang: "stempel", text: "Tütenwand schlägt nach" });
  M.melde({ t: tHinter - 0.1, typ: "kamera", klang: "whoosh", dauer: 0.8, text: "Umdrehen zur Backstation" });
  M.melde({ t: tZischt - 0.2, typ: "sieden", klang: "sprudeln", dauer: 2.2, text: "Kaffee beginnt zu sieden" });
  M.melde({ t: tUeb + 0.05, typ: "sieden", klang: "sprudeln", dauer: 3.2, text: "Kaffee kocht" });
  M.melde({ t: tUeber - 0.1, typ: "sieden", klang: "sprudeln", dauer: 2.6, text: "Kaffee kocht über" });
  M.melde({ t: tRueck, typ: "welle", klang: "boom", dauer: 0.6, text: "Stickstoff kehrt zurück" });
  M.melde({ t: tRueck + 0.25, typ: "klatsch", klang: "weg", text: "Tüten blasen sich wieder auf" });

  // =====================================================================================
  // Welt-Zustand
  // =====================================================================================
  const pullKurve = (t) => { const x = fortschritt(t, tAtmest - 0.15, tAtmest + 2.3); return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2; };
  const kochKeys = [
    { t: 0, v: 0 }, { t: tS5 + 0.1, v: 0 }, { t: tZischt + 0.9, v: 0.42, e: ease.outCubic }, { t: tUeb + 0.2, v: 0.62 }, { t: tUeber + 0.45, v: 1.0, e: ease.inOutCubic },
    { t: tRueck, v: 1.0 }, { t: tRueck + 0.55, v: 0, e: ease.inOutCubic }, { t: DAUER + 1, v: 0 },
  ];
  const koch = (t) => keyframes(kochKeys, t);
  const zustand = (t, pov, eye) => ({ periode: ENDE, n2: { aus: tLos, rueck: tRueck }, eye, pull: pullKurve(t), tKlatsch, tRueck, koch: koch(t), pov });

  // =====================================================================================
  // Kamera: Ich-Perspektive (Augenhöhe), Blickziele im Takt der Stimme
  // =====================================================================================
  const COFFEE_EYE = [-1.3, 1.5, 1.22];
  const augeKeys = [
    { t: 0, v: [0, 1.65, 0] },
    { t: tS3 - 0.5, v: [0, 1.65, 0] },
    { t: tS3 + 0.9, v: [-0.15, 1.62, 0.4], e: ease.inOutCubic }, // ein Schritt zurück: die ganze Tütenwand passt ins Bild
    { t: tS5 - 0.1, v: [-0.15, 1.62, 0.4] },
    { t: tZischt + 0.4, v: [-0.6, 1.58, 0.8], e: ease.inOutCubic }, // zur Backstation
    { t: tErg + 0.5, v: [-0.6, 1.58, 0.8] },
    { t: tUeb - 0.7, v: COFFEE_EYE, e: ease.inOutCubic }, // (liegt in der Totalen, unsichtbar)
    { t: tMerk + 0.35, v: COFFEE_EYE },
    { t: tSchluss - 0.25, v: [0, 1.65, 0], e: ease.inOutCubic }, // zurück in den Gang
    { t: DAUER + 1, v: [0, 1.65, 0] },
  ];
  const augePos = (t) => keyframes(augeKeys, t);
  const auge = (t) => {
    const a = augePos(t);
    const geh = Math.sin(t * 1.9) * 0.012 + Math.sin(t * 0.7) * 0.01;
    return [a[0] + Math.sin(t * 0.43) * 0.02, a[1] + geh, a[2] + Math.cos(t * 0.37) * 0.015];
  };
  const Z0 = () => V(14, 1.35, 0.15);
  const ZUm = () => V(14, 1.45, 1.7);
  const ZChips = () => V(-1.9, 1.1, -1.3);
  const ZBrust = () => V(1.0, 0.35, 0.3);
  const ZOhr = () => V(3.2, 1.75, 1.9);
  const ZUp = () => V(12, 2.8, 0.1);
  const ZDecke = () => V(5, 3.4, 0.3);
  const ZStation = () => V(-1.7, 1.12, 1.85);
  const ZTasse = () => V(TASSE.x, TASSE.y + 0.085, TASSE.z);
  const ziele = [
    { t: 0, z: Z0, d: 0 },
    { t: T("regeln:Du") - 0.1, z: ZUm, d: 1.0 },
    { t: T("regeln:Auch") - 0.25, z: ZChips, d: 0.7 },
    { t: T("regeln:Lunge") - 0.12, z: ZBrust, d: 0.45 },
    { t: T("regeln:Ohr") - 0.1, z: ZOhr, d: 0.5 },
    { t: T("falle:Klar,") - 0.35, z: Z0, d: 0.8 },
    { t: tAtmest - 0.2, z: ZUp, d: 0.9 },
    { t: tSauer - 0.15, z: Z0, d: 0.9 },
    { t: tAber - 0.15, z: ZDecke, d: 0.8 },
    { t: T("sek2:Höhe.") + 0.1, z: Z0, d: 0.7 },
    { t: tS3 + 0.2, z: ZChips, d: 0.9 },
    { t: tS4 + 0.1, z: Z0, d: 0.7 },
    { t: tHinter - 0.35, z: ZStation, d: 0.9 },
    { t: tErg - 0.4, z: ZTasse, d: 0.01 }, // in der Totalen unsichtbar
    { t: tMerk - 0.25, z: Z0, d: 1.0 },
  ];
  for (const k of ziele.slice(1)) if (k.d > 0.05) M.melde({ t: k.t, typ: "kamera", klang: false, dauer: k.d, text: "Blickwechsel" });
  const blickZiel = (t) => {
    const e = V(...augePos(t));
    let d = ziele[0].z().clone().sub(e).normalize();
    for (let i = 1; i < ziele.length; i++) {
      const k = ziele[i];
      if (t < k.t) break;
      const w = ease.inOutCubic(fortschritt(t, k.t, k.t + k.d));
      d = d.lerp(k.z().clone().sub(e).normalize(), w).normalize();
    }
    return e.clone().addScaledVector(d, 10);
  };
  const fovKeys = [
    { t: 0, v: 70 }, { t: T("regeln:Du"), v: 66, e: ease.inOutSine }, { t: T("falle:Klar,"), v: 62, e: ease.inOutSine }, { t: tLos, v: 68, e: ease.outCubic },
    { t: tAtmest, v: 60, e: ease.inOutSine }, { t: tSauer + 0.6, v: 66, e: ease.inOutSine },
    { t: tAber, v: 62, e: ease.inOutSine }, { t: tHoehe, v: 68, e: ease.inOutSine },
    { t: tS3 + 0.3, v: 74, e: ease.inOutSine }, { t: tS4 + 0.3, v: 66, e: ease.inOutSine },
    { t: tHinter, v: 60, e: ease.inOutSine }, { t: tUeb - 0.5, v: 52 }, { t: tUeber, v: 46, e: ease.inOutSine }, { t: tMerk, v: 52, e: ease.inOutSine },
    { t: tSchluss - 0.3, v: 70, e: ease.inOutSine }, { t: DAUER, v: 70 },
  ];
  const regie = new Regie(kam(), (t) => {
    const z = blickZiel(t);
    const roll = Math.sin(t * 0.6) * 0.008 + (t > tS4 + 0.9 && t < tS4 + 2.6 ? Math.sin((t - tS4 - 0.9) * Math.PI / 1.7) * 0.05 : 0); // beim „Ohr?“ leicht schief gelegt
    return { pos: auge(t), ziel: [z.x, z.y, z.z], fov: keyframes(fovKeys, t), roll };
  }, { zp });
  function kam() { return new THREE.PerspectiveCamera(64, 1080 / 1920, 0.03, 300); }
  const kamPOV = regie.kamera;
  regie.stoss({ t: tLos + 0.02, staerke: 1.0 });
  regie.stoss({ t: tKlatsch, staerke: 1.1 });
  regie.stoss({ t: tKlatsch + 0.14, staerke: 0.6 });
  regie.stoss({ t: tUeber, staerke: 0.7 });
  regie.stoss({ t: tRueck, staerke: 0.9 });
  regie.stoss({ t: T("falle:Klar,") + 0.05, staerke: 0.45 });
  regie.zoom({ t: "ueberraschung:Grad.", ziel: () => V(TASSE.x, TASSE.y + 0.1, TASSE.z), staerke: 0.25, halt: 1.1, rueck: 0.7 });
  regie.zoom({ t: "falle:Luft", staerke: 0.12, halt: 0.5, rueck: 0.4 });
  regie.zoom({ t: "falle:erstickst.", staerke: 0.14, halt: 0.5, rueck: 0.4 });
  regie.zoom({ t: "falle:Oder?", staerke: 0.18, halt: 0.5, rueck: 0.4 });
  regie.schleife({ ab: tSchleife, ende: ENDE });

  const post = { bloomStaerke: BLOOM, bloomSchwelle: 1.0, bloomRadius: 1.0, belichtung: 0.92, vignette: 0.3, saettigung: 1.08, kontrast: 1.05, koernung: 0.03 };
  const weltPOV = { szene: W.szene, kamera: kamPOV, post, update(t) { regie.anwenden(t); W.setze(t, zustand(t, true, kamPOV.position)); } };

  // Totale (Ergebnis und Warum): der Markt von schräg oben, Decke weg, „Du“ markiert
  const kamT = new THREE.PerspectiveCamera(46, 1080 / 1920, 0.1, 400);
  const regieT = new Regie(kamT, (t) => {
    const k = ease.inOutSine(fortschritt(t, tErg - 0.4, tUeb));
    return { pos: [lerp(-8.6, -6.3, k), lerp(8.8, 6.8, k), lerp(1.0, 0.8, k)], ziel: [lerp(3.4, 4.8, k), 0.6, lerp(0.4, 0.3, k)], fov: 54 };
  }, { zp });
  regieT.stoss({ t: tErg + 0.1, staerke: 0.5 });
  M.melde({ t: "warum:Warum?+0.1", typ: "kamera", klang: "whoosh", dauer: 1.0, text: "Totale: Fahrt zur Erklärung" });
  M.melde({ t: "warum:Erstens:-0.1", typ: "formel", klang: "pop", text: "Warum-Karte" });
  for (const w of ["warum:78", "warum:aber", "warum:Dein"]) M.melde({ t: w, typ: "kamera", klang: "zoom", dauer: 1.8, text: "Totale: Zoom" });
  regieT.zoom({ t: "warum:78", ziel: () => V(0, 1.0, 0), staerke: 0.2, halt: 1.0, rueck: 0.8 });
  regieT.zoom({ t: "warum:aber", ziel: () => V(-1.7, 1.0, 1.8), staerke: 0.2, halt: 1.0, rueck: 0.8 });
  regieT.zoom({ t: "warum:Dein", ziel: () => V(0, 1.0, 0), staerke: 0.2, halt: 1.0, rueck: 0.8 });
  const weltT = { szene: W.szene, kamera: kamT, post: { ...post, vignette: 0.34 }, update(t) { regieT.anwenden(t); W.setze(t, zustand(t, false, kamT.position)); } };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltPOV);
  zl.shot(tErg - 0.1, weltT, { typ: "blasen", dauer: 0.7 });
  zl.shot(tUeb - 0.05, weltPOV, { typ: "zoomwisch", dauer: 0.5, richtung: [1, -0.2], mitte: [0.5, 0.5] });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  window.hudAt = (t) => hud.update(t);
  for (const t of [0, tLos + 0.4, tKlatsch + 0.3, tErg + 0.5, tUeber + 0.5, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = R;
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
