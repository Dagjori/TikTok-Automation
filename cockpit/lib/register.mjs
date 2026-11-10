// Video-Register (Wunsch des Inhabers 10.11.2026): Alles, was im Cockpit entsteht, steht automatisch in einem Register.
// Schlüssel je Video = Slot-ID (acc1|acc2-JJJJ-MM-TT-mittag|abend). Quellen:
//   daten/db/skripte/<id>.json                Idee, Status, Zeiten, Projekt, post_id, Korrekturen, Fehler
//   pipeline/projekte/<projekt>/skript.json   Stil, Format, Testblöcke, lern_notizen (Hook, Länge …)
//   daten/zahlen/stand.json posts[]           gesendet, Link, Länge, Zahlen aus Buffer und TikTok
//   daten/zahlen/folgen24.json                Follower-Zuwachs 24 h, Aufrufe nach 24 h, Treffer, Teil
//   data/produktion/protokoll.csv, data/insights/metriken.csv   nur für ältere Videos ohne Slot-Dokument
// Ausgaben: daten/register.json (alle Felder, für die Oberfläche und die Befehle) und die erzeugte Hirn-Notiz
// hirn/01-Projekt/Video-Register.md (eine Tabelle je Account, neueste zuerst). „Gepostet“ kommt aus posts[].gesendet
// (bzw. einer bestandenen Nachprüfung), nicht aus dem Wunsch-Status des Slots.
// Der Server commitet nie: Die Notiz wird nur geschrieben, wenn kein Claude-Auftrag läuft (darfSchreiben), und nur bei
// geändertem Inhalt. Die Sitzungen nehmen sie in ihren Commit (cockpit/anleitung/produktion.md).
// Nur für Tests: COCKPIT_REGISTER_NOTIZ=<datei> lenkt die Notiz um (nie ins echte hirn/), COCKPIT_REGISTER_TAKT_S verkürzt den Abstand.
// Tests: node --test cockpit/lib/register.test.mjs
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { protokollLesen, csvFelder } from "./protokoll.mjs";
import { frageAusCaption } from "./treffer.mjs";

export const KONTO_NAME = { simulierbar: "Simulierbar", stelldirvor: "Stell dir vor" };
const PRAEFIX = { simulierbar: "acc1", stelldirvor: "acc2" };
const KONTO_VON_KANAL = { simulierbar: "simulierbar", "stelldirvor.pov": "stelldirvor", stelldirvor: "stelldirvor" };
export const STATUS_REIHE = ["Idee", "Skript", "in Produktion", "geplant", "gepostet", "Fehler"];
const STATUS_VON_SLOT = {
  gewaehlt: "Idee", recherche: "Skript", skript_fertig: "Skript", freigegeben: "Skript",
  uebergeben: "in Produktion", produktion: "in Produktion", rueckfrage: "in Produktion", geplant: "geplant", gepostet: "gepostet", fehler: "Fehler",
};
const IDEE_FELDER = ["nr", "typ", "teil", "serie", "feld", "format", "suchbegriff", "nachfrage", "winkel", "punkte"];
const NOTIZ_NAME = "Video-Register";

const zahlOderNull = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const groesste = (...w) => { const z = w.map(zahlOderNull).filter((x) => x !== null); return z.length ? Math.max(...z) : null; };
const berlinTagStunde = (iso) => { const t = new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }); return { tag: t.slice(0, 10), stunde: Number(t.slice(11, 13)) }; };

// data/insights/metriken.csv → je post_id die jüngste Zeile (für Videos, die nicht mehr in stand.json stehen)
export function metrikenLetzte(text) {
  const zeilen = String(text || "").split(/\r?\n/).filter(Boolean);
  if (zeilen.length < 2) return {};
  const kopf = csvFelder(zeilen[0]);
  const erg = {};
  for (const z of zeilen.slice(1)) {
    const f = csvFelder(z);
    const o = Object.fromEntries(kopf.map((k, i) => [k, f[i] ?? ""]));
    if (!o.post_id) continue;
    if (!erg[o.post_id] || String(o.abruf) >= String(erg[o.post_id].abruf)) erg[o.post_id] = o;
  }
  return erg;
}

