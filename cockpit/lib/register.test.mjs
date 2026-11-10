// Tests für cockpit/lib/register.mjs (Video-Register) und cockpit/lib/protokoll.mjs (Protokoll-Zeilen).
// Aufruf: node --test cockpit/lib/register.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { registerBauen, registerNotiz, bisherListe, metrikenLetzte, ohneDatum, erstelleRegister, STATUS_REIHE } from "./register.mjs";
import { protokollLesen, csvFelder, csvFeld, zeileBauen, anhaengen, statusSetzen, zeilePruefen } from "./protokoll.mjs";

const JETZT = new Date("2026-11-10T20:00:00Z");
const slot = (id, daten) => ({ id, daten: { konto: id.startsWith("acc1") ? "simulierbar" : "stelldirvor", datum: id.slice(5, 15), slot: id.split("-").pop(), ...daten } });
const SLOTS = [
  slot("acc1-2026-11-09-abend", { titel: "Kaffee oder Tee? Wer zahlt mehr Steuern?", thema: "Kaffeesteuer", status: "gepostet", projekt: "kaffee-tee-steuer", post_id: "p1", nachgeprueft: "2026-11-09T19:30:28Z", geplant_fuer: "2026-11-09T19:30:00+01:00", korrekturen: [{ feld: "x" }], idee: { nr: 1, feld: "Steuern", format: "Duell", suchbegriff: "Kaffeesteuer", punkte: 18, hook: "nicht ins Register" }, auto_gewaehlt: true }),
  slot("acc1-2026-11-10-mittag", { titel: "Kindergeld: Deutschland | Kanada", status: "geplant", projekt: "kindergeld-kanada", post_id: "p2", geplant_fuer: "2026-11-10T12:30:00+01:00", idee: { nr: 10, feld: "Familie", suchbegriff: "Kindergeld" } }),
  slot("acc1-2026-11-11-mittag", { titel: "Neue Idee", status: "gewaehlt", idee: { nr: 3, typ: "folgeteil", teil: 2, serie: { wurzel_titel: "Mieten oder kaufen" } } }),
  slot("acc1-2026-11-11-abend", { titel: "Skript in Arbeit", status: "skript_fertig", idee: { nr: 4, format: "Rechnung" } }),
  slot("acc2-2026-11-10-abend", { titel: "Was wäre, wenn [[Polarnacht]]?", status: "produktion", projekt: "polarnacht" }),
  slot("acc2-2026-11-07-abend", { titel: "Abgebrochen", status: "fehler", fehler_phase: "produktion", fehler: "Die Produktion wurde abgebrochen." }),
];
const POSTS = [
  { kanal: "simulierbar", post_id: "p1", gesendet: "2026-11-09T18:32:51.512Z", link: "https://tiktok.com/@simulierbar/video/1", titel: "Kaffee oder Tee – wer zahlt?", projekt: "kaffee-tee-steuer", dauer_s: 73, buffer: { views: 100, avg_watch_s: 21.9, follows: null }, tiktok: { views: 253, likes: 8 } },
  { kanal: "simulierbar", post_id: "p2", gesendet: "2026-11-10T11:31:00.000Z", link: "https://tiktok.com/@simulierbar/video/2", titel: "Kindergeld", projekt: "kindergeld-kanada", dauer_s: 70, buffer: { views: 40 }, tiktok: null },
  { kanal: "stelldirvor.pov", post_id: "p9", gesendet: "2026-11-02T18:30:00.000Z", link: "https://tiktok.com/@stelldirvor.pov/video/9", titel: "Was wäre, wenn die Sonne erlischt? – Test", projekt: "a2-sonne", dauer_s: 70, buffer: { views: 900 }, tiktok: null },
];
const FOLGEN = [{ post_id: "p1", plus24: 4, views24: 240, treffer: true, teil: 1, faktor_median: 3.2 }];
const PROTOKOLL = protokollLesen([
  "datum,slot,konto,titel,projekt,post_id,status",
  '2026-11-03,mittag,simulierbar,"Studium oder Ausbildung: Wer hat mit 40 mehr verdient?",studium-ausbildung,p3,gepostet',
  "2026-11-09,abend,simulierbar,Kaffee oder Tee,kaffee-tee-steuer,p1,gepostet",
].join("\n"));
const projektSkript = (name) => (name === "kaffee-tee-steuer" ? { stil: "18 Dunkles Studio", testbloecke: {}, lern_notizen: { hook: "Duell-Frage", laenge_s: 73, woerter: 173 } } : name === "polarnacht" ? { stil: "Polar", format: "POV" } : null);
const bauen = (extra = {}) => registerBauen({ slots: SLOTS, posts: POSTS, folgen: FOLGEN, protokoll: PROTOKOLL, projektSkript, metriken: {}, jetzt: JETZT, ...extra });

