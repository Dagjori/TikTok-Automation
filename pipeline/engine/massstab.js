// Maßstab-Bausteine (.claude/skills/simulierbar-video/massstab.md §4, §8, §11): alles, was die viralen Vorbilder im Bild haben, als wiederverwendbare,
// zeitgesteuerte HUD-Bausteine. Jeder Baustein …
//   … startet über Wortzeiten: ein: "Los" | "rennen:Los" | "Los#2" | "Los+0.2" | {i: 17} | 12.5 (siehe zeitplan.js)
//   … ist deterministisch: update(t) setzt den Zustand nur aus t (renderAt(t) in beliebiger Reihenfolge)
//   … meldet seine Ereigniszeiten (ereignisse()) für Ton (klang.py) und Prüfung (qc/massstab.py)
//
//   const M = new Massstab(hud, zp, { teams: { a: { name: "RASER", farbe: "#FF5A4E", woerter: ["Rasen", "Raser*"] },
//                                              b: { name: "ROLLER", farbe: "#13B5A6", woerter: ["rollen", "Roller*"] } } });
//   M.tafel({...}); M.chip({...}); M.stempel({...}); … ; M.untertitel(); M.schleife({ab, ende}); M.veroeffentliche({zl, regie});
//
// Bausteine: titel, tafel (Anzeigetafel oben mit Live-Zählern, vs-Kreis bzw. Uhr), uhr (Renn-Uhr/Stoppuhr), ring
// (Pausen-/Countdown-Ring), chip/chips, stempel (Sticker/Stempel mit Strahlenkranz), leiste (Fortschritt mit Marken und
// Team-Punkten), formel (Vergleichs-/Formelkarte), bilanz (Zeile für Zeile), balken (Aufschlüsselung, 2 Faktoren),
// pointe (große Typo), hinweis (Folgen-Hinweis als Textzeile am Ende, seit 08.11.2026 nur im Testblock; ersetzt folgen),
// folgen (alter Folgen-Aufruf bei ca. 20 s, veraltet), zaehler (schwebender Live-Zähler), untertitel (Phrasen, §8).
// Stile: engine/massstab.css (nach hud.css einbinden).
import { feder, FEDER, ease, fortschritt, clamp, lerp, keyframes, schleifenWert, smoothstep } from "./bewegung.js";
import { el, fmt, Karaoke } from "./hud.js";
import { normalisiere } from "./zeitplan.js";

/** Sichere Fläche (px): symmetrisch 150 links und rechts (Achse x = 540, Inhaber 01.11.), oben 150; nichts Wichtiges unter y ≈ 1500 */
export const SICHER = { links: 150, rechts: 930, oben: 150, unten: 1500, breite: 780, mitte: 540 };

const FED = {
  pop: { frequenz: 3.4, daempfung: 0.36 },
  karte: { frequenz: 2.5, daempfung: 0.52 },
  titel: { frequenz: 3.0, daempfung: 0.52 },
  schnell: { frequenz: 5.2, daempfung: 0.58 },
  balken: { frequenz: 2.4, daempfung: 0.42 },
};

