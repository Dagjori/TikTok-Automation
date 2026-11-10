"use strict";
// Ansicht „Register“ (Ausbau 10.11.2026): das Video-Register des Cockpits als Tabelle. Jedes Video von der gewählten Idee bis zu
// den Zahlen nach dem Posten, Filter nach Account und Status. Die Daten baut der Server (lib/register.mjs → daten/register.json,
// GET /api/register); dieselben Zeilen stehen in der erzeugten Hirn-Notiz „Video-Register“.

const RG = { daten: null, konto: lokal.lesen("register-konto", "alle"), status: lokal.lesen("register-status", "alle"), laedt: false, zuletzt: 0 };
const RG_STATUS = ["Idee", "Skript", "in Produktion", "geplant", "gepostet", "Fehler"];
const RG_KLASSE = { Idee: "", Skript: "acc1", "in Produktion": "laeuft", geplant: "ok", gepostet: "ok", Fehler: "fehler" };

async function registerLaden(erzwingen = false) {
  if (RG.laedt || (!erzwingen && Date.now() - RG.zuletzt < 5000)) return;
  RG.laedt = true;
  try {
    const r = await fetch("/api/register").then((x) => x.json());
    RG.zuletzt = Date.now();
    if (r.ok) { RG.daten = r; RG.alt = false; } else RG.alt = true; // läuft noch der Server von vor dem Ausbau, kennt er das Register nicht
  } catch { /* Server gerade weg: beim nächsten Mal */ }
  RG.laedt = false;
  planen("register");
}

