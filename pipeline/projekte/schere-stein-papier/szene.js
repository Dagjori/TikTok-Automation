// „Schere, Stein, Papier: Gibt es eine Gewinnstrategie?“ · Stil 3 Clay-Spielzeug-3D in Three.js (engine/stil_clay.js).
// Rot (Taktik, Schach-Bauer) spielt 100 Runden gegen Cyan: erst Zufall (Würfel), dann ein Mensch-Modell (Kopf-Figur).
// Zwei Knet-Hände zeigen Stein, Papier oder Schere; ein 10×10-Brett füllt sich mit je einer Kachel pro Runde
// (Rot, Cyan, unentschieden). Alle Runden stammen aus sim/schere_stein_papier.mjs (Tests: sim/schere_stein_papier.test.mjs).
// Deterministisch: window.renderAt(t).
import * as THREE from "three";
import { Buehne } from "../../engine/kern.js";
import { lichtTag, verlauf } from "../../engine/licht.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { HUD, el } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, feder, keyframes, hash } from "../../engine/bewegung.js";
import { TON, ton, hand, mischePose, setzeHand, sockel, bauer, wuerfel, kopfFigur, brett, setzeKachel, raum, teil, heller } from "../../engine/stil_clay.js";
import { videoLaeufe, monteCarlo, warumFaktoren } from "../../sim/schere_stein_papier.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 4;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
};

// Teamfarben (überall gleich: Hände, Kacheln, Tafel, Chips, Untertitel). Kein Gelb (Untertitel-Wort ist gelb).
const ROT = TON.rot; // #FF4D4D  Taktik
const CYAN = TON.cyan; // #33D1FF  Zufall, dann Mensch
const AKZENT = "#7B5CFA"; // Stempel und Pointe (weder Team noch Gelb)
const TINTE = TON.tinte;

// =====================================================================================
// Hand-Pille „Unentschieden“ mit Live-Zähler
// =====================================================================================
class RemisPille {
  constructor(M, { y, ein, aus, wert }) {
    this.M = M;
    this.ein = M.zeit(ein);
    this.aus = M.zeit(aus);
    this.y = y;
    this.wert = wert;
    this.e = el("div", "ms ssp-remis", "<b>0</b><span>UNENTSCHIEDEN</span>", M.hud.wurzel);
    this.b = this.e.querySelector("b");
    this.breite = this.e.offsetWidth;
  }
  ereignisse() {
    return [{ t: this.ein, typ: "chip", klang: "pop", text: "Unentschieden" }];
  }
  update(t) {
    const an = t >= this.ein && t <= this.aus + 0.22;
    this.e.style.visibility = an ? "visible" : "hidden";
    if (!an) return;
    const s = feder(t - this.ein, { frequenz: 3.4, daempfung: 0.36 });
    const x = ease.inCubic(fortschritt(t, this.aus, this.aus + 0.22));
    const txt = String(this.wert(t));
    if (this.b.textContent !== txt) this.b.textContent = txt;
    this.e.style.transform = `translate(${(SICHER.mitte - this.breite / 2).toFixed(1)}px, ${(this.y + (1 - s) * 24 - x * 14).toFixed(1)}px) scale(${((0.3 + 0.7 * s) * (1 - 0.3 * x)).toFixed(4)})`;
    this.e.style.opacity = String(clamp((t - this.ein) / 0.06) * (1 - x));
  }
}

