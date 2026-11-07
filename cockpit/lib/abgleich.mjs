// Abgleich zwischen mehreren Rechnern mit Cockpit (Entscheidung 03.11.: Laptop und Desktop-PC zeigen dieselben Daten).
// Alles läuft über den Supabase-Speicher, den Cockpit und Render-Dienst ohnehin nutzen:
//   cockpit/db/<sammlung>/<id>.json         Dokumente: jeder Rechner spiegelt seine Änderungen (server.mjs), hier werden alle
//                                           30 s die der anderen geholt; die höhere Version gewinnt, bei gleicher die neuere
//   cockpit/geteilt/<name>.json             gemeinsame Stände (Einstellungen, Missionen), werden zusammengeführt
//   cockpit/geteilt/rechner/<rechner>.json  Anwesenheit: jeder Rechner mit Cockpit legt beim Start seine Datei an (Fußzeile „⇄“)
//   cockpit/ansprueche/<schluessel>.json    „wer zuerst kommt“: ein gemeinsames Ereignis (Mission, Lernschleife des Tages,
//                                           Frage nach der Testwoche, Automatik auto-…) zählt nur auf dem Rechner, der die Datei
//                                           zuerst anlegt
// Übernommene Dokumente werden nicht zurückgespiegelt und lösen keine Meldungen oder Aktionen aus, nur die Anzeige.
// Seit 03.11. ohne Spielsystem („nur die Ziele bleiben“): cockpit/geteilt/spielstand/ und die Ansprüche render-…/erfolg-…
// schreibt nur noch ein Rechner mit altem Code; hier wird davon nichts gelesen, render-… nur aufgeräumt.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const TAKT = Number(process.env.COCKPIT_ABGLEICH_TAKT || 30000); // kürzer nur für Tests
// Ansprüche, die nach 14 Tagen weg dürfen (render-… nur noch vom alten Code; auto-… = Automatiken, lib/automatik.mjs; Missionen bleiben)
const KURZLEBIG = /^(render|lernschleife|testphase|auto)-/;

