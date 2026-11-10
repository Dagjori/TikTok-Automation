"use strict";
// Startseite „Jetzt“ (Entscheidungen 07.11.): jede laufende Aufgabe als Live-Karte, animiert bis sie fertig ist
// (Render und Ton, Produktion, Studio-Aufträge, dazu die Countdowns der Automatik). Fertig: Haken, dann klappt die
// Karte weg und landet unter „Erledigt heute“. Darunter: was auf dich wartet, Tagesplan, Aktivität, Konten.
// Karten werden einmal gebaut und danach nur aktualisiert (sonst starten Animationen bei jeder Live-Meldung neu).

const STUDIO_ARTEN = new Set(["ideen", "skripte"]);
const PROD_ARTEN = new Set(["produktion", "nachpruefen"]);
const AKZENT = { render: "var(--acc1)", ideen: "#f2c94c", skripte: "var(--blau)", produktion: "var(--laeuft)", nachpruefen: "var(--ok)", countdown: "var(--blau)", wartet: "#8590a6" };
const SYMBOL = { render: ["render", "anim-render"], ideen: ["ideen", "anim-ideen"], skripte: ["suche", "anim-suche"], produktion: ["zahnrad", "anim-produktion"], nachpruefen: ["pruefen", "anim-suche"] };
const SLOT_KURZ = (d) => `${KONTO_NAME[d.daten.konto] || ""} ${SLOT_NAME[d.daten.slot] || ""}`.trim();

