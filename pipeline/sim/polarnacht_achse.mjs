// Account 2 „Teil 2: Erdachse ohne Neigung – was wird aus der Polarnacht?“ (Skript acc2-2026-11-09-mittag), Longyearbyen 78,22° N.
// Rechnung nach dem Rechenweg: Deklination δ = ε·sin(2π(Tag−80)/365,2422); Sonne über dem Horizont, wenn ihre Mitte über −0,833° steht.
// Mittagshöhe h = 90° − φ + δ, Mitternachtshöhe h = φ − 90° + δ. Zeitraffer ab 8 s: 1 s = 1 Monat, 8 s = 1. Januar; ε(t) linear zwischen Ankern.
// Polarnacht-Tage werden auf den realen Startwert 113 skaliert (Modell 116, Faktor 113/116); Mitternachtssonne unskaliert (126 real = Modell).
export const PHI = 78.22, R = -0.833, T_EREIGNIS = 8, T_HIER = 58;
export const ANKER = [[0, 23.44], [8, 23.44], [20, 18.5], [32, 12.0], [44, 6.0], [52, 2.0], [58, 0.0]];
export const eps = (t) => {
  if (t <= ANKER[0][0]) return ANKER[0][1];
  for (let i = 0; i < ANKER.length - 1; i++) { const [a, ea] = ANKER[i], [b, eb] = ANKER[i + 1]; if (t >= a && t <= b) return ea + ((eb - ea) * (t - a)) / (b - a); }
  return 0;
};
export const doy = (t) => (t >= T_EREIGNIS ? (((t - T_EREIGNIS) * 365.2422) / 12) % 365.2422 : 0);
export const dekl = (e, d) => e * Math.sin((2 * Math.PI * (d - 80)) / 365.2422);
export const mittag = (e, d) => 90 - PHI + dekl(e, d);
export const mitternacht = (e, d) => PHI - 90 + dekl(e, d);
const rad = (x) => (x * Math.PI) / 180;
export function tagesLaengeStunden(delta) {
  const c = (Math.sin(rad(R)) - Math.sin(rad(PHI)) * Math.sin(rad(delta))) / (Math.cos(rad(PHI)) * Math.cos(rad(delta)));
  return c >= 1 ? 0 : c <= -1 ? 24 : (2 * (Math.acos(c) * 180) / Math.PI) / 15;
}
export function zaehle(e) {
  let pn = 0, ms = 0;
  for (let d = 0; d < 365; d++) { if (mittag(e, d) < R) pn++; if (mitternacht(e, d) > R) ms++; }
  return { polarnacht: pn, mitternachtssonne: ms };
}
const TAB = []; for (let i = 0; i <= 480; i++) TAB.push(zaehle(i * 0.05));
/** Tage mit Polarnacht bzw. Mitternachtssonne bei Achsneigung e (Tabelle, linear interpoliert; Polarnacht auf 113 skaliert) */
export function tage(e) {
  const x = Math.min(480, Math.max(0, e / 0.05)), i = Math.min(479, Math.floor(x)), f = x - i;
  const lerp = (k) => TAB[i][k] * (1 - f) + TAB[i + 1][k] * f;
  return { polarnacht: Math.round((lerp("polarnacht") * 113) / 116), mitternachtssonne: Math.round(lerp("mitternachtssonne")) };
}
export const mittagWinter = (t) => 90 - PHI - eps(t);           // Mittagshöhe am 21.12. bei ε(t)
export const mittagNull = 90 - PHI;                              // 11,78° bei ε = 0
export const tageslaengeNull = tagesLaengeStunden(0);            // 12,54 h
export const countdownText = (t) => { const s = Math.max(0, Math.ceil(T_EREIGNIS - t - 1e-9)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export const ZEITRAFFER = [{ von: 8, bis: 58, faktor: "1 s = 1 Monat" }];
