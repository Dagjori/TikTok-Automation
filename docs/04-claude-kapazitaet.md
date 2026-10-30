# Claude Max 5x – Videokapazität

Teil von [Projektübersicht](00-projektuebersicht.md). Verwandt: [Marktanalyse](01-marktanalyse.md), [Nischen](03-nischen.md).

## Kurzfazit
- **Claude ist nicht der Engpass.** Bei einer fertigen Vorlage schafft Max 5x grob **10–30 Videos pro Tag mit Sonnet 5.5** bzw. **5–15 mit Opus 5.5** (Schätzung, volle Abo-Nutzung). Gibst du 50 % des Abos für dieses Projekt frei, sind es 5–15 bzw. 3–7.
- **Sinnvoll sind 2 Videos pro Tag und Account.** Das braucht geschätzt nur 10–20 % des Abos. Begrenzt wird die Menge von den Plattformregeln (Spam, „inauthentic content“), von der Qualitätskontrolle und vom Aufbau der Follower, nicht von Claude.
- **Modellwahl:**
  - Opus 5.5 für den Bau der Vorlage und neue Szenentypen
  - Sonnet 5.5 für die tägliche Produktion
  - Haiku 5.5 für Titel, Beschreibungen und Hashtags
  - Fable 5.1 lohnt sich hier nicht (5-facher Preis)

## Was offiziell feststeht (Anthropic)
- **Preis:** Max 5x kostet 100 $ pro Monat ([Max-Plan](https://support.claude.com/en/articles/11049741-what-is-the-max-plan)). In Deutschland laut Drittquelle 90 € netto bzw. 107,10 € brutto.
- **Limits:** Sie setzen sich alle **5 Stunden** zurück. Zusätzlich gibt es ein **Wochenlimit über alle Modelle** und ein eigenes Wochenlimit für Fable.
- **Chat und Claude Code teilen sich ein Kontingent** ([Claude Code mit Pro/Max](https://support.claude.com/en/articles/11145838)).
- **Feste Zahlen veröffentlicht Anthropic nicht**, weder Prompts noch Stunden.
- **Erhöhungen 2026:**
  - 06.05.2026: Das 5-Stunden-Limit für Claude Code wurde verdoppelt ([Anthropic News](https://www.anthropic.com/news/higher-limits-spacex)).
  - Seit 14.09.2026: Das Wochenlimit für Claude Code liegt dauerhaft 25 % höher ([Hilfe-Artikel](https://support.claude.com/en/articles/15910845)).
- **Wenn das Limit erreicht ist:** Man kann Nutzungs-Credits zum API-Preis zukaufen, auf Max 20x wechseln oder warten ([Hilfe-Artikel](https://support.claude.com/en/articles/12429409)).
- **API-Listenpreise als Verhältniswert** ([Pricing](https://platform.claude.com/docs/en/about-claude/pricing)), in $ pro 1 Mio. Tokens:

| Modell | Input | Output | Faktor |
|---|---|---|---|
| Sonnet 5.5 | 2 | 10 | 1× |
| Opus 5.5 | 4 | 20 | 2× |
| Fable 5.1 | 10 | 50 | 5× |

  Laut Anthropic verbraucht Opus das Kontingent „meaningfully more“ als Sonnet ([Hilfe-Artikel](https://support.claude.com/en/articles/14552983)).

## Rechnung (Schätzung, Annahmen offen gelegt)

**1. Startwert für die Prompts pro 5-Stunden-Fenster**
- 2025 nannte Anthropic für Max 5x 50–200 Claude-Code-Prompts pro 5 Stunden. Diese Angabe ist heute nicht mehr veröffentlicht.
- Nach der Verdopplung im Mai 2026 ergibt das **ca. 100–400 Prompts pro 5 Stunden**.

**2. Aufwand pro Video bei fertiger Vorlage** (eigene Schätzung)
- ca. 10–15 Prompts:
  - Thema plus Quellen
  - Skript
  - Rechen- bzw. Szenen-Spezifikation
  - Rendern
  - 2–4 Korrekturrunden
  - Metadaten
- ca. 20–30 Minuten aktive Claude-Zeit

**3. Was daraus folgt**
- Pro 5-Stunden-Fenster: ca. 8–33 Videos mit Sonnet, mit Opus etwa die Hälfte.
- Pro Tag bei 2 genutzten Fenstern (abends plus nachts automatisch): 16–66 mit Sonnet.
- Das Wochenlimit ist unbekannt. Deshalb rechne ich konservativ mit **10–30 pro Tag (Sonnet)** bzw. **5–15 pro Tag (Opus)**.

**4. Einmalig für den Bau der Vorlage**
- ca. 15–25 Stunden Claude-Code-Arbeit mit Opus 5.5, verteilt auf 2–3 Wochen.
- An intensiven Abenden kann man dabei ans 5-Stunden-Limit stoßen. Das ist normal.

**5. So prüfst du es nach**
- In der ersten Produktionswoche täglich `/usage` in Claude Code bzw. Settings → Usage ansehen und die Zahlen hier eintragen.

| Datum | Videos | Modell | Verbrauch 5h-Fenster | Verbrauch Woche |
|---|---|---|---|---|
| | | | | |

## Automatisierung: was erlaubt ist und was nicht
- **Erlaubt:**
  - Claude Code schreibt Skript und Code, die Videos werden lokal oder auf einem Server gerendert.
  - Die Produktion kann über Nacht laufen.
  - Für den Betrieb ohne Bildschirm (headless) mit dem Abo gibt es `claude setup-token`. Es gibt aber Berichte über 401-Fehler, also vor dem Einsatz testen. Ist `ANTHROPIC_API_KEY` gesetzt, rechnet Claude Code über die API ab statt über das Abo.
- **Posten auf TikTok:**
  - Nicht über ein selbst gebautes Bot-Tool. Ohne Prüfung durch TikTok (Audit) postet die API nur privat. Ein Tool zum Hochladen auf die eigenen Accounts ist laut TikTok kein zulässiger Zweck. Die Community Guidelines verbieten „automation tools, scripts … designed to bypass our systems“.
  - Stattdessen: **TikTok Studio (Web)**. Dort lassen sich Posts bis zu **30 Tage im Voraus planen**. Ab 1.000 Followern ist ein Bulk-Upload von bis zu 30 Videos möglich.
  - Alternative: ein von TikTok freigegebenes Planungs-Tool.
- **YouTube:** Dieselbe Master-Datei planst du in YouTube Studio ein.

## Laufende Kosten (Schätzung, Preise vor Kauf prüfen)

| Posten | Kosten pro Monat |
|---|---|
| Claude Max 5x | vorhanden (~107 € brutto), anteilig |
| KI-Stimme: ElevenLabs, bezahlter Plan nötig (Free-Plan ohne kommerzielle Lizenz) | ca. 5–25 $, je nach Minuten |
| Render-Rechner: eigener PC oder kleiner Cloud-Server | 0–15 € |
| Musik: eigene Soundeffekte per Code oder YouTube Audio Library | 0 € |
| **Summe zusätzlich** | **ca. 5–40 €** |

Remotion ist für Einzelpersonen und Firmen bis 3 Personen kostenlos ([Lizenz-FAQ](https://www.remotion.dev/docs/license/faq)), Three.js grundsätzlich.
