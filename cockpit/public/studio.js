"use strict";
// Studio im Cockpit: Ideen wählen, Skripte lesen und freigeben, an Claude übergeben (ersetzt das Ideen-Studio).
// Nutzt S, $, esc, post, Ton, P, toast, mitte, lokal und slotZeit aus cockpit.js. Alle Regeln prüft der Server (lib/studio.mjs).

const ST = { tag: null, manuell: false, konto: lokal.lesen("studio-konto", "simulierbar"), slot: null };
const PRAEFIX = { simulierbar: "acc1", stelldirvor: "acc2" };
const KONTO_NAME = { simulierbar: "Simulierbar", stelldirvor: "Stell dir vor" };
const SLOT_NAME = { mittag: "Mittag", abend: "Abend" };
const STATUS_NAME = { gewaehlt: "gewählt", recherche: "Recherche läuft", skript_fertig: "Skript fertig", freigegeben: "freigegeben", uebergeben: "übergeben", produktion: "in Produktion", geplant: "geplant", gepostet: "online", rueckfrage: "Rückfrage", fehler: "Fehler" };
const STATUS_KLASSE = { recherche: "laeuft", uebergeben: "laeuft", produktion: "laeuft", skript_fertig: "acc1", freigegeben: "ok", geplant: "ok", gepostet: "ok", rueckfrage: "fehler", fehler: "fehler" };
const STUFE = { gewaehlt: 1, recherche: 1, skript_fertig: 2, rueckfrage: 2, freigegeben: 3, uebergeben: 4, produktion: 4, geplant: 5, gepostet: 5, fehler: 1 };
const FERTIG_STATUS = new Set(["geplant", "gepostet"]);
const AENDERBAR = new Set(["gewaehlt", "fehler"]);
const FELDER = {
  simulierbar: { offen: ["hook", "ergebnis_ansatz", "warum_relevant", "originalitaet"], mehr: ["feld", "zutat", "diskussion", "daten", "bildidee", "laender", "risiko"] },
  stelldirvor: { offen: ["ereignis", "messgroesse", "welt", "standpunkt", "originalitaet"], mehr: ["feld", "massstab", "zutat", "tageszeit_verlauf", "bewegung", "kamera", "zeitraffer", "hoehepunkt", "pointe", "diskussion", "daten", "laender", "risiko"] },
};
const FELD_NAME = { originalitaet: "Originalität", feld: "Themenfeld", zutat: "Zutat", massstab: "Maßstab", hook: "Hook", ergebnis_ansatz: "Ergebnis", warum_relevant: "Warum relevant", diskussion: "Diskussion", daten: "Daten", bildidee: "Bildidee", laender: "Länder", risiko: "Risiko", ereignis: "Ereignis", messgroesse: "Messgröße", welt: "Welt", standpunkt: "Standpunkt", tageszeit_verlauf: "Tageszeit", bewegung: "Bewegung", kamera: "Kamera", zeitraffer: "Zeitraffer", hoehepunkt: "Höhepunkt", pointe: "Pointe" };

// ───────── Daten ─────────

const doks = (s) => S.db?.[s] || [];
const skriptDok = (id) => doks("skripte").find((d) => d.id === id);
const slotIdVon = (konto, tag, slot) => `${PRAEFIX[konto]}-${tag}-${slot}`;
const wert = (v) => (Array.isArray(v) ? v.join("  gegen  ") : v && typeof v === "object" ? JSON.stringify(v) : String(v ?? ""));
const nurLesen = () => !!(S.einstellungen?.studio_ab && ST.tag < S.einstellungen.studio_ab);