export function erstelleAbgleich({ sb, db, sammlungen, rechner, ordner, basis: BASIS = "cockpit", ausstehend = () => false, nochmalSpiegeln = () => {}, maskiere = (t) => t, log = () => {}, senden = () => {} }) {
  const DATEI = path.join(ordner, "abgleich.json");
  let gesehen = {}; // Supabase-Objekt → updated_at beim letzten Lesen
  const bekannt = new Set(); // Rechner mit Cockpit (Anwesenheit und Herkunft gelesener Dokumente)
  try {
    const g = JSON.parse(fs.readFileSync(DATEI, "utf8"));
    gesehen = g.gesehen || {};
    for (const r of g.rechner || []) bekannt.add(r);
  } catch { /* erster Start */ }
  let merkTimer = null;
  const merken = () => { clearTimeout(merkTimer); merkTimer = setTimeout(() => fsp.writeFile(DATEI, JSON.stringify({ gesehen, rechner: [...bekannt] })).catch(() => {}), 1000); };
  const status = { zuletzt: null, fehler: null, uebernommen: 0, rechner: [rechner] };
  const gleich = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  let laeuft = false;

  // ───────── „Wer zuerst kommt“ ─────────
  // true = dieser Rechner hat das Ereignis · false = ein anderer war schneller · null = Supabase gerade nicht erreichbar
  async function anspruch(schluessel, info = {}) {
    if (!sb.bereit()) return true;
    try {
      return await sb.anlegen(`${BASIS}/ansprueche/${schluessel}.json`, { rechner, zeit: new Date().toISOString(), ...info });
    } catch (e) {
      log(`Anspruch ${schluessel}: ${maskiere(e.message)}`);
      return null;
    }
  }

  async function ansprucheAufraeumen() {
    if (!sb.bereit()) return; // ohne Abgleich (z. B. Test-Instanz mit COCKPIT_KEIN_SPIEGEL) nichts in Supabase löschen
    try {
      const grenze = Date.now() - 14 * 86400000;
      const alt = (await sb.liste(`${BASIS}/ansprueche`))
        .filter((e) => e.id && KURZLEBIG.test(e.name) && Date.parse(e.created_at || e.updated_at || "") < grenze)
        .map((e) => `${BASIS}/ansprueche/${e.name}`);
      if (alt.length) await sb.loeschen(alt);
    } catch { /* nächstes Mal */ }
  }

  // ───────── Dokumente der anderen Rechner ─────────
  function neuer(fern, lokal) {
    if ((fern.version || 0) !== lokal.version) return (fern.version || 0) > lokal.version;
    return String(fern.aktualisiert || "") > String(lokal.aktualisiert || "");
  }

  async function dokumenteHolen() {
    let n = 0;
    const von = new Set();
    for (const s of sammlungen) {
      const praefix = `${BASIS}/db/${s}/`;
      const eintraege = await sb.liste(`${BASIS}/db/${s}`);
      const da = new Set();
      for (const e of eintraege) {
        if (!e.id || !e.name.endsWith(".json")) continue;
        const id = e.name.slice(0, -5), objekt = praefix + e.name;
        da.add(objekt);
        if (gesehen[objekt] === e.updated_at) continue;
        const fern = await sb.json(objekt);
        gesehen[objekt] = e.updated_at;
        if (fern?.rechner) bekannt.add(fern.rechner);
        if (!fern?.daten || ausstehend(s, id)) continue; // eigene Änderung unterwegs: die gewinnt beim nächsten Vergleich
        const lokal = db.roh(s, id);
        if (lokal && gleich(fern.daten, lokal.daten)) continue;
        if (!lokal || neuer(fern, lokal)) {
          db.uebernehmen(s, id, fern);
          n++;
          if (fern.rechner && fern.rechner !== rechner) von.add(fern.rechner);
        } else nochmalSpiegeln(s, id); // hier neuer: Kopie nachziehen, damit beide Rechner beim selben Stand landen
      }
      // Auf einem anderen Rechner gelöscht: war in der Kopie, ist dort weg, hier seitdem nicht geändert
      for (const objekt of Object.keys(gesehen)) {
        if (!objekt.startsWith(praefix) || da.has(objekt)) continue;
        delete gesehen[objekt];
        const id = objekt.slice(praefix.length, -5);
        if (db.roh(s, id) && !ausstehend(s, id)) { db.entfernen(s, id); n++; }
      }
    }
    return { n, von: [...von] };
  }

  // ───────── Gemeinsame Stände (zusammenführbar) ─────────
  // lokal() liefert den Stand dieses Rechners, mischen(lokal, fern) den gemeinsamen, anwenden(gemeinsam) übernimmt ihn hier.
  // Weicht die Kopie in Supabase vom gemeinsamen Stand ab, wird er hochgeladen; so landen alle Rechner beim selben Ergebnis.
  const gemeinsam = new Map();
  let hochTimer = null;
  function teilen(name, { lokal, mischen, anwenden }) {
    gemeinsam.set(name, { lokal, mischen, anwenden, fern: null, geholt: false, faellig: false });
  }
  function geaendert(name) {
    const g = gemeinsam.get(name);
    if (!g) return;
    g.faellig = true;
    clearTimeout(hochTimer);
    hochTimer = setTimeout(gemeinsamHochladen, 3000);
  }
  async function gemeinsamHolen() {
    const eintraege = await sb.liste(`${BASIS}/geteilt`);
    for (const [name, g] of gemeinsam) {
      const objekt = `${BASIS}/geteilt/${name}.json`;
      const e = eintraege.find((x) => x.id && x.name === `${name}.json`);
      if (e && (gesehen[objekt] !== e.updated_at || !g.geholt)) {
        g.fern = await sb.json(objekt);
        gesehen[objekt] = e.updated_at;
      }
      g.geholt = true;
      const lokal = g.lokal();
      const ergebnis = g.fern ? g.mischen(lokal, g.fern) : lokal;
      if (!gleich(ergebnis, lokal)) g.anwenden(ergebnis);
      if (!gleich(ergebnis, g.fern)) g.faellig = true;
    }
  }
  async function gemeinsamHochladen() {
    for (const [name, g] of gemeinsam) {
      if (!g.faellig || !g.geholt) continue; // erst nach dem ersten Lesen, sonst überschreibt ein neuer Rechner die Kopie
      const ergebnis = g.fern ? g.mischen(g.lokal(), g.fern) : g.lokal();
      try {
        await sb.schreiben(`${BASIS}/geteilt/${name}.json`, ergebnis);
        g.fern = ergebnis;
        g.faellig = false;
      } catch (e) { status.fehler = maskiere(e.message); }
    }
  }

  // ───────── Rechner mit Cockpit (Fußzeile) ─────────
  // Eigene Datei einmal je Start anlegen, dann alle auflisten (nur Namen, ohne Inhalt). Ein Rechner mit altem Code legt
  // keine an; der zählt über die Herkunft seiner Dokumente (bekannt) und, solange er noch seinen Spielstand schreibt, über
  // dessen Dateinamen. Fehler hier halten den übrigen Abgleich nicht auf.
  let angemeldet = false;
  async function rechnerHolen() {
    try {
      if (!angemeldet) {
        await sb.schreiben(`${BASIS}/geteilt/rechner/${rechner}.json`, { rechner, zeit: new Date().toISOString() });
        angemeldet = true;
      }
      for (const ordner of ["rechner", "spielstand"]) {
        for (const e of await sb.liste(`${BASIS}/geteilt/${ordner}`)) if (e.id && e.name.endsWith(".json")) bekannt.add(e.name.slice(0, -5));
      }
    } catch { /* nächste Runde */ }
    status.rechner = [...new Set([rechner, ...bekannt])];
  }

  // ───────── Takt ─────────
  async function runde() {
    if (laeuft || !sb.bereit()) return;
    laeuft = true;
    try {
      await rechnerHolen();
      await gemeinsamHolen();
      const { n, von } = await dokumenteHolen();
      if (n) {
        status.uebernommen += n;
        log(`Abgleich: ${n} Änderung(en)${von.length ? ` von ${von.join(", ")}` : ""} übernommen`);
        senden("abgleich_neu", { anzahl: n, von });
      }
      Object.assign(status, { zuletzt: new Date().toISOString(), fehler: null });
    } catch (e) {
      status.fehler = maskiere(e.message);
    } finally {
      laeuft = false;
      merken();
      senden("abgleich", status);
    }
    await gemeinsamHochladen();
  }

  // Erste Runde beim Start, dann alle 30 s
  async function starten() {
    if (sb.bereit()) await runde();
    setInterval(runde, TAKT);
    setTimeout(ansprucheAufraeumen, 60000);
    setInterval(ansprucheAufraeumen, 86400000);
  }

  return { starten, runde, anspruch, teilen, geaendert, status: () => status };
}
