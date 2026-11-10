// „Benzin: Wie viel Steuer auf Steuer zahlst du pro Tankfüllung?“ · Stil 17 Nachtstadt-Miniatur (Tankstelle bei Nacht), Simulierbar 11.11.2026 abend, Lernvideo.
// Links steht die Glassäule eines Liters Benzin in Schichten (Benzin · Energiesteuer türkis · CO2-Preis violett); darüber legt sich je eine dünne goldene
// Schicht = Mehrwertsteuer auf diese Steuer (Steuer auf Steuer). Rechts die Zapfsäule unter dem Tankstellendach: Liter für Liter wächst Tankanzeige und
// Gold-Säule, die Euro-Zahl läuft mit. Maßstab der Schichten = Cent je Liter (Rechnung: pipeline/sim/benzin_steuer.mjs).
// Alle Zeiten kommen aus audio/timing.json (Wortzeiten, Untertitel) und audio/sprechwoerter.json (gesprochene Wörter). Alles ist eine reine Funktion von t.
import * as THREE from "three";
import { SimBuehne, GRADING, rigNacht, dunst, lichtKegel, staub, buendeln, aktualisiere, spiegelBoden, leuchtMat } from "../../engine/sim_atmosphaere.js";
import { gebaeude, strassenBoden, laterne, autoNacht, skyline, himmelNacht, preisAnhaenger, kostenSaeule } from "../../engine/stil_nachtstadt.js";
import { zapfSaeule } from "../../engine/stil_nachtstadt_auto.js";
import { Zeitplan } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab, SICHER } from "../../engine/massstab.js";
import { Regie } from "../../engine/regie.js";
import { ease, clamp, lerp, fortschritt, hash } from "../../engine/bewegung.js";
import { videoZahlen } from "../../sim/benzin_steuer.mjs";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0;
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;
const lade = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };

// Teamfarben (überall gleich: Schichten, Licht, Tafel, Chips, Untertitel-Schlüsselwörter). Nie Gelb. Gold = nur Akzent der Steuer-auf-Steuer-Schicht.
const TUERKIS = "#22C6D6"; // Energiesteuer
const VIOLETT = "#A06BFF"; // CO2-Preis
const GOLD = "#F2B63C";    // Steuer auf Steuer (Akzent)
const STAHL = "#8E9BB3";   // Benzin (neutral, ohne Zahl)
const ELFENBEIN = "#ECE6DA";

const Z = videoZahlen();
const de2 = (n) => n.toFixed(2).replace(".", ",");
const de1 = (n) => n.toFixed(1).replace(".", ",");
const glatt = (t, a, b) => ease.inOutSine(fortschritt(t, a, b));
const R = (t, a, b, e = ease.inOutSine) => e(fortschritt(t, a, b));
const puls = (t, ein, dauer, auf = 0.25, ab = 0.45) => fortschritt(t, ein, ein + auf) * (1 - glatt(t, ein + dauer, ein + dauer + ab));

// Maßstab der Säule: Meter je Cent (Cent je Liter aus der Rechnung)
const CT = { benzin: 80, energie: Z.energiesteuer, co2: Z.co2Ct, g1: Z.mwstEnergieCt, g2: Z.mwstCo2Ct, rabatt: Z.anstiegCt };
const M_JE_CT = 1.6 / (CT.benzin + CT.energie + CT.co2 + CT.g1 + CT.g2);
const HOEHE = { benzin: CT.benzin * M_JE_CT, energie: CT.energie * M_JE_CT, co2: CT.co2 * M_JE_CT, g1: CT.g1 * M_JE_CT, g2: CT.g2 * M_JE_CT, rabatt: CT.rabatt * M_JE_CT };
const SOCKEL = 0.05;
const XC = -1.6;          // Glassäule
const XP = 0.55;           // Zapfsäule
const XG = 1.62;          // Tankanzeige
const XGOLD = 1.12;       // Gold-Säule

/** Glasrahmen: vier Kanten, Boden- und Kopfplatte, Teilstriche */
function glasRahmen({ breite, hoehe, farbe = "#BFD0EE" }) {
  const g = new THREE.Group();
  const kante = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(breite, hoehe, breite)), new THREE.LineBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(1.7), transparent: true, opacity: 0.85 }));
  kante.position.y = SOCKEL + hoehe / 2; g.add(kante);
  const scheibe = new THREE.Mesh(new THREE.BoxGeometry(breite, hoehe, breite), new THREE.MeshStandardMaterial({ color: "#9FB8E8", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.07, depthWrite: false, envMapIntensity: 1.4 }));
  scheibe.position.y = SOCKEL + hoehe / 2; scheibe.renderOrder = 6; g.add(scheibe);
  const metall = new THREE.MeshStandardMaterial({ color: "#2B313D", roughness: 0.4, metalness: 0.7 });
  const sockel = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.16, SOCKEL, breite + 0.16), metall); sockel.position.y = SOCKEL / 2; sockel.castShadow = true; sockel.receiveShadow = true; g.add(sockel);
  const kopf = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.06, 0.03, breite + 0.06), metall); kopf.position.y = SOCKEL + hoehe + 0.015; g.add(kopf);
  const led = leuchtMat(farbe, 1.4, { neu: true });
  const band = new THREE.Mesh(new THREE.BoxGeometry(breite + 0.17, 0.012, 0.012), led); band.position.set(0, SOCKEL * 0.7, (breite + 0.16) / 2); g.add(band);
  g.userData.led = led;
  g.led = (k) => led.color.set(farbe).multiplyScalar(1.2 + 2.2 * k);
  g.userData.dynamisch = true; g.traverse((o) => { o.userData.dynamisch = true; });
  return g;
}