let laufNr = 0;
const zeige = (e, an) => {
  const v = an ? "visible" : "hidden";
  if (e.style.visibility !== v) e.style.visibility = v;
};
const setzeStil = (e, k, v) => {
  if (e.style[k] !== v) e.style[k] = v;
};
/** Helligkeit einer Hex-Farbe (0..1) */
function hell(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** 1 = Ankerpunkt (px) im Bild, weich auf 0 außerhalb (3D-Anker, die aus dem Bild laufen, blenden aus) */
function ankerImBild(x, y) {
  const r = 80;
  return clamp(Math.min(x + r, 1080 + r - x, y - SICHER.oben + r, SICHER.unten + r - y) / r);
}

/** Ein-/Ausblende: null = unsichtbar, sonst {d, s (Feder), x (Ausblenden 0..1)} */
function huelle(t, ein, aus, f = FED.pop, ausDauer = 0.22) {
  if (t < ein || t > aus + ausDauer) return null;
  return { d: t - ein, s: feder(t - ein, f), x: ease.inCubic(fortschritt(t, aus, aus + ausDauer)) };
}

// =====================================================================================
// Rollzahl: Ziffern rollen wie ein Zählwerk (deterministisch aus dem Wert)
// =====================================================================================
export class Rollzahl {
  /** eltern: Element; nk: Nachkommastellen; max: größter Wert (bestimmt die Stellen); einheit: kleiner Zusatz */
  constructor(eltern, { nk = 0, max = 9999, einheit = "", klasse = "" } = {}) {
    this.nk = nk;
    this.e = el("span", `ms-rz ${klasse}`, "", eltern);
    this.z = el("span", "ms-rz-z", "", this.e);
    this.vz = el("span", "ms-rz-t", "−", this.z);
    this.vz.style.display = "none";
    const stellen = Math.max(1, Math.floor(Math.log10(Math.max(1, Math.abs(max)))) + 1);
    this.spalten = [];
    for (let g = stellen - 1; g >= 0; g--) {
      const s = this._spalte(g + nk, g);
      if (g > 0 && g % 3 === 0) s.trenner = el("span", "ms-rz-t", ".", this.z);
    }
    if (nk > 0) {
      el("span", "ms-rz-t", ",", this.z);
      for (let i = nk - 1; i >= 0; i--) this._spalte(i, -1);
    }
    if (einheit) this.einheit = el("small", "", einheit, this.e);
    this.wert = null;
  }
  _spalte(stelle, ganz) {
    const e = el("span", "ms-rz-s", "", this.z);
    const band = el("span", "ms-rz-b", "0123456789".split("").concat("0").map((d) => `<span>${d}</span>`).join(""), e);
    const s = { stelle, ganz, e, band, pos: null, an: null };
    this.spalten.push(s);
    return s;
  }
  /** v: Wert; ruhig = true rastet auf ganze Einheiten (wenn sich der Wert gerade nicht ändert) */
  setze(v, ruhig = false) {
    const skala = 10 ** this.nk;
    let u = Math.round(Math.abs(v) * skala * 1000) / 1000;
    if (ruhig) u = Math.round(u);
    const neg = v < 0 && u >= 0.5;
    setzeStil(this.vz, "display", neg ? "inline-block" : "none");
    const S = (x) => smoothstep(0.2, 0.8, x);
    for (const s of this.spalten) {
      const p10 = 10 ** s.stelle;
      const basis = Math.floor(u / p10 + 1e-9);
      const rest = u - basis * p10;
      const ueber = s.stelle === 0 ? S(rest) : S(clamp(rest - (p10 - 1), 0, 1));
      const pos = Math.round(((basis % 10) + ueber) * 1000) / 1000;
      const an = s.ganz <= 0 || u >= p10 - 1 + 0.2;
      if (s.an !== an) {
        s.e.style.display = an ? "inline-block" : "none";
        if (s.trenner) s.trenner.style.display = an ? "inline-block" : "none";
        s.an = an;
      }
      if (s.pos !== pos) {
        s.band.style.transform = `translateY(${(-pos * 1.04).toFixed(3)}em)`;
        s.pos = pos;
      }
    }
    const txt = (neg ? "−" : "") + fmt.zahl(Math.round(u) / skala, this.nk);
    if (this.e.dataset.wert !== txt) this.e.dataset.wert = txt;
  }
}

// =====================================================================================
// Massstab: Theme, Zeiten, Schleife, Protokoll, Fabrik für alle Bausteine
// =====================================================================================
export class Massstab {
  /**
   * hud: HUD aus hud.js; zp: Zeitplan; opt.teams: {a:{name, farbe, woerter:[…]}, b:{…}} (Teamfarben gelten überall:
   * Tafel, Chips, Leiste, Untertitel-Schlüsselwörter); opt.akzent, opt.tinte, opt.karte, opt.karteText: Theme-Farben
   */
  constructor(hud, zp, { teams = {}, akzent = "#FFD23F", tinte = "#12151D", karte = "#FFFFFF", karteText = null, fps = 30 } = {}) {
    this.hud = hud;
    this.zp = zp;
    this.fps = fps;
    this.teams = {
      a: { name: "A", farbe: "#FF5A4E", woerter: [], ...(teams.a || {}) },
      b: { name: "B", farbe: "#13B5A6", woerter: [], ...(teams.b || {}) },
    };
    for (const [k, v] of Object.entries(teams)) if (!this.teams[k]) this.teams[k] = { woerter: [], ...v };
    this.theme = { akzent, tinte, karte, karteText: karteText || (hell(karte) > 0.4 ? tinte : "#FFFFFF") };
    const st = hud.wurzel.style;
    for (const [k, v] of Object.entries(this.teams)) {
      st.setProperty(`--team-${k}`, v.farbe);
      st.setProperty(`--team-${k}-text`, hell(v.farbe) > 0.45 ? tinte : "#FFFFFF");
    }
    st.setProperty("--akzent", akzent);
    st.setProperty("--tinte", tinte);
    st.setProperty("--karte", karte);
    st.setProperty("--karte-text", this.theme.karteText);
    this.schleifeOpt = null;
    this.extra = [];
    this.untertitelInfo = null;
  }
  /** Zeitangabe → Sekunden (Zahl, Stichwort, {i}, {wort,…}) */
  zeit(x) {
    if (x === undefined || x === null) return x;
    if (typeof x === "number") return x;
    return this.zp.zeit(x);
  }
  get dauer() {
    return this.zp.dauer;
  }
  /** Farbname → CSS-Wert: "a"/"b" (Teams), "akzent", "tinte", "weiss" oder eine Farbe */
  farbe(f) {
    if (!f) return "var(--akzent)";
    if (this.teams[f]) return `var(--team-${f})`;
    return { akzent: "var(--akzent)", tinte: "var(--tinte)", weiss: "#FFFFFF", karte: "var(--karte)" }[f] || f;
  }
  /** Lesbare Schriftfarbe auf dieser Farbe */
  textAuf(f) {
    if (this.teams[f]) return `var(--team-${f}-text)`;
    if (!f || f === "akzent") return hell(this.theme.akzent) > 0.45 ? "var(--tinte)" : "#FFFFFF";
    if (f === "tinte") return "#FFFFFF";
    if (f === "weiss" || f === "karte") return "var(--tinte)";
    return hell(f) > 0.45 ? "var(--tinte)" : "#FFFFFF";
  }
  setzeFarbe(e, f) {
    e.style.setProperty("--tf", this.farbe(f));
    e.style.setProperty("--tt", this.textAuf(f));
  }
  /** Wertfunktion schleifenfest machen: im Schleifenfenster gleitet sie zum Wert bei t = 0 zurück */
  wert(fn) {
    return (t) => (this.schleifeOpt ? schleifenWert(fn, this.schleifeOpt)(t) : fn(t));
  }
  /** Verlauf aus Stützstellen mit Wortzeiten: [{t: "Los", v: 0}, {t: "Rot", v: 1.2, e: ease.outCubic}] → f(t) */
  kurve(keys) {
    const k = keys.map((x) => ({ ...x, t: this.zeit(x.t) })).sort((a, b) => a.t - b.t);
    return (t) => keyframes(k, t);
  }
  /** Schleife: Bausteine, die bei t = 0 sichtbar sind, kehren bis `ende` in den Anfangszustand zurück */
  schleife({ ab, ende = this.zp.dauer - 1 / this.fps, kurve = ease.inOutCubic }) {
    this.schleifeOpt = { ab: this.zeit(ab), ende: this.zeit(ende), kurve };
    this.extra.push({ t: this.schleifeOpt.ab, typ: "schleife", dauer: this.schleifeOpt.ende - this.schleifeOpt.ab, klang: "rueck", quelle: "Massstab" });
    return this;
  }
  /** 0 vor der Schleife, 1 am Ende */
  schleifenK(t) {
    const s = this.schleifeOpt;
    return s ? s.kurve(fortschritt(t, s.ab, s.ende)) : 0;
  }
  /** Eigenes Ereignis ins Protokoll (z. B. Wendung, Ergebnis): {t, typ, klang?} */
  melde(e) {
    this.extra.push({ quelle: "Szene", ...e, t: this.zeit(e.t) });
    return this;
  }
  /** Zeitbereiche, in denen sich fn(t) sichtbar ändert (Abtastung mit fps) → [[von, bis], …] */
  laufIntervalle(fn, von, bis, eps = 1e-4) {
    const a = Math.max(0, von), b = Math.min(bis, this.zp.dauer);
    const iv = [];
    const dt = 1 / this.fps;
    let prev = JSON.stringify(fn(a));
    let start = null;
    for (let t = a + dt; t <= b + 1e-9; t += dt) {
      const v = fn(t);
      const s = JSON.stringify(v);
      let geaendert = s !== prev;
      if (geaendert && typeof v === "number") geaendert = Math.abs(v - JSON.parse(prev)) > eps;
      if (geaendert && start === null) start = t - dt;
      if (!geaendert && start !== null) {
        iv.push([start, t - dt]);
        start = null;
      }
      prev = s;
    }
    if (start !== null) iv.push([start, b]);
    // kurze Unterbrechungen (≤ 2 Bilder) zusammenlegen
    const r = [];
    for (const x of iv) {
      if (r.length && x[0] - r[r.length - 1][1] <= 2.5 * dt) r[r.length - 1][1] = x[1];
      else r.push(x.slice());
    }
    return r;
  }

  // ---------- Fabrik ----------
  titel(o) { return this.hud.add(new Titel(this, o)); }
  tafel(o) { return this.hud.add(new Tafel(this, o)); }
  uhr(o) { return this.hud.add(new Uhr(this, o)); }
  ring(o) { return this.hud.add(new Ring(this, o)); }
  chip(o) { return this.hud.add(new Chip(this, o)); }
  /** Mehrere Chips, automatisch in Zeilen gesetzt: {liste:[{text, ein, team, art}], x, y, breite, abstand, ausrichtung, aus} */
  chips({ liste, x = SICHER.links, y, breite = SICHER.breite, abstand = 16, zeilenabstand = 18, ausrichtung = "links", aus, ...rest }) {
    const chips = liste.map((c) => this.chip({ aus, ...rest, ...c, x: 0, y: 0, anker: "links" }));
    const zeilen = [[]];
    let b = 0;
    for (const c of chips) {
      if (b > 0 && b + abstand + c.breite > breite) { zeilen.push([]); b = 0; }
      zeilen[zeilen.length - 1].push(c);
      b += (b > 0 ? abstand : 0) + c.breite;
    }
    zeilen.forEach((z, i) => {
      const w = z.reduce((a, c) => a + c.breite, 0) + abstand * (z.length - 1);
      let xx = ausrichtung === "mitte" ? x + (breite - w) / 2 : ausrichtung === "rechts" ? x + breite - w : x;
      for (const c of z) {
        c.x = xx;
        c.y = y + i * (c.hoehe + zeilenabstand);
        xx += c.breite + abstand;
      }
    });
    return chips;
  }
  stempel(o) { return this.hud.add(new Stempel(this, o)); }
  leiste(o) { return this.hud.add(new Leiste(this, o)); }
  formel(o) { return this.hud.add(new Formel(this, o)); }
  bilanz(o) { return this.hud.add(new Bilanz(this, o)); }
  balken(o) { return this.hud.add(new Balken(this, o)); }
  pointe(o) { return this.hud.add(new Pointe(this, o)); }
  /** Veraltet seit 08.11.2026 (qc/massstab.py Punkt 7 = NEIN): ersetzt durch M.hinweis am Ende, nur im Testblock „mit“. */
  folgen(o = {}) { return this.hud.add(new Folgen(this, o)); }
  /** Folgen-Hinweis (seit 08.11.2026, nur Testblock folgen_hinweis = „mit“, tools/testblock.py): Textzeile unter der Schlusskarte. */
  hinweis(o) { return this.hud.add(new Hinweis(this, o)); }
  zaehler(o) { return this.hud.add(new LiveZaehler(this, o)); }
  /** Untertitel (Standard „phrase“ nach §8; stil: "kontur" = alter Wort-für-Wort-Stil). Erst nach document.fonts.ready. */
  untertitel(o = {}) {
    if (o.stil === "kontur") {
      const groesse = o.groesse ?? 70;
      const k = new Karaoke(this.hud, this.zp, { y: o.y ?? (o.unten ?? 1450) - groesse * 1.1 * 2, maxBreite: o.maxBreite ?? 860, groesse, versteckt: o.versteckt || [], stil: "kontur" });
      k.vorbereiten();
      this.untertitelInfo = { stil: "kontur" };
      return this.hud.add(k);
    }
    const u = this.hud.add(new Untertitel(this, o));
    this.untertitelInfo = { stil: "phrase", maxWoerter: u.max, groesse: u.groesse, unten: u.unten, phrasen: u.bloecke.length };
    return u;
  }

  // ---------- Protokoll und Übergabe an render.js ----------
  /** Alle Ereignisse (HUD-Bausteine, Zeitleiste, Regie, eigene) sortiert */
  protokoll({ zl = null, regie = null } = {}) {
    const liste = [...this.hud.protokoll(), ...(zl && zl.ereignisse ? zl.ereignisse() : []), ...(regie && regie.ereignisse ? regie.ereignisse() : []), ...this.extra];
    return liste
      .filter((e) => Number.isFinite(e.t))
      .map((e) => {
        const o = { ...e, t: +e.t.toFixed(3) };
        if (o.dauer !== undefined) o.dauer = +Math.max(0, o.dauer).toFixed(3);
        return o;
      })
      .sort((a, b) => a.t - b.t);
  }
  /**
   * Setzt alles, was render.js abfragt: window.dauer, stimmEnde, ereignisse (Protokoll), klangEreignisse (nur Extras),
   * klangteppich (z. B. "regen", "wasser", "meer", "strasse", "raum", "musik"), massstab (Infos für die Prüfung).
   */
  veroeffentliche({ zl = null, regie = null, dauer = this.zp.dauer, teppich = null, extraKlang = [], schleifenPruefung = null } = {}) {
    window.dauer = dauer;
    window.stimmEnde = this.zp.stimmEnde;
    window.ereignisse = this.protokoll({ zl, regie });
    window.klangEreignisse = [...this.hud.extraKlang(), ...extraKlang].sort((a, b) => a.t - b.t);
    window.klangteppich = teppich;
    window.zeitplan = this.zp;
    window.massstab = {
      version: 1,
      teams: Object.fromEntries(Object.entries(this.teams).map(([k, v]) => [k, { name: v.name, farbe: v.farbe }])),
      schleife: this.schleifeOpt ? { ab: this.schleifeOpt.ab, ende: this.schleifeOpt.ende } : null,
      untertitel: this.untertitelInfo,
      timing: this.zp.geschaetzt ? "geschätzt" : "echt",
      schleifenPruefung,
    };
    return window.ereignisse;
  }
  /** Prüft „letztes Bild = erstes Bild“ für HUD (ohne Untertitel) und Kamera. renderAt: Funktion der Szene */
  pruefeSchleife(renderAt, { regie = null, ende = null } = {}) {
    const te = ende ?? (this.schleifeOpt ? this.schleifeOpt.ende : this.zp.dauer - 1 / this.fps);
    const sig = (e) => {
      let s = "";
      const lauf = (n) => {
        if (n.nodeType === 3) s += n.textContent.trim();
        else if (n.classList && n.classList.contains("ms-rz")) s += `[${n.dataset.wert}]`;
        else if (n.childNodes) n.childNodes.forEach(lauf);
      };
      lauf(e);
      return s;
    };
    const bild = (t) => {
      renderAt(t);
      return [...this.hud.wurzel.querySelectorAll(".ms")]
        .filter((e) => !e.closest(".ms-ut"))
        .map((e) => {
          const cs = getComputedStyle(e);
          if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.02) return null;
          const r = e.getBoundingClientRect();
          return `${e.className.replace(/\s+/g, ".")}@${Math.round(r.left / 3)},${Math.round(r.top / 3)}:${sig(e)}`;
        })
        .filter(Boolean);
    };
    const a = bild(0), b = bild(te);
    const nurA = a.filter((x) => !b.includes(x)), nurB = b.filter((x) => !a.includes(x));
    let kamera = null;
    if (regie) {
      const z0 = regie.zustand(0), z1 = regie.zustand(te);
      kamera = Math.max(...z0.pos.map((v, i) => Math.abs(v - z1.pos[i])), ...z0.ziel.map((v, i) => Math.abs(v - z1.ziel[i])), Math.abs(z0.fov - z1.fov));
    }
    renderAt(0);
    return { ok: !nurA.length && !nurB.length && (kamera === null || kamera < 1e-6), ende: +te.toFixed(3), nurErstesBild: nurA, nurLetztesBild: nurB, kameraAbweichung: kamera };
  }
}

