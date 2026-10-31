// HUD-Bausteine für Duell-Videos (zwei Teams im direkten Vergleich): Rundenanzeige, Anzeigetafel mit zwei
// Team-Karten (Messwert plus Längenbalken), Ergebnis-Pille. Ergänzt hud.js, ohne es zu verändern.
// Stile: engine/duell.css. Alles wird ausschließlich aus t gesetzt (deterministisch).
import { feder, FEDER, ease, fortschritt, clamp } from "./bewegung.js";
import { el, animiere } from "./hud.js";

/** Stoppuhr-Symbol für die Rubrik ALLTAG (SVG statt Emoji) */
export const STOPPUHR = `<svg class="symbol" width="34" height="34" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="13.6" r="7.6" stroke="currentColor" stroke-width="2.5"/><path d="M12 13.6V9.6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M9.4 2.9h5.2" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><path d="M18.4 6.9l1.4-1.4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`;

// ---------- Rundenanzeige („Runde 2 · Feierabend“) ----------
export class RundenAnzeige {
  /** runden: [{ab, bis, titel}] */
  constructor(hud, runden, { top = 240, wort = "Runde" } = {}) {
    this.runden = runden;
    this.wort = wort;
    this.e = el("div", "schritt runde", "", hud.wurzel);
    this.e.style.top = top + "px";
    this.balken = el("div", "balken", runden.map(() => "<b><span></span></b>").join(""), this.e);
    this.text = el("div", "", "", this.e);
    this.fuellung = [...this.balken.querySelectorAll("span")];
    this.aktiv = -1;
  }
  klangEreignisse() {
    return this.runden.map((r) => ({ t: r.ab, typ: "klick" }));
  }
  update(t) {
    const erster = this.runden[0].ab;
    const letzter = this.runden[this.runden.length - 1].bis;
    const r = animiere(this.e, t, { ein: erster, aus: letzter, stil: "links", feder: FEDER.knackig });
    if (!r.sichtbar) return;
    let k = 0;
    this.runden.forEach((s, i) => { if (t >= s.ab) k = i; });
    const s = this.runden[k];
    if (this.aktiv !== k) {
      this.text.innerHTML = `<span class="nr">${this.wort} ${k + 1}</span> · ${s.titel}`;
      this.aktiv = k;
    }
    this.fuellung.forEach((f, i) => {
      const p = i < k ? 1 : i > k ? 0 : ease.outCubic(fortschritt(t, s.ab, s.ab + 0.5));
      f.style.transform = `scaleX(${p})`;
    });
    const stups = Math.sin(clamp((t - s.ab) / 0.35) * Math.PI) * 0.07;
    this.e.style.transform += ` scale(${1 + stups})`;
  }
}

// ---------- Anzeigetafel mit zwei Team-Karten ----------
export class Anzeigetafel {
  /**
   * opt: {y, ein, aus, links:{titel, farbe, symbol}, rechts:{…}, zustand(t) → {label, links:{wert, anteil}, rechts:{…}}, stoesse:[{t, seite}]}
   * anteil: Länge des Balkens 0..1 (z. B. Rückstau / Skala), null = ohne Balken.
   */
  constructor(hud, { y = 330, ein, aus = Infinity, links, rechts, zustand, stoesse = [], x = 54, breite = 876 }) {
    this.e = el("div", "tafel", "", hud.wurzel);
    this.e.style.top = y + "px";
    this.e.style.left = x + "px";
    this.e.style.width = breite + "px";
    const karte = (team, seite) => {
      const k = el("div", `teamkarte ${seite}`, `<div class="team">${team.symbol || ""}<span>${team.titel}</span></div><div class="mess"><span class="lbl"></span></div><div class="wert"><span class="zahl"></span></div><div class="lineal"><i></i></div>`, this.e);
      k.style.setProperty("--farbe", team.farbe);
      return { k, lbl: k.querySelector(".lbl"), zahl: k.querySelector(".zahl"), wert: k.querySelector(".wert"), lineal: k.querySelector(".lineal"), balken: k.querySelector(".lineal i") };
    };
    this.l = karte(links, "links");
    this.r = karte(rechts, "rechts");
    Object.assign(this, { ein, aus, zustand, stoesse });
  }
  klangEreignisse() {
    return [{ t: this.ein, typ: "pop" }, ...this.stoesse.map((s) => ({ t: s.t, typ: "ding" }))];
  }
  update(t) {
    const r = animiere(this.e, t, { ein: this.ein, aus: this.aus, stil: "kipp", feder: FEDER.standard });
    if (!r.sichtbar) return;
    const z = this.zustand(t);
    for (const [seite, k] of [["links", this.l], ["rechts", this.r]]) {
      const w = z[seite];
      if (k.lbl.textContent !== z.label) k.lbl.textContent = z.label;
      if (k.zahl.textContent !== w.wert) k.zahl.textContent = w.wert;
      const zeigeLineal = w.anteil !== null && w.anteil !== undefined;
      k.lineal.style.opacity = zeigeLineal ? "1" : "0";
      if (zeigeLineal) k.balken.style.transform = `scaleX(${clamp(w.anteil)})`;
      // Stoß, wenn ein Wert feststeht
      let s = 0;
      for (const st of this.stoesse) if (st.seite === seite || st.seite === "beide") s = Math.max(s, Math.sin(clamp((t - st.t) / 0.4) * Math.PI) * (t >= st.t ? 1 : 0));
      k.wert.style.transform = `scale(${1 + 0.12 * s})`;
      k.k.style.boxShadow = s > 0.01 ? `0 0 0 ${Math.round(6 * s)}px color-mix(in srgb, var(--farbe) 45%, transparent), var(--schatten)` : "";
      k.k.classList.toggle("gedimmt", !!w.gedimmt);
    }
  }
}

/** Kurze Ergebnis-Pille (z. B. „−13 % Rückstau“), mit Federn eingeblendet */
export function ergebnisPille(hud, { html, x, y, ein, aus, farbe = "#19B36B", klasse = "", klang = "boom" }) {
  const e = el("div", `ergebnis ${klasse}`, html, hud.wurzel);
  e.style.left = x + "px";
  e.style.top = y + "px";
  e.style.setProperty("--farbe", farbe);
  const teil = {
    klangEreignisse: () => [{ t: ein, typ: klang }],
    update(t) {
      animiere(e, t, { ein, aus, stil: "zoom", feder: FEDER.knackig });
    },
  };
  hud.add(teil);
  return e;
}

/** Federwert für eigene Animationen (Kurzform) */
export const federBei = (t, t0, f = FEDER.standard) => (t < t0 ? 0 : feder(t - t0, f));
