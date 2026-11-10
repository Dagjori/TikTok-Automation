// Automatiken des Cockpits (Entscheidung des Inhabers 07.11. per Klick). Das Cockpit erledigt selbst:
//   1. die Recherche kurz nach der Wahl einer Idee (Slot-Feld auto_recherche_ab, gesetzt in studio.waehlen),
//   2. die Produktion nach der Freigabe, sobald alle Skripte eines Tages freigegeben sind (auto_produktion_ab, studio.freigeben;
//      worauf sie noch wartet, steht in auto_produktion_wartet),
//   3. jeden Morgen zu fester Zeit die Ideen für den nächsten Tag in beiden Accounts,
//   4. bei Fehlern in Recherche, Produktion oder Nachprüfung eine einmalige Wiederholung, bevor der Inhaber gefragt wird
//      (auto_wiederholt_phase; scheitert dieselbe Phase erneut, einmal eine Meldung „… braucht dich“, auto_gemeldet).
// Die Freigabe der Skripte bleibt immer beim Inhaber. Was er selbst gestoppt hat, wird nie automatisch wiederholt.
// Laptop und Desktop-PC teilen DB und Einstellungen (lib/abgleich.mjs): jede Automatik löst über beide Rechner nur einmal aus
// (Anspruch „auto-…“, wer zuerst kommt). Vorrang hat der Rechner, auf dem die auslösende Änderung entstand (Wahl, Freigabe,
// Fehler); der andere springt erst FREMD_VERZUG_S später ein, z. B. wenn der erste aus ist.
// Geteilte Einstellung „automatik“: { recherche, produktion, ideen, ideen_uhrzeit: "HH:MM", wiederholen, auto_wahl,
// auto_wahl_frist_min, auto_freigabe, auto_freigabe_frist_min }; fehlt etwas → Standard.
// Ausbau 10.11.2026 (Wunsch des Inhabers: „so weit wie möglich automatisieren“):
//   · Ideen: bis zu 3 Versuche am Tag (erst nach Erfolg gilt der Tag als erledigt); fehlen heute noch Ideen und Slots sind frei,
//     kommen sie vor 15 Uhr auch für heute.
//   · Nutzungslimit (lib/wache.mjs): solange das Limit gilt, startet die Automatik nichts Neues und wiederholt nichts;
//     danach geht es von selbst weiter (eine Wiederholung nach dem Reset statt blind nach 5 Min.).
//   · Supabase nicht erreichbar: nach 60 s läuft die Automatik lokal auf diesem Rechner weiter (Zustand lokal(), Abzeichen
//     in der Oberfläche) statt zu pausieren.
//   · Autopilot, beide Schalter stehen auf AUS, bis der Inhaber sie einschaltet (lib/autopilot.mjs):
//     auto_wahl (Idee nach Frist selbst wählen) und auto_freigabe (geprüftes Skript nach Frist selbst freigeben).
import { autoWahl, freigabePruefen } from "./autopilot.mjs";
import { SLOTS, uhrzeit } from "./studio.mjs";

export const AUTOMATIK_STANDARD = Object.freeze({
  recherche: true, produktion: true, ideen: true, ideen_uhrzeit: "07:00", wiederholen: true,
  auto_wahl: false, auto_wahl_frist_min: 120, auto_freigabe: false, auto_freigabe_frist_min: 180,
});
const SCHALTER = ["recherche", "produktion", "ideen", "wiederholen", "auto_wahl", "auto_freigabe"];
const FRISTEN = ["auto_wahl_frist_min", "auto_freigabe_frist_min"];
const fristOk = (v) => Number.isInteger(v) && v >= 1 && v <= 2880;
const UHRZEIT_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const RECHERCHE_BEIDE_S = 15; // beide Slots belegt: kurz Zeit zum Umentscheiden
export const RECHERCHE_EINZELN_S = 180; // nur ein Slot: Zeit, den zweiten zu wählen (dann eine Sitzung für beide)
export const PRODUKTION_NACH_S = 60; // Zeit, eine Freigabe zurückzunehmen
const umgebungS = Number(process.env.COCKPIT_WIEDERHOLEN_S); // nur für Tests kürzer
export const WIEDERHOLEN_NACH_S = umgebungS > 0 ? umgebungS : 300;
export const WIEDERHOLBAR = { recherche: "Recherche", produktion: "Produktion", nachpruefen: "Nachprüfung" };
const TAKT_MS = 5000;
const FREMD_VERZUG_S = 60;
const FEHLER_HOECHSTENS_S = 12 * 3600; // ältere Fehler (z. B. von vor dem ersten Start mit Automatik) nicht mehr anfassen
const SUPABASE_WEG_MS = 60000;
export const IDEEN_VERSUCHE = 3; // je Tag
const IDEEN_HEUTE_BIS = "15:00"; // danach lohnen Ideen für heute nicht mehr
const fristS = Number(process.env.COCKPIT_AUTOPILOT_FRIST_S); // nur für Tests: beide Autopilot-Fristen in Sekunden
const SLOT_VORLAUF_MIN = 180; // Autopilot wählt für heute nur Slots, deren Posting-Zeit noch mindestens so weit weg ist

