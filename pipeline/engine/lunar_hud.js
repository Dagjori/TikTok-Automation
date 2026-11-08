// HUD für Designstil 16 „Lunar-POV“ – NUR Account 2 @stelldirvor.pov (Referenzformat, Skill .claude/skills/stelldirvor-video/).
// Genau drei Textebenen plus Abspann, alles als HTML über der Three.js-Leinwand (Stile: engine/stil_lunar_pov.css):
//   1. Titelfrage (Serif, mittig oben)  2. Messwert-Anzeige (Versalien-Etikett, große Serif-Zahl, Unterzeile; links Mitte)
//   3. ein kurzer kursiver Satz (unten Mitte)  ·  Abblende auf #111111  ·  Abspann: Titelfrage + Faktenzeile in Versalien.
// Dazu Bild-Ebenen unter dem Text: Vignette, Linsenflecken (Asche, Staub), Wassertropfen, Glasriss.
// Zeiten gemessen an den 4 Referenzen (Bildvergleich, 30 fps); Titel wie Referenz bis 4,4 s (Skill .claude/skills/stelldirvor-video/design.md, Korrektur 02.11.).
// Keine Sticker, Chips, Karaoke-Untertitel, Folgen-Aufrufe, Logos – das HUD kann sie gar nicht erst darstellen.
import { clamp, smoothstep, hash } from "./bewegung.js";

/** Standard-Zeiten in s (Referenz in Klammern) */
export const LP_ZEITEN = {
  titelEin: [0.4, 0.6],       // (0,40–0,63 s, 10–90 %)
  titelAus: [4.1, 4.4],       // wie Referenz (4,1–4,4 s), Regel seit 02.11. (Skill .claude/skills/stelldirvor-video/design.md)
  satzBlende: 0.2,            // Ein- und Ausblenden je Satz (gemessen 0,1–0,25 s)
  satzDauer: 4.4,             // Standard-Standzeit eines Satzes (gemessen 3,1–5,3 s, Lücke ≈ 1 s)
  anzeigeEin: [0, 0.01],      // Anzeige steht ab Bild 0 (alle 4 Referenzen)
  anzeigeAus: [69.2, 70.1],   // (A: 69,2–70,1 s)
  etikettWechsel: 0.3,        // weiches Abtauchen beim Etikettwechsel
  abblende: [70, 72],         // Bild läuft auf #111111 (Referenzen: dunkel ab ≈ 69 s, ganz dunkel bei 72 s)
  abspann: 72,                // Abspann-Ereignis ab 72 s bis Ende (80 s)
  frageEin: [72.4, 73.2],     // (72,5–73,2 s bzw. 73,0–74,1 s)
  faktEin: [72.9, 73.7],
  hinweisEin: [74.2, 75.0],   // Folgen-Hinweis im Abspann (seit 08.11.2026, nur Testblock „mit“), nach der Faktenzeile
  ende: 80,
};

/** Testblock einstieg_a2 = c (Wahl des Inhabers 08.11.2026): Zeiten für eine Länge von 62–70 s statt 80 s. Der Abspann bleibt die
 *  letzten 8 s (Abblende davor 2 s, Anzeige endet wie gewohnt kurz vor der Abblende); Titel und Countdown bleiben unverändert.
 *  Beispiel: new LunarHUD(wurzel, { …, zeiten: lpZeitenFuer(66) }) und Zeiten der Szene mit lpSkala(t, 66) umrechnen. */
export function lpZeitenFuer(laenge = 80) {
  const L = Number(laenge);
  if (!Number.isFinite(L) || L < 60 || L > 80) throw new Error(`lpZeitenFuer: Länge ${laenge} s außerhalb von 60–80 s`);
  const d = L - LP_ZEITEN.ende;
  const plus = ([a, b]) => [a + d, b + d];
  return { ...LP_ZEITEN, anzeigeAus: plus(LP_ZEITEN.anzeigeAus), abblende: plus(LP_ZEITEN.abblende), abspann: LP_ZEITEN.abspann + d,
    frageEin: plus(LP_ZEITEN.frageEin), faktEin: plus(LP_ZEITEN.faktEin), hinweisEin: plus(LP_ZEITEN.hinweisEin), ende: L };
}

