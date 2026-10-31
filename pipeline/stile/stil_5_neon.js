// Stil 5 · Dunkles Daten-Dashboard mit Neon: Raster, leuchtende Linien, Monospace-Zahlen.
// Die „Szene“ ist das Diagramm: Kosten je Monat über die Zahl der Fahrten (Beispielwerte),
// Zug und Auto fahren als Neon-Piktogramme auf ihren Linien.
import { INHALT, WUERFEL, el, untertitel, zonen, fertig } from "./gemeinsam.js";

const C = "#4DA3FF", O = "#FF8A2A", G = "#FFE14D", GR = "#2EE59D";
// Diagrammfläche
const X0 = 132, X1 = 900, Y0 = 1146, Y1 = 800;
const MAXF = 40, MAXE = 240;
const px = (f) => X0 + (f / MAXF) * (X1 - X0);
const py = (e) => Y0 - (e / MAXE) * (Y0 - Y1);
const proFahrt = INHALT.b.zahl / MAXF; // Beispiel: 214 € bei 40 Fahrten
const breakEven = INHALT.a.zahl / proFahrt;

const raster = [];
for (let x = 0; x <= 1080; x += 54) raster.push(`<path d="M${x} 0V1920" stroke="#0F1830" stroke-width="1"/>`);
for (let y = 0; y <= 1920; y += 54) raster.push(`<path d="M0 ${y}H1080" stroke="#0F1830" stroke-width="1"/>`);

const gitter = [];
for (let e = 0; e <= 200; e += 50) gitter.push(`<path d="M${X0} ${py(e)}H${X1}" stroke="${e ? "#1C2B4D" : "#3A4A70"}" stroke-width="${e ? 1.5 : 2.5}" ${e ? 'stroke-dasharray="4 8"' : ""}/>`);
for (let f = 10; f <= 40; f += 10) gitter.push(`<path d="M${px(f)} ${Y1}V${Y0}" stroke="#1C2B4D" stroke-width="1.5" stroke-dasharray="4 8"/>`);

const yA = py(INHALT.a.zahl);
const bx = px(breakEven);
const autoEnde = [px(MAXF), py(INHALT.b.zahl)];

// Neon-Piktogramme (nur Linien)
const zugIcon = (x, y) => `<g transform="translate(${x} ${y})" fill="none" stroke="${C}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glutIcon)">
  <path d="M-56 0 V-40 Q-56 -50 -46 -50 H34 Q52 -50 58 -30 L62 -12 Q63 0 52 0 Z"/><path d="M-46 -36 H-26 V-22 H-46 Z M-18 -36 H2 V-22 H-18 Z M10 -36 H30 V-22 H10 Z"/><path d="M38 -36 H50 L55 -22 H38 Z"/>
  <circle cx="-36" cy="7" r="6"/><circle cx="-14" cy="7" r="6"/><circle cx="22" cy="7" r="6"/><circle cx="44" cy="7" r="6"/></g>`;
const autoIcon = (x, y, w = 0) => `<g transform="translate(${x} ${y}) rotate(${w})" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" filter="url(#glutIcon)">
  <path d="M-48 -6 V-18 Q-48 -26 -40 -27 L-28 -29 L-16 -46 Q-13 -50 -7 -50 H22 Q28 -50 31 -45 L40 -29 Q50 -28 50 -18 V-6 Z"/><path d="M-20 -30 L-11 -43 H4 V-30 Z M10 -30 V-43 H23 L30 -30 Z"/>
  <circle cx="-26" cy="-4" r="9"/><circle cx="28" cy="-4" r="9"/></g>`;

