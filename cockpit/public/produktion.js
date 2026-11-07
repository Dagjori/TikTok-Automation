"use strict";
// Produktion: Handy-Bühne mit Live-Render, Produktionskette, Videos, Render-Aufträge, Render-Dienst und Rechner.

const PHASEN = ["vorbereiten", "rendern", "ton", "mux", "verkleinern", "hochladen", "fertig"];
const zaehlStand = new Map();
function hochzaehlen(el, ziel, format = zahl) {
  const von = zaehlStand.get(el) ?? 0;
  zaehlStand.set(el, ziel);
  if (von === ziel || document.hidden) { el.textContent = format(ziel); return; }
  const start = performance.now(), lang = 650;
  const schritt = (t) => {
    const p = Math.min(1, (t - start) / lang), e = 1 - Math.pow(1 - p, 3);
    el.textContent = format(Math.round(von + (ziel - von) * e));
    if (p < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

const videoId = (v) => `${v.datum}|${v.slot}|${v.konto}`;
const jobFuerProjekt = (projekt) => S.render.auftraege.find((a) => a.projekt === projekt);
function haengt(a) {
  if (a.status !== "laeuft" || !a.rechner) return false;
  const r = S.render.rechner.find((x) => x.rechner === a.rechner);
  return !!r && !r.online;
}
function statusChip(status) {
  const k = { fertig: "ok", laeuft: "laeuft", wartet: "", keine_gpu: "fehler", skript_fertig: "laeuft" }[status] ?? STATUS_KLASSE[status] ?? "";
  const t = { laeuft: "läuft", keine_gpu: "keine GPU" }[status] || STATUS_NAME[status] || status;
  return `<span class="chip ${k}">${esc(t)}</span>`;
}
const jobChip = (a) => (haengt(a) ? `<span class="chip fehler">hängt · ${esc(a.rechner)} offline</span>` : statusChip(a.status));
// Videos von heute und morgen: aus der Cockpit-Ablage, ergänzt um Einträge, die nur im Protokoll stehen
function videosHeute() {
  const tage = new Set([S.heute, morgen()]);
  const schluessel = (v) => `${v.datum}|${v.slot}|${kontoInfo(v.konto).klasse}`;
  const ausDb = doks("skripte").filter((d) => tage.has(d.daten.datum)).map((d) => ({
    datum: d.daten.datum, slot: d.daten.slot, konto: d.daten.konto === "stelldirvor" ? "stelldirvor.pov" : d.daten.konto,
    titel: d.daten.titel, projekt: d.daten.projekt || "", status: d.daten.status, post_id: d.daten.post_id || "",
  }));
  const da = new Set(ausDb.map(schluessel));
  const proto = (S.plan.protokoll || []).filter((z) => tage.has(z.datum) && !da.has(schluessel(z)));
  return [...ausDb, ...proto].sort((a, b) => (a.datum + slotZeit(a.datum, a.slot)).localeCompare(b.datum + slotZeit(b.datum, b.slot)));
}
function laptopTempo(lok) {
  if (!lok?.renderdauer_s || !lok.bilder) return null;
  return `${zahl(lok.bilder)} Bilder in ${dauer(lok.renderdauer_s)} Min. (${(lok.bilder / lok.renderdauer_s).toFixed(1).replace(".", ",")} Bilder/s)`;
}
const kontoHandle = (k) => `@${kontoInfo(k).name.toLowerCase().replace(/\s+/g, "")}`;

function listenZeichnen() {
  const videos = videosHeute();
  htmlSetzen($("videos"), videos.length
    ? videos.map((v) => {
        const job = jobFuerProjekt(v.projekt);
        const aktiv = S.auswahl?.typ === "video" && S.auswahl.id === videoId(v);
        const tag = v.datum === S.heute ? "heute" : "morgen";
        return `<div class="karte ${aktiv ? "aktiv" : ""}" data-video="${esc(videoId(v))}">
          <div class="titel">${esc(v.titel)}</div>
          <div class="unter"><span class="chip ${kontoInfo(v.konto).klasse}">${esc(kontoInfo(v.konto).name)}</span><span>${tag} ${slotZeit(v.datum, v.slot) || v.slot}</span>${statusChip(v.status)}${job && job.status === "laeuft" ? jobChip(job) : ""}${S.lokal.find((l) => l.projekt === v.projekt)?.mp4 ? `<span class="chip">MP4 lokal</span>` : ""}</div>
        </div>`;
      }).join("")
    : `<div class="karte leer-karte">Noch keine Videos für heute und morgen im Protokoll.</div>`);

  const jobs = S.render.auftraege.slice(0, 7);
  htmlSetzen($("auftraege"), jobs.length
    ? jobs.map((a) => {
        const aktiv = S.auswahl?.typ === "job" && S.auswahl.id === a.id;
        const p = a.status === "fertig" ? 100 : a.prozent || 0;
        return `<div class="karte ${aktiv ? "aktiv" : ""}" data-job="${esc(a.id)}">
          <div class="zeile"><span class="titel">${esc(a.projekt)}</span>${jobChip(a)}</div>
          <div class="unter"><span>${esc(a.phase || "")}</span><span>${a.bilder ? `Bild ${zahl(a.bilder[0])}/${zahl(a.bilder[1])}` : ""}</span><span>${esc(a.rechner || "")}</span></div>
          <div class="balken"><i style="width:${p}%"></i></div>
        </div>`;
      }).join("") + (S.render.wartend?.length ? `<div class="karte leer-karte">${S.render.wartend.length} Auftrag/Aufträge warten auf einen Rechner</div>` : "")
    : `<div class="karte leer-karte">${esc(S.render.fehler || "Keine Render-Aufträge.")}</div>`);

  htmlSetzen($("rechner"), S.render.rechner.length
    ? S.render.rechner.map((r) => {
        const d = r.daten || {};
        const status = r.online ? (d.status === "rendert" ? `rendert ${Math.round(d.prozent || 0)} %` : d.status || "online") : "offline";
        const alter = r.alter_s < 120 ? `vor ${r.alter_s} s` : r.alter_s < 7200 ? `vor ${Math.round(r.alter_s / 60)} Min.` : `vor ${Math.round(r.alter_s / 3600)} Std.`;
        return `<div class="karte" data-rechner="${esc(r.rechner)}">
          <div class="zeile"><span class="titel"><span class="led ${r.online ? (d.status === "rendert" ? "laeuft" : "an") : "fehler"}"></span>${esc(r.rechner)}${r.lokal ? " · dieser Rechner" : ""}</span><span class="chip ${r.online ? (d.status === "rendert" ? "laeuft" : "ok") : ""}">${esc(status)}</span></div>
          <div class="unter"><span>${esc(String(d.gpu || "GPU ?").replace(/\s*\(0x[0-9A-F]+\)/i, ""))}</span><span>Dienst ${esc(d.version || "?")}</span><span>${alter}</span></div>
        </div>`;
      }).join("")
    : `<div class="karte leer-karte">${esc(S.render.fehler || "Noch kein Herzschlag.")}</div>`);
  $("plan-stand").textContent = S.plan.commit ? `Repo ${S.plan.commit.split(" ").slice(0, 3).join(" ")}` : "";
}
document.addEventListener("click", (e) => {
  const k = e.target.closest("#videos .karte, #auftraege .karte, #rechner .karte");
  if (!k || k.classList.contains("leer-karte")) return;
  if (k.dataset.video) S.auswahl = { typ: "video", id: k.dataset.video };
  else if (k.dataset.job) S.auswahl = { typ: "job", id: k.dataset.job };
  else if (k.dataset.rechner) {
    eingabeVorbelegen(`Wie geht es dem Render-Rechner ${k.dataset.rechner}? Führe py -3 C:\\render\\tiktok-automation\\pipeline\\render_dienst\\auftrag.py pc aus und erkläre das Ergebnis kurz.`);
    return;
  }
  S.schritt = null;
  produktionZeichnen();
});

// ───────── Bühne ─────────
function gewaehlt() {
  let video = null, job = null;
  if (S.auswahl?.typ === "video") {
    video = videosHeute().find((v) => videoId(v) === S.auswahl.id) || null;
    job = video ? jobFuerProjekt(video.projekt) : null;
  } else if (S.auswahl?.typ === "job") {
    job = S.render.auftraege.find((a) => a.id === S.auswahl.id) || null;
    video = job ? (S.plan.protokoll || []).findLast?.((v) => v.projekt === job.projekt) || null : null;
  } else {
    job = S.render.auftraege.find((a) => a.status === "laeuft" && !haengt(a)) || null;
    video = job ? (S.plan.protokoll || []).findLast?.((v) => v.projekt === job.projekt) || null : videosHeute().find((v) => v.datum === S.heute && v.status === "geplant") || null;
  }
  return { video, job };
}

// Live-Bilder doppelt gepuffert (kein Flackern), höchstens ca. 4 je Sekunde
const bildTausch = { aktiv: "live-bild", letzte: 0, src: "" };
function liveBildZeigen(projekt, bild) {
  if (!projekt || !bild) return;
  const src = `/api/bild?p=${encodeURIComponent(projekt)}&f=${encodeURIComponent(bild)}`;
  if (src === bildTausch.src) return;
  const gleichesProjekt = bildTausch.src.includes(`p=${encodeURIComponent(projekt)}&`);
  if (gleichesProjekt && performance.now() - bildTausch.letzte < 240) return;
  bildTausch.letzte = performance.now();
  bildTausch.src = src;
  const neu = bildTausch.aktiv === "live-bild" ? $("live-bild-b") : $("live-bild");
  const alt = $(bildTausch.aktiv);
  neu.onload = () => { neu.classList.add("sichtbar"); alt.classList.remove("sichtbar"); bildTausch.aktiv = neu.id; };
  neu.src = src;
}
function bilderVerbergen() { ["live-bild", "live-bild-b"].forEach((id) => $(id).classList.remove("sichtbar")); bildTausch.src = ""; }

// Bild-Raster: ein Kästchen je gerendertem Bild (für Renders auf dem anderen Rechner ohne Live-Bild)
function rasterZeichnen(c, fertig, gesamt) {
  const r = c.getBoundingClientRect();
  if (!r.width) return;
  const d = Math.min(2, devicePixelRatio);
  if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, c.width, c.height);
  const n = Math.max(1, Math.min(gesamt || 100, 2400));
  const spalten = Math.max(1, Math.round(Math.sqrt((n * c.width) / c.height)));
  const zeilen = Math.ceil(n / spalten);
  const w = c.width / spalten, h = c.height / zeilen;
  const zeigen = Math.round((fertig / Math.max(1, gesamt || 1)) * n);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < zeigen ? `hsl(${185 + (i / n) * 150}, 80%, ${50 + 6 * Math.sin(i * 0.37)}%)` : "rgba(255,255,255,0.05)";
    ctx.fillRect((i % spalten) * w + 0.5, Math.floor(i / spalten) * h + 0.5, Math.max(0.5, w - 1), Math.max(0.5, h - 1));
  }
}

function buehneZeichnen() {
  const { video, job } = gewaehlt();
  const handy = $("handy");
  const projekt = video?.projekt || job?.projekt || null;
  const lok = projekt ? S.lokal.find((l) => l.projekt === projekt) : null;
  const liveJetzt = !!(S.live?.aktiv && projekt && S.live.projekt === projekt);
  const laeuft = !!(job && (job.status === "laeuft" || job.status === "wartet") && !haengt(job));
  handy.classList.toggle("rendert", laeuft || liveJetzt);
  if (videoLaeuft.projekt && videoLaeuft.projekt !== projekt) videoStoppen();
  $("k-abspielen").hidden = !lok?.mp4 || liveJetzt || laeuft || !!videoLaeuft.projekt;

  // Bild im Handy: live vom Laptop > Standbild eines Laptop-Renders > Bild-Raster > Leerlauf
  if (liveJetzt && S.live.bild) {
    $("leerlauf").classList.add("weg"); $("bild-raster").classList.remove("sichtbar");
    liveBildZeigen(S.live.projekt, S.live.bild);
  } else if (lok?.vorschau && !laeuft) {
    $("leerlauf").classList.add("weg"); $("bild-raster").classList.remove("sichtbar");
    liveBildZeigen(projekt, lok.vorschau);
  } else if (job) {
    $("leerlauf").classList.add("weg"); bilderVerbergen();
    $("bild-raster").classList.add("sichtbar");
    const [f, g] = job.bilder || [0, 0];
    rasterZeichnen($("bild-raster"), job.status === "fertig" ? g || 100 : f || 0, g || 100);
  } else {
    $("leerlauf").classList.remove("weg"); $("bild-raster").classList.remove("sichtbar"); bilderVerbergen();
    const bereit = S.render.rechner.filter((r) => r.online).map((r) => r.rechner);
    $("leerlauf-text").textContent = bereit.length ? `${bereit.join(" + ")} bereit` : "Kein Render-Rechner online";
  }
  $("buehne-titel").textContent = video || job ? kontoHandle(video?.konto || job?.konto) : "@cockpit";
  $("buehne-unter").textContent = video?.titel || job?.projekt || "Warte auf den nächsten Render";

  if (!job) {
    const p = video?.status === "gepostet" || video?.status === "geplant" || lok?.mp4 ? 100 : 0;
    hochzaehlen($("prozent"), p);
    htmlSetzen($("info-zeilen"), video
      ? infoZeilen([["Video", video.titel], ["Konto", kontoInfo(video.konto).name], ["Slot", `${video.datum} ${slotZeit(video.datum, video.slot) || video.slot}`], ["Status", video.status], ["Laptop-Render", laptopTempo(lok) || "–"], ["Post-ID", video.post_id || "–"]])
      : infoZeilen([["Stand", "kein Auftrag ausgewählt"], ["Tipp", "rechts ein Video anklicken"]]));
    htmlSetzen($("phasen"), "");
    return;
  }
  hochzaehlen($("prozent"), job.status === "fertig" ? 100 : Math.round(job.prozent || 0));
  const [fertig, gesamt] = job.bilder || [liveJetzt ? S.live.anzahl : 0, 0];
  const gpu = String(job.gpu || "").replace(/\s*\(0x[0-9A-F]+\)/i, "");
  htmlSetzen($("info-zeilen"), infoZeilen([
    ["Projekt", job.projekt],
    ["Rechner", `${job.rechner || "?"}${gpu ? " · " + gpu : ""}`],
    ["Bilder", gesamt ? `${zahl(fertig)} / ${zahl(gesamt)}` : "–"],
    ["Rest", haengt(job) ? "hängt: Rechner offline" : job.rest_min != null && laeuft ? `ca. ${String(job.rest_min).replace(".", ",")} Min.` : job.status === "fertig" ? "fertig" : "–"],
    ["Tempo", liveJetzt ? `${String(S.live.fps).replace(".", ",")} Bilder/s (live)` : job.renderzeit?.s_pro_bild ? `${job.renderzeit.s_pro_bild} s/Bild` : laptopTempo(lok) || "–"],
    ["Auftrag", job.id],
  ]));
  const index = PHASEN.indexOf(job.status === "fertig" ? "fertig" : job.phase);
  const kaputt = job.status === "fehler" || job.status === "keine_gpu" || haengt(job);
  htmlSetzen($("phasen"), PHASEN.map((ph, i) => `<span class="phase ${i < index || job.status === "fertig" ? "fertig" : i === index ? (kaputt ? "kaputt" : "jetzt") : ""}">${ph}</span>`).join(""));
}
function infoZeilen(paare) { return paare.map(([k, v]) => `<div><small>${esc(k)}</small><b title="${esc(v)}">${esc(v)}</b></div>`).join(""); }

const videoLaeuft = { projekt: null };
function videoStoppen() {
  const v = $("handy-video");
  v.pause(); v.classList.remove("sichtbar"); v.removeAttribute("src"); v.load();
  $("handy").classList.remove("spielt");
  videoLaeuft.projekt = null;
}
$("k-abspielen").addEventListener("click", () => {
  const { video, job } = gewaehlt();
  const projekt = video?.projekt || job?.projekt;
  if (!projekt) return;
  const v = $("handy-video");
  v.src = `/api/video?p=${encodeURIComponent(projekt)}`;
  v.controls = true;
  videoLaeuft.projekt = projekt;
  $("handy").classList.add("spielt");
  v.classList.add("sichtbar");
  $("k-abspielen").hidden = true;
  v.play().catch(() => {});
});
$("handy-video").addEventListener("ended", () => { videoStoppen(); buehneZeichnen(); });

// ───────── Produktionskette ─────────
const KETTE = [
  { id: "idee", name: "Idee", icon: "💡", text: "Thema aus dem Studio bzw. Trend-Radar." },
  { id: "skript", name: "Skript", icon: "✍️", text: "Recherche mit Quellen, Skript nach dem Skill des Accounts." },
  { id: "freigabe", name: "Freigabe", icon: "✅", text: "Du gibst das Skript frei." },
  { id: "fakten", name: "Fakten", icon: "🔎", text: "Jede Zahl gegen Quelle und Rechenweg, Rechnung als Code mit Tests." },
  { id: "stimme", name: "Stimme", icon: "🎙️", text: "KI-Stimme (nur Simulierbar)." },
  { id: "szene", name: "Szene", icon: "🧊", text: "Szene gebaut, Standbilder geprüft." },
  { id: "render", name: "Render", icon: "🎬", text: "Render-Dienst auf PC oder Laptop." },
  { id: "ton", name: "Ton", icon: "🎧", text: "Ton-Mix, Lautheit −14 LUFS, MP4." },
  { id: "pruefung", name: "Prüfung", icon: "🧪", text: "Maßstab bzw. Referenzprüfung, Kontaktbogen, Abnahme." },
  { id: "buffer", name: "Buffer", icon: "📅", text: "In Buffer eingeplant." },
  { id: "online", name: "Online", icon: "🚀", text: "Gepostet und nachgeprüft." },
];
function ketteZustand(video, job) {
  const z = Object.fromEntries(KETTE.map((s) => [s.id, "offen"]));
  const bis = (id) => { for (const s of KETTE) { z[s.id] = "fertig"; if (s.id === id) break; } };
  if (video?.status === "gepostet") bis("online");
  else if (video?.status === "geplant") { bis("buffer"); z.online = "jetzt"; }
  else if (job) {
    bis("szene");
    if (job.status === "fertig") { z.render = "fertig"; z.ton = "fertig"; z.pruefung = "jetzt"; }
    else if (job.status === "fehler" || job.status === "keine_gpu" || haengt(job)) z.render = "kaputt";
    else if (["ton", "mux", "verkleinern"].includes(job.phase)) { z.render = "fertig"; z.ton = "jetzt"; }
    else if (job.phase === "hochladen") { z.render = "fertig"; z.ton = "fertig"; }
    else z.render = "jetzt";
  }
  const projekt = video?.projekt || job?.projekt || "";
  if (String(video?.konto || job?.konto || "").startsWith("stelldirvor") || projekt.startsWith("a2-")) z.stimme = "entfaellt";
  return z;
}
function ketteZeichnen() {
  const { video, job } = gewaehlt();
  const z = ketteZustand(video, job);
  $("kette-titel").textContent = video ? `Produktionskette · ${video.titel}` : job ? `Produktionskette · ${job.projekt}` : "Produktionskette";
  htmlSetzen($("kette"), KETTE.map((s) => `<button class="schritt ${z[s.id]} ${S.schritt === s.id ? "gewaehlt" : ""}" data-schritt="${s.id}" title="${esc(s.name)}"><span class="knoten">${z[s.id] === "fertig" ? "✓" : s.icon}</span><span>${esc(s.name)}</span></button>`).join(""));
  detailZeichnen(video, job, z);
}
function detailZeichnen(video, job, z) {
  const s = KETTE.find((k) => k.id === S.schritt);
  if (!s) return htmlSetzen($("detail"), `<span class="hinweis">${video || job ? "Klicke auf einen Schritt der Kette, um Details zu sehen." : "Wähle rechts ein Video oder einen Render-Auftrag."}</span>`);
  const zustandText = { fertig: "erledigt", jetzt: "läuft gerade", kaputt: "Problem", offen: "noch offen", entfaellt: "entfällt bei diesem Account" }[z[s.id]];
  let inhalt = `<h4>${s.icon} ${esc(s.name)} <span class="chip ${z[s.id] === "fertig" ? "ok" : z[s.id] === "jetzt" ? "laeuft" : z[s.id] === "kaputt" ? "fehler" : ""}">${zustandText}</span></h4><div>${esc(s.text)}</div>`;
  if ((s.id === "render" || s.id === "ton") && job) {
    inhalt += `<div class="log">Auftrag ${esc(job.id)} · Status ${esc(job.status)} · Phase ${esc(job.phase || "–")} · ${job.bilder ? `Bild ${zahl(job.bilder[0])}/${zahl(job.bilder[1])}` : ""}${job.fehler ? `\nFehler: ${esc(job.fehler)}` : ""}${haengt(job) ? `\nHängt: ${esc(job.rechner)} sendet keinen Herzschlag mehr. Der Dienst setzt den Auftrag beim nächsten Start dort fort.` : ""}</div>`;
    if (S.renderlog.auftrag === job.id && S.renderlog.zeilen.length) inhalt += `<div class="log">${S.renderlog.zeilen.slice(-12).map(esc).join("\n")}</div>`;
  } else if (s.id === "buffer" && video) {
    inhalt += `<div class="log">Post-ID ${esc(video.post_id || "–")} · Slot ${esc(video.datum)} ${slotZeit(video.datum, video.slot) || ""} · ${esc(kontoInfo(video.konto).name)}</div>`;
  } else if (s.id === "online" && video) {
    inhalt += `<div class="log">${video.status === "gepostet" ? "Gepostet und nachgeprüft." : `Geht am ${esc(video.datum)} um ${slotZeit(video.datum, video.slot) || "?"} online.`}</div>`;
  }
  const titel = video?.titel || job?.projekt;
  if (titel) inhalt += `<div style="margin-top:10px"><button class="knopf klein" data-frage="${esc(`Wie ist der Stand bei „${titel}“ im Schritt ${s.name}? Schau in pipeline/projekte/${video?.projekt || job?.projekt}/ und data/produktion/protokoll.csv nach und antworte kurz.`)}">Claude dazu fragen</button></div>`;
  htmlSetzen($("detail"), inhalt);
}
$("kette").addEventListener("click", (e) => {
  const b = e.target.closest(".schritt");
  if (!b) return;
  S.schritt = S.schritt === b.dataset.schritt ? null : b.dataset.schritt;
  ketteZeichnen();
});
$("detail").addEventListener("click", (e) => {
  const b = e.target.closest("[data-frage]");
  if (b) eingabeVorbelegen(b.dataset.frage);
});

// ───────── Render-Dienst ─────────
const DIENST = { zustand: null };
const DIENST_STATUS = { aus: ["aus", ""], startet: ["startet …", "laeuft"], laeuft: ["läuft", "ok"], neustart: ["Neustart …", "laeuft"], fremd: ["altes Fenster aktiv", "fehler"], fehler: ["Fehler", "fehler"] };
function dienstZeichnen() {
  const d = DIENST.zustand;
  if (!d) return;
  // Am Desktop-PC läuft der Dienst eigenständig über die Aufgabenplanung (Entscheidung 03.11.): nur anzeigen
  const laeuft = ["laeuft", "startet", "neustart"].includes(d.status);
  const nurAnzeigen = S.einstellungen?.dienst_autostart === false;
  if (nurAnzeigen && !laeuft) {
    const hier = (S.render?.rechner || []).find((r) => r.lokal);
    const st = hier?.online ? (hier.daten?.status === "rendert" ? `rendert ${Math.round(hier.daten.prozent || 0)} %` : "läuft eigenständig") : "kein Herzschlag";
    return htmlSetzen($("dienst-karte"), `<div class="zeile"><span class="titel"><span class="led ${hier?.online ? "an" : "fehler"}"></span>Render-Dienst</span><span class="chip ${hier?.online ? "ok" : "fehler"}">${esc(st)}</span></div>
      <div class="hinweis" style="margin-top:6px">Läuft auf diesem Rechner über die Aufgabenplanung, unabhängig vom Cockpit.</div>`);
  }
  const [text, klasse] = DIENST_STATUS[d.status] || [d.status, ""];
  const zeilen = (d.zeilen || []).slice(-4).map((z) => `<div>${esc(z.text.replace(/^\d\d:\d\d:\d\d\s*/, ""))}</div>`).join("");
  htmlSetzen($("dienst-karte"), `
    <div class="zeile"><span class="titel"><span class="led ${d.status === "laeuft" ? "an" : klasse === "fehler" ? "fehler" : klasse === "laeuft" ? "laeuft" : ""}"></span>Render-Dienst</span><span class="chip ${klasse}">${esc(text)}</span></div>
    ${d.hinweis ? `<div class="fehler-text">${esc(d.hinweis)}</div>` : ""}
    ${nurAnzeigen ? '<div class="fehler-text">Dieser Dienst wurde im Cockpit gestartet. Auf diesem Rechner läuft er sonst eigenständig über die Aufgabenplanung: bitte anhalten.</div>' : ""}
    <div class="dienst-zeilen" data-konsole title="Klicken für die ganze Konsole">${zeilen || "<div>noch keine Ausgabe</div>"}</div>
    <div class="slot-knoepfe">
      ${laeuft ? '<button class="knopf klein rot" data-dienst="aus">Anhalten</button>' : '<button class="knopf klein" data-dienst="an">Starten</button>'}
      ${d.status === "fremd" ? '<button class="knopf klein haupt-knopf" data-dienst="uebernehmen">Übernehmen</button>' : ""}
      <button class="knopf klein" data-konsole>Konsole</button>
    </div>`);
}
$("dienst-karte").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-dienst]");
  if (b) {
    if (b.dataset.dienst === "aus" && !confirm("Render-Dienst anhalten? Läuft gerade ein Auftrag, setzt der Dienst ihn beim nächsten Start fort.")) return;
    const r = await post("/api/dienst", { aktion: b.dataset.dienst });
    if (!r.ok) toast("⚠️", "Render-Dienst", r.fehler || "nicht möglich", "problem");
    return;
  }
  if (e.target.closest("[data-konsole]")) {
    $("konsole").textContent = (DIENST.zustand?.zeilen || []).map((z) => `${new Date(z.zeit).toLocaleTimeString("de-DE")}  ${z.text}`).join("\n");
    $("konsole-dialog").showModal();
    $("konsole").scrollTop = $("konsole").scrollHeight;
  }
});