/** Zeitpunkt aus dem 80-s-Plan auf eine kürzere Länge umrechnen (gleich in qc/referenz_pov.py → skala): bis 10 s unverändert
 *  (Titel, Countdown, Ereignis), 10–70 s gleichmäßig gestaucht auf 10 bis Länge − 10, ab 70 s (Abblende, Abspann) fest vor dem Ende. */
export function lpSkala(t, laenge = 80) {
  const L = Number(laenge);
  if (t <= 10) return t;
  if (t >= 70) return t - 80 + L;
  return 10 + ((t - 10) * (L - 20)) / 60;
}

/** Zahl deutsch formatieren: 12.345,6 */
export const zahlDE = (x, nk = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(x);
/** Sekunden als m:ss bzw. h:mm:ss (Countdown wie in den Referenzen „2:54“) */
export function uhrzeit(s) {
  s = Math.max(0, Math.ceil(s - 1e-6));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}

const el = (tag, cls, eltern) => { const e = document.createElement(tag); if (cls) e.className = cls; eltern.appendChild(e); return e; };
const SVG = "http://www.w3.org/2000/svg";

/** Glasriss als SVG-Pfade (deterministisch): je Einschlag radiale Risse mit Knicken und Verzweigungen, Ringsegmente, weißer Kern. */
function glasPfade(punkte, seed) {
  const pfade = [];
  let k = 0;
  const r = () => hash(k++, seed);
  for (let ip = 0; ip < punkte.length; ip++) {
    const [cx, cy] = [punkte[ip][0] * 1080, punkte[ip][1] * 1920];
    const gross = punkte[ip][2] ?? 1;
    const n = 9 + Math.floor(r() * 6);
    const strahlen = [];
    for (let i = 0; i < n; i++) {
      const w0 = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.45;
      const lang = r() < 0.4;
      const L = (lang ? 480 + r() * 650 : 90 + r() * 220) * gross;
      let x = cx, y = cy, w = w0, d = `M${x.toFixed(1)} ${y.toFixed(1)}`, len = 0;
      const pts = [[x, y]];
      while (len < L) {
        const s = 16 + r() * 30;
        w += (r() - 0.5) * (lang ? 0.16 : 0.3) + (r() < 0.08 ? (r() - 0.5) * 0.7 : 0); // meist gerade, gelegentlich ein Knick
        x += Math.cos(w) * s; y += Math.sin(w) * s; len += s;
        d += ` L${x.toFixed(1)} ${y.toFixed(1)}`; pts.push([x, y]);
        if (lang && r() < 0.06) { // Verzweigung
          let bx = x, by = y, bw = w + (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.5), bd = `M${bx.toFixed(1)} ${by.toFixed(1)}`, bl = 0;
          const BL = (L - len) * (0.25 + r() * 0.3);
          while (bl < BL) { const s2 = 14 + r() * 24; bw += (r() - 0.5) * 0.35; bx += Math.cos(bw) * s2; by += Math.sin(bw) * s2; bl += s2; bd += ` L${bx.toFixed(1)} ${by.toFixed(1)}`; }
          pfade.push({ d: bd, laenge: bl, verz: (len / 1500), breite: 1.6 });
        }
      }
      strahlen.push({ w0, pts });
      pfade.push({ d, laenge: len, verz: 0, breite: lang ? 2.2 : 1.8 });
    }
    // Ringsegmente zwischen benachbarten Strahlen
    for (const R of [24, 52, 92, 140].map((x) => x * gross)) {
      for (let i = 0; i < strahlen.length; i++) {
        if (r() < 0.38) continue;
        const a = strahlen[i], b = strahlen[(i + 1) % strahlen.length];
        const pa = punktBei(a.pts, R * (0.85 + r() * 0.3)), pb = punktBei(b.pts, R * (0.85 + r() * 0.3));
        if (!pa || !pb) continue;
        const mx = (pa[0] + pb[0]) / 2 + (r() - 0.5) * 8, my = (pa[1] + pb[1]) / 2 + (r() - 0.5) * 8;
        pfade.push({ d: `M${pa[0].toFixed(1)} ${pa[1].toFixed(1)} L${mx.toFixed(1)} ${my.toFixed(1)} L${pb[0].toFixed(1)} ${pb[1].toFixed(1)}`, laenge: Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) * 1.1, verz: R / 1500, breite: 1.5 });
      }
    }
    // zersplitterter Kern
    let kern = "";
    for (let i = 0; i < 9; i++) { const w = (i / 9) * Math.PI * 2, rr = (5 + r() * 9) * gross; kern += `${i ? "L" : "M"}${(cx + Math.cos(w) * rr).toFixed(1)} ${(cy + Math.sin(w) * rr).toFixed(1)} `; }
    pfade.push({ d: kern + "Z", laenge: 0, verz: 0, kern: true });
  }
  return pfade;
}
function punktBei(pts, R) {
  const [cx, cy] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    const d0 = Math.hypot(pts[i - 1][0] - cx, pts[i - 1][1] - cy), d1 = Math.hypot(pts[i][0] - cx, pts[i][1] - cy);
    if (d1 >= R && d0 <= R) { const f = (R - d0) / Math.max(1e-6, d1 - d0); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f]; }
  }
  return null;
}