function zahlenAus(post, folge, metrik) {
  const b = post?.buffer || {}, t = post?.tiktok || {};
  const dauer = zahlOderNull(post?.dauer_s) ?? zahlOderNull(metrik?.dauer_s);
  const avg = zahlOderNull(b.avg_watch_s) || zahlOderNull(metrik?.avg_watch_s) || null;
  return {
    dauer_s: dauer,
    aufrufe: groesste(b.views, t.views, metrik?.views, metrik?.tt_views),
    likes: groesste(b.likes, t.likes, metrik?.likes, metrik?.tt_likes),
    kommentare: groesste(b.kommentare, t.kommentare, metrik?.kommentare, metrik?.tt_kommentare),
    shares: groesste(b.shares, t.shares, metrik?.shares, metrik?.tt_shares),
    saves: groesste(b.saves, t.saves, metrik?.saves, metrik?.tt_saves),
    avg_watch_s: avg,
    gesehen_prozent: avg && dauer ? Math.round((avg / dauer) * 100) : null,
    follows: zahlOderNull(folge?.plus24) ?? zahlOderNull(b.follows) ?? zahlOderNull(metrik?.follows),
    follows_art: zahlOderNull(folge?.plus24) !== null ? "plus24" : "buffer",
    plus24: zahlOderNull(folge?.plus24), views24: zahlOderNull(folge?.views24),
    treffer: !!folge?.treffer, teil: zahlOderNull(folge?.teil), faktor_median: zahlOderNull(folge?.faktor_median),
  };
}

function ausProjekt(skript) {
  if (!skript || typeof skript !== "object") return {};
  const l = skript.lern_notizen && typeof skript.lern_notizen === "object" ? skript.lern_notizen : {};
  return {
    stil: skript.stil ?? l.stil ?? null,
    format: skript.format ?? null,
    testbloecke: skript.testbloecke && Object.keys(skript.testbloecke).length ? skript.testbloecke : null,
    suchbegriff: skript.suchbegriff ?? l.suchbegriff ?? null,
    lern: Object.keys(l).length ? { hook: l.hook ?? null, laenge_s: zahlOderNull(l.laenge_s), thema: l.thema ?? null, woerter: zahlOderNull(l.woerter), helligkeit: l.helligkeit ?? null } : null,
  };
}

