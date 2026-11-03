// Räume in den Zentralen (Entscheidung 03.11.: die Kamera fliegt in einen echten 3D-Raum, die Inhalte hängen dort auf
// Wandbildschirmen; je Gebäude mehrere Räume, Pfeile führen in den Nachbarraum). Die Bildschirme sind echte HTML-Elemente
// des Cockpits, per CSS-3D an die Wand gesetzt (gleiche Kamera wie die WebGL-Szene): Knöpfe und Eingaben funktionieren dort.
// Ein Klick auf einen Bildschirm holt ihn gerade und scharf heran, Esc geht einen Schritt zurück.
// Ohne 3D (Qualität „Aus“ oder kein WebGL) stehen dieselben Bildschirme flach nebeneinander („flach“).
import * as THREE from "three";
import { U, CYAN, PINK, GOLD, VIOLETT, GRUEN, ORANGE, schriftTextur, SCHRIFT, clamp } from "./kern.js";
import { Schar } from "./roboter.js";

const SKALA = 0.0175; // Welteinheiten je CSS-Pixel der Wandbildschirme
const BREITE = 44, TIEFE = 34, HOEHE = 15;

// Räume je Zentrale (Entscheidung 03.11.: „So übernehmen“). platz: mitte = Rückwand, links/rechts = schräge Wände
export const RAEUME = {
  live: [
    { id: "regie", name: "Regie", schirme: { mitte: { titel: "Live-Render", b: 960, h: 600 }, rechts: { titel: "Ablauf", b: 720, h: 450 } } },
    { id: "tagesplan", name: "Tagesplan", schirme: { mitte: { titel: "Heute", b: 960, h: 600 }, rechts: { titel: "Render-Aufträge", b: 720, h: 450 } } },
    { id: "technik", name: "Technik", schirme: { mitte: { titel: "Render-Dienst", b: 960, h: 600 }, links: { titel: "Rechner", b: 720, h: 450 } } },
  ],
  studio: [
    { id: "ideen", name: "Ideenwerkstatt", schirme: { mitte: { titel: "Ideen", b: 1100, h: 660 } } },
    { id: "schreibstube", name: "Schreibstube", schirme: { mitte: { titel: "Videos des Tages", b: 1100, h: 660 }, rechts: { titel: "Freigabe", b: 720, h: 450 } } },
  ],
  zahlen: [
    { id: "konten", name: "Konten", schirme: { mitte: { titel: "Konten", b: 1100, h: 620 } } },
    { id: "archiv", name: "Videoarchiv", schirme: { mitte: { titel: "Jedes Video", b: 1200, h: 680 } } },
  ],
  ziele: [{ id: "ziele", name: "Ziele", schirme: { mitte: { titel: "Ziele bis zum CRP", b: 1100, h: 660 } } }],
  lernen: [
    { id: "schleife", name: "Lernschleife", schirme: { mitte: { titel: "Lernschleife", b: 1000, h: 620 }, links: { titel: "Selbständigkeit", b: 720, h: 450 } } },
    { id: "vorschlaege", name: "Vorschläge", schirme: { mitte: { titel: "Vorschläge", b: 1100, h: 660 } } },
    { id: "lernstand", name: "Lernstand", schirme: { mitte: { titel: "Was Claude gelernt hat", b: 1100, h: 660 } } },
  ],
  radar: [{ id: "radar", name: "Radar", schirme: { mitte: { titel: "Trend-Vorschläge", b: 1000, h: 620 } } }],
  claude: [{ id: "kommando", name: "Kommando", schirme: { mitte: { titel: "Claude", b: 900, h: 660 }, links: { titel: "Aufgaben", b: 720, h: 450 } } }],
};

const PLAETZE = {
  mitte: { pos: new THREE.Vector3(0, 7.6, 0.18), dreh: 0 },
  links: { pos: new THREE.Vector3(-16.8, 7.4, 5.2), dreh: Math.PI / 4 },
  rechts: { pos: new THREE.Vector3(16.8, 7.4, 5.2), dreh: -Math.PI / 4 },
};

