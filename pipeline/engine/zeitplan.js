// Zeitplan: Stimm-Timing laden bzw. schätzen und Zeiten von Segmenten und Wörtern abfragen.
// Läuft im Browser und in Node (keine DOM-Abhängigkeit).
//
//   zp.w(seg, wort)             Startzeit eines Worts in einem Segment (wie bisher)
//   zp.zeit(x)                  Zeit aus Sekunden, Stichwort oder Wort-Index (für alle Maßstab-Bausteine):
//                                 12.5                  → 12,5 s
//                                 "Los"                 → erstes „Los“ im ganzen Skript
//                                 "rennen:Los"          → erstes „Los“ im Segment „rennen“
//                                 "Los#2"               → zweites „Los“;  "Milliard*" → Wortanfang
//                                 "Los+0.2" / "Los-0.1" → mit Versatz in Sekunden;  "Los>" → Wortende
//                                 {i: 17}               → Wort Nr. 17 (0-basiert, über alle Segmente)
//                                 {wort, seg, nr, nach, versatz, ende}
//   zp.phrasen({max, min})      Untertitel-Phrasen (2–5 Wörter, Satzgrenzen und Kommas respektiert)

/** Wort normalisieren: klein, ohne Satzzeichen (Ziffern, Punkt und Komma in Zahlen bleiben) */
export function normalisiere(w) {
  return String(w)
    .toLowerCase()
    .replace(/[„“"'’‚‘»«()?!:;…–—]/g, "")
    .replace(/[.,]+$/g, "")
    .replace(/^[.,]+/g, "");
}

const SATZENDE = /[.!?…]["“”»«’]*$/;
const TEILENDE = /[,;:–—]["“”»«’]*$/;

/**
 * Timing aus dem Skript schätzen (solange keine echte Stimme da ist). Gleiches Format wie tts.py → audio/timing.json.
 * Standard = gemessene Werte der Stimme „Ben“ mit Original-Einstellungen (31.10.): ca. 2,0 Wörter/s inkl. Pausen,
 * Satzpause ca. 0,6 s. Ein Skript kann eigene Werte setzen: "schaetzung": {"wps": 2.7, "satzpause": 0.26, ...}.
 * wps zählt wie in docs/15 die Wörter je Sekunde Sprechzeit einschließlich Pausen.
 */
export function schaetzeTiming(skript, opt = {}) {
  const o = { wps: 2.0, satzpause: 0.6, kommapause: 0.35, segmentpause: 0.6, vorlauf: 0.12, ...(skript.schaetzung || {}), ...opt };
  // alte Aufrufe: {pause} = Segmentpause
  if (opt.pause !== undefined) o.segmentpause = opt.pause;
  const roh = skript.segmente.map((seg) => ({ id: seg.id, text: seg.text, woerter: seg.text.split(/\s+/).filter(Boolean) }));
  const liste = [];
  roh.forEach((seg, si) => seg.woerter.forEach((wort, wi) => {
    const letztes = wi === seg.woerter.length - 1;
    let pause = 0;
    if (letztes) pause = si < roh.length - 1 ? o.segmentpause : 0;
    else if (SATZENDE.test(wort)) pause = o.satzpause;
    else if (TEILENDE.test(wort)) pause = o.kommapause;
    // Wortlänge als grobes Maß für die Sprechdauer (Zahlen werden ausgesprochen länger)
    const kern = wort.replace(/[^\p{L}\p{N}]/gu, "");
    const gewicht = Math.min(14, Math.max(2, kern.length)) + 2 + (/\d/.test(kern) ? kern.length * 1.5 : 0);
    liste.push({ si, wort, pause, gewicht });
  }));
  const n = liste.length;
  const pausen = liste.reduce((a, w) => a + w.pause, 0);
  const sprechen = Math.max(n * 0.18, n / o.wps - pausen);
  const summe = liste.reduce((a, w) => a + w.gewicht, 0);
  let t = o.vorlauf;
  const segmente = roh.map((s) => ({ id: s.id, text: s.text, start: 0, ende: 0, woerter: [] }));
  for (const w of liste) {
    const d = (sprechen * w.gewicht) / summe;
    segmente[w.si].woerter.push({ wort: w.wort, start: +t.toFixed(3), ende: +(t + d * 0.92).toFixed(3) });
    t += d + w.pause;
  }
  for (const s of segmente) {
    s.start = s.woerter.length ? s.woerter[0].start : t;
    s.ende = s.woerter.length ? s.woerter[s.woerter.length - 1].ende : t;
  }
  const dauer = segmente[segmente.length - 1].ende;
  return { stimme: "Schätzung", geschaetzt: true, schaetzung: o, wps: o.wps, dauer: +dauer.toFixed(3), segmente };
}

/** Füllwörter, mit denen eine Untertitel-Phrase nicht enden soll */
const SCHWACH = new Set("der die das den dem des ein eine einen einem einer eines und oder aber doch denn zu zum zur in im ins mit von vom für auf an am bei nach aus um über unter vor hinter durch gegen ohne als wie dass weil wenn ob nicht kein keine so sehr nur noch schon es ist sind wird hat".split(" "));

/**
 * Wörter in Untertitel-Phrasen teilen: Sätze nie zusammenlegen, an Kommas/Doppelpunkten trennen,
 * lange Teilsätze ausgewogen in Stücke mit min…max Wörtern teilen (nie mit Artikel/Präposition enden),
 * einzelne Wörter mit dem Nachbarn desselben Satzes verbinden, wenn das Ergebnis höchstens max Wörter hat.
 * woerter: [{wort, start, ende, ...}] → [[wort, …], …]
 */
export function bildePhrasen(woerter, { max = 5, min = 2, segmentGrenzen = true } = {}) {
  // 1) Sätze
  const saetze = [[]];
  woerter.forEach((w, i) => {
    saetze[saetze.length - 1].push(w);
    const naechster = woerter[i + 1];
    const segWechsel = segmentGrenzen && naechster && naechster.seg !== undefined && naechster.seg !== w.seg;
    if ((SATZENDE.test(w.wort) || segWechsel) && i < woerter.length - 1) saetze.push([]);
  });
  const ausgewogen = (teil) => {
    const n = teil.length;
    if (n <= max) return [teil];
    // DP: Stücke mit min..max Wörtern, Kosten = Abweichung von der Ideallänge + Strafe für schwaches Ende
    const k = Math.ceil(n / max);
    const ideal = n / k;
    const kosten = new Array(n + 1).fill(Infinity);
    const zurueck = new Array(n + 1).fill(-1);
    kosten[0] = 0;
    for (let e = 1; e <= n; e++) {
      for (let l = Math.min(min, n); l <= max; l++) {
        const a = e - l;
        if (a < 0 || kosten[a] === Infinity) continue;
        const ende = normalisiere(teil[e - 1].wort);
        const c = kosten[a] + (l - ideal) ** 2 + (e < n && SCHWACH.has(ende) ? 4 : 0) + 1.5;
        if (c < kosten[e]) { kosten[e] = c; zurueck[e] = a; }
      }
    }
    if (kosten[n] === Infinity) { // sehr kurze Reste: einfach in max-Stücke
      const r = [];
      for (let i = 0; i < n; i += max) r.push(teil.slice(i, i + max));
      return r;
    }
    const stuecke = [];
    for (let e = n; e > 0; e = zurueck[e]) stuecke.unshift(teil.slice(zurueck[e], e));
    return stuecke;
  };
  const phrasen = [];
  for (const satz of saetze) {
    if (!satz.length) continue;
    // 2) Teilsätze an Komma, Semikolon, Doppelpunkt, Gedankenstrich
    const teile = [[]];
    satz.forEach((w, i) => {
      teile[teile.length - 1].push(w);
      if (TEILENDE.test(w.wort) && i < satz.length - 1) teile.push([]);
    });
    let stuecke = teile.filter((x) => x.length).flatMap(ausgewogen);
    // 3) Einzelwörter mit dem Nachbarn im selben Satz verbinden
    for (let i = 0; i < stuecke.length; i++) {
      if (stuecke.length < 2 || stuecke[i].length >= min) continue;
      const rechts = i + 1 < stuecke.length ? stuecke[i].length + stuecke[i + 1].length : Infinity;
      const links = i > 0 ? stuecke[i].length + stuecke[i - 1].length : Infinity;
      if (rechts <= max && rechts <= links) { stuecke.splice(i, 2, [...stuecke[i], ...stuecke[i + 1]]); i--; }
      else if (links <= max) { stuecke.splice(i - 1, 2, [...stuecke[i - 1], ...stuecke[i]]); i -= 2; }
    }
    phrasen.push(...stuecke);
  }
  return phrasen;
}

export class Zeitplan {
  constructor(timing, { nachlauf = 1.5, mindestlaenge = 61 } = {}) {
    this.timing = timing;
    this.geschaetzt = !!timing.geschaetzt;
    this.segmente = timing.segmente;
    this.index = new Map(this.segmente.map((s) => [s.id, s]));
    this.stimmEnde = timing.dauer ?? this.segmente[this.segmente.length - 1].ende;
    // Videolänge: Stimme + Nachlauf, mindestens 61 s (CRP)
    this.dauer = Math.max(mindestlaenge, this.stimmEnde + nachlauf);
    let i = 0;
    this.alleWoerter = this.segmente.flatMap((s) => s.woerter.map((w, j) => ({ ...w, seg: s.id, segIndex: j, i: i++ })));
  }
  seg(id) {
    const s = this.index.get(id);
    if (!s) throw new Error(`Segment „${id}“ fehlt im Timing`);
    return s;
  }
  /** Start des nächsten Segments bzw. Videoende */
  segEnde(id) {
    const i = this.segmente.findIndex((s) => s.id === id);
    return i < this.segmente.length - 1 ? this.segmente[i + 1].start : this.dauer;
  }
  /**
   * Wort in einem Segment finden (erster Treffer ab Index `ab`). Liefert {start, ende, wort}.
   * Ein Suchwort mit * am Ende passt auf Wortanfänge („Milliard*“).
   */
  wort(segId, suchwort, { ab = 0, versatz = 0 } = {}) {
    const s = this.seg(segId);
    const ziel = normalisiere(suchwort);
    const praefix = ziel.endsWith("*");
    const z = praefix ? ziel.slice(0, -1) : ziel;
    for (let i = ab; i < s.woerter.length; i++) {
      const n = normalisiere(s.woerter[i].wort);
      if (praefix ? n.startsWith(z) : n === z) return { ...s.woerter[i], index: i, start: s.woerter[i].start + versatz };
    }
    throw new Error(`Wort „${suchwort}“ nicht in Segment „${segId}“ gefunden`);
  }
  /** Kurzform: Startzeit eines Worts */
  w(segId, suchwort, opt) {
    return this.wort(segId, suchwort, opt).start;
  }
  /** Stichwort im ganzen Skript suchen: {wort, seg, nr (1 = erster Treffer), nach (Sekunden)} → Wortobjekt */
  finde(suchwort, { seg = null, nr = 1, nach = -Infinity } = {}) {
    const ziel = normalisiere(suchwort);
    const praefix = ziel.endsWith("*");
    const z = praefix ? ziel.slice(0, -1) : ziel;
    let treffer = 0;
    for (const w of this.alleWoerter) {
      if (seg && w.seg !== seg) continue;
      if (w.start < nach) continue;
      const n = normalisiere(w.wort);
      if (praefix ? n.startsWith(z) : n === z) if (++treffer === nr) return w;
    }
    throw new Error(`Stichwort „${suchwort}“${seg ? ` (Segment ${seg})` : ""}${nr > 1 ? ` Nr. ${nr}` : ""} nicht im Timing gefunden`);
  }
  /** Zeit aus Sekunden, Stichwort-Text oder Wort-Index (siehe Kopf der Datei) */
  zeit(x) {
    if (x === null || x === undefined) return x;
    if (typeof x === "number") return x;
    if (typeof x === "string") {
      const m = x.match(/^(?:([^:]+):)?(.+?)(#\d+)?(>)?([+-]\d+(?:\.\d+)?)?$/);
      if (!m) throw new Error(`Zeitangabe „${x}“ nicht lesbar`);
      const [, seg, wort, nr, ende, versatz] = m;
      const w = this.finde(wort, { seg: seg || null, nr: nr ? +nr.slice(1) : 1 });
      return (ende ? w.ende : w.start) + (versatz ? +versatz : 0);
    }
    if (typeof x === "object") {
      if (x.i !== undefined) {
        const w = this.alleWoerter[x.i];
        if (!w) throw new Error(`Wort-Index ${x.i} gibt es nicht (${this.alleWoerter.length} Wörter)`);
        return (x.ende ? w.ende : w.start) + (x.versatz || 0);
      }
      const w = this.finde(x.wort, x);
      return (x.ende ? w.ende : w.start) + (x.versatz || 0);
    }
    throw new Error(`Zeitangabe ${x} nicht lesbar`);
  }
  /** Untertitel-Phrasen über alle Segmente: [[wort, …], …] (Wortobjekte mit start/ende/seg/i) */
  phrasen(opt) {
    return bildePhrasen(this.alleWoerter, opt);
  }
}
