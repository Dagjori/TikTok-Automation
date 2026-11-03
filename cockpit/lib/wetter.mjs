// Echtes Berliner Wetter für die Neon-Stadt (Entscheidung des Inhabers 03.11.). Quelle: Open-Meteo, kostenlos und ohne Konto.
// Abfrage beim Start und alle 30 Min. (10 s Zeitlimit). Bei Fehlern bleibt der letzte Wert stehen, „fehler“ sagt kurz warum;
// nächster Versuch beim nächsten Takt. Jede Änderung geht als SSE-Ereignis „wetter“ an die Oberfläche.

const TAKT = 30 * 60 * 1000;
const ZEITLIMIT = 10000;
const ADRESSE = "https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41"
  + "&current=temperature_2m,weather_code,cloud_cover,precipitation,rain,snowfall,wind_speed_10m,is_day&timezone=Europe%2FBerlin";

const zahl = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

// Kurze Fehlermeldung ohne Adressen (fetch hängt sonst Host und Ursache an)
function kurzerFehler(e) {
  if (e?.name === "TimeoutError" || e?.name === "AbortError") return `Zeitüberschreitung (${ZEITLIMIT / 1000} s)`;
  if (e?.status) return `Open-Meteo antwortet mit HTTP ${e.status}`;
  if (e instanceof SyntaxError) return "Ungültige Antwort von Open-Meteo";
  const code = e?.cause?.code;
  if (code) return `Keine Verbindung zu Open-Meteo (${code})`;
  return String(e?.message || "Unbekannter Fehler").replace(/https?:\/\/\S+/g, "<Adresse>").slice(0, 160);
}

export function erstelleWetter({ senden = () => {}, log = () => {} }) {
  // code = weather_code (WMO), wolken in %, regen in mm, schnee in cm, wind in km/h, temperatur in °C, zeit = letzte gelungene Abfrage
  const w = { code: null, wolken: null, regen: null, schnee: null, wind: null, temperatur: null, istTag: null, zeit: null, fehler: null };
  let laeuft = false;

  async function abrufen() {
    if (laeuft) return;
    laeuft = true;
    const vorher = JSON.stringify(w);
    try {
      const r = await fetch(ADRESSE, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(ZEITLIMIT) });
      if (!r.ok) throw Object.assign(new Error("HTTP"), { status: r.status });
      const c = (await r.json())?.current;
      if (!c || zahl(c.weather_code) === null) throw new Error("Antwort ohne aktuelle Werte");
      const regen = zahl(c.rain), nieder = zahl(c.precipitation), schnee = zahl(c.snowfall);
      Object.assign(w, {
        code: zahl(c.weather_code),
        wolken: zahl(c.cloud_cover),
        // rain zählt keine Schauer: ohne Schnee den gesamten Niederschlag nehmen
        regen: regen === null ? nieder : !schnee && nieder !== null ? Math.max(regen, nieder) : regen,
        schnee,
        wind: zahl(c.wind_speed_10m),
        temperatur: zahl(c.temperature_2m),
        istTag: c.is_day === undefined || c.is_day === null ? null : Number(c.is_day) === 1,
        zeit: new Date().toISOString(),
        fehler: null,
      });
      if (JSON.parse(vorher).fehler) log("Wetter: wieder erreichbar");
    } catch (e) {
      w.fehler = kurzerFehler(e);
      if (w.fehler !== JSON.parse(vorher).fehler) log(`Wetter: ${w.fehler}`);
    } finally {
      laeuft = false;
    }
    if (JSON.stringify(w) !== vorher) senden("wetter", zustand());
  }

  function zustand() {
    return { ...w };
  }

  function starten() {
    abrufen();
    setInterval(abrufen, TAKT);
  }

  return { starten, zustand, abrufen };
}
