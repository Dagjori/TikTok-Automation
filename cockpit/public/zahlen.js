"use strict";
// Zahlen (Konten, Ziele bis zum CRP, jedes Video), Lernen (Lernschleife, Vorschläge, Testwoche), Meldungen (Push) und Render-Dienst.
// Nutzt S, $, esc, post, Ton, P, toast, mitte, zahl, kurzZahl, lokal, hochzaehlen aus cockpit.js, Spiel aus spiel.js.

const ZS = { zahlen: null, dienst: null, verlauf: [], sortierung: lokal.lesen("video-sort", "gesendet"), autonomieFrage: false };
const KANAL_NAME = { simulierbar: "Simulierbar", "stelldirvor.pov": "Stell dir vor" };
const KONTO_KLASSE = { simulierbar: "acc1", stelldirvor: "acc2", "stelldirvor.pov": "acc2" };

// ───────── Render-Dienst ─────────

const DIENST_STATUS = { aus: ["aus", ""], startet: ["startet …", "laeuft"], laeuft: ["läuft", "ok"], neustart: ["Neustart …", "laeuft"], fremd: ["altes Fenster aktiv", "fehler"], fehler: ["Fehler", "fehler"] };
function dienstZeichnen() {
  const d = ZS.dienst;
  if (!d || !$("dienst-karte")) return;
  // Rechner, auf dem der Dienst eigenständig über die Aufgabenplanung läuft (Desktop-PC, Entscheidung 03.11.): nur anzeigen,
  // nie starten oder übernehmen (der Server lehnt das dort auch ab); nur ein versehentlich im Cockpit gestarteter lässt sich anhalten
  const laeuft = ["laeuft", "startet", "neustart"].includes(d.status);
  const nurAnzeigen = S.einstellungen?.dienst_autostart === false;
  if (nurAnzeigen && !laeuft) {
    const hier = (S.render?.rechner || []).find((r) => r.lokal);
    const st = hier?.online ? (hier.daten?.status === "rendert" ? `rendert ${Math.round(hier.daten.prozent || 0)} %` : "läuft eigenständig") : "kein Herzschlag";
    $("dienst-karte").innerHTML = `
      <div class="zeile"><span class="titel"><span class="punkt ${hier?.online ? "an" : ""}"></span> Render-Dienst</span><span class="chip ${hier?.online ? "ok" : "fehler"}">${esc(st)}</span></div>
      <div class="hinweis">Läuft auf diesem Rechner über die Aufgabenplanung, unabhängig vom Cockpit: Er rendert auch, wenn das Cockpit zu ist.</div>`;
    return;
  }
  const [text, klasse] = DIENST_STATUS[d.status] || [d.status, ""];
  const zeilen = (d.zeilen || []).slice(-4).map((z) => `<div class="dz ${esc(z.art)}">${esc(z.text.replace(/^\d\d:\d\d:\d\d\s*/, ""))}</div>`).join("");
  $("dienst-karte").innerHTML = `
    <div class="zeile"><span class="titel"><span class="punkt ${d.status === "laeuft" ? "an" : ""}"></span> Render-Dienst</span><span class="chip ${klasse}">${esc(text)}</span></div>
    ${d.hinweis ? `<div class="slot-fehler">${esc(d.hinweis)}</div>` : ""}
    ${nurAnzeigen ? '<div class="slot-fehler">Dieser Dienst wurde im Cockpit gestartet. Auf diesem Rechner läuft er sonst eigenständig über die Aufgabenplanung: bitte anhalten.</div>' : ""}
    <div class="dienst-zeilen" title="Klicken für die ganze Konsole">${zeilen || '<div class="dz">noch keine Ausgabe</div>'}</div>
    <div class="slot-knoepfe">
      ${laeuft ? '<button class="knopf klein rot" data-dienst="aus">⏹ Anhalten</button>' : '<button class="knopf klein" data-dienst="an">▶ Starten</button>'}
      ${d.status === "fremd" ? '<button class="knopf klein glanz" data-dienst="uebernehmen">⤵ Übernehmen</button>' : ""}
      <button class="knopf klein" data-konsole>🖥️ Konsole</button>
    </div>`;
}
$("dienst-karte").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-dienst]");
  if (b) {
    if (b.dataset.dienst === "aus" && !confirm("Render-Dienst anhalten? Läuft gerade ein Auftrag, setzt der Dienst ihn beim nächsten Start fort.")) return;
    Spiel.klang.terminal();
    const r = await post("/api/dienst", { aktion: b.dataset.dienst });
    if (!r.ok) toast("⚠️", "Render-Dienst", r.fehler || "nicht möglich", "problem");
    return;
  }
  if (e.target.closest("[data-konsole], .dienst-zeilen")) konsoleOeffnen();
});
function konsoleOeffnen() {
  $("konsole").textContent = (ZS.dienst?.zeilen || []).map((z) => `${new Date(z.zeit).toLocaleTimeString("de-DE")}  ${z.text}`).join("\n");
  $("konsole-dialog").showModal();
  $("konsole").scrollTop = $("konsole").scrollHeight;
  Spiel.klang.terminal();
}
$("konsole-dialog").querySelector("[data-zu]").addEventListener("click", () => $("konsole-dialog").close());

