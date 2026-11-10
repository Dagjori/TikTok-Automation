// Tests für die Automatik (cockpit/lib/automatik.mjs) mit echter Ablage in einem Temp-Ordner und nachgestelltem Studio:
// Ideen mit Wiederholung, Nutzungslimit, Supabase weg (lokal weiter), Autopilot, und die Handy-Meldungen (lib/melden.mjs).
// Aufruf: node --test cockpit/lib/automatik.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { erstelleDb } from "./db.mjs";
import { erstelleAutomatik, IDEEN_VERSUCHE } from "./automatik.mjs";
import { KONTEN } from "./studio.mjs";
import { meldenLesen, meldenPruefen, meldenErlaubt, erstelleMelden, tagesabschlussText, MELDEN_STANDARD } from "./melden.mjs";

const HEUTE = "2026-11-10", MORGEN = "2026-11-11";

function aufbau({ einstellungen = {}, uhr = "16:00", anspruch = async () => true, limitBis = () => 0, stimmePruefen = async () => ({ ok: true }) } = {}) {
  const ordner = fs.mkdtempSync(path.join(os.tmpdir(), "cockpit-automatik-"));
  const db = erstelleDb({ ordner });
  const e = { studio_ab: "2026-11-04", ...einstellungen };
  const aufrufe = [], meldungen = [], feed = [], handy = [];
  const studio = { ausfuehren: (aktion, daten) => { aufrufe.push([aktion, daten]); return { ok: true }; } };
  const automatik = erstelleAutomatik({
    db, studio, konten: KONTEN, einstellungen: () => e, einstellungenSichern: () => {}, anspruch, heute: () => HEUTE, berlinZeit: () => uhr,
    feed: (t) => feed.push(t), melden: (m) => meldungen.push(m), jobs: () => [], limitBis, stimmePruefen, benachrichtigen: (ereignis, text) => handy.push([ereignis, text]),
  });
  return { db, e, aufrufe, meldungen, feed, handy, automatik, weg: () => { try { fs.rmSync(ordner, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); } catch { /* die Ablage schreibt noch: Temp-Ordner bleibt liegen */ } } };
}
const VOR_6_STD = new Date(Date.now() - 6 * 3600000).toISOString(); // älter als jede Autopilot-Frist
const ideenDa = (db, konto, datum, extra = {}) => db.schreiben("ideen", `${KONTEN[konto].praefix}-${datum}`, { konto, datum, ideen: [{ nr: 1, titel: "A", punkte: 20, feld: "X" }, { nr: 2, titel: "B", punkte: 19, feld: "X" }, { nr: 3, titel: "C", punkte: 18, feld: "Y" }], erzeugt: VOR_6_STD, ...extra });

test("Ideen: der Tag gilt erst als erledigt, wenn die Ideen da sind; bis zu 3 Versuche, dann Meldung", async () => {
  const t = aufbau();
  await t.automatik.takt();
  // nach 15 Uhr nur noch für morgen, beide Konten
  assert.deepEqual(t.aufrufe, [["ideen", { konto: "simulierbar", datum: MORGEN }], ["ideen", { konto: "stelldirvor", datum: MORGEN }]]);
  assert.equal(t.e.automatik_ideen_zuletzt, undefined); // noch nicht erledigt: erst nach Erfolg
  assert.equal(t.e.automatik_ideen_versuche.n, 1);
  // Gleich danach kein zweiter Versuch (Abstand)
  await t.automatik.takt();
  assert.equal(t.aufrufe.length, 2);
  // Ein Konto hat Ideen bekommen, das andere ist gescheitert: nach dem Abstand nur das fehlende noch einmal
  ideenDa(t.db, "simulierbar", MORGEN);
  t.e.automatik_ideen_versuche.zuletzt = "2026-11-10T00:00:00.000Z";
  await t.automatik.takt();
  assert.deepEqual(t.aufrufe.at(-1), ["ideen", { konto: "stelldirvor", datum: MORGEN }]);
  assert.equal(t.aufrufe.length, 3);
  assert.equal(t.e.automatik_ideen_versuche.n, 2);
  // Dritter Versuch, danach ist Schluss mit einer Meldung
  t.e.automatik_ideen_versuche.zuletzt = "2026-11-10T00:00:00.000Z";
  await t.automatik.takt();
  assert.equal(t.e.automatik_ideen_versuche.n, IDEEN_VERSUCHE);
  t.e.automatik_ideen_versuche.zuletzt = "2026-11-10T00:00:00.000Z";
  await t.automatik.takt();
  assert.equal(t.aufrufe.length, 4);
  assert.equal(t.e.automatik_ideen_zuletzt, HEUTE);
  assert.equal(t.meldungen.length, 1);
  assert.match(t.meldungen[0].titel, /Ideen fehlen nach 3 Versuchen/);
  await t.automatik.takt();
  assert.equal(t.meldungen.length, 1);
  t.weg();
});

