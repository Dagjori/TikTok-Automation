# Vorschlag umsetzen (Cockpit): Anleitung für Claude Code

Stand 03.11.2026. Der Inhaber hat einen Verbesserungsvorschlag der Lernschleife im Cockpit freigegeben (oder das Cockpit setzt nach seiner Entscheidung zur Selbständigkeit um). Der Vorschlag steht als JSON in der ersten Nachricht (Dokument `vorschlaege/<id>`).

## Regeln
- Setze **genau den Vorschlag** um, nicht mehr. Fertige Videos bleiben, wie sie sind; die Änderung gilt ab der nächsten Produktion (CLAUDE.md §2).
- Kleine Schritte mit Aufgabenliste (CLAUDE.md §1). Windows: `py -3`; Hilfsdateien unter `cockpit/daten/tmp/`. Nie `.env` lesen.
- **Neue Gestaltung erst als 2–3 Probebilder** (CLAUDE.md §1): Betrifft der Vorschlag das Aussehen (Bereich design, animation, licht, welt) und steht im Dokument noch nicht `status: "probe_ok"`, dann zuerst 2–3 Standbilder mit der bestehenden Pipeline eines passenden Projekts erzeugen (z. B. `node pipeline/render.js projekte/<projekt> --bilder <n1>,<n2>` auf einem Arbeitsstand mit der Änderung), die Bilder nach `cockpit/daten/vorschau/<id>/` kopieren, die Änderung **nicht** committen (`git stash` bzw. zurücksetzen), dann `status: "probe"` und `umsetzung: {probebilder: ["<datei>", …], notiz, zeit}` schreiben und enden. Nach der Freigabe der Probebilder (`status: "probe_ok"`) läuft dieser Auftrag erneut: dann umsetzen.

## Schritte
1. `git pull --rebase origin main`. Vorschlag lesen: `node cockpit/db.mjs get vorschlaege <id>` (Version merken).
2. Betroffene Dateien bestimmen (`betrifft`, Skill des Kontos, `qc/`, `tools/chat_befehle.py` für Befehle, Engine). Nur das Nötige ändern.
3. Tests und Prüfungen ausführen, die die Änderung berühren (z. B. `py -3 -m pytest pipeline/qc` bzw. die Tests im Skill). Rot → reparieren oder Vorschlag mit `status: "fehler"` und Grund zurückgeben.
4. Ändert sich eine Regel oder Wissen: `CLAUDE.md` §12 (Entscheidungen: „JJJJ · Inhaber gibt im Cockpit Vorschlag ‚<titel>‘ frei · <Begründung kurz>“) und bei Bedarf §11 ergänzen; `docs/regelwerk/regelwerk.html` aktualisieren und `node tools/regelwerk_pdf.mjs` ausführen (CLAUDE.md §2). Betrifft es einen Skill: `py -3 tools/hirn_aus_skills.py` und `py -3 tools/hirn_pruefen.py`.
5. Committen („Vorschlag umgesetzt: <titel>“), vorher nach Secrets greppen (`sb_secret`, `supabase.co`), `git pull --rebase`, auf main pushen.
6. Dokument aktualisieren: `status: "umgesetzt"`, `umsetzung: {zeit, commit, dateien, notiz (1–2 Sätze, was sich ab dem nächsten Video ändert)}`. Das Cockpit meldet es dem Inhaber.
7. Letzte Antwort eine Zeile: „Umgesetzt: <titel> (<commit>)“ bzw. „Probebilder bereit: <titel>“.
