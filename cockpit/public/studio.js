"use strict";
// Studio: Ideen wählen, Skripte lesen und freigeben. Recherche und Produktion starten selbst (Automatik, Entscheidung 07.11.),
// die Knöpfe bleiben als Weg von Hand. Alle Regeln prüft der Server (lib/studio.mjs).

const ST = { tag: null, manuell: false, konto: lokal.lesen("studio-konto", "simulierbar"), slot: null };
const STATUS_NAME = { gewaehlt: "gewählt", recherche: "Recherche läuft", skript_fertig: "Skript fertig", freigegeben: "freigegeben", uebergeben: "übergeben", produktion: "in Produktion", geplant: "geplant", gepostet: "online", rueckfrage: "Rückfrage", fehler: "Fehler" };
const STATUS_KLASSE = { recherche: "laeuft", uebergeben: "laeuft", produktion: "laeuft", skript_fertig: "acc1", freigegeben: "ok", geplant: "ok", gepostet: "ok", rueckfrage: "fehler", fehler: "fehler" };
const STUFE = { gewaehlt: 1, recherche: 1, skript_fertig: 2, rueckfrage: 2, freigegeben: 3, uebergeben: 4, produktion: 4, geplant: 5, gepostet: 5, fehler: 1 };
const FERTIG_STATUS = new Set(["geplant", "gepostet"]);
const AENDERBAR = new Set(["gewaehlt", "fehler"]);
const FELDER = {
  simulierbar: { offen: ["treffer", "hook", "ergebnis_ansatz", "warum_relevant", "weiterschicken", "originalitaet"], mehr: ["suchbegriff", "feld", "zutat", "diskussion", "daten", "bildidee", "laender", "risiko"] },
  stelldirvor: { offen: ["treffer", "ereignis", "messgroesse", "welt", "standpunkt", "weiterschicken", "originalitaet"], mehr: ["suchbegriff", "feld", "massstab", "zutat", "tageszeit_verlauf", "bewegung", "kamera", "zeitraffer", "hoehepunkt", "pointe", "diskussion", "daten", "laender", "risiko"] },
};
const FELD_NAME = { originalitaet: "Originalität", feld: "Themenfeld", zutat: "Zutat", massstab: "Maßstab", hook: "Hook", ergebnis_ansatz: "Ergebnis", warum_relevant: "Warum relevant", diskussion: "Diskussion", daten: "Daten", bildidee: "Bildidee", laender: "Länder", risiko: "Risiko", ereignis: "Ereignis", messgroesse: "Messgröße", welt: "Welt", standpunkt: "Standpunkt", tageszeit_verlauf: "Tageszeit", bewegung: "Bewegung", kamera: "Kamera", zeitraffer: "Zeitraffer", hoehepunkt: "Höhepunkt", pointe: "Pointe", weiterschicken: "Würde man es schicken?", suchbegriff: "Suchbegriff", treffer: "Treffer" };

const wert = (v) => (Array.isArray(v) ? v.join("  gegen  ") : v && typeof v === "object" ? JSON.stringify(v) : String(v ?? ""));
const nurLesen = () => !!(S.einstellungen?.studio_ab && ST.tag < S.einstellungen.studio_ab);
const slotsDesTages = (t) => doks("skripte").filter((d) => d.daten.datum === t);
const tagFertig = (t) => { const s = slotsDesTages(t); return s.length >= 4 && s.every((d) => FERTIG_STATUS.has(d.daten.status)); };
const tagAktiv = (t) => slotsDesTages(t).some((d) => d.daten.status !== "gewaehlt" && !FERTIG_STATUS.has(d.daten.status));

