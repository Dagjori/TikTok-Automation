// Neon-Stadt des Cockpits (Entscheidungen 03.11.): Die Stadt ist die Zentrale. Sieben Gebäude sind anklickbar (Live-Zentrale,
// Studio, Zahlen-Turm, Ziele-Turm, Lernzentrale, Trend-Radar, Claude-Hauptquartier) und führen in ihre Räume. Tag und Nacht
// laufen in Echtzeit nach dem Berliner Sonnenstand, das Wetter nach dem echten Berliner Wetter. Ohne Eingabe fliegt die
// Kamera langsam durch die Stadt; ziehen dreht, Mausrad zoomt, nach einer Weile ohne Eingabe fliegt sie weiter.
// Leistung (Entscheidung 03.11.): Auto = volle Pracht, aber sparsam, solange dieser Rechner rendert.
// Zum Ausprobieren ohne Cockpit: stadt-vorschau.html?zeit=17:10&wetter=regen&tempo=600
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { szene, U, CYAN, PINK, GOLD, GRUEN, clamp } from "./kern.js";
import { himmelBauen, himmelAktualisieren, wetterSetzen } from "./himmel.js";
import { bodenBauen, bodenBewegen, skylineBauen, zentralenBauen, zentralenBewegen, zentralenDaten, ZENTRALEN, ZD } from "./gebaeude.js";
import { verkehrBauen, verkehrBewegen, tafelBauen, tafelBewegen, tafelDaten, hologrammBauen, hologrammBewegen, platzRoboterBauen, platzRoboterBewegen, platzJubel } from "./leben.js";
import { effekteBauen, effekteBewegen, spruehen, feuerwerk, welle, lichtstrahl, schwebetext, EFFEKT, pixelSetzen } from "./effekte.js";
import { raumOeffnen, raumWechseln, RAUM_BILD, RAEUME, beimVerlassen, inhaltAnbieter, imRaum, raumZustand, verlassen as raumVerlassen } from "./raeume.js";

const leinwand = document.getElementById("welt");
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas: leinwand, antialias: false, powerPreference: "high-performance" });
} catch (e) {
  console.warn("Neon-Stadt: kein WebGL", e);
}
if (!renderer) {
  document.body.classList.add("welt-fehlt");
  throw new Error("Neon-Stadt: WebGL nicht verfügbar, das Cockpit bleibt in 2D");
}

const PARAM = new URLSearchParams(location.search);
const lokal = globalThis.lokal || { lesen: (k, d) => { try { return localStorage.getItem("cockpit-" + k) ?? d; } catch { return d; } }, schreiben: (k, v) => { try { localStorage.setItem("cockpit-" + k, v); } catch {} } };
const ton = () => globalThis.Ton;

const STUFEN = {
  ultra: { pr: 1.25, bloom: true, fps: 60, partikel: 1, name: "Ultra" },
  sparsam: { pr: 0.6, bloom: false, fps: 24, partikel: 0.3, name: "Sparsam" },
};
const WAHL = ["auto", "ultra", "sparsam", "aus"];
const WAHL_TEXT = {
  auto: ["Auto", "volle Pracht, sparsam solange dieser Rechner rendert"],
  ultra: ["Ultra", "immer volle Pracht (Rendern kann langsamer werden)"],
  sparsam: ["Sparsam", "weniger Bilder pro Sekunde, kein Leuchten"],
  aus: ["Aus", "flache Ansicht ohne 3D"],
};

export const W = {
  wahl: WAHL.includes(lokal.lesen("welt-stufe", "auto")) ? lokal.lesen("welt-stufe", "auto") : "auto",
  stufe: null, prFaktor: 1, lauf: 0, wackeln: 0, zeiten: [], messung: 0,
  modus: "flug", // flug | frei | anflug | innen
  hover: null, gewaehlt: null, ruhe: performance.now(),
  orbit: { az: 0, el: 0.4, dist: 120, ziel: new THREE.Vector3(0, 14, -10), ziehen: null },
  flugT: 0, flugMisch: 1,
  anflug: null, beiKlick: null, beiInnen: null,
};

