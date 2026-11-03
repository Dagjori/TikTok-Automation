// Live-Zahlen und Missionen. Schonender Takt (Entscheidung des Inhabers 03.11.): Profile alle 30 Min., Videos stündlich
// (Buffer-Kennzahlen + öffentliche TikTok-Seiten der 4 neuesten). Drosselt TikTok: 6 Std. Pause für TikTok-Seiten, nie umgehen.
// Ziele der Missionen aus CLAUDE.md §3 (CRP: 10.000 Follower, 100.000 Views in 30 Tagen; Auswertungsziele).
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";

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

export function erstelleZahlen({ repo, ordner, geheim, senden = () => {}, log = () => {}, belohnen = () => {}, beiGeteilt = () => {} }) {
  fs.mkdirSync(ordner, { recursive: true });
  const STAND = path.join(ordner, "stand.json");
  const VERLAUF = path.join(ordner, "verlauf.jsonl");
  let s = { profile: {}, start: {}, posts: [], vorher: {}, letzte: {}, gedrosselt_bis: null, fehler: {}, erreicht: {} };
  try { s = { ...s, ...JSON.parse(fs.readFileSync(STAND, "utf8")) }; } catch { /* erster Start */ }
  const sichern = () => fsp.writeFile(STAND, JSON.stringify(s, null, 1)).catch(() => {});
  const laeuft = { profile: false, videos: false };

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
        for (const p of s.posts) {
          const vorher = s.vorher[p.post_id];
          const jetzt = ansicht(p).views;
          if (vorher !== undefined && jetzt > vorher) senden("zahlen_puls", { kanal: p.kanal, art: "views", plus: jetzt - vorher, wert: jetzt, titel: p.titel });
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
    };
  }

  function missionen() {
    const ergebnis = {};
    for (const [kanal, konto] of Object.entries(KONTO_VON_KANAL)) {
      const posts = (s.posts || []).filter((p) => p.kanal === kanal).map(ansicht);
      const prof = s.profile[kanal];
      const reif = posts.filter((p) => Date.now() - Date.parse(p.gesendet) > 24 * 3600 * 1000);
      const sum = (k) => posts.reduce((a, p) => a + (p[k] || 0), 0);
      const views = sum("views");
      const follows = posts.reduce((a, p) => a + (p.follows || 0), 0);
      const werte = {
        follower_10k: prof?.follower ?? null,
        views_30t: posts.length ? views : null,
        crp_videos: posts.filter((p) => (p.dauer_s || 0) > 60 && p.views >= 1000).length,
        plus_1000: prof && s.start[kanal] ? prof.follower - s.start[kanal].follower : null,
        video_50k: posts.length ? Math.max(...posts.map((p) => p.views)) : null,
        median_5k: reif.length ? median(reif.map((p) => p.views)) : null,
        follow_rate: views >= 1000 ? Math.round((follows / views) * 1000 * 100) / 100 : null,
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
    sichern();
    senden("zahlen", zustand());
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
