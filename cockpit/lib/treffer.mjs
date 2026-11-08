// Zielgröße „neue Follower je Video“ und Treffer-Folgen (Wahl des Inhabers 08.11.2026).
// Regeln: hirn/01-Projekt/Lernschleife und Insights.md › Zielgröße, hirn/01-Projekt/Serien und Treffer-Folgen.md.
//   · Follower-Zuwachs in den 24 h nach jedem Post aus dem Follower-Verlauf (cockpit/daten/zahlen/verlauf.jsonl), je Account.
//     Grob und netto: Entfolgungen sind eingerechnet, zwei Posts am Tag überlappen.
//   · Aufrufe nach 24 h aus Momentaufnahmen (stündlich im Cockpit, täglich in data/insights/metriken.csv), linear interpoliert.
//   · Treffer: Aufrufe nach 24 h ≥ 3× Median der letzten 10 Videos desselben Accounts → Idee „Teil 2“.
//   · Serie (Inhaber 08.11.: „Folgeteil ≥ Median“): Ein Folgeteil mit mindestens dem Median bekommt den nächsten Teil,
//     darunter endet die Serie; höchstens 3 Folgeteile hintereinander (Teil 2 bis 4).
// Nur reine Funktionen (keine Dateien, kein Netz), Tests: node --test cockpit/lib/treffer.test.mjs

export const STUNDE = 3600000;
export const TAG = 24 * STUNDE;
export const TREFFER_FAKTOR = 3;
export const VERGLEICH_VIDEOS = 10;
export const MIN_VERGLEICH = 5;        // unter 5 älteren Videos mit 24-h-Zahl gibt es kein Urteil (A)
export const MAX_FOLGETEILE = 3;       // Teil 2, 3, 4; danach mindestens 1 Tag anderes Thema
export const KLAMMER_MAX_H = 12;       // Interpolation nur zwischen Punkten, die je höchstens 12 h vom Ziel entfernt sind
export const NAH_H = 2;                // ohne Klammer: nächster Punkt höchstens 2 h entfernt
export const GENAU_H = 1.5;            // Abstand bis hier gilt als gemessen, darüber als geschätzt
export const FRISCH_H = 72;            // Treffer nur melden, wenn die 24-h-Marke höchstens 72 h zurückliegt

const zeitVon = (x) => (typeof x === "number" ? x : Date.parse(x));

