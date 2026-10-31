// HUD-Komponenten (DOM über der 3D-Leinwand): Markenleiste, Schritt-Anzeige, Karten, Chips, Zähler,
// kinetischer Titel, Karaoke-Untertitel, 3D-Anker-Labels, Schlusskarte.
// Jede Komponente hat update(t) und setzt ihren Zustand ausschließlich aus t (deterministisch).
import { feder, FEDER, ease, fortschritt, clamp, lerp } from "./bewegung.js";

export const fmt = {
  zahl: (n, nk = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(n),
};

export function el(tag, klasse = "", html = "", eltern = null) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (html) e.innerHTML = html;
  if (eltern) eltern.appendChild(e);
  return e;
}

export const WUERFEL = '<span class="wuerfel"><i></i><i></i><i></i></span>';
export const SPRECHBLASE = `<svg width="72" height="72" viewBox="0 0 24 24" fill="none"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H10l-4.2 3.6c-.33.28-.8.05-.8-.38V16h-.5C3.67 16 3 15.33 3 14.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="10" r="1.3" fill="#FFD23F"/><circle cx="12" cy="10" r="1.3" fill="#FF7A1A"/><circle cx="15.5" cy="10" r="1.3" fill="#19B36B"/></svg>`;

export class HUD {
  constructor(wurzel) {
    this.wurzel = wurzel;
    this.teile = [];
    this.klang = []; // Klang-Ereignisse {t, typ, ...} für die Tonspur
  }
  add(teil) {
    this.teile.push(teil);
    if (teil.klangEreignisse) this.klang.push(...teil.klangEreignisse());
    return teil;
  }
  update(t) {
    for (const teil of this.teile) teil.update(t);
  }
}

/** Ein-/Ausblend-Transformation (Feder rein, Ease raus). Gibt {sichtbar, s, e} zurück. */
export function animiere(e, t, { ein, aus = Infinity, stil = "pop", feder: f = FEDER.standard, ausDauer = 0.28, versatz = [0, 0], basis = "" }) {
  if (t < ein || t > aus + ausDauer) {
    e.style.opacity = "0";
    e.style.visibility = "hidden";
    return { sichtbar: false, s: 0, e: 0 };
  }
  e.style.visibility = "visible";
  const s = feder(t - ein, f);
  const x = ease.inCubic(fortschritt(t, aus, aus + ausDauer));
  let tr = "";
  let op = clamp(s * 2.5) * (1 - x);
  switch (stil) {
    case "pop": tr = `translate(${versatz[0]}px, ${(1 - s) * 50 + versatz[1]}px) scale(${0.55 + 0.45 * s})`; break;
    case "hoch": tr = `translate(${versatz[0]}px, ${(1 - s) * 140 + versatz[1]}px)`; break;
    case "links": tr = `translate(${(s - 1) * 260 + versatz[0]}px, ${versatz[1]}px) rotate(${(1 - s) * -4}deg)`; break;
    case "rechts": tr = `translate(${(1 - s) * 260 + versatz[0]}px, ${versatz[1]}px) rotate(${(1 - s) * 4}deg)`; break;
    case "kipp": tr = `perspective(1200px) translate(${versatz[0]}px, ${(1 - s) * 60 + versatz[1]}px) rotateX(${(1 - s) * 55}deg)`; break;
    case "zoom": tr = `translate(${versatz[0]}px, ${versatz[1]}px) scale(${1.8 - 0.8 * s})`; op = clamp(s * 3) * (1 - x); break;
    default: tr = "";
  }
  if (x > 0) tr += ` translateY(${-x * 30}px) scale(${1 - 0.12 * x})`;
  e.style.transform = basis + " " + tr;
  e.style.opacity = String(op);
  return { sichtbar: true, s, e: x };
}

// ---------- Markenleiste ----------
export class Markenleiste {
  constructor(hud, { rubrik = "€ GELD", ein = -1 } = {}) {
    this.e = el("div", "marke", `<div class="logo">${WUERFEL}SIMULIERBAR</div><div class="rubrik">${rubrik}</div>`, hud.wurzel);
    this.ein = ein;
    this.ausblenden = [];
  }
  /** Bereiche [von, bis], in denen die Leiste ausgeblendet ist (z. B. Schlusskarte) */
  verstecke(von, bis) {
    this.ausblenden.push([von, bis]);
    return this;
  }
  update(t) {
    let o = 1;
    for (const [a, b] of this.ausblenden) {
      o = Math.min(o, 1 - clamp((t - a) / 0.3) * (1 - clamp((t - b) / 0.3)));
    }
    this.e.style.opacity = String(o);
  }
}