// =====================================================================================
// Basisklasse
// =====================================================================================
class Baustein {
  constructor(M, o = {}, einStandard = -1) {
    this.M = M;
    this.o = o;
    this.ein = o.ein === undefined ? einStandard : M.zeit(o.ein);
    this.aus = o.aus === undefined || o.aus === null || o.aus === Infinity ? Infinity : M.zeit(o.aus);
    this._ev = [];
  }
  melde(e) {
    if (Number.isFinite(e.t)) this._ev.push(e);
  }
  ereignisse() {
    return this._ev;
  }
  /** Sichtbar bis Schleifenende? (Bausteine des ersten Bilds) */
  get startElement() {
    return this.ein <= 0 && this.aus === Infinity;
  }
}

// =====================================================================================
// Titel im Hook: baut sich Wort für Wort im Takt der Stimme auf (Wörter steigen aus einer Maske)
// =====================================================================================
class Titel extends Baustein {
  /** o: {woerter:[{text, ein, team, art:"vs"|"klein", umbruch:true}], y=360, groesse=124, aus} */
  constructor(M, o) {
    super(M, o);
    this.e = el("div", "ms ms-titel", "", M.hud.wurzel);
    this.e.style.top = (o.y ?? 360) + "px";
    this.e.style.fontSize = (o.groesse ?? 124) + "px";
    let zeile = el("span", "ms-tz", "", this.e);
    this.w = [];
    for (const w of o.woerter) {
      if (w.umbruch) { zeile = el("span", "ms-tz", "", this.e); continue; }
      const t = M.zeit(w.ein);
      if (w.art === "vs") {
        const s = el("span", "ms-vs", `<i>${w.text || "vs"}</i>`, zeile);
        this.w.push({ e: s, i: s, t, vs: true });
      } else {
        const m = el("span", `ms-tw ${w.art === "klein" ? "klein" : ""}`, "", zeile);
        const i = el("span", "ms-twi", w.text, m);
        if (w.team) i.style.color = M.farbe(w.team);
        this.w.push({ e: m, i, t });
      }
      this.melde({ t, typ: "titel", klang: "klick", text: w.text || "vs" });
    }
    this.ein = Math.min(...this.w.map((w) => w.t));
    // zu breite Zeilen: Titel als Ganzes kleiner setzen (sichere Breite)
    const breiteste = Math.max(...[...this.e.querySelectorAll(".ms-tz")].map((z) => z.scrollWidth));
    if (breiteste > SICHER.breite) this.e.style.fontSize = ((o.groesse ?? 124) * SICHER.breite) / breiteste * 0.98 + "px";
  }
  update(t) {
    const an = t >= this.ein - 0.001 && t <= this.aus + 0.4;
    zeige(this.e, an);
    if (!an) return;
    this.w.forEach((w, k) => {
      const d = t - w.t;
      const x = ease.inCubic(fortschritt(t, this.aus + k * 0.03, this.aus + k * 0.03 + 0.22));
      if (d < 0) {
        setzeStil(w.i, "opacity", "0");
        return;
      }
      const s = feder(d, FED.titel);
      setzeStil(w.i, "opacity", String(clamp(d / 0.05) * (1 - x)));
      if (w.vs) w.i.style.transform = `scale(${(s * (1 - x)).toFixed(4)}) rotate(${((1 - s) * -120).toFixed(2)}deg)`;
      else w.i.style.transform = `translateY(${((1 - s) * 112 - x * 112).toFixed(2)}%) skewY(${((1 - s) * 7).toFixed(2)}deg)`;
    });
  }
}

