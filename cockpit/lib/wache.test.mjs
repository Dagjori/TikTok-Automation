// Tests für cockpit/lib/wache.mjs (Zeitlimit, Stillstand, Nutzungslimit, Erholung, Nachprüfung). Aufruf: node --test cockpit/lib/wache.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { GRENZEN_STANDARD, grenzenLesen, wachePruefen, limitErkennen, zonenZeit, berlinIso, erholung, nachpruefungErgebnis, VERWAIST_NACH_MIN, LIMIT_OHNE_ZEIT_MIN } from "./wache.mjs";

const MIN = 60000;

test("grenzenLesen: Standard je Art, unbekannte Art, Einstellung überschreibt, Umgebung nur für Tests", () => {
  assert.deepEqual(grenzenLesen("ideen"), { max_s: 30 * 60, still_s: 15 * 60 });
  assert.deepEqual(grenzenLesen("produktion"), { max_s: GRENZEN_STANDARD.produktion.max_min * 60, still_s: GRENZEN_STANDARD.produktion.still_min * 60 });
  assert.deepEqual(grenzenLesen("gibt-es-nicht"), { max_s: 120 * 60, still_s: 30 * 60 });
  assert.equal(grenzenLesen("ideen", { wache: { ideen: { max_min: 45 } } }).max_s, 45 * 60);
  assert.equal(grenzenLesen("ideen", { wache: { ideen: { max_min: -3, still_min: "x" } } }).max_s, 30 * 60); // Unsinn → Standard
  assert.deepEqual(grenzenLesen("produktion", {}, { max_s: "20", still_s: "8" }), { max_s: 20, still_s: 8 });
});

test("wachePruefen: gesunder Lauf, Zeitlimit, Stillstand", () => {
  const g = grenzenLesen("skripte"); // 60 Min., still 20 Min.
  const start = Date.parse("2026-11-10T10:00:00Z");
  assert.equal(wachePruefen({ startMs: start, letzteAusgabeMs: start + 14 * MIN, jetztMs: start + 15 * MIN }, g), null);
  const zeit = wachePruefen({ startMs: start, letzteAusgabeMs: start + 60 * MIN, jetztMs: start + 61 * MIN }, g);
  assert.equal(zeit.grund, "zeit");
  assert.match(zeit.text, /Zeitlimit.*60 Min\./);
  const still = wachePruefen({ startMs: start, letzteAusgabeMs: start + 5 * MIN, jetztMs: start + 26 * MIN }, g);
  assert.equal(still.grund, "still");
  assert.match(still.text, /20 Min\. lang kam keine Ausgabe/);
  // Ohne jede Ausgabe zählt der Start
  assert.equal(wachePruefen({ startMs: start, jetztMs: start + 21 * MIN }, g).grund, "still");
  assert.equal(wachePruefen({ startMs: 0, jetztMs: start }, g), null);
  assert.match(wachePruefen({ startMs: start, letzteAusgabeMs: start + 481 * MIN, jetztMs: start + 481 * MIN }, grenzenLesen("produktion")).text, /8 Std\./);
});

test("limitErkennen: echte Meldung der CLI vom 09.11. (5-hour limit · resets 6pm Europe/Berlin)", () => {
  const jetzt = new Date("2026-11-09T15:53:28Z"); // 16:53 in Berlin
  const l = limitErkennen("You've hit your 5-hour limit · resets 6pm (Europe/Berlin)", jetzt);
  assert.equal(l.art, "5-hour");
  assert.equal(l.bis, "2026-11-09T17:00:00.000Z"); // 18:00 Berlin (Winterzeit)
  assert.equal(l.ungefaehr, false);
  // Dieselbe Meldung im Ergebnis eines abgebrochenen Agenten
  const agent = limitErkennen("Agent terminated early due to an API error: You've hit your 5-hour limit · resets 6pm (Europe/Berlin) (error type rate_limit, HTTP 429, request id req_x)", jetzt);
  assert.equal(agent.bis, "2026-11-09T17:00:00.000Z");
});

