// Leben in der Neon-Stadt (Entscheidung 03.11.): fliegender Verkehr auf Leuchtspuren, große Anzeigetafel mit Followern,
// nächstem Posting und CRP-Ziel, Hologramm über dem Platz und Lieferroboter zwischen den Zentralen.
import * as THREE from "three";
import { szene, U, LICHT_GLSL, NEBEL_GLSL, CYAN, PINK, GOLD, VIOLETT, GRUEN, ORANGE, PUNKT, zufall, schriftTextur, SCHRIFT, MONO } from "./kern.js";
import { Schar } from "./roboter.js";
import { fassade, TAFEL_ORT } from "./gebaeude.js";

// ───────────────────────── Fliegender Verkehr ─────────────────────────
const V = { spuren: [], fahrzeuge: [], koerper: null, lichter: null, lichtPos: null, lichtFarbe: null };
const hilf = new THREE.Vector3(), hilf2 = new THREE.Vector3(), mat4 = new THREE.Matrix4(), quat = new THREE.Quaternion(), vorne = new THREE.Vector3(1, 0, 0);

export function verkehrBauen() {
  const r = zufall(77);
  // Ringspuren um die Mitte und gerade Schneisen über die Stadt
  [[78, 22, 1, 12], [118, 33, -1, 14], [170, 47, 1, 16], [240, 66, -1, 16]].forEach(([radius, hoehe, richtung, anzahl]) => {
    V.spuren.push({ art: "ring", radius, hoehe, richtung, anzahl, tempo: (14 + r() * 8) / radius });
  });
  for (const [achse, versatz, hoehe, richtung] of [["x", -60, 28, 1], ["x", 84, 40, -1], ["z", -84, 34, 1], ["z", 60, 52, -1], ["x", -180, 58, -1], ["z", 200, 26, 1]]) {
    V.spuren.push({ art: "gerade", achse, versatz, hoehe, richtung, anzahl: 9, tempo: 16 + r() * 10 });
  }
  for (const s of V.spuren) for (let i = 0; i < s.anzahl; i++) V.fahrzeuge.push({ spur: s, t: i / s.anzahl + r() * 0.03, wackel: r() * 10, farbe: [CYAN, PINK, VIOLETT, GOLD][Math.floor(r() * 4)] });

  const n = V.fahrzeuge.length;
  const geo = new THREE.BoxGeometry(2.6, 0.62, 1.15);
  const mat = new THREE.ShaderMaterial({
    uniforms: { ...U },
    vertexShader: `varying vec3 vN; varying vec3 vWelt; varying vec3 vL; varying vec3 vFarbe;
      void main() { vL = position; vFarbe = instanceColor; vN = normalize(mat3(modelMatrix * instanceMatrix) * normal); vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0); vWelt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `${LICHT_GLSL} ${NEBEL_GLSL} varying vec3 vN; varying vec3 vWelt; varying vec3 vL; varying vec3 vFarbe;
      void main() {
        vec3 f = lin(vec3(0.22, 0.2, 0.3)) * licht(normalize(vN));
        f += vFarbe * smoothstep(-0.2, -0.31, vL.y) * (0.6 + uNeon * 1.4); // Unterbodenleuchte
        f += lin(vec3(0.6, 0.85, 1.0)) * step(0.18, vL.y) * step(-0.6, vL.x) * step(vL.x, 0.7) * 0.25; // Kanzel
        gl_FragColor = vec4(nebeln(f, vWelt), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  V.koerper = new THREE.InstancedMesh(geo, mat, n);
  V.fahrzeuge.forEach((f, i) => V.koerper.setColorAt(i, f.farbe));
  V.koerper.frustumCulled = false;
  szene.add(V.koerper);
  // Scheinwerfer (vorn weiß) und Rücklichter (hinten rosa) als Lichtpunkte
  V.lichtPos = new Float32Array(n * 2 * 3);
  V.lichtFarbe = new Float32Array(n * 2 * 3);
  for (let i = 0; i < n; i++) { V.lichtFarbe.set([1, 0.95, 0.9], i * 6); V.lichtFarbe.set([1, 0.2, 0.45], i * 6 + 3); }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute("position", new THREE.BufferAttribute(V.lichtPos, 3).setUsage(THREE.DynamicDrawUsage));
  lg.setAttribute("color", new THREE.BufferAttribute(V.lichtFarbe, 3));
  V.lichter = new THREE.Points(lg, new THREE.PointsMaterial({ size: 1.6, vertexColors: true, map: PUNKT, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  V.lichter.frustumCulled = false;
  szene.add(V.lichter);
}

function fahrzeugOrt(f, ziel, richtung) {
  const s = f.spur;
  if (s.art === "ring") {
    const a = f.t * Math.PI * 2 * s.richtung;
    ziel.set(Math.cos(a) * s.radius, s.hoehe + Math.sin(f.wackel + a * 3) * 0.8, Math.sin(a) * s.radius);
    richtung.set(-Math.sin(a) * s.richtung, 0, Math.cos(a) * s.richtung);
  } else {
    const l = ((f.t % 1) + 1) % 1 * 1000 - 500;
    const p = l * s.richtung;
    if (s.achse === "x") { ziel.set(p, s.hoehe, s.versatz); richtung.set(s.richtung, 0, 0); }
    else { ziel.set(s.versatz, s.hoehe, p); richtung.set(0, 0, s.richtung); }
    ziel.y += Math.sin(f.wackel + l * 0.05) * 0.5;
  }
}

export function verkehrBewegen(dt) {
  const tag = 1 - U.uNacht.value;
  V.fahrzeuge.forEach((f, i) => {
    const s = f.spur;
    f.t += dt * (s.art === "ring" ? s.tempo / (Math.PI * 2) : s.tempo / 1000);
    fahrzeugOrt(f, hilf, hilf2);
    quat.setFromUnitVectors(vorne, hilf2);
    mat4.compose(hilf, quat, new THREE.Vector3(1, 1, 1));
    V.koerper.setMatrixAt(i, mat4);
    V.lichtPos.set([hilf.x + hilf2.x * 1.4, hilf.y + 0.05, hilf.z + hilf2.z * 1.4], i * 6);
    V.lichtPos.set([hilf.x - hilf2.x * 1.4, hilf.y + 0.05, hilf.z - hilf2.z * 1.4], i * 6 + 3);
  });
  V.koerper.instanceMatrix.needsUpdate = true;
  V.lichter.geometry.attributes.position.needsUpdate = true;
  V.lichter.material.opacity = 0.35 + 0.65 * (1 - tag * 0.7);
}

// ───────────────────────── Anzeigetafel ─────────────────────────
const TAFEL = { tex: null, seite: 0, wechsel: 0, daten: {} };
const zahlDe = (n) => (n === null || n === undefined ? "–" : Number(n).toLocaleString("de-DE"));

function tafelMalen(g, b, h, d = {}, seite = 0) {
  g.fillStyle = "#06030c"; g.fillRect(0, 0, b, h);
  // Rahmen und Kopfzeile
  const verlauf = g.createLinearGradient(0, 0, b, 0);
  verlauf.addColorStop(0, "#25f4ee"); verlauf.addColorStop(1, "#fe2c55");
  g.fillStyle = verlauf; g.fillRect(0, 0, b, 10); g.fillRect(0, h - 10, b, 10);
  g.textBaseline = "middle";
  g.font = `700 40px ${MONO}`; g.fillStyle = "#8b91a8";
  const titel = ["FOLLOWER", "HEUTE", "CRP-ZIEL"][seite];
  g.fillText(`TIKTOK//COCKPIT · ${titel}`, 48, 62);
  g.textAlign = "right";
  g.fillText(new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }), b - 48, 62);
  g.textAlign = "left";
  if (seite === 0) {
    const konten = d.konten || [];
    konten.slice(0, 2).forEach((k, i) => {
      const y = 190 + i * 170, farbe = i === 0 ? "#25f4ee" : "#fe2c55";
      g.font = `600 44px ${SCHRIFT}`; g.fillStyle = farbe; g.fillText(k.name.toUpperCase(), 48, y - 40);
      g.font = `700 112px ${SCHRIFT}`; g.fillStyle = "#ffffff"; g.shadowColor = farbe; g.shadowBlur = 24;
      g.fillText(zahlDe(k.follower), 48, y + 40);
      g.shadowBlur = 0;
      if (k.plus) { g.font = `700 48px ${MONO}`; g.fillStyle = "#3ef0a0"; g.fillText(`▲ +${zahlDe(k.plus)}`, 560, y + 44); }
    });
  } else if (seite === 1) {
    const n = d.naechster;
    g.font = `600 44px ${SCHRIFT}`; g.fillStyle = "#ffd166"; g.fillText("NÄCHSTES POSTING", 48, 150);
    g.font = `700 120px ${SCHRIFT}`; g.fillStyle = "#ffffff"; g.shadowColor = "#ffd166"; g.shadowBlur = 24;
    g.fillText(n?.zeit || "–", 48, 260); g.shadowBlur = 0;
    g.font = `500 42px ${SCHRIFT}`; g.fillStyle = "#c9cee0";
    g.fillText(n ? `${n.konto} · ${n.titel}`.slice(0, 44) : "Kein Posting geplant", 48, 360, b - 96);
    g.font = `600 40px ${MONO}`; g.fillStyle = d.render?.rendert ? "#fe2c55" : "#8b91a8";
    g.fillText(d.render?.rendert ? `● RENDER ${Math.round(d.render.prozent || 0)} %` : "○ Render-Dienst bereit", 48, 450);
    g.fillStyle = "#3ef0a0"; g.fillText(`${d.online ?? 0}/${d.geplant ?? 0} heute online`, 560, 450);
  } else {
    const z = d.ziel || {};
    g.font = `600 44px ${SCHRIFT}`; g.fillStyle = "#3ef0a0"; g.fillText((z.titel || "10.000 Follower").toUpperCase(), 48, 150);
    g.font = `700 140px ${SCHRIFT}`; g.fillStyle = "#ffffff"; g.shadowColor = "#3ef0a0"; g.shadowBlur = 28;
    g.fillText(`${Math.round((z.anteil || 0) * 100)} %`, 48, 280); g.shadowBlur = 0;
    g.fillStyle = "#14231c"; g.fillRect(48, 380, b - 96, 46);
    g.fillStyle = "#3ef0a0"; g.fillRect(48, 380, (b - 96) * Math.min(1, z.anteil || 0), 46);
    g.font = `600 38px ${MONO}`; g.fillStyle = "#c9cee0";
    g.fillText(`${zahlDe(z.wert)} von ${zahlDe(z.ziel)} · bis zum CRP-Start`, 48, 470);
  }
}

export function tafelBauen() {
  // Hochhaus hinter den Zentralen mit großer Leinwand zum Platz (wie am Times Square)
  // steht rechts hinter dem Studio, von der Grundansicht aus frei sichtbar
  const turm = new THREE.Mesh(new THREE.BoxGeometry(44, 92, 20).translate(0, 46, 0), fassade(new THREE.Vector3(44, 92, 20), { akzent: CYAN, glas: 0.6, fenster: 0.45, saat: 41 }));
  turm.position.set(TAFEL_ORT.x, 0, TAFEL_ORT.z);
  szene.add(turm);
  TAFEL.tex = schriftTextur(1024, 576, (g, b, h, d, s) => tafelMalen(g, b, h, d, s));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uKarte: { value: TAFEL.tex.tex }, uZeit: U.uZeit, uNacht: U.uNacht },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D uKarte; uniform float uZeit, uNacht; varying vec2 vUv;
      void main() {
        vec3 f = texture2D(uKarte, vUv).rgb;
        f *= 0.85 + 0.15 * step(0.5, fract(vUv.y * 288.0)); // Bildzeilen
        f *= 0.96 + 0.04 * sin(uZeit * 40.0 + vUv.y * 30.0);
        gl_FragColor = vec4(f * (1.1 + 0.5 * uNacht), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const leinwand = new THREE.Mesh(new THREE.PlaneGeometry(40, 22.5), mat);
  leinwand.position.set(TAFEL_ORT.x, 70, TAFEL_ORT.z + 10.1);
  szene.add(leinwand);
  const rahmen = new THREE.Mesh(new THREE.PlaneGeometry(41.6, 24.1), new THREE.MeshBasicMaterial({ color: CYAN.clone().multiplyScalar(1.4) }));
  rahmen.position.set(TAFEL_ORT.x, 70, TAFEL_ORT.z + 10.05);
  szene.add(rahmen);
}

export function tafelDaten(d) { TAFEL.daten = { ...TAFEL.daten, ...d }; TAFEL.tex?.neu(TAFEL.daten, TAFEL.seite); }

export function tafelBewegen(dt) {
  TAFEL.wechsel += dt;
  if (TAFEL.wechsel > 8) { TAFEL.wechsel = 0; TAFEL.seite = (TAFEL.seite + 1) % 3; TAFEL.tex.neu(TAFEL.daten, TAFEL.seite); }
}

// ───────────────────────── Hologramm über dem Platz ─────────────────────────
let holo;
export function hologrammBauen() {
  holo = new THREE.Group();
  const note = schriftTextur(256, 256, (g, b, h) => {
    const p = new Path2D("M30 6c1.2 5.4 4.8 8.6 10 9v6.4c-3.7 0-7-1.1-10-3.1V31a11 11 0 1 1-11-11c.7 0 1.4 0 2 .2v6.6a4.6 4.6 0 1 0 3 4.3V6h6z");
    g.save(); g.translate(32, 24); g.scale(4.2, 4.2);
    g.fillStyle = "#25f4ee"; g.translate(-0.6, -0.4); g.fill(p);
    g.fillStyle = "#fe2c55"; g.translate(1.2, 0.8); g.fill(p);
    g.fillStyle = "#ffffff"; g.translate(-0.6, -0.4); g.fill(p);
    g.restore();
  });
  for (let i = 0; i < 2; i++) {
    const ebene = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: note.tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    ebene.rotation.y = i * Math.PI / 2;
    holo.add(ebene);
  }
  const sockel = new THREE.Mesh(new THREE.CylinderGeometry(5, 6, 1.2, 40), new THREE.MeshBasicMaterial({ color: 0x1a1428 }));
  sockel.position.y = -6.4;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.15, 6, 64), new THREE.MeshBasicMaterial({ color: CYAN.clone().multiplyScalar(2) }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -5.7;
  const kegel = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5, 10, 32, 1, true), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  kegel.position.y = -1.2;
  holo.add(sockel, ring, kegel);
  holo.position.set(0, 7, 0);
  szene.add(holo);
}
export function hologrammBewegen(dt, zeit) {
  holo.children[0].rotation.y += dt * 0.6;
  holo.children[1].rotation.y += dt * 0.6;
  holo.children[0].position.y = holo.children[1].position.y = Math.sin(zeit * 1.1) * 0.5;
}

// ───────────────────────── Lieferroboter auf dem Platz ─────────────────────────
let platzSchar;
export function platzRoboterBauen(zentralen) {
  const stationen = [];
  for (const z of zentralen) {
    const seite = new THREE.Vector3().crossVectors(z.vorn, new THREE.Vector3(0, 1, 0)).multiplyScalar(1.6);
    stationen.push({ pos: z.tuer.clone().add(seite).setY(0), blick: z.gruppe.position.clone(), art: "abholen", gruppe: z.id });
    stationen.push({ pos: z.tuer.clone().sub(seite).setY(0), blick: z.gruppe.position.clone(), art: "abgeben", gruppe: z.id });
  }
  // Pausenplätze am Hologramm
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + 0.4;
    stationen.push({ pos: new THREE.Vector3(Math.cos(a) * 9, 0, Math.sin(a) * 9), blick: new THREE.Vector3(0, 0, 0), art: "pause", gruppe: "platz" });
  }
  platzSchar = new Schar(szene, stationen, 10, { lieferung: true, tempo: 3.2, akzente: [CYAN, PINK, GOLD, VIOLETT, GRUEN, ORANGE], groesse: 1.25 });
  return platzSchar;
}
export function platzRoboterBewegen(dt, zeit, aktiv) { platzSchar?.bewegen(dt, zeit, aktiv); }
export const platzJubel = () => platzSchar?.jubeln(4);
