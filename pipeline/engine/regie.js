// Kamera-Regie für Three.js: Grundbewegung + Bausteine, die sich überlagern. Alles hängt nur an t (deterministisch,
// auch die Glättung: gewichtetes Mittel über vergangene Zeitpunkte statt eines Zustands).
//
//   const regie = new Regie(kamera, (t) => ({ pos: [0, 6, 12], ziel: [0, 0, 0], fov: 32 }));
//   regie.folge({ von: "Los", bis: 12, ziel: (t) => auto.position, glaettung: 0.5 })   Ziel folgen (weich rein/raus)
//   regie.zoom({ t: "Rot", ziel: (t) => p, staerke: 0.4, halt: 0.9 })                   auf einen Moment zoomen
//   regie.hinein({ t: "Duschkopf", dauer: 0.8, ziel: [x, y, z] })                       in ein Objekt hineinfahren
//   regie.stoss({ t: "Überholt", staerke: 1 })                                           Kamerastoß (Aufprall, Stempel)
//   regie.atmen({ staerke: 0.06 })                                                       leichtes Handkamera-Atmen
//   regie.schleife({ ab: 12.4, ende: dauer - 1 / 30 })                                   letztes Bild = erstes Bild
//   regie.anwenden(t)                                                                     setzt die Kamera
// Zeitangaben dürfen Sekunden oder Stichwörter sein, wenn ein Zeitplan übergeben wird (new Regie(k, basis, { zp })).
// Jeder Baustein meldet sich im Ereignis-Protokoll (regie.ereignisse()) als Kamera-Ereignis.
import * as THREE from "three";
import { ease, feder, FEDER, clamp, lerp, fortschritt, rauschen, schleifenWert } from "./bewegung.js";

const alsArray = (v) => (Array.isArray(v) ? v : v && v.isVector3 ? [v.x, v.y, v.z] : [0, 0, 0]);
const plus = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const minus = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mal = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Zustand weich mischen (pos, ziel, fov, roll, zoom) */
export function mischeZustand(a, b, k) {
  return { pos: mix3(a.pos, b.pos, k), ziel: mix3(a.ziel, b.ziel, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll || 0, b.roll || 0, k), zoom: lerp(a.zoom ?? 1, b.zoom ?? 1, k) };
}

/** Deterministische Glättung einer Funktion der Zeit (gewichtetes Mittel über [t - fenster, t]) */
export function glaette(f, t, fenster = 0.5, n = 9) {
  if (fenster <= 0) return alsArray(f(t));
  let s = [0, 0, 0], g = 0;
  for (let k = 0; k < n; k++) {
    const x = k / (n - 1);
    const w = Math.exp(-x * x * 3); // jüngere Werte zählen mehr
    s = plus(s, mal(alsArray(f(t - x * fenster)), w));
    g += w;
  }
  return mal(s, 1 / g);
}

export { schleifenWert };

