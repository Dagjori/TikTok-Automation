// Designstil 14 „Glas-Labor“ in Three.js (.claude/skills/simulierbar-video/stile.md): Fotostudio mit Hohlkehle, Messzylinder aus dünnem
// Laborglas (MeshPhysicalMaterial mit transmission), Flüssigkeit als Live-Zähler, Zulauf aus Chromrohren mit Strahl,
// Ablaufhahn, Becherglas mit Schichten. Alles prozedural, keine fremden Assets. Alle Zustände nur aus t (deterministisch).
//
//   const studio = baueStudio(szene, renderer, { farbe: "#E9E6F0" });
//   const zyl = new Messzylinder({ x: -1.5, farbe: "#3D8BFF", max: 200, teilung: 10, beschriftung: 50 });  szene.add(zyl.gruppe);
//   zyl.setze({ wert: 120, strahl: {an, aus} oder null, t })      // Füllstand in Einheiten (z. B. Euro)
//   const zulauf = new Zulauf({ x: -1.5, hoehe: 6.2, von: [3, 9] }); zulauf.strahl(t, {start, stopp, bisY, farbe})
//   const becher = new Becherglas({ x: -4, schichten: [{id, farbe}] }); becher.setze({ rv: 18.6, … })
import * as THREE from "three";
import { umgebung } from "./licht.js";
import { clamp, lerp, hash, ease } from "./bewegung.js";

const G = 98; // Fallbeschleunigung in Welteinheiten/s² (1 Einheit ≈ 10 cm)

/** Text auf eine Canvas-Textur (für Skalenbeschriftung) */
function textTextur(text, { b = 256, h = 128, farbe = "#2A2F45", gewicht = 800, groesse = 0.62, ausrichtung = "left" } = {}) {
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  const g = c.getContext("2d");
  g.clearRect(0, 0, b, h);
  g.fillStyle = farbe;
  g.font = `${gewicht} ${Math.round(h * groesse)}px "SB Display", Inter, sans-serif`;
  g.textAlign = ausrichtung;
  g.textBaseline = "middle";
  g.fillText(text, ausrichtung === "left" ? 4 : ausrichtung === "right" ? b - 4 : b / 2, h * 0.54);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Studio-Hohlkehle (Boden geht in einer Kurve in die Rückwand über), weiches Licht, Umgebung für Glas und Chrom */
export function baueStudio(szene, renderer, { farbe = "#E7E4EE", boden = "#ECEAF2", radius = 7, breite = 80, tiefe = 26, hoehe = 30, schatten = 2048, umgebungsStaerke = 1.0 } = {}) {
  szene.environment = umgebung(renderer);
  szene.environmentIntensity = umgebungsStaerke;
  // Profil (z, y): vorn am Boden → Kurve → Wand hoch
  const profil = [];
  const n = 28;
  profil.push([tiefe, 0]);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 0.5;
    profil.push([-Math.sin(a) * radius, radius - Math.cos(a) * radius]);
  }
  profil.push([-radius, hoehe]);
  const pos = [], idx = [], uv = [];
  profil.forEach(([z, y], i) => {
    for (const x of [-breite / 2, breite / 2]) {
      pos.push(x, y, z - 6);
      uv.push(x > 0 ? 1 : 0, i / (profil.length - 1));
    }
  });
  for (let i = 0; i < profil.length - 1; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // Farbverlauf: Boden heller, Wand nach oben leicht kühler
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 256;
  const g = c.getContext("2d");
  const lin = g.createLinearGradient(0, 256, 0, 0);
  lin.addColorStop(0, boden);
  lin.addColorStop(0.35, farbe);
  lin.addColorStop(1, new THREE.Color(farbe).offsetHSL(0.01, -0.02, -0.06).getStyle());
  g.fillStyle = lin;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const kehle = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0, envMapIntensity: 0.35 }));
  kehle.receiveShadow = true;
  szene.add(kehle);
  szene.background = new THREE.Color(farbe);
  // Licht: große Softbox von oben vorn (Schatten), Gegenlicht für Glaskanten, Aufheller
  const key = new THREE.DirectionalLight("#FFFFFF", 2.2);
  key.position.set(-4, 14, 9);
  key.target.position.set(0, 0, 0);
  key.castShadow = schatten > 0;
  if (schatten > 0) {
    key.shadow.mapSize.set(schatten, schatten);
    const sc = key.shadow.camera;
    sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 2; sc.far = 40;
    key.shadow.radius = 10;
    key.shadow.blurSamples = 16;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
  }
  const rim = new THREE.DirectionalLight("#DDE6FF", 1.1);
  rim.position.set(6, 6, -8);
  const fill = new THREE.HemisphereLight("#FFFFFF", "#D9D2E6", 0.55);
  szene.add(key, key.target, rim, fill);
  return { kehle, key, rim, fill };
}