const kamera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.3, 4000);
kamera.position.set(0, 120, 260);
const istZiel = new THREE.Vector3(0, 14, -10);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(szene, kamera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.5, 0.45);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ───────────────────────── Zeit (echt oder zum Ausprobieren verschoben/beschleunigt) ─────────────────────────
const ZEIT_START = Date.now();
let zeitVersatz = 0;
const tempo = Number(PARAM.get("tempo") || 1);
if (PARAM.get("zeit")) {
  const z = PARAM.get("zeit");
  const ziel = /^\d{1,2}:\d{2}$/.test(z) ? (() => { const d = new Date(); const [h, m] = z.split(":").map(Number); d.setHours(h, m, 0, 0); return d; })() : new Date(z);
  if (!Number.isNaN(ziel.valueOf())) zeitVersatz = ziel.valueOf() - ZEIT_START;
}
export const jetzt = () => new Date(ZEIT_START + zeitVersatz + (Date.now() - ZEIT_START) * tempo);
if (PARAM.get("wetter")) {
  const w = { klar: { code: 0, wolken: 5 }, wolken: { code: 3, wolken: 85 }, regen: { code: 63, wolken: 95, regen: 3 }, schnee: { code: 73, wolken: 95, schnee: 1 }, nebel: { code: 45, wolken: 60 } }[PARAM.get("wetter")];
  if (w) wetterSetzen(w);
}

// ───────────────────────── Aufbau ─────────────────────────
himmelBauen();
bodenBauen();
const anzahlHaeuser = skylineBauen();
zentralenBauen();
verkehrBauen();
tafelBauen();
hologrammBauen();
platzRoboterBauen(ZENTRALEN);
effekteBauen();

// ───────────────────────── Kameraflug ─────────────────────────
// Rundflug durch die Stadt: Positionen und Blickpunkte als geschlossene Kurven, eine Runde in etwa vier Minuten
const FLUG_DAUER = 240;
const FLUG = [
  [[0, 22, 92], [0, 21, -30]],
  [[-70, 24, 76], [-18, 18, -22]],
  [[-112, 42, -6], [-6, 22, -12]],
  [[-74, 60, -112], [0, 24, -18]],
  [[34, 72, -150], [0, 28, 0]],
  [[122, 38, -38], [8, 20, -10]],
  [[96, 22, 62], [10, 16, -22]],
  [[30, 16, 72], [-12, 14, -30]],
];
const flugPos = new THREE.CatmullRomCurve3(FLUG.map(([p]) => new THREE.Vector3(...p)), true, "centripetal");
const flugZiel = new THREE.CatmullRomCurve3(FLUG.map(([, z]) => new THREE.Vector3(...z)), true, "centripetal");
const sollPos = new THREE.Vector3(), sollZiel = new THREE.Vector3(), hilf = new THREE.Vector3();

function naechsterFlugpunkt(pos) {
  let best = 0, abst = Infinity;
  for (let i = 0; i < 240; i++) {
    const d = flugPos.getPointAt(i / 240, hilf).distanceToSquared(pos);
    if (d < abst) { abst = d; best = i / 240; }
  }
  return best;
}

function kameraFuehren(dt, zeit) {
  const o = W.orbit;
  if (W.modus === "frei" && !o.ziehen && performance.now() - W.ruhe > 25000) {
    // Nach 25 s ohne Eingabe: sanft zurück in den Rundflug
    W.flugT = naechsterFlugpunkt(kamera.position);
    W.flugMisch = 0;
    W.modus = "flug";
  }
  let traegheit = 1.6;
  if (W.modus === "flug") {
    W.flugT = (W.flugT + dt / FLUG_DAUER) % 1;
    flugPos.getPointAt(W.flugT, sollPos);
    flugZiel.getPointAt(W.flugT, sollZiel);
    W.flugMisch = Math.min(1, W.flugMisch + dt / 4);
    traegheit = 0.4 + W.flugMisch * 2.6;
  } else if (W.modus === "frei") {
    sollZiel.copy(o.ziel);
    sollPos.set(o.ziel.x + Math.sin(o.az) * Math.cos(o.el) * o.dist, o.ziel.y + Math.sin(o.el) * o.dist, o.ziel.z + Math.cos(o.az) * Math.cos(o.el) * o.dist);
    traegheit = o.ziehen ? 10 : 4;
  } else if (W.modus === "anflug" && W.anflug) {
    sollPos.copy(W.anflug.pos);
    sollZiel.copy(W.anflug.ziel);
    traegheit = W.anflug.traegheit ?? 2.2;
  }
  const k = 1 - Math.exp(-dt * traegheit);
  kamera.position.lerp(sollPos, k);
  istZiel.lerp(sollZiel, k);
  if (kamera.position.y < 3) kamera.position.y = 3;
  if (W.wackeln > 0) {
    kamera.position.x += (Math.random() - 0.5) * W.wackeln;
    kamera.position.y += (Math.random() - 0.5) * W.wackeln;
    W.wackeln = Math.max(0, W.wackeln - dt * 2.5);
  }
  kamera.lookAt(istZiel);
}

