// Solaranlage mit/ohne Akku (Slot acc1-2026-11-04-mittag). Quellen intern in skript.json.
export const P = { verbrauch: 4000, ertrag: 10240, preis: 0.373, einsp: 0.077,
  autOhne: 0.3736, autMit: 0.78712, // HTW-Tabelle ungerundet (gerundet 78,7 %)
  evqOhne: 0.1457, evqMit: 0.3379, akku: 4800, leben: 15 };
export const wertJahr = (aut, evq) => aut * P.verbrauch * P.preis + P.ertrag * (1 - evq) * P.einsp;
export const ohne = () => wertJahr(P.autOhne, P.evqOhne);
export const mit = () => wertJahr(P.autMit, P.evqMit);
export const mehr = () => mit() - ohne();
export const abstand = (j, akku = P.akku) => Math.min(j, P.leben) * mehr() - akku; // Jonas − Lena
export function videoZahlen() {
  return { ohne: ohne(), mit: mit(), mehr: mehr(), gleichstand: P.akku / mehr(),
    lena20: 20 * ohne(), jonas20: 20 * ohne() + abstand(20), diff20: abstand(20),
    teuer: abstand(20, 6600), billig: abstand(20, 3000), plusProzent: mehr() / ohne() };
}
