// Supermarkthalle für „Was wäre, wenn der Stickstoff 5 Sekunden verschwindet?“ – Format nach den Referenzvideos (Skill .claude/skills/stelldirvor-video/):
// feste Ich-Perspektive von einer Galerie (Zwischengeschoss) mit Geländer im Vordergrund, weiter Blick auf belebte Gänge.
// Koordinaten (Meter): Gänge entlang +x, y nach oben, +z = rechts. Boden y = 0, Galerieboden y = 3,2, Decke y = 7,4.
// Alles ist eine reine Funktion von t bzw. des Zustands z (deterministisch). Rechnung: ../../sim/stickstoff_weg.mjs
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { clamp, lerp, ease, fortschritt, hash, smoothstep } from "../../engine/bewegung.js";
import { mat } from "../../engine/bausteine.js";
import { lichtTag } from "../../engine/licht.js";
import { canvasTextur, tuetenGeometrie, tuetenMaterial, setzeTueten, gelenkFigur, einkaufswagen, V, N2_FARBE, O2_FARBE } from "./markt.js";

export const KAMERA = { pos: [-7.5, 4.95, 2.1], ziel: [7.0, 0.3, 1.4], fov: 64 };
export const SL = 0.12; // Zeitlupe der Tüten: 1 s Video = 0,12 s Physik
const PALETTE = ["#E8452C", "#2E6FD8", "#F2B632", "#3FA45B", "#8B4FC9", "#17A5A0", "#E2569B", "#F28A30", "#C93C3C", "#5F6B85"];
const SORT = [["#E8452C", "#F2B632"], ["#2E6FD8", "#EEF2F8"], ["#3FA45B", "#F2B632"], ["#8B4FC9", "#E2569B"], ["#F28A30", "#C93C3C"], ["#17A5A0", "#2E6FD8"], ["#C93C3C", "#EEF2F8"], ["#5F6B85", "#F2B632"]];
const tkK = (tt) => (tt < 0 ? 0 : clamp(1 - Math.exp(-tt * 13) * Math.cos(tt * 21), 0, 1.06));
const tkAuf = (tt) => (tt < 0 ? 0 : 1 - Math.exp(-tt * 9) * Math.cos(tt * 17));
const bump = (t, a, b) => { const x = fortschritt(t, a, b); return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2; };