// Reine Funktion: alle Quellen → { stand, eintraege: [...], zusammenfassung }.
// slots: [{ id, daten }], projektSkript(name) → skript.json oder null, posts: stand.json posts[], folgen: folgen24.json posts[],
// protokoll: Zeilen aus protokollLesen, metriken: metrikenLetzte(...)
export function registerBauen({ slots = [], projektSkript = () => null, posts = [], folgen = [], protokoll = [], metriken = {}, jetzt = new Date() } = {}) {
  const jetztMs = jetzt.getTime();
  const postVonId = new Map(posts.filter((p) => p?.post_id).map((p) => [p.post_id, p]));
  const folgeVonId = new Map(folgen.filter((p) => p?.post_id).map((p) => [p.post_id, p]));
  const protVonId = new Map(protokoll.filter((z) => z.post_id).map((z) => [z.post_id, z]));
  const benutzt = new Set();
  const eintraege = new Map();
  const gesendet = (p) => !!p?.gesendet && Date.parse(p.gesendet) <= jetztMs;

  const fertig = (e, post, metrik) => {
    const folge = e.post_id ? folgeVonId.get(e.post_id) : null;
    e.zahlen = zahlenAus(post, folge, metrik);
    e.gesendet = post?.gesendet || metrik?.gesendet || e.gesendet || null;
    e.link = post?.link || e.link || null;
    if (gesendet(post) || (metrik?.gesendet && Date.parse(metrik.gesendet) <= jetztMs)) e.status = "gepostet";
    e.laenge_s = e.zahlen.dauer_s ?? e.lern?.laenge_s ?? null;
    e.teil = e.idee?.teil ?? e.zahlen.teil ?? 1;
    return e;
  };

  // 1. Slot-Dokumente des Cockpits
  for (const { id, daten: x } of slots) {
    if (!x || !x.konto || !x.datum) continue;
    const kanal = Object.keys(KONTO_VON_KANAL).find((k) => KONTO_VON_KANAL[k] === x.konto);
    const postId = x.post_id || x.buffer_post_id || null;
    let post = postId ? postVonId.get(postId) : null;
    if (!post && x.projekt) post = posts.find((p) => p.projekt === x.projekt && KONTO_VON_KANAL[p.kanal] === x.konto && !benutzt.has(p.post_id)) || null;
    if (post) benutzt.add(post.post_id);
    const pid = postId || post?.post_id || null;
    if (pid) benutzt.add(pid);
    const proj = ausProjekt(x.projekt ? projektSkript(x.projekt) : null);
    const idee = x.idee && typeof x.idee === "object" ? Object.fromEntries(IDEE_FELDER.filter((k) => x.idee[k] !== undefined && x.idee[k] !== "").map((k) => [k, x.idee[k]])) : {};
    if (!idee.suchbegriff && (x.skript?.suchbegriff || proj.suchbegriff)) idee.suchbegriff = x.skript?.suchbegriff || proj.suchbegriff;
    const e = {
      id, konto: x.konto, kanal: kanal || x.konto, datum: x.datum, slot: x.slot, uhrzeit: x.uhrzeit || null,
      titel: x.titel || x.idee?.titel || id, thema: x.thema || "", idee,
      slot_status: x.status || null, status: STATUS_VON_SLOT[x.status] || "Idee",
      projekt: x.projekt || null, post_id: pid, geplant_fuer: x.geplant_fuer || null, nachgeprueft: x.nachgeprueft || null,
      korrekturen: Array.isArray(x.korrekturen) ? x.korrekturen.length : 0,
      fehler: x.status === "fehler" ? String(x.fehler || "").slice(0, 300) : "", fehler_phase: x.status === "fehler" ? x.fehler_phase || "" : "",
      zeiten: { erstellt: x.erstellt || null, angefordert: x.angefordert || null, freigegeben_am: x.freigegeben_am || null, uebergeben_am: x.uebergeben_am || null, aktualisiert: x.aktualisiert || null },
      automatisch: { gewaehlt: !!x.auto_gewaehlt, freigegeben: !!x.auto_freigegeben },
      stil: proj.stil || null, format: idee.format || proj.format || null, testbloecke: proj.testbloecke || x.skript?.testbloecke || null, lern: proj.lern || null,
      quelle: "cockpit",
    };
    eintraege.set(id, fertig(e, post, pid ? metriken[pid] : null));
  }

  // 2. Ältere Videos aus dem Protokoll (ohne Slot-Dokument)
  for (const z of protokoll) {
    const konto = KONTO_VON_KANAL[z.konto];
    if (!konto || !z.datum || !z.slot) continue;
    const id = `${PRAEFIX[konto]}-${z.datum}-${z.slot}`;
    const da = eintraege.get(id);
    if (da) { if (!da.projekt && z.projekt) da.projekt = z.projekt; continue; }
    if (z.post_id && benutzt.has(z.post_id)) continue;
    const post = z.post_id ? postVonId.get(z.post_id) : null;
    if (z.post_id) benutzt.add(z.post_id);
    const proj = ausProjekt(z.projekt ? projektSkript(z.projekt) : null);
    const e = {
      id, konto, kanal: z.konto, datum: z.datum, slot: z.slot, uhrzeit: null, titel: z.titel, thema: "", idee: proj.suchbegriff ? { suchbegriff: proj.suchbegriff } : {},
      slot_status: null, status: z.status === "gepostet" ? "gepostet" : z.status === "fehler" ? "Fehler" : "geplant",
      projekt: z.projekt || null, post_id: z.post_id || null, geplant_fuer: null, nachgeprueft: null, korrekturen: 0, fehler: "", fehler_phase: "",
      zeiten: {}, automatisch: { gewaehlt: false, freigegeben: false },
      stil: proj.stil || null, format: proj.format || null, testbloecke: proj.testbloecke || null, lern: proj.lern || null, quelle: "protokoll",
    };
    eintraege.set(id, fertig(e, post, z.post_id ? metriken[z.post_id] : null));
  }

  // 3. Gesendete Posts, die weder Slot noch Protokollzeile haben (Buffer bzw. Insights)
  const rest = [
    ...posts.filter((p) => p?.post_id && !benutzt.has(p.post_id)).map((p) => ({ p, m: metriken[p.post_id] || null, quelle: "buffer" })),
    ...Object.values(metriken).filter((m) => m.post_id && !benutzt.has(m.post_id) && !postVonId.has(m.post_id)).map((m) => ({ p: null, m, quelle: "insights" })),
  ];
  for (const { p, m, quelle } of rest) {
    const kanal = p?.kanal || m?.kanal, konto = KONTO_VON_KANAL[kanal];
    const zeit = p?.gesendet || m?.gesendet;
    if (!konto || !zeit || !Number.isFinite(Date.parse(zeit))) continue;
    const { tag, stunde } = berlinTagStunde(zeit);
    const slot = stunde < 16 ? "mittag" : "abend";
    let id = `${PRAEFIX[konto]}-${tag}-${slot}`;
    const postId = p?.post_id || m.post_id;
    if (eintraege.has(id)) {
      const da = eintraege.get(id);
      // Derselbe Slot ohne bekannte post_id (z. B. noch „geplant“ ohne Nachprüfung): zusammenführen statt doppelt führen
      if (!da.post_id && (!da.projekt || !(p?.projekt || m?.projekt) || da.projekt === (p?.projekt || m?.projekt))) {
        da.post_id = postId;
        benutzt.add(postId);
        fertig(da, p, m);
        continue;
      }
      id = `${id}-x${String(postId).slice(-4)}`;
    }
    benutzt.add(postId);
    const projekt = p?.projekt || m?.projekt || null;
    const proj = ausProjekt(projekt ? projektSkript(projekt) : null);
    const prot = protVonId.get(postId);
    const e = {
      id, konto, kanal, datum: tag, slot, uhrzeit: null, titel: prot?.titel || frageAusCaption(String(p?.titel || m?.titel || projekt || postId).split(/[–—|]| - /)[0]).slice(0, 120), thema: "",
      idee: proj.suchbegriff ? { suchbegriff: proj.suchbegriff } : {}, slot_status: null, status: "gepostet",
      projekt, post_id: postId, geplant_fuer: null, nachgeprueft: null, korrekturen: 0, fehler: "", fehler_phase: "",
      zeiten: {}, automatisch: { gewaehlt: false, freigegeben: false },
      stil: proj.stil || null, format: proj.format || null, testbloecke: proj.testbloecke || null, lern: proj.lern || null, quelle,
    };
    eintraege.set(id, fertig(e, p, m));
  }

  const liste = [...eintraege.values()].sort((a, b) => (b.datum + (b.slot === "abend" ? "2" : "1")).localeCompare(a.datum + (a.slot === "abend" ? "2" : "1")) || a.konto.localeCompare(b.konto) || a.id.localeCompare(b.id));
  return { stand: jetzt.toISOString(), eintraege: liste, zusammenfassung: zusammenfassen(liste) };
}

