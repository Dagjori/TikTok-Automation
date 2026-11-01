// Account 2, Video 1: „Stell dir vor, Schall hat fünf Sekunden lang nur noch Schritttempo.“
// Stil 16 „POV-Filmlook stilisiert“: Ich-Kamera auf Augenhöhe am S-Bahn-Steig, blaue Stunde, Bloom, sichtbare Schallwellen.
// Rechnung: ../../sim/schall_schritttempo.mjs (Tests: node --test sim/schall_schritttempo.test.mjs).
// Deterministisch: window.renderAt(t). Kein Logo, kein Kanalname, keine Rubrik im Bild.
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash, keyframes } from "../../engine/bewegung.js";
import { mat } from "../../engine/bausteine.js";
import * as S from "../../sim/schall_schritttempo.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 1024;
const BLOOM = Q.has("bloom") ? +Q.get("bloom") : 0.85;
const SKALA = Q.has("skala") ? +Q.get("skala") : 1; // interne 3D-Auflösung (HUD bleibt scharf)
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich): S-Bahn = Koralle, Schall = Türkis. Kein Gelb (Gelb = aktuelles Untertitel-Wort).
const KORALLE = "#FF4F5A";
const TUERKIS = "#2EC4B6";
const ABGELAUFEN = "#3B3F55";

// Geometrie (Meter). Gleis entlang x, Gleismitte z = 0, Bahnsteigoberkante y = 0. Du stehst bei (0, 0, duZ).
const AUGE = V(0, 1.65, S.SZ.duZ);
const MUND = (() => { // Freundin: 2,0 m entfernt, vorn rechts
  const d = V(1.75, -0.15, 0.97).normalize().multiplyScalar(S.SZ.freundin);
  return AUGE.clone().add(d);
})();
const LAUTSPRECHER = AUGE.clone().add(V(6.4, 1.8, 4.45).normalize().multiplyScalar(S.SZ.lautsprecher));
const NASE_Y = 1.7;

