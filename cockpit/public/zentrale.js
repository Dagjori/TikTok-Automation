// Zentrale des Cockpits (Entscheidungen 03.11.): verbindet die Neon-Stadt (stadt/) mit den Inhalten des Cockpits.
// Die bisherigen Panels bleiben als unsichtbare Ablage im Dokument. Betritt man einen Raum, wandern die passenden Bausteine
// auf die Wandbildschirme, beim Verlassen zurück an ihren Platz; ihre Zeichen- und Klickfunktionen bleiben dieselben.
// Ohne WebGL oder mit Qualität „Aus“ zeigt ein flacher Stadtplan die sieben Gebäude, die Räume stehen dann flach.
// Nutzt S, ZS, $, esc, zahl, Ton, toast, tickerNeu, haengt, slotZeit, kontoInfo, berlinJetzt, bildRasterZeichnen,
// studioZeichnen, zahlenZeichnen, verlaufLaden, lernenZeichnen, doks, PRAEFIX, KONTO_NAME, ST aus den übrigen Skripten.
import { ZENTRALEN } from "./stadt/gebaeude.js";
import { RAEUME, raumOeffnen, raumWechseln, verlassen, imRaum, raumZustand, inhaltAnbieter, beimVerlassen } from "./stadt/raeume.js";

// Die 3D-Stadt lädt nebenher; alles andere hängt sich sofort an (cockpit.js verbindet beim DOMContentLoaded)
let STADT = null;
import("./stadt/stadt.js")
  .then((m) => { STADT = m.STADT; stadtBereit(); })
  .catch((e) => { console.warn("Neon-Stadt nicht verfügbar, flache Ansicht", e); document.body.classList.add("welt-fehlt"); planZeichnen(); });
const mit3d = () => !!STADT && STADT.W.stufe && STADT.W.stufe !== "aus";

// ───────────────────────── Bausteine und Räume ─────────────────────────
// Welche Bausteine (Element-IDs) auf welchem Bildschirm stehen (Aufteilung vom Inhaber bestätigt, 03.11.)
const INHALT = {
  "live/regie": { mitte: ["b-buehne"], rechts: ["b-kette"] },
  "live/tagesplan": { mitte: ["b-tagesziel", "b-videos"], rechts: ["b-auftraege"] },
  "live/technik": { mitte: ["b-dienst"], links: ["b-rechner"] },
  "studio/ideen": { mitte: ["b-studio-kopf", "b-ideen"] },
  "studio/schreibstube": { mitte: ["b-studio-kopf", "b-slots"], rechts: ["b-studio-leiste"] },
  "zahlen/konten": { mitte: ["b-zahlen-kopf", "b-konten"] },
  "zahlen/archiv": { mitte: ["b-videotabelle"] },
  "ziele/ziele": { mitte: ["b-missionen"] },
  "lernen/schleife": { mitte: ["b-lernschleife"], links: ["b-autonomie"] },
  "lernen/vorschlaege": { mitte: ["b-vorschlaege"] },
  "lernen/lernstand": { mitte: ["b-lernstand"] },
  "radar/radar": { mitte: ["b-radar"] },
  "claude/kommando": { mitte: ["claude-panel"], links: ["aufgaben", "schnell"] },
};
// Ursprünglicher Platz jedes Bausteins (Eltern und die Geschwister danach), damit er genau dorthin zurückkehrt
const PLATZ = new Map();
for (const ids of Object.values(INHALT)) for (const id of Object.values(ids).flat()) {
  const el = document.getElementById(id);
  if (el && !PLATZ.has(el)) PLATZ.set(el, { eltern: el.parentNode, danach: [...el.parentNode.children].slice([...el.parentNode.children].indexOf(el) + 1) });
}
function zurueck(el) {
  const p = PLATZ.get(el);
  if (!p) return;
  const vor = p.danach.find((n) => n.parentNode === p.eltern) || null;
  p.eltern.insertBefore(el, vor);
}

// Nach dem Umzug neu zeichnen, was von Größe oder Sichtbarkeit abhängt
const NACH_DEM_UMZUG = {
  live: () => { requestAnimationFrame(() => globalThis.bildRasterZeichnen?.()); },
  studio: () => globalThis.studioZeichnen?.(),
  zahlen: () => { globalThis.zahlenZeichnen?.(); globalThis.verlaufLaden?.(); },
  ziele: () => globalThis.zahlenZeichnen?.(),
  lernen: () => { globalThis.lernenZeichnen?.(); lernstandZeichnen(); },
  radar: () => globalThis.linksZeichnen?.(),
  claude: () => { const f = $("feed"); requestAnimationFrame(() => (f.scrollTop = f.scrollHeight)); },
};

