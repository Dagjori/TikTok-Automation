// Wache über die Claude-Aufträge des Cockpits (Ausbau 10.11.2026, immer an, reine Funktionen mit Tests in wache.test.mjs):
//   1. Zeitlimit je Auftragsart und „keine Ausgabe seit N Minuten“: wachePruefen → der Server beendet den Prozess und der
//      Auftrag läuft in den normalen Fehlerweg (ein hängender Prozess blockiert seine Spur sonst für immer).
//   2. Nutzungslimit erkennen: limitErkennen liest die Meldung der CLI („You've hit your 5-hour limit · resets 6pm
//      (Europe/Berlin)“, HTTP 429 rate_limit) und liefert die Zeit, ab der es weitergeht.
//   3. Erholung nach Neustart oder Absturz: erholung entscheidet je Slot, der in einem Übergangszustand hängt
//      (recherche, uebergeben, produktion, angeforderte Nachprüfung), wie er zurück auf seinen automatischen Weg kommt.
// Einstellung „wache“ (optional, geteilt): { <art>: { max_min, still_min } } überschreibt die Standardwerte.

// Standard in Minuten. Grundlage sind die gemessenen Laufzeiten bis 10.11.2026 (server.log): Ideen 4–6 Min., Skripte ca. 15 Min.,
// Lernschleife 3–10 Min., Nachprüfung ca. 1 Min., Produktion bis ca. 3 Std. für 4 Videos. Großzügig, damit nie ein gesunder Lauf endet.
export const GRENZEN_STANDARD = Object.freeze({
  ideen: { max_min: 30, still_min: 15 },
  skripte: { max_min: 60, still_min: 20 },
  lernschleife: { max_min: 45, still_min: 20 },
  nachpruefen: { max_min: 15, still_min: 10 },
  produktion: { max_min: 480, still_min: 90 },
  vorschlag_umsetzen: { max_min: 120, still_min: 30 },
  chat: { max_min: 180, still_min: 30 },
  standard: { max_min: 120, still_min: 30 },
});

const zahlOk = (v) => typeof v === "number" && Number.isFinite(v) && v >= 1 && v <= 24 * 60;

// Grenzen einer Auftragsart: Standard, überschrieben durch die Einstellung; umgebung (nur Tests) setzt Sekunden für alle Arten
export function grenzenLesen(art, einstellungen = {}, umgebung = {}) {
  const std = GRENZEN_STANDARD[art] || GRENZEN_STANDARD.standard;
  const eigen = einstellungen?.wache?.[art] || {};
  const g = { max_s: (zahlOk(eigen.max_min) ? eigen.max_min : std.max_min) * 60, still_s: (zahlOk(eigen.still_min) ? eigen.still_min : std.still_min) * 60 };
  if (Number(umgebung.max_s) > 0) g.max_s = Number(umgebung.max_s);
  if (Number(umgebung.still_s) > 0) g.still_s = Number(umgebung.still_s);
  return g;
}

const minuten = (s) => (s >= 5400 ? `${String(Math.round(s / 360) / 10).replace(".", ",")} Std.` : s >= 120 ? `${Math.round(s / 60)} Min.` : `${Math.round(s)} s`);

// null = alles in Ordnung; sonst { grund: "zeit" | "still", text } (Text steht danach im Feed und am Slot)
export function wachePruefen({ startMs, letzteAusgabeMs, jetztMs }, grenzen) {
  if (!startMs || !grenzen) return null;
  if (jetztMs - startMs > grenzen.max_s * 1000) return { grund: "zeit", text: `Zeitlimit: Der Auftrag lief länger als ${minuten(grenzen.max_s)} und wurde beendet.` };
  const still = jetztMs - (letzteAusgabeMs || startMs);
  if (still > grenzen.still_s * 1000) return { grund: "still", text: `Stillstand: ${minuten(grenzen.still_s)} lang kam keine Ausgabe mehr, der Auftrag wurde beendet.` };
  return null;
}

// ───────── Zeit in einer Zeitzone ─────────

// Wanduhr-Zeit einer Zeitzone → Zeitpunkt (ms); Überlauf (Tag 32, Stunde 24) ist erlaubt
export function zonenZeit(jahr, monat, tag, stunde, minute, zone = "Europe/Berlin") {
  const utc = Date.UTC(jahr, monat - 1, tag, stunde, minute);
  const wand = Date.parse(new Date(utc).toLocaleString("sv-SE", { timeZone: zone }).replace(" ", "T") + "Z");
  return utc - (wand - utc);
}

