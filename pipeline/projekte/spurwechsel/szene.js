// Video · Simulierbar · „Spurwechsel im Stau: Bist du auf der anderen Spur wirklich schneller?“ (Rubrik ALLTAG)
// Designstil 2 „Isometrisches 3D“ (Baukasten engine/iso.js). Deterministisch: window.renderAt(t) zeichnet das Bild zur Zeit t.
// Alle Autos fahren exakt die Bahnen aus der Simulation (trajektorien_rennen.json, trajektorien_wahrnehmung.json);
// alle Zahlen im Bild stammen aus sim_ergebnisse.json bzw. den Bahnen und sind wie im Sprechtext gerundet.
import * as THREE from "three";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD, Markenleiste, Karaoke, Anker, Erscheinung, el, fmt, WUERFEL, SPRECHBLASE } from "../../engine/hud.js";
import { STOPPUHR } from "../../engine/duell.js";
import { ease, feder, FEDER, fortschritt, clamp, lerp, hash, smoothstep } from "../../engine/bewegung.js";
import { ISO, IsoBuehne, isoKamera, richteKamera, isoLicht, isoVerlauf, StrassenStreifen, IsoAutos, IsoVerkehr, gierwinkel, IsoDuellTafel, isoChip } from "../../engine/iso.js";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 4096;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};
function wortZeit(zp, seg, wort, anteil = 0.5, opt) {
  try {
    return zp.w(seg, wort, opt);
  } catch (e) {
    const g = zp.seg(seg);
    console.warn(`Anker fehlt: ${seg}/${wort} → ${Math.round(anteil * 100)} % des Segments`);
    return g.start + anteil * (g.ende - g.start);
  }
}
const mmss = (s) => {
  const g = Math.max(0, Math.round(s));
  return `${Math.floor(g / 60)}:${String(g % 60).padStart(2, "0")}`;
};

// Farben
const ORANGE = ISO.orange, BLAU = ISO.blau, GRUEN = ISO.gruen, ROT = ISO.rot;
const C_PAUL = new THREE.Color(ORANGE), C_ANNA = new THREE.Color(BLAU);
const NEUTRAL = ["#F4F4F8", "#DADDF0", "#E9E7F2", "#C3C8E2", "#FFFFFF", "#B3B9D6", "#EDEBF7", "#CDD1E8"].map((c) => new THREE.Color(c));
const neutral = (id) => NEUTRAL[Math.floor(hash(id, 41) * NEUTRAL.length)];

// Kamera: fester Blick (Azimut 30°, Höhe 35°), die Welt läuft unter der Kamera durch
const AZ = 30, EL = 35;

// =====================================================================================
// Welt
// =====================================================================================
function baueWelt() {
  const szene = new THREE.Scene();
  szene.background = isoVerlauf();
  const licht = isoLicht(szene, { schattenKarte: SCHATTEN });
  const kmTafeln = [1, 2, 3, 4].map((k) => ({ x: k * 1000, text: `${k} km` }));
  const neu = (seed, tiefe, pos) => {
    const s = new StrassenStreifen({ laenge: 300, tiefe, seed, start: 0, ziel: 5000, kmTafeln });
    s.gruppe.position.copy(pos);
    szene.add(s.gruppe);
    const autos = new IsoAutos(220);
    s.gruppe.add(autos.gruppe);
    // farbige Bodenfläche unter den beiden Hauptpersonen
    const ring = (farbe) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).lerp(new THREE.Color("#FFFFFF"), 0.25), transparent: true, opacity: 0.55, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.scale.set(3.9, 2.2, 1);
      m.renderOrder = 2;
      m.visible = false;
      s.gruppe.add(m);
      return m;
    };
    return { streifen: s, autos, ringe: { paul: ring(ORANGE), anna: ring(BLAU) } };
  };
  const gross = neu(3, 30, V(0, 0, 0));
  // geteiltes Bild: zwei schmalere Streifen, senkrecht übereinander im Bild (Versatz entlang der Bild-Hochachse)
  const a = (AZ * Math.PI) / 180;
  const D = 34;
  const OFF = 3000;
  const oben = neu(5, 22, V(OFF + Math.tan(a) * D, 0, -D));
  const unten = neu(7, 22, V(OFF, 0, 0));
  return { szene, licht, gross, oben, unten, splitMitte: V(OFF + (Math.tan(a) * D) / 2, 0, -D / 2) };
}