// =====================================================================================
// Anzeigetafel oben: zwei Werte mit Teamfarbe, vs-Kreis bzw. Uhr in der Mitte, Live-Zähler, Führung
// =====================================================================================
class Tafel extends Baustein {
  /**
   * o: {y=168, ein=-1, aus, links:{team:"a", name, einheit, nk, max}, rechts:{team:"b", …},
   *     werte(t) → {a, b} (oder [links, rechts]), vorn:"hoch"|"tief"|null (wer führt), anteil(t) → {a, b} (dünne Spur unten),
   *     uhr:{ein, zeit(t) → Sekunden, format(s) → Text, label}, stoesse:[{t, seite:"links"|"rechts"}]}
   */
  constructor(M, o) {
    super(M, o, -1);
    const y = o.y ?? 168;
    this.e = el("div", "ms ms-tafel", "", M.hud.wurzel);
    this.e.style.top = y + "px";
    this.seiten = ["links", "rechts"].map((seite) => {
      const s = { team: seite === "links" ? "a" : "b", ...(o[seite] || {}) };
      const name = s.name ?? M.teams[s.team]?.name ?? s.team;
      const k = el("div", `ms-seite ${seite}`, "", this.e);
      M.setzeFarbe(k, s.team);
      el("div", "ms-glanz", "", k);
      const kopf = el("div", "ms-kopf", seite === "links" ? `<i></i><span>${name}</span><b class="ms-vorn">VORN</b>` : `<b class="ms-vorn">VORN</b><span>${name}</span><i></i>`, k);
      const wert = el("div", "ms-wert", "", k);
      const rz = new Rollzahl(wert, { nk: s.nk ?? 0, max: s.max ?? 9999, einheit: s.einheit || "" });
      const spur = el("div", "ms-spur", "<b></b>", k);
      return { seite, k, glanz: k.querySelector(".ms-glanz"), vorn: kopf.querySelector(".ms-vorn"), wert, rz, spur, spurB: spur.querySelector("b"), team: s.team };
    });
    const [l, r] = this.seiten;
    this.mitte = el("div", "ms-mitte", `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.14)" stroke-width="7"/><circle class="bogen" cx="60" cy="60" r="54" fill="none" stroke="var(--akzent)" stroke-width="7" stroke-linecap="round"/></svg><span class="ms-vs">VS</span><span class="ms-uhrtext"></span>`, this.e);
    this.e.insertBefore(this.mitte, r.k);
    this.bogen = this.mitte.querySelector(".bogen");
    this.U = 2 * Math.PI * 54;
    this.bogen.style.strokeDasharray = `${this.U} ${this.U}`;
    this.vs = this.mitte.querySelector(".ms-vs");
    this.uhrText = this.mitte.querySelector(".ms-uhrtext");
    const roh = o.werte || (() => ({ a: 0, b: 0 }));
    const norm = (v) => (Array.isArray(v) ? { a: v[0], b: v[1] } : v);
    this.werte = M.wert((t) => norm(roh(t)));
    this.anteil = o.anteil ? M.wert((t) => norm(o.anteil(t))) : null;
    this.uhr = o.uhr ? { ...o.uhr, ein: M.zeit(o.uhr.ein), zeit: M.wert(o.uhr.zeit), format: o.uhr.format || ((s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`) } : null;
    if (!this.uhr) this.uhrText.style.display = "none";
    this.vornModus = o.vorn === undefined ? "hoch" : o.vorn;
    this.stoesse = (o.stoesse || []).map((s) => ({ ...s, t: M.zeit(s.t) }));
    this._zeitachse = null;
    if (this.ein > 0) this.melde({ t: this.ein, typ: "tafel", klang: "pop" });
    // Tafel ab Bild 0: stille Meldung ohne Ton und ohne Bild-Ereignis, damit qc/massstab.py (R2) sie findet (07.11.2026)
    else this.melde({ t: 0, typ: "tafel", klang: false, bild: false, ab: "start" });
  }
  _fuehrer(w) {
    if (!this.vornModus) return 0;
    const d = (w.a - w.b) * (this.vornModus === "tief" ? -1 : 1);
    return Math.abs(d) < 1e-6 ? 0 : d > 0 ? -1 : 1; // -1 links (a), 1 rechts (b)
  }
  /** Führungswechsel und Laufphasen einmalig abtasten (für Animation und Protokoll) */
  zeitachse() {
    if (this._zeitachse) return this._zeitachse;
    const M = this.M;
    const von = Math.max(0, this.ein), bis = Math.min(this.aus, M.dauer);
    const wechsel = [];
    let f = this._fuehrer(this.werte(von));
    for (let t = von; t <= bis; t += 1 / M.fps) {
      const g = this._fuehrer(this.werte(t));
      if (g !== f) { wechsel.push({ t, f: g, vorher: f }); f = g; }
    }
    this._zeitachse = { wechsel, startFuehrer: this._fuehrer(this.werte(von)) };
    return this._zeitachse;
  }
  ereignisse() {
    const M = this.M;
    const ev = [...this._ev];
    const za = this.zeitachse();
    for (const w of za.wechsel) if (w.f !== 0 && w.t > 0.05) ev.push({ t: w.t, typ: "fuehrung", klang: "ding", text: w.f < 0 ? "links vorn" : "rechts vorn" });
    const bis = Math.min(this.aus, M.dauer);
    for (const k of ["a", "b"]) for (const [a, b] of M.laufIntervalle((t) => +this.werte(t)[k].toFixed(4), Math.max(0, this.ein), bis)) ev.push({ t: a, typ: "zaehler", dauer: b - a, laufend: true, klang: "zaehlen", quelle: "Tafel" });
    if (this.uhr) for (const [a, b] of M.laufIntervalle((t) => (t >= this.uhr.ein ? Math.floor(this.uhr.zeit(t)) : -1), Math.max(0, this.uhr.ein), bis)) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    return ev;
  }
  update(t) {
    const r = huelle(t, this.ein, this.aus, FED.karte);
    zeige(this.e, !!r);
    if (!r) return;
    const M = this.M;
    const einS = this.ein <= 0 ? 1 : r.s;
    this.e.style.opacity = String(clamp(einS * 3) * (1 - r.x));
    const w = this.werte(t);
    const w0 = this.werte(t - 1 / M.fps);
    const za = this.zeitachse();
    // aktuelle Führung und Zeit seit dem letzten Wechsel
    let f = za.startFuehrer, tw = -10, vorher = 0;
    for (const x of za.wechsel) if (x.t <= t) { f = x.f; tw = x.t; vorher = x.vorher; }
    const dw = t - tw;
    const stoss = Math.max(0, ...this.stoesse.filter((s) => t >= s.t).map((s) => Math.exp(-(t - s.t) * 7) * Math.sin(clamp((t - s.t) / 0.5) * Math.PI)));
    this.e.style.transform = `translateY(${((1 - einS) * -70).toFixed(2)}px) scale(${(1 + 0.025 * stoss).toFixed(4)})`;
    this.seiten.forEach((s, i) => {
      const v = s.team in w ? w[s.team] : i === 0 ? w.a : w.b;
      const v0 = s.team in w0 ? w0[s.team] : i === 0 ? w0.a : w0.b;
      s.rz.setze(v, Math.abs(v - v0) < 1e-6);
      const ich = i === 0 ? -1 : 1;
      const istVorn = f === ich;
      const warVorn = vorher === ich;
      // Führung: Fläche in Teamfarbe (Feder rein), alter Führer blendet aus
      let g = istVorn ? (tw < 0 ? 1 : clamp(feder(dw, FED.schnell))) : warVorn ? 1 - ease.outCubic(clamp(dw / 0.25)) : 0;
      if (istVorn && tw < 0) g = 1;
      g *= 1 - M.schleifenK(t); // in der Schleife blendet die Führung weich aus (erstes Bild: keine Führung)
      setzeStil(s.glanz, "opacity", g.toFixed(3));
      s.k.classList.toggle("vorn", g > 0.5);
      const pv = istVorn ? feder(dw - 0.08, FED.pop) * (1 - M.schleifenK(t)) : 0;
      setzeStil(s.vorn, "opacity", String(clamp(pv * 3)));
      s.vorn.style.transform = `scale(${(0.4 + 0.6 * pv).toFixed(4)})`;
      const bump = istVorn && tw >= 0 ? Math.exp(-dw * 6) * Math.sin(clamp(dw / 0.4) * Math.PI) : 0;
      s.k.style.transform = `scale(${(1 + 0.05 * bump).toFixed(4)})`;
      s.k.style.zIndex = istVorn ? "1" : "0";
      if (this.anteil) {
        const a = this.anteil(t);
        const av = s.team in a ? a[s.team] : i === 0 ? a.a : a.b;
        s.spurB.style.transform = `scaleX(${clamp(av).toFixed(4)})`;
      } else setzeStil(s.spur, "display", "none");
    });
    // Mitte: vs → Uhr (Feder), in der Schleife zurück zu vs
    let m = 0;
    if (this.uhr && t >= this.uhr.ein) m = feder(t - this.uhr.ein, FED.pop);
    m *= 1 - M.schleifenK(t);
    this.vs.style.opacity = String(clamp(1 - m * 2));
    this.vs.style.transform = `skewX(-8deg) scale(${(1 - 0.6 * clamp(m)).toFixed(4)})`;
    if (this.uhr) {
      const sek = Math.max(0, this.uhr.zeit(t));
      const txt = `${this.uhr.format(sek)}${this.uhr.label ? `<small>${this.uhr.label}</small>` : ""}`;
      if (this.uhrText.innerHTML !== txt) this.uhrText.innerHTML = txt;
      this.uhrText.style.opacity = String(clamp(m * 2 - 0.4));
      this.uhrText.style.transform = `scale(${(0.5 + 0.5 * m).toFixed(4)})`;
      const anteil = m > 0.01 ? (sek % 60) / 60 : 0;
      this.bogen.style.strokeDashoffset = String(this.U * (1 - anteil * clamp(m)));
      this.bogen.style.opacity = String(clamp(m));
    } else this.bogen.style.opacity = "0";
  }
}

// =====================================================================================
// Renn-Uhr / Stoppuhr (Zeitraffer)
// =====================================================================================
class Uhr extends Baustein {
  /** o: {x, y (Mitte oben), groesse=230, ein, aus, zeit(t) → Sekunden, format, label:"×20", team} */
  constructor(M, o) {
    super(M, o, 0);
    const g = o.groesse ?? 230;
    this.g = g;
    this.zeitFn = M.wert(o.zeit);
    this.format = o.format || ((s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
    const striche = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 60) * Math.PI * 2, gross = i % 5 === 0;
      const r1 = gross ? 74 : 82, r2 = 91;
      return `<line x1="${(Math.sin(a) * r1).toFixed(2)}" y1="${(-Math.cos(a) * r1).toFixed(2)}" x2="${(Math.sin(a) * r2).toFixed(2)}" y2="${(-Math.cos(a) * r2).toFixed(2)}" stroke="var(--tinte)" stroke-width="${gross ? 5 : 2.4}" stroke-linecap="round" opacity="${gross ? 1 : 0.45}"/>`;
    }).join("");
    this.e = el("div", "ms ms-uhr", `<svg width="${g}" height="${g * 1.1}" viewBox="-110 -132 220 242">
      <rect x="-15" y="-131" width="30" height="20" rx="6" fill="var(--tinte)"/><rect x="-6" y="-114" width="12" height="12" fill="var(--tinte)"/>
      <rect x="62" y="-104" width="22" height="14" rx="5" fill="var(--tinte)" transform="rotate(45 73 -97)"/>
      <circle r="104" fill="var(--karte)" stroke="var(--tinte)" stroke-width="10"/>
      <circle r="60" fill="none" stroke="var(--karte-linie)" stroke-width="20"/>
      <circle class="bogen" r="60" fill="none" stroke="var(--tf)" stroke-width="20" transform="rotate(-90)"/>
      ${striche}
      <g class="zeiger"><line x1="0" y1="14" x2="0" y2="-84" stroke="var(--tf)" stroke-width="7" stroke-linecap="round"/></g>
      <circle r="11" fill="var(--tinte)"/><circle r="4" fill="var(--karte)"/>
    </svg><div class="ms-digital"><span class="txt"></span>${o.label ? `<small>${o.label}</small>` : ""}</div>`, M.hud.wurzel);
    M.setzeFarbe(this.e, o.team || "a");
    this.x = o.x ?? SICHER.mitte;
    this.y = o.y ?? 420;
    this.bogen = this.e.querySelector(".bogen");
    this.U = 2 * Math.PI * 60;
    this.bogen.style.strokeDasharray = `${this.U} ${this.U}`;
    this.zeiger = this.e.querySelector(".zeiger");
    this.txt = this.e.querySelector(".txt");
    this.melde({ t: this.ein, typ: "uhr-ein", klang: "pop" });
  }
  ereignisse() {
    const ev = [...this._ev];
    for (const [a, b] of this.M.laufIntervalle((t) => Math.floor(this.zeitFn(t)), Math.max(0, this.ein), Math.min(this.aus, this.M.dauer))) ev.push({ t: a, typ: "uhr", dauer: b - a, laufend: true, klang: "uhr" });
    return ev;
  }
  update(t) {
    const r = huelle(t, this.ein, this.aus, FED.pop);
    zeige(this.e, !!r);
    if (!r) return;
    const s = this.ein <= 0 ? 1 : r.s;
    const w = this.e.offsetWidth || this.g;
    this.e.style.transform = `translate(${(this.x - w / 2).toFixed(1)}px, ${this.y}px) scale(${((0.4 + 0.6 * s) * (1 - 0.3 * r.x)).toFixed(4)}) rotate(${((1 - s) * -14).toFixed(2)}deg)`;
    this.e.style.opacity = String(clamp(s * 3) * (1 - r.x));
    const sek = Math.max(0, this.zeitFn(t));
    this.zeiger.setAttribute("transform", `rotate(${((sek % 60) * 6).toFixed(2)})`);
    this.bogen.style.strokeDashoffset = String(this.U * (1 - (sek % 60) / 60));
    const txt = this.format(sek);
    if (this.txt.textContent !== txt) this.txt.textContent = txt;
  }
}

// =====================================================================================
// Pausen-/Countdown-Ring
// =====================================================================================
class Ring extends Baustein {
  /**
   * o: {x, y (Mitte) oder punkt(t) → {x, y} px, ein, dauer (Videosekunden), von=30, bis=0, einheit:"s", label:"PAUSE",
   *     ende:"WEITER" (Label danach), team, groesse=150, aus (Standard: ein + dauer + 0.8)}
   */
  constructor(M, o) {
    super(M, o, 0);
    this.dauer = o.dauer ?? 2;
    if (o.aus === undefined) this.aus = this.ein + this.dauer + 0.8;
    this.von = o.von ?? 30;
    this.bis = o.bis ?? 0;
    this.g = o.groesse ?? 150;
    this.punkt = o.punkt || null;
    this.x = o.x ?? SICHER.mitte;
    this.y = o.y ?? 760;
    const r = this.g / 2 - 10;
    this.U = 2 * Math.PI * r;
    this.e = el("div", "ms ms-ring", `<div class="ms-rk" style="width:${this.g}px;height:${this.g}px"><svg viewBox="0 0 ${this.g} ${this.g}"><circle cx="${this.g / 2}" cy="${this.g / 2}" r="${r}" fill="none" stroke="var(--karte-linie)" stroke-width="13"/><circle class="bogen" cx="${this.g / 2}" cy="${this.g / 2}" r="${r}" fill="none" stroke="var(--tf)" stroke-width="13" stroke-linecap="round"/></svg><span class="ms-rzahl" style="font-size:${Math.round(this.g * 0.4)}px"><b class="n"></b><small>${o.einheit ?? "s"}</small></span></div>${o.label ? `<div class="ms-rlabel">${o.label}</div>` : ""}`, M.hud.wurzel);
    M.setzeFarbe(this.e, o.team || "a");
    this.bogen = this.e.querySelector(".bogen");
    this.bogen.style.strokeDasharray = `${this.U} ${this.U}`;
    this.n = this.e.querySelector(".n");
    this.lbl = this.e.querySelector(".ms-rlabel");
    this.labelText = o.label || "";
    this.endeText = o.ende || null;
    this.melde({ t: this.ein, typ: "ring", dauer: this.dauer, laufend: true, klang: "uhr" });
    this.melde({ t: this.ein + this.dauer, typ: "ring-ende", klang: "ding" });
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.pop);
    zeige(this.e, !!h);
    if (!h) return;
    const p = fortschritt(t, this.ein + 0.1, this.ein + this.dauer);
    const v = lerp(this.von, this.bis, p);
    const fallend = this.bis < this.von;
    const n = fallend ? Math.ceil(v - 1e-9) : Math.floor(v + 1e-9);
    if (this.n.textContent !== String(n)) this.n.textContent = String(n);
    // kleiner Puls bei jedem Zahlwechsel
    const rate = Math.abs(this.bis - this.von) / Math.max(0.01, this.dauer - 0.1);
    const seit = p > 0 && p < 1 ? (fallend ? n - v : v - n) / rate : 1;
    const puls = Math.exp(-seit * 12) * (p > 0 && p < 1 ? 1 : 0);
    this.bogen.style.strokeDashoffset = String(this.U * (fallend ? p : 1 - p));
    const fertig = t >= this.ein + this.dauer;
    if (this.lbl && this.endeText) {
      const txt = fertig ? this.endeText : this.labelText;
      if (this.lbl.textContent !== txt) this.lbl.textContent = txt;
    }
    const f = fertig ? feder(t - this.ein - this.dauer, FED.pop) : 0;
    let x = this.x, y = this.y;
    if (this.punkt) ({ x, y } = this.punkt(t));
    const drin = ankerImBild(x, y);
    const w = this.e.offsetWidth || this.g;
    x = clamp(x, SICHER.links + w / 2, SICHER.rechts - w / 2);
    y = clamp(y, SICHER.oben + 200 + this.g / 2, SICHER.unten - 120 - this.g / 2);
    const s = h.s * drin;
    this.e.style.transform = `translate(${(x - w / 2).toFixed(1)}px, ${(y - this.g / 2).toFixed(1)}px) scale(${((0.3 + 0.7 * s) * (1 + 0.05 * puls + 0.08 * Math.sin(clamp(f) * Math.PI)) * (1 - 0.3 * h.x)).toFixed(4)})`;
    this.e.style.opacity = String(clamp(s * 3) * (1 - h.x));
  }
}

// =====================================================================================
// Chip: abgerundetes Etikett, poppt mit Feder genau beim gesprochenen Wort
// =====================================================================================
class Chip extends Baustein {
  /** o: {text (HTML, <em> = Teamfarbe), ein, aus, team, art:"hell"|"voll"|"dunkel", gross, x, y, anker:"links"|"mitte"|"rechts", klang} */
  constructor(M, o) {
    super(M, o, 0);
    const art = o.art || "voll";
    this.e = el("div", `ms ms-chip ${art} ${o.gross ? "gross" : ""}`, `<i></i><span>${o.text}</span><b class="ms-puls"></b>`, M.hud.wurzel);
    M.setzeFarbe(this.e, o.team || (art === "voll" ? "akzent" : "a"));
    this.puls = this.e.querySelector(".ms-puls");
    this.breite = this.e.offsetWidth;
    this.hoehe = this.e.offsetHeight;
    this.x = o.x ?? SICHER.links;
    this.y = o.y ?? 600;
    this.anker = o.anker || "links";
    this.winkel = o.winkel ?? 0;
    this.melde({ t: this.ein, typ: "chip", klang: o.klang ?? "pop", text: String(o.text).replace(/<[^>]+>/g, "") });
    if (this.aus !== Infinity) this.melde({ t: this.aus, typ: "chip-weg", klang: false });
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.pop, 0.2);
    zeige(this.e, !!h);
    if (!h) return;
    const s = h.s;
    const ox = this.anker === "mitte" ? -this.breite / 2 : this.anker === "rechts" ? -this.breite : 0;
    const sc = (0.3 + 0.7 * s) * (1 - 0.35 * h.x);
    this.e.style.transform = `translate(${(this.x + ox).toFixed(1)}px, ${(this.y + (1 - s) * 26 - h.x * 18).toFixed(1)}px) scale(${sc.toFixed(4)}) rotate(${(this.winkel + (1 - s) * -9).toFixed(2)}deg)`;
    this.e.style.opacity = String(clamp(h.d / 0.06) * (1 - h.x));
    const k = clamp((h.d - 0.04) / 0.42);
    this.puls.style.opacity = String(k > 0 && k < 1 ? (1 - k) * 0.85 : 0);
    this.puls.style.transform = `scale(${(1 + 0.32 * ease.outCubic(k)).toFixed(4)}, ${(1 + 0.6 * ease.outCubic(k)).toFixed(4)})`;
  }
}

// =====================================================================================
// Sticker / Stempel: schräg, groß, mit Strahlenkranz („KLAR!“, „ODER?“, „LOS GEHT'S!“, „ÜBERHOLT!“)
// =====================================================================================
class Stempel extends Baustein {
  /** o: {text, ein, aus (Standard ein + 1.1), x=540, y=760, winkel=-7, art:"sticker"|"stempel", farbe:"akzent", groesse=118, strahlen:true} */
  constructor(M, o) {
    super(M, o, 0);
    if (o.aus === undefined) this.aus = this.ein + 1.1;
    this.x = o.x ?? SICHER.mitte;
    this.y = o.y ?? 760;
    this.winkel = o.winkel ?? -7;
    const art = o.art || "sticker";
    const nr = ++laufNr;
    const farbe = o.farbe || "akzent";
    this.e = el("div", `ms ms-stempel ${art}`, "", M.hud.wurzel);
    this.e.style.setProperty("--sf", M.farbe(farbe));
    this.e.style.setProperty("--sc", o.textFarbe ? M.farbe(o.textFarbe) : M.textAuf(farbe));
    this.inn = el("div", "ms-st-in", "", this.e);
    this.plakette = el("div", "ms-plakette", o.text, this.inn);
    this.plakette.style.fontSize = (o.groesse ?? 118) + "px";
    const pw = this.plakette.offsetWidth, ph = this.plakette.offsetHeight;
    // Strahlenkranz: Dreiecke aus der Mitte mit radialem Verlauf in der Stempelfarbe
    this.strahlen = null;
    if (o.strahlen !== false) {
      const n = 18;
      const d = Math.max(pw * 1.35, ph * 3.0);
      const strahl = Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2, b = 0.55 * (Math.PI / n);
        const p1 = [Math.sin(a - b) * 100, -Math.cos(a - b) * 100], p2 = [Math.sin(a + b) * 100, -Math.cos(a + b) * 100];
        return `<path d="M0 0 L${p1[0].toFixed(2)} ${p1[1].toFixed(2)} L${p2[0].toFixed(2)} ${p2[1].toFixed(2)} Z" opacity="${i % 2 ? 0.55 : 1}"/>`;
      }).join("");
      const sf = art === "stempel" ? "#FFFFFF" : M.farbe(farbe);
      this.strahlen = el("div", "", `<svg class="ms-strahlen" width="${d}" height="${d}" viewBox="-100 -100 200 200" style="left:${-d / 2}px;top:${-d / 2}px"><defs><radialGradient id="ms-sg-${nr}"><stop offset="0.18" stop-color="${sf}" stop-opacity="0.9"/><stop offset="0.5" stop-color="${sf}" stop-opacity="0.38"/><stop offset="1" stop-color="${sf}" stop-opacity="0"/></radialGradient></defs><circle r="46" fill="url(#ms-sg-${nr})" opacity="0.7"/><g fill="url(#ms-sg-${nr})">${strahl}</g></svg>`, this.inn).firstChild;
      this.inn.insertBefore(this.strahlen, this.plakette);
    }
    this.melde({ t: this.ein + 0.1, typ: "stempel", klang: o.klang ?? "stempel", text: o.text });
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.2;
    zeige(this.e, an);
    if (!an) return;
    const d = t - this.ein;
    const SCHLAG = 0.1;
    let sc, rot;
    if (d < SCHLAG) {
      const k = ease.inQuad(d / SCHLAG);
      sc = lerp(2.5, 1, k);
      rot = this.winkel - 16 * (1 - k);
    } else {
      const x = d - SCHLAG;
      sc = 1 - 0.13 * Math.exp(-7 * x) * Math.cos(2 * Math.PI * 4.2 * x);
      rot = this.winkel + 3.5 * Math.exp(-6 * x) * Math.sin(2 * Math.PI * 3.4 * x);
    }
    const raus = fortschritt(t, this.aus, this.aus + 0.18);
    sc *= 1 + 0.22 * ease.inQuad(raus);
    this.e.style.transform = `translate(${this.x}px, ${this.y}px)`;
    this.inn.style.transform = `rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
    this.e.style.opacity = String(clamp(d / 0.04) * (1 - raus));
    if (this.strahlen) {
      const x = Math.max(0, d - SCHLAG);
      const k = ease.outCubic(clamp(x / 0.38));
      this.strahlen.style.transform = `rotate(${(d * 16).toFixed(2)}deg) scale(${(0.3 + 0.7 * k + 0.03 * Math.sin(d * 5)).toFixed(4)})`;
      this.strahlen.style.opacity = String(d < SCHLAG ? 0 : clamp(x / 0.06) * 0.8);
    }
  }
}

// =====================================================================================
// Fortschrittsleiste: Strecke mit Marken und Team-Punkten
// =====================================================================================
const FLAGGE = `<svg class="ms-flagge" viewBox="0 0 46 58"><rect x="2" y="2" width="4" height="54" rx="2" fill="var(--tinte)"/>${Array.from({ length: 12 }, (_, i) => { const c = i % 4, r = Math.floor(i / 4); return `<rect x="${6 + c * 9.5}" y="${3 + r * 9.5}" width="9.5" height="9.5" fill="${(c + r) % 2 ? "var(--karte)" : "var(--tinte)"}"/>`; }).join("")}<rect x="6" y="3" width="38" height="28.5" fill="none" stroke="var(--tinte)" stroke-width="2"/></svg>`;
class Leiste extends Baustein {
  /** o: {y=1180, ein, aus, label:"STRECKE", marken:[{anteil, label}], teams:{a:(t)→0..1, b:(t)→0..1}, kurz:{a:"R", b:"G"}} */
  constructor(M, o) {
    super(M, o, 0);
    this.e = el("div", "ms ms-leiste", `${o.label ? `<div class="ms-lbl">${o.label}</div>` : ""}${FLAGGE}`, M.hud.wurzel);
    this.e.style.top = (o.y ?? 1180) + "px";
    this.L0 = 30;
    this.L = SICHER.breite - 30 - 86;
    const teams = Object.keys(o.teams || {});
    const yy = teams.length > 1 ? [54, 82] : [66];
    this.bahnen = teams.map((k, i) => {
      const b = el("div", "ms-bahn", "<b></b>", this.e);
      b.style.top = yy[i] - 5 + "px";
      M.setzeFarbe(b, k);
      const p = el("div", "ms-punkt", o.kurz && o.kurz[k] ? `<span>${o.kurz[k]}</span>` : "", this.e);
      p.style.top = yy[i] + "px";
      M.setzeFarbe(p, k);
      return { k, b, fill: b.querySelector("b"), p, fn: M.wert(o.teams[k]) };
    });
    this.marken = (o.marken || []).map((m) => {
      const e = el("div", "ms-marke", "", this.e);
      e.style.left = this.L0 + m.anteil * this.L + "px";
      return { ...m, e };
    });
  }
  ereignisse() {
    const M = this.M;
    const ev = [...this._ev];
    const von = Math.max(0, this.ein), bis = Math.min(this.aus, M.dauer);
    if (this.ein > 0) ev.push({ t: this.ein, typ: "leiste", klang: "pop" });
    for (const b of this.bahnen) {
      for (const [a, z] of M.laufIntervalle((t) => +b.fn(t).toFixed(4), von, bis)) ev.push({ t: a, typ: "leiste-lauf", dauer: z - a, laufend: true, klang: false });
      for (const m of this.marken) {
        let vorher = b.fn(von) >= m.anteil;
        for (let t = von; t <= bis; t += 1 / M.fps) {
          const jetzt = b.fn(t) >= m.anteil;
          if (jetzt && !vorher) ev.push({ t, typ: "marke", klang: "tick", text: m.label || "" });
          vorher = jetzt;
        }
      }
    }
    return ev;
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.karte);
    zeige(this.e, !!h);
    if (!h) return;
    const s = this.ein <= 0 ? 1 : h.s;
    this.e.style.transform = `translateY(${((1 - s) * 70 + h.x * 40).toFixed(2)}px) scale(${(0.92 + 0.08 * s).toFixed(4)})`;
    this.e.style.opacity = String(clamp(s * 3) * (1 - h.x));
    let maxA = 0;
    for (const b of this.bahnen) {
      const a = clamp(b.fn(t));
      maxA = Math.max(maxA, a);
      b.fill.style.transform = `scaleX(${a.toFixed(4)})`;
      b.p.style.transform = `translateX(${(this.L0 + a * this.L).toFixed(1)}px)`;
    }
    for (const m of this.marken) m.e.classList.toggle("vorbei", maxA >= m.anteil);
  }
}

// =====================================================================================
// Vergleichs- / Formelkarte: „31 mL > 14 mL“, „14 L × 15 MIN = 210 L“
// =====================================================================================
class Formel extends Baustein {
  /** o: {x=SICHER.links, y, breite=SICHER.breite, ein, aus, titel, teile:[{text, einheit, ein, art:"wert"|"op"|"erg", team}], unter:{text, ein, team}, groesse=84} */
  constructor(M, o) {
    const teile = o.teile.map((x) => ({ ...x, t: M.zeit(x.ein) }));
    super(M, { ...o, ein: o.ein ?? Math.min(...teile.map((x) => x.t)) - 0.12 }, 0);
    this.e = el("div", "ms ms-karte ms-formel", `${o.titel ? `<div class="ms-kk"><i></i>${o.titel}</div>` : ""}<div class="ms-ft"></div>`, M.hud.wurzel);
    this.e.style.left = (o.x ?? SICHER.links) + "px";
    this.e.style.width = (o.breite ?? SICHER.breite) + "px";
    this.e.style.top = (o.y ?? 560) + "px";
    const ft = this.e.querySelector(".ms-ft");
    ft.style.fontSize = "0px";
    this.teile = teile.map((x) => {
      const art = x.art || (/^[<>=×+−\-:≈÷·]$/.test(x.text) ? "op" : "wert");
      const e = el("span", `ms-tok ${art}`, `${x.text}${x.einheit ? `<small>${x.einheit}</small>` : ""}`, ft);
      if (x.team) M.setzeFarbe(e, x.team);
      if (o.groesse && art !== "op") e.style.fontSize = o.groesse + "px";
      this.melde({ t: x.t, typ: "formel", klang: art === "erg" ? "ding" : "pop", text: x.text });
      return { ...x, art, e };
    });
    // passt die Zeile nicht in die Karte, alles gemeinsam kleiner setzen
    const platz = (o.breite ?? SICHER.breite) - 68;
    if (ft.scrollWidth > platz) {
      const f = platz / ft.scrollWidth;
      for (const x of this.teile) {
        const cs = parseFloat(getComputedStyle(x.e).fontSize);
        x.e.style.fontSize = cs * f + "px";
        if (x.art === "op") { x.e.style.width = x.e.style.height = 74 * f + "px"; }
      }
      ft.style.gap = 18 * f + "px";
    }
    this.unter = null;
    if (o.unter) {
      this.unter = { ...o.unter, t: M.zeit(o.unter.ein), e: el("div", "ms-unter", o.unter.text, this.e) };
      if (o.unter.team) M.setzeFarbe(this.unter.e, o.unter.team);
      this.melde({ t: this.unter.t, typ: "formel", klang: "pop", text: o.unter.text });
    }
    this.ergT = Math.max(...this.teile.filter((x) => x.art === "erg").map((x) => x.t), -Infinity);
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.karte);
    zeige(this.e, !!h);
    if (!h) return;
    const bump = t >= this.ergT ? Math.exp(-(t - this.ergT) * 7) * Math.sin(clamp((t - this.ergT) / 0.35) * Math.PI) : 0;
    this.e.style.transform = `translateY(${((1 - h.s) * 60 - h.x * 30).toFixed(2)}px) scale(${((0.9 + 0.1 * h.s) * (1 + 0.03 * bump)).toFixed(4)})`;
    this.e.style.opacity = String(clamp(h.s * 3) * (1 - h.x));
    for (const x of [...this.teile, ...(this.unter ? [this.unter] : [])]) {
      const d = t - x.t;
      if (d < 0) { setzeStil(x.e, "opacity", "0"); x.e.style.transform = "translateY(30px) scale(0.6)"; continue; }
      const s = feder(d, FED.pop);
      setzeStil(x.e, "opacity", String(clamp(d / 0.06)));
      x.e.style.transform = `translateY(${((1 - s) * 34).toFixed(2)}px) scale(${(0.6 + 0.4 * s).toFixed(4)})`;
    }
  }
}

// =====================================================================================
// Bilanzkarte: baut sich Zeile für Zeile auf (Endstand, Differenz, Sieger in Teamfarbe)
// =====================================================================================
class Bilanz extends Baustein {
  /**
   * o: {x, y, breite, ein, aus, titel:"ENDSTAND", zeilen:[{label, wert, einheit, nk, team, ein}],
   *     differenz:{label, wert, einheit, nk, zusatz, ein}, sieger:{text, team, ein}}
   */
  constructor(M, o) {
    const zeilen = o.zeilen.map((z) => ({ ...z, t: M.zeit(z.ein) }));
    super(M, { ...o, ein: o.ein ?? zeilen[0].t - 0.15 }, 0);
    this.e = el("div", "ms ms-karte ms-bilanz", `<div class="ms-kk"><i></i>${o.titel ?? "ENDSTAND"}</div>`, M.hud.wurzel);
    this.e.style.left = (o.x ?? SICHER.links) + "px";
    this.e.style.width = (o.breite ?? SICHER.breite) + "px";
    this.e.style.top = (o.y ?? 520) + "px";
    const zeile = (z, klasse) => {
      const box = el("div", "", "", this.e);
      const e = el("div", `ms-bz ${klasse}`, `<div class="l">${klasse === "diff" ? "" : "<i></i>"}<span>${z.label}</span>${z.zusatz ? `<span class="zusatz">${z.zusatz}</span>` : ""}</div><div class="r"></div>`, box);
      if (z.team) M.setzeFarbe(e, z.team);
      const rz = new Rollzahl(e.querySelector(".r"), { nk: z.nk ?? 0, max: Math.abs(z.wert) * 1.05 + 1, einheit: z.einheit || "" });
      return { ...z, box, e, rz, hoehe: 100 };
    };
    this.zeilen = zeilen.map((z) => zeile(z, ""));
    if (o.differenz) this.zeilen.push(zeile({ ...o.differenz, t: M.zeit(o.differenz.ein) }, "diff"));
    this.sieger = null;
    if (o.sieger) {
      const box = el("div", "", "", this.e);
      const e = el("div", "ms-sieger", `<svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 8l4 3 4-6 4 6 4-3-2 10H6L4 8z" fill="currentColor"/><rect x="6" y="19" width="12" height="2.4" rx="1.2" fill="currentColor"/></svg><span>${o.sieger.text}</span>`, box);
      M.setzeFarbe(e, o.sieger.team || "a");
      this.sieger = { ...o.sieger, t: M.zeit(o.sieger.ein), box, e, hoehe: 106 };
    }
    for (const z of this.zeilen) this.melde({ t: z.t, typ: "bilanz", klang: z.e.classList.contains("diff") ? "ding" : "klick", text: z.label });
    if (this.sieger) this.melde({ t: this.sieger.t, typ: "sieger", klang: "sieg", text: o.sieger.text });
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.karte);
    zeige(this.e, !!h);
    if (!h) return;
    this.e.style.transform = `translateY(${((1 - h.s) * 60 - h.x * 30).toFixed(2)}px) scale(${(0.92 + 0.08 * h.s).toFixed(4)})`;
    this.e.style.opacity = String(clamp(h.s * 3) * (1 - h.x));
    for (const z of this.zeilen) {
      const d = t - z.t;
      const s = d < 0 ? 0 : feder(d, FED.karte);
      z.box.style.height = (clamp(s) * z.hoehe).toFixed(1) + "px";
      z.e.style.opacity = String(clamp(d / 0.08));
      z.e.style.transform = `translateX(${((1 - Math.min(1, s)) * 70).toFixed(2)}px)`;
      const p = ease.outCubic(fortschritt(t, z.t + 0.05, z.t + 0.6));
      z.rz.setze(z.wert * p, p >= 1 || p <= 0);
    }
    if (this.sieger) {
      const d = t - this.sieger.t;
      const s = d < 0 ? 0 : feder(d, FED.pop);
      this.sieger.box.style.height = (clamp(s * 1.6) * this.sieger.hoehe).toFixed(1) + "px";
      this.sieger.e.style.opacity = String(clamp(d / 0.06));
      this.sieger.e.style.transform = `scale(${(d < 0 ? 0.5 : lerp(1.35, 1, clamp(s))).toFixed(4)}) rotate(${((1 - Math.min(1, s)) * -4).toFixed(2)}deg)`;
    }
  }
}