// Heute, wenn heute etwas in Arbeit ist, sonst morgen; fertige Tage überspringen; nie vor studio_ab
function standardTag() {
  const ab = S.einstellungen?.studio_ab || "";
  let t = tagAktiv(S.heute) && S.heute >= ab ? S.heute : plusTage(S.heute, 1);
  if (ab && t < ab) t = ab;
  for (let i = 0; i < 60 && tagFertig(t); i++) t = plusTage(t, 1);
  return t;
}
function offeneTage() {
  const alle = new Set([standardTag(), ...doks("skripte").map((d) => d.daten.datum), ...doks("ideen").map((d) => d.daten.datum)]);
  return [...alle].filter((t) => t >= S.heute && !tagFertig(t) && (t >= morgen() || tagAktiv(t))).sort();
}
function archivTage() {
  return [...new Set(doks("skripte").map((d) => d.daten.datum))].filter((t) => tagFertig(t) || t < S.heute).sort().reverse().slice(0, 14);
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
  tageZeichnen();
  htmlSetzen($("konto-tabs"), Object.keys(PRAEFIX).map((k) => `<button data-konto="${k}" class="${k === ST.konto ? "aktiv" : ""}">${KONTO_NAME[k]}</button>`).join(""));
  $("studio-hinweis").hidden = !nurLesen();
  if (nurLesen()) $("studio-hinweis").innerHTML = `Der <b>${tagLabel(ST.tag)}</b> lief noch im alten Ideen-Studio (hier nur zum Ansehen).`;
  ideenZeichnen();
  slotsZeichnen();
  skriptZeichnen();
  leisteZeichnen();
  $("seiten-unter").textContent = `${KONTO_NAME[ST.konto]} · ${tagLabel(ST.tag)}`;
}

function tageZeichnen() {
  const offenListe = offeneTage();
  if (!offenListe.includes(ST.tag)) offenListe.push(ST.tag);
  const chips = offenListe.sort().map((t) => {
    const geplantN = slotsDesTages(t).filter((d) => FERTIG_STATUS.has(d.daten.status)).length;
    return `<button class="tag ${t === ST.tag ? "aktiv" : ""}" data-tag="${t}"><b>${tagLabel(t)}</b><small>${geplantN}/4 geplant${t === S.heute ? " · heute" : ""}</small></button>`;
  });
  const archiv = archivTage().filter((t) => !offenListe.includes(t)).slice(0, 4).map((t) => `<button class="tag archiv ${t === ST.tag ? "aktiv" : ""}" data-tag="${t}" title="Erledigt"><b>${tagLabel(t)}</b></button>`);
  htmlSetzen($("tage"), chips.join("") + archiv.join(""));
  if (document.activeElement !== $("tag-wahl")) $("tag-wahl").value = ST.tag;
}