test("limitErkennen: Uhrzeiten (12am, Minuten, schon vorbei → morgen), Sommerzeit, Datum, andere Zeitzone", () => {
  assert.equal(limitErkennen("You've hit your 5-hour limit · resets 12am (Europe/Berlin)", new Date("2026-11-09T20:00:00Z")).bis, "2026-11-09T23:00:00.000Z");
  assert.equal(limitErkennen("You’ve hit your session limit · resets 6:30pm (Europe/Berlin)", new Date("2026-11-09T15:00:00Z")).bis, "2026-11-09T17:30:00.000Z");
  // 9am ist heute schon vorbei → morgen 9 Uhr
  assert.equal(limitErkennen("You've hit your 5-hour limit · resets 9am (Europe/Berlin)", new Date("2026-11-09T15:00:00Z")).bis, "2026-11-10T08:00:00.000Z");
  // Sommerzeit: 18 Uhr Berlin = 16 Uhr UTC
  assert.equal(limitErkennen("You've hit your 5-hour limit · resets 6pm (Europe/Berlin)", new Date("2026-07-01T12:00:00Z")).bis, "2026-07-01T16:00:00.000Z");
  // Wochenlimit mit Datum
  const woche = limitErkennen("You've hit your weekly limit · resets Nov 12, 9am (Europe/Berlin)", new Date("2026-11-09T15:00:00Z"));
  assert.equal(woche.art, "weekly");
  assert.equal(woche.bis, "2026-11-12T08:00:00.000Z");
  assert.equal(limitErkennen("You've hit your 5-hour limit · resets 6pm (America/New_York)", new Date("2026-11-09T15:00:00Z")).bis, "2026-11-09T23:00:00.000Z");
});

test("limitErkennen: ohne lesbare Zeit bzw. nur HTTP 429 → eine Stunde warten; kein Limit → null", () => {
  const jetzt = new Date("2026-11-09T15:00:00Z");
  const nur429 = limitErkennen("API Error: 429 {\"type\":\"error\",\"error\":{\"type\":\"rate_limit_error\"}}", jetzt);
  assert.equal(nur429.ungefaehr, true);
  assert.equal(Date.parse(nur429.bis) - jetzt.getTime(), LIMIT_OHNE_ZEIT_MIN * MIN);
  assert.equal(limitErkennen("You've hit your 5-hour limit", jetzt).ungefaehr, true);
  assert.equal(limitErkennen("Attrappe: simulierter Fehler", jetzt), null);
  assert.equal(limitErkennen("Das Tempolimit auf der Autobahn bleibt bei 130.", jetzt), null);
  assert.equal(limitErkennen("ElevenLabs: quota_exceeded, character limit reached", jetzt), null);
  assert.equal(limitErkennen("", jetzt), null);
});

test("zonenZeit und berlinIso: Winter- und Sommerzeit", () => {
  assert.equal(new Date(zonenZeit(2026, 11, 10, 12, 30)).toISOString(), "2026-11-10T11:30:00.000Z");
  assert.equal(berlinIso("2026-07-10", "19:30"), "2026-07-10T17:30:00.000Z");
  assert.equal(berlinIso("2026-11-10", "09:30"), "2026-11-10T08:30:00.000Z");
});

test("erholung: Recherche (eigener Auftrag sofort, fremder erst nach langer Ruhe)", () => {
  const x = { status: "recherche", datum: "2026-11-11" };
  const eigen = erholung(x, { eigen: true, alterMs: 1000 });
  assert.equal(eigen.art, "fehler");
  assert.equal(eigen.felder.status, "fehler");
  assert.equal(eigen.felder.fehler_phase, "recherche");
  assert.match(eigen.felder.fehler, /Cockpit wurde neu gestartet/);
  assert.equal(erholung(x, { eigen: false, alterMs: 30 * MIN }), null); // der andere Rechner könnte daran arbeiten
  assert.equal(erholung(x, { eigen: false, alterMs: (VERWAIST_NACH_MIN.recherche + 1) * MIN }).art, "fehler");
});