/**
 * new LunarHUD(document.getElementById("hud"), {
 *   titel: "Was wäre, wenn …?",                       // Titelfrage (auch im Abspann)
 *   fakt: "ORT, JAHR · ECHTER BEZUG",                 // Faktenzeile im Abspann (Versalien kommen aus CSS)
 *   saetze: [[5.6, "Ein ganz normaler Morgen."], [11.4, "…", 4.6], …],   // [Start s, Text, Dauer s (optional)]
 *   anzeige: (t) => ({ etikett: "HÖHE", zahl: "12.400", einheit: "m", unter: "STEIGT 80 M/S" }),
 *   hinweis: "Morgen: …",                             // Folgen-Hinweis im Abspann, NUR im Testblock folgen_hinweis = „mit“ (seit 08.11.2026)
 *   zeiten: { … }                                     // überschreibt LP_ZEITEN (Testblock c: lpZeitenFuer(66))
 * })
 */
export class LunarHUD {
  constructor(wurzel, { titel, fakt, saetze = [], anzeige, zeiten = {}, vignette = true, hinweis = "" } = {}) {
    this.Z = { ...LP_ZEITEN, ...zeiten };
    this.titelText = titel; this.faktText = fakt; this.anzeigeF = anzeige; this.hinweisText = String(hinweis || "").trim();
    this.saetze = saetze.map(([t, text, dauer]) => ({ t, text, dauer: dauer ?? this.Z.satzDauer }));
    this.saetze.sort((a, b) => a.t - b.t);
    // Ebenen (Reihenfolge = Stapel): Vignette, Flecken, Tropfen, Glas, Titel, Anzeige, Satz, Abblende, Abspann
    this.eVig = el("div", "lp lp-voll lp-vignette", wurzel);
    if (!vignette) this.eVig.style.display = "none";
    this.eFlecken = el("div", "lp lp-voll", wurzel);
    this.eTropfen = el("div", "lp lp-voll", wurzel);
    this.eGlas = document.createElementNS(SVG, "svg");
    this.eGlas.setAttribute("class", "lp lp-glas"); this.eGlas.setAttribute("viewBox", "0 0 1080 1920");
    this.eGlas.innerHTML = `<defs><filter id="lpGlasGlanz" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="2.4"/></filter></defs>`;
    wurzel.appendChild(this.eGlas);
    this.eTitel = el("div", "lp lp-titel", wurzel);
    this.eTitelHof = el("span", "lp-hof lp-serif", this.eTitel);
    this.eTitelHof.textContent = titel;
    this.eAnz = el("div", "lp lp-anzeige", wurzel);
    const hof = el("div", "lp-hof", this.eAnz);
    this.eEtikett = el("div", "lp-etikett lp-sans", hof);
    this.eZahl = el("div", "lp-zahl lp-serif", hof);
    this.eUnter = el("div", "lp-unter lp-sans", hof);
    this.eSatz = el("div", "lp lp-satz", wurzel);
    this.eSatzHof = el("span", "lp-hof lp-serif", this.eSatz);
    this.eSchwarz = el("div", "lp lp-voll lp-schwarz", wurzel);
    this.eAbspann = el("div", "lp lp-voll lp-abspann", wurzel);
    this.eFrage = el("div", "lp-frage lp-serif", this.eAbspann);
    this.eFrage.textContent = titel;
    this.eFakt = el("div", "lp-fakt lp-sans", this.eAbspann);
    this.eFakt.textContent = fakt || "";
    this.eHinweis = null;
    if (this.hinweisText) { this.eHinweis = el("div", "lp-hinweis lp-sans", this.eAbspann); this.eHinweis.textContent = this.hinweisText; }
    this.glasL = []; this.fleckL = []; this.tropfenL = [];
    // Etikettwechsel einmal vorab bestimmen (deterministisch, unabhängig von der Renderreihenfolge)
    this.wechsel = [];
    if (anzeige) {
      let alt = null;
      for (let t = 0; t <= this.Z.ende; t += 0.05) { const e = anzeige(t).etikett; if (alt !== null && e !== alt) this.wechsel.push(+t.toFixed(2)); alt = e; }
    }
  }