function registerZeichnen() {
  const wahl = (liste, aktiv, attr) => liste.map(([k, name]) => `<button data-${attr}="${esc(k)}" class="${k === aktiv ? "aktiv" : ""}">${esc(name)}</button>`).join("");
  htmlSetzen($("register-konto"), wahl([["alle", "Beide"], ...Object.entries(KONTO_NAME)], RG.konto, "rkonto"));
  htmlSetzen($("register-status"), wahl([["alle", "Alle"], ...RG_STATUS.map((s) => [s, s])], RG.status, "rstatus"));
  if (!RG.daten) { registerLaden(); return htmlSetzen($("register-tabelle"), `<div class="leer">${RG.alt ? "Das Register kommt mit dem nächsten Neustart des Cockpits (♻ unten links)." : "Register wird geladen …"}</div>`); }
  const alle = RG.daten.eintraege || [];
  const liste = alle.filter((e) => (RG.konto === "alle" || e.konto === RG.konto) && (RG.status === "alle" || e.status === RG.status));
  const zf = RG.daten.zusammenfassung || {};
  $("register-stand").textContent = RG.daten.stand ? `Stand ${new Date(RG.daten.stand).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : "";
  $("register-info").textContent = `${liste.length} von ${alle.length} Videos`;
  if (S.seite === "register") $("seiten-unter").textContent = `${zf.gesamt || 0} Videos · ${zf.je_status?.gepostet || 0} gepostet`;
  const summe = `<div class="register-summe">${RG_STATUS.map((s) => `<span class="chip ${RG_KLASSE[s]}">${esc(s)} ${zf.je_status?.[s] || 0}</span>`).join("")}${Object.entries(zf.je_format || {}).filter(([f]) => f !== "ohne Angabe").map(([f, n]) => `<span class="chip">${esc(f)} ${n}</span>`).join("")}</div>`;
  if (!liste.length) return htmlSetzen($("register-tabelle"), `${summe}<div class="leer">Keine Videos für diese Auswahl.</div>`);
  const z = (n) => (n === null || n === undefined ? "–" : zahl(n));
  const zeilen = liste.map((e) => {
    const x = e.zahlen || {};
    const titel = e.link && e.status === "gepostet" ? `<a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">${esc(e.titel)}</a>` : esc(e.titel);
    const feld = [e.idee?.feld, e.format].filter(Boolean).join(" · ");
    const marken = [e.automatisch?.gewaehlt ? "automatisch gewählt" : "", e.automatisch?.freigegeben ? "automatisch freigegeben" : "", e.idee?.suchbegriff ? `Suchbegriff: ${e.idee.suchbegriff}` : "", e.status === "Fehler" ? e.fehler : ""].filter(Boolean).join(" · ");
    const teil = Number(e.teil) > 1 || e.idee?.typ === "folgeteil" ? `Teil ${e.teil || 2}` : "";
    const wiedergabe = x.avg_watch_s ? `${String(Math.round(x.avg_watch_s * 10) / 10).replace(".", ",")} s${x.gesehen_prozent ? ` (${x.gesehen_prozent} %)` : ""}` : "–";
    const follows = x.follows === null || x.follows === undefined ? "–" : `${x.follows > 0 ? "+" : ""}${zahl(x.follows)}`;
    const oeffnen = e.quelle === "cockpit" ? ` data-oeffnen="${esc(e.id)}" style="cursor:pointer"` : "";
    return `<tr${oeffnen}>
      <td>${esc(tagLabel(e.datum))}</td><td>${esc(SLOT_NAME[e.slot] || e.slot || "")}</td>
      <td><span class="chip ${kontoInfo(e.konto).klasse}">${esc(KONTO_NAME[e.konto] || e.konto)}</span></td>
      <td class="video-titel" title="${esc(e.titel)}">${titel}${marken ? `<small title="${esc(marken)}">${esc(marken.slice(0, 110))}</small>` : ""}</td>
      <td>${esc(feld || "–")}</td>
      <td><span class="chip ${RG_KLASSE[e.status] || ""}">${esc(e.status)}${e.status === "Fehler" && e.fehler_phase ? ` (${esc(e.fehler_phase)})` : ""}</span></td>
      <td>${e.laenge_s ? `${Math.round(e.laenge_s)} s` : "–"}</td><td class="gross">${z(x.aufrufe)}</td><td>${wiedergabe}</td><td>${follows}</td>
      <td>${[x.treffer ? "🎯 Treffer" : "", teil].filter(Boolean).join(" · ") || "–"}</td>
    </tr>`;
  }).join("");
  htmlSetzen($("register-tabelle"), `${summe}<table><thead><tr><th>Datum</th><th>Slot</th><th>Account</th><th>Titel</th><th>Feld · Format</th><th>Status</th><th>Länge</th><th>Aufrufe</th><th title="durchschnittliche Wiedergabezeit, in Klammern der Anteil an der Länge">Ø-Wiedergabe</th><th title="Follower-Zuwachs in den 24 Stunden nach dem Post (netto)">Follows</th><th>Treffer · Teil</th></tr></thead><tbody>${zeilen}</tbody></table>`);
}

$("register-konto").addEventListener("click", (e) => { const b = e.target.closest("[data-rkonto]"); if (!b) return; RG.konto = b.dataset.rkonto; lokal.schreiben("register-konto", RG.konto); registerZeichnen(); });
$("register-status").addEventListener("click", (e) => { const b = e.target.closest("[data-rstatus]"); if (!b) return; RG.status = b.dataset.rstatus; lokal.schreiben("register-status", RG.status); registerZeichnen(); });
$("register-tabelle").addEventListener("click", (e) => {
  if (e.target.closest("a")) return;
  const z = e.target.closest("[data-oeffnen]");
  if (z && skriptDok(z.dataset.oeffnen)) studioOeffnen(z.dataset.oeffnen);
});
$("k-register-neu").addEventListener("click", async () => {
  const r = await post("/api/register");
  if (r.ok) toast("📒", "Register aktualisiert", `${r.videos} Videos · Notiz ${r.notiz?.geschrieben ? "neu geschrieben" : "unverändert"}`, "erfolg");
  else toast("⚠️", "Register", r.fehler || "Nicht möglich (Cockpit nach dem Update neu starten?)", "problem");
  registerLaden(true);
});

beiEreignis("register", () => { if (S.seite === "register") registerLaden(true); else RG.zuletzt = 0; });
document.addEventListener("cockpit:seite", (e) => { if (e.detail === "register") registerLaden(); });
zeichner("register", registerZeichnen);