const innen = new THREE.Scene();
innen.background = new THREE.Color("#05040a");
const kamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 400);
const R = {
  zentrale: null, raum: 0, fokus: null, akzent: new THREE.Color(), akzentU: { value: new THREE.Color() },
  schirme: {}, glow: {}, schar: null, sollPos: new THREE.Vector3(0, 7.2, 24), sollZiel: new THREE.Vector3(0, 6.6, 0),
  istZiel: new THREE.Vector3(0, 6.6, 0), maus: { x: 0, y: 0 }, schild: null, gebaut: false, flach: false, beiVerlassen: null, inhalt: null,
};

// ───────────────────────── Raum (eine Vorlage, je Raum umgestellt) ─────────────────────────
const WAND_FRAGMENT = `uniform vec3 uAkzent, uHimmelOben, uHimmelUnten, uSonneFarbe; uniform float uFenster, uZeit; uniform vec2 uBand;
  varying vec3 vWelt; varying vec2 vUv;
  vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
  void main() {
    vec3 f = lin(vec3(0.075, 0.065, 0.115));
    float naht = step(0.97, fract(vUv.x * 8.0));
    f += lin(vec3(0.03, 0.025, 0.06)) * naht;
    float unten = smoothstep(0.35, 0.05, vWelt.y), oben = smoothstep(${HOEHE - 0.5}, ${HOEHE - 0.1}, vWelt.y);
    f += uAkzent * (unten + oben) * 1.3;
    f += uAkzent * exp(-vWelt.y * 0.6) * 0.12;
    // Fensterband mit dem echten Himmel über Berlin
    if (uFenster > 0.5) {
      float band = step(uBand.x, vWelt.y) * step(vWelt.y, uBand.y);
      float rahmen = step(0.92, fract(vUv.x * 6.0)) + step(uBand.y - 0.15, vWelt.y) + (1.0 - step(uBand.x + 0.15, vWelt.y));
      vec3 himmel = mix(uHimmelUnten, uHimmelOben, smoothstep(uBand.x, uBand.y, vWelt.y)) + uSonneFarbe * 0.15;
      f = mix(f, mix(himmel, lin(vec3(0.12, 0.1, 0.18)), clamp(rahmen, 0.0, 1.0)), band);
    }
    gl_FragColor = vec4(f, 1.0);
    #include <colorspace_fragment>
  }`;