  /** Glasriss ab t (bleibt bis zur Abblende). punkte: [[x 0..1, y 0..1, Größe]], wachsen s (Referenz: Riss steht in 1–3 Bildern). */
  glas({ t, punkte = [[0.62, 0.3, 1], [0.24, 0.74, 0.8], [0.8, 0.83, 0.7]], seed = 5, wachsen = 0.12, deckkraft = 0.88 } = {}) {
    const g = document.createElementNS(SVG, "g");
    const glanz = document.createElementNS(SVG, "g"); glanz.setAttribute("filter", "url(#lpGlasGlanz)");
    const scharf = document.createElementNS(SVG, "g");
    g.appendChild(glanz); g.appendChild(scharf);
    this.eGlas.appendChild(g);
    const pfade = glasPfade(punkte, seed).map((p) => {
      const mk = (eltern, breite, farbe, alpha) => {
        const e = document.createElementNS(SVG, "path");
        e.setAttribute("d", p.d);
        if (p.kern) { e.setAttribute("fill", `rgba(255,255,255,${alpha * 0.7})`); e.setAttribute("stroke", "none"); }
        else { e.setAttribute("fill", "none"); e.setAttribute("stroke", farbe); e.setAttribute("stroke-width", breite); e.setAttribute("stroke-linejoin", "round"); e.setAttribute("stroke-linecap", "round"); e.setAttribute("stroke-dasharray", `${p.laenge + 2} ${p.laenge + 2}`); }
        eltern.appendChild(e); return e;
      };
      return { ...p, eg: mk(glanz, (p.breite || 1.8) * 2.6, "rgba(225,245,245,0.30)", 1), es: mk(scharf, p.breite || 1.8, `rgba(255,255,255,${deckkraft})`, 1) };
    });
    this.glasL.push({ t, wachsen, g, pfade });
    return this;
  }
  /** Unscharfe Flecken nahe der Linse (Asche, Staub, Glut): art "dunkel" | "hell" | "glut", wind px/s. */
  flecken({ von, bis = 999, anzahl = 16, art = "dunkel", seed = 9, wind = [12, 6], groesse = [14, 44], deckkraft = [0.3, 0.65] } = {}) {
    const farbe = { dunkel: "34,28,24", hell: "235,232,226", glut: "255,170,90" }[art] || art;
    const L = [];
    for (let i = 0; i < anzahl; i++) {
      const e = el("div", "lp-fleck", this.eFlecken);
      const d = groesse[0] + (groesse[1] - groesse[0]) * hash(i, seed + 2) ** 1.5;
      e.style.width = e.style.height = `${d}px`;
      const a = deckkraft[0] + (deckkraft[1] - deckkraft[0]) * hash(i, seed + 3);
      e.style.background = `radial-gradient(circle, rgba(${farbe},${a}) 0%, rgba(${farbe},${a * 0.85}) 38%, rgba(${farbe},0) 70%)`;
      L.push({ e, x: hash(i, seed) * 1080, y: hash(i, seed + 1) * 1920, d, v: [wind[0] * (0.6 + hash(i, seed + 4) * 0.8), wind[1] * (0.6 + hash(i, seed + 5) * 0.8)], ph: hash(i, seed + 6) * 6.28 });
    }
    this.fleckL.push({ von, bis, L });
    return this;
  }
  /** Wassertropfen auf der Linse (Gischt, Regen), rutschen langsam nach unten */
  tropfen({ von, bis = 999, anzahl = 22, seed = 13, groesse = [10, 34] } = {}) {
    const L = [];
    for (let i = 0; i < anzahl; i++) {
      const e = el("div", "lp-fleck", this.eTropfen);
      const d = groesse[0] + (groesse[1] - groesse[0]) * hash(i, seed + 2) ** 2;
      e.style.width = `${d}px`; e.style.height = `${d * 1.08}px`;
      e.style.background = "radial-gradient(circle at 42% 38%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.12) 30%, rgba(210,230,235,0.10) 55%, rgba(0,0,0,0.22) 72%, rgba(0,0,0,0) 76%)";
      L.push({ e, x: hash(i, seed) * 1080, y: hash(i, seed + 1) * 1700, d, v: 6 + hash(i, seed + 3) * 30, t0: von + hash(i, seed + 4) * 1.2 });
    }
    this.tropfenL.push({ von, bis, L });
    return this;
  }

