// Demo der Simulierbar-Stile 17–21 (Skill .claude/skills/simulierbar-video/): eine Welt je Stil, gleiches seriöses HUD.
// Aufruf: szene.html?stil=nachtstadt|studio|architektur|lichtlabor|nachtkarte  (render.js … --query "stil=studio")
// Qualitätsschalter: msaa (Standard 0 = FXAA, 2 für Standbilder), schatten (Standard 2048, 0 = aus), aus=spiegel,nebel,kegel,strahlen (je Welt).
// Kein Video zum Posten: Beispielwerte, geschätztes Timing (Stimme Ben, 2,0 W/s), keine Stimme.
import { SimBuehne, aktualisiere } from "../../engine/sim_atmosphaere.js";
import { Zeitplan, schaetzeTiming } from "../../engine/zeitplan.js";
import { Zeitleiste } from "../../engine/zeitleiste.js";
import { HUD } from "../../engine/hud.js";
import { Massstab } from "../../engine/massstab.js";

const FPS = 30;
const Q = new URLSearchParams(location.search);
const STIL = Q.get("stil") || "nachtstadt";
const MSAA = Q.has("msaa") ? +Q.get("msaa") : 0; // gemessen: MSAA kostet ca. 25 %, FXAA (kern.js) genügt im Video
const SCHATTEN = Q.has("schatten") ? +Q.get("schatten") : 2048;

async function start() {
  const W = await import(`./welten/${STIL}.js`);
  const info = W.info;
  const timing = schaetzeTiming({ segmente: info.segmente }); // Stimme Ben (Schätzung 2,0 W/s), im echten Video audio/timing.json
  const zp = new Zeitplan(timing, { mindestlaenge: 0, nachlauf: 0.8 });
  const DAUER = Math.round(zp.dauer * FPS) / FPS;

  const buehne = new SimBuehne(document.getElementById("leinwand"), { msaa: MSAA, schatten: SCHATTEN > 0, tiefe: !!info.tiefe });
  await document.fonts.ready;
  const hud = new HUD(document.getElementById("hud"));
  // Theme des seriösen Looks (design.md): dunkle Karten, Akzent Elfenbein, Teamfarben ohne Gelb
  const M = new Massstab(hud, zp, { teams: info.teams, akzent: "#ECE6DA", tinte: "#0B0D12", karte: "#10131A", karteText: "#F3F5F8" });
  const T = (x) => M.zeit(x);

  const { welt, werte, uhr } = await W.baue({ buehne, renderer: buehne.renderer, zp, T, M, Q, schatten: SCHATTEN, dauer: DAUER });

  M.tafel({ y: 166, links: { team: "a", ...info.tafel.links }, rechts: { team: "b", ...info.tafel.rechts }, werte, vorn: info.tafel.vorn ?? "tief", uhr });
  if (info.chips) M.chips({ y: 360, ausrichtung: "mitte", liste: info.chips });
  M.untertitel({ stil: "kontur", unten: 1450, groesse: 64 });

  const zl = new Zeitleiste(buehne);
  zl.shot(0, { ...welt, update(t) { aktualisiere(t); welt.update(t); } });

  const gl = buehne.renderer.getContext();
  const px = new Uint8Array(4);
  window.renderAt = (t) => {
    zl.zeichne(t, Math.round(t * FPS));
    hud.update(t);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  };
  M.veroeffentliche({ zl, dauer: DAUER, teppich: info.teppich || "musik" });
  window.renderAt(info.standbild ?? 0);
  window.__fertig = true;
}

start().catch((e) => {
  console.error(e);
  window.__fehler = String(e && e.stack ? e.stack : e);
});