// JJJJ-MM-TT + HH:MM in Berlin als ISO mit Z (für geplant_fuer nach einem Neustart)
export function berlinIso(datum, uhr = "12:00") {
  const [j, m, t] = String(datum).split("-").map(Number);
  const [h, min] = String(uhr || "12:00").split(":").map(Number);
  return new Date(zonenZeit(j, m, t, h || 0, min || 0)).toISOString();
}

const MONATE = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const LIMIT_RE = /(?:hit|reached)\s+your\s+([\w -]{0,40}?)\s*limit/i;
const RESET_RE = /resets?\s+(?:at\s+|on\s+)?([^\n(·|]{1,40})(?:\(([A-Za-z_]+\/[A-Za-z_+-]+)\))?/i;
const UNGEFAEHR_RE = /rate_limit|HTTP 429|usage limit reached/i;
export const LIMIT_OHNE_ZEIT_MIN = 60; // Limit ohne lesbare Reset-Zeit: so lange warten
const LIMIT_HOECHSTENS_MS = 8 * 86400000;

// Text einer gescheiterten Sitzung → null (kein Limit) oder { art, bis (ISO), ungefaehr, text }
export function limitErkennen(text, jetzt = new Date()) {
  const t = String(text || "");
  const jetztMs = jetzt.getTime();
  const treffer = t.match(LIMIT_RE);
  if (!treffer) {
    if (!UNGEFAEHR_RE.test(t)) return null;
    return { art: "limit", bis: new Date(jetztMs + LIMIT_OHNE_ZEIT_MIN * 60000).toISOString(), ungefaehr: true, text: "Nutzungslimit erreicht (HTTP 429)" };
  }
  const art = treffer[1].trim() || "limit";
  const ungefaehr = () => ({ art, bis: new Date(jetztMs + LIMIT_OHNE_ZEIT_MIN * 60000).toISOString(), ungefaehr: true, text: treffer[0] });
  const reset = t.slice(treffer.index).match(RESET_RE);
  if (!reset) return ungefaehr();
  let zone = reset[2] || "Europe/Berlin";
  try { new Date().toLocaleString("sv-SE", { timeZone: zone }); } catch { zone = "Europe/Berlin"; }
  const zeit = reset[1].match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$/i) || reset[1].match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (!zeit) return ungefaehr();
  let h = Number(zeit[1]);
  const min = Number(zeit[2] || 0);
  const ampm = (zeit[3] || "").toLowerCase();
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || min > 59) return ungefaehr();
  const [heuteJ, heuteM, heuteT] = new Date(jetztMs).toLocaleString("sv-SE", { timeZone: zone }).slice(0, 10).split("-").map(Number);
  const datum = reset[1].match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2})/);
  let bis;
  if (datum && MONATE[datum[1].toLowerCase()]) {
    const monat = MONATE[datum[1].toLowerCase()];
    bis = zonenZeit(heuteJ, monat, Number(datum[2]), h, min, zone);
    if (bis < jetztMs - 60000) bis = zonenZeit(heuteJ + 1, monat, Number(datum[2]), h, min, zone);
  } else {
    bis = zonenZeit(heuteJ, heuteM, heuteT, h, min, zone);
    if (bis <= jetztMs + 30000) bis = zonenZeit(heuteJ, heuteM, heuteT + 1, h, min, zone);
  }
  if (!Number.isFinite(bis) || bis - jetztMs > LIMIT_HOECHSTENS_MS) return ungefaehr();
  return { art, bis: new Date(bis).toISOString(), ungefaehr: false, text: t.slice(treffer.index).split("\n")[0].slice(0, 160) };
}

// ───────── Erholung nach Neustart oder Absturz ─────────

// So lange ohne jede Änderung gilt ein Slot als verwaist, auch wenn dieser Rechner den Auftrag nicht selbst hatte
// (der andere Rechner könnte ihn gerade bearbeiten; deshalb großzügig)
export const VERWAIST_NACH_MIN = Object.freeze({ recherche: 90, uebergeben: 480, produktion: 480, nachpruefen: 30 });
const WEG = { __delete__: true };

