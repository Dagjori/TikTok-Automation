// Lernschleife, Verbesserungsvorschläge, Meldungen (Push im Cockpit) und Testwoche für die Selbständigkeit.
// Wunsch des Inhabers 03.11.: Claude wertet täglich jedes Video aus (Zahlen + Umsetzung + Design), schlägt Verbesserungen vor,
// meldet jeden Vorschlag per Push im Cockpit; eine Woche lang nur mit Freigabe. Danach fragt das Cockpit, ob Claude diesen
// Teil ohne Freigabe übernimmt oder ob die Testphase eine Woche verlängert wird. Auch selbständig wird jede Umsetzung gemeldet.
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";

const WOCHE = 7 * 86400000;
const LERNSCHLEIFE_UHRZEIT = "19:52"; // wie die bisherige Cloud-Aufgabe

const LERNSCHLEIFE_VERSUCHE = 3; // je Tag; erst ein erfolgreicher Lauf setzt lernschleife_zuletzt (Ausbau 10.11.2026)
const umgebungS = Number(process.env.COCKPIT_WIEDERHOLEN_S); // nur für Tests kürzer
const LERNSCHLEIFE_ABSTAND_MS = (umgebungS > 0 ? umgebungS : 900) * 1000; // Abstand zwischen zwei Versuchen
const VORSCHLAG_VERWAIST_MS = 3 * 3600 * 1000;