test("Ideen: sind alle da, ist der Tag erledigt; vor 15 Uhr auch für heute, wenn dort Slots frei sind", async () => {
  const t = aufbau({ uhr: "07:05" });
  await t.automatik.takt();
  assert.deepEqual(t.aufrufe.map(([, d]) => `${d.konto} ${d.datum}`), [`simulierbar ${HEUTE}`, `simulierbar ${MORGEN}`, `stelldirvor ${HEUTE}`, `stelldirvor ${MORGEN}`]);
  t.weg();
  // Heute sind beide Slots eines Kontos belegt: dafür keine Ideen für heute
  const u = aufbau({ uhr: "07:05" });
  for (const s of ["mittag", "abend"]) u.db.schreiben("skripte", `acc1-${HEUTE}-${s}`, { konto: "simulierbar", datum: HEUTE, slot: s, status: "geplant" });
  await u.automatik.takt();
  assert.ok(!u.aufrufe.some(([, d]) => d.konto === "simulierbar" && d.datum === HEUTE));
  u.weg();
  const v = aufbau();
  for (const k of Object.keys(KONTEN)) ideenDa(v.db, k, MORGEN);
  await v.automatik.takt();
  assert.equal(v.aufrufe.length, 0);
  assert.equal(v.e.automatik_ideen_zuletzt, HEUTE);
  v.weg();
  // Vor der eingestellten Uhrzeit passiert nichts
  const w = aufbau({ uhr: "06:59" });
  await w.automatik.takt();
  assert.equal(w.aufrufe.length, 0);
  w.weg();
});

test("Nutzungslimit: solange es gilt, startet die Automatik nichts und wiederholt nichts", async () => {
  let limit = Date.now() + 3600000;
  const t = aufbau({ limitBis: () => limit });
  const alt = new Date(Date.now() - 20 * 60000).toISOString(); // Fehler vor 20 Min.: die Wiederholung wäre längst fällig
  t.db.schreiben("skripte", `acc1-${MORGEN}-mittag`, { konto: "simulierbar", datum: MORGEN, slot: "mittag", titel: "T", status: "fehler", fehler_phase: "produktion", fehler: "Nutzungslimit", aktualisiert: alt });
  await t.automatik.takt();
  assert.equal(t.aufrufe.length, 0); // keine Ideen, keine Wiederholung
  assert.equal(t.db.get("skripte", `acc1-${MORGEN}-mittag`).daten.auto_wiederholt_phase, undefined);
  limit = 0; // Limit vorbei: genau eine Wiederholung, Ideen laufen wieder
  await t.automatik.takt();
  assert.ok(t.aufrufe.some(([a, d]) => a === "erneut" && d.id === `acc1-${MORGEN}-mittag`));
  assert.ok(t.aufrufe.some(([a]) => a === "ideen"));
  assert.equal(t.db.get("skripte", `acc1-${MORGEN}-mittag`).daten.auto_wiederholt_phase, "produktion");
  const n = t.aufrufe.filter(([a]) => a === "erneut").length;
  await t.automatik.takt();
  assert.equal(t.aufrufe.filter(([a]) => a === "erneut").length, n); // nicht noch einmal
  t.weg();
});