function freiStarten() {
  // Aktuelle Ansicht als Ausgangspunkt für Drehen und Zoomen
  const o = W.orbit;
  o.ziel.copy(istZiel);
  hilf.copy(kamera.position).sub(o.ziel);
  o.dist = clamp(hilf.length(), 12, 320);
  o.el = clamp(Math.asin(hilf.y / o.dist), 0.04, 1.4);
  o.az = Math.atan2(hilf.x, hilf.z);
  W.modus = "frei";
}

// ───────────────────────── Zeigen und Anklicken der Zentralen ─────────────────────────
const strahl = new THREE.Raycaster(), ndc = new THREE.Vector2();
const TREFFER = ZENTRALEN.map((z) => z.treffer);
function zentraleUnter(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  strahl.setFromCamera(ndc, kamera);
  return strahl.intersectObjects(TREFFER, false)[0]?.object.userData.zentrale || null;
}
const tipp = document.getElementById("stadt-tipp");
function tippZeigen(z, e) {
  if (!tipp) return;
  if (!z) { tipp.hidden = true; return; }
  tipp.hidden = false;
  tipp.style.setProperty("--akzent", "#" + z.akzent.getHexString());
  tipp.innerHTML = `<b>${z.emoji} ${z.name}</b><small>${zentraleStatus(z)}</small><span>Klicken zum Betreten · Taste ${z.taste}</span>`;
  tipp.style.transform = `translate(${Math.min(e.clientX + 18, innerWidth - 300)}px, ${Math.min(e.clientY + 18, innerHeight - 110)}px)`;
}
function zentraleStatus(z) {
  switch (z.id) {
    case "live": return ZD.rendert ? `Render läuft · ${Math.round(ZD.prozent)} %` : "Render-Dienst bereit";
    case "studio": return ZD.ideenAktiv ? "Ideen und Skripte entstehen …" : "Ideen, Skripte, Freigabe";
    case "zahlen": return "Follower, Likes, jedes Video";
    case "ziele": return `CRP-Ziel: ${Math.round((ZD.zielAnteil || 0) * 100)} %`;
    case "lernen": return ZD.lernAktiv ? "Lernschleife läuft …" : "Lernschleife, Vorschläge, Lernstand";
    case "radar": return ZD.radarNeu ? `${ZD.radarNeu} offene Trend-Vorschläge` : "Trend-Vorschläge";
    case "claude": return ZD.claudeAktiv ? "Claude arbeitet …" : "Claude bereit";
    default: return "";
  }
}