// beiMeldung(doc): jede neue Meldung (für die Handy-Meldung, lib/melden.mjs). limitBis(): ms, bis wann das Nutzungslimit gilt.
// jobs(): laufende und wartende Claude-Aufträge dieses Rechners.
export function erstelleLernen({ db, repo, geheim, auftrag, senden = () => {}, log = () => {}, einstellungen, einstellungenSichern, heute, berlinZeit, anspruch = async () => true, beiMeldung = () => {}, limitBis = () => 0, jobs = () => [] }) {
  const jetzt = () => new Date().toISOString();
  const auto = () => (einstellungen().autonomie ||= { modus: "freigabe" });

  // ───────── Meldungen ─────────
  function melden({ art = "info", titel, text = "", ziel = null }) {
    const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const doc = db.schreiben("meldungen", id, { zeit: jetzt(), art, titel: String(titel).slice(0, 160), text: String(text).slice(0, 1200), ziel, gelesen: false }, { von: "cockpit" });
    senden("meldung", doc);
    try { beiMeldung(doc); } catch (e) { log(`Meldung weitergeben: ${e.message}`); }
    return doc;
  }

  // ───────── Lernschleife ─────────
  let laeuft = false;
  function insightsAbrufen() {
    return new Promise((ok) => {
      const env = { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8", BUFFER_API_KEY: geheim.BUFFER_API_KEY };
      if (geheim.BUFFER_ORG_ID) env.BUFFER_ORG_ID = geheim.BUFFER_ORG_ID;
      execFile("py", ["-3", path.join("tools", "insights_abrufen.py"), "--tage", "14"], { cwd: repo, env, windowsHide: true, timeout: 300000, encoding: "utf8", maxBuffer: 8 << 20 },
        (err, out, fehlerText) => ok({ ok: !err, ausgabe: String(out || "").slice(-1500), fehler: String(fehlerText || "").slice(-600) }));
    });
  }

  // Gereift = Mittagsvideo von heute und alles ältere (Buffer aktualisiert nur alle paar Stunden)
  function gereifteVideos() {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(repo, "data", "insights", "letzter_abruf.json"), "utf8"));
      const grenze = Date.now() - 6 * 3600 * 1000;
      const je = {};
      for (const p of d.posts || []) if (Date.parse(p.gesendet) < grenze) je[p.kanal] = (je[p.kanal] || 0) + 1;
      const werte = Object.values(je);
      return werte.length ? Math.min(...werte) : 0;
    } catch { return 0; }
  }

  async function lernschleife(grund = "von dir gestartet") {
    if (laeuft) return { ok: false, fehler: "Die Lernschleife läuft schon" };
    if (!geheim.BUFFER_API_KEY) {
      melden({ art: "fehler", titel: "Lernschleife: Buffer-Schlüssel fehlt", text: "Trag BUFFER_API_KEY in C:\\render\\tiktok-automation\\pipeline\\render_dienst\\.env ein und starte das Cockpit neu (♻).", ziel: { ansicht: "zahlen" } });
      return { ok: false, fehler: "BUFFER_API_KEY fehlt" };
    }
    laeuft = true;
    senden("lernschleife", { laeuft: true, schritt: "Zahlen holen" });
    const abruf = await insightsAbrufen();
    const tag = heute();
    const video = gereifteVideos();
    auftrag({
      art: "lernschleife",
      titel: `Lernschleife · ${tag}`,
      lernschleifeVideos: video,
      modus: "auto",
      text: `Du bist die Lernschleife des TikTok-Cockpits auf einem Rechner des Inhabers (Tag ${tag}, Anlass: ${grund}). Lies zuerst cockpit/anleitung/lernschleife.md vollständig und befolge sie Schritt für Schritt.\n\nDATENABRUF DES COCKPITS (gerade eben)\n${abruf.ok ? "erfolgreich" : "FEHLGESCHLAGEN"}\n${abruf.ausgabe}\n${abruf.fehler ? "Hinweise: " + abruf.fehler : ""}`,
      nachher: (_text, istFehler, job) => {
        laeuft = false;
        const e = einstellungen();
        senden("lernschleife", { laeuft: false });
        if (!istFehler) {
          // Nur ein erfolgreicher Lauf gilt als erledigt
          e.lernschleife_zuletzt = tag;
          delete e.lernschleife_versuche;
          einstellungenSichern();
          return;
        }
        // Gescheitert: Versuch zählen (ein Nutzungslimit zählt nicht), der Zeitplan versucht es bis zu 3-mal am Tag
        const v = e.lernschleife_versuche?.tag === tag ? e.lernschleife_versuche : { tag, n: 0 };
        e.lernschleife_versuche = { tag, n: v.n + (job?.limit ? 0 : 1), zuletzt: jetzt(), gestoppt: !!job?.gestoppt };
        const letzter = e.lernschleife_versuche.n >= LERNSCHLEIFE_VERSUCHE || job?.gestoppt;
        if (letzter) e.lernschleife_zuletzt = tag; // heute nicht noch einmal von selbst
        einstellungenSichern();
        if (job?.gestoppt) return;
        if (letzter) melden({ art: "fehler", titel: "Lernschleife abgebrochen", text: `${job?.abbruch ? job.abbruch + " " : ""}Die Auswertung wurde heute ${LERNSCHLEIFE_VERSUCHE}-mal nicht fertig. Unter „Lernen“ startest du sie von Hand, sonst läuft sie morgen wieder.`, ziel: { ansicht: "lernen" } });
        else log(`Lernschleife ${tag} nicht fertig (${job?.abbruch || "Abbruch"}), neuer Versuch folgt`);
      },
    });
    return { ok: true };
  }

  // Täglich um 19:52 (Berlin), wenn eingeschaltet; verpasst (Cockpit war aus) → beim nächsten Start nachholen.
  // Mit Cockpit auf Laptop und PC läuft sie nur einmal am Tag: auf dem Rechner, der den Tag zuerst für sich beansprucht.
  // Scheitert sie (Abbruch, Zeitlimit), folgt nach 15 Min. ein neuer Versuch, höchstens 3 am Tag; während eines Nutzungslimits wartet sie.
  let beansprucht = null; // Schlüssel (Tag und Versuch), für den dieser Rechner schon gefragt hat
  let supabaseWeg = 0; // Anzahl Takte in Folge, in denen Supabase nicht erreichbar war
  function zeitplan() {
    const e = einstellungen();
    if (!e.lernschleife_aktiv || laeuft || !geheim.BUFFER_API_KEY) return;
    const tag = heute();
    if (e.lernschleife_zuletzt === tag || limitBis() > Date.now()) return;
    const v = e.lernschleife_versuche?.tag === tag ? e.lernschleife_versuche : { tag, n: 0 };
    if (v.n >= LERNSCHLEIFE_VERSUCHE || v.gestoppt) return;
    if (v.zuletzt && Date.now() < Date.parse(v.zuletzt) + LERNSCHLEIFE_ABSTAND_MS) return;
    if (jobs().some((j) => j.art === "lernschleife" && !j.abgeschlossen)) return;
    const gestern = heute(new Date(Date.now() - 86400000));
    const verpasst = e.lernschleife_zuletzt && e.lernschleife_zuletzt < gestern;
    if (berlinZeit() < LERNSCHLEIFE_UHRZEIT && !verpasst) return;
    const schluessel = `lernschleife-${tag}${v.n ? `-v${v.n + 1}` : ""}`;
    if (beansprucht === schluessel) return;
    beansprucht = schluessel;
    anspruch(schluessel).then((ok) => {
      if (ok === null) {
        // Supabase gerade weg: beim nächsten Takt erneut; nach zwei Takten in Folge läuft sie lokal auf diesem Rechner
        beansprucht = null;
        if (++supabaseWeg < 2) return;
        log(`Lernschleife ${tag}: Supabase nicht erreichbar, läuft lokal auf diesem Rechner`);
        beansprucht = schluessel;
        ok = true;
      } else supabaseWeg = 0;
      if (ok) lernschleife(v.n ? `neuer Versuch (${v.n + 1} von ${LERNSCHLEIFE_VERSUCHE})` : verpasst ? "verpassten Lauf nachholen" : "täglicher Lauf");
      else log(`Lernschleife ${tag} läuft auf einem anderen Rechner`);
    });
  }

  // ───────── Vorschläge ─────────
  function vorschlagLesen(id) {
    const d = db.get("vorschlaege", id);
    if (!d) throw new Error(`Vorschlag ${id} gibt es nicht`);
    return d;
  }

  function umsetzen(d, teil = "umsetzen") {
    auftrag({
      art: "vorschlag_umsetzen", vorschlag: d.id,
      titel: `${teil === "probe" ? "Probebilder" : "Umsetzen"} · ${d.daten.titel}`.slice(0, 120),
      modus: "auto",
      text: `Du bist die Umsetzungs-Sitzung des TikTok-Cockpits. Lies zuerst cockpit/anleitung/vorschlag.md vollständig und befolge sie Schritt für Schritt.\n\nVORSCHLAG (Dokument vorschlaege/${d.id}, Version ${d.version}, Schritt: ${teil})\n${JSON.stringify(d.daten, null, 1)}`,
      nachher: (_t, istFehler, job) => {
        const neu = db.get("vorschlaege", d.id);
        if (!neu || !["angenommen", "probe_ok"].includes(neu.daten.status)) return;
        if (istFehler) {
          db.schreiben("vorschlaege", d.id, { status: "fehler", umsetzung: { ...(neu.daten.umsetzung || {}), fehler: job?.abbruch || "Umsetzung abgebrochen (Limit, Stopp oder Fehler)", zeit: jetzt() } }, { art: "update", ifVersion: neu.version });
          melden({ art: "fehler", titel: `Umsetzung abgebrochen: ${d.daten.titel}`, text: `${job?.abbruch ? job.abbruch + " " : ""}„Erneut umsetzen“ im Cockpit startet sie neu.`, ziel: { ansicht: "lernen", id: d.id } });
        } else zurueckAufOffen(neu, "Die Sitzung endete ohne Ergebnis.");
      },
    });
  }

  // Sitzung ohne Ergebnis (oder Cockpit neu gestartet): der Vorschlag darf nicht auf „angenommen“ hängen bleiben
  function zurueckAufOffen(doc, grund) {
    const zurueck = doc.daten.status === "probe_ok" ? "probe" : "offen";
    db.schreiben("vorschlaege", doc.id, { status: zurueck, umsetzung: { ...(doc.daten.umsetzung || {}), hinweis: grund, zeit: jetzt() } }, { art: "update", ifVersion: doc.version });
    melden({ art: "fehler", titel: `Nicht umgesetzt: ${doc.daten.titel}`, text: `${grund} Der Vorschlag steht wieder auf „${zurueck === "probe" ? "Probebilder" : "offen"}“; nimm ihn noch einmal an, wenn er umgesetzt werden soll.`, ziel: { ansicht: "lernen", id: doc.id } });
  }

  // Beim Start und alle 5 Min.: angenommene Vorschläge ohne laufenden Auftrag, deren Entscheidung länger als 3 Std. her ist
  // (bzw. deren Auftrag vor dem Neustart auf diesem Rechner lief: eigene)
  function vorschlaegeAufraeumen(eigene = []) {
    const aktiv = jobs().filter((j) => j.art === "vorschlag_umsetzen" && !j.abgeschlossen).map((j) => j.vorschlag);
    for (const d of db.liste("vorschlaege")) {
      if (!["angenommen", "probe_ok"].includes(d.daten.status) || aktiv.includes(d.id)) continue;
      const alt = Date.now() - (Date.parse(d.daten.entscheidung?.zeit || d.aktualisiert || "") || 0) > VORSCHLAG_VERWAIST_MS;
      if (!alt && !eigene.includes(d.id)) continue;
      try { zurueckAufOffen(d, eigene.includes(d.id) ? "Cockpit wurde neu gestartet, die Umsetzung lief nicht zu Ende." : "Die Umsetzung lief nicht zu Ende."); } catch (e) { log(`Vorschlag ${d.id} zurücksetzen: ${e.message}`); }
    }
  }

  function entscheiden(id, wahl, kommentar = "") {
    const d = vorschlagLesen(id);
    const st = d.daten.status;
    const entscheidung = { wahl, kommentar: String(kommentar || "").slice(0, 1000), zeit: jetzt() };
    if (wahl === "annehmen" && ["offen", "fehler"].includes(st)) {
      const neu = db.schreiben("vorschlaege", id, { status: "angenommen", entscheidung }, { art: "update", ifVersion: d.version });
      umsetzen(neu);
      return { ok: true };
    }
    if (wahl === "probe_ok" && st === "probe") {
      const neu = db.schreiben("vorschlaege", id, { status: "probe_ok", entscheidung }, { art: "update", ifVersion: d.version });
      umsetzen(neu);
      return { ok: true };
    }
    if (wahl === "ablehnen" && ["offen", "probe", "fehler"].includes(st)) {
      db.schreiben("vorschlaege", id, { status: "abgelehnt", entscheidung }, { art: "update", ifVersion: d.version });
      return { ok: true };
    }
    throw new Error(`„${wahl}“ geht bei Status „${st}“ nicht`);
  }

  // Neue Vorschläge (von Claude geschrieben) melden; nach der Testwoche bei Selbständigkeit direkt umsetzen
  function dbEreignis(e) {
    if (e.sammlung !== "vorschlaege" || e.geloescht || e.von !== "claude") return;
    const st = e.daten.status;
    if (st === "offen" && e.version === 1) {
      const a = auto();
      if (!a.testphase_start) {
        a.testphase_start = jetzt();
        a.testphase_bis = new Date(Date.now() + WOCHE).toISOString();
        einstellungenSichern();
      }
      if (a.modus === "autonom") {
        melden({ art: "umgesetzt", titel: `Setze um: ${e.daten.titel}`, text: `${e.daten.vorschlag || ""}\n\nWarum: ${e.daten.begruendung?.schluss || ""}`, ziel: { ansicht: "lernen", id: e.id } });
        try { entscheiden(e.id, "annehmen", "selbständig (nach Testphase freigegeben)"); } catch (err) { log(`Autonom umsetzen fehlgeschlagen: ${err.message}`); }
      } else {
        melden({ art: "vorschlag", titel: `Neuer Vorschlag: ${e.daten.titel}`, text: `${e.daten.vorschlag || ""}\n\nMessung: ${e.daten.begruendung?.messung || ""}\nSchluss: ${e.daten.begruendung?.schluss || ""}`, ziel: { ansicht: "lernen", id: e.id } });
      }
    }
    if (st === "probe") melden({ art: "vorschlag", titel: `Probebilder bereit: ${e.daten.titel}`, text: "Schau sie dir an und gib die Umsetzung frei.", ziel: { ansicht: "lernen", id: e.id } });
    if (st === "umgesetzt") melden({ art: "umgesetzt", titel: `Umgesetzt: ${e.daten.titel}`, text: e.daten.umsetzung?.notiz || "", ziel: { ansicht: "lernen", id: e.id } });
  }

  // Testwoche vorbei → einmal fragen (bleibt offen, bis du entschieden hast); bei zwei Rechnern fragt nur einer
  let fragtGerade = false;
  function testphasePruefen() {
    const a = auto();
    if (fragtGerade || a.modus !== "freigabe" || !a.testphase_bis || a.frage_offen || Date.now() < Date.parse(a.testphase_bis)) return;
    fragtGerade = true;
    anspruch(`testphase-${a.testphase_bis.slice(0, 19).replace(/[^0-9T]/g, "")}`).then((ok) => {
      fragtGerade = false;
      if (ok === null) return;
      a.frage_offen = true;
      einstellungenSichern();
      if (ok) melden({ art: "frage", titel: "Testwoche vorbei: Wie geht es weiter?", text: "Soll Claude die Verbesserungen ab jetzt ohne deine Freigabe umsetzen (du wirst weiter über jede Umsetzung benachrichtigt) oder verlängern wir die Testphase um eine Woche?", ziel: { ansicht: "lernen", frage: "autonomie" } });
    });
  }

  function autonomie(wahl) {
    const a = auto();
    if (wahl === "autonom") Object.assign(a, { modus: "autonom", frage_offen: false, entschieden: jetzt() });
    else if (wahl === "verlaengern") Object.assign(a, { modus: "freigabe", frage_offen: false, testphase_bis: new Date(Date.now() + WOCHE).toISOString(), verlaengert: (a.verlaengert || 0) + 1 });
    else if (wahl === "freigabe") Object.assign(a, { modus: "freigabe", frage_offen: false });
    else throw new Error(`Unbekannte Wahl ${wahl}`);
    einstellungenSichern();
    melden({ art: "info", titel: wahl === "autonom" ? "Claude setzt Verbesserungen ab jetzt selbst um" : wahl === "verlaengern" ? "Testphase um eine Woche verlängert" : "Verbesserungen wieder nur mit Freigabe", text: "" });
    return { ok: true, autonomie: a };
  }

  function starten() {
    const takt = () => {
      for (const f of [zeitplan, testphasePruefen, vorschlaegeAufraeumen]) { try { f(); } catch (e) { log(`Lernen: ${e.message}`); } }
    };
    setInterval(takt, umgebungS > 0 ? 15000 : 5 * 60 * 1000);
    setTimeout(takt, 30000);
  }

  return { melden, lernschleife, entscheiden, dbEreignis, autonomie, starten, vorschlaegeAufraeumen, laeuft: () => laeuft };
}
