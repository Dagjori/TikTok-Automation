// Attrappe für Tests (COCKPIT_ATTRAPPE=1): ersetzt den claude-Prozess durch einen simulierten, der dieselben
// stream-json-Zeilen schreibt wie `claude -p --output-format stream-json --verbose`. So laufen Feed, Aufgabenliste,
// Spuren, Warteschlange, Stopp und nachher() im Server genau wie bei einem echten Auftrag, ohne Claude, ohne Repo,
// ohne Buffer. Ergebnisse werden simuliert: ideen → JSON mit 10 Testideen, skripte → Slots auf skript_fertig,
// produktion → Slots auf geplant, nachpruefen → Slot auf gepostet (wie anleitung/produktion.md §4).
// COCKPIT_ATTRAPPE_FEHLER=1: jeder Auftrag endet als Fehler. COCKPIT_ATTRAPPE_DAUER_S=<s>: feste kurze Laufzeit.
// COCKPIT_ATTRAPPE_MODUS_DATEI=<json-datei>: wird vor jedem Auftrag gelesen, { "modus": "ok" | "fehler" | "limit" | "haengt",
// "arten": ["ideen", …] (optional: nur diese Auftragsarten), "je_art": { "skripte": "limit", … } (optional: Modus je Art),
// "limit_s": 90 }. „limit“ endet mit der Limit-Meldung der CLI
// („You've hit your 5-hour limit · resets …“), „haengt“ schreibt nach dem Start nichts mehr und endet nie (für die Wache).
import fs from "node:fs";
import { EventEmitter } from "node:events";
import { PassThrough, Writable } from "node:stream";
import { KONTEN } from "./studio.mjs";

const zufall = (a, b) => a + Math.random() * (b - a);
const ganz = (a, b) => Math.floor(zufall(a, b + 1));

// Zeitpunkt JJJJ-MM-TT + HH:MM in Berlin als ISO (UTC)
function berlinIso(datum, uhr) {
  const utc = Date.parse(`${datum}T${uhr || "12:00"}:00Z`);
  const alsBerlin = Date.parse(new Date(utc).toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).replace(" ", "T") + "Z");
  return new Date(utc - (alsBerlin - utc)).toISOString();
}