export function zusammenfassen(liste) {
  const jeStatus = Object.fromEntries(STATUS_REIHE.map((s) => [s, 0]));
  const jeFormat = {}, jeKonto = {};
  for (const e of liste) {
    jeStatus[e.status] = (jeStatus[e.status] || 0) + 1;
    const f = String(e.format || "ohne Angabe");
    jeFormat[f] = (jeFormat[f] || 0) + 1;
    (jeKonto[e.konto] ||= { gesamt: 0, gepostet: 0 }).gesamt++;
    if (e.status === "gepostet") jeKonto[e.konto].gepostet++;
  }
  return { gesamt: liste.length, je_status: jeStatus, je_format: jeFormat, je_konto: jeKonto };
}

// Für die Befehle (Ideen, Skript): bisherige Videos eines Kontos als „Titel (Suchbegriff: …)“, neueste zuerst
export function bisherListe(eintraege = [], konto, hoechstens = 80) {
  const zeilen = [], gesehen = new Set();
  for (const e of eintraege) {
    if (e.konto !== konto || !e.titel) continue;
    const k = String(e.titel).trim().toLowerCase();
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    const such = e.idee?.suchbegriff ? ` (Suchbegriff: ${e.idee.suchbegriff})` : "";
    zeilen.push(`${String(e.titel).trim()}${such}`);
    if (zeilen.length >= hoechstens) break;
  }
  return zeilen;
}