// =====================================================================================
// Aufschlüsselung: 2 Faktoren als Balkenpaar („Warum?“)
// =====================================================================================
class Balken extends Baustein {
  /** o: {x, y, breite, ein, aus, titel:"WARUM?", max, faktoren:[{label, ein, a:{wert, text}, b:{wert, text}, tag, tagEin}]} */
  constructor(M, o) {
    const fk = o.faktoren.map((f) => ({ ...f, t: M.zeit(f.ein) }));
    super(M, { ...o, ein: o.ein ?? fk[0].t - 0.2 }, 0);
    this.max = o.max ?? Math.max(...fk.flatMap((f) => [f.a.wert, f.b.wert]));
    this.e = el("div", "ms ms-karte ms-balken", `<div class="ms-kk"><i></i>${o.titel ?? "WARUM?"}</div>`, M.hud.wurzel);
    this.e.style.left = (o.x ?? SICHER.links) + "px";
    this.e.style.width = (o.breite ?? SICHER.breite) + "px";
    this.e.style.top = (o.y ?? 520) + "px";
    this.fk = fk.map((f) => {
      const e = el("div", "ms-fk", `<div class="kopf"><span>${f.label}</span>${f.tag ? `<span class="tag">${f.tag}</span>` : ""}</div>`, this.e);
      const reihe = (team, w) => {
        const z = el("div", "ms-zeile", `<div class="spur"><b></b></div><div class="w"></div>`, e);
        M.setzeFarbe(z, team);
        return { b: z.querySelector("b"), w: z.querySelector(".w"), wert: w.wert, text: w.text };
      };
      const tagE = e.querySelector(".tag");
      const r = { ...f, e, a: reihe("a", f.a), b: reihe("b", f.b), tagE, tagT: f.tag ? M.zeit(f.tagEin ?? f.t + 0.7) : Infinity };
      this.melde({ t: r.t, typ: "balken", dauer: 0.7, klang: "wachsen", text: f.label });
      if (f.tag) this.melde({ t: r.tagT, typ: "balken-tag", klang: "pop", text: f.tag });
      return r;
    });
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.karte);
    zeige(this.e, !!h);
    if (!h) return;
    this.e.style.transform = `translateY(${((1 - h.s) * 60 - h.x * 30).toFixed(2)}px) scale(${(0.92 + 0.08 * h.s).toFixed(4)})`;
    this.e.style.opacity = String(clamp(h.s * 3) * (1 - h.x));
    for (const f of this.fk) {
      const d = t - f.t;
      f.e.style.opacity = String(0.2 + 0.8 * clamp(d / 0.1));
      [[f.a, 0], [f.b, 0.22]].forEach(([r, v]) => {
        const s = d - v < 0 ? 0 : feder(d - v, FED.balken);
        r.b.style.transform = `scaleX(${((s * r.wert) / this.max).toFixed(4)})`;
        const txt = r.text ?? fmt.zahl(r.wert * clamp(s));
        const zeig = d - v >= 0 ? (r.text ? txt : fmt.zahl(Math.round(r.wert * clamp(s)))) : "";
        if (r.w.textContent !== zeig) r.w.textContent = zeig;
      });
      if (f.tagE) {
        const s = t < f.tagT ? 0 : feder(t - f.tagT, FED.pop);
        f.tagE.style.opacity = String(clamp(s * 3));
        f.tagE.style.transform = `scale(${(0.4 + 0.6 * s).toFixed(4)}) rotate(${((1 - s) * 10).toFixed(2)}deg)`;
      }
    }
  }
}