// Schritte (Aufgabenliste) und Werkzeuge je Auftragsart
function plan(job) {
  const ids = job.ids || [];
  const id = ids[0] || "acc1-JJJJ-MM-TT-mittag";
  const name = KONTEN[job.konto]?.name || "Konto";
  switch (job.art) {
    case "ideen":
      return {
        schritte: ["Lernstand und Zutaten lesen", "Themen sammeln", "Originalität per Websuche prüfen", "Belege suchen", "Ideen bewerten und streichen", "10 Ideen als JSON ausgeben"],
        werkzeuge: [
          ["WebSearch", { query: `${name} Rekord Vergleich ${job.datum?.slice(0, 4) || ""}` }],
          ["WebSearch", { query: "Was wäre wenn die Erde doppelt so schnell rotiert" }],
          ["WebSearch", { query: "tiktok was wäre wenn simulation viral" }],
          ["WebSearch", { query: "Destatis Durchschnitt Haushalt 2026" }],
          ["WebFetch", { url: "https://www.destatis.de/DE/Themen/_inhalt.html", prompt: "Kennzahlen" }],
          ["WebSearch", { query: "Kosten pro Kilometer E-Auto Benziner 2026" }],
        ],
        texte: ["Ich sammle zuerst Themen aus den Zutaten des Tages.", "Drei Ideen sind zu nah an bisherigen Videos, die streiche ich.", "Die Belege für Idee 4 und 7 sind gefunden."],
      };
    case "skripte":
      return {
        schritte: ["Anleitung skripte.md lesen", "Slot-Dokumente lesen", "Zahlen recherchieren", "Rechnung prüfen", "Skript schreiben", "Ins Slot-Dokument schreiben"],
        werkzeuge: [
          ["Read", { file_path: "cockpit/anleitung/skripte.md" }],
          ["Bash", { command: `node cockpit/db.mjs get skripte ${id}`, description: "Liest das Slot-Dokument" }],
          ["WebSearch", { query: "amtliche Quelle Zahl prüfen 2026" }],
          ["WebFetch", { url: "https://www.destatis.de/DE/Presse/Pressemitteilungen/_inhalt.html", prompt: "Zahl belegen" }],
          ["Bash", { command: "py -3 pipeline/sim/rechnung_test.py", description: "Rechnet nach und testet" }],
          ["Write", { file_path: `cockpit/daten/tmp/skript-${id}.json` }],
          ["Bash", { command: `node cockpit/db.mjs meilenstein skripte ${id} "Recherche läuft"`, description: "Meilenstein setzen" }],
        ],
        texte: ["Die Quelle ist amtlich, die Zahl stimmt für 2026.", "Rechnung geprüft, das Ergebnis kippt nicht.", "Das Skript folgt dem Aufbau aus dem REA-Regelwerk."],
      };
    case "produktion":
      return {
        schritte: ["Anleitung produktion.md lesen", "Faktencheck vor dem Bau", "Szene und Ton bauen", "Rendern über den Render-Dienst", "Komplette Prüfung", "In Buffer planen"],
        werkzeuge: [
          ["Read", { file_path: "cockpit/anleitung/produktion.md" }],
          // Feste Modell-Regel (08.11.): Bau-Agenten mit Sonnet; COCKPIT_ATTRAPPE_NEUBAU=1 zeigt zusätzlich einen Opus-Agenten für einen Neubau
          ...(process.env.COCKPIT_ATTRAPPE_NEUBAU === "1" ? [["Agent", { description: `Neubau: neue Welt für ${id}`, model: "opus" }]] : []),
          ["Agent", { description: `Baut die Szene für ${id}`, model: "sonnet" }],
          ["Bash", { command: "node cockpit/werkzeuge/mit_schluessel.mjs stimme …", description: "Erzeugt die Stimme" }],
          ["Bash", { command: "node cockpit/werkzeuge/mit_schluessel.mjs render senden …", description: `Rendert ${id} über den Render-Dienst` }],
          ["Bash", { command: "node cockpit/werkzeuge/mit_schluessel.mjs render warten …", description: "Wartet auf den Render" }],
          ["Bash", { command: "ffmpeg -i out.mp4 -af loudnorm=print_format=summary -f null -", description: "Prüft die Lautheit mit ffmpeg" }],
          ["Bash", { command: "py -3 qc/massstab.py", description: "Prüft Maßstab und Text-Überlappung" }],
          ["Bash", { command: "node cockpit/werkzeuge/mit_schluessel.mjs buffer …", description: "Plant das Video in Buffer" }],
        ],
        texte: ["Faktencheck bestanden, ich baue.", "Der Render läuft, ich warte im Vordergrund.", "Prüfung bestanden, ich plane in Buffer."],
      };
    case "nachpruefen":
      return {
        schritte: ["Anleitung §4 lesen", "Nachprüfung in Buffer", "Ergebnis eintragen", "Protokoll committen"],
        werkzeuge: [
          ["Read", { file_path: "cockpit/anleitung/produktion.md" }],
          ["Bash", { command: "node cockpit/werkzeuge/mit_schluessel.mjs buffer --nachpruefen …", description: "Nachprüfung in Buffer (öffentlich, Länge, KI-Label)" }],
          ["Bash", { command: `node cockpit/db.mjs get skripte ${id}`, description: "Liest das Slot-Dokument" }],
        ],
        texte: ["Das Video ist öffentlich und vollständig."],
      };
    default:
      return {
        schritte: ["Auftrag verstehen", "Dateien lesen", "Antwort erarbeiten", "Ergebnis prüfen", "Antworten"],
        werkzeuge: [
          ["Read", { file_path: "CLAUDE.md" }],
          ["Grep", { pattern: "cockpit" }],
          ["Glob", { pattern: "cockpit/**/*.mjs" }],
          ["Bash", { command: "git status --short", description: "Zeigt den Arbeitsstand" }],
        ],
        texte: ["Ich schaue mir das kurz an."],
      };
  }
}