// ───────── Zahlen ─────────

function sparkline(werte, breite = 160, hoehe = 36) {
  if (werte.length < 2) return "";
  const min = Math.min(...werte), max = Math.max(...werte), span = Math.max(1, max - min);
  const pkt = werte.map((w, i) => `${(i / (werte.length - 1)) * breite},${hoehe - 3 - ((w - min) / span) * (hoehe - 6)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${breite} ${hoehe}" preserveAspectRatio="none"><polyline points="${pkt}" /><polygon points="0,${hoehe} ${pkt} ${breite},${hoehe}" /></svg>`;
}

function zahlenZeichnen() {
  const z = ZS.zahlen;
  if (!z || $("zahlen").hidden) return;
  const zeit = (t) => (t ? new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "–");
  $("zahlen-stand").textContent = `· Profile ${zeit(z.letzte?.profile)} (alle ${z.takt?.profile_min} Min.) · Videos ${zeit(z.letzte?.videos)} (alle ${z.takt?.videos_min} Min.)`;
  const hinweise = [];
  if (!z.buffer) hinweise.push("🔑 Für die Zahlen je Video fehlt noch der Buffer-Schlüssel: In <code>C:\\render\\tiktok-automation\\pipeline\\render_dienst\\.env</code> eine Zeile <code>BUFFER_API_KEY=…</code> ergänzen (selbst eintragen), dann ♻. Follower und Likes der Konten laufen schon.");
  if (z.gedrosselt_bis) hinweise.push(`⏸️ TikTok drosselt gerade. Das Cockpit fragt die TikTok-Seiten erst ab ${zeit(z.gedrosselt_bis)} wieder ab (wird nie umgangen); Buffer läuft weiter.`);
  if (z.fehler?.profile) hinweise.push(`⚠️ Profile: ${esc(z.fehler.profile)}`);
  if (z.fehler?.videos && z.buffer) hinweise.push(`⚠️ Videos: ${esc(z.fehler.videos)}`);
  $("zahlen-hinweis").hidden = !hinweise.length;
  $("zahlen-hinweis").innerHTML = hinweise.join("<br>");

  // Konten
  $("konten-karten").innerHTML = Object.entries(KANAL_NAME).map(([kanal, name]) => {
    const p = z.profile?.[kanal];
    const start = z.start?.[kanal]?.follower;
    const verlauf = ZS.verlauf.filter((v) => v.kanal === kanal).map((v) => v.follower);
    const heuteStart = ZS.verlauf.find((v) => v.kanal === kanal && v.zeit.slice(0, 10) === new Date().toISOString().slice(0, 10))?.follower;
    const plusHeute = p && heuteStart !== undefined ? p.follower - heuteStart : null;
    return `<div class="konto-karte ${KONTO_KLASSE[kanal]}">
      <div class="konto-kopf"><b>${name}</b><small>@${kanal}</small></div>
      <div class="konto-zahl"><span data-zahl="${p?.follower ?? ""}">${p ? zahl(p.follower) : "–"}</span><small>Follower</small></div>
      <div class="konto-unter">${plusHeute !== null ? `<span class="${plusHeute > 0 ? "plus" : ""}">${plusHeute >= 0 ? "+" : ""}${zahl(plusHeute)} heute</span>` : ""}${p && start !== undefined ? `<span>${p.follower - start >= 0 ? "+" : ""}${zahl(p.follower - start)} seit Start</span>` : ""}</div>
      <div class="konto-mini"><span>❤️ ${p ? kurzZahl(p.likes) : "–"}</span><span>🎬 ${p ? zahl(p.videos) : "–"} Videos</span></div>
      ${sparkline(verlauf)}
    </div>`;
  }).join("");
  document.querySelectorAll("#konten-karten [data-zahl]").forEach((el) => el.dataset.zahl && hochzaehlen(el, Number(el.dataset.zahl)));

  // Missionen
  $("missionen").innerHTML = Object.entries(z.missionen || {}).map(([konto, liste]) => `
    <div class="missionen-konto ${KONTO_KLASSE[konto]}"><h4>${konto === "stelldirvor" ? "Stell dir vor" : "Simulierbar"}</h4>
    ${liste.map((m) => {
      const prozent = Math.round(m.fortschritt * 100);
      const wert = m.wert === null ? "–" : m.komma ? String(m.wert).replace(".", ",") : zahl(m.wert);
      return `<div class="mission ${m.erreicht ? "erreicht" : ""}" title="${esc(m.hinweis || "")}">
        <span class="mission-icon">${m.erreicht ? "🏅" : m.icon}</span>
        <div class="mission-text"><b>${esc(m.titel)}</b><small>${esc(m.gruppe)} · ${wert} / ${m.komma ? String(m.ziel).replace(".", ",") : zahl(m.ziel)}${m.einheit ? " " + m.einheit : ""}${m.erreicht ? ` · geschafft ${new Date(m.erreicht).toLocaleDateString("de-DE")}` : ""}</small>
        <div class="mission-balken"><i style="width:${prozent}%"></i></div></div>
        <span class="mission-prozent">${prozent} %</span>
      </div>`;
    }).join("")}</div>`).join("");

  // Jedes Video
  const posts = [...(z.posts || [])];
  const s = ZS.sortierung;
  posts.sort((a, b) => (s === "gesendet" ? String(b.gesendet).localeCompare(String(a.gesendet)) : (b[s] ?? -1) - (a[s] ?? -1)));
  const spalten = [["gesendet", "Gepostet"], ["views", "👀 Views"], ["likes", "❤️"], ["kommentare", "💬"], ["shares", "↗"], ["saves", "🔖"], ["gesehen_prozent", "Ø gesehen"], ["follows", "+👥"], ["trend", "Trend"]];
  $("video-tabelle").innerHTML = posts.length ? `<table><thead><tr><th>Video</th>${spalten.map(([k, t]) => `<th data-sort="${k}" class="${s === k ? "aktiv" : ""}">${t}</th>`).join("")}</tr></thead><tbody>
    ${posts.map((p) => {
      const g = p.gesehen_prozent;
      return `<tr class="${KONTO_KLASSE[p.kanal]}">
        <td class="video-titel"><span class="chip ${KONTO_KLASSE[p.kanal]}">${KANAL_NAME[p.kanal] || p.kanal}</span> ${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.titel.slice(0, 70))}</a>` : esc(p.titel.slice(0, 70))}</td>
        <td>${new Date(p.gesendet).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td class="gross">${zahl(p.views)}</td><td>${zahl(p.likes)}</td><td>${zahl(p.kommentare)}</td><td>${zahl(p.shares)}</td><td>${zahl(p.saves)}</td>
        <td>${g === null ? "–" : `<span class="gesehen" style="--p:${Math.min(100, g)}%">${g} %</span>`}</td>
        <td>${p.follows ?? "–"}</td>
        <td>${p.trend ? `<span class="plus">+${zahl(p.trend)}</span>` : "–"}</td>
      </tr>`;
    }).join("")}</tbody></table>` : `<div class="leer-gross"><b>🎬</b>${z.buffer ? "Noch keine Videodaten. Der erste Abruf läuft in Kürze." : "Mit dem Buffer-Schlüssel erscheint hier jedes Video mit seinen Zahlen."}</div>`;
}
$("video-tabelle").addEventListener("click", (e) => {
  const th = e.target.closest("[data-sort]");
  if (!th) return;
  ZS.sortierung = th.dataset.sort;
  lokal.schreiben("video-sort", ZS.sortierung);
  Ton.klick();
  zahlenZeichnen();
});
$("k-zahlen-jetzt").addEventListener("click", async (e) => {
  Spiel.klang.scanner();
  P.funken(...mitte(e.currentTarget), 16);
  await post("/api/lernen", { aktion: "zahlen_jetzt" });
  toast("⟳", "Zahlen werden abgefragt", "schonend, dauert etwa eine Minute", "meilenstein");
});
async function verlaufLaden() {
  try { ZS.verlauf = (await (await fetch("/api/zahlen/verlauf?tage=7")).json()).verlauf || []; } catch { ZS.verlauf = []; }
  zahlenZeichnen();
}

// ───────── Lernen: Testwoche, Lernschleife, Vorschläge ─────────

const BEREICH_ICON = { hook: "🪝", skript: "✍️", tempo: "⏱️", design: "🎨", animation: "✨", licht: "💡", ton: "🎧", caption: "🏷️", thema: "🧭", postingzeit: "🕐", technik: "🛠️" };
const VORSCHLAG_STATUS = { offen: ["wartet auf dich", "laeuft"], angenommen: ["wird umgesetzt", "laeuft"], probe: ["Probebilder ansehen", "laeuft"], probe_ok: ["wird umgesetzt", "laeuft"], umgesetzt: ["umgesetzt", "ok"], abgelehnt: ["abgelehnt", ""], fehler: ["Fehler", "fehler"] };

function lernenZeichnen() {
  if ($("lernen").hidden) return;
  const a = S.einstellungen?.autonomie || { modus: "freigabe" };
  const bis = a.testphase_bis ? Date.parse(a.testphase_bis) : null;
  const rest = bis ? Math.max(0, Math.ceil((bis - Date.now()) / 86400000)) : null;
  const anteil = bis && a.testphase_start ? Math.min(1, (Date.now() - Date.parse(a.testphase_start)) / (bis - Date.parse(a.testphase_start))) : 0;
  $("autonomie-karte").innerHTML = `
    <h3>Verbesserungen: ${a.modus === "autonom" ? "Claude entscheidet selbst" : "nur mit deiner Freigabe"}</h3>
    ${a.modus === "autonom"
      ? `<p>Seit ${new Date(a.entschieden).toLocaleDateString("de-DE")} setzt Claude Vorschläge selbst um. Du bekommst zu jeder Umsetzung eine Meldung.</p><button class="knopf klein" data-autonomie="freigabe">↩ Wieder nur mit Freigabe</button>`
      : bis
        ? `<p>Testwoche: noch <b>${rest} ${rest === 1 ? "Tag" : "Tage"}</b> (bis ${new Date(bis).toLocaleDateString("de-DE")}${a.verlaengert ? `, ${a.verlaengert}× verlängert` : ""}). Jeder Vorschlag braucht deine Freigabe.</p><div class="mission-balken"><i style="width:${Math.round(anteil * 100)}%"></i></div>`
        : "<p>Die Testwoche startet mit dem ersten Vorschlag der Lernschleife. Eine Woche lang gibst du jeden Vorschlag frei; danach fragt das Cockpit dich, ob Claude diesen Teil selbst übernehmen darf.</p>"}
    ${a.frage_offen ? `<div class="frage-karte"><b>⏰ Die Testwoche ist vorbei. Wie geht es weiter?</b><p>Wenn du die Vorschläge sinnvoll fandest, kann Claude sie ab jetzt ohne Freigabe umsetzen (du wirst weiter über jede Umsetzung benachrichtigt).</p>
      <div class="slot-knoepfe"><button class="knopf glanz" data-autonomie="autonom">✅ Alles dir überlassen</button><button class="knopf" data-autonomie="verlaengern">⏳ 1 Woche verlängern</button></div></div>` : ""}`;

  const e = S.einstellungen || {};
  const buffer = S.lernschleife?.buffer;
  $("lernschleife-karte").innerHTML = `
    <h3>Lernschleife ${S.lernschleife?.laeuft ? '<span class="chip laeuft">läuft</span>' : ""}</h3>
    <p>Täglich um 19:52 holt das Cockpit die Zahlen, Claude wertet jedes Video einzeln aus (Zahlen, Hook, Aufbau, Tempo, Design, Welt, Caption), pflegt den Lernstand und schlägt Verbesserungen vor. Verpasst (Cockpit aus): beim nächsten Start.</p>
    ${!buffer ? '<div class="slot-fehler">Braucht den Buffer-Schlüssel (BUFFER_API_KEY in der .env im Render-Klon).</div>' : ""}
    <label class="schalter"><input type="checkbox" id="lernschleife-aktiv" ${e.lernschleife_aktiv ? "checked" : ""} ${!buffer ? "disabled" : ""}> Täglich automatisch</label>
    <div class="hinweis">Zuletzt: ${e.lernschleife_zuletzt || "noch nie im Cockpit"} · Die Cloud-Lernschleife (19:52) läuft noch parallel, bis du sie abschalten lässt.</div>
    <div class="slot-knoepfe"><button class="knopf" id="k-lernschleife" ${!buffer || S.lernschleife?.laeuft ? "disabled" : ""}>🧠 Jetzt auswerten</button></div>`;

  const liste = [...(S.db?.vorschlaege || [])].sort((x, y) => (x.daten.status === "offen" ? -1 : 0) - (y.daten.status === "offen" ? -1 : 0) || String(y.daten.datum || y.aktualisiert).localeCompare(String(x.daten.datum || x.aktualisiert)));
  $("vorschlaege").innerHTML = liste.length ? liste.map((v) => {
    const d = v.daten;
    const [stText, stKlasse] = VORSCHLAG_STATUS[d.status] || [d.status, ""];
    const b = d.begruendung || {};
    const bilder = (d.umsetzung?.probebilder || []).map((f) => `<img src="/api/vorschau?id=${encodeURIComponent(v.id)}&f=${encodeURIComponent(String(f).split(/[\\/]/).pop())}" alt="Probebild">`).join("");
    const knoepfe = d.status === "offen" || d.status === "fehler"
      ? `<button class="knopf klein glanz" data-vorschlag="annehmen" data-id="${v.id}">✅ ${d.status === "fehler" ? "Erneut umsetzen" : "Annehmen"}</button><button class="knopf klein rot" data-vorschlag="ablehnen" data-id="${v.id}">✕ Ablehnen</button>`
      : d.status === "probe" ? `<button class="knopf klein glanz" data-vorschlag="probe_ok" data-id="${v.id}">✅ Passt, umsetzen</button><button class="knopf klein rot" data-vorschlag="ablehnen" data-id="${v.id}">✕ Verwerfen</button>` : "";
    return `<div class="vorschlag ${d.status === "offen" ? "offen" : ""} ${KONTO_KLASSE[d.konto] || ""}" data-vid="${v.id}">
      <div class="zeile"><span class="titel">${BEREICH_ICON[d.bereich] || "💡"} ${esc(d.titel)}</span><span class="chip ${stKlasse}">${esc(stText)}</span></div>
      <div class="unter"><span class="chip ${KONTO_KLASSE[d.konto] || ""}">${d.konto === "stelldirvor" ? "Stell dir vor" : d.konto === "simulierbar" ? "Simulierbar" : esc(d.konto || "")}</span><span>${esc(d.bereich || "")}</span><span>Priorität ${esc(d.prioritaet || "–")}</span><span>${esc(d.datum || "")}</span></div>
      <p class="vorschlag-text">${esc(d.vorschlag || "")}</p>
      <details><summary>Gedankengang (Messung → Schluss → Änderung)</summary><div><b>Messung:</b> ${esc(b.messung || "–")}<br><b>Schluss:</b> ${esc(b.schluss || "–")}<br><b>Änderung:</b> ${esc(b.aenderung || "–")}${d.betrifft ? `<br><b>Betrifft:</b> ${esc(d.betrifft)}` : ""}${d.risiko ? `<br><b>Risiko:</b> ${esc(d.risiko)}` : ""}${d.belege?.length ? `<br><b>Belege:</b> ${esc(d.belege.join(", "))}` : ""}</div></details>
      ${bilder ? `<div class="probebilder">${bilder}</div>` : ""}
      ${d.umsetzung?.notiz ? `<div class="hinweis">✔ ${esc(d.umsetzung.notiz)}${d.umsetzung.commit ? ` (${esc(d.umsetzung.commit)})` : ""}</div>` : ""}
      ${d.umsetzung?.fehler ? `<div class="slot-fehler">${esc(d.umsetzung.fehler)}</div>` : ""}
      <div class="slot-knoepfe">${knoepfe}</div>
    </div>`;
  }).join("") : '<div class="leer-gross"><b>🧠</b>Noch keine Vorschläge. Sie entstehen in der Lernschleife aus den Zahlen jedes Videos.</div>';
  lernenPunkt();
}

function lernenPunkt() {
  const n = (S.db?.vorschlaege || []).filter((v) => ["offen", "probe"].includes(v.daten.status)).length + (S.einstellungen?.autonomie?.frage_offen ? 1 : 0);
  $("lernen-punkt").hidden = !n;
  $("lernen-punkt").textContent = n;
}

// Die Karten stehen je nach Raum der Lernzentrale auf verschiedenen Wandbildschirmen: Ereignisse auf Dokumentebene
const imLernen = (e) => !!e.target.closest?.("#autonomie-karte, #lernschleife-karte, #vorschlaege");
document.addEventListener("click", async (e) => {
  if (!imLernen(e)) return;
  const v = e.target.closest("[data-vorschlag]");
  if (v) {
    let kommentar = "";
    if (v.dataset.vorschlag === "ablehnen") kommentar = prompt("Warum lehnst du ab? (optional, hilft Claude beim Lernen)") ?? "";
    const r = await post("/api/lernen", { aktion: "entscheiden", id: v.dataset.id, wahl: v.dataset.vorschlag, kommentar });
    if (!r.ok) { toast("⚠️", "Vorschlag", r.fehler || "nicht möglich", "problem"); return; }
    const [x, y] = mitte(v);
    if (v.dataset.vorschlag === "ablehnen") Spiel.klang.wechsel();
    else { P.konfetti(x, y, 80, 7); Spiel.klang.sieg(); Spiel.simu("jubelt", "Wird umgesetzt! 🛠️"); }
    return;
  }
  const a = e.target.closest("[data-autonomie]");
  if (a) {
    const wahl = a.dataset.autonomie;
    if (wahl === "autonom" && !confirm("Claude setzt Verbesserungen ab jetzt ohne deine Freigabe um. Du wirst über jede Umsetzung benachrichtigt und kannst das jederzeit zurücknehmen. Einverstanden?")) return;
    const r = await post("/api/lernen", { aktion: "autonomie", wahl });
    if (r.ok) { S.einstellungen.autonomie = r.autonomie; Spiel.klang.sieg(); P.konfetti(...mitte(a), 120, 9); lernenZeichnen(); }
    return;
  }
  if (e.target.id === "k-lernschleife") {
    const r = await post("/api/lernen", { aktion: "lernschleife" });
    if (!r.ok) toast("⚠️", "Lernschleife", r.fehler || "nicht möglich", "problem");
    else { Spiel.klang.powerup(); toast("🧠", "Lernschleife gestartet", "Zahlen holen, dann wertet Claude jedes Video aus", "meilenstein"); }
  }
});
document.addEventListener("change", async (e) => {
  if (e.target.id !== "lernschleife-aktiv") return;
  await post("/api/lernen", { aktion: "aktiv", wert: e.target.checked });
  S.einstellungen.lernschleife_aktiv = e.target.checked;
  Spiel.klang.liste();
});

// ───────── Meldungen (Push im Cockpit + Windows-Benachrichtigung) ─────────

const MELDUNG_ICON = { vorschlag: "💡", umgesetzt: "🛠️", fehler: "⚠️", erfolg: "🎯", frage: "❓", info: "ℹ️" };
function meldungen() { return [...(S.db?.meldungen || [])].sort((a, b) => String(b.daten.zeit).localeCompare(String(a.daten.zeit))); }
function meldungenZeichnen() {
  const liste = meldungen();
  const ungelesen = liste.filter((m) => !m.daten.gelesen).length;
  $("meldungen-punkt").hidden = !ungelesen;
  $("meldungen-punkt").textContent = ungelesen;
  $("k-meldungen").classList.toggle("hat-neue", ungelesen > 0);
  if ($("meldungen-panel").hidden) return;
  $("meldungen-liste").innerHTML = liste.length ? liste.slice(0, 40).map((m) => {
    const d = m.daten;
    return `<div class="meldung ${d.gelesen ? "" : "neu"} ${esc(d.art)}" data-mid="${m.id}" data-ziel='${esc(JSON.stringify(d.ziel || {}))}'>
      <span class="meldung-icon">${MELDUNG_ICON[d.art] || "🔔"}</span>
      <div><b>${esc(d.titel)}</b>${d.text ? `<small>${esc(d.text.slice(0, 220))}</small>` : ""}<small class="zeit">${new Date(d.zeit).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small></div>
    </div>`;
  }).join("") : '<div class="detail-leer">Keine Meldungen.</div>';
}
$("k-meldungen").addEventListener("click", () => {
  $("meldungen-panel").hidden = !$("meldungen-panel").hidden;
  Spiel.klang.glocke();
  meldungenZeichnen();
  // Windows-Benachrichtigungen beim ersten Öffnen erlauben lassen
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
});
$("k-alle-gelesen").addEventListener("click", async () => { await post("/api/meldungen", { aktion: "alle_gelesen" }); Ton.klick(); });
$("meldungen-liste").addEventListener("click", async (e) => {
  const m = e.target.closest("[data-mid]");
  if (!m) return;
  await post("/api/meldungen", { aktion: "gelesen", id: m.dataset.mid });
  let ziel = {};
  try { ziel = JSON.parse(m.dataset.ziel); } catch { ziel = {}; }
  if (ziel.ansicht) ansichtSetzen(ziel.ansicht);
  if (ziel.id) setTimeout(() => document.querySelector(`[data-vid="${CSS.escape(ziel.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  $("meldungen-panel").hidden = true;
});
document.addEventListener("click", (e) => {
  if (!$("meldungen-panel").hidden && !e.target.closest("#meldungen-panel, #k-meldungen")) $("meldungen-panel").hidden = true;
});