function plusTage(datum, n) {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function tagLabel(datum) {
  return new Date(`${datum}T12:00:00Z`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" });
}
const slotsDesTages = (t) => doks("skripte").filter((d) => d.daten.datum === t);
const tagFertig = (t) => { const s = slotsDesTages(t); return s.length >= 4 && s.every((d) => FERTIG_STATUS.has(d.daten.status)); };
const tagAktiv = (t) => slotsDesTages(t).some((d) => d.daten.status !== "gewaehlt" && !FERTIG_STATUS.has(d.daten.status));

// Wie im Studio: heute, wenn heute etwas in Arbeit ist, sonst morgen; fertige Tage überspringen; nie vor studio_ab
function standardTag() {
  const ab = S.einstellungen?.studio_ab || "";
  let t = tagAktiv(S.heute) && S.heute >= ab ? S.heute : plusTage(S.heute, 1);
  if (ab && t < ab) t = ab;
  for (let i = 0; i < 60 && tagFertig(t); i++) t = plusTage(t, 1);
  return t;
}
function offeneTage() {
  const morgen = plusTage(S.heute, 1);
  const alle = new Set([standardTag(), ...doks("skripte").map((d) => d.daten.datum), ...doks("ideen").map((d) => d.daten.datum)]);
  return [...alle].filter((t) => t >= S.heute && !tagFertig(t) && (t >= morgen || tagAktiv(t))).sort();
}
function archivTage() {
  const alle = new Set(doks("skripte").map((d) => d.daten.datum));
  return [...alle].filter((t) => tagFertig(t) || t < S.heute).sort().reverse().slice(0, 14);
}
const brauchtSkript = (d) => d && (d.daten.status === "gewaehlt" || (d.daten.status === "fehler" && d.daten.fehler_phase !== "produktion"));
const ideenLaufen = (konto, tag) => {
  const passt = (t) => t && t.startsWith("10 Ideen") && t.includes(KONTO_NAME[konto]) && t.includes(tag);
  return passt(S.claude?.aktiv?.titel) || (S.claude?.wartend || []).some(passt);
};

// ───────── Zeichnen ─────────

function studioZeichnen() {
  if (!S.heute) return;
  if (!ST.tag || (!ST.manuell && ST.tag !== standardTag())) ST.tag = standardTag();
  $("studio").dataset.konto = ST.konto;
  tageZeichnen();
  $("konto-tabs").innerHTML = Object.keys(PRAEFIX).map((k) => `<button data-konto="${k}" class="${k === ST.konto ? "aktiv" : ""}">${KONTO_NAME[k]}</button>`).join("");
  const ab = S.einstellungen?.studio_ab;
  $("studio-hinweis").hidden = !nurLesen();
  if (nurLesen()) $("studio-hinweis").innerHTML = `🗂️ Der <b>${tagLabel(ST.tag)}</b> läuft noch im alten Ideen-Studio (hier nur zum Ansehen). Das Cockpit übernimmt ab <b>${tagLabel(ab)}</b>.`;
  ideenZeichnen();
  slotsZeichnen();
  skriptZeichnen();
  leisteZeichnen();
  studioPunkt();
}

function tageZeichnen() {
  const offen = offeneTage();
  if (!offen.includes(ST.tag)) offen.push(ST.tag);
  const chips = offen.sort().map((t) => {
    const s = slotsDesTages(t);
    const geplant = s.filter((d) => FERTIG_STATUS.has(d.daten.status)).length;
    return `<button class="tag ${t === ST.tag ? "aktiv" : ""}" data-tag="${t}"><b>${tagLabel(t)}</b><small>${geplant}/4 geplant${t === S.heute ? " · heute" : ""}</small></button>`;
  });
  const archiv = archivTage().filter((t) => !offen.includes(t)).slice(0, 5).map((t) => `<button class="tag archiv ${t === ST.tag ? "aktiv" : ""}" data-tag="${t}" title="Erledigt">${tagLabel(t)}</button>`);
  $("tage").innerHTML = chips.join("") + archiv.join("");
  $("tag-wahl").value = ST.tag;
}

function ideenZeichnen() {
  const dok = doks("ideen").find((d) => d.id === `${PRAEFIX[ST.konto]}-${ST.tag}`);
  const laeuft = ideenLaufen(ST.konto, ST.tag);
  const k = $("k-ideen");
  k.textContent = laeuft ? "⏳ Claude denkt nach …" : dok ? "🔄 Neue 10 Ideen" : "💡 10 Ideen erzeugen";
  k.disabled = laeuft || nurLesen();
  $("wunsch").disabled = nurLesen();
  $("ideen-info").textContent = dok ? `· ${dok.daten.ideen?.length || 0} Ideen, erzeugt ${new Date(dok.daten.erzeugt || dok.aktualisiert).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${dok.daten.wunsch ? ` · Wunsch: ${dok.daten.wunsch}` : ""}` : "";
  if (laeuft && !dok) {
    $("ideen").innerHTML = `<div class="ideen-laden">${"<div></div>".repeat(5)}</div>`;
    return;
  }
  if (!dok) {
    $("ideen").innerHTML = `<div class="leer-gross"><b>💡</b>Noch keine Ideen für ${esc(KONTO_NAME[ST.konto])} am ${tagLabel(ST.tag)}.<br>${nurLesen() ? "" : "Klick oben auf „10 Ideen erzeugen“."}</div>`;
    return;
  }
  const belegung = Object.fromEntries(["mittag", "abend"].map((s) => [s, skriptDok(slotIdVon(ST.konto, ST.tag, s))]));
  const felder = FELDER[ST.konto] || FELDER.simulierbar;
  $("ideen").innerHTML = (dok.daten.ideen || []).map((i, n) => {
    const gewaehlt = Object.values(belegung).some((d) => d?.daten.idee?.titel === i.titel);
    const knoepfe = ["mittag", "abend"].map((s) => {
      const d = belegung[s];
      const hier = d?.daten.idee?.titel === i.titel;
      const gesperrt = nurLesen() || (d && !hier && !AENDERBAR.has(d.daten.status)) || (hier && !AENDERBAR.has(d.daten.status));
      return `<button data-waehlen="${s}" data-nr="${i.nr}" class="${hier ? "belegt" : ""}" ${gesperrt ? "disabled" : ""}>${hier ? "✓ " : ""}${SLOT_NAME[s]} ${slotZeit(ST.tag, s)}</button>`;
    }).join("");
    const offen = felder.offen.filter((f) => i[f]).map((f) => `<div><b>${FELD_NAME[f] || f}</b>${esc(wert(i[f]))}</div>`).join("");
    const mehr = felder.mehr.filter((f) => i[f]).map((f) => `<div><b>${FELD_NAME[f] || f}</b>${esc(wert(i[f]))}</div>`).join("");
    const alt = Array.isArray(i.alternativen) && i.alternativen.length ? `<div class="idee-chips">${i.alternativen.map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : "";
    return `<div class="idee ${gewaehlt ? "gewaehlt" : ""}" style="animation-delay:${n * 40}ms">
      <div class="idee-kopf"><span class="idee-nr">${i.nr}</span><span class="idee-titel">${esc(i.titel)}</span></div>
      ${alt}<div class="idee-felder">${offen}</div>
      ${mehr ? `<details><summary>Mehr Details</summary><div class="idee-felder">${mehr}</div></details>` : ""}
      <div class="idee-knoepfe">${knoepfe}</div>
    </div>`;
  }).join("");
}

function slotKnoepfe(d) {
  if (nurLesen()) return "";
  const st = d.daten.status;
  const k = (aktion, text, klasse = "") => `<button class="knopf klein ${klasse}" data-aktion="${aktion}" data-id="${d.id}">${text}</button>`;
  const lesen = d.daten.skript ? k("lesen", "📜 Lesen") : "";
  switch (st) {
    case "gewaehlt": return k("verwerfen", "Abwählen");
    case "skript_fertig": return lesen + k("freigeben", "✅ Freigeben", "glanz") + k("neu", "✏️ Neu schreiben") + k("verwerfen", "🗑", "rot");
    case "freigegeben": return lesen + k("zuruecknehmen", "↩ Zurücknehmen");
    case "rueckfrage": return lesen + k("rueckfrage_annehmen", "✔ Vorschlag annehmen", "glanz") + k("neu", "✏️ Neu schreiben");
    case "fehler":
      if (d.daten.fehler_phase === "nachpruefen") return k("erneut", "🔁 Nachprüfung wiederholen", "glanz");
      return k("erneut", "🔁 Erneut versuchen", "glanz") + (d.daten.fehler_phase !== "produktion" ? k("neu", "✏️ Neu schreiben") + k("verwerfen", "🗑", "rot") : "");
    default: return lesen;
  }
}

function slotsZeichnen() {
  $("slots").innerHTML = ["mittag", "abend"].map((s) => {
    const id = slotIdVon(ST.konto, ST.tag, s);
    const d = skriptDok(id);
    const kopf = `<div class="slot-kopf"><span>${SLOT_NAME[s]} · ${d?.daten.uhrzeit || slotZeit(ST.tag, s)}</span>${d ? `<span class="chip ${STATUS_KLASSE[d.daten.status] || ""}">${esc(STATUS_NAME[d.daten.status] || d.daten.status)}</span>` : ""}</div>`;
    if (!d) return `<div class="slot frei">${kopf}<div class="slot-info">Frei. Wähle links eine Idee für ${SLOT_NAME[s]}.</div></div>`;
    const st = d.daten.status;
    const arbeitet = ["recherche", "uebergeben", "produktion"].includes(st);
    const stufe = STUFE[st] || 0;
    const geplant = d.daten.geplant_fuer ? `Geplant: ${new Date(d.daten.geplant_fuer).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "";
    return `<div class="slot ${arbeitet ? "arbeitet" : ""} ${ST.slot === id ? "gewaehlt-ansicht" : ""}" data-slot="${id}">
      ${kopf}
      <div class="slot-titel">${esc(d.daten.titel || "")}</div>
      <div class="slot-info">${esc(d.daten.fortschritt || "")}${geplant ? `<br>${esc(geplant)}` : ""}</div>
      ${d.daten.fehler ? `<div class="slot-fehler">${esc(d.daten.fehler)}</div>` : ""}
      <div class="slot-knoepfe">${slotKnoepfe(d)}</div>
      <div class="slot-stufen" title="Gewählt · Skript · Freigabe · Produktion · Geplant">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= stufe ? "an" : ""}"></i>`).join("")}</div>
    </div>`;
  }).join("");
}

// ───────── Skript-Ansicht ─────────

function verlinken(text) {
  return esc(text).replace(/(https?:\/\/[^\s<)\]]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
}
const liste = (a) => (Array.isArray(a) ? a.map((x) => `• ${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n") : typeof a === "object" && a ? Object.entries(a).map(([k, v]) => `${k}: ${wert(v)}`).join("\n") : String(a || ""));
const pruefChip = (ok, text) => `<span class="chip ${ok ? "ok" : "fehler"}">${ok ? "✓" : "✗"} ${esc(text)}</span>`;

function pruefungen(konto, s, d) {
  const quellen = (s.quellen || d.daten.quellen || []).length;
  if (konto === "stelldirvor") {
    const saetze = s.saetze || [];
    const ausreisser = saetze.filter((x) => { const w = String(x.text || "").split(/\s+/).filter(Boolean).length; return w < 3 || w > 9; }).length;
    return pruefChip(saetze.length >= 12 && saetze.length <= 18, `${saetze.length} Sätze (12–18)`) + pruefChip(!ausreisser, ausreisser ? `${ausreisser} Sätze außerhalb 3–9 Wörter` : "Satzlängen 3–9 Wörter") + pruefChip(quellen > 0, `${quellen} Quellen`);
  }
  const sprech = (s.segmente || []).map((x) => x.sprechtext || "").join(" ");
  const woerter = sprech.replace(/\[[^\]]*\]/g, " ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const ausrufe = (sprech.match(/!/g) || []).length;
  const verboten = /\[(excited|shouting|energetic)\]|<break|los geht/i.test(sprech);
  return pruefChip(woerter >= 150 && woerter <= 190, `${woerter} Wörter (150–190)`) + pruefChip(ausrufe <= 3, `${ausrufe} Ausrufezeichen (≤ 3)`) + pruefChip(!verboten, verboten ? "verbotener Tag oder Satz" : "keine verbotenen Tags") + pruefChip(quellen > 0, `${quellen} Quellen`);
}

function skriptZeichnen() {
  const d = ST.slot ? skriptDok(ST.slot) : null;
  if (!d || d.daten.datum !== ST.tag || d.daten.konto !== ST.konto) { $("skript").innerHTML = ""; return; }
  const s = d.daten.skript;
  if (!s) {
    $("skript").innerHTML = `<h3>${esc(d.daten.titel)}</h3><div class="hinweis">Noch kein Skript. ${d.daten.status === "recherche" ? "Claude recherchiert gerade – rechts siehst du jeden Schritt." : ""}</div>`;
    return;
  }
  let inhalt = "";
  if (d.daten.konto === "stelldirvor") {
    inhalt += `<div class="segment"><span class="phase-name">Welt</span><div>${esc(wert(s.welt))}${s.standpunkt ? ` · ${esc(wert(s.standpunkt))}` : ""}</div></div>`;
    inhalt += `<div class="segment"><span class="phase-name">Zeitraffer</span><div>${esc(wert(s.zeitraffer))}${s.kamera ? `<div class="bild">Kamera: ${esc(wert(s.kamera))}</div>` : ""}</div></div>`;
    if (Array.isArray(s.anzeige_plan) && s.anzeige_plan.length) inhalt += `<table><tr><th>Zeit</th><th>Anzeige</th><th>Wert</th></tr>${s.anzeige_plan.map((a) => `<tr><td>${esc(a.von_s)}–${esc(a.bis_s)} s</td><td>${esc(a.etikett || "")}${a.unter ? `<div class="bild">${esc(a.unter)}</div>` : ""}</td><td>${esc(a.start)} → ${esc(a.ende)} ${esc(a.einheit || "")}</td></tr>`).join("")}</table>`;
    inhalt += (s.saetze || []).map((x) => `<div class="segment"><span class="phase-name">ca. ${esc(x.t_ca)} s</span><div class="sprech"><i>${esc(x.text)}</i></div></div>`).join("");
    if (s.faktenzeile) inhalt += `<div class="segment"><span class="phase-name">Abspann</span><div>${esc(s.faktenzeile)}</div></div>`;
  } else {
    inhalt += (s.segmente || []).map((x) => `<div class="segment"><span class="phase-name">${esc(x.phase || x.id)}</span><div><div class="sprech">${esc(x.sprechtext || "")}</div>${x.text ? `<div class="bild">Bild: ${esc(x.text)}</div>` : ""}</div></div>`).join("");
  }
  const block = (titel, text, html = false) => (text && String(text).trim() ? `<details><summary>${titel}</summary><div>${html ? text : esc(text)}</div></details>` : "");
  const korrekturen = (d.daten.korrekturen || []).map((k) => `• ${k.feld}: ${k.alt} → ${k.neu} (${k.grund || ""}${k.quelle ? `; ${k.quelle}` : ""})`).join("\n");
  const verlauf = (d.daten.verlauf || []).slice(-8).map((v) => `${new Date(v.zeit).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · ${v.text}`).join("\n");
  $("skript").innerHTML = `
    <h3>📜 ${esc(s.titel || d.daten.titel)}</h3>
    <div class="hinweis">${esc(s.thema || d.daten.thema || "")}</div>
    <div class="pruef">${pruefungen(d.daten.konto, s, d)}</div>
    ${inhalt}
    ${block("Rechenweg", s.rechenweg || d.daten.rechenweg)}
    ${block("Zahlen", liste(s.zahlen || d.daten.zahlen))}
    ${block("Quellen", verlinken(liste(s.quellen || d.daten.quellen)), true)}
    ${block("Annahmen", liste(s.annahmen || d.daten.annahmen))}
    ${block("Dramaturgie", liste(s.dramaturgie || d.daten.dramaturgie))}
    ${block("Selbstprüfung", liste(s.selbstpruefung || d.daten.selbstpruefung))}
    ${block("Caption", s.caption || d.daten.caption)}
    ${block("Korrekturen aus dem Faktencheck", korrekturen)}
    ${block("Dein Kommentar", d.daten.kommentar)}
    ${block("Verlauf", verlauf)}
    <div class="slot-knoepfe" style="margin-top:10px">${slotKnoepfe(d).replace(/<button[^>]*data-aktion="lesen"[^>]*>.*?<\/button>/, "")}<button class="knopf klein" data-kopieren="${d.id}">📋 Skript kopieren</button></div>`;
}

function leisteZeichnen() {
  const mini = Object.keys(PRAEFIX).flatMap((k) => ["mittag", "abend"].map((s) => {
    const d = skriptDok(slotIdVon(k, ST.tag, s));
    return `<span class="mini-slot ${PRAEFIX[k]}" title="${esc(d?.daten.titel || "frei")}">${KONTO_NAME[k]} ${SLOT_NAME[s]}: <b>${esc(d ? STATUS_NAME[d.daten.status] || d.daten.status : "frei")}</b></span>`;
  })).join("");
  const offen = ["mittag", "abend"].map((s) => skriptDok(slotIdVon(ST.konto, ST.tag, s))).filter(brauchtSkript).length;
  const frei = slotsDesTages(ST.tag).filter((d) => d.daten.status === "freigegeben").length;
  const gesperrt = nurLesen();
  const inProd = slotsDesTages(ST.tag).filter((d) => ["uebergeben", "produktion"].includes(d.daten.status)).length;
  const prodLaeuft = !!S.claude?.produktion?.laeuft;
  $("studio-leiste").innerHTML = `<div class="tagesueberblick">${mini}</div>
    <button class="knopf gross" id="k-recherche" ${!offen || gesperrt ? "disabled" : ""}>🔎 Skripte recherchieren lassen${offen ? ` (${offen})` : ""}</button>
    <button class="knopf gross glanz" id="k-uebergeben" ${!frei || gesperrt ? "disabled" : ""} title="Startet die Produktion: Claude baut, rendert auf dem PC, prüft und plant in Buffer">🚀 An Claude übergeben${frei ? ` (${frei})` : ""}</button>
    ${inProd && !prodLaeuft ? `<button class="knopf gross" id="k-produktion" ${gesperrt ? "disabled" : ""} title="Produktion für übergebene Videos (neu) starten, z. B. nach einem Neustart">🏭 Produktion starten (${inProd})</button>` : ""}
    ${prodLaeuft ? `<button class="knopf gross" id="k-produktion-stopp" title="${esc(S.claude.produktion.titel || "")}">⏹ Produktion stoppen</button>` : ""}`;
}

// Gelber Punkt am Studio-Reiter: so viele Videos warten auf dich (Skript prüfen oder Rückfrage)
function studioPunkt() {
  const n = doks("skripte").filter((d) => ["skript_fertig", "rueckfrage"].includes(d.daten.status) && d.daten.datum >= S.heute).length;
  $("studio-punkt").hidden = !n;
  $("studio-punkt").textContent = n;
}

// ───────── Aktionen ─────────

async function studioAktion(aktion, daten = {}) {
  Ton.init();
  const r = await post("/api/studio", { aktion, ...daten });
  if (!r.ok) {
    toast("⚠️", "Studio", r.fehler || "Nicht möglich", "problem");
    Ton.fehler();
    return null;
  }
  return r;
}

function textDialog({ titel, hinweis = "", wert: vorgabe = "", ok, knopf = "Speichern" }) {
  const d = $("text-dialog");
  $("text-dialog-titel").textContent = titel;
  $("text-dialog-hinweis").textContent = hinweis;
  $("text-dialog-feld").value = vorgabe;
  $("text-dialog-ok").textContent = knopf;
  $("text-dialog-ok").onclick = async () => {
    const text = $("text-dialog-feld").value.trim();
    if (await ok(text)) d.close();
  };
  d.showModal();
  $("text-dialog-feld").focus();
}
$("text-dialog").querySelector("[data-zu]").addEventListener("click", () => $("text-dialog").close());

// Seit der Neon-Stadt (03.11.) sind die Ansichten Gebäude: ansichtSetzen öffnet das passende Gebäude (zentrale.js).
// Bleibt für Sprachbot, Meldungen und die Steuerung vom Server; „stadt“ führt zurück in die Stadt.
function ansichtSetzen(ansicht, raum = null) {
  Ton.klick();
  if (typeof Spiel !== "undefined") Spiel.wechsel(ansicht);
  document.dispatchEvent(new CustomEvent("cockpit:oeffnen", { detail: { zentrale: ansicht, raum } }));
}

$("tage").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tag]");
  if (!b) return;
  ST.tag = b.dataset.tag;
  ST.manuell = ST.tag !== standardTag();
  ST.slot = null;
  Ton.klick();
  studioZeichnen();
});
$("tag-wahl").addEventListener("change", (e) => {
  if (!e.target.value) return;
  ST.tag = e.target.value;
  ST.manuell = ST.tag !== standardTag();
  ST.slot = null;
  studioZeichnen();
});
$("konto-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-konto]");
  if (!b) return;
  ST.konto = b.dataset.konto;
  ST.slot = null;
  lokal.schreiben("studio-konto", ST.konto);
  Ton.klick();
  studioZeichnen();
});

