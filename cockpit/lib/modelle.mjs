// Modell-Automatik: je Auftrag das günstigste Modell, das die Qualität sicher hält (Wunsch des Inhabers 03.11.).
// Grundlage CLAUDE.md §4: Opus für Recherche, Skripte, Ideen und Abnahme; Sonnet für Routine und Auswertung;
// Haiku nur für reine Textarbeit ohne Fakten (Titel, Hashtags, Kürzen). Liefert ein kleineres Modell ein
// ungültiges Ergebnis, wiederholt das Cockpit den Auftrag eine Stufe höher (eskalieren).

export const STUFEN = ["haiku", "sonnet", "opus"];

// Feste Zuordnung für Studio- und System-Aufträge
const FEST = {
  ideen: ["opus", "Ideen entscheiden über die Reichweite: kreativste Stufe"],
  skripte: ["opus", "Recherche und faktentreues Skript (CLAUDE.md §4: Opus)"],
  neu_schreiben: ["opus", "Neufassung mit Recherche (CLAUDE.md §4: Opus)"],
  vorschlag_umsetzen: ["opus", "Änderung an Regeln, Skill oder Design: höchste Sorgfalt"],
  produktion: ["opus", "Produktion steuern und abnehmen wie die Tages-Sitzung (Opus), Bau-Agenten mit Sonnet (CLAUDE.md §4)"],
  nachpruefen: ["sonnet", "Nachprüfung nach dem Posten: Routine"],
  abnahme: ["opus", "Abnahme eines Videos (CLAUDE.md §4: Opus)"],
  briefing: ["sonnet", "Zusammenfassen vorhandener Dateien, keine Recherche"],
};

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
