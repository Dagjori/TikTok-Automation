// Stil 7 · Minimalistische kinetische Typografie: Zahlen und Wörter sind das Bild.
// Bewegung wird über Schräglage, Nachzieh-Spuren und Tempostriche angedeutet; Balken als Mini-Szene.
import { INHALT, WUERFEL, el, untertitel, zonen, fertig } from "./gemeinsam.js";

const hud = document.getElementById("hud");
el("div", "marke", `${WUERFEL}<span>SIMULIERBAR</span><span class="punkt"></span><span class="gelb">€ GELD</span>`, hud);
el("div", "hinweis", INHALT.hinweis, hud).style.top = "166px";
el("div", "linie", "", hud).style.top = "232px";
el("div", "klein", INHALT.duell, hud).style.top = "256px";
el("div", "frage", `Ab wann lohnt<br>sich das <span class="hohl">Ticket?</span>`, hud);

const [ganz, cent] = INHALT.a.wert.replace(" €", "").split(",");
el("div", "etikett", "TICKET", hud).style.cssText = "left:54px;top:546px";
el("div", "zahl a", `${ganz},${cent}<small>€</small>`, hud);
el("div", "vs", "vs.", hud);
// Nachzieh-Spur der großen Zahl (Bewegung nach rechts)
[[150, 0.07, 5], [75, 0.16, 2.5]].forEach(([dx, o, b]) => {
  const s = el("div", "zahl spur", `${INHALT.b.wert.replace(" €", "")}<small>€</small>`, hud);
  s.style.cssText += `;right:${150 + dx}px;opacity:${o};filter:blur(${b}px)`;
});
el("div", "zahl b", `${INHALT.b.wert.replace(" €", "")}<small>€</small>`, hud);
el("div", "etikett", "AUTO", hud).style.cssText = "right:150px;top:786px;background:#111";
for (const [x, y, w] of [[96, 930, 150], [150, 980, 110], [70, 1030, 170]]) el("div", "tempo", "", hud).style.cssText = `left:${x}px;top:${y}px;width:${w}px`;

// Mini-Szene: Zug und Auto als Piktogramme auf Kosten-Balken
const ZUG = `<svg width="64" height="36" viewBox="0 -6 64 42" style="margin-top:-6px"><path d="M20 2 L27 -5 H38" stroke="#111" stroke-width="2.5" fill="none"/><path d="M2 28V8q0-6 6-6h40q10 0 14 12l1 14Z" fill="#111"/><rect x="8" y="8" width="9" height="8" rx="1.5" fill="#f3f1ec"/><rect x="21" y="8" width="9" height="8" rx="1.5" fill="#f3f1ec"/><rect x="34" y="8" width="9" height="8" rx="1.5" fill="#f3f1ec"/><path d="M48 8h5l4 8h-9Z" fill="#f3f1ec"/><circle cx="14" cy="31" r="4" fill="#111"/><circle cx="48" cy="31" r="4" fill="#111"/></svg>`;
const AUTO = `<svg width="62" height="34" viewBox="0 0 62 34"><path d="M2 26V18q0-6 6-6l8-1 8-9h18l9 9q9 1 9 8v7Z" fill="#111"/><path d="M20 11l6-6h6v6Zm16 0V5h5l6 6Z" fill="#f3f1ec"/><circle cx="16" cy="27" r="6" fill="#111" stroke="#f3f1ec" stroke-width="2.5"/><circle cx="46" cy="27" r="6" fill="#111" stroke="#f3f1ec" stroke-width="2.5"/></svg>`;
const L = 690;
const reihe = (y, svg, farbe, anteil, wert) => {
  el("div", "bild", svg, hud).style.cssText = `left:54px;top:${y - 8}px`;
  const b = el("div", "balken", `<i style="background:${farbe};width:${Math.round(anteil * L)}px"></i>`, hud);
  b.style.cssText = `left:136px;top:${y}px;width:${L}px;background:#e3e0d8`;
  el("div", "klein", wert, hud).style.cssText = `left:${136 + Math.round(anteil * L) + 14}px;top:${y - 6}px;font-size:24px;letter-spacing:0.04em;text-transform:none`;
};
reihe(1150, ZUG, "var(--blau)", INHALT.a.zahl / INHALT.b.zahl, INHALT.a.wert);
reihe(1210, AUTO, "var(--orange)", 1, "");

untertitel(hud);
zonen(hud);
fertig();