/** Kanten-Fresnel (dunkle bzw. helle Glaskanten auf hellem Grund), additiv über dem Glas */
function kantenMaterial(farbe = "#3A4060", staerke = 0.55, potenz = 2.6) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { farbe: { value: new THREE.Color(farbe) }, staerke: { value: staerke }, potenz: { value: potenz } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 farbe; uniform float staerke; uniform float potenz;
      varying vec3 vN; varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), potenz);
        gl_FragColor = vec4(farbe, clamp(f * staerke, 0.0, 1.0));
      }`,
  });
}

export function glasMaterial({ dicke = 0.06, rauheit = 0.04, farbe = "#FFFFFF" } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: farbe, metalness: 0, roughness: rauheit, transmission: 1, thickness: dicke, ior: 1.47,
    specularIntensity: 1, envMapIntensity: 1.25, attenuationColor: new THREE.Color("#DCE6F5"), attenuationDistance: 2.5,
  });
}

function fluessigMaterial(farbe) {
  const c = new THREE.Color(farbe);
  return new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.22, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.12, envMapIntensity: 0.55,
    emissive: c.clone().multiplyScalar(0.14),
  });
}

/**
 * Messzylinder mit Skala. Füllstand in Einheiten (0 … max). Lokaler Ursprung = Bodenmitte (Fuß auf y = 0).
 * opt: {x, z, radius, hoehe, max, teilung, beschriftung, farbe (Flüssigkeit), einheit, skalaSeite: 1|-1}
 */
export class Messzylinder {
  constructor({ x = 0, z = 0, radius = 0.62, hoehe = 4.7, max = 200, teilung = 10, beschriftung = 50, farbe = "#3D8BFF", fluessigKante = null, fuellHoehe = 3.75, wand = 0.035, skalaFarbe = "#2A2F45", skalaSeite = -1, blasen = 26, seed = 1 } = {}) {
    this.gruppe = new THREE.Group();
    this.gruppe.position.set(x, 0, z);
    this.R = radius;
    this.Ri = radius - wand;
    this.max = max;
    this.fuellHoehe = fuellHoehe;
    this.seed = seed;
    const fuss = 0.2, bodenDicke = 0.12;
    this.y0 = fuss + bodenDicke; // Boden innen
    this.hoehe = hoehe;
    // Fuß: Sechseck aus weißem Kunststoff
    const fussM = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.55, radius * 1.62, fuss, 6, 1), new THREE.MeshPhysicalMaterial({ color: "#F7F7FA", roughness: 0.32, clearcoat: 0.4, envMapIntensity: 0.6 }));
    fussM.position.y = fuss / 2;
    fussM.rotation.y = Math.PI / 6;
    fussM.castShadow = true;
    fussM.receiveShadow = true;
    this.gruppe.add(fussM);
    // Glas: außen (Vorderseiten) und innen (Rückseiten), Boden, Rand
    const glas = glasMaterial();
    this.glas = glas;
    const aussen = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, hoehe, 72, 1, true), glas);
    aussen.position.y = fuss + hoehe / 2;
    const innen = new THREE.Mesh(new THREE.CylinderGeometry(this.Ri, this.Ri, hoehe - bodenDicke, 72, 1, true), glasMaterial());
    innen.material.side = THREE.BackSide;
    innen.position.y = this.y0 + (hoehe - bodenDicke) / 2;
    const boden = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, bodenDicke, 72), glas);
    boden.position.y = fuss + bodenDicke / 2;
    const rand = new THREE.Mesh(new THREE.TorusGeometry(radius - wand / 2, wand * 0.62, 10, 72), glas);
    rand.rotation.x = Math.PI / 2;
    rand.position.y = fuss + hoehe;
    // Ausguss vorn links
    const ausguss = new THREE.Mesh(new THREE.TorusGeometry(0.12, wand * 0.6, 8, 20, Math.PI), glas);
    ausguss.position.set(-radius * 0.72, fuss + hoehe + 0.02, radius * 0.72);
    ausguss.rotation.set(Math.PI / 2, 0, Math.PI * 0.75);
    this.gruppe.add(aussen, innen, boden, rand, ausguss);
    // Kanten (Fresnel), leicht größer, damit das Glas auf hellem Grund Kontur bekommt
    const kante = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.002, radius * 1.002, hoehe, 72, 1, true), kantenMaterial("#1C2040", 1.5, 1.6));
    kante.position.y = aussen.position.y;
    kante.renderOrder = 5;
    this.gruppe.add(kante);
    // Glanzstreifen (Softbox-Spiegelung) als schmale helle Fläche vorn links
    const glanz = new THREE.Mesh(new THREE.PlaneGeometry(0.07, hoehe * 0.86), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.55, depthWrite: false }));
    glanz.position.set(-radius * 0.55, fuss + hoehe * 0.52, radius * 0.84);
    glanz.rotation.y = -0.6;
    glanz.renderOrder = 6;
    const glanz2 = glanz.clone();
    glanz2.material = glanz.material.clone();
    glanz2.material.opacity = 0.3;
    glanz2.scale.x = 0.45;
    glanz2.position.x = -radius * 0.38;
    glanz2.position.z = radius * 0.93;
    this.gruppe.add(glanz, glanz2);
    // Skala: Striche je `teilung`, lange Striche mit Zahl je `beschriftung`
    const skala = new THREE.Group();
    const strichM = new THREE.MeshBasicMaterial({ color: skalaFarbe, transparent: true, opacity: 0.88, depthWrite: false });
    for (let v = teilung; v <= max + 1e-9; v += teilung) {
      const lang = Math.abs(v / beschriftung - Math.round(v / beschriftung)) < 1e-6;
      const w = lang ? 0.36 : 0.18;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, lang ? 0.032 : 0.022), strichM);
      const y = this.y0 + (v / max) * fuellHoehe;
      const xx = skalaSeite * (radius * 0.12) + (lang ? 0 : skalaSeite * -0.09);
      s.position.set(xx, y, radius + 0.006);
      skala.add(s);
      if (lang) {
        const t = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: textTextur(String(v), { farbe: skalaFarbe }), transparent: true, depthWrite: false }));
        t.position.set(xx + skalaSeite * -0.47, y + 0.005, radius + 0.004);
        skala.add(t);
      }
    }
    skala.renderOrder = 7;
    skala.children.forEach((m) => (m.renderOrder = 7));
    this.gruppe.add(skala);
    // Flüssigkeit
    this.fmat = fluessigMaterial(farbe);
    this.koerper = new THREE.Mesh(new THREE.CylinderGeometry(this.Ri - 0.004, this.Ri - 0.004, 1, 72, 1, true), this.fmat);
    this.koerper.castShadow = false;
    this.oben = new THREE.Mesh(new THREE.CircleGeometry(this.Ri - 0.004, 72), fluessigMaterial(new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.28)));
    this.oben.rotation.x = -Math.PI / 2;
    this.meniskus = new THREE.Mesh(new THREE.TorusGeometry(this.Ri - 0.02, 0.022, 8, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.6) }));
    this.meniskus.rotation.x = Math.PI / 2;
    this.bodenF = new THREE.Mesh(new THREE.CircleGeometry(this.Ri - 0.004, 72), this.fmat);
    this.bodenF.rotation.x = Math.PI / 2;
    this.bodenF.position.y = this.y0 + 0.002;
    this.huelle = new THREE.Mesh(new THREE.CylinderGeometry(this.Ri - 0.002, this.Ri - 0.002, 1, 72, 1, true), kantenMaterial(fluessigKante || new THREE.Color(farbe).multiplyScalar(0.35).getStyle(), 1.1, 1.35));
    this.huelle.renderOrder = 3;
    this.gruppe.add(this.koerper, this.huelle, this.oben, this.meniskus, this.bodenF);
    // Blasen
    this.nBlasen = blasen;
    this.blasen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.05, transparent: true, opacity: 0.55, envMapIntensity: 1.5 }), blasen);
    this.blasen.frustumCulled = false;
    this.gruppe.add(this.blasen);
    this._m = new THREE.Matrix4();
    this.setze({ wert: 0, t: 0 });
  }
  /** Weltposition (y) eines Wertes */
  yVon(wert) {
    return this.y0 + (clamp(wert / this.max, 0, 1.08)) * this.fuellHoehe;
  }
  /** Punkt auf der Skala (Welt) für HUD-Anker */
  punkt(wert, { seite = 1, abstand = 0 } = {}) {
    const p = new THREE.Vector3(seite * (this.R + abstand), this.yVon(wert), 0);
    return this.gruppe.localToWorld(p);
  }
  /** Füllstand setzen. aktiv: 0..1 (Bewegung: Wellen, Blasen); t: Zeit für Blasen und Wellen */
  setze({ wert = 0, aktiv = 0, t = 0 }) {
    const h = Math.max(0.0005, clamp(wert / this.max, 0, 1.08) * this.fuellHoehe);
    const sichtbar = wert > 0.05;
    this.koerper.visible = this.oben.visible = this.meniskus.visible = this.bodenF.visible = this.huelle.visible = sichtbar;
    this.koerper.scale.y = h;
    this.koerper.position.y = this.y0 + h / 2;
    this.huelle.scale.y = h;
    this.huelle.position.y = this.y0 + h / 2;
    const welle = aktiv * 0.02 * Math.sin(t * 17.0 + this.seed);
    this.oben.position.y = this.y0 + h + 0.001;
    this.oben.rotation.set(-Math.PI / 2 + welle, 0, welle * 0.6);
    this.meniskus.position.y = this.y0 + h - 0.005;
    // Blasen steigen, solange Bewegung im Glas ist (aktiv), und im Rest leise vereinzelt
    let k = 0;
    for (let i = 0; i < this.nBlasen; i++) {
      const tempo = 0.55 + hash(i, this.seed * 7 + 1) * 0.6;
      const phase = hash(i, this.seed * 7 + 2);
      const p = (t * tempo / Math.max(0.4, h) + phase) % 1;
      const r = (0.18 + 0.75 * hash(i, this.seed * 7 + 3)) * (this.Ri - 0.08);
      const a = hash(i, this.seed * 7 + 4) * Math.PI * 2 + Math.sin(t * 2 + i) * 0.2;
      const zeig = sichtbar && (hash(i, this.seed * 7 + 5) < 0.18 + 0.82 * aktiv);
      const groesse = (0.018 + 0.03 * hash(i, this.seed * 7 + 6)) * (zeig ? 1 : 0) * clamp(h / 0.3);
      this._m.makeScale(groesse, groesse, groesse);
      this._m.setPosition(Math.cos(a) * r, this.y0 + 0.03 + p * Math.max(0, h - 0.06), Math.sin(a) * r);
      this.blasen.setMatrixAt(k++, this._m);
    }
    this.blasen.instanceMatrix.needsUpdate = true;
  }
}

/** Becherglas mit gestapelten Schichten (z. B. Abzüge). schichten: [{id, farbe}], proEinheit: Höhe je Einheit (Welt) */
export class Becherglas {
  constructor({ x = 0, z = 0, radius = 0.9, hoehe = 2.7, schichten = [], proEinheit = 0.022, seed = 3 } = {}) {
    this.gruppe = new THREE.Group();
    this.gruppe.position.set(x, 0, z);
    this.R = radius;
    this.Ri = radius - 0.035;
    this.y0 = 0.1;
    this.proEinheit = proEinheit;
    const glas = glasMaterial();
    const aussen = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.97, hoehe, 72, 1, true), glas);
    aussen.position.y = hoehe / 2;
    const innen = new THREE.Mesh(new THREE.CylinderGeometry(this.Ri, this.Ri * 0.97, hoehe - 0.1, 72, 1, true), glasMaterial());
    innen.material.side = THREE.BackSide;
    innen.position.y = 0.1 + (hoehe - 0.1) / 2;
    const boden = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.97, radius * 0.97, 0.1, 72), glas);
    boden.position.y = 0.05;
    const rand = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.03, 10, 72), glas);
    rand.rotation.x = Math.PI / 2;
    rand.position.y = hoehe;
    const kante = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.003, radius * 0.973, hoehe, 72, 1, true), kantenMaterial("#262B48", 1.0, 1.9));
    kante.position.y = hoehe / 2;
    kante.renderOrder = 5;
    this.gruppe.add(aussen, innen, boden, rand, kante);
    // Kontaktschatten (weich, unter dem Glas)
    this.schichten = schichten.map((s, i) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(this.Ri - 0.005, this.Ri - 0.005, 1, 72), fluessigMaterial(s.farbe));
      m.visible = false;
      const linie = new THREE.Mesh(new THREE.TorusGeometry(this.Ri - 0.008, 0.01, 6, 72), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.85 }));
      linie.rotation.x = Math.PI / 2;
      linie.visible = false;
      this.gruppe.add(m, linie);
      return { ...s, m, linie, i };
    });
  }
  /** werte: {id: Menge}; liefert die Oberkante je Schicht (Welt-y) */
  setze(werte = {}) {
    let y = this.y0;
    const kanten = {};
    for (const s of this.schichten) {
      const h = Math.max(0, (werte[s.id] || 0) * this.proEinheit);
      s.m.visible = h > 0.002;
      s.linie.visible = h > 0.002;
      s.m.scale.y = Math.max(0.0005, h);
      s.m.position.y = y + h / 2;
      s.linie.position.y = y + h;
      kanten[s.id] = { unten: y, oben: y + h, mitte: y + h / 2 };
      y += h;
    }
    this.oberkante = y;
    return kanten;
  }
  punkt(y, { seite = -1, abstand = 0 } = {}) {
    return this.gruppe.localToWorld(new THREE.Vector3(seite * (this.R + abstand), y, 0));
  }
}

/** Chromrohr entlang Punkten (Zulauf, Ablauf); liefert die Gruppe und die Auslaufspitze */
export function rohr(punkte, { radius = 0.085, farbe = "#E9ECF2", segmente = 80 } = {}) {
  const kurve = new THREE.CatmullRomCurve3(punkte.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.2);
  const mat = new THREE.MeshStandardMaterial({ color: farbe, metalness: 1, roughness: 0.16, envMapIntensity: 1.4 });
  const m = new THREE.Mesh(new THREE.TubeGeometry(kurve, segmente, radius, 20, false), mat);
  m.castShadow = true;
  const g = new THREE.Group();
  g.add(m);
  // Auslauf-Ring
  const ende = punkte[punkte.length - 1];
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.35, radius * 1.2, 0.14, 24), mat);
  ring.position.set(ende[0], ende[1] + 0.05, ende[2]);
  g.add(ring);
  return { gruppe: g, spitze: new THREE.Vector3(...ende), material: mat };
}

/**
 * Strahl aus einer Auslaufspitze bis zu einer Oberfläche. Front fällt beim Start, Ende fällt nach dem Stopp (Schwerkraft).
 * strahl.setze(t, {start, stopp, bisY}) – start/stopp in Sekunden (stopp = Infinity: läuft weiter)
 */
export class Strahl {
  constructor({ farbe = "#3D8BFF", radius = 0.055, tropfen = 10, seed = 5 } = {}) {
    this.gruppe = new THREE.Group();
    this.mat = fluessigMaterial(farbe);
    this.mat.emissive = new THREE.Color(farbe).multiplyScalar(0.25);
    this.m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.82, 1, 20, 1, true), this.mat);
    this.gruppe.add(this.m);
    this.r = radius;
    this.seed = seed;
    this.n = tropfen;
    this.tropfen = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), this.mat, tropfen);
    this.tropfen.frustumCulled = false;
    this.gruppe.add(this.tropfen);
    this._m = new THREE.Matrix4();
  }
  farbe(f) {
    const c = new THREE.Color(f);
    this.mat.color.copy(c);
    this.mat.emissive.copy(c).multiplyScalar(0.25);
  }
  /** spitze: THREE.Vector3; liefert true, wenn der Strahl die Oberfläche erreicht (fließt) */
  setze(t, spitze, { start = Infinity, stopp = Infinity, bisY = 0 }) {
    const fall = (d) => 0.5 * G * d * d;
    let oben = spitze.y, unten = spitze.y;
    if (t >= start) unten = Math.max(bisY, spitze.y - fall(t - start));
    if (t >= stopp) oben = Math.max(bisY, spitze.y - fall(t - stopp));
    const laenge = oben - unten;
    const an = laenge > 0.01;
    this.m.visible = an;
    if (an) {
      this.m.scale.set(1 + 0.08 * Math.sin(t * 40 + this.seed), laenge, 1);
      this.m.position.set(spitze.x, unten + laenge / 2, spitze.z);
    }
    // Spritzer an der Oberfläche, solange der Strahl auftrifft
    const trifft = an && unten <= bisY + 1e-4;
    for (let i = 0; i < this.n; i++) {
      const p = (t * (2.2 + hash(i, this.seed) * 1.5) + hash(i, this.seed + 1)) % 1;
      const a = hash(i, this.seed + 2) * Math.PI * 2;
      const r = this.r * (1.2 + 3.2 * p);
      const s = trifft ? this.r * 0.45 * (1 - p) : 0;
      this._m.makeScale(s, s, s);
      this._m.setPosition(spitze.x + Math.cos(a) * r, bisY + 0.02 + Math.sin(p * Math.PI) * 0.22 * (0.5 + hash(i, this.seed + 3)), spitze.z + Math.sin(a) * r);
      this.tropfen.setMatrixAt(i, this._m);
    }
    this.tropfen.instanceMatrix.needsUpdate = true;
    return trifft;
  }
}

/** Weicher Kontaktschatten (Textur) unter einem Objekt */
export function kontaktFleck(radius = 1, staerke = 0.35) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, `rgba(40,30,70,${staerke})`);
  rg.addColorStop(0.55, `rgba(40,30,70,${staerke * 0.45})`);
  rg.addColorStop(1, "rgba(40,30,70,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.renderOrder = 1;
  return m;
}

export { ease, lerp };