async function start() {
  const skript = await lade("skript.json");
  const timing = await lade("audio/timing.json");
  const sprech = await lade("audio/sprechwoerter.json");
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.6 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;
  // gesprochenes Wort (ohne Satzzeichen, Kleinschreibung) → Startzeit; nr = n-ter Treffer im Segment
  const nrm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const S = (seg, wort, nr = 1) => { let n = 0; for (const w of sprech[seg]) if (nrm(w.wort) === nrm(wort) && ++n === nr) return w.start; throw new Error(`Gesprochenes Wort „${wort}“ #${nr} nicht in „${seg}“`); };
  const SE = (seg, wort, nr = 1) => { let n = 0; for (const w of sprech[seg]) if (nrm(w.wort) === nrm(wort) && ++n === nr) return w.ende; throw new Error(`Gesprochenes Wort „${wort}“ #${nr} nicht in „${seg}“`); };

  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: false });
  await Promise.all(["800 40px 'SB Display'", "700 27px 'SB Text'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  const M = new Massstab(hud, zp, {
    teams: {
      a: { name: "MWST·ENERGIE", farbe: TUERKIS, woerter: ["Energiesteuer*", "65*", "12*", "Zuerst*"] },
      b: { name: "MWST·CO₂", farbe: VIOLETT, woerter: ["Kohlendioxid*", "16*", "3"] },
    },
    akzent: ELFENBEIN, tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8",
  });

  // ---------- Anker an gesprochenen Wörtern ----------
  const A = {
    hSteuer: S("hook", "Steuer"), hWie: S("hook", "Wie"), hDavon: S("hook", "davon"), hTank: S("hook", "Tankfüllung"),
    rGer: S("regeln", "Gerechnet"), r50: S("regeln", "fünfzig"), rSuper: S("regeln", "Super"), rSaetze: S("regeln", "Steuersätze"), rJan: S("regeln", "Januar"),
    fKlar: S("falle", "Klar"), fMwst: S("falle", "Mehrwertsteuer"), fBenzin: S("falle", "Benzin"), fOder: S("falle", "Oder"), fDoch: S("falle", "doch"),
    w1Zuerst: S("wendung1", "Zuerst"), w1Energie: S("wendung1", "Energiesteuer"), w165: S("wendung1", "fünfundsechzig"), w1Auf: S("wendung1", "Auf"), w119: S("wendung1", "neunzehn"), w1Mwst: S("wendung1", "Mehrwertsteuer"), w1Das: S("wendung1", "Das"), w112: S("wendung1", "zwölf"), w1Cent: S("wendung1", "Cent", 2),
    w2Dann: S("wendung2", "Dann"), w2Co2: S("wendung2", "Kohlendioxidpreis"), w216: S("wendung2", "sechzehn"), w2Auch: S("wendung2", "Auch"), w2Mwst: S("wendung2", "Mehrwertsteuer"), w23: S("wendung2", "drei"), w2Noch: S("wendung2", "Noch"), w2Rabatt: S("wendung2", "Tankrabatt"), w2Was: S("wendung2", "Was"), w2Endet: S("wendung2", "endet"),
    nZus: S("rennen", "Zusammen"), n15: S("rennen", "fünfzehn"), nZapf: S("rennen", "Zapfsäule"), nLiter: S("rennen", "Liter", 2), n10: S("rennen", "zehn"), nEin: S("rennen", "eineinhalb"), n30: S("rennen", "dreißig"), nVier: S("rennen", "vier"), nQuitt: S("rennen", "Quittung"), nZeile: S("rennen", "Zeile"),
    k40: S("kipp", "vierzig"), kSechs: S("kipp", "sechs"), kTank: S("kipp", "Tank"), kVoll: S("kipp", "voll"),
    e50: S("ergebnis", "fünfzig"), eSieben: S("ergebnis", "sieben"), eSiebzig: S("ergebnis", "siebzig"), eBei2: S("ergebnis", "Bei", 2), e1000: S("ergebnis", "tausend"), eJahr: S("ergebnis", "Jahr"), e154: S("ergebnis", "hundertvierundfünfzig"),
    wDenn: S("warum", "Denn"), wMwst: S("warum", "Mehrwertsteuer"), wRechnet: S("warum", "rechnet"), wAuf: S("warum", "auf"), wGanzen: S("warum", "ganzen"), wPreis: S("warum", "Preis"),
    pEndet: S("pointe", "Endet"), pRabatt: S("pointe", "Tankrabatt"), p31: S("pointe", "einunddreißigsten"), pSteigt: S("pointe", "steigt"), pRund: S("pointe", "Rund"), p27: S("pointe", "siebenundzwanzig"), pOhne: S("pointe", "ohne"),
    sSteuer: S("schlusskarte", "Steuer"), sRund: S("schlusskarte", "rund"), s154: S("schlusskarte", "hundertvierundfünfzig"), sJahr: S("schlusskarte", "Jahr"),
  };

  // ---------- Verläufe ----------
  const SS = Z.roh.ssCt / 100;                           // € Steuer auf Steuer je Liter
  const hBenzin = (t) => HOEHE.benzin * R(t, 0.4, 3.4, ease.outCubic);
  const hEnergie = (t) => HOEHE.energie * R(t, A.w1Energie + 0.1, A.w165 + 1.0, ease.inOutCubic);
  const hG1 = (t) => (HOEHE.g1 - HOEHE.rabatt) * R(t, A.w119 - 0.3, A.w1Mwst + 0.9, ease.inOutCubic);
  const hG1Top = (t) => HOEHE.rabatt * R(t, A.w1Mwst + 0.5, A.w112 + 0.3, ease.inOutCubic);
  const hCo2 = (t) => HOEHE.co2 * R(t, A.w2Co2 + 0.1, A.w216 + 0.6, ease.inOutCubic);
  const hG2 = (t) => HOEHE.g2 * R(t, A.w2Mwst + 0.2, A.w23 + 0.5, ease.inOutCubic);
  // Liter an der Zapfsäule: Haltepunkte bei 10, 30, 40 und 50 genau auf den gesprochenen Zahlen
  const lAnf = A.nZapf + 0.5;
  const Lpump = (t) => {
    if (t < lAnf) return 0;
    let v = 10 * R(t, lAnf, A.n10 + 0.05, ease.inOutSine);
    v += 20 * R(t, A.n10 + 0.95, A.n30 + 0.05, ease.inOutSine);
    v += 10 * R(t, A.nQuitt + 0.1, A.k40 + 0.05, ease.inOutSine);
    v += 10 * R(t, A.kSechs + 0.5, A.e50 + 0.05, ease.inOutSine);
    return v;
  };
  const Lclock = (t) => (t < A.nLiter - 0.5 ? R(t, 0.4, 3.4, ease.outCubic) : Lpump(t));
  const ez1 = (t) => (Z.roh.mwstEnergie / 100) * R(t, A.w112 - 0.6, A.w112 + 0.55) + (Z.roh.mwstCo2 / 100) * R(t, A.w23 - 0.35, A.w23 + 0.6);
  const ezTank = (t) => SS * Lpump(t);
  const eJahrW = (t) => Z.l50 + (Z.jahr - Z.l50) * R(t, A.e1000 + 0.9, A.e154 + 0.05, ease.inOutSine);
  const tankL = (t) => Lpump(t);

  // ---------- Welt ----------
  const szene = new THREE.Scene();
  szene.background = himmelNacht();
  dunst(szene, "#0E1522", 0.05);
  const rig = rigNacht(szene, buehne.renderer, { ziel: [0, 0, 0], bereich: 9, schatten: SCHATTEN, richtung: [-0.5, 0.9, 0.8], farbe: "#A9C4F2", staerke: 0.8, umgebungsStaerke: 0.8, himmelStaerke: 0.5 });
  const boden = strassenBoden({ breite: 40, tiefe: 40, strassen: [{ z: -4.4, richtung: "x", breite: 3.0 }], aufloesung: 2048, seed: 6 });
  szene.add(boden);
  // Vorplatz: dunkler nasser Asphalt, verbunden mit der Straße
  const vorplatz = new THREE.Mesh(new THREE.PlaneGeometry(13, 7.4), new THREE.MeshStandardMaterial({ color: "#1B1E25", roughness: 0.5, metalness: 0.05 }));
  vorplatz.rotation.x = -Math.PI / 2; vorplatz.position.set(0, 0.004, 0.9); vorplatz.receiveShadow = true; szene.add(vorplatz);
  szene.add(spiegelBoden({ breite: 13, tiefe: 7.4, staerke: 0.95, pfuetze: 0.5, streckung: 3.0, massstab: 0.35, aufloesung: 0.22 }).translateZ(0.9).translateY(0.006));
  const him = skyline({ anzahl: 46, radius: 34, bogen: [Math.PI * 1.02, Math.PI * 1.98], mitte: [0, 0] });
  him.userData.dynamisch = true; szene.add(him);
  // Häuserzeilen hinter der Straße
  let n = 0;
  for (let reihe = 0; reihe < 2; reihe++) {
    let x = -15;
    while (x < 15) {
      const bb = 1.4 + hash(n, 3) * 1.4 + (reihe ? 0.6 : 0);
      const tt = reihe ? 2.4 + hash(n, 7) * 1.4 : 1.5 + hash(n, 11) * 0.9;
      const h = reihe === 0 ? 0.9 + hash(n * 3 + 1, 5) * 1.3 : 2.6 + Math.pow(hash(n * 3 + 2, 5), 1.3) * 5.6;
      const zm = -7.6 - (reihe ? 2.5 + tt / 2 : tt / 2);
      const g = gebaeude({ breite: bb, hoehe: h, tiefe: tt, seed: n * 2 + 1, anteilAn: 0.14 + hash(n, 9) * 0.16, leuchten: 1.6, fassade: ["#2B313D", "#30343B", "#262C38", "#363A42"][n % 4], laden: false, warnlicht: h > 5.5, schatten: true });
      g.position.set(x + bb / 2, 0, zm); szene.add(g);
      x += bb + 0.05; n++;
    }
  }
  // Laternen an der Straße (Ausleger zur Straße) und eine hohe Leuchte am Vorplatz
  for (let x = -12; x <= 12; x += 3.4) {
    const l = laterne({ hoehe: 1.45, arm: 0.34, pfuetze: 0.9, kegel: 0.12 });
    l.position.set(x, 0, -2.75); l.rotation.y = Math.PI / 2; szene.add(l);
  }
  // Insel mit Zapfsäule unter dem Dach
  const insel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 1.3), new THREE.MeshStandardMaterial({ color: "#3A3F48", roughness: 0.85 }));
  insel.position.set(XP, 0.035, 0); insel.receiveShadow = true; szene.add(insel);
  const pumpe = zapfSaeule({ farbe: "#116673", dach: true });
  pumpe.rotation.y = -Math.PI / 2; pumpe.position.set(XP, 0.04, 0); szene.add(pumpe);
  pumpe.traverse((o) => { if (o.material && o.material.uniforms && o.material.uniforms.staerke) { o.material = o.material.clone(); o.material.uniforms.staerke.value *= 0.4; } });
  // Anzeige an der Zapfsäule (Canvas-Text): Liter und Euro
  const cv = document.createElement("canvas"); cv.width = 300; cv.height = 240;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const anzeigeMat = new THREE.MeshBasicMaterial({ map: tex, fog: false, toneMapped: false, color: new THREE.Color(0.7, 0.7, 0.7) });
  const anzeige = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.16), anzeigeMat);
  anzeige.rotation.y = Math.PI / 2; anzeige.position.set(0.113, 0.04 + 0.55 + 0.0, 0); anzeige.userData.dynamisch = true; pumpe.add(anzeige);
  let anzeigeText = "";
  const malAnzeige = (l, e, an) => {
    const txt = `${l}|${e}|${an}`; if (txt === anzeigeText) return; anzeigeText = txt;
    const x = cv.getContext("2d");
    x.fillStyle = "#0A1218"; x.fillRect(0, 0, 300, 240);
    x.fillStyle = "#7FE8F0"; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = "800 30px 'SB Text', sans-serif"; x.fillText("LITER", 150, 34);
    x.font = "800 88px 'SB Display', sans-serif"; x.fillText(l, 150, 96);
    x.fillStyle = an ? GOLD : "#5C6E78";
    x.font = "800 26px 'SB Text', sans-serif"; x.fillText("STEUER AUF STEUER", 150, 160);
    x.font = "800 56px 'SB Display', sans-serif"; x.fillText(e, 150, 206);
    tex.needsUpdate = true;
  };
  // Autos auf der Straße (zeitgesteuert, Schleife über x)
  const autoL = autoNacht({ farbe: "#3A4660", laenge: 0.9 }), autoR = autoNacht({ farbe: "#4A3A3A", laenge: 0.9 });
  autoL.userData.dynamisch = autoR.userData.dynamisch = true;
  szene.add(autoL, autoR);
  // Glassäule mit Schichten
  const HT = HOEHE.benzin + HOEHE.energie + HOEHE.g1 + HOEHE.co2 + HOEHE.g2;
  const rahmen = glasRahmen({ breite: 0.42, hoehe: HT + 0.05 });
  rahmen.position.set(XC, 0, 0); szene.add(rahmen);
  const dunkel = (f, k = 0.5) => "#" + new THREE.Color(f).multiplyScalar(k).getHexString();
  const schicht = (farbe, deck = 0.8, kante = 1.5, tick = 0) => { const s = kostenSaeule({ breite: 0.38, farbe: dunkel(farbe), tick, deckkraft: deck, kante }); s.position.x = XC; s.userData.dynamisch = true; s.traverse((o) => { o.userData.dynamisch = true; }); szene.add(s); return s; };
  const sBenzin = schicht(STAHL, 0.7, 1.2), sEnergie = schicht(TUERKIS, 0.8, 1.5), sG1 = schicht(GOLD, 0.9, 1.7), sG1T = schicht(GOLD, 0.9, 2.0), sCo2 = schicht(VIOLETT, 0.8, 1.5), sG2 = schicht(GOLD, 0.95, 2.0);
  // Etiketten an der Säule
  const tag = (txt, farbe, breite = 1.0, hoehe = 0.2) => { const p = preisAnhaenger({ breite, hoehe, farbe }); p.text(txt); p.userData.dynamisch = true; p.traverse((o) => { o.userData.dynamisch = true; }); szene.add(p); return p; };
  const tagEnergie = tag("ENERGIE", TUERKIS, 0.42, 0.12), tagG1 = tag("MWST", GOLD, 0.34, 0.12), tagCo2 = tag("CO₂", VIOLETT, 0.34, 0.12), tagG2 = tag("MWST", GOLD, 0.34, 0.12);
  const tagRabatt = tag("RABATT −14,04", GOLD, 0.66, 0.15), tagKal = tag("31.12.2026", ELFENBEIN, 0.56, 0.15);
  // Mehrwertsteuer-Rahmen um alle Schichten (Warum)
  const mwstRahmen = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.5, HT + 0.14, 0.5)), new THREE.LineBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(2.6), transparent: true, opacity: 0 }));
  mwstRahmen.position.set(XC, SOCKEL + (HT + 0.14) / 2 - 0.02, 0); mwstRahmen.userData.dynamisch = true; szene.add(mwstRahmen);
  // Tankanzeige und Gold-Säule an der Zapfsäule
  const HG = 1.0;
  const gaugeRahmen = glasRahmen({ breite: 0.34, hoehe: HG + 0.04, farbe: "#9FB4D8" }); gaugeRahmen.position.set(XG, 0, 0); szene.add(gaugeRahmen);
  const sTank = kostenSaeule({ breite: 0.3, farbe: dunkel(STAHL, 0.35), tick: HG / 5, deckkraft: 0.5, kante: 2.0 }); sTank.position.set(XG, 0, 0); sTank.userData.dynamisch = true; szene.add(sTank); sTank.traverse((o) => { o.userData.dynamisch = true; });
  const sGold = kostenSaeule({ breite: 0.2, farbe: dunkel(GOLD), tick: 0, deckkraft: 0.8, kante: 3.2 }); sGold.position.set(XGOLD, 0, 0.1); sGold.userData.dynamisch = true; szene.add(sGold); sGold.traverse((o) => { o.userData.dynamisch = true; });
  const tagTank = tag("0 L", STAHL, 0.36, 0.12);
  // 20 Tankfüllungen = ein Jahr: goldene Platten
  const platten = [];
  const plMat = new THREE.MeshStandardMaterial({ color: GOLD, emissive: GOLD, emissiveIntensity: 0.9, roughness: 0.35, metalness: 0.6, transparent: true });
  for (let i = 0; i < 20; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.09), plMat);
    const r2 = Math.floor(i / 10), c = i % 10;
    p.position.set(0.2 + c * 0.17, 0.025, 1.3 + r2 * 0.18); p.userData.dynamisch = true; p.visible = false; szene.add(p); platten.push(p);
  }
  // Licht: Spot auf die Säule, Dachlicht an der Zapfsäule, Wärmelicht fürs Ende
  const spotC = new THREE.PointLight("#CFE0FF", 0, 0, 2); spotC.position.set(XC + 0.3, 2.3, 1.6); szene.add(spotC);
  const spotP = new THREE.PointLight("#FFD6A8", 0, 0, 2); spotP.position.set(XP + 0.2, 1.4, 1.2); szene.add(spotP);
  const kegelC = lichtKegel({ hoehe: 2.9, radiusOben: 0.08, radiusUnten: 0.75, farbe: "#BFD6FF", staerke: 0.1, streifen: 0.2 }); kegelC.material = kegelC.material.clone(); kegelC.position.set(XC, 2.95, 0); kegelC.userData.dynamisch = true; szene.add(kegelC);
  const nebel = staub({ anzahl: 260, bereich: [9, 4.5, 8], mitte: [-0.2, 2.0, 0.5], farbe: "#9FB4D8", groesse: 0.018, staerke: 1.0, aussen: 1, tempo: -0.08, seed: 11 });
  nebel.userData.dynamisch = true; szene.add(nebel);
  const statistik = buendeln(szene);
  if (Q.has("statistik")) console.warn("buendeln", JSON.stringify(statistik));

  // ---------- Kamera ----------
  const kamera = new THREE.PerspectiveCamera(36, 1080 / 1920, 0.1, 220);
  const sh = (t, pos, ziel, fov = 36) => ({ t, pos, ziel, fov });
  const C = XC;
  const SH = [
    sh(0, [C + 0.9, 2.3, 6.6], [C + 0.35, 1.4, 0], 36),
    sh(A.hWie, [C + 0.6, 2.1, 6.0], [C + 0.35, 1.4, 0], 36),
    sh(A.hTank, [C + 0.2, 1.9, 5.8], [C + 0.35, 1.4, 0], 36),
    sh(A.rGer, [C + 0.9, 2.0, 6.2], [C + 0.35, 1.4, 0], 36),
    sh(A.rSuper, [C - 0.2, 1.9, 5.8], [C + 0.35, 1.4, 0], 36),
    sh(A.fKlar - 0.1, [C + 0.5, 1.2, 4.6], [C + 0.3, 0.9, 0], 34),
    sh(A.fOder, [C + 0.7, 1.8, 6.0], [C + 0.35, 1.4, 0], 36),
    sh(A.w1Zuerst, [C - 0.3, 1.7, 5.6], [C + 0.35, 1.4, 0], 36),
    sh(A.w1Auf - 0.2, [C + 0.5, 2.0, 5.0], [C + 0.3, 1.6, 0], 34),
    sh(A.w112, [C + 0.2, 2.1, 4.6], [C + 0.3, 1.7, 0], 33),
    sh(A.w2Dann, [C + 0.7, 2.1, 5.8], [C + 0.35, 1.55, 0], 36),
    sh(A.w216, [C - 0.2, 2.2, 5.0], [C + 0.3, 1.8, 0], 34),
    sh(A.w23, [C + 0.4, 2.3, 4.4], [C + 0.3, 1.95, 0], 32),
    sh(A.w2Noch, [C - 0.5, 1.9, 5.4], [C + 0.2, 1.5, 0], 35),
    sh(A.w2Was, [C + 0.5, 2.1, 6.4], [C + 0.35, 1.5, 0], 36),
    sh(A.nZus, [C + 0.9, 2.2, 6.2], [C + 0.35, 1.5, 0], 36),
    sh(A.n15 + 0.8, [-0.2, 2.0, 7.0], [-0.3, 1.2, 0], 37),
    sh(A.nZapf, [1.5, 1.1, 5.6], [1.05, 0.85, 0], 36),
    sh(A.nLiter, [0.8, 0.95, 3.4], [XP + 0.15, 0.7, 0], 34),
    sh(A.n10, [1.4, 1.0, 5.0], [1.05, 0.8, 0], 35),
    sh(A.nEin, [0.9, 1.15, 5.2], [1.1, 0.85, 0], 36),
    sh(A.n30, [1.5, 1.0, 4.8], [1.1, 0.8, 0], 34),
    sh(A.nQuitt, [0.8, 0.95, 3.6], [XP + 0.2, 0.7, 0], 35),
    sh(A.k40 - 0.2, [1.5, 1.0, 4.8], [1.2, 0.8, 0], 34),
    sh(A.kTank, [1.9, 0.95, 4.0], [1.45, 0.8, 0], 33),
    sh(A.e50 - 0.1, [1.1, 1.15, 5.2], [1.1, 0.85, 0], 36),
    sh(A.eSieben, [1.4, 1.0, 4.4], [1.15, 0.65, 0.1], 34),
    sh(A.e1000 - 0.1, [1.0, 2.0, 5.0], [1.0, 0.4, 0.8], 35),
    sh(A.e154, [1.0, 2.6, 5.8], [1.0, 0.3, 1.0], 36),
    sh(A.wDenn - 0.2, [C + 0.9, 2.1, 6.4], [C + 0.35, 1.4, 0], 36),
    sh(A.wGanzen, [C + 0.2, 1.8, 5.0], [C + 0.3, 1.3, 0], 34),
    sh(A.pEndet, [C + 0.8, 2.1, 5.8], [C + 0.35, 1.5, 0], 36),
    sh(A.pSteigt, [C - 0.3, 2.2, 4.6], [C + 0.3, 1.8, 0], 33),
    sh(A.pRund, [C + 0.5, 2.1, 5.6], [C + 0.35, 1.5, 0], 36),
    sh(A.sSteuer - 0.3, [C + 1.0, 2.3, 7.0], [C + 0.3, 1.3, 0], 36),
    sh(DAUER, [C + 1.3, 2.5, 7.8], [C + 0.2, 1.2, 0], 37),
  ];
  const kameraBasis = (t) => {
    let i = 0;
    while (i < SH.length - 1 && t > SH[i + 1].t) i++;
    const a = SH[i], b = SH[Math.min(i + 1, SH.length - 1)];
    const p = a === b ? 1 : ease.inOutSine(fortschritt(t, a.t, b.t));
    const mix = (u, v) => [lerp(u[0], v[0], p), lerp(u[1], v[1], p), lerp(u[2], v[2], p)];
    const ziel = mix(a.ziel, b.ziel), pos = mix(a.pos, b.pos), K = 1;
    return { pos: pos.map((x, j) => ziel[j] + (x - ziel[j]) * K), ziel, fov: lerp(a.fov, b.fov, p) };
  };
  const regie = new Regie(kamera, kameraBasis, { zp });
  regie.atmen({ staerke: 0.012, tempo: 0.28 });
  regie.zoom({ t: A.w112, ziel: () => [XC, SOCKEL + HOEHE.benzin + HOEHE.energie + HOEHE.g1 * 0.5, 0], staerke: 0.18, halt: 1.2, rueck: 0.6 });
  regie.zoom({ t: A.w23, ziel: () => [XC, SOCKEL + HT - 0.05, 0], staerke: 0.2, halt: 1.2, rueck: 0.6 });
  regie.zoom({ t: A.w2Rabatt, ziel: () => [XC - 0.3, 1.15, 0], staerke: 0.16, halt: 1.2, rueck: 0.6 });
  regie.zoom({ t: A.eSiebzig - 0.3, ziel: () => [XGOLD, 0.45, 0.1], staerke: 0.2, halt: 1.2, rueck: 0.7 });
  regie.zoom({ t: A.pSteigt, ziel: () => [XC, 1.5, 0], staerke: 0.2, halt: 1.3, rueck: 0.7 });

  // ---------- Zustand auf die Welt anwenden ----------
  const post = { ...GRADING.nacht, belichtung: 1.2, bloomStaerke: 0.6, bloomSchwelle: 1.25, tiltMitte: 0.5, tiltBreite: 0.5, tiltStaerke: 0.12, vignette: 0.36, strahlen: 0.12, strahlenSchwelle: 1.3, strahlenLaenge: 0.7, strahlenAbfall: 0.96, strahlenFarbe: [1, 0.85, 0.7], strahlenPunkt: [-1.6, 4, -4] };
  const moon = rig.mond;
  const bis = (x, a, b) => clamp((x - a) / (b - a));
  const tagAn = (p, x, y, s) => { p.visible = s > 0.01; p.position.set(x, y, 0.24); p.setze(s); };
  const welt = {
    szene, kamera, post,
    update(t) {
      aktualisiere(t);
      // Schichten stapeln sich auf die vollständigen Höhen darunter
      const b = hBenzin(t), e = hEnergie(t), g1 = hG1(t), g1t = hG1Top(t), c = hCo2(t), g2 = hG2(t);
      const y0 = SOCKEL;
      const stap = [[sBenzin, y0, b], [sEnergie, y0 + HOEHE.benzin, e], [sG1, y0 + HOEHE.benzin + HOEHE.energie, g1], [sG1T, y0 + HOEHE.benzin + HOEHE.energie + (HOEHE.g1 - HOEHE.rabatt), g1t], [sCo2, y0 + HOEHE.benzin + HOEHE.energie + HOEHE.g1, c], [sG2, y0 + HOEHE.benzin + HOEHE.energie + HOEHE.g1 + HOEHE.co2, g2]];
      const rb = glatt(t, A.w2Rabatt - 0.1, A.w2Rabatt + 0.6) * (1 - glatt(t, A.pRabatt, A.pRabatt + 0.5));
      const gp = puls(t, A.n15, 1.8) + puls(t, A.pSteigt, 2.2) + puls(t, A.e154, 1.6) + 0.8 * puls(t, A.w112, 1.4) + 0.8 * puls(t, A.w23, 1.4);
      stap.forEach(([s, y, h], i) => { s.position.y = y; s.hoehe(Math.max(h, 1e-4)); s.setze(h > 0.002 ? 1 : 0); });
      sG1T.setze(h1Sichtbar(g1t, rb)); sG1T.puls(1.2 * puls(t, A.pSteigt - 0.2, 2.4) + 0.3 * gp);
      sG1.puls(0.3 * gp); sG2.puls(0.4 * gp); sEnergie.puls(0.5 * puls(t, A.w1Energie, 1.6)); sCo2.puls(0.5 * puls(t, A.w2Co2, 1.6)); sBenzin.puls(0.4 * puls(t, A.fKlar, 1.4));
      rahmen.led(0.4 + 0.5 * puls(t, A.hSteuer, 1.4) + 0.5 * puls(t, A.w112, 1.5));
      // Etiketten
      const yT = (h) => SOCKEL + h;
      tagAn(tagEnergie, XC + 0.42, yT(HOEHE.benzin + HOEHE.energie * 0.55), glatt(t, A.w1Energie, A.w1Energie + 0.5) * (1 - glatt(t, A.w2Dann - 0.1, A.w2Dann + 0.4)));
      tagAn(tagG1, XC + 0.38, yT(HOEHE.benzin + HOEHE.energie + HOEHE.g1 * 0.5), glatt(t, A.w119, A.w119 + 0.5) * (1 - glatt(t, A.w2Dann - 0.1, A.w2Dann + 0.4)));
      tagAn(tagCo2, XC + 0.38, yT(HOEHE.benzin + HOEHE.energie + HOEHE.g1 + HOEHE.co2 * 0.5), glatt(t, A.w2Co2, A.w2Co2 + 0.5) * (1 - glatt(t, A.nZus - 0.1, A.nZus + 0.4)));
      tagAn(tagG2, XC + 0.38, yT(HOEHE.benzin + HOEHE.energie + HOEHE.g1 + HOEHE.co2 + HOEHE.g2) + 0.12, glatt(t, A.w2Mwst, A.w2Mwst + 0.5) * (1 - glatt(t, A.nZus - 0.1, A.nZus + 0.4)));
      const fallen = glatt(t, A.pRabatt + 0.3, A.pRabatt + 1.4);
      tagAn(tagRabatt, XC + 0.55, yT(HOEHE.benzin + HOEHE.energie * 0.8) - 1.0 * fallen, rb * (1 - fallen));
      const kalFlip = t < A.p31 + 0.1 ? "31.12.2026" : "01.01.2027";
      tagKal.text(kalFlip);
      tagAn(tagKal, XC, yT(HT) + 0.2, glatt(t, A.pEndet + 0.3, A.pEndet + 0.9) * (1 - glatt(t, A.p27 + 0.5, A.p27 + 1.1)));
      // Mehrwertsteuer-Rahmen
      mwstRahmen.material.opacity = glatt(t, A.wMwst - 0.1, A.wMwst + 0.4) * (1 - glatt(t, A.pEndet - 0.2, A.pEndet + 0.4)) * (0.65 + 0.35 * puls(t, A.wGanzen, 1.0));
      // Zapfsäule: Anzeige, Tankanzeige, Gold-Säule, Platten
      const L = tankL(t), E = ezTank(t);
      const tankAn = glatt(t, A.nZapf, A.nZapf + 0.6);
      const eAn = t >= A.nLiter - 0.5;
      malAnzeige(eAn ? de1(Lpump(t)) : "0,0", eAn ? de2(E < 0.005 ? 0 : (t > A.e1000 + 0.9 ? eJahrW(t) : E)) + " €" : "0,00 €", eAn);
      sTank.setze(tankAn); sTank.hoehe(Math.max((L / 50) * HG, 1e-4)); sTank.puls(0.3 * puls(t, A.n10, 1.0) + 0.3 * puls(t, A.n30, 1.0) + 0.5 * puls(t, A.k40, 1.2) + 0.7 * puls(t, A.kVoll, 1.4));
      gaugeRahmen.visible = tankAn > 0.01; gaugeRahmen.led(0.3 + 0.6 * puls(t, A.kVoll, 1.5));
      sGold.setze(tankAn); sGold.hoehe(Math.max(E * 0.065, 1e-4)); sGold.puls(0.5 * puls(t, A.n10, 0.9) + 0.5 * puls(t, A.n30, 0.9) + 0.9 * puls(t, A.eSiebzig, 1.6));
      tagAn(tagTank, XG, SOCKEL + (L / 50) * HG + 0.16, tankAn);
      tagTank.text(`${Math.round(L)} L`);
      platten.forEach((p, i) => { const s = glatt(t, A.e1000 + 0.2 + i * 0.1, A.e1000 + 0.55 + i * 0.1); p.visible = s > 0.01; p.scale.set(1, Math.max(0.01, s), 1); p.position.y = 0.02 + 0.03 * s; });
      plMat.emissiveIntensity = 0.8 + 0.9 * puls(t, A.e154, 1.6);
      // Autos
      const pos1 = ((t * 1.1 + 4) % 30) - 15, pos2 = 15 - ((t * 0.8 + 9) % 30);
      autoL.position.set(pos1, 0, -4.9); autoL.rotation.y = 0;
      autoR.position.set(pos2, 0, -3.9); autoR.rotation.y = Math.PI;
      // Lichtführung: Spot auf der Glassäule, nach dem Wechsel an der Zapfsäule
      const aufC = 1 - glatt(t, A.nZus + 0.6, A.nZapf + 0.2) * 0.65 + 0.65 * glatt(t, A.wDenn - 0.4, A.wDenn + 0.4) * (1 - glatt(t, A.wPreis + 0.5, A.pEndet - 0.2)) + 0.65 * glatt(t, A.pEndet - 0.2, A.pEndet + 0.3) * (1 - glatt(t, A.sSteuer - 0.5, A.sSteuer + 0.3));
      spotC.intensity = 3 * Math.max(0.35, Math.min(1.3, aufC));
      kegelC.material.uniforms.staerke.value = 0.1 * Math.max(0.3, Math.min(1.3, aufC));
      const aufP = 0.35 + 0.8 * glatt(t, A.nZus + 0.5, A.nZapf + 0.4) * (1 - glatt(t, A.wDenn - 0.4, A.wDenn + 0.3)) + 0.3 * puls(t, A.kVoll, 1.5) + 0.3 * puls(t, A.eSiebzig, 1.6);
      spotP.intensity = 3 * aufP;
      nebel.position.set(0, 0, 0);
      him.position.set(0, 0, 0);
      moon.target.position.set(XC, 0, 0); moon.position.set(-4, 7, 5); moon.target.updateMatrixWorld();
      // Nachbearbeitung: Strahlen und Glow steigen bis zum Kipp-Moment, danach Gold-Glow
      const spann = bis(t, A.w1Zuerst, A.k40);
      post.bloomStaerke = 0.6 + 0.25 * spann + 0.25 * puls(t, A.k40, 1.6) + 0.25 * puls(t, A.eSiebzig, 1.8) + 0.2 * puls(t, A.pSteigt, 1.8);
      post.strahlen = 0.1 + 0.3 * spann * (1 - bis(t, A.e50 + 1.0, A.wDenn)) + 0.12 * puls(t, A.k40, 1.8) + 0.15 * puls(t, A.pSteigt, 1.8);
      post.belichtung = 1.2 - 0.3 * bis(t, A.sSteuer - 0.2, A.sSteuer + 0.9) + 0.06 * puls(t, A.k40, 1.4);
      regie.anwenden(t);
    },
  };
  function h1Sichtbar(h, rabatt) { return h > 0.0005 ? 1 - 0.7 * rabatt : 0; }

  // ---------- HUD ----------
  M.tafel({
    y: 166, links: { team: "a", einheit: " ct", nk: 2, max: 99 }, rechts: { team: "b", einheit: " ct", nk: 2, max: 99 }, vorn: null,
    werte: (t) => ({ a: Z.mwstEnergieCt * R(t, A.w112 - 0.6, A.w112 + 0.55), b: Z.mwstCo2Ct * R(t, A.w23 - 0.35, A.w23 + 0.6) }),
    uhr: { ein: -1, zeit: (t) => Lclock(t), format: (v) => de1(v), label: "LITER" },
  });
  const chip = (text, ein, aus, team, art = "hell", y = 372) => M.chip({ text, ein, aus, team, art, x: SICHER.mitte, y, anker: "mitte" });
  const v = (x, d = 0.1) => x - d;
  // Statuszeile (mitlaufend, unter der Tafel)
  chip("1 LITER SUPER · ALLE ZAHLEN IN CENT", 0.4, A.w1Zuerst - 0.3, "akzent", "hell");
  chip("SCHRITT 1 · ENERGIESTEUER", A.w1Zuerst - 0.05, A.w2Dann - 0.3, "a", "voll");
  chip("SCHRITT 2 · CO₂-PREIS", A.w2Dann - 0.05, A.w2Noch - 0.35, "b", "voll");
  chip("TANKRABATT −14,04 CT/L · BIS 31.12.", v(A.w2Noch, 0.05), A.e50 + 0.1, "akzent", "voll");
  // Regeln (Chips während die Zähler laufen)
  chip("50 LITER SUPER", v(A.r50, 0.1), v(A.fKlar), "akzent", "voll", 490);
  chip("SÄTZE AB 01.01.2027", v(A.rSaetze, 0.05), v(A.fKlar), "akzent", "hell", 590);
  chip("CO₂ 65 €/T", A.rJan - 0.1, v(A.fKlar), "b", "voll", 710);
  chip("MWST 19 %", A.rJan + 0.25, v(A.fKlar), "a", "voll", 830);
  // Denkfalle
  chip("MWST NUR AUFS BENZIN?", v(A.fMwst, 0.0), v(A.w1Zuerst, 0.2), "akzent", "voll", 490);
  chip("ODER DOCH NICHT?", v(A.fOder, 0.0), v(A.w1Zuerst, 0.2), "akzent", "hell", 590);
  // Wendung 1: Energiesteuer
  chip("ENERGIESTEUER 65,45 CT/L", v(A.w165, 0.7), v(A.w2Dann, 0.3), "a", "voll", 490);
  chip("+ 19 % MWST = 12,44 CT/L", v(A.w119, 0.05), v(A.w2Dann, 0.3), "akzent", "hell", 590);
  // Wendung 2: CO2-Preis
  chip("CO₂-PREIS 15,56 CT/L", v(A.w2Co2, 0.0), v(A.w2Noch, 0.1), "b", "voll", 490);
  chip("+ 19 % MWST = 2,96 CT/L", v(A.w2Mwst, 0.0), v(A.w2Noch, 0.1), "akzent", "hell", 590);
  chip("WAS PASSIERT, WENN ER ENDET?", v(A.w2Was, 0.05), v(A.nZus, 0.2), "akzent", "voll", 490);
  // Zähler Euro
  M.zaehler({ wert: (t) => ez1(t), einheit: " €", nk: 2, max: 9, team: GOLD, art: "voll", label: "STEUER AUF STEUER · 1 L", x: SICHER.mitte, y: 1250, ein: 0, aus: A.nZapf - 0.45, anker: "mitte" });
  M.zaehler({ wert: (t) => ezTank(t), einheit: " €", nk: 2, max: 99, team: GOLD, art: "voll", label: "STEUER AUF STEUER · TANK", x: SICHER.mitte, y: 1250, ein: v(A.nZapf, 0.2), aus: v(A.e1000, 0.3), anker: "mitte" });
  M.zaehler({ wert: (t) => eJahrW(t), einheit: " €", nk: 2, max: 999, team: GOLD, art: "voll", label: "IM JAHR · 1.000 L", x: SICHER.mitte, y: 1250, ein: v(A.e1000, 0.1), aus: A.wDenn - 0.15, anker: "mitte" });
  // Rennen: Haltepunkte
  chip("GUT 15 CT PRO LITER", v(A.n15, 0.3), v(A.nZapf, 0.0), "akzent", "voll", 490);
  chip("10 LITER: 1,54 €", v(A.n10, 0.05), v(A.n30, 0.2), "akzent", "voll", 490);
  chip("30 LITER: 4,62 €", v(A.n30, 0.05), v(A.k40, 0.2), "akzent", "voll", 490);
  chip("KEINE EIGENE ZEILE", v(A.nQuitt, 0.05), v(A.k40, 0.2), "akzent", "hell", 590);
  // Kipp
  chip("40 LITER: 6,16 €", v(A.k40, 0.05), v(A.e50, 0.2), "akzent", "voll", 490);
  chip("DER TANK IST FAST VOLL", v(A.kTank, 0.05), v(A.e50, 0.2), "akzent", "hell", 590);
  // Endstand
  M.bilanz({ x: SICHER.mitte - 330, breite: 660, y: 440, titel: "STEUER AUF STEUER · AB 2027", ein: A.e50 + 0.25, aus: A.wDenn - 0.1,
    zeilen: [{ label: "TANK · 50 L", wert: Z.l50, nk: 2, einheit: "€", team: GOLD, ein: A.eSieben - 0.15 }, { label: "JAHR · 1.000 L", wert: Z.jahr, nk: 2, einheit: "€", team: GOLD, ein: A.e154 - 0.7 }] });
  // Warum: Formelkarte (die MwSt rechnet auf den ganzen Preis)
  M.formel({ x: SICHER.mitte - 390, breite: 780, y: 420, titel: "WARUM?", ein: A.wDenn + 0.3, aus: A.pEndet - 0.3, groesse: 62,
    teile: [
      { text: "(65,45", ein: A.wMwst + 0.05, team: "a" }, { text: "+", ein: A.wMwst + 0.55 }, { text: "15,56)", ein: A.wRechnet + 0.05, team: "b" }, { text: "×", ein: A.wAuf + 0.0 },
      { text: "19 %", ein: A.wAuf + 0.2 }, { text: "=", ein: A.wGanzen + 0.1 }, { text: "15,39", einheit: "CT", ein: A.wPreis, art: "erg", team: GOLD },
    ],
    unter: { text: "MWST AUF DEN GANZEN PREIS: ENERGIESTEUER UND CO₂-PREIS", ein: A.wGanzen + 0.3 } });
  // Pointe
  chip("+ 2,67 CT JE LITER", v(A.pSteigt, 0.0), v(A.sSteuer, 0.2), "akzent", "voll", 490);
  chip("+ 26,68 € IM JAHR", v(A.p27, 0.1), v(A.sSteuer, 0.2), "akzent", "voll", 590);
  chip("OHNE NEUEN BESCHLUSS", v(A.pOhne, 0.05), v(A.sSteuer, 0.2), "akzent", "hell", 690);
  M.titel({ woerter: [{ text: "BENZIN", ein: -0.3 }, { umbruch: true }, { text: "STEUER AUF STEUER", ein: -0.3, art: "klein", team: GOLD }, { umbruch: true }, { text: "PRO TANKFÜLLUNG?", ein: -0.3, art: "klein" }], y: 510, groesse: 124, aus: A.rGer - 0.55 });
  M.pointe({ woerter: [{ text: "STEUER AUF STEUER", ein: A.sSteuer, farbe: "akzent" }, { umbruch: true }, { text: "153,92 € IM JAHR", ein: A.s154 - 0.1, farbe: "akzent" }], ein: A.sSteuer, y: 470, groesse: 70 });
  if (skript.testbloecke && skript.testbloecke.folgen_hinweis === "mit") M.hinweis({ text: skript.folgen_hinweis });
  M.untertitel({ max: 4, unten: 1450, groesse: 64 });

  // ---------- Welt-Ereignisse (Protokoll für Ton und Prüfung; jede Zeile ist im Bild zu sehen) ----------
  const ev = (t, klang, text) => M.melde({ t, typ: "welt", klang, text });
  ev(0.3, "pop", "Tankstelle bei Nacht, Glassäule leuchtet, Autos ziehen vorbei"); ev(1.4, "klick", "Kamera schiebt sich heran, Laternen und Lichtspuren"); ev(0.5, "whoosh", "Ein Liter Benzin füllt die Glassäule, Uhr zählt auf 1,0"); ev(A.hDavon, "klick", "Kamera auf die Säule");
  ev(A.rGer, "whoosh", "Kamera gleitet, Chips der Regeln"); ev(A.rSuper, "klick", "Kamera zur Seite, Chip Super"); ev(A.rSaetze, "ding", "Chip Steuersätze");
  ev(A.fKlar, "whoosh", "Licht ruhig, Kamera nah an der unteren Schicht"); ev(A.fMwst, "ding", "Chip Mehrwertsteuer nur aufs Benzin"); ev(A.fOder, "klick", "Kamera weitet, Oder doch nicht");
  ev(A.w1Energie, "whoosh", "Türkise Energiesteuer-Schicht füllt die Säule"); ev(A.w119, "ding", "Goldene Mehrwertsteuer-Schicht wächst auf der Energiesteuer"); ev(A.w112, "ding", "Zähler läuft auf 0,12 €, Zoom, Gold leuchtet");
  ev(A.w2Co2, "whoosh", "Violette CO₂-Schicht füllt die Säule"); ev(A.w2Mwst, "ding", "Zweite goldene Schicht wächst auf dem CO₂-Preis"); ev(A.w23, "ding", "Zähler läuft auf 0,15 €, Zoom"); ev(A.w2Rabatt, "ding", "Etikett Tankrabatt hängt an der Energiesteuer, Zoom"); ev(A.w2Was, "klick", "Kamera weitet, offene Frage im Bild");
  ev(A.nZus, "whoosh", "Beide Goldschichten leuchten gemeinsam, 15 Cent je Liter"); ev(A.nZapf, "whoosh", "Kamera fährt zur Zapfsäule, Anzeige und Tankanzeige gehen an"); ev(A.nLiter, "klick", "Liter laufen an der Zapfsäule");
  ev(A.n10, "ding", "Haltepunkt 10 Liter: 1,54 €, Gold-Säule wächst"); ev(A.n30, "ding", "Haltepunkt 30 Liter: 4,62 €"); ev(A.nQuitt, "klick", "Kamera auf die Anzeige, Quittung ohne eigene Zeile");
  ev(A.k40, "ding", "40 Liter: 6,16 €, Tankanzeige fast voll"); ev(A.kTank, "whoosh", "Licht wärmer, Spannung am höchsten");
  ev(A.e50, "ding", "50 Liter: Zähler stoppt bei 7,70 €"); ev(A.eSiebzig, "ding", "Gold-Säule leuchtet auf, Zoom"); ev(A.e1000, "whoosh", "20 goldene Platten legen sich zum Jahr"); ev(A.e154, "ding", "Jahressumme 153,92 € steht");
  ev(A.wDenn, "whoosh", "Kamera zurück zur Glassäule, Warum"); ev(A.wGanzen, "ding", "Goldener Rahmen legt sich um alle Schichten");
  ev(A.pEndet, "whoosh", "Kalenderblatt 31.12. erscheint"); ev(A.p31, "ding", "Kalenderblatt kippt auf 01.01., Rabatt-Etikett fällt ab"); ev(A.pSteigt, "ding", "Goldschicht leuchtet auf, Zoom"); ev(A.p27, "ding", "Chip plus 26,68 € im Jahr");
  ev(A.sSteuer, "akzent", "Welt dunkelt ab, Schlusskarte"); ev(A.s154 - 0.1, "akzent", "Zeile 153,92 € im Jahr leuchtet");
  const sortiert = []; M.extra.forEach((e) => sortiert.push(e.t)); sortiert.sort((a, b) => a - b);
  for (let i = 0, last = 0; i <= sortiert.length; i++) {
    const nxt = i < sortiert.length ? sortiert[i] : DAUER;
    let g = last;
    while (nxt - g > 1.7) { g += 1.5; ev(g, "klick", "Kamera gleitet weiter, Lichter und Autos ziehen vorbei"); }
    last = nxt;
  }

  const zl = new Zeitleiste(buehne);
  zl.shot(0, welt);
  const gl = buehne.renderer.getContext(), px = new Uint8Array(4);
  window.renderAt = (t) => { zl.zeichne(t, Math.round(t * FPS)); hud.update(t); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); };
  window.hudAt = (t) => { regie.anwenden(t); hud.update(t); };
  M.veroeffentliche({ zl, regie, dauer: DAUER, teppich: skript.klangteppich });
  window.renderAt(Q.has("t") ? +Q.get("t") : 0);
  window.__fertig = true;
}

start().catch((e) => { console.error(e); window.__fehler = String(e && e.stack ? e.stack : e); });