function ideenZeichnen() {
  const dok = doks("ideen").find((d) => d.id === `${PRAEFIX[ST.konto]}-${ST.tag}`);
  const laeuft = ideenLaufen(ST.konto, ST.tag);
  const k = $("k-ideen");
  k.textContent = laeuft ? "Claude sucht Ideen …" : dok ? "Neue 10 Ideen" : "10 Ideen erzeugen";
  k.disabled = laeuft || nurLesen();
  $("wunsch").disabled = nurLesen();
  const wunsch = String(dok?.daten.wunsch || "");
  $("ideen-info").textContent = dok ? `· ${dok.daten.ideen?.length || 0} Ideen, ${new Date(dok.daten.erzeugt || dok.aktualisiert).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}${wunsch ? ` · Wunsch: ${wunsch.length > 70 ? wunsch.slice(0, 70) + " …" : wunsch}` : ""}` : "";
  $("ideen-info").title = wunsch;
  if (laeuft && !dok) return htmlSetzen($("ideen"), `<div class="ideen-laden">${"<div></div>".repeat(6)}</div>`);
  if (!dok) {
    const a = automatik();
    const auto = automatikDa() && a.ideen && ST.tag === morgen() ? `<br><span class="hinweis">Automatik: Claude erzeugt sie täglich ab ${esc(a.ideen_uhrzeit)} Uhr.</span>` : "";
    return htmlSetzen($("ideen"), `<div class="leer">Noch keine Ideen für ${esc(KONTO_NAME[ST.konto])} am ${tagLabel(ST.tag)}.${nurLesen() ? "" : " Oben „10 Ideen erzeugen“."}${auto}</div>`);
  }
  const belegung = Object.fromEntries(["mittag", "abend"].map((s) => [s, skriptDok(slotIdVon(ST.konto, ST.tag, s))]));
  const felder = FELDER[ST.konto] || FELDER.simulierbar;
  htmlSetzen($("ideen"), (dok.daten.ideen || []).map((i, n) => {
    const gewaehlt = Object.values(belegung).some((d) => d?.daten.idee?.titel === i.titel);
    const knoepfe = ["mittag", "abend"].map((s) => {
      const d = belegung[s];
      const hier = d?.daten.idee?.titel === i.titel;
      const gesperrt = nurLesen() || (d && !hier && !AENDERBAR.has(d.daten.status)) || (hier && !AENDERBAR.has(d.daten.status));
      return `<button data-waehlen="${s}" data-nr="${i.nr}" class="${hier ? "belegt" : ""}" ${gesperrt ? "disabled" : ""}>${hier ? "✓ " : ""}${SLOT_NAME[s]} ${slotZeit(ST.tag, s)}</button>`;
    }).join("");
    const zeile = (f) => `<div><b>${FELD_NAME[f] || f}</b>${esc(wert(i[f]))}</div>`;
    const offenFelder = felder.offen.filter((f) => i[f]).map(zeile).join("");
    const mehr = felder.mehr.filter((f) => i[f]).map(zeile).join("");
    const alt = Array.isArray(i.alternativen) && i.alternativen.length ? `<div class="idee-chips">${i.alternativen.map((a) => `<span class="chip">${esc(a)}</span>`).join("")}</div>` : "";
    // Folgeteil eines eigenen Treffers (Cockpit, seit 08.11.): oben, mit Hinweis auf den Treffer
    const teil = i.typ === "folgeteil" ? `<div class="idee-chips"><span class="chip teil">🎯 Folgeteil · Teil ${esc(i.teil)}</span>${i.serie?.link ? `<a class="chip" href="${esc(i.serie.link)}" target="_blank" rel="noopener noreferrer">Teil davor ansehen</a>` : ""}</div>` : "";
    return `<div class="idee ${gewaehlt ? "gewaehlt" : ""} ${i.typ === "folgeteil" ? "folgeteil" : ""}" style="animation-delay:${n * 35}ms">
      <div class="idee-kopf"><span class="idee-nr">${i.nr}</span><span class="idee-titel">${esc(i.titel)}</span></div>${teil}
      ${alt}<div class="idee-felder">${offenFelder}</div>
      ${mehr ? `<details><summary>Mehr Details</summary><div class="idee-felder">${mehr}</div></details>` : ""}
      <div class="idee-knoepfe">${knoepfe}</div>
    </div>`;
  }).join(""));
}

function slotKnoepfe(d) {
  if (nurLesen()) return "";
  const st = d.daten.status;
  const k = (aktion, text, klasse = "") => `<button class="knopf klein ${klasse}" data-aktion="${aktion}" data-id="${d.id}">${text}</button>`;
  const lesen = d.daten.skript ? k("lesen", "Lesen") : "";
  switch (st) {
    case "gewaehlt": return k("verwerfen", "Abwählen");
    case "skript_fertig": return lesen + k("freigeben", "✓ Freigeben", "gruen") + k("neu", "Neu schreiben") + k("verwerfen", "Verwerfen", "rot");
    case "freigegeben": return lesen + k("zuruecknehmen", "Zurücknehmen");
    case "rueckfrage": return lesen + k("rueckfrage_annehmen", "Vorschlag annehmen", "gruen") + k("neu", "Neu schreiben");
    case "fehler":
      if (d.daten.fehler_phase === "nachpruefen") return k("erneut", "Nachprüfung wiederholen", "haupt-knopf");
      return k("erneut", "Erneut versuchen", "haupt-knopf") + (d.daten.fehler_phase !== "produktion" ? k("neu", "Neu schreiben") + k("verwerfen", "Verwerfen", "rot") : "");
    default: return lesen;
  }
}