$("k-ideen").addEventListener("click", async () => {
  const dok = doks("ideen").find((d) => d.id === `${PRAEFIX[ST.konto]}-${ST.tag}`);
  if (dok && !confirm("Die bisherigen 10 Ideen werden ersetzt. Bereits gewählte Videos bleiben. Neue Ideen erzeugen?")) return;
  const r = await studioAktion("ideen", { konto: ST.konto, datum: ST.tag, wunsch: $("wunsch").value });
  if (r) {
    toast("💡", "Ideen angefordert", r.hinweis || "Claude denkt nach …", "meilenstein");
    Ton.whoosh();
    lokal.schreiben("studio-wunsch", $("wunsch").value);
  }
});
$("wunsch").value = lokal.lesen("studio-wunsch", "");

$("ideen").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-waehlen]");
  if (!b || b.disabled) return;
  const [x, y] = mitte(b);
  const r = await studioAktion("waehlen", { konto: ST.konto, datum: ST.tag, slot: b.dataset.waehlen, nr: Number(b.dataset.nr) });
  if (r) { P.funken(x, y, 16); Ton.chime(); }
});

$("slots").addEventListener("click", (e) => {
  const knopf = e.target.closest("[data-aktion]");
  if (knopf) return slotAktion(knopf.dataset.aktion, knopf.dataset.id, knopf);
  const karte = e.target.closest("[data-slot]");
  if (!karte) return;
  ST.slot = ST.slot === karte.dataset.slot ? null : karte.dataset.slot;
  Ton.klick();
  slotsZeichnen();
  skriptZeichnen();
});
$("skript").addEventListener("click", async (e) => {
  const kopieren = e.target.closest("[data-kopieren]");
  if (kopieren) {
    const d = skriptDok(kopieren.dataset.kopieren);
    try { await navigator.clipboard.writeText(JSON.stringify(d?.daten.skript || {}, null, 1)); toast("📋", "Kopiert", "Skript in der Zwischenablage"); } catch { toast("⚠️", "Kopieren", "nicht möglich", "problem"); }
    return;
  }
  const knopf = e.target.closest("[data-aktion]");
  if (knopf) slotAktion(knopf.dataset.aktion, knopf.dataset.id, knopf);
});

