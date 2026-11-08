// Ideen-Studio im Cockpit: Aktionen des Inhabers, Status-Kette je Video (Slot) und Aufträge an Claude.
// Regeln wie im bisherigen Studio (docs/ideen-studio/vorlage.html, docs/automatik/tages-sitzung.md §1):
// gewaehlt → recherche → skript_fertig → freigegeben → uebergeben → produktion → geplant → gepostet,
// Nebenzweige rueckfrage und fehler. Slot-ID acc1|acc2-JJJJ-MM-TT-mittag|abend, Ideen-ID acc1|acc2-JJJJ-MM-TT.
// Automatik (07.11., lib/automatik.mjs): waehlen setzt auto_recherche_ab, freigeben auto_produktion_ab; der Takt dort startet
// Recherche bzw. Übergabe von selbst. automatik_jetzt / automatik_halt ziehen sie vor bzw. halten sie für einen Tag an.
import fs from "node:fs";
import path from "node:path";
import { automatikLesen, RECHERCHE_BEIDE_S, RECHERCHE_EINZELN_S, PRODUKTION_NACH_S } from "./automatik.mjs";
import { teilIdee, frageAusCaption, teilAusText } from "./treffer.mjs";

export const KONTEN = {
  simulierbar: { praefix: "acc1", name: "Simulierbar", kanal: "simulierbar" },
  stelldirvor: { praefix: "acc2", name: "Stell dir vor", kanal: "stelldirvor.pov" },
};
export const SLOTS = ["mittag", "abend"];
const AENDERBAR = new Set(["gewaehlt", "fehler"]);
const NEU_SCHREIBBAR = new Set(["skript_fertig", "rueckfrage", "fehler"]);
const SLOT_NAME = { mittag: "Mittag", abend: "Abend" };

// Mittag 12:30, am Wochenende 09:30; Abend 19:30
export function uhrzeit(datum, slot) {
  if (slot === "abend") return "19:30";
  const wt = new Date(`${datum}T12:00:00Z`).getUTCDay();
  return wt === 0 || wt === 6 ? "09:30" : "12:30";
}

class StudioFehler extends Error {}
const fehler = (text) => new StudioFehler(text);

