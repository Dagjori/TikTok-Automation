// Account 2 „Was wäre, wenn die Sonne in diesem Moment erlischt?“ (Skript acc2-2026-11-07-abend)
// Rechnung als Code nach daten.skript.rechenweg:
//   Lichtlaufzeit 1 AE = 499,0 s (IAU/JPL), Bahnradien NASA (Mio. km): Venus 108,2 · Erde 149,6 · Mars 228,0 · Jupiter 778,5 · Saturn 1.432,0.
//   Konstellation (Annahme A): Venus in größter Elongation (d = √(1 − r²)), äußere Planeten in Quadratur (d = √(r² − 1)).
//   Ein Planet erlischt für uns (r + d − 1) · 499 s nach dem Sonnenlicht; der Mond nach 1,28 s (384.400 km).
//   Video-Zeitachse: 8–12 s ×1 · 12–24 s ×20 · 24–34 s ×75 · ab 34 s ×300 (Sekunden Welt je Videosekunde).
export const LICHT_S_PRO_AE = 499.0;
export const AE_MIO_KM = 149.6;
export const BAHN_MIO_KM = { venus: 108.2, mars: 228.0, jupiter: 778.5, saturn: 1432.0 };
export const MOND_KM = 384400, C_KM_S = 299792.458;
export const T_EREIGNIS = 8;                       // Videosekunde: letztes Sonnenlicht erreicht die Erde (Countdown-Null)
export const T_HIER = 60.8;                        // Videosekunde: Saturn erlischt (Höhepunkt, Anzeige „HIER“)
export const ZEITRAFFER = [                        // {von, bis, faktor}: Welt-Sekunden je Videosekunde
  { von: 8, bis: 12, faktor: 1 }, { von: 12, bis: 24, faktor: 20 }, { von: 24, bis: 34, faktor: 75 }, { von: 34, bis: 80, faktor: 300 },
];

/** Abstand Erde–Planet (AE) in der angenommenen Konstellation */
export const radiusAE = (name) => BAHN_MIO_KM[name] / AE_MIO_KM;
export const abstandAE = (name) => { const r = radiusAE(name); return name === "venus" ? Math.sqrt(1 - r * r) : Math.sqrt(r * r - 1); };
/** Sekunden nach dem letzten Sonnenlicht, bis der Planet für uns erlischt */
export const erloeschenS = (name) => (name === "mond" ? MOND_KM / C_KM_S : (radiusAE(name) + abstandAE(name) - 1) * LICHT_S_PRO_AE);
/** Weg Sonne → Planet → Erde in AE */
export const wegAE = (name) => radiusAE(name) + abstandAE(name);

/** Welt-Sekunden seit dem Ereignis bei Videosekunde t */
export function simSeit(t) {
  if (t <= T_EREIGNIS) return 0;
  let s = 0;
  for (const z of ZEITRAFFER) { if (t <= z.von) break; s += (Math.min(t, z.bis) - z.von) * z.faktor; }
  return s;
}
/** Videosekunde, in der die Welt-Sekunde s erreicht ist (Umkehrung von simSeit) */
export function videoAus(s) {
  let rest = s;
  for (const z of ZEITRAFFER) { const w = (z.bis - z.von) * z.faktor; if (rest <= w) return z.von + rest / z.faktor; rest -= w; }
  return Infinity;
}
export const faktorBei = (t) => (t < T_EREIGNIS ? 1 : (ZEITRAFFER.find((z) => t >= z.von && t < z.bis) || ZEITRAFFER[ZEITRAFFER.length - 1]).faktor);
/** Videosekunde, in der der Himmelskörper erlischt */
export const erloeschtBei = (name) => videoAus(erloeschenS(name));
/** Ist der Himmelskörper bei Videosekunde t noch sichtbar (nach dem Ereignis)? */
export const leuchtet = (name, t) => t < T_EREIGNIS || simSeit(t) < erloeschenS(name);

// Phase 1: Countdown bis zum letzten Sonnenlicht (Anzeige m:ss) und „Sonne erloschen vor …“ (Statuszeile)
export const countdown = (t) => Math.max(0, T_EREIGNIS - t);
export const vorS = (t) => Math.min(LICHT_S_PRO_AE, LICHT_S_PRO_AE - countdown(t));   // 491 s bei 0 s, 499 s bei 8 s
// Phase 2: „DUNKEL SEIT“ = Welt-Sekunden seit dem Ereignis; Phase 3: zweiter Countdown bis Saturn erlischt
export const dunkelSeit = (t) => simSeit(t);
export const saturnCountdown = (t) => Math.max(0, erloeschenS("saturn") - simSeit(t));
