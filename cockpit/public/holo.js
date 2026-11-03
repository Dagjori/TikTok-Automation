"use strict";
// Karten kippen unter dem Mauszeiger leicht mit (reines CSS-3D, auch auf den Wandbildschirmen der Neon-Stadt).
// Bei „Bewegung reduzieren“ (Windows-Einstellung) bleibt alles ruhig.

(() => {
  const KIPPBAR = ".konto-karte, .mission, .slot, .vorschlag, .idee, .tagesziel, .dienst-karte, .info-zeilen > div, .autonomie-karte, .lernschleife-karte, .lernstand-karte";
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
  let gekippt = null;

  function kippen(e) {
    const el = ruhig.matches ? null : e.target.closest?.(KIPPBAR);
    if (gekippt && gekippt !== el) loslassen(gekippt);
    if (!el) { gekippt = null; return; }
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    const staerke = Math.min(1, 280 / Math.max(r.width, r.height)); // große Karten kippen weniger
    el.style.setProperty("--rx", `${(-py * 10 * staerke).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * 12 * staerke).toFixed(2)}deg`);
    el.classList.add("gekippt");
    gekippt = el;
  }
  function loslassen(el) {
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    setTimeout(() => { if (gekippt !== el) el.classList.remove("gekippt"); }, 380);
  }

  addEventListener("pointermove", kippen, { passive: true });
  document.addEventListener("pointerleave", () => { if (gekippt) loslassen(gekippt); gekippt = null; });
})();