// Namensschilder als HTML über den Gebäuden: scharf, anklickbar, überdecken sich nicht
const schilder = document.createElement("div");
schilder.id = "stadt-schilder";
document.body.append(schilder);
for (const z of ZENTRALEN) {
  const el = document.createElement("button");
  el.className = "stadt-schild";
  el.style.setProperty("--akzent", "#" + z.akzent.getHexString());
  el.innerHTML = `<span>${z.emoji}</span>${z.name}<i></i>`;
  el.addEventListener("click", () => zentraleAnfliegen(z.id));
  el.addEventListener("pointerenter", () => { z.hoverZiel = true; });
  el.addEventListener("pointerleave", () => { if (W.hover !== z) z.hoverZiel = false; });
  schilder.append(el);
  z.schildEl = el;
}
const projiziert = new THREE.Vector3();
function schilderSetzen() {
  const sichtbar = W.modus !== "innen" && W.modus !== "anflug" && W.stufe !== "aus";
  schilder.hidden = !sichtbar;
  if (!sichtbar) return;
  const belegt = [];
  // Nahe Gebäude zuerst, ferne Schilder weichen nach oben aus
  const reihe = ZENTRALEN.map((z) => ({ z, d: kamera.position.distanceToSquared(z.gruppe.position) })).sort((a, b) => a.d - b.d);
  for (const { z } of reihe) {
    projiziert.copy(z.gruppe.position).setY(z.hoehe + 3).project(kamera);
    const el = z.schildEl;
    if (projiziert.z > 1 || Math.abs(projiziert.x) > 1.2 || Math.abs(projiziert.y) > 1.2) { el.hidden = true; continue; }
    el.hidden = false;
    const b = el.offsetWidth || 150, h = el.offsetHeight || 30;
    const x = (projiziert.x * 0.5 + 0.5) * innerWidth;
    let y = (-projiziert.y * 0.5 + 0.5) * innerHeight;
    for (let i = 0; i < 4 && belegt.some((r) => Math.abs(r.x - x) < (r.b + b) / 2 + 6 && Math.abs(r.y - y) < h + 4); i++) y -= h + 6;
    belegt.push({ x, y, b });
    el.style.transform = `translate(${x - b / 2}px, ${y - h}px)`;
    el.classList.toggle("hover", z.hover > 0.5);
    el.classList.toggle("aktiv", zentraleAktiv(z.id));
  }
}

/** Zur Zentrale fliegen; danach meldet beiKlick, dass sie betreten werden soll (Räume übernimmt raeume.js) */
export function zentraleAnfliegen(id) {
  const z = ZENTRALEN.find((x) => x.id === id);
  if (!z || W.stufe === "aus") { W.beiKlick?.(z); return; }
  W.gewaehlt = z;
  const pos = z.tuer.clone().addScaledVector(z.vorn, 22).setY(Math.max(9, z.hoehe * 0.28));
  W.anflug = { pos, ziel: z.mitte.clone(), traegheit: 2.4 };
  W.modus = "anflug";
  ton()?.whoosh?.();
  welle(z.tuer.clone().setY(0.08), z.akzent, 20, 1.2);
  // Nach dem Anflug durch die Tür hinein
  clearTimeout(W.anflugTimer);
  W.anflugTimer = setTimeout(() => {
    W.anflug = { pos: z.tuer.clone().addScaledVector(z.vorn, -1).setY(2.4), ziel: z.tuer.clone().addScaledVector(z.vorn, -12).setY(2.4), traegheit: 3.2 };
    document.body.classList.add("stadt-eintritt");
    setTimeout(() => { document.body.classList.remove("stadt-eintritt"); W.beiKlick?.(z); }, 650);
  }, 1300);
}

/** Zurück aus einem Gebäude: vor der Tür stehen, dann wieder frei */
export function zurueckInDieStadt(z) {
  if (z) {
    kamera.position.copy(z.tuer).addScaledVector(z.vorn, 4).setY(3);
    istZiel.copy(z.tuer).addScaledVector(z.vorn, 30).setY(10);
    W.orbit.ziel.copy(z.gruppe.position).setY(z.hoehe * 0.4);
    W.orbit.dist = 60; W.orbit.el = 0.3; W.orbit.az = Math.atan2(z.vorn.x, z.vorn.z);
  }
  W.modus = "frei";
  W.ruhe = performance.now();
}

