// Zeitplan: Stimm-Timing laden bzw. schätzen und Zeiten von Segmenten und Wörtern abfragen.
// Läuft im Browser und in Node (keine DOM-Abhängigkeit).

/** Wort normalisieren: klein, ohne Satzzeichen (Ziffern, Punkt und Komma in Zahlen bleiben) */
export function normalisiere(w) {
  return String(w)
    .toLowerCase()
    .replace(/[„“"'’‚‘»«()?!:;…]/g, "")
    .replace(/[.,]+$/g, "")
    .replace(/^[.,]+/g, "");
}

/**
 * Timing aus dem Skript schätzen (solange keine echte Stimme da ist).
 * Gleiches Format wie tts.py → audio/timing.json.
 */
export function schaetzeTiming(skript, { wps = 2.4, pause = 0.35, vorlauf = 0.2 } = {}) {
  let t = vorlauf;
  const segmente = skript.segmente.map((seg, i) => {
    const woerter = seg.text.split(/\s+/).filter(Boolean);
    const dauer = woerter.length / wps;
    const start = t;
    const proWort = dauer / woerter.length;
    const liste = woerter.map((wort, j) => ({
      wort,
      start: +(start + j * proWort).toFixed(3),
      ende: +(start + (j + 0.88) * proWort).toFixed(3),
    }));
    t = start + dauer + (i < skript.segmente.length - 1 ? pause : 0);
    return { id: seg.id, text: seg.text, start: +start.toFixed(3), ende: +(start + dauer).toFixed(3), woerter: liste };
  });
  const dauer = segmente[segmente.length - 1].ende;
  return { stimme: "Schätzung", geschaetzt: true, wps, dauer: +dauer.toFixed(3), segmente };
}

export class Zeitplan {
  constructor(timing, { nachlauf = 1.5, mindestlaenge = 61 } = {}) {
    this.timing = timing;
    this.segmente = timing.segmente;
    this.index = new Map(this.segmente.map((s) => [s.id, s]));
    this.stimmEnde = timing.dauer ?? this.segmente[this.segmente.length - 1].ende;
    // Videolänge: Stimme + Nachlauf, mindestens 61 s (CRP)
    this.dauer = Math.max(mindestlaenge, this.stimmEnde + nachlauf);
    this.alleWoerter = this.segmente.flatMap((s) => s.woerter.map((w) => ({ ...w, seg: s.id })));
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
}