// ───────── Arbeitsschritte aus dem Feed lesbar machen ─────────
function schrittText(e) {
  const t = String(e.titel || "").replace(/^🏭\s*/, "").split("\n")[0].trim();
  const ohneCd = t.replace(/^(cd\s+[^;&]+[;&]+\s*)+/i, "").replace(/^Set-Location\s+[^;]+;\s*/i, "");
  const datei = (s) => s.split(/[\\/]/).pop();
  switch (e.name) {
    case "WebSearch": return ["🌐", `Sucht: ${t.replace(/^(Websuche|Sucht):\s*/i, "")}`];
    case "WebFetch": { let h = t; try { h = new URL(t.match(/https?:\/\/\S+/)?.[0] || "").hostname.replace(/^www\./, ""); } catch { /* Titel bleibt */ } return ["🔗", `Liest Quelle: ${h}`]; }
    case "Read": return ["📖", /^Liest /.test(t) ? t : `Liest ${datei(t)}`];
    case "Write": return ["📝", /^Schreibt /.test(t) ? t : `Schreibt ${datei(t)}`];
    case "Edit": case "MultiEdit": return ["✏️", /^Ändert /.test(t) ? t : `Ändert ${datei(t)}`];
    case "Grep": case "Glob": return ["🔍", "Sucht im Projekt"];
    case "Task": case "Agent": return ["🤖", `Helfer: ${t.replace(/^Agent:\s*/i, "")}`];
    case "SubagentHandback": return ["🤖", "Helfer meldet zurück"];
    case "Monitor": return ["👁️", "Beobachtet einen laufenden Vorgang"];
    case "TodoWrite": return ["📋", "Plan aktualisiert"];
  }
  const schreibt = ohneCd.match(/cat\s*>\s*(\S+)/);
  if (schreibt) return ["📝", `Schreibt ${datei(schreibt[1])}`];
  const muster = [
    [/mit_schluessel\.mjs\s+render\s+status|auftrag\.py.*status/i, "🎬", "Prüft den Render-Stand"],
    [/mit_schluessel\.mjs\s+render/i, "🎬", "Gibt den Render in Auftrag"],
    [/mit_schluessel\.mjs\s+stimme|tts\.py/i, "🎙️", "Erzeugt die Stimme"],
    [/mit_schluessel\.mjs\s+buffer|post_buffer/i, "📅", "Plant in Buffer"],
    [/cockpit[\\/]db\.mjs/i, "💾", "Speichert den Stand"],
    [/ffmpeg|ffprobe|loudnorm/i, "🎧", "Bearbeitet Ton und Video"],
    [/blender/i, "🧊", "Blender rendert"],
    [/pytest|unittest|node --test|pruef|check/i, "🧪", "Prüft und testet"],
    [/kontakt|standbild|screenshot|vorschau/i, "🖼️", "Erstellt Prüfbilder"],
    [/Start-Sleep|sleep \d|for \(\$i|for i in/i, "⏳", "Wartet auf den Render"],
    [/^git\b/i, "🌿", "Git: " + ohneCd.replace(/^git\s+/, "").slice(0, 50)],
    [/\bgrep\b|\brg\b|Select-String|findstr/i, "🔍", "Sucht im Code"],
    [/^(ls|dir|Get-ChildItem)\b/i, "🗂️", "Schaut in einen Ordner"],
  ];
  for (const [re, icon, text] of muster) if (re.test(ohneCd)) return [icon, text];
  const skript = ohneCd.match(/^(?:node|py(?:thon)?(?:\s+-3)?)\s+(\S+)/i);
  if (skript) return ["⚙️", `Führt ${datei(skript[1])} aus`];
  return ["⌨️", ohneCd.slice(0, 90) || "Befehl"];
}

// ───────── Aufgaben ableiten ─────────
const titelZuProjekt = (projekt) => doks("skripte").find((d) => d.daten.projekt === projekt)?.daten.titel || (S.plan.protokoll || []).findLast?.((v) => v.projekt === projekt)?.titel || projekt;
const kontoZuProjekt = (projekt, a) => a?.konto || doks("skripte").find((d) => d.daten.projekt === projekt)?.daten.konto || "";
const kontoChip = (k) => (k ? `<span class="chip ${kontoInfo(k).klasse}">${esc(kontoInfo(k).name)}</span>` : "");
const feedVon = (key, spur, startMs) => S.feed.filter((e) => (e.job ? e.job === key : (spur === "produktion") === istProduktion(e) && Date.parse(e.zeit) >= startMs - 1000));

function claudeAufgabe(spur, info) {
  const start = info.start || (spur === "produktion" ? S.claude.produktion?.start : S.claude.start);
  const startMs = Date.parse(start || "") || Date.now();
  const key = `${spur}:${start}`;
  const art = info.art || (spur === "produktion" ? (String(info.titel).startsWith("Nachprüfung") ? "nachpruefen" : "produktion") : "");
  const feed = feedVon(key, spur, startMs);
  const werkzeuge = feed.filter((e) => e.art === "werkzeug");
  const plan = (spur === "produktion" ? S.claude.produktion?.aufgaben : S.claude.aufgaben) || [];
  const erledigt = plan.filter((a) => a.status === "completed").length;
  const jetzt = plan.find((a) => a.status === "in_progress");
  let ids = info.ids || (spur === "produktion" ? S.claude.produktion?.ids : null) || [];
  // Ohne Job-Infos (älterer Server): die übergebenen Videos des Produktionstags
  if (!ids.length && art === "produktion" && info.datum) ids = doks("skripte").filter((d) => d.daten.datum === info.datum && (["uebergeben", "produktion", "geplant", "gepostet", "rueckfrage"].includes(d.daten.status) || d.daten.fehler_phase === "produktion")).map((d) => d.id);
  const docs = ids.map((id) => skriptDok(id)).filter(Boolean);
  const a = {
    key, art, status: "laeuft", start: startMs, akzent: AKZENT[art] || AKZENT.skripte,
    fortschritt: plan.length ? erledigt / plan.length : null,
    prozentText: plan.length ? `${erledigt}/${plan.length}` : "",
    schritte: werkzeuge.slice(-3).map((e) => { const [icon, text] = schrittText(e); return { nr: e.nr, icon, text }; }),
    jetzt: jetzt?.text || "",
  };
  const suchen = werkzeuge.filter((e) => e.name === "WebSearch").length;
  const quellen = werkzeuge.filter((e) => e.name === "WebFetch").length;
  if (art === "ideen") {
    const konto = info.konto || Object.keys(KONTO_NAME).find((k) => String(info.titel).includes(KONTO_NAME[k]));
    const datum = info.datum || String(info.titel).match(/\d{4}-\d\d-\d\d/)?.[0] || "";
    Object.assign(a, { titel: "10 Ideen erzeugen", unter: `${kontoChip(konto)}<span>für ${datum ? tagLabel(datum) : "?"}</span>`, werte: [["Suchen", suchen], ["Quellen", quellen], ["Schritte", werkzeuge.length]] });
  } else if (art === "skripte") {
    const neu = String(info.titel).startsWith("Neufassung");
    const konto = info.konto || docs[0]?.daten.konto;
    Object.assign(a, {
      titel: neu ? "Skript neu schreiben" : docs.length > 1 ? `Recherche und ${docs.length} Skripte` : "Recherche und Skript",
      unter: `${kontoChip(konto)}<span>${esc(docs.map((d) => d.daten.titel).join(" · ") || info.titel)}</span>`,
      werte: [["Suchen", suchen], ["Quellen", quellen], ["Schritte", werkzeuge.length]],
    });
    a.teile = docs.map((d) => teilZeile(d.daten.titel, d.daten.fortschritt || STATUS_NAME[d.daten.status], d.daten.status === "recherche" ? [1, 0, 0] : [1, 1, 1], d.daten.status === "recherche"));
  } else if (art === "nachpruefen") {
    Object.assign(a, { titel: "Nachprüfung nach dem Posten", unter: `<span>${esc(String(info.titel).replace(/^Nachprüfung · /, ""))}</span>`, werte: [["Schritte", werkzeuge.length]] });
  } else {
    // Produktion: je Video eine Zeile mit Bau · Render · Ton · Prüfung · Buffer
    const datum = info.datum || S.claude.produktion?.datum || "";
    const geplant = docs.filter((d) => ["geplant", "gepostet"].includes(d.daten.status)).length;
    const renderJob = S.render.auftraege.find((r) => r.status === "laeuft" && docs.some((d) => d.daten.projekt === r.projekt));
    Object.assign(a, {
      titel: `Produktion ${datum ? tagLabel(datum) : ""}`,
      unter: `<span>${docs.length || ids.length || "?"} Video${(docs.length || ids.length) === 1 ? "" : "s"}</span>${[...new Set(docs.map((d) => d.daten.konto))].map(kontoChip).join("")}`,
      werte: [["Geplant", `${geplant}/${docs.length || ids.length || "?"}`], ["Render", renderJob ? `${Math.round(renderJob.prozent || 0)} %` : "–"], ["Schritte", werkzeuge.length]],
      teile: docs.map((d) => produktionsTeil(d)),
    });
    if (a.fortschritt === null && docs.length) a.fortschritt = docs.reduce((s, d) => s + produktionsAnteil(d), 0) / docs.length;
  }
  return a;
}

function teilZeile(name, text, stufen, jetzt, kaputt = -1) {
  return `<div class="lk-teil ${jetzt ? "jetzt" : ""}"><span class="stufen">${stufen.map((s, i) => `<i class="${i === kaputt ? "kaputt" : s ? "an" : ""}"></i>`).join("")}</span><span class="name" title="${esc(name)}">${esc(name)}</span><small class="hinweis">${esc(text || "")}</small></div>`;
}
// Stufe eines Videos in der Produktion: 0 Bau, 1 Render, 2 Ton, 3 Prüfung, 4 Buffer
function produktionsStufe(d) {
  const x = d.daten;
  if (["geplant", "gepostet"].includes(x.status)) return 5;
  const job = x.projekt ? S.render.auftraege.find((r) => r.projekt === x.projekt) : null;
  if (job) {
    if (job.status === "fertig") return /buffer|plan/i.test(x.fortschritt || "") ? 4 : 3;
    if (["ton", "mux", "verkleinern", "hochladen"].includes(job.phase)) return 2;
    return 1;
  }
  if (/buffer|einplan/i.test(x.fortschritt || "")) return 4;
  if (/prüf|abnahme|kontakt/i.test(x.fortschritt || "")) return 3;
  return 0;
}
const produktionsAnteil = (d) => Math.min(1, (produktionsStufe(d) + (d.daten.status === "uebergeben" ? 0 : 0.5)) / 5);
function produktionsTeil(d) {
  const st = produktionsStufe(d), x = d.daten;
  const kaputt = x.status === "fehler" ? Math.min(4, st) : -1;
  const stufen = [0, 1, 2, 3, 4].map((i) => i < st);
  const text = x.status === "fehler" ? "Fehler" : x.status === "rueckfrage" ? "Rückfrage" : x.status === "uebergeben" ? "wartet" : st >= 5 ? (x.status === "gepostet" ? "online" : "geplant") : ["baut", "rendert", "Ton", "prüft", "Buffer"][st];
  return `<div class="lk-teil ${x.status === "produktion" ? "jetzt" : ""}"><span class="stufen">${stufen.map((an, i) => `<i class="${i === kaputt ? "kaputt" : an ? "an" : i === st && x.status === "produktion" ? "jetzt" : ""}"></i>`).join("")}</span><span class="name" title="${esc(x.titel)}">${esc(SLOT_KURZ(d))} · ${esc(x.titel)}</span><small class="hinweis">${esc(text)}</small></div>`;
}

function renderAufgabe(r) {
  const konto = kontoZuProjekt(r.projekt, r);
  const live = S.live?.aktiv && S.live.projekt === r.projekt;
  const [f, g] = r.bilder || (live ? [S.live.nr || 0, S.live.anzahl || 0] : [0, 0]);
  const wartet = r.status === "wartet";
  const phase = { vorbereiten: "bereitet vor", rendern: "rendert", ton: "Ton-Mix", mux: "fügt zusammen", verkleinern: "verkleinert", hochladen: "lädt hoch", wartet: "wartet auf einen Rechner" }[r.phase] || r.phase || "";
  return {
    key: `render:${r.id}`, art: "render", status: wartet ? "wartet" : "laeuft", start: Date.parse(r.gestartet || r.erstellt || r.aktualisiert || "") || Date.now(),
    akzent: konto ? (kontoInfo(konto).klasse === "acc2" ? "var(--acc2)" : "var(--acc1)") : AKZENT.render,
    titel: `Render · ${titelZuProjekt(r.projekt)}`,
    unter: `${kontoChip(konto)}<span>${esc(r.rechner || "noch kein Rechner")}</span><span>${esc(phase)}</span>`,
    werte: [["Bilder", g ? `${zahl(f)} / ${zahl(g)}` : "–"], [live ? "Tempo" : "Rest", live ? `${String(S.live.fps || 0).replace(".", ",")} B/s` : r.rest_min != null ? `${String(r.rest_min).replace(".", ",")} Min.` : "–"], ["Phase", r.phase || "–"]],
    fortschritt: wartet ? null : r.prozent ? r.prozent / 100 : g ? f / g : null, prozentText: wartet ? "" : `${Math.round(r.prozent || (g ? (f / g) * 100 : 0))} %`,
    render: { projekt: r.projekt, live, bild: live ? S.live.bild : null, f, g },
    text: wartet ? "Wartet auf einen freien Render-Rechner" : "",
    schritte: (S.renderlog.auftrag === r.id ? S.renderlog.zeilen.filter((z) => !/warning|X\d{4}:/i.test(z)).slice(-3) : []).map((z) => ({ nr: `${r.id}-${z}`, icon: "▸", text: z.replace(/^\d\d:\d\d:\d\d\s*/, "") })),
  };
}

// Countdown-Karten der Automatik
function countdownAufgaben() {
  const liste = [], a = automatik(), jetzt = Date.now();
  if (!automatikDa()) return liste; // älterer Server ohne Automatik: keine Countdowns vortäuschen
  if (a.recherche) {
    const gruppen = new Map();
    for (const d of doks("skripte")) if (d.daten.status === "gewaehlt" && d.daten.auto_recherche_ab) {
      const k = `${d.daten.konto}|${d.daten.datum}`;
      (gruppen.get(k) || gruppen.set(k, []).get(k)).push(d);
    }
    for (const [k, docs] of gruppen) {
      const [konto, datum] = k.split("|");
      const bis = docs.map((d) => d.daten.auto_recherche_ab).sort()[0];
      liste.push({
        key: `auto-recherche:${k}`, art: "countdown", status: "countdown", akzent: AKZENT.countdown, bis, gesamt: docs.length >= 2 ? 15 : 180,
        titel: "Recherche startet gleich", unter: `${kontoChip(konto)}<span>${tagLabel(datum)} · ${esc(docs.map((d) => d.daten.titel).join(" · "))}</span>`,
        knoepfe: `<button class="knopf klein haupt-knopf" data-auto="automatik_jetzt" data-konto="${konto}" data-datum="${datum}">Jetzt starten</button><button class="knopf klein" data-auto="automatik_halt" data-konto="${konto}" data-datum="${datum}">Warten</button><button class="knopf klein" data-studio="${konto}|${datum}">Ansehen</button>`,
        text: docs.length >= 2 ? "Beide Slots gewählt" : "Wartet, ob du noch den zweiten Slot wählst",
      });
    }
  }
  if (a.produktion && !S.claude?.produktion?.laeuft) {
    const tage = new Map();
    for (const d of doks("skripte")) if (d.daten.status === "freigegeben" && (d.daten.auto_produktion_ab || d.daten.auto_produktion_wartet)) (tage.get(d.daten.datum) || tage.set(d.daten.datum, []).get(d.daten.datum)).push(d);
    for (const [datum, docs] of tage) {
      const wartetAuf = docs.find((d) => d.daten.auto_produktion_wartet)?.daten.auto_produktion_wartet;
      const bis = docs.map((d) => d.daten.auto_produktion_ab).filter(Boolean).sort().at(-1);
      liste.push({
        key: `auto-produktion:${datum}`, art: "countdown", status: wartetAuf ? "wartet" : "countdown", akzent: AKZENT.countdown, bis: wartetAuf ? null : bis, gesamt: 60,
        titel: wartetAuf ? "Produktion wartet" : "Produktion startet gleich", unter: `<span>${tagLabel(datum)} · ${docs.length} freigegeben</span>`,
        text: wartetAuf || "Zeit zum Zurücknehmen",
        knoepfe: `<button class="knopf klein haupt-knopf" data-uebergeben="${datum}">Jetzt übergeben</button>`,
      });
    }
  }
  // Neue Versuche: je Konto, Tag und Phase eine Karte (eine Recherche für beide Slots ist ein Auftrag)
  if (a.wiederholen) {
    const gruppen = new Map();
    for (const d of doks("skripte")) {
      const bis = wiederholungAb(d);
      if (!bis) continue;
      const k = `${d.daten.konto}|${d.daten.datum}|${d.daten.fehler_phase}`;
      (gruppen.get(k) || gruppen.set(k, []).get(k)).push({ d, bis });
    }
    const PHASE = { recherche: "Recherche", produktion: "Produktion", nachpruefen: "Nachprüfung" };
    for (const [k, eintraege] of gruppen) {
      const [konto, datum, phase] = k.split("|");
      const bis = eintraege.map((x) => x.bis).sort().at(-1);
      const titel = eintraege.map((x) => x.d.daten.titel).join(" · ");
      liste.push({
        key: `auto-wiederholen:${k}`, art: "countdown", status: "countdown", akzent: "var(--fehler)", bis, gesamt: S.wiederholen_nach_s || 300,
        titel: limitJetzt() ? `Wartet auf Limit bis ${uhrzeitVon(limitJetzt().weiter_ab)}: ${PHASE[phase] || phase}` : `Neuer Versuch: ${PHASE[phase] || phase}`, unter: `${kontoChip(konto)}<span>${tagLabel(datum)} · ${esc(titel)}</span>`,
        text: String(eintraege[0].d.daten.fehler || "abgebrochen").slice(0, 140),
        knoepfe: eintraege.map((x, i) => `<button class="knopf klein ${i ? "" : "haupt-knopf"}" data-erneut="${x.d.id}">${eintraege.length > 1 ? `Jetzt erneut: ${esc(SLOT_NAME[x.d.daten.slot] || x.d.id)}` : "Jetzt erneut"}</button>`).join(""),
      });
    }
  }
  return liste.map((x) => ({ ...x, restMs: x.bis ? Date.parse(x.bis) - jetzt : null }));
}

function alleAufgaben() {
  const liste = [];
  for (const r of S.render.auftraege) if ((r.status === "laeuft" && !haengt(r)) || r.status === "wartet") liste.push(renderAufgabe(r));
  const c = S.claude || {};
  if (c.laeuft && c.aktiv && STUDIO_ARTEN.has(c.aktiv.art)) liste.push(claudeAufgabe("chat", c.aktiv));
  if (c.produktion?.laeuft) liste.push(claudeAufgabe("produktion", { art: c.produktion.art, titel: c.produktion.titel, datum: c.produktion.datum, konto: c.produktion.konto, ids: c.produktion.ids, start: c.produktion.start }));
  // Wartende Aufträge der Studio- und Produktionsspur
  const wartend = c.wartend_info ? [...c.wartend_info, ...(c.produktion?.wartend_info || [])] : [...(c.wartend || []).map((t) => ({ titel: t, art: t.startsWith("10 Ideen") ? "ideen" : /^(Skripte|Neufassung)/.test(t) ? "skripte" : "" })), ...(c.produktion?.wartend || []).map((t) => ({ titel: t, art: String(t).startsWith("Nachprüfung") ? "nachpruefen" : "produktion" }))];
  wartend.forEach((w, i) => {
    const art = w.art === "produktion" || w.art === "nachpruefen" ? w.art : w.art;
    if (!STUDIO_ARTEN.has(art) && !PROD_ARTEN.has(art)) return;
    liste.push({ key: `wartet:${art}:${w.titel}`, art, status: "wartet", akzent: AKZENT.wartet, titel: w.titel, unter: `<span>wartet · Platz ${i + 1}</span>${kontoChip(w.konto)}`, fortschritt: null, text: "Startet, sobald Claude frei ist" });
  });
  return [...liste, ...countdownAufgaben()];
}

// ───────── Karten bauen und aktualisieren ─────────
const LK = { karten: new Map(), gesehenErledigt: new Set(), erstesMal: true };
const HAKEN = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24"/><path d="M21 33l8 8 15-17"/></svg>';
const KREUZ = '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="24"/><path d="M24 24l16 16M40 24 24 40"/></svg>';

function karteBauen(a) {
  const huelle = document.createElement("div");
  huelle.className = `lk-huelle${LK.erstesMal ? "" : " neu"}`;
  huelle.dataset.key = a.key;
  const [sym, anim] = SYMBOL[a.art] || ["uhr", ""];
  huelle.innerHTML = `<div class="lk">
    <div class="lk-innen">
      <div class="lk-kopf">
        <div class="lk-symbol ${anim}" data-f="symbol">${a.status === "countdown" ? "" : ico(sym)}</div>
        <div class="lk-titel"><b data-f="titel"></b><small data-f="unter"></small></div>
        <div class="lk-zeit"><span data-f="zeit"></span><small data-f="zeitlabel"></small></div>
      </div>
      <div class="lk-koerper" data-f="koerper"><div class="lk-werte" data-f="werte"></div></div>
      <div class="lk-teile" data-f="teile"></div>
      <div class="lk-fortschritt" data-f="fortschritt"><div class="balken"><i></i></div><span class="lk-prozent" data-f="prozent"></span></div>
      <div class="lk-schritte" data-f="schritte"></div>
      <div class="lk-knoepfe" data-f="knoepfe"></div>
    </div>
    <div class="lk-haken"></div>
  </div>`;
  const k = { huelle, lk: huelle.firstElementChild, f: {}, werte: new Map(), schritte: [], art: a.art, status: a.status, start: a.start, titel: a.titel, zuletzt: Date.now() };
  huelle.querySelectorAll("[data-f]").forEach((el) => (k.f[el.dataset.f] = el));
  if (a.render) {
    const h = document.createElement("div");
    h.className = "lk-handy";
    h.innerHTML = '<div class="lk-handy-bild"><img alt=""><img alt=""><canvas></canvas></div>';
    k.f.koerper.prepend(h);
    k.handy = { imgs: [...h.querySelectorAll("img")], canvas: h.querySelector("canvas"), aktiv: 0, src: "", letzte: 0 };
  }
  return k;
}

function karteAktualisieren(k, a) {
  k.zuletzt = Date.now();
  k.status = a.status;
  k.titel = a.titel;
  k.lk.className = `lk ${a.status}`;
  k.huelle.style.order = { laeuft: 0, countdown: 1, wartet: 2 }[a.status] ?? 1; // Laufendes zuerst
  k.lk.style.setProperty("--akzent", a.akzent || AKZENT.skripte);
  if (k.f.titel.textContent !== a.titel) { k.f.titel.textContent = a.titel; k.f.titel.title = a.titel; }
  htmlSetzen(k.f.unter, a.unter || "");
  // Zeit: Countdown, sonst Laufzeit
  if (a.status === "countdown" && a.bis) {
    if (!k.ring) {
      k.f.symbol.innerHTML = '<svg class="countdown-ring" viewBox="0 0 36 36"><circle class="bahn" cx="18" cy="18" r="16"/><circle class="wert" cx="18" cy="18" r="16"/></svg>';
      k.ring = k.f.symbol.querySelector(".wert");
    }
    k.ring.dataset.ringBis = a.bis;
    k.ring.dataset.ringGesamt = a.gesamt || 60;
    k.f.zeit.dataset.bis = a.bis;
    delete k.f.zeit.dataset.seit;
    k.f.zeitlabel.textContent = "startet in";
  } else {
    delete k.f.zeit.dataset.bis;
    if (a.status === "laeuft" && a.start) { k.f.zeit.dataset.seit = new Date(a.start).toISOString(); k.f.zeitlabel.textContent = "läuft seit"; }
    else { delete k.f.zeit.dataset.seit; k.f.zeit.textContent = ""; k.f.zeitlabel.textContent = a.status === "wartet" ? "wartet" : ""; }
  }
  zeitFeld(k.f.zeit);
  if (k.ring) ringFeld(k.ring);

  // Werte (geänderte zucken kurz)
  const werte = a.werte || [];
  k.f.werte.hidden = !werte.length;
  if (k.f.werte.children.length !== werte.length) { k.f.werte.innerHTML = werte.map(() => '<div class="lk-wert"><small></small><b></b></div>').join(""); k.werte.clear(); }
  werte.forEach(([name, wert], i) => {
    const el = k.f.werte.children[i];
    el.firstChild.textContent = name;
    const neu = String(wert);
    if (el.lastChild.textContent !== neu) {
      const vorher = el.lastChild.textContent;
      el.lastChild.textContent = neu;
      if (vorher && !document.hidden) { el.lastChild.classList.remove("zuckt"); void el.lastChild.offsetWidth; el.lastChild.classList.add("zuckt"); }
    }
  });
  htmlSetzen(k.f.teile, a.teile?.join("") || "");
  k.f.teile.hidden = !a.teile?.length;

  // Fortschritt
  const zeigen = a.status === "laeuft";
  k.f.fortschritt.hidden = !zeigen;
  if (zeigen) {
    const balken = k.f.fortschritt.firstChild;
    balken.classList.toggle("unbestimmt", a.fortschritt == null);
    if (a.fortschritt != null) balken.firstChild.style.width = `${Math.max(2, Math.min(100, a.fortschritt * 100))}%`;
    k.f.prozent.textContent = a.prozentText || (a.fortschritt != null ? `${Math.round(a.fortschritt * 100)} %` : "");
  }

  // Schritte: der neueste rutscht herein; dazu der aktuelle Punkt aus Claudes Aufgabenplan
  const schritte = [...(a.schritte || [])];
  if (a.jetzt) schritte.push({ nr: `plan:${a.jetzt}`, icon: "◐", text: a.jetzt });
  if (!schritte.length && a.text) schritte.push({ nr: `text:${a.text}`, icon: "ℹ", text: a.text });
  const nrs = schritte.map((s) => String(s.nr));
  if (nrs.join("|") !== k.schritte.join("|")) {
    const alt = new Set(k.schritte);
    k.f.schritte.innerHTML = schritte.map((s) => `<div class="lk-schritt ${alt.has(String(s.nr)) || k.schritte.length === 0 && LK.erstesMal ? "" : "neu"}"><span class="s-icon">${esc(s.icon)}</span><span>${esc(s.text)}</span></div>`).join("");
    k.schritte = nrs;
  }
  k.f.schritte.hidden = !schritte.length;
  htmlSetzen(k.f.knoepfe, a.knoepfe || "");
  k.f.knoepfe.hidden = !a.knoepfe;

  // Wartender Render: kompakt, ohne Handy und Werte
  k.f.koerper.hidden = a.art === "render" && a.status === "wartet";
  if (a.render && k.handy && !k.f.koerper.hidden) handyBild(k, a.render);
}

// Kleines Handy in der Render-Karte: Live-Bild vom Laptop (höchstens 2 je Sekunde) oder Bild-Raster
function handyBild(k, r) {
  const h = k.handy;
  if (r.live && r.bild) {
    const src = `/api/bild?p=${encodeURIComponent(r.projekt)}&f=${encodeURIComponent(r.bild)}`;
    if (src === h.src || performance.now() - h.letzte < 480 || document.hidden) return;
    h.src = src; h.letzte = performance.now();
    const neu = h.imgs[1 - h.aktiv], alt = h.imgs[h.aktiv];
    neu.onload = () => { neu.classList.add("sichtbar"); alt.classList.remove("sichtbar"); h.aktiv = 1 - h.aktiv; h.canvas.classList.remove("sichtbar"); };
    neu.src = src;
  } else {
    h.imgs.forEach((i) => i.classList.remove("sichtbar"));
    h.canvas.classList.add("sichtbar");
    const zeichen = `${r.f}/${r.g}`;
    if (h.raster !== zeichen) { h.raster = zeichen; requestAnimationFrame(() => rasterZeichnen(h.canvas, r.f, r.g || 100)); }
  }
}

// Ergebnis einer verschwundenen Aufgabe: ok, Fehler oder nichts zu melden
function ergebnisVon(k) {
  if (k.status !== "laeuft") return null;
  if (k.art === "render") {
    const id = k.huelle.dataset.key.slice(7);
    const r = S.render.auftraege.find((x) => x.id === id);
    return { ok: !r || r.status === "fertig", text: k.titel };
  }
  const [spur] = k.huelle.dataset.key.split(":");
  const ende = S.feed.filter((e) => (e.art === "fertig" || e.art === "fehler") && (e.job ? e.job === k.huelle.dataset.key : (spur === "produktion") === istProduktion(e) && Date.parse(e.zeit) >= k.start)).at(-1);
  const ok = ende ? ende.art === "fertig" && !/^Abgebrochen|NICHT erledigt/.test(ende.text || "") : true;
  return { ok, text: k.titel };
}

function kartenZeichnen() {
  const aufgaben = alleAufgaben();
  const raster = $("live-karten");
  const da = new Set();
  for (const a of aufgaben) {
    da.add(a.key);
    let k = LK.karten.get(a.key);
    if (!k) {
      k = karteBauen(a);
      LK.karten.set(a.key, k);
      raster.append(k.huelle);
    }
    karteAktualisieren(k, a);
  }
  // Verschwundene Aufgaben: Haken bzw. Kreuz, dann wegklappen
  for (const [key, k] of LK.karten) {
    if (da.has(key) || k.geht) continue;
    k.geht = true;
    const erg = Date.now() - k.zuletzt < 90000 ? ergebnisVon(k) : null;
    if (erg) {
      k.lk.classList.remove("laeuft");
      k.lk.classList.add(erg.ok ? "fertig" : "misslungen");
      k.lk.querySelector(".lk-haken").innerHTML = erg.ok ? HAKEN : KREUZ;
      setTimeout(() => wegklappen(key, k), 2300);
    } else wegklappen(key, k, true);
  }
  LK.erstesMal = false;
  const laeuft = aufgaben.filter((a) => a.status === "laeuft").length;
  $("laeuft-led").className = `led ${laeuft ? "laeuft" : "an"}`;
  $("laeuft-info").textContent = laeuft ? `${laeuft} aktiv${aufgaben.length > laeuft ? ` · ${aufgaben.length - laeuft} wartet` : ""}` : aufgaben.length ? `${aufgaben.length} wartet` : "";
  $("ruhe").hidden = LK.karten.size > 0;
  if (!LK.karten.size) ruheZeichnen();
}
function wegklappen(key, k, sofort = false) {
  k.huelle.classList.add("weg");
  setTimeout(() => { k.huelle.remove(); LK.karten.delete(key); if (!LK.karten.size) planen("jetzt"); }, sofort ? 450 : 600);
}
$("live-karten").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.auto) await studioAktion(b.dataset.auto, { konto: b.dataset.konto, datum: b.dataset.datum });
  else if (b.dataset.uebergeben) await studioAktion("uebergeben", { datum: b.dataset.uebergeben });
  else if (b.dataset.erneut) await studioAktion("erneut", { id: b.dataset.erneut });
  else if (b.dataset.studio) { const [konto, datum] = b.dataset.studio.split("|"); studioTag(konto, datum); }
});

