# Trend-Monitoring

**Stand:** 31.10.2026 · Auftrag des Inhabers: „Für die Zukunft behalten wir den TikTok-Markt im Auge, um neue Trends zu erkennen.“

## Ziel
- Neue Themen, Formate und Konkurrenten früh erkennen.
- Den Themen-Backlog auffüllen.
- Regeländerungen bei TikTok rechtzeitig mitbekommen.

## Wöchentlicher Ablauf (Sonntag, ca. 25 Minuten gesamt)

### A) Inhaber in der TikTok-App (ca. 10 Minuten)
Diese Werkzeuge gibt es nur im eigenen Account. Claude hat darauf keinen Zugriff.

1. **Trending Topics**
   - Weg: TikTok Studio → Inspiration (Creation Inspiration) → Trending → Reiter **Topics** → Region Deutschland.
   - Laut TikTok: bis zu 50 Themen, sortiert nach Views, mit Trendkurve. In DE verfügbar (F: [Creator Academy](https://www.tiktok.com/creator-academy/article/trending-topics)).
   - Screenshot der Top 20 machen.
2. **Creator Search Insights, Reiter „Content gap“**
   - Themen, nach denen viel gesucht wird, zu denen es aber wenig gute Videos gibt (F: [Creator Academy](https://www.tiktok.com/creator-academy/article/Getting-discovered-with-Search)).
   - Screenshot machen.
   - Ob das Werkzeug im Account sichtbar ist, noch prüfen.
3. **Eigene Analysen:** Top-3-Videos der Woche und Follower pro Video notieren.
4. Alles **in eine Claude-Sitzung mit diesem Repo** geben.

### B) Claude (ca. 15 Minuten, automatisierbar)
1. **Wettbewerbs-Monitor:** `python3 tools/monitor_kanaele.py`
   - Ruft die öffentlichen Profile aller Kanäle aus `data/monitor/kanaele.csv` ab, eine Anfrage pro Kanal, keine internen APIs.
   - Speichert den Stand in `data/monitor/verlauf.csv`.
   - Meldet Kanäle mit mindestens +20 % oder mindestens +1.000 Followern seit dem letzten Lauf.
2. **Neue Kanäle suchen** (Websuche), z. B. `site:tiktok.com "durchgerechnet"`, `"simuliert" tiktok wissen`, `"lohnt sich" tiktok animation`. Neue relevante Kanäle kommen in `kanaele.csv`.
3. **Screenshots des Inhabers auswerten:** Passt ein Trend zu „Der Testlauf“ (GELD oder ALLTAG)? Wenn ja, als Idee in die passende Liste in `data/ideen/` aufnehmen, mit `typ` = `news` bzw. `saisonal`.
4. **Regel-Check (einmal pro Monat):**
   - Versionsdatum der Community Guidelines und der CRP-Bedingungen prüfen.
   - Neuigkeiten in der Creator Academy durchsehen.
   - Änderungen in `docs/02-account-strategie.md` und `CLAUDE.md` nachziehen.
5. **Kurzbericht** in `docs/trends/JJJJ-KW.md` (maximal 15 Zeilen):
   - auffällige Kanäle
   - 3–5 neue Ideen
   - Regeländerungen
   - Empfehlung für die nächste Woche
6. `STATUS.md` aktualisieren, committen, pushen.

## Automatisierung (Option, noch nicht eingerichtet)
- Teil B kann als **geplante Aufgabe** jeden Sonntag automatisch in einer neuen Claude-Sitzung laufen.
- Der Kurzbericht liegt dann im Repo, bevor der Inhaber Teil A erledigt.
- **Wird nur auf ausdrücklichen Wunsch des Inhabers eingerichtet** (siehe CLAUDE.md: „Nichts ohne Auftrag anlegen“).

## Regeln
- Nur öffentliche Seiten, keine internen TikTok-APIs, kein Umgehen von Bot-Schutz (CLAUDE.md).
- Trends nur übernehmen, wenn sie zum Format passen (eigene Rechnung bzw. Simulation) und kein Risiko-Thema sind (siehe Ausschlüsse in `docs/06-nischen-ranking.md`).
- Fremde Videos nie nachbauen, nur die Frage bzw. den Trend aufgreifen und eigenständig umsetzen.

## Erster Lauf (31.10.2026, Vergleich zu 29.10.)
- **@kontostand.vs:** 418 → 553 Follower (+32 %), ein Video weniger (gelöscht bzw. privat gestellt).
- **@unnoetig_tiefgruendig:** 483 → 580 (+20 %).
- **@wissentogo_de:** 640 → 740 (+16 %), +2 Videos.
- **Große Kanäle stabil:** @kurzsimuliert, @retrodreamspace, @weltraumweisheiten mit weniger als 1 % Wachstum.