function neueMeldung(doc) {
  const d = doc.daten;
  const art = d.art === "fehler" ? "problem" : d.art === "frage" ? "problem" : "meilenstein";
  toast(MELDUNG_ICON[d.art] || "🔔", d.titel, (d.text || "").slice(0, 140), art);
  Spiel.klang.glocke();
  const k = $("k-meldungen");
  k.classList.remove("klingelt"); void k.offsetWidth; k.classList.add("klingelt");
  Spiel.simu(d.art === "fehler" ? "traurig" : "jubelt", d.art === "vorschlag" ? "Ich hab einen Vorschlag für dich! 💡" : d.titel.slice(0, 60));
  // Auch außerhalb des Fensters sichtbar (Windows-Benachrichtigung), wenn erlaubt
  if ("Notification" in window && Notification.permission === "granted" && (document.hidden || !document.hasFocus())) {
    try {
      const n = new Notification(`TikTok Cockpit · ${d.titel}`, { body: (d.text || "").slice(0, 180), icon: "icon.svg", tag: doc.id });
      n.onclick = () => { window.focus(); if (d.ziel?.ansicht) ansichtSetzen(d.ziel.ansicht); n.close(); };
    } catch { /* nicht erlaubt */ }
  }
}

// ───────── Ereignisse ─────────

