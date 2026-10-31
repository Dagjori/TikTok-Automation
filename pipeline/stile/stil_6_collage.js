// Stil 6 · Papier-Collage: Packpapier, gerissene Papierkanten, Rasterpunkte, Klebeband,
// Schreibmaschinen-Etiketten und Stempel. Alles als SVG, Papierstruktur über feTurbulence.
import { INHALT, el, untertitel, zonen, fertig, zufall } from "./gemeinsam.js";

const zz = zufall(23);
const SERIF = "'Bitstream Charter', Charter, Georgia, serif";
const SCHREIB = "'Courier 10 Pitch', 'Courier New', monospace";

/** Polygon mit gerissenen Kanten (Rechteck x,y,w,h) */
function riss(x, y, w, h, amp = 5, schritt = 11) {
  const p = [];
  const kante = (x0, y0, x1, y1) => {
    const l = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(l / schritt));
    const nx = -(y1 - y0) / l, ny = (x1 - x0) / l;
    for (let i = 0; i < n; i++) {
      const t = i / n, a = (zz() - 0.5) * 2 * amp;
      p.push([x0 + (x1 - x0) * t + nx * a, y0 + (y1 - y0) * t + ny * a]);
    }
  };
  kante(x, y, x + w, y); kante(x + w, y, x + w, y + h); kante(x + w, y + h, x, y + h); kante(x, y + h, x, y);
  return "M" + p.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L") + " Z";
}
/** Kreis mit gerissenem Rand */
function rissKreis(cx, cy, r, amp = 4) {
  const p = [];
  const n = Math.round((2 * Math.PI * r) / 10);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, rr = r + (zz() - 0.5) * 2 * amp;
    p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return "M" + p.map(([a, b]) => `${a.toFixed(1)} ${b.toFixed(1)}`).join(" L") + " Z";
}
/** Papierstück: weißer Rissrand unter farbigem Papier, Struktur und Schatten */
function papier(d, farbe, { rand = true, raster = false, drehung = 0, um = [0, 0], schatten = "schatten" } = {}) {
  return `<g transform="rotate(${drehung} ${um[0]} ${um[1]})" filter="url(#${schatten})">
    ${rand ? `<path d="${d}" fill="#F7F1E3" transform="translate(-2 -2) scale(1.004)"/>` : ""}
    <path d="${d}" fill="${farbe}" filter="url(#faser)"/>
    ${raster ? `<path d="${d}" fill="url(#raster)"/>` : ""}
  </g>`;
}
function klebeband(x, y, w, drehung, farbe = "rgba(244, 232, 196, 0.82)") {
  return `<g transform="rotate(${drehung} ${x + w / 2} ${y + 18})"><path d="${riss(x, y, w, 38, 2.5, 7)}" fill="${farbe}" filter="url(#faser)"/></g>`;
}
function filzstift(punkte, farbe = "#1b1b1b", breite = 6) {
  const d = "M" + punkte.map(([a, b]) => `${(a + (zz() - 0.5) * 2).toFixed(1)} ${(b + (zz() - 0.5) * 2).toFixed(1)}`).join(" L");
  return `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${breite}" stroke-linecap="round" stroke-linejoin="round" filter="url(#tinte)"/>`;
}

// ---------- Hintergrund: Zeitungsfetzen ----------
function zeitung(x, y, w, h, dreh) {
  let s = papier(riss(x, y, w, h, 6, 12), "#EDE7D8", { drehung: dreh, um: [x + w / 2, y + h / 2], schatten: "schattenFlach" });
  let z = `<g transform="rotate(${dreh} ${x + w / 2} ${y + h / 2})" opacity="0.55">`;
  const spalten = Math.max(1, Math.floor(w / 150));
  const sb = (w - 40) / spalten;
  z += `<rect x="${x + 20}" y="${y + 22}" width="${w * 0.6}" height="16" fill="#3a3a3a"/>`;
  for (let c = 0; c < spalten; c++) for (let yy = y + 56; yy < y + h - 18; yy += 14) z += `<rect x="${x + 20 + c * sb}" y="${yy}" width="${sb - 18 - (zz() < 0.15 ? 40 : 0)}" height="5" fill="#8a8578"/>`;
  return s + z + "</g>";
}

