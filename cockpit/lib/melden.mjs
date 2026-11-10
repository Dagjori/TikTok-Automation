// Meldungen aufs Handy (Ausbau 10.11.2026): schickt wichtige Ereignisse des Cockpits per Telegram, wenn TELEGRAM_BOT_TOKEN und
// TELEGRAM_CHAT_ID eingerichtet sind (dieselben Namen wie tools/telegram_senden.py; als Umgebungsvariable oder in
// C:\render\tiktok-automation\pipeline\render_dienst\.env). Ohne die beiden Werte passiert still nichts.
// Geteilte Einstellung „melden“: { aktiv, ideen, skript, rueckfrage, fehler, video, treffer, tagesabschluss,
// tagesabschluss_uhrzeit: "HH:MM" }; fehlt etwas → Standard (alles an, Abschluss 21:30).
// Token und Chat-ID stehen nie im Log, nie im Feed und nie in einer Antwort an die Oberfläche.
// Nur für Tests: COCKPIT_MELDEN_DATEI=<datei> schreibt die Nachrichten in eine Datei statt an Telegram; mit der Attrappe
// (COCKPIT_ATTRAPPE=1) geht nie etwas an Telegram.
import fs from "node:fs";

export const EREIGNISSE = Object.freeze({
  ideen: "Ideen sind bereit",
  skript: "Skript wartet auf deine Freigabe",
  rueckfrage: "Rückfrage zu einem Video",
  fehler: "Fehler nach dem letzten Versuch",
  video: "Video geplant bzw. gepostet",
  treffer: "Treffer (Video weit über dem Schnitt)",
  tagesabschluss: "Tagesabschluss (eine Zeile am Abend)",
});
export const MELDEN_STANDARD = Object.freeze({ aktiv: true, ...Object.fromEntries(Object.keys(EREIGNISSE).map((k) => [k, true])), tagesabschluss_uhrzeit: "21:30" });
const UHRZEIT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const SCHALTER = ["aktiv", ...Object.keys(EREIGNISSE)];
const MAX_LAENGE = 3500;

export function meldenLesen(einstellungen = {}) {
  const m = einstellungen?.melden && typeof einstellungen.melden === "object" ? einstellungen.melden : {};
  const r = { ...MELDEN_STANDARD };
  for (const k of SCHALTER) if (typeof m[k] === "boolean") r[k] = m[k];
  if (typeof m.tagesabschluss_uhrzeit === "string" && UHRZEIT_RE.test(m.tagesabschluss_uhrzeit)) r.tagesabschluss_uhrzeit = m.tagesabschluss_uhrzeit;
  return r;
}

// Änderung aus der Oberfläche prüfen (auch teilweise) → vollständiger neuer Wert
export function meldenPruefen(wert, alt) {
  if (!wert || typeof wert !== "object" || Array.isArray(wert)) throw new Error('melden: Objekt erwartet, z. B. {"ideen": false}');
  const neu = meldenLesen({ melden: alt });
  for (const [k, v] of Object.entries(wert)) {
    if (SCHALTER.includes(k)) {
      if (typeof v !== "boolean") throw new Error(`melden.${k}: true oder false erwartet`);
      neu[k] = v;
    } else if (k === "tagesabschluss_uhrzeit") {
      if (typeof v !== "string" || !UHRZEIT_RE.test(v)) throw new Error("melden.tagesabschluss_uhrzeit: Uhrzeit HH:MM erwartet");
      neu[k] = v;
    } else throw new Error(`melden.${k} gibt es nicht (erlaubt: ${[...SCHALTER, "tagesabschluss_uhrzeit"].join(", ")})`);
  }
  return neu;
}

// Soll dieses Ereignis laut Einstellung gesendet werden?
export const meldenErlaubt = (einstellungen, ereignis) => { const m = meldenLesen(einstellungen); return !!(m.aktiv && EREIGNISSE[ereignis] && m[ereignis]); };

