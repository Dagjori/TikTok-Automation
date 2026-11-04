// Erdachse ohne Neigung: Mittagshöhe und Tageslänge bei 50,7° N
const rad = Math.PI / 180, PHI = 50.7;
export const mittag = (dekl) => 90 - PHI + dekl;
export const tagH = (dekl) => 2 * Math.acos(-Math.tan(PHI * rad) * Math.tan(dekl * rad)) / rad / 15;
