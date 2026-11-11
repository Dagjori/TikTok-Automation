// „Deutschlandticket: 2023 oder 2027, wer arbeitet länger dafür?“ · Simulierbar · Stil 20 Glas & Licht (13.11.2026 abend)
// Dunkles Labor: zwei Messzylinder (links Ticket 2023 in Türkis, rechts das jeweilige Jahr in Orange). Füllstand = Arbeitszeit in Minuten
// bei gesetzlichem Mindestlohn (Preis ÷ Stundenlohn). Das Röhrchen in der Mitte zeigt den Unterschied. Alle Zahlen aus pipeline/sim/deutschlandticket.mjs.
// Alles ist eine reine Funktion von t.
import * as THREE from "three";
import { SimBuehne, GRADING, rigLabor, lichtKegel, staub, leuchtMat, buendeln, fokus, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { glasGefaess, kaustik, laborBank, gegenlichtWand, laborZeit } from "../../engine/stil_lichtlabor.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, keyframes } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/deutschlandticket.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

const TUERKIS = "#22C6D6"; // Ticket 2023
const ORANGE = "#FF8A4C";  // Ticket heute
const ELFENBEIN = "#ECE6DA";
const Z = videoZahlen();
const MAXW = 300;

function funken({ n = 70, farbe = "#FFFFFF", seed = 3, radius = 0.3, groesse = 7 }) {
  let s = seed * 977 + 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const sd = new Float32Array(n * 3), pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) sd[i] = r();
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(sd, 3));
  const m = new THREE.ShaderMaterial({
    uniforms: { k: { value: 0 }, ursprung: { value: new THREE.Vector3() }, richtung: { value: new THREE.Vector3(0, 1, 0) }, farbe: { value: new THREE.Color(farbe) }, radius: { value: radius }, groesse: { value: groesse } },
    vertexShader: /* glsl */ `attribute vec3 seed; uniform float k, radius, groesse; uniform vec3 ursprung, richtung; varying float vA;
      void main(){ float d = seed.x * 0.5; float p = clamp((k - d) / 0.5, 0.0, 1.0);
        vec3 w = ursprung + vec3((seed.y - 0.5) * radius * 2.0, 0.0, (seed.z - 0.5) * radius * 2.0) + richtung * p * (0.7 + seed.z) + vec3(sin(p * 6.0 + seed.x * 30.0) * 0.08, 0.0, 0.0);
        vA = sin(p * 3.14159) * step(0.001, k) * step(k, 0.999);
        vec4 mv = viewMatrix * vec4(w, 1.0); gl_PointSize = groesse * (0.6 + seed.y) * 14.0 / max(-mv.z, 1.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform vec3 farbe; varying float vA; void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(farbe * a * a * vA * 2.2, 1.0); }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = 11; p.userData.dynamisch = true;
  p.setze = (k, ursprung, richtung) => { m.uniforms.k.value = k; if (ursprung) m.uniforms.ursprung.value.set(...ursprung); if (richtung) m.uniforms.richtung.value.set(...richtung); p.visible = k > 0.001 && k < 0.999; };
  p.visible = false;
  return p;
}

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.5 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: true });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "TICKET 2023", farbe: TUERKIS, woerter: ["49*", "Mai*", "2023*", "Start*", "245*"] },
      b: { name: "TICKET HEUTE", farbe: ORANGE, woerter: ["66,80*", "Januar*", "2027*", "29,5*", "86,20*", "34,5*"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });
  const T = (x) => M.zeit(x);
  const R = (t, a, b, e = ease.inOutSine) => e(fortschritt(t, a, b));
  const puls = (t, t0, d = 0.7) => { const k = fortschritt(t, t0, t0 + d); return k > 0 && k < 1 ? Math.sin(k * Math.PI) ** 2 : 0; };
  const an = (t, a, b) => (t > a && t < b ? 1 : 0);

  // ---------- Zeitachse an gesprochenen Wörtern ----------
  const tF0 = 0.3, tF1 = T("regeln:Arbeitszeit") + 1.0;           // beide füllen sich mit der Arbeitszeit von 2023
  const tY24 = T("wendung2:2024"), tL24 = T("wendung2:Lohn") + 0.1;
  const tY25 = T("wendung3:2025"), tP25 = T("wendung3:springt") + 0.1;
  const tY26 = T("kipp:2026");
  const tJan = T("kipp:Januar"), tL27 = T("kipp:Lohn"), tT27 = T("kipp:Ticket");
  const tErg = T("ergebnis:2027"), tWarum = T("warum:Preis");
  const tJob = T("pointe:Jobticket") + 0.6;
  const tVa = T("wendung3:4") - 0.2;
  const fill = (t) => R(t, tF0, tF1, ease.outCubic);

  const minB = (t) => {
    let B = Z.min2023 * fill(t);
    B += (Z.min2024 - Z.min2023) * R(t, tL24, tL24 + 1.4, ease.inOutCubic);
    B += (Z.min2025 - Z.min2024) * R(t, tP25, tP25 + 1.8, ease.inOutCubic);
    B += (Z.min2026 - Z.min2025) * R(t, tY26 + 0.3, tY26 + 1.4, ease.inOutCubic);
    B += (Z.min2027 - Z.min2026) * R(t, tL27, tT27 + 1.2, ease.inOutCubic);
    B += (Z.jobMin - Z.min2027) * R(t, tJob, tJob + 2.4, ease.inOutCubic);
    return B;
  };
  const preis = (t) => 49 + 9 * R(t, tP25, tP25 + 1.2) + 5 * R(t, tY26 + 0.3, tY26 + 1.2) + 3.8 * R(t, tT27 - 0.4, tT27 + 0.8);
  const lohn = (t) => 12 + 0.41 * R(t, tL24, tL24 + 1.0) + 0.41 * R(t, tP25, tP25 + 1.0) + 1.08 * R(t, tY26 + 0.3, tY26 + 1.2) + 0.7 * R(t, tL27, tL27 + 0.9);
  const jahr = (t) => (t < tY24 ? 2023 : t < tY25 ? 2024 : t < tY26 ? 2025 : t < tJan ? 2026 : 2027);
  const zustandRoh = (t) => {
    const A = Z.min2023 * fill(t), B = minB(t);
    const vor = Math.max(0, B - A) * R(t, tVa, tVa + 0.8);
    return { A, B, vor, zA: an(t, tF0, tF1) };
  };
  const zustand = M.wert(zustandRoh);

  const PA = ["hook:49", "hook:Mai", "regeln:Ticketpreis", "wendung1:Mai", "wendung1:Ticket", "wendung3:Gruppe", "ergebnis:gegen", "schlusskarte:Ohne"];
  const PB = ["hook:66,80", "hook:Januar", "hook:Wer", "falle:Oder", "wendung2:2024", "wendung3:2025", "kipp:2026", "kipp:Januar", "ergebnis:2027", "warum:Mindestlohn", "pointe:Jobticket"];
  const PU = ["hook:Monatsticket", "regeln:Mindestlohn", "falle:Das", "wendung2:günstig", "wendung3:Wer,", "kipp:Ticket", "ergebnis:Plus", "ergebnis:86,20", "pointe:Und"];
  const tPA = PA.map((k) => T(k)), tPB = PB.map((k) => T(k)), tPU = PU.map((k) => T(k));
  const summe = (liste, t, d = 0.8) => liste.reduce((a, p) => a + puls(t, p, d), 0);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = new THREE.Color("#040507");
  const XA = -1.02, XB = 1.02;
  const lab = rigLabor(szene, buehne.renderer, { umgebungsStaerke: 0.55, schatten: SCHATTEN > 0 ? 1024 : 0, spots: [{ pos: [XA, 7, 0.4], staerke: 18, winkel: 0.2 }, { pos: [XB, 7, 0.4], staerke: 18, winkel: 0.2 }] });
  szene.add(laborBank({ breite: 18, tiefe: 7, spiegel: 0.2 }));
  const wand = gegenlichtWand({ farbe: "#1A2334", staerke: 1.0 }); wand.position.set(0, 4, -6); szene.add(wand);
  const SKALEN = [{ max: MAXW, teilung: 25, beschriftung: 50 }];
  const HOEHE = 3.1;
  const gA = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: TUERKIS, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 1 });
  const gB = glasGefaess({ hoehe: HOEHE, radius: 0.46, farbe: ORANGE, skalen: SKALEN, strahl2: 0.02, strahlHoehe: 6, seed: 2 });
  gA.position.x = XA; gB.position.x = XB;
  gA.skalaMeshes.forEach((m) => { m.rotation.y = 0.32; }); gB.skalaMeshes.forEach((m) => { m.rotation.y = -0.32; });
  const gU = glasGefaess({ hoehe: 2.2, radius: 0.15, wand: 0.03, boden: 0.1, farbe: ELFENBEIN, ohneSkala: true, blasen: 30, seed: 3 });
  gU.position.set(0, 0, 0.1);
  szene.add(gA, gB, gU);
  const kA = kaustik({ radius: 1.0, farbe: TUERKIS, staerke: 0.9 }), kB = kaustik({ radius: 1.0, farbe: ORANGE, staerke: 0.9 }), kU = kaustik({ radius: 0.55, farbe: ELFENBEIN, staerke: 0.6 });
  kA.position.set(XA + 0.25, 0.004, 0.5); kB.position.set(XB - 0.25, 0.004, 0.5); kU.position.set(0.1, 0.004, 0.7);
  szene.add(kA, kB, kU);
  for (const x of [XA, XB]) {
    const k = lichtKegel({ hoehe: 7, radiusOben: 0.08, radiusUnten: 1.3, farbe: "#E8F0FF", staerke: 0.07, weich: 1.3, streifen: 0.5 });
    k.position.set(x, 7, 0.4); szene.add(k);
  }
  szene.add(staub({ anzahl: 420, bereich: [5.5, 6, 3], mitte: [0, 3.2, 0.4], farbe: "#DCE6FF", groesse: 0.01, staerke: 1.4, aussen: 0.15 }));
  const ringMat = (f) => leuchtMat(f, 1, { neu: true });
  const rA = ringMat(TUERKIS), rB = ringMat(ORANGE), rU = ringMat(ELFENBEIN);
  const ring = (mat, x, r, z = 0) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 72), mat); m.rotation.x = Math.PI / 2; m.position.set(x, 0.012, z); m.userData.dynamisch = true; szene.add(m); return m; };
  ring(rA, XA, 0.56); ring(rB, XB, 0.56); ring(rU, 0, 0.22, 0.1);
  // Referenzlinie: Arbeitszeit von 2023 (245 Min.) als weißer Ring auf dem rechten Zylinder
  const glMat = ringMat(ELFENBEIN);
  const refRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.016, 8, 72), glMat); refRing.rotation.x = Math.PI / 2; refRing.userData.dynamisch = true; refRing.visible = false;
  refRing.position.set(XB, gB.fluessigHoehe(Z.min2023, MAXW), 0); szene.add(refRing);
  const fA = funken({ n: 70, farbe: TUERKIS, seed: 5, radius: 0.3 });
  const fB = funken({ n: 70, farbe: ORANGE, seed: 6, radius: 0.3 });
  const fB2 = funken({ n: 70, farbe: ORANGE, seed: 9, radius: 0.3, groesse: 6 });
  const fB3 = funken({ n: 80, farbe: ELFENBEIN, seed: 12, radius: 0.3, groesse: 6 });
  szene.add(fA, fB, fB2, fB3);
  buendeln(szene);

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(30, 1080 / 1920, 0.1, 100);
  const C = (px, py, pz, zx, zy, zz, fov = 30) => [px, py, pz, zx, zy, zz, fov];
  const camKeys = [
    { t: 0, v: C(1.0, 3.5, 17.8, 0, 2.4, 0) },
    { t: T("hook:49"), v: C(-0.6, 3.4, 17.0, -0.5, 2.3, 0), e: ease.inOutSine },
    { t: T("hook:66,80"), v: C(0.6, 3.4, 17.0, 0.5, 2.3, 0), e: ease.inOutSine },
    { t: T("hook:Wer"), v: C(0.0, 3.7, 18.8, 0, 2.5, 0), e: ease.inOutSine },
    { t: T("regeln:Gemessen"), v: C(-0.5, 3.4, 16.8, -0.4, 2.4, 0), e: ease.inOutCubic },
    { t: T("regeln:Ticketpreis"), v: C(0.5, 3.4, 16.8, 0.4, 2.4, 0), e: ease.inOutCubic },
    { t: T("falle:Klar") - 0.1, v: C(0.5, 3.2, 16.0, 0.45, 2.3, 0, 29), e: ease.inOutCubic },
    { t: T("falle:Oder") - 0.5, v: C(0.0, 3.7, 18.6, 0, 2.5, 0, 29), e: ease.inOutCubic },
    { t: T("wendung1:Mai"), v: C(-0.7, 3.3, 16.6, -0.5, 2.2, 0), e: ease.inOutCubic },
    { t: T("wendung1:Ein") - 0.1, v: C(-0.3, 3.2, 15.8, -0.3, 2.1, 0, 28), e: ease.inOutCubic },
    { t: tY24 - 0.1, v: C(0.7, 3.3, 16.6, 0.5, 2.2, 0), e: ease.inOutCubic },
    { t: T("wendung2:günstig") - 0.1, v: C(0.4, 3.0, 15.2, 0.4, 1.9, 0, 28), e: ease.inOutCubic },
    { t: tY25 - 0.1, v: C(0.0, 3.8, 18.6, 0, 2.5, 0.1), e: ease.inOutCubic },
    { t: tP25, v: C(0.8, 3.4, 16.6, 0.6, 2.4, 0), e: ease.inOutCubic },
    { t: T("wendung3:Gruppe") - 0.1, v: C(0.0, 3.5, 17.6, 0, 2.4, 0), e: ease.inOutCubic },
    { t: tY26 - 0.1, v: C(0.6, 3.5, 17.0, 0.4, 2.4, 0), e: ease.inOutCubic },
    { t: tJan - 0.1, v: C(0.0, 3.2, 16.0, 0, 2.2, 0, 28), e: ease.inOutCubic },
    { t: tL27 - 0.1, v: C(0.7, 3.3, 16.4, 0.5, 2.3, 0), e: ease.inOutCubic },
    { t: tErg - 0.3, v: C(0.0, 3.9, 19.2, 0, 2.6, 0), e: ease.inOutCubic },
    { t: T("ergebnis:Plus") - 0.1, v: C(0.4, 3.4, 16.6, 0.3, 2.2, 0), e: ease.inOutCubic },
    { t: T("ergebnis:86,20") - 0.3, v: C(0.0, 3.8, 18.2, 0, 2.5, 0.1), e: ease.inOutCubic },
    { t: tWarum, v: C(0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: T("warum:Mindestlohn") - 0.2, v: C(-0.6, 3.9, 19.0, 0, 2.6, 0), e: ease.inOutSine },
    { t: T("pointe:Und") - 0.1, v: C(0.4, 3.5, 17.2, 0.3, 2.3, 0), e: ease.inOutCubic },
    { t: tJob + 1.5, v: C(0.2, 3.1, 15.6, 0.2, 2.0, 0), e: ease.inOutCubic },
    { t: T("schlusskarte:Ohne") - 0.2, v: C(0.0, 3.8, 19.0, 0, 2.6, 0), e: ease.inOutCubic },
    { t: DAUER, v: C(0.0, 3.9, 19.8, 0, 2.6, 0), e: ease.inOutSine },
  ];
  const regie = new Regie(kamera, (t) => { const v = keyframes(camKeys, t); return { pos: v.slice(0, 3), ziel: v.slice(3, 6), fov: v[6] }; }, { zp });
  regie.atmen({ staerke: 0.008, tempo: 0.25 });
  regie.zoom({ t: tP25 + 0.8, ziel: [XB, 2.0, 0.1], staerke: 0.13, halt: 1.0, rueck: 0.8 });
  regie.zoom({ t: tErg + 0.6, ziel: [0, 1.9, 0.1], staerke: 0.14, halt: 1.1, rueck: 0.8 });
  regie.zoom({ t: T("ergebnis:86,20"), ziel: [0, 1.7, 0.1], staerke: 0.12, halt: 1.1, rueck: 0.8 });
  regie.zoom({ t: tJob + 1.6, ziel: [XB, 1.6, 0.1], staerke: 0.13, halt: 1.1, rueck: 0.8 });

  const post = { ...GRADING.labor, strahlen: 0.35, strahlenQuelle: [0.5, 0.98], strahlenSchwelle: 1.2, strahlenLaenge: 0.6 };
  const cA = new THREE.Color(TUERKIS), cB = new THREE.Color(ORANGE), cE = new THREE.Color(ELFENBEIN);
  const welt = { szene, kamera, post, update: null };
  welt.update = (t) => {
    const s = zustand(t);
    laborZeit(t);
    gA.setze({ wert: s.A, t, zulauf: !!s.zA, zulauf2: !!s.zA, maxWert: MAXW, skala: 0 });
    gB.setze({ wert: s.B, t, zulauf: !!s.zA, zulauf2: !!s.zA, maxWert: MAXW, skala: 0 });
    gU.setze({ wert: s.vor, t, zulauf: false, maxWert: 40 });
    const pA = summe(tPA, t), pB = summe(tPB, t), pU = summe(tPU, t, 0.9);
    const spann = fortschritt(t, tY24, tErg);
    lab.spots[0].intensity = 18 * (1 + 0.55 * Math.min(1.6, pA) + 0.25 * spann);
    lab.spots[1].intensity = 18 * (1 + 0.55 * Math.min(1.6, pB) + 0.25 * spann);
    rA.color.copy(cA).multiplyScalar(1.4 + 2.6 * Math.min(1.5, pA));
    rB.color.copy(cB).multiplyScalar(1.4 + 2.6 * Math.min(1.5, pB));
    rU.color.copy(cE).multiplyScalar(1.0 + 2.8 * Math.min(1.5, pU));
    post.bloomStaerke = GRADING.labor.bloomStaerke * (1 + 0.3 * spann + 0.35 * puls(t, T("ergebnis:86,20"), 1.6) + 0.3 * puls(t, tJob, 1.4));
    const rk = fortschritt(t, tY24 - 0.2, tY24 + 0.4) * (1 - fortschritt(t, tJob - 0.2, tJob + 0.4));
    glMat.color.copy(cE).multiplyScalar(2.4 * rk); refRing.visible = rk > 0.02;
    fA.setze(clamp((t - T("wendung1:Ein")) / 2.4), [XA, gA.fluessigHoehe(s.A, MAXW), 0.1], [0, 1.2, 0.2]);
    fB.setze(clamp((t - tL24) / 2.4), [XB, gB.fluessigHoehe(s.B, MAXW), 0.1], [0, 1.2, 0.2]);
    fB2.setze(clamp((t - tP25) / 2.6), [XB, gB.fluessigHoehe(s.B, MAXW), 0.1], [0, 1.1, 0.2]);
    fB3.setze(clamp((t - tJob) / 2.6), [XB, gB.fluessigHoehe(Math.max(s.B, 0), MAXW), 0.1], [0, 1.0, 0.2]);
    aktualisiere(t);
    regie.anwenden(t);
    Object.assign(post, fokus(kamera, [0, 1.5, 0.1], { tiefe: 0.22, nah: 0.5, fern: 0.75 }));
  };

  // ---------- HUD ----------
  const tafel = M.tafel({
    y: 166, links: { team: "a", einheit: "min", nk: 1, max: 999 }, rechts: { team: "b", einheit: "min", nk: 1, max: 999 }, vorn: "hoch",
    werte: (t) => { const s = zustandRoh(t); return { a: s.A, b: s.B }; },
    uhr: { ein: 0, zeit: (t) => jahr(t), format: (x) => String(Math.round(x)), label: "JAHR" },
  });
  const fuehrerAlt = Object.getPrototypeOf(tafel)._fuehrer;
  tafel._fuehrer = function (w) { return w.a < 1 || w.b < 1 || Math.abs(w.a - w.b) < 0.05 ? 0 : fuehrerAlt.call(this, w); };
  const chip = (text, ein, aus, team, art = "voll", y = 490) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.12) => T(x) - d;
  // Statuszeile (wechselt je Stufe)
  chip("49 € IM MAI 2023 · 66,80 € AB JANUAR", 0.05, v("regeln:Gemessen", 0.4), "akzent", "hell", 372);
  chip("ARBEITSZEIT = PREIS ÷ MINDESTLOHN", v("regeln:Gemessen", -0.15), v("wendung1:Mai", 0.4), "akzent", "hell", 372);
  chip("STUFE 1 · START MAI 2023", v("wendung1:Mai", 0.05), v("wendung2:2024", 0.4), "akzent", "voll", 372);
  chip("STUFE 2 · 2024", v("wendung2:2024", 0.05), v("wendung3:2025", 0.4), "akzent", "voll", 372);
  chip("STUFE 3 · 2025", v("wendung3:2025", 0.05), v("kipp:2026", 0.4), "akzent", "voll", 372);
  chip("STUFE 4 · 2026", v("kipp:2026", 0.05), v("kipp:Januar", 0.4), "akzent", "voll", 372);
  chip("STUFE 5 · JANUAR 2027", v("kipp:Januar", 0.05), v("warum:Preis", 0.3), "akzent", "voll", 372);
  // Regeln
  chip("ARBEITSZEIT IN MINUTEN", v("regeln:Arbeitszeit", 0.1), v("falle:Klar", 0.4), "akzent", "hell", 490);
  chip("TICKETPREIS ÷ MINDESTLOHN", v("regeln:Ticketpreis", 0.1), v("falle:Klar", 0.4), "akzent", "hell", 600);
  chip("BRUTTO · JE STUNDE", v("regeln:Stunde.", 0.15), v("falle:Klar", 0.4), "akzent", "hell", 710);
  chip("LOHN GESTIEGEN = AUSGEGLICHEN?", v("falle:Klar", 0.0), v("wendung1:Mai", 0.45), "akzent", "voll", 490);
  // Wendung 1: Start 2023
  chip("MINDESTLOHN 12,00 €", v("wendung1:12,00", 0.15), v("wendung1:Ein", 0.45), "a", "voll", 490);
  chip("4 STD. 5 MIN. ARBEIT", v("wendung1:Ein", 0.05), v("wendung2:2024", 0.45), "a", "voll", 490);
  // Wendung 2: 2024
  chip("2024 · LOHN 12,41 €", v("wendung2:2024", 0.0), v("wendung2:Ticket", 0.15), "b", "voll", 490);
  chip("3 STD. 57 MIN. · TIEFPUNKT", v("wendung2:Ticket", -0.05), v("wendung3:2025", 0.45), "b", "voll", 490);
  chip("SO GÜNSTIG WAR ES NIE WIEDER", v("wendung2:günstig", 0.05), v("wendung3:2025", 0.45), "akzent", "hell", 600);
  // Wendung 3: 2025, die zweite Frage
  chip("2025 · PREIS 58 €", v("wendung3:2025", 0.0), v("wendung3:4", 0.5), "b", "voll", 490);
  chip("4 STD. 32 MIN. ARBEIT", v("wendung3:4", 0.1), v("wendung3:Gruppe", 0.5), "b", "voll", 490);
  chip("WER ZAHLT 2027 WENIGER?", v("wendung3:Gruppe", 0.05), v("kipp:2026", 0.45), "akzent", "voll", 600);
  // Kipp-Moment
  chip("2026 · 63 € · 13,90 €", v("kipp:2026", 0.0), v("kipp:wieder", 0.45), "b", "voll", 490);
  chip("WIEDER 4 STD. 32 MIN.", v("kipp:wieder", 0.05), v("kipp:Januar", 0.5), "b", "voll", 490);
  chip("JANUAR 2027 · LOHN +5,0 %", v("kipp:Januar", 0.05), v("kipp:Ticket", 0.5), "b", "voll", 490);
  chip("TICKET +6,0 %", v("kipp:Ticket", 0.05), v("ergebnis:2027", 0.3), "b", "voll", 490);
  // Preis und Lohn laufen mit (Zähler)
  M.zaehler({ wert: preis, einheit: " €", nk: 2, max: 999, team: "akzent", art: "voll", label: "TICKET · MONAT", x: SICHER.mitte, y: 790, ein: v("falle:Klar", 0.3), aus: v("ergebnis:2027", 0.3), anker: "mitte" });
  M.zaehler({ wert: lohn, einheit: " €", nk: 2, max: 999, team: "akzent", art: "voll", label: "MINDESTLOHN · STUNDE", x: SICHER.mitte, y: 900, ein: v("regeln:Mindestlohn", 0.2), aus: v("ergebnis:2027", 0.3), anker: "mitte" });
  // Ergebnis, Warum, Pointe, Schlusskarte
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 470, titel: "ARBEITSZEIT FÜR EIN TICKET", ein: tErg + 0.1, aus: v("warum:Preis", 0.2),
    zeilen: [{ label: "START 2023", wert: Z.min2023, nk: 1, einheit: "min", team: "a", ein: T("ergebnis:gegen") }, { label: "JANUAR 2027", wert: Z.min2027, nk: 1, einheit: "min", team: "b", ein: T("ergebnis:4") }],
    differenz: { label: "MEHR ARBEIT", wert: Z.diffMin, nk: 1, einheit: "min", ein: T("ergebnis:29,5") - 0.1 } });
  M.zaehler({ wert: (t) => Z.diffJahrEuro * R(t, T("ergebnis:86,20") - 0.6, T("ergebnis:86,20") + 1.0), einheit: " €", nk: 2, max: 9999, team: "b", art: "voll", label: "IM JAHR · 5,9 STD.", x: SICHER.mitte, y: 1040, ein: v("ergebnis:5,9", 0.1), aus: v("warum:Preis", 0.2), anker: "mitte" });
  M.balken({ x: SICHER.mitte - 390, breite: 780, y: 440, titel: "WARUM?", ein: tWarum + 0.1, aus: v("pointe:Und", 0.3), max: 40,
    faktoren: [{ label: "PREIS GEGEN LOHN SEIT 2023", ein: tWarum + 0.2, a: { wert: Z.preisPlus, text: "+36,3 %" }, b: { wert: Z.lohnPlus, text: "+21,7 %" }, tag: "PREIS SCHNELLER", tagEin: T("warum:Mindestlohn") }] });
  chip("ARBEITGEBER ZAHLT MIND. 25 %", v("pointe:Mit", 0.05), v("schlusskarte:Ohne", 0.4), "akzent", "voll", 490);
  chip("JOBTICKET · 3 STD. 12 MIN.", v("pointe:3", 0.1), v("schlusskarte:Ohne", 0.4), "a", "voll", 600);
  M.zaehler({ wert: (t) => 66.8 + (Z.jobEigen - 66.8) * R(t, tJob - 0.2, tJob + 2.2, ease.inOutCubic), einheit: " €", nk: 2, max: 999, team: "a", art: "voll", label: "EIGENANTEIL JOBTICKET", x: SICHER.mitte, y: 790, ein: v("pointe:Mit", 0.1), aus: v("schlusskarte:Ohne", 0.4), anker: "mitte" });
  M.titel({ woerter: [{ text: "DEUTSCHLANDTICKET", ein: -0.3, art: "klein" }, { umbruch: true }, { text: "2023", ein: -0.3, team: "a" }, { text: "vs", art: "vs", ein: -0.3 }, { text: "2027", ein: -0.3, team: "b" }, { umbruch: true }, { text: "WER ARBEITET LÄNGER?", ein: -0.3, art: "klein" }], y: 470, groesse: 112, aus: T("regeln:Gemessen") - 0.5 });
  M.pointe({ woerter: [{ text: "OHNE JOBTICKET", ein: T("schlusskarte:Ohne"), farbe: "akzent" }, { umbruch: true }, { text: "MEHR ARBEIT", ein: T("schlusskarte:mehr"), farbe: "b" }, { umbruch: true }, { text: "ALS 2023.", ein: T("schlusskarte:Arbeit"), farbe: "akzent" }], ein: T("schlusskarte:Ohne"), y: 470, groesse: 88 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse ----------
  const evs = [];
  const ev = (t, klang, text) => { evs.push(t); M.melde({ t, typ: "welt", klang, text }); };
  PA.forEach((k) => ev(T(k), "pop", "Zylinder links leuchtet, Lichtkegel pulsiert"));
  PB.forEach((k) => ev(T(k), "pop", "Zylinder rechts leuchtet, Lichtkegel pulsiert"));
  PU.forEach((k) => ev(T(k), "klick", "Röhrchen leuchtet, Kamera gleitet"));
  ev(0.4, "pop", "Zylinder leuchten auf, Kamera schiebt sich heran");
  ev(tF0, "wachsen", "beide Zylinder füllen sich mit 245 Minuten Arbeitszeit");
  ev(tY24, "whoosh", "Referenzlinie 2023 leuchtet am rechten Zylinder auf"); ev(tL24, "whoosh", "rechter Zylinder sinkt auf 3 Std. 57 Min.");
  ev(tP25, "ding", "rechter Zylinder steigt auf 4 Std. 32 Min., Funken, Zoom"); ev(tVa, "ding", "Röhrchen füllt sich: Unterschied");
  ev(tY26, "whoosh", "2026: Zylinder fast gleich"); ev(tL27, "whoosh", "Januar 2027: rechter Zylinder steigt");
  ev(tErg, "ding", "Endstand-Karte, Zoom"); ev(T("ergebnis:86,20"), "ding", "86,20 € im Jahr leuchtet");
  ev(tWarum, "whoosh", "Erklärgrafik Warum"); ev(tJob, "whoosh", "Jobticket: rechter Zylinder sinkt unter die Referenzlinie, Funken");
  ev(T("schlusskarte:Ohne"), "akzent", "Welt dunkelt ab, Schlusskarte"); ev(T("schlusskarte:Arbeit"), "akzent", "2023 leuchtet");
  const sortiert = evs.slice().sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Bläschen steigen im Lichtkegel"); }
    last = nxt;
  }

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); };
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich || "raum" });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
