"use strict";
// TikTok-Cockpit · Kern der Oberfläche (Neubau 07.11.: Regie-Design statt 3D-Stadt, ohne Bibliotheken).
// Zustand S, Helfer, Verbindung zum lokalen Server (SSE), Seitenwechsel und gebündeltes Neuzeichnen.
// Die übrigen Skripte (claude.js, studio.js, produktion.js, zahlen.js, jetzt.js) hängen sich über
// zeichner(seite, f) und beiEreignis(art, f) an; gezeichnet wird nur, was sichtbar ist.

const TOKEN = document.querySelector('meta[name="cockpit-token"]').content;
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const zahl = (n) => Number(n || 0).toLocaleString("de-DE");
const kurzZahl = (n) => (n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(".", ",") + "K" : zahl(n));
const lokal = {
  lesen(k, std) { try { return localStorage.getItem(k) ?? std; } catch { return std; } },
  schreiben(k, v) { try { localStorage.setItem(k, v); } catch { /* privat */ } },
};

const S = {
  render: { rechner: [], auftraege: [], wartend: [] },
  live: {},
  lokal: [],
  plan: { protokoll: [], vorschlaege: [] },
  claude: { aufgaben: [] },
  feed: [],
  db: { skripte: [], ideen: [], stand: [], vorschlaege: [], meldungen: [] },
  einstellungen: {},
  heute: "",
  rechner: "",
  auswahl: null, // Produktion: {typ: "job"|"video", id}
  schritt: null,
  renderlog: { auftrag: null, zeilen: [] },
  verbunden: false,
  seite: "jetzt",
};

async function post(pfad, daten = {}) {
  try {
    const r = await fetch(pfad, { method: "POST", headers: { "Content-Type": "application/json", "X-Cockpit-Token": TOKEN }, body: JSON.stringify(daten) });
    return await r.json();
  } catch (e) {
    return { ok: false, fehler: e.message };
  }
}

// ───────── Symbole (Linien-Icons, eigene Pfade) ─────────
const ICO = {
  jetzt: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  studio: '<path d="M9 18h6M10 22h4"/><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.2 1.5 1.4 2.5"/>',
  produktion: '<rect x="2" y="3" width="20" height="18" rx="2.5"/><path d="M7 3v18M17 3v18M2 12h20M2 7.5h5M2 16.5h5M17 7.5h5M17 16.5h5"/>',
  zahlen: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
  lernen: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/>',
  radar: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="5.5"/><path d="M12 12l6-6"/><circle cx="12" cy="12" r="1.3"/>',
  register: '<rect x="3" y="3.5" width="18" height="17" rx="2.5"/><path d="M3 9h18M3 14.5h18M9 9v11.5"/>',
  glocke: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  regler: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  "neu-laden": '<path d="M21 4v6h-6M3 20v-6h6"/><path d="M5.5 9a8 8 0 0 1 13.2-3L21 8.5M3 15.5 5.3 18a8 8 0 0 0 13.2-3"/>',
  neustart: '<path d="M3 4v6h6"/><path d="M3.5 15a9 9 0 1 0 2.2-9.4L3 10"/>',
  aus: '<path d="M18.4 6.6a9 9 0 1 1-12.8 0M12 2v10"/>',
  kalender: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  ideen: '<path d="M9 18h6M10 22h4"/><path d="M15.1 14c.2-1 .7-1.7 1.4-2.5A4.7 4.7 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.2 1.5 1.4 2.5"/>',
  suche: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.6-4.6"/>',
  skript: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  render: '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
  zahnrad: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  pruefen: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  uhr: '<circle cx="12" cy="12" r="9.5"/><path d="M12 6.5V12l3.5 2"/>',
  wiederholen: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
  haken: '<path d="M20 6 9 17l-5-5"/>',
};
const ico = (name, klasse = "") => `<svg class="ico ${klasse}" viewBox="0 0 24 24" aria-hidden="true">${ICO[name] || ""}</svg>`;
function icosSetzen(wurzel = document) {
  wurzel.querySelectorAll("i[data-ico]").forEach((el) => { if (!el.firstChild) el.innerHTML = ico(el.dataset.ico); });
}