function ruheZeichnen() {
  const a = automatik(), n = naechstesPosting();
  const zeilen = [];
  if (n) zeilen.push(`Nächstes Posting: <b>${esc(kontoInfo(n.konto).name)}</b> um ${slotZeit(n.datum, n.slot)}${n.datum !== S.heute ? ` (${tagLabel(n.datum)})` : ""}`);
  if (automatikDa() && a.ideen) {
    const fehlen = Object.keys(PRAEFIX).filter((k) => !doks("ideen").some((d) => d.id === `${PRAEFIX[k]}-${morgen()}`));
    if (fehlen.length && S.einstellungen?.automatik_ideen_zuletzt !== S.heute) zeilen.push(`Ideen für morgen kommen automatisch ab ${esc(a.ideen_uhrzeit)} Uhr`);
  }
  if (S.einstellungen?.lernschleife_aktiv) zeilen.push("Lernschleife um 19:52");
  if (limitJetzt()) zeilen.unshift(`<b>Claude wartet auf Limit bis ${esc(uhrzeitVon(limitJetzt().weiter_ab))}</b>, danach geht es von selbst weiter`);
  htmlSetzen($("ruhe"), `<span class="led an"></span><div><b>Gerade läuft nichts.</b><small>${zeilen.join(" · ") || "Alles erledigt."}</small></div>`);
}

