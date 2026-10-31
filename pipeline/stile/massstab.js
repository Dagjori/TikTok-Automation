// Maßstab-Bausteine für die Stilbilder ab Nr. 9 (docs/15-massstab.md, Abschnitt 4).
// Inhalt wie bei Stil 1–8: GELD-Duell „Deutschlandticket gegen Auto“, Beispielwerte (keine Rechnung).
// Layout: Anzeigetafel oben · Szene Mitte · Untertitel-Phrase unten. Kein Kanalname, kein Logo, keine Rubrik.
import { el } from "./gemeinsam.js";

export const INHALT9 = {
  a: { team: "Ticket", wert: "66,80 €", einheit: "pro Monat" },
  b: { team: "Auto", wert: "214 €", einheit: "pro Monat" },
  zaehler: { zahl: "13", label: "Fahrten" },
  // Moment im Rennen: Bei Fahrt 13 zieht das Ticket vorbei (Break-even). Schlüsselwort in Teamfarbe.
  phrase: [{ t: "Das" }, { t: "Ticket", team: "a" }, { t: "zieht" }, { t: "vorbei." }],
  chip: "Break-even",
};

/** Anzeigetafel mit zwei Teamkarten und Zähler in der Mitte */
export function anzeigetafel(hud, i = INHALT9, { mitteHtml = null } = {}) {
  const t = el("div", "tafel9", "", hud);
  for (const s of ["a", "b"]) {
    el("div", `karte ${s}`, `<div class="wer">${i[s].team}</div><div class="wert">${i[s].wert}</div><div class="einheit">${i[s].einheit}</div>`, t);
  }
  el("div", "mitte", mitteHtml ?? `<b>${i.zaehler.zahl}</b><small>${i.zaehler.label}</small>`, t);
  return t;
}

/** Chip an Bildposition (x, y = Mitte unten in px), optional Teamfarbe und Drehung */
export function chip(hud, text, { x, y, team = "", drehung = 0, klasse = "" } = {}) {
  const c = el("div", `chip9 ${team} ${klasse}`.trim(), text, hud);
  c.style.left = x + "px";
  c.style.top = y + "px";
  c.style.transform = `translate(-50%, -100%) rotate(${drehung}deg)`;
  return c;
}

/**
 * Untertitel als kurze Phrase (2–5 Wörter): weiß, fett, schwarze Kontur, kein Kasten, Schlüsselwort in Teamfarbe.
 * Passt die Phrase nicht in eine Zeile (bis min. 62 px), wird ausgewogen auf zwei Zeilen geteilt.
 */
export function phrase(hud, woerter = INHALT9.phrase, { top = 1336, groesse = 74, kontur = 16, breite = 876 } = {}) {
  const box = el("div", "phrase", "", hud);
  box.style.top = top + "px";
  box.style.setProperty("--ph-kontur", kontur + "px");
  const mess = document.createElement("canvas").getContext("2d");
  const breiteVon = (ws, px) => {
    mess.font = `900 ${px}px "SB Display", "Inter Display", Inter, sans-serif`;
    return ws.reduce((s, w) => s + mess.measureText(w.t).width, 0) + ws.length * 0.4 * px + kontur;
  };
  let px = groesse, teilung = woerter.length;
  let eineZeile = false;
  for (let p = groesse; p >= 62; p -= 2) if (breiteVon(woerter, p) <= breite) { px = p; eineZeile = true; break; }
  if (!eineZeile) {
    let best = null;
    for (let k = 1; k < woerter.length; k++) {
      const w = Math.max(breiteVon(woerter.slice(0, k), groesse), breiteVon(woerter.slice(k), groesse));
      if (!best || w < best.w) best = { k, w };
    }
    teilung = best.k;
  }
  box.style.setProperty("--ph-groesse", px + "px");
  const zeilen = teilung < woerter.length ? [woerter.slice(0, teilung), woerter.slice(teilung)] : [woerter];
  for (const z of zeilen) {
    const ze = el("span", "zeile", "", box);
    for (const w of z) {
      const s = el("span", "w" + (w.team ? " " + w.team : ""), "", ze);
      s.textContent = w.t;
      s.dataset.t = w.t;
    }
  }
  return box;
}

/** Hintergrundbild (z. B. Blender-Render der Szene) laden und als Leinwand setzen */
export function hintergrund(url) {
  return new Promise((ok, fehler) => {
    const img = new Image();
    img.onload = () => {
      const c = document.getElementById("leinwand");
      c.getContext("2d").drawImage(img, 0, 0, 1080, 1920);
      ok(img);
    };
    img.onerror = () => fehler(new Error(`Szenenbild fehlt: ${url} – zuerst das Blender-Skript ausführen (siehe Kopf der .py-Datei)`));
    img.src = url + "?v=" + Date.now();
  });
}
