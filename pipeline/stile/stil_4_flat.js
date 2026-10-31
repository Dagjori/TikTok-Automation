// Stil 4 · 2D-Flat-Infografik: flache Vektorformen ohne Konturen, zweitonige Schattierung,
// „Bullauge“ mit Viadukt-Szene (Zug oben, Auto unten), Info-Plaketten mit Piktogrammen.
import { INHALT, WUERFEL, el, untertitel, zonen, fertig, zufall } from "./gemeinsam.js";

const zz = zufall(4);
const N = "#1D2B53"; // Nachtblau für Linien und Fenster
const cx = 540, cy = 830, r = 330;

function arkaden(x0, x1, yDeck, yBoden, n) {
  const w = (x1 - x0) / n;
  let s = `<rect x="${x0}" y="${yDeck}" width="${x1 - x0}" height="${yBoden - yDeck}" fill="#E8D9BF"/>`;
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w + w * 0.16, b = x0 + (i + 1) * w - w * 0.16, ra = (b - a) / 2;
    const top = yDeck + 34;
    s += `<path d="M${a} ${yBoden} V${top + ra} A${ra} ${ra} 0 0 1 ${b} ${top + ra} V${yBoden} Z" fill="#7FC796"/>`;
    s += `<path d="M${a} ${yBoden} V${top + ra} A${ra} ${ra} 0 0 1 ${a + ra} ${top} V${top + 16} A${ra - 16} ${ra - 16} 0 0 0 ${a + 16} ${top + ra} V${yBoden} Z" fill="#CDB896"/>`;
  }
  s += `<rect x="${x0 - 10}" y="${yDeck - 14}" width="${x1 - x0 + 20}" height="22" rx="4" fill="#F3E7D2"/>`;
  s += `<rect x="${x0 - 10}" y="${yDeck + 2}" width="${x1 - x0 + 20}" height="8" fill="#D6C3A3"/>`;
  return s;
}