// ───────── Für dich ─────────
function fuerDich() {
  const liste = [];
  const a = automatik();
  // Nutzungslimit von Claude: nur zur Information (das Cockpit macht danach von selbst weiter)
  const limit = limitJetzt();
  if (limit) liste.push({ prio: 0.5, art: "", icon: "⏳", titel: `Claude wartet auf Limit bis ${uhrzeitVon(limit.weiter_ab)}`, text: "Nutzungslimit erreicht. Danach setzt das Cockpit von selbst fort, du musst nichts tun.", knopf: "" });
  const gesendet = new Set((ZS.zahlen?.posts || []).flatMap((p) => [p.post_id, p.projekt]).filter(Boolean));
  for (const d of doks("skripte")) {
    const x = d.daten;
    const wo = `${KONTO_NAME[x.konto] || ""} · ${tagLabel(x.datum)} ${SLOT_NAME[x.slot] || ""}`;
    // Vergangene Tage (Ausbau 10.11.): Ungelöstes bleibt sichtbar, neueste zuerst: Fehler, Rückfragen, nie gepostete Videos.
    // „Abhaken“ nimmt einen erledigten Altfall heraus.
    if (x.datum < S.heute) {
      if (x.abgehakt || (S.einstellungen?.studio_ab && x.datum < S.einstellungen.studio_ab)) continue;
      const alter = 1 + (Date.parse(`${S.heute}T12:00:00Z`) - Date.parse(`${x.datum}T12:00:00Z`)) / 86400000 / 100; // neueste zuerst
      const knoepfe = `<button class="knopf klein" data-oeffnen="${d.id}">Ansehen</button><button class="knopf klein" data-abhaken="${d.id}" title="Erledigt: nicht mehr anzeigen">Abhaken</button>`;
      const istOnline = gesendet.has(x.post_id) || gesendet.has(x.buffer_post_id) || gesendet.has(x.projekt);
      if (x.status === "fehler") liste.push({ prio: 5 + alter, art: "problem", alt: true, icon: "⚠️", titel: `Fehler vom ${tagLabel(x.datum)}: ${x.titel}`, text: x.fehler || wo, knopf: `${x.fehler_phase === "nachpruefen" ? `<button class="knopf klein" data-erneut="${d.id}">Nachprüfung wiederholen</button>` : ""}${knoepfe}` });
      else if (x.status === "rueckfrage") liste.push({ prio: 5 + alter, art: "wichtig", alt: true, icon: "❓", titel: `Rückfrage vom ${tagLabel(x.datum)}: ${x.titel}`, text: x.fehler || wo, knopf: knoepfe });
      else if (x.status === "geplant" && !istOnline && Date.now() - (Date.parse(x.geplant_fuer || "") || Date.parse(`${x.datum}T23:00:00Z`)) > 3 * 3600000) liste.push({ prio: 5 + alter, art: "problem", alt: true, icon: "📭", titel: `Nicht bestätigt vom ${tagLabel(x.datum)}: ${x.titel}`, text: `${wo} · geplant, aber weder nachgeprüft noch in den Zahlen`, knopf: knoepfe });
      else if (!["geplant", "gepostet"].includes(x.status)) liste.push({ prio: 5 + alter, art: "problem", alt: true, icon: "📭", titel: `Nie gepostet vom ${tagLabel(x.datum)}: ${x.titel}`, text: `${wo} · blieb bei „${STATUS_NAME[x.status] || x.status}“ stehen`, knopf: knoepfe });
      continue;
    }
    if (x.status === "skript_fertig") liste.push({ prio: 1, art: "wichtig", icon: "📜", titel: `Skript prüfen: ${x.titel}`, text: wo, knopf: `<button class="knopf klein haupt-knopf" data-oeffnen="${d.id}">Lesen und freigeben</button>` });
    else if (x.status === "rueckfrage") liste.push({ prio: 0, art: "wichtig", icon: "❓", titel: `Rückfrage: ${x.titel}`, text: x.fehler || wo, knopf: `<button class="knopf klein haupt-knopf" data-oeffnen="${d.id}">Ansehen</button>` });
    else if (x.status === "fehler" && !wiederholungAb(d)) liste.push({ prio: 0, art: "problem", icon: "⚠️", titel: `Fehler: ${x.titel}`, text: x.fehler || wo, knopf: `<button class="knopf klein" data-erneut="${d.id}">Erneut versuchen</button><button class="knopf klein" data-oeffnen="${d.id}">Ansehen</button>` });
  }
  // Ideen für morgen wählen bzw. erzeugen
  const tag = morgen();
  if (!S.einstellungen?.studio_ab || tag >= S.einstellungen.studio_ab) for (const konto of Object.keys(PRAEFIX)) {
    const ideen = doks("ideen").find((d) => d.id === `${PRAEFIX[konto]}-${tag}`);
    const gewaehlt = ["mittag", "abend"].filter((s) => skriptDok(slotIdVon(konto, tag, s))).length;
    if (ideenLaufen(konto, tag) || gewaehlt >= 2) continue;
    if (ideen) liste.push({ prio: 2, art: "", icon: "💡", titel: `Ideen wählen: ${KONTO_NAME[konto]}`, text: `${tagLabel(tag)} · ${gewaehlt}/2 gewählt`, knopf: `<button class="knopf klein" data-studio="${konto}|${tag}">Zum Studio</button>` });
    else if (!automatikDa() || !a.ideen || S.einstellungen?.automatik_ideen_zuletzt === S.heute) liste.push({ prio: 3, art: "", icon: "💡", titel: `Noch keine Ideen: ${KONTO_NAME[konto]}`, text: tagLabel(tag), knopf: `<button class="knopf klein" data-ideen="${konto}|${tag}">10 Ideen erzeugen</button>` });
  }
  for (const v of S.db?.vorschlaege || []) if (["offen", "probe"].includes(v.daten.status)) liste.push({ prio: 4, art: "", icon: "🧠", titel: `Vorschlag: ${v.daten.titel}`, text: v.daten.status === "probe" ? "Probebilder ansehen" : "wartet auf deine Entscheidung", knopf: `<button class="knopf klein" data-seite-ziel="lernen">Ansehen</button>` });
  if (S.einstellungen?.autonomie?.frage_offen) liste.push({ prio: 1, art: "wichtig", icon: "⏰", titel: "Testwoche vorbei: Wie geht es weiter?", text: "Selbständigkeit der Verbesserungen", knopf: `<button class="knopf klein" data-seite-ziel="lernen">Entscheiden</button>` });
  const tagMs = Date.now() - 24 * 3600000;
  for (const r of S.render.auftraege) if ((r.status === "fehler" || r.status === "keine_gpu" || haengt(r)) && Date.parse(r.aktualisiert || r.erstellt || 0) > tagMs) liste.push({ prio: 2, art: "problem", icon: "🎬", titel: `Render-Problem: ${titelZuProjekt(r.projekt)}`, text: haengt(r) ? `${r.rechner} offline` : r.fehler || r.status, knopf: `<button class="knopf klein" data-seite-ziel="produktion">Ansehen</button>` });
  if (DIENST.zustand && ["fremd", "fehler"].includes(DIENST.zustand.status)) liste.push({ prio: 2, art: "problem", icon: "🛠️", titel: "Render-Dienst braucht dich", text: DIENST.zustand.hinweis || DIENST.zustand.status, knopf: `<button class="knopf klein" data-seite-ziel="produktion">Ansehen</button>` });
  if (S.claude?.cli === false) liste.push({ prio: 0, art: "problem", icon: "🤖", titel: "Claude Code fehlt auf diesem Rechner", text: "Ohne Claude laufen keine Aufträge", knopf: `<button class="knopf klein" data-claude>Anleitung</button>` });
  return liste.sort((x, y) => x.prio - y.prio);
}
function fuerDichZeichnen() {
  const liste = fuerDich();
  $("punkt-jetzt").hidden = !liste.filter((x) => x.art).length;
  $("punkt-jetzt").textContent = liste.filter((x) => x.art).length;
  $("fuer-dich-info").textContent = liste.length ? `${liste.length} offen` : "";
  htmlSetzen($("fuer-dich"), liste.length
    ? liste.slice(0, 14).map((t, i) => `<div class="todo ${t.art} ${t.alt ? "alt" : ""}" style="animation-delay:${i * 40}ms"><span class="todo-icon">${t.icon}</span><div><b title="${esc(t.titel)}">${esc(t.titel)}</b><small title="${esc(t.text)}">${esc(t.text)}</small></div><div class="slot-knoepfe" style="margin:0">${t.knopf}</div></div>`).join("")
    : `<div class="alles-erledigt"><svg viewBox="0 0 24 24">${ICO.haken}</svg><div><b>Nichts wartet auf dich.</b><br><small class="hinweis">Neues erscheint hier, sobald du gebraucht wirst.</small></div></div>`);
  return liste;
}
$("fuer-dich").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.oeffnen) studioOeffnen(b.dataset.oeffnen);
  else if (b.dataset.erneut) await studioAktion("erneut", { id: b.dataset.erneut });
  else if (b.dataset.abhaken) await studioAktion("abhaken", { id: b.dataset.abhaken });
  else if (b.dataset.studio) { const [konto, datum] = b.dataset.studio.split("|"); studioTag(konto, datum); }
  else if (b.dataset.ideen) { const [konto, datum] = b.dataset.ideen.split("|"); const r = await studioAktion("ideen", { konto, datum }); if (r) toast("💡", "Ideen angefordert", r.hinweis || ""); }
  else if (b.dataset.seiteZiel) seiteZeigen(b.dataset.seiteZiel);
  else if (b.dataset.claude !== undefined) claudeOffen(true);
});

