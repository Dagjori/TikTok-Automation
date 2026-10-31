// Erzeugt die Landpunkte für den Punkte-Globus aus world-atlas (Natural Earth, gemeinfrei).
// Aufruf (im Ordner pipeline/): node engine/werkzeuge/globus_punkte.mjs [abstand_grad=1.5]
// Ausgabe: engine/daten/globus-punkte.json  → { abstand, punkte: [[lat, lon, region], ...] }
// Regionen-Codes: 0 sonstige, 1 USA, 2 Kanada, 3 Europa, 4 Japan, 5 Südkorea, 6 Australien/NZ,
//                 7 Lateinamerika, 8 Ostasien sonst, 9 Naher Osten, 10 Afrika, 11 Südasien/SOA
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { feature } from "topojson-client";
import { geoContains, geoBounds } from "d3-geo";

const require = createRequire(import.meta.url);
const abstand = Number(process.argv[2] || 1.5);
const welt = require("world-atlas/countries-110m.json");
// Grobe Rechteck-Vorprüfung je Land, sonst dauert geoContains zu lange
const laender = feature(welt, welt.objects.countries).features.map((f) => ({ f, b: geoBounds(f) }));
const imRechteck = ({ b }, lon, lat) => lat >= b[0][1] - 0.5 && lat <= b[1][1] + 0.5 &&
  (b[0][0] <= b[1][0] ? lon >= b[0][0] - 0.5 && lon <= b[1][0] + 0.5 : lon >= b[0][0] - 0.5 || lon <= b[1][0] + 0.5);

// Länder-IDs (ISO 3166-1 numerisch) → Region
const region = new Map();
const setze = (r, ids) => ids.forEach((id) => region.set(String(id).padStart(3, "0"), r));
setze(1, [840]);
setze(2, [124]);
setze(3, [826, 276, 250, 380, 724, 620, 528, 56, 442, 756, 40, 208, 752, 578, 246, 372, 616, 203, 703, 348, 642, 100, 300, 191, 705, 70, 688, 499, 807, 8, 233, 428, 440, 112, 804, 498, 352]);
setze(4, [392]);
setze(5, [410]);
setze(6, [36, 554]);
setze(7, [484, 76, 32, 152, 170, 604, 862, 218, 68, 600, 858, 320, 340, 222, 558, 188, 591, 192, 214, 332, 328, 740]);
setze(8, [156, 158, 344, 496, 408]);
setze(9, [682, 784, 634, 414, 48, 512, 887, 368, 364, 792, 760, 422, 400, 376, 275]);
setze(11, [356, 586, 50, 144, 524, 64, 764, 704, 458, 360, 608, 116, 418, 104, 702]);

const afrika = (lat, lon) => lat < 37 && lat > -36 && lon > -18 && lon < 52;
const punkte = [];
for (let lat = -58; lat <= 82; lat += abstand) {
  const n = Math.max(1, Math.round((360 * Math.cos((lat * Math.PI) / 180)) / abstand));
  const versatz = (Math.round(lat / abstand) % 2) * 0.5; // versetzte Reihen wirken ruhiger
  for (let i = 0; i < n; i++) {
    const lon = -180 + ((i + versatz) * 360) / n;
    let r = -1;
    for (const l of laender) {
      if (!imRechteck(l, lon, lat) || !geoContains(l.f, [lon, lat])) continue;
      r = region.get(String(l.f.id).padStart(3, "0")) ?? 0;
      if (r === 0 && afrika(lat, lon)) r = 10;
      break;
    }
    if (r < 0) continue;
    punkte.push([Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, r]);
  }
}
writeFileSync(new URL("../daten/globus-punkte.json", import.meta.url), JSON.stringify({ abstand, quelle: "Natural Earth über world-atlas countries-110m", punkte }));
const zaehl = {};
punkte.forEach((p) => (zaehl[p[2]] = (zaehl[p[2]] || 0) + 1));
console.log(punkte.length, "Landpunkte", zaehl);
