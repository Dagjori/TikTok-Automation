// Steuerklasse III/V gegen IV/IV, Modellpaar 4.500 € / 2.500 € brutto, 2026, kinderlos, ohne Kirche
import { netto, lohnsteuerMonat, tarif, P2026 } from "./netto.mjs";
const A = 4500, B = 2500, base = { kinderlos: true, kirche: false };
const n = (brutto, stkl) => netto({ brutto, stkl, ...base });
export function elterngeld(brutto, stkl) {
  const s = lohnsteuerMonat({ brutto, stkl, ...base });
  const e = brutto - P2026.ANP / 12 - s.lst - s.soli - brutto * 0.21;
  const q = e > 1200 ? Math.max(0.65, 0.67 - Math.floor((e - 1200) / 2) * 0.001) : 0.67;
  return +Math.min(1800, Math.max(300, Math.min(e, 2770) * q)).toFixed(2);
}
export function videoZahlen() {
  const c35 = [n(A, 3), n(B, 5)], c44 = [n(A, 4), n(B, 4)];
  const sum = (c) => c[0].netto + c[1].netto, lstJ = (c) => (c[0].lohnsteuer + c[1].lohnsteuer) * 12;
  const jahr = (A + B) * 12;
  const kvpv = (x) => x * (P2026.KV_AN_ALLG + P2026.ZUSATZBEITRAG / 200) * 0.96 + x * (P2026.PV_AN + P2026.PV_KINDERLOS);
  const zve = Math.floor(jahr - 2 * P2026.ANP - 2 * P2026.SAP - (jahr * P2026.RV_AN + kvpv(A * 12) + kvpv(B * 12)));
  const est = 2 * tarif(Math.floor(zve / 2));
  const nach35 = est - lstJ(c35), erst44 = lstJ(c44) - est;
  return { netto35: +sum(c35).toFixed(2), netto44: +sum(c44).toFixed(2), est, nach35: +nach35.toFixed(2), erst44: +erst44.toFixed(2),
    jahr35: +(sum(c35) * 12 - nach35).toFixed(2), jahr44: +(sum(c44) * 12 + erst44).toFixed(2), egV: elterngeld(B, 5), egIV: elterngeld(B, 4) };
}