// ───────── Tagesplan (heute und morgen) ─────────
function slotStufen(d) {
  // 0 Idee · 1 Skript · 2 Freigabe · 3 Produktion · 4 Online
  const x = d.daten, k = Array(5).fill("");
  const an = (n) => { for (let i = 0; i < n; i++) k[i] = "an"; };
  switch (x.status) {
    case "gewaehlt": an(1); break;
    case "recherche": an(1); k[1] = "jetzt"; break;
    case "skript_fertig": an(2); k[2] = "dran"; break;
    case "freigegeben": an(3); break;
    case "uebergeben": an(3); k[3] = "dran"; break;
    case "produktion": an(3); k[3] = "jetzt"; break;
    case "rueckfrage": an(3); k[3] = "kaputt"; break;
    case "geplant": an(4); k[4] = "dran"; break;
    case "gepostet": an(5); break;
    case "fehler": { const i = { recherche: 1, produktion: 3, nachpruefen: 4 }[x.fehler_phase] ?? 1; an(i); k[i] = "kaputt"; break; }
  }
  return k;
}
function tagesplanZeichnen() {
  const tage = [[S.heute, "Heute"], [morgen(), "Morgen"]];
  htmlSetzen($("tagesplan"), tage.map(([tag, name]) => {
    const zellen = Object.keys(PRAEFIX).flatMap((konto) => ["mittag", "abend"].map((slot) => {
      const id = slotIdVon(konto, tag, slot);
      const d = skriptDok(id);
      const proto = !d && (S.plan.protokoll || []).find((z) => z.datum === tag && z.slot === slot && kontoInfo(z.konto).klasse === PRAEFIX[konto]);
      const status = d ? STATUS_NAME[d.daten.status] || d.daten.status : proto ? proto.status : "frei";
      const titel = d?.daten.titel || proto?.titel || "noch frei";
      const stufen = d ? slotStufen(d) : proto ? Array(5).fill("an").map((s, i) => (i === 4 && proto.status !== "gepostet" ? "dran" : s)) : Array(5).fill("");
      const arbeitet = stufen.includes("jetzt");
      return `<div class="tp-slot ${PRAEFIX[konto]} ${d || proto ? "" : "frei"} ${arbeitet ? "arbeitet" : ""}" data-tp="${d ? id : `${konto}|${tag}`}" title="${esc(titel)}">
        <div class="tp-slot-kopf"><b>${KONTO_NAME[konto]}</b><span>${slotZeit(tag, slot)} · ${esc(status)}</span></div>
        <div class="tp-slot-titel">${esc(titel)}</div>
        <div class="stufen">${stufen.map((s) => `<i class="${s}"></i>`).join("")}</div>
      </div>`;
    })).join("");
    const fertig = Object.keys(PRAEFIX).flatMap((konto) => ["mittag", "abend"].map((s) => skriptDok(slotIdVon(konto, tag, s)))).filter((d) => d && FERTIG_STATUS.has(d.daten.status)).length;
    return `<div class="tp-tag"><h3>${name} <span class="hinweis">${tagLabel(tag)} · ${fertig}/4 geplant</span></h3><div class="tp-raster">${zellen}</div></div>`;
  }).join(""));
}
$("tagesplan").addEventListener("click", (e) => {
  const z = e.target.closest("[data-tp]");
  if (!z) return;
  if (z.dataset.tp.includes("|")) { const [konto, datum] = z.dataset.tp.split("|"); studioTag(konto, datum); }
  else studioOeffnen(z.dataset.tp);
});

