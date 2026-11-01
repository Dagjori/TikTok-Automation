// Auswertung für „Schere, Stein, Papier“: Monte Carlo, Warum-Faktoren, Empfindlichkeit gegenüber der Stärke des Musters.
// Aufruf: node sim/auswertung_schere_stein_papier.mjs   (ca. 20 s)
import { monteCarlo, warumFaktoren, videoLaeufe, fuehrungswechsel, MENSCH, spiele, zufall, menschVerteilung, ergebnis } from "./schere_stein_papier.mjs";

const pct = (x, nk = 1) => `${(x * 100).toFixed(nk)} %`;
const z = (x, nk = 2) => x.toFixed(nk);

console.log("== Monte Carlo (100.000 Wiederholungen je Fall, 100 Runden) ==");
for (const g of ["zufall", "mensch", "mensch-wuerfelt"]) {
  const s = monteCarlo({ n: 100000, gegner: g });
  console.log(`${g}: Rot vorn ${pct(s.anteilRotVorn)}, Cyan vorn ${pct(s.anteilCyanVorn)}, Gleichstand ${pct(s.anteilGleich)}; Vorsprung Rot Ø ${z(s.mittlererVorsprung)} (σ ${z(s.standardabweichung)}), Siege Rot ${z(s.mittlereSiegeRot, 1)} / Cyan ${z(s.mittlereSiegeCyan, 1)} / unentschieden ${z(s.mittlereRemis, 1)}; erste Hälfte ${z(s.vorsprungErsteHaelfte)}, zweite Hälfte ${z(s.vorsprungZweiteHaelfte)}; Quantile ${JSON.stringify(s.quantile)}`);
}
console.log("\n== Warum? (Mensch-Modell, 30.000 Läufe) ==");
const w = warumFaktoren({ n: 30000 });
for (const [k, v] of Object.entries(w)) console.log(`nach ${k} des Menschen: ${z(v.runden, 1)} Runden/Lauf, Rot gewinnt ${pct(v.rotGewinnt)}, Cyan gewinnt ${pct(v.cyanGewinnt)}, unentschieden ${pct(v.remis)}, Netto Rot ${z(v.nettoRot, 1)} Siege/Lauf`);

console.log("\n== Empfindlichkeit: Wie stark muss das Muster sein? (Abweichungen von 1/3 mit Faktor k skaliert, Rot kennt das Modell mit k = 1) ==");
function skaliert(k) {
  const mix = (m) => ({ stay: 1 / 3 + k * (m.stay - 1 / 3), links: 1 / 3 + k * (m.links - 1 / 3), rechts: 1 / 3 + k * (m.rechts - 1 / 3) });
  return { sieg: mix(MENSCH.sieg), remis: mix(MENSCH.remis), niederlage: mix(MENSCH.niederlage), start: MENSCH.start };
}
for (const k of [0, 0.25, 0.5, 0.75, 1]) {
  // Rot spielt nach dem vollen Modell; der Mensch spielt das skalierte Modell
  const m = skaliert(k);
  let summe = 0, vorn = 0, n = 20000;
  for (let i = 0; i < n; i++) {
    // eigener kleiner Lauf: Rot (Taktik mit vollem Modell) gegen skaliertes Modell
    const l = spieleGegen(m, 700001 + i);
    summe += l; if (l > 0) vorn++;
  }
  const stay = (m.sieg.stay + m.remis.stay + m.niederlage.stay) / 3;
  console.log(`k = ${k}: Wiederholungsrate ${pct(stay)} → Vorsprung Rot Ø ${z(summe / n)} Siege, Rot liegt in ${pct(vorn / n)} der Läufe vorn`);
}
function spieleGegen(modell, seed) {
  // identisch zu spiele(gegner:"mensch"), aber Rot nutzt das volle Modell, der Mensch das übergebene
  const l = spiele({ seed, gegner: "mensch", modell, annahme: MENSCH });
  return l.vorsprung;
}

const v = videoLaeufe();
console.log("\n== Läufe im Video ==");
for (const [k, l] of [["Zufall", v.zufall], ["Mensch", v.mensch], ["Mensch würfelt ab 51", v.wuerfelt]]) {
  console.log(`${k} (Seed ${l.seed}): Rot ${l.siegeRot}, Cyan ${l.siegeCyan}, unentschieden ${l.remis}, Vorsprung ${l.vorsprung}, Führungswechsel ${JSON.stringify(fuehrungswechsel(l))}`);
}
console.log(`Median Vorsprung Mensch (Auswahlkriterium): ${v.medianMensch}; Seeds ${JSON.stringify(v.seeds)}`);
const h2 = v.wuerfelt.runden;
console.log(`Mensch würfelt: nach Runde 50 ${h2[49].siegeRot}:${h2[49].siegeCyan}, Ende ${v.wuerfelt.siegeRot}:${v.wuerfelt.siegeCyan}, zweite Hälfte ${v.wuerfelt.siegeRot - h2[49].siegeRot}:${v.wuerfelt.siegeCyan - h2[49].siegeCyan}`);
