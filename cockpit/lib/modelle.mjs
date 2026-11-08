// Modell-Automatik: je Auftrag das günstigste Modell, das die Qualität sicher hält (Wunsch des Inhabers 03.11.).
// Grundlage CLAUDE.md §4: Opus für Recherche, Skripte und Ideen; Sonnet für Routine, Auswertung und die Video-Produktion;
// Haiku nur für reine Textarbeit ohne Fakten (Titel, Hashtags, Kürzen). Liefert ein kleineres Modell ein
// ungültiges Ergebnis, wiederholt das Cockpit den Auftrag eine Stufe höher (eskalieren).
// Feste Regel des Inhabers 08.11.2026 (Tokens sparen, „es kann nicht sein dass das ganze limit genutzt wird nur für 1 video“):
// Videos baut Sonnet 5.5 von der Steuerung bis zur Abnahme. Opus 5.5 nur als einzelner Agent für einen Neubau von Grund auf
// (Stil ohne Baukasten, neuer Welttyp, neuer Objekttyp, neues Design-Element). Gilt auch für Wiederholungen der Automatik.

export const STUFEN = ["haiku", "sonnet", "opus"];

// Feste Zuordnung für Studio- und System-Aufträge
const FEST = {
  ideen: ["opus", "Ideen entscheiden über die Reichweite: kreativste Stufe"],
  skripte: ["opus", "Recherche und faktentreues Skript (CLAUDE.md §4: Opus)"],
  neu_schreiben: ["opus", "Neufassung mit Recherche (CLAUDE.md §4: Opus)"],
  vorschlag_umsetzen: ["opus", "Änderung an Regeln, Skill oder Design: höchste Sorgfalt"],
  produktion: ["sonnet", "feste Regel: Videos mit Sonnet 5.5, Opus nur als Agent für einen Neubau (Stil, Welt, Objekttyp, Design)"],
  nachpruefen: ["sonnet", "Nachprüfung nach dem Posten: Routine"],
  abnahme: ["sonnet", "Abnahme eines Videos mit den Prüfskripten (feste Regel 08.11.: Sonnet)"],
  briefing: ["sonnet", "Zusammenfassen vorhandener Dateien, keine Recherche"],
};

// Steht wörtlich im Auftrag jeder Produktions-Sitzung (server.mjs → produzieren) und in cockpit/anleitung/produktion.md §0.6
export const PRODUKTION_MODELLREGEL =
  "MODELL (feste Regel des Inhabers, Tokens sparen): Du läufst mit Sonnet 5.5 und machst alles selbst: steuern, bauen, prüfen, abnehmen. " +
  "Was wir schon gebaut haben (vorhandene Stile und Baukästen, Welten unter pipeline/engine/, Objekttypen, HUD, Ton), baust du mit Sonnet; " +
  "Agenten nur mit model: sonnet, höchstens 2 gleichzeitig. Opus nur für einen Neubau von Grund auf (ein Stil ohne Baukasten, ein Welttyp, " +
  "den es noch nicht gibt, ein neuer Objekttyp oder ein neues Design-Element): dann genau einen Agenten mit model: opus nur für diesen Baustein, " +
  "vorher Meilenstein „Neubau mit Opus: <was>“. Abwandlungen von Vorhandenem (Farben, Zahlen, Kamerafahrt, Objekte umstellen, " +
  "Variante einer vorhandenen Welt) sind kein Neubau.";

// Chat und Sprachbot: nach Inhalt des Auftrags
const OPUS_MUSTER = /recherch|skript|faktencheck|quelle|warum|strateg|analys|auswert|bewert|verbesser|optimier|design|stil|welt|szene|animation|hook|viral|idee|konzept|plan|architektur|programm|code|bau[e ]|entwickl|fehler|debug|repar|vergleich|entscheid|rechn|simulier/i;
const HAIKU_MUSTER = /^(?:bitte\s+)?(?:formulier|kürz|kuerz|übersetz|uebersetz|hashtags?|titel(?:vorschl|ideen)?\s+für|rechtschreib|tippfehler|mach.*(?:kürzer|freundlicher)|schreib.*(?:caption|hashtags))/i;
const TRIVIAL = /^(?:hallo|hi|hey|danke|merci|ok(?:ay)?|super|passt|ja|nein|guten (?:morgen|abend|tag))[\s!.?]*$/i;

export function modellWaehlen(job, { lernschleifeVideos = 0 } = {}) {
  if (job.modellFest) return { modell: job.modellFest, grund: "von dir gewählt" };
  if (job.art === "lernschleife") {
    // Wenige gereifte Videos: nur Annahmen möglich, Sonnet reicht; ab 5 je Konto lohnt die tiefere Musteranalyse
    return lernschleifeVideos >= 5
      ? { modell: "opus", grund: `${lernschleifeVideos} gereifte Videos je Konto: tiefe Musteranalyse (Hook, Tempo, Design)` }
      : { modell: "sonnet", grund: `erst ${lernschleifeVideos} gereifte Videos je Konto: Aussagen nur als Annahme, Sonnet reicht` };
  }
  if (FEST[job.art]) return { modell: FEST[job.art][0], grund: FEST[job.art][1] };
  const text = String(job.text || "").trim();
  if (TRIVIAL.test(text)) return { modell: "haiku", grund: "kurze Begrüßung oder Bestätigung" };
  if (HAIKU_MUSTER.test(text) && text.length < 300 && !OPUS_MUSTER.test(text.replace(HAIKU_MUSTER, ""))) return { modell: "haiku", grund: "reine Textarbeit ohne Fakten" };
  if (OPUS_MUSTER.test(text) || text.length > 600) return { modell: "opus", grund: "braucht Recherche, Urteil oder Kreativität" };
  return { modell: "sonnet", grund: "Frage, Status oder Zusammenfassung" };
}

export function eineStufeHoeher(modell) {
  const i = STUFEN.indexOf(modell);
  return i >= 0 && i < STUFEN.length - 1 ? STUFEN[i + 1] : null;
}
