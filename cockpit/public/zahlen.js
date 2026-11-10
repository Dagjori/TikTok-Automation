"use strict";
// Zahlen (Konten, Ziele bis zum CRP, jedes Video), Lernen (Selbständigkeit, Lernschleife, Vorschläge, Lernstand),
// Radar, Meldungen (Hinweis im Cockpit + Windows-Benachrichtigung) und die Automatik-Schalter.

const ZS = { zahlen: null, verlauf: [], sortierung: lokal.lesen("video-sort", "gesendet"), lernschleife: null };
const KANAL_NAME = { simulierbar: "Simulierbar", "stelldirvor.pov": "Stell dir vor" };
const KONTO_KLASSE = { simulierbar: "acc1", stelldirvor: "acc2", "stelldirvor.pov": "acc2" };

function sparkline(werte, breite = 160, hoehe = 36) {
  if (werte.length < 2) return "";
  const min = Math.min(...werte), max = Math.max(...werte), span = Math.max(1, max - min);
  const pkt = werte.map((w, i) => `${(i / (werte.length - 1)) * breite},${hoehe - 3 - ((w - min) / span) * (hoehe - 6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${breite} ${hoehe}" preserveAspectRatio="none"><polygon points="0,${hoehe} ${pkt} ${breite},${hoehe}" /><polyline points="${pkt}" /></svg>`;
}
function plusHeute(kanal) {
  const p = ZS.zahlen?.profile?.[kanal];
  const heuteStart = ZS.verlauf.find((v) => v.kanal === kanal && v.zeit.slice(0, 10) === new Date().toISOString().slice(0, 10))?.follower;
  return p && heuteStart !== undefined ? p.follower - heuteStart : null;
}

function zahlenZeichnen() {
  const z = ZS.zahlen;
  if (!z) return htmlSetzen($("konten-karten"), '<div class="leer">Zahlen werden geladen …</div>');
  const zeit = (t) => (t ? new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–");
  $("zahlen-stand").textContent = `Profile ${zeit(z.letzte?.profile)} (alle ${z.takt?.profile_min} Min.) · Videos ${zeit(z.letzte?.videos)} (alle ${z.takt?.videos_min} Min.)`;
  const hinweise = [];
  if (!z.buffer) hinweise.push("Für die Zahlen je Video fehlt noch der Buffer-Schlüssel: In <code>C:\\render\\tiktok-automation\\pipeline\\render_dienst\\.env</code> eine Zeile <code>BUFFER_API_KEY=…</code> ergänzen (selbst eintragen), dann ♻.");
  if (z.gedrosselt_bis) hinweise.push(`TikTok drosselt gerade. Das Cockpit fragt die TikTok-Seiten erst ab ${zeit(z.gedrosselt_bis)} wieder ab (wird nie umgangen); Buffer läuft weiter.`);
  if (z.fehler?.profile) hinweise.push(`Profile: ${esc(z.fehler.profile)}`);
  if (z.fehler?.videos && z.buffer) hinweise.push(`Videos: ${esc(z.fehler.videos)}`);
  $("zahlen-hinweis").hidden = !hinweise.length;
  htmlSetzen($("zahlen-hinweis"), hinweise.join("<br>"));

  htmlSetzen($("konten-karten"), Object.entries(KANAL_NAME).map(([kanal, name]) => {
    const p = z.profile?.[kanal];
    const start = z.start?.[kanal]?.follower;
    const verlauf = ZS.verlauf.filter((v) => v.kanal === kanal).map((v) => v.follower);
    const plus = plusHeute(kanal);
    return `<div class="block konto-karte ${KONTO_KLASSE[kanal]}">
      <div class="konto-kopf"><b>${name}</b><small>@${kanal}</small></div>
      <div class="konto-zahl"><span>${p ? zahl(p.follower) : "–"}</span><small>Follower</small></div>
      <div class="konto-unter">${plus !== null ? `<span class="${plus > 0 ? "plus" : ""}">${plus >= 0 ? "+" : ""}${zahl(plus)} heute</span>` : ""}${p && start !== undefined ? `<span>${p.follower - start >= 0 ? "+" : ""}${zahl(p.follower - start)} seit Start</span>` : ""}</div>
      <div class="konto-mini" style="margin-top:6px"><span>❤️ ${p ? kurzZahl(p.likes) : "–"}</span><span>🎬 ${p ? zahl(p.videos) : "–"} Videos</span></div>
      ${sparkline(verlauf)}
    </div>`;
  }).join(""));

  htmlSetzen($("missionen"), Object.entries(z.missionen || {}).map(([konto, liste]) => `
    <div class="missionen-konto ${KONTO_KLASSE[konto]}"><h4>${konto === "stelldirvor" ? "Stell dir vor" : "Simulierbar"}</h4>
    ${liste.map((m) => {
      const prozent = Math.round(m.fortschritt * 100);
      const w = m.wert === null ? "–" : m.komma ? String(m.wert).replace(".", ",") : zahl(m.wert);
      return `<div class="mission ${m.erreicht ? "erreicht" : ""}" title="${esc(m.hinweis || "")}">
        <span class="mission-icon">${m.erreicht ? "🏅" : m.icon}</span>
        <div class="mission-text"><b>${esc(m.titel)}</b><small>${esc(m.gruppe)} · ${w} / ${m.komma ? String(m.ziel).replace(".", ",") : zahl(m.ziel)}${m.einheit ? " " + m.einheit : ""}${m.erreicht ? ` · geschafft ${new Date(m.erreicht).toLocaleDateString("de-DE")}` : ""}</small>
        <div class="mission-balken"><i style="width:${prozent}%"></i></div></div>
        <span class="mission-prozent">${prozent} %</span>
      </div>`;
    }).join("")}</div>`).join(""));

  const posts = [...(z.posts || [])];
  const s = ZS.sortierung;
  posts.sort((a, b) => (s === "gesendet" ? String(b.gesendet).localeCompare(String(a.gesendet)) : (b[s] ?? -1) - (a[s] ?? -1)));
  // Zielgröße seit 08.11.: Follower-Zuwachs 24 h nach dem Post, je 1.000 Aufrufe, Faktor gegen den Median der letzten 10 (Treffer ab 3×)
  const spalten = [["gesendet", "Gepostet"], ["views", "Views"], ["likes", "❤️"], ["kommentare", "💬"], ["shares", "↗"], ["saves", "🔖"], ["gesehen_prozent", "Ø gesehen"], ["plus24", "+👥 24 h"], ["je1000", "je 1.000"], ["treffer_faktor", "× Median"], ["trend", "Trend"]];
  const titel = { plus24: "Follower-Zuwachs in den 24 Stunden nach dem Post (netto; zwei Posts am Tag überlappen). ~ = geschätzt (Lücke im Verlauf)", je1000: "Follower je 1.000 Aufrufe: Zuwachs 24 h ÷ Aufrufe nach 24 h × 1.000", treffer_faktor: "Aufrufe nach 24 h ÷ Median der letzten 10 Videos des Accounts. Ab 3× = Treffer → Idee „Teil 2“" };
  const komma = (x) => String(x).replace(".", ",");
  const plus24 = (p) => {
    if (Number.isFinite(p.plus24)) return `<span class="${p.plus24 > 0 ? "plus" : ""}" title="${p.plus24_geschaetzt ? "geschätzt" : "gemessen"}">${p.plus24 > 0 ? "+" : ""}${zahl(p.plus24)}${p.plus24_geschaetzt ? " ~" : ""}</span>`;
    if (p.plus24_status === "laeuft") return `<small title="noch keine 24 Stunden">läuft${Number.isFinite(p.plus24_bisher) ? ` (${p.plus24_bisher >= 0 ? "+" : ""}${p.plus24_bisher})` : ""}</small>`;
    return "–";
  };
  const faktor = (p) => {
    if (!Number.isFinite(p.treffer_faktor)) return "–";
    const tipp = `${zahl(p.v24)} Aufrufe nach 24 h${p.v24_geschaetzt ? " (geschätzt)" : ""}, Median ${zahl(p.treffer_median)}${p.naechster_teil ? ` · Idee „Teil ${p.naechster_teil}“` : ""}`;
    return `<span title="${esc(tipp)}" class="${p.treffer ? "plus" : ""}">${p.treffer ? "🎯 " : ""}${komma(p.treffer_faktor)}×</span>`;
  };
  htmlSetzen($("video-tabelle"), posts.length ? `<table><thead><tr><th>Video</th>${spalten.map(([k, t]) => `<th data-sort="${k}" class="${s === k ? "aktiv" : ""}"${titel[k] ? ` title="${esc(titel[k])}"` : ""}>${t}</th>`).join("")}</tr></thead><tbody>
    ${posts.map((p) => {
      const g = p.gesehen_prozent;
      return `<tr>
        <td class="video-titel"><span class="chip ${KONTO_KLASSE[p.kanal]}">${KANAL_NAME[p.kanal] || p.kanal}</span> ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.titel.slice(0, 70))}</a>` : esc(p.titel.slice(0, 70))}</td>
        <td>${new Date(p.gesendet).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td class="gross">${zahl(p.views)}</td><td>${zahl(p.likes)}</td><td>${zahl(p.kommentare)}</td><td>${zahl(p.shares)}</td><td>${zahl(p.saves)}</td>
        <td>${g === null ? "–" : `<span class="gesehen" style="--p:${Math.min(100, g)}%">${g} %</span>`}</td>
        <td>${plus24(p)}</td>
        <td>${Number.isFinite(p.je1000) ? komma(p.je1000) : "–"}</td>
        <td>${faktor(p)}</td>
        <td>${p.trend ? `<span class="plus">+${zahl(p.trend)}</span>` : "–"}</td>
      </tr>`;
    }).join("")}</tbody></table>` : `<div class="leer">${z.buffer ? "Noch keine Videodaten. Der erste Abruf läuft in Kürze." : "Mit dem Buffer-Schlüssel erscheint hier jedes Video mit seinen Zahlen."}</div>`);
}
$("video-tabelle").addEventListener("click", (e) => {
  const th = e.target.closest("[data-sort]");
  if (!th) return;
  ZS.sortierung = th.dataset.sort;
  lokal.schreiben("video-sort", ZS.sortierung);
  zahlenZeichnen();
});
$("k-zahlen-jetzt").addEventListener("click", async () => {
  await post("/api/lernen", { aktion: "zahlen_jetzt" });
  toast("⟳", "Zahlen werden abgefragt", "schonend, dauert etwa eine Minute");
});
async function verlaufLaden() {
  try { ZS.verlauf = (await (await fetch("/api/zahlen/verlauf?tage=7")).json()).verlauf || []; } catch { ZS.verlauf = []; }
  planen("zahlen", "jetzt");
}

// ───────── Lernen ─────────
const BEREICH_ICON = { hook: "🪝", skript: "✍️", tempo: "⏱️", design: "🎨", animation: "✨", licht: "💡", ton: "🎧", caption: "🏷️", thema: "🧭", postingzeit: "🕐", technik: "🛠️" };
const VORSCHLAG_STATUS = { offen: ["wartet auf dich", "laeuft"], angenommen: ["wird umgesetzt", "laeuft"], probe: ["Probebilder ansehen", "laeuft"], probe_ok: ["wird umgesetzt", "laeuft"], umgesetzt: ["umgesetzt", "ok"], abgelehnt: ["abgelehnt", ""], fehler: ["Fehler", "fehler"] };

function lernenZeichnen() {
  const a = S.einstellungen?.autonomie || { modus: "freigabe" };
  const bis = a.testphase_bis ? Date.parse(a.testphase_bis) : null;
  const rest = bis ? Math.max(0, Math.ceil((bis - Date.now()) / 86400000)) : null;
  const anteil = bis && a.testphase_start ? Math.min(1, (Date.now() - Date.parse(a.testphase_start)) / (bis - Date.parse(a.testphase_start))) : 0;
  htmlSetzen($("autonomie-karte"), `
    <div class="block-kopf"><h2>Verbesserungen</h2><span class="chip ${a.modus === "autonom" ? "ok" : ""}">${a.modus === "autonom" ? "Claude entscheidet selbst" : "nur mit deiner Freigabe"}</span></div>
    ${a.modus === "autonom"
      ? `<p>Seit ${new Date(a.entschieden).toLocaleDateString("de-DE")} setzt Claude Vorschläge selbst um. Du bekommst zu jeder Umsetzung eine Meldung.</p><button class="knopf klein" data-autonomie="freigabe">Wieder nur mit Freigabe</button>`
      : bis
        ? `<p>Testwoche: noch <b>${rest} ${rest === 1 ? "Tag" : "Tage"}</b> (bis ${new Date(bis).toLocaleDateString("de-DE")}${a.verlaengert ? `, ${a.verlaengert}× verlängert` : ""}). Jeder Vorschlag braucht deine Freigabe.</p><div class="mission-balken"><i style="width:${Math.round(anteil * 100)}%"></i></div>`
        : "<p>Die Testwoche startet mit dem ersten Vorschlag der Lernschleife. Eine Woche lang gibst du jeden Vorschlag frei; danach fragt das Cockpit dich, ob Claude diesen Teil selbst übernehmen darf.</p>"}
    ${a.frage_offen ? `<div class="frage-karte"><b>Die Testwoche ist vorbei. Wie geht es weiter?</b><p>Wenn du die Vorschläge sinnvoll fandest, kann Claude sie ab jetzt ohne Freigabe umsetzen (du wirst weiter über jede Umsetzung benachrichtigt).</p>
      <div class="slot-knoepfe"><button class="knopf haupt-knopf" data-autonomie="autonom">Alles dir überlassen</button><button class="knopf" data-autonomie="verlaengern">1 Woche verlängern</button></div></div>` : ""}`);

  const e = S.einstellungen || {};
  const buffer = ZS.lernschleife?.buffer;
  const laeuft = !!ZS.lernschleife?.laeuft;
  htmlSetzen($("lernschleife-karte"), `
    <div class="block-kopf"><h2><span class="led ${laeuft ? "laeuft" : e.lernschleife_aktiv ? "an" : ""}"></span>Lernschleife</h2>${laeuft ? '<span class="chip laeuft">läuft</span>' : ""}</div>
    <p class="hinweis">Täglich um 19:52 holt das Cockpit die Zahlen, Claude wertet jedes Video einzeln aus, pflegt den Lernstand und schlägt Verbesserungen vor. Verpasst (Cockpit aus): beim nächsten Start.</p>
    ${!buffer ? '<div class="fehler-text">Braucht den Buffer-Schlüssel (BUFFER_API_KEY in der .env im Render-Klon).</div>' : ""}
    <label class="schalter"><span class="kipp"><input type="checkbox" id="lernschleife-aktiv" ${e.lernschleife_aktiv ? "checked" : ""} ${!buffer ? "disabled" : ""}><span></span></span> Täglich automatisch</label>
    <div class="hinweis">Zuletzt: ${esc(e.lernschleife_zuletzt || "noch nie im Cockpit")}</div>
    <div class="slot-knoepfe"><button class="knopf" id="k-lernschleife" ${!buffer || laeuft ? "disabled" : ""}>Jetzt auswerten</button></div>`);

  const liste = [...(S.db?.vorschlaege || [])].sort((x, y) => (x.daten.status === "offen" ? -1 : 0) - (y.daten.status === "offen" ? -1 : 0) || String(y.daten.datum || y.aktualisiert).localeCompare(String(x.daten.datum || x.aktualisiert)));
  htmlSetzen($("vorschlaege"), liste.length ? liste.map((v) => {
    const d = v.daten;
    const [stText, stKlasse] = VORSCHLAG_STATUS[d.status] || [d.status, ""];
    const b = d.begruendung || {};
    const bilder = (d.umsetzung?.probebilder || []).map((f) => `<img src="/api/vorschau?id=${encodeURIComponent(v.id)}&f=${encodeURIComponent(String(f).split(/[\\/]/).pop())}" alt="Probebild">`).join("");
    const knoepfe = d.status === "offen" || d.status === "fehler"
      ? `<button class="knopf klein gruen" data-vorschlag="annehmen" data-id="${v.id}">${d.status === "fehler" ? "Erneut umsetzen" : "Annehmen"}</button><button class="knopf klein rot" data-vorschlag="ablehnen" data-id="${v.id}">Ablehnen</button>`
      : d.status === "probe" ? `<button class="knopf klein gruen" data-vorschlag="probe_ok" data-id="${v.id}">Passt, umsetzen</button><button class="knopf klein rot" data-vorschlag="ablehnen" data-id="${v.id}">Verwerfen</button>` : "";
    return `<div class="vorschlag ${d.status === "offen" ? "offen" : ""}" data-vid="${v.id}">
      <div class="zeile"><span class="titel">${BEREICH_ICON[d.bereich] || "💡"} ${esc(d.titel)}</span><span class="chip ${stKlasse}">${esc(stText)}</span></div>
      <div class="unter"><span class="chip ${KONTO_KLASSE[d.konto] || ""}">${d.konto === "stelldirvor" ? "Stell dir vor" : d.konto === "simulierbar" ? "Simulierbar" : esc(d.konto || "")}</span><span>${esc(d.bereich || "")}</span><span>Priorität ${esc(d.prioritaet || "–")}</span><span>${esc(d.datum || "")}</span></div>
      <p class="vorschlag-text">${esc(d.vorschlag || "")}</p>
      <details><summary class="hinweis">Gedankengang (Messung → Schluss → Änderung)</summary><div class="vorschlag-text"><b>Messung:</b> ${esc(b.messung || "–")}<br><b>Schluss:</b> ${esc(b.schluss || "–")}<br><b>Änderung:</b> ${esc(b.aenderung || "–")}${d.betrifft ? `<br><b>Betrifft:</b> ${esc(d.betrifft)}` : ""}${d.risiko ? `<br><b>Risiko:</b> ${esc(d.risiko)}` : ""}${d.belege?.length ? `<br><b>Belege:</b> ${esc(d.belege.join(", "))}` : ""}</div></details>
      ${bilder ? `<div class="probebilder">${bilder}</div>` : ""}
      ${d.umsetzung?.notiz ? `<div class="hinweis">✔ ${esc(d.umsetzung.notiz)}${d.umsetzung.commit ? ` (${esc(d.umsetzung.commit)})` : ""}</div>` : ""}
      ${d.umsetzung?.fehler ? `<div class="fehler-text">${esc(d.umsetzung.fehler)}</div>` : ""}
      <div class="slot-knoepfe">${knoepfe}</div>
    </div>`;
  }).join("") : '<div class="leer">Noch keine Vorschläge. Sie entstehen in der Lernschleife aus den Zahlen jedes Videos.</div>');

  htmlSetzen($("lernstand-inhalt"), ["simulierbar", "stelldirvor"].map((konto) => {
    const dok = doks("stand").find((d) => d.id === `lernstand-${PRAEFIX[konto]}`);
    const stand = dok ? `Stand ${new Date(dok.daten.aktualisiert || dok.aktualisiert).toLocaleString("de-DE")}${dok.daten.quelle ? ` · ${esc(dok.daten.quelle)}` : ""}` : "Noch der Startwert aus befehle.json";
    return `<div class="lernstand-karte"><div class="zeile"><span class="chip ${PRAEFIX[konto]}">${esc(KONTO_NAME[konto])}</span><small>${stand}</small><button class="knopf klein" data-lernstand="${konto}">Bearbeiten</button></div>
      <div class="lernstand-text">${esc(dok?.daten.text || "Noch kein Lernstand.")}</div></div>`;
  }).join(""));
}
function lernenPunkt() {
  const n = (S.db?.vorschlaege || []).filter((v) => ["offen", "probe"].includes(v.daten.status)).length + (S.einstellungen?.autonomie?.frage_offen ? 1 : 0);
  $("punkt-lernen").hidden = !n;
  $("punkt-lernen").textContent = n;
  document.querySelector('#nav a[data-seite="lernen"]').classList.toggle("arbeitet", !!ZS.lernschleife?.laeuft || ["lernschleife", "vorschlag_umsetzen"].includes(S.claude?.aktiv?.art));
}
$("seite-lernen").addEventListener("click", async (e) => {
  const v = e.target.closest("[data-vorschlag]");
  if (v) {
    let kommentar = "";
    if (v.dataset.vorschlag === "ablehnen") kommentar = prompt("Warum lehnst du ab? (optional, hilft Claude beim Lernen)") ?? "";
    const r = await post("/api/lernen", { aktion: "entscheiden", id: v.dataset.id, wahl: v.dataset.vorschlag, kommentar });
    if (!r.ok) toast("⚠️", "Vorschlag", r.fehler || "nicht möglich", "problem");
    return;
  }
  const a = e.target.closest("[data-autonomie]");
  if (a) {
    const wahl = a.dataset.autonomie;
    if (wahl === "autonom" && !confirm("Claude setzt Verbesserungen ab jetzt ohne deine Freigabe um. Du wirst über jede Umsetzung benachrichtigt und kannst das jederzeit zurücknehmen. Einverstanden?")) return;
    const r = await post("/api/lernen", { aktion: "autonomie", wahl });
    if (r.ok) { S.einstellungen.autonomie = r.autonomie; planen("lernen"); }
    return;
  }
  const l = e.target.closest("[data-lernstand]");
  if (l) return lernstandBearbeiten(l.dataset.lernstand);
  if (e.target.id === "k-lernschleife") {
    const r = await post("/api/lernen", { aktion: "lernschleife" });
    if (!r.ok) toast("⚠️", "Lernschleife", r.fehler || "nicht möglich", "problem");
    else toast("🧠", "Lernschleife gestartet", "Zahlen holen, dann wertet Claude jedes Video aus");
  }
});
$("seite-lernen").addEventListener("change", async (e) => {
  if (e.target.id !== "lernschleife-aktiv") return;
  await post("/api/lernen", { aktion: "aktiv", wert: e.target.checked });
  S.einstellungen.lernschleife_aktiv = e.target.checked;
});

// ───────── Radar ─────────
const offeneTrends = () => (S.plan?.vorschlaege || []).filter((v) => !v.status || v.status === "neu").sort((a, b) => b.score - a.score);
function radarZeichnen() {
  const radar = offeneTrends();
  htmlSetzen($("radar"), radar.length
    ? radar.map((v) => `<div class="karte" data-radar="${esc(v.titel)}"><div class="zeile"><span class="titel">${esc(v.titel.replace(/^\S+\s/, ""))}</span><span class="score">${v.score}</span></div><div class="unter">${esc(v.posten)}</div></div>`).join("")
    : `<div class="karte leer-karte">Keine offenen Vorschläge.</div>`);
}
$("radar").addEventListener("click", (e) => {
  const k = e.target.closest("[data-radar]");
  if (k) eingabeVorbelegen(`Bewerte den Radar-Vorschlag „${k.dataset.radar}“ aus docs/trends/vorschlaege.md: Passt er für morgen? Kurzfazit in 4 Zeilen.`);
});
function radarPunkt() {
  const n = offeneTrends().length;
  $("punkt-radar").hidden = !n;
  $("punkt-radar").textContent = n;
}

// ───────── Meldungen ─────────
const MELDUNG_ICON = { vorschlag: "💡", umgesetzt: "🛠️", fehler: "⚠️", erfolg: "🎯", frage: "❓", info: "ℹ️" };
const meldungen = () => [...(S.db?.meldungen || [])].sort((a, b) => String(b.daten.zeit).localeCompare(String(a.daten.zeit)));
function meldungenZeichnen() {
  const liste = meldungen();
  const ungelesen = liste.filter((m) => !m.daten.gelesen).length;
  $("punkt-meldungen").hidden = !ungelesen;
  $("punkt-meldungen").textContent = ungelesen;
  if ($("meldungen-panel").hidden) return;
  htmlSetzen($("meldungen-liste"), liste.length ? liste.slice(0, 40).map((m) => {
    const d = m.daten;
    return `<div class="meldung ${d.gelesen ? "" : "neu"}" data-mid="${m.id}" data-ziel='${esc(JSON.stringify(d.ziel || {}))}'>
      <span>${MELDUNG_ICON[d.art] || "🔔"}</span>
      <div><b>${esc(d.titel)}</b>${d.text ? `<small>${esc(d.text.slice(0, 220))}</small>` : ""}<small class="zeit">${new Date(d.zeit).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small></div>
    </div>`;
  }).join("") : '<div class="leer">Keine Meldungen.</div>');
}
$("k-meldungen").addEventListener("click", (e) => {
  e.stopPropagation();
  $("meldungen-panel").hidden = !$("meldungen-panel").hidden;
  meldungenZeichnen();
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
});
$("k-alle-gelesen").addEventListener("click", () => post("/api/meldungen", { aktion: "alle_gelesen" }));
$("meldungen-liste").addEventListener("click", async (e) => {
  const m = e.target.closest("[data-mid]");
  if (!m) return;
  await post("/api/meldungen", { aktion: "gelesen", id: m.dataset.mid });
  let ziel = {};
  try { ziel = JSON.parse(m.dataset.ziel); } catch { ziel = {}; }
  if (ziel.ansicht) ansichtSetzen(ziel.ansicht);
  if (ziel.id) setTimeout(() => document.querySelector(`[data-vid="${CSS.escape(ziel.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 250);
  $("meldungen-panel").hidden = true;
});
document.addEventListener("click", (e) => {
  if (!$("meldungen-panel").hidden && !e.target.closest("#meldungen-panel, #k-meldungen")) $("meldungen-panel").hidden = true;
});
function neueMeldung(doc) {
  const d = doc.daten;
  toast(MELDUNG_ICON[d.art] || "🔔", d.titel, (d.text || "").slice(0, 140), d.art === "fehler" || d.art === "frage" ? "problem" : d.art === "erfolg" ? "erfolg" : "");
  aktivitaet(MELDUNG_ICON[d.art] || "🔔", d.titel);
  if ("Notification" in window && Notification.permission === "granted" && (document.hidden || !document.hasFocus())) {
    try {
      const n = new Notification(`TikTok Cockpit · ${d.titel}`, { body: (d.text || "").slice(0, 180), icon: "icon.svg", tag: doc.id });
      n.onclick = () => { window.focus(); if (d.ziel?.ansicht) ansichtSetzen(d.ziel.ansicht); n.close(); };
    } catch { /* nicht erlaubt */ }
  }
}

