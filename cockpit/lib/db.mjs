// Dokument-Ablage des Cockpits (ersetzt die Datenbank des Ideen-Studios).
// Eine JSON-Datei je Dokument unter cockpit/daten/db/<sammlung>/<id>.json mit Versionsnummer:
// Ein bestehendes Dokument wird nur mit passender if_version geschrieben (wie im Studio), damit sich
// Oberfläche und Claude nicht gegenseitig überschreiben. Jede Änderung meldet beiAenderung und spiegelt nach Supabase.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export const SAMMLUNGEN = ["ideen", "skripte", "stand", "laeufe", "vorschlaege", "meldungen"];
const ID_RE = /^[A-Za-z0-9_.-]{1,120}$/;
const VERLAUF_MAX = 30;

export class DbFehler extends Error {
  constructor(code, text, extra = {}) {
    super(text);
    this.code = code;
    Object.assign(this, extra);
  }
}

export function erstelleDb({ ordner, beiAenderung = () => {}, spiegel = () => {} }) {
  const docs = new Map(); // "sammlung/id" → {daten, version, aktualisiert, von}
  const ketten = new Map(); // Dateischreiben je Dokument der Reihe nach
  for (const s of SAMMLUNGEN) {
    const o = path.join(ordner, s);
    fs.mkdirSync(o, { recursive: true });
    for (const f of fs.readdirSync(o)) {
      if (!f.endsWith(".json")) continue;
      try {
        docs.set(`${s}/${f.slice(0, -5)}`, JSON.parse(fs.readFileSync(path.join(o, f), "utf8")));
      } catch { /* defekte Datei überspringen */ }
    }
  }

  function pruefen(s, id) {
    if (!SAMMLUNGEN.includes(s)) throw new DbFehler(400, `Unbekannte Sammlung „${s}“ (erlaubt: ${SAMMLUNGEN.join(", ")})`);
    if (id !== undefined && !ID_RE.test(id || "")) throw new DbFehler(400, `Ungültige Dokument-ID „${id}“`);
  }

  function sichern(s, id, doc, { spiegeln = true } = {}) {
    const datei = path.join(ordner, s, `${id}.json`);
    const vorher = ketten.get(datei) || Promise.resolve();
    const jetzt = vorher.then(async () => {
      if (doc === null) {
        await fsp.rm(datei, { force: true });
      } else {
        await fsp.writeFile(datei + ".tmp", JSON.stringify(doc, null, 1));
        await fsp.rename(datei + ".tmp", datei);
      }
    }).catch(() => {});
    ketten.set(datei, jetzt);
    if (spiegeln) spiegel(s, id, doc);
  }

  const aussen = (s, id, d) => (d ? { sammlung: s, id, version: d.version, aktualisiert: d.aktualisiert, von: d.von, daten: d.daten } : null);

  function mischen(alt, neu) {
    const ergebnis = { ...alt };
    for (const [k, v] of Object.entries(neu || {})) {
      if (v && typeof v === "object" && !Array.isArray(v) && v.__delete__ === true) delete ergebnis[k];
      else ergebnis[k] = v;
    }
    return ergebnis;
  }

  function versionPruefen(s, id, alt, ifVersion) {
    if (!alt) return;
    if (ifVersion === undefined || ifVersion === null || ifVersion === "") throw new DbFehler(409, `${s}/${id} existiert schon (Version ${alt.version}): Version mitgeben`, { aktuell: alt.version });
    if (Number(ifVersion) !== alt.version) throw new DbFehler(409, `Versionskonflikt bei ${s}/${id}: aktuell ${alt.version}, mitgegeben ${ifVersion}. Neu lesen und nur die eigenen Felder erneut schreiben.`, { aktuell: alt.version });
  }

  function ablegen(s, id, daten, von) {
    const alt = docs.get(`${s}/${id}`);
    const doc = { daten, version: (alt?.version || 0) + 1, aktualisiert: new Date().toISOString(), von };
    docs.set(`${s}/${id}`, doc);
    sichern(s, id, doc);
    beiAenderung(aussen(s, id, doc));
    return aussen(s, id, doc);
  }

  return {
    get(s, id) {
      pruefen(s, id);
      return aussen(s, id, docs.get(`${s}/${id}`));
    },

    // filter: [[feld, op, wert], …] mit op ==, !=, >=, <=, >, <, in
    liste(s, filter = []) {
      pruefen(s);
      const passt = (d) => filter.every(([feld, op, wert]) => {
        const v = d.daten?.[feld];
        switch (op) {
          case "==": return v === wert;
          case "!=": return v !== wert;
          case ">=": return v >= wert;
          case "<=": return v <= wert;
          case ">": return v > wert;
          case "<": return v < wert;
          case "in": return Array.isArray(wert) && wert.includes(v);
          default: return false;
        }
      });
      return [...docs.entries()]
        .filter(([k, d]) => k.startsWith(s + "/") && passt(d))
        .map(([k, d]) => aussen(s, k.slice(s.length + 1), d))
        .sort((a, b) => a.id.localeCompare(b.id));
    },

    // art: "set" ersetzt, "update" mischt Felder ({__delete__: true} entfernt ein Feld)
    schreiben(s, id, daten, { art = "set", ifVersion, von = "cockpit" } = {}) {
      pruefen(s, id);
      if (!daten || typeof daten !== "object" || Array.isArray(daten)) throw new DbFehler(400, "Daten müssen ein JSON-Objekt sein");
      const alt = docs.get(`${s}/${id}`);
      versionPruefen(s, id, alt, ifVersion);
      const neu = art === "update" && alt ? mischen(alt.daten, daten) : mischen({}, daten);
      return ablegen(s, id, neu, von);
    },

    loeschen(s, id, { ifVersion, von = "cockpit" } = {}) {
      pruefen(s, id);
      const alt = docs.get(`${s}/${id}`);
      if (!alt) return { ok: true, geloescht: false };
      versionPruefen(s, id, alt, ifVersion);
      docs.delete(`${s}/${id}`);
      sichern(s, id, null);
      beiAenderung({ sammlung: s, id, geloescht: true, von });
      return { ok: true, geloescht: true };
    },

    // Fortschritt in einem Zug ohne Version: fortschritt setzen, Eintrag an verlauf anhängen (höchstens 30)
    meilenstein(s, id, text, { von = "claude", felder = {} } = {}) {
      pruefen(s, id);
      const alt = docs.get(`${s}/${id}`);
      if (!alt) throw new DbFehler(404, `${s}/${id} gibt es nicht`);
      const zeit = new Date().toISOString();
      const verlauf = [...(alt.daten.verlauf || []), { zeit, text: String(text).slice(0, 500), von }].slice(-VERLAUF_MAX);
      return ablegen(s, id, mischen(alt.daten, { ...felder, fortschritt: String(text).slice(0, 300), verlauf, aktualisiert: zeit }), von);
    },

    anzahl() {
      return docs.size;
    },

    // Rohdaten für den Import (Version 1, Herkunft vermerkt); überschreibt nur, wenn erzwingen
    importieren(s, id, daten, { erzwingen = false, von = "import" } = {}) {
      pruefen(s, id);
      if (docs.has(`${s}/${id}`) && !erzwingen) return false;
      ablegen(s, id, daten, von);
      return true;
    },

    // Abgleich (lib/abgleich.mjs): Stand eines anderen Rechners unverändert übernehmen (Version bleibt), ohne ihn
    // zurückzuspiegeln; das Ereignis trägt abgleich: true, damit es nur die Anzeige auffrischt und nichts auslöst
    uebernehmen(s, id, doc) {
      pruefen(s, id);
      const neu = { daten: doc.daten, version: doc.version || 1, aktualisiert: doc.aktualisiert || new Date().toISOString(), von: doc.von || "abgleich" };
      docs.set(`${s}/${id}`, neu);
      sichern(s, id, neu, { spiegeln: false });
      beiAenderung({ ...aussen(s, id, neu), abgleich: true });
    },
    entfernen(s, id) {
      pruefen(s, id);
      if (!docs.delete(`${s}/${id}`)) return;
      sichern(s, id, null, { spiegeln: false });
      beiAenderung({ sammlung: s, id, geloescht: true, von: "abgleich", abgleich: true });
    },
    roh(s, id) {
      return docs.get(`${s}/${id}`) || null;
    },
  };
}