// ---------- Szene (Collage) ----------
const SZ = { x: 54, y: 820, w: 930, h: 430 };
function zugSchnitt(x, y) {
  // Zug aus blauem Papier, Fahrtrichtung rechts, y = Unterkante
  const d = `M${x} ${y} L${x} ${y - 92} L${x + 410} ${y - 92} Q${x + 470} ${y - 88} ${x + 488} ${y - 40} L${x + 494} ${y} Z`;
  let s = papier(d, "#2F62D0", { raster: true, drehung: -1.5, um: [x + 240, y - 40] });
  s += `<g transform="rotate(-1.5 ${x + 240} ${y - 40})">`;
  for (let i = 0; i < 6; i++) s += `<path d="${riss(x + 20 + i * 62, y - 74, 44, 36, 1.5, 6)}" fill="#DDEBFA"/>`;
  s += `<path d="M${x + 410} ${y - 74} L${x + 452} ${y - 74} Q${x + 470} ${y - 64} ${x + 476} ${y - 40} L${x + 410} ${y - 40} Z" fill="#1E2D55"/>`;
  s += `<rect x="${x}" y="${y - 30}" width="488" height="9" fill="#F7F1E3"/>`;
  for (const wx of [40, 90, 330, 380]) s += `<circle cx="${x + wx}" cy="${y + 4}" r="17" fill="#1b1b1b"/><circle cx="${x + wx}" cy="${y + 4}" r="5" fill="#C9C1AE"/>`;
  return s + "</g>";
}
function autoSchnitt(x, y) {
  // Auto aus orangem Papier, Fahrtrichtung links, y = Fahrbahn
  const d = `M${x} ${y - 18} Q${x - 2} ${y - 52} ${x + 30} ${y - 56} L${x + 58} ${y - 58} L${x + 84} ${y - 98} Q${x + 92} ${y - 106} ${x + 106} ${y - 106} L${x + 170} ${y - 106} Q${x + 184} ${y - 106} ${x + 192} ${y - 94} L${x + 214} ${y - 58} Q${x + 240} ${y - 54} ${x + 240} ${y - 30} L${x + 240} ${y - 16} Z`;
  let s = papier(d, "#FF7A1A", { raster: true, drehung: 2, um: [x + 120, y - 50] });
  s += `<g transform="rotate(2 ${x + 120} ${y - 50})">
    <path d="${riss(x + 76, y - 92, 56, 34, 1.5, 6)}" fill="#F3EAD6"/><path d="${riss(x + 142, y - 92, 58, 34, 1.5, 6)}" fill="#F3EAD6"/>
    <circle cx="${x + 56}" cy="${y - 10}" r="22" fill="#1b1b1b"/><circle cx="${x + 56}" cy="${y - 10}" r="7" fill="#C9C1AE"/>
    <circle cx="${x + 186}" cy="${y - 10}" r="22" fill="#1b1b1b"/><circle cx="${x + 186}" cy="${y - 10}" r="7" fill="#C9C1AE"/></g>`;
  return s;
}

