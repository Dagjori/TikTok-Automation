// Erde dreht langsamer: Sonnentag und Meeresspiegel am Äquator (Gedankenexperiment)
export const R = 6378.137, T_SID = 23.9345, T_JAHR = 365.256 * 24;
export const v0 = 2 * Math.PI * R / T_SID;
export function sonnentagH(v) { const tsid = 2 * Math.PI * R / v; return 1 / (1 / tsid - 1 / T_JAHR); }
export const vStill = 2 * Math.PI * R / T_JAHR;
export function meer(v) { return -3400 * (1 - (v / v0) ** 2); }
export function fliehHoeheM() { const w = 2 * Math.PI / (T_SID * 3600); return 0.5 * w * w * (R * 1000) ** 2 / 9.80665; }