test("Supabase nicht erreichbar: erst abwarten, dann läuft die Automatik lokal weiter (und stimmt sich später wieder ab)", async (ctx) => {
  ctx.mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-11-10T15:00:00Z") });
  let antwort = null;
  const t = aufbau({ anspruch: async () => antwort });
  await t.automatik.takt();
  assert.equal(t.aufrufe.length, 0); // Supabase weg: noch nichts
  assert.equal(t.automatik.lokal(), false);
  ctx.mock.timers.tick(61000);
  await t.automatik.takt();
  assert.equal(t.automatik.lokal(), true);
  assert.equal(t.aufrufe.filter(([a]) => a === "ideen").length, 2); // läuft lokal weiter
  assert.ok(t.feed.some((f) => /Supabase nicht erreichbar/.test(f)));
  antwort = true; // wieder da
  ideenDa(t.db, "simulierbar", MORGEN);
  ideenDa(t.db, "stelldirvor", MORGEN);
  t.db.schreiben("skripte", `acc1-${MORGEN}-mittag`, { konto: "simulierbar", datum: MORGEN, slot: "mittag", titel: "T", status: "gewaehlt", auto_recherche_ab: "2026-11-10T14:00:00.000Z" });
  await t.automatik.takt();
  assert.equal(t.automatik.lokal(), false);
  assert.ok(t.aufrufe.some(([a]) => a === "recherchieren"));
  t.weg();
});

test("Autopilot auto_wahl: aus = nichts; an = nach der Frist freie Slots füllen, je Ideen-Liste nur einmal", async () => {
  const aus = aufbau();
  ideenDa(aus.db, "simulierbar", MORGEN);
  ideenDa(aus.db, "stelldirvor", MORGEN);
  await aus.automatik.takt();
  assert.ok(!aus.aufrufe.some(([a]) => a === "waehlen")); // Standard: aus
  aus.weg();

  const t = aufbau({ einstellungen: { automatik: { auto_wahl: true, auto_wahl_frist_min: 120 } } });
  ideenDa(t.db, "simulierbar", MORGEN); // vor 6 Std. erzeugt, Frist 120 Min. längst vorbei
  ideenDa(t.db, "stelldirvor", MORGEN, { erzeugt: new Date().toISOString() }); // gerade erst erzeugt: Frist läuft noch
  await t.automatik.takt();
  const wahl = t.aufrufe.filter(([a]) => a === "waehlen").map(([, d]) => d);
  assert.deepEqual(wahl.map((d) => [d.konto, d.slot, d.nr]), [["simulierbar", "mittag", 1], ["simulierbar", "abend", 3]]); // Idee 2 hat dasselbe Feld wie 1
  assert.ok(wahl.every((d) => d.auto));
  assert.ok(t.db.get("ideen", `acc1-${MORGEN}`).daten.auto_wahl_erledigt);
  assert.equal(t.handy.filter(([e]) => e === "ideen").length, 1);
  await t.automatik.takt();
  assert.equal(t.aufrufe.filter(([a]) => a === "waehlen").length, 2); // nicht noch einmal (auch wenn der Inhaber wieder abwählt)
  t.weg();

  // Der Inhaber hat einen Slot schon selbst gewählt: nur der freie wird gefüllt
  const u = aufbau({ einstellungen: { automatik: { auto_wahl: true } } });
  ideenDa(u.db, "simulierbar", MORGEN);
  ideenDa(u.db, "stelldirvor", MORGEN, { auto_wahl_erledigt: "x" });
  u.db.schreiben("skripte", `acc1-${MORGEN}-mittag`, { konto: "simulierbar", datum: MORGEN, slot: "mittag", status: "gewaehlt", idee: { nr: 3, titel: "C", feld: "Y" } });
  await u.automatik.takt();
  assert.deepEqual(u.aufrufe.filter(([a]) => a === "waehlen").map(([, d]) => [d.slot, d.nr]), [["abend", 1]]);
  u.weg();
});

