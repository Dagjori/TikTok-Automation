// Kleine Roboter im Stil von Simu (Entscheidung 03.11.): schweben, tragen Pakete von Zentrale zu Zentrale, tippen an Konsolen,
// schauen auf Bildschirme, machen Pause. Wird in einem Gebäude wirklich gearbeitet (Render, Claude, Lernschleife …),
// arbeiten seine Roboter schneller und leuchten heller; sonst laufen ruhige Alltagsroutinen.
import * as THREE from "three";
import { U, LICHT_GLSL, NEBEL_GLSL, CYAN, GOLD } from "./kern.js";

// Draußen beleuchtet die Sonne (bzw. der Mond) die Roboter, drinnen festes Raumlicht
const INNEN_LICHT = {
  uSonneRichtung: { value: new THREE.Vector3(0.3, 0.9, 0.4).normalize() }, uSonneFarbe: { value: new THREE.Color(0.55, 0.5, 0.65) },
  uUmgebung: { value: new THREE.Color(0.22, 0.2, 0.32) }, uBoden: { value: new THREE.Color(0.06, 0.04, 0.1) },
  uNacht: { value: 1 }, uNebel: { value: 0 },
};
const koerperMaterial = (innen) => new THREE.ShaderMaterial({
  uniforms: { ...U, ...(innen ? INNEN_LICHT : {}), uFarbe: { value: new THREE.Color("#d9dcf2") } },
  vertexShader: `varying vec3 vN; varying vec3 vWelt; void main() { vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vWelt = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform vec3 uFarbe; ${LICHT_GLSL} ${NEBEL_GLSL} varying vec3 vN; varying vec3 vWelt;
    void main() {
      vec3 n = normalize(vN);
      vec3 f = uFarbe * (licht(n) * 0.9 + 0.12);
      // Glanzkante von hinten (Neonlicht der Stadt)
      float rand = pow(1.0 - max(dot(n, normalize(cameraPosition - vWelt)), 0.0), 3.0);
      f += lin(vec3(0.55, 0.35, 1.0)) * rand * 0.35 * (0.4 + uNacht);
      gl_FragColor = vec4(nebeln(f, vWelt), 1.0);
      #include <colorspace_fragment>
    }`,
});
const KOERPER = { draussen: koerperMaterial(false), innen: koerperMaterial(true) };
const VISIER_MAT = new THREE.MeshBasicMaterial({ color: 0x0b0a14 });
const GELENK_MAT = new THREE.MeshBasicMaterial({ color: 0x55526a });
const KISTE_MAT = new THREE.MeshBasicMaterial({ color: GOLD.clone().multiplyScalar(1.6) });

const GEO = {
  koerper: new THREE.CapsuleGeometry(0.3, 0.34, 4, 12),
  kopf: new THREE.BoxGeometry(0.66, 0.48, 0.52),
  visier: new THREE.PlaneGeometry(0.54, 0.3),
  auge: new THREE.CircleGeometry(0.065, 12),
  mund: new THREE.PlaneGeometry(0.16, 0.035),
  stab: new THREE.CylinderGeometry(0.018, 0.018, 0.26, 5),
  kugel: new THREE.SphereGeometry(0.07, 10, 8),
  arm: new THREE.CapsuleGeometry(0.07, 0.3, 3, 6),
  ring: new THREE.RingGeometry(0.16, 0.3, 24),
  kiste: new THREE.BoxGeometry(0.42, 0.34, 0.42),
  licht: new THREE.CircleGeometry(0.07, 10),
};