const svg = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glut" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glutIcon" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="glutStark" filterUnits="userSpaceOnUse" x="0" y="0" width="1080" height="1920"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <radialGradient id="schein1" cx="0.15" cy="0.2" r="0.6"><stop offset="0" stop-color="#1E4FB8" stop-opacity="0.35"/><stop offset="1" stop-color="#1E4FB8" stop-opacity="0"/></radialGradient>
    <radialGradient id="schein2" cx="0.9" cy="0.62" r="0.5"><stop offset="0" stop-color="#C2410C" stop-opacity="0.22"/><stop offset="1" stop-color="#C2410C" stop-opacity="0"/></radialGradient>
    <linearGradient id="spar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GR}" stop-opacity="0.32"/><stop offset="1" stop-color="${GR}" stop-opacity="0.05"/></linearGradient>
    <linearGradient id="teuer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${O}" stop-opacity="0.18"/><stop offset="1" stop-color="${O}" stop-opacity="0.02"/></linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="#060912"/>
  ${raster.join("")}
  <rect width="1080" height="1920" fill="url(#schein1)"/>
  <rect width="1080" height="1920" fill="url(#schein2)"/>
  <rect x="54" y="752" width="876" height="470" rx="24" fill="#0A1124" fill-opacity="0.85" stroke="#1C2B4D" stroke-width="2"/>
  ${gitter.join("")}
  <path d="M${X0} ${Y0} L${bx} ${yA} L${X0} ${yA} Z" fill="url(#teuer)"/>
  <path d="M${bx} ${yA} L${autoEnde[0]} ${autoEnde[1]} L${X1} ${yA} Z" fill="url(#spar)"/>
  <path d="M${X0} ${yA} H${X1}" stroke="${C}" stroke-width="5" filter="url(#glut)"/>
  <path d="M${X0} ${Y0} L${autoEnde[0]} ${autoEnde[1]}" stroke="${O}" stroke-width="5" filter="url(#glut)"/>
  <path d="M${bx} ${yA} V${Y0}" stroke="${G}" stroke-width="2.5" stroke-dasharray="6 7" opacity="0.8"/>
  <circle cx="${bx}" cy="${yA}" r="22" fill="${G}" opacity="0.18" filter="url(#glutStark)"/>
  <circle cx="${bx}" cy="${yA}" r="11" fill="#060912" stroke="${G}" stroke-width="5" filter="url(#glut)"/>
  ${zugIcon(830, yA - 15)}
  ${autoIcon(px(33), py(proFahrt * 33) - 9, -22)}
  <text x="${px(26.5)}" y="${yA - 28}" fill="${GR}" font-family="JetBrains Mono, Consolas, monospace" font-weight="700" font-size="22" letter-spacing="1.5" text-anchor="middle" filter="url(#glut)">TICKET GÜNSTIGER</text>
</svg>`;
document.getElementById("bild").innerHTML = svg;

const hud = document.getElementById("hud");
el("div", "marke", `<div class="logo">${WUERFEL}SIMULIERBAR</div><div class="rubrik">€ GELD</div>`, hud);
el("div", "titel", `<div class="klein">${INHALT.duell.toUpperCase()}</div><div class="gross">${INHALT.frage}</div>`, hud);
const funke = (farbe, d) => `<svg width="96" height="34" viewBox="0 0 96 34"><path d="${d}" fill="none" stroke="${farbe}" stroke-width="3" stroke-linecap="round" filter="drop-shadow(0 0 4px ${farbe})"/></svg>`;
el("div", "kpi a", `<div class="kopf">TEAM TICKET ${funke(C, "M2 18 H94")}</div><div class="betrag">${INHALT.a.wert}</div><div class="einheit">${INHALT.a.einheit} · fix</div>`, hud);
el("div", "kpi b", `<div class="kopf">TEAM AUTO ${funke(O, "M2 32 L94 3")}</div><div class="betrag">${INHALT.b.wert}</div><div class="einheit">${INHALT.b.einheit}</div>`, hud);
el("div", "hinweis", `* ${INHALT.hinweis}`, hud);
for (let e = 0; e <= 200; e += 100) el("div", "achse", `${e} €`, hud).style.cssText = `right:${1080 - X0 + 12}px;top:${py(e) - 13}px`;
for (let f = 0; f <= 40; f += 10) el("div", "achse", `${f}`, hud).style.cssText = `left:${px(f)}px;top:${Y0 + 12}px;transform:translateX(-50%)`;
el("div", "achse", "Fahrten pro Monat →", hud).style.cssText = `right:${1080 - X1}px;top:${Y0 + 40}px;color:rgba(255,255,255,.6)`;
el("div", "marker", `BREAK-EVEN ≈ ${Math.ceil(breakEven)} FAHRTEN`, hud).style.cssText = `left:${bx + 26}px;top:${yA + 22}px;transform:none`;
untertitel(hud);
zonen(hud);
fertig();