// ───────── Automatik-Schalter (Einstellungen, gelten für alle Rechner) ─────────
const AUTOMATIK_TEXT = [
  ["recherche", "Recherche sofort nach Wahl", "Wählst du eine Idee, startet Recherche und Skript von selbst (beide Slots gewählt: nach 15 s, sonst nach 3 Min.)."],
  ["produktion", "Produktion sofort nach Freigabe", "Sind alle Skripte eines Tages freigegeben, startet die Produktion nach 60 s von selbst."],
  ["ideen", "Ideen jeden Morgen bereit", "Claude erzeugt täglich die Ideen für morgen in beiden Accounts."],
  ["wiederholen", "Fehler einmal selbst wiederholen", "Bricht Recherche, Nachprüfung oder Produktion ab, versucht das Cockpit es nach 5 Min. noch einmal (bei einem Nutzungslimit kurz nach dem Reset). Was du selbst stoppst, bleibt gestoppt."],
];
// Autopilot (Ausbau 10.11., Standard aus): [Schalter, Feld der Frist, Titel, Text]
const AUTOPILOT_TEXT = [
  ["auto_wahl", "auto_wahl_frist_min", "Ideen selbst wählen", "Wählst du nach der Frist nicht, wählt das Cockpit: zuerst Folgeteile eigener Treffer, dann die höchsten Punkte, nie zwei Ideen aus demselben Themenfeld am selben Tag. Du kannst die Wahl ändern, bis die Recherche startet (10 Min.)."],
  ["auto_freigabe", "auto_freigabe_frist_min", "Geprüfte Skripte selbst freigeben", "Nach der Frist gibt das Cockpit ein Skript nur frei, wenn die Selbstprüfung keinen offenen Punkt hat, die Zahlen Quellen haben, die Originalität geprüft ist und (Simulierbar) der Sprechtext die Text-Vorprüfung besteht. Sonst wartet es auf dich."],
];
const MELDEN_TEXT = [
  ["ideen", "Ideen sind bereit"], ["skript", "Skript wartet auf deine Freigabe"], ["rueckfrage", "Rückfrage"], ["fehler", "Fehler nach dem letzten Versuch"],
  ["video", "Video geplant bzw. gepostet"], ["treffer", "Treffer"], ["tagesabschluss", "Tagesabschluss (eine Zeile am Abend)"],
];
function automatikZeichnen() {
  const a = automatik();
  htmlSetzen($("automatik-schalter"), AUTOMATIK_TEXT.map(([k, titel, text]) => `<div class="schalter-zeile"><div><b>${titel}</b><small>${text}</small>${k === "ideen" ? `<input type="time" data-uhrzeit value="${esc(a.ideen_uhrzeit)}">` : ""}</div><label class="kipp"><input type="checkbox" data-automatik="${k}" ${a[k] ? "checked" : ""}><span></span></label></div>`).join(""));
  htmlSetzen($("autopilot-schalter"), AUTOPILOT_TEXT.map(([k, frist, titel, text]) => `<div class="schalter-zeile"><div><b>${titel}</b><small>${text}</small><span class="frist"><input type="number" min="1" max="2880" step="1" data-frist="${frist}" value="${esc(a[frist])}"> Minuten Frist</span></div><label class="kipp"><input type="checkbox" data-automatik="${k}" ${a[k] ? "checked" : ""}><span></span></label></div>`).join(""));
  const m = meldenEinstellung();
  $("handy-stand").textContent = S.handy?.eingerichtet ? "Telegram ist eingerichtet" : "Telegram ist noch nicht eingerichtet (siehe cockpit/README.md)";
  htmlSetzen($("melden-schalter"),
    `<div class="schalter-zeile"><div><b>Meldungen per Telegram</b><small>Ohne TELEGRAM_BOT_TOKEN und TELEGRAM_CHAT_ID passiert nichts. Die Meldungen im Cockpit bleiben immer.</small>${S.handy?.eingerichtet ? '<button class="knopf klein" data-melden-test style="margin-top:6px">Probe senden</button>' : ""}</div><label class="kipp"><input type="checkbox" data-melden="aktiv" ${m.aktiv ? "checked" : ""}><span></span></label></div>`
    + MELDEN_TEXT.map(([k, titel]) => `<div class="schalter-zeile kompakt"><div><b>${titel}</b>${k === "tagesabschluss" ? `<input type="time" data-abschluss value="${esc(m.tagesabschluss_uhrzeit)}">` : ""}</div><label class="kipp"><input type="checkbox" data-melden="${k}" ${m[k] ? "checked" : ""}><span></span></label></div>`).join(""));
}
async function meldenSpeichern(neu) {
  const r = await post("/api/einstellungen", { schluessel: "melden", wert: { ...meldenEinstellung(), ...neu } });
  if (!r.ok) toast("⚠️", "Handy-Meldungen", r.fehler || "Speichern nicht möglich (Cockpit nach dem Update neu starten?)", "problem");
}
async function automatikSpeichern(neu) {
  const r = await post("/api/einstellungen", { schluessel: "automatik", wert: { ...automatik(), ...neu } });
  if (!r.ok) toast("⚠️", "Automatik", r.fehler || "Speichern nicht möglich (Cockpit nach dem Update neu starten?)", "problem");
}
$("k-einstellungen").addEventListener("click", () => { automatikZeichnen(); $("einstellungen-dialog").showModal(); });
$("automatik-schalter").addEventListener("change", (e) => {
  if (e.target.dataset.automatik) automatikSpeichern({ [e.target.dataset.automatik]: e.target.checked });
  if (e.target.dataset.uhrzeit !== undefined && /^\d\d:\d\d$/.test(e.target.value)) automatikSpeichern({ ideen_uhrzeit: e.target.value });
});
$("autopilot-schalter").addEventListener("change", (e) => {
  if (e.target.dataset.automatik) automatikSpeichern({ [e.target.dataset.automatik]: e.target.checked });
  const n = Number(e.target.value);
  if (e.target.dataset.frist) { if (Number.isInteger(n) && n >= 1 && n <= 2880) automatikSpeichern({ [e.target.dataset.frist]: n }); else toast("⚠️", "Frist", "Ganze Minuten von 1 bis 2880", "problem"); }
});
$("melden-schalter").addEventListener("change", (e) => {
  if (e.target.dataset.melden) meldenSpeichern({ [e.target.dataset.melden]: e.target.checked });
  if (e.target.dataset.abschluss !== undefined && /^\d\d:\d\d$/.test(e.target.value)) meldenSpeichern({ tagesabschluss_uhrzeit: e.target.value });
});
$("melden-schalter").addEventListener("click", async (e) => {
  if (!e.target.closest("[data-melden-test]")) return;
  const r = await post("/api/melden/test");
  toast(r.ok ? "📱" : "⚠️", r.ok ? "Probe gesendet" : "Probe nicht gesendet", r.ok ? "Schau auf dein Handy." : r.fehler || "", r.ok ? "erfolg" : "problem");
});

