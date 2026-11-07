"use strict";
// Claude-Leiste rechts: Chat, Aufgabenliste, jeder Arbeitsschritt live (Chat- und Produktionsspur getrennt filterbar).

const WERKZEUG_ICON = { Bash: "⌨️", PowerShell: "⌨️", Read: "📖", Write: "📝", Edit: "✏️", MultiEdit: "✏️", Grep: "🔍", Glob: "🗂️", WebSearch: "🌐", WebFetch: "🔗", Task: "🤖", Agent: "🤖", TodoWrite: "📋" };
// Modell wählt die Automatik (Feld „Modell“ = Automatik), außer du legst es oben fest
const SCHNELL = [
  ["☀️ Tages-Briefing", "Gib mir ein kurzes Tages-Briefing: Was steht heute an? Nutze data/produktion/protokoll.csv, CLAUDE.md §11 (Nächste Schritte) und docs/trends/vorschlaege.md. Höchstens 8 Zeilen, dann die 3 wichtigsten nächsten Schritte für mich."],
  ["🎬 Render-Lage", "Wie ist die Render-Lage? Führe py -3 C:\\render\\tiktok-automation\\pipeline\\render_dienst\\auftrag.py pc und danach … status --alle aus und erkläre das Ergebnis in 5 Zeilen."],
  ["📈 Stand der Accounts", "Fasse den aktuellen Stand beider Accounts aus CLAUDE.md §11 in 6 Zeilen zusammen, mit den offenen Punkten, die ich entscheiden muss."],
];
const FEED = { filter: lokal.lesen("feed-filter", "alle") };
const istProduktion = (e) => e.spur === "produktion" || String(e.job || "").startsWith("produktion:");

function claudeZeichnen() {
  const c = S.claude || {};
  const arbeitet = !!(c.laeuft || c.produktion?.laeuft);
  document.body.classList.toggle("claude-arbeitet", arbeitet);
  $("claude-led").className = `led ${c.laeuft ? "claude" : c.produktion?.laeuft ? "laeuft" : c.cli === false ? "fehler" : "an"}`;
  const teile = [];
  if (c.laeuft) teile.push(c.aktiv?.art && c.aktiv.art !== "chat" ? `arbeitet: ${c.aktiv.titel}` : "arbeitet …");
  if (c.produktion?.laeuft) teile.push("Produktion läuft");
  if (c.warteschlange) teile.push(`${c.warteschlange} wartet`);
  $("claude-status").textContent = teile.length ? teile.join(" · ") : c.cli === false ? "nicht installiert" : "bereit";
  $("claude-status").title = $("claude-status").textContent;
  $("cli-fehlt").hidden = c.cli !== false;
  if (c.modus && document.activeElement !== $("modus")) $("modus").value = c.modus;
  if (c.modell != null && document.activeElement !== $("modell")) $("modell").value = c.modell;
  const zeichen = { pending: "○", in_progress: "◐", completed: "✓" };
  const liste = (c.aufgaben?.length ? c.aufgaben : []).map((a) => `<div class="c-aufgabe ${esc(a.status)}"><i>${zeichen[a.status] || "○"}</i><span>${esc(a.text)}</span></div>`).join("");
  if ($("aufgaben").innerHTML !== liste) $("aufgaben").innerHTML = liste;
}

