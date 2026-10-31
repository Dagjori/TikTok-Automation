// Bewegung: Easing, Federn, deterministischer Zufall, Keyframes.
// Alles ist eine reine Funktion der Zeit, damit jedes Bild für sich gerendert werden kann.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
/** Fortschritt 0..1 von t zwischen a und b */
export const fortschritt = (t, a, b) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
/** Wert von [a0,a1] auf [b0,b1] abbilden (begrenzt) */
export const abbilden = (x, a0, a1, b0, b1, e = ease.linear) => lerp(b0, b1, e(fortschritt(x, a0, a1)));
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - (1 - t) ** 3,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  outQuart: (t) => 1 - (1 - t) ** 4,
  inOutQuart: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  outQuint: (t) => 1 - (1 - t) ** 5,
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
  inExpo: (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outBack: (t, s = 1.70158) => 1 + (s + 1) * (t - 1) ** 3 + s * (t - 1) ** 2,
  inBack: (t, s = 1.70158) => (s + 1) * t * t * t - s * t * t,
  /** sanfter Start, langes Ausrollen – gut für Kamerafahrten */
  kamera: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2) * 0.35 + (1 - (1 - t) ** 4) * 0.65,
};

/**
 * Gedämpfte Feder (Sprungantwort 0 → 1) in geschlossener Form.
 * dt: Sekunden seit Start. frequenz in Hz, daempfung 0..1 (kleiner = mehr Überschwingen).
 */
export function feder(dt, { frequenz = 2.2, daempfung = 0.42 } = {}) {
  if (dt <= 0) return 0;
  const w = 2 * Math.PI * frequenz;
  const z = clamp(daempfung, 0.01, 0.999);
  const wd = w * Math.sqrt(1 - z * z);
  const e = Math.exp(-z * w * dt);
  return 1 - e * (Math.cos(wd * dt) + ((z * w) / wd) * Math.sin(wd * dt));
}
/** Feder-Presets */
export const FEDER = {
  weich: { frequenz: 1.6, daempfung: 0.6 },
  standard: { frequenz: 2.2, daempfung: 0.42 },
  knackig: { frequenz: 3.0, daempfung: 0.38 },
  pop: { frequenz: 3.6, daempfung: 0.3 },
};

/** Ein-/Ausblende-Hüllkurve: 0 vor ein, Feder hoch ab ein, Ease-in runter ab aus */
export function huelle(t, ein, aus = Infinity, { feder: f = FEDER.standard, ausDauer = 0.3 } = {}) {
  if (t < ein) return 0;
  const hoch = feder(t - ein, f);
  if (t < aus) return hoch;
  return hoch * (1 - ease.inCubic(fortschritt(t, aus, aus + ausDauer)));
}

// ---------- deterministischer Zufall ----------
export function zufall(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Hash einer Ganzzahl → 0..1 (stabil, ohne Zustand) */
export function hash(i, seed = 0) {
  let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
/** glattes 1D-Rauschen (-1..1), z. B. für leichtes Kamera-Atmen */
export function rauschen(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i, seed) * 2 - 1, hash(i + 1, seed) * 2 - 1, u);
}

/**
 * Keyframes interpolieren. keys: [{t, v: Zahl|Array, e: easing}] (sortiert). e gilt für das Stück, das am Key endet.
 */
export function keyframes(keys, t) {
  if (t <= keys[0].t) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (t <= k.t) {
      const a = keys[i - 1];
      const p = (k.e || ease.inOutCubic)(fortschritt(t, a.t, k.t));
      if (Array.isArray(a.v)) return a.v.map((x, j) => lerp(x, k.v[j], p));
      return lerp(a.v, k.v, p);
    }
  }
  return keys[keys.length - 1].v;
}