// ───────── Aktivität, Erledigt, Konten ─────────
function aktivitaetZeichnen() {
  const el = $("aktivitaet");
  htmlSetzen(el, AKT.length
    ? AKT.slice(0, 40).map((x) => `<div class="akt ${x.neu ? "neu" : ""}"><time>${x.zeit.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</time><span>${esc(x.icon)}</span><span title="${esc(x.text)}">${esc(x.text)}</span></div>`).join("")
    : '<div class="leer">Noch nichts passiert seit dem Start.</div>');
  AKT.forEach((x) => (x.neu = false));
}
function erledigtListe() {
  const heute = S.heute;
  const tagVon = (iso) => new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Berlin" }).slice(0, 10);
  const liste = [];
  for (const e of S.feed) {
    if (!(e.art === "fertig" || (e.art === "fehler" && istProduktion(e))) || tagVon(e.zeit) !== heute) continue;
    const text = String(e.text || "");
    if (!istProduktion(e) && !text.startsWith("Erledigt:")) continue; // Chat-Antworten zählen nicht
    if (/^Sitzung beendet/.test(text.replace(/^🏭\s*/, ""))) continue;
    liste.push({ key: `f${e.nr}`, zeit: Date.parse(e.zeit), ok: e.art === "fertig" && !/NICHT erledigt|^Abgebrochen/.test(text), text: text.replace(/^🏭\s*/, "").replace(/^Erledigt:\s*/, "").split("\n")[0], dauer: e.dauer_s });
  }
  for (const r of S.render.auftraege) if (r.status === "fertig" && tagVon(r.aktualisiert || r.erstellt || 0) === heute) liste.push({ key: `r${r.id}`, zeit: Date.parse(r.aktualisiert || r.erstellt), ok: true, text: `Render fertig: ${titelZuProjekt(r.projekt)}`, dauer: r.renderzeit?.gesamt_s });
  return liste.sort((a, b) => b.zeit - a.zeit);
}
function erledigtZeichnen() {
  const liste = erledigtListe();
  $("erledigt-info").textContent = liste.length ? `${liste.filter((x) => x.ok).length} erledigt` : "";
  const html = liste.length ? liste.slice(0, 30).map((x) => {
    const neu = !LK.gesehenErledigt.has(x.key) && LK.gesehenErledigt.size > 0;
    return `<div class="erl ${neu ? "neu" : ""}"><span class="${x.ok ? "ok" : "nein"}">${x.ok ? "✓" : "✕"}</span><span title="${esc(x.text)}">${esc(x.text)}</span><small>${new Date(x.zeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</small></div>`;
  }).join("") : '<div class="leer">Heute noch nichts abgeschlossen.</div>';
  htmlSetzen($("erledigt"), html);
  if (!LK.gesehenErledigt.size) LK.gesehenErledigt.add("_start");
  liste.forEach((x) => LK.gesehenErledigt.add(x.key));
}
function kontenMiniZeichnen() {
  const z = ZS.zahlen;
  htmlSetzen($("konten-mini"), Object.entries(KANAL_NAME).map(([kanal, name]) => {
    const p = z?.profile?.[kanal];
    const plus = plusHeute(kanal);
    return `<div class="km ${KONTO_KLASSE[kanal]}"><div><small>${name}</small><b>${p ? zahl(p.follower) : "–"}</b></div><span class="plus">${plus ? `${plus > 0 ? "+" : ""}${zahl(plus)} heute` : ""}</span></div>`;
  }).join(""));
}

