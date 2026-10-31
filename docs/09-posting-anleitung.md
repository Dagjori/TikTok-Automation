# Posting-Anleitung (TikTok und YouTube Shorts)

**Stand:** 31.10.2026 · gilt für jedes Simulierbar-Video. Zeitbedarf: ca. 10 Minuten pro Video und Plattform.

## Einmalig vor dem ersten Post (5 Min.)
1. **TikTok-Konto öffentlich:** App → Profil → ☰ → Einstellungen und Datenschutz → Datenschutz → **Privates Konto: AUS**. Sonst sehen nur Follower die Videos. Kontotyp bleibt **persönlich**, kein Business-Konto (CRP-Bedingung).
2. **Bio:** keine E-Mail, keine Telefonnummer (CRP-Kriterium „Advertising“). Impressum nur als Link, sobald vorhanden.
3. **YouTube-Kanal** (falls noch keiner existiert): youtube.com → Profilbild → „Kanal erstellen“ → Name „Simulierbar“, Handle `@simulierbar` (falls frei).

## TikTok (Browser, TikTok Studio)
1. Video-Datei (MP4) auf den Rechner bzw. das Handy laden.
2. Am PC `https://www.tiktok.com/tiktokstudio/upload` öffnen → **Video auswählen**.
3. **Caption:** Text aus dem Abschnitt „Texte zum Kopieren“ unten einfügen (eine Zeile inklusive Hashtags, Format laut CLAUDE.md). Keine Quellen, keine Hinweise.
4. **Titelbild:** „Titelbild bearbeiten“ → das Bild aus den ersten Sekunden wählen (Titel ist dort groß im Bild). Keinen zusätzlichen Text darüberlegen.
5. **Wer kann das sehen:** Alle. Kommentare: an. Duett und Stitch: an.
6. **„Mehr anzeigen“ bzw. Erweiterte Einstellungen:**
   - **Offenlegung von Inhalten (Markeninhalt/Werbung): AUS.** Das Video ist kein Werbevideo; Markeninhalte sind nicht CRP-fähig.
   - **KI-generierte Inhalte: AN.** TikTok verlangt das Label für realistische KI-Bilder, -Audio oder -Videos; unsere Stimme ist eine KI-Stimme. Laut TikTok beeinflusst das Label die Verbreitung nicht. ([TikTok Support](https://support.tiktok.com/en/using-tiktok/creating-videos/ai-generated-content), [TikTok Newsroom](https://newsroom.tiktok.com/en-us/new-labels-for-disclosing-ai-generated-content))
   - Keine Produkt- oder Shop-Links, kein Ort.
7. **Veröffentlichen** oder **Planen** (Datum und Uhrzeit wählen). Geplante Posts lassen sich danach nicht mehr bearbeiten, nur löschen und neu hochladen.
8. **Erste Stunde nach dem Post:** Kommentare beantworten. Antworten mit Zahlen bzw. Gegenfragen halten die Diskussion am Laufen (Annahme: frühe Interaktion hilft der Verteilung; nicht von TikTok belegt).

**Uhrzeit:** Analytics → Follower → „Aktivste Zeiten“ ansehen und 30 Minuten vor der Spitze posten. Solange es keine eigenen Daten gibt: Video 1 mittags, Video 2 am Abend, mindestens 4 Stunden Abstand (**Annahme**, keine offizielle TikTok-Angabe).

## YouTube Shorts (Browser, YouTube Studio)
1. `https://studio.youtube.com` → **Erstellen** → **Videos hochladen** → MP4 wählen. Hochformat und höchstens 3 Minuten werden automatisch ein Short. ([YouTube Hilfe](https://support.google.com/youtube/answer/15424877?hl=de))
2. **Titel:** aus „Texte zum Kopieren“ (höchstens 100 Zeichen).
3. **Beschreibung:** dieselbe Caption wie bei TikTok.
4. **Zielgruppe:** „Nein, es ist nicht speziell für Kinder“.
5. **Mehr anzeigen → Veränderte oder synthetische Inhalte: Ja.** Vorsichtige Auslegung: Rein animierte Inhalte sind nach der YouTube-Hilfe ausgenommen, aber YouTube nennt eine synthetische Erzählstimme in seinem Blog als Beispiel. Das Label erscheint nur in der erweiterten Beschreibung. ([YouTube Hilfe](https://support.google.com/youtube/answer/14328491?hl=de), [YouTube Blog](https://blog.youtube/news-and-events/disclosing-ai-generated-content/))
6. **Sprache:** Deutsch. Untertitel sind schon im Bild.
7. **Sichtbarkeit:** Öffentlich oder **Planen**. YouTube am besten ein paar Stunden nach TikTok.

## Texte zum Kopieren

### Video 1: GTA 6 weltweit
- **Datei:** `pipeline/out/gta6-welt/gta6-welt.mp4`
- **YouTube-Titel:** `GTA 6: Kostet das Krankfeiern die Welt eine Milliarde? #shorts`
- **Caption (TikTok und YouTube):**

```
Kostet GTA 6 die Welt wirklich eine Milliarde, weil alle krankfeiern? 🎮💸 Ich hab's durchgerechnet. Was schätzt du? 👇 #gta6 #gta #wissen #wirtschaft #simulation
```

### Video 2: Reißverschluss
- **Datei:** `pipeline/out/reissverschluss/reissverschluss.mp4`
- **YouTube-Titel:** `Früh einordnen oder bis zum Ende? Simuliert #shorts`
- **Caption (TikTok und YouTube):**

```
Früh einordnen oder bis zum Ende fahren? 🚗 Ich hab's simuliert. Team früh oder Team Reißverschluss? 👇 #reißverschlussverfahren #stau #autofahren #wissen #simulation
```

Die Quellen stehen nur intern in `pipeline/projekte/<projekt>/skript.json` unter `quellen`, falls jemand in den Kommentaren nachfragt.
