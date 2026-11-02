// Rechnung „Was wäre, wenn wir wieder in eine Eiszeit steuern?“ (Account 2, a2-eiszeit-toronto)
// Modell (vereinfacht, Quellen und Annahmen in projekte/a2-eiszeit-toronto/skript.json):
//   Die Erde kühlt vom heutigen Zustand in den Zustand des Letzten Glazialen Maximums (LGM).
//   LGM: weltweit −6,1 °C (Tierney et al. 2020), Meeresspiegel −130 m (Lambeck et al. 2014: −120 … −134 m),
//   Eis über Toronto ca. 2.100 m (Rekonstruktion Dyke et al. 2002).
//   Zeitraffer nach dem letzten Eiszeitzyklus: Beginn vor ca. 115.000 Jahren, Eis über Toronto ab ca. 25.000 Jahren vor heute,
//   Maximum vor ca. 21.000 Jahren → Eisrand erreicht Toronto nach 90.000 Jahren, Maximum nach 94.000 Jahren (A).
//   Eisrand rückt zuletzt mit ca. 100 m pro Jahr vor (S); weiße Linie am Horizont ab ca. 130 km (Erdkrümmung, Eis 2 km hoch).
// Alle Zeitpunkte und Anzeige-Werte des Videos kommen aus diesen Funktionen (Video-Zeit t in s).

export const LGM_T = -6.1;          // °C weltweit gegenüber heute (vorindustriell), Tierney 2020 (95 %: −6,5 … −5,7)
export const LGM_MEER = -130;       // m, Lambeck 2014 (−120 … −134)
export const EIS_TORONTO = 2100;    // m Eisdicke über Toronto im LGM (Dyke et al. 2002, S)
export const J_HIER = 90000;        // Jahre bis der Eisrand Toronto erreicht (A)
export const J_LGM = 94000;         // Jahre bis zum Maximum (A)
export const RAND_V = 0.1;          // km pro Jahr Vorstoß des Eisrands kurz vor Toronto (S: 50–200 m/Jahr)
export const D_LINIE = 125;         // km: ab hier ragt das Eis über den Horizont (Rechnung erhebungGrad(), Kimmtiefe)
export const AUGE = 151.6;          // m: Augenhöhe auf der Dachterrasse (Dach 150 m)
export const R_ERDE = 6371;         // km
export const K_REFRAKTION = 0.13;

// Video-Zeitplan (s)
export const T = { titelAus: 4.4, sommerEnde: 14.2, phase2: 24.0, seeFriert: 28.3, seeZu: 32.3, linie: 37.7, wandHoeher: 51.8, hier: 60.4, ende: 70 };
export const D_FRONT_V = 0.35;      // km/s Annäherung im Bild kurz vor „HIER“ (Video-Zeit)

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };

// Eisrand: Entfernung zur Dachterrasse in km. D(τ) = a·τ + c·τ^p mit τ = t_HIER − t; D(t_Linie) = 130 km, D(t_wandHoeher) ≈ 5,5 km.
const TAU0 = T.hier - T.linie;
const TAU1 = T.hier - T.wandHoeher;
const D1 = 5.5;
export const P_FRONT = Math.log((D_LINIE - D_FRONT_V * TAU0) / (D1 - D_FRONT_V * TAU1)) / Math.log(TAU0 / TAU1);
export const C_FRONT = (D1 - D_FRONT_V * TAU1) / Math.pow(TAU1, P_FRONT);
export function eisrandKm(t) {
  if (t >= T.hier) return 0;
  const tau = T.hier - t;
  if (tau <= TAU0) return D_FRONT_V * tau + C_FRONT * Math.pow(tau, P_FRONT);
  // vor der weißen Linie: gleichmäßiger Vorstoß aus dem Norden (für die Welt, nicht angezeigt)
  return D_LINIE + (jahre(T.linie) - jahre(t)) * 0.017;
}

// Jahre ab heute. 0–37,7 s: beschleunigter Zeitraffer bis zum Erscheinen der Linie; danach aus dem Vorstoß des Eisrands; nach HIER bis zum Maximum.
const J_LINIE = J_HIER - D_LINIE / RAND_V; // 88.750
export function jahre(t) {
  if (t <= 0) return 0;
  if (t < T.linie) return J_LINIE * Math.pow(t / T.linie, 2.2);
  if (t < T.hier) return J_HIER - eisrandKm(t) / RAND_V;
  return J_HIER + (J_LGM - J_HIER) * smooth(T.hier, T.ende, t);
}
export const temperatur = (j) => LGM_T * Math.pow(clamp(j / J_LGM), 0.75);          // °C gegenüber heute
export const meeresspiegel = (j) => LGM_MEER * Math.pow(clamp(j / J_LGM), 0.9);     // m gegenüber heute
// Eisdicke über der Dachterrasse nach HIER (Nachspiel): wächst auf 2.100 m bis zum Maximum
export const eisUeberDir = (t) => (t < T.hier ? 0 : EIS_TORONTO * smooth(T.hier, T.ende, t));

