"use strict";
// Sprachbot: an/aus mit 🎙️ oder Strg+M. Freihändig (Entscheidung des Inhabers 03.11.): hört zu, antwortet laut, hört wieder zu,
// bis „Pause“/„Stopp“ oder der Schalter ihn beendet. Erkennung über die Spracherkennung von Edge (Microsoft-Onlinedienst),
// Vorlesen mit einer deutschen Windows-Stimme. Einfache Befehle erledigt er sofort selbst, alles andere geht an Claude.
// Nutzt S, $, Ton, toast, auftragSenden, ansichtSetzen, Spiel.

const Stimme = (() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const z = { an: false, phase: "aus", rec: null, mikro: null, analyser: null, wartet: false, antworten: [], wartenTimer: null, stimme: null };

  // ───────── Anzeige ─────────
  function phase(p, text) {
    z.phase = p;
    $("sprachbot").dataset.phase = p;
    $("sprachbot-status").textContent = { hoert: "Ich höre zu …", denkt: "Claude arbeitet daran …", spricht: "Ich antworte …", aus: "Aus" }[p] || p;
    $("orb-icon").textContent = { hoert: "🎙️", denkt: "🧠", spricht: "🔊" }[p] || "🎙️";
    if (text !== undefined) $("sprachbot-mitschrift").textContent = text;
    $("k-stimme").classList.toggle("an", z.an);
  }

  // Wellen-Orb aus dem Mikrofon-Pegel (nur Anzeige, nichts wird gespeichert)
  function orbZeichnen() {
    if (!z.an) return;
    const c = $("orb-welle"), g = c.getContext("2d");
    g.clearRect(0, 0, c.width, c.height);
    const daten = new Uint8Array(64);
    if (z.analyser) z.analyser.getByteFrequencyData(daten);
    const farbe = { hoert: "#25f4ee", denkt: "#ffd166", spricht: "#fe2c55" }[z.phase] || "#25f4ee";
    g.strokeStyle = farbe; g.lineWidth = 3; g.shadowColor = farbe; g.shadowBlur = 14;
    g.beginPath();
    for (let i = 0; i <= 64; i++) {
      const w = (i / 64) * Math.PI * 2;
      const pegel = z.phase === "hoert" ? daten[i % 64] / 255 : 0.25 + 0.15 * Math.sin(performance.now() / 160 + i / 3);
      const r = 46 + pegel * 26;
      const x = 80 + Math.cos(w) * r, y = 80 + Math.sin(w) * r;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.stroke();
    requestAnimationFrame(orbZeichnen);
  }

  // ───────── Sprechen ─────────
  function stimmeWaehlen() {
    const alle = speechSynthesis.getVoices().filter((v) => /^de(-|_)/i.test(v.lang));
    z.stimme = alle.find((v) => /Natural/i.test(v.name) && /Seraphina|Katja|Amala/i.test(v.name)) || alle.find((v) => /Natural/i.test(v.name)) || alle.find((v) => /Katja|Hedda/i.test(v.name)) || alle[0] || null;
  }
  if ("speechSynthesis" in window) { stimmeWaehlen(); speechSynthesis.onvoiceschanged = stimmeWaehlen; }

  function sprechbar(text) {
    return String(text || "").replace(/```[\s\S]*?```/g, " ").replace(/`([^`]+)`/g, "$1").replace(/\*\*|__|#+\s|^\s*[-*•]\s/gm, "")
      .replace(/https?:\/\/\S+/g, "ein Link").replace(/[A-Za-z]:\\[^\s]+/g, "eine Datei").replace(/\s+/g, " ").trim().slice(0, 600);
  }

  function sprechen(text, danach) {
    if (!("speechSynthesis" in window)) { danach?.(); return; }
    zuhoerenStoppen();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(sprechbar(text));
    u.lang = "de-DE";
    if (z.stimme) u.voice = z.stimme;
    u.rate = 1.05;
    u.onend = u.onerror = () => { if (z.an) danach ? danach() : zuhoeren(); };
    phase("spricht", sprechbar(text));
    Spiel.simu("arbeitet", sprechbar(text).slice(0, 80));
    speechSynthesis.speak(u);
  }

  // ───────── Zuhören ─────────
  function zuhoeren() {
    if (!z.an) return;
    zuhoerenStoppen();
    const rec = new SR();
    rec.lang = "de-DE";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let endgueltig = "";
    rec.onresult = (e) => {
      let zwischen = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) endgueltig += e.results[i][0].transcript;
        else zwischen += e.results[i][0].transcript;
      }
      $("sprachbot-mitschrift").textContent = (endgueltig + zwischen) || "…";
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        toast("🎙️", "Mikrofon nicht erlaubt", "Erlaube das Mikrofon für das Cockpit (Symbol in der Adresszeile bzw. Edge-Einstellungen).", "problem");
        aus();
      }
    };
    rec.onend = () => {
      z.rec = null;
      if (!z.an || z.phase !== "hoert") return;
      if (endgueltig.trim()) verarbeiten(endgueltig.trim());
      else setTimeout(zuhoeren, 250); // Stille: einfach weiter zuhören
    };
    z.rec = rec;
    phase("hoert");
    try { rec.start(); } catch { setTimeout(zuhoeren, 500); }
  }
  function zuhoerenStoppen() {
    if (z.rec) { const r = z.rec; z.rec = null; r.onend = null; try { r.abort(); } catch { /* schon zu */ } }
  }

  // ───────── Verstehen ─────────
  const LOKAL = [
    [/^(pause|stopp?|halt|sprachbot aus|aus|tschüss|tschau|ende|das war'?s|danke,? das war'?s)\b/i, () => sprechen("Okay, ich mache Pause. Bis gleich!", aus)],
    [/(zurück ins cockpit|stadt (verlassen|schließen|zu))/i, () => { window.Welt?.stadt(false); sprechen("Zurück im Cockpit."); }],
    [/(zeig|öffne|geh zu|flieg).*(stadt|3d|welt)/i, () => {
      if (window.Welt && Welt.stufe !== "aus") { Welt.stadt(true); sprechen("Willkommen in der Neon-Stadt. Jeder Turm ist ein Video, je höher, desto mehr Views."); }
      else sprechen("Die 3D-Welt ist gerade ausgeschaltet. Du kannst sie mit dem Glitzer-Knopf oben einschalten.");
    }],
    [/(zeig|öffne|geh zu).*(studio|ideen|skript)/i, () => { ansichtSetzen("studio"); sprechen("Hier ist das Studio."); }],
    [/(zeig|öffne|geh zu).*(zahlen|statistik|follower|missionen|views)/i, () => { ansichtSetzen("zahlen"); sprechen(zahlenSatz()); }],
    [/(zeig|öffne|geh zu).*(lernen|vorschläge|verbesserung)/i, () => { ansichtSetzen("lernen"); sprechen("Hier sind die Vorschläge."); }],
    [/(zeig|öffne|geh zu).*(live|render|bühne|handy)/i, () => { ansichtSetzen("live"); sprechen("Hier ist die Live-Ansicht."); }],
    [/musik (aus|stopp)/i, () => { if (!$("k-musik").classList.contains("aus")) $("k-musik").click(); sprechen("Musik ist aus."); }],
    [/musik an/i, () => { if ($("k-musik").classList.contains("aus")) $("k-musik").click(); sprechen("Musik ist an."); }],
    [/(was gibt.?s neues|neue meldungen|meldungen)/i, () => sprechen(meldungenSatz())],
    [/(wie viele follower|follower.?zahl)/i, () => sprechen(zahlenSatz())],
  ];
  function zahlenSatz() {
    const p = ZS?.zahlen?.profile || {};
    const teile = Object.entries(p).map(([k, v]) => `${k === "simulierbar" ? "Simulierbar" : "Stell dir vor"} hat ${Number(v.follower).toLocaleString("de-DE")} Follower`);
    return teile.length ? teile.join(", ") + "." : "Ich habe noch keine Zahlen.";
  }
  function meldungenSatz() {
    const neu = (S.db?.meldungen || []).filter((m) => !m.daten.gelesen).slice(0, 3);
    return neu.length ? `Du hast ${neu.length} neue Meldungen: ${neu.map((m) => m.daten.titel).join(". ")}.` : "Keine neuen Meldungen.";
  }

  function verarbeiten(text) {
    Ton.klick();
    for (const [muster, tun] of LOKAL) if (muster.test(text)) { tun(); return; }
    // Alles andere an Claude (Modell-Automatik; Claude darf hier das Cockpit steuern)
    phase("denkt", `„${text}“`);
    Spiel.simu("denkt", "Ich frage Claude …");
    z.wartet = true;
    z.antworten = [];
    auftragSenden(text, { stimme: true, modus: "auto" });
    clearTimeout(z.wartenTimer);
    z.wartenTimer = setTimeout(() => {
      if (z.wartet && z.an) sprechen("Das dauert etwas länger. Ich sage Bescheid, sobald ich fertig bin. Was noch?");
    }, 90000);
  }

  // Antworten aus dem Feed einsammeln und am Ende vorlesen
  document.addEventListener("cockpit:feed", (ev) => {
    const e = ev.detail;
    if (!z.wartet) return;
    if (e.art === "text") z.antworten.push(e.text);
    if (e.art === "fertig" || e.art === "fehler") {
      z.wartet = false;
      clearTimeout(z.wartenTimer);
      const antwort = e.art === "fehler" ? `Da ist etwas schiefgegangen: ${e.text}` : z.antworten.at(-1) || "Erledigt.";
      if (z.an) sprechen(antwort);
    }
  });

  // ───────── An / Aus ─────────
  async function an() {
    if (!SR) { toast("🎙️", "Spracherkennung fehlt", "Dieser Browser kann keine Sprache erkennen. Öffne das Cockpit mit Strg+Alt+T (Edge).", "problem"); return; }
    Ton.init();
    z.an = true;
    $("sprachbot").hidden = false;
    try {
      z.mikro = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (Ton.ctx) {
        z.analyser = Ton.ctx.createAnalyser();
        z.analyser.fftSize = 128;
        Ton.ctx.createMediaStreamSource(z.mikro).connect(z.analyser);
      }
    } catch {
      toast("🎙️", "Mikrofon nicht erlaubt", "Erlaube das Mikrofon für das Cockpit, dann noch einmal einschalten.", "problem");
      aus();
      return;
    }
    orbZeichnen();
    Spiel.klang.powerup();
    lokal.schreiben("stimme-genutzt", "1");
    sprechen(lokal.lesen("stimme-begruesst", "") ? "Ich höre." : "Hallo! Ich bin dein Sprachbot. Sag mir, was ich als Nächstes machen soll. Mit Pause schalte ich mich aus.");
    lokal.schreiben("stimme-begruesst", "1");
  }
  function aus() {
    z.an = false;
    z.wartet = false;
    clearTimeout(z.wartenTimer);
    zuhoerenStoppen();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    z.mikro?.getTracks().forEach((t) => t.stop());
    z.mikro = null;
    z.analyser = null;
    $("sprachbot").hidden = true;
    phase("aus");
    Spiel.simu("ruhe", "Sprachbot aus.");
  }
  const umschalten = () => (z.an ? aus() : an());
  $("k-stimme").addEventListener("click", umschalten);
  $("k-stimme-aus").addEventListener("click", aus);
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); umschalten(); }
  });
  $("k-stimme").title = SR ? "Sprachbot an/aus (Strg+M)" : "Sprachbot: dieser Browser kann keine Sprache erkennen";

  return { an, aus, sprechen };
})();