// =====================================================================================
// Start
// =====================================================================================
async function start() {
  const skript = await lade("skript.json");
  let timing;
  try { timing = await lade("audio/timing.json"); }
  catch { try { timing = await lade("audio/timing_schaetzung.json"); } catch { timing = schaetzeTiming(skript); } }
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 1.0 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const ENDE = DAUER - 1 / FPS;
  const T = (x) => zp.zeit(x);

  const buehne = new Buehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0 });
  await Promise.all(["900 70px 'SB Display'", "800 30px 'SB Display'", "700 27px 'SB Display'", "700 27px 'SB Text'", "800 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;

  // =====================================================================================
  // Modell: drei Läufe aus der Simulation (Auswahlkriterien in sim/schere_stein_papier.mjs)
  // =====================================================================================
  const V = videoLaeufe();
  const MC_ZUFALL = monteCarlo({ n: 100000, gegner: "zufall" });
  const WARUM = warumFaktoren({ n: 20000 });
  const lz = V.zufall, lm = V.mensch, lw = V.wuerfelt;
  const farbeVon = (erg) => (erg > 0 ? "rot" : erg < 0 ? "cyan" : "remis");

  // Zeitplan der Runden: Reveal-Zeit je Runde (1..100), an gesprochene Wörter gebunden
  const verteile = (plan) => {
    const tz = new Array(101).fill(0);
    for (const [von, bis, t0, t1] of plan) for (let r = von; r <= bis; r++) tz[r] = bis === von ? t0 : lerp(t0, t1, (r - von) / (bis - von));
    return tz;
  };
  const tZ = verteile([
    [1, 1, T("start:unentschieden") - 0.12, 0],
    [2, 2, T("start:Rot") - 0.08, 0],
    [3, 3, T("start:Cyan") - 0.04, 0],
    [4, 10, T("start:Cyan") + 0.45, T("rennen1:Rot")],
    [11, 19, T("rennen1:2") + 0.35, T("wendung1:vorbei") - 0.1],
    [20, 30, T("wendung1:vorbei") + 0.12, T("wendung1:11")],
    [31, 60, T("wendung1:11") + 0.1, T("rennen2:60") + 0.1],
    [61, 100, T("rennen2:60") + 0.2, T("ergebnis1:34") - 0.1],
  ]);
  const tLeerZ = T("wendung2:Aber") - 0.05; // Brett wird geleert (Welle)
  const tM = verteile([
    [1, 10, T("wendung2:jetzt") + 0.5, T("mensch:Menschen") + 0.7],
    [11, 30, T("mensch:Menschen") + 0.95, T("rennen3:17") - 0.08],
    [31, 100, T("rennen3:17") + 0.05, T("ergebnis2:50") - 0.15],
  ]);
  const tW0 = T("ueberraschung:Hälfte") - 0.15; // ab hier würfelt Cyan
  const tW = verteile([[51, 100, tW0 + 0.45, T("ueberraschung:14") - 0.1]]);
  const tMerk = T("merksatz:Gegen") - 0.25; // Brett räumt auf (Pointe steht auf sauberem Brett)
  const tSchleife = T("schluss:Was") + 0.05;
  const tLos = T("falle:Los");

  // Akte: welche Runden gelten zu welcher Zeit (Z: Zufall, M: Mensch, W: Mensch würfelt ab Runde 51)
  const akte = [
    { id: "Z", von: 0, bis: tLeerZ + 0.5, lauf: lz, runden: lz.runden, zeiten: tZ, start: tZ[1] - 1.0 },
    { id: "M", von: tLeerZ + 0.5, bis: tW0, lauf: lm, runden: lm.runden, zeiten: tM, start: tM[1] - 1.0 },
    { id: "W", von: tW0, bis: Infinity, lauf: lw, runden: [...lm.runden.slice(0, 50), ...lw.runden.slice(50)], zeiten: [...tM.slice(0, 51), ...tW.slice(51)], start: tM[1] - 1.0 },
  ];
  const aktAt = (t) => (t < akte[1].von ? akte[0] : t < akte[2].von ? akte[1] : akte[2]);
  /** Anzahl der bis t aufgedeckten Runden im Akt */
  const rundenBis = (A, t) => {
    let k = 0;
    for (let r = 1; r <= 100; r++) { if (A.zeiten[r] <= t) k = r; else break; }
    return k;
  };
  /** Stand (aus Sicht der Tafel) */
  const stand = (t) => {
    const A = aktAt(t);
    const k = rundenBis(A, t);
    if (k === 0) return { rot: 0, cyan: 0, remis: 0, runde: 0, k: 0, A };
    const r = A.runden[k - 1];
    return { rot: r.siegeRot, cyan: r.siegeCyan, remis: r.remis, runde: k, k, A };
  };

  // =====================================================================================
  // Welt
  // =====================================================================================
  const szene = new THREE.Scene();
  szene.background = verlauf([[0, TON.wand], [1, TON.tisch]]);
  const licht = lichtTag(szene, buehne.renderer, { bereich: 7.5, schattenKarte: SCHATTEN || 512, sonnenRichtung: [-0.55, 1.0, 1.1], sonnenStaerke: 2.9, sonnenFarbe: "#FFF0DA", himmel: "#FFF4E2", boden: "#E8D2AD", himmelStaerke: 0.85, umgebungsStaerke: 0.55, schattenWeich: 3, ziel: [0, 2.2, 0] });
  if (!SCHATTEN) licht.sonne.castShadow = false;

  const kamera = new THREE.PerspectiveCamera(17, 1080 / 1920, 1, 200);
  const R = raum();
  szene.add(R);

  // Brett an der Wand
  const B = brett({ n: 10, teilung: 0.18 });
  B.position.set(0, 4.49, -3.06);
  szene.add(B);

  // Sockel und Hände
  const HX = 0.92, HY = 1.15, HS = 0.96;
  const sockR = sockel({ farbe: ROT, radius: 0.88 });
  sockR.position.set(-HX, 0, 0);
  const sockC = sockel({ farbe: CYAN, radius: 0.88 });
  sockC.position.set(HX, 0, 0);
  szene.add(sockR, sockC);
  const handR = hand({ farbe: ROT });
  handR.position.set(-HX, HY, 0.05);
  handR.scale.setScalar(HS);
  const handC = hand({ farbe: CYAN });
  handC.position.set(HX, HY, 0.05);
  handC.scale.set(-HS, HS, HS);
  szene.add(handR, handC);

  // Symbole an der Wand: Bauer (Taktik) links, Würfel bzw. Kopf (Zufall, Mensch) rechts
  const symbolR = new THREE.Group();
  const pawn = bauer({ farbe: ROT });
  symbolR.add(pawn);
  symbolR.position.set(-1.62, 3.78, -2.55);
  symbolR.scale.setScalar(1.05);
  const symbolC = new THREE.Group();
  const wuerf = wuerfel({ farbe: CYAN });
  wuerf.position.y = 0.45;
  const kopf = kopfFigur({ farbe: CYAN });
  symbolC.add(wuerf, kopf);
  symbolC.position.set(1.62, 3.78, -2.55);
  symbolC.scale.setScalar(1.05);
  szene.add(symbolR, symbolC);

  // kleine Deko-Kugeln auf dem Tisch (Teamfarben), geben Tiefe
  const deko = [[-2.35, 0.2, 1.6, 0.2, ROT], [-2.1, 0.14, 2.3, 0.14, ROT], [2.3, 0.18, 1.8, 0.18, CYAN], [2.05, 0.12, 2.4, 0.12, CYAN], [2.55, 0.14, 1.0, 0.14, CYAN]];
  for (const [x, y, z, r, f] of deko) teil(new THREE.SphereGeometry(r, 20, 14), ton(f), x, y, z, szene);

  // =====================================================================================
  // Hände und Symbole je Zeitpunkt
  // =====================================================================================
  const POSE_FAUST = [1, 0, 0];
  const gewichte = (zug) => [zug === 0 ? 1 : 0, zug === 1 ? 1 : 0, zug === 2 ? 1 : 0];
  const mixW = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
  const PUMP_DAUER = 0.8;

  /** Anzeige-Zustand der Hände (Gewichte der Gesten, Pumpen, Gewinner-Effekt) */
  function haende(t) {
    const A = aktAt(t);
    const kEcht = rundenBis(A, t);
    // Zeitraffer: Bei hoher Geschwindigkeit wechselt die gezeigte Geste höchstens alle 0,27 s (Stichprobe der echten Runden)
    const tn0 = kEcht < 100 ? A.zeiten[kEcht + 1] : Infinity;
    const tk0 = kEcht > 0 ? A.zeiten[kEcht] : -Infinity;
    const luecke = tn0 - tk0;
    const schnell = luecke < 0.7;
    let k = kEcht;
    if (schnell && kEcht > 0) k = rundenBis(A, Math.floor(t / 0.27) * 0.27);
    const rd = k > 0 ? A.runden[k - 1] : null;
    const tk = k > 0 ? A.zeiten[k] : -Infinity;
    const gR = rd ? gewichte(rd.rot) : POSE_FAUST, gC = rd ? gewichte(rd.cyan) : POSE_FAUST;
    let wR = gR, wC = gC, pumpR = 0, pumpC = 0, wackR = 0, wackC = 0, gew = 0, seit = 99, quR = 1, quC = 1;
    if (!schnell) {
      const tn = tn0;
      const imPumpen = tn - t < PUMP_DAUER && tn !== Infinity;
      const mo = clamp(1 - (tn - t - PUMP_DAUER) / 0.2); // Übergang zur Faust vor dem Pumpen
      if (imPumpen || mo > 0) {
        wR = mixW(gR, POSE_FAUST, ease.inOutSine(clamp(mo)));
        wC = mixW(gC, POSE_FAUST, ease.inOutSine(clamp(mo)));
      }
      if (imPumpen) {
        const u = (t - (tn - PUMP_DAUER)) / PUMP_DAUER; // 0..1 über drei Schläge
        const hub = Math.abs(Math.sin(u * Math.PI * 3)) ;
        pumpR = pumpC = -0.28 * (1 - hub) + 0.1 * hub; // Pumpbewegung: nach unten ziehen, hochschnellen
        wackR = 0.05 * Math.sin(u * Math.PI * 6);
        wackC = -wackR;
      }
      // Reveal: Gesten springen auf, Gewinner federt
      if (rd && t >= tk) {
        seit = t - tk;
        const s = feder(seit, { frequenz: 3.6, daempfung: 0.34 });
        if (seit < 0.5) {
          const gw = rd.erg;
          gew = gw;
          quR = gw > 0 ? 1 + 0.18 * (s - 1) * -1 : gw < 0 ? 1 - 0.08 * Math.exp(-seit * 8) : 1 + 0.05 * Math.exp(-seit * 8);
          quC = gw < 0 ? 1 + 0.18 * (s - 1) * -1 : gw > 0 ? 1 - 0.08 * Math.exp(-seit * 8) : 1 + 0.05 * Math.exp(-seit * 8);
          pumpR = gw > 0 ? 0.26 * Math.exp(-seit * 6) * Math.sin(seit * 22) : pumpR;
          pumpC = gw < 0 ? 0.26 * Math.exp(-seit * 6) * Math.sin(seit * 22) : pumpC;
        }
      }
    } else if (kEcht > 0 || t > A.start) {
      // Zeitraffer: Die Fäuste pumpen durchgehend, alle 0,27 s zeigt die Stichprobe die Gesten der echten Runde
      const ph = (t % 0.27) / 0.27;
      const zeig = ease.outCubic(clamp(ph / 0.4)) * (1 - ease.inCubic(clamp((ph - 0.78) / 0.22)));
      wR = mixW(POSE_FAUST, gR, zeig);
      wC = mixW(POSE_FAUST, gC, zeig);
      const hub = Math.abs(Math.sin(ph * Math.PI));
      pumpR = pumpC = -0.18 * (1 - hub) + 0.08 * hub;
      wackR = 0.04 * Math.sin(ph * Math.PI * 2);
      wackC = -wackR;
      if (rd) gew = rd.erg;
    }
    // vor dem ersten Reveal des Aktes: Fäuste, ruhiges Atmen (Pumpen beginnt in der Pump-Phase der ersten Runde)
    return { wR, wC, pumpR, pumpC, wackR, wackC, quR, quC, gew, seit, schnell };
  }

  /** Kachel-Zustand von Runde r (1..100) zum Zeitpunkt t */
  function kachel(r, t) {
    const i = r - 1;
    const pop = (d) => (d < 0 ? 0 : feder(d, { frequenz: 3.4, daempfung: 0.4 }));
    // Welle: Brett leeren
    const leer = (t0, farbe, d0) => {
      const d = t - t0 - i * 0.0045;
      if (d <= 0) return null;
      const k = ease.inCubic(clamp(d / 0.2));
      return { groesse: (1 - k) * d0, farbe, drehung: k * 1.2, hebe: k * 0.15 };
    };
    const A = aktAt(t);
    const kMax = rundenBis(A, t);
    // Zufall-Akt
    if (A.id === "Z") {
      if (r > kMax) return { groesse: 0 };
      const e = leer(tLeerZ, farbeVon(lz.runden[i].erg), pop(t - tZ[r]));
      return e || { groesse: pop(t - tZ[r]), farbe: farbeVon(lz.runden[i].erg) };
    }
    // Akt Z läuft noch kurz aus (Leer-Welle), obwohl M schon gilt: nur bis tLeerZ + 0.5
    if (A.id === "M") {
      if (r > kMax) return { groesse: 0 };
      return { groesse: pop(t - tM[r]), farbe: farbeVon(lm.runden[i].erg) };
    }
    // Würfel-Akt: Runden 51–100 drehen sich um und zeigen das neue Ergebnis
    const alt = farbeVon(lm.runden[i].erg);
    if (r <= 50) return { groesse: 1, farbe: alt };
    const d = t - tW[r];
    const neu = farbeVon(lw.runden[i].erg);
    if (d < 0) return { groesse: 1, farbe: alt };
    const p = clamp(d / 0.26);
    return { groesse: 1 + 0.18 * Math.sin(p * Math.PI), farbe: p < 0.5 ? alt : neu, drehung: p * Math.PI * (p < 1 ? 1 : 0), hebe: 0.06 * Math.sin(p * Math.PI) };
  }

  // =====================================================================================
  // HUD
  // =====================================================================================
  const hud = new HUD(document.getElementById("hud"));
  if (Q.get("hud") === "0") hud.wurzel.style.display = "none";
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "TAKTIK", farbe: ROT, woerter: ["Rot", "Taktik"] },
      b: { name: "ZUFALL", farbe: CYAN, woerter: ["Cyan", "Zufall", "Mensch*"] },
    },
    akzent: AKZENT,
    tinte: TINTE,
  });
  M.schleife({ ab: tSchleife, ende: ENDE });
  const kL = (t) => M.schleifenK(t);

  // ---------- Anzeigetafel: Siege, Mitte = Rundenzähler ----------
  const werteFn = M.wert((t) => { const s = stand(t); return { a: s.rot, b: s.cyan }; });
  const rundeFn = M.wert((t) => stand(t).runde);
  const tafel = M.tafel({
    y: 166,
    links: { team: "a", name: "TAKTIK", einheit: "", nk: 0, max: 100 },
    rechts: { team: "b", name: "ZUFALL", einheit: "", nk: 0, max: 100 },
    werte: werteFn,
    anteil: M.wert((t) => { const s = stand(t); return { a: s.rot / 50, b: s.cyan / 50 }; }),
    uhr: { ein: tLos - 0.1, zeit: (t) => Math.round(rundeFn(t)), format: (s) => String(Math.round(s)), label: "RUNDE" },
  });
  // Name der rechten Seite wechselt: ZUFALL → MENSCH (Cyan bleibt Cyan)
  const nameC = tafel.seiten[1].k.querySelector(".ms-kopf span");
  const tMensch = T("wendung2:Mensch") - 0.05;
  const tafelUpdate = tafel.update.bind(tafel);
  tafel.update = (t) => {
    tafelUpdate(t);
    const n = t >= tMensch && t < tW0 + 1e5 && t < T("ueberraschung:Würfelt") - 0.05 ? "MENSCH" : t >= T("ueberraschung:Würfelt") - 0.05 && t < tSchleife ? "ZUFALL" : "ZUFALL";
    const soll = t >= tMensch && t < T("ueberraschung:Würfelt") - 0.05 ? "MENSCH" : t >= tSchleife ? (t < tMensch ? "ZUFALL" : "ZUFALL") : "ZUFALL";
    if (nameC.textContent !== soll) nameC.textContent = soll;
  };

  // ---------- Hook: Titel Wort für Wort ----------
  M.titel({
    y: 372, groesse: 110, aus: "regeln:Hundert-0.12",
    woerter: [
      { text: "SCHERE", ein: "hook:Schere+0.02" }, { text: "STEIN", ein: "hook:Stein+0.02" }, { umbruch: true },
      { text: "PAPIER", ein: "hook:Papier+0.02" }, { umbruch: true },
      { text: "GLÜCK", ein: "hook:Glück-0.02", team: "b" }, { art: "vs", ein: "hook:oder-0.02" }, { text: "TAKTIK?", ein: "hook:Taktik-0.02", team: "a" }, { umbruch: true },
      { text: "WER GEWINNT", ein: "hook:Wer-0.02", art: "klein" }, { text: "WIRKLICH?", ein: "hook:wirklich-0.02", art: "klein" },
    ],
  });

  // ---------- Regeln als Chips ----------
  M.chips({ y: 372, ausrichtung: "mitte", aus: "falle:Klar-0.12", liste: [{ text: "100 RUNDEN", ein: "regeln:Hundert-0.03", art: "dunkel", gross: true }] });
  M.chips({ y: 486, ausrichtung: "mitte", aus: "falle:Klar-0.12", liste: [
    { text: "ROT = TAKTIK", ein: "regeln:Rot-0.03", art: "voll", team: "a" },
    { text: "CYAN = ZUFALL", ein: "regeln:Cyan-0.03", art: "voll", team: "b" },
  ] });

  // ---------- Denkfalle und Start ----------
  const sKlar = M.stempel({ text: "KLAR!", ein: "falle:Klar,", x: SICHER.mitte, y: 650, winkel: -7, farbe: "a", groesse: 124 });
  M.chip({ text: "ODER?", ein: "falle:Oder?", aus: "falle:Los-0.05", art: "dunkel", gross: true, x: SICHER.mitte, anker: "mitte", y: 790, winkel: 4 });
  M.chip({ text: "LOS GEHT'S!", ein: "falle:Los", aus: "start:Runde+0.15", art: "voll", team: "akzent", gross: true, x: SICHER.mitte, anker: "mitte", y: 790 });

  // ---------- Rennen Zufall: die ersten drei Runden einzeln ----------
  const urteil = (text, ein, team, art = "voll") => M.chip({ text, ein, aus: T(ein) + 0.95, art, team, gross: true, x: SICHER.mitte, anker: "mitte", y: 1190, klang: "pop" });
  urteil("UNENTSCHIEDEN", tZ[1], "akzent");
  urteil("PUNKT ROT", tZ[2], "a");
  urteil("PUNKT CYAN", tZ[3], "b");
  const remisPille = new RemisPille(M, { y: 812, ein: tZ[4], aus: tLeerZ, wert: (t) => stand(t).remis });
  hud.add(remisPille);
  const remisPille2 = new RemisPille(M, { y: 812, ein: tM[1], aus: tMerk, wert: (t) => stand(t).remis });
  hud.add(remisPille2);

  // ---------- Folgen-Aufruf ----------
  M.folgen({ ein: "folgen:Folg-0.05", dauer: 1.8, y: 960, team: "a" });

  // ---------- Wendung 1: Cyan zieht vorbei ----------
  const sUeber = M.stempel({ text: "ÜBERHOLT!", ein: T("wendung1:vorbei") - 0.2, x: SICHER.mitte, y: 640, winkel: -6, art: "stempel", farbe: CYAN, groesse: 118 });
  M.chip({ text: "GLEICHSTAND", ein: "wendung1:11", aus: "rennen2:Rot", art: "dunkel", gross: true, x: SICHER.mitte, anker: "mitte", y: 372 });

  // ---------- Ergebnis 1: praktisch gleich ----------
  M.bilanz({
    y: 856, ein: "ergebnis1:Endstand-0.1", aus: "wendung2:Aber-0.08", titel: "Endstand nach 100 Runden",
    zeilen: [
      { label: "ROT · TAKTIK", wert: lz.siegeRot, team: "a", ein: "ergebnis1:34" },
      { label: "CYAN · ZUFALL", wert: lz.siegeCyan, team: "b", ein: "ergebnis1:31." },
    ],
    sieger: { text: "PRAKTISCH GLEICH", team: "akzent", ein: "ergebnis1:Praktisch" },
  });
  const pct = (x) => `${Math.round(x * 100)} %`;
  M.chip({ text: `100.000 SPIELE: ROT VORN ${pct(MC_ZUFALL.anteilRotVorn)} · CYAN VORN ${pct(MC_ZUFALL.anteilCyanVorn)}`, ein: "ergebnis1:gleich", aus: "wendung2:Aber-0.08", art: "hell", team: "akzent", x: SICHER.mitte, anker: "mitte", y: 1236 });

  // ---------- Wendung 2: Cyan spielt wie ein Mensch ----------
  const sMensch = M.stempel({ text: "MENSCH!", ein: "wendung2:Mensch", x: SICHER.mitte, y: 640, winkel: 6, farbe: CYAN, groesse: 124 });
  M.chips({ y: 372, ausrichtung: "mitte", aus: "rennen3:Runde-0.1", liste: [
    { text: "MENSCH: 44 % GLEICHER ZUG", ein: "mensch:44", art: "voll", team: "b" },
    { text: "ZUFALL: 33 %", ein: "mensch:33", art: "dunkel" },
  ] });

  // ---------- Ergebnis 2 ----------
  const vorsprung2 = lm.siegeRot - lm.siegeCyan;
  M.bilanz({
    y: 856, ein: "ergebnis2:Endstand-0.1", aus: "warum:Warum-0.12", titel: "Endstand nach 100 Runden",
    zeilen: [
      { label: "ROT · TAKTIK", wert: lm.siegeRot, team: "a", ein: "ergebnis2:50," },
      { label: "CYAN · MENSCH", wert: lm.siegeCyan, team: "b", ein: "ergebnis2:31." },
    ],
    sieger: { text: `ROT GEWINNT · +${vorsprung2}`, team: "a", ein: "ergebnis2:Siege" },
  });

  // ---------- Warum? zwei Faktoren ----------
  const p0 = (x) => `${Math.round(x * 100)} %`;
  M.balken({
    y: 822, ein: "warum:Warum-0.05", aus: "ueberraschung:Und-0.12", titel: "Warum? Rot gewinnt die Runde …", max: 62,
    faktoren: [
      { label: "NACH EINEM MENSCH-SIEG", ein: "warum:Gewinner", a: { wert: WARUM.sieg.rotGewinnt * 100, text: p0(WARUM.sieg.rotGewinnt) }, b: { wert: WARUM.sieg.cyanGewinnt * 100, text: p0(WARUM.sieg.cyanGewinnt) }, tag: "BLEIBT", tagEin: "warum:bleiben" },
      { label: "NACH EINER NIEDERLAGE", ein: "warum:Verlierer", a: { wert: WARUM.niederlage.rotGewinnt * 100, text: p0(WARUM.niederlage.rotGewinnt) }, b: { wert: WARUM.niederlage.cyanGewinnt * 100, text: p0(WARUM.niederlage.cyanGewinnt) }, tag: "WECHSELT", tagEin: "warum:wechseln" },
    ],
  });

  // ---------- Zweite Überraschung: Cyan würfelt ab der Hälfte ----------
  const sWeg = M.stempel({ text: "STOPP!", ein: "ueberraschung:nicht", x: SICHER.mitte, y: 640, winkel: -5, art: "stempel", farbe: AKZENT, groesse: 124 });
  const haelfte2Rot = lw.siegeRot - lw.runden[49].siegeRot, haelfte2Cyan = lw.siegeCyan - lw.runden[49].siegeCyan;
  M.formel({
    y: 872, aus: "merksatz:Gegen-0.15", titel: "Zweite Hälfte · Siege", groesse: 96,
    teile: [
      { text: String(haelfte2Rot), ein: "ueberraschung:14", team: "a" },
      { text: ":", ein: "ueberraschung:zu" },
      { text: String(haelfte2Cyan), ein: "ueberraschung:15", team: "b" },
    ],
  });

  // ---------- Merksatz ----------
  M.pointe({ woerter: [{ text: "GEGEN ZUFALL", ein: "merksatz:Gegen" }, { umbruch: true }, { text: "HILFT KEINE", ein: "merksatz:hilft" }, { text: "TAKTIK.", ein: "merksatz:Taktik", farbe: "a" }], aus: "merksatz:Nur-0.12", y: 420, groesse: 112 });
  M.pointe({ woerter: [{ text: "NUR GEGEN", ein: "merksatz:Nur" }, { umbruch: true }, { text: "MUSTER.", ein: "merksatz:Muster", farbe: "akzent" }], aus: "schluss:Was-0.1", y: 420, groesse: 128 });
  M.melde({ t: "merksatz:Taktik", typ: "pointe-wort", klang: "klick", text: "TAKTIK." });
  M.melde({ t: "merksatz:Muster", typ: "pointe-wort", klang: "akzent", text: "MUSTER." });

  // ---------- Untertitel Wort für Wort (Stil „kontur“, Entscheidung des Inhabers 01.11.) ----------
  M.untertitel({ stil: "kontur", versteckt: [[T("schluss:Kommentare.>") + 0.5, DAUER + 1]] });

  // Hand-Reveals der ersten drei Runden und Phasenwechsel ins Protokoll (Ton)
  for (const r of [1, 2, 3]) M.melde({ t: tZ[r], typ: "zug", klang: "pop", text: `Runde ${r}` });
  M.melde({ t: tMensch, typ: "wandlung", klang: "whoosh", text: "Würfel wird Mensch" });
  M.melde({ t: tW0, typ: "wandlung", klang: "whoosh", text: "Mensch würfelt" });
  M.melde({ t: tLeerZ, typ: "welle", klang: "whoosh", text: "Brett leeren" });
  M.melde({ t: tMerk, typ: "welle", klang: "whoosh", text: "Brett leeren" });

  // =====================================================================================
  // Kamera
  // =====================================================================================
  const E = {
    start: { pos: [0, 3.4, 27.6], ziel: [0, 2.67, 0], fov: 17 },
    hook: { pos: [0, 3.3, 26.4], ziel: [0, 2.72, 0], fov: 17 },
    regeln: { pos: [0, 3.5, 25.6], ziel: [0, 2.9, 0], fov: 17 },
    falle: { pos: [0, 3.4, 27.2], ziel: [0, 2.67, 0], fov: 17 },
    rennen: { pos: [0, 3.5, 26.6], ziel: [0, 2.6, 0], fov: 17 },
    spaet: { pos: [0.5, 3.8, 25.4], ziel: [0, 3.0, 0], fov: 17 },
    erg1: { pos: [0, 3.4, 27.6], ziel: [0, 2.67, 0], fov: 17 },
    mensch: { pos: [-0.8, 3.7, 26.4], ziel: [0, 2.85, 0], fov: 17 },
    mensch2: { pos: [0.7, 3.8, 25.2], ziel: [0, 3.1, 0], fov: 17 },
    erg2: { pos: [0, 3.4, 27.6], ziel: [0, 2.67, 0], fov: 17 },
    warum: { pos: [0, 3.6, 26.8], ziel: [0, 2.8, 0], fov: 17 },
    wuerfelt: { pos: [-0.6, 3.7, 25.8], ziel: [0, 3.0, 0], fov: 17 },
    merk: { pos: [0, 3.4, 27.0], ziel: [0, 2.9, 0], fov: 17 },
  };
  const fahrten = [
    { t: 0, z: E.start },
    { t: 0.05, z: E.hook, d: 4.6, e: ease.inOutSine },
    { t: T("regeln:Hundert") - 0.2, z: E.regeln, d: 1.0 },
    { t: T("falle:Klar") - 0.3, z: E.falle, d: 0.8 },
    { t: tLos + 0.1, z: E.rennen, d: 1.4 },
    { t: T("wendung1:Doch") - 0.3, z: E.spaet, d: 2.2, e: ease.inOutSine },
    { t: T("ergebnis1:Endstand") - 0.2, z: E.erg1, d: 1.0 },
    { t: T("wendung2:Aber") - 0.1, z: E.mensch, d: 1.0 },
    { t: T("mensch:44") - 0.5, z: E.mensch2, d: 3.0, e: ease.inOutSine },
    { t: T("ergebnis2:Endstand") - 0.2, z: E.erg2, d: 1.0 },
    { t: T("warum:Warum") - 0.1, z: E.warum, d: 1.0 },
    { t: T("ueberraschung:Und") - 0.1, z: E.wuerfelt, d: 1.4 },
    { t: tMerk, z: E.merk, d: 1.0 },
  ];
  const kamBasis = (t) => {
    let z = fahrten[0].z;
    for (let i = 1; i < fahrten.length; i++) {
      const f = fahrten[i];
      if (t < f.t) break;
      const k = (f.e || ease.inOutCubic)(fortschritt(t, f.t, f.t + f.d));
      z = { pos: z.pos.map((v, j) => lerp(v, f.z.pos[j], k)), ziel: z.ziel.map((v, j) => lerp(v, f.z.ziel[j], k)), fov: lerp(z.fov, f.z.fov, k) };
    }
    // leichtes Driften (nichts steht still), am Anfang und Ende 0 (Schleife)
    const dx = Math.sin(t * 0.37) * 0.07, dy = Math.sin(t * 0.29 + 1) * 0.05;
    // Zuneigung zum Führenden: Die Kamera schwenkt leicht zur Seite des Führenden
    const s = stand(t);
    const lead = clamp((s.rot - s.cyan) / 8, -1, 1) * (t > tLos ? 1 : 0) * (t < tMerk ? 1 : 0);
    return { pos: [z.pos[0] + dx - lead * 0.25, z.pos[1] + dy, z.pos[2]], ziel: [z.ziel[0] - lead * 0.2, z.ziel[1], z.ziel[2]], fov: z.fov };
  };
  const regie = new Regie(kamera, kamBasis, { zp });
  regie.schleife({ ab: tSchleife, ende: ENDE });
  fahrten.slice(2).forEach((f) => M.melde({ t: f.t, typ: "kamera", art: "fahrt", dauer: f.d, klang: "whoosh" }));
  for (const s of [sKlar, sUeber, sMensch, sWeg]) regie.stoss({ t: s.ein + 0.1, staerke: 0.8 });
  regie.zoom({ t: "wendung1:vorbei", staerke: 0.12, halt: 0.9, rueck: 0.6 });
  regie.zoom({ t: "ergebnis2:Neunzehn", staerke: 0.1, halt: 1.0, rueck: 0.6 });

  // =====================================================================================
  // Weltzustand je Bild
  // =====================================================================================
  const handR_ = handR, handC_ = handC;
  const setzeWelt = (t) => {
    const kl = kL(t);
    const h = haende(t);
    const ein = 1 - kl; // in der Schleife gleiten alle Bewegungen in den Anfangszustand (Fäuste, ruhig, Brett leer)
    const idle = Math.sin(t * 1.7) * 0.025;
    setzeHand(handR_, mischePose(mixW(POSE_FAUST, h.wR, ein)), { pump: h.pumpR * ein + idle, quetsch: lerp(1, h.quR, ein), wackeln: h.wackR * ein, neigung: 0.03 * Math.sin(t * 1.3) });
    setzeHand(handC_, mischePose(mixW(POSE_FAUST, h.wC, ein)), { pump: h.pumpC * ein - idle, quetsch: lerp(1, h.quC, ein), wackeln: h.wackC * ein, neigung: -0.03 * Math.sin(t * 1.3 + 1) });
    // Sockel-Ringe leuchten beim Gewinner
    const glow = (seite) => (h.seit < 0.5 && !h.schnell ? (h.gew === seite ? Math.exp(-h.seit * 5) : 0) : h.schnell ? (h.gew === seite ? 0.4 : 0) : 0);
    sockR.userData.ring.material = ton(ROT, { emissiv: ROT, emissivStaerke: 0 });
    // Brett
    for (let r = 1; r <= 100; r++) {
      const s = kachel(r, t);
      const g = (s.groesse || 0) * (t >= tMerk ? 1 - ease.inCubic(clamp((t - tMerk - (r - 1) * 0.004) / 0.2)) : 1) * (1 - kl);
      setzeKachel(B, r - 1, { groesse: g, farbe: s.farbe || "remis", drehung: s.drehung || 0, hebe: s.hebe || 0 });
    }
    // Symbole: Bauer wippt bei Rot-Siegen, Würfel rollt; bei „Mensch“ wird der Würfel zum Kopf
    const mensch = clamp(fortschritt(t, tMensch, tMensch + 0.5)) * (1 - clamp(fortschritt(t, T("ueberraschung:Würfelt") - 0.05, T("ueberraschung:Würfelt") + 0.4)));
    const m = ease.outCubic(mensch) * ein;
    wuerf.scale.setScalar(Math.max(0.001, 1 - m));
    wuerf.visible = m < 0.999;
    wuerf.rotation.y = t * 1.1 + 0.4;
    wuerf.rotation.x = Math.sin(t * 0.9) * 0.4 + 0.3;
    wuerf.position.y = 0.45 + 0.08 * Math.sin(t * 2.2);
    kopf.scale.setScalar(Math.max(0.001, m));
    kopf.visible = m > 0.001;
    kopf.rotation.y = Math.sin(t * 0.8) * 0.35;
    kopf.position.y = 0.05 * Math.sin(t * 2.0);
    const bwippt = h.gew > 0 && h.seit < 0.5 && !h.schnell ? Math.exp(-h.seit * 5) * Math.abs(Math.sin(h.seit * 14)) * 0.22 : 0;
    pawn.position.y = bwippt * ein + 0.03 * Math.sin(t * 2.0);
    pawn.rotation.y = Math.sin(t * 0.7) * 0.25;
    regie.anwenden(t);
  };
  const post = { bloomStaerke: 0, tiltStaerke: 0, vignette: 0.16, koernung: 0.028, saettigung: 1.04, kontrast: 1.03, belichtung: 1.0 };
  const welt = { szene, kamera, post, update(t) { setzeWelt(t); } };

  // =====================================================================================
  // Rendern und Übergabe
  // =====================================================================================
  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    buehne.zeichne(welt, { bildNr: Math.round(t * FPS), t });
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  for (const t of [0, 16, 30, 45, ENDE]) window.renderAt(Math.min(t, ENDE));
  const schleifenPruefung = M.pruefeSchleife(window.renderAt, { regie });
  if (!schleifenPruefung.ok) console.warn("Schleife nicht geschlossen:", JSON.stringify(schleifenPruefung));
  M.veroeffentliche({ regie, dauer: DAUER, teppich: skript.klangteppich, schleifenPruefung });
  window.__nurHud = (t) => { regie.anwenden(t); hud.update(t); };
  window.__weltSetzen = (t) => setzeWelt(t);
  window.modell = {
    seeds: V.seeds,
    zufall: { rot: lz.siegeRot, cyan: lz.siegeCyan, remis: lz.remis },
    mensch: { rot: lm.siegeRot, cyan: lm.siegeCyan, remis: lm.remis },
    haelfte2: [haelfte2Rot, haelfte2Cyan],
    mc: MC_ZUFALL,
    warum: WARUM,
  };
  window.renderAt(0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