// Einstellung mit Standardwerten (alles an)
export function automatikLesen(einstellungen = {}) {
  const a = einstellungen?.automatik && typeof einstellungen.automatik === "object" ? einstellungen.automatik : {};
  const r = { ...AUTOMATIK_STANDARD };
  for (const k of SCHALTER) if (typeof a[k] === "boolean") r[k] = a[k];
  if (typeof a.ideen_uhrzeit === "string" && UHRZEIT_RE.test(a.ideen_uhrzeit)) r.ideen_uhrzeit = a.ideen_uhrzeit;
  for (const k of FRISTEN) if (fristOk(a[k])) r[k] = a[k];
  return r;
}

// Änderung aus der Oberfläche prüfen (auch teilweise, z. B. {"recherche": false}) → vollständiger neuer Wert
export function automatikPruefen(wert, alt) {
  if (!wert || typeof wert !== "object" || Array.isArray(wert)) throw new Error('automatik: Objekt erwartet, z. B. {"recherche": false}');
  const neu = automatikLesen({ automatik: alt });
  for (const [k, v] of Object.entries(wert)) {
    if (SCHALTER.includes(k)) {
      if (typeof v !== "boolean") throw new Error(`automatik.${k}: true oder false erwartet`);
      neu[k] = v;
    } else if (k === "ideen_uhrzeit") {
      if (typeof v !== "string" || !UHRZEIT_RE.test(v)) throw new Error("automatik.ideen_uhrzeit: Uhrzeit HH:MM erwartet (00:00 bis 23:59)");
      neu[k] = v;
    } else if (FRISTEN.includes(k)) {
      if (!fristOk(v)) throw new Error(`automatik.${k}: ganze Minuten von 1 bis 2880 erwartet`);
      neu[k] = v;
    } else throw new Error(`automatik.${k} gibt es nicht (erlaubt: ${[...SCHALTER, "ideen_uhrzeit", ...FRISTEN].join(", ")})`);
  }
  return neu;
}