function produktionZeichnen() {
  listenZeichnen();
  buehneZeichnen();
  ketteZeichnen();
  dienstZeichnen();
}
function produktionPunkt() {
  const nav = document.querySelector('#nav a[data-seite="produktion"]');
  const laeuft = S.render.auftraege.some((a) => a.status === "laeuft" && !haengt(a)) || !!S.claude?.produktion?.laeuft;
  nav.classList.toggle("arbeitet", laeuft);
  const probleme = S.render.auftraege.filter((a) => a.status === "fehler" || a.status === "keine_gpu" || haengt(a)).length;
  $("punkt-produktion").hidden = !probleme;
  $("punkt-produktion").textContent = probleme;
}

beiEreignis("zustand", (z) => { DIENST.zustand = z.dienst || null; });
beiEreignis("dienst", (d) => { DIENST.zustand = d; planen("produktion"); });
beiEreignis("dienst_zeile", (z) => {
  if (!DIENST.zustand) return;
  DIENST.zustand.zeilen = [...(DIENST.zustand.zeilen || []), z].slice(-200);
  planen("produktion");
  if ($("konsole-dialog").open) { $("konsole").textContent += `\n${new Date(z.zeit).toLocaleTimeString("de-DE")}  ${z.text}`; $("konsole").scrollTop = $("konsole").scrollHeight; }
});
beiEreignis("renderlog", (l) => {
  if (S.renderlog.auftrag !== l.auftrag) S.renderlog = { auftrag: l.auftrag, zeilen: [] };
  S.renderlog.zeilen = [...S.renderlog.zeilen, ...l.zeilen].slice(-60);
  if (S.schritt === "render" || S.schritt === "ton") planen("produktion");
});
zeichner("produktion", produktionZeichnen);
zeichner("*", produktionPunkt);
addEventListener("resize", () => planen("produktion"));