test("erholung: Produktion nie doppelt starten, wenn schon eine post_id oder geplant_fuer da ist", () => {
  const ohne = erholung({ status: "produktion", datum: "2026-11-11", uhrzeit: "12:30" }, { eigen: true });
  assert.equal(ohne.art, "fehler");
  assert.equal(ohne.felder.fehler_phase, "produktion");
  const mitPost = erholung({ status: "produktion", datum: "2026-11-11", uhrzeit: "12:30", post_id: "6af1" }, { eigen: true });
  assert.equal(mitPost.art, "geplant");
  assert.equal(mitPost.felder.status, "geplant");
  assert.equal(mitPost.felder.geplant_fuer, "2026-11-11T11:30:00.000Z"); // aus Datum und Uhrzeit des Slots
  const mitZeit = erholung({ status: "uebergeben", datum: "2026-11-11", geplant_fuer: "2026-11-11T19:30:00+01:00" }, { eigen: true });
  assert.equal(mitZeit.felder.geplant_fuer, "2026-11-11T19:30:00+01:00");
  assert.deepEqual(mitZeit.felder.nachpruefen_angefordert, { __delete__: true });
  assert.equal(erholung({ status: "uebergeben", datum: "2026-11-11" }, { eigen: false, alterMs: 60 * MIN }), null);
  assert.equal(erholung({ status: "uebergeben", datum: "2026-11-11" }, { eigen: false, alterMs: 9 * 60 * MIN }).art, "fehler");
});

test("erholung: hängende Nachprüfung wird freigegeben, alles andere bleibt", () => {
  const jetzt = new Date("2026-11-10T12:00:00Z");
  const haengt = erholung({ status: "geplant", nachpruefen_angefordert: "2026-11-09T12:07:33.986Z" }, { jetzt });
  assert.equal(haengt.art, "nachpruefen");
  assert.deepEqual(haengt.felder, { nachpruefen_angefordert: { __delete__: true } });
  assert.equal(erholung({ status: "geplant", nachpruefen_angefordert: "2026-11-10T11:50:00Z" }, { jetzt }), null); // läuft vielleicht gerade
  assert.equal(erholung({ status: "geplant", nachpruefen_angefordert: "2026-11-10T11:50:00Z" }, { jetzt, eigen: true }).art, "nachpruefen");
  for (const status of ["geplant", "gepostet", "skript_fertig", "freigegeben", "gewaehlt", "fehler", "rueckfrage"]) assert.equal(erholung({ status }, { eigen: true, alterMs: 1e12 }), null);
});

test("nachpruefungErgebnis: Erfolg, Befund von Claude, bis zu 3 Versuche, Stopp, Limit", () => {
  const jetzt = new Date("2026-11-10T12:00:00Z");
  assert.deepEqual(nachpruefungErgebnis({ status: "gepostet" }), { art: "fertig" });
  assert.deepEqual(nachpruefungErgebnis({ status: "fehler", fehler_phase: "nachpruefen" }), { art: "claude_fehler" });
  const eins = nachpruefungErgebnis({ status: "geplant" }, { jetzt, abstandS: 600 });
  assert.equal(eins.art, "nochmal");
  assert.equal(eins.felder.nachpruefen_versuche, 1);
  assert.equal(eins.felder.nachpruefen_ab, "2026-11-10T12:10:00.000Z");
  assert.deepEqual(eins.felder.nachpruefen_angefordert, { __delete__: true });
  assert.equal(nachpruefungErgebnis({ status: "geplant", nachpruefen_versuche: 1 }, { jetzt }).felder.nachpruefen_versuche, 2);
  const drei = nachpruefungErgebnis({ status: "geplant", nachpruefen_versuche: 2 }, { jetzt });
  assert.equal(drei.art, "aufgeben");
  assert.equal(drei.felder.status, "fehler");
  assert.equal(drei.felder.fehler_phase, "nachpruefen");
  assert.equal(drei.felder.auto_wiederholt_phase, "nachpruefen"); // keine weitere automatische Wiederholung
  const stopp = nachpruefungErgebnis({ status: "geplant" }, { gestoppt: true, jetzt });
  assert.equal(stopp.art, "gestoppt");
  assert.equal(stopp.felder.auto_gemeldet, true);
  const limit = nachpruefungErgebnis({ status: "geplant", nachpruefen_versuche: 2 }, { limit: true, jetzt });
  assert.equal(limit.art, "limit"); // zählt nicht als Versuch
  assert.deepEqual(limit.felder, { nachpruefen_angefordert: { __delete__: true } });
});