// =====================================================================================
// Pointe: große Typo, Wort für Wort, *markiert* = Akzentfarbe, | = Zeilenumbruch
// =====================================================================================
class Pointe extends Baustein {
  /** o: {text:"EINE *EINZIGE* MINUTE.", ein, takt=0.13 (oder woerter:[{text, ein, farbe}]), y=640, groesse=150, aus} */
  constructor(M, o) {
    super(M, o, 0);
    this.e = el("div", "ms ms-pointe", "", M.hud.wurzel);
    this.e.style.top = (o.y ?? 640) + "px";
    let g = o.groesse ?? 150;
    this.e.style.fontSize = g + "px";
    let liste = o.woerter;
    if (!liste) {
      const takt = o.takt ?? 0.13;
      let k = 0;
      liste = o.text.split(/\s+/).flatMap((w) => {
        if (w === "|") return [{ umbruch: true }];
        const m = /^\*(.+)\*([.,!?]*)$/.exec(w);
        return [{ text: m ? m[1] + m[2] : w, farbe: m ? "akzent" : null, ein: this.ein + takt * k++ }];
      });
    }
    // Zeilen bilden (feste Umbrüche oder nach Breite)
    const zeilen = [[]];
    for (const w of liste) {
      if (w.umbruch) { zeilen.push([]); continue; }
      zeilen[zeilen.length - 1].push(w);
    }
    this.w = [];
    const probe = el("span", "ms-pw", "", this.e);
    const breite = (txt) => { probe.textContent = txt; return probe.offsetWidth; };
    const fertig = [];
    for (const z of zeilen) {
      let akt = [], b = 0;
      for (const w of z) {
        const bw = breite(w.text) + g * 0.2;
        if (akt.length && b + bw > SICHER.breite) { fertig.push(akt); akt = []; b = 0; }
        akt.push(w);
        b += bw;
      }
      if (akt.length) fertig.push(akt);
    }
    const breiteste = Math.max(...fertig.map((z) => z.reduce((a, w) => a + breite(w.text) + g * 0.2, 0)));
    probe.remove();
    if (breiteste > SICHER.breite) { g *= SICHER.breite / breiteste; this.e.style.fontSize = g + "px"; }
    for (const z of fertig) {
      const ze = el("span", "ms-pz", "", this.e);
      for (const w of z) {
        const e = el("span", `ms-pw ${w.farbe === "akzent" ? "akzent" : w.farbe === "a" ? "a" : w.farbe === "b" ? "b" : ""}`, w.text, ze);
        this.w.push({ e, t: M.zeit(w.ein) });
      }
    }
    this.ein = Math.min(...this.w.map((w) => w.t));
    this.melde({ t: this.ein, typ: "pointe", klang: o.klang ?? "akzent", text: o.text || liste.map((w) => w.text).join(" ") });
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    zeige(this.e, an);
    if (!an) return;
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.25));
    this.e.style.opacity = String(1 - x);
    this.e.style.transform = `translateY(${(-x * 40).toFixed(2)}px) scale(${(1 - 0.06 * x).toFixed(4)})`;
    for (const w of this.w) {
      const d = t - w.t;
      if (d < 0) { setzeStil(w.e, "opacity", "0"); continue; }
      const s = feder(d, FED.pop);
      setzeStil(w.e, "opacity", String(clamp(d / 0.05)));
      w.e.style.transform = `translateY(${((1 - s) * 50).toFixed(2)}px) scale(${lerp(1.35, 1, clamp(s)).toFixed(4)}) rotate(${((1 - s) * -6).toFixed(2)}deg)`;
    }
  }
}

