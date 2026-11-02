---
typ: regel
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §2, §10; Test vom 02.11.2026
tags: [konto/gemeinsam, recherche, methode]
cssclasses: [konto-gemeinsam, typ-regel]
---

# Recherche: Methode und Grenzen

## Was erlaubt ist
- **Öffentliche Seiten**, wie ein normaler Browser-Aufruf: Profilseiten (Follower, Likes, Videozahl, neueste Videos je Konto, ca. 5–13), öffentliche Videoseiten (Aufrufe, Beschreibung, Dauer, Datum, Hashtags), Websuche, Artikel.
- Eigene Auswertung: Zahlen, Hook-Typen, Struktur, Länge, Themen-Cluster, Caption- und Hashtag-Muster, Posting-Zeit.
- Der Inhaber darf Material hochladen (Videos, Screenshots der App-Suche bzw. „Inspiration“): dann wird es ausgewertet, aber nicht ins Repo gelegt.

## Was verboten ist
- Interne TikTok-APIs, Login-Umgehung, Captcha-Umgehung, Scraping hinter Bot-Schutz.
- Video- und Tondateien der Konkurrenz herunterladen.
- Konkurrenzinhalte ins Repo: Originale, **Transkripte**, Standbilder, wörtliche Zitate.
- Themen oder Texte 1:1 übernehmen ([[Arbeitsregeln und Sicherheit]]).

## Test vom 02.11.2026: TikTok-Suche „simulation“ (**F**)
- `tiktok.com/search?q=simulation`, `…/search/video?q=simulation` und `…/tag/simulation` antworten ohne Login mit HTTP 200, enthalten aber **keine Videoliste** (die eingebetteten Daten haben nur App-Rahmen: kein `itemList`, keine Treffer). Die Treffer werden erst im eingeloggten Browser über interne Schnittstellen geladen. **Folge:** Die Suche lässt sich regelkonform nicht automatisch auswerten; nicht erneut versuchen.
- Das Abrufwerkzeug `WebFetch` kann `www.tiktok.com` in dieser Umgebung nicht auflösen. Über Bash (`curl`, Python) geht es über den Proxy.
- Der Monitor `tools/monitor_kanaele.py` funktioniert (öffentliche Profilseiten).

## Ersatzwege (so recherchieren wir trotzdem)
| Weg | Was man bekommt | Aufwand |
|---|---|---|
| **Profilseiten der Benchmark-Kanäle** (`data/monitor/kanaele.csv`) | Follower, Likes, neueste Videos mit Aufrufen, Länge, Caption | Claude, automatisch |
| **Websuche** (öffentlich indexierte Videos, Artikel) | Treffer, Zahlen, Trendmeldungen | Claude, ca. 12 Suchen je Lauf |
| **Screenshots der App-Suche „simulation“ / „Inspiration“** vom Inhaber | echte Trefferliste mit Aufrufen, tagesaktuell | Inhaber, ca. 5 Min. pro Suche |
| **Hochgeladene Videos** des Inhabers | Vollanalyse (Bild, Ton, Transkript, Zeitachse) wie beim [[Maßstab Simulierbar]] | Inhaber lädt hoch, Claude wertet aus |
Einschränkungen: Profilseiten zeigen nur die neuesten Videos (**A**: 5–13), Aufrufe sind Momentaufnahmen, Videos mit hohen Zahlen müssen nicht typisch sein (Gegenbeispiele suchen).

## Ergebnisse ablegen
Eine Notiz pro Recherche in `04-Recherche`, Kopf mit `konto` (`simulierbar`, `stelldirvor` oder `gemeinsam`), `datum`, Methode und Grenzen, Stichprobengröße; Aussagen mit **F/S/A**; Folgen je Account getrennt formulieren. Aktuelle Auswertung: [[Simulation-Trendanalyse-2026-11-02]].

## Siehe auch
[[Trend-Radar]] · [[Konkurrenz und Themen Simulierbar]] · [[Konkurrenz-Check und Sperrliste Account 2]] · [[Index]]
