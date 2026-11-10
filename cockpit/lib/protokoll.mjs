// data/produktion/protokoll.csv sicher lesen und fortschreiben (Ausbau 10.11.2026). Die Produktions-Sitzung schrieb die Zeile
// bisher von Hand; Titel mit Komma ohne Anführungszeichen ergaben Zeilen mit 8 statt 7 Feldern. Jetzt hängt
// cockpit/werkzeuge/protokoll.mjs die Zeile korrekt in Anführungszeichen an. Vorhandene Zeilen bleiben, wie sie sind;
// protokollLesen liest auch die alten Zeilen richtig (überzählige Kommas gehören zum Titel).
// Tests: node --test cockpit/lib/register.test.mjs (Abschnitt Protokoll)
import fs from "node:fs";

export const KOPF = ["datum", "slot", "konto", "titel", "projekt", "post_id", "status"];
const KONTEN = new Set(["simulierbar", "stelldirvor.pov"]);
const SLOTS = new Set(["mittag", "abend"]);
const STATUS = new Set(["geplant", "gepostet", "fehler"]);

// Eine CSV-Zeile in Felder zerlegen (Anführungszeichen, verdoppelte Anführungszeichen)
export function csvFelder(zeile) {
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

// Feld für die CSV: immer in Anführungszeichen, wenn Komma, Anführungszeichen, Zeilenumbruch oder Leerzeichen am Rand vorkommen
export function csvFeld(wert) {
  const t = String(wert ?? "").replace(/\r?\n/g, " ");
  return /[",]|^\s|\s$/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// Text der Datei → Zeilen als Objekte. Zeilen mit mehr als 7 Feldern: die ersten 3 und die letzten 3 Felder stehen fest,
// alles dazwischen ist der Titel (unquotierte Kommas).
export function protokollLesen(text) {
  const zeilen = String(text || "").replace(/^﻿/, "").split(/\r?\n/).filter((z) => z.trim());
  const liste = [];
  for (const z of zeilen.slice(1)) {
    const f = csvFelder(z);
    if (f.length < KOPF.length) continue;
    const n = f.length;
    liste.push({ datum: f[0].trim(), slot: f[1].trim(), konto: f[2].trim(), titel: f.slice(3, n - 3).join(",").trim(), projekt: f[n - 3].trim(), post_id: f[n - 2].trim(), status: f[n - 1].trim() });
  }
  return liste;
}

export function zeilePruefen(e) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(e.datum || "")) throw new Error("datum: JJJJ-MM-TT erwartet");
  if (!SLOTS.has(e.slot)) throw new Error("slot: mittag oder abend erwartet");
  if (!KONTEN.has(e.konto)) throw new Error("konto: simulierbar oder stelldirvor.pov erwartet");
  if (!String(e.titel || "").trim()) throw new Error("titel fehlt");
  if (!/^[A-Za-z0-9_.-]+$/.test(e.projekt || "")) throw new Error("projekt: Ordnername unter pipeline/projekte erwartet");
  if (!/^[A-Za-z0-9_-]+$/.test(e.post_id || "")) throw new Error("post_id fehlt oder enthält unerlaubte Zeichen");
  if (!STATUS.has(e.status)) throw new Error("status: geplant, gepostet oder fehler erwartet");
}

export const zeileBauen = (e) => KOPF.map((k) => (k === "titel" ? `"${String(e.titel).replace(/\r?\n/g, " ").trim().replace(/"/g, '""')}"` : csvFeld(e[k]))).join(",");

// Zeile anhängen (nichts an vorhandenen Zeilen ändern). Gibt es die post_id schon: nichts tun ({ angehaengt: false }).
export function anhaengen(datei, eintrag) {
  zeilePruefen(eintrag);
  const alt = fs.existsSync(datei) ? fs.readFileSync(datei, "utf8") : "";
  if (protokollLesen(alt).some((z) => z.post_id === eintrag.post_id)) return { angehaengt: false, grund: "post_id steht schon im Protokoll" };
  const kopf = alt.trim() ? "" : KOPF.join(",") + "\n";
  const umbruch = alt && !alt.endsWith("\n") ? "\n" : "";
  fs.appendFileSync(datei, kopf + umbruch + zeileBauen(eintrag) + "\n", "utf8");
  return { angehaengt: true };
}

// Nur das Status-Feld (letztes Feld) der Zeile mit dieser post_id ändern; der Rest der Zeile und alle anderen Zeilen bleiben Zeichen für Zeichen gleich
export function statusSetzen(datei, postId, status) {
  if (!STATUS.has(status)) throw new Error("status: geplant, gepostet oder fehler erwartet");
  if (!/^[A-Za-z0-9_-]+$/.test(postId || "")) throw new Error("post_id fehlt");
  const text = fs.readFileSync(datei, "utf8");
  const ende = text.includes("\r\n") ? "\r\n" : "\n";
  let n = 0;
  const neu = text.split(/\r?\n/).map((z) => {
    const m = z.match(/^(.*,)([A-Za-z0-9_-]+),([a-z_]+)\s*$/);
    if (!m || m[2] !== postId) return z;
    n++;
    return `${m[1]}${m[2]},${status}`;
  }).join(ende);
  if (!n) return { geaendert: 0, grund: "post_id steht nicht im Protokoll" };
  if (neu !== text) fs.writeFileSync(datei, neu, "utf8");
  return { geaendert: n };
}