/** Verkehr in einen Streifen setzen. helden: {paul: id|null, anna: id|null} */
function setzeVerkehr(T, verkehr, tau, zentrum, helden) {
  const s = T.streifen;
  s.setzeZentrum(zentrum);
  const liste = [];
  T.ringe.paul.visible = T.ringe.anna.visible = false;
  verkehr.fahrzeuge(tau, (z) => {
    const lx = z.x - zentrum;
    if (Math.abs(lx) > s.laenge / 2 - 3) return;
    const rolle = z.id === helden.paul ? "paul" : z.id === helden.anna ? "anna" : null;
    const farbe = rolle === "paul" ? C_PAUL : rolle === "anna" ? C_ANNA : neutral(z.id);
    const zz = s.spurZ(z.s);
    const gier = gierwinkel(z, s.spur);
    liste.push({ x: lx, z: zz, gier, farbe, bremse: z.bremse });
    if (rolle) {
      const r = T.ringe[rolle];
      r.visible = true;
      r.position.set(lx, 0.12, zz);
      r.rotation.z = gier;
    }
  });
  T.autos.setze(liste);
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing);
  const W = (s, w, a, o) => wortZeit(zp, s, w, a, o);
  const S = (id) => zp.seg(id);

  const erg = await lade("sim_ergebnisse.json");
  const K = erg.kernzahlen;
  const datenR = await lade("trajektorien_rennen.json");
  const datenW = await lade("trajektorien_wahrnehmung.json");
  const rennen = new IsoVerkehr(datenR);
  const wahrn = new IsoVerkehr(datenW);
  const PAUL = datenR.paul.id, ANNA = datenR.anna.id;
  const ANNA_W = datenW.anna.id;
  const ZEIT_P = datenR.paul.zeitS, ZEIT_A = datenR.anna.zeitS;
  const STRECKE = datenR.meta.streckeM;
  // Pauls Spurwechsel (Zeitpunkt der Modellschritte, ab Rennstart)
  const wechselPaul = [];
  for (let k = 1; k < datenR.verlauf.length; k++) if (datenR.verlauf[k].spurPaul !== datenR.verlauf[k - 1].spurPaul && datenR.verlauf[k].t <= ZEIT_P) wechselPaul.push(datenR.verlauf[k - 1].t);
  const wechselBis = (tau) => wechselPaul.filter((t0) => tau >= t0 + 0.25).length;

  const buehne = new IsoBuehne(document.getElementById("leinwand"), { msaa: MSAA });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const WELT = baueWelt();
  const { szene } = WELT;

  // ---------- Segmentzeiten ----------
  const tSetup = S("setup").start, tRennen = S("rennen").start, tZiel = S("ziel").start, tSchnitt = S("schnitt").start;
  const tWahr = S("wahrnehmung").start, tErkl = S("erklaerung").start, tFazit = S("fazit").start, tEnde = S("ende").start;
  const DAUER = zp.dauer;

  // ---------- Welten ----------
  // Großer Streifen: Bildausschnitt ca. 64 m breit, Straße in der Bildmitte (y ≈ 900 px)
  const GROSS = { breite: 56, versatzY: -50 };
  const SPLIT = { breite: 66, versatzY: -70 };
  const kamOverride = Q.get("kam") ? Q.get("kam").split(",").map(Number) : null;
  const welt = (name, { layout = "gross", tau, zentrum, helden = { paul: PAUL, anna: ANNA }, daten = rennen, zoom = () => 1, extra = null }) => {
    const kamera = isoKamera({ azimut: AZ, hoehe: EL, breite: 64 });
    const w = {
      name, szene, kamera, tau,
      update(t) {
        const ta = tau(t);
        if (layout === "gross") {
          const k = GROSS.breite * zoom(t);
          richteKamera(kamera, { ziel: [0, 0, 0], breite: kamOverride ? kamOverride[0] : k, versatzY: kamOverride ? kamOverride[1] : GROSS.versatzY });
          w.zentrumWert = zentrum(ta, t);
          setzeVerkehr(WELT.gross, daten, ta, w.zentrumWert, helden);
          WELT.licht.folge(V(0, 0, 0), 60);
        } else {
          const m = WELT.splitMitte;
          richteKamera(kamera, { ziel: [m.x, 0, m.z], breite: SPLIT.breite * zoom(t), versatzY: SPLIT.versatzY });
          const xp = daten.von(helden.paul, ta)?.x ?? 0, xa = daten.von(helden.anna, ta)?.x ?? 0;
          setzeVerkehr(WELT.oben, daten, ta, xp, helden);
          setzeVerkehr(WELT.unten, daten, ta, xa, helden);
          WELT.licht.folge(m, 75);
        }
        if (extra) extra(t, ta, w);
      },
    };
    return w;
  };
  const linear = (t0, tau0, rate = 1) => (t) => tau0 + (t - t0) * rate;
  const xVon = (id, d = rennen) => (ta) => d.von(id, ta)?.x ?? 0;
  const mitte = (ta) => ((rennen.von(PAUL, ta)?.x ?? 0) + (rennen.von(ANNA, ta)?.x ?? 0)) / 2;
  const zoomLeicht = (t0, t1, a = 1.04, b = 1.0) => (t) => lerp(a, b, ease.inOutSine(fortschritt(t, t0, t1)));

  // Übergangszeiten (Mitte des Übergangs)
  const uStart = tSetup - 0.25;
  const uSplit = W("rennen", "Nach", 0.3) - 0.12;
  const uHinter = W("rennen", "Fünf", 0.5) - 0.12;
  const uVorbei = W("rennen", "Erst", 0.75) - 0.12;
  const uZiel = tZiel - 0.2;
  const tAnnaZiel = W("ziel", "9:56.", 0.6);
  const uZiel2 = W("ziel", "Anna", 0.5) - 0.32;
  const uSchnitt = tSchnitt - 0.2;
  const uWahr = tWahr - 0.2;
  const uFazit = tFazit - 0.22;
  const uEnde = tEnde - 0.15;

  // 1) Hook: Paul wechselt die Spur und rollt los (Rennzeit 499,5 s …)
  const weltHook = welt("hook", { tau: linear(0, 499.6, 1.15), zentrum: (ta) => xVon(PAUL)(ta) + 6, zoom: zoomLeicht(0, uStart, 1.0, 0.96) });
  // 2) Start: beide nebeneinander am Startportal; Rennzeit 0 bei „Paul“ im Setup, Pauls erster Wechsel bei „wechselt sofort“
  const tWechsel1 = W("rennen", "wechselt", 0.1) + 0.05;
  const tauStart = (t) => (t - tWechsel1) + wechselPaul[0] + 0.15;
  const weltStart = welt("start", { tau: tauStart, zentrum: (ta) => clamp(mitte(ta), -4, 40) + 2, zoom: zoomLeicht(uStart, uSplit, 1.06, 0.98) });
  // 3) Geteiltes Bild: Anna liegt rund 160 m vorn
  const tau160 = 85.5;
  const weltSplit = welt("split", { layout: "split", tau: linear(W("rennen", "160", 0.5), tau160, 1.0) });
  // 4) Fünf Wechsel später steht Paul wieder hinter Anna (5. Wechsel bei „hinter“)
  const t5 = W("rennen", "hinter", 0.75, { ab: 20 });
  const weltHinter = welt("hinter", { tau: linear(t5, wechselPaul[4] + 0.3, 1.5), zentrum: (ta) => mitte(ta) + 2 });
  // 5) Nach sieben Minuten zieht Paul vorbei (6. Wechsel bei „zieht“)
  const tVorbei = W("rennen", "vorbei.", 0.6) + 0.05;
  const weltVorbei = welt("vorbei", { tau: linear(tVorbei, wechselPaul[5] + 2.3, 2.2), zentrum: (ta) => mitte(ta) + 3 });
  // 6) Ziel: Paul überquert die Ziellinie bei „9:36“, Zeitsprung, Anna bei „9:56“
  const tPaulZiel = W("ziel", "9:36,", 0.5);
  const weichMax = (a, b, k = 6) => (a + b + Math.sqrt((a - b) ** 2 + k * k)) / 2;
  const weltZiel1 = welt("ziel1", { tau: linear(tPaulZiel, ZEIT_P, 1.0), zentrum: (ta) => weichMax(STRECKE - 6, xVon(PAUL)(ta) - 4) });
  const weltZiel2 = welt("ziel2", { tau: linear(tAnnaZiel, ZEIT_A, 1.0), zentrum: (ta) => weichMax(STRECKE - 6, xVon(ANNA)(ta) - 4), zoom: zoomLeicht(tAnnaZiel, uSchnitt, 1.0, 1.08) });
  // 7) Im Schnitt: ruhiger Blick auf das Rennen (Rennzeit 300 s …)
  const weltSchnitt = welt("schnitt", { tau: linear(uSchnitt, 300, 1.0), zentrum: (ta) => mitte(ta), zoom: zoomLeicht(uSchnitt, uWahr, 1.1, 1.02) });
  // 8) Wahrnehmung: Referenz (niemand wechselt), Anna blau. Gleiches Zeitraffer-Tempo für beide Phasen (fair).
  const bsp = datenW.meta.beispiel;
  const tPhaseB = W("wahrnehmung", "Dann", 0.3) - 0.85;
  const RATE_W = 1.5;
  const tauW = (t) => bsp.t + 9 + (t - tPhaseB) * RATE_W;
  const weltWahr = welt("wahrnehmung", { daten: wahrn, helden: { paul: null, anna: ANNA_W }, tau: tauW, zentrum: (ta) => xVon(ANNA_W, wahrn)(ta) + 4, zoom: zoomLeicht(uWahr, tErkl, 1.08, 1.0) });
  // 8b) Erklärung: Anna steht, die Nachbarspur rollt mit Abstand an ihr vorbei (Referenzlauf ab Rennzeit 106,5 s)
  const uErkl = tErkl - 0.25;
  const weltErkl = welt("erklaerung", { daten: wahrn, helden: { paul: null, anna: ANNA_W }, tau: linear(uErkl, 106.5, 1.2), zentrum: (ta) => xVon(ANNA_W, wahrn)(ta) + 4, zoom: zoomLeicht(uErkl, uFazit, 1.0, 1.06) });
  // 9) Fazit: Anna bleibt in ihrer Spur
  const weltFazit = welt("fazit", { tau: linear(uFazit, 150, 1.0), zentrum: (ta) => xVon(ANNA)(ta) + 4, zoom: zoomLeicht(uFazit, DAUER, 1.0, 1.08) });

  const zl = new Zeitleiste(buehne);
  zl.shot(0, weltHook);
  zl.shot(uStart, weltStart, { typ: "wisch", dauer: 0.6, richtung: [1, -0.35], farbe1: ISO.gelb, farbe2: ORANGE });
  zl.shot(uSplit, weltSplit, { typ: "wisch", dauer: 0.55, richtung: [0, -1], farbe1: ISO.gelb, farbe2: BLAU });
  zl.shot(uHinter, weltHinter, { typ: "wisch", dauer: 0.55, richtung: [0, 1], farbe1: ISO.gelb, farbe2: ORANGE });
  zl.shot(uVorbei, weltVorbei, { typ: "wisch", dauer: 0.5, richtung: [1, -0.35], farbe1: ISO.gelb, farbe2: ORANGE });
  zl.shot(uZiel, weltZiel1, { typ: "wisch", dauer: 0.55, richtung: [1, -0.35], farbe1: ISO.gelb, farbe2: ISO.tinte });
  zl.shot(uZiel2, weltZiel2, { typ: "blende", dauer: 0.36 });
  zl.shot(uSchnitt, weltSchnitt, { typ: "blende", dauer: 0.45 });
  zl.shot(uWahr, weltWahr, { typ: "wisch", dauer: 0.6, richtung: [-1, -0.35], farbe1: ISO.gelb, farbe2: BLAU });
  zl.shot(uErkl, weltErkl, { typ: "blende", dauer: 0.4 });
  zl.shot(uFazit, weltFazit, { typ: "wisch", dauer: 0.55, richtung: [1, -0.35], farbe1: ISO.gelb, farbe2: GRUEN });

  // Rennzeit der gerade sichtbaren Renn-Einstellung (für Tafel und Uhr)
  const rennWelten = [[uStart, weltStart], [uSplit, weltSplit], [uHinter, weltHinter], [uVorbei, weltVorbei], [uZiel, weltZiel1], [uZiel2, weltZiel2]];
  const rennTau = (t) => {
    let w = null;
    for (const [ab, x] of rennWelten) if (t >= ab) w = x;
    return w ? w.tau(t) : null;
  };

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  const KY = 1300;
  const marke = hud.add(new Markenleiste(hud, { rubrik: `${STOPPUHR}ALLTAG` }));
  marke.verstecke(tEnde - 0.2, 999);

  // ---------- Hook: Titel (steht schon im ersten Bild) ----------
  const titel = el("div", "iso-titel", `<div class="klein">Ständig die Spur wechseln?</div><div class="gross"><span class="zahl">20</span> Sekunden.</div><div class="unter">So viel bringt es auf 5 km Stau.</div>`, hud.wurzel);
  hud.add(new Erscheinung(hud, titel, { y: 262, ein: -1, aus: uStart - 0.3, stil: "hoch", klang: false }));
  isoChip(hud, { html: `<span class="raute"></span>simuliert`, x: 54, y: 556, ein: W("hook", "simuliert.", 0.8) - 0.1, aus: uStart - 0.3, schatten: "#B9BEE6" }, Erscheinung);

  // ---------- Namensschilder (3D-Anker) ----------
  const pos3 = (T, id, d, ta, w) => {
    const z = d.von(id, ta);
    if (!z) return V(9999, 0, 0);
    const s = T.streifen;
    const zentrum = T === WELT.gross && w.zentrumWert !== undefined ? w.zentrumWert : s.zentrum;
    return V(z.x - zentrum, 2.4, s.spurZ(z.s)).add(T.streifen.gruppe.position);
  };
  const schild = (rolle, html, w, T, d, ein, aus, { hoehe = 150, minY = 560, id } = {}) =>
    hud.add(new Anker(hud, { html, klasse: `iso ${rolle}`, kamera: w.kamera, ein, aus, hoehe, minY, punkt: (t) => pos3(T, id, d, w.tau(t), w) }));
  const PAUL_HTML = (zeile) => `<small><i></i>PAUL</small>${zeile}`;
  const ANNA_HTML = (zeile) => `<small><i></i>ANNA</small>${zeile}`;
  schild("paul", PAUL_HTML("wechselt"), weltHook, WELT.gross, rennen, 0.9, uStart - 0.3, { id: PAUL, hoehe: 130 });
  schild("paul", PAUL_HTML("wechselt"), weltStart, WELT.gross, rennen, W("setup", "Paul", 0.4) - 0.05, uSplit - 0.3, { id: PAUL, hoehe: 175 });
  schild("anna", ANNA_HTML("bleibt"), weltStart, WELT.gross, rennen, W("setup", "Anna", 0.6) - 0.05, uSplit - 0.3, { id: ANNA, hoehe: 110 });
  schild("paul", PAUL_HTML(""), weltSplit, WELT.oben, rennen, uSplit + 0.15, uHinter - 0.3, { id: PAUL, hoehe: 70, minY: 540 }).schild.classList.add("klein");
  schild("anna", ANNA_HTML(""), weltSplit, WELT.unten, rennen, uSplit + 0.25, uHinter - 0.3, { id: ANNA, hoehe: 70, minY: 540 });
  schild("paul", PAUL_HTML(""), weltHinter, WELT.gross, rennen, uHinter + 0.15, uVorbei - 0.3, { id: PAUL, hoehe: 160 });
  schild("anna", ANNA_HTML(""), weltHinter, WELT.gross, rennen, uHinter + 0.25, uVorbei - 0.3, { id: ANNA, hoehe: 95 });
  schild("paul", PAUL_HTML(""), weltVorbei, WELT.gross, rennen, uVorbei + 0.15, uZiel - 0.3, { id: PAUL, hoehe: 160 });
  schild("anna", ANNA_HTML(""), weltVorbei, WELT.gross, rennen, uVorbei + 0.25, uZiel - 0.3, { id: ANNA, hoehe: 95 });
  schild("paul", PAUL_HTML("im Ziel"), weltZiel1, WELT.gross, rennen, tPaulZiel - 0.1, uZiel2 - 0.25, { id: PAUL, hoehe: 140 });
  schild("anna", ANNA_HTML("im Ziel"), weltZiel2, WELT.gross, rennen, tAnnaZiel - 0.1, uSchnitt - 0.3, { id: ANNA, hoehe: 140 });
  schild("anna", ANNA_HTML("bleibt"), weltWahr, WELT.gross, wahrn, uWahr + 0.3, uErkl - 0.3, { id: ANNA_W, hoehe: 120 });
  schild("anna", ANNA_HTML("steht"), weltErkl, WELT.gross, wahrn, uErkl + 0.25, W("erklaerung", "Darum", 0.2) - 0.75, { id: ANNA_W, hoehe: 120 });
  // „Wer rollt, hat Abstand. Wer steht, steht dicht an dicht.“: Schilder an der Straße (relativ zu Anna)
  const strassenPunkt = (dx, spurAndere) => (t) => {
    const z = wahrn.von(ANNA_W, weltErkl.tau(t));
    if (!z) return V(9999, 0, 0);
    const s = WELT.gross.streifen;
    const spur = spurAndere ? 1 - Math.round(z.s) : Math.round(z.s);
    return V(z.x + dx - (weltErkl.zentrumWert ?? s.zentrum), 0.4, s.spurZ(spur));
  };
  hud.add(new Anker(hud, { html: `<small><i></i>ROLLT</small>mit Abstand`, klasse: "iso gruen", kamera: weltErkl.kamera, ein: W("erklaerung", "rollt,", 0.2) - 0.15, aus: W("erklaerung", "Darum", 0.2) - 0.75, hoehe: 260, minY: 560, punkt: strassenPunkt(17, true) }));
  hud.add(new Anker(hud, { html: `<small><i></i>STEHT</small>dicht an dicht`, klasse: "iso rot", kamera: weltErkl.kamera, ein: W("erklaerung", "steht,", 0.2) - 0.15, aus: W("erklaerung", "Darum", 0.2) - 0.75, hoehe: 90, minY: 560, punkt: strassenPunkt(-16, false) }));

  // Namensschilder dürfen sich nicht überdecken: überlappende Paare seitlich auseinanderschieben
  const alleSchilder = hud.teile.filter((x) => x instanceof Anker);
  hud.add({
    update: () => {
      const sichtbar = alleSchilder.filter((a) => a.e.style.visibility !== "hidden");
      for (let i = 0; i < sichtbar.length; i++) for (let j = i + 1; j < sichtbar.length; j++) {
        const A = sichtbar[i].schild.getBoundingClientRect(), B = sichtbar[j].schild.getBoundingClientRect();
        const ueberX = Math.min(A.right, B.right) - Math.max(A.left, B.left) + 16;
        const ueberY = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top) + 10;
        if (ueberX <= 0 || ueberY <= 0) continue;
        // das linke Schild nach links, das rechte nach rechts (rechte Sicherheitszone: höchstens bis x = 930)
        const [li, re] = A.left + A.width / 2 <= B.left + B.width / 2 ? [sichtbar[i], sichtbar[j]] : [sichtbar[j], sichtbar[i]];
        const rRe = re.schild.getBoundingClientRect(), rLi = li.schild.getBoundingClientRect();
        let dRe = ueberX / 2, dLi = ueberX / 2;
        if (rRe.right + dRe > 930) { dLi += rRe.right + dRe - 930; dRe = Math.max(0, 930 - rRe.right); }
        if (rLi.left - dLi < 40) dLi = Math.max(0, rLi.left - 40);
        li.schild.style.transform += ` translateX(${(-dLi).toFixed(1)}px)`;
        re.schild.style.transform += ` translateX(${dRe.toFixed(1)}px)`;
      }
      for (const a of sichtbar) {
        const r = a.schild.getBoundingClientRect();
        if (r.right > 930) a.schild.style.transform += ` translateX(${(930 - r.right).toFixed(1)}px)`;
        else if (r.left < 54) a.schild.style.transform += ` translateX(${(54 - r.left).toFixed(1)}px)`;
      }
    },
  });

  // ---------- Anzeigetafel (Rennen) ----------
  const fahrer = (id, ta) => rennen.von(id, ta)?.x ?? 0;
  const tafel = hud.add(new IsoDuellTafel(hud, {
    y: 262, ein: W("setup", "Fünf", 0.1), aus: uSchnitt - 0.3,
    links: { name: "PAUL", rolle: "wechselt", farbe: "#E9650B", schatten: "#F2B48A" },
    rechts: { name: "ANNA", rolle: "bleibt", farbe: BLAU, schatten: "#9FB6EF" },
    stoesse: [{ t: tPaulZiel, seite: "links" }, { t: tAnnaZiel, seite: "rechts" }],
    zustand: (t) => {
      const ta = rennTau(t) ?? -5;
      const karte = (id, zeit, wechsel) => {
        if (ta >= zeit) return { wert: mmss(zeit), anteil: 1, ziel: true, zusatz: `im Ziel · Wechsel <b>${wechsel}</b>` };
        const x = clamp(fahrer(id, Math.max(0, ta)), 0, STRECKE);
        return { wert: `${fmt.zahl(ta <= 0 ? 0 : x / 1000, 1)}<small>km</small>`, anteil: ta <= 0 ? 0 : x / STRECKE, zusatz: `Spurwechsel <b>${wechsel}</b>` };
      };
      return {
        uhr: mmss(Math.min(Math.max(0, ta), ZEIT_A)),
        links: karte(PAUL, ZEIT_P, wechselBis(ta)),
        rechts: karte(ANNA, ZEIT_A, 0),
      };
    },
  }));

  // ---------- Rennen: Hinweise ----------
  isoChip(hud, { html: `<span class="raute" style="--r:${ISO.lila}"></span>5 km Stau · 2 Spuren`, x: 54, y: 556, ein: W("setup", "Fünf", 0.1) + 0.25, aus: W("setup", "Paul", 0.4) - 0.2 }, Erscheinung);
  isoChip(hud, { html: `<span class="raute" style="--r:${BLAU}"></span>Anna 160 m vorn`, x: 54, y: 556, ein: W("rennen", "160", 0.5) - 0.05, aus: uHinter - 0.3, schatten: "#9FB6EF" }, Erscheinung);
  isoChip(hud, { html: `<span class="raute"></span>wieder hinter Anna`, x: 54, y: 556, ein: W("rennen", "ihr.", 0.6) - 0.1, aus: uVorbei - 0.3, schatten: "#F2B48A" }, Erscheinung);
  isoChip(hud, { html: `<span class="raute"></span>Minute 7: vorbei`, x: 54, y: 556, ein: W("rennen", "vorbei.", 0.9) - 0.15, aus: uZiel - 0.3, schatten: "#F2B48A" }, Erscheinung);
  const vorteil = isoChip(hud, { html: `<span class="raute"></span>9 Wechsel = 20 s`, x: 54, y: 556, ein: W("ziel", "Neun", 0.4) - 0.05, aus: uSchnitt - 0.3, klasse: "gross", farbe: ORANGE, schrift: "#FFFFFF", schatten: "#C8550A", stil: "pop" }, Erscheinung);
  vorteil.e.querySelector(".raute").style.background = "#FFFFFF";

  // ---------- Im Schnitt ----------
  const blattSchnitt = el("div", "iso-blatt", `<div class="kopf"><i></i>Im Schnitt</div>
    <div class="zeile z1" style="--f2:${ORANGE}"><div class="links"><small>pro Spurwechsel</small>Zeitgewinn</div><div class="rechts">≈ ${K.sekundenProSpurwechsel} s</div></div>
    <div class="zeile z2" style="--f2:${ROT}"><div class="links"><small>Drängler · ${K.draenglerSpurwechsel} Wechsel</small>quetscht sich in jede Lücke</div><div class="rechts">${K.draenglerVorteilS} s</div></div>`, hud.wurzel);
  blattSchnitt.style.setProperty("--f", ISO.lila);
  const bz1 = blattSchnitt.querySelector(".z1"), bz2 = blattSchnitt.querySelector(".z2");
  const tZwei = W("schnitt", "zwei", 0.3) - 0.1, t50 = W("schnitt", "50", 0.5) - 0.1;
  hud.add(new Erscheinung(hud, blattSchnitt, {
    x: 54, y: 262, breite: 876, ein: tSchnitt + 0.1, aus: uWahr - 0.3, stil: "hoch", klang: "pop",
    nachUpdate: (t) => {
      for (const [z, t0] of [[bz1, tZwei], [bz2, t50]]) {
        const s = t < t0 ? 0 : feder(t - t0, FEDER.knackig);
        z.style.opacity = String(0.18 + 0.82 * clamp(s * 2.5));
        z.style.transform = `translateX(${(1 - Math.min(1, s)) * 36}px)`;
      }
    },
  }));
  hud.klang.push({ t: tZwei, typ: "ding" }, { t: t50, typ: "ding" });

  // ---------- Wahrnehmung: Frage als Titel ----------
  const frage = el("div", "iso-titel", `<div class="klein">Aber warum wirkt</div><div class="gross mittel">die andere Spur immer schneller?</div>`, hud.wurzel);
  hud.add(new Erscheinung(hud, frage, { y: 262, ein: tWahr + 0.05, aus: W("wahrnehmung", "Test:", 0.3) - 0.35, stil: "hoch", klang: "schlag" }));

  // ---------- Wahrnehmung: Zähler (aus den 1-Hz-Bahnen, gleiche Zählweise wie in der Simulation) ----------
  const ereignisse = wahrnehmungsEreignisse(datenW, ANNA_W);
  const phaseA = [bsp.t, bsp.t + 9], phaseB = [bsp.t + 9, bsp.t + 14];
  const inPhase = (e, p) => e.tau > p[0] && e.tau <= p[1];
  const evA = ereignisse.filter((e) => e.art === "wird" && inPhase(e, phaseA));
  const evB = ereignisse.filter((e) => e.art === "selbst" && inPhase(e, phaseB));
  console.log(`Wahrnehmung: Phase A ${evA.length} Autos in ${new Set(evA.map((e) => e.tau)).size} s, Phase B ${evB.length} Autos in ${new Set(evB.map((e) => e.tau)).size} s`);
  const tVonTau = (tau) => tPhaseB + (tau - (bsp.t + 9)) / RATE_W;
  const zaehler = (klasse, farbe, schatten, titelText, ev, x, y, ein, aus) => {
    const e = el("div", "iso-zaehler", `<div class="symbol">${PFEIL}</div><div class="txt"><small>${titelText}</small><span><em class="n">0</em> <i class="w">Autos</i> · <em class="s">0</em> s</span></div>`, hud.wurzel);
    e.style.setProperty("--f", farbe);
    e.style.setProperty("--k", schatten);
    const n = e.querySelector(".n"), s = e.querySelector(".s"), wort = e.querySelector(".w");
    const zeiten = ev.map((x) => tVonTau(x.tau - 0.5));
    const sek = [...new Set(ev.map((x) => x.tau))].map((tau) => tVonTau(tau - 0.5));
    for (const z of zeiten) hud.klang.push({ t: z, typ: "klick" });
    hud.add(new Erscheinung(hud, e, {
      x, y, ein, aus, stil: "links", klang: "pop",
      nachUpdate: (t) => {
        const a = zeiten.filter((z) => t >= z).length;
        const b = sek.filter((z) => t >= z).length;
        if (n.textContent !== String(a)) n.textContent = String(a);
        const wt = a === 1 ? "Auto" : "Autos";
        if (wort.textContent !== wt) wort.textContent = wt;
        if (s.textContent !== String(b)) s.textContent = String(b);
      },
    }));
    return e;
  };
  const PFEIL = `<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M4 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  zaehler("wird", ORANGE, "#F2B48A", "Anna wird überholt", evA, 54, 262, W("wahrnehmung", "Keiner", 0.2) - 0.25, uErkl - 0.3);
  zaehler("selbst", GRUEN, "#9FDCBF", "Anna überholt", evB, 54, 400, tPhaseB - 0.2, uErkl - 0.3);
  isoChip(hud, { html: `<span class="raute" style="--r:${ISO.lila}"></span>Test: keiner wechselt`, x: 54, y: 556, ein: W("wahrnehmung", "Test:", 0.3) - 0.1, aus: tPhaseB - 0.3 }, Erscheinung);

  // ---------- Erklärung: Balken 20 % gegen 11 % ----------
  const RW = K.wahrnehmungReferenz;
  const blattW = el("div", "iso-blatt", `<div class="kopf"><i></i>Wenn keiner wechselt</div>
    <div class="balkenzeile b1" style="--f2:${ORANGE}"><div class="beschr"><span>Zeit, in der du überholt wirst</span><b>${RW.ueberholtWerdenProzent} %</b></div><div class="spur"><i></i></div></div>
    <div class="balkenzeile b2" style="--f2:${GRUEN}"><div class="beschr"><span>Zeit, in der du überholst</span><b>${RW.ueberholenProzent} %</b></div><div class="spur"><i></i></div></div>
    <div class="fussnote">Autos: <b>${RW.autosUeberholtWerden}</b> gegen <b>${RW.autosUeberholen}</b> · gleich viele</div>`, hud.wurzel);
  blattW.style.setProperty("--f", ISO.lila);
  const b1 = blattW.querySelector(".b1"), b2 = blattW.querySelector(".b2"), fuss = blattW.querySelector(".fussnote");
  const t20 = W("erklaerung", "20", 0.3) - 0.1, t11 = W("erklaerung", "11", 0.3) - 0.1, tGleich = W("erklaerung", "gleich", 0.3) - 0.1;
  const skala = 25; // Balken: 25 % = volle Breite
  hud.add(new Erscheinung(hud, blattW, {
    x: 54, y: 262, breite: 876, ein: W("erklaerung", "Darum", 0.2) - 0.3, aus: uFazit - 0.3, stil: "hoch", klang: "pop",
    nachUpdate: (t) => {
      for (const [z, t0, wert] of [[b1, t20, RW.ueberholtWerdenProzent], [b2, t11, RW.ueberholenProzent]]) {
        const s = t < t0 ? 0 : feder(t - t0, FEDER.standard);
        z.style.opacity = String(0.25 + 0.75 * clamp(s * 3));
        z.querySelector(".spur i").style.transform = `scaleX(${(clamp(s, 0, 1.08) * wert) / skala})`;
      }
      const s = t < tGleich ? 0 : feder(t - tGleich, FEDER.knackig);
      fuss.style.opacity = String(clamp(s * 3));
      fuss.style.transform = `translateY(${(1 - Math.min(1, s)) * 20}px)`;
    },
  }));
  hud.klang.push({ t: t20, typ: "ding" }, { t: t11, typ: "ding" }, { t: tGleich, typ: "pop" });
  // „Wer rollt, hat Abstand. Wer steht, steht dicht an dicht.“ (Schilder an der Straße)
  isoChip(hud, { html: `<span class="raute" style="--r:${ISO.lila}"></span>bekannt seit 1999`, x: 54, y: 760, ein: W("erklaerung", "Forscher", 0.3) - 0.1, aus: uFazit - 0.3 }, Erscheinung);

  // ---------- Fazit ----------
  const HAKEN = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const blattF = el("div", "iso-blatt", `<div class="kopf" style="--f:${GRUEN}"><i></i>Fazit</div><div class="gross" style="font-size:92px">Bleib in<br>deiner Spur.</div>
    <div class="zeile z1" style="--f2:${ORANGE}"><div class="links"><small>Gewinn</small>für 9 riskante Manöver</div><div class="rechts">20 s</div></div>`, hud.wurzel);
  blattF.style.setProperty("--k", "#9FDCBF");
  const fz1 = blattF.querySelector(".z1");
  const tF20 = W("fazit", "20", 0.3) - 0.1;
  hud.add(new Erscheinung(hud, blattF, {
    x: 54, y: 262, breite: 876, ein: W("fazit", "Bleib", 0.2) - 0.2, aus: uEnde - 0.3, stil: "hoch", klang: "ding",
    nachUpdate: (t) => {
      const s = t < tF20 ? 0 : feder(t - tF20, FEDER.knackig);
      fz1.style.opacity = String(0.15 + 0.85 * clamp(s * 2.5));
      fz1.style.transform = `translateX(${(1 - Math.min(1, s)) * 36}px)`;
    },
  }));

  // ---------- Schlusskarte ----------
  const schleier = el("div", "iso-schleier", "", hud.wurzel);
  hud.add({ update: (t) => { schleier.style.opacity = String(ease.inOutSine(fortschritt(t, uEnde - 0.2, uEnde + 0.4))); } });
  const schluss = el("div", "schluss", `<div class="logoGross">${WUERFEL}SIMULIERBAR</div><div class="aufruf"><span class="blase">${SPRECHBLASE}</span><span>Schreibt euren Simulations&shy;wunsch in die Kommentare</span></div>`, hud.wurzel);
  const logoGross = schluss.querySelector(".logoGross");
  const aufruf = schluss.querySelector(".aufruf");
  const blase = schluss.querySelector(".blase");
  hud.add(new Erscheinung(hud, logoGross, { ein: tEnde + 0.05, stil: "pop", feder: FEDER.knackig, klang: "ding" }));
  hud.add(new Erscheinung(hud, aufruf, {
    ein: tEnde + 0.35, stil: "hoch", feder: FEDER.standard,
    nachUpdate: (t) => {
      const b = Math.max(0, Math.sin((t - tEnde - 0.9) * 4.2)) * Math.exp(-Math.max(0, t - tEnde - 0.9) * 0.25);
      blase.style.transform = `translateY(${-b * 16}px) rotate(${-b * 6}deg)`;
    },
  }));

  // ---------- Karaoke-Untertitel ----------
  const karaoke = new Karaoke(hud, zp, { y: KY, maxBreite: 860, groesse: 72, versteckt: [[tEnde - 0.15, 999]] });
  karaoke.vorbereiten();
  const karaokeUpdate = karaoke.update.bind(karaoke);
  karaoke.update = (t) => {
    karaokeUpdate(t);
    const sichtbar = karaoke.bloecke.filter((b) => b.el.style.display !== "none");
    for (let i = 0; i < sichtbar.length - 1; i++) sichtbar[i].el.style.display = "none";
  };
  hud.add(karaoke);
  window.karaoke = karaoke;

  // ---------- Klang ----------
  const klang = [...hud.klang, ...zl.klangEreignisse()];
  klang.push({ t: 0.02, typ: "schlag" });
  // Spurwechsel von Paul in den sichtbaren Einstellungen: kurzer Klick
  for (const [w, von, bis] of [[weltHook, 0, uStart], [weltStart, uStart, uSplit], [weltHinter, uHinter, uVorbei], [weltVorbei, uVorbei, uZiel]]) {
    for (const tw of wechselPaul) {
      // Zeitpunkt t mit w.tau(t) = tw + 0.3 (Mitte der Querbewegung)
      const t0 = von + ((tw + 0.3 - w.tau(von)) * (bis - von)) / (w.tau(bis) - w.tau(von));
      if (t0 > von + 0.1 && t0 < bis - 0.1) klang.push({ t: t0, typ: "whoosh", dauer: 0.5 });
    }
  }
  klang.push({ t: tPaulZiel, typ: "boom" }, { t: tAnnaZiel, typ: "ding" });
  klang.sort((a, b) => a.t - b.t);

  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, uStart + 0.5, uSplit + 0.5, uZiel + 0.5, tWahr + 1, tFazit + 1, tEnde + 1]) window.renderAt(Math.min(t, DAUER - 0.05));
  window.dauer = DAUER;
  window.stimmEnde = zp.stimmEnde;
  window.klangEreignisse = klang;
  window.zeitplan = zp;
  window.pruefung = { wahrnehmung: { phaseA: evA.length, sekA: new Set(evA.map((e) => e.tau)).size, phaseB: evB.length, sekB: new Set(evB.map((e) => e.tau)).size }, wechselPaul };
  window.renderAt(0);
  window.__fertig = true;
}

/**
 * Überholvorgänge für ein Fahrzeug aus 1-Hz-Bahnen (wie in spurwechsel.mjs: Reihenfolge-Wechsel mit Nachbarn
 * der anderen Spur, gleichauf zählt die linke Spur als vorn). Liefert [{tau (Ende der Sekunde), art: 'wird'|'selbst'}].
 */
function wahrnehmungsEreignisse(daten, id) {
  const lage = new Map(); // id → Map(t → {x, s})
  for (const f of daten.fahrzeuge) {
    if (!lage.has(f.id)) lage.set(f.id, new Map());
    const m = lage.get(f.id);
    f.x.forEach((x, k) => m.set(f.t0 + k, { x, s: f.s[k] }));
  }
  const ich = lage.get(id);
  const ev = [];
  for (const [t, a] of ich) {
    const b = ich.get(t + 1);
    if (!b || a.s !== b.s) continue;
    for (const [j, m] of lage) {
      if (j === id) continue;
      const p = m.get(t), q = m.get(t + 1);
      if (!p || !q || p.s !== q.s || p.s === a.s) continue;
      if (Math.abs(p.x - a.x) > 40) continue;
      const d0 = 2 * Math.round((p.x - a.x) / 7.5) + (p.s - a.s);
      const d1 = 2 * Math.round((q.x - b.x) / 7.5) + (q.s - b.s);
      if (d0 < 0 && d1 > 0) ev.push({ tau: t + 1, art: "wird" });
      else if (d0 > 0 && d1 < 0) ev.push({ tau: t + 1, art: "selbst" });
    }
  }
  return ev;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
