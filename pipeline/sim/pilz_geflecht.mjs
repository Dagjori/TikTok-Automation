// Account 2 „Was wäre, wenn du 2.400 Jahre einem Pilzgeflecht zusiehst?“ (Skript acc2-2026-11-09-abend)
// Dunkler Hallimasch (Armillaria ostoyae), Malheur National Forest, Oregon: 965 ha, Alter mindestens 2.400 Jahre (Guinness; Ferguson et al. 2003).
// Zeitraffer ab 8 s: 2.400 Jahre bis 60 s → Jahr(t) = 2400·(t−8)/52 (46,15 Jahre/s). Modell (A): gleichmäßige Ausbreitung nach außen, Fläche ∝ Jahr².
export const T_EREIGNIS = 8, T_HIER = 58, T_ENDE = 60, JAHRE = 2400, HA_ENDE = 965, FELD_HA = (105 * 68) / 10000;   // 0,714 ha
export const jahr = (t) => (t <= T_EREIGNIS ? 0 : Math.min(JAHRE, (JAHRE * (t - T_EREIGNIS)) / (T_ENDE - T_EREIGNIS)));
export const flaeche = (t) => HA_ENDE * (jahr(t) / JAHRE) ** 2;                   // Hektar
export const felder = (t) => flaeche(t) / FELD_HA;                                // Fußballfelder
export const radiusM = (t) => Math.sqrt((flaeche(t) * 10000) / Math.PI);          // Meter (Kreis gleicher Fläche)
export const countdownText = (t) => { const s = Math.max(0, Math.ceil(T_EREIGNIS - t - 1e-9)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const ZEITRAFFER = [{ von: 8, bis: 60, faktor: "1 s = 46 Jahre" }];
