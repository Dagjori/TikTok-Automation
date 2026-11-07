// Ideen-Studio im Cockpit: Aktionen des Inhabers, Status-Kette je Video (Slot) und Aufträge an Claude.
// Regeln wie im bisherigen Studio (docs/ideen-studio/vorlage.html, docs/automatik/tages-sitzung.md §1):
// gewaehlt → recherche → skript_fertig → freigegeben → uebergeben → produktion → geplant → gepostet,
// Nebenzweige rueckfrage und fehler. Slot-ID acc1|acc2-JJJJ-MM-TT-mittag|abend, Ideen-ID acc1|acc2-JJJJ-MM-TT.
import fs from "node:fs";
import path from "node:path";

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

export function erstelleStudio({ db, repo, auftrag, log = () => {}, einstellungen = () => ({}), produzieren = null }) {
  const jetzt = () => new Date().toISOString();
  const slotId = (konto, datum, slot) => `${KONTEN[konto].praefix}-${datum}-${slot}`;
  const ideenId = (konto, datum) => `${KONTEN[konto].praefix}-${datum}`;

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

  // Nach einem Skript-Auftrag: Slots, die noch auf „recherche“ stehen, als Fehler markieren (nie stumm hängen lassen)
  function nachRecherche(ids, istFehler) {
    for (const id of ids) {
      const d = db.get("skripte", id);
      if (d?.daten.status !== "recherche") continue;
      db.schreiben("skripte", id, {
        status: "fehler", fehler_phase: "recherche",
        fehler: istFehler ? "Claude hat den Auftrag abgebrochen (Limit, Stopp oder Fehler). „Erneut versuchen“ startet die Recherche neu." : "Claude hat den Auftrag beendet, ohne das Skript zu schreiben. Bitte „Erneut versuchen“.",
        fortschritt: "Recherche nicht abgeschlossen", aktualisiert: jetzt(),
      }, { art: "update", ifVersion: d.version, von: "cockpit" });
    }
  }

  function skripteAnfordern(konto, datum, ids, art = "skripte", extra = {}) {
    const a = { art, datum, konto, ...(art === "skripte" ? { slots: ids } : { slot: ids[0].split("-").pop() }), ...extra };
    auftrag({
      art: "skripte",
      titel: `${art === "skripte" ? "Skripte" : "Neufassung"} · ${KONTEN[konto].name} · ${datum}`,
      text: skriptPrompt(a),
      modus: "auto",
      nachher: (_text, istFehler) => nachRecherche(ids, istFehler),
    });
  }

  const aktionen = {
    ideen({ konto, datum, wunsch = "" }) {
      pruefe({ konto, datum });
      wunsch = String(wunsch || "").trim().slice(0, 500);
      const prompt = ideenPrompt(konto, datum, wunsch);
      auftrag({
        art: "ideen",
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
          db.schreiben("ideen", id, { konto, datum, ideen, wunsch, zutaten: prompt.zutaten, gestrichen, erzeugt: jetzt() }, { ifVersion: db.get("ideen", id)?.version, von: "claude" });
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
      return { ok: true };
    },

    recherchieren({ konto, datum }) {
      pruefe({ konto, datum });
      const docs = SLOTS.map((s) => db.get("skripte", slotId(konto, datum, s))).filter((d) => d && (d.daten.status === "gewaehlt" || (d.daten.status === "fehler" && d.daten.fehler_phase !== "produktion")));
      if (!docs.length) throw fehler("Kein gewählter Slot ohne Skript");
      for (const d of docs) {
        db.schreiben("skripte", d.id, { status: "recherche", fortschritt: "An Claude übergeben, Recherche startet …", angefordert: jetzt(), fehler: "", fehler_phase: "", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
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
      db.schreiben("skripte", id, { status: "recherche", kommentar, kommentar_zeit: jetzt(), fehler: "", fehler_phase: "", fortschritt: "Neufassung angefordert", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      skripteAnfordern(d.daten.konto, d.daten.datum, [id], "neu_schreiben", { kommentar });
      return { ok: true };
    },

    freigeben({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "skript_fertig") throw fehler("Nur ein fertiges Skript lässt sich freigeben");
      db.schreiben("skripte", id, { status: "freigegeben", freigegeben_am: jetzt(), fortschritt: "Freigegeben", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      return { ok: true };
    },

    zuruecknehmen({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "freigegeben") throw fehler("Nur eine Freigabe lässt sich zurücknehmen");
      db.schreiben("skripte", id, { status: "skript_fertig", freigegeben_am: { __delete__: true }, fortschritt: "Freigabe zurückgenommen", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      return { ok: true };
    },

    verwerfen({ id }) {
      const d = slotLesen(id);
      if (!["gewaehlt", "skript_fertig", "fehler", "rueckfrage"].includes(d.daten.status)) throw fehler(`Bei Status „${d.daten.status}“ lässt sich nichts verwerfen`);
      if (d.daten.fehler_phase === "nachpruefen" || d.daten.post_id) throw fehler("Dieses Video ist schon in Buffer geplant bzw. gepostet und lässt sich hier nicht verwerfen");
      db.loeschen("skripte", id, { ifVersion: d.version });
      return { ok: true };
    },

    uebergeben({ datum }) {
      pruefe({ datum });
      const docs = db.liste("skripte", [["datum", "==", datum], ["status", "==", "freigegeben"]]);
      if (!docs.length) throw fehler("Kein freigegebenes Skript an diesem Tag");
      for (const d of docs) db.schreiben("skripte", d.id, { status: "uebergeben", uebergeben_am: jetzt(), fortschritt: produzieren ? "An Claude übergeben, Produktion startet …" : "Übergeben · wartet auf die lokale Produktion (Ausbau 3)", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
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

    erneut({ id }) {
      const d = slotLesen(id);
      if (d.daten.status !== "fehler") throw fehler("Nur ein Fehler lässt sich erneut versuchen");
      if (d.daten.fehler_phase === "produktion") {
        db.schreiben("skripte", id, { status: "uebergeben", fehler: "", fortschritt: "Produktion erneut angefordert", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
        if (produzieren) produzieren(d.daten.datum, [id]);
        return { ok: true };
      }
      // Nachprüfung gescheitert: Video ist schon in Buffer bzw. gepostet, also nur die Nachprüfung neu anstoßen (nie neu recherchieren)
      if (d.daten.fehler_phase === "nachpruefen") {
        db.schreiben("skripte", id, { status: "geplant", fehler: "", fehler_phase: "", nachpruefen_angefordert: { __delete__: true }, fortschritt: "Nachprüfung erneut angefordert (startet in ≤ 5 Min.)", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
        return { ok: true };
      }
      db.schreiben("skripte", id, { status: "recherche", fehler: "", fehler_phase: "", fortschritt: "Recherche erneut angefordert", aktualisiert: jetzt() }, { art: "update", ifVersion: d.version });
      skripteAnfordern(d.daten.konto, d.daten.datum, [id]);
      return { ok: true };
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
  };
}
