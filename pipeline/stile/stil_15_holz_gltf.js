// Stil 15 · Holzspielzeug gebacken: Szene aus Blender (stil_15_holz_gltf.py → holz.glb), Licht in Texturen gebacken.
// Three.js zeigt nur noch unbeleuchtete Texturen (MeshBasicMaterial) plus Tiefenunschärfe – daher schnell.
// Zug und Auto sind eigene Objekte und lassen sich frei bewegen; ihr Kontaktschatten fährt mit.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
  const szene = new THREE.Scene(); // gltf.scene ist nur eine Gruppe: overrideMaterial und background brauchen eine echte Szene
  szene.add(gltf.scene);
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

  // Tiefenunschärfe wie in Cycles (angenähert, günstig): Farbe in voller Auflösung mit MSAA, Abstand zur Kamera
  // in halber Auflösung, Unschärfe in zwei Stufen (1/2 und 1/4 Auflösung), Mischung je Pixel nach Abstand zur Fokusebene.
  const ohneDof = new URLSearchParams(location.search).has("ohneDof");
  const rtFarbe = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
  const rtTiefe = new THREE.WebGLRenderTarget(W / 2, H / 2, { type: THREE.HalfFloatType });
  const rtB1a = new THREE.WebGLRenderTarget(W / 2, H / 2, { type: THREE.HalfFloatType });
  const rtB1b = rtB1a.clone();
  const rtB2a = new THREE.WebGLRenderTarget(W / 4, H / 4, { type: THREE.HalfFloatType });
  const rtB2b = rtB2a.clone();
  const tiefeMat = new THREE.ShaderMaterial({
    vertexShader: "varying float vD; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vD = -mv.z; gl_Position = projectionMatrix * mv; }",
    fragmentShader: "varying float vD; void main(){ gl_FragColor = vec4(vD, 0.0, 0.0, 1.0); }",
  });
  const quadKam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const quadSzene = new THREE.Scene();
  quadSzene.add(quad);
  const VS = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const blurMat = new THREE.ShaderMaterial({
    uniforms: { tQuelle: { value: null }, schritt: { value: new THREE.Vector2() } },
    vertexShader: VS,
    fragmentShader: `uniform sampler2D tQuelle; uniform vec2 schritt; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tQuelle, vUv).rgb * 0.227;
        c += (texture2D(tQuelle, vUv + schritt * 1.385).rgb + texture2D(tQuelle, vUv - schritt * 1.385).rgb) * 0.316;
        c += (texture2D(tQuelle, vUv + schritt * 3.231).rgb + texture2D(tQuelle, vUv - schritt * 3.231).rgb) * 0.070;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const mischMat = new THREE.ShaderMaterial({
    uniforms: { tScharf: { value: rtFarbe.texture }, tB1: { value: rtB1b.texture }, tB2: { value: rtB2b.texture }, tTiefe: { value: rtTiefe.texture },
      fokus: { value: info.fokus_m }, staerke: { value: 1.2 } },  // 1,2 ≈ Zerstreuungskreis bei 46 mm, f/1.1 (wie Cycles) geteilt durch 24 px
    vertexShader: VS,
    fragmentShader: `uniform sampler2D tScharf, tB1, tB2, tTiefe; uniform float fokus, staerke; varying vec2 vUv;
      void main(){ float d = texture2D(tTiefe, vUv).r; float coc = d < 0.01 ? 1.0 : clamp(abs(d - fokus) / d * staerke, 0.0, 1.0);
        vec3 c = texture2D(tScharf, vUv).rgb;
        c = mix(c, texture2D(tB1, vUv).rgb, smoothstep(0.12, 0.4, coc));
        c = mix(c, texture2D(tB2, vUv).rgb, smoothstep(0.4, 0.95, coc));
        gl_FragColor = vec4(c, 1.0);
        #ifdef TIEFE_ZEIGEN
        gl_FragColor = vec4(vec3(d / 8.0), 1.0);
        #endif
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  mischMat.toneMapped = true;
  if (new URLSearchParams(location.search).has("tiefe")) mischMat.defines.TIEFE_ZEIGEN = 1;
  const pass = (mat, ziel) => { quad.material = mat; renderer.setRenderTarget(ziel); renderer.render(quadSzene, quadKam); };
  const blur = (quelle, a, b, w, h) => {
    blurMat.uniforms.tQuelle.value = quelle; blurMat.uniforms.schritt.value.set(1 / w, 0); pass(blurMat, a);
    blurMat.uniforms.tQuelle.value = a.texture; blurMat.uniforms.schritt.value.set(0, 1 / h); pass(blurMat, b);
  };
  function zeichne() {
    if (ohneDof) { renderer.setRenderTarget(null); renderer.render(szene, kamera); return; }
    renderer.setRenderTarget(rtFarbe); renderer.render(szene, kamera);
    szene.overrideMaterial = tiefeMat; renderer.setRenderTarget(rtTiefe); renderer.render(szene, kamera); szene.overrideMaterial = null;
    blur(rtFarbe.texture, rtB1a, rtB1b, W / 2, H / 2);
    blur(rtB1b.texture, rtB2a, rtB2b, W / 4, H / 4);
    blur(rtB2b.texture, rtB2a, rtB2b, W / 4, H / 4);
    pass(mischMat, null);
  }

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
    zeichne();
  });
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