// Sichtbarkeit über dem Horizont: höchster Erhebungswinkel (Grad) eines Eisschilds, dessen Rand D km entfernt ist.
// Profil der Eisoberfläche nach Nye (plastisch): h(s) = √(2·τ₀·s/(ρ·g)), τ₀ = 100 kPa, begrenzt auf 3.000 m. Erdkrümmung mit Refraktion.
export const nyeHoehe = (sKm, tau0 = 1e5) => Math.min(3000, Math.sqrt((2 * tau0 * sKm * 1000) / (917 * 9.81)));
export const kimmGrad = () => -Math.sqrt((2 * AUGE / 1000 * (1 - K_REFRAKTION)) / R_ERDE) * 180 / Math.PI;
export function erhebungGrad(Dkm) {
  let best = -90;
  for (let s = 0.5; s <= 600; s += 0.5) {
    const d = Dkm + s, fall = ((d * d) / (2 * R_ERDE)) * (1 - K_REFRAKTION) * 1000;
    const w = Math.atan((nyeHoehe(s) - AUGE - fall) / (d * 1000)) * 180 / Math.PI;
    if (w > best) best = w;
  }
  return best;
}

// Jahreszeiten im Bild (Stichproben: je ein Winter als Puls, die Sommer werden kürzer, ab 23,6 s bleibt der Schnee)
const WINTER = [[15.0, 17.2], [19.0, 22.2], [23.4, 99]];
export function schnee(t) {
  let s = 0;
  for (const [a, b] of WINTER) s = Math.max(s, smooth(a - 0.5, a + 0.4, t) * (1 - smooth(b - 0.3, b + 0.6, t)));
  if (t > 25.0 && t < 26.8) s = Math.max(0.78, s - 0.22 * Math.sin(Math.PI * (t - 25.0) / 1.8)); // letzter kurzer Sommer: Schnee bleibt liegen
  return s;
}
export const sommerLicht = (t) => 1 - schnee(t) * 0.9 + (t > 25.0 && t < 26.8 ? 0.55 * Math.sin(Math.PI * (t - 25.0) / 1.8) : 0);
export const schneeTiefe = (t) => smooth(23.4, 37.0, t);                         // Schneedecke auf Dächern 0 → 1 (Dächer verschwinden)
export const seeEis = (t) => Math.max(0.025 * Math.max(0, schnee(t) - 0.5) * 2, smooth(T.seeFriert, T.seeZu, t)); // vor 28,3 s nur Randeis am Ufer

// Messwert-Anzeige (Etikett, Zahl, Einheit, Unterzeile, Wert für die Prüfung)
const de = (x, nk = 0) => new Intl.NumberFormat("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk }).format(x);
const minus = (s) => s.replace(/^-/, "−");
export function jahreText(j) {
  if (j < 1) return "heute";
  const r = j < 1000 ? Math.round(j / 10) * 10 || 10 : Math.round(j / 100) * 100;
  return `in ${de(r)} Jahren`;
}
export function anzeige(t) {
  const j = jahre(t);
  if (t < T.phase2) { const v = temperatur(j); return { etikett: "Abkühlung weltweit", zahl: minus(de(v, 1)).replace(/^−0,0$/, "0,0"), einheit: "°C", unter: jahreText(j), wert: v }; }
  if (t < T.linie) { const v = meeresspiegel(j); return { etikett: "Meeresspiegel", zahl: minus(de(v, 0)), einheit: "m", unter: `weltweit, ${jahreText(j)}`, wert: v }; }
  if (t < T.hier) { const d = eisrandKm(t); return { etikett: "Eisrand", zahl: d >= 10 ? de(d, 0) : de(d, 1), einheit: "km", unter: `weltweit ${minus(de(temperatur(j), 1))} °C`, wert: d }; }
  return { etikett: "Eisrand", zahl: "HIER", einheit: "", unter: "", wert: 0 };
}