// ───────── Hirn-Notiz ─────────
const zelle = (t) => String(t ?? "").replace(/\r?\n/g, " ").replace(/\|/g, "∣").replace(/\[\[/g, "[ [").replace(/\]\]/g, "] ]").trim();
const tausender = (n) => (n === null || n === undefined ? "–" : Number(n).toLocaleString("de-DE"));
const datumKurz = (d) => `${d.slice(8, 10)}.${d.slice(5, 7)}.`;
const SLOT_NAME = { mittag: "Mittag", abend: "Abend" };

function zeileNotiz(e) {
  const titel = zelle(e.titel).replace(/[[\]]/g, "");
  const link = String(e.link || "").split("?")[0]; // ohne Zähl-Anhängsel (utm_…)
  const mitLink = link && e.status === "gepostet" && /^https:\/\/[^\s)]+$/.test(link) ? `[${titel}](${link})` : titel;
  const feldFormat = [e.idee?.feld, e.format].filter(Boolean).map(zelle).join(" · ") || "–";
  const z = e.zahlen || {};
  const wiedergabe = z.avg_watch_s ? `${String(Math.round(z.avg_watch_s * 10) / 10).replace(".", ",")} s${z.gesehen_prozent ? ` (${z.gesehen_prozent} %)` : ""}` : "–";
  const follows = z.follows === null || z.follows === undefined ? "–" : `${z.follows > 0 ? "+" : ""}${tausender(z.follows)}`;
  const teil = Number(e.teil) > 1 || e.idee?.typ === "folgeteil" ? `Teil ${e.teil || e.idee?.teil || 2}` : "";
  const treffer = [z.treffer ? "Treffer" : "", teil].filter(Boolean).join(" · ") || "–";
  const status = e.status === "Fehler" && e.fehler_phase ? `Fehler (${e.fehler_phase})` : e.status;
  return `| ${datumKurz(e.datum)} | ${SLOT_NAME[e.slot] || zelle(e.slot)} | ${mitLink} | ${feldFormat} | ${status} | ${e.laenge_s ? `${Math.round(e.laenge_s)} s` : "–"} | ${tausender(z.aufrufe)} | ${wiedergabe} | ${follows} | ${treffer} |`;
}