// Automatik-Hinweis am Slot: Countdown bis Recherche, Produktion oder neuer Versuch
function slotAutomatik(d) {
  const x = d.daten, a = automatik();
  if (x.status === "gewaehlt" && x.auto_recherche_ab && a.recherche) return `<span class="automatik-chip">Recherche startet in <b data-bis="${esc(x.auto_recherche_ab)}">…</b></span>`;
  if (x.status === "freigegeben" && a.produktion && x.auto_produktion_wartet) return `<span class="automatik-chip">Produktion wartet: ${esc(x.auto_produktion_wartet)}</span>`;
  if (x.status === "freigegeben" && a.produktion && x.auto_produktion_ab) return `<span class="automatik-chip">Produktion startet in <b data-bis="${esc(x.auto_produktion_ab)}">…</b></span>`;
  const wiederholung = wiederholungAb(d);
  if (wiederholung) return `<span class="automatik-chip">Neuer Versuch in <b data-bis="${esc(wiederholung)}">…</b></span>`;
  return "";
}
/** Zeitpunkt der automatischen Wiederholung eines Fehlers (oder null) */
function wiederholungAb(d) {
  const x = d.daten;
  if (!automatikDa() || x.status !== "fehler" || !automatik().wiederholen || !["recherche", "produktion", "nachpruefen"].includes(x.fehler_phase)) return null;
  if (x.auto_wiederholt_phase === x.fehler_phase || x.auto_gemeldet) return null;
  if (x.datum < (x.fehler_phase === "nachpruefen" ? plusTage(S.heute, -1) : S.heute)) return null;
  const t = Date.parse(x.aktualisiert || d.aktualisiert || "");
  if (!t || Date.now() - t > 12 * 3600000) return null;
  return t ? new Date(t + (S.wiederholen_nach_s || 300) * 1000).toISOString() : null;
}