// Kleines, sicheres Markdown (erst escapen, dann Fett, Code, Überschriften, Listen)
function md(text) {
  return esc(text)
    .replace(/^#{1,4}\s+(.+)$/gm, '<b class="md-h">$1</b>')
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>")
    .replace(/^(\s*)[-*]\s+/gm, "$1• ");
}
const mdOhne = (text) => String(text).replace(/\*\*|`/g, "").replace(/^#{1,4}\s+/gm, "").replace(/^(\s*)[-*]\s+/gm, "$1• ");

function eintragHtml(e) {
  const zeit = new Date(e.zeit).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const prod = istProduktion(e) ? " produktion" : "";
  switch (e.art) {
    case "werkzeug": {
      const laufend = e.ausgabe === undefined && (istProduktion(e) ? S.claude?.produktion?.laeuft : S.claude?.laeuft);
      return `<div class="eintrag werkzeug${prod} ${laufend ? "laufend" : ""} ${e.fehler ? "kaputt" : ""}" data-nr="${e.nr}"><div class="kopfzeile"><span>${WERKZEUG_ICON[e.name] || "🛠️"}</span><span>${esc(e.titel)}</span><span class="zeit">${zeit}</span></div><div class="extra"><b>Eingabe</b>\n${esc(e.eingabe)}${e.ausgabe !== undefined ? `\n\n<b>Ergebnis</b>\n${esc(e.ausgabe)}` : ""}</div></div>`;
    }
    case "denken":
      return `<div class="eintrag denken${prod}" data-nr="${e.nr}"><div class="kopfzeile"><span>💭</span><span>denkt nach …</span><span class="zeit">${zeit}</span></div><div class="extra">${esc(e.text)}</div></div>`;
    case "fertig":
      return `<div class="eintrag fertig${prod}" data-nr="${e.nr}"><div class="kopfzeile"><span>✓</span><span>${esc(e.text)}</span><span class="zeit">${e.dauer_s ? `${dauer(e.dauer_s)} · ${e.schritte || 0} Züge` : zeit}</span></div>${e.verweigert?.length ? `<div>Nicht erlaubt: ${esc(e.verweigert.join(", "))}. Modus „Auto“ wählen oder selbst freigeben.</div>` : ""}</div>`;
    case "du":
      return `<div class="eintrag du" data-nr="${e.nr}">${esc(e.text)}</div>`;
    case "start":
    case "warteschlange":
      return `<div class="eintrag ${e.art}${prod}" data-nr="${e.nr}">${e.art === "warteschlange" ? "⏳ wartet: " : "— "}${esc(e.text)}${e.art === "start" ? " —" : ""}</div>`;
    case "fehler":
      return `<div class="eintrag fehler${prod}" data-nr="${e.nr}">⚠️ ${esc(e.text)}</div>`;
    case "auftrag":
      return `<div class="eintrag auftrag${prod}" data-nr="${e.nr}">📋 Auftrag: ${esc(e.text)}</div>`;
    case "automatik":
      return `<div class="eintrag automatik${prod}" data-nr="${e.nr}">⚙ Automatik: ${esc(e.text)}</div>`;
    case "modell":
      return `<div class="eintrag modell" data-nr="${e.nr}">🧠 Modell-Automatik: ${esc(e.text)}</div>`;
    default:
      return `<div class="eintrag text${prod}" data-nr="${e.nr}">${md(e.text)}</div>`;
  }
}
const passtFilter = (e) => FEED.filter === "alle" || (FEED.filter === "produktion" ? istProduktion(e) : !istProduktion(e));
const feedUnten = () => { const f = $("feed"); return f.scrollHeight - f.scrollTop - f.clientHeight < 80; };

function feedNeu() {
  const liste = S.feed.filter(passtFilter).slice(-200);
  $("feed").innerHTML = liste.map(eintragHtml).join("") || `<div class="eintrag start">Noch nichts. Unten einen Auftrag eingeben oder einen Schnellbefehl wählen.</div>`;
  $("feed").scrollTop = $("feed").scrollHeight;
}
function feedAnhaengen(e) {
  S.feed.push(e);
  if (S.feed.length > 400) S.feed.shift();
  document.dispatchEvent(new CustomEvent("cockpit:feed", { detail: e }));
  if (!passtFilter(e)) return;
  const unten = feedUnten();
  $("feed").querySelector(".eintrag.start:only-child")?.remove();
  $("feed").insertAdjacentHTML("beforeend", eintragHtml(e));
  const el = $("feed").lastElementChild;
  el.classList.add("neu");
  if (e.art === "text" && e.text.length < 4000 && !document.hidden) tippen(el, e.text);
  if (unten) $("feed").scrollTop = $("feed").scrollHeight;
}
// Schreibmaschinen-Effekt als reiner Text, am Ende mit Formatierung
function tippen(el, text) {
  const roh = mdOhne(text);
  const start = performance.now();
  const lang = Math.min(900, 120 + roh.length * 4);
  const schritt = (t) => {
    const p = Math.min(1, (t - start) / lang);
    if (p < 1) { el.textContent = roh.slice(0, Math.ceil(roh.length * p)); requestAnimationFrame(schritt); }
    else el.innerHTML = md(text);
  };
  requestAnimationFrame(schritt);
}

$("feed").addEventListener("click", (e) => {
  const k = e.target.closest(".eintrag.werkzeug, .eintrag.denken");
  if (k) k.classList.toggle("offen");
});
$("feed-filter").addEventListener("click", (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  FEED.filter = b.dataset.filter;
  lokal.schreiben("feed-filter", FEED.filter);
  $("feed-filter").querySelectorAll("button").forEach((x) => x.classList.toggle("aktiv", x === b));
  feedNeu();
});
$("feed-filter").querySelectorAll("button").forEach((x) => x.classList.toggle("aktiv", x.dataset.filter === FEED.filter));

function eingabeVorbelegen(text) {
  claudeOffen(true);
  $("eingabe-text").value = text;
  $("eingabe-text").focus();
}
async function auftragSenden(text, opt = {}) {
  text = text.trim();
  if (!text) return;
  const r = await post("/api/claude", { text, modus: opt.modus || $("modus").value, modell: opt.modell ?? $("modell").value });
  if (!r.ok) toast("⚠️", "Claude", r.fehler || "Auftrag nicht angenommen", "problem");
}
$("eingabe").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = $("eingabe-text").value;
  $("eingabe-text").value = "";
  auftragSenden(t);
});
$("eingabe-text").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("eingabe").requestSubmit(); }
});
function schnellZeichnen() {
  $("schnell").innerHTML = SCHNELL.map(([name], i) => `<button data-i="${i}">${esc(name)}</button>`).join("")
    + `<button data-briefing title="Beim ersten Start am Tag holt Claude das Briefing selbst">${lokal.lesen("auto-briefing", "an") === "an" ? "🔔 Auto-Briefing an" : "🔕 Auto-Briefing aus"}</button>`;
}
$("schnell").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.briefing !== undefined) {
    lokal.schreiben("auto-briefing", lokal.lesen("auto-briefing", "an") === "an" ? "aus" : "an");
    schnellZeichnen();
    return;
  }
  const [, text] = SCHNELL[Number(b.dataset.i)];
  auftragSenden(text);
});
$("k-neu").addEventListener("click", () => post("/api/claude/neu"));
$("k-stopp").addEventListener("click", () => post("/api/claude/stopp"));

function autoBriefing() {
  if (lokal.lesen("auto-briefing", "an") !== "an" || !S.claude?.cli || S.claude.laeuft) return;
  if (lokal.lesen("briefing-tag", "") === S.heute) return;
  lokal.schreiben("briefing-tag", S.heute);
  auftragSenden(SCHNELL[0][1]);
}

beiEreignis("zustand", () => { feedNeu(); claudeZeichnen(); setTimeout(autoBriefing, 1500); });
beiEreignis("claude", (c) => { S.claude = c; claudeZeichnen(); planen("jetzt", "studio"); });
beiEreignis("feed", (e) => feedAnhaengen(e));
beiEreignis("werkzeug_ergebnis", (r) => {
  const e = S.feed.find((x) => x.nr === r.nr);
  if (e) Object.assign(e, { ausgabe: r.ausgabe, fehler: r.fehler });
  const el = $("feed").querySelector(`[data-nr="${r.nr}"]`);
  if (el && e) {
    const offenWar = el.classList.contains("offen");
    el.outerHTML = eintragHtml(e);
    if (offenWar) $("feed").querySelector(`[data-nr="${r.nr}"]`)?.classList.add("offen");
  }
});
schnellZeichnen();