function jetztZeichnen() {
  kartenZeichnen();
  const offenN = fuerDichZeichnen().filter((x) => x.art).length;
  tagesplanZeichnen();
  aktivitaetZeichnen();
  erledigtZeichnen();
  kontenMiniZeichnen();
  const laeuft = [...LK.karten.values()].filter((k) => k.status === "laeuft").length;
  if (S.seite === "jetzt") $("seiten-unter").textContent = `${laeuft ? `${laeuft} Aufgabe${laeuft === 1 ? "" : "n"} in Arbeit` : "nichts in Arbeit"}${offenN ? ` · ${offenN} warte${offenN === 1 ? "t" : "n"} auf dich` : ""}`;
}
// Zählpunkt „Jetzt“ auch auf anderen Seiten aktuell halten
zeichner("*", () => {
  if (S.seite !== "jetzt") { const n = fuerDich().filter((x) => x.art).length; $("punkt-jetzt").hidden = !n; $("punkt-jetzt").textContent = n; }
  document.querySelector('#nav a[data-seite="jetzt"]').classList.toggle("arbeitet", alleAufgaben().some((a) => a.status === "laeuft"));
});
zeichner("jetzt", jetztZeichnen);
document.addEventListener("cockpit:feed", (e) => {
  if (e.detail.art === "automatik") aktivitaet("⚙", e.detail.text);
  if (["werkzeug", "fertig", "fehler", "automatik"].includes(e.detail.art)) planen("jetzt");
});
// Countdowns laufen ab: Karten dann neu bewerten (der Server startet die Aufgabe, die Karte wechselt)
setInterval(() => { if (S.seite === "jetzt" && [...LK.karten.values()].some((k) => k.status === "countdown")) planen("jetzt"); }, 5000);