inhaltAnbieter({
  holen(zentrale, raum, platz) {
    const ids = INHALT[`${zentrale}/${raum}`]?.[platz] || [];
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (els.length) setTimeout(() => NACH_DEM_UMZUG[zentrale]?.(), 0);
    return els;
  },
  zurueck,
});

// ───────────────────────── Öffnen, Stadt, Schnellwahl ─────────────────────────
const zentraleVon = (id) => ZENTRALEN.find((z) => z.id === id);

/** Gebäude (und optional Raum) öffnen: in 3D mit Anflug, sonst flach */
function oeffnen(zentraleId, raumId = null) {
  const z = zentraleVon(zentraleId);
  if (!z) return;
  Ton?.init?.();
  if (mit3d()) { STADT.raumAnsteuern(zentraleId, raumId); return; }
  const index = Math.max(0, (RAEUME[zentraleId] || []).findIndex((r) => r.id === raumId));
  const ort = raumZustand();
  if (ort.zentrale === zentraleId) raumWechseln(index);
  else raumOeffnen(z, index, { flach: true });
}
function stadtZeigen() { if (imRaum()) verlassen(); }
beimVerlassen(() => {}); // flach: nach dem Verlassen erscheint der Stadtplan (stadt:raum); stadt.js ersetzt das in 3D

// Ältere Aufrufe (Sprachbot, Meldungen, Steuerung vom Server) nennen Ansichten statt Gebäude
const ANSICHT = { live: ["live"], studio: ["studio"], zahlen: ["zahlen"], lernen: ["lernen", "vorschlaege"], ziele: ["ziele"], radar: ["radar"], claude: ["claude"] };
document.addEventListener("cockpit:oeffnen", (e) => {
  const { zentrale, raum } = e.detail || {};
  if (zentrale === "stadt") return stadtZeigen();
  const [id, raumStd] = ANSICHT[zentrale] || [zentrale];
  oeffnen(id, raum || raumStd || null);
});

// Schnellwahl in der Kopfleiste und Tasten 1–7 (0 = Stadt)
const leiste = $("zentralen-leiste");
leiste?.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-zentrale]");
  if (!b) return;
  if (b.dataset.zentrale === "stadt") stadtZeigen(); else oeffnen(b.dataset.zentrale);
});
addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.altKey || e.metaKey || e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
  if (e.key === "0") { stadtZeigen(); return; }
  const z = ZENTRALEN.find((x) => x.taste === e.key);
  if (z) { e.preventDefault(); oeffnen(z.id); }
});

// Flacher Stadtplan (ohne 3D): sieben Kacheln
const plan = $("stadt-flach");
function planZeichnen() {
  if (!plan) return;
  plan.hidden = mit3d() || imRaum();
  if (plan.hidden) return;
  plan.innerHTML = `<div class="flach-titel"><b>NEON-STADT</b><small>3D ist aus: die Gebäude als Plan. Mit ✨ wieder einschalten.</small></div>
    <div class="flach-raster">${ZENTRALEN.map((z) => `<button class="flach-kachel ${zentraleAktiv(z.id) ? "aktiv" : ""}" data-zentrale="${z.id}" style="--akzent:#${z.akzent.getHexString()}">
      <span class="flach-emoji">${z.emoji}</span><b>${esc(z.name)}</b><small>${esc(statusText(z.id))}</small><kbd>${z.taste}</kbd></button>`).join("")}</div>`;
}
plan?.addEventListener("click", (e) => { const b = e.target.closest("[data-zentrale]"); if (b) oeffnen(b.dataset.zentrale); });

function leisteZeichnen() {
  const ort = raumZustand();
  leiste?.querySelectorAll("button[data-zentrale]").forEach((b) => {
    b.classList.toggle("aktiv", ort.zentrale ? b.dataset.zentrale === ort.zentrale : b.dataset.zentrale === "stadt");
    b.classList.toggle("arbeitet", zentraleAktiv(b.dataset.zentrale));
  });
  document.body.classList.toggle("im-claude-raum", ort.zentrale === "claude");
  document.body.classList.toggle("claude-arbeitet", !!S.claude?.laeuft);
}

document.addEventListener("stadt:raum", (e) => {
  leisteZeichnen();
  planZeichnen();
  const ort = e.detail || {};
  if (ort.zentrale) document.dispatchEvent(new CustomEvent("cockpit:raum", { detail: ort }));
});