test("Autopilot auto_freigabe: nur geprüfte Skripte nach der Frist; sonst wartet es mit Grund auf den Inhaber", async () => {
  const alt = VOR_6_STD;
  const skript = (extra = {}) => ({ konto: "stelldirvor", datum: MORGEN, slot: "mittag", titel: "T", status: "skript_fertig", skript: { saetze: [{ text: "x" }] }, selbstpruefung: ["Satzzahl 15: ok"], zahlen: { a: 1 }, quellen: ["Quelle"], faktencheck: "recherchiert", idee: { originalitaet: "kein deutsches Video gefunden" }, aktualisiert: alt, ...extra });
  const aus = aufbau();
  aus.db.schreiben("skripte", `acc2-${MORGEN}-mittag`, skript());
  await aus.automatik.takt();
  assert.ok(!aus.aufrufe.some(([a]) => a === "freigeben")); // Standard: aus
  aus.weg();

  const t = aufbau({ einstellungen: { automatik: { auto_freigabe: true } }, stimmePruefen: async () => ({ ok: false, text: "Ta Ziffern" }) });
  for (const k of Object.keys(KONTEN)) ideenDa(t.db, k, MORGEN);
  t.db.schreiben("skripte", `acc2-${MORGEN}-mittag`, skript());
  t.db.schreiben("skripte", `acc2-${MORGEN}-abend`, skript({ slot: "abend", quellen: [] }));
  t.db.schreiben("skripte", `acc1-${MORGEN}-mittag`, skript({ konto: "simulierbar", skript: { segmente: [{ sprechtext: "1 Test" }] } }));
  t.db.schreiben("skripte", `acc1-${MORGEN}-abend`, skript({ konto: "simulierbar", slot: "abend", aktualisiert: new Date().toISOString() })); // Frist läuft noch
  await t.automatik.takt();
  assert.deepEqual(t.aufrufe.filter(([a]) => a === "freigeben").map(([, d]) => d), [{ id: `acc2-${MORGEN}-mittag`, auto: true }]);
  assert.match(t.db.get("skripte", `acc2-${MORGEN}-abend`).daten.auto_freigabe_wartet, /Zahlen ohne Quellen/);
  assert.match(t.db.get("skripte", `acc1-${MORGEN}-mittag`).daten.auto_freigabe_wartet, /Text-Vorprüfung der Stimme: Ta Ziffern/);
  assert.equal(t.db.get("skripte", `acc1-${MORGEN}-abend`).daten.auto_freigabe_wartet, undefined);
  assert.equal(t.handy.filter(([e]) => e === "skript").length, 3);
  const n = t.handy.length;
  // Das echte Studio setzt den freigegebenen Slot auf „freigegeben“ (hier nachgestellt)
  const frei = t.db.get("skripte", `acc2-${MORGEN}-mittag`);
  t.db.schreiben("skripte", frei.id, { status: "freigegeben" }, { art: "update", ifVersion: frei.version });
  await t.automatik.takt();
  assert.equal(t.handy.length, n); // wartende Skripte werden nicht jede Runde neu geprüft und gemeldet
  t.weg();
});

// ───────── Handy-Meldungen ─────────
test("melden: Standard alles an, Prüfung der Schalter, einzelnes Ereignis abschaltbar", () => {
  assert.deepEqual(meldenLesen({}), MELDEN_STANDARD);
  assert.equal(meldenErlaubt({}, "ideen"), true);
  assert.equal(meldenErlaubt({ melden: { ideen: false } }, "ideen"), false);
  assert.equal(meldenErlaubt({ melden: { aktiv: false } }, "fehler"), false);
  assert.equal(meldenErlaubt({}, "gibt-es-nicht"), false);
  assert.equal(meldenPruefen({ treffer: false, tagesabschluss_uhrzeit: "22:15" }, { ideen: false }).tagesabschluss_uhrzeit, "22:15");
  assert.equal(meldenPruefen({ treffer: false }, { ideen: false }).ideen, false);
  assert.throws(() => meldenPruefen({ tagesabschluss_uhrzeit: "25:00" }), /HH:MM/);
  assert.throws(() => meldenPruefen({ token: "x" }), /gibt es nicht/);
  assert.throws(() => meldenPruefen({ ideen: 1 }), /true oder false/);
});