// =====================================================================================
// Folgen-Hinweis (Wahl des Inhabers 08.11.2026, Hirn „Regelwerk Simulierbar“): kleine, NICHT gesprochene Textzeile unter der
// Schlusskarte in den letzten 2–3 s, an den Inhalt gebunden („Teil 2 ist im Profil“, „Jeden Tag ein Geld-Duell im Profil“);
// kein Tausch, keine Belohnung, kein Druck. Nur im Testblock folgen_hinweis = „mit“ (10 Videos mit, 10 ohne). Ersetzt M.folgen bei ca. 20 s.
// =====================================================================================
class Hinweis extends Baustein {
  /** o: {text, ein = Videoende − 2,5 s (Zahl oder Wortzeit), aus, y = 1190, groesse = 46} */
  constructor(M, o) {
    super(M, o, Math.max(0, M.dauer - 2.5));
    this.text = String(o.text || "").trim();
    this.e = el("div", "ms ms-hinweis", "", M.hud.wurzel);
    this.e.textContent = this.text;
    this.e.style.top = (o.y ?? 1190) + "px";
    this.e.style.fontSize = (o.groesse ?? 46) + "px";
    const ende = Number.isFinite(this.aus) ? this.aus : M.dauer;
    this.melde({ t: this.ein, typ: "folgen_hinweis", dauer: +Math.max(0, ende - this.ein).toFixed(3), text: this.text, gesprochen: false, klang: false });
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.3;
    zeige(this.e, an);
    if (!an) return;
    const s = ease.outCubic(clamp((t - this.ein) / 0.4));
    const weg = Number.isFinite(this.aus) ? clamp((t - this.aus) / 0.3) : 0;
    this.e.style.opacity = String(s * (1 - weg));
    this.e.style.transform = `translateY(${((1 - s) * 18).toFixed(2)}px)`;
  }
}