function slotsZeichnen() {
  htmlSetzen($("slots"), ["mittag", "abend"].map((s) => {
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
      ${d.daten.fehler ? `<div class="fehler-text">${esc(d.daten.fehler)}</div>` : ""}
      <div class="slot-knoepfe">${slotAutomatik(d)}${slotKnoepfe(d)}</div>
      <div class="stufen" style="margin-top:10px" title="Gewählt · Skript · Freigabe · Produktion · Geplant">${[1, 2, 3, 4, 5].map((n) => `<i class="${n < stufe || (n === stufe && !arbeitet) ? "an" : n === stufe ? "jetzt" : ""}"></i>`).join("")}</div>
    </div>`;
  }).join(""));
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
  if (!d || d.daten.datum !== ST.tag || d.daten.konto !== ST.konto) return htmlSetzen($("skript"), "");
  const s = d.daten.skript;
  if (!s) return htmlSetzen($("skript"), `<h3>${esc(d.daten.titel)}</h3><div class="hinweis">Noch kein Skript. ${d.daten.status === "recherche" ? "Claude recherchiert gerade – auf „Jetzt“ siehst du jeden Schritt." : ""}</div>`);
  let inhalt = "";
  const seg = (name, html) => `<div class="segment-zeile"><span class="phase-name">${name}</span><div>${html}</div></div>`;
  if (d.daten.konto === "stelldirvor") {
    inhalt += seg("Welt", `${esc(wert(s.welt))}${s.standpunkt ? ` · ${esc(wert(s.standpunkt))}` : ""}`);
    inhalt += seg("Zeitraffer", `${esc(wert(s.zeitraffer))}${s.kamera ? `<div class="bild">Kamera: ${esc(wert(s.kamera))}</div>` : ""}`);
    if (Array.isArray(s.anzeige_plan) && s.anzeige_plan.length) inhalt += `<table><tr><th>Zeit</th><th>Anzeige</th><th>Wert</th></tr>${s.anzeige_plan.map((a) => `<tr><td>${esc(a.von_s)}–${esc(a.bis_s)} s</td><td>${esc(a.etikett || "")}${a.unter ? `<div class="bild">${esc(a.unter)}</div>` : ""}</td><td>${esc(a.start)} → ${esc(a.ende)} ${esc(a.einheit || "")}</td></tr>`).join("")}</table>`;
    inhalt += (s.saetze || []).map((x) => seg(`ca. ${esc(x.t_ca)} s`, `<i>${esc(x.text)}</i>`)).join("");
    if (s.faktenzeile) inhalt += seg("Abspann", esc(s.faktenzeile));
  } else {
    inhalt += (s.segmente || []).map((x) => seg(esc(x.phase || x.id), `<div>${esc(x.sprechtext || "")}</div>${x.text ? `<div class="bild">Bild: ${esc(x.text)}</div>` : ""}`)).join("");
  }
  const block = (titel, text, istHtml = false) => (text && String(text).trim() ? `<details><summary>${titel}</summary><div>${istHtml ? text : esc(text)}</div></details>` : "");
  const korrekturen = (d.daten.korrekturen || []).map((k) => `• ${k.feld}: ${k.alt} → ${k.neu} (${k.grund || ""}${k.quelle ? `; ${k.quelle}` : ""})`).join("\n");
  const verlauf = (d.daten.verlauf || []).slice(-8).map((v) => `${new Date(v.zeit).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · ${v.text}`).join("\n");
  htmlSetzen($("skript"), `
    <h3>${esc(s.titel || d.daten.titel)}</h3>
    <div class="hinweis">${esc(s.thema || d.daten.thema || "")}</div>
    <div class="pruef">${pruefungen(d.daten.konto, s, d)}</div>
    ${inhalt}
    ${block("Rechenweg", s.rechenweg || d.daten.rechenweg)}
    ${block("Zahlen", liste(s.zahlen || d.daten.zahlen))}
    ${block("Quellen", verlinken(liste(s.quellen || d.daten.quellen)), true)}
    ${block("Annahmen", liste(s.annahmen || d.daten.annahmen))}
    ${block("Dramaturgie", liste(s.dramaturgie || d.daten.dramaturgie))}
    ${block("Selbstprüfung", liste(s.selbstpruefung || d.daten.selbstpruefung))}
    ${block("Originalität", d.daten.originalitaet || s.originalitaet)}
    ${block("Caption", s.caption || d.daten.caption)}
    ${block("Korrekturen aus dem Faktencheck", korrekturen)}
    ${block("Dein Kommentar", d.daten.kommentar)}
    ${block("Verlauf", verlauf)}
    <div class="slot-knoepfe" style="margin-top:12px">${slotKnoepfe(d).replace(/<button[^>]*data-aktion="lesen"[^>]*>.*?<\/button>/, "")}<button class="knopf klein" data-kopieren="${d.id}">Skript kopieren</button></div>`);
}

function leisteZeichnen() {
  const mini = Object.keys(PRAEFIX).flatMap((k) => ["mittag", "abend"].map((s) => {
    const d = skriptDok(slotIdVon(k, ST.tag, s));
    return `<span class="mini-slot ${PRAEFIX[k]}" title="${esc(d?.daten.titel || "frei")}">${KONTO_NAME[k]} ${SLOT_NAME[s]}: <b>${esc(d ? STATUS_NAME[d.daten.status] || d.daten.status : "frei")}</b></span>`;
  })).join("");
  const offenN = ["mittag", "abend"].map((s) => skriptDok(slotIdVon(ST.konto, ST.tag, s))).filter(brauchtSkript).length;
  const frei = slotsDesTages(ST.tag).filter((d) => d.daten.status === "freigegeben").length;
  const gesperrt = nurLesen();
  const inProd = slotsDesTages(ST.tag).filter((d) => ["uebergeben", "produktion"].includes(d.daten.status)).length;
  const prodLaeuft = !!S.claude?.produktion?.laeuft;
  const a = automatik();
  const wartetAuto = ["mittag", "abend"].map((s) => skriptDok(slotIdVon(ST.konto, ST.tag, s))).find((d) => d?.daten.status === "gewaehlt" && d.daten.auto_recherche_ab && a.recherche);
  const rechercheKnoepfe = wartetAuto
    ? `<span class="automatik-chip">Recherche startet in <b data-bis="${esc(wartetAuto.daten.auto_recherche_ab)}">…</b></span><button class="knopf" data-automatik="jetzt">Jetzt starten</button><button class="knopf" data-automatik="halt" title="Automatik für diesen Tag anhalten, dann startest du von Hand">Warten</button>`
    : `<button class="knopf" id="k-recherche" ${!offenN || gesperrt ? "disabled" : ""}>Skripte recherchieren${offenN ? ` (${offenN})` : ""}</button>`;
  htmlSetzen($("studio-leiste"), `<div class="tagesueberblick">${mini}</div>
    ${rechercheKnoepfe}
    <button class="knopf ${frei ? "haupt-knopf" : ""}" id="k-uebergeben" ${!frei || gesperrt ? "disabled" : ""} title="Startet die Produktion sofort: Claude baut, rendert, prüft und plant in Buffer">An Claude übergeben${frei ? ` (${frei})` : ""}</button>
    ${inProd && !prodLaeuft ? `<button class="knopf" id="k-produktion" ${gesperrt ? "disabled" : ""} title="Produktion für übergebene Videos (neu) starten, z. B. nach einem Neustart">Produktion starten (${inProd})</button>` : ""}
    ${prodLaeuft ? `<button class="knopf rot" id="k-produktion-stopp" title="${esc(S.claude.produktion.titel || "")}">Produktion stoppen</button>` : ""}`);
}

// Zählpunkt am Studio: so viele Videos warten auf dich (Skript prüfen oder Rückfrage)
function studioPunkt() {
  const n = doks("skripte").filter((d) => ["skript_fertig", "rueckfrage"].includes(d.daten.status) && d.daten.datum >= S.heute).length;
  $("punkt-studio").hidden = !n;
  $("punkt-studio").textContent = n;
  document.querySelector('#nav a[data-seite="studio"]').classList.toggle("arbeitet", !!(S.claude?.laeuft && ["ideen", "skripte"].includes(S.claude?.aktiv?.art)));
}

// ───────── Aktionen ─────────
async function studioAktion(aktion, daten = {}) {
  const r = await post("/api/studio", { aktion, ...daten });
  if (!r.ok) { toast("⚠️", "Studio", r.fehler || "Nicht möglich", "problem"); return null; }
  return r;
}
/** Studio auf einem bestimmten Slot öffnen (von „Für dich“ und dem Tagesplan) */
function studioOeffnen(id) {
  const d = skriptDok(id);
  if (d) { ST.konto = d.daten.konto; ST.tag = d.daten.datum; ST.manuell = ST.tag !== standardTag(); ST.slot = d.daten.skript ? id : null; lokal.schreiben("studio-konto", ST.konto); }
  seiteZeigen("studio");
  if (d?.daten.skript) setTimeout(() => $("skript").scrollIntoView({ behavior: "smooth", block: "start" }), 120);
}
function studioTag(konto, tag) {
  ST.konto = konto; ST.tag = tag; ST.manuell = tag !== standardTag(); ST.slot = null;
  lokal.schreiben("studio-konto", konto);
  seiteZeigen("studio");
}

$("tage").addEventListener("click", (e) => {
  const b = e.target.closest("[data-tag]");
  if (!b) return;
  ST.tag = b.dataset.tag; ST.manuell = ST.tag !== standardTag(); ST.slot = null;
  studioZeichnen();
});
$("tag-wahl").addEventListener("change", (e) => {
  if (!e.target.value) return;
  ST.tag = e.target.value; ST.manuell = ST.tag !== standardTag(); ST.slot = null;
  studioZeichnen();
});
$("konto-tabs").addEventListener("click", (e) => {
  const b = e.target.closest("[data-konto]");
  if (!b) return;
  ST.konto = b.dataset.konto; ST.slot = null;
  lokal.schreiben("studio-konto", ST.konto);
  studioZeichnen();
});
$("k-ideen").addEventListener("click", async () => {
  const dok = doks("ideen").find((d) => d.id === `${PRAEFIX[ST.konto]}-${ST.tag}`);
  if (dok && !confirm("Die bisherigen 10 Ideen werden ersetzt. Bereits gewählte Videos bleiben. Neue Ideen erzeugen?")) return;
  const r = await studioAktion("ideen", { konto: ST.konto, datum: ST.tag, wunsch: $("wunsch").value });
  if (r) { toast("💡", "Ideen angefordert", r.hinweis || "Claude sucht …"); lokal.schreiben("studio-wunsch", $("wunsch").value); }
});
$("wunsch").value = lokal.lesen("studio-wunsch", "");
$("ideen").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-waehlen]");
  if (!b || b.disabled) return;
  await studioAktion("waehlen", { konto: ST.konto, datum: ST.tag, slot: b.dataset.waehlen, nr: Number(b.dataset.nr) });
});
$("slots").addEventListener("click", (e) => {
  const knopf = e.target.closest("[data-aktion]");
  if (knopf) return slotAktion(knopf.dataset.aktion, knopf.dataset.id);
  const karte = e.target.closest("[data-slot]");
  if (!karte) return;
  ST.slot = ST.slot === karte.dataset.slot ? null : karte.dataset.slot;
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
  if (knopf) slotAktion(knopf.dataset.aktion, knopf.dataset.id);
});

async function slotAktion(aktion, id) {
  const d = skriptDok(id);
  if (aktion === "lesen") {
    ST.slot = id;
    slotsZeichnen(); skriptZeichnen();
    $("skript").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (aktion === "neu") {
    textDialog({
      titel: "Neu schreiben lassen",
      hinweis: `„${d?.daten.titel}“: Was soll anders werden? Was du nicht kritisierst, bleibt möglichst gleich.`,
      knopf: "An Claude schicken",
      ok: async (kommentar) => {
        if (!kommentar) { toast("✏️", "Kommentar fehlt", "Schreib kurz, was anders werden soll", "problem"); return false; }
        return !!(await studioAktion("neu_schreiben", { id, kommentar }));
      },
    });
    return;
  }
  if (aktion === "verwerfen" && d?.daten.status !== "gewaehlt" && !confirm(`„${d?.daten.titel}“ verwerfen? Das Skript wird gelöscht.`)) return;
  const r = await studioAktion(aktion, { id });
  if (r && aktion === "freigeben") toast("✅", "Freigegeben", automatik().produktion ? "Die Produktion startet automatisch, sobald alle Skripte des Tages frei sind." : d?.daten.titel || "", "erfolg");
}

$("studio-leiste").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.automatik) { await studioAktion(b.dataset.automatik === "jetzt" ? "automatik_jetzt" : "automatik_halt", { konto: ST.konto, datum: ST.tag }); return; }
  if (b.id === "k-recherche") {
    const r = await studioAktion("recherchieren", { konto: ST.konto, datum: ST.tag });
    if (r) toast("🔎", "Recherche gestartet", `${r.slots.length} Skript(e) für ${KONTO_NAME[ST.konto]}`);
  }
  if (b.id === "k-uebergeben") {
    if (!confirm(`Alle freigegebenen Videos vom ${tagLabel(ST.tag)} jetzt an Claude übergeben?`)) return;
    const r = await studioAktion("uebergeben", { datum: ST.tag });
    if (r) toast("🚀", "Übergeben", r.produktion ? "Claude produziert jetzt" : "Produktion nicht angeschlossen", "erfolg");
  }
  if (b.id === "k-produktion") {
    const r = await studioAktion("produktion_starten", { datum: ST.tag });
    if (r) toast("🏭", "Produktion", r.laeuft_schon ? "Läuft schon, übernimmt die Videos" : `${r.ids.length} Video(s) gehen in Produktion`);
  }
  if (b.id === "k-produktion-stopp") {
    if (!confirm("Produktion wirklich stoppen? Fertige Teile bleiben erhalten, „Erneut versuchen“ setzt fort. Gestopptes wiederholt die Automatik nicht.")) return;
    const r = await post("/api/produktion/stopp", {});
    if (r.ok) toast("⏹", "Produktion gestoppt", "", "problem");
  }
});

function lernstandBearbeiten(konto) {
  const dok = doks("stand").find((d) => d.id === `lernstand-${PRAEFIX[konto]}`);
  textDialog({
    titel: `Lernstand ${KONTO_NAME[konto]}`,
    hinweis: `Fließt in jede Idee und jedes Skript. ${dok ? `Stand ${new Date(dok.daten.aktualisiert || dok.aktualisiert).toLocaleString("de-DE")} · ${dok.daten.quelle || ""}` : "Noch der Startwert aus befehle.json."}`,
    wert: dok?.daten.text || "",
    ok: async (text) => !!(await studioAktion("lernstand", { konto, text })),
  });
}
$("k-lernstand").addEventListener("click", () => lernstandBearbeiten(ST.konto));

// Meldungen aus der Datenbank (Skript fertig, Rückfrage, neue Ideen) als Hinweis und Aktivität
document.addEventListener("cockpit:db", (ev) => {
  const { e, alt } = ev.detail;
  if (e.geloescht) return;
  if (e.sammlung === "skripte") {
    const vorher = alt?.daten?.status, jetzt = e.daten.status;
    if (vorher === jetzt) return;
    const titel = e.daten.titel || e.id;
    if (jetzt === "skript_fertig") { toast("📜", "Skript fertig", `${titel} · bitte prüfen`); aktivitaet("📜", `Skript fertig: ${titel}`); }
    else if (jetzt === "fehler" || jetzt === "rueckfrage") { toast("⚠️", jetzt === "fehler" ? "Problem" : "Rückfrage", `${titel}: ${e.daten.fehler || ""}`.slice(0, 160), "problem"); aktivitaet("⚠️", `${jetzt === "fehler" ? "Fehler" : "Rückfrage"}: ${titel}`); }
    else if (jetzt === "geplant") { toast("📅", "In Buffer geplant", titel, "erfolg"); aktivitaet("📅", `Geplant: ${titel}`); }
    else if (jetzt === "gepostet") aktivitaet("🚀", `Online: ${titel}`);
    else if (jetzt === "recherche") aktivitaet("🔎", `Recherche: ${titel}`);
    else if (jetzt === "uebergeben") aktivitaet("🏭", `Übergeben: ${titel}`);
    else if (jetzt === "freigegeben") aktivitaet("✅", `Freigegeben: ${titel}`);
    else if (jetzt === "gewaehlt" && !alt) aktivitaet("👆", `Gewählt: ${titel}`);
  }
  if (e.sammlung === "ideen" && e.von === "claude") {
    toast("💡", "10 neue Ideen", `${KONTO_NAME[e.daten.konto] || e.daten.konto} · ${tagLabel(e.daten.datum)}`, "erfolg");
    aktivitaet("💡", `10 Ideen: ${KONTO_NAME[e.daten.konto] || e.daten.konto} · ${tagLabel(e.daten.datum)}`);
  }
});

zeichner("studio", studioZeichnen);
zeichner("*", studioPunkt);