// ───────── Zeit, Konten, Slots ─────────
function slotZeit(datum, slot) {
  if (slot === "abend") return "19:30";
  if (slot !== "mittag") return "";
  const wt = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return wt === 0 || wt === 6 ? "09:30" : "12:30";
}
const KONTO = {
  simulierbar: { name: "Simulierbar", klasse: "acc1" },
  "stelldirvor.pov": { name: "Stell dir vor", klasse: "acc2" },
  stelldirvor: { name: "Stell dir vor", klasse: "acc2" },
};
const kontoInfo = (k) => KONTO[k] || (String(k || "").startsWith("stelldirvor") ? KONTO.stelldirvor : { name: k || "?", klasse: "" });
const PRAEFIX = { simulierbar: "acc1", stelldirvor: "acc2" };
const KONTO_NAME = { simulierbar: "Simulierbar", stelldirvor: "Stell dir vor" };
const SLOT_NAME = { mittag: "Mittag", abend: "Abend" };

function berlinJetzt() {
  const t = new Date().toLocaleString("sv-SE", { timeZone: "Europe/Berlin" });
  return { datum: t.slice(0, 10), zeit: t.slice(11, 16) };
}
function plusTage(datum, n) {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const morgen = () => plusTage(S.heute, 1);
function tagLabel(datum) {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
}
const uhrzeitVon = (iso) => (iso ? new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "");
/** Dauer in Sekunden → „4:07“ bzw. „1:02:09“ */
function dauer(s) {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`;
}
// Nur neu schreiben, was sich geändert hat (sonst starten Einblend-Animationen bei jeder Live-Meldung neu)
function htmlSetzen(el, html) { if (el && el._html !== html) { el._html = html; el.innerHTML = html; } }
// Laufende Uhren: data-seit (Laufzeit), data-bis (Countdown), Countdown-Ringe; jede Sekunde, nur auf der sichtbaren Seite
function zeitFeld(el) {
  if (el.dataset.seit) el.textContent = dauer((Date.now() - Date.parse(el.dataset.seit)) / 1000);
  else if (el.dataset.bis) { const rest = (Date.parse(el.dataset.bis) - Date.now()) / 1000; el.textContent = rest > 0 ? dauer(rest) : "gleich"; }
}
function ringFeld(el) {
  const rest = Math.max(0, (Date.parse(el.dataset.ringBis) - Date.now()) / 1000), gesamt = Number(el.dataset.ringGesamt) || 60;
  el.style.strokeDashoffset = String(100.5 * (1 - Math.min(1, rest / gesamt)));
}
function zeitenAktualisieren() {
  if (document.hidden) return;
  const seite = $(`seite-${S.seite}`);
  seite?.querySelectorAll("[data-seit], [data-bis]").forEach(zeitFeld);
  seite?.querySelectorAll("[data-ring-bis]").forEach(ringFeld);
}
// Posting-Zeit (Berlin) eines Slots als Zeitpunkt
function slotZeitpunkt(datum, slot) {
  const z = slotZeit(datum, slot);
  if (!z) return null;
  const versatz = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Berlin" })) - new Date();
  return new Date(new Date(`${datum}T${z}:00`).getTime() - versatz);
}

// ───────── Datenbank-Helfer (Studio) ─────────
const doks = (s) => S.db?.[s] || [];
const skriptDok = (id) => doks("skripte").find((d) => d.id === id);
const slotIdVon = (konto, tag, slot) => `${PRAEFIX[konto]}-${tag}-${slot}`;
// Kennt der laufende Server die Automatik (ab Neubau 07.11.)? Sonst zeigt die Oberfläche keine Countdowns
const automatikDa = () => !!S.automatik;
const automatik = () => ({ recherche: true, produktion: true, ideen: true, ideen_uhrzeit: "07:00", wiederholen: true, auto_wahl: false, auto_wahl_frist_min: 120, auto_freigabe: false, auto_freigabe_frist_min: 180, ...(S.automatik || {}), ...(S.einstellungen?.automatik || {}) });
// Handy-Meldungen (Telegram): Schalter je Ereignis, Standard alles an (lib/melden.mjs); S.handy.eingerichtet sagt, ob der Zugang da ist
const meldenEinstellung = () => ({ aktiv: true, ideen: true, skript: true, rueckfrage: true, fehler: true, video: true, treffer: true, tagesabschluss: true, tagesabschluss_uhrzeit: "21:30", ...(S.melden || {}), ...(S.einstellungen?.melden || {}) });
// Nutzungslimit von Claude: { bis, weiter_ab, text } solange es gilt, sonst null
const limitJetzt = () => { const l = S.claude?.limit; return l && Date.parse(l.weiter_ab) > Date.now() ? l : null; };

// ───────── Hinweise ─────────
function toast(icon, titel, text = "", art = "") {
  const el = document.createElement("div");
  el.className = `toast ${art}`;
  el.innerHTML = `<span class="gross">${esc(icon)}</span><div><b>${esc(titel)}</b>${text ? `<small>${esc(text)}</small>` : ""}</div>`;
  $("toasts").append(el);
  setTimeout(() => el.remove(), 5300);
}

// Aktivität (Jetzt-Seite): kurze Zeilen, neueste oben
const AKT = [];
function aktivitaet(icon, text) {
  AKT.unshift({ zeit: new Date(), icon, text: String(text).slice(0, 220), neu: true });
  if (AKT.length > 60) AKT.length = 60;
  planen("jetzt");
}

// ───────── Seiten und gebündeltes Zeichnen ─────────
const SEITEN = ["jetzt", "studio", "produktion", "zahlen", "lernen", "radar", "register"];
const ZEICHNER = new Map(); // seite → [f]
const IMMER = []; // läuft bei jeder Änderung (Zählpunkte, Kopf)
function zeichner(seite, f) {
  if (seite === "*") IMMER.push(f);
  else (ZEICHNER.get(seite) || ZEICHNER.set(seite, []).get(seite)).push(f);
}
const offen = new Set();
let geplant = false;
/** Seite neu zeichnen lassen (gesammelt im nächsten Bild; nur sichtbare Seiten, verborgenes Fenster wartet) */
function planen(...seiten) {
  for (const s of seiten.length ? seiten : SEITEN) offen.add(s);
  if (geplant || document.hidden) return;
  geplant = true;
  // Im nächsten Bild; malt der Browser gerade nicht (Fenster verdeckt), spätestens nach 300 ms
  const bild = requestAnimationFrame(zeichnen);
  setTimeout(() => { if (geplant) { cancelAnimationFrame(bild); zeichnen(); } }, 300);
}
function zeichnen() {
  geplant = false;
  if (!S.verbunden && !S.heute) return;
  for (const f of IMMER) try { f(); } catch (e) { console.error(e); }
  if (offen.has(S.seite)) for (const f of ZEICHNER.get(S.seite) || []) try { f(); } catch (e) { console.error(S.seite, e); }
  offen.delete(S.seite);
}
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("verborgen", document.hidden);
  if (!document.hidden) { offen.add(S.seite); planen(S.seite); }
});

function seiteZeigen(name, ohneHash = false) {
  if (!SEITEN.includes(name)) name = "jetzt";
  S.seite = name;
  for (const s of SEITEN) $(`seite-${s}`).hidden = s !== name;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("aktiv", a.dataset.seite === name));
  $("seiten-titel").textContent = $(`seite-${name}`).dataset.titel;
  $("seiten-unter").textContent = "";
  if (!ohneHash && location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  lokal.schreiben("seite", name);
  $("seiten").scrollTop = 0;
  offen.add(name);
  planen(name);
  document.dispatchEvent(new CustomEvent("cockpit:seite", { detail: name }));
}
// Für Meldungen, Steuerung vom Server und Sprachbefehle: alte Ansichtsnamen gelten weiter
const ANSICHT_ALT = { live: "produktion", ziele: "zahlen", vorschlaege: "lernen", claude: "jetzt", stadt: "jetzt" };
function ansichtSetzen(ansicht) {
  const name = ANSICHT_ALT[ansicht] || ansicht;
  if (ansicht === "claude") claudeOffen(true);
  seiteZeigen(name);
}
addEventListener("hashchange", () => seiteZeigen(location.hash.slice(1), true));
addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "c" && e.altKey && !e.ctrlKey) { e.preventDefault(); claudeOffen(!document.body.classList.contains("claude-offen")); return; }
  if (e.ctrlKey || e.altKey || e.metaKey || e.target.closest?.("input, textarea, select, [contenteditable]") || document.querySelector("dialog[open]")) return;
  const n = Number(e.key);
  if (n >= 1 && n <= SEITEN.length) { e.preventDefault(); seiteZeigen(SEITEN[n - 1]); }
});

// ───────── Claude-Leiste ein-/ausklappen ─────────
function claudeOffen(an) {
  document.body.classList.toggle("claude-offen", an);
  lokal.schreiben("claude-leiste", an ? "offen" : "zu");
  if (an) requestAnimationFrame(() => { const f = $("feed"); f.scrollTop = f.scrollHeight; });
}
$("k-claude").addEventListener("click", () => claudeOffen(true));
$("k-claude-zu").addEventListener("click", () => claudeOffen(false));

// ───────── Kopf: Uhr, nächstes Posting, Rechner ─────────
function naechstesPosting() {
  const jetzt = Date.now();
  const kandidaten = [];
  for (const z of S.plan.protokoll || []) if (z.status === "geplant") kandidaten.push({ datum: z.datum, slot: z.slot, konto: z.konto, titel: z.titel });
  for (const d of doks("skripte")) if (d.daten.status === "geplant") kandidaten.push({ datum: d.daten.datum, slot: d.daten.slot, konto: d.daten.konto, titel: d.daten.titel, zeit: d.daten.geplant_fuer });
  return kandidaten
    .map((k) => ({ ...k, ms: (k.zeit ? Date.parse(k.zeit) : slotZeitpunkt(k.datum, k.slot)?.getTime()) || 0 }))
    .filter((k) => k.ms > jetzt)
    .sort((a, b) => a.ms - b.ms)[0] || null;
}
function uhrZeichnen() {
  const jetzt = new Date();
  $("uhr").textContent = jetzt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/Berlin" });
  $("datum").textContent = jetzt.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Berlin" });
  const n = naechstesPosting();
  $("naechster").innerHTML = n
    ? `${ico("uhr")}<span class="chip ${kontoInfo(n.konto).klasse}">${esc(kontoInfo(n.konto).name)}</span> online in <b>${dauer((n.ms - Date.now()) / 1000)}</b>`
    : `${ico("uhr")}<span>kein geplantes Posting</span>`;
  $("naechster").title = n ? `${n.titel || ""} · ${n.datum} ${slotZeit(n.datum, n.slot)}` : "";
}
function rechnerZeichnen() {
  $("rechner-leds").innerHTML = (S.render.rechner || []).map((r) => {
    const d = r.daten || {};
    const rendert = r.online && d.status === "rendert";
    const text = !r.online ? "offline" : rendert ? `rendert ${Math.round(d.prozent || 0)} %` : "bereit";
    const name = r.lokal ? "Dieser Rechner" : /LAPTOP/i.test(r.rechner) ? "Laptop" : "PC";
    return `<div class="rechner-led" title="${esc(r.rechner)}"><span class="led ${!r.online ? "fehler" : rendert ? "laeuft" : "an"}"></span><b>${esc(name)}</b>${esc(text)}</div>`;
  }).join("");
}
zeichner("*", rechnerZeichnen);

// ───────── Verbindung (SSE) ─────────
const HOERER = new Map(); // art → [f]
function beiEreignis(art, f) { (HOERER.get(art) || HOERER.set(art, []).get(art)).push(f); }

function verbinden() {
  const es = new EventSource("/api/events");
  const kanaele = new Set(["zustand", "render", "live", "renderlog", "plan", "lokal", "claude", "db", "feed", "werkzeug_ergebnis", "abgleich", "abgleich_neu",
    "meilenstein", "puls", "dienst", "dienst_zeile", "zahlen", "zahlen_puls", "einstellungen", "lernschleife", "meldung", "steuerung", "mission_erreicht", "spiegel", "register"]);
  for (const art of kanaele) {
    es.addEventListener(art, (e) => {
      let d;
      try { d = JSON.parse(e.data); } catch { return; }
      if (art === "zustand") zustandUebernehmen(d);
      for (const f of HOERER.get(art) || []) try { f(d); } catch (err) { console.error(art, err); }
    });
  }
  es.onerror = () => {
    S.verbunden = false;
    $("verbindung").className = "verbindung aus";
    $("verbindung").querySelector(".verbindung-text").textContent = "getrennt · verbinde neu …";
  };
}
function zustandUebernehmen(z) {
  // Neuer Server (Neustart oder Update): Seite neu laden, damit Token und Oberfläche passen
  if (S.instanz && z.instanz && z.instanz !== S.instanz) { location.reload(); return; }
  S.instanz = z.instanz;
  Object.assign(S, {
    render: z.render || S.render, live: z.live || {}, lokal: z.lokal || [], plan: z.plan || S.plan, claude: z.claude || {}, heute: z.heute,
    rechner: z.rechner, feed: z.feed || [], db: { skripte: [], ideen: [], stand: [], vorschlaege: [], meldungen: [], ...(z.db || {}) },
    einstellungen: z.einstellungen || {}, abgleich: z.abgleich || null, automatik: z.automatik || null, wiederholen_nach_s: z.wiederholen_nach_s || 300,
    melden: z.melden || null, handy: z.handy || null,
  });
  S.verbunden = true;
  verbindungZeigen();
  planen();
}
function verbindungZeigen() {
  if (!S.verbunden) return;
  const a = S.abgleich;
  const andere = (a?.rechner || []).filter((r) => r !== S.rechner);
  $("verbindung").className = "verbindung an";
  // Supabase länger nicht erreichbar: die Automatik läuft dann lokal auf diesem Rechner weiter (lib/automatik.mjs)
  const lokal = !!S.claude?.automatik_lokal;
  $("verbindung").classList.toggle("lokal", lokal);
  $("verbindung").querySelector(".verbindung-text").textContent = `${S.rechner}${andere.length ? ` ⇄ ${andere.join(", ")}` : ""}${lokal ? " · Automatik lokal" : a?.fehler ? " · Abgleich gestört" : ""}`;
  $("verbindung").title = lokal ? "Supabase ist nicht erreichbar. Die Automatik läuft so lange nur auf diesem Rechner weiter." : a ? `Abgleich über Supabase${a.zuletzt ? `, zuletzt ${new Date(a.zuletzt).toLocaleTimeString("de-DE")}` : ""}${a.fehler ? `: ${a.fehler}` : ""}` : "verbunden";
}

// Grundereignisse, die mehrere Seiten betreffen
beiEreignis("render", (r) => { S.render = r; planen("jetzt", "produktion"); });
beiEreignis("live", (l) => { S.live = l; planen("jetzt", "produktion"); });
beiEreignis("lokal", (l) => { S.lokal = l; planen("produktion"); });
beiEreignis("plan", (p) => { S.plan = p; planen("jetzt", "produktion", "radar"); });
beiEreignis("einstellungen", (e) => { S.einstellungen = e; planen(); });
beiEreignis("abgleich", (a) => { S.abgleich = a; verbindungZeigen(); });
beiEreignis("abgleich_neu", (a) => aktivitaet("⇄", `${a.anzahl} Änderung${a.anzahl === 1 ? "" : "en"}${a.von?.length ? ` vom ${a.von.join(", ")}` : ""} übernommen`));
beiEreignis("puls", () => uhrZeichnen());
beiEreignis("claude", (c) => { S.claude = c; verbindungZeigen(); }); // Abzeichen „Automatik lokal“ (alles Weitere in claude.js)
beiEreignis("db", (e) => {
  const liste = (S.db[e.sammlung] ||= []);
  const i = liste.findIndex((d) => d.id === e.id);
  const alt = i >= 0 ? liste[i] : null;
  if (e.geloescht) { if (i >= 0) liste.splice(i, 1); }
  else if (alt) liste[i] = { ...alt, ...e };
  else liste.push(e);
  document.dispatchEvent(new CustomEvent("cockpit:db", { detail: { e, alt } }));
  planen();
});
beiEreignis("meilenstein", (m) => {
  if (m.art === "render_fertig") { toast("🎬", "Render fertig", m.text, "erfolg"); aktivitaet("🎬", m.text); }
  else if (m.art === "render_fehler") { toast("⚠️", "Render-Problem", m.text, "problem"); aktivitaet("⚠️", m.text); }
  else if (m.art === "render_start") { aktivitaet("▶", m.text); S.auswahl = { typ: "job", id: m.id }; }
  else aktivitaet("·", m.text);
});

// ───────── Server-Knöpfe ─────────
$("k-aktualisieren").addEventListener("click", () => { post("/api/aktualisieren"); toast("⟳", "Daten werden neu geladen"); });
$("k-neustart").addEventListener("click", async () => {
  if (!confirm("Cockpit neu starten? Laufende Claude-Aufträge und eine laufende Produktion werden dabei abgebrochen.")) return;
  const r = await post("/api/neustart");
  if (r.ok) toast("♻", "Neustart", "Das Cockpit lädt gleich neu …");
  else toast("⚠️", "Neustart nicht möglich", r.fehler || "", "problem");
});
$("k-beenden").addEventListener("click", async () => {
  if (!confirm("Cockpit-Server beenden? Das Fenster bleibt offen, zeigt dann aber nichts mehr an.")) return;
  let r = await post("/api/beenden");
  // Es läuft noch ein Auftrag: noch einmal ausdrücklich fragen (nach dem nächsten Start setzt das Cockpit die Videos von selbst fort)
  if (!r.ok && r.laeuft && confirm(`${r.fehler}\n\nTrotzdem beenden? Der laufende Auftrag wird abgebrochen; nach dem nächsten Start setzt das Cockpit ihn von selbst fort.`)) r = await post("/api/beenden", { trotzdem: true });
  if (!r.ok) toast("⚠️", "Beenden nicht möglich", r.fehler || "", "problem");
});

// Kleiner Text-Dialog (Lernstand, Neu schreiben)
function textDialog({ titel, hinweis = "", wert = "", ok, knopf = "Speichern" }) {
  const d = $("text-dialog");
  $("text-dialog-titel").textContent = titel;
  $("text-dialog-hinweis").textContent = hinweis;
  $("text-dialog-feld").value = wert;
  $("text-dialog-ok").textContent = knopf;
  $("text-dialog-ok").onclick = async () => { if (await ok($("text-dialog-feld").value.trim())) d.close(); };
  d.showModal();
  $("text-dialog-feld").focus();
}
document.querySelectorAll("dialog [data-zu]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));

// ───────── Start ─────────
icosSetzen();
claudeOffen(lokal.lesen("claude-leiste", innerWidth >= 1500 ? "offen" : "zu") === "offen");
uhrZeichnen();
setInterval(() => { uhrZeichnen(); zeitenAktualisieren(); }, 1000);
document.addEventListener("DOMContentLoaded", () => {
  seiteZeigen(location.hash.slice(1) || lokal.lesen("seite", "jetzt"), true);
  verbinden();
});