function jsonAusText(text) {
  const t = String(text || "").replace(/```(?:json)?/g, "");
  const a = t.indexOf("{"), e = t.lastIndexOf("}");
  if (a < 0 || e <= a) throw fehler("Claude hat kein JSON geliefert");
  return JSON.parse(t.slice(a, e + 1));
}

export function erstelleStudio({ db, repo, auftrag, log = () => {}, einstellungen = () => ({}), produzieren = null, heute = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }) }) {
  const jetzt = () => new Date().toISOString();
  const spaeter = (s) => new Date(Date.now() + s * 1000).toISOString();
  const WEG = { __delete__: true };
  const automatik = () => automatikLesen(einstellungen());
  const slotId = (konto, datum, slot) => `${KONTEN[konto].praefix}-${datum}-${slot}`;
  const ideenId = (konto, datum) => `${KONTEN[konto].praefix}-${datum}`;
  // Slots eines Tages, ohne Konto beide Konten
  const tagesSlots = (datum, konto) => db.liste("skripte", [["datum", "==", datum], ...(konto ? [["konto", "==", konto]] : [])]);

  function pruefe({ konto, datum, slot } = {}) {
    if (konto !== undefined && !KONTEN[konto]) throw fehler(`Unbekanntes Konto „${konto}“`);
    if (datum !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || "")) throw fehler(`Ungültiges Datum „${datum}“`);
      const ab = einstellungen().studio_ab;
      if (ab && datum < ab) throw fehler(`Der ${datum} läuft noch im alten Ideen-Studio. Das Cockpit übernimmt ab ${ab}.`);
    }
    if (slot !== undefined && !SLOTS.includes(slot)) throw fehler(`Unbekannter Slot „${slot}“`);
  }

  function slotLesen(id) {
    const d = db.get("skripte", id);
    if (!d) throw fehler(`Das Video ${id} gibt es nicht`);
    pruefe({ datum: d.daten.datum });
    return d;
  }

  const befehle = () => JSON.parse(fs.readFileSync(path.join(repo, "docs", "ideen-studio", "befehle.json"), "utf8"));
  const lernstand = (konto) => db.get("stand", `lernstand-${KONTEN[konto].praefix}`)?.daten?.text || befehle()[konto].lernstand || "";

  // Zutaten des Tages: je Liste n zufällige Einträge (gleiche Logik wie zutaten_ziehen in tools/chat_befehle.py)
  function zutatenZiehen(b) {
    const n = b.zutaten_je_liste || 2;
    return (b.zutaten || []).map((z) => {
      const rest = [...z.eintraege], wahl = [];
      while (wahl.length < n && rest.length) wahl.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
      return `- ${z.name}: ${wahl.join(" · ")}`;
    }).join("\n");
  }

  function ideenPrompt(konto, datum, wunsch) {
    const b = befehle()[konto];
    const titel = db.liste("skripte", [["konto", "==", konto]]).map((d) => d.daten.titel).filter(Boolean);
    const bisher = [...new Set([...(b.bisher || []), ...titel])];
    const zutaten = zutatenZiehen(b);
    let p = b.ideen_vorlage.replace("{{LERNSTAND}}", () => lernstand(konto)).replace("- {{BISHER}}", () => bisher.map((t) => `- ${t}`).join("\n")).replace("{{ZUTATEN}}", () => zutaten);
    if (wunsch) p = p.replace("AUFGABE\n", () => `MEIN WUNSCH FÜR HEUTE: ${wunsch}\n\nAUFGABE\n`);
    p += `\n\nVideo-Tag: ${datum}. Alle Aussagen müssen für das Jahr ${datum.slice(0, 4)} gelten.`;
    p += '\n\nHINWEIS COCKPIT: Nutze die Websuche für die Originalitäts-Prüfung und für Belege (zügig, je Idee 1 bis 3 Suchen). Lies keine Dateien und ändere nichts. Antworte am Ende ausschließlich mit dem JSON-Objekt {"gestrichen": [...], "ideen": [...]} mit genau 10 Ideen, ohne Text davor oder danach.';
    return { text: p, zutaten };
  }

  const skriptPrompt = (a) =>
    `Du bist die Skript-Sitzung des TikTok-Cockpits auf dem Laptop des Inhabers (Video-Tag ${a.datum}). ` +
    "Lies zuerst cockpit/anleitung/skripte.md vollständig und befolge sie Schritt für Schritt. " +
    "Niemand antwortet im Chat: Rückfragen nur über den Status im Slot-Dokument.\n\nAUFTRAG\n" + JSON.stringify(a);

  // Nach einem Skript-Auftrag: Slots, die noch auf „recherche“ stehen, als Fehler markieren (nie stumm hängen lassen).
  // Vom Inhaber gestoppt: nie automatisch wiederholen und nicht melden (auto_wiederholt_phase, auto_gemeldet).
  function nachRecherche(ids, istFehler, gestoppt = false) {
    for (const id of ids) {
      const d = db.get("skripte", id);
      if (d?.daten.status !== "recherche") continue;
      db.schreiben("skripte", id, {
        status: "fehler", fehler_phase: "recherche",
        fehler: gestoppt ? "Von dir gestoppt. „Erneut versuchen“ startet die Recherche neu."
          : istFehler ? "Claude hat den Auftrag abgebrochen (Limit, Stopp oder Fehler). „Erneut versuchen“ startet die Recherche neu." : "Claude hat den Auftrag beendet, ohne das Skript zu schreiben. Bitte „Erneut versuchen“.",
        ...(gestoppt ? { auto_wiederholt_phase: "recherche", auto_gemeldet: true } : {}),
        fortschritt: "Recherche nicht abgeschlossen", aktualisiert: jetzt(),
      }, { art: "update", ifVersion: d.version, von: "cockpit" });
    }
  }

  function skripteAnfordern(konto, datum, ids, art = "skripte", extra = {}) {
    const a = { art, datum, konto, ...(art === "skripte" ? { slots: ids } : { slot: ids[0].split("-").pop() }), ...extra };
    auftrag({
      art: "skripte", konto, datum, ids,
      titel: `${art === "skripte" ? "Skripte" : "Neufassung"} · ${KONTEN[konto].name} · ${datum}`,
      text: skriptPrompt(a),
      modus: "auto",
      nachher: (_text, istFehler, job) => nachRecherche(ids, istFehler, !!job?.gestoppt),
    });
  }

  // Recherche-Automatik: Nach jeder neuen Wahl startet die Recherche von selbst, für alle gewählten Slots des Kontos und
  // Tages in einem Auftrag. Sind beide Slots belegt, nach 15 s (Zeit zum Umentscheiden), sonst nach 3 Min. (Zeit für den zweiten).
  function autoRechercheSetzen(konto, datum) {
    if (!automatik().recherche || datum < heute()) return null;
    const docs = SLOTS.map((s) => db.get("skripte", slotId(konto, datum, s)));
    const ab = spaeter(docs.every(Boolean) ? RECHERCHE_BEIDE_S : RECHERCHE_EINZELN_S);
    for (const d of docs) if (d?.daten.status === "gewaehlt") db.schreiben("skripte", d.id, { auto_recherche_ab: ab }, { art: "update", ifVersion: d.version });
    return ab;
  }

  // ───────── Treffer-Folgen (Wahl des Inhabers 08.11.2026, Hirn „Serien und Treffer-Folgen“) ─────────
  // Serie eines geposteten Videos aus seinem Slot-Dokument (über post_id): Teil und Titel von Teil 1; ältere Posts ohne Dokument aus der Caption.
  function serieVon(post) {
    const d = post?.post_id ? db.liste("skripte", [["post_id", "==", post.post_id]])[0] : null;
    const idee = d?.daten.idee || null;
    if (idee?.typ === "folgeteil") return { teil: Number(idee.teil) || 2, wurzel: idee.serie?.wurzel_titel || idee.titel, titel: d.daten.titel || idee.titel, slot: d.id };
    if (d) return { teil: 1, wurzel: d.daten.titel || idee?.titel || frageAusCaption(post.titel), titel: d.daten.titel || idee?.titel, slot: d.id };
    return { teil: teilAusText(post?.titel), wurzel: frageAusCaption(post?.titel), titel: frageAusCaption(post?.titel), slot: null };
  }

  // Nächster Video-Tag ab morgen, an dem im Konto noch ein Slot frei bzw. änderbar ist („am nächsten Produktionstag“, höchstens 4 Tage voraus)
  function folgeteilTag(konto) {
    const basis = Date.parse(`${heute()}T12:00:00Z`);
    for (let n = 1; n <= 4; n++) {
      const datum = new Date(basis + n * 86400000).toISOString().slice(0, 10);
      if (SLOTS.some((s) => { const d = db.get("skripte", slotId(konto, datum, s)); return !d || AENDERBAR.has(d.daten.status); })) return datum;
    }
    return new Date(basis + 5 * 86400000).toISOString().slice(0, 10);
  }

  // Vorgemerkte Folgeteile (stand/treffer-offen) eines Kontos für einen Tag herausnehmen; ältere Vormerkungen wandern mit
  function vorgemerkteNehmen(konto, datum) {
    const v = db.get("stand", "treffer-offen");
    const liste = v?.daten.liste || [];
    const nehmen = liste.filter((x) => x.konto === konto && x.datum <= datum);
    if (!nehmen.length) return [];
    db.schreiben("stand", "treffer-offen", { liste: liste.filter((x) => !nehmen.includes(x)), aktualisiert: jetzt() }, { ifVersion: v.version, von: "cockpit" });
    return nehmen.map((x) => x.idee);
  }

  // Treffer → Idee „Teil N“ in die Ideen des nächsten freien Video-Tags (gibt es dort noch keine Ideen: vormerken)
  function trefferIdee({ konto, post, teil, bewertung, views24, serie }) {
    if (!KONTEN[konto]) throw fehler(`Unbekanntes Konto „${konto}“`);
    const s = serie || serieVon(post);
    const idee = teilIdee({ konto, teil, wurzelTitel: s.wurzel, vorherTitel: s.titel, post, bewertung, views24 });
    const datum = folgeteilTag(konto);
    const id = ideenId(konto, datum);
    const gleich = (i) => i?.typ === "folgeteil" && i.serie?.post_id && i.serie.post_id === post?.post_id;
    const dok = db.get("ideen", id);
    if (dok) {
      const ideen = dok.daten.ideen || [];
      if (ideen.some(gleich)) return { ok: true, datum, schon_da: true, idee };
      const nr = Math.max(10, ...ideen.map((i) => Number(i.nr) || 0)) + 1;
      db.schreiben("ideen", id, { ideen: [{ ...idee, nr }, ...ideen] }, { art: "update", ifVersion: dok.version, von: "cockpit" });
      return { ok: true, datum, nr, vorgemerkt: false, idee };
    }
    const v = db.get("stand", "treffer-offen");
    const liste = v?.daten.liste || [];
    if (liste.some((x) => gleich(x.idee))) return { ok: true, datum, schon_da: true, idee };
    db.schreiben("stand", "treffer-offen", { liste: [...liste, { konto, datum, idee, zeit: jetzt() }], aktualisiert: jetzt() }, { ifVersion: v?.version, von: "cockpit" });
    return { ok: true, datum, vorgemerkt: true, idee };
  }

  const aktionen = {
    ideen({ konto, datum, wunsch = "" }) {
      pruefe({ konto, datum });
      wunsch = String(wunsch || "").trim().slice(0, 500);
      const prompt = ideenPrompt(konto, datum, wunsch);
      auftrag({
        art: "ideen", konto, datum, ids: [],
        titel: `10 Ideen · ${KONTEN[konto].name} · ${datum}`,
        text: prompt.text,
        modus: "plan",
        nachher: (text, istFehler) => {
          if (istFehler) throw fehler("Ideen-Auftrag abgebrochen");
          const antwort = jsonAusText(text);
          const ideen = (antwort.ideen || []).filter((i) => i && i.titel).slice(0, 10).map((i, n) => ({ ...i, nr: Number(i.nr) || n + 1 }));
          if (!ideen.length) throw fehler("Claude hat keine gültigen Ideen geliefert");
          const gestrichen = Array.isArray(antwort.gestrichen) ? antwort.gestrichen.map(String).slice(0, 30) : [];
          const id = ideenId(konto, datum);
          // Folgeteile eigener Treffer bleiben bzw. kommen dazu (vorhandene Idee des Tages, vorgemerkte aus stand/treffer-offen)
          const folgeteile = [...(db.get("ideen", id)?.daten.ideen || []).filter((i) => i.typ === "folgeteil"), ...vorgemerkteNehmen(konto, datum)];
          const alle = [...folgeteile.map((i, n) => ({ ...i, nr: 11 + n })), ...ideen.filter((i) => i.typ !== "folgeteil")];
          db.schreiben("ideen", id, { konto, datum, ideen: alle, wunsch, zutaten: prompt.zutaten, gestrichen, erzeugt: jetzt() }, { ifVersion: db.get("ideen", id)?.version, von: "claude" });
        },
      });
      return { ok: true, hinweis: "Claude sucht und prüft die Ideen (ca. 3–6 Min.)" };
    },

    waehlen({ konto, datum, slot, nr }) {
      pruefe({ konto, datum, slot });
      const idee = db.get("ideen", ideenId(konto, datum))?.daten.ideen?.find((i) => i.nr === Number(nr));
      if (!idee) throw fehler(`Idee ${nr} gibt es für diesen Tag nicht`);
      const id = slotId(konto, datum, slot);
      const d = db.get("skripte", id);
      if (d && d.daten.idee?.titel === idee.titel) {
        if (!AENDERBAR.has(d.daten.status)) throw fehler(`${SLOT_NAME[slot]} ist schon in Arbeit (${d.daten.status}).`);
        db.loeschen("skripte", id, { ifVersion: d.version });
        return { ok: true, abgewaehlt: true };
      }
      if (d && !AENDERBAR.has(d.daten.status)) throw fehler(`${SLOT_NAME[slot]} ist schon belegt und in Arbeit (${d.daten.status}).`);
      const andererId = slotId(konto, datum, slot === "mittag" ? "abend" : "mittag");
      const anderer = db.get("skripte", andererId);
      if (anderer && anderer.daten.idee?.titel === idee.titel) {
        if (!AENDERBAR.has(anderer.daten.status)) throw fehler("Diese Idee ist im anderen Slot schon in Arbeit.");
        db.loeschen("skripte", andererId, { ifVersion: anderer.version });
      }
      db.schreiben("skripte", id, {
        konto, datum, slot, uhrzeit: uhrzeit(datum, slot), idee_nr: idee.nr, idee, titel: idee.titel, thema: idee.thema || "",
        status: "gewaehlt", fortschritt: "", fehler: "", fehler_phase: "", verlauf: [{ zeit: jetzt(), text: `Idee gewählt (${SLOT_NAME[slot]})`, von: "cockpit" }],
        erstellt: jetzt(), aktualisiert: jetzt(),
      }, { ifVersion: d?.version });
      const ab = autoRechercheSetzen(konto, datum);
      return { ok: true, ...(ab ? { auto_recherche_ab: ab } : {}) };
    },

    // ids (optional, Automatik): nur diese Slots; sonst alle gewählten bzw. in der Recherche gescheiterten des Kontos und Tages
    recherchieren({ konto, datum, ids }) {
      pruefe({ konto, datum });
      const nur = Array.isArray(ids) ? new Set(ids) : null;
      // Gescheiterte Produktion oder Nachprüfung nie neu recherchieren (das Video ist schon gebaut bzw. in Buffer)
      const docs = SLOTS.map((s) => db.get("skripte", slotId(konto, datum, s))).filter((d) => d && (!nur || nur.has(d.id)) && (d.daten.status === "gewaehlt" || (d.daten.status === "fehler" && !["produktion", "nachpruefen"].includes(d.daten.fehler_phase))));
      if (!docs.length) throw fehler("Kein gewählter Slot ohne Skript");
      for (const d of docs) {
        db.schreiben("skripte", d.id, { status: "recherche", fortschritt: "An Claude übergeben, Recherche startet …", angefordert: jetzt(), fehler: "", fehler_phase: "", auto_recherche_ab: WEG, auto_gemeldet: WEG, aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
        db.meilenstein("skripte", d.id, "Recherche angefordert", { von: "cockpit" });
      }
      skripteAnfordern(konto, datum, docs.map((d) => d.id));
      return { ok: true, slots: docs.map((d) => d.id) };
    },

    neu_schreiben({ id, kommentar }) {
      const d = slotLesen(id);
      kommentar = String(kommentar || "").trim().slice(0, 2000);
      if (!kommentar) throw fehler("Bitte schreib kurz, was anders werden soll");
      if (!NEU_SCHREIBBAR.has(d.daten.status) || ["produktion", "nachpruefen"].includes(d.daten.fehler_phase)) throw fehler(`Neu schreiben geht bei Status „${d.daten.status}“ nicht`);
      // Neuer Auftrag des Inhabers: eine Recherche-Wiederholung steht ihm wieder zu
      db.schreiben("skripte", id, {
        status: "recherche", kommentar, kommentar_zeit: jetzt(), fehler: "", fehler_phase: "", fortschritt: "Neufassung angefordert", aktualisiert: jetzt(),
        auto_gemeldet: WEG, ...(d.daten.auto_wiederholt_phase === "recherche" ? { auto_wiederholt_phase: WEG } : {}),
      }, { art: "update", ifVersion: d.version });
      skripteAnfordern(d.daten.konto, d.daten.datum, [id], "neu_schreiben", { kommentar });
      return { ok: true };
    },

    // Produktions-Automatik: 60 s Zeit zum Zurücknehmen, dann übergibt der Takt (sobald alle Skripte des Tages freigegeben sind)
    freigeben({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "skript_fertig") throw fehler("Nur ein fertiges Skript lässt sich freigeben");
      const ab = automatik().produktion && d.daten.datum >= heute() ? spaeter(PRODUKTION_NACH_S) : null;
      db.schreiben("skripte", id, { status: "freigegeben", freigegeben_am: jetzt(), fortschritt: "Freigegeben", aktualisiert: jetzt(), ...(ab ? { auto_produktion_ab: ab } : {}) }, { art: "update", ifVersion: d.version });
      return { ok: true, ...(ab ? { auto_produktion_ab: ab } : {}) };
    },

    zuruecknehmen({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "freigegeben") throw fehler("Nur eine Freigabe lässt sich zurücknehmen");
      db.schreiben("skripte", id, { status: "skript_fertig", freigegeben_am: WEG, auto_produktion_ab: WEG, auto_produktion_wartet: WEG, fortschritt: "Freigabe zurückgenommen", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      return { ok: true };
    },

    verwerfen({ id }) {
      const d = slotLesen(id);
      if (!["gewaehlt", "skript_fertig", "fehler", "rueckfrage"].includes(d.daten.status)) throw fehler(`Bei Status „${d.daten.status}“ lässt sich nichts verwerfen`);
      if (d.daten.fehler_phase === "nachpruefen" || d.daten.post_id) throw fehler("Dieses Video ist schon in Buffer geplant bzw. gepostet und lässt sich hier nicht verwerfen");
      db.loeschen("skripte", id, { ifVersion: d.version });
      return { ok: true };
    },

    // ids (optional, Automatik): nur diese freigegebenen Slots; sonst alle des Tages
    uebergeben({ datum, ids }) {
      pruefe({ datum });
      const nur = Array.isArray(ids) ? new Set(ids) : null;
      const docs = db.liste("skripte", [["datum", "==", datum], ["status", "==", "freigegeben"]]).filter((d) => !nur || nur.has(d.id));
      if (!docs.length) throw fehler("Kein freigegebenes Skript an diesem Tag");
      for (const d of docs) db.schreiben("skripte", d.id, { status: "uebergeben", uebergeben_am: jetzt(), auto_produktion_ab: WEG, auto_produktion_wartet: WEG, fortschritt: produzieren ? "An Claude übergeben, Produktion startet …" : "Übergeben · wartet auf die lokale Produktion (Ausbau 3)", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      if (produzieren) produzieren(datum, docs.map((d) => d.id));
      return { ok: true, ids: docs.map((d) => d.id), produktion: !!produzieren };
    },

    // Produktion (neu) anstoßen für übergebene Slots eines Tages, z. B. nach Neustart des Cockpits oder wenn sie nie lief
    produktion_starten({ datum }) {
      pruefe({ datum });
      if (!produzieren) throw fehler("Die Produktion ist in diesem Cockpit nicht angeschlossen");
      const docs = db.liste("skripte", [["datum", "==", datum]]).filter((d) => ["uebergeben", "produktion"].includes(d.daten.status));
      if (!docs.length) throw fehler("Kein übergebenes Video an diesem Tag");
      for (const d of docs) db.meilenstein("skripte", d.id, "Produktion angestoßen", { von: "cockpit" });
      const r = produzieren(datum, docs.map((d) => d.id)) || {};
      return { ok: true, ids: docs.map((d) => d.id), laeuft_schon: !!r.laeuft_schon };
    },

    rueckfrage_annehmen({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "rueckfrage") throw fehler("Keine offene Rückfrage");
      db.schreiben("skripte", id, { status: "uebergeben", rueckfrage_antwort: "angenommen", rueckfrage_zeit: jetzt(), fortschritt: "Vorschlag angenommen", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      if (produzieren) produzieren(d.daten.datum, [id], d.daten.fehler);
      return { ok: true };
    },

    // Auch von der Automatik aufgerufen (einmal je Phase, lib/automatik.mjs); auto_wiederholt_phase bleibt dabei stehen
    erneut({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "fehler") throw fehler("Nur ein Fehler lässt sich erneut versuchen");
      if (d.daten.fehler_phase === "produktion") {
        db.schreiben("skripte", id, { status: "uebergeben", fehler: "", auto_gemeldet: WEG, fortschritt: "Produktion erneut angefordert", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
        if (produzieren) produzieren(d.daten.datum, [id]);
        return { ok: true };
      }
      // Nachprüfung gescheitert: Video ist schon in Buffer bzw. gepostet, also nur die Nachprüfung neu anstoßen (nie neu recherchieren)
      if (d.daten.fehler_phase === "nachpruefen") {
        db.schreiben("skripte", id, { status: "geplant", fehler: "", fehler_phase: "", auto_gemeldet: WEG, nachpruefen_angefordert: WEG, fortschritt: "Nachprüfung erneut angefordert (startet in ≤ 5 Min.)", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
        return { ok: true };
      }
      db.schreiben("skripte", id, { status: "recherche", fehler: "", fehler_phase: "", auto_gemeldet: WEG, fortschritt: "Recherche erneut angefordert", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      skripteAnfordern(d.daten.konto, d.daten.datum, [id]);
      return { ok: true };
    },

    // Automatik eines Tages sofort auslösen (ab = jetzt). was: "recherche" (Standard, gewählte Slots) oder "produktion"
    // (freigegebene Slots; übergeben wird trotzdem erst, wenn alle Skripte des Tages freigegeben sind). Ohne konto: beide Konten.
    automatik_jetzt({ konto, datum, was = "recherche" }) {
      pruefe({ konto: konto || undefined, datum });
      if (!["recherche", "produktion"].includes(was)) throw fehler("was=recherche|produktion");
      if (datum < heute()) throw fehler("Die Automatik gilt nur für heute und spätere Tage");
      const a = automatik();
      if (!a[was]) throw fehler(was === "recherche" ? "Die Recherche-Automatik ist aus. „Skripte recherchieren lassen“ startet sie von Hand." : "Die Produktions-Automatik ist aus. „An Claude übergeben“ startet sie von Hand.");
      const feld = was === "recherche" ? "auto_recherche_ab" : "auto_produktion_ab";
      const docs = tagesSlots(datum, konto).filter((d) => d.daten.status === (was === "recherche" ? "gewaehlt" : "freigegeben"));
      if (!docs.length) throw fehler(was === "recherche" ? "Kein gewählter Slot an diesem Tag" : "Kein freigegebenes Skript an diesem Tag");
      const ab = jetzt();
      for (const d of docs) db.schreiben("skripte", d.id, { [feld]: ab }, { art: "update", ifVersion: d.version });
      return { ok: true, ids: docs.map((d) => d.id), [feld]: ab };
    },

    // Automatik eines Tages anhalten (Felder entfernen): danach startet nur noch der Knopf. was: "recherche" (Standard),
    // "produktion" oder "alles". Ohne konto: beide Konten.
    automatik_halt({ konto, datum, was = "recherche" }) {
      pruefe({ konto: konto || undefined, datum });
      if (!["recherche", "produktion", "alles"].includes(was)) throw fehler("was=recherche|produktion|alles");
      const ids = [];
      for (const d of tagesSlots(datum, konto)) {
        const weg = {};
        if (was !== "produktion" && d.daten.auto_recherche_ab) weg.auto_recherche_ab = WEG;
        if (was !== "recherche" && (d.daten.auto_produktion_ab || d.daten.auto_produktion_wartet)) Object.assign(weg, { auto_produktion_ab: WEG, auto_produktion_wartet: WEG });
        if (!Object.keys(weg).length) continue;
        db.schreiben("skripte", d.id, weg, { art: "update", ifVersion: d.version });
        ids.push(d.id);
      }
      return { ok: true, ids };
    },

    lernstand({ konto, text }) {
      pruefe({ konto });
      const id = `lernstand-${KONTEN[konto].praefix}`;
      db.schreiben("stand", id, { ...(db.get("stand", id)?.daten || {}), konto, text: String(text || "").slice(0, 20000), quelle: "Inhaber im Cockpit", aktualisiert: jetzt() }, { ifVersion: db.get("stand", id)?.version });
      return { ok: true };
    },
  };

  return {
    ausfuehren(aktion, daten = {}) {
      const f = aktionen[aktion];
      if (!f) throw fehler(`Unbekannte Aktion „${aktion}“`);
      log(`Studio: ${aktion} ${JSON.stringify(daten).slice(0, 160)}`);
      return f(daten);
    },
    istStudioFehler: (e) => e instanceof StudioFehler,
    serieVon,
    trefferIdee,
  };
}