export function erstelleAutomatik({
  db, studio, konten, einstellungen, einstellungenSichern, anspruch, heute, berlinZeit,
  feed = () => {}, melden = () => {}, jobs = () => [], cliDa = () => true, mehrereRechner = () => false, log = () => {},
  limitBis = () => 0, // ms: bis dahin gilt das Nutzungslimit von Claude (0 = keins)
  stimmePruefen = async () => null, // Text-Vorprüfung der Stimme für die automatische Freigabe → { ok, text }
  benachrichtigen = () => {}, // (ereignis, text) → Handy-Meldung (lib/melden.mjs)
}) {
  const lokal = new Map(); // Slot-ID → Version der letzten Änderung auf diesem Rechner (Vorrang)
  const ansprueche = new Map(); // Anspruchs-Schlüssel → { stand: "laeuft" | "meins" | "fremd" | "weg", zeit }
  const letzterFehler = new Map(); // Schritt → letzte Fehlermeldung (nur Änderungen loggen)
  let laeuft = false;
  let wegSeit = 0; // Supabase nicht erreichbar seit (ms); 0 = erreichbar
  let lokalModus = false; // true: Ansprüche gelten lokal, weil Supabase länger weg ist
  const limitAktiv = (jetztMs = Date.now()) => limitBis() > jetztMs;
  const fristMs = (min) => (fristS > 0 ? fristS : min * 60) * 1000;

  const ms = (iso) => Date.parse(iso || "") || 0;
  const kompakt = (iso) => String(iso || "").replace(/[^0-9TZ]/g, "") || "ohne";
  const tagPlus = (tag, n) => new Date(Date.parse(`${tag}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  // Nur Tage ab heute (bzw. ab gestern für die Nachprüfung) und ab dem Start des Cockpit-Studios
  const imPlan = (datum, ab) => !!datum && datum >= ab && (!einstellungen().studio_ab || datum >= einstellungen().studio_ab);
  const titelVon = (d) => d.daten.titel || d.id;
  const vorrang = (d) => lokal.get(d.id) === d.version;
  const verzugMs = (docs) => (!mehrereRechner() || docs.some(vorrang) ? 0 : FREMD_VERZUG_S * 1000);
  const fehlerZeit = (d) => ms(d.daten?.aktualisiert) || ms(d.aktualisiert);
  const mehrzahl = (n, eins, viele) => (n === 1 ? `1 ${eins}` : `${n} ${viele}`);
  const WEG = { __delete__: true };

  // Änderungen dieses Rechners (nicht vom Abgleich übernommen) geben Vorrang
  function dbEreignis(e) {
    if (e?.sammlung !== "skripte" || e.abgleich) return;
    if (e.geloescht) lokal.delete(e.id);
    else lokal.set(e.id, e.version);
  }

  // Über alle Rechner nur einmal: true = dieser Rechner führt aus (auch im nächsten Takt wieder, solange die Bedingung gilt;
  // jede Automatik ändert danach den Zustand, der sie auslöst), false = anderer Rechner, läuft gerade oder Supabase weg
  async function beanspruchen(schluessel) {
    const m = ansprueche.get(schluessel);
    if (m?.stand === "meins") return true;
    if (m && (m.stand !== "weg" || Date.now() < m.zeit + SUPABASE_WEG_MS)) return false;
    ansprueche.set(schluessel, { stand: "laeuft", zeit: Date.now() });
    let ok = null;
    try { ok = await anspruch(schluessel); } catch { ok = null; }
    if (ok === null) {
      // Supabase weg: erst abwarten, nach SUPABASE_WEG_MS läuft die Automatik lokal weiter (wie ein einzelner Rechner)
      if (!wegSeit) wegSeit = Date.now();
      if (Date.now() - wegSeit >= SUPABASE_WEG_MS) {
        if (!lokalModus) {
          lokalModus = true;
          log("Automatik: Supabase nicht erreichbar, läuft lokal auf diesem Rechner weiter");
          feed("⚠️ Supabase nicht erreichbar: Die Automatik läuft lokal auf diesem Rechner weiter");
        }
        ansprueche.set(schluessel, { stand: "meins", zeit: Date.now() });
        return true;
      }
    } else {
      wegSeit = 0;
      if (lokalModus) {
        lokalModus = false;
        log("Automatik: Supabase wieder erreichbar");
        feed("✅ Supabase wieder erreichbar: Die Automatik stimmt sich wieder mit dem anderen Rechner ab");
      }
    }
    ansprueche.set(schluessel, { stand: ok === null ? "weg" : ok ? "meins" : "fremd", zeit: Date.now() });
    if (ok === false) log(`Automatik: ${schluessel} hat ein anderer Rechner übernommen`);
    if (ok === null) log(`Automatik: ${schluessel} · Supabase nicht erreichbar, später erneut`);
    if (ansprueche.size > 500) for (const [k, v] of ansprueche) if (Date.now() - v.zeit > 3 * 86400000) ansprueche.delete(k);
    return ok === true;
  }

  // Steht für diesen Fehler noch die automatische Wiederholung aus?
  function wiederholungAussteht(d, jetztMs = Date.now()) {
    const x = d?.daten || {};
    const phase = x.fehler_phase;
    if (x.status !== "fehler" || !WIEDERHOLBAR[phase] || x.auto_wiederholt_phase === phase || x.auto_gemeldet) return false;
    if (!automatikLesen(einstellungen()).wiederholen) return false;
    const tag = heute();
    if (!imPlan(x.datum, phase === "nachpruefen" ? tagPlus(tag, -1) : tag)) return false;
    return jetztMs - fehlerZeit(d) <= FEHLER_HOECHSTENS_S * 1000;
  }

  // ───────── 3. Ideen jeden Morgen für den nächsten Tag (und für heute, wenn dort noch Slots frei sind) ─────────
  // Welche Ideen fehlen? Morgen immer; heute nur vor 15 Uhr, wenn es noch keine Ideen gibt und ein Slot des Kontos frei ist.
  function ideenFehlen(tag) {
    const fehlt = [];
    const morgen = tagPlus(tag, 1);
    for (const [konto, k] of Object.entries(konten)) {
      if (imPlan(tag, tag) && berlinZeit() < IDEEN_HEUTE_BIS && !db.get("ideen", `${k.praefix}-${tag}`)
        && SLOTS.some((s) => !db.get("skripte", `${k.praefix}-${tag}-${s}`))) fehlt.push({ konto, datum: tag });
      if (imPlan(morgen, tag) && !db.get("ideen", `${k.praefix}-${morgen}`)) fehlt.push({ konto, datum: morgen });
    }
    return fehlt;
  }

  // Der Tag gilt erst als erledigt (automatik_ideen_zuletzt), wenn alle Ideen da sind oder 3 Versuche gescheitert sind.
  async function ideenPruefen(a, tag) {
    const e = einstellungen();
    if (!a.ideen || e.automatik_ideen_zuletzt === tag || berlinZeit() < a.ideen_uhrzeit) return;
    const fertig = () => { e.automatik_ideen_zuletzt = tag; einstellungenSichern(); };
    const laeuftSchon = (x) => jobs().some((j) => j.art === "ideen" && j.konto === x.konto && j.datum === x.datum && !j.gestoppt && !j.abgeschlossen);
    let fehlt = ideenFehlen(tag);
    if (!fehlt.length) { fertig(); log(`Automatik: Ideen für heute bzw. morgen sind da (${tag})`); return; }
    if (fehlt.some(laeuftSchon)) return; // Ergebnis abwarten
    const v = e.automatik_ideen_versuche?.tag === tag ? e.automatik_ideen_versuche : { tag, n: 0, zuletzt: null };
    if (v.n >= IDEEN_VERSUCHE) {
      fertig();
      const wo = fehlt.map((x) => `${konten[x.konto].name} ${x.datum}`).join(", ");
      melden({ art: "fehler", titel: `Ideen fehlen nach ${IDEEN_VERSUCHE} Versuchen`, text: `${wo}\n\nDie Automatik versucht es heute nicht noch einmal. Im Studio startet „10 Ideen erzeugen“ einen neuen Versuch.`, ziel: { ansicht: "studio" } });
      feed(`🙋 Ideen fehlen nach ${IDEEN_VERSUCHE} Versuchen: ${wo}`);
      return;
    }
    // Abstand zwischen zwei Versuchen: doppelt so lang wie vor einer Fehler-Wiederholung
    if (v.zuletzt && Date.now() < ms(v.zuletzt) + WIEDERHOLEN_NACH_S * 2000) return;
    if (!(await beanspruchen(`auto-ideen-${tag}${v.n ? `-v${v.n + 1}` : ""}`))) return;
    if (einstellungen().automatik_ideen_zuletzt === tag) return;
    fehlt = ideenFehlen(tag).filter((x) => !laeuftSchon(x));
    const gestartet = [];
    for (const x of fehlt) {
      try {
        studio.ausfuehren("ideen", { konto: x.konto, datum: x.datum });
        gestartet.push(`${konten[x.konto].name} ${x.datum === tag ? "heute" : "morgen"}`);
      } catch (err) { log(`Automatik: Ideen ${x.konto} ${x.datum}: ${err.message}`); }
    }
    e.automatik_ideen_versuche = { tag, n: v.n + 1, zuletzt: new Date().toISOString() };
    einstellungenSichern();
    if (gestartet.length) feed(`💡 Automatik: Ideen angefordert${v.n ? ` (Versuch ${v.n + 1} von ${IDEEN_VERSUCHE})` : ""} · ${gestartet.join(", ")}`);
  }

  // Meldet die Automatik diesen Fehler selbst („… braucht dich“)? Dann muss sonst niemand (z. B. die Produktion) melden.
  function meldetSelbst(d, jetztMs = Date.now()) {
    const x = d?.daten || {};
    return x.status === "fehler" && !!WIEDERHOLBAR[x.fehler_phase] && x.auto_wiederholt_phase === x.fehler_phase && !x.auto_gemeldet
      && jetztMs - fehlerZeit(d) <= FEHLER_HOECHSTENS_S * 1000;
  }
  // Wiederholt oder meldet die Automatik diesen Fehler?
  const uebernimmt = (d) => wiederholungAussteht(d) || meldetSelbst(d);

  // ───────── 4. Fehler einmal wiederholen, dann melden ─────────
  async function fehlerWiederholen(slots, jetztMs) {
    const zuMelden = new Map(); // "datum|phase" → Slots (eine Meldung je Tag und Phase)
    const rechercheBuendel = new Map(); // "konto|datum" → ids: eine Recherche-Sitzung für alle Slots statt je Slot eine
    for (const d of slots) {
      const x = d.daten, phase = x.fehler_phase;
      if (x.status !== "fehler" || !WIEDERHOLBAR[phase]) continue;
      const zeit = fehlerZeit(d);
      const fall = `${d.id}-${phase}-${kompakt(x.aktualisiert || d.aktualisiert)}`;
      if (wiederholungAussteht(d, jetztMs)) {
        if (limitAktiv(jetztMs)) continue; // Nutzungslimit: erst nach dem Reset wiederholen (sonst scheitert es gleich wieder)
        if (jetztMs < zeit + WIEDERHOLEN_NACH_S * 1000 + verzugMs([d])) continue;
        if (!(await beanspruchen(`auto-wiederholen-${fall}`))) continue;
        const neu = db.get("skripte", d.id);
        if (!neu || neu.daten.fehler_phase !== phase || !wiederholungAussteht(neu)) continue;
        try {
          // Erst merken, dann wiederholen: scheitert sie, kommt die Meldung statt einer zweiten Wiederholung
          db.schreiben("skripte", d.id, { auto_wiederholt_phase: phase }, { art: "update", ifVersion: neu.version, von: "cockpit" });
          db.meilenstein("skripte", d.id, `🔁 Automatisch erneut: ${WIEDERHOLBAR[phase]}`, { von: "cockpit" });
          feed(`🔁 Automatisch erneut: ${titelVon(neu)} (${WIEDERHOLBAR[phase]})`, { id: d.id });
          if (phase === "recherche") {
            const k = `${x.konto}|${x.datum}`;
            if (!rechercheBuendel.has(k)) rechercheBuendel.set(k, []);
            rechercheBuendel.get(k).push(d.id);
          } else studio.ausfuehren("erneut", { id: d.id }); // Produktion bündelt selbst (laufende Sitzung übernimmt)
        } catch (e) { log(`Automatik: Wiederholung ${d.id}: ${e.message}`); }
      } else if (meldetSelbst(d, jetztMs)) {
        // Dieselbe Phase ist erneut gescheitert (oder Claude hat sie als nicht wiederholbar markiert): einmal melden
        if (jetztMs < zeit + verzugMs([d])) continue;
        if (!(await beanspruchen(`auto-meldung-${fall}`))) continue;
        const neu = db.get("skripte", d.id);
        if (!neu || neu.daten.status !== "fehler" || neu.daten.auto_gemeldet) continue;
        try {
          db.schreiben("skripte", d.id, { auto_gemeldet: true }, { art: "update", ifVersion: neu.version, von: "cockpit" });
        } catch { continue; } // nächster Takt
        const k = `${x.datum}|${phase}`;
        if (!zuMelden.has(k)) zuMelden.set(k, []);
        zuMelden.get(k).push(neu);
      }
    }
    for (const [k, ids] of rechercheBuendel) {
      const [konto, datum] = k.split("|");
      try { studio.ausfuehren("recherchieren", { konto, datum, ids }); } catch (e) { log(`Automatik: Wiederholung Recherche ${k}: ${e.message}`); }
    }
    // Eine Meldung je Tag und Phase (eine gescheiterte Produktion mit 3 Videos = eine Meldung, nicht drei)
    for (const [k, docs] of zuMelden) {
      const [datum, phase] = k.split("|");
      const ph = WIEDERHOLBAR[phase];
      const ids = docs.map((d) => d.id);
      const titel = docs.length === 1 ? `${titelVon(docs[0])} braucht dich (${ph})` : `${ph} ${datum} braucht dich (${docs.length} Videos)`;
      const zeilen = docs.map((d) => `${titelVon(d)}: ${d.daten.fehler || `${ph} gescheitert`}`);
      melden({ art: "fehler", titel, text: `${zeilen.join("\n")}\n\nDie automatische Wiederholung ist schon gelaufen bzw. hilft hier nicht. Bitte im Studio entscheiden.`, ziel: { ansicht: "studio", id: ids[0], ids } });
      feed(`🙋 ${titel}: ${ph} gescheitert, keine weitere automatische Wiederholung`, { ids });
    }
  }

  // ───────── 1. Recherche nach der Wahl ─────────
  async function rechercheStarten(a, slots, tag, jetztMs) {
    if (!a.recherche) return;
    const gruppen = new Map(); // "konto|datum" → gewählte Slots mit Automatik
    for (const d of slots) {
      if (d.daten.status !== "gewaehlt" || !d.daten.auto_recherche_ab || !imPlan(d.daten.datum, tag)) continue;
      const k = `${d.daten.konto}|${d.daten.datum}`;
      if (!gruppen.has(k)) gruppen.set(k, []);
      gruppen.get(k).push(d);
    }
    for (const [k, docs] of gruppen) {
      const [konto, datum] = k.split("|");
      const abIso = docs.map((d) => d.daten.auto_recherche_ab).sort().at(-1);
      if (jetztMs < ms(abIso) + verzugMs(docs)) continue;
      if (!(await beanspruchen(`auto-recherche-${konto}-${datum}-${kompakt(abIso)}`))) continue;
      // Stand nach dem Anspruch neu lesen (Abwahl, Neuwahl oder der andere Rechner können dazwischen liegen)
      const neu = docs.map((d) => db.get("skripte", d.id)).filter((d) => d?.daten.status === "gewaehlt" && d.daten.auto_recherche_ab);
      if (!neu.length || neu.map((d) => d.daten.auto_recherche_ab).sort().at(-1) !== abIso) continue;
      const ids = neu.map((d) => d.id);
      try {
        studio.ausfuehren("recherchieren", { konto, datum, ids });
        feed(`🔎 Automatik: Recherche gestartet · ${konten[konto]?.name || konto} · ${datum} · ${mehrzahl(ids.length, "Skript", "Skripte")}`, { ids });
      } catch (e) {
        log(`Automatik: Recherche ${konto} ${datum}: ${e.message}`);
        for (const d of neu) { try { db.schreiben("skripte", d.id, { auto_recherche_ab: WEG }, { art: "update", ifVersion: d.version }); } catch { /* egal */ } }
        feed(`⚠️ Automatik: Recherche ${konten[konto]?.name || konto} · ${datum} nicht gestartet (${e.message}). Bitte von Hand.`, { ids });
      }
    }
  }

  // ───────── 2. Produktion nach der Freigabe ─────────
  // Worauf die Produktion eines Tages (beide Konten) noch wartet; leer = nichts
  function wartetAuf(docsDesTages) {
    let recherche = 0, fertig = 0, wiederholung = 0;
    for (const d of docsDesTages) {
      const st = d.daten.status;
      if (st === "gewaehlt" || st === "recherche") recherche++;
      else if (st === "skript_fertig") fertig++;
      else if (st === "fehler" && d.daten.fehler_phase === "recherche" && wiederholungAussteht(d)) wiederholung++;
    }
    const teile = [];
    if (fertig) teile.push(`${mehrzahl(fertig, "Skript", "Skripte")} noch nicht freigegeben`);
    if (recherche) teile.push(`${mehrzahl(recherche, "Skript", "Skripte")} noch in Recherche`);
    if (wiederholung) teile.push(`${mehrzahl(wiederholung, "Recherche wartet", "Recherchen warten")} auf die automatische Wiederholung`);
    return teile.join(" · ");
  }

  function wartetSetzen(d, text) {
    if ((d.daten.auto_produktion_wartet || "") === text) return;
    try { db.schreiben("skripte", d.id, { auto_produktion_wartet: text || WEG }, { art: "update", ifVersion: d.version, von: "cockpit" }); } catch { /* nächster Takt */ }
  }

  async function produktionStarten(a, slots, tag, jetztMs) {
    const tage = new Map();
    for (const d of slots) {
      if (!imPlan(d.daten.datum, tag)) continue;
      if (!tage.has(d.daten.datum)) tage.set(d.daten.datum, []);
      tage.get(d.daten.datum).push(d);
    }
    for (const [datum, docs] of tage) {
      const frei = docs.filter((d) => d.daten.status === "freigegeben" && d.daten.auto_produktion_ab);
      if (!frei.length) continue;
      const wartet = a.produktion ? wartetAuf(docs) : "";
      const abIso = frei.map((d) => d.daten.auto_produktion_ab).sort().at(-1);
      const verzug = verzugMs(frei);
      // Wartegrund sichtbar machen (nur bei Änderung; der andere Rechner erst nach dem Verzug, damit nicht beide schreiben)
      if (verzug === 0 || jetztMs >= ms(abIso) + verzug) for (const d of frei) wartetSetzen(d, wartet);
      if (!a.produktion || wartet || jetztMs < ms(abIso) + verzug) continue;
      if (!(await beanspruchen(`auto-produktion-${datum}-${kompakt(abIso)}`))) continue;
      const neu = db.liste("skripte", [["datum", "==", datum]]);
      const neuFrei = neu.filter((d) => d.daten.status === "freigegeben" && d.daten.auto_produktion_ab);
      if (!neuFrei.length || wartetAuf(neu) || neuFrei.map((d) => d.daten.auto_produktion_ab).sort().at(-1) !== abIso) continue;
      const ids = neuFrei.map((d) => d.id);
      try {
        studio.ausfuehren("uebergeben", { datum, ids });
        feed(`🏭 Automatik: an die Produktion übergeben · ${datum} · ${mehrzahl(ids.length, "Video", "Videos")}`, { ids });
      } catch (e) {
        log(`Automatik: Produktion ${datum}: ${e.message}`);
        for (const d of neuFrei) { try { db.schreiben("skripte", d.id, { auto_produktion_ab: WEG, auto_produktion_wartet: WEG }, { art: "update", ifVersion: d.version }); } catch { /* egal */ } }
        feed(`⚠️ Automatik: Produktion ${datum} nicht übergeben (${e.message}). Bitte „An Claude übergeben“ von Hand.`, { ids });
      }
    }
  }

  // ───────── 5. Autopilot: Idee nach Frist selbst wählen (Schalter auto_wahl, Standard aus) ─────────
  // Für heute nur Slots, deren Posting-Zeit noch weit genug weg ist
  function slotNochMoeglich(datum, slot, tag) {
    if (datum > tag) return true;
    const [h, m] = uhrzeit(datum, slot).split(":").map(Number);
    const [jh, jm] = berlinZeit().split(":").map(Number);
    return h * 60 + m - (jh * 60 + jm) >= SLOT_VORLAUF_MIN;
  }

  async function autoWahlPruefen(a, tag, jetztMs) {
    if (!a.auto_wahl) return;
    for (const dok of db.liste("ideen", [["datum", ">=", tag]])) {
      const x = dok.daten, k = konten[x.konto];
      if (!k || !imPlan(x.datum, tag) || x.auto_wahl_erledigt || !Array.isArray(x.ideen) || !x.ideen.length) continue;
      const seit = ms(x.erzeugt) || ms(dok.aktualisiert);
      if (jetztMs < seit + fristMs(a.auto_wahl_frist_min)) continue;
      const slotDok = (s) => db.get("skripte", `${k.praefix}-${x.datum}-${s}`);
      const frei = SLOTS.filter((s) => !slotDok(s) && slotNochMoeglich(x.datum, s, tag));
      const erledigt = (zusatz = {}) => {
        const neu = db.get("ideen", dok.id);
        if (!neu) return;
        try { db.schreiben("ideen", dok.id, { auto_wahl_erledigt: new Date().toISOString(), ...zusatz }, { art: "update", ifVersion: neu.version, von: "cockpit" }); } catch { /* nächster Takt */ }
      };
      if (!frei.length) { erledigt(); continue; }
      if (!(await beanspruchen(`auto-wahl-${dok.id}-${kompakt(x.erzeugt || dok.aktualisiert)}`))) continue;
      const frisch = db.get("ideen", dok.id);
      if (!frisch || frisch.daten.auto_wahl_erledigt) continue;
      const nochFrei = frei.filter((s) => !slotDok(s));
      const belegt = SLOTS.map(slotDok).filter(Boolean).map((d) => d.daten.idee).filter(Boolean);
      const wahl = autoWahl(frisch.daten.ideen, nochFrei, belegt);
      const gewaehlt = [];
      for (const w of wahl) {
        try {
          studio.ausfuehren("waehlen", { konto: x.konto, datum: x.datum, slot: w.slot, nr: w.nr, auto: w.grund });
          gewaehlt.push(w);
        } catch (err) { log(`Automatik: automatische Wahl ${dok.id} ${w.slot}: ${err.message}`); }
      }
      erledigt(gewaehlt.length ? { auto_wahl: gewaehlt.map((w) => ({ slot: w.slot, nr: w.nr, grund: w.grund })) } : {});
      if (!gewaehlt.length) continue;
      const ids = gewaehlt.map((w) => `${k.praefix}-${x.datum}-${w.slot}`);
      const zeilen = gewaehlt.map((w) => `${w.slot === "mittag" ? "Mittag" : "Abend"}: ${w.titel} (${w.grund})`);
      feed(`🤖 Autopilot: Idee automatisch gewählt · ${k.name} · ${x.datum} · ${zeilen.join(" · ")}`, { ids });
      benachrichtigen("ideen", `Automatisch gewählt (${k.name}, ${x.datum}):\n${zeilen.join("\n")}\nDu kannst die Wahl im Studio ändern, bis die Recherche startet.`);
    }
  }

  // ───────── 6. Autopilot: geprüftes Skript nach Frist selbst freigeben (Schalter auto_freigabe, Standard aus) ─────────
  async function autoFreigabePruefen(a, slots, tag, jetztMs) {
    if (!a.auto_freigabe) return;
    for (const d of slots) {
      const x = d.daten;
      if (x.status !== "skript_fertig" || !imPlan(x.datum, tag) || x.auto_freigabe_wartet) continue;
      const seit = ms(x.aktualisiert) || ms(d.aktualisiert);
      if (jetztMs < seit + fristMs(a.auto_freigabe_frist_min) + verzugMs([d])) continue;
      if (!(await beanspruchen(`auto-freigabe-${d.id}-${kompakt(x.aktualisiert || d.aktualisiert)}`))) continue;
      let vorab = null;
      if (x.konto === "simulierbar") {
        try { vorab = await stimmePruefen(x.skript); } catch (err) { vorab = { ok: false, text: err.message }; }
      }
      const neu = db.get("skripte", d.id);
      if (!neu || neu.daten.status !== "skript_fertig" || neu.version !== d.version) continue; // inzwischen geändert: nächster Takt
      const p = freigabePruefen(neu.daten, vorab);
      try {
        if (p.ok) {
          studio.ausfuehren("freigeben", { id: d.id, auto: true });
          feed(`🤖 Autopilot: Skript automatisch freigegeben · ${titelVon(neu)}`, { id: d.id });
          benachrichtigen("skript", `Automatisch freigegeben: ${titelVon(neu)} (${konten[x.konto]?.name || x.konto}, ${x.datum}). Die Produktion startet von selbst.`);
        } else {
          db.schreiben("skripte", d.id, { auto_freigabe_wartet: p.gruende.join(" · ").slice(0, 400) }, { art: "update", ifVersion: neu.version, von: "cockpit" });
          db.meilenstein("skripte", d.id, "Nicht automatisch freigegeben, wartet auf dich", { von: "cockpit" });
          feed(`🙋 Autopilot: ${titelVon(neu)} wartet auf deine Freigabe (${p.gruende[0]})`, { id: d.id });
          benachrichtigen("skript", `Skript wartet auf dich: ${titelVon(neu)}\nNicht automatisch freigegeben: ${p.gruende.join(" · ")}`);
        }
      } catch (err) { log(`Automatik: automatische Freigabe ${d.id}: ${err.message}`); }
    }
  }

  // ───────── Takt ─────────
  async function schritt(name, f) {
    try {
      await f();
      letzterFehler.delete(name);
    } catch (e) {
      if (letzterFehler.get(name) !== e.message) log(`Automatik ${name}: ${e.stack || e.message}`);
      letzterFehler.set(name, e.message);
    }
  }

  async function takt() {
    if (laeuft) return;
    laeuft = true;
    try {
      if (!cliDa()) return; // ohne Claude Code löst dieser Rechner nichts aus (ein anderer übernimmt nach dem Verzug)
      const a = automatikLesen(einstellungen());
      const tag = heute();
      const slots = () => db.liste("skripte", [["datum", ">=", tagPlus(tag, -1)]]);
      const frei = !limitAktiv(); // Nutzungslimit: nichts Neues bei Claude starten, bis es vorbei ist
      if (frei) await schritt("Ideen", () => ideenPruefen(a, tag));
      await schritt("Wiederholen", () => fehlerWiederholen(slots(), Date.now()));
      await schritt("Auto-Wahl", () => autoWahlPruefen(a, tag, Date.now()));
      await schritt("Auto-Freigabe", () => autoFreigabePruefen(a, slots(), tag, Date.now()));
      if (frei) await schritt("Recherche", () => rechercheStarten(a, slots(), tag, Date.now()));
      if (frei) await schritt("Produktion", () => produktionStarten(a, slots(), tag, Date.now()));
    } finally {
      laeuft = false;
    }
  }

  function starten() {
    setTimeout(takt, 3000);
    setInterval(takt, TAKT_MS);
  }

  return { starten, takt, dbEreignis, wiederholungAussteht, uebernimmt, lokal: () => lokalModus };
}
