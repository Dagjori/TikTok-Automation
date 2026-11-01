// Zeitleiste: Einstellungen (Shots) mit Welten und Übergängen.
// Eine Welt ist { szene, kamera, post, update(t) }. Während eines Übergangs werden beide Welten gerendert.
import { fortschritt, ease } from "./bewegung.js";

export class Zeitleiste {
  constructor(buehne) {
    this.buehne = buehne;
    this.shots = [];
  }
  /**
   * Neue Einstellung ab Zeit `ab`. uebergang (optional) vom vorherigen Shot:
   * { typ: 'blende'|'iris'|'wisch'|'zoom'|'wolken'|'blasen'|'zoomwisch', dauer, mitte:[x,y], richtung:[x,y], farbe1, farbe2, kurve }
   */
  shot(ab, welt, uebergang = null) {
    this.shots.push({ ab, welt, uebergang });
    this.shots.sort((a, b) => a.ab - b.ab);
    return this;
  }
  klangEreignisse() {
    return this.shots.filter((s) => s.uebergang).map((s) => ({ t: s.ab - s.uebergang.dauer / 2, typ: "whoosh", dauer: s.uebergang.dauer }));
  }
  /** Ereignis-Protokoll (Szenenwechsel): {t, typ:"uebergang", art, dauer, klang} */
  ereignisse() {
    const klang = { wolken: "wolke", blasen: "blasen" };
    return this.shots.filter((s) => s.uebergang).map((s) => ({
      t: s.ab - s.uebergang.dauer / 2, typ: "uebergang", art: s.uebergang.typ, dauer: s.uebergang.dauer, quelle: "Zeitleiste",
      klang: s.uebergang.klang ?? klang[s.uebergang.typ] ?? "whoosh",
    }));
  }
  /** Welche Welten sind bei t aktiv? */
  zustand(t) {
    let i = 0;
    for (let k = 0; k < this.shots.length; k++) if (this.shots[k].ab - (this.shots[k].uebergang?.dauer || 0) / 2 <= t) i = k;
    const s = this.shots[i];
    if (i > 0 && s.uebergang) {
      const a = s.ab - s.uebergang.dauer / 2;
      const b = s.ab + s.uebergang.dauer / 2;
      if (t >= a && t < b) {
        const p = (s.uebergang.kurve || ease.inOutCubic)(fortschritt(t, a, b));
        return { weltA: this.shots[i - 1].welt, weltB: s.welt, uebergang: { ...s.uebergang, p } };
      }
    }
    return { weltA: s.welt };
  }
  zeichne(t, bildNr) {
    const z = this.zustand(t);
    this.buehne.zeichne(z.weltA, { weltB: z.weltB, uebergang: z.uebergang, bildNr, t });
    return z;
  }
}