// ---------- Schritt-Anzeige ----------
export class SchrittAnzeige {
  /** schritte: [{ab, bis, titel}] */
  constructor(hud, schritte, { top = 240 } = {}) {
    this.schritte = schritte;
    this.e = el("div", "schritt", "", hud.wurzel);
    this.e.style.top = top + "px";
    this.balken = el("div", "balken", schritte.map(() => "<b><span></span></b>").join(""), this.e);
    this.text = el("div", "", "", this.e);
    this.fuellung = [...this.balken.querySelectorAll("span")];
    this.aktiv = -1;
  }
  klangEreignisse() {
    return this.schritte.map((s) => ({ t: s.ab, typ: "klick" }));
  }
  update(t) {
    const erster = this.schritte[0].ab;
    const letzter = this.schritte[this.schritte.length - 1].bis;
    const r = animiere(this.e, t, { ein: erster, aus: letzter, stil: "links", feder: FEDER.knackig });
    if (!r.sichtbar) return;
    let k = 0;
    this.schritte.forEach((s, i) => { if (t >= s.ab) k = i; });
    const s = this.schritte[k];
    if (this.aktiv !== k) {
      this.text.innerHTML = `<span class="nr">Schritt ${k + 1}</span> · ${s.titel}`;
      this.aktiv = k;
    }
    this.fuellung.forEach((f, i) => {
      const p = i < k ? 1 : i > k ? 0 : ease.outCubic(fortschritt(t, s.ab, s.ab + 0.5));
      f.style.transform = `scaleX(${p})`;
    });
    // kleiner Stups bei jedem Schrittwechsel
    const stups = Math.sin(clamp((t - s.ab) / 0.35) * Math.PI) * 0.06;
    this.e.style.transform += ` scale(${1 + stups})`;
  }
}

// ---------- Karte / Chip / freie Elemente ----------
export class Erscheinung {
  /** Beliebiges Element mit Ein-/Ausblendung. opt: {ein, aus, stil, feder, x, y, klang} */
  constructor(hud, e, opt) {
    this.e = e;
    this.opt = { stil: "pop", klang: "pop", ...opt };
    if (opt.x !== undefined) e.style.left = opt.x + "px";
    if (opt.y !== undefined) e.style.top = opt.y + "px";
    if (opt.breite !== undefined) e.style.width = opt.breite + "px";
    if (opt.farbe) e.style.setProperty("--farbe", opt.farbe);
    this.nachUpdate = opt.nachUpdate || null;
  }
  klangEreignisse() {
    const k = [];
    if (this.opt.klang) k.push({ t: this.opt.ein, typ: this.opt.klang });
    if (this.opt.aus !== undefined && this.opt.aus !== Infinity && this.opt.klangAus !== false) k.push({ t: this.opt.aus, typ: "weg" });
    return k;
  }
  update(t) {
    const r = animiere(this.e, t, this.opt);
    if (this.nachUpdate) this.nachUpdate(t, r);
  }
}

export function karte(hud, { label, wert = "", einheit = "", zusatz = "", klasse = "", ...opt }) {
  const e = el("div", `karte ${klasse}`, `<div class="label"><span class="punkt"></span>${label}</div><div class="wert"><span class="zahl">${wert}</span>${einheit ? `<small>${einheit}</small>` : ""}</div>${zusatz ? `<div class="zusatz">${zusatz}</div>` : ""}`, hud.wurzel);
  const k = hud.add(new Erscheinung(hud, e, opt));
  k.zahl = e.querySelector(".zahl");
  k.zusatz = e.querySelector(".zusatz");
  return k;
}

export function chip(hud, { flagge = "", text = "", klasse = "", ...opt }) {
  const e = el("div", `chip ${klasse}`, `${flagge ? `<span class="flagge">${flagge}</span>` : ""}<span class="txt">${text}</span>`, hud.wurzel);
  const k = hud.add(new Erscheinung(hud, e, opt));
  k.txt = e.querySelector(".txt");
  return k;
}