const szene = [];
szene.push(papier(riss(SZ.x, SZ.y, SZ.w, SZ.h, 7, 12), "#BFE0EC", { drehung: 1, um: [540, 1030] }));
szene.push(papier(rissKreis(830, 900, 52, 4), "#FFC93C", { rand: false, raster: true }));
szene.push(papier(riss(140, 880, 150, 40, 6, 9), "#FBF7EE", { rand: false, drehung: -4, um: [215, 900], schatten: "schattenFlach" }));
szene.push(papier(riss(560, 862, 120, 34, 6, 9), "#FBF7EE", { rand: false, drehung: 3, um: [620, 880], schatten: "schattenFlach" }));
szene.push(papier(`M54 1060 Q240 960 420 1020 T780 990 T990 1030 L990 1250 L54 1250 Z`, "#8CC084", { rand: true, drehung: 0.5, um: [540, 1100] }));
szene.push(papier(`M54 1110 Q300 1060 560 1100 T990 1090 L990 1250 L54 1250 Z`, "#5FA563", { raster: true, drehung: -0.6, um: [540, 1150] }));
// Gleis mit Filzstift
szene.push(filzstift([[70, 1048], [990, 1030]], "#1b1b1b", 6));
for (let x = 90; x < 980; x += 34) szene.push(filzstift([[x, 1040], [x + 6, 1056]], "#3b2f22", 5));
szene.push(zugSchnitt(150, 1036));
// Straße
szene.push(papier(riss(40, 1150, 980, 92, 4, 12), "#6F6A66", { drehung: -0.8, um: [540, 1196] }));
for (let i = 0; i < 7; i++) szene.push(`<g transform="rotate(-0.8 540 1196)"><path d="${riss(80 + i * 140, 1192, 70, 12, 1.5, 6)}" fill="#F7F1E3"/></g>`);
szene.push(autoSchnitt(590, 1222));

// ---------- Titel, Werte, Stempel ----------
const titelPapier = papier(riss(54, 300, 876, 196, 5, 11), "#FBF8F0", { drehung: -1.4, um: [492, 398] });
const titelText = `<g transform="rotate(-1.4 492 398)">
  <text x="88" y="390" font-family="${SERIF}" font-weight="700" font-size="74" fill="#151515" letter-spacing="-1">Ab wann lohnt sich</text>
  <text x="88" y="468" font-family="${SERIF}" font-weight="700" font-size="74" fill="#151515" letter-spacing="-1">das <tspan fill="#C8371D">Ticket?</tspan></text></g>`;
const etikett = `<g transform="rotate(1.8 330 292)">${papier(riss(80, 268, 520, 48, 2, 8), "#F1E3B8", { rand: false, schatten: "schattenFlach" })}
  <text x="98" y="301" font-family="${SCHREIB}" font-weight="700" font-size="25" fill="#2b2b2b" letter-spacing="1">${INHALT.duell.toUpperCase()}</text></g>`;

function zettel(x, y, w, farbe, dreh, team, wert, tint) {
  const h = 200;
  return papier(riss(x, y, w, h, 5, 11), farbe, { drehung: dreh, um: [x + w / 2, y + h / 2] }) +
    `<g transform="rotate(${dreh} ${x + w / 2} ${y + h / 2})">
      <text x="${x + 30}" y="${y + 52}" font-family="${SCHREIB}" font-weight="700" font-size="26" fill="${tint}" letter-spacing="2">TEAM ${team.toUpperCase()}</text>
      <text x="${x + 26}" y="${y + 146}" font-family="${SERIF}" font-weight="700" font-size="98" fill="#151515" letter-spacing="-3">${wert}</text>
      <text x="${x + 30}" y="${y + 182}" font-family="${SCHREIB}" font-size="22" fill="#4a4a4a">${INHALT.a.einheit}</text></g>` +
    klebeband(x + w / 2 - 60, y - 18, 120, dreh * 2 - 4);
}

const stempel = (x, y, dreh, text, gross = 28) => `<g transform="rotate(${dreh} ${x} ${y})" filter="url(#stempel)" opacity="0.9">
  <rect x="${x - text.length * gross * 0.36 - 18}" y="${y - gross * 0.95}" width="${text.length * gross * 0.72 + 36}" height="${gross * 1.5}" rx="6" fill="none" stroke="#C8371D" stroke-width="5"/>
  <text x="${x}" y="${y + gross * 0.18}" text-anchor="middle" font-family="${SCHREIB}" font-weight="700" font-size="${gross}" fill="#C8371D" letter-spacing="3">${text}</text></g>`;