function zug(x, y) {
  // drei Wagen, Fahrtrichtung rechts; y = Unterkante
  let s = "";
  const h = 66, l = 172, gap = 8;
  for (let i = 0; i < 3; i++) {
    const x0 = x + i * (l + gap);
    const vorne = i === 2;
    const d = vorne
      ? `M${x0} ${y} V${y - h + 14} Q${x0} ${y - h} ${x0 + 14} ${y - h} H${x0 + l - 40} Q${x0 + l + 4} ${y - h} ${x0 + l + 10} ${y - 22} V${y} Z`
      : `M${x0} ${y} V${y - h + 14} Q${x0} ${y - h} ${x0 + 14} ${y - h} H${x0 + l - 14} Q${x0 + l} ${y - h} ${x0 + l} ${y - h + 14} V${y} Z`;
    s += `<path d="${d}" fill="#2F6FED"/>`;
    s += `<rect x="${x0}" y="${y - h + 6}" width="${l}" height="14" fill="#5C8FF4" opacity="0.9"/>`;
    s += `<rect x="${x0}" y="${y - 18}" width="${vorne ? l + 10 : l}" height="9" fill="#FFFFFF"/>`;
    const fenster = vorne ? 3 : 4;
    for (let k = 0; k < fenster; k++) s += `<rect x="${x0 + 14 + k * 36}" y="${y - h + 24}" width="26" height="22" rx="5" fill="${N}"/><rect x="${x0 + 17 + k * 36}" y="${y - h + 27}" width="8" height="8" rx="2" fill="#7FA6F7"/>`;
    if (vorne) s += `<path d="M${x0 + l - 34} ${y - h + 22} H${x0 + l - 8} Q${x0 + l + 2} ${y - h + 30} ${x0 + l + 4} ${y - 34} H${x0 + l - 34} Z" fill="${N}"/><circle cx="${x0 + l + 2}" cy="${y - 26}" r="5" fill="#FFE27A"/>`;
    if (i < 2) s += `<rect x="${x0 + l}" y="${y - 30}" width="${gap}" height="10" fill="#33406B"/>`;
  }
  s += `<path d="M${x + 60} ${y - h} L${x + 80} ${y - h - 22} H${x + 120}" stroke="#33406B" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return s;
}

function auto(x, y) {
  // Flat-Auto, Fahrtrichtung links; y = Fahrbahn
  return `
  <path d="M${x} ${y - 16} Q${x} ${y - 44} ${x + 26} ${y - 46} L${x + 46} ${y - 48} L${x + 66} ${y - 80} Q${x + 72} ${y - 88} ${x + 84} ${y - 88} H${x + 140} Q${x + 152} ${y - 88} ${x + 158} ${y - 78} L${x + 176} ${y - 48} Q${x + 196} ${y - 46} ${x + 196} ${y - 26} V${y - 16} Z" fill="#FF7A1A"/>
  <path d="M${x} ${y - 30} H${x + 196} V${y - 16} H${x} Z" fill="#E8620C"/>
  <path d="M${x + 58} ${y - 50} L${x + 74} ${y - 78} H${x + 104} V${y - 50} Z M${x + 112} ${y - 50} V${y - 78} H${x + 142} L${x + 160} ${y - 50} Z" fill="${N}"/>
  <path d="M${x + 76} ${y - 74} L${x + 82} ${y - 74} L${x + 72} ${y - 56} L${x + 66} ${y - 56} Z" fill="#8FB0F5"/>
  <circle cx="${x + 5}" cy="${y - 34}" r="6" fill="#FFF3B0"/>
  <circle cx="${x + 46}" cy="${y - 12}" r="19" fill="${N}"/><circle cx="${x + 46}" cy="${y - 12}" r="8" fill="#C9D1E6"/>
  <circle cx="${x + 152}" cy="${y - 12}" r="19" fill="${N}"/><circle cx="${x + 152}" cy="${y - 12}" r="8" fill="#C9D1E6"/>
  <rect x="${x + 200}" y="${y - 36}" width="46" height="5" rx="2.5" fill="#FFFFFF" opacity="0.6"/>
  <rect x="${x + 214}" y="${y - 24}" width="30" height="5" rx="2.5" fill="#FFFFFF" opacity="0.45"/>`;
}

function baum(x, y, s = 1) {
  return `<rect x="${x - 6 * s}" y="${y - 40 * s}" width="${12 * s}" height="${40 * s}" fill="#8A5A3B"/>
  <circle cx="${x}" cy="${y - 62 * s}" r="${38 * s}" fill="#3E9C5E"/>
  <path d="M${x} ${y - 100 * s} A${38 * s} ${38 * s} 0 0 0 ${x} ${y - 24 * s} Z" fill="#5DBB7A"/>`;
}

function wolke(x, y, s = 1) {
  return `<g fill="#FFFFFF"><circle cx="${x}" cy="${y}" r="${30 * s}"/><circle cx="${x + 36 * s}" cy="${y - 14 * s}" r="${38 * s}"/><circle cx="${x + 76 * s}" cy="${y}" r="${28 * s}"/><rect x="${x}" y="${y}" width="${76 * s}" height="${28 * s}"/></g>`;
}

function skyline() {
  let s = "";
  let x = 210;
  while (x < 870) {
    const w = 34 + zz() * 40, h = 40 + zz() * 110;
    s += `<rect x="${x}" y="${835 - h}" width="${w}" height="${h + 40}" fill="${zz() < 0.5 ? "#7DB9DA" : "#6EAACD"}"/>`;
    for (let yy = 835 - h + 12; yy < 820; yy += 18) for (let xx = x + 8; xx < x + w - 8; xx += 14) if (zz() < 0.55) s += `<rect x="${xx}" y="${yy}" width="6" height="8" fill="#A9D6EE"/>`;
    x += w + 6;
  }
  return s;
}

const deko = [];
for (let i = 0; i < 26; i++) {
  const x = 30 + zz() * 1020, y = 520 + zz() * 1300;
  const dx = x - cx, dy = y - cy;
  if (Math.hypot(dx, dy + 50) < r + 30 || (y > 1080 && y < 1500)) continue;
  deko.push(zz() < 0.5 ? `<circle cx="${x}" cy="${y}" r="${4 + zz() * 6}" fill="#F2DDB6"/>` : `<path d="M${x - 9} ${y}H${x + 9}M${x} ${y - 9}V${y + 9}" stroke="#F2DDB6" stroke-width="5" stroke-linecap="round"/>`);
}