/** Ein Roboter (etwa 1,6 Einheiten hoch, ein halbes Stockwerk) */
export function roboterNeu({ akzent = CYAN, groesse = 1, innen = false } = {}) {
  const KOERPER_MAT = innen ? KOERPER.innen : KOERPER.draussen;
  const g = new THREE.Group();
  const huelle = new THREE.Group(); // alles, was schwebt und sich neigt
  g.add(huelle);
  const koerper = new THREE.Mesh(GEO.koerper, KOERPER_MAT);
  koerper.position.y = 0.62;
  const brustlicht = new THREE.Mesh(GEO.licht, new THREE.MeshBasicMaterial({ color: akzent.clone().multiplyScalar(2) }));
  brustlicht.position.set(0, 0.68, 0.301);
  const kopf = new THREE.Group();
  kopf.position.y = 1.18;
  const schaedel = new THREE.Mesh(GEO.kopf, KOERPER_MAT);
  const visier = new THREE.Mesh(GEO.visier, VISIER_MAT);
  visier.position.z = 0.262;
  const augenMat = new THREE.MeshBasicMaterial({ color: CYAN.clone().multiplyScalar(2.2) });
  const augen = [-0.13, 0.13].map((x) => { const a = new THREE.Mesh(GEO.auge, augenMat); a.position.set(x, 0.03, 0.265); return a; });
  const mund = new THREE.Mesh(GEO.mund, augenMat);
  mund.position.set(0, -0.08, 0.265);
  const stab = new THREE.Mesh(GEO.stab, GELENK_MAT);
  stab.position.y = 0.37;
  const antenne = new THREE.Mesh(GEO.kugel, new THREE.MeshBasicMaterial({ color: akzent.clone().multiplyScalar(2.4) }));
  antenne.position.y = 0.52;
  kopf.add(schaedel, visier, ...augen, mund, stab, antenne);
  const arme = [-1, 1].map((s) => {
    const schulter = new THREE.Group();
    schulter.position.set(s * 0.38, 0.86, 0);
    const arm = new THREE.Mesh(GEO.arm, GELENK_MAT);
    arm.position.y = -0.2;
    schulter.add(arm);
    return schulter;
  });
  const kiste = new THREE.Mesh(GEO.kiste, KISTE_MAT);
  kiste.position.set(0, 0.72, 0.42);
  kiste.visible = false;
  huelle.add(koerper, brustlicht, kopf, ...arme, kiste);
  // Schwebering unter dem Körper
  const ring = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({ color: akzent.clone().multiplyScalar(1.6), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.05;
  g.add(ring);
  g.scale.setScalar(groesse);
  return { gruppe: g, huelle, kopf, arme, kiste, antenne, augenMat, ring, phase: Math.random() * 10 };
}

const hilf = new THREE.Vector3();
/**
 * Eine Gruppe Roboter, die zwischen Stationen wechselt.
 * stationen: [{ pos, blick (Punkt), art: "tippen" | "schauen" | "pause" | "abholen" | "abgeben", gruppe? }]
 * Pakete: wer an „abholen“ war, trägt eine Kiste zur nächsten „abgeben“-Station.
 */
export class Schar {
  constructor(eltern, stationen, anzahl, o = {}) {
    this.stationen = stationen;
    this.o = { tempo: 2.4, akzent: CYAN, groesse: 1, lieferung: false, ...o };
    this.roboter = [];
    this.jubelBis = 0;
    for (let i = 0; i < anzahl; i++) {
      const r = roboterNeu({ akzent: this.o.akzente ? this.o.akzente[i % this.o.akzente.length] : this.o.akzent, groesse: this.o.groesse, innen: this.o.innen });
      const s = i % stationen.length;
      r.station = s;
      r.versatz = new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6);
      r.gruppe.position.copy(stationen[s].pos).add(r.versatz);
      r.zustand = "arbeiten";
      r.dauer = 2 + Math.random() * 6;
      r.ziel = null;
      eltern.add(r.gruppe);
      this.roboter.push(r);
    }
  }

  naechsteStation(r) {
    const st = this.stationen;
    const jetzt = st[r.station];
    if (this.o.lieferung) {
      // Abholen → irgendwo abgeben → irgendwo abholen …
      const art = r.kiste.visible ? "abgeben" : "abholen";
      const moeglich = st.map((s, i) => i).filter((i) => i !== r.station && st[i].art === art && st[i].gruppe !== jetzt.gruppe);
      if (moeglich.length) return moeglich[Math.floor(Math.random() * moeglich.length)];
    }
    let j = r.station;
    while (st.length > 1 && j === r.station) j = Math.floor(Math.random() * st.length);
    return j;
  }

  jubeln(sekunden = 3) { this.jubelBis = performance.now() + sekunden * 1000; }

  /** Neue Stationen (anderer Raum): Roboter stehen sofort dort, überzählige werden ausgeblendet */
  stationenSetzen(stationen, anzahl = this.roboter.length) {
    this.stationen = stationen;
    this.roboter.forEach((r, i) => {
      r.gruppe.visible = i < anzahl;
      r.station = i % stationen.length;
      r.kiste.visible = false;
      r.zustand = "arbeiten";
      r.dauer = 1 + Math.random() * 5;
      r.gruppe.position.copy(stationen[r.station].pos).add(r.versatz);
    });
  }

  bewegen(dt, zeit, aktiv = false) {
    const fleiss = aktiv ? 1.9 : 1;
    const jubel = performance.now() < this.jubelBis;
    for (const r of this.roboter) {
      if (!r.gruppe.visible) continue;
      const t = zeit + r.phase;
      const st = this.stationen[r.station];
      r.augenMat.color.copy(CYAN).multiplyScalar(aktiv ? 2.8 + Math.sin(t * 9) * 0.4 : 2);
      r.antenne.visible = Math.sin(t * (aktiv ? 10 : 2.5)) > -0.6;
      let neigung = 0, armL = 0.1, armR = -0.1, kopfDreh = 0, kopfNick = 0, hopser = 0;
      if (jubel) {
        armL = 2.6 + Math.sin(t * 12) * 0.3; armR = -2.6 - Math.sin(t * 12) * 0.3;
        hopser = Math.abs(Math.sin(t * 7)) * 0.35;
      } else if (r.zustand === "gehen") {
        hilf.copy(r.ziel).sub(r.gruppe.position).setY(0);
        const rest = hilf.length();
        const schritt = this.o.tempo * fleiss * dt;
        if (rest <= schritt) {
          r.gruppe.position.copy(r.ziel);
          r.zustand = "arbeiten";
          r.dauer = (aktiv ? 2 : 4) + Math.random() * (aktiv ? 4 : 9);
          const neu = this.stationen[r.station];
          if (neu.art === "abholen") r.kiste.visible = true;
          if (neu.art === "abgeben") r.kiste.visible = false;
        } else {
          r.gruppe.position.addScaledVector(hilf.normalize(), schritt);
          const soll = Math.atan2(hilf.x, hilf.z);
          r.gruppe.rotation.y += winkelDiff(soll, r.gruppe.rotation.y) * (1 - Math.exp(-dt * 8));
          neigung = 0.16 * fleiss;
          armL = Math.sin(t * 7 * fleiss) * 0.5; armR = -armL;
          if (r.kiste.visible) { armL = -1.25; armR = -1.25; }
        }
      } else {
        // An der Station: zur Blickrichtung drehen und die Tätigkeit ausführen
        if (st.blick) {
          hilf.copy(st.blick).sub(r.gruppe.position);
          r.gruppe.rotation.y += winkelDiff(Math.atan2(hilf.x, hilf.z), r.gruppe.rotation.y) * (1 - Math.exp(-dt * 5));
        }
        const art = st.art;
        if (art === "tippen") { armL = -0.9 + Math.sin(t * 14 * fleiss) * 0.25; armR = -0.9 + Math.sin(t * 14 * fleiss + 1.7) * 0.25; kopfNick = 0.18 + Math.sin(t * 3) * 0.05; }
        else if (art === "schauen") { kopfDreh = Math.sin(t * 0.7) * 0.5; kopfNick = -0.12; armL = 0.15; armR = -0.15; }
        else if (art === "abholen" || art === "abgeben") { armL = -1.1 + Math.sin(t * 5) * 0.2; armR = -1.1 - Math.sin(t * 5) * 0.2; kopfNick = 0.25; }
        else { kopfDreh = Math.sin(t * 0.4) * 0.3; kopfNick = Math.sin(t * 0.9) * 0.1 - 0.05; armL = 0.2 + Math.sin(t * 1.3) * 0.05; armR = -armL; }
        if (r.kiste.visible && art !== "abholen") { armL = -1.25; armR = -1.25; }
        r.dauer -= dt * fleiss;
        if (r.dauer <= 0) {
          r.station = this.naechsteStation(r);
          r.ziel = this.stationen[r.station].pos.clone().add(r.versatz);
          r.zustand = "gehen";
        }
      }
      r.huelle.position.y = 0.12 + Math.sin(t * 3.1) * 0.06 + hopser;
      r.huelle.rotation.x += (neigung - r.huelle.rotation.x) * (1 - Math.exp(-dt * 6));
      r.arme[0].rotation.x += (armL - r.arme[0].rotation.x) * (1 - Math.exp(-dt * 10));
      r.arme[1].rotation.x += (armR - r.arme[1].rotation.x) * (1 - Math.exp(-dt * 10));
      r.kopf.rotation.y += (kopfDreh - r.kopf.rotation.y) * (1 - Math.exp(-dt * 4));
      r.kopf.rotation.x += (kopfNick - r.kopf.rotation.x) * (1 - Math.exp(-dt * 4));
      r.ring.material.opacity = 0.45 + 0.25 * Math.sin(t * 6) + (aktiv ? 0.2 : 0);
    }
  }
}

function winkelDiff(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}