test("registerBauen: ein Eintrag je Slot-ID, neueste zuerst, Felder aus allen Quellen", () => {
  const r = bauen();
  assert.deepEqual(r.eintraege.map((e) => e.id), ["acc1-2026-11-11-abend", "acc1-2026-11-11-mittag", "acc2-2026-11-10-abend", "acc1-2026-11-10-mittag", "acc1-2026-11-09-abend", "acc2-2026-11-07-abend", "acc1-2026-11-03-mittag", "acc2-2026-11-02-abend"]);
  const kaffee = r.eintraege.find((e) => e.id === "acc1-2026-11-09-abend");
  assert.equal(kaffee.status, "gepostet");
  assert.equal(kaffee.link, "https://tiktok.com/@simulierbar/video/1");
  assert.deepEqual(kaffee.idee, { nr: 1, feld: "Steuern", format: "Duell", suchbegriff: "Kaffeesteuer", punkte: 18 }); // nur die Register-Felder der Idee
  assert.equal(kaffee.stil, "18 Dunkles Studio");
  assert.equal(kaffee.lern.hook, "Duell-Frage");
  assert.equal(kaffee.korrekturen, 1);
  assert.equal(kaffee.automatisch.gewaehlt, true);
  assert.deepEqual([kaffee.zahlen.aufrufe, kaffee.zahlen.dauer_s, kaffee.zahlen.avg_watch_s, kaffee.zahlen.gesehen_prozent, kaffee.zahlen.follows, kaffee.zahlen.treffer], [253, 73, 21.9, 30, 4, true]);
  assert.equal(kaffee.laenge_s, 73);
});

test("registerBauen: „gepostet“ kommt aus posts[].gesendet, nicht aus dem Status des Slots", () => {
  const r = bauen();
  const kindergeld = r.eintraege.find((e) => e.id === "acc1-2026-11-10-mittag");
  assert.equal(kindergeld.slot_status, "geplant"); // die Nachprüfung fehlt noch
  assert.equal(kindergeld.status, "gepostet"); // Buffer hat es aber schon gesendet
  // Noch nicht gesendet (Zeit liegt in der Zukunft): bleibt „geplant“
  const frueher = bauen({ jetzt: new Date("2026-11-10T09:00:00Z") });
  assert.equal(frueher.eintraege.find((e) => e.id === "acc1-2026-11-10-mittag").status, "geplant");
});

test("registerBauen: Status-Kette Idee, Skript, in Produktion, Fehler", () => {
  const status = Object.fromEntries(bauen().eintraege.map((e) => [e.id, e.status]));
  assert.equal(status["acc1-2026-11-11-mittag"], "Idee");
  assert.equal(status["acc1-2026-11-11-abend"], "Skript");
  assert.equal(status["acc2-2026-11-10-abend"], "in Produktion");
  assert.equal(status["acc2-2026-11-07-abend"], "Fehler");
  const zf = bauen().zusammenfassung;
  assert.equal(zf.gesamt, 8);
  assert.deepEqual(zf.je_status, { Idee: 1, Skript: 1, "in Produktion": 1, geplant: 0, gepostet: 4, Fehler: 1 });
  assert.equal(zf.je_format.Duell, 1);
  assert.equal(zf.je_konto.simulierbar.gepostet, 3);
});