// register → Markdown der Notiz. datum (JJJJ-MM-TT) steht im Kopf; alles andere hängt nur vom Register ab.
export function registerNotiz(register, datum) {
  const { eintraege, zusammenfassung: zf } = register;
  const kopf = [
    "---", "typ: wissen", "konto: gemeinsam", "status: aktuell", `datum: ${datum}`, "quelle: cockpit/lib/register.mjs",
    "tags: [konto/gemeinsam, cockpit, register, videos]", "cssclasses: [konto-gemeinsam, typ-wissen]", "---", "",
    `# ${NOTIZ_NAME}`, "",
    "> Diese Notiz wird vom Cockpit erzeugt, nicht von Hand ändern (`cockpit/lib/register.mjs`). Jedes Video, das im Cockpit entsteht, steht hier automatisch: von der gewählten Idee bis zu den Zahlen nach dem Posten. Alle Felder je Video liegen in `cockpit/daten/register.json`, die Ansicht dazu ist im Cockpit unter „Register“ ([[Cockpit]]).",
    "",
    "## Überblick", "",
    `- **Videos im Register:** ${zf.gesamt} (${Object.entries(zf.je_konto).map(([k, v]) => `${KONTO_NAME[k] || k} ${v.gesamt}, davon ${v.gepostet} gepostet`).join(" · ") || "noch keine"})`,
    `- **Nach Status:** ${STATUS_REIHE.map((s) => `${s} ${zf.je_status[s] || 0}`).join(" · ")}`,
    `- **Nach Format:** ${Object.entries(zf.je_format).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([f, n]) => `${zelle(f)} ${n}`).join(" · ") || "–"}`,
    "- **Lesart:** „gepostet“ heißt, Buffer hat das Video gesendet (oder die Nachprüfung hat es bestätigt). Follows = Follower-Zuwachs in den 24 Stunden nach dem Post (netto, zwei Videos am Tag überlappen). Ø-Wiedergabe = durchschnittliche Wiedergabezeit, in Klammern der Anteil an der Länge.",
    "",
  ];
  const teile = [];
  for (const konto of Object.keys(KONTO_NAME)) {
    const liste = eintraege.filter((e) => e.konto === konto);
    teile.push(`## ${KONTO_NAME[konto]}`, "");
    if (!liste.length) { teile.push("Noch keine Videos.", ""); continue; }
    teile.push("| Datum | Slot | Titel | Feld · Format | Status | Länge | Aufrufe | Ø-Wiedergabe | Follows | Treffer · Teil |", "|---|---|---|---|---|---|---|---|---|---|");
    for (const e of liste) teile.push(zeileNotiz(e));
    teile.push("");
  }
  teile.push("Verwandt: [[Pipeline und Skills]] · [[Lernschleife und Insights]] · [[Serien und Treffer-Folgen]] · [[Index]]", "");
  return [...kopf, ...teile].join("\n");
}

// Vergleich ohne die Datumszeile des Kopfes (sonst würde die Notiz jeden Tag ohne neuen Inhalt neu geschrieben)
export const ohneDatum = (text) => String(text || "").replace(/^datum: .*$/m, "datum:").replace(/\r\n/g, "\n");

// ───────── Dienst im Server ─────────
export function quellenLesen({ db, repo, daten }) {
  const json = (datei, std) => { try { return JSON.parse(fs.readFileSync(datei, "utf8")); } catch { return std; } };
  const text = (datei) => { try { return fs.readFileSync(datei, "utf8"); } catch { return ""; } };
  const skriptCache = new Map();
  const slots = db ? db.liste("skripte") : fs.readdirSync(path.join(daten, "db", "skripte")).filter((f) => f.endsWith(".json")).map((f) => ({ id: f.slice(0, -5), daten: json(path.join(daten, "db", "skripte", f), {}).daten })).filter((d) => d.daten);
  return {
    slots,
    projektSkript: (name) => {
      if (!/^[A-Za-z0-9_.-]+$/.test(name || "")) return null;
      if (!skriptCache.has(name)) skriptCache.set(name, json(path.join(repo, "pipeline", "projekte", name, "skript.json"), null));
      return skriptCache.get(name);
    },
    posts: json(path.join(daten, "zahlen", "stand.json"), {}).posts || [],
    folgen: json(path.join(daten, "zahlen", "folgen24.json"), {}).posts || [],
    protokoll: protokollLesen(text(path.join(repo, "data", "produktion", "protokoll.csv"))),
    metriken: metrikenLetzte(text(path.join(repo, "data", "insights", "metriken.csv"))),
  };
}