// =====================================================================================
// Bausteine der Welt
// =====================================================================================
function canvasTextur(b, h, malen) {
  const c = document.createElement("canvas");
  c.width = b; c.height = h;
  malen(c.getContext("2d"), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function textSprite(text, { farbe = "#FFFFFF", kontur = "#0B1020", hoehe = 0.5, schrift = 900, b = 1024, h = 256 } = {}) {
  const tex = canvasTextur(b, h, (g) => {
    g.font = `${schrift} ${Math.round(h * 0.62)}px "SB Display", Inter, sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.lineJoin = "round"; g.lineWidth = h * 0.11; g.strokeStyle = kontur;
    g.strokeText(text, b / 2, h * 0.54);
    g.fillStyle = farbe; g.fillText(text, b / 2, h * 0.54);
  });
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const s = new THREE.Sprite(m);
  s.scale.set(hoehe * (b / h), hoehe, 1);
  s.renderOrder = 30;
  return s;
}

// Schallwelle: Kugelschale mit Fresnel-Rand (additiv, HDR für Bloom)
const WELLE_GEO = new THREE.SphereGeometry(1, 40, 24);
function welleMaterial(farbe) {
  return new THREE.ShaderMaterial({
    uniforms: { farbe: { value: new THREE.Color(farbe) }, deck: { value: 1 }, weiss: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform vec3 farbe; uniform float deck; uniform float weiss; varying vec3 vN; varying vec3 vW;
      void main(){ vec3 v = normalize(cameraPosition - vW); float f = 1.0 - abs(dot(normalize(vN), v));
        float rand = pow(f, 3.0); float kern = pow(f, 9.0);
        vec3 c = mix(farbe, vec3(1.0), weiss) * (0.35 + 2.4 * kern) ;
        gl_FragColor = vec4(c * (rand * 1.25 + 0.04) * deck, 1.0); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
  });
}

function figurBauen({ jacke = "#4E5D8C", hose = "#2A2F3D", haare = "#4A2E22", haut = "#E8B996", schal = null, groesse = 1.68 } = {}) {
  const g = new THREE.Group();
  const k = groesse / 1.68;
  const m = (f, r = 0.75) => mat(f, { rau: r });
  const bein = (x) => { const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.68, 4, 10), m(hose)); b.position.set(0, 0.43, x); b.castShadow = true; return b; };
  g.add(bein(-0.1), bein(0.1));
  const schuh = (x) => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.11), m("#1C1F27")); s.position.set(0.04, 0.04, x); return s; };
  g.add(schuh(-0.1), schuh(0.1));
  const rumpf = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), m(jacke, 0.85));
  rumpf.scale.set(0.78, 1, 1.05); rumpf.position.y = 1.06; rumpf.castShadow = true; g.add(rumpf);
  if (schal) { const s = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.05, 8, 16), m(schal, 0.9)); s.rotation.x = Math.PI / 2; s.position.y = 1.37; g.add(s); }
  const hals = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), m(haut, 0.6)); hals.position.y = 1.4; g.add(hals);
  const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), m(haut, 0.55)); kopf.scale.set(0.95, 1.08, 0.9); kopf.position.y = 1.53; kopf.castShadow = true; g.add(kopf);
  const haar = new THREE.Mesh(new THREE.SphereGeometry(0.125, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), m(haare, 0.9)); haar.position.set(-0.012, 1.55, 0); haar.rotation.z = 0.25; g.add(haar);
  const zopf = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.16, 4, 8), m(haare, 0.9)); zopf.position.set(-0.12, 1.45, 0); zopf.rotation.z = -0.4; g.add(zopf);
  const auge = (z) => { const a = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), mat("#1A1D26", { rau: 0.3 })); a.position.set(0.105, 1.55, z); return a; };
  g.add(auge(-0.04), auge(0.04));
  const braue = (z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.008, 0.035), mat(haare, { rau: 0.9 })); b.position.set(0.108, 1.585, z); return b; };
  g.add(braue(-0.042), braue(0.042));
  const nase = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 8), m(haut, 0.6)); nase.rotation.z = -Math.PI / 2; nase.position.set(0.122, 1.515, 0); g.add(nase);
  const ohr = (z) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), m(haut, 0.6)); o.scale.set(0.6, 1, 0.5); o.position.set(-0.005, 1.53, z); return o; };
  g.add(ohr(-0.105), ohr(0.105));
  const mund = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), mat("#5A1E24", { rau: 0.5 })); mund.position.set(0.108, 1.48, 0); mund.scale.set(0.4, 0.5, 1.2); g.add(mund);
  const arm = (seite) => {
    const p = new THREE.Group(); p.position.set(0, 1.3, seite * 0.23);
    const a = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.5, 4, 10), m(jacke, 0.85)); a.position.y = -0.28; a.castShadow = true; p.add(a);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), m(haut, 0.6)); hand.position.y = -0.58; p.add(hand);
    g.add(p); return p;
  };
  const armL = arm(-1), armR = arm(1);
  g.scale.setScalar(k);
  return { g, mund, armL, armR };
}

function baueWelt(buehne) {
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, "#0B1630"], [0.38, "#1E3463"], [0.58, "#55507E"], [0.7, "#C9786E"], [0.78, "#E99A7A"], [1, "#2A2B40"]]);
  szene.fog = new THREE.Fog("#3B3F66", 70, 260);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 22, schattenKarte: Math.max(512, SCHATTEN), sonnenRichtung: [0.8, 0.42, -0.55], sonnenFarbe: "#FFC09A", sonnenStaerke: SCHATTEN > 0 ? 1.6 : 1.4,
    himmel: "#8FA2D8", boden: "#5B4A55", himmelStaerke: 0.85, umgebungsStaerke: 0.42, schattenWeich: 3, ziel: [4, 0, 4] });
  licht.sonne.castShadow = SCHATTEN > 0;

  // --- Gleisbett, Schwellen, Schienen (zwei Gleise) ---
  const bett = new THREE.Mesh(new THREE.BoxGeometry(420, 0.4, 13), mat("#5E5852", { rau: 1 }));
  bett.position.set(30, -1.16, -2.4); bett.receiveShadow = true; szene.add(bett);
  const schwelleGeo = new THREE.BoxGeometry(0.26, 0.14, 2.6);
  const schwelleMat = mat("#6F6A64", { rau: 0.95 });
  for (const gz of [0, -4.6]) {
    const n = 640;
    const inst = new THREE.InstancedMesh(schwelleGeo, schwelleMat, n);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < n; i++) { m4.makeTranslation(-160 + i * 0.6, -0.92, gz); inst.setMatrixAt(i, m4); }
    inst.receiveShadow = true; szene.add(inst);
    for (const s of [-0.7175, 0.7175]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(400, 0.15, 0.07), mat("#C9CED8", { rau: 0.25, metall: 0.9 }));
      r.position.set(30, -0.78, gz + s); szene.add(r);
    }
  }
  // --- Bahnsteig ---
  const pflaster = canvasTextur(512, 512, (g, b, h) => {
    g.fillStyle = "#AEB3BC"; g.fillRect(0, 0, b, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${90 + (i * 37) % 60},${95 + (i * 53) % 60},${105 + (i * 29) % 60},0.10)`; g.fillRect((i * 97) % b, (i * 61) % h, 6, 6); }
    g.strokeStyle = "rgba(60,64,74,0.55)"; g.lineWidth = 4;
    for (let k = 0; k <= 4; k++) { g.beginPath(); g.moveTo(0, k * 128); g.lineTo(b, k * 128); g.stroke(); g.beginPath(); g.moveTo(k * 128, 0); g.lineTo(k * 128, h); g.stroke(); }
  });
  pflaster.wrapS = pflaster.wrapT = THREE.RepeatWrapping;
  pflaster.repeat.set(220 / 2, 10 / 2);
  const steig = new THREE.Mesh(new THREE.BoxGeometry(220, 0.96, 10), mat("#B4B9C2", { rau: 0.9 }));
  steig.material.map = pflaster;
  steig.position.set(0, -0.48, 1.65 + 5); steig.receiveShadow = true; szene.add(steig);
  const streifen = (z0, z1, farbe, opt = {}) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(220, 0.012, z1 - z0), mat(farbe, { rau: 0.6, ...opt }));
    s.position.set(0, 0.006, (z0 + z1) / 2); s.receiveShadow = true; szene.add(s); return s;
  };
  streifen(1.65, 1.98, "#DADDE3");
  streifen(2.38, 2.5, "#F4F6FA", { emissiv: "#F4F6FA", emissivStaerke: 0.08 }); // weiße Sicherheitslinie
  streifen(2.72, 3.02, "#C7CBD3"); // Blindenleitstreifen
  const kante = new THREE.Mesh(new THREE.BoxGeometry(220, 0.96, 0.08), mat("#8C9099", { rau: 0.8 }));
  kante.position.set(0, -0.48, 1.69); szene.add(kante);
  // --- Dach mit Lichtbändern, Stützen ---
  const dach = new THREE.Mesh(new THREE.BoxGeometry(110, 0.3, 7.6), mat("#3C4252", { rau: 0.7 }));
  dach.position.set(10, 4.1, 7.7); dach.castShadow = true; szene.add(dach);
  const dachKante = new THREE.Mesh(new THREE.BoxGeometry(110, 0.42, 0.12), mat("#E3E6EC", { rau: 0.5 }));
  dachKante.position.set(10, 4.0, 3.9); szene.add(dachKante);
  for (const lz of [5.2, 8.6]) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(108, 0.05, 0.22), new THREE.MeshBasicMaterial({ color: new THREE.Color("#E8F0FF").multiplyScalar(1.15) }));
    band.position.set(10, 3.93, lz); szene.add(band);
  }
  const stuetzeGeo = new THREE.CylinderGeometry(0.14, 0.14, 4.0, 14);
  const stuetzeMat = mat("#2F3544", { rau: 0.5, metall: 0.4 });
  for (let x = -42; x <= 62; x += 12) { const s = new THREE.Mesh(stuetzeGeo, stuetzeMat); s.position.set(x + 0.4, 2.0, 7.9); s.castShadow = true; szene.add(s); }
  // Lautsprecher an der Stütze (8 m von dir)
  const lsp = new THREE.Group();
  const trichter = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.32, 16, 1, true), mat("#D5D9E0", { rau: 0.4 }));
  trichter.rotation.z = Math.PI / 2; lsp.add(trichter);
  const lspHalter = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), mat("#2F3544"));
  lspHalter.position.set(0.18, 0.2, 0); lsp.add(lspHalter);
  lsp.position.copy(LAUTSPRECHER); lsp.rotation.y = Math.atan2(LAUTSPRECHER.z - AUGE.z, -(LAUTSPRECHER.x - AUGE.x)) ; szene.add(lsp);
  // Zugzielanzeiger (frei erfunden)
  const anzeigeTex = canvasTextur(1024, 192, (g, b, h) => {
    g.fillStyle = "#0B0F1A"; g.fillRect(0, 0, b, h);
    g.font = `800 ${h * 0.4}px "SB Display", Inter, sans-serif`; g.textBaseline = "middle";
    g.fillStyle = "#FFFFFF"; g.fillText("S 3", 40, h * 0.52);
    g.fillStyle = "#E8EEF9"; g.fillText("Lindenplatz", 190, h * 0.52);
    g.fillStyle = "#FF8C93"; g.textAlign = "right"; g.fillText("1 min", b - 40, h * 0.52);
  });
  const anzeige = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 0.12), [mat("#1A1F2B"), mat("#1A1F2B"), mat("#1A1F2B"), mat("#1A1F2B"),
    new THREE.MeshBasicMaterial({ map: anzeigeTex, color: new THREE.Color(1.6, 1.6, 1.6) }), mat("#1A1F2B")]);
  anzeige.position.set(11, 3.3, 5.6); anzeige.rotation.y = -Math.PI / 2 + 0.0; szene.add(anzeige);
  const anzHalter = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.05), mat("#2F3544")); anzHalter.position.set(11, 3.7, 5.6); szene.add(anzHalter);
  // Stationsschild (frei erfunden) und Bänke
  const schildTex = canvasTextur(1024, 256, (g, b, h) => {
    g.fillStyle = "#F4F6FA"; g.fillRect(0, 0, b, h);
    g.fillStyle = "#1D3B8B"; g.font = `800 ${h * 0.5}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("Lindenplatz", b / 2, h * 0.54);
  });
  const schild = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 2.8), [new THREE.MeshStandardMaterial({ map: schildTex, emissive: "#FFFFFF", emissiveMap: schildTex, emissiveIntensity: 0.25 }), mat("#2F3544"), mat("#2F3544"), mat("#2F3544"), mat("#2F3544"), mat("#2F3544")]);
  schild.position.set(-17.7, 2.6, 7.9); schild.rotation.y = 0; szene.add(schild);
  for (const bx of [-6, 18, 30]) {
    const bank = new THREE.Group();
    const sitz = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), mat("#7A5B44", { rau: 0.7 })); sitz.position.y = 0.46; bank.add(sitz);
    const lehne = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 0.05), mat("#7A5B44", { rau: 0.7 })); lehne.position.set(0, 0.72, 0.2); bank.add(lehne);
    for (const fx of [-0.75, 0.75]) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.4), mat("#2F3544")); f.position.set(fx, 0.23, 0); bank.add(f); }
    bank.position.set(bx, 0, 9.3); bank.traverse((o) => { if (o.isMesh) o.castShadow = true; }); szene.add(bank);
  }
  // Laternen hinter dem Dach (Lichtpunkte in der Tiefe)
  for (let x = 68; x < 200; x += 16) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5, 8), stuetzeMat); mast.position.set(x, 2.5, 6.5); szene.add(mast);
    const kopf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFE2C4").multiplyScalar(4) }));
    kopf.position.set(x - 0.3, 5.0, 6.2); szene.add(kopf);
  }
  // --- Gegenseite: Stützmauer, Büsche, Häuser mit Fenstern ---
  const mauer = new THREE.Mesh(new THREE.BoxGeometry(420, 3.4, 0.6), mat("#6B6460", { rau: 0.95 }));
  mauer.position.set(30, 0.5, -8.6); mauer.receiveShadow = true; szene.add(mauer);
  const buschMat = mat("#2F4A3A", { rau: 1 });
  for (let i = 0; i < 60; i++) {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), buschMat);
    b.scale.set(1.6 + hash(i, 3) * 1.6, 1 + hash(i, 4) * 0.9, 1.2);
    b.position.set(-120 + i * 5.5 + hash(i, 5) * 3, 2.4 + hash(i, 6) * 0.5, -10.2); szene.add(b);
  }
  const fensterTex = canvasTextur(256, 512, (g, b, h) => {
    g.fillStyle = "#2B2C3E"; g.fillRect(0, 0, b, h);
    for (let r = 0; r < 12; r++) for (let c = 0; c < 5; c++) {
      const an = hash(r * 7 + c, 11) > 0.55;
      g.fillStyle = an ? (hash(r + c * 3, 2) > 0.5 ? "#FFD9A8" : "#CFE0FF") : "#3A3C52";
      g.fillRect(14 + c * 48, 16 + r * 41, 28, 22);
    }
  });
  for (let i = 0; i < 26; i++) {
    const hh = 8 + hash(i, 21) * 16, bb = 8 + hash(i, 22) * 10;
    const t = fensterTex.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(bb / 12, hh / 14);
    const haus = new THREE.Mesh(new THREE.BoxGeometry(bb, hh, 8), new THREE.MeshStandardMaterial({ color: "#3A3B52", map: t, emissive: "#FFFFFF", emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.9 }));
    haus.position.set(-110 + i * 13 + hash(i, 23) * 4, hh / 2 - 1, -20 - hash(i, 24) * 14); szene.add(haus);
  }
  // Fernsehturm-artige Silhouette weit hinten (generisch)
  const turm = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 70, 10), mat("#2A2C42")); turm.position.set(150, 34, -120); szene.add(turm);
  const kugel = new THREE.Mesh(new THREE.SphereGeometry(5, 18, 12), mat("#33354E")); kugel.position.set(150, 58, -120); szene.add(kugel);
  const turmLicht = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FF4F5A").multiplyScalar(5) })); turmLicht.position.set(150, 71, -120); szene.add(turmLicht);

  // --- S-Bahn (eine Einheit, 68 m, Koralle/Lichtgrau) ---
  const zug = new THREE.Group();
  const L = S.SZ.bahnLaenge, B = S.SZ.bahnHalbbreite * 2;
  const unten = -0.56, oben = 2.84;
  const rot = mat(KORALLE, { rau: 0.38, metall: 0.15 });
  const grau = mat("#D8DCE4", { rau: 0.45 });
  const dunkel = mat("#1A2030", { rau: 0.25, metall: 0.2 });
  const fensterBandTex = canvasTextur(1024, 128, (g, b, h) => {
    g.fillStyle = "#151B28"; g.fillRect(0, 0, b, h);
    for (let i = 0; i < 8; i++) { g.fillStyle = "#3D4A63"; g.fillRect(i * 128 + 10, 12, 108, h - 24); g.fillStyle = "rgba(255,236,214,0.55)"; g.fillRect(i * 128 + 14, 16, 100, 22); }
  });
  fensterBandTex.wrapS = THREE.RepeatWrapping; fensterBandTex.repeat.set(L / 8, 1);
  const korpus = new THREE.Mesh(new THREE.BoxGeometry(L - 3, 1.95, B), rot); korpus.position.set(3 + (L - 3) / 2, unten + 0.975, 0); korpus.castShadow = true; zug.add(korpus);
  const band = new THREE.Mesh(new THREE.BoxGeometry(L - 3.2, 0.95, B + 0.02), new THREE.MeshStandardMaterial({ map: fensterBandTex, emissive: "#FFFFFF", emissiveMap: fensterBandTex, emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.2 }));
  band.position.set(3 + (L - 3) / 2, 1.88, 0); zug.add(band);
  const dachZ = new THREE.Mesh(new THREE.BoxGeometry(L - 3, 0.5, B - 0.1), grau); dachZ.position.set(3 + (L - 3) / 2, 2.6, 0); zug.add(dachZ);
  const zierlinie = new THREE.Mesh(new THREE.BoxGeometry(L - 3, 0.12, B + 0.03), grau); zierlinie.position.set(3 + (L - 3) / 2, 1.3, 0); zug.add(zierlinie);
  for (let i = 0; i < 6; i++) { // Türen
    const tx = 7 + i * 11;
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 0.04), grau); t.position.set(tx, 0.55, s * (B / 2 + 0.01)); zug.add(t);
      const tf = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.05), dunkel); tf.position.set(tx, 1.0, s * (B / 2 + 0.02)); zug.add(tf);
    }
  }
  // Kopf: abgeschrägte Front aus einem Profil (Seitenansicht), quer extrudiert
  const profil = new THREE.Shape();
  profil.moveTo(0, unten); profil.lineTo(0.05, 1.0); profil.quadraticCurveTo(0.35, 2.3, 1.6, oben); profil.lineTo(3.05, oben); profil.lineTo(3.05, unten); profil.lineTo(0, unten);
  const kopfGeo = new THREE.ExtrudeGeometry(profil, { depth: B, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, curveSegments: 10 });
  kopfGeo.translate(0, 0, -B / 2);
  const kopf = new THREE.Mesh(kopfGeo, rot); kopf.castShadow = true; zug.add(kopf);
  const scheibe = new THREE.Mesh(new THREE.PlaneGeometry(B - 0.45, 1.15), new THREE.MeshStandardMaterial({ color: "#121826", roughness: 0.08, metalness: 0.6, emissive: "#3A4466", emissiveIntensity: 0.25 }));
  scheibe.position.set(0.53, 2.16, 0); scheibe.rotation.set(0, -Math.PI / 2, 0); scheibe.rotateX(-0.70); zug.add(scheibe);
  const zielTex = canvasTextur(512, 96, (g, b, h) => { g.fillStyle = "#06080E"; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `800 ${h * 0.62}px "SB Display", Inter, sans-serif`; g.textBaseline = "middle"; g.textAlign = "center"; g.fillText("S 3  Lindenplatz", b / 2, h * 0.55); });
  const ziel = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.28), new THREE.MeshBasicMaterial({ map: zielTex, color: new THREE.Color(1.8, 1.8, 1.8) }));
  ziel.position.set(0.77, 2.46, 0); ziel.rotation.set(0, -Math.PI / 2, 0); ziel.rotateX(-0.70); zug.add(ziel);
  const scheinMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF4E6").multiplyScalar(9) });
  for (const s of [-1, 1]) { const sw = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), scheinMat); sw.position.set(-0.02, 0.5, s * 1.0); zug.add(sw); }
  const schuerze = new THREE.Mesh(new THREE.BoxGeometry(L, 0.42, B - 0.3), dunkel); schuerze.position.set(L / 2, -0.75, 0); zug.add(schuerze);
  // Scheinwerferkegel auf dem Gleis
  const kegel = new THREE.Mesh(new THREE.ConeGeometry(2.4, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color("#FFF1DE").multiplyScalar(0.16), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  kegel.rotation.z = -Math.PI / 2; kegel.position.set(-7, -0.1, 0); kegel.visible = false; zug.add(kegel);
  szene.add(zug);

  // --- Figuren: Freundin, „Du“ (nur in der Totalen), Wartende ---
  const freundin = figurBauen({ jacke: "#3E7A63", hose: "#2B2F3E", haare: "#5A3524", schal: "#E7E2DA", groesse: 1.68 });
  freundin.g.position.set(MUND.x - 0.03, 0, MUND.z + 0.02);
  freundin.g.rotation.y = Math.atan2(-(AUGE.z - MUND.z), AUGE.x - MUND.x);
  freundin.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  szene.add(freundin.g);
  const du = figurBauen({ jacke: "#2C3A5E", hose: "#22262F", haare: "#2A1E18", haut: "#D9A47E", groesse: 1.78 });
  du.g.position.set(AUGE.x, 0, AUGE.z); du.g.rotation.y = 0; du.g.visible = false; szene.add(du.g);
  const duRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.55, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(TUERKIS).multiplyScalar(2), transparent: true, opacity: 0.9, depthWrite: false }));
  duRing.rotation.x = -Math.PI / 2; duRing.position.set(AUGE.x, 0.02, AUGE.z); duRing.visible = false; szene.add(duRing);
  const duLabel = textSprite("DU", { farbe: TUERKIS, hoehe: 0.8 }); duLabel.position.set(AUGE.x, 2.6, AUGE.z); duLabel.visible = false; szene.add(duLabel);
  const jacken = ["#6C4F8A", "#8A4F4F", "#4F6A8A", "#5E6B4A", "#7A5E4A", "#4A4F6E"];
  for (let i = 0; i < 6; i++) {
    const f = figurBauen({ jacke: jacken[i], haare: hash(i, 9) > 0.5 ? "#2A1E18" : "#7A5A3A", groesse: 1.62 + hash(i, 8) * 0.22 });
    f.g.position.set(12 + i * 6.5 + hash(i, 7) * 3, 0, 4.4 + hash(i, 6) * 4);
    f.g.rotation.y = hash(i, 5) * 2 - 1 + Math.PI * (hash(i, 4) > 0.5 ? 0 : 1);
    f.armR.rotation.x = 0.1; szene.add(f.g);
  }
  // --- Fledermaus (zweite Überraschung) ---
  const fleder = new THREE.Group();
  const fMat = mat("#1B1E2A", { rau: 0.8 });
  const fKoerper = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), fMat); fKoerper.scale.set(1.6, 0.9, 0.9); fleder.add(fKoerper);
  const fluegelGeo = new THREE.BufferGeometry();
  fluegelGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, -0.12, 0, 0.5, 0.12, 0.02, 0.42, 0.18, 0, 0.12, 0, 0, 0, 0.12, 0.02, 0.42, -0.12, 0, 0.5, -0.2, -0.04, 0.34, 0, 0, 0], 3));
  fluegelGeo.computeVertexNormals();
  const fl = new THREE.Mesh(fluegelGeo, new THREE.MeshStandardMaterial({ color: "#232737", side: THREE.DoubleSide, roughness: 0.8, emissive: "#2EC4B6", emissiveIntensity: 0.35 }));
  const fr = fl.clone(); fr.scale.z = -1;
  const flG = new THREE.Group(); flG.add(fl); const frG = new THREE.Group(); frG.add(fr);
  fleder.add(flG, frG); fleder.visible = false; fleder.scale.setScalar(1.3); szene.add(fleder);

  // --- Schallwellen ---
  const wellen = [];
  const welle = (quelle, te, farbe) => { const m = new THREE.Mesh(WELLE_GEO, welleMaterial(farbe)); m.visible = false; m.renderOrder = 10; m.frustumCulled = false; szene.add(m); wellen.push({ m, quelle, te }); };
  for (let te = 0.1; te <= 0.42 + 1e-6; te += 0.08) welle("hey", te, TUERKIS);
  for (let te = 0; te <= 5 + 1e-6; te += 0.1) welle("bahn", te, TUERKIS);
  for (let te = 3.0; te <= 4.6 + 1e-6; te += 0.1) welle("durchsage", te, TUERKIS);
  const heyText = textSprite("HEY!", { farbe: "#FFFFFF", kontur: "#0B1020", hoehe: 0.28 });
  heyText.visible = false; szene.add(heyText);
  const durchsageText = textSprite("„ZURÜCKBLEIBEN, BITTE!“", { farbe: "#FFFFFF", hoehe: 0.34, b: 2048, h: 256 });
  durchsageText.visible = false; szene.add(durchsageText);

  return { szene, licht, zug, freundin, du, duRing, duLabel, fleder, flG, frG, wellen, heyText, durchsageText };
}

// =====================================================================================
// Countdown-HUD (5 Segmente): Koralle = verbleibend, #3B3F55 = abgelaufen
// =====================================================================================
class Countdown {
  constructor(M, wurzel, { tauFn, tauRoh, von, bis }) {
    this.M = M; this.tauFn = tauFn; this.tauRoh = tauRoh; this.von = von; this.bis = bis;
    this.e = el("div", "ms ms-countdown", `<div class="cd-reihe">${"<div class='cd-seg'><i></i></div>".repeat(5)}</div><div class="cd-zahl">5,0<small>s</small></div>`, wurzel);
    this.segs = [...this.e.querySelectorAll(".cd-seg")];
    this.balken = this.segs.map((s) => s.querySelector("i"));
    this.zahl = this.e.querySelector(".cd-zahl");
    this._letzt = null;
  }
  update(t) {
    const tau = clamp(this.tauFn(t), 0, 5);
    this.segs.forEach((s, i) => {
      const f = clamp(i + 1 - tau, 0, 1);
      this.balken[i].style.transform = `scaleX(${f.toFixed(4)})`;
      s.classList.toggle("aktiv", tau > i && tau < i + 1 && t > this.von);
    });
    const rest = Math.max(0, 5 - tau);
    const txt = rest.toFixed(1).replace(".", ",");
    if (txt !== this._letzt) { this.zahl.innerHTML = `${txt}<small>s</small>`; this._letzt = txt; }
    this.zahl.classList.toggle("null", rest <= 0.001);
    // kleiner Puls bei jedem Sekundenwechsel
    const ph = tau % 1, puls = tau > 0 && tau < 5 ? Math.exp(-ph * 9) * 0.06 : 0;
    this.e.style.transform = `scale(${(1 + puls).toFixed(4)})`;
  }
  ereignisse() {
    const ev = [];
    for (const [a, b] of this.M.laufIntervalle((t) => +clamp(this.tauRoh(t), 0, 5).toFixed(1), this.von, this.bis)) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    // Sekundenwechsel (Segment wird grau)
    for (let k = 1; k <= 5; k++) {
      let t = this.von; while (t < this.bis && this.tauRoh(t) < k - 1e-6) t += 1 / 60;
      if (t < this.bis) ev.push({ t, typ: "marke", klang: "tick", text: `Sekunde ${k} vorbei` });
    }
    return ev;
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { breite: Math.round(1080 * SKALA), hoehe: Math.round(1920 * SKALA), msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const W = baueWelt(buehne);

  // ---------- Zeitmarken ----------
  const tLos = T("Los"), tS1 = T("sek1:Sekunde"), tHey = T("sek1:Hey!"), tS2 = T("sek2:Sekunde"), tAn = T("sek2:an.");
  const tS3 = T("sek3:Sekunde"), tMach = T("Mach"), tS4 = T("sek4:Sekunde"), tDurch = T("Durchsage:"), tS5 = T("sek5:Sekunde");
  const tVorbei = T("vorbei."), tLautlos = T("lautlos."), tFrei = T("lautlos.>"), tErg = T("Ergebnis:"), tWarum = T("Warum?");
  const tUeb = T("ueberraschung:Das"), tUltra = T("Ultraschall."), tFleder = T("Fledermäuse"), tMerk = T("merksatz:Was"), tSchluss = T("Welches");
  const tSchleife = tSchluss + 0.6;

  // ---------- Szenario-Zeit τ (0–5 s) über die Videozeit, Zeitlupe im Takt der Sätze ----------
  const tauKeys = [
    { t: 0, v: 0 }, { t: tS1, v: 0 }, { t: tHey, v: 0.1, e: ease.linear }, { t: tS2, v: 1.0, e: ease.linear }, { t: tAn, v: S.heyAn(), e: ease.linear },
    { t: tS3, v: 2.0, e: ease.linear }, { t: tS4, v: 2.95, e: ease.linear }, { t: tDurch, v: 3.0, e: ease.linear }, { t: tS5, v: 4.0, e: ease.linear },
    { t: tVorbei, v: S.bahnBeiDir(), e: ease.linear }, { t: tFrei, v: 5.0, e: ease.linear }, { t: DAUER + 1, v: 5.0 },
  ];
  const tauRoh = (t) => keyframes(tauKeys, t);
  const burstK = (t) => fortschritt(t, tUltra - 0.05, tUltra + 0.75);
  const VZ = S.SZ.bahnV, BREMS = 1.0;
  const naseRoh = (t) => {
    if (t < tLos) return lerp(78, S.SZ.bahnStart, ease.outCubic(fortschritt(t, 0, tLos)));
    if (t <= tUltra) return S.bahnSpitze(tauRoh(t));
    const s = Math.min(t - tUltra, VZ / BREMS);
    return S.bahnSpitze(5) - (VZ * s - 0.5 * BREMS * s * s);
  };

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    akzent: TUERKIS,
    teams: {
      a: { name: "S-BAHN", farbe: KORALLE, woerter: ["S-Bahn"] },
      b: { name: "SCHALL", farbe: TUERKIS, woerter: ["Schall", "Lärm*", "Hey*", "Ultraschall*", "Schritttempo*"] },
    },
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  const tau = M.wert(tauRoh); // schleifenfest (Countdown und Wellen kehren zum ersten Bild zurück)
  const nase = M.wert(naseRoh);

  hud.add(new Countdown(M, hud.wurzel, { tauFn: tau, tauRoh, von: tLos, bis: tFrei + 0.2 }));

  // Hook: Titel (Typo-Baustein), steigt Wort für Wort auf
  M.titel({ y: 560, groesse: 116, aus: "regeln:Fünf-0.3", woerter: [
    { text: "STELL", ein: "Stell-0.04", art: "klein" }, { text: "DIR", ein: "dir-0.04", art: "klein" }, { text: "VOR:", ein: "vor,-0.04", art: "klein" },
    { umbruch: true },
    { text: "SCHALL", ein: "Schall-0.04", team: "b" }, { text: "IM", ein: "Sekunden-0.04" },
    { umbruch: true },
    { text: "SCHRITTTEMPO", ein: "Schritttempo.-0.04", team: "b" },
  ] });
  // Regeln als Chips
  M.chips({ y: 430, ausrichtung: "mitte", aus: "Klar,-0.4", liste: [{ text: "SCHALL 5 KM/H", ein: "regeln:Fünf+0.15", art: "voll", team: "b", gross: true }] });
  M.chips({ y: 590, ausrichtung: "mitte", aus: "Klar,-0.4", liste: [{ text: "SONST 1.235 KM/H", ein: "km/h.+0.1", art: "dunkel" }] });
  M.chips({ y: 720, ausrichtung: "mitte", aus: "Klar,-0.4", liste: [{ text: "FREUNDIN 2 M", ein: "Freundin.-0.05", art: "hell" }] });
  M.chips({ y: 850, ausrichtung: "mitte", aus: "Klar,-0.4", liste: [{ text: "S-BAHN 50 KM/H", ein: "fünfzig.-0.05", art: "voll", team: "a" }] });
  // Denkfalle
  M.stempel({ text: "KLAR?", ein: "Klar,", aus: "Los-0.1", x: SICHER.mitte, y: 860, winkel: -6, farbe: "weiss", textFarbe: "tinte", groesse: 128 });
  // Folgen-Aufruf
  M.folgen({ ein: "Folg", dauer: 1.8, y: 960 });

  // Sekunde 1–2: Hey der Freundin, Restweg als Live-Zähler
  const heyRest = (t) => Math.max(0, S.SZ.freundin - S.C1 * Math.max(0, tau(t) - S.SZ.heyBei));
  M.zaehler({ ein: "sek1:Hey!+0.1", aus: "sek2:an.+0.6", wert: heyRest, nk: 1, einheit: "m", max: 9, team: "b", label: "HEY NOCH", x: SICHER.mitte, y: 420, anker: "mitte" });
  M.chips({ y: 520, ausrichtung: "mitte", aus: "sek3:Sekunde-0.1", liste: [
    { text: "2 M = 1,4 S", ein: "1,4-0.03", art: "voll", team: "b", gross: true },
  ] });
  // Sekunde 3: Mach 10, Abstand der S-Bahn als Live-Zähler
  M.zaehler({ ein: "sek3:Sekunde+0.1", aus: "Ergebnis:-0.3", wert: (t) => Math.max(0, nase(t)), nk: 0, einheit: "m", max: 99, team: "a", label: "S-BAHN", x: SICHER.mitte, y: 420, anker: "mitte" });
  M.stempel({ text: "MACH 10", ein: "Mach-0.02", x: SICHER.mitte, y: 880, winkel: -3, art: "stempel", farbe: "a", groesse: 92 });
  // Sekunde 4: Durchsage
  M.chips({ y: 520, ausrichtung: "mitte", aus: "sek5:Sekunde-0.1", liste: [{ text: "LAUTSPRECHER 8 M", ein: "Durchsage:", art: "dunkel" }] });
  M.chips({ y: 670, ausrichtung: "mitte", aus: "sek5:Sekunde-0.1", liste: [{ text: "8 M = 5,8 S", ein: "sechs-0.05", art: "voll", team: "b", gross: true }] });
  // Sekunde 5: lautlos
  M.stempel({ text: "LAUTLOS", ein: "Völlig", aus: "Ergebnis:-0.45", x: SICHER.mitte, y: 800, winkel: 6, farbe: "#3B3F55", groesse: 132 });
  // Ergebnis: Rennen S-Bahn gegen ihr eigenes Geräusch (60 m bis zu dir)
  const R = S.rennen();
  M.bilanz({
    y: 420, ein: "Ergebnis:-0.15", aus: "Warum?-0.15", titel: "Bis zu dir (60 m)",
    zeilen: [
      { label: "S-BAHN", wert: Math.round(R.bahn * 10) / 10, nk: 1, einheit: "s", team: "a", ein: "ergebnis:S-Bahn" },
      { label: "IHR LÄRM", wert: Math.round(R.geraeusch * 10) / 10, nk: 1, einheit: "s", team: "b", ein: "38,9-0.1" },
    ],
    differenz: { label: "VORSPRUNG", wert: Math.round(R.vorsprung * 10) / 10, nk: 1, einheit: "s", ein: "ergebnis:Sekunden" },
    sieger: { text: "S-BAHN ZUERST", team: "a", ein: "ergebnis:Lärm" },
  });
  // Warum? Zwei Faktoren als Formelkarten
  M.formel({ y: 420, ein: "Erstens:-0.1", aus: "ueberraschung:Das-0.15", titel: "Erstens: Reichweite", teile: [
    { text: "5", einheit: "km/h", ein: "Erstens:+0.2", team: "b" }, { text: "×", ein: "schafft" }, { text: "5", einheit: "s", ein: "warum:jetzt" },
    { text: "=", ein: "sieben-0.1" }, { text: "6,9", einheit: "m", ein: "sieben", art: "erg" },
  ] });
  M.formel({ y: 820, ein: "Zweitens:-0.1", aus: "ueberraschung:Das-0.15", titel: "Zweitens: Tempo", teile: [
    { text: "50", einheit: "km/h", ein: "Zweitens:+0.2", team: "a" }, { text: ">", ein: "warum:schneller" }, { text: "5", einheit: "km/h", ein: "warum:als", team: "b" },
    { text: "=", ein: "überholt" }, { text: "MACH 10", ein: "überholt+0.25", art: "erg" },
  ] });
  // Zweite Überraschung: Ultraschall
  M.chips({ y: 430, ausrichtung: "mitte", aus: "Ultraschall.-0.15", liste: [{ text: "SCHALL WIEDER 1.235 KM/H", ein: "Danach", art: "voll", team: "b" }] });
  M.pointe({ text: "ULTRA- | *SCHALL*", ein: "Ultraschall.-0.05", takt: 0.16, aus: "merksatz:Was-0.45", y: 520, groesse: 150 });
  M.chips({ y: 900, ausrichtung: "mitte", aus: "merksatz:Was-0.45", liste: [{ text: "× 247", ein: "Ultraschall.+0.4", art: "voll", team: "b", gross: true }] });
  M.chips({ y: 1060, ausrichtung: "mitte", aus: "merksatz:Was-0.45", liste: [{ text: "200 HZ → 49 KHZ", ein: "ueberraschung:Nur", art: "dunkel" }] });
  // Merksatz
  M.pointe({ text: "WAS DU HÖRST, | IST SCHON | *PASSIERT.*", ein: "merksatz:Was", takt: 0.13, aus: "Welches-0.1", y: 520, groesse: 112 });
  M.chips({ y: 960, ausrichtung: "mitte", aus: "Schreib-0.1", liste: [{ text: "DEIN SZENARIO?", ein: "Szenario-0.05", art: "voll", team: "b", gross: true }] });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 62 });

  // Blitz, wenn die Welle dich trifft (HUD-Ebene ohne Text)
  const blitz = el("div", "", "", hud.wurzel);
  Object.assign(blitz.style, { position: "absolute", left: "0", top: "0", width: "1080px", height: "1920px", pointerEvents: "none", zIndex: 5,
    background: `radial-gradient(ellipse at 50% 45%, rgba(46,196,182,0.0) 30%, rgba(46,196,182,0.55) 100%)`, opacity: 0 });
  const blitzZeiten = [tAn, tUltra];
  hud.add({ update(t) { let o = 0; for (const b of blitzZeiten) o = Math.max(o, t >= b - 0.05 ? Math.exp(-(t - b + 0.05) * 5) : 0); blitz.style.opacity = (o * 0.9).toFixed(3); } });

  // 3D-Ereignisse fürs Protokoll (Ton und Prüfung)
  M.melde({ t: tHey, typ: "welle", klang: "blip", text: "Hey (Welle startet)" });
  M.melde({ t: tAn, typ: "welle", klang: "boom", text: "Hey trifft dich" });
  M.melde({ t: tS3 + 0.2, typ: "kamera", klang: "whoosh", dauer: 0.7, text: "Blick zur S-Bahn" });
  M.melde({ t: tDurch, typ: "welle", klang: "blip", text: "Durchsage startet" });
  M.melde({ t: tS4 + 0.1, typ: "kamera", klang: "whoosh", dauer: 0.7, text: "Blick zum Lautsprecher" });
  M.melde({ t: tVorbei - 0.25, typ: "kamera", klang: "whoosh", dauer: 1.2, text: "S-Bahn rauscht vorbei" });
  M.melde({ t: tUltra, typ: "welle", klang: "scan", dauer: 0.9, text: "Ultraschall" });
  M.melde({ t: tFrei, typ: "standbild", klang: "ding", text: "τ = 5 s, Bild friert ein" });

  // =====================================================================================
  // Welt-Zustand
  // =====================================================================================
  const tmp = new THREE.Vector3();
  const setzeWelt = (t, { pov }) => {
    const ta = tau(t);
    const xn = nase(t);
    W.zug.position.set(xn, 0, 0);
    const b = burstK(t);
    // Wellen
    for (const w of W.wellen) {
      const alter = Math.min(ta, 5) - w.te;
      let r = alter * S.C1;
      if (alter <= 0.005 || b >= 1) { w.m.visible = false; continue; }
      let mitte;
      if (w.quelle === "hey") mitte = MUND;
      else if (w.quelle === "durchsage") mitte = LAUTSPRECHER;
      else mitte = tmp.set(S.bahnSpitze(w.te) - 0.15, NASE_Y, 0);
      r *= 1 + 9 * b * b;
      w.m.visible = true;
      w.m.position.copy(mitte);
      w.m.scale.setScalar(Math.max(0.02, r));
      const ein = clamp(alter / 0.12);
      w.m.material.uniforms.deck.value = ein * (1 - b) * (w.quelle === "bahn" ? 0.75 : 1);
      w.m.material.uniforms.weiss.value = clamp(b * 2.2);
    }
    // Hey-Schriftzug reitet auf der vordersten Welle
    const heyR = (Math.min(ta, 5) - S.SZ.heyBei) * S.C1;
    const heySicht = t >= tHey - 0.02 && t < tAn + 0.15 && heyR > 0;
    W.heyText.visible = heySicht && pov;
    if (heySicht) {
      const d = AUGE.clone().sub(MUND); const dist = d.length(); d.normalize();
      const r = Math.min(heyR, dist - 0.55);
      W.heyText.position.copy(MUND).addScaledVector(d, r).add(V(0, 0.12, 0));
      const zurKamera = W.heyText.position.distanceTo(AUGE);
      const s = 0.26 * (1 + 0.6 * ease.outBack(clamp((t - tHey) / 0.4)) - 0.6) * clamp(zurKamera / dist, 0.25, 1);
      W.heyText.scale.set(s * 4, s, 1);
      W.heyText.material.opacity = 1 - clamp((heyR - (dist - 0.5)) / 0.4);
    }
    W.durchsageText.visible = pov && t >= tDurch && t < tS5 + 0.3;
    if (W.durchsageText.visible) { W.durchsageText.position.copy(LAUTSPRECHER).add(V(-0.2, -0.75, -0.4)); const s = 0.3 * ease.outBack(clamp((t - tDurch) / 0.35)); W.durchsageText.scale.set(s * 8, s, 1); }
    // Freundin: winkt beim Hey, Mund offen
    const winke = fortschritt(t, tHey - 0.35, tHey) * (1 - fortschritt(t, tAn + 0.8, tAn + 1.6));
    W.freundin.armR.rotation.x = -winke * 2.5 + Math.sin(t * 11) * 0.18 * winke;
    W.freundin.armR.rotation.z = winke * 0.4;
    const mundAuf = Math.max(0, 1 - Math.abs(t - tHey - 0.15) / 0.35);
    W.freundin.mund.scale.set(0.4 + mundAuf * 0.4, 0.5 + mundAuf * 1.4, 1.2);
    // Totale: „Du“ sichtbar
    W.du.g.visible = !pov; W.duRing.visible = !pov; W.duLabel.visible = !pov;
    // Fledermaus
    const fk = fortschritt(t, tFleder - 0.5, tFleder + 1.4);
    W.fleder.visible = false; // Fledermaus verworfen (im Bild zu klein, verdeckt von Chips)
    if (W.fleder.visible) {
      W.fleder.position.set(lerp(5.4, 6.2, fk), 1.62 + Math.sin(fk * 11) * 0.08, lerp(9.5, -2.5, fk));
      W.fleder.rotation.y = Math.atan2(-(-2.5 - 9.5), 6.2 - 5.4);
      const flap = Math.sin(t * 34) * 0.9;
      W.flG.rotation.x = flap; W.frG.rotation.x = -flap;
    }
  };

  // =====================================================================================
  // Kamera: Ich-Perspektive (Augenhöhe), Blickziele im Takt der Stimme
  // =====================================================================================
  const kam = new THREE.PerspectiveCamera(64, 1080 / 1920, 0.05, 600);
  const Z0 = () => V(16, 1.0, 5.4); // Hook: Gleis links, Freundin rechts
  const ZF = () => MUND.clone().add(V(0.4, -0.05, 0.1));
  const ZT = (t) => V(Math.max(nase(t), 4) + 4, 1.4, 0.4);
  const ZN = (t) => V(nase(t) + 1.2, 1.5, 0); // Zugspitze verfolgen
  const ZL = () => LAUTSPRECHER.clone().add(V(-0.5, -0.4, -0.6));
  const ZG = () => V(-6, 1.6, 0.2); // Blick auf den stehenden Zug / das Gleis
  const ziele = [
    { t: 0, z: Z0, d: 0 },
    { t: T("regeln:Du") - 0.1, z: () => V(30, 0.6, 7.5), d: 0.9 }, // Blick den Bahnsteig entlang
    { t: T("Freundin.") - 0.35, z: ZF, d: 0.6 },
    { t: T("regeln:S-Bahn") - 0.25, z: ZT, d: 0.75 },
    { t: T("Klar,") - 0.15, z: Z0, d: 0.7 },
    { t: T("Oder?") - 0.1, z: ZT, d: 0.6 }, // „Oder?“: Blick zur S-Bahn
    { t: tS1 - 0.2, z: ZF, d: 0.75 },
    { t: tS3 - 0.1, z: ZT, d: 0.85 },
    { t: tS4 + 0.05, z: ZL, d: 0.85 },
    { t: tS5 - 0.15, z: ZN, d: 0.6 },
    { t: tUeb - 0.2, z: ZG, d: 0.01 },
    { t: T("ueberraschung:alles,") - 0.1, z: () => V(22, 1.6, 0.4), d: 0.8 }, // Blick auf die eingefrorenen Wellen
    { t: tUltra - 0.6, z: () => V(7, 2.7, 2.2), d: 0.9 },
    { t: tMerk - 0.25, z: ZF, d: 0.8 },
    { t: T("immer") - 0.1, z: () => MUND.clone().add(V(0.9, -0.25, -0.9)), d: 1.0 }, // langsamer Schwenk an ihr vorbei
    { t: T("Welches") - 0.1, z: () => V(14, 1.2, 4.6), d: 1.1 }, // zurück Richtung Anfangsbild
  ];
  for (const k of ziele.slice(1)) if (k.d > 0.05) M.melde({ t: k.t, typ: "kamera", klang: false, dauer: k.d, text: "Blickwechsel" });
  const blickZiel = (t) => {
    let d = ziele[0].z(t).clone().sub(AUGE).normalize();
    for (let i = 1; i < ziele.length; i++) {
      const k = ziele[i];
      if (t < k.t) break;
      const w = ease.inOutCubic(fortschritt(t, k.t, k.t + k.d));
      const d2 = k.z(t).clone().sub(AUGE).normalize();
      d = d.lerp(d2, w).normalize();
    }
    return AUGE.clone().addScaledVector(d, 10);
  };
  const fovKeys = [
    { t: 0, v: 70 }, { t: T("regeln:Fünf"), v: 64, e: ease.inOutSine }, { t: T("Klar,"), v: 62, e: ease.inOutSine }, { t: tLos, v: 66, e: ease.outCubic },
    { t: tS1 + 0.6, v: 58, e: ease.inOutSine }, { t: tAn, v: 56, e: ease.linear }, { t: tAn + 0.4, v: 66, e: ease.outCubic },
    { t: tS3 + 0.6, v: 54, e: ease.inOutSine }, { t: tS4 + 0.6, v: 60, e: ease.inOutSine }, { t: tS5 + 0.3, v: 66, e: ease.inOutSine },
    { t: tVorbei, v: 74, e: ease.inOutSine }, { t: tFrei, v: 70, e: ease.inOutSine },
    { t: tUeb, v: 66 }, { t: tUltra, v: 72, e: ease.inOutSine }, { t: tMerk + 0.4, v: 62, e: ease.inOutSine }, { t: DAUER, v: 66, e: ease.inOutSine },
  ];
  const auge = (t) => {
    const geh = Math.sin(t * 1.9) * 0.012 + Math.sin(t * 0.7) * 0.01; // leichtes Atmen der Kopfhaltung
    return [AUGE.x + Math.sin(t * 0.43) * 0.02, AUGE.y + geh, AUGE.z + Math.cos(t * 0.37) * 0.015];
  };
  const regie = new Regie(kam, (t) => {
    const z = blickZiel(t);
    const roll = Math.sin(t * 0.6) * 0.008 + (t > tVorbei - 0.6 && t < tFrei + 0.5 ? Math.sin((t - tVorbei) * 3) * 0.03 * (1 - fortschritt(t, tVorbei, tFrei + 0.5)) : 0);
    return { pos: auge(t), ziel: [z.x, z.y, z.z], fov: keyframes(fovKeys, t), roll };
  }, { zp });
  regie.stoss({ t: tLos + 0.05, staerke: 0.6 });
  regie.stoss({ t: tAn, staerke: 1.0 });
  regie.stoss({ t: tMach + 0.05, staerke: 0.8 });
  regie.stoss({ t: tVorbei - 0.1, staerke: 1.2, dauer: 0.7 });
  regie.stoss({ t: tUltra, staerke: 0.9 });
  regie.stoss({ t: T("Klar,") + 0.05, staerke: 0.5 });
  regie.stoss({ t: T("passiert.") + 0.05, staerke: 0.45 });
  regie.zoom({ t: "später.", staerke: 0, fov: -6, halt: 0.5, rueck: 0.4 });
  regie.schleife({ ab: tSchleife, ende: ENDE });

  const post = { bloomStaerke: BLOOM, bloomSchwelle: 0.95, bloomRadius: 1.0, belichtung: 1.0, vignette: 0.32, saettigung: 1.08, kontrast: 1.06, koernung: 0.03 };
  const weltPOV = { szene: W.szene, kamera: kam, post, update(t) { setzeWelt(t, { pov: true }); regie.anwenden(t); } };

  // Totale (Ergebnis und Warum): der eingefrorene Moment τ = 5 s von schräg oben, langsame Fahrt
  const kamT = new THREE.PerspectiveCamera(46, 1080 / 1920, 0.1, 800);
  const regieT = new Regie(kamT, (t) => {
    const k = ease.inOutSine(fortschritt(t, tErg - 0.4, tUeb));
    return { pos: [lerp(-26, -22, k), lerp(12.5, 9.5, k), lerp(13, 9, k)], ziel: [lerp(2, 6, k), 0.6, 0.8], fov: 46 };
  }, { zp });
  regieT.stoss({ t: T("ergebnis:Lärm") + 0.05, staerke: 0.5 });
  const weltT = { szene: W.szene, kamera: kamT, post: { ...post, vignette: 0.36 }, update(t) { setzeWelt(t, { pov: false }); regieT.anwenden(t); } };

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltPOV);
  zl.shot(tErg - 0.1, weltT, { typ: "blasen", dauer: 0.7 });
  zl.shot(tUeb - 0.05, weltPOV, { typ: "zoomwisch", dauer: 0.5, richtung: [1, -0.2], mitte: [0.5, 0.5] });

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  window.hudAt = (t) => hud.update(t);
  for (const t of [0, tAn, tVorbei, tErg + 0.5, tUltra, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.modell = S.alles();
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