// Ergebnis-Text (Antwort) und simulierte Änderungen in der Datenbank
function ergebnis(job, db, log) {
  const jetzt = new Date().toISOString();
  const name = KONTEN[job.konto]?.name || "";
  if (job.art === "ideen") {
    // Punkte absteigend, Idee 1 und 2 im selben Themenfeld (so lässt sich die Regel der automatischen Wahl prüfen)
    const ideen = Array.from({ length: 10 }, (_, i) => ({
      nr: i + 1,
      punkte: 20 - i,
      titel: `Testidee ${i + 1} · ${name} · ${job.datum}`,
      feld: `Testfeld ${i < 2 ? "A" : String.fromCharCode(65 + i)}`,
      format: i % 2 ? "Rechnung" : "Duell",
      suchbegriff: `Testbegriff ${i + 1}`,
      nachfrage: "Attrappe: keine echte Nachfrage geprüft",
      winkel: "Attrappe",
      originalitaet: "Suche: „Testidee“ · Ergebnis: kein deutsches Video gefunden (Attrappe)",
      thema: `Testthema ${i + 1}`,
      hook: `Hook der Testidee ${i + 1}: Was wäre, wenn …?`,
      ergebnis_ansatz: "Testrechnung mit erfundenen Zahlen (Attrappe)",
      warum_relevant: "Nur ein Test des Cockpits",
      diskussion: "Keine",
      daten: "Keine (Attrappe)",
      bildidee: "Ein leuchtender Testwürfel",
      laender: "Deutschland",
      alternativen: ["A", "B"],
    }));
    return JSON.stringify({ gestrichen: ["Testidee alt (zu nah an einem früheren Video)"], ideen });
  }
  if (job.art === "skripte") {
    for (const id of job.ids || []) {
      const d = db.get("skripte", id);
      if (!d || d.daten.status !== "recherche") continue;
      try {
        db.schreiben("skripte", id, {
          status: "skript_fertig",
          skript: {
            nr: d.daten.idee_nr, titel: d.daten.titel, thema: d.daten.thema || "Testthema", laender: "Deutschland",
            // Sprechtext im Textformat der Stimme (besteht pipeline/qc/stimme_vorab.py: keine Ziffern, keine Auslassungspunkte)
            segmente: [
              { id: "hook", phase: "hook", text: `${d.daten.titel}?`, sprechtext: "Was wäre, wenn das hier nur ein Test ist?" },
              { id: "regeln", phase: "regeln", text: "Gleiche Regeln für beide.", sprechtext: "Gleiche Regeln für beide." },
              { id: "aufloesung", phase: "aufloesung", text: "Ergebnis: 42", sprechtext: "Am Ende steht zweiundvierzig." },
            ],
          },
          selbstpruefung: ["Wortzahl: ok (Attrappe)", "Fakten: belegt (Attrappe)", "Textformat der Stimme: ok"],
          caption: "Testvideo aus der Attrappe #test",
          quellen: [{ titel: "Testquelle (Attrappe)", url: "https://example.org" }],
          zahlen: [{ wert: 42, einheit: "Stück", quelle: "Testquelle (Attrappe)" }],
          rechenweg: "6 × 7 = 42 (Attrappe)", annahmen: ["Nur ein Test"], faktencheck: "recherchiert",
          fortschritt: "Skript fertig, bitte prüfen", aktualisiert: jetzt,
        }, { art: "update", ifVersion: d.version, von: "claude" });
        db.meilenstein("skripte", id, "Skript fertig, bitte prüfen", { von: "claude" });
      } catch (e) { log(`Attrappe: ${id} nicht geschrieben (${e.message})`); }
    }
    return `Attrappe: ${(job.ids || []).length} Skript(e) geschrieben.`;
  }
  if (job.art === "produktion") {
    for (const id of job.ids || []) {
      const d = db.get("skripte", id);
      if (!d || !["uebergeben", "produktion"].includes(d.daten.status)) continue;
      try {
        db.schreiben("skripte", id, { status: "geplant", geplant_fuer: berlinIso(d.daten.datum, d.daten.uhrzeit), fortschritt: "In Buffer geplant (Attrappe)", aktualisiert: jetzt }, { art: "update", ifVersion: d.version, von: "claude" });
        db.meilenstein("skripte", id, "In Buffer geplant (Attrappe)", { von: "claude" });
      } catch (e) { log(`Attrappe: ${id} nicht geplant (${e.message})`); }
    }
    return `Attrappe: Produktion ${job.datum} fertig, ${(job.ids || []).length} Video(s) geplant.`;
  }
  if (job.art === "nachpruefen") {
    for (const id of job.ids || []) {
      const d = db.get("skripte", id);
      if (!d || d.daten.status !== "geplant") continue;
      try {
        db.schreiben("skripte", id, { status: "gepostet", nachgeprueft: jetzt, fortschritt: "Gepostet und nachgeprüft (Attrappe)", aktualisiert: jetzt }, { art: "update", ifVersion: d.version, von: "claude" });
      } catch (e) { log(`Attrappe: ${id} nicht nachgeprüft (${e.message})`); }
    }
    return "Attrappe: Nachprüfung erledigt, Video ist online.";
  }
  return "Attrappe: Das ist eine simulierte Antwort. Es lief kein echter Claude-Prozess.";
}