export function median(werte) {
  const a = werte.filter((x) => Number.isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

/** Punkte [{t, wert}] (t in ms oder ISO) → sortiert, ohne ungültige Werte, gleiche Zeiten zusammengefasst (letzter gewinnt). */
export function punkteOrdnen(punkte) {
  const m = new Map();
  for (const p of punkte || []) {
    const t = zeitVon(p.t), w = Number(p.wert);
    if (Number.isFinite(t) && Number.isFinite(w)) m.set(t, w);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([t, wert]) => ({ t, wert }));
}

/** Wert zur Zeit ziel: zwischen zwei umklammernden Punkten linear (je ≤ klammerH entfernt), sonst der nächste Punkt (≤ nahH).
 *  Ergebnis {wert, abstand_h, geschaetzt} oder null. Punkte müssen geordnet sein (punkteOrdnen). */
export function wertBei(punkte, ziel, { klammerH = KLAMMER_MAX_H, nahH = NAH_H } = {}) {
  ziel = zeitVon(ziel);
  if (!punkte.length || !Number.isFinite(ziel)) return null;
  let vor = null, nach = null;
  for (const p of punkte) {
    if (p.t <= ziel) vor = p;
    if (p.t >= ziel) { nach = p; break; }
  }
  const h = (p) => Math.abs(p.t - ziel) / STUNDE;
  if (vor && nach && h(vor) <= klammerH && h(nach) <= klammerH) {
    const wert = nach.t === vor.t ? nach.wert : vor.wert + ((nach.wert - vor.wert) * (ziel - vor.t)) / (nach.t - vor.t);
    const abstand = Math.max(h(vor), h(nach));
    // Exakter Treffer eines Punktes oder enge Klammer gilt als gemessen
    const naechster = Math.min(h(vor), h(nach));
    return { wert, abstand_h: round1(naechster === 0 ? 0 : abstand), geschaetzt: naechster > 0 && abstand > GENAU_H };
  }
  const kand = [vor, nach].filter(Boolean).sort((a, b) => h(a) - h(b))[0];
  if (kand && h(kand) <= nahH) return { wert: kand.wert, abstand_h: round1(h(kand)), geschaetzt: h(kand) > GENAU_H };
  return null;
}

const round1 = (x) => Math.round(x * 10) / 10;

/** Follower-Zuwachs in den 24 h nach dem Post. followerPunkte: [{t, wert}] eines Kanals (geordnet).
 *  status: "ok" (24 h vorbei, beide Werte da) · "laeuft" (noch keine 24 h; bisher = Zuwachs seit dem Post) · "keine_daten". */
export function zuwachs24(gesendet, followerPunkte, jetzt = Date.now()) {
  const t0 = zeitVon(gesendet);
  const vorher = wertBei(followerPunkte, t0);
  if (jetzt < t0 + TAG) {
    const letzter = followerPunkte.length ? followerPunkte[followerPunkte.length - 1] : null;
    const bisher = vorher && letzter && letzter.t >= t0 ? Math.round(letzter.wert - vorher.wert) : null;
    return { status: "laeuft", plus: null, bisher };
  }
  const nachher = wertBei(followerPunkte, t0 + TAG);
  if (!vorher || !nachher) return { status: "keine_daten", plus: null };
  return {
    status: "ok", plus: Math.round(nachher.wert - vorher.wert), vorher: Math.round(vorher.wert), nachher: Math.round(nachher.wert),
    geschaetzt: vorher.geschaetzt || nachher.geschaetzt, abstand_h: Math.max(vorher.abstand_h, nachher.abstand_h),
  };
}

/** Aufrufe 24 h nach dem Post aus Momentaufnahmen [{t, wert}]; beim Posten sind es 0 Aufrufe (Startpunkt).
 *  Ergebnis {status: "ok"|"laeuft"|"keine_daten", views, geschaetzt}. */
export function aufrufe24(gesendet, viewPunkte, jetzt = Date.now()) {
  const t0 = zeitVon(gesendet);
  if (jetzt < t0 + TAG) return { status: "laeuft", views: null };
  const punkte = punkteOrdnen([{ t: t0, wert: 0 }, ...viewPunkte.filter((p) => zeitVon(p.t) > t0)]);
  // Ältere Videos haben nur die tägliche Momentaufnahme der Lernschleife (ca. 20 Uhr): Klammer bis 24 h je Seite.
  // Aufrufe steigen anfangs schnell, eine weite Klammer schätzt eher zu niedrig (als „geschätzt“ markiert).
  const w = wertBei(punkte, t0 + TAG, { klammerH: 24, nahH: 3 });
  if (!w) return { status: "keine_daten", views: null };
  return { status: "ok", views: Math.round(w.wert), geschaetzt: w.geschaetzt, abstand_h: w.abstand_h };
}

/** Follows je 1.000 Aufrufe (Zielgröße), erst ab 100 Aufrufen sinnvoll. */
export function jeTausend(plus, views) {
  if (!Number.isFinite(plus) || !Number.isFinite(views) || views < 100) return null;
  return Math.round((plus / views) * 1000 * 100) / 100;
}

/** Bewertet die Videos eines Accounts. videos: [{post_id, gesendet, v24}] (v24 = Aufrufe nach 24 h oder null).
 *  Liefert Map post_id → {median, vergleich, faktor, treffer, ueber_median} (bzw. {vergleich, median: null} ohne Urteil). */
export function bewerten(videos) {
  const reihe = [...videos].sort((a, b) => zeitVon(a.gesendet) - zeitVon(b.gesendet));
  const erg = new Map();
  reihe.forEach((v, i) => {
    const vorher = reihe.slice(0, i).filter((x) => Number.isFinite(x.v24)).slice(-VERGLEICH_VIDEOS).map((x) => x.v24);
    const m = vorher.length >= MIN_VERGLEICH ? median(vorher) : null;
    if (m === null || !Number.isFinite(v.v24)) return erg.set(v.post_id, { median: m, vergleich: vorher.length, faktor: null, treffer: false, ueber_median: null });
    const faktor = m > 0 ? v.v24 / m : (v.v24 > 0 ? Infinity : 1);
    erg.set(v.post_id, { median: m, vergleich: vorher.length, faktor: Math.round(faktor * 10) / 10, treffer: faktor >= TREFFER_FAKTOR, ueber_median: v.v24 >= m });
  });
  return erg;
}

/** Nächster Teil einer Serie oder null. teil = Teil des bewerteten Videos (1 = normales Video, 2.. = Folgeteil).
 *  Normales Video: Teil 2 nur bei Treffer. Folgeteil: nächster Teil, wenn ≥ Median (Inhaber 08.11.), höchstens bis Teil 4. */
export function naechsterTeil(teil, bewertung) {
  if (!bewertung || bewertung.median === null || bewertung.faktor === null) return null;
  if (teil <= 1) return bewertung.treffer ? 2 : null;
  if (teil >= 1 + MAX_FOLGETEILE) return null;
  return bewertung.ueber_median ? teil + 1 : null;
}

/** Frage aus einer Caption („Hook-Frage? 🏠 Ich hab's simuliert …“ → „Hook-Frage?“). */
export function frageAusCaption(caption) {
  const t = String(caption || "").replace(/\s+/g, " ").trim();
  const i = t.indexOf("?");
  return (i > 0 ? t.slice(0, i + 1) : t.slice(0, 90)).trim();
}

/** Teil aus einer Caption bzw. einem Titel („Teil 3: …“), sonst 1. */
export function teilAusText(text) {
  const m = /\bTeil\s+(\d{1,2})\b/i.exec(String(text || ""));
  return m ? Number(m[1]) : 1;
}

/** Idee „Teil N“ für das Studio (gleiche Felder wie die Ideen von Claude, dazu typ, teil, serie). */
export function teilIdee({ konto, teil, wurzelTitel, vorherTitel, post, bewertung, views24 }) {
  const basis = String(wurzelTitel || "").replace(/^Teil\s+\d+\s*[:·–-]\s*/i, "").trim();
  const faktor = bewertung?.faktor != null ? String(bewertung.faktor).replace(".", ",") : "?";
  const grund = teil === 2
    ? `Treffer: ${views24 ?? "?"} Aufrufe nach 24 h = ${faktor}× Median der letzten ${bewertung?.vergleich ?? "?"} Videos`
    : `Teil ${teil - 1} lief mit ${views24 ?? "?"} Aufrufen nach 24 h über dem Median (${faktor}×), die Serie geht weiter`;
  const auftrag = `Gleiches Versprechen wie „${basis}“, aber eine neue Rechnung bzw. ein neues Szenario, nie dieselbe Aussage. „Teil ${teil}“ groß im ersten Bild und vorne in der Caption; ohne Teil 1 verständlich; löst die eigene Frage im selben Video (kein Cliffhanger).`;
  const idee = {
    titel: `Teil ${teil}: ${basis}`,
    typ: "folgeteil", teil,
    serie: { wurzel_titel: basis, vorher_titel: vorherTitel || basis, post_id: post?.post_id || null, link: post?.link || null, views24: views24 ?? null, median: bewertung?.median ?? null, faktor: bewertung?.faktor ?? null },
    treffer: grund,
    feld: "Folgeteil (Treffer-Serie)",
    zutat: "keine",
    originalitaet: "Folgeteil eines eigenen Treffers: von „bisher“ und der Anti-Liste ausgenommen (Hirn: Serien und Treffer-Folgen)",
  };
  const relevant = "Das Versprechen von Teil 1 hat gezogen; ein Folgeteil erreicht die Zuschauer, solange Teil 1 noch Aufrufe bekommt (96 % in 10 Tagen).";
  if (konto === "stelldirvor") Object.assign(idee, { ereignis: auftrag, messgroesse: "neue Messgröße bzw. neuer Ort zur selben Prämisse", pointe: relevant });
  else Object.assign(idee, { hook: auftrag, ergebnis_ansatz: "neue eigene Modellrechnung mit Euro-Ergebnis zum selben Versprechen", warum_relevant: relevant });
  return idee;
}