async function slotAktion(aktion, id, knopf) {
  const d = skriptDok(id);
  if (aktion === "lesen") {
    ST.slot = id;
    slotsZeichnen();
    skriptZeichnen();
    $("skript").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (aktion === "neu") {
    textDialog({
      titel: "Neu schreiben lassen",
      hinweis: `„${d?.daten.titel}“: Was soll anders werden? Was du nicht kritisierst, bleibt möglichst gleich.`,
      knopf: "✏️ An Claude schicken",
      ok: async (kommentar) => {
        if (!kommentar) { toast("✏️", "Kommentar fehlt", "Schreib kurz, was anders werden soll", "problem"); return false; }
        const r = await studioAktion("neu_schreiben", { id, kommentar });
        if (r) Ton.whoosh();
        return !!r;
      },
    });
    return;
  }
  if (aktion === "verwerfen" && d?.daten.status !== "gewaehlt" && !confirm(`„${d?.daten.titel}“ verwerfen? Das Skript wird gelöscht.`)) return;
  const [x, y] = mitte(knopf);
  const r = await studioAktion(aktion, { id });
  if (!r) return;
  if (aktion === "freigeben") { P.konfetti(x, y, 90, 8); Ton.fanfare(); }
  else if (aktion === "erneut" || aktion === "rueckfrage_annehmen") Ton.whoosh();
  else Ton.klick();
}

$("studio-leiste").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  const [x, y] = mitte(b);
  if (b.id === "k-recherche") {
    const r = await studioAktion("recherchieren", { konto: ST.konto, datum: ST.tag });
    if (r) { toast("🔎", "Recherche gestartet", `${r.slots.length} Skript(e) für ${KONTO_NAME[ST.konto]} · Claude arbeitet rechts`, "meilenstein"); Ton.whoosh(); P.funken(x, y, 20); }
  }
  if (b.id === "k-uebergeben") {
    if (!confirm(`Alle freigegebenen Videos vom ${tagLabel(ST.tag)} an Claude übergeben?`)) return;
    const r = await studioAktion("uebergeben", { datum: ST.tag });
    if (r) { P.konfetti(x, y, 160, 11); Ton.fanfare(); toast("🚀", "Übergeben", r.produktion ? "Claude produziert jetzt (🏭 im Feed)" : "Produktion nicht angeschlossen", "meilenstein"); }
  }
  if (b.id === "k-produktion") {
    const r = await studioAktion("produktion_starten", { datum: ST.tag });
    if (r) { Ton.whoosh(); P.funken(x, y, 20); toast("🏭", "Produktion", r.laeuft_schon ? "Läuft schon, übernimmt die Videos" : `${r.ids.length} Video(s) gehen in Produktion`, "meilenstein"); }
  }
  if (b.id === "k-produktion-stopp") {
    if (!confirm("Produktion wirklich stoppen? Fertige Teile bleiben erhalten, „Erneut versuchen“ setzt fort.")) return;
    const r = await post("/api/produktion/stopp", {});
    if (r.ok) toast("⏹", "Produktion gestoppt", "", "problem");
  }
});