  /** Zustand aller Ebenen für Zeit t setzen (deterministisch) */
  at(t) {
    const Z = this.Z;
    const blend = (a, b) => smoothstep(a[0], a[1], t) * (1 - smoothstep(b[0], b[1], t));
    // 1. Titel
    this.eTitel.style.opacity = String(blend(Z.titelEin, Z.titelAus));
    // 2. Anzeige
    if (this.anzeigeF) {
      const a = this.anzeigeF(t);
      if (this.eEtikett.textContent !== a.etikett) this.eEtikett.textContent = a.etikett;
      const zh = a.einheit ? `${a.zahl} ${a.einheit}` : a.zahl;
      if (this.eZahl.textContent !== zh) this.eZahl.textContent = zh;
      const u = a.unter || "";
      if (this.eUnter.textContent !== u) this.eUnter.textContent = u;
      this.eUnter.style.display = u ? "" : "none";
      const letzter = this.wechsel.filter((w) => w <= t + 1e-6).pop();
      const dip = letzter === undefined ? 1 : 0.25 + 0.75 * smoothstep(letzter, letzter + Z.etikettWechsel, t);
      this.eAnz.style.opacity = String(blend(Z.anzeigeEin, Z.anzeigeAus) * dip);
    } else this.eAnz.style.opacity = "0";
    // 3. Satz
    let so = 0, txt = "";
    for (const s of this.saetze) if (t >= s.t && t < s.t + s.dauer) { txt = s.text; so = smoothstep(s.t, s.t + Z.satzBlende, t) * (1 - smoothstep(s.t + s.dauer - Z.satzBlende, s.t + s.dauer, t)); }
    if (txt && this.eSatzHof.textContent !== txt) this.eSatzHof.textContent = txt;
    this.eSatz.style.opacity = String(so);
    // Bild-Ebenen unter dem Text
    for (const G of this.glasL) {
      const sichtbar = t >= G.t;
      G.g.style.display = sichtbar ? "" : "none";
      if (!sichtbar) continue;
      for (const p of G.pfade) {
        const f = clamp((t - G.t - p.verz * G.wachsen * 4) / G.wachsen);
        if (p.kern) { p.es.style.opacity = String(f); p.eg.style.opacity = String(f); continue; }
        const off = String((p.laenge + 2) * (1 - f));
        p.es.setAttribute("stroke-dashoffset", off); p.eg.setAttribute("stroke-dashoffset", off);
      }
    }
    for (const F of this.fleckL) {
      const a = smoothstep(F.von, F.von + 0.8, t) * (1 - smoothstep(F.bis - 0.8, F.bis, t));
      for (const q of F.L) {
        const tau = Math.max(0, t - F.von);
        const x = ((q.x + q.v[0] * tau + Math.sin(tau * 0.7 + q.ph) * 6) % 1140 + 1140) % 1140 - 30, y = ((q.y + q.v[1] * tau) % 1980 + 1980) % 1980 - 30;
        q.e.style.transform = `translate(${(x - q.d / 2).toFixed(1)}px, ${(y - q.d / 2).toFixed(1)}px)`;
        q.e.style.opacity = String(a);
      }
    }
    for (const T of this.tropfenL) {
      const a = smoothstep(T.von, T.von + 0.3, t) * (1 - smoothstep(T.bis - 0.6, T.bis, t));
      for (const q of T.L) {
        const tau = Math.max(0, t - q.t0);
        q.e.style.transform = `translate(${(q.x - q.d / 2).toFixed(1)}px, ${(q.y + q.v * tau * tau * 0.5 - q.d / 2).toFixed(1)}px)`;
        q.e.style.opacity = String(a * (t >= q.t0 ? 1 : 0));
      }
    }
    // Abblende und Abspann
    const schwarz = smoothstep(Z.abblende[0], Z.abblende[1], t);
    this.eSchwarz.style.opacity = String(schwarz);
    this.eAbspann.style.opacity = t >= Z.abspann ? "1" : "0";
    this.eFrage.style.opacity = String(smoothstep(Z.frageEin[0], Z.frageEin[1], t));
    this.eFakt.style.opacity = String(smoothstep(Z.faktEin[0], Z.faktEin[1], t));
    if (this.eHinweis) this.eHinweis.style.opacity = String(smoothstep(Z.hinweisEin[0], Z.hinweisEin[1], t));
    this.eVig.style.opacity = String(1 - schwarz);
  }