// =====================================================================================
// Folgen-Aufruf (bei ca. 20 s, max. 2 s): Pille „+ Folgen“ mit Pfeil Richtung Profilbild (rechter Bildrand)
// =====================================================================================
class Folgen extends Baustein {
  /** o: {ein=20, dauer=1.8 (max. 2), y=950, text="Folgen", team="a"} */
  constructor(M, o) {
    super(M, { ...o, ein: o.ein ?? 20 }, 20);
    this.dauer = Math.min(2, o.dauer ?? 1.8);
    this.aus = this.ein + this.dauer - 0.25;
    this.y = o.y ?? 950;
    this.e = el("div", "ms ms-folgen", `<div class="ms-fp"><span class="ms-plus"><svg viewBox="0 0 56 56"><g class="plus" stroke="var(--tt)" stroke-width="6" stroke-linecap="round"><line x1="28" y1="16" x2="28" y2="40"/><line x1="16" y1="28" x2="40" y2="28"/></g><path class="haken" d="M16 29l8 8 16-17" fill="none" stroke="var(--tt)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>${o.text ?? "Folgen"}</span></div><svg class="ms-pfeil" viewBox="0 0 74 50" preserveAspectRatio="xMidYMid meet"><path d="M4 25h52" stroke="#fff" stroke-width="9" stroke-linecap="round"/><path d="M42 8l20 17-20 17" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 25h52" stroke="var(--tf)" stroke-width="5" stroke-linecap="round"/><path d="M42 8l20 17-20 17" fill="none" stroke="var(--tf)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`, M.hud.wurzel);
    M.setzeFarbe(this.e, o.team || "a");
    this.plus = this.e.querySelector(".plus");
    this.haken = this.e.querySelector(".haken");
    this.pfeil = this.e.querySelector(".ms-pfeil");
    this.breite = this.e.offsetWidth;
    this.melde({ t: this.ein, typ: "folgen", dauer: this.dauer, klang: "folgen" });
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.pop, 0.25);
    zeige(this.e, !!h);
    if (!h) return;
    const x0 = SICHER.rechts - 4 - this.breite;
    const s = h.s;
    this.e.style.transform = `translate(${(x0 + (1 - s) * 320 + ease.inBack(h.x) * 340).toFixed(1)}px, ${this.y}px)`;
    this.e.style.opacity = String(clamp(h.d / 0.08) * (1 - h.x));
    const stups = h.d > 0.35 ? Math.max(0, Math.sin((h.d - 0.35) * Math.PI * 3.2)) * Math.exp(-(h.d - 0.35) * 1.5) : 0;
    this.pfeil.style.transform = `translateX(${(stups * 16).toFixed(2)}px)`;
    const k = ease.inOutCubic(fortschritt(h.d, 0.95, 1.2));
    this.plus.style.opacity = String(1 - k);
    this.plus.setAttribute("transform", `rotate(${(k * 90).toFixed(1)} 28 28)`);
    this.haken.style.opacity = String(k);
  }
}

// =====================================================================================
// Schwebender Live-Zähler (z. B. „31 mL“ über einer Figur)
// =====================================================================================
class LiveZaehler extends Baustein {
  /** o: {wert(t), nk, einheit, max, team, art:"hell"|"voll", label, x, y oder punkt(t) → {x,y}, ein, aus, anker:"mitte"} */
  constructor(M, o) {
    super(M, o, 0);
    const art = o.art || "hell";
    this.e = el("div", `ms ms-chip ${art}`, `<i></i>${o.label ? `<span style="font-size:0.62em;letter-spacing:0.06em">${o.label}</span>` : ""}`, M.hud.wurzel);
    M.setzeFarbe(this.e, o.team || "a");
    this.rz = new Rollzahl(this.e, { nk: o.nk ?? 0, max: o.max ?? 999, einheit: o.einheit || "" });
    this.fn = M.wert(o.wert);
    this.x = o.x ?? SICHER.mitte;
    this.y = o.y ?? 700;
    this.punkt = o.punkt || null;
    this.anker = o.anker || "mitte";
  }
  ereignisse() {
    const ev = [...this._ev];
    if (this.ein > 0) ev.push({ t: this.ein, typ: "zaehler-ein", klang: "pop" });
    for (const [a, b] of this.M.laufIntervalle((t) => +this.fn(t).toFixed(4), Math.max(0, this.ein), Math.min(this.aus, this.M.dauer))) ev.push({ t: a, typ: "zaehler", dauer: b - a, laufend: true, klang: "zaehlen" });
    return ev;
  }
  update(t) {
    const h = huelle(t, this.ein, this.aus, FED.pop);
    zeige(this.e, !!h);
    if (!h) return;
    const v = this.fn(t), v0 = this.fn(t - 1 / this.M.fps);
    this.rz.setze(v, Math.abs(v - v0) < 1e-6);
    let x = this.x, y = this.y;
    if (this.punkt) ({ x, y } = this.punkt(t));
    const drin = ankerImBild(x, y);
    const w = this.e.offsetWidth;
    let left = this.anker === "mitte" ? x - w / 2 : this.anker === "rechts" ? x - w : x;
    left = clamp(left, SICHER.links, SICHER.rechts - w);
    const hh = this.e.offsetHeight;
    y = clamp(y, (this.o.minY ?? SICHER.oben + 180) + hh / 2, SICHER.unten - 100 - hh / 2);
    const s = this.ein <= 0 ? 1 : h.s;
    this.e.style.transform = `translate(${left.toFixed(1)}px, ${(y - hh / 2).toFixed(1)}px) scale(${((0.4 + 0.6 * s) * (1 - 0.3 * h.x)).toFixed(4)})`;
    this.e.style.opacity = String(clamp(s * 3) * (1 - h.x) * drin);
  }
}

// =====================================================================================
// Untertitel nach §8: kurze Phrasen (2–5 Wörter) als Block, kein Kasten, weiße fette Schrift mit Kontur,
// Schlüsselwörter in Teamfarbe (Teams: woerter; zusätzlich schluessel: {"Vorsprung": "akzent"})
// =====================================================================================
class Untertitel extends Baustein {
  /** o: {unten=1450, groesse=60, maxBreite=860, max=5, versteckt:[[von, bis]], schluessel:{wort: farbe}, zahlen:false} */
  constructor(M, o) {
    super(M, o, 0);
    this.unten = o.unten ?? 1450;
    this.groesse = o.groesse ?? 60;
    this.maxBreite = o.maxBreite ?? 860;
    this.max = o.max ?? 5;
    this.versteckt = (o.versteckt || []).map(([a, b]) => [M.zeit(a), M.zeit(b)]);
    this.e = el("div", "ms-ut", "", M.hud.wurzel);
    this.e.style.top = this.unten + "px";
    // Schlüsselwörter: normalisiert, * = Wortanfang
    const regeln = [];
    for (const [k, team] of Object.entries(M.teams)) for (const w of team.woerter || []) regeln.push([normalisiere(w), k]);
    for (const [w, f] of Object.entries(o.schluessel || {})) regeln.push([normalisiere(w), f]);
    const klasse = (wort) => {
      const n = normalisiere(wort);
      for (const [r, f] of regeln) if (r.endsWith("*") ? n.startsWith(r.slice(0, -1)) : n === r) return f === "a" || f === "b" ? f : "akzent";
      if (o.zahlen && /\d/.test(n)) return "akzent";
      return "";
    };
    // Breiten messen
    const probe = el("div", "ms-ub", "", this.e);
    probe.style.display = "block";
    probe.style.visibility = "hidden";
    const pl = el("span", "ms-ul", "", probe);
    pl.style.fontSize = this.groesse + "px";
    const cache = new Map();
    const breite = (w) => {
      if (!cache.has(w)) {
        const s = el("span", "ms-uw", w, pl);
        cache.set(w, s.getBoundingClientRect().width);
        s.remove();
      }
      return cache.get(w);
    };
    const phrasen = M.zp.phrasen({ max: this.max });
    this.bloecke = phrasen.map((ws) => {
      const summe = (a) => a.reduce((x, w) => x + breite(w.wort), 0);
      let zeilen = [ws];
      if (summe(ws) > this.maxBreite && ws.length > 1) {
        let best = null;
        for (let k = 1; k < ws.length; k++) {
          const m = Math.max(summe(ws.slice(0, k)), summe(ws.slice(k)));
          if (!best || m < best.m) best = { k, m };
        }
        zeilen = [ws.slice(0, best.k), ws.slice(best.k)];
      }
      const breiteste = Math.max(...zeilen.map(summe));
      const faktor = Math.min(1, this.maxBreite / breiteste);
      const b = el("div", "ms-ub", "", this.e);
      for (const z of zeilen) {
        const ze = el("span", "ms-ul", "", b);
        ze.style.fontSize = this.groesse * faktor + "px";
        for (const w of z) el("span", `ms-uw ${klasse(w.wort)}`, w.wort, ze);
      }
      return { el: b, start: ws[0].start, letztes: ws[ws.length - 1].ende, text: ws.map((w) => w.wort).join(" "), n: ws.length, zeilen: zeilen.length };
    });
    probe.remove();
    this.bloecke.forEach((b, i) => {
      const n = this.bloecke[i + 1];
      b.ein = b.start < 0.25 ? -1 : b.start - 0.03;
      b.aus = n && n.start - b.letztes < 0.7 ? n.start - 0.03 : b.letztes + 0.45;
      this.melde({ t: Math.max(0, b.ein), typ: "untertitel", klang: false, bild: false, text: b.text, woerter: b.n, zeilen: b.zeilen });
    });
  }
  update(t) {
    let aktiv = null;
    if (!this.versteckt.some(([a, b]) => t >= a && t < b)) for (const b of this.bloecke) if (t >= b.ein && t < b.aus) aktiv = b;
    for (const b of this.bloecke) {
      if (b !== aktiv) {
        if (b.el.style.display !== "none") b.el.style.display = "none";
        continue;
      }
      b.el.style.display = "block";
      const d = t - b.ein;
      const s = b.ein < 0 ? 1 : feder(d, FED.schnell);
      const raus = fortschritt(t, b.aus - 0.1, b.aus);
      const weiter = this.bloecke[this.bloecke.indexOf(b) + 1];
      const r = weiter && Math.abs(weiter.ein - b.aus) < 0.05 ? 0 : raus;
      b.el.style.opacity = String(clamp(b.ein < 0 ? 1 : d / 0.05) * (1 - r));
      b.el.style.transform = `translateY(${((1 - s) * 16).toFixed(2)}px) scale(${(0.88 + 0.12 * s).toFixed(4)})`;
    }
  }
}