test("registerBauen: ältere Videos aus Protokoll, Buffer und Insights (ohne Slot-Dokument), nichts doppelt", () => {
  const r = bauen({ metriken: metrikenLetzte(["abruf,kanal,post_id,gesendet,titel,projekt,dauer_s,views,avg_watch_s,follows,tt_views", "2026-11-04T20:00:00Z,simulierbar,p3,2026-11-03T11:30:00Z,Studium,studium-ausbildung,69,1200,20,3,1500", "2026-11-05T20:00:00Z,simulierbar,p3,2026-11-03T11:30:00Z,Studium,studium-ausbildung,69,1300,21,3,1900", "2026-11-02T20:00:00Z,simulierbar,p0,2026-11-01T18:33:00Z,\"Steuererklärung, oder Überstunden\",steuer-ueberstunden,67,0,0,,124"].join("\n")) });
  const studium = r.eintraege.find((e) => e.id === "acc1-2026-11-03-mittag");
  assert.equal(studium.quelle, "protokoll");
  assert.equal(studium.titel, "Studium oder Ausbildung: Wer hat mit 40 mehr verdient?");
  assert.equal(studium.zahlen.aufrufe, 1900); // jüngste Zeile der Insights
  const sonne = r.eintraege.find((e) => e.post_id === "p9");
  assert.equal(sonne.id, "acc2-2026-11-02-abend"); // Slot aus der Sendezeit (19:30 Berlin)
  assert.equal(sonne.quelle, "buffer");
  assert.equal(sonne.titel, "Was wäre, wenn die Sonne erlischt?");
  const alt = r.eintraege.find((e) => e.post_id === "p0");
  assert.equal(alt.quelle, "insights");
  assert.equal(alt.id, "acc1-2026-11-01-abend");
  assert.equal(new Set(r.eintraege.map((e) => e.id)).size, r.eintraege.length);
  assert.equal(r.eintraege.filter((e) => e.post_id === "p1").length, 1); // Slot und Protokollzeile desselben Videos
});

