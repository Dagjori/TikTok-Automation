// Account 2 „Was wäre, wenn du 28 Jahre lang Ameisen zusiehst?“ (Skript acc2-2026-11-10-mittag)
// Schwarze Wegameise (Lasius niger), Nest unter einer Terrassenplatte. Laborrekord Königin 28 ¾ Jahre (Kutter & Stumper 1969, UF Book of Insect Records Kap. 34).
// Zeitachse (Rechenweg im Skript): Ereignis = Landung bei 2,5 s (Testblock a). Tag(t) stückweise linear:
// 2,5–9 s 0→1 Tag, 9–14 s 1→60 Tage, 14–22 s 60→365 Tage; danach Jahr(t) = 1 + (t−22)/38·27 (1,41 s je Jahr), Jahr 28 bei 60 s.
export const T_EREIGNIS = 2.5, T_HIER = 58.5, T_JAHR0 = 22, T_JAHR28 = 60, LABOR_JAHRE = 28.75, ANZEIGE_ENDE_JAHRE = 28;
const KNOTEN = [[2.5, 0], [9, 1], [14, 60], [22, 365]];
export const tag = (t) => {
  if (t <= KNOTEN[0][0]) return 0;
  for (let i = 1; i < KNOTEN.length; i++) if (t <= KNOTEN[i][0]) { const [t0, v0] = KNOTEN[i - 1], [t1, v1] = KNOTEN[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
  return 365;
};
export const jahr = (t) => (t < T_JAHR0 ? 0 : Math.min(28, 1 + ((t - T_JAHR0) / (T_JAHR28 - T_JAHR0)) * 27));
export const jahrJeSekunde = () => (T_JAHR28 - T_JAHR0) / 27;                      // 1,407 s je Jahr
export const monateJeSekunde = () => 12 / jahrJeSekunde();                         // 8,5 Monate je Sekunde
// Position im Jahr (0..1, 0 = 1. Januar) für Jahreszeiten: Start Juli (Landung), Tag 0 = Juli-Mitte.
export const jahresPos = (t) => { const d = t < T_JAHR0 ? tag(t) : 365 + (jahr(t) - 1) * 365; return ((196 + d) % 365) / 365; };
export const countdownText = (t) => { const s = Math.max(0, Math.ceil(T_EREIGNIS - t - 0.5 - 1e-9)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const tageAnzeige = (t) => Math.round(tag(t));
export const jahrAnzeige = (t) => Math.round(jahr(t));
export const ZEITRAFFER = [
  { von: 2.5, bis: 9, faktor: "1 s ≈ 4 Std." }, { von: 9, bis: 14, faktor: "1 s ≈ 12 Tage" },
  { von: 14, bis: 22, faktor: "1 s ≈ 38 Tage" }, { von: 22, bis: 60, faktor: "1 s ≈ 8,5 Monate (1 Jahr ≈ 1,4 s)" },
];
