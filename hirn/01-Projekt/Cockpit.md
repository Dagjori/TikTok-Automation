---
typ: anleitung
konto: gemeinsam
status: aktuell
datum: 2026-11-02
quelle: CLAUDE.md §10, docs/cockpit/cockpit.html
tags: [konto/gemeinsam, cockpit, freigabe]
---

# Cockpit

Claude-Artifact: https://claude.ai/artifact/FxZc6Cpodsg12hapn6Bpxz (Quelle `docs/cockpit/cockpit.html`). Entscheidung 02.11.: „sobald ich dort etwas freigebe oder ablehne, reagierst du“ („sonst bringt mir das Cockpit nichts“).

## Datenmodell (ArtifactData)
- Sammlung `videos`: ein Dokument je Video (120 Themen beider Accounts). Felder: `status`, `score`, `stil` (Account 1: Stil + Teamfarben), `inhaber{entscheidung,kommentar,zeit}`, `claude{gelesen,antwort,zeit}`.
- Dokument `stand/aktuell`.
- Schreiben mit `batch` (max. 50 Einträge, `if_version` Pflicht). `list` mit `out_dir` speichert nur die Daten; die Versionen stehen in der Tool-Ausgabe, nicht in den Dateien.

## Wie der Inhaber damit arbeitet
Freigeben, Ablehnen oder Kommentieren sendet einen Kommentar „an Claude“ und weckt jede Sitzung, die das Cockpit beobachtet.

## Wie Claude reagiert (sofort)
| Aktion des Inhabers | Claude |
|---|---|
| Freigabe | Status `angepasst` bzw. in Produktion |
| Ablehnung | Ersatz aus der Reserve vorschlagen und eintragen |
| Kommentar | umsetzen |
Danach `claude` setzen und im Thread kurz antworten. **Zu Beginn jeder Sitzung** offene Entscheidungen abarbeiten (`inhaber.zeit` neuer als `claude.gelesen`). Status täglich pflegen.

## Siehe auch
[[Pläne und Kalender]] · [[Stand und nächste Schritte]] · [[Index]]