// ---------- Zähler ----------
export class Zaehler {
  /** ziel: Element; von→bis ab start über dauer; format(n) → Text */
  constructor(hud, ziel, { start, dauer = 1.4, von = 0, bis, format = (n) => fmt.zahl(n), kurve = ease.outExpo, klang = true }) {
    Object.assign(this, { ziel, start, dauer, von, bis, format, kurve, klang });
    hud.add(this);
  }
  klangEreignisse() {
    return this.klang ? [{ t: this.start, typ: "zaehlen", dauer: this.dauer }, { t: this.start + this.dauer, typ: "ding" }] : [];
  }
  wert(t) {
    return lerp(this.von, this.bis, this.kurve(fortschritt(t, this.start, this.start + this.dauer)));
  }
  update(t) {
    const txt = this.format(this.wert(t), t);
    if (this.ziel.textContent !== txt) this.ziel.textContent = txt;
  }
}

// ---------- Kinetischer Titel ----------
export class KinetikTitel {
  /**
   * woerter: [{text, klasse, t}] – jedes Wort springt zu seiner Zeit herein.
   * opt: {x, y, groesse, aus, stil:'schlag'|'hoch'}
   */
  constructor(hud, woerter, { y = 300, groesse = 140, aus = Infinity, stil = "schlag", zeilenhoehe = 1.0 } = {}) {
    this.e = el("div", "titel", "", hud.wurzel);
    this.e.style.top = y + "px";
    this.e.style.fontSize = groesse + "px";
    this.e.style.lineHeight = String(zeilenhoehe);
    this.woerter = woerter.map((w) => {
      if (w.umbruch) { el("br", "", "", this.e); return null; }
      const s = el("span", `wort schatten ${w.klasse || ""}`, w.text, this.e);
      return { ...w, el: s };
    }).filter(Boolean);
    this.aus = aus;
    this.stil = stil;
  }
  klangEreignisse() {
    return this.woerter.map((w) => ({ t: w.t, typ: "schlag" }));
  }
  update(t) {
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.3));
    this.e.style.opacity = String(1 - x);
    this.e.style.transform = `translateY(${-x * 40}px)`;
    this.e.style.visibility = t > this.aus + 0.3 ? "hidden" : "visible";
    for (const w of this.woerter) {
      const s = feder(t - w.t, FEDER.knackig);
      if (t < w.t) {
        w.el.style.opacity = "0";
        continue;
      }
      w.el.style.opacity = String(clamp(s * 3));
      if (this.stil === "schlag") {
        const blur = Math.max(0, (1 - s) * 14);
        w.el.style.transform = `scale(${1.9 - 0.9 * s})`;
        w.el.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "none";
      } else {
        w.el.style.transform = `translateY(${(1 - s) * 80}px)`;
      }
    }
  }
}

