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
// Geteilte Einstellung „automatik“: { recherche, produktion, ideen, ideen_uhrzeit: "HH:MM", wiederholen }; fehlt etwas → Standard.

export const AUTOMATIK_STANDARD = Object.freeze({ recherche: true, produktion: true, ideen: true, ideen_uhrzeit: "07:00", wiederholen: true });
const SCHALTER = ["recherche", "produktion", "ideen", "wiederholen"];
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

// Einstellung mit Standardwerten (alles an)
export function automatikLesen(einstellungen = {}) {
  const a = einstellungen?.automatik && typeof einstellungen.automatik === "object" ? einstellungen.automatik : {};
  const r = { ...AUTOMATIK_STANDARD };
  for (const k of SCHALTER) if (typeof a[k] === "boolean") r[k] = a[k];
  if (typeof a.ideen_uhrzeit === "string" && UHRZEIT_RE.test(a.ideen_uhrzeit)) r.ideen_uhrzeit = a.ideen_uhrzeit;
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
    } else throw new Error(`automatik.${k} gibt es nicht (erlaubt: ${[...SCHALTER, "ideen_uhrzeit"].join(", ")})`);
  }
  return neu;
}

export function erstelleAutomatik({
  db, studio, konten, einstellungen, einstellungenSichern, anspruch, heute, berlinZeit,
  feed = () => {}, melden = () => {}, jobs = () => [], cliDa = () => true, mehrereRechner = () => false, log = () => {},
}) {
  const lokal = new Map(); // Slot-ID → Version der letzten Änderung auf diesem Rechner (Vorrang)
  const ansprueche = new Map(); // Anspruchs-Schlüssel → { stand: "laeuft" | "meins" | "fremd" | "weg", zeit }
  const letzterFehler = new Map(); // Schritt → letzte Fehlermeldung (nur Änderungen loggen)
  let laeuft = false;

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

  // ───────── 3. Ideen jeden Morgen für den nächsten Tag ─────────
  async function ideenPruefen(a, tag) {
    if (!a.ideen || einstellungen().automatik_ideen_zuletzt === tag || berlinZeit() < a.ideen_uhrzeit) return;
    if (!(await beanspruchen(`auto-ideen-${tag}`))) return;
    if (einstellungen().automatik_ideen_zuletzt === tag) return;
    const morgen = tagPlus(tag, 1);
    const gestartet = [];
    if (imPlan(morgen, tag)) {
      for (const [konto, k] of Object.entries(konten)) {
        if (db.get("ideen", `${k.praefix}-${morgen}`)) continue;
        if (jobs().some((j) => j.art === "ideen" && j.konto === konto && j.datum === morgen && !j.gestoppt && !j.abgeschlossen)) continue;
        try {
          studio.ausfuehren("ideen", { konto, datum: morgen });
          gestartet.push(k.name);
        } catch (e) { log(`Automatik: Ideen ${konto} ${morgen}: ${e.message}`); }
      }
    }
    einstellungen().automatik_ideen_zuletzt = tag;
    einstellungenSichern();
    if (gestartet.length) feed(`💡 Automatik: Ideen für morgen (${morgen}) · ${gestartet.join(", ")}`);
    else log(`Automatik: Ideen für ${morgen} gibt es schon (oder sie laufen)`);
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
      await schritt("Ideen", () => ideenPruefen(a, tag));
      await schritt("Wiederholen", () => fehlerWiederholen(slots(), Date.now()));
      await schritt("Recherche", () => rechercheStarten(a, slots(), tag, Date.now()));
      await schritt("Produktion", () => produktionStarten(a, slots(), tag, Date.now()));
    } finally {
      laeuft = false;
    }
  }

  function starten() {
    setTimeout(takt, 3000);
    setInterval(takt, TAKT_MS);
  }

  return { starten, takt, dbEreignis, wiederholungAussteht, uebernimmt };
}
