// Live-Zahlen und Missionen. Schonender Takt (Entscheidung des Inhabers 03.11.): Profile alle 30 Min., Videos stündlich
// (Buffer-Kennzahlen + öffentliche TikTok-Seiten der 4 neuesten). Drosselt TikTok: 6 Std. Pause für TikTok-Seiten, nie umgehen.
// Ziele der Missionen aus CLAUDE.md §3 (CRP: 10.000 Follower, 100.000 Views in 30 Tagen; Auswertungsziele).
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { punkteOrdnen, zuwachs24, aufrufe24, jeTausend, bewerten, naechsterTeil, teilAusText, TAG, STUNDE, FRISCH_H } from "./treffer.mjs";

const TAKT_PROFILE = 30 * 60 * 1000;
const TAKT_VIDEOS = 60 * 60 * 1000;
const PAUSE_GEDROSSELT = 6 * 3600 * 1000;
const KONTO_VON_KANAL = { simulierbar: "simulierbar", "stelldirvor.pov": "stelldirvor" };

export const MISSIONEN = [
  { id: "follower_10k", titel: "10.000 Follower", gruppe: "CRP", ziel: 10000, icon: "👥" },
  { id: "views_30t", titel: "100.000 Views in 30 Tagen", gruppe: "CRP", ziel: 100000, icon: "👀", hinweis: "Näherung: alle Views, TikTok zählt nur qualifizierte (≥ 5 s, CRP-Länder)" },
  { id: "crp_videos", titel: "10 Videos über 1 Min. mit 1.000 Views", gruppe: "CRP", ziel: 10, icon: "🎬" },
  { id: "plus_1000", titel: "+1.000 Follower seit Start", gruppe: "Wachstum", ziel: 1000, icon: "📈" },
  { id: "video_50k", titel: "Ein Video über 50.000 Views", gruppe: "Viral", ziel: 50000, icon: "🔥" },
  { id: "median_5k", titel: "Median über 5.000 Views", gruppe: "Viral", ziel: 5000, icon: "📊", hinweis: "Videos ab 24 Std. Alter" },
  { id: "follow_rate", titel: "1 Follower je 1.000 Views", gruppe: "Wachstum", ziel: 1, icon: "🧲", einheit: "je 1.000", komma: 2 },
];

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Eine CSV-Zeile mit Anführungszeichen (Titel enthalten Kommas) in Felder zerlegen. */
export function csvZeile(zeile) {
  const felder = [];
  let f = "", q = false;
  for (let i = 0; i < zeile.length; i++) {
    const c = zeile[i];
    if (q) {
      if (c === '"' && zeile[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c;
    } else if (c === '"') q = true;
    else if (c === ",") { felder.push(f); f = ""; } else f += c;
  }
  felder.push(f);
  return felder;
}

/** data/insights/metriken.csv (tägliche Abrufe der Lernschleife) → { post_id: [{t, wert}] } mit wert = max(Buffer-, TikTok-Aufrufe). */
export function metrikenPunkte(text) {
  const zeilen = String(text || "").split(/\r?\n/).filter(Boolean);
  if (!zeilen.length) return {};
  const kopf = csvZeile(zeilen[0]);
  const i = (n) => kopf.indexOf(n);
  const [iA, iP, iV, iT] = [i("abruf"), i("post_id"), i("views"), i("tt_views")];
  if (iA < 0 || iP < 0) return {};
  const erg = {};
  for (const z of zeilen.slice(1)) {
    const f = csvZeile(z);
    const w = Math.max(Number(f[iV]) || 0, Number(f[iT]) || 0);
    if (!f[iP]) continue;
    (erg[f[iP]] ||= []).push({ t: f[iA], wert: w });
  }
  return erg;
}

export function erstelleZahlen({ repo, ordner, geheim, senden = () => {}, log = () => {}, belohnen = () => {}, beiGeteilt = () => {}, teilVon = null, beiTreffer = null, nachSchreiben = () => {} }) {
  fs.mkdirSync(ordner, { recursive: true });
  const STAND = path.join(ordner, "stand.json");
  const VERLAUF = path.join(ordner, "verlauf.jsonl");
  const FOLGEN24 = path.join(ordner, "folgen24.json");
  const METRIKEN = path.join(repo, "data", "insights", "metriken.csv");
  // aufrufe_punkte: stündliche Aufrufe junger Posts (für die 24-h-Marke), v24/f24: eingefrorene 24-h-Werte, treffer_gemeldet: je Post einmal
  let s = { profile: {}, start: {}, posts: [], vorher: {}, letzte: {}, gedrosselt_bis: null, fehler: {}, erreicht: {}, aufrufe_punkte: {}, v24: {}, f24: {}, treffer_gemeldet: {} };
  try { s = { ...s, ...JSON.parse(fs.readFileSync(STAND, "utf8")) }; } catch { /* erster Start */ }
  for (const k of ["aufrufe_punkte", "v24", "f24", "treffer_gemeldet"]) s[k] ||= {};
  const sichern = () => fsp.writeFile(STAND, JSON.stringify(s, null, 1)).catch(() => {});
  const laeuft = { profile: false, videos: false };

  // Follower-Verlauf je Kanal im Speicher (Datei einmal lesen, danach nur anhängen)
  const followerPunkte = {};
  try {
    for (const z of fs.readFileSync(VERLAUF, "utf8").split("\n")) {
      if (!z) continue;
      try { const e = JSON.parse(z); (followerPunkte[e.kanal] ||= []).push({ t: e.zeit, wert: e.follower }); } catch { /* defekte Zeile */ }
    }
  } catch { /* noch kein Verlauf */ }
  for (const k of Object.keys(followerPunkte)) followerPunkte[k] = punkteOrdnen(followerPunkte[k]);

  // Tägliche Momentaufnahmen der Lernschleife (nur neu lesen, wenn sich die Datei geändert hat)
  let metriken = { mtime: 0, punkte: {} };
  function metrikenLesen() {
    try {
      const st = fs.statSync(METRIKEN);
      if (st.mtimeMs !== metriken.mtime) metriken = { mtime: st.mtimeMs, punkte: metrikenPunkte(fs.readFileSync(METRIKEN, "utf8")) };
    } catch { /* keine Datei */ }
    return metriken.punkte;
  }

  function python(args, mitBuffer) {
    return new Promise((ok) => {
      const env = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" };
      for (const k of Object.keys(env)) if (/^BUFFER_|^SUPABASE_|^ELEVEN/i.test(k)) delete env[k];
      if (mitBuffer) { env.BUFFER_API_KEY = geheim.BUFFER_API_KEY; if (geheim.BUFFER_ORG_ID) env.BUFFER_ORG_ID = geheim.BUFFER_ORG_ID; }
      execFile("py", ["-3", path.join("cockpit", "werkzeuge", "live_zahlen.py"), ...args], { cwd: repo, env, windowsHide: true, timeout: 180000, maxBuffer: 8 << 20, encoding: "utf8" },
        (err, out, fehlerText) => {
          let daten = null;
          try { daten = JSON.parse(String(out).trim().split(/\r?\n/).pop()); } catch { daten = null; }
          ok({ code: err ? (typeof err.code === "number" ? err.code : 1) : 0, daten, fehlerText: String(fehlerText || "").slice(-400) });
        });
    });
  }

  const tiktokGesperrt = () => s.gedrosselt_bis && Date.now() < Date.parse(s.gedrosselt_bis);
  function drosselung(an) {
    if (!an) return;
    s.gedrosselt_bis = new Date(Date.now() + PAUSE_GEDROSSELT).toISOString();
    log(`TikTok drosselt: Pause bis ${s.gedrosselt_bis}`);
  }

  async function profileAbrufen() {
    if (laeuft.profile || tiktokGesperrt()) return;
    laeuft.profile = true;
    try {
      const r = await python(["profile"], false);
      drosselung(r.code === 4 || r.daten?.gedrosselt);
      if (r.daten?.profile) {
        const zeit = r.daten.zeit || new Date().toISOString();
        for (const [kanal, p] of Object.entries(r.daten.profile)) {
          if (!p) continue;
          const alt = s.profile[kanal];
          s.profile[kanal] = { ...p, zeit };
          if (s.start[kanal] === undefined) { s.start[kanal] = { follower: p.follower, zeit }; beiGeteilt(); }
          await fsp.appendFile(VERLAUF, JSON.stringify({ zeit, kanal, follower: p.follower, likes: p.likes, videos: p.videos }) + "\n").catch(() => {});
          if (Number.isFinite(p.follower) && Number.isFinite(Date.parse(zeit))) (followerPunkte[kanal] ||= []).push({ t: Date.parse(zeit), wert: p.follower });
          if (alt && p.follower > alt.follower) senden("zahlen_puls", { kanal, art: "follower", plus: p.follower - alt.follower, wert: p.follower });
        }
        s.fehler.profile = null;
      } else s.fehler.profile = r.daten?.fehler || r.fehlerText || "Keine Profildaten";
      s.letzte.profile = new Date().toISOString();
      fertig();
    } finally { laeuft.profile = false; }
  }

  async function videosAbrufen() {
    if (laeuft.videos) return;
    if (!geheim.BUFFER_API_KEY) { s.fehler.videos = "BUFFER_API_KEY fehlt in der .env"; fertig(); return; }
    laeuft.videos = true;
    try {
      const r = await python(["videos", "--tiktok", tiktokGesperrt() ? "0" : "4"], true);
      drosselung(r.daten?.gedrosselt);
      if (r.daten?.posts) {
        const alt = new Map((s.posts || []).map((p) => [p.post_id, p]));
        s.vorher = Object.fromEntries((s.posts || []).map((p) => [p.post_id, ansicht(p).views]));
        // TikTok-Werte aus früheren Läufen behalten, wenn diesmal keine Seite abgerufen wurde
        s.posts = r.daten.posts.map((p) => ({ ...p, tiktok: p.tiktok || alt.get(p.post_id)?.tiktok || null, dauer_s: p.dauer_s || alt.get(p.post_id)?.dauer_s || null }));
        const jetztMs = Date.now();
        for (const p of s.posts) {
          const vorher = s.vorher[p.post_id];
          const jetzt = ansicht(p).views;
          if (vorher !== undefined && jetzt > vorher) senden("zahlen_puls", { kanal: p.kanal, art: "views", plus: jetzt - vorher, wert: jetzt, titel: p.titel });
          // Aufrufe junger Posts stündlich festhalten (für die Aufrufe nach 24 h)
          if (jetztMs - Date.parse(p.gesendet) < 36 * STUNDE) (s.aufrufe_punkte[p.post_id] ||= []).push([new Date(jetztMs).toISOString(), jetzt]);
        }
        const aktuell = new Set(s.posts.map((p) => p.post_id));
        for (const id of Object.keys(s.aufrufe_punkte)) {
          const p = s.posts.find((x) => x.post_id === id);
          if (!aktuell.has(id) || (p && jetztMs - Date.parse(p.gesendet) > 4 * TAG)) delete s.aufrufe_punkte[id];
        }
        s.fehler.videos = null;
      } else s.fehler.videos = r.daten?.fehler || r.fehlerText || "Keine Videodaten";
      s.letzte.videos = new Date().toISOString();
      fertig();
    } finally { laeuft.videos = false; }
  }

  // Ein Post mit den besten verfügbaren Zahlen (TikTok-Seite ist aktueller als Buffer)
  function ansicht(p) {
    const b = p.buffer || {}, t = p.tiktok || {};
    const best = (k) => Math.max(t[k] ?? -1, b[k] ?? -1, 0);
    const dauer = p.dauer_s || null;
    const avg = Number(b.avg_watch_s) || null;
    return {
      ...p, konto: KONTO_VON_KANAL[p.kanal] || p.kanal,
      views: best("views"), likes: best("likes"), kommentare: best("kommentare"), shares: best("shares"), saves: best("saves"),
      follows: b.follows ?? null, engagement: b.engagement ?? null, avg_watch_s: avg,
      gesehen_prozent: avg && dauer ? Math.round((avg / dauer) * 100) : null,
      trend: s.vorher?.[p.post_id] !== undefined ? best("views") - s.vorher[p.post_id] : null,
      ...(auswertung.get(p.post_id) || {}),
    };
  }

  // ───────── Zielgröße und Treffer (Wahl des Inhabers 08.11.2026, lib/treffer.mjs) ─────────
  // Je Post: Follower-Zuwachs 24 h (plus24, netto), Aufrufe nach 24 h (v24), Follows je 1.000 (je1000), Faktor gegen den Median
  // der letzten 10 Videos des Accounts (treffer_faktor) und Serie (teil, naechster_teil). 24-h-Werte werden eingefroren.
  let auswertung = new Map();
  let ausgewertet = false;
  function auswerten() {
    ausgewertet = true;
    const jetzt = Date.now();
    const tagesPunkte = metrikenLesen();
    const neu = new Map();
    for (const kanal of Object.keys(KONTO_VON_KANAL)) {
      const posts = (s.posts || []).filter((p) => p.kanal === kanal);
      const fp = punkteOrdnen(followerPunkte[kanal] || []);
      followerPunkte[kanal] = fp;
      for (const p of posts) {
        if (!s.f24[p.post_id]) {
          const z = zuwachs24(p.gesendet, fp, jetzt);
          if (z.status === "ok") s.f24[p.post_id] = { plus: z.plus, geschaetzt: !!z.geschaetzt };
          else neu.set(p.post_id, { plus24: null, plus24_bisher: z.bisher ?? null, plus24_status: z.status });
        }
        if (!s.v24[p.post_id]) {
          const punkte = [...(tagesPunkte[p.post_id] || []), ...(s.aufrufe_punkte[p.post_id] || []).map(([t, wert]) => ({ t, wert }))];
          const a = aufrufe24(p.gesendet, punkte, jetzt);
          if (a.status === "ok") s.v24[p.post_id] = { views: a.views, geschaetzt: !!a.geschaetzt };
        }
      }
      const b = bewerten(posts.map((p) => ({ post_id: p.post_id, gesendet: p.gesendet, v24: s.v24[p.post_id]?.views ?? null })));
      for (const p of posts) {
        const f = s.f24[p.post_id], v = s.v24[p.post_id], bw = b.get(p.post_id) || {};
        const serie = (teilVon && teilVon(p)) || { teil: teilAusText(p.titel) };
        const teil = serie.teil || 1;
        neu.set(p.post_id, {
          plus24: f ? f.plus : null, plus24_geschaetzt: f ? f.geschaetzt : null, plus24_bisher: neu.get(p.post_id)?.plus24_bisher ?? null,
          plus24_status: f ? "ok" : neu.get(p.post_id)?.plus24_status || "keine_daten",
          v24: v ? v.views : null, v24_geschaetzt: v ? v.geschaetzt : null,
          je1000: f && v ? jeTausend(f.plus, v.views) : null,
          treffer_faktor: bw.faktor ?? null, treffer_median: bw.median ?? null, treffer: !!bw.treffer, teil,
          naechster_teil: naechsterTeil(teil, bw),
        });
        trefferMelden(p, neu.get(p.post_id), bw, serie, jetzt);
      }
    }
    auswertung = neu;
    folgenSchreiben();
  }

  // Treffer bzw. Folgeteil ≥ Median → Idee „Teil N“ (nur frische Posts: 24-h-Marke höchstens 72 h her; je Post einmal)
  function trefferMelden(p, a, bw, serie, jetzt) {
    if (!a.naechster_teil || !beiTreffer || s.treffer_gemeldet[p.post_id]) return;
    const marke = Date.parse(p.gesendet) + TAG;
    if (jetzt - marke > FRISCH_H * STUNDE) return;
    s.treffer_gemeldet[p.post_id] = new Date(jetzt).toISOString();
    sichern();
    Promise.resolve(beiTreffer({ konto: KONTO_VON_KANAL[p.kanal], kanal: p.kanal, post: p, teil: a.naechster_teil, bewertung: bw, views24: a.v24, serie }))
      .then((ok) => { if (ok === null) { delete s.treffer_gemeldet[p.post_id]; sichern(); } }) // Abgleich gerade weg: beim nächsten Lauf erneut
      .catch((e) => log(`Treffer ${p.post_id}: ${e.message}`));
  }

  // Für die Lernschleife (cockpit/anleitung/lernschleife.md): eine Zeile je Post
  function folgenSchreiben() {
    const zeilen = (s.posts || []).map((p) => {
      const a = auswertung.get(p.post_id) || {};
      return { kanal: p.kanal, post_id: p.post_id, projekt: p.projekt || null, gesendet: p.gesendet, titel: String(p.titel || "").slice(0, 120),
        plus24: a.plus24 ?? null, plus24_geschaetzt: a.plus24_geschaetzt ?? null, views24: a.v24 ?? null, views24_geschaetzt: a.v24_geschaetzt ?? null,
        je1000: a.je1000 ?? null, faktor_median: a.treffer_faktor ?? null, median10: a.treffer_median ?? null, treffer: !!a.treffer, teil: a.teil ?? 1, naechster_teil: a.naechster_teil ?? null };
    });
    fsp.writeFile(FOLGEN24, JSON.stringify({ stand: new Date().toISOString(), hinweis: "plus24 = Follower-Zuwachs 24 h nach dem Post (netto, zwei Posts am Tag überlappen); views24 = Aufrufe nach 24 h; je1000 = plus24 / views24 × 1000; faktor_median = views24 / Median der letzten 10 Videos", posts: zeilen }, null, 1)).catch(() => {});
  }

  function missionen() {
    const ergebnis = {};
    for (const [kanal, konto] of Object.entries(KONTO_VON_KANAL)) {
      const posts = (s.posts || []).filter((p) => p.kanal === kanal).map(ansicht);
      const prof = s.profile[kanal];
      const reif = posts.filter((p) => Date.now() - Date.parse(p.gesendet) > 24 * 3600 * 1000);
      const sum = (k) => posts.reduce((a, p) => a + (p[k] || 0), 0);
      const views = sum("views");
      // Follower je 1.000 Aufrufe: Buffer liefert `follows` nicht (0 von 144 Zeilen). Die Summe der 24-h-Zuwächse zählt doppelt
      // (zwei Posts am Tag überlappen), deshalb hier echter Follower-Zuwachs seit dem Start gegen die Aufrufe der Videos seit dem Start.
      const startZeit = s.start[kanal] ? Date.parse(s.start[kanal].zeit) : null;
      const follows = prof && s.start[kanal] ? prof.follower - s.start[kanal].follower : 0;
      const views24 = startZeit ? posts.filter((p) => Date.parse(p.gesendet) >= startZeit).reduce((a, p) => a + (p.views || 0), 0) : 0;
      const werte = {
        follower_10k: prof?.follower ?? null,
        views_30t: posts.length ? views : null,
        crp_videos: posts.filter((p) => (p.dauer_s || 0) > 60 && p.views >= 1000).length,
        plus_1000: prof && s.start[kanal] ? prof.follower - s.start[kanal].follower : null,
        video_50k: posts.length ? Math.max(...posts.map((p) => p.views)) : null,
        median_5k: reif.length ? median(reif.map((p) => p.views)) : null,
        follow_rate: views24 >= 1000 ? Math.round((follows / views24) * 1000 * 100) / 100 : null,
      };
      ergebnis[konto] = MISSIONEN.map((m) => {
        const wert = werte[m.id];
        const fertig = wert !== null && wert >= m.ziel;
        const schluessel = `${konto}:${m.id}`;
        if (fertig && !s.erreicht[schluessel]) {
          s.erreicht[schluessel] = new Date().toISOString();
          sichern();
          beiGeteilt();
          belohnen({ konto, mission: m, wert });
        }
        return { ...m, wert, fortschritt: wert === null ? 0 : Math.min(1, wert / m.ziel), erreicht: s.erreicht[schluessel] || null };
      });
    }
    return ergebnis;
  }

  function zustand() {
    if (!ausgewertet) { try { auswerten(); } catch (e) { log(`Zahlen-Auswertung: ${e.message}`); } }
    return {
      profile: s.profile, start: s.start, posts: (s.posts || []).map(ansicht), missionen: missionen(),
      letzte: s.letzte, fehler: s.fehler, gedrosselt_bis: tiktokGesperrt() ? s.gedrosselt_bis : null,
      buffer: !!geheim.BUFFER_API_KEY, takt: { profile_min: TAKT_PROFILE / 60000, videos_min: TAKT_VIDEOS / 60000 },
    };
  }

  // Follower-Verlauf der letzten Tage (für die Kurven)
  async function verlauf(tage = 7) {
    const grenze = Date.now() - tage * 86400000;
    const text = await fsp.readFile(VERLAUF, "utf8").catch(() => "");
    return text.split("\n").filter(Boolean).map((z) => { try { return JSON.parse(z); } catch { return null; } }).filter((z) => z && Date.parse(z.zeit) >= grenze);
  }

  function fertig() {
    try { auswerten(); } catch (e) { log(`Zahlen-Auswertung: ${e.message}`); }
    sichern();
    senden("zahlen", zustand());
    // stand.json und folgen24.json sind geschrieben: Folgearbeiten anstoßen (Video-Register, lib/register.mjs)
    try { nachSchreiben(); } catch (e) { log(`Zahlen, Folgearbeit: ${e.message}`); }
  }

  // Gemeinsam mit den anderen Rechnern (Abgleich): Follower beim Start (Mission „+1.000 seit Start“) und erreichte Missionen
  function geteilt() {
    return { start: s.start, erreicht: s.erreicht };
  }
  function geteiltSetzen(g) {
    s.start = g.start || {};
    s.erreicht = g.erreicht || {};
    fertig();
  }

  function starten() {
    const faellig = (art, takt) => !s.letzte[art] || Date.now() - Date.parse(s.letzte[art]) > takt;
    setTimeout(() => { if (faellig("profile", TAKT_PROFILE)) profileAbrufen(); }, 5000);
    setTimeout(() => { if (faellig("videos", TAKT_VIDEOS)) videosAbrufen(); }, 20000);
    setInterval(profileAbrufen, TAKT_PROFILE);
    setInterval(videosAbrufen, TAKT_VIDEOS);
  }

  return { starten, zustand, verlauf, profileAbrufen, videosAbrufen, geteilt, geteiltSetzen };
}
