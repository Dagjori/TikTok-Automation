// Broadbalk Wilderness 1882–2026 (Slot acc2-2026-11-04-mittag): Anzeige-Zeitachse.
export function jahr(t) {
  if (t <= 20) return 1882 + 0.5 * t;
  if (t <= 40) return 1892 + 2.9 * (t - 20);
  if (t <= 52) return 1950 + (49 / 12) * (t - 40);
  return Math.min(2026, 1999 + 3.375 * (t - 52));
}
export const ohnePflug = (j) => j - 1881;
export const kohlenstoff = (j) => 3.39 * (j - 1881);