// ---------- Karaoke-Untertitel ----------
export class Karaoke {
  /**
   * Wort-für-Wort-Untertitel.
   * stil "kontur" (Standard seit 31.10.): kein Kasten, weiße Schrift mit schwarzer Kontur, jedes Wort erscheint,
   *   sobald es gesprochen wird, das aktuelle Wort ist gelb.
   * stil "kasten": dunkler Kasten mit wanderndem gelbem Marker (alter Stil).
   * opt: {y, maxBreite, groesse, maxZeilen, position(t) → y (optional), versteckt: [[von,bis]], stil}
   */
  constructor(hud, zeitplan, { y = 1270, maxBreite = 800, groesse = 70, maxZeilen = 2, yFunktion = null, versteckt = [], stil = "kontur" } = {}) {
    this.hud = hud;
    this.stil = stil;
    this.zp = zeitplan;
    this.y = y;
    this.yFunktion = yFunktion;
    this.maxBreite = maxBreite;
    this.groesse = groesse;
    this.maxZeilen = maxZeilen;
    this.versteckt = versteckt;
    this.e = el("div", `karaoke ${stil}`, "", hud.wurzel);
    this.e.style.top = y + "px";
    this.bloecke = [];
  }
  /** Wörter in Blöcke (max. 2 Zeilen) aufteilen. Erst nach document.fonts.ready aufrufen. */
  vorbereiten() {
    // Wortbreiten im echten DOM messen (gleiche Klassen wie später)
    const probe = el("div", "block", "", this.e);
    probe.style.visibility = "hidden";
    probe.style.position = "absolute";
    const pz = el("div", "zeile", "", probe);
    pz.style.fontSize = this.groesse + "px";
    const cache = new Map();
    const breite = (w) => {
      if (!cache.has(w)) {
        const s = el("span", "w", w, pz);
        cache.set(w, s.getBoundingClientRect().width);
        s.remove();
      }
      return cache.get(w);
    };
    // Zeilen: bei zwei Zeilen den Umbruch so wählen, dass beide Zeilen ähnlich lang sind
    const summe = (ws) => ws.reduce((a, w) => a + breite(w.wort), 0);
    const zeilen = (ws) => {
      if (summe(ws) <= this.maxBreite) return [ws];
      let best = null;
      for (let k = 1; k < ws.length; k++) {
        const a = summe(ws.slice(0, k)), b = summe(ws.slice(k));
        if (a > this.maxBreite || b > this.maxBreite) continue;
        const m = Math.max(a, b);
        if (!best || m < best.m) best = { k, m };
      }
      return best ? [ws.slice(0, best.k), ws.slice(best.k)] : null; // null = passt nicht in 2 Zeilen
    };
    const passt = (ws) => zeilen(ws) !== null;
    for (const seg of this.zp.segmente) {
      // 1) Sätze bilden
      const saetze = [[]];
      seg.woerter.forEach((w, i) => {
        saetze[saetze.length - 1].push({ ...w });
        if (/[.!?]$/.test(w.wort) && i < seg.woerter.length - 1) saetze.push([]);
      });
      // 2) zu lange Sätze gleichmäßig teilen
      let teile = [];
      for (const satz of saetze) {
        if (!satz.length) continue;
        if (passt(satz)) { teile.push(satz); continue; }
        let n = 2;
        for (; n < 12; n++) {
          const ziel = summe(satz) / n;
          const stuecke = [[]];
          let acc = 0;
          for (const w of satz) {
            if (acc >= ziel * stuecke.length - breite(w.wort) * 0.5 && stuecke.length < n && stuecke[stuecke.length - 1].length) stuecke.push([]);
            stuecke[stuecke.length - 1].push(w);
            acc += breite(w.wort);
          }
          if (stuecke.every(passt)) { teile.push(...stuecke); break; }
        }
        if (n >= 12) teile.push(satz);
      }
      // 3) sehr kurze Teile (≤ 2 Wörter) mit dem Nachbarn zusammenlegen, wenn es in 2 Zeilen passt
      for (let i = 0; i < teile.length; i++) {
        if (teile[i].length > 2) continue;
        if (i + 1 < teile.length && passt([...teile[i], ...teile[i + 1]])) {
          teile.splice(i, 2, [...teile[i], ...teile[i + 1]]);
          i--;
        } else if (i > 0 && passt([...teile[i - 1], ...teile[i]])) {
          teile.splice(i - 1, 2, [...teile[i - 1], ...teile[i]]);
          i -= 2;
        }
      }
      for (const t of teile) {
        const z = zeilen(t) || [t];
        let idx = 0;
        this.bloecke.push({ woerter: t, zeilen: z.map((zeile) => zeile.map(() => idx++)) });
      }
    }
    probe.remove();
    // Zeiten und DOM
    this.bloecke.forEach((b, i) => {
      b.start = b.woerter[0].start;
      b.letztes = b.woerter[b.woerter.length - 1].ende;
      const naechster = this.bloecke[i + 1];
      b.ende = naechster ? Math.min(naechster.woerter[0].start, b.letztes + 0.9) : b.letztes + 1.0;
      b.el = el("div", "block", "", this.e);
      b.marker = el("div", "marker", "", b.el);
      b.zeilen.forEach((z) => {
        const ze = el("div", "zeile", "", b.el);
        ze.style.fontSize = this.groesse + "px";
        z.forEach((wi) => {
          b.woerter[wi].el = el("span", "w", b.woerter[wi].wort, ze);
        });
      });
      b.el.style.display = "none";
    });
  }
  update(t) {
    if (this.yFunktion) this.e.style.top = this.yFunktion(t) + "px";
    let versteckt = 0;
    for (const [a, b] of this.versteckt) if (t >= a && t < b) versteckt = 1;
    // genau ein Block gleichzeitig: der letzte, der schon begonnen hat
    const vorlauf = (b) => (b.start < 0.2 ? 0.8 : 0.06); // erster Block ist schon im ersten Bild ganz da
    let aktiv = null;
    for (const b of this.bloecke) if (t >= b.start - vorlauf(b)) aktiv = b;
    for (const b of this.bloecke) {
      const vor = vorlauf(b);
      if (versteckt || b !== aktiv || t >= b.ende) {
        if (b.el.style.display !== "none") b.el.style.display = "none";
        continue;
      }
      b.el.style.display = "inline-block";
      if (this.stil === "kontur") {
        this.konturWoerter(b, t);
        continue;
      }
      const s = feder(t - (b.start - vor), FEDER.knackig);
      const raus = b.ende - t < 0.12 && !this.bloecke.some((x) => x.start - vor <= b.ende + 0.01 && x !== b && x.start > b.start) ? ease.inCubic(1 - (b.ende - t) / 0.12) : 0;
      b.el.style.transform = `translateY(${(1 - s) * 34}px) scale(${0.88 + 0.12 * s - raus * 0.06})`;
      b.el.style.opacity = String(clamp(s * 3) * (1 - raus));
      let k = -1;
      b.woerter.forEach((w, i) => { if (t >= w.start) k = i; });
      if (k < 0) {
        b.woerter.forEach((w) => { if (w.el.className !== "w kommt") w.el.className = "w kommt"; });
        b.marker.style.opacity = "0";
        continue;
      }
      const jetzt = b.woerter[k].el;
      // .w ist position:relative → offsetParent ist .block
      const r1 = { x: jetzt.offsetLeft, y: jetzt.offsetTop, w: jetzt.offsetWidth, h: jetzt.offsetHeight };
      let r = r1;
      // schneller Wechsel (≈ 0,1 s), damit das aktuelle Wort nie halb ohne Marker dasteht
      const p = feder(t - b.woerter[k].start, { frequenz: 8, daempfung: 0.85 });
      let gleitet = false;
      if (k > 0) {
        const vorher = b.woerter[k - 1].el;
        const r0 = { x: vorher.offsetLeft, y: vorher.offsetTop, w: vorher.offsetWidth, h: vorher.offsetHeight };
        if (Math.abs(r0.y - r1.y) < 2) {
          r = { x: lerp(r0.x, r1.x, p), y: r1.y, w: lerp(r0.w, r1.w, p), h: r1.h };
          gleitet = true;
        }
      }
      const pop = gleitet ? 1 : clamp(p * 1.4);
      // Schriftfarbe wechselt erst, wenn der Marker überwiegend unter dem Wort liegt
      const angekommen = gleitet ? p > 0.93 : pop > 0.5;
      b.woerter.forEach((w, i) => {
        const kl = i > k ? "w kommt" : i === k && angekommen ? "w jetzt" : "w"; // während des Gleitens alles weiß
        if (w.el.className !== kl) w.el.className = kl;
        if (i === k) {
          const bump = Math.sin(clamp((t - w.start) / 0.2) * Math.PI) * 0.07;
          w.el.style.transform = `scale(${1 + bump})`;
        } else if (w.el.style.transform) w.el.style.transform = "";
      });
      b.marker.style.opacity = String(pop);
      b.marker.style.left = r.x + 3 + "px";
      b.marker.style.top = r.y + 4 + "px";
      b.marker.style.width = r.w - 6 + "px";
      b.marker.style.height = r.h - 6 + "px";
      const bumpM = Math.sin(clamp((t - b.woerter[k].start) / 0.2) * Math.PI) * 0.07;
      b.marker.style.transform = `scale(${(0.7 + 0.3 * pop) * (1 + bumpM)})`;
    }
  }
  /** Stil „kontur“: Wörter erscheinen einzeln beim Sprechen (Platz ist reserviert, die Zeile springt nicht). */
  konturWoerter(b, t) {
    const VOR = 0.04; // Wort erscheint ein Bild vor dem Ton, wirkt dadurch synchron
    const naechster = this.bloecke[this.bloecke.indexOf(b) + 1];
    const direktWeiter = naechster && naechster.start - b.ende < 0.05;
    const raus = !direktWeiter && b.ende - t < 0.12 ? ease.inCubic(1 - (b.ende - t) / 0.12) : 0;
    b.el.style.opacity = String(1 - raus);
    b.el.style.transform = raus ? `scale(${1 - raus * 0.04})` : "";
    let k = -1;
    b.woerter.forEach((w, i) => { if (t >= w.start - VOR) k = i; });
    // sichtbare Wörter bleiben mittig: jede Zeile gleitet beim Erscheinen eines Worts um die halbe Wortbreite nach links
    if (!b.zeilenEl) {
      b.zeilenEl = [...b.el.querySelectorAll(".zeile")];
      b.breiten = b.woerter.map((w) => w.el.offsetWidth);
    }
    b.zeilen.forEach((idx, z) => {
      const voll = idx.reduce((a, i) => a + b.breiten[i], 0);
      const sichtbar = idx.reduce((a, i) => a + b.breiten[i] * ease.outCubic(clamp((t - (b.woerter[i].start - VOR)) / 0.16)), 0);
      b.zeilenEl[z].style.transform = `translateX(${(voll - sichtbar) / 2}px)`;
    });
    b.woerter.forEach((w, i) => {
      const kl = i > k ? "w kommt" : i === k ? "w jetzt" : "w";
      if (w.el.className !== kl) w.el.className = kl;
      if (i === k) {
        const p = feder(t - (w.start - VOR), { frequenz: 7, daempfung: 0.62 });
        w.el.style.transform = `translateY(${(1 - p) * 14}px) scale(${0.72 + 0.28 * p})`;
        w.el.style.opacity = String(clamp(p * 4));
      } else {
        if (w.el.style.transform) w.el.style.transform = "";
        if (w.el.style.opacity) w.el.style.opacity = "";
      }
    });
  }
}

