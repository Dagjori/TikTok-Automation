// „Stell dir vor, Schall hat fünf Sekunden lang nur noch Schritttempo“ – eigene Rechnung (Account 2, Video 1).
// Gleis entlang x, Gleismitte z = 0. Du stehst bei x = 0 auf dem Bahnsteig, seitlich DU_Z vom Gleis.
// Die S-Bahn kommt aus +x und fährt mit konstantem Tempo durch (Bremsen in den 5 s vernachlässigt).
// Alle Werte in m und s. Tests: node --test sim/schall_schritttempo.test.mjs

export const C0 = 331.3 * Math.sqrt(1 + 20 / 273.15); // Schallgeschwindigkeit trockene Luft 20 °C ≈ 343,2 m/s
export const C1 = 5 / 3.6; // Szenario: Schritttempo 5 km/h ≈ 1,389 m/s
export const FAKTOR = C0 / C1; // ≈ 247
export const SZ = {
  dauer: 5, // das Szenario
  freundin: 2.0, // Abstand deiner Freundin (m)
  heyBei: 0.1, // sie ruft „Hey!“ bei τ = 0,1 s
  lautsprecher: 8.0, // Abstand zum Lautsprecher unter dem Bahnsteigdach (m)
  durchsageBei: 3.0, // Durchsage beginnt bei τ = 3 s
  bahnV: 50 / 3.6, // S-Bahn 50 km/h
  bahnStart: 60, // Zugspitze 60 m vor dir bei τ = 0
  bahnLaenge: 68, // eine Einheit ET 423 ≈ 67,4 m
  bahnHalbbreite: 1.51, // Wagenkasten ≈ 3,02 m breit
  duZ: 3.3, // du stehst 3,3 m neben der Gleismitte (1,65 m hinter der Bahnsteigkante)
  stimme: 200, // Grundton einer Stimme (Hz), typisch 100–250
  hoergrenze: 20000, // Mensch (Hz)
};

export const laufzeit = (d, c = C1) => d / c;
export const mach = (v, c = C1) => v / c;
export const machWinkelGrad = (M) => (Math.asin(1 / M) * 180) / Math.PI;
export const reichweite = (dauer = SZ.dauer, c = C1) => c * dauer;
export const nachNormal = (f) => f * FAKTOR; // Frequenz der „eingefrorenen“ Wellen, wenn c wieder C0 ist (Wellenlänge bleibt)
export const hoerbarBis = () => SZ.hoergrenze / FAKTOR; // nur Töne darunter bleiben hörbar
export const bahnSpitze = (t) => SZ.bahnStart - SZ.bahnV * t; // x der Zugspitze

/** Hey der Freundin kommt an (du stehst still) */
export const heyAn = () => SZ.heyBei + laufzeit(SZ.freundin);
/** Durchsage kommt an (in den 5 s? nein) */
export const durchsageAn = () => SZ.durchsageBei + laufzeit(SZ.lautsprecher);
/** Zugspitze auf deiner Höhe */
export const bahnBeiDir = () => SZ.bahnStart / SZ.bahnV;

/**
 * Frühester Zeitpunkt, zu dem irgendein Geräusch der S-Bahn bei dir ankommt.
 * Quellen: Punkte auf der Außenhaut (Seitenwand z = ±Halbbreite, über die ganze Länge, inkl. Stirn),
 * ausgesendet zu jeder Zeit te in [0, bis]. Ankunft = te + Abstand / C1.
 */
export function fruehesteBahnAnkunft({ bis = 8, dt = 0.005, dx = 0.25 } = {}) {
  let best = Infinity;
  for (let te = 0; te <= bis + 1e-9; te += dt) {
    const spitze = bahnSpitze(te);
    for (let s = 0; s <= SZ.bahnLaenge + 1e-9; s += dx) {
      const x = spitze + s;
      const dz = SZ.duZ - SZ.bahnHalbbreite; // nahe Seitenwand
      const d = Math.hypot(x, dz);
      const ta = te + d / C1;
      if (ta < best) best = ta;
    }
  }
  return best;
}

/** Ergebnis: Rennen S-Bahn gegen ihr eigenes Geräusch (vom Startpunkt 60 m entfernt bis zu dir) */
export function rennen() {
  const bahn = bahnBeiDir();
  const geraeusch = laufzeit(SZ.bahnStart); // entlang des Gleises bis auf deine Höhe
  return { bahn, geraeusch, vorsprung: geraeusch - bahn };
}

export function alles() {
  const r = rennen();
  return {
    c0_ms: C0, c0_kmh: C0 * 3.6, c1_kmh: C1 * 3.6, faktor: FAKTOR,
    hey_an: heyAn(), hey_laufzeit: laufzeit(SZ.freundin),
    durchsage_laufzeit: laufzeit(SZ.lautsprecher), durchsage_an: durchsageAn(),
    mach_bahn: mach(SZ.bahnV), machwinkel_grad: machWinkelGrad(mach(SZ.bahnV)),
    bahn_bei_dir: r.bahn, geraeusch_bei_dir: r.geraeusch, vorsprung: r.vorsprung,
    frueheste_bahn_ankunft: fruehesteBahnAnkunft(),
    reichweite_5s: reichweite(), stimme_danach_hz: nachNormal(SZ.stimme), hoerbar_bis_hz: hoerbarBis(),
  };
}

if (typeof process !== "undefined" && process.argv && import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(alles(), null, 2));