export class Regie {
  /**
   * kamera: THREE.PerspectiveCamera (oder Orthographic: dann wirkt zoom über kamera.zoom)
   * basis(t) → {pos, ziel, fov?, roll?, zoom?}; opt.zp: Zeitplan für Stichwort-Zeiten
   */
  constructor(kamera, basis, { zp = null } = {}) {
    this.kamera = kamera;
    this.basisFn = basis;
    this.zp = zp;
    this.teile = [];
    this.schleifeOpt = null;
    this._ereignisse = [];
  }
  _z(x) {
    return this.zp ? this.zp.zeit(x) : x;
  }
  _melde(e) {
    this._ereignisse.push({ typ: "kamera", quelle: "Regie", ...e });
  }
  /** Grundzustand ohne Bausteine */
  basis(t) {
    const b = this.basisFn(t);
    return { pos: alsArray(b.pos), ziel: alsArray(b.ziel), fov: b.fov ?? this.kamera.fov ?? 35, roll: b.roll || 0, zoom: b.zoom ?? 1 };
  }
  /**
   * Ziel folgen: Die Kamera behält ihren Blickwinkel aus der Grundbewegung und verschiebt sich mit dem Ziel.
   * opt: {von, bis, ziel(t) → Vec3, versatz (fester Abstand statt Grundbewegung), glaettung (s), ein/aus (Überblendzeit)}
   */
  folge({ von, bis = Infinity, ziel, versatz = null, glaettung = 0.45, ein = 0.6, aus = 0.6, anteil = 1 }) {
    const a = this._z(von), b = bis === Infinity ? Infinity : this._z(bis);
    this.teile.push({ art: "folge", a, b, f: (z, t) => {
      const w = anteil * ease.inOutCubic(fortschritt(t, a - ein * 0.5, a + ein * 0.5)) * (b === Infinity ? 1 : 1 - ease.inOutCubic(fortschritt(t, b - aus * 0.5, b + aus * 0.5)));
      if (w <= 0) return z;
      const zi = glaette(ziel, t, glaettung);
      const off = versatz ? alsArray(versatz) : minus(z.pos, z.ziel);
      return { ...z, ziel: mix3(z.ziel, zi, w), pos: mix3(z.pos, plus(zi, off), w) };
    } });
    this._melde({ t: a, art: "folgen", dauer: Number.isFinite(b) ? b - a : undefined, bisEnde: !Number.isFinite(b), klang: false });
    return this;
  }
  /**
   * Auf einen Moment zoomen: Abstand schrumpft um `staerke` (0..1) mit Feder und Überschwingen, Blick wandert zum Ziel,
   * nach `halt` Sekunden fährt die Kamera weich zurück (rueck = Dauer der Rückfahrt; halt: Infinity = bleibt).
   */
  zoom({ t, ziel = null, staerke = 0.35, halt = 1.0, rueck = 0.7, feder: f = FEDER.standard, fov = 0 }) {
    const t0 = this._z(t);
    this.teile.push({ art: "zoom", f: (z, tt) => {
      if (tt < t0) return z;
      let k = feder(tt - t0, f);
      if (halt !== Infinity) k *= 1 - ease.inOutCubic(fortschritt(tt, t0 + halt, t0 + halt + rueck));
      if (k === 0) return z;
      const zi = ziel ? alsArray(typeof ziel === "function" ? ziel(tt) : ziel) : z.ziel;
      const nz = mix3(z.ziel, zi, clamp(k));
      const off = mal(minus(z.pos, z.ziel), 1 - staerke * k);
      return { ...z, ziel: nz, pos: plus(nz, off), fov: z.fov + fov * k };
    } });
    this._melde({ t: t0, art: "zoom", dauer: halt === Infinity ? 0.8 : halt + rueck, klang: "zoom" });
    return this;
  }
  /** In ein Objekt hineinfahren (beschleunigt, Weitwinkel nimmt zu); danach meist ein Übergang. abstand: Restabstand-Anteil */
  hinein({ t, dauer = 0.9, ziel, abstand = 0.08, fov = 12 }) {
    const t0 = this._z(t);
    this.teile.push({ art: "hinein", f: (z, tt) => {
      if (tt < t0) return z;
      const k = ease.inCubic(fortschritt(tt, t0, t0 + dauer)) * 0.85 + ease.inOutSine(fortschritt(tt, t0, t0 + dauer)) * 0.15;
      const zi = alsArray(typeof ziel === "function" ? ziel(tt) : ziel);
      const nz = mix3(z.ziel, zi, ease.outCubic(fortschritt(tt, t0, t0 + dauer * 0.6)));
      const off = mal(minus(z.pos, z.ziel), lerp(1, abstand, k));
      return { ...z, ziel: nz, pos: plus(nz, off), fov: z.fov + fov * k };
    } });
    this._melde({ t: t0, art: "hinein", dauer, klang: "whoosh" });
    return this;
  }
  /** Kamerastoß: kurzes, gedämpftes Rütteln (z. B. wenn ein Stempel aufschlägt) */
  stoss({ t, staerke = 1, dauer = 0.45 }) {
    const t0 = this._z(t);
    this.teile.push({ art: "stoss", f: (z, tt) => {
      const d = tt - t0;
      if (d < 0 || d > dauer) return z;
      const a = Math.exp(-d * 9) * staerke;
      const off = minus(z.pos, z.ziel);
      const l = Math.hypot(...off) || 1;
      const s = [Math.sin(d * 2 * Math.PI * 11) * 0.012 * l * a, Math.sin(d * 2 * Math.PI * 7 + 1) * 0.009 * l * a, 0];
      return { ...z, pos: plus(z.pos, s), ziel: plus(z.ziel, mal(s, 0.4)), roll: z.roll + Math.sin(d * 2 * Math.PI * 9) * 0.012 * a };
    } });
    this._melde({ t: t0, art: "stoss", dauer: 0.2, klang: false });
    return this;
  }
  /** Leichtes Atmen (Rauschen) gegen tote Standbilder; staerke relativ zum Kameraabstand */
  atmen({ staerke = 0.05, tempo = 0.35, von = -Infinity, bis = Infinity } = {}) {
    this.teile.push({ art: "atmen", f: (z, tt) => {
      if (tt < von || tt > bis) return z;
      const off = minus(z.pos, z.ziel);
      const l = Math.hypot(...off) || 1;
      const s = [rauschen(tt * tempo, 11) * staerke * l * 0.3, rauschen(tt * tempo, 23) * staerke * l * 0.2, rauschen(tt * tempo, 37) * staerke * l * 0.2];
      return { ...z, pos: plus(z.pos, s) };
    } });
    return this;
  }
  /** Schleife: im Fenster [ab, ende] gleitet die Kamera in den Zustand von t = 0 zurück (ab ende exakt gleich) */
  schleife({ ab, ende, kurve = ease.inOutCubic }) {
    this.schleifeOpt = { ab: this._z(ab), ende: this._z(ende), kurve };
    this._melde({ t: this.schleifeOpt.ab, art: "schleife", dauer: this.schleifeOpt.ende - this.schleifeOpt.ab, klang: false }); // Klang kommt von Massstab.schleife
    return this;
  }
  /** Zustand ohne Schleife */
  _roh(t) {
    let z = this.basis(t);
    for (const teil of this.teile) z = teil.f(z, t);
    return z;
  }
  zustand(t) {
    const s = this.schleifeOpt;
    if (s && t >= s.ab) {
      const k = s.kurve(fortschritt(t, s.ab, s.ende));
      // die Bewegung läuft während der Rückfahrt gebremst weiter (wirkt wie ein Zurückspulen, nicht wie ein Standbild)
      const a = this._roh(s.ab + (t - s.ab) * (1 - k));
      return mischeZustand(a, this._roh(0), k);
    }
    return this._roh(t);
  }
  anwenden(t) {
    const z = this.zustand(t);
    const k = this.kamera;
    k.position.set(...z.pos);
    const ziel = new THREE.Vector3(...z.ziel);
    k.up.set(0, 1, 0);
    k.lookAt(ziel);
    if (z.roll) k.rotateZ(z.roll);
    if (k.isPerspectiveCamera) k.fov = z.fov;
    k.zoom = z.zoom ?? 1;
    k.updateProjectionMatrix();
    k.updateMatrixWorld();
    return z;
  }
  ereignisse() {
    return this._ereignisse.slice();
  }
}