// ---------- 3D-Anker-Label ----------
export class Anker {
  /**
   * Schild über einem 3D-Punkt. punkt(t) → THREE.Vector3 (Weltkoordinaten), kamera: THREE.Camera
   * hoehe: Länge der Linie in px
   */
  constructor(hud, { html, punkt, kamera, ein, aus = Infinity, hoehe = 120, breite = 1080, hoeheBild = 1920, klasse = "", klang = "pop", minY = 240 }) {
    this.e = el("div", `anker ${klasse}`, `<div class="linie"></div><div class="fuss"></div><div class="schild">${html}</div>`, hud.wurzel);
    this.linie = this.e.querySelector(".linie");
    this.schild = this.e.querySelector(".schild");
    this.fuss = this.e.querySelector(".fuss");
    Object.assign(this, { punkt, kamera, ein, aus, hoehe, breite, hoeheBild, klang, minY });
  }
  klangEreignisse() {
    return this.klang ? [{ t: this.ein, typ: this.klang }] : [];
  }
  update(t) {
    if (t < this.ein || t > this.aus + 0.3) {
      this.e.style.visibility = "hidden";
      return;
    }
    this.e.style.visibility = "visible";
    const v = this.punkt(t).clone().project(typeof this.kamera === "function" ? this.kamera(t) : this.kamera);
    const x = (v.x * 0.5 + 0.5) * this.breite;
    const y = (-v.y * 0.5 + 0.5) * this.hoeheBild;
    const s = feder(t - this.ein, FEDER.standard);
    const raus = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.3));
    let h = (typeof this.hoehe === "function" ? this.hoehe(t) : this.hoehe) * clamp(s);
    // Schild nie in die obere Sicherheitszone schieben: Linie verkürzen bzw. Schild unter den Punkt klappen
    const sh = this.schild.offsetHeight || 110;
    if (y - h - 8 - sh < this.minY) h = Math.max(24, y - 8 - sh - this.minY);
    this.e.style.transform = `translate(${x}px, ${y}px)`;
    this.e.style.opacity = String(1 - raus);
    this.linie.style.top = -h + "px";
    this.linie.style.height = h + "px";
    this.fuss.style.transform = `scale(${clamp(s * 2)})`;
    this.schild.style.top = -h - 8 + "px";
    this.schild.style.transform = `translate(-50%, -100%) scale(${0.5 + 0.5 * s})`;
    this.schild.style.opacity = String(clamp(s * 2.5));
  }
}