// Reset-Zeit wie die CLI sie schreibt: „6:05pm (Europe/Berlin)“
function limitText(sekunden) {
  const bis = new Date(Math.ceil((Date.now() + sekunden * 1000) / 60000) * 60000);
  const [h, m] = bis.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit", hour12: false }).split(":").map(Number);
  const zeit = `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
  return `You've hit your 5-hour limit · resets ${zeit} (Europe/Berlin)`;
}

export function erstelleAttrappe({ db, log = () => {} }) {
  const IMMER_FEHLER = process.env.COCKPIT_ATTRAPPE_FEHLER === "1";
  const MODUS_DATEI = process.env.COCKPIT_ATTRAPPE_MODUS_DATEI || "";
  const DAUER_S = Number(process.env.COCKPIT_ATTRAPPE_DAUER_S);

  function modusLesen(job) {
    if (IMMER_FEHLER) return { modus: "fehler" };
    if (!MODUS_DATEI) return { modus: "ok" };
    try {
      const m = JSON.parse(fs.readFileSync(MODUS_DATEI, "utf8"));
      // je_art (optional) geht vor: { "je_art": { "nachpruefen": "fehler", "skripte": "limit" } }
      const wahl = m.je_art && typeof m.je_art === "object" ? m.je_art[job.art] || "ok" : Array.isArray(m.arten) && !m.arten.includes(job.art) ? "ok" : m.modus;
      return { modus: ["fehler", "limit", "haengt"].includes(wahl) ? wahl : "ok", limit_s: Number(m.limit_s) > 0 ? Number(m.limit_s) : 90 };
    } catch { return { modus: "ok" }; }
  }

  // Liefert ein Objekt wie child_process.spawn: stdin, stdout, stderr, Ereignis "close"; kill() beendet es wie ein Stopp
  function prozess(job) {
    const { modus, limit_s: limitS } = modusLesen(job);
    const FEHLER = modus === "fehler" || modus === "limit";
    const p = new EventEmitter();
    p.attrappe = true;
    p.pid = undefined;
    p.stdout = new PassThrough();
    p.stderr = new PassThrough();
    p.stdin = new Writable({ write(_c, _e, fertig) { fertig(); } });
    const uhren = [];
    let beendet = false;
    const zeile = (o) => { if (!beendet) p.stdout.write(JSON.stringify(o) + "\n"); };
    const spaeter = (msWert, f) => uhren.push(setTimeout(() => { if (!beendet) f(); }, msWert));
    function ende(code) {
      if (beendet) return;
      beendet = true;
      for (const u of uhren) clearTimeout(u);
      let offen = 2;
      const zu = () => { if (--offen === 0) setImmediate(() => p.emit("close", code)); };
      p.stdout.once("end", zu);
      p.stderr.once("end", zu);
      p.stdout.end();
      p.stderr.end();
    }
    p.kill = () => {
      if (beendet) return;
      p.stderr.write("Attrappe: Prozess beendet (Stopp)\n");
      ende(1);
    };

    const { schritte: alle, werkzeuge, texte } = plan(job);
    const schritte = alle.slice(0, Math.min(alle.length, ganz(4, 6)));
    const dauer = DAUER_S > 0 ? Math.max(6, DAUER_S) * 1000 : zufall(25000, 45000);
    const start = Date.now();
    const sitzung = `attrappe-${start.toString(36)}`;
    let werkzeugNr = 0, zuege = 0;
    const assistent = (inhalt) => { zuege++; zeile({ type: "assistant", message: { content: [inhalt] }, session_id: sitzung }); };
    const werkzeug = (name, input, ausgabe = "ok", fehler = false) => {
      const id = `toolu_attrappe_${start.toString(36)}_${++werkzeugNr}`;
      assistent({ type: "tool_use", id, name, input });
      spaeter(ganz(400, 1100), () => zeile({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: id, content: ausgabe, is_error: fehler }] }, session_id: sitzung }));
    };
    const aufgaben = (aktiv) => werkzeug("TodoWrite", {
      todos: schritte.map((s, i) => ({ content: s, activeForm: s, status: i < aktiv ? "completed" : i === aktiv ? "in_progress" : "pending" })),
    }, "Aufgabenliste aktualisiert");

    spaeter(300, () => zeile({ type: "system", subtype: "init", model: job.modell || "attrappe", permissionMode: job.modus || "plan", session_id: sitzung, tools: [] }));
    spaeter(900, () => assistent({ type: "text", text: `(Attrappe) Ich zerlege den Auftrag in ${schritte.length} Schritte.` }));
    spaeter(1400, () => aufgaben(0));
    // „haengt“: nach dem Start kommt nichts mehr und der Prozess endet nie von selbst (nur kill() der Wache oder ein Stopp)
    if (modus === "haengt") return p;
    // Produktion: übergebene Slots gehen wie echt zuerst auf „produktion“
    if (job.art === "produktion") spaeter(2500, () => {
      for (const id of job.ids || []) {
        const d = db.get("skripte", id);
        if (d?.daten.status !== "uebergeben") continue;
        try { db.schreiben("skripte", id, { status: "produktion", fortschritt: "Produktion läuft (Attrappe)", aktualisiert: new Date().toISOString() }, { art: "update", ifVersion: d.version, von: "claude" }); } catch { /* egal */ }
      }
    });
    if (job.art === "skripte") spaeter(2500, () => {
      for (const id of job.ids || []) { try { db.meilenstein("skripte", id, "Recherche läuft (Attrappe)", { von: "claude" }); } catch { /* egal */ } }
    });

    // Alle ~2 s ein Werkzeug, ab und zu ein Text; die Aufgabenliste rückt mit der Zeit vor
    let t = 3000, aktiv = 0, n = 0;
    while (t < dauer - 3000) {
      const anteil = (t - 3000) / Math.max(1, dauer - 6000);
      const schritt = Math.min(schritte.length - 1, Math.floor(anteil * schritte.length));
      if (schritt !== aktiv) { const s = schritt; spaeter(t - 300, () => aufgaben(s)); aktiv = schritt; }
      const [name, input] = werkzeuge[n % werkzeuge.length];
      spaeter(t, () => werkzeug(name, input, `(Attrappe) ${name} erledigt`));
      if (n % 4 === 3) { const text = texte[Math.floor(n / 4) % texte.length]; spaeter(t + 900, () => assistent({ type: "text", text: `(Attrappe) ${text}` })); }
      n++;
      t += zufall(1600, 2400);
    }
    spaeter(dauer - 1500, () => aufgaben(schritte.length));
    spaeter(dauer - 600, () => {
      const text = FEHLER ? "" : ergebnis(job, db, log);
      if (!FEHLER && job.art !== "ideen") assistent({ type: "text", text });
      // Limit wie echt (gesehen 09.11.): die Meldung kommt als Text, das Ergebnis ist ein Fehler mit subtype „success“
      const limit = modus === "limit" ? limitText(limitS) : "";
      if (limit) assistent({ type: "text", text: limit });
      zeile({
        type: "result", subtype: FEHLER && !limit ? "error_during_execution" : "success", is_error: FEHLER,
        result: limit || (FEHLER ? "Attrappe: simulierter Fehler" : text),
        duration_ms: Date.now() - start, num_turns: zuege, session_id: sitzung, permission_denials: [],
      });
    });
    spaeter(dauer, () => {
      if (FEHLER) p.stderr.write("Attrappe: simulierter Fehler\n");
      ende(FEHLER ? 1 : 0);
    });
    return p;
  }

  return { prozess, fehler: IMMER_FEHLER };
}