$("k-lernstand").addEventListener("click", () => {
  const dok = doks("stand").find((d) => d.id === `lernstand-${PRAEFIX[ST.konto]}`);
  textDialog({
    titel: `🧠 Lernstand ${KONTO_NAME[ST.konto]}`,
    hinweis: `Fließt in jede Idee und jedes Skript. ${dok ? `Stand ${new Date(dok.daten.aktualisiert || dok.aktualisiert).toLocaleString("de-DE")} · ${dok.daten.quelle || ""}` : "Noch der Startwert aus befehle.json."}`,
    wert: dok?.daten.text || "",
    knopf: "Speichern",
    ok: async (text) => !!(await studioAktion("lernstand", { konto: ST.konto, text })),
  });
});

// ───────── Live-Änderungen aus der Datenbank ─────────

function studioDbEreignis(e) {
  if (!S.db) S.db = { skripte: [], ideen: [], stand: [] };
  const sammlung = S.db[e.sammlung] || (S.db[e.sammlung] = []);
  const alt = sammlung.find((d) => d.id === e.id);
  if (e.geloescht) S.db[e.sammlung] = sammlung.filter((d) => d.id !== e.id);
  else if (alt) Object.assign(alt, e);
  else sammlung.push(e);

  if (e.sammlung === "skripte" && !e.geloescht && e.von === "claude") {
    const vorher = alt?.daten?.status, jetzt = e.daten.status;
    if (vorher !== jetzt && jetzt === "skript_fertig") { toast("📜", "Skript fertig", `${e.daten.titel} · bitte prüfen`, "meilenstein"); Ton.chime(); }
    if (vorher !== jetzt && (jetzt === "fehler" || jetzt === "rueckfrage")) { toast("⚠️", jetzt === "fehler" ? "Problem" : "Rückfrage", `${e.daten.titel}: ${e.daten.fehler || ""}`.slice(0, 160), "problem"); Ton.fehler(); }
  }
  if (e.sammlung === "ideen" && !e.geloescht && e.von === "claude") {
    toast("💡", "10 neue Ideen", `${KONTO_NAME[e.daten.konto] || e.daten.konto} · ${tagLabel(e.daten.datum)}`, "meilenstein");
    Ton.fanfare();
    if ($("ideen").offsetParent) P.konfetti(...mitte($("ideen")), 120, 9);
  }
  studioZeichnen();
}