export function baueHalle(buehne, { schatten = 2048, zt }) {
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#B8C3DA");
  szene.fog = new THREE.Fog("#B6C1D8", 34, 95);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 26, schattenKarte: schatten, sonnenRichtung: [0.22, 1.0, 0.18], sonnenFarbe: "#FFF3E2", sonnenStaerke: 1.3,
    himmel: "#DDE8FF", boden: "#9C968B", himmelStaerke: 0.95, umgebungsStaerke: 0.5, schattenWeich: 3, ziel: [8, 0, 0] });
  licht.sonne.castShadow = schatten > 0;
  buehne.renderer.shadowMap.autoUpdate = false; // nur Statisches wirft Schatten: Schattenkarte einmal rendern
  buehne.renderer.shadowMap.needsUpdate = true;
  const mk = (geo, material, x, y, z) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); return m; };
  const stat = (m, cast = true) => { m.castShadow = cast; m.receiveShadow = true; return m; };

  // --- Boden, Wände, Decke ---
  const fliese = canvasTextur(512, 512, (g, b, h) => {
    g.fillStyle = "#D6D3CB"; g.fillRect(0, 0, b, h);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${120 + (i * 37) % 60},${118 + (i * 53) % 50},${112 + (i * 29) % 50},0.06)`; g.fillRect((i * 97) % b, (i * 61) % h, 9, 9); }
    g.strokeStyle = "rgba(120,116,108,0.5)"; g.lineWidth = 5;
    for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(0, k * 256); g.lineTo(b, k * 256); g.stroke(); g.beginPath(); g.moveTo(k * 256, 0); g.lineTo(k * 256, h); g.stroke(); }
  }, { wrap: true, repeat: [110 / 1.2, 60 / 1.2] });
  const boden = new THREE.Mesh(new THREE.BoxGeometry(110, 0.1, 60), new THREE.MeshStandardMaterial({ map: fliese, roughness: 0.3, metalness: 0.05, color: "#B7B3A8" }));
  boden.position.set(15, -0.05, 0); boden.receiveShadow = true; szene.add(boden);
  const wand = mat("#E9ECF2", { rau: 0.9 });
  for (const [w, h, d, x, y, z] of [[0.4, 9, 60, 46, 4.5, 0], [0.4, 9, 60, -14, 4.5, 0], [64, 9, 0.4, 16, 4.5, -24], [64, 9, 0.4, 16, 4.5, 24]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wand); m.position.set(x, y, z); szene.add(m); }
  const farSchild = new THREE.Mesh(new THREE.PlaneGeometry(14, 2.2), new THREE.MeshBasicMaterial({ map: canvasTextur(1024, 160, (g, b, h) => { g.fillStyle = "#17A5A0"; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.62}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("KASSEN", b / 2, h * 0.54); }), color: new THREE.Color(1.1, 1.1, 1.1) }));
  farSchild.position.set(45.7, 5.2, 0); farSchild.rotation.y = -Math.PI / 2; szene.add(farSchild);
  const deckeG = new THREE.Group(); szene.add(deckeG);
  const decke = new THREE.Mesh(new THREE.BoxGeometry(64, 0.2, 52), mat("#7A8194", { rau: 0.9 })); decke.position.set(16, 7.5, 0); deckeG.add(decke);
  const lichtGeo = new THREE.BoxGeometry(2.6, 0.06, 0.34);
  const lichtMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#EAF2FF").multiplyScalar(1.5) });
  const reihen = [-10.8, -7.2, -3.6, 0, 3.6, 7.2, 10.8];
  const lichter = new THREE.InstancedMesh(lichtGeo, lichtMat, reihen.length * 20);
  { const m4 = new THREE.Matrix4(); let i = 0; for (const zz of reihen) for (let x = -10; x < 44; x += 3.2) { m4.makeTranslation(x, 7.36, zz); lichter.setMatrixAt(i++, m4); } lichter.count = i; lichter.frustumCulled = false; deckeG.add(lichter); }
  // Lichtflecken auf dem Boden (Spiegelung der Lichtbänder)
  const fleck = canvasTextur(64, 64, (g, b, h) => { const gr = g.createRadialGradient(b / 2, h / 2, 0, b / 2, h / 2, b / 2); gr.addColorStop(0, "rgba(255,255,255,0.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, b, h); });
  const flecken = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 1.0), new THREE.MeshBasicMaterial({ map: fleck, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }), reihen.length * 20);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), sc = new THREE.Vector3(1, 1, 1); let i = 0; for (const zz of reihen) for (let x = -10; x < 44; x += 3.2) { m4.compose(new THREE.Vector3(x, 0.012, zz), q, sc); flecken.setMatrixAt(i++, m4); } flecken.count = i; flecken.frustumCulled = false; szene.add(flecken); }
  // Hängeschilder über den Gängen
  const hang = (x, zz, text, farbe) => {
    const tex = canvasTextur(1024, 256, (g, b, h) => { g.fillStyle = farbe; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.5}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, b / 2, h * 0.54); });
    const m = new THREE.MeshStandardMaterial({ map: tex, emissive: "#FFFFFF", emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.6 });
    const rd = mat("#2F3440");
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 2.4), [m, m, rd, rd, rd, rd]); s.position.set(x, 5.6, zz); deckeG.add(s);
    for (const dz of [-0.9, 0.9]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.7, 6), rd); r.position.set(x, 6.65, zz + dz); deckeG.add(r); }
  };
  const aisleNamen = { "-7.2": ["OBST & GEMÜSE", "#3FA45B"], "-3.6": ["BACKWAREN", "#F28A30"], "0": ["CHIPS & SNACKS", "#E8552A"], "3.6": ["GETRÄNKE", "#2E6FD8"], "7.2": ["TIEFKÜHL", "#17A5A0"] };
  for (const [c, [n, f]] of Object.entries(aisleNamen)) { hang(2.5, +c, n, f); hang(19.5, +c, n === "CHIPS & SNACKS" ? "MÜSLI" : n, f); }

  // --- Regale ---
  const tuetenMat = tuetenMaterial(), tuetenMatA = tuetenMaterial({ attr: true });
  const tuetenGeo = tuetenGeometrie();
  const tuetenPlatz = [], kistenPlatz = [], dosenPlatz = [], flaschenPlatz = [], deckelPlatz = [], tagPlatz = [];
  const gondel = (x0, x1, zf, s, farbe, kopfText, { ebenen = 4, hoehe = 2.0, tiefe = 0.5 } = {}) => {
    const len = x1 - x0, xm = (x0 + x1) / 2, zc = zf + s * tiefe / 2;
    szene.add(stat(mk(new THREE.BoxGeometry(len, hoehe, 0.04), mat("#E7EAF0", { rau: 0.8, emissiv: "#8B93A8", emissivStaerke: 0.45 }), xm, hoehe / 2, zf + s * tiefe)));
    szene.add(stat(mk(new THREE.BoxGeometry(len, 0.14, tiefe), mat("#2F3440", { rau: 0.7 }), xm, 0.07, zc)));
    for (let k = 0; k < ebenen; k++) {
      const y = 0.26 + k * 0.46;
      szene.add(stat(mk(new THREE.BoxGeometry(len, 0.035, tiefe * 0.96), mat("#C9CED6", { rau: 0.5, metall: 0.3 }), xm, y, zc), false));
      szene.add(mk(new THREE.BoxGeometry(len, 0.045, 0.012), mat("#F5F7FB", { rau: 0.5 }), xm, y + 0.01, zf));
      for (let x = x0 + 0.2; x < x1 - 0.2; x += 0.6 + hash(Math.round(x * 10), k) * 0.9) tagPlatz.push({ x, y: y + 0.012, z: zf - s * 0.008, f: hash(Math.round(x * 7), k + 3) > 0.55 ? "#F2C230" : "#E8452C", s });
    }
    const nP = Math.max(2, Math.round(len / 1.2) + 1);
    for (let i = 0; i < nP; i++) szene.add(stat(mk(new THREE.BoxGeometry(0.04, hoehe, tiefe), mat("#3A404E", { rau: 0.5, metall: 0.3 }), x0 + (len * i) / (nP - 1), hoehe / 2, zc)));
    const kopfTex = canvasTextur(1024, 128, (g, b, h) => { g.fillStyle = farbe; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.58}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(kopfText, b / 2, h * 0.54); }, { wrap: true, repeat: [len / 3.2, 1] });
    const kopfM = new THREE.MeshStandardMaterial({ map: kopfTex, emissive: "#FFFFFF", emissiveMap: kopfTex, emissiveIntensity: 0.3, roughness: 0.6 });
    const kopf = new THREE.Mesh(new THREE.BoxGeometry(len, 0.32, tiefe + 0.04), [mat(farbe), mat(farbe), mat(farbe), mat(farbe), s < 0 ? kopfM : mat(farbe), s < 0 ? mat(farbe) : kopfM]);
    kopf.position.set(xm, hoehe + 0.16, zc); szene.add(kopf);
    return { ebenenY: Array.from({ length: ebenen }, (_, k) => 0.26 + k * 0.46 + 0.0175), zFront: zf + s * 0.07, s };
  };
  const stellen = (x0, x1, g, art, tiefeReihen = 1) => {
    const s = g.s;
    for (const [ei, y] of g.ebenenY.entries()) {
      if (art === "chips") {
        for (let x = x0 + 0.17; x < x1 - 0.1; x += 0.3) tuetenPlatz.push({ x: x + (hash(Math.round(x * 100) + 7, Math.round(y * 100)) - 0.5) * 0.03, y, z: g.zFront, rot: (hash(Math.round(x * 50), Math.round(y * 99)) - 0.5) * 0.12, s });
        continue;
      }
      let x = x0 + 0.08, i = 0;
      while (x < x1 - 0.12) {
        const seg = Math.floor((x - x0) / 2.1);
        const a2 = Math.floor(hash(seg, 61 + (ei >> 1) + Math.round(g.zFront)) * 5);
        const farben = SORT[Math.floor(hash(seg, 71 + ei + Math.round(g.zFront * 3)) * SORT.length)];
        const f = farben[hash(i, 5 + ei) > 0.55 ? 1 : 0];
        const h0 = hash(Math.round(x * 40) + i, Math.round(y * 100));
        if (a2 === 1) { const r = 0.036 + h0 * 0.006, hh = 0.1 + hash(seg, 3) * 0.05; for (let n = 0; n < tiefeReihen + 1; n++) dosenPlatz.push({ x: x + r, y: y + hh / 2, z: g.zFront + s * n * 0.1, r, h: hh, f }); x += r * 2 + 0.008; }
        else if (a2 === 2) { const r = 0.032; for (let n = 0; n < tiefeReihen + 1; n++) flaschenPlatz.push({ x: x + r, y, z: g.zFront + s * n * 0.1, r, k: 0.9 + hash(seg, 4) * 0.2, f }); x += r * 2 + 0.01; }
        else if (a2 === 3) { const r = 0.04 + hash(seg, 6) * 0.01, hh = 0.11; for (let n = 0; n < tiefeReihen + 1; n++) { dosenPlatz.push({ x: x + r, y: y + hh / 2, z: g.zFront + s * n * 0.11, r, h: hh, f }); deckelPlatz.push({ x: x + r, y: y + hh + 0.01, z: g.zFront + s * n * 0.11, r: r * 1.03, f: farben[1] }); } x += r * 2 + 0.01; }
        else { const w = a2 === 0 ? 0.2 + hash(seg, 8) * 0.06 : 0.13 + hash(seg, 9) * 0.04, hh = a2 === 0 ? 0.29 + hash(seg, 10) * 0.04 : 0.17 + hash(seg, 11) * 0.03; for (let n = 0; n < tiefeReihen + 1; n++) kistenPlatz.push({ x: x + w / 2, y: y + hh / 2, z: g.zFront + s * n * 0.13, w, h: hh, d: 0.07, f }); x += w + 0.008; }
        i++;
      }
    }
  };
  const namen = { "-7.2": "OBST · GEMÜSE", "-3.6": "BACKWAREN · TEE", "0": "", "3.6": "GETRÄNKE · KONSERVEN", "7.2": "TIEFKÜHL · MILCH" };
  const farbenA = { "-7.2": "#3FA45B", "-3.6": "#F28A30", "0": "#2E6FD8", "3.6": "#2E6FD8", "7.2": "#17A5A0" };
  for (const c of [-7.2, -3.6, 0, 3.6, 7.2]) {
    for (const [seg0, seg1] of [[-4.5, 12.5], [15.5, 34]]) {
      // links (Produkte zeigen nach +z)
      const xl0 = c === 0 && seg0 === -4.5 ? 9.0 : c === 3.6 && seg0 === -4.5 ? 2.0 : seg0;
      if (c === 0 && seg0 === -4.5) { const g = gondel(-4.5, 9, c - 1.3, -1, "#E8552A", "CHIPS & SNACKS"); stellen(-4.5, 9, g, "chips"); }
      if (xl0 < seg1) { const g = gondel(xl0, seg1, c - 1.3, -1, farbenA[String(c)], namen[String(c)] || "GETRÄNKE · KONSERVEN"); stellen(xl0, seg1, g, "mix", c === 0 ? 1 : 0); }
      // rechts (Produkte zeigen nach −z)
      const xr0 = (c === 0 || c === -3.6) && seg0 === -4.5 ? (c === 0 ? 2.0 : seg0) : seg0;
      const g2 = gondel(xr0, seg1, c + 1.3, 1, farbenA[String(c)], namen[String(c)] || "MÜSLI · NUDELN"); stellen(xr0, seg1, g2, "mix", c === 0 ? 1 : 0);
    }
  }
  // Instanzen
  {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
    const inst = (geo, material, liste, fn) => { const m = new THREE.InstancedMesh(geo, material, Math.max(1, liste.length)); liste.forEach((it, i) => fn(it, i, m)); m.count = liste.length; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.frustumCulled = false; szene.add(m); return m; };
    inst(tuetenGeo, tuetenMat, tuetenPlatz, (t, i, m) => { e.set(0, t.s < 0 ? 0 : Math.PI, t.rot); q.setFromEuler(e); sc.set(0.94 + hash(i, 3) * 0.1, 0.97 + hash(i, 9) * 0.08, 1); p.set(t.x, t.y, t.z + (t.s < 0 ? 0.075 : -0.075)); m4.compose(p, q, sc); m.setMatrixAt(i, m4); c.set(PALETTE[Math.floor(hash(i, 5) * PALETTE.length)]); m.setColorAt(i, c); });
    const kistenTex = canvasTextur(128, 192, (g, b, h) => { g.fillStyle = "#F4F4F4"; g.fillRect(0, 0, b, h); g.fillStyle = "#D9D9D9"; g.fillRect(0, h * 0.62, b, h * 0.38); g.fillStyle = "#FFFFFF"; g.beginPath(); g.ellipse(b / 2, h * 0.34, b * 0.34, b * 0.26, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = "#6A6A6A"; g.fillRect(b * 0.15, h * 0.72, b * 0.7, h * 0.05); g.fillRect(b * 0.15, h * 0.82, b * 0.45, h * 0.04); });
    inst(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: kistenTex, roughness: 0.55 }), kistenPlatz, (k, i, m) => { p.set(k.x, k.y, k.z); q.identity(); sc.set(k.w, k.h, k.d); m4.compose(p, q, sc); m.setMatrixAt(i, m4); c.set(k.f); m.setColorAt(i, c); });
    inst(new THREE.CylinderGeometry(1, 1, 1, 12), new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.7 }), dosenPlatz, (d, i, m) => { p.set(d.x, d.y, d.z); q.identity(); sc.set(d.r, d.h, d.r); m4.compose(p, q, sc); m.setMatrixAt(i, m4); c.set(d.f); m.setColorAt(i, c); });
    const profil = [[0, 0], [0.034, 0], [0.036, 0.02], [0.036, 0.15], [0.03, 0.19], [0.014, 0.225], [0.013, 0.25], [0, 0.25]].map(([r, y]) => new THREE.Vector2(r, y));
    inst(new THREE.LatheGeometry(profil, 10), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1 }), flaschenPlatz, (f, i, m) => { p.set(f.x, f.y, f.z); q.identity(); sc.set(f.r / 0.034, f.k, f.r / 0.034); m4.compose(p, q, sc); m.setMatrixAt(i, m4); c.set(f.f); m.setColorAt(i, c); });
    inst(new THREE.CylinderGeometry(1, 1, 0.02, 12), new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 }), deckelPlatz, (d, i, m) => { p.set(d.x, d.y, d.z); q.identity(); sc.set(d.r, 1, d.r); m4.compose(p, q, sc); m.setMatrixAt(i, m4); c.set(d.f); m.setColorAt(i, c); });
    inst(new THREE.BoxGeometry(0.07, 0.045, 0.004), new THREE.MeshBasicMaterial({}), tagPlatz, (tg, i, m) => { p.set(tg.x, tg.y + 0.0, tg.z); q.identity(); m4.compose(p, q, sc.set(1, 1, 1)); m.setMatrixAt(i, m4); c.set(tg.f); m.setColorAt(i, c); });
  }

  // --- Chips-Palette (Aktionsstapel) ---
  const NL = 12, NXC = 4, NZC = 3, PAL = { x: 0.5, z: 0.2 };
  const stapelPos = []; for (let n = 0; n < NL; n++) for (let ix = 0; ix < NXC; ix++) for (let iz = 0; iz < NZC; iz++) stapelPos.push({ n, ix, iz });
  const stapelGeo = tuetenGeometrie();
  const dlyA = new THREE.InstancedBufferAttribute(new Float32Array(stapelPos.length), 1);
  stapelPos.forEach((s, i) => { dlyA.array[i] = 0.12 + (NL - 1 - s.n) / (NL - 1) * 1.35 + hash(i, 4) * 0.08; });
  stapelGeo.setAttribute("dlyA", dlyA);
  const stapel = new THREE.InstancedMesh(stapelGeo, tuetenMatA, stapelPos.length);
  { const c = new THREE.Color(); stapelPos.forEach((s, i) => { c.set(PALETTE[(s.ix * 3 + s.iz + s.n) % PALETTE.length]); stapel.setColorAt(i, c); }); stapel.instanceColor.needsUpdate = true; stapel.frustumCulled = false; szene.add(stapel); }
  const palette = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 1.3), mat("#B58A55", { rau: 0.85 })); palette.position.set(PAL.x, 0.08, PAL.z); palette.castShadow = true; palette.receiveShadow = true; szene.add(palette);
  const aktionsSchild = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), new THREE.MeshBasicMaterial({ map: canvasTextur(512, 200, (g, b, h) => { g.fillStyle = "#E8452C"; g.fillRect(0, 0, b, h); g.fillStyle = "#FFFFFF"; g.font = `900 ${h * 0.46}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("ANGEBOT", b / 2, h * 0.54); }), side: THREE.DoubleSide }));
  szene.add(aktionsSchild);

  // --- Galerie mit Geländer (Vordergrund), Backstation mit Kaffeeautomat ---
  const gal = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 40), mat("#8D95A6", { rau: 0.6 })); gal.position.set(-10.9, 3.05, 0); szene.add(gal);
  const stahl = mat("#C9CFDA", { rau: 0.35, metall: 0.45 });
  const RX = -6.8;
  const handlauf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 40, 12), stahl); handlauf.rotation.x = Math.PI / 2; handlauf.position.set(RX, 4.3, 0); szene.add(handlauf);
  const lauf2 = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 40, 8), stahl); lauf2.rotation.x = Math.PI / 2; lauf2.position.set(RX, 3.75, 0); szene.add(lauf2);
  for (let zz = -19; zz <= 19; zz += 1.05) { const pf = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.1, 8), stahl); pf.position.set(RX, 3.75, zz); szene.add(pf); }

  const station = new THREE.Group(); station.position.set(-1.0, 0, 3.1); station.rotation.y = Math.PI / 2; szene.add(station); // lokal −z = Blick zur Galerie (−x)
  const thekeK = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.92, 0.9), mat("#E9ECF2", { rau: 0.6 })); thekeK.position.set(0, 0.46, 0); station.add(stat(thekeK));
  const thekeB = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.2, 0.92), mat("#17A5A0", { rau: 0.5 })); thekeB.position.set(0, 0.3, 0); station.add(thekeB);
  const thekeP = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.05, 1.0), mat("#F3F5F8", { rau: 0.25 })); thekeP.position.set(0, 0.945, 0); station.add(stat(thekeP));
  const wandB = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.6, 0.2), mat("#F1F3F7", { rau: 0.85 })); wandB.position.set(0, 1.3, 1.35); station.add(wandB);
  const sTex = canvasTextur(1024, 160, (g, b, h) => { g.fillStyle = "#8A5A2B"; g.fillRect(0, 0, b, h); g.fillStyle = "#FFF4DE"; g.font = `900 ${h * 0.58}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BACKSTATION", b / 2, h * 0.54); });
  const sM = new THREE.MeshStandardMaterial({ map: sTex, emissive: "#FFFFFF", emissiveMap: sTex, emissiveIntensity: 0.35, roughness: 0.6 });
  const sSch = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.5, 0.1), [mat("#8A5A2B"), mat("#8A5A2B"), mat("#8A5A2B"), mat("#8A5A2B"), mat("#8A5A2B"), sM]); sSch.position.set(0, 3.0, 1.2); sSch.rotation.y = Math.PI; station.add(sSch);
  const br = new THREE.InstancedMesh(new THREE.SphereGeometry(0.5, 10, 8), mat("#B97A3E", { rau: 0.7 }), 66);
  { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), c = new THREE.Color(); const t4 = ["#C98A4B", "#B97A3E", "#D9A15F", "#A86B35"]; let i = 0;
    for (let k = 0; k < 3; k++) for (let n = 0; n < 22; n++) { p.set(-1.9 + n * 0.18 + (k % 2) * 0.05, 1.12 + k * 0.5, 1.2); sc.set(0.15, 0.1, 0.12); m4.compose(p, q.identity(), sc); br.setMatrixAt(i, m4); c.set(t4[(n + k) % 4]); br.setColorAt(i, c); i++; }
    br.instanceMatrix.needsUpdate = true; br.instanceColor.needsUpdate = true; br.frustumCulled = false; station.add(br);
    for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(4, 0.03, 0.4), mat("#7A5B44", { rau: 0.7 })); b.position.set(0, 1.06 + k * 0.5, 1.2); station.add(b); } }
  const maschine = new THREE.Group(); maschine.position.set(0, 0.97, 0); maschine.scale.setScalar(2.0); station.add(maschine);
  const dunkel = mat("#4A5264", { rau: 0.5, metall: 0.15 }), stahl2 = mat("#C9CFDA", { rau: 0.5, metall: 0.25 });
  const part = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = false; maschine.add(o); return o; };
  part(new THREE.BoxGeometry(0.64, 0.14, 0.44), stahl2, 0, 0.07, -0.02);
  part(new THREE.BoxGeometry(0.58, 0.012, 0.28), mat("#59606F", { rau: 0.6, metall: 0.2 }), 0, 0.146, -0.09);
  part(new THREE.BoxGeometry(0.64, 0.7, 0.26), mat("#8C95A6", { rau: 0.5, metall: 0.2 }), 0, 0.49, 0.1);
  part(new THREE.BoxGeometry(0.68, 0.26, 0.42), dunkel, 0, 0.98, 0);
  part(new THREE.BoxGeometry(0.62, 0.2, 0.02), stahl2, 0, 0.98, -0.215);
  const aTex = canvasTextur(256, 96, (g, b, h) => { g.fillStyle = "#06101C"; g.fillRect(0, 0, b, h); g.fillStyle = "#6FE3FF"; g.font = `800 ${h * 0.5}px "SB Display", Inter, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("KAFFEE", b / 2, h * 0.52); });
  { const a = part(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ map: aTex, color: new THREE.Color(1.4, 1.4, 1.4) }), 0, 1.02, -0.226); a.rotation.y = Math.PI; }
  for (const x of [-0.16, 0, 0.16]) { part(new THREE.CylinderGeometry(0.014, 0.018, 0.07, 10), stahl2, x, 0.8, -0.14); }
  // Tassen mit Kaffee (drei Stück)
  const tassen = [];
  const baueTasse = (lx, seed) => {
    const g = new THREE.Group(); g.position.set(lx, 0.14, -0.14); g.scale.setScalar(2.1); maschine.add(g);
    const profil = [[0.0, 0.0], [0.031, 0.0], [0.0455, 0.108], [0.0475, 0.112], [0.0445, 0.112], [0.0425, 0.108], [0.0295, 0.006], [0.0, 0.006]].map(([r, y]) => new THREE.Vector2(r, y));
    const tTex = canvasTextur(64, 128, (gg, b, h) => { gg.fillStyle = "#F7F5EF"; gg.fillRect(0, 0, b, h); gg.fillStyle = "#17A5A0"; gg.fillRect(0, h * 0.35, b, h * 0.18); });
    g.add(new THREE.Mesh(new THREE.LatheGeometry(profil, 24), new THREE.MeshStandardMaterial({ map: tTex, roughness: 0.75, side: THREE.DoubleSide })));
    const kf = new THREE.Mesh(new THREE.CircleGeometry(0.0425, 24), new THREE.MeshStandardMaterial({ color: "#2D1A10", roughness: 0.18 })); kf.rotation.x = -Math.PI / 2; kf.position.y = 0.078; g.add(kf);
    const nB = 380;
    const bl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.35 }), nB); bl.frustumCulled = false; g.add(bl);
    const bd = Array.from({ length: nB }, (_, i) => ({ w: hash(i, seed + 21), a: hash(i, seed + 22) * 6.283, r: Math.sqrt(hash(i, seed + 23)), ph: hash(i, seed + 24), rate: 0.7 + hash(i, seed + 25) * 1.3, gr: 0.006 + hash(i, seed + 26) * 0.011, ton: hash(i, seed + 27) }));
    { const c = new THREE.Color(); bd.forEach((b, i) => { c.set(b.ton > 0.9 ? "#EAD7B5" : b.ton > 0.45 ? "#B68554" : b.ton > 0.2 ? "#8A5A32" : "#4A2B18"); bl.setColorAt(i, c); }); bl.instanceColor.needsUpdate = true; }
    const rinn = Array.from({ length: 7 }, (_, i) => { const r = new THREE.Mesh(new THREE.CapsuleGeometry(0.0075, 0.02, 4, 8), mat("#4A2B18", { rau: 0.2 })); g.add(r); return { m: r, a: (i / 7) * 6.283 + 0.3 + seed, len: 0.03 + hash(i, seed + 31) * 0.05 }; });
    const trop = Array.from({ length: 10 }, (_, i) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), mat("#4A2B18", { rau: 0.2 })); g.add(d); return { m: d, a: hash(i, seed + 41) * 6.283, ph: hash(i, seed + 42), rate: 1.2 + hash(i, seed + 43) * 1.2 }; });
    const dTex = canvasTextur(128, 128, (gg, b, h) => { const gr = gg.createRadialGradient(b / 2, h / 2, 0, b / 2, h / 2, b / 2); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(0.5, "rgba(255,255,255,0.28)"); gr.addColorStop(1, "rgba(255,255,255,0)"); gg.fillStyle = gr; gg.fillRect(0, 0, b, h); });
    const dampf = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dTex, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 12; g.add(s); return { s, a: hash(i, seed + 51) * 6.283, r: hash(i, seed + 52) * 0.03, ph: hash(i, seed + 53), rate: 0.35 + hash(i, seed + 54) * 0.4 }; });
    const tmp = { m4: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() };
    tassen.push((t, k) => {
      const sieden = smoothstep(0.02, 0.45, k), o = smoothstep(0.5, 1.0, k), hMax = 0.01 + 0.095 * k, Rk = lerp(0.039, 0.058, o);
      const { m4, q, p, s } = tmp;
      const innen = (y) => 0.0295 + 0.013 * clamp((y - 0.006) / 0.102);
      bd.forEach((b, i) => {
        const lauf = (t * b.rate + b.ph) % 1;
        let rr = Math.sqrt(b.r) * Rk;
        const dom = Math.pow(Math.max(0, 1 - (rr / Rk) ** 2), 0.7);
        const y = 0.082 + hMax * dom * (0.45 + 0.55 * b.w) * (0.9 + 0.1 * Math.sin(lauf * Math.PI));
        if (y < 0.108) rr = Math.min(rr, innen(y) - 0.004);
        const gr = b.gr * 0.55 * (0.4 + 0.6 * smoothstep(0, 0.25, lauf)) * (1 - 0.8 * smoothstep(0.8, 1, lauf)) * smoothstep(0, 0.2, k) * (0.85 + 0.4 * o);
        p.set(Math.cos(b.a) * rr, y, Math.sin(b.a) * rr); s.set(gr, gr * 0.92, gr); m4.compose(p, q.identity(), s); bl.setMatrixAt(i, m4);
      });
      bl.instanceMatrix.needsUpdate = true;
      for (const r of rinn) { const Ll = 0.008 + o * (0.55 + 0.45 * Math.sin(t * 2.4 + r.a * 3)) * r.len; r.m.visible = o > 0.03; r.m.scale.set(1, Ll / 0.035, 1); r.m.position.set(Math.cos(r.a) * 0.0482, 0.115 - Ll / 2, Math.sin(r.a) * 0.0482); }
      for (const d of trop) { const ph = (t * d.rate + d.ph) % 1; d.m.visible = o > 0.1; d.m.position.set(Math.cos(d.a) * (0.052 + 0.01 * ph), 0.1 - 0.1 * ph * ph - 0.003, Math.sin(d.a) * (0.052 + 0.01 * ph)); d.m.scale.setScalar((1 - smoothstep(0.85, 1, ph)) * o); }
      for (const d of dampf) { const ph = (t * d.rate + d.ph) % 1; d.s.material.opacity = 0.3 * sieden * Math.sin(Math.PI * ph) ** 1.5 * (0.5 + 0.5 * k); const sc = 0.04 + 0.16 * ph; d.s.scale.set(sc, sc, 1); d.s.position.set(Math.cos(d.a) * d.r * (1 + ph * 2), 0.11 + hMax * 0.8 + ph * 0.5, Math.sin(d.a) * d.r * (1 + ph * 2)); }
    });
  };
  baueTasse(-0.17, 100); baueTasse(0.17, 200);

  // --- Menschen ---
  const leute = [];
  const kundin = (cfg) => { const f = gelenkFigur(cfg); f.g.traverse((o) => { if (o.isMesh) o.castShadow = false; }); szene.add(f.g); const sh = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })); sh.rotation.x = -Math.PI / 2; sh.scale.set(1, 0.6, 1); sh.position.y = 0.014; szene.add(sh); f.sh = sh; return f; };
  const atmen = (f, t, ph = 0) => { const a = Math.sin(t * 1.5 + ph); f.rumpf.scale.set(0.78 + 0.012 * a, 1 + 0.012 * a, 1.05 + 0.018 * a); };
  const gehPose = (f, ph, tempo) => { const sw = Math.sin(ph) * 0.55 * tempo; f.beine[0].rotation.z = sw; f.beine[1].rotation.z = -sw; f.armL.rotation.z = -sw * 0.7; f.armR.rotation.z = sw * 0.7; f.hueft.position.y = 0.84 + Math.abs(Math.cos(ph)) * 0.025 * tempo; };
  const schreck = (f, st, ph, basisL = 0.2, basisR = 0.4) => { // Reaktion auf den Druckabfall: umsehen, Hände zu den Ohren
    const look = smoothstep(0.08, 0.35, st), hands = smoothstep(0.4, 0.75, st);
    f.kopf.rotation.y = 0.55 * Math.sin(ph) * look; f.kopf.rotation.z = 0.12 * look;
    f.armL.rotation.z = lerp(basisL, 2.55, hands); f.armR.rotation.z = lerp(basisR, 2.55, hands);
    f.armL.rotation.x = lerp(0, -0.45, hands); f.armR.rotation.x = lerp(0, 0.45, hands);
  };
  // Läufer (periodisch): Gang c, Mitte x0, Amplitude a, Frequenzfaktor k, mit/ohne Wagen
  const jacken = ["#6C4F8A", "#8A4F4F", "#4F6A8A", "#5E6B4A", "#7A5E4A", "#4A4F6E", "#8A6F2F", "#3F7A63"];
  const laeufer = [[0, 0.95, 6.0, 3.6, 2, true], [-3.6, 0.3, 9.0, 5, 3, true], [3.6, -0.3, 11, 6, 2, false], [7.2, 0.4, 14, 7, 3, true], [-7.2, -0.3, 12, 6, 2, true], [-3.6, -0.4, 20, 7, 3, false], [3.6, 0.35, 22, 8, 2, true], [0, -0.5, 24, 6, 3, false]];
  laeufer.forEach(([c, dz, x0, a, k, wagen], i) => {
    const f = kundin({ jacke: jacken[i % 8], hose: "#2A2F3D", haare: hash(i, 9) > 0.5 ? "#2A1E18" : "#7A5A3A", groesse: 1.62 + hash(i, 8) * 0.2 });
    const w = wagen ? einkaufswagen() : null; if (w) { w.traverse((o) => { if (o.isMesh) o.castShadow = false; }); szene.add(w); }
    const ph0 = hash(i, 17) * 6.283;
    leute.push((t, z) => {
      const T = z.periode, wv = (2 * Math.PI * t) / T, am = a * lerp(1, 0.35, smoothstep(0.35, 0.8, z.st));
      const x = x0 + am * Math.sin(wv * k + ph0);
      const v = (am * Math.cos(wv * k + ph0) * (2 * Math.PI * k / T)); // m/s
      const r = Math.tanh(v / 0.12), ang = (Math.PI / 2) * (1 - r);
      f.g.position.set(x, 0, c + dz); f.g.rotation.y = ang;
      gehPose(f, t * 6.2 + ph0, Math.min(1, Math.abs(v) * 1.5)); atmen(f, t, ph0);
      if (w) { f.armL.rotation.z = 1.25; f.armR.rotation.z = 1.25; w.position.set(x + Math.cos(ang) * 0.85, 0, c + dz - Math.sin(ang) * 0.85); w.rotation.y = ang; }
      const st = z.st; if (st > 0.05) { f.kopf.rotation.y = 0.55 * Math.sin(t * 4 + ph0) * smoothstep(0.08, 0.35, st); if (!w) { const h = smoothstep(0.4, 0.75, st); f.armL.rotation.z = lerp(f.armL.rotation.z, 2.55, h); f.armR.rotation.z = lerp(f.armR.rotation.z, 2.55, h); } }
      f.sh.position.x = x; f.sh.position.z = c + dz;
    });
  });
  // Stöbernde Kunden am Regal (Produkte zeigen zum Gang), reagieren auf den Druckabfall
  const browser = [[-3.6, 6.0, -1], [0, 5.2, 1], [3.6, 10.2, -1], [7.2, 8.0, 1], [-7.2, 12.0, -1], [0, 11.0, -1], [3.6, 17.0, 1], [-3.6, 17.5, 1], [7.2, 20.0, -1], [-7.2, 22.0, 1]];
  browser.forEach(([c, x, sd], i) => {
    const f = kundin({ jacke: jacken[(i + 3) % 8], hose: "#2B2F3E", haare: hash(i, 19) > 0.5 ? "#2A1E18" : "#6A3F26", groesse: 1.6 + hash(i, 18) * 0.2 });
    f.g.position.set(x, 0, c + sd * 0.8); f.g.rotation.y = sd > 0 ? Math.PI / 2 * -1 : Math.PI / 2; f.sh.position.set(x, 0.014, c + sd * 0.8);
    // sd = −1 → steht am Regal links des Gangs und schaut nach −z; sd = +1 → rechte Seite, schaut nach +z (siehe Rotation)
    f.g.rotation.y = sd < 0 ? Math.PI / 2 : -Math.PI / 2;
    const ph = hash(i, 23) * 6.283;
    leute.push((t, z) => { atmen(f, t, ph); const reach = Math.max(0, Math.sin(t * 0.7 + ph)); f.armR.rotation.z = 0.5 + 0.8 * reach; f.armL.rotation.z = 0.15; f.kopf.rotation.z = -0.1 * reach; f.kopf.rotation.y = 0.25 * Math.sin(t * 0.5 + ph); gehPose(f, 0, 0); schreck(f, z.st, t * 4.5 + ph, f.armL.rotation.z, f.armR.rotation.z); });
  });
  // Heldin: Kundin am Chipsregal mit Tüte in der Hand (kollabiert mit den anderen)
  const fA = kundin({ jacke: "#8A4F4F", hose: "#2B2F3E", haare: "#7A5A3A", groesse: 1.66 });
  fA.g.position.set(2.2, 0, -0.55); fA.g.rotation.y = Math.PI / 2; fA.sh.position.set(2.2, 0.014, -0.55);
  const tuteA = new THREE.Mesh(tuetenGeometrie(), tuetenMat); tuteA.rotation.y = Math.PI / 2; fA.ober.add(tuteA);
  leute.push((t, z) => {
    const tK = z.tKlatsch, tR = z.tRueck, st = z.st;
    atmen(fA, t, 0.4);
    let th = lerp(1.18, 0.5, smoothstep(tK + 4.0, tK + 7.0, t)); th = lerp(th, 1.18, smoothstep(tR, tR + 1.0, t));
    if (t > tK + 0.5 && t < tK + 6) th += 0.18 * Math.sin(10 * (t - tK)) * Math.exp(-(t - tK - 0.5) * 0.5) * smoothstep(0, 1, t - tK - 0.5);
    fA.armR.rotation.z = th; fA.armR.rotation.x = -0.12; fA.armL.rotation.z = 0.35 + 2.0 * smoothstep(0.55, 0.8, st) * (1 - smoothstep(tR, tR + 0.8, t)); fA.armL.rotation.x = 0.1;
    fA.kopf.rotation.z = -0.5 + 0.4 * smoothstep(0.1, 0.3, st) * (1 - smoothstep(tK, tK + 1.5, t));
    fA.kopf.rotation.y = 0.5 * Math.sin(t * 4) * smoothstep(0.1, 0.3, st) * (1 - smoothstep(tK, tK + 2, t)) + 0.35 * Math.sin((t - tK) * 5) * bump(t, tK + 2, tK + 7);
    fA.hueft.position.y = 0.84;
    tuteA.position.set(0.58 * Math.sin(th) + 0.07, 0.46 - 0.58 * Math.cos(th) - 0.34, 0.2);
  });
  // Mitarbeiterin der Backstation (hinter der Theke, Blick zur Galerie): wischt, tritt beim Sieden zurück
  const fD = kundin({ jacke: "#F4F5F7", hose: "#2B2F3E", haare: "#6A3F26", schuerze: "#17A5A0", groesse: 1.66 });
  leute.push((t, z) => {
    const k = smoothstep(0.35, 0.8, z.koch);
    atmen(fD, t, 2.0);
    fD.g.position.set(0.05 + 0.55 * k, 0, 3.1 + 0.5 * Math.sin(t * 0.25) * (1 - k)); fD.g.rotation.y = Math.PI; fD.sh.position.set(0.05 + 0.55 * k, 0.014, 3.1);
    fD.armR.rotation.z = lerp(0.95 + 0.12 * Math.sin(t * 2.6) * (1 - k), 2.4, k); fD.armR.rotation.x = lerp(0.1, 0.5, k);
    fD.armL.rotation.z = lerp(0.2, 2.2, k); fD.armL.rotation.x = lerp(-0.1, -0.5, k);
    fD.kopf.rotation.z = lerp(-0.2, 0.15, k); fD.kopf.rotation.y = lerp(0.3 * Math.sin(t * 0.8), 0, k);
    gehPose(fD, 0, 0); fD.beine[0].rotation.z = 0.3 * k; fD.beine[1].rotation.z = -0.2 * k;
  });
  // Kunde an der Theke, schaut auf den Kaffee (reagiert)
  const fE = kundin({ jacke: "#4F6A8A", hose: "#2A2F3D", haare: "#2A1E18", groesse: 1.78 });
  fE.g.position.set(-2.4, 0, 4.2); fE.g.rotation.y = 0; fE.sh.position.set(-2.4, 0.014, 4.2);
  leute.push((t, z) => { atmen(fE, t, 0.9); const k = smoothstep(0.3, 0.7, z.koch); fE.armR.rotation.z = lerp(0.3, 1.0, k); fE.kopf.rotation.z = -0.2 * k; fE.kopf.rotation.y = 0.3 * Math.sin(t * 0.6) * (1 - k); fE.g.position.x = -2.5 - 0.35 * k; fE.sh.position.x = fE.g.position.x; gehPose(fE, 0, 0); });
  const wagenX = einkaufswagen(); wagenX.position.set(-4.2, 0, 1.2); wagenX.rotation.y = 0.3; szene.add(wagenX);
  const wagenY = einkaufswagen(); wagenY.position.set(3.6, 0, 3.0); wagenY.rotation.y = 2.4; szene.add(wagenY);
  const wagenZ = einkaufswagen(); wagenZ.position.set(3.9, 0, 3.15); wagenZ.rotation.y = 2.5; szene.add(wagenZ);

  // --- Luftmoleküle (zarter Dunst: N₂ blau, O₂ koralle) ---
  const kugel = (r) => new THREE.SphereGeometry(r, 8, 6);
  const hantelGeo = (r, d) => { const a = kugel(r); a.translate(-d / 2, 0, 0); const b = kugel(r); b.translate(d / 2, 0, 0); return mergeGeometries([a, b]); };
  const mN2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(N2_FARBE).multiplyScalar(1.15), transparent: true, opacity: 0.8 });
  const mO2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(O2_FARBE).multiplyScalar(1.15), transparent: true, opacity: 0.8 });
  const ANZ = { N2: 560, O2: 150 };
  const n2Inst = new THREE.InstancedMesh(hantelGeo(0.034, 0.075), mN2, ANZ.N2), o2Inst = new THREE.InstancedMesh(hantelGeo(0.036, 0.08), mO2, ANZ.O2);
  for (const m of [n2Inst, o2Inst]) { m.frustumCulled = false; szene.add(m); }
  const BOX = { x0: -5.5, x1: 22, y0: 0.4, y1: 6.2, z0: -9.5, z1: 9.5 };
  const baueMol = (n, seed) => Array.from({ length: n }, (_, i) => { const h = (k) => hash(i, seed * 100 + k);
    return { base: V(lerp(BOX.x0, BOX.x1, h(1)), lerp(BOX.y0, BOX.y1, h(2)), lerp(BOX.z0, BOX.z1, h(3))), amp: [0.5 + h(4), 0.3 + h(5) * 0.5, 0.4 + h(6)], k: [1 + Math.floor(h(7) * 3), 1 + Math.floor(h(8) * 4), 1 + Math.floor(h(9) * 3)], ph: [h(10) * 6.283, h(11) * 6.283, h(12) * 6.283], ax: V(h(15) - 0.5, h(16) - 0.5, h(17) - 0.5).normalize(), spin: 3 + Math.floor(h(18) * 10), sp0: h(19) * 6.283, u: h(21) }; });
  const dN2 = baueMol(ANZ.N2, 1), dO2 = baueMol(ANZ.O2, 2);
  const mm = { m4: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3() };
  const stapelTmp = { m4: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), s: new THREE.Vector3(1, 1, 1) };

  return {
    szene, licht, deckeG,
    /** z: {periode, f (Stickstoff-Anteil 1…0), st (1 − f), tKlatsch, tRueck, koch (0…1), tSchub (Palette rutscht ab), eye} */
    setze(t, z) {
      const P = z.periode;
      // Moleküle
      const setzeMol = (inst, daten, n2) => {
        daten.forEach((d, i) => {
          const w = (2 * Math.PI * t) / P;
          mm.p.set(d.base.x + d.amp[0] * Math.sin(w * d.k[0] + d.ph[0]), d.base.y + d.amp[1] * Math.sin(w * d.k[1] + d.ph[1]), d.base.z + d.amp[2] * Math.sin(w * d.k[2] + d.ph[2]));
          let s = 1;
          if (n2) { s = smoothstep(d.u - 0.02, d.u + 0.05, z.f); s *= 1 + 0.5 * Math.exp(-Math.abs(z.f - d.u) * 40) * (z.f > d.u ? 0 : 1); }
          mm.q.setFromAxisAngle(d.ax, d.sp0 + (2 * Math.PI * d.spin * t) / P);
          mm.s.set(s, s, s); mm.m4.compose(mm.p, mm.q, mm.s); inst.setMatrixAt(i, mm.m4);
        });
        inst.instanceMatrix.needsUpdate = true;
      };
      setzeMol(n2Inst, dN2, true); setzeMol(o2Inst, dO2, false);
      // Tüten (Zeitlupe) und Palette
      const a = (t - z.tKlatsch) * SL, b = (t - z.tRueck) * SL * 2.5;
      setzeTueten(tuetenMat, a, b); setzeTueten(tuetenMatA, a, b);
      { const { m4, q, e, p, s } = stapelTmp; const hoehen = new Array(NL).fill(0), dicken = new Array(NL).fill(0);
        for (let n = 0; n < NL; n++) { const dly = 0.12 + (NL - 1 - n) / (NL - 1) * 1.35; const kk = tkK(a - dly) * (1 - clamp(tkAuf(b - dly * 0.6), 0, 1)); const kc = clamp(kk, 0, 1); dicken[n] = 0.1 * (1 - 0.945 * kc) + 0.005 * kc; }
        let y = 0.16; for (let n = 0; n < NL; n++) { hoehen[n] = y + dicken[n] / 2; y += dicken[n]; }
        const rutsch = smoothstep(0, 1, z.tSchub) * (1 - smoothstep(0, 1, (t - z.tRueck) / 1.5));
        stapelPos.forEach((sp, i) => {
          const lay = sp.n / (NL - 1);
          e.set(-Math.PI / 2, 0, 0.06 * rutsch * lay * (sp.ix % 2 ? 1 : -1)); q.setFromEuler(e);
          p.set(PAL.x - 0.43 + sp.ix * 0.285 + 1.0 * rutsch * lay * lay, hoehen[sp.n] + 0.5 * rutsch * lay * 0, PAL.z - 0.39 + sp.iz * 0.39 + 0.185 + 0.35 * rutsch * lay * (sp.iz - 1));
          m4.compose(p, q, s); stapel.setMatrixAt(i, m4);
        });
        stapel.instanceMatrix.needsUpdate = true;
        aktionsSchild.position.set(PAL.x + 1.0 * rutsch, y + 0.3, PAL.z - 0.67 - 0.0); aktionsSchild.rotation.y = 0; aktionsSchild.rotation.z = -0.5 * rutsch; }
      // Kaffee
      tassen.forEach((fn, i) => fn(t + i * 0.37, z.koch));
      // Menschen
      for (const f of leute) f(t, z);
      deckeG.visible = z.pov !== false;
    },
  };
}