const vs = `<g transform="rotate(-8 492 652)" filter="url(#stempel)"><circle cx="492" cy="652" r="50" fill="none" stroke="#C8371D" stroke-width="7"/>
  <text x="492" y="670" text-anchor="middle" font-family="${SERIF}" font-weight="700" font-size="50" fill="#C8371D">vs</text></g>`;

// Markenleiste als Prägeband (Beschriftungsgerät)
const marke = `<g transform="rotate(-2 220 182)">
  <path d="${riss(54, 150, 330, 64, 1.2, 9)}" fill="#1b1b1b" filter="url(#schattenFlach)"/>
  <rect x="70" y="164" width="38" height="38" rx="9" fill="#2F6FED"/><circle cx="80" cy="174" r="5" fill="#FF7A1A"/><circle cx="89" cy="183" r="5" fill="#FFD23F"/><circle cx="98" cy="192" r="5" fill="#19B36B"/>
  <text x="124" y="195" font-family="${SCHREIB}" font-weight="700" font-size="32" fill="#F4F4F4" letter-spacing="4">SIMULIERBAR</text></g>
  <g transform="rotate(3 470 182)"><path d="${riss(400, 154, 150, 58, 1.2, 9)}" fill="#FFD23F" filter="url(#schattenFlach)"/>
  <text x="418" y="194" font-family="${SCHREIB}" font-weight="700" font-size="31" fill="#1b1b1b" letter-spacing="2">€ GELD</text></g>`;

const svg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="faser" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.25  0 0 0 0.42 0" result="k"/>
      <feComposite in="k" in2="SourceGraphic" operator="in" result="kk"/>
      <feBlend in="kk" in2="SourceGraphic" mode="multiply"/>
    </filter>
    <filter id="schatten" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="5" dy="9" stdDeviation="6" flood-color="#3a2810" flood-opacity="0.38"/></filter>
    <filter id="schattenFlach" x="-10%" y="-20%" width="120%" height="150%"><feDropShadow dx="3" dy="4" stdDeviation="3" flood-color="#3a2810" flood-opacity="0.3"/></filter>
    <filter id="tinte"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="3" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3"/></filter>
    <filter id="stempel" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="11" result="t"/>
      <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in"/>
    </filter>
    <pattern id="raster" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><circle cx="5.5" cy="5.5" r="2.4" fill="rgba(20,20,40,0.2)"/></pattern>
    <filter id="kraft" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.6 0.05" numOctaves="4" seed="2" result="f"/>
      <feColorMatrix in="f" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.32  0 0 0 0 0.18  0 0 0 0.5 0" result="k"/>
      <feComposite in="k" in2="SourceGraphic" operator="in" result="kk"/>
      <feBlend in="kk" in2="SourceGraphic" mode="multiply"/>
    </filter>
  </defs>
  <rect width="1080" height="1920" fill="#C9A77C" filter="url(#kraft)"/>
  ${zeitung(560, 1500, 520, 420, 4)}${zeitung(-40, 1560, 470, 380, -3)}${zeitung(700, -40, 420, 230, -5)}
  ${szene.join("")}
  ${titelPapier}${titelText}${etikett}
  ${zettel(54, 560, 400, "#D8E6FB", -3, INHALT.a.team, INHALT.a.wert, "#2457C5")}
  ${zettel(528, 552, 400, "#FFE2C6", 2.5, INHALT.b.team, INHALT.b.wert, "#C9530C")}
  ${vs}
  ${stempel(800, 520, -7, INHALT.hinweis.toUpperCase(), 24)}
  ${marke}
  ${klebeband(860, 452, 110, 32)}
</svg>`;
document.getElementById("bild").innerHTML = svg;

const hud = document.getElementById("hud");
untertitel(hud);
zonen(hud);
fertig();
