// Autopilot (Ausbau 10.11.2026, jeder Schalter steht auf AUS, bis der Inhaber ihn einschaltet; reine Funktionen, Tests in
// autopilot.test.mjs). lib/automatik.mjs ruft sie im Takt auf:
//   auto_wahl      Hat der Inhaber nach der Frist nicht gewählt, wählt das Cockpit: zuerst Folgeteile eigener Treffer, dann die
//                  höchsten Punkte (Feld „punkte“ der Idee, sonst Reihenfolge der Liste), nie zwei Ideen mit demselben Themenfeld
//                  („feld“) am selben Tag in einem Account.
//   auto_freigabe  Ein fertiges Skript wird nach der Frist nur freigegeben, wenn die Selbstprüfung keinen durchgefallenen Punkt
//                  hat, die Zahlen Quellen haben, die Originalität geprüft ist und (Simulierbar) die kostenlose Text-Vorprüfung
//                  der Stimme besteht. Sonst wartet es auf den Inhaber.

const klein = (t) => String(t ?? "").trim().toLowerCase();

// „17/21“, „17“, 17, { summe: 17 } → 17; unlesbar → null
export function punkteVon(idee) {
  const p = idee?.punkte;
  if (typeof p === "number" && Number.isFinite(p)) return p;
  if (p && typeof p === "object") {
    for (const k of ["summe", "gesamt", "punkte", "wert"]) if (Number.isFinite(Number(p[k]))) return Number(p[k]);
    return null;
  }
  const m = String(p ?? "").match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(",", ".")) : null;
}

// ideen: Liste des Tages (Reihenfolge = Rang von Claude). freieSlots: z. B. ["mittag", "abend"]. belegt: Ideen der schon
// gewählten Slots des Kontos an diesem Tag. → [{ slot, nr, titel, grund }] (höchstens so viele wie freie Slots)
export function autoWahl(ideen = [], freieSlots = [], belegt = []) {
  const titelWeg = new Set(belegt.map((i) => klein(i?.titel)).filter(Boolean));
  const felderWeg = new Set(belegt.map((i) => klein(i?.feld)).filter(Boolean));
  const kandidaten = ideen
    .map((idee, platz) => ({ idee, platz, folge: idee?.typ === "folgeteil", punkte: punkteVon(idee) }))
    .filter((k) => k.idee && k.idee.titel && Number.isFinite(Number(k.idee.nr)))
    .sort((a, b) => (b.folge - a.folge) || ((b.punkte ?? -Infinity) - (a.punkte ?? -Infinity)) || (a.platz - b.platz));
  const wahl = [];
  for (const slot of freieSlots) {
    const k = kandidaten.find((x) => !titelWeg.has(klein(x.idee.titel)) && !(klein(x.idee.feld) && felderWeg.has(klein(x.idee.feld))));
    if (!k) break;
    titelWeg.add(klein(k.idee.titel));
    if (klein(k.idee.feld)) felderWeg.add(klein(k.idee.feld));
    wahl.push({
      slot, nr: Number(k.idee.nr), titel: k.idee.titel,
      grund: k.folge ? `Folgeteil eines eigenen Treffers (Teil ${k.idee.teil || 2})` : k.punkte !== null ? `höchste Punktzahl (${k.punkte})` : `Platz ${k.platz + 1} der Liste`,
    });
  }
  return wahl;
}

// Durchgefallener Punkt in der Selbstprüfung (Liste aus Sätzen oder Objekten)
const DURCHGEFALLEN = /✗|❌|✕|nicht erfüllt|nicht bestanden|nicht eingehalten|durchgefallen|nicht bereit|verfehlt|ungeprüft|nicht belegt|unbelegt|nicht geprüft|: ?(nein|offen|fehlt)\b/i;
// „nichts als Fakt behauptet, was nicht belegt ist“ ist ein bestandener Punkt (doppelte Verneinung)
const DOPPELT_VERNEINT = /\b(?:nichts|kein\w*)\b[^.;]*?\bnicht (?:belegt|geprüft|erfüllt)[^.;]*/gi;
export function selbstpruefungOffen(liste) {
  if (!Array.isArray(liste) || !liste.length) return ["Selbstprüfung fehlt"];
  const offen = [];
  for (const p of liste) {
    if (p && typeof p === "object") {
      if (p.ok === false || p.bestanden === false || p.erfuellt === false || /nein|offen|fehl/i.test(String(p.status ?? ""))) offen.push(String(p.punkt || p.text || p.name || JSON.stringify(p)).slice(0, 120));
    } else if (DURCHGEFALLEN.test(String(p).replace(DOPPELT_VERNEINT, " "))) offen.push(String(p).slice(0, 120));
  }
  return offen;
}

const hatInhalt = (v) => (Array.isArray(v) ? v.length > 0 : v && typeof v === "object" ? Object.keys(v).length > 0 : !!String(v ?? "").trim());

// x: Slot-Daten (status skript_fertig). → { ok, gruende: [..] }. Die Text-Vorprüfung der Stimme (pipeline/qc/stimme_vorab.py)
// läuft getrennt im Server; ihr Ergebnis kommt als vorab = { ok, text } dazu (nur Simulierbar, sonst null).
export function freigabePruefen(x = {}, vorab = null) {
  const gruende = [];
  const s = x.skript || {};
  if (!hatInhalt(s)) gruende.push("kein Skript im Dokument");
  const offen = selbstpruefungOffen(x.selbstpruefung ?? s.selbstpruefung);
  if (offen.length) gruende.push(`Selbstprüfung: ${offen[0]}${offen.length > 1 ? ` (+${offen.length - 1})` : ""}`);
  const zahlen = x.zahlen ?? s.zahlen, quellen = x.quellen ?? s.quellen;
  if (hatInhalt(zahlen) && !hatInhalt(quellen)) gruende.push("Zahlen ohne Quellen");
  if (!hatInhalt(quellen)) { if (!gruende.includes("Zahlen ohne Quellen")) gruende.push("keine Quellen"); }
  if (x.faktencheck && !/^recherchiert/i.test(String(x.faktencheck))) gruende.push(`Faktencheck: ${x.faktencheck}`);
  const orig = x.originalitaet ?? s.originalitaet ?? x.idee?.originalitaet;
  if (/ungepr(?:ü|ue|u)ft/i.test(String(typeof orig === "object" ? JSON.stringify(orig) : orig ?? ""))) gruende.push("Originalität ungeprüft");
  else if (!hatInhalt(orig) && x.idee?.typ !== "folgeteil") gruende.push("Originalität nicht dokumentiert");
  if (x.kommentar && !x.kommentar_erledigt && x.kommentar_zeit && String(x.kommentar_zeit) > String(x.aktualisiert || "")) gruende.push("dein Kommentar ist noch offen");
  if (x.konto === "simulierbar") {
    if (!vorab) gruende.push("Text-Vorprüfung der Stimme lief nicht");
    else if (!vorab.ok) gruende.push(`Text-Vorprüfung der Stimme: ${String(vorab.text || "nicht bereit").slice(0, 140)}`);
  }
  return { ok: gruende.length === 0, gruende };
}