  /** Ereignis-Protokoll für qc/referenz_pov.py (Titel, Anzeige je 0,5 s, Sätze, Glas, Abblende, Abspann) */
  ereignisse() {
    const Z = this.Z, e = [];
    e.push({ t: Z.titelEin[0], typ: "titel", dauer: Z.titelAus[1] - Z.titelEin[0], text: this.titelText, quelle: "LunarHUD", klang: false });
    if (this.anzeigeF) for (let t = Z.anzeigeEin[0]; t <= Z.anzeigeAus[0] + 1e-6; t += 0.5) {
      const a = this.anzeigeF(t);
      const w = typeof a.wert === "number" ? a.wert : parseFloat(String(a.zahl).replace(/\./g, "").replace(",", "."));
      e.push({ t: +t.toFixed(2), typ: "anzeige", etikett: a.etikett, zahl: a.zahl, einheit: a.einheit || "", unter: a.unter || "", wert: Number.isFinite(w) ? +w.toFixed(4) : null, quelle: "LunarHUD", klang: false, bild: false });
    }
    for (const s of this.saetze) e.push({ t: s.t, typ: "satz", dauer: s.dauer, text: s.text, woerter: s.text.trim().split(/\s+/).length, quelle: "LunarHUD", klang: false });
    for (const G of this.glasL) e.push({ t: G.t, typ: "effekt", name: "glas", dauer: G.wachsen, quelle: "LunarHUD", klang: "glas" });
    e.push({ t: Z.abblende[0], typ: "abblende", dauer: Z.abblende[1] - Z.abblende[0], quelle: "LunarHUD", klang: false });
    e.push({ t: Z.abspann, typ: "abspann", dauer: Z.ende - Z.abspann, text: this.titelText, fakt: this.faktText, quelle: "LunarHUD", klang: false });
    if (this.hinweisText) e.push({ t: Z.hinweisEin[0], typ: "folgen_hinweis", dauer: +(Z.ende - Z.hinweisEin[0]).toFixed(3), text: this.hinweisText, quelle: "LunarHUD", klang: false, bild: false });
    return e;
  }
}