export function erstelleRegister({ db = null, repo, daten, notizDatei = null, darfSchreiben = () => true, heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }), log = () => {}, senden = () => {}, taktS = 30 }) {
  const DATEI = path.join(daten, "register.json");
  const NOTIZ = notizDatei || path.join(repo, "hirn", "01-Projekt", `${NOTIZ_NAME}.md`);
  let register = null, timer = null, zuletzt = 0, notizOffen = false, letzterFehler = "";
  try { register = JSON.parse(fs.readFileSync(DATEI, "utf8")); } catch { register = null; }

  function bauen() {
    return registerBauen({ ...quellenLesen({ db, repo, daten }), jetzt: new Date() });
  }

  // Notiz nur bei geändertem Inhalt und nur, wenn gerade kein Claude-Auftrag läuft (sonst merken und später nachholen)
  async function notizSchreiben({ erzwingen = false } = {}) {
    if (!register) return { geschrieben: false, grund: "kein Register" };
    if (!erzwingen && !darfSchreiben()) { notizOffen = true; return { geschrieben: false, grund: "ein Claude-Auftrag läuft, wird nachgeholt" }; }
    const neu = registerNotiz(register, heute());
    const alt = await fsp.readFile(NOTIZ, "utf8").catch(() => null);
    notizOffen = false;
    if (alt !== null && ohneDatum(alt) === ohneDatum(neu)) return { geschrieben: false, grund: "unverändert" };
    await fsp.mkdir(path.dirname(NOTIZ), { recursive: true });
    await fsp.writeFile(NOTIZ + ".tmp", neu, "utf8");
    await fsp.rename(NOTIZ + ".tmp", NOTIZ);
    log(`Video-Register: Notiz geschrieben (${register.eintraege.length} Videos)`);
    return { geschrieben: true, datei: NOTIZ };
  }

  async function aktualisieren(opt = {}) {
    zuletzt = Date.now();
    try {
      const neu = bauen();
      const geaendert = !register || JSON.stringify(neu.eintraege) !== JSON.stringify(register.eintraege);
      register = neu;
      if (geaendert) {
        await fsp.writeFile(DATEI + ".tmp", JSON.stringify(neu, null, 1), "utf8");
        await fsp.rename(DATEI + ".tmp", DATEI);
        senden("register", { stand: neu.stand, zusammenfassung: neu.zusammenfassung });
      }
      const notiz = await notizSchreiben(opt);
      letzterFehler = "";
      return { ok: true, geaendert, notiz, videos: neu.eintraege.length };
    } catch (e) {
      if (letzterFehler !== e.message) log(`Video-Register: ${e.message}`);
      letzterFehler = e.message;
      return { ok: false, fehler: e.message };
    }
  }

  // Gebündelt: frühestens taktS nach dem letzten Lauf
  function anstossen() {
    if (timer) return;
    const warten = Math.max(1500, zuletzt + taktS * 1000 - Date.now());
    timer = setTimeout(() => { timer = null; aktualisieren(); }, warten);
    timer.unref?.();
  }

  function starten() {
    setTimeout(() => aktualisieren(), 8000).unref?.();
    // Aufgeschobene Notiz nachholen, sobald kein Auftrag mehr läuft
    setInterval(() => { if (notizOffen && darfSchreiben()) notizSchreiben().catch(() => {}); }, 30000).unref?.();
  }

  return {
    starten, anstossen, aktualisieren, notizSchreiben,
    lesen: () => register || { stand: null, eintraege: [], zusammenfassung: zusammenfassen([]) },
    bisher: (konto, n) => bisherListe((register || bauenSicher()).eintraege, konto, n),
    notizDatei: NOTIZ,
  };

  function bauenSicher() {
    try { register = bauen(); } catch { register = { stand: null, eintraege: [], zusammenfassung: zusammenfassen([]) }; }
    return register;
  }
}
