// Stil 15 · Holzspielzeug gebacken: Szene aus Blender (stil_15_holz_gltf.py → holz.glb), Licht in Texturen gebacken.
// Three.js zeigt nur noch unbeleuchtete Texturen (MeshBasicMaterial) plus Tiefenunschärfe – daher schnell.
// Zug und Auto sind eigene Objekte und lassen sich frei bewegen; ihr Kontaktschatten fährt mit.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { zonen, fertig } from "./gemeinsam.js";
import { INHALT9, anzeigetafel, chip, phrase } from "./massstab.js";

const W = 1080, H = 1920;
const BASIS = "../out/stile/blender/gltf/";

async function start() {
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("leinwand"), antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.1;

  const info = await fetch(BASIS + "holz.json").then((r) => r.json());
  const gltf = await new GLTFLoader().loadAsync(BASIS + "holz.glb");
  const szene = gltf.scene;
  szene.background = new THREE.Color("#ece2d4");

  // Gebackene Textur → unbeleuchtetes Material (×2, weil halb hell gespeichert; AgX mappt danach wie Blender)
  szene.traverse((o) => {
    if (!o.isMesh) return;
    const map = o.material.map;
    if (map) { map.anisotropy = 8; map.colorSpace = THREE.SRGBColorSpace; }
    o.material = new THREE.MeshBasicMaterial({ map, color: new THREE.Color(2, 2, 2) });
  });
  const zug = szene.getObjectByName("Zug"), auto = szene.getObjectByName("Auto");

  // Weicher Kontaktschatten (fährt mit dem Fahrzeug mit)
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const g = sc.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(60,40,20,0.55)");
  grad.addColorStop(1, "rgba(60,40,20,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const schattenTex = new THREE.CanvasTexture(sc);
  function kontaktSchatten(obj, hoehe) {
    const box = new THREE.Box3().setFromObject(obj);
    const groesse = box.getSize(new THREE.Vector3());
    const mitte = box.getCenter(new THREE.Vector3());
    const m = new THREE.Mesh(new THREE.PlaneGeometry(groesse.x * 1.25, groesse.z * 1.9), new THREE.MeshBasicMaterial({ map: schattenTex, transparent: true, depthWrite: false, toneMapped: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(mitte.x, hoehe, mitte.z);
    szene.add(m);
    return m;
  }
  const fahrzeuge = [[zug, 0.122, 0.6], [auto, 0.062, 0.35]].filter(([o]) => o).map(([o, h, tempo]) => ({ o, s: kontaktSchatten(o, h), x0: o.position.x, sx0: 0, tempo }));
  fahrzeuge.forEach((f) => (f.sx0 = f.s.position.x));

  const kamera = gltf.cameras[0];
  kamera.aspect = W / H;
  kamera.updateProjectionMatrix();

  // Tiefenunschärfe wie in Cycles (angenähert)
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(1);
  composer.setSize(W, H);
  composer.addPass(new RenderPass(szene, kamera));
  composer.addPass(new BokehPass(szene, kamera, { focus: info.fokus_m, aperture: 0.006, maxblur: 0.012 }));
  composer.addPass(new OutputPass());

  const hud = document.getElementById("hud");
  anzeigetafel(hud);
  chip(hud, INHALT9.chip, { x: 712, y: 548, drehung: -3 });
  phrase(hud);
  zonen(hud);

  // Beweis der Animierbarkeit: renderAt(t) schiebt Zug und Auto weiter (Startbild t = 0)
  fertig((t) => {
    for (const f of fahrzeuge) {
      f.o.position.x = f.x0 + t * f.tempo;
      f.s.position.x = f.sx0 + t * f.tempo;
    }
    composer.render();
  });
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