// ───────── Ereignisse ─────────
beiEreignis("zustand", (z) => { ZS.zahlen = z.zahlen || null; ZS.lernschleife = z.lernschleife || null; verlaufLaden(); });
beiEreignis("zahlen", (z) => { ZS.zahlen = z; planen("zahlen", "jetzt"); });
beiEreignis("zahlen_puls", (z) => {
  if (z.art === "follower") aktivitaet("👥", `+${zahl(z.plus)} Follower · ${KANAL_NAME[z.kanal] || z.kanal}`);
  else if (z.art === "views") aktivitaet("👀", `+${zahl(z.plus)} Views · ${String(z.titel || "").slice(0, 60)}`);
});
beiEreignis("lernschleife", (l) => { ZS.lernschleife = { ...(ZS.lernschleife || {}), laeuft: l.laeuft }; planen("lernen"); if (l.laeuft) aktivitaet("🧠", "Lernschleife läuft"); });
beiEreignis("meldung", (doc) => neueMeldung(doc));
beiEreignis("mission_erreicht", (m) => toast("🎯", "Ziel erreicht", `${m.mission?.titel || ""}`, "erfolg"));
beiEreignis("steuerung", (s) => { if (s.ansicht) ansichtSetzen(s.ansicht); });
beiEreignis("einstellungen", () => { if ($("einstellungen-dialog").open) automatikZeichnen(); });
document.addEventListener("cockpit:seite", (e) => { if (e.detail === "zahlen") verlaufLaden(); });
setInterval(() => { if (S.seite === "zahlen") planen("zahlen"); }, 60000);

zeichner("zahlen", zahlenZeichnen);
zeichner("lernen", lernenZeichnen);
zeichner("radar", radarZeichnen);
zeichner("*", () => { lernenPunkt(); radarPunkt(); meldungenZeichnen(); });