const WAND_VERTEX = `varying vec3 vWelt; varying vec2 vUv; void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vWelt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
// band: Höhe des Fensterbands (von, bis); ohne band keine Fenster
const wandMat = (band = null) => new THREE.ShaderMaterial({
  uniforms: { uAkzent: R.akzentU, uHimmelOben: U.uHimmelOben, uHimmelUnten: U.uHimmelUnten, uSonneFarbe: U.uSonneFarbe, uFenster: { value: band ? 1 : 0 }, uBand: { value: new THREE.Vector2(...(band || [0, 0])) }, uZeit: U.uZeit },
  vertexShader: WAND_VERTEX, fragmentShader: WAND_FRAGMENT,
});

function raumBauen() {
  // Boden mit Gitter und Lichtpfützen unter den Bildschirmen
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(BREITE, TIEFE), new THREE.ShaderMaterial({
    uniforms: { uAkzent: R.akzentU, uZeit: U.uZeit },
    vertexShader: WAND_VERTEX,
    fragmentShader: `uniform vec3 uAkzent; uniform float uZeit; varying vec3 vWelt;
      vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
      float linie(float k) { float d = abs(fract(k - 0.5) - 0.5) / max(fwidth(k), 1e-4); return 1.0 - min(d, 1.0); }
      void main() {
        vec3 f = lin(vec3(0.05, 0.045, 0.08));
        f += uAkzent * max(linie(vWelt.x / 2.0), linie(vWelt.z / 2.0)) * 0.12;
        f += uAkzent * exp(-vWelt.z * 0.18) * 0.35 * (1.0 - smoothstep(10.0, 16.0, abs(vWelt.x)));
        f += lin(vec3(0.5, 0.6, 1.0)) * exp(-length(vWelt.xz - vec2(0.0, 2.0)) * 0.25) * 0.12;
        gl_FragColor = vec4(f, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  boden.rotation.x = -Math.PI / 2;
  boden.position.z = TIEFE / 2;
  innen.add(boden);
  const decke = new THREE.Mesh(new THREE.PlaneGeometry(BREITE, TIEFE), new THREE.MeshBasicMaterial({ color: 0x07060c }));
  decke.rotation.x = Math.PI / 2;
  decke.position.set(0, HOEHE, TIEFE / 2);
  innen.add(decke);
  // Rückwand, zwei schräge Wände, zwei Seitenwände (mit Fensterband)
  const rueck = new THREE.Mesh(new THREE.PlaneGeometry(24, HOEHE), wandMat());
  rueck.position.set(0, HOEHE / 2, 0);
  innen.add(rueck);
  for (const s of [-1, 1]) {
    const schraeg = new THREE.Mesh(new THREE.PlaneGeometry(Math.hypot(10, 10), HOEHE), wandMat([11.9, 14.3]));
    schraeg.position.set(s * 17, HOEHE / 2, 5);
    schraeg.rotation.y = -s * Math.PI / 4;
    const seite = new THREE.Mesh(new THREE.PlaneGeometry(TIEFE - 10, HOEHE), wandMat([8.5, 12.6]));
    seite.position.set(s * BREITE / 2, HOEHE / 2, 10 + (TIEFE - 10) / 2);
    seite.rotation.y = -s * Math.PI / 2;
    innen.add(schraeg, seite);
  }
  // Lichtleisten an der Decke
  const leiste = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) });
  for (const z of [6, 14, 22, 30]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(30, 0.15, 0.5), leiste);
    l.position.set(0, HOEHE - 0.1, z);
    innen.add(l);
  }
  // Konsolen vor den Bildschirmen
  const pultMat = new THREE.MeshBasicMaterial({ color: 0x1a1726 });
  R.tasten = new THREE.MeshBasicMaterial({ color: new THREE.Color() });
  for (const [x, z, w, dreh] of [[0, 6.2, 15, 0], [-12.6, 10.2, 7, Math.PI / 4], [12.6, 10.2, 7, -Math.PI / 4]]) {
    const pult = new THREE.Group();
    const koerper = new THREE.Mesh(new THREE.BoxGeometry(w, 1.05, 1.6).translate(0, 0.525, 0), pultMat);
    const feld = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.6, 0.9), R.tasten);
    feld.rotation.x = -Math.PI / 2 + 0.35;
    feld.position.set(0, 1.08, 0.1);
    pult.add(koerper, feld);
    pult.position.set(x, 0, z);
    pult.rotation.y = dreh;
    innen.add(pult);
  }
  // Leuchtrahmen hinter den Bildschirmen (der HTML-Bildschirm liegt davor, der Rahmen leuchtet am Rand hervor)
  for (const [platz, p] of Object.entries(PLAETZE)) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(), transparent: true, opacity: 0.9 }));
    g.position.copy(p.pos).add(new THREE.Vector3(Math.sin(p.dreh), 0, Math.cos(p.dreh)).multiplyScalar(-0.05));
    g.rotation.y = p.dreh;
    innen.add(g);
    R.glow[platz] = g;
  }
  // Raumschild über der Rückwand
  R.schild = schriftTextur(1024, 160, (g, b, h, text = "", farbe = "#25f4ee") => {
    g.font = `700 84px ${SCHRIFT}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = farbe; g.shadowBlur = 26; g.fillStyle = "#ffffff"; g.fillText(text, b / 2, h / 2);
  });
  const schild = new THREE.Mesh(new THREE.PlaneGeometry(14, 14 * 160 / 1024), new THREE.MeshBasicMaterial({ map: R.schild.tex, transparent: true }));
  schild.position.set(0, 13.7, 0.1);
  innen.add(schild);
  // Ein Getränkeautomat für die Pausen der Roboter
  const automat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.2, 1.2).translate(0, 1.6, 0), new THREE.MeshBasicMaterial({ color: 0x2a1f3a }));
  const front = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.4), new THREE.MeshBasicMaterial({ color: new THREE.Color("#fe2c55").multiplyScalar(1.4) }));
  front.position.set(0, 1.8, 0.61);
  const automatG = new THREE.Group();
  automatG.add(automat, front);
  automatG.position.set(-9.6, 0, 13.5);
  automatG.rotation.y = Math.PI / 5;
  innen.add(automatG);
  R.schar = new Schar(innen, [{ pos: new THREE.Vector3(0, 0, 8), art: "pause" }], 6, { innen: true, tempo: 2, groesse: 1, akzente: [CYAN, PINK, GOLD, VIOLETT, GRUEN, ORANGE] });
  R.gebaut = true;
}

function stationenFuer(raum) {
  const st = [];
  const s = raum.schirme;
  if (s.mitte) for (const x of [-4.6, 0, 4.6]) st.push({ pos: new THREE.Vector3(x, 0, 7.9), blick: new THREE.Vector3(x, 1, 0), art: "tippen" });
  if (s.links) st.push({ pos: new THREE.Vector3(-11.4, 0, 11.4), blick: new THREE.Vector3(-17, 1, 5), art: "tippen" }, { pos: new THREE.Vector3(-8.5, 0, 9.5), blick: new THREE.Vector3(-17, 6, 5), art: "schauen" });
  if (s.rechts) st.push({ pos: new THREE.Vector3(11.4, 0, 11.4), blick: new THREE.Vector3(17, 1, 5), art: "tippen" }, { pos: new THREE.Vector3(8.5, 0, 9.5), blick: new THREE.Vector3(17, 6, 5), art: "schauen" });
  st.push({ pos: new THREE.Vector3(-8.2, 0, 14.4), blick: new THREE.Vector3(-9.6, 1.5, 13.5), art: "pause" });
  st.push({ pos: new THREE.Vector3(2, 0, 12), blick: new THREE.Vector3(0, 7, 0), art: "schauen" });
  return st;
}

// ───────────────────────── CSS-3D-Ebene (HTML-Bildschirme an den Wänden) ─────────────────────────
const eps = (v) => (Math.abs(v) < 1e-10 ? 0 : v);
function kameraCss(m) { const e = m.elements; return `matrix3d(${eps(e[0])},${eps(-e[1])},${eps(e[2])},${eps(e[3])},${eps(e[4])},${eps(-e[5])},${eps(e[6])},${eps(e[7])},${eps(e[8])},${eps(-e[9])},${eps(e[10])},${eps(e[11])},${eps(e[12])},${eps(-e[13])},${eps(e[14])},${eps(e[15])})`; }
function objektCss(m) { const e = m.elements; return `translate(-50%,-50%) matrix3d(${eps(e[0])},${eps(e[1])},${eps(e[2])},${eps(e[3])},${eps(-e[4])},${eps(-e[5])},${eps(-e[6])},${eps(-e[7])},${eps(e[8])},${eps(e[9])},${eps(e[10])},${eps(e[11])},${eps(e[12])},${eps(e[13])},${eps(e[14])},${eps(e[15])})`; }

let ebene, buehne, hud, blende;
function ebeneBauen() {
  ebene = document.createElement("div");
  ebene.id = "raum-ebene";
  ebene.hidden = true;
  buehne = document.createElement("div");
  buehne.className = "raum-buehne";
  ebene.append(buehne);
  for (const [platz, p] of Object.entries(PLAETZE)) {
    const el = document.createElement("section");
    el.className = "wandschirm";
    el.dataset.platz = platz;
    el.innerHTML = `<header class="wandschirm-kopf"><b></b><span class="wandschirm-hinweis">Klicken zum Heranholen</span></header><div class="wandschirm-inhalt"></div><div class="wandschirm-schild" title="Heranholen"></div>`;
    el.querySelector(".wandschirm-schild").addEventListener("click", () => fokus(platz));
    buehne.append(el);
    const obj = new THREE.Object3D();
    obj.position.copy(p.pos);
    obj.rotation.y = p.dreh;
    obj.scale.setScalar(SKALA);
    R.schirme[platz] = { el, obj, titel: el.querySelector(".wandschirm-kopf b"), inhalt: el.querySelector(".wandschirm-inhalt") };
  }
  hud = document.createElement("nav");
  hud.id = "raum-hud";
  hud.hidden = true;
  hud.innerHTML = `<button class="raum-zurueck" data-aktion="stadt" title="Zurück in die Stadt (Esc)">⤺ Stadt</button><b class="raum-ort"></b><div class="raum-tabs"></div>
    <button class="raum-pfeil" data-aktion="vor" title="Voriger Raum (←)">◀</button><button class="raum-pfeil" data-aktion="nach" title="Nächster Raum (→)">▶</button>`;
  hud.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.aktion === "stadt") verlassen();
    else if (b.dataset.aktion === "vor") raumWechseln(R.raum - 1);
    else if (b.dataset.aktion === "nach") raumWechseln(R.raum + 1);
    else if (b.dataset.raum) raumWechseln(Number(b.dataset.raum));
  });
  blende = document.createElement("div");
  blende.id = "raum-blende";
  document.body.append(ebene, hud, blende);
}

function cssZeichnen() {
  const w = innerWidth, h = innerHeight;
  const fovPx = kamera.projectionMatrix.elements[5] * h / 2;
  ebene.style.perspective = `${fovPx}px`;
  buehne.style.width = `${w}px`; buehne.style.height = `${h}px`;
  buehne.style.transform = `translateZ(${fovPx}px)${kameraCss(kamera.matrixWorldInverse)}translate(${w / 2}px,${h / 2}px)`;
  for (const s of Object.values(R.schirme)) {
    if (s.el.hidden) continue;
    s.obj.updateMatrixWorld();
    s.el.style.transform = objektCss(s.obj.matrixWorld);
  }
}

// ───────────────────────── Steuerung ─────────────────────────
function raumEinrichten() {
  const z = R.zentrale, raeume = RAEUME[z.id] || [], raum = raeume[R.raum];
  R.akzent.copy(z.akzent);
  R.akzentU.value.copy(z.akzent);
  if (R.gebaut) {
    R.tasten.color.copy(z.akzent).multiplyScalar(1.3);
    R.schild.neu(`${z.emoji} ${raum.name.toUpperCase()}`, "#" + z.akzent.getHexString());
  }
  // Flach: Spalten nach den belegten Plätzen (Mitte doppelt so breit)
  const belegt = ["links", "mitte", "rechts"].filter((p) => raum.schirme[p]);
  buehne.style.gridTemplateColumns = R.flach ? belegt.map((p) => (p === "mitte" ? "minmax(0, 2fr)" : "minmax(0, 1fr)")).join(" ") : "";
  for (const [platz, s] of Object.entries(R.schirme)) {
    const def = raum.schirme[platz];
    s.el.hidden = !def;
    if (R.gebaut) R.glow[platz].visible = !!def;
    // Bisherigen Inhalt an den Anbieter zurückgeben (der Cockpit-Code legt seine Panels wieder ab)
    for (const kind of [...s.inhalt.children]) R.inhalt?.zurueck?.(kind);
    s.inhalt.replaceChildren();
    if (!def) continue;
    s.el.style.width = `${def.b}px`; s.el.style.height = `${def.h}px`;
    s.el.style.setProperty("--akzent", "#" + z.akzent.getHexString());
    s.titel.textContent = def.titel;
    const inhalt = R.inhalt?.holen?.(z.id, raum.id, platz);
    if (inhalt) s.inhalt.append(...[].concat(inhalt));
    if (!R.gebaut) continue;
    R.glow[platz].scale.set(def.b * SKALA + 0.5, def.h * SKALA + 0.5, 1);
    R.glow[platz].material.color.copy(z.akzent).multiplyScalar(1.2);
  }
  if (R.gebaut) {
    const st = stationenFuer(raum);
    R.schar.stationenSetzen(st, Math.min(6, st.length));
  }
  fokusAus(true);
  hud.querySelector(".raum-ort").textContent = `${z.emoji} ${z.name} › ${raum.name}`;
  hud.querySelector(".raum-tabs").innerHTML = raeume.map((r, i) => `<button data-raum="${i}" class="${i === R.raum ? "aktiv" : ""}">${r.name}</button>`).join("");
  hud.querySelectorAll(".raum-pfeil").forEach((b) => (b.hidden = raeume.length < 2));
  hud.style.setProperty("--akzent", "#" + z.akzent.getHexString());
}

/** Gebäude betreten (nach dem Anflug aus der Stadt); flach = ohne 3D, Bildschirme nebeneinander */
export function raumOeffnen(z, raumIndex = 0, { flach = false } = {}) {
  // Wechsel zwischen 3D und flach (z. B. Qualität umgestellt): Inhalte erst zurückgeben
  if (R.zentrale) for (const s of Object.values(R.schirme)) { for (const kind of [...s.inhalt.children]) R.inhalt?.zurueck?.(kind); s.inhalt.replaceChildren(); }
  R.flach = flach;
  if (!flach && !R.gebaut) raumBauen();
  if (!ebene) ebeneBauen();
  ebene.classList.toggle("flach", flach);
  R.zentrale = z;
  R.raum = clamp(raumIndex, 0, (RAEUME[z.id]?.length || 1) - 1);
  raumEinrichten();
  if (!flach) {
    kamera.position.set(0, 3, TIEFE + 6);
    R.istZiel.set(0, 3, 0);
  }
  ebene.hidden = false;
  hud.hidden = false;
  document.body.classList.add("im-raum");
  blendeKurz();
  globalThis.Ton?.whoosh?.();
  document.dispatchEvent(new CustomEvent("stadt:raum", { detail: raumZustand() }));
}

export function raumWechseln(i) {
  const raeume = RAEUME[R.zentrale?.id] || [];
  if (!raeume.length) return;
  const neu = (i + raeume.length) % raeume.length;
  if (neu === R.raum) return;
  blendeKurz(() => { R.raum = neu; raumEinrichten(); if (!R.flach) kamera.position.set(0, 7.2, 30); document.dispatchEvent(new CustomEvent("stadt:raum", { detail: raumZustand() })); });
  globalThis.Ton?.klick?.();
}

function blendeKurz(mitte) {
  blende.classList.remove("an"); void blende.offsetWidth; blende.classList.add("an");
  if (mitte) setTimeout(mitte, 160);
}

export function fokus(platz) {
  const s = R.schirme[platz];
  if (!s || s.el.hidden || R.flach) return;
  R.fokus = platz;
  for (const [p, x] of Object.entries(R.schirme)) x.el.classList.toggle("fokus", p === platz);
  const b = parseFloat(s.el.style.width), h = parseFloat(s.el.style.height);
  const fovPx = kamera.projectionMatrix.elements[5] * innerHeight / 2;
  const platzRechts = document.body.classList.contains("claude-offen") ? 380 : 0;
  const massstab = Math.min(1.3, ((innerWidth - platzRechts) * 0.9) / b, (innerHeight * 0.8) / h);
  const abstand = (fovPx * SKALA) / massstab;
  const p = PLAETZE[platz];
  const normale = new THREE.Vector3(Math.sin(p.dreh), 0, Math.cos(p.dreh));
  R.sollZiel.copy(p.pos);
  R.sollPos.copy(p.pos).addScaledVector(normale, abstand);
  globalThis.Ton?.klick?.();
}

export function fokusAus(sofort = false) {
  R.fokus = null;
  for (const x of Object.values(R.schirme)) x.el.classList.remove("fokus");
  R.sollPos.set(0, 8.6, 27);
  R.sollZiel.set(0, 5.8, 0);
  if (sofort) return;
}

export function verlassen() {
  if (!R.zentrale) return;
  const z = R.zentrale;
  for (const s of Object.values(R.schirme)) { for (const kind of [...s.inhalt.children]) R.inhalt?.zurueck?.(kind); s.inhalt.replaceChildren(); }
  ebene.hidden = true;
  hud.hidden = true;
  document.body.classList.remove("im-raum");
  R.zentrale = null;
  R.beiVerlassen?.(z);
  globalThis.Ton?.whoosh?.();
  document.dispatchEvent(new CustomEvent("stadt:raum", { detail: raumZustand() }));
}

export const imRaum = () => !!R.zentrale;
export const raumZustand = () => ({ zentrale: R.zentrale?.id || null, raum: R.zentrale ? RAEUME[R.zentrale.id][R.raum].id : null, raumIndex: R.raum, fokus: R.fokus, flach: R.flach });
/** Inhalte der Bildschirme liefert das Cockpit: holen(zentrale, raum, platz) → Element(e), zurueck(element) */
export function inhaltAnbieter(a) { R.inhalt = a; }
export function beimVerlassen(f) { R.beiVerlassen = f; }

addEventListener("keydown", (e) => {
  if (!R.zentrale || e.target.closest?.("input, textarea, select, [contenteditable]")) return;
  if (e.key === "Escape" && !document.querySelector("dialog[open]")) { e.preventDefault(); if (R.fokus) fokusAus(); else verlassen(); }
  else if (e.key === "ArrowLeft" && !R.fokus) raumWechseln(R.raum - 1);
  else if (e.key === "ArrowRight" && !R.fokus) raumWechseln(R.raum + 1);
});
addEventListener("pointermove", (e) => { R.maus.x = (e.clientX / innerWidth) * 2 - 1; R.maus.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

// ───────────────────────── Bild ─────────────────────────
const hilf = new THREE.Vector3();
export const RAUM_BILD = {
  bewegen(dt, zeit) {
    const aktiv = !!R.zentrale && globalThis.STADT?.zentraleAktiv?.(R.zentrale.id);
    R.schar.bewegen(dt, zeit, aktiv);
    R.tasten.color.copy(R.akzent).multiplyScalar(1.1 + (aktiv ? 0.5 + Math.sin(zeit * 10) * 0.3 : Math.sin(zeit * 2) * 0.1));
    // Kamera: im Überblick leicht der Maus folgend, im Fokus ruhig
    hilf.copy(R.sollPos);
    if (!R.fokus) { hilf.x += R.maus.x * 1.4; hilf.y -= R.maus.y * 0.6; }
    const k = 1 - Math.exp(-dt * (R.fokus ? 5 : 2.4));
    kamera.position.lerp(hilf, k);
    R.istZiel.lerp(R.sollZiel, k);
    kamera.lookAt(R.istZiel);
  },
  zeichnen(composer, renderer, renderPass, bloom) {
    if (kamera.aspect !== innerWidth / innerHeight) { kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); }
    kamera.updateMatrixWorld();
    if (composer) {
      renderPass.scene = innen; renderPass.camera = kamera;
      bloom.strength = 0.55; bloom.threshold = 0.6;
      composer.render();
    } else renderer.render(innen, kamera);
    cssZeichnen();
  },
};
