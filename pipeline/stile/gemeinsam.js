// Gemeinsamer Inhalt und Bausteine aller Stil-Muster.
// Jeder Stil zeigt denselben Inhalt, damit man die Optik vergleichen kann.

/** Inhalt des Vergleichsbilds (alle Zahlen sind Beispielwerte, keine Rechnung) */
export const INHALT = {
  duell: "Deutschlandticket gegen Auto",
  frage: "Ab wann lohnt sich das Ticket?",
  a: { team: "Ticket", wert: "66,80 €", zahl: 66.8, einheit: "pro Monat" },
  b: { team: "Auto", wert: "214 €", zahl: 214, einheit: "pro Monat" },
  hinweis: "Beispielwerte",
  // Untertitel: Zeile baut sich Wort für Wort auf, das gesprochene Wort ist gelb
  untertitel: { woerter: ["Ab", "wie", "vielen", "Fahrten", "lohnt", "sich"], aktuell: 4, sichtbarBis: 5 },
};

export const FARBE = { tinte: "#14171F", blau: "#2F6FED", orange: "#FF7A1A", gruen: "#19B36B", gelb: "#FFD23F" };

export const WUERFEL = '<span class="wuerfel"><i></i><i></i><i></i></span>';

export function el(tag, klasse = "", html = "", eltern = null) {
  const e = document.createElement(tag);
  if (klasse) e.className = klasse;
  if (html) e.innerHTML = html;
  if (eltern) eltern.appendChild(e);
  return e;
}

/**
 * Untertitel ohne Kasten. Bricht automatisch in höchstens zwei Zeilen um (ausgewogen, max. 876 px breit)
 * und verkleinert die Schrift nur, wenn es sonst nicht passt.
 * woerter: Liste der Wörter · aktuell: Index des gesprochenen Worts · sichtbarBis: letzter sichtbarer Index
 */
export function untertitel(eltern, { woerter, aktuell, sichtbarBis = aktuell, top = 1290, groesse = 84, kontur = 18, breite = 876 } = INHALT.untertitel) {
  const box = el("div", "ut", "", eltern);
  box.style.top = top + "px";
  box.style.setProperty("--ut-kontur", kontur + "px");
  const mess = document.createElement("canvas").getContext("2d");
  const breiteVon = (ws, px) => {
    mess.font = `900 ${px}px "SB Display", "Inter Display", Inter, sans-serif`;
    return ws.reduce((s, w) => s + mess.measureText(w).width, 0) + ws.length * 0.42 * px + kontur;
  };
  let px = groesse;
  let teilung = woerter.length;
  for (; px >= 56; px -= 2) {
    if (breiteVon(woerter, px) <= breite) { teilung = woerter.length; break; } // passt in eine Zeile
    let best = null; // sonst die ausgewogenste Teilung in zwei Zeilen
    for (let k = 1; k < woerter.length; k++) {
      const w = Math.max(breiteVon(woerter.slice(0, k), px), breiteVon(woerter.slice(k), px));
      if (w <= breite && (!best || w < best.w)) best = { k, w };
    }
    if (best) { teilung = best.k; break; }
  }
  box.style.setProperty("--ut-groesse", px + "px");
  const zeilen = teilung < woerter.length ? [woerter.slice(0, teilung), woerter.slice(teilung)] : [woerter];
  let i = 0;
  for (const z of zeilen) {
    const ze = el("span", "zeile", "", box);
    for (const w of z) {
      const s = el("span", "w" + (i === aktuell ? " jetzt" : i > sichtbarBis ? " kommt" : ""), "", ze);
      s.textContent = w;
      s.dataset.t = w;
      i++;
    }
  }
  return box;
}

/** Rote Hilfsflächen für die sicheren Zonen (Prüfansicht mit ?zonen=1) */
export function zonen(eltern) {
  if (!new URLSearchParams(location.search).has("zonen")) return;
  const z = el("div", "zonen", "<i style='left:0;right:0;top:0;height:150px'></i><i style='right:0;top:0;bottom:0;width:150px'></i><i style='left:0;right:0;bottom:0;height:400px'></i>", eltern);
  return z;
}

/** Seite fertig melden: wartet auf Schriften, zeichnet einmal und setzt window.__fertig */
export async function fertig(zeichne = () => {}) {
  try {
    await document.fonts.ready;
    window.renderAt = (t) => zeichne(t);
    window.dauer = 1;
    await zeichne(0);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.__fertig = true;
  } catch (e) {
    console.error(e);
    window.__fehler = String(e && e.stack ? e.stack : e);
  }
}

/** Deterministischer Zufall (gleiche Bilder bei jedem Lauf) */
export function zufall(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
