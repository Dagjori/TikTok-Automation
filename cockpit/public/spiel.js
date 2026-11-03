"use strict";
// Stimmung: Sounds passend zur Arbeit, Arbeitsmusik, Maskottchen „Simu“, Render-Meilensteine, erreichte Ziele.
// XP, Level, Combo, Quests und Erfolge gibt es seit 03.11. nicht mehr (Inhaber: „Alles Spielerische weg, nur die Ziele bleiben“).
// Alles mit WebAudio erzeugt (keine Dateien). Nutzt S, $, esc, Ton, P, toast, mitte, lokal aus cockpit.js.

const Spiel = (() => {
  const zustand = { letzteAktion: 0, modus: "ruhe", musik: lokal.lesen("musik", "an") !== "aus", renderStufe: {} };

  // ───────── Klangbausteine ─────────
  const ctx = () => (Ton.an && Ton.ctx && Ton.ctx.state === "running" ? Ton.ctx : null);
  let rauschen = null;
  function rauschPuffer(c) {
    if (rauschen) return rauschen;
    rauschen = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = rauschen.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return rauschen;
  }
  function ton(f, dauer, typ = "sine", laut = 0.04, verz = 0, gleitZu = null) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + verz, o = c.createOscillator(), g = c.createGain();
    o.type = typ; o.frequency.setValueAtTime(f, t);
    if (gleitZu) o.frequency.exponentialRampToValueAtTime(gleitZu, t + dauer);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dauer + 0.05);
  }
  function rauschStoss(dauer, frequenz, laut = 0.05, verz = 0, typ = "bandpass") {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + verz, q = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    q.buffer = rauschPuffer(c); f.type = typ; f.frequency.setValueAtTime(frequenz, t); f.Q.value = 1.2;
    g.gain.setValueAtTime(laut, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    q.connect(f).connect(g).connect(c.destination); q.start(t); q.stop(t + dauer + 0.05);
  }
  const KLANG = {
    seite: () => { rauschStoss(0.18, 2400, 0.05); rauschStoss(0.12, 3800, 0.03, 0.07); },
    tippen: () => { for (let i = 0; i < 6; i++) rauschStoss(0.03, 3000 + Math.random() * 1500, 0.05, i * 0.055, "highpass"); },
    terminal: () => [660, 880, 1100].forEach((f, i) => ton(f, 0.06, "square", 0.018, i * 0.07)),
    sonar: () => { ton(1250, 0.5, "sine", 0.05); ton(1250, 0.5, "sine", 0.018, 0.28); ton(1250, 0.5, "sine", 0.007, 0.56); },
    modem: () => [1400, 900, 1800, 1100].forEach((f, i) => ton(f, 0.05, "triangle", 0.02, i * 0.05)),
    scanner: () => ton(300, 0.35, "sawtooth", 0.02, 0, 2400),
    agent: () => { ton(200, 0.45, "sawtooth", 0.03, 0, 1600); rauschStoss(0.4, 900, 0.03); },
    liste: () => { ton(1568, 0.12, "triangle", 0.04); ton(2093, 0.18, "triangle", 0.04, 0.09); },
    pop: () => ton(520, 0.09, "sine", 0.04, 0, 780),
    denken: () => [220, 277, 330].forEach((f) => ton(f, 0.9, "sine", 0.012)),
    powerup: () => [262, 330, 392, 523, 659].forEach((f, i) => ton(f, 0.18, "square", 0.02, i * 0.06)),
    sonnet: () => [392, 523].forEach((f, i) => ton(f, 0.14, "triangle", 0.03, i * 0.07)),
    haiku: () => ton(1046, 0.1, "sine", 0.03),
    sieg: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => ton(f, 0.2, "triangle", 0.04, i * 0.09)),
    buzz: () => { ton(110, 0.35, "sawtooth", 0.05); ton(104, 0.35, "sawtooth", 0.04, 0.05); },
    kasse: () => { ton(1318, 0.08, "square", 0.025); ton(1760, 0.25, "triangle", 0.04, 0.08); rauschStoss(0.15, 6000, 0.02, 0.05, "highpass"); },
    glocke: () => [1760, 2637].forEach((f, i) => ton(f, 0.6, "sine", 0.03, i * 0.03)),
    wechsel: () => { ton(400, 0.18, "sine", 0.02, 0, 900); rauschStoss(0.15, 1500, 0.02); },
    meilenstein: () => [784, 988, 1175].forEach((f, i) => ton(f, 0.16, "triangle", 0.035, i * 0.08)),
  };
  const WERKZEUG_KLANG = { Read: "seite", Write: "tippen", Edit: "tippen", MultiEdit: "tippen", NotebookEdit: "tippen", Bash: "terminal", PowerShell: "terminal",
    WebSearch: "sonar", WebFetch: "modem", Grep: "scanner", Glob: "scanner", Task: "agent", Agent: "agent", TodoWrite: "liste", TaskCreate: "liste", TaskUpdate: "liste" };
  const WERKZEUG_MODUS = { WebSearch: "recherche", WebFetch: "recherche", Write: "schreiben", Edit: "schreiben", MultiEdit: "schreiben", Bash: "technik", PowerShell: "technik", Read: "lesen", Grep: "lesen", Glob: "lesen" };

  // ───────── Arbeitsmusik (läuft nur, solange Claude arbeitet) ─────────
  const MUSTER = {
    ruhe: { bpm: 0 },
    denken: { bpm: 78, noten: [0, 3, 7, 10], bass: [0, -5] },
    lesen: { bpm: 96, noten: [0, 7, 3, 7, 10, 7, 3, 7], bass: [0, 0, -2, -5] },
    recherche: { bpm: 104, noten: [0, 12, 7, 15, 10, 12, 3, 7], bass: [0, -4, -2, -5] },
    schreiben: { bpm: 118, noten: [0, 3, 7, 12, 7, 3, 10, 7], bass: [0, -2, -4, -5] },
    technik: { bpm: 126, noten: [0, 0, 7, 0, 10, 0, 12, 7], bass: [0, 0, -5, -5] },
    rendern: { bpm: 132, noten: [0, 7, 12, 7, 15, 12, 7, 3], bass: [0, -5, -2, -7] },
  };
  let musikTimer = null, schritt = 0;
  function musikTakt() {
    const m = MUSTER[zustand.modus] || MUSTER.ruhe;
    clearTimeout(musikTimer);
    if (!m.bpm || !zustand.musik) return;
    const grund = 220; // A3, Moll-Färbung
    const f = (halb) => grund * Math.pow(2, halb / 12);
    const n = m.noten[schritt % m.noten.length];
    ton(f(n + 12), 0.16, "triangle", 0.014);
    if (schritt % 4 === 0) ton(f(m.bass[(schritt / 4) % m.bass.length] - 12), 0.42, "sine", 0.03);
    schritt++;
    musikTimer = setTimeout(musikTakt, 60000 / m.bpm / 2);
  }
  function modusSetzen(modus) {
    if (zustand.modus === modus) return;
    zustand.modus = modus;
    document.documentElement.style.setProperty("--tempo", { ruhe: "6s", denken: "4.5s", lesen: "3.5s", recherche: "2.6s", schreiben: "2.2s", technik: "2s", rendern: "1.6s" }[modus] || "6s");
    musikTakt();
  }

  // ───────── Maskottchen ─────────
  let blaseTimer = null;
  function simu(stimmung, text) {
    const m = $("maskottchen");
    if (!m) return;
    m.dataset.stimmung = stimmung;
    if (text) {
      $("simu-text").textContent = text;
      m.classList.add("spricht");
      clearTimeout(blaseTimer);
      blaseTimer = setTimeout(() => m.classList.remove("spricht"), 4500);
    }
  }
  const SPRUECHE = {
    Read: ["Ich lese mich ein …", "Moment, ich schau nach."], Write: ["Ich schreibe!", "Datei entsteht …"], Edit: ["Feinschliff …", "Ich verbessere das."],
    WebSearch: ["Ich recherchiere!", "Quellen suchen …", "Fakten checken!"], WebFetch: ["Primärquelle öffnen …"], Bash: ["Befehl läuft …", "Ich rechne nach."],
    Grep: ["Ich durchsuche alles."], Task: ["Ich hole Verstärkung!"], Agent: ["Ich hole Verstärkung!"], TodoWrite: ["Plan steht!", "Haken dran ✓"],
  };
  const spruch = (name) => { const l = SPRUECHE[name]; return l ? l[Math.floor(Math.random() * l.length)] : null; };

  function wackeln(staerke = "") {
    document.body.classList.remove("wackeln", "wackeln-stark"); void document.body.offsetWidth;
    document.body.classList.add(staerke === "stark" ? "wackeln-stark" : "wackeln");
    setTimeout(() => document.body.classList.remove("wackeln", "wackeln-stark"), 600);
  }

  // ───────── Feed-Ereignisse ─────────
  function feed(e, el) {
    switch (e.art) {
      case "werkzeug": {
        (KLANG[WERKZEUG_KLANG[e.name]] || KLANG.pop)();
        modusSetzen(WERKZEUG_MODUS[e.name] || "denken");
        zustand.letzteAktion = Date.now();
        if (el.offsetParent) { const [x, y] = mitte(el); P.funken(x - el.offsetWidth / 2 + 14, y, 8); }
        const s = spruch(e.name);
        simu("arbeitet", s);
        break;
      }
      case "denken": KLANG.denken(); modusSetzen("denken"); simu("denkt", "Hmm, lass mich überlegen …"); break;
      case "text": KLANG.pop(); simu("arbeitet"); break;
      case "auftrag": KLANG.meilenstein(); modusSetzen("denken"); simu("arbeitet", `Auf geht's: ${e.text.split("·")[0].trim()}`); break;
      case "modell": (KLANG[e.modell] || (e.modell === "opus" ? KLANG.powerup : KLANG.pop))(); if (e.modell === "opus" && $("claude-status").offsetParent) { P.funken(...mitte($("claude-status")), 18); } break;
      case "du": KLANG.wechsel(); simu("hoert", "Verstanden!"); break;
      case "fertig":
        KLANG.sieg(); modusSetzen("ruhe"); simu("jubelt", "Erledigt! 🎉");
        if ($("claude-panel").getBoundingClientRect().right <= innerWidth + 1) P.konfetti(...mitte($("claude-panel")), 90, 8);
        break;
      case "fehler": KLANG.buzz(); simu("traurig", "Ups, da hakt was."); wackeln(); break;
    }
  }

  // ───────── Render-Meilensteine und Zahlen-Pulse ─────────
  function renderEreignis(r) {
    for (const a of r.auftraege || []) {
      if (a.status !== "laeuft") continue;
      const p = Math.floor((a.prozent || 0) / 25) * 25;
      const alt = zustand.renderStufe[a.id];
      if (alt !== undefined && p > alt && p > 0 && p < 100) {
        KLANG.meilenstein();
        simu("jubelt", p === 50 ? "Halbzeit beim Rendern!" : `${p} % gerendert!`);
        toast("🎬", `${p} % gerendert`, a.projekt, "meilenstein");
      }
      zustand.renderStufe[a.id] = p;
      if (a.phase === "rendern" && zustand.modus === "ruhe") modusSetzen("rendern");
    }
    if (!(r.auftraege || []).some((a) => a.status === "laeuft") && zustand.modus === "rendern") modusSetzen("ruhe");
  }

  function zahlenPuls(z) {
    if (z.art === "follower") {
      KLANG.kasse();
      herzenAusHandy(Math.min(20, 4 + z.plus));
      simu("jubelt", `+${z.plus} Follower! 🎉`);
      toast("👥", `+${z.plus} Follower`, `${z.kanal}: jetzt ${Number(z.wert).toLocaleString("de-DE")}`, "meilenstein");
    } else if (z.art === "views" && z.plus >= 50) {
      KLANG.pop();
      tickerNeu(`👀 +${z.plus} Views · ${String(z.titel || "").slice(0, 40)}`);
    }
  }

  // Ein Ziel bis zum CRP ist erreicht (in der Stadt steigt dazu Feuerwerk über dem Ziele-Turm)
  function zielErreicht(m) {
    const o = $("levelup");
    $("levelup-zahl").textContent = m.mission.icon || "🎯";
    $("levelup-rang").textContent = `${m.mission.titel} · ${m.konto === "stelldirvor" ? "Stell dir vor" : "Simulierbar"}`;
    o.hidden = false;
    KLANG.sieg(); setTimeout(KLANG.sieg, 600);
    wackeln("stark");
    P.konfetti(innerWidth / 2, innerHeight / 2, 320, 14);
    setTimeout(() => { o.hidden = true; }, 3500);
  }

  // ───────── Gebäudewechsel (das Bild macht die Neon-Stadt: Anflug und Eintritt) ─────────
  function wechsel() {
    KLANG.wechsel();
  }

  // Musik-Knopf
  function musikKnopf() { $("k-musik").textContent = zustand.musik ? "🎵" : "🔕"; $("k-musik").classList.toggle("aus", !zustand.musik); }
  $("k-musik").addEventListener("click", () => {
    zustand.musik = !zustand.musik;
    lokal.schreiben("musik", zustand.musik ? "an" : "aus");
    Ton.init(); musikKnopf(); musikTakt();
    simu(zustand.musik ? "jubelt" : "ruhe", zustand.musik ? "Musik an! 🎶" : "Musik aus.");
  });
  musikKnopf();

  // Leerlauf: Simu blinzelt und schaut sich um; nach langer Ruhe ein Spruch
  setInterval(() => {
    const m = $("maskottchen");
    if (!m || m.dataset.stimmung === "arbeitet") return;
    if (!S.claude?.laeuft && Date.now() - zustand.letzteAktion > 15000 && zustand.modus !== "rendern") { modusSetzen("ruhe"); m.dataset.stimmung = "ruhe"; }
  }, 4000);

  document.addEventListener("cockpit:verbunden", (ev) => {
    const es = ev.detail;
    const an = (art, f) => es.addEventListener(art, (e) => { try { f(JSON.parse(e.data)); } catch (err) { console.error(art, err); } });
    an("zustand", () => simu("ruhe", "Hi! Ich bin Simu. Los geht's! 🚀"));
    an("render", renderEreignis);
    an("zahlen_puls", zahlenPuls);
    an("mission_erreicht", zielErreicht);
    an("claude", (c) => { if (!c.laeuft && zustand.modus !== "rendern") modusSetzen("ruhe"); else if (c.laeuft && zustand.modus === "ruhe") modusSetzen("denken"); });
  });

  return { feed, simu, klang: KLANG, wechsel, modusSetzen, wackeln };
})();