leinwand.addEventListener("pointerdown", (e) => {
  if (W.modus === "innen") return;
  if (W.modus !== "frei") freiStarten();
  W.orbit.ziehen = { x: e.clientX, y: e.clientY, az: W.orbit.az, el: W.orbit.el, weg: 0 };
  leinwand.setPointerCapture(e.pointerId);
  leinwand.classList.add("ziehen");
});
leinwand.addEventListener("pointermove", (e) => {
  if (W.modus === "innen") return;
  const z = W.orbit.ziehen;
  if (z) {
    z.weg = Math.max(z.weg, Math.hypot(e.clientX - z.x, e.clientY - z.y));
    W.orbit.az = z.az - (e.clientX - z.x) * 0.006;
    W.orbit.el = clamp(z.el + (e.clientY - z.y) * 0.004, 0.04, 1.4);
    W.ruhe = performance.now();
    return;
  }
  const neu = zentraleUnter(e);
  if (W.hover && W.hover !== neu) W.hover.hoverZiel = false;
  W.hover = neu;
  if (neu) neu.hoverZiel = true;
  leinwand.classList.toggle("zeiger", !!neu);
  tippZeigen(neu, e);
});
leinwand.addEventListener("pointerup", (e) => {
  const z = W.orbit.ziehen;
  W.orbit.ziehen = null;
  W.ruhe = performance.now();
  leinwand.classList.remove("ziehen");
  if (!z || z.weg > 6 || W.modus === "innen") return;
  const treffer = zentraleUnter(e);
  if (treffer) { tippZeigen(null); zentraleAnfliegen(treffer.id); }
});
leinwand.addEventListener("pointerleave", () => { if (W.hover) W.hover.hoverZiel = false; W.hover = null; tippZeigen(null); });
leinwand.addEventListener("wheel", (e) => {
  if (W.modus === "innen") return;
  e.preventDefault();
  if (W.modus !== "frei") freiStarten();
  W.orbit.dist = clamp(W.orbit.dist * (1 + e.deltaY * 0.0012), 14, 320);
  W.ruhe = performance.now();
}, { passive: false });

// ───────────────────────── Qualität und Leistung ─────────────────────────
const S_ = () => globalThis.S || {};
const rechnerRendert = () => !!(S_().live?.aktiv || (S_().render?.rechner || []).some((r) => r.lokal && r.online && r.daten?.status === "rendert"));

function groesseSetzen() {
  const st = STUFEN[W.stufe];
  if (!st) return;
  const pr = Math.min(devicePixelRatio || 1, st.pr * (W.stufe === "ultra" ? W.prFaktor : 1));
  renderer.setPixelRatio(pr);
  renderer.setSize(innerWidth, innerHeight, false);
  composer.setPixelRatio(pr);
  composer.setSize(innerWidth, innerHeight);
  kamera.aspect = innerWidth / innerHeight;
  kamera.updateProjectionMatrix();
  pixelSetzen(pr);
  W.beiGroesse?.();
}

function stufeKnopf() {
  const k = document.getElementById("k-welt-stufe");
  if (!k) return;
  const [name, text] = WAHL_TEXT[W.wahl];
  k.title = `3D-Qualität: ${name} (${text})${W.wahl === "auto" && W.stufe ? ` · gerade ${STUFEN[W.stufe]?.name || "aus"}` : ""} · klicken zum Wechseln`;
  k.classList.toggle("aus", W.wahl === "aus");
}

export function stufeBestimmen() {
  let st = W.wahl === "auto" ? (rechnerRendert() ? "sparsam" : "ultra") : W.wahl;
  if (st === "ultra" && matchMedia("(prefers-reduced-motion: reduce)").matches) st = "sparsam";
  if (st !== W.stufe) {
    const vorher = W.stufe;
    W.stufe = st;
    const aus = st === "aus";
    document.body.classList.toggle("welt-an", !aus);
    document.body.classList.toggle("welt-sparsam", st === "sparsam");
    leinwand.hidden = aus;
    EFFEKT.menge = STUFEN[st]?.partikel ?? 0;
    if (!aus) groesseSetzen();
    W.beiStufe?.(st, vorher);
    if (W.wahl === "auto" && vorher === "ultra" && st === "sparsam") globalThis.tickerNeu?.("🌐 Neon-Stadt läuft sparsam, solange dieser Rechner rendert");
    if (W.wahl === "auto" && vorher === "sparsam" && st === "ultra") globalThis.tickerNeu?.("🌐 Render fertig: Neon-Stadt wieder in voller Pracht");
  }
  stufeKnopf();
}
export function stufeWechseln() {
  W.wahl = WAHL[(WAHL.indexOf(W.wahl) + 1) % WAHL.length];
  lokal.schreiben("welt-stufe", W.wahl);
  W.prFaktor = 1;
  stufeBestimmen();
  const [name, text] = WAHL_TEXT[W.wahl];
  globalThis.toast?.("✨", `3D-Stadt: ${name}`, text, "meilenstein");
  ton()?.klick?.();
}
addEventListener("resize", groesseSetzen);
setInterval(stufeBestimmen, 5000);