// Sobald die 3D-Stadt da ist: Qualität umgestellt → einen offenen Raum in der passenden Form neu öffnen
function stadtBereit() {
  STADT.W.beiStufe = (neu) => {
    const ort = raumZustand();
    if (ort.zentrale) {
      const z = zentraleVon(ort.zentrale);
      if (neu === "aus" && !ort.flach) { STADT.W.modus = "frei"; STADT.W.innen = null; raumOeffnen(z, ort.raumIndex, { flach: true }); }
      else if (neu !== "aus" && ort.flach) STADT.betreten(z, ort.raumIndex);
    }
    planZeichnen();
  };
  $("k-welt-stufe")?.addEventListener("click", () => STADT.stufeWechseln());
  STADT.stufeBestimmen();
  planZeichnen();
  datenSenden();
}

// ───────────────────────── Claude-Leiste (einklappbar am rechten Rand) ─────────────────────────
const claudeOffen = (an) => {
  document.body.classList.toggle("claude-offen", an);
  lokal.schreiben("claude-leiste", an ? "offen" : "zu");
};
claudeOffen(lokal.lesen("claude-leiste", "zu") === "offen");
$("k-claude")?.addEventListener("click", () => { claudeOffen(!document.body.classList.contains("claude-offen")); Ton?.klick?.(); });
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "c" && e.altKey && !e.ctrlKey) { e.preventDefault(); claudeOffen(!document.body.classList.contains("claude-offen")); }
});

// ───────────────────────── Lernstand (Raum in der Lernzentrale) ─────────────────────────
function lernstandZeichnen() {
  const el = $("lernstand-inhalt");
  if (!el || typeof doks !== "function") return;
  el.innerHTML = ["simulierbar", "stelldirvor"].map((konto) => {
    const dok = doks("stand").find((d) => d.id === `lernstand-${PRAEFIX[konto]}`);
    const stand = dok ? `Stand ${new Date(dok.daten.aktualisiert || dok.aktualisiert).toLocaleString("de-DE")}${dok.daten.quelle ? ` · ${esc(dok.daten.quelle)}` : ""}` : "Noch der Startwert aus befehle.json";
    return `<div class="lernstand-karte ${konto === "simulierbar" ? "acc1" : "acc2"}">
      <div class="zeile"><span class="chip ${konto === "simulierbar" ? "acc1" : "acc2"}">${esc(KONTO_NAME[konto])}</span><small>${stand}</small><button class="knopf klein" data-lernstand="${konto}">✏️ Bearbeiten</button></div>
      <div class="lernstand-text">${esc(dok?.daten.text || "Noch kein Lernstand.")}</div></div>`;
  }).join("");
}
$("lernstand-inhalt")?.addEventListener("click", (e) => {
  const b = e.target.closest("[data-lernstand]");
  if (!b) return;
  ST.konto = b.dataset.lernstand;
  $("k-lernstand").click(); // vorhandener Dialog aus studio.js
});

// ───────────────────────── Daten und Ereignisse → Stadt ─────────────────────────
function laufenderJob() { return (S.render?.auftraege || []).find((a) => a.status === "laeuft" && !haengt(a)) || null; }
function zentraleAktiv(id) {
  const c = S.claude || {}, art = c.aktiv?.art || "";
  switch (id) {
    case "live": return !!(laufenderJob() || S.live?.aktiv || S.claude?.produktion?.laeuft);
    case "studio": return !!(c.laeuft && ["ideen", "skripte"].includes(art));
    case "lernen": return !!(S.lernschleife?.laeuft || (c.laeuft && (art === "lernschleife" || art.startsWith("vorschlag"))));
    case "claude": return !!c.laeuft;
    case "radar": return offeneTrends() > 0;
    default: return false;
  }
}
const offeneTrends = () => (S.plan?.vorschlaege || []).filter((v) => !v.status || v.status === "neu").length;
function crpZiel() {
  const m = (ZS?.zahlen?.missionen?.simulierbar || []).find((x) => x.id === "follower_10k");
  return m ? { titel: m.titel, anteil: m.fortschritt || 0, wert: m.wert, ziel: m.ziel } : null;
}
function statusText(id) {
  const job = laufenderJob();
  switch (id) {
    case "live": return job ? `Render läuft · ${Math.round(job.prozent || 0)} %` : S.claude?.produktion?.laeuft ? "Produktion läuft …" : "Render-Dienst bereit";
    case "studio": return zentraleAktiv("studio") ? "Ideen und Skripte entstehen …" : "Ideen, Skripte, Freigabe";
    case "zahlen": return "Follower, Likes, jedes Video";
    case "ziele": { const z = crpZiel(); return z ? `CRP-Ziel: ${Math.round(z.anteil * 100)} %` : "Ziele bis zum CRP"; }
    case "lernen": return zentraleAktiv("lernen") ? "Lernschleife läuft …" : "Lernschleife, Vorschläge, Lernstand";
    case "radar": return offeneTrends() ? `${offeneTrends()} offene Trend-Vorschläge` : "Trend-Vorschläge";
    case "claude": return S.claude?.laeuft ? "Claude arbeitet …" : "Claude bereit";
    default: return "";
  }
}