// x: Slot-Daten. eigen: der Auftrag lief vor dem Neustart auf diesem Rechner. alterMs: Zeit seit der letzten Änderung am Dokument.
// → null (nichts tun) oder { art: "fehler" | "geplant" | "nachpruefen", felder, text }.
// „fehler“ setzt den Slot auf den normalen Fehlerweg (die Automatik wiederholt einmal, sonst „Erneut versuchen“);
// ein Video, das schon eine post_id oder geplant_fuer hat, wird nie neu produziert, sondern geht zur Nachprüfung.
export function erholung(x = {}, { eigen = false, alterMs = 0, jetzt = new Date() } = {}) {
  const alt = (phase) => alterMs >= VERWAIST_NACH_MIN[phase] * 60000;
  const zeit = jetzt.toISOString();
  if (x.status === "recherche") {
    if (!eigen && !alt("recherche")) return null;
    return {
      art: "fehler", text: "Recherche nach Neustart zurück auf den Fehlerweg",
      felder: { status: "fehler", fehler_phase: "recherche", fehler: "Cockpit wurde neu gestartet, die Recherche lief nicht zu Ende. „Erneut versuchen“ startet sie neu.", fortschritt: "Recherche nicht abgeschlossen", aktualisiert: zeit },
    };
  }
  if (x.status === "uebergeben" || x.status === "produktion") {
    if (!eigen && !alt(x.status)) return null;
    if (x.post_id || x.geplant_fuer) {
      return {
        art: "geplant", text: "Nach Neustart: Video ist schon in Buffer geplant, weiter mit der Nachprüfung",
        felder: { status: "geplant", geplant_fuer: x.geplant_fuer || berlinIso(x.datum, x.uhrzeit), fehler: "", fehler_phase: "", nachpruefen_angefordert: WEG, fortschritt: "In Buffer geplant (nach Neustart übernommen)", aktualisiert: zeit },
      };
    }
    return {
      art: "fehler", text: "Produktion nach Neustart zurück auf den Fehlerweg",
      felder: { status: "fehler", fehler_phase: "produktion", fehler: "Cockpit wurde neu gestartet, die Produktion lief nicht zu Ende. „Erneut versuchen“ setzt sie fort, fertige Teile bleiben erhalten.", fortschritt: "Produktion nicht abgeschlossen", aktualisiert: zeit },
    };
  }
  if (x.status === "geplant" && x.nachpruefen_angefordert) {
    const seit = jetzt.getTime() - (Date.parse(x.nachpruefen_angefordert) || 0);
    if (!eigen && seit < VERWAIST_NACH_MIN.nachpruefen * 60000) return null;
    return { art: "nachpruefen", text: "Nachprüfung hing, wird neu angestoßen", felder: { nachpruefen_angefordert: WEG } };
  }
  return null;
}

// ───────── Nachprüfung: nächster Schritt nach dem Ende der Sitzung ─────────
export const NACHPRUEFEN_VERSUCHE = 3;

// x: Slot-Daten nach der Sitzung. → { art: "fertig" | "claude_fehler" | "nochmal" | "aufgeben" | "gestoppt" | "limit", felder? }
export function nachpruefungErgebnis(x = {}, { gestoppt = false, limit = false, abstandS = 600, jetzt = new Date() } = {}) {
  if (x.status === "gepostet") return { art: "fertig" };
  if (x.status !== "geplant") return { art: "claude_fehler" }; // Claude hat selbst „fehler“ (Befund) eingetragen: Weg der Automatik
  const zeit = jetzt.toISOString();
  if (gestoppt) {
    return { art: "gestoppt", felder: { status: "fehler", fehler_phase: "nachpruefen", fehler: "Nachprüfung von dir gestoppt. „Nachprüfung wiederholen“ startet sie neu.", auto_wiederholt_phase: "nachpruefen", auto_gemeldet: true, aktualisiert: zeit } };
  }
  // Limit: zählt nicht als Versuch, nach dem Reset geht es weiter
  if (limit) return { art: "limit", felder: { nachpruefen_angefordert: WEG } };
  const versuche = (Number(x.nachpruefen_versuche) || 0) + 1;
  if (versuche >= NACHPRUEFEN_VERSUCHE) {
    return {
      art: "aufgeben",
      felder: { status: "fehler", fehler_phase: "nachpruefen", fehler: `Die Nachprüfung ist ${versuche}-mal ohne Ergebnis geendet. Bitte in TikTok bzw. Buffer nachsehen, ob das Video online ist, dann „Nachprüfung wiederholen“.`, auto_wiederholt_phase: "nachpruefen", auto_gemeldet: true, nachpruefen_versuche: versuche, aktualisiert: zeit },
    };
  }
  return { art: "nochmal", felder: { nachpruefen_angefordert: WEG, nachpruefen_versuche: versuche, nachpruefen_ab: new Date(jetzt.getTime() + abstandS * 1000).toISOString() } };
}