function dbMerken(e) {
  if (!["vorschlaege", "meldungen"].includes(e.sammlung)) return;
  const liste = (S.db[e.sammlung] ||= []);
  const i = liste.findIndex((d) => d.id === e.id);
  if (e.geloescht) { if (i >= 0) liste.splice(i, 1); }
  else if (i >= 0) liste[i] = { ...liste[i], ...e };
  else liste.push(e);
}

document.addEventListener("cockpit:verbunden", (ev) => {
  const es = ev.detail;
  const an = (art, f) => es.addEventListener(art, (e) => { try { f(JSON.parse(e.data)); } catch (err) { console.error(art, err); } });
  an("zustand", (z) => {
    ZS.zahlen = z.zahlen; ZS.dienst = z.dienst;
    S.lernschleife = z.lernschleife;
    dienstZeichnen(); meldungenZeichnen(); lernenPunkt(); verlaufLaden(); lernenZeichnen();
  });
  an("dienst", (d) => { ZS.dienst = d; dienstZeichnen(); });
  an("render", () => { if (S.einstellungen?.dienst_autostart === false) dienstZeichnen(); });
  an("dienst_zeile", (z) => {
    if (!ZS.dienst) return;
    ZS.dienst.zeilen = [...(ZS.dienst.zeilen || []), z].slice(-200);
    dienstZeichnen();
    if ($("konsole-dialog").open) { $("konsole").textContent += `\n${new Date(z.zeit).toLocaleTimeString("de-DE")}  ${z.text}`; $("konsole").scrollTop = $("konsole").scrollHeight; }
    if (/Auftrag|rendere|Fertig:/i.test(z.text)) Spiel.klang.terminal();
  });
  an("zahlen", (z) => { ZS.zahlen = z; zahlenZeichnen(); });
  an("einstellungen", (e) => { S.einstellungen = e; lernenZeichnen(); lernenPunkt(); });
  an("lernschleife", (l) => { S.lernschleife = { ...(S.lernschleife || {}), laeuft: l.laeuft }; lernenZeichnen(); if (l.laeuft) Spiel.simu("denkt", "Ich werte die Zahlen aus … 📊"); });
  an("db", (e) => { dbMerken(e); if (e.sammlung === "vorschlaege") lernenZeichnen(); if (e.sammlung === "meldungen") meldungenZeichnen(); });
  an("meldung", (doc) => neueMeldung(doc));
  an("steuerung", (s) => { if (s.ansicht) ansichtSetzen(s.ansicht); });
});
// Raum betreten (zentrale.js): frisch zeichnen
document.addEventListener("cockpit:raum", (e) => {
  if (e.detail?.zentrale === "zahlen" || e.detail?.zentrale === "ziele") { zahlenZeichnen(); verlaufLaden(); }
  if (e.detail?.zentrale === "lernen") lernenZeichnen();
});
setInterval(() => { if (!$("zahlen").hidden) zahlenZeichnen(); }, 60000);