// Ultra wird bei Ruckeln von selbst gröber gerendert und erholt sich langsam
function messen(dt, jetztMs) {
  if (dt < 0.25) W.zeiten.push(dt);
  if (jetztMs - W.messung < 4000) return;
  W.messung = jetztMs;
  if (W.stufe !== "ultra" || W.zeiten.length < 20) { W.zeiten = []; return; }
  const schnitt = W.zeiten.reduce((a, b) => a + b, 0) / W.zeiten.length;
  W.zeiten = [];
  if (schnitt > 1 / 34 && W.prFaktor > 0.5) { W.prFaktor = Math.max(0.5, W.prFaktor - 0.15); groesseSetzen(); }
  else if (schnitt < 1 / 55 && W.prFaktor < 1) { W.prFaktor = Math.min(1, W.prFaktor + 0.05); groesseSetzen(); }
}

// ───────────────────────── Bildschleife ─────────────────────────
let letzte = 0;
export const STADT_INFO = { himmel: null, haeuser: anzahlHaeuser };
function schleife(jetztMs) {
  requestAnimationFrame(schleife);
  const st = STUFEN[W.stufe];
  if (!st || document.hidden) return;
  if (jetztMs - letzte < 1000 / st.fps - 2) return;
  const dt = letzte ? Math.min(0.1, (jetztMs - letzte) / 1000) : 1 / 60;
  if (letzte) messen((jetztMs - letzte) / 1000, jetztMs);
  letzte = jetztMs;
  const zeit = jetztMs / 1000;
  U.uZeit.value = zeit;
  W.lauf += dt * (1 + (ZD.claudeAktiv ? 1 : 0) + (ZD.rendert ? 1.5 : 0)) * 4;

  STADT_INFO.himmel = himmelAktualisieren(jetzt(), dt, kamera); // auch drinnen: die Fenster zeigen den echten Himmel
  schilderSetzen();
  if (W.modus === "innen" && W.innen) {
    W.innen.bewegen(dt, zeit);
    W.innen.zeichnen(st.bloom ? composer : null, renderer, renderPass, bloom);
    W.beiBild?.(dt, zeit);
    return;
  }
  bodenBewegen(W.lauf);
  zentralenBewegen(dt, zeit);
  verkehrBewegen(dt);
  tafelBewegen(dt);
  hologrammBewegen(dt, zeit);
  platzRoboterBewegen(dt, zeit, ZD.rendert || ZD.claudeAktiv || ZD.ideenAktiv);
  effekteBewegen(dt);
  kameraFuehren(dt, zeit);
  W.beiBild?.(dt, zeit);

  // Leuchten: nachts kräftig, tagsüber zurückhaltend
  bloom.strength = 0.25 + 0.4 * U.uNacht.value;
  bloom.threshold = 0.78 - 0.2 * U.uNacht.value;
  renderPass.scene = szene;
  renderPass.camera = kamera;
  if (st.bloom) composer.render(); else renderer.render(szene, kamera);
}

// ───────────────────────── Daten aus dem Cockpit ─────────────────────────
/** Zustand des Cockpits in die Stadt übertragen (Render, Claude, Ziele, Tafel) */
export function stadtDaten(d) {
  zentralenDaten(d.zentralen || {});
  if (d.tafel) tafelDaten(d.tafel);
  if (d.wetter) wetterSetzen(d.wetter);
}