test("melden: ohne Zugang passiert still nichts; mit Zugang geht genau eine Anfrage an Telegram; der Token steht nie im Log", async () => {
  const anfragen = [], logs = [];
  const holen = async (url, opt) => { anfragen.push([url, opt]); return { ok: true }; };
  const ohne = erstelleMelden({ zugang: () => ({ token: "", chat: "" }), holen, log: (t) => logs.push(t), testDatei: "" });
  assert.deepEqual(await ohne.senden("ideen", "Hallo"), { gesendet: false, grund: "nicht eingerichtet" });
  assert.equal(ohne.eingerichtet(), false);
  assert.equal(anfragen.length, 0);
  const mit = erstelleMelden({ zugang: () => ({ token: "123:GEHEIM", chat: "42" }), holen, log: (t) => logs.push(t), einstellungen: () => ({ melden: { treffer: false } }), testDatei: "" });
  assert.deepEqual(await mit.senden("ideen", "10 Ideen bereit"), { gesendet: true });
  assert.equal(anfragen.length, 1);
  assert.equal(anfragen[0][0], "https://api.telegram.org/bot123:GEHEIM/sendMessage");
  assert.match(anfragen[0][1].body, /chat_id=42&text=10\+Ideen\+bereit/);
  assert.equal((await mit.senden("treffer", "x")).grund, "ausgeschaltet");
  assert.equal(anfragen.length, 1);
  // Fehler von Telegram: kein Absturz, Log ohne Token
  const kaputt = erstelleMelden({ zugang: () => ({ token: "123:GEHEIM", chat: "42" }), holen: async () => { throw new Error("getaddrinfo ENOTFOUND https://api.telegram.org/bot123:GEHEIM/sendMessage"); }, log: (t) => logs.push(t), testDatei: "" });
  assert.equal((await kaputt.senden("fehler", "x")).gesendet, false);
  assert.equal(logs.length, 1);
  assert.ok(!logs.join().includes("GEHEIM") || !logs.join().includes("123:GEHEIM"));
  assert.ok(!logs.join().includes("123:"));
  // Test-Instanz (Attrappe): nie an Telegram, auch mit Zugang
  const test_ = erstelleMelden({ zugang: () => ({ token: "123:GEHEIM", chat: "42" }), holen, nurTest: true, testDatei: "" });
  assert.equal((await test_.senden("ideen", "x")).grund, "Test-Instanz");
  assert.equal(anfragen.length, 1);
});

test("tagesabschlussText: eine Zeile mit heute, morgen und Followern", () => {
  const slots = [
    { datum: HEUTE, status: "gepostet" }, { datum: HEUTE, status: "gepostet" }, { datum: HEUTE, status: "geplant" }, { datum: HEUTE, status: "fehler" },
    { datum: MORGEN, status: "geplant" }, { datum: MORGEN, status: "skript_fertig" }, { datum: MORGEN, status: "recherche" },
  ];
  const text = tagesabschlussText({ heute: HEUTE, morgen: MORGEN, slots, plusHeute: { simulierbar: 12, "stelldirvor.pov": -1 } });
  assert.equal(text, "Tagesabschluss 10.11.: Heute 2 gepostet, 1 geplant, 1 offen · Morgen 1/4 geplant, 1 Skript wartet auf dich, 1 in Arbeit · Follower heute: simulierbar +12, stelldirvor.pov -1");
  assert.ok(!text.includes("\n"));
  assert.match(tagesabschlussText({ heute: HEUTE, morgen: MORGEN, slots: [] }), /Morgen 0\/4 geplant \(noch nichts gewählt\)$/);
});