function naechstesPosting() {
  const b = berlinJetzt();
  const z = (S.plan?.protokoll || [])
    .filter((x) => x.status === "geplant" && slotZeit(x.datum, x.slot))
    .map((x) => ({ ...x, wann: `${x.datum} ${slotZeit(x.datum, x.slot)}` }))
    .filter((x) => x.wann >= `${b.datum} ${b.zeit}`)
    .sort((a, c) => a.wann.localeCompare(c.wann))[0];
  if (!z) return null;
  return { zeit: `${z.datum === b.datum ? "" : `${z.datum.slice(8, 10)}.${z.datum.slice(5, 7)}. `}${slotZeit(z.datum, z.slot)}`, konto: kontoInfo(z.konto).name, titel: z.titel || "" };
}

let datenGeplant = false;
function datenSenden() {
  if (datenGeplant) return;
  datenGeplant = true;
  requestAnimationFrame(() => {
    datenGeplant = false;
    leisteZeichnen();
    planZeichnen();
    if (!STADT) return;
    const job = laufenderJob(), c = S.claude || {};
    const heute = (S.plan?.protokoll || []).filter((x) => x.datum === S.heute);
    const profile = ZS?.zahlen?.profile || {}, start = ZS?.zahlen?.start || {};
    const ziel = crpZiel();
    STADT.stadtDaten({
      zentralen: {
        rendert: zentraleAktiv("live"), prozent: job ? job.prozent || 0 : S.live?.aktiv ? 50 : 0, titel: job?.projekt || S.live?.projekt || "",
        claudeAktiv: !!c.laeuft, modell: c.modell || "", ideenAktiv: zentraleAktiv("studio"), lernAktiv: zentraleAktiv("lernen"),
        zielAnteil: ziel?.anteil || 0, radarNeu: offeneTrends(),
      },
      tafel: {
        konten: [["simulierbar", "Simulierbar"], ["stelldirvor.pov", "Stell dir vor"]].map(([k, name]) => ({ name, follower: profile[k]?.follower ?? null, plus: profile[k] && start[k] ? Math.max(0, profile[k].follower - start[k].follower) : 0 })),
        naechster: naechstesPosting(), render: { rendert: !!job, prozent: job?.prozent || 0 },
        online: heute.filter((x) => ["geplant", "gepostet"].includes(x.status)).length, geplant: 4, ziel,
      },
      wetter: S.wetter || null,
    });
  });
}

const CLAUDE_ZIEL = { ideen: "studio", skripte: "studio", lernschleife: "lernen", vorschlag: "lernen", vorschlag_umsetzen: "lernen" };
document.addEventListener("cockpit:verbunden", (ev) => {
  const es = ev.detail;
  const an = (art, f) => es.addEventListener(art, (e) => { try { f(JSON.parse(e.data)); } catch (err) { console.error("zentrale", art, err); } });
  an("zustand", (z) => { S.wetter = z.wetter || null; datenSenden(); lernstandZeichnen(); });
  for (const art of ["render", "live", "claude", "plan", "zahlen", "lernschleife", "einstellungen"]) an(art, datenSenden);
  an("db", (e) => { if (e.sammlung === "stand") lernstandZeichnen(); datenSenden(); });
  an("wetter", (w) => { S.wetter = w; datenSenden(); });
  an("zahlen_puls", (z) => { if (z.art === "follower") STADT?.stadtEreignis("follower", z); });
  an("mission_erreicht", (m) => STADT?.stadtEreignis("ziel", m));
  an("meilenstein", (m) => { if (m.art === "render_start" || m.art === "render_fertig") STADT?.stadtEreignis(m.art, m); });
});
document.addEventListener("cockpit:feed", (e) => {
  if (e.detail?.art === "werkzeug") STADT?.stadtEreignis("claude_werkzeug", { ziel: CLAUDE_ZIEL[S.claude?.aktiv?.art] || "live" });
});
setInterval(datenSenden, 30000); // Uhrzeit auf der Anzeigetafel, nächstes Posting

leisteZeichnen();
planZeichnen();
globalThis.ZENTRALE = { oeffnen, stadtZeigen, imRaum, raumZustand };