/** Ereignisse: Feuerwerk, Wellen, Jubel */
export function stadtEreignis(art, d = {}) {
  const z = (id) => ZENTRALEN.find((x) => x.id === id);
  switch (art) {
    case "follower": {
      const ort = z("zahlen").gruppe.position.clone().setY(70);
      feuerwerk(ort, false, ton()?.blip);
      schwebetext(ort.clone().setY(76), `+${d.plus} 👥`, d.kanal === "stelldirvor.pov" ? PINK : CYAN);
      ZD.zahlenPuls = 1;
      break;
    }
    case "ziel": {
      const ort = z("ziele").gruppe.position.clone();
      feuerwerk(ort.clone().setY(64), true, ton()?.blip);
      welle(ort.clone().setY(0.08), GOLD, 140, 2.2);
      lichtstrahl(ort, GRUEN);
      W.wackeln = 1.4;
      platzJubel();
      break;
    }
    case "render_start": {
      const t = z("live").tuer;
      welle(t.clone().setY(0.08), GOLD, 40);
      spruehen(t.clone().setY(2), { anzahl: 80, farben: [GOLD], tempo: 12, leben: 1.2 });
      break;
    }
    case "render_fertig":
    case "gepostet": {
      const ort = z("live").gruppe.position.clone();
      feuerwerk(ort.clone().setY(60), art === "gepostet", ton()?.blip);
      lichtstrahl(ort, art === "gepostet" ? PINK : GOLD);
      platzJubel();
      break;
    }
    case "claude_werkzeug": {
      const cl = z("claude");
      cl.kernPuls = 1;
      const von = cl.gruppe.position.clone().setY(cl.kern.position.y), ziel = z(d.ziel || "studio").mitte.clone();
      spruehen(von, { anzahl: 22, richtung: ziel.sub(von).divideScalar(0.9), streuung: 3, schwerkraft: 0, zug: 0, leben: 0.9, groesse: 1.1, farben: [cl.kernFarbe.clone(), new THREE.Color("#ffffff")] });
      break;
    }
  }
}

// Ist in einer Zentrale gerade echte Arbeit? Dann sind ihre Roboter geschäftig
function zentraleAktiv(id) {
  return { live: ZD.rendert, studio: ZD.ideenAktiv, claude: ZD.claudeAktiv, lernen: ZD.lernAktiv, zahlen: ZD.zahlenPuls > 0.05, radar: ZD.radarNeu > 0, ziele: false }[id] || false;
}

// Betreten und Verlassen der Gebäude (die Räume zeichnet raeume.js mit demselben Renderer)
function betreten(z, raum = 0) {
  if (!z) return;
  W.modus = "innen";
  W.innen = RAUM_BILD;
  if (W.hover) W.hover.hoverZiel = false;
  tippZeigen(null);
  raumOeffnen(z, raum);
  W.beiRaum?.(z);
}
W.beiKlick = (z) => { const raum = W.naechsterRaum ?? 0; W.naechsterRaum = null; betreten(z, raum); };
beimVerlassen((z) => { W.innen = null; zurueckInDieStadt(z); W.beiRaum?.(null); });

/** Direkt in einen Raum (Schnellwahl, Sprachbot): fliegt hin und geht hinein; ist man schon drin, wird nur gewechselt */
export function raumAnsteuern(zentraleId, raumId = null) {
  const z = ZENTRALEN.find((x) => x.id === zentraleId);
  if (!z) return;
  const index = Math.max(0, (RAEUME[zentraleId] || []).findIndex((r) => r.id === raumId));
  if (raumZustand().zentrale === zentraleId) { raumWechseln(index); return; }
  if (imRaum()) { raumVerlassen(); betreten(z, index); return; }
  W.naechsterRaum = index;
  zentraleAnfliegen(zentraleId);
}

export const STADT = { renderer, composer, renderPass, bloom, kamera, W, ZENTRALEN, RAEUME, info: STADT_INFO, jetzt, stufeBestimmen, stufeWechseln, zentraleAnfliegen, zurueckInDieStadt, stadtDaten, stadtEreignis, freiStarten, zentraleAktiv, raumAnsteuern, betreten, inhaltAnbieter, imRaum, raumZustand, raumVerlassen };
globalThis.STADT = STADT;

stufeBestimmen();
requestAnimationFrame(schleife);
document.dispatchEvent(new CustomEvent("stadt:bereit", { detail: STADT }));
