"use strict";
// Hologramm-Oberfläche (reines CSS-3D, läuft auch ohne WebGL): Die Panels stehen leicht gekippt im Raum wie ein Cockpit,
// folgen sanft der Maus und fliegen beim Ansichtswechsel herein, ihre Karten gleiten gestaffelt nach. Karten unter dem
// Mauszeiger kippen mit. Bei „Bewegung reduzieren“ (Windows-Einstellung) bleibt alles ruhig.

(() => {
  const KIPPBAR = ".konto-karte, .mission, .slot, .vorschlag, .idee, .erfolg, .tagesziel, .dienst-karte, .zaehler > div, .info-zeilen > div, .autonomie-karte, .lernschleife-karte, .stadt-karte";
  const KINDER = ".karte, .quest, .idee, .slot, .konto-karte, .mission, .vorschlag, .tag, .schritt, .video-tabelle tr, .info-zeilen > div, .zaehler > div, .dienst-karte, .tagesziel, .autonomie-karte, .lernschleife-karte, .gross-prozent, .phasen";
  const ruhig = matchMedia("(prefers-reduced-motion: reduce)");
  let mx = 0, my = 0, geplant = false, gekippt = null;

  // Panels und Handy folgen der Maus (eigene, nicht vererbte Variablen: keine Neuberechnung der ganzen Seite)
  function mausSetzen() {
    geplant = false;
    for (const el of document.querySelectorAll(".raster > .panel, #handy")) {
      el.style.setProperty("--mx", mx.toFixed(3));
      el.style.setProperty("--my", my.toFixed(3));
    }
  }

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

  addEventListener("pointermove", (e) => {
    mx = (e.clientX / innerWidth) * 2 - 1;
    my = (e.clientY / innerHeight) * 2 - 1;
    if (!geplant && !ruhig.matches) { geplant = true; requestAnimationFrame(mausSetzen); }
    kippen(e);
  }, { passive: true });
  document.addEventListener("pointerleave", () => { if (gekippt) loslassen(gekippt); gekippt = null; });

  // Einflug: neu sichtbare Panels kommen aus der Tiefe, ihre Karten gleiten gestaffelt hinterher
  function einfliegen(alle) {
    if (ruhig.matches) return;
    const panels = [...document.querySelectorAll(".raster > .panel")].filter((p) => p.offsetParent !== null && (alle || !p.classList.contains("rechts")));
    panels.forEach((p, n) => {
      p.style.setProperty("--n", n);
      [...p.querySelectorAll(KINDER)].slice(0, 48).forEach((k, i) => k.style.setProperty("--i", Math.min(i, 24)));
      p.classList.remove("einflug");
      void p.offsetWidth;
      p.classList.add("einflug");
      clearTimeout(p._einflug);
      p._einflug = setTimeout(() => p.classList.remove("einflug"), 2400);
    });
  }

  document.addEventListener("cockpit:ansicht", () => einfliegen(false));
  document.addEventListener("cockpit:verbunden", (ev) => {
    let erstes = true;
    ev.detail.addEventListener("zustand", () => { if (erstes) { erstes = false; setTimeout(() => einfliegen(true), 80); } });
  });
})();
