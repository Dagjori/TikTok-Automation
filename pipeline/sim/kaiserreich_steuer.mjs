// „Kaiserreich oder heute: Wer zahlt bei gleichem Gehalt mehr Steuern?“ (Simulierbar, Slot acc1-2026-11-08-mittag)
// Rechnung: preußischer Einkommensteuertarif 1891 (§ 17 Stufentarif) mit Kaufkraft 1 Mark (1900) = 8,50 € (Bundesbank)
// und Gemeindezuschlag 100 % (Berlin 1913) gegen § 32a EStG 2026. Dasselbe zu versteuernde Einkommen (zvE) in beiden Fällen.
// Alles reine Funktionen; die Szene liest alle Bildzahlen von hier.

export const KAUFKRAFT = 8.5; // € je Mark von 1900
export const ZUSCHLAG = 1.0; // Gemeindezuschlag 100 %
export const BRUTTO = 54066; // mittlerer Bruttojahresverdienst Vollzeit 2025 (Destatis)

// Tarif 1891 § 17: [von, bis, Steuer in Mark] für zu versteuerndes Einkommen in Mark (bis 900 steuerfrei)
export const STUFEN = [
  [900, 1050, 6], [1050, 1200, 9], [1200, 1350, 12], [1350, 1500, 16], [1500, 1650, 21], [1650, 1800, 26],
  [1800, 2100, 31], [2100, 2400, 36], [2400, 2700, 44], [2700, 3000, 52], [3000, 3300, 60], [3300, 3600, 70],
  [3600, 3900, 80], [3900, 4200, 92], [4200, 4500, 104], [4500, 5000, 118], [5000, 5500, 132], [5500, 6000, 146],
  [6000, 6500, 160], [6500, 7000, 176], [7000, 7500, 192], [7500, 8000, 212], [8000, 8500, 232], [8500, 9000, 252],
  [9000, 9500, 276], [9500, 10500, 300],
];

/** Staatssteuer in Mark nach dem Tarif von 1891 für ein zvE in Mark. */
export function steuerMark1891(mark) {
  if (mark <= 900) return 0;
  for (const [a, b, s] of STUFEN) if (mark > a && mark <= b) return s;
  let t = 300, g = 10500;
  while (g < mark) {
    if (g < 30500) { g += 1000; t += 30; }
    else if (g < 32000) { g += 1500; t += 60; }
    else if (g < 78000) { g += 2000; t += 80; }
    else if (g < 100000) { g += 2000; t += 100; }
    else if (g < 105000) { g = 105000; t = 4000; }
    else { g += 5000; t += 200; }
  }
  return t;
}

/** Einkommensteuer 1900 in Euro-Kaufkraft: Staatssteuer × 8,5, optional mit Gemeindezuschlag. */
export function steuer1900(zveEuro, { zuschlag = ZUSCHLAG } = {}) {
  const mark = zveEuro / KAUFKRAFT;
  return steuerMark1891(mark) * KAUFKRAFT * (1 + zuschlag);
}

/** § 32a EStG 2026 (Grundtarif), zvE in Euro, abgerundet wie im Gesetz. */
export function est2026(zve) {
  const x = Math.floor(zve);
  if (x <= 12348) return 0;
  if (x <= 17799) { const y = (x - 12348) / 1e4; return Math.floor((914.51 * y + 1400) * y); }
  if (x <= 69878) { const z = (x - 17799) / 1e4; return Math.floor((173.10 * z + 2397) * z + 1034.87); }
  if (x <= 277825) return Math.floor(0.42 * x - 11135.63);
  return Math.floor(0.45 * x - 19470.38);
}
export const soli2026 = (est) => (est <= 20350 ? 0 : Math.min(0.055 * est, 0.119 * (est - 20350)));

/** Grenzsteuersatz 2026 im Bereich 17.800–69.878 €. */
export function grenzsatz2026(zve) {
  const z = (Math.floor(zve) - 17799) / 1e4;
  return (2 * 173.10 * z + 2397) / 1e4;
}

/** zvE aus Brutto 2025/26: Pauschbeträge und abziehbare Sozialbeiträge (RV 9,3 %, KV 8,75 % × 0,96, PV 2,4 %). */
export function zveAusBrutto(brutto = BRUTTO) {
  const rv = 0.093 * brutto, kv = ((0.146 + 0.029) / 2) * brutto, pv = (0.018 + 0.006) * brutto, av = 0.013 * brutto;
  const zve = Math.floor(brutto - 1230 - 36 - rv - kv * 0.96 - pv); // § 32a: auf volle Euro abgerundet
  return { zve, rv, kv, pv, av, sozialSumme: rv + kv + pv + av };
}

/** Einkommensleiter: ab welchem zvE zahlt man heute erstmals mehr als 1900 (mit Zuschlag)? */
export function kreuzung(von = 12000, bis = 25000, schritt = 10) {
  for (let x = von; x < bis; x += schritt) if (est2026(x) > steuer1900(x)) return x;
  return null;
}

/** Alle Zahlen für Bild und Skript. */
export function videoZahlen() {
  const s = zveAusBrutto();
  const zve = Math.round(s.zve);
  const heute = est2026(s.zve), damals = steuer1900(s.zve), diff = heute - damals;
  const stufe = (x) => ({ zve: x, mark: x / KAUFKRAFT, heute: est2026(x), damalsOhne: steuer1900(x, { zuschlag: 0 }), damals: steuer1900(x) });
  return {
    brutto: BRUTTO, zve, zveExakt: s.zve, sozial: s.sozialSumme,
    heute, damals, damalsOhne: steuer1900(s.zve, { zuschlag: 0 }), diff, diffMonat: diff / 12,
    markZve: s.zve / KAUFKRAFT, steuerMarkZve: steuerMark1891(s.zve / KAUFKRAFT),
    grenzHeute: grenzsatz2026(s.zve),
    // Grenzbelastung 1900: nächste Stufe (4.500–5.000 → 5.000–5.500): +14 Mark je 500 Mark, mit Zuschlag verdoppelt
    grenzDamals: (14 * 2) / 500,
    steuerfrei1900: 900 * KAUFKRAFT, grundfreibetrag: 12348, hoechstsatzAb: 100000 * KAUFKRAFT, // 4 % ab 100.000 Mark = 850.000 € (Skript nannte 892.500 € = 105.000 Mark)
    kreuz: kreuzung(),
    leiter: [10000, 12000, 13000, 15000, 20000].map(stufe),
    soli: soli2026(heute),
  };
}
