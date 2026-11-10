// Testprojekt (nicht posten): Welt „Bergsee im Herbstwald“ (engine/welt_bergsee.js) in allen Stimmungen, ohne Stimme und ohne Ton.
//   0 s Herbstnachmittag (Blick Nord) · 3 s Sonnenuntergang · 6 s Nacht mit Polarlicht am Nordhimmel · 9 s Polarlicht im Zenit (Blick steil nach oben)
//   12 s fahle Morgendämmerung mit Nebel · 15 s Kompassnahaufnahme (Tag, Nadel zittert) · 18 s Kompassnahaufnahme (Nacht, Polarlicht, Leuchtpunkte)
//   21 s Sonnenuntergang Blick West (Himmelsglut) · 24 s Enten fliegen auf (Tele) · 27 s Tele aufs Nordufer (Uferlinie in der Spiegelung)
// Render: cd pipeline && node render.js projekte/_test-bergsee --zeiten 0,3,6,9,12,15,18,21,24 --worker 1 --gpu
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { aktiviereHoehenNebel } from "../../engine/stil_lunar_pov.js";
import { Bergsee, KOMPASS, richtung, verlauf, nadelKurve } from "../../engine/welt_bergsee.js";

const FPS = 30, DAUER = 30;
const Q = new URLSearchParams(location.search);
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;

const PHASEN = [
  { bis: 2, yaw: 0, pitch: -3, fov: 58, s: 0.0 },
  { bis: 5, yaw: -8, pitch: 1, fov: 58, s: 0.31 },
  { bis: 8, yaw: 0, pitch: 9, fov: 62, s: 0.66 },
  { bis: 11, yaw: 0, pitch: 62, fov: 66, s: 0.8 },
  { bis: 14, yaw: 4, pitch: -2, fov: 58, s: 0.985 },
  { bis: 17, kompass: true, fov: 30, s: 0.05, nadel: { zittern: 0.8, wandern: 0.5 } },
  { bis: 20, kompass: true, fov: 30, s: 0.74, nadel: { winkel: 0, zittern: 0.15 } },
  { bis: 23, yaw: -62, pitch: 2, fov: 58, s: 0.31 },
  { bis: 26, yaw: -4, pitch: -1, fov: 24, s: 0.08, flucht: 22.6 },
  { bis: 99, yaw: 2, pitch: 0, fov: 5, s: 0.31 },
];

async function start() {
  aktiviereHoehenNebel({ abfall: 0.0012, basis: 0 });
  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: 0, schatten: SCHATTEN > 0, tiefe: true });
  const szene = new THREE.Scene();
  const kam = new THREE.PerspectiveCamera(58, 1080 / 1920, 0.03, 40000);
  const welt0 = new Bergsee(szene, { schatten: SCHATTEN });
  const ziel = new THREE.Vector3();

  const welt = { szene, kamera: kam, post: {}, update(t) {
    const P = PHASEN.find((p) => t < p.bis);
    const pos = welt0.augePos(t);
    if (P.kompass) {                                                     // über die Schulter nach unten auf den Kompass
      const m = KOMPASS.mitte; kam.position.set(m[0] - 0.05, m[1] + 0.3, m[2] + 0.27);
      kam.fov = P.fov; kam.updateProjectionMatrix(); kam.lookAt(ziel.set(m[0], m[1], m[2] - 0.01));
    } else {
      const d = richtung(P.yaw, P.pitch);
      kam.position.set(...pos); kam.fov = P.fov; kam.updateProjectionMatrix();
      kam.lookAt(ziel.set(pos[0] + d[0] * 100, pos[1] + d[1] * 100, pos[2] + d[2] * 100));
    }
    kam.updateMatrixWorld();
    const v = verlauf(P.s);
    welt0.update(t, { kamera: kam, wind: 0.5, ...v, nadel: P.nadel || nadelKurve(t, { nordBis: 99 }), entenFlucht: P.flucht ?? null });
    Object.assign(welt.post, welt0.post, { vignette: 0.12, koernung: 0.008, tiltStaerke: 0 },
      P.kompass ? { tiefeNah: 1.2, fokusNah: 0.2, tiefeFern: 1.0, fokusFern: 0.5 } : { tiefeNah: 0.8, fokusNah: 0.9, tiefeFern: 0, fokusFern: 1e9 });
  } };

  window.renderAt = (t) => { buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t }); };
  window.dauer = DAUER; window.ereignisse = []; window.klangEreignisse = []; window.klangteppich = "keiner";
  window.modell = { vertices: welt0.vertices, baeumeNah: welt0.baumNah, baeumeFern: welt0.baumFern, schilf: welt0.schilfZahl };
  window.renderAt(0);
  window.__fertig = true;
}
start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