test("registerNotiz: Kopf wie im Hirn, Hinweis „nicht von Hand ändern“, je Account eine Tabelle, Link nur wenn gepostet", () => {
  const notiz = registerNotiz(bauen(), "2026-11-10");
  assert.match(notiz, /^---\ntyp: wissen\nkonto: gemeinsam\nstatus: aktuell\ndatum: 2026-11-10\nquelle: cockpit\/lib\/register\.mjs\ntags: \[konto\/gemeinsam, [^\]]+\]\ncssclasses: \[konto-gemeinsam, typ-wissen\]\n---\n/);
  assert.match(notiz, /wird vom Cockpit erzeugt, nicht von Hand ändern/);
  assert.match(notiz, /## Simulierbar\n\n\| Datum \| Slot \| Titel \| Feld · Format \| Status \| Länge \| Aufrufe \| Ø-Wiedergabe \| Follows \| Treffer · Teil \|/);
  assert.match(notiz, /## Stell dir vor\n/);
  assert.match(notiz, /\| 09\.11\. \| Abend \| \[Kaffee oder Tee\? Wer zahlt mehr Steuern\?\]\(https:\/\/tiktok\.com\/@simulierbar\/video\/1\) \| Steuern · Duell \| gepostet \| 73 s \| 253 \| 21,9 s \(30 %\) \| \+4 \| Treffer \|/);
  assert.match(notiz, /\| 11\.11\. \| Mittag \| Neue Idee \| – \| Idee \| – \| – \| – \| – \| Teil 2 \|/);
  assert.match(notiz, /\| 07\.11\. \| Abend \| Abgebrochen \| – \| Fehler \(produktion\) \|/);
  assert.match(notiz, /\*\*Nach Status:\*\* Idee 1 · Skript 1 · in Produktion 1 · geplant 0 · gepostet 4 · Fehler 1/);
  // Zeichen, die Tabelle oder Wikilinks stören würden, sind entschärft
  assert.ok(!notiz.includes("[[Polarnacht]]"));
  assert.ok(notiz.includes("Kindergeld: Deutschland ∣ Kanada"));
  // Jede Tabellenzeile hat genau 10 Spalten
  for (const z of notiz.split("\n").filter((z) => z.startsWith("| "))) assert.equal(z.split("|").length, 12, z);
  // Simulierbar: neueste zuerst
  const zeilen = notiz.split("## Stell dir vor")[0].split("\n").filter((z) => /^\| \d\d\.\d\d\. /.test(z)).map((z) => z.slice(2, 8));
  assert.deepEqual(zeilen, ["11.11.", "11.11.", "10.11.", "09.11.", "03.11."]);
});

test("ohneDatum: nur die Datumszeile im Kopf zählt nicht als Änderung", () => {
  const r = bauen();
  assert.equal(ohneDatum(registerNotiz(r, "2026-11-10")), ohneDatum(registerNotiz(r, "2026-11-11")));
  const anders = bauen({ posts: POSTS.map((p) => (p.post_id === "p1" ? { ...p, tiktok: { views: 999 } } : p)) });
  assert.notEqual(ohneDatum(registerNotiz(r, "2026-11-10")), ohneDatum(registerNotiz(anders, "2026-11-10")));
});

test("bisherListe: Titel und Suchbegriff je Konto, ohne Doppelte", () => {
  const liste = bisherListe(bauen().eintraege, "simulierbar");
  assert.ok(liste.includes("Kaffee oder Tee? Wer zahlt mehr Steuern? (Suchbegriff: Kaffeesteuer)"));
  assert.ok(liste.includes("Kindergeld: Deutschland | Kanada (Suchbegriff: Kindergeld)"));
  assert.ok(liste.includes("Neue Idee"));
  assert.ok(!liste.some((t) => t.includes("Polarnacht")));
  assert.equal(bisherListe(bauen().eintraege, "simulierbar", 2).length, 2);
  assert.deepEqual(STATUS_REIHE, ["Idee", "Skript", "in Produktion", "geplant", "gepostet", "Fehler"]);
});

test("erstelleRegister: schreibt register.json und die Notiz nur bei geändertem Inhalt und nur, wenn kein Auftrag läuft", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cockpit-register-"));
  const daten = path.join(tmp, "daten"), repo = path.join(tmp, "repo");
  fs.mkdirSync(path.join(daten, "db", "skripte"), { recursive: true });
  fs.mkdirSync(path.join(daten, "zahlen"), { recursive: true });
  fs.mkdirSync(path.join(repo, "data", "produktion"), { recursive: true });
  for (const s of SLOTS) fs.writeFileSync(path.join(daten, "db", "skripte", `${s.id}.json`), JSON.stringify({ daten: s.daten, version: 1 }));
  fs.writeFileSync(path.join(daten, "zahlen", "stand.json"), JSON.stringify({ posts: POSTS }));
  fs.writeFileSync(path.join(repo, "data", "produktion", "protokoll.csv"), "datum,slot,konto,titel,projekt,post_id,status\n");
  const notizDatei = path.join(tmp, "hirn", "Video-Register.md");
  let frei = false;
  const reg = erstelleRegister({ repo, daten, notizDatei, darfSchreiben: () => frei, heute: () => "2026-11-10" });
  const eins = await reg.aktualisieren();
  assert.equal(eins.ok, true);
  assert.equal(eins.notiz.geschrieben, false); // ein Auftrag läuft: Notiz wird aufgeschoben
  assert.ok(!fs.existsSync(notizDatei));
  assert.equal(JSON.parse(fs.readFileSync(path.join(daten, "register.json"), "utf8")).eintraege.length, 7);
  frei = true;
  assert.equal((await reg.aktualisieren()).notiz.geschrieben, true);
  const text = fs.readFileSync(notizDatei, "utf8");
  assert.match(text, /# Video-Register/);
  assert.equal((await reg.aktualisieren()).notiz.grund, "unverändert"); // gleicher Inhalt: nicht noch einmal schreiben
  // Erzwungen (Commit-Schritt einer Sitzung) geht auch während eines Auftrags
  frei = false;
  fs.writeFileSync(path.join(daten, "db", "skripte", "acc1-2026-11-11-abend.json"), JSON.stringify({ daten: { ...SLOTS[3].daten, status: "freigegeben", titel: "Neuer Titel" }, version: 2 }));
  assert.equal((await reg.aktualisieren({ erzwingen: true })).notiz.geschrieben, true);
  assert.match(fs.readFileSync(notizDatei, "utf8"), /Neuer Titel/);
  assert.ok(reg.bisher("simulierbar").some((t) => t.startsWith("Neuer Titel")));
  fs.rmSync(tmp, { recursive: true, force: true });
});

// ───────── Protokoll ─────────
test("protokollLesen: liest auch alte Zeilen mit unquotiertem Komma im Titel richtig", () => {
  const zeilen = protokollLesen([
    "datum,slot,konto,titel,projekt,post_id,status",
    '2026-11-03,mittag,simulierbar,"Studium oder Ausbildung: Wer hat mit 40 mehr verdient?",studium-ausbildung,6ae9,gepostet',
    "2026-11-07,abend,stelldirvor.pov,Was wäre, wenn alle Kontinente zusammenstoßen?,a2-pangaea,6aed,geplant",
    "kaputt,zu,kurz",
    "",
  ].join("\r\n"));
  assert.equal(zeilen.length, 2);
  assert.deepEqual(zeilen[1], { datum: "2026-11-07", slot: "abend", konto: "stelldirvor.pov", titel: "Was wäre, wenn alle Kontinente zusammenstoßen?", projekt: "a2-pangaea", post_id: "6aed", status: "geplant" });
});

test("anhaengen: Titel mit Komma und Anführungszeichen korrekt, vorhandene Zeilen bleiben Zeichen für Zeichen, nie doppelt", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cockpit-protokoll-"));
  const datei = path.join(tmp, "protokoll.csv");
  const alt = "datum,slot,konto,titel,projekt,post_id,status\n2026-11-07,abend,stelldirvor.pov,Was wäre, wenn alle Kontinente zusammenstoßen?,a2-pangaea,6aed,geplant";
  fs.writeFileSync(datei, alt); // ohne Zeilenende am Schluss
  const eintrag = { datum: "2026-11-11", slot: "mittag", konto: "simulierbar", titel: 'Kaffee, Tee oder „Wasser"? 1 € am Tag', projekt: "kaffee-tee", post_id: "6af9", status: "geplant" };
  assert.deepEqual(anhaengen(datei, eintrag), { angehaengt: true });
  const text = fs.readFileSync(datei, "utf8");
  assert.ok(text.startsWith(alt + "\n"));
  assert.equal(text.split("\n").at(-2), '2026-11-11,mittag,simulierbar,"Kaffee, Tee oder „Wasser""? 1 € am Tag",kaffee-tee,6af9,geplant');
  assert.equal(csvFelder(text.split("\n").at(-2)).length, 7);
  assert.equal(protokollLesen(text).at(-1).titel, eintrag.titel);
  assert.equal(anhaengen(datei, eintrag).angehaengt, false); // dieselbe post_id steht schon drin
  assert.equal(fs.readFileSync(datei, "utf8"), text);
  // Status setzen ändert nur das letzte Feld der einen Zeile
  assert.deepEqual(statusSetzen(datei, "6aed", "gepostet"), { geaendert: 1 });
  const danach = fs.readFileSync(datei, "utf8").split("\n");
  assert.equal(danach[1], "2026-11-07,abend,stelldirvor.pov,Was wäre, wenn alle Kontinente zusammenstoßen?,a2-pangaea,6aed,gepostet");
  assert.equal(danach[2], text.split("\n")[2]);
  assert.equal(statusSetzen(datei, "gibtesnicht", "gepostet").geaendert, 0);
  // Leere Datei: Kopfzeile kommt dazu
  const neu = path.join(tmp, "neu.csv");
  anhaengen(neu, eintrag);
  assert.ok(fs.readFileSync(neu, "utf8").startsWith("datum,slot,konto,titel,projekt,post_id,status\n2026-11-11,"));
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("zeilePruefen und csvFeld: falsche Eingaben werden abgelehnt, Felder richtig quotiert", () => {
  const gut = { datum: "2026-11-11", slot: "mittag", konto: "simulierbar", titel: "T", projekt: "p-1", post_id: "6af9", status: "geplant" };
  assert.doesNotThrow(() => zeilePruefen(gut));
  for (const [k, v] of [["datum", "11.11.2026"], ["slot", "nachts"], ["konto", "stelldirvor"], ["titel", " "], ["projekt", "mit leer"], ["post_id", ""], ["status", "online"]]) assert.throws(() => zeilePruefen({ ...gut, [k]: v }), new RegExp(k));
  assert.equal(csvFeld("a,b"), '"a,b"');
  assert.equal(csvFeld('a"b'), '"a""b"');
  assert.equal(csvFeld("einfach"), "einfach");
  assert.equal(zeileBauen({ ...gut, titel: "Zeile\numbruch" }), '2026-11-11,mittag,simulierbar,"Zeile umbruch",p-1,6af9,geplant');
});