// zugang(): { token, chat } (leer = nicht eingerichtet). senden(ereignis, text) → Promise<{ gesendet, grund? }>, wirft nie.
export function erstelleMelden({ zugang, einstellungen = () => ({}), log = () => {}, holen = (...a) => fetch(...a), testDatei = process.env.COCKPIT_MELDEN_DATEI || "", nurTest = false }) {
  const eingerichtet = () => { const z = zugang() || {}; return !!(z.token && z.chat); };
  let letzterFehler = "";

  async function senden(ereignis, text) {
    try {
      if (!meldenErlaubt(einstellungen(), ereignis)) return { gesendet: false, grund: "ausgeschaltet" };
      const nachricht = String(text || "").trim().slice(0, MAX_LAENGE);
      if (!nachricht) return { gesendet: false, grund: "leer" };
      if (testDatei) {
        fs.appendFileSync(testDatei, JSON.stringify({ zeit: new Date().toISOString(), ereignis, text: nachricht }) + "\n", "utf8");
        return { gesendet: true, test: true };
      }
      if (nurTest) return { gesendet: false, grund: "Test-Instanz" };
      const z = zugang() || {};
      if (!z.token || !z.chat) return { gesendet: false, grund: "nicht eingerichtet" };
      const r = await holen(`https://api.telegram.org/bot${z.token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ chat_id: String(z.chat), text: nachricht, disable_web_page_preview: "true" }).toString(),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`Telegram antwortet mit HTTP ${r.status}`);
      letzterFehler = "";
      return { gesendet: true };
    } catch (e) {
      // Nie den Token loggen: die Adresse mit dem Token steht in manchen Fehlermeldungen
      const grund = String(e?.message || e).replace(/bot[^/\s]+/gi, "bot<GEHEIM>").slice(0, 160);
      if (grund !== letzterFehler) log(`Handy-Meldung (${ereignis}) nicht gesendet: ${grund}`);
      letzterFehler = grund;
      return { gesendet: false, grund };
    }
  }

  return { senden, eingerichtet, test: () => !!testDatei };
}

// Eine Zeile für den Tagesabschluss. slots: Slot-Daten (heute und morgen), profile: { kanal: { follower } }, plusHeute: { kanal: n }
export function tagesabschlussText({ heute, morgen, slots = [], plusHeute = {} }) {
  const am = (tag) => slots.filter((x) => x.datum === tag);
  const zaehl = (liste, ...status) => liste.filter((x) => status.includes(x.status)).length;
  const h = am(heute), m = am(morgen);
  const teile = [`Heute ${zaehl(h, "gepostet")} gepostet${zaehl(h, "geplant") ? `, ${zaehl(h, "geplant")} geplant` : ""}${zaehl(h, "fehler", "rueckfrage") ? `, ${zaehl(h, "fehler", "rueckfrage")} offen` : ""}`];
  const mFertig = zaehl(m, "geplant", "gepostet"), mWartet = zaehl(m, "skript_fertig"), mArbeit = zaehl(m, "gewaehlt", "recherche", "freigegeben", "uebergeben", "produktion");
  teile.push(`Morgen ${mFertig}/4 geplant${mWartet ? `, ${mWartet} Skript${mWartet === 1 ? " wartet" : "e warten"} auf dich` : ""}${mArbeit ? `, ${mArbeit} in Arbeit` : ""}${zaehl(m, "fehler", "rueckfrage") ? `, ${zaehl(m, "fehler", "rueckfrage")} mit Problem` : ""}${!m.length ? " (noch nichts gewählt)" : ""}`);
  const plus = Object.entries(plusHeute).filter(([, n]) => Number.isFinite(n)).map(([k, n]) => `${k} ${n >= 0 ? "+" : ""}${n}`);
  if (plus.length) teile.push(`Follower heute: ${plus.join(", ")}`);
  return `Tagesabschluss ${heute.slice(8, 10)}.${heute.slice(5, 7)}.: ${teile.join(" · ")}`;
}