const svg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="kreis"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs>
  ${deko.join("")}
  <path d="M60 1560 H1020" stroke="#F2DDB6" stroke-width="6" stroke-dasharray="2 18" stroke-linecap="round"/>
  <g transform="translate(0 -50) translate(${cx} ${cy}) scale(0.88) translate(${-cx} ${-cy})">
  <circle cx="${cx}" cy="${cy + 18}" r="${r + 16}" fill="${N}" opacity="0.12"/>
  <g clip-path="url(#kreis)">
    <rect x="0" y="0" width="1080" height="1920" fill="#8FD3F4"/>
    <rect x="0" y="740" width="1080" height="200" fill="#B4E3F7"/>
    <circle cx="712" cy="640" r="104" fill="#FFE9A0" opacity="0.6"/>
    <circle cx="712" cy="640" r="70" fill="#FFD23F"/>
    ${wolke(300, 640, 1.1)}${wolke(760, 760, 0.8)}
    ${skyline()}
    <path d="M150 900 Q300 800 450 870 T760 850 T960 880 V1300 H150 Z" fill="#9AD8A6"/>
    <path d="M150 940 Q330 880 520 930 T940 915 V1300 H150 Z" fill="#7FC796"/>
    ${arkaden(170, 910, 930, 1040, 5)}
    <rect x="160" y="908" width="770" height="8" fill="#5B6478"/>
    ${zug(232, 908)}
    <rect x="0" y="1036" width="1080" height="300" fill="#56B474"/>
    <rect x="0" y="1060" width="1080" height="92" fill="#4B5268"/>
    <rect x="0" y="1060" width="1080" height="8" fill="#C9CED9"/>
    <rect x="0" y="1146" width="1080" height="8" fill="#C9CED9"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${150 + i * 70}" y="${1102}" width="38" height="6" rx="3" fill="#FFFFFF"/>`).join("")}
    ${auto(420, 1132)}
    ${baum(258, 1060, 0.9)}${baum(842, 1062, 1.05)}${baum(890, 1060, 0.75)}
  </g>
  <circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="none" stroke="#FFFFFF" stroke-width="18"/>
  </g>
</svg>`;
document.getElementById("bild").innerHTML = svg;

const ICON_TICKET = `<svg width="54" height="54" viewBox="0 0 24 24" fill="none"><path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5V10a2 2 0 0 0 0 4v2.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5V14a2 2 0 0 0 0-4Z" fill="#fff"/><path d="M15 7v10" stroke="#2F6FED" stroke-width="1.6" stroke-dasharray="1.6 1.6"/></svg>`;
const ICON_AUTO = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none"><path d="M4 15.5V12l1.6-4.1A2 2 0 0 1 7.5 6.6h9a2 2 0 0 1 1.9 1.3L20 12v3.5a1 1 0 0 1-1 1h-1.2a2 2 0 0 1-3.6 0H9.8a2 2 0 0 1-3.6 0H5a1 1 0 0 1-1-1Z" fill="#fff"/><path d="M6.4 11.2 7.4 8.6h9.2l1 2.6Z" fill="#FF7A1A"/></svg>`;

const hud = document.getElementById("hud");
el("div", "marke", `<div class="logo">${WUERFEL}SIMULIERBAR</div><div class="rubrik">€ GELD</div>`, hud);
el("div", "titel", `<div class="klein">${INHALT.duell}</div><div class="gross">${INHALT.frage}</div>`, hud);
el("div", "hinweis", INHALT.hinweis, hud);
el("div", "badge a", `<div class="icon">${ICON_TICKET}</div><div class="wer">TEAM ${INHALT.a.team.toUpperCase()}</div><div class="betrag">${INHALT.a.wert}</div><div class="einheit">${INHALT.a.einheit}</div>`, hud);
el("div", "badge b", `<div class="icon">${ICON_AUTO}</div><div class="wer">TEAM ${INHALT.b.team.toUpperCase()}</div><div class="betrag">${INHALT.b.wert}</div><div class="einheit">${INHALT.b.einheit}</div>`, hud);
el("div", "vs", "VS", hud);
untertitel(hud);
zonen(hud);
fertig();
